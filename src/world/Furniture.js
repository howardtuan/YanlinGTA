// Street furniture: OSM barriers, traffic signals, crossings, bus stops, power
// poles, cabinets, parking bays, parked scooters and data-driven shop signs.
// Static props share one vertex-coloured mesh; nothing here casts shadows.
import * as THREE from 'three';
import { pointInPoly, closestOnSeg, CollisionWorld } from '../physics/Collision.js';
import { Hmin, groundY, nearStair } from './Terrain.js';

const UP = [0, 1, 0], DOWN = [0, -1, 0];
// right-hand side of travel (x east, z south)
const right = (tx, tz) => [-tz, tx];

// point hash for spacing tests; near() also counts each point's own radius
export class Pts {
  constructor(cell = 16) { this.c = cell; this.m = new Map(); }
  add(x, z, r = 0) {
    const k = Math.floor(x / this.c) * 73856 + Math.floor(z / this.c);
    let a = this.m.get(k); if (!a) this.m.set(k, a = []); a.push(x, z, r);
  }
  near(x, z, d) {
    const n = Math.ceil(d / this.c) + 1, ix = Math.floor(x / this.c), iz = Math.floor(z / this.c);
    for (let i = ix - n; i <= ix + n; i++) for (let j = iz - n; j <= iz + n; j++) {
      const a = this.m.get(i * 73856 + j); if (!a) continue;
      for (let k = 0; k < a.length; k += 3) { const dd = d + a[k + 2]; if ((a[k] - x) ** 2 + (a[k + 1] - z) ** 2 < dd * dd) return true; }
    }
    return false;
  }
}

// ---------- geometry helpers (into a map.js Geo) ----------
// box standing on y, centred on x/z, local +z turned to heading ry
function box(g, x, y, z, sx, sy, sz, ry, c, top = c, bottom = false) {
  const cs = Math.cos(ry), sn = Math.sin(ry), hx = sx / 2, hz = sz / 2;
  const P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
  const X = [cs, 0, -sn], Z = [sn, 0, cs];
  g.quad(P(hx, 0, -hz), P(hx, 0, hz), P(hx, sy, hz), P(hx, sy, -hz), c, X);
  g.quad(P(-hx, 0, hz), P(-hx, 0, -hz), P(-hx, sy, -hz), P(-hx, sy, hz), c, X.map(v => -v));
  g.quad(P(-hx, 0, hz), P(hx, 0, hz), P(hx, sy, hz), P(-hx, sy, hz), c, Z);
  g.quad(P(hx, 0, -hz), P(-hx, 0, -hz), P(-hx, sy, -hz), P(hx, sy, -hz), c, Z.map(v => -v));
  g.quad(P(-hx, sy, -hz), P(hx, sy, -hz), P(hx, sy, hz), P(-hx, sy, hz), top, UP);
  if (bottom) g.quad(P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, 0, hz), P(-hx, 0, hz), c, DOWN);
}
// vertical (tapered) prism with a top cap
function cyl(g, x, y, z, r0, r1, h, seg, c) {
  const top = [];
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    g.quad([x + c0 * r0, y, z + s0 * r0], [x + c1 * r0, y, z + s1 * r0], [x + c1 * r1, y + h, z + s1 * r1], [x + c0 * r1, y + h, z + s0 * r1], c, [Math.cos(am), 0, Math.sin(am)]);
    top.push([x + c0 * r1, y + h, z + s0 * r1]);
  }
  for (let k = 1; k < seg - 1; k++) g.tri(top[0], top[k], top[k + 1], c, UP);
}
// wheel: prism along local x (used for the scooter model only)
function wheel(g, z, y, r, w, c) {
  const seg = 6, L = [], R = [];
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
    const p = (s, a) => [s * w / 2, y + Math.cos(a) * r, z + Math.sin(a) * r];
    g.quad(p(-1, a0), p(1, a0), p(1, a1), p(-1, a1), c, [0, Math.cos(am), Math.sin(am)]);
    L.push(p(-1, a0)); R.push(p(1, a0));
  }
  for (let k = 1; k < seg - 1; k++) { g.tri(L[0], L[k], L[k + 1], c, [-1, 0, 0]); g.tri(R[0], R[k], R[k + 1], c, [1, 0, 0]); }
}

// ---------- sign atlas ----------
const CW = 64, CH = 256; // one cell; horizontal signs are drawn rotated 90 deg
const FONT = '"Noto Sans TC","Microsoft JhengHei",sans-serif';
const SIGN_KINDS = new Set(('restaurant cafe convenience clothes fast_food hairdresser deli mobile_phone beauty games optician ' +
  'motorcycle_repair ice_cream telecommunication supermarket toys bar pharmacy clinic pet copyshop electronics pasta laundry ' +
  'pastry car_parts bakery chemist dentist pet_grooming massage stationery beverages musical_instrument shoes books gift ' +
  'houseware tattoo lottery bed hardware motorcycle department_store curtain lighting alcohol health_food car_repair jewelry ' +
  'florist photo electrical prep_school music_school fitness_centre trade').split(' '));
// chain brands: Chinese shop name only, never a logo or brand colours
const BRAND = { '7-eleven': '統一超商' };
const CJK = '㐀-鿿豈-﫿぀-ヿ㄀-ㄯ'; // + bopomofo (小ㄚ頭)
function signText(name) {
  const b = BRAND[name.trim().toLowerCase()]; if (b) return b;
  // keep CJK / kana only: drops Latin brand words, digits and symbols
  const n0 = name.replace(/[（(][^)）]*[)）]/g, ' ');
  const s = n0.replace(new RegExp(`[^${CJK}]+`, 'g'), ' ').trim();
  const parts = s.split(' ').filter(Boolean).sort((a, b) => b.length - a.length);
  const t = parts[0] || '';
  if ([...t].length >= 2) return t;
  // one CJK char (85度C, 50嵐, 花the髮): plain text of the whole short name
  const w = n0.replace(new RegExp(`[^${CJK}0-9A-Za-z]+`, 'g'), '');
  return t && [...w].length <= 8 ? w : null;
}
// trim branch suffixes / place prefixes so long names fit; never cut mid-word
const PLACE = /^(桃園市|桃園|中壢區|中壢|中原)/, BRANCH = /(總店|分店|門市|旗艦店|分館|總館)$/;
function shortName(t, max) {
  if ([...t].length <= max) return t;
  let s = t.replace(BRANCH, '');
  if ([...s].length > max && [...s.replace(PLACE, '')].length >= 3) s = s.replace(PLACE, '');
  return s;
}
const SIGN_COL = [['#c8102e', '#ffffff'], ['#ffd23f', '#a3001b'], ['#0a7d3b', '#ffffff'], ['#1a5fd1', '#ffffff'], ['#ffffff', '#c8102e'],
  ['#ff7a00', '#ffffff'], ['#222222', '#ffd23f'], ['#6b2bd1', '#ffffff'], ['#a3001b', '#ffe9a8'], ['#008891', '#ffffff'], ['#fff6e0', '#3a2a1a']];

function makeAtlas(cols, rows) {
  const cv = document.createElement('canvas'); cv.width = cols * CW; cv.height = rows * CH;
  const g = cv.getContext('2d');
  const cells = new Map(); let used = 0;
  const atlas = {
    cols, rows, cv,
    // returns [u0,v0,u1,v1] or null when full
    cell(text, bg, fg, horiz) {
      const key = `${text  }|${  bg  }|${  horiz ? 'h' : 'v'}`;
      if (cells.has(key)) return cells.get(key);
      if (used >= cols * rows) return null;
      const cx = (used % cols) * CW, cy = Math.floor(used / cols) * CH; used++;
      g.fillStyle = bg; g.fillRect(cx, cy, CW, CH);
      g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(cx + 6, cy + 6, CW - 12, CH - 12);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const chars = [...text];
      if (!horiz) {
        const step = (CH - 28) / chars.length, fs = Math.min(44, step * 0.92);
        g.font = `900 ${fs}px ${FONT}`;
        chars.forEach((ch, i) => g.fillText(ch, cx + CW / 2, cy + 14 + step * (i + 0.5)));
      } else {
        // reading direction runs down the cell, glyph tops point to +u
        g.save(); g.translate(cx + CW / 2, cy + CH / 2); g.rotate(Math.PI / 2);
        let fs = 40; g.font = `900 ${fs}px ${FONT}`;
        const w = g.measureText(text).width; if (w > CH - 30) { fs = fs * (CH - 30) / w; g.font = `900 ${fs}px ${FONT}`; }
        g.fillText(text, 0, 2); g.restore();
      }
      // 2 px inset keeps mip levels from bleeding into the neighbours
      const W = cols * CW, Hh = rows * CH;
      const uv = [(cx + 2) / W, 1 - (cy + CH - 2) / Hh, (cx + CW - 2) / W, 1 - (cy + 2) / Hh];
      cells.set(key, uv); return uv;
    },
    get used() { return used; },
  };
  return atlas;
}
// sign panel: front face normal (fx,fz); text upright (or rotated for
// horizontal signs); both faces read correctly; edges use the cell border colour
function signPanel(g, cx, y0, cz, fx, fz, W, Hh, T, uv, horiz, back = true) {
  const [u0, v0, u1, v1] = uv, rx = fz, rz = -fx; // viewer's right on the front face
  const eu = [u0 + 0.0005, v1 - 0.0005];
  const corner = (s, side, top) => [cx + fx * T / 2 * s + rx * W / 2 * side, y0 + (top ? Hh : 0), cz + fz * T / 2 * s + rz * W / 2 * side];
  const face = (s) => {
    // s=1 front, s=-1 back (its right is the front's left)
    const L = -s, R = s;
    const lb = corner(s, L, 0), rb = corner(s, R, 0), rt = corner(s, R, 1), lt = corner(s, L, 1);
    const uvs = horiz ? [[u0, v1], [u0, v0], [u1, v0], [u1, v1]] : [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    g.quad(lb, rb, rt, lt, [1, 1, 1], [fx * s, 0, fz * s], uvs);
  };
  face(1); if (back) face(-1);
  const E = [eu, eu, eu, eu], w = [1, 1, 1];
  g.quad(corner(1, 1, 0), corner(-1, 1, 0), corner(-1, 1, 1), corner(1, 1, 1), w, [rx, 0, rz], E);
  g.quad(corner(1, -1, 0), corner(-1, -1, 0), corner(-1, -1, 1), corner(1, -1, 1), w, [-rx, 0, -rz], E);
  g.quad(corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1), corner(-1, -1, 1), w, UP, E);
  g.quad(corner(1, -1, 0), corner(1, 1, 0), corner(-1, 1, 0), corner(-1, -1, 0), w, DOWN, E);
}

// ---------- scooter model (local: nose +z, ground y=0) ----------
function scooterGeometry(Geo) {
  const g = new Geo();
  const BODY = [1, 1, 1], DARK = [0.12, 0.12, 0.13], TYRE = [0.07, 0.07, 0.07], CHROME = [0.55, 0.56, 0.58];
  box(g, 0, 0.18, -0.02, 0.34, 0.12, 0.7, 0, BODY);       // floorboard
  box(g, 0, 0.3, -0.42, 0.4, 0.48, 0.66, 0, BODY);        // rear cowl
  box(g, 0, 0.78, -0.36, 0.32, 0.1, 0.62, 0, DARK);       // seat
  box(g, 0, 0.26, 0.38, 0.38, 0.72, 0.16, 0, BODY);       // front shield
  box(g, 0, 0.98, 0.42, 0.62, 0.06, 0.08, 0, DARK);       // handlebar
  box(g, 0, 0.12, -0.92, 0.14, 0.2, 0.2, 0, CHROME);      // exhaust / tail
  wheel(g, 0.55, 0.24, 0.24, 0.11, TYRE);
  wheel(g, -0.6, 0.24, 0.24, 0.12, TYRE);
  const geo = g.mesh(null).geometry; geo.deleteAttribute('uv');
  return { geo, tris: g.tris };
}

// =====================================================================
export function buildFurniture(scene, world, data, ctx) {
  const { Geo, col, addFlat, low, rnd, keep = [] } = ctx;
  const B = data.bounds, coll = world.collision, roads = world.roadGrid;
  const furn = new Geo(), flat = new Geo(true), signs = new Geo();
  const log = world.furnitureLog = { wallSkipped: [], onArea: [], poleSkipped: 0, signs: [] };
  const stats = world.furnitureStats = {};
  const soft = world.soft = new Pts(8); // parked scooters: no collision, but spawns / trees avoid them
  const poles = new Pts(16);            // every pole-like thing, for spacing
  const inB = (x, z, m = 0) => x > B.minX - m && x < B.maxX + m && z > B.minZ - m && z < B.maxZ + m;
  const driveF = s => s[5].drive && !s[5].under;
  const roadAt = (x, z, f = driveF) => {
    const r = roads.nearest(x, z, f); if (!r.seg) return null;
    const s = r.seg, dx = s[2] - s[0], dz = s[3] - s[1], l = Math.hypot(dx, dz) || 1;
    return { d: r.d, q: r.q, tx: dx / l, tz: dz / l, w: s[4], road: s[5] };
  };
  const driveClear = (x, z, m) => { const r = roads.nearest(x, z, driveF); return !r.seg || r.d > m; };

  // keep-clear spots: interiors (reserved), gate barriers, spawn, mission road points
  const keepPts = keep.slice();
  for (const n in world.named) {
    const it = world.named[n]; const p = world.nearestRoadPoint(it.x, it.z);
    if (p) keepPts.push({ x: p.x, z: p.z, r: 4 });
  }
  const nearReserved = (x, z, pad) => {
    for (const p of coll.reserved) {
      if (pointInPoly(x, z, p)) return true;
      if (pad > 0) for (let k = 0; k < 8; k++) if (pointInPoly(x + Math.cos(k * 0.785) * pad, z + Math.sin(k * 0.785) * pad, p)) return true;
    }
    return false;
  };
  const keepClear = (x, z, pad = 0) => {
    for (const k of keepPts) if ((k.x - x) ** 2 + (k.z - z) ** 2 < (k.r + pad) ** 2) return false;
    return true;
  };
  // Reserved outlines (custom-built parts, js/main.js) are tested last: every placement is first decided as with no
  // reserved outline at all, and only then dropped near one. A dropped item stays as a ghost: it keeps its poles /
  // soft spacing, its rnd draws and its count against the caps, and its collider goes to world.furnGhost (js/map.js
  // lays the lamps and trees out against those too), so adding or changing a reserved outline drops only what stands
  // near it and moves nothing else (as the trees in js/map.js, see okOsm there).
  // coll.noReserved: coll.blocked() leaves the reserved outlines to these explicit tests (restored at the end)
  const ghost = world.furnGhost = new CollisionWorld(B);
  const blk = (x, z, r) => coll.blocked(x, z, r) || ghost.blocked(x, z, r);
  coll.noReserved = true;
  const tris0 = () => furn.tris;

  // ---------- 1. walls and hedges ----------
  {
    const gates = data.furniture.filter(f => f.t === 'barrier:gate' || f.t === 'barrier:lift_gate');
    const WALL = col('#aca89f'), CAP = col('#8c8880'), HEDGE = col('#3c6a2e'), HTOP = col('#4f8236');
    let segs = 0, len = 0;
    // fence: 鐵皮圍籬 colour (補建街區 sheet_fence barriers) -> 2.2 m sheet, thin, no cap
    // skin: barriers marked b.skin (js/main.js) keep their collision here but are drawn elsewhere (the 大仁街 brick
    // wall, js/dorms.js): their kept runs go to data.wallSkins instead of the grey wall
    let skinOut = null;
    const emit = (ax, az, bx, bz, hedge, first, last, hj, fence = null) => {
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz); if (l < 0.05) return;
      if (skinOut) {
        skinOut.push({ ax, az, bx, bz, ya: groundY(ax, az), yb: groundY(bx, bz), first, last });
        if (inB(ax, az) || inB(bx, bz)) { coll.addSegment(ax, az, bx, bz); segs++; }
        len += l; return;
      }
      const hh = fence ? 2.2 : hedge ? 1.2 + hj : 1.8, th = fence ? 0.08 : hedge ? 0.8 : 0.2, ux = dz / l, uz = -dx / l;
      const ya = groundY(ax, az), yb = groundY(bx, bz), c = fence || (hedge ? HEDGE : WALL);
      const side = (o, top0, top1, cc, s) => {
        const ox = ux * o * s, oz = uz * o * s;
        furn.quad([ax + ox, ya + top0, az + oz], [bx + ox, yb + top0, bz + oz], [bx + ox, yb + top1, bz + oz], [ax + ox, ya + top1, az + oz], cc, [ux * s, 0, uz * s]);
      };
      const cap = (o, y, cc) => furn.quad([ax + ux * o, ya + y, az + uz * o], [bx + ux * o, yb + y, bz + uz * o], [bx - ux * o, yb + y, bz - uz * o], [ax - ux * o, ya + y, az - uz * o], cc, UP);
      const end = (x, z, y, s, o, top) => {
        const tx = dx / l * s, tz = dz / l * s;
        furn.quad([x + ux * o, y - 0.4, z + uz * o], [x - ux * o, y - 0.4, z - uz * o], [x - ux * o, y + top, z - uz * o], [x + ux * o, y + top, z + uz * o], c, [tx, 0, tz]);
      };
      side(th / 2, -0.4, hh, c, 1); side(th / 2, -0.4, hh, c, -1);
      if (fence) { const dk = fence.map(v => v * 0.6); side(th / 2 + 0.01, -0.4, 0.25, dk, 1); side(th / 2 + 0.01, -0.4, 0.25, dk, -1); cap(th / 2 + 0.02, hh, dk); }
      else if (hedge) cap(th / 2, hh, HTOP);
      else { side(th / 2 + 0.04, hh, hh + 0.1, CAP, 1); side(th / 2 + 0.04, hh, hh + 0.1, CAP, -1); cap(th / 2 + 0.04, hh + 0.1, CAP); }
      if (first) end(ax, az, ya, -1, th / 2, hh); if (last) end(bx, bz, yb, 1, th / 2, hh);
      if (inB(ax, az) || inB(bx, bz)) { coll.addSegment(ax, az, bx, bz); segs++; }
      len += l;
    };
    data.barriers.forEach((b, bi) => {
      if (b.type !== 'wall' && b.type !== 'hedge' && b.type !== 'sheet_fence') return;
      skinOut = b.skin && b.type === 'wall' ? (data.wallSkins = data.wallSkins || []) : null;
      const hedge = b.type === 'hedge', fence = b.type === 'sheet_fence' ? col(b.colour || '#2f6aa8') : null, th = fence ? 0.08 : hedge ? 0.8 : 0.2;
      // onArea: the barrier tag sits on a landuse outline (here the 山葉 factory
      // and 中壢簡易庭 enclosures). They are real walls, but landuse outlines are
      // often traced along kerbs or road centres, so these keep 1.5 m off any
      // carriageway (plain walls: 0.3 m); results go to furnitureLog.onArea
      const roadPad = b.onArea ? 1.5 : fence ? 0.5 : 0.3;
      // 1 m steps flagged keep / drop; drops are road crossings, gates,
      // building interiors and keep-clear zones
      const st = [];
      for (let i = 0; i < b.pts.length - 1; i++) {
        const a = b.pts[i], c = b.pts[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l < 0.05) continue;
        const n = Math.max(1, Math.round(l));
        for (let k = 0; k < n; k++) {
          const x0 = a[0] + (c[0] - a[0]) * k / n, z0 = a[1] + (c[1] - a[1]) * k / n, x1 = a[0] + (c[0] - a[0]) * (k + 1) / n, z1 = a[1] + (c[1] - a[1]) * (k + 1) / n;
          const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
          let ok = inB(mx, mz, 150), road = false;
          if (ok) { const r = roads.nearest(mx, mz); if (r.seg && r.d < (r.seg[5].drive ? roadPad : 0) + th / 2) { ok = false; road = true; } }
          if (ok && gates.some(g => (g.x - mx) ** 2 + (g.z - mz) ** 2 < 6.25)) ok = false;
          if (ok && nearStair(mx, mz, 1.5, 4)) ok = false; // outdoor stairs (terrain.js) pass through the wall
          if (ok && coll.insideAny(mx, mz)) ok = false;
          if (ok && !keepClear(mx, mz, 3)) { ok = false; log.wallSkipped.push({ barrier: bi, x: +mx.toFixed(1), z: +mz.toFixed(1) }); }
          // near a reserved outline: dropped, but still splits the runs as a kept step (ghost)
          const gh = ok && nearReserved(mx, mz, 3);
          if (gh) log.wallSkipped.push({ barrier: bi, x: +mx.toFixed(1), z: +mz.toFixed(1), reserved: true });
          st.push({ x0, z0, x1, z1, ok, gh, road, brk: k === n - 1 });
        }
      }
      if (b.onArea) log.onArea.push({ barrier: bi, steps: st.length, kept: st.filter(s => s.ok).length });
      // widen road gaps by a step on each side
      const gap = st.map((s, i) => s.road || (st[i - 1] && st[i - 1].road) || (st[i + 1] && st[i + 1].road));
      const hj = hedge ? (bi % 3) * 0.08 : 0;
      // a run (cut as with no reserved outline) emits its non-ghost pieces; its ghost steps block in world.furnGhost
      const emitRun = (r, last) => {
        let j = r.i0;
        while (j <= r.i1) {
          let k = j; while (k < r.i1 && st[k + 1].gh === st[j].gh) k++;
          const a = st[j], b = st[k];
          if (!a.gh) emit(a.x0, a.z0, b.x1, b.z1, hedge, j === r.i0 ? r.first : true, k === r.i1 ? last : true, hj, fence);
          else if (inB(a.x0, a.z0) || inB(b.x1, b.z1)) ghost.addSegment(a.x0, a.z0, b.x1, b.z1);
          j = k + 1;
        }
      };
      let run = null, cnt = 0;
      const flush = (last) => { if (run) emitRun(run, last); run = null; cnt = 0; };
      for (let i = 0; i < st.length; i++) {
        const s = st[i], ok = s.ok && !gap[i];
        if (!ok) { flush(true); continue; }
        if (!run) run = { i0: i, i1: i, first: !st[i - 1] || !(st[i - 1].ok && !gap[i - 1]) };
        else run.i1 = i;
        cnt++;
        const nextOk = st[i + 1] && st[i + 1].ok && !gap[i + 1];
        // split every 8 m and at polyline corners so the wall follows the terrain
        if (!nextOk) flush(true);
        else if (cnt >= 8 || s.brk) { emitRun(run, false); run = null; cnt = 0; }
      }
      flush(true);
    });
    skinOut = null;
    stats.wallSegs = segs; stats.wallLen = Math.round(len); stats.wallTris = tris0();
  }

  // ---------- 2. traffic signals and crossings ----------
  const POLE = col('#7d8086'), HOUSING = col('#2b2d30'), ZEBRA = col('#e8e7e1');
  const heads = [];
  const signalPole = (px, pz, ax, az, L, faces, grp) => {
    const y = Hmin(px, pz, 0.3);
    cyl(furn, px, y - 0.2, pz, 0.15, 0.12, 6.6, 8, POLE);
    box(furn, px + ax * L / 2, y + 5.85, pz + az * L / 2, 0.12, 0.14, L, Math.atan2(ax, az), POLE, POLE, true);
    const at = L > 6 ? [L - 0.6, L * 0.45] : [L - 0.6];
    for (const d of at) {
      const hx = px + ax * d, hz = pz + az * d;
      box(furn, hx, y + 5.68, hz, 0.06, 0.18, 0.06, 0, POLE);
      faces.forEach(([fx, fz], k) => {
        const o = faces.length > 1 ? 0.16 : 0, cx = hx + fx * o, cz = hz + fz * o, ry = Math.atan2(fx, fz);
        box(furn, cx, y + 5.3, cz, 1.05, 0.38, 0.3, ry, HOUSING, HOUSING, true);
        heads.push({ x: cx, y: y + 5.49, z: cz, ry, grp });
      });
    }
    coll.addCircle(px, pz, 0.2); poles.add(px, pz, 0);
  };
  // a pole that passed every test but a reserved outline's: not drawn, still spaces the others and blocks as a ghost
  const ghostPole = (x, z, r) => { ghost.addCircle(x, z, r); poles.add(x, z, 0); };
  // crossings surveyed on the NLSC 2024 正射 (tools/roads.json features -> data.roadMarks; js/map.js paints them)
  // stand in for the one a signal junction would get on that arm:
  // a surveyed zebra (roads.json feature without osm) within 10 m that crosses the same street as this arm
  // (its ang = the street's direction, parallel to the arm): the orthophoto puts the crossing there instead
  const surveyedZebra = (x, z, a) => (data.roadMarks || []).some(f => f.t === 'zebra' && !f.osm && (f.x - x) ** 2 + (f.z - z) ** 2 < 100 &&
    Math.abs(Math.cos(f.ang * Math.PI / 180 - Math.atan2(a.ez, a.ex))) > 0.9);
  // a surveyed zebra across this arm within 31 m of the junction, measured along the arm's own polyline
  // (arms bend): the orthophoto shows where the real crossing is, so no generic one too
  const surveyedOnArm = (a) => {
    const P = a.road.pts, k = P.findIndex(p => p[0] === a.x && p[1] === a.z), dir = a.fwd ? 1 : -1;
    if (k < 0) return false;
    return (data.roadMarks || []).some(f => {
      if (f.t !== 'zebra' || f.osm) return false;
      let acc = 0;
      for (let i = k; i + dir >= 0 && i + dir < P.length && acc < 31; i += dir) {
        const p = P[i], q = P[i + dir], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1;
        const t = ((f.x - p[0]) * dx + (f.z - p[1]) * dz) / l, v = Math.abs((f.x - p[0]) * dz - (f.z - p[1]) * dx) / l;
        if (t >= -0.5 && t <= l + 0.5 && acc + t > 0 && acc + t < 31 && v < a.w / 2 + 2) return true;
        acc += l;
      }
      return false;
    });
  };
  // a junction of several signal nodes (divided roads) puts some arms' crossings out on the other carriageways'
  // pavement, where the 2024 正射 shows none: skip a crossing whose centre lies on another drivable way
  // (unless the survey saw a crossing there that it left to this code: osm: true)
  // roads.json 'nozebra': the orthophoto shows plain asphalt where this code would lay a crossing (inner links of a
  // multi-node junction, an arm without one): no generic zebra / stop line within 6 m of it
  const noZebra = (x, z) => (data.roadMarks || []).some(f => f.t === 'nozebra' && (f.x - x) ** 2 + (f.z - z) ** 2 < 36);
  const osmZebra = (x, z) => (data.roadMarks || []).some(f => f.t === 'zebra' && f.osm && (f.x - x) ** 2 + (f.z - z) ** 2 < 100);
  const onOtherRoad = (x, z, own) => data.roads.some(q => {
    if (q === own || !q.drive || q.under || q.bridge) return false;
    for (let j = 0; j < q.pts.length - 1; j++) {
      const a = q.pts[j], b = q.pts[j + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
      if (Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < q.w / 2 - 0.5) return true;
    }
    return false;
  });
  // 停止線 ~1.3 m behind an arm's crossing, across the lanes coming in (right-hand traffic: the left of the arm's
  // outward direction; all of a one-way arm that runs in, none of one that runs out); not where the survey has one
  const surveyedStop = (x, z) => (data.roadMarks || []).some(f => f.t === 'stop' && (f.x - x) ** 2 + (f.z - z) ** 2 < 144);
  const stopLine = (a, d) => {
    if (a.road.oneway && a.fwd) return;
    const [rx, rz] = right(a.ex, a.ez), cx = a.x + a.ex * d, cz = a.z + a.ez * d, e = a.w / 2 - 0.3;
    const [v0, v1] = a.road.oneway ? [-e, e] : [-e, -0.2]; // offsets along right(); incoming = negative side
    const mx = cx + rx * (v0 + v1) / 2, mz = cz + rz * (v0 + v1) / 2;
    if (surveyedStop(mx, mz) || onOtherRoad(mx, mz, a.road)) return;
    flat.strip([cx + rx * v0, cz + rz * v0], [cx + rx * v1, cz + rz * v1], 0.4, 0.05, ZEBRA);
  };
  const zebra = (cx, cz, ex, ez, w) => {
    const [rx, rz] = right(ex, ez), half = w / 2 - 0.5;
    for (let o = -half + 0.25; o <= half - 0.2; o += 0.9) {
      const x = cx + rx * o, z = cz + rz * o;
      flat.strip([x - ex * 1.5, z - ez * 1.5], [x + ex * 1.5, z + ez * 1.5], 0.45, 0.05, ZEBRA);
    }
  };
  // OSM ways meeting at each node (drivable, not unnamed driveways)
  const arms = new Map();
  for (const r of data.roads) {
    if (!r.drive || r.under || (r.type === 'service' && !r.name) || !r.nodes || r.nodes.length !== r.pts.length) continue;
    const n = r.pts.length;
    for (let i = 0; i < n; i++) for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= n) continue;
      const p = r.pts[i], q = r.pts[j], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
      let A = arms.get(r.nodes[i]); if (!A) arms.set(r.nodes[i], A = []);
      A.push({ x: p[0], z: p[1], ex: dx / l, ez: dz / l, w: r.wv ? r.wv[i] : r.w, road: r, fwd: j > i }); // fwd: the arm runs the way's own direction (one-way traffic leaves)
    }
  }
  const junctions = [];
  for (const [id, A] of arms) if (A.length >= 3 && inB(A[0].x, A[0].z, 40)) junctions.push({ id, x: A[0].x, z: A[0].z, A });
  const signalJunction = (J) => {
    // phase groups relative to the first arm: roughly parallel arms share one
    const A0 = J.A[0];
    for (const a of J.A) {
      const grp = Math.abs(a.ex * A0.ex + a.ez * A0.ez) > 0.7 ? 0 : 1;
      if (a.road.bridge) continue;
      const s = Math.max(...J.A.filter(o => o !== a).map(o => o.w / 2)) + 1.5;
      { const zx = a.x + a.ex * (s + 1.8), zz = a.z + a.ez * (s + 1.8); if (!surveyedZebra(zx, zz, a) && !surveyedOnArm(a) && !noZebra(zx, zz) && (osmZebra(zx, zz) || !onOtherRoad(zx, zz, a.road))) { zebra(zx, zz, a.ex, a.ez, a.w); stopLine(a, s + 4.6); } }
      // far-side pole on the right of traffic leaving along this arm
      const [rx, rz] = right(a.ex, a.ez);
      for (const ds of [0, 3, 6]) {
        const px = a.x + a.ex * (s + ds) + rx * (a.w / 2 + 0.8), pz = a.z + a.ez * (s + ds) + rz * (a.w / 2 + 0.8);
        if (!inB(px, pz) || coll.insideAny(px, pz) || !driveClear(px, pz, 0.3) || blk(px, pz, 0.4) || poles.near(px, pz, 4) || !keepClear(px, pz, 1.5)) continue;
        if (nearReserved(px, pz, 1.5)) { ghostPole(px, pz, 0.2); break; }
        signalPole(px, pz, -rx, -rz, Math.min(a.w * 0.7, 7.5), [[-a.ex, -a.ez]], grp);
        break;
      }
    }
  };
  {
    const sigs = data.furniture.filter(f => f.t === 'traffic_signals' && inB(f.x, f.z, 40));
    const chosen = [];
    for (const s of sigs) {
      let best = null, bd = 30 * 30;
      for (const J of junctions) { const d = (J.x - s.x) ** 2 + (J.z - s.z) ** 2; if (d < bd) { bd = d; best = J; } }
      if (best) { if (!chosen.some(c => Math.hypot(c.x - best.x, c.z - best.z) < 20)) { chosen.push(best); signalJunction(best); } continue; }
      // mid-block signal (pedestrian crossing): one pole, heads both ways
      const r = roadAt(s.x, s.z); if (!r || r.d > 3) continue;
      const [rx, rz] = right(r.tx, r.tz), px = r.q[0] + rx * (r.w / 2 + 0.8), pz = r.q[1] + rz * (r.w / 2 + 0.8);
      zebra(r.q[0], r.q[1], r.tx, r.tz, r.w);
      if (!coll.insideAny(px, pz) && !poles.near(px, pz, 4) && keepClear(px, pz, 1.5)) nearReserved(px, pz, 1.5) ? ghostPole(px, pz, 0.2) : signalPole(px, pz, -rx, -rz, Math.min(r.w * 0.7, 7.5), [[-r.tx, -r.tz], [r.tx, r.tz]], 0);
    }
    stats.osmJunctions = chosen.length;
    // no data: big junctions (3+ primary/secondary arms from 2+ roads) get signals too
    let proc = 0;
    const MAIN = { primary: 1, secondary: 1 };
    for (const J of junctions) {
      const M = J.A.filter(a => MAIN[a.road.type]);
      if (M.length < 3 || new Set(M.map(a => a.road.name || a.road)).size < 2 || !inB(J.x, J.z, -5)) continue;
      if (chosen.some(c => Math.hypot(c.x - J.x, c.z - J.z) < 40)) continue;
      chosen.push(J); signalJunction(J); proc++;
    }
    stats.procJunctions = proc;
    // OSM marked crossings
    for (const f of data.furniture) {
      if (f.t !== 'crossing' || !inB(f.x, f.z, 20)) continue;
      const r = roadAt(f.x, f.z); if (!r || r.d >= 0) continue;
      // a surveyed zebra within 10 m across the same street paints this crossing where the orthophoto has it
      // (js/map.js), or the survey saw none here (nozebra)
      if (noZebra(f.x, f.z) || (data.roadMarks || []).some(m => m.t === 'zebra' && !m.osm && (m.x - f.x) ** 2 + (m.z - f.z) ** 2 < 100 &&
        Math.abs(Math.cos(m.ang * Math.PI / 180 - Math.atan2(r.tz, r.tx))) > 0.9)) continue;
      zebra(r.q[0], r.q[1], r.tx, r.tz, r.w);
    }
  }
  stats.signalHeads = heads.length;

  // ---------- 3. bus stops ----------
  // low quality: half the atlas (64 cells), bus stops share one cell, the
  // rest goes to shop signs; signs past the cap are counted in stats
  const atlas = makeAtlas(low ? 16 : 32, 4);
  {
    const GLASS = col('#9fb8c4'), ROOF = col('#5f6a72'), BENCH = col('#8a6a48');
    let n = 0, shelters = 0;
    for (const f of data.furniture) {
      if (f.t !== 'bus_stop' || !inB(f.x, f.z, 30)) continue;
      const r = roadAt(f.x, f.z); if (!r || r.d > 8) continue;
      // stand on the side of the road the stop is on
      let vx = f.x - r.q[0], vz = f.z - r.q[1], l = Math.hypot(vx, vz);
      if (l < 0.3) { [vx, vz] = right(r.tx, r.tz); l = 1; }
      vx /= l; vz /= l;
      const off = Math.max(r.w / 2 + 0.7, Math.min(l, r.w / 2 + 3));
      const px = r.q[0] + vx * off, pz = r.q[1] + vz * off;
      if (coll.insideAny(px, pz) || !keepClear(px, pz, 1)) continue;
      // a stop near a reserved outline is a ghost (its atlas cell still taken, so the shop signs keep theirs)
      const gs = nearReserved(px, pz, 1);
      const y = Hmin(px, pz, 0.3);
      if (!gs) cyl(furn, px, y - 0.2, pz, 0.05, 0.05, 3.2, 6, POLE);
      const uv = atlas.cell((!low && signText(f.name || '')) || '公車站', '#1d4f9c', '#ffffff', false);
      if (gs) ghostPole(px, pz, 0.12);
      else if (uv) signPanel(signs, px + r.tx * 0.04, y + 1.9, pz + r.tz * 0.04, r.tx, r.tz, 0.42, 1.15, 0.05, uv, false);
      if (!gs) { coll.addCircle(px, pz, 0.12); poles.add(px, pz, 0); n++; }
      // shelter 2 m further from the road when the pavement allows it
      const sx = px + vx * 1.3 + r.tx * 2.6, sz = pz + vz * 1.3 + r.tz * 2.6, ry = Math.atan2(r.tx, r.tz);
      const pts = [];
      for (const a of [-1.9, 0, 1.9]) for (const b of [-0.75, 0.75]) pts.push([sx + r.tx * a + vx * b, sz + r.tz * a + vz * b]);
      if (pts.every(([x, z]) => inB(x, z) && !coll.insideAny(x, z) && driveClear(x, z, 0.3) && !blk(x, z, 0.3) && keepClear(x, z, 1))) {
        const bx0 = sx + vx * 0.65 - r.tx * 1.75, bz0 = sz + vz * 0.65 - r.tz * 1.75, bx1 = sx + vx * 0.65 + r.tx * 1.75, bz1 = sz + vz * 0.65 + r.tz * 1.75;
        if (gs || pts.some(([x, z]) => nearReserved(x, z, 1))) { ghost.addSegment(bx0, bz0, bx1, bz1); continue; }
        const sy = Hmin(sx, sz, 1.8);
        for (const a of [-1.75, 1.75]) for (const b of [-0.6, 0.6]) box(furn, sx + r.tx * a + vx * b, sy - 0.2, sz + r.tz * a + vz * b, 0.08, 2.7, 0.08, ry, POLE);
        box(furn, sx, sy + 2.5, sz, 0.12, 0.1, 3.9, ry, ROOF, ROOF, true);
        box(furn, sx + vx * 0.65, sy + 0.4, sz + vz * 0.65, 0.04, 1.7, 3.5, ry, GLASS);
        box(furn, sx + vx * 0.4, sy + 0.42, sz + vz * 0.4, 0.4, 0.05, 2.6, ry, BENCH);
        // back panel blocks, the open front does not
        coll.addSegment(bx0, bz0, bx1, bz1);
        shelters++;
      }
    }
    stats.busStops = n; stats.shelters = shelters;
  }

  // ---------- 4. cabinets, mirrors, transformers, towers ----------
  {
    const CAB = col('#55805a'), CABT = col('#6a9670'), MIR = col('#f07a1a');
    for (const f of data.furniture) {
      if (!inB(f.x, f.z, 30)) continue;
      const cab = f.t === 'street_cabinet' || f.t === 'power:transformer', mirror = f.t === 'traffic_mirror', tower = f.t === 'power:tower';
      if (!cab && !mirror && !tower) continue;
      let x = f.x, z = f.z;
      const r = roadAt(x, z);
      if (!tower && r && r.d < 0.4) { const [rx, rz] = right(r.tx, r.tz), s = ((x - r.q[0]) * rx + (z - r.q[1]) * rz) >= 0 ? 1 : -1; x = r.q[0] + rx * s * (r.w / 2 + 0.6); z = r.q[1] + rz * s * (r.w / 2 + 0.6); }
      if (coll.insideAny(x, z) || !keepClear(x, z, 1)) continue;
      if (nearReserved(x, z, 1)) { ghostPole(x, z, cab ? (f.t === 'power:transformer' ? 0.9 : 0.5) : mirror ? 0.12 : 2.2); continue; }
      const ry = r ? Math.atan2(r.tx, r.tz) : 0, y = Hmin(x, z, 0.6);
      if (cab) {
        const big = f.t === 'power:transformer';
        box(furn, x, y - 0.2, z, big ? 1.4 : 0.55, big ? 1.8 : 1.45, big ? 1.4 : 1.0, ry, CAB, CABT);
        coll.addCircle(x, z, big ? 0.9 : 0.5);
      } else if (mirror) {
        cyl(furn, x, y - 0.2, z, 0.05, 0.05, 2.8, 6, MIR);
        box(furn, x, y + 2.3, z, 0.75, 0.75, 0.06, ry + Math.PI / 4, MIR);
        coll.addCircle(x, z, 0.12);
      } else {
        cyl(furn, x, y - 0.5, z, 2.6, 0.35, 32, 4, POLE);
        for (const hh of [22, 27]) box(furn, x, y + hh, z, 7, 0.4, 0.4, ry, POLE, POLE, true);
        coll.addCircle(x, z, 2.2);
      }
      poles.add(x, z, 0);
    }
  }

  // ---------- 5. power poles and wires ----------
  const wires = [];
  {
    const PP = col('#bdb9af'), ARM = col('#6d6a66');
    const placed = []; // {x,z,y,ax,az}
    // near a reserved outline the pole is a ghost: in placed (found, spaced, counted) but not drawn, no wires to it
    const pole = (x, z, dx, dz) => {
      if (nearReserved(x, z, 1.5) || nearReserved(x, z, 2)) { ghostPole(x, z, 0.2); const p = { x, z, ghost: true }; placed.push(p); return p; }
      const l = Math.hypot(dx, dz) || 1, ax = -dz / l, az = dx / l, y = Hmin(x, z, 0.3);
      cyl(furn, x, y - 0.3, z, 0.17, 0.12, 10.3, 6, PP);
      box(furn, x, y + 9.15, z, 0.1, 0.1, 1.6, Math.atan2(ax, az), ARM, ARM, true);
      coll.addCircle(x, z, 0.2); poles.add(x, z, 0);
      const p = { x, z, y, ax, az }; placed.push(p); return p;
    };
    // wires: two on the crossarm, one telecom cable lower down
    const span = (a, b) => {
      if (!a || !b || low || a.ghost || b.ghost) return;
      const l = Math.hypot(b.x - a.x, b.z - a.z); if (l < 2 || l > 70) return;
      const sg = a.ax * b.ax + a.az * b.az < 0 ? -1 : 1, sag = 0.1 + l * 0.015;
      for (const [o, hh] of [[0.7, 9.2], [-0.7, 9.2], [0, 7.2]]) {
        const p0 = [a.x + a.ax * o, a.y + hh, a.z + a.az * o], p1 = [b.x + b.ax * o * sg, b.y + hh, b.z + b.az * o * sg];
        let prev = p0;
        for (let k = 1; k <= 4; k++) {
          const t = k / 4, q = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - sag * 4 * t * (1 - t), p0[2] + (p1[2] - p0[2]) * t];
          wires.push(...prev, ...q); prev = q;
        }
      }
    };
    const okPole = (x, z) => inB(x, z, 60) && !coll.insideAny(x, z) && keepClear(x, z, 1.5);
    // snap a pole standing in a carriageway to its edge
    const snap = (x, z) => {
      const r = roadAt(x, z); if (!r || r.d > 0.3) return [x, z];
      const [rx, rz] = right(r.tx, r.tz), s = ((x - r.q[0]) * rx + (z - r.q[1]) * rz) >= 0 ? 1 : -1;
      return [r.q[0] + rx * s * (r.w / 2 + 0.5), r.q[1] + rz * s * (r.w / 2 + 0.5)];
    };
    const find = (x, z, d) => placed.find(p => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d);
    // OSM power lines: a pole at every vertex, extra poles on long spans
    for (const w of data.power) {
      let prev = null;
      for (let i = 0; i < w.pts.length; i++) {
        const a = w.pts[i], b = w.pts[Math.min(i + 1, w.pts.length - 1)], pa = w.pts[Math.max(i - 1, 0)];
        const list = [[a[0], a[1]]];
        if (i < w.pts.length - 1) { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(l / 45); for (let k = 1; k < n; k++) list.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
        for (const [x0, z0] of list) {
          const [x, z] = snap(x0, z0);
          let p = find(x, z, 3);
          if (!p && okPole(x, z) && driveClear(x, z, 0.25) && !blk(x, z, 0.3)) p = pole(x, z, b[0] - pa[0], b[1] - pa[1]);
          else if (!p) log.poleSkipped++;
          span(prev, p); prev = p;
        }
      }
    }
    for (const f of data.furniture) {
      if (f.t !== 'power:pole') continue;
      const [x, z] = snap(f.x, f.z);
      if (find(x, z, 3)) continue;
      if (!okPole(x, z) || !driveClear(x, z, 0.25) || blk(x, z, 0.3)) { log.poleSkipped++; continue; }
      const r = roadAt(x, z); pole(x, z, r ? r.tx : 1, r ? r.tz : 0);
    }
    stats.osmPoles = placed.filter(p => !p.ghost).length;
    // procedural: lanes and residential streets outside campus
    const cap = low ? 120 : 400, step = low ? 48 : 32; let proc = 0;
    data.roads.forEach((r, ri) => {
      if (proc >= cap || !r.drive || r.under || r.bridge) return;
      if (!(r.type === 'residential' || r.type === 'living_street' || r.type === 'unclassified' || (r.type === 'service' && r.service === 'alley'))) return;
      if (world.inCampus(r.pts[0][0], r.pts[0][1])) return;
      const side = (ri * 2654435761 >>> 0) % 2 ? 1 : -1;
      let acc = 0, prev = null;
      for (let i = 0; i < r.pts.length - 1 && proc < cap; i++) {
        const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        if (l < 0.5) continue;
        const [rx, rz] = right(dx / l, dz / l);
        for (let s = (step - acc % step) % step; s < l; s += step) {
          const x = a[0] + dx * s / l + rx * side * (r.w / 2 + 0.5), z = a[1] + dz * s / l + rz * side * (r.w / 2 + 0.5);
          if (!inB(x, z, -5) || !okPole(x, z) || !driveClear(x, z, 0.25) || blk(x, z, 0.45) || poles.near(x, z, 12)) { prev = null; continue; }
          const p = pole(x, z, dx, dz); proc++;
          if (prev && Math.hypot(prev.x - x, prev.z - z) < step * 1.6) span(prev, p);
          prev = p;
        }
        acc += l;
      }
    });
    stats.procPoles = proc;
  }

  // ---------- 6. parking bays and parked scooters ----------
  const motos = [];
  const motoCap = low ? 120 : 300;
  {
    const LINE = col('#e6e5df');
    const okMoto = (x, z, ex, ez) =>
      inB(x, z, -2) && !coll.insideAny(x, z) && !coll.insideAny(x + ex * 0.9, z + ez * 0.9) && !coll.insideAny(x - ex * 0.9, z - ez * 0.9) &&
      driveClear(x + ex * 0.95, z + ez * 0.95, 0.15) && driveClear(x - ex * 0.95, z - ez * 0.95, 0.15) &&
      !blk(x, z, 0.45) && keepClear(x, z, 3) && !soft.near(x, z, 0.36);
    // near a reserved outline a scooter is a ghost: it takes its rnd draws, its place in soft (the trees in js/map.js
    // avoid it too) and its count against the caps, and is only left out of the mesh
    const addMoto = (x, z, ry) => { motos.push([x, z, ry + (rnd() - 0.5) * 0.12, nearReserved(x, z, 3)]); soft.add(x, z, 0.35); };
    const inAreaPts = (P, a) => P.every(([x, z]) => pointInPoly(x, z, a.pts) && !(a.holes && a.holes.some(h => pointInPoly(x, z, h))));
    for (const a of data.areas) {
      if (a.kind !== 'parking' || !inB(a.pts[0][0], a.pts[0][1], 20)) continue;
      const f = ctx.obb(a.pts), L = f.u1 - f.u0, W = f.v1 - f.v0;
      const moto = a.sub === 'motorcycle';
      if (L < 6 || W < 4 || ctx.polyArea(a.pts) < 60) continue;
      const pitch = moto ? 1.0 : 2.5, depth = moto ? 2.0 : 5.0;
      const rows = W >= depth * 2 + 3 ? [[f.v0 + 0.3, 1], [f.v1 - 0.3, -1]] : [[f.v0 + 0.3, 1]];
      for (const [v, s] of rows) for (let u = f.u0 + 0.5; u <= f.u1 - 0.5; u += pitch) {
        const p0 = f.P(u, v), p1 = f.P(u, v + s * depth), pm = f.P(u, v + s * depth / 2);
        if (!inAreaPts([p0, p1], a) || !driveClear(pm[0], pm[1], 0.2)) continue;
        flat.strip(p0, p1, 0.12, 0.035, LINE);
        if (moto && u + pitch <= f.u1 - 0.5 && motos.length < motoCap * 0.45 && rnd() < 0.8) {
          const c = f.P(u + pitch / 2, v + s * (depth / 2 + 0.1)), ex = (p1[0] - p0[0]) / depth, ez = (p1[1] - p0[1]) / depth;
          if (okMoto(c[0], c[1], ex, ez)) addMoto(c[0], c[1], Math.atan2(ex, ez));
        }
      }
    }
    stats.parkingMotos = motos.filter(m => !m[3]).length;
    // in front of ground floor shops (騎樓前), noses to the wall
    const walls = world.shopWalls || [];
    for (let wi = 0; wi < walls.length && motos.length < motoCap * 0.8; wi++) {
      const w = walls[(wi * 7919) % walls.length], [ax, az] = w.a, [cx, cz] = w.c, l = Math.hypot(cx - ax, cz - az);
      if (l < 3 || rnd() < 0.35) continue;
      const dx = (cx - ax) / l, dz = (cz - az) / l, nx = w.n[0], nz = w.n[2];
      for (let s = 0.7; s < l - 0.6 && motos.length < motoCap * 0.8; s += 0.8) {
        if (rnd() < 0.18) continue;
        const x = ax + dx * s + nx * 1.4, z = az + dz * s + nz * 1.4;
        if (okMoto(x, z, nx, nz)) addMoto(x, z, Math.atan2(-nx, -nz));
      }
    }
    // kerbside rows on side streets
    const cand = data.roads.filter(r => r.drive && !r.under && !r.bridge && r.type !== 'primary' && !(r.type === 'service' && !r.name));
    for (let k = 0; k < 400 && motos.length < motoCap && cand.length; k++) {
      const r = cand[Math.floor(rnd() * cand.length)], i = Math.floor(rnd() * (r.pts.length - 1));
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 8) continue;
      const tx = dx / l, tz = dz / l, side = rnd() < 0.5 ? 1 : -1, [rx, rz] = right(tx, tz), n = 3 + Math.floor(rnd() * 6), s0 = rnd() * (l - n * 0.8);
      for (let j = 0; j < n && motos.length < motoCap; j++) {
        const s = s0 + j * 0.8, x = a[0] + tx * s + rx * side * (r.w / 2 + 1.05), z = a[1] + tz * s + rz * side * (r.w / 2 + 1.05);
        if (okMoto(x, z, rx, rz)) addMoto(x, z, Math.atan2(rx * side, rz * side));
      }
    }
    const real = motos.filter(m => !m[3]);
    stats.motos = real.length; stats.motoGhosts = motos.length - real.length;
    world.motoSpots = real.map(([x, z, ry]) => [x, z, ry]);
    if (real.length) {
      const { geo, tris } = scooterGeometry(Geo);
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), real.length);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), C = new THREE.Color();
      const PAL = ['#e8e8e4', '#2a2a2c', '#b8bcc0', '#b8282a', '#2c5aa0', '#6b6e70', '#d8b440', '#5a8a5a', '#f2f0ea', '#3a3f48'];
      let j = 0;
      motos.forEach(([x, z, ry, gh], i) => {
        const c = PAL[Math.floor(rnd() * PAL.length)]; if (gh) return; // ghosts keep their colour draw
        E.set(0, ry, (i % 2 ? 1 : -1) * 0.07, 'YXZ'); Q.setFromEuler(E); P.set(x, Hmin(x, z, 0.8), z); M.compose(P, Q, S);
        im.setMatrixAt(j, M); im.setColorAt(j, C.set(c)); j++;
      });
      im.castShadow = false; im.receiveShadow = true;
      scene.add(im);
      stats.motoTris = tris * real.length;
    }
  }

  // ---------- 7. shop signs from POIs ----------
  {
    const bb = data.buildings.map(b => { let a = 1e9, c = 1e9, d = -1e9, e = -1e9; for (const [x, z] of b.pts) { a = Math.min(a, x); c = Math.min(c, z); d = Math.max(d, x); e = Math.max(e, z); } return [a, c, d, e]; });
    const walls = world.shopWalls || [];
    const used = new Map(); // wall -> [[t0,t1]]
    const picks = [];
    for (const p of data.pois) {
      if (!p.name || p.noSign || !SIGN_KINDS.has(p.kind) || !inB(p.x, p.z, 10)) continue;
      const text = signText(p.name); if (!text) continue;
      let bi = -1;
      for (let i = 0; i < bb.length && bi < 0; i++) { const q = bb[i]; if (p.x >= q[0] && p.x <= q[2] && p.z >= q[1] && p.z <= q[3] && pointInPoly(p.x, p.z, data.buildings[i].pts)) bi = i; }
      // own building's shop walls first, else the nearest shop wall within 30 m
      if (bi >= 0 && !walls.some(w => w.bi === bi)) bi = -1;
      let best = null, bd = bi >= 0 ? 1e9 : 30;
      for (const w of walls) {
        if (bi >= 0 && w.bi !== bi) continue;
        const q = closestOnSeg(p.x, p.z, w.a[0], w.a[1], w.c[0], w.c[1]), d = Math.hypot(q[0] - p.x, q[1] - p.z);
        if (d < bd) { bd = d; best = [w, q[2]]; }
      }
      if (best) picks.push({ p, text, w: best[0], t: best[1], d: bd });
    }
    // hand-added shops (overrides.json pois, prio=1) first: the atlas fills up long before the POI list ends
    picks.sort((a, b) => (b.p.prio || 0) - (a.p.prio || 0) || a.d - b.d);
    let n = 0, full = 0, low2 = 0;
    for (const { p, text, w, t } of picks) {
      const [ax, az] = w.a, [cx, cz] = w.c, l = Math.hypot(cx - ax, cz - az), dx = (cx - ax) / l, dz = (cz - az) / l, nx = w.n[0], nz = w.n[2];
      const hsh = [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
      // long names: shorten, else go horizontal (font shrinks to fit), never truncate
      const sv = shortName(text, 7), sh = shortName(text, 9);
      const vert = w.h >= 7 && w.floors >= 2 && (w.floors >= 3 ? hsh % 4 : hsh % 2) !== 0 && [...sv].length <= 7;
      if (!vert && (w.h < 4.9 || [...sh].length > 12)) { low2++; continue; }
      const txt = vert ? sv : sh;
      const half = vert ? 0.65 : Math.min(Math.max(0.55 * [...txt].length + 0.9, 1.6), Math.min(l - 0.4, 6)) / 2;
      if (half * 2 > l - 0.2) continue;
      const occ = used.get(w) || [];
      let at = null;
      for (const o of [0, 1.4, -1.4, 2.8, -2.8, 4.2, -4.2]) {
        const s = Math.min(Math.max(t * l + o, half + 0.1), l - half - 0.1);
        if (occ.every(([a, b]) => s + half < a || s - half > b)) { at = s; break; }
      }
      if (at === null) continue;
      const [bg, fg] = p.kind === 'convenience' ? ['#ffffff', '#1a3f7a'] : SIGN_COL[hsh % SIGN_COL.length];
      const uv = atlas.cell(txt, bg, fg, !vert); if (!uv) { full++; continue; }
      occ.push([at - half, at + half]); used.set(w, occ);
      const mx = ax + dx * at, mz = az + dz * at;
      log.signs.push([txt, +mx.toFixed(1), +mz.toFixed(1), +nx.toFixed(2), +nz.toFixed(2), vert ? 1 : 0]);
      if (vert) {
        const hh = Math.min(2.6, w.h - 4.4);
        signPanel(signs, mx + nx * 0.85, w.base + 3.9, mz + nz * 0.85, dx, dz, 1.0, hh, 0.2, uv, false);
      } else {
        signPanel(signs, mx + nx * 0.12, w.base + 3.75, mz + nz * 0.12, nx, nz, half * 2, 0.95, 0.12, uv, true, false);
      }
      n++;
    }
    stats.signs = n; stats.atlasCells = atlas.used; stats.atlasCap = atlas.cols * atlas.rows;
    stats.signsAtlasFull = full; stats.signsNoFit = low2;
  }

  // ---------- meshes ----------
  const mats = [];
  if (furn.tris) {
    const m = furn.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    m.castShadow = false; m.receiveShadow = true; scene.add(m);
  }
  if (flat.tris) addFlat(flat, null, 'furniture');
  if (signs.tris) {
    const tex = new THREE.CanvasTexture(atlas.cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.6 });
    const m = signs.mesh(mat); m.castShadow = false; scene.add(m);
    mats.push(mat);
  }
  if (wires.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#25282b' }));
    scene.add(ls);
  }
  // signal lenses: one instanced mesh, colours change only on a phase switch
  if (heads.length) {
    const lens = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.24, 0.04), new THREE.MeshBasicMaterial({ color: '#ffffff' }), heads.length * 3);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const ON = ['#ff2a1a', '#ffb81a', '#1aff7a'].map(c => new THREE.Color(c)), OFF = ['#3a1512', '#3a2e12', '#123a22'].map(c => new THREE.Color(c));
    heads.forEach((h, i) => {
      Q.setFromAxisAngle(Y, h.ry);
      for (let k = 0; k < 3; k++) {
        const lx = (k - 1) * 0.33, cs = Math.cos(h.ry), sn = Math.sin(h.ry);
        P.set(h.x + lx * cs + 0.16 * sn, h.y, h.z - lx * sn + 0.16 * cs); M.compose(P, Q, S); lens.setMatrixAt(i * 3 + k, M);
        lens.setColorAt(i * 3 + k, OFF[k]);
      }
    });
    lens.castShadow = false; scene.add(lens);
    // 36 s cycle: group 0 green 0-15, yellow 15-18, red 18-36; group 1 the opposite
    let phase = -1;
    world.animated.push((t) => {
      const c = t % 36, ph = c < 15 ? 0 : c < 18 ? 1 : c < 33 ? 2 : 3;
      if (ph === phase) return; phase = ph;
      const lit = [[2, 0], [1, 0], [0, 2], [0, 1]][ph];
      for (let i = 0; i < heads.length; i++) for (let k = 0; k < 3; k++) lens.setColorAt(i * 3 + k, lit[heads[i].grp] === k ? ON[k] : OFF[k]);
      lens.instanceColor.needsUpdate = true;
    });
  }
  stats.furnTris = furn.tris; stats.flatTris = flat.tris; stats.signTris = signs.tris; stats.wireSegs = wires.length / 6;
  world.tris.furniture = furn.tris + flat.tris + signs.tris + (stats.motoTris || 0) + heads.length * 36;
  coll.noReserved = false;
  return { signMats: mats };
}
