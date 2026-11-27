import { describe, expect, it } from 'vitest';
import { makeGroundCut } from '../../src/world/GroundCut.js';

// vertex records [x, y, z, u]: y and u are linear in x / z so interpolation can be checked
const V = (x, z) => [x, 0.1 * x + 0.2 * z + 3, z, x / 10 + z / 20];
const cutAll = (gc, tris) => {
  const out = [];
  let touched = 0;
  for (const [a, b, c] of tris) {
    if (gc.cutTri(a, b, c, (p, q, r) => out.push([p, q, r]))) touched++;
    else out.push([a, b, c]);
  }
  return { out, touched };
};
// signed area seen from above: the winding of the pieces
const area2 = ([a, b, c]) => (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]);
const area = (tris) => tris.reduce((s, t) => s + Math.abs(area2(t)) / 2, 0);
const centre = (t) => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][2] + t[1][2] + t[2][2]) / 3];
const square = (x0, z0, s) => [
  [V(x0, z0), V(x0 + s, z0 + s), V(x0 + s, z0)],
  [V(x0, z0), V(x0, z0 + s), V(x0 + s, z0 + s)],
];

describe('GroundCut (CPU ground holes instead of a shader discard)', () => {
  it('leaves triangles far from any hole alone', () => {
    const gc = makeGroundCut({ rects: [[5, 5, 1, 0, 2, 2]] });
    const { out, touched } = cutAll(gc, square(100, 100, 10));
    expect(touched).toBe(0);
    expect(out).toHaveLength(2);
    expect(makeGroundCut().empty).toBe(true);
  });

  it('cuts a pit exactly along its edges', () => {
    const gc = makeGroundCut({ pits: [{ x0: 2.3, z0: 3.6, x1: 7.45, z1: 20 }] });
    const { out } = cutAll(gc, square(0, 0, 10));
    // the 10 x 10 cell minus the part of the pit inside it (5.15 x 6.4)
    expect(area(out)).toBeCloseTo(100 - 5.15 * 6.4, 6);
    for (const t of out) {
      const [cx, cz] = centre(t);
      expect(cx > 2.3 && cx < 7.45 && cz > 3.6).toBe(false);
    }
  });

  it('cuts a turned rectangle and a concave ring exactly', () => {
    const c = Math.cos(0.5),
      s = Math.sin(0.5);
    const rect = makeGroundCut({ rects: [[20, 20, c, s, 4, 1.5]] });
    expect(area(cutAll(rect, square(10, 10, 20)).out)).toBeCloseTo(400 - 4 * 4 * 1.5, 6);
    // an L: 6 x 6 less its 3 x 3 corner = 27 m2
    const L = [
      [2, 2],
      [8, 2],
      [8, 5],
      [5, 5],
      [5, 8],
      [2, 8],
    ];
    const { out } = cutAll(makeGroundCut({ polys: [L] }), square(0, 0, 10));
    expect(area(out)).toBeCloseTo(100 - 27, 6);
    // the notch of the L stays ground
    expect(out.some((t) => centre(t)[0] > 5 && centre(t)[0] < 8 && centre(t)[1] > 5)).toBe(true);
  });

  it('cuts a disc as the 32-gon round it', () => {
    const r = 3,
      gc = makeGroundCut({ discs: [[5, 5, r]] });
    const { out } = cutAll(gc, square(0, 0, 10));
    const ngon = 32 * r * r * Math.tan(Math.PI / 32);
    expect(area(out)).toBeCloseTo(100 - ngon, 6);
    for (const t of out) {
      const [cx, cz] = centre(t);
      expect((cx - 5) ** 2 + (cz - 5) ** 2).toBeGreaterThan(r * r);
    }
  });

  it('drops what lies inside and keeps the attributes linear on the pieces', () => {
    const gc = makeGroundCut({ rects: [[15, 5, 1, 0, 5.5, 5.5]] }); // x 9.5 .. 20.5, z -0.5 .. 10.5
    const { out } = cutAll(gc, [[V(0, 0), V(30, 0), V(0, 10)]]);
    expect(out.length).toBeGreaterThan(0);
    for (const t of out)
      for (const v of t) {
        expect(v[0] > 9.5 + 1e-6 && v[0] < 20.5 - 1e-6).toBe(false);
        const w = V(v[0], v[2]);
        expect(v[1]).toBeCloseTo(w[1], 9);
        expect(v[3]).toBeCloseTo(w[3], 9);
      }
  });

  it('keeps the winding of the triangle it cuts', () => {
    const gc = makeGroundCut({
      polys: [
        [
          [2, 2],
          [8, 2.5],
          [7, 9],
          [3, 6],
        ],
      ],
    });
    for (const tri of square(0, 0, 10)) {
      const sign = Math.sign(area2(tri));
      const { out } = cutAll(gc, [tri]);
      expect(out.length).toBeGreaterThan(1);
      for (const t of out) expect(Math.sign(area2(t))).toBe(sign);
    }
  });

  it('leaves the same holes in a big draped triangle as in the ground cells under it', () => {
    const opts = {
      rects: [[13, 7, 0.8, 0.6, 6, 1.7]],
      pits: [{ x0: 21.2, z0: 2.5, x1: 26.9, z1: 8.1 }],
      discs: [[6, 14, 2.2]],
    };
    const big = cutAll(makeGroundCut(opts), [[V(0, 0), V(40, 0), V(0, 40)]]).out;
    const cells = [];
    for (let x = 0; x <= 20; x += 10)
      for (let z = 0; x + z <= 20; z += 10) cells.push(...square(x, z, 10));
    const small = cutAll(makeGroundCut(opts), cells).out;
    // the big triangle (800 m2) and the six whole cells under it (600 m2) lose the same holes
    const holes = 4 * 6 * 1.7 + 5.7 * 5.6 + 32 * 2.2 * 2.2 * Math.tan(Math.PI / 32);
    expect(area(big)).toBeCloseTo(800 - holes, 6);
    expect(area(small)).toBeCloseTo(600 - holes, 6);
  });
});
