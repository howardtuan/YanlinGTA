import { describe, it, expect } from 'vitest';
import { pointInPoly, closestOnSeg, CollisionWorld } from '../../src/physics/Collision.js';

describe('Geometry & Collision Tests (collision.js)', () => {
  describe('pointInPoly', () => {
    // 10x10 square centered at (5, 5) with corners (0,0), (10,0), (10,10), (0,10)
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

    // L-shaped concave polygon
    // (0,0) -> (10,0) -> (10,5) -> (5,5) -> (5,10) -> (0,10)
    const lShape = [
      [0, 0],
      [10, 0],
      [10, 5],
      [5, 5],
      [5, 10],
      [0, 10],
    ];

    it('should correctly handle concave polygon points', () => {
      // Inside the bottom branch
      expect(pointInPoly(8, 2, lShape)).toBe(true);
      // Inside the left branch
      expect(pointInPoly(2, 8, lShape)).toBe(true);
      // Inside common corner
      expect(pointInPoly(2, 2, lShape)).toBe(true);
      // In the cutout dent (outside)
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
      // Segment along X axis from (0,0) to (10,0)
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
    it('should add polygons and index them into spatial grid cells', () => {
      const world = new CollisionWorld([-100, -100, 100, 100], 16);
      const polyIndex = world.addPolygon([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]);
      expect(polyIndex).toBe(0);
      expect(world.polys.length).toBe(1);
      expect(world.segs.length).toBe(4);
    });
  });
});
