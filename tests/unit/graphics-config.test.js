import { describe, it, expect } from 'vitest';
import {
  PRESETS,
  QUALITY,
  SPEC,
  LIVE_KEYS,
  RELOAD_KEYS,
  sanitize,
  cleanPatch,
  parseUrlFlags,
  resolveGraphics,
  mergeOverrides,
  isCustom,
  diffFromPreset,
  reloadPending,
  CROWD_SPEC,
  Q_NAME,
} from '../../src/core/GraphicsConfig.js';
import * as GC from '../../src/core/GraphicsConfig.js';

// the order every setting improves in, worst first (numbers that improve as they shrink are listed with -1)
const ORDER = {
  shadows: ['off', 'low', 'medium', 'high'],
  envLight: ['hemi', 'pmrem'],
  postFx: ['off', 'bloom-quarter', 'bloom-half-msaa'],
  materialMode: ['lambert', 'standard'],
  crowdTier: QUALITY,
};
const SHRINKS = new Set(['fogScale', 'shadowRate']); // thinner fog, shadows drawn more often = better
const rank = (k, v) =>
  ORDER[k]
    ? ORDER[k].indexOf(v)
    : typeof v === 'boolean'
      ? k === 'dynRes'
        ? Number(!v) // dynamic resolution trades sharpness for frames: the low levels have it
        : Number(v)
      : SHRINKS.has(k)
        ? -v
        : v;

describe('GraphicsConfig presets', () => {
  it('every quality level declares every setting with a valid value', () => {
    for (const q of QUALITY) {
      const P = PRESETS[q];
      for (const k of Object.keys(SPEC)) expect(sanitize(k, P[k]), `${q}.${k}`).toBe(P[k]);
    }
  });

  it('has five levels xlow < low < medium < high < ultra (#460)', () => {
    expect(QUALITY).toEqual(['xlow', 'low', 'medium', 'high', 'ultra']);
    expect(QUALITY.map((q) => Q_NAME[q])).toEqual(['超低', '低', '中', '高', '極致']);
    expect(Object.keys(PRESETS).sort()).toEqual([...QUALITY].sort());
  });

  it('every setting is monotonic: no level is worse than the one below it (#458 had low > medium)', () => {
    for (const k of Object.keys(SPEC))
      for (let i = 1; i < QUALITY.length; i++) {
        const lo = PRESETS[QUALITY[i - 1]][k],
          hi = PRESETS[QUALITY[i]][k];
        expect(
          rank(k, hi),
          `${k}: ${QUALITY[i - 1]} ${lo} -> ${QUALITY[i]} ${hi}`
        ).toBeGreaterThanOrEqual(rank(k, lo));
      }
    // the ones that grow strictly level by level
    for (const k of ['dprCap', 'viewScale', 'far', 'interiorCullDist'])
      for (let i = 1; i < QUALITY.length; i++)
        expect(PRESETS[QUALITY[i]][k], k).toBeGreaterThan(PRESETS[QUALITY[i - 1]][k]);
    for (let i = 1; i < QUALITY.length; i++)
      expect(PRESETS[QUALITY[i]].fogScale).toBeLessThan(PRESETS[QUALITY[i - 1]].fogScale);
  });

  it('matches the #461 table', () => {
    expect(QUALITY.map((q) => PRESETS[q].dprCap)).toEqual([0.75, 1.0, 1.15, 1.4, 1.6]);
    expect(QUALITY.map((q) => PRESETS[q].dprMin)).toEqual([0.6, 0.8, 1.0, 1.15, 1.4]);
    expect(QUALITY.map((q) => PRESETS[q].shadows)).toEqual(['off', 'off', 'low', 'medium', 'high']);
    expect(QUALITY.map((q) => PRESETS[q].shadowRate)).toEqual([2, 2, 2, 2, 1]);
    expect(QUALITY.map((q) => PRESETS[q].postFx)).toEqual([
      'off',
      'off',
      'off',
      'bloom-quarter',
      'bloom-half-msaa',
    ]);
    expect(QUALITY.map((q) => PRESETS[q].nightLamps)).toEqual([0, 0, 2, 4, 8]);
    expect(QUALITY.map((q) => PRESETS[q].far)).toEqual([500, 800, 1400, 2000, 2600]);
    expect(QUALITY.map((q) => PRESETS[q].interiorCullDist)).toEqual([30, 45, 70, 100, 150]);
    expect(QUALITY.map((q) => PRESETS[q].antialias)).toEqual([false, false, false, true, true]);
    expect(QUALITY.map((q) => PRESETS[q].crowdTier)).toEqual(QUALITY);
    expect(QUALITY.every((q) => PRESETS[q].fill === true)).toBe(true);
  });

  it('CROWD_SPEC declares every crowd tier, never shrinking as the tier grows', () => {
    expect(Object.keys(CROWD_SPEC)).toEqual(QUALITY);
    const W = ['low', 'medium', 'high'];
    for (let i = 1; i < QUALITY.length; i++) {
      const a = CROWD_SPEC[QUALITY[i - 1]],
        b = CROWD_SPEC[QUALITY[i]];
      for (const k of ['skyline', 'traffic', 'peds', 'festive', 'pudding', 'parkedDist'])
        expect(b[k], k).toBeGreaterThanOrEqual(a[k]);
      expect(W.indexOf(b.world)).toBeGreaterThanOrEqual(W.indexOf(a.world));
      expect(Number(!b.lean)).toBeGreaterThanOrEqual(Number(!a.lean));
    }
    expect(CROWD_SPEC.xlow).toMatchObject({ skyline: 40, traffic: 8, peds: 10, lean: true });
  });

  it('has no old compatibility helpers left', () => {
    for (const k of ['tierClamp', 'postFxLevel', 'shadowLevel']) expect(GC[k]).toBeUndefined();
  });

  it('splits live and reload-only settings', () => {
    expect(LIVE_KEYS).toEqual(
      expect.arrayContaining(['dprCap', 'shadows', 'envLight', 'postFx', 'nightLamps'])
    );
    expect(LIVE_KEYS).toEqual(expect.arrayContaining(['shadowRate', 'interiorCullDist']));
    expect(RELOAD_KEYS).toEqual(['materialMode', 'antialias', 'crowdTier', 'fill']);
    expect(LIVE_KEYS.some((k) => RELOAD_KEYS.includes(k))).toBe(false);
  });
});

describe('sanitize / cleanPatch', () => {
  it('drops unknown keys and invalid values, clamps numbers', () => {
    expect(
      cleanPatch({
        shadows: 'ultra',
        shadowRate: 3,
        fill: 'no',
        envLight: 'hemi',
        dprCap: '9',
        nightLamps: 3.4,
        antialias: 'yes',
        foo: 1,
      })
    ).toEqual({ envLight: 'hemi', dprCap: 3, nightLamps: 3 });
    expect(cleanPatch(null)).toEqual({});
    expect(sanitize('dprCap', 'abc')).toBeUndefined();
    expect(cleanPatch({ shadowRate: 1, fill: false, crowdTier: 'full' })).toEqual({
      shadowRate: 1,
      fill: false,
    });
    expect(sanitize('shadowRate', '2')).toBe(2);
  });
});

describe('resolveGraphics priority: preset < player < URL', () => {
  it('expands the preset', () => {
    const c = resolveGraphics('medium');
    expect(c).toMatchObject(PRESETS.medium);
    expect(c.quality).toBe('medium');
  });

  it('player overrides win over the preset', () => {
    const c = resolveGraphics('low', { overrides: { dprCap: 1.25, shadows: 'low' } });
    expect(c.dprCap).toBe(1.25);
    expect(c.shadows).toBe('low');
    expect(c.postFx).toBe('off');
  });

  it('has no safe-mode clamp (#455): overrides stay as chosen', () => {
    const c = resolveGraphics('high', {
      overrides: { dprCap: 1.5, shadows: 'high' },
      safeMode: true,
    });
    expect(c.dprCap).toBe(1.5);
    expect(c.shadows).toBe('high');
  });

  it('URL flags win over everything', () => {
    const c = resolveGraphics('low', {
      overrides: { dprCap: 1.0 },
      url: parseUrlFlags('?dpr=1.5&shadows=high&ibl=0&postfx=half&lamps=4&mat=pbr'),
    });
    expect(c).toMatchObject({
      dprCap: 1.5,
      shadows: 'high',
      envLight: 'hemi',
      postFx: 'bloom-half-msaa',
      nightLamps: 4,
      materialMode: 'standard',
    });
  });

  it('an unknown level falls back to low', () => {
    expect(resolveGraphics('full')).toMatchObject(PRESETS.low);
    expect(resolveGraphics('ultra')).toMatchObject(PRESETS.ultra);
  });
});

describe('parseUrlFlags', () => {
  it('reads the experiment flags and their aliases', () => {
    expect(parseUrlFlags('?ibl=1')).toEqual({ envLight: 'pmrem' });
    expect(parseUrlFlags('?ibl=hemi')).toEqual({ envLight: 'hemi' });
    expect(parseUrlFlags('?postfx=0')).toEqual({ postFx: 'off' });
    expect(parseUrlFlags('?postfx=quarter')).toEqual({ postFx: 'bloom-quarter' });
    expect(parseUrlFlags('?shadows=1')).toEqual({ shadows: 'medium' });
    expect(parseUrlFlags('?shadows=off')).toEqual({ shadows: 'off' });
    expect(parseUrlFlags('?mat=lite&aa=0')).toEqual({ materialMode: 'lambert', antialias: false });
    expect(parseUrlFlags('?bench&device=mobile')).toEqual({});
    expect(parseUrlFlags('?shadowrate=1&fill=0&dynres=1')).toEqual({
      shadowRate: 1,
      fill: false,
      dynRes: true,
    });
    expect(parseUrlFlags('?shadowrate=3&fill=maybe')).toEqual({});
    expect(parseUrlFlags('?dpr=nope&lamps=99')).toEqual({ nightLamps: 8 });
  });
});

describe('player overrides bookkeeping', () => {
  it('mergeOverrides: values replace, null goes back to the preset', () => {
    expect(
      mergeOverrides({ dprCap: 1.2, shadows: 'low' }, { shadows: null, envLight: 'hemi' })
    ).toEqual({ dprCap: 1.2, envLight: 'hemi' });
    expect(mergeOverrides(undefined, { bogus: 1 })).toEqual({});
  });

  it('isCustom / diffFromPreset ignore values equal to the preset', () => {
    expect(isCustom('low', { dprCap: 1.0 })).toBe(false);
    expect(isCustom('low', { dprCap: 1.2 })).toBe(true);
    expect(isCustom('low', { fill: false })).toBe(true);
    expect(isCustom('low', undefined)).toBe(false);
    expect(diffFromPreset('medium', { shadows: 'low', dprCap: 1.25 })).toEqual({ dprCap: 1.25 });
  });

  it('old saves without settings.gfx resolve to the plain preset', () => {
    const old = { quality: 'medium', autoQ: 'low' };
    expect(resolveGraphics('medium', { overrides: old.gfx })).toMatchObject(PRESETS.medium);
  });

  it('reloadPending lists the reload-only settings that differ from the built world', () => {
    const built = resolveGraphics('low');
    expect(reloadPending(built, resolveGraphics('low', { overrides: { dprCap: 1.3 } }))).toEqual(
      []
    );
    expect(reloadPending(built, resolveGraphics('medium'))).toEqual(
      expect.arrayContaining(['materialMode', 'crowdTier'])
    );
    // 補建街區 goes through the same reload bookkeeping (it used to be settings.fill on its own)
    expect(reloadPending(built, resolveGraphics('low', { overrides: { fill: false } }))).toEqual([
      'fill',
    ]);
    expect(reloadPending(built, resolveGraphics('low', { overrides: { shadowRate: 1 } }))).toEqual(
      []
    );
  });
});
