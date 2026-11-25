#!/usr/bin/env node
// Headless scene & canvas profiler for Phase 0+ baseline measurements.
// Usage: node tools/profile_scene.mjs [--dist=dist] [--query=?perf] [--gpu|--swiftshader] [--play] [--if-available]
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
const play = hasFlag('play');
const ifAvailable = hasFlag('if-available');
const chromePath = argVal('chrome', defaultChromePath());

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
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (!this.__perfTracked) {
      this.__perfTracked = true;
      tracked.push({ cv: this, type, initW: this.width, initH: this.height });
    }
    return orig.call(this, type, ...args);
  };
  window.__perfCanvasSnapshot = () => {
    let totalBytes = 0;
    let nonOneCount = 0;
    let maxPixels = 0;
    for (const item of tracked) {
      const w = item.cv.width || 0;
      const h = item.cv.height || 0;
      const px = w * h;
      if (w > 1 || h > 1) nonOneCount++;
      if (px > maxPixels) maxPixels = px;
      totalBytes += px * 4;
    }
    return {
      totalCreated: tracked.length,
      nonOneCount,
      maxPixels,
      backingStoreMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    };
  };
})();
`;

const srv = await startServer({ root: distDir, port: 0 });
let browser = null;
let page = null;

try {
  browser = await launchChrome({ chrome: chromePath, gpu, width: 1280, height: 720 });
  page = await connectPage(browser.port);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
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

  const collectMetrics = async () =>
    page.eval(`(() => {
      const g = window.game;
      const r = g.renderer;
      return {
        state: g.state,
        tier: g.perfProfile?.tier || null,
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

  const titleMetrics = await collectMetrics();
  let playMetrics = null;
  if (play) {
    await page.eval(`document.getElementById('btnStart')?.click()`);
    await waitUntil(`window.game?.state === 'play'`);
    await sleep(1200);
    playMetrics = await collectMetrics();
  }

  console.log(JSON.stringify({ title: titleMetrics, play: playMetrics }, null, 2));
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
