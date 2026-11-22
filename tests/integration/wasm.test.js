import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initKernels, fbmWasm, normalWasm } from '../../src/graphics/wasm/kernels.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

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

function fbmJS(size, P, oct, seed, gain = 0.5) {
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

function normalJS(hf, w, h, strength, d) {
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

const sameBits = (a, b) => {
  const x = new Uint32Array(a.buffer, a.byteOffset, a.length),
    y = new Uint32Array(b.buffer, b.byteOffset, b.length);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return i;
  return -1;
};

describe('WASM Kernel Integration & Precision Parity (wasm.test.js)', () => {
  let wasmLoaded = false;
  const sets = new Set();
  const fields = [];

  beforeAll(async () => {
    const wasmBuffer = fs.readFileSync(path.join(ROOT, 'src/graphics/wasm/kernels.wasm'));
    wasmLoaded = await initKernels(wasmBuffer);

    // Extract fbm parameter sets from src/graphics/Textures.js
    const src = fs.readFileSync(path.join(ROOT, 'src/graphics/Textures.js'), 'utf8');
    for (const m of src.matchAll(/fbmField\(([^)]*)\)/g)) {
      const a = m[1].split(',').map((s) => s.trim());
      if (a[0] === 'size') continue;
      const P = +a[1],
        oct = +a[2],
        gain = a[4] !== undefined ? +a[4] : 0.5,
        seed = Number.isFinite(+a[3]) ? +a[3] : 1234;
      const sizes = Number.isFinite(+a[0]) ? [+a[0]] : [128, 256]; // sample fast in test
      for (const size of sizes) sets.add(JSON.stringify([size, P, oct, seed, gain]));
    }
  });

  it('should initialize kernels.wasm successfully', () => {
    expect(wasmLoaded).toBe(true);
  });

  it('should produce bit-for-bit identical results between fbmWasm and fbmJS', () => {
    let mismatched = 0;
    for (const s of sets) {
      const [size, P, oct, seed, gain] = JSON.parse(s);
      const j = fbmJS(size, P, oct, seed, gain);
      const w = fbmWasm(size, P, oct, seed, gain);
      const at = sameBits(j, w);
      if (at >= 0) mismatched++;
      if (size >= 256 && fields.length < 5) fields.push([j, size]);
    }
    expect(mismatched).toBe(0);
  });

  it('should produce byte-for-byte identical normal maps between normalWasm and normalJS', () => {
    let mismatched = 0;
    const strengths = [1.5, 2.2, 3.0, 5.0];
    for (const [f, size] of fields) {
      for (const st of strengths) {
        const a = new Uint8ClampedArray(size * size * 4);
        const b = new Uint8ClampedArray(size * size * 4);
        normalJS(f, size, size, st, a);
        normalWasm(f, size, size, st, b);
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            mismatched++;
            break;
          }
        }
      }
    }
    expect(mismatched).toBe(0);
  });
});
