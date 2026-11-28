// Canvas texture memory (see docs/guide/architecture.md).
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
  anisotropy: 4, // canvas texture anisotropic filtering (PerfProfile: mobile 2, desktop 4)
  renderer: null,
};

const clampScale = (v) => Math.min(1, Math.max(0.25, Number(v) || 1));
const floorPow2 = (v) => 2 ** Math.floor(Math.log2(Math.max(16, v)));

// called once by src/core/Game.js after the renderer exists and before the world builds: every device stores its
// canvas textures at PerfProfile's texScale (desktop 1, mobile 0.5, safe mode 0.375,
// or ?texscale=) and its atlas sheets within atlasMaxW x atlasMaxH (docs/guide/architecture.md)
export function configureGpuMem(profile = {}, renderer = null) {
  const s = clampScale(profile.texScale ?? 1);
  const maxW = profile.atlasMaxW || 2048,
    maxH = profile.atlasMaxH || 4096;
  S.texScale = s;
  S.atlasScale = Math.min(s, maxW / 2048);
  S.atlasMaxH = Math.min(4096, floorPow2(maxH / S.atlasScale));
  S.anisotropy = Math.max(1, Math.round(profile.anisotropy || 4));
  S.renderer = renderer;
  return {
    texScale: S.texScale,
    atlasScale: S.atlasScale,
    atlasMaxH: S.atlasMaxH,
    anisotropy: S.anisotropy,
  };
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

// the canvas texture every builder makes: draw(g, w, h) on a w x h canvas (stored at texScale), sRGB, the device's anisotropy,
// repeating unless `repeat` is false. The builders keep their own key caches (Kit.ctex, the zones' ctex ...).
// dynamic: something draws into the canvas again later (e.g. the arena ribbon, Concert.js, through the same scaled
// context): never released (flushShared skips it)
export function canvasTexture(w, h, draw, repeat = true, { dynamic = false } = {}) {
  const scale = S.texScale;
  const { cv, g } = scaledCanvas(w, h, scale);
  if (!g) return blankTexture();
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = S.anisotropy;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (dynamic) t.userData.dynamic = true;
  else {
    markShared(cv);
    // the same pixels again, should the GPU copy ever be needed after flushShared() released the canvas
    t.userData.redraw = () => {
      const r = scaledCanvas(w, h, scale);
      if (r.g) draw(r.g, w, h);
      return r.cv;
    };
  }
  return t;
}

// drop a canvas's pixels (WebKit frees the backing store of a 1x1 canvas right away)
export function releaseCanvas(cv) {
  if (!cv || typeof cv.getContext !== 'function') return;
  cv.width = 1;
  cv.height = 1;
}

// put a canvas texture on the GPU now and release its canvas. Only for textures nothing draws into again.
// Returns false (and keeps the canvas) when no renderer is configured or already released.
export function uploadAndRelease(tex) {
  if (!S.renderer || !tex?.image || tex.userData?.canvasReleased) return false;
  S.renderer.initTexture(tex);
  // the size it lives at on the GPU (tools/perf/page-hook.js counts it: the canvas is 1x1 from now on)
  tex.userData.gpuW = tex.image.width;
  tex.userData.gpuH = tex.image.height;
  releaseCanvas(tex.image);
  tex.userData.canvasReleased = true;
  return true;
}

export const TEX_SLOTS = [
  'map',
  'emissiveMap',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'lightMap',
];

function forEachSceneTex(scene, fn, fromChild = 0) {
  const roots = fromChild > 0 ? scene.children.slice(fromChild) : [scene];
  const seenMat = new Set();
  for (const root of roots) {
    root.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m || seenMat.has(m)) continue;
        seenMat.add(m);
        for (let i = 0; i < TEX_SLOTS.length; i++) {
          const t = m[TEX_SLOTS[i]];
          if (t?.isTexture) fn(t);
        }
        if (m.uniforms)
          for (const u of Object.values(m.uniforms)) if (u?.value?.isTexture) fn(u.value);
      }
    });
  }
}

// ---- atlas sources: canvas textures finishRow / batchKitPlanes copied into a sheet ----
const PACKED = new Set();
const PACKED_REUSABLE = new Set();
// cross-zone shared textures (Kit.js T.* / YHT.* / ROWT.*): kept in cache during buildZones() and released at the end
export function markReusable(t) {
  if (t?.userData) t.userData.reusable = true;
  return t;
}
export function markAtlasSource(tex) {
  if (!S.renderer || !tex?.image || tex.userData?.dynamic) return;
  if (tex.userData?.reusable) PACKED_REUSABLE.add(tex);
  else PACKED.add(tex);
}
// Release the packed sources nothing in the scene still shows on its own; `cache` (Kit's TEX) loses their keys,
// so a later ctex() with the same key draws a fresh canvas (the drawings are deterministic: the same pixels).
// Called after zones in buildZones (with minBatch + keepReusable + fromChild) and once more after all interiors.
export function releaseAtlasSources(
  scene,
  cache = null,
  { minBatch = 0, keepReusable = false, fromChild = 0 } = {}
) {
  const checkReusable = !keepReusable && PACKED_REUSABLE.size > 0;
  if (PACKED.size < minBatch && !checkReusable) return 0;
  if (!PACKED.size && !checkReusable) return 0;
  const targets = checkReusable ? [...PACKED, ...PACKED_REUSABLE] : [...PACKED];
  const used = new Set();
  forEachSceneTex(
    scene,
    (t) => {
      if (t.image) used.add(t.image);
    },
    fromChild
  );
  const gone = new Set();
  for (const t of targets) {
    if (!t.image || t.userData?.dynamic || used.has(t.image)) continue;
    gone.add(t);
    t.dispose();
    releaseCanvas(t.image);
  }
  if (cache && gone.size) for (const k in cache) if (gone.has(cache[k])) delete cache[k];
  PACKED.clear();
  if (checkReusable) PACKED_REUSABLE.clear();
  return gone.size;
}

// a texture something draws into again later (a screen that gets its wallpaper when it loads ...): never released
export function markDynamic(t) {
  if (t?.userData) t.userData.dynamic = true;
  return t;
}

// ---- shared: static canvas textures (canvasTexture, src/graphics/Textures.js), on the GPU for the rest of the game ----
const SHARED = new WeakSet(); // their canvases
export function markShared(cv) {
  if (cv && typeof cv.getContext === 'function') SHARED.add(cv);
}
// After loading (src/core/Game.js, just before the title): every texture the scene shows whose canvas is shared and not
// dynamic goes to the GPU (each texture object using that canvas: clones have their own wrap / repeat) and the canvas is
// released. A texture asked to upload again afterwards (needsUpdate) redraws itself first if it can (canvasTexture),
// otherwise it warns. Returns how many canvases were released.
export function flushShared(scene) {
  if (!S.renderer) return 0;
  const byCanvas = new Map();
  forEachSceneTex(scene, (t) => {
    const cv = t.image;
    if (!cv || !SHARED.has(cv)) return;
    if (!byCanvas.has(cv)) byCanvas.set(cv, new Set());
    byCanvas.get(cv).add(t);
  });
  let n = 0;
  for (const [cv, texs] of byCanvas) {
    if (cv.width <= 1 && cv.height <= 1) continue;
    if ([...texs].some((t) => t.userData.dynamic)) continue;
    for (const t of texs) {
      S.renderer.initTexture(t);
      t.userData.gpuW = cv.width;
      t.userData.gpuH = cv.height;
      t.userData.canvasReleased = true;
      guardUpload(t);
    }
    releaseCanvas(cv);
    n++;
  }
  return n;
}
const NEEDS_UPDATE = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, 'needsUpdate');
function guardUpload(t) {
  Object.defineProperty(t, 'needsUpdate', {
    configurable: true,
    set(v) {
      if (v && t.userData.canvasReleased) {
        if (t.userData.redraw) {
          t.image = t.userData.redraw();
          t.userData.canvasReleased = false;
        } else console.warn('[GpuMemLifecycle] a released texture was asked to upload again', t);
      }
      NEEDS_UPDATE.set.call(t, v);
    },
  });
}

// ---- static geometry: the CPU copy of its vertex arrays is dropped once WebGL has it ----
// Only for merged, never-changing world geometry (MapBuilder's Geo meshes, Kit.finish, finishRow): nothing reads those
// arrays after loading (no raycasts against the world; physics is built from the collision data). Four rules
// (docs/guide/architecture.md): bounds first (frustum culling and ShadowFix use them), a whitelist,
// count stays (draw ranges use it), and a lost WebGL context reloads the page (src/core/Game.js).
function dropAfterUpload() {
  this.array = new this.array.constructor(0);
}
// ?keepgeo keeps the CPU copy (tools/collision_mesh_check.mjs reads the world's triangles after loading)
const KEEP_GEO = typeof location === 'object' && /[?&]keepgeo\b/.test(location.search || '');
export function markStaticGeometry(geo) {
  if (!geo?.isBufferGeometry || geo.userData.staticGeometry) return geo;
  geo.userData.staticGeometry = true;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  if (!geo.boundingBox) geo.computeBoundingBox();
  if (KEEP_GEO) return geo;
  for (const a of Object.values(geo.attributes))
    if (!a.isInterleavedBufferAttribute) a.onUploadCallback = dropAfterUpload;
  if (geo.index) geo.index.onUploadCallback = dropAfterUpload;
  return geo;
}

// ---- Apple WebKit: a nudge for the JavaScriptCore garbage collector after a big build ----
// Making and removing a hidden iframe prompts JSC to collect; only on Apple's engine, at most once every 5 s.
let lastNudge = -Infinity;
export function gcNudge() {
  if (typeof document === 'undefined' || !/^Apple/.test(navigator.vendor || '')) return false;
  const now = performance.now();
  if (now - lastNudge < 5000) return false;
  lastNudge = now;
  const f = document.createElement('iframe');
  f.style.display = 'none';
  document.body.appendChild(f);
  f.remove();
  return true;
}

// unit tests: back to the unconfigured state
export function resetGpuMem() {
  S.texScale = 1;
  S.atlasScale = 1;
  S.atlasMaxH = 4096;
  S.anisotropy = 4;
  S.renderer = null;
  PACKED.clear();
  PACKED_REUSABLE.clear();
}
