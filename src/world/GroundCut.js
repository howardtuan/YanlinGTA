// ---------- ground holes cut on the CPU (perf-refactor Phase 2 PR #5) ----------
// The ground mesh and the draped layers over it (paving, grass, roads, water, marks, rails) leave out the open
// road cuts, the sunk ponds / streams with their banks and the pits (src/world/Terrain.js addPit, mask: true).
// This used to be a fragment-shader discard (MapBuilder cutMask()), which cost every ground pixel a few dozen
// tests and turned off early depth testing; now the triangles over a hole are not there at all.
// The cut is exact: a triangle near a hole is split along the lines of the hole's edges, and a piece is left out
// when its centre is in the hole, so the edges stay where the shader put them. (The plan's 1 m sub-grid, as
// src/physics/PhysWorld.js does for collision, left 1 m steps with the sky showing through next to the banks
// and cut walls; the exact cut was chosen instead.) A disc is the 32-gon round it.

const EPS = 1e-7;
const CELL = 8; // index cell (m)
const DISC_SIDES = 32;
const KEY = (i, j) => (i + 32768) * 65536 + (j + 32768);

// a vertex record is [x, y, z, ...attributes]: every attribute is linear over the triangle, so a point on an
// edge is a plain lerp of its ends
const lerp = (p, q, t) => {
  const m = new Array(p.length);
  for (let k = 0; k < p.length; k++) m[k] = p[k] + (q[k] - p[k]) * t;
  return m;
};
// split a convex polygon by the line through (ax, az) with unit normal (nx, nz): [behind, in front] (null when empty)
function split(poly, ax, az, nx, nz) {
  const lo = [],
    hi = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length];
    let fp = (p[0] - ax) * nx + (p[2] - az) * nz,
      fq = (q[0] - ax) * nx + (q[2] - az) * nz;
    if (Math.abs(fp) < EPS) fp = 0;
    if (Math.abs(fq) < EPS) fq = 0;
    if (fp <= 0) lo.push(p);
    if (fp >= 0) hi.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const m = lerp(p, q, fp / (fp - fq));
      lo.push(m);
      hi.push(m);
    }
  }
  return [lo.length > 2 ? lo : null, hi.length > 2 ? hi : null];
}
const bbox = (poly) => {
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const v of poly) {
    if (v[0] < x0) x0 = v[0];
    if (v[0] > x1) x1 = v[0];
    if (v[2] < z0) z0 = v[2];
    if (v[2] > z1) z1 = v[2];
  }
  return [x0, z0, x1, z1];
};
// even-odd point in a ring of [x, z]
function inRing(P, x, z) {
  let ins = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j],
      b = P[i];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      ins = !ins;
  }
  return ins;
}

// rects: [cx, cz, ux, uz, half length, half width] (u along, (-uz, ux) across); polys: [[x, z], ...] rings
// (even-odd); discs: [x, z, r]; pits: { x0, z0, x1, z1 } (axis-aligned)
export function makeGroundCut({ rects = [], polys = [], discs = [], pits = [] } = {}) {
  const shapes = [];
  const ring = (P, inside) => {
    if (P.length < 3) return;
    const [x0, z0, x1, z1] = bbox(P.map(([x, z]) => [x, 0, z]));
    const edges = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        b = P[(i + 1) % P.length],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l < 1e-9) continue;
      edges.push({
        ax: a[0],
        az: a[1],
        nx: (b[1] - a[1]) / l,
        nz: -(b[0] - a[0]) / l,
        x0: Math.min(a[0], b[0]),
        x1: Math.max(a[0], b[0]),
        z0: Math.min(a[1], b[1]),
        z1: Math.max(a[1], b[1]),
      });
    }
    shapes.push({ x0, z0, x1, z1, edges, inside: inside || ((x, z) => inRing(P, x, z)) });
  };
  for (const [cx, cz, ux, uz, hl, hw] of rects) {
    const c = (s, t) => [cx + ux * s * hl - uz * t * hw, cz + uz * s * hl + ux * t * hw];
    ring([c(-1, -1), c(1, -1), c(1, 1), c(-1, 1)], (x, z) => {
      const dx = x - cx,
        dz = z - cz;
      return Math.abs(dx * ux + dz * uz) < hl && Math.abs(-dx * uz + dz * ux) < hw;
    });
  }
  for (const p of pits)
    if (p.x1 > p.x0 && p.z1 > p.z0)
      ring(
        [
          [p.x0, p.z0],
          [p.x1, p.z0],
          [p.x1, p.z1],
          [p.x0, p.z1],
        ],
        (x, z) => x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1
      );
  for (const P of polys) ring(P);
  for (const [cx, cz, r] of discs) {
    const R = r / Math.cos(Math.PI / DISC_SIDES),
      P = [];
    for (let i = 0; i < DISC_SIDES; i++) {
      const a = (i / DISC_SIDES) * Math.PI * 2;
      P.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]);
    }
    ring(P);
  }

  // the shapes by index cell
  const cells = new Map();
  for (const s of shapes)
    for (let i = Math.floor(s.x0 / CELL); i <= Math.floor(s.x1 / CELL); i++)
      for (let j = Math.floor(s.z0 / CELL); j <= Math.floor(s.z1 / CELL); j++) {
        const k = KEY(i, j);
        let l = cells.get(k);
        if (!l) cells.set(k, (l = []));
        l.push(s);
      }
  // the shapes whose bounds meet the box (null: none)
  const near = (x0, z0, x1, z1) => {
    let out = null;
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++)
      for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
        const l = cells.get(KEY(i, j));
        if (l)
          for (const s of l)
            if (s.x0 <= x1 && s.x1 >= x0 && s.z0 <= z1 && s.z1 >= z0) (out ||= new Set()).add(s);
      }
    return out;
  };
  // does anything in the box (x0, z0)-(x1, z1) come near a hole?
  const touches = (x0, z0, x1, z1) => near(x0, z0, x1, z1) !== null;

  const emitPoly = (poly, emit) => {
    for (let k = 1; k < poly.length - 1; k++) {
      const a = poly[0],
        b = poly[k],
        c = poly[k + 1];
      const ux = b[0] - a[0],
        uy = b[1] - a[1],
        uz = b[2] - a[2],
        vx = c[0] - a[0],
        vy = c[1] - a[1],
        vz = c[2] - a[2];
      const cx = uy * vz - uz * vy,
        cy = uz * vx - ux * vz,
        cz = ux * vy - uy * vx;
      if (cx * cx + cy * cy + cz * cz > 1e-12) emit(a, b, c);
    }
  };
  // cut the triangle a, b, c (vertex records). Returns false when no hole is near (keep it as it is); otherwise
  // emit(a, b, c) is called for each piece outside the holes, wound like the triangle, and true is returned
  function cutTri(a, b, c, emit) {
    const [x0, z0, x1, z1] = bbox([a, b, c]);
    const ss = near(x0, z0, x1, z1);
    if (!ss) return false;
    // split along every hole edge whose bounds meet a piece: then no edge runs through a piece, so each
    // piece is wholly in or out of every hole
    let pcs = [[a, b, c]];
    for (const s of ss)
      for (const e of s.edges) {
        if (e.x0 > x1 || e.x1 < x0 || e.z0 > z1 || e.z1 < z0) continue;
        const next = [];
        for (const pc of pcs) {
          const [px0, pz0, px1, pz1] = bbox(pc);
          if (e.x0 > px1 || e.x1 < px0 || e.z0 > pz1 || e.z1 < pz0) {
            next.push(pc);
            continue;
          }
          for (const q of split(pc, e.ax, e.az, e.nx, e.nz)) if (q) next.push(q);
        }
        pcs = next;
      }
    for (const pc of pcs) {
      let mx = 0,
        mz = 0;
      for (const v of pc) {
        mx += v[0];
        mz += v[2];
      }
      mx /= pc.length;
      mz /= pc.length;
      let hole = false;
      for (const s of ss) if ((hole = s.inside(mx, mz))) break;
      if (!hole) emitPoly(pc, emit);
    }
    return true;
  }
  return { cutTri, touches, empty: !shapes.length };
}
