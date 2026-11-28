// Pure helpers for PR performance records, PR body section injection, JSONL persistence,
// and on-demand cross-PR comparison (supporting mixed Mac M-series + Linux GPU teams).
// Unit-tested in tests/unit/perf-history.test.js.

export const IOS_CANVAS_BUDGET_MB = 220;
export const PERF_TAG_PREFIX = '<!-- yanlin-perf:v1 ';
export const PERF_SECTION_HEADING = '## 效能與運行環境紀錄 (Performance & Hardware)';

const PERF_MARKER_RE = /<!--\s*yanlin-perf:v1\s+(\{[^\n]*?\})\s*-->/;
const SOFTWARE_GPU_RE = /swiftshader|llvmpipe|software|basic render driver/i;

const r1 = (n) => (Number.isFinite(n) ? Number(n.toFixed(1)) : null);
const r2 = (n) => (Number.isFinite(n) ? Number(n.toFixed(2)) : null);
const rInt = (n) => (Number.isFinite(n) ? Math.round(n) : null);

/** Clean verbose ANGLE / PCI ID / driver suffixes from WebGL UNMASKED_RENDERER strings. */
export function cleanGpuName(raw) {
  if (!raw) return '未知';
  let s = String(raw).trim();
  const angle = s.match(/^ANGLE \((.*)\)$/);
  if (angle) {
    const parts = angle[1]
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const pick =
      parts.find((p) => /apple\s*m\d|geforce|radeon|iris|uhd|arc|swiftshader|llvmpipe/i.test(p)) ||
      parts[1] ||
      parts[0];
    if (pick) s = pick;
  }
  return s
    .replace(/^ANGLE Metal Renderer:\s*/i, '')
    .replace(/Direct3D.*$/i, '')
    .replace(/\/PCIe\/SSE2.*$/i, '')
    .replace(/\(0x[0-9a-f]+\)/gi, '')
    .replace(/\s+OpenGL.*$/i, '')
    .replace(/\s+Vulkan.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** Canonical lowercase key for matching records measured on the same GPU model. */
export function normalizeGpuKey(raw) {
  const cleaned = cleanGpuName(raw).toLowerCase();
  if (!cleaned || cleaned === '未知') return 'unknown';
  return cleaned
    .replace(/\b(nvidia|corporation|inc\.?|amd|intel\(r\)|intel)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isSoftwareGpu(raw) {
  return SOFTWARE_GPU_RE.test(String(raw || ''));
}

/** Build a compact (~550B) yanlin-perf:v1 record from a full run_bench report. */
export function buildCompactRecord(report, meta = {}) {
  const o = report.bench?.overall || {};
  const segList = report.bench?.segments || [];
  const seg = {};
  for (const s of segList) {
    seg[s.key] = {
      fps: r1(s.avgFps),
      low1: r1(s.low1),
      p50: r1(s.p50),
      p95: r1(s.p95),
      logicMs: r2(s.logicAvg),
      renderMs: r2(s.renderAvg),
      calls: rInt(s.calls),
      tris: rInt(s.tris),
      minFps: r1(s.minFps),
      maxFrameMs: r1(s.maxFrameMs),
      bakes: rInt(s.envBakeCount),
      routeM: rInt(s.routeM),
    };
  }
  const sc = report.bench?.scene || null;
  const stages = {};
  for (const st of report.boot?.stages || []) stages[st.step] = rInt(st.ms);
  const rawGpu = report.hardware?.renderer || '';
  return {
    v: 1,
    pr: meta.pr ?? report.git?.pr ?? null,
    sha: meta.sha ?? report.git?.commit ?? null,
    branch: meta.branch ?? report.git?.branch ?? null,
    at: meta.at ?? report.startedAt ?? new Date().toISOString(),
    title: meta.title ?? null,
    hw: {
      os: report.hardware?.os || '-',
      cpu: report.hardware?.cpu || '-',
      ram: report.hardware?.ramGB ?? null,
      browser: report.hardware?.browser || '-',
      gpu: cleanGpuName(rawGpu),
      gpuKey: normalizeGpuKey(rawGpu),
      sw: Boolean(report.hardware?.softwareRenderer ?? isSoftwareGpu(rawGpu)),
      profile: report.config?.profile || 'iphone (430x932@3x)',
      tier: report.perf?.tier || null,
      q: report.perf?.quality || report.config?.quality || 'low',
      uncap: Boolean(report.config?.uncapped),
    },
    mem: {
      canvasMB: r2(report.perf?.canvasMB),
      peakCanvasMB: r2(report.perf?.peakCanvasMB),
      canvasN: rInt(report.perf?.canvasCount),
      canvasDom: rInt(report.perf?.canvasInDom),
      texMB: r2(report.perf?.textureEstMB),
      texN: rInt(report.perf?.textureCount),
      heapMB: r1(report.perf?.jsHeapMB),
      heapPeakMB: rInt(report.bench?.heapMaxMB),
      geo: rInt(report.perf?.geometries),
      prog: rInt(report.perf?.programs),
      resN: rInt(report.boot?.resourceCount),
      kb: rInt(report.boot?.transferKB),
    },
    boot: {
      titleMs: rInt(report.boot?.toTitleMs),
      diagMs: rInt(report.boot?.bootDiagMs),
      toPlayMs: rInt(report.boot?.toPlayMs),
      stages,
      topZones: (report.boot?.topZones || []).map((z) => ({ name: z.name, ms: rInt(z.ms) })),
    },
    scene: sc
      ? {
          objects: rInt(sc.objects),
          meshes: rInt(sc.meshes),
          autoMatrix: rInt(sc.autoMatrix),
          materials: rInt(sc.materials),
          stdMats: rInt(sc.standard),
          lambertMats: rInt(sc.lambert),
          basicMats: rInt(sc.basic),
          shadowCasters: rInt(sc.shadowCasters),
        }
      : null,
    bench: {
      fps: r1(o.avgFps),
      low1: r1(o.low1),
      p50: r1(o.p50),
      p95: r1(o.p95),
      stutters: rInt(o.stutters),
      logicMs: r2(o.logicAvg),
      renderMs: r2(o.renderAvg),
      calls: rInt(report.bench?.calls),
      tris: rInt(report.bench?.tris),
      bakes: rInt(report.bench?.envBakeCount),
      seg,
    },
  };
}

export function serializePerfTag(record) {
  return `${PERF_TAG_PREFIX}${JSON.stringify(record)} -->`;
}

export function extractPerfTag(markdown) {
  if (!markdown) return null;
  const m = String(markdown).match(PERF_MARKER_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]);
    return parsed && parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

const fmt = (v, suffix = '') => (v == null ? '-' : `${v}${suffix}`);
const fmtK = (v) => (v == null ? '-' : `${Math.round(v / 1000)}k`);

const SEG_LABELS = Object.freeze({
  day: '校園街道（白天）',
  air: '空拍（150m 全景）',
  night: '夜間街道',
});

/** Render the standardized PR template section (human Markdown tables + hidden yanlin-perf:v1 tag). */
export function formatPrPerfSection(record) {
  const hw = record.hw || {};
  const mem = record.mem || {};
  const boot = record.boot || {};
  const b = record.bench || {};
  const canvasAlert =
    mem.peakCanvasMB != null
      ? mem.peakCanvasMB <= IOS_CANVAS_BUDGET_MB
        ? ` ✅ (峰值 <= ${IOS_CANVAS_BUDGET_MB} MB)`
        : ` ⚠️ (峰值超過 iOS ${IOS_CANVAS_BUDGET_MB} MB 警戒線)`
      : mem.canvasMB == null
        ? ''
        : mem.canvasMB <= IOS_CANVAS_BUDGET_MB
          ? ` ✅ (<= ${IOS_CANVAS_BUDGET_MB} MB)`
          : ` ⚠️ (超過 iOS ${IOS_CANVAS_BUDGET_MB} MB 警戒線)`;
  const peakNote = mem.peakCanvasMB != null ? `，峰值 \`${fmt(mem.peakCanvasMB, ' MB')}\`` : '';
  const gpuWarn = hw.sw ? ' ⚠️ *(軟體渲染，FPS 不具參考性)*' : '';
  const vsyncTxt = hw.uncap ? '解除 VSync 上限' : '開啟 VSync';

  const segRow = (label, s, isOverall = false) => {
    if (!s) return '';
    const title = isOverall ? `**${label}**` : label;
    const stut = isOverall ? fmt(s.stutters, ' 次') : '-';
    return `| ${title} | \`${fmt(s.fps)}\` | \`${fmt(s.low1)}\` | \`${fmt(s.p50)}\` / \`${fmt(s.p95)}\` | \`${stut}\` | \`${fmt(s.logicMs)}\` | \`${fmt(s.renderMs)}\` | \`${fmt(s.calls)}\` | \`${fmtK(s.tris)}\` |`;
  };

  const lines = [
    PERF_SECTION_HEADING,
    '',
    '- [ ] 本次變更與地圖／建築／實體／渲染／物理／資產載入無關（純文案、Wiki、文件、測試或純 2D 介面等，略過效能實測）',
    '- [x] 本次變更涉及效能相關模組，已由 Agent 執行 `npm run bench:iphone` 附上 iPhone 模擬遊戲內 Benchmark 與宿主硬體紀錄',
    '',
    '### 運行環境與宿主機硬體',
    '',
    '| 項目 | 數值 |',
    '| :--- | :--- |',
    `| 作業系統 (OS) | \`${hw.os || '-'}\` |`,
    `| CPU（型號 × 核心數） | \`${hw.cpu || '-'}\` |`,
    `| 記憶體 (RAM) | \`${fmt(hw.ram, ' GB')}\` |`,
    `| 瀏覽器 / 引擎 | \`${hw.browser || '-'}\` |`,
    `| 真實 WebGL GPU | \`${hw.gpu || '-'}\`${gpuWarn} |`,
    `| 模擬裝置與畫質 | \`${hw.profile || '-'} · tier=${hw.tier || '-'} · ${hw.q || '-'}\`（${vsyncTxt}） |`,
    '',
    '### iPhone 記憶體與載入帳本（跨機器通用指標）',
    '',
    '| 指標 | 數值 | 備註 |',
    '| :--- | ---: | :--- |',
    `| Canvas 記憶體（GC 後） | \`${fmt(mem.canvasMB, ' MB')}\` | 共 \`${fmt(mem.canvasN)}\` 個（DOM 內 \`${fmt(mem.canvasDom)}\`${peakNote}）${canvasAlert} |`,
    `| GPU 貼圖估算（含 mip） | \`${fmt(mem.texMB, ' MB')}\` | 共 \`${fmt(mem.texN)}\` 張 |`,
    `| 幾何體 / 著色器 (Shaders) | \`${fmt(mem.geo)}\` / \`${fmt(mem.prog)}\` | 個 |`,
    `| JS Heap（GC 後 / 峰值） | \`${fmt(mem.heapMB, ' MB')}\` / \`${fmt(mem.heapPeakMB, ' MB')}\` | WebKit 無此欄位屬正常 |`,
    `| 載入資源數 / 傳輸量 | \`${fmt(mem.resN)}\` / \`${fmt(mem.kb, ' KB')}\` | 靜態資產與 Bundle |`,
    `| 啟動至主畫面耗時 *(硬體相依)* | \`${fmt(boot.titleMs, ' ms')}\` | BootDiag \`${fmt(boot.diagMs, ' ms')}\` |`,
    ...(boot.toPlayMs != null
      ? [
          `| 點擊開始至可操控 *(硬體相依)* | \`${fmt(boot.toPlayMs, ' ms')}\` | \`#btnStart\` → \`state === 'play'\` |`,
        ]
      : []),
    ...(boot.stages && Object.keys(boot.stages).length
      ? [
          `| 啟動分階 *(硬體相依)* | — | ${Object.entries(boot.stages)
            .map(([k, v]) => `${k} \`${fmt(v)}\``)
            .join('・')} |`,
        ]
      : []),
    ...(boot.topZones?.length
      ? [
          `| 分區建置前 5 名 *(硬體相依)* | — | ${boot.topZones.map((z) => `${z.name} \`${fmt(z.ms)}\``).join('・')} |`,
        ]
      : []),
    ...(record.scene
      ? [
          `| 場景節點 / Mesh / 自動矩陣 | \`${fmt(record.scene.objects)}\` / \`${fmt(record.scene.meshes)}\` / \`${fmt(record.scene.autoMatrix)}\` | \`matrixAutoUpdate === true\` 節點數 |`,
          `| 材質（Standard / Lambert / Basic） | \`${fmt(record.scene.materials)}\` | \`${fmt(record.scene.stdMats)}\` / \`${fmt(record.scene.lambertMats)}\` / \`${fmt(record.scene.basicMats)}\`，投影物件 \`${fmt(record.scene.shadowCasters)}\` |`,
        ]
      : []),
    ...(b.bakes != null
      ? [`| 測試期間 PMREM 重烘次數 | \`${fmt(b.bakes)}\` | \`SkySystem.bakeEnv\` |`]
      : []),
    '',
    '### 遊戲內 Benchmark（三段路線＋整體）',
    '',
    '| 段落 | 平均 FPS | 1% 低 | p50 / p95 (ms) | 卡頓 | 邏輯 JS (ms) | 繪圖提交 (ms) | Draw Calls | Triangles |',
    '| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...[
      segRow('整體平均', b, true),
      segRow(SEG_LABELS.day, b.seg?.day),
      segRow(SEG_LABELS.air, b.seg?.air),
      segRow(SEG_LABELS.night, b.seg?.night),
    ].filter(Boolean),
    '',
    serializePerfTag(record),
  ];

  return lines.join('\n');
}

/** Replace or append the `## 效能與運行環境紀錄` section inside a PR body without touching other sections. */
export function injectPerfSectionIntoPrBody(prBody, sectionMd) {
  const cleanSection = sectionMd.trim();
  const src = String(prBody || '');
  const headingRe = /^##\s+效能與運行環境紀錄[^\n]*$/m;
  const match = headingRe.exec(src);
  if (!match) {
    const trimmed = src.trimEnd();
    return trimmed ? `${trimmed}\n\n${cleanSection}\n` : `${cleanSection}\n`;
  }
  const start = match.index;
  const afterHeading = start + match[0].length;
  const nextHeadingRe = /\n##\s+/g;
  nextHeadingRe.lastIndex = afterHeading;
  const next = nextHeadingRe.exec(src);
  const before = src.slice(0, start).trimEnd();
  const tail = next ? src.slice(next.index + 1).trimEnd() : '';
  const parts = [];
  if (before) parts.push(before);
  parts.push(cleanSection);
  if (tail) parts.push(tail);
  return `${parts.join('\n\n')}\n`;
}

export function recordIdentityKey(rec) {
  if (rec.pr != null) return `pr:${rec.pr}`;
  return `local:${rec.sha || 'unknown'}:${rec.hw?.gpuKey || 'gpu'}:${rec.hw?.profile || 'p'}`;
}

export function parseJsonl(text) {
  if (!text) return [];
  const out = [];
  for (const line of String(text).split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === 'object') out.push(obj);
    } catch {}
  }
  return out;
}

export function upsertRecords(existing, incoming) {
  const map = new Map();
  for (const r of existing) map.set(recordIdentityKey(r), r);
  for (const r of incoming) map.set(recordIdentityKey(r), r);
  return [...map.values()].sort((a, b) => {
    if (a.pr != null && b.pr != null && a.pr !== b.pr) return a.pr - b.pr;
    return String(a.at || '').localeCompare(String(b.at || ''));
  });
}

export function serializeJsonl(records) {
  return records.length ? `${records.map((r) => JSON.stringify(r)).join('\n')}\n` : '';
}

const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const WORKLOAD_METRICS = Object.freeze([
  { path: 'mem.canvasMB', label: 'Canvas 記憶體', unit: 'MB', higherBetter: false },
  { path: 'mem.peakCanvasMB', label: 'Canvas 瞬間峰值', unit: 'MB', higherBetter: false },
  { path: 'mem.canvasN', label: '存活 Canvas 數量', unit: '個', higherBetter: false },
  { path: 'mem.texMB', label: 'GPU 貼圖估算', unit: 'MB', higherBetter: false },
  { path: 'mem.geo', label: '幾何體 (Geometries)', unit: '個', higherBetter: false },
  { path: 'mem.prog', label: '著色器 (Shaders)', unit: '個', higherBetter: false },
  { path: 'bench.calls', label: '整體平均 Draw Calls', unit: 'calls', higherBetter: false },
  { path: 'bench.tris', label: '整體平均 Triangles', unit: 'tris', higherBetter: false },
  { path: 'bench.seg.day.calls', label: '白天街道 Draw Calls', unit: 'calls', higherBetter: false },
  { path: 'bench.seg.day.tris', label: '白天街道 Triangles', unit: 'tris', higherBetter: false },
  { path: 'bench.seg.air.calls', label: '空拍全景 Draw Calls', unit: 'calls', higherBetter: false },
  { path: 'bench.seg.air.tris', label: '空拍全景 Triangles', unit: 'tris', higherBetter: false },
  {
    path: 'bench.seg.night.calls',
    label: '夜間街道 Draw Calls',
    unit: 'calls',
    higherBetter: false,
  },
  { path: 'bench.seg.night.tris', label: '夜間街道 Triangles', unit: 'tris', higherBetter: false },
  { path: 'mem.kb', label: '靜態資源傳輸量', unit: 'KB', higherBetter: false },
]);

const TIMING_METRICS = Object.freeze([
  { path: 'bench.fps', label: '整體平均 FPS', unit: 'fps', higherBetter: true },
  { path: 'bench.low1', label: '整體 1% 低 FPS', unit: 'fps', higherBetter: true },
  { path: 'bench.p95', label: '整體 p95 幀時間', unit: 'ms', higherBetter: false },
  { path: 'bench.logicMs', label: '整體邏輯 JS 耗時', unit: 'ms', higherBetter: false },
  { path: 'bench.renderMs', label: '整體繪圖提交耗時', unit: 'ms', higherBetter: false },
  { path: 'bench.seg.day.fps', label: '白天街道 FPS', unit: 'fps', higherBetter: true },
  { path: 'bench.seg.air.fps', label: '空拍全景 FPS', unit: 'fps', higherBetter: true },
  { path: 'bench.seg.night.fps', label: '夜間街道 FPS', unit: 'fps', higherBetter: true },
  { path: 'boot.titleMs', label: '啟動至主畫面耗時', unit: 'ms', higherBetter: false },
]);

function diffMetric(before, after, def) {
  const b = getPath(before, def.path);
  const a = getPath(after, def.path);
  if (b == null && a == null) return null;
  const delta = b != null && a != null ? Number((a - b).toFixed(2)) : null;
  const pct = b != null && a != null && b !== 0 ? Number((((a - b) / b) * 100).toFixed(1)) : null;
  let trend = 'same';
  if (pct != null && Math.abs(pct) >= 1) {
    const improved = def.higherBetter ? delta > 0 : delta < 0;
    trend = improved ? 'better' : 'worse';
  }
  return { ...def, before: b ?? null, after: a ?? null, delta, pct, trend };
}

/**
 * Compare two records, separating hardware-independent iPhone workload/memory metrics from
 * hardware-dependent GPU frame-rate/timing metrics.
 */
export function compareRecords(before, after, { sameGpuBaseline = null } = {}) {
  const sameGpu =
    Boolean(before?.hw?.gpuKey) &&
    before.hw.gpuKey === after?.hw?.gpuKey &&
    before.hw?.profile === after?.hw?.profile &&
    before.hw?.q === after?.hw?.q &&
    Boolean(before.hw?.uncap) === Boolean(after?.hw?.uncap);

  const profileMismatch =
    before?.hw?.profile !== after?.hw?.profile || before?.hw?.q !== after?.hw?.q;
  const workload = WORKLOAD_METRICS.map((m) => diffMetric(before, after, m)).filter(Boolean);
  const timing = TIMING_METRICS.map((m) => diffMetric(before, after, m)).filter(Boolean);
  const sameGpuTiming =
    !sameGpu && sameGpuBaseline
      ? TIMING_METRICS.map((m) => diffMetric(sameGpuBaseline, after, m)).filter(Boolean)
      : null;

  return {
    before,
    after,
    sameGpu,
    profileMismatch,
    workload,
    timing,
    sameGpuBaseline: !sameGpu ? sameGpuBaseline : null,
    sameGpuTiming,
  };
}

function recLabel(r) {
  const tag = r.pr != null ? `PR #${r.pr}` : r.sha ? `commit ${r.sha}` : '本機量測';
  return r.title ? `${tag} (${r.title})` : tag;
}

function fmtVal(v, unit) {
  if (v == null) return '-';
  if (unit === 'tris') return `${Math.round(v / 1000)}k`;
  return `${v} ${unit}`;
}

function fmtDelta(row) {
  if (row.delta == null || row.pct == null) return '-';
  const sign = row.pct > 0 ? '+' : '';
  const badge = row.trend === 'better' ? '🟢' : row.trend === 'worse' ? '🔴' : '⚪';
  const dTxt =
    row.unit === 'tris'
      ? `${row.delta > 0 ? '+' : ''}${Math.round(row.delta / 1000)}k`
      : `${row.delta > 0 ? '+' : ''}${row.delta}`;
  return `${badge} ${dTxt} (${sign}${row.pct}%)`;
}

export function formatComparisonMarkdown(cmp) {
  const { before, after, sameGpu, profileMismatch } = cmp;
  const lines = [
    '### 📊 效能前後對比報告',
    '',
    `- **基準 (Before)**：${recLabel(before)} · \`${before.hw?.gpu || '-'}\` · \`${before.hw?.profile || '-'} (${before.hw?.q || '-'})\``,
    `- **當前 (After)**：${recLabel(after)} · \`${after.hw?.gpu || '-'}\` · \`${after.hw?.profile || '-'} (${after.hw?.q || '-'})\``,
  ];

  if (profileMismatch) {
    lines.push(
      '',
      `> ⚠️ 注意：兩筆紀錄的模擬視口或畫質設定不同（\`${before.hw?.profile} · ${before.hw?.q}\` vs \`${after.hw?.profile} · ${after.hw?.q}\`），工作量差異包含設定變更。`
    );
  }

  lines.push(
    '',
    '#### 1. iPhone 記憶體與幾何工作量（跨機器通用指標）',
    '',
    '| 指標 | Before | After | 變化 (Δ / Δ%) |',
    '| :--- | ---: | ---: | :--- |',
    ...cmp.workload.map(
      (r) =>
        `| ${r.label} | \`${fmtVal(r.before, r.unit)}\` | \`${fmtVal(r.after, r.unit)}\` | ${fmtDelta(r)} |`
    )
  );

  lines.push('', '#### 2. 真實 GPU 幀率與耗時（宿主硬體相依）', '');
  if (sameGpu) {
    lines.push(
      `兩筆皆於同款 GPU（\`${after.hw?.gpu}\`）與相同視口設定量測，可直接比較：`,
      '',
      '| 指標 | Before | After | 變化 (Δ / Δ%) |',
      '| :--- | ---: | ---: | :--- |',
      ...cmp.timing.map(
        (r) =>
          `| ${r.label} | \`${fmtVal(r.before, r.unit)}\` | \`${fmtVal(r.after, r.unit)}\` | ${fmtDelta(r)} |`
      )
    );
  } else {
    lines.push(
      `> ℹ️ 兩筆來自不同宿主硬體或設定（\`${before.hw?.gpu}\` vs \`${after.hw?.gpu}\`），FPS 與毫秒數僅並列參考，不直接計算增減百分比：`,
      '',
      `| 指標 | Before (\`${before.hw?.gpu}\`) | After (\`${after.hw?.gpu}\`) |`,
      '| :--- | ---: | ---: |',
      ...cmp.timing.map(
        (r) => `| ${r.label} | \`${fmtVal(r.before, r.unit)}\` | \`${fmtVal(r.after, r.unit)}\` |`
      )
    );
    if (cmp.sameGpuBaseline && cmp.sameGpuTiming) {
      lines.push(
        '',
        `##### 同款 GPU 歷史對照（對比最近一筆 \`${after.hw?.gpu}\` 紀錄：${recLabel(cmp.sameGpuBaseline)}）`,
        '',
        '| 指標 | 同 GPU 前次 | 本次 After | 變化 (Δ / Δ%) |',
        '| :--- | ---: | ---: | :--- |',
        ...cmp.sameGpuTiming.map(
          (r) =>
            `| ${r.label} | \`${fmtVal(r.before, r.unit)}\` | \`${fmtVal(r.after, r.unit)}\` | ${fmtDelta(r)} |`
        )
      );
    }
  }

  return lines.join('\n');
}

export function formatTimelineMarkdown(records) {
  if (!records.length) return '尚無任何效能歷史紀錄。';
  const lines = [
    '### 📈 效能歷史演進紀錄',
    '',
    '| PR / Commit | 日期 | 標題 | Canvas MB | 貼圖 MB | 空拍 Calls / Tris | 平均 FPS (1%低) | 邏輯 JS | 測試硬體 (GPU) |',
    '| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |',
  ];
  for (const r of records) {
    const id = r.pr != null ? `#${r.pr}` : r.sha || '-';
    const date = String(r.at || '').slice(0, 10) || '-';
    const title = String(r.title || r.branch || '-')
      .replace(/\|/g, '\\|')
      .slice(0, 36);
    const air = r.bench?.seg?.air;
    const airTxt = air
      ? `${fmt(air.calls)} / ${fmtK(air.tris)}`
      : `${fmt(r.bench?.calls)} / ${fmtK(r.bench?.tris)}`;
    lines.push(
      `| \`${id}\` | ${date} | ${title} | \`${fmt(r.mem?.canvasMB)}\` | \`${fmt(r.mem?.texMB)}\` | \`${airTxt}\` | \`${fmt(r.bench?.fps)}\` (\`${fmt(r.bench?.low1)}\`) | \`${fmt(r.bench?.logicMs, 'ms')}\` | \`${r.hw?.gpu || '-'}\` |`
    );
  }
  return lines.join('\n');
}
