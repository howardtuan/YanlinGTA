#!/usr/bin/env node
// End-to-end story bot for YanlinGTA: serves a checkout, launches Chrome over the DevTools
// Protocol, presses 開始遊戲 and plays story mode to the ending through the game's Input object.
// Zero npm dependencies (Node >= 22). See tools/e2e/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { startServer } from './serve.mjs';
import { launchChrome, connectPage, defaultChromePath } from './cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const arg = (k, d) => {
  const a = argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
if (flag('help') || flag('h')) {
  console.log(`node tools/e2e/story-bot.mjs [options]
  --root=<dir>            repo checkout to test (default: this repo); a Vite checkout is built first and its dist/ is served
  --no-build              serve the existing dist/ as it is (skip npm run build)
  --chrome=<path>         Chrome binary (default: env CHROME or the standard install path)
  --gpu | --swiftshader   renderer (default: macOS swiftshader, Windows gpu)
  --width=960 --height=540
  --fixed-dt=0.0333       virtual clock: every game frame advances exactly this many seconds (0 = real time)
  --steps-per-frame=N     game frames per real animation frame with --fixed-dt (default swiftshader 4, gpu 1)
  --render-every=N        draw every Nth game frame; 0 = only for screenshots (default swiftshader 0, gpu 1)
  --quality=low|medium|high|auto   game quality setting (default swiftshader low, gpu auto)
  --seed=1                seed for Math.random (0 = unseeded)
  --timeout=60            wall-clock limit in minutes
  --stall=30              game seconds without progress before the teleport fallback
  --route=auto|roads|offroad  roads: road graph only; offroad: shortcuts across open ground;
                          auto (default): off-road shortcuts only while a mission timer runs
  --out=<dir>             output dir (default tools/e2e/out)
  --headful               show the browser window
  --no-shots              skip screenshots
  --strict                also count known harmless Chrome log errors (see KNOWN_NOISE)
  --debug                 print controller state every poll
  --cdp=<port>            use a Chrome that is already running with remote debugging on 127.0.0.1:<port>
                          (e.g. a tunnelled remote Chrome) instead of launching one; it is not killed
  --serve-host=<host>     serve on 0.0.0.0 and give Chrome http://<host>:<port>/ (for a Chrome on another machine)`);
  process.exit(0);
}

const isWin = process.platform === 'win32';
// renderer attempts: GPU is retried once and (unless --gpu was forced) falls back to SwiftShader when
// WebGL is unavailable / lost / silently software (Chrome started from SSH runs in a non-interactive session)
const CDP_PORT = +arg('cdp', 0);
const MODES = CDP_PORT
  ? [flag('gpu') ? 'gpu' : 'swiftshader'] // an attached Chrome has its renderer already; the mode only picks the defaults
  : flag('swiftshader')
    ? ['swiftshader']
    : flag('gpu')
      ? ['gpu', 'gpu']
      : isWin
        ? ['gpu', 'gpu', 'swiftshader']
        : ['swiftshader'];
let gpu = MODES[0];
const modeCfg = (m) => ({
  stepsPerFrame: +arg('steps-per-frame', m === 'swiftshader' ? 4 : 1),
  renderEvery: +arg('render-every', m === 'swiftshader' ? 0 : 1),
  quality: arg('quality', m === 'swiftshader' ? 'low' : 'auto'),
});
const cfg = {
  root: path.resolve(arg('root', path.join(here, '..', '..'))),
  chrome: arg('chrome', defaultChromePath()),
  width: +arg('width', 960),
  height: +arg('height', 540),
  fixedDt: +arg('fixed-dt', 1 / 30),
  ...modeCfg(MODES[0]),
  seed: +arg('seed', 1),
  timeoutMin: +arg('timeout', 60),
  stall: +arg('stall', 30),
  route: arg('route', 'auto'),
  out: path.resolve(arg('out', path.join(here, 'out'))),
  headful: flag('headful'),
  shots: !flag('no-shots'),
  debug: flag('debug'),
  strict: flag('strict'),
};
// Chrome-generated log errors that are expected probes, not failures (use --strict to count them)
const KNOWN_NOISE = [
  {
    re: /Unsupported LanguageModel API languages/,
    why: 'src/ui/phone/Nano.js probes Gemini Nano with languages:["zh"] first and falls back to "en" on purpose; Chrome logs the rejected probe as an error',
  },
];
const STORY = [
  '序章 · 投票前一天（走到系館）',
  '任務一 · 傳單大作戰（5 個公布欄 + 回報）',
  '任務二 · 食字路口（夜市十字路口網狀線來回）',
  '任務三 · 掃街拉票（15 張傳單票）',
  '任務四 · 布條保衛戰（6 站依序）',
  '任務五 · 布條失竊案（舊家電腦 SQL 破案）',
  '任務六 · 宿舍拉票（力行 276～281 門口）',
  '終章 · 政見發表會',
  '結局',
];

const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });
const t0 = Date.now();
const stamp = () => `[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s]`;
const say = (...a) => console.log(stamp(), ...a);

fs.mkdirSync(cfg.out, { recursive: true });
for (const f of fs.readdirSync(cfg.out))
  if (/^step-.*\.(jpg|png)$/.test(f) || f === 'report.json') fs.rmSync(path.join(cfg.out, f));

const report = {
  tool: 'YanlinGTA story-bot',
  startedAt: new Date().toISOString(),
  platform: `${process.platform} ${process.arch}`,
  node: process.version,
  root: cfg.root,
  git: gitInfo(cfg.root),
  config: { ...cfg, out: undefined, root: undefined },
  chrome: null,
  renderer: null,
  loadSec: null,
  webglContextLost: false,
  steps: [],
  ignoredErrors: [],
  ending: false,
  endingVotes: null,
  playTimeSec: null,
  fallbacks: 0,
  pageErrors: [],
  consoleErrors: [],
  networkErrors: [],
  botErrors: [],
  events: [],
  verdict: null,
  exitCode: 1,
};
function gitInfo(root) {
  try {
    let gd = path.join(root, '.git');
    if (fs.statSync(gd).isFile())
      gd = path.resolve(
        root,
        fs
          .readFileSync(gd, 'utf8')
          .trim()
          .replace(/^gitdir:\s*/, '')
      );
    const head = fs.readFileSync(path.join(gd, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) return { head };
    const ref = head.slice(5);
    const tryRead = (p) => {
      try {
        return fs.readFileSync(p, 'utf8').trim();
      } catch {
        return null;
      }
    };
    let sha = tryRead(path.join(gd, ref));
    const common = tryRead(path.join(gd, 'commondir'));
    const cd = common ? path.resolve(gd, common) : gd;
    if (!sha) sha = tryRead(path.join(cd, ref));
    if (!sha) {
      const packed = tryRead(path.join(cd, 'packed-refs')) || '';
      const m = packed.split('\n').find((l) => l.endsWith(` ${ref}`));
      sha = m ? m.split(' ')[0] : null;
    }
    return { branch: ref.replace('refs/heads/', ''), sha };
  } catch {
    return null;
  }
}

let srv,
  chrome,
  page,
  curIdx = -1,
  finished = false;
// Since the Vite refactor the sources no longer run unbundled in a browser (bare 'three' imports, .wasm
// imports), so a checkout with a vite.config.js is built and its dist/ is served. Older checkouts (plain
// ES modules + import map) are still served as they are.
function webRoot() {
  if (!fs.existsSync(path.join(cfg.root, 'vite.config.js'))) return cfg.root;
  const dist = path.join(cfg.root, 'dist');
  if (!flag('no-build')) {
    if (!fs.existsSync(path.join(cfg.root, 'node_modules')))
      throw new Error(
        `${cfg.root} has no node_modules: run npm ci there first (or build it yourself and pass --no-build)`
      );
    say(`building ${cfg.root} (npm run build)`);
    execSync('npm run build', { cwd: cfg.root, stdio: ['ignore', 'ignore', 'inherit'] });
  }
  if (!fs.existsSync(path.join(dist, 'index.html')))
    throw new Error(`${dist}/index.html not found: run npm run build in ${cfg.root}`);
  return dist;
}
async function main() {
  const web = webRoot();
  const serveHost = arg('serve-host', '');
  srv = await startServer({ root: web, port: 0, host: serveHost ? '0.0.0.0' : '127.0.0.1' });
  if (serveHost) srv.url = srv.url.replace('//0.0.0.0:', `//${serveHost}:`);
  say(`serving ${web} at ${srv.url}`);
  report.gpuAttempts = [];
  for (let ai = 0; ai < MODES.length; ai++) {
    gpu = MODES[ai];
    Object.assign(cfg, modeCfg(gpu));
    const ok = await openGame();
    if (ok === true) break;
    if (ai === MODES.length - 1)
      say('!! no usable WebGL renderer in any mode; continuing anyway (nothing will be drawn)');
    else {
      say(`!! ${ok} -> ${MODES[ai + 1] === gpu ? 'retrying' : `falling back to ${MODES[ai + 1]}`}`);
      await closeBrowser();
    }
    if (ai === MODES.length - 1) break;
  }
  report.mode = gpu;
  report.config = { ...cfg, out: undefined, root: undefined };
  const inst = await page.eval(
    `__storyBot.install(${JSON.stringify({ fallbackStallSec: cfg.stall, shots: cfg.shots, route: cfg.route })})`
  );
  say(`bot installed (graph ${inst.nodes} nodes / ${inst.edges} edges)`);
  // press 開始遊戲 with a real mouse click
  const r = await page.eval(
    `(() => { const b = document.getElementById('btnStart').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`
  );
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
    await page.send('Input.dispatchMouseEvent', {
      type,
      x: r.x,
      y: r.y,
      button: 'left',
      clickCount: type === 'mouseMoved' ? 0 : 1,
    });
  say('clicked 開始遊戲');

  // the page pushes its state through the Runtime binding (a busy page can starve Runtime.evaluate)
  let lastPlay = -1,
    lastPlayReal = Date.now(),
    lastLog = 0,
    lastMsg = Date.now(),
    done = false;
  const deadline = t0 + cfg.timeoutMin * 60e3;
  const shotsWanted = [];
  for (;;) {
    await sleep(250);
    let batch = inbox.splice(0);
    if (!batch.length && Date.now() - lastMsg > 20000) {
      try {
        batch = [await page.eval('__storyBot.poll()', { timeoutMs: 60000 })];
      } catch (e) {
        say('poll failed', e.message);
      }
    }
    for (const res of batch) {
      lastMsg = Date.now();
      const st = res.status;
      lastSteps = res.steps;
      lastStatus = st;
      for (const e of res.events) {
        report.events.push(e);
        if (e.type === 'step-begin') {
          curIdx = e.idx;
          say(`== step ${e.idx}: ${STORY[e.idx] || ''} (game t=${e.t}s)`);
        } else if (e.type === 'step-end') say(`   step ${e.idx} done in ${e.dur}s game time`);
        else if (e.type === 'rendered') shotsWanted.push(e.idx);
        else if (e.type === 'FALLBACK_TELEPORT')
          say('!! FALLBACK TELEPORT', e.reason, JSON.stringify(e.from), '->', JSON.stringify(e.to));
        else if (e.type === 'bot-error') {
          report.botErrors.push(e.error);
          say('!! BOT ERROR', e.error.split('\n')[0]);
        } else if (e.type === 'bigToast') say(`   [${e.title}] ${e.sub || ''}`);
        else if (e.type === 'mission-fail')
          say(`!! mission ${e.idx} FAILED (attempt ${e.fails}), the game restarts it`);
        else if (e.type === 'timer-start') say(`   timer started: ${e.limit.toFixed(1)}s`);
        else if (e.type === 'timer-stop') say(`   timer stopped with ${e.left.toFixed(1)}s left`);
        else if (e.type === 'leg')
          say(
            `   -> ${e.name} (${e.mode}/${e.route}, path ${e.pathLen} m${e.noPath ? ', NO PATH' : ''})`
          );
        else if (e.type === 'unreachable')
          say(
            `!! objective ${e.name} (${e.x}, ${e.z}) cannot be entered: nearest reachable point ${e.closestDist} m away > radius ${e.radius} m${e.insideCollision ? ', target is inside building collision' : ''}`
          );
        else if (e.type === 'webgl-context-lost') {
          report.webglContextLost = true;
          say(
            `!! WebGL context lost${e.atInstall ? ' (already at start)' : ''} - nothing is drawn; game logic keeps running`
          );
        } else if (e.type === 'cp-order') say(`   order: ${e.plan.join(' → ')} (${e.pathM} m)`);
        else if (e.type === 'terminal') say(`   terminal> ${e.cmd}  (clues ${e.clues})`);
        else if (e.type === 'yh-walk')
          say(
            `   walking ${e.dir > 0 ? 'in to the desk' : 'out to the street'} from waypoint ${e.from}`
          );
        else if (e.type === 'lx-walk')
          say(
            `   力行: walking ${e.dir > 0 ? 'up to the 2F gallery' : 'out to the forecourt'} from waypoint ${e.from}`
          );
        else if (e.type === 'lx-wp') say(`   力行: waypoint ${e.i} (y ${e.y})`);
        else if (e.type === 'dorm-door') say(`   E at room ${e.room}`);
        else if (e.type === 'yh-garry')
          say("!! wandered into 黃蓋瑞's flat next door, walking back to the landing");
        else if (e.type === 'use-pc') say('   E: use the computer');
        else if (e.type === 'pc-off')
          say(`   computer switched off (case ${e.solved ? 'solved' : 'not solved'})`);
        else if (e.type === 'case-unsolved' || e.type === 'case-no-console')
          say(`!! ${e.type}`, JSON.stringify(e.clues || ''));
        else if (e.type === 'ending')
          say(`ENDING reached: ${e.votes} votes, play time ${e.playTime.toFixed(1)}s`);
        else if (
          cfg.debug &&
          [
            'reverse',
            'replan',
            'sidestep',
            'mount',
            'dismount',
            'flyer',
            'paused',
            'close-phone',
          ].includes(e.type)
        )
          say('   .', JSON.stringify(e));
      }
      if (cfg.debug && st.dbg) say('   dbg', JSON.stringify(st.dbg), `t=${st.playTime.toFixed(1)}`);
      if (st.playTime !== lastPlay) {
        lastPlay = st.playTime;
        lastPlayReal = Date.now();
      }
      if (st.done && !done) {
        done = true;
        report.ending = true;
        report.endingVotes = st.votes;
        report.playTimeSec = +st.playTime.toFixed(1);
      }
      if (st.fatal && report.botErrors.length > 20)
        throw new Error(`bot keeps failing: ${st.fatal}`);
    }
    while (shotsWanted.length) {
      const i = shotsWanted.shift();
      await shot(i === 99 ? 'step-99-ending' : `step-${String(i).padStart(2, '0')}`, i);
    }
    const st = lastStatus;
    if (st && Date.now() - lastLog > 15000) {
      lastLog = Date.now();
      say(
        `   status: step ${st.idx}/${st.step || '-'} t=${st.playTime.toFixed(1)} timer=${st.timer === null ? '-' : st.timer.toFixed(1)} votes=${st.votes} ${st.vehicle ? 'riding' : 'on foot'} v=${(st.speed || 0).toFixed(1)} ${st.nav ? `-> ${st.nav.name} ${st.nav.remain.toFixed(0)}m` : ''} frames=${st.frames}`
      );
    }
    if (
      done &&
      (!cfg.shots ||
        report.screenshots?.some((s) => s.step === 99) ||
        Date.now() - lastPlayReal > 30000)
    )
      break;
    if (st && st.idleStall)
      throw new Error(
        `no objective for ${st.idleStall.sec}s of game time at mission ${st.idleStall.idx} (stuck between steps)`
      );
    if (st && st.state === 'play' && Date.now() - lastPlayReal > 120e3)
      throw new Error('game time stopped advancing for 2 min (page hung?)');
    if (Date.now() > deadline) throw new Error(`wall-clock timeout (${cfg.timeoutMin} min)`);
  }
  report.steps = summarize(lastSteps);
  if (lastStatus)
    report.renderStats = {
      framesDrawn: lastStatus.renders,
      avgRenderMs: lastStatus.renders
        ? +(lastStatus.renderMs / lastStatus.renders).toFixed(1)
        : null,
      renderFps: lastStatus.renderMs
        ? +(lastStatus.renders / (lastStatus.renderMs / 1000)).toFixed(1)
        : null,
      gameFrames: lastStatus.frames,
    };
}
const inbox = [];
let lastSteps = [],
  lastStatus = null;

async function closeBrowser() {
  try {
    page && page.close();
  } catch {}
  try {
    chrome && chrome.kill && (await chrome.kill());
  } catch {}
  page = null;
  chrome = null;
}
// launch Chrome in the current mode, load the game to its title screen, inject the bot;
// returns true when WebGL is usable, else a reason string (errors of a failed attempt are kept apart)
async function openGame() {
  const mark = {
    p: report.pageErrors.length,
    c: report.consoleErrors.length,
    n: report.networkErrors.length,
  };
  if (CDP_PORT) {
    say(`attaching to Chrome at 127.0.0.1:${CDP_PORT} (${gpu} defaults)`);
    chrome = { port: CDP_PORT };
  } else {
    say(`launching Chrome (${gpu}) ${cfg.chrome}`);
    chrome = await launchChrome({
      chrome: cfg.chrome,
      gpu,
      width: cfg.width,
      height: cfg.height,
      headless: !cfg.headful,
    });
  }
  page = await connectPage(chrome.port);
  const ver = await (await fetch(`http://127.0.0.1:${chrome.port}/json/version`)).json();
  report.chrome = ver.Browser;
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Log.enable');
  await page.send('Runtime.addBinding', { name: '__e2eSend' });
  const pg = page;
  pg.on('Runtime.bindingCalled', (e) => {
    if (e.name === '__e2eSend' && pg === page) {
      try {
        inbox.push(JSON.parse(e.payload));
      } catch {}
    }
  });
  pg.on('Runtime.exceptionThrown', (e) => {
    if (pg !== page) return;
    const d = e.exceptionDetails;
    const msg = d.exception?.description || d.text;
    report.pageErrors.push({
      step: curIdx,
      msg: String(msg).slice(0, 2000),
      url: d.url,
      line: d.lineNumber,
    });
    say('PAGE EXCEPTION', String(msg).split('\n')[0]);
  });
  pg.on('Runtime.consoleAPICalled', (e) => {
    if (pg !== page || (e.type !== 'error' && e.type !== 'assert')) return;
    const msg = e.args.map((a) => a.value ?? a.description ?? '').join(' ');
    report.consoleErrors.push({ step: curIdx, msg: msg.slice(0, 2000) });
    say('CONSOLE ERROR', msg.split('\n')[0]);
  });
  pg.on('Log.entryAdded', ({ entry }) => {
    if (pg !== page || entry.level !== 'error') return;
    if (/favicon\.ico/.test(entry.url || '')) return;
    const rec = { step: curIdx, source: entry.source, msg: entry.text, url: entry.url };
    const known = !cfg.strict && KNOWN_NOISE.find((k) => k.re.test(entry.text || ''));
    if (known) {
      report.ignoredErrors.push({ ...rec, why: known.why });
      say('LOG ERROR (known, not counted)', entry.text.slice(0, 120));
      return;
    }
    if (entry.source === 'network') report.networkErrors.push(rec);
    else report.consoleErrors.push(rec);
    say('LOG ERROR', entry.source, entry.text, entry.url || '');
  });
  const initSrc = fs.readFileSync(path.join(here, 'page-init.js'), 'utf8').replace(
    'const cfg = __E2E_CFG__;',
    `const cfg = ${JSON.stringify({
      fixedDt: cfg.fixedDt,
      stepsPerFrame: cfg.stepsPerFrame,
      renderEvery: cfg.renderEvery,
      seed: cfg.seed,
      settings: { quality: cfg.quality, music: 'off' },
    })}`
  );
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: initSrc });
  await page.send('Page.navigate', { url: srv.url });
  // wait for the title screen
  const tl = Date.now();
  for (;;) {
    const s = await page.eval(`window.game && window.game.state`).catch(() => null);
    if (s === 'title') break;
    const err = await page
      .eval(`document.getElementById('loadText')?.textContent || ''`)
      .catch(() => '');
    if (/載入失敗/.test(err)) {
      // a WebGL failure in GPU mode is a renderer problem: let main() retry / fall back
      if (/WebGL/i.test(err) && report.gpuAttempts.length < MODES.length - 1) {
        const att = {
          mode: gpu,
          renderer: null,
          ok: false,
          reason: `game failed to load: ${err}`,
          pageErrors: report.pageErrors.splice(mark.p),
          consoleErrors: report.consoleErrors.splice(mark.c),
          networkErrors: report.networkErrors.splice(mark.n),
        };
        report.gpuAttempts.push(att);
        return att.reason;
      }
      throw new Error(`game failed to load: ${err}`);
    }
    if (Date.now() - tl > 10 * 60e3) throw new Error('title screen did not appear within 10 min');
    await sleep(500);
  }
  report.loadSec = +((Date.now() - tl) / 1000).toFixed(1);
  say(`title screen after ${report.loadSec}s`);
  await page.eval(fs.readFileSync(path.join(here, 'bot-page.js'), 'utf8'));
  report.renderer = await page.eval('__storyBot.renderer()');
  say(
    'WebGL renderer:',
    report.renderer.contextLost ? '(WebGL context lost)' : report.renderer.renderer
  );
  const shaderErr = report.consoleErrors
    .slice(mark.c)
    .some((e) => /WebGLProgram|CONTEXT_LOST|WebGL/i.test(e.msg));
  let reason = null;
  if (report.renderer.contextLost || !report.renderer.renderer)
    reason = 'WebGL context lost or unavailable';
  else if (shaderErr) reason = 'WebGL errors while loading';
  else if (gpu === 'gpu' && /SwiftShader/i.test(report.renderer.renderer))
    reason = 'GPU requested but Chrome fell back to SwiftShader';
  if (!reason && gpu === 'swiftshader' && !/SwiftShader/i.test(report.renderer.renderer || '')) {
    report.rendererMismatch = true;
    say('!! warning: SwiftShader requested but the renderer is', report.renderer.renderer);
  }
  const att = {
    mode: gpu,
    renderer: report.renderer.renderer,
    contextLost: !!report.renderer.contextLost,
    ok: !reason,
    reason,
    loadSec: report.loadSec,
  };
  if (reason && report.gpuAttempts.length < MODES.length - 1) {
    // keep this attempt's errors with the attempt, not with the run
    att.pageErrors = report.pageErrors.splice(mark.p);
    att.consoleErrors = report.consoleErrors.splice(mark.c);
    att.networkErrors = report.networkErrors.splice(mark.n);
  }
  report.gpuAttempts.push(att);
  return reason ? reason : true;
}

async function shot(name, idx) {
  if (!cfg.shots || !page) return;
  try {
    const { data } = await page.send(
      'Page.captureScreenshot',
      { format: 'jpeg', quality: 70 },
      120000
    );
    const file = path.join(cfg.out, `${name}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    (report.screenshots ||= []).push({ step: idx, file: path.relative(cfg.out, file) });
  } catch (e) {
    say('screenshot failed', e.message);
  }
}

const LIMITS = { 1: 180, 2: 120, 4: 120 };
function summarize(steps) {
  return steps.map((s) => {
    const realSec = s.realMs / 1000;
    const timed = s.timerStartT !== null;
    const used = timed ? +((s.timerEndT ?? s.endT) - s.timerStartT).toFixed(2) : null;
    const errs =
      report.pageErrors.filter((e) => e.step === s.idx).length +
      report.consoleErrors.filter((e) => e.step === s.idx).length;
    const pass = s.endT !== null && !s.fails && !s.failed && s.fallbacks.length === 0 && errs === 0;
    return {
      idx: s.idx,
      name: STORY[s.idx] || s.title,
      objective: s.title,
      startGameSec: s.startT,
      endGameSec: s.endT,
      durationGameSec: s.endT !== null ? +(s.endT - s.startT).toFixed(2) : null,
      limitSec: s.limit ?? LIMITS[s.idx] ?? null,
      timedGameSec: used,
      timerLeftSec: timed ? s.timerLeft : null,
      pass,
      missionFails: s.fails,
      attempts: (s.attempts || []).map((a) => ({
        ...a,
        usedSec: a.end !== null ? +(a.end - a.start).toFixed(2) : null,
      })),
      fallbacks: s.fallbacks,
      distanceM: Math.round(s.distance),
      legs: s.legs,
      votes: { start: s.votesStart, end: s.votesEnd },
      pageErrors: errs,
      frames: s.frames,
      realSec: +realSec.toFixed(1),
      fps: realSec > 0 ? +(s.frames / realSec).toFixed(1) : null,
      gameSpeed:
        realSec > 0 && s.endT !== null ? +((s.endT - s.startT) / realSec).toFixed(2) : null,
      renders: s.renders,
      renderFps: s.renderMs > 0 ? +(s.renders / (s.renderMs / 1000)).toFixed(2) : null,
    };
  });
}

function finish(err) {
  if (finished) return;
  finished = true;
  if (err) {
    report.error = String((err && err.stack) || err);
    say('ERROR', err.message || err);
  }
  report.fallbacks = report.steps.reduce((n, s) => n + s.fallbacks.length, 0);
  const noErrors =
    report.pageErrors.length === 0 &&
    report.consoleErrors.length === 0 &&
    report.botErrors.length === 0;
  report.exitCode = report.ending && report.fallbacks === 0 && noErrors && !err ? 0 : 1;
  report.verdict =
    report.exitCode === 0
      ? 'PASS: story completed by playing, no fallback, no page errors'
      : !report.ending
        ? 'FAIL: ending not reached'
        : report.fallbacks
          ? `FAIL: ending reached but ${report.fallbacks} teleport fallback(s) used`
          : 'FAIL: ending reached but page/bot errors occurred';
  report.finishedAt = new Date().toISOString();
  report.wallSec = +((Date.now() - t0) / 1000).toFixed(1);
  const file = path.join(cfg.out, 'report.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  printSummary();
  console.log(`report: ${file}`);
}
function printSummary() {
  console.log('\n================ STORY BOT SUMMARY ================');
  if (report.gpuAttempts?.length > 1)
    for (const a of report.gpuAttempts)
      console.log(
        `attempt  : ${a.mode} -> ${a.ok ? 'OK' : `FAILED (${a.reason})`} ${a.renderer || ''}`
      );
  console.log(
    `renderer : ${report.renderer?.contextLost ? 'WebGL CONTEXT LOST (no rendering; see consoleErrors)' : report.renderer?.renderer || '?'}`
  );
  console.log(
    `chrome   : ${report.chrome || '?'}   route: ${cfg.route}   mode: ${gpu}, fixed-dt ${cfg.fixedDt.toFixed(4)}s, steps/frame ${cfg.stepsPerFrame}, render-every ${cfg.renderEvery}, quality ${cfg.quality}`
  );
  console.log(`load     : ${report.loadSec}s   wall: ${report.wallSec}s`);
  if (report.renderStats)
    console.log(
      `drawing  : ${report.renderStats.framesDrawn} frames drawn for ${report.renderStats.gameFrames} game frames, avg ${report.renderStats.avgRenderMs} ms per drawn frame (${report.renderStats.renderFps} fps while drawing)`
    );
  const pad = (s, n) => {
    s = String(s ?? '-');
    let w = 0;
    for (const ch of s) w += ch.charCodeAt(0) > 0x2e80 ? 2 : 1;
    return s + ' '.repeat(Math.max(0, n - w));
  };
  console.log(
    `${pad('step', 44) + pad('result', 7) + pad('game s', 9) + pad('timed/limit', 14) + pad('dist m', 8) + pad('fb', 4) + pad('err', 5) + pad('fps', 7)}render fps`
  );
  for (const s of report.steps) {
    console.log(
      pad(`${s.idx} ${s.name}`, 44) +
        pad(s.pass ? 'PASS' : 'FAIL', 7) +
        pad(s.durationGameSec, 9) +
        pad(s.limitSec ? `${s.timedGameSec ?? '-'}/${s.limitSec}` : '-', 14) +
        pad(s.distanceM, 8) +
        pad(s.fallbacks.length, 4) +
        pad(s.pageErrors, 5) +
        pad(s.fps, 7) +
        (s.renderFps ?? '-')
    );
  }
  console.log(
    `ending   : ${report.ending ? `reached (${report.endingVotes} votes, ${report.playTimeSec}s play time)` : 'NOT reached'}`
  );
  console.log(
    `errors   : page ${report.pageErrors.length}, console ${report.consoleErrors.length}, network ${report.networkErrors.length}, bot ${report.botErrors.length}`
  );
  console.log(`verdict  : ${report.verdict}`);
}

const cleanup = async () => {
  await closeBrowser();
  try {
    srv && (await srv.close());
  } catch {}
};
for (const sig of ['SIGINT', 'SIGTERM'])
  process.on(sig, async () => {
    finish(new Error(`interrupted (${sig})`));
    await cleanup();
    process.exit(130);
  });
try {
  await main();
  finish();
} catch (e) {
  // salvage whatever the bot recorded
  try {
    const res = await page.eval('__storyBot.poll()', { timeoutMs: 20000 });
    lastSteps = res.steps;
    report.events.push(...res.events);
  } catch {}
  report.steps = summarize(lastSteps);
  finish(e);
}
await cleanup();
process.exit(report.exitCode);
