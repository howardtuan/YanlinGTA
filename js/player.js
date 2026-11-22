import * as THREE from 'three';
import { createCharacter } from './character.js';
import { surfaceAt } from './terrain.js';
import { Vehicle } from './vehicles.js';
import { Ragdoll } from './ragdoll.js';

// Yanlin — modelled after the reference photo:
// black bowl-cut with full bangs, thin round light frames, black tee with small white chest logo,
// white shorts, black wristband, white sneakers.
const RAG_MAX = 1.8, RAG_LIE = 0.6; // thrown off as a ragdoll: s flying at most, s lying still at least
const TUMBLE_MIN = 1e-3;
export const YANLIN_LOOK = {
  hero: true, glasses: true, glassesColor: '#d6cfc0', hairStyle: 'bowl', hair: '#0e0e0f',
  skin: '#ecc8a6', shirt: '#121212', shorts: '#f3f2ec', shoes: '#f4f4f0',
};

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class Player {
  constructor(scene) {
    this.ch = createCharacter(YANLIN_LOOK);
    scene.add(this.ch.root);
    this.pos = this.ch.root.position;
    this.vy = 0; this.y = 0; this.heading = 0; this.vel = new THREE.Vector2();
    this.vehicle = null; this.pose = null; this.poseT = 0; this.frozen = false;
    this.speed = 0;
  }
  setPose(p, t = 1.2) { this.pose = p; this.poseT = t; }
  // this.y is height above the ground; render y adds the terrain under (x,z)
  place(x, z, h = 0) { this._unrag(); this.pos.set(x, surfaceAt(x, z), z); this.heading = h; this.ch.root.rotation.y = h; }
  sitAt(x, z, h) { this._unrag(); this.seat = { x, z, h }; this.pos.set(x, this.y + surfaceAt(x, z), z); this.heading = h; this.vel.set(0, 0); }
  standUp() { if (!this.seat) return; const s = this.seat; this.seat = null; this.pos.x += Math.sin(s.h) * -0.7; this.pos.z += Math.cos(s.h) * -0.7; }
  updateFoot(dt, input, camYaw, collision, interiors) {
    if (this.seat) {
      this.pos.set(this.seat.x, this.y + surfaceAt(this.seat.x, this.seat.z), this.seat.z); this.heading = this.seat.h; this.ch.root.rotation.y = this.heading;
      this.speed = 0; this.ch.update(dt, { mode: 'sit' }); return;
    }
    if (this.tumble > 0) { this._tumble(dt, collision, interiors); return; }
    // feet height last frame; the level under the feet (js/terrain.js grade separations)
    const feet = this.pos.y, surf0 = feet - this.y;
    const ax = this.frozen ? { x: 0, y: 0 } : input.axis();
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    let dx = fx * ax.y + rx * ax.x, dz = fz * ax.y + rz * ax.x;
    const l = Math.hypot(dx, dz);
    const sprint = input.down('ShiftLeft', 'ShiftRight');
    this.boost = Math.max(0, (this.boost || 0) - dt);
    const max = (sprint ? 7.8 : 4.3) * (this.boost > 0 ? 1.3 : 1);
    if (l > 0.01) { dx /= Math.max(1, l); dz /= Math.max(1, l); }
    const tvx = dx * max, tvz = dz * max;
    const acc = this.y > 0.01 ? 4 : 14;
    this.vel.x += (tvx - this.vel.x) * Math.min(1, dt * acc);
    this.vel.y += (tvz - this.vel.y) * Math.min(1, dt * acc);
    // walls: the physics character controller (js/walker.js, this.walker set by main.js) sweeps the move;
    // without it the game's own collision, in substeps so a low-FPS sprint frame can't step past a thin wall
    const mx = this.vel.x * dt, mz = this.vel.y * dt;
    if (this.walker) this.walker.move(this.pos, mx, mz);
    else {
      const steps = Math.max(1, Math.ceil(Math.hypot(mx, mz) / (0.38 * 0.5)));
      for (let i = 0; i < steps; i++) {
        this.pos.x += mx / steps; this.pos.z += mz / steps;
        collision.resolve(this.pos, 0.38, this.y);
      }
    }
    this.speed = Math.hypot(this.vel.x, this.vel.y);
    if (this.speed > 0.3 && l > 0.01) {
      const th = Math.atan2(this.vel.x, this.vel.y);
      this.heading += angDiff(th, this.heading) * Math.min(1, dt * 12);
    }
    // walked off a ledge (viaduct edge, top of a cut): keep the height and fall
    const surf = surfaceAt(this.pos.x, this.pos.z, feet);
    if (surf < surf0 - 0.5) this.y += surf0 - surf;
    // from an interior floor above the ground onto a deck at about that height (力行宿舍 2F -> 天橋): keep the height too
    else if (surf > surf0 + 0.5 && this.y > 0.5) this.y = Math.max(0, this.y - (surf - surf0));
    // jump
    const ground = interiors ? interiors.groundAt(this.pos.x, this.pos.z, this.y) : 0;
    // (was on the ground a frame ago and the floor fell away by less than a step: still on it, so steep stairs are walked down, not hopped)
    const onGround = this.y <= ground + 0.02 || (this._onGround && this.vy <= 0 && this.y - ground < 0.45);
    if (!this.frozen && input.hit('Space') && onGround) { this.vy = 5.6; this.sfx = 'jump'; }
    this.vy -= 16 * dt; this.y += this.vy * dt;
    // stick to stairs/slopes when walking down, land on floors
    if (this.y < ground || (onGround && this.vy <= 0 && this.y - ground < 0.45)) {
      if (this.vy < -3.5) { this.sfx = 'land'; this.landImpact = -this.vy / 6; }
      this.y = ground; this.vy = 0;
    }
    this._onGround = this.y <= ground + 0.02;

    this.ground = ground;
    this.pos.y = this.y + surf;
    this.ch.root.rotation.y = this.heading;
    this.poseT -= dt; if (this.poseT <= 0) this.pose = null;
    this.ch.update(dt, { speed: this.speed, air: this.y > (this.ground || 0) + 0.05, mode: 'foot', pose: this.speed > 1 && this.pose !== 'give' ? null : this.pose });
    // footsteps in time with the walk cycle: each half turn of the leg phase is one foot landing
    const foot = Math.floor(this.ch.phase / Math.PI);
    if (this.speed > 0.6 && this.y <= this.ground + 0.02 && foot !== this.lastFoot && !this.sfx) this.sfx = 'step';
    this.lastFoot = foot;
  }
  // thrown off the scooter (js/main.js): fly with velocity (vx, vz) and vy for t seconds of no
  // control, tumbling in the air, sliding to a stop, lying down until t runs out. With physics the body goes
  // limp (a ragdoll, js/ragdoll.js; this.ragdoll is set by main.js) for RAG_MAX s at most, and you lie still
  // at least RAG_LIE s, so a crash costs about as much time as before
  throwOff(vx, vz, vy, t) {
    this.vel.set(vx, vz); this.vy = vy; this.y = Math.max(this.y, 0.6); this.tumble = t; this.spin = 0; this.speed = 0;
    const l = Math.hypot(vx, vz) || 1, sp = Math.min(6, l * 0.5); // head first over the handlebars
    this.rag = this.ragdoll?.(this.ch, { x: vx, y: vy, z: vz }, { x: vz / l * sp, y: 0, z: -vx / l * sp }, { maxT: RAG_MAX }) || null;
  }
  _tumble(dt, collision, interiors) {
    if (this.rag) { this._ragdoll(dt, interiors); return; }
    this.tumble -= dt;
    const feet = this.pos.y, surf0 = feet - this.y;
    const ground = interiors ? interiors.groundAt(this.pos.x, this.pos.z, this.y) : 0;
    const onGround = this.y <= ground + 0.02 && this.vy <= 0;
    if (onGround) { const k = Math.max(0, 1 - dt * 5); this.vel.x *= k; this.vel.y *= k; }
    const mx = this.vel.x * dt, mz = this.vel.y * dt, steps = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.19));
    for (let i = 0; i < steps; i++) {
      this.pos.x += mx / steps; this.pos.z += mz / steps;
      const r = collision.resolve(this.pos, 0.38, this.y);
      if (r.hit) { const d = this.vel.x * r.nx + this.vel.y * r.nz; if (d < 0) { this.vel.x -= 1.3 * d * r.nx; this.vel.y -= 1.3 * d * r.nz; } }
    }
    const surf = surfaceAt(this.pos.x, this.pos.z, feet);
    if (surf < surf0 - 0.5) this.y += surf0 - surf;
    this.vy -= 16 * dt; this.y += this.vy * dt;
    if (this.y < ground) { if (this.vy < -3.5) { this.sfx = 'land'; this.landImpact = -this.vy / 6; } this.y = ground; this.vy = 0; }
    this.ground = ground;
    this.pos.y = this.y + surf;
    this.speed = 0;
    if (this.y > ground + 0.05) this.spin += dt * 8; else this.spin = 0;
    this.ch.root.rotation.set(this.spin, this.heading, 0);
    this.ch.update(dt, { mode: 'down' });
    if (this.tumble <= 0) { this.tumble = 0; this.vel.set(0, 0); this.ch.root.rotation.set(0, this.heading, 0); }
  }
  // the ragdoll moves the body (and this.pos, the root's position); lie there t once it is still, then up
  _ragdoll(dt, interiors) {
    const r = this.rag;
    this.speed = 0; this.vel.set(0, 0); this.vy = 0;
    // (tumble stays above 0 until you are up: updateFoot and main.js take tumble > 0 as "lying")
    this.tumble = Math.max(TUMBLE_MIN, this.tumble - dt);
    if (!r.resting) { r.lie = RAG_LIE; return; }
    if ((r.lie -= dt) > 0 || this.tumble > TUMBLE_MIN) return;
    // up where the trunk lies, on the floor there (an interior floor above the ground, js/interiors.js)
    this.tumble = 0; this.rag = null;
    const p = this.pos, t = r.moved ? p.y : r.trunkY, surf = surfaceAt(p.x, p.z, t); // (moved: placed by the game)
    this.y = this.ground = interiors ? interiors.groundAt(p.x, p.z, Math.max(0, t - surf - 0.3)) : 0;
    p.y = surf + this.y;
    Ragdoll.standUp(this.ch); this.ch.root.rotation.set(0, this.heading, 0);
  }
  // put by the game somewhere else while lying as a ragdoll: up at once
  _unrag() {
    if (!this.rag) return;
    this.rag.end(); this.rag = null; this.tumble = 0; this.y = 0;
    Ragdoll.standUp(this.ch); this.ch.root.rotation.set(0, this.heading, 0);
  }
  enter(v) {
    this._unrag();
    this.vehicle = v; v.driver = 'player'; v.fallen = false;
    v.mesh.add(this.ch.root);
    this.ch.root.position.copy(v.seat); this.ch.root.rotation.set(0, 0, 0);
    this.pos = this.ch.root.position; // local now
    this.ch.update(0.2, { mode: v.kind === 'scooter' ? 'ride' : 'drive' });
    this.ch.root.visible = v.kind === 'scooter'; // in a car the driver is hidden (a low roof would cut through the head)
    Vehicle.onRide?.(v, true); // physics body for the ridden vehicle (main.js, js/vehphys.js)
    v.up = 0; // (the body starts where the mesh is; an interior floor it was parked on is the physics' business now)
  }
  exit(scene, collision, interiors) {
    const v = this.vehicle; if (!v) return;
    // ridden onto an interior floor above the ground (力行宿舍 2F, up the stairs): the parked vehicle stays on that floor
    // (v.up = the floor's height above the terrain's surface, js/vehicles.js sync) and you step off onto it, not onto the ground under it
    const vy = v.mesh.position.y, y0 = surfaceAt(v.pos.x, v.pos.z, vy), rise = vy - y0;
    const fv = interiors && rise > 0.5 ? interiors.groundAt(v.pos.x, v.pos.z, rise + 0.4) : 0, up = fv > 0.3 && Math.abs(fv - rise) < 0.6;
    v.up = up ? fv : 0;
    Vehicle.onRide?.(v, false); // back to a parked vehicle on the level it stands on
    v.mesh.remove(this.ch.root); scene.add(this.ch.root); this.ch.root.visible = true;
    this.pos = this.ch.root.position;
    // try left side, right side, behind
    const [fx, fz] = v.forward();
    const cands = [[fz, -fx], [-fz, fx], [-fx, -fz], [fx, fz]];
    let placed = false;
    const floor = (x, z, y) => up ? interiors.groundAt(x, z, Math.max(0, y0 + fv - y + 0.4)) : 0; // (this.y: height above the terrain's surface)
    let h = 0;
    const nr = collision.noReserved; if (up) collision.noReserved = true; // (a building with an interior is "reserved" against spawns: not against you)
    for (const [cx, cz] of cands) {
      const x = v.pos.x + cx * v.exitSide, z = v.pos.z + cz * v.exitSide;
      // on the vehicle's own level (deck / cut / ground, terrain.js grade separations),
      // and not over a retaining wall (terrain.js height levels)
      const y = surfaceAt(x, z, y0), f = floor(x, z, y);
      if (!collision.blocked(x, z, 0.4, f, y0) && Math.abs(y + f - (y0 + (up ? fv : 0))) < 0.5) { this.pos.set(x, y + f, z); h = f; placed = true; break; }
    }
    collision.noReserved = nr;
    if (!placed && up) { h = fv; this.pos.set(v.pos.x, y0 + h, v.pos.z); } // no room beside it up there: where the vehicle stands
    else if (!placed) this.pos.set(v.pos.x + fz * 2.5, surfaceAt(v.pos.x + fz * 2.5, v.pos.z - fx * 2.5, y0), v.pos.z - fx * 2.5);
    this.heading = v.heading; this.ch.root.rotation.set(0, v.heading, 0);
    v.driver = null; v.speed = 0; this.vehicle = null; this.y = this.ground = h; this.seat = null; this.vy = 0; this.vel.set(0, 0);
  }
  // change clothes (wardrobe at 彥霖's old room): rebuild the figure with the new colours, keep where it stands
  setLook(look) {
    if (this.vehicle) return;
    // top: 'polo' = 系學會幹部T (collar, placket, lion logo), 'im' = 資管系服 (front lion, back code print);
    // anything else is a plain tee in the shirt colour
    this.look = { shirt: look.shirt, shorts: look.shorts, pants: !!look.pants, top: look.top || null };
    const old = this.ch, parent = old.root.parent;
    const ch = createCharacter({ ...YANLIN_LOOK, ...this.look, polo: this.look.top === 'polo', imTee: this.look.top === 'im' });
    ch.root.position.copy(old.root.position); ch.root.rotation.copy(old.root.rotation); ch.root.visible = old.root.visible;
    if (parent) { parent.remove(old.root); parent.add(ch.root); }
    old.dispose?.();
    this.ch = ch; this.pos = ch.root.position;
  }
  worldPos() { return this.vehicle ? this.vehicle.pos : this.pos; }
  worldHeading() { return this.vehicle ? this.vehicle.heading : this.heading; }
}

export class CameraRig {
  constructor(camera) {
    this.cam = camera; this.yaw = 0; this.pitch = 0.32; this.dist = 4.6; this.idle = 0;
    this.target = new THREE.Vector3(); this.cur = new THREE.Vector3(); this.first = true;
  }
  update(dt, input, player, collision, sens = 1, interiors = null) {
    const mx = input.mdx, my = input.mdy;
    this.yaw -= mx * 0.0026 * sens;
    const fpOn = this.fp || !!this.fpv?.active; // concert venue (fp) or the player's own first-person toggle (js/firstperson.js)
    this.pitch = Math.max(fpOn ? -1.1 : -0.25, Math.min(1.2, this.pitch + my * 0.0022 * sens));
    if (Math.abs(mx) + Math.abs(my) > 0) this.idle = 0; else this.idle += dt;
    const v = player.vehicle;
    const wp = player.worldPos();
    // first person (演唱會場內, js/concert.js): eyes at head height, look where the mouse points
    if (fpOn && !v) {
      const eye = this.cur.set(wp.x, player.pos.y + 1.62, wp.z), cp = Math.cos(this.pitch);
      this.cam.position.copy(eye);
      this.cam.lookAt(eye.x + Math.sin(this.yaw) * cp, eye.y - Math.sin(this.pitch), eye.z + Math.cos(this.yaw) * cp);
      this.first = true; // back in third person: start from the new spot instead of sliding over
      return;
    }
    // first person in a vehicle: eyes in the driver's seat, looking where the vehicle points; the mouse looks around
    // (up to ~120° each way) and the view drifts back to straight ahead when you let go; on two wheels it leans too
    if (fpOn && v && this.fpv) {
      this.fpLook = Math.max(-2.1, Math.min(2.1, (this.fpLook || 0) - mx * 0.0026 * sens));
      const rest = v.kind === 'scooter' ? 0.3 : 0.06; // on the scooter look down a little so the meter and mirrors are in view
      if (this._fpVeh !== v) { this._fpVeh = v; this.fpPitch = rest; this.fpLook = 0; }
      this.fpPitch = Math.max(-0.7, Math.min(0.9, this.fpPitch + my * 0.0022 * sens));
      if (this.idle > 1.2) { this.fpLook *= Math.max(0, 1 - dt * 2.5); this.fpPitch += (rest - this.fpPitch) * Math.min(1, dt * 2); }
      const fov = v.kind === 'scooter' ? 72 : 75; // a wider view from the seat, so the mirrors fit
      if (this.cam.fov !== fov) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
      v.mesh.updateMatrixWorld(true);
      const eye = this.fpv.eyeLocal(v).applyMatrix4(v.mesh.matrixWorld), yaw = v.heading + this.fpLook, cp = Math.cos(this.fpPitch);
      this.cam.position.copy(eye);
      this.cam.lookAt(eye.x + Math.sin(yaw) * cp, eye.y - Math.sin(this.fpPitch), eye.z + Math.cos(yaw) * cp);
      if (v.kind === 'scooter') this.cam.rotateZ(-(v.lean || 0) * 0.7);
      this.yaw = v.heading; this.first = true; // back in third person: behind the vehicle
      return;
    }
    if (this.cam.fov !== 62) { this.cam.fov = 62; this.cam.updateProjectionMatrix(); } // back from the seat view
    let dist, h;
    if (v) {
      dist = v.kind === 'scooter' ? 5.2 : 7.2; h = v.kind === 'scooter' ? 1.5 : 1.7;
      // auto-follow behind the vehicle when the mouse is idle
      if (this.idle > 1.0 && Math.abs(v.speed) > 1) {
        const behind = v.speed >= 0 ? v.heading : v.heading + Math.PI;
        this.yaw += angDiff(behind, this.yaw) * Math.min(1, dt * 2.5);
        this.pitch += (0.22 - this.pitch) * Math.min(1, dt * 1.5);
      }
      dist += Math.min(3, Math.abs(v.speed) * 0.08);
    } else { dist = 4.4; h = 1.55; }
    const zone = !v && interiors ? interiors.zoneAt(player.pos.x, player.pos.z, player.y) : null;
    if (zone) dist = 2.6;
    this.dist += (dist - this.dist) * Math.min(1, dt * 3);
    // ground under the player as drawn (vehicles: averaged over the wheels)
    const gy = v ? v.mesh.position.y : player.pos.y - player.y;
    this.target.set(wp.x, (v ? 0 : player.y) + gy + h, wp.z);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    let d = this.dist;
    // camera collision: pull in if a building is between target and camera
    for (let s = 0.6; s <= this.dist; s += 0.4) {
      const x = this.target.x - Math.sin(this.yaw) * cp * s, z = this.target.z - Math.cos(this.yaw) * cp * s;
      const y = this.target.y + sp * s;
      if (y < collision.topAt(x, z)) { d = Math.max(0.8, s - 0.4); break; }
    }
    if (interiors) {
      const ex = this.target.x - Math.sin(this.yaw) * cp * d, ez = this.target.z - Math.cos(this.yaw) * cp * d, ey = this.target.y + sp * d;
      const f = interiors.ray(this.target.x, this.target.y, this.target.z, ex, ey, ez);
      if (f < 1) d = Math.max(0.6, d * f - 0.3);
    }
    const px = this.target.x - Math.sin(this.yaw) * cp * d;
    const pz = this.target.z - Math.cos(this.yaw) * cp * d;
    let py = Math.max(surfaceAt(px, pz, this.target.y) + 0.3, this.target.y + sp * d);
    if (zone) py = Math.min(py, zone.ceil(player.y) + gy);
    if (this.first) { this.cur.set(px, py, pz); this.first = false; }
    this.cur.lerp(new THREE.Vector3(px, py, pz), Math.min(1, dt * 14));
    this.cam.position.copy(this.cur);
    this.cam.lookAt(this.target);
  }
}
