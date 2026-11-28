import { describe, it, expect } from 'vitest';
import {
  drsStep,
  drsActive,
  newDrs,
  DRS_WINDOW_MS,
  DRS_UP_HOLD_MS,
  autoQualityActive,
  autoQualityStep,
  newAutoQ,
  AUTOQ_WINDOW_MS,
} from '../../src/core/GameLoop.js';

// feed `ms` of frames at a steady frame rate; returns the fps of a step-down (or null)
function run(A, fps, ms) {
  const dt = 1000 / fps;
  let hit = null;
  for (let t = 0; t < ms; t += dt) {
    const r = autoQualityStep(A, dt);
    if (r != null) hit = r;
  }
  return hit;
}

describe('autoQuality (#455)', () => {
  it('only runs in pure 自動 (no manual level, no ⚙ 細部顯示設定, not already at xlow)', () => {
    expect(autoQualityActive({ quality: 'auto' }, 'low')).toBe(true);
    expect(autoQualityActive({}, 'medium')).toBe(true);
    expect(autoQualityActive({ quality: 'auto', gfx: {} }, 'low')).toBe(true);
    expect(autoQualityActive({ quality: 'low' }, 'low')).toBe(false);
    expect(autoQualityActive({ quality: 'auto', gfx: { dprCap: 1.2 } }, 'low')).toBe(false);
    expect(autoQualityActive({ quality: 'auto' }, 'xlow')).toBe(false);
  });

  it('a phone capped at 30 fps never steps down', () => {
    const A = newAutoQ();
    expect(run(A, 30, 60000)).toBeNull();
    expect(run(A, 25, 30000)).toBeNull(); // still above 20
  });

  it('a single slow 3 s window does not step down; two in a row do', () => {
    const A = newAutoQ();
    run(A, 60, AUTOQ_WINDOW_MS); // warm-up
    expect(run(A, 15, AUTOQ_WINDOW_MS)).toBeNull(); // one slow window
    expect(run(A, 60, AUTOQ_WINDOW_MS)).toBeNull(); // recovered: counter reset
    expect(run(A, 15, AUTOQ_WINDOW_MS)).toBeNull();
    const fps = run(A, 15, AUTOQ_WINDOW_MS + 100);
    expect(fps).toBeGreaterThan(14);
    expect(fps).toBeLessThan(16);
  });

  it('ignores background-tab frames and warms up again after a step', () => {
    const A = newAutoQ();
    expect(autoQualityStep(A, 5000)).toBeNull();
    run(A, 60, AUTOQ_WINDOW_MS);
    expect(run(A, 10, AUTOQ_WINDOW_MS * 2 + 200)).not.toBeNull();
    expect(A.warm).toBeLessThan(AUTOQ_WINDOW_MS); // a fresh warm-up for the new level
  });
});

describe('dynamic resolution (#438)', () => {
  const feed = (D, fps, ms, min = 0.8, cap = 1.25) => {
    const dt = 1000 / fps,
      out = [];
    for (let t = 0; t < ms; t += dt) {
      const r = drsStep(D, dt, min, cap);
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
  it('a steady 50 fps (between the thresholds) keeps the scale', () => {
    const D = newDrs(1.25);
    expect(feed(D, 50, 60000)).toEqual([]);
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
