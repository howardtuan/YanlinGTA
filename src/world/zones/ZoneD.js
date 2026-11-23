// D 區「北側教學」校內建築外觀（都不能進去，只做外觀）。
// 做法同 src/world/zones/ZoneH.js：src/world/MapBuilder.js 照舊用 OSM 輪廓蓋牆，zoneDLook() 只換 look／高度／執行時切塊（b.parts＋splitAc，
// 輪廓 b.pts、名稱、kind 都不動，src/world/MapBuilder.js 的共用亂數抽取次數不變），buildZoneD() 自建輪廓表達不了的構件。
// 自建構件不加 reserved；碰撞用 Interiors.addWall（高度相對當地地面，地圖植栽之後才加），
// 陸華樓東端樓梯間、北側水池範圍內原本的樹用 treeHide 藏起來（種樹位置與抽取次數不變）。
//
// 依據（campus-survey/PLAN.md 第 1 節 D 區、批次 2；zone-D.md 與其補充調查，正射 NLSC 2024）：
//  - 陸華樓 w392023423：淺灰藍外牆、三樓整層外凸斜切鰭片（look 原本就有）；北面二樓入口前花崗石雙跑大階梯（白鋼管扶手、
//    中間夾深色石碑，2020-06 P0 環景）、女兒牆藍綠色「陸 華 樓」、入口上方「Luh Hwa Hall」、一樓西段兩扇白色鐵捲門；
//    東端外面一個 OSM 沒有的白色樓梯間（約 7×10 m，藍綠直條窗，正射）；北側廣場用 2022 版：木棧板鋪面＋弧形藍色馬賽克水池
//    （池邊木頭座椅、白色洗石子，2022-11 相片）。
//  - 真知教學大樓 r9735126：粉咖啡磁磚（陽光下 #9c827c、陰影 #5e5052，取中間值）；屋頂 D 形地標（北側半圓、南側平直，
//    約 25×14 m、高約 2 層，外圈小方窗、頂上外挑圓盤屋簷，正射）；北面東段綠玻璃直條樓梯間＋金色直書「真知教學大樓」；
//    西南入口（大仁街側）兩層樓高白色花崗石紋門框、金色橫字「真知教學大樓」（2022-03 相片）。
//  - 篤信電學大樓 w428195402：一樓＋3 層窗（4F、約 14.5 m，正射倒向 4.4 m），沒有退縮頂樓；咖啡黃洗石子框架、灰馬賽克窗台板、
//    藍綠玻璃；北面中段偏東兩層高門廊：兩根灰圓柱（柱腳橘紅）、二樓高度混凝土雨遮帶、門廊頂招牌帶右至左「篤信電學大樓」
//    （2019-06 相片）；屋頂一圈橘紅欄杆、不鏽鋼圓水塔、白色機房。
//  - 電學大樓（南棟）w430346971：overrides 的切法反了。東西向長條才是高樓（正射倒向 7.7 m、天井相片 9 層）→ 9F；
//    南側「後塔」其實是圓筒（Google「中原電機系」，咖啡色磁磚環＋白色圓形屋頂，外徑約 15 m），層數先用 5F；
//    圓筒北邊一塊白色平頂連接量體（約 13×9 m）。圓筒用 parts 的低矮基座＋自建圓柱表達（輪廓不動）。名稱不改（任務用）。
//  - 智信樓（招牌「中正樓」）w392023405：淺灰清水混凝土、圓角大壁柱；北面中段拱形凹陽台＋金色「中正樓」（右至左），
//    東段一條深色玻璃帷幕直條；屋頂白色圓筒水塔（頂上欄杆）、西北角兩座冷卻水塔（正射）。
//  - 莊敬大樓 w392023408（輪廓第 0 批已改）：主長條 4F（2022-12 相片）、東南白頂方塊 5F、往南的翼較矮 3F；
//    白色小方磁磚、灰色樓板帶、亮藍玻璃；北面入口白磁磚雨遮板「莊敬大樓」、左側斜頂樓梯間牆板上 4 個圓形舷窗。
//  - 土木館 w328790116：約 7F（OSM height 28 m，P7／PD 數到 6～7 排窗）；北面頂層金黃字「中原大學土木工程館」；
//    南面主入口（2026-07 相片）：圓筒樓梯塔（弧形陽台、黑鐵欄杆）、花崗石壁柱金色直書「土木工程館」、獨立混凝土門框；
//    西北塔側牆紅色直書「土木工程學系」＋藍色直條（P7）；屋頂冷卻水塔。
// 沒有影像的面照同棟看得到的面推，特殊構件不編。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundY } from '../Terrain.js';

export const D_IDS = {
  luhua: 'w392023423',
  zz: 'r9735126',
  dx: 'w428195402',
  dxs: 'w430346971',
  zx: 'w392023405',
  zj: 'w392023408',
  tm: 'w328790116',
};

// 凸多邊形以外也可用的半平面裁切：keep(p) 回傳 [d1, d2…]，全部 >= 0 的部分保留（同 src/world/zones/ZoneH.js）
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
// 局部座標系：原點 O、u 軸 U、v 軸 V（俯視 x 東、z 南）
const frame = (O, U) => {
  const l = Math.hypot(U[0], U[1]),
    ux = U[0] / l,
    uz = U[1] / l,
    vx = -uz,
    vz = ux;
  return {
    O,
    ux,
    uz,
    vx,
    vz,
    P: (u, v) => [O[0] + ux * u + vx * v, O[1] + uz * u + vz * v],
    u: ([x, z]) => (x - O[0]) * ux + (z - O[1]) * uz,
    v: ([x, z]) => (x - O[0]) * vx + (z - O[1]) * vz,
  };
};

// ---------------- 幾何常數 ----------------
// 電學大樓：南側「後塔」區（OSM 原本 overrides parts[1]）的局部座標：O 在東北角，u 往西、v 往南
const DXS = {
  h: 29.7,
  floors: 9, // 長條 9F
  connH: 10.8,
  connFloors: 3, // 白色連接量體
  podH: 1.2, // 圓筒外圈咖啡色磁磚環狀台基（正射 v2；輪廓裡圓筒以外的角落）
  drum: { u: 7.7, v: 14.0, r: 7.5, h: 17.0, floors: 5 }, // 圓筒（外徑約 15 m）；圓心局部座標。5F（2017-09 官方街景）
  vConn: 6.5, // v < 6.5 是連接量體
};
const dxsF = frame([7.9, 232.0], [-14.7, -4.7]);
// v 軸要朝南（u 往西時 frame 給的 v 朝北），這裡把 v 反號
const dxsP = (u, v) => dxsF.P(u, -v),
  dxsV = (p) => -dxsF.v(p),
  _dxsU = (p) => dxsF.u(p);
const DRUM_C = dxsP(DXS.drum.u, DXS.drum.v);
// 圓筒東側白色馬賽克磁磚方形樓梯塔（2017-09 官方街景，接到 4F 陽台高度）：局部 u、v 範圍
const DXS_STAIR = { u0: -2.8, u1: 0.9, v0: 12.0, v1: 16.2, h: 14.6 };
// 長條中段的 9 層露天天井（評論相片 2023-05；正射屋頂凹口約 x -9..4、z 215..224）：沿長條方向 12×8 m
const DXS_ATRIUM = { c: [-2.5, 219.5], U: [0.949, 0.316], hu: 6.0, hv: 4.0 };
// 篤信↔電學連接量體（使用者確認兩棟連在一起；2021-02 空拍 P5：篤信屋頂後緣直接接到電學長條北牆，右段是略低的淺灰屋頂帶；
// 正射兩棟之間是有屋頂的深色天窗帶，不是露天中庭）。局部座標沿篤信南面：O＝篤信西南角，u 往東、v 往南（篤信南牆 v=0）。
// 往南伸進電學長條約 1 m（藏在長條牆裡），西端沿篤信西牆延長線剛好碰到長條西北角，東端照篤信東牆延長；兩端各內縮 0.5 m，讓開篤信外凸的框格。
const DX_LINK = {
  O: [-21.8, 194.4],
  U: [56.8, 18.4],
  h: 13.6,
  uv: [
    [0.5, -0.3],
    [59.2, -0.3],
    [59.2, 13.4],
    [56.2, 13.4],
    [56.2, 11.4],
    [52.4, 11.4],
    [52.4, 9.0],
    [9.3, 9.0],
    [9.3, 10.4],
    [5.0, 10.4],
    [5.0, 12.4],
    [0.5, 12.4],
  ],
};
const dxLinkF = frame(DX_LINK.O, DX_LINK.U);
const dxLink = () => DX_LINK.uv.map(([u, v]) => dxLinkF.P(u, v)); // frame 的 v 朝南；u 東 v 南的順序＝俯視順時針（同 OSM）
const dxsAtrium = () => {
  const F = frame(DXS_ATRIUM.c, DXS_ATRIUM.U),
    { hu, hv } = DXS_ATRIUM;
  return [F.P(-hu, -hv), F.P(-hu, hv), F.P(hu, hv), F.P(hu, -hv)];
}; // 和外圈反向（內環）

// 莊敬：沿主長條建局部座標（O 在西北角，u 往東南長向，v 往西南）
const zjF = frame([138.4, 159.2], [54.4, 24.7]);
const ZJ = { uSplit: 56, vWing: 12, hMain: 15.0, hBlock: 18.3, hWing: 11.5 };
// 真知屋頂 D 形地標：中心、u 軸（沿校園格網 108°），寬 25 m（u ±12.5）、深 14 m（v -7..7），北側半橢圓
const ZZ_D = { c: [-67.0, 196.0], U: [0.951, 0.309], rx: 12.5, ry: 9.0, vc: 2.0, v1: 7.0, h: 6.8 };
const zzF = frame(ZZ_D.c, ZZ_D.U);
// 局部 v 朝北為負：frame 的 v 是 (−uz, ux)＝(−0.309, 0.951) 朝南，正好
const dShape = () => {
  const P = [],
    n = 24;
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    P.push(zzF.P(-ZZ_D.rx * Math.cos(a), ZZ_D.vc - ZZ_D.ry * Math.sin(a)));
  }
  P.push(zzF.P(ZZ_D.rx, ZZ_D.v1), zzF.P(-ZZ_D.rx, ZZ_D.v1));
  return P; // 俯視順時針（x 東、z 南座標系下 = 外法線朝外，同 OSM 輪廓方向）
};
// 陸華樓：北面（P[3]→P[0]）入口大階梯、東端白色樓梯間
const LH = {
  stairS: 13.2,
  stairOff: 6.6,
  flightW: 2.5,
  gap: 1.3,
  rise: 3.5,
  n: 17,
  boxS0: 1.6,
  boxS1: 11.6,
  boxOut: 7.2,
  boxH: 13.6,
};
// 陸華樓北側廣場（2022 版）：木棧板、弧形水池
const LH_PLAZA = {
  deck: { s0: 3, s1: 22, o0: 6.8, o1: 20 },
  pool: { s: 27, o: 13.5, r0: 3.4, r1: 6.4, a0: -0.25, a1: 2.15 },
};

// 陸華樓的北面邊與東面邊（用 data 原輪廓：[-37.2,174.5],[-41.8,188.5],[-73.4,178.3],[-68.8,164.3]）
const LH_PTS = [
  [-37.2, 174.5],
  [-41.8, 188.5],
  [-73.4, 178.3],
  [-68.8, 164.3],
];
// 一條邊 A→B 上的點：t（0..1 沿邊）、off（沿外法線，公尺）；外法線在前進方向右手邊（OSM 輪廓方向）
function edge(A, B) {
  const dx = B[0] - A[0],
    dz = B[1] - A[1],
    l = Math.hypot(dx, dz),
    tx = dx / l,
    tz = dz / l,
    nx = tz,
    nz = -tx;
  return {
    A,
    B,
    l,
    tx,
    tz,
    nx,
    nz,
    at: (t, off = 0) => [A[0] + dx * t + nx * off, A[1] + dz * t + nz * off],
    atM: (s, off = 0) => [A[0] + tx * s + nx * off, A[1] + tz * s + nz * off],
  };
}
const LH_N = edge(LH_PTS[3], LH_PTS[0]),
  LH_E = edge(LH_PTS[0], LH_PTS[1]);
const quadAt = (E, s0, s1, o0, o1) => [E.atM(s0, o0), E.atM(s1, o0), E.atM(s1, o1), E.atM(s0, o1)];
const LH_BOX = () => quadAt(LH_E, LH.boxS0, LH.boxS1, 0, LH.boxOut);
const lhPool = (r, n = 18) => {
  const { s, o, a0, a1 } = LH_PLAZA.pool,
    c = LH_N.atM(s, o),
    P = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    P.push([
      c[0] + Math.cos(a) * r * LH_N.tx - Math.sin(a) * r * LH_N.nx,
      c[1] + Math.cos(a) * r * LH_N.tz - Math.sin(a) * r * LH_N.nz,
    ]);
  }
  return P;
};
const lhPoolRing = () => [
  ...lhPool(LH_PLAZA.pool.r1 + 0.5),
  ...lhPool(LH_PLAZA.pool.r0 - 0.5).reverse(),
];

// 平坦平台範圍內的樹、棕櫚、灌木種完後藏起來（src/world/MapBuilder.js opts.treeHide）：陸華樓東端樓梯間、北面大階梯、水池
// 中正樓東面（P[7]→P[8]，外法線朝東）南北兩端室外樓梯：w 離牆寬、land 平台長、run 梯段水平長、end 離牆角距離
const ZX_E = edge([119.6, 173.9], [110.3, 195.3]);
const ZX_ST = { w: 1.4, land: 2.0, run: 6.8, end: 0.3 };
const zxStairSpans = () => {
  const L = ZX_ST.land + ZX_ST.run;
  return [
    [ZX_ST.end, ZX_ST.end + L, 1],
    [ZX_E.l - ZX_ST.end - L, ZX_E.l - ZX_ST.end, -1],
  ];
};
export const zoneDTreeHide = () => [
  ...zxStairSpans().map(([a, b]) => quadAt(ZX_E, a - 0.3, b + 0.3, 0, ZX_ST.w + 0.5)),
  dxLink(),
  LH_BOX(),
  quadAt(LH_N, LH.stairS - 3.8, LH.stairS + 3.8, 0, LH.stairOff + 0.6),
  lhPoolRing(),
];

// ---------------- 外觀 look（src/core/Game.js 在 src/world/MapBuilder.js 蓋樓前套用） ----------------
export function zoneDLook(b) {
  const id = b.id;
  if (id === D_IDS.luhua) {
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: 'smooth', colour: '#d3dada' },
      plinth: { floors: 1, colour: '#c9d0cf' },
      windows: { ...(L.windows || {}), glass: '#5f8e94' },
      parapet: { h: 1.0, colour: '#e6eaea' },
    };
  } else if (id === D_IDS.zz) {
    b.look = {
      wall: { base: 'tile', colour: '#86706c' },
      windows: { type: 'pair', bay: 3.0, accent: '#d6cfc8', glass: '#4c5862' },
      plinth: { floors: 1, colour: '#d6d3cd' },
      bands: [
        { colour: '#9a8580', h: 0.18, depth: 0.12, on: ['n', 'e'] },
        { colour: '#cdbfae', h: 0.22, depth: 1.0, on: ['s', 'w'] },
        { colour: '#26282a', h: 0.07, depth: 1.0, at: 0.33, on: ['s', 'w'] },
      ], // 南、西面每層一整排淺米色陽台板＋黑鐵欄杆頂（2022-03 相片、大仁街 2026 官方街景）
      parapet: { h: 1.0, colour: '#7c6864' },
      roof: { colour: '#8a8884' },
    };
  } else if (id === D_IDS.dx) {
    b.h = 14.5;
    b.floors = 4;
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: 'smooth', colour: '#8a7458' },
      windows: { type: 'grid', bay: 2.8, accent: '#9a9a96', glass: '#5fa8a8', ground: 'punched' },
      plinth: { floors: 1, colour: '#c8c6c0' },
      fins: [{ spacing: 2.8, depth: 0.45, t: 0.32, colour: '#7d6a52', from: 1 }],
      bands: [
        { colour: '#7d6a52', h: 0.45, depth: 0.45 },
        { colour: '#b8b8b4', h: 0.55, depth: 0.12, at: 0.18 },
      ], // 樓板粗帶、窗下灰馬賽克窗台板
      parapet: { h: 0.6, colour: '#8a7458' },
      roof: { colour: '#7f7c76' },
    };
    delete b.look.topFloor; // 實景沒有退縮的頂樓
  } else if (id === D_IDS.dxs) {
    b.h = DXS.h;
    b.floors = DXS.floors;
    delete b.material; // 原本 OSM 材質 tiles 會蓋過 look（src/world/MapBuilder.js matKey）；look 自己有牆色
    const bar = (b.parts && b.parts[0]?.pts) || null,
      back = (b.parts && b.parts[1]?.pts) || null;
    const tile = { base: 'tile', colour: '#7e665e' };
    b.look = {
      wall: tile,
      windows: { type: 'pair', bay: 2.6, accent: '#e8e4de', glass: '#55636b' },
      plinth: { floors: 1, colour: '#cfc9c0' },
      parapet: { h: 1.0, colour: '#6e5a52' },
      roof: { colour: '#6d6a65' },
    };
    if (bar && back) {
      const conn = clipPoly(back, (p) => [DXS.vConn - dxsV(p)]),
        pod = clipPoly(back, (p) => [dxsV(p) - DXS.vConn]);
      // 牆色在 src/world/MapBuilder.js 是整棟共用的 tint，單塊要靠 faces.colour 改
      const white = {
        wall: { base: 'smooth', colour: '#e4e1da' },
        faces: [{ colour: '#e4e1da' }],
        windows: { types: ['ribbon'], bay: 3.0, accent: '#cfcac2', glass: '#56646c' },
        parapet: { h: 0.8, colour: '#d8d4cc' },
        roof: { colour: '#dcdad4' },
      };
      if (conn.length > 2 && pod.length > 2) {
        b.parts = [
          {
            pts: bar,
            holes: [dxsAtrium()],
            floors: DXS.floors,
            h: DXS.h,
            label: '長條（9F，中段露天天井）',
          },
          { pts: conn, floors: DXS.connFloors, h: DXS.connH, label: '白色連接量體', look: white },
          {
            pts: pod,
            floors: 1,
            h: DXS.podH,
            label: '圓筒台基（圓筒自建）',
            look: {
              ...white,
              faces: [{ colour: '#7a5f56' }],
              windows: { type: 'none' },
              parapet: { h: 0.4, colour: '#6e5650' },
            },
          },
        ];
        b.splitAc = 1; // 屋頂冷氣照原本的 rnd2 抽，跨塊的自動不畫
      }
    }
  } else if (id === D_IDS.zx) {
    b.look = {
      wall: { base: 'smooth', colour: '#b9b5ad' },
      windows: { type: 'ribbon', ground: 'none', bay: 6, accent: '#5d6064', glass: '#4a5a62' },
      fins: [{ spacing: 6, depth: 0.7, t: 0.6, colour: '#c6c1b9', from: 0, ends: true }],
      corner: { w: 1.6, colour: '#c9c4bc' },
      faces: [{ on: 'e', windows: { types: ['none', 'ribbon', 'ribbon', 'none'] } }], // 東面整片實牆＋壁柱，只有中段兩排帶窗（2017-09 官方街景）
      bands: [{ colour: '#d4cfc7', h: 0.9, depth: 0.55, at: 0.05, from: 1 }], // 帶窗之間的厚混凝土帶
      parapet: { h: 1.2, colour: '#cbc6be' },
      roof: { colour: '#e4e2de' },
    };
  } else if (id === D_IDS.zj) {
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: 'tile', colour: '#e4e2dc' },
      windows: {
        ...(L.windows || {}),
        type: 'punched',
        bay: 3.4,
        accent: '#d8d8d4',
        glass: '#5f9ab4',
      },
      bands: [
        ...(L.bands || []),
        { colour: '#9a9c9c', h: 0.16, depth: 0.08, on: ['n', 'ne', 'nw', 'w', 'e', 's', 'sw'] },
      ],
      parapet: { h: 0.9, colour: '#dcdad4' },
    };
    const cl = (keep) => clipPoly(b.pts, keep);
    const main = cl((p) => [ZJ.uSplit - zjF.u(p)]);
    // frame 的 v 朝西南（往外），白頂方塊 v 小、南翼 v 大
    const blk = cl((p) => [zjF.u(p) - ZJ.uSplit, ZJ.vWing - zjF.v(p)]),
      wing = cl((p) => [zjF.u(p) - ZJ.uSplit, zjF.v(p) - ZJ.vWing]);
    b.h = ZJ.hBlock;
    b.floors = 5;
    if (main.length > 2 && blk.length > 2 && wing.length > 2) {
      b.parts = [
        { pts: main, floors: 4, h: ZJ.hMain, label: '主長條 4F' },
        {
          pts: blk,
          floors: 5,
          h: ZJ.hBlock,
          label: '東南白頂方塊 5F',
          look: { ...b.look, roof: { colour: '#f0efea' } },
        },
        { pts: wing, floors: 3, h: ZJ.hWing, label: '往南的翼 3F' },
      ];
      b.splitAc = 1;
    } else {
      b.h = ZJ.hMain;
      b.floors = 4;
    }
  } else if (id === D_IDS.tm) {
    b.h = 24.0;
    b.floors = 7;
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: 'tile', colour: '#dedbd3' },
      windows: {
        ...(L.windows || {}),
        type: 'pair',
        bay: 3.6,
        accent: '#eceeee',
        glass: '#66788a',
      },
      bands: [{ colour: '#9ea2a4', h: 0.3, depth: 0.12, at: 0.1 }],
      parapet: { h: 1.2, colour: '#c4c6c6' },
    };
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
const speckle = (g, W, H, base, n, seed, a = 0.06, sz = 3) => {
  const r = lcg(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * a})`;
    g.fillRect(r() * W, r() * H, 1 + r() * sz, 1 + r() * sz);
  }
};
// 電學圓筒 1～2F：咖啡色磁磚實牆（一格＝3 m 寬 × 3 m 高）
const drumSolidTex = () =>
  ctex('dDrumSolid', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#7a5f56', 500, 11, 0.07, 2);
    g.fillStyle = 'rgba(0,0,0,0.14)';
    for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 1);
    for (let x = 0; x < W; x += 16) g.fillRect(x, 0, 1, H);
  });
// 電學圓筒 3～5F：灰色混凝土＋一整圈橫向帶窗（一格＝3 m 寬 × 1 層）
const drumRibTex = () =>
  ctex('dDrumRib', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#b9b5ae', 400, 13, 0.06, 2);
    const y0 = H * 0.3,
      y1 = H * 0.86,
      gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#76858c');
    gr.addColorStop(1, '#3f4a50');
    g.fillStyle = gr;
    g.fillRect(0, y0, W, y1 - y0);
    g.fillStyle = '#d8d6d0';
    g.fillRect(0, y0 - 3, W, 3);
    g.fillRect(W / 2 - 2, y0, 4, y1 - y0);
    g.fillRect(0, y1, W, 3);
  });
// 真知屋頂 D 形地標：白牆、中間一排深色小方窗（偶爾紅色），一格＝3 m
const dLandTex = () =>
  ctex('dLand', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#e6e5e1', 300, 5, 0.05, 2);
    g.fillStyle = '#2f363c';
    g.fillRect(W * 0.32, H * 0.36, W * 0.36, H * 0.34);
    g.fillStyle = '#d0cec8';
    g.fillRect(W * 0.3, H * 0.7, W * 0.4, 4);
  });
const dLandRedTex = () =>
  ctex('dLandRed', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#e6e5e1', 300, 5, 0.05, 2);
    g.fillStyle = '#b04040';
    g.fillRect(W * 0.32, H * 0.36, W * 0.36, H * 0.34);
    g.fillStyle = '#d0cec8';
    g.fillRect(W * 0.3, H * 0.7, W * 0.4, 4);
  });
// 白色花崗石紋磁磚（白底黑點）
const graniteWTex = () =>
  ctex('dGranW', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#dcdad6', 900, 21, 0.25, 1.5);
    g.fillStyle = 'rgba(120,118,112,0.35)';
    for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 32) g.fillRect(0, y, W, 1);
  });
// 深灰花崗石（台階、土木壁柱下半）
const graniteDTex = () =>
  ctex('dGranD', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#4c4e50', 900, 23, 0.18, 1.5);
  });
// 木棧板（廣場鋪面）：橫向長條板
const deckTex = () =>
  ctex('dDeck', 128, 128, (g, W, H) => {
    const r = lcg(31);
    g.fillStyle = '#4a3428';
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 16) {
      const v = r() * 16;
      g.fillStyle = `rgb(${112 + v},${80 + v * 0.7},${60 + v * 0.5})`;
      g.fillRect(0, y + 1, W, 14);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, y, W, 1);
    }
  });
// 藍色馬賽克（水池內面）
const mosaicTex = () =>
  ctex('dMosaic', 128, 128, (g, W, H) => {
    const r = lcg(41);
    g.fillStyle = '#d8dde0';
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 8)
      for (let x = 0; x < W; x += 8) {
        const v = r();
        g.fillStyle = v < 0.7 ? '#1d3f9a' : v < 0.9 ? '#2a52b8' : '#16327a';
        g.fillRect(x + 1, y + 1, 7, 7);
      }
  });
// 白色洗石子
const terrazzoTex = () =>
  ctex('dTerr', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#e2e1dc', 1400, 43, 0.22, 1.2);
  });
// 白色鐵捲門
const shutterTex = () =>
  ctex(
    'dShutter',
    128,
    128,
    (g, W, H) => {
      g.fillStyle = '#e4e4e0';
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 6) {
        g.fillStyle = 'rgba(0,0,0,0.13)';
        g.fillRect(0, y, W, 2);
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.fillRect(0, y + 2, W, 1);
      }
    },
    false
  );
// 篤信門廊玻璃牆：黑框方格、深色玻璃，下緣一條橘色橫條
const portalGlassTex = () =>
  ctex('dPortalGl', 256, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#93a6ae');
    gr.addColorStop(1, '#5a686e');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(0, 0, W * 0.4, H);
    g.fillStyle = '#16181a';
    for (let x = 0; x <= W; x += W / 4) g.fillRect(x - 3, 0, 6, H);
    for (const y of [0, H * 0.42, H - 6]) g.fillRect(0, y, W, 6);
    g.fillStyle = '#e8662e';
    g.fillRect(0, H * 0.62, W, 7);
  }); // 要能重複：牆面 UV 會超過 1
// 綠玻璃直條樓梯間（真知北面）
const greenGlassTex = () =>
  ctex('dGreenGl', 128, 128, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, '#4f8a7c');
    gr.addColorStop(0.5, '#6fa898');
    gr.addColorStop(1, '#4f8a7c');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#d6d6d2';
    g.fillRect(0, 0, 5, H);
    g.fillRect(W - 5, 0, 5, H);
    g.fillRect(0, H - 6, W, 6);
    g.fillRect(W / 2 - 2, 0, 4, H);
  });
// 深色玻璃帷幕（中正樓東段直條、土木入口）
const darkGlassTex = () =>
  ctex('dDarkGl', 128, 128, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#3d4a52');
    gr.addColorStop(0.6, '#56646c');
    gr.addColorStop(1, '#2e383e');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#5a5e62';
    g.fillRect(0, 0, 4, H);
    g.fillRect(0, 0, W, 4);
    g.fillRect(W / 2 - 2, 0, 4, H);
  });
// 陸華樓東端樓梯間：白牆＋藍綠直條窗（一格 3 m 寬、1 層）
const lhBoxTex = () =>
  ctex('dLhBox', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#eceeec', 200, 51, 0.04, 2);
    g.fillStyle = '#4f9a9e';
    g.fillRect(W * 0.4, 0, W * 0.2, H);
    g.fillStyle = '#e4e8e6';
    g.fillRect(W * 0.4, H * 0.48, W * 0.2, 3);
  });
// 篤信↔電學連接量體兩端外牆：篤信的咖啡黃洗石子＋灰窗台板＋藍綠玻璃（一格＝2.8 m 寬 × 一層 3.4 m）
const dxLinkTex = () =>
  ctex('dDxLink', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#8a7458', 400, 81, 0.07, 2);
    g.fillStyle = '#5c8f90';
    g.fillRect(W * 0.12, H * 0.2, W * 0.76, H * 0.52);
    g.fillStyle = '#7d6a52';
    g.fillRect(W * 0.48, H * 0.2, W * 0.04, H * 0.52);
    g.fillStyle = '#b8b8b4';
    g.fillRect(0, H * 0.72, W, H * 0.1);
    g.fillStyle = '#7d6a52';
    g.fillRect(0, 0, W, H * 0.08);
  });
// 莊敬舷窗牆板：白色小方磁磚
const tileWTex = () =>
  ctex('dTileW', 128, 128, (g, W, H) => {
    g.fillStyle = '#e8e6e0';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(120,120,115,0.35)';
    for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 1);
  });
// 土木圓筒樓梯塔：淺米灰清水混凝土＋每層弧形窗帶（一格＝一層 3.4 m）
const tmDrumTex = () =>
  ctex('dTmDrum', 128, 128, (g, W, H) => {
    speckle(g, W, H, '#c9c6bf', 400, 61, 0.06, 2);
    const y0 = H * 0.3,
      y1 = H * 0.72,
      gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#8a979c');
    gr.addColorStop(1, '#5c686e');
    for (let x = 6; x < W; x += 64) {
      g.fillStyle = gr;
      g.fillRect(x, y0, 52, y1 - y0);
    }
    g.fillStyle = '#1e1f20';
    g.fillRect(0, y1 - 18, W, 3);
    for (let x = 0; x < W; x += 10) g.fillRect(x, y1 - 18, 2, 18); // 黑鐵欄杆
    g.fillStyle = '#b7b4ad';
    g.fillRect(0, y1, W, H - y1);
  });
function textTex(key, w, h, draw) {
  return ctex(key, w, h, draw, false);
}
const SANS = '"Noto Sans TC","PingFang TC",sans-serif',
  SERIF = '"Noto Serif TC","Songti TC",serif',
  KAI = '"BiauKai","Kaiti TC","STKaiti","Noto Serif TC",serif';
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
// 橫書字；spread：字平均分散排滿整條
const hText = (key, text, colour, bg, font, w = 1024, h = 160, spread = false, shadow = null) =>
  textTex(key, w, h, (g, W, Hh) => {
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, Hh);
    }
    g.font = `900 ${Hh * 0.62}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const chars = spread ? [...text] : [text],
      step = W / chars.length;
    chars.forEach((c, i) => {
      const x = spread ? step * (i + 0.5) : W / 2;
      if (shadow) {
        g.fillStyle = shadow;
        g.fillText(c, x + 3, Hh / 2 + 7);
      }
      g.fillStyle = colour;
      g.fillText(c, x, Hh / 2 + 4);
    });
  });
// 校徽小圓（土木北面招牌旁）
const sealTex = () =>
  textTex('dSeal', 128, 128, (g, W, H) => {
    g.fillStyle = '#f2f2ee';
    g.beginPath();
    g.arc(W / 2, H / 2, 60, 0, 7);
    g.fill();
    g.fillStyle = '#2c4a9a';
    g.beginPath();
    g.arc(W / 2, H / 2, 50, 0, 7);
    g.fill();
    g.fillStyle = '#f2f2ee';
    g.font = `900 38px ${SERIF}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('中原', W / 2, H / 2 + 2);
  });
// 深色石碑（陸華大階梯中間）
const steleTex = () =>
  textTex('dStele', 128, 192, (g, W, H) => {
    speckle(g, W, H, '#232628', 300, 71, 0.08, 2);
    g.fillStyle = 'rgba(220,215,200,0.75)';
    for (let y = 22; y < H * 0.55; y += 12) g.fillRect(14, y, W - 28, 4);
    for (let y = H * 0.66; y < H - 20; y += 9) g.fillRect(24, y, W - 48, 3);
  });

// ---------------- 材質 ----------------
const MATS = {};
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const rep = (t, u, v) => {
    const c = t.clone();
    c.repeat.set(u, v);
    c.needsUpdate = true;
    return c;
  };
  const m = {
    white: () => std({ color: '#ecebe6', roughness: 0.7 }),
    offWhite: () => std({ color: '#e2e0da', roughness: 0.8 }),
    conc: () => std({ color: '#c4c0b8', roughness: 0.9 }),
    concDark: () => std({ color: '#9c9890', roughness: 0.9 }),
    concLight: () => std({ color: '#cfcac2', roughness: 0.9 }),
    portalGrey: () => std({ color: '#9a9a94', roughness: 0.9 }),
    steel: () => std({ color: '#b9bec2', metalness: 0.65, roughness: 0.35 }),
    steelDark: () => std({ color: '#3a3d40', metalness: 0.6, roughness: 0.45 }),
    rail: () => std({ color: '#f2f2f0', metalness: 0.3, roughness: 0.4 }),
    orange: () => std({ color: '#e0602e', roughness: 0.55 }),
    orangeRail: () => std({ color: '#d0582e', metalness: 0.3, roughness: 0.5 }),
    gold: () => std({ color: '#d9b45a', metalness: 0.7, roughness: 0.35 }),
    blue: () => std({ color: '#2b5fae', roughness: 0.6 }),
    dark: () => std({ color: '#26292c', roughness: 0.6 }),
    granite: () => std({ map: graniteDTex(), roughness: 0.75 }),
    graniteW: () => std({ map: graniteWTex(), roughness: 0.7 }),
    graniteL: () => std({ color: '#a7a49e', roughness: 0.75 }),
    stairStone: () => std({ color: '#55585b', roughness: 0.8 }),
    drumSolid: () => std({ map: rep(drumSolidTex(), 16, 2.4), roughness: 0.85 }),
    drumRib: () => std({ map: rep(drumRibTex(), 15, 1), roughness: 0.8 }),
    drumRoof: () => std({ color: '#ecebe6', roughness: 0.8 }),
    land: () => std({ map: dLandTex(), roughness: 0.8 }),
    landRed: () => std({ map: dLandRedTex(), roughness: 0.8 }),
    deck: () => std({ map: deckTex(), roughness: 0.85 }),
    mosaic: () => std({ map: mosaicTex(), roughness: 0.25, metalness: 0.1 }),
    water: () =>
      new THREE.MeshStandardMaterial({
        color: '#3d6f9c',
        roughness: 0.05,
        metalness: 0.2,
        transparent: true,
        opacity: 0.75,
      }),
    terrazzo: () => std({ map: terrazzoTex(), roughness: 0.8 }),
    wood: () => std({ color: '#b98756', roughness: 0.75 }),
    shutter: () => std({ map: shutterTex(), roughness: 0.6, metalness: 0.3 }),
    portalGlass: () => std({ map: portalGlassTex(), roughness: 0.2, metalness: 0.4 }),
    greenGlass: () => std({ map: greenGlassTex(), roughness: 0.2, metalness: 0.4 }),
    darkGlass: () => std({ map: darkGlassTex(), roughness: 0.15, metalness: 0.45 }),
    lhBox: () => std({ map: lhBoxTex(), roughness: 0.75 }),
    tileW: () => std({ map: tileWTex(), roughness: 0.7 }),
    dxLink: () => std({ map: dxLinkTex(), roughness: 0.85 }),
    porthole: () =>
      std({ color: '#62b4d6', roughness: 0.15, metalness: 0.4, side: THREE.DoubleSide }),
    tmDrum: () => std({ map: rep(tmDrumTex(), 6, 7), roughness: 0.85 }),
    tank: () => std({ color: '#cfd3d6', metalness: 0.7, roughness: 0.3 }),
    cool: () => std({ color: '#8a9094', metalness: 0.5, roughness: 0.5 }),
    red: () => std({ color: '#b8352c', roughness: 0.6 }),
  }[key];
  return (MATS[key] = m());
}

// ---------------- 幾何累加（依材質合併，同 src/world/zones/ZoneH.js） ----------------
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
  // 沿邊 E 擺正的方塊：s 沿邊、o 沿外法線
  obox(m, E, s0, s1, o0, o1, y0, y1) {
    const c = E.atM((s0 + s1) / 2, (o0 + o1) / 2),
      g = new THREE.BoxGeometry(s1 - s0, y1 - y0, o1 - o0);
    g.rotateY(-Math.atan2(E.tz, E.tx));
    g.translate(c[0], (y0 + y1) / 2, c[1]);
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
  cyl(m, x, z, r, y0, y1, seg = 16, open = false) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, open);
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
  // 直立牆：從 a 走到 b，往東走朝南（和 OSM 輪廓的外法線相反：沿輪廓順序畫會朝內，要反過來走）
  wall(m, ax, az, bx, bz, y0, y1, tu = 4, tv = 4, u0 = 0) {
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
        [u0, vb],
        [u0 + l / tu, vb],
        [u0 + l / tu, vt],
        [u0, vt],
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
  // 貼地鋪面：(s,o) 範圍切成小格，每個頂點貼著當地地面再抬 lift（不會被坡地吃掉）
  drape(m, E, s0, s1, o0, o1, lift, H, cell = 1.5, tile = 2) {
    const ns = Math.max(1, Math.ceil((s1 - s0) / cell)),
      no = Math.max(1, Math.ceil((o1 - o0) / cell)),
      pos = [],
      uv = [];
    const P = (i, j) => {
      const s = s0 + ((s1 - s0) * i) / ns,
        o = o0 + ((o1 - o0) * j) / no,
        p = E.atM(s, o);
      return [p[0], H(p[0], p[1]) + lift, p[1], s / tile, o / tile];
    };
    for (let i = 0; i < ns; i++)
      for (let j = 0; j < no; j++) {
        const a = P(i, j),
          b = P(i + 1, j),
          c = P(i + 1, j + 1),
          d = P(i, j + 1);
        for (const q of [a, d, c, a, c, b]) {
          pos.push(q[0], q[1], q[2]);
          uv.push(q[3], q[4]);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) {
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
  // 沿多邊形外圈的直立牆（ring 為 OSM 方向：外法線在前進方向右手邊），貼圖每 tu 公尺一格
  ringWalls(m, ring, y0, y1, tu = 3, tv = 3.4) {
    let acc = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        c = ring[(i + 1) % ring.length],
        l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (l < 0.02) continue;
      // 反過來走才朝外；u 從 acc+l 往回
      this.quad(
        m,
        [c[0], y0, c[1]],
        [a[0], y0, a[1]],
        [a[0], y1, a[1]],
        [c[0], y1, c[1]],
        [
          [acc / tu, 0],
          [(acc + l) / tu, 0],
          [(acc + l) / tu, (y1 - y0) / tv],
          [acc / tu, (y1 - y0) / tv],
        ]
      );
      acc += l;
    }
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = m !== 'water';
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
const circle = (cx, cz, r, n = 32, a0 = 0) => {
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (2 * Math.PI * i) / n;
    P.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return P;
};

// ---------------- 蓋 ----------------
export function buildZoneD(I, scene, data, collision) {
  const group = new THREE.Group();
  group.name = 'zoneD';
  const k = new Acc(),
    shapes = [];
  const find = (id) => data.buildings.find((b) => b.id === id);
  const H = (x, z) => groundY(x, z);
  // 碰撞牆：高度相對牆中點的地面（src/world/Kit.js Interiors 的牆是相對地面的）
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
  // 屋頂欄杆（沿多邊形外圈內縮 inset）
  const railRing = (m, ring, y, h = 1.05, inset = 0.25, every = 1.6) => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        c = ring[(i + 1) % ring.length],
        E = edge(a, c);
      if (E.l < 0.5) continue;
      const p = E.atM(0, -inset),
        q = E.atM(E.l, -inset);
      k.slab(m, p[0], p[1], q[0], q[1], 0.06, y + h - 0.07, y + h);
      k.slab(m, p[0], p[1], q[0], q[1], 0.04, y + h * 0.5 - 0.03, y + h * 0.5 + 0.02);
      const n = Math.max(1, Math.round(E.l / every));
      for (let j = 0; j <= n; j++) {
        const s = E.atM((E.l * j) / n, -inset);
        k.box(m, s[0] - 0.035, s[0] + 0.035, y, y + h, s[1] - 0.035, s[1] + 0.035);
      }
    }
  };
  // 圓柱水塔＋頂上欄杆
  const tank = (x, z, r, y0, h, m = 'tank') => {
    k.cyl(m, x, z, r, y0, y0 + h, 18);
    k.cyl('steelDark', x, z, r * 0.25, y0 + h, y0 + h + 0.3, 8);
  };
  // 冷卻水塔：方箱＋頂上風扇圓筒
  const cooler = (x, z, s, y0) => {
    k.box('cool', x - s / 2, x + s / 2, y0, y0 + 2.2, z - s / 2, z + s / 2);
    k.cyl('steelDark', x, z, s * 0.38, y0 + 2.2, y0 + 2.9, 14);
  };

  // ===== 陸華樓：北面雙跑大階梯、石碑、招牌字、鐵捲門、東端白色樓梯間、北側廣場（木棧板＋弧形藍色水池） =====
  const lh = find(D_IDS.luhua);
  if (lh) {
    const B = lh.base ?? H(-55, 176),
      E = LH_N,
      fl = (lh.h - 0.6) / (lh.floors || 3);
    // 大階梯：兩段並排、往牆爬到二樓入口平台（+3.5 m），中間夾深色石碑
    const sC = LH.stairS,
      w = LH.flightW,
      gp = LH.gap,
      run = LH.stairOff,
      yTop = B + LH.rise;
    const yG =
      Math.min(H(...E.atM(sC, run)), H(...E.atM(sC - 3, run)), H(...E.atM(sC + 3, run))) - 0.05;
    const landD = 1.6; // 頂端平台深度
    for (const side of [-1, 1]) {
      const sa = side < 0 ? sC - gp / 2 - w : sC + gp / 2,
        sb = sa + w,
        n = LH.n,
        stp = (run - landD) / n,
        rise = (yTop - yG) / n;
      for (let i = 0; i < n; i++) {
        const o0 = run - i * stp,
          o1 = o0 - stp,
          y = yG + (i + 1) * rise;
        k.obox('stairStone', E, sa, sb, o1, o0, yG - 0.3, y);
      }
      // 白鋼管扶手（外側、內側各一條斜管＋立柱）
      for (const s of [sa + 0.08, sb - 0.08]) {
        const p0 = E.atM(s, run - 0.1),
          p1 = E.atM(s, landD);
        k.beam('rail', [p0[0], yG + 1.0, p0[1]], [p1[0], yTop + 1.0, p1[1]], 0.07, 0.07);
        k.beam('rail', [p0[0], yG + 0.5, p0[1]], [p1[0], yTop + 0.5, p1[1]], 0.04, 0.04);
        for (let j = 0; j <= 4; j++) {
          const t = j / 4,
            p = E.atM(s, run - 0.1 - (run - 0.1 - landD) * t),
            y = yG + (yTop - yG) * t;
          k.box('rail', p[0] - 0.035, p[0] + 0.035, y - 0.3, y + 1.0, p[1] - 0.035, p[1] + 0.035);
        }
      }
    }
    k.obox('stairStone', E, sC - gp / 2 - w, sC + gp / 2 + w, 0, landD, yG - 0.3, yTop); // 頂端平台
    // 平台兩側扶手
    for (const s of [sC - gp / 2 - w + 0.08, sC + gp / 2 + w - 0.08]) {
      const p = E.atM(s, 0.05),
        q = E.atM(s, landD);
      k.slab('rail', p[0], p[1], q[0], q[1], 0.06, yTop + 0.94, yTop + 1.0);
    }
    // 平台前緣（中間石碑那段）扶手
    {
      const p = E.atM(sC - gp / 2, landD),
        q = E.atM(sC + gp / 2, landD);
      k.slab('rail', p[0], p[1], q[0], q[1], 0.06, yTop + 0.94, yTop + 1.0);
    }
    // 兩段中間：深色石碑（斜放）＋下方碎石
    {
      const c = E.atM(sC, landD + 1.6),
        yb = H(...c) - 0.05;
      k.obox('dark', E, sC - 0.55, sC + 0.55, landD + 1.2, landD + 1.45, yb, yb + 1.9);
    }
    {
      const p = E.atM(sC, landD + 1.47);
      sign(group, steleTex(), 1.0, 1.7, p[0], H(...p) + 1.0, p[1], E.nx, E.nz, 0.05);
    }
    // 碰撞：整座階梯（不能走上去）
    {
      const P = quadAt(E, sC - gp / 2 - w - 0.1, sC + gp / 2 + w + 0.1, 0, run + 0.05);
      ringColl(P, yG - 0.3, yTop + 1.0);
      shapes.push({ name: 'luhuaStair', pts: P, y0: yG, y1: yTop });
    }
    // 女兒牆藍綠色「陸 華 樓」、入口上方「Luh Hwa Hall」
    {
      const p = E.atM(E.l * 0.55, 1.35);
      sign(
        group,
        hText('dLhName', '陸華樓', '#3a8a9a', null, SERIF, 1024, 200, true),
        7.5,
        1.4,
        p[0],
        B + lh.h + 0.0,
        p[1],
        E.nx,
        E.nz,
        0.2
      );
    }
    {
      const p = E.atM(sC, 0.06);
      sign(
        group,
        hText('dLhEn', 'Luh Hwa Hall', '#2f3335', null, '"Times New Roman",serif'),
        3.0,
        0.42,
        p[0],
        B + fl + 2.75,
        p[1],
        E.nx,
        E.nz,
        0.05
      );
    }
    // 一樓西段兩扇白色鐵捲門
    for (const s of [3.2, 6.0]) {
      const a = E.atM(s, 0.05),
        b = E.atM(s + 2.3, 0.05);
      k.quad(
        'shutter',
        [b[0], B - 0.1, b[1]],
        [a[0], B - 0.1, a[1]],
        [a[0], B + 2.6, a[1]],
        [b[0], B + 2.6, b[1]],
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]
      );
    }
    // 東端白色樓梯間（OSM 沒有）：約 7×10 m、比主體高一點，藍綠直條窗
    {
      const P = LH_BOX(),
        yb = Math.min(...P.map((p) => H(...p))) - 0.4,
        yt = B + LH.boxH;
      k.ringWalls('lhBox', P.slice().reverse(), yb, yt, 3.3, 3.4); // quadAt 的順序和 OSM 相反
      k.flat('offWhite', P, yt);
      railRing('rail', P.slice().reverse(), yt, 1.0, 0.15, 1.5);
      ringColl(P, yb, yt);
      shapes.push({ name: 'luhuaStairBox', pts: P, y0: yb, y1: yt });
    }
    // 北側廣場：木棧板、白色洗石子邊、弧形藍色馬賽克水池（池邊木座椅）
    {
      const D = LH_PLAZA.deck;
      k.drape('deck', E, D.s0, D.s1, D.o0, D.o1, 0.05, H, 1.5, 2);
      const P0 = lhPool(LH_PLAZA.pool.r0),
        P1 = lhPool(LH_PLAZA.pool.r1),
        Pi = lhPool(LH_PLAZA.pool.r0 - 0.5),
        Po = lhPool(LH_PLAZA.pool.r1 + 0.5);
      const c = E.atM(LH_PLAZA.pool.s, LH_PLAZA.pool.o),
        yP = H(...c) + 0.05,
        yR = yP + 0.45;
      // 池底（藍色馬賽克）與水面
      const ring = (A, Bq) => [...A, ...Bq.slice().reverse()];
      k.flat('mosaic', ring(P0, P1), yP - 0.2, false, 1.5);
      k.flat('water', ring(P0, P1), yR - 0.12);
      // 池壁內面（藍色馬賽克）、外圈白色洗石子矮牆、頂上木座椅
      for (let i = 0; i < P0.length - 1; i++) {
        k.quad(
          'mosaic',
          [P1[i][0], yP - 0.2, P1[i][1]],
          [P1[i + 1][0], yP - 0.2, P1[i + 1][1]],
          [P1[i + 1][0], yR, P1[i + 1][1]],
          [P1[i][0], yR, P1[i][1]]
        );
        k.quad(
          'mosaic',
          [P0[i + 1][0], yP - 0.2, P0[i + 1][1]],
          [P0[i][0], yP - 0.2, P0[i][1]],
          [P0[i][0], yR, P0[i][1]],
          [P0[i + 1][0], yR, P0[i + 1][1]]
        );
        k.quad(
          'terrazzo',
          [Po[i + 1][0], yP - 0.3, Po[i + 1][1]],
          [Po[i][0], yP - 0.3, Po[i][1]],
          [Po[i][0], yR, Po[i][1]],
          [Po[i + 1][0], yR, Po[i + 1][1]]
        );
        k.quad(
          'terrazzo',
          [Pi[i][0], yP - 0.3, Pi[i][1]],
          [Pi[i + 1][0], yP - 0.3, Pi[i + 1][1]],
          [Pi[i + 1][0], yR, Pi[i + 1][1]],
          [Pi[i][0], yR, Pi[i][1]]
        );
      }
      k.flat('wood', ring(P1, Po), yR + 0.02, false, 1);
      k.flat('terrazzo', ring(Pi, P0), yR + 0.01, false, 2);
      for (const A of [
        [Po[0], Pi[0]],
        [Po[Po.length - 1], Pi[Pi.length - 1]],
      ]) {
        const [a, b] = A;
        k.quad(
          'terrazzo',
          [a[0], yP - 0.3, a[1]],
          [b[0], yP - 0.3, b[1]],
          [b[0], yR, b[1]],
          [a[0], yR, a[1]]
        );
        k.quad(
          'terrazzo',
          [b[0], yP - 0.3, b[1]],
          [a[0], yP - 0.3, a[1]],
          [a[0], yR, a[1]],
          [b[0], yR, b[1]]
        );
      }
      // 碰撞：池子外圈（矮牆 0.45 m，人跨不過去）
      ringColl(lhPoolRing(), yP - 0.3, yR);
      shapes.push({ name: 'luhuaPool', pts: lhPoolRing(), y0: yP, y1: yR });
    }
  }

  // ===== 真知：屋頂 D 形地標、北面綠玻璃樓梯間＋金色直書、西南入口白色花崗石門框＋金色橫字 =====
  const zz = find(D_IDS.zz);
  if (zz) {
    const B = zz.base ?? H(-65, 215),
      top = B + zz.h;
    const D = dShape(),
      y0 = top,
      y1 = top + ZZ_D.h;
    // 牆：一圈小方窗（偶爾紅色），兩層
    k.ringWalls('land', D, y0, y0 + 3.4, 3, 3.4);
    k.ringWalls('land', D, y0 + 3.4, y1 - 0.6, 3, 3.4);
    k.flat('drumRoof', D, y1 - 0.6);
    // 頂上外挑圓盤屋簷（外推 1.2 m，厚 0.5 m）
    const cx = D.reduce((s, p) => s + p[0], 0) / D.length,
      cz = D.reduce((s, p) => s + p[1], 0) / D.length;
    const Dx = D.map(([x, z]) => {
      const dx = x - cx,
        dz = z - cz,
        l = Math.hypot(dx, dz);
      return [x + (dx / l) * 1.2, z + (dz / l) * 1.2];
    });
    k.flat('drumRoof', Dx, y1 + 0.1);
    k.flat('drumRoof', Dx, y1 - 0.4, true);
    k.ringWalls('white', Dx, y1 - 0.4, y1 + 0.1, 3, 0.5);
    // 幾格紅色小窗（北面）
    for (const i of [6, 9, 15, 18]) {
      const a = D[i],
        c = D[i + 1],
        E = edge(a, c);
      const p = E.atM(E.l / 2, 0.03);
      sign(
        group,
        textTex('dRedWin', 32, 32, (g) => {
          g.fillStyle = '#b04040';
          g.fillRect(0, 0, 32, 32);
        }),
        0.9,
        1.0,
        p[0],
        y0 + 1.9,
        p[1],
        E.nx,
        E.nz,
        0.05
      );
    }
    shapes.push({ name: 'zhenzhiLandmark', pts: D, y0, y1 });
    // 北面東段（(-44.7,190)→(-30.5,194.3)）：綠玻璃直條樓梯間（2F 到屋頂）、左邊金色直書「真知教學大樓」
    const nE = edge([-44.7, 190.0], [-30.5, 194.3]);
    {
      const a = nE.atM(nE.l * 0.55, 0.35),
        b = nE.atM(nE.l * 0.55 + 2.6, 0.35),
        a0 = nE.atM(nE.l * 0.55, 0),
        b0 = nE.atM(nE.l * 0.55 + 2.6, 0),
        yb = B + 3.6,
        yt = top + 1.2;
      k.wall('greenGlass', b[0], b[1], a[0], a[1], yb, yt, 2.6, 3.4);
      k.wall('greenGlass', a[0], a[1], a0[0], a0[1], yb, yt, 0.35, 3.4);
      k.wall('greenGlass', b0[0], b0[1], b[0], b[1], yb, yt, 0.35, 3.4);
      k.flat('concLight', [a0, b0, b, a], yt);
    }
    {
      const p = nE.atM(nE.l * 0.3, 0.08);
      sign(
        group,
        vText('dZzV', '真知教學大樓', '#d9b45a', SERIF),
        1.5,
        10.5,
        p[0],
        B + 15,
        p[1],
        nE.nx,
        nE.nz,
        0.3
      );
    }
    // 西南入口：南翼西面（(-71,247.8)→(-66.3,233.1)），兩層樓高的白色花崗石門框（三開間、方柱），上面金色橫字
    const wE = edge([-71.0, 247.8], [-66.3, 233.1]),
      s0 = 1.6,
      s1 = wE.l - 1.2,
      yb = H(...wE.atM((s0 + s1) / 2, 2)) - 0.1,
      yT = yb + 8.2,
      dep = 2.0;
    {
      const piers = [s0, s0 + (s1 - s0) / 3, s0 + (2 * (s1 - s0)) / 3, s1],
        pw = 1.2;
      for (const s of piers) {
        k.obox('graniteW', wE, s - pw / 2, s + pw / 2, 0, dep, yb, yT - 1.6);
        const P = quadAt(wE, s - pw / 2, s + pw / 2, 0, dep);
        ringColl(P, yb, yT - 1.6);
      }
      k.obox('graniteW', wE, s0 - pw / 2, s1 + pw / 2, 0, dep, yT - 1.6, yT); // 門框頂樑（招牌帶）
      k.obox('graniteW', wE, s0, s1, 0, dep * 0.6, yb + 3.8, yb + 4.4); // 二樓高度橫樑
      k.obox('graniteW', wE, s0 - pw / 2, s1 + pw / 2, dep - 0.2, dep, yT - 1.6 - 0.1, yT); // 外緣
      // 一樓：黑框玻璃門廳
      const a = wE.atM(s0 + 0.6, 0.06),
        b = wE.atM(s1 - 0.6, 0.06);
      k.wall('portalGlass', b[0], b[1], a[0], a[1], yb, yb + 3.4, 3.2, 3.4);
      const p = wE.atM((s0 + s1) / 2, dep + 0.03);
      sign(
        group,
        hText('dZzH', '真知教學大樓', '#d9b45a', null, SERIF, 1024, 160, true, 'rgba(0,0,0,0.35)'),
        (s1 - s0) * 0.72,
        1.05,
        p[0],
        yT - 0.8,
        p[1],
        wE.nx,
        wE.nz,
        0.3
      );
      shapes.push({
        name: 'zhenzhiPortal',
        pts: quadAt(wE, s0 - pw / 2, s1 + pw / 2, 0, dep),
        y0: yb,
        y1: yT,
      });
    }
  }

  // ===== 篤信電學大樓：北面兩層高門廊（灰圓柱橘柱腳、二樓雨遮帶、招牌帶右至左「篤信電學大樓」）、屋頂橘紅欄杆、水塔、機房 =====
  const dx = find(D_IDS.dx);
  if (dx) {
    const B = dx.base ?? H(10, 198),
      P = dx.pts,
      top = B + dx.h,
      E = edge(P[0], P[1]); // 北面
    const sm = E.l * 0.6,
      hw = 6.4,
      dep = 2.6,
      yb = H(...E.atM(sm, dep)) - 0.1,
      fl = (dx.h - 0.6) / 4;
    const yT = B + 2 * fl + 2.0; // 門廊頂（到 3F 窗台）
    // 兩側混凝土門框牆、頂上招牌帶、二樓高度雨遮帶
    for (const s of [sm - hw, sm + hw - 0.7]) {
      k.obox('portalGrey', E, s, s + 0.7, 0, dep, yb, yT);
      ringColl(quadAt(E, s, s + 0.7, 0, dep), yb, yT);
    }
    k.obox('portalGrey', E, sm - hw, sm + hw, 0, dep, yT - 1.5, yT);
    k.obox('portalGrey', E, sm - hw + 0.7, sm + hw - 0.7, 0, 1.4, B + fl + 0.2, B + fl + 0.95);
    {
      const p = E.atM(sm, dep + 0.03);
      sign(
        group,
        hText('dDxSign', '樓大學電信篤', '#2c2e30', null, KAI, 1024, 150, true),
        hw * 1.6,
        1.05,
        p[0],
        yT - 0.75,
        p[1],
        E.nx,
        E.nz,
        0.02
      );
    }
    // 兩根灰圓柱（柱腳 1.2 m 漆橘紅）
    for (const s of [sm - hw * 0.42, sm + hw * 0.42]) {
      const c = E.atM(s, dep - 0.6),
        y0 = H(...c) - 0.1;
      k.cyl('concDark', c[0], c[1], 0.42, y0 + 1.2, yT - 1.5, 18);
      k.cyl('orange', c[0], c[1], 0.44, y0, y0 + 1.2, 18);
      ringColl(circle(c[0], c[1], 0.42, 8), y0, yT - 1.5);
    }
    // 門廊後面：一、二樓整片黑框玻璃（門上橘色橫條）
    {
      const a = E.atM(sm - hw + 0.7, 0.05),
        b = E.atM(sm + hw - 0.7, 0.05);
      k.wall('portalGlass', b[0], b[1], a[0], a[1], B - 0.1, B + 2 * fl, 4.0, 2 * fl + 0.1);
    }
    // 門前兩側矮牆（花崗石壓頂）
    for (const s of [sm - hw - 3.2, sm + hw]) {
      k.obox('concLight', E, s, s + 3.2, dep + 1.0, dep + 1.5, yb, yb + 0.75);
    }
    shapes.push({ name: 'duxinPortal', pts: quadAt(E, sm - hw, sm + hw, 0, dep), y0: yb, y1: yT });
    // 屋頂：橘紅欄杆一圈、3 個不鏽鋼圓水塔、2 個白色機房
    railRing('orangeRail', P, top + 0.6, 1.0, 0.2, 1.4);
    const F = frame(P[0], [P[1][0] - P[0][0], P[1][1] - P[0][1]]); // u 沿北面往東、v 往南（frame 的 v 朝南）
    for (const u of [20, 24, 28]) {
      const c = F.P(u, 5.5);
      tank(c[0], c[1], 1.1, top, 2.2);
    }
    for (const [u, w2] of [
      [9, 4],
      [44, 5],
    ]) {
      const c = F.P(u, 5.5),
        Q = [
          F.P(u - w2 / 2, 3.5),
          F.P(u + w2 / 2, 3.5),
          F.P(u + w2 / 2, 7.5),
          F.P(u - w2 / 2, 7.5),
        ];
      k.ringWalls('white', Q, top, top + 2.6, 3, 2.6);
      k.flat('offWhite', Q, top + 2.6);
      void c;
    }
  }

  // ===== 篤信↔電學連接量體：填滿兩棟之間約 8 m 的縫，比篤信屋頂略低；屋頂中段深色天窗帶、白色壓頂 =====
  if (dx && find(D_IDS.dxs)) {
    const P = dxLink(),
      B = dx.base ?? H(10, 198),
      y0 = Math.min(...P.map((p) => H(...p))) - 0.4,
      y1 = B + DX_LINK.h;
    k.ringWalls('dxLink', P, y0, y1, 2.8, 3.4);
    k.flat('concDark', P, y1);
    k.ringWalls('offWhite', P, y1, y1 + 0.5, 3, 0.5);
    const F = dxLinkF,
      sky = [F.P(7, 2.0), F.P(50, 2.0), F.P(50, 6.4), F.P(7, 6.4)];
    k.flat('darkGlass', sky, y1 + 0.2);
    k.ringWalls('offWhite', sky, y1, y1 + 0.2, 3, 0.2);
    ringColl(P, y0, y1);
    shapes.push({ name: 'duxinDianxueLink', pts: P, y0, y1: y1 + 0.5 });
  }

  // ===== 電學大樓：圓筒（咖啡色磁磚環＋白色圓形屋頂，5F）、長條屋頂天線與機房 =====
  const dxs = find(D_IDS.dxs);
  if (dxs) {
    // 圓筒照 2017-09 官方街景（良善北翼步道 pano _sDi0…往北看）：1～2F 咖啡色磁磚弧形實牆（一道直條窗、一扇小窗）；
    // 3F 內縮灰色混凝土帶窗；4F 外挑弧形陽台板＋實心欄牆；5F 帶窗；頂上內收的灰色圓頂、頂面白色（正射）
    const B = dxs.base ?? H(0, 230),
      [cx, cz] = DRUM_C,
      r = DXS.drum.r,
      yb = H(cx, cz) - 0.6,
      fl = 3.4;
    const y2 = B + 7.2,
      y3 = y2 + fl,
      y4 = y3 + fl,
      yt = B + DXS.drum.h;
    k.cyl('drumSolid', cx, cz, r, yb, y2, 40, true);
    k.cyl('drumRib', cx, cz, r - 0.4, y2, y3, 40, true);
    k.cyl('drumRib', cx, cz, r - 0.2, y3, y4, 40, true);
    k.cyl('drumRib', cx, cz, r - 0.2, y4, yt, 40, true);
    const ring = (m, r0, r1, y, down = false) => {
      const g = new THREE.RingGeometry(r0, r1, 40);
      g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
      g.translate(cx, y, cz);
      k.add(m, g);
    };
    k.cyl('concLight', cx, cz, r + 0.1, y2 - 0.1, y2 + 0.25, 40, true);
    ring('concLight', r - 0.4, r + 0.1, y2 + 0.25);
    k.cyl('concLight', cx, cz, r + 0.9, y3 - 0.05, y3 + 1.25, 40, true);
    k.cyl('concLight', cx, cz, r + 0.75, y3 + 0.3, y3 + 1.25, 40, true);
    ring('concLight', r - 0.2, r + 0.75, y3 + 0.3);
    ring('concLight', r - 0.2, r + 0.9, y3 - 0.05, true);
    ring('concLight', r + 0.75, r + 0.9, y3 + 1.25);
    k.cyl('concLight', cx, cz, r + 0.25, y4 - 0.1, y4 + 0.25, 40, true);
    ring('concLight', r - 0.2, r + 0.25, y4 + 0.25);
    {
      const g = new THREE.CylinderGeometry(r * 0.86, r + 0.05, 1.3, 40, 1, true);
      g.translate(cx, yt + 0.65, cz);
      k.add('concDark', g);
      const g2 = new THREE.CylinderGeometry(r * 0.62, r * 0.86, 0.9, 40, 1, true);
      g2.translate(cx, yt + 1.75, cz);
      k.add('concDark', g2);
      k.cyl('drumRoof', cx, cz, r * 0.62, yt + 2.15, yt + 2.25, 40);
    }
    {
      const l = Math.hypot(-0.29, 0.96),
        nx = -0.29 / l,
        nz = 0.96 / l,
        p = [cx + nx * (r + 0.03), cz + nz * (r + 0.03)];
      sign(
        group,
        textTex('dSlit', 32, 128, (g) => {
          g.fillStyle = '#b9b5ae';
          g.fillRect(0, 0, 32, 128);
          g.fillStyle = '#3a4146';
          g.fillRect(5, 5, 22, 118);
        }),
        0.7,
        3.6,
        p[0],
        B + 4.6,
        p[1],
        nx,
        nz,
        0.02
      );
      sign(
        group,
        textTex('dSmallWin', 64, 32, (g) => {
          g.fillStyle = '#b9b5ae';
          g.fillRect(0, 0, 64, 32);
          g.fillStyle = '#3a4146';
          g.fillRect(4, 4, 56, 24);
        }),
        1.3,
        0.7,
        p[0],
        B + 1.9,
        p[1],
        nx,
        nz,
        0.02
      );
    }
    ringColl(circle(cx, cz, r, 24), yb, yt);
    shapes.push({ name: 'dianxueDrum', pts: circle(cx, cz, r, 24), y0: yb, y1: yt + 2.25 });
    {
      const T = DXS_STAIR,
        P = [dxsP(T.u1, T.v0), dxsP(T.u0, T.v0), dxsP(T.u0, T.v1), dxsP(T.u1, T.v1)],
        y0 = Math.min(...P.map((p) => H(...p))) - 0.4,
        y1 = B + T.h;
      k.ringWalls('tileW', P.slice().reverse(), y0, y1, 2, 2);
      k.flat('concLight', P, y1);
      ringColl(P, y0, y1);
      shapes.push({ name: 'dianxueStairTower', pts: P, y0, y1 });
    }
    k.flat('concLight', dxsAtrium(), B + 0.08); // 天井底石板地坪
    // 長條屋頂：兩支天線、小機房
    const top = B + DXS.h;
    for (const [x, z, h] of [
      [12, 217, 7],
      [-8, 211, 5.5],
    ]) {
      k.box('steelDark', x - 0.08, x + 0.08, top, top + h, z - 0.08, z + 0.08);
      k.box('steelDark', x - 0.6, x + 0.6, top + h * 0.7, top + h * 0.7 + 0.08, z - 0.04, z + 0.04);
    }
  }

  // ===== 智信樓（中正樓）：北面拱形凹陽台＋金色「中正樓」、東段深色玻璃帷幕直條、屋頂圓筒水塔、西北角兩座冷卻水塔 =====
  const zx = find(D_IDS.zx);
  if (zx) {
    const B = zx.base ?? H(90, 175),
      top = B + zx.h,
      E = edge([77.3, 152.0], [113.0, 167.2]); // 北面
    const sm = E.l * 0.42,
      hw = 5.6,
      out = 1.4,
      fl = (zx.h - 0.6) / 4;
    const yA = B + fl * 1.0,
      yB = B + fl * 3.55;
    // 拱形凹陽台：兩側厚壁柱外凸、上方半圓拱樑（用多段方塊排成弧形）、凹口內深色窗帶與陽台欄板
    for (const s of [sm - hw - 1.4, sm + hw]) {
      k.obox('concLight', E, s, s + 1.4, 0, out, B - 0.1, top + 0.6);
      ringColl(quadAt(E, s, s + 1.4, 0, out), B - 0.1, top);
    }
    k.obox('concLight', E, sm - hw, sm + hw, 0, out, yB + 1.6, top + 0.6); // 拱上方實牆
    for (let i = 0; i < 10; i++) {
      // 拱圈：上緣兩角圓弧
      const a0 = (Math.PI * i) / 20,
        a1 = (Math.PI * (i + 1)) / 20,
        R = 1.6;
      for (const side of [-1, 1]) {
        const sA = side < 0 ? sm - hw + R - Math.cos(a0) * R : sm + hw - R + Math.cos(a0) * R,
          sB = side < 0 ? sm - hw + R - Math.cos(a1) * R : sm + hw - R + Math.cos(a1) * R;
        const yy = yB + Math.sin(a1) * R;
        k.obox(
          'concLight',
          E,
          Math.min(sA, sB) - 0.02,
          Math.max(sA, sB) + 0.02,
          0,
          out,
          yy,
          yB + 1.6 + 0.01
        );
      }
    }
    // 凹口內：兩條深色帶窗、中間欄板（金字所在）
    {
      const a = E.atM(sm - hw, 0.05),
        b = E.atM(sm + hw, 0.05);
      k.wall('darkGlass', b[0], b[1], a[0], a[1], yA + 0.9, yB + 1.5, 1.6, 2.2);
    }
    k.obox('concLight', E, sm - hw, sm + hw, 0, out * 0.9, B + fl * 2.0, B + fl * 2.0 + 1.6);
    k.obox('concLight', E, sm - hw, sm + hw, 0, out * 0.9, yA - 0.2, yA + 0.9);
    {
      const p = E.atM(sm, out * 0.9 + 0.03);
      sign(
        group,
        hText('dZxName', '樓正中', '#d9b45a', null, KAI, 1024, 220, true, 'rgba(0,0,0,0.3)'),
        7.2,
        1.6,
        p[0],
        B + fl * 2.0 + 0.8,
        p[1],
        E.nx,
        E.nz,
        0.3
      );
    }
    shapes.push({
      name: 'zhongzhengArch',
      pts: quadAt(E, sm - hw - 1.4, sm + hw + 1.4, 0, out),
      y0: B,
      y1: top,
    });
    // 拱口西側（從北面看在右邊）深色玻璃帷幕直條，1F 到頂（相片）
    {
      const s1 = sm - hw - 1.5,
        a = E.atM(s1 - 4.6, 0.12),
        b = E.atM(s1, 0.12);
      k.wall('darkGlass', b[0], b[1], a[0], a[1], B + 0.6, top - 0.8, 1.15, 1.7);
    }
    // 屋頂：白色圓筒水塔（頂上欄杆）、西北角兩座冷卻水塔
    {
      const c = [96.0, 177.0];
      tank(c[0], c[1], 2.0, top, 3.6, 'white');
      railRing('rail', circle(c[0], c[1], 2.0, 16), top + 3.6, 0.9, 0.05, 1.2);
    }
    for (const [x, z] of [
      [73.5, 162.5],
      [78.5, 164.6],
    ])
      cooler(x, z, 3.2, top);
    // 東面南北兩端室外樓梯（2017-09 官方街景 pano MYFs7SftofXfpu4ErPpH7Q）：沿牆一段直跑樓梯往兩端爬到二樓平台，
    // 外側斜的實心混凝土欄牆（不是欄杆），平台外角一根方柱撐著，門上方外凸雨遮盒。實心不能走上去（同陸華樓大階梯）
    {
      const E = ZX_E,
        { w, land } = ZX_ST,
        yTop = B + fl,
        pw = 0.16,
        ph = 1.0;
      for (const [sa, sb, dir] of zxStairSpans()) {
        const sEnd = dir > 0 ? sa : sb,
          sL = sEnd + dir * land,
          sBase = dir > 0 ? sb : sa; // 平台內緣、梯腳
        const yG = H(...E.atM(sBase, w / 2)) - 0.05,
          n = Math.max(8, Math.round((yTop - yG) / 0.17)),
          rz = (yTop - yG) / n,
          stp = (sBase - sL) / n;
        for (let i = 0; i < n; i++) {
          const s0 = sBase - i * stp,
            s1 = s0 - stp,
            y = yG + (i + 1) * rz;
          k.obox(
            'concLight',
            E,
            Math.min(s0, s1),
            Math.max(s0, s1),
            0,
            w - pw,
            Math.max(yG - 0.3, y - 0.5),
            y
          );
        }
        // 外側斜欄牆：下緣沿梯底、上緣高出踏階 1 m
        {
          const lo = Math.min(sBase, sL),
            hi = Math.max(sBase, sL),
            yAt = (s) => yG + ((yTop - yG) * (s - sBase)) / (sL - sBase);
          const P = (s, o, y) => {
            const q = E.atM(s, o);
            return [q[0], y, q[1]];
          };
          const ya = yAt(lo),
            yb = yAt(hi);
          for (const [o, out] of [
            [w, true],
            [w - pw, false],
          ]) {
            const a0 = P(lo, o, ya - 0.6),
              b0 = P(hi, o, yb - 0.6),
              a1 = P(lo, o, ya + ph),
              b1 = P(hi, o, yb + ph);
            if (out)
              k.quad('concLight', b0, a0, a1, b1, [
                [hi - lo, 0],
                [0, 0],
                [0, 1.6],
                [hi - lo, 1.6],
              ]);
            else
              k.quad('concLight', a0, b0, b1, a1, [
                [0, 0],
                [hi - lo, 0],
                [hi - lo, 1.6],
                [0, 1.6],
              ]);
          }
          k.quad(
            'concLight',
            P(lo, w - pw, ya + ph),
            P(hi, w - pw, yb + ph),
            P(hi, w, yb + ph),
            P(lo, w, ya + ph),
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ]
          );
          k.quad(
            'concLight',
            P(hi, w - pw, yb - 0.6),
            P(lo, w - pw, ya - 0.6),
            P(lo, w, ya - 0.6),
            P(hi, w, yb - 0.6),
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ]
          ); // 梯底
        }
        // 平台＋外緣與端頭欄牆、外角方柱、門、雨遮盒
        const l0 = Math.min(sEnd, sL),
          l1 = Math.max(sEnd, sL);
        k.obox('concLight', E, l0, l1, 0, w, yTop - 0.35, yTop);
        k.obox('concLight', E, l0, l1, w - pw, w, yTop, yTop + ph);
        {
          const e0 = dir > 0 ? l0 : l1 - pw;
          k.obox('concLight', E, e0, e0 + pw, 0, w, yTop, yTop + ph);
        }
        {
          const c0 = dir > 0 ? l0 : l1 - 0.4,
            yc = H(...E.atM(c0 + 0.2, w - 0.2)) - 0.2;
          k.obox('concLight', E, c0, c0 + 0.4, w - 0.4, w, yc, yTop - 0.35);
        }
        {
          const dm = (l0 + l1) / 2,
            a = E.atM(dm - 0.5, 0.65),
            b = E.atM(dm + 0.5, 0.65);
          k.wall('dark', b[0], b[1], a[0], a[1], yTop, yTop + 2.2, 1, 1);
        }
        k.obox('concLight', E, l0, l1, 0, w + 0.1, yTop + 2.6, yTop + 3.3);
        const C = quadAt(E, Math.min(sa, sb), Math.max(sa, sb), 0, w + 0.05);
        ringColl(C, yG - 0.3, yTop + ph);
        shapes.push({
          name: dir > 0 ? 'zhongzhengStairN' : 'zhongzhengStairS',
          pts: C,
          y0: yG,
          y1: yTop + 3.3,
        });
      }
    }
  }

  // ===== 莊敬大樓：北面入口白磁磚雨遮「莊敬大樓」、左側斜頂樓梯間牆板＋4 個圓形舷窗 =====
  const zj = find(D_IDS.zj);
  if (zj) {
    const B = zj.base ?? H(170, 185),
      E = edge([138.4, 159.2], [192.8, 183.9]); // 北面（往東南）
    const sm = E.l * 0.5,
      cw = 5.2,
      cd = 2.2,
      fl = (ZJ.hMain - 0.6) / 4,
      yc = B + fl * 0.72;
    k.obox('tileW', E, sm - cw, sm + cw, 0, cd, yc, yc + 0.85); // 雨遮板（白色小方磁磚，上緣在 2F 窗台下）
    k.obox('concLight', E, sm - cw, sm + cw, 0, cd, yc - 0.12, yc);
    {
      const p = E.atM(sm, cd + 0.03);
      sign(
        group,
        hText('dZjName', '莊敬大樓', '#3a3c3e', null, SANS, 1024, 160, true),
        6.2,
        0.7,
        p[0],
        yc + 0.43,
        p[1],
        E.nx,
        E.nz,
        0.02
      );
    }
    {
      const a = E.atM(sm - cw + 0.6, 0.05),
        b = E.atM(sm + cw - 0.6, 0.05);
      k.wall('portalGlass', b[0], b[1], a[0], a[1], B - 0.1, yc - 0.12, 3.4, yc - B);
    }
    // 入口左側（面向大樓時，東南側）斜頂樓梯間牆板：外凸 0.9 m，頂端斜切（外側高），4 個圓形舷窗由上往下
    const s0 = sm + cw + 0.2,
      s1 = sm + cw + 4.6,
      hL = B + ZJ.hMain + 0.6,
      hR = B + ZJ.hMain + 3.2,
      o = 0.9;
    {
      const a = E.atM(s0, o),
        b = E.atM(s1, o),
        a0 = E.atM(s0, 0),
        b0 = E.atM(s1, 0),
        yb = B - 0.2;
      k.quad(
        'tileW',
        [b[0], yb, b[1]],
        [a[0], yb, a[1]],
        [a[0], hL, a[1]],
        [b[0], hR, b[1]],
        [
          [0, 0],
          [(s1 - s0) / 2, 0],
          [(s1 - s0) / 2, (hL - yb) / 2],
          [0, (hR - yb) / 2],
        ]
      );
      k.quad(
        'tileW',
        [a[0], yb, a[1]],
        [a0[0], yb, a0[1]],
        [a0[0], hL, a0[1]],
        [a[0], hL, a[1]],
        [
          [0, 0],
          [0.45, 0],
          [0.45, (hL - yb) / 2],
          [0, (hL - yb) / 2],
        ]
      );
      k.quad(
        'tileW',
        [b0[0], yb, b0[1]],
        [b[0], yb, b[1]],
        [b[0], hR, b[1]],
        [b0[0], hR, b0[1]],
        [
          [0, 0],
          [0.45, 0],
          [0.45, (hR - yb) / 2],
          [0, (hR - yb) / 2],
        ]
      );
      k.quad(
        'concLight',
        [a0[0], hL, a0[1]],
        [a[0], hL, a[1]],
        [b[0], hR, b[1]],
        [b0[0], hR, b0[1]]
      );
      ringColl([a0, b0, b, a], yb, hL);
      for (let i = 0; i < 4; i++) {
        const p = E.atM((s0 + s1) / 2 + 0.25 - i * 0.15, o + 0.02),
          y = B + 1.8 + i * fl;
        const g = new THREE.CircleGeometry(1.15, 24);
        g.rotateY(Math.atan2(E.nx, E.nz));
        g.translate(p[0], y, p[1]);
        k.add('porthole', g);
        const rg = new THREE.RingGeometry(1.15, 1.32, 24);
        rg.rotateY(Math.atan2(E.nx, E.nz));
        rg.translate(p[0] + E.nx * 0.01, y, p[1] + E.nz * 0.01);
        k.add('concLight', rg);
      }
      shapes.push({ name: 'zhuangjingStairPanel', pts: [a0, b0, b, a], y0: yb, y1: hR });
    }
    // 入口前方柱路燈（柱頭外擴燈座）：兩支
    for (const s of [sm - cw - 1.5, sm + cw + 1.5]) {
      const c = E.atM(s, cd + 0.9),
        y0 = H(...c) - 0.1;
      k.box('concLight', c[0] - 0.18, c[0] + 0.18, y0, y0 + 3.6, c[1] - 0.18, c[1] + 0.18);
      k.cyl('concLight', c[0], c[1], 0.7, y0 + 3.6, y0 + 3.85, 4);
      ringColl(circle(c[0], c[1], 0.2, 4, Math.PI / 4), y0, y0 + 3.6);
    }
  }

  // ===== 土木館：南面圓筒樓梯塔＋花崗石壁柱金色直書「土木工程館」＋門框、北面頂層「中原大學土木工程館」、西北塔紅色直書、屋頂冷卻水塔 =====
  const tm = find(D_IDS.tm);
  if (tm) {
    const B = tm.base ?? H(230, 170),
      top = B + tm.h,
      P = tm.pts;
    const S = edge(P[5], P[6]); // 南面 (254.2,184.1)→(215.2,170.7)，外法線朝南
    // 圓筒樓梯塔：中心在南緣上（正射約 (233,177)），半徑 3.4 m，比主體高一層
    const st = S.atM(S.l * 0.52, 1.0),
      r = 3.4,
      yb = H(...st) - 0.5,
      yt = top + 1.8;
    k.cyl('tmDrum', st[0], st[1], r, yb, yt, 32, true);
    k.cyl('concLight', st[0], st[1], r + 0.1, yt, yt + 0.5, 32);
    for (let i = 1; i < 7; i++) {
      const y = B + (i * (tm.h - 0.6)) / 7 - 0.15;
      k.cyl('concLight', st[0], st[1], r + 0.25, y, y + 0.18, 32, true);
    } // 弧形陽台板
    ringColl(circle(st[0], st[1], r + 0.2, 16), yb, yt);
    shapes.push({ name: 'tumuStairDrum', pts: circle(st[0], st[1], r, 16), y0: yb, y1: yt });
    // 入口（樓梯塔東側）：獨立混凝土門框＋黑鐵門、右側花崗石壁柱（上淺下深）金色直書
    const s0 = S.l * 0.52 - r - 6.5,
      s1 = S.l * 0.52 - r - 1.0; // 沿 S 從東往西量，樓梯塔東邊
    const yg = H(...S.atM((s0 + s1) / 2, 2.5)) - 0.1;
    k.obox('concLight', S, s0 + 0.8, s0 + 1.3, 0.2, 2.6, yg, yg + 4.2);
    k.obox('concLight', S, s1 - 1.3, s1 - 0.8, 0.2, 2.6, yg, yg + 4.2);
    k.obox('concLight', S, s0 + 0.8, s1 - 0.8, 0.2, 2.6, yg + 4.2, yg + 4.8);
    {
      const a = S.atM(s0 + 1.3, 0.06),
        b = S.atM(s1 - 1.3, 0.06);
      k.wall('dark', b[0], b[1], a[0], a[1], yg, yg + 3.0, 1, 1);
    }
    for (const s of [s0 + 0.8, s1 - 1.3]) ringColl(quadAt(S, s, s + 0.5, 0.2, 2.6), yg, yg + 4.8);
    // 錯開的懸挑方盒（3F、5F 高度）
    k.obox('white', S, s0 + 0.2, s1 - 0.2, 0, 1.6, B + 2 * 3.34, B + 3 * 3.34 - 0.4);
    k.obox('white', S, s0 + 1.0, s1 + 0.4, 0, 1.2, B + 4 * 3.34, B + 5 * 3.34 - 0.4);
    // 壁柱：門框東邊，上半淺灰花崗石、下半深灰
    {
      const pa = s0 - 2.6,
        pb = s0 - 0.2;
      k.obox('granite', S, pa, pb, 0, 0.9, yg, B + 3.2);
      k.obox('graniteL', S, pa, pb, 0, 0.9, B + 3.2, top - 1.0);
      ringColl(quadAt(S, pa, pb, 0, 0.9), yg, B + 3.2);
      const p = S.atM((pa + pb) / 2, 0.93);
      sign(
        group,
        vText('dTmV', '土木工程館', '#d9b45a', SERIF),
        1.25,
        6.6,
        p[0],
        B + 13.5,
        p[1],
        S.nx,
        S.nz,
        0.3
      );
    }
    // 門前寬台階（三階）
    for (let i = 0; i < 3; i++)
      k.obox(
        'graniteL',
        S,
        s0 - 0.4,
        s1 + 0.2,
        2.6 + i * 0.45,
        2.6 + (i + 1) * 0.45,
        yg - 0.5,
        yg - i * 0.15
      );
    shapes.push({ name: 'tumuEntrance', pts: quadAt(S, s0 - 2.6, s1, 0, 4.0), y0: yg, y1: B + 16 });
    // 北面頂層：金黃字「中原大學土木工程館」＋校徽（北面 P[13]→P[0]：(210.9,150)→(258.2,165.1)）
    const N = edge(P[13], P[0]);
    {
      const p = N.atM(N.l * 0.55, 0.08);
      sign(
        group,
        hText(
          'dTmN',
          '中原大學土木工程館',
          '#e0b84a',
          null,
          SERIF,
          1536,
          160,
          true,
          'rgba(0,0,0,0.3)'
        ),
        14.5,
        1.5,
        p[0],
        top - 1.3,
        p[1],
        N.nx,
        N.nz,
        0.25
      );
      const q = N.atM(N.l * 0.55 - 8.4, 0.08);
      sign(group, sealTex(), 1.5, 1.5, q[0], top - 1.3, q[1], N.nx, N.nz, 0.2);
    }
    // 西北塔側牆（西面 P[8]→P[9]：(201.2,177.2)→(205.2,166.6)）：紅色直書「土木工程學系」＋藍色直條
    const W = edge(P[8], P[9]);
    {
      const p = W.atM(W.l * 0.55, 0.08);
      sign(
        group,
        vText('dTmRed', '土木工程學系', '#b8352c', SERIF, 160, 1024, 'rgba(0,0,0,0.15)'),
        1.3,
        8.4,
        p[0],
        B + 12.5,
        p[1],
        W.nx,
        W.nz,
        0.12
      );
      const q = W.atM(W.l * 0.3, 0.06);
      k.slab(
        'blue',
        q[0] - W.tx * 0.3,
        q[1] - W.tz * 0.3,
        q[0] + W.tx * 0.3,
        q[1] + W.tz * 0.3,
        0.06,
        B + 4,
        top - 1
      );
    }
    // 屋頂：冷卻水塔兩座、小機房
    for (const [x, z] of [
      [246.0, 168.0],
      [250.5, 169.6],
    ])
      cooler(x, z, 3.0, top);
    {
      const Q = [
        [225, 162],
        [231, 164],
        [229.5, 168.5],
        [223.5, 166.5],
      ];
      k.ringWalls('white', Q, top, top + 2.8, 3, 2.8);
      k.flat('offWhite', Q, top + 2.8);
    }
  }

  k.finish(group);
  scene.add(group);
  I.zoneD = { group, shapes };
  return group;
}
