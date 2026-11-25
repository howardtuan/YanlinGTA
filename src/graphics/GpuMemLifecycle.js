// Canvas texture memory (perf-refactor/specs/phase-1-ios-memory-rescue.md, Phase 1A).
// iOS Safari / LINE / IG WKWebView kill the page when its <canvas> backing stores pass a few hundred MB; a full load
// used to keep ~1.75 GB of them (every shop-row atlas sheet and every sign it was packed from). This module:
//  - creates canvases at the phone texture scale with the context pre-scaled, so the drawing code keeps drawing at
//    the full size (scaledCanvas);
//  - releases a canvas whose texture is already on the GPU (uploadAndRelease) or that was only copied into an atlas
//    sheet (markAtlasSource / releaseAtlasSources);
//  - never throws when a 2D context cannot be had (memory pressure): callers get a 1x1 blank texture instead.
// Unconfigured (unit tests, tools) nothing is scaled or released: everything works as it always did.
import * as THREE from 'three';

const S = {
  texScale: 1, // canvas textures (Kit.ctex)
  atlasScale: 1, // shop-row atlas sheets (Kit.finishRow)
  atlasMaxH: 4096, // full-size height a sheet may grow to before a new one starts
  renderer: null,
};

const clampScale = (v) => Math.min(1, Math.max(0.25, Number(v) || 1));
const floorPow2 = (v) => 2 ** Math.floor(Math.log2(Math.max(16, v)));

// called once by src/core/Game.js after the renderer exists and before the world builds.
// Only phones (PerfProfile tier 'mobile-lite'), the self-healing safe mode and an explicit ?texscale= scale the
// textures down: desktops keep 1 so they draw exactly the pixels they always did (desktop-igpu's texScale 0.75 in
// PerfProfile is not applied here on purpose: the laptop keeps its look, its RAM is not the problem).
export function configureGpuMem(profile = {}, renderer = null) {
  const scaled =
    profile.tier === 'mobile-lite' || profile.safeMode || profile.flags?.texScale != null;
  const s = scaled ? clampScale(profile.texScale) : 1;
  const maxW = profile.atlasMaxW || 2048,
    maxH = profile.atlasMaxH || 4096;
  S.texScale = s;
  S.atlasScale = scaled ? Math.min(s, maxW / 2048) : 1;
  S.atlasMaxH = scaled ? Math.min(4096, floorPow2(maxH / S.atlasScale)) : 4096;
  S.renderer = renderer;
  return { texScale: S.texScale, atlasScale: S.atlasScale, atlasMaxH: S.atlasMaxH };
}

export const gpuMemConfig = () => ({ ...S, renderer: undefined });
export const texScale = () => S.texScale;
export const atlasScale = () => S.atlasScale;
export const atlasMaxH = () => S.atlasMaxH;

// size an image was drawn at (a scaled canvas keeps it in lw / lh)
export const drawnW = (img) => img.lw || img.width;
export const drawnH = (img) => img.lh || img.height;

// one shared 1x1 texture for a canvas that could not get a 2D context
let blank = null;
export function blankTexture() {
  if (!blank) {
    blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
    blank.needsUpdate = true;
  }
  return blank;
}

// a canvas of w x h logical pixels, stored at `scale` (the context is scaled to match, so draw(g, w, h) code
// is unchanged). g is null when the browser refused a context.
export function scaledCanvas(w, h, scale = S.texScale) {
  const cv = document.createElement('canvas');
  cv.width = scale === 1 ? w : Math.max(1, Math.round(w * scale));
  cv.height = scale === 1 ? h : Math.max(1, Math.round(h * scale));
  const g = cv.getContext('2d');
  if (g && scale !== 1) {
    g.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
    cv.lw = w;
    cv.lh = h;
  }
  return { cv, g };
}

// the canvas texture every builder makes: draw(g, w, h) on a w x h canvas (stored at texScale), sRGB, anisotropy 4,
// repeating unless `repeat` is false. The builders keep their own key caches (Kit.ctex, the zones' ctex ...).
export function canvasTexture(w, h, draw, repeat = true) {
  const { cv, g } = scaledCanvas(w, h);
  if (!g) return blankTexture();
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// drop a canvas's pixels (WebKit frees the backing store of a 1x1 canvas right away)
export function releaseCanvas(cv) {
  if (!cv || typeof cv.getContext !== 'function') return;
  cv.width = 1;
  cv.height = 1;
}

// put a canvas texture on the GPU now and release its canvas. Only for textures nothing draws into again.
// Returns false (and keeps the canvas) when no renderer is configured.
export function uploadAndRelease(tex) {
  if (!S.renderer || !tex?.image) return false;
  S.renderer.initTexture(tex);
  // the size it lives at on the GPU (tools/perf/page-hook.js counts it: the canvas is 1x1 from now on)
  tex.userData.gpuW = tex.image.width;
  tex.userData.gpuH = tex.image.height;
  releaseCanvas(tex.image);
  tex.userData.canvasReleased = true;
  return true;
}

// ---- atlas sources: canvas textures finishRow copied into a sheet ----
const PACKED = new Set();
export function markAtlasSource(tex) {
  if (S.renderer && tex?.image) PACKED.add(tex);
}
// Release the packed sources nothing in the scene still shows on its own; `cache` (Kit's TEX) loses their keys,
// so a later ctex() with the same key draws a fresh canvas (the drawings are deterministic: the same pixels).
// Called after each zone is built (src/world/zones/Zones.js) and once more after all interiors. Returns how many.
export function releaseAtlasSources(scene, cache = null) {
  if (!PACKED.size) return 0;
  const used = new Set();
  scene.traverse((o) => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const k in m) if (m[k]?.isTexture && m[k].image) used.add(m[k].image);
      if (m.uniforms)
        for (const u of Object.values(m.uniforms))
          if (u?.value?.isTexture && u.value.image) used.add(u.value.image);
    }
  });
  const gone = new Set();
  for (const t of PACKED) {
    if (!t.image || used.has(t.image)) continue;
    gone.add(t);
    t.dispose();
    releaseCanvas(t.image);
  }
  if (cache && gone.size) for (const k in cache) if (gone.has(cache[k])) delete cache[k];
  PACKED.clear();
  return gone.size;
}

// unit tests: back to the unconfigured state
export function resetGpuMem() {
  S.texScale = 1;
  S.atlasScale = 1;
  S.atlasMaxH = 4096;
  S.renderer = null;
  PACKED.clear();
}
