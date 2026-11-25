// 開機追蹤（網址帶 ?boottrace）：載入流程每走一步，就用 sendBeacon 回報給 Vite 開發伺服器
// （vite.config.js 的 bootTracePlugin，路徑 /__boot），印在 Mac 的終端機上。手機（iPhone Safari／LINE／IG）
// 載入到一半被系統殺掉、自動重整時，前一次走到哪一步仍留在終端機裡。
// 每筆附上：距開頁毫秒數、還活著的 <canvas> 張數與像素記憶體（MB）、JS heap（只有 Chromium 有）。
// 沒帶 ?boottrace 時什麼都不做：mark() 是空函式，也不攔截 document.createElement / getContext。
const ENDPOINT = '__boot';

const OFF = { on: false, mark() {}, watchGl() {}, afterFrames() {} };

export function createBootTrace(search = location.search) {
  if (!/[?&]boottrace\b/.test(search)) return OFF;

  const sid = Math.random().toString(36).slice(2, 7); // 同一次開頁的紀錄共用一個代號
  const url = new URL(ENDPOINT, location.href).href;
  const log = (window.__bootTrace = []);
  const canvases = [];
  const hasWeakRef = typeof WeakRef === 'function';

  const createEl = document.createElement;
  document.createElement = function (tag, opts) {
    const el = createEl.call(this, tag, opts);
    if (hasWeakRef && typeof tag === 'string' && tag.toLowerCase() === 'canvas')
      canvases.push(new WeakRef(el));
    return el;
  };
  // getContext 回傳 null：瀏覽器拒絕再配置畫布（例如 iOS 的畫布記憶體上限），記下前幾次
  let nulls = 0;
  const getCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const ctx = getCtx.call(this, type, attrs);
    if (!ctx && nulls++ < 5) mark('getContext null', `${type} ${this.width}x${this.height}`);
    return ctx;
  };

  const canvasMem = () => {
    if (!hasWeakRef) return { mb: -1, n: -1 };
    let bytes = 0,
      n = 0;
    for (const ref of canvases) {
      const cv = ref.deref();
      if (!cv) continue;
      n++;
      bytes += cv.width * cv.height * 4;
    }
    return { mb: Math.round(bytes / 1e6), n };
  };
  const send = (rec) => {
    const body = JSON.stringify(rec);
    try {
      if (navigator.sendBeacon?.(url, body)) return;
    } catch (_e) {}
    fetch(url, { method: 'POST', body, keepalive: true }).catch(() => {});
  };

  function mark(label, extra) {
    const { mb, n } = canvasMem();
    const mem = performance.memory;
    const rec = {
      sid,
      t: Math.round(performance.now()),
      label,
      cmb: mb,
      cn: n,
      heap: mem ? Math.round(mem.usedJSHeapSize / 1e6) : null,
      extra: extra ?? null,
    };
    log.push(rec);
    send(rec);
  }

  addEventListener('error', (e) =>
    mark(
      'error',
      `${e.message} @${String(e.filename || '')
        .split('/')
        .pop()}:${e.lineno}`
    )
  );
  addEventListener('unhandledrejection', (e) =>
    mark('unhandledrejection', String(e.reason?.message || e.reason))
  );
  addEventListener('pagehide', () => mark('pagehide'));
  document.addEventListener('visibilitychange', () =>
    mark(`visibility ${document.visibilityState}`)
  );

  mark(
    'start',
    `${navigator.userAgent} | dpr ${devicePixelRatio} | ${screen.width}x${screen.height}`
  );

  return {
    on: true,
    mark,
    // WebGL context 被系統收回（iOS 記憶體吃緊時常見）
    watchGl(canvas) {
      canvas.addEventListener('webglcontextlost', () => mark('webglcontextlost'));
      canvas.addEventListener('webglcontextrestored', () => mark('webglcontextrestored'));
    },
    // 等 n 幀真的畫完再記（第一幀會把所有貼圖上傳到 GPU，常是載入後的另一個高峰）
    afterFrames(label, n = 2) {
      const step = (k) => (k ? requestAnimationFrame(() => step(k - 1)) : mark(label));
      step(n);
    },
  };
}
