import { describe, it, expect } from 'vitest';
import { Chassis } from '../../src/physics/VehPhysics.js';

// Chassis._stick: over a sharp crest of the 10 m terrain grid the body keeps the upward speed of the slope it
// came up. Close above the ground the part beyond what the ground ahead rises is taken off (STICK_A, 20 m/s²),
// so an ordinary crest does not throw the scooter into the air. No terrain loaded here: the ground is flat at y 0.
const fake = (y, vx, vz) => ({
  vset: { x: vx, z: vz },
  body: { translation: () => ({ x: 0, y, z: 0 }) },
});
const stick = (c, vy) => Chassis.prototype._stick.call(c, 1 / 60, vy);

describe('Chassis._stick', () => {
  it('upward speed just over a crest is taken off at STICK_A', () => {
    expect(stick(fake(0.05, 0, 16.7), 1.5)).toBeCloseTo(1.5 - 20 / 60, 9);
  });

  it('never pushes below the ground’s own rise (flat ground: 0)', () => {
    expect(stick(fake(0.05, 0, 16.7), 0.1)).toBeCloseTo(0, 9);
  });

  it('leaves a body well above the ground alone (a real jump or a ledge)', () => {
    expect(stick(fake(1.2, 0, 16.7), 1.5)).toBe(1.5);
  });

  it('never slows a fall and does nothing at walking pace', () => {
    expect(stick(fake(0.05, 0, 16.7), -2)).toBe(-2);
    expect(stick(fake(0.05, 0, 1), 1.5)).toBe(1.5);
  });
});
