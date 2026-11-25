import { describe, it, expect } from 'vitest';
import { pointInPoly, closestOnSeg, CollisionWorld, SegGrid } from '../../src/physics/Collision.js';

describe('Geometry & Collision Tests (Collision.js)', () => {
  describe('pointInPoly', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    it('should return true for points strictly inside convex polygon', () => {
      expect(pointInPoly(5, 5, square)).toBe(true);
      expect(pointInPoly(1, 1, square)).toBe(true);
      expect(pointInPoly(9, 9, square)).toBe(true);
    });

    it('should return false for points outside convex polygon', () => {
      expect(pointInPoly(-1, 5, square)).toBe(false);
      expect(pointInPoly(11, 5, square)).toBe(false);
      expect(pointInPoly(5, -1, square)).toBe(false);
      expect(pointInPoly(5, 11, square)).toBe(false);
      expect(pointInPoly(100, 100, square)).toBe(false);
    });

    const lShape = [
      [0, 0],
      [10, 0],
      [10, 5],
      [5, 5],
      [5, 10],
      [0, 10],
    ];

    it('should correctly handle concave polygon points', () => {
      expect(pointInPoly(8, 2, lShape)).toBe(true);
      expect(pointInPoly(2, 8, lShape)).toBe(true);
      expect(pointInPoly(2, 2, lShape)).toBe(true);
      expect(pointInPoly(8, 8, lShape)).toBe(false);
    });

    it('should handle degenerate polygons gracefully', () => {
      expect(pointInPoly(5, 5, [])).toBe(false);
      expect(
        pointInPoly(5, 5, [
          [0, 0],
          [10, 10],
        ])
      ).toBe(false);
    });
  });

  describe('closestOnSeg', () => {
    it('should project a point perpendicularly onto a segment', () => {
      const [cx, cz, t] = closestOnSeg(5, 5, 0, 0, 10, 0);
      expect(cx).toBeCloseTo(5);
      expect(cz).toBeCloseTo(0);
      expect(t).toBeCloseTo(0.5);
    });

    it('should clamp to start when projection is before start', () => {
      const [cx, cz, t] = closestOnSeg(-5, 5, 0, 0, 10, 0);
      expect(cx).toBe(0);
      expect(cz).toBe(0);
      expect(t).toBe(0);
    });

    it('should clamp to end when projection is past end', () => {
      const [cx, cz, t] = closestOnSeg(15, 5, 0, 0, 10, 0);
      expect(cx).toBe(10);
      expect(cz).toBe(0);
      expect(t).toBe(1);
    });
  });

  describe('CollisionWorld', () => {
    const BOUNDS = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    const BOX = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    it('should add polygons, report insideAny and highest topAt', () => {
      const world = new CollisionWorld(BOUNDS, 16);
      const pi0 = world.addPolygon(BOX, 12);
      const pi1 = world.addPolygon(
        [
          [2, 2],
          [8, 2],
          [8, 8],
          [2, 8],
        ],
        20
      );
      expect(pi0).toBe(0);
      expect(pi1).toBe(1);
      expect(world.polys.length).toBe(2);
      expect(world.segs.length).toBe(8);
      expect(world.insideAny(5, 5)).toBe(true);
      expect(world.insideAny(-5, -5)).toBe(false);
      expect(world.topAt(5, 5)).toBe(20);
      expect(world.topAt(1, 1)).toBe(12);
      expect(world.topAt(-5, -5)).toBe(-Infinity);
    });

    it('should detect and remove circular obstacles via blocked() and resolve()', () => {
      const world = new CollisionWorld(BOUNDS, 16);
      world.addCircle(20, 20, 2);

      expect(world.blocked(22.5, 20, 1)).toBe(true);
      expect(world.blocked(25, 20, 1)).toBe(false);

      const pos = { x: 22, y: 0, z: 20 };
      const res = world.resolve(pos, 1);
      expect(res.hit).toBe(true);
      expect(pos.x).toBeCloseTo(23, 4);
      expect(pos.z).toBeCloseTo(20, 4);

      world.removeCircleAt(20, 20);
      expect(world.blocked(22.5, 20, 1)).toBe(false);
    });

    it('should push bodies out of polygon edges, tunneled interiors, and world bounds', () => {
      const world = new CollisionWorld(BOUNDS, 16);
      world.addPolygon(BOX, 10);

      // Pressing against the west edge (x = 0)
      const edgePos = { x: -0.4, y: 0, z: 5 };
      const edgeRes = world.resolve(edgePos, 1);
      expect(edgeRes.hit).toBe(true);
      expect(edgePos.x).toBeCloseTo(-1, 4);

      // Tunneled inside the polygon near x = 0 -> ejected outside
      const tunnelPos = { x: 1, y: 0, z: 5 };
      const tunnelRes = world.resolve(tunnelPos, 1);
      expect(tunnelRes.hit).toBe(true);
      expect(world.insideAny(tunnelPos.x, tunnelPos.z)).toBe(false);

      // Clamped by world boundary
      const outPos = { x: 105, y: 0, z: 0 };
      const boundRes = world.resolve(outPos, 2);
      expect(boundRes.hit).toBe(true);
      expect(outPos.x).toBe(98);
    });

    it('should respect height-banded segments in blocked() and resolve()', () => {
      const world = new CollisionWorld(BOUNDS, 16);
      // Viaduct parapet only blocks feet between y = 4 and y = 7
      world.addSegment(30, 0, 30, 10, 4, 7);

      expect(world.blocked(30.3, 5, 1, 0, 5)).toBe(true);
      expect(world.blocked(30.3, 5, 1, 0, 0)).toBe(false);

      const groundPos = { x: 30.3, y: 0, z: 5 };
      expect(world.resolve(groundPos, 1, 0, 0).hit).toBe(false);

      const upperPos = { x: 30.3, y: 5, z: 5 };
      expect(world.resolve(upperPos, 1, 0, 5).hit).toBe(true);
      expect(upperPos.x).toBeCloseTo(31, 4);
    });
  });

  describe('SegGrid', () => {
    it('should find nearest road segment and honor filters', () => {
      const grid = new SegGrid(20);
      grid.add(0, 0, 20, 0, 6, { name: 'MainRd', drive: true });
      grid.add(0, 4, 20, 4, 2, { name: 'Footpath', drive: false });

      const anyNearest = grid.nearest(10, 4.5);
      expect(anyNearest.seg[5].name).toBe('Footpath');

      const driveOnly = grid.nearest(10, 4.5, (s) => s[5].drive);
      expect(driveOnly.seg[5].name).toBe('MainRd');
      expect(driveOnly.d).toBeCloseTo(1.5);
    });
  });
});
