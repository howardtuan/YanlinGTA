#!/usr/bin/env node
// Headless scene & canvas profiler for Phase 0+ baseline measurements.
// Usage:
//   node tools/profile_scene.mjs [--dist=dist] [--query=?perf] [--gpu|--swiftshader]
//     [--mobile] [--width=1280] [--height=720] [--play] [--markdown]
//     [--assert-ios-budget] [--max-peak-canvas-mb=220] [--max-live-canvas-mb=24] [--if-available]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './e2e/serve.mjs';
import { launchChrome, connectPage, defaultChromePath } from './e2e/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

function argVal(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

const distDir = path.resolve(ROOT, argVal('dist', 'dist'));
const query = argVal('query', '?perf');
const gpu = hasFlag('gpu') ? 'gpu' : 'swiftshader';
const mobile = hasFlag('mobile');
const width =
  Number.parseInt(argVal('width', mobile ? '430' : '1280'), 10) || (mobile ? 430 : 1280);
const height =
  Number.parseInt(argVal('height', mobile ? '932' : '720'), 10) || (mobile ? 932 : 720);
const play = hasFlag('play');
const markdown = hasFlag('markdown');
const assertIosBudget = hasFlag('assert-ios-budget');
const maxPeakCanvasMB = Number.parseFloat(argVal('max-peak-canvas-mb', '220')) || 220;
const maxLiveCanvasMB = Number.parseFloat(argVal('max-live-canvas-mb', '24')) || 24;
const ifAvailable = hasFlag('if-available');
const chromePath = argVal('chrome', defaultChromePath());

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1';

if (!fs.existsSync(distDir)) {
  console.error(`profile_scene: dist directory not found (${distDir}); run npm run build first.`);
  process.exit(1);
}
if (!fs.existsSync(chromePath) && !chromePath.includes(path.sep)) {
  // Rely on PATH lookup unless --if-available is requested and no binary was resolved
} else if (!fs.existsSync(chromePath)) {
  if (ifAvailable) {
    console.log(`profile_scene: Chrome binary not found at ${chromePath}; skipping.`);
    process.exit(0);
  }
  console.error(`profile_scene: Chrome binary not found at ${chromePath}.`);
  process.exit(1);
}

const PRE_INIT_HOOK = `
(() => {
  const tracked = [];
  const trackedSet = new Set();
  let peakBytes = 0;
  let peakLiveCount = 0;
  let peakSingle = { w: 0, h: 0, bytes: 0 };

  const recalcPeak = () => {
    let liveBytes = 0;
    let nonOne = 0;
    for (const item of tracked) {
      const w = item.cv.width || 0;
      const h = item.cv.height || 0;
      const b = w * h * 4;
      liveBytes += b;
      if (w > 1 || h > 1) nonOne++;
      if (b > peakSingle.bytes) peakSingle = { w, h, bytes: b };
    }
    if (liveBytes > peakBytes) peakBytes = liveBytes;
    if (nonOne > peakLiveCount) peakLiveCount = nonOne;
  };

  const trackCanvas = (cv, type) => {
    if (!trackedSet.has(cv)) {
      trackedSet.add(cv);
      tracked.push({ cv, type });
    }
    recalcPeak();
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const ctx = origGetContext.call(this, type, ...args);
    if (ctx) trackCanvas(this, type);
    return ctx;
  };

  for (const prop of ['width', 'height']) {
    const desc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, prop);
    if (desc?.set && desc?.get) {
      Object.defineProperty(HTMLCanvasElement.prototype, prop, {
        configurable: true,
        enumerable: desc.enumerable,
        get() {
          return desc.get.call(this);
        },
        set(val) {
          desc.set.call(this, val);
          if (trackedSet.has(this)) recalcPeak();
        },
      });
    }
  }

  window.__perfCanvasSnapshot = () => {
    let liveBytes = 0;
    let nonOneCount = 0;
    let maxPixels = 0;
    for (const item of tracked) {
      const w = item.cv.width || 0;
      const h = item.cv.height || 0;
      const px = w * h;
      if (w > 1 || h > 1) nonOneCount++;
      if (px > maxPixels) maxPixels = px;
      liveBytes += px * 4;
    }
    const mb = (bytes) => Number((bytes / (1024 * 1024)).toFixed(2));
    return {
      totalCreated: tracked.length,
      nonOneCount,
      peakNonOneCount: peakLiveCount,
      maxPixels,
      peakSingleCanvas: { w: peakSingle.w, h: peakSingle.h, mb: mb(peakSingle.bytes) },
      peakBackingStoreMB: mb(peakBytes),
      liveBackingStoreMB: mb(liveBytes),
    };
  };
})();
`;

function formatMarkdownTable(result) {
  const rows = [result.title, result.play].filter(Boolean);
  const lines = [
    '| 階段 | 模式 | 檔位 | 畫質 | FPS (Avg ms) | Calls | Tris | Tex | Geo | Peak Canvas MB | Live Canvas MB (非1×1數) | 啟動耗時 |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
  ];
  for (const r of rows) {
    const fps = r.fps ? `${r.fps.fps} fps (${r.fps.avgMs} ms)` : '-';
    const peak = r.canvases ? `${r.canvases.peakBackingStoreMB} MB` : '-';
    const live = r.canvases
      ? `${r.canvases.liveBackingStoreMB} MB (${r.canvases.nonOneCount}/${r.canvases.totalCreated})`
      : '-';
    const boot = r.bootDiag ? `${r.bootDiag.elapsedMs} ms` : '-';
    lines.push(
      `| ${r.state} | ${mobile ? 'mobile' : 'desktop'} | ${r.tier || '-'}${r.safeMode ? ' [SAFE]' : ''} | ${r.quality} | ${fps} | ${r.render.calls} | ${Math.round(r.render.triangles / 1000)}k | ${r.memory.textures} | ${r.memory.geometries} | ${peak} | ${live} | ${boot} |`
    );
  }
  return lines.join('\n');
}

const srv = await startServer({ root: distDir, port: 0 });
let browser = null;
let page = null;

try {
  browser = await launchChrome({ chrome: chromePath, gpu, width, height });
  page = await connectPage(browser.port);
  await page.send('Page.enable');
  await page.send('Runtime.enable');

  if (mobile) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await page.send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 5,
    });
    await page.send('Emulation.setUserAgentOverride', {
      userAgent: IPHONE_UA,
    });
  }

  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: PRE_INIT_HOOK });

  const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  await page.send('Page.navigate', { url: `${srv.url}${q}` });

  const waitUntil = async (expr, timeoutMs = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const ok = await page.eval(expr);
      if (ok) return;
      await sleep(250);
    }
    throw new Error(`Timed out waiting for: ${expr}`);
  };

  await waitUntil(`window.game?.state === 'title'`);
  await sleep(800);

  const sampleFps = () =>
    page.eval(`new Promise((resolve) => {
      let frames = 0;
      const t0 = performance.now();
      const step = (now) => {
        frames++;
        if (now - t0 >= 1000) {
          const dt = now - t0;
          resolve({
            fps: Number(((frames * 1000) / dt).toFixed(1)),
            avgMs: Number((dt / Math.max(1, frames)).toFixed(1)),
          });
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    })`);

  const collectMetrics = async () => {
    const fps = await sampleFps();
    const snap = await page.eval(`(() => {
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
        },
        memory: {
          textures: r.info.memory.textures,
          geometries: r.info.memory.geometries,
        },
        canvases: window.__perfCanvasSnapshot ? window.__perfCanvasSnapshot() : null,
        bootDiag: g.bootDiag?.getState?.()?.current || null,
      };
    })()`);
    return { ...snap, fps };
  };

  const titleMetrics = await collectMetrics();
  let playMetrics = null;
  if (play) {
    await page.eval(`document.getElementById('btnStart')?.click()`);
    await waitUntil(`window.game?.state === 'play'`);
    await sleep(1200);
    playMetrics = await collectMetrics();
  }

  const output = { mobile, title: titleMetrics, play: playMetrics };
  console.log(markdown ? formatMarkdownTable(output) : JSON.stringify(output, null, 2));

  if (assertIosBudget) {
    const target = playMetrics || titleMetrics;
    const peak = target.canvases?.peakBackingStoreMB ?? 0;
    const live = target.canvases?.liveBackingStoreMB ?? 0;
    const violations = [];
    if (peak > maxPeakCanvasMB) {
      violations.push(`peakBackingStoreMB ${peak} MB > limit ${maxPeakCanvasMB} MB`);
    }
    if (live > maxLiveCanvasMB) {
      violations.push(`liveBackingStoreMB ${live} MB > limit ${maxLiveCanvasMB} MB`);
    }
    if (violations.length) {
      console.error(`iOS memory budget exceeded: ${violations.join('; ')}`);
      process.exitCode = 1;
    }
  }
} catch (err) {
  if (ifAvailable && /spawn|Chrome exited|not found/i.test(String(err?.message || err))) {
    console.log(`profile_scene: Chrome unavailable (${err.message}); skipping.`);
    process.exit(0);
  }
  console.error(err);
  process.exitCode = 1;
} finally {
  page?.close();
  await browser?.kill();
  await srv.close();
}
