//! Numeric kernels for the game, compiled to WebAssembly (js/wasm/kernels.wasm).
//!
//! Every kernel reproduces the JS version in js/textures.js bit for bit (same f64 operation order,
//! same f32 rounding of the Float32Array stores, V8's Math.hypot, Uint8ClampedArray rounding), so
//! the game looks exactly the same with or without WebAssembly. tools/check_wasm.mjs compares them.
//!
//! Memory: one scratch arena starting at __heap_base. Each call lays its buffers out from the start of
//! the arena (growing linear memory when needed) and returns a pointer to its result; the JS side copies
//! the result out before the next call. Nothing is heap-allocated (std is only used for the f64
//! intrinsics, which compile to single wasm instructions).
use core::arch::wasm32;

extern "C" {
    static __heap_base: u8;
}

const fn align16(n: usize) -> usize {
    (n + 15) & !15
}

/// Start of the scratch arena, with at least `bytes` bytes available (null if memory can't grow).
fn arena(bytes: usize) -> *mut u8 {
    let base = align16(unsafe { &__heap_base as *const u8 as usize });
    let need = base + bytes;
    let have = wasm32::memory_size(0) * 65536;
    if need > have {
        let pages = (need - have + 65535) / 65536;
        if wasm32::memory_grow(0, pages) == usize::MAX {
            return core::ptr::null_mut();
        }
    }
    base as *mut u8
}

// ---------- fbm value noise (textures.js hash / vnoise / fbmField) ----------

#[inline(always)]
fn hash(ix: i32, iy: i32, seed: i32) -> f64 {
    let mut h = ix
        .wrapping_mul(374761393)
        .wrapping_add(iy.wrapping_mul(668265263))
        .wrapping_add(seed.wrapping_mul(1442695041)) as u32;
    h = (h ^ (h >> 13)).wrapping_mul(1274126177);
    h ^= h >> 16;
    h as f64 / 4294967296.0
}

/// Lattice coordinates of one pixel column / row at one octave (vnoise's x0, x1 and smoothstep).
#[inline(always)]
fn lattice(t: f64, p: i64) -> (u32, u32, f64) {
    let i = t.floor();
    let f = t - i;
    let x0 = (i as i64).rem_euclid(p);
    let x1 = (x0 + 1) % p;
    (x0 as u32, x1 as u32, f * f * (3.0 - 2.0 * f))
}

/// fbmField(size, P, oct, seed, gain): size*size f32 field, returned as a pointer into the arena.
/// The lattice hashes of each octave are computed once into a table instead of 4x per pixel.
#[no_mangle]
pub extern "C" fn fbm(size: u32, p0: u32, oct: u32, seed: i32, gain: f64) -> *const f32 {
    let n = size as usize;
    // octave lattice size: p0 * 2^o, the table holds p*p hashes of the largest octave
    let pmax = (p0 as usize) << (oct.saturating_sub(1) as usize);
    let out_b = align16(n * n * 4);
    let col_b = align16(n * 16); // x0: u32, x1: u32, sx: f64 per column
    let tab_b = pmax * pmax * 8;
    let base = arena(out_b + col_b + tab_b);
    if base.is_null() {
        return core::ptr::null();
    }
    let out = base as *mut f32;
    let cols = unsafe { base.add(out_b) } as *mut (u32, u32, f64);
    let tab = unsafe { base.add(out_b + col_b) } as *mut f64;
    unsafe { core::ptr::write_bytes(out, 0, n * n) };

    let (mut amp, mut norm, mut p) = (1.0f64, 0.0f64, p0 as f64);
    for o in 0..oct {
        let k = p / size as f64;
        let pi = p as i64;
        let s = seed.wrapping_add((o as i32).wrapping_mul(17));
        unsafe {
            for y in 0..pi {
                for x in 0..pi {
                    *tab.add((y * pi + x) as usize) = hash(x as i32, y as i32, s);
                }
            }
            for x in 0..n {
                *cols.add(x) = lattice(x as f64 * k, pi);
            }
            for y in 0..n {
                let (y0, y1, sy) = lattice(y as f64 * k, pi);
                let r0 = tab.add(y0 as usize * pi as usize);
                let r1 = tab.add(y1 as usize * pi as usize);
                let row = out.add(y * n);
                for x in 0..n {
                    let (x0, x1, sx) = *cols.add(x);
                    let a = *r0.add(x0 as usize);
                    let b = *r0.add(x1 as usize);
                    let c = *r1.add(x0 as usize);
                    let d = *r1.add(x1 as usize);
                    let v = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
                    let q = row.add(x);
                    *q = (*q as f64 + amp * v) as f32;
                }
            }
        }
        norm += amp;
        amp *= gain;
        p *= 2.0;
    }
    for i in 0..n * n {
        unsafe {
            let q = out.add(i);
            *q = (*q as f64 / norm) as f32;
        }
    }
    out
}

// ---------- normal map from a height field (textures.js normalFromHeight) ----------

#[inline(always)]
fn abs(x: f64) -> f64 {
    if x < 0.0 { -x } else { x }
}

/// V8's Math.hypot(x, y, 1): normalise by the largest argument, Kahan-sum the squares.
#[inline(always)]
fn hypot3(x: f64, y: f64) -> f64 {
    let v = [abs(x), abs(y), 1.0];
    let mut max = v[0];
    if v[1] > max { max = v[1]; }
    if v[2] > max { max = v[2]; }
    if max == f64::INFINITY { return f64::INFINITY; }
    if x != x || y != y { return f64::NAN; }
    let (mut sum, mut comp) = (0.0f64, 0.0f64);
    for a in v {
        let m = a / max;
        let summand = m * m - comp;
        let pre = sum + summand;
        comp = (pre - sum) - summand;
        sum = pre;
    }
    sum.sqrt() * max
}

/// Uint8ClampedArray store: clamp to 0..255, round half to even, NaN -> 0.
#[inline(always)]
fn clamp_u8(v: f64) -> u8 {
    if !(v > 0.0) { 0 } else if v >= 255.0 { 255 } else { v.round_ties_even() as u8 }
}

/// Where the caller writes the w*h f32 height field for `normal`.
#[no_mangle]
pub extern "C" fn normal_input(w: u32, h: u32) -> *mut f32 {
    let n = (w * h) as usize;
    arena(align16(n * 4) + n * 4) as *mut f32
}

/// normalFromHeight(hf, w, h, strength): RGBA bytes (w*h*4) into the arena, after the height field.
#[no_mangle]
pub extern "C" fn normal(w: u32, h: u32, strength: f64) -> *const u8 {
    let (wu, hu) = (w as usize, h as usize);
    let n = wu * hu;
    let base = arena(align16(n * 4) + n * 4);
    if base.is_null() {
        return core::ptr::null();
    }
    let hf = base as *const f32;
    let d = unsafe { base.add(align16(n * 4)) };
    for y in 0..hu {
        // wrap-around neighbours (the texture tiles); same indices as JS's (y - 1 + h) % h etc.
        let yu = if y == 0 { hu - 1 } else { y - 1 };
        let yd = if y + 1 == hu { 0 } else { y + 1 };
        for x in 0..wu {
            let xl = if x == 0 { wu - 1 } else { x - 1 };
            let xr = if x + 1 == wu { 0 } else { x + 1 };
            unsafe {
                let dx = (*hf.add(y * wu + xr) as f64 - *hf.add(y * wu + xl) as f64) * strength;
                let dy = (*hf.add(yd * wu + x) as f64 - *hf.add(yu * wu + x) as f64) * strength;
                let l = hypot3(dx, dy);
                let i = (y * wu + x) * 4;
                *d.add(i) = clamp_u8((-dx / l * 0.5 + 0.5) * 255.0);
                *d.add(i + 1) = clamp_u8((dy / l * 0.5 + 0.5) * 255.0);
                *d.add(i + 2) = clamp_u8((1.0 / l * 0.5 + 0.5) * 255.0);
                *d.add(i + 3) = 255;
            }
        }
    }
    d
}
