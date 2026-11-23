// Check that js/wasm/kernels.wasm reproduces the JS texture kernels bit for bit, and time both.
//   node tools/check_wasm.mjs
// The reference code below is the JS fallback from src/graphics/Textures.js (hash / vnoise / fbmField /
// normalFromHeight's pixel loop); the fbm parameter sets are read from the fbmField(...) calls there.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initKernels, fbmWasm, normalWasm } from '../src/graphics/wasm/kernels.js';

const root = fileURLToPath(new URL('..', import.meta.url));

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, P, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const x0 = ((ix % P) + P) % P, y0 = ((iy % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed), c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbmJS(size, P, oct, seed, gain = 0.5) {
  const f = new Float32Array(size * size);
  let amp = 1, norm = 0, p = P;
  for (let o = 0; o < oct; o++) {
    const k = p / size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) f[y * size + x] += amp * vnoise(x * k, y * k, p, seed + o * 17);
    norm += amp; amp *= gain; p *= 2;
  }
  for (let i = 0; i < f.length; i++) f[i] /= norm;
  return f;
}
function normalJS(hf, w, h, strength, d) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xl = (x - 1 + w) % w, xr = (x + 1) % w, yu = (y - 1 + h) % h, yd = (y + 1) % h;
    const dx = (hf[y * w + xr] - hf[y * w + xl]) * strength, dy = (hf[yd * w + x] - hf[yu * w + x]) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
}

const ok = await initKernels(fs.readFileSync(`${root  }/src/graphics/wasm/kernels.wasm`));
if (!ok) { console.error('kernels.wasm failed to load'); process.exit(2); }

// fbm parameter sets used by the game: (size, P, oct, seed[, gain]); size S resolved per texture
const src = fs.readFileSync(`${root  }/src/graphics/Textures.js`, 'utf8');
const sets = new Set();
for (const m of src.matchAll(/fbmField\(([^)]*)\)/g)) {
  const a = m[1].split(',').map(s => s.trim()); if (a[0] === 'size') continue;
  const P = +a[1], oct = +a[2], gain = a[4] !== undefined ? +a[4] : 0.5, seed = Number.isFinite(+a[3]) ? +a[3] : 1234;
  const sizes = Number.isFinite(+a[0]) ? [+a[0]] : [128, 256, 512, 1024];
  for (const size of sizes) sets.add(JSON.stringify([size, P, oct, seed, gain]));
}
let bad = 0, tJ = 0, tW = 0;
const sameBits = (a, b) => { const x = new Uint32Array(a.buffer, a.byteOffset, a.length), y = new Uint32Array(b.buffer, b.byteOffset, b.length); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return i; return -1; };
const fields = [];
for (const s of sets) {
  const [size, P, oct, seed, gain] = JSON.parse(s);
  let t = performance.now(); const j = fbmJS(size, P, oct, seed, gain); tJ += performance.now() - t;
  t = performance.now(); const w = fbmWasm(size, P, oct, seed, gain); tW += performance.now() - t;
  const at = sameBits(j, w);
  if (at >= 0) { bad++; console.log(`fbm ${s} differs at ${at}: js ${j[at]} wasm ${w[at]}`); }
  if (size >= 256) fields.push([j, size]);
}
console.log(`fbm: ${sets.size} parameter sets, ${bad} mismatched; JS ${tJ.toFixed(0)} ms, WASM ${tW.toFixed(0)} ms (${(tJ / tW).toFixed(1)}x)`);

// normal maps: every fbm field at the strengths the game uses, plus non-square and spiky inputs
const strengths = [...new Set([...src.matchAll(/normalFromHeight\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/g)].map(m => +m[1]))];
const cases = [];
for (const [f, size] of fields) for (const st of strengths) cases.push([f, size, size, st]);
{ const w = 640, h = 400, f = new Float32Array(w * h); for (let i = 0; i < f.length; i++) f[i] = hash(i % w, (i / w) | 0, 9) > 0.7 ? 1 : 0; cases.push([f, w, h, 6], [f, w, h, 0.5]); }
let nbad = 0; tJ = tW = 0;
for (const [f, w, h, st] of cases) {
  const a = new Uint8ClampedArray(w * h * 4), b = new Uint8ClampedArray(w * h * 4);
  let t = performance.now(); normalJS(f, w, h, st, a); tJ += performance.now() - t;
  t = performance.now(); normalWasm(f, w, h, st, b); tW += performance.now() - t;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { nbad++; console.log(`normal ${w}x${h} s=${st} differs at ${i}: js ${a[i]} wasm ${b[i]}`); break; }
}
console.log(`normal: ${cases.length} maps (strengths ${strengths.join(', ')}), ${nbad} mismatched; JS ${tJ.toFixed(0)} ms, WASM ${tW.toFixed(0)} ms (${(tJ / tW).toFixed(1)}x)`);
process.exit(bad || nbad ? 1 : 0);
