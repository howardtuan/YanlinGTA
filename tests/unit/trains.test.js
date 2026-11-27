// 縱貫線火車與平交道（src/entities/Trains.js、src/world/Railway.js）：地圖資料找得到三處平交道，
// 班表（src/entities/TrainTimetable.js，臺鐵開放資料）合理，同方向前後兩班在地圖上不會疊在一起
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { findCrossings } from '../../src/world/Railway.js';
import { schedule, SPEED, GAP_MIN } from '../../src/entities/Trains.js';
import { WEEKDAY, WEEKEND } from '../../src/entities/TrainTimetable.js';

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/cycu.json'), 'utf8'));

describe('縱貫線平交道', () => {
  it('找到新中北路 249 巷、普忠路 211 巷與西邊無名巷三處平交道', () => {
    const { crossings } = findCrossings(data);
    expect(crossings.map((c) => c.name).sort()).toEqual(
      ['新中北路249巷', '普忠路211巷', '無名巷'].sort()
    );
    for (const c of crossings) {
      expect(c.w).toBeGreaterThan(3);
      // 平交道中點在兩條軌道之間
      expect(c.s).toHaveLength(2);
    }
  });
  it('地下道（普忠路）與高架（中山東路）不算平交道', () => {
    const { crossings } = findCrossings(data);
    expect(crossings.some((c) => c.name === '普忠路' || c.name === '中山東路一段')).toBe(false);
  });
});

describe('台鐵班表', () => {
  it('平日、週末各約兩百班，兩個方向都有，半夜也有車', () => {
    for (const T of [WEEKDAY, WEEKEND]) {
      expect(T.length).toBeGreaterThan(150);
      const south = T.filter((r) => r[1] > r[0]).length;
      expect(south).toBeGreaterThan(60);
      expect(T.length - south).toBeGreaterThan(60);
      // 內壢 → 中壢 3.93 km 要 2.5～8 分鐘
      for (const r of T) expect(Math.abs(r[1] - r[0])).toBeGreaterThan(2.5);
      for (const r of T) expect(Math.abs(r[1] - r[0])).toBeLessThan(8);
    }
  });
  it('同方向前後兩班至少隔一列車長（不會追撞）', () => {
    const L = schedule(WEEKDAY, 446, 4376);
    for (const dir of [1, -1]) {
      const D = L.filter((t) => t.dir === dir).sort((a, b) => a.tRef - b.tRef);
      for (let i = 1; i < D.length; i++) {
        const gapM = (D[i].tRef - D[i - 1].tRef) * 4 * SPEED; // 遊戲 1 分鐘 = 現實 4 秒
        expect(gapM).toBeGreaterThan(D[i - 1].cars * 20);
      }
    }
  });
  it('只開大約一半班次：同方向至少隔 GAP_MIN 分鐘，時刻照真實班表', () => {
    const all = schedule(WEEKDAY, 446, 4376, 0),
      L = schedule(WEEKDAY, 446, 4376);
    expect(all).toHaveLength(WEEKDAY.length);
    // 大約開一半（平日約 100 班）
    expect(L.length).toBeGreaterThan(WEEKDAY.length * 0.4);
    expect(L.length).toBeLessThan(WEEKDAY.length * 0.6);
    for (const dir of [1, -1]) {
      const D = L.filter((t) => t.dir === dir).sort((a, b) => a.tRef - b.tRef);
      for (let i = 1; i < D.length; i++)
        expect(D[i].tRef - D[i - 1].tRef).toBeGreaterThanOrEqual(GAP_MIN);
      // 開的每一班都是班表上的一班
      for (const t of D) expect(all.some((u) => u.no === t.no && u.tRef === t.tRef)).toBe(true);
    }
  });
});
