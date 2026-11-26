import { describe, it, expect, vi } from 'vitest';
import {
  obbGap,
  debrisVsPerson,
  solveRiderEjection,
  PERSON_R,
} from '../../src/physics/ImpactPhysics.js';
import { knockPeopleWith } from '../../src/physics/DebrisPeople.js';

describe('obbGap: a vehicle footprint, not a circle', () => {
  // a car box: half width 0.88, half length 1.95, heading +z
  it('measures to the side and to the bumper', () => {
    expect(obbGap(1.9, 0, 0, 0, 0, 0.88, 1.95).gap).toBeCloseTo(1.02, 9); // 0.7 m clear of the door
    const front = obbGap(0.5, 2.2, 0, 0, 0, 0.88, 1.95);
    expect(front.gap).toBeCloseTo(0.25, 9); // touching the front bumper
    expect(front.nz).toBeCloseTo(1, 9);
  });
  it('rotates with the heading and pushes out through the nearest face from inside', () => {
    const g = obbGap(0, 1.9, 0, 0, Math.PI / 2, 0.88, 1.95); // car pointing +x: +z is its side
    expect(g.gap).toBeCloseTo(1.02, 9);
    const inside = obbGap(0.8, 0, 0, 0, 0, 0.88, 1.95);
    expect(inside.gap).toBeCloseTo(-0.08, 9);
    expect(inside.nx).toBeCloseTo(1, 9);
  });
});

describe('debrisVsPerson', () => {
  const lv = { x: 8, y: 0, z: 0 }; // a thrown car sliding sideways (+x) at 8 m/s
  it('does not knock down someone 0.7 m clear of its side (a 2.1 m circle did)', () => {
    expect(
      debrisVsPerson({ kind: 'car', lv, cx: 0, cz: 0, yaw: 0, px: 1.9 + 0.3, pz: 0 })
    ).toBeNull();
  });
  it('hits someone its box really reaches, with the Newtonian solution', () => {
    const hit = debrisVsPerson({ kind: 'car', lv, cx: 0, cz: 0, yaw: 0, px: 0.88 + 0.2, pz: 1.5 });
    expect(hit).not.toBeNull();
    expect(hit.nx).toBeCloseTo(1, 9);
    expect(hit.vRel).toBeCloseTo(8, 9);
    expect(hit.sol.knockDown).toBe(true);
  });
  it('a scooter counts its handlebars (hw) as well as its narrow body box', () => {
    const args = {
      kind: 'scooter',
      lv: { x: 6, y: 0, z: 0 },
      cx: 0,
      cz: 0,
      yaw: 0,
      px: 0.6,
      pz: 0,
    };
    expect(debrisVsPerson(args)).toBeNull();
    expect(debrisVsPerson({ ...args, hw: 0.34 })).not.toBeNull();
  });
  it('a person walking away faster than it slides is not hit', () => {
    expect(
      debrisVsPerson({ kind: 'car', lv, cx: 0, cz: 0, yaw: 0, px: 1.0, pz: 0, pvx: 9, pvz: 0 })
    ).toBeNull();
  });
});

describe('knockPeopleWith', () => {
  const upright = { x: 0, y: 0, z: 0, w: 1 };
  it('knocks down the player on foot (no longer an infinite-mass capsule) and takes the reaction off the body', () => {
    let v = { x: 8, y: 0, z: 0 };
    const body = { linvel: () => v, setLinvel: (n) => (v = n) };
    const pl = {
      vehicle: null,
      pos: { x: 1.1, y: 0, z: 0 },
      vel: { x: 0, y: 0 },
      ch: { weight: 70, height: 1.72 },
      throwOff: vi.fn(),
    };
    const game = { player: pl, peds: { active: () => [] }, audio: { hitPed: vi.fn() } };
    const dv = knockPeopleWith(game, 'car', { x: 0, y: 0, z: 0 }, upright, v, body);
    expect(pl.throwOff).toHaveBeenCalledTimes(1);
    const [vx, , vy] = pl.throwOff.mock.calls[0];
    expect(vx).toBeGreaterThan(5);
    expect(vy).toBeGreaterThan(0);
    expect(dv.x).toBeLessThan(0);
    expect(v.x).toBeCloseTo(8 + dv.x, 9);
  });
  it('leaves people it does not reach alone', () => {
    const peds = [{ pos: { x: 2.5, z: 0 }, y: 0, state: 'walk', speed: 0, heading: 0, ch: {} }];
    const game = { player: null, peds: { active: () => peds, knock: vi.fn() } };
    expect(
      knockPeopleWith(game, 'car', { x: 0, y: 0, z: 0 }, upright, { x: 8, y: 0, z: 0 })
    ).toBeNull();
    expect(game.peds.knock).not.toHaveBeenCalled();
  });
});

describe('solveRiderEjection when the rider is the one hit', () => {
  it('keeps the rider’s own speed and adds the shove (rear-ended at 8 m/s, shoved 6.9 m/s forward)', () => {
    const ej = solveRiderEjection({
      speed: 8,
      impact: 6.9,
      nx: 0,
      nz: 1,
      fx: 0,
      fz: 1,
      dv1: 6.9,
      pushed: true,
      riderMass: 70,
    });
    expect(ej.vz).toBeGreaterThan(8); // not slower than they were riding
    expect(ej.vy).toBeGreaterThan(0);
  });
  it('a T-bone sends the rider sideways while they keep going forward', () => {
    const ej = solveRiderEjection({
      speed: 8,
      impact: 14.8,
      nx: 1,
      nz: 0,
      fx: 0,
      fz: 1,
      dv1: 14.8,
      pushed: true,
      riderMass: 70,
    });
    expect(ej.vz).toBeCloseTo(8, 9);
    expect(ej.vx).toBeGreaterThan(3);
  });
  it('PERSON_R is a shoulder radius', () => {
    expect(PERSON_R).toBeGreaterThan(0.2);
    expect(PERSON_R).toBeLessThan(0.4);
  });
});
