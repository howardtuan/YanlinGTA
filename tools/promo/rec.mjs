// Promo recorder daemon: serves dist/, opens the game in GPU Chrome (1920x1080) with a virtual clock,
// and listens on http://127.0.0.1:7788 for commands:
//   POST /eval   body = JS expression (evaluated in the page, awaited) -> JSON
//   GET  /shot?file=path.jpg              -> one screenshot of the current frame
//   POST /rec?dir=out/clip&frames=N&sub=1 body = JS (optional) run before each frame -> N jpg frames
//   GET  /step?n=30                        -> advance game frames without capture (draws last)
// usage: node tools/promo/rec.mjs [--headful] [--port=7788]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, connectPage, defaultChromePath } from '../e2e/cdp.mjs';
import { startServer } from '../e2e/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const arg = (k, d) => {
  const a = process.argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : process.argv.includes(`--${k}`) ? true : d;
};
// --mobile: an 844x390 landscape phone (touch UI) rendered at 2x
const MOBILE = !!arg('mobile', false);
const W = MOBILE ? 844 : 1920,
  H = MOBILE ? 390 : 1080;
const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

const srv = await startServer({ root: path.join(root, 'dist'), port: 0 });
const chrome = await launchChrome({
  chrome: defaultChromePath(),
  gpu: 'gpu',
  width: W,
  height: H,
  headless: !arg('headful', false),
});
const page = await connectPage(chrome.port);
await page.send('Runtime.enable');
await page.send('Page.enable');
await page.send('Emulation.setDeviceMetricsOverride', {
  width: W,
  height: H,
  deviceScaleFactor: MOBILE ? 2 : 1,
  mobile: MOBILE,
});
if (MOBILE) {
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Emulation.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
}
page.on('Runtime.exceptionThrown', (e) =>
  console.log('PAGE EXC', e.exceptionDetails.exception?.description?.split('\n')[0])
);
page.on('Runtime.consoleAPICalled', (e) => {
  if (e.type === 'error')
    console.log(
      'console.error',
      e.args
        .map((a) => a.value ?? a.description)
        .join(' ')
        .slice(0, 300)
    );
});
await page.send('Page.addScriptToEvaluateOnNewDocument', {
  source: fs.readFileSync(path.join(here, 'rec-init.js'), 'utf8'),
});
await page.send('Page.navigate', { url: srv.url });
const t0 = Date.now();
while ((await page.eval('window.game && window.game.state').catch(() => null)) !== 'title') {
  if (Date.now() - t0 > 5 * 60e3) throw new Error('no title screen');
  await sleep(500);
}
console.log(`title after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(
  'renderer',
  await page.eval(
    `(() => { const gl = game.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })()`
  )
);

async function shot(file, clip = null, quality = 92) {
  const opt = { format: 'jpeg', quality };
  if (clip) {
    const [x, y, width, height, scale] = clip.split(',').map(Number);
    opt.clip = { x, y, width, height, scale: scale || 1 };
    opt.captureBeyondViewport = false;
  }
  const { data } = await page.send('Page.captureScreenshot', opt, 120000);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

const body = (req) =>
  new Promise((r) => {
    let s = '';
    req.on('data', (d) => (s += d));
    req.on('end', () => r(s));
  });

const port = +arg('port', 7788);
http
  .createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const out = (code, v) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(v));
    };
    try {
      if (u.pathname === '/eval') {
        const js = await body(req);
        out(200, await page.eval(js, { timeoutMs: 600000 }));
      } else if (u.pathname === '/shot') {
        await shot(path.resolve(root, u.searchParams.get('file')), u.searchParams.get('clip'));
        out(200, 'ok');
      } else if (u.pathname === '/step') {
        await page.eval(`__rec.step(${+u.searchParams.get('n') || 1})`);
        out(200, 'ok');
      } else if (u.pathname === '/rec') {
        const dir = path.resolve(root, u.searchParams.get('dir'));
        const n = +u.searchParams.get('frames');
        const sub = +u.searchParams.get('sub') || 1;
        const pre = (await body(req)).trim();
        const rate = +u.searchParams.get('rate') || 1;
        await page.send('Animation.enable');
        await page.send('Animation.setPlaybackRate', { playbackRate: rate });
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        const ts = Date.now();
        for (let i = 0; i < n; i++) {
          await page.eval(
            `(async () => { ${pre ? `{ const i = ${i}; ${pre} }` : ''}; __rec.step(${sub}); })()`
          );
          await shot(
            path.join(dir, `f${String(i).padStart(5, '0')}.jpg`),
            u.searchParams.get('clip')
          );
        }
        await page.send('Animation.setPlaybackRate', { playbackRate: 1 });
        out(200, { frames: n, sec: (Date.now() - ts) / 1000 });
      } else if (u.pathname === '/quit') {
        out(200, 'bye');
        await chrome.kill();
        srv.close?.();
        process.exit(0);
      } else out(404, 'no');
    } catch (e) {
      out(500, String(e.message || e));
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`recorder ready on http://127.0.0.1:${port}`));
