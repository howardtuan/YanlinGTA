import { describe, it, expect } from 'vitest';
import {
  drsStep,
  drsActive,
  newDrs,
  DRS_WINDOW_MS,
  DRS_UP_HOLD_MS,
  autoQualityActive,
  autoQualityStep,
  autoQualityNext,
  newAutoQ,
  resolveQuality,
  AUTOQ_WINDOW_MS,
  AUTOQ_UP_MS,
  AUTOQ_UP_GAP_MS,
} from '../../src/core/GameLoop.js';
import { AUTO_TUNING } from '../../src/core/GraphicsConfig.js';
import { DEVICES } from '../../src/core/PerfProfile.js';

const MOB = AUTO_TUNING.mobile,
  DESK = AUTO_TUNING.desktop;

// feed `ms` of frames at a steady frame rate; returns every step it called for
function run(A, fps, ms, tune) {
  const dt = 1000 / fps,
    out = [];
  for (let t = 0; t < ms; t += dt) {
    const r = autoQualityStep(A, dt, tune);
    if (r) out.push(r);
  }
  return out;
}
const dirs = (steps) => steps.map((x) => x.dir);

describe('resolveQuality (#463)', () => {
  it('a level picked by hand wins; 自動 uses settings.autoQ, else the device default', () => {
    expect(resolveQuality('high', {}, DEVICES.mobile)).toBe('high');
    expect(resolveQuality('auto', {}, DEVICES.mobile)).toBe('low');
    expect(resolveQuality('auto', {}, DEVICES.desktop)).toBe('medium');
    expect(resolveQuality('auto', { autoQ: 'xlow' }, DEVICES.desktop)).toBe('xlow');
    expect(resolveQuality(undefined, { autoQ: 'ultra' }, DEVICES.desktop)).toBe('ultra');
  });
  it('a remembered autoQ never goes above the device cap, a bogus one is ignored', () => {
    expect(resolveQuality('auto', { autoQ: 'ultra' }, DEVICES.mobile)).toBe('high');
    expect(resolveQuality('auto', { autoQ: 'full' }, DEVICES.mobile)).toBe('low');
  });
});

describe('autoQuality: when it runs', () => {
  it('only in pure 自動 (no manual level, no ⚙ 細部顯示設定)', () => {
    expect(autoQualityActive({ quality: 'auto' })).toBe(true);
    expect(autoQualityActive({})).toBe(true);
    expect(autoQualityActive({ quality: 'auto', gfx: {} })).toBe(true);
    expect(autoQualityActive({ quality: 'low' })).toBe(false);
    expect(autoQualityActive({ quality: 'auto', gfx: { dprCap: 1.2 } })).toBe(false);
  });
});

describe('autoQuality: mobile (30 fps target)', () => {
  it('a phone holding 25-28 fps neither steps down nor up', () => {
    const A = newAutoQ();
    expect(run(A, 25, 60000, MOB)).toEqual([]);
    expect(run(A, 28, 60000, MOB)).toEqual([]);
  });
  it('two slow (< 20 fps) 3 s windows in a row step down; one does not', () => {
    const A = newAutoQ();
    run(A, 30, AUTOQ_WINDOW_MS, MOB); // warm-up
    expect(run(A, 15, AUTOQ_WINDOW_MS, MOB)).toEqual([]);
    expect(run(A, 30, AUTOQ_WINDOW_MS, MOB)).toEqual([]); // recovered: counter reset
    expect(run(A, 15, AUTOQ_WINDOW_MS, MOB)).toEqual([]);
    const s = run(A, 15, AUTOQ_WINDOW_MS + 100, MOB);
    expect(dirs(s)).toEqual([-1]);
    expect(s[0].fps).toBeGreaterThan(14);
    expect(s[0].fps).toBeLessThan(16);
  });
  it('steady >= 29 fps for 12 s, 15 s after the last change, steps up', () => {
    const A = newAutoQ();
    const s = run(A, 30, AUTOQ_WINDOW_MS + AUTOQ_UP_GAP_MS + 200, MOB);
    expect(dirs(s)).toEqual([1]);
    // and not again straight away: 15 s must pass
    expect(run(A, 30, AUTOQ_UP_MS + 500, MOB)).toEqual([]);
  });
  it('a slow window resets the steady count', () => {
    const A = newAutoQ();
    run(A, 30, AUTOQ_WINDOW_MS + 9000, MOB);
    run(A, 22, AUTOQ_WINDOW_MS, MOB); // 22: not slow enough to step down, not fast enough to count
    expect(run(A, 30, 9000, MOB)).toEqual([]);
  });
});

describe('autoQuality: desktop (60 fps target)', () => {
  it('45 fps on a desktop stays put (between 25 and 55)', () => {
    expect(run(newAutoQ(), 45, 120000, DESK)).toEqual([]);
  });
  it('steps down under 25 fps, up at >= 55 fps', () => {
    const A = newAutoQ();
    run(A, 60, AUTOQ_WINDOW_MS, DESK);
    expect(dirs(run(A, 20, AUTOQ_WINDOW_MS * 2 + 100, DESK))).toEqual([-1]);
    expect(A.warm).toBeLessThan(AUTOQ_WINDOW_MS); // a fresh warm-up for the new level
    expect(dirs(run(A, 60, AUTOQ_WINDOW_MS + AUTOQ_UP_GAP_MS + 500, DESK))).toEqual([1]);
  });
  it('ignores background-tab frames', () => {
    const A = newAutoQ();
    expect(autoQualityStep(A, 5000, DESK)).toBeNull();
    expect(A.warm).toBe(0);
  });
});

describe('autoQualityNext: one level at a time, capped, no see-sawing', () => {
  it('moves one level and stops at the ends and at the device cap', () => {
    expect(autoQualityNext(newAutoQ(), 'medium', -1)).toBe('low');
    expect(autoQualityNext(newAutoQ(), 'xlow', -1)).toBeNull();
    expect(autoQualityNext(newAutoQ(), 'high', 1, 'ultra')).toBe('ultra');
    expect(autoQualityNext(newAutoQ(), 'ultra', 1, 'ultra')).toBeNull();
    expect(autoQualityNext(newAutoQ(), 'medium', 1, 'high')).toBe('high');
    expect(autoQualityNext(newAutoQ(), 'high', 1, 'high')).toBeNull(); // phones stop at high
  });
  it('a level dropped from this session is not climbed back to', () => {
    const A = newAutoQ();
    expect(autoQualityNext(A, 'high', -1)).toBe('medium');
    expect(autoQualityNext(A, 'medium', 1, 'ultra')).toBeNull(); // high was too slow
    expect(autoQualityNext(A, 'medium', -1)).toBe('low');
    expect(autoQualityNext(A, 'low', 1, 'ultra')).toBeNull();
    const B = newAutoQ();
    expect(autoQualityNext(B, 'low', 1, 'ultra')).toBe('medium');
    expect(autoQualityNext(B, 'medium', 1, 'ultra')).toBe('high');
  });
});

describe('dynamic resolution (#438)', () => {
  const feed = (D, fps, ms, min = 0.8, cap = 1.25, tune = DESK) => {
    const dt = 1000 / fps,
      out = [];
    for (let t = 0; t < ms; t += dt) {
      const r = drsStep(D, dt, min, cap, tune);
      if (r != null) {
        D.scale = r;
        out.push(r);
      }
    }
    return out;
  };
  it('steps down 0.1 per slow 2 s window to the floor, never below', () => {
    const D = newDrs(1.25);
    feed(D, 60, 3000); // warm-up
    expect(feed(D, 30, DRS_WINDOW_MS * 6)).toEqual([1.15, 1.05, 0.95, 0.85, 0.8]);
  });
  it('creeps back up 0.05 at a time only with headroom, and not right after a change', () => {
    const D = newDrs(1.25);
    feed(D, 60, 3000);
    feed(D, 30, DRS_WINDOW_MS * 2 + 50); // 1.15, 1.05
    expect(D.scale).toBe(1.05);
    D.t = D.sum = D.n = 0; // start the fast frames on a fresh window
    expect(feed(D, 70, DRS_UP_HOLD_MS - 500)).toEqual([]); // held
    const up = feed(D, 70, DRS_UP_HOLD_MS * 3);
    expect(up[0]).toBe(1.1);
    expect(Math.max(...up)).toBeLessThanOrEqual(1.25);
  });
  it('a steady 50 fps on a desktop (between 45 and 57) keeps the scale', () => {
    const D = newDrs(1.25);
    expect(feed(D, 50, 60000)).toEqual([]);
  });
  it('phones use their own 24 / 29 fps thresholds (#458 used the desktop 45 / 57 everywhere)', () => {
    const D = newDrs(1.0);
    expect(feed(D, 30, 60000, 0.8, 1.0, MOB)).toEqual([]); // a phone at its 30 fps cap keeps full sharpness
    expect(feed(D, 26, 60000, 0.8, 1.0, MOB)).toEqual([]); // 26: between the thresholds
    expect(feed(D, 20, DRS_WINDOW_MS * 3 + 50, 0.8, 1.0, MOB)).toEqual([0.9, 0.8]);
    D.t = D.sum = D.n = 0;
    const up = feed(D, 30, DRS_UP_HOLD_MS * 3, 0.8, 1.0, MOB);
    expect(up[0]).toBe(0.85);
    expect(Math.max(...up)).toBeLessThanOrEqual(1.0);
  });
  it('runs only in play, when the level has it and 清晰度倍率 is not fixed by hand or URL', () => {
    const g = (o = {}) => ({
      state: 'play',
      gfx: { dynRes: true },
      settings: {},
      _gfxOpts: { url: {} },
      ...o,
    });
    expect(drsActive(g())).toBe(true);
    expect(drsActive(g({ state: 'title' }))).toBe(false);
    expect(drsActive(g({ gfx: { dynRes: false } }))).toBe(false);
    expect(drsActive(g({ settings: { gfx: { dprCap: 1.1 } } }))).toBe(false);
    expect(drsActive(g({ _gfxOpts: { url: { dprCap: 1 } } }))).toBe(false);
  });
});
