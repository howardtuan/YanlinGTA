// Unified roadside parked vehicles (scooters + cars):
// - Combines Furniture.js parked scooters (world.motoSpots), hand-built street bikes (interiors.scooters),
//   and hand-built street/lot parked cars (interiors.cars) into InstancedMeshes using the EXACT same
//   3D models as the drivable Vehicles (Scooters.js buildScooter + Vehicles.js buildCar) so mounting
//   never swaps the look.
// - Total draw calls across the entire map: 2 for all scooters (paint + trim) + 2 for all cars (paint + trim).
// - Provides lightweight spatial-grid foot collision & vehicle collision (blocking slow creep, solid bounce
//   against heavy parked cars, Rapier physics.knock + domino chain knocks for scooters & hard car hits,
//   baking final fallen/resting pose back into the InstancedMeshes with zero permanent draw-call growth).
// - Pressing F nearby claims the slot and materializes a real drivable Vehicle of the exact same kind & color.
import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { sameLevel, getParkedCarAssets, CRASH_THROW } from '../entities/Vehicles.js';
import { getParkedScooterAssets } from '../entities/Scooters.js';
import {
  vehicleSpec,
  solveVehicleImpact,
  solvePersonImpact,
  RESTITUTION,
  GRAVITY,
} from '../physics/ImpactPhysics.js';

const CELL = 10;
const CHUNK = 120;
const SCOOTER_MASS = 110;
const SCOOTER_HL = 0.78;
const SCOOTER_HW = 0.34;
const CAR_MASS = 1250;
const CAR_HL = 2.15;
const CAR_HW = 0.92;
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
const _U = new THREE.Vector3();
const _Rq = new THREE.Quaternion();
// height of the collision box centre in the body's own frame (ImpactPhysics VEHICLE_PHYS shape, Physics._shape)
const boxCy = (spec) => spec.shape.cy ?? spec.shape.hy;
// a parked scooter balances on its stand leaning ~8°; one tipped over by a neighbour leaning on it starts
// toppling at TIP_W rad/s with its base barely moving (TIP_V m/s), gravity doing the rest
const STAND_LEAN = 0.14,
  TIP_W = 0.9,
  TIP_V = 0.1;

function closestOnSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az,
    l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return [ax + dx * t, az + dz * t];
}

function closestOnCapsule(px, pz, sx, sz, yaw, hl, hw) {
  const fx = Math.sin(yaw),
    fz = Math.cos(yaw);
  const f = Math.max(0.05, hl - hw);
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

function capsuleSeg(x, z, yaw, hl, hw) {
  const f = Math.max(0.05, hl - hw);
  const fx = Math.sin(yaw) * f,
    fz = Math.cos(yaw) * f;
  return [x + fx, z + fz, x - fx, z - fz];
}

// Closest points [pa, pb] between two 2D line segments a=[ax,az,bx,bz], b=[cx,cz,dx,dz]
function segSeg(a, b) {
  let best = null,
    bd = Infinity;
  const tryP = (pa, pb) => {
    const d = (pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = [pa, pb];
    }
  };
  tryP([a[0], a[1]], closestOnSeg(a[0], a[1], ...b));
  tryP([a[2], a[3]], closestOnSeg(a[2], a[3], ...b));
  tryP(closestOnSeg(b[0], b[1], ...a), [b[0], b[1]]);
  tryP(closestOnSeg(b[2], b[3], ...a), [b[2], b[3]]);
  const dx = a[2] - a[0],
    dz = a[3] - a[1],
    ex = b[2] - b[0],
    ez = b[3] - b[1],
    cr = dx * ez - dz * ex;
  if (Math.abs(cr) > 1e-9) {
    const t = ((b[0] - a[0]) * ez - (b[1] - a[1]) * ex) / cr;
    const u = ((b[0] - a[0]) * dz - (b[1] - a[1]) * dx) / cr;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const p = [a[0] + dx * t, a[1] + dz * t];
      tryP(p, p);
    }
  }
  return best;
}

export class ParkedScooters {
  constructor(game) {
    this.game = game;
    this.slots = [];
    this.scooterSlots = [];
    this.carSlots = [];
    this.grid = new Map();
    this.activeKnocks = new Set();
    this.claimed = [];
    this._paintMats = new Map();
    this._scrapeCd = 0;
    this._bumpCd = 0;
    this.scooterAssets = null;
    this.carAssets = null;
    this.im = null;
    this.scooterPaintIm = null;
    this.scooterTrimIm = null;
    this.carPaintIm = null;
    this.carTrimIm = null;
    this.chunks = [];
    this._moverSlots = new Set();
    this._visX = 1e9;
    this._visZ = 1e9;
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

  _buildChunkedInstanced(list, assets) {
    if (!list.length || !assets?.paintGeo) return [null, null];
    const buckets = new Map();
    for (const s of list) {
      const cx = Math.floor(s.x / CHUNK),
        cz = Math.floor(s.z / CHUNK);
      const key = cx * 73856 + cz;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = []));
      b.push(s);
    }
    let firstPaint = null,
      firstTrim = null;
    for (const items of buckets.values()) {
      const paintIm = new THREE.InstancedMesh(assets.paintGeo, assets.paintMat, items.length);
      const trimIm = assets.trimGeo
        ? new THREE.InstancedMesh(assets.trimGeo, assets.trimMat, items.length)
        : null;
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      for (let i = 0; i < items.length; i++) {
        const s = items[i];
        s.imIdx = i;
        _E.set(0, s.yaw, s.tilt, 'YXZ');
        _Q.setFromEuler(_E);
        _P.set(s.x, s.y, s.z);
        _M.compose(_P, _Q, _S);
        paintIm.setMatrixAt(i, _M);
        paintIm.setColorAt(i, _C.set(s.color));
        if (trimIm) trimIm.setMatrixAt(i, _M);
        if (s.x < minX) minX = s.x;
        if (s.x > maxX) maxX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.y > maxY) maxY = s.y;
        if (s.z < minZ) minZ = s.z;
        if (s.z > maxZ) maxZ = s.z;
      }
      const midX = (minX + maxX) * 0.5;
      const midY = (minY + maxY) * 0.5 + 0.9;
      const midZ = (minZ + maxZ) * 0.5;
      const radius =
        Math.hypot((maxX - minX) * 0.5, (maxY - minY) * 0.5 + 1.2, (maxZ - minZ) * 0.5) + 4;
      const sphere = new THREE.Sphere(new THREE.Vector3(midX, midY, midZ), radius);
      paintIm.instanceMatrix.needsUpdate = true;
      if (paintIm.instanceColor) paintIm.instanceColor.needsUpdate = true;
      paintIm.castShadow = false;
      paintIm.receiveShadow = true;
      paintIm.frustumCulled = true;
      paintIm.boundingSphere = sphere;
      this.game.scene?.add(paintIm);
      if (trimIm) {
        trimIm.instanceMatrix.needsUpdate = true;
        trimIm.castShadow = false;
        trimIm.receiveShadow = true;
        trimIm.frustumCulled = true;
        trimIm.boundingSphere = sphere.clone();
        this.game.scene?.add(trimIm);
      }
      const chunk = { paintIm, trimIm, midX, midZ, radius };
      for (const s of items) s.chunk = chunk;
      this.chunks.push(chunk);
      if (!firstPaint) {
        firstPaint = paintIm;
        firstTrim = trimIm;
      }
    }
    return [firstPaint, firstTrim];
  }

  _build() {
    const g = this.game;
    const rawScooters = [];
    for (const m of g.world?.motoSpots || []) {
      rawScooters.push({
        x: m[0],
        z: m[1],
        yaw: m[2],
        color: m[3] || '#2a2a2c',
        tilt: m[4] ?? 0.07,
        y: m[5],
      });
    }
    for (const s of g.interiors?.scooters || []) {
      rawScooters.push({
        x: s[0],
        z: s[1],
        yaw: s[2],
        color: s[3] || '#2a2a30',
        tilt: (rawScooters.length % 2 ? 1 : -1) * 0.06,
        y: undefined,
      });
    }

    const rawCars = [];
    for (const c of g.interiors?.cars || []) {
      rawCars.push({
        x: c[0],
        z: c[1],
        yaw: c[2],
        color: c[3] || '#c9c9c4',
        tilt: 0,
        y: undefined,
      });
    }

    const vehicles = g.vehicles || [];
    const addSlots = (raw, kind) => {
      const isCar = kind === 'car';
      const vehDist = isCar ? 2.4 : 1.35;
      const dedupDist = isCar ? 2.0 : 0.55;
      const hl = isCar ? CAR_HL : SCOOTER_HL;
      const hw = isCar ? CAR_HW : SCOOTER_HW;
      const mass = isCar ? CAR_MASS : SCOOTER_MASS;
      const list = isCar ? this.carSlots : this.scooterSlots;

      for (const item of raw) {
        if (!Number.isFinite(item.x) || !Number.isFinite(item.z)) continue;
        let overlap = false;
        for (let i = 0; i < vehicles.length; i++) {
          const v = vehicles[i];
          if ((v.pos.x - item.x) ** 2 + (v.pos.z - item.z) ** 2 < vehDist * vehDist) {
            overlap = true;
            break;
          }
        }
        if (overlap) continue;
        this._near(item.x, item.z, Math.max(dedupDist + 0.1, 1.5), (other) => {
          const minD = other.kind === 'car' || isCar ? Math.max(dedupDist, 1.4) : dedupDist;
          if ((other.x - item.x) ** 2 + (other.z - item.z) ** 2 < minD * minD) overlap = true;
        });
        if (overlap) continue;
        const y = Number.isFinite(item.y) ? item.y : surfaceAt(item.x, item.z);
        const slot = {
          idx: this.slots.length,
          imIdx: list.length,
          kind,
          hl,
          hw,
          mass,
          x: item.x,
          y,
          z: item.z,
          yaw: item.yaw,
          color: item.color,
          tilt: item.tilt,
          state: 'static',
          physKey: null,
          cx: 0,
          cz: 0,
        };
        slot.physKey = {
          parkedSlot: slot,
          label: isCar ? '路邊汽車' : '路邊機車',
          onHit: (v, hit, onBump) => this.onChassisHit(slot, v, hit, onBump),
        };
        this.slots.push(slot);
        list.push(slot);
        this._indexAdd(slot);
      }
    };

    // Place cars first so nearby roadside scooters never overlap a parked car body
    addSlots(rawCars, 'car');
    addSlots(rawScooters, 'scooter');

    if (this.scooterSlots.length) {
      this.scooterAssets = getParkedScooterAssets();
      [this.scooterPaintIm, this.scooterTrimIm] = this._buildChunkedInstanced(
        this.scooterSlots,
        this.scooterAssets
      );
      this.im = this.scooterPaintIm;
    }
    if (this.carSlots.length) {
      this.carAssets = getParkedCarAssets();
      [this.carPaintIm, this.carTrimIm] = this._buildChunkedInstanced(
        this.carSlots,
        this.carAssets
      );
    }
    const p0 = g.player?.worldPos?.() || g.player?.pos || { x: 0, z: 0 };
    this._updateVisibility(p0.x, p0.z);
  }

  _updateVisibility(wx, wz) {
    if (!this.chunks.length) return;
    if ((wx - this._visX) ** 2 + (wz - this._visZ) ** 2 <= 64) return;
    this._visX = wx;
    this._visZ = wz;
    const maxD = this.game.quality === 'low' ? 115 : 260;
    for (let i = 0; i < this.chunks.length; i++) {
      const ch = this.chunks[i];
      const vis = Math.hypot(ch.midX - wx, ch.midZ - wz) - ch.radius < maxD;
      ch.paintIm.visible = vis;
      if (ch.trimIm) ch.trimIm.visible = vis;
    }
  }

  _pairFor(slot) {
    if (slot.chunk) return [slot.chunk.paintIm, slot.chunk.trimIm];
    return slot.kind === 'car'
      ? [this.carPaintIm, this.carTrimIm]
      : [this.scooterPaintIm, this.scooterTrimIm];
  }

  _hideSlot(slot) {
    const [paintIm, trimIm] = this._pairFor(slot);
    if (!paintIm) return;
    _P.set(0, -500, 0);
    _Q.identity();
    _M.compose(_P, _Q, _ZERO_S);
    paintIm.setMatrixAt(slot.imIdx, _M);
    paintIm.instanceMatrix.needsUpdate = true;
    if (trimIm) {
      trimIm.setMatrixAt(slot.imIdx, _M);
      trimIm.instanceMatrix.needsUpdate = true;
    }
  }

  // a knocked slot coming to rest with its body origin at p, rotation q: the slot is indexed (collision, foot
  // blocking, stand-in, F to ride) at the centre of its collision box, which for a scooter on its side is 0.44 m
  // beside the origin on the ground contact line; the mesh is still drawn from the origin (slot.ox / oz)
  _settleAt(slot, p, q) {
    _U.set(0, boxCy(vehicleSpec(slot.kind)), 0).applyQuaternion(q);
    slot.ox = -_U.x;
    slot.oz = -_U.z;
    this._indexMove(slot, p.x + _U.x, p.z + _U.z);
    this._writeSlotPose(slot, p.x, p.y, p.z, q);
  }

  _writeSlotPose(slot, x, y, z, quat) {
    const [paintIm, trimIm] = this._pairFor(slot);
    if (!paintIm) return;
    _P.set(x, y, z);
    _M.compose(_P, quat, _S);
    paintIm.setMatrixAt(slot.imIdx, _M);
    paintIm.instanceMatrix.needsUpdate = true;
    if (trimIm) {
      trimIm.setMatrixAt(slot.imIdx, _M);
      trimIm.instanceMatrix.needsUpdate = true;
    }
  }

  _debrisPaintMat(kind, color) {
    const key = `${kind}:${color}`;
    let m = this._paintMats.get(key);
    if (!m) {
      m =
        kind === 'car'
          ? new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 })
          : new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.15 });
      this._paintMats.set(key, m);
    }
    return m;
  }

  _makeDebrisMesh(slot) {
    const assets = slot.kind === 'car' ? this.carAssets : this.scooterAssets;
    if (!assets?.paintGeo) return null;
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(assets.paintGeo, this._debrisPaintMat(slot.kind, slot.color)));
    if (assets.trimGeo) grp.add(new THREE.Mesh(assets.trimGeo, assets.trimMat));
    return grp;
  }

  // Push a walking character out of nearby static & fallen parked scooters/cars (3 passes for dense rows)
  resolveFoot(pos, r = 0.35) {
    if (!this.slots.length) return false;
    let anyHit = false;
    for (let pass = 0; pass < 3; pass++) {
      let hit = false;
      this._near(pos.x, pos.z, 3.2, (s) => {
        if (s.state !== 'static' && s.state !== 'fallen') return;
        if (Math.abs(s.y - (pos.y || 0)) > 1.8) return;
        const hw = s.state === 'fallen' ? s.hw * 0.85 : s.hw;
        const rr = hw + r;
        const c = closestOnCapsule(pos.x, pos.z, s.x, s.z, s.yaw, s.hl, hw);
        if (c.dist < rr && c.dist > 1e-4) {
          pos.x = c.qx + (c.dx / c.dist) * rr;
          pos.z = c.qz + (c.dz / c.dist) * rr;
          hit = true;
          anyHit = true;
        }
      });
      if (!hit) break;
    }
    return anyHit;
  }

  // Feed nearby parked cars & scooters (static or fallen) into Rapier's kinematic movers list whenever the
  // player is driving OR dynamic knocked vehicles/ragdolls are moving, so falling bikes never clip through neighbors.
  appendMovers(list, x, z, pvOrY) {
    this._moverSlots.clear();
    if (!this.slots.length) return;
    const py = typeof pvOrY === 'number' ? pvOrY : (pvOrY?.mesh?.position?.y ?? 0);
    const nearCars = [];
    const nearScooters = [];
    this._near(x, z, 20, (s) => {
      if (s.state !== 'static' && s.state !== 'fallen') return;
      if (!sameLevel(s.y, py)) return;
      const d = Math.hypot(s.x - x, s.z - z);
      if (s.kind === 'car' && d < 20) nearCars.push([d, s]);
      else if (s.kind === 'scooter' && d < 16) nearScooters.push([d, s]);
    });
    nearCars.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < Math.min(8, nearCars.length); i++) {
      const s = nearCars[i][1];
      this._moverSlots.add(s);
      list.push({
        key: s.physKey,
        x: s.x,
        y: s.y,
        z: s.z,
        yaw: s.yaw,
        r: s.hw,
        hl: s.hl,
        cy: 0.8,
        hh: 0.75,
      });
    }
    if (nearScooters.length) {
      nearScooters.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < Math.min(24, nearScooters.length); i++) {
        const s = nearScooters[i][1];
        this._moverSlots.add(s);
        // upright: 0.68 m wide, 0.84 m tall; on its side (centred on its box, see _settleAt): the 0.88 m height
        // lies across the ground and the 0.24 m width stands up
        const flat = s.state === 'fallen';
        list.push({
          key: s.physKey,
          x: s.x,
          y: s.y,
          z: s.z,
          yaw: s.yaw,
          r: flat ? 0.44 : s.hw,
          hl: s.hl,
          cy: flat ? 0.13 : 0.45,
          hh: flat ? 0.12 : 0.42,
        });
      }
    }
  }

  // Closest interactive (static or fallen) parked scooter or car within maxR (press F to drive)
  nearestSpot(x, z, y, maxR = 3.2) {
    let best = null,
      bd = maxR;
    this._near(x, z, maxR + 2.2, (s) => {
      if (s.state !== 'static' && s.state !== 'fallen') return;
      if (Math.abs(s.y - y) > 2.5) return;
      const d = Math.hypot(s.x - x, s.z - z) - (s.kind === 'car' ? 1.0 : 0);
      if (d < bd) {
        bd = d;
        best = s;
      }
    });
    return best ? { spot: best, dist: bd } : null;
  }

  // Materialize a parked slot into a real drivable Vehicle of the exact same kind & color
  claimAsVehicle(spot) {
    if (!spot || (spot.state !== 'static' && spot.state !== 'fallen')) return null;
    const g = this.game;
    spot.state = 'taken';
    g.physics?.dropMover?.(spot.physKey);
    this._hideSlot(spot);
    // Recycle oldest distant claimed roadside vehicle if over cap
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
    const v = g.vehicleSpawner.addVehicle(
      spot.kind || 'scooter',
      spot.x,
      spot.z,
      spot.yaw,
      Math.random,
      { color: spot.color }
    );
    v.fallen = false;
    this.claimed.push(v);
    return v;
  }

  knockSlot(slot, vx, vz, dv, opt = null) {
    if (!slot || (slot.state !== 'static' && slot.state !== 'fallen')) return false;
    const g = this.game;
    const isCar = slot.kind === 'car';
    const wasFallen = slot.state === 'fallen';
    slot.state = 'flying';
    this._moverSlots.delete(slot);
    g.physics?.dropMover?.(slot.physKey);
    this._hideSlot(slot);
    if (!isCar && this._scrapeCd <= 0 && dv > 1.2) {
      this._scrapeCd = 0.12;
      g.audio?.physImpact?.('bike_scrape', Math.min(1, dv / 7), slot.x, slot.z);
    }
    const P = g.physics;
    const l = Math.hypot(vx, vz) || 1;
    const dx = vx / l,
      dz = vz / l;
    const mesh =
      P?.ready && this.activeKnocks.size < MAX_FLYING ? this._makeDebrisMesh(slot) : null;

    if (mesh) {
      // Scooters balance on two wheels: project push onto local +X (cos yaw, -sin yaw); negative roll tips top away from hit
      const spec = vehicleSpec(slot.kind);
      const sfx = Math.sin(slot.yaw),
        sfz = Math.cos(slot.yaw);
      const lat = dx * sfz - dz * sfx;
      const tipSign = Math.abs(lat) > 0.15 ? -Math.sign(lat) : slot.tilt >= 0 ? 1 : -1;
      // Nudge 4 cm clear along push vector; lean upright scooter past ~15° stand balance point so gravity tips it cleanly onto its side
      mesh.position.set(
        slot.x + (slot.ox || 0) + dx * 0.04,
        slot.y + 0.02,
        slot.z + (slot.oz || 0) + dz * 0.04
      );
      if (slot.quat) {
        mesh.quaternion.copy(slot.quat);
      } else {
        _E.set(0, slot.yaw, isCar ? 0 : tipSign * 0.3, 'YXZ');
        mesh.quaternion.setFromEuler(_E);
      }
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      g.scene?.add(mesh);

      const rollMag = opt?.rollSpeed ?? (isCar ? 0 : Math.max(3.6, Math.min(6.5, 3.0 + dv * 0.55)));
      const rollSp = isCar || wasFallen ? 0 : rollMag * tipSign; // already on its side: just slides
      const yawSpin = isCar
        ? (slot.idx % 2 ? 0.28 : -0.28) * Math.min(3.0, dv * 0.45)
        : (slot.idx % 2 ? 0.22 : -0.22) * Math.min(4.0, dv * 0.6);
      const shape = opt?.shape2 || spec.shape;
      const physOpt = opt?.physOpt2 || {
        linDamp: spec.linDamp,
        angDamp: spec.angDamp,
        friction: spec.muKinetic,
        restitution: spec.restitution,
      };
      const rec = { slot, mesh, x: slot.x, y: slot.y, z: slot.z, vx, vz, dv, body: null };
      this.activeKnocks.add(rec);
      const knocked = P.knock(
        mesh,
        shape,
        spec.mass,
        { x: vx, y: 0, z: vz },
        { x: rollSp ? sfx * rollSp : 0, y: yawSpin, z: rollSp ? sfz * rollSp : 0 },
        (p, _q, lv) => {
          rec.vx = lv ? lv.x : (p.x - rec.x) * 60;
          rec.vz = lv ? lv.z : (p.z - rec.z) * 60;
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
          slot.quat = q.clone();
          _F.set(0, 0, 1).applyQuaternion(q);
          slot.yaw = Math.atan2(_F.x, _F.z);
          this._settleAt(slot, p, q);
        },
        rec,
        physOpt
      );
      if (knocked) {
        rec.body = knocked.body || null;
        return true;
      }
      this.activeKnocks.delete(rec);
      g.scene?.remove(mesh);
    }

    // Fallback without physics or when flying debris pool is full: settle directly in InstancedMesh
    const shift = isCar ? Math.min(1.2, 0.25 + dv * 0.12) : Math.min(1.0, 0.25 + dv * 0.1);
    const nx = slot.x + dx * shift;
    const nz = slot.z + dz * shift;
    const ny = surfaceAt(nx, nz);
    const dirSign = slot.idx % 2 ? 1 : -1;
    _E.set(0, slot.yaw + dirSign * (isCar ? 0.14 : 0.28), isCar ? 0 : dirSign * 1.32, 'YXZ');
    _Q.setFromEuler(_E);
    slot.state = 'fallen';
    slot.y = ny + (isCar ? 0 : 0.14);
    slot.quat = _Q.clone();
    this._settleAt(slot, { x: nx, y: slot.y, z: nz }, _Q);
    return true;
  }

  // Called by VehPhysics.Chassis.frame() when the player's Rapier body hits a parked scooter/car mover.
  // Solves exact Newtonian impulse, static hold friction, velocity change, and rider ejection shock (ImpactPhysics.js).
  onChassisHit(slot, v, hit, onBump) {
    if (!slot || (slot.state !== 'static' && slot.state !== 'fallen')) return;
    const impact = hit.impact;
    const sp = hit.sp;
    const pushX = -hit.nx,
      pushZ = -hit.nz;

    if (impact > 1.8 && v.bumpCooldown <= 0) {
      onBump?.(impact);
      v.bumpCooldown = 0.35;
    }

    const sol = solveVehicleImpact({
      kind1: v.kind,
      rider1: true,
      rider1Mass: this.game.player?.ch?.weight,
      kind2: slot.kind,
      rider2: false,
      parked2: true,
      vRel: impact,
    });

    // velocity after the hit = velocity before it + n * dv1 (n = hit normal, toward you). A slot that holds
    // (handbrake / kickstand) is a rigid barrier: dv1 = (1 + e) * the approach, so a glancing scrape keeps the
    // speed along the curb and a head-on hit rebounds a little; one knocked away takes only its share J / m1
    if (sol.moves) this.knockSlot(slot, pushX * sol.dv2, pushZ * sol.dv2, sol.dv2, sol);
    const ang = Number.isFinite(hit.ang)
      ? hit.ang
      : Number.isFinite(v.moveAng)
        ? v.moveAng
        : Math.atan2(-hit.nx, -hit.nz) + (sp < 0 ? Math.PI : 0); // moving into the obstacle
    const vx = (hit.vx ?? Math.sin(ang) * sp) + hit.nx * sol.dv1,
      vz = (hit.vz ?? Math.cos(ang) * sp) + hit.nz * sol.dv1;
    v.speed = vx * Math.sin(ang) + vz * Math.cos(ang);
    if (v.body) v._hitVel = { x: vx, z: vz, ang };
    if ((sol.ejectRider1 || (!sol.moves && impact > CRASH_THROW)) && !v.crash)
      v.crash = {
        impact,
        speed: Math.abs(sp),
        nx: hit.nx,
        nz: hit.nz,
        dv1: sol.dv1,
        movedTarget: sol.moves,
      };
  }

  _checkVehicle(v, isPlayer, dt = 0.016) {
    const sp = Math.abs(v.speed || 0);
    if (!isPlayer && sp < 1.5) return;
    const vy = v.mesh?.position?.y ?? 0;
    const [fx, fz] = v.forward();
    const vvx = fx * v.speed,
      vvz = fz * v.speed;
    let pushedArcade = false;
    let maxImpact = 0;
    // Δv summed over the slots hit this frame: each gives -push * dv1 (push points from you into the slot)
    let dvx = 0,
      dvz = 0;

    // Build full front-to-back capsule(s): include swept midpoint on fast / low-FPS frames to prevent tunneling
    const stepDist = sp * dt;
    const probes = [capsuleSeg(v.pos.x, v.pos.z, v.heading, v.hl, v.hw)];
    if (stepDist > 0.35) {
      probes.push(
        capsuleSeg(v.pos.x - vvx * dt * 0.5, v.pos.z - vvz * dt * 0.5, v.heading, v.hl, v.hw)
      );
    }
    const searchR = v.hl + CAR_HL + Math.min(2.5, stepDist) + 1.0;

    this._near(v.pos.x, v.pos.z, searchR, (s) => {
      if (s.state !== 'static' && s.state !== 'fallen') return;
      // Player with Rapier Chassis already gets exact 60 Hz collisions via onChassisHit for slots in movers
      if (isPlayer && v.body && this._moverSlots.has(s)) return;
      if (!sameLevel(s.y, vy)) return;
      const sSeg = capsuleSeg(s.x, s.z, s.yaw, s.hl, s.hw);
      let bestDist = Infinity,
        bestPa = null,
        bestPb = null;
      for (let pi = 0; pi < probes.length; pi++) {
        const [pa, pb] = segSeg(probes[pi], sSeg);
        const d = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
        if (d < bestDist) {
          bestDist = d;
          bestPa = pa;
          bestPb = pb;
        }
      }
      const sumR = v.hw + s.hw + 0.08;
      if (bestDist >= sumR) return;

      const ox = bestPb[0] - bestPa[0],
        oz = bestPb[1] - bestPa[1],
        ol = Math.hypot(ox, oz);
      const pushX = ol > 1e-4 ? ox / ol : fx * (Math.sign(v.speed) || 1);
      const pushZ = ol > 1e-4 ? oz / ol : fz * (Math.sign(v.speed) || 1);
      // True normal closing speed into the parked vehicle (not raw scalar speed)
      const impact = ol > 1e-4 ? Math.max(0, vvx * pushX + vvz * pushZ) : sp;

      const sol = solveVehicleImpact({
        kind1: v.kind,
        rider1: true,
        rider1Mass: isPlayer ? this.game.player?.ch?.weight : v.rider?.weight,
        kind2: s.kind,
        rider2: false,
        parked2: true,
        vRel: impact,
      });

      if (!sol.moves) {
        // held slot = rigid barrier: AI traffic is stopped by it too, not only the player
        if (!v.body) {
          const push = sumR - bestDist;
          v.pos.x -= pushX * push;
          v.pos.z -= pushZ * push;
          pushedArcade = true;
        }
        if (impact > 0.4) {
          dvx -= pushX * sol.dv1;
          dvz -= pushZ * sol.dv1;
          maxImpact = Math.max(maxImpact, impact);
          if (isPlayer && (sol.ejectRider1 || impact > CRASH_THROW) && !v.crash)
            v.crash = { impact, speed: sp, nx: -pushX, nz: -pushZ, dv1: sol.dv1 };
        }
        return;
      }

      if (this.knockSlot(s, pushX * sol.dv2, pushZ * sol.dv2, sol.dv2, sol)) {
        dvx -= pushX * sol.dv1;
        dvz -= pushZ * sol.dv1;
        maxImpact = Math.max(maxImpact, impact);
        if (isPlayer && sol.ejectRider1 && !v.crash)
          v.crash = { impact, speed: sp, nx: -pushX, nz: -pushZ, dv1: sol.dv1 };
      }
    });

    if (pushedArcade) v.sync?.();

    if (dvx || dvz) {
      // velocity after the hits = velocity before + Σ n * dv1, written back as speed along the heading
      // (AI traffic never reverses off a parked vehicle: it just stops)
      const nvx = vvx + dvx,
        nvz = vvz + dvz,
        ns = nvx * fx + nvz * fz;
      v.speed = isPlayer ? ns : Math.max(0, ns);
      if (v.body?.body) {
        const lv = v.body.body.linvel();
        v.body.body.setLinvel({ x: nvx, y: lv.y, z: nvz }, true);
        v.body.wsp = v.speed;
      }
      if (isPlayer && this._bumpCd <= 0 && maxImpact > 1.8) {
        this._bumpCd = 0.25;
        this.game.audio?.bump?.(Math.min(2.2, Math.max(0.4, maxImpact / 4)), v.kind);
      }
      if (isPlayer && v.crash && v.kind === 'scooter') this.game._throwOff?.(v);
    }
  }

  // see update(): rec is a knocked slot flying in Rapier, spec1 its VEHICLE_PHYS
  _dominoFrom(rec, spec1) {
    const b = rec.body,
      q = b.rotation(),
      lv = b.linvel(),
      aw = b.angvel();
    _Rq.set(q.x, q.y, q.z, q.w);
    const cy1 = boxCy(spec1);
    // r: from the box centre (centre of mass) to its top, where a tipping scooter meets its neighbour
    _U.set(0, 1, 0).applyQuaternion(_Rq);
    const ux = _U.x,
      uy = _U.y,
      uz = _U.z;
    const cx = rec.x + ux * cy1,
      cz = rec.z + uz * cy1;
    _F.set(0, 0, 1).applyQuaternion(_Rq);
    const yaw1 = Math.atan2(_F.x, _F.z);
    const tilt = Math.hypot(ux, uz); // sin of the lean
    const hw1 = Math.max(rec.slot.hw, spec1.shape.hy * tilt);
    const seg1 = capsuleSeg(cx, cz, yaw1, rec.slot.hl, hw1);
    const rx = ux * cy1,
      ry = uy * cy1,
      rz = uz * cy1;
    const vcx = lv.x + (aw.y * rz - aw.z * ry),
      vcz = lv.z + (aw.x * ry - aw.y * rx);
    if (Math.hypot(vcx, vcz) < 0.3) return;
    const m1 = spec1.mass,
      I1 = spec1.iRoll > 0 ? spec1.iRoll : Infinity;
    this._near(cx, cz, rec.slot.hl + CAR_HL + 1, (s) => {
      if (s === rec.slot || (s.state !== 'static' && s.state !== 'fallen')) return;
      if (Math.abs(s.y - rec.y) > 1.5) return;
      const [pa, pb] = segSeg(seg1, capsuleSeg(s.x, s.z, s.yaw, s.hl, s.hw));
      let nx = pb[0] - pa[0],
        nz = pb[1] - pa[1];
      const d = Math.hypot(nx, nz);
      if (d >= hw1 + s.hw - 0.04) return; // not touching yet
      if (d > 1e-4) {
        nx /= d;
        nz /= d;
      } else {
        const l = Math.hypot(vcx, vcz);
        nx = vcx / l;
        nz = vcz / l;
      }
      const vRel = vcx * nx + vcz * nz; // contact point closing on the neighbour
      if (vRel <= 0) return;
      const spec2 = vehicleSpec(s.kind),
        m2 = spec2.mass;
      // |r x n|^2 for horizontal n: (ry nz)^2 + (rz nx - rx nz)^2 + (ry nx)^2
      const rxn2 = ry * ry + (rz * nx - rx * nz) ** 2;
      const mEff = 1 / (1 / m1 + rxn2 / I1);
      const physOpt2 = {
        linDamp: spec2.linDamp,
        angDamp: spec2.angDamp,
        friction: spec2.muKinetic,
        restitution: spec2.restitution,
      };
      let J = (1 + RESTITUTION) * ((mEff * m2) / (mEff + m2)) * vRel;
      const hold = spec2.muStatic * m2 * GRAVITY * Math.max(spec1.dtImpact, spec2.dtImpact);
      const net = Math.max(0, J - hold);
      let dv2 = net / m2,
        roll2 = s.kind === 'scooter' ? Math.min(6.5, (net * spec2.hCm) / spec2.iRoll) : 0;
      if (dv2 < spec2.minMoveV) {
        // too soft a blow to shove it off its stand. A scooter leaning on a parked scooter still tips it,
        // though: its weight keeps pressing (torque m1 g hCm1 sin lean about its tyres) while the neighbour
        // only balances on its stand (m2 g hCm2 sin STAND_LEAN). It starts toppling slowly (TIP_W), the
        // energy coming from the falling one, which gets the reaction J = I2 TIP_W / (contact height).
        if (s.kind !== 'scooter' || s.state !== 'static' || !(spec1.iRoll > 0)) return;
        if (m1 * spec1.hCm * tilt <= m2 * spec2.hCm * Math.sin(STAND_LEAN)) return;
        const hc = Math.max(0.3, 2 * cy1 * uy);
        J = (spec2.iRoll * TIP_W) / hc;
        dv2 = TIP_V;
        roll2 = TIP_W;
      }
      const opt = { rollSpeed: roll2, shape2: spec2.shape, physOpt2 };
      if (!this.knockSlot(s, nx * dv2, nz * dv2, dv2, opt)) return;
      // equal and opposite impulse -n * J at r: linear J / m1, angular r x (-n J) / I1
      const lv2 = b.linvel(),
        aw2 = b.angvel(),
        k = J / I1;
      b.setLinvel({ x: lv2.x - (nx * J) / m1, y: lv2.y, z: lv2.z - (nz * J) / m1 }, true);
      if (Number.isFinite(k) && k > 0)
        b.setAngvel(
          { x: aw2.x - ry * nz * k, y: aw2.y + (rx * nz - rz * nx) * k, z: aw2.z + ry * nx * k },
          true
        );
      rec.vx -= (nx * J) / m1;
      rec.vz -= (nz * J) / m1;
    });
  }

  update(dt) {
    if (!this.slots.length) return;
    if (this._scrapeCd > 0) this._scrapeCd -= dt;
    if (this._bumpCd > 0) this._bumpCd -= dt;

    const g = this.game;
    const pl = g.player;
    const pv = pl?.vehicle;
    if (pv) this._checkVehicle(pv, true, dt);

    const wp = pl?.worldPos?.() || pl?.pos;
    if (wp) {
      this._updateVisibility(wp.x, wp.z);
      const others = [...(g.traffic?.vehicles?.() || []), ...(g.race?.vehicles?.() || [])];
      for (let i = 0; i < others.length; i++) {
        const v = others[i];
        if (!v || v === pv || v.knocked) continue;
        if (Math.abs(v.pos.x - wp.x) > 45 || Math.abs(v.pos.z - wp.z) > 45) continue;
        this._checkVehicle(v, false, dt);
      }
      // Keep walking/idle pedestrians out of parked roadside scooters & cars (no walking through parked bikes)
      const peds = g.peds?.active?.();
      if (peds) {
        for (let i = 0; i < peds.length; i++) {
          const p = peds[i];
          if (p.state === 'fly' || p.state === 'down' || p.rag) continue;
          if (Math.abs(p.pos.x - wp.x) > 65 || Math.abs(p.pos.z - wp.z) > 65) continue;
          const prevY = p.pos.y;
          p.pos.y = p.y;
          const pushed = this.resolveFoot(p.pos, 0.35);
          p.pos.y = prevY;
          if (pushed && p.ch?.root) p.ch.root.position.set(p.pos.x, p.y, p.pos.z);
        }
      }
    }

    // Domino chain knock + knocked vehicles hitting nearby pedestrians (strict Newton's 2nd & 3rd Laws)
    if (this.activeKnocks.size) {
      const peds = g.peds?.active?.() || [];
      for (const rec of [...this.activeKnocks]) {
        const spec1 = vehicleSpec(rec.slot.kind);
        let vcx = rec.vx,
          vcz = rec.vz;
        if (rec.body?.angvel) {
          const aw = rec.body.angvel();
          // omega x (0, hCm, 0) = (-aw.z * hCm, 0, aw.x * hCm)
          vcx += -aw.z * spec1.hCm;
          vcz += aw.x * spec1.hCm;
        }
        const spd = Math.hypot(vcx, vcz);
        if (spd < 0.7) continue;

        // 1. Knocked scooter/car hitting nearby pedestrians
        const pedHitR = rec.slot.kind === 'car' ? 2.1 : 1.05;
        for (let i = 0; i < peds.length; i++) {
          const p = peds[i];
          if (p.state === 'fly' || p.state === 'down' || p.rag) continue;
          if (Math.abs(p.y - rec.y) > 2.0) continue;
          const pdx = p.pos.x - rec.x,
            pdz = p.pos.z - rec.z;
          const d = Math.hypot(pdx, pdz);
          if (d < pedHitR) {
            const pnx = d > 1e-3 ? pdx / d : vcx / spd;
            const pnz = d > 1e-3 ? pdz / d : vcz / spd;
            const vRel = vcx * pnx + vcz * pnz;
            if (vRel <= 0) continue;
            const pSol = solvePersonImpact({
              vehicleKind: rec.slot.kind,
              riderOnVehicle: false,
              personMass: p.ch?.weight,
              personHeight: p.ch?.height,
              vRel,
            });
            if (
              pSol.knockDown &&
              g.peds.knock(p, pnx, pnz, vRel, { dv: pSol.dvPerson, vy: pSol.vyPerson })
            ) {
              g.audio?.hitPed?.();
              if (rec.body) {
                const lv = rec.body.linvel();
                rec.body.setLinvel(
                  { x: lv.x - pnx * pSol.dvVehicle, y: lv.y, z: lv.z - pnz * pSol.dvVehicle },
                  true
                );
              }
              rec.vx -= pnx * pSol.dvVehicle;
              rec.vz -= pnz * pSol.dvVehicle;
            }
          }
        }

        // 2. Domino knock on neighbouring parked or fallen vehicles. Contact is geometric: the knocked body's
        //    footprint (its collision box centre, which moves toward the neighbour as a scooter tips, and its
        //    width growing as it lies down) must reach into the neighbour's capsule, so a chain runs at the
        //    speed things really fall, not one scooter per frame. The impulse is a rigid-body one at the
        //    contact point (r from the centre of mass): J = (1 + e) * mu_eff * vRel with
        //    1/m_eff = 1/m1 + |r x n|^2 / I1, and the body gets back -J both in its linear (J/m1) and angular
        //    (r x -nJ / I1) velocity (Newton's 3rd law), so momentum and energy are never created.
        if (rec.body?.rotation) this._dominoFrom(rec, spec1);
      }
    }
  }
}
