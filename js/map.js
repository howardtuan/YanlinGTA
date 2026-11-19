import * as THREE from 'three';
import { CollisionWorld, SegGrid, pointInPoly } from './collision.js';
import { H, Hmin, terrainGrid, addBridge, clearBridges, DS } from './terrain.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- terrain draping ----------
// split a convex polygon [[x,z]..] by the line f(p) = c
function cut(poly, f, c) {
  const lo = [], hi = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const fp = f(p) - c, fq = f(q) - c;
    if (fp <= 0) lo.push(p);
    if (fp >= 0) hi.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      lo.push(m); hi.push(m);
    }
  }
  return [lo.length > 2 ? lo : null, hi.length > 2 ? hi : null];
}
function sliceBy(poly, f, k0, k1, s, base, out) {
  let mn = Infinity, mx = -Infinity;
  for (const p of poly) { const v = f(p); if (v < mn) mn = v; if (v > mx) mx = v; }
  const a = Math.max(k0, Math.floor((mn - base) / s) + 1), b = Math.min(k1, Math.ceil((mx - base) / s) - 1);
  let rest = poly;
  for (let k = a; k <= b && rest; k++) { const [lo, hi] = cut(rest, f, base + k * s); if (lo) out.push(lo); rest = hi; }
  if (rest) out.push(rest);
}
const FX = p => p[0], FZ = p => p[1], FU = p => p[0] - p[1];
// cut a convex polygon so every piece lies in one terrain triangle (H is linear there)
function drapePieces(poly) {
  const T = terrainGrid(); if (!T) return [poly];
  const { minX, minZ, step: s, nx, nz } = T;
  const a = [], b = [], c = [];
  sliceBy(poly, FX, 0, nx - 1, s, minX, a);
  for (const p of a) sliceBy(p, FZ, 0, nz - 1, s, minZ, b);
  for (const p of b) sliceBy(p, FU, -(nz - 1), nx - 1, s, minX - minZ, c);
  return c;
}
// Exact draping needs ~3x the triangles, so pieces are only cut as far as needed:
// a piece is kept when the terrain under it stays within TOL_LO above / TOL_HI
// below its plane; everything draped is lifted by TOL_LO so it never dips under.
const TOL_LO = 0.08, TOL_HI = 0.1;
function triFits(a, b, c, T) {
  const { minX, minZ, step: s, nx, nz } = T;
  const ha = H(a[0], a[1]), hb = H(b[0], b[1]), hc = H(c[0], c[1]);
  const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(det) < 1e-6) return true;
  let ok = true;
  const test = (x, z) => {
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (z - c[1])) / det;
    const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (z - c[1])) / det;
    const d = H(x, z) - (l1 * ha + l2 * hb + (1 - l1 - l2) * hc);
    if (d > TOL_LO || d < -TOL_HI) ok = false;
  };
  // the terrain is piecewise linear, so the worst point is a grid node inside
  // the triangle or a crossing of a triangle edge with a grid line / diagonal
  const x0 = Math.min(a[0], b[0], c[0]), x1 = Math.max(a[0], b[0], c[0]), z0 = Math.min(a[1], b[1], c[1]), z1 = Math.max(a[1], b[1], c[1]);
  const i0 = Math.max(0, Math.ceil((x0 - minX) / s)), i1 = Math.min(nx - 1, Math.floor((x1 - minX) / s));
  const j0 = Math.max(0, Math.ceil((z0 - minZ) / s)), j1 = Math.min(nz - 1, Math.floor((z1 - minZ) / s));
  for (let j = j0; j <= j1 && ok; j++) for (let i = i0; i <= i1 && ok; i++) {
    const x = minX + i * s, z = minZ + j * s;
    if (pointInPoly(x, z, [a, b, c])) test(x, z);
  }
  const edge = (p, q, f, base, k0, k1) => {
    const fp = f(p), fq = f(q); if (fp === fq) return;
    const lo = Math.max(k0, Math.ceil((Math.min(fp, fq) - base) / s)), hi = Math.min(k1, Math.floor((Math.max(fp, fq) - base) / s));
    for (let k = lo; k <= hi && ok; k++) { const t = (base + k * s - fp) / (fq - fp); test(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t); }
  };
  for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    if (!ok) break;
    edge(p, q, FX, minX, 0, nx - 1); edge(p, q, FZ, minZ, 0, nz - 1); edge(p, q, FU, minX - minZ, -(nz - 1), nx - 1);
  }
  return ok;
}
function adaptPieces(poly, out, S) {
  const T = terrainGrid(); if (!T) { out.push(poly); return; }
  let fits = true;
  for (let i = 1; i < poly.length - 1 && fits; i++) fits = triFits(poly[0], poly[i], poly[i + 1], T);
  if (fits) { out.push(poly); return; }
  if (S <= T.step) { out.push(...drapePieces(poly)); return; }
  const a = [], b = [];
  sliceBy(poly, FX, -1e9, 1e9, S, T.minX, a);
  for (const p of a) sliceBy(p, FZ, -1e9, 1e9, S, T.minZ, b);
  for (const p of b) adaptPieces(p, out, S / 2);
}

// ---------- geometry accumulator ----------
// drape=true: flat helpers (flatPoly/disc/strip) follow the terrain and their
// y argument becomes the offset above it
const UP = [0, 1, 0];
class Geo {
  // uvAt: optional [x,z] -> [u,v] for the flat helpers (default: world / 8 m)
  constructor(drape = false, uvAt = null) { this.p = []; this.n = []; this.c = []; this.uv = []; this.drape = drape; this.uvAt = uvAt; }
  tri(a, b, c, col, nrm, uva, uvb, uvc) {
    // a,b,c: [x,y,z]; nrm: desired facing; fix winding
    // col: one [r,g,b] or one per corner [[r,g,b] x3]
    let ca = col, cb = col, cc = col;
    if (Array.isArray(col[0])) [ca, cb, cc] = col;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * nrm[0] + cy * nrm[1] + cz * nrm[2] < 0) { [b, c] = [c, b]; [uvb, uvc] = [uvc, uvb]; [cb, cc] = [cc, cb]; }
    this.p.push(...a, ...b, ...c);
    this.n.push(...nrm, ...nrm, ...nrm);
    this.c.push(...ca, ...cb, ...cc);
    this.uv.push(...(uva || [0, 0]), ...(uvb || [0, 0]), ...(uvc || [0, 0]));
  }
  // col: one [r,g,b] or one per corner (a,b,c,d)
  quad(a, b, c, d, col, nrm, uvs) {
    const pc = Array.isArray(col[0]);
    this.tri(a, b, c, pc ? [col[0], col[1], col[2]] : col, nrm, uvs && uvs[0], uvs && uvs[1], uvs && uvs[2]);
    this.tri(a, c, d, pc ? [col[0], col[2], col[3]] : col, nrm, uvs && uvs[0], uvs && uvs[2], uvs && uvs[3]);
  }
  // convex polygon of [x,z] at height y (or y above the terrain when draping)
  fpoly(pts, y, col) {
    const P = this.drape ? q => [q[0], H(q[0], q[1]) + y + TOL_LO, q[1]] : q => [q[0], y, q[1]];
    const uv = this.uvAt || (q => [q[0] / 8, q[1] / 8]);
    let pcs = [pts];
    if (this.drape) { pcs = []; adaptPieces(pts, pcs, 160); }
    for (const pc of pcs) {
      const A = P(pc[0]);
      for (let i = 1; i < pc.length - 1; i++) this.tri(A, P(pc[i]), P(pc[i + 1]), col, UP, uv(pc[0]), uv(pc[i]), uv(pc[i + 1]));
    }
  }
  flatPoly(pts, y, col, holes) {
    if (pts.length < 3) return;
    const v2 = r => r.map(p => new THREE.Vector2(p[0], p[1]));
    const hs = (holes || []).filter(h => h.length > 2);
    const all = hs.length ? pts.concat(...hs) : pts;
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(v2(pts), hs.map(v2)); } catch (e) { return; }
    for (const t of tris) this.fpoly([all[t[0]], all[t[1]], all[t[2]]], y, col);
  }
  disc(x, z, r, y, col, seg = 8) {
    const ring = [];
    for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; ring.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
    this.fpoly(ring, y, col);
  }
  strip(a, b, w, y, col) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    if (l < 0.01) return;
    const nx = -dz / l * w / 2, nz = dx / l * w / 2;
    this.fpoly([[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], y, col);
  }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  }
  get tris() { return this.p.length / 9; }
}

// ground mesh: the terrain grid plus one 1 km skirt ring holding the edge
// heights (same values H() returns outside the grid), split like H()
function groundGeometry(B) {
  const T = terrainGrid();
  const xs = [], zs = [];
  if (T) {
    xs.push(T.minX - 1000); for (let i = 0; i < T.nx; i++) xs.push(T.minX + i * T.step); xs.push(T.minX + (T.nx - 1) * T.step + 1000);
    zs.push(T.minZ - 1000); for (let j = 0; j < T.nz; j++) zs.push(T.minZ + j * T.step); zs.push(T.minZ + (T.nz - 1) * T.step + 1000);
  } else {
    xs.push(B.minX - 1000, B.maxX + 1000); zs.push(B.minZ - 1000, B.maxZ + 1000);
  }
  const X = xs.length, Z = zs.length;
  const pos = new Float32Array(X * Z * 3);
  for (let j = 0; j < Z; j++) for (let i = 0; i < X; i++) {
    const k = (j * X + i) * 3; pos[k] = xs[i]; pos[k + 1] = H(xs[i], zs[j]); pos[k + 2] = zs[j];
  }
  const idx = [];
  for (let j = 0; j < Z - 1; j++) for (let i = 0; i < X - 1; i++) {
    const a = j * X + i, b = a + 1, c = a + X, d = c + 1;
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

const col = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const inArea = (x, z, p) => pointInPoly(x, z, p) && !(p.holes && p.holes.some(h => pointInPoly(x, z, h)));

// oriented frame along the longest edge: u along it, v across
function obb(pts) {
  let li = 0, ll = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > ll) { ll = l; li = i; } }
  const a0 = pts[li], a1 = pts[(li + 1) % pts.length], ux = (a1[0] - a0[0]) / (ll || 1), uz = (a1[1] - a0[1]) / (ll || 1);
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const p of pts) {
    const u = (p[0] - a0[0]) * ux + (p[1] - a0[1]) * uz, v = (p[0] - a0[0]) * -uz + (p[1] - a0[1]) * ux;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  return { u0, u1, v0, v1, ux, uz, P: (u, v) => [a0[0] + ux * u - uz * v, a0[1] + uz * u + ux * v] };
}
const polyArea = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// ---------- textures ----------
function canvasTex(w, h, draw, repeat = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

// facade base patterns for OSM building:material; drawn light grey so the
// per-building vertex tint still sets the colour
const FACADE = {
  brick(g, x, y, S) {
    g.fillStyle = '#f4f4f4'; g.fillRect(x, y, S, S); g.fillStyle = 'rgba(0,0,0,0.16)';
    for (let k = 0, r = 0; k < S; k += 5, r++) { g.fillRect(x, y + k, S, 1); for (let j = (r % 2) * 6; j < S; j += 12) g.fillRect(x + j, y + k, 1, 5); }
  },
  tiles(g, x, y, S) {
    g.fillStyle = '#f6f6f6'; g.fillRect(x, y, S, S); g.fillStyle = 'rgba(0,0,0,0.1)';
    for (let k = 0, r = 0; k < S; k += 4, r++) { g.fillRect(x, y + k, S, 1); for (let j = (r % 2) * 8; j < S; j += 16) g.fillRect(x + j, y + k, 1, 4); }
  },
  concrete(g, x, y, S, rnd) {
    g.fillStyle = '#f0f0f0'; g.fillRect(x, y, S, S);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.05})`; g.fillRect(x + rnd() * S, y + rnd() * S, 1.5, 1.5); }
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, y + S / 2, S, 1); g.fillRect(x + S / 2, y, 1, S);
  },
  stone(g, x, y, S, rnd) {
    for (let k = 0, r = 0; k < S; k += 10, r++) for (let j = -(r % 2) * 8; j < S; j += 16) {
      const v = 225 + Math.floor(rnd() * 25); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + Math.max(0, j), y + k, 16, 10);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let k = 0, r = 0; k < S; k += 10, r++) { g.fillRect(x, y + k, S, 1); for (let j = (r % 2) * 8; j < S; j += 16) g.fillRect(x + j, y + k, 1, 10); }
  },
  plaster(g, x, y, S, rnd) {
    g.fillStyle = '#fafafa'; g.fillRect(x, y, S, S);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.04})`; g.fillRect(x + rnd() * S, y + rnd() * S, 3, 2); }
  },
  wood(g, x, y, S, rnd) {
    for (let j = 0; j < S; j += 6) { const v = 220 + Math.floor(rnd() * 30); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + j, y, 6, S); }
    g.fillStyle = 'rgba(0,0,0,0.2)'; for (let j = 0; j < S; j += 6) g.fillRect(x + j, y, 1, S);
  },
  metal(g, x, y, S) {
    for (let j = 0; j < S; j += 4) { g.fillStyle = '#f2f2f2'; g.fillRect(x + j, y, 2, S); g.fillStyle = '#d4d4d4'; g.fillRect(x + j + 2, y, 2, S); }
  },
};
// OSM building:material values -> facade pattern
const MAT_KEY = {
  brick: 'brick', concrete: 'concrete', cement_block: 'concrete', reinforced_concrete: 'concrete',
  glass: 'glass', mirror: 'glass', metal: 'metal', steel: 'metal', aluminium: 'metal', metal_plates: 'metal',
  stone: 'stone', sandstone: 'stone', limestone: 'stone', granite: 'stone', marble: 'stone',
  plaster: 'plaster', wood: 'wood', timber_framing: 'wood', bamboo: 'wood', tile: 'tiles', tiles: 'tiles', ceramic: 'tiles',
};

// Facade atlas: 8x8 cells, one cell = one bay x one storey. The pattern is drawn
// light grey so the per-building vertex tint sets the colour.
//   campus   neat square tiles + continuous window band (ribbon windows)
//   glass    curtain wall (newer campus buildings)
//   concrete fair-faced concrete (清水模) with punched windows
//   town     透天: 二丁掛 tiles, one window per bay with iron grille, AC units
//   apt      公寓: tiles, wide grilled windows, balcony rail, more AC units
//   wash     洗石子 / plaster, small aluminium windows
const TILE2 = (g, x, y, S, a) => {
  // 二丁掛: long thin tiles in running bond
  g.fillStyle = `rgba(0,0,0,${a})`;
  for (let k = 0, r = 0; k < S; k += 3, r++) { g.fillRect(x, y + k, S, 0.7); for (let j = (r % 2) * 4; j < S; j += 8) g.fillRect(x + j, y + k, 0.7, 3); }
};
function cellBase(style, mat, g, x, y, S, rnd) {
  if (FACADE[mat]) { FACADE[mat](g, x, y, S, rnd); return; }
  if (style === 'campus') {
    g.fillStyle = '#fbfbfb'; g.fillRect(x, y, S, S); g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let k = 0; k < S; k += 4) { g.fillRect(x, y + k, S, 0.7); g.fillRect(x + k, y, 0.7, S); }
  } else if (style === 'concrete') {
    g.fillStyle = '#f2f2f0'; g.fillRect(x, y, S, S);
    for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.05})`; g.fillRect(x + rnd() * S, y + rnd() * S, 2, 1.5); }
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y + S / 2, S, 0.8); g.fillRect(x, y, S, 0.8); g.fillRect(x + S / 2, y, 0.8, S);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (const [u, v] of [[8, 8], [24, 8], [40, 8], [56, 8], [8, 40], [24, 40], [40, 40], [56, 40]]) g.fillRect(x + u, y + v, 1.2, 1.2);
  } else if (style === 'wash') {
    g.fillStyle = '#f3f3f1'; g.fillRect(x, y, S, S);
    for (let i = 0; i < 160; i++) { const v = rnd() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${0.05 + rnd() * 0.08})`; g.fillRect(x + rnd() * S, y + rnd() * S, 1, 1); }
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(x, y + S - 3, S, 1.2);
  } else {
    g.fillStyle = '#ffffff'; g.fillRect(x, y, S, S);
    TILE2(g, x, y, S, style === 'apt' ? 0.07 : 0.1);
  }
}
// window rectangle per style (also used for the night glow)
const WIN = {
  campus: [0, 18, 64, 26], concrete: [14, 16, 36, 30], glass: [2, 2, 60, 50],
  town: [14, 16, 36, 32], apt: [8, 14, 48, 30], wash: [18, 18, 28, 26],
};
function windowTextures(style, seed, mat) {
  const rnd = mulberry32(seed);
  const N = 8, S = 64, E = 32; // emissive map at half resolution
  if (mat === 'glass') style = 'glass';
  const lit = [];
  for (let i = 0; i < N * N; i++) lit.push(rnd() < 0.38 ? (rnd() < 0.7 ? '#ffd58a' : '#cfe6ff') : null);
  const ac = [];
  for (let i = 0; i < N * N; i++) ac.push(rnd() < (style === 'apt' ? 0.45 : 0.3));
  const map = canvasTex(N * S, N * S, (g) => {
    for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
      const x = ix * S, y = iy * S;
      if (style === 'glass') {
        g.fillStyle = '#ffffff'; g.fillRect(x, y, S, S);
        g.fillStyle = '#5d6f7f'; g.fillRect(x + 2, y + 2, S - 4, S - 14);
        g.fillStyle = 'rgba(220,235,250,0.35)'; g.fillRect(x + 4, y + 4, (S - 8) / 2, S - 18);
        g.fillStyle = '#c8ccd0'; g.fillRect(x + S / 2 - 1, y + 2, 2, S - 14);
        continue;
      }
      cellBase(style, mat, g, x, y, S, rnd);
      const [wx, wy, ww, wh] = WIN[style] || WIN.town;
      if (style === 'campus') {
        // ribbon: the band runs across the whole cell so neighbours join up
        g.fillStyle = '#2d3b4c'; g.fillRect(x, y + wy, S, wh);
        g.fillStyle = 'rgba(160,190,220,0.3)'; g.fillRect(x, y + wy + 2, S, wh / 2 - 2);
        g.fillStyle = '#d6d2ca'; for (let k = 0; k < S; k += 16) g.fillRect(x + k, y + wy, 2, wh);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, y + wy + wh, S, 3);
        continue;
      }
      g.fillStyle = '#34404a'; g.fillRect(x + wx, y + wy, ww, wh);
      g.fillStyle = 'rgba(150,180,200,0.3)'; g.fillRect(x + wx + 2, y + wy + 2, ww / 3, wh - 4);
      if (style === 'concrete' || style === 'wash') {
        // aluminium frame + mullion
        g.fillStyle = '#c9cbcc'; g.fillRect(x + wx + ww / 2 - 1, y + wy, 2, wh);
        g.strokeStyle = '#b8babb'; g.lineWidth = 1.5; g.strokeRect(x + wx, y + wy, ww, wh);
      }
      if (style === 'town' || style === 'apt' || style === 'wash') {
        // 鐵窗: a frame sticking out from the wall + bars
        const gc = style === 'wash' ? 'rgba(235,235,230,0.85)' : 'rgba(45,45,45,0.7)';
        g.strokeStyle = gc; g.lineWidth = 1.5; g.strokeRect(x + wx - 2, y + wy - 2, ww + 4, wh + 4);
        g.fillStyle = gc;
        for (let k = x + wx + 2; k < x + wx + ww; k += 5) g.fillRect(k, y + wy - 2, 1.2, wh + 4);
        g.fillRect(x + wx - 2, y + wy + wh * 0.5, ww + 4, 1.2);
      }
      if (style === 'apt') {
        // balcony rail along the slab
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + S - 12, S, 2);
        g.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < S; k += 4) g.fillRect(x + k, y + S - 12, 1, 10);
      }
      if (style !== 'concrete' && ac[iy * N + ix]) {
        // split AC outdoor unit on a bracket
        const ax = x + (style === 'apt' ? 44 : S - 20), ay = y + S - 16;
        g.fillStyle = '#e8e8e2'; g.fillRect(ax, ay, 16, 11); g.fillStyle = '#9a9a96'; g.beginPath(); g.arc(ax + 6, ay + 5.5, 4, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(ax, ay + 11, 16, 1.5);
        // rust streak under the unit
        g.fillStyle = 'rgba(90,60,40,0.12)'; g.fillRect(ax + 3, ay + 12, 2, 10);
      }
    }
  });
  const emi = canvasTex(N * E, N * E, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, N * E, N * E);
    const [wx, wy, ww, wh] = WIN[style] || WIN.town, k = E / S;
    for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
      const l = lit[iy * N + ix]; if (!l) continue;
      g.fillStyle = l;
      g.fillRect(ix * E + wx * k, iy * E + wy * k, ww * k, wh * k);
    }
  });
  return { map, emi };
}

// Ground floor shop row: 8 cells of one 4 m bay x 3.6 m. Roller shutters,
// glass fronts and open shops, each under a sign band. Only the glass /
// open interiors and the signs glow at night.
// No arcade (qilou) setback: footprints, colliders and interior doors all
// assume the wall sits on the footprint edge, so it stays a texture only.
const SHOP_WORDS = ['小吃', '早餐', '飲料', '便當', '五金', '藥局', '機車行', '影印', '美髮', '文具', '火鍋', '麵店', '冷氣', '水電', '眼鏡', '電信'];
const SHOP_SIGN = [['#c8102e', '#fff'], ['#ffd23f', '#a3001b'], ['#0a7d3b', '#fff'], ['#1a5fd1', '#fff'], ['#ffffff', '#c8102e'], ['#ff7a00', '#fff'], ['#222', '#ffd23f'], ['#6b2bd1', '#fff']];
function shopTextures(seed) {
  const rnd = mulberry32(seed);
  const N = 8, S = 128;
  const kinds = [], words = [], signs = [];
  for (let i = 0; i < N; i++) { kinds.push(['shutter', 'glass', 'open', 'glass', 'open', 'shutter', 'open', 'half'][i]); words.push(SHOP_WORDS[Math.floor(rnd() * SHOP_WORDS.length)]); signs.push(SHOP_SIGN[Math.floor(rnd() * SHOP_SIGN.length)]); }
  const SB = 30; // sign band height (px from the top)
  const font = '900 22px "Noto Sans TC","Microsoft JhengHei",sans-serif';
  // sign band with the shop name (same drawing in the glow map)
  const sign = (g, i, k = 1) => {
    const x = i * S, [bg, fg] = signs[i];
    g.fillStyle = bg; g.globalAlpha = k; g.fillRect(x + 4, 2, S - 8, SB - 2); g.globalAlpha = 1;
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(words[i], x + S / 2, SB / 2 + 2);
  };
  const map = canvasTex(N * S, S, (g) => {
    for (let i = 0; i < N; i++) {
      const x = i * S, k = kinds[i];
      g.fillStyle = '#d9d6cf'; g.fillRect(x, 0, S, S);
      // pillars between shops
      g.fillStyle = '#bdb8ae'; g.fillRect(x, 0, 6, S); g.fillRect(x + S - 6, 0, 6, S);
      const ox = x + 8, ow = S - 16, oy = SB + 4, oh = S - SB - 8;
      if (k === 'shutter' || k === 'half') {
        const hh = k === 'half' ? oh * 0.45 : oh;
        if (k === 'half') { g.fillStyle = '#4a3c30'; g.fillRect(ox, oy, ow, oh); g.fillStyle = '#e2b56a'; g.fillRect(ox + 6, oy + hh + 4, ow - 12, oh - hh - 10); }
        g.fillStyle = '#9ea3a6'; g.fillRect(ox, oy, ow, hh);
        g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = oy; y < oy + hh; y += 3) g.fillRect(ox, y, ow, 1);
        g.fillStyle = '#7d8285'; g.fillRect(ox, oy, ow, 5);
      } else if (k === 'glass') {
        g.fillStyle = '#3c4d5a'; g.fillRect(ox, oy, ow, oh);
        g.fillStyle = '#e9dcc0'; g.fillRect(ox + 8, oy + oh - 30, ow - 16, 18);
        g.fillStyle = 'rgba(200,225,240,0.35)'; g.fillRect(ox + 4, oy + 4, ow / 3, oh - 8);
        g.fillStyle = '#aab0b4'; g.fillRect(ox + ow / 2 - 1, oy, 2, oh); g.fillRect(ox, oy, ow, 2);
      } else {
        // open shop: warm interior, shelves, a counter
        g.fillStyle = '#5b4632'; g.fillRect(ox, oy, ow, oh);
        g.fillStyle = '#f1d9a8'; g.fillRect(ox + 4, oy + 4, ow - 8, oh - 30);
        for (let s = 0; s < 3; s++) { g.fillStyle = ['#c8102e', '#2a9d8f', '#e9c46a'][s]; g.fillRect(ox + 10, oy + 12 + s * 16, ow - 20, 6); }
        g.fillStyle = '#8a6a48'; g.fillRect(ox + 4, oy + oh - 24, ow - 8, 22);
      }
      sign(g, i);
      // dirty floor line
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, S - 4, S, 4);
    }
  }, false);
  map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.ClampToEdgeWrapping;
  const emi = canvasTex(N * S, S, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, N * S, S);
    for (let i = 0; i < N; i++) {
      const x = i * S, k = kinds[i], ox = x + 8, ow = S - 16, oy = SB + 4, oh = S - SB - 8;
      sign(g, i, 0.75);
      if (k === 'glass') { g.fillStyle = '#7d705a'; g.fillRect(ox, oy, ow, oh); g.fillStyle = '#b8a27a'; g.fillRect(ox + 8, oy + oh - 30, ow - 16, 18); }
      if (k === 'open') { g.fillStyle = '#a08458'; g.fillRect(ox + 4, oy + 4, ow - 8, oh - 30); }
      if (k === 'half') { g.fillStyle = '#7a5a30'; g.fillRect(ox + 6, oy + oh * 0.45 + 4, ow - 12, oh * 0.55 - 10); }
    }
  }, false);
  emi.wrapS = THREE.RepeatWrapping; emi.wrapT = THREE.ClampToEdgeWrapping;
  return { map, emi };
}

// Roof atlas: left half plain (flat roofs, parapets), right half corrugated
// sheet ribs that repeat along v (rooftop 鐵皮加蓋).
function roofTexture() {
  const t = canvasTex(64, 256, (g) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 8) {
      g.fillStyle = '#ffffff'; g.fillRect(32, y, 32, 3);
      g.fillStyle = '#c9c9c9'; g.fillRect(32, y + 4, 32, 3);
    }
  });
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  return t;
}
const RIB = 0.25; // metres per rib; 32 ribs per texture repeat

// Tileable multiplier textures (no colour space: values multiply the vertex colour)
function noiseTex(size, seed, draw) {
  const t = canvasTex(size, size, (g) => draw(g, size, mulberry32(seed)));
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
const wrapRect = (g, x, y, w, h, S) => {
  for (const ox of [0, -S]) for (const oy of [0, -S]) g.fillRect(x + ox, y + oy, w, h);
};
const asphaltTex = () => noiseTex(256, 1301, (g, S, r) => {
  g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) { const v = 190 + Math.floor(r() * 65); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1, 1); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; const w = 6 + r() * 30; wrapRect(g, r() * S, r() * S, w, w * (0.3 + r()), S); }
});
const grassTex = () => noiseTex(256, 2203, (g, S, r) => {
  g.fillStyle = '#ececec'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 120; i++) { const v = r() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.06})`; const w = 8 + r() * 30; wrapRect(g, r() * S, r() * S, w, w * (0.5 + r() * 0.8), S); }
  for (let i = 0; i < 4000; i++) { const v = 170 + Math.floor(r() * 85); g.fillStyle = `rgb(${v},${v + 8 > 255 ? 255 : v + 8},${v})`; g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1, 2); }
});
const paverTex = () => noiseTex(256, 3407, (g, S, r) => {
  // 0.5 m pavers when 256 px = 8 m
  for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x += 16) { const v = 215 + Math.floor(r() * 40); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 16, 16); }
  g.fillStyle = 'rgba(0,0,0,0.28)';
  for (let k = 0; k < S; k += 16) { g.fillRect(0, k, S, 1); g.fillRect(k, 0, 1, S); }
});

export function labelTexture(text, opt = {}) {
  const fs = opt.size || 44, pad = 14;
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d');
  g.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2 + (opt.icon ? fs : 0);
  cv.width = w; cv.height = fs + pad * 2;
  g.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  g.fillStyle = opt.bg || 'rgba(12,14,26,0.78)';
  const r = 12; g.beginPath(); g.roundRect(0, 0, cv.width, cv.height, r); g.fill();
  if (opt.border) { g.strokeStyle = opt.border; g.lineWidth = 4; g.stroke(); }
  g.fillStyle = opt.color || '#fff'; g.textBaseline = 'middle';
  g.fillText((opt.icon || '') + text, pad, cv.height / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: cv.width / cv.height };
}

export function makeLabel(text, opt = {}) {
  const { tex, aspect } = labelTexture(text, opt);
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: opt.depthTest ?? true, transparent: true, fog: false });
  const s = new THREE.Sprite(m);
  const h = opt.height || 3;
  s.scale.set(h * aspect, h, 1);
  s.renderOrder = 10;
  return s;
}

function signTexture(word, bg, fg) {
  return canvasTex(64, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 64, 256);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 56, 248);
    g.fillStyle = fg; g.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...word];
    const step = 236 / chars.length;
    chars.forEach((ch, i) => g.fillText(ch, 32, 12 + step * (i + 0.5)));
  }, false);
}

export function bannerTexture() {
  return canvasTex(1024, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 1024, 512);
    gr.addColorStop(0, '#1d3fd1'); gr.addColorStop(1, '#0b1a66');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 486, 1024, 26);
    g.beginPath(); g.arc(150, 256, 115, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0b1a66'; g.font = '900 130px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('34', 150, 262);
    g.textAlign = 'left'; g.fillStyle = '#fff';
    g.font = '800 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText('第34屆 資管系學會會長候選人', 300, 92);
    g.fillStyle = '#ffffff'; g.font = '900 150px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText('資管要贏', 292, 236);
    g.fillStyle = '#ffd23f';
    g.fillText('票投彥霖', 292, 400);
  }, false);
}

function clockFaceTexture() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#7a3b2a'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#f6f1e2'; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#222';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 92 - 4, 128 - Math.cos(a) * 92 - 4, 8, 8); }
  }, false);
}

// ---------- world ----------
const AREA_COL = {
  park: '#55803f', grass: '#62924a', pitch: '#4f9446', track: '#b5553f', water: '#3a78a8',
  parking: '#5d6066', construction: '#8e7a5c', school: '#a3a08f', commercial: '#8b8a84',
  industrial: '#7d7b74', residential: null,
};
const ROAD_LAYER = { footway: 0, path: 0, cycleway: 0, steps: 0, pedestrian: 0, track: 0, service: 1, living_street: 2, residential: 2, unclassified: 3, tertiary: 4, secondary: 5, primary: 6 };

export function buildWorld(scene, data, onProgress = () => { }, opts = {}) {
  const B = data.bounds;
  const rnd = mulberry32(20240034);
  const world = { data, bounds: B, labels: [], animated: [], named: {}, tris: {} };
  clearBridges();
  const collision = new CollisionWorld(B, 16);
  const roadGrid = new SegGrid(20);
  world.collision = collision; world.roadGrid = roadGrid;
  collision.reserved = opts.reserved || [];

  const campusRing = data.campus.length ? data.campus.reduce((a, b) => (a.length > b.length ? a : b)) : [];
  world.inCampus = (x, z) => data.campus.some(r => pointInPoly(x, z, r));

  // ground layers draw in order without depth writes (no z-fighting)
  let layerOrder = -100;
  // polygonOffset: draped layers sit a few cm above the terrain; keep them in front at distance
  const flatMat = (map = null) => new THREE.MeshLambertMaterial({ vertexColors: true, map, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const addFlat = (geo, mat, tag) => {
    const m = geo.mesh(mat || flatMat()); m.receiveShadow = true; m.renderOrder = layerOrder++; scene.add(m);
    if (tag) world.tris[tag] = (world.tris[tag] || 0) + geo.tris;
    return m;
  };

  // base ground: terrain grid (MOI DTM) with a skirt out to the horizon
  {
    const g = groundGeometry(B);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: '#6f716a' }));
    m.receiveShadow = true; m.renderOrder = layerOrder++;
    scene.add(m);
    world.groundMesh = m;
    world.tris.ground = g.index.count / 3;
  }
  // campus paving
  {
    const g = new Geo(true);
    for (const r of data.campus) g.flatPoly(r, 0.01, col('#a8a395'));
    addFlat(g, null, 'areas');
  }
  // areas: base / green / track / water meshes keep the data's draw order
  const waterPolys = [];
  const greenPolys = [];
  const sportPolys = []; // no trees on pitches / tracks
  const parkingPolys = [];
  const gtex = world.groundTex = { asphalt: asphaltTex(), grass: grassTex(), paver: paverTex() };
  {
    const uv16 = q => [q[0] / 16, q[1] / 16];
    const gBase = new Geo(true, uv16), gGreen = new Geo(true, uv16), gTrack = new Geo(true, uv16), gWater = new Geo(true), gLines = new Geo(true);
    const LINE = col('#e8eee4');
    for (const a of data.areas) {
      const c = AREA_COL[a.kind]; if (!c) continue;
      const g = a.kind === 'water' ? gWater : a.kind === 'track' ? gTrack : (a.kind === 'park' || a.kind === 'grass' || a.kind === 'pitch') ? gGreen : gBase;
      g.flatPoly(a.pts, 0.02, col(c), a.holes);
      // holes ride along on the ring array so inArea() can skip them
      const ring = a.holes ? Object.assign(a.pts.slice(), { holes: a.holes }) : a.pts;
      if (a.kind === 'water') waterPolys.push(ring);
      if (a.kind === 'park' || a.kind === 'grass') greenPolys.push(ring);
      if (a.kind === 'pitch' || a.kind === 'track') sportPolys.push(a.pts);
      if (a.kind === 'parking') parkingPolys.push(ring);
      // pitch markings on roughly rectangular pitches
      if (a.kind === 'pitch' && !a.holes) {
        const f = obb(a.pts), L = f.u1 - f.u0, W = f.v1 - f.v0;
        if (L > 14 && W > 10 && polyArea(a.pts) / (L * W) > 0.8) {
          const P = f.P, u0 = f.u0 + 1, u1 = f.u1 - 1, v0 = f.v0 + 1, v1 = f.v1 - 1, um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
          const C = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
          for (let i = 0; i < 4; i++) gLines.strip(C[i], C[(i + 1) % 4], 0.12, 0.03, LINE);
          gLines.strip(P(um, v0), P(um, v1), 0.12, 0.03, LINE);
          const rc = Math.min(9.15, W * 0.18);
          for (let k = 0; k < 20; k++) {
            const t0 = k / 20 * Math.PI * 2, t1 = (k + 1) / 20 * Math.PI * 2;
            gLines.strip(P(um + Math.cos(t0) * rc, vm + Math.sin(t0) * rc), P(um + Math.cos(t1) * rc, vm + Math.sin(t1) * rc), 0.12, 0.03, LINE);
          }
        }
      }
    }
    // waterways
    for (const w of data.waterways) for (let i = 0; i < w.pts.length - 1; i++) { gWater.strip(w.pts[i], w.pts[i + 1], w.w, 0.02, col('#3a78a8')); gWater.disc(w.pts[i][0], w.pts[i][1], w.w / 2, 0.02, col('#3a78a8')); }
    addFlat(gBase, flatMat(gtex.asphalt), 'areas');
    addFlat(gGreen, flatMat(gtex.grass), 'areas');
    addFlat(gTrack, flatMat(gtex.asphalt), 'areas');
    if (gLines.tris) addFlat(gLines, null, 'areas');
    addFlat(gWater, null, 'areas');
  }
  world.waterPolys = waterPolys;
  onProgress(0.25);

  // rail
  {
    const g = new Geo(true);
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) { g.strip(r.pts[i], r.pts[i + 1], 4.5, 0.03, col('#6b5d50')); g.disc(r.pts[i][0], r.pts[i][1], 2.25, 0.03, col('#6b5d50')); }
    addFlat(g, null, 'rail');
    const g2 = new Geo(true);
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      for (const s of [-0.75, 0.75]) g2.strip([a[0] + nx * s, a[1] + nz * s], [b[0] + nx * s, b[1] + nz * s], 0.12, 0.04, col('#c9c9c9'));
    }
    addFlat(g2, null, 'rail');
  }

  // roads, by layer
  // OSM node degree: junction nodes get a disc and no lane marks across them
  const nodeDeg = new Map(), nodeUse = new Map();
  const hasNodes = r => r.nodes && r.nodes.length === r.pts.length;
  for (const r of data.roads) {
    if (!hasNodes(r)) continue;
    const n = r.nodes.length;
    r.nodes.forEach((id, i) => { nodeDeg.set(id, (nodeDeg.get(id) || 0) + (i > 0) + (i < n - 1)); nodeUse.set(id, (nodeUse.get(id) || 0) + 1); });
  }
  const isJunction = (r, i) => hasNodes(r) && (nodeDeg.get(r.nodes[i]) || 0) >= 3;
  const turnAt = (r, i) => {
    const a = r.pts[i - 1], p = r.pts[i], b = r.pts[i + 1];
    const d = Math.atan2(b[1] - p[1], b[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]);
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
  };
  const inPlay = (p, m = 60) => p[0] > B.minX - m && p[0] < B.maxX + m && p[1] > B.minZ - m && p[1] < B.maxZ + m;
  const layers = [...Array(7)].map(() => new Geo(true));
  const walks = new Geo(true); // sidewalks + curbs, drawn under the carriageways
  const marks = new Geo(true);
  const deckSides = new Geo();
  // bridge deck: height profile from terrain.js addBridge (same <=DS m stations);
  // visual only, collision stays 2D
  const deckStrip = (g, a, b, w, d0, yAt, y, c, sides) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.01) return;
    const n = Math.max(1, Math.ceil(l / DS)), nx = -dz / l * w / 2, nz = dx / l * w / 2;
    let px = a[0], pz = a[1], py = yAt(d0);
    for (let k = 1; k <= n; k++) {
      const qx = a[0] + dx * k / n, qz = a[1] + dz * k / n, qy = yAt(d0 + l * k / n);
      g.quad([px + nx, py + y, pz + nz], [qx + nx, qy + y, qz + nz], [qx - nx, qy + y, qz - nz], [px - nx, py + y, pz - nz], c, UP);
      // sides only where the deck clears the ground (> 0.3 m), not on draped spans
      if (sides && Math.max(py - H(px, pz), qy - H(qx, qz), (py + qy) / 2 - H((px + qx) / 2, (pz + qz) / 2)) > 0.3) for (const sd of [1, -1]) {
        const ax = px + nx * sd, az = pz + nz * sd, bx = qx + nx * sd, bz = qz + nz * sd, fn = [nx / (w / 2) * sd, 0, nz / (w / 2) * sd];
        // fascia under the deck edge + a low curb
        deckSides.quad([ax, py - 0.7, az], [bx, qy - 0.7, bz], [bx, qy + 0.25, bz], [ax, py + 0.25, az], col('#8d8a82'), fn);
      }
      px = qx; pz = qz; py = qy;
    }
  };
  const deckDisc = (g, x, z, r, yy, c, seg) => {
    const P = []; for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; P.push([x + Math.cos(a) * r, yy, z + Math.sin(a) * r]); }
    for (let i = 1; i < seg - 1; i++) g.tri(P[0], P[i], P[i + 1], c, UP);
  };
  const SURF_COL = { concrete: '#77766f', paving_stones: '#7f766a', sett: '#77706a', unpaved: '#7a6a52', gravel: '#7f766a', compacted: '#7a6e5c', wood: '#6e5440' };
  const SERVICE_COL = { alley: '#4f5054', driveway: '#56565a', parking_aisle: '#46484e' };
  const roadCol = (r) => {
    if (ROAD_LAYER[r.type] === 0) {
      return world.inCampus(r.pts[0][0], r.pts[0][1]) ? col('#c7bda7') : col('#9c978b');
    }
    if (SURF_COL[r.surface]) return col(SURF_COL[r.surface]);
    if (r.type === 'service') return col(SERVICE_COL[r.service] || '#4a4c52');
    return col('#3b3d43');
  };
  // lane marks: one solid or dashed (4 m on / 6 m off) line at offset `off`
  // from the centreline; cut short of junctions
  const MARKED = { primary: 1, secondary: 1, tertiary: 1 };
  const WHITE = col('#e6e5df'), YELLOW = col('#e3bf3c');
  const line = (r, yAt, off, lw, c, dash, maxD = Infinity) => {
    let acc = 0;
    for (let i = 0; i < r.pts.length - 1 && acc < maxD; i++) {
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
      if (l < 0.5 || (!inPlay(a) && !inPlay(b))) { acc += l; continue; }
      const nx = -dz / l, nz = dx / l, trim = Math.min(l / 2, r.w * 0.6 + 3);
      const t0 = isJunction(r, i) ? trim : 0, t1 = Math.min(maxD - acc, l - (isJunction(r, i + 1) ? trim : 0));
      const piece = (s0, s1) => {
        if (s1 - s0 < 0.3) return;
        const p0 = [a[0] + dx * s0 / l + nx * off, a[1] + dz * s0 / l + nz * off], p1 = [a[0] + dx * s1 / l + nx * off, a[1] + dz * s1 / l + nz * off];
        if (yAt) deckStrip(marks, p0, p1, lw, acc + s0, yAt, 0.04 + TOL_LO, c, false);
        else marks.strip(p0, p1, lw, 0.04, c);
      };
      if (!dash) piece(t0, t1);
      else for (let s = t0 + 1; s < t1; s += 10) piece(s, Math.min(s + 4, t1));
      acc += l;
    }
  };
  const markRoad = (r, yAt) => {
    const two = !r.oneway, e = r.w / 2 - 0.35;
    const lanes = Math.max(1, r.lanes || (two ? 2 : r.type === 'primary' ? 3 : 2));
    line(r, yAt, e, 0.15, WHITE, false); line(r, yAt, -e, 0.15, WHITE, false);
    if (two) {
      // 雙黃線 on primary / secondary, yellow dashes on tertiary
      if (r.type === 'tertiary') line(r, yAt, 0, 0.15, YELLOW, true);
      else { line(r, yAt, 0.15, 0.12, YELLOW, false); line(r, yAt, -0.15, 0.12, YELLOW, false); }
      const n = Math.max(1, Math.round(lanes / 2)), lw = e / n;
      for (let k = 1; k < n; k++) { line(r, yAt, k * lw, 0.12, WHITE, true); line(r, yAt, -k * lw, 0.12, WHITE, true); }
    } else {
      const lw = 2 * e / lanes;
      for (let k = 1; k < lanes; k++) line(r, yAt, -e + k * lw, 0.12, WHITE, true);
    }
  };
  // 2.5 m sidewalk + curb on primary..tertiary; 中北路 has none (see below)
  const SIDEWALK = col('#a39a8e'), CURB = col('#cfccc4');
  const sidewalk = (r) => {
    if (!MARKED[r.type] || r.bridge || r.tunnel || (r.name || '').startsWith('中北路')) return;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
      if (l < 0.3 || (!inPlay(a, 20) && !inPlay(b, 20))) continue;
      const nx = -dz / l, nz = dx / l;
      for (const sd of [1, -1]) {
        const o = sd * (r.w / 2 + 1.35), oc = sd * (r.w / 2 + 0.1);
        walks.strip([a[0] + nx * o, a[1] + nz * o], [b[0] + nx * o, b[1] + nz * o], 2.5, 0.02, SIDEWALK);
        walks.strip([a[0] + nx * oc, a[1] + nz * oc], [b[0] + nx * oc, b[1] + nz * oc], 0.2, 0.025, CURB);
      }
      if (i > 0 && turnAt(r, i) > 0.1) walks.disc(a[0], a[1], r.w / 2 + 2.6, 0.02, SIDEWALK, 12);
    }
  };
  for (const r of data.roads) {
    const L = ROAD_LAYER[r.type] ?? 1;
    const g = layers[L]; const c = roadCol(r);
    const yAt = r.bridge && !r.tunnel ? addBridge(r.pts, r.w) : null;
    let acc = 0;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (yAt) deckStrip(g, a, b, r.w, acc, yAt, 0.03 + TOL_LO, c, true);
      else g.strip(a, b, r.w, 0.03, c);
      roadGrid.add(a[0], a[1], b[0], b[1], r.w, r);
      acc += l;
    }
    // discs only where needed: bends, junctions and joins with another way
    acc = 0;
    r.pts.forEach((p, i) => {
      if (i) acc += Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]);
      const end = i === 0 || i === r.pts.length - 1;
      const need = !hasNodes(r) || (end ? (nodeUse.get(r.nodes[i]) || 0) >= 2 : isJunction(r, i) || turnAt(r, i) > 0.05);
      if (!need) return;
      if (yAt && !end) deckDisc(g, p[0], p[1], r.w / 2, yAt(acc) + 0.03 + TOL_LO, c, L === 0 ? 6 : 10);
      else g.disc(p[0], p[1], r.w / 2, 0.03, c, L === 0 ? 6 : 10);
    });
    if (MARKED[r.type]) markRoad(r, yAt);
    sidewalk(r);
  }
  // 中北路: no curb sidewalk; ~200 m painted green walkway (標線型人行道)
  // on the campus side from the main gate
  {
    const r = data.roads.find(q => q.name === '中北路' && Math.hypot(q.pts[0][0] + 205, q.pts[0][1] - 82) < 40);
    if (r && r.pts.length > 1) {
      const a = r.pts[0], b = r.pts[1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      const sd = world.inCampus(mx + nx * (r.w / 2 + 6), mz + nz * (r.w / 2 + 6)) ? 1 : -1;
      line(r, null, sd * (r.w / 2 - 1.1), 1.8, col('#3f8f5a'), false, 200);
      line(r, null, sd * (r.w / 2 - 2.05), 0.12, WHITE, false, 200);
    }
  }
  addFlat(walks, flatMat(gtex.paver), 'roads');
  layers.forEach((g, i) => addFlat(g, flatMat(i === 0 ? gtex.paver : gtex.asphalt), 'roads'));
  addFlat(marks, null, 'roads');
  if (deckSides.tris) { const m = deckSides.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m); }
  onProgress(0.4);

  // ---------- buildings ----------
  // one wall mesh per facade (window style + OSM material); material variants
  // are only built when some building actually carries the tag
  const wallMat = {}; const wallGeo = {};
  const SEED = { campus: 7, town: 11, apt: 13, wash: 17, glass: 19, concrete: 23 };
  const wallFor = (style, mat) => {
    const k = mat ? style + ':' + mat : style;
    if (!wallGeo[k]) {
      const t = windowTextures(style, (SEED[style] || 5) + (mat ? mat.length * 101 : 0), mat);
      const shiny = style === 'glass' || mat === 'glass' || mat === 'metal';
      wallMat[k] = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, vertexColors: true, roughness: shiny ? 0.4 : 0.85, metalness: mat === 'metal' ? 0.3 : style === 'glass' ? 0.15 : 0.0 });
      wallGeo[k] = new Geo();
    }
    return wallGeo[k];
  };
  // ground floor shop fronts (town / commercial walls facing a street)
  const shopGeo = new Geo();
  const SHOP_LO = [0.72, 0.72, 0.72], SHOP_HI = [1, 1, 1];
  const facesStreet = (a, c, n) => {
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, px = mx + n[0] * 4, pz = mz + n[2] * 4;
    const q = roadGrid.nearest(px, pz, sg => sg[5].drive && (sg[5].type !== 'service' || sg[5].name));
    return !!q.seg && q.d < 4 && (q.q[0] - mx) * n[0] + (q.q[1] - mz) * n[2] > 0;
  };
  // flat roofs sample the plain half of the roof atlas
  const roofGeo = new Geo(false, () => [0.1, 0.5]);
  // rooftop 鐵皮加蓋 sheds and stair houses, all merged into roofGeo
  const SHED = ['#4a78a8', '#3f6a94', '#8d959b', '#a3a9ad', '#9a5236', '#7c4430'].map(col);
  const Q3 = (f, u, v, y) => { const p = f.P(u, v); return [p[0], y, p[1]]; };
  const roofBox = (f, [u0, u1, v0, v1], y0, hh, wc, tc) => {
    const sides = [[u0, v0, u1, v0, [f.uz, 0, -f.ux]], [u1, v0, u1, v1, [f.ux, 0, f.uz]], [u1, v1, u0, v1, [-f.uz, 0, f.ux]], [u0, v1, u0, v0, [-f.ux, 0, -f.uz]]];
    for (const [ua, va, ub, vb, n] of sides) roofGeo.quad(Q3(f, ua, va, y0), Q3(f, ub, vb, y0), Q3(f, ub, vb, y0 + hh), Q3(f, ua, va, y0 + hh), wc, n);
    roofGeo.quad(Q3(f, u0, v0, y0 + hh), Q3(f, u1, v0, y0 + hh), Q3(f, u1, v1, y0 + hh), Q3(f, u0, v1, y0 + hh), tc, UP);
  };
  const shed = (f, [u0, u1, v0, v1], y0, rb) => {
    const rc = SHED[Math.floor(rb() * SHED.length)], wc = rb() < 0.5 ? rc.map(v => Math.min(1, v * 1.12)) : col('#d5d6d0');
    const wh = 2.5, gable = rb() < 0.45, vm = (v0 + v1) / 2;
    const hA = y0 + wh, hB = gable ? hA : hA + 0.6, hR = hA + 0.9;
    const R = RIB * 32, rib = (d) => [0.75, d / R];
    const wall = (ua, va, ub, vb, ha, hb, n, d0) => {
      const l = Math.hypot(...f.P(ub, vb).map((v, i) => v - f.P(ua, va)[i]));
      roofGeo.quad(Q3(f, ua, va, y0), Q3(f, ub, vb, y0), Q3(f, ub, vb, hb), Q3(f, ua, va, ha), wc, n, [rib(d0), rib(d0 + l), rib(d0 + l), rib(d0)]);
    };
    wall(u0, v0, u1, v0, hA, hA, [f.uz, 0, -f.ux], 0);
    wall(u1, v1, u0, v1, hB, hB, [-f.uz, 0, f.ux], 0);
    for (const [u, sg] of [[u0, -1], [u1, 1]]) {
      const n = [f.ux * sg, 0, f.uz * sg];
      wall(u, v0, u, v1, hA, hB, n, 0);
      if (gable) roofGeo.tri(Q3(f, u, v0, hA), Q3(f, u, v1, hA), Q3(f, u, vm, hR), wc, n, rib(0), rib(v1 - v0), rib(vm - v0));
    }
    // sheet roof with a small overhang; ribs run downslope
    const o = 0.3, U0 = u0 - o, U1 = u1 + o;
    const sheet = (va, vb, ha, hb) => {
      const a = Q3(f, U0, va, ha), b = Q3(f, U1, va, ha), c = Q3(f, U1, vb, hb), d = Q3(f, U0, vb, hb);
      roofGeo.quad(a, b, c, d, rc, triN(a, b, c), [rib(0), rib(U1 - U0), rib(U1 - U0), rib(0)]);
    };
    const sl = (hB - hA) / (v1 - v0);
    if (gable) { sheet(v0 - o, vm, hA - 0.9 / (vm - v0) * o, hR); sheet(vm, v1 + o, hR, hA - 0.9 / (vm - v0) * o); }
    else sheet(v0 - o, v1 + o, hA - sl * o, hB + sl * o);
    return gable ? 0.9 + wh : wh + 0.6;
  };
  const PAL = {
    campus: ['#d8cfc0', '#c9a48b', '#b8705a', '#e9e4da', '#c4b5a0', '#a86d5d'],
    dorm: ['#e2d4bd', '#cdb79c', '#d9c9b5'],
    // 二丁掛 tile colours: off-white, light grey, brick red, dark brown, grey-blue
    town: ['#d6d2c8', '#bfb8aa', '#e0d6c2', '#a8a8a0', '#cfc4b4', '#b9b0a6', '#d9cdbd', '#c7cfd3', '#e6dccb', '#b7a99a', '#a8604c', '#b06a52', '#7a5a48', '#8a6a55', '#8c9aa6', '#9aa6b0'],
    commercial: ['#9fa6ad', '#c0c4c8', '#b0b6a8'],
    church: ['#f0ece2', '#e9e2d0'],
    small: ['#dddddd'],
  };
  // OSM building:colour / building:material (rare in this area) override the palette
  const MAT_COL = { brick: '#a65a43', concrete: '#bdbab3', glass: '#9fb4c2', metal: '#9aa0a6', stone: '#c9c1b2', wood: '#9a7650', plaster: '#e3dccd', tiles: '#cdb9a4' };
  const NAMED_COL = { white: '#eeeeea', grey: '#a8a8a4', gray: '#a8a8a4', red: '#a85848', brown: '#8a6a50', beige: '#e0d2b4', yellow: '#e2cf8a', blue: '#8fa6bf', black: '#444444' };
  const ROOF_MAT_COL = { roof_tiles: '#9a4a3a', tile: '#9a4a3a', tiles: '#9a4a3a', metal: '#7d8a94', metal_sheet: '#7d8a94', concrete: '#9a9890', asphalt: '#5a5a5a', glass: '#8aa4b4', grass: '#5d7d44', slate: '#5a6068', wood: '#7a5a3c' };
  const hexOrNamed = v => {
    const c = (v || '').trim().toLowerCase();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(c)) return c;
    return NAMED_COL[c] || null;
  };
  const matKey = b => MAT_KEY[(b.material || '').trim().toLowerCase()] || null;
  const osmCol = b => hexOrNamed(b.colour) || MAT_COL[matKey(b)] || null;
  const osmRoofCol = b => hexOrNamed(b.roofColour) || ROOF_MAT_COL[(b.roofMaterial || '').trim().toLowerCase()] || null;
  // pitched roofs from OSM roof:shape; returns false for flat / unsupported
  const triN = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    if (n[1] < 0) n = n.map(v => -v);
    const l = Math.hypot(...n) || 1; return n.map(v => v / l);
  };
  const rtri = (a, b, c, cl) => roofGeo.tri(a, b, c, cl, triN(a, b, c));
  const pitchedRoof = (b, pts, h, rc, wc) => {
    const shape = (b.roof || '').trim().toLowerCase();
    if (!shape || shape === 'flat' || b.holes) return false;
    // footprint frame along the longest edge
    let li = 0, ll = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > ll) { ll = l; li = i; } }
    const a0 = pts[li], a1 = pts[(li + 1) % pts.length];
    const ux = (a1[0] - a0[0]) / ll, uz = (a1[1] - a0[1]) / ll;
    let v0 = 1e9, v1 = -1e9;
    for (const p of pts) { const v = (p[0] - a0[0]) * -uz + (p[1] - a0[1]) * ux; v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const rise = b.roofH || Math.min(6, Math.max(1.2, (v1 - v0) * 0.3));
    const P = (p, y) => [p[0], y, p[1]];
    if (pts.length === 4 && (shape === 'gabled' || shape === 'skillion')) {
      const [p0, p1, p2, p3] = [0, 1, 2, 3].map(k => pts[(li + k) % 4]);
      if (shape === 'gabled') {
        const m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], m2 = [(p3[0] + p0[0]) / 2, (p3[1] + p0[1]) / 2];
        rtri(P(p0, h), P(p1, h), P(m1, h + rise), rc); rtri(P(p0, h), P(m1, h + rise), P(m2, h + rise), rc);
        rtri(P(p2, h), P(p3, h), P(m2, h + rise), rc); rtri(P(p2, h), P(m2, h + rise), P(m1, h + rise), rc);
        // gable ends
        roofGeo.tri(P(p1, h), P(p2, h), P(m1, h + rise), wc, [p2[1] - p1[1], 0, p1[0] - p2[0]].map(v => v / (Math.hypot(p2[1] - p1[1], p1[0] - p2[0]) || 1)));
        roofGeo.tri(P(p3, h), P(p0, h), P(m2, h + rise), wc, [p0[1] - p3[1], 0, p3[0] - p0[0]].map(v => v / (Math.hypot(p0[1] - p3[1], p3[0] - p0[0]) || 1)));
      } else {
        rtri(P(p0, h), P(p1, h), P(p2, h + rise), rc); rtri(P(p0, h), P(p2, h + rise), P(p3, h + rise), rc);
        const wn = (a, c) => { const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [(c[1] - a[1]) / l, 0, -(c[0] - a[0]) / l]; };
        roofGeo.tri(P(p1, h), P(p2, h), P(p2, h + rise), wc, wn(p1, p2));
        roofGeo.tri(P(p3, h), P(p0, h), P(p3, h + rise), wc, wn(p3, p0));
        roofGeo.quad(P(p2, h), P(p3, h), P(p3, h + rise), P(p2, h + rise), wc, wn(p2, p3));
      }
      return rise;
    }
    // hipped / pyramidal / dome / other pitched shapes: fan to an apex
    if (shape === 'skillion') return false;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (!pointInPoly(cx, cz, pts)) return false;
    for (let i = 0; i < pts.length; i++) rtri(P(pts[i], h), P(pts[(i + 1) % pts.length], h), [cx, h + rise, cz], rc);
    return rise;
  };
  const tanks = []; const signs = [];
  // building base: lowest ground along the footprint (corners + every 5 m of edge).
  // When the plot drops more than h/2 (low shops on a slope) the base moves to
  // mid-slope so the uphill side isn't buried; walls still reach the low point.
  let footLo = 0;
  const footBase = (pts, h) => {
    let m = Infinity, M = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length], n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 5);
      for (let k = 0; k < n; k++) { const y = H(a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n); if (y < m) m = y; if (y > M) M = y; }
    }
    if (m === Infinity) { footLo = 0; return 0; }
    footLo = m;
    return M - m > h / 2 ? (m + M) / 2 : m;
  };
  world.buildings = data.buildings;
  data.buildings.forEach((b, bi) => {
    const pts = b.pts; const h = b.h;
    const base = b.base = footBase(pts, h); const foot = footLo - 0.5;
    if (b.skip) {
      if (b.name) world.named[b.name] = { x: pts.reduce((s, p) => s + p[0], 0) / pts.length, z: pts.reduce((s, p) => s + p[1], 0) / pts.length, h: b.labelH || h, base, b };
      return;
    }
    const pal = PAL[b.kind] || PAL.town;
    const pick = pal[Math.floor(rnd() * pal.length)];
    const tint = col(osmCol(b) || pick);
    // per-building stream for the new extras, so the shared rnd sequence
    // (palette, stalls, lamps...) stays as it was
    const rb = mulberry32(hashStr(String(b.id || bi)));
    const civic = b.kind === 'campus' || b.kind === 'dorm' || b.kind === 'commercial' || b.kind === 'church';
    const mk = matKey(b);
    // whole window rows per storey so the top floor isn't cut in half
    const floors = b.floors || Math.max(1, Math.round((h - 0.6) / 3.3));
    let style;
    if (civic) {
      const q = rb();
      style = mk || b.kind === 'church' || b.kind === 'dorm' ? 'campus' : q < 0.22 && floors >= 3 ? 'glass' : q < 0.4 && b.kind === 'campus' ? 'concrete' : 'campus';
    } else style = floors >= 5 ? 'apt' : rb() < 0.3 ? 'wash' : 'town';
    const g = wallFor(style, mk);
    // outer ring is CCW, courtyard rings CW, so the same normal faces outwards
    const rings = b.holes ? [pts, ...b.holes] : [pts];
    const bay = civic ? 3.6 : 3.0;
    let acc = Math.floor(rnd() * 8) * bay;
    const vOff = Math.floor(rnd() * 8) / 8;
    const vAt = y => vOff + (y - base) / h * floors / 8;
    // water stains at the wall foot, slightly darker under the roof line
    const cLo = tint.map(v => v * 0.7), cTop = tint.map(v => v * 0.88);
    const shops = (b.kind === 'town' || b.kind === 'commercial') && !mk && !style.startsWith('glass');
    let sAcc = Math.floor(rb() * 8) * 4;
    for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
      if (l < 0.05) continue;
      const n = [dz / l, 0, -dx / l]; // outward for CCW (x,z)
      const u0 = acc / (bay * 8), u1 = (acc + l) / (bay * 8); acc += l;
      const top = base + h;
      const shop = shops && ring === pts && l > 2.5 && facesStreet(a, c, n);
      const yS = shop ? Math.min(base + 3.6, top - 0.3) : Math.min(base + 1.2, top);
      // wall foot goes 0.5 m below the lowest ground so slopes never show a gap
      if (shop) {
        // 4 m shop bays; u runs right-to-left along the ring so signs read correctly
        const s0 = -sAcc / 32, s1 = -(sAcc + l) / 32, w0 = (foot - base) / 3.6, w1 = (yS - base) / 3.6; sAcc += l;
        shopGeo.quad([a[0], foot, a[1]], [c[0], foot, c[1]], [c[0], yS, c[1]], [a[0], yS, a[1]], [SHOP_LO, SHOP_LO, SHOP_HI, SHOP_HI], n,
          [[s0, w0], [s1, w0], [s1, w1], [s0, w1]]);
      } else {
        g.quad([a[0], foot, a[1]], [c[0], foot, c[1]], [c[0], yS, c[1]], [a[0], yS, a[1]], [cLo, cLo, tint, tint], n,
          [[u0, vAt(foot)], [u1, vAt(foot)], [u1, vAt(yS)], [u0, vAt(yS)]]);
      }
      if (top > yS + 0.01) g.quad([a[0], yS, a[1]], [c[0], yS, c[1]], [c[0], top, c[1]], [a[0], top, a[1]], [tint, tint, cTop, cTop], n,
        [[u0, vAt(yS)], [u1, vAt(yS)], [u1, vAt(top)], [u0, vAt(top)]]);
      if (ring === pts && b.kind === 'town' && l > 4 && rnd() < 0.22 && signs.length < 260) {
        signs.push({ x: (a[0] + c[0]) / 2 + n[0] * 0.7, z: (a[1] + c[1]) / 2 + n[2] * 0.7, y: base + Math.min(h - 2, 4 + rnd() * 3), rot: Math.atan2(dx, dz) });
      }
    }
    const rc = osmRoofCol(b) ? col(osmRoofCol(b)) : tint.map(v => v * 0.62);
    const top = base + h;
    const pitched = pitchedRoof(b, pts, top, rc, tint.map(v => v * 0.85));
    if (!pitched) roofGeo.flatPoly(pts, top, rc, b.holes);
    // parapet
    if (!pitched) for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
      const n = [dz / l, 0, -dx / l];
      roofGeo.quad([a[0], top, a[1]], [c[0], top, c[1]], [c[0], top + 0.6, c[1]], [a[0], top + 0.6, a[1]], tint.map(v => v * 0.85), n);
      roofGeo.quad([a[0], top + 0.6, a[1]], [c[0], top + 0.6, c[1]], [c[0] - n[0] * 0.25, top + 0.6, c[1] - n[2] * 0.25], [a[0] - n[0] * 0.25, top + 0.6, a[1] - n[2] * 0.25], tint.map(v => v * 0.9), [0, 1, 0]);
    }
    // rooftop extras on flat town roofs: ~45% 鐵皮加蓋, ~30% stair house
    let extraH = 0, tankAt = null;
    if (b.kind === 'town' && !pitched && !b.holes && floors >= 2) {
      const f = obb(pts), L = f.u1 - f.u0, W = f.v1 - f.v0;
      const inside = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [(u0 + u1) / 2, (v0 + v1) / 2]].every(([u, v]) => { const p = f.P(u, v); return pointInPoly(p[0], p[1], pts); });
      const wantShed = rb() < 0.45, wantStair = rb() < 0.3;
      let st = null;
      if (wantStair && L > 6 && W > 4.5) {
        const s = [f.u1 - 3.7, f.u1 - 0.7, f.v0 + 0.7, f.v0 + 3.3];
        if (inside(...s)) {
          st = s; roofBox(f, s, top, 2.9, tint.map(v => v * 0.92), rc); extraH = 2.9;
          const p = f.P((s[0] + s[1]) / 2, (s[2] + s[3]) / 2); tankAt = [p[0], top + 2.3, p[1]];
        }
      }
      if (wantShed && L > 5 && W > 4) {
        let su1 = f.u0 + 0.7 + (L - 1.4) * (0.55 + rb() * 0.4);
        if (st) su1 = Math.min(su1, st[0] - 0.5);
        const s = [f.u0 + 0.7, su1, f.v0 + 0.7, f.v1 - 0.7];
        if (s[1] - s[0] > 3 && inside(...s)) {
          extraH = Math.max(extraH, shed(f, s, top, rb));
          if (!tankAt) {
            // tank on the free end of the roof, or none if the shed fills it
            const p = f.P((su1 + f.u1) / 2, (f.v0 + f.v1) / 2);
            tankAt = f.u1 - su1 > 2.6 && pointInPoly(p[0], p[1], pts) ? [p[0], top, p[1]] : false;
          }
        }
      }
    }
    if (b.kind === 'town' && rnd() < 0.55 && !pitched) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (pointInPoly(cx, cz, pts)) { const p = [cx + (rnd() - .5), top, cz + (rnd() - .5)]; if (tankAt !== false) tanks.push(tankAt || p); }
    }
    collision.addPolygon(pts, Math.max(pitched ? top + pitched : top + 0.6, top + extraH));
    if (b.name) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      world.named[b.name] = { x: cx, z: cz, h, base, b };
    }
  });
  world.tris.walls = 0;
  for (const k in wallGeo) {
    const m = wallGeo[k].mesh(wallMat[k]); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    world.tris.walls += wallGeo[k].tris;
  }
  world.windowMats = Object.values(wallMat);
  if (shopGeo.tris) {
    const t = shopTextures(31);
    const mat = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, vertexColors: true, roughness: 0.7 });
    const m = shopGeo.mesh(mat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    world.shopMat = mat; world.tris.shops = shopGeo.tris;
  }
  {
    const m = roofGeo.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, map: roofTexture() })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    world.tris.roofs = roofGeo.tris;
  }
  // rooftop water tanks (very Taiwan)
  if (tanks.length) {
    const tg = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10); tg.translate(0, 1.6, 0);
    const legs = new THREE.BoxGeometry(1.4, 0.8, 1.4); legs.translate(0, 0.4, 0);
    const im = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: '#d9d4c3' }), tanks.length);
    const im2 = new THREE.InstancedMesh(legs, new THREE.MeshLambertMaterial({ color: '#555' }), tanks.length);
    const M = new THREE.Matrix4();
    tanks.forEach((t, i) => { M.makeTranslation(t[0], t[1] + 0.6, t[2]); im.setMatrixAt(i, M); im2.setMatrixAt(i, M); });
    im.castShadow = true; scene.add(im, im2);
  }
  // vertical shop signs
  {
    const words = [['小吃', '#c8102e', '#fff'], ['飲料', '#0a7d3b', '#fff'], ['早餐', '#ffd23f', '#c8102e'], ['便當', '#ff7a00', '#fff'], ['藥局', '#1a5fd1', '#fff'], ['機車行', '#222', '#ffd23f'], ['影印', '#6b2bd1', '#fff'], ['牛肉麵', '#a3001b', '#ffe9a8'], ['租屋', '#008891', '#fff'], ['滷味', '#5c2a00', '#ffd23f']];
    const geo = new THREE.BoxGeometry(0.22, 2.6, 0.9);
    const per = words.map(() => []);
    signs.forEach((s, i) => per[i % words.length].push(s));
    world.signMats = [];
    words.forEach((w, wi) => {
      if (!per[wi].length) return;
      const tex = signTexture(w[0], w[1], w[2]);
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.2, roughness: 0.6 });
      world.signMats.push(mat);
      const im = new THREE.InstancedMesh(geo, mat, per[wi].length);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
      per[wi].forEach((s, i) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot + Math.PI / 2); P.set(s.x, s.y + 1.3, s.z); M.compose(P, Q, S); im.setMatrixAt(i, M); });
      scene.add(im);
    });
  }
  onProgress(0.6);

  // ---------- road graph ----------
  const nodes = new Map();
  const getNode = (id, p) => { let n = nodes.get(id); if (!n) { n = { id, x: p[0], z: p[1], adj: [] }; nodes.set(id, n); } return n; };
  const inB = p => p[0] > B.minX + 5 && p[0] < B.maxX - 5 && p[1] > B.minZ + 5 && p[1] < B.maxZ - 5;
  for (const r of data.roads) {
    if (!r.nodes || r.nodes.length !== r.pts.length) continue;
    const drive = !!r.drive && !(r.type === 'service' && !r.name);
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (!inB(r.pts[i]) || !inB(r.pts[i + 1])) continue;
      const a = getNode(r.nodes[i], r.pts[i]), b = getNode(r.nodes[i + 1], r.pts[i + 1]);
      if (a === b) continue;
      a.adj.push({ to: b, w: r.w, drive, road: r, fwd: true });
      if (!r.oneway) b.adj.push({ to: a, w: r.w, drive, road: r, fwd: false });
      else b.adj.push({ to: a, w: r.w, drive: false, road: r, fwd: false });
    }
  }
  world.graph = nodes;
  world.driveNodes = [...nodes.values()].filter(n => n.adj.some(e => e.drive));
  world.walkNodes = [...nodes.values()].filter(n => n.adj.length);

  world.nearestRoadPoint = (x, z, driveOnly = false) => {
    let best = null, bd = 1e9;
    for (const r of data.roads) {
      if (driveOnly && !r.drive) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
        let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
        const qx = a[0] + dx * t, qz = a[1] + dz * t, d = Math.hypot(qx - x, qz - z);
        if (d < bd) { bd = d; best = { x: qx, z: qz, dir: Math.atan2(dx, dz), road: r }; }
      }
    }
    return best;
  };
  world.isFree = (x, z, r = 1) => !collision.blocked(x, z, r) && !waterPolys.some(p => inArea(x, z, p));

  // ---------- landmarks ----------
  const poi = name => data.pois.find(p => p.name === name);
  const standard = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  // Clock tower 二一鐘
  const ct = poi('鐘塔');
  if (ct) {
    const g = new THREE.Group();
    const brick = standard('#a4553f'), white = standard('#efe9dc');
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2, 4.4), white); base.position.y = 0;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 16, 3.2), brick); shaft.position.y = 9;
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 3.6), white); band.position.y = 13;
    const head = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.8, 3.8), white); head.position.y = 18.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 4, 4), standard('#5b2b22')); roof.position.y = 22.8; roof.rotation.y = Math.PI / 4;
    g.add(base, shaft, band, head, roof);
    const face = new THREE.MeshStandardMaterial({ map: clockFaceTexture(), roughness: 0.5, emissive: '#fff1c8', emissiveIntensity: 0 });
    world.clockFaceMat = face;
    const hands = [];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), face);
      const a = i * Math.PI / 2;
      f.position.set(Math.sin(a) * 1.92, 18.9, Math.cos(a) * 1.92); f.rotation.y = a; g.add(f);
      const hg = new THREE.Group(); hg.position.copy(f.position).multiplyScalar(1.005); hg.position.y = 18.9; hg.rotation.y = a;
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.03), standard('#111')); hh.geometry.translate(0, 0.42, 0.03);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.03), standard('#111')); mh.geometry.translate(0, 0.62, 0.04);
      const hp = new THREE.Group(); hp.add(hh); const mp = new THREE.Group(); mp.add(mh);
      hg.add(hp, mp); g.add(hg); hands.push([hp, mp]);
    }
    world.clockHands = hands;
    const cb = Hmin(ct.x, ct.z, 2.2);
    g.position.set(ct.x, cb, ct.z);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    collision.addCircle(ct.x, ct.z, 2.6);
    world.named['鐘塔'] = { x: ct.x, z: ct.z, h: 25, base: cb };
  }
  // Old gate 舊校門
  const og = poi('舊校門');
  if (og) {
    const near = world.nearestRoadPoint(og.x, og.z);
    const dir = near ? near.dir : 0;
    const g = new THREE.Group();
    const stone = standard('#cfc6b4');
    for (const s of [-4.2, 4.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, 6.5, 1.3), stone); p.position.set(s, 2.25, 0); g.add(p); collision.addCircle(og.x + Math.cos(dir) * s, og.z - Math.sin(dir) * s, 0.9); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(10.4, 1.4, 1.5), stone); top.position.y = 6.1; g.add(top);
    const lt = labelTexture('中原大學', { size: 60, bg: '#7a2b1f', color: '#ffe9a8' });
    for (const s of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), new THREE.MeshBasicMaterial({ map: lt.tex })); pl.position.set(0, 6.1, 0.76 * s); if (s < 0) pl.rotation.y = Math.PI; g.add(pl); }
    g.position.set(og.x, Hmin(og.x, og.z, 4.5), og.z); g.rotation.y = dir + Math.PI / 2;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
  }
  // Fountain 中原噴水池
  const fp = data.areas.find(a => a.name === '中原噴水池');
  if (fp) {
    const cx = fp.pts.reduce((s, p) => s + p[0], 0) / fp.pts.length, cz = fp.pts.reduce((s, p) => s + p[1], 0) / fp.pts.length;
    const N = 260; const pos = new Float32Array(N * 3); const seeds = []; const fy = H(cx, cz);
    for (let i = 0; i < N; i++) seeds.push([rnd() * Math.PI * 2, 0.6 + rnd() * 0.8, rnd()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#cfe8ff', size: 0.13, transparent: true, opacity: 0.7 }));
    pts.frustumCulled = false; scene.add(pts);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.2, 16), standard('#bbb3a2')); basin.position.set(cx, fy + 0.6, cz); scene.add(basin);
    world.animated.push((t) => {
      for (let i = 0; i < N; i++) {
        const [a, sp, ph] = seeds[i]; const k = (t * 0.6 + ph) % 1;
        const r = k * 2.6 * sp; pos[i * 3] = cx + Math.cos(a) * r; pos[i * 3 + 2] = cz + Math.sin(a) * r;
        pos[i * 3 + 1] = fy + 1.2 + 4.5 * k * (1 - k) * 4 * sp - 0.3;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  // Campaign billboards
  const bTex = bannerTexture();
  const boardMat = new THREE.MeshStandardMaterial({ map: bTex, emissiveMap: bTex, emissive: '#fff', emissiveIntensity: 0.15, roughness: 0.6 });
  const addBoard = (x, z, rot, s = 1) => {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(6 * s, 3 * s, 0.15), [standard('#222'), standard('#222'), standard('#222'), standard('#222'), boardMat, boardMat]);
    board.position.y = 2.2 * s + 1.5 * s;
    for (const sx of [-2.6 * s, 2.6 * s]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4 * s + 1.5 * s + 1), standard('#333', { metalness: 0.6 })); p.position.set(sx, (2.4 * s + 1.5 * s) / 2 - 0.5, 0); g.add(p); }
    g.add(board); g.position.set(x, Hmin(x, z, 2.6 * s), z); g.rotation.y = rot;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    collision.addCircle(x + Math.cos(rot) * 2.6 * s, z - Math.sin(rot) * 2.6 * s, 0.3);
    collision.addCircle(x - Math.cos(rot) * 2.6 * s, z + Math.sin(rot) * 2.6 * s, 0.3);
  };
  world.addBoard = addBoard;

  // Night market stalls 中原夜市
  // centre of OSM relation 13287977 (中原夜市), see tools/build_map.py
  world.nightMarket = data.nightMarket ? { x: data.nightMarket.x, z: data.nightMarket.z } : { x: -200, z: 280 };
  {
    const nm = world.nightMarket;
    const stallTop = new THREE.BoxGeometry(3.0, 0.3, 2.6);
    const stallBody = new THREE.BoxGeometry(2.5, 1.0, 1.8);
    const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#d62828', '#ffffff', '#1d3557'];
    const spots = [];
    for (const r of data.roads) {
      if (!r.drive) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = 2; s < l; s += 3.4) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l;
          if (Math.hypot(x - nm.x, z - nm.z) > 85) continue;
          for (const side of [1, -1]) {
            const nx = -dz / l * side, nz = dx / l * side;
            const px = x + nx * (r.w / 2 + 1.5), pz = z + nz * (r.w / 2 + 1.5);
            if (rnd() < 0.8 && !collision.blocked(px, pz, 1.5) && !spots.some(q => Math.hypot(q[0] - px, q[1] - pz) < 3)) spots.push([px, pz, Math.atan2(dx, dz), nx, nz]);
          }
        }
      }
    }
    // unlit canopies so the market glows at night
    const top = new THREE.InstancedMesh(stallTop, new THREE.MeshBasicMaterial({ color: '#ffffff' }), spots.length);
    const body = new THREE.InstancedMesh(stallBody, new THREE.MeshStandardMaterial({ color: '#a7a9ac', roughness: 0.4, metalness: 0.5, emissive: '#ffcf8a', emissiveIntensity: 0 }), spots.length);
    const backG = new THREE.BoxGeometry(2.9, 2.2, 0.06); backG.translate(0, 1.4, -1.25);
    const back = new THREE.InstancedMesh(backG, new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.9 }), spots.length);
    const lantern = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff3b2f' }), spots.length * 2);
    world.stallBodyMat = body.material;
    // warm glow on the street
    const gg = new Geo(true); gg.disc(nm.x, nm.z, 80, 0.07, [1, 1, 1], 40);
    const glow = gg.mesh(new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    glow.renderOrder = layerOrder++; scene.add(glow);
    world.marketGlow = glow.material;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r, onx, onz], i) => {
      const y = Hmin(x, z, 1.3);
      Q.setFromAxisAngle(Y, r);
      P.set(x, y + 2.5, z); M.compose(P, Q, S); top.setMatrixAt(i, M); top.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      P.set(x, y + 0.5, z); M.compose(P, Q, S); body.setMatrixAt(i, M);
      // back panel faces the road: stall local -z points away from the street side
      const Qb = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(-onx, -onz));
      P.set(x, y, z); M.compose(P, Qb, S); back.setMatrixAt(i, M);
      const ox = Math.cos(r) * 1.3, oz = -Math.sin(r) * 1.3;
      P.set(x + ox, y + 2.15, z + oz); M.compose(P, Q, S); lantern.setMatrixAt(i * 2, M);
      P.set(x - ox, y + 2.15, z - oz); M.compose(P, Q, S); lantern.setMatrixAt(i * 2 + 1, M);
      collision.addCircle(x, z, 1.1);
    });
    top.castShadow = true; body.castShadow = true; back.castShadow = true;
    scene.add(top, body, lantern, back);
    world.lanternMat = lantern.material;
  }
  onProgress(0.7);

  // ---------- street lamps ----------
  {
    const spots = [];
    for (const r of data.roads) {
      if (!r.drive || !r.name || r.type === 'service') continue;
      let acc = 0;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = (30 - acc % 30); s < l; s += 30) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l;
          const nx = -dz / l, nz = dx / l, side = spots.length % 2 ? 1 : -1;
          const px = x + nx * side * (r.w / 2 + 0.6), pz = z + nz * side * (r.w / 2 + 0.6);
          if (!collision.blocked(px, pz, 0.5)) spots.push([px, pz, Math.atan2(-nx * side, -nz * side)]);
        }
        acc += l;
      }
    }
    const pole = new THREE.CylinderGeometry(0.09, 0.12, 7, 6); pole.translate(0, 3.5, 0);
    const arm = new THREE.BoxGeometry(0.1, 0.1, 1.6); arm.translate(0, 7, 0.8);
    const head = new THREE.BoxGeometry(0.35, 0.15, 0.6); head.translate(0, 6.9, 1.5);
    const poleM = new THREE.InstancedMesh(pole, standard('#4a4f55', { metalness: 0.5 }), spots.length);
    const armM = new THREE.InstancedMesh(arm, standard('#4a4f55'), spots.length);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#333', emissive: '#ffd9a0', emissiveIntensity: 0 });
    const headM = new THREE.InstancedMesh(head, lampMat, spots.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r], i) => { Q.setFromAxisAngle(Y, r); P.set(x, H(x, z) - 0.1, z); M.compose(P, Q, S); poleM.setMatrixAt(i, M); armM.setMatrixAt(i, M); headM.setMatrixAt(i, M); collision.addCircle(x, z, 0.2); });
    poleM.castShadow = true;
    scene.add(poleM, armM, headM);
    world.lampMat = lampMat;
    // light pools on the ground (cheap fake lighting at night)
    const pool = new THREE.CircleGeometry(5, 16); pool.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const poolM = new THREE.InstancedMesh(pool, poolMat, spots.length);
    const N = new THREE.Vector3();
    spots.forEach(([x, z, r], i) => {
      // tilt each pool to the local slope
      const px = x + Math.sin(r) * 1.5, pz = z + Math.cos(r) * 1.5;
      N.set(H(px - 2, pz) - H(px + 2, pz), 4, H(px, pz - 2) - H(px, pz + 2)).normalize();
      Q.setFromUnitVectors(Y, N); P.set(px, H(px, pz) + 0.08, pz); M.compose(P, Q, S); poolM.setMatrixAt(i, M);
    });
    poolM.renderOrder = layerOrder++;
    scene.add(poolM);
    world.poolMat = poolMat;
  }

  // ---------- trees ----------
  // broadleaf (shadow-casting, as before), 大王椰子 palms and low shrubs;
  // each type is one InstancedMesh, the new ones don't cast shadows
  {
    const spots = [], palms = [], shrubs = [];
    // low quality: fewer shrubs (they are the bulk of the new vegetation triangles)
    const SH1 = opts.low ? 500 : 1600, SH2 = opts.low ? 700 : 2200;
    const okSpot = (x, z, r) => {
      if (x < B.minX + 3 || x > B.maxX - 3 || z < B.minZ + 3 || z > B.maxZ - 3) return false;
      if (roadGrid.nearest(x, z).d < 1.0) return false;
      if (collision.blocked(x, z, r)) return false;
      if (waterPolys.some(p => inArea(x, z, p))) return false;
      if (sportPolys.some(p => pointInPoly(x, z, p))) return false;
      if (parkingPolys.some(p => inArea(x, z, p))) return false;
      // keep 4 m clear around the custom-built buildings (entrances, guardhouses)
      for (let k = 0; k < 8; k++) { const qx = x + Math.cos(k * 0.785) * 4, qz = z + Math.sin(k * 0.785) * 4; if (collision.reserved.some(p => pointInPoly(qx, qz, p))) return false; }
      return true;
    };
    const tryTree = (x, z, s, palm = false) => {
      if (!okSpot(x, z, palm ? 1.2 : 2.2)) return;
      (palm ? palms : spots).push([x, z, s]);
      collision.addCircle(x, z, palm ? 0.3 : 0.35);
    };
    const polyBox = (pts) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } return [a, b, c, d]; };
    // campus footways first: regular rows every 8 m on both sides, some rows palms
    data.roads.forEach((r, ri) => {
      if (r.type !== 'footway' || !world.inCampus(r.pts[0][0], r.pts[0][1])) return;
      const palm = hashStr('palm' + ri) % 100 < 28;
      let acc = -2; // first tree 2 m in, then a steady 8 m pitch across bends
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        if (l < 0.5) continue;
        const nx = -dz / l, nz = dx / l;
        for (let s = acc < 0 ? -acc : (8 - acc % 8) % 8; s < l - 1; s += 8) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l;
          for (const side of [-1, 1]) tryTree(x + nx * side * (r.w / 2 + 1.5), z + nz * side * (r.w / 2 + 1.5), palm ? 0.9 + rnd() * 0.25 : 0.85 + rnd() * 0.3, palm);
        }
        acc += l;
      }
    });
    for (const p of greenPolys) {
      const [x0, z0, x1, z1] = polyBox(p);
      const n = Math.min(400, Math.floor((x1 - x0) * (z1 - z0) / 140));
      for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (inArea(x, z, p)) tryTree(x, z, 0.8 + rnd() * 0.7, rnd() < 0.08); }
    }
    for (const ring of data.campus) {
      const [x0, z0, x1, z1] = polyBox(ring);
      for (let i = 0; i < 1100; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (pointInPoly(x, z, ring)) tryTree(x, z, 0.8 + rnd() * 0.8); }
    }
    // roadside trees on the bigger roads (on the sidewalk)
    for (const r of data.roads) {
      if (!(r.type === 'tertiary' || r.type === 'secondary')) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = 4; s < l; s += 11) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l; const nx = -dz / l, nz = dx / l;
          for (const side of [-1, 1]) if (rnd() < 0.6) tryTree(x + nx * side * (r.w / 2 + 2.2), z + nz * side * (r.w / 2 + 2.2), 0.8 + rnd() * 0.5);
        }
      }
    }
    // shrubs along campus building walls and inside parks (no collision)
    for (const bd of data.buildings) {
      if (!(bd.kind === 'campus' || bd.kind === 'dorm' || bd.kind === 'church') || bd.skip) continue;
      const pts = bd.pts;
      for (let i = 0; i < pts.length && shrubs.length < SH1; i++) {
        const a = pts[i], c = pts[(i + 1) % pts.length], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
        if (l < 3) continue;
        const nx = dz / l, nz = -dx / l;
        for (let s = 1.5; s < l - 1; s += 2.6) {
          if (rnd() < 0.45) continue;
          const x = a[0] + dx * s / l + nx * 1.4, z = a[1] + dz * s / l + nz * 1.4;
          if (okSpot(x, z, 0.6)) shrubs.push([x, z, 0.8 + rnd() * 0.6]);
        }
      }
    }
    for (const p of greenPolys) {
      const [x0, z0, x1, z1] = polyBox(p);
      const n = Math.min(120, Math.floor((x1 - x0) * (z1 - z0) / 400));
      for (let i = 0; i < n && shrubs.length < SH2; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (inArea(x, z, p) && okSpot(x, z, 0.8)) shrubs.push([x, z, 0.9 + rnd() * 0.8]); }
    }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
    {
      const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 3, 6); trunkG.translate(0, 1.5, 0);
      const crownG = new THREE.IcosahedronGeometry(2.2, 0); crownG.translate(0, 4.4, 0);
      const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: '#5a4030' }), spots.length);
      const crown = new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), spots.length);
      const greens = ['#3f6b2f', '#4c7a35', '#2f5a2a', '#5a8a3a', '#3b6e3e', '#6b8f3a'];
      spots.forEach(([x, z, s], i) => {
        Q.setFromAxisAngle(Y, rnd() * 6.28); S.set(s, s * (0.9 + rnd() * 0.4), s); P.set(x, H(x, z) - 0.15, z); M.compose(P, Q, S);
        trunk.setMatrixAt(i, M); crown.setMatrixAt(i, M); crown.setColorAt(i, C.set(greens[Math.floor(rnd() * greens.length)]));
      });
      crown.castShadow = true; trunk.castShadow = true; crown.receiveShadow = true;
      scene.add(trunk, crown);
    }
    if (palms.length) {
      // tall pale trunk, green crownshaft, a ring of drooping fronds
      const trunkG = new THREE.CylinderGeometry(0.2, 0.28, 11, 7); trunkG.translate(0, 5.5, 0);
      const shaftG = new THREE.CylinderGeometry(0.2, 0.21, 1.6, 7); shaftG.translate(0, 11.8, 0);
      // fronds are drawn from both sides with upward normals so the canopy
      // reads as lit foliage from below as well (FrontSide, no flip)
      const fp = [], fn = [];
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2 + (k % 2) * 0.2, ca = Math.cos(a), sa = Math.sin(a), up = k % 2 ? 0.5 : 0;
        const b = [0, 12.4, 0], m1 = [ca * 1.7 - sa * 0.5, 13.1 + up, sa * 1.7 + ca * 0.5], m2 = [ca * 1.7 + sa * 0.5, 13.1 + up, sa * 1.7 - ca * 0.5], t = [ca * 3.4, 11.6 + up, sa * 3.4];
        fp.push(...b, ...m1, ...m2, ...m1, ...t, ...m2, ...b, ...m2, ...m1, ...m1, ...m2, ...t);
        const nr = [ca * 0.35, 1, sa * 0.35].map(q => q / 1.06);
        for (let q = 0; q < 12; q++) fn.push(...nr);
      }
      const frondG = new THREE.BufferGeometry(); frondG.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); frondG.setAttribute('normal', new THREE.Float32BufferAttribute(fn, 3));
      const geo = mergeGeometries([trunkG.toNonIndexed(), shaftG.toNonIndexed(), frondG].map((g, gi) => {
        const n = g.attributes.position.count, cc = new Float32Array(n * 3), c = col(['#b9b3a6', '#6f8f4a', '#527d35'][gi]);
        for (let i = 0; i < n; i++) cc.set(c, i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); g.deleteAttribute('uv'); return g;
      }));
      const palm = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), palms.length);
      palms.forEach(([x, z, s], i) => {
        Q.setFromAxisAngle(Y, rnd() * 6.28); S.set(s, s * (0.85 + rnd() * 0.3), s); P.set(x, H(x, z) - 0.15, z); M.compose(P, Q, S);
        palm.setMatrixAt(i, M);
      });
      palm.castShadow = false; palm.receiveShadow = true;
      scene.add(palm);
    }
    if (shrubs.length) {
      const g = new THREE.IcosahedronGeometry(1, 0); g.scale(1, 0.62, 1); g.translate(0, 0.45, 0);
      const sh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), shrubs.length);
      const sg = ['#3d6a2c', '#4a7a33', '#567f36', '#35602b'];
      shrubs.forEach(([x, z, s], i) => {
        Q.setFromAxisAngle(Y, rnd() * 6.28); S.set(s * (0.9 + rnd() * 0.5), s, s * (0.9 + rnd() * 0.5)); P.set(x, H(x, z) - 0.1, z); M.compose(P, Q, S);
        sh.setMatrixAt(i, M); sh.setColorAt(i, C.set(sg[i % sg.length]));
      });
      sh.castShadow = false; sh.receiveShadow = true;
      scene.add(sh);
    }
    world.treeCount = spots.length + palms.length;
    world.shrubCount = shrubs.length;
  }
  onProgress(0.85);

  // ---------- labels ----------
  const labelNames = Object.keys(world.named).filter(n => {
    const b = world.named[n].b; return !b || ['campus', 'dorm', 'church'].includes(b.kind) || n === '大潤發';
  });
  const seenLbl = new Set();
  for (const n of labelNames) {
    if (seenLbl.has(n)) continue; seenLbl.add(n);
    const it = world.named[n];
    const s = makeLabel(n, { height: n === '資訊管理學系' ? 4.2 : 2.6, color: n === '資訊管理學系' ? '#ffd23f' : '#fff', border: n === '資訊管理學系' ? '#ffd23f' : null });
    s.position.set(it.x, (it.base ?? H(it.x, it.z)) + it.h + 4, it.z);
    scene.add(s); world.labels.push(s);
  }
  for (const n of ['中原大學大草坪', '中原噴水池', '中原埤塘生態公園', '普忠公園']) {
    const p = poi(n); if (!p) continue;
    const s = makeLabel(n, { height: 2.2, color: '#c9f5b0' }); s.position.set(p.x, H(p.x, p.z) + 5, p.z); scene.add(s); world.labels.push(s);
  }
  {
    const s = makeLabel('中原夜市', { height: 4, color: '#ffd23f', bg: 'rgba(160,20,20,0.85)', icon: '🏮' });
    s.position.set(world.nightMarket.x, H(world.nightMarket.x, world.nightMarket.z) + 9, world.nightMarket.z); scene.add(s); world.labels.push(s);
  }
  onProgress(0.95);

  world.update = (t, night, clockMin, playerPos) => {
    for (const f of world.animated) f(t);
    for (const m of world.windowMats) m.emissiveIntensity = night * 1.1;
    if (world.shopMat) world.shopMat.emissiveIntensity = night * 0.9;
    if (world.lampMat) world.lampMat.emissiveIntensity = night * 3;
    if (world.poolMat) world.poolMat.opacity = night * 0.22;
    if (world.marketGlow) world.marketGlow.opacity = night * 0.12;
    if (world.stallBodyMat) world.stallBodyMat.emissiveIntensity = night * 0.18;
    if (world.signMats) for (const m of world.signMats) m.emissiveIntensity = 0.15 + night * 0.9;
    if (world.clockFaceMat) world.clockFaceMat.emissiveIntensity = night * 0.6;
    if (world.clockHands) {
      const h = (clockMin / 60) % 12, mm = clockMin % 60;
      for (const [hp, mp] of world.clockHands) { hp.rotation.z = -h / 12 * Math.PI * 2; mp.rotation.z = -mm / 60 * Math.PI * 2; }
    }
    if (playerPos) for (const l of world.labels) {
      const d = Math.hypot(l.position.x - playerPos.x, l.position.z - playerPos.z);
      l.visible = d < 230;
    }
  };
  return world;
}

// ---------- distant skyline + SE ridge (backdrop) ----------
// Low-poly silhouettes 1.5-2.2 km out. Like the sky dome the group follows the
// camera (no parallax, never beyond camera.far); no fog, shadows or collision.
// update(fogColor) recolours them every frame so they sit in the haze.
export function buildSkyline(scene, count = 180) {
  const rnd = mulberry32(777);
  const p = [], c = [];
  // vertex shade: 1 at the top, BOT at the foot (fades into the haze)
  const BOT = 1 / 0.7;
  const v = (x, y, z, s) => { p.push(x, y, z); const k = y < 0 ? BOT : s; c.push(k, k, k); };
  const quad = (a, b, q, d, s) => { v(...a, s); v(...b, s); v(...q, s); v(...a, s); v(...q, s); v(...d, s); };
  const Y0 = -120;
  for (let i = 0; i < count; i++) {
    const ang = rnd() * Math.PI * 2, r = 1500 + rnd() * 500;
    const hh = 18 + Math.pow(rnd(), 2) * 75, w = 16 + rnd() * 28, d = 12 + rnd() * 18, rot = rnd() * Math.PI;
    const cx = Math.cos(ang) * r, cz = Math.sin(ang) * r, ca = Math.cos(rot), sa = Math.sin(rot);
    const C = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, z]) => [cx + (x * ca - z * sa) / 2, cz + (x * sa + z * ca) / 2]);
    for (let k = 0; k < 4; k++) {
      const a = C[k], b = C[(k + 1) % 4], s = 0.86 + ((k + i) % 3) * 0.06;
      quad([a[0], Y0, a[1]], [b[0], Y0, b[1]], [b[0], hh, b[1]], [a[0], hh, a[1]], s);
    }
    quad([C[0][0], hh, C[0][1]], [C[1][0], hh, C[1][1]], [C[2][0], hh, C[2][1]], [C[3][0], hh, C[3][1]], 1.05);
  }
  const mk = (pos, col, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.castShadow = false; m.receiveShadow = false; m.matrixAutoUpdate = true;
    return m;
  };
  const group = new THREE.Group();
  const towers = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide });
  group.add(mk(p, c, towers));
  // hills to the south-east (x east, z south: angle ~ +45 deg)
  const ridge = (r, h0, h1, a0, a1, seed, bot) => {
    const rr = mulberry32(seed), ph = [rr() * 6, rr() * 6, rr() * 6], pos = [], cc = [], N = 70;
    const hAt = t => {
      const n = 0.5 + 0.25 * Math.sin(t * 9 + ph[0]) + 0.15 * Math.sin(t * 23 + ph[1]) + 0.1 * Math.sin(t * 51 + ph[2]);
      const taper = Math.min(1, t * 5, (1 - t) * 5);
      return (h0 + (h1 - h0) * n) * taper;
    };
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N, b0 = a0 + (a1 - a0) * t0, b1 = a0 + (a1 - a0) * t1;
      const p0 = [Math.cos(b0) * r, Math.sin(b0) * r], p1 = [Math.cos(b1) * r, Math.sin(b1) * r];
      const y0 = hAt(t0), y1 = hAt(t1);
      pos.push(p0[0], Y0, p0[1], p1[0], Y0, p1[1], p1[0], y1, p1[1], p0[0], Y0, p0[1], p1[0], y1, p1[1], p0[0], y0, p0[1]);
      for (const k of [bot, bot, 1, bot, 1, 1]) cc.push(k, k, k);
    }
    return [pos, cc];
  };
  const far = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide });
  const near = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide });
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
