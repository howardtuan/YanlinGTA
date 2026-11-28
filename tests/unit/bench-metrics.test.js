import { describe, it, expect } from 'vitest';
import {
  SEGMENTS,
  CORE_STOPS,
  planSegments,
  sceneStats,
  topZones,
  frameSummary,
} from '../../src/systems/Benchmark.js';
import { DEFAULT_SWEEP, formatSweepMarkdown } from '../../tools/perf/sweep_lib.mjs';
import { buildCompactRecord, formatPrPerfSection } from '../../tools/perf/history_lib.mjs';

describe('benchmark route plan', () => {
  it('day and night run the same core route for the same time', () => {
    const day = SEGMENTS.find((s) => s.key === 'day'),
      night = SEGMENTS.find((s) => s.key === 'night');
    expect(night.route).toBe('day');
    expect(night.stops).toEqual(day.stops);
    expect(night.time).toBe(day.time);
    // #452: 校門口 → 資管樓 → 進活動中心 → 進力行大樓 → 體育館
    expect(CORE_STOPS.map((s) => s.name)).toEqual([
      '校門口',
      '資訊管理學系',
      '學生活動中心（B1 大廳）',
      '學生活動中心（東側）',
      '力行大樓 1F 室內（西）',
      '力行大樓 1F 室內（東）',
      '中原大學體育館',
    ]);
    expect(SEGMENTS.reduce((a, s) => a + s.time + 3, 0)).toBe(155);
  });

  it('planSegments picks segments and overrides their time', () => {
    expect(planSegments().map((s) => s.key)).toEqual(['day', 'air', 'night']);
    const p = planSegments({ segments: ['night'], time: 8 });
    expect(p).toHaveLength(1);
    expect(p[0].key).toBe('night');
    expect(p[0].time).toBe(8);
    expect(SEGMENTS.find((s) => s.key === 'night').time).not.toBe(8); // not mutated
  });
});

describe('scene structure stats', () => {
  it('counts nodes, meshes, auto-matrix nodes, casters and unique materials by kind', () => {
    const std = { isMeshStandardMaterial: true },
      lam = { isMeshLambertMaterial: true },
      bas = { isMeshBasicMaterial: true };
    const nodes = [
      { matrixAutoUpdate: true },
      { isMesh: true, matrixAutoUpdate: false, castShadow: true, material: std },
      { isMesh: true, matrixAutoUpdate: true, castShadow: false, material: [std, lam] },
      { isInstancedMesh: true, matrixAutoUpdate: false, castShadow: true, material: bas },
      { matrixAutoUpdate: false },
    ];
    const s = sceneStats({ traverse: (f) => nodes.forEach(f) });
    expect(s).toMatchObject({
      objects: 5,
      meshes: 3,
      autoMatrix: 2,
      shadowCasters: 2,
      materials: 3,
      standard: 1,
      lambert: 1,
      basic: 1,
    });
  });

  it('topZones sorts by build time', () => {
    expect(
      topZones(
        [
          { name: 'a', ms: 5 },
          { name: 'b', ms: 50 },
          { name: 'c', ms: 20 },
        ],
        2
      )
    ).toEqual([
      { name: 'b', ms: 50 },
      { name: 'c', ms: 20 },
    ]);
    expect(topZones(undefined)).toEqual([]);
  });

  it('frameSummary reports the longest frame', () => {
    expect(frameSummary([10, 12, 40, 11]).maxFrameMs).toBe(40);
  });
});

describe('sweep report', () => {
  it('has a preset sample per segment it uses', () => {
    for (const seg of new Set(DEFAULT_SWEEP.map((s) => s.seg)))
      expect(DEFAULT_SWEEP.some((s) => s.seg === seg && !Object.keys(s.patch).length)).toBe(true);
  });

  it('formats deltas against the preset of the same segment', () => {
    const md = formatSweepMarkdown({
      time: 8,
      rows: [
        { label: '基準', seg: 'day', patch: {}, fps: 100, renderMs: 8 },
        { label: 'dprCap 1.5', seg: 'day', patch: { dprCap: 1.5 }, fps: 80, renderMs: 10 },
        { label: '基準（夜間）', seg: 'night', patch: {}, fps: 50, renderMs: 12 },
        { label: 'nightLamps 4', seg: 'night', patch: { nightLamps: 4 }, fps: 45, renderMs: 13.2 },
      ],
    });
    expect(md).toContain('| dprCap 1.5 | day | `80.0` | -20.0% |');
    expect(md).toContain('| nightLamps 4 | night | `45.0` | -10.0% |');
    expect(md).toContain('+25.0%');
  });
});

describe('perf record: boot stages, scene and bake counts', () => {
  it('keeps the new ledgers in the compact record and the PR section', () => {
    const rec = buildCompactRecord({
      boot: {
        toTitleMs: 12000,
        bootDiagMs: 11000,
        toPlayMs: 350,
        stages: [
          { step: 'build-world', ms: 2400.4 },
          { step: 'compile-shaders', ms: 3500 },
        ],
        topZones: [{ name: '力行', ms: 900 }],
      },
      bench: {
        overall: { avgFps: 60 },
        envBakeCount: 3,
        scene: {
          objects: 100,
          meshes: 80,
          autoMatrix: 40,
          materials: 20,
          standard: 15,
          lambert: 4,
          basic: 1,
          shadowCasters: 30,
        },
        segments: [
          { key: 'night', avgFps: 50, minFps: 20, maxFrameMs: 49.6, envBakeCount: 2, routeM: 1200 },
        ],
      },
    });
    expect(rec.boot.stages).toEqual({ 'build-world': 2400, 'compile-shaders': 3500 });
    expect(rec.boot.toPlayMs).toBe(350);
    expect(rec.scene.stdMats).toBe(15);
    expect(rec.bench.bakes).toBe(3);
    expect(rec.bench.seg.night).toMatchObject({
      minFps: 20,
      maxFrameMs: 49.6,
      bakes: 2,
      routeM: 1200,
    });
    const md = formatPrPerfSection(rec);
    expect(md).toContain('點擊開始至可操控');
    expect(md).toContain('build-world `2400`');
    expect(md).toContain('PMREM 重烘次數');
  });
});
