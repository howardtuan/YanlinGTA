import { describe, it, expect } from 'vitest';
import { frameSummary, bottleneck, verdict } from '../../src/systems/Benchmark.js';

describe('Benchmark statistics', () => {
  it('summarises a steady 60 fps run', () => {
    const dt = Array(600).fill(1000 / 60);
    const s = frameSummary(dt, Array(600).fill(5));
    expect(s.avgFps).toBeCloseTo(60, 5);
    expect(s.low1).toBeCloseTo(60, 5);
    expect(s.stutters).toBe(0);
    expect(s.cpuAvg).toBe(5);
    expect(bottleneck(s).key).toBe('vsync');
    expect(verdict(s)).toContain('流暢');
  });

  it('counts stutters and lowers the 1% low', () => {
    const dt = Array(1000).fill(20);
    for (let i = 0; i < 20; i++) dt[i * 50] = 120;
    const s = frameSummary(dt, Array(1000).fill(4));
    expect(s.stutters).toBe(20);
    expect(s.low1).toBeCloseTo(1000 / 120, 5);
    expect(s.minFps).toBeCloseTo(1000 / 120, 5);
    expect(s.maxFps).toBeCloseTo(50, 5);
    expect(bottleneck(s).key).toBe('gpu');
  });

  it('flags the CPU when the game JS fills the frame', () => {
    const s = frameSummary(Array(300).fill(40), Array(300).fill(36));
    expect(bottleneck(s).key).toBe('cpu');
    expect(verdict(s)).toContain('偏卡');
  });

  it('returns null for an empty run', () => {
    expect(frameSummary([])).toBeNull();
  });
});
