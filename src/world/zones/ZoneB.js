// B 區「理學院（中央）」校內建築外觀（都不能進去，只做外觀）。
// 做法同 src/world/zones/ZoneA.js、src/world/zones/ZoneH.js：src/world/MapBuilder.js 照舊用 OSM 輪廓蓋牆，zoneBLook() 只換 look／高度，
// buildZoneB() 自建輪廓表達不了的構件（屋頂設備、入口、尖塔、花磚欄杆、A6 步道與招牌）。
//
// 依據（campus-survey/PLAN.md 第 1 節 B 區、批次 2，zone-B.md）：
//  - 理學大樓 w392023395：紅褐面磚（#8c5848）、每層白框窗帶被磚墩分成一組組；屋頂中央偏東藍綠玻璃天窗（約 13×12 m）、
//    東側米黃木格柵設備圍屏、西側兩塊淺橘平台（北 8×14、南 8×11，正射 2024）上有木構架棚、紅磚機房（深綠屋頂）、
//    東南綠色水塔、北緣一排白色設備（2021-02 空拍、正射 2024）；南面大階梯入口：混凝土寬階梯＋不鏽鋼扶手、
//    白色水平雨遮、整面玻璃門（官方街景 2017-09 pano 2NH_ourM-VfGvKd20ZRaBw，往北看）。
//  - 化學館 w392023397：南面白色柱梁框架＋土黃窗下牆帶、入口白色平板雨遮＋土黃方柱、雨遮正面「化學館」右至左
//    （官方 2017-09 pano ItoJcH5FldKQzXqcJ6lGdA）；東面土黃牆＋白色圓弧立管（2017-01 使用者 pano）、北面照東面推、
//    西面照南面推；屋頂東半白色排氣風管群、圓柱排氣筒、中間白色大設備箱、西緣一排白箱。輪廓第 0 批已平移，不動。
//  - 恩惠堂 w492487890：單層挑高（簷高 5 m、屋脊約 9 m），紅磚牆裙＋白壁柱＋白框格子大窗，淺灰屋頂；
//    西南正面門廊（白框＋紅磚、木門）與其上的方塔（正面紅磚＋白框）、白色四角錐尖頂與十字架（2021 地點相片、空拍）。
//  - 恩惠堂副堂 w588976673：灰色粗水泥牆、陡雙坡屋頂、東南山牆有閣樓小窗、1F 白框門，西南側白細柱平頂有頂走廊
//    （官方 2017-09 pano b85s2jdyz2hnuTtRzbkqfQ 往 300°～330°）；OSM height 9.2。Google 2026 衛星在這塊輪廓上
//    看得到沿長軸（西北—東南）的雙坡，和 2017 看到的山牆朝東南一致，確認灰色雙坡小樓就是副堂；屋面是中灰浪板
//    （正射 2024、衛星 2026 都偏淺，比 2017 陰天看到的淺）。
//  - 林森館 w588978711：白／灰白 2F 現代主義小樓，每層厚白懸挑平板屋簷、白色花磚女兒牆、白鐵窗花，
//    東面 1F 黑底白字「兒童主日學」看板（2023-01 使用者 pano A6）。西南面西段（約 6.5 m）2F 往內退 1.6 m、
//    下面 1F 頂是橘褐地磚露台（正射 2024 西南邊的橘褐帶，和東側露台同色）；原本放的 3F 屋頂間沒有影像根據，拿掉。
//    西南面面對副堂、中間只有 4～5 m 的花園，Google 地圖、維基共享資源都沒有這一面的相片，立面照東面推。
//  - 化學館東側 1F w588979511：40×14 m 方塊在正射上大多是草坪和樹，只留一間白牆深框、灰褐坡頂的小屋
//    （2017-01 從恩惠堂校內側大門看到）。
//  - A6 步道：自強商學大樓西北牆外的灰色木棧道，外側一道水泥花台；A6 校門招牌：自強西北角牆上灰色長板
//    「中原大學 Chung Yuan Christian University」白色立體字＋藍底校徽，旁邊橘色「A6 Gate」牌（2023-01 pano A6）。
//    自強商學大樓本身屬 C 區，這裡只在它的牆外掛招牌、鋪步道，不動它的資料。
//  - 第二批補做：理學大樓東牆南段無障礙坡道（data.levels sci_east_ramp＋平台，頂端側門；正射 2024、空拍 drone_sci_z1）；
//    南側東段凸出塊空拍上和主體同高，不做低一層。林森館東側 1F 露台退縮（parts＋splitAc，2F 主體到 u 8.6，正射橘褐面＋
//    pano A6）。教會舊紅鐵皮平房（A6 步道西側，自建＋圓形碰撞，原地兩棵樹用 treeHide 拿掉；空拍、pano A6）。
//    恩惠堂方塔紅磚面紅框白十字（2021 地點相片）。
// 北面、西面玩家幾乎看不到，照南面推；入口、招牌等特殊構件只放在有影像的那一面。
//
// 共用亂數（src/world/MapBuilder.js）：
//  - 只換 look、高度、名稱以外的 OSM 欄位不動；kind 不改。屋頂冷氣（rnd2）只在 h >= 6 且不是斜屋頂時抽，所以副堂、林森館
//    高度不低於 6 m；副堂的雙坡用 look.roof.shape（src/world/MapBuilder.js 的 pitched 仍是 OSM 的值，抽取照舊，冷氣只是不畫）。
//  - 恩惠堂本來就是 OSM gabled（不抽冷氣），只改高度；尖塔 feature 拿掉改自建（landmarkRoof 不抽亂數）。
//  - w588979511（town）：輪廓換成小屋的 4 個頂點，四邊都大於 4 m（town 每條大於 4 m 的邊抽一次舊招牌亂數，次數照舊），
//    凸四邊形形心一定在裡面（水塔抽取照舊）；附近只有沒名字的 service 路，原本、現在都不是店面牆。
//  - 自建構件不加 reserved，碰撞用 Interiors.addWall（地圖植栽之後才加）；南面大階梯用 data.levels（同 A 區圖書館平台）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H, Hgrid, groundY } from '../Terrain.js';
import { canvasTexture } from '../../graphics/GpuMemLifecycle.js';

export const B_IDS = {
  sci: 'w392023395',
  chem: 'w392023397',
  grace: 'w492487890',
  annex: 'w588976673',
  linsen: 'w588978711',
  hut: 'w588979511',
  ziqiang: 'w392023401',
};

// ---------------- 幾何小工具 ----------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const area2 = (P) => {
  let s = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[i],
      c = P[(i + 1) % P.length];
    s += a[0] * c[1] - c[0] * a[1];
  }
  return s;
};
// 建物局部座標：原點 O，u 沿 O→X 的方向，v 轉 90°（朝建物裡面）
function frame(O, X, inside) {
  const d = sub(X, O),
    l = Math.hypot(...d),
    U = [d[0] / l, d[1] / l];
  let V = [-U[1], U[0]];
  if (inside) {
    const q = sub(inside, O);
    if (q[0] * V[0] + q[1] * V[1] < 0) V = [-V[0], -V[1]];
  }
  const P = (u, v) => [O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v];
  const rect = (u0, v0, u1, v1) => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  return { O, U, V, P, rect, ang: Math.atan2(U[1], U[0]) };
}
// 邊 a→c：單位方向 t、朝外法線 n（用輪廓形心判斷）
function edgeOut(a, c, cen) {
  const dx = c[0] - a[0],
    dz = c[1] - a[1],
    l = Math.hypot(dx, dz);
  let nx = dz / l,
    nz = -dx / l;
  const mx = (a[0] + c[0]) / 2,
    mz = (a[1] + c[1]) / 2;
  if ((cen[0] - mx) * nx + (cen[1] - mz) * nz > 0) {
    nx = -nx;
    nz = -nz;
  }
  return { a, c, l, tx: dx / l, tz: dz / l, nx, nz };
}
const along = (e, s, o) => [e.a[0] + e.tx * s + e.nx * o, e.a[1] + e.tz * s + e.nz * o];
// 半平面裁切：keep(p) 回傳 [d1, d2…]，全部 >= 0 的部分保留（同 src/world/zones/ZoneH.js）
function clipPoly(pts, keep) {
  let P = pts.map((p) => [p[0], p[1]]);
  const n = keep(P[0]).length;
  for (let k = 0; k < n; k++) {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        c = P[(i + 1) % P.length],
        da = keep(a)[k],
        dc = keep(c)[k];
      if (da >= 0) out.push(a);
      if (da >= 0 !== dc >= 0) {
        const t = da / (da - dc);
        out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
      }
    }
    P = out;
    if (P.length < 3) return [];
  }
  return P;
}
const centroid = (P) => [
  P.reduce((s, p) => s + p[0], 0) / P.length,
  P.reduce((s, p) => s + p[1], 0) / P.length,
];
function pip(x, z, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i],
      [xj, zj] = P[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

// ---------------- 常數 ----------------
// 理學大樓：局部座標原點在西北角 P0，u 沿北牆往東（約 108°），v 往南。西段南牆在 v 38.0（u -0.1..22.8），
// 東段往南凸出到 v 44.6（u 23.3..37.1）；東牆在 u 約 37.3。
const SCI = {
  h: 17.1,
  floors: 5, // 南側東段凸出塊和主體同高（空拍 drone_sci_z1）
  ramp: { s0: 32.6, s1: 34.4, s2: 43.4, w: 1.4, rise: 0.7 }, // 東牆南段的無障礙坡道（沿東牆、由南往北上）
  sky: [15.5, 15.5, 28.5, 27.5], // 玻璃天窗（正射 2024 約 13×12 m）
  screen: { u: 29.6, v0: 9.5, v1: 34.5, vS: 34.5, u0: 19.0 }, // 木格柵圍屏：天窗東側一道、南側一道
  deckN: [4.8, 13.6, 10.2, 25.8], // 西側淺橘平台（北）
  deckS: [0.6, 29.6, 5.6, 37.2], // 西側淺橘平台（南）
  room: [8.6, 31.0, 14.4, 36.2], // 紅磚機房（深綠屋頂）
  tank: [33.0, 29.0], // 綠色水塔（主屋頂東南、天窗東側設備區）
  // 南面大階梯入口：在西段南牆（v 38.0）中段偏東（官方 2017 往北 0～45° 看到）
  // 立面磚墩在 u 11.35、19.0（src/world/MapBuilder.js fins：西段南牆 22.9 m 分 3 格），玻璃門牆放在兩根磚墩之間
  door: {
    u0: 10.9,
    u1: 19.5,
    g0: 11.98,
    g1: 18.37,
    wall: 38.0,
    deep: 2.6,
    rise: 0.9,
    steps: 6,
    run: 2.4,
    w: 7.6,
  },
};
const CHEM = { h: 10.5, floors: 3 };
const GRACE = { h: 5.0, floors: 1 };
const ANNEX = { h: 6.0, floors: 2, rise: 3.2 }; // 牆 6 m＋屋脊 3.2 m = 9.2 m（OSM height）；h 不低於 6，冷氣抽取照舊
// sw*：西南面西段 1F 露台（沿西南邊從西角量 swLen、往內 swDepth；正射 2024 西南邊西半段橘褐地磚帶約 6.5×1.6 m）
const LINSEN = { h: 7.0, floors: 2, uEast: 8.6, h1: 3.8, swLen: 6.5, swDepth: 1.6 };
// 教會舊平房（紅磚牆、紅窗框、紅鐵皮屋頂）：A6 步道西側，沿自強西北牆方向，離牆 6.3～10.7 m、牆上 s 15～27 m
const BUNG = { s0: 15, s1: 27, o0: 6.3, o1: 10.7, h: 2.9, rise: 1.1 };
// 化學館東側小屋（w588979511 的新輪廓）：沿原本長條方向擺，約 5×7 m，中心 (55, 54)
const HUT = (() => {
  const c = [55.0, 54.0],
    d = [-0.2455, 0.9694],
    p = [0.9694, 0.2455],
    hw = 2.5,
    hl = 3.5;
  const P = [
    [c[0] - p[0] * hw - d[0] * hl, c[1] - p[1] * hw - d[1] * hl],
    [c[0] + p[0] * hw - d[0] * hl, c[1] + p[1] * hw - d[1] * hl],
    [c[0] + p[0] * hw + d[0] * hl, c[1] + p[1] * hw + d[1] * hl],
    [c[0] - p[0] * hw + d[0] * hl, c[1] - p[1] * hw + d[1] * hl],
  ].map((q) => q.map((v) => +v.toFixed(2)));
  return area2(P) > 0 ? P : P.reverse(); // 和 OSM 輪廓同向（正面積）
})();

// ---------------- 外觀 look（src/core/Game.js 在 src/world/MapBuilder.js 蓋樓前套用） ----------------
export function zoneBLook(b) {
  const id = b.id;
  if (id === B_IDS.sci) {
    b.h = SCI.h;
    b.floors = SCI.floors;
    b.look = {
      wall: { base: 'tile', colour: '#8c5848' },
      windows: { type: 'ribbon', ground: 'punched', bay: 2.2, accent: '#ecebe6', glass: '#4f5d66' },
      bands: [{ colour: '#7a4639', at: 0.02, h: 0.24, depth: 0.12, from: 1 }], // 每層窗下凸出的磚帶
      fins: [{ spacing: 7.4, depth: 0.22, t: 1.25, colour: '#86523f', from: 0 }], // 窗組之間的磚墩
      corner: { w: 1.8, colour: '#8c5848' },
      parapet: { h: 1.0, colour: '#7f4d3f' },
      roof: { colour: '#6e625a', ac: false }, // 天窗、圍屏、平台、機房、設備由 buildZoneB 照正射位置蓋
    };
    // 南側東段凸出塊不切低一層：2021-02 空拍 drone_sci_z1 女兒牆與主體齊平（代理複核）
  } else if (id === B_IDS.chem) {
    b.h = CHEM.h;
    b.floors = CHEM.floors;
    b.look = {
      wall: { base: 'smooth', colour: '#ece9e0' },
      windows: { type: 'ribbon', bay: 2.4, accent: '#f2f0ea', glass: '#4f625c' },
      // 南、西：白色柱梁框架＋土黃窗下牆帶
      bands: [{ colour: '#d29a35', at: 0.18, h: 1.1, depth: 0.05, from: 0, on: ['s', 'w'] }],
      fins: [
        {
          spacing: 4.2,
          depth: 0.3,
          t: 0.45,
          colour: '#f2f0ea',
          from: 0,
          ends: true,
          on: ['s', 'w'],
        },
      ],
      // 東、北：整面土黃牆（白色立管由 buildZoneB 蓋）
      faces: [
        {
          on: ['e', 'n'],
          colour: '#dba43d',
          accent: '#f2f0ea',
          windows: { type: 'punched', bay: 2.6 },
        },
      ],
      plinth: { h: 0.8, colour: '#c9c6bd' },
      parapet: { h: 0.9, colour: '#e3a024' },
      roof: { colour: '#d9d6cc', ac: false }, // 屋頂風管群、設備箱由 buildZoneB 蓋
      // 南面入口雨遮由 buildZoneB 蓋（要在正面寫「化學館」）
    };
  } else if (id === B_IDS.grace) {
    b.h = GRACE.h;
    b.floors = GRACE.floors;
    b.feature = (b.feature || []).filter((f) => f !== 'spire'); // 尖塔改成門廊上的方塔＋尖頂（buildZoneB）
    b.look = {
      wall: { base: 'smooth', colour: '#f2f2ee' },
      windows: { type: 'grid', bay: 3.2, accent: '#f6f5f1', glass: '#8d9aa3' },
      plinth: { h: 1.15, colour: '#9b3f35' }, // 紅磚牆裙
      fins: [{ spacing: 3.2, depth: 0.22, t: 0.4, colour: '#f6f5f1', from: 0, ends: true }], // 白壁柱
      parapet: { h: 0, colour: '#f2f2ee' },
      roof: { colour: '#bdbdb9' },
    };
  } else if (id === B_IDS.annex) {
    b.h = ANNEX.h;
    b.floors = ANNEX.floors;
    b.look = {
      wall: { base: 'smooth', colour: '#9a9690' },
      windows: { types: ['punched', 'none'], bay: 4.0, accent: '#e8e6e0', glass: '#4f5a60' },
      parapet: { h: 0, colour: '#8e8a84' },
      roof: { shape: 'gabled', rise: ANNEX.rise, colour: '#6e7173' }, // 中灰浪板（正射 2024、Google 2026 衛星）
    };
  } else if (id === B_IDS.linsen) {
    b.h = LINSEN.h;
    b.floors = LINSEN.floors;
    b.look = {
      wall: { base: 'smooth', colour: '#e6e4de' },
      windows: { type: 'punched', bay: 2.6, accent: '#f3f2ee', glass: '#5d6a72' }, // 窗台約 0.9 m、白框＋白鐵窗花
      plinth: { h: 0.6, colour: '#bdbab2' },
      bands: [{ colour: '#eceae4', at: 0, h: 0.3, depth: 0.75, from: 1, to: 1 }], // 1F 頂厚白懸挑平板
      parapet: { h: 0.12, colour: '#eceae4' }, // 屋頂平板與花磚女兒牆由 buildZoneB 蓋
      roof: { colour: '#a3a19b', ac: false },
    };
    // 東側（含東邊凸出那塊）只有一層，屋頂是花磚圍起來的露台（2023-01 pano A6：右邊 1F 上面是露台，左邊才是 2F）
    const F = frame(b.pts[1], b.pts[2], centroid(b.pts)),
      uOf = ([x, z]) => (x - F.O[0]) * F.U[0] + (z - F.O[1]) * F.U[1];
    const main = clipPoly(b.pts, (q) => [LINSEN.uEast - uOf(q)]),
      east = clipPoly(b.pts, (q) => [uOf(q) - LINSEN.uEast]);
    // 西南面西段：2F 往內退 swDepth，下面 1F 頂是橘褐地磚露台（正射 2024；和東側已由 pano A6 證實的露台同色同做法）
    // 西南邊 = b.pts[0]（西角）→ b.pts[7]（南角）；sOf 沿邊、dOf 往內
    const S = frame(b.pts[0], b.pts[7], centroid(b.pts)),
      sOf = ([x, z]) => (x - S.O[0]) * S.U[0] + (z - S.O[1]) * S.U[1],
      dOf = ([x, z]) => (x - S.O[0]) * S.V[0] + (z - S.O[1]) * S.V[1];
    const mainA = clipPoly(main, (q) => [dOf(q) - LINSEN.swDepth]),
      mainB = clipPoly(main, (q) => [LINSEN.swDepth - dOf(q), sOf(q) - LINSEN.swLen]),
      sw = clipPoly(main, (q) => [LINSEN.swDepth - dOf(q), LINSEN.swLen - sOf(q)]);
    if (mainA.length > 2 && mainB.length > 2 && sw.length > 2 && east.length > 2) {
      b.parts = [
        { pts: mainA, h: LINSEN.h, floors: LINSEN.floors, label: '2F 主體' },
        { pts: mainB, h: LINSEN.h, floors: LINSEN.floors, label: '2F 主體（西南邊東段）' },
        { pts: sw, h: LINSEN.h1, floors: 1, label: '西南 1F＋露台' },
        { pts: east, h: LINSEN.h1, floors: 1, label: '1F＋露台' },
      ];
      b.splitAc = 1;
    }
  } else if (id === B_IDS.hut) {
    b.pts = HUT.map((p) => p.slice());
    b.h = 2.9;
    b.floors = 1;
    b.noShop = true;
    b.look = {
      wall: { base: 'smooth', colour: '#efeeea' },
      windows: { type: 'punched', bay: 3.4, accent: '#3e352d', glass: '#3f474c' },
      faces: [{ on: 'short', windows: { type: 'none' } }], // 門在南面短邊（buildZoneB），短邊不開窗
      plinth: { h: 0.35, colour: '#a9a59c' },
      parapet: { h: 0, colour: '#efeeea' },
      roof: { shape: 'gabled', rise: 1.5, colour: '#8a4a3a', extras: false }, // 紅褐浪板（2017-01）
    };
  }
}

// ---------------- 南面大階梯（data.levels：可以走上去的平台與階梯） ----------------
let sciDoor = null;
// 平台與階梯上的樹、灌木藏起來（src/world/MapBuilder.js opts.treeHide，種植位置與共用亂數不變）
// 化學館南面入口雨遮的位置（南牆、a = 西端，牆長 58% 處、寬 8 m、深 3 m）
function chemCanopy(P) {
  const cen = centroid(P);
  let bi = -1,
    bd = -2;
  for (let i = 0; i < P.length; i++) {
    const e = edgeOut(P[i], P[(i + 1) % P.length], cen);
    if (e.nz > bd) {
      bd = e.nz;
      bi = i;
    }
  }
  let e = edgeOut(P[bi], P[(bi + 1) % P.length], cen);
  if (e.c[0] < e.a[0]) e = edgeOut(e.c, e.a, cen); // a = 西端
  const s0 = e.l * 0.58 - 4;
  return { e, s0, s1: s0 + 8, D: 3.0 };
}
export const zoneBTreeHide = (data) => {
  const out = sciDoor ? [sciDoor.pad, sciDoor.stair] : [];
  const chem = data.buildings.find((b) => b.id === B_IDS.chem);
  if (chem) {
    const { e, s0, s1, D } = chemCanopy(chem.pts);
    out.push([
      along(e, s0 - 0.5, 0.05),
      along(e, s1 + 0.5, 0.05),
      along(e, s1 + 0.5, D + 1),
      along(e, s0 - 0.5, D + 1),
    ]);
  } // 入口門前別長灌木
  const zq = data.buildings.find((b) => b.id === B_IDS.ziqiang),
    nw = zq && a6Edge(zq.pts);
  if (nw)
    out.push([
      along(nw, BUNG.s0 - 0.8, BUNG.o0 - 0.8),
      along(nw, BUNG.s1 + 0.8, BUNG.o0 - 0.8),
      along(nw, BUNG.s1 + 0.8, BUNG.o1 + 0.8),
      along(nw, BUNG.s0 - 0.8, BUNG.o1 + 0.8),
    ]); // 舊平房
  if (sciRamp) out.push(sciRamp.hide);
  return out;
};
// 自強商學大樓西北牆：(93.0,40.4)→(127.1,1.6) 那條邊（朝西北、30 m 以上）
function a6Edge(P) {
  const cen = centroid(P);
  let nw = null;
  for (let i = 0; i < P.length; i++) {
    const e = edgeOut(P[i], P[(i + 1) % P.length], cen);
    if (e.l > 30 && (!nw || -e.nx - e.nz > -nw.nx - nw.nz)) nw = e;
  }
  return nw;
}
let sciRamp = null;
const sciFrame = (pts) => frame(pts[0], pts[1], pts[4]);
export function zoneBTerrain(data) {
  const b = data.buildings.find((q) => q.id === B_IDS.sci);
  if (!b) return;
  const F = sciFrame(b.pts),
    D = SCI.door;
  const pad = F.rect(D.u0, D.wall + 0.04, D.u1, D.wall + D.deep);
  const y = +(Math.max(...pad.map(([x, z]) => Hgrid(x, z))) + D.rise).toFixed(2);
  const uc = (D.u0 + D.u1) / 2;
  const L = data.levels || (data.levels = {});
  L.pads = L.pads || [];
  L.stairs = L.stairs || [];
  const site = '理學大樓南面入口';
  L.pads.push({
    id: 'sci_south_landing',
    y,
    top: '#bdb9b0',
    wall: 'concrete',
    site,
    pts: pad.map((p) => p.map((v) => +v.toFixed(2))),
  });
  const top = F.P(uc, D.wall + D.deep),
    bot = F.P(uc, D.wall + D.deep + D.run);
  L.stairs.push({
    id: 'sci_south_stair',
    site,
    a: bot.map((v) => +v.toFixed(2)),
    b: top.map((v) => +v.toFixed(2)),
    w: D.w,
    y0: 'ground',
    y1: y,
    steps: D.steps,
    wall: 'concrete',
    rail: 'sides',
    railColour: '#c4c8cc',
  });
  const hw = D.w / 2 + 0.2,
    sv = D.wall + D.deep;
  sciDoor = { y, pad, F, stair: F.rect(uc - hw, sv - 0.1, uc + hw, sv + D.run + 0.3) };
  // 東牆南段的無障礙坡道（官方 2017-09 往 320° 看到）：坡道＋北端小平台，可以走上去
  const e = edgeOut(b.pts[1], b.pts[2], centroid(b.pts)),
    Rm = SCI.ramp;
  const rp = [
    along(e, Rm.s0, 0.05),
    along(e, Rm.s1, 0.05),
    along(e, Rm.s1, 0.1 + Rm.w),
    along(e, Rm.s0, 0.1 + Rm.w),
  ];
  const ry = +(Math.max(...rp.map(([x, z]) => Hgrid(x, z))) + Rm.rise).toFixed(2);
  L.pads.push({
    id: 'sci_east_ramp_landing',
    y: ry,
    top: '#bdb9b0',
    wall: 'concrete',
    site: '理學大樓東側坡道',
    pts: rp.map((q) => q.map((v) => +v.toFixed(2))),
  });
  L.stairs.push({
    id: 'sci_east_ramp',
    site: '理學大樓東側坡道',
    a: along(e, Rm.s2, 0.075 + Rm.w / 2).map((v) => +v.toFixed(2)),
    b: along(e, Rm.s1, 0.075 + Rm.w / 2).map((v) => +v.toFixed(2)),
    w: Rm.w,
    y0: 'ground',
    y1: ry,
    steps: 0,
    wall: 'concrete',
    rail: 'sides',
    railColour: '#c4c8cc',
  });
  sciRamp = {
    y: ry,
    e,
    hide: [
      along(e, Rm.s0 - 0.3, 0),
      along(e, Rm.s2 + 0.5, 0),
      along(e, Rm.s2 + 0.5, Rm.w + 0.6),
      along(e, Rm.s0 - 0.3, Rm.w + 0.6),
    ],
  };
}

// ---------------- 貼圖 ----------------
const TEX = {};
// canvas from src/graphics/GpuMemLifecycle.js (stored at the phone texture scale); this file keeps its own keys
function ctex(key, w, h, draw, repeat = true) {
  return TEX[key] || (TEX[key] = canvasTexture(w, h, draw, repeat));
}
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const noise = (g, W, H0, base, n, seed, a = 0.06, sz = 6) => {
  const r = lcg(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H0);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * a})`;
    g.fillRect(r() * W, r() * H0, 1 + r() * sz, 1 + r() * sz);
  }
};
// 米黃木格柵（直條百葉），每 4 m 重複
const slatTex = () =>
  ctex('bSlat', 256, 128, (g, W, H0) => {
    g.fillStyle = 'rgba(0,0,0,0)';
    g.clearRect(0, 0, W, H0);
    const r = lcg(5);
    for (let x = 0; x < W; x += 8) {
      const v = 190 + Math.round(r() * 20);
      g.fillStyle = `rgb(${v + 12},${v - 8},${v - 50})`;
      g.fillRect(x, 0, 6, H0);
    }
    g.fillStyle = '#a88a62';
    g.fillRect(0, 0, W, 5);
    g.fillRect(0, H0 - 5, W, 5);
  });
// 淺橘平台（木地板或隔熱磚）
const deckTex = () =>
  ctex('bDeck', 128, 128, (g, W, H0) => {
    noise(g, W, H0, '#d9b89a', 700, 9, 0.08, 4);
    g.fillStyle = 'rgba(120,85,55,0.35)';
    for (let y = 0; y < H0; y += 8) g.fillRect(0, y, W, 1);
  });
// 紅褐面磚（機房、塔身）
const brickTex = () =>
  ctex('bBrick', 128, 128, (g, W, H0) => {
    noise(g, W, H0, '#8c5848', 700, 13, 0.08, 4);
    g.fillStyle = 'rgba(50,25,18,0.3)';
    const s = H0 / 12;
    for (let y = 0; y < H0; y += s) {
      g.fillRect(0, y, W, 1);
      for (let x = (((y / s) % 2) * W) / 8; x < W; x += W / 4) g.fillRect(x, y, 1, s);
    }
  });
// 恩惠堂的紅磚（偏紅）
const redBrickTex = () =>
  ctex('bRedBrick', 128, 128, (g, W, H0) => {
    noise(g, W, H0, '#9b3f35', 700, 17, 0.09, 4);
    g.fillStyle = 'rgba(235,225,210,0.45)';
    const s = H0 / 16;
    for (let y = 0; y < H0; y += s) {
      g.fillRect(0, y, W, 1);
      for (let x = (((y / s) % 2) * W) / 8; x < W; x += W / 4) g.fillRect(x, y, 1, s);
    }
  });
// 灰色木棧道（順著步道方向的木條）
const boardTex = () =>
  ctex('bBoard', 128, 128, (g, W, H0) => {
    noise(g, W, H0, '#857767', 500, 21, 0.06, 3);
    const r = lcg(23);
    for (let x = 0; x < W; x += 8) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,245,230' : '40,30,20'},${r() * 0.1})`;
      g.fillRect(x, 0, 8, H0);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = 'rgba(50,40,30,0.12)';
        g.fillRect(x + 1 + r() * 6, 0, 0.8, H0);
      }
    }
    g.fillStyle = 'rgba(25,20,15,0.6)';
    for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 1.2, H0); // 橫跨步道的木板縫
  });
// 紅鐵皮浪板
const tinTex = () =>
  ctex('bTin', 128, 64, (g, W, H0) => {
    g.fillStyle = '#a3362e';
    g.fillRect(0, 0, W, H0);
    for (let x = 0; x < W; x += 8) {
      g.fillStyle = 'rgba(255,220,210,0.16)';
      g.fillRect(x, 0, 3, H0);
      g.fillStyle = 'rgba(40,10,8,0.25)';
      g.fillRect(x + 5, 0, 2, H0);
    }
    const r = lcg(41);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(60,25,15,${r() * 0.18})`;
      g.fillRect(r() * W, r() * H0, 6 + r() * 14, 2 + r() * 5);
    }
  });
const gravelTex = () =>
  ctex('bGravel', 128, 128, (g, W, H0) => {
    noise(g, W, H0, '#b8b2a6', 1600, 27, 0.18, 2);
  });
// 白色花磚（鏤空水泥磚）：每塊 0.3 m，中間捲草紋鏤空（透明）
const breezeTex = () =>
  ctex('bBreeze', 128, 128, (g, W, H0) => {
    g.clearRect(0, 0, W, H0);
    const s = W / 4;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const x = i * s,
          y = j * s;
        g.fillStyle = '#eeede8';
        g.fillRect(x, y, s, s);
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.arc(x + s * 0.3, y + s * 0.3, s * 0.17, 0, Math.PI * 2);
        g.arc(x + s * 0.7, y + s * 0.7, s * 0.17, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + s * 0.7, y + s * 0.28, s * 0.09, s * 0.16, 0.6, 0, Math.PI * 2);
        g.ellipse(x + s * 0.3, y + s * 0.72, s * 0.09, s * 0.16, 0.6, 0, Math.PI * 2);
        g.fill();
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(x, y, s, 1);
        g.fillRect(x, y, 1, s);
      }
  });
// 玻璃門牆：鋁框、門扇
const doorTex = () =>
  ctex('bDoor', 256, 128, (g, W, H0) => {
    const gr = g.createLinearGradient(0, 0, 0, H0);
    gr.addColorStop(0, '#5d6d78');
    gr.addColorStop(1, '#2b343a');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H0);
    g.fillStyle = '#b9bcbe';
    for (let x = 0; x <= W; x += W / 8) g.fillRect(Math.min(W - 3, x), 0, 3, H0);
    g.fillRect(0, 0, W, 4);
    g.fillRect(0, H0 * 0.78, W, 3);
    g.fillRect(0, H0 - 4, W, 4);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.beginPath();
    g.moveTo(20, H0);
    g.lineTo(90, 0);
    g.lineTo(130, 0);
    g.lineTo(60, H0);
    g.fill();
  });
// 木門（恩惠堂門廊、林森館）
const woodDoorTex = () =>
  ctex('bWoodDoor', 64, 128, (g, W, H0) => {
    noise(g, W, H0, '#6b4a30', 300, 31, 0.1, 3);
    g.fillStyle = 'rgba(30,18,10,0.6)';
    g.fillRect(W / 2 - 1, 0, 2, H0);
    g.strokeStyle = 'rgba(30,18,10,0.5)';
    g.lineWidth = 2;
    for (const x of [6, W / 2 + 4]) {
      g.strokeRect(x, 10, W / 2 - 10, H0 * 0.38);
      g.strokeRect(x, H0 * 0.52, W / 2 - 10, H0 * 0.4);
    }
  });
function textTex(key, w, h, draw) {
  return ctex(key, w, h, draw, false);
}
const SERIF = '"Noto Serif TC","Songti TC","PMingLiU",serif',
  SANS = '"Noto Sans TC","PingFang TC",sans-serif';
const hText = (key, text, colour, font, w = 1024, h = 160, bg = null) =>
  textTex(key, w, h, (g, W, H0) => {
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H0);
    }
    const chars = [...text],
      step = W / chars.length,
      px = Math.min(H0 * 0.8, step * 0.85);
    g.font = `900 ${px}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    chars.forEach((c, i) => {
      if (c === ' ') return;
      g.fillStyle = 'rgba(30,20,10,0.35)';
      g.fillText(c, step * (i + 0.5) + 3, H0 / 2 + 4);
      g.fillStyle = colour;
      g.fillText(c, step * (i + 0.5), H0 / 2);
    });
  });
// 林森館東面的黑底白字看板
const sundayTex = () =>
  textTex('bSunday', 1024, 144, (g, W, H0) => {
    g.fillStyle = '#16181a';
    g.fillRect(0, 0, W, H0);
    g.strokeStyle = '#8a8d90';
    g.lineWidth = 6;
    g.strokeRect(3, 3, W - 6, H0 - 6);
    g.fillStyle = '#f2f2ee';
    g.textBaseline = 'middle';
    g.font = `900 78px ${SANS}`;
    g.fillText('兒童主日學', 34, H0 / 2 + 2);
    g.font = `700 62px ${SANS}`;
    g.fillText('週日上午10:30～12:00', 470, H0 / 2 + 4);
  });
// A6 校門招牌：灰色長板、藍底校徽、白字
const a6BoardTex = () =>
  textTex('bA6Board', 1024, 280, (g, W, H0) => {
    g.fillStyle = '#5d6165';
    g.fillRect(0, 0, W, H0);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(0, 0, W, 6);
    // 校徽：藍色橢圓、白色麥穗圈、橘色盾牌白十字
    const cx = 150,
      cy = H0 / 2;
    g.fillStyle = '#2350b8';
    g.beginPath();
    g.ellipse(cx, cy, 118, 104, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f2f2ee';
    g.lineWidth = 6;
    g.beginPath();
    g.ellipse(cx, cy, 104, 90, 0, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 3;
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.62 + k * 0.1);
      for (const sgn of [1, -1]) {
        g.beginPath();
        g.ellipse(
          cx + sgn * Math.cos(a) * 82,
          cy + Math.sin(a) * 72 - 10,
          12,
          6,
          sgn * a,
          0,
          Math.PI * 2
        );
        g.stroke();
      }
    }
    g.fillStyle = '#ef7d1a';
    g.beginPath();
    g.moveTo(cx - 38, cy - 40);
    g.lineTo(cx + 38, cy - 40);
    g.lineTo(cx + 38, cy + 10);
    g.quadraticCurveTo(cx + 34, cy + 44, cx, cy + 56);
    g.quadraticCurveTo(cx - 34, cy + 44, cx - 38, cy + 10);
    g.closePath();
    g.fill();
    g.fillStyle = '#f2f2ee';
    g.fillRect(cx - 6, cy - 34, 12, 80);
    g.fillRect(cx - 32, cy - 14, 64, 12);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.font = `900 118px ${SERIF}`;
    g.textBaseline = 'middle';
    g.fillText('中原大學', 324, H0 * 0.38 + 5);
    g.fillStyle = '#f4f4f0';
    g.fillText('中原大學', 320, H0 * 0.38);
    g.font = `700 42px ${SANS}`;
    g.fillText('Chung Yuan Christian University', 318, H0 * 0.76);
  });
const a6GateTex = () =>
  textTex('bA6Gate', 256, 160, (g, W, H0) => {
    g.fillStyle = '#e8731c';
    g.fillRect(0, 0, W, H0);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 92px ${SANS}`;
    g.fillText('A6', W / 2, H0 * 0.4);
    g.font = `800 40px ${SANS}`;
    g.fillText('Gate', W / 2, H0 * 0.8);
  });

// ---------------- 材質 ----------------
const MATS = {},
  glowMats = [];
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const glow = (o, k = 1) => {
    const m = std({ emissive: '#ffd49a', emissiveIntensity: 0, ...o });
    m.userData.glow = k;
    glowMats.push(m);
    return m;
  };
  const m = {
    white: () => std({ color: '#efeee9', roughness: 0.7 }),
    spire: () =>
      std({ color: '#ffffff', roughness: 0.45, emissive: '#ffffff', emissiveIntensity: 0.08 }),
    trim: () => std({ color: '#3e352d', roughness: 0.8 }),
    tin: () => std({ map: tinTex(), roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide }),
    redFrame: () => std({ color: '#8e2a26', roughness: 0.7, side: THREE.DoubleSide }),
    redDoor: () => std({ color: '#7a2622', roughness: 0.75, side: THREE.DoubleSide }),
    terrazzo: () => std({ color: '#85817b', roughness: 0.9 }), // 和 src/world/zones/ZoneC.js 自強外牆深灰洗石子同色
    stone: () => std({ color: '#1e1f21', roughness: 0.35, metalness: 0.2 }),
    arch: () => std({ color: '#d9d8d3', roughness: 0.85, side: THREE.DoubleSide }),
    pipe: () => std({ color: '#efefeb', roughness: 0.45, metalness: 0.15 }),
    duct: () => std({ color: '#e7e7e2', roughness: 0.4, metalness: 0.35 }),
    box: () => std({ color: '#dddcd6', roughness: 0.6, metalness: 0.2 }),
    orange: () => std({ color: '#e3a42a', roughness: 0.7 }),
    ochre: () => std({ color: '#d29a35', roughness: 0.8 }),
    grey: () => std({ color: '#9a9690', roughness: 0.95 }),
    darkRoof: () => std({ color: '#4f5254', roughness: 0.8, side: THREE.DoubleSide }),
    green: () => std({ color: '#3f5a45', roughness: 0.8 }),
    tank: () => std({ color: '#4f8a55', roughness: 0.55, metalness: 0.2 }),
    steel: () => std({ color: '#c4c8cc', roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide }),
    slat: () =>
      std({
        map: slatTex(),
        roughness: 0.85,
        transparent: true,
        alphaTest: 0.3,
        side: THREE.DoubleSide,
      }),
    deck: () => std({ map: deckTex(), roughness: 0.9 }),
    quarry: () => std({ map: deckTex(), color: '#e8a37a', roughness: 0.9 }), // 林森館露台橘褐缸磚（正射 2024）
    timber: () => std({ color: '#bfa27a', roughness: 0.8 }),
    brick: () => std({ map: brickTex(), roughness: 0.9 }),
    redBrick: () => std({ map: redBrickTex(), roughness: 0.92 }),
    skyGlass: () =>
      glow({ color: '#5a8fa0', roughness: 0.12, metalness: 0.55, side: THREE.DoubleSide }, 0.45),
    door: () =>
      glow(
        {
          map: doorTex(),
          roughness: 0.3,
          metalness: 0.2,
          emissiveMap: doorTex(),
          side: THREE.DoubleSide,
        },
        1.8
      ),
    woodDoor: () => std({ map: woodDoorTex(), roughness: 0.8 }),
    winDark: () =>
      glow({ color: '#2f3a40', roughness: 0.2, metalness: 0.4, side: THREE.DoubleSide }, 0.5),
    board: () =>
      std({
        map: boardTex(),
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    gravel: () =>
      std({
        map: gravelTex(),
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    conc: () => std({ color: '#a9a69e', roughness: 0.95 }),
    breeze: () =>
      std({
        map: breezeTex(),
        roughness: 0.85,
        transparent: true,
        alphaTest: 0.4,
        side: THREE.DoubleSide,
      }),
    shrub: () => std({ color: '#3d6631', roughness: 1, flatShading: true }),
    signBack: () => std({ color: '#5d6165', roughness: 0.5, metalness: 0.3 }),
  }[key];
  return (MATS[key] = m());
}

// ---------------- 幾何累加（依材質合併） ----------------
class Acc {
  constructor() {
    this.parts = new Map();
  }
  add(m, g) {
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.uv)
      g.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)
      );
    if (!this.parts.has(m)) this.parts.set(m, []);
    this.parts.get(m).push(g);
    return g;
  }
  // 旋轉角 ang（繞 y，u 軸方向 = (cos, sin)）的盒子，中心 (x, z)、長 lu、寬 lv
  obox(m, x, z, ang, lu, lv, y0, y1, tile = 0) {
    const g = new THREE.BoxGeometry(lu, y1 - y0, lv);
    if (tile) {
      const uv = g.attributes.uv,
        n = g.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const side = Math.abs(n.getX(i)) > 0.5 ? lv : lu;
        uv.setXY(
          i,
          (uv.getX(i) * side) / tile,
          (uv.getY(i) * (Math.abs(n.getY(i)) > 0.5 ? lv : y1 - y0)) / tile
        );
      }
    }
    g.rotateY(-ang);
    g.translate(x, (y0 + y1) / 2, z);
    return this.add(m, g);
  }
  // 水平方向沿 (ax,az)-(bx,bz)、厚 th 的直立板
  slab(m, ax, az, bx, bz, th, y0, y1, tile = 0) {
    const dx = bx - ax,
      dz = bz - az,
      l = Math.hypot(dx, dz),
      g = new THREE.BoxGeometry(l, y1 - y0, th);
    if (tile) {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, (uv.getX(i) * l) / tile, (uv.getY(i) * (y1 - y0)) / tile);
    }
    g.rotateY(-Math.atan2(dz, dx));
    g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    return this.add(m, g);
  }
  cyl(m, x, z, r, y0, y1, seg = 14, open = false, r2 = r) {
    const g = new THREE.CylinderGeometry(r2, r, y1 - y0, seg, 1, open);
    g.translate(x, (y0 + y1) / 2, z);
    return this.add(m, g);
  }
  // 水平圓管：從 a 到 b（[x,y,z]）
  tube(m, a, b, r, seg = 10) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
      l = d.length();
    const g = new THREE.CylinderGeometry(r, r, l, seg, 1, false);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
    );
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    return this.add(m, g);
  }
  quad(
    m,
    a,
    b,
    c,
    d,
    uv = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
  ) {
    const pos = [...a, ...b, ...c, ...a, ...c, ...d],
      u = [...uv[0], ...uv[1], ...uv[2], ...uv[0], ...uv[2], ...uv[3]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.computeVertexNormals();
    return this.add(m, g);
  }
  tri(m, a, b, c) {
    return this.quad(m, a, b, c, c, [
      [0, 0],
      [1, 0],
      [0.5, 1],
      [0.5, 1],
    ]);
  }
  // 貼地或水平多邊形（y 可為函式），法線朝上
  flat(m, pts, y, tile = 4, rot = 0) {
    const v = pts.map(([x, z]) => new THREE.Vector2(x, z)),
      tris = THREE.ShapeUtils.triangulateShape(v, []);
    const cs = Math.cos(rot),
      sn = Math.sin(rot),
      pos = [],
      uv = [];
    for (const t of tris)
      for (const i of t) {
        const [x, z] = pts[i];
        pos.push(x, typeof y === 'function' ? y(x, z) : y, z);
        uv.push((x * cs + z * sn) / tile, (-x * sn + z * cs) / tile);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) {
      const ux = p[i + 3] - p[i],
        uz = p[i + 5] - p[i + 2],
        wx = p[i + 6] - p[i],
        wz = p[i + 8] - p[i + 2];
      if (uz * wx - ux * wz < 0)
        for (let k = 0; k < 3; k++) {
          const t = p[i + 3 + k];
          p[i + 3 + k] = p[i + 6 + k];
          p[i + 6 + k] = t;
        }
    }
    g.computeVertexNormals();
    return this.add(m, g);
  }
  // 直立面板（貼圖整張 0..1）：a、b 是底邊兩端（[x,z]），面朝 (a→b 的右手邊) 或 n
  panel(m, a, b, y0, y1, tu = 0, tv = 0) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]),
      U = tu ? l / tu : 1,
      V = tv ? (y1 - y0) / tv : 1;
    return this.quad(
      m,
      [a[0], y0, a[1]],
      [b[0], y0, b[1]],
      [b[0], y1, b[1]],
      [a[0], y1, a[1]],
      [
        [0, 0],
        [U, 0],
        [U, V],
        [0, V],
      ]
    );
  }
  // 一團灌木（低面數球）
  blob(m, x, y, z, r) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1.15, 0.85, 1.15);
    g.translate(x, y, z);
    return this.add(m, g);
  }
  // 直立面板，面朝 (nx, nz)（自動決定頂點順序；單面材質才看得到）
  face(m, A, B, y0, y1, nx, nz, tu = 0, tv = 0) {
    const Dx = B[0] - A[0],
      Dz = B[1] - A[1];
    return -Dz * nx + Dx * nz > 0
      ? this.panel(m, A, B, y0, y1, tu, tv)
      : this.panel(m, B, A, y0, y1, tu, tv);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = !['board', 'gravel', 'deck', 'quarry', 'skyGlass', 'door'].includes(m);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
function sign(group, tex, w, h, x, y, z, nx, nz, emissive = 0.1, metal = 0.3) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.45,
      metalness: metal,
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: emissive,
    })
  );
  m.position.set(x, y, z);
  m.rotation.y = Math.atan2(nx, nz);
  group.add(m);
  return m;
}

// ---------------- 蓋 ----------------
export function buildZoneB(I, scene, data, collision) {
  const group = new THREE.Group();
  group.name = 'zoneB';
  const k = new Acc(),
    shapes = [];
  const find = (id) => data.buildings.find((b) => b.id === id);
  const baseOf = (b) =>
    Number.isFinite(b.base) ? b.base : Math.min(...b.pts.map(([x, z]) => H(x, z)));
  // I.addWall 的高度帶是「相對牆中點地面」的（src/physics/PhysWorld.js 會再加 H）：這裡傳世界高度，先換算（同 src/world/zones/ZoneG.js）
  const wallC = (ax, az, bx, bz, y0, y1) => {
    const g = H((ax + bx) / 2, (az + bz) / 2);
    I.addWall(ax, az, bx, bz, y0 - g, y1 - g);
  };
  const ringColl = (P, y0, y1) => {
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        c = P[(i + 1) % P.length];
      wallC(a[0], a[1], c[0], c[1], y0, y1);
    }
  };
  // 局部座標框裡的盒子：u0..u1 × v0..v1
  const fbox = (F, m, u0, v0, u1, v1, y0, y1, tile = 0) => {
    const c = F.P((u0 + u1) / 2, (v0 + v1) / 2);
    return k.obox(m, c[0], c[1], F.ang, u1 - u0, v1 - v0, y0, y1, tile);
  };
  const fquad = (F, m, pa, pb, pc, pd, uv) =>
    k.quad(
      m,
      ...[pa, pb, pc, pd].map(([u, v, y]) => {
        const p = F.P(u, v);
        return [p[0], y, p[1]];
      }),
      uv
    );

  // ===== 理學大樓 =====
  const sci = find(B_IDS.sci);
  if (sci) {
    const F = sciFrame(sci.pts),
      B = baseOf(sci),
      top = B + sci.h,
      R = top + 0.02;
    // 玻璃天窗：0.6 m 矮牆圍起來，上面一排排斜玻璃（沿 v 方向的鋸齒，每排 3.2 m）
    const [su0, sv0, su1, sv1] = SCI.sky;
    fbox(F, 'box', su0, sv0, su1, sv1, R, R + 0.6);
    const nRow = Math.round((sv1 - sv0) / 3.0),
      dv = (sv1 - sv0) / nRow;
    for (let i = 0; i < nRow; i++) {
      const v0 = sv0 + i * dv,
        v1 = v0 + dv,
        yb = R + 0.6,
        yt = R + 2.0;
      fquad(F, 'skyGlass', [su0, v0, yb], [su1, v0, yb], [su1, v1, yt], [su0, v1, yt]); // 斜面（朝北低、朝南高）
      fquad(F, 'skyGlass', [su0, v1, yt], [su1, v1, yt], [su1, v1, yb], [su0, v1, yb]); // 直立面
      fbox(F, 'steel', su0, v1 - 0.06, su1, v1 + 0.06, yt - 0.05, yt + 0.05);
      for (const [pa, pb] of [
        [
          [su0, v0, yb],
          [su0, v1, yt],
        ],
        [
          [su1, v0, yb],
          [su1, v1, yt],
        ],
      ])
        fquad(F, 'skyGlass', pa, pb, [pb[0], pb[1], yb], [pa[0], pa[1], yb]);
    }
    for (let u = su0 + 1.6; u < su1 - 0.5; u += 1.6)
      for (let i = 0; i < nRow; i++) {
        const v0 = sv0 + i * dv;
        fquad(
          F,
          'steel',
          [u - 0.04, v0, R + 0.62],
          [u + 0.04, v0, R + 0.62],
          [u + 0.04, v0 + dv, R + 2.02],
          [u - 0.04, v0 + dv, R + 2.02]
        );
      }
    // 東側、南側米黃木格柵圍屏（高 2.8 m），裡面是冷卻設備
    const S = SCI.screen,
      sh = R + 2.8;
    const sA = F.P(S.u, S.v0),
      sB = F.P(S.u, S.v1),
      sC = F.P(S.u0, S.vS);
    k.panel('slat', sA, sB, R, sh, 4, 2.8);
    k.panel('slat', sB, sC, R, sh, 4, 2.8);
    for (let v = S.v0; v <= S.v1 + 0.01; v += 2.5)
      fbox(F, 'timber', S.u - 0.1, v - 0.1, S.u + 0.1, v + 0.1, R, sh + 0.05);
    for (let u = S.u0; u <= S.u + 0.01; u += 2.5)
      fbox(F, 'timber', u - 0.1, S.vS - 0.1, u + 0.1, S.vS + 0.1, R, sh + 0.05);
    for (const [cu, cv] of [
      [32.5, 13],
      [32.5, 19],
      [32.5, 25],
      [24.5, 31.5],
      [33.5, 31],
    ]) {
      const c = F.P(cu, cv);
      k.cyl('box', c[0], c[1], 1.3, R, R + 2.1, 16);
      k.cyl('steel', c[0], c[1], 0.9, R + 2.1, R + 2.35, 16);
    }
    // 西側兩塊淺橘平台，北邊那塊上面有木構架棚
    for (const [u0, v0, u1, v1] of [SCI.deckN, SCI.deckS])
      fbox(F, 'deck', u0, v0, u1, v1, R, R + 0.25, 2);
    {
      const [u0, v0, u1, v1] = SCI.deckN,
        yb = R + 0.25,
        yt = yb + 2.6;
      for (const u of [u0 + 0.3, u1 - 0.3])
        for (let v = v0 + 0.3; v <= v1 - 0.29; v += (v1 - v0 - 0.6) / 4)
          fbox(F, 'timber', u - 0.09, v - 0.09, u + 0.09, v + 0.09, yb, yt);
      for (const u of [u0 + 0.3, u1 - 0.3])
        fbox(F, 'timber', u - 0.08, v0, u + 0.08, v1, yt, yt + 0.22);
      for (let v = v0 + 0.4; v < v1; v += 0.8)
        fbox(F, 'timber', u0, v - 0.05, u1, v + 0.05, yt + 0.22, yt + 0.36);
    }
    // 紅磚機房（深綠屋頂、兩扇小窗、門）
    {
      const [u0, v0, u1, v1] = SCI.room,
        yt = R + 3.2;
      fbox(F, 'brick', u0, v0, u1, v1, R, yt, 3);
      fbox(F, 'green', u0 - 0.25, v0 - 0.25, u1 + 0.25, v1 + 0.25, yt, yt + 0.3);
      for (const u of [u0 + 1.2, u0 + 3.4])
        fbox(F, 'winDark', u, v1 + 0.01, u + 1.0, v1 + 0.05, R + 1.4, R + 2.4);
      fbox(F, 'steel', u1 - 1.6, v1 + 0.01, u1 - 0.6, v1 + 0.05, R, R + 2.1);
    }
    // 綠色水塔、北緣一排白色設備
    {
      const c = F.P(...SCI.tank);
      k.cyl('tank', c[0], c[1], 1.25, R + 0.4, R + 2.6, 16);
      k.cyl('steel', c[0], c[1], 0.15, R, R + 0.4, 6);
    }
    if (sciRamp) {
      const e = sciRamp.e,
        Rm = SCI.ramp,
        a = along(e, Rm.s0 + 0.35, 0.04),
        c = along(e, Rm.s0 + 1.35, 0.04);
      k.face('steel', a, c, sciRamp.y, sciRamp.y + 2.1, e.nx, e.nz);
    } // 坡道頂的側門
    for (let u = 5.5; u < 33; u += 2.4) fbox(F, 'box', u, 1.6, u + 1.4, 2.6, R, R + 1.1);
    for (let u = 6.5; u < 30; u += 7.5) fbox(F, 'duct', u, 3.4, u + 0.6, 7.5, R + 0.4, R + 1.0);

    // 南面大階梯入口（平台與階梯是 data.levels，src/world/MapBuilder.js 畫踏階、側牆、不鏽鋼扶手）
    if (sciDoor) {
      const D = SCI.door,
        y = sciDoor.y,
        w0 = D.wall + 0.03;
      // 整面玻璃門窗（從平台到雨遮底）
      const ga = F.P(D.g1, w0 + 0.12),
        gb = F.P(D.g0, w0 + 0.12);
      k.face('door', ga, gb, y, y + 2.9, -F.V[0], -F.V[1]);
      fbox(F, 'white', D.g0 - 0.12, D.wall - 0.05, D.g0 + 0.05, w0 + 0.2, y, y + 3.0);
      fbox(F, 'white', D.g1 - 0.05, D.wall - 0.05, D.g1 + 0.12, w0 + 0.2, y, y + 3.0);
      // 白色水平雨遮（懸挑，蓋到平台外緣再多 0.4 m）
      const yc = y + 3.0;
      fbox(F, 'white', D.u0 - 0.2, D.wall, D.u1 + 0.2, D.wall + D.deep + 0.4, yc, yc + 0.32);
      shapes.push({ name: 'sci_landing', pts: sciDoor.pad, y0: y, y1: y });
    }
  }

  // ===== 化學館 =====
  const chem = find(B_IDS.chem);
  if (chem) {
    const P = chem.pts,
      cen = centroid(P),
      B = baseOf(chem),
      top = B + chem.h,
      R = top + 0.02;
    const F = frame(P[0], P[1], P[3]);
    // 東面、北面的白色圓弧立管（間距約 2.6 m，從地面到女兒牆頂）
    for (let i = 0; i < P.length; i++) {
      const e = edgeOut(P[i], P[(i + 1) % P.length], cen);
      const face = Math.abs(e.nx) > Math.abs(e.nz) ? (e.nx > 0 ? 'e' : 'w') : e.nz > 0 ? 's' : 'n';
      if (face !== 'e' && face !== 'n') continue;
      // 3 支並排成一束（像溝槽的圓弧管），約每 6 m 一束，牆角那束最靠角（2017-01 東北角特寫）
      const n = Math.max(2, Math.round(e.l / 6));
      for (let j = 0; j < n; j++)
        for (const d of [-0.62, 0, 0.62]) {
          const s = Math.min(e.l - 1.0, Math.max(1.0, ((j + 0.5) * e.l) / n)) + d,
            p = along(e, s, 0.3),
            g0 = H(p[0], p[1]) - 0.3;
          k.cyl('pipe', p[0], p[1], 0.3, g0, top + 0.3, 12);
        }
      wallC(
        along(e, 0, 0.7)[0],
        along(e, 0, 0.7)[1],
        along(e, e.l, 0.7)[0],
        along(e, e.l, 0.7)[1],
        B - 1,
        top
      ); // 立管外緣
    }
    // 南面入口雨遮：白色平板（8×3 m）、兩根土黃方柱、正面「化學館」右至左（官方 2017-09）
    {
      const { e, s0, s1, D } = chemCanopy(P),
        g = Math.min(
          H(...along(e, s0, D)),
          H(...along(e, s1, D)),
          H(...along(e, (s0 + s1) / 2, 1))
        );
      const yc = g + 3.4,
        c = along(e, (s0 + s1) / 2, D / 2),
        ang = Math.atan2(e.tz, e.tx);
      k.obox('white', c[0], c[1], ang, s1 - s0, D, yc - 0.35, yc);
      {
        const f = along(e, (s0 + s1) / 2, D - 0.05);
        k.obox('white', f[0], f[1], ang, s1 - s0, 0.12, yc - 0.7, yc);
      } // 正面加高的飾板（寫字）
      for (const s of [s0 + 0.5, s1 - 0.5]) {
        const p = along(e, s, D - 0.35),
          gp = H(p[0], p[1]);
        k.obox('ochre', p[0], p[1], ang, 0.45, 0.45, gp - 0.2, yc - 0.35);
        wallC(...along(e, s - 0.25, D - 0.12), ...along(e, s + 0.25, D - 0.12), gp, yc);
      }
      const tp = along(e, (s0 + s1) / 2, D + 0.02);
      sign(
        group,
        hText('bChemName', '館學化', '#3a3b3d', SERIF),
        2.4,
        0.52,
        tp[0],
        yc - 0.36,
        tp[1],
        e.nx,
        e.nz,
        0.05,
        0.2
      );
      // 2～3 階台階（不擋路：每階 0.15 m 以內，玩家走得上去）
      {
        const gd = H(...along(e, (s0 + s1) / 2, 1.2));
        for (let i = 0; i < 2; i++) {
          const p = along(e, (s0 + s1) / 2, 0.3 + i * 0.4);
          k.obox('conc', p[0], p[1], ang, 4.0, 0.4 * (2 - i), gd - 0.3, gd + 0.14 * (2 - i));
        }
      }
      shapes.push({
        name: 'chem_canopy',
        pts: [along(e, s0, 0), along(e, s1, 0), along(e, s1, D), along(e, s0, D)],
        y0: yc - 0.35,
        y1: yc,
      });
    }
    // 屋頂：東半白色排氣風管群（u 15..24）、圓柱排氣筒、中間白色大設備箱、西緣一排白箱、東北角橘黃機房
    for (let v = 2.2; v < 21.5; v += 2.1) {
      const y = R + 0.9 + ((v * 7) % 3) * 0.35,
        a = F.P(15.2, v),
        b = F.P(23.8, v);
      k.tube('duct', [a[0], y, a[1]], [b[0], y, b[1]], 0.42);
      for (const u of [15.8, 19.5, 23.2])
        fbox(F, 'steel', u - 0.08, v - 0.08, u + 0.08, v + 0.08, R, y);
    }
    for (let u = 16.5; u < 23.5; u += 3.3) {
      const a = F.P(u, 1.6),
        b = F.P(u, 21.8),
        y = R + 2.3;
      k.tube('duct', [a[0], y, a[1]], [b[0], y, b[1]], 0.36);
    }
    for (const [u, v] of [
      [18.2, 6.5],
      [21.6, 12.5],
      [17.4, 17.8],
    ]) {
      const p = F.P(u, v);
      k.cyl('pipe', p[0], p[1], 0.45, R, R + 3.2, 12);
      k.cyl('steel', p[0], p[1], 0.55, R + 3.2, R + 3.45, 12);
    }
    fbox(F, 'box', 8.0, 8.0, 14.6, 15.4, R, R + 2.3);
    for (let v = 2.5; v < 21; v += 3.6) fbox(F, 'box', 1.2, v, 3.0, v + 2.2, R, R + 1.4);
    fbox(F, 'orange', 19.6, 1.4, 23.6, 4.4, R, R + 2.5);
  }

  // ===== 恩惠堂：西南門廊、方塔、尖頂、十字架 =====
  const grace = find(B_IDS.grace);
  if (grace) {
    const P = grace.pts,
      cen = centroid(P),
      B = baseOf(grace),
      top = B + grace.h;
    // 和 src/world/MapBuilder.js pitchedRoof 同樣的屋脊高度（沿最長邊的框）
    let li = 0,
      ll = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        c = P[(i + 1) % P.length],
        l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (l > ll) {
        ll = l;
        li = i;
      }
    }
    const a0 = P[li],
      a1 = P[(li + 1) % P.length],
      ux = (a1[0] - a0[0]) / ll,
      uz = (a1[1] - a0[1]) / ll;
    let v0 = 1e9,
      v1 = -1e9;
    for (const p of P) {
      const v = (p[0] - a0[0]) * -uz + (p[1] - a0[1]) * ux;
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const ridge = top + Math.min(6, Math.max(1.2, (v1 - v0) * 0.3));
    // 紅磚牆裙（高 1.15 m，貼在牆外 3 cm，白壁柱照樣凸出在前面）
    for (let i = 0; i < P.length; i++) {
      const e = edgeOut(P[i], P[(i + 1) % P.length], cen),
        n = Math.max(1, Math.ceil(e.l / 3));
      for (let j = 0; j < n; j++) {
        const sa = (e.l * j) / n,
          sb = (e.l * (j + 1)) / n,
          A = along(e, sa, 0.03),
          Bq = along(e, sb, 0.03),
          gy = Math.min(H(A[0], A[1]), H(Bq[0], Bq[1]));
        k.face('redBrick', A, Bq, gy - 0.3, B + 1.15, e.nx, e.nz, 1.5, 1.5);
      }
    }
    // 西南短邊（正面）
    let best = null;
    for (let i = 0; i < P.length; i++) {
      const e = edgeOut(P[i], P[(i + 1) % P.length], cen);
      if (e.l < 16 && (!best || e.nz - e.nx > best.nz - best.nx)) best = e;
    }
    const e = best,
      mid = e.l / 2,
      ang = Math.atan2(e.tz, e.tx),
      g = H(...along(e, mid, 1.5));
    // 門廊：寬 3.6 m、凸出 2.4 m、簷高 3.4 m，小雙坡屋頂；白框＋紅磚填充，正面木門
    const pw = 3.6,
      pd = 2.4,
      ph = g + 3.4;
    const pc = along(e, mid, pd / 2);
    k.obox('redBrick', pc[0], pc[1], ang, pw - 0.5, pd - 0.25, g - 0.3, ph - 0.25, 2);
    for (const s of [mid - pw / 2 + 0.2, mid + pw / 2 - 0.2]) {
      const p = along(e, s, pd - 0.2);
      k.obox('white', p[0], p[1], ang, 0.4, 0.4, g - 0.3, ph);
      const q = along(e, s, pd / 2);
      k.obox('white', q[0], q[1], ang, 0.4, pd, ph - 0.45, ph);
    }
    {
      const q = along(e, mid, pd - 0.02);
      k.obox('white', q[0], q[1], ang, pw, 0.4, ph - 0.45, ph);
    }
    {
      const d0 = along(e, mid - 0.8, pd + 0.01),
        d1 = along(e, mid + 0.8, pd + 0.01);
      k.face('woodDoor', d0, d1, g, g + 2.4, e.nx, e.nz);
    }
    {
      // 門廊雙坡（屋脊垂直牆面）
      const rp = (s, d, y) => {
          const p = along(e, s, d);
          return [p[0], y, p[1]];
        },
        rr = ph + 1.2,
        o = 0.3;
      k.quad(
        'darkRoof',
        rp(mid - pw / 2 - o, pd + o, ph),
        rp(mid - pw / 2 - o, -0.1, ph),
        rp(mid, -0.1, rr),
        rp(mid, pd + o, rr)
      );
      k.quad(
        'darkRoof',
        rp(mid + pw / 2 + o, -0.1, ph),
        rp(mid + pw / 2 + o, pd + o, ph),
        rp(mid, pd + o, rr),
        rp(mid, -0.1, rr)
      );
      k.tri('white', rp(mid - pw / 2, pd, ph), rp(mid + pw / 2, pd, ph), rp(mid, pd, rr - 0.1));
    }
    const pP = [
      along(e, mid - pw / 2, 0),
      along(e, mid - pw / 2, pd),
      along(e, mid + pw / 2, pd),
      along(e, mid + pw / 2, 0),
    ];
    ringColl(pP.slice(0, 4), g - 0.5, ph); // 門廊三面（第四面貼著教堂牆）
    shapes.push({ name: 'grace_porch', pts: pP, y0: g, y1: ph + 1.2 });
    // 方塔：2.6 m 見方，一半嵌在山牆裡，從門廊屋頂後方升到屋脊上 2 m；正面紅磚加白框
    const tw = 2.6,
      tc = along(e, mid, 0.2),
      ty0 = ph - 0.3,
      ty1 = ridge + 2.0;
    k.obox('white', tc[0], tc[1], ang, tw, tw, ty0, ty1);
    {
      const f0 = along(e, mid - tw / 2 + 0.3, 0.2 + tw / 2 + 0.01),
        f1 = along(e, mid + tw / 2 - 0.3, 0.2 + tw / 2 + 0.01);
      k.face('redBrick', f0, f1, ty0 + 0.6, ty1 - 0.5, e.nx, e.nz, 1.5, 1.5);
      // 紅磚面上的白十字（2021-02 空拍：山牆紅底白十字）
      const cc = along(e, mid, 0.2 + tw / 2 + 0.04),
        cy = Math.max(ridge + 0.2, (ty0 + ty1) / 2 + 1.2);
      k.obox('spire', cc[0], cc[1], ang, 0.2, 0.06, cy - 0.9, cy + 0.7);
      k.obox('spire', cc[0], cc[1], ang, 0.95, 0.06, cy + 0.1, cy + 0.3);
    }
    k.obox('white', tc[0], tc[1], ang, tw + 0.3, tw + 0.3, ty1 - 0.05, ty1 + 0.25); // 塔頂飾帶
    // 白色四角錐尖頂（6.5 m）與十字架（1.8 m）
    {
      const yb = ty1 + 0.25,
        yt = yb + 6.5,
        h2 = tw / 2;
      const cq = [
        [-h2, -h2],
        [h2, -h2],
        [h2, h2],
        [-h2, h2],
      ].map(([s, d]) => {
        const p = along(e, mid + s, 0.2 + d);
        return [p[0], yb, p[1]];
      });
      for (let i = 0; i < 4; i++) k.tri('spire', cq[i], cq[(i + 1) % 4], [tc[0], yt, tc[1]]);
      for (let i = 0; i < 4; i++) k.tube('trim', cq[i], [tc[0], yt, tc[1]], 0.04, 4); // 稜線細框，淺色天空前也看得出輪廓
      k.obox('spire', tc[0], tc[1], ang, 0.2, 0.2, yt - 0.2, yt + 1.8);
      k.obox('spire', tc[0], tc[1], ang, 1.15, 0.2, yt + 1.0, yt + 1.2);
    }
  }

  // ===== 恩惠堂校內側大門（2017-01 使用者 pano GRACE 就站在門下，往北看）=====
  // 兩根白方柱撐一片半圓混凝土拱殼（跨約 4.6 m、深 1.3 m），東柱外再挑出一片平板；柱上歐式壁燈；東邊黑色石碑「基督教浸信會 恩惠堂」
  if (grace) {
    const C = [52.2, 69.9],
      A = [0.99, 0.139],
      Dp = [0.139, -0.99],
      ang = Math.atan2(A[1], A[0]);
    const at = (a, d) => [C[0] + A[0] * a + Dp[0] * d, C[1] + A[1] * a + Dp[1] * d];
    const g = H(...C),
      R0 = 2.3,
      ys = g + 2.9,
      half = 0.65;
    for (const a of [-R0, R0]) {
      const p = at(a, 0);
      k.obox('white', p[0], p[1], ang, 0.75, 0.75, H(p[0], p[1]) - 0.2, ys);
      ringColl(
        [at(a - 0.38, -0.38), at(a + 0.38, -0.38), at(a + 0.38, 0.38), at(a - 0.38, 0.38)],
        g - 0.5,
        ys
      );
    }
    // 拱殼：內外兩層半圓、前後封邊
    const N = 14,
      th = 0.22;
    for (let i = 0; i < N; i++) {
      const t0 = (Math.PI * i) / N,
        t1 = (Math.PI * (i + 1)) / N;
      for (const [r, sgn] of [
        [R0 + 0.35, 1],
        [R0 + 0.35 - th, -1],
      ]) {
        const q = (t, d) => {
          const p = at(-Math.cos(t) * r, d);
          return [p[0], ys + Math.sin(t) * r * 0.85, p[1]];
        };
        if (sgn > 0) k.quad('arch', q(t0, -half), q(t1, -half), q(t1, half), q(t0, half));
        else k.quad('arch', q(t0, half), q(t1, half), q(t1, -half), q(t0, -half));
      }
      for (const d of [-half, half]) {
        const q = (t, r) => {
          const p = at(-Math.cos(t) * r, d);
          return [p[0], ys + Math.sin(t) * r * 0.85, p[1]];
        };
        k.quad(
          'arch',
          q(t0, R0 + 0.35),
          q(t1, R0 + 0.35),
          q(t1, R0 + 0.35 - th),
          q(t0, R0 + 0.35 - th)
        );
      }
    }
    {
      const p = at(R0 + 1.6, 0);
      k.obox('arch', p[0], p[1], ang, 3.0, 1.5, ys + 0.1, ys + 0.35);
    } // 東柱外挑出的平板
    for (const a of [-R0, R0]) {
      const p = at(a, 0.45);
      k.obox('trim', p[0], p[1], ang, 0.22, 0.22, ys - 1.0, ys - 0.6);
      k.cyl('spire', p[0], p[1], 0.09, ys - 0.95, ys - 0.65, 8);
    } // 壁燈
    // 黑色石碑（白框基座）：東柱外約 2.5 m
    {
      const p = at(R0 + 2.6, 0.6),
        gp = H(p[0], p[1]);
      k.obox('white', p[0], p[1], ang, 2.4, 0.5, gp - 0.2, gp + 0.45);
      k.obox('stone', p[0], p[1], ang, 2.2, 0.32, gp + 0.45, gp + 1.55);
      const f = at(R0 + 2.6, 0.6 - 0.17);
      sign(
        group,
        hText('bGraceStone', '基督教浸信會 恩惠堂', '#e8e6df', SERIF, 1024, 128),
        2.0,
        0.26,
        f[0],
        gp + 1.15,
        f[1],
        -Dp[0],
        -Dp[1],
        0.05,
        0.1
      ); // 字朝南（校內車道那側）
      ringColl(
        [at(R0 + 1.4, 0.35), at(R0 + 3.8, 0.35), at(R0 + 3.8, 0.85), at(R0 + 1.4, 0.85)],
        gp - 0.5,
        gp + 1.55
      );
    }
    shapes.push({
      name: 'grace_gate',
      pts: [at(-R0 - 0.4, -half), at(R0 + 3.9, -half), at(R0 + 3.9, 0.9), at(-R0 - 0.4, 0.9)],
      y0: g,
      y1: ys + R0,
    });
  }

  // ===== 恩惠堂副堂：東南山牆閣樓窗與門、西南側有頂走廊 =====
  const annex = find(B_IDS.annex);
  if (annex) {
    const P = annex.pts,
      cen = centroid(P),
      B = baseOf(annex),
      top = B + annex.h;
    let se = null,
      sw = null;
    for (let i = 0; i < P.length; i++) {
      const e = edgeOut(P[i], P[(i + 1) % P.length], cen);
      if (e.l < 12 && (!se || e.nx + e.nz > se.nx + se.nz)) se = e;
      if (e.l > 12 && (!sw || e.nz - e.nx > sw.nz - sw.nx)) sw = e;
    }
    if (se) {
      const m = se.l / 2,
        g = H(...along(se, m, 1));
      {
        const p = along(se, m - 0.5, 0.04),
          q = along(se, m + 0.5, 0.04);
        k.face('winDark', p, q, top + 0.7, top + 1.6, se.nx, se.nz);
      }
      {
        const p = along(se, m - 1.6, 0.04),
          q = along(se, m - 0.6, 0.04);
        k.face('woodDoor', p, q, g, g + 2.2, se.nx, se.nz);
      }
      for (const [s0, s1, y0, y1] of [[m - 1.75, m - 0.45, g + 2.2, g + 2.35]]) {
        const p = along(se, (s0 + s1) / 2, 0.08);
        k.obox('white', p[0], p[1], Math.atan2(se.tz, se.tx), s1 - s0, 0.12, y0, y1);
      }
    }
    if (sw) {
      const ang = Math.atan2(sw.tz, sw.tx),
        W = 2.8,
        yR = H(...along(sw, sw.l / 2, W / 2)) + 2.7;
      const c = along(sw, sw.l / 2, W / 2);
      k.obox('box', c[0], c[1], ang, sw.l - 0.6, W + 0.2, yR, yR + 0.18);
      for (let s = 0.6; s <= sw.l - 0.5; s += (sw.l - 1.2) / 4) {
        const p = along(sw, s, W - 0.15);
        k.cyl('white', p[0], p[1], 0.07, H(p[0], p[1]) - 0.1, yR, 8);
      }
    }
  }

  // ===== 林森館：屋頂厚平板、花磚女兒牆、西南與東側 1F 露台、「兒童主日學」看板 =====
  const lin = find(B_IDS.linsen);
  if (lin) {
    const P = lin.pts,
      cen = centroid(P),
      B = baseOf(lin);
    // 每一塊（2F 主體、1F 露台）各自一圈屋頂平板＋花磚女兒牆；邊外側緊貼一樣高或更高的另一塊（矮塊貼高牆、
    // 2F 主體兩塊之間的切線）不做，貼著矮塊的高牆邊照做（露台上方的 2F 屋頂女兒牆）
    const vols = lin.parts || [{ pts: P, h: lin.h }];
    for (const V of vols) {
      const Q = V.pts,
        vc = centroid(Q),
        vt = B + V.h,
        lower = V.h < lin.h;
      for (let i = 0; i < Q.length; i++) {
        const e = edgeOut(Q[i], Q[(i + 1) % Q.length], vc),
          ang = Math.atan2(e.tz, e.tx);
        if (e.l < 0.3) continue;
        const probe = along(e, e.l / 2, 0.4);
        if (vols.some((W) => W !== V && W.h >= V.h && pip(...probe, W.pts))) continue;
        const c = along(e, e.l / 2, 0.3);
        k.obox('white', c[0], c[1], ang, e.l + 1.4, 1.3, vt - 0.32, vt); // 屋頂平板懸挑 0.65 m
        const p = along(e, -0.55, 0.5),
          q = along(e, e.l + 0.55, 0.5);
        k.panel('breeze', p, q, vt, vt + 0.9, 1.2, 1.2);
        k.obox('white', ...along(e, e.l / 2, 0.5), ang, e.l + 1.1, 0.2, vt + 0.9, vt + 1.0);
      }
      if (lower && V.label === '1F＋露台')
        fbox(
          frame(P[1], P[2], cen),
          'quarry',
          LINSEN.uEast + 0.1,
          0.3,
          LINSEN.uEast + 1.6,
          9.5,
          vt + 0.01,
          vt + 0.05,
          2
        ); // 露台靠牆一條橘褐地磚（正射）
      else if (lower)
        fbox(
          frame(P[0], P[7], cen),
          'quarry',
          0,
          -0.3,
          LINSEN.swLen,
          LINSEN.swDepth,
          vt + 0.01,
          vt + 0.05,
          2
        ); // 西南露台整條橘褐地磚（正射 2024）
    }
    // 原本東南端的 4×4 m 屋頂間拿掉：正射 2024 那塊橘褐面其實是西南面 1F 露台（見上），
    // 2023-01 pano A6 與 Google 2026 衛星都看不到屋頂間
    // 東面 1F 屋簷下的黑底白字看板（2023-01）
    let east = null;
    for (let i = 0; i < P.length; i++) {
      const e = edgeOut(P[i], P[(i + 1) % P.length], cen);
      if (e.l > 3.6 && (!east || e.nx > east.nx)) east = e;
    }
    if (east) {
      const p = along(east, east.l / 2, 0.1);
      sign(
        group,
        sundayTex(),
        Math.min(3.6, east.l - 0.4),
        0.5,
        p[0],
        B + LINSEN.h1 - 0.75,
        p[1],
        east.nx,
        east.nz,
        0.15,
        0.1
      );
    }
  }

  // ===== 化學館東側小屋（w588979511）：深色門、碎石地 =====
  const hut = find(B_IDS.hut);
  if (hut) {
    const P = hut.pts,
      cen = centroid(P),
      B = baseOf(hut);
    let s = null;
    for (let i = 0; i < P.length; i++) {
      const e = edgeOut(P[i], P[(i + 1) % P.length], cen);
      if (!s || e.nz > s.nz) s = e;
    }
    {
      const p = along(s, s.l / 2 - 0.5, 0.03),
        q = along(s, s.l / 2 + 0.5, 0.03);
      k.face(
        'woodDoor',
        p,
        q,
        H(...along(s, s.l / 2, 0.5)),
        H(...along(s, s.l / 2, 0.5)) + 2.1,
        s.nx,
        s.nz
      );
    }
    // 白牆上的深色木條框架：牆角直條、每面中間一條、簷下一圈
    for (let i = 0; i < P.length; i++) {
      const e = edgeOut(P[i], P[(i + 1) % P.length], cen),
        ang = Math.atan2(e.tz, e.tx);
      for (const t of [0.02, 0.5, 0.98]) {
        if (t === 0.5 && e === s) continue;
        const q = along(e, e.l * t, 0.05);
        k.obox('trim', q[0], q[1], ang, 0.14, 0.08, H(q[0], q[1]) - 0.1, B + hut.h);
      }
      const m = along(e, e.l / 2, 0.05);
      k.obox('trim', m[0], m[1], ang, e.l, 0.08, B + hut.h - 0.18, B + hut.h);
    }
    const F = frame(P[0], P[1], P[3]);
    const gv = F.rect(-1.5, -1.5, 6.5, 8.5);
    k.flat(
      'gravel',
      gv.map((p) => p.slice()),
      (x, z) => H(x, z) + 0.03,
      3
    );
  }

  // ===== A6 步道（自強商學大樓西北牆外的木棧道與花台）與 A6 校門招牌 =====
  const zq = find(B_IDS.ziqiang);
  if (zq) {
    const P = zq.pts,
      _cen = centroid(P);
    // 西北牆：(93.0,40.4)→(127.1,1.6) 那條邊（朝西北、最長的那幾條裡最靠 A6 的）
    const nw = a6Edge(P);
    if (nw) {
      const W = 4.2,
        yOf = (x, z) => groundY(x, z) + 0.1,
        ang = Math.atan2(nw.tz, nw.tx);
      // 木棧道：從牆腳鋪到離牆 4.2 m（OSM footway 中線約離牆 3.5 m）；北端越過牆角再往 A6 校門延伸 3.5 m。
      // 牆外約 4.9 m 起是平行的 service 路（(109.5,11.1)→(125.7,-8.0)），棧道不壓到它
      const strip = [
        along(nw, 1.0, 0.15),
        along(nw, nw.l + 3.5, 0.15),
        along(nw, nw.l + 3.5, W),
        along(nw, 1.0, W),
      ];
      k.flat('board', strip, yOf, 2.0, ang);
      // 外側水泥花台（寬 1.2 m、高 0.45 m，種灌木）：只放在 service 路還沒開始的南段，中間留缺口
      const PW = 1.2;
      for (const [r0, r1] of [
        [4.0, 14.5],
        [17.0, 30.0],
      ]) {
        const c = along(nw, (r0 + r1) / 2, W + PW / 2),
          hs = [H(...along(nw, r0, W + PW / 2)), H(...along(nw, r1, W + PW / 2)), H(c[0], c[1])];
        const g = Math.min(...hs),
          yT = Math.max(...hs) + 0.45;
        for (const o of [W + 0.08, W + PW - 0.08]) {
          const p = along(nw, r0, o),
            q = along(nw, r1, o);
          k.slab('conc', p[0], p[1], q[0], q[1], 0.16, g - 0.3, yT);
        }
        for (const r of [r0, r1]) {
          const p = along(nw, r, W + 0.08),
            q = along(nw, r, W + PW - 0.08);
          k.slab('conc', p[0], p[1], q[0], q[1], 0.16, g - 0.3, yT);
        }
        for (let r = r0 + 0.5; r < r1 - 0.3; r += 0.75) {
          const q = along(nw, r, W + PW / 2 + Math.sin(r * 3.1) * 0.12),
            sc = 0.42 + 0.12 * Math.sin(r * 5.7);
          k.blob('shrub', q[0], yT + 0.12, q[1], sc);
        }
        const ring = [
          along(nw, r0, W),
          along(nw, r1, W),
          along(nw, r1, W + PW),
          along(nw, r0, W + PW),
        ];
        ringColl(ring, g - 0.5, yT + 0.4);
        shapes.push({ name: 'a6_planter', pts: ring, y0: g, y1: yT });
      }
      // 教會舊平房（官方 2017-09 b85s… 往 235°～280°、2023-01 a6_h270_z）：紅磚牆、紅窗框、紅鐵皮雙坡，長邊順著步道
      {
        const Bg = BUNG,
          c4 = [
            along(nw, Bg.s0, Bg.o0),
            along(nw, Bg.s1, Bg.o0),
            along(nw, Bg.s1, Bg.o1),
            along(nw, Bg.s0, Bg.o1),
          ];
        const hs = c4.map(([x, z]) => H(x, z)),
          g = Math.min(...hs),
          yE = Math.max(...hs) + Bg.h,
          yR = yE + Bg.rise,
          om = (Bg.o0 + Bg.o1) / 2,
          ov = 0.45;
        const mid = along(nw, (Bg.s0 + Bg.s1) / 2, om);
        k.obox('redBrick', mid[0], mid[1], ang, Bg.s1 - Bg.s0, Bg.o1 - Bg.o0, g - 0.3, yE, 2);
        const q3 = (sv, o, y) => {
          const q = along(nw, sv, o);
          return [q[0], y, q[1]];
        };
        k.quad(
          'tin',
          q3(Bg.s0 - ov, Bg.o0 - ov, yE - 0.15),
          q3(Bg.s1 + ov, Bg.o0 - ov, yE - 0.15),
          q3(Bg.s1 + ov, om, yR),
          q3(Bg.s0 - ov, om, yR),
          [
            [0, 0],
            [6, 0],
            [6, 1],
            [0, 1],
          ]
        );
        k.quad(
          'tin',
          q3(Bg.s1 + ov, Bg.o1 + ov, yE - 0.15),
          q3(Bg.s0 - ov, Bg.o1 + ov, yE - 0.15),
          q3(Bg.s0 - ov, om, yR),
          q3(Bg.s1 + ov, om, yR),
          [
            [0, 0],
            [6, 0],
            [6, 1],
            [0, 1],
          ]
        );
        for (const sv of [Bg.s0, Bg.s1])
          k.tri('redBrick', q3(sv, Bg.o0, yE), q3(sv, Bg.o1, yE), q3(sv, om, yR - 0.05));
        // 面向步道那側（o0）：紅框窗 4 扇、紅門 2 扇
        for (let i = 0; i < 6; i++) {
          const sc = Bg.s0 + ((i + 0.5) * (Bg.s1 - Bg.s0)) / 6,
            door = i === 1 || i === 4,
            w = door ? 0.95 : 1.3,
            y0 = door ? g + 0.05 : g + 1.0,
            y1 = g + 2.2;
          const a = along(nw, sc - w / 2 - 0.08, Bg.o0 - 0.03),
            b2 = along(nw, sc + w / 2 + 0.08, Bg.o0 - 0.03);
          k.face('redFrame', a, b2, y0 - 0.08, y1 + 0.08, -nw.nx, -nw.nz);
          const a2 = along(nw, sc - w / 2, Bg.o0 - 0.05),
            b3 = along(nw, sc + w / 2, Bg.o0 - 0.05);
          k.face(door ? 'redDoor' : 'winDark', a2, b3, y0, y1, -nw.nx, -nw.nz);
        }
        ringColl(c4, g - 0.5, yE);
        shapes.push({ name: 'bungalow', pts: c4, y0: g, y1: yR });
      }
      // A6 校門招牌：西北牆北端（牆角往西南 1.2～6.2 m），灰色長板＋藍底校徽＋白字；旁邊橘色「A6 Gate」
      const gB = groundY(...along(nw, nw.l - 3.7, 0.3));
      {
        const c = along(nw, nw.l - 3.9, 0.04);
        k.obox('terrazzo', c[0], c[1], ang, 6.6, 0.06, gB + 0.3, gB + 3.4);
      } // 招牌那段是沒開窗的磨石子牆（2023-01），蓋住後面的窗
      {
        const c = along(nw, nw.l - 3.7, 0.09);
        k.obox('signBack', c[0], c[1], ang, 5.0, 0.1, gB + 1.25, gB + 2.6);
      }
      {
        const c = along(nw, nw.l - 3.7, 0.145);
        sign(group, a6BoardTex(), 4.9, 1.32, c[0], gB + 1.925, c[1], nw.nx, nw.nz, 0.08, 0.2);
      }
      {
        const c = along(nw, nw.l - 0.4, 0.1);
        sign(group, a6GateTex(), 0.8, 0.5, c[0], gB + 2.2, c[1], nw.nx, nw.nz, 0.12, 0.1);
      }
    }
  }

  k.finish(group);
  scene.add(group);
  I.visualUpdaters.push((dt, g) => {
    const n = g.night || 0;
    for (const m of glowMats) m.emissiveIntensity = n * 0.35 * m.userData.glow;
  });
  I.zoneB = { group, shapes };
  return group;
}
