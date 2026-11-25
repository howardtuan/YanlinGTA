import * as THREE from 'three';
import { freezeStatic } from './Freeze.js';
import { CollisionWorld, SegGrid, pointInPoly, closestOnSeg } from '../physics/Collision.js';
import {
  H,
  Hgrid,
  Hmin,
  terrainGrid,
  addBridge,
  clearBridges,
  DS,
  addPad,
  addStair,
  levelY,
  levelTop,
  groundY,
  STEP_UP,
  addCut,
  LV_DECK,
  pitAt,
  pitRects,
} from './Terrain.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildFurniture } from './Furniture.js';
import { isCourt, paintCourts } from './Court.js';
import {
  groundTex,
  facadeTex,
  facadeParam,
  FACP_TYPES,
  shopTex,
  roofTex,
  corrugatedTex,
  concreteTex,
} from '../graphics/Textures.js';
import { plantVegetation } from './Vegetation.js';
import {
  canvasTexture,
  scaledCanvas,
  markShared,
  markStaticGeometry,
} from '../graphics/GpuMemLifecycle.js';

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- terrain draping ----------
// split a convex polygon [[x,z]..] by the line f(p) = c
function cut(poly, f, c) {
  const lo = [],
    hi = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length];
    const fp = f(p) - c,
      fq = f(q) - c;
    if (fp <= 0) lo.push(p);
    if (fp >= 0) hi.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq),
        m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      lo.push(m);
      hi.push(m);
    }
  }
  return [lo.length > 2 ? lo : null, hi.length > 2 ? hi : null];
}
function sliceBy(poly, f, k0, k1, s, base, out) {
  let mn = Infinity,
    mx = -Infinity;
  for (const p of poly) {
    const v = f(p);
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const a = Math.max(k0, Math.floor((mn - base) / s) + 1),
    b = Math.min(k1, Math.ceil((mx - base) / s) - 1);
  let rest = poly;
  for (let k = a; k <= b && rest; k++) {
    const [lo, hi] = cut(rest, f, base + k * s);
    if (lo) out.push(lo);
    rest = hi;
  }
  if (rest) out.push(rest);
}
const FX = (p) => p[0],
  FZ = (p) => p[1],
  FU = (p) => p[0] - p[1];
// cut a convex polygon so every piece lies in one terrain triangle (H is linear there)
function drapePieces(poly) {
  const T = terrainGrid();
  if (!T) return [poly];
  const { minX, minZ, step: s, nx, nz } = T;
  const a = [],
    b = [],
    c = [];
  sliceBy(poly, FX, 0, nx - 1, s, minX, a);
  for (const p of a) sliceBy(p, FZ, 0, nz - 1, s, minZ, b);
  for (const p of b) sliceBy(p, FU, -(nz - 1), nx - 1, s, minX - minZ, c);
  return c;
}
// Exact draping needs ~3x the triangles, so pieces are only cut as far as needed:
// a piece is kept when the terrain under it stays within TOL_LO above / TOL_HI
// below its plane; everything draped is lifted by TOL_LO so it never dips under.
const TOL_LO = 0.08,
  TOL_HI = 0.1;
function triFits(a, b, c, T) {
  const { minX, minZ, step: s, nx, nz } = T;
  const ha = Hgrid(a[0], a[1]),
    hb = Hgrid(b[0], b[1]),
    hc = Hgrid(c[0], c[1]); // draped layers follow the grid; pits are masked
  const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(det) < 1e-6) return true;
  let ok = true;
  const test = (x, z) => {
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (z - c[1])) / det;
    const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (z - c[1])) / det;
    const d = Hgrid(x, z) - (l1 * ha + l2 * hb + (1 - l1 - l2) * hc);
    if (d > TOL_LO || d < -TOL_HI) ok = false;
  };
  // the terrain is piecewise linear, so the worst point is a grid node inside
  // the triangle or a crossing of a triangle edge with a grid line / diagonal
  const x0 = Math.min(a[0], b[0], c[0]),
    x1 = Math.max(a[0], b[0], c[0]),
    z0 = Math.min(a[1], b[1], c[1]),
    z1 = Math.max(a[1], b[1], c[1]);
  const i0 = Math.max(0, Math.ceil((x0 - minX) / s)),
    i1 = Math.min(nx - 1, Math.floor((x1 - minX) / s));
  const j0 = Math.max(0, Math.ceil((z0 - minZ) / s)),
    j1 = Math.min(nz - 1, Math.floor((z1 - minZ) / s));
  for (let j = j0; j <= j1 && ok; j++)
    for (let i = i0; i <= i1 && ok; i++) {
      const x = minX + i * s,
        z = minZ + j * s;
      if (pointInPoly(x, z, [a, b, c])) test(x, z);
    }
  const edge = (p, q, f, base, k0, k1) => {
    const fp = f(p),
      fq = f(q);
    if (fp === fq) return;
    const lo = Math.max(k0, Math.ceil((Math.min(fp, fq) - base) / s)),
      hi = Math.min(k1, Math.floor((Math.max(fp, fq) - base) / s));
    for (let k = lo; k <= hi && ok; k++) {
      const t = (base + k * s - fp) / (fq - fp);
      test(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t);
    }
  };
  for (const [p, q] of [
    [a, b],
    [b, c],
    [c, a],
  ]) {
    if (!ok) break;
    edge(p, q, FX, minX, 0, nx - 1);
    edge(p, q, FZ, minZ, 0, nz - 1);
    edge(p, q, FU, minX - minZ, -(nz - 1), nx - 1);
  }
  return ok;
}
function adaptPieces(poly, out, S) {
  const T = terrainGrid();
  if (!T) {
    out.push(poly);
    return;
  }
  let fits = true;
  for (let i = 1; i < poly.length - 1 && fits; i++)
    fits = triFits(poly[0], poly[i], poly[i + 1], T);
  if (fits) {
    out.push(poly);
    return;
  }
  if (S <= T.step) {
    out.push(...drapePieces(poly));
    return;
  }
  const a = [],
    b = [];
  sliceBy(poly, FX, -1e9, 1e9, S, T.minX, a);
  for (const p of a) sliceBy(p, FZ, -1e9, 1e9, S, T.minZ, b);
  for (const p of b) adaptPieces(p, out, S / 2);
}

// ---------- geometry accumulator ----------
// drape=true: flat helpers (flatPoly/disc/strip) follow the terrain and their
// y argument becomes the offset above it
const UP = [0, 1, 0];
// ChunkedGeo cell size in metres (perf-refactor/specs/phase-2-render-and-igpu-opt.md): a Geo whose triangles spread wider
// than two cells becomes one mesh per cell. Measured 2026-11-25 (perf-refactor/agent-handoff-log.md Session #010):
// about -16 % triangles per view but +85 % draw calls on the M1; kept at the spec's 120 m by decision.
const GEO_CHUNK = 120;
// what Geo.mesh returns for a chunked Geo: the chunks as children, and the Mesh settings the builders use passed on to
// every chunk (castShadow, receiveShadow, renderOrder on the chunks themselves so they sort exactly like one mesh would).
// Its material is chunkMaterial (all chunks share it).
class ChunkedMesh extends THREE.Object3D {
  constructor(meshes, material) {
    super();
    this.isChunkedMesh = true;
    this.chunks = meshes;
    this._material = material;
    for (const m of meshes) this.add(m);
    for (const key of ['castShadow', 'receiveShadow', 'frustumCulled']) {
      let v = this[key];
      Object.defineProperty(this, key, {
        get: () => v,
        set: (x) => {
          v = x;
          for (const m of this.chunks) m[key] = x;
        },
      });
    }
    let order = 0;
    Object.defineProperty(this, 'renderOrder', {
      get: () => order,
      set: (x) => {
        order = x;
        for (const m of this.chunks) m.renderOrder = x;
      },
    });
  }
  // not `material`: three.js treats anything with a material as something to draw (WebGLRenderer.compile)
  get chunkMaterial() {
    return this._material;
  }
}
class Geo {
  // uvAt: optional [x,z] -> [u,v] for the flat helpers (default: world / 8 m)
  // alpha: colours carry a 4th (alpha) component
  constructor(drape = false, uvAt = null, alpha = false) {
    this.p = [];
    this.n = [];
    this.c = [];
    this.uv = [];
    this.drape = drape;
    this.uvAt = uvAt;
    this.alpha = alpha;
    this.c2 = null;
  }
  // facadeParam walls: every vertex also carries the current accent (.ac) and glass (.gc) colour
  withAccents() {
    this.c2 = [];
    this.c3 = [];
    this.ac = [1, 1, 1];
    this.gc = [0.5, 0.5, 0.5];
    return this;
  }
  tri(a, b, c, col, nrm, uva, uvb, uvc) {
    // a,b,c: [x,y,z]; nrm: desired facing; fix winding
    // col: one [r,g,b] or one per corner [[r,g,b] x3]
    let ca = col,
      cb = col,
      cc = col;
    if (Array.isArray(col[0])) [ca, cb, cc] = col;
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2];
    const vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    const cx = uy * vz - uz * vy,
      cy = uz * vx - ux * vz,
      cz = ux * vy - uy * vx;
    if (cx * nrm[0] + cy * nrm[1] + cz * nrm[2] < 0) {
      [b, c] = [c, b];
      [uvb, uvc] = [uvc, uvb];
      [cb, cc] = [cc, cb];
    }
    this.p.push(...a, ...b, ...c);
    this.n.push(...nrm, ...nrm, ...nrm);
    this.c.push(...ca, ...cb, ...cc);
    if (this.c2)
      for (let k = 0; k < 3; k++) {
        this.c2.push(...this.ac);
        this.c3.push(...this.gc);
      }
    this.uv.push(...(uva || [0, 0]), ...(uvb || [0, 0]), ...(uvc || [0, 0]));
  }
  // col: one [r,g,b] or one per corner (a,b,c,d)
  quad(a, b, c, d, col, nrm, uvs) {
    const pc = Array.isArray(col[0]);
    this.tri(
      a,
      b,
      c,
      pc ? [col[0], col[1], col[2]] : col,
      nrm,
      uvs && uvs[0],
      uvs && uvs[1],
      uvs && uvs[2]
    );
    this.tri(
      a,
      c,
      d,
      pc ? [col[0], col[2], col[3]] : col,
      nrm,
      uvs && uvs[0],
      uvs && uvs[2],
      uvs && uvs[3]
    );
  }
  // convex polygon of [x,z] at height y (or y above the terrain when draping)
  fpoly(pts, y, col) {
    const P = this.drape
      ? (q) => [q[0], Hgrid(q[0], q[1]) + y + TOL_LO, q[1]]
      : (q) => [q[0], y, q[1]];
    const uv = this.uvAt || ((q) => [q[0] / 8, q[1] / 8]);
    let pcs = [pts];
    if (this.drape) {
      pcs = [];
      adaptPieces(pts, pcs, 160);
    }
    for (const pc of pcs) {
      const A = P(pc[0]);
      for (let i = 1; i < pc.length - 1; i++)
        this.tri(A, P(pc[i]), P(pc[i + 1]), col, UP, uv(pc[0]), uv(pc[i]), uv(pc[i + 1]));
    }
  }
  flatPoly(pts, y, col, holes) {
    if (pts.length < 3) return;
    const v2 = (r) => r.map((p) => new THREE.Vector2(p[0], p[1]));
    const hs = (holes || []).filter((h) => h.length > 2);
    const all = hs.length ? pts.concat(...hs) : pts;
    let tris;
    try {
      tris = THREE.ShapeUtils.triangulateShape(v2(pts), hs.map(v2));
    } catch (e) {
      return;
    }
    for (const t of tris) this.fpoly([all[t[0]], all[t[1]], all[t[2]]], y, col);
  }
  disc(x, z, r, y, col, seg = 8) {
    const ring = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      ring.push([x + Math.cos(a) * r, z + Math.sin(a) * r]);
    }
    this.fpoly(ring, y, col);
  }
  strip(a, b, w, y, col, w1 = w) {
    // (w1: the width at b, for a road whose width changes along it)
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = Math.hypot(dx, dz);
    if (l < 0.01) return;
    const nx = ((-dz / l) * w) / 2,
      nz = ((dx / l) * w) / 2,
      mx = ((-dz / l) * w1) / 2,
      mz = ((dx / l) * w1) / 2;
    this.fpoly(
      [
        [a[0] + nx, a[1] + nz],
        [b[0] + mx, b[1] + mz],
        [b[0] - mx, b[1] - mz],
        [a[0] - nx, a[1] - nz],
      ],
      y,
      col
    );
  }
  // box in a local frame: centre (x,z), yaw ang, w along ang, d across, y0..y1 (absolute)
  box(x, z, ang, w, d, y0, y1, col, uvS = 3) {
    const c = Math.cos(ang),
      s = Math.sin(ang);
    const P = (lx, lz) => [x + lx * c - lz * s, z + lx * s + lz * c];
    const pts = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    for (let i = 0; i < 4; i++) {
      const A = pts[i],
        B = pts[(i + 1) % 4],
        ex = B[0] - A[0],
        ez = B[1] - A[1],
        l = Math.hypot(ex, ez) || 1;
      const n = [ez / l, 0, -ex / l];
      if (((A[0] + B[0]) / 2 - x) * n[0] + ((A[1] + B[1]) / 2 - z) * n[2] < 0) {
        n[0] *= -1;
        n[2] *= -1;
      }
      this.quad([A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], col, n, [
        [0, y0 / uvS],
        [l / uvS, y0 / uvS],
        [l / uvS, y1 / uvS],
        [0, y1 / uvS],
      ]);
    }
    this.quad(
      [pts[0][0], y1, pts[0][1]],
      [pts[1][0], y1, pts[1][1]],
      [pts[2][0], y1, pts[2][1]],
      [pts[3][0], y1, pts[3][1]],
      col,
      UP,
      pts.map((p) => [p[0] / uvS, p[1] / uvS])
    );
  }
  // one mesh, or (when the triangles spread wider than two chunks) one mesh per GEO_CHUNK x GEO_CHUNK m cell, so frustum
  // and shadow culling can drop the parts out of view (perf-refactor Phase 2, ChunkedGeo). Triangles go to the cell of
  // their centroid, unchanged: the same pixels, the same random draws.
  mesh(mat) {
    const nt = this.p.length / 9;
    if (nt > 0) {
      const cells = new Map();
      let x0 = Infinity,
        x1 = -Infinity,
        z0 = Infinity,
        z1 = -Infinity;
      for (let t = 0; t < nt; t++) {
        const o = t * 9,
          cx = (this.p[o] + this.p[o + 3] + this.p[o + 6]) / 3,
          cz = (this.p[o + 2] + this.p[o + 5] + this.p[o + 8]) / 3;
        if (cx < x0) x0 = cx;
        if (cx > x1) x1 = cx;
        if (cz < z0) z0 = cz;
        if (cz > z1) z1 = cz;
        const k = `${Math.floor(cx / GEO_CHUNK)},${Math.floor(cz / GEO_CHUNK)}`;
        let l = cells.get(k);
        if (!l) cells.set(k, (l = []));
        l.push(t);
      }
      if (cells.size > 1 && Math.max(x1 - x0, z1 - z0) > GEO_CHUNK * 2) {
        const meshes = [];
        for (const tris of cells.values()) meshes.push(new THREE.Mesh(this._geometry(tris), mat));
        return new ChunkedMesh(meshes, mat);
      }
    }
    return new THREE.Mesh(this._geometry(null), mat);
  }
  // the BufferGeometry of triangles `tris` (null: all of them)
  _geometry(tris) {
    const pick = (src, per) => {
      if (!tris) return src;
      const out = new Float32Array(tris.length * 3 * per),
        w = 3 * per;
      for (let i = 0; i < tris.length; i++) {
        const o = tris[i] * w;
        for (let k = 0; k < w; k++) out[i * w + k] = src[o + k];
      }
      return out;
    };
    const cn = this.alpha ? 4 : 3;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pick(this.p, 3), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pick(this.n, 3), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(pick(this.c, cn), cn));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(pick(this.uv, 2), 2));
    if (this.c2) {
      g.setAttribute('aAccent', new THREE.Float32BufferAttribute(pick(this.c2, 3), 3));
      g.setAttribute('aGlass', new THREE.Float32BufferAttribute(pick(this.c3, 3), 3));
    }
    g.computeBoundingSphere();
    markStaticGeometry(g); // merged world geometry: its CPU arrays go once WebGL has them (GpuMemLifecycle)
    return g;
  }
  get tris() {
    return this.p.length / 9;
  }
}

// ground mesh: the terrain grid plus one 1 km skirt ring holding the edge
// heights (same values H() returns outside the grid), split like H()
function groundGeometry(B) {
  const T = terrainGrid();
  const xs = [],
    zs = [];
  if (T) {
    xs.push(T.minX - 1000);
    for (let i = 0; i < T.nx; i++) xs.push(T.minX + i * T.step);
    xs.push(T.minX + (T.nx - 1) * T.step + 1000);
    zs.push(T.minZ - 1000);
    for (let j = 0; j < T.nz; j++) zs.push(T.minZ + j * T.step);
    zs.push(T.minZ + (T.nz - 1) * T.step + 1000);
  } else {
    xs.push(B.minX - 1000, B.maxX + 1000);
    zs.push(B.minZ - 1000, B.maxZ + 1000);
  }
  const X = xs.length,
    Z = zs.length;
  const pos = new Float32Array(X * Z * 3);
  for (let j = 0; j < Z; j++)
    for (let i = 0; i < X; i++) {
      const k = (j * X + i) * 3;
      pos[k] = xs[i];
      pos[k + 1] = Hgrid(xs[i], zs[j]);
      pos[k + 2] = zs[j]; // pits are masked, not drawn into the grid
    }
  const idx = [];
  for (let j = 0; j < Z - 1; j++)
    for (let i = 0; i < X - 1; i++) {
      const a = j * X + i,
        b = a + 1,
        c = a + X,
        d = c + 1;
      // diagonal a-d, counter-clockwise seen from above (+y)
      idx.push(a, d, b, a, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// ---------- grade separations (tools/overrides.json 'grade') ----------
// One item per viaduct / footbridge / road cut: helpers in metres s along its
// centreline (tools/build_map.py build_grade turned the anchors into [s, v]).
const CUT_WALL = 0.4; // retaining wall beside a cut
const RAMP_SOLID = 3.2; // a viaduct lower than this above the ground is a solid ramp (walls, nothing passes under)
function gradeItems(data) {
  const out = {};
  const lerp = (pr, s) => {
    if (s <= pr[0][0]) return pr[0][1];
    for (let i = 1; i < pr.length; i++)
      if (s <= pr[i][0])
        return (
          pr[i - 1][1] +
          ((pr[i][1] - pr[i - 1][1]) * (s - pr[i - 1][0])) / (pr[i][0] - pr[i - 1][0] || 1)
        );
    return pr[pr.length - 1][1];
  };
  for (const g of data.grade || []) {
    const P = g.path,
      cum = [0];
    for (let i = 1; i < P.length; i++)
      cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    // point and unit direction at s
    const at = (s) => {
      let i = 0;
      while (i < P.length - 2 && s > cum[i + 1]) i++;
      const l = cum[i + 1] - cum[i] || 1,
        t = Math.max(0, Math.min(1, (s - cum[i]) / l));
      const ux = (P[i + 1][0] - P[i][0]) / l,
        uz = (P[i + 1][1] - P[i][1]) / l;
      return { x: P[i][0] + ux * l * t, z: P[i][1] + uz * l * t, ux, uz };
    };
    const proj = (x, z) => {
      let best = Infinity,
        bs = 0;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i],
          b = P[i + 1],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
        const d = Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
        if (d < best) {
          best = d;
          bs = cum[i] + Math.sqrt(l2) * t;
        }
      }
      return bs;
    };
    const pr = g.prof,
      on = pr.map((p, i) => (p[1] > 0 ? i : -1)).filter((i) => i >= 0);
    // the stretch off the ground: from the zero anchor before the first raised / sunk one to the one after
    const s0 = on.length ? pr[Math.max(0, on[0] - 1)][0] : 0,
      s1 = on.length ? pr[Math.min(pr.length - 1, on[on.length - 1] + 1)][0] : cum[cum.length - 1];
    // decks join their anchors' absolute heights; a cut floor follows the ground along its centre
    const abs = pr.map(([q, v]) => {
      const p = at(q);
      return [q, H(p.x, p.z) + v];
    });
    const y =
      g.kind === 'cut'
        ? (q) => {
            const p = at(q);
            return H(p.x, p.z) - lerp(pr, q);
          }
        : (q) => lerp(abs, q);
    out[g.id] = {
      ...g,
      cum,
      len: cum[cum.length - 1],
      at,
      proj,
      val: (q) => lerp(pr, q),
      y,
      s0,
      s1,
    };
  }
  return out;
}
// open (unroofed) stretches of the cuts as rectangles [cx, cz, ux, uz, half length, half width]
function cutRects(items) {
  const R = [];
  for (const g of Object.values(items)) {
    if (g.kind !== 'cut') continue;
    const open = g.roof
      ? [
          [g.s0, g.roof[0]],
          [g.roof[1], g.s1],
        ]
      : [[g.s0, g.s1]];
    for (const [a, b] of open)
      for (let i = 0; i < g.path.length - 1; i++) {
        const lo = Math.max(a, g.cum[i]),
          hi = Math.min(b, g.cum[i + 1]);
        if (hi - lo < 0.1) continue;
        const p = g.at((lo + hi) / 2);
        R.push([p.x, p.z, p.ux, p.uz, (hi - lo) / 2, g.w / 2 + CUT_WALL]);
      }
  }
  return R;
}
// ---------- sunk water (tools/water.json, carried into data as area / waterway 'sink') ----------
// Ponds and streams sit below the ground round them. The terrain grid (10 m) cannot hold a
// bank, so like the open road cut the ground and draped layers are masked over the water and
// its banks (sinkPlan().glsl in cutMask) and src/world/MapBuilder.js draws water, banks, railings and caps.
const SINK_COPE = 0.3; // concrete coping on top of a wall
const sideOf = (nx, nz) =>
  Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 'e' : 'w') : nz > 0 ? 's' : 'n';
const segDist = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax,
    dz = bz - az,
    l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
};
function sinkPlan(data) {
  const roads = data.roads
    .filter((r) => r.pts && r.pts.length > 1)
    .map((r) => {
      let a = 1e9,
        b = 1e9,
        c = -1e9,
        d = -1e9;
      for (const [x, z] of r.pts) {
        a = Math.min(a, x);
        b = Math.min(b, z);
        c = Math.max(c, x);
        d = Math.max(d, z);
      }
      return { pts: r.pts, hw: (r.w || 4) / 2, box: [a - r.w, b - r.w, c + r.w, d + r.w] };
    });
  // clear distance from (x,z) to the nearest road surface
  const roadGap = (x, z) => {
    let g = Infinity;
    for (const r of roads) {
      if (x < r.box[0] - 12 || x > r.box[2] + 12 || z < r.box[1] - 12 || z > r.box[3] + 12)
        continue;
      for (let i = 0; i < r.pts.length - 1; i++)
        g = Math.min(g, segDist(x, z, ...r.pts[i], ...r.pts[i + 1]) - r.hw);
    }
    return g;
  };
  const sunkAreas = data.areas.filter((a) => a.kind === 'water' && a.sink);
  const areas = [];
  for (const a of sunkAreas) {
    const P = a.pts.slice();
    let s2 = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i],
        q = P[(i + 1) % P.length];
      s2 += p[0] * q[1] - q[0] * p[1];
    }
    if (s2 < 0) P.reverse(); // counter-clockwise in (x, z): the outside is right of each edge
    const sides = a.sink.sides || {},
      edges = [];
    for (let i = 0; i < P.length; i++) {
      const A = P[i],
        Bq = P[(i + 1) % P.length],
        l = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) || 1;
      const n = [(Bq[1] - A[1]) / l, -(Bq[0] - A[0]) / l];
      const spec = {
        bank: 'wall',
        rail: 'none',
        ...(sides.all || {}),
        ...(sides[sideOf(n[0], n[1])] || {}),
      };
      let wall = spec.bank !== 'slope',
        off = SINK_COPE;
      if (!wall) {
        // a slope bank never reaches a road: steeper where there is no room
        let room = Infinity;
        for (let k = 0; k <= 4; k++)
          room = Math.min(
            room,
            roadGap(A[0] + ((Bq[0] - A[0]) * k) / 4, A[1] + ((Bq[1] - A[1]) * k) / 4)
          );
        off = Math.min(spec.run || 2, room - 0.6);
        if (off < 0.6) {
          wall = true;
          off = SINK_COPE;
        }
      }
      edges.push({ A, B: Bq, n, spec, wall, off, len: l });
    }
    // outer ring: each edge pushed out by its bank, corners where the offset lines meet
    const O = P.map((p, j) => {
      const e0 = edges[(j - 1 + P.length) % P.length],
        e1 = edges[j];
      const a0 = [p[0] + e0.n[0] * e0.off, p[1] + e0.n[1] * e0.off],
        a1 = [p[0] + e1.n[0] * e1.off, p[1] + e1.n[1] * e1.off];
      const d0 = [-e0.n[1], e0.n[0]],
        d1 = [-e1.n[1], e1.n[0]],
        cr = d0[0] * d1[1] - d0[1] * d1[0];
      if (Math.abs(cr) > 0.15) {
        const t = ((a1[0] - a0[0]) * d1[1] - (a1[1] - a0[1]) * d1[0]) / cr,
          q = [a0[0] + d0[0] * t, a0[1] + d0[1] * t];
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 3 * Math.max(e0.off, e1.off) + 0.5) return q;
      }
      return [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2];
    });
    edges.forEach((e, i) => {
      e.oA = O[i];
      e.oB = O[(i + 1) % P.length];
    });
    areas.push({ area: a, P, O, edges, drop: a.sink.drop });
  }
  // streams: the parts not under a road (crossings = culverts / bridges) and not inside a sunk area
  const inSunkArea = (x, z) => areas.some((s) => pointInPoly(x, z, s.P));
  const runs = [];
  for (const w of data.waterways) {
    if (!w.sink) continue;
    const pts = w.pts,
      cum = [0];
    for (let i = 1; i < pts.length; i++)
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1],
      top = w.sink.top || w.w + 1;
    const at = (s) => {
      let i = 0;
      while (i < pts.length - 2 && cum[i + 1] < s) i++;
      const t = (s - cum[i]) / (cum[i + 1] - cum[i] || 1);
      return [
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
      ];
    };
    const shut = []; // covered intervals [s0, s1]
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i],
        Bq = pts[i + 1],
        dx = Bq[0] - A[0],
        dz = Bq[1] - A[1],
        l = Math.hypot(dx, dz) || 1;
      for (const r of roads) {
        if (
          Math.max(A[0], Bq[0]) < r.box[0] ||
          Math.min(A[0], Bq[0]) > r.box[2] ||
          Math.max(A[1], Bq[1]) < r.box[1] ||
          Math.min(A[1], Bq[1]) > r.box[3]
        )
          continue;
        for (let k = 0; k < r.pts.length - 1; k++) {
          const C = r.pts[k],
            D = r.pts[k + 1],
            ex = D[0] - C[0],
            ez = D[1] - C[1],
            cr = dx * ez - dz * ex;
          if (Math.abs(cr) < 1e-6) continue;
          const t = ((C[0] - A[0]) * ez - (C[1] - A[1]) * ex) / cr,
            u = ((C[0] - A[0]) * dz - (C[1] - A[1]) * dx) / cr;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const sin = Math.max(0.35, Math.abs(cr) / (l * (Math.hypot(ex, ez) || 1))),
            cos = Math.sqrt(1 - sin * sin);
          const c = (r.hw + 0.8) / sin + ((top / 2) * cos) / sin,
            s = cum[i] + t * l;
          shut.push([s - c, s + c]);
        }
      }
    }
    for (let s = 0; s <= L; s += 1) {
      const p = at(s);
      if (inSunkArea(p[0], p[1])) shut.push([s - 1, s + 1]);
    }
    shut.sort((a, b) => a[0] - b[0]);
    let s0 = 0;
    const open = [];
    for (const [a, b] of shut) {
      if (a > s0) open.push([s0, a]);
      s0 = Math.max(s0, b);
    }
    if (s0 < L) open.push([s0, L]);
    for (const [a, b] of open) {
      if (b - a < 2) continue;
      const rp = [at(a), ...pts.filter((p, i) => cum[i] > a + 0.3 && cum[i] < b - 0.3), at(b)];
      runs.push({ pts: rp, spec: w.sink, w: w.w, top });
    }
  }
  // a run that ends where the next piece of the stream begins (data splits a stream where its
  // profile changes) is joined there: no culvert wall across it
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.6;
  for (const r of runs) {
    const e0 = r.pts[0],
      e1 = r.pts[r.pts.length - 1];
    r.join = [false, false];
    for (const o of runs)
      if (o !== r)
        for (const q of [o.pts[0], o.pts[o.pts.length - 1]]) {
          if (near(e0, q)) r.join[0] = true;
          if (near(e1, q)) r.join[1] = true;
        }
  }
  // mask: outer rings (point in polygon) and the stream strips (rectangles + joint discs), each behind a bbox test
  const f = (v) => v.toFixed(2);
  const glsl = [];
  const holes = [];
  for (const s of areas) {
    const xs = s.O.map((p) => p[0]),
      zs = s.O.map((p) => p[1]);
    const ed = s.O.map((a, i) => {
      const b = s.O[(i + 1) % s.O.length];
      return `a = vec2(${f(a[0])}, ${f(a[1])}); b = vec2(${f(b[0])}, ${f(b[1])}); if ((a.y > cd.y) != (b.y > cd.y) && cd.x < (b.x - a.x) * (cd.y - a.y) / (b.y - a.y) + a.x) ins = !ins;`;
    });
    glsl.push(
      `if (vCutW.x > ${f(Math.min(...xs))} && vCutW.x < ${f(Math.max(...xs))} && vCutW.y > ${f(Math.min(...zs))} && vCutW.y < ${f(Math.max(...zs))}) { cd = vCutW; ins = false;\n    ${ed.join('\n    ')}\n    if (ins) discard; }`
    );
    holes.push({ poly: s.O });
  }
  for (const r of runs) {
    const hw = r.top / 2 + (r.spec.bank === 'slope' ? 0.1 : SINK_COPE),
      tests = [];
    let x0 = 1e9,
      z0 = 1e9,
      x1 = -1e9,
      z1 = -1e9;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const A = r.pts[i],
        Bq = r.pts[i + 1],
        l = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) || 1,
        ux = (Bq[0] - A[0]) / l,
        uz = (Bq[1] - A[1]) / l;
      const cx = (A[0] + Bq[0]) / 2,
        cz = (A[1] + Bq[1]) / 2;
      tests.push(
        `cd = vCutW - vec2(${f(cx)}, ${f(cz)}); if (abs(dot(cd, vec2(${f(ux)}, ${f(uz)}))) < ${f(l / 2)} && abs(dot(cd, vec2(${f(-uz)}, ${f(ux)}))) < ${f(hw)}) discard;`
      );
      if (i > 0 || r.join[0])
        tests.push(
          `cd = vCutW - vec2(${f(A[0])}, ${f(A[1])}); if (dot(cd, cd) < ${f(hw * hw)}) discard;`
        );
      if (i === r.pts.length - 2 && r.join[1])
        tests.push(
          `cd = vCutW - vec2(${f(Bq[0])}, ${f(Bq[1])}); if (dot(cd, cd) < ${f(hw * hw)}) discard;`
        );
      holes.push({ seg: [A, Bq, hw] });
      for (const p of [A, Bq]) {
        x0 = Math.min(x0, p[0]);
        z0 = Math.min(z0, p[1]);
        x1 = Math.max(x1, p[0]);
        z1 = Math.max(z1, p[1]);
      }
    }
    glsl.push(
      `if (vCutW.x > ${f(x0 - hw)} && vCutW.x < ${f(x1 + hw)} && vCutW.y > ${f(z0 - hw)} && vCutW.y < ${f(z1 + hw)}) {\n    ${tests.join('\n    ')} }`
    );
  }
  // (x, z) within r of the water or its banks (plants there are hidden)
  const inside = (x, z, r = 0) =>
    holes.some((h) =>
      h.poly
        ? pointInPoly(x, z, h.poly) ||
          (r > 0 &&
            h.poly.some((a, i) => segDist(x, z, ...a, ...h.poly[(i + 1) % h.poly.length]) < r))
        : segDist(x, z, ...h.seg[0], ...h.seg[1]) < h.seg[2] + r
    );
  return {
    areas,
    runs,
    glsl: glsl.length ? `vec2 a, b; bool ins;\n  ${glsl.join('\n  ')}` : '',
    inside,
  };
}

// ground and draped layers are not drawn over an open cut (the cut is drawn below them)
// nor over sunk water and its banks (extra: sinkPlan().glsl)
function cutMask(m, R, extra = '') {
  if (!R.length && !extra) return m;
  const f = (v) => v.toFixed(3);
  const test = R.map(
    ([x, z, ux, uz, hl, hw]) =>
      `cd = vCutW - vec2(${f(x)}, ${f(z)}); if (abs(dot(cd, vec2(${f(ux)}, ${f(uz)}))) < ${f(hl)} && abs(dot(cd, vec2(${f(-uz)}, ${f(ux)}))) < ${f(hw)}) discard;`
  )
    .concat(extra ? [extra] : [])
    .join('\n  ');
  const prev = m.onBeforeCompile,
    key = m.customProgramCacheKey;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.vertexShader = `varying vec2 vCutW;\n${sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vCutW = (modelMatrix * vec4(transformed, 1.0)).xz;')}`;
    sh.fragmentShader = `varying vec2 vCutW;\n${sh.fragmentShader.replace('void main() {', `void main() {\n  vec2 cd;\n  ${test}`)}`;
  };
  m.customProgramCacheKey = () => `${key.call(m)}_cut`;
  return m;
}

const col = (h) => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
};
const inArea = (x, z, p) =>
  pointInPoly(x, z, p) && !(p.holes && p.holes.some((h) => pointInPoly(x, z, h)));

// oriented frame along the longest edge: u along it, v across
function obb(pts) {
  let li = 0,
    ll = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      c = pts[(i + 1) % pts.length],
      l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (l > ll) {
      ll = l;
      li = i;
    }
  }
  const a0 = pts[li],
    a1 = pts[(li + 1) % pts.length],
    ux = (a1[0] - a0[0]) / (ll || 1),
    uz = (a1[1] - a0[1]) / (ll || 1);
  let u0 = 1e9,
    u1 = -1e9,
    v0 = 1e9,
    v1 = -1e9;
  for (const p of pts) {
    const u = (p[0] - a0[0]) * ux + (p[1] - a0[1]) * uz,
      v = (p[0] - a0[0]) * -uz + (p[1] - a0[1]) * ux;
    u0 = Math.min(u0, u);
    u1 = Math.max(u1, u);
    v0 = Math.min(v0, v);
    v1 = Math.max(v1, v);
  }
  return {
    u0,
    u1,
    v0,
    v1,
    ux,
    uz,
    P: (u, v) => [a0[0] + ux * u - uz * v, a0[1] + uz * u + ux * v],
  };
}
const polyArea = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
};
const hashStr = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// ---------- textures ----------
// canvas from src/graphics/GpuMemLifecycle.js (stored at the tier's texture scale)
function canvasTex(w, h, draw, repeat = true) {
  return canvasTexture(w, h, draw, repeat);
}

// facade base patterns for OSM building:material; drawn light grey so the
// per-building vertex tint still sets the colour
const FACADE = {
  brick(g, x, y, S) {
    g.fillStyle = '#f4f4f4';
    g.fillRect(x, y, S, S);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    for (let k = 0, r = 0; k < S; k += 5, r++) {
      g.fillRect(x, y + k, S, 1);
      for (let j = (r % 2) * 6; j < S; j += 12) g.fillRect(x + j, y + k, 1, 5);
    }
  },
  tiles(g, x, y, S) {
    g.fillStyle = '#f6f6f6';
    g.fillRect(x, y, S, S);
    g.fillStyle = 'rgba(0,0,0,0.1)';
    for (let k = 0, r = 0; k < S; k += 4, r++) {
      g.fillRect(x, y + k, S, 1);
      for (let j = (r % 2) * 8; j < S; j += 16) g.fillRect(x + j, y + k, 1, 4);
    }
  },
  concrete(g, x, y, S, rnd) {
    g.fillStyle = '#f0f0f0';
    g.fillRect(x, y, S, S);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.05})`;
      g.fillRect(x + rnd() * S, y + rnd() * S, 1.5, 1.5);
    }
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(x, y + S / 2, S, 1);
    g.fillRect(x + S / 2, y, 1, S);
  },
  stone(g, x, y, S, rnd) {
    for (let k = 0, r = 0; k < S; k += 10, r++)
      for (let j = -(r % 2) * 8; j < S; j += 16) {
        const v = 225 + Math.floor(rnd() * 25);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x + Math.max(0, j), y + k, 16, 10);
      }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let k = 0, r = 0; k < S; k += 10, r++) {
      g.fillRect(x, y + k, S, 1);
      for (let j = (r % 2) * 8; j < S; j += 16) g.fillRect(x + j, y + k, 1, 10);
    }
  },
  plaster(g, x, y, S, rnd) {
    g.fillStyle = '#fafafa';
    g.fillRect(x, y, S, S);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(0,0,0,${rnd() * 0.04})`;
      g.fillRect(x + rnd() * S, y + rnd() * S, 3, 2);
    }
  },
  wood(g, x, y, S, rnd) {
    for (let j = 0; j < S; j += 6) {
      const v = 220 + Math.floor(rnd() * 30);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x + j, y, 6, S);
    }
    g.fillStyle = 'rgba(0,0,0,0.2)';
    for (let j = 0; j < S; j += 6) g.fillRect(x + j, y, 1, S);
  },
  metal(g, x, y, S) {
    for (let j = 0; j < S; j += 4) {
      g.fillStyle = '#f2f2f2';
      g.fillRect(x + j, y, 2, S);
      g.fillStyle = '#d4d4d4';
      g.fillRect(x + j + 2, y, 2, S);
    }
  },
};
// OSM building:material values -> facade pattern
const MAT_KEY = {
  brick: 'brick',
  concrete: 'concrete',
  cement_block: 'concrete',
  reinforced_concrete: 'concrete',
  glass: 'glass',
  mirror: 'glass',
  metal: 'metal',
  steel: 'metal',
  aluminium: 'metal',
  metal_plates: 'metal',
  stone: 'stone',
  sandstone: 'stone',
  limestone: 'stone',
  granite: 'stone',
  marble: 'stone',
  plaster: 'plaster',
  wood: 'wood',
  timber_framing: 'wood',
  bamboo: 'wood',
  tile: 'tiles',
  tiles: 'tiles',
  ceramic: 'tiles',
};

// Facade atlas: 8x8 cells, one cell = one bay x one storey. The pattern is drawn
// light grey so the per-building vertex tint sets the colour.
//   campus   neat square tiles + continuous window band (ribbon windows)
//   glass    curtain wall (newer campus buildings)
//   concrete fair-faced concrete (清水模) with punched windows
//   town     透天: 二丁掛 tiles, one window per bay with iron grille, AC units
//   apt      公寓: tiles, wide grilled windows, balcony rail, more AC units
//   wash     洗石子 / plaster, small aluminium windows
//   arcade   one round-arched opening per bay and storey (懷恩樓 loggias)
const TILE2 = (g, x, y, S, a) => {
  // 二丁掛: long thin tiles in running bond
  g.fillStyle = `rgba(0,0,0,${a})`;
  for (let k = 0, r = 0; k < S; k += 3, r++) {
    g.fillRect(x, y + k, S, 0.7);
    for (let j = (r % 2) * 4; j < S; j += 8) g.fillRect(x + j, y + k, 0.7, 3);
  }
};
function cellBase(style, mat, g, x, y, S, rnd) {
  if (FACADE[mat]) {
    FACADE[mat](g, x, y, S, rnd);
    return;
  }
  if (style === 'campus') {
    g.fillStyle = '#fbfbfb';
    g.fillRect(x, y, S, S);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let k = 0; k < S; k += 4) {
      g.fillRect(x, y + k, S, 0.7);
      g.fillRect(x + k, y, 0.7, S);
    }
  } else if (style === 'concrete') {
    g.fillStyle = '#f2f2f0';
    g.fillRect(x, y, S, S);
    for (let i = 0; i < 50; i++) {
      g.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.05})`;
      g.fillRect(x + rnd() * S, y + rnd() * S, 2, 1.5);
    }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(x, y + S / 2, S, 0.8);
    g.fillRect(x, y, S, 0.8);
    g.fillRect(x + S / 2, y, 0.8, S);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (const [u, v] of [
      [8, 8],
      [24, 8],
      [40, 8],
      [56, 8],
      [8, 40],
      [24, 40],
      [40, 40],
      [56, 40],
    ])
      g.fillRect(x + u, y + v, 1.2, 1.2);
  } else if (style === 'wash') {
    g.fillStyle = '#f3f3f1';
    g.fillRect(x, y, S, S);
    for (let i = 0; i < 160; i++) {
      const v = rnd() < 0.5 ? 0 : 255;
      g.fillStyle = `rgba(${v},${v},${v},${0.05 + rnd() * 0.08})`;
      g.fillRect(x + rnd() * S, y + rnd() * S, 1, 1);
    }
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.fillRect(x, y + S - 3, S, 1.2);
  } else {
    g.fillStyle = '#ffffff';
    g.fillRect(x, y, S, S);
    TILE2(g, x, y, S, style === 'apt' ? 0.07 : 0.1);
  }
}
// window rectangle per style (also used for the night glow)
const WIN = {
  campus: [0, 18, 64, 26],
  concrete: [14, 16, 36, 30],
  glass: [2, 2, 60, 50],
  town: [14, 16, 36, 32],
  apt: [8, 14, 48, 30],
  wash: [18, 18, 28, 26],
  arcade: [12, 12, 40, 52],
};
// round-arched opening inside the arcade window rect (open at the bottom)
const archPath = (g, x, y, k = 1) => {
  const [wx, wy, ww, wh] = WIN.arcade,
    r = (ww / 2) * k;
  g.beginPath();
  g.moveTo(x + wx * k, y + (wy + wh) * k);
  g.lineTo(x + wx * k, y + wy * k + r);
  g.arc(x + (wx + ww / 2) * k, y + wy * k + r, r, Math.PI, 0);
  g.lineTo(x + (wx + ww) * k, y + (wy + wh) * k);
  g.closePath();
};
function windowTextures(style, seed, mat) {
  const rnd = mulberry32(seed);
  const N = 8,
    S = 64,
    E = 32; // emissive map at half resolution
  if (mat === 'glass') style = 'glass';
  const lit = [];
  for (let i = 0; i < N * N; i++)
    lit.push(rnd() < 0.38 ? (rnd() < 0.7 ? '#ffd58a' : '#cfe6ff') : null);
  const ac = [];
  for (let i = 0; i < N * N; i++) ac.push(rnd() < (style === 'apt' ? 0.45 : 0.3));
  const map = canvasTex(N * S, N * S, (g) => {
    for (let iy = 0; iy < N; iy++)
      for (let ix = 0; ix < N; ix++) {
        const x = ix * S,
          y = iy * S;
        if (style === 'glass') {
          g.fillStyle = '#ffffff';
          g.fillRect(x, y, S, S);
          g.fillStyle = '#5d6f7f';
          g.fillRect(x + 2, y + 2, S - 4, S - 14);
          g.fillStyle = 'rgba(220,235,250,0.35)';
          g.fillRect(x + 4, y + 4, (S - 8) / 2, S - 18);
          g.fillStyle = '#c8ccd0';
          g.fillRect(x + S / 2 - 1, y + 2, 2, S - 14);
          continue;
        }
        cellBase(style, mat, g, x, y, S, rnd);
        const [wx, wy, ww, wh] = WIN[style] || WIN.town;
        if (style === 'arcade') {
          // deep loggia: dark opening, lit soffit band, brick voussoir ring
          g.fillStyle = '#3e3832';
          archPath(g, x, y);
          g.fill();
          g.fillStyle = 'rgba(255,240,215,0.18)';
          g.fillRect(x + wx + 3, y + wy + ww / 2, ww - 6, 6);
          g.fillStyle = '#5d554c';
          g.fillRect(x + wx + 4, y + wy + wh - 18, ww - 8, 18);
          g.strokeStyle = 'rgba(0,0,0,0.28)';
          g.lineWidth = 2.5;
          archPath(g, x, y);
          g.stroke();
          g.fillStyle = 'rgba(0,0,0,0.2)';
          g.fillRect(x, y + S - 3, S, 3);
          continue;
        }
        if (style === 'campus') {
          // ribbon: the band runs across the whole cell so neighbours join up
          g.fillStyle = '#2d3b4c';
          g.fillRect(x, y + wy, S, wh);
          g.fillStyle = 'rgba(160,190,220,0.3)';
          g.fillRect(x, y + wy + 2, S, wh / 2 - 2);
          g.fillStyle = '#d6d2ca';
          for (let k = 0; k < S; k += 16) g.fillRect(x + k, y + wy, 2, wh);
          g.fillStyle = 'rgba(0,0,0,0.22)';
          g.fillRect(x, y + wy + wh, S, 3);
          continue;
        }
        g.fillStyle = '#34404a';
        g.fillRect(x + wx, y + wy, ww, wh);
        g.fillStyle = 'rgba(150,180,200,0.3)';
        g.fillRect(x + wx + 2, y + wy + 2, ww / 3, wh - 4);
        if (style === 'concrete' || style === 'wash') {
          // aluminium frame + mullion
          g.fillStyle = '#c9cbcc';
          g.fillRect(x + wx + ww / 2 - 1, y + wy, 2, wh);
          g.strokeStyle = '#b8babb';
          g.lineWidth = 1.5;
          g.strokeRect(x + wx, y + wy, ww, wh);
        }
        if (style === 'town' || style === 'apt' || style === 'wash') {
          // 鐵窗: a frame sticking out from the wall + bars
          const gc = style === 'wash' ? 'rgba(235,235,230,0.85)' : 'rgba(45,45,45,0.7)';
          g.strokeStyle = gc;
          g.lineWidth = 1.5;
          g.strokeRect(x + wx - 2, y + wy - 2, ww + 4, wh + 4);
          g.fillStyle = gc;
          for (let k = x + wx + 2; k < x + wx + ww; k += 5) g.fillRect(k, y + wy - 2, 1.2, wh + 4);
          g.fillRect(x + wx - 2, y + wy + wh * 0.5, ww + 4, 1.2);
        }
        if (style === 'apt') {
          // balcony rail along the slab
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x, y + S - 12, S, 2);
          g.fillStyle = 'rgba(0,0,0,0.12)';
          for (let k = 0; k < S; k += 4) g.fillRect(x + k, y + S - 12, 1, 10);
        }
        if (style !== 'concrete' && ac[iy * N + ix]) {
          // split AC outdoor unit on a bracket
          const ax = x + (style === 'apt' ? 44 : S - 20),
            ay = y + S - 16;
          g.fillStyle = '#e8e8e2';
          g.fillRect(ax, ay, 16, 11);
          g.fillStyle = '#9a9a96';
          g.beginPath();
          g.arc(ax + 6, ay + 5.5, 4, 0, 6.3);
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(ax, ay + 11, 16, 1.5);
          // rust streak under the unit
          g.fillStyle = 'rgba(90,60,40,0.12)';
          g.fillRect(ax + 3, ay + 12, 2, 10);
        }
      }
  });
  const emi = canvasTex(N * E, N * E, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, N * E, N * E);
    const [wx, wy, ww, wh] = WIN[style] || WIN.town,
      k = E / S;
    for (let iy = 0; iy < N; iy++)
      for (let ix = 0; ix < N; ix++) {
        const l = lit[iy * N + ix];
        if (!l) continue;
        g.fillStyle = l;
        if (style === 'arcade') {
          archPath(g, ix * E, iy * E, k);
          g.fill();
          continue;
        }
        g.fillRect(ix * E + wx * k, iy * E + wy * k, ww * k, wh * k);
      }
  });
  return { map, emi };
}

// Roof atlas: left half plain (flat roofs, parapets), right half corrugated
// sheet ribs that repeat along v (rooftop 鐵皮加蓋).
function roofTexture() {
  const t = canvasTex(64, 256, (g) => {
    g.fillStyle = '#f2f2f2';
    g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 8) {
      g.fillStyle = '#ffffff';
      g.fillRect(32, y, 32, 3);
      g.fillStyle = '#c9c9c9';
      g.fillRect(32, y + 4, 32, 3);
    }
  });
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}
const RIB = 0.25; // metres per rib; 32 ribs per texture repeat

// Tileable multiplier textures (no colour space: values multiply the vertex colour)
function noiseTex(size, seed, draw) {
  const t = canvasTex(size, size, (g) => draw(g, size, mulberry32(seed)));
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
// 補建街區 ground (tools/block_survey.json): 256 px = 24 m of fields, three
// 8 m plots with crop rows and a pale 田埂 between them; bare soil for dirt
const farmTex = () =>
  noiseTex(256, 5101, (g, S, r) => {
    const P = S / 3;
    for (let k = 0; k < 3; k++) {
      const v = 200 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(k * P, 0, P, S);
      g.fillStyle = 'rgba(0,0,0,0.13)';
      for (let x = k * P + 4; x < (k + 1) * P - 4; x += 8.5) g.fillRect(x, 0, 3, S);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
        g.fillRect(k * P + r() * P, r() * S, 2, 3);
      }
    }
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) g.fillRect(k * P - 3, 0, 6, S);
    g.fillRect(0, S / 2 - 3, S, 6);
  });

// one tiny canvas only for measuring label text
let labelMeasure = null;
export function labelTexture(text, opt = {}) {
  const fs = opt.size || 44,
    pad = 14,
    font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  if (!labelMeasure) {
    const mc = document.createElement('canvas');
    mc.width = mc.height = 1;
    labelMeasure = mc.getContext('2d');
  }
  let tw = text.length * fs;
  if (labelMeasure) {
    labelMeasure.font = font;
    tw = labelMeasure.measureText(text).width;
  }
  const W = Math.ceil(tw) + pad * 2 + (opt.icon ? fs : 0),
    Hh = fs + pad * 2;
  // stored at the tier's texture scale (src/graphics/GpuMemLifecycle.js), drawn in W x Hh units
  const { cv, g } = scaledCanvas(W, Hh);
  markShared(cv); // static (relabel makes a new one)
  if (g) {
    g.font = font;
    g.fillStyle = opt.bg || 'rgba(12,14,26,0.78)';
    const r = 12;
    g.beginPath();
    g.roundRect(0, 0, W, Hh, r);
    g.fill();
    if (opt.border) {
      g.strokeStyle = opt.border;
      g.lineWidth = 4;
      g.stroke();
    }
    g.fillStyle = opt.color || '#fff';
    g.textBaseline = 'middle';
    g.fillText((opt.icon || '') + text, pad, Hh / 2 + 2);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: W / Hh };
}

export function makeLabel(text, opt = {}) {
  const { tex, aspect } = labelTexture(text, opt);
  const m = new THREE.SpriteMaterial({
    map: tex,
    depthTest: opt.depthTest ?? true,
    transparent: true,
    fog: false,
  });
  const s = new THREE.Sprite(m);
  const h = opt.height || 3;
  s.scale.set(h * aspect, h, 1);
  s.renderOrder = 10;
  s.layers.set(LABEL_LAYER); // the main camera shows this layer except while you take photos (src/ui/PhotoMode.js)
  s.userData.label = { text, opt };
  return s;
}
// change the text of a label made by makeLabel (same sprite, same place; the style stays)
export function relabel(s, text) {
  const L = s.userData.label;
  if (!L || L.text === text) return;
  const { tex, aspect } = labelTexture(text, L.opt),
    h = L.opt.height || 3;
  s.material.map?.dispose();
  s.material.map = tex;
  s.material.needsUpdate = true;
  s.scale.set(h * aspect, h, 1);
  L.text = text;
}
export const LABEL_LAYER = 3;

export function bannerTexture() {
  return canvasTex(
    1024,
    512,
    (g) => {
      const gr = g.createLinearGradient(0, 0, 1024, 512);
      gr.addColorStop(0, '#1d3fd1');
      gr.addColorStop(1, '#0b1a66');
      g.fillStyle = gr;
      g.fillRect(0, 0, 1024, 512);
      g.fillStyle = '#ffd23f';
      g.fillRect(0, 0, 1024, 26);
      g.fillRect(0, 486, 1024, 26);
      g.beginPath();
      g.arc(150, 256, 115, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0b1a66';
      g.font = '900 130px system-ui';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('34', 150, 262);
      g.textAlign = 'left';
      g.fillStyle = '#fff';
      g.font = '800 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
      g.fillText('第34屆 資管系學會會長候選人', 300, 92);
      g.fillStyle = '#ffffff';
      g.font = '900 150px "Noto Sans TC","Microsoft JhengHei",sans-serif';
      g.fillText('資管要贏', 292, 236);
      g.fillStyle = '#ffd23f';
      g.fillText('票投彥霖', 292, 400);
    },
    false
  );
}

// soft vertical gradient used for the street-lamp light cones
function coneTexture() {
  return canvasTex(
    8,
    128,
    (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,214,150,1)');
      gr.addColorStop(0.25, 'rgba(255,200,130,0.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = '#000';
      g.fillRect(0, 0, 8, 128);
      g.fillStyle = gr;
      g.fillRect(0, 0, 8, 128);
    },
    false
  );
}

// big low-frequency variation so tiled ground textures don't look tiled
function addMacro(m, scale, amt) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.macroMap = { value: groundTex.macro() };
    sh.vertexShader = `varying vec2 vMacroW;\n${sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMacroW = (modelMatrix * vec4(transformed, 1.0)).xz;')}`;
    sh.fragmentShader = `uniform sampler2D macroMap; varying vec2 vMacroW;\n${sh.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      float mac = texture2D(macroMap, vMacroW * ${scale.toFixed(5)}).r;
      float mac2 = texture2D(macroMap, vMacroW * ${(scale * 6.1).toFixed(5)} + 0.37).r;
      diffuseColor.rgb *= mix(${(1 - amt).toFixed(3)}, ${(1 + amt * 0.6).toFixed(3)}, mac) * mix(0.9, 1.07, mac2);`
    )}`;
  };
  m.customProgramCacheKey = () => `macro${scale}_${amt}`;
}

// PBR facade style per campus building, from reference photos (懷恩樓 brown brick, 科學館 terracotta +
// white bands, 土木館 speckled granite, 工學館 grey-brown tiles ...); unknown ones get a deterministic pick
// 注意：有 tools/looks.json look 的建物，牆色只看 look（沒有 look 才看 overrides.json 的 colour），這張表對它們
// 只決定是否多抽一次 rnd2，不影響顏色；改顏色請改 looks.json。第 0 批已刪掉 15 棟有 look 的建物在
// overrides.json 裡用不到的 colour（固定畫質逐像素比對確認外觀不變）。
const STYLE_BY_NAME = {
  懷恩樓: 'tan',
  工學館: 'tan',
  科學館: 'red',
  土木館: 'granite',
  理學大樓: 'red',
  化學館: 'tan',
  管理大樓: 'white',
  自強商學大樓: 'white',
  商設館: 'white',
  智信樓: 'brick',
  莊敬大樓: 'white',
  建築館: 'granite',
  祐生建築中心: 'granite',
  張靜愚紀念圖書館: 'granite',
  學生活動中心: 'tan',
  全人教育村: 'brick',
  電學大樓: 'tan',
  力行大樓: 'red',
  篤信大樓: 'white',
  信實樓: 'brick',
  恩慈樓: 'brick',
  良善樓: 'brick',
  喜樂樓: 'brick',
  陸華樓: 'white',
  維澈樓: 'white',
  校史館: 'white',
  '行政大樓（含校史館）': 'white', // 行政大樓＝OSM 的「校史館」（src/world/zones/ZoneA.js 改名）
  商業設計館: 'white', // 商業設計館＝OSM 的「商設館」（src/world/zones/ZoneC.js 改名）
  生物科技館: 'white',
  真知教學大樓: 'white',
  設計學院: 'granite',
  室設系館: 'white',
  景觀系館: 'tan',
  恩惠堂: 'white',
  恩惠堂副堂: 'white',
  中原大學體育館: 'white',
  中原大學室內游泳池: 'white',
  薄膜中心: 'white',
  熱誠樓A棟: 'brick',
  '熱誠樓B C棟': 'brick',
  林森館: 'tan',
  望樓: 'tan',
  月老宮: 'temple',
  桃園白沙屯天上聖母: 'temple',
  普忠里福德祠: 'temple',
  盧氏宗祠: 'temple',
  土地公廟: 'temple',
  '普仁福德祠(土地公廟)': 'temple',
};
const STYLE_PICK = ['tan', 'red', 'white', 'granite', 'brick'];
// average colour of each PBR atlas: a building:colour tints the atlas by colour / reference
const PBR_REF = {
  tan: '#968068',
  red: '#9e5240',
  granite: '#a7a6a2',
  white: '#e2dfd8',
  brick: '#944634',
};
// facadeParam texels are light grey: vertex colours are scaled up so the wall reads as the given
// hex, and pulled 15% towards grey (tone mapping otherwise oversaturates strong survey colours)
const FACP_GAIN = 1.15;
const lookCol = (hex) => {
  const c = col(hex),
    y = (c[0] + c[1] + c[2]) / 3;
  return c.map((v) => (y + (v - y) * 0.85) * FACP_GAIN);
};
const PBR_STYLES = new Set([
  'tan',
  'red',
  'granite',
  'white',
  'brick',
  'commercial',
  'town',
  'temple',
]);
const strHash = (s) => {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(h);
};
const mulCol = (c, k) => c.map((v) => v * k);

// ---------- world ----------
const AREA_COL = {
  park: '#55803f',
  grass: '#62924a',
  pitch: '#4f9446',
  track: '#b5553f',
  water: '#3a78a8',
  parking: '#5d6066',
  construction: '#8e7a5c',
  school: '#a3a08f',
  commercial: '#8b8a84',
  industrial: '#7d7b74',
  residential: null,
  // 補建街區 ground (synthetic areas only)
  farm: '#8e9a5c',
  dirt: '#9a7b58',
  wood: '#41633a',
};
const _DIRT_COL = { site: '#a8825a', weeds: '#7f7c56' };
const ROAD_LAYER = {
  footway: 0,
  path: 0,
  cycleway: 0,
  steps: 0,
  pedestrian: 0,
  track: 0,
  service: 1,
  living_street: 2,
  residential: 2,
  unclassified: 3,
  tertiary: 4,
  secondary: 5,
  primary: 6,
};

export function buildWorld(scene, data, onProgress = () => {}, opts = {}) {
  const before = new Set(scene.children); // see freezeStatic at the end
  const B = data.bounds;
  const rnd = mulberry32(20240034);
  // purely visual extras (PBR upgrade) draw from their own stream so the shared sequence stays as it was
  const rnd2 = mulberry32(777034);
  const quality = opts.quality || (opts.low ? 'low' : 'high');
  const world = { data, bounds: B, labels: [], animated: [], named: {}, tris: {} };
  clearBridges(); // (and the height levels)
  // raised pads / stairs (src/world/Terrain.js) go in first so every ground query below
  // (furniture, lamps, trees: groundY / Hmin) already stands on them; their
  // walls and collision are added after the trees (see 'height levels')
  const LV = data.levels || {};
  const lvPads = (LV.pads || []).map((d) => ({ d, L: addPad(d.pts, d.y, { id: d.id }) }));
  const lvStairs = (LV.stairs || []).map((d) => ({
    d,
    L: addStair(d.a, d.b, d.w, d.y0, d.y1, d.steps || 0, { id: d.id }),
  }));
  const collision = new CollisionWorld(B, 16);
  const roadGrid = new SegGrid(20);
  world.collision = collision;
  world.roadGrid = roadGrid;
  collision.reserved = opts.reserved || [];

  const _campusRing = data.campus.length
    ? data.campus.reduce((a, b) => (a.length > b.length ? a : b))
    : [];
  world.inCampus = (x, z) => data.campus.some((r) => pointInPoly(x, z, r));

  // viaducts, footbridge, road cuts: the ground is masked over the open cuts
  const grade = gradeItems(data),
    cutR = cutRects(grade).concat(pitRects()),
    sink = sinkPlan(data),
    maskCut = (m) => cutMask(m, cutR, sink.glsl);
  world.inSink = sink.inside;
  // sunk ponds / streams: water, banks, railings and the culvert walls where a stream goes
  // under a road. Collision (sinkColl: a line along the top of every bank and across every
  // culvert end) is added after the trees, so their placement does not change.
  const sinkColl = [];
  function drawSinks(wn) {
    if (!sink.areas.length && !sink.runs.length) return;
    const water = new Geo(true, uvS(14)),
      runWater = new Geo(false, uvS(14));
    const conc = new Geo(),
      grass = new Geo(),
      earth = new Geo(),
      metal = new Geo(),
      panel = new Geo();
    const C = {
      riprap: col('#8d8778'),
      stone: col('#9b978c'),
      concrete: col('#b8b3a7'),
      grass: col('#7f9a5c'),
      earth: col('#7b6b52'),
      wall: col('#c6c1b4'),
      bed: col('#5b5850'),
      dark: col('#151513'),
      white: col('#ffffff'),
    };
    const geoOf = (m) => (m === 'grass' ? grass : m === 'earth' ? earth : conc);
    const RAIL = { steel: col('#3d4044'), mesh: col('#2f6b4a'), post: col('#b9b4a8') };
    // vertical quad along a-b ([x,z]) from y0 to y1 (per end), facing n; uv in metres / 3
    const vq = (g, a, b, ya0, ya1, yb0, yb1, c, n) => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      g.quad([a[0], ya0, a[1]], [b[0], yb0, b[1]], [b[0], yb1, b[1]], [a[0], ya1, a[1]], c, n, [
        [0, ya0 / 3],
        [l / 3, yb0 / 3],
        [l / 3, yb1 / 3],
        [0, ya1 / 3],
      ]);
    };
    // quad by four [x,y,z] corners, uv = world x / z in 4 m
    const fq = (g, p, c, n) =>
      g.quad(
        p[0],
        p[1],
        p[2],
        p[3],
        c,
        n,
        p.map((q) => [q[0] / 4, q[2] / 4])
      );
    const P3 = (p, y) => [p[0], y, p[1]];
    const off = (p, n, o) => [p[0] + n[0] * o, p[1] + n[1] * o];
    // square bar from a to b ([x,y,z]), t thick
    const bar = (a, b, t, c) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        l = Math.hypot(...d) || 1;
      d[0] /= l;
      d[1] /= l;
      d[2] /= l;
      const up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let u = [
        d[1] * up[2] - d[2] * up[1],
        d[2] * up[0] - d[0] * up[2],
        d[0] * up[1] - d[1] * up[0],
      ];
      const ul = Math.hypot(...u);
      u = u.map((v) => ((v / ul) * t) / 2);
      const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
      const Cn = (p, su, sv) => [
        p[0] + u[0] * su + v[0] * sv,
        p[1] + u[1] * su + v[1] * sv,
        p[2] + u[2] * su + v[2] * sv,
      ];
      for (const [s1, t1, s2, t2] of [
        [1, 1, 1, -1],
        [1, -1, -1, -1],
        [-1, -1, -1, 1],
        [-1, 1, 1, 1],
      ]) {
        const n = [
          u[0] * (s1 + s2) + v[0] * (t1 + t2),
          u[1] * (s1 + s2) + v[1] * (t1 + t2),
          u[2] * (s1 + s2) + v[2] * (t1 + t2),
        ];
        metal.quad(Cn(a, s1, t1), Cn(b, s1, t1), Cn(b, s2, t2), Cn(a, s2, t2), c, n);
      }
    };
    // railing along the top of a bank from A to B ([x,z]) standing on heights ya, yb.
    // steel: 1.1 m dark bars every 15 cm; mesh: green fence posts every 2.5 m with a mesh panel; post: 0.9 m square posts + 2 bars
    const rail = (type, A, B, ya, yb) => {
      const l = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (!RAIL[type] || l < 0.2) return;
      const c = RAIL[type],
        P = (t, y) => [A[0] + (B[0] - A[0]) * t, ya + (yb - ya) * t + y, A[1] + (B[1] - A[1]) * t];
      if (type === 'post') {
        for (const hh of [0.45, 0.82]) bar(P(0, hh), P(1, hh), 0.07, c);
        const n = Math.max(1, Math.round(l / 2));
        for (let k = 0; k < n; k++) bar(P(k / n, -0.1), P(k / n, 0.9), 0.18, c);
        return;
      }
      bar(P(0, 1.1), P(1, 1.1), 0.05, c);
      bar(P(0, 0.1), P(1, 0.1), 0.04, c);
      const n = Math.max(1, Math.round(l / (type === 'steel' ? 0.15 : 2.5)));
      for (let k = 0; k < n; k++)
        bar(P(k / n, -0.05), P(k / n, 1.1), type === 'steel' ? 0.022 : 0.06, c);
      if (type === 'mesh') {
        const a = P(0, 0.1),
          b = P(1, 0.1);
        panel.quad(a, b, [b[0], b[1] + 1, b[2]], [a[0], a[1] + 1, a[2]], c, [
          (B[1] - A[1]) / l,
          0,
          -(B[0] - A[0]) / l,
        ]);
      }
    };
    // ponds: draped water drop m below the ground, a wall (with coping) or a slope on each edge
    for (const s of sink.areas) {
      water.flatPoly(s.P, -s.drop, C.white);
      for (const e of s.edges) {
        const yA = H(...e.A),
          yB = H(...e.B),
          wA = yA - s.drop,
          wB = yB - s.drop,
          rA = H(...e.oA),
          rB = H(...e.oB),
          inN = [-e.n[0], 0, -e.n[1]];
        if (e.wall) {
          vq(conc, e.A, e.B, wA - 0.4, yA + 0.05, wB - 0.4, yB + 0.05, C.wall, inN);
          fq(
            conc,
            [P3(e.A, yA + 0.05), P3(e.B, yB + 0.05), P3(e.oB, rB + 0.05), P3(e.oA, rA + 0.05)],
            C.wall,
            UP
          );
          vq(conc, e.oA, e.oB, rA - 0.3, rA + 0.05, rB - 0.3, rB + 0.05, C.wall, [
            e.n[0],
            0,
            e.n[1],
          ]);
          rail(
            e.spec.rail,
            off(e.A, e.n, SINK_COPE / 2),
            off(e.B, e.n, SINK_COPE / 2),
            yA + 0.05,
            yB + 0.05
          );
        } else {
          const m = e.spec.mat || 'grass';
          fq(
            geoOf(m),
            [P3(e.A, wA - 0.1), P3(e.B, wB - 0.1), P3(e.oB, rB + 0.02), P3(e.oA, rA + 0.02)],
            C[m] || C.grass,
            [inN[0] * 0.5, 0.85, inN[2] * 0.5]
          );
          rail(
            e.spec.rail,
            off(e.oA, e.n, 0.1),
            off(e.oB, e.n, 0.1),
            H(...off(e.oA, e.n, 0.1)),
            H(...off(e.oB, e.n, 0.1))
          );
        }
        sinkColl.push([off(e.oA, e.n, 0.2), off(e.oB, e.n, 0.2)]);
      }
    }
    // streams: a channel along the run, walls with coping (bed beside the water) or slopes down to the water
    for (const r of sink.runs) {
      const sp = r.spec,
        drop = sp.drop,
        t2 = r.top / 2,
        w2 = r.w / 2,
        slope = sp.bank === 'slope',
        cope = slope ? 0.1 : SINK_COPE;
      const n = r.pts.length,
        pts = r.pts;
      const T2 = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)],
          b = pts[Math.min(n - 1, i + 1)],
          l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      });
      const N = T2.map((t) => [-t[1], t[0]]);
      const at = (i, o) => off(pts[i], N[i], o);
      const yr = pts.map((p, i) => Math.min(H(...at(i, t2 + cope)), H(...at(i, -t2 - cope))));
      const yw = yr.map((y) => y - drop);
      for (let i = 0; i < n - 1; i++) {
        for (const sd of [1, -1]) {
          const ra = at(i, sd * t2),
            rb = at(i + 1, sd * t2),
            ya = H(...at(i, sd * (t2 + cope))),
            yb = H(...at(i + 1, sd * (t2 + cope)));
          const inN = [-N[i][0] * sd, 0, -N[i][1] * sd];
          if (slope) {
            fq(
              geoOf(sp.mat),
              [
                P3(at(i, sd * w2), yw[i] - 0.1),
                P3(at(i + 1, sd * w2), yw[i + 1] - 0.1),
                P3(rb, yb + 0.02),
                P3(ra, ya + 0.02),
              ],
              C[sp.mat] || C.concrete,
              [inN[0] * 0.5, 0.85, inN[2] * 0.5]
            );
            fq(
              geoOf(sp.mat),
              [
                P3(ra, ya + 0.02),
                P3(rb, yb + 0.02),
                P3(at(i + 1, sd * (t2 + cope)), yb + 0.02),
                P3(at(i, sd * (t2 + cope)), ya + 0.02),
              ],
              C[sp.mat] || C.concrete,
              UP
            );
          } else {
            vq(conc, ra, rb, yw[i] - 0.3, ya + 0.05, yw[i + 1] - 0.3, yb + 0.05, C.wall, inN);
            fq(
              conc,
              [
                P3(ra, ya + 0.05),
                P3(rb, yb + 0.05),
                P3(at(i + 1, sd * (t2 + cope)), yb + 0.05),
                P3(at(i, sd * (t2 + cope)), ya + 0.05),
              ],
              C.wall,
              UP
            );
          }
          rail(
            sp.rail,
            at(i, sd * (t2 + cope / 2)),
            at(i + 1, sd * (t2 + cope / 2)),
            ya + 0.05,
            yb + 0.05
          );
          sinkColl.push([at(i, sd * (t2 + cope + 0.2)), at(i + 1, sd * (t2 + cope + 0.2))]);
        }
        if (!slope)
          fq(
            earth,
            [
              P3(at(i, t2), yw[i] - 0.03),
              P3(at(i + 1, t2), yw[i + 1] - 0.03),
              P3(at(i + 1, -t2), yw[i + 1] - 0.03),
              P3(at(i, -t2), yw[i] - 0.03),
            ],
            C.bed,
            UP
          );
        runWater.quad(
          P3(at(i, w2), yw[i]),
          P3(at(i + 1, w2), yw[i + 1]),
          P3(at(i + 1, -w2), yw[i + 1]),
          P3(at(i, -w2), yw[i]),
          C.white,
          UP,
          [at(i, w2), at(i + 1, w2), at(i + 1, -w2), at(i, -w2)].map((q) => [q[0] / 14, q[1] / 14])
        );
      }
      // ends: culvert headwall with a dark opening (the stream goes on under the road / the fill)
      for (const [i, dir, k] of [
        [0, 1, 0],
        [n - 1, -1, 1],
      ]) {
        if (r.join[k]) continue;
        const a = at(i, t2 + cope),
          b = at(i, -t2 - cope),
          f = [T2[i][0] * dir, 0, T2[i][1] * dir];
        vq(conc, a, b, yw[i] - 0.3, H(...a) + 0.05, yw[i] - 0.3, H(...b) + 0.05, C.wall, f);
        const oa = off(at(i, w2 * 0.85), T2[i], dir * 0.03),
          ob = off(at(i, -w2 * 0.85), T2[i], dir * 0.03);
        vq(
          conc,
          oa,
          ob,
          yw[i] - 0.05,
          yw[i] + Math.min(1.4, drop * 0.75),
          yw[i] - 0.05,
          yw[i] + Math.min(1.4, drop * 0.75),
          C.dark,
          f
        );
        rail(sp.rail, at(i, t2 + cope / 2), at(i, -t2 - cope / 2), H(...a) + 0.05, H(...b) + 0.05);
        sinkColl.push([
          off(at(i, t2 + cope + 0.2), T2[i], -dir * 0.2),
          off(at(i, -t2 - cope - 0.2), T2[i], -dir * 0.2),
        ]);
      }
    }
    // water writes depth (nothing under it: the ground is masked); banks / rails are ordinary meshes
    const wmat2 = new THREE.MeshStandardMaterial({
      color: '#2f4c52',
      roughness: 0.06,
      metalness: 0.15,
      normalMap: wn,
      normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 1.3,
      vertexColors: true,
    });
    for (const g of [water, runWater])
      if (g.tris) {
        const m = g.mesh(wmat2);
        m.receiveShadow = true;
        scene.add(m);
        world.tris.water = (world.tris.water || 0) + g.tris;
      }
    const cx = concreteTex(),
      gr = T.grass(),
      dt = T.dirt();
    const bank = (g, map, normalMap, rough) => {
      if (!g.tris) return;
      const m = g.mesh(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          map,
          normalMap: normalMap || null,
          roughness: rough,
        })
      );
      m.receiveShadow = true;
      scene.add(m);
      world.tris.banks = (world.tris.banks || 0) + g.tris;
    };
    bank(conc, cx.map, cx.normalMap, 0.9);
    bank(grass, gr.map, gr.normalMap, 0.95);
    bank(earth, dt.map, dt.normalMap, 0.95);
    if (metal.tris) {
      const m = metal.mesh(
        new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.5 })
      );
      m.castShadow = quality !== 'low';
      scene.add(m);
    }
    if (panel.tris)
      scene.add(
        panel.mesh(
          new THREE.MeshStandardMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false,
            roughness: 0.8,
          })
        )
      );
  }
  // ground layers draw in order without depth writes (no z-fighting)
  let layerOrder = -100;
  // polygonOffset: draped layers sit a few cm above the terrain; keep them in front at distance
  const OFFSET = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };
  const flatMat = (map = null) =>
    maskCut(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map,
        depthWrite: false,
        roughness: 0.9,
        envMapIntensity: 0.5,
        ...OFFSET,
      })
    );
  // PBR ground surface (src/graphics/Textures.js groundTex) with large-scale macro variation
  const gmat = (tex, o = {}) => {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      depthWrite: false,
      map: tex.map || null,
      normalMap: tex.normalMap || null,
      roughnessMap: tex.roughnessMap || null,
      roughness: o.roughness ?? 0.95,
      metalness: 0,
      envMapIntensity: o.env ?? 0.55,
      color: o.color || '#ffffff',
      ...OFFSET,
    });
    if (tex.normalMap) m.normalScale.set(o.ns ?? 1, o.ns ?? 1);
    if (o.macro !== false) addMacro(m, o.macroScale ?? 0.011, o.macroAmt ?? 0.2);
    return o.mask === false ? m : maskCut(m);
  };
  const uvS = (s) => (q) => [q[0] / s, q[1] / s];
  const addFlat = (geo, mat, tag) => {
    if (!geo.tris) return null;
    const m = geo.mesh(mat || flatMat());
    m.receiveShadow = true;
    m.renderOrder = layerOrder++;
    scene.add(m);
    if (tag) world.tris[tag] = (world.tris[tag] || 0) + geo.tris;
    return m;
  };
  const T = groundTex;

  // base ground: terrain grid (MOI DTM) with a skirt out to the horizon
  {
    const g = groundGeometry(B);
    const pos = g.attributes.position,
      uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / 10;
      uv[i * 2 + 1] = pos.getZ(i) / 10;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const mat = gmat(T.ground(), { macroAmt: 0.28 });
    mat.vertexColors = false;
    mat.depthWrite = true;
    mat.polygonOffset = false;
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    m.renderOrder = layerOrder++;
    scene.add(m);
    world.groundMesh = m;
    world.tris.ground = g.index.count / 3;
  }
  // campus paving (interlocking pavers)
  {
    const g = new Geo(true, uvS(4));
    for (const r of data.campus) g.flatPoly(r, 0.01, col('#f2efe8'));
    addFlat(g, gmat(T.paving(), { macroAmt: 0.22 }), 'areas');
  }
  // areas: base / green / track / water meshes keep the data's draw order
  const waterPolys = [];
  const greenPolys = [];
  const sportPolys = []; // no trees on pitches / tracks
  const parkingPolys = [];
  const fillGreens = []; // 補建街區 woods / lawns: trees from their own random stream
  {
    // PBR surfaces carry their own colour; the vertex colour is only a light tint
    const gConc = new Geo(true, uvS(4)),
      gAsph = new Geo(true, uvS(8)),
      gGreen = new Geo(true, uvS(6)),
      gTrack = new Geo(true, uvS(4)),
      gWater = new Geo(true, uvS(14)),
      gLines = new Geo(true);
    const gFarm = new Geo(true),
      gDirt = new Geo(true, uvS(6));
    const TINT = {
      park: '#e6efd6',
      grass: '#ffffff',
      pitch: '#e0ffd8',
      wood: '#c9d9b6',
      track: '#ffffff',
      water: '#ffffff',
      parking: '#f0f0f0',
      construction: '#ffffff',
      school: '#e8e4dc',
      commercial: '#e8e4dc',
      industrial: '#c9c6c0',
      dirt: '#ffffff',
    };
    const DIRT_TINT = { site: '#ffffff', weeds: '#c9c7a4' };
    const LINE = col('#e8eee4');
    for (const a of data.areas) {
      // a 補建 wood / lawn a wider road took (tools/roads.json) keeps its slot for the tree layout
      if (a.gone) {
        fillGreens.push({ ring: null, lay: a.pre, dense: a.kind === 'wood' });
        continue;
      }
      const c = AREA_COL[a.kind];
      if (!c) continue;
      const k = a.kind;
      const g =
        k === 'water'
          ? gWater
          : k === 'track'
            ? gTrack
            : k === 'farm'
              ? gFarm
              : k === 'dirt' || k === 'construction'
                ? gDirt
                : k === 'park' || k === 'grass' || k === 'pitch' || k === 'wood'
                  ? gGreen
                  : k === 'parking'
                    ? gAsph
                    : gConc;
      // field stripes follow the block's street direction (a.ang, degrees)
      if (k === 'farm') {
        const t = ((a.ang || 0) * Math.PI) / 180,
          ct = Math.cos(t),
          st = Math.sin(t);
        gFarm.uvAt = (q) => [(q[0] * ct + q[1] * st) / 24, (-q[0] * st + q[1] * ct) / 24];
      }
      const tint =
        k === 'farm'
          ? c
          : k === 'dirt'
            ? DIRT_TINT[a.sub] || TINT.dirt
            : a.name === '中原大學大草坪'
              ? '#f4fff0'
              : TINT[k] || '#ffffff';
      if (!a.sink) g.flatPoly(a.pts, 0.02, col(tint), a.holes); // sunk water is drawn below (sink)
      // holes ride along on the ring array so inArea() can skip them
      const ring = a.holes ? Object.assign(a.pts.slice(), { holes: a.holes }) : a.pts;
      if (a.kind === 'water' || a.was === 'water') waterPolys.push(ring); // was: water that is not there any more (tools/water.json); plants keep off it as before
      if (a.synthetic && (a.kind === 'wood' || a.kind === 'grass'))
        fillGreens.push({ ring, lay: a.pre, dense: a.kind === 'wood' });
      else if (a.kind === 'park' || a.kind === 'grass') greenPolys.push(ring);
      if (a.kind === 'pitch' || a.kind === 'track') sportPolys.push(a.pts);
      if (a.kind === 'parking') parkingPolys.push(ring);
      // pitch markings on roughly rectangular pitches
      if (a.kind === 'pitch' && !a.holes && !isCourt(a)) {
        const f = obb(a.pts),
          L = f.u1 - f.u0,
          W = f.v1 - f.v0;
        if (L > 14 && W > 10 && polyArea(a.pts) / (L * W) > 0.8) {
          const P = f.P,
            u0 = f.u0 + 1,
            u1 = f.u1 - 1,
            v0 = f.v0 + 1,
            v1 = f.v1 - 1,
            um = (u0 + u1) / 2,
            vm = (v0 + v1) / 2;
          const C = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
          for (let i = 0; i < 4; i++) gLines.strip(C[i], C[(i + 1) % 4], 0.12, 0.03, LINE);
          gLines.strip(P(um, v0), P(um, v1), 0.12, 0.03, LINE);
          const rc = Math.min(9.15, W * 0.18);
          for (let k = 0; k < 20; k++) {
            const t0 = (k / 20) * Math.PI * 2,
              t1 = ((k + 1) / 20) * Math.PI * 2;
            gLines.strip(
              P(um + Math.cos(t0) * rc, vm + Math.sin(t0) * rc),
              P(um + Math.cos(t1) * rc, vm + Math.sin(t1) * rc),
              0.12,
              0.03,
              LINE
            );
          }
        }
      }
    }
    // waterways
    for (const w of data.waterways)
      if (!w.sink)
        for (let i = 0; i < w.pts.length - 1; i++) {
          gWater.strip(w.pts[i], w.pts[i + 1], w.w, 0.02, col('#ffffff'));
          gWater.disc(w.pts[i][0], w.pts[i][1], w.w / 2, 0.02, col('#ffffff'));
        }
    addFlat(gConc, gmat(T.paving(), { macroAmt: 0.25 }), 'areas');
    addFlat(gAsph, gmat(T.asphalt(), { roughness: 1 }), 'areas');
    addFlat(gFarm, flatMat(farmTex()), 'areas');
    addFlat(gDirt, gmat(T.dirt(), { macroAmt: 0.3 }), 'areas');
    addFlat(gGreen, gmat(T.grass(), { macroAmt: 0.3, macroScale: 0.015, env: 0.4 }), 'areas');
    addFlat(gTrack, gmat(T.track(), { macroAmt: 0.1 }), 'areas');
    {
      const ct = data.areas.filter(isCourt);
      if (ct.length) {
        const g = new Geo(true);
        paintCourts(ct, g);
        addFlat(g, null, 'areas');
      }
    } // 體育園區籃球場 (src/world/Court.js)
    addFlat(gLines, null, 'areas');
    // water: dark, glossy, reflects the sky; ripples scroll
    const wn = T.waterNormal();
    const wmat = maskCut(
      new THREE.MeshStandardMaterial({
        color: '#2f4c52',
        roughness: 0.06,
        metalness: 0.15,
        normalMap: wn,
        normalScale: new THREE.Vector2(0.35, 0.35),
        envMapIntensity: 1.3,
        depthWrite: false,
        vertexColors: true,
        ...OFFSET,
      })
    );
    addFlat(gWater, wmat, 'areas');
    world.animated.push((t) => {
      wn.offset.set(t * 0.012, t * 0.008);
    });
    drawSinks(wn);
  }
  world.waterPolys = waterPolys;
  // lawns / parks (incl. 補建 greens) — footstep surface
  world.greenAt = (x, z) =>
    greenPolys.some((p) => inArea(x, z, p)) ||
    fillGreens.some((f) => f.ring && inArea(x, z, f.ring));
  // paved floors of the height-level sites (sunken plaza), draped like the areas
  if (LV.floors && LV.floors.length) {
    const g = new Geo(true, uvS(2.5));
    for (const f of LV.floors) g.flatPoly(f.pts, 0.03, col(f.tint || '#ffffff'));
    addFlat(g, gmat(T.paving(), { macroAmt: 0.15 }), 'levels');
  }
  onProgress(0.25);

  // rail
  {
    const g = new Geo(true, uvS(4));
    for (const r of data.rail)
      for (let i = 0; i < r.pts.length - 1; i++) {
        g.strip(r.pts[i], r.pts[i + 1], 4.5, 0.03, col('#b8a898'));
        g.disc(r.pts[i][0], r.pts[i][1], 2.25, 0.03, col('#b8a898'));
      }
    addFlat(g, gmat(T.dirt(), { macro: false }), 'rail');
    const g2 = new Geo(true);
    for (const r of data.rail)
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i],
          b = r.pts[i + 1];
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          l = Math.hypot(dx, dz) || 1;
        const nx = -dz / l,
          nz = dx / l;
        for (const s of [-0.75, 0.75])
          g2.strip(
            [a[0] + nx * s, a[1] + nz * s],
            [b[0] + nx * s, b[1] + nz * s],
            0.12,
            0.04,
            col('#c9c9c9')
          );
      }
    addFlat(
      g2,
      maskCut(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          depthWrite: false,
          metalness: 0.8,
          roughness: 0.35,
          ...OFFSET,
        })
      ),
      'rail'
    );
  }

  // roads, by layer
  // OSM node degree: junction nodes get a disc and no lane marks across them
  const nodeDeg = new Map(),
    nodeUse = new Map();
  const hasNodes = (r) => r.nodes && r.nodes.length === r.pts.length;
  // tools/roads.json wat: a road whose width changes along it carries r.wv, the width at each vertex
  // (r.w stays its nominal width for everything else); wOn: the width t (0..1) along segment i
  const wPt = (r, i) => (r.wv ? r.wv[i] : r.w);
  const wOn = (r, i, t) => (r.wv ? r.wv[i] + (r.wv[i + 1] - r.wv[i]) * t : r.w);
  // the road's segment i in roadGrid: in 2 m pieces where its width changes, each as wide as its wider end
  const gridSeg = (r, i) => {
    const a = r.pts[i],
      b = r.pts[i + 1];
    if (!r.wv || r.wv[i] === r.wv[i + 1]) return roadGrid.add(a[0], a[1], b[0], b[1], wPt(r, i), r);
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let k = 0; k < n; k++) {
      const t0 = k / n,
        t1 = (k + 1) / n;
      roadGrid.add(
        a[0] + (b[0] - a[0]) * t0,
        a[1] + (b[1] - a[1]) * t0,
        a[0] + (b[0] - a[0]) * t1,
        a[1] + (b[1] - a[1]) * t1,
        Math.max(wOn(r, i, t0), wOn(r, i, t1)),
        r
      );
    }
  };
  for (const r of data.roads) {
    if (!hasNodes(r)) continue;
    const n = r.nodes.length;
    r.nodes.forEach((id, i) => {
      nodeDeg.set(id, (nodeDeg.get(id) || 0) + (i > 0) + (i < n - 1));
      nodeUse.set(id, (nodeUse.get(id) || 0) + 1);
    });
  }
  const isJunction = (r, i) => hasNodes(r) && (nodeDeg.get(r.nodes[i]) || 0) >= 3;
  const turnAt = (r, i) => {
    const a = r.pts[i - 1],
      p = r.pts[i],
      b = r.pts[i + 1];
    const d = Math.atan2(b[1] - p[1], b[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]);
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
  };
  const inPlay = (p, m = 60) =>
    p[0] > B.minX - m && p[0] < B.maxX + m && p[1] > B.minZ - m && p[1] < B.maxZ + m;
  const layers = [...Array(7)].map(() => new Geo(true, uvS(8)));
  const footCampus = new Geo(true, uvS(4)); // campus footways: pavers (footTown = layers[0])
  const walks = new Geo(true, uvS(3)); // sidewalks + curbs, drawn under the carriageways
  const marks = new Geo(true, uvS(4));
  const groundMarks = marks,
    deckMarks = marks; // deckMarks: absolute-height quads (decks), as deckStrip lays them
  const deckSides = new Geo();
  // opaque deck slab just under every deck's road strip. The road layers are decals (depthWrite
  // false) that rely on the ground having filled the depth buffer first; on a deck there is no
  // ground, so without this slab the deck's underside and end walls (drawn later) show through
  // the road. Drawn right after the ground (renderOrder below), see the mesh at the end.
  const deckBase = new Geo(),
    DECK_BASE = col('#4a4b4f');
  // bridge deck: height profile from src/world/Terrain.js addBridge (same <=DS m stations);
  // visual only, collision stays 2D
  const deckStrip = (g, a, b, w, d0, yAt, y, c, sides) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = Math.hypot(dx, dz);
    if (l < 0.01) return;
    const n = Math.max(1, Math.ceil(l / DS)),
      nx = ((-dz / l) * w) / 2,
      nz = ((dx / l) * w) / 2;
    let px = a[0],
      pz = a[1],
      py = yAt(d0);
    for (let k = 1; k <= n; k++) {
      const qx = a[0] + (dx * k) / n,
        qz = a[1] + (dz * k) / n,
        qy = yAt(d0 + (l * k) / n);
      g.quad(
        [px + nx, py + y, pz + nz],
        [qx + nx, qy + y, qz + nz],
        [qx - nx, qy + y, qz - nz],
        [px - nx, py + y, pz - nz],
        c,
        UP
      );
      deckBase.quad(
        [px + nx, py + y - 0.04, pz + nz],
        [qx + nx, qy + y - 0.04, qz + nz],
        [qx - nx, qy + y - 0.04, qz - nz],
        [px - nx, py + y - 0.04, pz - nz],
        DECK_BASE,
        UP
      );
      // sides only where the deck clears the ground (> 0.3 m), not on draped spans
      if (
        sides &&
        Math.max(py - H(px, pz), qy - H(qx, qz), (py + qy) / 2 - H((px + qx) / 2, (pz + qz) / 2)) >
          0.3
      )
        for (const sd of [1, -1]) {
          const ax = px + nx * sd,
            az = pz + nz * sd,
            bx = qx + nx * sd,
            bz = qz + nz * sd,
            fn = [(nx / (w / 2)) * sd, 0, (nz / (w / 2)) * sd];
          // fascia under the deck edge + a low curb
          deckSides.quad(
            [ax, py - 0.7, az],
            [bx, qy - 0.7, bz],
            [bx, qy + 0.25, bz],
            [ax, py + 0.25, az],
            col('#8d8a82'),
            fn
          );
          // 1 m parapet (護欄) on the deck edge, visual only (collision stays 2D)
          const k = 0.22 / (w / 2),
            ix = nx * k * sd,
            iz = nz * k * sd,
            PAR = col('#b4b0a7');
          deckSides.quad(
            [ax, py + 0.25, az],
            [bx, qy + 0.25, bz],
            [bx, qy + 1.0, bz],
            [ax, py + 1.0, az],
            PAR,
            fn
          );
          deckSides.quad(
            [ax - ix, py, az - iz],
            [bx - ix, qy, bz - iz],
            [bx - ix, qy + 1.0, bz - iz],
            [ax - ix, py + 1.0, az - iz],
            PAR,
            fn.map((v) => -v)
          );
          deckSides.quad(
            [ax, py + 1.0, az],
            [bx, qy + 1.0, bz],
            [bx - ix, qy + 1.0, bz - iz],
            [ax - ix, py + 1.0, az - iz],
            col('#9a968d'),
            UP
          );
        }
      px = qx;
      pz = qz;
      py = qy;
    }
  };
  const deckDisc = (g, x, z, r, yy, c, seg) => {
    const P = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      P.push([x + Math.cos(a) * r, yy, z + Math.sin(a) * r]);
    }
    for (let i = 1; i < seg - 1; i++) g.tri(P[0], P[i], P[i + 1], c, UP);
  };
  // 正門: the two one-way lanes round the guard kiosk and the forecourt are grey pavers, not asphalt
  // (Google 街景 2017-09 / 2022-08 / 2024-08); laid over the asphalt from the grate at the end of 中北路
  const gatePave = new Geo(true, uvS(4)),
    gateGrate = new Geo(true, uvS(4)),
    GATE_PAVE = col('#c9c6bf'); // light grey granite setts (街景 2022-08), darker than the old cream
  const gateLane = (r) =>
    !!opts.mainGate &&
    !!r.oneway &&
    hasNodes(r) &&
    (r.nodes[0] === opts.mainGate.streetNode ||
      r.nodes[r.nodes.length - 1] === opts.mainGate.streetNode);
  const SURF_COL = {
    concrete: '#77766f',
    paving_stones: '#7f766a',
    sett: '#77706a',
    unpaved: '#7a6a52',
    gravel: '#7f766a',
    compacted: '#7a6e5c',
    wood: '#6e5440',
  };
  const SERVICE_COL = { alley: '#4f5054', driveway: '#56565a', parking_aisle: '#46484e' };
  // the PBR asphalt texture carries the dark colour: tints are relative to plain asphalt (#3b3d43)
  const ASPH = col('#3b3d43'),
    toTint = (c) => c.map((v, i) => Math.min(1, (v / ASPH[i]) * 0.86));
  const roadCol = (r) => {
    if (ROAD_LAYER[r.type] === 0) {
      return world.inCampus(r.pts[0][0], r.pts[0][1]) ? col('#fff6e6') : col('#ffffff');
    }
    if (SURF_COL[r.surface]) return toTint(col(SURF_COL[r.surface]));
    if (r.type === 'service') return toTint(col(SERVICE_COL[r.service] || '#4a4c52'));
    return r.type === 'primary' ? col('#d8d8d8') : col('#e4e4e4');
  };
  // lane marks: one solid or dashed (4 m on / 6 m off) line at offset `off`
  // from the centreline; cut short of junctions
  // Streets surveyed on the NLSC 2024 正射 (tools/roads.json 'marks' -> r.marks) are drawn as painted there
  // (centre line style, white edge lines, lanes per direction); the rest by class: primary..tertiary only
  const MARKED = { primary: 1, secondary: 1, tertiary: 1 };
  const marked = (r) =>
    r.marks
      ? r.marks.centre !== 'none' || !!r.marks.edge || (r.marks.lanes || 1) > 1
      : MARKED[r.type];
  const WHITE = col('#e6e5df'),
    YELLOW = col('#e3bf3c');
  // 中北路 from the main gate: ~200 m painted green walkway (標線型人行道, 1.8 m) on both sides, just
  // outside the white edge lines so the street keeps its full width. { sd: the campus side (+1 / -1), d: length }
  const GREEN_WALK = 200;
  const greenWalk = (r) => {
    if (
      r.name !== '中北路' ||
      Math.hypot(r.pts[0][0] + 205, r.pts[0][1] - 82) >= 40 ||
      r.pts.length < 2
    )
      return null;
    const a = r.pts[0],
      b = r.pts[1],
      l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l,
      nz = (b[0] - a[0]) / l,
      mx = (a[0] + b[0]) / 2,
      mz = (a[1] + b[1]) / 2;
    return {
      sd: world.inCampus(mx + nx * (r.w / 2 + 6), mz + nz * (r.w / 2 + 6)) ? 1 : -1,
      d: GREEN_WALK,
    };
  };
  const GREEN_W = 1.8;
  // painted spots (tools/roads.json 'features' -> data.roadMarks): 網狀黃線 box, 斑馬線 zebra, 停止線 stop,
  // 機車停等區 bikebox; each belongs to the nearest drivable road (a box / stop to the street it lies on, a
  // zebra to the street it crosses, the one running along its ang)
  const deckY = new Map(); // road -> its deck height along the way (bridges, viaducts), for the painted spots
  const FEATS = (data.roadMarks || [])
    .map((f) => {
      let best = null;
      for (const q of data.roads) {
        if (!q.drive || q.under) continue;
        for (let i = 0; i < q.pts.length - 1; i++) {
          const a = q.pts[i],
            b = q.pts[i + 1],
            c = closestOnSeg(f.x, f.z, a[0], a[1], b[0], b[1]),
            d = Math.hypot(c[0] - f.x, c[1] - f.z);
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
            ux = (b[0] - a[0]) / l,
            uz = (b[1] - a[1]) / l;
          const along =
            f.ang == null
              ? 1
              : Math.abs(
                  Math.cos((f.ang * Math.PI) / 180) * ux + Math.sin((f.ang * Math.PI) / 180) * uz
                );
          const score = d + (along < 0.7 ? 6 : 0);
          if (!best || score < best.score) best = { score, d, r: q, i, x: c[0], z: c[1], ux, uz };
        }
      }
      return best && best.d < best.r.w / 2 + 4 ? { ...f, at: best } : null;
    })
    .filter(Boolean);
  // where a surveyed street's lines break, as distances along the way: the centre line only across the side
  // roads' mouths, the boxes and the zebras; an edge line only across the mouths on its own side (+1 / -1, the
  // sign of `off`), the boxes and the zebras; at a junction at either end, as far as line() cuts it
  const nodeRoads = new Map();
  for (const q of data.roads)
    if (hasNodes(q) && !q.under)
      q.nodes.forEach((id, k) => {
        let L = nodeRoads.get(id);
        if (!L) nodeRoads.set(id, (L = []));
        L.push([q, k]);
      });
  const streetGaps = (r) => {
    const G = { 0: [], 1: [], '-1': [] },
      M = { 1: [], '-1': [] },
      all = (g) => {
        G[0].push(g);
        G[1].push(g);
        G[-1].push(g);
      };
    const D = [0];
    for (let i = 1; i < r.pts.length; i++)
      D.push(D[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    const n = r.pts.length,
      L = D[n - 1];
    const endTrim = (i) => {
      const k = i === 0 ? 0 : n - 2,
        l = D[k + 1] - D[k];
      return Math.min(l / 2, r.w * 0.6 + 3);
    };
    if (isJunction(r, 0)) all([0, endTrim(0)]);
    if (isJunction(r, n - 1)) all([L - endTrim(n - 1), L]);
    for (let i = 1; i < n - 1 && hasNodes(r); i++) {
      const p = r.pts[i],
        a = r.pts[i - 1],
        b = r.pts[i + 1],
        tx = b[0] - a[0],
        tz = b[1] - a[1],
        tl = Math.hypot(tx, tz) || 1;
      for (const [q, k] of nodeRoads.get(r.nodes[i]) || []) {
        if (q === r) continue;
        for (const j of [k - 1, k + 1]) {
          const o = q.pts[j];
          if (!o) continue;
          const dx = o[0] - p[0],
            dz = o[1] - p[1],
            dl = Math.hypot(dx, dz) || 1;
          const side = (dx * -tz + dz * tx) / (dl * tl),
            sinA = Math.abs(dx * tz - dz * tx) / (dl * tl);
          const h = (q.w / 2 + 1) / Math.max(0.4, sinA),
            g = [D[i] - h, D[i] + h];
          G[0].push(g);
          if (Math.abs(side) > 0.3) {
            G[side > 0 ? 1 : -1].push(g);
            M[side > 0 ? 1 : -1].push(g);
          }
        }
      }
    }
    for (const f of FEATS) {
      if (f.at.r !== r || (f.t !== 'box' && f.t !== 'zebra')) continue;
      const sd = D[f.at.i] + Math.hypot(f.at.x - r.pts[f.at.i][0], f.at.z - r.pts[f.at.i][1]),
        h = (f.t === 'box' ? f.len : f.len || 3) / 2 + 0.3;
      all([sd - h, sd + h]);
    }
    return { G, D, M }; // M: the side roads' mouths only (no boxes / ends), per side
  };
  // a solid (or dashed: 4 m on / 6 m off) line at `off` along r, skipping the [from, to] distances in gaps
  // (off may be a function (i, t) of segment i and 0..1 along it, on a road whose width changes: r.wv)
  const lineGaps = (r, yAt, off, lw, c, gaps, D, maxD = Infinity, dash = false) => {
    const O = typeof off === 'function' ? off : () => off;
    for (let i = 0; i < r.pts.length - 1 && D[i] < maxD; i++) {
      const a = r.pts[i],
        b = r.pts[i + 1],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = D[i + 1] - D[i];
      if (l < 0.3 || (!inPlay(a) && !inPlay(b))) continue;
      const nx = -dz / l,
        nz = dx / l;
      let runs = [[D[i], Math.min(D[i + 1], maxD)]];
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
      for (const [u0, u1] of runs) {
        const s0 = u0 - D[i],
          s1 = u1 - D[i],
          o0 = O(i, s0 / l),
          o1 = O(i, s1 / l);
        const p0 = [a[0] + (dx * s0) / l + nx * o0, a[1] + (dz * s0) / l + nz * o0],
          p1 = [a[0] + (dx * s1) / l + nx * o1, a[1] + (dz * s1) / l + nz * o1];
        if (yAt) deckStrip(marks, p0, p1, lw, u0, yAt, 0.04 + TOL_LO, c, false);
        else marks.strip(p0, p1, lw, 0.04, c);
      }
    }
  };
  const line = (r, yAt, off, lw, c, dash, maxD = Infinity) => {
    let acc = 0;
    for (let i = 0; i < r.pts.length - 1 && acc < maxD; i++) {
      const a = r.pts[i],
        b = r.pts[i + 1],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz);
      if (l < 0.5 || (!inPlay(a) && !inPlay(b))) {
        acc += l;
        continue;
      }
      const nx = -dz / l,
        nz = dx / l,
        trim = Math.min(l / 2, r.w * 0.6 + 3);
      const t0 = isJunction(r, i) ? trim : 0,
        t1 = Math.min(maxD - acc, l - (isJunction(r, i + 1) ? trim : 0));
      const piece = (s0, s1) => {
        if (s1 - s0 < 0.3) return;
        const p0 = [a[0] + (dx * s0) / l + nx * off, a[1] + (dz * s0) / l + nz * off],
          p1 = [a[0] + (dx * s1) / l + nx * off, a[1] + (dz * s1) / l + nz * off];
        if (yAt) deckStrip(marks, p0, p1, lw, acc + s0, yAt, 0.04 + TOL_LO, c, false);
        else marks.strip(p0, p1, lw, 0.04, c);
      };
      if (!dash) piece(t0, t1);
      else for (let s = t0 + 1; s < t1; s += 10) piece(s, Math.min(s + 4, t1));
      acc += l;
    }
  };
  // which side (+1 / -1, the sign of a line offset) of one-way r the other carriageway lies on (0: neither)
  const pairSide = (r) => {
    let best = 0,
      bl = 0;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i],
        b = r.pts[i + 1],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l <= bl) continue;
      const nx = -(b[1] - a[1]) / l,
        nz = (b[0] - a[0]) / l,
        mx = (a[0] + b[0]) / 2,
        mz = (a[1] + b[1]) / 2,
        o = r.w / 2 + 1;
      const p = facesOther(r, mx + nx * o, mz + nz * o),
        m = facesOther(r, mx - nx * o, mz - nz * o);
      if (p !== m) {
        best = p ? 1 : -1;
        bl = l;
      }
    }
    return best;
  };
  const markRoad = (r, yAt) => {
    const two = !r.oneway,
      e = r.w / 2 - 0.35;
    const lanes = Math.max(1, r.lanes || (two ? 2 : r.type === 'primary' ? 3 : 2));
    if (r.marks) {
      // surveyed: as painted, every line running through and broken only where it must
      const M = r.marks,
        { G, D } = streetGaps(r),
        n = Math.max(1, M.lanes || 1);
      // distance along r (as drawn, shifted or not) of the point nearest (x, z)
      const along = (x, z) => {
        let best = Infinity,
          s = 0;
        for (let i = 0; i < r.pts.length - 1; i++) {
          const a = r.pts[i],
            b = r.pts[i + 1],
            c = closestOnSeg(x, z, a[0], a[1], b[0], b[1]),
            d = Math.hypot(c[0] - x, c[1] - z);
          if (d < best) {
            best = d;
            s = D[i] + Math.hypot(c[0] - a[0], c[1] - a[1]);
          }
        }
        return s;
      };
      // span {from, to}: only this stretch of the way is surveyed as painted (the orthophoto cannot show the rest):
      // no centre, edge or lane line outside it
      if (M.span) {
        const a = along(...M.span.from),
          b = along(...M.span.to),
          lo = Math.min(a, b),
          hi = Math.max(a, b);
        for (const k of [0, 1, -1]) G[k].push([-Infinity, lo], [hi, Infinity]);
      }
      // pair / pair-other: one of the two one-way ways OSM splits a two-way street into (no median, just
      // 雙黃線 between them): 'pair' paints the 雙黃線 along its edge that faces the other way, 'pair-other'
      // nothing there; neither gets a white edge line on that side
      // inner: false on a 'median' one-way: no white edge line along the median side either (where the
      // orthophoto shows none there). ev [vPos, vNeg]: the white edge lines at these offsets from the centreline
      // (+ = (-uz, ux)) where they are painted well inside the kerbs, instead of 0.35 m in
      const pair = M.centre === 'pair' || M.centre === 'pair-other',
        inner = pair || M.inner === false ? pairSide(r) : 0;
      // where the width changes along r (r.wv) the offsets that follow the kerbs are functions (i, t); L() turns
      // one into a plain number elsewhere
      const eAt = r.wv && !M.ev ? (i, t) => wOn(r, i, t) / 2 - 0.35 : null,
        L = (g) => (eAt ? g : g(0, 0));
      const eP = L(eAt || (() => (M.ev ? M.ev[0] : e))),
        eN = L(eAt || (() => (M.ev ? -M.ev[1] : e))),
        at = (v, i, t) => (typeof v === 'function' ? v(i, t) : v);
      if (M.edge) {
        if (inner !== 1) lineGaps(r, yAt, eP, 0.15, WHITE, G[1], D);
        if (inner !== -1)
          lineGaps(
            r,
            yAt,
            L((i, t) => -at(eN, i, t)),
            0.15,
            WHITE,
            G[-1],
            D
          );
      }
      if (M.centre === 'pair' && inner) {
        const o = (i, t) => inner * (wOn(r, i, t) / 2 - 0.15);
        lineGaps(r, yAt, L(o), 0.12, YELLOW, G[0], D);
        lineGaps(
          r,
          yAt,
          L((i, t) => o(i, t) - inner * 0.3),
          0.12,
          YELLOW,
          G[0],
          D
        );
      }
      // cv: the centre line off the middle of the carriageway (+ = (-uz, ux)), where one side is wider (kerbside parking)
      const cv = M.cv || 0;
      const centre = (style, gaps) => {
        if (style === 'double-yellow') {
          lineGaps(r, yAt, cv + 0.15, 0.12, YELLOW, gaps, D);
          lineGaps(r, yAt, cv - 0.15, 0.12, YELLOW, gaps, D);
        } else if (style === 'yellow') lineGaps(r, yAt, cv, 0.15, YELLOW, gaps, D);
        else if (style === 'yellow-dash')
          lineGaps(r, yAt, cv, 0.15, YELLOW, gaps, D, Infinity, true);
        else if (style === 'white-dash') lineGaps(r, yAt, cv, 0.12, WHITE, gaps, D, Infinity, true);
      };
      // segs [{from: [x, z], to: [x, z], centre}]: stretches of the way painted with another centre line
      // (the ends projected onto the way as it is now, shifted or not); the rest keeps M.centre
      const segs = (M.segs || []).map((g) => {
        const a = along(...g.from),
          b = along(...g.to);
        return [Math.min(a, b), Math.max(a, b), g.centre];
      });
      centre(M.centre, G[0].concat(segs.map(([a, b]) => [a, b])));
      for (const [a, b, st] of segs)
        centre(
          st,
          G[0].concat([
            [-Infinity, a],
            [b, Infinity],
          ])
        );
      if (two)
        for (const sd of [1, -1]) {
          const lw = (i, t) => (at(sd > 0 ? eP : eN, i, t) - sd * cv) / n;
          for (let k = 1; k < n; k++)
            lineGaps(
              r,
              yAt,
              L((i, t) => cv + sd * k * lw(i, t)),
              0.12,
              WHITE,
              G[0],
              D,
              Infinity,
              true
            );
        }
      else {
        const lw = (i, t) => (at(eP, i, t) + at(eN, i, t)) / n;
        for (let k = 1; k < n; k++)
          lineGaps(
            r,
            yAt,
            L((i, t) => -at(eN, i, t) + k * lw(i, t)),
            0.12,
            WHITE,
            G[0],
            D,
            Infinity,
            true
          );
      }
      return;
    }
    line(r, yAt, e, 0.15, WHITE, false);
    line(r, yAt, -e, 0.15, WHITE, false);
    if (two) {
      // 雙黃線 on primary / secondary, yellow dashes on tertiary
      if (r.type === 'tertiary') line(r, yAt, 0, 0.15, YELLOW, true);
      else {
        line(r, yAt, 0.15, 0.12, YELLOW, false);
        line(r, yAt, -0.15, 0.12, YELLOW, false);
      }
      const n = Math.max(1, Math.round(lanes / 2)),
        lw = e / n;
      for (let k = 1; k < n; k++) {
        line(r, yAt, k * lw, 0.12, WHITE, true);
        line(r, yAt, -k * lw, 0.12, WHITE, true);
      }
    } else {
      const lw = (2 * e) / lanes;
      for (let k = 1; k < lanes; k++) line(r, yAt, -e + k * lw, 0.12, WHITE, true);
    }
  };
  // 2.5 m sidewalk + curb on primary..tertiary; 中北路 has none (see below)
  const SIDEWALK = col('#ffffff'),
    CURB = col('#d6d4cf');
  // divided roads (環中東路, 中華路二段, 中園路, 普忠路...): the two one-way carriageways
  // only have a kerbed median between them (NLSC 2024 正射 survey, tools/roads.json), so
  // no sidewalk on the side that faces the other carriageway
  const carriageways = data.roads.filter((q) => q.oneway && q.drive && !q.bridge && !q.tunnel);
  const facesOther = (r, x, z) =>
    carriageways.some((q) => {
      if (q === r) return false;
      for (let j = 0; j < q.pts.length - 1; j++) {
        const c = closestOnSeg(x, z, q.pts[j][0], q.pts[j][1], q.pts[j + 1][0], q.pts[j + 1][1]);
        if (Math.hypot(c[0] - x, c[1] - z) < q.w / 2 + 2.6) return true;
      }
      return false;
    });
  // surveyed widths / paving per side (tools/roads.json marks walk: {n, s} or {e, w} in metres, col): the
  // side of a segment is named by the compass side its outward normal faces; a side not given stays 2.5 m on
  // primary..tertiary and has none elsewhere
  const walkOf = (r, nx, nz, sd) => {
    const W = r.marks && r.marks.walk,
      d = W
        ? Math.abs(nz) >= Math.abs(nx)
          ? nz * sd < 0
            ? W.n
            : W.s
          : nx * sd > 0
            ? W.e
            : W.w
        : null;
    return d != null ? d : MARKED[r.type] ? 2.5 : 0;
  };
  const walkCol = (r) =>
    r.marks && r.marks.walk && r.marks.walk.col ? col(r.marks.walk.col) : SIDEWALK;
  const paves = data.roads.filter((q) => q.pave);
  const paved = (x, z) =>
    paves.some((q) =>
      q.pts.slice(1).some((p, j) => {
        const c = closestOnSeg(x, z, q.pts[j][0], q.pts[j][1], p[0], p[1]);
        return Math.hypot(c[0] - x, c[1] - z) < q.w / 2 + 0.3;
      })
    );
  const sidewalk = (r) => {
    if (
      (!MARKED[r.type] && !(r.marks && r.marks.walk)) ||
      r.bridge ||
      r.tunnel ||
      (r.name || '').startsWith('中北路')
    )
      return;
    const C = walkCol(r);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i],
        b = r.pts[i + 1],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz);
      if (l < 0.3 || (!inPlay(a, 20) && !inPlay(b, 20))) continue;
      const nx = -dz / l,
        nz = dx / l;
      for (const sd of [1, -1]) {
        const W = walkOf(r, nx, nz, sd);
        if (!W) continue;
        // (at each end: the width there, where r.wv changes it along the road)
        const wa = wPt(r, i),
          wb = wPt(r, i + 1),
          hm = (wa + wb) / 4;
        const o = sd * (wa / 2 + 0.1 + W / 2),
          oc = sd * (wa / 2 + 0.1),
          ob = sd * (wb / 2 + 0.1 + W / 2),
          ocb = sd * (wb / 2 + 0.1);
        const mx = (a[0] + b[0]) / 2 + nx * sd * (hm + 1.35),
          mz = (a[1] + b[1]) / 2 + nz * sd * (hm + 1.35);
        if (r.oneway && facesOther(r, mx, mz)) {
          // median kerb only
          if (paved(a[0] + (nx * (oc + ocb)) / 2 + dx / 2, a[1] + (nz * (oc + ocb)) / 2 + dz / 2))
            continue; // median opening paved over (roads.json pave)
          walks.strip(
            [a[0] + nx * oc, a[1] + nz * oc],
            [b[0] + nx * ocb, b[1] + nz * ocb],
            0.2,
            0.025,
            CURB
          );
          continue;
        }
        walks.strip([a[0] + nx * o, a[1] + nz * o], [b[0] + nx * ob, b[1] + nz * ob], W, 0.02, C);
        walks.strip(
          [a[0] + nx * oc, a[1] + nz * oc],
          [b[0] + nx * ocb, b[1] + nz * ocb],
          0.2,
          0.025,
          CURB
        );
      }
      if (i > 0 && turnAt(r, i) > 0.1 && !(r.oneway && facesOther(r, a[0], a[1]))) {
        const W = Math.max(walkOf(r, nx, nz, 1), walkOf(r, nx, nz, -1));
        if (W) walks.disc(a[0], a[1], wPt(r, i) / 2 + 0.1 + W, 0.02, C, 12);
      }
    }
  };
  // tunnels: building passages stay on the surface; underground ones (layer<0,
  // mostly outside buildings) get no surface strip, only portals where they
  // join the street. They stay in roadGrid / nearestRoadPoint but not in the
  // traffic graph.
  {
    const inBld = (x, z) => data.buildings.some((b) => pointInPoly(x, z, b.pts));
    for (const r of data.roads) {
      if (!r.tunnel) continue;
      let n = 0,
        inside = 0;
      for (let i = 0; i < r.pts.length - 1; i++)
        for (const t of [0.25, 0.5, 0.75]) {
          const a = r.pts[i],
            b = r.pts[i + 1];
          n++;
          if (inBld(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) inside++;
        }
      r.under = inside * 2 < n;
    }
  }
  const portal = (p, q, w) => {
    const dx = q[0] - p[0],
      dz = q[1] - p[1],
      l = Math.hypot(dx, dz) || 1,
      ex = dx / l,
      ez = dz / l,
      nx = -ez,
      nz = ex;
    const hw = w / 2 + 0.4,
      hh = w > 3 ? 4.2 : 2.6,
      cx = p[0] + ex * 0.3,
      cz = p[1] + ez * 0.3,
      y = Hmin(cx, cz, hw);
    if (
      data.buildings.some((b) => pointInPoly(cx, cz, b.pts)) ||
      collision.reserved.some((rp) => pointInPoly(cx, cz, rp))
    )
      return;
    const C = col('#9b978e'),
      D = [0.03, 0.03, 0.035],
      F = [-ex, 0, -ez];
    const P = (o, yy, f = 0) => [cx + nx * o + ex * f, y + yy, cz + nz * o + ez * f];
    deckSides.quad(P(-hw, -0.3, 0.05), P(hw, -0.3, 0.05), P(hw, hh, 0.05), P(-hw, hh, 0.05), D, F);
    deckSides.quad(P(-hw - 1, -0.3), P(-hw, -0.3), P(-hw, hh + 1), P(-hw - 1, hh + 1), C, F);
    deckSides.quad(P(hw, -0.3), P(hw + 1, -0.3), P(hw + 1, hh + 1), P(hw, hh + 1), C, F);
    deckSides.quad(P(-hw, hh), P(hw, hh), P(hw, hh + 1), P(-hw, hh + 1), C, F);
    deckSides.quad(
      P(-hw - 1, hh + 1),
      P(hw + 1, hh + 1),
      P(hw + 1, hh + 1, 0.6),
      P(-hw - 1, hh + 1, 0.6),
      C,
      UP
    );
  };
  // viaduct / footbridge deck (src/world/Terrain.js level LV_DECK): the item's anchors, not the ends' terrain
  const gradeDeck = (r, gi) => {
    const s0 = gi.proj(r.pts[0][0], r.pts[0][1]),
      dir = gi.proj(r.pts[r.pts.length - 1][0], r.pts[r.pts.length - 1][1]) >= s0 ? 1 : -1;
    r.deck = 1; // src/entities/NPC.js: traffic / walkers on this way use the deck
    // gi.cut0: the first metres of the item's path are not built (a building's own stair up to the deck is there, src/world/buildings/Lixing.js).
    // A level's station also counts 1 m past its end (src/world/Terrain.js surfaceAt), so the deck's centreline starts 1 m later.
    let pts = r.pts,
      off = 0;
    if (gi.cut0 > 0) {
      const keep = gi.cut0 + 1,
        c = gi.at(keep),
        in0 = (p) => gi.proj(p[0], p[1]) > keep + 0.01;
      if (dir > 0) {
        pts = [[c.x, c.z], ...r.pts.filter(in0)];
        off = keep - s0;
      } else pts = [...r.pts.filter(in0), [c.x, c.z]];
    }
    return addBridge(pts, r.w, { yAt: (d) => gi.y(s0 + dir * (d + off)), lv: LV_DECK });
  };
  for (const r of data.roads) {
    if (r.under) {
      for (let i = 0; i < r.pts.length - 1; i++)
        roadGrid.add(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], r.w, r);
      const n = r.pts.length;
      if (n > 1 && hasNodes(r) && !r.grade && !r.beside) {
        // a cut's box gets its own portals (below); none beside it
        if ((nodeUse.get(r.nodes[0]) || 0) >= 2) portal(r.pts[0], r.pts[1], r.w);
        if ((nodeUse.get(r.nodes[n - 1]) || 0) >= 2) portal(r.pts[n - 1], r.pts[n - 2], r.w);
      }
      continue;
    }
    const L = ROAD_LAYER[r.type] ?? 1;
    const gi = r.grade && grade[r.grade];
    if (gi && gi.kind === 'footbridge') {
      // drawn with its truss below; walkers use the deck
      gradeDeck(r, gi);
      for (let i = 0; i < r.pts.length - 1; i++)
        roadGrid.add(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], r.w, r);
      continue;
    }
    const g = L === 0 && world.inCampus(r.pts[0][0], r.pts[0][1]) ? footCampus : layers[L];
    const c = roadCol(r);
    const yAt =
      gi && gi.kind !== 'cut'
        ? gradeDeck(r, gi)
        : r.bridge && !r.tunnel
          ? addBridge(r.pts, r.w)
          : null;
    if (yAt) deckY.set(r, yAt);
    let acc = 0;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i],
        b = r.pts[i + 1];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (yAt) deckStrip(g, a, b, r.w, acc, yAt, 0.03 + TOL_LO, c, true);
      else g.strip(a, b, wPt(r, i), 0.03, c, wPt(r, i + 1));
      gridSeg(r, i);
      acc += l;
    }
    // discs only where needed: bends, junctions and joins with another way
    acc = 0;
    r.pts.forEach((p, i) => {
      if (i) acc += Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]);
      const end = i === 0 || i === r.pts.length - 1;
      const need =
        !hasNodes(r) ||
        (end ? (nodeUse.get(r.nodes[i]) || 0) >= 2 : isJunction(r, i) || turnAt(r, i) > 0.05);
      if (!need) return;
      if (gi && gi.kind === 'cut') {
        const q = gi.proj(p[0], p[1]);
        if (q > gi.s0 && q < gi.s1) return;
      } // inside the cut
      if (yAt && !end)
        deckDisc(g, p[0], p[1], r.w / 2, yAt(acc) + 0.03 + TOL_LO, c, L === 0 ? 6 : 10);
      else g.disc(p[0], p[1], wPt(r, i) / 2, 0.03, c, L === 0 ? 6 : 10);
    });
    if (marked(r)) markRoad(r, yAt);
    sidewalk(r);
  }
  // ---------- grade separations: viaduct piers and ramp walls, footbridge, road cut ----------
  // (tools/overrides.json 'grade'; heights in src/world/Terrain.js). 2D collision: walls that
  // nothing passes (open cut, low ramp) block everyone; viaduct parapets and the box
  // walls under the railway are height-banded (src/physics/Collision.js) so the street below /
  // the ground on top stays open. gradeSegs: the range of these walls in collision.segs (trees, below).
  const cutFloor = new Geo(false, uvS(8)),
    cutMarks = new Geo(),
    gradeMetal = new Geo(),
    gradeLights = new Geo(),
    gradeSigns = [];
  const gradeSegs = [collision.segs.length, 0];
  {
    const CONC = col('#a39e94'),
      WALLC = col('#e4dfd2'),
      RAILC = col('#9aa0a6'),
      TRUSS = col('#c8452a');
    const inPlayB = (x, z) => x > B.minX - 2 && x < B.maxX + 2 && z > B.minZ - 2 && z < B.maxZ + 2;
    // square tube from a to b ([x,y,z]), t thick
    const beam = (g, a, b, t, c) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        l = Math.hypot(...d) || 1;
      d[0] /= l;
      d[1] /= l;
      d[2] /= l;
      const up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let u = [
        d[1] * up[2] - d[2] * up[1],
        d[2] * up[0] - d[0] * up[2],
        d[0] * up[1] - d[1] * up[0],
      ];
      const ul = Math.hypot(...u);
      u = u.map((v) => ((v / ul) * t) / 2);
      const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
      const C = (p, su, sv) => [
        p[0] + u[0] * su + v[0] * sv,
        p[1] + u[1] * su + v[1] * sv,
        p[2] + u[2] * su + v[2] * sv,
      ];
      for (const [s1, t1, s2, t2] of [
        [1, 1, 1, -1],
        [1, -1, -1, -1],
        [-1, -1, -1, 1],
        [-1, 1, 1, 1],
      ]) {
        const n = [
          u[0] * (s1 + s2) + v[0] * (t1 + t2),
          u[1] * (s1 + s2) + v[1] * (t1 + t2),
          u[2] * (s1 + s2) + v[2] * (t1 + t2),
        ];
        g.quad(C(a, s1, t1), C(b, s1, t1), C(b, s2, t2), C(a, s2, t2), c, n);
      }
    };
    // vertical quad along a-b ([x,z]) from y0 to y1 (per end), facing n
    const wall = (g, a, b, ya0, ya1, yb0, yb1, c, n, uv = true) =>
      g.quad(
        [a[0], ya0, a[1]],
        [b[0], yb0, b[1]],
        [b[0], yb1, b[1]],
        [a[0], ya1, a[1]],
        c,
        n,
        uv
          ? [
              [0, ya0 / 3],
              [Math.hypot(b[0] - a[0], b[1] - a[1]) / 3, yb0 / 3],
              [Math.hypot(b[0] - a[0], b[1] - a[1]) / 3, yb1 / 3],
              [0, ya1 / 3],
            ]
          : undefined
      );
    const plate = (text, w, h) =>
      canvasTex(
        512,
        Math.round((512 * h) / w),
        (g2, W, Hh) => {
          g2.fillStyle = '#f4f4ef';
          g2.fillRect(0, 0, W, Hh);
          g2.strokeStyle = '#c4161c';
          g2.lineWidth = Hh * 0.12;
          g2.strokeRect(Hh * 0.06, Hh * 0.06, W - Hh * 0.12, Hh - Hh * 0.12);
          g2.fillStyle = '#111';
          g2.font = `900 ${Math.round(Hh * 0.52)}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
          g2.textAlign = 'center';
          g2.textBaseline = 'middle';
          g2.fillText(text, W / 2, Hh / 2 + Hh * 0.03, W - Hh * 0.5);
        },
        false
      );
    // sign plate centred at (x,y,z), facing (nx,nz)
    const sign = (tex, x, y, z, nx, nz, w, h) => {
      const g2 = new Geo(),
        tx = (nz * w) / 2,
        tz = (-nx * w) / 2; // u runs to the viewer's right
      g2.quad(
        [x - tx, y - h / 2, z - tz],
        [x + tx, y - h / 2, z + tz],
        [x + tx, y + h / 2, z + tz],
        [x - tx, y + h / 2, z - tz],
        col('#ffffff'),
        [nx, 0, nz],
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]
      );
      gradeSigns.push([g2, tex]);
    };

    for (const gi of Object.values(grade)) {
      const hw = gi.w / 2;
      if (gi.kind === 'viaduct') {
        // deck height as addBridge draws it (never below the ground across the deck)
        const deckY = (p, s) =>
          Math.max(
            gi.y(s),
            H(p.x, p.z),
            H(p.x - p.uz * hw, p.z + p.ux * hw),
            H(p.x + p.uz * hw, p.z - p.ux * hw)
          );
        let lastPier = -1e9,
          wasSolid = null;
        for (let s = 0; s < gi.len - 0.01; s += DS) {
          const s2 = Math.min(gi.len, s + DS),
            p = gi.at(s),
            q = gi.at(s2),
            ya = deckY(p, s),
            yb = deckY(q, s2);
          const ga = ya - H(p.x, p.z),
            gb = yb - H(q.x, q.z),
            lo = Math.min(ga, gb),
            hi = Math.max(ga, gb);
          if (hi < 0.3) {
            wasSolid = null;
            continue;
          }
          const nx = -p.uz,
            nz = p.ux,
            solid = lo < RAMP_SOLID;
          const L = [p.x + nx * hw, p.z + nz * hw],
            R = [p.x - nx * hw, p.z - nz * hw];
          // the deck's underside over the open span (the street runs below it)
          if (!solid)
            deckSides.quad(
              [L[0], ya - 0.7, L[1]],
              [q.x + nx * hw, yb - 0.7, q.z + nz * hw],
              [q.x - nx * hw, yb - 0.7, q.z - nz * hw],
              [R[0], ya - 0.7, R[1]],
              CONC,
              [0, -1, 0]
            );
          // where the open span meets the solid ramp: an end wall, closed to the street below
          if (wasSolid !== null && solid !== wasSolid) {
            wall(
              deckSides,
              L,
              R,
              H(L[0], L[1]) - 0.2,
              ya - 0.7,
              H(R[0], R[1]) - 0.2,
              ya - 0.7,
              CONC,
              [p.ux * (solid ? -1 : 1), 0, p.uz * (solid ? -1 : 1)]
            );
            if (inPlayB(p.x, p.z)) collision.addSegment(L[0], L[1], R[0], R[1], -1e9, ya - 1.0);
          }
          wasSolid = solid;
          for (const sd of [1, -1]) {
            const ea = [p.x + nx * hw * sd, p.z + nz * hw * sd],
              eb = [q.x + nx * hw * sd, q.z + nz * hw * sd];
            // low ramp: solid sides down to the ground (an embankment between retaining walls)
            if (lo < RAMP_SOLID && hi > 0.7)
              wall(
                deckSides,
                ea,
                eb,
                H(ea[0], ea[1]) - 0.2,
                ya - 0.7,
                H(eb[0], eb[1]) - 0.2,
                yb - 0.7,
                CONC,
                [nx * sd, 0, nz * sd]
              );
            if (!inPlayB(p.x, p.z)) continue;
            const ca = [p.x + nx * (hw - 0.15) * sd, p.z + nz * (hw - 0.15) * sd],
              cb = [q.x + nx * (hw - 0.15) * sd, q.z + nz * (hw - 0.15) * sd];
            if (solid) collision.addSegment(ca[0], ca[1], cb[0], cb[1]);
            else
              collision.addSegment(
                ca[0],
                ca[1],
                cb[0],
                cb[1],
                Math.min(ya, yb) - 0.8,
                Math.max(ya, yb) + 2.5
              ); // parapet for deck users only
          }
          // square piers with a cap beam, every ~20 m where the street passes under; none on a crossing road
          if (lo >= RAMP_SOLID && s - lastPier >= 20) {
            const cr = roadGrid.nearest(
              p.x,
              p.z,
              (sg) => sg[5].drive && sg[5].grade !== gi.id && !sg[5].under
            );
            if (cr.seg && cr.d < 1.4) continue;
            lastPier = s;
            const ang = Math.atan2(p.uz, p.ux),
              h0 = Hmin(p.x, p.z, 0.8) - 0.3;
            deckSides.box(p.x, p.z, ang, 1.4, 1.4, h0, ya - 1.4, CONC);
            deckSides.box(p.x, p.z, ang, 1.2, gi.w - 1.2, ya - 1.5, ya - 0.7, CONC);
            if (inPlayB(p.x, p.z)) {
              const P = (lx, lz) => [p.x + p.ux * lx - p.uz * lz, p.z + p.uz * lx + p.ux * lz];
              const cs = [P(-0.7, -0.7), P(0.7, -0.7), P(0.7, 0.7), P(-0.7, 0.7)];
              for (let k = 0; k < 4; k++)
                collision.addSegment(
                  cs[k][0],
                  cs[k][1],
                  cs[(k + 1) % 4][0],
                  cs[(k + 1) % 4][1],
                  -1e9,
                  ya - 2
                );
            }
          }
        }
      } else if (gi.kind === 'footbridge') {
        // orange Warren truss with a white roof, deck slab at its foot, red banner; height-limit
        // plates on both faces over the street. The ends run into the two buildings (力行: up to its outside stair).
        const c0 = gi.cut0 || 0,
          A = gi.at(c0),
          L = gi.len - c0,
          ux = A.ux,
          uz = A.uz,
          nx = -uz,
          nz = ux,
          y = gi.y(c0); // (cut0: see gradeDeck)
        const P3 = (s, o, yy) => [A.x + ux * s + nx * o, yy, A.z + uz * s + nz * o];
        const yb = y - 0.4,
          yt = yb + 2.6,
          o = 1.5,
          n = Math.max(2, Math.round(L / 3));
        deckSides.box(
          A.x + (ux * L) / 2,
          A.z + (uz * L) / 2,
          Math.atan2(uz, ux),
          L,
          3.0,
          yb,
          y,
          col('#9c968c')
        );
        for (const sd of [1, -1]) {
          beam(gradeMetal, P3(0, o * sd, yb + 0.15), P3(L, o * sd, yb + 0.15), 0.3, TRUSS);
          beam(gradeMetal, P3(0, o * sd, yt - 0.15), P3(L, o * sd, yt - 0.15), 0.3, TRUSS);
          for (let k = 0; k <= n; k++) {
            const s0 = (k * L) / n,
              s1 = ((k + 1) * L) / n;
            beam(gradeMetal, P3(s0, o * sd, yb + 0.15), P3(s0, o * sd, yt - 0.15), 0.16, TRUSS);
            if (k < n)
              beam(
                gradeMetal,
                P3(s0, o * sd, k % 2 ? yt - 0.15 : yb + 0.15),
                P3(s1, o * sd, k % 2 ? yb + 0.15 : yt - 0.15),
                0.14,
                TRUSS
              );
            // hand rail inside
            if (k < n)
              beam(
                gradeMetal,
                P3(s0, (o - 0.25) * sd, y + 1.05),
                P3(s1, (o - 0.25) * sd, y + 1.05),
                0.06,
                RAILC
              );
          }
        }
        for (let k = 0; k <= n; k++)
          beam(
            gradeMetal,
            P3((k * L) / n, -o, yt - 0.15),
            P3((k * L) / n, o, yt - 0.15),
            0.14,
            TRUSS
          );
        deckSides.box(
          A.x + (ux * L) / 2,
          A.z + (uz * L) / 2,
          Math.atan2(uz, ux),
          L + 0.4,
          3.8,
          yt,
          yt + 0.1,
          col('#f2f2ee')
        );
        // the street's middle under the span
        const sr = gi.prof[0][0] - c0,
          tex = plate('淨高4.7公尺', 0.9, 0.6),
          ban = canvasTex(
            512,
            64,
            (g2, W, Hh) => {
              g2.fillStyle = '#c41e24';
              g2.fillRect(0, 0, W, Hh);
            },
            false
          );
        for (const sd of [1, -1]) {
          const c = P3(sr, (o + 0.2) * sd, yb + 0.3);
          sign(tex, c[0], c[1], c[2], nx * sd, nz * sd, 0.9, 0.6);
          const bc = P3(sr + 5 * sd, (o + 0.18) * sd, yb + 1.25);
          sign(ban, bc[0], bc[1], bc[2], nx * sd, nz * sd, 7, 0.75);
        }
      } else if (gi.kind === 'cut') {
        // open cut between retaining walls, box under the railway (roof = OSM tunnel way)
        const roofed = (s) => !!gi.roof && s > gi.roof[0] + 0.01 && s < gi.roof[1] - 0.01;
        const ceil = (s) => gi.y(s) + (gi.clearance || 4.6) + 0.3;
        const st = new Set([
          gi.s0,
          gi.s1,
          ...(gi.roof || []),
          ...gi.cum.filter((q) => q > gi.s0 && q < gi.s1),
        ]);
        for (let q = gi.s0; q < gi.s1; q += DS) st.add(q);
        const S = [...st].sort((a, b) => a - b).filter((q, i, a) => !i || q - a[i - 1] > 0.05);
        const pts = S.map((q) => {
          const p = gi.at(q);
          return [p.x, p.z];
        });
        addCut(
          pts,
          gi.w,
          (d) => gi.y(gi.s0 + d),
          (d) => roofed(gi.s0 + d)
        );
        const e = hw - 0.35,
          FLOORC = col('#e4e4e4'),
          WHITE2 = col('#e6e5df'),
          YEL = col('#e3bf3c'),
          REFL = col('#ffc21a');
        let next = 0;
        for (let i = 0; i < S.length - 1; i++) {
          const sa = S[i],
            sb = S[i + 1],
            A = pts[i],
            Bq = pts[i + 1],
            l = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) || 1;
          const nx = -(Bq[1] - A[1]) / l,
            nz = (Bq[0] - A[0]) / l,
            ya = gi.y(sa),
            yb = gi.y(sb),
            rf = roofed((sa + sb) / 2);
          const O = (p, o) => [p[0] + nx * o, p[1] + nz * o];
          const Q3 = (p, o, yy) => [p[0] + nx * o, yy, p[1] + nz * o];
          cutFloor.quad(
            Q3(A, hw, ya),
            Q3(Bq, hw, yb),
            Q3(Bq, -hw, yb),
            Q3(A, -hw, ya),
            FLOORC,
            UP,
            [O(A, hw), O(Bq, hw), O(Bq, -hw), O(A, -hw)].map((p) => [p[0] / 8, p[1] / 8])
          );
          // lane marks: edge lines, 雙黃線, dashed lane lines (5 m on / 5 m off)
          const mk = (o, w2, c) =>
            cutMarks.quad(
              Q3(A, o + w2 / 2, ya + 0.03),
              Q3(Bq, o + w2 / 2, yb + 0.03),
              Q3(Bq, o - w2 / 2, yb + 0.03),
              Q3(A, o - w2 / 2, ya + 0.03),
              c,
              UP
            );
          mk(e, 0.15, WHITE2);
          mk(-e, 0.15, WHITE2);
          mk(0.15, 0.12, YEL);
          mk(-0.15, 0.12, YEL);
          if (Math.floor((sa - gi.s0) / 5) % 2 === 0) {
            mk(e / 2, 0.12, WHITE2);
            mk(-e / 2, 0.12, WHITE2);
          }
          for (const sd of [1, -1]) {
            const ia = O(A, hw * sd),
              ib = O(Bq, hw * sd),
              oa = O(A, (hw + CUT_WALL) * sd),
              ob = O(Bq, (hw + CUT_WALL) * sd);
            const ta = rf ? ceil(sa) : H(...O(A, (hw + CUT_WALL / 2) * sd)) + 0.15,
              tb = rf ? ceil(sb) : H(...O(Bq, (hw + CUT_WALL / 2) * sd)) + 0.15;
            const fn = [-nx * sd, 0, -nz * sd];
            wall(deckSides, ia, ib, ya - 0.1, ta, yb - 0.1, tb, WALLC, fn);
            if (!rf) {
              // coping, the outer face down into the ground, a metal railing where the drop is real
              deckSides.quad(
                [ia[0], ta, ia[1]],
                [ib[0], tb, ib[1]],
                [ob[0], tb, ob[1]],
                [oa[0], ta, oa[1]],
                WALLC,
                UP
              );
              wall(deckSides, oa, ob, ta - 0.6, ta, tb - 0.6, tb, WALLC, [nx * sd, 0, nz * sd]);
              if (gi.val(sa) > 0.5) {
                const ra = O(A, (hw + 0.2) * sd),
                  rb = O(Bq, (hw + 0.2) * sd);
                for (const hh of [0.55, 1.1])
                  beam(gradeMetal, [ra[0], ta + hh, ra[1]], [rb[0], tb + hh, rb[1]], 0.05, RAILC);
                beam(gradeMetal, [ra[0], ta, ra[1]], [ra[0], ta + 1.12, ra[1]], 0.06, RAILC);
              }
              if (gi.val(sa) >= 0.3 || gi.val(sb) >= 0.3) {
                const ca = O(A, (hw + 0.2) * sd),
                  cb = O(Bq, (hw + 0.2) * sd);
                collision.addSegment(ca[0], ca[1], cb[0], cb[1]);
              }
            } else {
              const ca = O(A, (hw + 0.2) * sd),
                cb = O(Bq, (hw + 0.2) * sd);
              collision.addSegment(
                ca[0],
                ca[1],
                cb[0],
                cb[1],
                -1e9,
                Math.min(ceil(sa), ceil(sb)) - 0.5
              ); // the box walls; the ground on top stays open
            }
            // reflective markers at the wall foot every 10 m
            if (sa >= next) {
              const m = O(A, (hw - 0.03) * sd);
              beam(gradeLights, [m[0], ya + 0.55, m[1]], [m[0], ya + 0.75, m[1]], 0.1, REFL);
            }
          }
          if (sa >= next) next = sa + 10;
          if (rf) {
            // ceiling (casts the box's shadow) and two rows of lights
            deckSides.quad(
              Q3(A, hw + CUT_WALL, ceil(sa)),
              Q3(Bq, hw + CUT_WALL, ceil(sb)),
              Q3(Bq, -hw - CUT_WALL, ceil(sb)),
              Q3(A, -hw - CUT_WALL, ceil(sa)),
              col('#cfcbc2'),
              [0, -1, 0]
            );
            if (Math.round((sa - gi.roof[0]) / DS) % 2 === 0)
              for (const o of [hw / 2, -hw / 2]) {
                const p = O(A, o),
                  qy = ceil(sa) - 0.06;
                beam(
                  gradeLights,
                  [p[0] - ((Bq[0] - A[0]) / l) * 0.6, qy, p[1] - ((Bq[1] - A[1]) / l) * 0.6],
                  [p[0] + ((Bq[0] - A[0]) / l) * 0.6, qy, p[1] + ((Bq[1] - A[1]) / l) * 0.6],
                  0.12,
                  col('#fff6e0')
                );
              }
          }
        }
        // portals: headwall over the opening with a 限高 plate, railing on top
        if (gi.roof)
          for (const [rs, dir] of [
            [gi.roof[0], -1],
            [gi.roof[1], 1],
          ]) {
            const p = gi.at(rs),
              nx = -p.uz,
              nz = p.ux,
              c = ceil(rs),
              top = H(p.x, p.z) + 0.5,
              W = hw + CUT_WALL;
            const a = [p.x + nx * W, p.z + nz * W],
              b = [p.x - nx * W, p.z - nz * W],
              fo = [p.ux * dir, 0, p.uz * dir];
            wall(deckSides, a, b, c - 0.1, top, c - 0.1, top, WALLC, fo);
            const a2 = [a[0] - p.ux * dir * 0.5, a[1] - p.uz * dir * 0.5],
              b2 = [b[0] - p.ux * dir * 0.5, b[1] - p.uz * dir * 0.5];
            deckSides.quad(
              [a[0], top, a[1]],
              [b[0], top, b[1]],
              [b2[0], top, b2[1]],
              [a2[0], top, a2[1]],
              WALLC,
              UP
            );
            for (const hh of [0.55, 1.1])
              beam(gradeMetal, [a[0], top + hh, a[1]], [b[0], top + hh, b[1]], 0.05, RAILC);
            collision.addSegment(a[0], a[1], b[0], b[1], top - 1.2, 1e9); // the railing; the road in the cut passes below
            sign(
              plate('限高 4.6 M', 2.4, 0.7),
              p.x + p.ux * dir * 0.03,
              (c + top) / 2,
              p.z + p.uz * dir * 0.03,
              p.ux * dir,
              p.uz * dir,
              2.4,
              0.7
            );
          }
      }
    }
  }
  gradeSegs[1] = collision.segs.length;
  // 中北路: no curb sidewalk; ~200 m painted green walkway (標線型人行道)
  // on both sides from the main gate
  {
    const r = data.roads.find((q) => greenWalk(q)),
      gw = r && greenWalk(r);
    if (gw) {
      // one strip along each kerb, broken only across the mouths of the roads that leave on its side
      // (and the first few metres at the gate's grate)
      const { D, M } = streetGaps(r);
      for (const sd of [1, -1])
        lineGaps(
          r,
          null,
          sd * (r.w / 2 + GREEN_W / 2),
          GREEN_W,
          col('#3f8f5a'),
          [[0, 4], ...M[sd]],
          D,
          gw.d
        );
    }
    // painted spots (FEATS, above)
    for (const f of FEATS) {
      const q = f.at,
        R = q.r;
      if (!inPlay([q.x, q.z])) continue;
      // the road's width where the spot sits (r.wv: it changes along the road)
      const RW = R.wv
        ? wOn(
            R,
            q.i,
            Math.min(
              1,
              Math.hypot(q.x - R.pts[q.i][0], q.z - R.pts[q.i][1]) /
                (Math.hypot(R.pts[q.i + 1][0] - R.pts[q.i][0], R.pts[q.i + 1][1] - R.pts[q.i][1]) ||
                  1)
            )
          )
        : R.w;
      // on a deck (bridge, viaduct) the spot is laid at the deck's height where it sits, not on the ground below
      const yd = deckY.get(R),
        y0 = yd
          ? yd(
              Math.max(
                0,
                R.pts
                  .slice(0, q.i)
                  .reduce(
                    (s, p, k) => s + Math.hypot(R.pts[k + 1][0] - p[0], R.pts[k + 1][1] - p[1]),
                    0
                  ) + Math.hypot(q.x - R.pts[q.i][0], q.z - R.pts[q.i][1])
              )
            ) + TOL_LO
          : 0;
      const marks = yd
        ? {
            strip(a, b, w, y, c) {
              const dx = b[0] - a[0],
                dz = b[1] - a[1],
                l = Math.hypot(dx, dz);
              if (l < 0.01) return;
              const nx = ((-dz / l) * w) / 2,
                nz = ((dx / l) * w) / 2;
              deckMarks.quad(
                [a[0] + nx, y0 + y, a[1] + nz],
                [b[0] + nx, y0 + y, b[1] + nz],
                [b[0] - nx, y0 + y, b[1] - nz],
                [a[0] - nx, y0 + y, a[1] - nz],
                c,
                UP
              );
            },
            flatPoly(pts, y, c) {
              for (let k = 1; k < pts.length - 1; k++)
                deckMarks.tri(
                  [pts[0][0], y0 + y, pts[0][1]],
                  [pts[k][0], y0 + y, pts[k][1]],
                  [pts[k + 1][0], y0 + y, pts[k + 1][1]],
                  c,
                  UP
                );
            },
          }
        : groundMarks;
      if (f.t === 'box') {
        // 網狀黃線: outline + diagonal grid; kerb to kerb, or w wide round its surveyed centre
        // (one nearly as wide as the street is laid kerb to kerb: the OSM line can be off the real centre by a metre or two;
        // one much wider spans both one-way ways of a split street, round its surveyed centre)
        const part = f.w && (f.w < RW - 1.5 || f.w > RW + 1.5),
          v0 = part ? (f.x - q.x) * -q.uz + (f.z - q.z) * q.ux : 0,
          h = f.len / 2,
          e = (part ? f.w / 2 : RW / 2) - 0.35;
        const P = (u, v) => [q.x + q.ux * u - q.uz * (v + v0), q.z + q.uz * u + q.ux * (v + v0)];
        const bar = (u0, v0, u1, v1) => marks.strip(P(u0, v0), P(u1, v1), 0.14, 0.045, YELLOW);
        bar(-h, -e, h, -e);
        bar(-h, e, h, e);
        bar(-h, -e, -h, e);
        bar(h, -e, h, e);
        for (let c = -h - e + 1.6; c < h + e; c += 1.6) {
          const a0 = Math.max(-e, -h - c),
            a1 = Math.min(e, h - c);
          if (a1 - a0 > 0.2) bar(a0 + c, a0, a1 + c, a1); // u = v + c
          const b0 = Math.max(-e, c - h),
            b1 = Math.min(e, c + h);
          if (b1 - b0 > 0.2) bar(c - b0, b0, c - b1, b1); // u = c - v
        }
        continue;
      }
      // the others are laid on their own direction: u along ang (the street), v across it
      const a = ((f.ang ?? (Math.atan2(q.uz, q.ux) * 180) / Math.PI) * Math.PI) / 180,
        ux = Math.cos(a),
        uz = Math.sin(a);
      const P = (u, v) => [f.x + ux * u - uz * v, f.z + uz * u + ux * v],
        W = (f.w || RW) / 2;
      if (f.t === 'zebra') {
        // 斑馬線: 0.45 m bars along the street, 0.9 m apart, across its width
        if (f.osm) continue; // src/world/Furniture.js already lays this one (OSM crossing / signal junction): only breaks the lines
        const L = (f.len || 3) / 2;
        for (let v = -W + 0.5; v <= W - 0.3; v += 0.9)
          marks.strip(P(-L, v), P(L, v), 0.45, 0.05, WHITE);
      } else if (f.t === 'stop') marks.strip(P(0, -W), P(0, W), 0.4, 0.045, WHITE);
      else if (f.t === 'arrow') {
        // 直行箭頭, one per lane across w; it points the way traffic drives in its lane
        const v = (f.x - q.x) * -q.uz + (f.z - q.z) * q.ux,
          k = R.oneway || v >= ((R.marks && R.marks.cv) || 0) ? 1 : -1;
        const dx = q.ux * k,
          dz = q.uz * k,
          n = f.w && f.w > 5 ? Math.round(f.w / 3.3) : 1;
        for (let j = 0; j < n; j++) {
          const o = ((j - (n - 1) / 2) * (f.w || 3.3)) / n,
            cx = f.x - dz * o,
            cz = f.z + dx * o;
          const A = (u, s2) => [cx + dx * u - dz * s2, cz + dz * u + dx * s2];
          marks.strip(A(-2.5, 0), A(0.9, 0), 0.3, 0.045, WHITE);
          marks.flatPoly([A(0.8, -0.5), A(0.8, 0.5), A(2.5, 0)], 0.045, WHITE);
        }
      } else if (f.t === 'bikebox') {
        // 機車停等區: a white box
        const L = (f.len || 3) / 2;
        for (const [u0, v0, u1, v1] of [
          [-L, -W, L, -W],
          [-L, W, L, W],
          [-L, -W, -L, W],
          [L, -W, L, W],
        ])
          marks.strip(P(u0, v0), P(u1, v1), 0.15, 0.045, WHITE);
      }
    }
    // 正門 截水溝: a flush stainless grate (~0.3 m) across the end of 中北路, asphalt on the street side,
    // forecourt pavers on the gate side (Google 街景 2024-08 heading 35; ends estimated ±3 m)
    if (r && opts.mainGate && hasNodes(r) && r.nodes[0] === opts.mainGate.streetNode) {
      // the grate's line runs (-216,80) -> (-207,93); it starts at the lawn edge of 中北路 and ends on the forecourt
      const p0 = [-216, 80],
        p1 = [-207, 93],
        pl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]),
        gx = (p1[0] - p0[0]) / pl,
        gz = (p1[1] - p0[1]) / pl;
      const a = r.pts[0],
        b = r.pts[1],
        l = Math.hypot(a[0] - b[0], a[1] - b[1]),
        ux = (a[0] - b[0]) / l,
        uz = (a[1] - b[1]) / l,
        nx = -uz,
        nz = ux;
      // where the grate crosses the street axis, then a quad from there to past the end disc
      const t = ((a[0] - p0[0]) * nx + (a[1] - p0[1]) * nz) / (gx * nx + gz * nz),
        cx = p0[0] + gx * t,
        cz = p0[1] + gz * t;
      const half = r.w / 2 + 0.3,
        sk = half / Math.abs(gx * nx + gz * nz),
        e = r.w / 2 + 0.2;
      const g0 = [cx - gx * sk, cz - gz * sk],
        g1 = p1,
        gl = Math.hypot(g1[0] - g0[0], g1[1] - g0[1]);
      gatePave.flatPoly(
        [
          [cx - gx * sk, cz - gz * sk],
          [cx + gx * sk, cz + gz * sk],
          [a[0] + ux * e + nx * half, a[1] + uz * e + nz * half],
          [a[0] + ux * e - nx * half, a[1] + uz * e - nz * half],
        ],
        0.03,
        GATE_PAVE
      );
      // the two lanes and the forecourt between the grate, the exit lane and the name wall's lawn
      for (const q of data.roads) {
        if (!gateLane(q)) continue;
        for (let i = 0; i < q.pts.length - 1; i++)
          gatePave.strip(q.pts[i], q.pts[i + 1], q.w, 0.03, GATE_PAVE);
        for (const p of q.pts) gatePave.disc(p[0], p[1], q.w / 2, 0.03, GATE_PAVE, 10);
      }
      if (opts.mainGate.forecourt) gatePave.flatPoly(opts.mainGate.forecourt, 0.03, GATE_PAVE);
      gateGrate.strip(g0, g1, 0.36, 0.04, col('#8f9296'));
      gateGrate.strip(g0, g1, 0.26, 0.045, col('#2c2d30'));
      for (let d = 0.06; d < gl; d += 0.09)
        gateGrate.strip(
          [g0[0] + gx * d - gz * 0.13, g0[1] + gz * d + gx * 0.13],
          [g0[0] + gx * d + gz * 0.13, g0[1] + gz * d - gx * 0.13],
          0.025,
          0.05,
          col('#a3a6aa')
        );
    }
  }
  addFlat(walks, gmat(T.sidewalk(), { macroAmt: 0.2 }), 'roads');
  addFlat(layers[0], gmat(T.sidewalk(), { macroAmt: 0.2 }), 'roads');
  addFlat(footCampus, gmat(T.paving(), { macroAmt: 0.2 }), 'roads');
  const asphMat = gmat(T.asphalt(), { roughness: 1, env: 0.7, macroAmt: 0.24 });
  for (let i = 1; i < layers.length; i++) addFlat(layers[i], asphMat, 'roads');
  addFlat(
    cutFloor,
    gmat(T.asphalt(), { roughness: 1, env: 0.7, macroAmt: 0.24, mask: false }),
    'roads'
  );
  addFlat(
    marks,
    maskCut(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        depthWrite: false,
        roughness: 0.65,
        envMapIntensity: 0.6,
        ...OFFSET,
      })
    ),
    'roads'
  );
  addFlat(
    cutMarks,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      depthWrite: false,
      roughness: 0.65,
      envMapIntensity: 0.6,
      ...OFFSET,
    }),
    'roads'
  );
  if (gradeMetal.tris) {
    const m = gradeMetal.mesh(
      new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.45 })
    );
    m.castShadow = quality !== 'low';
    scene.add(m);
  }
  if (gradeLights.tris)
    scene.add(
      gradeLights.mesh(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          emissive: '#fff1cf',
          emissiveIntensity: 1.4,
          roughness: 0.5,
        })
      )
    );
  for (const [g2, tex] of gradeSigns)
    scene.add(
      g2.mesh(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }))
    );
  if (deckBase.tris) {
    const m = deckBase.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    m.receiveShadow = true;
    m.renderOrder = world.groundMesh.renderOrder + 0.5;
    scene.add(m);
    world.tris.deckBase = deckBase.tris;
  }
  if (deckSides.tris) {
    const conc = concreteTex();
    const m = deckSides.mesh(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: conc.map,
        normalMap: conc.normalMap,
        roughness: 0.85,
        side: THREE.DoubleSide,
      })
    );
    m.receiveShadow = true;
    m.castShadow = quality !== 'low';
    scene.add(m);
  }
  addFlat(gatePave, gmat(T.paving(), { macroAmt: 0.2 }), 'roads'); // 正門 pavers over the lane asphalt, then the grate
  addFlat(
    gateGrate,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      depthWrite: false,
      roughness: 0.5,
      metalness: 0.4,
      envMapIntensity: 0.6,
      ...OFFSET,
    }),
    'roads'
  );
  onProgress(0.4);

  // ---------- buildings ----------
  // one wall mesh per facade (window style + OSM material); material variants
  // are only built when some building actually carries the tag
  const wallMat = {};
  const wallGeo = {};
  const SEED = { campus: 7, town: 11, apt: 13, wash: 17, glass: 19, concrete: 23, arcade: 29 };
  // PBR facades (src/graphics/Textures.js): colour + normal + roughness/metalness (glass panes reflect the sky)
  const makeWallMat = (t, o = {}) =>
    new THREE.MeshStandardMaterial({
      map: t.map,
      emissiveMap: t.emi,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0,
      vertexColors: true,
      normalMap: t.normalMap,
      roughnessMap: t.rm,
      metalnessMap: t.rm,
      roughness: 1,
      metalness: 1,
      envMapIntensity: o.env ?? 1,
    });
  // low quality stores the 8x8 facade atlases at 64 px per cell (a quarter of the memory)
  const texPx = quality === 'low' ? 64 : 128;
  const wallFor = (style, mat) => {
    const k = mat ? `${style}:${mat}` : style;
    if (!wallGeo[k] && PBR_STYLES.has(style) && !mat) {
      wallMat[k] = makeWallMat(facadeTex(style, texPx));
      wallGeo[k] = new Geo();
    }
    if (!wallGeo[k]) {
      const t = windowTextures(style, (SEED[style] || 5) + (mat ? mat.length * 101 : 0), mat);
      const shiny = style === 'glass' || mat === 'glass' || mat === 'metal';
      wallMat[k] = new THREE.MeshStandardMaterial({
        map: t.map,
        emissiveMap: t.emi,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0,
        vertexColors: true,
        roughness: shiny ? 0.4 : 0.85,
        metalness: mat === 'metal' ? 0.3 : style === 'glass' ? 0.15 : 0.0,
      });
      wallGeo[k] = new Geo();
    }
    return wallGeo[k];
  };
  // tools/looks.json walls: facadeParam atlas (one row per window type). The rm mask's R
  // channel marks frames / pilasters / louvers (tinted by aAccent), metalness (B) the glass
  // (tinted by aGlass); everything else keeps the wall's vertex colour.
  const wallForParam = (base) => {
    const k = `facp:${base}`;
    if (!wallGeo[k]) {
      const m = (wallMat[k] = makeWallMat(facadeParam(base, texPx)));
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = `attribute vec3 aAccent;\nattribute vec3 aGlass;\nvarying vec3 vAccent;\nvarying vec3 vGlass;\n${sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n vAccent = aAccent; vGlass = aGlass;')}`;
        sh.fragmentShader = `varying vec3 vAccent;\nvarying vec3 vGlass;\n${sh.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec4 lookMask = texture2D(roughnessMap, vRoughnessMapUv);
          float wA = smoothstep(0.5, 0.9, lookMask.r), wG = (1.0 - wA) * smoothstep(0.25, 0.7, lookMask.b);
          diffuseColor.rgb = mix(diffuseColor.rgb, sampledDiffuseColor.rgb * vAccent, wA);
          diffuseColor.rgb = mix(diffuseColor.rgb, sampledDiffuseColor.rgb * vGlass, wG);`
        )}`;
      };
      m.customProgramCacheKey = () => 'facp';
      wallGeo[k] = new Geo().withAccents();
    }
    return wallGeo[k];
  };
  // ground floor shop fronts (town / commercial walls facing a street)
  const shopGeo = new Geo();
  const SHOP_LO = [0.72, 0.72, 0.72],
    SHOP_HI = [1, 1, 1];
  // OSM buildings judge their street on the OSM road widths (r.rw: width from tools/roads.json), so
  // the shop fronts, and the shared rnd2 draws they gate, stay as before; the 補建 fill, cut back
  // behind the new kerbs and drawing from its own streams, faces the roads as they are now
  // (a road tools/roads.json 'shift' moved sideways, r.sh, counts on its OSM line too)
  const preRoads = data.roads.some((r) => r.rw || r.sh) ? new SegGrid(20) : roadGrid;
  if (preRoads !== roadGrid) {
    for (const sg of roadGrid.segs)
      if (!sg[5].sh)
        preRoads.add(sg[0], sg[1], sg[2], sg[3], sg[5].rw ? sg[5].osm.w : sg[4], sg[5]);
    for (const r of data.roads)
      if (r.sh)
        for (let i = 0; i < r.osm.pts.length - 1; i++)
          preRoads.add(
            r.osm.pts[i][0],
            r.osm.pts[i][1],
            r.osm.pts[i + 1][0],
            r.osm.pts[i + 1][1],
            r.osm.w,
            r
          );
  }
  const facesStreet = (a, c, n, grid = preRoads) => {
    const mx = (a[0] + c[0]) / 2,
      mz = (a[1] + c[1]) / 2,
      px = mx + n[0] * 4,
      pz = mz + n[2] * 4;
    const q = grid.nearest(px, pz, (sg) => sg[5].drive && (sg[5].type !== 'service' || sg[5].name));
    // the facing road's props (truthy) or null; type tells main roads from lanes
    return q.seg && q.d < 4 && (q.q[0] - mx) * n[0] + (q.q[1] - mz) * n[2] > 0 ? q.seg[5] : null;
  };
  // Google 街景目視（2024-08 中北路／實踐路、2026-05 力行北街）: 鐵皮加蓋 is about
  // 30-40% of lane houses and 10-20% on main roads. OSM tags 中北路／實踐路 as
  // residential, so only service / living_street count as lanes here.
  const LANE_TYPES = new Set(['service', 'living_street']);
  const SHED_P = { lane: 0.35, main: 0.15 };
  // flat roofs sample the plain half of the roof atlas
  const roofGeo = new Geo(false, () => [0.1, 0.5]);
  // rooftop 鐵皮加蓋 sheds and stair houses, all merged into roofGeo
  const SHED = ['#4a78a8', '#3f6a94', '#8d959b', '#a3a9ad', '#9a5236', '#7c4430'].map(col);
  const Q3 = (f, u, v, y) => {
    const p = f.P(u, v);
    return [p[0], y, p[1]];
  };
  const roofBox = (f, [u0, u1, v0, v1], y0, hh, wc, tc) => {
    const sides = [
      [u0, v0, u1, v0, [f.uz, 0, -f.ux]],
      [u1, v0, u1, v1, [f.ux, 0, f.uz]],
      [u1, v1, u0, v1, [-f.uz, 0, f.ux]],
      [u0, v1, u0, v0, [-f.ux, 0, -f.uz]],
    ];
    for (const [ua, va, ub, vb, n] of sides)
      roofGeo.quad(
        Q3(f, ua, va, y0),
        Q3(f, ub, vb, y0),
        Q3(f, ub, vb, y0 + hh),
        Q3(f, ua, va, y0 + hh),
        wc,
        n
      );
    roofGeo.quad(
      Q3(f, u0, v0, y0 + hh),
      Q3(f, u1, v0, y0 + hh),
      Q3(f, u1, v1, y0 + hh),
      Q3(f, u0, v1, y0 + hh),
      tc,
      UP
    );
  };
  const shed = (f, [u0, u1, v0, v1], y0, rb) => {
    const rc = SHED[Math.floor(rb() * SHED.length)],
      wc = rb() < 0.5 ? rc.map((v) => Math.min(1, v * 1.12)) : col('#d5d6d0');
    const wh = 2.5,
      gable = rb() < 0.45,
      vm = (v0 + v1) / 2;
    const hA = y0 + wh,
      hB = gable ? hA : hA + 0.6,
      hR = hA + 0.9;
    const R = RIB * 32,
      rib = (d) => [0.75, d / R];
    const wall = (ua, va, ub, vb, ha, hb, n, d0) => {
      const l = Math.hypot(...f.P(ub, vb).map((v, i) => v - f.P(ua, va)[i]));
      roofGeo.quad(
        Q3(f, ua, va, y0),
        Q3(f, ub, vb, y0),
        Q3(f, ub, vb, hb),
        Q3(f, ua, va, ha),
        wc,
        n,
        [rib(d0), rib(d0 + l), rib(d0 + l), rib(d0)]
      );
    };
    wall(u0, v0, u1, v0, hA, hA, [f.uz, 0, -f.ux], 0);
    wall(u1, v1, u0, v1, hB, hB, [-f.uz, 0, f.ux], 0);
    for (const [u, sg] of [
      [u0, -1],
      [u1, 1],
    ]) {
      const n = [f.ux * sg, 0, f.uz * sg];
      wall(u, v0, u, v1, hA, hB, n, 0);
      if (gable)
        roofGeo.tri(
          Q3(f, u, v0, hA),
          Q3(f, u, v1, hA),
          Q3(f, u, vm, hR),
          wc,
          n,
          rib(0),
          rib(v1 - v0),
          rib(vm - v0)
        );
    }
    // sheet roof with a small overhang; ribs run downslope
    const o = 0.3,
      U0 = u0 - o,
      U1 = u1 + o;
    const sheet = (va, vb, ha, hb) => {
      const a = Q3(f, U0, va, ha),
        b = Q3(f, U1, va, ha),
        c = Q3(f, U1, vb, hb),
        d = Q3(f, U0, vb, hb);
      roofGeo.quad(a, b, c, d, rc, triN(a, b, c), [rib(0), rib(U1 - U0), rib(U1 - U0), rib(0)]);
    };
    const sl = (hB - hA) / (v1 - v0);
    if (gable) {
      sheet(v0 - o, vm, hA - (0.9 / (vm - v0)) * o, hR);
      sheet(vm, v1 + o, hR, hA - (0.9 / (vm - v0)) * o);
    } else sheet(v0 - o, v1 + o, hA - sl * o, hB + sl * o);
    return gable ? 0.9 + wh : wh + 0.6;
  };
  const PAL = {
    campus: ['#d8cfc0', '#c9a48b', '#b8705a', '#e9e4da', '#c4b5a0', '#a86d5d'],
    dorm: ['#e2d4bd', '#cdb79c', '#d9c9b5'],
    // 二丁掛 / 小口磁磚 colours, 20 entries weighted after the Google 街景目視判斷
    // of 力行北街, 中北路, 實踐路 (2024-08 / 2026-05, viewed only): ~70% off-white /
    // cream / light grey (14), ~20% light pink / light brown / light green (4),
    // ~10% dark stone or brick red (2)
    town: [
      '#e4e0d6',
      '#d6d2c8',
      '#e8dfcc',
      '#ece6d6',
      '#d9cdbd',
      '#cfc9bd',
      '#c7c6c0',
      '#bfbcb4',
      '#e0d6c2',
      '#d2d4d0',
      '#e6dccb',
      '#cfc4b4',
      '#dcd8cf',
      '#c9c3b8',
      '#e3c9c0',
      '#d8bfae',
      '#c9b29b',
      '#c8d3c0',
      '#7a6a5c',
      '#a8604c',
    ],
    commercial: ['#9fa6ad', '#c0c4c8', '#b0b6a8'],
    church: ['#f0ece2', '#e9e2d0'],
    small: ['#dddddd'],
  };
  // OSM building:colour / building:material (rare in this area) override the palette
  const MAT_COL = {
    brick: '#a65a43',
    concrete: '#bdbab3',
    glass: '#9fb4c2',
    metal: '#9aa0a6',
    stone: '#c9c1b2',
    wood: '#9a7650',
    plaster: '#e3dccd',
    tiles: '#cdb9a4',
  };
  const NAMED_COL = {
    white: '#eeeeea',
    grey: '#a8a8a4',
    gray: '#a8a8a4',
    red: '#a85848',
    brown: '#8a6a50',
    beige: '#e0d2b4',
    yellow: '#e2cf8a',
    blue: '#8fa6bf',
    black: '#444444',
  };
  const ROOF_MAT_COL = {
    roof_tiles: '#9a4a3a',
    tile: '#9a4a3a',
    tiles: '#9a4a3a',
    metal: '#7d8a94',
    metal_sheet: '#7d8a94',
    concrete: '#9a9890',
    asphalt: '#5a5a5a',
    glass: '#8aa4b4',
    grass: '#5d7d44',
    slate: '#5a6068',
    wood: '#7a5a3c',
  };
  const hexOrNamed = (v) => {
    const c = (v || '').trim().toLowerCase();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(c)) return c;
    return NAMED_COL[c] || null;
  };
  const matKey = (b) => MAT_KEY[(b.material || '').trim().toLowerCase()] || null;
  const osmCol = (b) => hexOrNamed(b.colour) || MAT_COL[matKey(b)] || null;
  const osmRoofCol = (b) =>
    hexOrNamed(b.roofColour) || ROOF_MAT_COL[(b.roofMaterial || '').trim().toLowerCase()] || null;
  // pitched roofs from OSM roof:shape; returns false for flat / unsupported
  const triN = (a, b, c) => {
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2],
      vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    if (n[1] < 0) n = n.map((v) => -v);
    const l = Math.hypot(...n) || 1;
    return n.map((v) => v / l);
  };
  const rtri = (a, b, c, cl) => roofGeo.tri(a, b, c, cl, triN(a, b, c));
  const pitchedRoof = (b, pts, h, rc, wc) => {
    const shape = (b.roof || '').trim().toLowerCase();
    if (!shape || shape === 'flat' || b.holes) return false;
    // footprint frame along the longest edge
    let li = 0,
      ll = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        c = pts[(i + 1) % pts.length],
        l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (l > ll) {
        ll = l;
        li = i;
      }
    }
    const a0 = pts[li],
      a1 = pts[(li + 1) % pts.length];
    const ux = (a1[0] - a0[0]) / ll,
      uz = (a1[1] - a0[1]) / ll;
    let v0 = 1e9,
      v1 = -1e9;
    for (const p of pts) {
      const v = (p[0] - a0[0]) * -uz + (p[1] - a0[1]) * ux;
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const rise = b.roofH || Math.min(6, Math.max(1.2, (v1 - v0) * 0.3));
    const P = (p, y) => [p[0], y, p[1]];
    if (pts.length === 4 && (shape === 'gabled' || shape === 'skillion')) {
      const [p0, p1, p2, p3] = [0, 1, 2, 3].map((k) => pts[(li + k) % 4]);
      if (shape === 'gabled' && (b.feature || []).includes('gable_row')) {
        // 設計學院: a row of small dark-grey gables (Google 街景目視, 2017-09), ridges
        // across the short side, one every ~7 m along the long edge p0-p1
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]),
          N = Math.max(1, Math.round(len / (b.gableEvery || 7))); // b.gableEvery: src/world/zones/ZoneE.js（實測 4 m）
        const rr = b.roofH || Math.min(2.4, (len / N) * 0.32);
        const lp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        for (let i = 0; i < N; i++) {
          const t0 = i / N,
            t1 = (i + 1) / N,
            tm = (t0 + t1) / 2;
          const A = lp(p0, p1, t0),
            B = lp(p0, p1, t1),
            D = lp(p3, p2, t0),
            C = lp(p3, p2, t1),
            MA = lp(p0, p1, tm),
            MD = lp(p3, p2, tm);
          rtri(P(A, h), P(MA, h + rr), P(MD, h + rr), rc);
          rtri(P(A, h), P(MD, h + rr), P(D, h), rc);
          rtri(P(MA, h + rr), P(B, h), P(C, h), rc);
          rtri(P(MA, h + rr), P(C, h), P(MD, h + rr), rc);
          // gable ends on both long walls (outward normal of p0-p1 for a CCW ring)
          const n0 = [(p1[1] - p0[1]) / len, 0, -(p1[0] - p0[0]) / len];
          roofGeo.tri(P(A, h), P(B, h), P(MA, h + rr), wc, n0);
          roofGeo.tri(
            P(D, h),
            P(C, h),
            P(MD, h + rr),
            wc,
            n0.map((v) => -v)
          );
        }
        return rr;
      }
      if (shape === 'gabled') {
        const m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
          m2 = [(p3[0] + p0[0]) / 2, (p3[1] + p0[1]) / 2];
        rtri(P(p0, h), P(p1, h), P(m1, h + rise), rc);
        rtri(P(p0, h), P(m1, h + rise), P(m2, h + rise), rc);
        rtri(P(p2, h), P(p3, h), P(m2, h + rise), rc);
        rtri(P(p2, h), P(m2, h + rise), P(m1, h + rise), rc);
        // gable ends
        roofGeo.tri(
          P(p1, h),
          P(p2, h),
          P(m1, h + rise),
          wc,
          [p2[1] - p1[1], 0, p1[0] - p2[0]].map(
            (v) => v / (Math.hypot(p2[1] - p1[1], p1[0] - p2[0]) || 1)
          )
        );
        roofGeo.tri(
          P(p3, h),
          P(p0, h),
          P(m2, h + rise),
          wc,
          [p0[1] - p3[1], 0, p3[0] - p0[0]].map(
            (v) => v / (Math.hypot(p0[1] - p3[1], p3[0] - p0[0]) || 1)
          )
        );
      } else {
        rtri(P(p0, h), P(p1, h), P(p2, h + rise), rc);
        rtri(P(p0, h), P(p2, h + rise), P(p3, h + rise), rc);
        const wn = (a, c) => {
          const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
          return [(c[1] - a[1]) / l, 0, -(c[0] - a[0]) / l];
        };
        roofGeo.tri(P(p1, h), P(p2, h), P(p2, h + rise), wc, wn(p1, p2));
        roofGeo.tri(P(p3, h), P(p0, h), P(p3, h + rise), wc, wn(p3, p0));
        roofGeo.quad(P(p2, h), P(p3, h), P(p3, h + rise), P(p2, h + rise), wc, wn(p2, p3));
      }
      return rise;
    }
    // hipped / pyramidal / dome / other pitched shapes: fan to an apex
    if (shape === 'skillion') return false;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length,
      cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (!pointInPoly(cx, cz, pts)) return false;
    for (let i = 0; i < pts.length; i++)
      rtri(P(pts[i], h), P(pts[(i + 1) % pts.length], h), [cx, h + rise, cz], rc);
    return rise;
  };
  // named roof extras from overrides.json 'feature' (visual only, merged into roofGeo)
  // vertical cylinder wall (+ optional lid) from S quads
  const cylinder = (cx, cz, y0, hh, r, wc, S = 12, lid = null) => {
    for (let k = 0; k < S; k++) {
      const a0 = (k / S) * Math.PI * 2,
        a1 = ((k + 1) / S) * Math.PI * 2,
        am = (a0 + a1) / 2;
      const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r],
        p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
      roofGeo.quad(
        [p0[0], y0, p0[1]],
        [p1[0], y0, p1[1]],
        [p1[0], y0 + hh, p1[1]],
        [p0[0], y0 + hh, p0[1]],
        wc,
        [Math.cos(am), 0, Math.sin(am)]
      );
      if (lid)
        roofGeo.tri([cx, y0 + hh, cz], [p0[0], y0 + hh, p0[1]], [p1[0], y0 + hh, p1[1]], lid, UP);
    }
  };
  // compass directions in map space (x = east, z = south)
  const R2 = Math.SQRT1_2;
  const DIRS = {
    n: [0, -1],
    s: [0, 1],
    e: [1, 0],
    w: [-1, 0],
    ne: [R2, -R2],
    nw: [-R2, -R2],
    se: [R2, R2],
    sw: [-R2, R2],
  };
  // does outward normal n face compass direction o (within ~50°, and nearest of o's family)
  const facing = (n, o) => {
    const dot = (k) => n[0] * DIRS[k][0] + n[2] * DIRS[k][1],
      d = dot(o);
    return (
      d > 0.64 &&
      (o.length === 1 ? ['n', 'e', 's', 'w'] : ['ne', 'se', 'sw', 'nw']).every(
        (k) => dot(k) <= d + 1e-9
      )
    );
  };
  // the footprint edge (>= minLen) whose outward normal is closest to compass direction `on`
  const wallFacing = (pts, on, minLen = 0) => {
    const dv = DIRS[on] || DIRS.s;
    let best = null,
      bd = -2;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        c = pts[(i + 1) % pts.length],
        dx = c[0] - a[0],
        dz = c[1] - a[1],
        l = Math.hypot(dx, dz);
      if (l < Math.max(minLen, 0.05)) continue;
      const d = (dz / l) * dv[0] + (-dx / l) * dv[1];
      if (d > bd) {
        bd = d;
        best = [a, c, l, [dz / l, 0, -dx / l]];
      }
    }
    return best;
  };
  // entrance canopy / covered walkway outside the wall facing o.on (looks.json canopy and the
  // 體育館 entrance_canopy): o.w long (m, along the wall, centred at fraction o.at from its
  // west end; at 0 = 1 m from that end), o.d deep, eave o.h above the lowest ground under it.
  // rise > 0: gabled tile roof (roofColour), else a flat slab o.t thick. Posts only, no collider.
  const canopyAt = (pts, o) => {
    const best = wallFacing(pts, o.on, o.minLen ?? Math.min(o.w, 6));
    if (!best) return;
    let [a, c] = [best[0], best[1]];
    const [, , l, n] = best;
    if (c[0] < a[0]) [a, c] = [c, a]; // a = west end
    const len = Math.min(o.w, l - 2),
      tx = (c[0] - a[0]) / l,
      tz = (c[1] - a[1]) / l,
      D = o.d,
      eave = o.h,
      rr = o.rise || 0;
    if (len < 1) return;
    const s0 = Math.min(l - 1 - len, Math.max(1, (o.at || 0) * l - len / 2));
    const at = (s, d) => [a[0] + tx * s + n[0] * d, a[1] + tz * s + n[2] * d];
    const y = Hmin(...at(s0 + len / 2, D / 2), Math.max(len, D) / 2);
    const Pq = (s, d, yy) => {
      const p = at(s0 - 1 + s, d);
      return [p[0], yy, p[1]];
    };
    const pc = col(o.colour || '#e6e2d8');
    if (rr > 0) {
      const rc = col(o.roofColour || '#9a4a3a');
      rtri(Pq(1, 0, y + eave), Pq(1 + len, 0, y + eave), Pq(1 + len, D / 2, y + eave + rr), rc);
      rtri(Pq(1, 0, y + eave), Pq(1 + len, D / 2, y + eave + rr), Pq(1, D / 2, y + eave + rr), rc);
      rtri(Pq(1, D, y + eave), Pq(1 + len, D, y + eave), Pq(1 + len, D / 2, y + eave + rr), rc);
      rtri(Pq(1, D, y + eave), Pq(1 + len, D / 2, y + eave + rr), Pq(1, D / 2, y + eave + rr), rc);
      roofGeo.tri(Pq(1, 0, y + eave), Pq(1, D, y + eave), Pq(1, D / 2, y + eave + rr), pc, [
        -tx,
        0,
        -tz,
      ]);
      roofGeo.tri(
        Pq(1 + len, 0, y + eave),
        Pq(1 + len, D, y + eave),
        Pq(1 + len, D / 2, y + eave + rr),
        pc,
        [tx, 0, tz]
      );
    } else {
      const m = at(s0 + len / 2, D / 2 - 0.05),
        t = o.t || 0.3;
      ledgeGeo.box(m[0], m[1], Math.atan2(tz, tx), len, D + 0.1, y + eave - t, y + eave, pc);
    }
    if (o.posts !== false)
      for (let s = 1.3; s <= len + 0.8; s += len / Math.max(1, Math.round(len / 4))) {
        const p = at(s0 - 1 + s, D - 0.3);
        cylinder(
          p[0],
          p[1],
          H(p[0], p[1]) - 0.2,
          y + eave - H(p[0], p[1]) + 0.2,
          0.18,
          col(o.postColour || o.colour || '#e6e2d8'),
          6
        );
      }
  };
  // ring offset inwards by d (outward for d < 0); mitred corners, CCW outer / CW courtyard rings
  const offsetRing = (r, d) =>
    r.map((p, i) => {
      const q = r[(i - 1 + r.length) % r.length],
        c = r[(i + 1) % r.length];
      const nrm = (u, w) => {
        const dx = w[0] - u[0],
          dz = w[1] - u[1],
          l = Math.hypot(dx, dz) || 1;
        return [dz / l, -dx / l];
      };
      const n1 = nrm(q, p),
        n2 = nrm(p, c),
        k = d / Math.max(0.35, 1 + n1[0] * n2[0] + n1[1] * n2[1]);
      return [p[0] - (n1[0] + n2[0]) * k, p[1] - (n1[1] + n2[1]) * k];
    });
  // looks.json roof extras on a flat roof at y = top: boxes (stair cores, skylights, plant
  // rooms) and rows of solar panels, placed in fractions of the footprint's oriented box
  const lookRoof = (R, vp, holes, top) => {
    const f = obb(vp),
      L = f.u1 - f.u0,
      W = f.v1 - f.v0;
    const inRoof = (u, v) => {
      const p = f.P(u, v);
      return (
        pointInPoly(p[0], p[1], vp) && !(holes || []).some((hh) => pointInPoly(p[0], p[1], hh))
      );
    };
    for (const bx of R.boxes || []) {
      const [w, d] = bx.size;
      let u = f.u0 + (bx.at?.[0] ?? 0.5) * L,
        v = f.v0 + (bx.at?.[1] ?? 0.5) * W;
      // corner: 'nw' etc. puts the box 1 m inside the oriented-box corner nearest that direction
      if (bx.corner) {
        let bs = -Infinity;
        for (const cu of [f.u0 + w / 2 + 1, f.u1 - w / 2 - 1])
          for (const cv of [f.v0 + d / 2 + 1, f.v1 - d / 2 - 1]) {
            const p = f.P(cu, cv),
              sc = p[0] * DIRS[bx.corner][0] + p[1] * DIRS[bx.corner][1];
            if (sc > bs) {
              bs = sc;
              u = cu;
              v = cv;
            }
          }
      }
      const wc = col(bx.colour || '#cfccc4');
      roofBox(
        f,
        [u - w / 2, u + w / 2, v - d / 2, v + d / 2],
        top,
        bx.h ?? 3,
        wc,
        bx.topColour ? col(bx.topColour) : wc.map((x) => x * 0.8)
      );
    }
    if (R.solar) {
      // panel rows across v every 2.2 m, 1.7 m deep, tilted; 2 m cells kept when all corners
      // stay 1 m inside the roof, merged into runs along u
      const S = R.solar === true ? {} : R.solar,
        [ua, ub] = S.u || [0, 1],
        [va, vb] = S.v || [0, 1];
      const pcol = col(S.colour || '#2c3a55'),
        fcol = col('#9a9c9e'),
        y0 = top + 0.3,
        y1 = top + 0.75;
      for (
        let v = f.v0 + Math.max(1, va * W);
        v + 1.7 <= f.v0 + Math.min(W - 1, vb * W);
        v += 2.2
      ) {
        let run = null;
        const flush = () => {
          if (!run) return;
          const [u0, u1] = run,
            A = Q3(f, u0, v, y0),
            B = Q3(f, u1, v, y0),
            C = Q3(f, u1, v + 1.7, y1),
            D = Q3(f, u0, v + 1.7, y1);
          roofGeo.quad(A, B, C, D, pcol, triN(A, B, C));
          roofGeo.quad(
            D,
            C,
            Q3(f, u1, v + 1.7, top),
            Q3(f, u0, v + 1.7, top),
            fcol,
            [f.uz, 0, -f.ux].map((x) => -x)
          );
          run = null;
        };
        for (let u = f.u0 + Math.max(1, ua * L); u + 2 <= f.u0 + Math.min(L - 1, ub * L); u += 2) {
          const ok =
            inRoof(u, v) && inRoof(u + 2, v) && inRoof(u, v + 1.7) && inRoof(u + 2, v + 1.7);
          if (ok) run = run ? [run[0], u + 2] : [u, u + 2];
          else flush();
        }
        flush();
      }
    }
  };
  const landmarkRoof = (b, pts, top, rise = 0) => {
    const f = obb(pts),
      L = f.u1 - f.u0,
      W = f.v1 - f.v0;
    const inside = (u0, u1, v0, v1) => {
      const um = (u0 + u1) / 2,
        vm = (v0 + v1) / 2;
      return [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
        [um, v0],
        [um, v1],
        [u0, vm],
        [u1, vm],
        [um, vm],
      ].every(([u, v]) => {
        const p = f.P(u, v);
        return pointInPoly(p[0], p[1], pts);
      });
    };
    // u of the footprint end that lies further west (smaller x) / south (larger z)
    const westU = f.P(f.u0, (f.v0 + f.v1) / 2)[0] < f.P(f.u1, (f.v0 + f.v1) / 2)[0] ? -1 : 1;
    const southU = f.P(f.u0, (f.v0 + f.v1) / 2)[1] > f.P(f.u1, (f.v0 + f.v1) / 2)[1] ? -1 : 1;
    const um0 = (f.u0 + f.u1) / 2,
      vm0 = (f.v0 + f.v1) / 2;
    // first spot along u (fractions of L from the middle, toward `side`) where a
    // 2r square fits across the widest band of v
    const spotAlong = (side, fr, r) => {
      for (const k of fr)
        for (const dv of [0, -0.15, 0.15, -0.3, 0.3]) {
          const u = um0 + side * k * L,
            v = vm0 + dv * W;
          if (inside(u - r, u + r, v - r, v + r)) return [u, v];
        }
      return null;
    };
    if (b.feature.includes('observatory')) {
      // 科學館: Google 街景目視（2021-02 大草坪空拍）puts the white dome on a raised
      // stair/core tower in the west-middle part of the roof, not at an end
      const r = Math.max(2.5, Math.min(4, Math.min(L, W) * 0.12)),
        cr = r + 1.2,
        coreH = 3.3;
      const at = spotAlong(westU, [0.18, 0.12, 0.24, 0.06, 0.3, 0], cr);
      if (at) {
        const [cx, cz] = f.P(at[0], at[1]),
          y0 = top + 0.6 + coreH,
          dh = 1.6,
          S = 12,
          R = 4;
        roofBox(
          f,
          [at[0] - cr, at[0] + cr, at[1] - cr, at[1] + cr],
          top,
          coreH + 0.6,
          col('#9a4b3c').map((v) => v * 0.95),
          col('#9a9890')
        );
        const wc = col('#d9d6cf'),
          dc = col('#eceae4');
        const ring = (k) => {
          const a = (k / S) * Math.PI * 2;
          return [Math.cos(a), Math.sin(a)];
        };
        for (let k = 0; k < S; k++) {
          const [c0, s0] = ring(k),
            [c1, s1] = ring(k + 1),
            nx = (c0 + c1) / 2,
            nz = (s0 + s1) / 2;
          roofGeo.quad(
            [cx + c0 * r, y0, cz + s0 * r],
            [cx + c1 * r, y0, cz + s1 * r],
            [cx + c1 * r, y0 + dh, cz + s1 * r],
            [cx + c0 * r, y0 + dh, cz + s0 * r],
            wc,
            [nx, 0, nz]
          );
          for (let j = 0; j < R; j++) {
            const p0 = ((j / R) * Math.PI) / 2,
              p1 = (((j + 1) / R) * Math.PI) / 2;
            const P = (c, s, p) => [
              cx + c * r * Math.cos(p),
              y0 + dh + r * Math.sin(p),
              cz + s * r * Math.cos(p),
            ];
            const n = [
              nx * Math.cos((p0 + p1) / 2),
              Math.sin((p0 + p1) / 2),
              nz * Math.cos((p0 + p1) / 2),
            ];
            if (j === R - 1) roofGeo.tri(P(c0, s0, p0), P(c1, s1, p0), P(c0, s0, p1), dc, n);
            else roofGeo.quad(P(c0, s0, p0), P(c1, s1, p0), P(c1, s1, p1), P(c0, s0, p1), dc, n);
          }
        }
        // thin antenna mast beside the dome
        const [ax, az] = f.P(at[0] - westU * (r + 0.6), at[1]);
        cylinder(ax, az, y0, 4.5, 0.08, col('#8a8c8e'), 4);
      }
    }
    if (b.feature.includes('entrance_canopy')) {
      // 體育館: Google 街景目視（2017-09）: the main roof is flat with a parapet. The covered
      // walkway at the south-west entrance is a long flat orange slab (2026-11 survey: the
      // red-brown pitched roof to the south is another building).
      // Drawn along the west part of the most south-west facing wall (>= 12 m), 4 m deep
      canopyAt(pts, {
        on: 'sw',
        minLen: 12,
        at: 0,
        w: 24,
        d: 4,
        h: 3.2,
        t: 0.4,
        colour: '#c8672e',
        postColour: '#e6e2d8',
      });
    }
    if (b.feature.includes('stair_drum')) {
      // 體育館: round stair tower (Google 街景目視, 2017-09). POSITION UNVERIFIED: the
      // observation says "south-east side", but both viewpoints are north / north-west of
      // the hall and cannot see the geometric SE corner, so "SE" may be relative to the
      // view. Placed at the footprint's max(x+z) corner as a literal reading only;
      // centred 2 m inside the corner, rising 2.4 m above the roof
      let ci = 0,
        cs = -Infinity;
      pts.forEach((p, i) => {
        const s = p[0] + p[1];
        if (s > cs) {
          cs = s;
          ci = i;
        }
      });
      const p = pts[ci],
        cx0 = pts.reduce((s, q) => s + q[0], 0) / pts.length,
        cz0 = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      const dl = Math.hypot(cx0 - p[0], cz0 - p[1]) || 1,
        x = p[0] + ((cx0 - p[0]) / dl) * 2,
        z = p[1] + ((cz0 - p[1]) / dl) * 2;
      const by = Hmin(x, z, 3);
      cylinder(x, z, by - 0.5, top + 3 - by, 3, col('#b8b2a6'), 14, col('#9a9890'));
      cylinder(x, z, top + 2.4, 0.6, 3.05, col('#a65a43'), 14);
      collision.addCircle(x, z, 3);
    }
    if (b.feature.includes('spire')) {
      // 恩惠堂: slender white spire with a cross on the ridge near the south
      // (entrance) gable end (Google 街景, user 360 photo 2017-01); sizes estimated
      const at = spotAlong(southU, [0.42, 0.38, 0.34, 0.3], 1);
      if (at) {
        const [x, z] = f.P(at[0], at[1]),
          y0 = top + rise * 0.6,
          wc = col('#f4f3ef');
        roofBox(
          f,
          [at[0] - 0.9, at[0] + 0.9, at[1] - 0.9, at[1] + 0.9],
          y0 - 0.5,
          top + rise + 2.2 - y0,
          wc,
          wc
        );
        const yb = top + rise + 1.7,
          sh = 6,
          S = 8;
        for (let k = 0; k < S; k++) {
          const a0 = (k / S) * Math.PI * 2,
            a1 = ((k + 1) / S) * Math.PI * 2;
          rtri(
            [x + Math.cos(a0) * 0.85, yb, z + Math.sin(a0) * 0.85],
            [x + Math.cos(a1) * 0.85, yb, z + Math.sin(a1) * 0.85],
            [x, yb + sh, z],
            wc
          );
        }
        const cc = col('#e9e7e0'),
          yc = yb + sh;
        roofBox(f, [at[0] - 0.08, at[0] + 0.08, at[1] - 0.08, at[1] + 0.08], yc - 0.2, 1.8, cc, cc);
        roofBox(
          f,
          [at[0] - 0.08, at[0] + 0.08, at[1] - 0.55, at[1] + 0.55],
          yc + 1.05,
          0.16,
          cc,
          cc
        );
      }
    }
    if (b.feature.includes('roof_drum')) {
      // 良善樓: white cylindrical crown on the roof (Google 街景目視 2024-08 大仁街 and
      // 2021-02 空拍); spot on the roof approximate, nearest the middle that fits
      const at = spotAlong(1, [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24], 3.2);
      if (at) {
        const [x, z] = f.P(at[0], at[1]);
        cylinder(x, z, top, 3.6, 3, col('#ecebe6'), 16, col('#cfcdc6'));
        cylinder(x, z, top + 2.4, 0.5, 3.05, col('#bfc4c8'), 16);
      }
    }
  };
  const tanks = [];
  const shopWalls = (world.shopWalls = []);
  let oldSigns = 0;
  // looks.json colliders (portals, deep fins, recessed floors under an overhang) are added at
  // the very end of buildWorld: placement loops below test collision.blocked between shared
  // random draws, so an earlier collider would change how often they draw
  const lateColl = [];
  // flat-roof parapet along one edge: ph high, 0.25 m thick
  const parapetEdge = (a, c, n, y, ph, pc) => {
    const y1 = y + ph,
      ix = n[0] * 0.25,
      iz = n[2] * 0.25;
    roofGeo.quad([a[0], y, a[1]], [c[0], y, c[1]], [c[0], y1, c[1]], [a[0], y1, a[1]], pc, n);
    roofGeo.quad(
      [a[0], y1, a[1]],
      [c[0], y1, c[1]],
      [c[0] - ix, y1, c[1] - iz],
      [a[0] - ix, y1, a[1] - iz],
      pc.map((v) => v * 1.05),
      UP
    );
    roofGeo.quad(
      [a[0] - ix, y, a[1] - iz],
      [c[0] - ix, y, c[1] - iz],
      [c[0] - ix, y1, c[1] - iz],
      [a[0] - ix, y1, a[1] - iz],
      pc.map((v) => v * 0.8),
      [-n[0], 0, -n[2]]
    );
  };
  // PBR extras (visual only): concrete floor ledges, soft contact shadows at the wall foot,
  // metal awnings over shopfronts, PBR flat roofs, rooftop AC units, temple roofs
  const ledgeGeo = new Geo(),
    aoGeo = new Geo(false, null, true),
    awnGeo = new Geo(),
    flatRoofGeo = new Geo(false, (q) => [q[0] / 10, q[1] / 10]);
  const acSpots = [],
    temples = [];
  const AO_DARK = [0, 0, 0, 0.42],
    AO_CLEAR = [0, 0, 0, 0];
  const contactShadow = (a, c, n) => {
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]),
      k = Math.max(1, Math.ceil(l / 4)),
      o = 1.7;
    for (let j = 0; j < k; j++) {
      const t0 = j / k,
        t1 = (j + 1) / k;
      const p0 = [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0],
        p1 = [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1];
      const q0 = [p0[0] + n[0] * o, p0[1] + n[2] * o],
        q1 = [p1[0] + n[0] * o, p1[1] + n[2] * o];
      if (pitAt(q0[0], q0[1]) !== null || pitAt(q1[0], q1[1]) !== null) continue; // not down into a pit (src/world/zones/ZoneG.js)
      const Y = (p) => [p[0], Hgrid(p[0], p[1]) + 0.06 + TOL_LO, p[1]];
      aoGeo.tri(Y(p0), Y(p1), Y(q1), [AO_DARK, AO_DARK, AO_CLEAR], UP);
      aoGeo.tri(Y(p0), Y(q1), Y(q0), [AO_DARK, AO_CLEAR, AO_CLEAR], UP);
    }
  };
  // building base: lowest ground along the footprint (corners + every 5 m of edge).
  // When the plot drops more than h/2 (low shops on a slope) the base moves to
  // mid-slope so the uphill side isn't buried; walls still reach the low point.
  let footLo = 0;
  const footBase = (pts, h) => {
    let m = Infinity,
      M = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        c = pts[(i + 1) % pts.length],
        n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 5);
      for (let k = 0; k < n; k++) {
        const y = Hgrid(a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n);
        if (y < m) m = y;
        if (y > M) M = y;
      } // Hgrid, not H(): a B1 pit under an outline (src/world/zones/ZoneG.js) must not sink the building
    }
    if (m === Infinity) {
      footLo = 0;
      return 0;
    }
    footLo = m;
    return M - m > h / 2 ? (m + M) / 2 : m;
  };
  world.buildings = data.buildings;
  const rndW = rnd,
    rnd2W = rnd2;
  data.buildings.forEach((b, bi) => {
    // 補建街區 buildings (synthetic) draw from their own stream, so turning the
    // fill off leaves the shared sequence (palette, stalls, trees...) unchanged
    const rnd = b.synthetic ? mulberry32(hashStr(`fill:${b.id}`)) : rndW;
    // ... and their tints / awnings / rooftop AC from their own rnd2 as well (it used to be the
    // shared one, so any change to the fill re-dealt every tree's species after it)
    const rnd2 = b.synthetic ? mulberry32(hashStr(`fill2:${b.id}`)) : rnd2W;
    const pts = b.pts;
    const h = b.h;
    const base = (b.base = footBase(pts, h));
    const foot = footLo - 0.5;
    if (b.skip) {
      if (b.name)
        world.named[b.name] = {
          x: pts.reduce((s, p) => s + p[0], 0) / pts.length,
          z: pts.reduce((s, p) => s + p[1], 0) / pts.length,
          h: b.labelH || h,
          base,
          b,
        };
      return;
    }
    const pal = PAL[b.kind] || PAL.town;
    const pick = pal[Math.floor(rnd() * pal.length)];
    const tint = col(osmCol(b) || pick);
    // per-building stream for the new extras, so the shared rnd sequence
    // (palette, stalls, lamps...) stays as it was
    const rb = mulberry32(hashStr(String(b.id || bi)));
    const civic =
      b.kind === 'campus' || b.kind === 'dorm' || b.kind === 'commercial' || b.kind === 'church';
    const mk = matKey(b);
    // whole window rows per storey so the top floor isn't cut in half
    const floors = b.floors || Math.max(1, Math.round((h - 0.6) / 3.3));
    let style;
    if (civic) {
      const q = rb();
      style =
        mk || b.kind === 'church' || b.kind === 'dorm'
          ? 'campus'
          : q < 0.22 && floors >= 3
            ? 'glass'
            : q < 0.4 && b.kind === 'campus'
              ? 'concrete'
              : 'campus';
      // 洗石子 (wash) 0.3 -> 0.15: street view shows mostly small tiles on 透天 (Google 街景目視判斷)
    } else style = floors >= 5 ? 'apt' : rb() < 0.15 ? 'wash' : 'town';
    // overrides.json facade (e.g. 懷恩樓 arcade); rb() above is still drawn so the stream is unchanged
    if (b.facade) style = b.facade;
    // PBR facades from reference photos: named campus buildings / temples by name, other campus blocks
    // by a stable pick, dorms brick / white, commercial blocks and 透天 town houses get their own sets.
    // OSM materials, overrides.json facades and the glass curtain walls keep their own textures.
    const pbrPick = STYLE_BY_NAME[b.name];
    if (!mk && !b.facade) {
      if (pbrPick) style = pbrPick;
      else if (b.kind === 'campus' || b.kind === 'church') {
        if (style !== 'glass')
          style = STYLE_PICK[strHash(b.name || String(b.id || bi)) % STYLE_PICK.length];
      } else if (b.kind === 'dorm') style = bi % 2 ? 'brick' : 'white';
      else if (b.kind === 'commercial') {
        if (style !== 'glass') style = 'commercial';
      } else if (style === 'town') style = 'town';
    }
    const pbr = PBR_STYLES.has(style) && !mk;
    // textured PBR styles carry their own colour: keep only a subtle per-building variation k;
    // a building:colour (osmCol) pulls the atlas towards it instead of being dropped
    if (pbr && style !== 'town') {
      const k = style === 'commercial' ? null : 0.9 + rnd2() * 0.14;
      const oc = k !== null && PBR_REF[style] && osmCol(b) ? col(osmCol(b)) : null,
        ref = oc && col(PBR_REF[style]);
      for (let i = 0; i < 3; i++)
        tint[i] =
          k === null
            ? 0.75 + tint[i] * 0.3
            : oc
              ? k * (1 + (Math.min(3, Math.max(0.25, oc[i] / Math.max(0.005, ref[i]))) - 1) * 0.65)
              : k;
    } else if (pbr) for (let i = 0; i < 3; i++) tint[i] = Math.min(1.08, tint[i] * 1.08);
    // tools/looks.json: applied after the legacy pick above, so every shared draw (rnd palette,
    // rb civic, rnd2 tint) happens exactly as before. Look buildings use the facadeParam atlas.
    const L = b.look,
      fp = L ? L.wall?.base || 'tile' : null;
    if (L) {
      const wc = lookCol(hexOrNamed(L.wall?.colour) || osmCol(b) || pick);
      for (let i = 0; i < 3; i++) tint[i] = wc[i];
    }
    const g = fp ? wallForParam(fp) : wallFor(style, mk);
    const bay = L?.windows?.bay ?? (civic ? 3.6 : 3.0);
    let acc = Math.floor(rnd() * 8) * bay;
    let colAcc = Math.round(acc / bay);
    const vOff = Math.floor(rnd() * 8) / 8;
    // water stains at the wall foot, slightly darker under the roof line
    const cLo = tint.map((v) => v * 0.7),
      cTop = tint.map((v) => v * 0.88);
    // looks.json noShop (e.g. 溜冰場, 電力中心 are kind town): the shopfront and awning are not
    // drawn, but the wall stays in shopWalls and its rnd2 draw happens, so src/world/Furniture.js and
    // everything after keep their sequences
    const hideShop = !!L && !!b.noShop;
    const shops =
      (b.kind === 'town' || b.kind === 'commercial') &&
      !mk &&
      !style.startsWith('glass') &&
      !b.parts &&
      (!b.noShop || hideShop);
    let sAcc = Math.floor(rb() * 8) * 4;
    const rc = osmRoofCol(b) ? col(osmRoofCol(b)) : tint.map((v) => v * 0.62);
    // flat PBR roofs (concrete roofTex carries its own colour)
    const rcFlat = osmRoofCol(b)
      ? col(osmRoofCol(b))
      : style === 'town'
        ? tint.map((v) => v * 0.82)
        : tint.map((v) => v * 0.9);
    const pc0 =
      !pbr || style === 'town'
        ? tint.map((v) => v * 0.95)
        : style === 'red'
          ? col('#e3ddd2')
          : style === 'tan'
            ? col('#a39380')
            : style === 'brick'
              ? col('#9a5442')
              : col('#d9d6cf');
    const pc = L?.parapet?.colour ? col(L.parapet.colour) : L ? tint.map((v) => v * 0.86) : pc0,
      ph = L?.parapet?.h ?? 0.6;
    const rcL = L?.roof?.colour ? col(L.roof.colour) : null;
    let collPts = pts; // lookWalls insets it under an overhanging top floor
    // look.open pad: just above the highest ground under the footprint
    const padY = L?.open
      ? Math.max(
          ...pts.map((p) => H(p[0], p[1])),
          H(
            pts.reduce((s, p) => s + p[0], 0) / pts.length,
            pts.reduce((s, p) => s + p[1], 0) / pts.length
          )
        ) + 0.12
      : 0;
    const lean2 = opts.low && b.synthetic;
    // looks.json walls: split at every storey so each maps onto its window-type row of the
    // facadeParam atlas; plinth / top-floor colours, setbacks, bands, fins and corner piers.
    // Returns the rings the roof sits on (inset when the top floor steps back).
    const lookWalls = (V, rings, vh, vf) => {
      // b.parts 的單塊可以帶自己的 look（src/world/zones/ZoneH.js：熱誠兩塔、薄膜中棟米黃塔）；只影響牆面畫法，不抽亂數
      const L = V.look || b.look;
      const fl = vh / vf > 2.8 ? (vh - 0.6) / vf : vh / vf,
        top = base + vh,
        yF = base + vf * fl,
        yS = Math.min(base + 1.2, top);
      const W = L.windows || {},
        tf = L.topFloor,
        tn = tf ? Math.min(vf - 1, tf.floors || 1) : 0,
        yT = base + (vf - tn) * fl,
        sb = tn ? tf.setback || 0 : 0;
      const plTop = L.plinth
        ? base + (L.plinth.floors != null ? L.plinth.floors * fl : (L.plinth.h ?? 1.2))
        : -Infinity;
      const gain = lookCol;
      const plCol = L.plinth?.colour && gain(L.plinth.colour),
        tfCol = tf?.colour && gain(tf.colour),
        tfGl = tf?.glass && col(tf.glass);
      const stripes = L.wall?.stripes && L.wall.stripes.map(gain);
      const f = obb(V.pts),
        R = FACP_TYPES.length,
        NONE = FACP_TYPES.indexOf('none');
      const lines = [base, yS, plTop, yT, yF];
      for (let j = 1; j < vf; j++) lines.push(base + j * fl);
      // look.open (超巨溜冰場): an open-air pad, not a building. No walls; a kerb and a 1 m steel
      // railing along the outer ring (the roof is replaced by the pad in the caller)
      // look.open.bare（src/world/zones/ZoneH.js 熱誠 A／B 空橋）：連路緣、欄杆都不畫，空橋本體由自建程式蓋
      if (L.open?.bare) return rings;
      if (L.open) {
        const kc = col(L.open.kerb || '#9a9a95'),
          rc2 = col(L.open.rail || '#b8bcbf');
        const ring = rings[0];
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i],
            c = ring[(i + 1) % ring.length],
            dx = c[0] - a[0],
            dz = c[1] - a[1],
            l = Math.hypot(dx, dz);
          if (l < 0.05) continue;
          const ang = Math.atan2(dz, dx),
            mx = (a[0] + c[0]) / 2,
            mz = (a[1] + c[1]) / 2;
          ledgeGeo.box(mx, mz, ang, l + 0.25, 0.25, foot, padY + 0.08, kc);
          ledgeGeo.box(mx, mz, ang, l, 0.06, padY + 0.95, padY + 1.02, rc2);
          ledgeGeo.box(mx, mz, ang, l, 0.04, padY + 0.55, padY + 0.6, rc2);
          for (let s = 0; s < l; s += l / Math.max(1, Math.round(l / 2.5)))
            ledgeGeo.box(
              a[0] + (dx / l) * s,
              a[1] + (dz / l) * s,
              ang,
              0.06,
              0.06,
              padY,
              padY + 0.98,
              rc2
            );
        }
        return rings;
      }
      // corner piers only at the ends of the walls picked by corner.on (else every real corner)
      const cOn = L.corner?.on
        ? []
            .concat(L.corner.on)
            .map((o) => wallFacing(V.pts, o, L.corner.minLen ?? 8))
            .filter(Boolean)
            .map((e) => V.pts.indexOf(e[0]))
        : null;
      // face overrides: on = compass direction(s) the wall faces, or 'long' / 'short' side. A
      // wall matches only the nearest direction of each family (n/e/s/w, ne/se/sw/nw), so two
      // entries such as on [s, e] and [n, w] never both apply to one diagonal wall
      const matches = (on, n, tx, tz) =>
        !on ||
        []
          .concat(on)
          .some((o) =>
            o === 'long'
              ? Math.abs(tx * f.ux + tz * f.uz) > 0.8
              : o === 'short'
                ? Math.abs(tx * f.ux + tz * f.uz) <= 0.8
                : DIRS[o] && facing(n, o)
          );
      const shade = (t, y) =>
        mulCol(
          t,
          y < yS
            ? 0.7 + 0.3 * Math.max(0, (y - foot) / (yS - foot))
            : 1 - 0.12 * Math.min(1, (y - yS) / Math.max(1, top - yS))
        );
      const ledge = (a, c, n, l, yc, hh, o, lc) => {
        const t0 = yc - hh / 2,
          t1 = yc + hh / 2,
          A = [a[0] + n[0] * o, a[1] + n[2] * o],
          C = [c[0] + n[0] * o, c[1] + n[2] * o];
        ledgeGeo.quad(
          [a[0], t1, a[1]],
          [c[0], t1, c[1]],
          [C[0], t1, C[1]],
          [A[0], t1, A[1]],
          lc,
          UP
        );
        ledgeGeo.quad(
          [A[0], t0, A[1]],
          [C[0], t0, C[1]],
          [C[0], t1, C[1]],
          [A[0], t1, A[1]],
          lc,
          n,
          [
            [0, 0],
            [l / 2, 0],
            [l / 2, 0.1],
            [0, 0.1],
          ]
        );
        ledgeGeo.quad(
          [a[0], t0, a[1]],
          [c[0], t0, c[1]],
          [C[0], t0, C[1]],
          [A[0], t0, A[1]],
          mulCol(lc, 0.7),
          [0, -1, 0]
        );
      };
      const tiers =
        sb > 0
          ? [
              [rings, foot, yT],
              [rings.map((r) => offsetRing(r, sb)), yT, top],
            ]
          : sb < 0
            ? [
                [rings.map((r) => offsetRing(r, -sb)), foot, yT],
                [rings, yT, top],
              ]
            : [[rings, foot, top]];
      for (const [rs, y0, y1] of tiers)
        for (const ring of rs)
          for (let i = 0; i < ring.length; i++) {
            if (b.holeWalls === false && ring !== rs[0]) break; // courtyards whose walls are built elsewhere (src/world/buildings/Lixing.js)
            if (b.outerWalls === false && ring === rs[0]) break; // outer walls built elsewhere too (力行：窗戶要對齊室內，src/world/buildings/Lixing.js)；只是不畫，不抽亂數
            const a = ring[i],
              c = ring[(i + 1) % ring.length],
              dx = c[0] - a[0],
              dz = c[1] - a[1],
              l = Math.hypot(dx, dz);
            if (l < 0.05) continue;
            const tx = dx / l,
              tz = dz / l,
              n = [tz, 0, -tx];
            const fc = Object.assign(
              {},
              ...(L.faces || []).filter((o) => matches(o.on, n, tx, tz))
            );
            const Wf = fc.windows ? { ...W, ...fc.windows } : W;
            g.ac = gain(fc.accent || Wf.accent || '#e8e6e0');
            const glassC = col(fc.glass || Wf.glass || '#7f93a3'),
              wallC = fc.colour ? gain(fc.colour) : tint,
              bayF = Wf.bay ?? bay;
            const typeAt = (k) =>
              (k === 0 && Wf.ground) ||
              (tn && k >= vf - tn && tf.windows) ||
              (Wf.types && Wf.types[Math.min(k, Wf.types.length - 1)]) ||
              Wf.type ||
              'punched';
            const nb = l >= bayF * 0.6 ? Math.max(1, Math.round(l / bayF)) : l / bayF;
            const u0 = colAcc / 8,
              u1 = (colAcc + nb) / 8;
            colAcc += Math.ceil(nb);
            const ys = [y0, y1, ...lines.filter((y) => y > y0 + 0.01 && y < y1 - 0.01)].sort(
              (p, q) => p - q
            );
            // door openings cut into this wall (b.wallDoors: [{ p, q, y0, y1 }], world coordinates; src/world/buildings/Lixing.js):
            // spans(ya, yb) = the stretches [t0, t1] along the edge with the heights left standing in ya..yb
            const cuts = (b.wallDoors || [])
              .map((d) => {
                const off = (q) => Math.abs((q[0] - a[0]) * tz - (q[1] - a[1]) * tx),
                  at = (q) => (q[0] - a[0]) * tx + (q[1] - a[1]) * tz;
                if (off(d.p) > 0.5 || off(d.q) > 0.5) return null;
                const t0 = Math.max(0, Math.min(at(d.p), at(d.q))),
                  t1 = Math.min(l, Math.max(at(d.p), at(d.q)));
                return t1 - t0 > 0.02 ? { t0, t1, y0: d.y0, y1: d.y1 } : null;
              })
              .filter(Boolean);
            const cutTs = cuts.length
              ? [...new Set([0, l, ...cuts.flatMap((q) => [q.t0, q.t1])])].sort((p, q) => p - q)
              : null;
            const spans = (ya, yb) => {
              const out = [];
              for (let m = 0; m < cutTs.length - 1; m++) {
                const s = cutTs[m],
                  e = cutTs[m + 1],
                  tm = (s + e) / 2;
                if (e - s < 1e-3) continue;
                let y = ya;
                for (const q of cuts
                  .filter((q) => tm > q.t0 && tm < q.t1)
                  .sort((p, q2) => p.y0 - q2.y0)) {
                  if (q.y0 > y + 1e-3) out.push([s, e, y, Math.min(yb, q.y0)]);
                  y = Math.max(y, q.y1);
                }
                if (yb > y + 1e-3) out.push([s, e, y, yb]);
              }
              return out.filter((o) => o[3] > o[2] + 1e-3);
            };
            for (let j = 0; j < ys.length - 1; j++) {
              const ya = ys[j],
                yb = ys[j + 1],
                ym = (ya + yb) / 2;
              if (yb - ya < 0.01) continue;
              const k =
                ym < base ? -1 : ym >= yF ? vf : Math.min(vf - 1, Math.floor((ym - base) / fl));
              const ti = k < 0 || k >= vf || nb < 0.6 ? NONE : FACP_TYPES.indexOf(typeAt(k)),
                row = ti < 0 ? NONE : ti;
              const fy = k < 0 ? base - fl : base + k * fl;
              const v = (y) => 1 - (row + 1 - Math.min(0.995, Math.max(0.005, (y - fy) / fl))) / R;
              const inTop = tn && k >= vf - tn && k < vf;
              const tk =
                ym < plTop && plCol
                  ? plCol
                  : tfCol && inTop
                    ? tfCol
                    : stripes && !fc.colour && k >= 1 && k < vf
                      ? stripes[(k - 1) % stripes.length]
                      : wallC;
              g.gc = tfGl && inTop ? tfGl : glassC;
              const ca = shade(tk, ya),
                cb = shade(tk, yb);
              // shift each storey by 3 atlas columns so the lit / blind variants do not line up
              // into full-height stripes at night
              const us = k > 0 && k < vf ? ((k * 3) % 8) / 8 : 0;
              if (!cutTs)
                g.quad(
                  [a[0], ya, a[1]],
                  [c[0], ya, c[1]],
                  [c[0], yb, c[1]],
                  [a[0], yb, a[1]],
                  [ca, ca, cb, cb],
                  n,
                  [
                    [u0 + us, v(ya)],
                    [u1 + us, v(ya)],
                    [u1 + us, v(yb)],
                    [u0 + us, v(yb)],
                  ]
                );
              else
                for (const [s, e, p0, p1] of spans(ya, yb)) {
                  const A = [a[0] + tx * s, a[1] + tz * s],
                    C = [a[0] + tx * e, a[1] + tz * e],
                    U = (t) => u0 + us + ((u1 - u0) * t) / l,
                    c0 = shade(tk, p0),
                    c1 = shade(tk, p1);
                  g.quad(
                    [A[0], p0, A[1]],
                    [C[0], p0, C[1]],
                    [C[0], p1, C[1]],
                    [A[0], p1, A[1]],
                    [c0, c0, c1, c1],
                    n,
                    [
                      [U(s), v(p0)],
                      [U(e), v(p0)],
                      [U(e), v(p1)],
                      [U(s), v(p1)],
                    ]
                  );
                }
            }
            // floor bands / sunshades: { colour | colours (cycled per floor; grade: spread bottom to
            // top over all the bands of the wall instead), at (fraction of a storey above the slab, or
            // a list for several per storey), from / to (storeys), every, h, depth, on }
            for (const bd of L.bands || []) {
              if (!matches(bd.on, n, tx, tz)) continue;
              const ys2 = [];
              for (let j = bd.from ?? 1; j <= (bd.to ?? vf - 1); j += bd.every || 1)
                for (const at of [].concat(bd.at || 0)) {
                  const y = base + (j + at) * fl;
                  if (y > base + 0.15 && y < top - 0.1) ys2.push([y, j]);
                }
              ys2
                .sort((p, q) => p[0] - q[0])
                .forEach(([y, j], m) => {
                  if (y <= y0 + 0.15 || y >= Math.min(y1, top) - 0.1) return;
                  const cs = bd.colours,
                    ci =
                      cs &&
                      (bd.grade
                        ? Math.min(cs.length - 1, Math.floor((m * cs.length) / ys2.length))
                        : j % cs.length);
                  const lc = col(cs ? cs[ci] : bd.colour || '#e9e7e2'),
                    lh = bd.h ?? 0.22;
                  if (!cutTs) ledge(a, c, n, l, y, lh, bd.depth ?? 0.25, lc);
                  else
                    for (const [s, e, p0, p1] of spans(y - lh / 2 - 0.05, y + lh / 2 + 0.05))
                      if (p1 - p0 > lh + 0.09)
                        ledge(
                          [a[0] + tx * s, a[1] + tz * s],
                          [a[0] + tx * e, a[1] + tz * e],
                          n,
                          e - s,
                          y,
                          lh,
                          bd.depth ?? 0.25,
                          lc
                        );
                });
            }
            // vertical fins / pilasters standing proud of the wall, from storey `from` up
            for (const fn of L.fins || []) {
              if (!matches(fn.on, n, tx, tz) || l < fn.spacing * 0.8) continue;
              const cnt = Math.max(1, Math.round(l / fn.spacing)),
                d = fn.depth ?? 0.5,
                fc2 = col(fn.colour || '#e9e7e2');
              const ya = Math.max(y0, base + (fn.from ?? 1) * fl),
                yb = Math.min(y1, fn.to != null ? base + fn.to * fl : top);
              if (yb - ya < 0.5) continue;
              for (let k = fn.ends ? 0 : 0.5; k <= cnt - (fn.ends ? 0 : 0.5) + 1e-6; k++) {
                const sp = (k * l) / cnt,
                  x = a[0] + tx * sp + (n[0] * d) / 2,
                  z = a[1] + tz * sp + (n[2] * d) / 2;
                ledgeGeo.box(x, z, Math.atan2(tz, tx), fn.t ?? 0.2, d, ya, yb, fc2);
              }
              // deep fins reaching the ground: walking stops at their outer edge, not inside them
              if (ya < base + 1.5 && d >= 0.5 && ring === rings[0])
                lateColl.push(() =>
                  collision.addSegment(
                    a[0] + n[0] * d,
                    a[1] + n[2] * d,
                    c[0] + n[0] * d,
                    c[1] + n[2] * d
                  )
                );
            }
            // corner piers: a column on every real corner of the outer ring
            if (
              L.corner &&
              ring === rs[0] &&
              (!cOn || cOn.includes(i) || cOn.includes((i - 1 + ring.length) % ring.length))
            ) {
              const q = ring[(i - 1 + ring.length) % ring.length],
                ex = a[0] - q[0],
                ez = a[1] - q[1],
                el = Math.hypot(ex, ez) || 1;
              if (Math.abs((ex / el) * tz - (ez / el) * tx) > 0.42) {
                const w = L.corner.w ?? 0.9;
                ledgeGeo.box(
                  a[0],
                  a[1],
                  Math.atan2(tz, tx),
                  w,
                  w,
                  Math.max(y0, base + (L.corner.from ?? 0) * fl),
                  y1 === top ? top + ph : y1,
                  col(L.corner.colour || '#e9e7e2')
                );
              }
            }
          }
      if (!sb) return rings;
      // overhang: walking reaches the recessed lower walls
      if (sb < 0 && V.pts === pts) collPts = offsetRing(pts, -sb);
      // setback (> 0): terrace deck + railing around the stepped-back top floors;
      // overhang (< 0): soffit under the projecting top floors
      const inner = rings.map((r) => offsetRing(r, Math.abs(sb)));
      rings.forEach((ring, ri) =>
        ring.forEach((a, i) => {
          const c = ring[(i + 1) % ring.length],
            a2 = inner[ri][i],
            c2 = inner[ri][(i + 1) % ring.length];
          const dx = c[0] - a[0],
            dz = c[1] - a[1],
            l = Math.hypot(dx, dz);
          if (l < 0.05) return;
          const n = [dz / l, 0, -dx / l],
            P = (p, y) => [p[0], y, p[1]];
          if (sb > 0) {
            flatRoofGeo.quad(
              P(a, yT),
              P(c, yT),
              P(c2, yT),
              P(a2, yT),
              rcL || mulCol(tint, 0.85),
              UP,
              [a, c, c2, a2].map((p) => [p[0] / 10, p[1] / 10])
            );
            parapetEdge(a, c, n, yT, 1.0, pc);
          } else
            roofGeo.quad(P(a2, yT), P(c2, yT), P(c, yT), P(a, yT), mulCol(tint, 0.6), [0, -1, 0]);
        })
      );
      return sb > 0 ? inner : rings;
    };
    // looks.json portal: a frontispiece standing P.d proud of the wall facing P.on, its face
    // mapped to the arch row stretched over P.floors storeys, one arch per P.arches
    // near [x, z]: use the wall facing P.on closest to that point (any length; w shrinks to fit)
    const lookPortal = (P0) => {
      let best = null;
      if (P0.near) {
        let bd = Infinity;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i],
            c = pts[(i + 1) % pts.length],
            l = Math.hypot(c[0] - a[0], c[1] - a[1]);
          if (l < 2) continue;
          const n = [(c[1] - a[1]) / l, 0, -(c[0] - a[0]) / l],
            q = closestOnSeg(P0.near[0], P0.near[1], a[0], a[1], c[0], c[1]),
            dd = Math.hypot(q[0] - P0.near[0], q[1] - P0.near[1]);
          if (n[0] * DIRS[P0.on][0] + n[2] * DIRS[P0.on][1] > 0.3 && dd < bd) {
            bd = dd;
            best = [a, c, l, n];
          }
        }
      } else best = wallFacing(pts, P0.on, P0.w + 2);
      if (!best) return;
      const P = { ...P0, w: Math.min(P0.w, best[2] - 0.2) };
      const [a, c, l, n] = best,
        tx = (c[0] - a[0]) / l,
        tz = (c[1] - a[1]) / l,
        d = P.d ?? 0.6,
        top = base + h;
      const fl = h / floors > 2.8 ? (h - 0.6) / floors : h / floors,
        yA = base + (P.floors || 1) * fl,
        yt = top + (P.rise ?? 0.6);
      const s0 = Math.min(l - P.w, Math.max(0, (P.at ?? 0.5) * l - P.w / 2));
      const p = (sv, o) => [a[0] + tx * sv + n[0] * o, a[1] + tz * sv + n[2] * o];
      const A = p(s0, d),
        C = p(s0 + P.w, d),
        A0 = p(s0, 0),
        C0 = p(s0 + P.w, 0);
      g.ac = lookCol(P.accent || L.windows?.accent || '#8a5a45');
      g.gc = col('#7f93a3');
      const tc = P.colour ? lookCol(P.colour) : tint,
        R = FACP_TYPES.length,
        AR = FACP_TYPES.indexOf(P.type || 'arch'),
        NO = FACP_TYPES.indexOf('none');
      const v = (row, t) => 1 - (row + 1 - Math.min(0.995, Math.max(0.005, t))) / R;
      const Q = (P0, P1, ya, yb, row, ta, tb, u1, nn) =>
        g.quad(
          [P0[0], ya, P0[1]],
          [P1[0], ya, P1[1]],
          [P1[0], yb, P1[1]],
          [P0[0], yb, P0[1]],
          [mulCol(tc, 0.8), mulCol(tc, 0.8), tc, tc].map((q, i) => (i < 2 && ya > base ? tc : q)),
          nn,
          [
            [0, v(row, ta)],
            [u1, v(row, ta)],
            [u1, v(row, tb)],
            [0, v(row, tb)],
          ]
        );
      Q(A, C, foot, base, NO, 1 - (base - foot) / fl, 1, P.w / bay / 8, n);
      Q(A, C, base, yA, AR, 0, 1, (P.arches || 3) / 8, n);
      Q(A, C, yA, yt, NO, 0, (yt - yA) / fl, P.w / bay / 8, n);
      Q(A0, A, foot, yt, NO, 0, 1, d / bay / 8, [-tx, 0, -tz]);
      Q(C, C0, foot, yt, NO, 0, 1, d / bay / 8, [tx, 0, tz]);
      roofGeo.quad(
        [A0[0], yt, A0[1]],
        [C0[0], yt, C0[1]],
        [C[0], yt, C[1]],
        [A[0], yt, A[1]],
        pc,
        UP
      );
      lateColl.push(() => collision.addPolygon([A0, C0, C, A], yt));
    };
    // a split building (overrides.json parts) gets its contact shadow once round the whole outline, not per block
    // (the shared cut edge between two blocks is no wall foot); visual only, no rnd draws
    if (b.parts && !lean2)
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i],
          c = pts[(i + 1) % pts.length],
          l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (l >= 0.05) contactShadow(a, c, [(c[1] - a[1]) / l, 0, -(c[0] - a[0]) / l]);
      }
    // blocks of different height (overrides.json split, e.g. 全人教育村) share the base
    const vols = b.parts || [{ pts, h, floors, holes: b.holes }];
    let pitched = false,
      pitchedV = false,
      onMain = false;
    for (const V of vols) {
      const vp = V.pts,
        vh = V.h,
        vf = V.floors || floors;
      // outer ring is CCW, courtyard rings CW, so the same normal faces outwards
      const rings = V.holes ? [vp, ...V.holes] : [vp];
      const vAt = (y) => vOff + (((y - base) / vh) * vf) / 8;
      const top = base + vh;
      for (const ring of rings)
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i],
            c = ring[(i + 1) % ring.length];
          const dx = c[0] - a[0],
            dz = c[1] - a[1],
            l = Math.hypot(dx, dz);
          if (l < 0.05) continue;
          const n = [dz / l, 0, -dx / l]; // outward for CCW (x,z)
          const u0 = acc / (bay * 8),
            u1 = (acc + l) / (bay * 8);
          acc += l;
          const shop =
            shops &&
            ring === pts &&
            l > 2.5 &&
            facesStreet(a, c, n, b.synthetic ? roadGrid : preRoads);
          const yS = shop ? Math.min(base + 3.6, top - 0.3) : Math.min(base + 1.2, top);
          // wall foot goes 0.5 m below the lowest ground so slopes never show a gap
          if (shop) {
            // 4 m shop bays; u runs right-to-left along the ring so signs read correctly
            const s0 = -sAcc / 32,
              s1 = -(sAcc + l) / 32,
              w0 = (foot - base) / 3.6,
              w1 = (yS - base) / 3.6;
            sAcc += l;
            if (!hideShop)
              shopGeo.quad(
                [a[0], foot, a[1]],
                [c[0], foot, c[1]],
                [c[0], yS, c[1]],
                [a[0], yS, a[1]],
                [SHOP_LO, SHOP_LO, SHOP_HI, SHOP_HI],
                n,
                [
                  [s0, w0],
                  [s1, w0],
                  [s1, w1],
                  [s0, w1],
                ]
              );
            // street-facing shop walls: src/world/Furniture.js hangs POI signs and parks scooters here
            shopWalls.push({ a, c, n, base, h, floors, bi });
            // slanted metal awning over the shopfront (under the POI signs from src/world/Furniture.js)
            if (!lean2) {
              const o = 1.25,
                y0 = base + 3.2,
                y1 = base + 2.85;
              const A0 = [a[0], y0, a[1]],
                C0 = [c[0], y0, c[1]],
                A1 = [a[0] + n[0] * o, y1, a[1] + n[2] * o],
                C1 = [c[0] + n[0] * o, y1, c[1] + n[2] * o];
              const ac = col(
                ['#6d7a86', '#8a8f94', '#3f6f9f', '#a8a39a', '#4f7a5a'][Math.floor(rnd2() * 5)]
              );
              if (!hideShop) {
                awnGeo.quad(
                  A0,
                  C0,
                  C1,
                  A1,
                  ac,
                  [n[0] * 0.3, 0.95, n[2] * 0.3],
                  [
                    [0, 0],
                    [l / 3, 0],
                    [l / 3, 0.4],
                    [0, 0.4],
                  ]
                );
                awnGeo.quad(
                  A0,
                  C0,
                  C1,
                  A1,
                  mulCol(ac, 0.6),
                  [-n[0] * 0.3, -0.95, -n[2] * 0.3],
                  [
                    [0, 0],
                    [l / 3, 0],
                    [l / 3, 0.4],
                    [0, 0.4],
                  ]
                );
              }
            }
            if (!LANE_TYPES.has(shop.type)) onMain = true;
          } else if (!fp) {
            g.quad(
              [a[0], foot, a[1]],
              [c[0], foot, c[1]],
              [c[0], yS, c[1]],
              [a[0], yS, a[1]],
              [cLo, cLo, tint, tint],
              n,
              [
                [u0, vAt(foot)],
                [u1, vAt(foot)],
                [u1, vAt(yS)],
                [u0, vAt(yS)],
              ]
            );
          }
          if (!fp && top > yS + 0.01)
            g.quad(
              [a[0], yS, a[1]],
              [c[0], yS, c[1]],
              [c[0], top, c[1]],
              [a[0], top, a[1]],
              [tint, tint, cTop, cTop],
              n,
              [
                [u0, vAt(yS)],
                [u1, vAt(yS)],
                [u1, vAt(top)],
                [u0, vAt(top)],
              ]
            );
          // the old fixed-word signs are gone (POI signs in src/world/Furniture.js); their
          // draws stay so the shared rnd sequence (stalls, trees...) is unchanged
          if (ring === pts && b.kind === 'town' && l > 4 && rnd() < 0.22 && oldSigns < 260) {
            oldSigns++;
            rnd();
          }
          // horizontal floor ledges give campus blocks real depth and shadow lines
          if (!fp && (style === 'tan' || style === 'red' || style === 'white') && vh > 6) {
            const fl = vh / vf;
            for (let fy = base + fl; fy < top - 1; fy += fl) {
              const o = style === 'white' ? 0.22 : 0.32,
                t0 = fy - 0.1,
                t1 = fy + 0.12;
              const A = [a[0] + n[0] * o, a[1] + n[2] * o],
                C = [c[0] + n[0] * o, c[1] + n[2] * o];
              const lc =
                style === 'red'
                  ? col('#e6e1d6')
                  : style === 'white'
                    ? col('#e9e7e2')
                    : col('#a69684');
              ledgeGeo.quad(
                [a[0], t1, a[1]],
                [c[0], t1, c[1]],
                [C[0], t1, C[1]],
                [A[0], t1, A[1]],
                lc,
                UP
              );
              ledgeGeo.quad(
                [A[0], t0, A[1]],
                [C[0], t0, C[1]],
                [C[0], t1, C[1]],
                [A[0], t1, A[1]],
                lc,
                n,
                [
                  [0, 0],
                  [l / 2, 0],
                  [l / 2, 0.1],
                  [0, 0.1],
                ]
              );
              ledgeGeo.quad(
                [a[0], t0, a[1]],
                [c[0], t0, c[1]],
                [C[0], t0, C[1]],
                [A[0], t0, A[1]],
                mulCol(lc, 0.7),
                [0, -1, 0]
              );
            }
          }
          if (ring === pts && !lean2) contactShadow(a, c, n);
        }
      const rr = fp ? lookWalls(V, rings, vh, vf) : rings;
      // looks.json roof.shape: a pitched roof drawn for looks only; `pitched` keeps the OSM
      // value because it gates shared rnd / rnd2 draws further down
      const shapeB =
        L?.roof?.shape && !b.roof ? { ...b, roof: L.roof.shape, roofH: L.roof.rise ?? b.roofH } : b;
      const pv =
        !b.parts &&
        pitchedRoof(
          shapeB,
          vp,
          top,
          rcL || rc,
          tint.map((v) => v * 0.85)
        );
      pitched = shapeB === b ? pv : false;
      pitchedV = pv;
      if (L?.open) {
        if (!L.open.bare) flatRoofGeo.flatPoly(vp, padY, col(L.open.floor || '#c9c9c4'), V.holes);
        continue;
      }
      if (!pv)
        flatRoofGeo.flatPoly(rr[0], top, rcL || rcFlat, rr.length > 1 ? rr.slice(1) : V.holes);
      if (!pv && L?.roof && !b.parts) lookRoof(L.roof, rr[0], rr.slice(1), top);
      // parapet
      if (!pv && ph > 0)
        for (const ring of rr)
          for (let i = 0; i < ring.length; i++) {
            const a = ring[i],
              c = ring[(i + 1) % ring.length];
            const dx = c[0] - a[0],
              dz = c[1] - a[1],
              l = Math.hypot(dx, dz);
            if (l < 0.05) continue;
            parapetEdge(a, c, [dz / l, 0, -dx / l], top, ph, pc);
          }
    }
    const top = base + h;
    if (b.feature) landmarkRoof(b, pts, top, pitched);
    if (L) {
      for (const cp of L.canopy || []) canopyAt(pts, cp);
      if (L.portal) lookPortal(L.portal);
    }
    // rooftop extras on flat town roofs: 鐵皮加蓋 35% (lanes) / 15% (shops on a
    // main road), ~30% stair house (see SHED_P)
    let extraH = 0,
      tankAt = null;
    // low quality: no rooftop extras on the 補建街區 fill
    const lean = opts.low && b.synthetic;
    // looks.json roof.extras false / a look pitched roof: the town stair house, shed and tank
    // are not drawn, but their rb / rnd draws and extraH (which gates the AC rnd2 draws) stay
    // as they were; only the collision top ignores the hidden extras
    const noX = !!L && (L.roof?.extras === false || !!pitchedV);
    if (b.kind === 'town' && !pitched && !b.holes && floors >= 2 && !lean) {
      const f = obb(pts),
        L = f.u1 - f.u0,
        W = f.v1 - f.v0;
      const inside = (u0, u1, v0, v1) =>
        [
          [u0, v0],
          [u1, v0],
          [u1, v1],
          [u0, v1],
          [(u0 + u1) / 2, (v0 + v1) / 2],
        ].every(([u, v]) => {
          const p = f.P(u, v);
          return pointInPoly(p[0], p[1], pts);
        });
      // b.shed: the fill's per-block 鐵皮加蓋 share (tools/block_survey.json plan.shed)
      const wantShed = rb() < (b.shed ?? (onMain ? SHED_P.main : SHED_P.lane)),
        wantStair = rb() < 0.3;
      let st = null;
      if (wantStair && L > 6 && W > 4.5) {
        const s = [f.u1 - 3.7, f.u1 - 0.7, f.v0 + 0.7, f.v0 + 3.3];
        if (inside(...s)) {
          st = s;
          if (!noX)
            roofBox(
              f,
              s,
              top,
              2.9,
              tint.map((v) => v * 0.92),
              rc
            );
          extraH = 2.9;
          const p = f.P((s[0] + s[1]) / 2, (s[2] + s[3]) / 2);
          tankAt = [p[0], top + 2.3, p[1]];
        }
      }
      if (wantShed && L > 5 && W > 4) {
        let su1 = f.u0 + 0.7 + (L - 1.4) * (0.55 + rb() * 0.4);
        if (st) su1 = Math.min(su1, st[0] - 0.5);
        const s = [f.u0 + 0.7, su1, f.v0 + 0.7, f.v1 - 0.7];
        if (s[1] - s[0] > 3 && inside(...s)) {
          extraH = Math.max(extraH, noX ? 3.1 : shed(f, s, top, rb));
          if (!tankAt) {
            // tank on the free end of the roof, or none if the shed fills it
            const p = f.P((su1 + f.u1) / 2, (f.v0 + f.v1) / 2);
            tankAt = f.u1 - su1 > 2.6 && pointInPoly(p[0], p[1], pts) ? [p[0], top, p[1]] : false;
          }
        }
      }
    }
    if (!lean && b.kind === 'town' && rnd() < 0.55 && !pitched) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length,
        cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (pointInPoly(cx, cz, pts)) {
        const p = [cx + (rnd() - 0.5), top, cz + (rnd() - 0.5)];
        if (tankAt !== false && !noX) tanks.push(tankAt || p);
      }
    }
    // rooftop clutter (AC condensers, vents) on flat roofs not already carrying sheds / stair houses
    // split.ac (overrides.json): the units the roof had before it was split, each on the block under it
    // (skip: a look roof with panels / pitched shape / setback; the spot still draws its rnd2 values)
    if (!pitched && (!b.parts || b.splitAc) && !lean2 && h >= 6 && extraH === 0)
      acSpots.push({
        r2: b.synthetic ? rnd2 : null,
        pts: b.acPts || pts,
        top,
        /* acPts：改過輪廓的建物用原本輪廓抽冷氣亂數（src/world/zones/ZoneA.js） */ town:
          b.kind === 'town',
        parts: b.parts && b.splitAc ? b.parts.map((V) => [V.pts, base + V.h, V.holes]) : null,
        skip:
          !!L &&
          (L.roof?.ac === false || !!L.roof?.solar || !!pitchedV || (L.topFloor?.setback || 0) > 0),
      });
    if (style === 'temple' && !pitched && !b.parts) temples.push({ pts, top });
    if (b.parts) {
      // whole footprint blocks movement; each block gives its own roof to topAt
      collision.addPolygon(pts, -Infinity);
      for (const V of b.parts) collision.addPolygon(V.pts, base + V.h + 0.6);
    } else {
      const pi = collision.addPolygon(
        pts,
        L?.open
          ? padY + 1.1
          : Math.max(
              pitched ? top + pitched : top + 0.6,
              noX ? -Infinity : top + extraH,
              pitchedV ? top + pitchedV : -Infinity
            )
      );
      if (collPts !== pts) lateColl.push(() => collision.insetPolygon(pi, collPts));
    }
    if (b.name) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length,
        cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      world.named[b.name] = { x: cx, z: cz, h, base, b };
    }
  });
  world.tris.walls = 0;
  for (const k in wallGeo) {
    const m = wallGeo[k].mesh(wallMat[k]);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    world.tris.walls += wallGeo[k].tris;
  }
  world.windowMats = Object.values(wallMat);
  if (shopGeo.tris) {
    // PBR shopfronts: shutters / lit glass fronts under a blank sign band (POI signs come from src/world/Furniture.js)
    const mat = makeWallMat(shopTex());
    const m = shopGeo.mesh(mat);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    world.shopMat = mat;
    world.tris.shops = shopGeo.tris;
  }
  {
    const m = roofGeo.mesh(
      new THREE.MeshStandardMaterial({ vertexColors: true, map: roofTexture(), roughness: 0.85 })
    );
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    world.tris.roofs = roofGeo.tris;
  }
  if (flatRoofGeo.tris) {
    const rt = roofTex();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: rt.map,
      normalMap: rt.normalMap,
      roughness: 0.92,
    });
    addMacro(mat, 0.05, 0.3);
    const m = flatRoofGeo.mesh(mat);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    world.tris.roofs += flatRoofGeo.tris;
  }
  // rooftop AC condensers in rows, vent stacks
  {
    const acGeo = new Geo();
    for (const { r2, pts, top: top0, town, parts, skip } of acSpots) {
      const rnd2 = r2 || rnd2W;
      let x0 = 1e9,
        x1 = -1e9,
        z0 = 1e9,
        z1 = -1e9;
      for (const [x, z] of pts) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        z0 = Math.min(z0, z);
        z1 = Math.max(z1, z);
      }
      const n = Math.min(14, Math.floor(((x1 - x0) * (z1 - z0)) / (town ? 120 : 90)));
      for (let k = 0; k < n; k++) {
        const x = x0 + 1.5 + rnd2() * (x1 - x0 - 3),
          z = z0 + 1.5 + rnd2() * (z1 - z0 - 3);
        if (
          !pointInPoly(x, z, pts) ||
          !pointInPoly(x + 1.2, z + 1.2, pts) ||
          !pointInPoly(x - 1.2, z - 1.2, pts)
        )
          continue;
        // split roof: the block under the unit; a unit across a block edge is dropped (its draws stay)
        const blk =
          parts &&
          [
            [x, z],
            [x + 1.2, z + 1.2],
            [x - 1.2, z - 1.2],
          ].map(([qx, qz]) =>
            parts.find(
              ([p, , hs]) =>
                pointInPoly(qx, qz, p) && !(hs && hs.some((q) => pointInPoly(qx, qz, q)))
            )
          ); // 天井（V.holes）上不放
        const top = !parts ? top0 : blk[0] && blk.every((q) => q === blk[0]) ? blk[0][1] : null;
        if (rnd2() < 0.25) {
          const a = rnd2() * 3;
          if (top !== null && !skip) acGeo.box(x, z, a, 0.5, 0.5, top, top + 1.1, col('#8f9497'));
        } else if (top !== null && !skip) {
          acGeo.box(x, z, 0, 1.0, 0.7, top, top + 0.75, col('#e4e3de'));
          acGeo.box(x + 1.15, z, 0, 1.0, 0.7, top, top + 0.75, col('#dedcd6'));
        }
      }
    }
    if (acGeo.tris) {
      const am = acGeo.mesh(
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 })
      );
      am.castShadow = quality !== 'low';
      scene.add(am);
      world.tris.ac = acGeo.tris;
    }
  }
  if (ledgeGeo.tris) {
    const lm = ledgeGeo.mesh(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: concreteTex().map,
        roughness: 0.85,
      })
    );
    lm.castShadow = true;
    lm.receiveShadow = true;
    scene.add(lm);
  }
  if (awnGeo.tris) {
    const ct = corrugatedTex();
    const sm = awnGeo.mesh(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: ct.map,
        normalMap: ct.normalMap,
        roughness: 0.55,
        metalness: 0.55,
        side: THREE.DoubleSide,
      })
    );
    sm.castShadow = true;
    sm.receiveShadow = true;
    scene.add(sm);
  }
  if (aoGeo.tris) {
    const am = aoGeo.mesh(
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        ...OFFSET,
      })
    );
    am.renderOrder = layerOrder++;
    scene.add(am);
  }
  // temple roofs: hipped orange-tile roof with up-swept ridge ends
  if (temples.length) {
    const tg = new Geo();
    for (const { pts, top } of temples) {
      let x0 = 1e9,
        x1 = -1e9,
        z0 = 1e9,
        z1 = -1e9;
      for (const [x, z] of pts) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        z0 = Math.min(z0, z);
        z1 = Math.max(z1, z);
      }
      const o = 0.8,
        cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2,
        rh = Math.min(3.2, (x1 - x0) * 0.3 + 1),
        y = top + 0.7;
      const E = [
        [x0 - o, z0 - o],
        [x1 + o, z0 - o],
        [x1 + o, z1 + o],
        [x0 - o, z1 + o],
      ];
      const rl = Math.max(0.5, (x1 - x0 - (z1 - z0)) / 2);
      const R0 = [cx - rl, y + rh, cz],
        R1 = [cx + rl, y + rh, cz];
      const orange = col('#d9632b'),
        green = col('#2f7a52');
      tg.quad([E[0][0], y, E[0][1]], [E[1][0], y, E[1][1]], R1, R0, orange, [0, 0.7, -0.7]);
      tg.quad([E[3][0], y, E[3][1]], [E[2][0], y, E[2][1]], R1, R0, orange, [0, 0.7, 0.7]);
      tg.tri([E[0][0], y, E[0][1]], [E[3][0], y, E[3][1]], R0, green, [-0.7, 0.7, 0]);
      tg.tri([E[1][0], y, E[1][1]], [E[2][0], y, E[2][1]], R1, green, [0.7, 0.7, 0]);
      // ridge with swallowtail ends
      tg.box(cx, cz, 0, rl * 2 + 1.6, 0.35, y + rh - 0.05, y + rh + 0.35, col('#b23a1f'), 1);
      for (const sx of [-1, 1])
        tg.box(
          cx + sx * (rl + 0.9),
          cz,
          0,
          0.5,
          0.3,
          y + rh + 0.2,
          y + rh + 1.0,
          col('#c8431f'),
          1
        );
    }
    const m = tg.mesh(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      })
    );
    m.castShadow = true;
    scene.add(m);
  }
  // rooftop water tanks (very Taiwan)
  if (tanks.length) {
    const tg = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12);
    tg.translate(0, 1.6, 0);
    const legs = new THREE.BoxGeometry(1.4, 0.8, 1.4);
    legs.translate(0, 0.4, 0);
    const im = new THREE.InstancedMesh(
      tg,
      new THREE.MeshStandardMaterial({ color: '#d9d4c3', roughness: 0.35, metalness: 0.6 }),
      tanks.length
    );
    const im2 = new THREE.InstancedMesh(
      legs,
      new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.7, metalness: 0.4 }),
      tanks.length
    );
    const M = new THREE.Matrix4();
    tanks.forEach((t, i) => {
      M.makeTranslation(t[0], t[1] + 0.6, t[2]);
      im.setMatrixAt(i, M);
      im2.setMatrixAt(i, M);
    });
    im.castShadow = true;
    scene.add(im, im2);
  }
  onProgress(0.6);

  // ---------- road graph ----------
  const nodes = new Map();
  const getNode = (id, p) => {
    let n = nodes.get(id);
    if (!n) {
      n = { id, x: p[0], z: p[1], adj: [] };
      nodes.set(id, n);
    }
    return n;
  };
  const inB = (p) =>
    p[0] > B.minX + 5 && p[0] < B.maxX - 5 && p[1] > B.minZ + 5 && p[1] < B.maxZ - 5;
  for (const r of data.roads) {
    if (!r.nodes || r.nodes.length !== r.pts.length || (r.under && !r.grade)) continue; // a cut's box is driven through
    const drive = !!r.drive && !(r.type === 'service' && !r.name);
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (!inB(r.pts[i]) || !inB(r.pts[i + 1])) continue;
      const a = getNode(r.nodes[i], r.pts[i]),
        b = getNode(r.nodes[i + 1], r.pts[i + 1]);
      if (a === b) continue;
      const w = Math.min(wPt(r, i), wPt(r, i + 1));
      a.adj.push({ to: b, w, drive, road: r, fwd: true });
      if (!r.oneway) b.adj.push({ to: a, w, drive, road: r, fwd: false });
      else b.adj.push({ to: a, w, drive: false, road: r, fwd: false });
    }
  }
  world.graph = nodes;
  world.driveNodes = [...nodes.values()].filter((n) => n.adj.some((e) => e.drive));
  world.walkNodes = [...nodes.values()].filter((n) => n.adj.length);

  world.nearestRoadPoint = (x, z, driveOnly = false) => {
    let best = null,
      bd = 1e9;
    for (const r of data.roads) {
      if (driveOnly && !r.drive) continue;
      if (r.tunnel) continue; // underground (e.g. basement parking aisles): not reachable from the surface
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i],
          b = r.pts[i + 1];
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          l2 = dx * dx + dz * dz || 1;
        let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        const qx = a[0] + dx * t,
          qz = a[1] + dz * t,
          d = Math.hypot(qx - x, qz - z);
        if (d < bd) {
          bd = d;
          best = { x: qx, z: qz, dir: Math.atan2(dx, dz), road: r };
        }
      }
    }
    return best;
  };
  // world.soft: parked scooters (no collision) that spawns should not overlap
  world.isFree = (x, z, r = 1) =>
    !collision.blocked(x, z, r, 0, H(x, z)) &&
    !waterPolys.some((p) => inArea(x, z, p)) &&
    !(world.soft && world.soft.near(x, z, r + 0.4));

  // ---------- landmarks ----------
  const poi = (name) => data.pois.find((p) => p.name === name);
  const standard = (c, o = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  // board-formed concrete (PBR) for the landmarks
  const concTex = concreteTex();
  const concrete = (c, o = {}) =>
    new THREE.MeshStandardMaterial({
      color: c,
      map: concTex.map,
      normalMap: concTex.normalMap,
      roughness: 0.85,
      ...o,
    });
  const LM = data.landmarks || {};
  // colliders of the newer landmark parts are added after the trees are planted, and
  // noPlant keeps trees off the fountain plaza as the old larger basin did: tree
  // placement, and with it the shared random streams (rnd, rnd2), stays as before
  const lateColliders = [],
    noPlant = [];
  // sunk water: the line along the top of every bank / across every culvert end (drawSinks)
  lateColliders.push(() => {
    for (const [a, b] of sinkColl) collision.addSegment(a[0], a[1], b[0], b[1]);
  });
  // merge box-like parts [geometry, x, y, z] into one mesh
  const mergedMesh = (parts, mat) => {
    const gs = parts.map(([geo, x, y, z]) => {
      geo.translate(x, y, z);
      return geo;
    });
    const m = new THREE.Mesh(mergeGeometries(gs, false), mat);
    gs.forEach((geo) => geo.dispose());
    return m;
  };
  // 二一鐘 (OSM 鐘塔): two fair-faced concrete pylons joined at the top, a bell
  // between them and a cross on top (Commons photos, see overrides.json)
  const ct = poi('鐘塔');
  if (ct && (LM['鐘塔'] || {}).style === 'cross_bell') {
    const T = LM['鐘塔'],
      h = T.h || 19,
      ch = T.cross || 5;
    const g = new THREE.Group();
    const pylon = (x) => {
      // folded-plate pylon, slightly tapered
      const geo = new THREE.BoxGeometry(1.0, h, 1.5, 1, 1, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++)
        if (p.getY(i) > 0) {
          p.setX(i, p.getX(i) * 0.7);
          p.setZ(i, p.getZ(i) * 0.75);
        }
      geo.computeVertexNormals();
      return [geo, x, h / 2, 0];
    };
    const conc = mergedMesh(
      [
        [new THREE.BoxGeometry(3.6, 0.4, 2.2), 0, 0.2, 0],
        pylon(-1.15),
        pylon(1.15),
        [new THREE.BoxGeometry(2.4, 0.9, 1.0), 0, h - 0.45, 0],
        [new THREE.BoxGeometry(0.28, ch + 1, 0.28), 0, h + (ch + 1) / 2 - 1, 0],
        [new THREE.BoxGeometry(1.9, 0.28, 0.28), 0, h + ch * 0.62, 0],
      ],
      concrete('#d4d1ca', { roughness: 0.9 })
    );
    const bell = mergedMesh(
      [
        [new THREE.CylinderGeometry(0.3, 0.55, 0.9, 10), 0, h - 1.6, 0],
        [new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4), 0, h - 0.95, 0],
      ],
      standard('#6b4a2a', { roughness: 0.35, metalness: 0.85 })
    );
    g.add(conc, bell);
    const cb = Hmin(ct.x, ct.z, 2.2);
    g.position.set(ct.x, cb, ct.z);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = !opts.low;
        o.receiveShadow = true;
      }
    });
    scene.add(g);
    collision.addCircle(ct.x, ct.z, 2.6);
    world.named['鐘塔'] = { x: ct.x, z: ct.z, h: Math.round(h + ch), base: cb };
  } else if (ct) {
    // fallback without landmark data: a plain tower
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 20, 3.2), standard('#bdbab2'));
    shaft.position.y = 10;
    g.add(shaft);
    const cb = Hmin(ct.x, ct.z, 2.2);
    g.position.set(ct.x, cb, ct.z);
    scene.add(g);
    collision.addCircle(ct.x, ct.z, 2.6);
    world.named['鐘塔'] = { x: ct.x, z: ct.z, h: 25, base: cb };
  }
  // Old gate 舊校門: three white concrete round arches on four slim square columns
  // (one column shared by neighbouring arches), plaques 中 原 大 學 on the columns
  // (Commons photo, see overrides.json). Google 街景目視（2017-09）: a free-standing
  // frame, no deck or roof, ~9.7 m wide and ~6.4 m to the arch crown (span / colH /
  // col / ring / depth in overrides.json). The road runs under the middle arch.
  const og = poi('舊校門');
  if (og) {
    const near = world.nearestRoadPoint(og.x, og.z);
    const dir = near ? near.dir : 0;
    // centred on the road (the POI sits ~0.5 m off it)
    const gx = near && Math.hypot(near.x - og.x, near.z - og.z) < 3 ? near.x : og.x,
      gz = gx === og.x ? og.z : near.z;
    const g = new THREE.Group();
    const OG = LM['舊校門'] || {};
    const SPAN = OG.span || 2.5,
      COL = OG.col || 0.55,
      HC = OG.colH || 4.7,
      D = OG.depth || 0.45,
      RING = OG.ring || 0.45;
    const STEP = SPAN + COL,
      R = SPAN / 2;
    // base at the highest column foot; each column reaches down to its own ground
    const wx = (x) => [gx + Math.cos(dir) * x, gz - Math.sin(dir) * x];
    const cxs = [-1.5, -0.5, 0.5, 1.5].map((k) => k * STEP);
    const gb = Math.max(...cxs.map((x) => H(...wx(x))));
    const parts = [];
    for (const x of cxs) {
      const drop = gb - H(...wx(x)) + 0.3;
      parts.push([new THREE.BoxGeometry(COL, HC + drop, D), x, (HC - drop) / 2, 0]);
    }
    const mat = concrete('#f0ede6');
    const cols = mergedMesh(parts, mat);
    // the three semicircular arch rings as one smooth extruded outline, springing from the
    // column tops: outer arcs left to right (neighbouring rings meet above the shared
    // column), then the inner arcs right to left with the column tops between them
    const cs = [-STEP, 0, STEP],
      RO = R + RING,
      tm = Math.acos(Math.min(1, STEP / 2 / RO)),
      M = 16,
      ol = [];
    cs.forEach((c, i) => {
      const a0 = i === 0 ? Math.PI : Math.PI - tm,
        a1 = i === cs.length - 1 ? 0 : tm;
      for (let k = i === 0 ? 0 : 1; k <= M; k++) {
        const a = a0 + ((a1 - a0) * k) / M;
        ol.push(new THREE.Vector2(c + Math.cos(a) * RO, Math.sin(a) * RO));
      }
    });
    for (let i = cs.length - 1; i >= 0; i--) {
      for (let k = 0; k <= M; k++) {
        const a = (Math.PI * k) / M;
        ol.push(new THREE.Vector2(cs[i] + Math.cos(a) * R, Math.sin(a) * R));
      }
    }
    const ringGeo = new THREE.ExtrudeGeometry(new THREE.Shape(ol), {
      depth: D,
      bevelEnabled: false,
    });
    ringGeo.translate(0, HC, -D / 2);
    const rings = new THREE.Mesh(ringGeo, mat);
    for (const m of [cols, rings]) {
      m.castShadow = !opts.low;
      m.receiveShadow = true;
      g.add(m);
    }
    // plaques: one canvas with the four characters, one quad per column and side,
    // on the spandrel just above the column top
    const pt = canvasTex(
      256,
      64,
      (cx) => {
        cx.fillStyle = '#f4f1ea';
        cx.fillRect(0, 0, 256, 64);
        cx.fillStyle = '#1b1b1b';
        cx.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        [...'中原大學'].forEach((t, i) => {
          cx.fillText(t, i * 64 + 32, 34);
          cx.strokeStyle = '#555';
          cx.lineWidth = 3;
          cx.strokeRect(i * 64 + 3, 3, 58, 58);
        });
      },
      false
    );
    const pg = [],
      PS = Math.min(0.6, COL + 0.1);
    cxs.forEach((x, i) => {
      for (const sd of [1, -1]) {
        const q = new THREE.PlaneGeometry(PS, PS);
        const uv = q.attributes.uv;
        // seen from outside (sd < 0) the columns come in the opposite order: keep 中原大學 left to right
        const j = sd > 0 ? i : cxs.length - 1 - i;
        for (let k = 0; k < uv.count; k++) uv.setX(k, (j + uv.getX(k)) / 4);
        if (sd < 0) q.rotateY(Math.PI);
        pg.push([q, x, HC + PS / 2 + 0.05, sd * (D / 2 + 0.02)]);
      }
    });
    g.add(mergedMesh(pg, new THREE.MeshStandardMaterial({ map: pt, roughness: 0.5 })));
    // rotation dir: local x runs across the road, matching the colliders
    g.position.set(gx, gb, gz);
    g.rotation.y = dir;
    scene.add(g);
    // the two inner columns get thin colliders so a car (radius 1.35) still fits the 2.5 m
    // middle arch as it did the old wide one; the outer columns block as drawn
    for (const x of cxs)
      collision.addCircle(
        gx + Math.cos(dir) * x,
        gz - Math.sin(dir) * x,
        Math.abs(x) < STEP ? 0.15 : COL * 0.65
      );
  }
  // 正門 校名牆 + spire (src/world/Interiors.js MAIN_GATE.wall / spire; Google 街景 2017-09 / 2022-08 / 2024-08):
  // a ~6 x 2.9 x 1.5 m black polished granite block with grid joints, the CYCU emblem and 中原大學 facing
  // SSW toward 中北路, on a kerbed lawn (built with the guard kiosk); a vertical twisted square stainless
  // column (~12 m, gold band, black stone base) just off its west end.
  if (opts.mainGate && opts.mainGate.wall) {
    const { wall: Wl, spire: S } = opts.mainGate,
      W = Wl.W,
      D = Wl.D,
      HW = Wl.H,
      sp = Wl.ang;
    const g = new THREE.Group();
    const CW = 1024,
      CH = Math.round((CW * HW) / W);
    // stored at the tier's texture scale, drawn in CW x CH units; both faces are static (GpuMemLifecycle.flushShared)
    const { cv, g: c } = scaledCanvas(CW, CH);
    markShared(cv);
    const gr = c.createLinearGradient(0, 0, 0, CH);
    gr.addColorStop(0, '#2a2c30');
    gr.addColorStop(1, '#141518');
    c.fillStyle = gr;
    c.fillRect(0, 0, CW, CH);
    const sr = mulberry32(1024);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = `rgba(255,255,255,${sr() * 0.05})`;
      c.fillRect(sr() * CW, sr() * CH, 2, 2);
    }
    // joints between the granite panels (~0.75 x 0.58 m)
    c.fillStyle = 'rgba(0,0,0,0.55)';
    for (let i = 1; i < 8; i++) c.fillRect((i * CW) / 8 - 1, 0, 3, CH);
    for (let i = 1; i < 5; i++) c.fillRect(0, (i * CH) / 5 - 1, CW, 3);
    // the back (campus side) is plain jointed granite: copy before the emblem and the name go on
    const { cv: cvB, g: cB } = scaledCanvas(CW, CH);
    cB?.drawImage(cv, 0, 0, CW, CH);
    markShared(cvB);
    // emblem + name on the east half (toward the kiosk), the west half plain (街景 2018-11 特寫): a ~0.95 m
    // mid-blue disc (white rim, white laurel, rings on top, red shield with a white cross, atom below) at
    // 47 % of the face, 「中原大學」 in silver-white ~0.5 m characters from 55 % to 88 %, the English
    // name under it across the same width
    c.save();
    c.translate(CW * 0.47, CH * 0.53);
    c.scale(0.98, 0.98);
    c.fillStyle = '#f2f2ee';
    c.beginPath();
    c.arc(0, 0, 87, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2a5a9a';
    c.beginPath();
    c.arc(0, 0, 82, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    for (const s of [-1, 1])
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 2 + s * (0.35 + k * 0.33);
        c.beginPath();
        c.ellipse(Math.cos(a) * 56, Math.sin(a) * 56, 13, 6, a + s * 0.6, 0, Math.PI * 2);
        c.stroke();
      }
    c.lineWidth = 2.5;
    for (let k = 0; k < 5; k++) {
      c.beginPath();
      c.arc(-24 + k * 12, -50 + (k % 2) * 6, 7, 0, Math.PI * 2);
      c.stroke();
    }
    c.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.ellipse(0, 54, 12, 4.5, (k * Math.PI) / 3, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = '#d23a2c';
    c.beginPath();
    c.moveTo(-26, -30);
    c.lineTo(26, -30);
    c.lineTo(26, 6);
    c.quadraticCurveTo(26, 32, 0, 40);
    c.quadraticCurveTo(-26, 32, -26, 6);
    c.closePath();
    c.fill();
    c.fillStyle = '#fff';
    c.fillRect(-5, -30, 10, 68);
    c.fillRect(-26, -6, 52, 10);
    c.restore();
    c.fillStyle = '#ecebe6';
    c.font = '900 86px "Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif';
    c.textBaseline = 'middle';
    {
      const t = '中原大學',
        x0 = CW * 0.555,
        x1 = CW * 0.885,
        adv = (x1 - x0) / 4;
      for (let i = 0; i < 4; i++) c.fillText(t[i], x0 + i * adv, CH * 0.5);
    }
    c.font = '600 25px system-ui,sans-serif';
    c.fillStyle = '#cfcfca';
    {
      const t = 'Chung Yuan Christian University',
        w = c.measureText(t).width;
      c.save();
      c.translate(CW * 0.556, CH * 0.655);
      c.scale((CW * 0.325) / w, 1);
      c.fillText(t, 0, 0);
      c.restore();
    }
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    const granite = new THREE.MeshStandardMaterial({
      color: '#1c1d20',
      roughness: 0.22,
      metalness: 0.1,
    });
    // the white name catches the gate's floodlights at night (emissive follows world.windowMats)
    const face = new THREE.MeshStandardMaterial({
      map: tx,
      roughness: 0.25,
      metalness: 0.05,
      emissive: '#8c8c8c',
      emissiveMap: tx,
      emissiveIntensity: 0,
    });
    world.windowMats.push(face);
    const txB = new THREE.CanvasTexture(cvB);
    txB.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.MeshStandardMaterial({ map: txB, roughness: 0.25, metalness: 0.05 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W, HW, D), [
      granite,
      granite,
      granite,
      granite,
      face,
      back,
    ]);
    wall.position.y = HW / 2;
    g.add(wall);
    // plinth reaching 0.6 m below the base so the wall never floats on a slope; a 0.25 m black base course
    // standing 0.15 m proud of the faces, a thick overhanging coping on top
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(W, 0.6, D), granite);
    plinth.position.y = -0.3;
    g.add(plinth);
    const baseC = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.3, 0.85, D + 0.3),
      standard('#141517', { roughness: 0.35 })
    );
    baseC.position.y = -0.175;
    g.add(baseC);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.16, 0.22, D + 0.16),
      standard('#25272b', { roughness: 0.3 })
    );
    cap.position.y = HW + 0.06;
    g.add(cap);
    // 7 small round uplights on the base course under the emblem and the name, aimed up the face
    {
      const fx = [0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.92].map((f) => (f - 0.5) * W);
      const lg = mergeGeometries(
        fx.map((x) =>
          new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
            .scale(1, 0.8, 1)
            .translate(x, 0.25, D / 2 + 0.07)
        ),
        false
      );
      const lens = new THREE.MeshStandardMaterial({
        color: '#2b2d31',
        metalness: 0.6,
        roughness: 0.3,
        emissive: '#fff1cf',
        emissiveIntensity: 0,
      });
      world.windowMats.push(lens);
      g.add(new THREE.Mesh(lg, lens));
    }
    g.position.set(Wl.x, Hmin(Wl.x, Wl.z, W / 2), Wl.z);
    g.rotation.y = -sp; // local +x runs ESE; the name faces +z (SSW)
    // spire: black base, then a square stainless shaft twisted a half turn over its height
    const spire = new THREE.Group(),
      BASE = 1.8,
      SH = S.h - BASE;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, BASE + 0.6, 1.05), granite);
    base.position.y = (BASE - 0.6) / 2;
    spire.add(base);
    // a flat blade (~1.0 x 0.35 m), not a square post (街景 2018-11), twisted half a turn
    const shaftG = new THREE.BoxGeometry(1.0, SH, 0.35, 1, 24, 1);
    shaftG.translate(0, SH / 2, 0);
    const twist = (y) => (y / SH) * Math.PI,
      pos = shaftG.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i),
        t = twist(y),
        x = pos.getX(i),
        z = pos.getZ(i);
      pos.setXYZ(i, x * Math.cos(t) - z * Math.sin(t), y, x * Math.sin(t) + z * Math.cos(t));
    }
    shaftG.computeVertexNormals();
    const shaft = new THREE.Mesh(
      shaftG,
      new THREE.MeshStandardMaterial({
        color: '#b9bcbf',
        metalness: 0.85,
        roughness: 0.32,
        map: concTex.map,
      })
    );
    shaft.position.y = BASE;
    spire.add(shaft);
    const bandY = 8.1 - BASE,
      band = new THREE.Mesh(
        new THREE.BoxGeometry(1.07, 0.18, 0.42),
        standard('#c9a64a', { metalness: 0.9, roughness: 0.3 })
      );
    band.position.y = BASE + bandY;
    band.rotation.y = -twist(bandY);
    spire.add(band);
    spire.position.set(S.x, Hmin(S.x, S.z, 0.9), S.z);
    spire.rotation.y = -sp;
    for (const o of [g, spire]) {
      o.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      scene.add(o);
    }
    g.updateMatrixWorld(true);
    const P = (lx, lz) => {
      const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(g.matrixWorld);
      return [v.x, v.z];
    };
    collision.addPolygon(
      [P(-W / 2, -D / 2), P(W / 2, -D / 2), P(W / 2, D / 2), P(-W / 2, D / 2)],
      g.position.y + HW + 0.06
    );
    collision.addCircle(S.x, S.z, 0.8);
    world.gateSign = { x: Wl.x, z: Wl.z };
  }
  // Fountain 中原噴水池. Google 街景目視（2017-09，舊校門東側）＋衛星: a low round raised
  // basin (~8.5 m across, rim ~0.4 m) of light grey stone in a round plaza of dark granite
  // setts with a light stone band, and a low white wall on an arc to the west / north-west.
  // Sizes in overrides.json landmarks.
  const fp = data.areas.find((a) => a.name === '中原噴水池');
  if (fp) {
    const cx = fp.pts.reduce((s, p) => s + p[0], 0) / fp.pts.length,
      cz = fp.pts.reduce((s, p) => s + p[1], 0) / fp.pts.length;
    world.fountain = { x: cx, z: cz };
    const FT = LM['中原噴水池'] || {},
      round = FT.style === 'round_basin';
    const R = round ? (FT.d || 8.5) / 2 : 1.3,
      RIM = round ? FT.rim || 0.4 : 1.2;
    const PZ = Math.max(R + 1, FT.plaza || 9.5),
      BAND = FT.band || 1;
    // rim top sits RIM above the highest ground under the ring
    let gHi = -Infinity,
      gLo = Infinity;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2,
        y = H(cx + Math.cos(a) * R, cz + Math.sin(a) * R);
      gHi = Math.max(gHi, y);
      gLo = Math.min(gLo, y);
    }
    const fy = round ? gHi : H(cx, cz);
    const N = 260;
    const pos = new Float32Array(N * 3);
    const seeds = [];
    for (let i = 0; i < N; i++) seeds.push([rnd() * Math.PI * 2, 0.6 + rnd() * 0.8, rnd()]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: '#e4f2ff', size: 0.13, transparent: true, opacity: 0.75 })
    );
    pts.frustumCulled = false;
    scene.add(pts);
    const stone = concrete(round ? '#d4d4d0' : '#cfc9bc', { roughness: 0.85 });
    if (round) {
      const sg = new Geo(),
        wall = col('#c8c8c4'),
        cap = col('#d6d6d2'),
        inner = col('#a9aaa6');
      const S = 40,
        T = 0.45,
        y0 = gLo - 0.3,
        yT = fy + RIM;
      for (let k = 0; k < S; k++) {
        const a0 = (k / S) * Math.PI * 2,
          a1 = ((k + 1) / S) * Math.PI * 2,
          am = (a0 + a1) / 2;
        const o = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
        sg.quad(o(a0, R, y0), o(a1, R, y0), o(a1, R, yT), o(a0, R, yT), wall, [
          Math.cos(am),
          0,
          Math.sin(am),
        ]);
        sg.quad(
          o(a0, R - T, fy - 0.2),
          o(a1, R - T, fy - 0.2),
          o(a1, R - T, yT),
          o(a0, R - T, yT),
          inner,
          [-Math.cos(am), 0, -Math.sin(am)]
        );
        sg.quad(o(a0, R - T, yT), o(a1, R - T, yT), o(a1, R, yT), o(a0, R, yT), cap, UP);
        // basin floor
        sg.tri(o(a0, 0, fy - 0.2), o(a0, R - T, fy - 0.2), o(a1, R - T, fy - 0.2), inner, UP);
        // plaza: the setts of the paved area show between gutter stones at the rim and a
        // light stone band at PZ (fixed radii, not scaled with the basin)
        for (const [r0, r1, c] of [
          [R, R + 0.25, col('#8e8d88')],
          [PZ, PZ + BAND, col('#d9d6cc')],
        ]) {
          const g = (a, r) => [
            cx + Math.cos(a) * r,
            H(cx + Math.cos(a) * r, cz + Math.sin(a) * r) + 0.04,
            cz + Math.sin(a) * r,
          ];
          sg.quad(g(a0, r0), g(a1, r0), g(a1, r1), g(a0, r1), c, UP);
        }
      }
      const m = sg.mesh(
        new THREE.MeshStandardMaterial({ vertexColors: true, map: concTex.map, roughness: 0.85 })
      );
      m.receiveShadow = true;
      m.castShadow = !opts.low;
      scene.add(m);
      // shallow water just below the rim (the basin was dry in 2017-09; kept with water for the game)
      const wn = groundTex.waterNormal().clone();
      wn.needsUpdate = true;
      wn.repeat.set(0.4, 0.4);
      const wat = new THREE.Mesh(
        new THREE.CircleGeometry(R - T, 32),
        new THREE.MeshStandardMaterial({
          color: '#4f7480',
          roughness: 0.06,
          metalness: 0.15,
          normalMap: wn,
          normalScale: new THREE.Vector2(0.3, 0.3),
          envMapIntensity: 1.3,
          transparent: true,
          opacity: 0.9,
        })
      );
      world.animated.push((t) => {
        wn.offset.set(t * 0.02, t * 0.013);
      });
      wat.rotation.x = -Math.PI / 2;
      wat.position.set(cx, fy + RIM - 0.15, cz);
      scene.add(wat);
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, RIM + 0.5, 12), stone);
      basin.position.set(cx, fy + (RIM + 0.5) / 2, cz);
      scene.add(basin);
      // low white stone wall on an arc (west to north-west)
      if (FT.wall) {
        const Wl = FT.wall,
          WR = Wl.r || 12,
          WH = Wl.h || 0.4,
          WT = Wl.t || 0.35,
          A0 = (Wl.from ?? 0.95) * Math.PI,
          A1 = (Wl.to ?? 1.4) * Math.PI;
        const n = Math.max(4, Math.round((WR * (A1 - A0)) / 1.2)),
          wg = [];
        for (let k = 0; k < n; k++) {
          const a = A0 + ((k + 0.5) / n) * (A1 - A0),
            x = cx + Math.cos(a) * WR,
            z = cz + Math.sin(a) * WR,
            len = (WR * (A1 - A0)) / n + 0.06;
          const box = new THREE.BoxGeometry(len, WH + 0.3, WT);
          box.rotateY(-a + Math.PI / 2);
          wg.push([box, x, H(x, z) + (WH - 0.3) / 2, z]);
        }
        const wall = mergedMesh(wg, concrete('#e9e7e1', { roughness: 0.8 }));
        wall.castShadow = !opts.low;
        wall.receiveShadow = true;
        scene.add(wall);
        // walked around, not over (0.4 m); one short segment per piece
        lateColliders.push(() => {
          for (let k = 0; k < n; k++) {
            const a = A0 + (k / n) * (A1 - A0),
              b = A0 + ((k + 1) / n) * (A1 - A0);
            collision.addSegment(
              cx + Math.cos(a) * WR,
              cz + Math.sin(a) * WR,
              cx + Math.cos(b) * WR,
              cz + Math.sin(b) * WR
            );
          }
        });
      }
      // trees keep 6.5 m (the old basin radius) off the centre, as before the basin shrank
      noPlant.push([cx, cz, Math.max(R, 6.5)]);
      // the raised rim is walked around, not through
      collision.addCircle(cx, cz, R);
    } else {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.2, 16), stone);
      basin.position.set(cx, fy + 0.6, cz);
      scene.add(basin);
    }
    const sprayY = round ? fy + RIM + 0.3 : fy + 1.2;
    world.animated.push((t) => {
      for (let i = 0; i < N; i++) {
        const [a, sp, ph] = seeds[i];
        const k = (t * 0.6 + ph) % 1;
        const r = k * 2.6 * sp;
        pos[i * 3] = cx + Math.cos(a) * r;
        pos[i * 3 + 2] = cz + Math.sin(a) * r;
        pos[i * 3 + 1] = sprayY + 4.5 * k * (1 - k) * 4 * sp - 0.3;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  // 全人教育村 west colonnade: a row of very tall columns clad in silver-grey metal
  // panels, joined at the top by steel beams with short beams reaching into the garden
  // plaza (Google 街景目視 2017-09; run, height and pitch in overrides.json landmarks)
  const CL = LM['全人教育村柱廊'];
  if (CL && CL.style === 'colonnade') {
    const [ax, az] = CL.from,
      [bx, bz] = CL.to,
      n = CL.n || 4,
      h = CL.h || 13,
      w = CL.w || 0.9;
    const len = Math.hypot(bx - ax, bz - az),
      ux = (bx - ax) / len,
      uz = (bz - az) / len;
    // the short beams point into the plaza (the side of the run its centre lies on)
    const pz = data.areas.find((a) => a.name === '中原大學全人教育村花園廣場');
    let nx = -uz,
      nz = ux;
    if (pz) {
      const qx = pz.pts.reduce((t, p) => t + p[0], 0) / pz.pts.length,
        qz = pz.pts.reduce((t, p) => t + p[1], 0) / pz.pts.length;
      if ((qx - ax) * nx + (qz - az) * nz < 0) {
        nx = -nx;
        nz = -nz;
      }
    }
    const cols = Array.from({ length: n }, (_, k) => [
      ax + ((bx - ax) * k) / (n - 1),
      az + ((bz - az) * k) / (n - 1),
    ]);
    const gb = Math.max(...cols.map(([x, z]) => H(x, z))),
      top = gb + h,
      parts = [];
    const ang = Math.atan2(-uz, ux);
    for (const [x, z] of cols) {
      // octagonal shaft (rounded square, flat faces along the run)
      const y0 = H(x, z) - 0.3,
        geo = new THREE.CylinderGeometry(
          w / 2 / Math.cos(Math.PI / 8),
          w / 2 / Math.cos(Math.PI / 8),
          top - y0,
          8
        );
      geo.rotateY(Math.PI / 8 + ang);
      parts.push([geo, x, (top + y0) / 2, z]);
      const sb = new THREE.BoxGeometry(CL.beam || 4, 0.6, 0.4);
      sb.rotateY(Math.atan2(-nz, nx));
      parts.push([sb, x + (nx * (CL.beam || 4)) / 2, top - 0.3, z + (nz * (CL.beam || 4)) / 2]);
    }
    const tb = new THREE.BoxGeometry(len + w, 0.8, 0.6);
    tb.rotateY(ang);
    parts.push([tb, (ax + bx) / 2, top - 0.4, (az + bz) / 2]);
    const m = mergedMesh(
      parts,
      new THREE.MeshStandardMaterial({ color: '#b9bcbf', metalness: 0.8, roughness: 0.35 })
    );
    m.castShadow = !opts.low;
    m.receiveShadow = true;
    scene.add(m);
    lateColliders.push(() => {
      for (const [x, z] of cols) collision.addCircle(x, z, w / 2 + 0.05);
    });
  }
  // Campaign billboards
  const bTex = bannerTexture();
  const boardMat = new THREE.MeshStandardMaterial({
    map: bTex,
    emissiveMap: bTex,
    emissive: '#fff',
    emissiveIntensity: 0.15,
    roughness: 0.6,
  });
  const addBoard = (x, z, rot, s = 1) => {
    const g = new THREE.Group();
    const frameM = standard('#2a2c30', { metalness: 0.6, roughness: 0.45 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(6 * s, 3 * s, 0.15), [
      frameM,
      frameM,
      frameM,
      frameM,
      boardMat,
      boardMat,
    ]);
    board.position.y = 2.2 * s + 1.5 * s;
    for (const sx of [-2.6 * s, 2.6 * s]) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.4 * s + 1.5 * s + 1),
        standard('#333', { metalness: 0.6 })
      );
      p.position.set(sx, (2.4 * s + 1.5 * s) / 2 - 0.5, 0);
      g.add(p);
    }
    g.add(board);
    g.position.set(x, Hmin(x, z, 2.6 * s), z);
    g.rotation.y = rot;
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(g);
    collision.addCircle(x + Math.cos(rot) * 2.6 * s, z - Math.sin(rot) * 2.6 * s, 0.3);
    collision.addCircle(x - Math.cos(rot) * 2.6 * s, z + Math.sin(rot) * 2.6 * s, 0.3);
  };
  world.addBoard = addBoard;

  // Night market stalls 中原夜市
  // centre of OSM relation 13287977 (中原夜市), see tools/build_map.py
  world.nightMarket = data.nightMarket
    ? { x: data.nightMarket.x, z: data.nightMarket.z }
    : { x: -200, z: 280 };
  {
    const nm = world.nightMarket;
    const stallTop = new THREE.BoxGeometry(3.0, 0.3, 2.6);
    const stallBody = new THREE.BoxGeometry(2.5, 1.0, 1.8);
    const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#d62828', '#ffffff', '#1d3557'];
    const spots = [];
    for (const r of data.roads) {
      if (!r.drive) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i],
          b = r.pts[i + 1];
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          l = Math.hypot(dx, dz);
        for (let s = 2; s < l; s += 3.4) {
          const x = a[0] + (dx * s) / l,
            z = a[1] + (dz * s) / l;
          if (Math.hypot(x - nm.x, z - nm.z) > 85) continue;
          for (const side of [1, -1]) {
            const nx = (-dz / l) * side,
              nz = (dx / l) * side;
            const px = x + nx * (r.w / 2 + 1.5),
              pz = z + nz * (r.w / 2 + 1.5);
            if (
              rnd() < 0.8 &&
              !collision.blocked(px, pz, 1.5) &&
              !spots.some((q) => Math.hypot(q[0] - px, q[1] - pz) < 3)
            )
              spots.push([px, pz, Math.atan2(dx, dz), nx, nz]);
          }
        }
      }
    }
    // 假攤販先不擺（使用者要求清掉，之後照街景重做真的店家）：上面的選點迴圈照跑，
    // 共用亂數 rnd() 抽的次數不變，後面的路燈、樹、車位置才不會跟著動
    spots.length = 0;
    // striped canopies glow from the bulbs underneath at night
    const stripe = canvasTex(64, 8, (g) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#ffffff' : '#d8d8d8';
        g.fillRect(i * 8, 0, 8, 8);
      }
    });
    stripe.repeat.set(2, 1);
    const topMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.65,
      map: stripe,
    });
    const glowU = { value: 0 };
    topMat.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = glowU;
      sh.fragmentShader = `uniform float uGlow;\n${sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uGlow;')}`;
    };
    topMat.customProgramCacheKey = () => 'stallTop';
    const top = new THREE.InstancedMesh(stallTop, topMat, spots.length);
    world.stallGlow = glowU;
    const steel = canvasTex(64, 64, (g) => {
      g.fillStyle = '#c9ccd0';
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y++) {
        g.fillStyle = `rgba(${y % 3 ? 255 : 0},${y % 3 ? 255 : 0},${y % 3 ? 255 : 0},0.06)`;
        g.fillRect(0, y, 64, 1);
      }
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, 0, 64, 4);
    });
    const body = new THREE.InstancedMesh(
      stallBody,
      new THREE.MeshStandardMaterial({
        color: '#8d9399',
        map: steel,
        roughness: 0.38,
        metalness: 0.65,
        emissive: '#ffcf8a',
        emissiveIntensity: 0,
      }),
      spots.length
    );
    // food signboards along the canopy edge, facing the street
    const FOODS = [
      '雞排',
      '珍珠奶茶',
      '臭豆腐',
      '蚵仔煎',
      '大腸包小腸',
      '鹹酥雞',
      '烤玉米',
      '地瓜球',
      '章魚燒',
      '滷味',
      '雞蛋糕',
      '甘蔗汁',
      '炭烤香腸',
      '胡椒餅',
      '蔥抓餅',
      '綠豆沙',
    ];
    const foodAtlas = canvasTex(
      512,
      1024,
      (g) => {
        const bgs = [
          '#c8102e',
          '#ffd23f',
          '#0a7d3b',
          '#1a4fb4',
          '#ff7a00',
          '#7b1fa2',
          '#222',
          '#e91e63',
        ];
        FOODS.forEach((f, i) => {
          const y = i * 64;
          g.fillStyle = bgs[i % bgs.length];
          g.fillRect(0, y, 512, 64);
          g.fillStyle = 'rgba(255,255,255,0.2)';
          g.fillRect(0, y, 512, 4);
          g.fillStyle = bgs[i % bgs.length] === '#ffd23f' ? '#a3001b' : '#fff';
          g.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(f, 256, y + 34);
        });
      },
      false
    );
    const signG = new THREE.PlaneGeometry(2.6, 0.42);
    const signMat = new THREE.MeshStandardMaterial({
      map: foodAtlas,
      emissiveMap: foodAtlas,
      emissive: '#ffffff',
      emissiveIntensity: 0.15,
      roughness: 0.5,
    });
    signMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_INSTANCING
          float fi = floor(mod(abs(instanceMatrix[3].x * 3.7 + instanceMatrix[3].z * 1.3), 16.0));
          vMapUv = vec2(vMapUv.x, (vMapUv.y + 15.0 - fi) / 16.0);
          vEmissiveMapUv = vMapUv;
        #endif`
      );
    };
    signMat.customProgramCacheKey = () => 'foodSign';
    const signM = new THREE.InstancedMesh(signG, signMat, spots.length);
    world.foodSignMat = signMat;
    const backG = new THREE.BoxGeometry(2.9, 2.2, 0.06);
    backG.translate(0, 1.4, -1.25);
    const back = new THREE.InstancedMesh(
      backG,
      new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.9 }),
      spots.length
    );
    const lanternG = new THREE.LatheGeometry(
      [
        [0.0, -0.3],
        [0.1, -0.3],
        [0.1, -0.26],
        [0.2, -0.18],
        [0.24, 0],
        [0.2, 0.18],
        [0.1, 0.26],
        [0.1, 0.3],
        [0, 0.3],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      14
    );
    const lantern = new THREE.InstancedMesh(
      lanternG,
      new THREE.MeshStandardMaterial({
        color: '#e8261c',
        emissive: '#ff3a1a',
        emissiveIntensity: 0.4,
        roughness: 0.55,
      }),
      spots.length * 2
    );
    world.stallBodyMat = body.material;
    // warm glow on the street
    const gg = new Geo(true);
    if (spots.length) gg.disc(nm.x, nm.z, 80, 0.07, [1, 1, 1], 40);
    const glow = gg.mesh(
      new THREE.MeshBasicMaterial({
        color: '#ff9a3c',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      })
    );
    glow.renderOrder = layerOrder++;
    scene.add(glow);
    world.marketGlow = glow.isChunkedMesh ? glow.chunkMaterial : glow.material;
    const M = new THREE.Matrix4(),
      Q = new THREE.Quaternion(),
      S = new THREE.Vector3(1, 1, 1),
      P = new THREE.Vector3(),
      Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r, onx, onz], i) => {
      const y = Hmin(x, z, 1.3);
      Q.setFromAxisAngle(Y, r);
      P.set(x, y + 2.5, z);
      M.compose(P, Q, S);
      top.setMatrixAt(i, M);
      top.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      P.set(x, y + 0.5, z);
      M.compose(P, Q, S);
      body.setMatrixAt(i, M);
      // fascia sign on the street-side edge of the canopy
      const Qs = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(onx, onz));
      P.set(x + onx * 1.53, y + 2.45, z + onz * 1.53);
      M.compose(P, Qs, S);
      signM.setMatrixAt(i, M);
      // back panel faces the road: stall local -z points away from the street side
      const Qb = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(-onx, -onz));
      P.set(x, y, z);
      M.compose(P, Qb, S);
      back.setMatrixAt(i, M);
      const ox = Math.cos(r) * 1.3,
        oz = -Math.sin(r) * 1.3;
      const SL = new THREE.Vector3(0.8, 0.8, 0.8);
      P.set(x + ox, y + 2.15, z + oz);
      M.compose(P, Q, SL);
      lantern.setMatrixAt(i * 2, M);
      P.set(x - ox, y + 2.15, z - oz);
      M.compose(P, Q, SL);
      lantern.setMatrixAt(i * 2 + 1, M);
      collision.addCircle(x, z, 1.1);
    });
    top.castShadow = true;
    body.castShadow = true;
    back.castShadow = true;
    signM.castShadow = false;
    scene.add(top, body, lantern, back, signM);
    world.lanternMat = lantern.material;
  }
  onProgress(0.7);

  // ---------- street furniture (src/world/Furniture.js) ----------
  {
    const f = buildFurniture(scene, world, data, {
      Geo,
      col,
      addFlat,
      obb,
      polyArea,
      low: !!opts.low,
      rnd: mulberry32(4401),
      keep: opts.keep || [],
    });
    world.signMats = f.signMats;
  }
  // street furniture a reserved outline dropped (src/world/Furniture.js ghosts): the lamps and trees below are laid out as if
  // it still stood, in the same passes that leave the reserved outlines out, so it shifts none of their draws
  const furnGhost = (x, z, r) => world.furnGhost.blocked(x, z, r);

  // ---------- street lamps ----------
  let lampSpots = [];
  // Grade separations (tools/overrides.json 'grade') must not move the lamps or the trees laid out
  // round them: both are placed as on the OSM roads (build_map.py keeps them in r.osm) without the
  // grade walls, then the spots the grade separations take are dropped (gradeGhosts: dropped lamps).
  const osmRoads = data.roads.some((r) => r.osm) ? new SegGrid(20) : roadGrid,
    gradeGhosts = [];
  // a lamp / tree spot laid out by the old (OSM) width of a road tools/roads.json widened: the same
  // spot as far outside the new kerb as it was outside the old one (null if the road left it alone)
  // ... or moved sideways by tools/roads.json 'shift' (r.sh): out to clr past its new kerb
  const offWidened = (x, z, clr) => {
    const q = roadGrid.nearest(
      x,
      z,
      (s) => (s[5].sh || (s[5].rw && s[5].w > s[5].osm.w)) && !s[5].under
    );
    if (!q.seg) return null;
    const r = q.seg[5],
      vx = x - q.q[0],
      vz = z - q.q[1],
      d = Math.hypot(vx, vz) || 1;
    const W = r.wv ? q.seg[4] : r.w; // (r.wv: roadGrid keeps the width where it is)
    if (r.sh)
      return d < W / 2 + clr
        ? [q.q[0] + (vx / d) * (W / 2 + clr), q.q[1] + (vz / d) * (W / 2 + clr)]
        : null;
    if (q.d >= clr) return null;
    const k = Math.max(d, r.osm.w / 2 + clr) + (r.w - r.osm.w) / 2;
    return [q.q[0] + (vx / d) * k, q.q[1] + (vz / d) * k];
  };
  // ... and off 中北路's green walkway (outside its kerb, see above)
  const gwR = data.roads.find((q) => greenWalk(q)),
    gwS = gwR && greenWalk(gwR);
  const offGreen = (x, z, clr) => {
    if (!gwS) return null;
    let acc = 0,
      best = null;
    for (let i = 0; i < gwR.pts.length - 1 && acc < gwS.d; i++) {
      const a = gwR.pts[i],
        b = gwR.pts[i + 1],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz) || 1;
      const t = Math.max(
        0,
        Math.min(Math.min(l, gwS.d - acc), ((x - a[0]) * dx + (z - a[1]) * dz) / l)
      );
      const qx = a[0] + (dx * t) / l,
        qz = a[1] + (dz * t) / l,
        d = Math.hypot(x - qx, z - qz);
      if ((!best || d < best.d) && d > 0.01)
        best = { d, qx, qz, nx: (x - qx) / d, nz: (z - qz) / d };
      acc += l;
    }
    const k = gwR.w / 2 + GREEN_W + clr;
    return best && best.d > gwR.w / 2 - 0.5 && best.d < k
      ? [best.qx + best.nx * k, best.qz + best.nz * k]
      : null;
  };
  if (osmRoads !== roadGrid)
    for (const r of data.roads) {
      const o = r.osm || r;
      for (let i = 0; i < o.pts.length - 1; i++)
        osmRoads.add(o.pts[i][0], o.pts[i][1], o.pts[i + 1][0], o.pts[i + 1][1], o.w, r);
    }
  // OSM street_lamp nodes where mapped; elsewhere one every 30 m, sides
  // alternating along each road (no lamp within 15 m of an OSM one)
  {
    let spots = [];
    const osm = data.furniture.filter((f) => f.t === 'street_lamp');
    // lamp poles collide, so none may stand in any carriageway
    const laneClear = (x, z, roads = osmRoads) => {
      const q = roads.nearest(x, z, (s) => s[5].drive && !s[5].under);
      return !q.seg || q.d > 0.3;
    };
    let inLane = 0;
    collision.muted = gradeSegs;
    collision.noReserved = true; // reserved outlines drop lamps only in the filter below (as gradeGhosts)
    for (const f of osm) {
      const q = osmRoads.nearest(f.x, f.z, (s) => s[5].drive && !s[5].under);
      let x = f.x,
        z = f.z,
        rot = 0;
      if (q.seg) {
        const s = q.seg,
          l = Math.hypot(s[2] - s[0], s[3] - s[1]) || 1;
        let vx = x - q.q[0],
          vz = z - q.q[1],
          d = Math.hypot(vx, vz);
        if (d < 0.01) {
          vx = -(s[3] - s[1]) / l;
          vz = (s[2] - s[0]) / l;
          d = 1;
        }
        // lamps mapped on the carriageway move to its edge
        if (q.d < 0.3) {
          x = q.q[0] + (vx / d) * (s[4] / 2 + 0.6);
          z = q.q[1] + (vz / d) * (s[4] / 2 + 0.6);
        }
        rot = Math.atan2(-vx, -vz);
      }
      if (!laneClear(x, z)) {
        inLane++;
        continue;
      }
      if (!collision.insideAny(x, z) && !collision.blocked(x, z, 0.3) && !furnGhost(x, z, 0.3))
        spots.push([x, z, rot]);
    }
    const osmN = spots.length;
    const nearOsm = (x, z) => osm.some((f) => (f.x - x) ** 2 + (f.z - z) ** 2 < 225);
    for (const r0 of data.roads) {
      const r = r0.osm ? { ...r0, ...r0.osm, wv: undefined } : r0;
      if (!r.drive || !r.name || r.type === 'service' || r.under) continue;
      let acc = 0,
        k = hashStr(r.name) & 1;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i],
          b = r.pts[i + 1];
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          l = Math.hypot(dx, dz);
        for (let s = 30 - (acc % 30); s < l; s += 30) {
          const x = a[0] + (dx * s) / l,
            z = a[1] + (dz * s) / l;
          const nx = -dz / l,
            nz = dx / l,
            s0 = k++ % 2 ? 1 : -1;
          // the other kerb when this one is inside a junction / another road
          for (const side of [s0, -s0]) {
            const px = x + nx * side * (r.w / 2 + 0.6),
              pz = z + nz * side * (r.w / 2 + 0.6);
            if (nearOsm(px, pz) || collision.blocked(px, pz, 0.5) || furnGhost(px, pz, 0.5)) break;
            if (!laneClear(px, pz)) {
              if (side !== s0) inLane++;
              continue;
            }
            spots.push([px, pz, Math.atan2(-nx * side, -nz * side)]);
            break;
          }
        }
        acc += l;
      }
    }
    collision.muted = null;
    collision.noReserved = false;
    // the ones a grade separation takes: under a deck, on a cut's wall, in a lane moved over them
    // ... and the ones a road widened by tools/roads.json now covers move out to its new kerb
    spots = spots.map((p) => {
      const m = offWidened(p[0], p[1], 0.6);
      return m ? [m[0], m[1], p[2]] : p;
    });
    spots = spots.map((p) => {
      const m = offGreen(p[0], p[1], 0.4);
      return m ? [m[0], m[1], p[2]] : p;
    });
    spots = spots.filter(([x, z]) => {
      if (laneClear(x, z, roadGrid) && !collision.blocked(x, z, 0.3)) return true;
      gradeGhosts.push([x, z, 0.2]);
      return false;
    });
    world.lampCount = { osm: osmN, total: spots.length, inLane };
    lampSpots = spots;
    const pole = new THREE.CylinderGeometry(0.09, 0.13, 7, 8);
    pole.translate(0, 3.5, 0);
    const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6);
    arm.rotateX(Math.PI / 2 - 0.12);
    arm.translate(0, 6.95, 0.8);
    const head = new THREE.BoxGeometry(0.34, 0.12, 0.7);
    head.translate(0, 6.98, 1.55);
    const lens = new THREE.BoxGeometry(0.26, 0.03, 0.56);
    lens.translate(0, 6.905, 1.55);
    const poleMat = standard('#5d646b', { metalness: 0.6, roughness: 0.45 });
    const poleM = new THREE.InstancedMesh(pole, poleMat, spots.length);
    const armM = new THREE.InstancedMesh(arm, poleMat, spots.length);
    const headM = new THREE.InstancedMesh(
      head,
      standard('#4a4f55', { metalness: 0.5, roughness: 0.4 }),
      spots.length
    );
    const lampMat = new THREE.MeshStandardMaterial({
      color: '#d8d8d0',
      emissive: '#ffd9a0',
      emissiveIntensity: 0,
    });
    const lensM = new THREE.InstancedMesh(lens, lampMat, spots.length);
    const M = new THREE.Matrix4(),
      Q = new THREE.Quaternion(),
      S = new THREE.Vector3(1, 1, 1),
      P = new THREE.Vector3(),
      Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r], i) => {
      Q.setFromAxisAngle(Y, r);
      P.set(x, groundY(x, z) - 0.1, z);
      M.compose(P, Q, S);
      poleM.setMatrixAt(i, M);
      armM.setMatrixAt(i, M);
      headM.setMatrixAt(i, M);
      lensM.setMatrixAt(i, M);
      collision.addCircle(x, z, 0.2);
    });
    // thin poles: shadows only on high quality
    poleM.castShadow = !opts.low;
    armM.castShadow = !opts.low;
    headM.castShadow = !opts.low;
    scene.add(poleM, armM, headM, lensM);
    world.lampMat = lampMat;
    // light pools on the ground (cheap fake lighting at night)
    const pool = new THREE.CircleGeometry(5, 24);
    pool.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({
      color: '#ffcf8a',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const poolM = new THREE.InstancedMesh(pool, poolMat, spots.length);
    const N = new THREE.Vector3();
    spots.forEach(([x, z, r], i) => {
      // tilt each pool to the local slope
      const px = x + Math.sin(r) * 1.5,
        pz = z + Math.cos(r) * 1.5;
      N.set(
        groundY(px - 2, pz) - groundY(px + 2, pz),
        4,
        groundY(px, pz - 2) - groundY(px, pz + 2)
      ).normalize();
      Q.setFromUnitVectors(Y, N);
      P.set(px, groundY(px, pz) + 0.08, pz);
      M.compose(P, Q, S);
      poolM.setMatrixAt(i, M);
    });
    poolM.renderOrder = layerOrder++;
    world.poolMesh = poolM;
    scene.add(world.poolMesh);
    world.poolMat = poolMat;
    // soft volumetric light cones under each lamp head
    const cone = new THREE.CylinderGeometry(0.25, 2.6, 6.8, 20, 1, true);
    cone.translate(0, 3.45, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      map: coneTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: true,
    });
    const coneM = new THREE.InstancedMesh(cone, coneMat, spots.length);
    spots.forEach(([x, z, r], i) => {
      const px = x + Math.sin(r) * 1.55,
        pz = z + Math.cos(r) * 1.55;
      M.makeTranslation(px, groundY(x, z) - 0.1, pz);
      coneM.setMatrixAt(i, M);
    });
    coneM.renderOrder = 5;
    world.coneMesh = coneM;
    scene.add(world.coneMesh);
    world.coneMat = coneMat;
  }

  // ---------- night lights: a small pool of real point lights that follow the nearest street lamps ----------
  {
    const n = quality === 'high' ? 8 : quality === 'medium' ? 4 : 0;
    const lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight('#ffcf94', 0, 24, 2);
      l.position.set(0, -100, 0);
      scene.add(l);
      lights.push(l);
    }
    const heads = lampSpots.map(([x, z, r]) => ({
      x: x + Math.sin(r) * 1.55,
      z: z + Math.cos(r) * 1.55,
      y: groundY(x, z) + 6.5,
    }));
    let tick = 0,
      enabled = quality !== 'low';
    world.lampLights = {
      update(dt, night, p) {
        if (!lights.length) return;
        tick -= dt;
        if (tick <= 0 && p) {
          tick = 0.3;
          const near = heads
            .map((h) => [h, (h.x - p.x) ** 2 + (h.z - p.z) ** 2])
            .sort((a, b) => a[1] - b[1])
            .slice(0, lights.length);
          near.forEach(([h], i) => lights[i].position.set(h.x, h.y, h.z));
        }
        for (const l of lights) l.intensity = enabled ? night * 32 : 0;
      },
      setEnabled(on) {
        enabled = on;
      },
    };
  }

  // ---------- trees ----------
  // species modelled on the campus (src/world/Vegetation.js): rain trees / banyans, round street trees,
  // black pines, 大王椰子 palms and clipped shrubs; placement and colliders as before
  {
    const spots = [],
      palms = [],
      shrubs = [];
    // the 大草坪 stays open like the real lawn (a ring of rain trees is added round its edge below)
    const lawns = data.areas.filter((a) => a.name === '中原大學大草坪').map((a) => a.pts);
    const greenAt = (x, z) => greenPolys.some((p) => inArea(x, z, p));
    // noPlant discs count as blocked for spots and species, as the old fountain collider was
    const nearNoPlant = (x, z, r) =>
      noPlant.some(([px, pz, pr]) => (px - x) ** 2 + (pz - z) ** 2 < (pr + r) ** 2);
    // species from the visual-only stream, so layout and colliders don't depend on it
    // ghosts (trees / lamps a reserved outline dropped after their draws) count like the colliders they stand for, so a
    // reserved outline changes no species beyond the trees it drops (ghosts is declared below, before the first call)
    const nearGhost = (x, z, r) =>
      ghosts.some(([gx, gz, gr]) => (gx - x) ** 2 + (gz - z) ** 2 < (gr + r) ** 2) ||
      furnGhost(x, z, r);
    const pickKind = (x, z, s) => {
      const r = rnd2(),
        campus = world.inCampus(x, z);
      let kind =
        campus || greenAt(x, z)
          ? r < 0.3
            ? 'rain'
            : r < 0.66
              ? 'round'
              : r < 0.84
                ? 'pine'
                : 'palm'
          : r < 0.18
            ? 'palm'
            : 'round';
      if (
        kind === 'rain' &&
        (collision.blocked(x, z, 5.5) || nearNoPlant(x, z, 5.5) || nearGhost(x, z, 5.5))
      )
        kind = 'round';
      if (
        kind === 'round' &&
        (collision.blocked(x, z, 3.2) || nearNoPlant(x, z, 3.2) || nearGhost(x, z, 3.2))
      )
        kind = r < 0.5 ? 'palm' : 'pine';
      const sc =
        kind === 'rain'
          ? 0.6 + (s - 0.8) * 0.45
          : kind === 'round'
            ? 0.72 + (s - 0.8) * 0.5
            : kind === 'pine'
              ? 0.72 + (s - 0.8) * 0.35
              : 0.85 + (s - 0.8) * 0.3;
      return [kind, sc];
    };
    // low quality: fewer shrubs (they are the bulk of the new vegetation triangles)
    const SH1 = opts.low ? 500 : 1600,
      SH2 = opts.low ? 700 : 2200;
    const okSpot = (x, z, r, roads = roadGrid) => {
      if (x < B.minX + 3 || x > B.maxX - 3 || z < B.minZ + 3 || z > B.maxZ - 3) return false;
      if (roads.nearest(x, z).d < 1.0) return false;
      if (collision.blocked(x, z, r)) return false;
      if (nearNoPlant(x, z, r)) return false;
      if (world.soft && world.soft.near(x, z, r)) return false;
      if (waterPolys.some((p) => inArea(x, z, p))) return false;
      if (sportPolys.some((p) => pointInPoly(x, z, p))) return false;
      if (lawns.some((p) => pointInPoly(x, z, p))) return false;
      if (parkingPolys.some((p) => inArea(x, z, p))) return false;
      // keep 4 m clear around the custom-built buildings (entrances, guardhouses)
      if (!collision.noReserved)
        for (let k = 0; k < 8; k++) {
          const qx = x + Math.cos(k * 0.785) * 4,
            qz = z + Math.sin(k * 0.785) * 4;
          if (collision.reserved.some((p) => pointInPoly(qx, qz, p))) return false;
        }
      return true;
    };
    // Grade separations must not change the shared random streams (see street lamps): every
    // spot is first tested as on the map without them (OSM roads, their walls muted, the lamps
    // and trees they take kept as ghosts) and drawn as there; only then are those spots dropped.
    const ghosts = [...gradeGhosts];
    // 補建 houses cut back behind a wider road (tools/roads.json) still block as they stood
    const cutHouses = data.buildings
      .filter((b) => b.pre)
      .map((b) => ({
        P: b.pre,
        box: [
          Math.min(...b.pre.map((p) => p[0])),
          Math.min(...b.pre.map((p) => p[1])),
          Math.max(...b.pre.map((p) => p[0])),
          Math.max(...b.pre.map((p) => p[1])),
        ],
      }));
    const inCutHouse = (x, z, r) =>
      cutHouses.some(
        ({ P, box }) =>
          x > box[0] - r &&
          x < box[2] + r &&
          z > box[1] - r &&
          z < box[3] + r &&
          (pointInPoly(x, z, P) ||
            P.some((p, i) => {
              const q = P[(i + 1) % P.length],
                c = closestOnSeg(x, z, p[0], p[1], q[0], q[1]);
              return Math.hypot(c[0] - x, c[1] - z) < r;
            }))
      );
    // The reserved outlines (custom-built parts, src/core/Game.js) are left out of this first test as well: they keep trees
    // and shrubs off only in the final okSpot (a tree dropped there stays as a ghost of the same size), so adding or
    // changing a reserved outline no longer re-deals every tree and shrub after it in the shared rnd sequence.
    const okOsm = (x, z, r) => {
      if (
        ghosts.some(([gx, gz, gr]) => (gx - x) ** 2 + (gz - z) ** 2 < (gr + r) ** 2) ||
        furnGhost(x, z, r)
      )
        return false;
      if (cutHouses.length && inCutHouse(x, z, r)) return false;
      collision.muted = gradeSegs;
      collision.noReserved = true;
      const ok = okSpot(x, z, r, osmRoads);
      collision.muted = null;
      collision.noReserved = false;
      return ok;
    };
    const tryTree = (x, z, s, palm = false) => {
      if (!okOsm(x, z, palm ? 1.2 : 2.2)) return;
      const k = palm ? null : pickKind(x, z, s);
      if (!okSpot(x, z, palm ? 1.2 : 2.2)) {
        ghosts.push([x, z, palm ? 0.3 : 0.35]);
        return;
      }
      if (palm) palms.push([x, z, s]);
      else spots.push([x, z, ...k]);
      collision.addCircle(x, z, palm ? 0.3 : 0.35);
    };
    const polyBox = (pts) => {
      let a = 1e9,
        b = 1e9,
        c = -1e9,
        d = -1e9;
      for (const [x, z] of pts) {
        a = Math.min(a, x);
        b = Math.min(b, z);
        c = Math.max(c, x);
        d = Math.max(d, z);
      }
      return [a, b, c, d];
    };
    // campus footways first: regular rows every 8 m on both sides, some rows palms
    data.roads.forEach((r0, ri) => {
      const r = r0.osm ? { ...r0, ...r0.osm, wv: undefined } : r0;
      if (r.type !== 'footway' || !world.inCampus(r.pts[0][0], r.pts[0][1])) return;
      const palm = hashStr(`palm${ri}`) % 100 < 28;
      let acc = -2; // first tree 2 m in, then a steady 8 m pitch across bends
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i],
          b = r.pts[i + 1];
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          l = Math.hypot(dx, dz);
        if (l < 0.5) continue;
        const nx = -dz / l,
          nz = dx / l;
        for (let s = acc < 0 ? -acc : (8 - (acc % 8)) % 8; s < l - 1; s += 8) {
          const x = a[0] + (dx * s) / l,
            z = a[1] + (dz * s) / l;
          for (const side of [-1, 1])
            tryTree(
              x + nx * side * (r.w / 2 + 1.5),
              z + nz * side * (r.w / 2 + 1.5),
              palm ? 0.9 + rnd() * 0.25 : 0.85 + rnd() * 0.3,
              palm
            );
        }
        acc += l;
      }
    });
    for (const p of greenPolys) {
      const [x0, z0, x1, z1] = polyBox(p);
      const n = Math.min(400, Math.floor(((x1 - x0) * (z1 - z0)) / 140));
      for (let i = 0; i < n; i++) {
        const x = x0 + rnd() * (x1 - x0),
          z = z0 + rnd() * (z1 - z0);
        if (inArea(x, z, p)) tryTree(x, z, 0.8 + rnd() * 0.7, rnd() < 0.08);
      }
    }
    for (const ring of data.campus) {
      const [x0, z0, x1, z1] = polyBox(ring);
      for (let i = 0; i < 1100; i++) {
        const x = x0 + rnd() * (x1 - x0),
          z = z0 + rnd() * (z1 - z0);
        if (pointInPoly(x, z, ring)) tryTree(x, z, 0.8 + rnd() * 0.8);
      }
    }
    // roadside trees on the bigger roads (on the sidewalk)
    for (const r0 of data.roads) {
      const r = r0.osm ? { ...r0, ...r0.osm, wv: undefined } : r0;
      if (!(r.type === 'tertiary' || r.type === 'secondary')) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i],
          b = r.pts[i + 1];
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          l = Math.hypot(dx, dz);
        for (let s = 4; s < l; s += 11) {
          const x = a[0] + (dx * s) / l,
            z = a[1] + (dz * s) / l;
          const nx = -dz / l,
            nz = dx / l;
          for (const side of [-1, 1])
            if (rnd() < 0.6)
              tryTree(
                x + nx * side * (r.w / 2 + 2.2),
                z + nz * side * (r.w / 2 + 2.2),
                0.8 + rnd() * 0.5
              );
        }
      }
    }
    // 補建街區 woods (dense) and lawns (a few trees), own stream; low quality: half
    {
      const fr = mulberry32(7007),
        k = opts.low ? 2 : 1;
      // laid out on the ring before tools/roads.json cut it (lay), so the stream runs as before;
      // the trees the wider road took are moved / hidden with the others (moveTree)
      for (const { ring: ring0, lay, dense } of fillGreens) {
        const ring = lay || ring0;
        const [x0, z0, x1, z1] = polyBox(ring);
        const n = Math.min(
          dense ? 700 : 120,
          Math.floor(polyArea(ring) / ((dense ? 90 : 360) * k))
        );
        for (let i = 0, t = 0; i < n && t < n * 4; t++) {
          const x = x0 + fr() * (x1 - x0),
            z = z0 + fr() * (z1 - z0);
          if (!inArea(x, z, ring)) continue;
          i++;
          tryTree(x, z, dense ? 0.85 + fr() * 0.75 : 0.8 + fr() * 0.6);
        }
      }
      world.fillGreens = fillGreens.length;
    }
    // shrubs along campus building walls and inside parks (no collision); nShrub counts them as on the OSM map
    let nShrub = 0;
    const addShrub = (x, z, r, s) => {
      nShrub++;
      if (okSpot(x, z, r)) shrubs.push([x, z, s]);
    };
    for (const bd of data.buildings) {
      // 補建校舍不種牆邊灌木：不吃共用 rnd()／SH1 名額，補建開關不影響其他灌木位置
      if (
        !(bd.kind === 'campus' || bd.kind === 'dorm' || bd.kind === 'church') ||
        bd.skip ||
        bd.synthetic
      )
        continue;
      const pts = bd.pts;
      for (let i = 0; i < pts.length && nShrub < SH1; i++) {
        const a = pts[i],
          c = pts[(i + 1) % pts.length],
          dx = c[0] - a[0],
          dz = c[1] - a[1],
          l = Math.hypot(dx, dz);
        if (l < 3) continue;
        const nx = dz / l,
          nz = -dx / l;
        for (let s = 1.5; s < l - 1; s += 2.6) {
          if (rnd() < 0.45) continue;
          const x = a[0] + (dx * s) / l + nx * 1.4,
            z = a[1] + (dz * s) / l + nz * 1.4;
          if (okOsm(x, z, 0.6)) addShrub(x, z, 0.6, 0.8 + rnd() * 0.6);
        }
      }
    }
    for (const p of greenPolys) {
      const [x0, z0, x1, z1] = polyBox(p);
      const n = Math.min(120, Math.floor(((x1 - x0) * (z1 - z0)) / 400));
      for (let i = 0; i < n && nShrub < SH2; i++) {
        const x = x0 + rnd() * (x1 - x0),
          z = z0 + rnd() * (z1 - z0);
        if (inArea(x, z, p) && okOsm(x, z, 0.8)) addShrub(x, z, 0.8, 0.9 + rnd() * 0.8);
      }
    }
    // a ring of big rain trees round the edge of the 大草坪, like the real lawn
    for (const pts of lawns) {
      const cx = pts.reduce((q, p) => q + p[0], 0) / pts.length,
        cz = pts.reduce((q, p) => q + p[1], 0) / pts.length;
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i],
          p1 = pts[(i + 1) % pts.length],
          l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        for (let t = 6; t < l - 4; t += 15) {
          const x0 = p0[0] + ((p1[0] - p0[0]) * t) / l,
            z0 = p0[1] + ((p1[1] - p0[1]) * t) / l;
          const d = Math.hypot(cx - x0, cz - z0) || 1,
            x = x0 + ((cx - x0) / d) * 5,
            z = z0 + ((cz - z0) / d) * 5;
          // reserved outlines only drop the tree after its draw (see okOsm), so they never shift rnd2
          collision.noReserved = true;
          const hit = collision.blocked(x, z, 4) || furnGhost(x, z, 4);
          collision.noReserved = false;
          if (!pointInPoly(x, z, pts) || roadGrid.nearest(x, z).d < 1.5 || hit) continue;
          const sc = 0.75 + rnd2() * 0.25;
          if (collision.blocked(x, z, 4)) continue;
          spots.push([x, z, 'rain', sc]);
          collision.addCircle(x, z, 0.35);
        }
      }
    }
    // hand-placed feature trees (e.g. the big banyans & palms in front of 資管系館), still collision-checked
    for (const t of opts.featureTrees || []) {
      if (roadGrid.nearest(t.x, t.z).d < 1.0 || collision.blocked(t.x, t.z, 1.2)) continue;
      spots.push([t.x, t.z, t.kind, t.s]);
      collision.addCircle(t.x, t.z, 0.35);
    }
    // height levels: nothing grows on stairs, narrow ramps or astride a retaining
    // wall. Placement above ran unchanged (same random draws); the hidden plants keep
    // their slot in plantVegetation (same looks for the rest) and trees lose their collider
    const onLevelEdge = (x, z, r) => {
      if (!lvPads.length && !lvStairs.length) return false;
      if (lvStairs.some(({ L }) => (L.n > 0 || L.hw < 2) && levelY(L, x, z) > -Infinity))
        return true;
      const g = groundY(x, z);
      for (let a = 0; a < 8; a++)
        if (
          Math.abs(groundY(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r) - g) > STEP_UP
        )
          return true;
      return false;
    };
    // ... and nothing grows in sunk water or on its banks (sinkPlan; placement unchanged the same way)
    // ... and nothing grows in a pit (src/world/Terrain.js addPit: 學活南面下沉舞台, placement unchanged the same way),
    // except one that keeps its vegetation (addPit veg: src/world/zones/ZoneA.js 圖書館東側下沉庭院 is a grove)
    // ... and nothing grows on a flat pad an area builds on (opts.treeHide outlines, src/world/zones/ZoneA.js 圖書館南面平台; placement unchanged the same way)
    const treeHide = opts.treeHide || [],
      onPad = (x, z) => treeHide.some((p) => pointInPoly(x, z, p));
    const hideTree = (x, z) => {
      if (
        !onLevelEdge(x, z, 0.8) &&
        !sink.inside(x, z, 0.8) &&
        pitAt(x, z, 0.8, true) === null &&
        !onPad(x, z)
      )
        return false;
      collision.removeCircleAt(x, z);
      return true;
    };
    // ... and trees a road widened by tools/roads.json now covers move out past its new kerb (same
    // order, same draws); one that would land in a building, another road or water is hidden
    const moveTree = (p, cr) => {
      let m = offWidened(p[0], p[1], 1.0);
      const g = offGreen(m ? m[0] : p[0], m ? m[1] : p[1], 0.8);
      if (g) m = g;
      if (!m) return false;
      collision.removeCircleAt(p[0], p[1]);
      if (
        roadGrid.nearest(m[0], m[1]).d < 1.0 ||
        collision.blocked(m[0], m[1], 0.8) ||
        sink.inside(m[0], m[1], 0.8)
      )
        return true;
      p[0] = m[0];
      p[1] = m[1];
      collision.addCircle(m[0], m[1], cr);
      return false;
    };
    const veg = [];
    for (const p of spots) {
      const gone = moveTree(p, 0.35),
        [x, z, kind, s] = p;
      veg.push({ x, z, y: groundY(x, z) - 0.15, kind, s, hide: gone || hideTree(x, z) });
    }
    for (const p of palms) {
      const gone = moveTree(p, 0.3),
        [x, z, s] = p;
      veg.push({
        x,
        z,
        y: groundY(x, z) - 0.15,
        kind: 'palm',
        s: 0.85 + (s - 0.8) * 0.3,
        hide: gone || hideTree(x, z),
      });
    }
    // opts.vegHide: outlines of custom-built parts added after the placement (src/world/buildings/Dorms.js stair tower, entrance steps):
    // shrubs there are only hidden, so the placement and its shared rnd draws stay as they were
    const vegHide = opts.vegHide || [],
      hidden = (x, z) => vegHide.some((p) => pointInPoly(x, z, p));
    for (const [x, z, s] of shrubs)
      veg.push({
        x,
        z,
        y: groundY(x, z) - 0.1,
        kind: 'shrub',
        s,
        hide:
          onLevelEdge(x, z, 0.6) ||
          sink.inside(x, z, 0.6) ||
          hidden(x, z) ||
          onPad(x, z) ||
          pitAt(x, z, 0.6, true) !== null,
      });
    world.vegetation = plantVegetation(scene, veg, quality);
    world.treeCount = spots.length + palms.length;
    world.shrubCount = shrubs.length;
  }
  for (const f of lateColliders) f();
  onProgress(0.85);

  // ---------- height levels: pads, stairs, retaining walls (src/world/Terrain.js) ----------
  // Drawn after the trees and furniture, and their collision added last, so
  // nothing placed earlier (or its random draws) changes. Every outer edge is
  // sampled: where the ground beyond it (terrain or another level) is more than
  // STEP_UP lower, a wall is drawn and a 2D segment seals it; stairs and ramps
  // are open where they meet the level above, so they are the only way up.
  if (lvPads.length || lvStairs.length) {
    const shadows = quality !== 'low';
    const gTop = new Geo(false, uvS(4)),
      gGrass = new Geo(false, uvS(6)),
      gBrick = new Geo(),
      gConc = new Geo(),
      gRail = new Geo(),
      gHedge = new Geo();
    const WALL = {
      brick: ['#8a4a3a', gBrick],
      granite: ['#d2d0c9', gConc],
      concrete: ['#c4c1b9', gConc],
    };
    const TREAD = col('#c9c6bf'),
      RISER = col('#b3b0a8'),
      CAP = col('#d9d6cf'),
      HEDGE = col('#4d7a3a'),
      HTOP = col('#5f8f45');
    const seal = [];
    let sealed = 0;
    // ground beside a level: terrain or any other level
    const below = (L, x, z) => Math.max(H(x, z), levelTop(x, z, L));
    // one straight edge A->B of level L, outward normal (nx,nz); top(t) = drawn
    // top, walk(t) = walking height just inside. Returns the per-interval drop.
    const edge = (L, A, B, nx, nz, top, walk, wall, m) => {
      const dx = B[0] - A[0],
        dz = B[1] - A[1],
        len = Math.hypot(dx, dz);
      m = m || Math.max(1, Math.ceil(len / 0.5));
      const P = [],
        drop = [];
      for (let k = 0; k <= m; k++) {
        const x = A[0] + (dx * k) / m,
          z = A[1] + (dz * k) / m,
          qx = x + nx * 0.3,
          qz = z + nz * 0.3,
          g = below(L, qx, qz);
        P.push({ x, z, g, terr: H(qx, qz) >= g - 1e-6, w: walk(k / m) });
      }
      const [wc, geo] = WALL[wall] || WALL.concrete,
        c = col(wc);
      let run = null;
      for (let k = 0; k < m; k++) {
        const p = P[k],
          q = P[k + 1],
          y = top((k + 0.5) / m),
          d = y - Math.min(p.g, q.g);
        drop.push(d);
        if (d > 0.05) {
          const y0 = Math.min(p.g, q.g) - 0.3,
            u0 = (len * k) / m / 4,
            u1 = (len * (k + 1)) / m / 4;
          geo.quad(
            [p.x, y0, p.z],
            [q.x, y0, q.z],
            [q.x, y, q.z],
            [p.x, y, p.z],
            c,
            [nx, 0, nz],
            [
              [u0, y0 / 4],
              [u1, y0 / 4],
              [u1, y / 4],
              [u0, y / 4],
            ]
          );
        }
        // seal a drop (or a rise onto plain terrain) above a step's height
        const dn = Math.max(p.w - p.g, q.w - q.g),
          up = Math.max(p.terr ? p.g - p.w : 0, q.terr ? q.g - q.w : 0);
        if (dn > STEP_UP || up > STEP_UP) {
          if (!run) run = [p.x, p.z];
          run[2] = q.x;
          run[3] = q.z;
        } else if (run) {
          seal.push(run);
          run = null;
        }
      }
      if (run) seal.push(run);
      return drop;
    };
    // thin square bar between two 3D points (rails, posts)
    const bar = (a, b, r, c) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        l = Math.hypot(...d) || 1;
      const u = Math.abs(d[1]) / l > 0.9 ? [1, 0, 0] : [0, 1, 0];
      let s1 = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
      const n1 = Math.hypot(...s1);
      s1 = s1.map((v) => (v / n1) * r);
      let s2 = [
        d[1] * s1[2] - d[2] * s1[1],
        d[2] * s1[0] - d[0] * s1[2],
        d[0] * s1[1] - d[1] * s1[0],
      ];
      const n2 = Math.hypot(...s2);
      s2 = s2.map((v) => (v / n2) * r);
      const C = (p, i, j) => [
        p[0] + s1[0] * i + s2[0] * j,
        p[1] + s1[1] * i + s2[1] * j,
        p[2] + s1[2] * i + s2[2] * j,
      ];
      for (const [i0, j0, i1, j1] of [
        [1, 1, 1, -1],
        [1, -1, -1, -1],
        [-1, -1, -1, 1],
        [-1, 1, 1, 1],
      ]) {
        const nn = [
          s1[0] * (i0 + i1) + s2[0] * (j0 + j1),
          s1[1] * (i0 + i1) + s2[1] * (j0 + j1),
          s1[2] * (i0 + i1) + s2[2] * (j0 + j1),
        ];
        gRail.quad(C(a, i0, j0), C(b, i0, j0), C(b, i1, j1), C(a, i1, j1), c, nn);
      }
    };
    // railing along a run: posts every ~1.6 m, a top and a middle rail
    const railing = (pts, c, h = 1.0) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i],
          b = pts[i + 1];
        bar([a[0], a[1] + h, a[2]], [b[0], b[1] + h, b[2]], 0.025, c);
        bar([a[0], a[1] + h * 0.55, a[2]], [b[0], b[1] + h * 0.55, b[2]], 0.018, c);
      }
      let acc = 0;
      for (let i = 0; i < pts.length; i++) {
        if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
        if (i === 0 || i === pts.length - 1 || acc >= 1.6) {
          acc = 0;
          const p = pts[i];
          bar([p[0], p[1], p[2]], [p[0], p[1] + h, p[2]], 0.03, c);
        }
      }
    };
    // runs of consecutive intervals whose drop passes a threshold
    const runsOf = (drop, min) => {
      const out = [];
      let r = null;
      drop.forEach((d, k) => {
        if (d > min) {
          if (!r) out.push((r = [k, k + 1]));
          else r[1] = k + 1;
        } else r = null;
      });
      return out;
    };

    for (const { d, L } of lvPads) {
      const pts = L.pts,
        n = pts.length;
      let area = 0;
      for (let i = 0; i < n; i++) {
        const a = pts[i],
          b = pts[(i + 1) % n];
        area += a[0] * b[1] - b[0] * a[1];
      }
      const sgn = area > 0 ? 1 : -1; // outward normal of edge a->b is sgn * (dz, -dx)
      if (d.top === 'grass') {
        gGrass.flatPoly(pts, L.y, col('#ffffff'));
        // clipped shrubs filling the planter
        let cx = 0,
          cz = 0;
        for (const p of pts) {
          cx += p[0];
          cz += p[1];
        }
        cx /= n;
        cz /= n;
        const inner = pts.map((p) => {
          const vx = cx - p[0],
            vz = cz - p[1],
            l = Math.hypot(vx, vz) || 1;
          return [p[0] + (vx / l) * 0.5, p[1] + (vz / l) * 0.5];
        });
        gHedge.flatPoly(inner, L.y + 0.55, HTOP);
        for (let i = 0; i < n; i++) {
          const a = inner[i],
            b = inner[(i + 1) % n],
            ex = b[0] - a[0],
            ez = b[1] - a[1],
            l = Math.hypot(ex, ez) || 1;
          gHedge.quad(
            [a[0], L.y, a[1]],
            [b[0], L.y, b[1]],
            [b[0], L.y + 0.55, b[1]],
            [a[0], L.y + 0.55, a[1]],
            HEDGE,
            [(sgn * ez) / l, 0, (-sgn * ex) / l]
          );
        }
      } else gTop.flatPoly(pts, L.y, col(d.top || '#e6e2da'));
      for (let i = 0; i < n; i++) {
        // d.open: edges (pts[i] -> pts[i+1]) that meet a bridge deck at the same height (decks are not levels,
        // so below() would see the ground under it): no wall, no seal there (src/world/zones/ZoneG.js 學活前庭、二樓門廊)
        if (d.open && d.open.includes(i)) continue;
        const A = pts[i],
          Bp = pts[(i + 1) % n],
          ex = Bp[0] - A[0],
          ez = Bp[1] - A[1],
          l = Math.hypot(ex, ez) || 1;
        const nx = (sgn * ez) / l,
          nz = (-sgn * ex) / l;
        const drop = edge(
          L,
          A,
          Bp,
          nx,
          nz,
          () => L.y + 0.06,
          () => L.y,
          d.wall
        );
        const m = drop.length,
          at = (k) => [A[0] + (ex * k) / m, A[1] + (ez * k) / m];
        // coping along the drawn wall
        for (const [k0, k1] of runsOf(drop, 0.05)) {
          const p = at(k0),
            q = at(k1),
            ix = -nx * 0.3,
            iz = -nz * 0.3;
          gConc.quad(
            [p[0], L.y + 0.06, p[1]],
            [q[0], L.y + 0.06, q[1]],
            [q[0] + ix, L.y + 0.06, q[1] + iz],
            [p[0] + ix, L.y + 0.06, p[1] + iz],
            CAP,
            UP
          );
          gConc.quad(
            [p[0] + ix, L.y, p[1] + iz],
            [q[0] + ix, L.y, q[1] + iz],
            [q[0] + ix, L.y + 0.06, q[1] + iz],
            [p[0] + ix, L.y + 0.06, p[1] + iz],
            CAP,
            [-nx, 0, -nz]
          );
        }
        if (d.edge === 'hedge')
          for (const [k0, k1] of runsOf(drop, 0.6)) {
            const p = at(k0),
              q = at(k1),
              mx = (p[0] + q[0]) / 2 - nx * 0.65,
              mz = (p[1] + q[1]) / 2 - nz * 0.65;
            gHedge.box(
              mx,
              mz,
              Math.atan2(ez, ex),
              Math.hypot(q[0] - p[0], q[1] - p[1]),
              0.6,
              L.y,
              L.y + 0.6,
              HEDGE
            );
          }
        if (d.edge === 'railing')
          for (const [k0, k1] of runsOf(drop, 0.45)) {
            const p = at(k0),
              q = at(k1),
              ix = -nx * 0.15,
              iz = -nz * 0.15;
            railing(
              [
                [p[0] + ix, L.y + 0.06, p[1] + iz],
                [q[0] + ix, L.y + 0.06, q[1] + iz],
              ],
              col(d.railColour || '#8e9399')
            );
          }
      }
    }

    for (const { d, L } of lvStairs) {
      const { ux, uz, len, hw, y0, y1, n } = L,
        rise = y1 - y0;
      // local (s along, e across) -> world
      const XZ = (s, e) => [L.ax + ux * s + uz * e, L.az + uz * s - ux * e];
      const P = (s, e, y) => {
        const q = XZ(s, e);
        return [q[0], y, q[1]];
      };
      const treadY = (s) =>
        n > 0
          ? y0 + (rise * Math.min(n, Math.floor((s / len) * n + 1e-6) + 1)) / n
          : y0 + (rise * s) / len;
      const walk = (s) => levelY(L, ...XZ(Math.min(len - 1e-3, Math.max(1e-3, s)), 0));
      const gb = Math.min(below(L, ...XZ(-0.3, hw)), below(L, ...XZ(-0.3, -hw)));
      if (n > 0) {
        for (let i = 0; i < n; i++) {
          const s0 = (len * i) / n,
            s1 = (len * (i + 1)) / n,
            ty = y0 + (rise * (i + 1)) / n,
            by = i ? y0 + (rise * i) / n : Math.min(gb, y0) - 0.3;
          gConc.quad(P(s0, -hw, ty), P(s1, -hw, ty), P(s1, hw, ty), P(s0, hw, ty), TREAD, UP, [
            [s0 / 2, -hw / 2],
            [s1 / 2, -hw / 2],
            [s1 / 2, hw / 2],
            [s0 / 2, hw / 2],
          ]);
          gConc.quad(
            P(s0, -hw, by),
            P(s0, hw, by),
            P(s0, hw, ty),
            P(s0, -hw, ty),
            RISER,
            [-ux, 0, -uz],
            [
              [-hw / 2, by / 2],
              [hw / 2, by / 2],
              [hw / 2, ty / 2],
              [-hw / 2, ty / 2],
            ]
          );
        }
      } else {
        // a ramp; with 'top' it is a sloping paved terrace (pad paving) instead of concrete
        const [g, c, k] = d.top ? [gTop, col(d.top), 4] : [gConc, TREAD, 2];
        g.quad(
          P(0, -hw, y0),
          P(len, -hw, y1),
          P(len, hw, y1),
          P(0, hw, y0),
          c,
          [0, 1, 0],
          [
            [0, -hw / k],
            [len / k, -hw / k],
            [len / k, hw / k],
            [0, hw / k],
          ]
        );
        if (y0 > gb + 0.05)
          gConc.quad(P(0, -hw, gb - 0.3), P(0, hw, gb - 0.3), P(0, hw, y0), P(0, -hw, y0), RISER, [
            -ux,
            0,
            -uz,
          ]);
      }
      // sides (sampled per half tread so the drawn top follows the steps) and the bottom end
      const per = n > 0 ? Math.max(1, Math.ceil(len / n / 0.5)) : 0,
        mSide = n > 0 ? n * per : 0;
      const sideDrop = {};
      for (const e of [hw, -hw]) {
        const sg = Math.sign(e);
        sideDrop[sg] = edge(
          L,
          XZ(0, e),
          XZ(len, e),
          uz * sg,
          -ux * sg,
          (t) => treadY(t * len) + 0.05,
          (t) => walk(t * len),
          d.wall || 'granite',
          mSide || undefined
        );
      }
      edge(
        L,
        XZ(0, -hw),
        XZ(0, hw),
        -ux,
        -uz,
        () => y0,
        () => walk(0),
        d.wall || 'granite'
      );
      edge(
        L,
        XZ(len, -hw),
        XZ(len, hw),
        ux,
        uz,
        () => y1,
        () => walk(len),
        d.wall || 'granite'
      );
      // rails follow the walking slope
      const rc = col(d.railColour || '#a9adb2'),
        lineAt = (e, s0, s1) => {
          const k = Math.max(2, Math.ceil((s1 - s0) / 1.6)),
            pts = [];
          for (let i = 0; i <= k; i++) {
            const s = s0 + ((s1 - s0) * i) / k;
            pts.push(P(s, e, y0 + (rise * s) / len + (n > 0 ? rise / n / 2 : 0)));
          }
          return pts;
        };
      if (d.rail === 'center') railing(lineAt(0, 0.3, len - 0.3), rc, 0.9);
      if (d.rail === 'sides')
        for (const e of [hw - 0.12, -(hw - 0.12)]) railing(lineAt(e, 0.2, len - 0.2), rc, 0.9);
      else if (d.edge === 'hedge')
        for (const sg of [1, -1])
          for (const [k0, k1] of runsOf(sideDrop[sg], 0.6)) {
            // clipped hedge on top of the wall (as on a pad), in ~2 m blocks following the slope
            const m = sideDrop[sg].length,
              s0 = (len * k0) / m,
              s1 = (len * k1) / m,
              nb = Math.max(1, Math.round((s1 - s0) / 2));
            for (let i = 0; i < nb; i++) {
              const sa = s0 + ((s1 - s0) * i) / nb,
                sb = s0 + ((s1 - s0) * (i + 1)) / nb,
                q = XZ((sa + sb) / 2, sg * (hw - 0.65)),
                y = walk((sa + sb) / 2);
              gHedge.box(q[0], q[1], Math.atan2(uz, ux), sb - sa, 0.6, y - 0.05, y + 0.6, HEDGE);
            }
          }
      else if (d.rail !== 'none')
        for (const sg of [1, -1])
          for (const [k0, k1] of runsOf(sideDrop[sg], 0.45)) {
            // guard rail where a stair side stands well above the ground ('none': the parapets are drawn elsewhere)
            const m = sideDrop[sg].length;
            railing(lineAt(sg * (hw - 0.12), (len * k0) / m, (len * k1) / m), rc, 0.9);
          }
    }

    const tex = T.paving(),
      conc = concreteTex(),
      grass = T.grass();
    const solid = (t, o = {}) =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        map: t.map || null,
        normalMap: t.normalMap || null,
        roughness: o.roughness ?? 0.9,
        metalness: o.metalness ?? 0,
        envMapIntensity: 0.5,
      });
    for (const [g, m] of [
      [gTop, solid(tex)],
      [gGrass, solid(grass, { roughness: 1 })],
      [gBrick, solid(tex)],
      [gConc, solid(conc, { roughness: 0.85 })],
      [gRail, solid({}, { metalness: 0.6, roughness: 0.4 })],
      [gHedge, solid({}, { roughness: 1 })],
    ]) {
      if (!g.tris) continue;
      const mesh = g.mesh(m);
      mesh.receiveShadow = true;
      mesh.castShadow = shadows && g !== gTop && g !== gGrass;
      scene.add(mesh);
      world.tris.levels = (world.tris.levels || 0) + g.tris;
    }
    for (const s of seal)
      if (Math.hypot(s[2] - s[0], s[3] - s[1]) > 0.05) {
        collision.addSegment(s[0], s[1], s[2], s[3]);
        sealed++;
      }
    world.levels = { pads: lvPads.length, stairs: lvStairs.length, sealed };
  }

  // ---------- labels ----------
  const labelNames = Object.keys(world.named).filter((n) => {
    const b = world.named[n].b;
    return !b || ['campus', 'dorm', 'church'].includes(b.kind) || n === '大潤發';
  });
  const seenLbl = new Set();
  for (const n of labelNames) {
    if (seenLbl.has(n)) continue;
    seenLbl.add(n);
    const it = world.named[n];
    const s = makeLabel(n, {
      height: n === '資訊管理學系' ? 4.2 : 2.6,
      color: n === '資訊管理學系' ? '#ffd23f' : '#fff',
      border: n === '資訊管理學系' ? '#ffd23f' : null,
    });
    s.position.set(it.x, (it.base ?? H(it.x, it.z)) + it.h + 4, it.z);
    scene.add(s);
    world.labels.push(s);
  }
  for (const n of ['中原大學大草坪', '中原噴水池', '中原埤塘生態公園', '普忠公園']) {
    const p = poi(n);
    if (!p) continue;
    const s = makeLabel(n, { height: 2.2, color: '#c9f5b0' });
    s.position.set(p.x, H(p.x, p.z) + 5, p.z);
    scene.add(s);
    world.labels.push(s);
  }
  {
    const s = makeLabel('中原夜市', {
      height: 4,
      color: '#ffd23f',
      bg: 'rgba(160,20,20,0.85)',
      icon: '🏮',
    });
    s.position.set(
      world.nightMarket.x,
      H(world.nightMarket.x, world.nightMarket.z) + 9,
      world.nightMarket.z
    );
    scene.add(s);
    world.labels.push(s);
  }
  onProgress(0.95);

  let lastT = 0;
  world.setQuality = (q) => {
    world.lampLights?.setEnabled(q !== 'low');
  };
  world.update = (t, night, clockMin, playerPos) => {
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    for (const f of world.animated) f(t);
    for (const m of world.windowMats) m.emissiveIntensity = night * 1.1;
    if (world.shopMat) world.shopMat.emissiveIntensity = night * 0.85;
    if (world.lampMat) world.lampMat.emissiveIntensity = night * 3.2;
    if (world.poolMat) world.poolMat.opacity = night * 0.1;
    if (world.coneMat) world.coneMat.opacity = night * 0.05;
    // fully faded out in the day: skip drawing them at all
    if (world.poolMesh) world.poolMesh.visible = night > 0.001;
    if (world.coneMesh) world.coneMesh.visible = night > 0.001;
    if (world.marketGlow) world.marketGlow.opacity = night * 0.05;
    if (world.stallBodyMat) world.stallBodyMat.emissiveIntensity = night * 0.08;
    if (world.foodSignMat) world.foodSignMat.emissiveIntensity = 0.15 + night * 0.7;
    if (world.stallGlow) world.stallGlow.value = 0.04 + night * 0.22;
    if (world.lanternMat) world.lanternMat.emissiveIntensity = 0.3 + night * 1.4;
    if (world.signMats) for (const m of world.signMats) m.emissiveIntensity = 0.15 + night * 0.75;
    world.vegetation?.update(t, playerPos);
    world.lampLights?.update(dt, night, playerPos);
    if (playerPos)
      for (const l of world.labels) {
        const d = Math.hypot(l.position.x - playerPos.x, l.position.z - playerPos.z);
        l.visible = d < 230;
      }
  };
  for (const f of lateColl) f();
  // nothing the world builds moves afterwards (only the night point lights follow the lamps): skip
  // recomputing all those matrices every frame
  for (const o of scene.children) if (!before.has(o)) freezeStatic(o);
  return world;
}

// ---------- distant skyline + SE ridge (backdrop) ----------
// Low-poly silhouettes 1.5-2.2 km out. Like the sky dome the group follows the
// camera (no parallax, never beyond camera.far); no fog, shadows or collision.
// update(fogColor) recolours them every frame so they sit in the haze.
export function buildSkyline(scene, count = 180) {
  const rnd = mulberry32(777);
  const p = [],
    c = [];
  // vertex shade: 1 at the top, BOT at the foot (fades into the haze)
  const BOT = 1 / 0.7;
  const v = (x, y, z, s) => {
    p.push(x, y, z);
    const k = y < 0 ? BOT : s;
    c.push(k, k, k);
  };
  const quad = (a, b, q, d, s) => {
    v(...a, s);
    v(...b, s);
    v(...q, s);
    v(...a, s);
    v(...q, s);
    v(...d, s);
  };
  const Y0 = -120;
  for (let i = 0; i < count; i++) {
    const ang = rnd() * Math.PI * 2,
      r = 1500 + rnd() * 500;
    const hh = 18 + Math.pow(rnd(), 2) * 75,
      w = 16 + rnd() * 28,
      d = 12 + rnd() * 18,
      rot = rnd() * Math.PI;
    const cx = Math.cos(ang) * r,
      cz = Math.sin(ang) * r,
      ca = Math.cos(rot),
      sa = Math.sin(rot);
    const C = [
      [-w, -d],
      [w, -d],
      [w, d],
      [-w, d],
    ].map(([x, z]) => [cx + (x * ca - z * sa) / 2, cz + (x * sa + z * ca) / 2]);
    for (let k = 0; k < 4; k++) {
      const a = C[k],
        b = C[(k + 1) % 4],
        s = 0.86 + ((k + i) % 3) * 0.06;
      quad([a[0], Y0, a[1]], [b[0], Y0, b[1]], [b[0], hh, b[1]], [a[0], hh, a[1]], s);
    }
    quad(
      [C[0][0], hh, C[0][1]],
      [C[1][0], hh, C[1][1]],
      [C[2][0], hh, C[2][1]],
      [C[3][0], hh, C[3][1]],
      1.05
    );
  }
  const mk = (pos, col, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = false;
    m.receiveShadow = false;
    m.matrixAutoUpdate = true;
    return m;
  };
  const group = new THREE.Group();
  const towers = new THREE.MeshBasicMaterial({
    vertexColors: true,
    fog: false,
    side: THREE.DoubleSide,
  });
  group.add(mk(p, c, towers));
  // hills to the south-east (x east, z south: angle ~ +45 deg)
  const ridge = (r, h0, h1, a0, a1, seed, bot) => {
    const rr = mulberry32(seed),
      ph = [rr() * 6, rr() * 6, rr() * 6],
      pos = [],
      cc = [],
      N = 70;
    const hAt = (t) => {
      const n =
        0.5 +
        0.25 * Math.sin(t * 9 + ph[0]) +
        0.15 * Math.sin(t * 23 + ph[1]) +
        0.1 * Math.sin(t * 51 + ph[2]);
      const taper = Math.min(1, t * 5, (1 - t) * 5);
      return (h0 + (h1 - h0) * n) * taper;
    };
    for (let k = 0; k < N; k++) {
      const t0 = k / N,
        t1 = (k + 1) / N,
        b0 = a0 + (a1 - a0) * t0,
        b1 = a0 + (a1 - a0) * t1;
      const p0 = [Math.cos(b0) * r, Math.sin(b0) * r],
        p1 = [Math.cos(b1) * r, Math.sin(b1) * r];
      const y0 = hAt(t0),
        y1 = hAt(t1);
      pos.push(
        p0[0],
        Y0,
        p0[1],
        p1[0],
        Y0,
        p1[1],
        p1[0],
        y1,
        p1[1],
        p0[0],
        Y0,
        p0[1],
        p1[0],
        y1,
        p1[1],
        p0[0],
        y0,
        p0[1]
      );
      for (const k of [bot, bot, 1, bot, 1, 1]) cc.push(k, k, k);
    }
    return [pos, cc];
  };
  const far = new THREE.MeshBasicMaterial({
    vertexColors: true,
    fog: false,
    side: THREE.DoubleSide,
  });
  const near = new THREE.MeshBasicMaterial({
    vertexColors: true,
    fog: false,
    side: THREE.DoubleSide,
  });
  // kept low (1-3 deg above the horizon): the real hills are 10+ km away
  group.add(mk(...ridge(2150, 45, 110, -0.15, 1.75, 5, 1 / 0.78), far));
  group.add(mk(...ridge(2000, 15, 55, 0.1, 1.45, 9, 1 / 0.74), near));
  group.renderOrder = -50;
  scene.add(group);
  group.userData.update = (fog) => {
    towers.color.copy(fog).multiplyScalar(0.7);
    far.color.copy(fog).multiplyScalar(0.78);
    near.color.copy(fog).multiplyScalar(0.74);
  };
  return group;
}
