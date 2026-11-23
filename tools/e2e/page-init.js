// Injected with Page.addScriptToEvaluateOnNewDocument before any game code runs.
// story-bot.mjs replaces __E2E_CFG__ with a JSON object:
//   { fixedDt, stepsPerFrame, renderEvery, seed, settings }
// - fixedDt > 0: virtual clock. performance.now() and the rAF timestamp advance exactly fixedDt per
//   game frame, so the game's dt (main.js _loop: min(0.05, now - last)) is constant and the run is
//   independent of how fast Chrome can draw. stepsPerFrame game frames run per real animation frame.
// - renderEvery: draw only every Nth game frame (0 = only when the bot asks, e.g. for screenshots).
//   Game logic never reads the rendered image, so this only changes what is drawn, not how it plays.
// - seed: Math.random is replaced by a seeded PRNG (flyer acceptance etc. become reproducible).
// - settings: written to the game's localStorage settings before it loads (quality, music).
(() => {
  const cfg = __E2E_CFG__;
  const realNow = performance.now.bind(performance);
  const realRAF = window.requestAnimationFrame.bind(window);
  const realCAF = window.cancelAnimationFrame.bind(window);
  const E = (window.__e2e = {
    cfg,
    realNow,
    frames: 0,
    renders: 0,
    renderMs: 0,
    renderReq: 0,
    vnow: 0,
    wrapped: false,
  });

  if (cfg.settings) {
    try {
      const k = 'cycu-shun-settings-v2';
      const cur = JSON.parse(localStorage.getItem(k) || '{}');
      localStorage.setItem(k, JSON.stringify({ ...cur, ...cfg.settings }));
    } catch (e) {}
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

  if (cfg.fixedDt > 0) {
    const step = cfg.fixedDt * 1000;
    E.vnow = realNow();
    performance.now = () => E.vnow;
    let queue = new Map(),
      nextId = 1,
      scheduled = false;
    const pump = () => {
      // `scheduled` stays true while callbacks run, so their own rAF calls don't schedule a second pump
      const n = Math.max(1, cfg.stepsPerFrame | 0);
      for (let i = 0; i < n && queue.size; i++) {
        E.vnow += step;
        const q = queue;
        queue = new Map();
        for (const cb of q.values()) {
          try {
            cb(E.vnow);
          } catch (e) {
            setTimeout(() => {
              throw e;
            });
          }
        }
      }
      scheduled = false;
      if (queue.size) {
        scheduled = true;
        realRAF(pump);
      }
    };
    window.requestAnimationFrame = (cb) => {
      const id = nextId++;
      queue.set(id, cb);
      if (!scheduled) {
        scheduled = true;
        realRAF(pump);
      }
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      if (!queue.delete(id)) realCAF(id);
    };
  }

  // wrap the game's renderer as soon as it exists (before the title loop starts drawing)
  const tryWrap = () => {
    const g = window.game;
    if (!g || !g.post || E.wrapped) return !!E.wrapped;
    const orig = g.post.render.bind(g.post);
    let n = 0;
    g.post.render = (...a) => {
      n++;
      const every = cfg.renderEvery | 0;
      const want = E.renderReq > 0 || (every > 0 && n % every === 0);
      if (!want) return;
      if (E.renderReq > 0) E.renderReq--;
      const t = realNow();
      orig(...a);
      E.renders++;
      E.renderMs += realNow() - t;
    };
    E.wrapped = true;
    return true;
  };
  const iv = setInterval(() => {
    if (tryWrap()) clearInterval(iv);
  }, 5);
})();
