import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// #460：畫面與裝置管理只有一套——PerfProfile 的 mobile / desktop 二分，GraphicsConfig 的 5 階 PRESETS，
// 引擎直讀 game.gfx。舊的 GPU 分檔、轉譯函式與散落旗標不留相容層，這裡掃 src/ 與 tools/ 防止它們回來。
// （舊名稱用拼接寫，這個檔案本身也不出現它們。）
const j = (...p) => p.join('');
const LEGACY = [
  j('QP', 'ROF'),
  j('sub', 'Q'),
  j('guess', 'Gpu'),
  j('low', 'Q'),
  j('xlow', 'Q'),
  j('halfRate', 'Shadows'),
  j('postFx', 'Level'),
  j('shadow', 'Level'),
  j('tier', 'Clamp'),
  j('mobile', '-lite'),
  j('mobile', '-ios'),
  j('desktop', '-igpu'),
  j('desktop', '-dgpu'),
  j('settings', '.fill'),
  j('?', 'tier='),
];
const SKIP = new Set(['node_modules', '.cache', 'out', 'promo']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(m?js|json|html|css)$/.test(name)) yield p;
  }
}

describe('畫面管理零舊相容層（#460）', () => {
  it('src/ 與 tools/ 沒有任何舊畫質符號', () => {
    const hits = [];
    for (const root of ['src', 'tools'])
      for (const f of files(root)) {
        const text = readFileSync(f, 'utf8');
        for (const sym of LEGACY) {
          const re = new RegExp(
            `(^|[^A-Za-z0-9_])${sym.replace(/[.?]/g, '\\$&')}($|[^A-Za-z0-9_])`
          );
          if (re.test(text)) hits.push(`${f}: ${sym}`);
        }
      }
    expect(hits).toEqual([]);
  });
});
