import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alongWay, centreStyles, lineRuns } from '../../src/world/RoadMarks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cumul = (pts) => {
  const D = [0];
  for (let i = 1; i < pts.length; i++)
    D.push(D[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return D;
};
// every painted piece of the centre line, tagged with its style
const paint = (centre, segs, pts, gaps = []) => {
  const D = cumul(pts),
    along = (x, z) => alongWay(pts, D, x, z);
  return centreStyles(centre, segs, along, gaps).flatMap(([st, g]) =>
    lineRuns(0, D[D.length - 1], g, st.endsWith('-dash')).map(([u0, u1]) => [st, u0, u1])
  );
};
const covered = (runs, a, b) =>
  runs.reduce((s, [, u0, u1]) => s + Math.max(0, Math.min(u1, b) - Math.max(u0, a)), 0);

describe('road marks: one way mixing centre line styles by stretch (tools/roads.json marks.segs)', () => {
  it('lineRuns breaks a line at the gaps and dashes 4 m on / 6 m off', () => {
    expect(lineRuns(0, 100, [[20, 30]])).toEqual([
      [0, 20],
      [30, 100],
    ]);
    expect(lineRuns(0, 25, [], true)).toEqual([
      [0, 4],
      [10, 14],
      [20, 24],
    ]);
    // dashes stay on the 10 m grid of the whole way, clipped to the run
    expect(lineRuns(12, 33, [], true)).toEqual([
      [20, 24],
      [30, 33],
    ]);
  });

  it('alongWay projects a point onto a bent polyline', () => {
    const pts = [
      [0, 0],
      [100, 0],
      [100, 50],
    ];
    expect(alongWay(pts, cumul(pts), 40, 3)).toBeCloseTo(40);
    expect(alongWay(pts, cumul(pts), 104, 20)).toBeCloseTo(120);
  });

  it('paints the seg stretch in its own style and the rest in the way style, with no overlap', () => {
    const pts = [
      [0, 0],
      [300, 0],
    ];
    const runs = paint('yellow', [{ from: [80, 2], to: [171, -1], centre: 'yellow-dash' }], pts);
    const solid = runs.filter(([s]) => s === 'yellow'),
      dash = runs.filter(([s]) => s === 'yellow-dash');
    expect(covered(solid, 0, 80)).toBeCloseTo(80);
    expect(covered(solid, 171, 300)).toBeCloseTo(129);
    expect(covered(solid, 80, 171)).toBeCloseTo(0);
    // dashes 80..84, 90..94, .., 160..164 and the clipped 170..171
    expect(dash.every(([, u0, u1]) => u0 >= 80 && u1 <= 171 && u1 - u0 <= 4)).toBe(true);
    expect(covered(dash, 80, 171)).toBeCloseTo(37);
  });

  it('works with the ends given in either order and keeps the way gaps inside a seg', () => {
    const pts = [
      [0, 0],
      [200, 0],
    ];
    const runs = paint('yellow', [{ from: [150, 0], to: [50, 0], centre: 'yellow-dash' }], pts, [
      [95, 105],
    ]);
    expect(covered(runs, 95, 105)).toBeCloseTo(0);
    expect(
      runs.filter(([s]) => s === 'yellow-dash').every(([, u0, u1]) => u0 >= 50 && u1 <= 150)
    ).toBe(true);
    expect(
      covered(
        runs.filter(([s]) => s === 'yellow'),
        0,
        50
      )
    ).toBeCloseTo(50);
  });

  it('without segs the whole way keeps one style', () => {
    const runs = paint('double-yellow', undefined, [
      [0, 0],
      [50, 0],
    ]);
    expect(runs).toEqual([['double-yellow', 0, 50]]);
  });

  it('實踐路 817032495 in the built map: yellow solid with two yellow-dash stretches (s 80～171, s 466～510)', () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cycu.json'), 'utf8'));
    const r = map.roads.find((q) => q.name === '實踐路' && q.marks?.segs);
    expect(r.marks.centre).toBe('yellow');
    const runs = paint(r.marks.centre, r.marks.segs, r.pts);
    const dash = runs.filter(([s]) => s === 'yellow-dash');
    const D = cumul(r.pts),
      along = (p) => alongWay(r.pts, D, ...p);
    const spans = r.marks.segs.map((g) => [along(g.from), along(g.to)].sort((a, b) => a - b));
    // both stretches are dashed (the build may move the way a little, so allow a few metres on the s values)
    expect(spans[0][0]).toBeGreaterThan(70);
    expect(spans[0][1]).toBeLessThan(180);
    expect(spans[1][0]).toBeGreaterThan(455);
    expect(spans[1][1]).toBeLessThan(520);
    for (const [a, b] of spans) {
      expect(covered(dash, a, b)).toBeGreaterThan((b - a) * 0.3);
      expect(
        covered(
          runs.filter(([s]) => s === 'yellow'),
          a,
          b
        )
      ).toBeCloseTo(0);
    }
    expect(
      covered(
        runs.filter(([s]) => s === 'yellow'),
        spans[0][1],
        spans[1][0]
      )
    ).toBeGreaterThan(200);
  });
});
