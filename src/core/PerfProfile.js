/**
 * Runtime hardware-tier detection and URL experiment flag parser (`?tier=`, `?texscale=`, `?stream=`).
 * Used by Phase 0 telemetry and later streaming / quality phases.
 */

export const TIERS = Object.freeze({
  'mobile-ios': Object.freeze({
    tier: 'mobile-ios',
    texScale: 0.5,
    shadowSize: 512,
    maxDpr: 1.5,
    streaming: 'mobile',
  }),
  'desktop-igpu': Object.freeze({
    tier: 'desktop-igpu',
    texScale: 0.75,
    shadowSize: 1024,
    maxDpr: 1.5,
    streaming: 'balanced',
  }),
  'desktop-dgpu': Object.freeze({
    tier: 'desktop-dgpu',
    texScale: 1,
    shadowSize: 2048,
    maxDpr: 2,
    streaming: 'high',
  }),
});

export const STREAMING_PROFILES = Object.freeze({
  off: Object.freeze({
    mode: 'off',
    enabled: false,
    chunkSize: 120,
    preloadRadius: Infinity,
    unloadRadius: Infinity,
  }),
  mobile: Object.freeze({
    mode: 'mobile',
    enabled: true,
    chunkSize: 120,
    preloadRadius: 1,
    unloadRadius: 2,
  }),
  balanced: Object.freeze({
    mode: 'balanced',
    enabled: true,
    chunkSize: 120,
    preloadRadius: 2,
    unloadRadius: 3,
  }),
  high: Object.freeze({
    mode: 'high',
    enabled: true,
    chunkSize: 120,
    preloadRadius: 3,
    unloadRadius: 4,
  }),
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
  if (touch) return 'mobile-ios';
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

/**
 * Resolve runtime performance profile and `?tier=` / `?texscale=` / `?stream=` URL overrides.
 */
export function resolveRuntimeProfile(_settings = {}, env = {}) {
  const search =
    env.search !== undefined
      ? String(env.search)
      : typeof location !== 'undefined'
        ? location.search
        : '';
  const params = new URLSearchParams(search);

  const tierParam = params.get('tier')?.trim().toLowerCase() || '';
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

  return {
    tier,
    texScale,
    shadowSize: base.shadowSize,
    maxDpr: base.maxDpr,
    stream,
    streamEnabled: stream !== 'off',
    streaming: STREAMING_PROFILES[stream],
    touch,
    gpuRenderer,
    flags: {
      tier: hasValidTierOverride ? tierParam : null,
      texScale:
        Number.isFinite(parsedTex) && parsedTex >= 0.25 && parsedTex <= 2 ? parsedTex : null,
      stream: streamParam !== null ? streamParam : null,
    },
  };
}
