// Terrain heights from data/terrain.json (MOI 20 m DTM, see tools/build_terrain.py).
// Game logic keeps y relative to the ground; only render positions add H(x,z).
// Interpolation matches the ground mesh: each grid cell is split along the
// (i,j)->(i+1,j+1) diagonal, so H() is exactly the drawn surface.

let G = null; // { minX, minZ, step, nx, nz, h: Float32Array }

export function loadTerrain(t) {
  if (!t || !t.rows) { G = null; return; }
  const nx = t.nx, nz = t.nz, s = t.scale || 0.1, off = t.off || 80;
  const h = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    let v = t.r0[j]; h[j * nx] = v * s;
    const row = t.rows[j];
    for (let i = 1; i < nx; i++) { v += row.charCodeAt(i - 1) - off; h[j * nx + i] = v * s; }
  }
  G = { minX: t.minX, minZ: t.minZ, step: t.step, nx, nz, h };
}
export const terrainGrid = () => G;

// ---------- pits: runtime sunken areas (js/zone_g.js 學活南面下沉舞台＋B1 麥當勞) ----------
// Axis-aligned rectangles registered before the world is built (js/main.js). Inside one H() is the
// pit floor, so everything that stands on H (players, NPCs, vehicles, trees, pads / stairs, the
// interiors and their physics walls / floors) follows it down. The 10 m grid itself is untouched:
// js/map.js draws the ground mesh from Hgrid() and masks it over the pits (pitRects), js/physworld.js
// refines the cells under a pit to 1 m so its floor follows H(). clearBridges() keeps the pits.
const pits = [];
// mask: false keeps the ground mesh drawn over it (a B1 room under a walkable plaza: js/zone_g.js puts a deck on top)
// veg: true keeps the trees and shrubs that grow in it (an outdoor sunken garden: js/zone_a.js 圖書館東側下沉庭院)
export function addPit(x0, z0, x1, z1, y, { mask = true, veg = false } = {}) { pits.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y, mask, veg }); }
export const pitList = () => pits;
// pit floor at (x,z) (within r metres of a pit when r > 0), or null
// (bare: skip the pits that keep their vegetation)
export function pitAt(x, z, r = 0, bare = false) {
  for (let i = 0; i < pits.length; i++) { const p = pits[i]; if (bare && p.veg) continue; if (x > p.x0 - r && x < p.x1 + r && z > p.z0 - r && z < p.z1 + r) return p.y; }
  return null;
}
// mask rectangles for js/map.js cutMask: [cx, cz, ux, uz, half length, half width]
export const pitRects = () => pits.filter(p => p.mask).map(p => [(p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2, 1, 0, (p.x1 - p.x0) / 2, (p.z1 - p.z0) / 2]);

export function H(x, z) {
  if (pits.length) for (let i = 0; i < pits.length; i++) { const p = pits[i]; if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return p.y; }
  return Hgrid(x, z);
}
// the terrain grid alone (no pits): the ground mesh
export function Hgrid(x, z) {
  if (!G) return 0;
  const { minX, minZ, step, nx, nz, h } = G;
  // outside the grid the edge value is reused (clamp)
  let fx = (x - minX) / step, fz = (z - minZ) / step;
  fx = fx < 0 ? 0 : fx > nx - 1 ? nx - 1 : fx;
  fz = fz < 0 ? 0 : fz > nz - 1 ? nz - 1 : fz;
  let i = Math.floor(fx), j = Math.floor(fz);
  if (i > nx - 2) i = nx - 2;
  if (j > nz - 2) j = nz - 2;
  const u = fx - i, v = fz - j, k = j * nx + i;
  const h00 = h[k], h10 = h[k + 1], h01 = h[k + nx], h11 = h[k + nx + 1];
  return u >= v ? h00 + u * (h10 - h00) + v * (h11 - h10) : h00 + v * (h01 - h00) + u * (h11 - h01);
}

// lowest ground under a small object (centre + ring), for things that must not float;
// counts raised levels (pads / stairs below) but not bridge decks
export function Hmin(x, z, r = 0) {
  let m = groundY(x, z);
  if (r > 0) for (let a = 0; a < 8; a++) m = Math.min(m, groundY(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r));
  return m;
}

// ---------- bridges (visual decks; collision stays 2D) ----------
const BC = 24; const bgrid = new Map(); const decks = [];
const bkey = (ix, iz) => ix * 73856 + iz;
// pts: polyline of one OSM bridge way. The deck runs straight between its two
// end heights but never below the ground across its width; it is sampled every
// <= DS m (map.js draws the same stations). Returns yAt(distance along the way).
export const DS = 2.5;
// opt (grade separations, see below): yAt(d) = deck height instead of the
// straight line between the ends; lv = the level kind the stations register as
export function addBridge(pts, w, opt = {}) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const h0 = H(pts[0][0], pts[0][1]), h1 = H(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  const base = opt.yAt || (d => h0 + (h1 - h0) * (total > 0 ? d / total : 0));
  const ds = [], ys = []; let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-3) continue;
    const n = Math.ceil(l / DS), nx = -(b[1] - a[1]) / l * w / 2, nz = (b[0] - a[0]) / l * w / 2;
    let px = 0, pz = 0, py = 0;
    for (let k = 0; k <= n; k++) {
      const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n, d = acc + l * k / n;
      const y = opt.lv >= LV_CUT ? base(d) : Math.max(base(d), H(x, z), H(x + nx, z + nz), H(x - nx, z - nz));
      if (k === 0 && ds.length) ys[ys.length - 1] = Math.max(ys[ys.length - 1], y);
      else { ds.push(d); ys.push(y); }
      if (k > 0) {
        const s = { ax: px, az: pz, bx: x, bz: z, ya: py, yb: y, r: w / 2, lv: opt.lv || 0 };
        const di = decks.length; decks.push(s);
        const x0 = Math.floor((Math.min(px, x) - s.r) / BC), x1 = Math.floor((Math.max(px, x) + s.r) / BC);
        const z0 = Math.floor((Math.min(pz, z) - s.r) / BC), z1 = Math.floor((Math.max(pz, z) + s.r) / BC);
        for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
          const kk = bkey(ix, iz); let lst = bgrid.get(kk); if (!lst) bgrid.set(kk, lst = []); lst.push(di);
        }
      }
      px = x; pz = z; py = ys[ys.length - 1];
    }
    acc += l;
  }
  return (d) => {
    if (!ds.length) return h0;
    if (d <= ds[0]) return ys[0];
    for (let i = 1; i < ds.length; i++) if (d <= ds[i]) { const t = (d - ds[i - 1]) / (ds[i] - ds[i - 1] || 1); return ys[i - 1] + (ys[i] - ys[i - 1]) * t; }
    return ys[ys.length - 1];
  };
}
// every deck / cut / box station (2.5 m segments): js/physworld.js turns them into physics colliders
export const deckList = () => decks;
export function clearBridges() { bgrid.clear(); decks.length = 0; levels.length = 0; }

// ---------- height levels: raised pads, stairs and ramps ----------
// Outdoor level changes smaller than the 10 m terrain grid (tools/overrides.json
// "levels", carried into data/cycu.json by tools/build_map.py):
//  - sinks: below-ground areas (sunken plazas) are cut into the terrain grid
//    itself by tools/build_terrain.py, so H() already holds them;
//  - pads: flat raised areas (terraces, platforms) at an absolute height y;
//  - stairs / ramps: a w-wide strip from a (bottom, y0) to b (top, y1); the
//    walkable surface is a smooth slope (steps > 0 only changes the drawing).
// Pads and stairs share the bridge bucket grid (entries < 0), and the
// at-grade part of surfaceAt() = max(terrain, low bridge deck, pad, stair
// slope) (grade separations are picked on top of that, see below), so the player,
// NPCs, vehicles and the camera follow them like a bridge. groundY() is the
// same without bridge decks: things placed on the ground use it (via Hmin).
// The edges are drawn and sealed by js/map.js (retaining walls / stair sides
// with 2D collision segments wherever the drop is above a step), so a pad
// is only reached by its stairs and ramps; vehicles may drive up stairs.
const levels = [];
const STEP_UP = 0.3; // drops up to this stay open (a kerb); higher ones get a wall
export { STEP_UP };
const register = (li, minx, minz, maxx, maxz) => {
  for (let ix = Math.floor(minx / BC); ix <= Math.floor(maxx / BC); ix++) for (let iz = Math.floor(minz / BC); iz <= Math.floor(maxz / BC); iz++) {
    const kk = bkey(ix, iz); let lst = bgrid.get(kk); if (!lst) bgrid.set(kk, lst = []); lst.push(-1 - li);
  }
};
const inPoly = (x, z, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], zi = pts[i][1], xj = pts[j][0], zj = pts[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi) inside = !inside;
  }
  return inside;
};
// pts: polygon [[x,z]...], y: absolute top height
export function addPad(pts, y, info = {}) {
  let minx = 1e9, minz = 1e9, maxx = -1e9, maxz = -1e9;
  for (const [x, z] of pts) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); }
  const L = { ...info, kind: 'pad', pts, y, minx, minz, maxx, maxz };
  register(levels.length, minx, minz, maxx, maxz); levels.push(L);
  return L;
}
// a, b: bottom / top centre [x,z]; y0, y1: heights there ('ground' = terrain); n: steps (0 = ramp)
export function addStair(a, b, w, y0, y1, n = 0, info = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
  if (y0 === 'ground') y0 = H(a[0], a[1]);
  if (y1 === 'ground') y1 = H(b[0], b[1]);
  const hw = w / 2, ex = Math.abs(uz) * hw, ez = Math.abs(ux) * hw;
  const L = { ...info, kind: 'stair', ax: a[0], az: a[1], ux, uz, len, hw, y0, y1, n };
  L.pts = [[a[0] + uz * hw, a[1] - ux * hw], [b[0] + uz * hw, b[1] - ux * hw], [b[0] - uz * hw, b[1] + ux * hw], [a[0] - uz * hw, a[1] + ux * hw]];
  register(levels.length, Math.min(a[0], b[0]) - ex, Math.min(a[1], b[1]) - ez, Math.max(a[0], b[0]) + ex, Math.max(a[1], b[1]) + ez);
  levels.push(L);
  return L;
}
export const levelList = () => levels;
// walk-surface height of one level at (x,z), -Infinity outside it
export function levelY(L, x, z) {
  if (L.kind === 'pad') return x >= L.minx && x <= L.maxx && z >= L.minz && z <= L.maxz && inPoly(x, z, L.pts) ? L.y : -Infinity;
  const px = x - L.ax, pz = z - L.az;
  // the ends reach 5 cm past the drawn stair so no rounding sliver opens between a
  // stair and the pad it meets (data/cycu.json coordinates are rounded to 1 cm)
  let d = px * L.ux + pz * L.uz;
  if (d < -0.05 || d > L.len + 0.05 || Math.abs(px * L.uz - pz * L.ux) > L.hw) return -Infinity;
  d = d < 0 ? 0 : d > L.len ? L.len : d;
  // stairs: the slope runs half a riser above the step nosings, so feet stay
  // within +-half a riser of the drawn treads (ramps: straight)
  const t = L.n > 0 ? Math.min(1, d / L.len + 0.5 / L.n) : d / L.len;
  return L.y0 + (L.y1 - L.y0) * t;
}
// highest pad / stair at (x,z), ignoring `skip` (a level object), or -Infinity
export function levelTop(x, z, skip = null) {
  const l = bgrid.get(bkey(Math.floor(x / BC), Math.floor(z / BC)));
  let y = -Infinity;
  if (l) for (let n = 0; n < l.length; n++) {
    if (l[n] >= 0) continue;
    const L = levels[-1 - l[n]];
    if (L !== skip) { const v = levelY(L, x, z); if (v > y) y = v; }
  }
  return y;
}
// ground including pads and stairs (no bridge decks): for things standing on it
export function groundY(x, z) { const g = H(x, z), t = levels.length ? levelTop(x, z) : -Infinity; return t > g ? t : g; }
// within `pad` metres of a stair / ramp footprint, or up to `foot` metres in front of
// its bottom end (walls along a street keep a gap there)
export function nearStair(x, z, pad = 0, foot = pad) {
  for (const L of levels) {
    if (L.kind !== 'stair') continue;
    const px = x - L.ax, pz = z - L.az, d = px * L.ux + pz * L.uz;
    if (d >= -foot && d <= L.len + pad && Math.abs(px * L.uz - pz * L.ux) <= L.hw + pad) return true;
  }
  return false;
}

// ---------- grade separations (viaducts, footbridges, road cuts) ----------
// tools/overrides.json 'grade', drawn by js/map.js. Unlike the low bridges
// above these are levels of their own, with something else at the same x/z:
//  LV_DECK: a deck above a street that stays at grade (viaduct, footbridge);
//  LV_CUT:  the floor of an open cut; there is no ground at its x/z (js/map.js
//           masks the ground mesh there);
//  LV_BOX:  the floor of a roofed cut (box under the railway); the ground on
//           top stays a level of its own.
// surfaceAt(x, z, ref) picks the level the caller is on: the highest one at
// most CLIMB above ref (its height a moment ago), else the lowest one; the
// at-grade ground (terrain / pad / stair / low bridge) is one candidate, except
// alongside an open cut. Without ref, ref is groundY() (terrain or pad / stair),
// so things placed on the ground stay on the ground.
export const LV_DECK = 1, LV_CUT = 2, LV_BOX = 3;
export const CLIMB = 0.6;
// pts: centreline; floorAt(d) = floor height d metres along it; roofed(d)
export function addCut(pts, w, floorAt, roofed) {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-3) continue;
    const n = Math.ceil(l / DS);
    for (let k = 0; k < n; k++) {
      const d0 = acc + l * k / n, d1 = acc + l * (k + 1) / n;
      const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
      addBridge([p, q], w, { yAt: d => floorAt(d0 + d), lv: roofed((d0 + d1) / 2) ? LV_BOX : LV_CUT });
    }
    acc += l;
  }
}

// ground for characters and vehicles: the at-grade ground (terrain, a pad /
// stair, or a low bridge deck when on one) plus the grade-separation levels,
// picked by ref (see grade separations above). Without ref, ref is the ground
// without bridges (groundY), so things placed on the ground or a pad stay there.
export function surfaceAt(x, z, ref) {
  const g = H(x, z);
  const l = bgrid.get(bkey(Math.floor(x / BC), Math.floor(z / BC)));
  if (!l) return g;
  let y = g, open = false, best = -Infinity, low = Infinity;
  if (ref === undefined) { ref = g; for (let n = 0; n < l.length; n++) if (l[n] < 0) { const v = levelY(levels[-1 - l[n]], x, z); if (v > ref) ref = v; } }
  const top = ref + CLIMB;
  for (let n = 0; n < l.length; n++) {
    if (l[n] < 0) { const v = levelY(levels[-1 - l[n]], x, z); if (v > y) y = v; continue; }
    const s = decks[l[n]];
    const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz || 1;
    let t = ((x - s.ax) * dx + (z - s.az) * dz) / l2;
    // a level's station only counts beside it (+-1 m along), not in the round end caps:
    // on a ramp the caps reach the neighbouring stations' heights (a cut's are 6.5 m)
    if (s.lv && (t < -1 / Math.sqrt(l2) || t > 1 + 1 / Math.sqrt(l2))) continue;
    const beside = t >= 0 && t <= 1; // an open cut removes the ground only alongside its stations
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = s.ax + dx * t - x, qz = s.az + dz * t - z;
    if (qx * qx + qz * qz > s.r * s.r) continue;
    const d = s.ya + (s.yb - s.ya) * t;
    if (!s.lv) { if (d > y) y = d; continue; }
    if (s.lv === LV_CUT && beside) open = true;
    if (d <= top && d > best) best = d;
    if (d < low) low = d;
  }
  if (low === Infinity) return y;
  if (!open) { if (y <= top && y > best) best = y; if (y < low) low = y; }
  return best > -Infinity ? best : low;
}
