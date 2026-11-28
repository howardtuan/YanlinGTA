/**
 * GraphicsConfig: the one place that says how the game is drawn (display / quality settings, SSOT).
 *
 * Every visual knob is an atomic setting. The four quality levels (xlow / low / medium / high) are nothing more than
 * declarative presets of those settings; the player may override single settings on top of a preset (設定 →
 * ⚙ 細部顯示設定), and URL flags override everything for experiments and automated sweeps.
 *
 * Resolution order (later wins):  preset of the quality level  <  player overrides (settings.gfx)  <  URL flags
 *
 * LIVE settings switch at once (game.applyDisplaySettings / GameLoop.applyDisplay):
 *   dprCap      max renderer pixel ratio
 *   dynRes      dynamic resolution (low / xlow): in play the pixel ratio moves between dprMin and dprCap with the
 *               frame time (GameLoop drsStep) instead of sitting at one fixed, blurry value; off when the player sets
 *               清晰度倍率 by hand or ?dpr= is given
 *   dprMin      the floor dynamic resolution may go down to
 *   shadows     'off' | 'low' (1024 + tiny casters skipped) | 'medium' (2048) | 'high' (4096, PCFSoft, all casters)
 *   envLight    'hemi' (hemisphere light only: no PMREM sky environment, no runtime bakeEnv) | 'pmrem' (sky IBL)
 *   postFx      'off' (straight to screen) | 'bloom-quarter' (1/4 bloom + grade) | 'bloom-half-msaa' (4x MSAA, 1/2 bloom)
 *   nightLamps  how many real PointLights follow the nearest street lamps at night (0 / 2 / 4 / 8)
 *   viewScale   pedestrians / traffic / parked vehicles / trees draw distance (x their normal range)
 *   fogScale    fog thickness
 *   far         camera far plane (m)
 * RELOAD settings are read once while the world is built (the menu says 重新整理後套用):
 *   materialMode 'lambert' (walls / ground MeshLambertMaterial, no normal / roughness maps) | 'standard' (PBR)
 *   antialias    WebGL context MSAA
 *   crowdTier    'full' | 'low' | 'xlow': people, traffic, skyline, parked-vehicle density and lighter 補建 rows
 *   fill         'on' | 'off': 補建街區 (synthetic blocks) — kept in settings.fill as before
 *
 * Pure module (no three.js, no DOM at import): unit tested in tests/unit/graphics-config.test.js.
 */

export const QUALITY = ['xlow', 'low', 'medium', 'high'];

export const PRESETS = Object.freeze({
  high: Object.freeze({
    dprCap: 1.6,
    dprMin: 1.6,
    dynRes: false,
    shadows: 'high',
    envLight: 'pmrem',
    postFx: 'bloom-half-msaa',
    nightLamps: 8,
    viewScale: 1,
    fogScale: 1,
    far: 2600,
    materialMode: 'standard',
    antialias: true,
    crowdTier: 'full',
  }),
  medium: Object.freeze({
    dprCap: 1.0,
    dprMin: 1.0,
    dynRes: false,
    shadows: 'medium',
    envLight: 'pmrem',
    postFx: 'bloom-quarter',
    nightLamps: 4,
    viewScale: 0.8,
    fogScale: 1.12,
    far: 1500,
    materialMode: 'standard',
    antialias: true,
    crowdTier: 'full',
  }),
  low: Object.freeze({
    // phones (#438): was a fixed 0.8 (344 x 745 px on a 430 x 932 @3x iPhone, 7 % of its pixels); now up to 1.25
    // (over twice the pixels), dynamic resolution easing down to 0.8 when frames run long
    dprCap: 1.25,
    dprMin: 0.8,
    dynRes: true,
    shadows: 'off',
    envLight: 'pmrem',
    postFx: 'off',
    nightLamps: 0,
    viewScale: 0.45,
    fogScale: 1.6,
    far: 750,
    materialMode: 'lambert',
    antialias: false,
    crowdTier: 'low',
  }),
  xlow: Object.freeze({
    dprCap: 1.0,
    dprMin: 0.6,
    dynRes: true,
    shadows: 'off',
    envLight: 'pmrem',
    postFx: 'off',
    nightLamps: 0,
    viewScale: 0.3,
    fogScale: 2.4,
    far: 450,
    materialMode: 'lambert',
    antialias: false,
    crowdTier: 'xlow',
  }),
});

// allowed values of every setting (numbers: [min, max]); anything else is ignored
export const SPEC = Object.freeze({
  dprCap: { live: true, range: [0.4, 3] },
  dprMin: { live: true, range: [0.4, 3] },
  dynRes: { live: true, bool: true },
  shadows: { live: true, values: ['off', 'low', 'medium', 'high'] },
  envLight: { live: true, values: ['hemi', 'pmrem'] },
  postFx: { live: true, values: ['off', 'bloom-quarter', 'bloom-half-msaa'] },
  nightLamps: { live: true, range: [0, 8], int: true },
  viewScale: { live: true, range: [0.1, 1.5] },
  fogScale: { live: true, range: [0.5, 4] },
  far: { live: true, range: [200, 4000] },
  materialMode: { live: false, values: ['lambert', 'standard'] },
  antialias: { live: false, bool: true },
  crowdTier: { live: false, values: ['xlow', 'low', 'full'] },
});
export const LIVE_KEYS = Object.keys(SPEC).filter((k) => SPEC[k].live);
export const RELOAD_KEYS = Object.keys(SPEC).filter((k) => !SPEC[k].live);

// one value checked against SPEC; undefined when it isn't valid
export function sanitize(key, v) {
  const s = SPEC[key];
  if (!s || v === undefined || v === null || v === '') return undefined;
  if (s.values) return s.values.includes(v) ? v : undefined;
  if (s.bool) return typeof v === 'boolean' ? v : undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  const [lo, hi] = s.range;
  const c = Math.min(hi, Math.max(lo, n));
  return s.int ? Math.round(c) : c;
}

// a patch with only the valid keys / values
export function cleanPatch(p) {
  const out = {};
  if (!p || typeof p !== 'object') return out;
  for (const k of Object.keys(SPEC)) {
    const v = sanitize(k, p[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const BOOL = {
  1: true,
  true: true,
  on: true,
  yes: true,
  0: false,
  false: false,
  off: false,
  no: false,
};

/**
 * URL experiment flags: ?dpr= ?shadows= ?ibl= ?postfx= ?lamps= ?mat= (plus ?aa= ?view= ?fog=).
 * ?ibl=0|off|hemi -> hemi, ?ibl=1|on|pmrem -> pmrem; ?postfx=off|quarter|bloom-quarter|half|msaa|bloom-half-msaa;
 * ?mat=lambert|standard (also lite / pbr); ?shadows=off|low|medium|high (also 0 / 1 = off / medium).
 */
export function parseUrlFlags(search = '') {
  const q = new URLSearchParams(search);
  const g = (k) => (q.has(k) ? String(q.get(k)).trim().toLowerCase() : undefined);
  const raw = {};
  if (g('dpr') !== undefined) raw.dprCap = g('dpr');
  const sh = g('shadows');
  if (sh !== undefined) raw.shadows = sh in BOOL ? (BOOL[sh] ? 'medium' : 'off') : sh;
  const ibl = g('ibl');
  if (ibl !== undefined)
    raw.envLight =
      ibl === 'hemi' || ibl === 'pmrem' ? ibl : ibl in BOOL ? (BOOL[ibl] ? 'pmrem' : 'hemi') : ibl;
  const pf = g('postfx');
  if (pf !== undefined)
    raw.postFx =
      pf in BOOL && !BOOL[pf]
        ? 'off'
        : pf === 'quarter' || pf === 'bloom' || pf === 'on' || pf === '1' || pf === 'true'
          ? 'bloom-quarter'
          : pf === 'half' || pf === 'msaa'
            ? 'bloom-half-msaa'
            : pf;
  if (g('lamps') !== undefined) raw.nightLamps = g('lamps');
  const mat = g('mat');
  if (mat !== undefined)
    raw.materialMode = mat === 'lite' ? 'lambert' : mat === 'pbr' ? 'standard' : mat;
  const aa = g('aa');
  if (aa !== undefined && aa in BOOL) raw.antialias = BOOL[aa];
  if (g('view') !== undefined) raw.viewScale = g('view');
  if (g('fog') !== undefined) raw.fogScale = g('fog');
  return cleanPatch(raw);
}

// integrated GPUs keep at most 2 lamp lights (was MapBuilder's own rule)
export function tierClamp(c, tier) {
  return tier === 'desktop-igpu' ? { ...c, nightLamps: Math.min(c.nightLamps, 2) } : c;
}

/**
 * The effective display configuration.
 * @param {string} quality  resolved quality level (xlow / low / medium / high)
 * @param {object} opts     { overrides: settings.gfx, url: parsed URL flags, tier }
 */
export function resolveGraphics(quality, { overrides = null, url = null, tier } = {}) {
  const preset = PRESETS[quality] || PRESETS.low;
  let c = { ...preset, ...cleanPatch(overrides) };
  c = tierClamp(c, tier);
  c = { ...c, ...cleanPatch(url) };
  c.quality = quality;
  return c;
}

// overrides + a patch: valid values replace, a key set to null is dropped (back to the preset)
export function mergeOverrides(base, patch) {
  const out = cleanPatch(base);
  for (const [k, v] of Object.entries(patch || {})) if (v === null) delete out[k];
  return Object.assign(out, cleanPatch(patch));
}

// true when the player's overrides change anything compared with the preset (the menu shows 自訂)
export function isCustom(quality, overrides) {
  const p = PRESETS[quality];
  if (!p) return false;
  const o = cleanPatch(overrides);
  return Object.keys(o).some((k) => o[k] !== p[k]);
}

// overrides with the entries equal to the preset dropped (what is worth saving)
export function diffFromPreset(quality, overrides) {
  const p = PRESETS[quality] || {};
  const o = cleanPatch(overrides),
    out = {};
  for (const k of Object.keys(o)) if (o[k] !== p[k]) out[k] = o[k];
  return out;
}

// the reload-only settings a running game was built with differ from the wanted ones
export function reloadPending(built, wanted) {
  if (!built || !wanted) return [];
  return RELOAD_KEYS.filter((k) => built[k] !== wanted[k]);
}

// PostFX / SkySystem still speak in the old three-level words
export const postFxLevel = (m) =>
  m === 'bloom-half-msaa' ? 'high' : m === 'bloom-quarter' ? 'medium' : 'low';
export const shadowLevel = (s) => (s === 'off' ? 'low' : s);
