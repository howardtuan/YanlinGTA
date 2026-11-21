// WebAssembly layer: numeric kernels compiled from Rust (wasm/kernels, rebuilt with tools/build_wasm.sh).
// initKernels() runs once during loading; until it succeeds (or when WebAssembly is unavailable, the
// .wasm can't be fetched, or the page has ?nowasm) every wrapper returns null and callers use their JS
// version. The kernels reproduce the JS results bit for bit (tools/check_wasm.mjs), so the game looks
// identical either way.
let X = null; // instance exports

export async function initKernels(src = new URL('./kernels.wasm', import.meta.url)) {
  if (X) return true;
  try {
    if (typeof WebAssembly !== 'object' || (typeof location === 'object' && /[?&]nowasm\b/.test(location.search))) return false;
    // instantiate from bytes, not instantiateStreaming: works whatever MIME type the server sends
    const bytes = src instanceof URL || typeof src === 'string' ? await (await fetch(src)).arrayBuffer() : src;
    const { instance } = await WebAssembly.instantiate(bytes, {});
    X = instance.exports;
    return true;
  } catch (e) {
    console.warn('WebAssembly kernels unavailable, using JS', e);
    X = null;
    return false;
  }
}
export const kernelsReady = () => !!X;

// fbmField(size, P, oct, seed, gain) -> Float32Array (a copy), or null
export function fbmWasm(size, P, oct, seed, gain) {
  if (!X || size <= 0 || P <= 0 || oct <= 0 || P * 2 ** (oct - 1) > 4096) return null;
  const p = X.fbm(size, P, oct, seed | 0, gain);
  return p ? new Float32Array(X.memory.buffer, p, size * size).slice() : null;
}

// normalFromHeight core: height field hf (w*h) -> RGBA written into out (Uint8ClampedArray w*h*4); false if unavailable
export function normalWasm(hf, w, h, strength, out) {
  if (!X) return false;
  const ip = X.normal_input(w, h); if (!ip) return false;
  new Float32Array(X.memory.buffer, ip, w * h).set(hf);
  const op = X.normal(w, h, strength); if (!op) return false;
  out.set(new Uint8Array(X.memory.buffer, op, w * h * 4));
  return true;
}
