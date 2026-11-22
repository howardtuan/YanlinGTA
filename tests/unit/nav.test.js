import { describe, it, expect } from 'vitest';
import { astar } from '../../src/systems/Navigation.js';

describe('Navigation & Pathfinding Tests (nav.js)', () => {
  it('should find direct path on a linear graph', () => {
    // A (0,0) -> B (5,0) -> C (10,0)
    const nodeA = { x: 0, z: 0, adj: [] };
    const nodeB = { x: 5, z: 0, adj: [] };
    const nodeC = { x: 10, z: 0, adj: [] };

    nodeA.adj.push({ to: nodeB, drive: true, road: { name: 'Main St' } });
    nodeB.adj.push({ to: nodeC, drive: true, road: { name: 'Main St' } });

    const path = astar(nodeA, nodeC, false);
    expect(path).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
    ]);
  });

  it('should choose the shorter path when multiple routes exist', () => {
    // S (0,0)
    // Route 1: S -> B (5, 0) -> T (10, 0) : total dist 10
    // Route 2: S -> C (0, 15) -> T (10, 0) : total dist ~33
    const S = { x: 0, z: 0, adj: [] };
    const B = { x: 5, z: 0, adj: [] };
    const C = { x: 0, z: 15, adj: [] };
    const T = { x: 10, z: 0, adj: [] };

    S.adj.push(
      { to: B, drive: true, road: { name: 'Short' } },
      { to: C, drive: true, road: { name: 'Long' } }
    );
    B.adj.push({ to: T, drive: true, road: { name: 'Short' } });
    C.adj.push({ to: T, drive: true, road: { name: 'Long' } });

    const path = astar(S, T, false);
    expect(path).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
    ]);
  });

  it('should respect drive flag: pedestrian path should not be traversed when driving', () => {
    // S (0,0) -> Pedestrian walkway -> T (10,0)
    const S = { x: 0, z: 0, adj: [] };
    const T = { x: 10, z: 0, adj: [] };
    S.adj.push({ to: T, drive: false, road: { name: 'Footpath' } });

    // When walking (drive = false), path should be found
    const walkPath = astar(S, T, false);
    expect(walkPath).toEqual([
      [0, 0],
      [10, 0],
    ]);

    // When driving (drive = true), path should be blocked
    const drivePath = astar(S, T, true);
    expect(drivePath).toBeNull();
  });

  it('should return null when target is unreachable', () => {
    const A = { x: 0, z: 0, adj: [] };
    const Isolated = { x: 100, z: 100, adj: [] };

    const path = astar(A, Isolated, false);
    expect(path).toBeNull();
  });

  it('should return start node directly if start equals target', () => {
    const A = { x: 5, z: 5, adj: [] };
    const path = astar(A, A, false);
    expect(path).toEqual([[5, 5]]);
  });
});
