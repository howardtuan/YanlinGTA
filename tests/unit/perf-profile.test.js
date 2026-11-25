import { describe, expect, it, vi } from 'vitest';
import {
  TIERS,
  STREAMING_PROFILES,
  detectTier,
  resolveRuntimeProfile,
} from '../../src/core/PerfProfile.js';

describe('PerfProfile', () => {
  describe('TIERS single-responsibility separation', () => {
    it('does not duplicate GameLoop QPROF visual quality fields', () => {
      for (const tier of Object.values(TIERS)) {
        expect(tier.shadowSize).toBeUndefined();
        expect(tier.maxDpr).toBeUndefined();
        expect(tier.postFx).toBeUndefined();
        expect(Number.isFinite(tier.texScale)).toBe(true);
        expect(Number.isFinite(tier.atlasMaxW)).toBe(true);
        expect(Number.isFinite(tier.atlasMaxH)).toBe(true);
      }
    });
  });

  describe('detectTier', () => {
    it('classifies touch devices as mobile-lite regardless of GPU string', () => {
      expect(detectTier({ touch: true, gpuRenderer: 'Apple GPU' })).toBe('mobile-lite');
      expect(detectTier({ touch: true, gpuRenderer: 'NVIDIA GeForce RTX 4060' })).toBe(
        'mobile-lite'
      );
    });

    it('classifies integrated and low-power desktop GPUs as desktop-igpu', () => {
      for (const gpuRenderer of [
        'Intel Iris Xe Graphics',
        'Apple M2',
        'AMD Radeon 780M',
        'NVIDIA GeForce MX450',
        '',
      ]) {
        expect(detectTier({ touch: false, gpuRenderer })).toBe('desktop-igpu');
      }
    });

    it('classifies discrete desktop GPUs as desktop-dgpu', () => {
      for (const gpuRenderer of [
        'NVIDIA GeForce RTX 4060',
        'AMD Radeon RX 7600',
        'Intel Arc A770',
      ]) {
        expect(detectTier({ touch: false, gpuRenderer })).toBe('desktop-dgpu');
      }
    });
  });

  describe('resolveRuntimeProfile', () => {
    it('uses hardware tier defaults and keeps streaming and diag disabled by default', () => {
      const profile = resolveRuntimeProfile(
        {},
        { search: '', touch: false, gpuRenderer: 'RTX 4060' }
      );
      expect(profile.tier).toBe('desktop-dgpu');
      expect(profile.texScale).toBe(TIERS['desktop-dgpu'].texScale);
      expect(profile.atlasMaxW).toBe(2048);
      expect(profile.atlasMaxH).toBe(4096);
      expect(profile.stream).toBe('off');
      expect(profile.streamEnabled).toBe(false);
      expect(profile.streaming).toEqual(STREAMING_PROFILES.off);
      expect(profile.diagMode).toBe('off');
      expect(profile.diagEnabled).toBe(false);
    });

    it('applies valid ?tier=, ?texscale=, ?stream=, and ?diag URL overrides without probing GPU', () => {
      const probeGpu = vi.fn(() => 'NVIDIA GeForce RTX 4060');
      const profile = resolveRuntimeProfile(
        {},
        {
          search: '?tier=mobile-lite&texscale=0.35&stream=1&diag=1',
          touch: false,
          probeGpu,
        }
      );
      expect(probeGpu).not.toHaveBeenCalled();
      expect(profile.tier).toBe('mobile-lite');
      expect(profile.texScale).toBe(0.35);
      expect(profile.atlasMaxW).toBe(1024);
      expect(profile.atlasMaxH).toBe(2048);
      expect(profile.stream).toBe('mobile');
      expect(profile.streamEnabled).toBe(true);
      expect(profile.streaming).toEqual(STREAMING_PROFILES.mobile);
      expect(profile.diagMode).toBe('on');
      expect(profile.diagEnabled).toBe(true);
    });

    it('supports bare ?diag and ?diag=halt flags', () => {
      const bare = resolveRuntimeProfile({}, { search: '?diag', touch: true });
      expect(bare.diagMode).toBe('on');
      expect(bare.diagEnabled).toBe(true);

      const halt = resolveRuntimeProfile({}, { search: '?diag=halt', touch: true });
      expect(halt.diagMode).toBe('halt');
      expect(halt.diagEnabled).toBe(true);

      const off = resolveRuntimeProfile({}, { search: '?diag=0', touch: true });
      expect(off.diagMode).toBe('off');
      expect(off.diagEnabled).toBe(false);
    });

    it('normalizes backwards-compatible ?tier=mobile-ios alias to mobile-lite', () => {
      const probeGpu = vi.fn(() => 'NVIDIA GeForce RTX 4060');
      const profile = resolveRuntimeProfile(
        {},
        {
          search: '?tier=mobile-ios',
          touch: false,
          probeGpu,
        }
      );
      expect(probeGpu).not.toHaveBeenCalled();
      expect(profile.tier).toBe('mobile-lite');
      expect(profile.flags.tier).toBe('mobile-lite');
    });

    it('supports named ?stream= profiles and explicit disable values', () => {
      const balanced = resolveRuntimeProfile(
        {},
        { search: '?stream=balanced', touch: true, gpuRenderer: '' }
      );
      expect(balanced.stream).toBe('balanced');
      expect(balanced.streamEnabled).toBe(true);

      const off = resolveRuntimeProfile(
        {},
        { search: '?stream=0', touch: false, gpuRenderer: 'Intel Iris Xe' }
      );
      expect(off.stream).toBe('off');
      expect(off.streamEnabled).toBe(false);
    });

    it('ignores invalid URL parameter overrides and falls back safely', () => {
      const profile = resolveRuntimeProfile(
        {},
        {
          search: '?tier=ultra&texscale=99&stream=unknown&diag=weird',
          touch: false,
          gpuRenderer: 'Apple M2',
        }
      );
      expect(profile.tier).toBe('desktop-igpu');
      expect(profile.texScale).toBe(TIERS['desktop-igpu'].texScale);
      expect(profile.stream).toBe('off');
      expect(profile.diagMode).toBe('off');
      expect(profile.flags).toEqual({
        tier: null,
        texScale: null,
        stream: 'unknown',
        diag: 'weird',
      });
    });
  });
});
