import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SPECTATE_REACTS, reactSticker } from '../../src/systems/mahjong/P2P.js';

describe('觀戰表情：彥霖貼圖', () => {
  it('每個表情都有貼圖檔', () => {
    for (const r of SPECTATE_REACTS) {
      expect(r.img).toMatch(/^assets\/mahjong\/react-\w+\.webp$/);
      expect(fs.existsSync(path.resolve(r.img))).toBe(true);
    }
  });
  it('連線傳的 text 換得回貼圖；不認得的（舊版或自訂文字）照舊顯示文字', () => {
    for (const r of SPECTATE_REACTS) expect(reactSticker(r.text)?.id).toBe(r.id);
    expect(reactSticker('隨便講講')).toBeNull();
  });
});
