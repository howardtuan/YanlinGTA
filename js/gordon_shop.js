// 戈登肉鋪 Gordon Meat Shop（校史館西南側草坪上，可以進去）。從 js/interiors.js 原封不動搬出來；js/zones.js 決定建造順序。
import * as THREE from 'three';
import { H } from './terrain.js';
import { ctex, MATS, M, Kit, lcg, YHT } from './kit.js';

// =====================================================================
// 戈登肉鋪 Gordon Meat Shop: 一層樓的獨棟店面，蓋在校史館西南側、緊鄰校史館的那片椰子樹草坪上（不是鐘塔那片大草坪），
// 店門面向草坪外的校內道路，門口一條步道接到路邊；不佔用任何原本的街屋。
// 1F 照使用者給的店內照片：黑色招牌（金色 Gordon＋牛頭、白字戈登肉鋪、MEAT·SHOP），整面玻璃落地窗與玻璃門；
// 店內是原木條天花板＋軌道投射燈、右手邊一整面直條木格柵後面藏著波浪形的暖光燈條、
// 黑色臥式冷凍櫃（中間兩台並排一島、右牆兩台、左前一台）、直立冷藏展示櫃、
// 最裡面是白色大理石櫃台（Gordon 字樣）、深色木紋背牆、金色酒櫃，左後方是上 2 樓的樓梯（不開放）。
// Local frame: x along the shop front, z into the shop (0 = glass front); u = W - x is measured from the
// RIGHT wall as you walk in (the LED wave wall), so the layout reads like the photos.
// =====================================================================
// The lawn is the OSM grass (-113,63) (-90,71) (-102,105) (-126,97) between 校史館 and the road (-83,67)-(-115,55).
// origin = the front's west corner; +x runs along the lawn's road edge (ENE), +z into the lawn (toward 維澈樓).
// The glass front stands 3 m inside the lawn edge, centred on it. The ground rises ~0.35 m to the back, so the
// floor sits at the highest corner (buildGordon). PATH: length of the walk from the door to the road.
export const GD_SPEC = { ox: -107.11, oz: 68.22, ang: Math.atan2(0.3285, 0.9446), W: 9.78, D: 17.42, NF: 1, FH: 3.42, PATH: 5.4 };
export function gordonOutline() {
  const { ox, oz, ang, W, D } = GD_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(0, 0), w(W, 0), w(W, D), w(0, D)];
}
export function gordonFootprint() { // + the paving in front of the glass and the walk to the road, 1 m spare round it
  const { ox, oz, ang, W, D, PATH } = GD_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(-1, -1.4 - PATH), w(W + 1, -1.4 - PATH), w(W + 1, D + 1), w(-1, D + 1)];
}
const GDT = {
  oak: () => ctex('gdOak', 256, 256, (g) => { // pale grey-oak plank floor (photos 2-5)
    g.fillStyle = '#cfc6b8'; g.fillRect(0, 0, 256, 256); const r = lcg(21);
    for (let y = 0; y < 256; y += 32) {
      const v = 196 + (r() * 22 | 0); g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(0, y, 256, 31);
      for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(120,100,80,${0.06 + r() * 0.08})`; g.lineWidth = 1; g.beginPath(); const yy = y + 3 + r() * 26; g.moveTo(0, yy); g.bezierCurveTo(80, yy + (r() - 0.5) * 6, 170, yy + (r() - 0.5) * 6, 256, yy); g.stroke(); }
      g.fillStyle = 'rgba(80,70,60,0.35)'; g.fillRect(0, y + 31, 256, 1); g.fillRect((r() * 256) | 0, y, 1, 31);
    }
  }),
  pine: () => ctex('gdPine', 128, 256, (g) => { // honey pine of the ceiling and the slats
    g.fillStyle = '#d9a866'; g.fillRect(0, 0, 128, 256); const r = lcg(23);
    for (let i = 0; i < 30; i++) { const x = r() * 128; g.strokeStyle = `rgba(${150 + r() * 40 | 0},${90 + r() * 30 | 0},40,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 20, 90, x + (r() - 0.5) * 20, 170, x + (r() - 0.5) * 14, 256); g.stroke(); }
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(120,70,30,0.35)'; g.beginPath(); g.ellipse(r() * 128, r() * 256, 4 + r() * 4, 2 + r() * 3, 0, 0, 7); g.fill(); }
  }),
  // the wall behind the slats: warm wood with the glowing wave of LED strip (photos 3 and 4)
  wave: () => ctex('gdWave', 1024, 256, (g, w, h) => {
    g.fillStyle = '#7a4f2a'; g.fillRect(0, 0, w, h);
    const r = lcg(29); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(90,50,20,${0.05 + r() * 0.08})`; g.fillRect(r() * w, 0, 1 + r() * 3, h); }
    const wave = (yy, amp, ph) => { g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = yy + Math.sin(x / w * Math.PI * 4 + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
    g.strokeStyle = 'rgba(255,190,100,0.3)'; g.lineWidth = 44; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = 'rgba(255,200,110,0.45)'; g.lineWidth = 24; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = 'rgba(255,214,140,0.7)'; g.lineWidth = 10; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = '#fff3cf'; g.lineWidth = 3; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = 'rgba(255,214,140,0.5)'; g.lineWidth = 8; wave(h * 0.62, h * 0.1, 2.2);
    g.strokeStyle = '#fff3cf'; g.lineWidth = 2; wave(h * 0.62, h * 0.1, 2.2);
  }, false),
  marble: () => ctex('gdMarble', 256, 128, (g, w, h) => { // white marble with grey veins (counter)
    g.fillStyle = '#ecebe7'; g.fillRect(0, 0, w, h); const r = lcg(31);
    for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(110,110,110,${0.15 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.3) * 60; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  }),
  darkWood: () => ctex('gdDarkWood', 256, 256, (g, w, h) => { // glossy dark walnut panels behind the counter
    g.fillStyle = '#4a3324'; g.fillRect(0, 0, w, h); const r = lcg(37);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(${30 + r() * 40 | 0},${18 + r() * 24 | 0},10,${0.25 + r() * 0.3})`; g.fillRect(0, y, w, 1 + (r() * 2 | 0)); }
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
  }),
  blackMarble: () => ctex('gdBlackMarble', 128, 256, (g, w, h) => {
    g.fillStyle = '#1a1b1d'; g.fillRect(0, 0, w, h); const r = lcg(41);
    for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(220,220,220,${0.1 + r() * 0.2})`; g.lineWidth = 0.5 + r(); g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 50; y += r() * 50; g.lineTo(x, y); } g.stroke(); }
  }),
  // shop sign: black glossy box, gold "Gordon" with a bull's head, white 戈登肉鋪 and — MEAT·SHOP —
  fascia: () => ctex('gdFascia', 2048, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a2a2c'); bg.addColorStop(0.5, '#0d0d0f'); bg.addColorStop(1, '#1d1d20'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < w; x += 9) g.fillRect(x, 0, 2, h);
    const gold = g.createLinearGradient(0, 40, 0, 200); gold.addColorStop(0, '#f6dc94'); gold.addColorStop(1, '#b9913f');
    g.fillStyle = gold; g.textBaseline = 'middle'; g.font = '700 118px Georgia,"Times New Roman",serif'; g.fillText('Gordon', 360, 138);
    gdBull(g, 360 + g.measureText('Gordon').width + 6, 66, 1.05, gold); // the bull's head right after the word
    g.fillStyle = '#f4f2ee'; g.font = '900 104px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('戈 登 肉 鋪', 1000, 112);
    g.font = '600 34px Georgia,serif'; g.fillText('M E A T · S H O P', 1080, 196); g.fillRect(1000, 194, 64, 3); g.fillRect(1420, 194, 64, 3);
    g.font = '700 40px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('中原店', 1700, 200);
  }, false),
  // the "Gordon / MEAT·SHOP" on the counter front and the window decal
  logo: (dark) => ctex('gdLogo' + (dark ? 'D' : 'L'), 512, 192, (g, w, h) => {
    g.clearRect(0, 0, w, h); const c = dark ? '#2a2420' : '#f4f2ee';
    g.fillStyle = c; g.textBaseline = 'middle'; g.font = '700 96px Georgia,"Times New Roman",serif'; g.fillText('Gordon', 30, 92);
    gdBull(g, 30 + g.measureText('Gordon').width + 4, 26, 0.85, c);
    g.font = '600 26px Georgia,serif'; g.fillText('— M E A T · S H O P —', 95, 160);
  }, false),
  // the TV in the window: braised beef rib (photo 1, 喜歡充滿油脂熱湯的朋友一定要買 牛肋條)
  tv: () => ctex('gdTV', 512, 288, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#3a1d14'); bg.addColorStop(1, '#120a08'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8402a'; g.beginPath(); g.ellipse(170, 120, 150, 96, 0, 0, 7); g.fill();
    g.fillStyle = '#efe6d8'; g.beginPath(); g.ellipse(170, 112, 126, 76, 0, 0, 7); g.fill();
    const r = lcg(43); for (let i = 0; i < 16; i++) { g.fillStyle = ['#7a2a1a', '#9a3a22', '#5e1d12'][i % 3]; g.save(); g.translate(90 + r() * 160, 70 + r() * 80); g.rotate(r() * 3); g.fillRect(-20, -11, 40, 22); g.restore(); }
    g.fillStyle = '#fff'; g.font = '700 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('喜歡油脂豐富熱湯的朋友', 24, 250);
    g.fillStyle = '#d26bff'; g.font = '900 40px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('牛肋條', 360, 248);
  }, false),
  zone: (t) => ctex('gdZone' + t, 256, 72, (g, w, h) => { // red/black category signs over the freezers
    g.fillStyle = '#141414'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3202a'; g.fillRect(0, 0, 14, h);
    g.fillStyle = '#fff'; g.font = '900 40px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textBaseline = 'middle'; g.fillText(t, 30, h / 2 + 2);
  }, false),
  // sign stand outside the door: 快閃店（廣告專區）
  popup: () => ctex('gdPopup', 384, 512, (g, w, h) => {
    g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    g.strokeStyle = '#c9a24e'; g.lineWidth = 6; g.strokeRect(22, 34, w - 44, h - 68);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#b3202a'; g.font = '900 30px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('POP-UP STORE', w / 2, 92);
    g.fillStyle = '#111'; g.font = '900 104px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText('快閃店', w / 2, 220);
    g.fillStyle = '#c9a24e'; g.fillRect(70, 292, w - 140, 4);
    g.fillStyle = '#333'; g.font = '800 46px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('（廣告專區）', w / 2, 350);
    g.fillStyle = '#777'; g.font = '700 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('戈登肉鋪 Gordon Meat Shop', w / 2, 430);
  }, false),
  cut: () => ctex('gdCut', 256, 256, (g, w, h) => { // 代切 board by the door
    g.fillStyle = '#121212'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8c49a'; g.lineWidth = 4; g.beginPath(); g.arc(128, 104, 66, 0, 7); g.stroke();
    g.fillStyle = '#f2efe8'; g.font = '900 78px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('代切', 128, 106);
    g.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('火鍋・燒烤・牛排客製厚度', 128, 212);
  }, false),
  meat: () => ctex('gdMeat', 256, 128, (g, w, h) => { // vacuum packs seen through the freezer glass
    g.fillStyle = '#e9edf1'; g.fillRect(0, 0, w, h); const r = lcg(47);
    for (let y = 4; y < h; y += 30) for (let x = 4; x < w; x += 44) {
      const c = ['#a8323a', '#c4505a', '#8a262e', '#b8434a', '#d9a6a0', '#9aa3ad'][(r() * 6) | 0];
      g.fillStyle = '#1b1b1b'; g.fillRect(x, y, 40, 26); g.fillStyle = c; g.fillRect(x + 3, y + 3, 34, 18);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 3, y + 3, 34, 3); g.fillStyle = '#f3f0e6'; g.fillRect(x + 26, y + 15, 10, 8);
    }
  }),
};
// little gold bull's head (the Gordon logo): horns, ears, a curled forelock
function gdBull(g, x, y, s, fill) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = fill; g.strokeStyle = fill; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(30, 40); g.quadraticCurveTo(-4, 34, 6, 0); g.stroke();
  g.beginPath(); g.moveTo(90, 40); g.quadraticCurveTo(124, 34, 114, 0); g.stroke();
  g.beginPath(); g.moveTo(30, 40); g.quadraticCurveTo(60, 24, 90, 40); g.quadraticCurveTo(96, 80, 74, 108); g.quadraticCurveTo(60, 118, 46, 108); g.quadraticCurveTo(24, 80, 30, 40); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(60, 62, 12, 0, 7); g.fill(); g.fillStyle = fill; g.beginPath(); g.arc(60, 62, 6, 0, 7); g.fill();
  g.restore();
}
export function buildGordon(I, scene) {
  const S = GD_SPEC, W = S.W, D = S.D, F = S.FH, top = Math.max(F * S.NF, F + 1.3), CH = 3.25; // top: roof over the sign box; CH: shop ceiling
  const k = new Kit(I, S.ox, S.oz, S.ang);
  // floor level = the highest ground under the shop, so the lawn never pokes through the floor
  k.base = Math.max(...[[0, 0], [W, 0], [W, D], [0, D], [W / 2, D / 2]].map(([x, z]) => H(...k.w(x, z)))) + 0.02; k.group.position.y = k.base;
  const base = k.base;
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set('#fff4e0'); m.emissiveMap = o.map || null; if (!o.map) m.emissive.set(o.color); m.emissiveIntensity = lift; }
    return m;
  };
  const MT = {
    oak: def('gdOak', () => std({ map: GDT.oak(), roughness: 0.45 }, 0.3)),
    pine: def('gdPine', () => std({ map: GDT.pine(), roughness: 0.6 }, 0.35)),
    wave: def('gdWave', () => std({ map: GDT.wave(), emissive: '#ffffff', emissiveMap: GDT.wave(), emissiveIntensity: 0.75 })),
    marble: def('gdMarble', () => std({ map: GDT.marble(), roughness: 0.25 }, 0.3)),
    dark: def('gdDark', () => std({ map: GDT.darkWood(), roughness: 0.2, metalness: 0.1 }, 0.12)),
    bmarble: def('gdBMarble', () => std({ map: GDT.blackMarble(), roughness: 0.2 })),
    black: def('gdBlack', () => std({ color: '#26272b', roughness: 0.5 }, 0.05)),
    rim: def('gdRim', () => std({ color: '#b4b6ba', metalness: 0.6, roughness: 0.35 })),
    white: def('gdWhite', () => std({ color: '#f3f2ee' }, 0.35)),
    meat: def('gdMeatM', () => std({ map: GDT.meat(), roughness: 0.4 }, 0.6)),
    led: def('gdLed', () => new THREE.MeshStandardMaterial({ color: '#5a7bff', emissive: '#4f74ff', emissiveIntensity: 1.6 })),
    warm: def('gdWarm', () => new THREE.MeshStandardMaterial({ color: '#fff2d6', emissive: '#ffd89a', emissiveIntensity: 1.3 })),
    gold: def('gdGold', () => std({ color: '#c9a24e', metalness: 0.8, roughness: 0.3 })),
    stair: def('gdStair', () => std({ color: '#8f8e8a', roughness: 0.75 }, 0.15)),
    plaster: def('gdPlaster', () => std({ color: '#ebe8e1' }, 0.3)),
    facade: def('yhFacade', () => std({ map: YHT.facade() })),
    tint: 'tint',
    glass: def('gdGlass', () => new THREE.MeshStandardMaterial({ color: '#eef4f2', transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0.2, depthWrite: false })),
  };
  // u = distance from the right-hand wall as you walk in
  // (local -x is on your right when you face into the shop, so u = x)
  const bx = (u0, u1, y0, y1, z0, z1, mat, o) => k.box(u0, u1, y0, y1, z0, z1, mat, o);
  const X = (u) => u;
  const off = base - H(...k.w(W / 2, 6)); // the floor is levelled to the building base
  const SD = 12.6;                         // shop depth (storeroom and staff stair beyond)

  // ---------------- shell (S.NF storeys; one here: a flat roof just over the sign, parapet all round) ----------------
  k.box(0, 0.2, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(W - 0.2, W, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, -0.6, top, D - 0.2, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0, W, top - 0.2, top, 0, D, 'gray', { col: false });
  k.box(0, W, top, top + 0.6, -0.05, 0.15, MT.black, { col: false });
  if (S.NF === 1) { k.box(0, 0.15, top, top + 0.6, 0.15, D, MT.black, { col: false }); k.box(W - 0.15, W, top, top + 0.6, 0.15, D, MT.black, { col: false }); k.box(0.15, W - 0.15, top, top + 0.6, D - 0.15, D, MT.black, { col: false }); }
  if (top - 0.2 > F + 1.2) k.box(0.2, W - 0.2, F + 1.2, top - 0.2, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  for (let f = 1; f < S.NF; f++) {
    const y = f * F;
    for (const cx of [W * 0.27, W * 0.73]) { k.plane(YHT.win(), 2.6, 1.45, cx, y + 1.6, -0.01, Math.PI); k.box(cx - 1.4, cx + 1.4, y + 0.78, y + 0.84, -0.25, 0, MT.rim, { col: false }); }
    if (f < 4) k.box(W / 2 - 0.4, W / 2 + 0.4, y + 0.3, y + 0.85, -0.42, -0.02, '#e6e2d6', { col: false });
  }
  // 1F: black marble piers, glass front with a sliding glass door, black sign box over it
  k.box(0, 0.55, -0.6, F + 1.2, -0.08, 0.2, MT.bmarble, { col: false });
  k.box(W - 0.55, W, -0.6, F + 1.2, -0.08, 0.2, MT.bmarble, { col: false });
  k.box(0.55, W - 0.55, -0.6, 0.06, -0.08, 0.2, MT.bmarble, { col: false });
  const DU0 = 2.0, DU1 = 4.0;                                    // door opening (u), right of centre like the photo
  k.box(0.55, DU0, 0.06, CH - 0.05, 0.06, 0.12, MT.glass);      // glass right of the door
  k.box(DU1, W - 0.55, 0.06, CH - 0.05, 0.06, 0.12, MT.glass);  // glass left of the door
  k.box(DU0, DU1, 2.45, CH - 0.05, 0.06, 0.12, MT.glass);       // transom over the door
  for (const x of [0.6, X(DU1), X(DU0), W - 0.6]) k.box(x - 0.025, x + 0.025, 0.06, CH, 0.04, 0.14, MT.black, { col: false });
  k.box(0.55, W - 0.55, CH - 0.05, F + 0.05, 0.0, 0.2, MT.black, { col: false });
  k.box(0.3, W - 0.3, F - 0.1, F + 1.15, -0.42, 0.0, MT.black, { col: false });  // sign box
  k.plane(GDT.fascia(), W - 0.8, 1.15, W / 2, F + 0.52, -0.425, Math.PI, { emissive: 0.55 });
  k.box(0.3, W - 0.3, F - 0.16, F - 0.1, -0.42, 0, MT.warm, { col: false });      // light line under the sign
  // window dressing: Gordon decal on the glass, TV with 牛肋條, 代切 board, a potted tree outside
  k.plane(GDT.logo(true), 1.5, 0.56, X(DU1 + 1.1), 1.65, 0.05, Math.PI, { transparent: true });
  k.box(X(7.6), X(5.0), 0.55, 2.0, 0.35, 0.42, MT.black, { col: false });
  k.plane(GDT.tv(), 2.5, 1.38, X(6.3), 1.28, 0.345, Math.PI, { emissive: 0.85 });
  k.box(X(6.6), X(6.0), 0.06, 0.55, 0.36, 0.42, MT.black, { col: false });
  k.plane(GDT.cut(), 0.8, 0.8, X(1.0), 1.5, 0.15, Math.PI, { emissive: 0.4 });
  // 快閃店（廣告專區）sign stand on the paving, just left of the door as you face the shop: a white board on a black
  // frame with two legs, printed on both sides
  { const sx = DU1 + 0.75, sz = -0.75, bw = 0.78, bh = 1.04, y0 = 0.5;
    k.box(sx - bw / 2 - 0.03, sx + bw / 2 + 0.03, y0 - 0.03, y0 + bh + 0.03, sz - 0.03, sz + 0.03, MT.black, { col: false });
    for (const lx of [sx - bw / 2 + 0.05, sx + bw / 2 - 0.05]) k.box(lx - 0.02, lx + 0.02, 0.04, y0, sz - 0.02, sz + 0.02, MT.black, { col: false });
    k.box(sx - bw / 2, sx + bw / 2, 0.04, 0.07, sz - 0.18, sz + 0.18, MT.black, { col: false });
    k.plane(GDT.popup(), bw, bh, sx, y0 + bh / 2, sz - 0.035, Math.PI, { emissive: 0.25 });
    k.plane(GDT.popup(), bw, bh, sx, y0 + bh / 2, sz + 0.035, 0, { emissive: 0.25 });
    k.wallRect(sx - bw / 2, sx + bw / 2, sz - 0.18, sz + 0.18, 0, y0 + bh); }
  // collision: the glass front (door gap open), the side and back walls of the shop
  k.wallRect(0.2, DU0, 0.04, 0.14, 0, CH); k.wallRect(DU1, W - 0.2, 0.04, 0.14, 0, CH);
  // sliding glass door leaves (part on its own mesh so it can move)
  const leaves = [];
  for (const [sgn, x] of [[-1, DU0 + 0.5], [1, DU1 - 0.5]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.38, 0.03), M(MT.glass)); m.position.set(x, 1.25, 0.0); k.group.add(m);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.38, 0.05), M(MT.black)); fr.position.set(sgn * 0.48, 0, 0); m.add(fr);
    leaves.push({ m, x0: x, sgn });
  }
  // paving in front of the glass and a walk across the lawn from the door to the road
  k.box(0, W, -0.6, 0.04, -1.4, 0, MT.bmarble, { col: false, tile: [0.6, 0.6] });
  // the walk follows the lawn down to the road: short slabs, each on the ground under it (local y = H - base)
  for (let z = -1.4; z > -1.4 - S.PATH + 1e-6; z -= 0.6) {
    const z0 = Math.max(-1.4 - S.PATH, z - 0.6), gy = H(...k.w((DU0 + DU1) / 2, (z + z0) / 2)) - base;
    k.box(DU0 - 0.2, DU1 + 0.2, gy - 0.3, gy + 0.04, z0, z, '#bdb8ae', { col: false, tile: [0.6, 0.6] });
  }

  // ---------------- 1F shop ----------------
  k.box(0.2, W - 0.2, -0.6, 0.06, 0.2, D - 0.2, MT.oak, { col: false, tile: [1.6, 1.6] });
  I.addSurface(k.rect(0.2, W - 0.2, -1.4, SD), (x, z) => base + 0.06 - H(x, z));
  k.box(0.2, W - 0.2, CH + 0.25, CH + 0.3, 0.2, SD, '#3b2a1c', { col: false });      // dark void above the slats
  k.box(0.2, W - 0.2, 0, F, SD, SD + 0.15, MT.dark);                              // back wall (dark wood)
  // pine slats across the ceiling, track lights hanging between them
  for (let z = 0.3; z < SD; z += 0.24) k.box(0.25, W - 0.25, CH, CH + 0.12, z, z + 0.16, MT.pine, { col: false });
  for (const u of [2.3, 5.0, 7.6]) {
    k.box(X(u) - 0.02, X(u) + 0.02, CH - 0.04, CH, 0.6, SD - 0.4, MT.black, { col: false });
    for (let z = 1.2; z < SD - 0.6; z += 2.2) { k.cyl(X(u), z, 0.06, CH - 0.26, CH - 0.04, MT.black); k.cyl(X(u), z, 0.045, CH - 0.28, CH - 0.25, MT.warm); }
  }
  // right wall (u 0): the LED wave behind vertical pine slats
  bx(0.2, 0.22, 0, CH, 0.2, SD, MT.wave, { col: false });
  k.plane(GDT.wave(), SD - 0.6, CH - 0.1, X(0.23), CH / 2, SD / 2, Math.PI / 2, { emissive: 1.0 }); // faces into the shop (+x)
  for (let z = 0.45; z < SD - 0.2; z += 0.2) bx(0.24, 0.34, 0, CH, z, z + 0.06, MT.pine, { col: false });
  k.wallRect(X(0.36), X(0.2), 0.2, SD, 0, CH);
  // left wall (u W): white, the stair at the back behind a pine screen
  bx(W - 0.21, W - 0.2, 0, CH, 0.2, SD, MT.plaster);
  // freezers: black body, grey rim, curved glass lids, meat packs inside, blue LED on the rim
  const freezer = (u0, u1, z0, z1, sign) => {
    bx(u0, u1, 0.06, 0.82, z0, z1, MT.black);
    bx(u0 + 0.05, u1 - 0.05, 0.62, 0.64, z0 + 0.05, z1 - 0.05, MT.meat, { col: false, tile: [0.9, 0.45] });
    bx(u0, u1, 0.82, 0.88, z0, z0 + 0.05, MT.rim, { col: false }); bx(u0, u1, 0.82, 0.88, z1 - 0.05, z1, MT.rim, { col: false });
    bx(u0, u0 + 0.05, 0.82, 0.88, z0, z1, MT.rim, { col: false }); bx(u1 - 0.05, u1, 0.82, 0.88, z0, z1, MT.rim, { col: false });
    bx(u0 + 0.05, u1 - 0.05, 0.9, 0.92, z0 + 0.05, z1 - 0.05, MT.tint, { col: false });
    bx(u0 + 0.06, u0 + 0.08, 0.84, 0.86, z0 + 0.1, z1 - 0.1, MT.led, { col: false });
    for (let z = z0 + 0.7; z < z1 - 0.3; z += 0.7) bx(u0 + 0.05, u1 - 0.05, 0.88, 0.93, z - 0.02, z + 0.02, MT.rim, { col: false });
    if (sign) { bx(u0 + 0.2, u1 - 0.2, 0.93, 1.25, (z0 + z1) / 2 - 0.02, (z0 + z1) / 2 + 0.02, MT.black, { col: false }); k.plane(GDT.zone(sign), 0.66, 0.19, X((u0 + u1) / 2), 1.1, (z0 + z1) / 2 - 0.03, Math.PI, { emissive: 0.6 }); }
  };
  freezer(0.4, 1.35, 1.2, 3.6, '火鍋區'); freezer(0.4, 1.35, 3.75, 6.15, '燒烤區');    // along the wave wall
  freezer(3.6, 4.6, 3.2, 6.4, '牛排區'); freezer(4.7, 5.7, 3.2, 6.4, '和牛區');        // island (photo 5)
  freezer(W - 1.25, W - 0.3, 1.1, 3.1, '海鮮區');                                    // left front
  // upright chilled display case (left, photo 2)
  bx(W - 1.05, W - 0.3, 0.06, 1.9, 3.5, 4.7, MT.black);
  bx(W - 1.06, W - 0.95, 0.4, 1.75, 3.6, 4.6, MT.glass, { col: false });
  bx(W - 0.95, W - 0.4, 0.5, 1.7, 3.6, 4.6, MT.meat, { col: false, tile: [1.0, 0.6] });
  bx(W - 0.95, W - 0.4, 1.78, 1.82, 3.6, 4.6, MT.warm, { col: false });
  // baskets by the door
  bx(DU1 + 0.3, DU1 + 0.9, 0.06, 0.5, 0.6, 1.0, '#7d8794');
  // counter: white marble with the Gordon logo, black top; walnut wall behind with ring pendants
  const CU0 = 3.0, CU1 = 7.0, CZ0 = 9.9, CZ1 = 10.6;
  bx(CU0, CU1, 0.06, 1.0, CZ0, CZ1, MT.marble, { tile: [1.2, 0.8] });
  bx(CU0 - 0.03, CU1 + 0.03, 1.0, 1.06, CZ0 - 0.04, CZ1 + 0.04, MT.black, { col: false });
  k.plane(GDT.logo(true), 1.4, 0.52, X((CU0 + CU1) / 2), 0.58, CZ0 - 0.005, Math.PI, { transparent: true });
  bx(CU1 - 0.7, CU1 - 0.3, 1.06, 1.4, CZ0 + 0.15, CZ0 + 0.45, MT.black, { col: false });        // POS
  bx(CU0 + 0.5, CU0 + 0.9, 1.06, 1.42, CZ0 + 0.2, CZ0 + 0.24, MT.gold, { col: false });         // price card
  bx(CU0 + 0.3, CU1 + 0.6, 0, 1.0, CZ1, CZ1 + 0.02, MT.black, { col: false });
  k.wallRect(X(CU1 + 0.6), X(CU0), CZ0, SD, 0, 1.1);                                              // nobody walks round behind the till
  bx(CU0 - 0.4, CU1 + 0.6, 0.06, CH, SD - 0.05, SD, MT.dark, { col: false });
  for (const [u, r] of [[4.2, 0.32], [5.4, 0.24], [6.3, 0.3]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 32), M(MT.warm)); ring.rotation.x = Math.PI / 2; ring.position.set(X(u), 2.6 + r * 0.3, 11.4); k.group.add(ring);
    k.box(X(u) - 0.005, X(u) + 0.005, 2.6 + r * 0.3, CH, 11.395, 11.405, MT.black, { col: false });
  }
  // gold wine cabinet left of the counter (photos 2, 5)
  const WU0 = CU1 + 0.15, WU1 = CU1 + 1.15, WZ = 11.6;
  bx(WU0, WU1, 0.06, 0.5, WZ, WZ + 0.4, MT.black);
  for (const y of [0.5, 1.1, 1.7, 2.3]) bx(WU0, WU1, y, y + 0.03, WZ, WZ + 0.4, MT.gold, { col: false });
  for (const u of [WU0, (WU0 + WU1) / 2, WU1 - 0.03]) bx(u, u + 0.03, 0.5, 2.33, WZ, WZ + 0.4, MT.gold, { col: false });
  for (let i = 0; i < 8; i++) { const u = WU0 + 0.2 + (i % 3) * 0.3, y = 1.13 + Math.floor(i / 3) * 0.6; k.cyl(X(u), WZ + 0.2, 0.035, y, y + 0.3, i % 3 ? '#3d0f17' : '#1f3d22'); }
  // stair to 2F at the back left (closed: staff only), behind a pine slat screen
  const SU0 = W - 1.55, SU1 = W - 0.22;
  for (let i = 0; i < 12; i++) { const z = 6.6 + i * 0.5; bx(SU0, SU1, 0, 0.18 * (i + 1), z, z + 0.5, MT.stair, { col: false }); }
  k.wallRect(X(SU1), X(SU0 - 0.05), 6.6, SD, 0, CH);
  for (let z = 5.2; z < SD - 0.1; z += 0.16) bx(SU0 - 0.08, SU0 - 0.02, 0, CH, z, z + 0.05, MT.pine, { col: false });
  bx(SU0 - 0.08, SU0 - 0.02, 0, CH, 5.2, 5.25, MT.pine, { col: false });
  // a stool by the stair (photo 2)
  k.cyl(X(SU0 - 0.5), 5.6, 0.18, 0.7, 0.74, MT.pine); k.cyl(X(SU0 - 0.5), 5.6, 0.02, 0.06, 0.7, MT.black);

  k.finish(scene);
  I.zones.push({ name: '戈登肉鋪', pts: k.rect(0.2, W - 0.2, 0.1, SD), y0: -0.5, y1: CH, ceil: () => CH - 0.1 + off });
  // the glass door slides open when you walk up to it
  const doorAt = k.w(X((DU0 + DU1) / 2), 0.1);
  I.updaters.push((dt, g) => {
    const p = g.player.worldPos(), near = !g.player.vehicle && Math.hypot(p.x - doorAt[0], p.z - doorAt[1]) < 2.8;
    // each leaf slides outward over its side's glass (sgn -1: toward x 0)
    for (const l of leaves) { const tx = l.x0 + (near ? l.sgn * 0.95 : 0); l.m.position.x += (tx - l.m.position.x) * Math.min(1, dt * 6); }
  });
  const at = (u, z) => { const p = k.w(X(u), z); return { x: p[0], z: p[1] }; };
  const keeper = { ...at((CU0 + CU1) / 2, 11.15), y: base + 0.06, h: k.heading(Math.PI) };
  return {
    k, door: doorAt, keeper, base,
    counter: { ...at((CU0 + CU1) / 2, CZ0 - 0.7) },
    freezers: [
      { zone: 'hotpot', ...at(0.9, 2.4), r: 1.5 }, { zone: 'bbq', ...at(0.9, 5.0), r: 1.5 },
      { zone: 'steak', ...at(4.1, 4.8), r: 1.6 }, { zone: 'wagyu', ...at(5.2, 4.8), r: 1.6 },
      { zone: 'sea', ...at(W - 0.8, 2.1), r: 1.5 }, { zone: 'sea', ...at(W - 0.7, 4.1), r: 1.2 },
    ],
  };
}
