import { describe, it, expect } from 'vitest';
import { planLeg, planRoute, timedPolyline } from '../../src/systems/BenchRoute.js';

// a 60 x 40 m yard with a wall across x = 30 that has a 4 m door at z 30..34
const wall = (x, z, r = 0) => Math.abs(x - 30) < 0.5 + r && !(z > 30 + r && z < 34 - r);
const yard = (x, z, r = 0) => x > 0 && x < 60 && z > 0 && z < 40 && !wall(x, z, r);

function clear(path, r = 0.4) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      L = Math.hypot(b.x - a.x, b.z - a.z);
    for (let d = 0; d <= L; d += 0.25)
      if (!yard(a.x + ((b.x - a.x) * d) / L, a.z + ((b.z - a.z) * d) / L, r)) return false;
  }
  return true;
}

describe('benchmark route planner', () => {
  it('goes through the door instead of through the wall', () => {
    const p = planLeg({ x: 10, z: 10 }, { x: 50, z: 10 }, yard, [], { margin: 8 }); // too small: grows;
    expect(p.length).toBeGreaterThan(2);
    expect(clear(p)).toBe(true);
    expect(p.some((q) => q.z > 29 && q.z < 35 && Math.abs(q.x - 30) < 6)).toBe(true);
    const end = p[p.length - 1];
    expect(Math.hypot(end.x - 50, end.z - 10)).toBeLessThan(1.5);
  });

  it('stops at the closest reachable spot when the target is shut away', () => {
    const shut = (x, z, r) =>
      yard(x, z, r) &&
      !(Math.abs(x - 45) < 6 && Math.abs(z - 10) < 6 && Math.abs(x - 45) > 4.5) &&
      !(Math.abs(z - 10) < 6 && Math.abs(z - 10) > 4.5 && Math.abs(x - 45) < 6);
    const p = planLeg({ x: 10, z: 10 }, { x: 45, z: 10 }, shut, [], { margin: 8 });
    expect(clear(p, 0)).toBe(true);
    const end = p[p.length - 1];
    expect(Math.hypot(end.x - 45, end.z - 10)).toBeGreaterThan(4);
  });

  it('prefers roads over open ground', () => {
    const open = (x, z) => x > -5 && x < 65 && z > -5 && z < 45;
    const road = [
      {
        w: 4,
        pts: [
          [0, 0],
          [0, 15],
          [60, 15],
          [60, 0],
        ],
      },
    ];
    const p = planLeg({ x: 0, z: 0 }, { x: 60, z: 0 }, open, road, { margin: 20 });
    expect(Math.max(...p.map((q) => q.z))).toBeGreaterThan(10); // around by the road, not straight across
  });

  it('chains legs and times the polyline (indoor metres slower)', () => {
    const pts = planRoute(
      [
        { x: 10, z: 10 },
        { x: 50, z: 10 },
        { x: 50, z: 30 },
      ],
      yard,
      [],
      { margin: 8 }
    );
    expect(clear(pts)).toBe(true);
    const R = timedPolyline(
      [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 20, z: 0 },
      ],
      (x) => x > 10,
      4
    );
    expect(R.len).toBe(20);
    expect(R.cost).toBe(50);
    expect(R.distAt(0.2)).toBeCloseTo(10); // 10 outdoor metres = 10 of 50 cost
    expect(R.distAt(1)).toBe(20);
    expect(R.pointAt(15)).toEqual({ x: 15, z: 0 });
  });
});
