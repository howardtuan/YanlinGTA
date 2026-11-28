/**
 * Runtime hardware-tier detection and URL experiment flag parser (`?tier=`, `?texscale=`, `?diag=`, `?safemode=`).
 * Visual / display settings (pixel ratio, shadows, IBL, post-processing, view distance ...) are owned solely by
 * `GraphicsConfig.js` (presets per quality level, player overrides, URL flags).
 */

export const TIERS = Object.freeze({
  'mobile-lite': Object.freeze({
    tier: 'mobile-lite',
    texScale: 0.5,
    atlasMaxW: 768,
    atlasMaxH: 1536,
  }),
  'desktop-igpu': Object.freeze({
    tier: 'desktop-igpu',
    texScale: 0.75,
    atlasMaxW: 2048,
    // WebGL2 iGPUs (Apple M, Iris Xe / UHD, Radeon iGPU) all take >= 8192 px textures; a taller cap keeps long
    // shophouse rows in fewer atlases (#388)
    atlasMaxH: 4096,
  }),
  'desktop-dgpu': Object.freeze({
    tier: 'desktop-dgpu',
    texScale: 1,
    atlasMaxW: 2048,
    atlasMaxH: 4096,
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

function resolveDiagMode(params) {
  if (!params.has('diag')) return 'off';
  const norm = (params.get('diag') ?? '').trim().toLowerCase();
  if (norm === '0' || norm === 'false' || norm === 'off') return 'off';
  if (norm === 'halt' || norm === 'pause') return 'halt';
  if (norm === '' || norm === '1' || norm === 'true' || norm === 'on') return 'on';
  return 'off';
}

function resolveSafeModeOverride(params) {
  if (!params.has('safemode')) return null;
  const norm = (params.get('safemode') ?? '').trim().toLowerCase();
  if (norm === '0' || norm === 'false' || norm === 'off') return false;
  if (norm === '' || norm === '1' || norm === 'true' || norm === 'on') return true;
  return null;
}

/**
 * Clamp texture & atlas budgets when self-healing safe mode is active (preserving explicit `?texscale=`).
 */
export function applySafeMode(profile) {
  if (!profile) return profile;
  if (profile.flags?.texScale == null) {
    profile.texScale = Math.min(profile.texScale, 0.375);
  }
  profile.atlasMaxW = Math.min(profile.atlasMaxW, 512);
  profile.atlasMaxH = Math.min(profile.atlasMaxH, 1024);
  profile.safeMode = true;
  return profile;
}

/**
 * Resolve runtime hardware profile and `?tier=` / `?texscale=` / `?diag=` / `?safemode=` URL overrides.
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

  const diagParam = params.has('diag') ? params.get('diag') : null;
  const diagMode = resolveDiagMode(params);
  const safeModeOverride = resolveSafeModeOverride(params);

  const profile = {
    tier,
    texScale,
    atlasMaxW: base.atlasMaxW,
    atlasMaxH: base.atlasMaxH,
    diagMode,
    diagEnabled: diagMode !== 'off',
    safeMode: false,
    touch,
    gpuRenderer,
    flags: {
      tier: hasValidTierOverride ? tierParam : null,
      texScale:
        Number.isFinite(parsedTex) && parsedTex >= 0.25 && parsedTex <= 2 ? parsedTex : null,
      diag: diagParam,
      safeMode: safeModeOverride,
    },
  };

  if (safeModeOverride === true || (safeModeOverride === null && env.safeMode === true)) {
    applySafeMode(profile);
  }
  return profile;
}
