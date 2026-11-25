// Unified roadside parked scooters (Option B):
// - Combines Furniture.js parked scooters (world.motoSpots) + hand-built street bikes (interiors.scooters)
//   into ONE single THREE.InstancedMesh draw call using the realistic scooter geometry.
// - Provides lightweight spatial-grid foot collision so walking characters don't clip through them.
// - When hit by the player's vehicle, traffic, or another flying scooter, hides the static instance
//   and launches a dynamic Rapier body (physics.knock) with domino chain knocks & bike_scrape SFX;
//   when it comes to rest, bakes the fallen pose back into the InstancedMesh (zero permanent draw-call growth).
// - When the player presses F nearby, claims the slot and materializes a real drivable Vehicle of the
//   same color (with a cap recycling oldest distant claimed scooters to protect mobile memory).
import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { sameLevel, bodyGap } from '../entities/Vehicles.js';
import { vmass, KNOCK_E } from './VehicleSpawner.js';

const CELL = 10;
const SCOOTER_MASS = 110;
const SCOOTER_HL = 0.78;
const SCOOTER_HW = 0.34;
const MAX_FLYING = 24;
const MAX_CLAIMED = 12;

const _M = new THREE.Matrix4();
const _Q = new THREE.Quaternion();
const _E = new THREE.Euler();
const _P = new THREE.Vector3();
const _S = new THREE.Vector3(1, 1, 1);
const _ZERO_S = new THREE.Vector3(0, 0, 0);
const _C = new THREE.Color();
const _F = new THREE.Vector3();

function closestOnCapsule(px, pz, sx, sz, yaw, hl) {
  const fx = Math.sin(yaw),
    fz = Math.cos(yaw);
  const f = Math.max(0.05, hl - SCOOTER_HW);
  const dx = px - sx,
    dz = pz - sz;
  let t = dx * fx + dz * fz;
  if (t < -f) t = -f;
  else if (t > f) t = f;
  const qx = sx + fx * t,
    qz = sz + fz * t;
  const gx = px - qx,
    gz = pz - qz;
  return { qx, qz, dx: gx, dz: gz, dist: Math.hypot(gx, gz) };
}

export class ParkedScooters {
  constructor(game) {
    this.game = game;
    this.slots = [];
    this.grid = new Map();
    this.activeKnocks = new Set();
    this.claimed = [];
    this._debrisMats = new Map();
    this._scrapeCd = 0;
    this._bumpCd = 0;
    this.geo = game.world?.motoGeo || null;
    this.im = null;
    this._build();
  }

  _key(ix, iz) {
    return ix * 73856 + iz;
  }

  _indexAdd(slot) {
    const ix = Math.floor(slot.x / CELL),
      iz = Math.floor(slot.z / CELL);
    slot.cx = ix;
    slot.cz = iz;
    const k = this._key(ix, iz);
    let bucket = this.grid.get(k);
    if (!bucket) this.grid.set(k, (bucket = []));
    bucket.push(slot);
  }

  _indexMove(slot, nx, nz) {
    slot.x = nx;
    slot.z = nz;
    const ix = Math.floor(nx / CELL),
      iz = Math.floor(nz / CELL);
    if (ix === slot.cx && iz === slot.cz) return;
    const oldK = this._key(slot.cx, slot.cz);
    const oldB = this.grid.get(oldK);
    if (oldB) {
      const idx = oldB.indexOf(slot);
      if (idx >= 0) oldB.splice(idx, 1);
    }
    this._indexAdd(slot);
  }

  _near(x, z, r, fn) {
    const x0 = Math.floor((x - r) / CELL),
      x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL),
      z1 = Math.floor((z + r) / CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const b = this.grid.get(this._key(ix, iz));
        if (!b) continue;
        for (let i = 0; i < b.length; i++) fn(b[i]);
      }
    }
  }

  _build() {
    const g = this.game;
    const raw = [];
    for (const m of g.world?.motoSpots || []) {
      raw.push({
        x: m[0],
        z: m[1],
        yaw: m[2],
        color: m[3] || '#2a2a2c',
        tilt: m[4] ?? 0.07,
        y: m[5],
      });
    }
    for (const s of g.interiors?.scooters || []) {
      raw.push({
        x: s[0],
        z: s[1],
        yaw: s[2],
        color: s[3] || '#2a2a30',
        tilt: (raw.length % 2 ? 1 : -1) * 0.06,
        y: undefined,
      });
    }
    const vehicles = g.vehicles || [];
    for (const item of raw) {
      if (!Number.isFinite(item.x) || !Number.isFinite(item.z)) continue;
      // Skip spots overlapping already-spawned real vehicles
      let overlap = false;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if ((v.pos.x - item.x) ** 2 + (v.pos.z - item.z) ** 2 < 1.35 * 1.35) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;
      // Deduplicate spots within 0.55 m of an earlier parked scooter
      this._near(item.x, item.z, 0.6, (other) => {
        if ((other.x - item.x) ** 2 + (other.z - item.z) ** 2 < 0.55 * 0.55) overlap = true;
      });
      if (overlap) continue;
      const y = Number.isFinite(item.y) ? item.y : surfaceAt(item.x, item.z);
      const slot = {
        idx: this.slots.length,
        x: item.x,
        y,
        z: item.z,
        yaw: item.yaw,
        color: item.color,
        tilt: item.tilt,
        state: 'static',
        cx: 0,
        cz: 0,
      };
      this.slots.push(slot);
      this._indexAdd(slot);
    }

    if (!this.slots.length || !this.geo) return;
    const im = new THREE.InstancedMesh(
      this.geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
      this.slots.length
    );
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      _E.set(0, s.yaw, s.tilt, 'YXZ');
      _Q.setFromEuler(_E);
      _P.set(s.x, s.y, s.z);
      _M.compose(_P, _Q, _S);
      im.setMatrixAt(i, _M);
      im.setColorAt(i, _C.set(s.color));
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = false;
    im.receiveShadow = true;
    im.frustumCulled = false;
    g.scene?.add(im);
    this.im = im;
  }

  _hideSlot(idx) {
    if (!this.im) return;
    _P.set(0, -500, 0);
    _Q.identity();
    _M.compose(_P, _Q, _ZERO_S);
    this.im.setMatrixAt(idx, _M);
    this.im.instanceMatrix.needsUpdate = true;
  }

  _writeSlotPose(idx, x, y, z, quat) {
    if (!this.im) return;
    _P.set(x, y, z);
    _M.compose(_P, quat, _S);
    this.im.setMatrixAt(idx, _M);
    this.im.instanceMatrix.needsUpdate = true;
  }

  _debrisMat(color) {
    let m = this._debrisMats.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ vertexColors: true, color, roughness: 0.75 });
      this._debrisMats.set(color, m);
    }
    return m;
  }

  // Push a walking character out of nearby static parked scooters
  resolveFoot(pos, r = 0.35) {
    if (!this.slots.length) return false;
    let hit = false;
    const rr = SCOOTER_HW + r;
    this._near(pos.x, pos.z, 2.2, (s) => {
      if (s.state !== 'static') return;
      if (Math.abs(s.y - (pos.y || 0)) > 1.8) return;
      const c = closestOnCapsule(pos.x, pos.z, s.x, s.z, s.yaw, SCOOTER_HL);
      if (c.dist < rr && c.dist > 1e-4) {
        pos.x = c.qx + (c.dx / c.dist) * rr;
        pos.z = c.qz + (c.dz / c.dist) * rr;
        hit = true;
      }
    });
    return hit;
  }

  // Closest interactive (static or fallen) parked scooter within maxR (Option B: press F to ride)
  nearestSpot(x, z, y, maxR = 3.2) {
    let best = null,
      bd = maxR;
    this._near(x, z, maxR + 1, (s) => {
      if (s.state !== 'static' && s.state !== 'fallen') return;
      if (Math.abs(s.y - y) > 2.5) return;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    });
    return best ? { spot: best, dist: bd } : null;
  }

  // Materialize a parked scooter slot into a real drivable Vehicle of the same color
  claimAsVehicle(spot) {
    if (!spot || (spot.state !== 'static' && spot.state !== 'fallen')) return null;
    const g = this.game;
    spot.state = 'taken';
    this._hideSlot(spot.idx);
    // Recycle oldest distant claimed roadside scooter if over cap
    if (this.claimed.length >= MAX_CLAIMED) {
      const plPos = g.player?.worldPos?.() || g.player?.pos || { x: 0, z: 0 };
      const idx = this.claimed.findIndex(
        (v) =>
          v !== g.player?.vehicle &&
          v !== g.myScooter &&
          !v.knocked &&
          Math.hypot(v.pos.x - plPos.x, v.pos.z - plPos.z) > 40
      );
      if (idx >= 0) {
        const old = this.claimed.splice(idx, 1)[0];
        g.physics?.dropMover?.(old);
        g.scene?.remove(old.mesh);
        const vi = g.vehicles.indexOf(old);
        if (vi >= 0) g.vehicles.splice(vi, 1);
      }
    }
    const v = g.vehicleSpawner.addVehicle('scooter', spot.x, spot.z, spot.yaw, Math.random, {
      color: spot.color,
    });
    v.fallen = false;
    this.claimed.push(v);
    return v;
  }

  knockSlot(slot, vx, vz, dv) {
    if (!slot || slot.state !== 'static') return false;
    const g = this.game;
    slot.state = 'flying';
    this._hideSlot(slot.idx);
    if (this._scrapeCd <= 0 && dv > 1.2) {
      this._scrapeCd = 0.12;
      g.audio?.physImpact?.('bike_scrape', Math.min(1, dv / 7), slot.x, slot.z);
    }
    const P = g.physics;
    const l = Math.hypot(vx, vz) || 1;
    const dx = vx / l,
      dz = vz / l;

    if (P?.ready && this.geo && this.activeKnocks.size < MAX_FLYING) {
      const mesh = new THREE.Mesh(this.geo, this._debrisMat(slot.color));
      mesh.position.set(slot.x, slot.y + 0.04, slot.z);
      _E.set(0, slot.yaw, slot.tilt, 'YXZ');
      mesh.quaternion.setFromEuler(_E);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      g.scene?.add(mesh);

      const sp = Math.min(14, dv * 1.15);
      const rec = { slot, mesh, x: slot.x, y: slot.y, z: slot.z, vx, vz, dv };
      this.activeKnocks.add(rec);
      const knocked = P.knock(
        mesh,
        { shape: 'box', hx: 0.3, hy: 0.48, hz: 0.82 },
        SCOOTER_MASS,
        { x: vx, y: Math.min(2.4, 0.85 + dv * 0.12), z: vz },
        { x: dz * sp, y: (slot.idx % 2 ? 0.35 : -0.35) * dv, z: -dx * sp },
        (p) => {
          rec.vx = (p.x - rec.x) * 60;
          rec.vz = (p.z - rec.z) * 60;
          rec.x = p.x;
          rec.y = p.y;
          rec.z = p.z;
        },
        (p, q) => {
          this.activeKnocks.delete(rec);
          g.scene?.remove(mesh);
          if (slot.state === 'taken') return;
          slot.state = 'fallen';
          slot.y = p.y;
          _F.set(0, 0, 1).applyQuaternion(q);
          slot.yaw = Math.atan2(_F.x, _F.z);
          this._indexMove(slot, p.x, p.z);
          this._writeSlotPose(slot.idx, p.x, p.y, p.z, q);
        },
        rec
      );
      if (knocked) return true;
      this.activeKnocks.delete(rec);
      g.scene?.remove(mesh);
    }

    // Fallback without physics or when flying debris pool is full: tip over directly in InstancedMesh
    const nx = slot.x + dx * Math.min(1.4, 0.45 + dv * 0.08);
    const nz = slot.z + dz * Math.min(1.4, 0.45 + dv * 0.08);
    const ny = surfaceAt(nx, nz);
    const dirSign = slot.idx % 2 ? 1 : -1;
    _E.set(0, slot.yaw + dirSign * 0.35, dirSign * 1.32, 'YXZ');
    _Q.setFromEuler(_E);
    slot.state = 'fallen';
    slot.y = ny + 0.14;
    this._indexMove(slot, nx, nz);
    this._writeSlotPose(slot.idx, nx, slot.y, nz, _Q);
    return true;
  }

  _checkVehicle(v, isPlayer) {
    const sp = Math.abs(v.speed || 0);
    if (sp < (isPlayer ? 0.8 : 1.5)) return;
    const vy = v.mesh?.position?.y ?? 0;
    const [fx, fz] = v.forward();
    const sg = Math.sign(v.speed) || 1;
    const vvx = fx * v.speed,
      vvz = fz * v.speed;
    let hitCount = 0;

    this._near(v.pos.x, v.pos.z, v.hl + SCOOTER_HL + 0.8, (s) => {
      if (s.state !== 'static') return;
      if (!sameLevel(s.y, vy)) return;
      const b = bodyGap(v, s.x, s.z);
      if (b.gap >= SCOOTER_HW + 0.12) return;
      const ox = s.x - b.qx,
        oz = s.z - b.qz,
        ol = Math.hypot(ox, oz) || 1;
      let dx = fx * sg * 0.7 + (ox / ol) * 0.6;
      let dz = fz * sg * 0.7 + (oz / ol) * 0.6;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl;
      dz /= dl;
      const m1 = vmass(v) + (v.kind === 'scooter' ? 70 : 0);
      const dv = Math.max(2.2, (((1 + KNOCK_E) * m1) / (m1 + SCOOTER_MASS)) * sp);
      if (this.knockSlot(s, dx * dv + vvx * 0.2, dz * dv + vvz * 0.2, dv)) hitCount++;
    });

    if (hitCount > 0 && isPlayer) {
      const drag = v.kind === 'scooter' ? Math.pow(0.9, hitCount) : Math.pow(0.96, hitCount);
      v.speed *= Math.max(0.55, drag);
      if (this._bumpCd <= 0) {
        this._bumpCd = 0.16;
        this.game.audio?.bump?.(Math.min(2.2, sp / 5), v.kind);
      }
    }
  }

  update(dt) {
    if (!this.slots.length) return;
    if (this._scrapeCd > 0) this._scrapeCd -= dt;
    if (this._bumpCd > 0) this._bumpCd -= dt;

    const g = this.game;
    const pl = g.player;
    const pv = pl?.vehicle;
    if (pv) this._checkVehicle(pv, true);

    const wp = pl?.worldPos?.() || pl?.pos;
    if (wp) {
      const others = [...(g.traffic?.vehicles?.() || []), ...(g.race?.vehicles?.() || [])];
      for (let i = 0; i < others.length; i++) {
        const v = others[i];
        if (!v || v === pv || v.knocked) continue;
        if (Math.abs(v.pos.x - wp.x) > 45 || Math.abs(v.pos.z - wp.z) > 45) continue;
        this._checkVehicle(v, false);
      }
    }

    // Domino chain knock: flying knocked scooters topple neighboring static scooters
    if (this.activeKnocks.size) {
      for (const rec of [...this.activeKnocks]) {
        const spd = Math.hypot(rec.vx, rec.vz);
        if (spd < 1.0) continue;
        this._near(rec.x, rec.z, 1.15, (s) => {
          if (s.state !== 'static') return;
          const dx = s.x - rec.x,
            dz = s.z - rec.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.95 && Math.abs(s.y - rec.y) < 1.5) {
            const nx = d > 1e-3 ? dx / d : rec.vx / spd;
            const nz = d > 1e-3 ? dz / d : rec.vz / spd;
            const dv = Math.max(2.0, spd * 0.72);
            this.knockSlot(s, nx * dv, nz * dv, dv);
          }
        });
      }
    }
  }
}
