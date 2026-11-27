// Evaluated in the page once the game is in play. Helpers for staging promo shots.
(() => {
  const g = window.game;
  const D = (window.__D = {});
  const st = document.createElement('style');
  st.id = 'promoCss';
  document.head.appendChild(st);
  // promo footage always shows the computer's default wallpaper (the blue gradient), never a custom wallpaper from assets/pc/
  const wall = document.createElement('style');
  wall.id = 'promoWall';
  wall.textContent =
    '.pc-screen { background: radial-gradient(circle at 70% 30%, #3a7bd5 0, #1c3f7a 45%, #0f2147 100%) !important; }';
  document.head.appendChild(wall);
  D.hud = (show) => {
    st.textContent = show
      ? ''
      : `#hud, #dialog, .toast, #toasts, #keyHints, .keyhints, #prompt, .prompt, #crosshair, #sunday { display: none !important; }`;
  };
  D.free = () => {
    const h = g.hud;
    h.dialogQueue = [];
    h.dialogCb = null;
    h._showNext();
    const M = g.missions;
    M.done = true;
    M.free = true;
    if (M.timer !== null && M.exit) M.exit();
    g.input.enabled = true;
  };
  D.clock = (hh, mm = 0) => {
    g.clock = hh * 60 + mm;
  };
  D.place = (x, z, h = 0) => {
    const v = g.player.vehicle;
    if (v) v.place(x, z, h);
    else g.player.place(x, z, h);
  };
  // terrain height (Player.place drops the player onto surfaceAt(x, z)); the player stays parked at `park`
  D.park = [-300, 400];
  D.gy = (x, z) => {
    const p = g.player;
    if (p.vehicle) return 0;
    p.place(x, z, p.heading);
    const y = p.pos.y;
    p.place(D.park[0], D.park[1], p.heading);
    return y;
  };
  // ground-relative points [[x, dy, z]] -> absolute
  D.G = (pts) => pts.map(([x, dy, z]) => [x, D.gy(x, z) + dy, z]);
  // Catmull-Rom through [[x,y,z],...] at u in [0,1] (uniform by segment)
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t,
      t3 = t2 * t;
    return p1.map(
      (_, i) =>
        0.5 *
        (2 * p1[i] +
          (-p0[i] + p2[i]) * t +
          (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
          (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)
    );
  };
  D.spline = (pts) => {
    // arc-length table
    const raw = (u) => {
      const n = pts.length - 1,
        f = Math.min(n - 1e-6, Math.max(0, u * n)),
        i = Math.floor(f);
      return cr(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(n, i + 2)], f - i);
    };
    const N = 400,
      acc = [0];
    let prev = raw(0);
    for (let k = 1; k <= N; k++) {
      const p = raw(k / N);
      acc.push(acc[k - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]));
      prev = p;
    }
    const L = acc[N];
    return (s) => {
      const d = Math.max(0, Math.min(1, s)) * L;
      let k = 1;
      while (k < N && acc[k] < d) k++;
      const f = (k - 1 + (d - acc[k - 1]) / (acc[k] - acc[k - 1] || 1)) / N;
      return raw(f);
    };
  };
  D.ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
  D.easeOut = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 2.2);
  // move camera along position spline `pos`, looking along `look` spline; u in [0,1]
  D.camAt = (p, l, fov = 62) => {
    const c = g.camera;
    c.position.set(p[0], p[1], p[2]);
    c.up.set(0, 1, 0);
    c.lookAt(l[0], l[1], l[2]);
    if (c.fov !== fov) {
      c.fov = fov;
      c.updateProjectionMatrix();
    }
    c.updateMatrixWorld(true);
  };
  // a shot: { frames, pos: [[x,y,z]...], look: [[x,y,z]...], bob, fov, ease }
  D.shot = (s) => {
    const P = D.spline(s.pos),
      Lk = D.spline(s.look);
    let f = 0;
    D.cur = s;
    __rec.hook = () => {
      const u0 = f / Math.max(1, s.frames - 1);
      const u = s.ease === 'linear' ? u0 : s.ease === 'out' ? D.easeOut(u0) : D.ease(u0);
      const p = P(u),
        l = Lk(u);
      if (s.bob) {
        const ph = f * ((2 * Math.PI) / 17);
        p[1] += Math.sin(ph * 2) * 0.025 * s.bob;
        p[0] += Math.sin(ph) * 0.012 * s.bob;
      }
      D.camAt(p, l, s.fov || 62);
      f++;
    };
  };
  D.stop = () => {
    __rec.hook = null;
  };
  // really ride: mount my scooter at path[0] and follow the polyline with the virtual joystick
  D.mount = (x, z, h) => {
    const v = g.myScooter;
    if (g.player.vehicle) g.player.exit(g.scene, g.world.collision, g.interiors);
    if (g.player.ragdoll) g.player._unrag?.();
    v.fallen = false;
    v.speed = 0;
    v.place(x, z, h);
    g.player.enter(v);
    return v;
  };
  // polyline helpers: lateral offset (+ = right of travel) and point at arc length
  D.offsetPath = (pts, off) =>
    pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz) || 1;
      // heading atan2(dx, dz); right-hand normal in x/z = (-dz, dx) for a y-up, heading measured from +z
      return [p[0] - (dz / l) * off, p[1] + (dx / l) * off];
    });
  const proj = (pts, x, z) => {
    let best = { d: Infinity, s: 0 },
      acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i],
        [bx, bz] = pts[i + 1];
      const dx = bx - ax,
        dz = bz - az,
        l2 = dx * dx + dz * dz || 1,
        L = Math.sqrt(l2);
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
      if (d < best.d) best = { d, s: acc + t * L };
      acc += L;
    }
    return best.s;
  };
  const at = (pts, s) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i],
        [bx, bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az);
      if (s <= L || i === pts.length - 2) {
        const t = Math.min(1, s / (L || 1));
        return [ax + (bx - ax) * t, az + (bz - az) * t];
      }
      s -= L;
    }
  };
  D.ride = (path, vmax = 10, look = 12, gain = 0.9) => {
    __rec.hook = null;
    D.rideHook = () => {
      const v = g.player.vehicle;
      if (!v) return;
      const sp = Math.abs(v.speed || 0);
      const s = proj(path, v.pos.x, v.pos.z);
      const [tx, tz] = at(path, s + look + sp * 0.4);
      const want = Math.atan2(tx - v.pos.x, tz - v.pos.z);
      const err = Math.atan2(Math.sin(want - v.heading), Math.cos(want - v.heading));
      g.input.joy.active = true;
      g.input.joy.x = Math.max(-1, Math.min(1, -err * gain)); // vin.steer = -x
      g.input.joy.y = -Math.max(0, Math.min(1, (vmax - sp) * 0.25));
    };
    __rec.hook = D.rideHook;
  };
  D.unride = () => {
    g.input.joy.active = false;
    g.input.joy.x = g.input.joy.y = 0;
  };
  // finger tap indicator: a ring that shrinks onto the element over `pre` frames, then clicks it
  const ring = document.createElement('div');
  ring.style.cssText =
    'position:fixed;z-index:99999;pointer-events:none;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(255,255,255,.95);box-shadow:0 0 0 2px rgba(0,0,0,.25);display:none;transform:translate(-50%,-50%)';
  document.body.appendChild(ring);
  D.taps = [];
  // timeline: [{at, fn}] plus taps [{at, sel | el}] and smooth scroll [{from, to, sel, px}]
  D.plan = (p) => {
    D.P = p;
  };
  D.tick = (i) => {
    const p = D.P;
    if (!p) return;
    let wait = null;
    for (const e of p.steps || []) if (e.at === i) wait = e.fn() || wait;
    // typing: [{from, sel, text, cps}] sets value char by char (frames at 30 fps)
    for (const t of p.types || []) {
      const n = Math.floor(((i - t.from) / 30) * (t.cps || 14));
      if (i >= t.from && n <= t.text.length + 1) {
        const el = document.querySelector(t.sel);
        if (el) {
          el.value = (t.keep || '') + t.text.slice(0, Math.max(0, n));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          if (el.tagName === 'TEXTAREA') el.scrollTop = el.scrollHeight;
        }
      }
    }
    let tapVis = false;
    for (const t of p.taps || []) {
      const el = typeof t.sel === 'string' ? document.querySelector(t.sel) : t.sel?.();
      const k = i - t.at; // ring visible k in [-8, 10]
      if (k >= -8 && k <= 10 && el) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width * (t.fx ?? 0.5),
          cy = r.top + r.height * (t.fy ?? 0.5);
        const sz = k < 0 ? 70 + k * 4 : 38 + k * 3;
        ring.style.display = 'block';
        ring.style.left = `${cx}px`;
        ring.style.top = `${cy}px`;
        ring.style.width = ring.style.height = `${sz}px`;
        ring.style.opacity = k < 0 ? (8 + k) / 8 : 1 - k / 10;
        tapVis = true;
        if (k === 0)
          el.__flag
            ? el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
            : el.click();
      }
    }
    if (!tapVis) ring.style.display = 'none';
    if (wait) return wait;
    for (const s of p.scrolls || []) {
      if (i >= s.from && i <= s.to) {
        const el = document.querySelector(s.sel);
        if (!el) continue;
        if (i === s.from) s.y0 = el.scrollTop;
        const u = D.ease((i - s.from) / (s.to - s.from));
        el.scrollTop = s.y0 + s.px * u;
      }
    }
  };
  D.where = () => {
    const p = g.player.worldPos();
    return { x: +p.x.toFixed(1), z: +p.z.toFixed(1), h: +g.player.heading.toFixed(2) };
  };
  return 'director ready';
})();
