// Cuts one storey out of what the game built: Interiors walls that cross the cut height become wall lines, walkable
// surfaces at the floor's height become floor, sloping surfaces become stairs, texts on doors / signs become labels.
// Everything is returned in the building's local frame (metres; the Kit's x / z).

const EPS = 1e-6;
const bbox = (p) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { x0, x1, z0, z1 }; };

export function makeFrame(env, kit, base = kit.base) {
  const H = env.H, sc = kit.sc || 1;
  return {
    kit, base, sc, ang: kit.ang,
    l: (x, z) => kit.l(x, z), w: (lx, lz) => kit.w(lx, lz),
    // Interiors stores heights above the local ground; the model's own heights are above the building base
    y: (rel, x, z) => (rel + H(x, z) - base) / sc,
  };
}

// every wall, surface and text once, in local coordinates with local heights
export function collect(env, frame) {
  const walls = [];
  for (const w of env.I.walls) {
    const a = frame.l(w[0], w[1]), b = frame.l(w[2], w[3]); if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.02) continue;
    const mx = (w[0] + w[2]) / 2, mz = (w[1] + w[3]) / 2;
    walls.push({ a, b, y0: frame.y(w[4], mx, mz), y1: frame.y(w[5], mx, mz) });
  }
  const surfaces = [];
  for (const s of env.I.surfaces) {
    const n = s.pts.length; if (n < 3) continue;
    const c = s.pts.reduce((q, p) => [q[0] + p[0] / n, q[1] + p[1] / n], [0, 0]);
    // sample just inside the corners, the edge midpoints and the centre
    const at = [c]; for (let i = 0; i < n; i++) { const p = s.pts[i], q = s.pts[(i + 1) % n]; at.push([p[0] + (c[0] - p[0]) * 0.03, p[1] + (c[1] - p[1]) * 0.03], [(p[0] + q[0]) / 2 + (c[0] - (p[0] + q[0]) / 2) * 0.03, (p[1] + q[1]) / 2 + (c[1] - (p[1] + q[1]) / 2) * 0.03]); }
    const sm = [];
    try { for (const [x, z] of at) { const h = s.h(x, z); if (Number.isFinite(h) && h > -1e5) { const l = frame.l(x, z); sm.push([l[0], l[1], frame.y(h, x, z)]); } } } catch { continue; }
    if (sm.length < 3) continue;
    const lo = Math.min(...sm.map(v => v[2])), hi = Math.max(...sm.map(v => v[2]));
    // least-squares plane through the samples: the way up
    let sx = 0, sz = 0, sy = 0; for (const v of sm) { sx += v[0]; sz += v[1]; sy += v[2]; } sx /= sm.length; sz /= sm.length; sy /= sm.length;
    let xx = 0, xz = 0, zz = 0, xy = 0, zy = 0; for (const v of sm) { const dx = v[0] - sx, dz = v[1] - sz, dy = v[2] - sy; xx += dx * dx; xz += dx * dz; zz += dz * dz; xy += dx * dy; zy += dz * dy; }
    const det = xx * zz - xz * xz, gx = Math.abs(det) > EPS ? (xy * zz - zy * xz) / det : 0, gz = Math.abs(det) > EPS ? (zy * xx - xy * xz) / det : 0;
    surfaces.push({ poly: s.pts.map(p => frame.l(p[0], p[1])), lo, hi, mean: sy, grad: [gx, gz], sloped: hi - lo > 0.06 && Math.hypot(gx, gz) > 0.02 });
  }
  const texts = [];
  for (const t of env.texts) {
    let x = t.x, z = t.z, nx = t.nx, nz = t.nz, y = t.y, w = t.w, h = t.h;
    if (t.kit !== frame.kit) { // another Kit of the same build: through world coordinates
      const p = t.kit.w(t.x, t.z), q = t.kit.w(t.x + t.nx, t.z + t.nz), lp = frame.l(p[0], p[1]), lq = frame.l(q[0], q[1]), k = (t.kit.sc || 1) / frame.sc;
      x = lp[0]; z = lp[1]; nx = lq[0] - lp[0]; nz = lq[1] - lp[1]; y = (t.kit.base + t.y * (t.kit.sc || 1) - frame.base) / frame.sc; w *= k; h *= k;
    }
    const d = Math.hypot(nx, nz) || 1;
    texts.push({ text: t.text, x, y, z, w, h, nx: nx / d, nz: nz / d, door: h >= 1.6 && w <= 2.6 && h > w * 1.2, via: t.via });
  }
  return { walls, surfaces, texts };
}

// heights where there is a lot of flat walkable floor: a help when writing a new building's settings
export function levels(all) {
  const bins = new Map();
  for (const s of all.surfaces) { if (s.sloped) continue; const b = bbox(s.poly), a = (b.x1 - b.x0) * (b.z1 - b.z0), k = Math.round(s.mean * 10) / 10; bins.set(k, (bins.get(k) || 0) + a); }
  return [...bins].map(([y, area]) => ({ y, area })).sort((p, q) => p.y - q.y);
}

// floor: { y, top, cut = 1, lo, hi }
export function slice(all, floor) {
  const y = floor.y, top = floor.top ?? y + 3, cut = y + (floor.cut ?? 1.0), tol = floor.tol ?? 0.2;
  const tLo = floor.lo ?? y - 0.2, tHi = floor.hi ?? top - 0.2;
  const seen = new Map(), walls = [];
  for (const w of all.walls) {
    if (!(w.y0 <= cut && w.y1 >= cut)) continue;
    const kind = w.y1 >= y + (floor.full ?? 2.3) ? 'wall' : 'low'; // lower than a wall: parapets, railings, furniture
    const r = (v) => v.toFixed(2), k1 = `${r(w.a[0])},${r(w.a[1])},${r(w.b[0])},${r(w.b[1])}`, k2 = `${r(w.b[0])},${r(w.b[1])},${r(w.a[0])},${r(w.a[1])}`;
    const old = seen.get(k1) ?? seen.get(k2);
    if (old) { if (kind === 'wall') old.kind = 'wall'; continue; }
    const o = { a: w.a, b: w.b, kind, y0: w.y0, y1: w.y1 }; seen.set(k1, o); walls.push(o);
  }
  const floors = [], landings = [], up = [], down = [];
  for (const s of all.surfaces) {
    if (!s.sloped) {
      if (Math.abs(s.mean - y) <= tol) floors.push(s.poly);
      else if (s.mean > y + tol && s.mean < top - tol) landings.push({ poly: s.poly, y: s.mean });
      continue;
    }
    const g = Math.hypot(s.grad[0], s.grad[1]), st = { poly: s.poly, dir: [s.grad[0] / g, s.grad[1] / g], lo: s.lo, hi: s.hi, slope: g };
    if (s.lo >= y - tol && s.lo < top - tol) up.push({ ...st, kind: 'up' });
    else if (Math.abs(s.hi - y) <= tol && s.lo < y - tol) down.push({ ...st, kind: 'down' });
  }
  // a flight coming up from the floor below lies under a flight going up (switchback and scissor stairs): the one going up is drawn
  const over = (p, q) => { const a = bbox(p), b = bbox(q), ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0); return ix > 0 && iz > 0 ? ix * iz / ((a.x1 - a.x0) * (a.z1 - a.z0) || 1) : 0; };
  const stairs = [...up, ...down.filter(d => !up.some(u => over(d.poly, u.poly) > 0.5) && !floors.some(f => over(d.poly, f) > 0.5))];
  const texts = all.texts.filter(t => t.y >= tLo && t.y < tHi);
  return { y, top, walls, floors, landings, stairs, texts };
}

// A row of rooms that cannot be entered: the model only has their doors on the corridor wall, no partitions.
// row: { x0, x1, z0, z1, doors: 'n' | 's' | 'w' | 'e' } (which edge of the rectangle the doors are on).
// Each door is taken to be in the middle of its room, so the partitions follow from the doors one after another;
// floor and stairs inside the rectangle (a stair well, a hall, rooms you can enter) are left out.
export function closedCells(sl, row, warn = () => {}) {
  const alongX = row.doors === 'n' || row.doors === 's';
  const u0 = alongX ? row.x0 : row.z0, u1 = alongX ? row.x1 : row.z1, d0 = alongX ? row.z0 : row.x0, d1 = alongX ? row.z1 : row.x1;
  const edge = row.doors === 'n' ? row.z0 : row.doors === 's' ? row.z1 : row.doors === 'w' ? row.x0 : row.x1;
  const U = (p) => (alongX ? p[0] : p[1]), D = (p) => (alongX ? p[1] : p[0]);
  // what is already floor / stairs inside the rectangle
  let obs = [];
  for (const poly of [...sl.floors, ...sl.landings.map(l => l.poly), ...sl.stairs.map(s => s.poly)]) {
    const us = poly.map(U), ds = poly.map(D), a = Math.max(u0, Math.min(...us)), b = Math.min(u1, Math.max(...us)), depth = Math.min(d1, Math.max(...ds)) - Math.max(d0, Math.min(...ds));
    if (b - a > 0.2 && depth > Math.max(0.5, 0.1 * (d1 - d0))) obs.push([a, b]);
  }
  obs.sort((p, q) => p[0] - q[0]);
  const merged = []; for (const o of obs) { const l = merged[merged.length - 1]; if (l && o[0] <= l[1] + 0.35) l[1] = Math.max(l[1], o[1]); else merged.push([...o]); }
  // snap their ends to a wall across the row (stair lanes stop a little short of the well's walls)
  const cross = sl.walls.filter(w => w.kind === 'wall' && Math.abs(U(w.a) - U(w.b)) < 0.05 && Math.min(D(w.a), D(w.b)) < d1 - 0.1 && Math.max(D(w.a), D(w.b)) > d0 + 0.1).map(w => U(w.a));
  const snap = (u) => { let best = u, bd = 0.3; for (const c of cross) if (Math.abs(c - u) < bd) { bd = Math.abs(c - u); best = c; } return best; };
  for (const o of merged) { o[0] = Math.max(u0, snap(o[0])); o[1] = Math.min(u1, snap(o[1])); }
  const free = []; let at = u0; for (const o of merged) { if (o[0] - at > 0.3) free.push([at, o[0]]); at = Math.max(at, o[1]); } if (u1 - at > 0.3) free.push([at, u1]);
  const doors = sl.texts.filter(t => t.door && Math.abs((alongX ? t.z : t.x) - edge) < 0.4).map(t => ({ u: alongX ? t.x : t.z, t })).sort((p, q) => p.u - q.u);
  const cells = [];
  const rect = (a, b) => (alongX ? { x0: a, x1: b, z0: row.z0, z1: row.z1 } : { x0: row.x0, x1: row.x1, z0: a, z1: b });
  for (const [a, b] of free) {
    const ds = doors.filter(d => d.u > a && d.u < b);
    if (!ds.length) { cells.push({ ...rect(a, b), text: '', blank: true }); continue; }
    let cuts = [a], ok = true;
    for (const d of ds) { const w = 2 * (d.u - cuts[cuts.length - 1]); if (w < 0.4) { ok = false; break; } cuts.push(cuts[cuts.length - 1] + w); }
    if (ok && Math.abs(cuts[cuts.length - 1] - b) > 0.35) ok = false;
    if (ok) cuts[cuts.length - 1] = b;
    else { // doors are not in the middle of their rooms (or the rectangle is off): halfway between neighbouring doors instead
      cuts = [a]; for (let i = 0; i < ds.length - 1; i++) cuts.push((ds[i].u + ds[i + 1].u) / 2); cuts.push(b);
      warn(`這排房間（${alongX ? 'x' : 'z'} ${a.toFixed(2)}～${b.toFixed(2)}，門 ${ds[0].t.text}～${ds[ds.length - 1].t.text}）的門不在格子正中間或範圍不合，隔間線改用相鄰兩扇門的中點`);
    }
    ds.forEach((d, i) => cells.push({ ...rect(cuts[i], cuts[i + 1]), text: d.t.text, guess: !ok }));
  }
  return cells;
}
