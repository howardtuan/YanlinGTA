import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initKernels, fbmWasm, normalWasm } from '../../src/graphics/wasm/kernels.js';
import { fbmFieldJS, normalFromHeightJS } from '../../src/graphics/Textures.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

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
    expect(sets.size).toBeGreaterThan(0);
  });

  it('should produce bit-for-bit identical results between fbmWasm and Textures.js fbmFieldJS', () => {
    let mismatched = 0;
    for (const s of sets) {
      const [size, P, oct, seed, gain] = JSON.parse(s);
      const j = fbmFieldJS(size, P, oct, seed, gain);
      const w = fbmWasm(size, P, oct, seed, gain);
      const at = sameBits(j, w);
      if (at >= 0) mismatched++;
      if (size >= 256 && fields.length < 5) fields.push([j, size]);
    }
    expect(mismatched).toBe(0);
  });

  it('should produce byte-for-byte identical normal maps between normalWasm and Textures.js normalFromHeightJS', () => {
    expect(fields.length).toBeGreaterThan(0);
    let mismatched = 0;
    const strengths = [1.5, 2.2, 3.0, 5.0];
    for (const [f, size] of fields) {
      for (const st of strengths) {
        const a = new Uint8ClampedArray(size * size * 4);
        const b = new Uint8ClampedArray(size * size * 4);
        normalFromHeightJS(f, size, size, st, a);
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
