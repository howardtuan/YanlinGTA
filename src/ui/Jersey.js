// 湖人隊紫色球衣（宣言版 Statement 的經典樣式，參考 2018–2025 那套）：深挖袖口的紫色背心、V 字（wishbone）領，
// 領口和袖口是金邊加一條白色細線，身體兩側黑色側條（金＋白滾邊），胸前斜體金字 LAKERS 加白邊；球褲兩側同款側條。
// 背號 24：胸前 LAKERS 下方一個小的、背後一個大的，金字加白邊。
// 球衣是一層包在連續身體（src/entities/BodyMesh.js）軀幹外 9 mm 的殼，掛在 torso 骨上；圖案全部畫在一張程序貼圖上，
// 袖口和領口用 alphaTest 挖空，滾邊寬度用貼圖上的表面距離算，所以轉角、腋下都一樣寬。
import * as THREE from 'three';
import { torsoProfile, LEG_PROF } from '../entities/BodyMesh.js';

// Lakers gold is the official #FDB927. The official purple #552583 comes out blue-violet under the game's sky light
// (measured on screen: 51, 27, 158), so the cloth uses a warmer #74267a that lands near it at midday (82, 29, 143).
export const LAKERS = { purple: '#74267a', gold: '#fdb927', white: '#ffffff', black: '#141414' };
export const HIPS = 0.93;            // torso pivot height in the bind pose (src/entities/Character.js)
export const Y0 = 0.9, Y1 = 1.548;   // from over the shorts' waistband up to the base of the neck (root frame)
const OFF = 0.009;            // how far the cloth sits off the skin
export const TW = 1536, TH = 512;    // texture: u runs round the body (seam at the back), v up the body
export const pe = (t) => Math.sign(t) * Math.abs(t) ** 0.8; // the torso's superellipse cross-section (e = 2.5), as in bodymesh

// cross-section of the cloth at height y (root frame)
export function section(prof, y, bw) {
  const yy = Math.min(Math.max(y, 0.95), Y1); // below the waist it hangs straight down
  let r = prof[prof.length - 1];
  for (let i = 0; i + 1 < prof.length; i++) {
    const a = prof[i], b = prof[i + 1];
    if (yy >= a[0] && yy <= b[0]) { const t = (yy - a[0]) / (b[0] - a[0]); r = [yy, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; break; }
  }
  const flare = Math.max(0, 0.97 - y) * 0.3; // the hem stands off the shorts a little
  return { rx: r[1] * bw + OFF + flare, rz: r[2] * (0.5 + bw / 2) + OFF + flare * 0.5, cz: r[3] };
}
// is (x, y) on the cloth? (front = the chest side) — deep tank-top armholes, a V neck, a low scoop at the back of the neck
const armX = (y) => 0.135 + 0.13 * Math.min(1, Math.max(0, (1.5 - y) / 0.24)) ** 1.4;
const VY = 1.4, VK = 0.095 / (Y1 - VY);
export function onCloth(x, y, front) {
  const ax = Math.abs(x);
  if (y > 1.27 && ax > armX(y)) return false;
  if (front && y > VY && ax < VK * (y - VY)) return false;
  if (!front && y > 1.525 && ax < 0.09 * Math.sqrt((y - 1.525) / (Y1 - 1.525))) return false;
  return true;
}

// ---------------------------------------------------------------- texture
const texCache = new Map();
function jerseyTexture(prof, bw) {
  const key = bw.toFixed(3);
  if (texCache.has(key)) return texCache.get(key);
  const N = TW * TH;
  const X = new Float32Array(N), Yr = new Float32Array(TH), front = new Uint8Array(N);
  const P = new Float32Array(N * 3); // surface points, for distances along the cloth
  const sinA = new Float32Array(TW), cosA = new Float32Array(TW);
  for (let c = 0; c < TW; c++) { const a = Math.PI + Math.PI * 2 * (c + 0.5) / TW; sinA[c] = Math.sin(a); cosA[c] = Math.cos(a); }
  for (let r = 0; r < TH; r++) {
    const y = Y0 + (1 - (r + 0.5) / TH) * (Y1 - Y0); Yr[r] = y; // canvas row 0 is the top (flipY)
    const s = section(prof, y, bw);
    for (let c = 0; c < TW; c++) {
      const i = r * TW + c, x = s.rx * pe(sinA[c]), z = s.cz + s.rz * pe(cosA[c]);
      X[i] = x; front[i] = cosA[c] > 0 ? 1 : 0; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    }
  }
  const dist = (i, j) => { const a = i * 3, b = j * 3, dx = P[a] - P[b], dy = P[a + 1] - P[b + 1], dz = P[a + 2] - P[b + 2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  // distance along the cloth to the nearest cut edge (armholes, neck; the top edge counts too): two-pass chamfer,
  // wrapping round the back seam, run twice so it crosses the seam
  const D = new Float32Array(N), on = new Uint8Array(N);
  for (let i = 0; i < N; i++) { on[i] = onCloth(X[i], Yr[(i / TW) | 0], front[i]) ? 1 : 0; D[i] = on[i] ? 1e9 : 0; }
  for (let c = 0; c < TW; c++) D[c] = Math.min(D[c], (Y1 - Y0) / TH / 2);
  const relax = (i, j) => { const d = D[j] + dist(i, j); if (d < D[i]) D[i] = d; };
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < TH; r++) for (let c = 0; c < TW; c++) {
      const i = r * TW + c, l = r * TW + (c + TW - 1) % TW; relax(i, l);
      if (r > 0) { const u = i - TW; relax(i, u); relax(i, (r - 1) * TW + (c + TW - 1) % TW); relax(i, (r - 1) * TW + (c + 1) % TW); }
    }
    for (let r = TH - 1; r >= 0; r--) for (let c = TW - 1; c >= 0; c--) {
      const i = r * TW + c, rr = r * TW + (c + 1) % TW; relax(i, rr);
      if (r < TH - 1) { relax(i, i + TW); relax(i, (r + 1) * TW + (c + 1) % TW); relax(i, (r + 1) * TW + (c + TW - 1) % TW); }
    }
  }
  // distance round the body from the side seams (for the side panels): arc length per row from the seam at the back
  const S = new Float32Array(N), _sideS = [0, 0];
  for (let r = 0; r < TH; r++) {
    let acc = 0; const base = r * TW;
    for (let c = 0; c < TW; c++) { if (c) acc += dist(base + c, base + c - 1); S[base + c] = acc; }
    // side seams: the columns at a = π/2 and 3π/2 (x = ±rx)
    const cL = Math.round(TW * 0.25 - 0.5), cR = Math.round(TW * 0.75 - 0.5);
    for (let c = 0; c < TW; c++) S[base + c] = Math.min(Math.abs(S[base + c] - S[base + cL]), Math.abs(S[base + c] - S[base + cR]));
  }
  // LAKERS across the chest, drawn in metres: x -0.135…0.135, y 1.285…1.375 (under the V)
  const WX0 = -0.135, WX1 = 0.135, WYT = 1.378, WYB = 1.282, ww = 640, wh = Math.round(ww * (WYT - WYB) / (WX1 - WX0));
  const wc = document.createElement('canvas'); wc.width = ww; wc.height = wh; const g = wc.getContext('2d');
  g.font = 'italic 900 150px "Arial Black","Helvetica Neue",Arial,sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
  const tw = g.measureText('LAKERS').width, k = Math.min((ww - 40) / tw, 1.4);
  g.setTransform(k, 0, -0.2 * k, 1, ww / 2 + 0.1 * wh, wh / 2 + 4); // a forward slant
  g.lineJoin = 'round'; g.lineWidth = 16 / k; g.strokeStyle = LAKERS.white; g.strokeText('LAKERS', 0, 0);
  g.fillStyle = LAKERS.gold; g.fillText('LAKERS', 0, 0);
  const wd = g.getImageData(0, 0, ww, wh).data;
  // the number 24: a small one under LAKERS on the chest, a big one on the back (metres, x as seen by the viewer)
  const NUM = '24';
  const numStamp = (x0, x1, yt, yb) => {
    const nw = 400, nh = Math.round(nw * (yt - yb) / (x1 - x0));
    const nc = document.createElement('canvas'); nc.width = nw; nc.height = nh; const ng = nc.getContext('2d');
    ng.font = '900 400px "Arial Black","Helvetica Neue",Arial,sans-serif'; ng.textBaseline = 'middle'; ng.textAlign = 'center';
    const m = ng.measureText(NUM), asc = m.actualBoundingBoxAscent || 145, des = m.actualBoundingBoxDescent || 145;
    const sx = (nw * 0.86) / m.width, sy = (nh * 0.86) / (asc + des);
    ng.setTransform(sx, 0, 0, sy, nw / 2, nh / 2 + (asc - des) / 2 * sy); // centre the glyphs' ink box
    ng.lineJoin = 'round'; ng.lineWidth = nw * 0.05 / Math.min(sx, sy); ng.strokeStyle = LAKERS.white; ng.strokeText(NUM, 0, 0);
    ng.fillStyle = LAKERS.gold; ng.fillText(NUM, 0, 0);
    return { x0, x1, yt, yb, w: nw, h: nh, d: ng.getImageData(0, 0, nw, nh).data };
  };
  const numFront = numStamp(-0.06, 0.06, 1.265, 1.165), numBack = numStamp(-0.115, 0.115, 1.42, 1.13);

  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const ctx = cv.getContext('2d');
  const img = ctx.createImageData(TW, TH), px = img.data;
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PU = rgb(LAKERS.purple), GO = rgb(LAKERS.gold), WH = rgb(LAKERS.white), BK = rgb(LAKERS.black);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (!on[i]) { px[o + 3] = 0; continue; }
    const d = D[i], s = S[i], y = Yr[(i / TW) | 0];
    // collar / armhole trim: gold, then a thin white line; side panels: black with gold and white piping
    let col = d < 0.011 ? GO : d < 0.0145 ? WH : s < 0.021 ? BK : s < 0.028 ? GO : s < 0.032 ? WH : PU;
    if (front[i] && y < WYT && y > WYB && X[i] > WX0 && X[i] < WX1) {
      const tx = Math.min(ww - 1, ((X[i] - WX0) / (WX1 - WX0) * ww) | 0), ty = Math.min(wh - 1, ((WYT - y) / (WYT - WYB) * wh) | 0);
      const q = (ty * ww + tx) * 4, al = wd[q + 3] / 255;
      if (al > 0) col = [col[0] + (wd[q] - col[0]) * al, col[1] + (wd[q + 1] - col[1]) * al, col[2] + (wd[q + 2] - col[2]) * al];
    }
    const st = front[i] ? numFront : numBack, vx = front[i] ? X[i] : -X[i]; // from behind, the viewer's right is -x
    if (y < st.yt && y > st.yb && vx > st.x0 && vx < st.x1) {
      const tx = Math.min(st.w - 1, ((vx - st.x0) / (st.x1 - st.x0) * st.w) | 0), ty = Math.min(st.h - 1, ((st.yt - y) / (st.yt - st.yb) * st.h) | 0);
      const q = (ty * st.w + tx) * 4, al = st.d[q + 3] / 255;
      if (al > 0) col = [col[0] + (st.d[q] - col[0]) * al, col[1] + (st.d[q + 1] - col[1]) * al, col[2] + (st.d[q + 2] - col[2]) * al];
    }
    px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

// ---------------------------------------------------------------- meshes
const geoCache = new Map();
export function shellGeometry(prof, bw) {
  const key = bw.toFixed(3);
  if (geoCache.has(key)) return geoCache.get(key);
  const ys = new Set([Y0, 0.925, 0.95, 0.97, 1.5, 1.512, 1.525, 1.536, Y1]);
  for (const p of prof) if (p[0] > Y0 && p[0] < Y1) ys.add(p[0]);
  for (let y = 1.0; y < 1.5; y += 0.03) ys.add(+y.toFixed(3));
  const rows = [...ys].sort((a, b) => a - b), NA = 72;
  const pos = [], uv = [], idx = [];
  for (const y of rows) {
    const s = section(prof, y, bw);
    for (let i = 0; i <= NA; i++) {
      const a = Math.PI + Math.PI * 2 * i / NA;
      pos.push(s.rx * pe(Math.sin(a)), y - HIPS, s.cz + s.rz * pe(Math.cos(a)));
      uv.push(i / NA, (y - Y0) / (Y1 - Y0));
    }
  }
  for (let j = 0; j + 1 < rows.length; j++) for (let i = 0; i < NA; i++) {
    const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}
let stripeTex = null;
function shortsStripeTexture() { // across the stripe: white | gold | black | gold | white
  if (stripeTex) return stripeTex;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 4; const g = cv.getContext('2d');
  for (const [x, w, c] of [[0, 4, LAKERS.white], [4, 7, LAKERS.gold], [11, 42, LAKERS.black], [53, 7, LAKERS.gold], [60, 4, LAKERS.white]]) { g.fillStyle = c; g.fillRect(x, 0, w, 4); }
  stripeTex = new THREE.CanvasTexture(cv); stripeTex.colorSpace = THREE.SRGBColorSpace;
  return stripeTex;
}
// one side stripe on the outside of a shorts leg (hip-pivot frame, same cross-section as bodymesh's loose shorts)
function stripeGeometry(side, bw, hem, f) {
  const lr = (y) => { for (let j = 0; j + 1 < LEG_PROF.length; j++) { const [y0, r0] = LEG_PROF[j], [y1, r1] = LEG_PROF[j + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.09; };
  const pos = [], uv = [], idx = [], NY = 14, NX = 6, HALF = 0.034, LIFT = 0.0025;
  for (let j = 0; j <= NY; j++) {
    const y = hem + 0.004 + (-0.035 - hem - 0.004) * j / NY, r = lr(y) + 0.024;
    const rx = r * (1 + 0.04 * f) * bw + LIFT, rz = r + LIFT, da = HALF / rz;
    for (let i = 0; i <= NX; i++) {
      const a = side * Math.PI / 2 + (i / NX - 0.5) * 2 * da;
      pos.push(rx * Math.sin(a), y, rz * Math.cos(a)); uv.push(i / NX, j / NY);
    }
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
    idx.push(a, b, c, b, d, c); // faces outwards on both legs
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// put the jersey (and the shorts' side stripes) on a createCharacter() figure with a skinned body.
// opts: build (the same build the body was made with), hem (shorts length), female
export function dressLakers(ch, { build = 1, hem = -0.4, female = false } = {}) {
  if (!ch.bodyMesh) return null; // the old part-built body (?legacy) keeps its plain purple shirt
  const f = female ? 1 : 0, prof = torsoProfile(f);
  const jersey = new THREE.Mesh(shellGeometry(prof, build), new THREE.MeshStandardMaterial({
    map: jerseyTexture(prof, build), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75,
  }));
  jersey.castShadow = true; ch.torso.add(jersey);
  const sm = new THREE.MeshStandardMaterial({ map: shortsStripeTexture(), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const l of ch.legs) l.hp.add(new THREE.Mesh(stripeGeometry(l.s, build, hem, f), sm));
  return jersey;
}
