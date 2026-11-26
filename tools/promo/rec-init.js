// Injected before game code. Virtual clock for frame-exact capture:
// - auto mode (loading / title): rAF pumps on real frames, game time advances 1/30 s per frame
// - manual mode (__rec.manual = true): nothing runs until the recorder calls __rec.step(n),
//   which advances n game frames and draws only the last one
(() => {
  const DT = 1000 / 30;
  const realRAF = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  const R = (window.__rec = { manual: false, vnow: realNow(), draw: 0, hook: null, frame: 0 });
  try {
    const k = 'cycu-shun-settings-v2';
    localStorage.setItem(
      k,
      JSON.stringify({
        quality: 'high',
        music: 'off',
        amb: 'off',
        perfHud: 'off',
        fpv: true,
        fill: 'on',
      })
    );
  } catch (e) {}
  let a = 7;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  performance.now = () => R.vnow;
  let queue = new Map(),
    nextId = 1,
    scheduled = false;
  const runOne = () => {
    R.vnow += DT;
    const q = queue;
    queue = new Map();
    for (const cb of q.values()) {
      try {
        cb(R.vnow);
      } catch (e) {
        console.error('rAF cb', e);
      }
    }
  };
  const pump = () => {
    scheduled = false;
    if (R.manual) return;
    R.draw = 1;
    runOne();
    if (queue.size && !scheduled) {
      scheduled = true;
      realRAF(pump);
    }
  };
  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    if (!scheduled && !R.manual) {
      scheduled = true;
      realRAF(pump);
    }
    return id;
  };
  window.cancelAnimationFrame = (id) => queue.delete(id);
  // advance n game frames, draw the last one
  R.step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      R.draw = i === n - 1 ? 1 : 0;
      runOne();
    }
    R.frame++;
  };
  R.setManual = (m) => {
    R.manual = m;
    if (!m && queue.size && !scheduled) {
      scheduled = true;
      realRAF(pump);
    }
  };
  const iv = setInterval(() => {
    const g = window.game;
    if (!g || !g.post) return;
    clearInterval(iv);
    const orig = g.post.render.bind(g.post);
    g.post.render = (...args) => {
      if (!R.draw) return;
      if (R.hook) {
        try {
          R.hook(g, R.vnow / 1000);
        } catch (e) {
          console.error('hook', e);
        }
      }
      orig(...args);
    };
  }, 5);
})();
