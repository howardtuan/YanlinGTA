import { describe, it, expect, afterEach } from 'vitest';
import { Vehicle } from '../../src/entities/Vehicles.js';
import { VehicleSpawner } from '../../src/core/VehicleSpawner.js';
import { solveVehicleImpact } from '../../src/physics/ImpactPhysics.js';
import { ParkedScooters } from '../../src/core/ParkedScooters.js';

// Vehicle-vs-vehicle hits change your velocity by the momentum-exchange Δv along the contact normal n
// (n points from what you hit toward you): v_after = v_before + n * dv1. A ratio kf of the closing speed must
// never be applied to your whole speed, and being hit is not the same as hitting.
const car = (speed, moveAng = 0) => ({
  kind: 'car',
  speed,
  moveAng,
  bumpCooldown: 1,
  crash: null,
  body: {}, // has a physics chassis: the hit velocity is handed over as _hitVel
});
const hitVehicle = (me, o, { nx, nz, rel, impact = rel }) =>
  Vehicle.prototype._hitVehicle.call(
    me,
    o,
    null,
    impact,
    nx,
    nz,
    me.speed,
    null,
    Math.abs(me.speed),
    rel,
    {
      vx: Math.sin(me.moveAng) * me.speed,
      vz: Math.cos(me.moveAng) * me.speed,
      ang: me.moveAng,
    }
  );

const savedKnockTraffic = Vehicle.knockTraffic;
afterEach(() => {
  Vehicle.knockTraffic = savedKnockTraffic;
});
const trafficSolver = () => {
  Vehicle.knockTraffic = (o, by, nx, nz, rel) => {
    const sol = solveVehicleImpact({
      kind1: by.kind,
      kind2: o.kind,
      rider2: true,
      parked2: false,
      vRel: rel,
    });
    return { kf: sol.kf, dv1: sol.dv1, eject: false };
  };
};
const traffic = (speed) => ({ kind: 'car', speed, ai: {}, forward: () => [0, 1] });

describe('Vehicle._hitVehicle momentum', () => {
  it('rear-ending slower traffic takes only dv1 off your speed (not 56 % of it)', () => {
    trafficSolver();
    const me = car(20);
    // you drive +z at 20, traffic ahead at 14: n points back toward you (-z), closing speed 6
    hitVehicle(me, traffic(14), { nx: 0, nz: -1, rel: 6 });
    const { dv1 } = solveVehicleImpact({
      kind1: 'car',
      kind2: 'car',
      rider2: true,
      parked2: false,
      vRel: 6,
    });
    expect(me.speed).toBeCloseTo(20 - dv1, 5);
    expect(me.speed).toBeGreaterThan(15);
  });

  it('being rear-ended pushes you forward instead of stopping you dead', () => {
    trafficSolver();
    const me = car(10);
    // traffic behind at 15: n points from it toward you (+z), closing speed 5
    hitVehicle(me, traffic(15), { nx: 0, nz: 1, rel: 5 });
    expect(me.speed).toBeGreaterThan(10);
    expect(me._hitVel.z).toBeCloseTo(me.speed, 5);
  });

  it('a T-bone shoves you sideways by dv1 and keeps your forward speed', () => {
    trafficSolver();
    const me = car(10);
    hitVehicle(me, traffic(0), { nx: 1, nz: 0, rel: 8 });
    const { dv1 } = solveVehicleImpact({
      kind1: 'car',
      kind2: 'car',
      rider2: true,
      parked2: false,
      vRel: 8,
    });
    expect(me.speed).toBeCloseTo(10, 5);
    expect(me._hitVel.x).toBeCloseTo(dv1, 5);
  });

  it('a crash records your own speed, not the closing speed', () => {
    trafficSolver();
    const me = car(5);
    me.kind = 'scooter';
    hitVehicle(me, traffic(20), { nx: 0, nz: 1, rel: 15 });
    expect(me.crash).not.toBeNull();
    expect(me.crash.speed).toBe(5);
    expect(me.crash.pushed).toBe(true);
  });
});

describe('VehicleSpawner.knockTraffic below the throw threshold', () => {
  it('still trades momentum: traffic slows by dv2 along its heading, the hitter gets dv1', () => {
    const game = { physics: { ready: true }, player: { vehicle: null } };
    const o = { kind: 'car', speed: 10, ai: {}, forward: () => [0, 1] };
    const by = { kind: 'car' };
    // you hit it from behind at closing speed 4 (n from it toward you = -z)
    const res = VehicleSpawner.prototype.knockTraffic.call({ game }, o, by, 0, -1, 4);
    const sol = solveVehicleImpact({
      kind1: 'car',
      kind2: 'car',
      rider2: true,
      parked2: false,
      vRel: 4,
    });
    expect(res.thrown).toBe(false);
    expect(res.dv1).toBeCloseTo(sol.dv1, 9);
    expect(o.speed).toBeCloseTo(10 + sol.dv2, 9); // pushed forward by your hit
  });
});

describe('ParkedScooters.onChassisHit glancing scrape', () => {
  it('scraping a parked car at 10° keeps the speed along the curb instead of stopping dead', () => {
    const v = { kind: 'car', speed: 15, moveAng: 0, bumpCooldown: 1, crash: null, body: {} };
    const a = (10 * Math.PI) / 180;
    // driving +z at 15, the parked car's side faces -x: n = (-1, 0), approach = 15 sin 10° = 2.6
    const hit = {
      impact: 15 * Math.sin(a),
      sp: 15,
      nx: -1,
      nz: 0,
      vx: 15 * Math.sin(a),
      vz: 15 * Math.cos(a),
      ang: a,
    };
    const self = { game: { player: { ch: { weight: 70 } } }, knockSlot: () => true };
    ParkedScooters.prototype.onChassisHit.call(
      self,
      { kind: 'car', state: 'static' },
      v,
      hit,
      null
    );
    expect(v.speed).toBeGreaterThan(14);
    expect(v._hitVel.z).toBeCloseTo(15 * Math.cos(a), 5); // along the curb: untouched
    expect(v._hitVel.x).toBeLessThan(0.5); // into the car: taken, a little rebound
  });
});
