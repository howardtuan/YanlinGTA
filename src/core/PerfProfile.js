/**
 * Device detection (mobile / desktop) and URL experiment flag parser (`?device=`, `?texscale=`, `?diag=`).
 *
 * The game tells exactly two kinds of device apart, once, from touch capability: `mobile` (touch first) and
 * `desktop` (mouse and keyboard). The device decides the quality level a first start uses, how far 自動 may climb,
 * and the load-time asset budget (canvas texture scale, shop-row atlas sheet size, texture anisotropy).
 * Everything else about how the game is drawn (pixel ratio, shadows, IBL, post-processing, view distance ...) is
 * owned solely by `GraphicsConfig.js` (presets per quality level, player overrides, URL flags).
 */

export const DEVICES = Object.freeze({
  mobile: Object.freeze({
    device: 'mobile',
    defaultQuality: 'low',
    autoMaxQuality: 'high',
    texScale: 0.5,
    atlasMaxW: 768,
    atlasMaxH: 1536,
    anisotropy: 2,
    targetFps: 30,
  }),
  desktop: Object.freeze({
    device: 'desktop',
    defaultQuality: 'medium',
    autoMaxQuality: 'ultra',
    texScale: 1,
    atlasMaxW: 2048,
    atlasMaxH: 4096,
    anisotropy: 4,
    targetFps: 60,
  }),
});

function detectTouch() {
  if (typeof matchMedia === 'function') {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const fine = matchMedia('(pointer: fine)').matches;
    const maxTouch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
    return coarse || (maxTouch > 0 && !fine);
  }
  return typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0;
}

/**
 * 'mobile' for touch-first devices, 'desktop' otherwise; `?device=mobile|desktop` wins.
 * @param {{ touch?: boolean, search?: string }} env  (defaults: the browser's own touch capability and location.search)
 */
export function detectDevice(env = {}) {
  const search =
    env.search !== undefined
      ? String(env.search)
      : typeof location !== 'undefined'
        ? location.search
        : '';
  const flag = new URLSearchParams(search).get('device')?.trim().toLowerCase();
  if (flag && Object.hasOwn(DEVICES, flag)) return flag;
  const touch = env.touch !== undefined ? Boolean(env.touch) : detectTouch();
  return touch ? 'mobile' : 'desktop';
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
 * The runtime profile: the device's defaults and budget plus the `?device=` / `?texscale=` / `?diag=` overrides.
 */
export function resolveRuntimeProfile(_settings = {}, env = {}) {
  const search =
    env.search !== undefined
      ? String(env.search)
      : typeof location !== 'undefined'
        ? location.search
        : '';
  const params = new URLSearchParams(search);

  const touch = env.touch !== undefined ? Boolean(env.touch) : detectTouch();
  const device = detectDevice({ touch, search });
  const base = DEVICES[device];
  const rawDevice = params.get('device')?.trim().toLowerCase() || '';

  const texScaleParam = params.get('texscale');
  const parsedTex = texScaleParam !== null ? Number.parseFloat(texScaleParam) : NaN;
  const texOk = Number.isFinite(parsedTex) && parsedTex >= 0.25 && parsedTex <= 2;

  const diagParam = params.has('diag') ? params.get('diag') : null;
  const diagMode = resolveDiagMode(params);

  return {
    ...base,
    texScale: texOk ? parsedTex : base.texScale,
    diagMode,
    diagEnabled: diagMode !== 'off',
    touch,
    flags: {
      device: Object.hasOwn(DEVICES, rawDevice) ? rawDevice : null,
      texScale: texOk ? parsedTex : null,
      diag: diagParam,
    },
  };
}
