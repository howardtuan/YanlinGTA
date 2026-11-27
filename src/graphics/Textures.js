// Procedural PBR-ish textures (colour + normal + roughness/metalness), drawn on canvases at load time.
// Everything is generated, so the game stays a pure static site with no image assets to download.
import * as THREE from 'three';
import { fbmWasm, normalWasm } from './wasm/kernels.js';
import { texScale, releaseCanvas, markShared } from './GpuMemLifecycle.js';

const CACHE = {};
// On low / xlow the world's walls and ground are MeshLambertMaterial (src/world/MapBuilder.js), which reads no
// normal or roughness / metalness maps, so the ground and facade textures skip making them (src/core/Game.js calls
// this before the world is built)
let lite = false;
export function setSurfaceDetail(full) {
  lite = !full;
}
const cached = (k, f) => CACHE[k] || (CACHE[k] = f());

// ---------- noise helpers (tileable) ----------
function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, P, seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy;
  const x0 = ((ix % P) + P) % P,
    y0 = ((iy % P) + P) % P,
    x1 = (x0 + 1) % P,
    y1 = (y0 + 1) % P;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed),
    b = hash(x1, y0, seed),
    c = hash(x0, y1, seed),
    d = hash(x1, y1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
// pure JS fallback for fbmField (exported for bit-for-bit WASM parity testing)
export function fbmFieldJS(size, P, oct, seed, gain = 0.5) {
  const f = new Float32Array(size * size);
  let amp = 1,
    norm = 0,
    p = P;
  for (let o = 0; o < oct; o++) {
    const k = p / size;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        f[y * size + x] += amp * vnoise(x * k, y * k, p, seed + o * 17);
    norm += amp;
    amp *= gain;
    p *= 2;
  }
  for (let i = 0; i < f.length; i++) f[i] /= norm;
  return f;
}
// fbm over a size x size texture, P = lattice cells across the texture at the first octave
// (WebAssembly version in wasm/kernels: same numbers, several times faster; fbmFieldJS is the fallback)
function fbmField(size, P, oct, seed, gain = 0.5) {
  const w = fbmWasm(size, P, oct, seed, gain);
  if (w) return w;
  return fbmFieldJS(size, P, oct, seed, gain);
}
const rng = (seed) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
// canvases whose pixels are read back (getImageData) stay on the CPU: a GPU readback stalls for seconds under software rendering
const READBACK = { willReadFrequently: true };
// every texture here is generated at its full size (the patterns are drawn in pixels), then stored at the tier's
// texture scale (PerfProfile texScale: desktop-igpu 0.75, phones 0.5; src/graphics/GpuMemLifecycle.js): same look,
// fewer pixels; the full-size canvas is released at once
function forTier(cv) {
  const s = texScale();
  if (s >= 1 || cv.width <= 64 || cv.height <= 64) return cv;
  const out = canvas(Math.max(1, Math.round(cv.width * s)), Math.max(1, Math.round(cv.height * s))),
    g = out.getContext('2d');
  if (!g) return cv;
  g.imageSmoothingQuality = 'high';
  g.drawImage(cv, 0, 0, out.width, out.height);
  releaseCanvas(cv);
  return out;
}
function toTex(cv, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const img = forTier(cv);
  markShared(img); // static: on the GPU after loading, then released (GpuMemLifecycle.flushShared)
  const t = new THREE.CanvasTexture(img);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}
// pure JS fallback for normalFromHeight (exported for byte-for-byte WASM parity testing)
export function normalFromHeightJS(hf, w, h, strength, d) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w,
        xr = (x + 1) % w,
        yu = (y - 1 + h) % h,
        yd = (y + 1) % h;
      const dx = (hf[y * w + xr] - hf[y * w + xl]) * strength,
        dy = (hf[yd * w + x] - hf[yu * w + x]) * strength;
      const l = Math.hypot(dx, dy, 1),
        i = (y * w + x) * 4;
      d[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      d[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      d[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
}
// height (Float32Array 0..1) -> tangent-space normal map canvas
function normalFromHeight(hf, w, h, strength) {
  const cv = canvas(w, h),
    g = cv.getContext('2d'),
    img = g.createImageData(w, h),
    d = img.data;
  if (!normalWasm(hf, w, h, strength, d)) normalFromHeightJS(hf, w, h, strength, d);
  g.putImageData(img, 0, 0);
  return cv;
}
// read a canvas drawn in greys as a height field
function heightFromCanvas(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data,
    f = new Float32Array(cv.width * cv.height);
  for (let i = 0; i < f.length; i++) f[i] = d[i * 4] / 255;
  return f;
}
// pixel loop helper writing rgb from a callback
function paint(size, fn) {
  const cv = canvas(size, size),
    g = cv.getContext('2d'),
    img = g.createImageData(size, size),
    d = img.data;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        c = fn(x, y, y * size + x);
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = c[3] ?? 255;
    }
  g.putImageData(img, 0, 0);
  return cv;
}
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// ---------- ground surfaces ----------
export const groundTex = {
  // low-frequency luminance noise, used to break up tiling over large areas
  macro: () =>
    cached('macro', () => {
      const S = 256,
        f = fbmField(S, 4, 5, 901, 0.55);
      return toTex(
        paint(S, (x, y, i) => {
          const v = clamp255(f[i] * 255);
          return [v, v, v];
        }),
        { srgb: false }
      );
    }),
  asphalt: () =>
    cached('asphalt', () => {
      const S = 512,
        r = rng(11);
      const big = fbmField(S, 6, 4, 3),
        fine = fbmField(S, 64, 2, 5);
      const hf = new Float32Array(S * S);
      const col = paint(S, (x, y, i) => {
        const grain = hash(x, y, 77),
          spec = grain > 0.985 ? 38 : grain < 0.02 ? -22 : 0;
        const v = 66 + (big[i] - 0.5) * 26 + (fine[i] - 0.5) * 22 + (grain - 0.5) * 16 + spec;
        hf[i] = fine[i] * 0.6 + grain * 0.4;
        return [clamp255(v), clamp255(v + 1), clamp255(v + 4)];
      });
      // cracks & patch repairs
      const g = col.getContext('2d');
      g.strokeStyle = 'rgba(18,18,20,0.75)';
      g.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        let x = r() * S,
          y = r() * S,
          a = r() * 6.28;
        g.lineWidth = 0.8 + r() * 1.3;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 22; s++) {
          a += (r() - 0.5) * 1.1;
          x += Math.cos(a) * 7;
          y += Math.sin(a) * 7;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      g.fillStyle = 'rgba(30,31,34,0.35)';
      for (let k = 0; k < 3; k++) {
        const w = 40 + r() * 90,
          h = 30 + r() * 70;
        g.fillRect(r() * S, r() * S, w, h);
      }
      if (lite) return { map: toTex(col) };
      const rough = paint(S, (x, y, i) => [
        255,
        clamp255(205 + (big[i] - 0.5) * 70 + (hash(x, y, 9) - 0.5) * 30),
        0,
      ]);
      return {
        map: toTex(col),
        normalMap: toTex(normalFromHeight(hf, S, S, 2.2), { srgb: false }),
        roughnessMap: toTex(rough, { srgb: false }),
      };
    }),
  // interlocking concrete pavers (campus plazas, main gate)
  paving: () =>
    cached('paving', () => {
      const S = 512,
        cv = canvas(S, S),
        g = cv.getContext('2d', READBACK),
        r = rng(21);
      const hc = canvas(S, S),
        hg = hc.getContext('2d', READBACK);
      g.fillStyle = '#6f6c66';
      g.fillRect(0, 0, S, S);
      hg.fillStyle = '#000';
      hg.fillRect(0, 0, S, S);
      const bw = 32,
        bh = 16;
      for (let row = 0; row < S / bh; row++)
        for (let c = -1; c < S / bw + 1; c++) {
          const x = c * bw + (row % 2 ? bw / 2 : 0),
            y = row * bh;
          const t = r();
          const base = 150 + (t - 0.5) * 34;
          const warm = r() < 0.12 ? 14 : 0;
          g.fillStyle = `rgb(${base + warm},${base + warm * 0.6 - 2},${base - 6})`;
          g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
          hg.fillStyle = `rgb(${200 + r() * 40},0,0)`;
          hg.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        }
      // grime noise
      const grime = fbmField(S, 8, 4, 31);
      const img = g.getImageData(0, 0, S, S),
        d = img.data;
      for (let i = 0; i < S * S; i++) {
        const k = 0.82 + grime[i] * 0.3 + (hash(i % S, (i / S) | 0, 4) - 0.5) * 0.08;
        d[i * 4] *= k;
        d[i * 4 + 1] *= k;
        d[i * 4 + 2] *= k;
      }
      g.putImageData(img, 0, 0);
      if (lite) {
        releaseCanvas(hc);
        return { map: toTex(cv) };
      }
      const hf = heightFromCanvas(hc);
      releaseCanvas(hc); // scratch: only its heights were needed
      const rough = paint(S, (x, y, i) => [
        255,
        clamp255(hf[i] > 0.1 ? 190 + grime[i] * 50 : 245),
        0,
      ]);
      const t = toTex(cv);
      return {
        map: t,
        normalMap: toTex(normalFromHeight(hf, S, S, 3.5), { srgb: false }),
        roughnessMap: toTex(rough, { srgb: false }),
      };
    }),
  // 30 cm square sidewalk tiles (town footways / 騎樓)
  sidewalk: () =>
    cached('sidewalk', () => {
      const S = 512,
        cv = canvas(S, S),
        g = cv.getContext('2d', READBACK),
        r = rng(41);
      const hc = canvas(S, S),
        hg = hc.getContext('2d', READBACK);
      g.fillStyle = '#5a5250';
      g.fillRect(0, 0, S, S);
      hg.fillStyle = '#000';
      hg.fillRect(0, 0, S, S);
      const t = 32;
      for (let y = 0; y < S; y += t)
        for (let x = 0; x < S; x += t) {
          const red = (x / t + y / t) % 5 === 0;
          const v = (r() - 0.5) * 18;
          g.fillStyle = red
            ? `rgb(${150 + v},${92 + v},${80 + v})`
            : `rgb(${168 + v},${162 + v},${154 + v})`;
          g.fillRect(x + 1, y + 1, t - 2, t - 2);
          hg.fillStyle = '#d0d0d0';
          hg.fillRect(x + 1, y + 1, t - 2, t - 2);
        }
      const grime = fbmField(S, 8, 4, 43);
      const img = g.getImageData(0, 0, S, S),
        d = img.data;
      for (let i = 0; i < S * S; i++) {
        const k = 0.8 + grime[i] * 0.32;
        d[i * 4] *= k;
        d[i * 4 + 1] *= k;
        d[i * 4 + 2] *= k;
      }
      g.putImageData(img, 0, 0);
      if (lite) {
        releaseCanvas(hc);
        return { map: toTex(cv) };
      }
      const hf = heightFromCanvas(hc);
      releaseCanvas(hc); // scratch: only its heights were needed
      return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, S, S, 3), { srgb: false }) };
    }),
  grass: () =>
    cached('grass', () => {
      const S = 512,
        big = fbmField(S, 4, 4, 51),
        mid = fbmField(S, 24, 3, 53);
      const hf = new Float32Array(S * S);
      const cv = paint(S, (x, y, i) => {
        const b = hash(x, y, 55),
          blade = hash(x >> 1, y, 57);
        const dry = Math.max(0, big[i] - 0.58) * 2.2;
        const l = 0.75 + mid[i] * 0.35 + (b - 0.5) * 0.25 + (blade > 0.8 ? 0.12 : 0);
        hf[i] = b * 0.5 + mid[i] * 0.5;
        const R = (72 + dry * 64) * l,
          G = (100 + dry * 26) * l,
          B = (52 + dry * 8) * l;
        return [clamp255(R), clamp255(G), clamp255(B)];
      });
      if (lite) return { map: toTex(cv) };
      return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, S, S, 1.6), { srgb: false }) };
    }),
  // packed earth / concrete mix for the generic ground between things
  ground: () =>
    cached('ground', () => {
      const S = 512,
        big = fbmField(S, 5, 5, 61),
        mid = fbmField(S, 32, 3, 63);
      const hf = new Float32Array(S * S);
      const cv = paint(S, (x, y, i) => {
        const n = hash(x, y, 65);
        hf[i] = mid[i] * 0.6 + n * 0.4;
        const green = Math.min(1, Math.max(0, big[i] - 0.38) * 2.2 + (mid[i] - 0.5) * 0.6);
        const v = 0.8 + mid[i] * 0.3 + (n - 0.5) * 0.18;
        return [
          clamp255((116 - green * 42) * v),
          clamp255((108 - green * 4) * v),
          clamp255((94 - green * 40) * v),
        ];
      });
      if (lite) return { map: toTex(cv) };
      return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, S, S, 1.8), { srgb: false }) };
    }),
  // red PU running track
  track: () =>
    cached('track', () => {
      const S = 256,
        f = fbmField(S, 16, 3, 71);
      return {
        map: toTex(
          paint(S, (x, y, i) => {
            const n = hash(x, y, 73);
            const v = 0.85 + f[i] * 0.2 + (n - 0.5) * 0.12;
            return [clamp255(168 * v), clamp255(78 * v), clamp255(62 * v)];
          })
        ),
      };
    }),
  dirt: () =>
    cached('dirt', () => {
      const S = 256,
        f = fbmField(S, 8, 4, 81);
      return {
        map: toTex(
          paint(S, (x, y, i) => {
            const n = hash(x, y, 83);
            const v = 0.75 + f[i] * 0.4 + (n - 0.5) * 0.2;
            return [clamp255(140 * v), clamp255(116 * v), clamp255(86 * v)];
          })
        ),
      };
    }),
  // dry pond bed of tan / grey river pebbles (牛稠埤 south basin): 3 m per tile
  pebble: () =>
    cached('pebble', () => {
      const S = 256,
        cv = canvas(S, S),
        g = cv.getContext('2d', READBACK),
        hc = canvas(S, S),
        hg = hc.getContext('2d', READBACK),
        r = rng(57);
      g.fillStyle = '#5e5446';
      g.fillRect(0, 0, S, S);
      hg.fillStyle = '#000';
      hg.fillRect(0, 0, S, S);
      for (let k = 0; k < 900; k++) {
        const x = r() * S,
          y = r() * S,
          rx = 3 + r() * 5,
          ry = rx * (0.55 + r() * 0.35),
          a = r() * Math.PI,
          v = 0.62 + r() * 0.4,
          w = r() < 0.3 ? 0 : 10;
        for (const [ox, oy] of [
          [0, 0],
          [S, 0],
          [-S, 0],
          [0, S],
          [0, -S],
        ]) {
          g.fillStyle = `rgb(${((150 + w) * v) | 0},${((136 + w * 0.5) * v) | 0},${(112 * v) | 0})`;
          g.beginPath();
          g.ellipse(x + ox, y + oy, rx, ry, a, 0, Math.PI * 2);
          g.fill();
          hg.fillStyle = `rgb(${(150 + r() * 100) | 0},0,0)`;
          hg.beginPath();
          hg.ellipse(x + ox, y + oy, rx * 0.8, ry * 0.8, a, 0, Math.PI * 2);
          hg.fill();
        }
      }
      if (lite) {
        releaseCanvas(hc);
        return { map: toTex(cv) };
      }
      const hf = heightFromCanvas(hc);
      releaseCanvas(hc);
      return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, S, S, 2.5), { srgb: false }) };
    }),
  waterNormal: () =>
    cached('waterN', () => {
      const S = 256,
        f = fbmField(S, 8, 4, 91, 0.6);
      const t = toTex(normalFromHeight(f, S, S, 6), { srgb: false });
      return t;
    }),
};

// ---------- facades ----------
// Each facade texture is an 8x8 grid of window bays (bay x floor), matching the UV layout in src/world/MapBuilder.js.
// Returns { map, emi (lit windows at night), normalMap, rm (roughness in G, metalness in B) }.
const N = 8;
// canvas drawn in logical units but stored at k px per unit (low quality: k = 0.5)
function scaled(w, h, k, opts) {
  const c = canvas(Math.round(w * k), Math.round(h * k)),
    g = c.getContext('2d', opts);
  g.scale(k, k);
  return [c, g];
}
// px: pixels per cell. The layout is drawn in 128-unit cells either way; low quality
// stores it at 64 px (a quarter of the GPU memory per atlas)
function facade(style, seed, px = 128) {
  return cached(`fac_${style}${px === 128 ? '' : `_${px}`}`, () => {
    const S = 128; // cell size in drawing units
    const W = N * S,
      r = rng(seed),
      k = px / S;
    const [col, g] = scaled(W, W, k),
      [hc, h] = scaled(W, W, k, READBACK),
      [rm, m] = scaled(W, W, k),
      [em, e] = scaled(W, W, k);
    e.fillStyle = '#000';
    e.fillRect(0, 0, W, W);
    h.fillStyle = '#808080';
    h.fillRect(0, 0, W, W);
    m.fillStyle = 'rgb(255,235,0)';
    m.fillRect(0, 0, W, W);
    const glassRM = (x, y, w, hh, rough = 30, metal = 210) => {
      m.fillStyle = `rgb(255,${rough},${metal})`;
      m.fillRect(x, y, w, hh);
    };
    const recess = (x, y, w, hh, v = 70) => {
      h.fillStyle = `rgb(${v},${v},${v})`;
      h.fillRect(x, y, w, hh);
    };
    const raise = (x, y, w, hh, v = 190) => {
      h.fillStyle = `rgb(${v},${v},${v})`;
      h.fillRect(x, y, w, hh);
    };
    const lit = [];
    for (let i = 0; i < N * N; i++)
      lit.push(r() < 0.4 ? (r() < 0.72 ? '#ffd49a' : r() < 0.5 ? '#d8ecff' : '#fff4dc') : null);
    // glass pane: sky-ish gradient + reflections so it reads as glass even before the env map kicks in
    const glass = (x, y, w, hh, tint = [70, 92, 108]) => {
      const gr = g.createLinearGradient(x, y, x, y + hh);
      gr.addColorStop(0, `rgb(${tint[0] + 40},${tint[1] + 40},${tint[2] + 40})`);
      gr.addColorStop(1, `rgb(${tint[0] - 15},${tint[1] - 12},${tint[2] - 8})`);
      g.fillStyle = gr;
      g.fillRect(x, y, w, hh);
      g.fillStyle = 'rgba(255,255,255,0.09)';
      g.beginPath();
      g.moveTo(x, y + hh);
      g.lineTo(x + w * 0.45, y);
      g.lineTo(x + w * 0.7, y);
      g.lineTo(x + w * 0.25, y + hh);
      g.fill();
      // curtains / blinds behind some panes
      if (r() < 0.35) {
        g.fillStyle = `rgba(${200 + r() * 40},${190 + r() * 40},${170 + r() * 40},0.55)`;
        g.fillRect(x + 2, y + 2, w * (0.3 + r() * 0.5), hh - 4);
      }
      glassRM(x, y, w, hh);
      recess(x, y, w, hh, 60);
    };
    // small tile texture over a rect (二丁掛 / mosaic)
    const tiles = (x, y, w, hh, tw, th, base, jitter, grout) => {
      g.fillStyle = grout;
      g.fillRect(x, y, w, hh);
      for (let ty = y; ty < y + hh; ty += th)
        for (let tx = x + ((ty / th) % 2 ? tw / 2 : 0) - tw; tx < x + w; tx += tw) {
          const v = (r() - 0.5) * jitter;
          g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
          g.fillRect(Math.max(x, tx + 0.6), ty + 0.6, tw - 1.2, th - 1.2);
        }
      h.fillStyle = '#9a9a9a';
      h.fillRect(x, y, w, hh);
      h.fillStyle = '#8a8a8a';
      for (let ty = y; ty < y + hh; ty += th) h.fillRect(x, ty, w, 0.6);
    };
    for (let iy = 0; iy < N; iy++)
      for (let ix = 0; ix < N; ix++) {
        const x = ix * S,
          y = iy * S,
          L = lit[iy * N + ix];
        if (style === 'tan') {
          // 懷恩樓 / 工學館: brown-tan brick tiles, aluminium windows, slab band
          tiles(x, y, S, S, 8, 3, [150, 128, 104], 22, '#7a6957');
          g.fillStyle = '#8f7f6d';
          g.fillRect(x, y + S - 16, S, 16);
          raise(x, y + S - 16, S, 16, 205);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x, y + S - 2, S, 2);
          g.fillStyle = '#5b5d5f';
          g.fillRect(x + 14, y + 22, S - 28, S - 52);
          glass(x + 17, y + 25, (S - 34) / 2 - 2, S - 58);
          glass(x + S / 2 + 1, y + 25, (S - 34) / 2 - 2, S - 58);
          g.fillStyle = 'rgba(40,30,20,0.35)';
          g.fillRect(x + 12, y + S - 30, S - 24, 3);
          if (L) {
            e.fillStyle = L;
            e.fillRect(x + 17, y + 25, S - 34, S - 58);
          }
        } else if (style === 'red') {
          // 科學館: terracotta tiles + white concrete floor bands + AC units
          tiles(x, y, S, S, 8, 3, [158, 82, 64], 18, '#86503f');
          g.fillStyle = '#e7e2d8';
          g.fillRect(x, y + S - 20, S, 20);
          raise(x, y + S - 20, S, 20, 215);
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.fillRect(x, y + S - 3, S, 3);
          g.fillStyle = '#d9d4ca';
          g.fillRect(x + 10, y + 24, S - 20, S - 54);
          glass(x + 13, y + 27, S - 26, S - 60, [64, 86, 96]);
          g.fillStyle = '#cfcac0';
          for (let k = 1; k < 4; k++)
            g.fillRect(x + 13 + (k * (S - 26)) / 4 - 1, y + 27, 3, S - 60);
          if (r() < 0.5) {
            g.fillStyle = '#e9e7e0';
            g.fillRect(x + S - 44, y + S - 44, 30, 18);
            g.fillStyle = '#9a9a96';
            g.fillRect(x + S - 41, y + S - 41, 24, 12);
            raise(x + S - 44, y + S - 44, 30, 18, 230);
            m.fillStyle = 'rgb(255,120,40)';
            m.fillRect(x + S - 44, y + S - 44, 30, 18);
          }
          if (L) {
            e.fillStyle = L;
            e.fillRect(x + 13, y + 27, S - 26, S - 60);
          }
        } else if (style === 'granite') {
          // 土木館: speckled granite, deep ribbon windows
          g.fillStyle = '#a7a6a2';
          g.fillRect(x, y, S, S);
          for (let k = 0; k < 900; k++) {
            const v = r();
            g.fillStyle =
              v < 0.45
                ? 'rgba(40,40,40,0.55)'
                : v < 0.8
                  ? 'rgba(235,235,230,0.6)'
                  : 'rgba(150,120,110,0.5)';
            g.fillRect(x + r() * S, y + r() * S, 1.6, 1.6);
          }
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.fillRect(x, y + S / 2, S, 1);
          g.fillRect(x + S / 2, y, 1, S / 2);
          g.fillStyle = '#2b2f33';
          g.fillRect(x, y + 34, S, 50);
          recess(x, y + 34, S, 50, 30);
          glass(x + 3, y + 38, S / 2 - 6, 42, [58, 74, 84]);
          glass(x + S / 2 + 3, y + 38, S / 2 - 6, 42, [58, 74, 84]);
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(x, y + 84, S, 5);
          if (L) {
            e.fillStyle = L;
            e.fillRect(x + 3, y + 38, S - 6, 42);
          }
        } else if (style === 'white') {
          // modern white tile, large green-blue glass
          tiles(x, y, S, S, 8, 3, [226, 223, 216], 9, '#c6c3bb');
          g.fillStyle = '#c9ccd0';
          g.fillRect(x + 8, y + 18, S - 16, S - 40);
          glass(x + 11, y + 21, S - 22, S - 46, [70, 112, 118]);
          g.fillStyle = '#b8bcc0';
          g.fillRect(x + S / 2 - 1, y + 21, 3, S - 46);
          g.fillRect(x + 11, y + 21 + (S - 46) * 0.62, S - 22, 3);
          if (L) {
            e.fillStyle = L;
            e.fillRect(x + 11, y + 21, S - 22, S - 46);
          }
        } else if (style === 'brick') {
          // red brick (全人教育村-style)
          tiles(x, y, S, S, 8, 3, [148, 70, 52], 26, '#a49a8c');
          g.fillStyle = '#ddd6c8';
          g.fillRect(x + 18, y + 20, S - 36, 6);
          g.fillRect(x + 18, y + S - 34, S - 36, 8);
          g.fillStyle = '#4e4a44';
          g.fillRect(x + 22, y + 26, S - 44, S - 60);
          glass(x + 25, y + 29, S - 50, S - 66);
          g.fillStyle = '#ece6da';
          g.fillRect(x + S / 2 - 1, y + 29, 3, S - 66);
          if (L) {
            e.fillStyle = L;
            e.fillRect(x + 25, y + 29, S - 50, S - 66);
          }
        } else if (style === 'temple') {
          // vermilion walls, carved wooden lattice windows, gold trim
          g.fillStyle = '#b5372a';
          g.fillRect(x, y, S, S);
          g.fillStyle = 'rgba(0,0,0,0.08)';
          for (let k = 0; k < S; k += 9) g.fillRect(x, y + k, S, 1);
          g.fillStyle = '#d9a640';
          g.fillRect(x, y + 8, S, 5);
          g.fillRect(x, y + S - 14, S, 5);
          raise(x, y + 8, S, 5, 220);
          g.fillStyle = '#4a2a18';
          g.fillRect(x + 26, y + 26, S - 52, S - 56);
          recess(x + 26, y + 26, S - 52, S - 56, 50);
          g.strokeStyle = '#c9963a';
          g.lineWidth = 2;
          for (let k = 0; k < 5; k++) {
            g.beginPath();
            g.moveTo(x + 26 + (k * (S - 52)) / 4, y + 26);
            g.lineTo(x + 26 + (k * (S - 52)) / 4, y + S - 30);
            g.stroke();
            g.beginPath();
            g.moveTo(x + 26, y + 26 + (k * (S - 56)) / 4);
            g.lineTo(x + S - 26, y + 26 + (k * (S - 56)) / 4);
            g.stroke();
          }
          if (L) {
            e.fillStyle = '#ffb36a';
            e.fillRect(x + 26, y + 26, S - 52, S - 56);
          }
          if (r() < 0.3) {
            g.fillStyle = '#e8261c';
            g.beginPath();
            g.ellipse(x + 13, y + 40, 7, 10, 0, 0, 7);
            g.fill();
            e.fillStyle = '#ff5030';
            e.beginPath();
            e.ellipse(x + 13, y + 40, 7, 10, 0, 0, 7);
            e.fill();
          }
        } else if (style === 'commercial') {
          // metal cladding panels, sparse strip windows
          const _v = 0;
          g.fillStyle = '#c7c9cb';
          g.fillRect(x, y, S, S);
          g.fillStyle = 'rgba(0,0,0,0.08)';
          for (let k = 0; k < S; k += 16) g.fillRect(x + k, y, 1, S);
          m.fillStyle = 'rgb(255,120,140)';
          m.fillRect(x, y, S, S);
          if (iy % 3 === 0) {
            glass(x, y + 40, S, 34, [60, 80, 96]);
            if (L) {
              e.fillStyle = L;
              e.fillRect(x, y + 40, S, 34);
            }
          }
          g.fillStyle = 'rgba(0,0,0,0.15)';
          g.fillRect(x, y + S - 2, S, 2);
        } else {
          // town: tiled apartment walls (tinted by vertex colour), iron-grille windows, AC units, balconies
          tiles(x, y, S, S, 4, 4, [236, 234, 228], 10, '#d6d2ca');
          const kind = r();
          if (kind < 0.18) {
            // balcony with railing
            g.fillStyle = '#3a3f44';
            g.fillRect(x + 8, y + 14, S - 16, S - 40);
            glass(x + 12, y + 18, S - 24, S - 52, [72, 84, 92]);
            g.fillStyle = '#e8e4dc';
            g.fillRect(x + 4, y + S - 52, S - 8, 26);
            raise(x + 4, y + S - 52, S - 8, 26, 230);
            g.fillStyle = 'rgba(0,0,0,0.3)';
            g.fillRect(x + 4, y + S - 27, S - 8, 3);
            if (r() < 0.5) {
              g.fillStyle = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#9b59b6'][
                Math.floor(r() * 5)
              ];
              g.fillRect(x + 20 + r() * 50, y + S - 70, 12, 22);
            } // laundry
            if (L) {
              e.fillStyle = L;
              e.fillRect(x + 12, y + 18, S - 24, S - 70);
            }
          } else {
            g.fillStyle = '#4a4e52';
            g.fillRect(x + 20, y + 22, S - 40, S - 52);
            glass(x + 23, y + 25, S - 46, S - 58, [76, 90, 100]);
            // 鐵窗 iron grille cage
            g.fillStyle = 'rgba(55,58,60,0.9)';
            for (let k = x + 20; k <= x + S - 20; k += 7) g.fillRect(k, y + 18, 2, S - 44);
            g.fillRect(x + 18, y + 18, S - 36, 3);
            g.fillRect(x + 18, y + S - 28, S - 36, 3);
            g.fillRect(x + 18, y + 18 + (S - 46) / 2, S - 36, 2);
            raise(x + 18, y + 18, S - 36, S - 44, 175);
            h.fillStyle = '#505050';
            h.fillRect(x + 23, y + 25, S - 46, S - 58);
            g.fillStyle = 'rgba(0,0,0,0.22)';
            g.fillRect(x + 18, y + S - 25, S - 36, 4);
            if (kind > 0.6) {
              g.fillStyle = '#ecebe6';
              g.fillRect(x + S - 40, y + S - 30, 30, 20);
              g.fillStyle = '#8c8c88';
              for (let k = 0; k < 5; k++) g.fillRect(x + S - 37, y + S - 27 + k * 3.5, 24, 1.5);
              raise(x + S - 40, y + S - 30, 30, 20, 240);
              m.fillStyle = 'rgb(255,110,40)';
              m.fillRect(x + S - 40, y + S - 30, 30, 20);
            }
            if (L) {
              e.fillStyle = L;
              e.fillRect(x + 23, y + 25, S - 46, S - 58);
            }
          }
          // rain streaks / grime under windows
          const sg = g.createLinearGradient(0, y + S - 26, 0, y + S);
          sg.addColorStop(0, 'rgba(60,55,50,0.18)');
          sg.addColorStop(1, 'rgba(60,55,50,0)');
          g.fillStyle = sg;
          g.fillRect(x + 20, y + S - 26, S - 40, 26);
        }
      }
    // global weathering (streaks + dirt), keeps walls from looking CG-clean
    const dirt = fbmField(256, 6, 4, seed + 5);
    g.globalCompositeOperation = 'multiply';
    for (let k = 0; k < 140; k++) {
      const x = r() * W,
        y = r() * W,
        w = 2 + r() * 6,
        l = 30 + r() * 120;
      const gr = g.createLinearGradient(0, y, 0, y + l);
      gr.addColorStop(0, 'rgba(120,112,100,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x, y, w, l);
    }
    const di = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const v = 205 + dirt[i] * 50;
      di.data[i * 4] = v;
      di.data[i * 4 + 1] = v - 3;
      di.data[i * 4 + 2] = v - 8;
      di.data[i * 4 + 3] = 255;
    }
    const dc = canvas(256, 256);
    dc.getContext('2d').putImageData(di, 0, 0);
    g.drawImage(dc, 0, 0, W, W);
    releaseCanvas(dc); // scratch: copied into the facade above
    g.globalCompositeOperation = 'source-over';
    if (lite) {
      // Lambert walls: no normal map, and the roughness / metalness map is not read
      releaseCanvas(hc);
      releaseCanvas(rm);
      return { map: toTex(col), emi: toTex(em) };
    }
    const hf = heightFromCanvas(hc),
      hw = hc.width,
      hh = hc.height;
    releaseCanvas(hc); // scratch: only its heights were needed
    return {
      map: toTex(col),
      emi: toTex(em),
      rm: toTex(rm, { srgb: false }),
      normalMap: toTex(normalFromHeight(hf, hw, hh, 5), { srgb: false }),
    };
  });
}
export const facadeTex = (style, px) =>
  facade(
    style,
    { tan: 7, red: 13, granite: 19, white: 23, brick: 29, commercial: 31, town: 11, temple: 43 }[
      style
    ] || 37,
    px
  );

// ---------- parameterised facades (tools/looks.json) ----------
// One atlas per wall finish: 8 columns of variants (lit rooms, blinds) x one row per
// window type, so src/world/MapBuilder.js picks the row per storey. Wall, frames and glass are drawn in
// neutral greys and coloured per vertex (wall colour / aAccent / aGlass); rm carries the
// masks: R = accent (frames, pilasters, louvers), G = roughness, B = metalness (glass).
export const FACP_TYPES = [
  'punched',
  'pair',
  'ribbon',
  'curtain',
  'grid',
  'slit',
  'louver',
  'arch',
  'gallery',
  'none',
];
export function facadeParam(base, px = 128) {
  return cached(`facp_${base}_${px}`, () => {
    const S = 128,
      R = FACP_TYPES.length,
      W = N * S,
      HH = R * S,
      k = px / S;
    const r = rng({ tile: 53, smooth: 59, stone: 61 }[base] || 67);
    const [col, g] = scaled(W, HH, k),
      [hc, h] = scaled(W, HH, k, READBACK),
      [rm, m] = scaled(W, HH, k),
      [em, e] = scaled(W, HH, k / 2);
    e.fillStyle = '#000';
    e.fillRect(0, 0, W, HH);
    h.fillStyle = '#808080';
    h.fillRect(0, 0, W, HH);
    m.fillStyle = 'rgb(0,235,0)';
    m.fillRect(0, 0, W, HH);
    const wall = (x, y) => {
      if (base === 'tile') {
        // small tiles (小口磚 / 二丁掛), light grout
        g.fillStyle = '#dcdcd7';
        g.fillRect(x, y, S, S);
        for (let ty = 0; ty < S; ty += 4)
          for (let tx = (ty / 4) % 2 ? -4 : 0; tx < S; tx += 8) {
            const v = 238 + Math.round((r() - 0.5) * 14),
              x0 = Math.max(0, tx),
              x1 = Math.min(S, tx + 8);
            g.fillStyle = `rgb(${v},${v},${v - 2})`;
            g.fillRect(x + x0 + 0.6, y + ty + 0.6, x1 - x0 - 1.2, 2.8);
          }
        h.fillStyle = '#8a8a8a';
        for (let ty = 0; ty < S; ty += 4) h.fillRect(x, y + ty, S, 0.6);
      } else if (base === 'stone') {
        // speckled granite / 洗石子
        g.fillStyle = '#e8e7e3';
        g.fillRect(x, y, S, S);
        for (let i = 0; i < 420; i++) {
          const v = r();
          g.fillStyle = v < 0.5 ? 'rgba(60,60,60,0.35)' : 'rgba(255,255,255,0.6)';
          g.fillRect(x + r() * S, y + r() * S, 1.4, 1.4);
        }
        g.fillStyle = 'rgba(0,0,0,0.1)';
        g.fillRect(x, y + S / 2, S, 1);
        g.fillRect(x + S / 2, y, 1, S);
      } else {
        // smooth paint / plaster / fair-faced concrete
        g.fillStyle = '#f1f1ee';
        g.fillRect(x, y, S, S);
        for (let i = 0; i < 60; i++) {
          g.fillStyle = `rgba(0,0,0,${r() * 0.035})`;
          g.fillRect(x + r() * S, y + r() * S, 3, 2);
        }
        g.fillStyle = 'rgba(0,0,0,0.07)';
        g.fillRect(x, y, S, 1);
        g.fillRect(x, y, 1, S);
      }
    };
    // accent: frames, mullions, pilasters, louvers (aAccent)
    const A = (x, y, w, hh) => {
      g.fillStyle = '#ecebe8';
      g.fillRect(x, y, w, hh);
      m.fillStyle = 'rgb(255,200,0)';
      m.fillRect(x, y, w, hh);
      h.fillStyle = '#bcbcbc';
      h.fillRect(x, y, w, hh);
    };
    // glass (aGlass): neutral gradient + reflection streak, blinds behind some panes
    const G = (x, y, w, hh) => {
      const gr = g.createLinearGradient(x, y, x, y + hh);
      gr.addColorStop(0, '#c2c6ca');
      gr.addColorStop(1, '#868b90');
      g.fillStyle = gr;
      g.fillRect(x, y, w, hh);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath();
      g.moveTo(x, y + hh);
      g.lineTo(x + w * 0.4, y);
      g.lineTo(x + w * 0.62, y);
      g.lineTo(x + w * 0.22, y + hh);
      g.fill();
      if (r() < 0.3) {
        const v = 200 + r() * 40;
        g.fillStyle = `rgba(${v},${v - 6},${v - 20},0.5)`;
        g.fillRect(x + 1, y + 1, w * (0.25 + r() * 0.5), hh - 2);
      }
      m.fillStyle = 'rgb(0,40,210)';
      m.fillRect(x, y, w, hh);
      h.fillStyle = '#464646';
      h.fillRect(x, y, w, hh);
    };
    const D = (x, y, w, hh) => {
      g.fillStyle = '#55524e';
      g.fillRect(x, y, w, hh);
      h.fillStyle = '#3c3c3c';
      h.fillRect(x, y, w, hh);
    };
    for (let iy = 0; iy < R; iy++)
      for (let ix = 0; ix < N; ix++) {
        const x = ix * S,
          y = iy * S,
          T = FACP_TYPES[iy];
        const L = r() < 0.4 ? (r() < 0.72 ? '#ffd49a' : r() < 0.5 ? '#d8ecff' : '#fff4dc') : null;
        const lit = (wx, wy, ww, wh) => {
          if (L) {
            e.fillStyle = L;
            e.fillRect(x + wx, y + wy, ww, wh);
          }
        };
        wall(x, y);
        if (T === 'punched') {
          A(x + 32, y + 21, 64, 66);
          G(x + 35, y + 24, 58, 60);
          A(x + 63, y + 24, 2, 60);
          A(x + 28, y + 86, 72, 5);
          lit(35, 24, 58, 60);
        } else if (T === 'pair') {
          for (const wx of [12, 68]) {
            A(x + wx, y + 21, 48, 66);
            G(x + wx + 3, y + 24, 42, 60);
            lit(wx + 3, 24, 42, 60);
          }
          A(x + 8, y + 86, 112, 4);
        } else if (T === 'ribbon') {
          A(x, y + 26, S, 3);
          G(x, y + 29, S, 52);
          A(x, y + 81, S, 5);
          for (const wx of [0, 42, 85]) A(x + wx, y + 29, 3, 52);
          lit(0, 29, S, 52);
        } else if (T === 'curtain') {
          G(x, y, S, S);
          g.fillStyle = 'rgba(20,24,28,0.35)';
          g.fillRect(x, y + 110, S, 18);
          A(x, y, 3, S);
          A(x + 63, y, 3, S);
          A(x, y + 108, S, 3);
          A(x, y, S, 2);
          lit(3, 2, S - 3, 106);
        } else if (T === 'grid') {
          // window bay between pilasters, slab edge below
          G(x + 10, y + 18, 108, 82);
          A(x + 46, y + 18, 3, 82);
          A(x + 82, y + 18, 3, 82);
          A(x, y, 10, S);
          A(x + 118, y, 10, S);
          A(x, y + 100, S, 28);
          lit(10, 18, 108, 82);
        } else if (T === 'slit') {
          A(x + 54, y + 10, 20, 100);
          G(x + 57, y + 13, 14, 94);
          lit(57, 13, 14, 94);
        } else if (T === 'louver') {
          // window behind horizontal slats (sun screen / grille panel)
          G(x + 6, y + 16, 116, 90);
          for (let k2 = 0; k2 < 10; k2++) A(x + 6, y + 17 + k2 * 9, 116, 5);
          A(x, y + 106, S, 4);
          if (L) {
            e.fillStyle = L;
            for (let k2 = 0; k2 < 10; k2++) e.fillRect(x + 6, y + 22 + k2 * 9, 116, 4);
          }
        } else if (T === 'arch') {
          // round-arched loggia; the recess takes the accent colour
          const path = () => {
            g.beginPath();
            g.moveTo(x + 14, y + S);
            g.lineTo(x + 14, y + 58);
            g.arc(x + 64, y + 58, 50, Math.PI, 0);
            g.lineTo(x + 114, y + S);
            g.closePath();
          };
          path();
          g.fillStyle = '#c9c2b8';
          g.fill();
          const gr = g.createLinearGradient(0, y + 8, 0, y + S);
          gr.addColorStop(0, 'rgba(0,0,0,0.45)');
          gr.addColorStop(0.5, 'rgba(0,0,0,0.2)');
          gr.addColorStop(1, 'rgba(0,0,0,0.05)');
          g.fillStyle = gr;
          g.fill();
          m.save();
          m.beginPath();
          m.moveTo(x + 14, y + S);
          m.lineTo(x + 14, y + 58);
          m.arc(x + 64, y + 58, 50, Math.PI, 0);
          m.lineTo(x + 114, y + S);
          m.closePath();
          m.fillStyle = 'rgb(255,230,0)';
          m.fill();
          m.restore();
          h.save();
          h.beginPath();
          h.moveTo(x + 14, y + S);
          h.lineTo(x + 14, y + 58);
          h.arc(x + 64, y + 58, 50, Math.PI, 0);
          h.lineTo(x + 114, y + S);
          h.closePath();
          h.fillStyle = '#3a3a3a';
          h.fill();
          h.restore();
          g.strokeStyle = 'rgba(0,0,0,0.25)';
          g.lineWidth = 3;
          path();
          g.stroke();
          if (L) {
            e.fillStyle = 'rgba(255,225,170,0.5)';
            e.fillRect(x + 24, y + 30, 80, 20);
          }
        } else if (T === 'gallery') {
          // open corridor: piers, solid balustrade (accent), dark depth
          D(x + 10, y, 108, 78);
          G(x + 20, y + 8, 88, 60);
          A(x + 10, y + 78, 108, 50);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.fillRect(x + 10, y + 78, 108, 4);
          lit(20, 8, 88, 60);
        } else {
          // none: blank wall, faint panel joints
          g.fillStyle = 'rgba(0,0,0,0.05)';
          g.fillRect(x, y + 64, S, 1);
        }
        // grime under openings
        if (T !== 'none' && T !== 'curtain') {
          const sg = g.createLinearGradient(0, y + 96, 0, y + S);
          sg.addColorStop(0, 'rgba(70,64,58,0.12)');
          sg.addColorStop(1, 'rgba(70,64,58,0)');
          g.fillStyle = sg;
          g.fillRect(x + 24, y + 96, S - 48, 32);
        }
      }
    // weathering, as facade()
    const dirt = fbmField(128, 4, 3, 71);
    g.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 90; i++) {
      const x = r() * W,
        y = r() * HH,
        w = 2 + r() * 6,
        l = 30 + r() * 100;
      const gr = g.createLinearGradient(0, y, 0, y + l);
      gr.addColorStop(0, 'rgba(130,122,110,0.25)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x, y, w, l);
    }
    const di = g.createImageData(128, 128);
    for (let i = 0; i < 128 * 128; i++) {
      const v = 222 + dirt[i] * 33;
      di.data[i * 4] = v;
      di.data[i * 4 + 1] = v - 2;
      di.data[i * 4 + 2] = v - 5;
      di.data[i * 4 + 3] = 255;
    }
    const dc = canvas(128, 128);
    dc.getContext('2d').putImageData(di, 0, 0);
    for (let y = 0; y < HH; y += W) g.drawImage(dc, 0, y, W, W);
    releaseCanvas(dc); // scratch: copied into the facade above
    g.globalCompositeOperation = 'source-over';
    if (lite) {
      // Lambert walls: no normal map; rm stays, its R / B channels are the accent / glass masks
      releaseCanvas(hc);
      return { map: toTex(col), emi: toTex(em), rm: toTex(rm, { srgb: false }) };
    }
    const hf = heightFromCanvas(hc),
      hw = hc.width,
      hh = hc.height;
    releaseCanvas(hc); // scratch: only its heights were needed
    return {
      map: toTex(col),
      emi: toTex(em),
      rm: toTex(rm, { srgb: false }),
      normalMap: toTex(normalFromHeight(hf, hw, hh, 5), { srgb: false }),
    };
  });
}

// ground-floor shopfronts for town buildings: rolling shutters, glass doors, signage band.
// 8 cells across, 1 row (cell = 3 m wide x 3.4 m tall).
export function shopTex() {
  return cached('shop', () => {
    const S = 128,
      W = S * 8,
      H = 160,
      r = rng(101);
    const g = canvas(W, H),
      c = g.getContext('2d');
    const em = canvas(W, H),
      e = em.getContext('2d');
    e.fillStyle = '#000';
    e.fillRect(0, 0, W, H);
    const rm = canvas(W, H),
      m = rm.getContext('2d');
    m.fillStyle = 'rgb(255,230,0)';
    m.fillRect(0, 0, W, H);
    const hc = canvas(W, H),
      h = hc.getContext('2d', READBACK);
    h.fillStyle = '#808080';
    h.fillRect(0, 0, W, H);
    const signCols = [
      '#c8102e',
      '#0a7d3b',
      '#f2b705',
      '#1a5fd1',
      '#ff7a00',
      '#7b2cbf',
      '#e9e9e9',
      '#d81b60',
      '#00838f',
      '#222',
    ];
    for (let i = 0; i < 8; i++) {
      const x = i * S,
        kind = r();
      // pillar / wall pier
      c.fillStyle = '#cfc9bf';
      c.fillRect(x, 0, S, H);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(x, 0, 6, H);
      c.fillRect(x + S - 6, 0, 6, H);
      // signage band (blank colour board; real shop names are separate meshes)
      c.fillStyle = signCols[Math.floor(r() * signCols.length)];
      c.fillRect(x + 4, 6, S - 8, 26);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(x + 4, 6, S - 8, 3);
      e.fillStyle = 'rgba(255,255,255,0.55)';
      e.fillRect(x + 4, 6, S - 8, 26);
      if (kind < 0.42) {
        // rolling shutter down
        c.fillStyle = '#9ea2a5';
        c.fillRect(x + 8, 40, S - 16, H - 40);
        for (let y = 40; y < H; y += 4) {
          c.fillStyle = y % 8 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.12)';
          c.fillRect(x + 8, y, S - 16, 2);
        }
        h.fillStyle = '#707070';
        for (let y = 40; y < H; y += 4) h.fillRect(x + 8, y, S - 16, 2);
        m.fillStyle = 'rgb(255,110,170)';
        m.fillRect(x + 8, 40, S - 16, H - 40);
        c.fillStyle = 'rgba(40,40,40,0.35)';
        c.fillRect(x + 8, H - 6, S - 16, 6);
      } else {
        // open shop: lit interior through glass
        const gr = c.createLinearGradient(0, 40, 0, H);
        gr.addColorStop(0, '#f3e9d2');
        gr.addColorStop(1, '#8a7d68');
        c.fillStyle = gr;
        c.fillRect(x + 8, 40, S - 16, H - 40);
        for (let k = 0; k < 6; k++) {
          c.fillStyle = `hsl(${r() * 360},45%,${45 + r() * 25}%)`;
          c.fillRect(x + 12 + r() * (S - 40), 60 + r() * 60, 10 + r() * 18, 8 + r() * 26);
        }
        c.fillStyle = 'rgba(30,40,46,0.35)';
        c.fillRect(x + 8, 40, S - 16, H - 40);
        c.fillStyle = '#5c6166';
        c.fillRect(x + S / 2 - 2, 40, 4, H - 40);
        c.fillRect(x + 8, 40, S - 16, 4);
        e.fillStyle = kind < 0.75 ? '#fff2d6' : '#e6f4ff';
        e.fillRect(x + 8, 40, S - 16, H - 40);
        m.fillStyle = 'rgb(255,40,150)';
        m.fillRect(x + 8, 40, S - 16, H - 40);
        h.fillStyle = '#404040';
        h.fillRect(x + 8, 40, S - 16, H - 40);
      }
    }
    const t = (cv, srgb) => {
      const tx = toTex(cv, { srgb });
      tx.wrapT = THREE.ClampToEdgeWrapping;
      return tx;
    };
    if (lite) {
      // Lambert shop walls (src/world/MapBuilder.js): no normal or roughness / metalness map
      releaseCanvas(hc);
      releaseCanvas(rm);
      return { map: t(g, true), emi: t(em, true) };
    }
    const hf = heightFromCanvas(hc);
    releaseCanvas(hc); // scratch: only its heights were needed
    // normal map needs square-ish handling: compute on the non-square field
    const nm = (() => {
      const cv = canvas(W, H),
        gg = cv.getContext('2d'),
        img = gg.createImageData(W, H),
        d = img.data;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const xl = (x - 1 + W) % W,
            xr = (x + 1) % W,
            yu = Math.max(0, y - 1),
            yd = Math.min(H - 1, y + 1);
          const dx = (hf[y * W + xr] - hf[y * W + xl]) * 4,
            dy = (hf[yd * W + x] - hf[yu * W + x]) * 4,
            l = Math.hypot(dx, dy, 1),
            i = (y * W + x) * 4;
          d[i] = ((-dx / l) * 0.5 + 0.5) * 255;
          d[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
          d[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
          d[i + 3] = 255;
        }
      gg.putImageData(img, 0, 0);
      return cv;
    })();
    return { map: t(g, true), emi: t(em, true), rm: t(rm, false), normalMap: t(nm, false) };
  });
}

// flat concrete roof with stains, drains and patching
export function roofTex() {
  return cached('roof', () => {
    const S = 512,
      f = fbmField(S, 6, 5, 111),
      fine = fbmField(S, 48, 2, 113);
    const hf = new Float32Array(S * S);
    const cv = paint(S, (x, y, i) => {
      const n = hash(x, y, 115);
      hf[i] = fine[i] * 0.5 + n * 0.5;
      const v = 0.7 + f[i] * 0.4 + (n - 0.5) * 0.1;
      const green = Math.max(0, f[i] - 0.66) * 1.6;
      return [clamp255(150 * v - green * 30), clamp255(148 * v), clamp255(142 * v - green * 30)];
    });
    return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, S, S, 1.5), { srgb: false }) };
  });
}
// corrugated metal (鐵皮屋 rooftop sheds)
export function corrugatedTex() {
  return cached('corr', () => {
    const W = 256,
      H = 256,
      hf = new Float32Array(W * H),
      rust = fbmField(256, 8, 4, 121);
    const cv = paint(W, (x, y, i) => {
      const w = 0.5 + 0.5 * Math.sin((x / W) * Math.PI * 2 * 16);
      hf[i] = w;
      const v = 0.8 + w * 0.25;
      const r = Math.max(0, rust[i] - 0.62) * 2.4;
      return [
        clamp255((205 + r * 40) * v),
        clamp255((208 - r * 60) * v),
        clamp255((210 - r * 110) * v),
      ];
    });
    return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, W, H, 4), { srgb: false }) };
  });
}
// board-formed white concrete (bell tower)
export function concreteTex() {
  return cached('concrete', () => {
    const S = 256,
      f = fbmField(S, 8, 5, 131);
    const hf = new Float32Array(S * S);
    const cv = paint(S, (x, y, i) => {
      const n = hash(x, y, 133);
      const seam = y % 64 < 1.5 ? -14 : 0;
      hf[i] = f[i] * 0.5 + n * 0.2 + (seam ? 0 : 0.3);
      const v = 222 + (f[i] - 0.5) * 30 + (n - 0.5) * 10 + seam;
      return [clamp255(v), clamp255(v - 1), clamp255(v - 4)];
    });
    return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, S, S, 2), { srgb: false }) };
  });
}
export function barkTex() {
  return cached('bark', () => {
    const W = 128,
      f = fbmField(W, 8, 4, 141);
    const hf = new Float32Array(W * W);
    const cv = paint(W, (x, y, i) => {
      const s = 0.5 + 0.5 * Math.sin((x / W) * Math.PI * 2 * 6 + f[i] * 6);
      hf[i] = s;
      const n = hash(x, y, 143);
      const v = 0.72 + s * 0.32 + (n - 0.5) * 0.12;
      return [clamp255(150 * v), clamp255(140 * v), clamp255(126 * v)];
    });
    return { map: toTex(cv), normalMap: toTex(normalFromHeight(hf, W, W, 3), { srgb: false }) };
  });
}
// RGBA leaf clusters for alpha-tested canopies
export function leafTex(kind = 'broad') {
  return cached(`leaf_${kind}`, () => {
    const S = 256,
      cv = canvas(S, S),
      g = cv.getContext('2d'),
      r = rng(kind === 'broad' ? 151 : 157);
    g.clearRect(0, 0, S, S);
    const n = kind === 'broad' ? 1500 : 5200;
    for (let k = 0; k < n; k++) {
      const x = r() * S,
        y = r() * S,
        a = r() * Math.PI,
        l = kind === 'broad' ? 5 + r() * 6 : 4 + r() * 5,
        w = l * (kind === 'broad' ? 0.5 : 0.28);
      const t = r();
      const L = 16 + t * 30;
      g.fillStyle = `hsl(${kind === 'broad' ? 72 + r() * 40 : 90 + r() * 30},${24 + r() * 26}%,${L}%)`;
      for (const ox of [-S, 0, S])
        for (const oy of [-S, 0, S]) {
          const px = x + ox,
            py = y + oy;
          if (px < -12 || px > S + 12 || py < -12 || py > S + 12) continue;
          g.beginPath();
          g.ellipse(px, py, l, w, a, 0, Math.PI * 2);
          g.fill();
        }
    }
    const t = toTex(cv);
    t.premultiplyAlpha = false;
    return t;
  });
}
// a single palm frond (pinnate leaf) on transparent background, rachis along v
export function frondTex() {
  return cached('frond', () => {
    const W = 64,
      H = 256,
      cv = canvas(W, H),
      g = cv.getContext('2d'),
      r = rng(161);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = '#7d8a3a';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(W / 2, 0);
    g.lineTo(W / 2, H);
    g.stroke();
    for (let y = 6; y < H; y += 4) {
      const t = y / H,
        len = (W / 2 - 2) * Math.sin(Math.min(1, t * 1.15) * Math.PI) * (0.85 + r() * 0.15);
      for (const s of [-1, 1]) {
        g.strokeStyle = `hsl(${85 + r() * 18},${45 + r() * 15}%,${26 + r() * 16}%)`;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(W / 2, y);
        g.quadraticCurveTo(W / 2 + s * len * 0.6, y + 6, W / 2 + s * len, y + 14 + r() * 4);
        g.stroke();
      }
    }
    return toTex(cv, { repeat: false });
  });
}
