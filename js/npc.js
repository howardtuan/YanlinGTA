import * as THREE from 'three';
import { Vehicle, sameLevel } from './vehicles.js';
import { createCharacter, randomStudent } from './character.js';
import { mulberry32, makeLabel } from './map.js';
import { surfaceAt } from './terrain.js';
import { Ragdoll } from './ragdoll.js';

const SPEED_BY_TYPE = { primary: 12, secondary: 11, tertiary: 9.5, unclassified: 8, residential: 7, living_street: 5, service: 5.5 };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------------- traffic ----------------
export class Traffic {
  constructor(scene, world, count = 28) {
    this.scene = scene; this.world = world; this.rnd = mulberry32(99);
    this.inView = () => true; // inView(pos): whether the camera may be looking at pos (main.js sets it)
    this.agents = [];
    for (let i = 0; i < count; i++) {
      const r = this.rnd();
      const kind = r < 0.5 ? 'scooter' : r < 0.62 ? 'taxi' : 'car';
      const v = new Vehicle(kind, this.rnd);
      v.driver = 'ai';
      const rider = kind === 'scooter' ? createCharacter({ ...randomStudent(this.rnd), face: false }) : null;
      if (rider) { rider.root.position.copy(v.seat); v.mesh.add(rider.root); rider.update(0.1, { mode: 'ride' }); rider.setDetail(false); }
      v.rider = rider;
      v.ai = { from: null, to: null, edge: null, d: 0, len: 1, stunned: 0, honkT: 0, waitT: 0 };
      scene.add(v.mesh);
      this.agents.push(v);
      v.mesh.visible = false; v.ai.dormant = true;
    }
  }
  vehicles() { return this.agents.filter(a => a.ai && !a.ai.dormant); }
  spawn(v, px, pz, minD, maxD) {
    const nodes = this.world.driveNodes;
    for (let tries = 0; tries < 40; tries++) {
      const n = nodes[Math.floor(this.rnd() * nodes.length)];
      const d = Math.hypot(n.x - px, n.z - pz);
      if (d < minD || d > maxD) continue;
      const edges = n.adj.filter(e => e.drive); if (!edges.length) continue;
      const e = edges[Math.floor(this.rnd() * edges.length)];
      // avoid stacking
      if (this.agents.some(o => o !== v && !o.ai.dormant && Math.hypot(o.pos.x - n.x, o.pos.z - n.z) < 12)) continue;
      Object.assign(v.ai, { from: n, edge: e, to: e.to, d: 0, len: Math.hypot(e.to.x - n.x, e.to.z - n.z) || 1, dormant: false, stunned: 0, wreck: 0, ox: 0, oz: 0 });
      v.knocked = false; v.fallen = false; v.lean = 0; if (v.rider) { this._riderHome(v); v.rider.root.visible = true; } // a recycled wreck
      v.hf = v.hb = e.road.deck ? Infinity : undefined; // spawned on a viaduct: start on its deck
      v.heading = Math.atan2(e.to.x - n.x, e.to.z - n.z);
      v.speed = 4; v.mesh.visible = true;
      this._place(v, 0);
      return true;
    }
    return false;
  }
  _lane(v) {
    const e = v.ai.edge;
    if (e.road.oneway) return v.kind === 'scooter' ? e.w / 2 - 1 : 0;
    return v.kind === 'scooter' ? Math.max(1, e.w / 2 - 1.1) : Math.max(1.2, e.w / 4);
  }
  _place(v, dt) {
    const a = v.ai, f = a.from, t = a.to;
    const k = a.d / a.len;
    const dx = t.x - f.x, dz = t.z - f.z, l = a.len;
    const lane = this._lane(v);
    // right side of travel direction (right = forward rotated -90°)
    const rx = -dz / l, rz = dx / l;
    v.pos.set(f.x + dx * k + rx * lane, 0, f.z + dz * k + rz * lane);
    // back on the lane after being thrown (landed()): from where it landed, eased in instead of a jump
    if (a.ox || a.oz) {
      v.pos.x += a.ox; v.pos.z += a.oz;
      const e = Math.exp(-dt * 1.5); a.ox *= e; a.oz *= e;
      if (Math.hypot(a.ox, a.oz) < 0.02) a.ox = a.oz = 0;
    }
    const th = Math.atan2(dx, dz);
    v.heading += angDiff(th, v.heading) * Math.min(1, dt * 5 + (dt === 0 ? 1 : 0));
    v.steer = Math.max(-1, Math.min(1, angDiff(th, v.heading) * 2));
    v.sync(dt);
  }
  _next(v) {
    const a = v.ai; const n = a.to;
    let opts = n.adj.filter(e => e.drive && e.to !== a.from);
    if (!opts.length) opts = n.adj.filter(e => e.drive);
    if (!opts.length) { a.dormant = true; v.mesh.visible = false; return; }
    // prefer going straight-ish
    const cur = Math.atan2(n.x - a.from.x, n.z - a.from.z);
    opts.sort((e1, e2) => Math.abs(angDiff(Math.atan2(e1.to.x - n.x, e1.to.z - n.z), cur)) - Math.abs(angDiff(Math.atan2(e2.to.x - n.x, e2.to.z - n.z), cur)));
    const e = this.rnd() < 0.55 ? opts[0] : opts[Math.floor(this.rnd() * opts.length)];
    a.d -= a.len;
    a.from = n; a.to = e.to; a.edge = e; a.len = Math.hypot(e.to.x - n.x, e.to.z - n.z) || 1;
    a.d = Math.max(0, Math.min(a.d, a.len));
  }
  update(dt, player, audio) {
    const p = player.pos;
    const obstacles = [];
    for (const v of this.agents) if (!v.ai.dormant) obstacles.push(v);
    for (const v of this.agents) {
      const a = v.ai;
      if (!a) continue;
      if (v.rider?.rag || v.rider?.lieT !== undefined) this._riderTick(v, dt);
      if (a.dormant) { if (this.rnd() < 0.05) this.spawn(v, p.x, p.z, 90, 260); continue; }
      if (v.knocked) continue; // thrown by physics (main.js _knockTraffic) until it lands (landed())
      const dPl = Math.hypot(v.pos.x - p.x, v.pos.z - p.z);
      // a wreck stays where it came to rest (the traffic behind it waits), then is recycled once you are 90 m
      // away or not looking at it (inView, set by main.js)
      if (a.wreck > 0) { a.wreck -= dt; if (a.wreck <= 0) { if (dPl > 90 || !this.inView(v.pos)) { a.dormant = true; v.mesh.visible = false; } else a.wreck = 1; } continue; }
      if (dPl > 330) { a.dormant = true; v.mesh.visible = false; continue; }
      if (v.rider?.lieT !== undefined && a.stunned > 0) a.stunned = Math.max(a.stunned, 0.1); // back on its lane: waits for its rider
      if (a.stunned > 0) { a.stunned -= dt; v.speed *= Math.pow(0.9, dt * 60); v.sync(dt); continue; } // frame-rate independent decay
      const target = SPEED_BY_TYPE[a.edge.road.type] || 7;
      // look ahead for obstacles
      const [fx, fz] = v.forward();
      let blocked = 99;
      const vy = v.mesh.position.y;
      const check = (ox, oz, r, oy) => {
        if (!sameLevel(oy, vy)) return; // e.g. the player in the underpass below this street
        const dx = ox - v.pos.x, dz = oz - v.pos.z;
        const ahead = dx * fx + dz * fz; if (ahead < 0 || ahead > 14) return;
        const side = Math.abs(dx * fz - dz * fx); if (side > r + 1.2) return;
        blocked = Math.min(blocked, ahead - r - v.radius);
      };
      for (const o of obstacles) if (o !== v) check(o.pos.x, o.pos.z, o.radius, o.mesh.position.y);
      check(p.x, p.z, player.vehicle ? player.vehicle.radius : 0.5, player.vehicle ? player.vehicle.mesh.position.y : player.pos.y);
      for (const o of player.extraObstacles || []) check(o.pos.x, o.pos.z, o.radius, o.mesh.position.y);
      let want = target;
      if (blocked < 10) want = Math.max(0, target * (blocked - 1.5) / 8.5);
      // slow down for sharp turns near end of edge
      if (a.len - a.d < 8) want = Math.min(want, 6);
      v.speed += Math.max(-14 * dt, Math.min(5 * dt, want - v.speed));
      if (v.speed < 0.2 && blocked < 4 && dPl < 12) {
        a.waitT += dt;
        if (a.waitT > 2.2 && a.honkT <= 0) { audio && audio.horn(v.kind === 'scooter' ? 1.35 : 1, Math.max(0.15, 1 - dPl / 20)); a.honkT = 3; }
      } else a.waitT = 0;
      a.honkT -= dt;
      a.d += v.speed * dt;
      while (!a.dormant && a.d >= a.len) this._next(v);
      if (!a.dormant) this._place(v, dt);
      v.mesh.visible = dPl < 230 * (this.viewK ?? 1); // viewK: shorter on lower quality (main.js _applyQuality)
      if (v.rider && dPl < 60) v.rider.update(dt, { mode: 'ride' });
    }
  }
  // a thrown traffic vehicle came to rest at p (upY: its up axis' y): upright next to its lane and roughly
  // along it -> drives on (stunned for a moment); otherwise a wreck for 20 s
  landed(v, p, upY) {
    const a = v.ai; if (!a || a.dormant) return;
    const f = a.from, t = a.to, dx = t.x - f.x, dz = t.z - f.z, l = a.len || 1;
    const along = ((p.x - f.x) * dx + (p.z - f.z) * dz) / l, side = (-(p.x - f.x) * dz + (p.z - f.z) * dx) / l;
    const lane = this._lane(v), th = Math.atan2(dx, dz);
    if (!v.fallen && upY > 0.8 && along > -2 && along < l + 2 && Math.abs(side - lane) < 2.5 && Math.abs(angDiff(th, v.heading)) < 0.9) {
      a.d = Math.max(0, Math.min(l, along)); a.stunned = 1.5; v.speed = 0; a.wreck = 0;
      // where it is against its lane spot: _place eases that away once it drives on
      const k = a.d / l; a.ox = p.x - (f.x + dx * k - dz / l * lane); a.oz = p.z - (f.z + dz * k + dx / l * lane);
      if (v.rider && v.rider.lieT === undefined) v.rider.root.visible = true; // (a thrown rider gets back on when it is up, _riderTick)
    } else { a.wreck = 20; v.speed = 0; }
  }
  // the rider of traffic vehicle v thrown off (main.js _knockTraffic) with velocity (vx, vy, vz): a ragdoll
  // (js/ragdoll.js) that lies still a moment, then is back on its vehicle (hidden while that is a wreck);
  // without physics it just disappears until then
  throwRider(v, vx, vy, vz) {
    const r = v.rider; if (!r || r.lieT !== undefined) return;
    r.root.updateMatrixWorld(true);
    const p = r.root.getWorldPosition(new THREE.Vector3()), q = r.root.getWorldQuaternion(new THREE.Quaternion());
    v.mesh.remove(r.root); this.scene.add(r.root); r.root.position.copy(p); r.root.quaternion.copy(q);
    const l = Math.hypot(vx, vz) || 1, sp = Math.min(6, l * 0.4);
    r.rag = this.ragdoll?.(r, { x: vx, y: vy, z: vz }, { x: vz / l * sp, y: 0, z: -vx / l * sp }) || null;
    r.lieT = 2.5;
    if (!r.rag) r.root.visible = false;
  }
  _riderTick(v, dt) {
    const r = v.rider, a = v.ai;
    if (r.rag && !r.rag.resting && !a.dormant) return;
    if (!a.dormant && (r.lieT -= dt) > 0) return;
    this._riderHome(v);
    r.root.visible = !a.dormant && !(a.wreck > 0) && !v.knocked;
  }
  // the rider back on its seat (after being thrown)
  _riderHome(v) {
    const r = v.rider; if (!r || r.lieT === undefined) return;
    r.rag?.end(); r.rag = null; r.lieT = undefined;
    Ragdoll.standUp(r);
    if (r.root.parent !== v.mesh) { r.root.parent?.remove(r.root); v.mesh.add(r.root); }
    r.root.position.copy(v.seat); r.root.quaternion.identity();
    r.update(0.1, { mode: 'ride' });
  }
  // detach an AI vehicle so the player can take it
  hijack(v) {
    v.ai = null; v.driver = null; v.fallen = false;
    if (v.rider) { this._riderHome(v); v.mesh.remove(v.rider.root); v.rider = null; }
    this.agents = this.agents.filter(a => a !== v);
  }
}

// ---------------- pedestrians ----------------
const REFUSE = ['我是別系的啦～', '我再考慮看看', '先讓我把報告寫完…', '我只是路過的高中生', '我已經投過了啦（還沒開始投）'];
const ACCEPT = ['好啊！支持彥霖！', '資管要贏！', '我會去投票的！', '彥霖讚啦 ✌', '票投彥霖！', '這傳單設計很用心欸', '資管要贏 票投彥霖！'];
export class Peds {
  constructor(scene, world, count = 34) {
    this.scene = scene; this.world = world; this.rnd = mulberry32(7);
    this.list = [];
    for (let i = 0; i < count; i++) {
      const ch = createCharacter(randomStudent(this.rnd));
      ch.root.visible = false; scene.add(ch.root);
      this.list.push({ ch, pos: new THREE.Vector3(), heading: 0, speed: 1.3 + this.rnd() * 0.5, from: null, to: null, d: 0, len: 1, side: this.rnd() < 0.5 ? 1 : -1, state: 'walk', t: 0, dormant: true, voted: false, radius: 0.35 });
    }
  }
  spawn(p, px, pz, minD, maxD) {
    const nodes = this.world.walkNodes;
    for (let tries = 0; tries < 30; tries++) {
      const n = nodes[Math.floor(this.rnd() * nodes.length)];
      const d = Math.hypot(n.x - px, n.z - pz);
      if (d < minD || d > maxD) continue;
      const e = n.adj[Math.floor(this.rnd() * n.adj.length)];
      if (p.rag) this._unrag(p);
      Object.assign(p, { from: n, to: e.to, edge: e, d: 0, len: Math.hypot(e.to.x - n.x, e.to.z - n.z) || 1, dormant: false, state: 'walk', voted: this.rnd() < 0.08, y: undefined });
      // campus peds are students; more voters near campus
      p.ch.root.visible = true; p.ch.root.rotation.x = 0;
      this._place(p, 0);
      return true;
    }
    return false;
  }
  _offset(p) { const e = p.edge; return e.drive ? (e.w / 2 + 0.9) * p.side : 0.6 * p.side; }
  _place(p, dt) {
    const f = p.from, t = p.to, l = p.len, k = p.d / l;
    const dx = t.x - f.x, dz = t.z - f.z;
    const off = this._offset(p);
    const tx = f.x + dx * k - dz / l * off, tz = f.z + dz * k + dx / l * off;
    if (dt === 0) { p.pos.set(tx, 0, tz); } else { p.pos.x += (tx - p.pos.x) * Math.min(1, dt * 4); p.pos.z += (tz - p.pos.z) * Math.min(1, dt * 4); }
    const th = Math.atan2(dx, dz);
    p.heading += angDiff(th, p.heading) * Math.min(1, dt * 6 + (dt === 0 ? 1 : 0));
  }
  _next(p) {
    const n = p.to;
    let opts = n.adj.filter(e => e.to !== p.from);
    if (!opts.length) opts = n.adj;
    const e = opts[Math.floor(this.rnd() * opts.length)];
    p.d -= p.len; p.from = n; p.to = e.to; p.edge = e; p.len = Math.hypot(e.to.x - n.x, e.to.z - n.z) || 1; p.d = Math.max(0, Math.min(p.d, p.len));
  }
  active() { return this.list.filter(p => !p.dormant); }
  update(dt, player, collision) {
    const pl = player.pos;
    for (const p of this.list) {
      if (p.dormant) { if (this.rnd() < 0.08) this.spawn(p, pl.x, pl.z, 22, 90); continue; }
      const dPl = Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z);
      if (dPl > 120) { p.dormant = true; p.ch.root.visible = false; if (p.rag) this._unrag(p); continue; }
      if (p.rag) { this._ragTick(p, dt, dPl); continue; }
      p.t -= dt;
      let mode = 'foot', pose = null, speed = 0;
      if (p.state === 'fly') {
        mode = 'down';
        const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vz) * dt / 0.2));
        for (let k = 0; k < steps; k++) {
          p.pos.x += p.vx * dt / steps; p.pos.z += p.vz * dt / steps;
          const r = collision.resolve(p.pos, 0.35, p.air, p.ch.root.position.y);
          if (r.hit) { const d = p.vx * r.nx + p.vz * r.nz; if (d < 0) { p.vx -= 1.4 * d * r.nx; p.vz -= 1.4 * d * r.nz; } } // bounce off walls
        }
        p.vy -= 16 * dt; p.air += p.vy * dt;
        if (p.air <= 0) {
          p.air = 0; p.vy = 0; p.spin = 0;
          const k = Math.max(0, 1 - dt * 6); p.vx *= k; p.vz *= k; // slides along the ground
          if (Math.hypot(p.vx, p.vz) < 0.3) p.state = 'down';
        } else p.spin += dt * 9;
      } else if (p.state === 'down') {
        mode = 'down';
        if (p.t <= 0) { p.state = 'flee'; p.t = 3; }
      } else if (p.state === 'flee') {
        // run away from player then resume
        const dx = p.pos.x - pl.x, dz = p.pos.z - pl.z, d = Math.hypot(dx, dz) || 1;
        p.heading = Math.atan2(dx, dz);
        p.pos.x += dx / d * 5 * dt; p.pos.z += dz / d * 5 * dt;
        collision.resolve(p.pos, 0.35, 0, p.ch.root.position.y);
        speed = 5;
        if (p.t <= 0) { p.state = 'return'; }
      } else if (p.state === 'cheer' || p.state === 'talk') {
        pose = p.state === 'cheer' ? 'cheer' : null;
        const th = Math.atan2(pl.x - p.pos.x, pl.z - p.pos.z); p.heading += angDiff(th, p.heading) * Math.min(1, dt * 6);
        if (p.t <= 0) p.state = 'return';
      } else if (p.state === 'return') {
        // walk back to path
        const f = p.from, t = p.to, l = p.len, k = p.d / l, off = this._offset(p);
        const tx = f.x + (t.x - f.x) * k - (t.z - f.z) / l * off, tz = f.z + (t.z - f.z) * k + (t.x - f.x) / l * off;
        const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.5) p.state = 'walk';
        else { p.heading = Math.atan2(dx, dz); p.pos.x += dx / d * 1.6 * dt; p.pos.z += dz / d * 1.6 * dt; speed = 1.6; collision.resolve(p.pos, 0.35, 0, p.ch.root.position.y); }
      } else {
        // walking; yield to player standing in path
        const [fx, fz] = [Math.sin(p.heading), Math.cos(p.heading)];
        const ax = pl.x - p.pos.x, az = pl.z - p.pos.z;
        const ahead = ax * fx + az * fz, side = Math.abs(ax * fz - az * fx);
        if (ahead > 0 && ahead < 1.3 && side < 0.7 && sameLevel(p.y, player.vehicle ? player.vehicle.mesh.position.y : pl.y)) speed = 0;
        else {
          speed = p.speed; p.d += p.speed * dt;
          while (p.d >= p.len) this._next(p);
          this._place(p, dt);
        }
      }
      // walkers on a footbridge / viaduct way use its deck, others keep their level
      p.y = surfaceAt(p.pos.x, p.pos.z, p.state === 'walk' && p.edge.road.deck ? Infinity : p.y);
      p.ch.root.position.set(p.pos.x, p.y + (p.state === 'fly' ? p.air : 0), p.pos.z);
      p.ch.root.rotation.y = p.heading;
      p.ch.root.rotation.x = p.state === 'fly' ? p.spin : 0; // tumbling through the air
      const vr = 80 * (this.viewK ?? 1); // shorter on lower quality (main.js _applyQuality)
      p.ch.root.visible = dPl < vr;
      p.ch.setDetail(dPl < 16);
      if (dPl < vr) p.ch.update(dt, { speed, mode, pose });
    }
  }
  // hit by a vehicle going speed m/s along (dirX, dirZ): thrown up and forward, tumbling,
  // slides to a stop on landing, lies there (state 'down'), then gets up and runs off
  knock(p, dirX, dirZ, speed = 6) {
    if (p.state === 'down' || p.state === 'fly') return false;
    const s = Math.min(22, Math.max(3, speed));
    p.state = 'fly'; p.t = 2.5;
    p.vx = dirX * s * 0.75; p.vz = dirZ * s * 0.75; p.vy = 2.2 + s * 0.28; p.air = 0.1; p.spin = 0;
    p.heading = Math.atan2(-dirX, -dirZ);
    // with physics: limp (js/ragdoll.js), flipping backwards over the hit (it faces the vehicle)
    p.ch.root.rotation.set(0, p.heading, 0);
    const sp = Math.min(8, s * 0.6);
    p.rag = this.ragdoll?.(p.ch, { x: p.vx, y: p.vy, z: p.vz }, { x: dirZ * sp, y: 0, z: -dirX * sp }) || null;
    return true;
  }
  // a ragdolled pedestrian: follows its body; once it lies still, lies there p.t, then gets up and runs off
  _ragTick(p, dt, dPl) {
    const r = p.rag, vr = 80 * (this.viewK ?? 1);
    p.pos.x = r.pos.x; p.pos.z = r.pos.z; p.y = r.pos.y;
    p.ch.root.visible = dPl < vr; p.ch.setDetail(dPl < 16);
    if (!r.resting) return;
    if (p.state === 'fly') { p.state = 'down'; p.t = 2.5; }
    if ((p.t -= dt) <= 0) { this._unrag(p); p.state = 'flee'; p.t = 3; }
  }
  _unrag(p) {
    p.rag.end(); p.rag = null;
    Ragdoll.standUp(p.ch); p.ch.root.rotation.set(0, p.heading, 0);
    p.y = surfaceAt(p.pos.x, p.pos.z, p.y);
  }
  scare(x, z, r) {
    for (const p of this.list) if (!p.dormant && p.state === 'walk' && Math.hypot(p.pos.x - x, p.pos.z - z) < r) { p.state = 'flee'; p.t = 2 + this.rnd() * 2; }
  }
  // flyer handout
  giveFlyer(p, rnd = Math.random) {
    if (p.voted) return { ok: false, text: '我已經拿過傳單了！' };
    p.state = 'talk'; p.t = 1.8;
    if (rnd() < 0.82) { p.voted = true; p.state = 'cheer'; p.t = 1.6; return { ok: true, text: ACCEPT[Math.floor(rnd() * ACCEPT.length)] }; }
    p.voted = true;
    return { ok: false, text: REFUSE[Math.floor(rnd() * REFUSE.length)] };
  }
}

// ---------------- mission NPCs (static) ----------------
export function makeMissionNpc(scene, look, name, x, z, heading = 0) {
  const ch = createCharacter(look);
  ch.root.position.set(x, surfaceAt(x, z), z); ch.root.rotation.y = heading;
  scene.add(ch.root);
  const lbl = makeLabel(name, { height: 0.28, color: '#ffd23f' });
  lbl.position.set(0, 2.1, 0); ch.root.add(lbl);
  const mark = makeLabel('!', { height: 0.45, color: '#111', bg: '#ffd23f' });
  mark.position.set(0, 2.75, 0); ch.root.add(mark);
  return { ch, name, pos: ch.root.position, mark, label: lbl, pose: null };
}
