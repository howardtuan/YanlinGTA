// Benchmark street route (src/systems/Benchmark.js): a path through the campus that never clips through anything.
// Each leg between two stops is planned on a 1 m grid: a cell is open where a person could stand (the world's
// building / wall / tree collision and the interiors' walls at that cell's floor height, the same test the player's
// own movement uses), roads and footways cost less than open ground so the camera keeps to the streets and paths,
// and the grid path is pulled taut where there is a clear line of sight. The camera then follows the polyline
// itself (no spline cutting corners), slower indoors.
//
// Pure: the caller passes free(x, z, r) and the road polylines, so it is unit-tested without a world.

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

// one leg from a to b. Returns the waypoints (first = the open cell nearest a; last = b's cell or, when b itself is
// shut away, the reachable cell closest to it), or null when a has no open cell near it.
// The search box is the two points plus a margin; when the target is not reached inside it (a detour round a long
// building), the margin doubles, up to 2 times; "reached" means within opts.near metres (default 6) of the target.
export function planLeg(a, b, free, roads = [], opts = {}) {
  let m = opts.margin ?? 40,
    res = null;
  for (let k = 0; k < 3; k++, m *= 2) {
    res = planBox(a, b, free, roads, { ...opts, margin: m });
    if (!res || res.reached) break;
  }
  return res ? res.path : null;
}

function planBox(a, b, free, roads, opts) {
  const cell = opts.cell ?? 1,
    margin = opts.margin ?? 40,
    offRoad = opts.offRoad ?? 2.5,
    clear = opts.clear ?? 0.7;
  const x0 = Math.min(a.x, b.x) - margin,
    z0 = Math.min(a.z, b.z) - margin,
    x1 = Math.max(a.x, b.x) + margin,
    z1 = Math.max(a.z, b.z) + margin;
  const W = Math.ceil((x1 - x0) / cell) + 1,
    H = Math.ceil((z1 - z0) / cell) + 1,
    N = W * H;
  const blk = new Uint8Array(N),
    onRoad = new Uint8Array(N);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) blk[j * W + i] = free(x0 + i * cell, z0 + j * cell) ? 0 : 1;
  // roads and footways (their full width) are the cheap cells
  for (const r of roads) {
    const hw = Math.max(1, (r.w || 4) / 2),
      p = r.pts || [];
    for (let k = 0; k < p.length - 1; k++) {
      const [ax, az] = p[k],
        [bx, bz] = p[k + 1];
      if (
        Math.max(ax, bx) < x0 - hw ||
        Math.min(ax, bx) > x1 + hw ||
        Math.max(az, bz) < z0 - hw ||
        Math.min(az, bz) > z1 + hw
      )
        continue;
      const L = Math.hypot(bx - ax, bz - az) || 1,
        nx = -(bz - az) / L,
        nz = (bx - ax) / L,
        st = cell * 0.7;
      for (let t = 0; t <= L; t += st)
        for (let o = -hw; o <= hw; o += st) {
          const i = Math.round((ax + ((bx - ax) * t) / L + nx * o - x0) / cell),
            j = Math.round((az + ((bz - az) * t) / L + nz * o - z0) / cell);
          if (i >= 0 && j >= 0 && i < W && j < H) onRoad[j * W + i] = 1;
        }
    }
  }
  const nearestOpen = (p) => {
    const ci = Math.round((p.x - x0) / cell),
      cj = Math.round((p.z - z0) / cell);
    for (let rr = 0; rr < 40; rr++)
      for (let dj = -rr; dj <= rr; dj++)
        for (let di = -rr; di <= rr; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rr) continue;
          const i = ci + di,
            j = cj + dj;
          if (i >= 0 && j >= 0 && i < W && j < H && !blk[j * W + i]) return j * W + i;
        }
    return -1;
  };
  const s = nearestOpen(a);
  if (s < 0) return null;
  const ti = (b.x - x0) / cell,
    tj = (b.z - z0) / cell;
  const g = new Float32Array(N).fill(1e18),
    prev = new Int32Array(N).fill(-1),
    done = new Uint8Array(N);
  // binary heap on (key, cell)
  const hk = [],
    hv = [];
  const push = (k, v) => {
    hk.push(k);
    hv.push(v);
    let i = hk.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hk[p] <= hk[i]) break;
      [hk[p], hk[i]] = [hk[i], hk[p]];
      [hv[p], hv[i]] = [hv[i], hv[p]];
      i = p;
    }
  };
  const pop = () => {
    const v = hv[0],
      lk = hk.pop(),
      lv = hv.pop();
    if (hk.length) {
      hk[0] = lk;
      hv[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < hk.length && hk[l] < hk[m]) m = l;
        if (r < hk.length && hk[r] < hk[m]) m = r;
        if (m === i) break;
        [hk[m], hk[i]] = [hk[i], hk[m]];
        [hv[m], hv[i]] = [hv[i], hv[m]];
        i = m;
      }
    }
    return v;
  };
  g[s] = 0;
  push(0, s);
  let best = s,
    bd = Infinity;
  while (hk.length) {
    const c = pop();
    if (done[c]) continue;
    done[c] = 1;
    const ci = c % W,
      cj = (c / W) | 0,
      d = Math.hypot(ci - ti, cj - tj);
    if (d < bd) {
      bd = d;
      best = c;
    }
    if (d < 0.8) break;
    for (const [di, dj, dl] of DIRS) {
      const i = ci + di,
        j = cj + dj;
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const n = j * W + i;
      if (blk[n] || done[n]) continue;
      if (di && dj && (blk[cj * W + i] || blk[j * W + ci])) continue; // no squeezing past a corner
      const ng = g[c] + dl * (onRoad[n] ? 1 : offRoad);
      if (ng < g[n]) {
        g[n] = ng;
        prev[n] = c;
        push(ng + Math.hypot(i - ti, j - tj) * 0.9, n);
      }
    }
  }
  const reached = bd * cell < (opts.near ?? 6);
  const path = [];
  for (let c = best; c !== -1; c = prev[c])
    path.push({ x: x0 + (c % W) * cell, z: z0 + ((c / W) | 0) * cell });
  path.reverse();
  // pull the path taut along clear lines of sight (with a bit more clearance than a person), but never across more
  // open ground than the grid path itself crossed: a shortcut over a lawn would lose the "keep to the streets" part
  const roadAt = (x, z) => {
    const i = Math.round((x - x0) / cell),
      j = Math.round((z - z0) / cell);
    return i >= 0 && j >= 0 && i < W && j < H && onRoad[j * W + i] === 1;
  };
  const offPre = [0];
  for (let i = 1; i < path.length; i++) {
    const L = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
    offPre.push(offPre[i - 1] + (roadAt(path[i].x, path[i].z) ? 0 : L));
  }
  const shortcut = (k, m) => {
    const p = path[k],
      q = path[m],
      L = Math.hypot(q.x - p.x, q.z - p.z);
    let off = 0;
    for (let d = 0; d <= L; d += 0.5) {
      const x = p.x + ((q.x - p.x) * d) / L,
        z = p.z + ((q.z - p.z) * d) / L;
      if (!free(x, z, clear)) return false;
      if (!roadAt(x, z)) off += 0.5;
    }
    return off <= offPre[m] - offPre[k] + 1.5;
  };
  const out = [path[0]];
  let k = 0;
  while (k < path.length - 1) {
    let m = k + 1;
    while (m + 1 < path.length && m - k < 40 && shortcut(k, m + 1)) m++;
    out.push(path[m]);
    k = m;
  }
  return { path: out, reached };
}

// all legs through the stops, each leg starting where the last one ended
export function planRoute(stops, free, roads, opts) {
  const pts = [];
  let cur = stops[0];
  for (let i = 1; i < stops.length; i++) {
    const leg = planLeg(cur, stops[i], free, roads, opts);
    if (!leg || leg.length < 1) continue;
    for (const p of pts.length ? leg.slice(1) : leg) pts.push(p);
    cur = leg[leg.length - 1];
  }
  return pts;
}

// polyline with cumulative distance and a time weight per metre (indoor metres take `slow` times as long), so a
// segment of `time` seconds can be mapped to a distance: route.at(t / time)
export function timedPolyline(pts, indoorAt = () => false, slow = 4) {
  const s = [0],
    w = [0];
  const n = pts.length;
  for (let i = 1; i < n; i++) {
    const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z),
      mx = (pts[i].x + pts[i - 1].x) / 2,
      mz = (pts[i].z + pts[i - 1].z) / 2;
    s.push(s[i - 1] + L);
    w.push(w[i - 1] + L * (indoorAt(mx, mz) ? slow : 1));
  }
  const len = s[n - 1] || 0,
    cost = w[n - 1] || 0;
  // distance along the route at time fraction u (0..1)
  const distAt = (u) => {
    const c = Math.min(1, Math.max(0, u)) * cost;
    let i = 1;
    while (i < n - 1 && w[i] < c) i++;
    const k = w[i] > w[i - 1] ? (c - w[i - 1]) / (w[i] - w[i - 1]) : 0;
    return s[i - 1] + (s[i] - s[i - 1]) * Math.min(1, Math.max(0, k));
  };
  const pointAt = (d) => {
    const dd = Math.min(len, Math.max(0, d));
    let i = 1;
    while (i < n - 1 && s[i] < dd) i++;
    const k = s[i] > s[i - 1] ? (dd - s[i - 1]) / (s[i] - s[i - 1]) : 0;
    return {
      x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k,
      z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * k,
    };
  };
  return { pts, len, cost, distAt, pointAt };
}
