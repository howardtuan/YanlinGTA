// Pure helpers for the profile harness (no browser, no I/O): statistics, run aggregation,
// baseline comparison and Markdown output. Unit-tested in tests/unit/perf-metrics.test.js.

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function percentile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

const r1 = (n) => (n == null ? null : Number(n.toFixed(1)));
const r2 = (n) => (n == null ? null : Number(n.toFixed(2)));

/** Summarise a list of frame intervals (ms): p50/p95/p99/max, fps and stall counts. */
export function frameStats(deltas) {
  const d = deltas.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!d.length) return null;
  const sum = d.reduce((a, b) => a + b, 0);
  return {
    frames: d.length,
    fps: r1((d.length * 1000) / sum),
    p50: r2(percentile(d, 0.5)),
    p95: r2(percentile(d, 0.95)),
    p99: r2(percentile(d, 0.99)),
    max: r1(d[d.length - 1]),
    stalls50: d.filter((x) => x > 50).length,
  };
}

/** Mean / p95 of a list of CPU durations (ms). */
export function cpuStats(samples) {
  const d = samples.filter(Number.isFinite).sort((a, b) => a - b);
  if (!d.length) return null;
  return {
    mean: r2(d.reduce((a, b) => a + b, 0) / d.length),
    p95: r2(percentile(d, 0.95)),
  };
}

function medianOf(runs, pick) {
  return median(runs.map(pick).filter((x) => x != null));
}

function range(runs, pick) {
  const v = runs
    .map(pick)
    .filter((x) => x != null)
    .sort((a, b) => a - b);
  return v.length ? [v[0], v[v.length - 1]] : null;
}

/**
 * Merge N single-run results into one report using the median of each metric (ranges kept for the
 * noisy ones). A run looks like { boot, memory, spots: [{ name, frame, cpu, render, ... }] }.
 */
export function aggregateRuns(runs, meta = {}) {
  if (!runs.length) throw new Error('aggregateRuns: no runs');
  const first = runs[0];
  const bootKeys = ['toTitleMs', 'bootDiagMs', 'resourceCount', 'transferKB'];
  const boot = {};
  for (const k of bootKeys) boot[k] = medianOf(runs, (r) => r.boot?.[k]);
  boot.toTitleRange = range(runs, (r) => r.boot?.toTitleMs);

  const memKeys = [
    'canvasMB',
    'peakCanvasMB',
    'canvasCount',
    'canvasInDom',
    'textureEstMB',
    'textureCount',
    'jsHeapMB',
    'domNodes',
  ];
  const memory = {};
  for (const k of memKeys) memory[k] = medianOf(runs, (r) => r.memory?.[k]);
  memory.topCanvasSizes = first.memory?.topCanvasSizes || [];

  const spots = first.spots.map((s, i) => {
    const at = (r) => r.spots[i];
    const f = (k) => medianOf(runs, (r) => at(r)?.frame?.[k]);
    const c = (k) => medianOf(runs, (r) => at(r)?.cpu?.[k]);
    return {
      name: s.name,
      frame: {
        fps: f('fps'),
        p50: f('p50'),
        p95: f('p95'),
        p99: f('p99'),
        max: f('max'),
        stalls50: f('stalls50'),
        p95Range: range(runs, (r) => at(r)?.frame?.p95),
      },
      cpu: {
        renderMean: c('renderMean'),
        updateMean: c('updateMean'),
      },
      render: {
        calls: medianOf(runs, (r) => at(r)?.render?.calls),
        triangles: medianOf(runs, (r) => at(r)?.render?.triangles),
        textures: medianOf(runs, (r) => at(r)?.render?.textures),
        geometries: medianOf(runs, (r) => at(r)?.render?.geometries),
      },
    };
  });
  return { meta: { ...meta, runs: runs.length }, boot, memory, spots };
}

// metric path, label, max allowed relative increase, 'fail' | 'warn'
export const COMPARE_RULES = Object.freeze([
  { path: 'memory.canvasMB', label: 'Canvas MB', tol: 0.05, level: 'fail' },
  { path: 'memory.peakCanvasMB', label: 'Canvas 峰值 MB', tol: 0.05, level: 'fail' },
  { path: 'memory.canvasCount', label: 'Canvas 數', tol: 0.05, level: 'fail' },
  { path: 'memory.textureEstMB', label: '貼圖估算 MB', tol: 0.05, level: 'fail' },
  { path: 'memory.jsHeapMB', label: 'JS heap MB', tol: 0.1, level: 'warn' },
  { path: 'boot.toTitleMs', label: '啟動到標題 ms', tol: 0.25, level: 'warn' },
]);
export const SPOT_RULES = Object.freeze([
  // observed run-to-run noise of calls/tris is ~3–4% (traffic and crowds move), so 8%
  { path: 'render.calls', label: 'Draw calls', tol: 0.08, level: 'fail' },
  { path: 'render.triangles', label: '三角形', tol: 0.08, level: 'fail' },
  {
    path: 'frame.p95',
    label: '幀時間 p95 ms',
    tol: 0.15,
    level: 'warn',
    needsReliableFrames: true,
  },
]);

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

/** Compare a fresh report with a stored baseline; returns { regressions, improvements, ok }. */
export function compareReports(
  current,
  baseline,
  { rules = COMPARE_RULES, spotRules = SPOT_RULES } = {}
) {
  const regressions = [];
  const improvements = [];
  const frameOk = current.meta?.frameTimeReliable && baseline.meta?.frameTimeReliable;
  const check = (where, rule, cur, base) => {
    if (cur == null || base == null || base === 0) return;
    if (rule.needsReliableFrames && !frameOk) return;
    const ratio = cur / base - 1;
    const row = { where, label: rule.label, base, cur, pct: Number((ratio * 100).toFixed(1)) };
    if (ratio > rule.tol) regressions.push({ ...row, level: rule.level });
    else if (ratio < -rule.tol) improvements.push(row);
  };
  for (const rule of rules)
    check('global', rule, get(current, rule.path), get(baseline, rule.path));
  for (const s of current.spots || []) {
    const b = (baseline.spots || []).find((x) => x.name === s.name);
    if (!b) continue;
    for (const rule of spotRules) check(s.name, rule, get(s, rule.path), get(b, rule.path));
  }
  return { regressions, improvements, ok: !regressions.some((r) => r.level === 'fail') };
}

const ENV_KEYS = ['os', 'cpu', 'ramGB', 'browser', 'renderer', 'viewport', 'engine'];

/** Which environment fields differ between two reports (numbers from different machines don't compare). */
export function envMismatch(current, baseline) {
  const pick = (m) => ({
    ...(m?.env || {}),
    browser: m?.browser,
    renderer: m?.renderer,
    viewport: m?.viewport,
    engine: m?.engine,
  });
  const a = pick(current.meta);
  const b = pick(baseline.meta);
  return ENV_KEYS.filter((k) => a[k] != null && b[k] != null && a[k] !== b[k]).map((k) => ({
    key: k,
    current: a[k],
    baseline: b[k],
  }));
}

/** Hard memory budget gate (e.g. iOS): returns violation strings. */
export function budgetViolations(report, { maxCanvasMB, maxPeakCanvasMB } = {}) {
  const out = [];
  const mb = report.memory?.canvasMB;
  if (maxCanvasMB != null && mb != null && mb > maxCanvasMB) {
    out.push(`canvasMB ${mb} > limit ${maxCanvasMB}`);
  }
  const peak = report.memory?.peakCanvasMB;
  if (maxPeakCanvasMB != null && peak != null && peak > maxPeakCanvasMB) {
    out.push(`peakCanvasMB ${peak} > limit ${maxPeakCanvasMB}`);
  }
  return out;
}

const cell = (v, suffix = '') => (v == null ? '-' : `${v}${suffix}`);

export function formatMarkdown(report) {
  const m = report.meta;
  const reliable = m.frameTimeReliable;
  const peakTxt =
    report.memory.peakCanvasMB != null ? `，峰值 ${cell(report.memory.peakCanvasMB, ' MB')}` : '';
  const lines = [
    `**${m.engine}${m.mobile ? ' · mobile' : ' · desktop'} · ${m.renderer || '?'}** — tier \`${m.tier || '-'}\`, quality \`${m.quality || '-'}\`, ${m.runs} run(s), ${
      m.uncapped ? 'vsync 解除' : 'vsync 開'
    }${reliable ? '' : '，**軟體渲染：幀時間不具代表性（僅供相對比較）**'}`,
    '',
    '| 記憶體 / 啟動 | 值 |',
    '| :--- | :--- |',
    `| Canvas | ${cell(report.memory.canvasMB, ' MB')} (${cell(report.memory.canvasCount)} 個，DOM 內 ${cell(report.memory.canvasInDom)}${peakTxt}) |`,
    `| 貼圖估算 (GPU, 含 mip) | ${cell(report.memory.textureEstMB, ' MB')} (${cell(report.memory.textureCount)} 張) |`,
    `| JS heap | ${cell(report.memory.jsHeapMB, ' MB')} |`,
    `| 啟動到標題 | ${cell(report.boot.toTitleMs, ' ms')}${report.boot.toTitleRange ? ` (範圍 ${report.boot.toTitleRange[0]}–${report.boot.toTitleRange[1]})` : ''} |`,
    `| 載入資源 | ${cell(report.boot.resourceCount)} 個 / ${cell(report.boot.transferKB, ' KB')} |`,
    '',
    `| 機位 | fps${reliable ? '' : '†'} | p50 ms | p95 ms | p99 ms | max ms | >50ms | render CPU | update CPU | Calls | Tris | Tex | Geo |`,
    '| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const s of report.spots) {
    lines.push(
      `| ${s.name} | ${cell(s.frame.fps)} | ${cell(s.frame.p50)} | ${cell(s.frame.p95)} | ${cell(s.frame.p99)} | ${cell(s.frame.max)} | ${cell(s.frame.stalls50)} | ${cell(s.cpu.renderMean, ' ms')} | ${cell(s.cpu.updateMean, ' ms')} | ${cell(s.render.calls)} | ${s.render.triangles == null ? '-' : `${Math.round(s.render.triangles / 1000)}k`} | ${cell(s.render.textures)} | ${cell(s.render.geometries)} |`
    );
  }
  if (report.memory.topCanvasSizes?.length) {
    lines.push('', '最大宗 canvas 尺寸 (尺寸 × 個數 = 合計 MB)：');
    for (const t of report.memory.topCanvasSizes)
      lines.push(`- ${t.size} × ${t.count} = ${t.mb} MB`);
  }
  return lines.join('\n');
}

export function formatComparison(cmp) {
  const lines = [];
  const row = (r) =>
    `- [${r.level || 'ok'}] ${r.where} · ${r.label}: ${r.base} → ${r.cur} (${r.pct > 0 ? '+' : ''}${r.pct}%)`;
  if (cmp.regressions.length) lines.push('退步：', ...cmp.regressions.map(row));
  if (cmp.improvements.length) lines.push('進步：', ...cmp.improvements.map(row));
  if (!lines.length) lines.push('與基線相比沒有超出容許範圍的變化。');
  return lines.join('\n');
}
