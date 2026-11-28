import { describe, it, expect } from 'vitest';
import { puddingTime } from '../../src/entities/XmasPudding.js';
import { brushTime, BRUSH_SLOTS } from '../../src/entities/npcs/Hank.js';
import { SECRETS } from '../../src/systems/Secrets.js';
import { existsSync } from 'node:fs';

const day = 1440,
  hm = (d, h, m = 0) => d * day + h * 60 + m;

describe('聖誕節宿舍布丁事件 (src/entities/XmasPudding.js)', () => {
  it('every night 21:00–23:00 only', () => {
    expect(puddingTime(hm(3, 20, 59))).toBe(false);
    expect(puddingTime(hm(3, 21, 0))).toBe(true);
    expect(puddingTime(hm(3, 22, 59))).toBe(true);
    expect(puddingTime(hm(3, 23, 0))).toBe(false);
    expect(puddingTime(hm(0, 17, 20))).toBe(false); // the game's start time
  });
});

describe('漢克 brushing his teeth with the shower head (src/entities/npcs/Hank.js)', () => {
  const dec = new Date(2026, 11, 10, 12),
    nov = new Date(2026, 10, 10, 12),
    oct = new Date(2026, 9, 10, 12),
    jan = new Date(2027, 0, 10, 12);
  const slots = (date) => {
    let n = 0;
    for (let d = 0; d < 60; d++)
      for (const [a] of BRUSH_SLOTS) if (brushTime(d * day + a + 5, date)) n++;
    return n;
  };
  it('only in November and December', () => {
    expect(slots(oct)).toBe(0);
    expect(slots(jan)).toBe(0);
    expect(slots(nov)).toBeGreaterThan(0);
  });
  it('"sometimes": some of the slots, not all of them, and never outside them', () => {
    const n = slots(dec);
    expect(n).toBeGreaterThan(20);
    expect(n).toBeLessThan(100);
    for (let d = 0; d < 30; d++) {
      expect(brushTime(hm(d, 12), dec)).toBe(false);
      expect(brushTime(hm(d, 3), dec)).toBe(false);
    }
  });
  it('a slot is on or off for its whole length', () => {
    for (let d = 0; d < 30; d++)
      for (const [a, b] of BRUSH_SLOTS) {
        const v = brushTime(d * day + a, dec);
        for (let m = a; m < b; m += 5) expect(brushTime(d * day + m, dec)).toBe(v);
      }
  });
});

describe('隱藏成就 entries', () => {
  for (const id of ['pudding', 'coldwater']) {
    it(`${id} is listed with its story`, () => {
      const s = SECRETS.find((x) => x.id === id);
      expect(s).toBeTruthy();
      expect(s.title && s.real && s.hint && s.cover).toBeTruthy();
      expect(s.story.length).toBeGreaterThan(0);
      expect(s.media.length).toBeGreaterThan(0);
    });
  }
  for (const id of ['pudding', 'coldwater'])
    it(`${id} photos are in assets/secrets/${id}/`, () => {
      const s = SECRETS.find((x) => x.id === id);
      expect(existsSync(s.cover)).toBe(true);
      for (const m of s.media) expect(existsSync(m.src)).toBe(true);
    });
});
