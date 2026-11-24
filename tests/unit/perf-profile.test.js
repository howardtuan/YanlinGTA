import { describe, expect, it, vi } from 'vitest';
import {
  TIERS,
  STREAMING_PROFILES,
  detectTier,
  resolveRuntimeProfile,
} from '../../src/core/PerfProfile.js';

describe('PerfProfile', () => {
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
    it('uses hardware tier defaults and keeps streaming disabled by default', () => {
      const profile = resolveRuntimeProfile(
        {},
        { search: '', touch: false, gpuRenderer: 'RTX 4060' }
      );
      expect(profile.tier).toBe('desktop-dgpu');
      expect(profile.texScale).toBe(TIERS['desktop-dgpu'].texScale);
      expect(profile.postFx).toBe(true);
      expect(profile.stream).toBe('off');
      expect(profile.streamEnabled).toBe(false);
      expect(profile.streaming).toEqual(STREAMING_PROFILES.off);
    });

    it('applies valid ?tier=, ?texscale=, and ?stream= URL overrides without probing GPU', () => {
      const probeGpu = vi.fn(() => 'NVIDIA GeForce RTX 4060');
      const profile = resolveRuntimeProfile(
        {},
        {
          search: '?tier=mobile-lite&texscale=0.35&stream=1',
          touch: false,
          probeGpu,
        }
      );
      expect(probeGpu).not.toHaveBeenCalled();
      expect(profile.tier).toBe('mobile-lite');
      expect(profile.texScale).toBe(0.35);
      expect(profile.postFx).toBe(false);
      expect(profile.stream).toBe('mobile');
      expect(profile.streamEnabled).toBe(true);
      expect(profile.streaming).toEqual(STREAMING_PROFILES.mobile);
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
          search: '?tier=ultra&texscale=99&stream=unknown',
          touch: false,
          gpuRenderer: 'Apple M2',
        }
      );
      expect(profile.tier).toBe('desktop-igpu');
      expect(profile.texScale).toBe(TIERS['desktop-igpu'].texScale);
      expect(profile.stream).toBe('off');
      expect(profile.flags).toEqual({
        tier: null,
        texScale: null,
        stream: 'unknown',
      });
    });
  });
});
