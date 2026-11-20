import * as THREE from 'three';
import { CollisionWorld, SegGrid, pointInPoly } from './collision.js';
import { H, Hmin, terrainGrid, addBridge, clearBridges, DS } from './terrain.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { buildFurniture } from './furniture.js';
import { groundTex, facadeTex, shopTex, roofTex, corrugatedTex, concreteTex } from './textures.js';
import { plantVegetation } from './vegetation.js';

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
  // alpha: colours carry a 4th (alpha) component
  constructor(drape = false, uvAt = null, alpha = false) { this.p = []; this.n = []; this.c = []; this.uv = []; this.drape = drape; this.uvAt = uvAt; this.alpha = alpha; }
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
  // box in a local frame: centre (x,z), yaw ang, w along ang, d across, y0..y1 (absolute)
  box(x, z, ang, w, d, y0, y1, col, uvS = 3) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (lx, lz) => [x + lx * c - lz * s, z + lx * s + lz * c];
    const pts = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    for (let i = 0; i < 4; i++) {
      const A = pts[i], B = pts[(i + 1) % 4], ex = B[0] - A[0], ez = B[1] - A[1], l = Math.hypot(ex, ez) || 1;
      const n = [ez / l, 0, -ex / l];
      if (((A[0] + B[0]) / 2 - x) * n[0] + ((A[1] + B[1]) / 2 - z) * n[2] < 0) { n[0] *= -1; n[2] *= -1; }
      this.quad([A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], col, n, [[0, y0 / uvS], [l / uvS, y0 / uvS], [l / uvS, y1 / uvS], [0, y1 / uvS]]);
    }
    this.quad([pts[0][0], y1, pts[0][1]], [pts[1][0], y1, pts[1][1]], [pts[2][0], y1, pts[2][1]], [pts[3][0], y1, pts[3][1]], col, UP,
      pts.map(p => [p[0] / uvS, p[1] / uvS]));
  }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, this.alpha ? 4 : 3));
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
//   arcade   one round-arched opening per bay and storey (懷恩樓 loggias)
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
  arcade: [12, 12, 40, 52],
};
// round-arched opening inside the arcade window rect (open at the bottom)
const archPath = (g, x, y, k = 1) => {
  const [wx, wy, ww, wh] = WIN.arcade, r = ww / 2 * k;
  g.beginPath(); g.moveTo(x + wx * k, y + (wy + wh) * k); g.lineTo(x + wx * k, y + wy * k + r);
  g.arc(x + (wx + ww / 2) * k, y + wy * k + r, r, Math.PI, 0); g.lineTo(x + (wx + ww) * k, y + (wy + wh) * k); g.closePath();
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
      if (style === 'arcade') {
        // deep loggia: dark opening, lit soffit band, brick voussoir ring
        g.fillStyle = '#3e3832'; archPath(g, x, y); g.fill();
        g.fillStyle = 'rgba(255,240,215,0.18)'; g.fillRect(x + wx + 3, y + wy + ww / 2, ww - 6, 6);
        g.fillStyle = '#5d554c'; g.fillRect(x + wx + 4, y + wy + wh - 18, ww - 8, 18);
        g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 2.5; archPath(g, x, y); g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, y + S - 3, S, 3);
        continue;
      }
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
      if (style === 'arcade') { archPath(g, ix * E, iy * E, k); g.fill(); continue; }
      g.fillRect(ix * E + wx * k, iy * E + wy * k, ww * k, wh * k);
    }
  });
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
// 補建街區 ground (tools/block_survey.json): 256 px = 24 m of fields, three
// 8 m plots with crop rows and a pale 田埂 between them; bare soil for dirt
const farmTex = () => noiseTex(256, 5101, (g, S, r) => {
  const P = S / 3;
  for (let k = 0; k < 3; k++) {
    const v = 200 + Math.floor(r() * 40); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(k * P, 0, P, S);
    g.fillStyle = 'rgba(0,0,0,0.13)';
    for (let x = k * P + 4; x < (k + 1) * P - 4; x += 8.5) g.fillRect(x, 0, 3, S);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(k * P + r() * P, r() * S, 2, 3); }
  }
  g.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) g.fillRect(k * P - 3, 0, 6, S);
  g.fillRect(0, S / 2 - 3, S, 6);
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

// soft vertical gradient used for the street-lamp light cones
function coneTexture() {
  return canvasTex(8, 128, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.25, 'rgba(255,200,130,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = '#000'; g.fillRect(0, 0, 8, 128); g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
  }, false);
}

// big low-frequency variation so tiled ground textures don't look tiled
function addMacro(m, scale, amt) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.macroMap = { value: groundTex.macro() };
    sh.vertexShader = 'varying vec2 vMacroW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMacroW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D macroMap; varying vec2 vMacroW;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float mac = texture2D(macroMap, vMacroW * ${scale.toFixed(5)}).r;
      float mac2 = texture2D(macroMap, vMacroW * ${(scale * 6.1).toFixed(5)} + 0.37).r;
      diffuseColor.rgb *= mix(${(1 - amt).toFixed(3)}, ${(1 + amt * 0.6).toFixed(3)}, mac) * mix(0.9, 1.07, mac2);`);
  };
  m.customProgramCacheKey = () => 'macro' + scale + '_' + amt;
}

// PBR facade style per campus building, from reference photos (懷恩樓 brown brick, 科學館 terracotta +
// white bands, 土木館 speckled granite, 工學館 grey-brown tiles ...); unknown ones get a deterministic pick
const STYLE_BY_NAME = {
  '懷恩樓': 'tan', '工學館': 'tan', '科學館': 'red', '土木館': 'granite', '理學大樓': 'red', '化學館': 'tan', '管理大樓': 'white',
  '自強商學大樓': 'white', '商設館': 'white', '智信樓': 'brick', '莊敬大樓': 'white', '建築館': 'granite', '祐生建築中心': 'granite',
  '張靜愚紀念圖書館': 'granite', '學生活動中心': 'tan', '全人教育村': 'brick', '電學大樓': 'tan', '力行大樓': 'red', '篤信大樓': 'white',
  '信實樓': 'brick', '恩慈樓': 'brick', '良善樓': 'brick', '喜樂樓': 'brick', '陸華樓': 'white', '維澈樓': 'white', '校史館': 'tan',
  '生物科技館': 'white', '真知教學大樓': 'white', '設計學院': 'granite', '室設系館': 'white', '景觀系館': 'tan', '恩惠堂': 'white', '恩惠堂副堂': 'white',
  '中原大學體育館': 'white', '中原大學室內游泳池': 'white', '薄膜中心': 'white', '熱誠樓A棟': 'brick', '熱誠樓B C棟': 'brick', '林森館': 'tan', '望樓': 'tan',
  '月老宮': 'temple', '桃園白沙屯天上聖母': 'temple', '普忠里福德祠': 'temple', '盧氏宗祠': 'temple', '土地公廟': 'temple', '普仁福德祠(土地公廟)': 'temple',
};
const STYLE_PICK = ['tan', 'red', 'white', 'granite', 'brick'];
const PBR_STYLES = new Set(['tan', 'red', 'granite', 'white', 'brick', 'commercial', 'town', 'temple']);
const strHash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0; return Math.abs(h); };
const mulCol = (c, k) => c.map(v => v * k);

// ---------- world ----------
const AREA_COL = {
  park: '#55803f', grass: '#62924a', pitch: '#4f9446', track: '#b5553f', water: '#3a78a8',
  parking: '#5d6066', construction: '#8e7a5c', school: '#a3a08f', commercial: '#8b8a84',
  industrial: '#7d7b74', residential: null,
  // 補建街區 ground (synthetic areas only)
  farm: '#8e9a5c', dirt: '#9a7b58', wood: '#41633a',
};
const DIRT_COL = { site: '#a8825a', weeds: '#7f7c56' };
const ROAD_LAYER = { footway: 0, path: 0, cycleway: 0, steps: 0, pedestrian: 0, track: 0, service: 1, living_street: 2, residential: 2, unclassified: 3, tertiary: 4, secondary: 5, primary: 6 };

export function buildWorld(scene, data, onProgress = () => { }, opts = {}) {
  const B = data.bounds;
  const rnd = mulberry32(20240034);
  // purely visual extras (PBR upgrade) draw from their own stream so the shared sequence stays as it was
  const rnd2 = mulberry32(777034);
  const quality = opts.quality || (opts.low ? 'low' : 'high');
  const world = { data, bounds: B, labels: [], animated: [], named: {}, tris: {} };
  clearBridges();
  const collision = new CollisionWorld(B, 16);
  const roadGrid = new SegGrid(20);
  world.collision = collision; world.roadGrid = roadGrid;
  collision.reserved = opts.reserved || [];

  const campusRing = data.campus.length ? data.campus.reduce((a, b) => (a.length > b.length ? a : b)) : [];
  world.inCampus = (x, z) => data.campus.some(r => pointInPoly(x, z, r));
  const inReserved = (x, z) => collision.reserved.some(p => pointInPoly(x, z, p));

  // ground layers draw in order without depth writes (no z-fighting)
  let layerOrder = -100;
  // polygonOffset: draped layers sit a few cm above the terrain; keep them in front at distance
  const OFFSET = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };
  const flatMat = (map = null) => new THREE.MeshStandardMaterial({ vertexColors: true, map, depthWrite: false, roughness: 0.9, envMapIntensity: 0.5, ...OFFSET });
  // PBR ground surface (textures.js groundTex) with large-scale macro variation
  const gmat = (tex, o = {}) => {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true, depthWrite: false, map: tex.map || null, normalMap: tex.normalMap || null, roughnessMap: tex.roughnessMap || null,
      roughness: o.roughness ?? 0.95, metalness: 0, envMapIntensity: o.env ?? 0.55, color: o.color || '#ffffff', ...OFFSET,
    });
    if (tex.normalMap) m.normalScale.set(o.ns ?? 1, o.ns ?? 1);
    if (o.macro !== false) addMacro(m, o.macroScale ?? 0.011, o.macroAmt ?? 0.2);
    return m;
  };
  const uvS = s => q => [q[0] / s, q[1] / s];
  const addFlat = (geo, mat, tag) => {
    if (!geo.tris) return null;
    const m = geo.mesh(mat || flatMat()); m.receiveShadow = true; m.renderOrder = layerOrder++; scene.add(m);
    if (tag) world.tris[tag] = (world.tris[tag] || 0) + geo.tris;
    return m;
  };
  const T = groundTex;

  // base ground: terrain grid (MOI DTM) with a skirt out to the horizon
  {
    const g = groundGeometry(B);
    const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 10; uv[i * 2 + 1] = pos.getZ(i) / 10; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const mat = gmat(T.ground(), { macroAmt: 0.28 }); mat.vertexColors = false; mat.depthWrite = true; mat.polygonOffset = false;
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.renderOrder = layerOrder++;
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
    const gConc = new Geo(true, uvS(4)), gAsph = new Geo(true, uvS(8)), gGreen = new Geo(true, uvS(6)), gTrack = new Geo(true, uvS(4)), gWater = new Geo(true, uvS(14)), gLines = new Geo(true);
    const gFarm = new Geo(true), gDirt = new Geo(true, uvS(6));
    const TINT = {
      park: '#e6efd6', grass: '#ffffff', pitch: '#e0ffd8', wood: '#c9d9b6', track: '#ffffff', water: '#ffffff', parking: '#f0f0f0',
      construction: '#ffffff', school: '#e8e4dc', commercial: '#e8e4dc', industrial: '#c9c6c0', dirt: '#ffffff',
    };
    const DIRT_TINT = { site: '#ffffff', weeds: '#c9c7a4' };
    const LINE = col('#e8eee4');
    for (const a of data.areas) {
      const c = AREA_COL[a.kind]; if (!c) continue;
      const k = a.kind;
      const g = k === 'water' ? gWater : k === 'track' ? gTrack : k === 'farm' ? gFarm : k === 'dirt' || k === 'construction' ? gDirt
        : (k === 'park' || k === 'grass' || k === 'pitch' || k === 'wood') ? gGreen : k === 'parking' ? gAsph : gConc;
      // field stripes follow the block's street direction (a.ang, degrees)
      if (k === 'farm') { const t = (a.ang || 0) * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t); gFarm.uvAt = q => [(q[0] * ct + q[1] * st) / 24, (-q[0] * st + q[1] * ct) / 24]; }
      const tint = k === 'farm' ? c : k === 'dirt' ? DIRT_TINT[a.sub] || TINT.dirt : a.name === '中原大學大草坪' ? '#f4fff0' : TINT[k] || '#ffffff';
      g.flatPoly(a.pts, 0.02, col(tint), a.holes);
      // holes ride along on the ring array so inArea() can skip them
      const ring = a.holes ? Object.assign(a.pts.slice(), { holes: a.holes }) : a.pts;
      if (a.kind === 'water') waterPolys.push(ring);
      if (a.synthetic && (a.kind === 'wood' || a.kind === 'grass')) fillGreens.push({ ring, dense: a.kind === 'wood' });
      else if (a.kind === 'park' || a.kind === 'grass') greenPolys.push(ring);
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
    for (const w of data.waterways) for (let i = 0; i < w.pts.length - 1; i++) { gWater.strip(w.pts[i], w.pts[i + 1], w.w, 0.02, col('#ffffff')); gWater.disc(w.pts[i][0], w.pts[i][1], w.w / 2, 0.02, col('#ffffff')); }
    addFlat(gConc, gmat(T.paving(), { macroAmt: 0.25 }), 'areas');
    addFlat(gAsph, gmat(T.asphalt(), { roughness: 1 }), 'areas');
    addFlat(gFarm, flatMat(farmTex()), 'areas');
    addFlat(gDirt, gmat(T.dirt(), { macroAmt: 0.3 }), 'areas');
    addFlat(gGreen, gmat(T.grass(), { macroAmt: 0.3, macroScale: 0.015, env: 0.4 }), 'areas');
    addFlat(gTrack, gmat(T.track(), { macroAmt: 0.1 }), 'areas');
    addFlat(gLines, null, 'areas');
    // water: dark, glossy, reflects the sky; ripples scroll
    const wn = T.waterNormal();
    const wmat = new THREE.MeshStandardMaterial({ color: '#2f4c52', roughness: 0.06, metalness: 0.15, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.3, depthWrite: false, vertexColors: true, ...OFFSET });
    addFlat(gWater, wmat, 'areas');
    world.animated.push((t) => { wn.offset.set(t * 0.012, t * 0.008); });
  }
  world.waterPolys = waterPolys;
  onProgress(0.25);

  // rail
  {
    const g = new Geo(true, uvS(4));
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) { g.strip(r.pts[i], r.pts[i + 1], 4.5, 0.03, col('#b8a898')); g.disc(r.pts[i][0], r.pts[i][1], 2.25, 0.03, col('#b8a898')); }
    addFlat(g, gmat(T.dirt(), { macro: false }), 'rail');
    const g2 = new Geo(true);
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      for (const s of [-0.75, 0.75]) g2.strip([a[0] + nx * s, a[1] + nz * s], [b[0] + nx * s, b[1] + nz * s], 0.12, 0.04, col('#c9c9c9'));
    }
    addFlat(g2, new THREE.MeshStandardMaterial({ vertexColors: true, depthWrite: false, metalness: 0.8, roughness: 0.35, ...OFFSET }), 'rail');
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
  const layers = [...Array(7)].map(() => new Geo(true, uvS(8)));
  const footCampus = new Geo(true, uvS(4)); // campus footways: pavers (footTown = layers[0])
  const walks = new Geo(true, uvS(3)); // sidewalks + curbs, drawn under the carriageways
  const marks = new Geo(true, uvS(4));
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
        // 1 m parapet (護欄) on the deck edge, visual only (collision stays 2D)
        const k = 0.22 / (w / 2), ix = nx * k * sd, iz = nz * k * sd, PAR = col('#b4b0a7');
        deckSides.quad([ax, py + 0.25, az], [bx, qy + 0.25, bz], [bx, qy + 1.0, bz], [ax, py + 1.0, az], PAR, fn);
        deckSides.quad([ax - ix, py, az - iz], [bx - ix, qy, bz - iz], [bx - ix, qy + 1.0, bz - iz], [ax - ix, py + 1.0, az - iz], PAR, fn.map(v => -v));
        deckSides.quad([ax, py + 1.0, az], [bx, qy + 1.0, bz], [bx - ix, qy + 1.0, bz - iz], [ax - ix, py + 1.0, az - iz], col('#9a968d'), UP);
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
  // the PBR asphalt texture carries the dark colour: tints are relative to plain asphalt (#3b3d43)
  const ASPH = col('#3b3d43'), toTint = c => c.map((v, i) => Math.min(1, v / ASPH[i] * 0.86));
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
  const SIDEWALK = col('#ffffff'), CURB = col('#d6d4cf');
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
  // tunnels: building passages stay on the surface; underground ones (layer<0,
  // mostly outside buildings) get no surface strip, only portals where they
  // join the street. They stay in roadGrid / nearestRoadPoint but not in the
  // traffic graph.
  {
    const inBld = (x, z) => data.buildings.some(b => pointInPoly(x, z, b.pts));
    for (const r of data.roads) {
      if (!r.tunnel) continue;
      let n = 0, inside = 0;
      for (let i = 0; i < r.pts.length - 1; i++) for (const t of [0.25, 0.5, 0.75]) {
        const a = r.pts[i], b = r.pts[i + 1]; n++;
        if (inBld(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) inside++;
      }
      r.under = inside * 2 < n;
    }
  }
  const portal = (p, q, w) => {
    const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, ex = dx / l, ez = dz / l, nx = -ez, nz = ex;
    const hw = w / 2 + 0.4, hh = w > 3 ? 4.2 : 2.6, cx = p[0] + ex * 0.3, cz = p[1] + ez * 0.3, y = Hmin(cx, cz, hw);
    if (data.buildings.some(b => pointInPoly(cx, cz, b.pts)) || collision.reserved.some(rp => pointInPoly(cx, cz, rp))) return;
    const C = col('#9b978e'), D = [0.03, 0.03, 0.035], F = [-ex, 0, -ez];
    const P = (o, yy, f = 0) => [cx + nx * o + ex * f, y + yy, cz + nz * o + ez * f];
    deckSides.quad(P(-hw, -0.3, 0.05), P(hw, -0.3, 0.05), P(hw, hh, 0.05), P(-hw, hh, 0.05), D, F);
    deckSides.quad(P(-hw - 1, -0.3), P(-hw, -0.3), P(-hw, hh + 1), P(-hw - 1, hh + 1), C, F);
    deckSides.quad(P(hw, -0.3), P(hw + 1, -0.3), P(hw + 1, hh + 1), P(hw, hh + 1), C, F);
    deckSides.quad(P(-hw, hh), P(hw, hh), P(hw, hh + 1), P(-hw, hh + 1), C, F);
    deckSides.quad(P(-hw - 1, hh + 1), P(hw + 1, hh + 1), P(hw + 1, hh + 1, 0.6), P(-hw - 1, hh + 1, 0.6), C, UP);
  };
  for (const r of data.roads) {
    if (r.under) {
      for (let i = 0; i < r.pts.length - 1; i++) roadGrid.add(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], r.w, r);
      const n = r.pts.length;
      if (n > 1 && hasNodes(r)) {
        if ((nodeUse.get(r.nodes[0]) || 0) >= 2) portal(r.pts[0], r.pts[1], r.w);
        if ((nodeUse.get(r.nodes[n - 1]) || 0) >= 2) portal(r.pts[n - 1], r.pts[n - 2], r.w);
      }
      continue;
    }
    const L = ROAD_LAYER[r.type] ?? 1;
    const g = L === 0 && world.inCampus(r.pts[0][0], r.pts[0][1]) ? footCampus : layers[L]; const c = roadCol(r);
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
  addFlat(walks, gmat(T.sidewalk(), { macroAmt: 0.2 }), 'roads');
  addFlat(layers[0], gmat(T.sidewalk(), { macroAmt: 0.2 }), 'roads');
  addFlat(footCampus, gmat(T.paving(), { macroAmt: 0.2 }), 'roads');
  const asphMat = gmat(T.asphalt(), { roughness: 1, env: 0.7, macroAmt: 0.24 });
  for (let i = 1; i < layers.length; i++) addFlat(layers[i], asphMat, 'roads');
  addFlat(marks, new THREE.MeshStandardMaterial({ vertexColors: true, depthWrite: false, roughness: 0.65, envMapIntensity: 0.6, ...OFFSET }), 'roads');
  if (deckSides.tris) { const conc = concreteTex(); const m = deckSides.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: conc.map, normalMap: conc.normalMap, roughness: 0.85, side: THREE.DoubleSide })); m.receiveShadow = true; m.castShadow = quality !== 'low'; scene.add(m); }
  onProgress(0.4);

  // ---------- buildings ----------
  // one wall mesh per facade (window style + OSM material); material variants
  // are only built when some building actually carries the tag
  const wallMat = {}; const wallGeo = {};
  const SEED = { campus: 7, town: 11, apt: 13, wash: 17, glass: 19, concrete: 23, arcade: 29 };
  // PBR facades (textures.js): colour + normal + roughness/metalness (glass panes reflect the sky)
  const makeWallMat = (t, o = {}) => new THREE.MeshStandardMaterial({
    map: t.map, emissiveMap: t.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, vertexColors: true,
    normalMap: t.normalMap, roughnessMap: t.rm, metalnessMap: t.rm, roughness: 1, metalness: 1, envMapIntensity: o.env ?? 1,
  });
  const wallFor = (style, mat) => {
    const k = mat ? style + ':' + mat : style;
    if (!wallGeo[k] && PBR_STYLES.has(style) && !mat) {
      wallMat[k] = makeWallMat(facadeTex(style));
      wallGeo[k] = new Geo();
    }
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
    // 二丁掛 / 小口磁磚 colours, 20 entries weighted after the Google 街景目視判斷
    // of 力行北街, 中北路, 實踐路 (2024-08 / 2026-05, viewed only): ~70% off-white /
    // cream / light grey (14), ~20% light pink / light brown / light green (4),
    // ~10% dark stone or brick red (2)
    town: ['#e4e0d6', '#d6d2c8', '#e8dfcc', '#ece6d6', '#d9cdbd', '#cfc9bd', '#c7c6c0', '#bfbcb4', '#e0d6c2', '#d2d4d0', '#e6dccb', '#cfc4b4', '#dcd8cf', '#c9c3b8',
      '#e3c9c0', '#d8bfae', '#c9b29b', '#c8d3c0',
      '#7a6a5c', '#a8604c'],
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
      if (shape === 'gabled' && (b.feature || []).includes('gable_row')) {
        // 設計學院: a row of small dark-grey gables (Google 街景目視, 2017-09), ridges
        // across the short side, one every ~7 m along the long edge p0-p1
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), N = Math.max(1, Math.round(len / 7));
        const rr = b.roofH || Math.min(2.4, len / N * 0.32);
        const lp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        for (let i = 0; i < N; i++) {
          const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2;
          const A = lp(p0, p1, t0), B = lp(p0, p1, t1), D = lp(p3, p2, t0), C = lp(p3, p2, t1), MA = lp(p0, p1, tm), MD = lp(p3, p2, tm);
          rtri(P(A, h), P(MA, h + rr), P(MD, h + rr), rc); rtri(P(A, h), P(MD, h + rr), P(D, h), rc);
          rtri(P(MA, h + rr), P(B, h), P(C, h), rc); rtri(P(MA, h + rr), P(C, h), P(MD, h + rr), rc);
          // gable ends on both long walls (outward normal of p0-p1 for a CCW ring)
          const n0 = [(p1[1] - p0[1]) / len, 0, -(p1[0] - p0[0]) / len];
          roofGeo.tri(P(A, h), P(B, h), P(MA, h + rr), wc, n0);
          roofGeo.tri(P(D, h), P(C, h), P(MD, h + rr), wc, n0.map(v => -v));
        }
        return rr;
      }
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
  // named roof extras from overrides.json 'feature' (visual only, merged into roofGeo)
  // vertical cylinder wall (+ optional lid) from S quads
  const cylinder = (cx, cz, y0, hh, r, wc, S = 12, lid = null) => {
    for (let k = 0; k < S; k++) {
      const a0 = k / S * Math.PI * 2, a1 = (k + 1) / S * Math.PI * 2, am = (a0 + a1) / 2;
      const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
      roofGeo.quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y0 + hh, p1[1]], [p0[0], y0 + hh, p0[1]], wc, [Math.cos(am), 0, Math.sin(am)]);
      if (lid) roofGeo.tri([cx, y0 + hh, cz], [p0[0], y0 + hh, p0[1]], [p1[0], y0 + hh, p1[1]], lid, UP);
    }
  };
  const landmarkRoof = (b, pts, top, rise = 0) => {
    const f = obb(pts), L = f.u1 - f.u0, W = f.v1 - f.v0;
    const inside = (u0, u1, v0, v1) => {
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      return [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [um, v0], [um, v1], [u0, vm], [u1, vm], [um, vm]].every(([u, v]) => { const p = f.P(u, v); return pointInPoly(p[0], p[1], pts); });
    };
    // u of the footprint end that lies further west (smaller x) / south (larger z)
    const westU = f.P(f.u0, (f.v0 + f.v1) / 2)[0] < f.P(f.u1, (f.v0 + f.v1) / 2)[0] ? -1 : 1;
    const southU = f.P(f.u0, (f.v0 + f.v1) / 2)[1] > f.P(f.u1, (f.v0 + f.v1) / 2)[1] ? -1 : 1;
    const um0 = (f.u0 + f.u1) / 2, vm0 = (f.v0 + f.v1) / 2;
    // first spot along u (fractions of L from the middle, toward `side`) where a
    // 2r square fits across the widest band of v
    const spotAlong = (side, fr, r) => {
      for (const k of fr) for (const dv of [0, -0.15, 0.15, -0.3, 0.3]) {
        const u = um0 + side * k * L, v = vm0 + dv * W;
        if (inside(u - r, u + r, v - r, v + r)) return [u, v];
      }
      return null;
    };
    if (b.feature.includes('observatory')) {
      // 科學館: Google 街景目視（2021-02 大草坪空拍）puts the white dome on a raised
      // stair/core tower in the west-middle part of the roof, not at an end
      const r = Math.max(2.5, Math.min(4, Math.min(L, W) * 0.12)), cr = r + 1.2, coreH = 3.3;
      const at = spotAlong(westU, [0.18, 0.12, 0.24, 0.06, 0.3, 0], cr);
      if (at) {
        const [cx, cz] = f.P(at[0], at[1]), y0 = top + 0.6 + coreH, dh = 1.6, S = 12, R = 4;
        roofBox(f, [at[0] - cr, at[0] + cr, at[1] - cr, at[1] + cr], top, coreH + 0.6, col('#9a4b3c').map(v => v * 0.95), col('#9a9890'));
        const wc = col('#d9d6cf'), dc = col('#eceae4');
        const ring = k => { const a = k / S * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; };
        for (let k = 0; k < S; k++) {
          const [c0, s0] = ring(k), [c1, s1] = ring(k + 1), nx = (c0 + c1) / 2, nz = (s0 + s1) / 2;
          roofGeo.quad([cx + c0 * r, y0, cz + s0 * r], [cx + c1 * r, y0, cz + s1 * r], [cx + c1 * r, y0 + dh, cz + s1 * r], [cx + c0 * r, y0 + dh, cz + s0 * r], wc, [nx, 0, nz]);
          for (let j = 0; j < R; j++) {
            const p0 = j / R * Math.PI / 2, p1 = (j + 1) / R * Math.PI / 2;
            const P = (c, s, p) => [cx + c * r * Math.cos(p), y0 + dh + r * Math.sin(p), cz + s * r * Math.cos(p)];
            const n = [nx * Math.cos((p0 + p1) / 2), Math.sin((p0 + p1) / 2), nz * Math.cos((p0 + p1) / 2)];
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
      // 體育館: Google 街景目視（2017-09）: the main roof is flat with a parapet; the
      // red-tile gabled roof is the covered walkway at the south-west entrance.
      // Drawn along the west part of the most south-west facing wall (>= 12 m),
      // 4 m deep outside it; posts only, no collider (people walk under it).
      let best = null, bd = -2;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], c = pts[(i + 1) % pts.length], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
        if (l < 12) continue;
        const d = (dz / l) * -Math.SQRT1_2 + (-dx / l) * Math.SQRT1_2;
        if (d > bd) { bd = d; best = [a, c, l, [dz / l, 0, -dx / l]]; }
      }
      if (best) {
        let [a, c, l, n] = best;
        if (c[0] < a[0]) [a, c] = [c, a];  // a = west end
        const len = Math.min(24, l - 2), tx = (c[0] - a[0]) / l, tz = (c[1] - a[1]) / l, D = 4, eave = 3.2, rr = 1.3;
        const at = (s, d) => [a[0] + tx * s + n[0] * d, a[1] + tz * s + n[2] * d];
        const y = Hmin(...at(len / 2, D / 2), Math.max(len, D) / 2);
        const Pq = (s, d, yy) => { const p = at(s, d); return [p[0], yy, p[1]]; };
        const rc = col('#9a4a3a'), pc = col('#e6e2d8');
        rtri(Pq(1, 0, y + eave), Pq(1 + len, 0, y + eave), Pq(1 + len, D / 2, y + eave + rr), rc);
        rtri(Pq(1, 0, y + eave), Pq(1 + len, D / 2, y + eave + rr), Pq(1, D / 2, y + eave + rr), rc);
        rtri(Pq(1, D, y + eave), Pq(1 + len, D, y + eave), Pq(1 + len, D / 2, y + eave + rr), rc);
        rtri(Pq(1, D, y + eave), Pq(1 + len, D / 2, y + eave + rr), Pq(1, D / 2, y + eave + rr), rc);
        roofGeo.tri(Pq(1, 0, y + eave), Pq(1, D, y + eave), Pq(1, D / 2, y + eave + rr), pc, [-tx, 0, -tz]);
        roofGeo.tri(Pq(1 + len, 0, y + eave), Pq(1 + len, D, y + eave), Pq(1 + len, D / 2, y + eave + rr), pc, [tx, 0, tz]);
        for (let s = 1.3; s <= len + 0.8; s += len / Math.round(len / 4)) {
          const p = at(s, D - 0.3);
          cylinder(p[0], p[1], H(p[0], p[1]) - 0.2, y + eave - H(p[0], p[1]) + 0.2, 0.18, pc, 6);
        }
      }
    }
    if (b.feature.includes('stair_drum')) {
      // 體育館: round stair tower (Google 街景目視, 2017-09). POSITION UNVERIFIED: the
      // observation says "south-east side", but both viewpoints are north / north-west of
      // the hall and cannot see the geometric SE corner, so "SE" may be relative to the
      // view. Placed at the footprint's max(x+z) corner as a literal reading only;
      // centred 2 m inside the corner, rising 2.4 m above the roof
      let ci = 0, cs = -Infinity;
      pts.forEach((p, i) => { const s = p[0] + p[1]; if (s > cs) { cs = s; ci = i; } });
      const p = pts[ci], cx0 = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz0 = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      const dl = Math.hypot(cx0 - p[0], cz0 - p[1]) || 1, x = p[0] + (cx0 - p[0]) / dl * 2, z = p[1] + (cz0 - p[1]) / dl * 2;
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
        const [x, z] = f.P(at[0], at[1]), y0 = top + rise * 0.6, wc = col('#f4f3ef');
        roofBox(f, [at[0] - 0.9, at[0] + 0.9, at[1] - 0.9, at[1] + 0.9], y0 - 0.5, top + rise + 2.2 - y0, wc, wc);
        const yb = top + rise + 1.7, sh = 6, S = 8;
        for (let k = 0; k < S; k++) {
          const a0 = k / S * Math.PI * 2, a1 = (k + 1) / S * Math.PI * 2;
          rtri([x + Math.cos(a0) * 0.85, yb, z + Math.sin(a0) * 0.85], [x + Math.cos(a1) * 0.85, yb, z + Math.sin(a1) * 0.85], [x, yb + sh, z], wc);
        }
        const cc = col('#e9e7e0'), yc = yb + sh;
        roofBox(f, [at[0] - 0.08, at[0] + 0.08, at[1] - 0.08, at[1] + 0.08], yc - 0.2, 1.8, cc, cc);
        roofBox(f, [at[0] - 0.08, at[0] + 0.08, at[1] - 0.55, at[1] + 0.55], yc + 1.05, 0.16, cc, cc);
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
  const tanks = []; const shopWalls = world.shopWalls = []; let oldSigns = 0;
  // PBR extras (visual only): concrete floor ledges, soft contact shadows at the wall foot,
  // metal awnings over shopfronts, PBR flat roofs, rooftop AC units, temple roofs
  const ledgeGeo = new Geo(), aoGeo = new Geo(false, null, true), awnGeo = new Geo(), flatRoofGeo = new Geo(false, q => [q[0] / 10, q[1] / 10]);
  const acSpots = [], temples = [];
  const AO_DARK = [0, 0, 0, 0.42], AO_CLEAR = [0, 0, 0, 0];
  const contactShadow = (a, c, n) => {
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]), k = Math.max(1, Math.ceil(l / 4)), o = 1.7;
    for (let j = 0; j < k; j++) {
      const t0 = j / k, t1 = (j + 1) / k;
      const p0 = [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0], p1 = [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1];
      const q0 = [p0[0] + n[0] * o, p0[1] + n[2] * o], q1 = [p1[0] + n[0] * o, p1[1] + n[2] * o];
      const Y = p => [p[0], H(p[0], p[1]) + 0.06 + TOL_LO, p[1]];
      aoGeo.tri(Y(p0), Y(p1), Y(q1), [AO_DARK, AO_DARK, AO_CLEAR], UP);
      aoGeo.tri(Y(p0), Y(q1), Y(q0), [AO_DARK, AO_CLEAR, AO_CLEAR], UP);
    }
  };
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
  const rndW = rnd;
  data.buildings.forEach((b, bi) => {
    // 補建街區 buildings (synthetic) draw from their own stream, so turning the
    // fill off leaves the shared sequence (palette, stalls, trees...) unchanged
    const rnd = b.synthetic ? mulberry32(hashStr('fill:' + b.id)) : rndW;
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
      else if (b.kind === 'campus' || b.kind === 'church') { if (style !== 'glass') style = STYLE_PICK[strHash(b.name || String(b.id || bi)) % STYLE_PICK.length]; }
      else if (b.kind === 'dorm') style = bi % 2 ? 'brick' : 'white';
      else if (b.kind === 'commercial') { if (style !== 'glass') style = 'commercial'; }
      else if (style === 'town') style = 'town';
    }
    const pbr = PBR_STYLES.has(style) && !mk;
    // textured PBR styles carry their own colour: keep only a subtle per-building variation
    if (pbr && style !== 'town') {
      const k = style === 'commercial' ? null : 0.9 + rnd2() * 0.14;
      for (let i = 0; i < 3; i++) tint[i] = k === null ? 0.75 + tint[i] * 0.3 : k;
    } else if (pbr) for (let i = 0; i < 3; i++) tint[i] = Math.min(1.08, tint[i] * 1.08);
    const g = wallFor(style, mk);
    const bay = civic ? 3.6 : 3.0;
    let acc = Math.floor(rnd() * 8) * bay;
    const vOff = Math.floor(rnd() * 8) / 8;
    // water stains at the wall foot, slightly darker under the roof line
    const cLo = tint.map(v => v * 0.7), cTop = tint.map(v => v * 0.88);
    const shops = (b.kind === 'town' || b.kind === 'commercial') && !mk && !style.startsWith('glass') && !b.parts && !b.noShop;
    let sAcc = Math.floor(rb() * 8) * 4;
    const rc = osmRoofCol(b) ? col(osmRoofCol(b)) : tint.map(v => v * 0.62);
    // flat PBR roofs (concrete roofTex carries its own colour)
    const rcFlat = osmRoofCol(b) ? col(osmRoofCol(b)) : style === 'town' ? tint.map(v => v * 0.82) : tint.map(v => v * 0.9);
    const pc = !pbr || style === 'town' ? tint.map(v => v * 0.95) : style === 'red' ? col('#e3ddd2') : style === 'tan' ? col('#a39380') : style === 'brick' ? col('#9a5442') : col('#d9d6cf');
    const lean2 = opts.low && b.synthetic;
    // blocks of different height (overrides.json split, e.g. 全人教育村) share the base
    const vols = b.parts || [{ pts, h, floors, holes: b.holes }];
    let pitched = false, onMain = false;
    for (const V of vols) {
      const vp = V.pts, vh = V.h, vf = V.floors || floors;
      // outer ring is CCW, courtyard rings CW, so the same normal faces outwards
      const rings = V.holes ? [vp, ...V.holes] : [vp];
      const vAt = y => vOff + (y - base) / vh * vf / 8;
      const top = base + vh;
      for (const ring of rings) for (let i = 0; i < ring.length; i++) {
        const a = ring[i], c = ring[(i + 1) % ring.length];
        const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
        if (l < 0.05) continue;
        const n = [dz / l, 0, -dx / l]; // outward for CCW (x,z)
        const u0 = acc / (bay * 8), u1 = (acc + l) / (bay * 8); acc += l;
        const shop = shops && ring === pts && l > 2.5 && facesStreet(a, c, n);
        const yS = shop ? Math.min(base + 3.6, top - 0.3) : Math.min(base + 1.2, top);
        // wall foot goes 0.5 m below the lowest ground so slopes never show a gap
        if (shop) {
          // 4 m shop bays; u runs right-to-left along the ring so signs read correctly
          const s0 = -sAcc / 32, s1 = -(sAcc + l) / 32, w0 = (foot - base) / 3.6, w1 = (yS - base) / 3.6; sAcc += l;
          shopGeo.quad([a[0], foot, a[1]], [c[0], foot, c[1]], [c[0], yS, c[1]], [a[0], yS, a[1]], [SHOP_LO, SHOP_LO, SHOP_HI, SHOP_HI], n,
            [[s0, w0], [s1, w0], [s1, w1], [s0, w1]]);
          // street-facing shop walls: furniture.js hangs POI signs and parks scooters here
          shopWalls.push({ a, c, n, base, h, floors, bi });
          // slanted metal awning over the shopfront (under the POI signs from furniture.js)
          if (!lean2) {
            const o = 1.25, y0 = base + 3.2, y1 = base + 2.85;
            const A0 = [a[0], y0, a[1]], C0 = [c[0], y0, c[1]], A1 = [a[0] + n[0] * o, y1, a[1] + n[2] * o], C1 = [c[0] + n[0] * o, y1, c[1] + n[2] * o];
            const ac = col(['#6d7a86', '#8a8f94', '#3f6f9f', '#a8a39a', '#4f7a5a'][Math.floor(rnd2() * 5)]);
            awnGeo.quad(A0, C0, C1, A1, ac, [n[0] * 0.3, 0.95, n[2] * 0.3], [[0, 0], [l / 3, 0], [l / 3, 0.4], [0, 0.4]]);
            awnGeo.quad(A0, C0, C1, A1, mulCol(ac, 0.6), [-n[0] * 0.3, -0.95, -n[2] * 0.3], [[0, 0], [l / 3, 0], [l / 3, 0.4], [0, 0.4]]);
          }
          if (!LANE_TYPES.has(shop.type)) onMain = true;
        } else {
          g.quad([a[0], foot, a[1]], [c[0], foot, c[1]], [c[0], yS, c[1]], [a[0], yS, a[1]], [cLo, cLo, tint, tint], n,
            [[u0, vAt(foot)], [u1, vAt(foot)], [u1, vAt(yS)], [u0, vAt(yS)]]);
        }
        if (top > yS + 0.01) g.quad([a[0], yS, a[1]], [c[0], yS, c[1]], [c[0], top, c[1]], [a[0], top, a[1]], [tint, tint, cTop, cTop], n,
          [[u0, vAt(yS)], [u1, vAt(yS)], [u1, vAt(top)], [u0, vAt(top)]]);
        // the old fixed-word signs are gone (POI signs in furniture.js); their
        // draws stay so the shared rnd sequence (stalls, trees...) is unchanged
        if (ring === pts && b.kind === 'town' && l > 4 && rnd() < 0.22 && oldSigns < 260) { oldSigns++; rnd(); }
        // horizontal floor ledges give campus blocks real depth and shadow lines
        if ((style === 'tan' || style === 'red' || style === 'white') && vh > 6) {
          const fl = vh / vf;
          for (let fy = base + fl; fy < top - 1; fy += fl) {
            const o = style === 'white' ? 0.22 : 0.32, t0 = fy - 0.1, t1 = fy + 0.12;
            const A = [a[0] + n[0] * o, a[1] + n[2] * o], C = [c[0] + n[0] * o, c[1] + n[2] * o];
            const lc = style === 'red' ? col('#e6e1d6') : style === 'white' ? col('#e9e7e2') : col('#a69684');
            ledgeGeo.quad([a[0], t1, a[1]], [c[0], t1, c[1]], [C[0], t1, C[1]], [A[0], t1, A[1]], lc, UP);
            ledgeGeo.quad([A[0], t0, A[1]], [C[0], t0, C[1]], [C[0], t1, C[1]], [A[0], t1, A[1]], lc, n, [[0, 0], [l / 2, 0], [l / 2, 0.1], [0, 0.1]]);
            ledgeGeo.quad([a[0], t0, a[1]], [c[0], t0, c[1]], [C[0], t0, C[1]], [A[0], t0, A[1]], mulCol(lc, 0.7), [0, -1, 0]);
          }
        }
        if (ring === pts && !lean2) contactShadow(a, c, n);
      }
      pitched = !b.parts && pitchedRoof(b, vp, top, rc, tint.map(v => v * 0.85));
      if (!pitched) flatRoofGeo.flatPoly(vp, top, rcFlat, V.holes);
      // parapet
      if (!pitched) for (const ring of rings) for (let i = 0; i < ring.length; i++) {
        const a = ring[i], c = ring[(i + 1) % ring.length];
        const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
        const n = [dz / l, 0, -dx / l];
        roofGeo.quad([a[0], top, a[1]], [c[0], top, c[1]], [c[0], top + 0.6, c[1]], [a[0], top + 0.6, a[1]], pc, n);
        roofGeo.quad([a[0], top + 0.6, a[1]], [c[0], top + 0.6, c[1]], [c[0] - n[0] * 0.25, top + 0.6, c[1] - n[2] * 0.25], [a[0] - n[0] * 0.25, top + 0.6, a[1] - n[2] * 0.25], pc.map(v => v * 1.05), UP);
        roofGeo.quad([a[0] - n[0] * 0.25, top, a[1] - n[2] * 0.25], [c[0] - n[0] * 0.25, top, c[1] - n[2] * 0.25], [c[0] - n[0] * 0.25, top + 0.6, c[1] - n[2] * 0.25], [a[0] - n[0] * 0.25, top + 0.6, a[1] - n[2] * 0.25], pc.map(v => v * 0.8), [-n[0], 0, -n[2]]);
      }
    }
    const top = base + h;
    if (b.feature) landmarkRoof(b, pts, top, pitched);
    // rooftop extras on flat town roofs: 鐵皮加蓋 35% (lanes) / 15% (shops on a
    // main road), ~30% stair house (see SHED_P)
    let extraH = 0, tankAt = null;
    // low quality: no rooftop extras on the 補建街區 fill
    const lean = opts.low && b.synthetic;
    if (b.kind === 'town' && !pitched && !b.holes && floors >= 2 && !lean) {
      const f = obb(pts), L = f.u1 - f.u0, W = f.v1 - f.v0;
      const inside = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [(u0 + u1) / 2, (v0 + v1) / 2]].every(([u, v]) => { const p = f.P(u, v); return pointInPoly(p[0], p[1], pts); });
      // b.shed: the fill's per-block 鐵皮加蓋 share (tools/block_survey.json plan.shed)
      const wantShed = rb() < (b.shed ?? (onMain ? SHED_P.main : SHED_P.lane)), wantStair = rb() < 0.3;
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
    if (!lean && b.kind === 'town' && rnd() < 0.55 && !pitched) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (pointInPoly(cx, cz, pts)) { const p = [cx + (rnd() - .5), top, cz + (rnd() - .5)]; if (tankAt !== false) tanks.push(tankAt || p); }
    }
    // rooftop clutter (AC condensers, vents) on flat roofs not already carrying sheds / stair houses
    if (!pitched && !b.parts && !lean2 && h >= 6 && extraH === 0) acSpots.push({ pts, top, town: b.kind === 'town' });
    if (style === 'temple' && !pitched && !b.parts) temples.push({ pts, top });
    if (b.parts) {
      // whole footprint blocks movement; each block gives its own roof to topAt
      collision.addPolygon(pts, -Infinity);
      for (const V of b.parts) collision.addPolygon(V.pts, base + V.h + 0.6);
    } else collision.addPolygon(pts, Math.max(pitched ? top + pitched : top + 0.6, top + extraH));
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
    // PBR shopfronts: shutters / lit glass fronts under a blank sign band (POI signs come from furniture.js)
    const mat = makeWallMat(shopTex());
    const m = shopGeo.mesh(mat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    world.shopMat = mat; world.tris.shops = shopGeo.tris;
  }
  {
    const m = roofGeo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: roofTexture(), roughness: 0.85 })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    world.tris.roofs = roofGeo.tris;
  }
  if (flatRoofGeo.tris) {
    const rt = roofTex();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: rt.map, normalMap: rt.normalMap, roughness: 0.92 });
    addMacro(mat, 0.05, 0.3);
    const m = flatRoofGeo.mesh(mat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    world.tris.roofs += flatRoofGeo.tris;
  }
  // rooftop AC condensers in rows, vent stacks
  {
    const acGeo = new Geo();
    for (const { pts, top, town } of acSpots) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const n = Math.min(14, Math.floor((x1 - x0) * (z1 - z0) / (town ? 120 : 90)));
      for (let k = 0; k < n; k++) {
        const x = x0 + 1.5 + rnd2() * (x1 - x0 - 3), z = z0 + 1.5 + rnd2() * (z1 - z0 - 3);
        if (!pointInPoly(x, z, pts) || !pointInPoly(x + 1.2, z + 1.2, pts) || !pointInPoly(x - 1.2, z - 1.2, pts)) continue;
        if (rnd2() < 0.25) acGeo.box(x, z, rnd2() * 3, 0.5, 0.5, top, top + 1.1, col('#8f9497'));
        else { acGeo.box(x, z, 0, 1.0, 0.7, top, top + 0.75, col('#e4e3de')); acGeo.box(x + 1.15, z, 0, 1.0, 0.7, top, top + 0.75, col('#dedcd6')); }
      }
    }
    if (acGeo.tris) { const am = acGeo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 })); am.castShadow = quality !== 'low'; scene.add(am); world.tris.ac = acGeo.tris; }
  }
  if (ledgeGeo.tris) { const lm = ledgeGeo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: concreteTex().map, roughness: 0.85 })); lm.castShadow = true; lm.receiveShadow = true; scene.add(lm); }
  if (awnGeo.tris) {
    const ct = corrugatedTex();
    const sm = awnGeo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: ct.map, normalMap: ct.normalMap, roughness: 0.55, metalness: 0.55, side: THREE.DoubleSide }));
    sm.castShadow = true; sm.receiveShadow = true; scene.add(sm);
  }
  if (aoGeo.tris) {
    const am = aoGeo.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, ...OFFSET }));
    am.renderOrder = layerOrder++; scene.add(am);
  }
  // temple roofs: hipped orange-tile roof with up-swept ridge ends
  if (temples.length) {
    const tg = new Geo();
    for (const { pts, top } of temples) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const o = 0.8, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rh = Math.min(3.2, (x1 - x0) * 0.3 + 1), y = top + 0.7;
      const E = [[x0 - o, z0 - o], [x1 + o, z0 - o], [x1 + o, z1 + o], [x0 - o, z1 + o]];
      const rl = Math.max(0.5, ((x1 - x0) - (z1 - z0)) / 2);
      const R0 = [cx - rl, y + rh, cz], R1 = [cx + rl, y + rh, cz];
      const orange = col('#d9632b'), green = col('#2f7a52');
      tg.quad([E[0][0], y, E[0][1]], [E[1][0], y, E[1][1]], R1, R0, orange, [0, 0.7, -0.7]);
      tg.quad([E[3][0], y, E[3][1]], [E[2][0], y, E[2][1]], R1, R0, orange, [0, 0.7, 0.7]);
      tg.tri([E[0][0], y, E[0][1]], [E[3][0], y, E[3][1]], R0, green, [-0.7, 0.7, 0]);
      tg.tri([E[1][0], y, E[1][1]], [E[2][0], y, E[2][1]], R1, green, [0.7, 0.7, 0]);
      // ridge with swallowtail ends
      tg.box(cx, cz, 0, rl * 2 + 1.6, 0.35, y + rh - 0.05, y + rh + 0.35, col('#b23a1f'), 1);
      for (const sx of [-1, 1]) tg.box(cx + sx * (rl + 0.9), cz, 0, 0.5, 0.3, y + rh + 0.2, y + rh + 1.0, col('#c8431f'), 1);
    }
    const m = tg.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide })); m.castShadow = true; scene.add(m);
  }
  // rooftop water tanks (very Taiwan)
  if (tanks.length) {
    const tg = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12); tg.translate(0, 1.6, 0);
    const legs = new THREE.BoxGeometry(1.4, 0.8, 1.4); legs.translate(0, 0.4, 0);
    const im = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: '#d9d4c3', roughness: 0.35, metalness: 0.6 }), tanks.length);
    const im2 = new THREE.InstancedMesh(legs, new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.7, metalness: 0.4 }), tanks.length);
    const M = new THREE.Matrix4();
    tanks.forEach((t, i) => { M.makeTranslation(t[0], t[1] + 0.6, t[2]); im.setMatrixAt(i, M); im2.setMatrixAt(i, M); });
    im.castShadow = true; scene.add(im, im2);
  }
  onProgress(0.6);

  // ---------- road graph ----------
  const nodes = new Map();
  const getNode = (id, p) => { let n = nodes.get(id); if (!n) { n = { id, x: p[0], z: p[1], adj: [] }; nodes.set(id, n); } return n; };
  const inB = p => p[0] > B.minX + 5 && p[0] < B.maxX - 5 && p[1] > B.minZ + 5 && p[1] < B.maxZ - 5;
  for (const r of data.roads) {
    if (!r.nodes || r.nodes.length !== r.pts.length || r.under) continue;
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
  // world.soft: parked scooters (no collision) that spawns should not overlap
  world.isFree = (x, z, r = 1) => !collision.blocked(x, z, r) && !waterPolys.some(p => inArea(x, z, p)) && !(world.soft && world.soft.near(x, z, r + 0.4));

  // ---------- landmarks ----------
  const poi = name => data.pois.find(p => p.name === name);
  const standard = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  // board-formed concrete (PBR) for the landmarks
  const concTex = concreteTex();
  const concrete = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, map: concTex.map, normalMap: concTex.normalMap, roughness: 0.85, ...o });
  const LM = data.landmarks || {};
  // merge box-like parts [geometry, x, y, z] into one mesh
  const mergedMesh = (parts, mat) => {
    const gs = parts.map(([geo, x, y, z]) => { geo.translate(x, y, z); return geo; });
    const m = new THREE.Mesh(mergeGeometries(gs, false), mat);
    gs.forEach(geo => geo.dispose());
    return m;
  };
  // 二一鐘 (OSM 鐘塔): two fair-faced concrete pylons joined at the top, a bell
  // between them and a cross on top (Commons photos, see overrides.json)
  const ct = poi('鐘塔');
  if (ct && (LM['鐘塔'] || {}).style === 'cross_bell') {
    const T = LM['鐘塔'], h = T.h || 19, ch = T.cross || 5;
    const g = new THREE.Group();
    const pylon = (x) => {
      // folded-plate pylon, slightly tapered
      const geo = new THREE.BoxGeometry(1.0, h, 1.5, 1, 1, 1); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.7); p.setZ(i, p.getZ(i) * 0.75); }
      geo.computeVertexNormals();
      return [geo, x, h / 2, 0];
    };
    const conc = mergedMesh([
      [new THREE.BoxGeometry(3.6, 0.4, 2.2), 0, 0.2, 0], pylon(-1.15), pylon(1.15),
      [new THREE.BoxGeometry(2.4, 0.9, 1.0), 0, h - 0.45, 0],
      [new THREE.BoxGeometry(0.28, ch + 1, 0.28), 0, h + (ch + 1) / 2 - 1, 0],
      [new THREE.BoxGeometry(1.9, 0.28, 0.28), 0, h + ch * 0.62, 0],
    ], concrete('#d4d1ca', { roughness: 0.9 }));
    const bell = mergedMesh([
      [new THREE.CylinderGeometry(0.3, 0.55, 0.9, 10), 0, h - 1.6, 0],
      [new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4), 0, h - 0.95, 0],
    ], standard('#6b4a2a', { roughness: 0.35, metalness: 0.85 }));
    g.add(conc, bell);
    const cb = Hmin(ct.x, ct.z, 2.2);
    g.position.set(ct.x, cb, ct.z);
    g.traverse(o => { if (o.isMesh) { o.castShadow = !opts.low; o.receiveShadow = true; } });
    scene.add(g);
    collision.addCircle(ct.x, ct.z, 2.6);
    world.named['鐘塔'] = { x: ct.x, z: ct.z, h: Math.round(h + ch), base: cb };
  } else if (ct) {
    // fallback without landmark data: a plain tower
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 20, 3.2), standard('#bdbab2')); shaft.position.y = 10; g.add(shaft);
    const cb = Hmin(ct.x, ct.z, 2.2);
    g.position.set(ct.x, cb, ct.z); scene.add(g);
    collision.addCircle(ct.x, ct.z, 2.6);
    world.named['鐘塔'] = { x: ct.x, z: ct.z, h: 25, base: cb };
  }
  // Old gate 舊校門: three white concrete round arches on twin columns, plaques
  // 中 原 大 學 on the column groups (Commons photo, see overrides.json).
  // Google 街景目視（2017-09）confirms a free-standing frame of three equal
  // semicircular arches on slim columns, no deck or roof; columns ~4-5 m, ~7-8 m
  // overall (overrides.json colH / col). Width is still an estimate; the road
  // runs under the middle arch.
  const og = poi('舊校門');
  if (og) {
    const near = world.nearestRoadPoint(og.x, og.z);
    const dir = near ? near.dir : 0;
    // centred on the road (the POI sits ~0.5 m off it)
    const gx = near && Math.hypot(near.x - og.x, near.z - og.z) < 3 ? near.x : og.x, gz = gx === og.x ? og.z : near.z;
    const g = new THREE.Group();
    const OG = LM['舊校門'] || {};
    const SPAN = 5.6, COL = OG.col || 0.7, HC = OG.colH || 5.2, STEP = SPAN + COL * 2 + 0.15, D = 0.9, R = SPAN / 2;
    // base at the highest column foot; each column reaches down to its own ground
    const wx = x => [gx + Math.cos(dir) * x, gz - Math.sin(dir) * x];
    const cxs = [-STEP, 0, STEP].flatMap(c => [c - R - COL / 2, c + R + COL / 2]);
    const gb = Math.max(...cxs.map(x => H(...wx(x))));
    const parts = [];
    for (const x of cxs) {
      const drop = gb - H(...wx(x)) + 0.3;
      parts.push([new THREE.BoxGeometry(COL, HC + drop, D), x, (HC - drop) / 2, 0]);
    }
    for (const c of [-STEP, 0, STEP]) {
      // semicircular arch ring from short boxes
      const N = 12;
      for (let k = 0; k < N; k++) {
        const t = (k + 0.5) / N * Math.PI, len = (R + 0.6) * Math.PI / N + 0.04;
        const geo = new THREE.BoxGeometry(len, 0.6, D); geo.rotateZ(t - Math.PI / 2);
        parts.push([geo, c - Math.cos(t) * (R + 0.3), HC + Math.sin(t) * (R + 0.3), 0]);
      }
    }
    const arch = mergedMesh(parts, concrete('#f0ede6'));
    arch.castShadow = !opts.low; arch.receiveShadow = true; g.add(arch);
    // plaques: one canvas with the four characters, one quad per column group and side
    const pt = canvasTex(256, 64, (cx) => {
      cx.fillStyle = '#f4f1ea'; cx.fillRect(0, 0, 256, 64);
      cx.fillStyle = '#1b1b1b'; cx.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      [...'中原大學'].forEach((t, i) => { cx.fillText(t, i * 64 + 32, 34); cx.strokeStyle = '#555'; cx.lineWidth = 3; cx.strokeRect(i * 64 + 3, 3, 58, 58); });
    }, false);
    const pg = [];
    const xs = [-STEP - R - COL / 2, -STEP / 2, STEP / 2, STEP + R + COL / 2];
    xs.forEach((x, i) => {
      for (const sd of [1, -1]) {
        const q = new THREE.PlaneGeometry(1.0, 1.0); const uv = q.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 4);
        if (sd < 0) q.rotateY(Math.PI);
        pg.push([q, x, HC + 0.3, sd * (D / 2 + 0.02)]);
      }
    });
    g.add(mergedMesh(pg, new THREE.MeshStandardMaterial({ map: pt, roughness: 0.5 })));
    // rotation dir: local x runs across the road, matching the colliders
    g.position.set(gx, gb, gz); g.rotation.y = dir;
    scene.add(g);
    for (const x of [-STEP - R - COL / 2, -STEP / 2, STEP / 2, STEP + R + COL / 2]) {
      collision.addCircle(gx + Math.cos(dir) * x, gz - Math.sin(dir) * x, 0.7);
    }
  }
  // 正門 校名牆: black granite wall with the CYCU emblem + a slanted stainless obelisk (from photos of the
  // main gate). Placed on free ground ~9 m off 中北路, clear of the guardhouse barriers and the spawn.
  if (opts.mainGate) {
    const G = opts.mainGate, street = data.roads.filter(r => r.name === '中北路');
    const keep = opts.keep || [];
    const distStreet = (x, z) => { let d = 1e9; for (const r of street) for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t)); d = Math.min(d, Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)); } return d; };
    // wall runs parallel to the nearest stretch of 中北路
    let sp = 0, spd = 1e9;
    for (const r of street) for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; const d = Math.hypot((a[0] + b[0]) / 2 - G.x, (a[1] + b[1]) / 2 - G.z); if (d < spd) { spd = d; sp = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
    const ca = Math.cos(sp), sa = Math.sin(sp), W = 7, D = 1.3;
    let best = null, bs = 1e9;
    for (let r = 7; r <= 24; r += 1) for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2, x = G.x + Math.cos(a) * r, z = G.z + Math.sin(a) * r;
      const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2], [0, 0], [W / 2 + 1.5, 0]].map(([lx, lz]) => [x + lx * ca - lz * sa, z + lx * sa + lz * ca]);
      if (corners.some(([cx, cz]) => roadGrid.nearest(cx, cz).d < 1.2 || collision.blocked(cx, cz, 1.0) || inReserved(cx, cz) || keep.some(q => Math.hypot(q.x - cx, q.z - cz) < q.r + 1))) continue;
      const ds = distStreet(x, z); if (ds > 22) continue;
      const score = Math.abs(ds - 9) + Math.abs(r - 11) * 0.5;
      if (score < bs) { bs = score; best = { x, z }; }
    }
    if (best) {
      const g = new THREE.Group();
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 224; const c = cv.getContext('2d');
      const gr = c.createLinearGradient(0, 0, 0, 224); gr.addColorStop(0, '#2a2c30'); gr.addColorStop(1, '#141518'); c.fillStyle = gr; c.fillRect(0, 0, 1024, 224);
      const sr = mulberry32(1024);
      for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(255,255,255,${sr() * 0.05})`; c.fillRect(sr() * 1024, sr() * 224, 2, 2); }
      // emblem: navy disc, white laurel, red shield with white cross
      c.save(); c.translate(130, 112);
      c.fillStyle = '#1d2f63'; c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 5;
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + s * (0.35 + k * 0.33); c.beginPath(); c.ellipse(Math.cos(a) * 56, Math.sin(a) * 56, 13, 6, a + s * 0.6, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#d23a2c'; c.beginPath(); c.moveTo(-26, -30); c.lineTo(26, -30); c.lineTo(26, 6); c.quadraticCurveTo(26, 32, 0, 40); c.quadraticCurveTo(-26, 32, -26, 6); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-5, -30, 10, 68); c.fillRect(-26, -6, 52, 10);
      c.restore();
      c.fillStyle = '#f2f2ee'; c.font = '900 108px "Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif'; c.textBaseline = 'middle'; c.fillText('中原大學', 250, 92);
      c.font = '600 34px system-ui,sans-serif'; c.fillStyle = '#d9d9d4'; c.fillText('Chung Yuan Christian University', 254, 178);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      const granite = new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 0.22, metalness: 0.1 });
      const face = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.25, metalness: 0.05 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(W, 1.7, D), [granite, granite, granite, granite, face, face]); wall.position.y = 0.85; g.add(wall);
      // plinth reaching 0.6 m below the base so the wall never floats on a slope
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(W, 0.6, D), granite); plinth.position.y = -0.3; g.add(plinth);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.08, D + 0.2), standard('#2e3034', { roughness: 0.3 })); cap.position.y = 1.74; g.add(cap);
      const obel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 13.6, 0.75), new THREE.MeshStandardMaterial({ color: '#b9bcbf', metalness: 0.85, roughness: 0.32, map: concTex.map }));
      obel.geometry.translate(0, 6.2, 0); obel.position.set(W / 2 + 1.5, 0, 0); obel.rotation.z = -0.16; g.add(obel);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), standard('#c9a64a', { metalness: 0.9, roughness: 0.3 })); band.position.set(0, 9.2, 0); obel.add(band);
      g.position.set(best.x, Hmin(best.x, best.z, W / 2 + 2), best.z); g.rotation.y = -sp; // local +x along the street; both faces carry the name
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
      g.updateMatrixWorld(true);
      const P = (lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(g.matrixWorld); return [v.x, v.z]; };
      collision.addPolygon([P(-W / 2, -D / 2), P(W / 2, -D / 2), P(W / 2, D / 2), P(-W / 2, D / 2)], g.position.y + 1.8);
      const ob = P(W / 2 + 1.5, 0); collision.addCircle(ob[0], ob[1], 0.6);
      world.gateSign = { x: best.x, z: best.z };
    }
  }
  // Fountain 中原噴水池. Google 街景目視（2017-09，舊校門東側）: a low round raised
  // basin (~12-15 m across, rim ~0.45 m) of light grey stone in a round stone-paved
  // plaza with concentric curved stone benches. Sizes in overrides.json landmarks.
  const fp = data.areas.find(a => a.name === '中原噴水池');
  if (fp) {
    const cx = fp.pts.reduce((s, p) => s + p[0], 0) / fp.pts.length, cz = fp.pts.reduce((s, p) => s + p[1], 0) / fp.pts.length;
    const FT = LM['中原噴水池'] || {}, round = FT.style === 'round_basin';
    const R = round ? (FT.d || 13) / 2 : 1.3, RIM = round ? (FT.rim || 0.45) : 1.2;
    // rim top sits RIM above the highest ground under the ring
    let gHi = -Infinity, gLo = Infinity;
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, y = H(cx + Math.cos(a) * R, cz + Math.sin(a) * R); gHi = Math.max(gHi, y); gLo = Math.min(gLo, y); }
    const fy = round ? gHi : H(cx, cz);
    const N = 260; const pos = new Float32Array(N * 3); const seeds = [];
    for (let i = 0; i < N; i++) seeds.push([rnd() * Math.PI * 2, 0.6 + rnd() * 0.8, rnd()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#e4f2ff', size: 0.13, transparent: true, opacity: 0.75 }));
    pts.frustumCulled = false; scene.add(pts);
    const stone = concrete(round ? '#d4d4d0' : '#cfc9bc', { roughness: 0.85 });
    if (round) {
      const sg = new Geo(), wall = col('#c8c8c4'), cap = col('#d6d6d2'), inner = col('#a9aaa6');
      const S = 40, T = 0.45, y0 = gLo - 0.3, yT = fy + RIM;
      for (let k = 0; k < S; k++) {
        const a0 = k / S * Math.PI * 2, a1 = (k + 1) / S * Math.PI * 2, am = (a0 + a1) / 2;
        const o = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
        sg.quad(o(a0, R, y0), o(a1, R, y0), o(a1, R, yT), o(a0, R, yT), wall, [Math.cos(am), 0, Math.sin(am)]);
        sg.quad(o(a0, R - T, fy - 0.2), o(a1, R - T, fy - 0.2), o(a1, R - T, yT), o(a0, R - T, yT), inner, [-Math.cos(am), 0, -Math.sin(am)]);
        sg.quad(o(a0, R - T, yT), o(a1, R - T, yT), o(a1, R, yT), o(a0, R, yT), cap, UP);
        // basin floor
        sg.tri(o(a0, 0, fy - 0.2), o(a0, R - T, fy - 0.2), o(a1, R - T, fy - 0.2), inner, UP);
        // plaza: two concentric paving rings that follow the ground (light / darker stone)
        for (const [r0, r1, c] of [[R, R + 1.5, col('#bdbcb6')], [R + 1.5, R + 1.85, col('#9d9c96')], [R + 1.85, R + 3.3, col('#b4b3ad')]]) {
          const g = (a, r) => [cx + Math.cos(a) * r, H(cx + Math.cos(a) * r, cz + Math.sin(a) * r) + 0.04, cz + Math.sin(a) * r];
          sg.quad(g(a0, r0), g(a1, r0), g(a1, r1), g(a0, r1), c, UP);
        }
      }
      const m = sg.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: concTex.map, roughness: 0.85 })); m.receiveShadow = true; m.castShadow = !opts.low; scene.add(m);
      // shallow water just below the rim (the basin was dry in 2017-09; kept with water for the game)
      const wn = groundTex.waterNormal().clone(); wn.needsUpdate = true; wn.repeat.set(0.4, 0.4);
      const wat = new THREE.Mesh(new THREE.CircleGeometry(R - T, 32), new THREE.MeshStandardMaterial({ color: '#4f7480', roughness: 0.06, metalness: 0.15, normalMap: wn, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 1.3, transparent: true, opacity: 0.9 }));
      world.animated.push((t) => { wn.offset.set(t * 0.02, t * 0.013); });
      wat.rotation.x = -Math.PI / 2; wat.position.set(cx, fy + RIM - 0.15, cz); scene.add(wat);
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, RIM + 0.5, 12), stone); basin.position.set(cx, fy + (RIM + 0.5) / 2, cz); scene.add(basin);
      // curved stone benches on an outer ring, four arcs with gaps for the paths
      const bg = [];
      // ring centred at R + 1.9 m, 0.5 m deep (R + 1.65 .. R + 2.15 m), so it stays
      // inside the trees' clearance from the rim collider (okSpot keeps trunks >= R + 2.2 m)
      const BR = R + 1.9, BA = Math.PI / 2 - 0.5;
      for (let q = 0; q < 4; q++) {
        const a0 = q * Math.PI / 2 + Math.PI / 4 - BA / 2, n = 6;
        for (let k = 0; k < n; k++) {
          const a = a0 + (k + 0.5) / n * BA, x = cx + Math.cos(a) * BR, z = cz + Math.sin(a) * BR, len = BR * BA / n + 0.05;
          const box = new THREE.BoxGeometry(len, 0.45, 0.5); box.rotateY(-a + Math.PI / 2);
          bg.push([box, x, H(x, z) + 0.22, z]);
        }
      }
      const benches = mergedMesh(bg, stone); benches.castShadow = !opts.low; benches.receiveShadow = true; scene.add(benches);
      // the raised rim is walked around, not through
      collision.addCircle(cx, cz, R);
    } else {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.2, 16), stone); basin.position.set(cx, fy + 0.6, cz); scene.add(basin);
    }
    const sprayY = round ? fy + RIM + 0.3 : fy + 1.2;
    world.animated.push((t) => {
      for (let i = 0; i < N; i++) {
        const [a, sp, ph] = seeds[i]; const k = (t * 0.6 + ph) % 1;
        const r = k * 2.6 * sp; pos[i * 3] = cx + Math.cos(a) * r; pos[i * 3 + 2] = cz + Math.sin(a) * r;
        pos[i * 3 + 1] = sprayY + 4.5 * k * (1 - k) * 4 * sp - 0.3;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  // Campaign billboards
  const bTex = bannerTexture();
  const boardMat = new THREE.MeshStandardMaterial({ map: bTex, emissiveMap: bTex, emissive: '#fff', emissiveIntensity: 0.15, roughness: 0.6 });
  const addBoard = (x, z, rot, s = 1) => {
    const g = new THREE.Group();
    const frameM = standard('#2a2c30', { metalness: 0.6, roughness: 0.45 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(6 * s, 3 * s, 0.15), [frameM, frameM, frameM, frameM, boardMat, boardMat]);
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
    // striped canopies glow from the bulbs underneath at night
    const stripe = canvasTex(64, 8, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d8d8d8'; g.fillRect(i * 8, 0, 8, 8); } });
    stripe.repeat.set(2, 1);
    const topMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65, map: stripe });
    const glowU = { value: 0 };
    topMat.onBeforeCompile = (sh) => { sh.uniforms.uGlow = glowU; sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uGlow;'); };
    topMat.customProgramCacheKey = () => 'stallTop';
    const top = new THREE.InstancedMesh(stallTop, topMat, spots.length);
    world.stallGlow = glowU;
    const steel = canvasTex(64, 64, (g) => { g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y++) { g.fillStyle = `rgba(${y % 3 ? 255 : 0},${y % 3 ? 255 : 0},${y % 3 ? 255 : 0},0.06)`; g.fillRect(0, y, 64, 1); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 64, 4); });
    const body = new THREE.InstancedMesh(stallBody, new THREE.MeshStandardMaterial({ color: '#8d9399', map: steel, roughness: 0.38, metalness: 0.65, emissive: '#ffcf8a', emissiveIntensity: 0 }), spots.length);
    // food signboards along the canopy edge, facing the street
    const FOODS = ['雞排', '珍珠奶茶', '臭豆腐', '蚵仔煎', '大腸包小腸', '鹹酥雞', '烤玉米', '地瓜球', '章魚燒', '滷味', '雞蛋糕', '甘蔗汁', '炭烤香腸', '胡椒餅', '蔥抓餅', '綠豆沙'];
    const foodAtlas = canvasTex(512, 1024, (g) => {
      const bgs = ['#c8102e', '#ffd23f', '#0a7d3b', '#1a4fb4', '#ff7a00', '#7b1fa2', '#222', '#e91e63'];
      FOODS.forEach((f, i) => {
        const y = i * 64; g.fillStyle = bgs[i % bgs.length]; g.fillRect(0, y, 512, 64); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(0, y, 512, 4);
        g.fillStyle = bgs[i % bgs.length] === '#ffd23f' ? '#a3001b' : '#fff'; g.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f, 256, y + 34);
      });
    }, false);
    const signG = new THREE.PlaneGeometry(2.6, 0.42);
    const signMat = new THREE.MeshStandardMaterial({ map: foodAtlas, emissiveMap: foodAtlas, emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.5 });
    signMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
        #ifdef USE_INSTANCING
          float fi = floor(mod(abs(instanceMatrix[3].x * 3.7 + instanceMatrix[3].z * 1.3), 16.0));
          vMapUv = vec2(vMapUv.x, (vMapUv.y + 15.0 - fi) / 16.0);
          vEmissiveMapUv = vMapUv;
        #endif`);
    };
    signMat.customProgramCacheKey = () => 'foodSign';
    const signM = new THREE.InstancedMesh(signG, signMat, spots.length);
    world.foodSignMat = signMat;
    const backG = new THREE.BoxGeometry(2.9, 2.2, 0.06); backG.translate(0, 1.4, -1.25);
    const back = new THREE.InstancedMesh(backG, new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.9 }), spots.length);
    const lanternG = new THREE.LatheGeometry([[0.0, -0.3], [0.1, -0.3], [0.1, -0.26], [0.2, -0.18], [0.24, 0], [0.2, 0.18], [0.1, 0.26], [0.1, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
    const lantern = new THREE.InstancedMesh(lanternG, new THREE.MeshStandardMaterial({ color: '#e8261c', emissive: '#ff3a1a', emissiveIntensity: 0.4, roughness: 0.55 }), spots.length * 2);
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
      // fascia sign on the street-side edge of the canopy
      const Qs = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(onx, onz));
      P.set(x + onx * 1.53, y + 2.45, z + onz * 1.53); M.compose(P, Qs, S); signM.setMatrixAt(i, M);
      // back panel faces the road: stall local -z points away from the street side
      const Qb = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(-onx, -onz));
      P.set(x, y, z); M.compose(P, Qb, S); back.setMatrixAt(i, M);
      const ox = Math.cos(r) * 1.3, oz = -Math.sin(r) * 1.3;
      const SL = new THREE.Vector3(0.8, 0.8, 0.8);
      P.set(x + ox, y + 2.15, z + oz); M.compose(P, Q, SL); lantern.setMatrixAt(i * 2, M);
      P.set(x - ox, y + 2.15, z - oz); M.compose(P, Q, SL); lantern.setMatrixAt(i * 2 + 1, M);
      collision.addCircle(x, z, 1.1);
    });
    top.castShadow = true; body.castShadow = true; back.castShadow = true; signM.castShadow = false;
    scene.add(top, body, lantern, back, signM);
    world.lanternMat = lantern.material;
  }
  onProgress(0.7);

  // ---------- street furniture (furniture.js) ----------
  {
    const f = buildFurniture(scene, world, data, { Geo, col, addFlat, obb, polyArea, low: !!opts.low, rnd: mulberry32(4401), keep: opts.keep || [] });
    world.signMats = f.signMats;
  }

  // ---------- street lamps ----------
  let lampSpots = [];
  // OSM street_lamp nodes where mapped; elsewhere one every 30 m, sides
  // alternating along each road (no lamp within 15 m of an OSM one)
  {
    const spots = [];
    const osm = data.furniture.filter(f => f.t === 'street_lamp');
    // lamp poles collide, so none may stand in any carriageway
    const laneClear = (x, z) => { const q = roadGrid.nearest(x, z, s => s[5].drive && !s[5].under); return !q.seg || q.d > 0.3; };
    let inLane = 0;
    for (const f of osm) {
      const q = roadGrid.nearest(f.x, f.z, s => s[5].drive && !s[5].under);
      let x = f.x, z = f.z, rot = 0;
      if (q.seg) {
        const s = q.seg, l = Math.hypot(s[2] - s[0], s[3] - s[1]) || 1;
        let vx = x - q.q[0], vz = z - q.q[1], d = Math.hypot(vx, vz);
        if (d < 0.01) { vx = -(s[3] - s[1]) / l; vz = (s[2] - s[0]) / l; d = 1; }
        // lamps mapped on the carriageway move to its edge
        if (q.d < 0.3) { x = q.q[0] + vx / d * (s[4] / 2 + 0.6); z = q.q[1] + vz / d * (s[4] / 2 + 0.6); }
        rot = Math.atan2(-vx, -vz);
      }
      if (!laneClear(x, z)) { inLane++; continue; }
      if (!collision.insideAny(x, z) && !collision.blocked(x, z, 0.3)) spots.push([x, z, rot]);
    }
    const osmN = spots.length;
    const nearOsm = (x, z) => osm.some(f => (f.x - x) ** 2 + (f.z - z) ** 2 < 225);
    for (const r of data.roads) {
      if (!r.drive || !r.name || r.type === 'service' || r.under) continue;
      let acc = 0, k = hashStr(r.name) & 1;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = (30 - acc % 30); s < l; s += 30) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l;
          const nx = -dz / l, nz = dx / l, s0 = k++ % 2 ? 1 : -1;
          // the other kerb when this one is inside a junction / another road
          for (const side of [s0, -s0]) {
            const px = x + nx * side * (r.w / 2 + 0.6), pz = z + nz * side * (r.w / 2 + 0.6);
            if (nearOsm(px, pz) || collision.blocked(px, pz, 0.5)) break;
            if (!laneClear(px, pz)) { if (side !== s0) inLane++; continue; }
            spots.push([px, pz, Math.atan2(-nx * side, -nz * side)]); break;
          }
        }
        acc += l;
      }
    }
    world.lampCount = { osm: osmN, total: spots.length, inLane };
    lampSpots = spots;
    const pole = new THREE.CylinderGeometry(0.09, 0.13, 7, 8); pole.translate(0, 3.5, 0);
    const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6); arm.rotateX(Math.PI / 2 - 0.12); arm.translate(0, 6.95, 0.8);
    const head = new THREE.BoxGeometry(0.34, 0.12, 0.7); head.translate(0, 6.98, 1.55);
    const lens = new THREE.BoxGeometry(0.26, 0.03, 0.56); lens.translate(0, 6.905, 1.55);
    const poleMat = standard('#5d646b', { metalness: 0.6, roughness: 0.45 });
    const poleM = new THREE.InstancedMesh(pole, poleMat, spots.length);
    const armM = new THREE.InstancedMesh(arm, poleMat, spots.length);
    const headM = new THREE.InstancedMesh(head, standard('#4a4f55', { metalness: 0.5, roughness: 0.4 }), spots.length);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#d8d8d0', emissive: '#ffd9a0', emissiveIntensity: 0 });
    const lensM = new THREE.InstancedMesh(lens, lampMat, spots.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r], i) => { Q.setFromAxisAngle(Y, r); P.set(x, H(x, z) - 0.1, z); M.compose(P, Q, S); poleM.setMatrixAt(i, M); armM.setMatrixAt(i, M); headM.setMatrixAt(i, M); lensM.setMatrixAt(i, M); collision.addCircle(x, z, 0.2); });
    // thin poles: shadows only on high quality
    poleM.castShadow = !opts.low; armM.castShadow = !opts.low; headM.castShadow = !opts.low;
    scene.add(poleM, armM, headM, lensM);
    world.lampMat = lampMat;
    // light pools on the ground (cheap fake lighting at night)
    const pool = new THREE.CircleGeometry(5, 24); pool.rotateX(-Math.PI / 2);
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
    // soft volumetric light cones under each lamp head
    const cone = new THREE.CylinderGeometry(0.25, 2.6, 6.8, 20, 1, true); cone.translate(0, 3.45, 0);
    const coneMat = new THREE.MeshBasicMaterial({ map: coneTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
    const coneM = new THREE.InstancedMesh(cone, coneMat, spots.length);
    spots.forEach(([x, z, r], i) => { const px = x + Math.sin(r) * 1.55, pz = z + Math.cos(r) * 1.55; M.makeTranslation(px, H(x, z) - 0.1, pz); coneM.setMatrixAt(i, M); });
    coneM.renderOrder = 5; scene.add(coneM);
    world.coneMat = coneMat;
  }

  // ---------- night lights: a small pool of real point lights that follow the nearest street lamps ----------
  {
    const n = quality === 'high' ? 8 : quality === 'medium' ? 4 : 0;
    const lights = [];
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight('#ffcf94', 0, 24, 2); l.position.set(0, -100, 0); scene.add(l); lights.push(l); }
    const heads = lampSpots.map(([x, z, r]) => ({ x: x + Math.sin(r) * 1.55, z: z + Math.cos(r) * 1.55, y: H(x, z) + 6.5 }));
    let tick = 0, enabled = quality !== 'low';
    world.lampLights = {
      update(dt, night, p) {
        if (!lights.length) return;
        tick -= dt;
        if (tick <= 0 && p) {
          tick = 0.3;
          const near = heads.map(h => [h, (h.x - p.x) ** 2 + (h.z - p.z) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, lights.length);
          near.forEach(([h], i) => lights[i].position.set(h.x, h.y, h.z));
        }
        for (const l of lights) l.intensity = enabled ? night * 32 : 0;
      },
      setEnabled(on) { enabled = on; },
    };
  }

  // ---------- trees ----------
  // species modelled on the campus (vegetation.js): rain trees / banyans, round street trees,
  // black pines, 大王椰子 palms and clipped shrubs; placement and colliders as before
  {
    const spots = [], palms = [], shrubs = [];
    // the 大草坪 stays open like the real lawn (a ring of rain trees is added round its edge below)
    const lawns = data.areas.filter(a => a.name === '中原大學大草坪').map(a => a.pts);
    const greenAt = (x, z) => greenPolys.some(p => inArea(x, z, p));
    // species from the visual-only stream, so layout and colliders don't depend on it
    const pickKind = (x, z, s) => {
      const r = rnd2(), campus = world.inCampus(x, z);
      let kind = campus || greenAt(x, z) ? (r < 0.3 ? 'rain' : r < 0.66 ? 'round' : r < 0.84 ? 'pine' : 'palm') : (r < 0.18 ? 'palm' : 'round');
      if (kind === 'rain' && collision.blocked(x, z, 5.5)) kind = 'round';
      if (kind === 'round' && collision.blocked(x, z, 3.2)) kind = r < 0.5 ? 'palm' : 'pine';
      const sc = kind === 'rain' ? 0.6 + (s - 0.8) * 0.45 : kind === 'round' ? 0.72 + (s - 0.8) * 0.5 : kind === 'pine' ? 0.72 + (s - 0.8) * 0.35 : 0.85 + (s - 0.8) * 0.3;
      return [kind, sc];
    };
    // low quality: fewer shrubs (they are the bulk of the new vegetation triangles)
    const SH1 = opts.low ? 500 : 1600, SH2 = opts.low ? 700 : 2200;
    const okSpot = (x, z, r) => {
      if (x < B.minX + 3 || x > B.maxX - 3 || z < B.minZ + 3 || z > B.maxZ - 3) return false;
      if (roadGrid.nearest(x, z).d < 1.0) return false;
      if (collision.blocked(x, z, r)) return false;
      if (world.soft && world.soft.near(x, z, r)) return false;
      if (waterPolys.some(p => inArea(x, z, p))) return false;
      if (sportPolys.some(p => pointInPoly(x, z, p))) return false;
      if (lawns.some(p => pointInPoly(x, z, p))) return false;
      if (parkingPolys.some(p => inArea(x, z, p))) return false;
      // keep 4 m clear around the custom-built buildings (entrances, guardhouses)
      for (let k = 0; k < 8; k++) { const qx = x + Math.cos(k * 0.785) * 4, qz = z + Math.sin(k * 0.785) * 4; if (collision.reserved.some(p => pointInPoly(qx, qz, p))) return false; }
      return true;
    };
    const tryTree = (x, z, s, palm = false) => {
      if (!okSpot(x, z, palm ? 1.2 : 2.2)) return;
      if (palm) palms.push([x, z, s]);
      else spots.push([x, z, ...pickKind(x, z, s)]);
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
    // 補建街區 woods (dense) and lawns (a few trees), own stream; low quality: half
    {
      const fr = mulberry32(7007), k = opts.low ? 2 : 1;
      for (const { ring, dense } of fillGreens) {
        const [x0, z0, x1, z1] = polyBox(ring);
        const n = Math.min(dense ? 700 : 120, Math.floor(polyArea(ring) / ((dense ? 90 : 360) * k)));
        for (let i = 0, t = 0; i < n && t < n * 4; t++) {
          const x = x0 + fr() * (x1 - x0), z = z0 + fr() * (z1 - z0);
          if (!inArea(x, z, ring)) continue;
          i++; tryTree(x, z, dense ? 0.85 + fr() * 0.75 : 0.8 + fr() * 0.6);
        }
      }
      world.fillGreens = fillGreens.length;
    }
    // shrubs along campus building walls and inside parks (no collision)
    for (const bd of data.buildings) {
      // 補建校舍不種牆邊灌木：不吃共用 rnd()／SH1 名額，補建開關不影響其他灌木位置
      if (!(bd.kind === 'campus' || bd.kind === 'dorm' || bd.kind === 'church') || bd.skip || bd.synthetic) continue;
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
    // a ring of big rain trees round the edge of the 大草坪, like the real lawn
    for (const pts of lawns) {
      const cx = pts.reduce((q, p) => q + p[0], 0) / pts.length, cz = pts.reduce((q, p) => q + p[1], 0) / pts.length;
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % pts.length], l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        for (let t = 6; t < l - 4; t += 15) {
          const x0 = p0[0] + (p1[0] - p0[0]) * t / l, z0 = p0[1] + (p1[1] - p0[1]) * t / l;
          const d = Math.hypot(cx - x0, cz - z0) || 1, x = x0 + (cx - x0) / d * 5, z = z0 + (cz - z0) / d * 5;
          if (!pointInPoly(x, z, pts) || roadGrid.nearest(x, z).d < 1.5 || collision.blocked(x, z, 4)) continue;
          spots.push([x, z, 'rain', 0.75 + rnd2() * 0.25]); collision.addCircle(x, z, 0.35);
        }
      }
    }
    // hand-placed feature trees (e.g. the big banyans & palms in front of 資管系館), still collision-checked
    for (const t of opts.featureTrees || []) {
      if (roadGrid.nearest(t.x, t.z).d < 1.0 || collision.blocked(t.x, t.z, 1.2)) continue;
      spots.push([t.x, t.z, t.kind, t.s]); collision.addCircle(t.x, t.z, 0.35);
    }
    const veg = [];
    for (const [x, z, kind, s] of spots) veg.push({ x, z, y: H(x, z) - 0.15, kind, s });
    for (const [x, z, s] of palms) veg.push({ x, z, y: H(x, z) - 0.15, kind: 'palm', s: 0.85 + (s - 0.8) * 0.3 });
    for (const [x, z, s] of shrubs) veg.push({ x, z, y: H(x, z) - 0.1, kind: 'shrub', s });
    world.vegetation = plantVegetation(scene, veg, quality);
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

  let lastT = 0;
  world.setQuality = (q) => { world.lampLights?.setEnabled(q !== 'low'); };
  world.update = (t, night, clockMin, playerPos) => {
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    for (const f of world.animated) f(t);
    for (const m of world.windowMats) m.emissiveIntensity = night * 1.1;
    if (world.shopMat) world.shopMat.emissiveIntensity = night * 0.85;
    if (world.lampMat) world.lampMat.emissiveIntensity = night * 3.2;
    if (world.poolMat) world.poolMat.opacity = night * 0.1;
    if (world.coneMat) world.coneMat.opacity = night * 0.05;
    if (world.marketGlow) world.marketGlow.opacity = night * 0.05;
    if (world.stallBodyMat) world.stallBodyMat.emissiveIntensity = night * 0.08;
    if (world.foodSignMat) world.foodSignMat.emissiveIntensity = 0.15 + night * 0.7;
    if (world.stallGlow) world.stallGlow.value = 0.04 + night * 0.22;
    if (world.lanternMat) world.lanternMat.emissiveIntensity = 0.3 + night * 1.4;
    if (world.signMats) for (const m of world.signMats) m.emissiveIntensity = 0.15 + night * 0.75;
    world.vegetation?.update(t, playerPos);
    world.lampLights?.update(dt, night, playerPos);
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
