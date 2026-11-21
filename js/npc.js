import * as THREE from 'three';
import { Vehicle, sameLevel } from './vehicles.js';
import { createCharacter, randomStudent } from './character.js';
import { mulberry32, makeLabel } from './map.js';
import { surfaceAt } from './terrain.js';
import { Ragdoll } from './ragdoll.js';

const SPEED_BY_TYPE = { primary: 12, secondary: 11, tertiary: 9.5, unclassified: 8, residential: 7, living_street: 5, service: 5.5 };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------------- traffic ----------------
// Each AI vehicle follows the road graph on its lane. So it reads as someone driving rather than a thing on
// rails:
//  - its own driver: cruise speed, acceleration, following gap and headway, patience; scooters ride closer
//    to the kerb at their own distance from it and weave a little
//  - corners are a curve from its lane on one edge to its lane on the next (the next edge is picked one edge
//    ahead) and it brakes for them by how sharp they are (lateral grip)
//  - it follows what is ahead with a gap that grows with speed; oncoming traffic in the other lane is not in
//    its way; it stops for pedestrians in its path
//  - it is never stuck for good: behind something that does not move it swings out and goes around (a few
//    seconds), later it turns back (U-turn), and if that cannot clear it either it is recycled out of view;
//    two that block each other at a junction: the one with the higher id goes first
// lanePt: the point d along f -> t (length l) at lane metres to its right
function lanePt(f, t, l, d, lane) {
  const ux = (t.x - f.x) / l, uz = (t.z - f.z) / l;
  return [f.x + ux * d - uz * lane, f.z + uz * d + ux * lane, ux, uz];
}
function bez(c, s) {
  const a = (1 - s) * (1 - s), b = 2 * s * (1 - s), e = s * s;
  const x = a * c.p0[0] + b * c.p1[0] + e * c.p2[0], z = a * c.p0[1] + b * c.p1[1] + e * c.p2[1];
  const tx = 2 * (1 - s) * (c.p1[0] - c.p0[0]) + 2 * s * (c.p2[0] - c.p1[0]), tz = 2 * (1 - s) * (c.p1[1] - c.p0[1]) + 2 * s * (c.p2[1] - c.p1[1]);
  return [x, z, tx, tz];
}
export class Traffic {
  constructor(scene, world, count = 28) {
    this.scene = scene; this.world = world; this.rnd = mulberry32(99);
    this.inView = () => true; // inView(pos): whether the camera may be looking at pos (main.js sets it)
    this.peds = null; // Peds (main.js): traffic stops for pedestrians in its path
    this.time = 0;
    this.agents = [];
    for (let i = 0; i < count; i++) {
      const r = this.rnd();
      const kind = r < 0.5 ? 'scooter' : r < 0.62 ? 'taxi' : 'car';
      const v = new Vehicle(kind, this.rnd);
      v.driver = 'ai';
      const rider = kind === 'scooter' ? createCharacter({ ...randomStudent(this.rnd), face: false }) : null;
      if (rider) { rider.root.position.copy(v.seat); v.mesh.add(rider.root); rider.update(0.1, { mode: 'ride' }); rider.setDetail(false); }
      v.rider = rider;
      const sc = kind === 'scooter', R = () => this.rnd();
      v.ai = {
        id: i, from: null, to: null, edge: null, d: 0, len: 1, stunned: 0, honkT: 0, waitT: 0,
        // the driver
        spK: sc ? 0.9 + R() * 0.4 : 0.85 + R() * 0.27, acc: sc ? 3.5 + R() * 2 : 2.2 + R() * 1.6,
        hw: sc ? 0.75 + R() * 0.45 : 1 + R() * 0.6, gap0: sc ? 1 + R() * 0.6 : 1.8 + R() * 1,
        patience: R() * 2.5, laneJ: sc ? R() * 0.6 : R() * 0.25, ph: R() * 100, weave: sc ? 0.12 + R() * 0.2 : 0.04,
        lat: 0, latT: 0, stuckT: 0, passT: 0, passObj: null, blocker: null, ignore: null, ignoreT: 0, turnT: 0, thPrev: null,
      };
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
      Object.assign(v.ai, { from: n, edge: e, to: e.to, d: 0, len: Math.hypot(e.to.x - n.x, e.to.z - n.z) || 1, dormant: false, stunned: 0, wreck: 0, ox: 0, oz: 0,
        pv: null, lat: 0, latT: 0, stuckT: 0, passT: 0, passObj: null, blocker: null, ignore: null, ignoreT: 0, turnT: 0, thPrev: null, uturns: 0 });
      this._enter(v);
      v.knocked = false; v.fallen = false; v.lean = 0; if (v.rider) { this._riderHome(v); v.rider.root.visible = true; } // a recycled wreck
      v.hf = v.hb = e.road.deck ? Infinity : undefined; // spawned on a viaduct: start on its deck
      v.heading = Math.atan2(e.to.x - n.x, e.to.z - n.z);
      v.speed = 4; v.mesh.visible = true;
      this._place(v, 0);
      return true;
    }
    return false;
  }
  _lane(v, e = v.ai.edge) {
    const j = v.ai.laneJ || 0;
    if (e.road.oneway) return v.kind === 'scooter' ? Math.max(0.6, e.w / 2 - 1 - j) : j;
    return v.kind === 'scooter' ? Math.max(1, e.w / 2 - 1.1 - j) : Math.max(1.2, e.w / 4 + j);
  }
  // the next edge after the one it is on (null: a dead end with no way back)
  _pick(v) {
    const a = v.ai, n = a.to;
    let opts = n.adj.filter(e => e.drive && e.to !== a.from);
    if (!opts.length) opts = n.adj.filter(e => e.drive);
    if (!opts.length) return null;
    // prefer going straight-ish
    const cur = Math.atan2(n.x - a.from.x, n.z - a.from.z);
    opts.sort((e1, e2) => Math.abs(angDiff(Math.atan2(e1.to.x - n.x, e1.to.z - n.z), cur)) - Math.abs(angDiff(Math.atan2(e2.to.x - n.x, e2.to.z - n.z), cur)));
    return this.rnd() < 0.55 ? opts[0] : opts[Math.floor(this.rnd() * opts.length)];
  }
  // the curve from its lane on f -> n (edge e1) to its lane on n -> e2.to: a quadratic Bezier over the last R
  // of the one and the first R of the other, through where the two lanes meet; vc: speed to take it at
  _turn(v, f, n, e1, e2) {
    const l1 = Math.hypot(n.x - f.x, n.z - f.z) || 1, l2 = Math.hypot(e2.to.x - n.x, e2.to.z - n.z) || 1;
    const R = Math.max(0.4, Math.min(7, l1 * 0.45, l2 * 0.45));
    const [x0, z0, u1x, u1z] = lanePt(f, n, l1, l1 - R, this._lane(v, e1));
    const [x2, z2, u2x, u2z] = lanePt(n, e2.to, l2, R, this._lane(v, e2));
    const ang = Math.abs(angDiff(Math.atan2(u2x, u2z), Math.atan2(u1x, u1z)));
    const cr = u1x * u2z - u1z * u2x;
    let p1;
    if (ang > 2.5) p1 = [(x0 + x2) / 2 + u1x * R, (z0 + z2) / 2 + u1z * R]; // U-turn at a dead end: a loop
    else if (Math.abs(cr) < 0.08) p1 = [(x0 + x2) / 2, (z0 + z2) / 2];
    else { const s = Math.max(0, Math.min(3 * R, ((x2 - x0) * u2z - (z2 - z0) * u2x) / cr)); p1 = [x0 + u1x * s, z0 + u1z * s]; }
    // how sharp the curve really is: also a sideways step between lanes of roads of different width
    const angB = Math.abs(angDiff(Math.atan2(x2 - p1[0], z2 - p1[1]), Math.atan2(p1[0] - x0, p1[1] - z0)));
    const aLat = v.kind === 'scooter' ? 4.5 : 3.6, k = Math.max(ang, angB);
    const vc = ang > 2.5 ? 2.5 : Math.max(2.5, Math.sqrt(aLat * R / Math.tan(Math.max(0.03, k / 2))));
    return { p0: [x0, z0], p1, p2: [x2, z2], R, vc };
  }
  // on a new edge: pick the one after it and the curve onto it
  _enter(v) {
    const a = v.ai;
    a.next = this._pick(v);
    a.cv = a.next ? this._turn(v, a.from, a.to, a.edge, a.next) : null;
  }
  _place(v, dt) {
    const a = v.ai, f = a.from, t = a.to, l = a.len;
    let x, z, tx, tz;
    if (a.cv && a.d > l - a.cv.R) [x, z, tx, tz] = bez(a.cv, Math.min(0.5, (a.d - (l - a.cv.R)) / (2 * a.cv.R)));
    else if (a.pv && a.d < a.pv.R) [x, z, tx, tz] = bez(a.pv, 0.5 + Math.max(0, a.d) / (2 * a.pv.R));
    else [x, z, tx, tz] = lanePt(f, t, l, a.d, this._lane(v));
    const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    // sideways: swinging out to pass (lat) and a scooter's weave
    const wv = a.weave * Math.sin(this.time * 0.45 + a.ph) * Math.min(1, Math.abs(v.speed) / 4);
    const lat = a.lat + wv;
    x += -tz * lat; z += tx * lat;
    // back on the lane after being thrown (landed()) or turning back: from where it was, eased in instead of a jump
    if (a.ox || a.oz) {
      x += a.ox; z += a.oz;
      const e = Math.exp(-dt * 1.5); a.ox *= e; a.oz *= e;
      if (Math.hypot(a.ox, a.oz) < 0.02) a.ox = a.oz = 0;
    }
    // facing: along the path, turned a little toward a sideways move
    let th = Math.atan2(tx, tz);
    if (dt > 0) {
      const lv = (lat - (a.latPrev ?? lat)) / dt;
      th += Math.atan2(lv, Math.max(2, Math.abs(v.speed))) * 0.8;
    }
    a.latPrev = lat;
    v.pos.set(x, 0, z);
    const rate = a.turnT > 0 ? 2.2 : 8, maxYaw = (v.kind === 'scooter' ? 3.5 : 2.6) * dt; // no snapping round
    const dh = angDiff(th, v.heading) * Math.min(1, dt * rate);
    v.heading += dt === 0 ? angDiff(th, v.heading) : Math.max(-maxYaw, Math.min(maxYaw, dh));
    // steer from how fast it is turning (scooters lean into corners)
    const yaw = dt > 0 && a.thPrev !== null ? angDiff(th, a.thPrev) / dt : 0;
    a.thPrev = th;
    v.steer += (Math.max(-1, Math.min(1, yaw * 0.6)) - v.steer) * Math.min(1, dt * 6);
    v.sync(dt);
  }
  _next(v) {
    const a = v.ai;
    if (!a.next) { a.dormant = true; v.mesh.visible = false; return; }
    const e = a.next;
    a.d -= a.len;
    a.pv = a.cv;
    a.from = a.to; a.to = e.to; a.edge = e; a.len = Math.hypot(e.to.x - a.from.x, e.to.z - a.from.z) || 1;
    a.d = Math.max(0, Math.min(a.d, a.len));
    this._enter(v);
  }
  // swing out around o (stopped in its way): to the side with room, staying on the road; false: no room
  _pass(v, o) {
    const a = v.ai, e = a.edge, [fx, fz] = v.forward(), nx = -fz, nz = fx;
    const bx = v.pos.x - nx * a.lat, bz = v.pos.z - nz * a.lat; // its spot on the lane
    const ob = (o.pos.x - bx) * nx + (o.pos.z - bz) * nz;
    const need = (o.radius || 0.5) + v.hw + 0.9, lane = this._lane(v); // clear of check()'s margin in update()
    const left = ob - need, right = ob + need;
    // room: the road edge on its right is (e.w / 2 - lane) away for a two-way road (centre line at -lane),
    // on the left the far edge of the oncoming lane
    const maxR = e.w / 2 - lane - v.hw - 0.2, minL = -(lane + e.w / 2) + v.hw + 0.3;
    const okL = left >= minL, okR = right <= maxR && v.kind === 'scooter';
    if (!okL && !okR) return false;
    a.latT = okR && (!okL || Math.abs(right) < Math.abs(left)) ? right : left;
    a.passT = 8; a.passObj = o;
    return true;
  }
  // turn back along the edge it is on (two-way roads only)
  _uturn(v) {
    const a = v.ai;
    const rev = a.to.adj.find(e => e.drive && e.to === a.from && e.road === a.edge.road);
    if (!rev) return false;
    const x0 = v.pos.x, z0 = v.pos.z;
    Object.assign(a, { from: a.to, to: a.from, edge: rev, d: Math.max(0, a.len - a.d), pv: null, lat: 0, latT: 0, passT: 0, passObj: null, ox: 0, oz: 0, turnT: 1.6, latPrev: undefined });
    this._enter(v);
    const [x, z] = lanePt(a.from, a.to, a.len, a.d, this._lane(v));
    a.ox = x0 - x; a.oz = z0 - z; // eased from where it is (_place)
    v.speed = 0; a.uturns = (a.uturns || 0) + 1;
    return true;
  }
  update(dt, player, audio) {
    this.time += dt;
    const p = player.pos;
    const obstacles = [];
    for (const v of this.agents) if (!v.ai.dormant) obstacles.push(v);
    const peds = this.peds ? this.peds.list : [];
    for (const v of this.agents) {
      const a = v.ai;
      if (!a) continue;
      if (v.rider?.rag || v.rider?.lieT !== undefined) this._riderTick(v, dt);
      if (a.dormant) { if (this.rnd() < 0.05) this.spawn(v, p.x, p.z, 90, 260); continue; }
      if (v.knocked) continue; // thrown by physics (main.js _knockTraffic) until it lands (landed())
      const dPl = Math.hypot(v.pos.x - p.x, v.pos.z - p.z);
      // a wreck stays where it came to rest (the traffic behind it goes around it), then is recycled once you
      // are 90 m away or not looking at it (inView, set by main.js)
      if (a.wreck > 0) { a.wreck -= dt; if (a.wreck <= 0) { if (dPl > 90 || !this.inView(v.pos)) { a.dormant = true; v.mesh.visible = false; } else a.wreck = 1; } continue; }
      if (dPl > 330) { a.dormant = true; v.mesh.visible = false; continue; }
      if (v.rider?.lieT !== undefined && a.stunned > 0) a.stunned = Math.max(a.stunned, 0.1); // back on its lane: waits for its rider
      if (a.stunned > 0) { a.stunned -= dt; v.speed *= Math.pow(0.9, dt * 60); v.sync(dt); continue; } // frame-rate independent decay
      if (a.turnT > 0) a.turnT -= dt;
      if (a.ignoreT > 0) { a.ignoreT -= dt; if (a.ignoreT <= 0) a.ignore = null; }
      // cruise: its own pace on this road, drifting a little over time
      const target = Math.min(v.maxSpeed * 0.8, (SPEED_BY_TYPE[a.edge.road.type] || 7) * a.spK * (1 + 0.06 * Math.sin(this.time * 0.15 + a.ph)));
      // look ahead for obstacles
      const [fx, fz] = v.forward();
      const range = Math.max(14, target * a.hw + a.gap0 + 5);
      let blocked = 99, blocker = null;
      const vy = v.mesh.position.y;
      // o: what it is (a vehicle, a pedestrian, the player), r: its radius, oy: its height, oh: its heading
      // (vehicles), margin: how far to the side of its path still counts
      const check = (o, ox, oz, r, oy, oh, margin, rng = range) => {
        if (o === a.ignore || !sameLevel(oy, vy)) return; // e.g. the player in the underpass below this street
        const dx = ox - v.pos.x, dz = oz - v.pos.z;
        const ahead = dx * fx + dz * fz; if (ahead < 0 || ahead > rng) return;
        const side = Math.abs(dx * fz - dz * fx);
        if (oh !== undefined && Math.cos(oh - v.heading) < -0.3 && side > 0.6) return; // oncoming, in the other lane
        if (side > r + margin) return;
        const g = ahead - r - v.radius;
        if (g < blocked) { blocked = g; blocker = o; }
      };
      const vm = v.hw + 0.4;
      for (const o of obstacles) if (o !== v && !o.ai?.dormant) check(o, o.pos.x, o.pos.z, o.radius, o.mesh.position.y, o.heading, vm);
      check(player, p.x, p.z, player.vehicle ? player.vehicle.radius : 0.5, player.vehicle ? player.vehicle.mesh.position.y : player.pos.y, player.vehicle ? player.vehicle.heading : undefined, v.hw + 0.6);
      for (const o of player.extraObstacles || []) check(o, o.pos.x, o.pos.z, o.radius, o.mesh.position.y, o.heading, vm);
      for (const q of peds) if (!q.dormant && q.state !== 'fly') check(q, q.pos.x, q.pos.z, 0.3, q.y ?? 0, undefined, v.hw + 0.35, 12);
      a.blocker = blocker;
      // two that wait for each other (crossing at a junction): the higher id goes first, the other keeps waiting;
      // head on in one lane: the higher id swings out
      if (blocker && blocker.ai && blocker.ai.blocker === v && a.id > blocker.ai.id) {
        if (Math.cos(blocker.heading - v.heading) > -0.5) { a.ignore = blocker; a.ignoreT = 3; }
        else if (a.passT <= 0) this._pass(v, blocker);
      }
      // speed: cruise, keep a gap to what is ahead (more at speed), slow down for the next corner
      let want = target;
      if (blocker) want = Math.min(want, Math.max(0, (blocked - a.gap0) / a.hw));
      if (a.cv) { const dist = a.len - a.cv.R - a.d; want = Math.min(want, dist > 0 ? Math.sqrt(a.cv.vc * a.cv.vc + 6 * dist) : a.cv.vc); }
      if (a.pv && a.d < a.pv.R) want = Math.min(want, a.pv.vc + 3 * a.d / a.pv.R);
      if (a.turnT > 0) want = Math.min(want, 2.5);
      // passing: creep past slowly while swinging out, until it is behind
      if (a.passT > 0) {
        a.passT -= dt;
        const o = a.passObj;
        const oa = o ? (o.pos.x - v.pos.x) * fx + (o.pos.z - v.pos.z) * fz : -99;
        const gone = !o || o.ai?.dormant || o.dormant || oa < -((o.radius || 0.5) + v.radius + 1);
        if (gone || (a.passT <= 0 && Math.abs(oa) > (o.radius || 0.5) + v.radius + 1)) { a.passT = 0; a.passObj = null; a.latT = 0; }
        else { if (a.passT <= 0) a.passT = 1; want = Math.min(want, 6); if (blocked > 0.4) want = Math.max(want, 1.2); }
      }
      // sideways: as fast as it moves along (a stopped car does not slide sideways)
      // (swinging out to pass: a steady sidestep, it creeps forward meanwhile)
      { const dl = a.latT - a.lat, mx = (a.passT > 0 ? 0.9 : 0.15 + Math.abs(v.speed) * 0.3) * dt; a.lat += Math.max(-mx, Math.min(mx, dl)); }
      const brake = blocked < 4 ? 14 : 8;
      v.speed += Math.max(-brake * dt, Math.min(a.acc * dt, want - v.speed));
      // stuck behind something: honk (if you are around), swing out, turn back, and at last be recycled
      const stuck = blocker && v.speed < 0.6 && want < 1;
      if (stuck) a.stuckT += dt; else a.stuckT = Math.max(0, a.stuckT - dt * 2);
      if (stuck && a.stuckT > 1.5 + a.patience && dPl < 25 && a.honkT <= 0) {
        audio && audio.horn(v.kind === 'scooter' ? 1.35 : 1, Math.max(0.15, 1 - dPl / 25)); a.honkT = 3 + this.rnd() * 3;
      }
      a.honkT -= dt;
      if (a.stuckT > 1.5 + a.patience && a.passT <= 0 && blocker) this._pass(v, blocker);
      if (a.stuckT > 8 + a.patience) {
        if ((a.uturns || 0) < 2 && this._uturn(v)) a.stuckT = 0;
        else if (dPl > 60 || !this.inView(v.pos)) { a.dormant = true; v.mesh.visible = false; continue; }
        else a.stuckT = 2.5 + a.patience - 0.5; // in sight: keep trying to get around
      }
      a.waitT = stuck ? a.waitT + dt : 0;
      a.d += Math.max(0, v.speed) * dt;
      while (!a.dormant && a.d >= a.len) this._next(v);
      if (!a.dormant) this._place(v, dt);
      v.mesh.visible = !a.dormant && dPl < 230 * (this.viewK ?? 1); // viewK: shorter on lower quality (main.js _applyQuality)
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
// They walk the footpath graph, each at their own pace and distance from the path's centre line. Now and
// then one stops for a while (on the phone, looking around, or chatting with someone walking by); they step
// aside for each other and for you, overtake slow walkers, turn back when you keep blocking the way, and run
// off along the path when scared. Off the path (knocked over) they walk back to it; if something is in the
// way they are put back on the path where you cannot see it (or walk through it after a while), so nobody
// stays stuck.
const REFUSE = ['我是別系的啦～', '我再考慮看看', '先讓我把報告寫完…', '我只是路過的高中生', '我已經投過了啦（還沒開始投）'];
const ACCEPT = ['好啊！支持彥霖！', '資管要贏！', '我會去投票的！', '彥霖讚啦 ✌', '票投彥霖！', '這傳單設計很用心欸', '資管要贏 票投彥霖！'];
export class Peds {
  constructor(scene, world, count = 34) {
    this.scene = scene; this.world = world; this.rnd = mulberry32(7);
    this.inView = () => true; // inView(pos): whether the camera may be looking at pos (main.js sets it)
    this.time = 0;
    this.list = [];
    for (let i = 0; i < count; i++) {
      const ch = createCharacter(randomStudent(this.rnd));
      ch.root.visible = false; scene.add(ch.root);
      this.list.push({ ch, pos: new THREE.Vector3(), heading: 0, speed: 1.05 + this.rnd() * 0.55, from: null, to: null, d: 0, len: 1, side: this.rnd() < 0.5 ? 1 : -1,
        offK: 0.4 + this.rnd() * 0.9, ph: this.rnd() * 100, state: 'walk', t: 0, dormant: true, voted: false, radius: 0.35,
        dodge: 0, pauseIn: 0, run: 0, blockT: 0, pose: null, mate: null });
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
      const len = Math.hypot(e.to.x - n.x, e.to.z - n.z) || 1;
      Object.assign(p, { from: n, to: e.to, edge: e, d: this.rnd() * len * 0.8, len, dormant: false, state: 'walk', voted: this.rnd() < 0.08, y: undefined,
        dodge: 0, run: 0, blockT: 0, pose: null, mate: null, pauseIn: 4 + this.rnd() * 25, ghost: false });
      // campus peds are students; more voters near campus
      p.ch.root.visible = true; p.ch.root.rotation.x = 0;
      this._place(p, 0);
      return true;
    }
    return false;
  }
  // how far right of the path's centre line (left if negative): on a street the pavement beside it
  _offset(p) { const e = p.edge; return e.drive ? (e.w / 2 + 0.5 + p.offK * 0.7) * p.side : (0.15 + p.offK * 0.55) * p.side; }
  _target(p, dodge = 0) {
    const f = p.from, t = p.to, l = p.len, k = p.d / l, dx = t.x - f.x, dz = t.z - f.z;
    const off = this._offset(p) + dodge;
    return [f.x + dx * k - dz / l * off, f.z + dz * k + dx / l * off];
  }
  // sp: its speed (it never moves much faster than that, e.g. onto the pavement of a street it turns into)
  _place(p, dt, sp = 1.5) {
    const [tx, tz] = this._target(p, p.dodge);
    const x0 = p.pos.x, z0 = p.pos.z;
    if (dt === 0) { p.pos.set(tx, 0, tz); } else {
      let mx = (tx - p.pos.x) * Math.min(1, dt * 4), mz = (tz - p.pos.z) * Math.min(1, dt * 4);
      const m = Math.hypot(mx, mz), lim = (sp * 1.6 + 0.6) * dt;
      if (m > lim) { mx *= lim / m; mz *= lim / m; }
      p.pos.x += mx; p.pos.z += mz;
    }
    // face where it goes (turning round corners), along the path when standing
    const mx = p.pos.x - x0, mz = p.pos.z - z0;
    const th = dt > 0 && mx * mx + mz * mz > 1e-6 ? Math.atan2(mx, mz) : Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z);
    p.heading += angDiff(th, p.heading) * Math.min(1, dt * 7 + (dt === 0 ? 1 : 0));
  }
  _next(p) {
    const n = p.to;
    let opts = n.adj.filter(e => e.to !== p.from);
    if (!opts.length) opts = n.adj;
    const e = opts[Math.floor(this.rnd() * opts.length)];
    p.d -= p.len; p.from = n; p.to = e.to; p.edge = e; p.len = Math.hypot(e.to.x - n.x, e.to.z - n.z) || 1; p.d = Math.max(0, Math.min(p.d, p.len));
  }
  // turn round on the path it is on (the other side of it, as seen walking the other way)
  _reverse(p) {
    const back = p.to.adj.find(e => e.to === p.from && e.road === p.edge.road) || p.to.adj.find(e => e.to === p.from);
    if (!back) return;
    Object.assign(p, { from: p.to, to: p.from, edge: back, d: Math.max(0, p.len - p.d), side: -p.side, dodge: -p.dodge });
  }
  // run off along the path, away from (x, z)
  _runFrom(p, x, z, t) {
    const fx = p.to.x - p.from.x, fz = p.to.z - p.from.z;
    if ((x - p.pos.x) * fx + (z - p.pos.z) * fz > 0) this._reverse(p);
    p.state = 'walk'; p.run = t; p.pose = null; this._unmate(p);
  }
  _unmate(p) { const m = p.mate; p.mate = null; if (m && m.mate === p) { m.mate = null; if (m.state === 'idle') m.t = Math.min(m.t, 0.6); } }
  // stop for a while: chat with someone walking close by, or check the phone / look around / just stand
  _pause(p) {
    p.pauseIn = 10 + this.rnd() * 30;
    let mate = null;
    if (this.rnd() < 0.55) for (const q of this.list) {
      if (q === p || q.dormant || q.state !== 'walk' || q.run > 0 || q.mate || Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) > 3.2) continue;
      mate = q; break;
    }
    if (mate) {
      const t = 4 + this.rnd() * 7;
      for (const [a, b] of [[p, mate], [mate, p]]) { a.state = 'idle'; a.pose = 'talk'; a.t = t; a.mate = b; a.pauseIn = 12 + this.rnd() * 30; }
      return;
    }
    const r = this.rnd();
    p.state = 'idle'; p.pose = r < 0.45 ? 'phone' : r < 0.75 ? 'look' : null; p.t = 1.5 + this.rnd() * (p.pose === 'phone' ? 6 : 3);
  }
  active() { return this.list.filter(p => !p.dormant); }
  update(dt, player, collision) {
    this.time += dt;
    const pl = player.pos;
    const plY = player.vehicle ? player.vehicle.mesh.position.y : pl.y;
    for (const p of this.list) {
      if (p.dormant) { if (this.rnd() < 0.08) this.spawn(p, pl.x, pl.z, 22, 90); continue; }
      const dPl = Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z);
      if (dPl > 120) { p.dormant = true; p.ch.root.visible = false; this._unmate(p); if (p.rag) this._unrag(p); continue; }
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
        if (p.t <= 0) this._goBack(p, true);
      } else if (p.state === 'cheer' || p.state === 'talk') {
        pose = p.state === 'cheer' ? 'cheer' : null;
        const th = Math.atan2(pl.x - p.pos.x, pl.z - p.pos.z); p.heading += angDiff(th, p.heading) * Math.min(1, dt * 6);
        if (p.t <= 0) this._goBack(p, false);
      } else if (p.state === 'idle') {
        pose = p.pose;
        // chatting: face each other; otherwise glance at you when you walk right up
        const m = p.mate;
        let lx = null, lz = null;
        if (m && m.mate === p) { lx = m.pos.x; lz = m.pos.z; }
        else if (dPl < 2.2 && !player.vehicle) { lx = pl.x; lz = pl.z; }
        if (lx !== null) { const th = Math.atan2(lx - p.pos.x, lz - p.pos.z); p.heading += angDiff(th, p.heading) * Math.min(1, dt * 4); }
        if (p.t <= 0) { p.state = 'walk'; p.pose = null; this._unmate(p); }
      } else if (p.state === 'return') {
        // walk back to the path; stuck (a wall, a car) -> back on it out of sight, or through it after a while
        const [tx, tz] = this._target(p, 0);
        const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
        if (d < p.best - 0.25) { p.best = d; p.bestT = 0; } else p.bestT += dt;
        if (d < 0.5) { p.state = 'walk'; p.ghost = false; if (p.runAfter) this._runFrom(p, pl.x, pl.z, 1.5 + this.rnd() * 1.5); }
        else if ((p.bestT > 1.5 && (!this.inView(p.pos) || dPl > 45)) || p.t <= 0) { p.pos.set(tx, 0, tz); p.state = 'walk'; p.ghost = false; }
        else {
          if (p.bestT > 4) p.ghost = true;
          const sp = p.runAfter ? 3.2 : 1.6;
          p.heading += angDiff(Math.atan2(dx, dz), p.heading) * Math.min(1, dt * 8);
          p.pos.x += dx / d * sp * dt; p.pos.z += dz / d * sp * dt; speed = sp;
          if (!p.ghost) collision.resolve(p.pos, 0.35, 0, p.ch.root.position.y);
        }
      } else {
        // walking (or running off when p.run > 0)
        if (p.run > 0) p.run -= dt;
        else if ((p.pauseIn -= dt) <= 0) this._pause(p);
        if (p.state === 'walk') {
          let sp = p.run > 0 ? 4.4 : p.speed * (1 + 0.08 * Math.sin(this.time * 0.3 + p.ph));
          // what is ahead: you (step aside, slow down; turn back when you keep standing in the way) and other
          // walkers (pass oncoming ones on the right, overtake slower ones on the left, else keep behind)
          const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
          let dodge = 0;
          const ax = pl.x - p.pos.x, az = pl.z - p.pos.z, ah = ax * fx + az * fz, sd = ax * fz - az * fx; // sd > 0: you are on its left
          if (ah > -0.3 && ah < 2.2 && Math.abs(sd) < 1 && sameLevel(p.y, plY)) {
            dodge = sd > 0 ? 1 : -1; sp *= ah < 1 ? 0.25 : 0.6;
            if (!player.vehicle && (p.blockT += dt) > 4) { this._reverse(p); p.blockT = 0; dodge = 0; }
          } else p.blockT = Math.max(0, p.blockT - dt);
          if (!dodge) for (const q of this.list) {
            if (q === p || q.dormant || q.state === 'fly') continue;
            const bx = q.pos.x - p.pos.x, bz = q.pos.z - p.pos.z;
            const bh = bx * fx + bz * fz; if (bh < 0 || bh > 1.6) continue;
            const bs = bx * fz - bz * fx; if (Math.abs(bs) > 0.7) continue;
            const same = Math.sin(q.heading) * fx + Math.cos(q.heading) * fz;
            if (same < -0.3) dodge = 0.75; // oncoming: keep right
            else if (q.state !== 'walk' || q.run <= 0 && q.speed < p.speed - 0.1 && p.run <= 0) dodge = -0.8; // standing / slower: pass on the left
            else if (bh < 1) sp = Math.min(sp, q.run > 0 ? 4.4 : q.speed);
            break;
          }
          p.dodge += (dodge - p.dodge) * Math.min(1, dt * 2.5);
          speed = sp; p.d += sp * dt;
          while (p.d >= p.len) this._next(p);
          this._place(p, dt, sp);
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
  // back to the path (after lying down, or after talking to you); run: then run off away from you
  _goBack(p, run) {
    p.state = 'return'; p.runAfter = run; p.best = 1e9; p.bestT = 0; p.t = 10; p.ghost = false; p.dodge = 0;
  }
  // hit by a vehicle going speed m/s along (dirX, dirZ): thrown up and forward, tumbling,
  // slides to a stop on landing, lies there (state 'down'), then gets up and runs off
  knock(p, dirX, dirZ, speed = 6) {
    if (p.state === 'down' || p.state === 'fly') return false;
    const s = Math.min(22, Math.max(3, speed));
    this._unmate(p); p.pose = null; p.run = 0;
    p.state = 'fly'; p.t = 2.5;
    p.vx = dirX * s * 0.75; p.vz = dirZ * s * 0.75; p.vy = 2.2 + s * 0.28; p.air = 0.1; p.spin = 0;
    p.heading = Math.atan2(-dirX, -dirZ);
    // with physics: limp (js/ragdoll.js), flipping backwards over the hit (it faces the vehicle)
    p.ch.root.rotation.set(0, p.heading, 0);
    const sp = Math.min(8, s * 0.6);
    p.rag = this.ragdoll?.(p.ch, { x: p.vx, y: p.vy, z: p.vz }, { x: dirZ * sp, y: 0, z: -dirX * sp }) || null;
    return true;
  }
  // a ragdolled pedestrian: follows its body; once it lies still, lies there p.t, then gets up and walks back
  // to its path, running off from you (_goBack)
  _ragTick(p, dt, dPl) {
    const r = p.rag, vr = 80 * (this.viewK ?? 1);
    p.pos.x = r.pos.x; p.pos.z = r.pos.z; p.y = r.pos.y;
    p.ch.root.visible = dPl < vr; p.ch.setDetail(dPl < 16);
    if (!r.resting) return;
    if (p.state === 'fly') { p.state = 'down'; p.t = 2.5; }
    if ((p.t -= dt) <= 0) { this._unrag(p); this._goBack(p, true); }
  }
  _unrag(p) {
    p.rag.end(); p.rag = null;
    Ragdoll.standUp(p.ch); p.ch.root.rotation.set(0, p.heading, 0);
    p.y = surfaceAt(p.pos.x, p.pos.z, p.y);
  }
  // a horn: those close by run off along their path, away from it
  scare(x, z, r) {
    for (const p of this.list) if (!p.dormant && (p.state === 'walk' || p.state === 'idle') && Math.hypot(p.pos.x - x, p.pos.z - z) < r) this._runFrom(p, x, z, 2 + this.rnd() * 2);
  }
  // flyer handout
  giveFlyer(p, rnd = Math.random) {
    if (p.voted) return { ok: false, text: '我已經拿過傳單了！' };
    this._unmate(p); p.pose = null; p.run = 0;
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
