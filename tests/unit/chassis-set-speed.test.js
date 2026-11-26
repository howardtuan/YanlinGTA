import { describe, it, expect } from 'vitest';
import { Chassis } from '../../src/physics/VehPhysics.js';

// Chassis._setSpeed writes the arcade speed back onto the Rapier body after a hit rule (e.g. a parked
// scooter knocked away keeps kf of your speed). The contact solver treats the parked scooter stand-in as a
// kinematic (infinite-mass) body, so the body's velocity after the step can be almost all sideways or even
// bounced backwards while the hit rule restores most of the forward speed. Scaling that velocity by
// s / current-speed then blows a small sideways leftover up into a pinball launch.
const fake = (vx, vz, moveAng = 0) => {
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
const set = (c, s) => Chassis.prototype._setSpeed.call(c, s);

describe('Chassis._setSpeed', () => {
  it('a car deflected sideways by a parked scooter is not launched sideways', () => {
    // driving +z at 12 m/s; the kinematic stand-in ate the forward part: 3 m/s sideways, 0.5 forward left
    const c = fake(3, 0.5);
    set(c, 10.8); // hit rule: car keeps ~90 % of 12 m/s (momentum vs a 120 kg scooter)
    expect(Math.hypot(c.lv.x, c.lv.z)).toBeLessThan(12.5);
    expect(Math.abs(c.lv.x)).toBeLessThanOrEqual(3 + 1e-9);
    expect(c.lv.z).toBeCloseTo(10.8, 5);
  });

  it('a car bounced backwards by the stand-in gets its forward speed back, not a reversed launch', () => {
    const c = fake(0.2, -1);
    set(c, 10.8);
    expect(c.lv.z).toBeCloseTo(10.8, 5);
    expect(Math.hypot(c.lv.x, c.lv.z)).toBeLessThan(11);
  });

  it('slowing down still scales the whole velocity (drift kept in proportion)', () => {
    const c = fake(2, 10);
    set(c, 5);
    expect(c.lv.x / c.lv.z).toBeCloseTo(0.2, 9); // same drift direction
    expect(Math.hypot(c.lv.x, c.lv.z)).toBeCloseTo(5, 5); // arcade speed within slip = |velocity|
  });

  it('stopping zeroes the horizontal velocity', () => {
    const c = fake(3, 8);
    set(c, 0);
    expect(c.lv.x).toBeCloseTo(0, 9);
    expect(c.lv.z).toBeCloseTo(0, 9);
  });
});
