// Display-setting sweep for tools/run_bench.mjs --sweep: one short fixed-route sample per live setting
// (src/core/GraphicsConfig.js LIVE_KEYS, switched with game.applyDisplaySettings(patch, { save: false })).
// Reload-only settings (materialMode, antialias, crowdTier) need a fresh page: compare two runs with ?mat= / ?aa=.

// seg: which benchmark segment samples it ('day' street, 'air', 'night' street — lamps only matter at night)
export const DEFAULT_SWEEP = Object.freeze([
  { label: '基準（檔位預設）', seg: 'day', patch: {} },
  ...[0.8, 1.0, 1.15, 1.25, 1.5].map((d) => ({
    label: `dprCap ${d}`,
    seg: 'day',
    patch: { dprCap: d },
  })),
  ...['off', 'low', 'medium'].map((v) => ({
    label: `shadows ${v}`,
    seg: 'day',
    patch: { shadows: v },
  })),
  ...['hemi', 'pmrem'].map((v) => ({ label: `envLight ${v}`, seg: 'day', patch: { envLight: v } })),
  ...['off', 'bloom-quarter'].map((v) => ({
    label: `postFx ${v}`,
    seg: 'day',
    patch: { postFx: v },
  })),
  { label: '基準（夜間）', seg: 'night', patch: {} },
  ...[0, 4].map((n) => ({ label: `nightLamps ${n}`, seg: 'night', patch: { nightLamps: n } })),
]);

const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '-');
const pct = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b ? ((a - b) / b) * 100 : null);
const sign = (p) => (p == null ? '-' : `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`);

// Markdown table; deltas are against the preset sample of the same segment
export function formatSweepMarkdown(sweep) {
  const rows = sweep?.rows || [];
  const base = {};
  for (const r of rows) if (!Object.keys(r.patch || {}).length && !base[r.seg]) base[r.seg] = r;
  const lines = [
    `### 顯示設定邊際成本掃描（每項 ${sweep?.time ?? '-'} 秒固定路線，同一頁面即時切換）`,
    '',
    '| 設定 | 路段 | 平均 FPS | Δ FPS | 1% 低 | p95 (ms) | 邏輯 JS (ms) | 繪圖提交 (ms) | Δ 繪圖 | Draw Calls | Triangles | Shaders | PMREM 重烘 |',
    '| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const r of rows) {
    const b = base[r.seg];
    const isBase = b === r;
    lines.push(
      `| ${r.label} | ${r.seg} | \`${f(r.fps)}\` | ${isBase ? '—' : sign(pct(r.fps, b?.fps))} | \`${f(r.low1)}\` | \`${f(r.p95)}\` | \`${f(r.logicMs, 2)}\` | \`${f(r.renderMs, 2)}\` | ${isBase ? '—' : sign(pct(r.renderMs, b?.renderMs))} | \`${f(r.calls, 0)}\` | \`${Number.isFinite(r.tris) ? `${Math.round(r.tris / 1000)}k` : '-'}\` | \`${r.programs ?? '-'}\` | \`${r.bakes ?? '-'}\` |`
    );
  }
  return lines.join('\n');
}
