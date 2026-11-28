// In-page story bot. Evaluated in the game page by story-bot.mjs once the title screen is up.
// It plays only through the game's Input object (window.game.input): held keys (input.keys),
// edge presses (input.pressed) and the analog stick channel (input.joy, the same one the touch
// joystick feeds). It runs once per game frame, right after Input.endFrame(), i.e. exactly where
// real key/mouse events land between two frames. Positions and speeds are only read, never written,
// except by the explicit, reported teleport fallback (fallback()).
(() => {
  if (window.__storyBot) return;
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;
  const E = window.__e2e || {
    realNow: () => performance.now(),
    renders: 0,
    renderMs: 0,
    renderReq: 0,
  };
  const realNow = E.realNow;

  const B = (window.__storyBot = {
    log: [],
    events: [],
    legs: [],
    steps: [],
    done: false,
    fatal: null,
    t: 0,
    opts: {
      fallbackStallSec: 30,
      legBudgetSec: 240,
      maxMissionFails: 2,
      // game seconds with no objective at all (not paused, no dialog) before the run is declared stuck
      idleStallSec: 90,
      canvassRadius: 30,
      laneOffset: 0,
      shortcutRoadMargin: 3.5,
      route: 'auto',
    },
  });
  const ev = (type, data = {}) => {
    const e = { type, t: +(game.playTime || 0).toFixed(2), real: Math.round(realNow()), ...data };
    B.events.push(e);
    B.log.push(e);
    if (B.log.length > 400) B.log.shift();
    return e;
  };

  // ------------------------------------------------------------------ graph / A*
  let G = null;
  function buildGraph() {
    const w = game.world;
    const nodes = [...w.graph.values()].filter((n) => n.adj.length);
    nodes.forEach((n, i) => (n.__i = i));
    const edges = [];
    for (const n of nodes)
      for (const e of n.adj)
        if (e.to.__i !== undefined) {
          const len = hyp(e.to.x - n.x, e.to.z - n.z);
          edges.push({ a: n, b: e.to, e, len });
        }
    G = { nodes, edges };
  }
  // cost factor of traversing an adjacency edge in a given mode
  function edgeFactor(e, mode) {
    if (mode === 'foot') return e.road.type === 'steps' ? 1.3 : 1;
    if (e.drive) return 1;
    if (e.road.type === 'steps') return 8;
    if (e.road.drive && e.road.oneway && !e.fwd) return 4; // wrong way up a one-way street
    return 2.2; // footway / path / unnamed service: rideable but avoided
  }
  // an edge whose segment runs into static collision (e.g. a building passage mapped as a tunnel road
  // but walled in) is only usable if a small grid detour around it exists; cached per edge and mode
  function edgePassable(a, e, mode) {
    const k = mode === 'foot' ? '__okF' : '__okV';
    if (e[k] !== undefined) return e[k];
    const r = mode === 'foot' ? 0.42 : 0.8;
    const ok = segFree(a, e.to, r) || !!gridDetour(a, e.to, r, 8);
    e[k] = ok;
    const back = e.to.adj.find((x) => x.to === a);
    if (back) back[k] = ok;
    if (!ok)
      (B.blockedEdges ||= []).push({
        mode,
        road: e.road.name || e.road.type,
        tunnel: !!e.road.tunnel,
        a: [+a.x.toFixed(1), +a.z.toFixed(1)],
        b: [+e.to.x.toFixed(1), +e.to.z.toFixed(1)],
      });
    return ok;
  }
  function losFree(x0, z0, x1, z1, r = 0.6) {
    const col = game.world.collision,
      d = hyp(x1 - x0, z1 - z0),
      n = Math.max(1, Math.ceil(d / 1.5));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (col.blocked(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, r)) return false;
    }
    return true;
  }
  // nearest projections onto graph edges (best few, line-of-sight checked)
  function projections(x, z, mode, k = 4) {
    const out = [];
    for (const ed of G.edges) {
      if (mode !== 'foot' && edgeFactor(ed.e, mode) > 3) continue;
      const ax = ed.a.x,
        az = ed.a.z,
        dx = ed.b.x - ax,
        dz = ed.b.z - az,
        l2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
      const px = ax + dx * t,
        pz = az + dz * t,
        d = hyp(px - x, pz - z);
      out.push({ ed, t, x: px, z: pz, d });
    }
    out.sort((p, q) => p.d - q.d);
    const best = [];
    for (const p of out.slice(0, 24)) {
      if (best.length >= k) break;
      if (p.d < 1.5 || losFree(x, z, p.x, p.z, 0.5)) best.push(p);
    }
    return best.length ? best : out.slice(0, 2);
  }
  function astar(sx, sz, gx, gz, mode) {
    const N = G.nodes.length,
      S = N,
      T = N + 1;
    const g = new Float64Array(N + 2).fill(Infinity),
      prev = new Int32Array(N + 2).fill(-1),
      closed = new Uint8Array(N + 2);
    const extra = new Map(); // node index -> [[to, cost]] for virtual connections
    const addX = (i, j, c) => {
      if (!extra.has(i)) extra.set(i, []);
      extra.get(i).push([j, c]);
    };
    const sp = projections(sx, sz, mode),
      gp = projections(gx, gz, mode);
    const P = [];
    for (const p of sp) {
      const f = edgeFactor(p.ed.e, mode);
      addX(S, p.ed.a.__i, (p.d * 1.5 + p.t * p.ed.len) * f);
      addX(S, p.ed.b.__i, (p.d * 1.5 + (1 - p.t) * p.ed.len) * f);
      P[p.ed.a.__i] = P[p.ed.a.__i] || null;
    }
    const goalVia = new Map();
    for (const p of gp) {
      const f = edgeFactor(p.ed.e, mode);
      for (const [n, c] of [
        [p.ed.a, p.t * p.ed.len],
        [p.ed.b, (1 - p.t) * p.ed.len],
      ]) {
        const cost = (c + p.d * 1.5) * f;
        addX(n.__i, T, cost);
        if (!goalVia.has(n.__i) || goalVia.get(n.__i).cost > cost)
          goalVia.set(n.__i, { cost, x: p.x, z: p.z });
      }
    }
    // direct line if close and clear
    const direct = hyp(gx - sx, gz - sz);
    if (direct < 40 && losFree(sx, sz, gx, gz, 0.6)) addX(S, T, direct);
    const pos = (i) => (i === S ? [sx, sz] : i === T ? [gx, gz] : [G.nodes[i].x, G.nodes[i].z]);
    const h = (i) => {
      const [x, z] = pos(i);
      return hyp(x - gx, z - gz);
    };
    // binary heap
    const heap = [];
    const push = (f, i) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0],
        last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1,
            r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    g[S] = 0;
    push(h(S), S);
    while (heap.length) {
      const [, i] = pop();
      if (closed[i]) continue;
      closed[i] = 1;
      if (i === T) break;
      const relax = (j, c) => {
        if (g[i] + c < g[j]) {
          g[j] = g[i] + c;
          prev[j] = i;
          push(g[j] + h(j), j);
        }
      };
      if (i < N)
        for (const e of G.nodes[i].adj)
          if (e.to.__i !== undefined && edgePassable(G.nodes[i], e, mode))
            relax(
              e.to.__i,
              hyp(e.to.x - G.nodes[i].x, e.to.z - G.nodes[i].z) * edgeFactor(e, mode)
            );
      for (const [j, c] of extra.get(i) || []) relax(j, c);
    }
    if (prev[T] < 0) return null;
    const idx = [];
    for (let i = T; i >= 0; i = prev[i]) {
      idx.push(i);
      if (i === S) break;
    }
    idx.reverse();
    const pts = [];
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k];
      if (i === T && k > 0 && goalVia.has(idx[k - 1])) {
        const v = goalVia.get(idx[k - 1]);
        pts.push({ x: v.x, z: v.z });
      }
      const [x, z] = pos(i);
      if (k === 1 && i < N && idx[0] === S) {
        // start projection point first
        const p = sp.find((p) => p.ed.a.__i === i || p.ed.b.__i === i);
        if (p) pts.push({ x: p.x, z: p.z });
      }
      const node = i < N ? G.nodes[i] : null;
      pts.push({ x, z, node });
    }
    // edge metadata per segment (lane offset only on two-way drive edges)
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k].node,
        b = pts[k + 1].node;
      let lane = 0;
      if (a && b && mode !== 'foot') {
        const e = a.adj.find((e) => e.to === b);
        if (e && e.drive && !e.road.oneway)
          lane = Math.min(B.opts.laneOffset, Math.max(0, e.w / 2 - 1.6));
      }
      pts[k].lane = lane;
    }
    return dedupe(pts);
  }
  function dedupe(pts) {
    const out = [];
    for (const p of pts)
      if (!out.length || hyp(p.x - out[out.length - 1].x, p.z - out[out.length - 1].z) > 0.3)
        out.push(p);
    return out;
  }

  // ---- collision-aware refinement of a road-graph path ----
  // 1) every segment that clips static collision (stalls, poles, trees, walls) is replaced by a detour
  //    found with A* on a 0.7 m grid; 2) string pulling: skip waypoints while the straight line stays
  //    collision-free AND within the road (half width + margin), i.e. it cuts corners but stays on roads.
  const blockedAt = (x, z, r) => game.world.collision.blocked(x, z, r);
  function segFree(a, b, r) {
    const d = hyp(b.x - a.x, b.z - a.z),
      n = Math.max(1, Math.ceil(d / 0.6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (blockedAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r)) return false;
    }
    return true;
  }
  function onRoad(x, z, extra) {
    const q = game.world.roadGrid.nearest(x, z);
    return !!q.seg && q.d <= q.seg[4] / 2 + extra;
  }
  function segOnRoad(a, b, extra) {
    const d = hyp(b.x - a.x, b.z - a.z),
      n = Math.max(1, Math.ceil(d / 2));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!onRoad(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, extra)) return false;
    }
    return true;
  }
  function gridDetour(a, b, r, pad = 14, C = 0.7, maxCells = 90000, freeFn = null, costFn = null) {
    const x0 = Math.min(a.x, b.x) - pad,
      z0 = Math.min(a.z, b.z) - pad;
    const W = Math.ceil((Math.max(a.x, b.x) + pad - x0) / C),
      H = Math.ceil((Math.max(a.z, b.z) + pad - z0) / C);
    if (W * H > maxCells) return null;
    const free = new Int8Array(W * H).fill(-1); // -1 unknown, 0 blocked, 1 free
    const fr = freeFn || ((x, z) => !blockedAt(x, z, r));
    const isFree = (i, j) => {
      const k = j * W + i;
      if (free[k] < 0) free[k] = fr(x0 + (i + 0.5) * C, z0 + (j + 0.5) * C) ? 1 : 0;
      return free[k] === 1;
    };
    const extra = costFn ? new Float32Array(W * H).fill(-1) : null;
    const cellCost = (k) => {
      if (!extra) return 0;
      if (extra[k] < 0)
        extra[k] = costFn(x0 + ((k % W) + 0.5) * C, z0 + (Math.floor(k / W) + 0.5) * C);
      return extra[k];
    };
    const cellOf = (p) => [
      clamp(Math.floor((p.x - x0) / C), 0, W - 1),
      clamp(Math.floor((p.z - z0) / C), 0, H - 1),
    ];
    const snap = (p) => {
      const [ci, cj] = cellOf(p);
      for (let rr = 0; rr < 6; rr++)
        for (let dj = -rr; dj <= rr; dj++)
          for (let di = -rr; di <= rr; di++) {
            const i = ci + di,
              j = cj + dj;
            if (i >= 0 && j >= 0 && i < W && j < H && isFree(i, j)) return [i, j];
          }
      return null;
    };
    const s = snap(a),
      t = snap(b);
    if (!s || !t) return null;
    const g = new Float32Array(W * H).fill(Infinity),
      prev = new Int32Array(W * H).fill(-1),
      done = new Uint8Array(W * H);
    const heap = [];
    const push = (f, k) => {
      heap.push([f, k]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0],
        last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1,
            rr = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const sk = s[1] * W + s[0],
      tk = t[1] * W + t[0];
    const h = (k) => hyp((k % W) - t[0], Math.floor(k / W) - t[1]);
    g[sk] = 0;
    push(h(sk), sk);
    let n = 0;
    while (heap.length && n++ < maxCells) {
      const [, k] = pop();
      if (done[k]) continue;
      done[k] = 1;
      if (k === tk) break;
      const i = k % W,
        j = Math.floor(k / W);
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di,
            nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= W || nj >= H || !isFree(ni, nj)) continue;
          const nk = nj * W + ni,
            c = g[k] + (di && dj ? 1.414 : 1) * (1 + cellCost(nk));
          if (c < g[nk]) {
            g[nk] = c;
            prev[nk] = k;
            push(c + h(nk), nk);
          }
        }
    }
    if (prev[tk] < 0 && tk !== sk) return null;
    const out = [];
    for (let k = tk; k >= 0; k = prev[k]) {
      out.push({ x: x0 + ((k % W) + 0.5) * C, z: z0 + (Math.floor(k / W) + 0.5) * C });
      if (k === sk) break;
    }
    out.reverse();
    out.push({ x: b.x, z: b.z });
    return out;
  }
  // free-space plan (used when a timed mission failed on roads): coarse 2 m grid over open ground,
  // slightly preferring roads, then string pulling without the stay-on-road rule
  // walking height under (x, z) from the physics world itself (pads, kerbs, decks, terrain), null without physics
  function physGround(x, z) {
    const P = game.physics;
    if (!P?.world) return null;
    const F = P.R.QueryFilterFlags, // fixed colliders only: not the traffic, people or knock-over props
      flags = F ? F.EXCLUDE_DYNAMIC | F.EXCLUDE_KINEMATIC | F.EXCLUDE_SENSORS : undefined;
    const hit = P.world.castRay(
      new P.R.Ray({ x, y: 60, z }, { x: 0, y: -1, z: 0 }),
      120,
      true,
      flags
    );
    return hit ? 60 - hit.timeOfImpact : null;
  }
  // a step the scooter cannot ride up within r of (x, z): a raised pad's edge (data/cycu.json levels.pads,
  // e.g. 泉源之谷 west_landing at 0.25 m) is open for walking (src/world/Terrain.js STEP_UP) and has no
  // collision line, so world.isFree says free, but the wheels stop dead against it
  const KERB = 0.18;
  function kerbAt(x, z, r) {
    const y0 = physGround(x, z);
    if (y0 === null) return false;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4,
        y = physGround(x + Math.cos(a) * r, z + Math.sin(a) * r);
      if (y !== null && Math.abs(y - y0) > KERB) return true;
    }
    return false;
  }
  function segKerb(a, b) {
    const d = hyp(b.x - a.x, b.z - a.z),
      n = Math.max(1, Math.ceil(d / 0.8));
    let prev = physGround(a.x, a.z);
    for (let i = 1; i <= n; i++) {
      const t = i / n,
        y = physGround(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (y !== null && prev !== null && Math.abs(y - prev) > KERB) return true;
      prev = y;
    }
    return false;
  }
  function planOffroad(a, b, mode) {
    const r = mode === 'foot' ? 0.5 : 1.2,
      w = game.world,
      ride = mode !== 'foot';
    const det = gridDetour(
      a,
      b,
      r,
      40,
      2,
      120000,
      (x, z) => w.isFree(x, z, r) && !(ride && kerbAt(x, z, 1.2)),
      (x, z) => (onRoad(x, z, 1) ? 0 : 0.25)
    );
    if (!det) return null;
    const out = dedupe([a, ...det]);
    const res = [out[0]];
    let i = 0;
    while (i < out.length - 1) {
      let j = i + 1;
      for (let k = i + 2; k < out.length; k++) {
        if (hyp(out[k].x - out[i].x, out[k].z - out[i].z) > 150) break;
        if (segFree(out[i], out[k], r + 0.3) && !(ride && segKerb(out[i], out[k]))) j = k;
        else if (k - j > 8) break;
      }
      res.push(out[j]);
      i = j;
    }
    return res;
  }
  // Flood fill on a 0.4 m grid in a 120 m box around the objective, seeded from the free cells on the
  // box border (the open world outside). Reachable = some reached cell lies inside the objective circle.
  const reachCache = new Map();
  function reachInfo(t, radius, r) {
    const key = `${t.x.toFixed(1)},${t.z.toFixed(1)},${radius},${r}`;
    if (reachCache.has(key)) return reachCache.get(key);
    const C = 0.4,
      half = 60,
      x0 = t.x - half,
      z0 = t.z - half,
      W = Math.round((2 * half) / C),
      H = W;
    const st = new Uint8Array(W * H); // 0 unknown, 1 queued/reached, 2 blocked
    const q = [];
    const free = (i, j) => !blockedAt(x0 + i * C, z0 + j * C, r);
    for (let i = 0; i < W; i++)
      for (const j of [0, H - 1]) {
        const k = j * W + i;
        if (!st[k]) {
          st[k] = free(i, j) ? 1 : 2;
          if (st[k] === 1) q.push(k);
        }
      }
    for (let j = 0; j < H; j++)
      for (const i of [0, W - 1]) {
        const k = j * W + i;
        if (!st[k]) {
          st[k] = free(i, j) ? 1 : 2;
          if (st[k] === 1) q.push(k);
        }
      }
    let best = Infinity,
      bx = t.x,
      bz = t.z;
    while (q.length) {
      const k = q.pop(),
        i = k % W,
        j = (k / W) | 0,
        x = x0 + i * C,
        z = z0 + j * C;
      const d = hyp(x - t.x, z - t.z);
      if (d < best) {
        best = d;
        bx = x;
        bz = z;
      }
      if (i > 0 && !st[k - 1]) {
        st[k - 1] = free(i - 1, j) ? 1 : 2;
        if (st[k - 1] === 1) q.push(k - 1);
      }
      if (i < W - 1 && !st[k + 1]) {
        st[k + 1] = free(i + 1, j) ? 1 : 2;
        if (st[k + 1] === 1) q.push(k + 1);
      }
      if (j > 0 && !st[k - W]) {
        st[k - W] = free(i, j - 1) ? 1 : 2;
        if (st[k - W] === 1) q.push(k - W);
      }
      if (j < H - 1 && !st[k + W]) {
        st[k + W] = free(i, j + 1) ? 1 : 2;
        if (st[k + W] === 1) q.push(k + W);
      }
    }
    const col = game.world.collision;
    const res = {
      reachable: best < radius - 0.3,
      dist: best,
      closest: { x: bx, z: bz },
      inside: col.insideAny ? !!col.insideAny(t.x, t.z) : null,
    };
    reachCache.set(key, res);
    return res;
  }
  B._reach = (t, radius, r) => reachInfo(t, radius, r);
  function refine(pts, mode) {
    const r = mode === 'foot' ? 0.42 : 0.9,
      rl = mode === 'foot' ? 0.6 : 1.5;
    let out = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const a = out[out.length - 1],
        b = pts[k];
      if (segFree(a, b, r)) {
        out.push(b);
        continue;
      }
      const det = gridDetour(a, b, r);
      if (det) out.push(...det.slice(1));
      else out.push(b);
    }
    out = dedupe(out);
    // string pulling
    const res = [out[0]];
    let i = 0;
    while (i < out.length - 1) {
      let j = i + 1;
      for (let k = i + 2; k < out.length; k++) {
        if (hyp(out[k].x - out[i].x, out[k].z - out[i].z) > 120) break;
        if (segFree(out[i], out[k], rl) && segOnRoad(out[i], out[k], B.opts.shortcutRoadMargin))
          j = k;
        else if (k - j > 6) break;
      }
      res.push(out[j]);
      i = j;
    }
    return res;
  }
  // offset two-way drive segments to the right-hand lane, compute cumulative length
  function finalizePath(pts) {
    const P = pts.map((p) => ({ x: p.x, z: p.z, lane: p.lane || 0 }));
    const res = [];
    for (let k = 0; k < P.length; k++) {
      let ox = 0,
        oz = 0,
        n = 0;
      for (const s of [k - 1, k]) {
        if (s < 0 || s >= P.length - 1 || !P[s].lane) continue;
        const dx = P[s + 1].x - P[s].x,
          dz = P[s + 1].z - P[s].z,
          l = hyp(dx, dz) || 1;
        ox += (-dz / l) * P[s].lane;
        oz += (dx / l) * P[s].lane;
        n++;
      }
      const keepEnds = k === 0 || k === P.length - 1;
      res.push({
        x: P[k].x + (n && !keepEnds ? ox / n : 0),
        z: P[k].z + (n && !keepEnds ? oz / n : 0),
      });
    }
    let s = 0;
    res[0].s = 0;
    for (let k = 1; k < res.length; k++) {
      s += hyp(res[k].x - res[k - 1].x, res[k].z - res[k - 1].z);
      res[k].s = s;
    }
    return { pts: res, len: s, i: 0 };
  }
  function pathPointAt(path, s) {
    const p = path.pts;
    s = clamp(s, 0, path.len);
    let k = Math.max(0, Math.min(path.i, p.length - 2));
    while (k < p.length - 2 && p[k + 1].s < s) k++;
    while (k > 0 && p[k].s > s) k--;
    const a = p[k],
      b = p[k + 1] || a,
      l = b.s - a.s || 1,
      t = clamp((s - a.s) / l, 0, 1);
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      dir: Math.atan2(b.x - a.x, b.z - a.z),
    };
  }
  // project position onto path near the current index; returns {s, d}
  function trackPath(path, x, z) {
    const p = path.pts;
    let best = { s: path.i ? p[path.i].s : 0, d: 1e9, k: path.i };
    const k0 = Math.max(0, path.i - 2),
      k1 = Math.min(p.length - 2, path.i + 12);
    for (let k = k0; k <= k1; k++) {
      const a = p[k],
        b = p[k + 1],
        dx = b.x - a.x,
        dz = b.z - a.z,
        l2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
      const d = hyp(a.x + dx * t - x, a.z + dz * t - z);
      if (d < best.d - 0.01) best = { s: a.s + (b.s - a.s) * t, d, k };
    }
    if (p.length < 2) best = { s: 0, d: hyp(p[0].x - x, p[0].z - z), k: 0 };
    path.i = best.k;
    return best;
  }

  // ------------------------------------------------------------------ input helpers
  const held = new Set();
  let releaseNext = [];
  function press(code) {
    const inp = game.input;
    inp.pressed.add(code);
    inp.keys.add(code);
    releaseNext.push(code);
    B.presses[code] = (B.presses[code] || 0) + 1;
  }
  B.presses = {};
  function setHeld(codes) {
    const inp = game.input;
    for (const c of held) if (!codes.includes(c)) inp.keys.delete(c);
    held.clear();
    for (const c of codes) {
      inp.keys.add(c);
      held.add(c);
    }
  }
  function stick(x, y) {
    // x: right +, y: forward + (axis() space)
    const j = game.input.joy;
    if (Math.abs(x) < 1e-3 && Math.abs(y) < 1e-3) {
      j.active = false;
      j.x = 0;
      j.y = 0;
      return;
    }
    j.active = true;
    j.x = clamp(x, -1, 1);
    j.y = clamp(-y, -1, 1);
  }
  function neutral() {
    stick(0, 0);
    setHeld([]);
  }

  // ------------------------------------------------------------------ vehicle model helpers
  const turnF = (v, maxS) => Math.min(1, v / 4) * (1 - 0.45 * Math.min(1, v / maxS));
  // highest speed whose turning radius fits curvature k (1/m)
  function cornerSpeed(k, veh) {
    if (k < 1e-3) return veh.maxSpeed;
    let best = 3;
    for (let v = 3; v <= veh.maxSpeed; v += 0.5)
      if (v * k <= veh.turn * turnF(v, veh.maxSpeed) * 0.85) best = v;
    return best;
  }

  // ------------------------------------------------------------------ navigation leg
  // A leg = drive/walk from the current position to (x,z) until within radius r.
  let nav = null;
  function startNav(target, r, opts = {}) {
    const p = game.player.worldPos();
    const mode = game.player.vehicle ? 'vehicle' : 'foot';
    // route strategy: roads (graph + corner cutting within the road) or off-road shortcuts across open
    // ground. 'auto' = off-road only while a mission timer is running and we ride.
    const route =
      B.opts.route === 'offroad' ||
      (B.opts.route === 'auto' && game.missions.timer !== null && mode === 'vehicle')
        ? 'offroad'
        : 'roads';
    const plan = (a, b) => {
      if (route === 'offroad') {
        const o = planOffroad(a, b, mode);
        if (o) return { pts: o, ok: true };
      }
      const g = astar(a.x, a.z, b.x, b.z, mode);
      return g ? { pts: opts.raw ? g : refine(g, mode), ok: true } : { pts: [a, b], ok: false };
    };
    const first = plan({ x: p.x, z: p.z }, target);
    let pts2 = first.pts,
      sCp = null;
    if (opts.next) {
      // chain the following checkpoint so speed planning sees the turn after this one
      sCp = finalizePath(pts2).len;
      const second = plan(target, opts.next);
      if (second.ok) pts2 = dedupe([...pts2, ...second.pts.slice(1)]);
    }
    const path = finalizePath(pts2);
    path.sCp = sCp ?? path.len;
    nav = {
      next: opts.next || null,
      target: { x: target.x, z: target.z },
      r,
      mode,
      path,
      name: target.name || opts.name || '',
      slowAtEnd: !!opts.slowAtEnd,
      lastProgT: B.t,
      bestRemain: Infinity,
      stuckT: 0,
      reverseT: 0,
      revSteer: 0,
      side: 1,
      sideT: 0,
      replans: 0,
      noPath: !first.ok,
      route,
      lastPos: { x: p.x, z: p.z },
      movedT: B.t,
    };
    return nav;
  }
  function navRemain() {
    const p = game.player.worldPos();
    return hyp(p.x - nav.target.x, p.z - nav.target.z);
  }

  // obstacle in the corridor ahead (traffic, parked vehicles, pedestrians); returns distance or Infinity
  function obstacleAhead(x, z, dir, half, maxD, selfV) {
    const fx = Math.sin(dir),
      fz = Math.cos(dir);
    let veh = null,
      ped = null;
    const check = (o, r, isPed) => {
      const dx = o.pos.x - x,
        dz = o.pos.z - z,
        ah = dx * fx + dz * fz;
      if (ah < -0.5 || ah > maxD) return;
      const c = dx * fz - dz * fx;
      if (Math.abs(c) > half + r) return;
      const d = ah - r;
      const rec = { d, c, r, o, isPed };
      if (isPed) {
        if (!ped || d < ped.d) ped = rec;
      } else if (!veh || d < veh.d) veh = rec;
    };
    for (const v of game.traffic.vehicles()) check(v, v.radius, false);
    for (const v of game.vehicles)
      if (v !== selfV) check(v, v.radius * (v.kind === 'scooter' ? 0.9 : 1), false);
    for (const q of game.peds.active()) if (q.state !== 'down') check(q, 0.45, true);
    return { veh, ped, px: fz, pz: -fx };
  }
  // sticky avoidance: once we pick a side to pass an obstacle we keep aiming beside it until it is behind us
  function avoidAim(n, x, z, dir, rawAim, ob, vr) {
    const fx = Math.sin(dir),
      fz = Math.cos(dir),
      px = fz,
      pz = -fx;
    const near = ob.veh && (!ob.ped || ob.veh.d < ob.ped.d) ? ob.veh : ob.ped;
    if (n.avoid) {
      const o = n.avoid.o,
        dx = o.pos.x - x,
        dz = o.pos.z - z,
        ah = dx * fx + dz * fz;
      if (
        ah < -0.8 ||
        hyp(dx, dz) > 25 ||
        B.t > n.avoid.until ||
        o.dormant ||
        (o.ai && o.ai.dormant)
      )
        n.avoid = null;
    }
    if (!n.avoid && near && near.d < 14) {
      const clear = near.r + vr + 0.9;
      const side = (sg) => ({
        x: near.o.pos.x + px * sg * clear + fx * 3,
        z: near.o.pos.z + pz * sg * clear + fz * 3,
      });
      let sgn = near.c >= 0 ? -1 : 1;
      const ok = (sg) => {
        const sp = side(sg);
        return !blockedAt(sp.x, sp.z, vr) && segFree({ x, z }, sp, vr * 0.8);
      };
      if (!ok(sgn)) sgn = ok(-sgn) ? -sgn : 0;
      n.avoid = { o: near.o, r: near.r, sgn, isPed: near.isPed, until: B.t + 4 };
    }
    if (!n.avoid || !n.avoid.sgn) return { aim: rawAim, blocked: !!n.avoid };
    const o = n.avoid.o,
      clear = n.avoid.r + vr + 0.9;
    const dx = o.pos.x - x,
      dz = o.pos.z - z,
      ah = dx * fx + dz * fz;
    if (ah > hyp(rawAim.x - x, rawAim.z - z) + 2) return { aim: rawAim, blocked: false };
    return {
      aim: {
        x: o.pos.x + px * n.avoid.sgn * clear + fx * 3,
        z: o.pos.z + pz * n.avoid.sgn * clear + fz * 3,
      },
      blocked: false,
      avoiding: true,
    };
  }

  function driveTick(dt) {
    const pl = game.player,
      v = pl.vehicle,
      n = nav;
    const x = v.pos.x,
      z = v.pos.z,
      sp = v.speed;
    const tr = trackPath(n.path, x, z);
    // off the path (pushed, cut a corner badly): replan
    if (tr.d > 14 && n.replans < 40) {
      replan('off-path');
      return;
    }
    const L = clamp(3.5 + Math.abs(sp) * 0.45, 4, 12);
    // don't let the lookahead run past the checkpoint before we are inside its radius
    const toCp = hyp(n.target.x - x, n.target.z - z);
    const la = pathPointAt(n.path, toCp > n.r * 0.6 ? Math.min(tr.s + L, n.path.sCp) : tr.s + L);
    const remainPath = (n.next ? n.path.len : n.path.sCp) - tr.s;
    const toTgt = hyp(n.target.x - x, n.target.z - z);
    let aim = remainPath < L ? n.target : la;
    // obstacles along the line to the (unshifted) aim point
    const aimDir = Math.atan2(aim.x - x, aim.z - z);
    const ob = obstacleAhead(x, z, aimDir, v.radius + 0.3, 6 + Math.abs(sp) * 1.1, v);
    const av = avoidAim(n, x, z, aimDir, aim, ob, v.radius);
    aim = av.aim;
    const desired = Math.atan2(aim.x - x, aim.z - z);
    const alpha = angDiff(desired, v.heading);
    // speed planning: curvature ahead
    let target = v.maxSpeed;
    const look = Math.max(12, (sp * sp) / (2 * 10) + 12);
    for (let d = 0; d <= look; d += 2) {
      const s = tr.s + d;
      if (s > n.path.len) break;
      const a = pathPointAt(n.path, s - 3),
        b = pathPointAt(n.path, s + 5);
      const turn = Math.abs(angDiff(b.dir, a.dir));
      const k = turn / 8;
      const vc = cornerSpeed(k, v);
      target = Math.min(target, Math.sqrt(vc * vc + 2 * 12 * Math.max(0, d - 2)));
    }
    if (n.slowAtEnd) target = Math.min(target, Math.sqrt(36 + 2 * 8 * Math.max(0, toTgt - n.r)));
    // aim error: slow down when pointing the wrong way
    if (Math.abs(alpha) > 0.6) target = Math.min(target, 6);
    if (Math.abs(alpha) > 1.4) target = Math.min(target, 4);
    // obstacles: below 3 m/s pedestrians are never knocked over (main.js), so crawl past them;
    // vehicles: steer around (aim shifted above) and slow down
    // timed missions: swerve at speed (a knocked-over student costs 1 vote); untimed: be polite
    const timed = game.missions.timer !== null;
    if (ob.ped)
      target = Math.min(
        target,
        av.avoiding ? (timed ? 22 : 9) : 2.6 + Math.max(0, ob.ped.d - 1.5) * (timed ? 3 : 1.6)
      );
    if (ob.veh)
      target = Math.min(
        target,
        av.avoiding ? Math.max(6, ob.veh.d * 2.2) : Math.max(3, (ob.veh.d - 1) * 1.8)
      );
    // steering (pure pursuit on heading)
    const Ld = Math.max(1, hyp(aim.x - x, aim.z - z));
    const kappa = (2 * Math.sin(alpha)) / Ld;
    const f = turnF(Math.max(Math.abs(sp), 2), v.maxSpeed);
    let steer = clamp((kappa * Math.max(Math.abs(sp), 3)) / (v.turn * f), -1, 1);
    if (Math.abs(alpha) > 0.5) steer = Math.sign(alpha);
    let throttle;
    const err = target - sp;
    if (err > 0) throttle = clamp(0.35 + err * 0.4, 0, 1);
    else if (err < -1.5 && sp > 0.8) throttle = clamp(err * 0.25, -1, -0.2);
    else throttle = 0;
    // stuck detection -> reverse with opposite steer
    const moved = hyp(x - n.lastPos.x, z - n.lastPos.z);
    if (moved > 1.0) {
      n.lastPos = { x, z };
      n.movedT = B.t;
    }
    if (n.reverseT > 0) {
      n.reverseT -= dt;
      throttle = -1;
      steer = n.revSteer;
      if (n.reverseT <= 0) {
        n.movedT = B.t;
        n.lastPos = { x, z };
      }
    } else if (B.t - n.movedT > 1.5 && throttle >= 0) {
      n.reverseT = 1.3;
      n.revSteer = -Math.sign(alpha || 1);
      n.stuckT++;
      ev('reverse', { x: +x.toFixed(1), z: +z.toFixed(1), n: n.stuckT });
      if (n.stuckT % 3 === 0) replan('stuck');
    }
    stick(-steer, throttle);
    setHeld([]);
    B.dbg = {
      m: 'drive',
      x: +x.toFixed(1),
      z: +z.toFixed(1),
      h: +v.heading.toFixed(2),
      sp: +sp.toFixed(1),
      tgt: +target.toFixed(1),
      a: +alpha.toFixed(2),
      st: +steer.toFixed(2),
      th: +throttle.toFixed(2),
      ob:
        (ob.veh ? `v${ob.veh.d.toFixed(1)}` : ob.ped ? `p${ob.ped.d.toFixed(1)}` : '') +
        (n.avoid ? (n.avoid.sgn > 0 ? '>' : n.avoid.sgn < 0 ? '<' : 'x') : ''),
      pd: +tr.d.toFixed(1),
      s: +tr.s.toFixed(0),
      L: +n.path.len.toFixed(0),
    };
  }

  function footTick(dt, aimOverride) {
    const pl = game.player,
      n = nav;
    const x = pl.pos.x,
      z = pl.pos.z;
    let aim;
    if (aimOverride) aim = aimOverride;
    else {
      const tr = trackPath(n.path, x, z);
      if (tr.d > 10 && n.replans < 40) {
        replan('off-path');
        return;
      }
      aim = n.path.len - tr.s < 2.5 ? n.target : pathPointAt(n.path, tr.s + 2.5);
    }
    let dx = aim.x - x,
      dz = aim.z - z;
    const l = hyp(dx, dz) || 1;
    dx /= l;
    dz /= l;
    // stuck: sidestep
    const moved = hyp(x - n.lastPos.x, z - n.lastPos.z);
    if (moved > 0.8) {
      n.lastPos = { x, z };
      n.movedT = B.t;
    }
    if (n.sideT > 0) {
      n.sideT -= dt;
      const sx = -dz * n.side,
        sz = dx * n.side;
      dx = dx * 0.3 + sx;
      dz = dz * 0.3 + sz;
    } else if (B.t - n.movedT > 1.5) {
      n.side = -n.side;
      n.sideT = 0.9;
      n.stuckT++;
      n.movedT = B.t;
      ev('sidestep', { x: +x.toFixed(1), z: +z.toFixed(1), n: n.stuckT });
      if (n.stuckT % 3 === 0) replan('stuck');
      if (n.stuckT % 2 === 0) press('Space');
    }
    const yaw = game.rig.yaw;
    const fx = Math.sin(yaw),
      fz = Math.cos(yaw),
      rx = -Math.cos(yaw),
      rz = Math.sin(yaw);
    const ay = dx * fx + dz * fz,
      ax = dx * rx + dz * rz;
    const m = Math.max(Math.abs(ax), Math.abs(ay)) || 1;
    const slow = aimOverride && aimOverride.slow;
    stick((ax / m) * (slow ? 0.5 : 1), (ay / m) * (slow ? 0.5 : 1));
    setHeld(slow || (aimOverride && aimOverride.walk) ? [] : ['ShiftLeft']);
    // turn the camera toward where we walk (mouse look), for readable screenshots
    const want = Math.atan2(dx, dz),
      d = angDiff(want, yaw);
    if (Math.abs(d) > 0.05)
      game.input.mdx += clamp((-d * 0.12) / 0.0026 / (game.settings.sens || 1), -40, 40);
  }

  function replan(why) {
    const p = game.player.worldPos();
    const old = nav;
    const n = startNav(old.target, old.r, {
      name: old.name,
      slowAtEnd: old.slowAtEnd,
      next: old.next,
    });
    n.purpose = old.purpose;
    n.leg = old.leg;
    n.replans = old.replans + 1;
    n.stuckT = old.stuckT;
    n.lastProgT = old.lastProgT;
    n.bestRemain = old.bestRemain;
    ev('replan', { why, x: +p.x.toFixed(1), z: +p.z.toFixed(1), n: n.replans });
  }

  // teleport fallback (explicit, reported, counts as failure of the leg)
  function fallback(reason, to) {
    const pl = game.player,
      v = pl.vehicle;
    let tx, tz;
    if (to) {
      tx = to.x;
      tz = to.z;
    } else {
      const tr = trackPath(nav.path, pl.worldPos().x, pl.worldPos().z);
      const q = pathPointAt(nav.path, Math.min(nav.path.len, tr.s + 25));
      tx = q.x;
      tz = q.z;
    }
    const from = { x: +pl.worldPos().x.toFixed(1), z: +pl.worldPos().z.toFixed(1) };
    if (v) v.place(tx, tz, nav ? Math.atan2(nav.target.x - tx, nav.target.z - tz) : v.heading);
    else pl.place(tx, tz, pl.heading);
    B.curStep &&
      B.curStep.fallbacks.push({
        reason,
        from,
        to: { x: +tx.toFixed(1), z: +tz.toFixed(1) },
        t: +game.playTime.toFixed(1),
      });
    ev('FALLBACK_TELEPORT', { reason, from, to: { x: +tx.toFixed(1), z: +tz.toFixed(1) } });
    if (nav) {
      nav.lastProgT = B.t;
      nav.bestRemain = Infinity;
      replan('after-teleport');
    }
  }

  // progress watchdog for the current leg
  function watchdog() {
    if (!nav) return;
    const rem = navRemain();
    if (rem < nav.bestRemain - 2) {
      nav.bestRemain = rem;
      nav.lastProgT = B.t;
    }
    if (B.t - nav.lastProgT > B.opts.fallbackStallSec)
      fallback(`no progress for ${B.opts.fallbackStallSec}s toward ${nav.name || 'target'}`);
  }

  // ------------------------------------------------------------------ scooter handling
  function myRide() {
    const v = game.myScooter;
    if (v && !v.ai && v.driver !== 'ai') return v;
    return null;
  }
  // returns true while busy getting onto a scooter
  function mountTick(dt) {
    const pl = game.player;
    if (pl.vehicle) return false;
    let v = myRide();
    const p = pl.pos;
    if (!v || hyp(v.pos.x - p.x, v.pos.z - p.z) > 150) {
      // any parked scooter nearby
      let best = null,
        bd = 150;
      for (const o of game.vehicles)
        if (o.kind === 'scooter' && !o.driver) {
          const d = hyp(o.pos.x - p.x, o.pos.z - p.z);
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
      v = best;
    }
    if (!v) return false;
    const d = hyp(v.pos.x - p.x, v.pos.z - p.z);
    const near = game._nearestVehicle(3.2);
    if (near && !near.ai && near.kind === 'scooter' && pl.y < 1) {
      neutral();
      if (!B._fCool || B.t > B._fCool) {
        press('KeyF');
        B._fCool = B.t + 0.4;
        ev('mount', { vehicle: near === game.myScooter ? 'JAT SM' : near.label });
      }
      return true;
    }
    if (
      !nav ||
      nav.purpose !== 'mount' ||
      hyp(nav.target.x - v.pos.x, nav.target.z - v.pos.z) > 1
    ) {
      startNav({ x: v.pos.x, z: v.pos.z, name: 'scooter' }, 1.5);
      nav.purpose = 'mount';
    }
    if (d < 6) footTick(dt, { x: v.pos.x, z: v.pos.z, slow: d < 3 });
    else footTick(dt);
    return true;
  }
  function dismountTick() {
    const pl = game.player,
      v = pl.vehicle;
    if (!v) return false;
    if (Math.abs(v.speed) > 1.5) {
      stick(0, -1);
      setHeld([]);
      return true;
    }
    stick(0, 0);
    if (!B._fCool || B.t > B._fCool) {
      press('KeyF');
      B._fCool = B.t + 0.4;
      ev('dismount', {});
      B.parked = { x: v.pos.x, z: v.pos.z };
    }
    return true;
  }

  // ------------------------------------------------------------------ objectives
  function currentObjective() {
    const m = game.missions,
      s = m.step;
    // a section that timed out (MissionSystem.fail -> exit) waits at its ▶ start ring: ride back there and
    // carry on (the phone's 任務 app ▶ 繼續任務 does the same as m.resumeSection())
    if (!s && m.exited && m.exited.at)
      return {
        kind: 'resume',
        target: { x: m.exited.at.x, z: m.exited.at.z, name: '▶ 任務起點' },
        r: 4,
      };
    if (!s) return null;
    if (s.type === 'goto') return { kind: 'goto', target: s.target, r: s.radius };
    if (s.type === 'cps') {
      const left = s.list.filter((c) => !c.hit);
      if (!left.length) return null;
      if (s.ordered)
        return { kind: 'cp', target: left[0], next: left[1] || null, r: s.radius, ordered: true };
      // unordered: choose the visiting order once (brute force over path lengths, <= 5 boards) and keep it
      const key = left.map((c) => s.list.indexOf(c)).join(',');
      if (!B._order || B._order.key !== key || B._order.step !== s) {
        const p = game.player.worldPos(),
          mode = game.player.vehicle ? 'vehicle' : 'vehicle';
        const off =
          B.opts.route === 'offroad' || (B.opts.route === 'auto' && game.missions.timer !== null);
        const plen = (a, b) => {
          const o = off && planOffroad(a, b, 'vehicle');
          if (o) return finalizePath(o).len;
          const r = astar(a.x, a.z, b.x, b.z, mode);
          return r ? finalizePath(r).len : hyp(a.x - b.x, a.z - b.z) * 1.6;
        };
        const D = left.map((a) => left.map((b) => (a === b ? 0 : plen(a, b)))),
          D0 = left.map((c) => plen(p, c));
        let best = null,
          bc = Infinity;
        const perm = (rest, cur, cost, order) => {
          if (cost >= bc) return;
          if (!rest.length) {
            bc = cost;
            best = order;
            return;
          }
          for (const j of rest)
            perm(
              rest.filter((k) => k !== j),
              j,
              cost + (cur < 0 ? D0[j] : D[cur][j]),
              [...order, j]
            );
        };
        perm(
          left.map((_, i) => i),
          -1,
          0,
          []
        );
        B._order = {
          key,
          step: s,
          first: left[best[0]],
          second: best.length > 1 ? left[best[1]] : null,
          plan: best.map((i) => left[i].name),
          cost: Math.round(bc),
        };
        ev('cp-order', { plan: B._order.plan, pathM: B._order.cost });
      }
      return {
        kind: 'cp',
        target: B._order.first,
        next: B._order.second,
        r: s.radius,
        ordered: false,
      };
    }
    if (s.type === 'votes') return { kind: 'votes', need: s.need, base: s.base };
    // mission 5 (布條失竊案): both `until` steps are solved at 彥霖's old desk (walk in, use the computer)
    if (s.type === 'until' && m.idx === 5 && game.interiors.yh) return { kind: 'yh' };
    // mission 6 (宿舍拉票): up the west scissor stair of 力行 to the 2F south gallery, E at each of the six doors
    if (s.type === 'until' && s.dorm) return { kind: 'dorm' };
    return null;
  }

  // ------------------------------------------------------------------ mission 5: 彥霖's old home + the detective terminal
  // The house (src/world/Interiors.js buildYanlinHome) is entered on foot through a fixed chain of waypoints in the
  // building's local frame: side door -> 1F hallway -> stair -> 2F landing -> corridor -> lobby -> room door -> desk.
  const YH_WP = [
    [3.52, -1.0],
    [3.52, 0.7],
    [3.52, 5.2],
    [3.3, 9.85],
    [2.33, 9.85],
    [2.33, 5.05],
    [3.62, 5.05],
    [3.62, 3.7],
    [2.05, 3.0],
    [1.99, 1.42],
  ];
  const YH_UP = 3; // waypoints from this index on are on 2F
  function yhWps() {
    const k = game.interiors.yh.k;
    return YH_WP.map(([lx, lz], i) => {
      const [x, z] = k.w(lx, lz);
      return { x, z, up: i >= YH_UP, i };
    });
  }
  function inYanlinHouse() {
    const pl = game.player;
    if (pl.vehicle || !game.interiors.yh) return false;
    const zn = game.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y);
    return (
      !!zn &&
      (zn.name === '彥霖以前住的地方' ||
        zn.name.startsWith('孫師傅牛肉拉麵') ||
        zn.name.startsWith('黃蓋瑞'))
    );
  }
  // 黃蓋瑞's flat next door opens off the 2F landing (src/world/buildings/GarryHome.js): if we ever wander in, go back to the landing
  function inGarryFlat() {
    const pl = game.player,
      zn = game.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y);
    return !!zn && zn.name.startsWith('黃蓋瑞');
  }
  // walk along the waypoint chain toward its end (dir +1, the desk) or its start (dir -1, the street)
  function yhWalk(dt, dir) {
    const pl = game.player,
      W = yhWps(),
      up = pl.y > 2.3;
    let y = B._yh;
    if (!y || y.dir !== dir) {
      // nearest waypoint on the same floor (the stair waypoints count for both)
      let bi = 0,
        bd = Infinity;
      for (const w of W) {
        if (w.i !== 2 && w.i !== 3 && w.up !== up) continue;
        const d = hyp(w.x - pl.pos.x, w.z - pl.pos.z);
        if (d < bd) {
          bd = d;
          bi = w.i;
        }
      }
      y = B._yh = { dir, i: bi, t: B.t };
      startNav({ x: W[bi].x, z: W[bi].z, name: dir > 0 ? 'desk' : 'street door' }, 0.3);
      nav.purpose = 'yh';
      ev('yh-walk', { dir, from: bi });
    }
    const end = dir > 0 ? W.length - 1 : 0;
    if (inGarryFlat()) {
      y.i = YH_UP;
      if (!y.garry) {
        y.garry = true;
        ev('yh-garry');
      }
    }
    let w = W[y.i];
    const d = hyp(w.x - pl.pos.x, w.z - pl.pos.z);
    if (d < (y.i === end ? 0.15 : 0.35)) {
      if (y.i === end) {
        neutral();
        return true;
      }
      y.i += dir;
      y.t = B.t;
      w = W[y.i];
      nav.target = { x: w.x, z: w.z };
      nav.bestRemain = Infinity;
      nav.lastProgT = B.t;
    }
    if (!nav || nav.purpose !== 'yh') {
      startNav({ x: w.x, z: w.z, name: 'yh' }, 0.3);
      nav.purpose = 'yh';
    }
    const rem = hyp(w.x - pl.pos.x, w.z - pl.pos.z);
    if (rem < nav.bestRemain - 0.3) {
      nav.bestRemain = rem;
      nav.lastProgT = B.t;
    }
    if (B.t - nav.lastProgT > B.opts.fallbackStallSec)
      fallback(`stuck in 彥霖's old home on the way to waypoint ${y.i}`, w);
    footTick(dt, { x: w.x, z: w.z, slow: y.i === end && rem < 1, walk: true }); // no sprinting indoors: it overshoots the narrow turns
    return false;
  }
  function yhTick(dt) {
    const pl = game.player,
      W = yhWps(),
      P0 = W[0];
    // park on 中北路 itself, a few metres out from the side door, heading along the road: a scooter that
    // stops nose-first at the door turns into the 1F hallway when it sets off again
    const rp = game.world.nearestRoadPoint(P0.x, P0.z),
      curb = { x: rp.x, z: rp.z, name: '彥霖以前住的地方' };
    const wp = pl.worldPos();
    if (inYanlinHouse()) {
      yhWalk(dt, 1);
      usePc();
      return;
    }
    if (pl.vehicle) {
      if (hyp(curb.x - wp.x, curb.z - wp.z) <= 2.5) {
        dismountTick();
        return;
      }
    } else if (hyp(P0.x - wp.x, P0.z - wp.z) <= 8) {
      if (yhWalk(dt, 1)) usePc();
      return;
    }
    // get to the kerb in front of the house first (scooter if far), like any other objective
    B._yh = null;
    if (!pl.vehicle && hyp(curb.x - pl.pos.x, curb.z - pl.pos.z) >= 60 && mountTick(dt)) {
      watchdogMount();
      return;
    }
    if (!nav || nav.purpose !== 'yh-door' || nav.mode !== (pl.vehicle ? 'vehicle' : 'foot')) {
      startNav(curb, 2, { slowAtEnd: true });
      nav.purpose = 'yh-door';
      const leg = {
        name: curb.name,
        kind: 'yh',
        startT: +game.playTime.toFixed(2),
        mode: nav.mode,
        route: nav.route,
        pathLen: Math.round(nav.path.sCp),
        noPath: nav.noPath,
      };
      B.curStep && B.curStep.legs.push(leg);
      ev('leg', leg);
    }
    watchdog();
    if (pl.vehicle) driveTick(dt);
    else footTick(dt);
  }
  // at the desk: E uses the computer
  function usePc() {
    const W = yhWps(),
      d = W[W.length - 1],
      p = game.player.pos;
    if (hyp(d.x - p.x, d.z - p.z) > 0.2) return;
    if (!B._eCool || B.t > B._eCool) {
      press('KeyE');
      B._eCool = B.t + 0.6;
      ev('use-pc');
    }
  }
  // ------------------------------------------------------------------ mission 6: 力行宿舍 2F, 276～281
  // Lixing's local frame (src/world/buildings/Lixing.js; I.lixing.W maps it to the world): outside the gate in the
  // gatehouse row along 新中北路 (ANNEX gate0..gate1) -> through it onto the forecourt -> in front of the open bay on
  // the west wing's forecourt face -> the 1F walkway -> the south landing of the west scissor stair -> its
  // courtyard-side lane climbs north to the 2F north landing -> the main corridor -> the courtyard's east gallery ->
  // the south gallery, where the six doorsteps are.
  const LX_WP = [
    [58.8, 36.0],
    [58.8, 27.5],
    [40.5, 26.1],
    [36.2, 26.1],
    [34.85, 24.2],
    [34.85, 10.6],
    [34.85, 8.6],
    [32.6, 8.6],
    [32.6, 26.1],
  ];
  const LX_UP = 5; // waypoints from this index on are on 2F
  function lxWps() {
    const L = game.interiors.lixing;
    return LX_WP.map(([lx, lz], i) => {
      const [x, z] = L.W(lx, lz);
      return { x, z, up: i >= LX_UP, i };
    });
  }
  function lxUp() {
    const L = game.interiors.lixing,
      pl = game.player;
    return !!L && !pl.vehicle && pl.pos.y > L.B + L.FL[1] - 1.2 && inLixing();
  }
  function inLixing() {
    const pl = game.player;
    if (pl.vehicle || !game.interiors.lixing) return false;
    const zn = game.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y);
    return !!zn && zn.name === '力行宿舍';
  }
  // walk the chain toward the south gallery (dir +1) or back out to the forecourt (dir -1); true at its end
  function lxWalk(dt, dir) {
    const pl = game.player,
      W = lxWps(),
      up = lxUp();
    let y = B._lx;
    if (!y || y.dir !== dir) {
      let bi = 0,
        bd = Infinity;
      for (const w of W) {
        if (w.i !== LX_UP - 1 && w.i !== LX_UP && w.up !== up) continue; // the stair ends count for both floors
        const d = hyp(w.x - pl.pos.x, w.z - pl.pos.z);
        if (d < bd) {
          bd = d;
          bi = w.i;
        }
      }
      y = B._lx = { dir, i: bi };
      startNav({ x: W[bi].x, z: W[bi].z, name: dir > 0 ? '力行 2F' : '力行 前院' }, 0.3);
      nav.purpose = 'lx';
      ev('lx-walk', { dir, from: bi });
    }
    const end = dir > 0 ? W.length - 1 : 0;
    let w = W[y.i];
    if (hyp(w.x - pl.pos.x, w.z - pl.pos.z) < 0.4) {
      if (y.i === end) {
        neutral();
        return true;
      }
      y.i += dir;
      w = W[y.i];
      nav.target = { x: w.x, z: w.z };
      nav.bestRemain = Infinity;
      nav.lastProgT = B.t;
      ev('lx-wp', { i: y.i, y: +game.player.pos.y.toFixed(2) });
    }
    if (!nav || nav.purpose !== 'lx') {
      startNav({ x: w.x, z: w.z, name: 'lx' }, 0.3);
      nav.purpose = 'lx';
    }
    const rem = hyp(w.x - pl.pos.x, w.z - pl.pos.z);
    if (rem < nav.bestRemain - 0.3) {
      nav.bestRemain = rem;
      nav.lastProgT = B.t;
    }
    if (B.t - nav.lastProgT > B.opts.fallbackStallSec)
      fallback(`stuck in 力行宿舍 on the way to waypoint ${y.i}`, w);
    footTick(dt, { x: w.x, z: w.z, walk: true });
    return false;
  }
  function dormTick(dt, m) {
    const pl = game.player,
      left = m.dormLeft;
    if (!left.length) {
      neutral();
      return;
    }
    const W = lxWps(),
      rp = game.world.nearestRoadPoint(W[0].x, W[0].z),
      gate = { x: rp.x, z: rp.z },
      wp = pl.worldPos();
    if (lxUp() && B._lx && B._lx.dir > 0 && B._lx.i === W.length - 1) {
      // on the south gallery: the nearest door still to visit, E on its doorstep
      let d = left[0];
      for (const q of left) if (hyp(q.x - wp.x, q.z - wp.z) < hyp(d.x - wp.x, d.z - wp.z)) d = q;
      const r = hyp(d.x - wp.x, d.z - wp.z);
      if (!nav || nav.purpose !== 'lx-door' || nav.name !== d.name) {
        startNav({ x: d.x, z: d.z, name: d.name }, 0.3);
        nav.purpose = 'lx-door';
      }
      if (r < nav.bestRemain - 0.3) {
        nav.bestRemain = r;
        nav.lastProgT = B.t;
      }
      if (r < 0.6) {
        neutral();
        if (!B._eCool || B.t > B._eCool) {
          press('KeyE');
          B._eCool = B.t + 0.6;
          ev('dorm-door', { room: d.no });
        }
        return;
      }
      if (B.t - nav.lastProgT > B.opts.fallbackStallSec)
        fallback(`stuck on the 力行 2F gallery on the way to ${d.name}`, d);
      footTick(dt, { x: d.x, z: d.z, slow: r < 1.2, walk: true });
      return;
    }
    if (
      lxUp() ||
      (!pl.vehicle &&
        (inLixing() ||
          B._lx ||
          hyp(gate.x - wp.x, gate.z - wp.z) <= 3 ||
          hyp(W[0].x - wp.x, W[0].z - wp.z) <= 8))
    ) {
      lxWalk(dt, 1);
      return;
    }
    if (pl.vehicle && hyp(gate.x - wp.x, gate.z - wp.z) <= 3) {
      dismountTick();
      return;
    }
    B._lx = null;
    if (!pl.vehicle && hyp(gate.x - pl.pos.x, gate.z - pl.pos.z) >= 60 && mountTick(dt)) {
      watchdogMount();
      return;
    }
    if (!nav || nav.purpose !== 'lx-gate' || nav.mode !== (pl.vehicle ? 'vehicle' : 'foot')) {
      startNav({ x: gate.x, z: gate.z, name: '力行宿舍' }, 2, { slowAtEnd: true });
      nav.purpose = 'lx-gate';
      const leg = {
        name: '力行宿舍',
        kind: 'dorm',
        startT: +game.playTime.toFixed(2),
        mode: nav.mode,
        route: nav.route,
        pathLen: Math.round(nav.path.sCp),
        noPath: nav.noPath,
      };
      B.curStep && B.curStep.legs.push(leg);
      ev('leg', leg);
    }
    watchdog();
    if (pl.vehicle) driveTick(dt);
    else footTick(dt);
  }
  // the terminal: open it, type `case`, crack the case with SQL, accuse, then switch the computer off.
  // Commands are typed into the terminal's input line and sent with Enter, exactly like a player.
  const CASE_CMDS = [
    'case',
    'SELECT * FROM banners;',
    "SELECT * FROM cctv WHERE time BETWEEN '13:00' AND '13:45';",
    "SELECT name, plate FROM students WHERE plate LIKE 'MKZ-8_3';",
    "SELECT * FROM purchases WHERE item = '美工刀';",
    "SELECT * FROM access_log WHERE place = '圖書館';",
    "SELECT * FROM posts WHERE content LIKE '%任務完成%';",
    'accuse 小明',
  ];
  function pcTick() {
    const g = game,
      pc = g.pc,
      D = g.detective;
    const rt = realNow();
    if (g.missions.idx !== 5 || D.solved('banner')) {
      // nothing (more) to do on the computer: power it off
      if (!B._pcOff || rt > B._pcOff) {
        B._pcOff = rt + 1000;
        ev('pc-off', { solved: D.solved('banner') });
        document.getElementById('pcPower').click();
      }
      return;
    }
    // the first time a case opens, 🎬 一鍵通關 asks "要自動通關嗎？" (src/ui/AutoSolveUI.js). While that pop-up is up it
    // swallows every keydown, so the terminal never sees our Enter. Answer like a player who types it: 「✍️ 我自己來」.
    const ask = document.querySelector('.as-layer.as-ask');
    if (ask) {
      const btns = [...ask.querySelectorAll('[data-i]')],
        manual = btns.find((b) => b.textContent.includes('我自己來')) || btns[btns.length - 1];
      if (manual) {
        ev('autosolve-ask', { pick: manual.textContent.trim() });
        manual.click();
      }
      if (B._term) B._term.next = rt + 400;
      return;
    }
    let t = B._term;
    if (!t) {
      t = B._term = { i: 0, next: rt };
      ev('pc-open');
    }
    if (!pc.wins.term) {
      if (rt > t.next) {
        pc.launch('term');
        t.next = rt + 500;
        ev('pc-launch', { app: 'term' });
      }
      return;
    }
    const body = pc.wins.term.w,
      inp = body.querySelector('.tm-in'),
      ps = body.querySelector('.tm-ps');
    if (!inp || rt < t.next) return;
    if (t.i >= CASE_CMDS.length) {
      if (rt > t.next + 3000) {
        ev('case-unsolved', { clues: D.st('banner').clues });
        t.i = 1;
      } // run the queries again
      return;
    }
    // after `case`, wait until the detective console is up (it loads sql.js first)
    if (t.i > 0 && (!ps || ps.textContent !== 'sql> ')) {
      if (rt - t.next > 60000) {
        ev('case-no-console');
        t.i = 0;
        t.next = rt;
      }
      return;
    }
    const cmd = CASE_CMDS[t.i++];
    inp.focus();
    inp.value = cmd;
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    ev('terminal', { cmd, clues: D.st('banner').clues.length });
    t.next = rt + 400;
  }

  // ------------------------------------------------------------------ canvassing (flyers)
  let canv = null;
  function canvassTick(dt, obj) {
    const pl = game.player;
    if (pl.vehicle) {
      dismountTick();
      return;
    }
    if (!canv)
      canv = {
        tgt: null,
        since: B.t,
        gave: 0,
        home: B.parked || { x: pl.pos.x, z: pl.pos.z },
        startT: B.t,
      };
    const R = B.t - canv.startT > 60 ? 90 : B.opts.canvassRadius;
    const home = canv.home;
    const ok = (q) =>
      !q.dormant && !q.voted && q.state !== 'down' && hyp(q.pos.x - home.x, q.pos.z - home.z) < R;
    if (canv.tgt && (!ok(canv.tgt) || B.t - canv.since > 25)) canv.tgt = null;
    if (!canv.tgt) {
      let best = null,
        bd = Infinity;
      for (const q of game.peds.active())
        if (ok(q)) {
          const d = hyp(q.pos.x - pl.pos.x, q.pos.z - pl.pos.z);
          if (d < bd) {
            bd = d;
            best = q;
          }
        }
      canv.tgt = best;
      canv.since = B.t;
      if (best) {
        startNav({ x: best.pos.x, z: best.pos.z, name: 'pedestrian' }, 2.5);
        nav.purpose = 'ped';
      }
    }
    const q = canv.tgt;
    if (!q) {
      // nobody around: drift back toward home so new students spawn nearby
      const dh = hyp(home.x - pl.pos.x, home.z - pl.pos.z);
      if (dh > 10) {
        if (!nav || nav.purpose !== 'home') {
          startNav({ x: home.x, z: home.z, name: 'canvass-home' }, 4);
          nav.purpose = 'home';
        }
        footTick(dt);
      } else neutral();
      return;
    }
    const d = hyp(q.pos.x - pl.pos.x, q.pos.z - pl.pos.z);
    const nearest = game._nearestPed(3.5);
    if (d < 3.0 && nearest === q) {
      neutral();
      if (!B._mCool || B.t > B._mCool) {
        press('Mouse0');
        B._mCool = B.t + 0.35;
        canv.gave++;
        ev('flyer', { ped: game.peds.list.indexOf(q) });
      }
      return;
    }
    // follow the pedestrian: re-target the path when it moved
    if (!nav || nav.purpose !== 'ped' || hyp(nav.target.x - q.pos.x, nav.target.z - q.pos.z) > 6) {
      startNav({ x: q.pos.x, z: q.pos.z, name: 'pedestrian' }, 2.5);
      nav.purpose = 'ped';
    }
    if (d < 8 && losFree(pl.pos.x, pl.pos.z, q.pos.x, q.pos.z, 0.4))
      footTick(dt, { x: q.pos.x, z: q.pos.z, slow: d < 4 });
    else footTick(dt);
  }

  // ------------------------------------------------------------------ step bookkeeping
  function stepTitle() {
    const el =
      document.getElementById('objTitle') ||
      document.querySelector('#objective .title, #objective b');
    return el ? el.textContent : '';
  }
  function beginStep(idx) {
    const s = {
      idx,
      title: '',
      startT: +game.playTime.toFixed(2),
      endT: null,
      limit: null,
      timerStartT: null,
      timerEndT: null,
      timerLeft: null,
      fails: 0,
      fallbacks: [],
      distance: 0,
      legs: [],
      frames: 0,
      realMs: 0,
      renders: 0,
      renderMs: 0,
      realStart: realNow(),
      r0: E.renders,
      rm0: E.renderMs,
      flyers: 0,
      votesStart: game.votes,
    };
    B.steps.push(s);
    B.curStep = s;
    ev('step-begin', { idx });
    return s;
  }
  function endStep(s, noShot) {
    s.endT = +game.playTime.toFixed(2);
    s.realMs = Math.round(realNow() - s.realStart);
    s.renders = E.renders - s.r0;
    s.renderMs = Math.round(E.renderMs - s.rm0);
    s.votesEnd = game.votes;
    ev('step-end', { idx: s.idx, dur: +(s.endT - s.startT).toFixed(2) });
    if (!noShot) requestShot(s.idx);
  }
  // ask for one drawn frame; once it is drawn, tell story-bot.mjs to grab the screenshot
  const shotQ = [];
  function requestShot(idx) {
    if (B.opts.shots === false) return;
    E.renderReq = (E.renderReq || 0) + 1;
    shotQ.push({ idx, after: E.renders });
  }
  function pushToNode(force) {
    if (!window.__e2eSend) return;
    const now = realNow();
    if (!force && now - (B._lastSend || 0) < 400) return;
    B._lastSend = now;
    try {
      window.__e2eSend(JSON.stringify(B.poll()));
    } catch (e) {}
  }

  // ------------------------------------------------------------------ main tick
  let lastIdx = -99,
    lastPos = null,
    lastTimer = null,
    lastBig = '',
    lastExited = null;
  B.status = () => {
    const g = game,
      m = g.missions,
      pl = g.player,
      p = pl.worldPos();
    return {
      state: g.state,
      idx: m.idx,
      step: m.step ? m.step.type : null,
      timer: m.timer,
      playTime: g.playTime,
      votes: g.votes,
      flyerVotes: g.flyerVotes || 0,
      inDialog: g.hud.inDialog,
      vehicle: pl.vehicle ? pl.vehicle.label : null,
      speed: pl.vehicle ? pl.vehicle.speed : pl.speed,
      x: p.x,
      z: p.z,
      nav: nav
        ? { name: nav.name, remain: navRemain(), mode: nav.mode, replans: nav.replans }
        : null,
      frames: B.frames,
      renders: E.renders,
      renderMs: E.renderMs,
      exited: m.exited ? m.exited.title : null,
      idleStall: B.idleStall || null,
      dbg: B.dbg,
      done: B.done,
      fatal: B.fatal,
    };
  };
  B.poll = () => {
    const e = B.events;
    B.events = [];
    return { status: B.status(), events: e, steps: B.steps };
  };
  B.frames = 0;

  function tick() {
    const g = game,
      dt = g.playTime - (B._lastPlay ?? g.playTime);
    B._lastPlay = g.playTime;
    B.frames++;
    if (B.curStep) B.curStep.frames++;
    B.t = g.playTime;
    const inp = g.input;
    for (const c of releaseNext) inp.keys.delete(c);
    releaseNext = [];
    let urgent = false;
    while (shotQ.length && E.renders > shotQ[0].after) {
      ev('rendered', { idx: shotQ.shift().idx });
      urgent = true;
    }
    if (urgent || B.events.some((e) => e.type === 'step-end' || e.type === 'ending'))
      pushToNode(true);
    else pushToNode(false);
    if (g.state === 'ending' || (g.missions && g.missions.done)) {
      if (!B.done) {
        if (B.curStep) endStep(B.curStep, true);
        B.done = true;
        ev('ending', { votes: g.votes, playTime: g.playTime });
        requestShot(99);
      }
      neutral();
      return;
    }
    if (g.state === 'paused') {
      ev('paused');
      const b = document.getElementById('mResume') || document.getElementById('modalClose');
      b && b.click();
      return;
    }
    if (g.state !== 'play') return;
    const m = g.missions,
      pl = g.player;

    // bookkeeping: step changes, timer, distance, failures
    if (m.idx !== lastIdx) {
      if (m.idx > lastIdx) {
        if (B.curStep) endStep(B.curStep);
        beginStep(m.idx);
      } else ev('mission-retry', { idx: m.idx });
      lastIdx = m.idx;
      canv = null;
      nav = null;
    }
    const s = B.curStep;
    if (s) {
      const t = stepTitle();
      if (t && m.step) s.title = t;
      if (m.timer !== null && lastTimer === null) {
        s.timerStartT = +g.playTime.toFixed(2);
        s.timerEndT = null;
        s.limit = s.limit ?? +m.timer.toFixed(1);
        (s.attempts ||= []).push({
          start: s.timerStartT,
          limit: +m.timer.toFixed(1),
          end: null,
          left: null,
        });
        ev('timer-start', { limit: m.timer });
      }
      if (m.timer !== null) s.timerLeft = +m.timer.toFixed(2);
      if (m.timer === null && lastTimer !== null) {
        s.timerEndT = +g.playTime.toFixed(2);
        s.timerLeft = +lastTimer.toFixed(2);
        const a = s.attempts && s.attempts[s.attempts.length - 1];
        if (a) {
          a.end = s.timerEndT;
          a.left = s.timerLeft;
        }
        ev('timer-stop', { left: lastTimer });
      }
      const p = pl.worldPos();
      if (lastPos) {
        const d = hyp(p.x - lastPos.x, p.z - lastPos.z);
        if (d < 30) s.distance += d;
      }
      lastPos = { x: p.x, z: p.z };
    }
    lastTimer = m.timer;
    const bigEl = document.getElementById('bigToastTitle'),
      big =
        bigEl && !document.getElementById('bigToast').classList.contains('hidden')
          ? bigEl.textContent
          : '';
    if (big !== lastBig) {
      if (big)
        ev('bigToast', {
          title: big,
          sub: (document.getElementById('bigToastSub') || {}).textContent,
        });
      lastBig = big;
    }
    // a timed section that runs out of time no longer shows 任務失敗: MissionSystem.fail() exits the section
    // (任務暫停) and parks a ▶ start ring. Count every new exit as a failed attempt.
    if (m.exited && m.exited !== lastExited && s) {
      s.failed = true;
      s.fails++;
      const a = s.attempts && s.attempts[s.attempts.length - 1];
      if (a) a.failed = true;
      ev('mission-fail', { idx: m.idx, fails: s.fails, title: m.exited.title });
      nav = null;
    }
    lastExited = m.exited;

    // modal UI that steals input
    if (B._returnTo && (g.missions.step !== B._returnTo.step || B.t - B._returnTo.t > 1.5)) {
      const r = B._returnTo;
      B._returnTo = null;
      fallback('return from the unreachable objective to the nearest reachable ground', r);
    }
    if (g.phone && g.phone.open) {
      neutral();
      if (!B._eCool || B.t > B._eCool) {
        press('KeyE');
        B._eCool = B.t + 0.3;
        ev('close-phone');
      }
      return;
    }
    if (g.pc && g.pc.isOpen) {
      neutral();
      pcTick();
      return;
    }
    if (B._term && g.missions.idx !== 5) B._term = null;
    if (g.hud.bigOpen) {
      neutral();
      press('KeyM');
      return;
    }
    if ((g.gate && g.gate.active) || (g.job && g.job.active)) {
      neutral();
      if (!B._eCool || B.t > B._eCool) {
        press('KeyE');
        B._eCool = B.t + 0.5;
        ev('leave-side-job');
      }
      return;
    }
    if (g.videoOpen) {
      neutral();
      press('Escape');
      return;
    }
    if (g.hud.inDialog) {
      neutral();
      B._idleT = null;
      if (!B._eCool || B.t > B._eCool) {
        press('KeyE');
        B._eCool = B.t + 0.25;
      }
      return;
    }
    if (pl.seat) {
      neutral();
      press('KeyE');
      return;
    }
    if (pl.frozen) {
      neutral();
      return;
    }

    const obj = currentObjective();
    if (!obj) {
      // between steps (toasts, timers): stop and wait; drop the finished leg so the status doesn't show it
      nav = null;
      if (pl.vehicle && Math.abs(pl.vehicle.speed) > 0.5) stick(0, -0.6);
      else neutral();
      if (B._idleT == null) B._idleT = g.playTime;
      else if (!B.idleStall && g.playTime - B._idleT > B.opts.idleStallSec) {
        B.idleStall = { idx: m.idx, sec: Math.round(g.playTime - B._idleT) };
        ev('idle-stall', B.idleStall);
      }
      return;
    }
    B._idleT = null;
    // back at the paused section's start ring: carry on with it
    if (obj.kind === 'resume' && m.inRing) {
      neutral();
      nav = null;
      if (m.resumeSection()) ev('mission-resume', { idx: m.idx, fails: s ? s.fails : 0 });
      return;
    }
    // per-mission give-up rule: a timed mission failed too often -> teleport through it (fallback)
    if (s && s.fails >= B.opts.maxMissionFails && obj.kind !== 'votes' && obj.kind !== 'resume') {
      if (!B._fbCool || B.t > B._fbCool) {
        B._fbCool = B.t + 1;
        startNav(obj.target, obj.r, { name: obj.target.name });
        fallback(`mission ${m.idx} failed ${s.fails}x`, obj.target);
      }
      return;
    }
    // leg budget: a leg that takes far too long gets a teleport hop
    if (obj.kind === 'votes') {
      canvassTick(dt, obj);
      return;
    }
    if (obj.kind === 'yh') {
      yhTick(dt);
      return;
    }
    if (obj.kind === 'dorm') {
      // still at 彥霖's old desk after mission 5: out to the street first
      if (inYanlinHouse()) {
        yhWalk(dt, -1);
        return;
      }
      if (B._yh) {
        B._yh = null;
        nav = null;
      }
      dormTick(dt, m);
      return;
    }
    // still upstairs in 力行 after mission 6: back down to the forecourt first
    if (lxUp() || (inLixing() && B._lx)) {
      if (!lxUp() && B._lx && B._lx.dir < 0 && B._lx.i === 0) B._lx = null;
      else {
        lxWalk(dt, -1);
        return;
      }
    }
    if (B._lx) {
      B._lx = null;
      nav = null;
    }
    // still inside 彥霖's old home (after mission 5): walk back out to the street first
    if (inYanlinHouse()) {
      yhWalk(dt, -1);
      return;
    }
    if (B._yh) {
      B._yh = null;
      nav = null;
    }
    const tgt = obj.target;
    if (!pl.vehicle) {
      const pp = pl.pos,
        dT = hyp(tgt.x - pp.x, tgt.z - pp.z);
      // walk only to a close objective that isn't followed by more checkpoints; otherwise get the scooter
      const walkable = dT < 60 && !(obj.next && hyp(obj.next.x - pp.x, obj.next.z - pp.z) > 60);
      if (!walkable && mountTick(dt)) {
        watchdogMount();
        return;
      }
    }
    const navGoal = nav && (nav.goal || nav.target);
    if (
      !nav ||
      nav.purpose ||
      hyp(navGoal.x - tgt.x, navGoal.z - tgt.z) > 0.5 ||
      nav.mode !== (pl.vehicle ? 'vehicle' : 'foot')
    ) {
      const nextIsDialog = obj.kind === 'goto';
      // can the objective circle be entered at all? (static collision, flood fill around it)
      const ri = reachInfo(tgt, obj.r, pl.vehicle ? 0.75 : 0.38);
      const dest = ri.reachable ? tgt : { x: ri.closest.x, z: ri.closest.z, name: tgt.name };
      startNav(dest, ri.reachable ? obj.r : 1.5, {
        name: tgt.name,
        slowAtEnd: nextIsDialog || !ri.reachable,
        next: ri.reachable ? obj.next || null : null,
      });
      nav.goal = { x: tgt.x, z: tgt.z, name: tgt.name, r: obj.r };
      if (!ri.reachable) {
        nav.unreachable = ri;
        ev('unreachable', {
          name: tgt.name,
          x: +tgt.x.toFixed(1),
          z: +tgt.z.toFixed(1),
          radius: obj.r,
          closestDist: +ri.dist.toFixed(1),
          closest: { x: +ri.closest.x.toFixed(1), z: +ri.closest.z.toFixed(1) },
          insideCollision: ri.inside,
        });
      }
      const leg = {
        name: tgt.name,
        kind: obj.kind,
        startT: +g.playTime.toFixed(2),
        mode: nav.mode,
        route: nav.route,
        pathLen: Math.round(nav.path.sCp),
        noPath: nav.noPath,
        unreachable: !ri.reachable || undefined,
      };
      s && s.legs.push(leg);
      nav.leg = leg;
      ev('leg', leg);
    }
    if (nav.unreachable) {
      // drive as close as the walls allow, then the explicit fallback hop into the objective circle
      const wp = pl.worldPos(),
        dc = hyp(wp.x - nav.target.x, wp.z - nav.target.z);
      if (dc < 3 || B.t - nav.lastProgT > 8) {
        const u = nav.unreachable,
          gl = nav.goal,
          d = u.dist || 1;
        // hop to a point inside the objective circle on the side facing the reachable ground,
        // then (once the game has counted it) hop back out to that ground
        const k = Math.max(0, gl.r - 2) / d;
        const hop = { x: gl.x + (u.closest.x - gl.x) * k, z: gl.z + (u.closest.z - gl.z) * k };
        fallback(
          `objective ${gl.name} unreachable: nearest reachable point is ${u.dist.toFixed(1)} m away, radius ${gl.r} m${u.inside ? ' (target lies inside building collision)' : ''}`,
          hop
        );
        B._returnTo = {
          x: u.closest.x,
          z: u.closest.z,
          t: B.t,
          idx: game.missions.idx,
          step: game.missions.step,
        };
        nav = null;
        return;
      }
    }
    watchdog();
    if (pl.vehicle) driveTick(dt);
    else footTick(dt);
  }
  function watchdogMount() {
    if (!nav) return;
    const rem = navRemain();
    if (rem < nav.bestRemain - 1) {
      nav.bestRemain = rem;
      nav.lastProgT = B.t;
    }
    if (B.t - nav.lastProgT > B.opts.fallbackStallSec)
      fallback('stuck walking to scooter', { x: nav.target.x + 1.5, z: nav.target.z });
  }

  B.install = (opts = {}) => {
    Object.assign(B.opts, opts);
    buildGraph();
    const inp = game.input,
      ef = inp.endFrame.bind(inp);
    inp.endFrame = () => {
      ef();
      try {
        tick();
      } catch (e) {
        B.fatal = String((e && e.stack) || e);
        ev('bot-error', { error: B.fatal });
      }
    };
    const cv = game.renderer.domElement;
    cv.addEventListener('webglcontextlost', () => {
      B.contextLost = true;
      ev('webgl-context-lost');
    });
    cv.addEventListener('webglcontextrestored', () => ev('webgl-context-restored'));
    if (game.renderer.getContext().isContextLost()) {
      B.contextLost = true;
      ev('webgl-context-lost', { atInstall: true });
    }
    ev('installed', { nodes: G.nodes.length, edges: G.edges.length });
    return { nodes: G.nodes.length, edges: G.edges.length };
  };
  // debugging helper: refined path length between two points in a mode
  B._len = (a, b, mode, off) => {
    if (!G) buildGraph();
    if (off) {
      const o = planOffroad(a, b, mode);
      return o ? Math.round(finalizePath(o).len) : null;
    }
    const r = astar(a.x, a.z, b.x, b.z, mode);
    return r ? Math.round(finalizePath(refine(r, mode)).len) : null;
  };
  B._detour = (a, b, r, C = 0.7) => {
    const d = gridDetour(a, b, r, 14, C);
    return d ? Math.round(finalizePath(dedupe([a, ...d])).len) : null;
  };
  // debugging helper: the refined path (points) between two points in a mode
  B._path = (a, b, mode) => {
    if (!G) buildGraph();
    const r = astar(a.x, a.z, b.x, b.z, mode);
    return r ? refine(r, mode).map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]) : null;
  };
  B._yhWps = () => yhWps().map((w) => [+w.x.toFixed(1), +w.z.toFixed(1)]);
  B.requestRender = (n = 1) => {
    E.renderReq = (E.renderReq || 0) + n;
    return E.renders;
  };
  B.renderer = () => {
    const gl = game.renderer.getContext();
    if (gl.isContextLost())
      return { renderer: null, vendor: null, version: null, contextLost: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
    };
  };
})();
