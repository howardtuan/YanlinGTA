import { describe, expect, it } from 'vitest';
import {
  buildCompactRecord,
  cleanGpuName,
  compareRecords,
  extractPerfTag,
  formatComparisonMarkdown,
  formatPrPerfSection,
  formatTimelineMarkdown,
  injectPerfSectionIntoPrBody,
  normalizeGpuKey,
  parseJsonl,
  serializeJsonl,
  upsertRecords,
} from '../../tools/perf/history_lib.mjs';

function makeReport(overrides = {}) {
  return {
    startedAt: '2026-11-27T08:00:00.000Z',
    git: { commit: 'a1b2c3d', branch: 'feat/test', pr: 371 },
    config: {
      profile: 'iphone (430x932@3x)',
      quality: 'low',
      uncapped: true,
    },
    hardware: {
      os: 'Linux 6.8 (linux/x64)',
      cpu: 'AMD Ryzen 7 × 16',
      ramGB: 32,
      browser: 'Chrome/131.0.0.0',
      renderer: 'ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 3070 Ti/PCIe/SSE2, OpenGL 4.5.0)',
      softwareRenderer: false,
    },
    boot: {
      toTitleMs: 4200,
      bootDiagMs: 3900,
      resourceCount: 32,
      transferKB: 11600,
    },
    perf: {
      tier: 'mobile-lite',
      quality: 'low',
      canvasMB: 185.4,
      canvasCount: 120,
      canvasInDom: 3,
      textureEstMB: 420.5,
      textureCount: 310,
      geometries: 1400,
      programs: 38,
      jsHeapMB: 210.2,
    },
    bench: {
      calls: 820,
      tris: 1650000,
      heapMaxMB: 245,
      overall: {
        avgFps: 142.4,
        low1: 95.2,
        p50: 7.0,
        p95: 9.8,
        stutters: 1,
        logicAvg: 2.4,
        renderAvg: 3.1,
      },
      segments: [
        {
          key: 'day',
          name: '校園街道（白天）',
          avgFps: 150.1,
          low1: 102.0,
          p50: 6.6,
          p95: 9.1,
          logicAvg: 2.5,
          renderAvg: 2.9,
          calls: 780,
          tris: 1500000,
        },
        {
          key: 'air',
          name: '空拍',
          avgFps: 118.5,
          low1: 82.4,
          p50: 8.4,
          p95: 11.2,
          logicAvg: 2.1,
          renderAvg: 4.0,
          calls: 1120,
          tris: 2450000,
        },
        {
          key: 'night',
          name: '夜間街道',
          avgFps: 148.0,
          low1: 98.0,
          p50: 6.8,
          p95: 9.5,
          logicAvg: 2.5,
          renderAvg: 3.0,
          calls: 760,
          tris: 1420000,
        },
      ],
    },
    ...overrides,
  };
}

describe('perf history library', () => {
  it('cleans and normalizes ANGLE / Metal / NVIDIA GPU strings consistently', () => {
    expect(
      cleanGpuName('ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 3070 Ti/PCIe/SSE2, OpenGL 4.5.0)')
    ).toBe('NVIDIA GeForce RTX 3070 Ti');
    expect(
      cleanGpuName('ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)')
    ).toBe('Apple M2 Pro');
    expect(
      normalizeGpuKey('ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti (0x00002482) Direct3D11)')
    ).toBe(
      normalizeGpuKey(
        'ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 3070 Ti/PCIe/SSE2, OpenGL 4.5.0)'
      )
    );
  });

  it('round-trips compact yanlin-perf:v1 records inside PR Markdown sections', () => {
    const rec = buildCompactRecord(makeReport(), { title: 'refactor(world): batch planes' });
    const md = formatPrPerfSection(rec);
    expect(md).toContain('## 效能與運行環境紀錄 (Performance & Hardware)');
    expect(md).toContain('NVIDIA GeForce RTX 3070 Ti');
    expect(md).toContain('<= 220 MB');
    const parsed = extractPerfTag(md);
    expect(parsed).toEqual(rec);
  });

  it('replaces the performance section in a PR body idempotently without touching other sections', () => {
    const templateBody = [
      '## 變更內容與設計說明 (What & Why)',
      '',
      '新增路邊機車塗裝與貼圖合併。',
      '',
      '## 效能與運行環境紀錄 (Performance & Hardware)',
      '',
      '- [ ] 舊模板占位文字',
      '',
      '## 其他備註 (Notes)',
      '',
      '保留這段文字。',
    ].join('\n');

    const rec = buildCompactRecord(makeReport());
    const section = formatPrPerfSection(rec);
    const once = injectPerfSectionIntoPrBody(templateBody, section);
    const twice = injectPerfSectionIntoPrBody(once, section);

    expect(once).toBe(twice);
    expect(once).toContain('新增路邊機車塗裝與貼圖合併。');
    expect(once).toContain('## 其他備註 (Notes)\n\n保留這段文字。');
    expect(once).not.toContain('舊模板占位文字');
    expect(extractPerfTag(once)?.pr).toBe(371);
  });

  it('upserts and deduplicates JSONL records by PR number', () => {
    const r1 = buildCompactRecord(makeReport(), { pr: 372, at: '2026-11-27T09:00:00Z' });
    const r2 = buildCompactRecord(makeReport(), { pr: 371, at: '2026-11-27T08:00:00Z' });
    const r2Updated = { ...r2, mem: { ...r2.mem, canvasMB: 160 } };

    const merged = upsertRecords([r1], [r2, r2Updated]);
    const roundTrip = parseJsonl(serializeJsonl(merged));
    expect(roundTrip.map((r) => r.pr)).toEqual([371, 372]);
    expect(roundTrip[0].mem.canvasMB).toBe(160);
    expect(formatTimelineMarkdown(roundTrip)).toContain('#371');
  });

  it('separates cross-machine workload deltas from GPU-specific timings on mixed Mac + Linux teams', () => {
    const linuxOld = buildCompactRecord(
      makeReport({
        git: { commit: '1111111', branch: 'main', pr: 368 },
        perf: { ...makeReport().perf, canvasMB: 900 },
        bench: {
          ...makeReport().bench,
          calls: 1500,
          overall: { ...makeReport().bench.overall, avgFps: 110 },
        },
      }),
      { pr: 368, title: 'earlier linux run' }
    );

    const macPr = buildCompactRecord(
      makeReport({
        git: { commit: '2222222', branch: 'feat/map', pr: 370 },
        hardware: {
          ...makeReport().hardware,
          os: 'Darwin 27.2 (darwin/arm64)',
          cpu: 'Apple M2 Pro × 10',
          renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro)',
        },
        perf: { ...makeReport().perf, canvasMB: 850 },
        bench: {
          ...makeReport().bench,
          calls: 1400,
          overall: { ...makeReport().bench.overall, avgFps: 58 },
        },
      }),
      { pr: 370, title: 'teammate mac run' }
    );

    const linuxNew = buildCompactRecord(
      makeReport({
        git: { commit: '3333333', branch: 'refactor/opt', pr: 371 },
        perf: { ...makeReport().perf, canvasMB: 185.4 },
        bench: {
          ...makeReport().bench,
          calls: 820,
          overall: { ...makeReport().bench.overall, avgFps: 142.4 },
        },
      }),
      { pr: 371, title: 'linux opt run' }
    );

    const cmp = compareRecords(macPr, linuxNew, { sameGpuBaseline: linuxOld });
    expect(cmp.sameGpu).toBe(false);
    const canvasDiff = cmp.workload.find((w) => w.path === 'mem.canvasMB');
    expect(canvasDiff.trend).toBe('better');
    expect(canvasDiff.pct).toBeLessThan(-70);
    expect(cmp.sameGpuTiming).not.toBeNull();
    const sameGpuFps = cmp.sameGpuTiming.find((t) => t.path === 'bench.fps');
    expect(sameGpuFps.trend).toBe('better');

    const md = formatComparisonMarkdown(cmp);
    expect(md).toContain('來自不同宿主硬體');
    expect(md).toContain('同款 GPU 歷史對照');
  });
});
