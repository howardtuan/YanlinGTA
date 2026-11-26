// Pure helpers for the surveyed road markings (tools/roads.json 'marks'), kept apart from MapBuilder.js so the
// along-the-way arithmetic can be unit tested without three.js.
import { closestOnSeg } from '../physics/Collision.js';

// distance along the polyline pts (D: cumulative distance at each vertex) of the point nearest (x, z)
export function alongWay(pts, D, x, z) {
  let best = Infinity,
    s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1],
      c = closestOnSeg(x, z, a[0], a[1], b[0], b[1]),
      d = Math.hypot(c[0] - x, c[1] - z);
    if (d < best) {
      best = d;
      s = D[i] + Math.hypot(c[0] - a[0], c[1] - a[1]);
    }
  }
  return s;
}

// the painted pieces [u0, u1] of a line along [d0, d1], skipping the [from, to] distances in gaps (pieces
// shorter than 0.3 m dropped); dash: 4 m on / 6 m off, on a 10 m grid counted from the start of the way
export function lineRuns(d0, d1, gaps, dash = false) {
  let runs = [[d0, d1]];
  for (const [g0, g1] of gaps)
    runs = runs.flatMap(([u0, u1]) =>
      g1 <= u0 || g0 >= u1
        ? [[u0, u1]]
        : [
            [u0, g0],
            [g1, u1],
          ].filter(([v0, v1]) => v1 - v0 > 0.3)
    );
  if (dash)
    runs = runs.flatMap(([u0, u1]) => {
      const o = [];
      for (let u = Math.ceil(u0 / 10) * 10; u < u1; u += 10)
        if (Math.min(u + 4, u1) - Math.max(u, u0) > 0.3)
          o.push([Math.max(u, u0), Math.min(u + 4, u1)]);
      return o;
    });
  return runs;
}

// the centre line of a way as [style, gaps] pairs: the way's own style everywhere except the 'segs' stretches
// ({from: [x, z], to: [x, z], centre}, ends projected with along), each of which gets its own style; gaps are
// the breaks the whole way already has (junction mouths, boxes, span)
export function centreStyles(centre, segs, along, gaps) {
  const S = (segs || []).map((g) => {
    const a = along(...g.from),
      b = along(...g.to);
    return [Math.min(a, b), Math.max(a, b), g.centre];
  });
  return [[centre, gaps.concat(S.map(([a, b]) => [a, b]))]].concat(
    S.map(([a, b, st]) => [
      st,
      gaps.concat([
        [-Infinity, a],
        [b, Infinity],
      ]),
    ])
  );
}
