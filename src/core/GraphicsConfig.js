/**
 * GraphicsConfig: the one place that says how the game is drawn (display / quality settings, SSOT).
 *
 * Every visual knob is an atomic setting. The five quality levels (xlow < low < medium < high < ultra, 超低 / 低 /
 * 中 / 高 / 極致) are nothing more than declarative presets of those settings, every one of them at least as good as
 * the level below it (tests/unit/graphics-config.test.js); the player may override single settings on top of a
 * preset (設定 → ⚙ 細部顯示設定), and URL flags override everything for experiments and automated sweeps.
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
 *   shadowRate  1: the sun's shadow map is drawn every frame, 2: every other frame
 *   envLight    'hemi' (hemisphere light only: no PMREM sky environment, no runtime bakeEnv) | 'pmrem' (sky IBL)
 *   postFx      'off' (straight to screen) | 'bloom-quarter' (1/4 bloom + grade) | 'bloom-half-msaa' (4x MSAA, 1/2 bloom)
 *   nightLamps  how many real PointLights follow the nearest street lamps at night (0 / 2 / 4 / 8)
 *   viewScale   pedestrians / traffic / parked vehicles / trees draw distance (x their normal range)
 *   fogScale    fog thickness
 *   far         camera far plane (m)
 *   interiorCullDist  furniture inside buildings is hidden beyond this distance (m)
 * RELOAD settings are read once while the world is built (the menu says 重新整理後套用):
 *   materialMode 'lambert' (walls / ground MeshLambertMaterial, no normal / roughness maps) | 'standard' (PBR)
 *   antialias    WebGL context MSAA
 *   crowdTier    'xlow' .. 'ultra': people, traffic, skyline, parked-vehicle and world density (CROWD_SPEC)
 *   fill         補建街區 (synthetic blocks from tools/block_survey.json) on / off
 *
 * Pure module (no three.js, no DOM at import): unit tested in tests/unit/graphics-config.test.js.
 */

export const QUALITY = ['xlow', 'low', 'medium', 'high', 'ultra'];
export const Q_NAME = Object.freeze({
  xlow: '超低',
  low: '低',
  medium: '中',
  high: '高',
  ultra: '極致',
});

const preset = (o) => Object.freeze(o);
export const PRESETS = Object.freeze({
  xlow: preset({
    dprCap: 0.75,
    dprMin: 0.6,
    dynRes: true,
    shadows: 'off',
    shadowRate: 2,
    envLight: 'hemi',
    postFx: 'off',
    nightLamps: 0,
    viewScale: 0.35,
    fogScale: 2.2,
    far: 500,
    interiorCullDist: 30,
    materialMode: 'lambert',
    antialias: false,
    crowdTier: 'xlow',
    fill: true,
  }),
  low: preset({
    dprCap: 1.0,
    dprMin: 0.8,
    dynRes: true,
    shadows: 'off',
    shadowRate: 2,
    envLight: 'hemi',
    postFx: 'off',
    nightLamps: 0,
    viewScale: 0.5,
    fogScale: 1.5,
    far: 800,
    interiorCullDist: 45,
    materialMode: 'lambert',
    antialias: false,
    crowdTier: 'low',
    fill: true,
  }),
  medium: preset({
    dprCap: 1.15,
    dprMin: 1.0,
    dynRes: false,
    shadows: 'low',
    shadowRate: 2,
    envLight: 'pmrem',
    postFx: 'off',
    nightLamps: 2,
    viewScale: 0.75,
    fogScale: 1.15,
    far: 1400,
    interiorCullDist: 70,
    materialMode: 'standard',
    antialias: false,
    crowdTier: 'medium',
    fill: true,
  }),
  high: preset({
    dprCap: 1.4,
    dprMin: 1.15,
    dynRes: false,
    shadows: 'medium',
    shadowRate: 2,
    envLight: 'pmrem',
    postFx: 'bloom-quarter',
    nightLamps: 4,
    viewScale: 0.9,
    fogScale: 1.05,
    far: 2000,
    interiorCullDist: 100,
    materialMode: 'standard',
    antialias: true,
    crowdTier: 'high',
    fill: true,
  }),
  ultra: preset({
    dprCap: 1.6,
    dprMin: 1.4,
    dynRes: false,
    shadows: 'high',
    shadowRate: 1,
    envLight: 'pmrem',
    postFx: 'bloom-half-msaa',
    nightLamps: 8,
    viewScale: 1.0,
    fogScale: 1.0,
    far: 2600,
    interiorCullDist: 150,
    materialMode: 'standard',
    antialias: true,
    crowdTier: 'ultra',
    fill: true,
  }),
});

/**
 * What each crowd / world density tier builds (read once while the world is built):
 *   skyline     distant backdrop buildings          traffic / peds  cars and pedestrians on the streets
 *   festive     max 過年 lanterns and couplets       pudding         布丁 students at the 聖誕 party
 *   parkedDist  parked scooter chunks drawn within this distance (m)
 *   world       MapBuilder density ('low' | 'medium' | 'high': tree / prop counts, shadow casters, texture sizes)
 *   lean        lighter 補建 rows, no distant synthetic LOD blocks, fewer shadow casters (railway, trains, lamps)
 */
export const CROWD_SPEC = Object.freeze({
  xlow: Object.freeze({
    skyline: 40,
    traffic: 8,
    peds: 10,
    festive: 200,
    pudding: 8,
    parkedDist: 115,
    world: 'low',
    lean: true,
  }),
  low: Object.freeze({
    skyline: 70,
    traffic: 14,
    peds: 18,
    festive: 500,
    pudding: 12,
    parkedDist: 115,
    world: 'low',
    lean: true,
  }),
  medium: Object.freeze({
    skyline: 180,
    traffic: 26,
    peds: 32,
    festive: Infinity,
    pudding: Infinity,
    parkedDist: 260,
    world: 'medium',
    lean: false,
  }),
  high: Object.freeze({
    skyline: 180,
    traffic: 26,
    peds: 32,
    festive: Infinity,
    pudding: Infinity,
    parkedDist: 260,
    world: 'high',
    lean: false,
  }),
  ultra: Object.freeze({
    skyline: 180,
    traffic: 26,
    peds: 32,
    festive: Infinity,
    pudding: Infinity,
    parkedDist: 260,
    world: 'high',
    lean: false,
  }),
});

// allowed values of every setting (numbers: [min, max]); anything else is ignored
export const SPEC = Object.freeze({
  dprCap: { live: true, range: [0.4, 3] },
  dprMin: { live: true, range: [0.4, 3] },
  dynRes: { live: true, bool: true },
  shadows: { live: true, values: ['off', 'low', 'medium', 'high'] },
  shadowRate: { live: true, values: [1, 2] },
  envLight: { live: true, values: ['hemi', 'pmrem'] },
  postFx: { live: true, values: ['off', 'bloom-quarter', 'bloom-half-msaa'] },
  nightLamps: { live: true, range: [0, 8], int: true },
  viewScale: { live: true, range: [0.1, 1.5] },
  fogScale: { live: true, range: [0.5, 4] },
  far: { live: true, range: [200, 4000] },
  interiorCullDist: { live: true, range: [10, 300] },
  materialMode: { live: false, values: ['lambert', 'standard'] },
  antialias: { live: false, bool: true },
  crowdTier: { live: false, values: QUALITY },
  fill: { live: false, bool: true },
});
export const LIVE_KEYS = Object.keys(SPEC).filter((k) => SPEC[k].live);
export const RELOAD_KEYS = Object.keys(SPEC).filter((k) => !SPEC[k].live);

// one value checked against SPEC; undefined when it isn't valid
export function sanitize(key, v) {
  const s = SPEC[key];
  if (!s || v === undefined || v === null || v === '') return undefined;
  if (s.values) {
    const x = typeof s.values[0] === 'number' && typeof v === 'string' ? Number(v) : v;
    return s.values.includes(x) ? x : undefined;
  }
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
 * URL experiment flags: ?dpr= ?shadows= ?ibl= ?postfx= ?lamps= ?mat= (plus ?aa= ?view= ?fog= ?shadowrate=1|2
 * ?fill=0|1 ?dynres=0|1).
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
  if (g('shadowrate') !== undefined) raw.shadowRate = g('shadowrate');
  const fill = g('fill');
  if (fill !== undefined && fill in BOOL) raw.fill = BOOL[fill];
  const dyn = g('dynres');
  if (dyn !== undefined && dyn in BOOL) raw.dynRes = BOOL[dyn];
  return cleanPatch(raw);
}

/**
 * The effective display configuration.
 * @param {string} quality  resolved quality level (xlow / low / medium / high / ultra)
 * @param {object} opts     { overrides: settings.gfx, url: parsed URL flags }
 */
export function resolveGraphics(quality, { overrides = null, url = null } = {}) {
  const preset = PRESETS[quality] || PRESETS.low;
  const c = { ...preset, ...cleanPatch(overrides), ...cleanPatch(url) };
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

/**
 * 自動調畫質 and dynamic resolution thresholds per device (src/core/PerfProfile.js), read by GameLoop:
 *   downFps    two 3 s windows in a row under this -> one level down
 *   upFps      12 s in a row at or above this (and >= 15 s since the last change) -> one level up
 *   drsDownFps a 2 s window under this -> pixel ratio -0.1 (not below dprMin)
 *   drsUpFps   at or above this with 6 s since the last change -> pixel ratio +0.05 (not above dprCap)
 * Phones run against a 30 fps target, desktops against 60.
 */
export const AUTO_TUNING = Object.freeze({
  mobile: Object.freeze({ downFps: 20, upFps: 29, drsDownFps: 24, drsUpFps: 29 }),
  desktop: Object.freeze({ downFps: 25, upFps: 55, drsDownFps: 45, drsUpFps: 57 }),
});
