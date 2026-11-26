// 產生 Wiki 用的三個 AI 頭貼（wiki/img/<id>_av.jpg）：用遊戲本身的 src/graphics/HoloRing.js 在 Chrome 裡畫一格全息圓圈，
// 墊上深色底（圓圈是發光疊加，透明底在淺色網頁上看不到）。AI 顏色或圓圈樣子改了再跑一次：node tools/wiki-holo-avatars.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { defaultChromePath } from './e2e/cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs
  .readFileSync(path.join(ROOT, 'src/graphics/HoloRing.js'), 'utf-8')
  .replace(/^export /gm, '');

const browser = await chromium.launch({ executablePath: defaultChromePath(), headless: true });
try {
  const page = await browser.newPage();
  const shots = await page.evaluate((code) => {
    const { HOLO_AI, drawHolo } = new Function(`${code}; return { HOLO_AI, drawHolo };`)();
    const S = 384;
    return Object.values(HOLO_AI).map((pal) => {
      const ring = document.createElement('canvas');
      ring.width = ring.height = S;
      drawHolo(ring.getContext('2d'), S, 3.7, pal);
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const ctx = c.getContext('2d');
      const bg = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.72);
      bg.addColorStop(0, '#141a33');
      bg.addColorStop(1, '#05070f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, S, S);
      ctx.drawImage(ring, 0, 0);
      return { id: pal.id, data: c.toDataURL('image/jpeg', 0.88).split(',')[1] };
    });
  }, src);
  for (const s of shots) {
    const out = path.join(ROOT, 'wiki', 'img', `${s.id}_av.jpg`);
    fs.writeFileSync(out, Buffer.from(s.data, 'base64'));
    console.log('寫入', path.relative(ROOT, out));
  }
} finally {
  await browser.close();
}
