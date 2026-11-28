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
  postFxLevel,
  shadowLevel,
} from '../../src/core/GraphicsConfig.js';
import { QPROF } from '../../src/core/GameLoop.js';

describe('GraphicsConfig presets', () => {
  it('every quality level declares every setting with a valid value', () => {
    for (const q of QUALITY) {
      const P = PRESETS[q];
      for (const k of Object.keys(SPEC)) expect(sanitize(k, P[k]), `${q}.${k}`).toBe(P[k]);
    }
  });

  it('keeps the old per-level behaviour (QPROF view of the presets)', () => {
    expect(QPROF.high).toEqual({ far: 2600, fog: 1, pr: 1.6, shadows: true, view: 1 });
    expect(QPROF.medium).toEqual({ far: 1500, fog: 1.12, pr: 1.0, shadows: true, view: 0.8 });
    expect(QPROF.low).toEqual({ far: 750, fog: 1.6, pr: 0.8, shadows: false, view: 0.45 });
    expect(QPROF.xlow).toEqual({ far: 450, fog: 2.4, pr: 0.6, shadows: false, view: 0.3 });
    expect(postFxLevel(PRESETS.high.postFx)).toBe('high');
    expect(postFxLevel(PRESETS.medium.postFx)).toBe('medium');
    expect(postFxLevel(PRESETS.low.postFx)).toBe('low');
    expect(shadowLevel(PRESETS.low.shadows)).toBe('low');
    expect(PRESETS.low.materialMode).toBe('lambert');
    expect(PRESETS.medium.antialias).toBe(true);
  });

  it('splits live and reload-only settings', () => {
    expect(LIVE_KEYS).toEqual(
      expect.arrayContaining(['dprCap', 'shadows', 'envLight', 'postFx', 'nightLamps'])
    );
    expect(RELOAD_KEYS).toEqual(expect.arrayContaining(['materialMode', 'antialias', 'crowdTier']));
    expect(LIVE_KEYS.some((k) => RELOAD_KEYS.includes(k))).toBe(false);
  });
});

describe('sanitize / cleanPatch', () => {
  it('drops unknown keys and invalid values, clamps numbers', () => {
    expect(
      cleanPatch({
        shadows: 'ultra',
        envLight: 'hemi',
        dprCap: '9',
        nightLamps: 3.4,
        antialias: 'yes',
        foo: 1,
      })
    ).toEqual({ envLight: 'hemi', dprCap: 3, nightLamps: 3 });
    expect(cleanPatch(null)).toEqual({});
    expect(sanitize('dprCap', 'abc')).toBeUndefined();
  });
});

describe('resolveGraphics priority: preset < player < safe mode < URL', () => {
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

  it('safe mode clamps the player overrides', () => {
    const c = resolveGraphics('high', {
      overrides: { dprCap: 1.5, shadows: 'high' },
      safeMode: true,
    });
    expect(c.dprCap).toBe(0.8);
    expect(c.shadows).toBe('off');
    expect(c.postFx).toBe('off');
    expect(c.nightLamps).toBe(0);
    expect(c.materialMode).toBe('lambert');
  });

  it('URL flags win over everything, including safe mode', () => {
    const c = resolveGraphics('low', {
      overrides: { dprCap: 1.0 },
      safeMode: true,
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

  it('integrated GPUs keep at most 2 lamp lights unless the URL asks', () => {
    expect(resolveGraphics('high', { tier: 'desktop-igpu' }).nightLamps).toBe(2);
    expect(resolveGraphics('high', { tier: 'desktop-dgpu' }).nightLamps).toBe(8);
    expect(
      resolveGraphics('high', { tier: 'desktop-igpu', url: parseUrlFlags('?lamps=8') }).nightLamps
    ).toBe(8);
  });

  it('an unknown level falls back to low', () => {
    expect(resolveGraphics('ultra')).toMatchObject(PRESETS.low);
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
    expect(parseUrlFlags('?bench&tier=mobile-lite')).toEqual({});
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
    expect(isCustom('low', { dprCap: 0.8 })).toBe(false);
    expect(isCustom('low', { dprCap: 1.2 })).toBe(true);
    expect(isCustom('low', undefined)).toBe(false);
    expect(diffFromPreset('medium', { shadows: 'medium', dprCap: 1.25 })).toEqual({ dprCap: 1.25 });
  });

  it('old saves without settings.gfx resolve to the plain preset', () => {
    const old = { quality: 'medium', fill: 'on', autoQ: 'low' };
    expect(resolveGraphics('medium', { overrides: old.gfx })).toMatchObject(PRESETS.medium);
  });

  it('reloadPending lists the reload-only settings that differ from the built world', () => {
    const built = resolveGraphics('low');
    expect(reloadPending(built, resolveGraphics('low', { overrides: { dprCap: 1.3 } }))).toEqual(
      []
    );
    expect(reloadPending(built, resolveGraphics('medium'))).toEqual(
      expect.arrayContaining(['materialMode', 'antialias', 'crowdTier'])
    );
  });
});
