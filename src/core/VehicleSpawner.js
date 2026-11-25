import * as THREE from 'three';
import { Vehicle } from '../entities/Vehicles.js';
import { mulberry32, makeLabel } from '../world/MapBuilder.js';
import { pointInPoly } from '../physics/Collision.js';
import { pitAt } from '../world/Terrain.js';
import {
  RESTITUTION,
  vehicleSpec,
  solveVehicleImpact,
  solvePersonImpact,
  solveRiderEjection,
} from '../physics/ImpactPhysics.js';

// masses for vehicles thrown by physics (kg, without rider) and inelastic collision restitution
export const vmass = (v) => vehicleSpec(v.kind).mass;
export const KNOCK_E = RESTITUTION;

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

  // Parked vehicle collision solved by Newtonian impulse-momentum (src/physics/ImpactPhysics.js).
  // Target moves only if impulse exceeds static hold friction (handbrake / kickstand).
  knockVehicle(o, by, nx, nz, impact) {
    const sol = solveVehicleImpact({
      kind1: by.kind,
      rider1: true,
      rider1Mass:
        by === this.game.player?.vehicle ? this.game.player?.ch?.weight : by.rider?.weight,
      kind2: o.kind,
      rider2: false,
      parked2: true,
      vRel: impact,
    });
    if (!sol.moves) return false;
    if (!this.throwVehicle(o, -nx * sol.dv2, -nz * sol.dv2, sol.dv2, null, sol)) return false;
    if (by === this.game.player.vehicle) this.game.audio.bump(Math.min(3, impact / 4), by.kind);
    return { kf: sol.kf, eject: sol.ejectRider1 };
  }

  // Traffic vehicle collision solved by Newtonian impulse-momentum (src/physics/ImpactPhysics.js).
  // Both hitter and target receive exact equal-and-opposite impulse J = (1+e)*mu*vRel.
  knockTraffic(o, by, nx, nz, impact) {
    const game = this.game;
    const sc = o.kind === 'scooter';
    if (!game.physics.ready || o.knocked || o.ai?.dormant) return false;
    const sol = solveVehicleImpact({
      kind1: by.kind,
      rider1: true,
      rider1Mass: by === game.player?.vehicle ? game.player?.ch?.weight : by.rider?.weight,
      kind2: o.kind,
      rider2: !!o.rider || !sc,
      rider2Mass: o.rider?.weight,
      parked2: false,
      vRel: impact,
    });
    // Require meaningful shock before knocking a moving traffic vehicle out of its lane
    const minDv2 = sc ? 2.2 : 3.2;
    if (sol.dv2 < minDv2) return false;
    const [fx, fz] = o.forward();
    // Newton's 1st & 3rd Laws: preserve target's full pre-impact velocity and add exact normal impulse -n * dv2
    const tvx = fx * o.speed - nx * sol.dv2;
    const tvz = fz * o.speed - nz * sol.dv2;
    if (!this.throwVehicle(o, tvx, tvz, sol.dv2, (p, up) => game.traffic.landed(o, p, up), sol))
      return false;
    // Traffic rider ejected by exact handlebar/seat pivot physics using rider's own weight
    const rEj = solveRiderEjection({
      speed: o.speed,
      impact: sol.dv2,
      nx: -nx,
      nz: -nz,
      fx,
      fz,
      dv1: sol.dv2,
      pushed: o.speed < sol.dv2 * 0.5,
      riderMass: o.rider?.weight,
    });
    game.traffic.throwRider(o, rEj.vx, rEj.vy, rEj.vz);
    if (by === game.player.vehicle) game.audio.bump(Math.min(3, impact / 4), by.kind);
    return { kf: sol.kf, eject: sol.ejectRider1 };
  }

  // Hand vehicle o to Rapier with real Coulomb sliding friction & rigid-body roll torque from ImpactPhysics.
  throwVehicle(o, vx, vz, dv, done, sol = null) {
    const P = this.game.physics;
    if (!P.ready) return false;
    const sc = o.kind === 'scooter',
      spec = vehicleSpec(o.kind),
      l = Math.hypot(vx, vz) || 1,
      dx = vx / l,
      dz = vz / l;
    const sfx = Math.sin(o.heading || 0),
      sfz = Math.cos(o.heading || 0);
    // Project push direction onto scooter's local +X axis (cos h, -sin h); negative roll tilts top toward +X (away from hit)
    const lat = dx * sfz - dz * sfx;
    const tipSign = Math.abs(lat) > 0.15 ? -Math.sign(lat) : o.id % 2 ? 1 : -1;
    const rollMag = sol ? sol.rollSpeed : sc ? Math.max(3.6, Math.min(6.5, 3.0 + dv * 0.55)) : 0;
    const rollSp = sc ? rollMag * tipSign : 0;
    const yawSpin = sc
      ? (o.id % 2 ? 0.22 : -0.22) * Math.min(4.0, dv * 0.6)
      : (o.id % 2 ? 0.28 : -0.28) * Math.min(3.0, dv * 0.45);
    const physOpt = sol?.physOpt2 || {
      linDamp: spec.linDamp,
      angDamp: spec.angDamp,
      friction: spec.muKinetic,
      restitution: spec.restitution,
    };
    const shape = sol?.shape2 || spec.shape;
    P.dropMover(o); // its stand-in (parked next to a physics vehicle, traffic)
    // Nudge 4 cm clear along push vector and lean upright scooter past its ~15° stand balance point so gravity tips it flat
    o.mesh.position.x += dx * 0.04;
    o.mesh.position.z += dz * 0.04;
    if (sc && !o.fallen) {
      o.mesh.rotation.order = 'YXZ';
      o.mesh.rotation.z = tipSign * 0.3;
      o.mesh.updateMatrix();
    }
    const f = new THREE.Vector3();
    const heading = (q) => {
      f.set(0, 0, 1).applyQuaternion(q);
      return Math.atan2(f.x, f.z);
    };
    o.knocked = true;
    let rec = null;
    rec = P.knock(
      o.mesh,
      shape,
      spec.mass,
      { x: vx, y: 0, z: vz },
      { x: rollSp ? sfx * rollSp : 0, y: yawSpin, z: rollSp ? sfz * rollSp : 0 },
      (p, q, lv) => {
        o.pos.x = p.x;
        o.pos.z = p.z;
        o.heading = o.moveAng = heading(q);
        // Sliding/tumbling vehicle can also knock down nearby pedestrians with Newtonian impulse
        const peds = this.game.peds?.active?.();
        if (!peds || !lv) return;
        const spd = Math.hypot(lv.x, lv.z);
        if (spd < 1.5) return;
        const hitR = sc ? 1.0 : 2.1;
        for (let i = 0; i < peds.length; i++) {
          const pd = peds[i];
          if (pd.state === 'fly' || pd.state === 'down' || pd.rag) continue;
          if (Math.abs(pd.y - p.y) > 2.0) continue;
          const pdx = pd.pos.x - p.x,
            pdz = pd.pos.z - p.z;
          const d = Math.hypot(pdx, pdz);
          if (d < hitR) {
            const pnx = d > 1e-3 ? pdx / d : lv.x / spd;
            const pnz = d > 1e-3 ? pdz / d : lv.z / spd;
            const vRel = lv.x * pnx + lv.z * pnz;
            if (vRel <= 0) continue;
            const pSol = solvePersonImpact({
              vehicleKind: o.kind,
              riderOnVehicle: false,
              personMass: pd.ch?.weight,
              personHeight: pd.ch?.height,
              vRel,
            });
            if (
              pSol.knockDown &&
              this.game.peds.knock(pd, pnx, pnz, vRel, { dv: pSol.dvPerson, vy: pSol.vyPerson })
            ) {
              this.game.audio?.hitPed?.();
              if (rec?.body) {
                const cur = rec.body.linvel();
                rec.body.setLinvel(
                  { x: cur.x - pnx * pSol.dvVehicle, y: cur.y, z: cur.z - pnz * pSol.dvVehicle },
                  true
                );
              }
            }
          }
        }
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

  // crash: the rider goes over the handlebars (or forward when rear-ended) and tumbles; the scooter
  // also slides & tips over with residual momentum via Rapier physics instead of freezing dead in place
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
    const launchDirX = c.pushed ? c.nx : fx;
    const launchDirZ = c.pushed ? c.nz : fz;
    // Start slightly ahead and at handlebar height so the ragdoll clears the front shield cleanly when flying forward
    pl.pos.set(v.pos.x + launchDirX * 0.55, y + 0.55, v.pos.z + launchDirZ * 0.55);
    pl.heading = v.heading;
    v.speed = 0;

    // Rider launch velocity derived strictly from Newton's 1st Law (inertia), grip break impulse, and handlebar vault geometry
    const ej = solveRiderEjection({
      speed: s,
      impact: c.impact,
      nx: c.nx,
      nz: c.nz,
      fx,
      fz,
      dv1: c.dv1,
      pushed: !!c.pushed,
      riderMass: pl.ch?.weight,
    });
    const rvx = ej.vx,
      rvz = ej.vz,
      rvy = ej.vy;

    // Player's own scooter post-impact velocity strictly from Newtonian impulse:
    // tangential velocity is largely preserved; normal velocity changes by +c.nx * dv1 (rebound = e*v_n on rigid hit)
    let bvx, bvz;
    if (c.pushed) {
      const bk = c.dv1 ?? c.impact * 0.5;
      bvx = c.nx * bk;
      bvz = c.nz * bk;
    } else {
      const vn = fx * s * c.nx + fz * s * c.nz; // negative when approaching obstacle
      const tangX = fx * s - vn * c.nx;
      const tangZ = fz * s - vn * c.nz;
      const dv1 = c.dv1 ?? (1 + KNOCK_E) * Math.abs(vn);
      const vnPost = vn + dv1; // >0 slight inelastic rebound against rigid wall/car, <0 slower forward follow-through after moving another scooter
      bvx = tangX * 0.8 + c.nx * vnPost;
      bvz = tangZ * 0.8 + c.nz * vnPost;
    }
    const bspd = Math.hypot(bvx, bvz);
    const slid = this.throwVehicle(v, bvx, bvz, Math.max(0.8, bspd), () => {
      v.fallen = true;
      v.sync();
    });
    if (!slid) {
      v.fallen = true;
      v.sync();
    }

    pl.throwOff(rvx, rvz, rvy, 2.2);
    game.hud.setSpeed(null);
    game.headlight.intensity = 0;
    game.hud.toast(
      c.pushed
        ? `被撞飛了！😵（撞擊時速 ${Math.round(c.impact * 3.6)} km/h）`
        : `摔車了！😵（撞擊時速 ${Math.round(c.impact * 3.6)} km/h）`,
      'bad',
      2600
    );
  }
}
