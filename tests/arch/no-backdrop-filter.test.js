import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// iPhone Safari：畫面上有 backdrop-filter 時會連同後面的 WebGL 畫布一起模糊，記憶體爆掉、整頁重新載入
// （手機版點 E 打開 i-Piyan 手機就閃退）。遊戲 UI 一律用半透明底色，不要用 backdrop-filter。
describe('style.css 不使用 backdrop-filter', () => {
  it('沒有任何 backdrop-filter 宣告', () => {
    const css = readFileSync('src/styles/style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/(-webkit-)?backdrop-filter\s*:/);
  });
});
