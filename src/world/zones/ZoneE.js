// E 區（設計學院一帶）六棟外觀：建築館（w392023416）、祐生建築中心（w392023417）、設計學院（w587171779）、
// 望樓（w587175198）、景觀系館＝信樓（w587175193），另有室設館＝愛樓（w587175196）。
// 都不能進去。src/world/MapBuilder.js 照舊從 OSM 輪廓畫牆和屋頂（共用亂數抽取次數不變），這裡只做三件事：
//  1. applyZoneE(b)：在 src/core/Game.js 換掉這幾棟的 look（牆色、窗型、屋頂色）；建築館在執行時切成兩塊
//     b.parts（北段 3F 10.5 m、南段 12.5 m 圓弧轉角高牆，輪廓 b.pts 不動，splitAc 讓冷氣的 rnd2 照抽）；
//     設計學院把 gable_row 的山牆間距改成 4 m（約 9 個）。
//  2. zoneEFootprints()：自建部分的保留範圍（變電箱、入口廣場、台階、簷下），樹和街道家具不會長進來。
//  3. buildZoneE()：OSM 輪廓說不出來的部分。
// 依據（campus-survey/zone-E.md、PLAN.md 第 3 節）：
//  建築館：評論相片 2025-11（吳柏霆）、2023-04（Rocky Weng）、2018（游筱嵩）、2017-01 使用者 360 球、NLSC 2024 正射。
//    西面入口：深出簷下一排 9 個白框細高側窗、2023 起鮮紅的雙開門；北側 3 層爬藤方塊有白框窗；南側是
//    洗石子圓弧轉角實牆，牆上凸字「ARCH」和往上的箭頭線；西北角有圍鐵絲網的變電箱。東、北東段沒照片，
//    依西面推成素牆（不編窗），屋頂深灰。
//  祐生：評論相片 2026-07（梁飛）、2022-05（侯繼鋼）、2017-01 360 球、正射。灰洗石子框架＋深凹窗、
//    北面一樓直徑約 4 m 的圓窗（古銅格框、中間圓章）、左邊兩層高玻璃帷幕、前面寬台階；4 層＋3×3 屋頂花園；
//    藤蔓只在西、北面和屋頂邊。南、東面依北面的框架與窗推，不加藤蔓。
//  設計學院：評論相片 2026-09（GiGi Huang）、2018-04（Jiayi Yang）、官方街景 2017-09（西面）、正射。
//    一排面朝東西的小山牆（實測 3.5～4 m 一個、共約 9 個），深出簷、簷底深灰、白色封簷；東面白牆、黑鋼柱、
//    深色木格窗，入口在東側廣場（玻璃門、「設計學院」招牌、玻璃上 SCHOOL OF DESIGN）；西面單層深棕木牆＋玻璃。
//    南面沒照片，照白牆推。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundY } from '../Terrain.js';
import { canvasTexture } from '../../graphics/GpuMemLifecycle.js';

export const ARCH_ID = 'w392023416',
  YUS_ID = 'w392023417',
  DES_ID = 'w587171779';
export const WANG_ID = 'w587175198',
  LAND_ID = 'w587175193',
  AI_ID = 'w587175196'; // 望樓、景觀系館（信樓）、室設館（愛樓）
const AI_S = [
  [277.5, 220.3],
  [238.3, 207.9],
]; // 愛樓南面（東→西），入口在西段、對著庭院
const AI_STAIR = 4.8; // 西端深灰洗石子樓梯間的寬度
const AI_BOX = { w: 9.8, d: 1.4 }; // 入口白色方框量體：緊貼樓梯間東邊，往外凸 1.4 m
const AI_H = 10.5; // 相片量出來是 3 層（OSM 寫 levels 3、overrides 原本改成 4F／13.8 m）
const WANG_W = [
  [256.8, 265.7],
  [269.9, 220.4],
]; // 望樓西面（南→北），入口在正中
const LAND_N = [
  [219.6, 258.1],
  [259.1, 269.8],
]; // 信樓北面（西→東），玄關在西段、對著榕樹和設計學院廣場
const FL3 = 3.3; // 3F／10.5 m 在 map.js lookWalls 的層高：(10.5 − 0.6) / 3
const LAND_PORCH = [9.6, 14.6]; // 信樓玄關（沿北面，從西端算）
const LAND_BOARD = [1.0, 9.4]; // 木板牆
const BANYAN = { s: 12.0, o: 5.6 }; // 榕樹樹幹（北面座標）
const R_ARC = 4.5; // 建築館南段西南角的圓弧半徑
const H_ARC = 12.5; // 南段高牆
const DES_GABLE = 4.0; // 設計學院山牆間距
const DES_RISE = 1.5; // 每個小山牆的高度
const DES_EAVE = 1.6; // 東西兩側出簷

// ---------------- 小工具 ----------------
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
// 邊 a→c；外法線 n = (dz, -dx)（src/world/MapBuilder.js 的輪廓都是這個方向朝外）
function edge(a, c) {
  const dx = c[0] - a[0],
    dz = c[1] - a[1],
    l = Math.hypot(dx, dz),
    tx = dx / l,
    tz = dz / l;
  return {
    a,
    c,
    l,
    tx,
    tz,
    nx: tz,
    nz: -tx,
    ang: Math.atan2(tz, tx),
    at: (s, o = 0) => [a[0] + tx * s + tz * o, a[1] + tz * s - tx * o],
  };
}
// 圓角：把 pts[i] 換成半徑 r 的圓弧（seg 段）
function fillet(pts, i, r, seg = 8) {
  const n = pts.length,
    P = pts[i],
    A = pts[(i - 1 + n) % n],
    B = pts[(i + 1) % n];
  const u1 = [A[0] - P[0], A[1] - P[1]],
    u2 = [B[0] - P[0], B[1] - P[1]];
  const l1 = Math.hypot(...u1),
    l2 = Math.hypot(...u2);
  u1[0] /= l1;
  u1[1] /= l1;
  u2[0] /= l2;
  u2[1] /= l2;
  const th = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))),
    d = r / Math.tan(th / 2);
  const bis = [u1[0] + u2[0], u1[1] + u2[1]],
    bl = Math.hypot(...bis),
    cd = r / Math.sin(th / 2);
  const C = [P[0] + (bis[0] / bl) * cd, P[1] + (bis[1] / bl) * cd];
  const T1 = [P[0] + u1[0] * d, P[1] + u1[1] * d],
    T2 = [P[0] + u2[0] * d, P[1] + u2[1] * d];
  const a1 = Math.atan2(T1[1] - C[1], T1[0] - C[0]),
    a2 = Math.atan2(T2[1] - C[1], T2[0] - C[0]);
  let da = a2 - a1;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const arc = [];
  for (let k = 0; k <= seg; k++) {
    const a = a1 + (da * k) / seg;
    arc.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]);
  }
  return [...pts.slice(0, i), ...arc, ...pts.slice(i + 1)];
}
const near = (p, q, tol = 0.6) => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol;

// 建築館：北段（入口＋爬藤方塊，10.5 m）和南段（圓弧高牆，12.5 m）。切線在 (95.0,262.2)-(84.2,260.9)
function archParts(pts) {
  if (
    pts.length !== 18 ||
    !near(pts[8], [95.0, 262.2]) ||
    !near(pts[13], [84.2, 260.9]) ||
    !near(pts[11], [71.3, 277.9])
  )
    return null;
  const north = [...pts.slice(0, 9), ...pts.slice(13)];
  const south = fillet(pts.slice(8, 14), 3, R_ARC);
  return [
    { pts: north, h: 10.5, floors: 3 },
    { pts: south, h: H_ARC, floors: 3 },
  ];
}

// src/core/Game.js：OSM 建物迴圈裡呼叫（在 src/world/MapBuilder.js 抽亂數之前，只換外觀）
export function applyZoneE(b) {
  if (b.id === ARCH_ID) {
    b.look = {
      wall: { base: 'stone', colour: '#aaa79f' },
      windows: { type: 'none', accent: '#6a6862', glass: '#3f4a52' },
      parapet: { h: 0.5, colour: '#a19e96' },
      roof: { colour: '#6e6d69' },
    };
    const parts = archParts(b.pts);
    if (parts) {
      b.parts = parts;
      b.splitAc = 1;
      b.labelH = H_ARC + 1;
    }
  } else if (b.id === YUS_ID) {
    b.look = {
      wall: { base: 'stone', colour: '#8f8c86' },
      windows: { type: 'none', accent: '#7a6440', glass: '#3a4248' },
      parapet: { h: 0.3, colour: '#8a8781' },
      roof: { colour: '#5a5142', ac: false },
    };
  } else if (b.id === DES_ID) {
    b.gableEvery = DES_GABLE;
    b.roofH = DES_RISE;
    b.look = {
      wall: { base: 'smooth', colour: '#e6e3da' },
      windows: { type: 'grid', bay: 2.0, accent: '#3b2e24', glass: '#80784f' },
      faces: [
        {
          on: 'w',
          colour: '#5d4332',
          windows: { type: 'curtain', bay: 2.4, accent: '#2a1f18', glass: '#3a454c' },
        },
      ],
      roof: { colour: '#bab9b3' },
    };
  } else if (b.id === WANG_ID) {
    // 白偏淡紫灰小磁磚、古銅框窗；屋簷邊淺藍（女兒牆＋自建的出挑簷板）。原本 0.85 高的窗眉帶拿掉
    b.look = {
      wall: { base: 'tile', colour: '#d9d6dc' },
      windows: { type: 'pair', bay: 3.4, accent: '#6d5a40', glass: '#4f5a62' },
      parapet: { h: 0.35, colour: '#9fc8d4' },
      roof: { colour: '#5f7a55', ac: false }, // 屋頂是天窗箱（自建），冷氣照抽亂數但不畫
    };
  } else if (b.id === LAND_ID) {
    // 一樓灰色清水混凝土、二樓以上白小方磚；混凝土柱、樓板帶外露；青綠玻璃條窗；屋頂青綠防水層
    b.look = {
      wall: { base: 'tile', colour: '#dcdcd5' },
      plinth: { floors: 1, colour: '#96938a' },
      windows: { type: 'ribbon', bay: 3.6, accent: '#b9bcb8', glass: '#5f8f8c' },
      bands: [{ colour: '#aaa79e', at: 0, h: 0.5, depth: 0.16, from: 1, to: 2 }],
      fins: [{ spacing: 7.2, depth: 0.3, t: 0.55, colour: '#aeaba2', from: 0 }],
      faces: [{ on: 'w', windows: { type: 'slit', bay: 4.5 } }], // 西山牆：白牆、少量小窗（2019 空拍）
      parapet: { h: 0.6, colour: '#a8a59c' },
      roof: { colour: '#4f8f7c' },
    };
  } else if (b.id === AI_ID) {
    // 3 層（室設系官網 2026 整棟南立面照：一樓入口層＋兩層樓；系網「愛樓三樓圖學工作室」）。灰色清水混凝土粉光、
    // 深灰近黑窗框；兩個長面二、三樓的窗（每層上下兩排＋淺藍窗下板）自建，MapBuilder 那兩層不畫窗；西端是深灰
    // 洗石子樓梯間。屋頂淺灰綠
    b.h = AI_H;
    b.floors = 3;
    b.look = {
      wall: { base: 'smooth', colour: '#b9bcbb' },
      windows: { type: 'punched', bay: 3.6, accent: '#34383b', glass: '#4a565c' },
      faces: [
        { on: 'long', windows: { type: 'none', ground: 'punched' } },
        { on: 'w', colour: '#5c5c57', windows: { type: 'slit' } },
      ],
      parapet: { h: 0.3, colour: '#b4b7b6' },
      roof: { colour: '#b8bfae' },
    };
  }
}

// ---------------- 保留範圍（src/core/Game.js reserved） ----------------
const ARCH_ENT = [
  [84.2, 260.9],
  [88.8, 249.3],
]; // 建築館入口牆
const ARCH_NW = [
  [91.1, 241.2],
  [98.5, 222.6],
]; // 北翼西面（變電箱在它前面）
const YUS_N = [
  [124.1, 233.7],
  [139.1, 228.0],
]; // 祐生北面
const DES = { p0: [195.8, 266.8], p1: [206.8, 231.7], p2: [224.8, 238.2], p3: [213.2, 272.4] };
const SUB = { s: 10.5, o: 4.2, w: 4.6 }; // 變電箱圍籬（沿北翼西面）
function rectOn(e, s0, s1, o0, o1) {
  return [e.at(s0, o0), e.at(s1, o0), e.at(s1, o1), e.at(s0, o1)];
}
export function zoneEFootprints() {
  const ent = edge(...ARCH_ENT),
    nw = edge(...ARCH_NW),
    yn = edge(...YUS_N);
  const de = edge(DES.p3, DES.p2),
    dw = edge(DES.p0, DES.p1);
  return [
    rectOn(ent, -0.5, ent.l + 0.5, 0, 5.5), // 建築館入口前院
    rectOn(
      nw,
      SUB.s - SUB.w / 2 - 0.5,
      SUB.s + SUB.w / 2 + 0.5,
      SUB.o - SUB.w / 2 - 0.5,
      SUB.o + SUB.w / 2 + 0.5
    ), // 變電箱
    rectOn(yn, -0.5, yn.l + 0.5, 0, 3.2), // 祐生框架＋台階
    rectOn(de, -0.5, de.l + 0.5, 0, 11), // 設計學院東側簷下＋廣場
    rectOn(dw, -0.5, dw.l + 0.5, 0, DES_EAVE + 0.4), // 西側簷下
  ];
}

// ---------------- 貼圖 ----------------
const TEX = {};
// canvas from src/graphics/GpuMemLifecycle.js (stored at the phone texture scale); this file keeps its own keys
function ctex(key, w, h, draw, repeat = true) {
  return TEX[key] || (TEX[key] = canvasTexture(w, h, draw, repeat));
}
// 洗石子：細碎石點＋往下流的雨痕（一張 = 4 × 4 m）
const washTex = () =>
  ctex('zeWash', 256, 256, (g, W, Hh) => {
    const r = lcg(11);
    g.fillStyle = '#b4b1aa';
    g.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 5000; i++) {
      const v = 70 + Math.floor(r() * 150);
      g.fillStyle = `rgba(${v},${v - 3},${v - 8},${0.25 + r() * 0.35})`;
      g.fillRect(r() * W, r() * Hh, 1 + r() * 1.6, 1 + r() * 1.6);
    }
    for (let i = 0; i < 14; i++) {
      const x = r() * W,
        w = 2 + r() * 7,
        h0 = r() * Hh * 0.3;
      const gr = g.createLinearGradient(0, h0, 0, h0 + 60 + r() * 180);
      gr.addColorStop(0, 'rgba(60,58,54,0.22)');
      gr.addColorStop(1, 'rgba(60,58,54,0)');
      g.fillStyle = gr;
      g.fillRect(x, h0, w, Hh);
    }
    g.fillStyle = 'rgba(80,78,72,0.35)';
    g.fillRect(0, Hh - 1, W, 1);
    g.fillRect(W - 1, 0, 1, Hh); // 分割縫
  });
// 爬藤：透明底，葉團；mode 'full' 幾乎蓋滿（留洞），'drape' 從上往下垂、越下越稀
function vineTex(mode, seed) {
  return ctex(`zeVine${mode}${seed}`, 512, 512, (g, W, Hh) => {
    const r = lcg(seed);
    const greens = ['#3d6a2c', '#4f7e34', '#628f3c', '#2f5524', '#76a145', '#557f2f'];
    const n1 = [r() * 6, r() * 6, r() * 6, r() * 6];
    const dens = (x, y) => {
      const nz =
        Math.sin((x / W) * 6.283 * 2 + n1[0]) * 0.5 +
        Math.sin((y / Hh) * 6.283 * 3 + n1[1]) * 0.4 +
        Math.sin(((x + y) / W) * 6.283 * 3 + n1[2]) * 0.35;
      if (mode === 'full') return 0.62 + nz * 0.3;
      // drape: 頂端密，往下變稀，再加幾條垂下來的藤
      const v = y / Hh;
      return 0.95 - v * 1.3 + nz * 0.3;
    };
    // 莖
    g.strokeStyle = 'rgba(70,58,40,0.55)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      let x = r() * W,
        y = mode === 'drape' ? 0 : r() * Hh;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 12; k++) {
        x += (r() - 0.5) * 30;
        y += 10 + r() * 25;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // 垂藤（drape）
    if (mode === 'drape')
      for (let i = 0; i < 26; i++) {
        const x0 = r() * W,
          len = Hh * (0.35 + r() * 0.6);
        for (let y = 0; y < len; y += 5) {
          g.fillStyle = greens[Math.floor(r() * greens.length)];
          g.beginPath();
          g.ellipse(
            x0 + Math.sin(y / 30) * 6 + (r() - 0.5) * 10,
            y,
            4 + r() * 4,
            3 + r() * 3,
            r() * 3,
            0,
            7
          );
          g.fill();
        }
      }
    for (let i = 0; i < 26000; i++) {
      const x = r() * W,
        y = r() * Hh;
      if (r() > dens(x, y)) continue;
      // 邊緣接得起來（RepeatWrapping）：靠邊的葉子在另一邊再畫一次
      const c = greens[Math.floor(r() * greens.length)],
        rx = 3 + r() * 5,
        ry = 2 + r() * 4,
        a = r() * 3.14;
      g.fillStyle = c;
      for (const dx of [0, x < 10 ? W : x > W - 10 ? -W : 0]) {
        g.beginPath();
        g.ellipse(x + dx, y, rx, ry, a, 0, 7);
        g.fill();
        if (dx === 0) break;
      }
      if (r() < 0.12) {
        g.fillStyle = 'rgba(200,230,150,0.5)';
        g.beginPath();
        g.ellipse(x - 1, y - 1, rx * 0.5, ry * 0.4, a, 0, 7);
        g.fill();
      }
    }
  });
}
// 「ARCH」凸字：和牆同色，只靠陰影看得出來
const archTex = () =>
  ctex(
    'zeArch',
    1024,
    256,
    (g, W, Hh) => {
      g.font = '900 210px "Arial Black","Helvetica Neue",Arial,sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(45,44,42,0.75)';
      g.fillText('ARCH', W / 2 + 6, Hh / 2 + 8);
      g.fillStyle = '#9a9a96';
      g.fillText('ARCH', W / 2, Hh / 2);
      g.strokeStyle = 'rgba(60,58,55,0.8)';
      g.lineWidth = 4;
      g.strokeText('ARCH', W / 2, Hh / 2);
    },
    false
  );
// 門牌：深灰底白字
const plateTex = (txt) =>
  ctex(
    `zePlate${txt}`,
    256,
    256,
    (g, W, Hh) => {
      g.fillStyle = '#6b6d70';
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(6, 6, W - 12, Hh - 12);
      g.fillStyle = '#f2f2f0';
      g.font = '600 120px "Helvetica Neue",Arial,sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(txt, W / 2, Hh * 0.42);
    },
    false
  );
// 變電箱圍籬：菱形鐵絲網
const meshTex = () =>
  ctex('zeChain', 128, 128, (g, W) => {
    g.clearRect(0, 0, W, W);
    g.strokeStyle = 'rgba(205,208,210,0.95)';
    g.lineWidth = 2.2;
    for (let k = -W; k <= W; k += 16) {
      g.beginPath();
      g.moveTo(k, 0);
      g.lineTo(k + W, W);
      g.stroke();
      g.beginPath();
      g.moveTo(k + W, 0);
      g.lineTo(k, W);
      g.stroke();
    }
  });
const dangerTex = () =>
  ctex(
    'zeDanger',
    256,
    160,
    (g, W, Hh) => {
      g.fillStyle = '#c4231f';
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#ffffff';
      g.font = '900 64px "PingFang TC","Noto Sans TC",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('高壓危險', W / 2, Hh * 0.38);
      g.font = '600 34px "PingFang TC","Noto Sans TC",sans-serif';
      g.fillText('請勿靠近', W / 2, Hh * 0.75);
    },
    false
  );
const stripeTex = () =>
  ctex('zeStripe', 32, 128, (g, W, Hh) => {
    for (let y = 0; y < Hh; y += 32) {
      g.fillStyle = '#c62a24';
      g.fillRect(0, y, W, 16);
      g.fillStyle = '#f2f2ee';
      g.fillRect(0, y + 16, W, 16);
    }
  });
// 祐生圓窗：古銅格框＋中間白色圓章（ARCHILIFE RESEARCH CENTER IN ARCHITECTURE）
const roundTex = () =>
  ctex(
    'zeRound',
    512,
    512,
    (g, W) => {
      const c = W / 2,
        R = W / 2;
      const gr = g.createLinearGradient(0, 0, 0, W);
      gr.addColorStop(0, '#4c5a60');
      gr.addColorStop(0.5, '#6a5c48');
      gr.addColorStop(1, '#2e2a26');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(c, c, R, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(255,214,150,0.35)';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(90 + i * 110, 120, 9, 0, 7);
        g.fill();
      }
      g.strokeStyle = '#8a6a3a';
      g.lineWidth = 11;
      for (const k of [-1, 1]) {
        g.beginPath();
        g.moveTo(c + (k * R) / 3, 0);
        g.lineTo(c + (k * R) / 3, W);
        g.stroke();
        g.beginPath();
        g.moveTo(0, c + (k * R) / 3);
        g.lineTo(W, c + (k * R) / 3);
        g.stroke();
      }
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(c, 0);
      g.lineTo(c, c - 70);
      g.moveTo(c, c + 70);
      g.lineTo(c, W);
      g.moveTo(0, c);
      g.lineTo(c - 70, c);
      g.moveTo(c + 70, c);
      g.lineTo(W, c);
      g.stroke();
      // 圓章
      g.fillStyle = '#e9e6dc';
      g.beginPath();
      g.arc(c, c, 66, 0, 7);
      g.fill();
      g.strokeStyle = '#3a3a3a';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(c, c, 58, 0, 7);
      g.stroke();
      g.fillStyle = '#3a3a3a';
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283;
        g.beginPath();
        g.arc(c + Math.cos(a) * 22, c + Math.sin(a) * 22, 13, 0, 7);
        g.fill();
      }
      g.lineWidth = 14;
      g.strokeStyle = '#7a5a30';
      g.beginPath();
      g.arc(c, c, R - 7, 0, 7);
      g.stroke();
    },
    false
  );
// 一般深凹窗玻璃：古銅框、橫檔、反光
const winTex = () =>
  ctex(
    'zeWin',
    256,
    256,
    (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, W, Hh);
      gr.addColorStop(0, '#5d6c74');
      gr.addColorStop(0.55, '#2f383d');
      gr.addColorStop(1, '#46525a');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(230,225,205,0.35)';
      g.fillRect(14, 16, W * 0.42, Hh * 0.5); // 窗簾
      g.fillStyle = '#7a6440';
      g.fillRect(0, 0, W, 10);
      g.fillRect(0, Hh - 10, W, 10);
      g.fillRect(0, 0, 10, Hh);
      g.fillRect(W - 10, 0, 10, Hh);
      g.fillRect(W / 2 - 4, 0, 8, Hh);
      g.fillRect(0, Hh * 0.68, W, 7);
    },
    false
  );
const curtainTex = () =>
  ctex(
    'zeCurtain',
    256,
    512,
    (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, W, Hh);
      gr.addColorStop(0, '#6f7f86');
      gr.addColorStop(0.5, '#3a464b');
      gr.addColorStop(1, '#55636a');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(30,30,28,0.5)';
      for (let i = 0; i < 6; i++) g.fillRect(40 + i * 28, 330 - i * 42, 60, 8); // 裡面的樓梯
      g.fillStyle = '#7a6440';
      for (const x of [0, W / 2 - 3, W - 8]) g.fillRect(x, 0, 8, Hh);
      for (const y of [0, Hh / 4, Hh / 2, (3 * Hh) / 4, Hh - 8]) g.fillRect(0, y, W, 8);
    },
    false
  );
// 設計學院入口：玻璃門上的磨砂字、白底招牌
const desGlassTex = () =>
  ctex(
    'zeDesGlass',
    512,
    384,
    (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, 0, Hh);
      gr.addColorStop(0, '#3e484c');
      gr.addColorStop(1, '#22282a');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(255,220,170,0.28)';
      g.fillRect(40, 60, W - 80, 160);
      g.fillStyle = 'rgba(235,238,236,0.9)';
      g.textBaseline = 'middle';
      g.font = '700 40px "Helvetica Neue",Arial,sans-serif';
      g.fillText('SCHOOL', 22, 160);
      g.fillText('OF', 70, 205);
      g.font = '800 78px "Helvetica Neue",Arial,sans-serif';
      g.fillText('DESIGN', 150, 185);
      g.fillStyle = '#1d1f20';
      for (const x of [0, W * 0.27, W * 0.62, W - 8]) g.fillRect(x, 0, 8, Hh);
      g.fillRect(0, 0, W, 10);
      g.fillRect(0, Hh - 10, W, 10);
      g.fillRect(0, Hh * 0.28, W, 6);
    },
    false
  );
const desSignTex = () =>
  ctex(
    'zeDesSign',
    768,
    220,
    (g, W, Hh) => {
      g.fillStyle = '#f1efe8';
      g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#2b2b2b';
      g.lineWidth = 6;
      g.strokeRect(3, 3, W - 6, Hh - 6);
      g.font = '900 150px "Kaiti TC","BiauKai","STKaiti","Noto Serif TC",serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(60,30,20,0.35)';
      g.fillText('設 計 學 院', W / 2 + 4, Hh / 2 + 6);
      g.fillStyle = '#6b3524';
      g.fillText('設 計 學 院', W / 2, Hh / 2);
    },
    false
  );
// 廣場：紅磚色與灰色相間的方磚（一張 = 4 × 4 m）
const paveTex = () =>
  ctex('zePave', 256, 256, (g, W) => {
    const r = lcg(5),
      n = 10,
      s = W / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const red = Math.floor(j / 2) % 3 === 1;
        const k = 0.9 + r() * 0.15,
          c = red ? [168, 110, 96] : [172, 168, 160];
        g.fillStyle = `rgb(${c.map((v) => Math.round(v * k))})`;
        g.fillRect(i * s, j * s, s, s);
      }
    g.strokeStyle = 'rgba(70,64,58,0.55)';
    g.lineWidth = 1.5;
    for (let k = 0; k <= W; k += s) {
      g.beginPath();
      g.moveTo(k, 0);
      g.lineTo(k, W);
      g.moveTo(0, k);
      g.lineTo(W, k);
      g.stroke();
    }
  });
const soilTex = () =>
  ctex('zeSoil', 128, 128, (g, W) => {
    const r = lcg(9);
    g.fillStyle = '#5a4f3c';
    g.fillRect(0, 0, W, W);
    for (let i = 0; i < 900; i++) {
      g.fillStyle =
        r() < 0.55
          ? `rgba(${70 + r() * 50},${100 + r() * 50},${40 + r() * 20},0.8)`
          : 'rgba(40,34,26,0.5)';
      g.fillRect(r() * W, r() * W, 2 + r() * 3, 2 + r() * 3);
    }
  });

// 望樓二樓中央的大格子窗：古銅框 4 × 4 格，上面兩個百葉口（Commons Wanglou_20160519）
const wangGridTex = () =>
  ctex(
    'zeWangGrid',
    256,
    320,
    (g, W, Hh) => {
      const BR = '#6d5a40';
      g.fillStyle = BR;
      g.fillRect(0, 0, W, Hh);
      const yl = 70; // 百葉口
      for (const x0 of [14, W / 2 + 6]) {
        g.fillStyle = '#c9c4b8';
        g.fillRect(x0, 10, W / 2 - 20, yl - 20);
        g.fillStyle = 'rgba(60,52,40,0.8)';
        for (let y = 14; y < yl - 12; y += 7) g.fillRect(x0 + 3, y, W / 2 - 26, 3);
      }
      const gr = g.createLinearGradient(0, yl, 0, Hh);
      gr.addColorStop(0, '#8a8f8e');
      gr.addColorStop(0.5, '#3c4448');
      gr.addColorStop(1, '#565e62');
      g.fillStyle = gr;
      g.fillRect(8, yl, W - 16, Hh - yl - 8);
      g.fillStyle = 'rgba(240,228,200,0.35)';
      g.fillRect(20, yl + 20, 60, 120);
      g.fillRect(150, yl + 60, 70, 90); // 窗簾
      g.fillStyle = BR;
      for (let i = 0; i <= 4; i++) g.fillRect(8 + (i * (W - 16)) / 4 - 3, yl, 6, Hh - yl - 8);
      for (let j = 0; j <= 4; j++) g.fillRect(8, yl + (j * (Hh - yl - 8)) / 4 - 3, W - 16, 6);
    },
    false
  );
// 望樓入口開間的牆：淡紫灰小磁磚（一張 = 2 × 2 m）
const wangTileTex = () =>
  ctex('zeWangTile', 256, 256, (g, W) => {
    const r = lcg(53);
    g.fillStyle = '#b9b5bd';
    g.fillRect(0, 0, W, W);
    for (let y = 0; y < W; y += 8)
      for (let x = 0; x < W; x += 8) {
        const v = 212 + Math.round((r() - 0.5) * 12);
        g.fillStyle = `rgb(${v},${v - 3},${v + 4})`;
        g.fillRect(x + 1, y + 1, 6, 6);
      }
  });
// 望樓一樓的玻璃門：古銅框雙開門，上面一條氣窗
const wangDoorTex = () =>
  ctex(
    'zeWangDoor',
    256,
    320,
    (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, 0, Hh);
      gr.addColorStop(0, '#59646a');
      gr.addColorStop(1, '#262c2f');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(255,226,180,0.22)';
      g.fillRect(40, 80, W - 80, 160);
      g.fillStyle = '#6d5a40';
      g.fillRect(0, 0, W, 12);
      g.fillRect(0, Hh - 10, W, 10);
      g.fillRect(0, 0, 12, Hh);
      g.fillRect(W - 12, 0, 12, Hh);
      g.fillRect(W / 2 - 5, 50, 10, Hh);
      g.fillRect(0, 46, W, 9); // 中梃、氣窗橫檔
      g.fillStyle = '#c8c2b0';
      g.fillRect(W / 2 - 22, 170, 8, 46);
      g.fillRect(W / 2 + 14, 170, 8, 46); // 門把
    },
    false
  );
// 木條地板（一張 = 2 × 2 m，板子沿 u）
const plankTex = () =>
  ctex('zePlank', 256, 256, (g, W) => {
    const r = lcg(31),
      n = 12,
      s = W / n;
    for (let j = 0; j < n; j++) {
      const v = 0.82 + r() * 0.3;
      g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(108 * v)},${Math.round(72 * v)})`;
      g.fillRect(0, j * s, W, s - 2);
      g.fillStyle = 'rgba(30,20,12,0.7)';
      g.fillRect(0, j * s + s - 2, W, 2);
    }
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(60,40,24,${r() * 0.25})`;
      g.fillRect(r() * W, r() * W, 10 + r() * 30, 1);
    }
  });
// 信樓玄關前的深棕橫木板牆（一張 = 2 × 2 m）
const boardTex = () =>
  ctex('zeBoard', 256, 256, (g, W) => {
    const r = lcg(37),
      n = 9,
      s = W / n;
    for (let j = 0; j < n; j++) {
      const v = 0.85 + r() * 0.25;
      g.fillStyle = `rgb(${Math.round(139 * v)},${Math.round(94 * v)},${Math.round(60 * v)})`;
      g.fillRect(0, j * s, W, s - 3);
      g.fillStyle = 'rgba(40,26,16,0.85)';
      g.fillRect(0, j * s + s - 3, W, 3);
    }
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(70,44,26,${r() * 0.3})`;
      g.fillRect(r() * W, r() * W, 14 + r() * 40, 1);
    }
    g.fillStyle = 'rgba(40,26,16,0.6)';
    g.fillRect(W / 2, 0, 2, W);
  });
// 卵石步道板
const pebbleTex = () =>
  ctex('zePebble', 128, 128, (g, W) => {
    const r = lcg(43);
    g.fillStyle = '#6f6b64';
    g.fillRect(0, 0, W, W);
    for (let i = 0; i < 1500; i++) {
      const v = 95 + r() * 100;
      g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      g.beginPath();
      g.ellipse(r() * W, r() * W, 1.5 + r() * 2.5, 1.2 + r() * 2, r() * 3, 0, 7);
      g.fill();
    }
  });
// 信樓凹入式玄關：裡面偏暗、萊姆綠框玻璃門、右邊公告板
const landPorchTex = () =>
  ctex(
    'zeLandPorch',
    512,
    320,
    (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, 0, Hh);
      gr.addColorStop(0, '#3b3d3a');
      gr.addColorStop(1, '#1f201e');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(255,236,200,0.3)';
      g.fillRect(30, 70, 250, 190);
      g.fillStyle = '#7ba23a';
      for (const x of [24, 150, 276]) g.fillRect(x, 40, 12, Hh - 40);
      g.fillRect(24, 40, 264, 12);
      g.fillRect(24, Hh - 8, 264, 8);
      g.fillStyle = '#d9d3c4';
      g.fillRect(330, 80, 120, 150);
      g.fillStyle = '#e08a3a';
      for (let i = 0; i < 14; i++)
        g.fillRect(340 + (i % 4) * 26, 92 + Math.floor(i / 4) * 32, 18, 18);
      g.fillStyle = '#7ba23a';
      g.fillRect(470, 0, 26, Hh);
    },
    false
  );
// 「望樓」金字（由右往左讀：左邊是「樓」）、「信樓」紅字白底、英文系名
const wangSignTex = () =>
  ctex(
    'zeWangSign',
    512,
    192,
    (g, W, Hh) => {
      g.font = '900 150px "Kaiti TC","BiauKai","STKaiti","Noto Serif TC",serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(60,45,20,0.6)';
      g.fillText('樓　望', W / 2 + 4, Hh / 2 + 5);
      g.fillStyle = '#d4ae4c';
      g.fillText('樓　望', W / 2, Hh / 2);
      g.strokeStyle = '#8a6a22';
      g.lineWidth = 3;
      g.strokeText('樓　望', W / 2, Hh / 2);
    },
    false
  );
const xinSignTex = () =>
  ctex(
    'zeXinSign',
    512,
    160,
    (g, W, Hh) => {
      g.fillStyle = '#e9e6de';
      g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#8a8478';
      g.lineWidth = 6;
      g.strokeRect(3, 3, W - 6, Hh - 6);
      g.font = '900 118px "Kaiti TC","BiauKai","STKaiti","Noto Serif TC",serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#c8241e';
      g.fillText('樓　信', W / 2, Hh / 2 + 4);
    },
    false
  );
const landNameTex = () =>
  ctex(
    'zeLandName',
    1024,
    96,
    (g, W, Hh) => {
      g.font = '600 52px "Helvetica Neue",Arial,sans-serif';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillText('Department of Landscape Architecture', 6, Hh / 2 + 3);
      g.fillStyle = '#f2efe6';
      g.fillText('Department of Landscape Architecture', 4, Hh / 2);
    },
    false
  );

// 紅褐色浪板屋頂（一張 = 2 × 2 m，橫紋）
const tinTex = () =>
  ctex('zeTin', 64, 64, (g, W) => {
    for (let y = 0; y < W; y += 8) {
      g.fillStyle = '#8f4a36';
      g.fillRect(0, y, W, 5);
      g.fillStyle = '#6f3729';
      g.fillRect(0, y + 5, W, 3);
    }
  });
// 「愛樓」深灰金屬字（由左往右讀）
const aiSignTex = () =>
  ctex(
    'zeAiSign',
    512,
    128,
    (g, W, Hh) => {
      g.font = '900 100px "Kaiti TC","BiauKai","STKaiti","Noto Serif TC",serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const [ch, x] of [
        ['愛', W * 0.27],
        ['樓', W * 0.73],
      ]) {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillText(ch, x + 3, Hh / 2 + 4);
        g.fillStyle = '#4a4a48';
        g.fillText(ch, x, Hh / 2);
      }
    },
    false
  );
// 愛樓入口方框裡的整面霧面玻璃：深灰鋁框、上面一排氣窗、中間對開門
const aiFrontTex = () =>
  ctex(
    'zeAiFront',
    1024,
    320,
    (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, 0, Hh);
      gr.addColorStop(0, '#d3d7d6');
      gr.addColorStop(1, '#b3b8b8');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      const r = lcg(71);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(255,255,255,${r() * 0.12})`;
        g.fillRect(r() * W, r() * Hh, 40 + r() * 80, Hh);
      }
      g.fillStyle = '#3d4144';
      g.fillRect(0, 0, W, 8);
      g.fillRect(0, Hh - 10, W, 10);
      g.fillRect(0, 62, W, 7);
      for (let i = 0; i <= 10; i++)
        g.fillRect(Math.min(W - 8, (i * W) / 10 - (i ? 4 : 0)), 0, 8, 66); // 氣窗直料
      for (const x of [0, 0.115, 0.19, 0.265, 0.34, 0.415, 0.585, 0.66, 0.735, 0.81, 0.885, 1])
        g.fillRect(Math.min(W - 8, Math.max(0, x * W - 4)), 62, 8, Hh);
      g.fillRect(W * 0.415, 62, W * 0.17, 5);
      g.fillRect(W * 0.5 - 4, 62, 8, Hh); // 門
      g.fillStyle = '#9aa0a0';
      g.fillRect(W * 0.5 - 22, 190, 6, 44);
      g.fillRect(W * 0.5 + 16, 190, 6, 44);
      for (const x of [0.02, 0.9]) {
        g.fillStyle = '#3d4144';
        g.fillRect(x * W, 150, 0.08 * W, 6);
        g.fillRect(x * W, 215, 0.08 * W, 6);
      } // 兩側的推射窗
    },
    false
  );
// 愛樓二、三樓一個開間（約 4.5 × 3.3 m）：灰色清水混凝土、兩樘窗各分上下兩排、窗下淺藍板、開間邊一根白色排水管
const aiBayTex = () =>
  ctex(
    'zeAiBay',
    384,
    256,
    (g, W, Hh) => {
      const r = lcg(73);
      g.fillStyle = '#b9bcbb';
      g.fillRect(0, 0, W, Hh);
      for (let i = 0; i < 700; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '70,72,72' : '235,238,238'},${r() * 0.1})`;
        g.fillRect(r() * W, r() * Hh, 2 + r() * 6, 1 + r() * 3);
      }
      g.fillStyle = 'rgba(70,72,72,0.28)';
      g.fillRect(0, Hh - 2, W, 2);
      g.fillRect(W / 2, 0, 1, 20);
      g.fillRect(W / 2, 208, 1, 48); // 模板分割線
      for (const cx of [0.3, 0.7]) {
        const x0 = (cx - 0.15) * W,
          w = 0.3 * W;
        g.fillStyle = '#bfdfe0';
        g.fillRect(x0, 150, w, 56); // 淺藍窗下板
        for (const [y0, h] of [
          [22, 48],
          [82, 68],
        ]) {
          g.fillStyle = '#2e3134';
          g.fillRect(x0, y0, w, h);
          const gr = g.createLinearGradient(0, y0, 0, y0 + h);
          gr.addColorStop(0, '#7d8a8e');
          gr.addColorStop(1, '#4a565c');
          g.fillStyle = gr;
          g.fillRect(x0 + 4, y0 + 4, w / 2 - 6, h - 8);
          g.fillRect(x0 + w / 2 + 2, y0 + 4, w / 2 - 6, h - 8);
          if (r() < 0.7) {
            g.fillStyle = 'rgba(214,196,160,0.75)';
            g.fillRect(x0 + (r() < 0.5 ? 4 : w / 2 + 2), y0 + 4, w / 2 - 6, h - 8);
          } // 窗簾
        }
      }
      g.fillStyle = '#e4e6e4';
      g.fillRect(2, 0, 7, Hh);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fillRect(9, 0, 2, Hh); // 排水管
    },
    false
  );
// 愛樓西端的深灰洗石子樓梯間（4.8 × 10.5 m）：窗的高度和主體錯開，一樓有百葉門和金色樓層指示牌
const aiStairTex = () =>
  ctex(
    'zeAiStair',
    256,
    512,
    (g, W, Hh) => {
      const r = lcg(79);
      g.fillStyle = '#4c4c48';
      g.fillRect(0, 0, W, Hh);
      for (let i = 0; i < 6000; i++) {
        const v = 40 + r() * 110;
        g.fillStyle = `rgba(${v},${v},${v - 4},0.5)`;
        g.fillRect(r() * W, r() * Hh, 1.5, 1.5);
      }
      g.fillStyle = 'rgba(20,20,20,0.5)';
      for (let y = 0; y < Hh; y += 64) g.fillRect(0, y, W, 2);
      for (const y0 of [70, 215, 330]) {
        g.fillStyle = '#26282a';
        g.fillRect(36, y0, 190, 62);
        const gr = g.createLinearGradient(0, y0, 0, y0 + 62);
        gr.addColorStop(0, '#6f7c80');
        gr.addColorStop(1, '#3d484d');
        g.fillStyle = gr;
        for (let i = 0; i < 3; i++) g.fillRect(40 + i * 62, y0 + 4, 58, 54);
        g.fillStyle = 'rgba(214,196,160,0.6)';
        g.fillRect(40 + Math.floor(r() * 3) * 62, y0 + 4, 58, 54);
      }
      g.fillStyle = '#2c2d2c';
      g.fillRect(36, 410, 190, 22); // 一樓橫窗
      g.fillStyle = '#6a6359';
      g.fillRect(30, 446, 56, 66);
      g.fillStyle = 'rgba(20,20,20,0.6)';
      for (let y = 450; y < 510; y += 6) g.fillRect(33, y, 50, 2); // 百葉門
      g.fillStyle = '#c9b06a';
      g.fillRect(118, 440, 100, 56);
      g.fillStyle = '#efe9d8';
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 4; j++) g.fillRect(124 + i * 31, 446 + j * 12, 26, 8); // 樓層指示牌
    },
    false
  );

const MATS = {};
const glowMats = [];
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.88, ...o });
  const glow = (o, k = 1) => {
    const m = std({ emissive: '#ffd49a', emissiveIntensity: 0, ...o });
    m.userData.glow = k;
    glowMats.push(m);
    return m;
  };
  const vine = (t) =>
    new THREE.MeshStandardMaterial({
      map: t,
      color: '#b9c4a8',
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.95,
    });
  const m = {
    wash: () => std({ map: washTex(), color: '#d6d3cc' }), // 建築館洗石子
    washY: () => std({ map: washTex(), color: '#b2afa8' }), // 祐生（偏深灰）
    washLow: () => std({ map: washTex(), color: '#e2ddd2' }), // 入口一樓較淺的洗石子
    soffit: () => std({ color: '#8f8d87', side: THREE.DoubleSide }),
    white: () => std({ color: '#eeeeea', roughness: 0.6 }),
    red: () => std({ color: '#b0242a', roughness: 0.55 }),
    glass: () =>
      glow({ color: '#2e3a40', roughness: 0.12, metalness: 0.5, emissiveIntensity: 0 }, 0.45),
    win: () => glow({ map: winTex(), roughness: 0.2, metalness: 0.35, emissiveMap: winTex() }),
    curtain: () =>
      glow({ map: curtainTex(), roughness: 0.15, metalness: 0.4, emissiveMap: curtainTex() }),
    round: () => glow({ map: roundTex(), roughness: 0.2, metalness: 0.3, emissiveMap: roundTex() }),
    bronze: () => std({ color: '#6e5636', metalness: 0.6, roughness: 0.45 }),
    black: () => std({ color: '#1f1f20', metalness: 0.4, roughness: 0.5 }),
    steel: () => std({ color: '#b9bdc0', metalness: 0.7, roughness: 0.35 }),
    conc: () => std({ map: washTex(), color: '#c9c5bb' }),
    concDark: () => std({ color: '#6c6963' }),
    box: () => std({ color: '#c8c2b2' }),
    vineFull: () => vine(vineTex('full', 21)),
    vineFull2: () => vine(vineTex('full', 47)),
    vineDrape: () => vine(vineTex('drape', 33)),
    leaf: () => std({ color: '#4c7a33', roughness: 0.95 }),
    shrub: () => std({ color: '#3f6a2c', roughness: 0.95 }),
    soil: () => std({ map: soilTex(), roughness: 1, side: THREE.DoubleSide }),
    fence: () =>
      new THREE.MeshStandardMaterial({
        map: meshTex(),
        alphaTest: 0.3,
        side: THREE.DoubleSide,
        metalness: 0.5,
        roughness: 0.5,
      }),
    stripe: () => std({ map: stripeTex() }),
    roofTop: () => std({ color: '#bcbbb5', roughness: 0.8 }),
    eaveUnder: () => std({ color: '#4a4d50', roughness: 0.9, side: THREE.DoubleSide }),
    desGlass: () =>
      glow({ map: desGlassTex(), roughness: 0.15, metalness: 0.3, emissiveMap: desGlassTex() }),
    pave: () => std({ map: paveTex(), roughness: 0.92 }),
    granite: () => std({ map: washTex(), color: '#a6a39c', roughness: 0.9 }),
    pot: () => std({ color: '#b5602f', roughness: 0.8 }),
    // 望樓、信樓
    wangBlue: () => std({ color: '#9fc8d4', roughness: 0.75 }),
    wangWall: () => std({ map: wangTileTex(), roughness: 0.8 }),
    wangPanel: () => std({ color: '#7a7480', roughness: 0.7 }), // 窗下深灰褐板
    wangPipe: () => std({ color: '#b4b1b8', roughness: 0.6 }), // 開間柱上的排水管
    wangRoofGrey: () => std({ color: '#8d9296', roughness: 0.7, side: THREE.DoubleSide }),
    wangRoofTile: () => std({ color: '#b5694a', roughness: 0.85, side: THREE.DoubleSide }),
    wangGable: () => std({ color: '#d9d6dc', roughness: 0.8, side: THREE.DoubleSide }),
    wangGrid: () =>
      glow({ map: wangGridTex(), roughness: 0.2, metalness: 0.35, emissiveMap: wangGridTex() }),
    wangDoor: () =>
      glow({ map: wangDoorTex(), roughness: 0.2, metalness: 0.35, emissiveMap: wangDoorTex() }),
    deckWood: () => std({ map: plankTex(), color: '#8e887e', roughness: 0.9 }), // 曬舊的灰褐木板
    boardWall: () => std({ map: boardTex(), roughness: 0.85 }),
    pebble: () => std({ map: pebbleTex(), roughness: 0.95 }),
    landOrange: () => std({ color: '#d5612c', roughness: 0.6 }),
    lime: () => std({ color: '#7ba23a', metalness: 0.35, roughness: 0.45 }),
    landPorch: () =>
      glow(
        { map: landPorchTex(), roughness: 0.3, metalness: 0.2, emissiveMap: landPorchTex() },
        0.6
      ),
    bark: () => std({ map: washTex(), color: '#8a7f6c', roughness: 0.95 }),
    canopy: () => std({ color: '#3f6d2d', roughness: 0.95 }),
    canopy2: () => std({ color: '#53823a', roughness: 0.95 }),
    canopy3: () => std({ color: '#2f5a24', roughness: 0.95 }),
    aiFront: () =>
      glow({ map: aiFrontTex(), roughness: 0.35, metalness: 0.1, emissiveMap: aiFrontTex() }, 0.5),
    aiBay: () => glow({ map: aiBayTex(), roughness: 0.7, emissiveMap: aiBayTex() }, 0.25),
    aiStair: () => glow({ map: aiStairTex(), roughness: 0.9, emissiveMap: aiStairTex() }, 0.2),
    aiWhite: () => std({ color: '#e9e9e5', roughness: 0.7 }),
    aiGrey: () => std({ color: '#b9bcbb', roughness: 0.85, side: THREE.DoubleSide }),
    aiTin: () => std({ map: tinTex(), roughness: 0.7, side: THREE.DoubleSide }),
    landBrown: () => std({ color: '#b5653a', roughness: 0.65 }),
    aiAlu: () => std({ color: '#43474a', metalness: 0.5, roughness: 0.45 }),
    aiCon: () => std({ map: washTex(), color: '#d2d4d2', roughness: 0.9 }),
    acUnit: () => std({ color: '#e6e6e2', roughness: 0.6 }),
  }[key];
  return (MATS[key] = m());
}
const textMat = (tex, emissive = 0, color = '#ffffff') =>
  new THREE.MeshStandardMaterial({
    color,
    map: tex,
    transparent: true,
    alphaTest: 0.05,
    roughness: 0.6,
    emissive: '#ffffff',
    emissiveMap: tex,
    emissiveIntensity: emissive,
  });

// ---------------- 幾何（世界座標，依材質合併） ----------------
class Acc {
  constructor() {
    this.parts = new Map();
  }
  add(m, g) {
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.uv) return g;
    if (!this.parts.has(m)) this.parts.set(m, []);
    this.parts.get(m).push(g);
    return g;
  }
  // 沿方向 ang 擺的盒子：w 沿邊、d 垂直邊，中心 (x, z)
  obox(m, x, z, ang, w, d, y0, y1, tile) {
    const g = new THREE.BoxGeometry(w, y1 - y0, d);
    if (tile) {
      const uv = g.attributes.uv,
        dims = [
          [d, y1 - y0],
          [d, y1 - y0],
          [w, d],
          [w, d],
          [w, y1 - y0],
          [w, y1 - y0],
        ];
      for (let f = 0; f < 6; f++)
        for (let k = 0; k < 4; k++) {
          const i = f * 4 + k;
          uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
        }
    }
    g.rotateY(-ang);
    g.translate(x, (y0 + y1) / 2, z);
    return this.add(m, g);
  }
  // 沿邊 e 的一段盒子：s0..s1、離牆 o0..o1
  onEdge(m, e, s0, s1, o0, o1, y0, y1, tile) {
    const p = e.at((s0 + s1) / 2, (o0 + o1) / 2);
    return this.obox(m, p[0], p[1], e.ang, s1 - s0, o1 - o0, y0, y1, tile);
  }
  // 朝外的面（沿邊 e，s0..s1，離牆 o，y0..y1）；tile: 每 tile 公尺重複一次，或 'stretch'
  face(m, e, s0, s1, o, y0, y1, tile = 4) {
    const A = e.at(s0, o),
      B = e.at(s1, o);
    const pos = [
      A[0],
      y0,
      A[1],
      B[0],
      y0,
      B[1],
      B[0],
      y1,
      B[1],
      A[0],
      y0,
      A[1],
      B[0],
      y1,
      B[1],
      A[0],
      y1,
      A[1],
    ];
    const u0 = tile === 'stretch' ? 1 : -s0 / tile,
      u1 = tile === 'stretch' ? 0 : -s1 / tile,
      v0 = tile === 'stretch' ? 0 : y0 / tile,
      v1 = tile === 'stretch' ? 1 : y1 / tile;
    const uv = [u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(Array(6).fill([e.nx, 0, e.nz]).flat(), 3)
    );
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // 從法線那側看要逆時針
    const e1 = [B[0] - A[0], 0, B[1] - A[1]],
      e2 = [B[0] - A[0], y1 - y0, B[1] - A[1]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1],
      cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (cx * e.nx + cz * e.nz < 0) {
      const p = g.attributes.position.array,
        q = g.attributes.uv.array;
      for (const i of [0, 3]) {
        for (let k = 0; k < 3; k++) {
          const t = p[(i + 1) * 3 + k];
          p[(i + 1) * 3 + k] = p[(i + 2) * 3 + k];
          p[(i + 2) * 3 + k] = t;
        }
        for (let k = 0; k < 2; k++) {
          const t = q[(i + 1) * 2 + k];
          q[(i + 1) * 2 + k] = q[(i + 2) * 2 + k];
          q[(i + 2) * 2 + k] = t;
        }
      }
    }
    return this.add(m, g);
  }
  // 任意三角形／四邊形（給屋簷），自動算法線，uv 用 xz／tile
  poly(m, P, tile = 4, flip = false) {
    const pos = [],
      uv = [];
    const tris =
      P.length === 3
        ? [[0, 1, 2]]
        : [
            [0, 1, 2],
            [0, 2, 3],
          ];
    for (const t of tris)
      for (const i of flip ? [t[0], t[2], t[1]] : t) {
        pos.push(...P[i]);
        uv.push(P[i][0] / tile, (P[i][2] + P[i][1]) / tile);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return this.add(m, g);
  }
  // 水平多邊形（朝上），跟著地形的 y 由 yAt(x, z) 給（細分格子）
  ground(m, pts, yAt, tile = 4, step = 1.5) {
    let x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9;
    for (const [x, z] of pts) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    const pos = [],
      uv = [],
      inP = (x, z) => {
        let c = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, zi] = pts[i],
            [xj, zj] = pts[j];
          if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
        }
        return c;
      };
    for (let x = x0; x < x1; x += step)
      for (let z = z0; z < z1; z += step) {
        const q = [
          [x, z],
          [x + step, z],
          [x + step, z + step],
          [x, z + step],
        ];
        if (!inP(x + step / 2, z + step / 2)) continue;
        for (const i of [0, 2, 1, 0, 3, 2]) {
          const [qx, qz] = q[i];
          pos.push(qx, yAt(qx, qz), qz);
          uv.push(qx / tile, qz / tile);
        }
      }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return this.add(m, g);
  }
  cyl(m, x, z, r, y0, y1, seg = 12) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg);
    g.translate(x, (y0 + y1) / 2, z);
    return this.add(m, g);
  }
  blob(m, x, y, z, sx, sy, sz) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    return this.add(m, g);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), typeof m === 'string' ? mat(m) : m);
      const see = typeof m === 'string' && (m.startsWith('vine') || m === 'fence');
      mesh.castShadow = !see && m !== 'pave';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
// 擋人的矩形（沿邊 e）。Interiors 的牆高、地面高都是「相對地面」（src/physics/PhysWorld.js 會加牆中點的地面高；
// Kit.js resolve 用玩家離地高度比），所以 y0、y1 給離地高度，不要給世界座標
function blockOn(I, e, s0, s1, o0, o1, y0, y1) {
  const c = rectOn(e, s0, s1, o0, o1);
  for (let i = 0; i < 4; i++) {
    const a = c[i],
      b = c[(i + 1) % 4];
    I.addWall(a[0], a[1], b[0], b[1], y0, y1);
  }
}

// ---------------- 建築館 ----------------
function buildArch(k, I, b, group) {
  const base = b.base,
    ent = edge(...ARCH_ENT),
    L = ent.l,
    Y = (y) => base + y;
  // 入口上方的深出簷：一樓退進去，二樓以上的牆往外推 2.6 m（跨在爬藤方塊和圓弧高牆的側牆之間）
  const OV = 2.6,
    Y0 = 4.4,
    YT = 10.5 + 0.5;
  k.onEdge('wash', ent, 0, L, 0, OV, Y(Y0), Y(YT), 4);
  {
    const P = [ent.at(0, 0), ent.at(L, 0), ent.at(L, OV), ent.at(0, OV)];
    k.poly(
      'soffit',
      P.map(([x, z]) => [x, Y(Y0 - 0.01), z]),
      4,
      true
    );
  }
  // 出簷上掛的爬藤（2023 綠、2018／2025 冬天只剩藤網）：前面垂一片
  k.face('vineDrape', ent, 0.3, L - 0.3, OV + 0.06, Y(Y0 + 0.3), Y(YT), 'stretch');
  // 簷下：一樓較淺的洗石子牆面、9 個白框細高側窗、鮮紅雙開門
  k.face('washLow', ent, 0, L, 0.03, Y(-0.3), Y(Y0), 4);
  const nWin = 9,
    sp = 1.3,
    s0w = L / 2 - ((nWin - 1) * sp) / 2;
  for (let i = 0; i < nWin; i++) {
    const s = s0w + i * sp;
    k.onEdge('white', ent, s - 0.27, s + 0.27, 0.0, 0.1, Y(2.85), Y(4.2));
    k.onEdge('glass', ent, s - 0.19, s + 0.19, 0.1, 0.12, Y(2.95), Y(4.1));
  }
  // 門：門框凹進的淺色洗石子框、紅色門框和兩片紅門扇、中間玻璃
  const sd = L / 2;
  k.onEdge('washLow', ent, sd - 1.9, sd + 1.9, 0.0, 0.14, Y(2.75), Y(2.95));
  k.onEdge('red', ent, sd - 1.55, sd - 1.1, 0.0, 0.22, Y(0), Y(2.7));
  k.onEdge('red', ent, sd + 1.1, sd + 1.55, 0.0, 0.22, Y(0), Y(2.7));
  k.onEdge('red', ent, sd - 1.55, sd + 1.55, 0.0, 0.22, Y(2.5), Y(2.7));
  k.onEdge('glass', ent, sd - 1.1, sd + 1.1, 0.05, 0.08, Y(0), Y(2.5));
  k.onEdge('red', ent, sd - 1.1, sd - 0.75, 0.08, 0.14, Y(0), Y(2.45)); // 開著的門扇邊緣
  k.onEdge('red', ent, sd + 0.75, sd + 1.1, 0.08, 0.14, Y(0), Y(2.45));
  // 出簷下的嵌燈
  for (const s of [L * 0.25, L * 0.5, L * 0.75])
    k.onEdge('white', ent, s - 0.15, s + 0.15, 1.2, 1.5, Y(Y0 - 0.03), Y(Y0 - 0.01));
  // 前院：靠高牆那側的長方形矮花台（修剪灌木）、沿爬藤方塊的粗洗石子矮牆＋門牌「15」
  const yg = (s, o) => {
    const p = ent.at(s, o);
    return groundY(p[0], p[1]);
  };
  {
    const s = 1.0,
      gy0 = yg(s + 2.5, 4) - 0.1;
    k.onEdge('conc', ent, s, s + 5, 3.4, 4.6, gy0, gy0 + 0.55, 2);
    k.onEdge('shrub', ent, s + 0.15, s + 4.85, 3.55, 4.45, gy0 + 0.55, gy0 + 0.95);
    blockOn(I, ent, s, s + 5, 3.4, 4.6, -0.5, 0.95);
  }
  const ivyR = edge([88.8, 249.3], [81.1, 246.3]); // 爬藤方塊朝南的側牆（前院北邊）
  {
    // 方塊側牆前一條草地，外緣是粗洗石子矮牆，西端掛門牌「15」（2025 相片左下）。方塊西面緊貼校內路，那邊不放
    const gy0 = Math.min(groundY(...ivyR.at(0, 2.2)), groundY(...ivyR.at(ivyR.l, 2.2))) - 0.1;
    k.onEdge('conc', ivyR, 0, ivyR.l + 0.2, 2.0, 2.4, gy0, gy0 + 0.85, 2);
    blockOn(I, ivyR, 0, ivyR.l + 0.2, 2.0, 2.4, -0.5, 0.85);
    k.onEdge('conc', ivyR, ivyR.l - 0.2, ivyR.l + 0.2, 0, 2.0, gy0, gy0 + 0.85, 2);
    k.onEdge('leaf', ivyR, 0.1, ivyR.l - 0.2, 0.15, 2.0, gy0 + 0.55, gy0 + 0.65);
    const w = edge([81.1, 246.3], [84.2, 238.5]),
      p = ivyR.at(ivyR.l + 0.22, 1.5),
      pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), textMat(plateTex('15')));
    pl.position.set(p[0], gy0 + 0.5, p[1]);
    pl.rotation.y = Math.atan2(w.nx, w.nz);
    group.add(pl);
  }
  // 爬藤方塊：白框窗（3 層），窗框凸出藤蔓面
  const ivyFaces = [
    [ivyR, 2],
    [edge([81.1, 246.3], [84.2, 238.5]), 2],
    [edge([84.2, 238.5], [91.1, 241.2]), 2],
    [edge(...ARCH_NW), 4],
  ];
  for (const [e, n] of ivyFaces) {
    for (let f = 0; f < 3; f++)
      for (let i = 0; i < n; i++) {
        if (e === ivyR && f > 0 && i === 1) continue;
        const s = (e.l * (i + 0.5)) / n,
          y = 1.0 + f * 3.3;
        k.onEdge('white', e, s - 0.75, s + 0.75, 0, 0.24, Y(y), Y(y + 1.45));
        k.onEdge('glass', e, s - 0.62, s + 0.62, 0.24, 0.26, Y(y + 0.12), Y(y + 1.33));
        k.onEdge('white', e, s - 0.03, s + 0.03, 0.26, 0.3, Y(y + 0.12), Y(y + 1.33));
      }
    k.face(
      e === ivyFaces[3][0] ? 'vineFull2' : 'vineFull',
      e,
      -0.12,
      e.l + 0.12,
      0.14,
      Y(-0.2),
      Y(10.9),
      6
    );
  }
  // 北翼北端、北翼往東的橫翼北面：也掛藤（正射：北半部外牆被樹和藤蓋住）
  k.face('vineDrape', edge([98.5, 222.6], [105.6, 225.4]), 0, 7.6, 0.1, Y(4.5), Y(10.9), 'stretch');
  // 南段圓弧高牆：凸字「ARCH」、往上的箭頭線（2025 相片）
  const aw = edge([71.3, 277.9], [78.9, 258.8]);
  {
    const p = aw.at(14.6, 0.05),
      m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), textMat(archTex(), 0, '#d8d8d8'));
    m.position.set(p[0], Y(6.0), p[1]);
    m.rotation.y = Math.atan2(aw.nx, aw.nz);
    group.add(m);
  }
  {
    const s = 11.9;
    k.onEdge('wash', aw, s - 0.07, s + 0.07, 0, 0.16, Y(1.0), Y(7.3), 2);
    for (const sg of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.75, 0.12, 0.16);
      g.rotateZ(sg * 0.8);
      const p = aw.at(s + sg * 0.22, 0.08);
      g.rotateY(-aw.ang);
      g.translate(p[0], Y(7.1), p[1]);
      k.add('wash', g);
    }
  }
  // 變電箱：水泥箱＋鐵絲網圍籬、紅白警示柱、「高壓危險」牌（西北角，2018／2023 相片）
  {
    const e = edge(...ARCH_NW),
      { s, o, w } = SUB,
      gy0 =
        Math.min(
          ...rectOn(e, s - w / 2, s + w / 2, o - w / 2, o + w / 2).map((p) => groundY(p[0], p[1]))
        ) - 0.1;
    k.onEdge(
      'conc',
      e,
      s - w / 2 - 0.1,
      s + w / 2 + 0.1,
      o - w / 2 - 0.1,
      o + w / 2 + 0.1,
      gy0,
      gy0 + 0.25
    );
    k.onEdge('box', e, s - 1.5, s + 1.5, o - 1.3, o + 1.3, gy0, gy0 + 2.7, 2);
    k.onEdge('concDark', e, s - 1.2, s + 1.2, o - 1.31, o - 1.29, gy0 + 1.8, gy0 + 2.3); // 通風百葉
    for (const [ds, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const p = e.at(s + (ds * w) / 2, o + (dz * w) / 2);
      k.cyl('steel', p[0], p[1], 0.05, gy0, gy0 + 3.2, 8);
    }
    const sides = [
      [
        [s - w / 2, o + w / 2],
        [s + w / 2, o + w / 2],
      ],
      [
        [s + w / 2, o + w / 2],
        [s + w / 2, o - w / 2],
      ],
      [
        [s + w / 2, o - w / 2],
        [s - w / 2, o - w / 2],
      ],
      [
        [s - w / 2, o - w / 2],
        [s - w / 2, o + w / 2],
      ],
    ];
    for (const [[sa, oa], [sb, ob]] of sides) {
      const A = e.at(sa, oa),
        B = e.at(sb, ob),
        f = edge(A, B);
      k.face('fence', f, 0, f.l, 0, gy0 + 0.1, gy0 + 3.1, 1.6);
      k.onEdge('steel', f, 0, f.l, -0.03, 0.03, gy0 + 3.1, gy0 + 3.16);
      I.addWall(A[0], A[1], B[0], B[1], -0.5, 3.2);
    }
    // 紅白警示柱（圍籬朝路那面兩根）和紅牌
    for (const ds of [-0.9, 0.9]) {
      const p = e.at(s + ds, o + w / 2 + 0.25);
      k.cyl('stripe', p[0], p[1], 0.07, gy0, gy0 + 1.2, 10);
    }
    {
      const f = edge(e.at(s + w / 2, o + w / 2 + 0.03), e.at(s - w / 2, o + w / 2 + 0.03));
      const p = f.at(f.l / 2, 0.02),
        m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), textMat(dangerTex(), 0.05));
      m.position.set(p[0], gy0 + 1.6, p[1]);
      m.rotation.y = Math.atan2(f.nx, f.nz);
      group.add(m);
    }
    // 圍籬前一排修剪成柱狀的樹（2023 相片）
    for (let i = 0; i < 5; i++) {
      const p = e.at(s - 2 + i, o + w / 2 + 0.9),
        gy = groundY(p[0], p[1]);
      k.cyl('concDark', p[0], p[1], 0.05, gy, gy + 0.5, 6);
      k.blob('shrub', p[0], gy + 1.5, p[1], 0.38, 1.25, 0.38);
    }
  }
}

// ---------------- 祐生建築中心 ----------------
function buildYusheng(k, I, b, group) {
  const base = b.base,
    Y = (y) => base + y,
    top = b.h; // OSM 17.1 m：4 層＋屋頂花園的牆帶
  const P =
    b.pts.length === 4
      ? b.pts
      : [
          [124.1, 233.7],
          [139.1, 228.0],
          [146.8, 243.8],
          [130.9, 248.2],
        ];
  const FL = [0, 4.6, 8.4, 12.2, 16.0]; // 一樓較高（圓窗）
  const D = 0.9; // 框架凸出（深凹窗）
  const faces = [0, 1, 2, 3].map((i) => edge(P[i], P[(i + 1) % 4])); // 北、東、南、西
  const [fN, fE, fS, fW] = faces;
  // 每面的開間（公尺）；北面：西端窄開間、圓窗、兩層高玻璃帷幕、東端開間（2026 相片由右到左）
  const baysOf = (e) =>
    e === fN ? [3.2, 5.0, 3.6, e.l - 11.8] : [e.l / 4, e.l / 4, e.l / 4, e.l / 4];
  for (const e of faces) {
    const bays = baysOf(e),
      piers = [0];
    for (const w of bays) piers.push(piers[piers.length - 1] + w);
    // 柱：轉角兩根較寬
    piers.forEach((s, i) => {
      const w = i === 0 || i === piers.length - 1 ? 1.0 : 0.8,
        s0 = Math.max(0, s - w / 2),
        s1 = Math.min(e.l, s + w / 2);
      k.onEdge(
        'washY',
        e,
        i === 0 ? -D : s0,
        i === piers.length - 1 ? e.l : s1,
        -0.05,
        D,
        Y(-0.4),
        Y(top + 0.3),
        4
      );
      // 轉角柱也擋人（凸出輪廓 0.9 m，轉角那根包到相鄰那面的柱外緣）
      blockOn(I, e, i === 0 ? -D : s0, i === piers.length - 1 ? e.l : s1, 0, D, -0.5, 4);
    });
    // 樓板梁和頂上的牆帶
    for (let f = 1; f < 4; f++) {
      for (let j = 0; j < bays.length; j++) {
        if (e === fN && j === 2 && f === 1) continue; // 玻璃帷幕跨兩層
        k.onEdge('washY', e, piers[j], piers[j + 1], -0.05, D, Y(FL[f] - 0.3), Y(FL[f] + 0.3), 4);
      }
    }
    k.onEdge('washY', e, -D, e.l, -0.05, D, Y(FL[4] - 0.2), Y(top + 0.3), 4);
    // 窗：每個開間每層一樘深凹的古銅框窗（貼在牆面上）
    for (let j = 0; j < bays.length; j++)
      for (let f = 0; f < 4; f++) {
        if (e === fN && j === 1 && f === 0) continue; // 圓窗
        if (e === fN && j === 2 && f < 2) continue; // 玻璃帷幕
        const s0 = piers[j] + 0.5,
          s1 = piers[j + 1] - 0.5,
          y0 = FL[f] + (f === 0 ? 0.9 : 0.75),
          y1 = FL[f + 1] - 0.4;
        k.face('win', e, s0, s1, 0.04, Y(y0), Y(y1), 'stretch');
        k.onEdge('bronze', e, s0 - 0.08, s1 + 0.08, 0, 0.1, Y(y0 - 0.08), Y(y0 + 0.02));
      }
  }
  // 北面一樓：圓窗（洗石子板挖直徑 3.9 m 的圓洞，後面是古銅格框玻璃）
  {
    const e = fN,
      s0 = 3.2 + 0.4,
      s1 = 8.2 - 0.4,
      sc = (s0 + s1) / 2,
      yc = 2.3,
      r = 1.95,
      yTop = FL[1] - 0.3;
    const sh = new THREE.Shape();
    sh.moveTo(-(s1 - s0) / 2, -yc - 0.4);
    sh.lineTo((s1 - s0) / 2, -yc - 0.4);
    sh.lineTo((s1 - s0) / 2, yTop - yc);
    sh.lineTo(-(s1 - s0) / 2, yTop - yc);
    sh.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, r, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 40 });
    // shape 的 x 沿邊、y 往上、深度 z：轉成外法線方向
    const uvA = g.attributes.uv;
    for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / 4, uvA.getY(i) / 4);
    const p = e.at(sc, -0.05),
      m4 = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(-e.tx, 0, -e.tz),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(e.nx, 0, e.nz)
      ); // (-t) × up = n：右手座標
    g.applyMatrix4(m4);
    g.translate(p[0], Y(yc), p[1]);
    k.add('washY', g);
    const disc = new THREE.CircleGeometry(r, 48);
    disc.applyMatrix4(m4);
    const q = e.at(sc, 0.25);
    disc.translate(q[0], Y(yc), q[1]);
    k.add('round', disc);
    // 圓框古銅邊
    const ring = new THREE.TorusGeometry(r - 0.04, 0.07, 6, 48);
    ring.applyMatrix4(m4);
    const q2 = e.at(sc, 0.3);
    ring.translate(q2[0], Y(yc), q2[1]);
    k.add('bronze', ring);
  }
  // 北面兩層高玻璃帷幕（內有樓梯）
  {
    const e = fN;
    k.face('curtain', e, 8.2 + 0.4, 11.8 - 0.4, 0.3, Y(0), Y(FL[2] - 0.3), 'stretch');
  }
  // 台階與平台：前面那條校內路靠得很近，台階只做到離路面邊 0.4 m 為止
  {
    const e = fN,
      roads = I._zeRoads || [];
    const roadGap = (x, z) => {
      let m = 1e9;
      for (const r of roads)
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const [ax, az] = r.pts[i],
            [bx, bz] = r.pts[i + 1],
            dx = bx - ax,
            dz = bz - az,
            l2 = dx * dx + dz * dz || 1,
            t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
          m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t) - (r.w || 4) / 2);
        }
      return m;
    };
    const steps = [
      [D, 1.9, 0.45],
      [1.9, 2.25, 0.3],
      [2.25, 2.6, 0.15],
    ];
    for (const [o0, o1, h] of steps) {
      let s1 = e.l;
      while (s1 > 1 && roadGap(...e.at(s1, o1)) < 0.4) s1 -= 0.25;
      if (s1 < 2) continue;
      const g0 = Math.min(groundY(...e.at(0, o1)), groundY(...e.at(s1, o1)));
      const yt = Math.max(Y(h), g0 + 0.12);
      k.onEdge('granite', e, 0, s1, o0, o1, g0 - 0.3, yt, 2);
      I.addSurface(rectOn(e, 0, s1, o0, o1), (x, z) => yt - groundY(x, z));
    }
    // 門牌 16（西端台階旁的灰色矮柱）
    const p = e.at(-0.9, 1.6),
      gy = groundY(p[0], p[1]);
    k.obox('concDark', p[0], p[1], e.ang, 0.8, 0.5, gy, gy + 1.0);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), textMat(plateTex('16')));
    const q = e.at(-0.9, 1.86);
    pl.position.set(q[0], gy + 0.7, q[1]);
    pl.rotation.y = Math.atan2(e.nx, e.nz);
    group.add(pl);
  }
  // 藤蔓：西面整面、北面東端開間整面＋上半部垂藤、四面頂上牆帶垂一圈（屋頂邊）
  k.face('vineFull', fW, -0.2, fW.l + 0.2, D + 0.06, Y(-0.3), Y(top + 0.3), 6);
  k.face('vineFull2', fN, 11.8 - 0.4, fN.l + 0.2, D + 0.06, Y(-0.3), Y(top + 0.3), 6);
  // 整面藤蔓蓋住凹窗，碰撞跟著藤蔓面走（不然人可以走進柱與柱之間、陷進藤蔓）
  blockOn(I, fW, -0.2, fW.l + 0.2, 0, D + 0.06, -0.5, 4);
  blockOn(I, fN, 11.8 - 0.4, fN.l + 0.2, 0, D + 0.06, -0.5, 4);
  k.face('vineDrape', fN, -0.2, 11.8 - 0.4, D + 0.06, Y(FL[2] - 0.6), Y(top + 0.3), 'stretch');
  for (const e of [fE, fS])
    k.face('vineDrape', e, -0.2, e.l + 0.2, D + 0.06, Y(FL[4] - 1.8), Y(top + 0.3), 'stretch');
  // 屋頂：牆帶頂面一圈藤、3×3 格花台（深色混凝土牆 0.7 m）、每格土＋雜草
  const bil = (u, v) => [
    P[0][0] * (1 - u) * (1 - v) + P[1][0] * u * (1 - v) + P[2][0] * u * v + P[3][0] * (1 - u) * v,
    P[0][1] * (1 - u) * (1 - v) + P[1][1] * u * (1 - v) + P[2][1] * u * v + P[3][1] * (1 - u) * v,
  ];
  const rt = Y(top);
  for (const e of faces) k.onEdge('shrub', e, 0, e.l, -0.3, D + 0.05, rt + 0.3, rt + 0.38);
  const ins = 0.06,
    cuts = [ins, 1 / 3, 2 / 3, 1 - ins];
  for (const c of cuts) {
    const a = bil(c, ins),
      bb = bil(c, 1 - ins),
      e1 = edge(a, bb);
    k.onEdge('concDark', e1, 0, e1.l, -0.18, 0.18, rt, rt + 0.7);
    const a2 = bil(ins, c),
      b2 = bil(1 - ins, c),
      e2 = edge(a2, b2);
    k.onEdge('concDark', e2, 0, e2.l, -0.18, 0.18, rt, rt + 0.7);
  }
  const rnd = lcg(16);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const u0 = cuts[i],
        u1 = cuts[i + 1],
        v0 = cuts[j],
        v1 = cuts[j + 1],
        q = [bil(u0, v0), bil(u1, v0), bil(u1, v1), bil(u0, v1)];
      k.poly(
        'soil',
        q.map(([x, z]) => [x, rt + 0.45, z]),
        3,
        true
      );
      for (let n = 0; n < 4; n++) {
        const [x, z] = bil(
          u0 + (u1 - u0) * (0.2 + rnd() * 0.6),
          v0 + (v1 - v0) * (0.2 + rnd() * 0.6)
        );
        k.blob(
          rnd() < 0.5 ? 'shrub' : 'leaf',
          x,
          rt + 0.55,
          z,
          0.5 + rnd() * 0.6,
          0.25 + rnd() * 0.3,
          0.5 + rnd() * 0.6
        );
      }
    }
}

// ---------------- 設計學院 ----------------
function buildDesign(k, I, b, group) {
  const base = b.base,
    h = base + b.h,
    rr = b.roofH || DES_RISE,
    E = DES_EAVE;
  const { p0, p1, p2, p3 } = DES,
    N = Math.max(
      1,
      Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / (b.gableEvery || DES_GABLE))
    );
  const lp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const V3 = (p, y) => [p[0], y, p[1]];
  // 從牆線沿屋脊方向往外推 E（西側用 p0-p1，東側用 p3-p2）
  const out = (P, Q) => {
    const dx = P[0] - Q[0],
      dz = P[1] - Q[1],
      l = Math.hypot(dx, dz);
    return [P[0] + (dx / l) * E, P[1] + (dz / l) * E];
  };
  for (let i = 0; i < N; i++) {
    const t0 = i / N,
      t1 = (i + 1) / N,
      tm = (t0 + t1) / 2;
    for (const side of [0, 1]) {
      const [A, B, M] =
        side === 0
          ? [lp(p0, p1, t0), lp(p0, p1, t1), lp(p0, p1, tm)]
          : [lp(p3, p2, t0), lp(p3, p2, t1), lp(p3, p2, tm)];
      const [Ao, Bo, Mo] =
        side === 0
          ? [out(A, lp(p3, p2, t0)), out(B, lp(p3, p2, t1)), out(M, lp(p3, p2, tm))]
          : [out(A, lp(p0, p1, t0)), out(B, lp(p0, p1, t1)), out(M, lp(p0, p1, tm))];
      // 出簷：上面淺灰、下面深灰（折板）
      for (const [S, So] of [
        [A, Ao],
        [B, Bo],
      ]) {
        const top = [
          V3(S, h + 0.02),
          V3(So, h + 0.02),
          V3(Mo, h + rr + 0.02),
          V3(M, h + rr + 0.02),
        ];
        k.poly('roofTop', top, 4);
        k.poly('roofTop', top, 4, true);
        k.poly(
          'eaveUnder',
          [V3(S, h - 0.12), V3(So, h - 0.12), V3(Mo, h + rr - 0.12), V3(M, h + rr - 0.12)],
          4
        );
        // 白色封簷板（外緣斜邊）
        const g = new THREE.BoxGeometry(0.1, 0.24, Math.hypot(Mo[0] - So[0], Mo[1] - So[1], rr));
        const dir = new THREE.Vector3(Mo[0] - So[0], rr, Mo[1] - So[1]).normalize(),
          x = new THREE.Vector3(0, 1, 0).cross(dir).normalize(),
          y = dir.clone().cross(x);
        g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, dir));
        g.translate((So[0] + Mo[0]) / 2, h + rr / 2 - 0.02, (So[1] + Mo[1]) / 2);
        k.add('white', g);
      }
      // 山牆三角在簷下（深灰）
      const n = side === 0 ? -1 : 1,
        ex = edge(side === 0 ? p0 : p3, side === 0 ? p1 : p2);
      const off = (p) => [
        p[0] + ex.nx * 0.03 * (side === 0 ? 1 : -1),
        p[1] + ex.nz * 0.03 * (side === 0 ? 1 : -1),
      ];
      void n;
      k.poly('eaveUnder', [V3(off(A), h), V3(off(B), h), V3(off(M), h + rr - 0.1)], 4);
      k.poly('eaveUnder', [V3(off(A), h), V3(off(B), h), V3(off(M), h + rr - 0.1)], 4, true);
    }
  }
  // 東面：簷下黑鋼柱（每個山谷一根，站在出簷外緣）
  const eE = edge(p3, p2),
    eW = edge(p0, p1);
  // p3→p2 的外法線朝西（往屋內），東面朝外用 -n
  const outE = (s, o) => eE.at(s, -o);
  for (let i = 1; i < N; i++) {
    const s = (eE.l * i) / N,
      p = outE(s, E - 0.25),
      gy = groundY(p[0], p[1]) - 0.1;
    k.obox('black', p[0], p[1], eE.ang, 0.16, 0.16, gy, h, null);
    I.addWall(p[0] - 0.1, p[1] - 0.1, p[0] + 0.1, p[1] + 0.1, -0.5, h - gy);
  }
  k.onEdge('black', eE, 0, eE.l, -(E - 0.17), -(E - 0.33), h - 0.35, h - 0.12); // 簷下橫梁
  // 入口（北起第 3 個山牆）：外凸的黑框玻璃門廳、白底「設計學院」招牌
  {
    const i = N - 3,
      sA = (eE.l * i) / N + 0.35,
      sB = (eE.l * (i + 1)) / N - 0.35,
      dep = 1.3;
    const gy = Math.min(groundY(...outE(sA, dep)), groundY(...outE(sB, dep)));
    const yTop = Math.max(base, gy) + 2.85;
    const fr = edge(outE(sB, dep), outE(sA, dep)); // 門廳正面（朝東）
    k.face('desGlass', fr, 0, fr.l, 0, Math.max(base, gy) - 0.05, yTop, 'stretch');
    for (const [s0, s1] of [
      [sA, sA + 0.1],
      [sB - 0.1, sB],
    ])
      k.onEdge('black', eE, s0, s1, -dep - 0.05, 0.0, gy - 0.05, yTop + 0.1);
    k.onEdge('black', eE, sA, sB, -dep - 0.08, 0.0, yTop, yTop + 0.18);
    for (const s of [sA, sB]) {
      const side = edge(outE(s, 0), outE(s, dep));
      k.face(
        'glass',
        s === sA ? edge(outE(s, dep), outE(s, 0)) : side,
        0,
        dep,
        0,
        gy,
        yTop,
        'stretch'
      );
    }
    const p = fr.at(fr.l / 2, 0.12),
      m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), textMat(desSignTex(), 0.08));
    m.position.set(p[0], yTop + 0.55, p[1]);
    m.rotation.y = Math.atan2(fr.nx, fr.nz);
    group.add(m);
    const bk = fr.at(fr.l / 2, 0.06);
    k.obox('black', bk[0], bk[1], fr.ang, 2.7, 0.06, yTop + 0.15, yTop + 0.95);
    blockOn(I, eE, sA, sB, -dep, 0, -0.5, yTop - gy);
  }
  // 東側廣場：紅磚與灰磚相間的鋪面、粗石座椅、造型松盆栽
  {
    const s0 = eE.l * 0.3,
      s1 = eE.l + 0.5,
      o0 = 0.05,
      o1 = 10;
    const pts = [outE(s0, o0), outE(s1, o0), outE(s1, o1), outE(s0, o1)];
    k.ground('pave', pts, (x, z) => groundY(x, z) + 0.04, 4, 1.0);
    const rnd = lcg(18);
    for (const [s, o, sc] of [
      [eE.l * 0.55, 6.5, 1],
      [eE.l * 0.8, 7.5, 0.9],
    ]) {
      const p = outE(s, o),
        gy = groundY(p[0], p[1]);
      k.blob('granite', p[0], gy + 0.3, p[1], 1.0 * sc, 0.42, 0.45 * sc);
      I.addWall(p[0] - 0.8, p[1], p[0] + 0.8, p[1], -0.5, 0.5);
    }
    for (const s of [eE.l * 0.62, eE.l * 0.9]) {
      const p = outE(s, 2.4),
        gy = groundY(p[0], p[1]);
      k.obox('granite', p[0], p[1], eE.ang, 0.9, 0.9, gy, gy + 0.7, 1);
      k.blob('shrub', p[0], gy + 1.1, p[1], 0.55, 0.3, 0.55);
      k.blob('shrub', p[0] + 0.15, gy + 1.55, p[1], 0.4, 0.22, 0.4);
      k.cyl('pot', p[0], p[1], 0.05, gy + 0.7, gy + 1.5, 6);
      void rnd;
    }
  }
  // 西面：單層深棕木牆前的簷下也有柱（官方街景 2017：玻璃加木框門廊）
  for (let i = 1; i < N; i += 2) {
    const s = (eW.l * i) / N,
      p = eW.at(s, E - 0.25),
      gy = groundY(p[0], p[1]) - 0.1;
    k.obox('black', p[0], p[1], eW.ang, 0.16, 0.16, gy, h, null);
    I.addWall(p[0] - 0.1, p[1] - 0.1, p[0] + 0.1, p[1] + 0.1, -0.5, h - gy);
  }
}

// ---------------- 望樓、信樓 ----------------
// 依據（campus-survey/zone-E.md 第三輪補充）：
//  望樓：Commons Wanglou_20160519（西面入口）。3F，白偏淡紫灰小磁磚；淺藍出挑板兩條（二樓地板線那條兼入口雨庇，
//    掛金字「望樓」、由右往左讀；三樓陽台板），屋簷邊也是淺藍；古銅框窗，二樓中央大格子窗＋百葉口；入口在西面
//    正中，雙開玻璃門、兩側各一對落地門；門前木平台、扶手坡道、卵石步道。陽台板的長度照相片量（偏北）。
//  信樓（景觀系館）：Commons Jingguanxi_20160519、地景系官網 2025-12 玄關照。玄關在北面西段（正射：大榕樹在
//    北側；相片右邊是設計學院的鋸齒屋頂），凹入式、萊姆綠鋼框，夾在兩根外露混凝土柱之間；西邊是深棕橫木板牆，
//    掛英文系名和紅字「信樓」（由右往左讀）；門前木條地板、大榕樹、弧形混凝土座椅。左段（東）二樓窗下有幾塊
//    橘紅板。南、東、西面沒照片，照北面的外牆做法推（MapBuilder.js 的 look），不加東西。
// 這幾棟的碰撞都在 Interiors：高度相對地面（src/physics/PhysWorld.js 會加上牆中點的地面高）。
// 沒有照片、照正射與衛星圖屋頂形狀推定的附屬量體（沿各自那面牆的 [s0, s1, 凸出]）：
//  望樓南端樓梯間（NLSC 正射：南端有一塊顏色較淺、跨出輪廓的量體）、信樓東端一層附屬量體（正射：東端一條較低的
//  米色屋頂）、愛樓東端斜頂附屬量體（Google 衛星：東端一條紅褐色、有橫紋的較低屋頂，寬約 3 m）
const WANG_STAIR = [3.5, 10.0, 2.0],
  LAND_ANNEX = 2.6,
  AI_LEAN = 3.0;
// 愛樓入口方框沿南面的範圍 [s0, s1]（從東端算）與前廣場
const aiBox = () => {
  const l = edge(...AI_S).l;
  return [l - AI_STAIR - AI_BOX.w, l - AI_STAIR];
};
const aiPlaza = () => {
  const e = edge(...AI_S),
    [s0, s1] = aiBox();
  return rectOn(e, s0 - 3, Math.min(e.l + 0.5, s1 + 3), 0, 9.5);
};
const WANG_DECK = { s0: -11, s1: 11, d: 2.8 },
  WANG_PATH = 19;
const oct = (p, r) =>
  Array.from({ length: 8 }, (_, i) => [
    p[0] + Math.cos((i * Math.PI) / 4) * r,
    p[1] + Math.sin((i * Math.PI) / 4) * r,
  ]);
// 三個附屬量體的位置（OSM 輪廓的固定頂點，和 data/cycu.json 一致）
const backFootprints = () => {
  const ws = edge([269.8, 269.4], [256.8, 265.7]),
    le = edge([259.1, 269.8], [255.1, 283.1]),
    ae = edge([281.9, 206.6], [277.5, 220.3]);
  return [
    [ws, WANG_STAIR[0], WANG_STAIR[1], WANG_STAIR[2]],
    [le, 0, le.l, LAND_ANNEX],
    [ae, 0.3, ae.l - 0.3, AI_LEAN],
  ];
};
// 樹和灌木只隱藏、不重抽（Zones.js treeHide；不放進 reserved，免得全圖共用亂數錯位）
export function zoneETreeHide() {
  const w = edge(...WANG_W),
    c = w.l / 2,
    n = edge(...LAND_N),
    T = n.at(BANYAN.s, BANYAN.o);
  return [
    rectOn(w, c + WANG_DECK.s0 - 0.5, c + WANG_DECK.s1 + 0.5, 0, WANG_DECK.d + 0.8), // 望樓木平台
    rectOn(w, c - 5.2, c - 3.0, WANG_DECK.d, WANG_DECK.d + 3.6), // 坡道
    rectOn(w, c - 1.5, c + 1.5, WANG_DECK.d, WANG_PATH + 0.6), // 卵石步道
    rectOn(n, LAND_BOARD[0] - 0.5, LAND_PORCH[1] + 0.6, 0, 3.0), // 信樓木板牆＋玄關木地板
    oct(T, 6.2), // 榕樹與弧形座椅
    aiPlaza(), // 愛樓前廣場
    ...backFootprints().map(([e, s0, s1, d]) => rectOn(e, s0 - 0.4, s1 + 0.4, 0, d + 0.4)), // 推定的附屬量體
  ];
}
// 兩個 3D 點之間的圓柱（樹枝、斜扶手）
function limb(k, m, A, B, r0, r1 = r0, seg = 6) {
  const d = new THREE.Vector3(B[0] - A[0], B[1] - A[1], B[2] - A[2]),
    L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg);
  g.translate(0, L / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  );
  g.translate(A[0], A[1], A[2]);
  return k.add(m, g);
}
const textPlane = (group, tex, e, s, o, y, w, h, em = 0.05) => {
  const p = e.at(s, o),
    m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), textMat(tex, em));
  m.position.set(p[0], y, p[1]);
  m.rotation.y = Math.atan2(e.nx, e.nz);
  group.add(m);
  return m;
};

function buildWang(k, I, b, group) {
  const base = b.base,
    Y = (y) => base + y,
    top = b.h,
    w = edge(...WANG_W),
    c = w.l / 2;
  // 屋簷：四邊淺藍出挑簷板（蓋住女兒牆外側）
  for (let i = 0; i < b.pts.length; i++) {
    const e = edge(b.pts[i], b.pts[(i + 1) % b.pts.length]);
    if (e.l > 1) k.onEdge('wangBlue', e, -0.4, e.l + 0.4, -0.02, 0.4, Y(top - 0.22), Y(top + 0.4));
  }
  // 窗下深灰褐板（二、三樓，每個開間一塊，對著 MapBuilder 的成對窗）和開間柱上的排水管：東、西兩個長面
  // （相片只有西面，東面照同一套做法推）
  for (const [A, B] of [WANG_W, [b.pts[1], b.pts[2]]]) {
    const e = edge(A, B);
    if (e.l < 30) continue;
    const nb = Math.max(1, Math.round(e.l / 3.4)),
      bw = e.l / nb;
    for (let i = 0; i < nb; i++)
      for (const f of [1, 2])
        k.onEdge(
          'wangPanel',
          e,
          (i + 0.08) * bw,
          (i + 0.92) * bw,
          0,
          0.03,
          Y(f * FL3 + 0.12),
          Y(f * FL3 + 0.98)
        );
    for (let i = 1; i < nb; i += 2) {
      if (A === WANG_W[0] && Math.abs(i * bw - c) < 4) continue;
      const p = e.at(i * bw, 0.09);
      k.cyl('wangPipe', p[0], p[1], 0.05, Y(0), Y(top), 6);
    }
  }
  // 屋頂兩個坡頂天窗箱（NLSC 2024 正射：各約 7 × 12 m，西半灰色、東半橘紅瓦，南北相距約 13 m）
  for (const sc of [20.2, 33.0]) {
    const s0 = sc - 6,
      s1 = sc + 6,
      oW = -3.25,
      oR = -7.25,
      oE = -10.25,
      y0 = Y(top),
      ye = y0 + 0.7,
      yr = y0 + 1.9;
    const P = (ss, o, y) => {
      const q = w.at(ss, o);
      return [q[0], y, q[1]];
    };
    k.poly('wangRoofGrey', [P(s0, oW, ye), P(s1, oW, ye), P(s1, oR, yr), P(s0, oR, yr)], 2);
    k.poly('wangRoofTile', [P(s0, oR, yr), P(s1, oR, yr), P(s1, oE, ye), P(s0, oE, ye)], 2);
    for (const o of [oW, oE])
      k.poly('wangGable', [P(s0, o, y0), P(s1, o, y0), P(s1, o, ye), P(s0, o, ye)], 2);
    for (const ss of [s0, s1]) {
      k.poly('wangGable', [P(ss, oW, y0), P(ss, oE, y0), P(ss, oE, ye), P(ss, oW, ye)], 2);
      k.poly('wangGable', [P(ss, oW, ye), P(ss, oE, ye), P(ss, oR, yr)], 2);
    }
  }
  // 南端樓梯間（推定）：往外凸 2 m 的磁磚量體，中間一條直通到頂的樓梯間窗，頂上同樣收淺藍簷板
  {
    const [e, s0, s1, d] = backFootprints()[0],
      sm = (s0 + s1) / 2;
    k.onEdge('wangWall', e, s0, s1, 0, d, Y(-0.3), Y(top + 0.3), 2);
    k.onEdge('wangBlue', e, s0 - 0.3, s1 + 0.3, -0.02, d + 0.3, Y(top - 0.22), Y(top + 0.4));
    k.face('glass', e, sm - 0.7, sm + 0.7, d + 0.02, Y(1.2), Y(top - 0.9), 'stretch');
    for (const a of [sm - 0.78, sm + 0.7])
      k.onEdge('bronze', e, a, a + 0.08, d, d + 0.06, Y(1.2), Y(top - 0.9));
    for (let y = 1.2; y <= top - 0.85; y += (top - 2.1) / 5)
      k.onEdge('bronze', e, sm - 0.78, sm + 0.78, d, d + 0.06, Y(y - 0.04), Y(y + 0.04));
    blockOn(I, e, s0, s1, 0, d, -0.5, top);
  }
  // 北端屋突（Google 衛星：北端屋頂有一塊約 8 × 8 m、略高的方塊，緊貼愛樓東南角）
  k.onEdge('wangWall', w, w.l - 9.5, w.l - 1.5, -10.5, -2.5, Y(top), Y(top + 2.6), 2);
  k.onEdge('wangBlue', w, w.l - 9.7, w.l - 1.3, -10.7, -2.3, Y(top + 2.6), Y(top + 2.8));
  // 淺藍陽台：樓板＋1 m 實心欄牆（相片量：二樓那條偏北、兼入口雨庇；三樓中央一段、北邊一小段）
  const balc = (s0, s1, yf, d = 1.1) => {
    k.onEdge('wangBlue', w, s0, s1, 0, d, Y(yf - 0.18), Y(yf + 0.05));
    k.onEdge('wangBlue', w, s0, s1, d - 0.14, d, Y(yf + 0.05), Y(yf + 0.75));
    for (const [a, z] of [
      [s0, s0 + 0.14],
      [s1 - 0.14, s1],
    ])
      k.onEdge('wangBlue', w, a, z, 0, d, Y(yf + 0.05), Y(yf + 0.75));
  };
  balc(c - 3.5, c + 8.6, FL3);
  balc(c - 1.9, c + 3.6, 2 * FL3);
  balc(c + 6.1, c + 7.8, 2 * FL3);
  textPlane(group, wangSignTex(), w, c, 1.11, Y(FL3 + 0.4), 1.5, 0.56, 0.12); // 金字「望樓」在入口正上方
  textPlane(group, plateTex('20'), w, c + 1.75, 0.04, Y(1.75), 0.36, 0.36); // 入口北側門牌「20」（室設系官網 2026）
  // 二樓中央大格子窗＋百葉口（在陽台欄牆上方）
  k.face('wangGrid', w, c - 1.45, c + 1.45, 0.04, Y(FL3 + 0.78), Y(2 * FL3 - 0.2), 'stretch');
  k.onEdge('bronze', w, c - 1.52, c + 1.52, 0, 0.12, Y(2 * FL3 - 0.24), Y(2 * FL3 - 0.14));
  // 一樓：正中雙開玻璃門、兩側各一對落地門（古銅框）；入口開間先貼一片牆蓋掉一般窗，門之間是磁磚柱
  k.face('wangWall', w, c - 3.75, c + 3.75, 0.025, Y(-0.1), Y(FL3 - 0.2), 2);
  for (const [s, hw, h] of [
    [c, 1.0, 2.75],
    [c - 2.8, 0.75, 2.5],
    [c + 2.8, 0.75, 2.5],
  ]) {
    k.face('wangDoor', w, s - hw, s + hw, 0.05, Y(0), Y(h), 'stretch');
    k.onEdge('bronze', w, s - hw - 0.07, s + hw + 0.07, 0, 0.12, Y(h), Y(h + 0.1));
    for (const e of [s - hw - 0.07, s + hw])
      k.onEdge('bronze', w, e, e + 0.07, 0, 0.12, Y(0), Y(h));
  }
  // 木平台：沿西面分成 2.2 m 一段，每段頂面比那段最高的地面高 0.1 m（坡地上一段一段，每階都走得上去）
  const D = WANG_DECK.d,
    ds0 = c + WANG_DECK.s0,
    ds1 = c + WANG_DECK.s1,
    nSeg = Math.round((ds1 - ds0) / 2.2),
    sl = (ds1 - ds0) / nSeg;
  const gAt = (s, o) => groundY(...w.at(s, o));
  const tops = [];
  const segTop = (ss) => {
    const t = tops.find((q) => ss >= q[0] - 1e-6 && ss <= q[1] + 1e-6);
    return t ? t[2] : Y(0.1);
  };
  for (let i = 0; i < nSeg; i++) {
    const a = ds0 + i * sl,
      z = a + sl,
      ring = rectOn(w, a, z, 0, D);
    const gs = [...ring, w.at((a + z) / 2, D / 2)].map((p) => groundY(p[0], p[1]));
    const yd = Math.max(Math.max(...gs) + 0.1, Y(0.1));
    tops.push([a, z, yd]);
    k.onEdge('deckWood', w, a, z, 0, D, Math.min(...gs) - 0.3, yd, 2);
    I.addSurface(ring, (x, zz) => yd - groundY(x, zz));
    // 正中前緣：落差大於 0.25 m 就加一階
    if (Math.abs((a + z) / 2 - c) < sl) {
      const gf = Math.min(gAt(a, D + 0.45), gAt(z, D + 0.45));
      if (yd - gf > 0.25) {
        const ys = (yd + gf) / 2;
        k.onEdge('deckWood', w, a, z, D, D + 0.45, gf - 0.3, ys, 2);
        I.addSurface(rectOn(w, a, z, D, D + 0.45), (x, zz) => ys - groundY(x, zz));
      }
    }
  }
  // 扶手坡道：緊貼入口南側（相片在右側那組落地門旁），從平台前緣垂直立面往外下，兩邊不鏽鋼扶手擋人
  {
    const s0 = c - 4.7,
      s1 = c - 3.5,
      o0 = D,
      o1 = D + 3.0,
      sm = (s0 + s1) / 2;
    const yt = segTop(sm),
      yb = gAt(sm, o1) + 0.03,
      yAtO = (o) => yt + (yb - yt) * Math.max(0, Math.min(1, (o - o0) / (o1 - o0)));
    const V = (ss, o) => {
      const p = w.at(ss, o);
      return [p[0], yAtO(o), p[1]];
    };
    k.poly('deckWood', [V(s0, o0), V(s1, o0), V(s1, o1), V(s0, o1)], 2);
    k.poly('deckWood', [V(s0, o0), V(s1, o0), V(s1, o1), V(s0, o1)], 2, true);
    for (const ss of [s0, s1]) {
      const A = w.at(ss, o0),
        B = w.at(ss, o1);
      k.poly(
        'deckWood',
        [
          [A[0], yAtO(o0) - 0.4, A[1]],
          [B[0], yAtO(o1) - 0.4, B[1]],
          [B[0], yAtO(o1), B[1]],
          [A[0], yAtO(o0), A[1]],
        ],
        2,
        true
      );
      k.poly(
        'deckWood',
        [
          [A[0], yAtO(o0) - 0.4, A[1]],
          [B[0], yAtO(o1) - 0.4, B[1]],
          [B[0], yAtO(o1), B[1]],
          [A[0], yAtO(o0), A[1]],
        ],
        2
      );
    }
    const oOf = (x, z) => (x - w.a[0]) * w.nx + (z - w.a[1]) * w.nz;
    I.addSurface(rectOn(w, s0, s1, o0, o1), (x, z) => yAtO(oOf(x, z)) - groundY(x, z));
    for (const ss of [s0 - 0.05, s1 + 0.05]) {
      for (let o = o0 + 0.1; o <= o1 + 0.01; o += (o1 - o0 - 0.1) / 3) {
        const p = w.at(ss, o);
        k.cyl('steel', p[0], p[1], 0.03, yAtO(o) - 0.1, yAtO(o) + 0.9, 6);
      }
      const A = w.at(ss, o0 - 0.6),
        B = w.at(ss, o1 - 0.1);
      limb(k, 'steel', [A[0], yAtO(o0) + 0.9, A[1]], [B[0], yAtO(o1 - 0.1) + 0.9, B[1]], 0.03);
      const P = w.at(ss, o0),
        Q = w.at(ss, o1);
      I.addWall(P[0], P[1], Q[0], Q[1], -0.5, 1.0);
    }
  }
  // 卵石步道：門前往西，兩排踏板、中間草縫（微微彎）
  for (let o = D + 0.75; o < WANG_PATH; o += 0.72) {
    const sw = c + Math.sin(o / 6) * 0.35;
    for (const ds of [-0.55, 0.55]) {
      const s = sw + ds,
        gy = gAt(s, o + 0.25);
      k.onEdge('pebble', w, s - 0.48, s + 0.48, o, o + 0.52, gy - 0.12, gy + 0.035, 1);
    }
  }
}

function buildLand(k, I, b, group) {
  const base = b.base,
    Y = (y) => base + y,
    n = edge(...LAND_N);
  // 左段（東）二、三樓窗下的橘紅板（2016 相片只看得到二樓，室設系官網 2026 照兩層都有），避開外露的混凝土柱
  for (const [s0, s1] of [
    [26.3, 28.7],
    [29.0, 30.2],
    [33.8, 36.2],
    [38.25, 40.4],
  ]) {
    k.onEdge('landOrange', n, s0, s1, 0, 0.05, Y(FL3 + 0.3), Y(FL3 + 1.18));
    k.onEdge('landOrange', n, s0, s1, 0, 0.05, Y(2 * FL3 + 0.3), Y(2 * FL3 + 1.18));
  }
  // 南面（推定：2024-08 從 708 巷看到每層窗下有橘褐色板；正射上南緣沒有別的量體）：二、三樓窗下橘褐板，柱間各一塊
  {
    const e = edge(b.pts[2], b.pts[3]),
      cnt = Math.max(1, Math.round(e.l / 7.2)),
      sp = e.l / cnt,
      cuts = [0.2];
    for (let i = 0; i < cnt; i++) cuts.push((i + 0.5) * sp);
    cuts.push(e.l - 0.2);
    for (let i = 0; i + 1 < cuts.length; i++)
      for (const f of [1, 2])
        k.onEdge(
          'landBrown',
          e,
          cuts[i] + (i ? 0.32 : 0),
          cuts[i + 1] - (i + 2 < cuts.length ? 0.32 : 0),
          0,
          0.05,
          Y(f * FL3 + 0.3),
          Y(f * FL3 + 1.18)
        );
  }
  // 東端一層附屬量體（推定）：清水混凝土、平頂，朝東一扇鐵門和兩個高窗
  {
    const [e, s0, s1, d] = backFootprints()[1];
    k.onEdge('conc', e, s0, s1, 0, d, Y(-0.3), Y(3.2), 2);
    k.onEdge('concDark', e, s0 - 0.15, s1 + 0.15, -0.02, d + 0.2, Y(3.2), Y(3.38));
    k.onEdge('aiAlu', e, e.l / 2 - 0.6, e.l / 2 + 0.6, d, d + 0.04, Y(0), Y(2.15));
    for (const sc of [e.l * 0.22, e.l * 0.78])
      k.face('glass', e, sc - 0.8, sc + 0.8, d + 0.02, Y(2.0), Y(2.75), 'stretch');
    blockOn(I, e, s0, s1, 0, d, -0.5, 3.4);
  }
  // 屋頂（2019 空拍、Google 衛星）：北側偏西一組不鏽鋼水塔、中間白色天窗箱、東端小屋突
  {
    const rt = Y(b.h);
    for (let i = 0; i < 4; i++) {
      const p = n.at(9 + i * 1.7, -2.6);
      k.cyl('steel', p[0], p[1], 0.62, rt + 0.5, rt + 2.1, 12);
      k.cyl('concDark', p[0], p[1], 0.5, rt, rt + 0.5, 8);
    }
    k.onEdge('white', n, 21, 24, -8.5, -5.5, rt, rt + 0.8);
    k.onEdge('conc', n, n.l - 5.5, n.l - 2.5, -7.5, -4.5, rt, rt + 2.4, 2);
  }
  // 凹入式玄關：兩根外露混凝土柱之間，萊姆綠鋼框、裡面偏暗
  const [p0, p1] = LAND_PORCH,
    PH = 3.0;
  k.face('landPorch', n, p0 + 0.3, p1 - 0.3, 0.03, Y(-0.3), Y(PH), 'stretch');
  for (const [a, z] of [
    [p0 + 0.05, p0 + 0.3],
    [p1 - 0.3, p1 - 0.05],
  ])
    k.onEdge('lime', n, a, z, 0, 0.35, Y(-0.3), Y(PH + 0.25));
  k.onEdge('lime', n, p0 + 0.05, p1 - 0.05, 0, 0.5, Y(PH), Y(PH + 0.25));
  // 玄關前的木條地板
  {
    const ring = rectOn(n, p0 - 0.2, p1 + 0.2, 0, 2.4),
      gs = ring.map((p) => groundY(p[0], p[1])),
      yd = Math.max(...gs) + 0.08;
    k.onEdge('deckWood', n, p0 - 0.2, p1 + 0.2, 0, 2.4, Math.min(...gs) - 0.3, yd, 2);
    I.addSurface(ring, (x, z) => yd - groundY(x, z));
  }
  // 玄關前到榕樹一帶的紅灰磚鋪面（西邊接設計學院東側廣場，s < 9.5 那段已經是它的鋪面）
  k.ground('pave', rectOn(n, 9.5, 19.5, 0.05, 4.2), (x, z) => groundY(x, z) + 0.045, 4, 1.0);
  // 深棕橫木板牆：貼著北面、在外露柱前面；中間偏西一段較高，掛白底紅字「信樓」；靠玄關那端掛英文系名
  {
    const [s0, s1] = LAND_BOARD,
      gm = groundY(...n.at((s0 + s1) / 2, 0.5)),
      gl = Math.min(groundY(...n.at(s0, 0.5)), groundY(...n.at(s1, 0.5)));
    const r0 = 3.1,
      r1 = 5.95;
    k.onEdge('boardWall', n, s0, s1, 0.35, 0.58, gl - 0.2, gm + 2.3, 2);
    k.onEdge('boardWall', n, r0, r1, 0.35, 0.58, gm + 2.3, gm + 2.95, 2);
    k.onEdge('concDark', n, s0, s1, 0.33, 0.6, gl - 0.2, gl + 0.12); // 底下的混凝土墩
    textPlane(group, xinSignTex(), n, (r0 + r1) / 2, 0.6, gm + 2.58, 1.45, 0.45);
    textPlane(group, landNameTex(), n, 7.9, 0.595, gm + 1.9, 2.2, 0.21);
    blockOn(I, n, s0, s1, 0.3, 0.62, -0.5, 2.3);
  }
  // 大榕樹：粗幹＋氣根＋七根大枝，樹冠是一片扁圓的葉團（離牆 1.2 m 以內不長，免得穿進樓裡）
  const T = n.at(BANYAN.s, BANYAN.o),
    gy = groundY(T[0], T[1]),
    rnd = lcg(61);
  k.cyl('bark', T[0], T[1], 0.7, gy - 0.3, gy + 3.4, 12);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 6.283 + rnd() * 0.4,
      r = 0.8 + rnd() * 0.5;
    limb(
      k,
      'bark',
      [T[0] + Math.cos(a) * r, gy - 0.2, T[1] + Math.sin(a) * r],
      [T[0] + Math.cos(a) * 0.35, gy + 2.2 + rnd() * 1.2, T[1] + Math.sin(a) * 0.35],
      0.17 + rnd() * 0.1,
      0.1
    );
  }
  // 大枝：從樹幹不同高度長出、中間往上彎，末端藏進樹冠
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283 + rnd() * 0.5,
      h0 = gy + 2.3 + rnd() * 1.3,
      len = 3.8 + rnd() * 3,
      a2 = a + (rnd() - 0.5) * 0.5;
    const S = [T[0] + Math.cos(a) * 0.35, h0, T[1] + Math.sin(a) * 0.35];
    const M = [
      T[0] + Math.cos(a) * len * 0.45,
      h0 + 1.1 + rnd() * 0.7,
      T[1] + Math.sin(a) * len * 0.45,
    ];
    const E = [
      T[0] + Math.cos(a2) * len * 1.25,
      gy + 5.0 + rnd() * 0.8,
      T[1] + Math.sin(a2) * len * 1.25,
    ];
    limb(k, 'bark', S, M, 0.36, 0.25, 8);
    limb(k, 'bark', M, E, 0.25, 0.09, 6);
  }
  const R = 11;
  for (let i = 0; i < 150; i++) {
    const a = rnd() * 6.283,
      d = Math.sqrt(rnd()) * R,
      x = T[0] + Math.cos(a) * d,
      z = T[1] + Math.sin(a) * d;
    const y = gy + 5.7 + (1 - d / R) * 1.6 + rnd() * 0.7,
      sx = 1.8 + rnd() * 1.0,
      sy = 0.9 + rnd() * 0.4,
      sz = 1.8 + rnd() * 1.0,
      pick = rnd();
    if ((x - n.a[0]) * n.nx + (z - n.a[1]) * n.nz < 1.2) continue;
    k.blob(pick < 0.45 ? 'canopy' : pick < 0.8 ? 'canopy2' : 'canopy3', x, y, z, sx, sy, sz);
  }
  k.ground('soil', oct(T, 1.7), (x, z) => groundY(x, z) + 0.03, 3, 0.5);
  {
    const p = rectOn(n, BANYAN.s - 0.9, BANYAN.s + 0.9, BANYAN.o - 0.9, BANYAN.o + 0.9);
    for (let i = 0; i < 4; i++)
      I.addWall(p[i][0], p[i][1], p[(i + 1) % 4][0], p[(i + 1) % 4][1], -0.5, 4);
  }
  // 弧形混凝土座椅：圍在榕樹的北、東側
  {
    const RB = 5.0,
      a0 = -1.95,
      a1 = -0.15,
      N = 10;
    for (let i = 0; i < N; i++) {
      const aa = a0 + ((a1 - a0) * i) / N,
        ab = a0 + ((a1 - a0) * (i + 1)) / N;
      const A = [T[0] + Math.cos(aa) * RB, T[1] + Math.sin(aa) * RB],
        B = [T[0] + Math.cos(ab) * RB, T[1] + Math.sin(ab) * RB],
        e = edge(A, B);
      const g0 = Math.min(groundY(...A), groundY(...B));
      k.onEdge('conc', e, -0.02, e.l + 0.02, -0.2, 0.2, g0 - 0.2, g0 + 0.75, 2);
      I.addWall(A[0], A[1], B[0], B[1], -0.5, 0.75);
    }
  }
}

// ---------------- 室設館（愛樓） ----------------
// 依據：室設系官網 2026 整棟南立面照、入口西側與樓梯間、南面東段、門楣近照（campus-survey/zone-E/web/round4）；
// 甄選注意事項「室設館（愛樓）1 樓 100 教室」確認是同一棟。入口朝南（大合照正前方隔著草坪就是信樓的萊姆綠門框；
// 評圖流程表寫「愛樓前廣場」），在南面最西段：西端是深灰洗石子樓梯間，緊貼它東邊是往外凸的白色方框入口。
// 北面（停車場側）沒照片：二、三樓照南面的開間做法推，一樓用一般窗；東、西端只換牆色。
function buildAi(k, I, b, group) {
  const base = b.base,
    Y = (y) => base + y,
    e = edge(...AI_S),
    FL = FL3,
    top = b.h,
    [bx0, bx1] = aiBox(),
    c = (bx0 + bx1) / 2,
    D = AI_BOX.d,
    BH = FL + 0.2;
  // 二、三樓：每個開間一片（兩樘窗各上下兩排、淺藍窗下板、白色排水管）；南面到樓梯間為止，北面整面
  const north = edge(b.pts[3], b.pts[0]);
  for (const [f, len] of [
    [e, e.l - AI_STAIR],
    [north, north.l],
  ]) {
    if (f.l < 30) continue;
    const nb = Math.max(1, Math.round(len / 4.5)),
      bw = len / nb;
    for (let i = 0; i < nb; i++)
      for (const fl of [1, 2])
        k.face('aiBay', f, i * bw, (i + 1) * bw, 0.03, Y(fl * FL), Y((fl + 1) * FL), 'stretch');
    for (let i = 0; i < nb; i++) {
      if (f === e && i * bw > bx0 - 0.2) continue;
      const p = f.at(i * bw + 0.1, 0.07);
      k.cyl('aiWhite', p[0], p[1], 0.05, Y(0), Y(FL), 6);
    } // 排水管接到一樓
  }
  // 西端樓梯間：深灰洗石子，窗高錯開
  k.face('aiStair', e, e.l - AI_STAIR, e.l, 0.04, Y(-0.2), Y(top + 0.3), 'stretch');
  // 入口：往外凸的白色方框（兩側牆、上緣 0.75 m 橫帶掛「愛樓」），框內整面深灰鋁框霧面玻璃
  for (const [a, z] of [
    [bx0, bx0 + 0.35],
    [bx1 - 0.35, bx1],
  ])
    k.onEdge('aiWhite', e, a, z, 0, D, Y(-0.3), Y(BH));
  k.onEdge('aiWhite', e, bx0, bx1, 0, D, Y(BH - 0.75), Y(BH));
  k.face('aiFront', e, bx0 + 0.35, bx1 - 0.35, D - 0.2, Y(-0.05), Y(BH - 0.75), 'stretch');
  textPlane(group, aiSignTex(), e, c, D + 0.012, Y(BH - 0.38), 1.9, 0.46, 0.02);
  blockOn(I, e, bx0, bx1, 0, D, -0.5, BH);
  // 方框頂上的 4 台冷氣室外機
  for (const s of [c - 3.4, c - 2.1, c + 1.3, c + 2.6]) {
    k.onEdge('acUnit', e, s - 0.42, s + 0.42, 0.3, 0.65, Y(BH), Y(BH + 0.62));
    k.onEdge('aiAlu', e, s - 0.3, s + 0.3, 0.655, 0.665, Y(BH + 0.1), Y(BH + 0.52));
  }
  // 東端斜頂附屬量體（推定）：灰牆、紅褐色浪板單斜頂，朝東一扇鐵門
  {
    const [f, s0, s1, d] = backFootprints()[2],
      yh = 3.5,
      yl = 2.7,
      P = (ss, o, y) => {
        const q = f.at(ss, o);
        return [q[0], Y(y), q[1]];
      };
    k.onEdge('aiCon', f, s0, s1, 0, d, Y(-0.3), Y(yl), 2);
    k.poly(
      'aiTin',
      [
        P(s0 - 0.2, 0, yh),
        P(s1 + 0.2, 0, yh),
        P(s1 + 0.2, d + 0.3, yl - 0.08),
        P(s0 - 0.2, d + 0.3, yl - 0.08),
      ],
      2
    );
    for (const ss of [s0, s1]) k.poly('aiGrey', [P(ss, 0, yl), P(ss, d, yl), P(ss, 0, yh)], 2);
    k.onEdge('aiAlu', f, (s0 + s1) / 2 - 0.55, (s0 + s1) / 2 + 0.55, d, d + 0.04, Y(0), Y(2.1));
    blockOn(I, f, s0, s1, 0, d, -0.5, yl);
  }
  // 屋頂（2026 整棟立面照）：四周白色欄杆、兩個小通風帽
  {
    const rt = Y(top + 0.3);
    for (let i = 0; i < b.pts.length; i++) {
      const f = edge(b.pts[i], b.pts[(i + 1) % b.pts.length]);
      if (f.l < 1) continue;
      k.onEdge('aiWhite', f, 0, f.l, -0.33, -0.27, rt + 0.82, rt + 0.88);
      k.onEdge('aiWhite', f, 0, f.l, -0.32, -0.28, rt + 0.4, rt + 0.44);
      for (let ss = 0.3; ss < f.l; ss += 2.4) {
        const q = f.at(ss, -0.3);
        k.cyl('aiWhite', q[0], q[1], 0.03, rt, rt + 0.88, 6);
      }
    }
    for (const ss of [e.l * 0.42, e.l * 0.58]) {
      const q = e.at(ss, -1.2);
      k.cyl('aiWhite', q[0], q[1], 0.28, rt - 0.3, rt + 0.5, 8);
    }
  }
  // 愛樓前廣場：磚色與灰色交錯的鋪面；門前一階水泥平台
  k.ground('pave', aiPlaza(), (x, z) => groundY(x, z) + 0.045, 4, 1.0);
  const ring = rectOn(e, c - 2.3, c + 2.3, D, D + 1.3),
    gs = ring.map((p) => groundY(p[0], p[1])),
    yt = Math.max(...gs) + 0.16;
  k.onEdge('aiCon', e, c - 2.3, c + 2.3, D, D + 1.3, Math.min(...gs) - 0.3, yt, 2);
  I.addSurface(ring, (x, z) => yt - groundY(x, z));
}

// src/world/Interiors.js 呼叫：自建部分
export function buildZoneE(I, scene, data) {
  const group = new THREE.Group();
  group.name = 'zoneE';
  const k = new Acc();
  // 祐生台階要避開的道路（data.roads）
  I._zeRoads = (data.roads || []).filter(
    (r) => r.pts && r.pts.some(([x, z]) => x > 60 && x < 220 && z > 180 && z < 290)
  );
  const byId = (id) => data.buildings.find((q) => q.id === id && Number.isFinite(q.base));
  const ba = byId(ARCH_ID),
    by = byId(YUS_ID),
    bd = byId(DES_ID);
  if (ba) buildArch(k, I, ba, group);
  if (by) buildYusheng(k, I, by, group);
  if (bd) buildDesign(k, I, bd, group);
  const bw = byId(WANG_ID),
    bl = byId(LAND_ID);
  if (bw) buildWang(k, I, bw, group);
  if (bl) buildLand(k, I, bl, group);
  const bi = byId(AI_ID);
  if (bi) buildAi(k, I, bi, group);
  delete I._zeRoads;
  k.finish(group);
  scene.add(group);
  // 晚上：窗玻璃透出暖光
  I.updaters.push((dt, g) => {
    const n = g.night || 0;
    for (const m of glowMats) m.emissiveIntensity = n * 0.35 * m.userData.glow;
  });
  I.zoneE = { group };
  return group;
}
