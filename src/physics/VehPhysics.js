// Vehicle physics (P3): the vehicle you ride is a dynamic Rapier body ("servo chassis").
//
// The arcade handling in js/vehicles.js (_intent: throttle, brake, steering, drift) still decides where you
// want to go. The chassis is a real rigid body that is pushed toward that velocity with a limited force
// (aMax), so on open road it drives exactly like the arcade model (the story bot's driving model stays
// right), while everything it touches is real physics: walls and trees stop it, traffic and rivals shove it,
// cones and knocked vehicles get pushed with momentum.
//   - vertical: Rapier's DynamicRayCastVehicleController (raycast wheels with suspension) carries it on
//     the terrain, decks, cut floors, stairs and interior floors; gravity, airborne off a ledge
//   - the tyres give no horizontal force (friction slip ~0): horizontal motion is the servo's alone
//   - only yaw rotation (no pitch / roll): the mesh pitches with the ground and the scooter leans visually
//     (Vehicle._pose), as before
//   - hits: what the contacts took away from the velocity in a step (L), but never more than the speed you
//     were going into the obstacle yourself (being pushed by traffic or a rival is not you ramming it), is
//     the impact; once per frame (with physics steps) and object the arcade rules run (Vehicle.hitWall /
//     _hitVehicle: stop, slow down, bump, crash, knock), on the speed from before the hit
// Per frame (main.js _stepPhysics): latch(input) -> physics.update (pre / post every step) -> frame(dt).
// Without physics (or ?arcadecar) Vehicle.drive() runs as before.
import { G, groups } from './Physics.js';
import { surfaceAt } from '../world/Terrain.js';

// per vehicle kind. wheels: [x, z] in the vehicle frame (+z forward). r wheel radius, rest suspension rest
// length, sag static compression (the hub sits r + rest - sag above the body origin, so the origin rests on
// the road), aMax: the servo's acceleration limit on the ground (m/s^2), clear: ground clearance of the box
const SPEC = {
  scooter: { mass: 180, hh: 0.43, clear: 0.35, wheels: [[0, 0.62], [0, -0.6]], r: 0.27, rest: 0.3, sag: 0.1, aMax: 45 },
  car: { mass: 1320, hh: 0.6, clear: 0.35, wheels: [[0.82, 1.35], [-0.82, 1.35], [0.82, -1.35], [-0.82, -1.35]], r: 0.34, rest: 0.3, sag: 0.1, aMax: 40 },
};
const A_AIR = 2;          // servo limit in the air (m/s^2)
const AIR_GRACE = 0.25;   // s after the last wheel contact that still counts as on the ground
const HIT_MIN = 0.3;      // m/s taken by contacts before a step is checked for hits
const SLIP_MAX = 0.5, COS_SLIP = Math.cos(SLIP_MAX); // rad: see post()
const NO_INPUT = { throttle: 0, steer: 0, handbrake: false };
const TAU = Math.PI * 2;
const wrap = a => a - TAU * Math.floor((a + Math.PI) / TAU);
const yawOf = q => 2 * Math.atan2(q.y, q.w);
const yawRot = h => ({ x: 0, y: Math.sin(h / 2), z: 0, w: Math.cos(h / 2) });
// the arcade speed of horizontal velocity (x, z) for movement direction ang (see post()): its size within
// SLIP_MAX of that direction (negative backing up), otherwise more and more only its part along it
const arcSpeed = (x, z, ang) => { const al = x * Math.sin(ang) + z * Math.cos(ang), hs = Math.hypot(x, z); return hs > 0.5 ? al / Math.max(Math.abs(al) / hs, COS_SLIP) : al; };

// the body's shape: the arcade body's outline (js/vehicles.js bodySeg: a capsule of radius hw around the
// middle line, round at both ends, so it slips past a tree or a corner the way the arcade model and the
// story bot expect; a box's corners would catch them) as a prism with upright sides from y0 to y1
function footprint(R, v, y0, y1) {
  const f = v.hl - v.hw, r = v.hw, pts = [], N = 8;
  for (const e of [1, -1]) for (let i = 0; i <= N; i++) {
    const a = (e > 0 ? 0 : Math.PI) + Math.PI * i / N; // half circle around the front / back end
    const x = Math.cos(a) * r, z = e * f + Math.sin(a) * r;
    pts.push(x, y0, z, x, y1, z);
  }
  return R.ColliderDesc.convexHull(new Float32Array(pts));
}

export class Chassis {
  // a body for vehicle v (v.body = the chassis), or null when it cannot be made (the caller keeps arcade)
  static attach(physics, v) {
    if (!physics.ready) return null;
    try { return new Chassis(physics, v); } catch (e) { console.warn('[vehphys] 車輛物理建立失敗，這台車改用原本的操控', e); return null; }
  }
  constructor(P, v) {
    const R = P.R, W = P.world, S = this.spec = SPEC[v.kind === 'scooter' ? 'scooter' : 'car'];
    this.P = P; this.v = v;
    const y = v.mesh.position.y;
    this.body = W.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(v.pos.x, y + 0.02, v.pos.z).setRotation(yawRot(v.heading))
      .enabledRotations(false, true, false).setCcdEnabled(true).setCanSleep(false).setLinearDamping(0).setAngularDamping(0));
    this.col = P._own(W.createCollider(footprint(R, v, S.clear, S.clear + 2 * S.hh)
      .setMass(S.mass).setFriction(0.1).setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitution(0)
      .setCollisionGroups(groups(G.VEHICLE)), this.body), 'chassis', v);
    const ctrl = this.ctrl = W.createVehicleController(this.body);
    ctrl.indexUpAxis = 1;
    ctrl.setIndexForwardAxis = 2; // (the vendored API's setter is named like this)
    if (ctrl.indexForwardAxis !== 2) { this._free(); throw new Error('forward axis not set'); }
    const n = S.wheels.length, k = 9.81 / (n * S.sag), c = 0.7 * 2 * Math.sqrt(n * k) / n;
    S.wheels.forEach(([x, z], i) => {
      ctrl.addWheel({ x, y: S.r + S.rest - S.sag, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, S.rest, S.r);
      ctrl.setWheelSuspensionStiffness(i, k); ctrl.setWheelSuspensionCompression(i, c); ctrl.setWheelSuspensionRelaxation(i, c);
      ctrl.setWheelMaxSuspensionTravel(i, 0.3); ctrl.setWheelMaxSuspensionForce(i, 1e6);
      ctrl.setWheelFrictionSlip(i, 1e-3); ctrl.setWheelSideFrictionStiffness(i, 0);
    });
    this.rayGroups = (G.VEHICLE << 16) | G.WORLD; // wheels stand on the world only (not on cones, stand-ins, debris)
    const f = v.forward();
    this.body.setLinvel({ x: f[0] * v.speed, y: 0, z: f[1] * v.speed }, true); // a borrowed moving car keeps its speed
    this.inp = NO_INPUT; this.vset = { x: 0, z: 0 }; this.spSet = 0; this.airT = 0; this.lowT = 0;
    this.hits = new Map(); this.lastHits = new Map();
    this.wsp = v.speed; this.wx = v.pos.x; this.wz = v.pos.z;
    this._pre = (dt) => this.pre(dt); this._post = (dt) => this.post(dt);
    P.before.push(this._pre); P.after.push(this._post);
    v.body = this;
  }
  // once per frame before physics.update: the input for this frame's steps, and changes other code made to
  // v.speed (pedestrian hit, race barrier) or v.pos (pushed out of a barrier) since the last write-back.
  // v.pos was written extrapolated (frame()), so only the change is applied to the body
  latch(inp) {
    const v = this.v;
    this.inp = inp || NO_INPUT;
    if (Math.abs(v.speed - this.wsp) > 0.01) this._setSpeed(v.speed);
    const dx = v.pos.x - this.wx, dz = v.pos.z - this.wz;
    if (Math.hypot(dx, dz) > 0.01) {
      const t = this.body.translation(); this.body.setTranslation({ x: t.x + dx, y: t.y, z: t.z + dz }, true);
    }
  }
  _grounded(dt) {
    const c = this.ctrl;
    for (let i = 0; i < this.spec.wheels.length; i++) if (c.wheelIsInContact(i)) { this.airT = 0; return true; }
    this.airT += dt;
    if (this.airT < AIR_GRACE) return true;
    const t = this.body.translation();
    return t.y - surfaceAt(t.x, t.z, t.y) < 0.4;
  }
  // every physics step, before it: the arcade intent, then the velocity servo, then the wheels
  pre(dt) {
    const v = this.v, b = this.body;
    v._intent(dt, this.inp);
    const vc = b.linvel();
    let dx = Math.sin(v.moveAng) * v.speed - vc.x, dz = Math.cos(v.moveAng) * v.speed - vc.z;
    const lim = (this._grounded(dt) ? this.spec.aMax : A_AIR) * dt, dl = Math.hypot(dx, dz);
    if (dl > lim) { dx *= lim / dl; dz *= lim / dl; }
    this.vset.x = vc.x + dx; this.vset.z = vc.z + dz; this.spSet = arcSpeed(this.vset.x, this.vset.z, v.moveAng);
    b.setLinvel({ x: this.vset.x, y: vc.y, z: this.vset.z }, true);
    b.setAngvel({ x: 0, y: wrap(v.heading - yawOf(b.rotation())) / dt, z: 0 }, true);
    this.ctrl.updateVehicle(dt, undefined, this.rayGroups);
  }
  // every physics step, after it: write speed / heading / movement direction back; collect hits.
  // The arcade velocity is speed along moveAng (which lags the heading in a turn or drift). When contacts
  // took more than HIT_MIN of the velocity this step, the velocity it ended with is written back; otherwise
  // the servo's (vset: what the arcade model wanted, limited by aMax), so the wheels' pull on a slope does
  // not creep into the arcade speed. Up to SLIP_MAX off the intended direction (turns, drifts, sliding along
  // a wall) a velocity is taken as it is; a bigger change (shoved sideways, bounced) only counts with its
  // part along the intended direction, so a sideways shove is not turned into forward speed
  post() {
    const v = this.v, b = this.body, va = b.linvel(), yaw = yawOf(b.rotation());
    v.heading = yaw;
    const Lx = this.vset.x - va.x, Lz = this.vset.z - va.z, hit = Math.hypot(Lx, Lz) > HIT_MIN;
    const ux = hit ? va.x : this.vset.x, uz = hit ? va.z : this.vset.z, sp = arcSpeed(ux, uz, v.moveAng);
    if (Math.hypot(ux, uz) > 0.5) {
      const sg = sp < 0 ? -1 : 1, off = wrap(Math.atan2(ux * sg, uz * sg) - v.moveAng);
      v.moveAng = wrap(v.moveAng + Math.max(-SLIP_MAX, Math.min(SLIP_MAX, off)));
    }
    v.speed = sp;
    if (hit) this._collect(Lx, Lz);
    if (!Number.isFinite(va.x) || !Number.isFinite(b.translation().y)) this._rescue();
  }
  // contacts of the chassis this step: impact (m/s into the obstacle) per object, the largest kept, with the
  // velocity / speed from before the step (vx, vz, sp)
  _collect(Lx, Lz) {
    const P = this.P, W = P.world;
    W.contactPairsWith(this.col, other => {
      W.contactPair(this.col, other, (m, flipped) => {
        if (!m.numSolverContacts()) return;
        const n = m.normal(), s = flipped ? 1 : -1, nx = n.x * s, ny = n.y * s, nz = n.z * s; // from it toward the vehicle
        if (Math.abs(ny) > 0.6) return; // floor / roof
        const own = P.ownerOf(other);
        let key;
        if (!own) { if (P.tags.ground.has(other.handle)) return; key = 'wall'; }
        else if (own.kind === 'mover' && own.key?.hw !== undefined) key = own.key; // a vehicle stand-in
        else return; // props, debris, walking characters: physics alone
        const hl = Math.hypot(nx, nz) || 1, vs = this.vset;
        // only as hard as you were going into it (pushed by a moving stand-in: approach <= 0, no hit)
        const approach = -(vs.x * nx + vs.z * nz) / hl, impact = Math.min(approach, -(Lx * nx + Lz * nz) / hl);
        if (impact <= 0) return;
        const h = this.hits.get(key);
        if (!h || impact > h.impact) this.hits.set(key, { impact, nx: nx / hl, nz: nz / hl, vx: vs.x, vz: vs.z, sp: this.spSet });
      });
    });
  }
  // once per frame after physics.update: position, mesh, then the arcade hit rules (once per object)
  frame(dt, onBump) {
    const v = this.v, b = this.body, P = this.P;
    v.bumpCooldown -= dt; v.crash = null;
    const t = b.translation(), va = b.linvel(), ex = P.acc; // extrapolate the part of the frame not stepped yet
    v.pos.x = t.x + va.x * ex; v.pos.z = t.z + va.z * ex;
    const h = v.heading, fx = Math.sin(h) * v.wb / 2, fz = Math.cos(h) * v.wb / 2;
    let hf = surfaceAt(v.pos.x + fx, v.pos.z + fz, t.y), hb = surfaceAt(v.pos.x - fx, v.pos.z - fz, t.y), y = (hf + hb) / 2;
    if (t.y - y > 0.25) { hf = hb = y = t.y; } // in the air (off a ledge, over a hump)
    else if (y - t.y > 0.3) { // sunk below the ground it should stand on: lift it (never expected; counted)
      if ((this.lowT += dt) > 0.3) { b.setTranslation({ x: t.x, y: y + 0.02, z: t.z }, true); b.setLinvel({ x: va.x, y: 0, z: va.z }, true); this.lowT = 0; this.snaps = (this.snaps || 0) + 1; }
    } else this.lowT = 0;
    v.hf = hf; v.hb = hb;
    v._pose(dt, hf, hb, y);
    // hits: a new contact, or a harder one than last frame's with the same object, runs the arcade rule.
    // A frame without physics steps (high refresh rate) has no contacts of its own: last frame's are kept
    const before = v.speed;
    if (P.lastSteps > 0) {
      const last = this.lastHits;
      for (const [key, hit] of this.hits) {
        const prev = last.get(key), cls = hit.impact > 4 ? 2 : hit.impact > 2 ? 1 : 0, sp = hit.sp;
        hit.cls = cls;
        if (prev && cls <= prev.cls) continue;
        (this.log ||= []).push({ what: key === 'wall' ? 'wall' : key.label, impact: +hit.impact.toFixed(2), v0: +sp.toFixed(2) }); if (this.log.length > 8) this.log.shift(); // debugging
        if (key === 'wall') { v.hitWall(hit.impact, hit.nx, hit.nz, sp, onBump); continue; }
        const kf = v._knockKf(key, hit.nx, hit.nz, hit.impact);
        if (kf !== null) v.speed = sp; // knocked it away: your speed keeps kf of what it was before the hit (momentum)
        // closing speed against the other vehicle's own motion (whether traffic is thrown)
        const [ofx, ofz] = key.forward(), os = key.speed || 0;
        const rel = -((hit.vx - ofx * os) * hit.nx + (hit.vz - ofz * os) * hit.nz);
        v._hitVehicle(key, kf, hit.impact, hit.nx, hit.nz, sp, onBump, Math.abs(sp), rel);
      }
      this.lastHits = this.hits; this.hits = new Map();
    }
    if (v.speed !== before) this._setSpeed(v.speed);
    this.wsp = v.speed; this.wx = v.pos.x; this.wz = v.pos.z;
  }
  // make the arcade speed s (scales the horizontal velocity; 0 stops it)
  _setSpeed(s) {
    const b = this.body, va = b.linvel(), m = this.v.moveAng, cur = arcSpeed(va.x, va.z, m);
    if (Math.abs(cur) > 0.05 && Math.abs(s) > 0.01) { const k = s / cur; b.setLinvel({ x: va.x * k, y: va.y, z: va.z * k }, true); }
    else b.setLinvel({ x: Math.sin(m) * s, y: va.y, z: Math.cos(m) * s }, true);
    this.v.speed = this.wsp = s;
  }
  // Vehicle.place: moved by the game (race grid, tow, bot fallback, brought to you)
  teleport(x, z, h) {
    const b = this.body, v = this.v, y = surfaceAt(x, z);
    b.setTranslation({ x, y: y + 0.02, z }, true); b.setRotation(yawRot(h), true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    v.steer = 0; v.hf = v.hb = y;
    this.vset.x = this.vset.z = this.spSet = 0; this.hits.clear(); this.lastHits.clear();
    this.wsp = 0; this.wx = x; this.wz = z;
    v._pose(0, y, y, y);
  }
  // NaN or fallen through the world: back onto the top level at the last written position
  _rescue() {
    console.warn('[vehphys] 車輛物理狀態異常，已把車放回地面');
    const v = this.v; this.teleport(this.wx, this.wz, Number.isFinite(v.heading) ? v.heading : 0);
  }
  // the player got off: back to a plain parked vehicle on the same level (hf / hb keep the level)
  remove() {
    const v = this.v;
    this._free();
    v.body = null; v.speed = 0; this.wsp = 0;
    v.sync(0);
  }
  _free() {
    const P = this.P;
    P.before = P.before.filter(f => f !== this._pre); P.after = P.after.filter(f => f !== this._post);
    if (this.ctrl) { P.world.removeVehicleController(this.ctrl); this.ctrl = null; }
    if (this.body) { P._drop(this.body); this.body = null; }
  }
}
