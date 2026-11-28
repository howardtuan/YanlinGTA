import { describe, it, expect } from 'vitest';
import {
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
