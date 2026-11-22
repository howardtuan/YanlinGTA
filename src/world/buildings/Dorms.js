// F 區「北宿舍」: 良善樓 (OSM w392023419), 恩慈樓 (w392023418), the campus boundary wall along 大仁街 / 大仁二街,
// the A2 gate sign wall and 恩慈小門. Outside only, nothing here can be entered.
// src/world/MapBuilder.js still draws both slabs from their OSM outlines (so none of its shared random draws change);
// liangshanLook() / enciLook() only swap the facade looks (src/core/Game.js), and buildDorms() adds what the outlines
// cannot say:
//  良善樓 — the ~7 m blue glass disc on the roof (centre about (-43, 273), replacing the old white roof_drum) over
//    the salmon concrete roof grid; on the 大仁街 (south-west) face the off-white tiles with white ribs (looks), the
//    stacked slanted balconies with dark brown louvres at the south-east end, glass-block window bands, the red
//    brick low wall at the west corner; on the west end the red semicircular 2F balcony and the cobalt strips;
//    on the north wing the entrance: two white square columns with black caps in a double-height opening, the
//    teal curtain-wall band with the gold 「良善樓」 letters, and the ramp along the wall.
//  恩慈樓 — the north wing is 8F, the connecting block and the south wing 10F (tools/overrides.json split); south face
//    white-grey render, ochre spandrels on the low floors, ribbon windows (look); the full-height dark glass stair
//    tower standing out of the south face (about 5.5 x 7.5 m, centre about (16, 321)) with an orange-brown cap; the
//    north entrance: a double-height colonnade of four square piers, 「恩慈樓」 on the ochre band, a blue soffit, six wide
//    steps between cheek walls; roof plant from the 2024 ortho (cooling towers, a plant room, a green-topped box).
//  校界牆 — the OSM wall along 大仁街 / 大仁二街 (src/world/Furniture.js keeps its collision) re-skinned as the real ~2.8 m
//    red brick wall with grey piers every ~6 m, razor wire coils on brackets and graffiti on the street side; the
//    low granite A2 gate wall with the dark 「中原大學」 panel and the orange 「A2 Gate」 block where it starts by
//    the A2 steps; at 恩慈小門 brick gate piers, two red-and-white boom arms (raised) and the yellow ticket box.
// Sources: Google 街景 2024-08 (大仁街 80 號 pano P5ZW4SkfzKWabogzqeBhGw, pzUfCbkM9SefO-bOIYz_6Q; A2 門前
// A45C3cQiAJY6cKhaSdFTRA), 2017-09 (北側步道 _sDi0ujaYYVk0n-uqe1jlA, DJi8z4TIZ4DLKl4C6HHrGQ), 2025-03 使用者 360
// (大仁二街), NLSC 2024 正射. Survey notes: campus-survey/zone-F.md. Not seen: 良善 north-east side (follows the
// south-west face), 恩慈 east end (kept as it is). The 「恩慈北翼西端往西延 5～8 m」 seen on the ortho is not built: the
// 2017 street view from the north path shows a 5-6 m walkway between the two buildings (a pergola, a low brick wall,
// palms), and the extension would run into 良善樓's north wing; the ortho's lean of the tall roofs made it look joined.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H, groundY } from '../Terrain.js';
import { pointInPoly } from '../../physics/Collision.js';

export const LIANGSHAN_ID = 'w392023419', ENCI_ID = 'w392023418';
// heights above the building base (src/world/MapBuilder.js: 3.3 m storeys + 0.6 m)
const FL = 3.3, LS_TOP = 30.3, EC_TOP = 33.6;
// 良善樓 outline points used here (data/cycu.json)
const LS = {
  sw0: [-51.1, 274.9], sw1: [-41.1, 282.3], sw2: [-19.8, 300.3], sw3: [-8.5, 308.6],    // 大仁街 face, NW -> SE
  nw0: [-45.1, 264.1],                                                                   // west end wall nw0 -> sw0
  nn0: [-29.5, 252.0], nn1: [-5.3, 263.0],                                               // north wing, north face
  disc: [-43, 273], discR: 3.5,
};
// 恩慈樓
const EC = {
  n0: [-6.1, 270.1], n1: [56.5, 296.6],     // north wing, north face (W -> E)
  s0: [33.7, 325.6], s1: [-6.1, 308.9],     // south wing, south face (E -> W)
};
// where the parts go along those faces (metres from the first point)
const LS_ENT = { s0: 16.0, s1: 23.0 }, LS_RAMP = { s0: 8.0, s1: 16.0, w: 0.9, rise: 0.4 };
const EC_TOWER = { s0: 15.3, s1: 20.8, out: 4.0, back: 1.0 };
const EC_ENT = { s: 38, w: 12, d: 3.7, steps: 6, rise: 0.15 };

// ---------------- looks (tools/looks.json looks, edited; applied in src/core/Game.js after the random draws) ----------------
// 良善樓: keeps the tiles / grid windows / deep white ribs (their collision stays the same); the cobalt colour is now
// only two strips on the west end (buildDorms), and the flat red canopy gives way to the real semicircular balcony
export function liangshanLook(L) {
  const o = JSON.parse(JSON.stringify(L || {}));
  delete o.faces; delete o.canopy;
  return o;
}
// 恩慈樓: white-grey render (洗石子 / 噴砂), ribbon windows, ochre spandrels: the low two floors on the 大仁街 side,
// every floor on the other sides (北面「橘黃窗台帶」, 東端「橘黃窗帶」)
export function enciLook(L) {
  const o = JSON.parse(JSON.stringify(L || {}));
  o.wall = { base: 'stone', colour: '#d8d6d0' };
  o.windows = { type: 'ribbon', bay: 3.0, accent: '#8d9296', glass: '#55636c', ground: 'punched' };
  delete o.fins;
  o.bands = [
    { on: ['s', 'sw', 'se'], colour: '#c9a24a', h: 0.85, depth: 0.06, at: 0.18, from: 1, to: 2 },
    { on: ['n', 'ne', 'nw', 'e', 'w'], colour: '#cf9a3c', h: 0.7, depth: 0.06, at: 0.2, from: 1 },
  ];
  o.parapet = { h: 0.6, colour: '#d2d0ca' };
  if (o.roof) delete o.roof.boxes; // the roof plant is drawn in buildEnci (from the ortho)
  return o;
}

// edge frame: t along a -> c, n outwards (away from the polygon), P(s, o) = point s along, o out
function edge(a, c, poly) {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), t = [dx / len, dz / len];
  let n = [t[1], -t[0]];
  const m = [(a[0] + c[0]) / 2 + n[0] * 0.5, (a[1] + c[1]) / 2 + n[1] * 0.5];
  if (poly && pointInPoly(m[0], m[1], poly)) n = [-n[0], -n[1]];
  return { a, c, len, t, n, ang: Math.atan2(t[1], t[0]), P: (s, o = 0) => [a[0] + t[0] * s + n[0] * o, a[1] + t[1] * s + n[1] * o] };
}

// outlines of the added parts: src/world/MapBuilder.js hides the shrubs planted there (opts.vegHide; not reserved, which would
// change the shared random draws of the shrub placement)
export function dormsFootprints(data) {
  const out = [];
  const ec = data?.buildings.find(b => b.id === ENCI_ID), ls = data?.buildings.find(b => b.id === LIANGSHAN_ID);
  if (ec) {
    const S = edge(EC.s0, EC.s1, ec.pts), T = EC_TOWER;
    out.push([S.P(T.s0 - 0.3, 0), S.P(T.s1 + 0.3, 0), S.P(T.s1 + 0.3, T.out + 0.3), S.P(T.s0 - 0.3, T.out + 0.3)]);
    const N = edge(EC.n0, EC.n1, ec.pts), e = EC_ENT;
    out.push([N.P(e.s - e.w / 2 - 0.8, 0), N.P(e.s + e.w / 2 + 0.8, 0), N.P(e.s + e.w / 2 + 0.8, e.d + 0.4), N.P(e.s - e.w / 2 - 0.8, e.d + 0.4)]);
  }
  if (ls) {
    const N = edge(LS.nn0, LS.nn1, ls.pts);
    out.push([N.P(LS_RAMP.s0 - 0.3, 0), N.P(LS_ENT.s1 + 2.6, 0), N.P(LS_ENT.s1 + 2.6, LS_RAMP.w + 1.0), N.P(LS_RAMP.s0 - 0.3, LS_RAMP.w + 1.0)]);
  }
  return out;
}

// ---------------- textures ----------------
const TEX = {};
function ctex(key, w, h, draw, repeat = true) {
  if (TEX[key]) return TEX[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (TEX[key] = t);
}
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
// red brick, running bond: one repeat = 2 m x 1 m (8 bricks of 0.25 m, 15 courses)
const brickTex = () => ctex('dmBrick', 512, 256, (g, W, Hh) => {
  const r = lcg(11), bw = W / 8, ch = Hh / 15;
  g.fillStyle = '#b9ab98'; g.fillRect(0, 0, W, Hh);
  for (let j = 0; j < 15; j++) for (let i = -1; i < 9; i++) {
    const x = i * bw + (j % 2) * bw / 2, k = 0.82 + r() * 0.3, c = [150, 72, 52].map(v => Math.round(v * k));
    g.fillStyle = `rgb(${c})`; g.fillRect(x + 2, j * ch + 2, bw - 4, ch - 3);
    if (r() < 0.25) { g.fillStyle = 'rgba(40,20,15,0.18)'; g.fillRect(x + 2, j * ch + 2, bw - 4, ch - 3); }
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(30,25,20,${r() * 0.08})`; g.fillRect(r() * W, r() * Hh, 3 + r() * 30, 2 + r() * 8); }
});
// grey render (piers, caps, plinths) with stains
const concTex = () => ctex('dmConc', 256, 256, (g, W, Hh) => {
  const r = lcg(5); g.fillStyle = '#a6a49d'; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '50,50,45'},${0.03 + r() * 0.05})`; g.fillRect(r() * W, r() * Hh, 2 + r() * 9, 2 + r() * 9); }
  for (let i = 0; i < 18; i++) { const x = r() * W; const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, 'rgba(40,40,35,0.25)'); gr.addColorStop(1, 'rgba(40,40,35,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3 + r() * 10, Hh * (0.3 + r() * 0.7)); }
});
// graffiti: 4 panels side by side (each ~3 m x 2.2 m of wall), made-up tags and colour blocks, transparent between
const graffitiTex = () => ctex('dmGraf', 2048, 512, (g, W, Hh) => {
  const r = lcg(2024), pw = W / 4;
  const pal = ['#e94b8a', '#3aa0e0', '#f2d23c', '#5ec46a', '#f07b2e', '#8b5cd6', '#ffffff', '#1d1d1f', '#2fd0c8', '#d73a3a'];
  const pick = () => pal[Math.floor(r() * pal.length)];
  const words = ['ZEKO', 'RAVN', 'OKSY', 'DUBS', 'KAPO', 'MIRA', 'YOLO', 'TOXA', 'VEKS', 'NOAH', 'AXL', 'RIOT'];
  for (let p = 0; p < 4; p++) {
    const x0 = p * pw;
    g.save(); g.beginPath(); g.rect(x0 + 6, 6, pw - 12, Hh - 12); g.clip();
    if (p === 1 || p === 3) { // a big painted background block (mural style)
      g.fillStyle = pick(); g.globalAlpha = 0.85; g.fillRect(x0 + 10 + r() * 40, 30 + r() * 60, pw - 60 - r() * 60, Hh - 80 - r() * 60); g.globalAlpha = 1;
      // a stylised face / character silhouette
      g.fillStyle = pick(); g.beginPath(); g.ellipse(x0 + pw * (0.3 + r() * 0.4), Hh * 0.5, 70 + r() * 40, 100 + r() * 40, 0, 0, 7); g.fill();
      g.fillStyle = '#1d1d1f'; g.beginPath(); g.arc(x0 + pw * 0.45, Hh * 0.43, 12, 0, 7); g.arc(x0 + pw * 0.58, Hh * 0.43, 12, 0, 7); g.fill();
    }
    for (let k = 0; k < 3 + p % 2; k++) { // bubble-letter tags
      const w = words[Math.floor(r() * words.length)];
      let px = 60 + r() * 70;
      g.font = `900 ${px}px "Arial Black","Impact",sans-serif`;
      const tw = g.measureText(w).width, fit = Math.min(1, (pw - 70) / tw); px *= fit; // the whole tag stays inside its panel
      g.font = `900 ${px}px "Arial Black","Impact",sans-serif`;
      const ww = g.measureText(w).width, x = x0 + 30 + r() * Math.max(0, pw - 60 - ww), y = px * 0.9 + 20 + r() * Math.max(0, Hh - px * 1.3 - 40);
      g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.25); g.lineJoin = 'round';
      g.lineWidth = 16; g.strokeStyle = '#1b1b1d'; g.strokeText(w, 0, 0);
      g.lineWidth = 6; g.strokeStyle = pick(); g.strokeText(w, 0, 0);
      g.fillStyle = pick(); g.fillText(w, 0, 0);
      g.restore();
    }
    for (let k = 0; k < 6; k++) { // thin marker scribbles
      g.strokeStyle = pick(); g.lineWidth = 3 + r() * 4; g.beginPath();
      let x = x0 + r() * pw, y = 60 + r() * (Hh - 120); g.moveTo(x, y);
      for (let q = 0; q < 8; q++) { x += (r() - 0.3) * 50; y += (r() - 0.5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
  }
}, false);
// razor wire coil seen side-on (alpha)
const wireTex = () => ctex('dmWire', 512, 128, (g, W, Hh) => {
  g.clearRect(0, 0, W, Hh); g.strokeStyle = 'rgba(70,72,76,1)'; g.lineWidth = 3;
  for (let i = -1; i < 9; i++) { const x = i * W / 8; g.beginPath(); g.ellipse(x + 32, Hh / 2, 40, 54, 0.5, 0, 7); g.stroke(); }
  g.lineWidth = 2; g.beginPath(); g.moveTo(0, Hh / 2); g.lineTo(W, Hh / 2); g.stroke();
  g.fillStyle = 'rgba(90,92,96,1)'; for (let i = 0; i < 70; i++) { const x = (i * 37) % W, y = 10 + (i * 53) % (Hh - 20); g.fillRect(x, y, 7, 2); }
});
// dark louvres (slanted slats) of the 良善 balconies
const louvreTex = () => ctex('dmLouvre', 128, 256, (g, W, Hh) => {
  g.fillStyle = '#2a1e17'; g.fillRect(0, 0, W, Hh);
  for (let y = 0; y < Hh; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#6a4a36'); gr.addColorStop(1, '#3a281e'); g.fillStyle = gr; g.fillRect(0, y + 2, W, 11); }
  g.fillStyle = '#20160f'; g.fillRect(0, 0, 6, Hh); g.fillRect(W - 6, 0, 6, Hh);
});
// glass blocks (20 cm squares) one repeat = 1 m
const glassBlockTex = () => ctex('dmGlassBlock', 256, 256, (g, W) => {
  const r = lcg(9), s = W / 5;
  g.fillStyle = '#cfd6d2'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const gr = g.createRadialGradient(i * s + s / 2, j * s + s / 2, 4, i * s + s / 2, j * s + s / 2, s * 0.7);
    gr.addColorStop(0, `rgb(${170 + r() * 30},${195 + r() * 25},${190 + r() * 25})`); gr.addColorStop(1, '#8fa39f');
    g.fillStyle = gr; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
  }
});
// steel mesh over dark openings (the brick low wall's windows)
const meshTex = () => ctex('dmMesh', 128, 128, (g, W) => {
  g.fillStyle = '#2b3033'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(170,175,178,0.8)'; g.lineWidth = 2;
  for (let i = -W; i < W * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + W, W); g.stroke(); g.beginPath(); g.moveTo(i, W); g.lineTo(i + W, 0); g.stroke(); }
});
// teal curtain wall (1.5 m mullions, transom per storey), one repeat = 1.5 m x 3.3 m
const tealTex = () => ctex('dmTeal', 128, 256, (g, W, Hh) => {
  const gr = g.createLinearGradient(0, 0, W, Hh); gr.addColorStop(0, '#5cc0b2'); gr.addColorStop(1, '#2f8f86');
  g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(8, 8, W * 0.35, Hh - 16);
  g.fillStyle = '#d9dcd8'; g.fillRect(0, 0, 5, Hh); g.fillRect(0, Hh - 8, W, 8); g.fillRect(0, Hh * 0.38, W, 4);
});
// dark blue-black glass of the 恩慈 stair tower, one repeat = 2.75 m x 3.3 m
const towerGlassTex = () => ctex('dmTowerGlass', 128, 256, (g, W, Hh) => {
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#24303e'); gr.addColorStop(1, '#141b24');
  g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  g.fillStyle = 'rgba(160,190,220,0.08)'; g.fillRect(W * 0.1, 0, W * 0.3, Hh);
  g.fillStyle = '#0c1015'; g.fillRect(0, 0, 4, Hh); g.fillRect(0, Hh - 10, W, 10); g.fillRect(0, Hh * 0.5, W, 3);
});
// the blue glass disc's top: parallel glazing bars
const discTex = () => ctex('dmDisc', 256, 256, (g, W) => {
  const gr = g.createLinearGradient(0, 0, W, W); gr.addColorStop(0, '#4f86c6'); gr.addColorStop(1, '#2a5b9a');
  g.fillStyle = gr; g.fillRect(0, 0, W, W);
  g.fillStyle = '#c9d3dc'; for (let x = 0; x < W; x += W / 9) g.fillRect(x, 0, 4, W);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, W * 0.2, W, W * 0.12);
});
const goldText = (key, text, w, h, px, font = '"Noto Serif TC","Songti TC","PMingLiU",serif') => ctex(key, w, h, (g) => {
  g.font = `900 ${px}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(30,18,10,0.55)'; g.fillText(text, w / 2 + 4, h / 2 + 5);
  const gr = g.createLinearGradient(0, h / 2 - px / 2, 0, h / 2 + px / 2); gr.addColorStop(0, '#f0d58f'); gr.addColorStop(0.5, '#c9a45c'); gr.addColorStop(1, '#9c7a3c');
  g.fillStyle = gr; g.fillText(text, w / 2, h / 2);
}, false);
// 恩慈樓 north entrance: dark brown letters on the ochre band (2017 street view)
const nameBand = () => ctex('dmEcBand', 1024, 200, (g, W, Hh) => {
  g.fillStyle = '#c9963a'; g.fillRect(0, 0, W, Hh);
  g.font = '900 150px "Noto Serif TC","Songti TC","PMingLiU",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,230,170,0.35)'; g.fillText('恩  慈  樓', W / 2 + 3, Hh / 2 + 4);
  g.fillStyle = '#4a2a14'; g.fillText('恩  慈  樓', W / 2, Hh / 2);
}, false);
// A2 gate panel: dark grey with the school name and seal, orange "A2 Gate" block at the left
const a2Tex = () => ctex('dmA2', 2048, 256, (g, W, Hh) => {
  g.fillStyle = '#2d2f33'; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#e46a26'; g.fillRect(0, 0, 230, Hh);
  g.fillStyle = '#ffffff'; g.font = '800 70px "Helvetica Neue",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('A2', 115, 95); g.font = '700 46px "Helvetica Neue",Arial,sans-serif'; g.fillText('Gate', 115, 165);
  // seal
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(420, Hh / 2, 70, 0, 7); g.stroke();
  g.fillStyle = '#2d4f9a'; g.beginPath(); g.arc(420, Hh / 2, 62, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.fillRect(414, 90, 12, 76); g.fillRect(390, 112, 60, 12);
  g.font = '900 130px "Noto Serif TC","Songti TC","PMingLiU",serif'; g.textAlign = 'left'; g.fillText('中 原 大 學', 540, 105);
  g.font = '500 48px "Times New Roman",Georgia,serif'; g.fillText('Chung Yuan Christian University', 545, 205);
});
// banner on the 大仁二街 wall (2025-03 photo): white on blue
const bannerTex = () => ctex('dmBanner', 1024, 192, (g, W, Hh) => {
  g.fillStyle = '#1e56a8'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#ffffff'; g.fillRect(8, 8, W - 16, Hh - 16); g.fillStyle = '#1e56a8'; g.fillRect(14, 14, W - 28, Hh - 28);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 64px "Noto Sans TC","PingFang TC",sans-serif'; g.fillText('中原大學專用機車停車場', W / 2, 66);
  g.font = '800 48px "Noto Sans TC","PingFang TC",sans-serif'; g.fillText('非本校師生嚴禁停放', W / 2, 136);
}, false);
// red-and-white boom arm
const boomTex = () => ctex('dmBoom', 256, 16, (g, W, Hh) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d32a2a'; g.fillRect(i * W / 8, 0, W / 8, Hh); } });

const MATS = {};
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const m = {
    brick: () => std({ map: brickTex(), roughness: 0.92 }),
    conc: () => std({ map: concTex(), roughness: 0.95 }),
    concLight: () => std({ map: concTex(), color: '#e4e2dc', roughness: 0.95 }),
    graffiti: () => new THREE.MeshStandardMaterial({ map: graffitiTex(), transparent: true, alphaTest: 0.08, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }),
    wire: () => new THREE.MeshStandardMaterial({ map: wireTex(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }),
    steel: () => std({ color: '#7a7e82', metalness: 0.6, roughness: 0.45 }),
    stainless: () => std({ color: '#c8ccd0', metalness: 0.85, roughness: 0.25 }),
    black: () => std({ color: '#1d1e20', metalness: 0.4, roughness: 0.5 }),
    louvre: () => std({ map: louvreTex(), roughness: 0.7, side: THREE.DoubleSide }),
    glassBlock: () => std({ map: glassBlockTex(), roughness: 0.25, metalness: 0.1 }),
    mesh: () => std({ map: meshTex(), roughness: 0.6, metalness: 0.3 }),
    white: () => std({ color: '#eeece6', roughness: 0.7 }),
    offwhite: () => std({ color: '#e3ddd0', roughness: 0.8 }),
    redTile: () => std({ color: '#c8342c', roughness: 0.6 }),
    blue: () => std({ color: '#2b4fa8', roughness: 0.4, metalness: 0.2 }),
    salmon: () => std({ color: '#dfa98a', roughness: 0.9 }),
    discGlass: () => std({ map: discTex(), roughness: 0.15, metalness: 0.4 }),
    discSide: () => std({ color: '#3567a8', roughness: 0.15, metalness: 0.5 }),
    teal: () => std({ map: tealTex(), roughness: 0.15, metalness: 0.35 }),
    recess: () => std({ color: '#2c3236', roughness: 0.4, metalness: 0.3, emissive: '#6b5532', emissiveIntensity: 0.35 }), // lit lobby behind the glass
    towerGlass: () => std({ map: towerGlassTex(), roughness: 0.12, metalness: 0.55 }),
    orangeCap: () => std({ color: '#c8743a', roughness: 0.8 }),
    stone: () => std({ color: '#b9b6ae', roughness: 0.9 }),
    granite: () => std({ map: concTex(), color: '#c9c6bf', roughness: 0.7 }),
    yellow: () => std({ color: '#e6b422', roughness: 0.5, metalness: 0.2 }),
    boom: () => std({ map: boomTex(), roughness: 0.5 }),
    mosaic: () => std({ color: '#c9d3d8', roughness: 0.6 }),
    ochre: () => std({ color: '#c9963a', roughness: 0.7 }),
    soffitBlue: () => std({ color: '#3f6f9e', roughness: 0.7 }),
    greenTop: () => std({ color: '#9fd4a4', roughness: 0.8 }),
    coolTower: () => std({ color: '#d9dbd8', roughness: 0.6 }),
    lamp: () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4dc', emissiveIntensity: 0.8 }),
  }[key];
  return (MATS[key] = m());
}

// ---------------- world-space kit (merged per material) ----------------
class Acc {
  constructor() { this.parts = new Map(); }
  add(m, g) {
    if (g.index) g = g.toNonIndexed();
    if (!this.parts.has(m)) this.parts.set(m, []);
    this.parts.get(m).push(g); return g;
  }
  // box along an edge frame E: s0..s1 along, o0..o1 out, y0..y1; tile = [u, v] metres per repeat
  ebox(m, E, s0, s1, o0, o1, y0, y1, tile) {
    const L = s1 - s0, D = o1 - o0, Hh = y1 - y0, g = new THREE.BoxGeometry(L, Hh, D);
    if (tile) tileUV(g, L, Hh, D, tile);
    g.rotateY(-E.ang);
    const c = E.P((s0 + s1) / 2, (o0 + o1) / 2); g.translate(c[0], (y0 + y1) / 2, c[1]);
    return this.add(m, g);
  }
  // box of cross-section w x h from p to q (3D)
  beam(m, p, q, w, h, tile) {
    const P = new THREE.Vector3(...p), Q = new THREE.Vector3(...q), dir = Q.clone().sub(P), len = dir.length();
    const g = new THREE.BoxGeometry(w, h, len);
    if (tile) tileUV(g, w, h, len, tile);
    const z = dir.normalize(), x = new THREE.Vector3(0, 1, 0).cross(z);
    if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize();
    const y = z.clone().cross(x);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z)); g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    return this.add(m, g);
  }
  cyl(m, x, z, r, y0, y1, seg = 16, t0 = 0, tl = Math.PI * 2, open = false, r1 = r) {
    const g = new THREE.CylinderGeometry(r1, r, y1 - y0, seg, 1, open, t0, tl); g.translate(x, (y0 + y1) / 2, z); return this.add(m, g);
  }
  // vertical plane facing n (2D), centre (x, z), w wide, y0..y1; uv: [u metres, v metres] per repeat, or null = one image
  plane(m, x, z, n, w, y0, y1, tile, uv0) {
    const g = new THREE.PlaneGeometry(w, y1 - y0);
    const uv = g.attributes.uv;
    if (tile) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile[0], uv.getY(i) * (y1 - y0) / tile[1]);
    if (uv0) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv0[0] + uv.getX(i) * (uv0[1] - uv0[0]), uv.getY(i));
    g.rotateY(Math.atan2(n[0], n[1])); g.translate(x, (y0 + y1) / 2, z);
    return this.add(m, g);
  }
  // flat polygon [[x, z]..] at y facing up (down = facing down)
  flat(m, pts, y, down = false, tile = 4) {
    const v = pts.map(([x, z]) => new THREE.Vector2(x, z)), tris = THREE.ShapeUtils.triangulateShape(v, []);
    const pos = [], uv = [], nrm = [];
    for (const t of tris) for (const i of t) { pos.push(pts[i][0], y, pts[i][1]); uv.push(pts[i][0] / tile, pts[i][1] / tile); nrm.push(0, down ? -1 : 1, 0); }
    for (let i = 0; i < pos.length; i += 9) {
      const ax = pos[i], az = pos[i + 2], bx = pos[i + 3], bz = pos[i + 5], cx = pos[i + 6], cz = pos[i + 8];
      const cy = (bz - az) * (cx - ax) - (bx - ax) * (cz - az); // >0: counter-clockwise seen from above
      if ((cy > 0) === down) for (let k = 0; k < 3; k++) { const t = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = t; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return this.add(m, g);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = !['graffiti', 'wire', 'lamp'].includes(m); mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      group.add(mesh);
    }
  }
}
function tileUV(g, W, Hh, D, [tu, tv]) {
  const uv = g.attributes.uv, dims = [[D, Hh], [D, Hh], [W, D], [W, D], [W, Hh], [W, Hh]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tu, uv.getY(i) * dims[f][1] / tv); }
}
function sign(group, tex, w, h, x, y, z, n, emissive = 0.15) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.4, metalness: 0.3, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: emissive }));
  m.position.set(x, y, z); m.rotation.y = Math.atan2(n[0], n[1]); m.updateMatrix(); m.matrixAutoUpdate = false; group.add(m); return m;
}

// ---------------- 良善樓 ----------------
function buildLiangshan(I, k, group, b) {
  const pts = b.pts, B = Number.isFinite(b.base) ? b.base : H(...LS.sw0), top = B + LS_TOP;
  const E1 = edge(LS.sw0, LS.sw1, pts), E2 = edge(LS.sw1, LS.sw2, pts), E3 = edge(LS.sw2, LS.sw3, pts);
  const EW = edge(LS.nw0, LS.sw0, pts), EN = edge(LS.nn0, LS.nn1, pts);

  // --- roof: salmon concrete grid over the north-west two thirds of the main slab, the blue glass disc ---
  {
    const o = LS.sw0, t = E1.t.map((v, i) => (v + E3.t[i]) / 2), tl = Math.hypot(...t), T = [t[0] / tl, t[1] / tl], N = [-T[1], T[0]];
    // N points into the building? (frame: u along the 大仁街 face, v inwards)
    const inw = pointInPoly(o[0] + T[0] * 10 + N[0] * 5, o[1] + T[1] * 10 + N[1] * 5, pts) ? N : [-N[0], -N[1]];
    const P = (u, v) => [o[0] + T[0] * u + inw[0] * v, o[1] + T[1] * u + inw[1] * v];
    const inner = (x, z) => pointInPoly(x, z, pts) && [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].every(([dx, dz]) => pointInPoly(x + dx, z + dz, pts));
    const offDisc = (x, z) => Math.hypot(x - LS.disc[0], z - LS.disc[1]) > LS.discR + 0.5;
    const y0 = top - 0.05, y1 = top + 1.3, bw = 0.9;
    const run = (A, Bq) => { // beam pieces along A -> B where inside the roof and off the disc
      const l = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]), n = Math.ceil(l / 0.5);
      let s = null;
      const flush = (e) => { if (s && Math.hypot(e[0] - s[0], e[1] - s[1]) > 0.6) k.beam('salmon', [s[0], (y0 + y1) / 2, s[1]], [e[0], (y0 + y1) / 2, e[1]], bw, y1 - y0); s = null; };
      let last = null;
      for (let i = 0; i <= n; i++) {
        const p = [A[0] + (Bq[0] - A[0]) * i / n, A[1] + (Bq[1] - A[1]) * i / n];
        if (inner(...p) && offDisc(...p)) { if (!s) s = p; last = p; } else { if (s) flush(last); }
      }
      if (s) flush(last);
    };
    for (const u of [0.8, 6.8, 12.8, 18.8, 24.8, 30.8, 36.8]) run(P(u, 0.6), P(u, 13.2));
    for (const v of [0.8, 6.8, 12.6]) run(P(0.2, v), P(36.8, v));
    // disc: low drum of blue glass with parallel glazing bars on top and a white rim
    const [dx, dz] = LS.disc, r = LS.discR;
    k.cyl('discSide', dx, dz, r, top - 0.05, top + 1.0, 28);
    k.cyl('white', dx, dz, r + 0.25, top + 0.95, top + 1.2, 28, 0, Math.PI * 2, false);
    const g = new THREE.CircleGeometry(r - 0.05, 28); g.rotateX(-Math.PI / 2); g.translate(dx, top + 1.22, dz); k.add('discGlass', g);
  }

  // --- 大仁街 face: slanted balconies with dark louvres at the south-east end (stacked, every other floor shifted) ---
  for (let f = 1; f < 9; f++) {
    const y = B + f * FL, shift = f % 2 ? 2.2 : 0;
    for (const s0 of [0.8 + shift, 5.6 + shift]) {
      if (s0 + 3.4 > E3.len - 0.4) continue;
      const a = E3.P(s0, 0.05), c = E3.P(s0 + 3.4, 0.05), tip = E3.P(s0 + 3.4, 1.25);
      k.flat('offwhite', [a, c, tip], y + 0.02); k.flat('offwhite', [a, c, tip], y - 0.2, true);
      // slab edges
      k.beam('white', [a[0], y - 0.09, a[1]], [tip[0], y - 0.09, tip[1]], 0.12, 0.22);
      k.beam('white', [c[0], y - 0.09, c[1]], [tip[0], y - 0.09, tip[1]], 0.12, 0.22);
      // the louvre screen on the slanted side, white rail on the short side
      const mx = (a[0] + tip[0]) / 2, mz = (a[1] + tip[1]) / 2, sl = Math.hypot(tip[0] - a[0], tip[1] - a[1]);
      const sn = [-(tip[1] - a[1]) / sl, (tip[0] - a[0]) / sl], snn = (sn[0] * E3.n[0] + sn[1] * E3.n[1]) > 0 ? sn : [-sn[0], -sn[1]];
      k.plane('louvre', mx, mz, snn, sl, y + 0.05, y + 2.7, [1, 2.65]);
      k.beam('stainless', [c[0], y + 1.05, c[1]], [tip[0], y + 1.05, tip[1]], 0.05, 0.05);
    }
  }
  // glass-block window bands (2F-3F and 6F-7F) on the south-east part of the face
  for (const f0 of [1, 5]) for (const [E, s0, s1] of [[E2, 17, E2.len - 0.6], [E3, 0.6, E3.len - 1.0]]) {
    if (E === E3 && f0 === 5) continue;
    const y0 = B + f0 * FL + 0.5, y1 = B + (f0 + 2) * FL - 0.4;
    k.ebox('glassBlock', E, s0, s1, 0.02, 0.1, y0, y1, [1, 1]);
  }
  // west corner: red brick low wall (3 m) with mesh windows, set in front of the ground floor
  {
    k.ebox('brick', E1, 0.3, 9.6, 0.62, 0.86, B - 0.4, B + 3.0, [2, 1]);
    k.ebox('conc', E1, 0.2, 9.7, 0.55, 0.93, B + 3.0, B + 3.15, [2, 2]);
    for (const s of [2.2, 6.4]) k.ebox('mesh', E1, s, s + 2.2, 0.85, 0.88, B + 1.0, B + 2.5, [1, 1]);
    // the red door beside it
    k.ebox('redTile', E1, 10.2, 11.3, 0.62, 0.7, B, B + 2.3);
  }
  // west end: red semicircular balcony at 2F (black railing), glass blocks behind it, cobalt strips up the wall
  {
    const sC = EW.len - 2.8, [cx, cz] = EW.P(sC, 0), r = 2.1, y = B + FL;
    const phi = Math.atan2(EW.n[0], EW.n[1]), t0 = phi - Math.PI / 2;
    k.cyl('redTile', cx, cz, r, y - 0.3, y + 1.0, 20, t0, Math.PI, true);
    k.cyl('redTile', cx, cz, r - 0.15, y - 0.3, y + 1.0, 20, t0, Math.PI, true);
    k.cyl('redTile', cx, cz, r, y - 0.3, y, 20, t0, Math.PI, false);
    // black rail on top of the parapet, posts
    for (let i = 0; i <= 8; i++) { const a = t0 + Math.PI * i / 8, x = cx + Math.sin(a) * (r - 0.07), z = cz + Math.cos(a) * (r - 0.07); k.beam('black', [x, y + 1.0, z], [x, y + 1.55, z], 0.04, 0.04); }
    k.cyl('black', cx, cz, r - 0.05, y + 1.5, y + 1.56, 20, t0, Math.PI, true);
    k.ebox('glassBlock', EW, sC - 2.6, sC + 2.6, 0.02, 0.1, y + 1.0, y + FL - 0.3, [1, 1]);
    // the cobalt strips (narrow blue window panels from 2F to the roof) at the north end of the west wall
    for (const s of [1.4, 3.9]) k.ebox('blue', EW, s, s + 0.9, 0.0, 0.12, B + FL + 0.3, top - 0.6);
  }

  // --- north wing entrance: double-height opening, two white square columns with black caps, teal curtain band,
  // gold 「良善樓」, ramp along the wall (walkable; rail and its ends block) ---
  {
    const e = LS_ENT, yT = B + 2 * FL;
    k.ebox('recess', EN, e.s0, e.s1, 0.0, 0.05, B - 0.3, yT - 0.2);
    k.ebox('white', EN, e.s0 - 0.4, e.s1 + 0.4, 0.0, 0.45, yT - 0.35, yT + 0.05, [2, 2]);                 // lintel
    for (const s of [e.s0 + 1.6, e.s1 - 1.6]) {
      k.ebox('white', EN, s - 0.35, s + 0.35, 0.0, 0.42, B - 0.3, yT - 0.75, [1, 1]);
      k.ebox('black', EN, s - 0.4, s + 0.4, -0.02, 0.47, yT - 0.75, yT - 0.35);
    }
    // heights from the local ground (the building base B is the lowest point of the whole outline, ~1.1 m lower here)
    const R = LS_RAMP, w = R.w, rise = R.rise, steps = 3, sEnd = e.s1 + 0.2, sFoot = sEnd + 0.4 * steps;
    const gAt = (s) => H(...EN.P(s, w / 2));
    const G = Math.max(...[R.s0, (R.s0 + R.s1) / 2, R.s1, (R.s1 + sEnd) / 2, sEnd].map(gAt)), yL = G + rise;
    // glass doors (bright frames) in the recess
    for (let s = e.s0 + 2.5; s < e.s1 - 2.3; s += 1.2) k.ebox('stainless', EN, s, s + 0.06, 0.04, 0.08, B - 0.3, yL + 2.6);
    k.ebox('stainless', EN, e.s0 + 2.5, e.s1 - 2.4, 0.04, 0.08, yL + 2.55, yL + 2.65);
    // teal curtain wall band 3F-5F above it, gold letters at its foot
    k.ebox('teal', EN, e.s0 + 0.2, e.s1 - 0.2, 0.0, 0.1, yT + 0.1, yT + 3 * FL - 0.2, [1.5, FL]);
    const m = EN.P((e.s0 + e.s1) / 2, 0.5);
    sign(group, goldText('dmLsName', '良  善  樓', 1024, 256, 190), 4.6, 1.15, m[0], yT + 0.6, m[1], EN.n, 0.2);
    // ramp (west of the opening) rising along the wall, landing in front of the doors, steps down at the east end.
    // Only 0.9 m wide: the service road north of the wing runs 3-5 m off the wall (its kerb stays clear)
    const g0 = gAt(R.s0), yR = (s) => g0 + (yL - g0) * Math.max(0, Math.min(1, (s - R.s0) / (R.s1 - R.s0)));
    const deck = (s0, s1, hf) => {
      const poly = [EN.P(s0, 0.05), EN.P(s1, 0.05), EN.P(s1, w), EN.P(s0, w)];
      I.addSurface(poly, (x, z) => { const s = (x - EN.a[0]) * EN.t[0] + (z - EN.a[1]) * EN.t[1]; return Math.max(0.02, hf(s) - H(x, z)); });
    };
    deck(R.s0, R.s1, yR); deck(R.s1, sEnd, () => yL);
    const gF = gAt(sFoot);
    for (let i = 0; i < steps; i++) {
      const s0 = sEnd + i * 0.4, h = gF + (yL - gF) * (steps - i) / (steps + 1);
      deck(s0, s0 + 0.4, () => h); k.ebox('stone', EN, s0, s0 + 0.4, 0.05, w, Math.min(h, gAt(s0 + 0.2)) - 0.4, h);
    }
    // the ramp slab: a sloped box from s0 to s1 and the flat landing
    const sl = (s) => EN.P(s, w / 2);
    { const a = sl(R.s0), c = sl(R.s1); k.beam('stone', [a[0], g0 - 0.2, a[1]], [c[0], yL - 0.2, c[1]], w - 0.1, 0.42); }
    k.ebox('stone', EN, R.s1, sEnd, 0.05, w, G - 0.4, yL);
    // stainless rail along the outer edge of ramp + landing (it blocks there; the steps at the east end stay open)
    const rA = EN.P(R.s0, w - 0.05), rB = EN.P(R.s1, w - 0.05), rC = EN.P(sEnd, w - 0.05);
    k.beam('stainless', [rA[0], g0 + 0.9, rA[1]], [rB[0], yL + 0.9, rB[1]], 0.05, 0.05);
    k.beam('stainless', [rB[0], yL + 0.9, rB[1]], [rC[0], yL + 0.9, rC[1]], 0.05, 0.05);
    for (let s = R.s0; s <= sEnd + 0.01; s += 1.5) { const p = EN.P(s, w - 0.05), y = s <= R.s1 ? yR(s) : yL; k.beam('stainless', [p[0], y, p[1]], [p[0], y + 0.92, p[1]], 0.05, 0.05); }
    I.addWall(rA[0], rA[1], rC[0], rC[1], -1, 2.2);
  }
}

// ---------------- 恩慈樓 ----------------
function buildEnci(I, k, group, b) {
  const pts = b.pts, B = Number.isFinite(b.base) ? b.base : H(...EC.s1), top = B + EC_TOP;
  const S = edge(EC.s0, EC.s1, pts), N = edge(EC.n0, EC.n1, pts);
  // --- south stair tower: dark glass between white piers, one storey over the roof, orange-brown sloped cap ---
  {
    const T = EC_TOWER, y0 = Math.min(H(...S.P(T.s0, T.out)), H(...S.P(T.s1, T.out))) - 0.4, yt = top + FL;
    k.ebox('towerGlass', S, T.s0 + 0.6, T.s1 - 0.6, -T.back, T.out - 0.1, y0, yt, [2.75, FL]);
    for (const [s0, s1] of [[T.s0, T.s0 + 0.7], [T.s1 - 0.7, T.s1]]) k.ebox('white', S, s0, s1, -T.back, T.out, y0, yt + 0.3, [1, 1]);
    // side faces: white render in the back half where the tower meets the slab
    k.ebox('concLight', S, T.s0 + 0.55, T.s1 - 0.55, -T.back, 0.6, y0, yt, [2, 2]);
    // sloped cap (rises towards the slab)
    const c0 = S.P(T.s0 - 0.2, T.out + 0.2), c1 = S.P(T.s1 + 0.2, T.out + 0.2), c2 = S.P(T.s1 + 0.2, -T.back - 0.2), c3 = S.P(T.s0 - 0.2, -T.back - 0.2);
    const yA = yt + 0.3, yB = yt + 1.6;
    const g = new THREE.BufferGeometry(), P = (p, y) => [p[0], y, p[1]];
    const v = [...P(c0, yA), ...P(c1, yA), ...P(c2, yB), ...P(c0, yA), ...P(c2, yB), ...P(c3, yB)];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const a = g.attributes.position.array; for (const i of [0, 3]) for (let q = 0; q < 3; q++) { const t = a[(i + 1) * 3 + q]; a[(i + 1) * 3 + q] = a[(i + 2) * 3 + q]; a[(i + 2) * 3 + q] = t; } g.computeVertexNormals(); }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2));
    k.add('orangeCap', g);
    // cap fascia
    k.ebox('orangeCap', S, T.s0 - 0.2, T.s1 + 0.2, T.out - 0.1, T.out + 0.2, yt, yA + 0.05);
    for (const s of [T.s0 - 0.2, T.s1 + 0.05]) {
      const q0 = S.P(s, T.out + 0.2), q1 = S.P(s, -T.back - 0.2);
      k.beam('orangeCap', [q0[0], yA - 0.15, q0[1]], [q1[0], yB - 0.15, q1[1]], 0.15, 0.4);
    }
    // the tower is solid from the ground up: block the part outside the slab
    const r = [S.P(T.s0, 0), S.P(T.s0, T.out), S.P(T.s1, T.out), S.P(T.s1, 0)];
    for (let i = 0; i < 3; i++) I.addWall(r[i][0], r[i][1], r[i + 1][0], r[i + 1][1], -2, 40);
  }
  // --- north entrance (Google 街景 2017-09 高解析, from the north path): a double-height colonnade of four big square
  // piers under the projecting middle block, the 1F lobby doors and the 2F windows behind, 「恩慈樓」 in dark letters on
  // the ochre band between them, a blue soffit, six wide steps between low concrete cheek walls with steel rails ---
  {
    const e = EC_ENT, s0 = e.s - e.w / 2, s1 = e.s + e.w / 2, yT = B + 2 * FL, dep = 0.9;
    // the steps start from the local ground (B is the lowest point of the whole outline, ~0.6 m lower here)
    const G = Math.max(...[s0, e.s, s1].flatMap(s => [0.3, e.d].map(o => H(...N.P(s, o))))), yR = G + e.steps * e.rise;
    k.ebox('recess', N, s0 + 0.4, s1 - 0.4, 0.0, 0.1, B - 0.3, yT - 0.4);
    // lobby doors (1F) and the 2F windows: stainless mullions and transoms
    for (let s = s0 + 1.4; s < s1 - 1.2; s += 1.5) k.ebox('stainless', N, s, s + 0.06, 0.1, 0.14, yR, yT - 0.5);
    for (const y of [yR + 2.6, yR + 3.7]) k.ebox('stainless', N, s0 + 1.0, s1 - 1.0, 0.1, 0.14, y, y + 0.08);
    // the ochre band with the name between the doors and the 2F windows
    k.ebox('ochre', N, s0 + 0.9, s1 - 0.9, 0.1, 0.16, yR + 2.68, yR + 3.62);
    const m = N.P(e.s, 0.18);
    sign(group, nameBand(), 4.2, 0.82, m[0], yR + 3.15, m[1], N.n, 0.05);
    // the blue soffit under the projecting middle block, the four piers
    k.ebox('soffitBlue', N, s0, s1, 0.0, dep, yT - 0.55, yT - 0.3);
    for (const s of [s0 + 0.5, e.s - 1.9, e.s + 1.9, s1 - 0.5]) {
      const w = s === s0 + 0.5 || s === s1 - 0.5 ? 0.5 : 0.42;
      k.ebox('concLight', N, s - w, s + w, 0.0, dep, B - 0.3, yT - 0.3, [1, 1]);
      // three outer faces (the face against the building wall is left out)
      const c = [N.P(s - w, 0), N.P(s - w, dep), N.P(s + w, dep), N.P(s + w, 0)];
      for (let i = 0; i < 3; i++) I.addWall(c[i][0], c[i][1], c[i + 1][0], c[i + 1][1], -1, 7);
    }
    for (let s = s0 + 1.2; s < s1 - 1; s += 2.4) { const p = N.P(s, dep / 2); k.cyl('lamp', p[0], p[1], 0.14, yT - 0.57, yT - 0.55, 8); }
    // landing and steps (walkable): the landing under the colonnade, then e.steps steps of 0.35 m out to e.d
    const d0 = e.d - e.steps * 0.35;
    I.addSurface([N.P(s0, 0.05), N.P(s1, 0.05), N.P(s1, d0), N.P(s0, d0)], (x, z) => Math.max(0.02, yR - H(x, z)));
    k.ebox('stone', N, s0, s1, 0.05, d0, B - 0.5, yR);
    for (let i = 0; i < e.steps; i++) {
      const oa = d0 + i * 0.35, ob = oa + 0.35, h = G + e.rise * (e.steps - 1 - i);
      if (i < e.steps - 1) I.addSurface([N.P(s0, oa), N.P(s1, oa), N.P(s1, ob), N.P(s0, ob)], (x, z) => Math.max(0.02, h - H(x, z)));
      k.ebox('stone', N, s0, s1, oa, ob, B - 0.5, h);
    }
    // low concrete cheek walls at both ends of the steps, a level stainless rail on each (the walls are flat-topped)
    // and one down the middle along the steps
    for (const [a, b2] of [[s0 - 0.35, s0], [s1, s1 + 0.35]]) {
      k.ebox('concLight', N, a, b2, 0.05, e.d, G - 0.4, yR + 0.25, [1, 1]);
      const c = [N.P(a, 0.05), N.P(a, e.d), N.P(b2, e.d), N.P(b2, 0.05)];
      // up to the rail tops (like the ramp rails): someone on the landing (0.9 m up) must not walk through
      for (let i = 0; i < 3; i++) I.addWall(c[i][0], c[i][1], c[i + 1][0], c[i + 1][1], -1, 2.2);
    }
    for (const s of [s0 - 0.17, e.s, s1 + 0.17]) {
      const a = N.P(s, 0.3), c = N.P(s, e.d - 0.1), lo = s === e.s ? G : yR + 0.25, hi = s === e.s ? yR : yR + 0.25;
      k.beam('stainless', [a[0], hi + 0.9, a[1]], [c[0], lo + 0.9, c[1]], 0.05, 0.05);
      for (const [o, y] of [[0.3, hi], [e.d - 0.1, lo]]) { const p = N.P(s, o); k.beam('stainless', [p[0], y, p[1]], [p[0], y + 0.92, p[1]], 0.05, 0.05); }
    }
  }
  // --- roof (NLSC 2024 正射): the north wing (8F) carries a box with a pale green top near its east end; the
  // connecting block / south wing roof (10F) a block of round cooling towers by the connecting block and a white plant
  // room at the west end. Only drawn where the whole item sits on the right roof ---
  {
    const parts = b.parts || [{ pts, h: EC_TOP }, { pts, h: EC_TOP }];
    const onRoof = (P, cs) => cs.every(([x, z]) => pointInPoly(x, z, P.pts) && [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].every(([dx, dz]) => pointInPoly(x + dx, z + dz, P.pts)));
    const north = parts.find(p => p.floors === 8) || parts[0], south = parts.find(p => p.floors !== 8) || parts[1];
    const yN = B + north.h, yS = B + south.h;
    {
      const sC = 47, oC = -4.2, cs = [N.P(sC - 2, oC - 2), N.P(sC + 2, oC - 2), N.P(sC + 2, oC + 2), N.P(sC - 2, oC + 2)];
      if (onRoof(north, cs)) { k.ebox('concLight', N, sC - 2, sC + 2, oC - 2, oC + 2, yN - 0.1, yN + 2.4, [2, 2]); k.ebox('greenTop', N, sC - 1.9, sC + 1.9, oC - 1.9, oC + 1.9, yN + 2.4, yN + 2.5); }
    }
    for (let s = 19; s <= 28.1; s += 3) for (const o of [-10.5, -13.5]) {
      const [x, z] = S.P(s, o);
      if (!onRoof(south, [[x - 1.1, z - 1.1], [x + 1.1, z + 1.1], [x - 1.1, z + 1.1], [x + 1.1, z - 1.1]])) continue;
      k.cyl('coolTower', x, z, 1.05, yS - 0.1, yS + 1.7, 14); k.cyl('black', x, z, 0.85, yS + 1.7, yS + 1.85, 14);
    }
    {
      const cs = [S.P(36, -5), S.P(42, -5), S.P(42, -9), S.P(36, -9)];
      if (onRoof(south, cs)) k.ebox('white', S, 36, 42, -9, -5, yS - 0.1, yS + 2.6, [2, 2]);
    }
  }
}

// ---------------- boundary wall (re-skinned OSM wall), A2 gate wall, 恩慈小門 ----------------
const WALL_H = 2.8, PIER = 6.0;
const A2_FROM = [-62.0, 271.0], A2_LEN = 13.0;  // the A2 low wall runs from the start of the OSM wall
function buildWall(I, k, group, data) {
  const segs = data.wallSkins || [];
  if (!segs.length) return;
  // street side: towards 大仁街 / 大仁二街
  const roadPts = [];
  for (const r of data.roads) if (r.name === '大仁街' || r.name === '大仁二街') for (let i = 0; i < r.pts.length - 1; i++) roadPts.push([r.pts[i], r.pts[i + 1]]);
  const dRoad = (x, z) => { let m = Infinity; for (const [a, c] of roadPts) { const dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return m; };
  // distance along the wall from its start (A2 end), for the A2 stretch
  const along = (x, z) => Math.hypot(x - A2_FROM[0], z - A2_FROM[1]);
  let gi = 0, a2Done = false;
  for (const sg of segs) {
    const { ax, az, bx, bz } = sg, l = Math.hypot(bx - ax, bz - az); if (l < 0.05) continue;
    const t = [(bx - ax) / l, (bz - az) / l];
    let n = [t[1], -t[0]];
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (dRoad(mx + n[0] * 2, mz + n[1] * 2) > dRoad(mx - n[0] * 2, mz - n[1] * 2)) n = [-n[0], -n[1]];
    const E = { a: [ax, az], t, n, ang: Math.atan2(t[1], t[0]), P: (s, o = 0) => [ax + t[0] * s + n[0] * o, az + t[1] * s + n[1] * o] };
    const ya = Math.min(sg.ya, sg.yb), yTop = Math.max(sg.ya, sg.yb) + WALL_H;
    if (gi === 0 && !a2Done && along(ax, az) < A2_LEN) {
      // A2 gate: low granite wall (1.3 m) with a black railing over it to the brick wall's height
      k.ebox('granite', E, 0, l, -0.25, 0.25, ya - 0.4, ya + 1.3, [2, 2]);
      k.ebox('granite', E, -0.02, l + 0.02, -0.3, 0.3, ya + 1.3, ya + 1.42, [2, 2]);
      k.beam('black', [ax, ya + 2.5, az], [bx, ya + 2.5, bz], 0.06, 0.06);
      for (let s = 0; s <= l + 0.01; s += 0.15) { const p = E.P(Math.min(s, l), 0); k.beam('black', [p[0], ya + 1.42, p[1]], [p[0], ya + 2.5, p[1]], 0.03, 0.03); }
      a2Done = true;
      { // the name panel on the street side
        const p = E.P(l / 2, 0.27);
        const pw = Math.min(10.5, l - 1);
        k.ebox('black', E, l / 2 - pw / 2 - 0.05, l / 2 + pw / 2 + 0.05, 0.24, 0.27, ya + 0.15, ya + 1.25);
        sign(group, a2Tex(), pw, Math.min(1.05, pw * 0.125), p[0] + n[0] * 0.01, ya + 0.7, p[1] + n[1] * 0.01, n, 0.12);
      }
      gi++;
      continue;
    }
    // brick wall with grey concrete cap, piers every ~6 m (and at the ends), razor wire on brackets, graffiti
    k.ebox('brick', E, 0, l, -0.12, 0.12, ya - 0.4, yTop, [2, 1]);
    k.ebox('conc', E, -0.02, l + 0.02, -0.17, 0.17, yTop, yTop + 0.12, [2, 2]);
    const np = Math.max(1, Math.round(l / PIER));
    for (let i = 0; i <= np; i++) {
      if (i === 0 && !sg.first && gi > 0) continue;
      const s = Math.min(l - 0.22, Math.max(0.22, l * i / np));
      k.ebox('conc', E, s - 0.22, s + 0.22, -0.22, 0.22, ya - 0.4, yTop + 0.2, [1, 2]);
      // bracket leaning to the street and its two wires
      const p = E.P(s, 0), q = E.P(s, 0.45);
      k.beam('steel', [p[0], yTop + 0.1, p[1]], [q[0], yTop + 0.85, q[1]], 0.05, 0.05);
    }
    // the coil: two crossed planes on top, leaning out
    const c = E.P(l / 2, 0.25), cn = n;
    k.plane('wire', c[0], c[1], cn, l, yTop + 0.15, yTop + 0.9, [1.6, 0.75]);
    const tilt = E.P(l / 2, 0.45);
    k.plane('wire', tilt[0], tilt[1], cn, l, yTop + 0.35, yTop + 1.0, [1.3, 0.65]);
    // graffiti on the street side (most bays, a panel each ~3 m)
    for (let s = 0.3; s + 2.6 < l; s += 3.0) {
      const h = (gi * 7 + Math.round(s * 13)) % 11;
      if (h < 2) continue;
      const p = E.P(s + 1.3, 0.125), u = (h % 4) / 4;
      k.plane('graffiti', p[0], p[1], n, 2.8, ya + 0.15, ya + 0.15 + Math.min(2.4, WALL_H - 0.2), null, [u, u + 0.25]);
    }
    gi++;
  }
  // the parking banner on the 大仁二街 stretch (near the gate)
  {
    let best = null, bd = Infinity;
    for (const sg of segs) { const mx = (sg.ax + sg.bx) / 2, mz = (sg.az + sg.bz) / 2, d = Math.hypot(mx - 48, mz - 318); if (d < bd && Math.hypot(sg.bx - sg.ax, sg.bz - sg.az) > 5) { bd = d; best = sg; } }
    if (best && bd < 15) {
      const l = Math.hypot(best.bx - best.ax, best.bz - best.az), t = [(best.bx - best.ax) / l, (best.bz - best.az) / l];
      let n = [t[1], -t[0]]; const mx = (best.ax + best.bx) / 2, mz = (best.az + best.bz) / 2;
      if (dRoad(mx + n[0] * 2, mz + n[1] * 2) > dRoad(mx - n[0] * 2, mz - n[1] * 2)) n = [-n[0], -n[1]];
      sign(group, bannerTex(), 4.2, 0.8, mx + n[0] * 0.16, Math.min(best.ya, best.yb) + 1.7, mz + n[1] * 0.16, n, 0.05);
    }
  }
}
// 恩慈小門: brick piers at both sides of the campus road, two red-and-white booms (raised: traffic and the player
// pass), the yellow ticket box on the inbound side
function buildEnciGate(I, k, data) {
  const g = data.pois.find(p => p.name === '恩慈小門') || { x: 75.7, z: 290 };
  // the campus road through the gate
  let best = null, bd = Infinity;
  for (const r of data.roads) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], c = r.pts[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const tt = Math.max(0, Math.min(1, ((g.x - a[0]) * dx + (g.z - a[1]) * dz) / l2)), d = Math.hypot(g.x - a[0] - dx * tt, g.z - a[1] - dz * tt);
    if (r.name !== '大仁二街' && r.name !== '環中東路708巷' && d < bd) { bd = d; best = { a, c, w: r.w || 5 }; }
  }
  if (!best || bd > 6) return;
  const l = Math.hypot(best.c[0] - best.a[0], best.c[1] - best.a[1]), t = [(best.c[0] - best.a[0]) / l, (best.c[1] - best.a[1]) / l], n = [-t[1], t[0]];
  // gate line 4 m into the campus road from the gate POI (the corner where it leaves 大仁二街's side road)
  const end = Math.hypot(best.a[0] - g.x, best.a[1] - g.z) < Math.hypot(best.c[0] - g.x, best.c[1] - g.z) ? best.a : best.c, dir = end === best.a ? t : [-t[0], -t[1]];
  const o = [end[0] + dir[0] * 4, end[1] + dir[1] * 4], hw = best.w / 2 + 0.6;
  const E = { a: o, t: n, n: dir, ang: Math.atan2(n[1], n[0]), P: (s, off = 0) => [o[0] + n[0] * s + dir[0] * off, o[1] + n[1] * s + dir[1] * off] };
  const y = groundY(o[0], o[1]);
  // brick piers just outside the walkers' strip along the road (src/entities/NPC.js walks people up to ~w/2 + 1.4 m off its centre)
  const sp = best.w / 2 + 1.8;
  for (const s of [-sp, sp]) {
    k.ebox('brick', E, s - 0.35, s + 0.35, -0.35, 0.35, y - 0.4, y + 2.2, [1, 1]);
    k.ebox('conc', E, s - 0.42, s + 0.42, -0.42, 0.42, y + 2.2, y + 2.35, [1, 1]);
    const c = [E.P(s - 0.35, -0.35), E.P(s + 0.35, -0.35), E.P(s + 0.35, 0.35), E.P(s - 0.35, 0.35)];
    for (let i = 0; i < 4; i++) I.addWall(c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], -1, 3);
  }
  // ticket box and boom posts at both sides; arms raised (about 80°)
  for (const [s, side] of [[-hw + 0.35, 1], [hw - 0.35, -1]]) {
    const p = E.P(s, 0.9);
    k.ebox('yellow', E, s - 0.25, s + 0.25, 0.6, 1.2, y - 0.1, y + 1.1);
    k.ebox('black', E, s - 0.27, s + 0.27, 0.58, 1.22, y + 1.1, y + 1.16);
    const a0 = [p[0], y + 1.0, p[1]], tip = E.P(s + side * 0.6, 0.9);
    k.beam('boom', a0, [tip[0], y + 1.0 + 3.2, tip[1]], 0.08, 0.08);
  }
  // the reader on the inbound side
  k.ebox('steel', E, -hw + 0.2, -hw + 0.5, -1.5, -1.3, y - 0.1, y + 1.2);
}

export function buildDorms(I, scene, data) {
  const group = new THREE.Group(); group.matrixAutoUpdate = false;
  const k = new Acc();
  const ls = data.buildings.find(q => q.id === LIANGSHAN_ID), ec = data.buildings.find(q => q.id === ENCI_ID);
  if (ls) buildLiangshan(I, k, group, ls);
  if (ec) buildEnci(I, k, group, ec);
  buildWall(I, k, group, data);
  buildEnciGate(I, k, data);
  k.finish(group);
  scene.add(group);
  I.dorms = { group };
  return group;
}
