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

export function H(x, z) {
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

// lowest ground under a small object (centre + ring), for things that must not float
export function Hmin(x, z, r = 0) {
  let m = H(x, z);
  if (r > 0) for (let a = 0; a < 8; a++) m = Math.min(m, H(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r));
  return m;
}

// ---------- bridges (visual decks; collision stays 2D) ----------
const BC = 24; const bgrid = new Map(); const decks = [];
const bkey = (ix, iz) => ix * 73856 + iz;
// pts: polyline of one OSM bridge way. The deck runs straight between its two
// end heights but never below the ground across its width; it is sampled every
// <= DS m (map.js draws the same stations). Returns yAt(distance along the way).
export const DS = 2.5;
export function addBridge(pts, w) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const h0 = H(pts[0][0], pts[0][1]), h1 = H(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  const ds = [], ys = []; let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-3) continue;
    const n = Math.ceil(l / DS), nx = -(b[1] - a[1]) / l * w / 2, nz = (b[0] - a[0]) / l * w / 2;
    let px = 0, pz = 0, py = 0;
    for (let k = 0; k <= n; k++) {
      const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n, d = acc + l * k / n;
      const y = Math.max(h0 + (h1 - h0) * (total > 0 ? d / total : 0), H(x, z), H(x + nx, z + nz), H(x - nx, z - nz));
      if (k === 0 && ds.length) ys[ys.length - 1] = Math.max(ys[ys.length - 1], y);
      else { ds.push(d); ys.push(y); }
      if (k > 0) {
        const s = { ax: px, az: pz, bx: x, bz: z, ya: py, yb: y, r: w / 2 };
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
export function clearBridges() { bgrid.clear(); decks.length = 0; }

// ground for characters and vehicles: terrain, or a bridge deck when on one
export function surfaceAt(x, z) {
  const g = H(x, z);
  const l = bgrid.get(bkey(Math.floor(x / BC), Math.floor(z / BC)));
  if (!l) return g;
  let y = g;
  for (let n = 0; n < l.length; n++) {
    const s = decks[l[n]];
    const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz || 1;
    let t = ((x - s.ax) * dx + (z - s.az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = s.ax + dx * t - x, qz = s.az + dz * t - z;
    if (qx * qx + qz * qz <= s.r * s.r) { const d = s.ya + (s.yb - s.ya) * t; if (d > y) y = d; }
  }
  return y;
}
