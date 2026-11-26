import { describe, it, expect, vi } from 'vitest';
import { Chassis } from '../../src/physics/VehPhysics.js';
import { Peds } from '../../src/entities/NPC.js';
import { knockPeopleWith } from '../../src/physics/DebrisPeople.js';

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
