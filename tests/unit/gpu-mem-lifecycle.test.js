// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  TEX_SLOTS,
  blankTexture,
  canvasTexture,
  configureGpuMem,
  flushShared,
  gcNudge,
  markAtlasSource,
  markDynamic,
  markReusable,
  markStaticGeometry,
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
  it('every tier stores textures at its PerfProfile texScale, atlas sheets within atlasMaxW x atlasMaxH', () => {
    expect(configureGpuMem(profile('desktop-dgpu'))).toEqual({
      texScale: 1,
      atlasScale: 1,
      atlasMaxH: 4096,
    });
    // M-series / Iris Xe laptops: 0.75, sheets at most 2048 tall (stored 1536 x 1536)
    expect(configureGpuMem(profile('desktop-igpu'))).toEqual({
      texScale: 0.75,
      atlasScale: 0.75,
      atlasMaxH: 2048,
    });
    expect(configureGpuMem(profile('mobile-lite'))).toEqual({
      texScale: 0.5,
      atlasScale: 0.5,
      atlasMaxH: 4096, // a 1024 x 2048 sheet
    });
    const safe = applySafeMode(profile('mobile-lite'));
    expect(configureGpuMem(safe)).toEqual({ texScale: 0.375, atlasScale: 0.375, atlasMaxH: 2048 });
    const flagged = profile('desktop-dgpu', { texScale: 0.6, flags: { texScale: 0.6 } });
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
    expect([t.userData.gpuW, t.userData.gpuH]).toEqual([64, 64]);
    // idempotent: a second call never overwrites gpuW / gpuH with 1x1
    expect(uploadAndRelease(t)).toBe(false);
    expect([t.userData.gpuW, t.userData.gpuH]).toEqual([64, 64]);
  });

  it('atlas sources: released unless the scene still shows them, and their cache keys go', () => {
    fakeContext();
    configureGpuMem(profile('desktop-dgpu'), fakeRenderer());
    const shown = canvasTexture(32, 32, () => {}),
      shaderTex = canvasTexture(32, 32, () => {}),
      packed = canvasTexture(32, 32, () => {});
    const cache = { shown, shaderTex, packed, other: canvasTexture(8, 8, () => {}) };
    const scene = new THREE.Scene();
    scene.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(),
        new THREE.MeshStandardMaterial({ map: shown, emissiveMap: shown })
      )
    );
    scene.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(),
        new THREE.ShaderMaterial({ uniforms: { uTex: { value: shaderTex } } })
      )
    );
    markAtlasSource(shown);
    markAtlasSource(shaderTex);
    markAtlasSource(packed);
    expect(TEX_SLOTS).toContain('map');
    expect(TEX_SLOTS).toContain('emissiveMap');
    expect(releaseAtlasSources(scene, cache)).toBe(1);
    expect(shown.image.width).toBe(32);
    expect(shaderTex.image.width).toBe(32);
    expect(packed.image.width).toBe(1);
    expect(Object.keys(cache)).toEqual(['shown', 'shaderTex', 'other']);
    expect(releaseAtlasSources(scene, cache)).toBe(0); // marked once, released once
  });

  it('atlas sources: minBatch, keepReusable, and fromChild batch release without scanning MapBuilder meshes', () => {
    fakeContext();
    configureGpuMem(profile('desktop-dgpu'), fakeRenderer());
    const worldTex = canvasTexture(16, 16, () => {}),
      reusable = markReusable(canvasTexture(32, 32, () => {})),
      oneOff1 = canvasTexture(24, 24, () => {}),
      oneOff2 = canvasTexture(24, 24, () => {}),
      dyn = markDynamic(canvasTexture(24, 24, () => {}));
    const cache = { reusable, oneOff1, oneOff2, dyn };
    const scene = new THREE.Scene();
    const worldGroup = new THREE.Group();
    const worldMat = new THREE.MeshBasicMaterial({ map: worldTex });
    const traverseSpy = vi.spyOn(worldGroup, 'traverse');
    worldGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(), worldMat));
    scene.add(worldGroup); // child 0: pre-existing MapBuilder world
    const interiorStart = scene.children.length;
    scene.add(new THREE.Group()); // child 1: interiors subtree

    markAtlasSource(reusable);
    markAtlasSource(oneOff1);
    markAtlasSource(dyn); // ignored because dynamic
    expect(dyn.userData.dynamic).toBe(true);
    // below minBatch: deferred
    expect(
      releaseAtlasSources(scene, cache, {
        minBatch: 2,
        keepReusable: true,
        fromChild: interiorStart,
      })
    ).toBe(0);
    expect(oneOff1.image.width).toBe(24);
    expect(traverseSpy).not.toHaveBeenCalled();

    // meets minBatch: one-offs released, reusable kept, worldGroup skipped
    markAtlasSource(oneOff2);
    expect(
      releaseAtlasSources(scene, cache, {
        minBatch: 2,
        keepReusable: true,
        fromChild: interiorStart,
      })
    ).toBe(2);
    expect(traverseSpy).not.toHaveBeenCalled();
    expect(oneOff1.image.width).toBe(1);
    expect(oneOff2.image.width).toBe(1);
    expect(reusable.image.width).toBe(32);
    expect(dyn.image.width).toBe(24);
    expect(Object.keys(cache)).toEqual(['reusable', 'dyn']);

    // final release at end of buildInteriors: reusable atlas-only sources are released too
    expect(releaseAtlasSources(scene, cache, { fromChild: interiorStart })).toBe(1);
    expect(reusable.image.width).toBe(1);
    expect(Object.keys(cache)).toEqual(['dyn']);
  });

  it('unconfigured (tests, tools): nothing is marked, scaled or released', () => {
    fakeContext();
    const t = canvasTexture(16, 16, () => {});
    markAtlasSource(t);
    expect(releaseAtlasSources(new THREE.Scene(), { t })).toBe(0);
    expect(texScale()).toBe(1);
    expect(t.image.width).toBe(16);
  });
  it('flushShared: shared canvases go to the GPU (clones too) and are released; dynamic ones stay; a later upload redraws', () => {
    fakeContext();
    const r = fakeRenderer();
    configureGpuMem(profile('desktop-dgpu'), r);
    const draw = vi.fn();
    const shared = canvasTexture(64, 64, draw),
      clone = shared.clone(),
      dynamic = canvasTexture(64, 64, () => {}, true, { dynamic: true }),
      unused = canvasTexture(32, 32, () => {});
    const scene = new THREE.Scene();
    for (const map of [shared, clone, dynamic])
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map })));
    expect(flushShared(scene)).toBe(1);
    expect(r.initTexture).toHaveBeenCalledWith(shared);
    expect(r.initTexture).toHaveBeenCalledWith(clone);
    expect(r.initTexture).not.toHaveBeenCalledWith(dynamic);
    expect(shared.image.width).toBe(1);
    expect(shared.userData.gpuW).toBe(64);
    expect(dynamic.image.width).toBe(64);
    expect(unused.image.width).toBe(32); // not in the scene: kept
    // something asks for the pixels again: drawn again first, not uploaded as a blank
    draw.mockClear();
    shared.needsUpdate = true;
    expect(draw).toHaveBeenCalledOnce();
    expect(shared.image.width).toBe(64);
  });

  it('markStaticGeometry: bounds first, arrays dropped once uploaded, the vertex count stays', () => {
    const geo = markStaticGeometry(new THREE.BoxGeometry(2, 2, 2));
    expect(geo.boundingSphere.radius).toBeGreaterThan(1.7);
    const pos = geo.attributes.position,
      n = pos.count;
    pos.onUploadCallback(); // what WebGLAttributes calls right after bufferData
    expect(pos.array.length).toBe(0);
    expect(pos.count).toBe(n);
    geo.index.onUploadCallback();
    expect(geo.index.array.length).toBe(0);
    expect(markStaticGeometry(geo)).toBe(geo); // marked once
  });

  it('gcNudge only runs on Apple WebKit, at most once every 5 s', () => {
    expect(gcNudge()).toBe(false); // happy-dom is not Apple
    vi.spyOn(navigator, 'vendor', 'get').mockReturnValue('Apple Computer, Inc.');
    expect(gcNudge()).toBe(true);
    expect(gcNudge()).toBe(false);
  });
});
