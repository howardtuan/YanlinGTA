import * as THREE from 'three';
import { createCharacter } from './character.js';
import { surfaceAt } from './terrain.js';
import { Vehicle } from './vehicles.js';
import { Ragdoll } from './ragdoll.js';

// Yanlin — modelled after the reference photo:
// black bowl-cut with full bangs, thin round light frames, black tee with small white chest logo,
// white shorts, black wristband, white sneakers.
const RAG_MAX = 2.5, RAG_LIE = 0.6; // thrown off as a ragdoll: s flying at most, s lying still at least
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
    // substeps so a low-FPS sprint frame can't step past a thin interior wall
    const mx = this.vel.x * dt, mz = this.vel.y * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(mx, mz) / (0.38 * 0.5)));
    for (let i = 0; i < steps; i++) {
      this.pos.x += mx / steps; this.pos.z += mz / steps;
      collision.resolve(this.pos, 0.38, this.y);
    }
    this.speed = Math.hypot(this.vel.x, this.vel.y);
    if (this.speed > 0.3 && l > 0.01) {
      const th = Math.atan2(this.vel.x, this.vel.y);
      this.heading += angDiff(th, this.heading) * Math.min(1, dt * 12);
    }
    // walked off a ledge (viaduct edge, top of a cut): keep the height and fall
    const surf = surfaceAt(this.pos.x, this.pos.z, feet);
    if (surf < surf0 - 0.5) this.y += surf0 - surf;
    // jump
    const ground = interiors ? interiors.groundAt(this.pos.x, this.pos.z, this.y) : 0;
    const onGround = this.y <= ground + 0.02;
    if (!this.frozen && input.hit('Space') && onGround) { this.vy = 5.6; this.sfx = 'jump'; }
    this.vy -= 16 * dt; this.y += this.vy * dt;
    // stick to stairs/slopes when walking down, land on floors
    if (this.y < ground || (onGround && this.vy <= 0 && this.y - ground < 0.45)) {
      if (this.vy < -3.5) { this.sfx = 'land'; this.landImpact = -this.vy / 6; }
      this.y = ground; this.vy = 0;
    }

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
    this.tumble -= dt;
    if (!r.resting) { r.lie = RAG_LIE; return; }
    if ((r.lie -= dt) > 0 || this.tumble > 0) return;
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
    this.ch.root.visible = v.kind === 'scooter' || true;
    Vehicle.onRide?.(v, true); // physics body for the ridden vehicle (main.js, js/vehphys.js)
  }
  exit(scene, collision) {
    const v = this.vehicle; if (!v) return;
    Vehicle.onRide?.(v, false); // back to a parked vehicle on the level it stands on
    v.mesh.remove(this.ch.root); scene.add(this.ch.root);
    this.pos = this.ch.root.position;
    // try left side, right side, behind
    const [fx, fz] = v.forward();
    const cands = [[fz, -fx], [-fz, fx], [-fx, -fz], [fx, fz]];
    let placed = false;
    const y0 = surfaceAt(v.pos.x, v.pos.z, v.mesh.position.y);
    for (const [cx, cz] of cands) {
      const x = v.pos.x + cx * v.exitSide, z = v.pos.z + cz * v.exitSide;
      // on the vehicle's own level (deck / cut / ground, terrain.js grade separations),
      // and not over a retaining wall (terrain.js height levels)
      const y = surfaceAt(x, z, y0);
      if (!collision.blocked(x, z, 0.4, 0, y0) && Math.abs(y - y0) < 0.5) { this.pos.set(x, y, z); placed = true; break; }
    }
    if (!placed) this.pos.set(v.pos.x + fz * 2.5, surfaceAt(v.pos.x + fz * 2.5, v.pos.z - fx * 2.5, y0), v.pos.z - fx * 2.5);
    this.heading = v.heading; this.ch.root.rotation.set(0, v.heading, 0);
    v.driver = null; v.speed = 0; this.vehicle = null; this.y = 0; this.seat = null; this.vy = 0; this.vel.set(0, 0);
  }
  // change clothes (wardrobe at 彥霖's old room): rebuild the figure with the new colours, keep where it stands
  setLook(look) {
    if (this.vehicle) return;
    this.look = { shirt: look.shirt, shorts: look.shorts, pants: !!look.pants };
    const old = this.ch, parent = old.root.parent;
    const ch = createCharacter({ ...YANLIN_LOOK, ...this.look });
    ch.root.position.copy(old.root.position); ch.root.rotation.copy(old.root.rotation); ch.root.visible = old.root.visible;
    if (parent) { parent.remove(old.root); parent.add(ch.root); }
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
    this.pitch = Math.max(-0.25, Math.min(1.2, this.pitch + my * 0.0022 * sens));
    if (Math.abs(mx) + Math.abs(my) > 0) this.idle = 0; else this.idle += dt;
    const v = player.vehicle;
    const wp = player.worldPos();
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
