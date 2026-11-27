#!/usr/bin/env node
// Headless scene & memory profiler. Fully unattended (spawns Chrome or Playwright WebKit, serves dist/,
// measures, exits non-zero on a failed gate).
//
//   node tools/profile_scene.mjs [--engine=chrome|webkit] [--gpu|--swiftshader] [--mobile]
//     [--runs=3] [--spots=鐘塔,張靜愚紀念圖書館] [--warmup-sec=2] [--sample-sec=4] [--seed=1337]
//     [--vsync] [--no-play] [--markdown] [--out=tools/.cache/profile.json] [--compare=tools/.cache/profile.json]
//     [--assert-ios-budget] [--max-canvas-mb=16] [--max-peak-canvas-mb=220] [--if-available] [--chrome=path] [--dist=dist]
//
// What is measured (see docs/guide/architecture.md): deterministic numbers (canvas / texture / heap memory, draw
// calls, triangles) are the gate; frame times are reported as a distribution (p50/p95/p99/stalls) with
// vsync released, taken at fixed camera spots with Math.random seeded and auto-quality frozen, repeated
// --runs times and reduced to medians. Software rendering (SwiftShader) marks frame times unreliable.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer } from './e2e/serve.mjs';
import { defaultChromePath } from './e2e/cdp.mjs';
import { launchChromeDriver, launchWebKitDriver } from './perf/drivers.mjs';
import {
  aggregateRuns,
  budgetViolations,
  compareReports,
  envMismatch,
  cpuStats,
  formatComparison,
  formatMarkdown,
  frameStats,
} from './perf/metrics.mjs';

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
const num = (name, fb) => {
  const v = Number.parseFloat(argVal(name, ''));
  return Number.isFinite(v) ? v : fb;
};

const engine = argVal('engine', 'chrome');
const distDir = path.resolve(ROOT, argVal('dist', 'dist'));
const query = argVal('query', '?perf');
const gpuMode = hasFlag('gpu') || engine === 'webkit' ? 'gpu' : 'swiftshader';
const mobile = hasFlag('mobile');
const width = num('width', mobile ? 430 : 1280);
const height = num('height', mobile ? 932 : 720);
const runs = Math.max(1, Math.floor(num('runs', 3)));
const warmupMs = num('warmup-sec', 2) * 1000;
const sampleMs = num('sample-sec', 4) * 1000;
const seed = Math.floor(num('seed', 1337));
const uncap = !hasFlag('vsync');
const doPlay = !hasFlag('no-play');
const markdown = hasFlag('markdown');
const outFile = argVal('out', '');
const compareFile = argVal('compare', '');
const assertBudget = hasFlag('assert-ios-budget');
const maxCanvasMB = num('max-canvas-mb', 16);
const maxPeakCanvasMB = num('max-peak-canvas-mb', 220);
const ifAvailable = hasFlag('if-available');
const chromePath = argVal('chrome', defaultChromePath());

// fixed camera spots: the player is dropped 25 m south of each named building and the camera follows
const DEFAULT_SPOTS = [
  '鐘塔',
  '張靜愚紀念圖書館',
  '學生活動中心',
  '中原大學體育館',
  '真知教學大樓',
];
const spotNames = argVal('spots', '')
  ? argVal('spots', '').split(',').filter(Boolean)
  : DEFAULT_SPOTS;

if (!fs.existsSync(distDir)) {
  console.error(`profile_scene: dist directory not found (${distDir}); run npm run build first.`);
  process.exit(1);
}
if (engine === 'chrome' && path.isAbsolute(chromePath) && !fs.existsSync(chromePath)) {
  if (ifAvailable) {
    console.log(`profile_scene: Chrome binary not found at ${chromePath}; skipping.`);
    process.exit(0);
  }
  console.error(`profile_scene: Chrome binary not found at ${chromePath}.`);
  process.exit(1);
}

const hookSource = fs.readFileSync(path.join(HERE, 'perf', 'page-hook.js'), 'utf8').replaceAll(
  '__BENCH_CFG__',
  JSON.stringify({
    seed,
    // fixed quality when asked; otherwise the tier/GPU-guess default is kept (and recorded in meta)
    settings: argVal('quality', '') ? { quality: argVal('quality', '') } : null,
  })
);

function gitInfo() {
  try {
    const run = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
    return {
      commit: run('rev-parse', '--short', 'HEAD'),
      branch: run('rev-parse', '--abbrev-ref', 'HEAD'),
    };
  } catch (_e) {
    return { commit: null, branch: null };
  }
}

async function singleRun(srvUrl, runIndex) {
  const driver =
    engine === 'webkit'
      ? await launchWebKitDriver({ mobile, width, height })
      : await launchChromeDriver({
          chrome: chromePath,
          gpu: gpuMode,
          mobile,
          width,
          height,
          uncap,
        });
  try {
    await driver.addInitScript(hookSource);
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    const tNav = Date.now();
    await driver.navigate(`${srvUrl}${q}`);
    const waitUntil = async (expr, timeoutMs = 180000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        let ok = false;
        try {
          ok = await driver.eval(expr);
        } catch (_e) {} // page still navigating
        if (ok) return;
        await sleep(250);
      }
      throw new Error(`Timed out waiting for: ${expr}`);
    };
    await waitUntil(`window.game?.state === 'title'`);
    const toTitleMs = Date.now() - tNav;
    await driver.eval(`window.__bench.installTimers(); window.__bench.freezeQuality(); true`);
    await sleep(800);

    const boot = await driver.eval(`(() => {
      const res = performance.getEntriesByType('resource');
      return {
        bootDiagMs: window.game.bootDiag?.getState?.()?.current?.elapsedMs ?? null,
        resourceCount: res.length,
        transferKB: Math.round(res.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0) / 1024),
      };
    })()`);
    boot.toTitleMs = toTitleMs;

    const measureSpot = async (name) => {
      await sleep(warmupMs);
      const s = await driver.eval(`window.__bench.sampleFrames(${sampleMs})`);
      const snap = await driver.eval('window.__bench.snapshot()');
      return {
        name,
        frame: frameStats(s.deltas),
        cpu: {
          renderMean: cpuStats(s.render)?.mean ?? null,
          updateMean: cpuStats(s.update)?.mean ?? null,
        },
        render: snap.render,
        _snap: snap,
      };
    };

    const spots = [await measureSpot('title-orbit')];
    if (doPlay) {
      await driver.eval(`document.getElementById('btnStart')?.click(); true`);
      await waitUntil(`window.game?.state === 'play'`);
      for (const name of spotNames) {
        const placed = await driver.eval(`(() => {
          const g = window.game;
          const n = g.world.named[${JSON.stringify(name)}];
          if (!n) return false;
          g.clock = 12 * 60;
          g.player.place(n.x, n.z + 25, Math.PI);
          return true;
        })()`);
        if (!placed) {
          console.error(`profile_scene: spot "${name}" not found, skipped`);
          continue;
        }
        spots.push(await measureSpot(name));
      }
    }

    await driver.gc();
    const canvas = await driver.eval('window.__bench.canvasReport()');
    const tex = await driver.eval('window.__bench.textureReport()');
    const last = spots[spots.length - 1]._snap;
    const memory = {
      canvasMB: canvas.canvasMB,
      peakCanvasMB: canvas.peakCanvasMB,
      canvasCount: canvas.canvasCount,
      canvasInDom: canvas.canvasInDom,
      topCanvasSizes: canvas.topCanvasSizes,
      textureEstMB: tex.textureEstMB,
      textureCount: tex.textureCount,
      jsHeapMB: last.jsHeapMB,
      domNodes: last.domNodes,
    };
    const info = {
      tier: last.tier,
      quality: last.quality,
      safeMode: last.safeMode,
      renderer: await driver.eval('window.__bench.gpuRenderer()'),
      browser: await driver.version(),
    };
    for (const s of spots) delete s._snap;
    console.error(`profile_scene: run ${runIndex + 1}/${runs} done (boot ${toTitleMs} ms)`);
    return { boot, memory, spots, info };
  } finally {
    await driver.close();
  }
}

const srv = await startServer({ root: distDir, port: 0 });
try {
  const results = [];
  for (let i = 0; i < runs; i++) results.push(await singleRun(srv.url, i));
  const info = results[0].info;
  const software = engine === 'chrome' && gpuMode === 'swiftshader';
  const report = aggregateRuns(results, {
    engine,
    mobile,
    browser: info.browser,
    renderer: info.renderer,
    tier: info.tier,
    quality: info.quality,
    safeMode: info.safeMode,
    viewport: `${width}x${height}${mobile ? '@3x' : ''}`,
    uncapped: engine === 'chrome' ? uncap : false,
    frameTimeReliable: !software,
    env: {
      os: `${os.type()} ${os.release()} (${os.platform()}/${os.arch()})`,
      cpu: os.cpus()[0]?.model || null,
      cores: os.cpus().length,
      ramGB: Math.round(os.totalmem() / 2 ** 30),
      node: process.version,
    },
    seed,
    sampleSec: sampleMs / 1000,
    date: new Date().toISOString(),
    ...gitInfo(),
  });

  console.log(markdown ? formatMarkdown(report) : JSON.stringify(report, null, 2));

  if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
    console.error(`profile_scene: wrote ${outFile}`);
  }
  if (compareFile) {
    const baseline = JSON.parse(fs.readFileSync(compareFile, 'utf8'));
    const cmp = compareReports(report, baseline);
    const diff = envMismatch(report, baseline);
    if (diff.length) {
      console.error(
        `\n⚠ 環境與基線不同（數值不可直接比較，請改用同環境的基線）：\n${diff.map((d) => `- ${d.key}: ${d.baseline} → ${d.current}`).join('\n')}`
      );
    }
    console.error(`\n與 ${compareFile} 比較：\n${formatComparison(cmp)}`);
    if (!cmp.ok) process.exitCode = 1;
  }
  if (assertBudget) {
    const v = budgetViolations(report, { maxCanvasMB, maxPeakCanvasMB });
    if (v.length) {
      console.error(`iOS memory budget exceeded: ${v.join('; ')}`);
      process.exitCode = 1;
    }
  }
} catch (err) {
  if (
    ifAvailable &&
    /spawn|Chrome exited|not found|unavailable|not installed/i.test(String(err?.message || err))
  ) {
    console.log(`profile_scene: browser unavailable (${err.message}); skipping.`);
    process.exitCode = 0;
  } else {
    console.error(err);
    process.exitCode = 1;
  }
} finally {
  await srv.close();
}
