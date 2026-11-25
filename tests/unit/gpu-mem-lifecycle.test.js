import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  blankTexture,
  canvasTexture,
  configureGpuMem,
  markAtlasSource,
  releaseAtlasSources,
  resetGpuMem,
  scaledCanvas,
  texScale,
  uploadAndRelease,
} from '../../src/graphics/GpuMemLifecycle.js';
import { TIERS, applySafeMode } from '../../src/core/PerfProfile.js';

// happy-dom has no 2D canvas: getContext() is null unless a test hands out a stand-in
const fakeContext = () => {
  const ctx = { setTransform: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
  return ctx;
};
const profile = (tier, extra = {}) => ({ ...TIERS[tier], flags: { texScale: null }, ...extra });
const fakeRenderer = () => ({ initTexture: vi.fn() });

afterEach(() => {
  resetGpuMem();
  vi.restoreAllMocks();
});

describe('GpuMemLifecycle：手機縮圖、上傳後釋放畫布', () => {
  it('only phones, the safe mode and ?texscale= scale textures; desktops keep every pixel', () => {
    expect(configureGpuMem(profile('desktop-dgpu'))).toEqual({
      texScale: 1,
      atlasScale: 1,
      atlasMaxH: 4096,
    });
    // desktop-igpu says texScale 0.75 in PerfProfile, but the laptop keeps its look
    expect(configureGpuMem(profile('desktop-igpu'))).toEqual({
      texScale: 1,
      atlasScale: 1,
      atlasMaxH: 4096,
    });
    expect(configureGpuMem(profile('mobile-lite'))).toEqual({
      texScale: 0.5,
      atlasScale: 0.5,
      atlasMaxH: 4096, // a 1024 x 2048 sheet
    });
    const safe = applySafeMode(profile('mobile-lite'));
    expect(configureGpuMem(safe)).toEqual({ texScale: 0.375, atlasScale: 0.375, atlasMaxH: 2048 });
    const flagged = profile('desktop-igpu', { texScale: 0.6, flags: { texScale: 0.6 } });
    expect(configureGpuMem(flagged).texScale).toBe(0.6);
  });

  it('a scaled canvas keeps the size it is drawn at, and the drawing is scaled to fit', () => {
    const ctx = fakeContext();
    configureGpuMem(profile('mobile-lite'));
    const { cv, g } = scaledCanvas(256, 192);
    expect([cv.width, cv.height, cv.lw, cv.lh]).toEqual([128, 96, 256, 192]);
    expect(g).toBe(ctx);
    expect(ctx.setTransform).toHaveBeenCalledWith(0.5, 0, 0, 0.5, 0, 0);
    resetGpuMem();
    const full = scaledCanvas(256, 192);
    expect([full.cv.width, full.cv.height, full.cv.lw]).toEqual([256, 192, undefined]);
  });

  it('canvasTexture draws at the full size; without a 2D context it gives the blank texture, no crash', () => {
    const draw = vi.fn();
    expect(canvasTexture(64, 32, draw)).toBe(blankTexture());
    expect(draw).not.toHaveBeenCalled();
    fakeContext();
    configureGpuMem(profile('mobile-lite'));
    const t = canvasTexture(64, 32, draw);
    expect(draw).toHaveBeenCalledWith(expect.anything(), 64, 32);
    expect(t.isCanvasTexture).toBe(true);
    expect(t.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(t.wrapS).toBe(THREE.RepeatWrapping);
    expect(canvasTexture(64, 32, draw, false).wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(t.image.width).toBe(32);
  });

  it('uploadAndRelease needs a renderer: then the texture goes to the GPU and the canvas shrinks to 1x1', () => {
    fakeContext();
    const t = canvasTexture(64, 64, () => {});
    expect(uploadAndRelease(t)).toBe(false);
    expect(t.image.width).toBe(64);
    const r = fakeRenderer();
    configureGpuMem(profile('desktop-dgpu'), r);
    expect(uploadAndRelease(t)).toBe(true);
    expect(r.initTexture).toHaveBeenCalledWith(t);
    expect([t.image.width, t.image.height]).toEqual([1, 1]);
    expect(t.userData.canvasReleased).toBe(true);
  });

  it('atlas sources: released unless the scene still shows them, and their cache keys go', () => {
    fakeContext();
    configureGpuMem(profile('desktop-dgpu'), fakeRenderer());
    const shown = canvasTexture(32, 32, () => {}),
      packed = canvasTexture(32, 32, () => {});
    const cache = { shown, packed, other: canvasTexture(8, 8, () => {}) };
    const scene = new THREE.Scene();
    scene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: shown }))
    );
    markAtlasSource(shown);
    markAtlasSource(packed);
    expect(releaseAtlasSources(scene, cache)).toBe(1);
    expect(shown.image.width).toBe(32);
    expect(packed.image.width).toBe(1);
    expect(Object.keys(cache)).toEqual(['shown', 'other']);
    expect(releaseAtlasSources(scene, cache)).toBe(0); // marked once, released once
  });

  it('unconfigured (tests, tools): nothing is marked, scaled or released', () => {
    fakeContext();
    const t = canvasTexture(16, 16, () => {});
    markAtlasSource(t);
    expect(releaseAtlasSources(new THREE.Scene(), { t })).toBe(0);
    expect(texScale()).toBe(1);
    expect(t.image.width).toBe(16);
  });
});
