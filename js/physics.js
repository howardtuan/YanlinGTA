// Physics: the Rapier engine (Rust compiled to WebAssembly, vendor/rapier, see tools/vendor_rapier.mjs).
//
// One Physics instance (game.physics) owns the Rapier world. It steps at a fixed 60 Hz whatever the frame
// rate (an accumulator, at most MAX_SUB steps per frame), so handling feels the same on slow and fast
// machines and the story bot's fixed time step replays exactly. `alpha` (0..1) is how far the frame is
// between the last two physics steps, for smoothing what is drawn.
//
// FOR EVERYONE ADDING THINGS: you do not need to know Rapier.
// - Something solid that never moves (wall, pillar, kiosk): keep adding it to the game's own collision
//   (collision.addPolygon / addSegment / addCircle) while the map is built, as before. js/physworld.js turns
//   everything in it into physics colliders once, right after buildInteriors (main.js), so it blocks both.
//   Added later than that (at run time)? Also call physics.addStaticBox / addStaticCylinder.
// - Something that can be knocked over (cone, bin, sign): build its mesh as usual with its origin at the
//   bottom centre, stand it on the ground, then
//       const prop = physics.addProp(mesh, { shape: 'box', hx: 0.3, hy: 0.45, hz: 0.3, mass: 12 });
//   (shapes below at addProp). From then on physics moves the mesh: it sleeps (costs nothing) until a
//   vehicle or the player bumps it, tumbles, and falls asleep again. prop.remove() takes it out again.
//   Props more than PROP_FAR from the player are switched off and wait where they are.
//   A trash can, for example, needs nothing else: the map data only has to say where they stand.
// - The game keeps moving vehicles and the player itself (js/vehicles.js, js/player.js). Each frame main.js
//   hands the nearby ones to physics.movers() as kinematic stand-ins: they push props out of the way
//   but are never pushed back (the game's own collision still decides where vehicles go).
// - A parked vehicle hit hard is thrown with physics.knock() until it comes to rest (main.js knockVehicle);
//   so is traffic hit hard (main.js _knockTraffic, js/npc.js Traffic.landed).
// - The vehicle you ride is a dynamic body of its own (js/vehphys.js Chassis, P3; ?arcadecar: the old way).
//   It hooks into every step through physics.before / physics.after.
// Every collider gets a collision group (G below) that decides what it collides with.
//
// Debug: ?physdebug in the URL draws every collider as lines; ?nophysics turns the engine off.
import * as THREE from 'three';

// collision groups: membership bits; FILTER[group] = what that group collides with (must be symmetric).
// DEBRIS: vehicles knocked loose (physics.knock): the world, props and each other, and the game's own
// vehicles (kinematic) shove them, but walking characters do not
export const G = { WORLD: 1, VEHICLE: 2, PROP: 4, CHAR: 8, RAGDOLL: 16, SENSOR: 32, DEBRIS: 64 };
const FILTER = {
  [G.WORLD]: G.VEHICLE | G.PROP | G.CHAR | G.RAGDOLL | G.DEBRIS,
  [G.VEHICLE]: G.WORLD | G.VEHICLE | G.PROP | G.CHAR | G.RAGDOLL | G.DEBRIS,
  [G.PROP]: G.WORLD | G.VEHICLE | G.PROP | G.CHAR | G.RAGDOLL | G.DEBRIS,
  [G.CHAR]: G.WORLD | G.VEHICLE | G.PROP,
  [G.RAGDOLL]: G.WORLD | G.VEHICLE | G.PROP,
  [G.SENSOR]: G.VEHICLE | G.CHAR,
  [G.DEBRIS]: G.WORLD | G.VEHICLE | G.PROP | G.DEBRIS,
};
// Rapier interaction groups: (memberships << 16) | filter
export const groups = (g) => ((g & 0xffff) << 16) | (FILTER[g] & 0xffff);

export const STEP = 1 / 60;
const MAX_SUB = 4; // a frame slower than 15 fps drops the rest instead of spiralling
const PROP_FAR = 150;    // props further than this from the player are disabled (m)
const MOVER_JUMP = 6;    // a stand-in that moves further than this in one frame was teleported (place(), tow)
const MOVER_GONE = 1;    // seconds a stand-in may go unused before its body is freed (it is switched off at once)
const KNOCK_MAX_T = 10;  // a knocked body is handed back after this long even if it never sleeps (s)

const _q = new THREE.Quaternion(), _mq = new THREE.Quaternion();
const _yaw = new THREE.Vector3(0, 1, 0);
const yawQ = (h, q = _q) => q.setFromAxisAngle(_yaw, h);

export class Physics {
  constructor() {
    this.R = null; this.world = null; this.events = null;
    this.acc = 0; this.alpha = 0; this.steps = 0;
    this.before = []; // callbacks run before every physics step: fn(STEP, i, n) (i-th of the frame's n steps)
    this.after = []; // callbacks run after every physics step: fn(STEP, i, n)
    this.lastSteps = 0; // steps taken by the last update()
    this.owner = new Map(); // collider handle -> { kind: 'mover' | 'prop' | 'knock' | 'chassis', key }
    this.debug = null;
    this.props = new Set();   // addProp records
    this.knocked = new Set(); // knock records
    this.moverMap = new Map(); // key object -> { body, t, sig }
    this.focus = null; this._farT = 0;
  }
  get ready() { return !!this.world; }
  // loads the engine; false (and the game runs without it) when WebAssembly is unavailable or ?nophysics
  async init() {
    try {
      if (typeof WebAssembly !== 'object' || /[?&]nophysics\b/.test(location.search)) return false;
      const R = await import('../vendor/rapier/rapier.mjs');
      await R.init();
      this.R = R;
      this.world = new R.World({ x: 0, y: -9.81, z: 0 });
      this.world.timestep = STEP;
      this.events = new R.EventQueue(true);
      return true;
    } catch (e) {
      console.warn('物理引擎（Rapier）載入失敗，遊戲改用原本的碰撞', e);
      this.world = null;
      return false;
    }
  }
  // fixed solids added after the world was built (world y; yaw in radians about +y). Return the collider
  // (null without physics), so it can be removed again with physics.world.removeCollider(c, false)
  addStaticBox(x, y, z, hx, hy, hz, yaw = 0) {
    if (!this.world) return null;
    const s = Math.sin(yaw / 2), c = Math.cos(yaw / 2);
    return this.world.createCollider(this.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z)
      .setRotation({ x: 0, y: s, z: 0, w: c }).setCollisionGroups(groups(G.WORLD)).setFriction(0.9));
  }
  // y = the bottom, h = height
  addStaticCylinder(x, y, z, r, h) {
    if (!this.world) return null;
    return this.world.createCollider(this.R.ColliderDesc.cylinder(h / 2, r).setTranslation(x, y + h / 2, z)
      .setCollisionGroups(groups(G.WORLD)).setFriction(0.9));
  }

  // ---------- props (P2): things that can be knocked over ----------
  // obj: a THREE.Object3D standing on the ground, origin at its bottom centre (obj.position / quaternion
  // are taken as the start pose; from now on physics writes them). opt:
  //   shape 'box' {hx, hy, hz} | 'cylinder' {r, hh} | 'cone' {r, hh}: half sizes, the shape's centre hh / hy
  //         above the origin (cy to move it), or parts: [{shape..., x, y, z, mass}] for a compound body
  //   mass (kg, default 10), friction 0.7, restitution 0.2, damping (linear, 0.1), angularDamping 0.4,
  //   maxSpeed: cap after every step (a water-filled barrier slides, it does not fly), group G.PROP
  // returns { body, obj, remove(), hit } (hit: it has been moved more than 10 cm), or null without physics
  addProp(obj, opt = {}) {
    if (!this.world) return null;
    const R = this.R, W = this.world;
    obj.updateMatrix();
    const p = obj.position, q = obj.quaternion;
    // dropped from 2 cm and left awake: it settles on the ground by itself and falls asleep a moment later.
    // (Put to sleep at once, a thin part resting exactly on the terrain mesh sinks through it when woken.)
    const bd = R.RigidBodyDesc.dynamic().setTranslation(p.x, p.y + (opt.lift ?? 0.02), p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setLinearDamping(opt.damping ?? 0.1).setAngularDamping(opt.angularDamping ?? 0.4).setCcdEnabled(true);
    const body = W.createRigidBody(bd);
    const parts = opt.parts || [{ ...opt, mass: opt.mass ?? 10 }];
    const rec = { body, obj, x0: p.x, z0: p.z, maxSpeed: opt.maxSpeed || 0, hit: false, off: false, remove: () => this._removeProp(rec) };
    for (const s of parts) this._own(W.createCollider(this._shape(s).setMass(s.mass ?? 10).setFriction(opt.friction ?? 0.7)
      .setRestitution(opt.restitution ?? 0.2).setCollisionGroups(groups(opt.group ?? G.PROP)), body), 'prop', rec);
    this.props.add(rec);
    return rec;
  }
  _shape(s) {
    const D = this.R.ColliderDesc;
    let d, h;
    if (s.shape === 'cylinder') { d = D.cylinder(s.hh, s.r); h = s.hh; }
    else if (s.shape === 'cone') { d = D.cone(s.hh, s.r); h = s.hh; }
    else if (s.shape === 'capsule') { d = D.capsule(s.hh, s.r); h = s.hh + s.r; }
    else { d = D.cuboid(s.hx, s.hy, s.hz); h = s.hy; }
    return d.setTranslation(s.x || 0, s.y ?? s.cy ?? h, s.z || 0);
  }
  _removeProp(rec) {
    if (!this.props.delete(rec) || !this.world) return;
    this._drop(rec.body);
  }
  // who a collider belongs to (null: the static world, see physics.tags for its kinds). Handles are reused
  // by Rapier, so every path that removes a body goes through _drop()
  _own(col, kind, key) { this.owner.set(col.handle, { kind, key }); return col; }
  ownerOf(col) { return this.owner.get(col.handle) || null; }
  _drop(body) {
    for (let i = 0, n = body.numColliders(); i < n; i++) this.owner.delete(body.collider(i).handle);
    this.world.removeRigidBody(body);
  }
  // wake a prop and throw it (velocity m/s, null: keep what it has; optional spin rad/s): for hits the
  // stand-ins do not cover, or to make a shoved prop tumble
  kick(rec, vx, vy, vz, sx = 0, sy = 0, sz = 0) {
    if (!rec || !this.world) return;
    if (rec.off) { rec.body.setEnabled(true); rec.off = false; }
    if (vx !== null) rec.body.setLinvel({ x: vx, y: vy, z: vz }, true);
    if (sx || sy || sz) rec.body.setAngvel({ x: sx, y: sy, z: sz }, true);
  }

  // ---------- kinematic stand-ins for what the game moves itself ----------
  // list: [{ key, x, y, z, yaw, r, hl, cy, hh, group }] every frame (y = ground under it). A vehicle is a box
  // along yaw (half width r, half length hl, half height hh) whose centre is cy above y: a flat front pushes
  // a cone ahead (a rounded one lifts it over the bonnet). hl <= r: an upright capsule (radius r, from y to
  // y + 2 cy) for a walking character. Keys not listed for MOVER_GONE seconds lose their body.
  movers(list, dt) {
    if (!this.world) return;
    const R = this.R, W = this.world, seen = new Set();
    // a stand-in moving faster than this in one frame was moved by the game, not driven (lane snap, place())
    const jump = Math.min(MOVER_JUMP, 0.5 + 40 * dt);
    for (const m of list) {
      seen.add(m.key);
      const up = m.hl <= m.r; // walking character: upright capsule
      const sig = `${m.r}|${m.hl}|${m.cy}|${m.hh}|${m.group}`;
      let rec = this.moverMap.get(m.key);
      if (rec && rec.sig !== sig) { this.dropMover(m.key); rec = null; }
      const rot = yawQ(m.yaw);
      const pos = { x: m.x, y: m.y + m.cy, z: m.z }, r = { x: rot.x, y: rot.y, z: rot.z, w: rot.w };
      if (!rec) {
        const body = W.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z).setRotation(r));
        const d = up ? R.ColliderDesc.capsule(Math.max(0.05, m.cy - m.r), m.r) : R.ColliderDesc.cuboid(m.r, m.hh ?? m.cy, m.hl);
        rec = { body, sig, t: 0, on: true, from: null, to: null };
        this._own(W.createCollider(d.setCollisionGroups(groups(m.group ?? G.VEHICLE)).setFriction(0.5), body), 'mover', m.key);
        this.moverMap.set(m.key, rec);
      } else if (!rec.on) { // back in the list: switched on where it is now
        rec.body.setEnabled(true); rec.on = true;
        rec.body.setTranslation(pos, true); rec.body.setRotation(r, true); rec.from = rec.to = null;
      } else {
        const c = rec.body.translation();
        if (Math.hypot(c.x - pos.x, c.y - pos.y, c.z - pos.z) > jump) { rec.body.setTranslation(pos, true); rec.body.setRotation(r, true); rec.from = rec.to = null; }
        else {
          // spread the frame's motion over its physics steps (before hook): the whole frame in the first step
          // would give the stand-in twice its speed against what it touches
          const q = rec.body.rotation();
          rec.from = { p: { x: c.x, y: c.y, z: c.z }, q: new THREE.Quaternion(q.x, q.y, q.z, q.w) };
          rec.to = { p: pos, q: new THREE.Quaternion(r.x, r.y, r.z, r.w) };
        }
      }
      rec.t = 0;
    }
    // not in the list this frame (you got on, a rival removed, out of range): no invisible block left behind
    for (const [k, rec] of this.moverMap) {
      if (seen.has(k)) continue;
      if (rec.on) { rec.body.setEnabled(false); rec.on = false; rec.from = rec.to = null; }
      if ((rec.t += dt) > MOVER_GONE) this.dropMover(k);
    }
  }
  _moverSteps(i, n) {
    const f = (i + 1) / n, p = {}, q = _mq;
    for (const rec of this.moverMap.values()) {
      if (!rec.to) continue;
      const a = rec.from.p, b = rec.to.p;
      p.x = a.x + (b.x - a.x) * f; p.y = a.y + (b.y - a.y) * f; p.z = a.z + (b.z - a.z) * f;
      q.copy(rec.from.q).slerp(rec.to.q, f);
      rec.body.setNextKinematicTranslation(p); rec.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      if (i === n - 1) rec.from = rec.to = null;
    }
  }
  dropMover(key) {
    const rec = this.moverMap.get(key); if (!rec) return;
    this.moverMap.delete(key); this._drop(rec.body);
  }
  // a stand-in, or a vehicle that has a physics body of its own (vehphys.js), already pushes what it touches
  hasMover(key) { return !!this.moverMap.get(key)?.on || !!key?.body; }

  // ---------- knocked loose: a dynamic body for an object the game normally places itself ----------
  // obj: the object's mesh (its position / quaternion are the start pose, physics writes them, and calls
  // obj.updateMatrix() when matrixAutoUpdate is off). shape: as addProp (centre above the origin).
  // v: {x,y,z} start velocity, w: {x,y,z} spin. onMove(pos, quat) after each frame's steps, onRest(pos, quat)
  // once it sleeps (or after KNOCK_MAX_T): the body is gone by then. Returns the record or null.
  knock(obj, shape, mass, v, w, onMove, onRest, key = obj) {
    if (!this.world) return null;
    const R = this.R, W = this.world, p = obj.position, q = obj.quaternion;
    const body = W.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setLinearDamping(0.15).setAngularDamping(0.6).setCcdEnabled(true));
    const rec = { body, obj, onMove, onRest, t: 0, key };
    this._own(W.createCollider(this._shape(shape).setMass(mass).setFriction(0.8).setRestitution(0.15).setCollisionGroups(groups(G.DEBRIS)), body), 'knock', key);
    body.setLinvel(v, true); if (w) body.setAngvel(w, true);
    this.knocked.add(rec);
    return rec;
  }

  // advance by the frame's dt in fixed steps
  update(dt) {
    if (!this.world) return;
    this.acc += Math.min(dt, MAX_SUB * STEP);
    // this frame's step count first (the epsilon: 1/30 s must give exactly 2 steps, not 1 or 3 by rounding)
    let n = 0;
    while (this.acc - n * STEP >= STEP - 1e-9 && n < MAX_SUB) n++;
    for (let i = 0; i < n; i++) {
      this._moverSteps(i, n);
      for (const f of this.before) f(STEP, i, n);
      this.world.step(this.events);
      this.acc -= STEP; this.steps++;
      for (const f of this.after) f(STEP, i, n);
      for (const p of this.props) if (p.maxSpeed && !p.body.isSleeping()) {
        const v = p.body.linvel(), s = Math.hypot(v.x, v.z);
        if (s > p.maxSpeed) p.body.setLinvel({ x: v.x * p.maxSpeed / s, y: v.y, z: v.z * p.maxSpeed / s }, true);
      }
    }
    this.acc = Math.max(0, this.acc);
    if (n === MAX_SUB) this.acc = Math.min(this.acc, STEP);
    this.lastSteps = n;
    this.alpha = this.acc / STEP;
    if (n) this._sync(n * STEP);
    if (this.debug) this._drawDebug();
  }
  _sync(dt) {
    for (const p of this.props) {
      if (p.off || p.body.isSleeping()) continue;
      const t = p.body.translation(), r = p.body.rotation();
      if (!p.hit && Math.hypot(t.x - p.x0, t.z - p.z0) > 0.1) p.hit = true;
      p.obj.position.set(t.x, t.y, t.z); p.obj.quaternion.set(r.x, r.y, r.z, r.w);
      if (!p.obj.matrixAutoUpdate) p.obj.updateMatrix();
    }
    for (const k of this.knocked) {
      const t = k.body.translation(), r = k.body.rotation();
      k.obj.position.set(t.x, t.y, t.z); k.obj.quaternion.set(r.x, r.y, r.z, r.w);
      if (!k.obj.matrixAutoUpdate) k.obj.updateMatrix();
      k.onMove?.(k.obj.position, k.obj.quaternion);
      if (k.body.isSleeping() || (k.t += dt) > KNOCK_MAX_T) {
        this.knocked.delete(k); this._drop(k.body);
        k.onRest?.(k.obj.position, k.obj.quaternion);
      }
    }
    // props far from the player wait where they are (a few times a second)
    if (this.focus && (this._farT -= dt) <= 0) {
      this._farT = 0.5;
      const { x, z } = this.focus;
      for (const p of this.props) {
        const t = p.body.translation(), off = Math.hypot(t.x - x, t.z - z) > PROP_FAR;
        if (off !== p.off) { p.off = off; p.body.setEnabled(!off); }
      }
    }
  }

  // ---------- debug view (?physdebug) ----------
  enableDebug(scene) {
    if (!this.world || this.debug) return;
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: true, transparent: true, opacity: 0.85 });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false; lines.renderOrder = 999;
    scene.add(lines);
    this.debug = { lines, t: 0 };
  }
  _drawDebug() {
    const D = this.debug;
    if ((D.t = (D.t + 1) % 6)) return; // every 6th call: the full buffer is rebuilt each time
    const buf = this.world.debugRender();
    const g = D.lines.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(buf.vertices, 3));
    g.setAttribute('color', new THREE.BufferAttribute(buf.colors, 4));
    g.computeBoundingSphere();
  }
}
