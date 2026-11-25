// Injected before any game code runs (Page.addScriptToEvaluateOnNewDocument / Playwright addInitScript).
// profile_scene.mjs replaces __BENCH_CFG__ with { seed, settings }. Runs as a plain browser script.
// - seeds Math.random (NPC / traffic become reproducible)
// - tracks every canvas with a WeakRef (a held-forever strong reference would hide leaks AND garbage)
// - exposes window.__bench: canvas report, scene snapshot, frame-time sampling, CPU timers
(() => {
  const cfg = __BENCH_CFG__;
  const B = (window.__bench = { cfg, t0: performance.now(), cpu: { render: [], update: [] } });

  if (cfg.settings) {
    try {
      const k = 'cycu-shun-settings-v2';
      const cur = JSON.parse(localStorage.getItem(k) || '{}');
      localStorage.setItem(k, JSON.stringify({ ...cur, ...cfg.settings }));
    } catch (_e) {}
  }

  if (cfg.seed) {
    let a = cfg.seed >>> 0;
    Math.random = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const refs = [];
  const seen = new WeakSet();
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const ctx = origGetContext.call(this, type, ...args);
    if (ctx && !seen.has(this)) {
      seen.add(this);
      refs.push({ ref: new WeakRef(this), type });
    }
    return ctx;
  };

  const mb = (bytes) => Number((bytes / 1048576).toFixed(2));

  B.canvasReport = () => {
    let live = 0;
    let inDom = 0;
    let bytes = 0;
    const sizes = new Map();
    for (const it of refs) {
      const cv = it.ref.deref();
      if (!cv) continue;
      live++;
      const b = cv.width * cv.height * 4;
      bytes += b;
      if (cv.isConnected) inDom++;
      const key = `${cv.width}x${cv.height}`;
      const e = sizes.get(key) || { size: key, count: 0, bytes: 0 };
      e.count++;
      e.bytes += b;
      sizes.set(key, e);
    }
    const top = [...sizes.values()]
      .sort((x, y) => y.bytes - x.bytes)
      .slice(0, 10)
      .map((e) => ({ size: e.size, count: e.count, mb: mb(e.bytes) }));
    return {
      created: refs.length,
      canvasCount: live,
      canvasInDom: inDom,
      canvasMB: mb(bytes),
      topCanvasSizes: top,
    };
  };

  // estimated GPU-side texture memory of everything the scene references (RGBA8, +1/3 for mips)
  B.textureReport = () => {
    const g = window.game;
    const seenTex = new Set();
    let px = 0;
    g.scene.traverse((o) => {
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) {
        for (const k in m) {
          const t = m[k];
          if (t && t.isTexture && !seenTex.has(t)) {
            seenTex.add(t);
            // a canvas released after upload (src/graphics/GpuMemLifecycle.js) is 1x1 on the CPU, but the GPU
            // still holds it at the size it was uploaded at
            const gw = t.userData?.gpuW,
              im = t.image;
            if (gw) px += gw * t.userData.gpuH;
            else if (im && im.width) px += im.width * im.height;
          }
        }
      }
    });
    return { textureCount: seenTex.size, textureEstMB: mb((px * 4 * 4) / 3) };
  };

  B.snapshot = () => {
    const g = window.game;
    const r = g.renderer;
    return {
      state: g.state,
      tier: g.perfProfile?.tier || null,
      safeMode: Boolean(g.perfProfile?.safeMode),
      quality: g.quality,
      render: {
        calls: r.info.render.calls,
        triangles: r.info.render.triangles,
        textures: r.info.memory.textures,
        geometries: r.info.memory.geometries,
      },
      jsHeapMB: performance.memory ? mb(performance.memory.usedJSHeapSize) : null,
      domNodes: document.getElementsByTagName('*').length,
    };
  };

  B.gpuRenderer = () => {
    try {
      const gl = window.game.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    } catch (_e) {
      return '';
    }
  };

  // wrap the two per-frame hot paths to measure their CPU (JS) time separately from GPU wait
  B.installTimers = () => {
    const g = window.game;
    if (B.timersInstalled) return;
    B.timersInstalled = true;
    const wrap = (obj, name, bucket) => {
      const orig = obj[name].bind(obj);
      obj[name] = (...a) => {
        const t = performance.now();
        const out = orig(...a);
        B.cpu[bucket].push(performance.now() - t);
        return out;
      };
    };
    wrap(g.post, 'render', 'render');
    wrap(g, '_update', 'update');
  };

  // never let the runtime auto-downgrade quality while measuring: it would change what is measured
  B.freezeQuality = () => {
    window.game.gameLoop.autoQuality = () => {};
  };

  // sample rAF intervals for durationMs; returns the raw deltas and the CPU samples collected meanwhile
  B.sampleFrames = (durationMs) =>
    new Promise((resolve) => {
      B.cpu.render.length = 0;
      B.cpu.update.length = 0;
      const deltas = [];
      let last = 0;
      const t0 = performance.now();
      const step = (now) => {
        if (last) deltas.push(now - last);
        last = now;
        if (now - t0 >= durationMs) {
          resolve({ deltas, render: B.cpu.render.slice(), update: B.cpu.update.slice() });
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
})();
