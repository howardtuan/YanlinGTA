#!/usr/bin/env node
// Cross-platform (Mac M-series Metal & Linux NVIDIA/AMD/Intel GPU) automated runner for the
// in-game 99-second Benchmark (src/systems/Benchmark.js), defaulting to iPhone simulation
// (430x932@3x, tier=mobile-lite). Outputs bench-report.json, ready-to-attach PR Markdown
// (pr-perf-section.md + <!-- yanlin-perf:v1 -->), and updates tools/.cache/perf-history.jsonl.
//
//   node tools/run_bench.mjs [--desktop] [--quality=low] [--engine=chrome|webkit]
//     [--vsync] [--swiftshader] [--no-build|--build] [--pr=<number>] [--no-record]
//     [--out=tools/e2e/out/bench] [--seed=1337] [--timeout=420]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './e2e/serve.mjs';
import { launchChrome, launchHardwareChrome, connectPage, defaultChromePath } from './e2e/cdp.mjs';
import { launchWebKitDriver } from './perf/drivers.mjs';
import {
  buildCompactRecord,
  formatPrPerfSection,
  injectPerfSectionIntoPrBody,
  parseJsonl,
  serializeJsonl,
  upsertRecords,
} from './perf/history_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const arg = (k, d = '') => {
  const hit = argv.find((s) => s.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};

if (flag('help') || flag('h')) {
  console.log(`node tools/run_bench.mjs [options]
  (default)             iPhone simulation (430x932 @3x, touch, tier=mobile-lite) on hardware GPU
  --desktop             switch to desktop viewport (1280x720 @1x)
  --quality=low         benchmark quality: ultra | low | medium | high (default: low)
  --engine=chrome|webkit browser engine (default: chrome; webkit uses Playwright WebKit on Mac)
  --vsync               keep display vsync cap (default: uncapped in Chrome to measure true headroom)
  --swiftshader         allow CPU software WebGL (only for debugging; FPS is not representative)
  --build | --no-build  force or skip npm run build (default: build if dist/index.html is missing)
  --pr=<number>         automatically attach the result section into GitHub PR #<number> via gh
  --repo=<owner/name>   GitHub repo for --pr (default: howardtuan/YanlinGTA)
  --no-record           do not save record into tools/.cache/perf-history.jsonl
  --out=<dir>           output directory (default: tools/e2e/out/bench)
  --seed=1337           seed for Math.random
  --timeout=420         max seconds to wait for benchmark completion (default: 420)`);
  process.exit(0);
}

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1';

const desktop = flag('desktop');
const mobile = !desktop;
const engine = arg('engine', 'chrome');
const useSwiftShader = flag('swiftshader');
const uncap = engine === 'chrome' && !flag('vsync') && !useSwiftShader;
const width = +arg('width', mobile ? 430 : 1280);
const height = +arg('height', mobile ? 932 : 720);
const dpr = mobile ? 3 : 1;
const quality = arg('quality', mobile ? 'low' : 'medium');
const seed = +arg('seed', 1337);
const timeoutMs = +arg('timeout', 420) * 1000;
const distDir = path.resolve(ROOT, arg('dist', 'dist'));
const outDir = path.resolve(ROOT, arg('out', path.join('tools', 'e2e', 'out', 'bench')));
const dbPath = path.resolve(ROOT, 'tools', '.cache', 'perf-history.jsonl');
const prNum = arg('pr', '') ? +arg('pr', '') : null;
const repo = arg('repo', 'howardtuan/YanlinGTA');
const chromePath = arg('chrome', defaultChromePath());

const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

const t0 = Date.now();
const say = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s]`, ...a);

function gitMeta() {
  const run = (...a) => {
    try {
      return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  };
  return {
    commit: run('rev-parse', '--short', 'HEAD'),
    branch: run('rev-parse', '--abbrev-ref', 'HEAD'),
    subject: run('log', '-1', '--pretty=%s'),
  };
}

if (flag('build') || (!flag('no-build') && !fs.existsSync(path.join(distDir, 'index.html')))) {
  say('building production bundle (npm run build)...');
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
}
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(
    `run_bench: ${path.join(distDir, 'index.html')} not found (run npm run build first)`
  );
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const hookSrc = fs.readFileSync(path.join(HERE, 'perf', 'page-hook.js'), 'utf8').replaceAll(
  '__BENCH_CFG__',
  JSON.stringify({
    seed,
    settings: { quality, music: 'off' },
  })
);

async function openRunner() {
  if (engine === 'webkit') {
    const drv = await launchWebKitDriver({ mobile, width, height });
    await drv.addInitScript(hookSrc);
    return {
      kind: 'webkit',
      navigate: (url) => drv.navigate(url),
      eval: (expr) => drv.eval(expr),
      gc: () => drv.gc(),
      screenshot: async () => null,
      browserVersion: () => drv.version(),
      isSoftware: false,
      gpuAttempts: [],
      close: () => drv.close(),
    };
  }

  const extraArgs = uncap ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [];
  let browser = null;
  let page = null;
  let isSoftware = false;
  let gpuAttempts = [];

  if (useSwiftShader) {
    browser = await launchChrome({
      chrome: chromePath,
      gpu: 'swiftshader',
      width,
      height,
      extraArgs,
    });
    page = await connectPage(browser.port);
    isSoftware = true;
  } else {
    const hw = await launchHardwareChrome({ chrome: chromePath, width, height, extraArgs });
    browser = hw.browser;
    page = hw.page;
    isSoftware = hw.isSoftware;
    gpuAttempts = hw.attempts;
    if (isSoftware) {
      say(
        'WARNING: Chrome fell back to software WebGL renderer! Run outside sandbox or check GPU drivers.'
      );
    }
  }

  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('HeapProfiler.enable');

  if (mobile) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: dpr,
      mobile: true,
    });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.send('Emulation.setEmitTouchEventsForMouse', {
      enabled: true,
      configuration: 'mobile',
    });
    await page.send('Emulation.setUserAgentOverride', { userAgent: IPHONE_UA });
  }

  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: hookSrc });

  return {
    kind: 'chrome',
    page,
    navigate: (url) => page.send('Page.navigate', { url }),
    eval: (expr) => page.eval(expr),
    async gc() {
      await page.send('HeapProfiler.collectGarbage');
      await sleep(350);
      await page.send('HeapProfiler.collectGarbage');
      await sleep(150);
    },
    async screenshot(file) {
      try {
        const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
        fs.writeFileSync(file, Buffer.from(data, 'base64'));
        return path.basename(file);
      } catch {
        return null;
      }
    },
    async browserVersion() {
      try {
        return (await page.send('Browser.getVersion')).product;
      } catch {
        return 'Chrome';
      }
    },
    isSoftware,
    gpuAttempts,
    async close() {
      page.close();
      await browser.kill();
    },
  };
}

const srv = await startServer({ root: distDir, port: 0, basePath: '/YanlinGTA/' });
let runner = null;

try {
  say(
    `starting ${mobile ? `iPhone simulation (${width}x${height}@${dpr}x)` : `desktop (${width}x${height})`} on ${engine}...`
  );
  runner = await openRunner();
  const pageErrors = [];
  if (runner.page) {
    runner.page.on('Runtime.exceptionThrown', (e) => {
      const d = e.exceptionDetails;
      pageErrors.push(String(d.exception?.description || d.text).slice(0, 1000));
    });
  }

  const query = mobile ? '?tier=mobile-lite' : '';
  const tNav = Date.now();
  await runner.navigate(`${srv.url}${query}`);

  for (;;) {
    let state = null;
    try {
      state = await runner.eval('window.game?.state ?? null');
    } catch {}
    if (state === 'title') break;
    const loadTxt = await runner
      .eval(`document.getElementById('loadText')?.textContent || ''`)
      .catch(() => '');
    if (/載入失敗/.test(loadTxt)) throw new Error(`Game failed during loading: ${loadTxt}`);
    if (Date.now() - tNav > 180000) {
      throw new Error(`Timed out waiting for title screen (loadText="${loadTxt}")`);
    }
    await sleep(250);
  }
  const toTitleMs = Date.now() - tNav;
  const rendererStr = await runner.eval('window.__bench.gpuRenderer()');
  const browserVer = await runner.browserVersion();
  say(`title reached in ${toTitleMs} ms | GPU: ${rendererStr || 'unknown'}`);

  const bootInfo = await runner.eval(`(() => {
    const res = performance.getEntriesByType('resource');
    return {
      tier: window.game.perfProfile?.tier || null,
      bootDiagMs: window.game.bootDiag?.getState?.()?.current?.elapsedMs ?? null,
      resourceCount: res.length,
      transferKB: Math.round(res.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0) / 1024),
    };
  })()`);

  // Start the real in-game 99s Benchmark (day -> air -> night)
  const started = await runner.eval(`(() => {
    window.__benchDoneResult = null;
    window.addEventListener('benchdone', (e) => {
      window.__benchDoneResult = e.detail;
    }, { once: true });
    return window.game.bench.start(${JSON.stringify(quality)}, { headless: true });
  })()`);
  if (!started) throw new Error('window.game.bench.start() returned false');
  say(`running in-game 99s Benchmark (quality=${quality}, tier=${bootInfo.tier})...`);

  const tBench = Date.now();
  let lastSegTxt = '';
  for (;;) {
    const status = await runner.eval(`({
      done: Boolean(window.__benchDoneResult),
      running: Boolean(window.game.bench?.running),
      segTxt: document.getElementById('benchSeg')?.textContent || '',
    })`);
    if (status.segTxt && status.segTxt !== lastSegTxt) {
      lastSegTxt = status.segTxt;
      say(status.segTxt);
    }
    if (status.done) break;
    if (!status.running && !status.done) {
      throw new Error('Benchmark stopped unexpectedly before emitting benchdone');
    }
    if (Date.now() - tBench > timeoutMs) {
      throw new Error(`Benchmark timed out after ${timeoutMs / 1000}s`);
    }
    await sleep(1500);
  }

  const benchResult = await runner.eval(`(() => {
    const r = window.game.bench.result;
    if (!r) return null;
    const { frames: _frames, ...summary } = r;
    return summary;
  })()`);
  if (!benchResult?.overall) {
    throw new Error('Benchmark completed without valid overall frame data');
  }

  const shotName = await runner.screenshot(path.join(outDir, 'bench-result.jpg'));

  // Force GC and collect post-benchmark iPhone memory & GPU resource footprint
  await runner.gc();
  const postSnap = await runner.eval(`(() => {
    const snap = window.__bench.snapshot();
    const canvas = window.__bench.canvasReport();
    const tex = window.__bench.textureReport();
    const programs = window.game.renderer?.info?.programs?.length ?? null;
    return { snap, canvas, tex, programs };
  })()`);

  if (pageErrors.length) {
    throw new Error(`Runtime page exceptions during benchmark:\n${pageErrors.join('\n')}`);
  }

  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model?.trim() || 'unknown';
  const git = gitMeta();

  const report = {
    tool: 'YanlinGTA run_bench',
    startedAt: new Date().toISOString(),
    wallSec: Number(((Date.now() - t0) / 1000).toFixed(1)),
    git: {
      commit: git.commit,
      branch: git.branch,
      pr: prNum,
    },
    config: {
      engine,
      mobile,
      profile: mobile
        ? `iphone (${width}x${height}@${dpr}x)`
        : `desktop (${width}x${height}@${dpr}x)`,
      viewport: `${width}x${height}@${dpr}x`,
      quality,
      uncapped: uncap,
      seed,
    },
    hardware: {
      os: `${os.type()} ${os.release()} (${os.platform()}/${os.arch()})`,
      cpu: `${cpuModel} × ${cpus.length}`,
      ramGB: Math.round(os.totalmem() / 2 ** 30),
      node: process.version,
      browser: browserVer,
      renderer: rendererStr || benchResult.gpu || '未知',
      softwareRenderer: runner.isSoftware,
      gpuAttempts: runner.gpuAttempts,
    },
    boot: {
      toTitleMs,
      bootDiagMs: bootInfo.bootDiagMs,
      resourceCount: bootInfo.resourceCount,
      transferKB: bootInfo.transferKB,
    },
    perf: {
      tier: bootInfo.tier,
      quality: benchResult.quality,
      safeMode: postSnap.snap.safeMode,
      canvasMB: postSnap.canvas.canvasMB,
      canvasCount: postSnap.canvas.canvasCount,
      canvasInDom: postSnap.canvas.canvasInDom,
      topCanvasSizes: postSnap.canvas.topCanvasSizes,
      textureEstMB: postSnap.tex.textureEstMB,
      textureCount: postSnap.tex.textureCount,
      geometries: postSnap.snap.render.geometries,
      rendererTextures: postSnap.snap.render.textures,
      programs: postSnap.programs,
      jsHeapMB: postSnap.snap.jsHeapMB,
      domNodes: postSnap.snap.domNodes,
    },
    bench: benchResult,
    screenshot: shotName,
  };

  const compact = buildCompactRecord(report, {
    pr: prNum,
    title: git.subject,
  });
  const prSectionMd = formatPrPerfSection(compact);

  const reportFile = path.join(outDir, 'bench-report.json');
  const mdFile = path.join(outDir, 'pr-perf-section.md');
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdFile, `${prSectionMd}\n`);

  if (!flag('no-record')) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const existing = fs.existsSync(dbPath) ? parseJsonl(fs.readFileSync(dbPath, 'utf8')) : [];
    const merged = upsertRecords(existing, [compact]);
    fs.writeFileSync(dbPath, serializeJsonl(merged));
    say(`saved record to ${path.relative(ROOT, dbPath)} (total ${merged.length} entries)`);
  }

  console.log(`\n${prSectionMd}\n`);
  say(`wrote ${path.relative(ROOT, reportFile)} and ${path.relative(ROOT, mdFile)}`);

  if (prNum != null && Number.isFinite(prNum)) {
    say(`attaching performance section to PR #${prNum} (${repo})...`);
    const curBody = execFileSync(
      'gh',
      ['pr', 'view', String(prNum), '--repo', repo, '--json', 'body', '--jq', '.body'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    const nextBody = injectPerfSectionIntoPrBody(curBody, prSectionMd);
    const tmpBody = path.join(outDir, `pr-${prNum}-body.md`);
    fs.writeFileSync(tmpBody, nextBody);
    execFileSync('gh', ['pr', 'edit', String(prNum), '--repo', repo, '--body-file', tmpBody], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    fs.rmSync(tmpBody, { force: true });
    say(`updated PR #${prNum} description.`);
  }
} finally {
  if (runner) await runner.close();
  await srv.close();
}
