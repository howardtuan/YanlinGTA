/**
 * Runtime hardware-tier detection and URL experiment flag parser (`?tier=`, `?texscale=`, `?stream=`, `?diag=`).
 * Visual quality settings (`far`, `fog`, `pr`, `shadows`, `view`, `PostFX`) remain owned solely by `GameLoop.js` (`QPROF`).
 */

export const TIERS = Object.freeze({
  'mobile-lite': Object.freeze({
    tier: 'mobile-lite',
    texScale: 0.5,
    atlasMaxW: 1024,
    atlasMaxH: 2048,
    streaming: 'mobile',
  }),
  'desktop-igpu': Object.freeze({
    tier: 'desktop-igpu',
    texScale: 0.75,
    atlasMaxW: 2048,
    atlasMaxH: 2048,
    streaming: 'balanced',
  }),
  'desktop-dgpu': Object.freeze({
    tier: 'desktop-dgpu',
    texScale: 1,
    atlasMaxW: 2048,
    atlasMaxH: 4096,
    streaming: 'high',
  }),
});

export const STREAMING_PROFILES = Object.freeze({
  off: Object.freeze({
    mode: 'off',
    enabled: false,
    chunkSize: 120,
    streetEnter: Infinity,
    streetExit: Infinity,
    interiorEnter: Infinity,
    interiorExit: Infinity,
    maxActiveChunks: Infinity,
    physTileRadius: Infinity,
  }),
  mobile: Object.freeze({
    mode: 'mobile',
    enabled: true,
    chunkSize: 120,
    streetEnter: 150,
    streetExit: 220,
    interiorEnter: 38,
    interiorExit: 60,
    maxActiveChunks: 6,
    physTileRadius: 1,
  }),
  balanced: Object.freeze({
    mode: 'balanced',
    enabled: true,
    chunkSize: 120,
    streetEnter: 320,
    streetExit: 420,
    interiorEnter: 65,
    interiorExit: 95,
    maxActiveChunks: 16,
    physTileRadius: 2,
  }),
  high: Object.freeze({
    mode: 'high',
    enabled: true,
    chunkSize: 120,
    streetEnter: 550,
    streetExit: 700,
    interiorEnter: 100,
    interiorExit: 140,
    maxActiveChunks: Infinity,
    physTileRadius: 3,
  }),
});

const TIER_ALIASES = Object.freeze({
  'mobile-ios': 'mobile-lite',
});

const IGPU_RE =
  /geforce\s*mx\d+|\b(iris|uhd|hd\s*graphics)\b|apple\s*(m\d|gpu)|\bradeon\b.*\b\d{3}m\b|\bradeon\s*(graphics|vega)\b|swiftshader|llvmpipe|software/i;
const DGPU_RE =
  /nvidia|geforce|\b(rtx|gtx)\s*\d|quadro|\bradeon\s*(rx|pro)\b|\brx\s*\d{3,4}|\barc\s*[ab]\d{3}/i;

function detectTouch() {
  if (typeof matchMedia === 'function') {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const fine = matchMedia('(pointer: fine)').matches;
    const maxTouch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
    return coarse || (maxTouch > 0 && !fine);
  }
  return typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0;
}

function probeGpuRenderer() {
  if (typeof document === 'undefined') return '';
  let gl = null;
  try {
    gl = document
      .createElement('canvas')
      .getContext('webgl', { powerPreference: 'high-performance' });
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
  } catch (_e) {
    return '';
  } finally {
    try {
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch (_e) {}
  }
}

/**
 * Classify device hardware into a conservative tier from touch capability and GPU renderer string.
 */
export function detectTier({ touch = false, gpuRenderer = '' } = {}) {
  if (touch) return 'mobile-lite';
  const gpu = String(gpuRenderer || '').trim();
  if (!gpu) return 'desktop-igpu';
  if (IGPU_RE.test(gpu)) return 'desktop-igpu';
  if (DGPU_RE.test(gpu)) return 'desktop-dgpu';
  return 'desktop-igpu';
}

function resolveStreamMode(raw, tierDefaultMode) {
  if (!raw) return 'off';
  const norm = raw.trim().toLowerCase();
  if (norm === '0' || norm === 'false' || norm === 'off') return 'off';
  if (norm === '1' || norm === 'true' || norm === 'on') return tierDefaultMode;
  if (Object.hasOwn(STREAMING_PROFILES, norm)) return norm;
  return 'off';
}

function resolveDiagMode(params) {
  if (!params.has('diag')) return 'off';
  const norm = (params.get('diag') ?? '').trim().toLowerCase();
  if (norm === '0' || norm === 'false' || norm === 'off') return 'off';
  if (norm === 'halt' || norm === 'pause') return 'halt';
  if (norm === '' || norm === '1' || norm === 'true' || norm === 'on') return 'on';
  return 'off';
}

/**
 * Resolve runtime hardware profile and `?tier=` / `?texscale=` / `?stream=` / `?diag=` URL overrides.
 */
export function resolveRuntimeProfile(_settings = {}, env = {}) {
  const search =
    env.search !== undefined
      ? String(env.search)
      : typeof location !== 'undefined'
        ? location.search
        : '';
  const params = new URLSearchParams(search);

  const rawTierParam = params.get('tier')?.trim().toLowerCase() || '';
  const tierParam = TIER_ALIASES[rawTierParam] || rawTierParam;
  const hasValidTierOverride = Object.hasOwn(TIERS, tierParam);

  const touch = env.touch !== undefined ? Boolean(env.touch) : detectTouch();
  let gpuRenderer = env.gpuRenderer !== undefined ? String(env.gpuRenderer) : '';
  if (env.gpuRenderer === undefined && !touch && !hasValidTierOverride) {
    gpuRenderer =
      typeof env.probeGpu === 'function' ? String(env.probeGpu() || '') : probeGpuRenderer();
  }

  const tier = hasValidTierOverride ? tierParam : detectTier({ touch, gpuRenderer });
  const base = TIERS[tier];

  const texScaleParam = params.get('texscale');
  const parsedTex = texScaleParam !== null ? Number.parseFloat(texScaleParam) : NaN;
  const texScale =
    Number.isFinite(parsedTex) && parsedTex >= 0.25 && parsedTex <= 2 ? parsedTex : base.texScale;

  const streamParam = params.get('stream');
  const stream = resolveStreamMode(streamParam, base.streaming);

  const diagParam = params.has('diag') ? params.get('diag') : null;
  const diagMode = resolveDiagMode(params);

  return {
    tier,
    texScale,
    atlasMaxW: base.atlasMaxW,
    atlasMaxH: base.atlasMaxH,
    stream,
    streamEnabled: stream !== 'off',
    streaming: STREAMING_PROFILES[stream],
    diagMode,
    diagEnabled: diagMode !== 'off',
    touch,
    gpuRenderer,
    flags: {
      tier: hasValidTierOverride ? tierParam : null,
      texScale:
        Number.isFinite(parsedTex) && parsedTex >= 0.25 && parsedTex <= 2 ? parsedTex : null,
      stream: streamParam !== null ? streamParam : null,
      diag: diagParam,
    },
  };
}
