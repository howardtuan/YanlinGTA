#!/usr/bin/env node
// Wiki「操作教學」的遊戲截圖：用 headless Chrome（GPU）開 dist/，截電腦版標題畫面、電腦版遊戲畫面、手機橫放遊戲畫面，
// 存到 wiki/shots/。改了 HUD、觸控按鈕或標題畫面之後重跑一次：
//   npm run build && node tools/wiki_shots.mjs [--swiftshader]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './e2e/serve.mjs';
import { launchChrome, connectPage, defaultChromePath } from './e2e/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'wiki', 'shots');
const gpu = process.argv.includes('--swiftshader') ? 'swiftshader' : 'gpu';
const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });
// 截圖時關掉音樂與音效、用高畫質
const SETTINGS = JSON.stringify({ music: 'off', quality: 'high', sfxVol: 0 });
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function waitState(page, want, ms) {
  const t0 = Date.now();
  while ((await page.eval(`window.game?.state ?? null`).catch(() => null)) !== want) {
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for game state "${want}"`);
    await sleep(300);
  }
}

async function capture(url, { name, w, h, mobile, shots }) {
  const br = await launchChrome({ chrome: defaultChromePath(), gpu, width: w, height: h });
  const page = await connectPage(br.port);
  try {
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: mobile ? 1600 / w : 1, // 兩種截圖都是 1600 px 寬
      mobile,
      ...(mobile ? { screenOrientation: { type: 'landscapePrimary', angle: 90 } } : {}),
    });
    if (mobile) {
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await page.send('Network.setUserAgentOverride', { userAgent: IPHONE_UA });
    }
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('cycu-shun-settings-v2', ${JSON.stringify(SETTINGS)});`,
    });
    await page.send('Page.navigate', { url });
    await waitState(page, 'title', 180000);
    await sleep(2500);
    const shot = async (file) => {
      const { data } = await page.send(
        'Page.captureScreenshot',
        { format: 'jpeg', quality: 82 },
        60000
      );
      fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'));
      console.log(`wiki_shots: ${file}`);
    };
    if (shots.includes('title')) await shot(`${name}-title.jpg`);
    await page.eval(`document.getElementById('btnStart').click()`);
    await waitState(page, 'play', 60000);
    await sleep(4500); // 開場對話出現、鏡頭穩定
    if (shots.includes('play')) await shot(`${name}-play.jpg`);
  } finally {
    await br.kill?.();
  }
}

if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('wiki_shots: dist/index.html not found (run npm run build first)');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const srv = await startServer({ root: path.join(ROOT, 'dist'), port: 0, basePath: '/' });
try {
  await capture(srv.url, {
    name: 'desktop',
    w: 1600,
    h: 900,
    mobile: false,
    shots: ['title', 'play'],
  });
  await capture(srv.url, { name: 'mobile', w: 844, h: 390, mobile: true, shots: ['play'] });
} finally {
  srv.close?.();
}
process.exit(0);
