import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicles.js';
import { mulberry32, makeLabel } from '../world/MapBuilder.js';
import { pointInPoly } from '../physics/Collision.js';
import { pitAt } from '../world/Terrain.js';

// masses for vehicles thrown by physics (kg, without rider) and inelastic collision restitution
export const vmass = (v) => (v.kind === 'scooter' ? 110 : 1250);
export const KNOCK_E = 0.1;

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

  // a parked vehicle hit hard (src/entities/Vehicles.js KNOCK_MIN): pushed/toppled by physics until it rests.
  // Respects real vehicle mass & parked tire/stand friction: scooters cannot launch 1.25-ton cars, and
  // scooter-vs-scooter impacts slow/crash the hitter symmetrically rather than launching the target into orbit.
  knockVehicle(o, by, nx, nz, impact) {
    const sc = o.kind === 'scooter';
    const m1 = vmass(by) + (by.kind === 'scooter' ? 70 : 0),
      m2 = vmass(o);
    // A 180 kg scooter cannot launch a 1,250 kg parked car; even a car needs a hard ram to shove a parked car
    if (!sc && (m1 < m2 * 0.4 || impact < 6.0)) return false;
    const grip = sc ? 0.52 : 0.48;
    const cap = sc ? (by.kind === 'scooter' ? 6.2 : 7.5) : 5.0;
    const dv = Math.min(cap, (((1 + KNOCK_E) * m1) / (m1 + m2)) * impact * grip);
    if (dv < (sc ? 0.9 : 1.5)) return false;
    if (!this.throwVehicle(o, -nx * dv, -nz * dv, dv, null)) return false;
    if (by === this.game.player.vehicle) this.game.audio.bump(Math.min(3, impact / 4), by.kind);
    if (by.kind === 'scooter' && sc) {
      // Hitting another 110 kg scooter takes a big bite out of momentum (< 0.3 so head-on > CRASH_THROW crashes you too)
      return Math.max(0.12, ((m1 - 0.35 * m2) / (m1 + m2)) * 0.55);
    }
    if (!sc) return Math.max(0.12, ((m1 - 0.15 * m2) / (m1 + m2)) * 0.72);
    return Math.max(0.15, ((m1 - 0.15 * m2) / (m1 + m2)) * 0.92);
  }

  // a traffic vehicle hit hard: pushed/toppled with realistic mass ratio, then back on its lane when it lands
  // on its wheels next to it, otherwise a wreck for a while (src/entities/NPC.js Traffic).
  // Returns hitter momentum retention factor kf, or false if the target was too heavy / hit too softly.
  knockTraffic(o, by, nx, nz, impact) {
    const game = this.game;
    const sc = o.kind === 'scooter';
    if (!game.physics.ready || o.knocked || o.ai?.dormant) return false;
    const m1 = vmass(by) + (by.kind === 'scooter' ? 70 : 0),
      m2 = vmass(o) + (o.rider ? 70 : 0);
    if (!sc && (m1 < m2 * 0.4 || impact < 8.5)) return false;
    if (sc && impact <= 5) return false;
    const grip = sc ? 0.55 : 0.48;
    const cap = sc ? (by.kind === 'scooter' ? 6.2 : 7.5) : 5.2;
    const dv = Math.min(cap, (((1 + KNOCK_E) * m1) / (m1 + m2)) * impact * grip);
    if (dv < 1.5) return false;
    const [fx, fz] = o.forward();
    if (
      !this.throwVehicle(
        o,
        fx * o.speed * 0.5 - nx * dv,
        fz * o.speed * 0.5 - nz * dv,
        dv,
        (p, up) => game.traffic.landed(o, p, up)
      )
    )
      return false;
    // its rider goes on with the speed it had, thrown off from the hit
    game.traffic.throwRider(
      o,
      fx * o.speed * 0.6 - nx * dv * 0.55,
      1.6 + Math.min(1.6, dv * 0.15),
      fz * o.speed * 0.6 - nz * dv * 0.55
    );
    if (by === game.player.vehicle) game.audio.bump(Math.min(3, impact / 4), by.kind);
    if (by.kind === 'scooter' && sc) return Math.max(0.12, ((m1 - 0.35 * m2) / (m1 + m2)) * 0.55);
    if (!sc) return Math.max(0.12, ((m1 - 0.15 * m2) / (m1 + m2)) * 0.68);
    return Math.max(0.15, ((m1 - 0.15 * m2) / (m1 + m2)) * 0.92);
  }

  // hand vehicle o to physics as a pushed/toppled body (velocity vx, vz; dv: how hard) until it rests;
  // heavy ground damping keeps 110 kg scooters and 1.25-ton cars sliding realistically instead of flying.
  throwVehicle(o, vx, vz, dv, done) {
    const P = this.game.physics;
    if (!P.ready) return false;
    const sc = o.kind === 'scooter',
      l = Math.hypot(vx, vz) || 1,
      dx = vx / l,
      dz = vz / l;
    // Scooters roll onto their side moderately; cars stay flat on all 4 wheels and only yaw-skid
    const sp = sc ? Math.min(4.2, dv * 0.65) : 0;
    const yawSpin = sc
      ? (o.id % 2 ? 0.14 : -0.14) * Math.min(4, dv)
      : (o.id % 2 ? 0.28 : -0.28) * Math.min(3.5, dv * 0.55);
    const vy = sc ? Math.min(0.4, Math.max(0, (dv - 2.5) * 0.07)) : 0;
    const shape = sc
      ? { shape: 'box', hx: 0.3, hy: 0.5, hz: 0.88 }
      : { shape: 'box', hx: 0.9, hy: 0.7, hz: 2.15, cy: 0.75 };
    const physOpt = sc
      ? { linDamp: 1.35, angDamp: 1.6, friction: 1.05, restitution: 0.06 }
      : { linDamp: 2.6, angDamp: 3.0, friction: 1.15, restitution: 0.04 };
    P.dropMover(o); // its stand-in (parked next to a physics vehicle, traffic)
    // Nudge 4 cm clear along push vector so spawning the dynamic body never triggers a Rapier overlap cannonball
    o.mesh.position.x += dx * 0.04;
    o.mesh.position.z += dz * 0.04;
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
      { x: vx, y: vy, z: vz },
      { x: sp ? dz * sp : 0, y: yawSpin, z: sp ? -dx * sp : 0 },
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
      o,
      physOpt
    );
    if (!rec) {
      o.knocked = false;
      return false;
    }
    if (sc && dv > 1.5)
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
