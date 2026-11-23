// H 區「東側」校內建築外觀（都不能進去，只做外觀）。
// 做法同 src/world/zones/ZoneG.js：src/world/MapBuilder.js 照舊用 OSM 輪廓蓋牆，zoneHLook() 只換 look／高度／執行時切塊（b.parts＋splitAc，
// 輪廓 b.pts、kind 不動，共用亂數抽取次數不變），zoneHAdd() 新增 OSM 沒有的建物（synthetic，各自用自己的亂數），
// buildZoneH() 自建輪廓表達不了的構件（空橋、鋼格架、入口雨遮、大階梯、招牌、沖孔板外框等）。
// 自建構件不加 reserved（會讓全圖牆邊灌木的共用亂數錯位），碰撞用 Interiors.addWall（地圖植栽之後才加）。
//
// 依據（campus-survey/PLAN.md 批次 1、zone-H.md）：
//  - 信實樓 w392023441：三翼（北、中、南翼）＋東側連接，中翼與南翼之間是天井（正射 2024 陰影）；11F（官方 2017 數到 11 層），
//    灰色細橫紋磁磚、每層淺咖啡飾帶、轉角藍色直條；每翼端部屋頂深色鋼格架；入口在西側凹口，藍綠鋼構玻璃雨遮＋花崗石方柱、金字館名。
//  - 熱誠樓 B C 棟 w587178273：兩塔＋裙樓。中塔（西北）白牆＋木色百葉直帶＋寶藍實牆，東南塔整面寶藍＋白格子框（官方 2026-05）；
//    裙樓 2F，藍色懸挑平台沿建物、室外大階梯、米色清水斜牆直寫「熱誠樓」（評論相片 2025-05）；層數未確認，暫用 14F。
//  - 熱誠樓 A 棟 w587171777：端牆整片寶藍、直寫「中原大學」「熱誠宿舍」，長面白色柱梁格子＋淺咖啡百葉，頂樓藍框＋白直格柵（2025-05）。
//  - A／B 連通體 w700658288：實心 2F 改成架高空橋（深色玻璃廊道、上下藍色框梁、下方柱子撐著開放通道，2021 相片）。
//  - 薄膜中心南棟 w492487884：2 層但層高高（約 9.5 m），淺灰金屬板，西端整片玻璃樓梯間、中間大鐵捲門、綠色雨遮、
//    西南角灰綠直立招牌柱「薄膜中心」（2025-03 相片）。
//  - 薄膜中心中棟 w492487885：南段 3F＋第 4 層退縮窗帶、綠色直條窗框；北段米黃高牆量體約 16 m（2014 環景、2017 官方）。
//  - 薄膜中心 4館 w492487889：2F／8.5 m 淺灰金屬浪板廠房，東面外掛鋼梯（官方 2017）；正射量長約 41 m（OSM 只有 34.5 m）。
//  - 實英樓 w492487886：1F 咖啡灰磁磚、2F 淺灰藍牆、頂上一圈淺灰沖孔鋼板外框，總高約 11 m，招牌「實英樓」（官方 2026-05）。
//  - 知行領航館（OSM 沒有，正射量約 63×26 m）：3F＋B1 基座，灰牆嵌寶藍／淺藍盒狀窗框，西北角藍框玻璃盒，屋頂太陽能板（2019 使用者環景）；
//    中間偏東的方形天井、西南角 1F 附屬棟照正射 2024。
//  - 忍耐樓（f694 改）：兩個白色平頂小盒（正射 2024，G 區調查第 8 節）。
// 沒有影像的面照同棟看得到的面推，入口、招牌等特殊構件不編。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundY } from '../Terrain.js';

export const H_IDS = {
  xs: 'w392023441',
  rA: 'w587171777',
  rBC: 'w587178273',
  link: 'w700658288',
  bmS: 'w492487884',
  bmM: 'w492487885',
  bm4: 'w492487889',
  sy: 'w492487886',
  rn: 'f694',
};

// 凸多邊形以外也可用的半平面裁切：keep(p) 回傳 [d1, d2…]，全部 >= 0 的部分保留（同 src/world/zones/ZoneG.js）
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
// 軸向長方形，頂點順序和 OSM 輪廓同向（俯視 x 東、z 南）
const rect = (x0, z0, x1, z1) => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

// ---------------- 幾何常數 ----------------
// 信實樓：天井在中翼與南翼之間（z -165.9..-147.0），西、東兩側只留 3 m 寬的 2F 連接
const XS = {
  zN: -165.9,
  zS: -147.0,
  xW: 334.0,
  xE: 364.8,
  h: 37.0,
  floors: 11,
  linkH: 7.2,
  ends: [
    [330.2, -214.6, -193.6],
    [327.7, -181.9, -166.3],
    [329.2, -146.6, -128.1],
  ], // 各翼西端 x、z 範圍（屋頂鋼格架）
  door: { x: 347.6, z0: -191.2, z1: -184.4 },
};
// 熱誠 B C：沿西南長邊建局部座標。O 是南角，u 往西北（長向），v 往東北
const RBC = {
  O: [323.7, -225.6],
  U: [-0.6525, -0.7579],
  V: [0.7579, -0.6525],
  uSE: 13.0,
  uNW: 28.0,
  h: 46.8,
  floors: 14,
  podH: 8.4,
};
const bcP = (u, v) => [
  RBC.O[0] + RBC.U[0] * u + RBC.V[0] * v,
  RBC.O[1] + RBC.U[1] * u + RBC.V[1] * v,
];
const bcU = ([x, z]) => (x - RBC.O[0]) * RBC.U[0] + (z - RBC.O[1]) * RBC.U[1];
// 薄膜中棟：z -13.8 以北是米黃高牆量體
const BM = { zSplit: -13.8, hS: 11.2, hN: 16.0 };
// 知行領航館、4館南北兩段、忍耐樓（synthetic 新增）
// 正射 2024（ortho_zhixing.png，10.75 px/m）：主體中間偏東有一個約 5.6×10 m 的方形天井；西北角藍框盒約 6×12.6 m；
// 西南角貼著西牆一棟深灰平頂低矮附屬棟約 8.4×4.2 m（影子很短，1F）
const ZX = {
  pts: rect(351.3, -85.9, 414.0, -59.9),
  h: 13.5,
  court: [391.0, -78.0, 396.6, -68.0],
  gbox: [345.2, -84.1, -71.5],
};
// 天井（內環要和外環反向）
const zxCourt = () => {
  const [x0, z0, x1, z1] = ZX.court;
  return [
    [x0, z0],
    [x0, z1],
    [x1, z1],
    [x1, z0],
  ];
};
const ADD = [
  {
    id: 'zh-zhixing',
    name: '知行領航館',
    kind: 'campus',
    h: ZX.h,
    floors: 3,
    pts: ZX.pts,
    holes: [zxCourt()],
    look: {
      wall: { base: 'smooth', colour: '#8a8783' },
      windows: { types: ['ribbon'], bay: 4.2, accent: '#3a3d40', glass: '#4b5961' },
      plinth: { h: 2.2, colour: '#6f6d69' },
      parapet: { h: 0.9, colour: '#7a7874' },
      roof: { colour: '#9a9894', solar: { u: [0.04, 0.96], v: [0.12, 0.9], colour: '#2b3852' } },
    },
  },
  // 知行領航館西南角的低矮附屬棟
  {
    id: 'zh-zhixing-annex',
    kind: 'campus',
    h: 4.5,
    floors: 1,
    pts: rect(342.9, -68.7, 351.3, -64.5),
    look: {
      wall: { base: 'smooth', colour: '#7a7874' },
      windows: { types: ['ribbon'], bay: 4.2, accent: '#3a3d40', glass: '#4b5961' },
      parapet: { h: 0.5, colour: '#6a6864' },
      roof: { colour: '#5f5f5c', ac: false },
    },
  },
  // 4館北、南兩段（正射：整棟約 41 m，OSM 只畫了中間 34.5 m）
  {
    id: 'zh-bm4-n',
    kind: 'campus',
    h: 8.5,
    floors: 2,
    pts: rect(287.7, -73.0, 296.4, -70.5),
    look: null,
  },
  {
    id: 'zh-bm4-s',
    kind: 'campus',
    h: 8.5,
    floors: 2,
    pts: rect(287.9, -36.0, 296.6, -31.8),
    look: null,
  },
  // 忍耐樓北側那個白盒（南側 L 形的是 f694）
  {
    id: 'zh-rennai-b',
    kind: 'dorm',
    h: 10.5,
    floors: 3,
    pts: rect(-109.4, -264.9, -97.3, -257.0),
    look: null,
  },
];
const BM4_LOOK = () => ({
  wall: { base: 'smooth', colour: '#c9cbcb' },
  windows: { types: ['punched', 'ribbon'], bay: 4.0, accent: '#4a4f52', glass: '#5d6a72' },
  parapet: { h: 0.35, colour: '#6a6e70' },
  roof: { colour: '#d0d0cc' },
});
const RENNAI_LOOK = () => ({
  wall: { base: 'smooth', colour: '#ecebe6' },
  windows: { type: 'punched', bay: 3.2, accent: '#d8d6d0', glass: '#55626a' },
  parapet: { h: 0.6, colour: '#e2e1dc' },
  roof: { colour: '#e9e8e3' },
});

// ---------------- 外觀 look（src/core/Game.js 在 src/world/MapBuilder.js 蓋樓前套用） ----------------
export function zoneHLook(b) {
  const id = b.id;
  if (id === H_IDS.xs) {
    b.h = XS.h;
    b.floors = XS.floors;
    b.look = {
      wall: { base: 'tile', colour: '#7d7873' },
      windows: { type: 'punched', bay: 3.4, accent: '#5f5a56', glass: '#55636c' },
      bands: [{ colour: '#c4a58a', h: 0.26, depth: 0.14 }], // 每層一道淺咖啡飾帶
      faces: [
        { on: ['w', 'e'], colour: '#8a8580', accent: '#3a3c3e', windows: { type: 'gallery' } },
      ], // 翼端（朝東西）：一層層凹陽台
      corner: { w: 1.0, colour: '#3d6fb5', on: ['n', 's'], minLen: 15 },
      parapet: { h: 0.9, colour: '#6e6a66' },
      roof: { colour: '#8a8a86' },
    };
    const cl = (keep) => clipPoly(b.pts, keep);
    const north = cl(([, z]) => [XS.zN - z]),
      south = cl(([, z]) => [z - XS.zS]);
    const west = cl(([x, z]) => [z - XS.zN, XS.zS - z, XS.xW - x]),
      east = cl(([x, z]) => [z - XS.zN, XS.zS - z, x - XS.xE]);
    if ([north, south, west, east].every((p) => p.length > 2)) {
      b.parts = [
        { pts: north, floors: XS.floors, h: XS.h, label: '北翼、中翼' },
        { pts: south, floors: XS.floors, h: XS.h, label: '南翼' },
        { pts: west, floors: 2, h: XS.linkH, label: '天井西側連接' },
        { pts: east, floors: 2, h: XS.linkH, label: '天井東側連接' },
      ];
      b.splitAc = 1; // 屋頂冷氣照原本的 rnd2 抽，落在天井上方的自動不畫
    }
  } else if (id === H_IDS.rBC) {
    // 兩塔＋裙樓；層數未確認，暫用 14F
    const base = { base: 'smooth', colour: '#e8e8e6' };
    b.look = {
      wall: base,
      windows: { type: 'grid', bay: 2.8, accent: '#ececea', glass: '#5a6670' },
      corner: { w: 0.6, colour: '#1f4fc8' },
      parapet: { h: 1.2, colour: '#d6d6d2' },
      roof: { colour: '#5e5c6a' },
    };
    const cl = (keep) => clipPoly(b.pts, keep);
    const se = cl((p) => [RBC.uSE - bcU(p)]),
      pod = cl((p) => [bcU(p) - RBC.uSE, RBC.uNW - bcU(p)]),
      nw = cl((p) => [bcU(p) - RBC.uNW]);
    if (se.length > 2 && pod.length > 2 && nw.length > 2) {
      b.parts = [
        {
          pts: nw,
          floors: RBC.floors,
          h: RBC.h,
          label: '中塔',
          look: {
            ...b.look,
            windows: { type: 'louver', bay: 2.8, accent: '#a8907a', glass: '#5a6670' },
            fins: [{ spacing: 2.8, depth: 0.35, t: 0.18, colour: '#f0f0ee', from: 2 }],
          },
        },
        {
          pts: pod,
          floors: 2,
          h: RBC.podH,
          label: '裙樓',
          look: {
            ...b.look,
            windows: { types: ['curtain', 'grid'], bay: 3.0, accent: '#ececea', glass: '#4f5d66' },
          },
        },
        {
          pts: se,
          floors: RBC.floors,
          h: RBC.h,
          label: '東南塔',
          look: {
            ...b.look,
            faces: [{ colour: '#1f5ad6', accent: '#ececea' }],
            windows: { type: 'punched', bay: 2.6, accent: '#ececea', glass: '#55626c' },
            corner: { w: 0.7, colour: '#ececea' },
          },
        },
      ];
      b.splitAc = 1;
    }
  } else if (id === H_IDS.rA) {
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: L.wall?.base || 'smooth', colour: '#ececea' },
      windows: { type: 'louver', bay: 3.0, accent: '#b39a80', glass: '#56606a' }, // 白色柱梁格子框裡的淺咖啡木紋百葉
      faces: [
        {
          on: 'short',
          colour: '#1f5ad6',
          accent: '#e6e6e2',
          windows: { type: 'punched', bay: 10 },
        },
      ], // 端牆整片寶藍，少數幾列小方窗
      topFloor: { floors: 1, colour: '#1f5ad6', windows: 'grid' }, // 頂樓藍框＋白直格柵
      bands: [{ colour: '#ececea', h: 0.25, depth: 0.15, on: 'long' }],
      parapet: { h: 1.5, colour: '#1f5ad6' },
    };
  } else if (id === H_IDS.link) {
    // 架高空橋：src/world/MapBuilder.js 不畫牆和屋頂（共用亂數照抽），buildZoneH 蓋柱子＋玻璃廊道，碰撞改成一根柱子
    b.look = {
      ...(b.look || {}),
      wall: { base: 'smooth', colour: '#d9d9d6' },
      open: { bare: true },
      roof: { ac: false },
    };
  } else if (id === H_IDS.bmS) {
    b.h = 9.5;
    b.floors = 2; // 兩層但層高高
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: 'smooth', colour: '#d3d5d6' },
      windows: { types: ['punched', 'pair'], bay: 3.0, accent: '#4a5458', glass: '#4d5a60' },
      faces: [{ on: 's', windows: { type: 'none' } }], // 南面的窗、百葉、門照 2025-03 相片逐一自建（buildZoneH）
      parapet: { h: 0.6, colour: '#b8babb' },
      canopy: (L.canopy || []).map((c) => ({
        ...c,
        colour: '#3f7a4a',
        at: 0.868,
        w: 4.2,
        h: 3.3,
        d: 1.6,
        t: 0.25,
      })), // 東端綠門上方的綠色鐵皮雨遮
    };
  } else if (id === H_IDS.bmM) {
    b.h = BM.hN;
    b.floors = 4;
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: 'smooth', colour: '#b9c2bf' },
      windows: { type: 'grid', bay: 2.6, accent: '#3c7a46', glass: '#5f6d70' },
      parapet: { h: 1.0, colour: '#a9b2af' },
    };
    const north = clipPoly(b.pts, ([, z]) => [BM.zSplit - z]),
      south = clipPoly(b.pts, ([, z]) => [z - BM.zSplit]);
    if (north.length > 2 && south.length > 2) {
      b.parts = [
        { pts: south, floors: 3, h: BM.hS, label: '南段（第 4 層退縮另蓋）' },
        {
          pts: north,
          floors: 4,
          h: BM.hN,
          label: '北段米黃高牆量體',
          look: {
            ...b.look,
            faces: [{ colour: '#d9d2bc' }],
            windows: {
              types: ['none', 'none', 'none', 'ribbon'],
              bay: 3.2,
              accent: '#8d8672',
              glass: '#4f5b60',
            },
            parapet: { h: 0.6, colour: '#cfc7b0' },
          },
        },
      ];
      b.splitAc = 1;
    }
  } else if (id === H_IDS.bm4) {
    b.h = 8.5;
    b.floors = 2;
    b.look = BM4_LOOK();
  } else if (id === H_IDS.sy) {
    b.h = 8.0;
    b.floors = 2; // 頂上 3 m 沖孔鋼板外框另蓋，總高約 11 m
    b.look = {
      wall: { base: 'smooth', colour: '#b8c4cc' },
      plinth: { floors: 1, colour: '#7a6a62' },
      windows: { types: ['none', 'punched'], bay: 4.0, accent: '#202224', glass: '#2e3438' },
      parapet: { h: 0.3, colour: '#9aa4aa' },
      roof: { colour: '#7d7f80' },
    };
  } else if (id === H_IDS.rn) {
    // 忍耐樓（正射：L 形白色平頂小盒，北側另一個白盒是 zh-rennai-b）
    b.name = '忍耐樓';
    b.h = 10.5;
    b.floors = 3;
    b.pts = [
      [-112.7, -253.7],
      [-109.4, -253.7],
      [-109.4, -256.8],
      [-99.6, -256.8],
      [-99.6, -253.7],
      [-98.7, -253.7],
      [-98.7, -244.9],
      [-112.7, -244.9],
    ];
    b.look = RENNAI_LOOK();
  }
}

// 新增建物：synthetic（各自的亂數），接在第 0 批 campusAdd 後面
export function zoneHAdd(buildings) {
  for (const a of ADD) {
    const look = a.look || (a.id.startsWith('zh-bm4') ? BM4_LOOK() : RENNAI_LOOK());
    buildings.push({
      id: a.id,
      ...(a.name ? { name: a.name } : {}),
      kind: a.kind,
      h: a.h,
      floors: a.floors,
      pts: a.pts.map((p) => [...p]),
      ...(a.holes ? { holes: a.holes.map((r) => r.map((p) => [...p])) } : {}),
      synthetic: true,
      src: 'f',
      look,
    });
  }
}

// ---------------- 貼圖 ----------------
const TEX = {};
function ctex(key, w, h, draw, repeat = true) {
  if (TEX[key]) return TEX[key];
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (TEX[key] = t);
}
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
// 淺灰沖孔鋼板（實英樓頂上外框）：1.2 m 一片
const perfTex = () =>
  ctex('hPerf', 128, 128, (g, W, Hh) => {
    g.fillStyle = '#b5b8ba';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = 'rgba(40,44,48,0.55)';
    for (let y = 4; y < Hh; y += 8)
      for (let x = 4 + ((y / 8) % 2) * 4; x < W; x += 8) {
        g.beginPath();
        g.arc(x, y, 2.1, 0, 7);
        g.fill();
      }
    g.fillStyle = '#8f9396';
    g.fillRect(0, 0, 3, Hh);
    g.fillRect(0, 0, W, 3);
  });
// 木色水平百葉（熱誠中塔直帶）
const woodTex = () =>
  ctex('hWood', 128, 128, (g, W, Hh) => {
    const r = lcg(3);
    g.fillStyle = '#3a3029';
    g.fillRect(0, 0, W, Hh);
    for (let y = 0; y < Hh; y += 8) {
      const v = 150 + Math.floor(r() * 30);
      g.fillStyle = `rgb(${v + 18},${v - 6},${v - 44})`;
      g.fillRect(0, y, W, 5);
      g.fillStyle = 'rgba(255,240,210,0.18)';
      g.fillRect(0, y, W, 1);
    }
  });
// 深色玻璃格子（空橋、樓梯間、玻璃盒）
const glassTex = (key, base, frame) =>
  ctex(key, 128, 128, (g, W, Hh) => {
    const gr = g.createLinearGradient(0, 0, W, Hh);
    gr.addColorStop(0, base[0]);
    gr.addColorStop(0.5, base[1]);
    gr.addColorStop(1, base[0]);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(0, 0, W * 0.35, Hh);
    g.fillStyle = frame;
    g.fillRect(0, 0, 4, Hh);
    g.fillRect(0, 0, W, 4);
    g.fillRect(W / 2 - 2, 0, 4, Hh);
  });
// 薄膜中棟第 4 層退縮：灰綠牆＋橫向窗帶＋綠色直條窗框（3.2 m 一格）
const ribbonTex = () =>
  ctex('hRibbon', 256, 256, (g, W, Hh) => {
    g.fillStyle = '#b9c2bf';
    g.fillRect(0, 0, W, Hh);
    const y0 = Hh * 0.22,
      y1 = Hh * 0.78,
      gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#6d7b80');
    gr.addColorStop(1, '#3f4b50');
    g.fillStyle = gr;
    g.fillRect(0, y0, W, y1 - y0);
    g.fillStyle = '#3c7a46';
    for (let x = 0; x < W; x += W / 2) g.fillRect(x, y0 - 6, 12, y1 - y0 + 12);
    g.fillRect(0, y0 - 6, W, 6);
    g.fillRect(0, y1, W, 6);
  });
// 鐵捲門
// 薄膜南棟南面：鋁框窗（田字）、單扇小窗、鋁百葉通風口、綠色鐵皮浪板
const winTex = (key, cross) =>
  ctex(
    key,
    128,
    128,
    (g, W, Hh) => {
      g.fillStyle = '#9aa3a8';
      g.fillRect(0, 0, W, Hh);
      const gr = g.createLinearGradient(0, 0, W, Hh);
      gr.addColorStop(0, '#5f7078');
      gr.addColorStop(1, '#2f3a40');
      g.fillStyle = gr;
      g.fillRect(8, 8, W - 16, Hh - 16);
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.fillRect(8, 8, (W - 16) * 0.4, Hh - 16);
      g.fillStyle = '#4a5458';
      g.fillRect(0, 0, W, 8);
      g.fillRect(0, Hh - 8, W, 8);
      g.fillRect(0, 0, 8, Hh);
      g.fillRect(W - 8, 0, 8, Hh);
      if (cross) {
        g.fillRect(W / 2 - 4, 0, 8, Hh);
        g.fillRect(0, Hh / 2 - 4, W, 8);
      } else g.fillRect(0, Hh * 0.38, W, 6);
    },
    false
  );
const louverTex = () =>
  ctex(
    'hLouver',
    128,
    128,
    (g, W, Hh) => {
      g.fillStyle = '#2b3034';
      g.fillRect(0, 0, W, Hh);
      for (let y = 10; y < Hh - 8; y += 12) {
        g.fillStyle = '#b9bec2';
        g.fillRect(8, y, W - 16, 6);
        g.fillStyle = '#7e8589';
        g.fillRect(8, y + 6, W - 16, 2);
      }
      g.fillStyle = '#8c9396';
      g.fillRect(0, 0, W, 8);
      g.fillRect(0, Hh - 8, W, 8);
      g.fillRect(0, 0, 8, Hh);
      g.fillRect(W - 8, 0, 8, Hh);
    },
    false
  );
const greenSheetTex = () =>
  ctex('hGreenSheet', 128, 128, (g, W, Hh) => {
    g.fillStyle = '#4f8a5a';
    g.fillRect(0, 0, W, Hh);
    for (let x = 0; x < W; x += 8) {
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x, 0, 3, Hh);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(x + 5, 0, 2, Hh);
    }
  });
const shutterTex = () =>
  ctex('hShutter', 128, 128, (g, W, Hh) => {
    g.fillStyle = '#c4c4c2';
    g.fillRect(0, 0, W, Hh);
    for (let y = 0; y < Hh; y += 6) {
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, y, W, 2);
      g.fillStyle = 'rgba(255,255,255,0.2)';
      g.fillRect(0, y + 2, W, 1);
    }
  });
// 米色清水混凝土（熱誠樓斜牆）
const beigeTex = () =>
  ctex('hBeige', 256, 256, (g, W, Hh) => {
    const r = lcg(17);
    g.fillStyle = '#c9ad8f';
    g.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,250,240' : '90,70,50'},${0.03 + r() * 0.05})`;
      g.fillRect(r() * W, r() * Hh, 2 + r() * 8, 2 + r() * 8);
    }
    g.fillStyle = 'rgba(90,70,50,0.18)';
    for (let x = 0; x < W; x += W / 2) g.fillRect(x, 0, 2, Hh);
    g.fillRect(0, Hh / 2, W, 2);
  });
function textTex(key, w, h, draw) {
  return ctex(key, w, h, draw, false);
}
// 直書字（透明底）
const vText = (key, text, colour, font, w = 160, h = 1024, shadow = 'rgba(0,0,0,0.35)') =>
  textTex(key, w, h, (g, W, Hh) => {
    const chars = [...text],
      step = Hh / chars.length,
      px = Math.min(W * 0.8, step * 0.84);
    g.font = `900 ${px}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    chars.forEach((c, i) => {
      g.fillStyle = shadow;
      g.fillText(c, W / 2 + 3, step * (i + 0.5) + 4);
      g.fillStyle = colour;
      g.fillText(c, W / 2, step * (i + 0.5));
    });
  });
const hText = (key, text, colour, bg, font, w = 1024, h = 160) =>
  textTex(key, w, h, (g, W, Hh) => {
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, Hh);
    }
    g.font = `900 ${Hh * 0.62}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = colour;
    g.fillText(text, W / 2, Hh / 2 + 4);
  });
const SANS = '"Noto Sans TC","PingFang TC",sans-serif',
  SERIF = '"Noto Serif TC","Songti TC",serif';
// 薄膜中心招牌柱：灰綠底、頂上圓形校徽、直書白字
const bmPillarTex = () =>
  textTex('hBmPillar', 160, 1024, (g, W, Hh) => {
    g.fillStyle = '#5a7a64';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#f2f2ee';
    g.beginPath();
    g.arc(W / 2, 80, 56, 0, 7);
    g.fill();
    g.fillStyle = '#2c4a9a';
    g.beginPath();
    g.arc(W / 2, 80, 44, 0, 7);
    g.fill();
    g.fillStyle = '#f2f2ee';
    g.font = `900 40px ${SERIF}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('中原', W / 2, 82);
    g.font = `900 120px ${SANS}`;
    ['薄', '膜', '中', '心'].forEach((c, i) => g.fillText(c, W / 2, 250 + i * 150));
  });

// ---------------- 材質 ----------------
const MATS = {};
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const m = {
    steelDark: () => std({ color: '#3a3d40', metalness: 0.6, roughness: 0.45 }),
    steel: () => std({ color: '#8c9296', metalness: 0.6, roughness: 0.4 }),
    teal: () => std({ color: '#2d4f5f', metalness: 0.5, roughness: 0.4 }),
    canopyGlass: () =>
      new THREE.MeshStandardMaterial({
        color: '#9fb4bc',
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    granite: () => std({ color: '#a89c90', roughness: 0.75 }),
    concGrid: () => std({ color: '#9a948c', roughness: 0.9 }),
    gold: () => std({ color: '#d9b45a', metalness: 0.7, roughness: 0.35 }),
    blue: () => std({ color: '#1f55cc', roughness: 0.6, side: THREE.DoubleSide }),
    blueFrame: () => std({ color: '#1f4fd0', roughness: 0.55, metalness: 0.2 }),
    white: () => std({ color: '#ecebe6', roughness: 0.7 }),
    rail: () => std({ color: '#f0f0ee', metalness: 0.4, roughness: 0.4 }),
    wood: () => std({ map: woodTex(), roughness: 0.8 }),
    beige: () => std({ map: beigeTex(), roughness: 0.95, side: THREE.DoubleSide }),
    stair: () => std({ color: '#b9b5ad', roughness: 0.9 }),
    linkGlass: () =>
      std({
        map: glassTex('hLinkGlass', ['#46596a', '#2f3d48'], '#1f4fd0'),
        roughness: 0.15,
        metalness: 0.5,
      }),
    stairGlass: () =>
      std({
        map: glassTex('hStairGlass', ['#8fa6b0', '#6d8790'], '#c9cdd0'),
        roughness: 0.15,
        metalness: 0.4,
      }),
    zxGlass: () =>
      std({
        map: glassTex('hZxGlass', ['#56697a', '#36444f'], '#2c3236'),
        roughness: 0.15,
        metalness: 0.45,
      }),
    ribbon: () => std({ map: ribbonTex(), roughness: 0.8 }),
    shutter: () => std({ map: shutterTex(), roughness: 0.6, metalness: 0.4 }),
    bmWin4: () => std({ map: winTex('hWin4', true), roughness: 0.2, metalness: 0.4 }),
    bmWin1: () => std({ map: winTex('hWin1', false), roughness: 0.2, metalness: 0.4 }),
    louver: () => std({ map: louverTex(), roughness: 0.45, metalness: 0.6 }),
    greenSheet: () =>
      std({ map: greenSheetTex(), roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
    perf: () => std({ map: perfTex(), roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide }),
    lightBlue: () => std({ color: '#c9d6ea', roughness: 0.6 }),
    royal: () => std({ color: '#2348c8', roughness: 0.55 }),
    slab: () => std({ color: '#c9c9c4', roughness: 0.9 }),
    dark: () => std({ color: '#2a2d30', roughness: 0.6 }),
  }[key];
  return (MATS[key] = m());
}

// ---------------- 幾何累加（依材質合併，同 src/world/zones/ZoneG.js） ----------------
class Acc {
  constructor() {
    this.parts = new Map();
  }
  add(m, g) {
    if (g.index) g = g.toNonIndexed();
    if (!this.parts.has(m)) this.parts.set(m, []);
    this.parts.get(m).push(g);
    return g;
  }
  box(m, x0, x1, y0, y1, z0, z1) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return this.add(m, g);
  }
  // 水平方向沿 (ax,az)-(bx,bz)、厚 th 的直立板
  slab(m, ax, az, bx, bz, th, y0, y1) {
    const dx = bx - ax,
      dz = bz - az,
      l = Math.hypot(dx, dz),
      g = new THREE.BoxGeometry(l, y1 - y0, th);
    g.rotateY(-Math.atan2(dz, dx));
    g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    return this.add(m, g);
  }
  beam(m, p, q, w, h) {
    const P = new THREE.Vector3(...p),
      Q = new THREE.Vector3(...q),
      dir = Q.clone().sub(P),
      len = dir.length(),
      g = new THREE.BoxGeometry(w, h, len);
    const z = dir.normalize(),
      x = new THREE.Vector3(0, 1, 0).cross(z);
    if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
    x.normalize();
    g.applyMatrix4(new THREE.Matrix4().makeBasis(x, z.clone().cross(x), z));
    g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    return this.add(m, g);
  }
  cyl(m, x, z, r, y0, y1, seg = 16) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg);
    g.translate(x, (y0 + y1) / 2, z);
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
  // 直立牆：從 a 走到 b，往東走朝南、往北走朝東（和 OSM 輪廓的外法線相反：沿輪廓順序畫會朝內，要反過來走）
  wall(m, ax, az, bx, bz, y0, y1, tu = 4, tv = 4) {
    const l = Math.hypot(bx - ax, bz - az),
      vb = y0 / tv,
      vt = vb + (y1 - y0) / tv;
    return this.quad(
      m,
      [ax, y0, az],
      [bx, y0, bz],
      [bx, y1, bz],
      [ax, y1, az],
      [
        [0, vb],
        [l / tu, vb],
        [l / tu, vt],
        [0, vt],
      ]
    );
  }
  flat(m, pts, y, down = false, tile = 4) {
    const v = pts.map(([x, z]) => new THREE.Vector2(x, z)),
      tris = THREE.ShapeUtils.triangulateShape(v, []);
    const pos = [],
      uv = [];
    for (const t of tris)
      for (const i of t) {
        pos.push(pts[i][0], y, pts[i][1]);
        uv.push(pts[i][0] / tile, pts[i][1] / tile);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const ny = g.attributes.normal.getY(0);
    if (ny < 0 !== down) {
      const p = g.attributes.position.array;
      for (let i = 0; i < p.length; i += 9)
        for (let k = 0; k < 3; k++) {
          const t = p[i + 3 + k];
          p[i + 3 + k] = p[i + 6 + k];
          p[i + 6 + k] = t;
        }
      g.computeVertexNormals();
    }
    return this.add(m, g);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = m !== 'canopyGlass';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
// 牆面貼字（招牌）：w×h 的平面，面向 (nx,nz)
function sign(group, tex, w, h, x, y, z, nx, nz, emissive = 0.15) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.4,
      metalness: 0.3,
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
// 一條邊 A→B 上的點：t（0..1 沿邊）、off（沿外法線，公尺）；外法線在前進方向右手邊
function edge(A, B) {
  const dx = B[0] - A[0],
    dz = B[1] - A[1],
    l = Math.hypot(dx, dz),
    tx = dx / l,
    tz = dz / l,
    nx = tz,
    nz = -tx;
  return {
    l,
    tx,
    tz,
    nx,
    nz,
    at: (t, off = 0) => [A[0] + dx * t + nx * off, A[1] + dz * t + nz * off],
    atM: (s, off = 0) => [A[0] + tx * s + nx * off, A[1] + tz * s + nz * off],
  };
}
const centroid = (pts) => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];

// ---------------- 蓋 ----------------
export function buildZoneH(I, scene, data, collision) {
  const group = new THREE.Group();
  group.name = 'zoneH';
  const k = new Acc(),
    shapes = [];
  const find = (id) => data.buildings.find((b) => b.id === id);
  const _baseOf = (b, x, z) => (b && Number.isFinite(b.base) ? b.base : groundY(x, z));
  const wallC = (ax, az, bx, bz, y0, y1) => I.addWall(ax, az, bx, bz, y0, y1);
  const boxColl = (P, y0, y1) => {
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        c = P[(i + 1) % P.length];
      wallC(a[0], a[1], c[0], c[1], y0, y1);
    }
  };
  // 方柱（沿 E 邊方向擺正），有碰撞
  const post = (m, E, s, off, w, y0, y1) => {
    const c = E.atM(s, off),
      hx = w / 2,
      P = [
        [-hx, -hx],
        [hx, -hx],
        [hx, hx],
        [-hx, hx],
      ].map(([a, b]) => [c[0] + E.tx * a + E.nx * b, c[1] + E.tz * a + E.nz * b]);
    k.slab(m, c[0] - E.tx * hx, c[1] - E.tz * hx, c[0] + E.tx * hx, c[1] + E.tz * hx, w, y0, y1);
    boxColl(P, y0, y1);
    shapes.push({ name: 'post', pts: P, y0, y1 });
  };

  // ===== 信實樓：各翼西端屋頂深色鋼格架、西側凹口入口雨遮 =====
  const xs = find(H_IDS.xs);
  if (xs) {
    const B = xs.base ?? groundY(348, -170),
      top = B + XS.h;
    for (const [x0, z0, z1] of XS.ends) {
      const x1 = x0 + 7.5,
        y0 = top,
        y1 = top + 3.0;
      for (let x = x0; x <= x1 + 0.01; x += 2.5)
        for (const z of [z0, z1])
          k.box('steelDark', x - 0.15, x + 0.15, y0, y1, z - 0.15, z + 0.15);
      for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / Math.round((z1 - z0) / 2.6)) {
        k.box('steelDark', x0 - 0.15, x0 + 0.15, y0, y1, z - 0.15, z + 0.15); // 西緣直柱
        k.box('steelDark', x0 - 0.1, x1 + 0.1, y1 - 0.25, y1, z - 0.1, z + 0.1); // 東西向頂梁
      }
      for (let x = x0; x <= x1 + 0.01; x += 2.5)
        k.box('steelDark', x - 0.1, x + 0.1, y1 - 0.25, y1, z0, z1); // 南北向頂梁
      k.box('steelDark', x0 - 0.12, x0 + 0.12, y0 + 1.4, y0 + 1.6, z0, z1); // 西緣中間橫梁
    }
    // 入口：西側凹口內牆（x 347.6）朝西，二層樓高花崗石方柱＋水泥格柵廊架，一樓藍綠鋼構玻璃雨遮、金字館名
    const D = XS.door,
      xw = D.x,
      y0 = groundY(xw - 3, (D.z0 + D.z1) / 2) - 0.1,
      dep = 5.0;
    for (const z of [D.z0, D.z1]) {
      const P = rect(xw - dep - 0.45, z - 0.45, xw - dep + 0.45, z + 0.45);
      k.box('granite', xw - dep - 0.45, xw - dep + 0.45, y0, y0 + 7.6, z - 0.45, z + 0.45);
      boxColl(P, y0, y0 + 7.6);
      shapes.push({ name: 'xsPillar', pts: P, y0, y1: y0 + 7.6 });
    }
    for (let z = D.z0; z <= D.z1 + 0.01; z += (D.z1 - D.z0) / 6)
      k.box('concGrid', xw - dep - 0.4, xw, y0 + 7.4, y0 + 7.8, z - 0.12, z + 0.12); // 廊架格柵
    k.box('concGrid', xw - dep - 0.5, xw, y0 + 7.8, y0 + 8.1, D.z0 - 0.5, D.z0 + 0.5);
    k.box('concGrid', xw - dep - 0.5, xw, y0 + 7.8, y0 + 8.1, D.z1 - 0.5, D.z1 + 0.5);
    // 一樓藍綠色鋼構玻璃雨遮：兩根細柱、柱頭金色飾片
    const yc = y0 + 3.6;
    k.box('teal', xw - 3.6, xw, yc, yc + 0.25, D.z0 + 0.6, D.z1 - 0.6);
    k.box('canopyGlass', xw - 3.55, xw, yc + 0.25, yc + 0.3, D.z0 + 0.7, D.z1 - 0.7);
    for (const z of [D.z0 + 0.9, D.z1 - 0.9]) {
      k.box('teal', xw - 3.5, xw - 3.25, y0, yc, z - 0.12, z + 0.12);
      k.box('gold', xw - 3.55, xw - 3.2, yc - 0.35, yc - 0.05, z - 0.16, z + 0.16);
      wallC(xw - 3.5, z - 0.12, xw - 3.25, z + 0.12, y0, yc);
    }
    sign(
      group,
      hText('hXsName', '信 實 樓', '#d9b45a', null, SERIF),
      4.8,
      0.75,
      xw - 0.06,
      yc + 0.85,
      (D.z0 + D.z1) / 2,
      -1,
      0,
      0.3
    );
    sign(
      group,
      hText('hXsNameEn', 'Hsin Shih Hall', '#d9b45a', null, '"Times New Roman",serif'),
      3.6,
      0.5,
      xw - 0.06,
      yc + 0.3 + 0.08,
      (D.z0 + D.z1) / 2,
      -1,
      0,
      0.3
    );
    shapes.push({
      name: 'xsEntrance',
      pts: rect(xw - dep - 0.5, D.z0 - 0.5, xw, D.z1 + 0.5),
      y0,
      y1: y0 + 8.1,
    });
  }

  // ===== 熱誠 B C：中塔木百葉直帶與藍實牆、東南塔字、裙樓藍色懸挑平台、大階梯與「熱誠樓」清水斜牆、塔頂玻璃亭 =====
  const bc = find(H_IDS.rBC);
  if (bc) {
    const B = bc.base ?? groundY(318, -250),
      top = B + RBC.h,
      yPod = B + RBC.podH;
    // 中塔東北面（朝普忠路）與西南面：中間木色百葉直帶、西北側寶藍實牆（從裙樓頂到塔頂）
    const ne = edge([313.6, -279.9], [327.8, -265.3]);
    k.wall('wood', ...ne.at(0.58, 0.08), ...ne.at(0.42, 0.08), yPod, top - 0.4, 2, 2);
    k.wall('blue', ...ne.at(0.24, 0.1), ...ne.at(0.0, 0.1), yPod, top + 1.2, 4, 4);
    const sw = edge([309, -242.5], [291.5, -263]),
      swT = (u) => (u - 22.4) / (49.3 - 22.4); // 西南長邊上 u → t
    k.wall('wood', ...sw.at(swT(39.5), 0.08), ...sw.at(swT(36), 0.08), yPod, top - 0.4, 2, 2);
    k.wall('blue', ...sw.at(swT(48.6), 0.1), ...sw.at(swT(42), 0.1), B + 4.6, top + 1.2, 4, 4);
    k.slab('blue', ...sw.at(swT(41.9), 0.35), ...sw.at(swT(48.7), 0.35), 0.5, top + 0.8, top + 1.4);
    // 東南塔：東南面直書金字「熱誠宿舍」、東北面頂部白字「中原大學」
    const se = edge([344.6, -243.4], [323.7, -225.6]),
      sP = se.at(0.78, 0.12);
    sign(
      group,
      vText('hRxGold', '熱誠宿舍', '#d8c38a', SANS),
      2.4,
      11,
      sP[0],
      B + 30,
      sP[1],
      se.nx,
      se.nz,
      0.25
    );
    const seNE = edge([330.7, -259.2], [344.6, -243.4]),
      nP = seNE.at(0.5, 0.12);
    sign(
      group,
      hText('hRxCycu', '中原大學', '#f4f4f2', null, SERIF),
      11,
      2.0,
      nP[0],
      top - 2.2,
      nP[1],
      seNE.nx,
      seNE.nz,
      0.3
    );
    // 塔頂藍框玻璃亭
    for (const [u, v] of [
      [38, 14],
      [6.5, 13.5],
    ]) {
      const c = bcP(u, v),
        h = 3.2,
        s = 2.8;
      k.box(
        'stairGlass',
        c[0] - s + 0.1,
        c[0] + s - 0.1,
        top,
        top + h,
        c[1] - s + 0.1,
        c[1] + s - 0.1
      );
      for (const [a, b2] of [
        [-s, -s],
        [s, -s],
        [s, s],
        [-s, s],
      ])
        k.box(
          'blueFrame',
          c[0] + a - 0.2,
          c[0] + a + 0.2,
          top,
          top + h + 0.3,
          c[1] + b2 - 0.2,
          c[1] + b2 + 0.2
        );
      k.box(
        'blueFrame',
        c[0] - s - 0.3,
        c[0] + s + 0.3,
        top + h,
        top + h + 0.45,
        c[1] - s - 0.3,
        c[1] + s + 0.3
      );
    }
    // 裙樓西南面：2F 高的藍色懸挑平台（白欄杆）。西南側那條 5 m 校內路緊貼這面牆（西北段幾乎貼牆），
    // 所以平台只在東南段 u 0.8～20 做 2.2 m 深、下面落白方柱；再往西北只留 0.4 m 的藍色封邊帶（3.9 m 高，車從下面過）
    const swE = edge(bcP(0, 0), bcP(47.5, 0)),
      y2 = B + 3.9;
    for (const [u0, u1, dep] of [
      [10.6, 20.0, 2.2],
      [20.0, 47.0, 0.4],
    ]) {
      const a0 = swE.atM(u0, 0),
        a1 = swE.atM(u1, 0),
        b0 = swE.atM(u0, dep),
        b1 = swE.atM(u1, dep);
      k.quad(
        'blue',
        [b0[0], y2, b0[1]],
        [b1[0], y2, b1[1]],
        [a1[0], y2, a1[1]],
        [a0[0], y2, a0[1]]
      ); // 平台底
      k.flat('slab', [a0, a1, b1, b0], y2 + 0.55);
      k.slab('blue', ...b0, ...b1, 0.2, y2, y2 + 0.6); // 藍色封邊
      if (dep < 1) continue;
      k.slab(
        'rail',
        ...swE.atM(u0, dep - 0.05),
        ...swE.atM(u1, dep - 0.05),
        0.06,
        y2 + 1.5,
        y2 + 1.6
      );
      for (let s2 = u0; s2 <= u1 + 0.01; s2 += 1.5) {
        const p = swE.atM(s2, dep - 0.05);
        k.box('rail', p[0] - 0.03, p[0] + 0.03, y2 + 0.6, y2 + 1.55, p[1] - 0.03, p[1] + 0.03);
      }
      for (const s2 of [12.5, 18.5])
        post('white', swE, s2, dep - 0.5, 0.5, groundY(...swE.atM(s2, dep - 0.5)) - 0.2, y2);
      shapes.push({ name: 'bcDeck', pts: [a0, a1, b1, b0], y0: y2, y1: y2 + 1.6 });
    }
    // 大階梯：在平台東南側，沿牆從 u 0.8（地面）往西北爬到 u 10.6 接上平台，寬 2.6 m，外側藍色斜梁、白欄杆，再外側米色清水斜牆直寫「熱誠樓」
    const uG = 0.8,
      uT = 10.6,
      w = 2.6,
      n = 22,
      yG = groundY(...bcP(uG, -1.3)) - 0.05;
    const stp = (uT - uG) / n,
      rise = (y2 + 0.55 - yG) / n;
    for (let i = 0; i < n; i++) {
      const ua = uG + i * stp,
        ub = uG + (i + 1) * stp,
        y = yG + (i + 1) * rise;
      k.flat('stair', [bcP(ua, 0), bcP(ub, 0), bcP(ub, -w), bcP(ua, -w)], y);
      k.slab('stair', ...bcP(ua, 0), ...bcP(ua, -w), 0.05, yG, y);
    }
    const p3 = (u, v, y) => {
      const [x, z] = bcP(u, v);
      return [x, y, z];
    };
    k.beam('blue', p3(uG, -w - 0.15, yG + 0.4), p3(uT, -w - 0.15, y2 + 0.9), 0.3, 0.8);
    k.beam('rail', p3(uG, -w + 0.1, yG + 1.1), p3(uT, -w + 0.1, y2 + 1.6), 0.06, 0.06);
    // 米色清水斜牆：低端（東南）2.6 m 漸升到高端（西北）約 7 m，朝西南
    const wA = bcP(uG - 0.6, -w - 0.4),
      wB = bcP(uT + 1.0, -w - 0.4),
      wa = bcP(uG - 0.6, -w - 0.8),
      wb = bcP(uT + 1.0, -w - 0.8);
    const hA = yG + 2.6,
      hB = y2 + 3.0;
    k.quad(
      'beige',
      [wB[0], yG - 0.3, wB[1]],
      [wA[0], yG - 0.3, wA[1]],
      [wA[0], hA, wA[1]],
      [wB[0], hB, wB[1]],
      [
        [0, 0],
        [3, 0],
        [3, 0.8],
        [0, 1.6],
      ]
    );
    k.quad(
      'beige',
      [wa[0], yG - 0.3, wa[1]],
      [wb[0], yG - 0.3, wb[1]],
      [wb[0], hB, wb[1]],
      [wa[0], hA, wa[1]],
      [
        [0, 0],
        [3, 0],
        [3, 1.6],
        [0, 0.8],
      ]
    );
    k.quad('beige', [wa[0], hA, wa[1]], [wb[0], hB, wb[1]], [wB[0], hB, wB[1]], [wA[0], hA, wA[1]]);
    k.quad(
      'beige',
      [wa[0], yG - 0.3, wa[1]],
      [wa[0], hA, wa[1]],
      [wA[0], hA, wA[1]],
      [wA[0], yG - 0.3, wA[1]]
    );
    k.quad(
      'beige',
      [wB[0], yG - 0.3, wB[1]],
      [wB[0], hB, wB[1]],
      [wb[0], hB, wb[1]],
      [wb[0], yG - 0.3, wb[1]]
    );
    const tP = bcP(uT - 0.4, -w - 0.83),
      nOut = [-RBC.V[0], -RBC.V[1]];
    sign(
      group,
      vText('hRxName', '熱誠樓', '#22327a', SERIF, 160, 600, 'rgba(255,255,255,0.15)'),
      1.15,
      4.0,
      tP[0],
      hB - 2.7,
      tP[1],
      nOut[0],
      nOut[1],
      0.08
    ); // 字放在斜牆高端、牆頂下 0.7 m
    // 階梯整塊擋住（不能走上去），碰撞包住階梯＋斜牆
    const SP = [
      bcP(uG - 0.6, 0),
      bcP(uT + 1.0, 0),
      bcP(uT + 1.0, -w - 0.8),
      bcP(uG - 0.6, -w - 0.8),
    ];
    boxColl(SP, yG - 0.3, hB);
    shapes.push({ name: 'bcStair', pts: SP, y0: yG, y1: hB });
  }

  // ===== 熱誠 A 棟：東北端牆直書「中原大學」「熱誠宿舍」 =====
  const ra = find(H_IDS.rA);
  if (ra) {
    const B = ra.base ?? groundY(296, -292),
      e = edge([304.4, -305.4], [314.7, -295.7]),
      p = e.at(0.5, 0.1),
      q = e.at(0.5, 0.1); // 端牆中線（小方窗在兩側）
    sign(
      group,
      vText('hRaCycu', '中原大學', '#e6e6e2', SERIF),
      2.8,
      11.5,
      p[0],
      B + 34,
      p[1],
      e.nx,
      e.nz,
      0.25
    );
    sign(
      group,
      vText('hRaDorm', '熱誠宿舍', '#e6e6e2', SANS),
      1.4,
      5.6,
      q[0],
      B + 24.5,
      q[1],
      e.nx,
      e.nz,
      0.2
    );
  }

  // ===== A／B 空橋：四根柱子撐著約 4～10 m 的深色玻璃廊道，上下藍色框梁 =====
  const lk = find(H_IDS.link);
  if (lk && lk.pts.length === 4) {
    const P = lk.pts,
      B = lk.base ?? groundY(...centroid(P)),
      y0 = B + 4.2,
      y1 = B + 10.0,
      c = centroid(P);
    k.flat('slab', P, y0 - 0.3, true);
    k.flat('slab', P, y1 + 0.5);
    k.flat('slab', P, y0); // 廊道地板
    // 兩條開放邊（A、B 兩塔之外的那兩邊）：玻璃廊道、上下藍框梁
    for (const [a, b] of [
      [P[0], P[1]],
      [P[2], P[3]],
    ]) {
      k.wall('linkGlass', a[0], a[1], b[0], b[1], y0, y1, 2.0, 2.9);
      k.wall('linkGlass', b[0], b[1], a[0], a[1], y0, y1, 2.0, 2.9);
      k.slab('blueFrame', a[0], a[1], b[0], b[1], 0.35, y0 - 0.6, y0 + 0.4);
      k.slab('blueFrame', a[0], a[1], b[0], b[1], 0.35, y1 - 0.1, y1 + 0.7);
    }
    // 柱子放在四個角再往外 0.25 m（校內路從 A、B 兩塔之間穿過空橋下方，柱子要離路緣 0.5 m 以上）
    const cols = P.map((p) => {
        const dx = p[0] - c[0],
          dz = p[1] - c[1],
          l = Math.hypot(dx, dz);
        return [p[0] + (dx / l) * 0.25, p[1] + (dz / l) * 0.25];
      }),
      cw = 0.225;
    for (const [x, z] of cols) {
      const yb = groundY(x, z) - 0.2;
      k.box('white', x - cw, x + cw, yb, y0 - 0.3, z - cw, z + cw);
    }
    for (const [x, z] of cols.slice(1))
      boxColl(rect(x - cw, z - cw, x + cw, z + cw), groundY(x, z) - 0.2, y0 - 0.3);
    // src/world/MapBuilder.js 加的整塊碰撞多邊形縮成第一根柱子（植栽已經照原本的多邊形種好，共用亂數不變）
    const pi = collision ? collision.polys.findIndex((p) => p.pts === lk.pts) : -1;
    if (pi >= 0) {
      const [x, z] = cols[0];
      collision.insetPolygon(pi, rect(x - cw, z - cw, x + cw, z + cw));
    }
    shapes.push({ name: 'skybridge', pts: P, y0: y0 - 0.6, y1: y1 + 0.7 });
  }

  // ===== 薄膜中心南棟：西端整片玻璃樓梯間、南面大鐵捲門、西南角直立招牌柱 =====
  const bs = find(H_IDS.bmS);
  if (bs) {
    const B = bs.base ?? groundY(297, 9),
      e = edge([306.9, 27.8], [289.4, 28.4]); // 南面，朝南
    const s0 = e.l - 4.6,
      s1 = e.l - 0.3,
      yT = B + 10.6;
    const a = e.atM(s0, 0.55),
      b = e.atM(s1, 0.55),
      a0 = e.atM(s0, 0),
      b0 = e.atM(s1, 0);
    k.wall('stairGlass', b[0], b[1], a[0], a[1], B - 0.2, yT, 1.5, 1.6);
    k.wall('stairGlass', a[0], a[1], a0[0], a0[1], B - 0.2, yT, 1.5, 1.6);
    k.wall('stairGlass', b0[0], b0[1], b[0], b[1], B - 0.2, yT, 1.5, 1.6);
    k.flat('steel', [a0, b0, b, a], yT);
    wallC(a[0], a[1], b[0], b[1], B - 0.2, yT);
    wallC(a0[0], a0[1], a[0], a[1], B - 0.2, yT);
    wallC(b[0], b[1], b0[0], b0[1], B - 0.2, yT);
    // 南面立面（2025-03 相片，從西端玻璃樓梯間往東量，w = 離西端公尺數、y = 離地公尺數）：
    // 1F 樓梯間旁大鐵捲門、中段兩排各兩扇小窗、東端綠色鐵皮門板＋上方綠色百葉帶；
    // 夾層兩扇小窗；2F 田字窗、鋁百葉、窗＋百葉交錯
    const el = (m, w0, w1, y0, y1, off = 0.05) => {
      const p = e.atM(e.l - w1, off),
        q = e.atM(e.l - w0, off),
        ru = m === 'shutter' || m === 'greenSheet' ? (w1 - w0) / 2 : 1,
        rv = m === 'shutter' ? (y1 - y0) / 1.2 : 1;
      k.quad(
        m,
        [q[0], B + y0, q[1]],
        [p[0], B + y0, p[1]],
        [p[0], B + y1, p[1]],
        [q[0], B + y1, q[1]],
        [
          [0, 0],
          [ru, 0],
          [ru, rv],
          [0, rv],
        ]
      ); // 西→東走，朝南
    };
    el('shutter', 5.1, 8.3, -0.1, 3.9);
    k.slab('steel', ...e.atM(e.l - 8.45, 0.1), ...e.atM(e.l - 4.95, 0.1), 0.15, B + 3.9, B + 4.2);
    for (const [w0, w1] of [
      [10.2, 11.0],
      [11.6, 12.4],
    ])
      for (const [y0, y1] of [
        [1.2, 2.3],
        [2.9, 3.9],
      ])
        el('bmWin1', w0, w1, y0, y1);
    for (const [w0, w1] of [
      [10.0, 10.7],
      [11.3, 12.1],
    ])
      el('bmWin1', w0, w1, 5.8, 6.7);
    el('bmWin4', 5.4, 6.8, 6.9, 8.3);
    for (const [w0, w1] of [
      [7.5, 8.3],
      [8.7, 9.4],
      [9.9, 10.6],
      [12.4, 13.2],
      [15.5, 16.2],
    ])
      el('louver', w0, w1, 7.2, 8.1);
    for (const [w0, w1] of [
      [11.3, 12.4],
      [14.95, 15.5],
    ])
      el('bmWin1', w0, w1, 7.1, 8.2);
    el('bmWin1', 13.8, 14.4, 7.2, 8.0);
    el('dark', 14.6, 15.2, -0.1, 3.0); // 綠門中間的開口
    for (const [w0, w1] of [
      [13.6, 14.6],
      [15.2, 17.2],
    ])
      el('greenSheet', w0, w1, -0.1, 3.0, 0.12);
    el('louver', 15.4, 17.2, 3.0, 3.9, 0.08);
    // 招牌柱：灰綠、約 8 m，柱頂校徽、直書「薄膜中心」
    const pc = e.atM(e.l + 1.8, 2.2),
      hw = 0.7,
      hd = 0.35,
      y0 = groundY(pc[0], pc[1]) - 0.2;
    k.box('dark', pc[0] - hw, pc[0] + hw, y0, y0 + 0.4, pc[1] - hd - 0.1, pc[1] + hd + 0.1);
    k.box(
      'steel',
      pc[0] - hw + 0.05,
      pc[0] + hw - 0.05,
      y0 + 0.4,
      y0 + 8.0,
      pc[1] - hd,
      pc[1] + hd
    );
    sign(group, bmPillarTex(), 1.2, 7.4, pc[0], y0 + 4.25, pc[1] + hd + 0.01, 0, 1, 0.12);
    sign(group, bmPillarTex(), 1.2, 7.4, pc[0], y0 + 4.25, pc[1] - hd - 0.01, 0, -1, 0.12);
    boxColl(rect(pc[0] - hw, pc[1] - hd - 0.1, pc[0] + hw, pc[1] + hd + 0.1), y0, y0 + 8.0);
    shapes.push({
      name: 'bmPillar',
      pts: rect(pc[0] - hw, pc[1] - hd, pc[0] + hw, pc[1] + hd),
      y0,
      y1: y0 + 8,
    });
  }

  // ===== 薄膜中棟：南段第 4 層退縮窗帶＋屋頂鐵欄杆 =====
  const bm = find(H_IDS.bmM);
  if (bm) {
    const B = bm.base ?? groundY(314, -5),
      y0 = B + BM.hS,
      y1 = y0 + 3.1,
      R = rect(311.4, -12.2, 317.6, 8.3);
    for (let i = 0; i < 4; i++) {
      const a = R[i],
        b = R[(i + 1) % 4];
      k.wall('ribbon', b[0], b[1], a[0], a[1], y0, y1, 3.2, 3.1);
    }
    k.flat('slab', R, y1);
    k.box('slab', 311.2, 317.8, y1, y1 + 0.4, -12.4, -12.0);
    k.box('slab', 311.2, 317.8, y1, y1 + 0.4, 8.1, 8.5);
    // 3F 屋頂邊鐵欄杆（南段外緣）
    const rail = [
      [309.9, 9.8],
      [319.1, 9.8],
      [319.1, -13.7],
    ];
    for (let i = 0; i < rail.length - 1; i++) {
      const [a, b] = [rail[i], rail[i + 1]];
      k.slab('steel', a[0], a[1], b[0], b[1], 0.05, y0 + 1.0, y0 + 1.08);
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let s = 0; s <= l; s += 1.6)
        k.box(
          'steel',
          a[0] + ((b[0] - a[0]) * s) / l - 0.03,
          a[0] + ((b[0] - a[0]) * s) / l + 0.03,
          y0,
          y0 + 1.05,
          a[1] + ((b[1] - a[1]) * s) / l - 0.03,
          a[1] + ((b[1] - a[1]) * s) / l + 0.03
        );
    }
  }

  // ===== 4館：東面外掛鋼梯爬到 2F 門 =====
  const b4 = find(H_IDS.bm4);
  if (b4) {
    const B = b4.base ?? groundY(292, -53),
      x0 = 296.65,
      x1 = x0 + 1.2,
      zA = -54.0,
      zB = -46.2,
      zL = -44.4,
      yL = B + 4.25,
      yG = groundY(x0 + 0.6, zA) - 0.05,
      n = 16;
    for (let i = 0; i < n; i++) {
      const z = zA + ((zB - zA) * (i + 0.5)) / n,
        y = yG + ((yL - yG) * (i + 1)) / n;
      k.box('steel', x0, x1, y - 0.05, y, z - 0.25, z + 0.25);
    }
    for (const x of [x0 + 0.03, x1 - 0.03]) {
      k.beam('steelDark', [x, yG, zA], [x, yL, zB], 0.08, 0.25);
      k.beam('steel', [x, yG + 1.0, zA], [x, yL + 1.0, zB], 0.05, 0.05);
    }
    k.box('steel', x0, x1, yL - 0.12, yL, zB, zL); // 平台
    k.box('steelDark', x1 - 0.05, x1, yL, yL + 1.05, zB, zL);
    k.box('steelDark', x0, x1, yL, yL + 1.05, zL - 0.05, zL);
    for (const z of [zB, zL]) k.box('steelDark', x1 - 0.1, x1, yG - 0.2, yL, z - 0.05, z + 0.05);
    k.wall('dark', 296.62, zL - 0.2, 296.62, zB + 0.3, yL, yL + 2.2, 1, 2.2); // 2F 門
    boxColl(rect(x0, zA - 0.3, x1, zL), yG - 0.2, yL + 1.05);
    shapes.push({ name: 'bm4Stair', pts: rect(x0, zA, x1, zL), y0: yG, y1: yL + 1.05 });
  }

  // ===== 實英樓：頂上一圈淺灰沖孔鋼板外框、南面「實英樓」招牌 =====
  const sy = find(H_IDS.sy);
  if (sy) {
    const B = sy.base ?? groundY(316, 30),
      y0 = B + 7.4,
      y1 = B + 11.2,
      P = sy.pts;
    // 外框照輪廓逐邊外推 0.35 m（軸向輪廓：頂點沿兩條鄰邊的外法線各推 0.35 m）
    const nOf = (a, c) => {
      const dx = c[0] - a[0],
        dz = c[1] - a[1],
        l = Math.hypot(dx, dz);
      return [dz / l, -dx / l];
    };
    const R = P.map((p, i) => {
      const q = P[(i - 1 + P.length) % P.length],
        r = P[(i + 1) % P.length],
        n1 = nOf(q, p),
        n2 = nOf(p, r);
      return [p[0] + (n1[0] + n2[0]) * 0.35, p[1] + (n1[1] + n2[1]) * 0.35];
    });
    for (let i = 0; i < R.length; i++) {
      const a = R[i],
        b = R[(i + 1) % R.length];
      k.wall('perf', b[0], b[1], a[0], a[1], y0, y1, 1.2, 1.2);
    } // 材質雙面，一片就好
    for (const [x, z] of R)
      k.box('steel', x - 0.12, x + 0.12, y0 - 0.2, y1 + 0.05, z - 0.12, z + 0.12);
    let xa = 1e9,
      xb = -1e9,
      zb = -1e9;
    for (const [x, z] of P) {
      xa = Math.min(xa, x);
      xb = Math.max(xb, x);
      zb = Math.max(zb, z);
    }
    sign(
      group,
      hText('hSyName', '實 英 樓', '#f2f2ee', '#3a3d40', SANS, 768, 160),
      3.6,
      0.75,
      (xa + xb) / 2 - 1.5,
      B + 3.35,
      zb + 0.06,
      0,
      1,
      0.25
    );
  }

  // ===== 知行領航館：南、北面嵌寶藍／淺藍盒狀窗框，西端藍框玻璃盒 =====
  const zx = find('zh-zhixing');
  if (zx) {
    const B = zx.base ?? groundY(382, -73),
      [[xa, za], [_xb]] = ZX.pts,
      zb = ZX.pts[2][1],
      fl = (ZX.h - 0.6) / 3;
    // [x0, 寬, 起始樓層, 樓層數, 顏色]
    const boxesS = [
      [356, 7, 1, 2, 'royal'],
      [366, 9, 0.3, 1, 'lightBlue'],
      [378, 6, 1, 2, 'lightBlue'],
      [387.5, 8, 2, 1, 'royal'],
      [397, 7, 1, 2, 'royal'],
      [406, 5.5, 0.3, 2, 'lightBlue'],
    ];
    const boxesN = [
      [360, 8, 1, 2, 'lightBlue'],
      [375, 7, 2, 1, 'royal'],
      [392, 9, 1, 2, 'royal'],
      [404, 6, 1, 1, 'lightBlue'],
    ];
    const frame = (side, [x0, w, f0, nf, m]) => {
      const zf = side > 0 ? zb : za,
        d = 0.9 * side,
        yA = B + 2.2 + (f0 - 0.3 > 0 ? (f0 - 0.3) * fl : 0) + (f0 < 1 ? 0.2 : 0),
        yB = Math.min(B + 2.2 + (f0 + nf - 0.3) * fl, B + ZX.h - 0.6),
        x1 = x0 + w,
        t = 0.35;
      const z0 = Math.min(zf, zf + d),
        z1 = Math.max(zf, zf + d);
      k.box(m, x0, x1, yB - t, yB, z0, z1);
      k.box(m, x0, x1, yA, yA + t, z0, z1);
      k.box(m, x0, x0 + t, yA, yB, z0, z1);
      k.box(m, x1 - t, x1, yA, yB, z0, z1);
      if (side > 0)
        k.wall('zxGlass', x0 + t, zf + 0.05, x1 - t, zf + 0.05, yA + t, yB - t, 2, (yB - yA) / 2);
      else
        k.wall('zxGlass', x1 - t, zf - 0.05, x0 + t, zf - 0.05, yA + t, yB - t, 2, (yB - yA) / 2);
    };
    for (const b of boxesS) frame(1, b);
    for (const b of boxesN) frame(-1, b);
    // 西北角藍框玻璃盒（從地面到頂，正射量約 6×12.6 m）
    const [gx0, gz0, gz1] = ZX.gbox,
      yT = B + ZX.h + 0.4,
      y0 = groundY(gx0, (gz0 + gz1) / 2) - 0.2;
    k.wall('zxGlass', gx0, gz0, gx0, gz1, y0, yT, 2, 2.2);
    k.wall('zxGlass', xa, gz0, gx0, gz0, y0, yT, 2, 2.2);
    k.wall('zxGlass', gx0, gz1, xa, gz1, y0, yT, 2, 2.2);
    for (const [x, z] of [
      [gx0, gz0],
      [gx0, gz1],
    ])
      k.box('royal', x - 0.2, x + 0.2, y0, yT + 0.3, z - 0.2, z + 0.2);
    k.box('royal', gx0 - 0.25, xa, yT, yT + 0.45, gz0 - 0.25, gz1 + 0.25);
    for (let y = y0 + 4.5; y < yT; y += 4.5) {
      k.box('royal', gx0 - 0.15, gx0 + 0.15, y - 0.15, y + 0.15, gz0, gz1);
      for (const z of [gz0, gz1]) k.box('royal', gx0, xa, y - 0.15, y + 0.15, z - 0.15, z + 0.15);
    }
    boxColl(
      [
        [gx0, gz0],
        [xa, gz0],
        [xa, gz1],
        [gx0, gz1],
      ],
      y0,
      yT
    );
    shapes.push({ name: 'zxGlassBox', pts: rect(gx0, gz0, xa, gz1), y0, y1: yT });
  }

  k.finish(group);
  scene.add(group);
  I.zoneH = { group, shapes };
  return group;
}
