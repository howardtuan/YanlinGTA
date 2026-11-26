import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  CAM_VIEW,
  camPoints,
  discardScale,
  fitCamera,
} from '../../src/systems/mahjong/MahjongScene.js';

// 麻將桌的鏡頭自動取景與海底放大（src/systems/mahjong/MahjongScene.js）
const SIZES = [
  { name: '手機橫拿', w: 844, h: 390, bar: 74, mode: 'close' },
  { name: '手機直拿', w: 390, h: 844, bar: 170, mode: 'close' },
  { name: '電腦小視窗', w: 800, h: 600, bar: 0, mode: 'far' },
  { name: '電腦全螢幕', w: 1920, h: 1080, bar: 0, mode: 'far' },
  { name: '直立平板遠景', w: 768, h: 1024, bar: 0, mode: 'far' },
];

describe('fitCamera：重點區塊塞滿畫面又不被切掉', () => {
  for (const S of SIZES) {
    it(S.name, () => {
      const c = new THREE.PerspectiveCamera(50, S.w / S.h, 0.05, 30);
      const mine = S.mode === 'far';
      const top = 40,
        side = 10,
        bottom = S.bar ? 6 : 34;
      const r = fitCamera(c, CAM_VIEW[S.mode](S.w / S.h), { w: S.w, h: S.h, bar: S.bar, mine });
      expect(r.y).toBeLessThanOrEqual(2.55 + 1e-6); // 不撞到天花板的燈
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of camPoints(mine)) {
        const v = p.clone().project(c);
        const x = ((v.x + 1) / 2) * S.w,
          y = ((1 - v.y) / 2) * S.h;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      // 全部在可用範圍裡（上面留名牌、下面留手牌條或提示列）
      expect(minX).toBeGreaterThanOrEqual(side - 1);
      expect(maxX).toBeLessThanOrEqual(S.w - side + 1);
      expect(minY).toBeGreaterThanOrEqual(top - 1);
      expect(maxY).toBeLessThanOrEqual(S.h - S.bar - bottom + 1);
      // 而且是塞滿的：至少有一個方向貼齊可用範圍
      const fillW = (maxX - minX) / (S.w - 2 * side),
        fillH = (maxY - minY) / (S.h - S.bar - bottom - top);
      expect(Math.max(fillW, fillH)).toBeGreaterThan(0.97);
    });
  }
});

describe('discardScale：海底放大但不壓到牌牆', () => {
  it('前三排放大 1.3 倍', () => {
    expect(discardScale(0)).toBeCloseTo(1.3);
    expect(discardScale(21)).toBeCloseTo(1.3);
  });
  it('排到第四、五排時縮回，最外排仍在牌牆內側', () => {
    for (const n of [22, 28, 29, 35]) {
      const k = discardScale(n),
        rows = Math.ceil(n / 7);
      expect(k).toBeLessThan(1.3);
      expect(k).toBeGreaterThan(rows === 4 ? 1.1 : 0.95); // (五排很少見：跟原本差不多大)
      // 海底最外緣 = k × (0.072 + rows × (0.04 + 0.003))，牌牆內側 = 0.3 − 0.011
      expect(k * (0.072 + rows * 0.043)).toBeLessThanOrEqual(0.3 - 0.011);
    }
  });
});
