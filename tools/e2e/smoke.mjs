#!/usr/bin/env node
// Headless Chrome smoke & deterministic performance check for the production build (dist/).
// Serves dist/ under a sub-path (default /YanlinGTA/, matching GitHub Pages), verifies the game
// gets past the loading bar to the title screen, clicks 開始遊戲, completes the entry splash into
// play state, and records hardware info + deterministic perf metrics (no perf cap gate).
//
//   node tools/e2e/smoke.mjs [--dist=dist] [--base-path=/YanlinGTA/] [--swiftshader|--gpu]
//     [--width=960] [--height=540] [--quality=low] [--seed=1337] [--out=tools/e2e/out/smoke]
//     [--summary=<path>] [--no-shots] [--strict] [--load-timeout=120] [--play-timeout=45]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';
import { launchChrome, connectPage, defaultChromePath } from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const arg = (k, d) => {
  const a = argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};

if (flag('help') || flag('h')) {
  console.log(`node tools/e2e/smoke.mjs [options]
  --dist=<dir>          dist directory to serve (default: dist)
  --base-path=<path>    URL sub-path to mount dist/ at (default: /YanlinGTA/)
  --chrome=<path>       Chrome binary (default: env CHROME or standard install path)
  --swiftshader | --gpu WebGL renderer mode (default: swiftshader)
  --width=960 --height=540
  --quality=low         game quality setting (default: low)
  --seed=1337           seed for Math.random
  --out=<dir>           output directory for report & screenshots (default: tools/e2e/out/smoke)
  --summary=<path>      append Markdown summary to this file (e.g. $GITHUB_STEP_SUMMARY)
  --no-shots            skip saving screenshots
  --strict              also fail on known harmless Chrome log errors
  --load-timeout=120    seconds to wait for title screen (default: 120)
  --play-timeout=45     seconds to wait for play state after clicking start (default: 45)`);
  process.exit(0);
}

const cfg = {
  dist: path.resolve(ROOT, arg('dist', 'dist')),
  basePath: arg('base-path', '/YanlinGTA/'),
  chrome: arg('chrome', defaultChromePath()),
  gpu: flag('gpu') ? 'gpu' : 'swiftshader',
  width: +arg('width', 960),
  height: +arg('height', 540),
  quality: arg('quality', 'low'),
  seed: +arg('seed', 1337),
  out: path.resolve(ROOT, arg('out', path.join('tools', 'e2e', 'out', 'smoke'))),
  summary: arg('summary', ''),
  shots: !flag('no-shots'),
  strict: flag('strict'),
  loadTimeoutMs: +arg('load-timeout', 120) * 1000,
  playTimeoutMs: +arg('play-timeout', 45) * 1000,
};

const KNOWN_NOISE = [
  {
    re: /Unsupported LanguageModel API languages/,
    why: 'src/ui/phone/Nano.js probes Gemini Nano with languages:["zh"] first and falls back to "en" on purpose',
  },
];

const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

const t0 = Date.now();
const say = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s]`, ...a);

if (!fs.existsSync(path.join(cfg.dist, 'index.html'))) {
  console.error(`smoke: ${path.join(cfg.dist, 'index.html')} not found (run npm run build first)`);
  process.exit(1);
}

fs.mkdirSync(cfg.out, { recursive: true });
for (const f of fs.readdirSync(cfg.out)) {
  if (/^(play|failure)\.jpg$/.test(f) || f === 'smoke-report.json') {
    fs.rmSync(path.join(cfg.out, f));
  }
}

const cpus = os.cpus();
const cpuModel = cpus[0]?.model?.trim() || 'unknown';
const isCI = process.env.GITHUB_ACTIONS === 'true';

const report = {
  tool: 'YanlinGTA smoke',
  startedAt: new Date().toISOString(),
  config: {
    basePath: cfg.basePath,
    gpu: cfg.gpu,
    viewport: `${cfg.width}x${cfg.height}`,
    quality: cfg.quality,
    seed: cfg.seed,
  },
  hardware: {
    source: isCI ? 'GitHub Actions (Verify / ubuntu-24.04)' : 'Local',
    os: `${os.type()} ${os.release()} (${os.platform()}/${os.arch()})`,
    cpu: `${cpuModel} × ${cpus.length}`,
    ramGB: Math.round(os.totalmem() / 2 ** 30),
    node: process.version,
    chrome: null,
    renderer: null,
    viewportAndQuality: `${cfg.width}x${cfg.height} · ${cfg.quality}`,
  },
  checks: {
    titleLoaded: { ok: false, detail: '' },
    enteredPlay: { ok: false, detail: '' },
    noRuntimeErrors: { ok: false, detail: '' },
  },
  boot: { toTitleMs: null, toPlayMs: null, resourceCount: null, transferKB: null },
  perf: null,
  pageErrors: [],
  consoleErrors: [],
  networkErrors: [],
  ignoredErrors: [],
  webglErrors: [],
  screenshot: null,
  error: null,
  wallSec: null,
  passed: false,
};

let srv = null;
let browser = null;
let page = null;

async function captureShot(name) {
  if (!cfg.shots || !page) return;
  try {
    const { data } = await page.send(
      'Page.captureScreenshot',
      { format: 'jpeg', quality: 75 },
      30000
    );
    const file = path.join(cfg.out, `${name}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    report.screenshot = path.basename(file);
  } catch (e) {
    say('screenshot failed:', e.message);
  }
}

async function main() {
  srv = await startServer({ root: cfg.dist, port: 0, basePath: cfg.basePath });
  say(`serving ${cfg.dist} at ${srv.url}`);

  browser = await launchChrome({
    chrome: cfg.chrome,
    gpu: cfg.gpu,
    width: cfg.width,
    height: cfg.height,
    headless: true,
  });
  page = await connectPage(browser.port);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('HeapProfiler.enable');

  try {
    report.hardware.chrome = (await page.send('Browser.getVersion')).product;
  } catch {}

  page.on('Runtime.exceptionThrown', (e) => {
    const d = e.exceptionDetails;
    const msg = String(d.exception?.description || d.text).slice(0, 2000);
    report.pageErrors.push({ msg, url: d.url, line: d.lineNumber });
    say('PAGE EXCEPTION:', msg.split('\n')[0]);
  });

  page.on('Runtime.consoleAPICalled', (e) => {
    if (e.type !== 'error' && e.type !== 'assert') return;
    const msg = e.args
      .map((a) => a.value ?? a.description ?? '')
      .join(' ')
      .slice(0, 2000);
    report.consoleErrors.push({ msg });
    if (/WebGLProgram|CONTEXT_LOST|WebGL/i.test(msg)) report.webglErrors.push(msg);
    say('CONSOLE ERROR:', msg.split('\n')[0]);
  });

  page.on('Log.entryAdded', ({ entry }) => {
    if (entry.level !== 'error') return;
    if (/favicon\.ico/.test(entry.url || '')) return;
    const rec = { source: entry.source, msg: entry.text, url: entry.url };
    const known = !cfg.strict && KNOWN_NOISE.find((k) => k.re.test(entry.text || ''));
    if (known) {
      report.ignoredErrors.push({ ...rec, why: known.why });
      return;
    }
    if (entry.source === 'network') report.networkErrors.push(rec);
    else report.consoleErrors.push(rec);
    if (/WebGLProgram|CONTEXT_LOST|WebGL/i.test(entry.text || '')) {
      report.webglErrors.push(entry.text);
    }
    say('LOG ERROR:', entry.source, entry.text, entry.url || '');
  });

  // Reuse page-hook.js for deterministic canvas/texture/render snapshots without altering rAF or rendering
  const hookSrc = fs
    .readFileSync(path.join(ROOT, 'tools', 'perf', 'page-hook.js'), 'utf8')
    .replaceAll(
      '__BENCH_CFG__',
      JSON.stringify({
        seed: cfg.seed,
        settings: { quality: cfg.quality, music: 'off' },
      })
    );
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: hookSrc });

  // Stage 1: Boot through loading bar into title screen
  const tNav = Date.now();
  await page.send('Page.navigate', { url: srv.url });
  for (;;) {
    const state = await page.eval(`window.game?.state ?? null`).catch(() => null);
    if (state === 'title') break;
    const loadText = await page
      .eval(`document.getElementById('loadText')?.textContent || ''`)
      .catch(() => '');
    if (/載入失敗/.test(loadText)) {
      throw new Error(`Game failed during loading: ${loadText}`);
    }
    if (Date.now() - tNav > cfg.loadTimeoutMs) {
      throw new Error(
        `Timed out waiting for title screen after ${cfg.loadTimeoutMs / 1000}s (loadText: "${loadText}")`
      );
    }
    await sleep(250);
  }
  report.boot.toTitleMs = Date.now() - tNav;
  say(`title screen reached in ${report.boot.toTitleMs} ms`);

  // Verify title UI, WebGL context, and active render loop
  const titleCheck0 = await page.eval(`(() => {
    const g = window.game;
    const gl = g.renderer?.getContext?.();
    const loadingHidden = document.getElementById('loading')?.classList.contains('hidden');
    const titleVisible = !document.getElementById('title')?.classList.contains('hidden');
    const btn = document.getElementById('btnStart');
    const rect = btn ? btn.getBoundingClientRect() : null;
    return {
      loadingHidden: !!loadingHidden,
      titleVisible: !!titleVisible,
      btnRect: rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, w: rect.width, h: rect.height } : null,
      contextLost: gl ? gl.isContextLost() : true,
      renderer: window.__bench?.gpuRenderer?.() || '',
      titleT: g.titleT || 0,
      calls: g.renderer?.info?.render?.calls ?? 0,
    };
  })()`);
  report.hardware.renderer =
    titleCheck0.renderer || (titleCheck0.contextLost ? '(context lost)' : '?');
  if (titleCheck0.contextLost) throw new Error('WebGL context lost on title screen');
  if (!titleCheck0.loadingHidden || !titleCheck0.titleVisible) {
    throw new Error(
      `Title DOM state invalid (loadingHidden=${titleCheck0.loadingHidden}, titleVisible=${titleCheck0.titleVisible})`
    );
  }
  if (!titleCheck0.btnRect || titleCheck0.btnRect.w <= 0 || titleCheck0.btnRect.h <= 0) {
    throw new Error('#btnStart is missing or has zero size');
  }

  const tTitleLoop = Date.now();
  let titleCheck1 = titleCheck0;
  while (Date.now() - tTitleLoop < 20000) {
    await sleep(250);
    titleCheck1 = await page.eval(`({
      titleT: window.game.titleT || 0,
      calls: window.game.renderer?.info?.render?.calls ?? 0,
    })`);
    if (titleCheck1.titleT > titleCheck0.titleT && titleCheck1.calls > 0) break;
  }
  if (titleCheck1.titleT <= titleCheck0.titleT) {
    throw new Error('Title loop is not advancing (game.titleT stalled)');
  }
  if (titleCheck1.calls <= 0) {
    throw new Error('Renderer reported 0 draw calls on title screen');
  }
  report.checks.titleLoaded = {
    ok: true,
    detail: `${report.boot.toTitleMs} ms (${titleCheck1.calls} calls)`,
  };

  // Stage 2: Click 開始遊戲 and get past the 5s entry splash into play state
  const tStartClick = Date.now();
  const { x, y } = titleCheck0.btnRect;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button: 'left',
      clickCount: type === 'mouseMoved' ? 0 : 1,
    });
  }
  say('clicked #btnStart, waiting for play state...');

  for (;;) {
    const state = await page.eval(`window.game?.state ?? null`).catch(() => null);
    if (state === 'play') break;
    if (Date.now() - tStartClick > cfg.playTimeoutMs) {
      throw new Error(`Timed out waiting for play state after ${cfg.playTimeoutMs / 1000}s`);
    }
    await sleep(250);
  }
  report.boot.toPlayMs = Date.now() - tStartClick;
  say(`entered play state in ${report.boot.toPlayMs} ms`);

  const playCheck = await page.eval(`(() => {
    const g = window.game;
    const gl = g.renderer?.getContext?.();
    return {
      loadingHidden: !!document.getElementById('loading')?.classList.contains('hidden'),
      titleHidden: !!document.getElementById('title')?.classList.contains('hidden'),
      hudVisible: !document.getElementById('hud')?.classList.contains('hidden'),
      inputEnabled: !!g.input?.enabled,
      contextLost: gl ? gl.isContextLost() : true,
    };
  })()`);
  if (playCheck.contextLost) throw new Error('WebGL context lost after entering play');
  if (!playCheck.loadingHidden || !playCheck.titleHidden || !playCheck.hudVisible) {
    throw new Error(`Play DOM state invalid: ${JSON.stringify(playCheck)}`);
  }
  if (!playCheck.inputEnabled) {
    throw new Error('game.input.enabled is false after entering play');
  }
  report.checks.enteredPlay = {
    ok: true,
    detail: `${report.boot.toPlayMs} ms`,
  };

  // Stage 3: Collect deterministic performance metrics (after GC) and take a screenshot
  await page.send('HeapProfiler.collectGarbage');
  await sleep(300);
  await page.send('HeapProfiler.collectGarbage');

  const perfSnap = await page.eval(`(() => {
    const snap = window.__bench.snapshot();
    const canvas = window.__bench.canvasReport();
    const tex = window.__bench.textureReport();
    const res = performance.getEntriesByType('resource');
    return {
      snap,
      canvas,
      tex,
      resourceCount: res.length,
      transferKB: Math.round(
        res.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0) / 1024
      ),
    };
  })()`);

  report.boot.resourceCount = perfSnap.resourceCount;
  report.boot.transferKB = perfSnap.transferKB;
  report.hardware.viewportAndQuality = `${cfg.width}x${cfg.height} · ${perfSnap.snap.quality}`;
  report.perf = {
    quality: perfSnap.snap.quality,
    tier: perfSnap.snap.tier,
    render: perfSnap.snap.render,
    canvasMB: perfSnap.canvas.canvasMB,
    canvasCount: perfSnap.canvas.canvasCount,
    canvasInDom: perfSnap.canvas.canvasInDom,
    textureEstMB: perfSnap.tex.textureEstMB,
    textureCount: perfSnap.tex.textureCount,
    jsHeapMB: perfSnap.snap.jsHeapMB,
    domNodes: perfSnap.snap.domNodes,
  };

  await captureShot('play');
}

function formatSummaryMarkdown() {
  const errCounts = `${report.pageErrors.length} / ${report.consoleErrors.length} / ${report.networkErrors.length} / ${report.webglErrors.length}`;
  const icon = (ok) => (ok ? '✅' : '❌');
  const hw = report.hardware;
  const lines = [
    `### 🎮 Headless Chrome Smoke & Perf Summary`,
    '',
    `**結果**：${report.passed ? '✅ PASS' : '❌ FAIL'} · 掛載路徑 \`${cfg.basePath}\` · 總耗時 \`${report.wallSec} s\``,
    '',
    '| 階段檢核 | 狀態 | 備註 |',
    '| :--- | :---: | :--- |',
    `| 初始讀取條 → 主畫面 (\`title\`) | ${icon(report.checks.titleLoaded.ok)} | ${report.checks.titleLoaded.detail || '-'} |`,
    `| 點擊開始 → 進場讀取 → 進入遊玩 (\`play\`) | ${icon(report.checks.enteredPlay.ok)} | ${report.checks.enteredPlay.detail || '-'} |`,
    `| 執行期錯誤 (Page / Console / Net / WebGL) | ${icon(report.checks.noRuntimeErrors.ok)} | \`${errCounts}\` |`,
    '',
    '#### 運行環境與硬體',
    '',
    '| 項目 | 數值 |',
    '| :--- | :--- |',
    `| 執行來源 | \`${hw.source}\` |`,
    `| 作業系統 (OS) | \`${hw.os}\` |`,
    `| CPU（型號 × 核心數） | \`${hw.cpu}\` |`,
    `| 記憶體 (RAM) | \`${hw.ramGB} GB\` |`,
    `| 瀏覽器版本 | \`${hw.chrome || '?'}\` |`,
    `| WebGL Renderer | \`${hw.renderer || '?'}\` |`,
    `| 視窗與畫質 | \`${hw.viewportAndQuality}\` |`,
  ];

  if (report.perf) {
    const p = report.perf;
    const r = p.render;
    lines.push(
      '',
      '#### 效能指標（進入 `play` 後，GC 後採樣）',
      '',
      '| 指標 | 數值 | 單位 |',
      '| :--- | ---: | :--- |',
      `| Draw Calls | \`${r.calls}\` | calls |`,
      `| Triangles | \`${Math.round(r.triangles / 1000)}\` | k |`,
      `| Geometries / Renderer Textures | \`${r.geometries}\` / \`${r.textures}\` | 個 |`,
      `| Canvas 記憶體（GC 後） | \`${p.canvasMB}\` (${p.canvasCount} 個，DOM 內 ${p.canvasInDom}) | MB |`,
      `| GPU 貼圖估算（含 mip） | \`${p.textureEstMB}\` (${p.textureCount} 張) | MB |`,
      `| JS Heap / DOM Nodes | \`${p.jsHeapMB ?? '-'}\` / \`${p.domNodes}\` | MB / 個 |`,
      `| 載入資源數 / Transfer | \`${report.boot.resourceCount}\` / \`${report.boot.transferKB}\` | 個 / KB |`,
      `| 啟動至主畫面 (\`title\`) *(參考)* | \`${report.boot.toTitleMs ?? '-'}\` | ms |`,
      `| 點擊開始至進入遊玩 (\`play\`) *(參考)* | \`${report.boot.toPlayMs ?? '-'}\` | ms |`,
      '',
      '> 註：效能基線以 GitHub Actions `Verify` (`ubuntu-24.04` + SwiftShader) 為優先依據；上表確定性指標目前僅供記錄（不設上限門檻），啟動耗時受軟體渲染與雲端負載影響僅供參考。'
    );
  }

  if (report.error) {
    lines.push('', `**錯誤訊息**：\`${report.error.split('\n')[0]}\``);
  }
  return `${lines.join('\n')}\n`;
}

try {
  await main();
} catch (e) {
  report.error = String((e && e.stack) || e);
  say('SMOKE FAILED:', e.message || e);
  await captureShot('failure');
} finally {
  if (page) page.close();
  if (browser) await browser.kill();
  if (srv) await srv.close();
}

const totalErrors =
  report.pageErrors.length +
  report.consoleErrors.length +
  report.networkErrors.length +
  report.webglErrors.length;
report.checks.noRuntimeErrors = {
  ok: totalErrors === 0,
  detail:
    totalErrors === 0
      ? '無錯誤'
      : `page:${report.pageErrors.length}, console:${report.consoleErrors.length}, net:${report.networkErrors.length}, webgl:${report.webglErrors.length}`,
};
report.passed =
  !report.error &&
  report.checks.titleLoaded.ok &&
  report.checks.enteredPlay.ok &&
  report.checks.noRuntimeErrors.ok;
report.wallSec = +((Date.now() - t0) / 1000).toFixed(1);

const reportPath = path.join(cfg.out, 'smoke-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const md = formatSummaryMarkdown();
console.log(`\n${md}`);
console.log(`report: ${reportPath}`);

if (cfg.summary) {
  fs.appendFileSync(cfg.summary, md);
}

process.exit(report.passed ? 0 : 1);
