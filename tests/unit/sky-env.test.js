import { describe, it, expect } from 'vitest';
import { envKey, ENV_MIN_GAP } from '../../src/graphics/SkySystem.js';

describe('PMREM re-bake throttle (#443)', () => {
  it('a steady sky keeps its key; small drifts do not change it', () => {
    expect(envKey(0.8, 0, 0)).toBe(envKey(0.81, 0, 0));
    expect(envKey(-0.5, 1, 0)).toBe(envKey(-0.52, 0.99, 0));
  });
  it('the sky changes key only every few percent', () => {
    let changes = 0,
      prev = null;
    // a full sunset: 100 game minutes = 400 s at 1 game minute per 4 s
    for (let s = 0; s <= 400; s += 1) {
      const k = envKey(0.3 - s / 1000, s / 400, Math.max(0, 1 - Math.abs(s - 200) / 200));
      if (k !== prev) changes++;
      prev = k;
    }
    expect(changes).toBeLessThan(400 / ENV_MIN_GAP); // fewer keys than the gap would even allow
    expect(ENV_MIN_GAP).toBeGreaterThanOrEqual(5);
  });
});
