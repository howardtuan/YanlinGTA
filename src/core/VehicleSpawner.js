import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicles.js';
import { mulberry32, makeLabel } from '../world/MapBuilder.js';
import { pointInPoly } from '../physics/Collision.js';
import { pitAt } from '../world/Terrain.js';

// masses for vehicles thrown by physics (kg, without rider) and the restitution of those hits
export const vmass = (v) => (v.kind === 'scooter' ? 110 : 1250);
export const KNOCK_E = 0.3;

export class VehicleSpawner {
  constructor(game) {
    this.game = game;
  }

  addVehicle(kind, x, z, h, rnd, opt) {
    const v = new Vehicle(kind, rnd || Math.random, opt);
    v.place(x, z, h);
    this.game.scene.add(v.mesh);
    this.game.vehicles.push(v);
    return v;
  }

  // move the hero's JET SL next to (x,z) unless he's riding it
  bringMyScooter(x, z) {
    const v = this.game.myScooter;
    if (!v || this.game.player.vehicle === v) return;
    if (Math.hypot(v.pos.x - x, v.pos.z - z) < 25) return;
    const w = this.game.world;
    for (let r = 3; r < 20; r += 1.5) {
      for (let a = 0; a < 6.28; a += 0.5) {
        const px = x + Math.cos(a) * r,
          pz = z + Math.sin(a) * r;
        if (w.isFree(px, pz, 1.2)) {
          const near = w.nearestRoadPoint(px, pz);
          v.place(px, pz, near ? near.dir : 0);
          v.mesh.visible = true;
          return;
        }
      }
    }
  }

  spawnScooterNear(x, z, highlight, jet = false) {
    const w = this.game.world;
    for (let r = 3; r < 20; r += 1.5) {
      for (let a = 0; a < 6.28; a += 0.5) {
        const px = x + Math.cos(a) * r,
          pz = z + Math.sin(a) * r;
        if (w.isFree(px, pz, 1.2)) {
          const near = w.nearestRoadPoint(px, pz);
          const v = this.addVehicle('scooter', px, pz, near ? near.dir : 0, null, { jet });
          if (jet) {
            const l = makeLabel('🛵 我的 JET SL', { height: 0.42, color: '#ff8cc6' });
            l.position.set(0, 1.95, 0);
            v.mesh.add(l);
            v.tag = l;
          }
          if (highlight) {
            const l = makeLabel('🛵 騎我！', { height: 0.5, color: '#ffd23f' });
            l.position.set(0, 1.9, 0);
            v.mesh.add(l);
            v.hint = l;
          }
          return v;
        }
      }
    }
  }

  spawnParked() {
    const game = this.game;
    const rnd = mulberry32(5150),
      w = game.world;
    // OSM lots: until 60 vehicles exist. 補建 (synthetic) lots come last in data.areas, so each 補建 round
    // (blk < 2000: round 1, >= 2000: round 2) gets its own 20
    const synParked = [0, 0],
      synRound = (a) => ((a.blk || 0) >= 2000 ? 1 : 0);
    for (const a of game.data.areas) {
      if (
        a.kind !== 'parking' ||
        (a.synthetic ? synParked[synRound(a)] >= 20 : game.vehicles.length > 60)
      )
        continue;
      let x0 = 1e9,
        z0 = 1e9,
        x1 = -1e9,
        z1 = -1e9;
      for (const [x, z] of a.pts) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        z0 = Math.min(z0, z);
        z1 = Math.max(z1, z);
      }
      const area = (x1 - x0) * (z1 - z0);
      const moto = (a.name || '').includes('機車');
      const n = Math.min(moto ? 8 : 3, Math.floor(area / (moto ? 25 : 90)));
      let placed = 0;
      for (let i = 0; i < n * 5 && placed < n; i++) {
        const x = x0 + rnd() * (x1 - x0),
          z = z0 + rnd() * (z1 - z0);
        if (
          !pointInPoly(x, z, a.pts) ||
          !w.isFree(x, z, moto ? 1 : 2.2) ||
          pitAt(x, z, 2.5) !== null
        )
          continue; // not down in the 學活 pit (src/world/zones/ZoneG.js)
        if (game.vehicles.some((v) => Math.hypot(v.pos.x - x, v.pos.z - z) < (moto ? 1.6 : 5)))
          continue;
        this.addVehicle(
          moto || rnd() < 0.5 ? 'scooter' : rnd() < 0.3 ? 'taxi' : 'car',
          x,
          z,
          moto ? Math.PI / 2 : rnd() * 6.28,
          rnd
        );
        placed++;
        if (a.synthetic) synParked[synRound(a)]++;
      }
    }
    // roadside scooters (Taiwan streets are full of them)
    let c = 0;
    for (const r of game.data.roads) {
      if (!r.drive || r.type === 'primary') continue;
      for (let i = 0; i < r.pts.length - 1 && c < 45; i++) {
        if (rnd() > 0.12) continue;
        const a = r.pts[i],
          b = r.pts[i + 1],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          l = Math.hypot(dx, dz);
        if (l < 8) continue;
        const t = rnd(),
          nx = -dz / l,
          nz = dx / l,
          side = rnd() < 0.5 ? 1 : -1;
        const x = a[0] + dx * t + nx * side * (r.w / 2 + 0.3),
          z = a[1] + dz * t + nz * side * (r.w / 2 + 0.3);
        if (!w.isFree(x, z, 0.9)) continue;
        this.addVehicle('scooter', x, z, Math.atan2(nx * side, nz * side), rnd);
        c++;
      }
    }
  }

  // a parked vehicle hit hard (src/entities/Vehicles.js KNOCK_MIN): thrown by physics until it rests. Momentum of the
  // hitter (with its rider) against the parked one decides how hard; returns the factor the hitter's speed keeps
  knockVehicle(o, by, nx, nz, impact) {
    const m1 = vmass(by) + 70,
      m2 = vmass(o),
      dv = (((1 + KNOCK_E) * m1) / (m1 + m2)) * impact;
    if (dv < 1) return false; // a scooter nudging a car: the usual push
    if (!this.throwVehicle(o, -nx * dv, -nz * dv, dv, null)) return false;
    if (by === this.game.player.vehicle) this.game.audio.bump(Math.min(3, dv / 3), by.kind);
    return Math.max(0, (m1 - KNOCK_E * m2) / (m1 + m2));
  }

  // a traffic vehicle hit hard: thrown too (with its own speed), then back on its lane when it lands on its
  // wheels next to it, otherwise a wreck for a while (src/entities/NPC.js Traffic)
  // impact: the closing speed of the two
  knockTraffic(o, by, nx, nz, impact) {
    const game = this.game;
    if (!game.physics.ready || o.knocked || o.ai?.dormant || impact <= 5) return;
    const m1 = vmass(by) + (by.kind === 'scooter' ? 70 : 0),
      m2 = vmass(o) + (o.rider ? 70 : 0),
      dv = (((1 + KNOCK_E) * m1) / (m1 + m2)) * impact;
    if (dv < 1.5) return;
    const [fx, fz] = o.forward();
    if (
      !this.throwVehicle(o, fx * o.speed - nx * dv, fz * o.speed - nz * dv, dv, (p, up) =>
        game.traffic.landed(o, p, up)
      )
    )
      return;
    // its rider goes on with the speed it had, thrown up and away from the hit
    game.traffic.throwRider(
      o,
      fx * o.speed - nx * dv * 0.6,
      2 + dv * 0.15,
      fz * o.speed - nz * dv * 0.6
    );
    if (by === game.player.vehicle) game.audio.bump(Math.min(3, dv / 3), by.kind);
  }

  // hand vehicle o to physics as a thrown body (velocity vx, vz; dv: how hard, for the tumble) until it rests;
  // then upright on its wheels on the level it landed on, a scooter lying on its side if it fell over.
  // done(pos, upY) after that (traffic); returns false without physics
  throwVehicle(o, vx, vz, dv, done) {
    const P = this.game.physics;
    if (!P.ready) return false;
    const sc = o.kind === 'scooter',
      l = Math.hypot(vx, vz) || 1,
      dx = vx / l,
      dz = vz / l;
    // tip over the far side: spin about the horizontal axis across the push (stronger for a tall, light scooter)
    const sp = dv * (sc ? 1.1 : 0.12);
    const shape = sc
      ? { shape: 'box', hx: 0.3, hy: 0.5, hz: 0.88 }
      : { shape: 'box', hx: 0.9, hy: 0.7, hz: 2.15, cy: 0.75 };
    P.dropMover(o); // its stand-in (parked next to a physics vehicle, traffic)
    const f = new THREE.Vector3();
    const heading = (q) => {
      f.set(0, 0, 1).applyQuaternion(q);
      return Math.atan2(f.x, f.z);
    };
    o.knocked = true;
    const rec = P.knock(
      o.mesh,
      shape,
      vmass(o),
      { x: vx, y: sc ? 1.2 : 0.3, z: vz },
      { x: dz * sp, y: (o.id % 2 ? 0.12 : -0.12) * dv, z: -dx * sp },
      (p, q) => {
        o.pos.x = p.x;
        o.pos.z = p.z;
        o.heading = o.moveAng = heading(q);
      },
      (p, q) => {
        f.set(0, 1, 0).applyQuaternion(q);
        const up = f.y;
        o.knocked = false;
        o.pos.set(p.x, 0, p.z);
        o.heading = o.moveAng = heading(q);
        o.speed = 0;
        if (sc) o.fallen = up < 0.6;
        o.hf = o.hb = p.y; // stays on the level it landed on (not the top one)
        o.resolveBody(this.game.world.collision);
        o.sync();
        done?.(p, up);
      },
      o
    );
    if (!rec) {
      o.knocked = false;
      return false;
    }
    if (sc && dv > 1.8)
      this.game.audio.physImpact?.('bike_scrape', Math.min(1, dv / 7), o.pos.x, o.pos.z);
    o.speed = 0;
    return true;
  }

  nearestVehicle(r) {
    const p = this.game.player.pos;
    let best = null,
      bd = r;
    for (const v of [...this.game.vehicles, ...this.game.traffic.vehicles()]) {
      const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z) - (v.kind === 'scooter' ? 0 : 1);
      if (Math.abs(v.mesh.position.y - p.y) > 2.5) continue; // on another floor (力行宿舍 2F and the forecourt under it)
      if (d < bd && !v.knocked && (!v.ai || Math.abs(v.speed) < 8)) {
        bd = d;
        best = v;
      }
    }
    const ps = this.game.parkedScooters?.nearestSpot(p.x, p.z, p.y, bd);
    if (ps) {
      const kind = ps.spot.kind || 'scooter';
      return {
        isParkedSpot: true,
        kind,
        spot: ps.spot,
        label: kind === 'car' ? '路邊汽車' : '路邊機車',
      };
    }
    return best;
  }

  // crash: the rider goes on over the handlebars, glancing off what was hit, tumbles and lies
  // there a moment; the scooter drops on its side where it stopped (ride it again with F)
  throwOff(v) {
    const game = this.game,
      pl = game.player,
      c = v.crash,
      s = c.speed,
      [fx, fz] = v.forward();
    game.audio.engineStop(v.kind);
    game.audio.setEngine(false, 0);
    game.audio.skid(0);
    game.audio.bump(2.5);
    pl.exit(game.scene, game.world.collision, game.interiors);
    const y = v.mesh.position.y;
    pl.pos.set(v.pos.x + fx * 0.3, y, v.pos.z + fz * 0.3);
    pl.heading = v.heading;
    v.speed = 0;
    v.fallen = true;
    v.sync();
    const d = fx * c.nx + fz * c.nz,
      k = s * 0.45;
    pl.throwOff((fx - 1.2 * d * c.nx) * k, (fz - 1.2 * d * c.nz) * k, 3 + s * 0.22, 2.2);
    game.hud.setSpeed(null);
    game.headlight.intensity = 0;
    game.hud.toast(`摔車了！😵（撞擊時速 ${Math.round(c.impact * 3.6)} km/h）`, 'bad', 2600);
  }
}
