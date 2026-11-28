import { describe, expect, it } from 'vitest';
import { DEVICES, detectDevice, resolveRuntimeProfile } from '../../src/core/PerfProfile.js';
import * as PP from '../../src/core/PerfProfile.js';
import { PRESETS, QUALITY } from '../../src/core/GraphicsConfig.js';

describe('PerfProfile', () => {
  describe('DEVICES (#461): mobile / desktop only', () => {
    it('declares the two devices with the #461 budgets', () => {
      expect(Object.keys(DEVICES)).toEqual(['mobile', 'desktop']);
      expect(DEVICES.mobile).toEqual({
        device: 'mobile',
        defaultQuality: 'low',
        autoMaxQuality: 'high',
        texScale: 0.5,
        atlasMaxW: 768,
        atlasMaxH: 1536,
        anisotropy: 2,
        targetFps: 30,
      });
      expect(DEVICES.desktop).toEqual({
        device: 'desktop',
        defaultQuality: 'medium',
        autoMaxQuality: 'ultra',
        texScale: 1,
        atlasMaxW: 2048,
        atlasMaxH: 4096,
        anisotropy: 4,
        targetFps: 60,
      });
    });

    it('quality levels it names exist; visual settings stay in GraphicsConfig', () => {
      for (const d of Object.values(DEVICES)) {
        expect(QUALITY).toContain(d.defaultQuality);
        expect(QUALITY).toContain(d.autoMaxQuality);
        expect(d.shadows).toBeUndefined();
        expect(d.dprCap).toBeUndefined();
        expect(d.postFx).toBeUndefined();
        expect(PRESETS[d.defaultQuality]).toBeDefined();
      }
    });

    it('has no GPU renderer guessing left', () => {
      expect(Object.keys(PP).sort()).toEqual(['DEVICES', 'detectDevice', 'resolveRuntimeProfile']);
    });
  });

  describe('detectDevice', () => {
    it('touch -> mobile, otherwise desktop', () => {
      expect(detectDevice({ touch: true, search: '' })).toBe('mobile');
      expect(detectDevice({ touch: false, search: '' })).toBe('desktop');
    });

    it('?device=mobile|desktop wins over touch; anything else is ignored', () => {
      expect(detectDevice({ touch: false, search: '?device=mobile' })).toBe('mobile');
      expect(detectDevice({ touch: true, search: '?device=Desktop' })).toBe('desktop');
      expect(detectDevice({ touch: true, search: '?device=igpu' })).toBe('mobile');
      expect(detectDevice({ touch: false, search: '?tier=mobile' })).toBe('desktop');
    });
  });

  describe('resolveRuntimeProfile', () => {
    it('uses the device defaults and keeps diag disabled by default', () => {
      const p = resolveRuntimeProfile({}, { search: '', touch: false });
      expect(p).toMatchObject(DEVICES.desktop);
      expect(p.diagMode).toBe('off');
      expect(p.diagEnabled).toBe(false);
      expect(p.flags).toEqual({ device: null, texScale: null, diag: null });

      const m = resolveRuntimeProfile({}, { search: '', touch: true });
      expect(m).toMatchObject(DEVICES.mobile);
      expect(m.touch).toBe(true);
    });

    it('applies valid ?device=, ?texscale=, and ?diag URL overrides', () => {
      const p = resolveRuntimeProfile(
        {},
        { search: '?device=mobile&texscale=0.35&diag=1', touch: false }
      );
      expect(p.device).toBe('mobile');
      expect(p.texScale).toBe(0.35);
      expect(p.atlasMaxW).toBe(768);
      expect(p.atlasMaxH).toBe(1536);
      expect(p.anisotropy).toBe(2);
      expect(p.diagMode).toBe('on');
      expect(p.diagEnabled).toBe(true);
      expect(p.flags).toEqual({ device: 'mobile', texScale: 0.35, diag: '1' });
    });

    it('has no safe mode any more (#455): ?safemode= is ignored', () => {
      const p = resolveRuntimeProfile({}, { search: '?safemode=1', touch: false });
      expect(p.safeMode).toBeUndefined();
      expect(p.flags.safeMode).toBeUndefined();
      expect(p.texScale).toBe(1);
      expect(p.atlasMaxW).toBe(2048);
    });

    it('supports bare ?diag and ?diag=halt flags', () => {
      expect(resolveRuntimeProfile({}, { search: '?diag', touch: true }).diagMode).toBe('on');
      expect(resolveRuntimeProfile({}, { search: '?diag=halt', touch: true }).diagMode).toBe(
        'halt'
      );
      const off = resolveRuntimeProfile({}, { search: '?diag=0', touch: true });
      expect(off.diagMode).toBe('off');
      expect(off.diagEnabled).toBe(false);
    });

    it('ignores invalid URL parameter overrides and falls back safely', () => {
      const p = resolveRuntimeProfile(
        {},
        { search: '?device=tablet&texscale=99&diag=weird&tier=desktop', touch: false }
      );
      expect(p.device).toBe('desktop');
      expect(p.texScale).toBe(1);
      expect(p.diagMode).toBe('off');
      expect(p.flags).toEqual({ device: null, texScale: null, diag: 'weird' });
    });
  });
});
