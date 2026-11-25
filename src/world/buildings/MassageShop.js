// 涼韌足體養生（新中北路 469 巷口以西、北側；src/world/buildings/xzb/SegX4.js 的 N6 那一格）：一樓可以走進去的足體養生館。
// 原型是當地的一間足體保健店，遊戲裡改用諧音店名「涼韌」。店內照台灣常見的足體養生館配置（大地色木頭、米色牆、綠色布簾與植物、
// 暖色吸頂燈）：前面是櫃台（價目表、牆上掛營業登記與按摩技術證照）、鞋櫃與等候沙發；中間三張足底按摩躺椅，前面有師傅的小凳子與泡腳木桶，
// 牆上一張腳底反射區圖、天花板吊一台電視；最裡面用布簾隔成兩間全身按摩的小隔間（有臉洞的按摩床）。
// 營業時間 11:00–隔天 01:00：打烊時鐵捲門拉下、掛已打烊牌、燈變暗，門口擋住不能進（人在店裡就讓你出去）。
// 付錢、師傅與按摩流程在 src/systems/minigames/Massage.js（讀 I.massage）。
// Local frame（街屋 Kit）：+x 沿立面，+z 往店裡（z = 0 是立面線，-z 是街道），y 從 k.base 起算。
import * as THREE from 'three';
import { H } from '../Terrain.js';
import { ctex, font } from '../Kit.js';
import { pointInPoly } from '../../physics/Collision.js';

export const MASSAGE_NAME = '涼韌足體養生';
// 價目表（門口立牌、櫃台後面的板子與點單選單都讀這張）：[方案, 分鐘, 價錢]；價錢照中壢一帶足體養生店的行情
export const MASSAGE_BOARD = [
  ['腳底按摩', 40, 600],
  ['全身推拿', 60, 1000],
  ['腳底＋全身', 100, 1500],
];
// 營業時間（一天中的分鐘數，過了午夜的關門時間寫成 24:00 之後）
export const MASSAGE_HOURS = { open: 11 * 60, close: 25 * 60, text: '11:00–凌晨 01:00' };
export function massageOpen(clock) {
  const m = ((clock % 1440) + 1440) % 1440,
    { open, close } = MASSAGE_HOURS;
  return close > 1440 ? m >= open || m < close - 1440 : m >= open && m < close;
}

const NC = { col: false };
const C = {
  wall: '#efe6cf', // 米色牆（立面與店內同色）
  wood: '#8a5a3a',
  woodL: '#c9a57a',
  floor: '#9b6b43',
  dark: '#3b3e42', // 鋁框
  leather: '#5a3b2a',
  cushion: '#6f4a33',
  towel: '#efe6d2',
  curtain: '#7d8f6a',
  ceil: '#ead7b8',
  lining: '#f0dcbc', // warm cream inside: the room is lit by the cool sky, plain beige reads grey-blue
  slat: '#b98a5a',
  plant: '#4f7a3e',
  pot: '#6b5340',
};

// ---------------- textures ----------------
const TX = {
  board: () =>
    ctex('msBoard', 256, 384, (g) => {
      g.fillStyle = '#f4ecd8';
      g.fillRect(0, 0, 256, 384);
      g.fillStyle = '#d8344a';
      g.fillRect(0, 0, 256, 72);
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = font(34);
      g.fillText('涼韌 價目表', 128, 38);
      g.textAlign = 'left';
      MASSAGE_BOARD.forEach(([n, min, p], i) => {
        const y = 118 + i * 82;
        g.fillStyle = '#3a2a1c';
        g.font = font(26);
        g.fillText(n, 18, y);
        g.fillStyle = '#7a6a58';
        g.font = font(18, 700);
        g.fillText(`${min} 分鐘`, 20, y + 30);
        g.fillStyle = '#d8344a';
        g.font = font(30);
        g.textAlign = 'right';
        g.fillText(`$${p.toLocaleString('en-US')}`, 238, y + 14);
        g.textAlign = 'left';
        g.fillStyle = '#d9cbb0';
        g.fillRect(18, y + 48, 220, 2);
      });
      g.fillStyle = '#7a6a58';
      g.font = font(16, 700);
      g.textAlign = 'center';
      g.fillText(`營業時間 ${MASSAGE_HOURS.text}`, 128, 364);
    }),
  cert: (key, title) =>
    ctex(`msCert${key}`, 160, 112, (g) => {
      g.fillStyle = '#b08d57';
      g.fillRect(0, 0, 160, 112);
      g.fillStyle = '#fbf7ee';
      g.fillRect(8, 8, 144, 96);
      g.fillStyle = '#9a2a2a';
      g.beginPath();
      g.arc(128, 82, 12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3a2a1c';
      g.textAlign = 'center';
      g.font = font(17);
      g.fillText(title, 80, 36);
      g.fillStyle = '#9a8c78';
      for (let i = 0; i < 3; i++) g.fillRect(24, 52 + i * 12, 82 - i * 14, 3);
    }),
  logo: () =>
    ctex('msLogo', 256, 72, (g) => {
      g.fillStyle = '#5a3b2a';
      g.fillRect(0, 0, 256, 72);
      g.fillStyle = '#f4e3c3';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = font(34);
      g.fillText('涼韌足體養生', 128, 38);
    }),
  // 腳底反射區圖：兩隻腳掌、分區上色、標頭／眼／肺／胃／腎…
  foot: () =>
    ctex('msFoot', 192, 256, (g) => {
      g.fillStyle = '#fbf7ee';
      g.fillRect(0, 0, 192, 256);
      g.fillStyle = '#3a2a1c';
      g.textAlign = 'center';
      g.font = font(18);
      g.fillText('腳底反射區圖', 96, 24);
      const zones = [
        ['#e8a0a0', '頭'],
        ['#f0c987', '眼'],
        ['#a9cf8f', '肺'],
        ['#8fc1cf', '胃'],
        ['#c7a3d6', '腎'],
        ['#e3b48f', '腸'],
      ];
      for (const cx of [56, 136]) {
        g.save();
        g.translate(cx, 140);
        g.beginPath();
        g.ellipse(0, 0, 32, 92, 0, 0, Math.PI * 2);
        g.clip();
        zones.forEach(([c], i) => {
          g.fillStyle = c;
          g.fillRect(-40, -92 + i * 31, 80, 31);
        });
        g.restore();
        g.strokeStyle = '#7a5a3a';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(cx, 140, 32, 92, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = '#3a2a1c';
      g.font = font(13, 700);
      zones.forEach(([, t], i) => g.fillText(t, 96, 70 + i * 31));
    }),
  // 山水畫
  art: () =>
    ctex('msArt', 192, 128, (g) => {
      g.fillStyle = '#f2ead8';
      g.fillRect(0, 0, 192, 128);
      g.fillStyle = '#7a8a86';
      g.beginPath();
      g.moveTo(0, 100);
      g.lineTo(40, 46);
      g.lineTo(78, 92);
      g.lineTo(118, 34);
      g.lineTo(166, 96);
      g.lineTo(192, 80);
      g.lineTo(192, 128);
      g.lineTo(0, 128);
      g.fill();
      g.fillStyle = '#a9b6ae';
      g.fillRect(0, 108, 192, 20);
      g.fillStyle = '#9a2a2a';
      g.fillRect(160, 14, 12, 16);
      g.strokeStyle = '#5a3b2a';
      g.lineWidth = 6;
      g.strokeRect(3, 3, 186, 122);
    }),
  // 電視：播森林溪流
  tv: () =>
    ctex('msTv', 192, 108, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 108);
      sky.addColorStop(0, '#bfe1d9');
      sky.addColorStop(1, '#5f8f6a');
      g.fillStyle = sky;
      g.fillRect(0, 0, 192, 108);
      g.fillStyle = '#3f6a45';
      for (let i = 0; i < 9; i++) g.fillRect(i * 22 - 4, 30 + ((i * 37) % 24), 14, 60);
      g.fillStyle = '#9fd0e0';
      g.beginPath();
      g.moveTo(70, 108);
      g.lineTo(96, 60);
      g.lineTo(112, 60);
      g.lineTo(140, 108);
      g.fill();
    }),
  shutter: (col) =>
    ctex(`msShutter${col}`, 64, 128, (g) => {
      g.fillStyle = col;
      g.fillRect(0, 0, 64, 128);
      for (let y = 0; y < 128; y += 8) {
        g.fillStyle = 'rgba(0,0,0,0.16)';
        g.fillRect(0, y, 64, 2);
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(0, y + 2, 64, 1);
      }
    }),
  closed: () =>
    ctex('msClosed', 512, 128, (g) => {
      g.fillStyle = '#1b1b1b';
      g.fillRect(0, 0, 512, 128);
      g.fillStyle = '#f2c46b';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = font(30);
      g.fillText(`本店已打烊・營業時間 ${MASSAGE_HOURS.text}`, 256, 64, 490);
    }),
};

// the price list for the stand by the door (src/world/buildings/xzb/SegX4.js)
export const massagePriceBoard = () => TX.board();

// a box of its own (not merged into the row), for things that move, light up or hide
function own(k, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  k.group.add(m);
  return m;
}
const glassMat = () =>
  new THREE.MeshStandardMaterial({
    color: '#6e8f9c',
    transparent: true,
    opacity: 0.32,
    roughness: 0.08,
    metalness: 0.2,
    depthWrite: false,
  });

// k: the lot's Kit (SegX4 K(...), width k.W); D: lot depth; GF: ground floor height (the floors above are the row's shell)
export function buildMassageShop(k, { D = 12, GF = 3.4, shutterCol = '#e2d3a8' } = {}) {
  const I = k.I,
    W = k.W,
    T = 0.12, // wall
    FY = 0.06, // floor top
    CH = 2.9, // ceiling
    DU0 = W / 2 - 0.55,
    DU1 = W / 2 + 0.55, // door opening
    DH = 1.92; // door and window heads: just under the red sign band (SegX4 hangs it from 1.95 m)
  const WX0 = 0.35,
    WX1 = DU0 - 0.3,
    WX2 = DU1 + 0.3,
    WX3 = W - 0.35,
    SILL = 0.7;

  // ---------------- shell: front with windows and the door gap, side and back walls, floor, ceiling ----------------
  for (const [x0, x1] of [
    [0, WX0],
    [WX1, DU0],
    [DU1, WX2],
    [WX3, W],
  ])
    k.box(x0, x1, -0.8, GF, 0, T, C.wall, NC);
  for (const [x0, x1] of [
    [WX0, WX1],
    [WX2, WX3],
  ])
    k.box(x0, x1, -0.8, SILL, 0, T, C.wall, NC);
  k.box(WX0, WX3, DH, GF, 0, T, C.wall, NC);
  // dark aluminium frames round the windows and the door (street side)
  for (const [x0, x1, y0] of [
    [WX0, WX1, SILL],
    [WX2, WX3, SILL],
    [DU0, DU1, 0],
  ]) {
    k.box(x0 - 0.04, x1 + 0.04, DH, DH + 0.05, -0.03, T + 0.02, C.dark, NC);
    k.box(x0 - 0.04, x0, y0, DH, -0.03, T + 0.02, C.dark, NC);
    k.box(x1, x1 + 0.04, y0, DH, -0.03, T + 0.02, C.dark, NC);
    if (y0) k.box(x0 - 0.04, x1 + 0.04, y0 - 0.04, y0, -0.05, T + 0.04, C.dark, NC);
  }
  const glass = glassMat();
  own(k, WX1 - WX0, DH - SILL, 0.02, (WX0 + WX1) / 2, (SILL + DH) / 2, T / 2, glass);
  own(k, WX3 - WX2, DH - SILL, 0.02, (WX2 + WX3) / 2, (SILL + DH) / 2, T / 2, glass);
  k.wallRect(0, DU0, 0, T, 0, GF);
  k.wallRect(DU1, W, 0, T, 0, GF);
  // sliding glass door leaves (own meshes: they move)
  const leaves = [-1, 1].map((sgn) => {
    const m = own(k, 0.56, DH - 0.04, 0.03, W / 2 + sgn * 0.28, DH / 2, T / 2, glass);
    const fr = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, DH - 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: C.dark })
    );
    fr.position.set(sgn * 0.26, 0, 0);
    m.add(fr);
    return { m, x0: m.position.x, sgn };
  });
  k.box(0, T, -0.8, GF, T, D, C.wall, NC); // side walls (their inner faces are the shop walls)
  k.box(W - T, W, -0.8, GF, T, D, C.wall, NC);
  k.box(T, W - T, -0.8, GF, D - T, D, C.wall, NC); // back wall
  k.wallRect(0, T, 0, D, 0, GF);
  k.wallRect(W - T, W, 0, D, 0, GF);
  k.wallRect(0, W, D - T, D, 0, GF);
  k.box(T, W - T, -0.6, FY, T, D - T, C.floor, NC); // warm wooden floor
  I.addSurface(k.rect(T, W - T, 0, D - T), (x, z) => k.base + FY - H(x, z));
  // the room's warm light: no lamp lights here (they would cost every shader in the game), so the cream walls and
  // the ceiling carry a little warm glow of their own (own material: it dims when the shop is shut)
  const warm = new THREE.MeshStandardMaterial({
    color: C.lining,
    emissive: '#ffcf96',
    emissiveIntensity: 0.2,
    roughness: 0.9,
  });
  const warmCeil = warm.clone();
  warmCeil.color.set(C.ceil);
  own(k, W - 2 * T, 0.06, D - 2 * T, W / 2, CH + 0.03, D / 2, warmCeil);
  for (let z = T + 0.4; z < D - T; z += 0.55)
    k.box(T, W - T, CH - 0.06, CH, z, z + 0.08, C.slat, NC); // 森林系木條
  // wood wainscot round the room, below a cream upper wall
  k.box(T, T + 0.02, FY, 0.95, T, D - T, C.woodL, NC);
  k.box(W - T - 0.02, W - T, FY, 0.95, T, D - T, C.woodL, NC);
  k.box(T, W - T, FY, 0.95, D - T - 0.02, D - T, C.woodL, NC);
  own(k, 0.015, CH - 0.95, D - 2 * T, T + 0.0075, (0.95 + CH) / 2, D / 2, warm);
  own(k, 0.015, CH - 0.95, D - 2 * T, W - T - 0.0075, (0.95 + CH) / 2, D / 2, warm);
  own(k, W - 2 * T, CH - 0.95, 0.015, W / 2, (0.95 + CH) / 2, D - T - 0.0075, warm);

  // ---------------- front: reception (right), shoe cabinet and sofa (left) ----------------
  const CX0 = 3.25,
    CZ0 = 1.55,
    CZ1 = 2.15;
  k.box(CX0, W - T, FY, 1.0, CZ0, CZ1, C.wood, NC);
  k.box(CX0 - 0.05, W - T, 1.0, 1.06, CZ0 - 0.05, CZ1 + 0.03, '#e3d3b4', NC);
  k.wallRect(CX0, W - T, CZ0, CZ1, 0, 1.06);
  k.plane(TX.logo(), 1.15, 0.32, (CX0 + W - T) / 2, 0.66, CZ0 - 0.006, Math.PI, { emissive: 0.15 });
  k.cyl(CX0 + 0.3, CZ0 + 0.3, 0.07, 1.06, 1.2, '#7a4a2a'); // teapot
  for (const dx of [0.52, 0.66]) k.cyl(CX0 + dx, CZ0 + 0.22, 0.03, 1.06, 1.11, '#f4f1ea');
  k.box(W - T - 0.5, W - T - 0.18, 1.06, 1.2, CZ0 + 0.15, CZ0 + 0.4, '#2c2c2e', NC); // register
  // licences on the right wall over the counter (a licensed shop hangs them where you pay); wall pictures sit 2 cm out,
  // in front of the warm wall lining
  k.plane(TX.cert('a', '營業登記證'), 0.42, 0.3, W - T - 0.022, 1.75, 1.6, -Math.PI / 2);
  k.plane(TX.cert('b', '按摩技術證照'), 0.42, 0.3, W - T - 0.022, 1.75, 2.1, -Math.PI / 2);
  // slatted screen behind the counter, the price list on it
  k.box(3.1, W - T, FY, 2.35, 3.0, 3.1, C.wood, NC);
  for (let x = 3.16; x < W - T - 0.05; x += 0.16)
    k.box(x, x + 0.06, FY, 2.35, 2.97, 3.0, C.slat, NC);
  k.wallRect(3.1, W - T, 3.0, 3.1, 0, 2.35);
  k.plane(TX.board(), 0.9, 1.35, (3.1 + W - T) / 2, 1.5, 2.965, Math.PI, { emissive: 0.12 });
  // shoe cabinet + slippers by the door, sofa along the left wall, a water dispenser in the right front corner
  k.box(T, 0.5, FY, 1.0, 0.35, 1.25, C.woodL, NC);
  k.wallRect(T, 0.5, 0.35, 1.25, 0, 1.0);
  for (let i = 0; i < 3; i++) {
    const z = 0.45 + i * 0.27;
    k.box(0.62, 0.72, FY, FY + 0.05, z, z + 0.24, '#a7c4b5', NC);
    k.box(0.76, 0.86, FY, FY + 0.05, z, z + 0.24, '#a7c4b5', NC);
  }
  k.box(T, 0.85, FY, 0.42, 1.5, 3.0, C.leather, NC);
  k.box(T, 0.3, 0.42, 0.95, 1.5, 3.0, C.leather, NC);
  for (const z of [1.5, 2.88]) k.box(T, 0.85, 0.42, 0.62, z, z + 0.12, C.leather, NC);
  k.wallRect(T, 0.85, 1.5, 3.0, 0, 0.95);
  k.box(W - T - 0.3, W - T, FY, 1.15, 0.25, 0.55, '#f4f4f2', NC);
  k.box(W - T - 0.28, W - T - 0.02, 1.15, 1.45, 0.29, 0.51, '#8fc1cf', NC);
  const plant = (x, z, s = 1) => {
    k.cyl(x, z, 0.16 * s, FY, 0.4 * s, C.pot);
    k.cyl(x, z, 0.3 * s, 0.4 * s, 1.25 * s, C.plant, { r1: 0.12 * s });
  };
  plant(0.42, 3.35);

  // ---------------- middle: three foot-massage recliners facing the front ----------------
  const XC = [0.95, W / 2, W - 0.95],
    recliners = [];
  for (const xc of XC) {
    k.box(xc - 0.38, xc + 0.38, FY, 0.3, 5.1, 6.6, C.leather, NC); // base
    k.box(xc - 0.33, xc + 0.33, 0.3, 0.48, 5.1, 5.95, C.cushion, NC); // seat
    for (let j = 0; j < 4; j++) {
      // reclined back in four steps
      const z0 = 5.95 + j * 0.15;
      k.box(xc - 0.33, xc + 0.33, 0.48 + j * 0.14, 0.7 + j * 0.16, z0, z0 + 0.16, C.cushion, NC);
    }
    k.box(xc - 0.3, xc + 0.3, 0.22, 0.4, 4.35, 5.1, C.cushion, NC); // leg rest
    k.box(xc - 0.28, xc + 0.28, 0.4, 0.43, 4.4, 5.05, C.towel, NC);
    for (const s of [-1, 1])
      k.box(xc + s * 0.36 - 0.04, xc + s * 0.36 + 0.04, 0.3, 0.62, 5.2, 6.3, C.leather, NC);
    k.box(xc - 0.2, xc + 0.2, 1.05, 1.18, 6.45, 6.6, C.towel, NC); // towel over the head rest
    k.wallRect(xc - 0.4, xc + 0.4, 4.35, 6.6, 0, 0.7);
    // the therapist's low stool and the wooden foot bucket (herbal soak) beside it
    k.cyl(xc, 3.85, 0.17, FY, 0.34, C.wood);
    k.cyl(xc - 0.44, 4.2, 0.17, FY, 0.4, '#a5743f', { col: true });
    k.cyl(xc - 0.44, 4.2, 0.15, 0.36, 0.38, '#7fb6c2');
    recliners.push({ xc });
  }
  for (const x of [(XC[0] + XC[1]) / 2, (XC[1] + XC[2]) / 2]) {
    k.box(x - 0.2, x + 0.2, FY, 0.55, 6.05, 6.45, C.wood, NC);
    k.cyl(x, 6.25, 0.04, 0.55, 0.62, '#f4f1ea'); // tea
    k.wallRect(x - 0.2, x + 0.2, 6.05, 6.45, 0, 0.55);
  }
  // the reflexology chart, a TV hanging over the front (the recliners face it), towels on a shelf
  k.plane(TX.foot(), 0.62, 0.84, T + 0.022, 1.7, 4.5, Math.PI / 2, { emissive: 0.1 });
  k.box(1.0, 2.2, 1.95, 2.62, 3.32, 3.38, '#111', NC);
  for (const x of [1.3, 1.9]) k.box(x - 0.02, x + 0.02, 2.62, CH, 3.33, 3.37, C.dark, NC);
  k.plane(TX.tv(), 1.12, 0.62, 1.6, 2.285, 3.385, 0, { emissive: 0.8 });
  k.box(W - T - 0.32, W - T, 1.2, 1.24, 6.9, 7.5, C.wood, NC);
  for (let i = 0; i < 4; i++)
    k.box(W - T - 0.3, W - T - 0.05, 1.24, 1.34, 6.95 + i * 0.13, 7.06 + i * 0.13, C.towel, NC);
  plant(W - 0.42, 7.2, 0.9);

  // ---------------- back: two full-body massage cubicles behind curtains ----------------
  const CZ = 7.7,
    GAP0 = 1.75,
    GAP1 = 3.05;
  k.box(T, W - T, 2.55, 2.6, CZ - 0.02, CZ + 0.02, '#9a9a9a', NC);
  for (const [x0, x1] of [
    [T, GAP0],
    [GAP1, W - T],
  ]) {
    k.box(x0, x1, 0.12, 2.55, CZ - 0.04, CZ + 0.04, C.curtain, NC);
    k.wallRect(x0, x1, CZ - 0.04, CZ + 0.04, 0, 2.55);
  }
  k.box(W / 2 - 0.04, W / 2 + 0.04, 0.12, 2.55, 8.3, D - T, C.curtain, NC);
  k.box(W / 2 - 0.02, W / 2 + 0.02, 2.55, 2.6, 8.3, D - T, '#9a9a9a', NC);
  k.wallRect(W / 2 - 0.04, W / 2 + 0.04, 8.3, D - T, 0, 2.55);
  const BX = [(T + W / 2) / 2, (W / 2 + W - T) / 2],
    beds = [];
  for (const [i, bx] of BX.entries()) {
    k.box(bx - 0.38, bx + 0.38, FY, 0.55, 8.9, 10.85, '#5a3d2b', NC);
    k.box(bx - 0.36, bx + 0.36, 0.55, 0.68, 8.92, 10.83, C.towel, NC);
    k.box(bx - 0.09, bx + 0.09, 0.68, 0.685, 10.5, 10.7, '#3a2a1c', NC); // face hole
    k.wallRect(bx - 0.4, bx + 0.4, 8.9, 10.85, 0, 0.7);
    k.plane(TX.art(), 0.9, 0.6, bx, 1.75, D - T - 0.022, Math.PI, { emissive: 0.1 });
    // shelf with towels and oil bottles on the back wall
    k.box(bx - 0.5, bx + 0.5, 1.15, 1.19, D - T - 0.26, D - T, C.wood, NC);
    for (let j = 0; j < 3; j++)
      k.cyl(bx - 0.3 + j * 0.12, D - T - 0.12, 0.035, 1.19, 1.36, j ? '#b5833a' : '#7a9a5a');
    k.box(bx + 0.1, bx + 0.42, 1.19, 1.37, D - T - 0.24, D - T - 0.02, C.towel, NC);
    k.cyl(bx + (i ? -0.85 : 0.85), 11.3, 0.16, FY, 0.42, C.wood); // stool
    beds.push({ bx, side: i ? -1 : 1 }); // side: where the therapist stands (toward the middle curtain)
  }
  plant(T + 0.3, D - T - 0.3, 0.85);

  // ---------------- warm ceiling lamps (own material: they dim when the shop is shut) ----------------
  const lampMat = new THREE.MeshStandardMaterial({
    color: '#fff4dc',
    emissive: '#ffd59a',
    emissiveIntensity: 1.3,
  });
  for (const [x, z] of [
    [W / 2, 1.3],
    [1.6, 4.9],
    [W - 1.6, 4.9],
    [W / 2, 6.9],
    [BX[0], 9.9],
    [BX[1], 9.9],
  ]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), lampMat);
    m.position.set(x, CH - 0.08, z);
    k.group.add(m);
  }

  I.zones.push({
    name: MASSAGE_NAME,
    pts: k.rect(T, W - T, 0.05, D - T),
    y0: -0.5,
    y1: CH,
    ceil: () => CH - 0.1,
  });

  // ---------------- opening hours: shutter, closed sign, door blocked from outside, lights down ----------------
  const shutter = own(
    k,
    W - 0.5,
    DH + 0.25,
    0.05,
    W / 2,
    (DH + 0.25) / 2,
    -0.1,
    new THREE.MeshStandardMaterial({ map: TX.shutter(shutterCol), roughness: 0.6, metalness: 0.35 })
  );
  shutter.material.map.repeat.set(3, 2);
  const closedSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.42),
    new THREE.MeshBasicMaterial({ map: TX.closed() })
  );
  closedSign.position.set(W / 2, 1.55, -0.14);
  closedSign.rotation.y = Math.PI;
  k.group.add(closedSign);
  shutter.visible = closedSign.visible = false;
  const wi = I.walls.length;
  k.wallLine(DU0 - 0.1, -0.2, DU1 + 0.1, -0.2, 0, DH);
  const doorWall = I.walls[wi],
    wallY = [doorWall[4], doorWall[5]];
  doorWall[4] = doorWall[5] = -100;
  const inShop = k.rect(0, W, 0, D);
  const doorAt = k.w(W / 2, -0.4);
  const state = { closed: false };
  I.updaters.push((dt, g) => {
    const closed = !massageOpen(g.clock);
    if (closed !== state.closed) {
      state.closed = closed;
      shutter.visible = closedSign.visible = closed;
      lampMat.emissiveIntensity = closed ? 0.08 : 1.3;
      warm.emissiveIntensity = warmCeil.emissiveIntensity = closed ? 0.02 : 0.2;
    }
    const p = g.player.worldPos(),
      inside = pointInPoly(p.x, p.z, inShop);
    doorWall[4] = closed && !inside ? wallY[0] : -100;
    doorWall[5] = closed && !inside ? wallY[1] : -99;
    // the glass door slides open when you walk up to it (open hours, or to let you out)
    const near =
      !g.player.vehicle &&
      (!closed || inside) &&
      Math.hypot(p.x - doorAt[0], p.z - doorAt[1]) < 2.6;
    for (const l of leaves) {
      const tx = l.x0 + (near ? l.sgn * 0.52 : 0);
      if (Math.abs(tx - l.m.position.x) < 1e-3) continue;
      l.m.position.x += (tx - l.m.position.x) * Math.min(1, dt * 6);
      l.m.updateMatrix(); // the row is frozen (src/world/Freeze.js): moved by hand
    }
  });

  // ---------------- where things are, for src/systems/minigames/Massage.js ----------------
  const at = (x, z, y = 0, h = 0) => {
    const p = k.w(x, z);
    return { x: p[0], z: p[1], y: k.base + FY + y, h: k.heading(h) };
  };
  return {
    door: k.w(W / 2, -0.9),
    get closed() {
      return state.closed;
    },
    // stand here (in front of the counter) to talk to the receptionist
    counter: at((CX0 + W - T) / 2, CZ0 - 0.55),
    reception: at((CX0 + W - T) / 2, (CZ1 + 3.0) / 2, 0, Math.PI), // behind the counter, facing the door
    // where you stand up after the massage (the aisle, facing the door)
    exit: at(W / 2, 3.4, 0, Math.PI),
    // the therapists between customers: 阿德師 behind the counter next to the receptionist (in sight from the door,
    // not behind the slatted screen at z 3.0-3.1), 小珍師 by the curtain; both out of the aisle, where you stand up
    idle: [at(CX0 + 0.2, (CZ1 + 3.0) / 2, 0, Math.PI), at(GAP1 - 0.25, CZ - 0.35, 0, Math.PI)],
    // foot massage: you on the recliner (facing the front), the therapist on the stool facing you;
    // cam / look: the shot while it lasts (over the back rest, toward the therapist and the TV)
    recliners: recliners.map(({ xc }) => ({
      seat: at(xc, 5.45, 0, Math.PI),
      stool: at(xc, 3.85, 0, 0),
      cam: at(xc + (xc < W / 2 ? 0.75 : -0.75), 7.25, 1.75),
      look: at(xc, 3.9, 0.55),
    })),
    // full body: you lying on the bed (head at the face hole), the therapist beside it; the shot from the curtain gap
    beds: beds.map(({ bx, side }) => ({
      lie: at(bx, 9.85, 0, 0),
      stand: at(bx + side * 0.62, 9.6, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2),
      cam: at(bx + side * 0.75, 8.0, 1.95),
      look: at(bx, 10.1, 0.55),
    })),
  };
}
