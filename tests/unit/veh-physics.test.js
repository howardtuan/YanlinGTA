import { describe, it, expect, vi } from 'vitest';
import { Chassis } from '../../src/physics/VehPhysics.js';
import { Peds } from '../../src/entities/NPC.js';
import { knockPeopleWith } from '../../src/physics/DebrisPeople.js';

// Chassis._setSpeed writes the arcade speed back onto the Rapier body after a hit rule (e.g. a parked
// scooter knocked away keeps kf of your speed). The contact solver treats the parked scooter stand-in as a
// kinematic (infinite-mass) body, so the body's velocity after the step can be almost all sideways or even
// bounced backwards while the hit rule restores most of the forward speed. Scaling that velocity by
// s / current-speed then blows a small sideways leftover up into a pinball launch.
const fakeSpeedChassis = (vx, vz, moveAng = 0) => {
  let lv = { x: vx, y: 0, z: vz };
  return {
    v: { moveAng, speed: 0 },
    wsp: 0,
    body: { linvel: () => lv, setLinvel: (nv) => (lv = { ...nv }) },
    get lv() {
      return lv;
    },
  };
};
const setSpeed = (c, s) => Chassis.prototype._setSpeed.call(c, s);

describe('Chassis._setSpeed', () => {
  it('a car deflected sideways by a parked scooter is not launched sideways', () => {
    // driving +z at 12 m/s; the kinematic stand-in ate the forward part: 3 m/s sideways, 0.5 forward left
    const c = fakeSpeedChassis(3, 0.5);
    setSpeed(c, 10.8); // hit rule: car keeps ~90 % of 12 m/s (momentum vs a 120 kg scooter)
    expect(Math.hypot(c.lv.x, c.lv.z)).toBeLessThan(12.5);
    expect(Math.abs(c.lv.x)).toBeLessThanOrEqual(3 + 1e-9);
    expect(c.lv.z).toBeCloseTo(10.8, 5);
  });

  it('a car bounced backwards by the stand-in gets its forward speed back, not a reversed launch', () => {
    const c = fakeSpeedChassis(0.2, -1);
    setSpeed(c, 10.8);
    expect(c.lv.z).toBeCloseTo(10.8, 5);
    expect(Math.hypot(c.lv.x, c.lv.z)).toBeLessThan(11);
  });

  it('slowing down still scales the whole velocity (drift kept in proportion)', () => {
    const c = fakeSpeedChassis(2, 10);
    setSpeed(c, 5);
    expect(c.lv.x / c.lv.z).toBeCloseTo(0.2, 9); // same drift direction
    expect(Math.hypot(c.lv.x, c.lv.z)).toBeCloseTo(5, 5); // arcade speed within slip = |velocity|
  });

  it('stopping zeroes the horizontal velocity', () => {
    const c = fakeSpeedChassis(3, 8);
    setSpeed(c, 0);
    expect(c.lv.x).toBeCloseTo(0, 9);
    expect(c.lv.z).toBeCloseTo(0, 9);
  });
});

// Chassis._stick: over a sharp crest of the 10 m terrain grid the body keeps the upward speed of the slope it
// came up. Close above the ground the part beyond what the ground ahead rises is taken off (STICK_A, 20 m/s²),
// so an ordinary crest does not throw the scooter into the air. No terrain loaded here: the ground is flat at y 0.
const fakeStickChassis = (y, vx, vz) => ({
  vset: { x: vx, z: vz },
  body: { translation: () => ({ x: 0, y, z: 0 }) },
});
const stick = (c, vy) => Chassis.prototype._stick.call(c, 1 / 60, vy);

describe('Chassis._stick', () => {
  it('upward speed just over a crest is taken off at STICK_A', () => {
    expect(stick(fakeStickChassis(0.05, 0, 16.7), 1.5)).toBeCloseTo(1.5 - 20 / 60, 9);
  });

  it('never pushes below the ground’s own rise (flat ground: 0)', () => {
    expect(stick(fakeStickChassis(0.05, 0, 16.7), 0.1)).toBeCloseTo(0, 9);
  });

  it('leaves a body well above the ground alone (a real jump or a ledge)', () => {
    expect(stick(fakeStickChassis(1.2, 0, 16.7), 1.5)).toBe(1.5);
  });

  it('never slows a fall and does nothing at walking pace', () => {
    expect(stick(fakeStickChassis(0.05, 0, 16.7), -2)).toBe(-2);
    expect(stick(fakeStickChassis(0.05, 0, 1), 1.5)).toBe(1.5);
  });
});

describe('Chassis rescue / teleport', () => {
  const fakeChassis = (v) => {
    const body = {
      t: null,
      setTranslation(t) {
        this.t = t;
      },
      setRotation() {},
      setLinvel() {},
      setAngvel() {},
    };
    v._pose = () => {};
    return {
      body,
      v,
      vset: { x: 0, z: 0 },
      hits: new Map(),
      lastHits: new Map(),
      wx: NaN,
      wz: NaN,
      teleport: Chassis.prototype.teleport,
    };
  };

  it('a NaN heading and position are not carried into the next step (no rescue every step)', () => {
    const v = { heading: NaN, moveAng: NaN, speed: NaN, pos: { x: 12, z: -7 } };
    const c = fakeChassis(v);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    Chassis.prototype._rescue.call(c);
    expect(Number.isFinite(v.heading)).toBe(true);
    expect(v.moveAng).toBe(v.heading);
    expect(v.speed).toBe(0);
    expect(c.body.t.x).toBe(12);
    expect(c.body.t.z).toBe(-7);
  });

  it('teleport sets the arcade heading with the body', () => {
    const v = { heading: 0, moveAng: 0.4, speed: 9 };
    const c = fakeChassis(v);
    Chassis.prototype.teleport.call(c, 1, 2, 1.25);
    expect(v.heading).toBe(1.25);
    expect(v.moveAng).toBe(1.25);
    expect(v.speed).toBe(0);
  });
});

describe('Peds.shove: a pedestrian takes the reaction of a hit that did not knock them down', () => {
  it('adds to a shove in progress, capped below a knock-down', () => {
    const p = { state: 'walk' };
    expect(Peds.prototype.shove.call({}, p, 1.2, 0)).toBe(true);
    Peds.prototype.shove.call({}, p, 0, 1);
    expect(p.shove.x).toBeCloseTo(1.2, 9);
    expect(p.shove.z).toBeCloseTo(1, 9);
    Peds.prototype.shove.call({}, p, 10, 0);
    expect(Math.hypot(p.shove.x, p.shove.z)).toBeCloseTo(3, 9);
  });

  it('someone flying or down is not shoved', () => {
    expect(Peds.prototype.shove.call({}, { state: 'fly' }, 1, 0)).toBe(false);
    expect(Peds.prototype.shove.call({}, { state: 'walk', rag: {} }, 1, 0)).toBe(false);
  });

  it('slow debris shoves a pedestrian (momentum to both) instead of passing through, once', () => {
    const ped = {
      pos: { x: 0.12 + 0.2, z: 0 },
      y: 0,
      state: 'idle',
      heading: 0,
      ch: { weight: 70 },
    };
    const peds = {
      active: () => [ped],
      knock: vi.fn(),
      shove: (p, vx, vz) => Peds.prototype.shove.call({}, p, vx, vz),
    };
    const game = { player: null, peds };
    let v = { x: 2, y: 0, z: 0 }; // a scooter sliding at 2 m/s: too slow to knock anyone down
    const body = { linvel: () => v, setLinvel: (n) => (v = n) };
    const q = { x: 0, y: 0, z: 0, w: 1 };
    const dv = knockPeopleWith(game, 'scooter', { x: 0, y: 0, z: 0 }, q, v, body);
    expect(peds.knock).not.toHaveBeenCalled();
    expect(ped.shove.x).toBeGreaterThan(0);
    expect(dv.x).toBeLessThan(0);
    // momentum: the scooter's loss pays the pedestrian's gain (less what their feet held)
    expect(110 * -dv.x).toBeGreaterThanOrEqual(70 * ped.shove.x - 1e-9);
    // the next frame they are already moving away as fast: no second shove
    expect(knockPeopleWith(game, 'scooter', { x: 0, y: 0, z: 0 }, q, v, body)).toBeNull();
  });
});
