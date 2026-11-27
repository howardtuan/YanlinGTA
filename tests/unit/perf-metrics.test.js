import { describe, expect, it } from 'vitest';
import {
  aggregateRuns,
  budgetViolations,
  compareReports,
  envMismatch,
  frameStats,
  median,
  percentile,
  formatMarkdown,
} from '../../tools/perf/metrics.mjs';

const run = (over = {}) => ({
  boot: { toTitleMs: 10000, bootDiagMs: 9000, resourceCount: 20, transferKB: 5000 },
  memory: {
    canvasMB: 1800,
    peakCanvasMB: 1950,
    canvasCount: 3000,
    canvasInDom: 3,
    textureEstMB: 1700,
    textureCount: 700,
    jsHeapMB: 280,
    domNodes: 4000,
    topCanvasSizes: [{ size: '256x192', count: 10, mb: 1 }],
  },
  spots: [
    {
      name: 'a',
      frame: { fps: 60, p50: 16.7, p95: 17, p99: 20, max: 40, stalls50: 0 },
      cpu: { renderMean: 3, updateMean: 2 },
      render: { calls: 2000, triangles: 4000000, textures: 500, geometries: 2000 },
    },
  ],
  ...over,
});

describe('perf metrics helpers', () => {
  it('median handles odd, even, empty and NaN', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(median([NaN, 5])).toBe(5);
  });

  it('percentile is nearest-rank on a sorted list', () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(s, 0.5)).toBe(5);
    expect(percentile(s, 0.95)).toBe(10);
    expect(percentile([], 0.5)).toBeNull();
  });

  it('frameStats reports distribution and counts stalls above 50 ms', () => {
    const d = [...Array(98).fill(16.7), 60, 120];
    const s = frameStats(d);
    expect(s.frames).toBe(100);
    expect(s.p50).toBe(16.7);
    expect(s.max).toBe(120);
    expect(s.stalls50).toBe(2);
    expect(frameStats([])).toBeNull();
  });

  it('aggregateRuns takes the median and keeps the spread', () => {
    const a = run();
    const b = run({ boot: { ...run().boot, toTitleMs: 12000 } });
    const c = run({ boot: { ...run().boot, toTitleMs: 30000 } });
    const rep = aggregateRuns([a, b, c], { engine: 'chrome' });
    expect(rep.boot.toTitleMs).toBe(12000);
    expect(rep.boot.toTitleRange).toEqual([10000, 30000]);
    expect(rep.meta.runs).toBe(3);
    expect(rep.spots[0].render.calls).toBe(2000);
  });

  it('compareReports flags memory growth as failure and ignores noise inside tolerance', () => {
    const base = aggregateRuns([run()], { frameTimeReliable: true });
    const noisy = run();
    noisy.memory.canvasMB = 1830; // +1.7%
    expect(compareReports(aggregateRuns([noisy], { frameTimeReliable: true }), base).ok).toBe(true);
    const worse = run();
    worse.memory.canvasMB = 2100; // +16%
    const cmp = compareReports(aggregateRuns([worse], { frameTimeReliable: true }), base);
    expect(cmp.ok).toBe(false);
    expect(cmp.regressions[0].label).toBe('Canvas MB');
  });

  it('compareReports reports improvements and skips frame times when unreliable', () => {
    const base = aggregateRuns([run()], { frameTimeReliable: false });
    const better = run();
    better.memory.canvasMB = 200;
    better.spots[0].frame.p95 = 99;
    const cmp = compareReports(aggregateRuns([better], { frameTimeReliable: false }), base);
    expect(cmp.ok).toBe(true);
    expect(cmp.improvements.some((r) => r.label === 'Canvas MB')).toBe(true);
    expect(cmp.regressions).toHaveLength(0);
  });

  it('budgetViolations checks the post-GC canvas and peak canvas ceilings', () => {
    const rep = aggregateRuns([run()]);
    expect(rep.memory.peakCanvasMB).toBe(1950);
    expect(budgetViolations(rep, { maxCanvasMB: 220 })).toHaveLength(1);
    expect(budgetViolations(rep, { maxCanvasMB: 5000 })).toHaveLength(0);
    expect(budgetViolations(rep, { maxCanvasMB: 16, maxPeakCanvasMB: 220 })).toEqual([
      'canvasMB 1800 > limit 16',
      'peakCanvasMB 1950 > limit 220',
    ]);
    const within = aggregateRuns([
      run({ memory: { ...run().memory, canvasMB: 8.5, peakCanvasMB: 120 } }),
    ]);
    expect(budgetViolations(within, { maxCanvasMB: 16, maxPeakCanvasMB: 220 })).toEqual([]);
  });

  it('envMismatch lists the fields that differ between machines', () => {
    const a = { meta: { env: { cpu: 'M1', ramGB: 16 }, browser: 'Chrome/1', renderer: 'GPU-A' } };
    const b = { meta: { env: { cpu: 'M1', ramGB: 32 }, browser: 'Chrome/1', renderer: 'GPU-B' } };
    expect(envMismatch(a, a)).toHaveLength(0);
    expect(envMismatch(a, b).map((d) => d.key)).toEqual(['ramGB', 'renderer']);
  });

  it('formatMarkdown flags unreliable frame times', () => {
    const rep = aggregateRuns([run()], { engine: 'chrome', frameTimeReliable: false, runs: 1 });
    expect(formatMarkdown(rep)).toContain('不具代表性');
  });
});
