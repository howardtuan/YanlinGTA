// C 區「商管」校內建築外觀（都不能進去，只做外觀；資管系館本身在 src/world/Interiors.js 自建，這裡只補外觀構件）。
// 做法同 src/world/zones/ZoneA.js：src/world/MapBuilder.js 照舊蓋牆，zoneCLook() 在 src/core/Game.js 蓋樓前換 look／分段量體（parts），
// buildZoneC() 自建輪廓表達不了的構件（src/world/zones/Zones.js 依序呼叫）。
//
// 依據（campus-survey/PLAN.md 第 1 節 C 區、批次 2，zone-C.md 與補充調查、正射 NLSC 2024）：
//  - 管理大樓 w392023399：5 層灰米色洗石子、每層淺膚色樓板帶；西南面正中偏西是兩層高的穿堂入口（4 根方柱、
//    紅底金字「商學院」匾（右至左）、二樓過道酒紅欄牆「College of Business」），穿堂走得過去，通到東北側夾在兩座
//    樓梯間之間的紅磚中庭，正對自強的斜柱穿堂，右側藍色大圖半圓筒
//    （2025-10 相片；2017 是紅磁磚）、AACSB 藍色橫布條；一樓方柱柱廊；5F 是開放框架層（方框＋斜撐），
//    頂上花崗石女兒牆一排小菱形孔；屋頂兩段紅瓦斜屋頂夾一段深灰平頂（正射）。東北面對自強的 3～4 m 窄巷
//    是整面深灰素混凝土、只有高處窄條窗（官方街景）。輪廓、名稱不動（src/systems/MissionSystem.js 任務四的檢查點用它的中心）。
//  - 自強商學大樓 w392023401：正射是ㄇ／口字形，中庭滿是大樹；西南翼、東北翼、東南翼 4F，西北端是低一層的連接段
//    加紅磚屋頂露台；紅瓦斜屋頂在東南翼北段（正射紅瓦條帶的位置，PLAN 寫的「東北翼」就是這一段）；外牆深灰洗石子、
//    每層窗上一條白色小方磚帶、女兒牆菱形孔（與管理大樓同一套）；西北面一二樓橫向百葉；入口在東南面中段，淺台階
//    兩側坡道、暗色門（官方街景，面向停車場）；屋頂白色防水層（正射）。輪廓不改（中庭用 parts 留空）。
//    斜柱穿堂（2024-04 相片：四根下寬上窄的洗石子大柱、紅底金字「自強商學大樓」匾、橘紅磚地、穿過去看得到中庭）
//    在西南翼、正對管理大樓穿堂：相片地上的橘紅磚格就是正射上兩棟之間那塊紅磚格鋪面，兩側是管理大樓接過來的兩座
//    樓梯間。穿堂與中庭走得進去：植栽種完後才把 src/world/MapBuilder.js 加的整棟碰撞縮掉（collapse），共用亂數不變。
//    西北端不是開口：官方街景那面是一二樓橫向百葉的實牆，維持兩層高的連接段＋屋頂紅磚露台（正射）。
//  - 資訊管理學系 w252996584：自建館照 2020～2022 相片補：欄板灰洗石子＋白灰菱形嵌片（src/world/Kit.js T.diamond）、
//    欄板上下兩條酒紅邊線、東端樓梯塔旁深灰直條百葉、門前礫石庭園加大石頭。
//  - 商業設計館 w392023403（OSM 名「商設館」）：正射量到實際屋頂比 OSM 往南 4～6 m、往西 4 m，約 27.4×18.8 m，
//    西側一座高一層的白色樓梯間（正射上南緣那條較暗的帶子當成 4F 的一部分，南面 1～4 樓都有窗）。灰色洗石子；南面（入口面）直鰭＋鰭間 2～4 樓窗下板
//    橘、朱紅、黃大色塊，一二樓灰褐粗洗石子，橘色雨遮、鋁框玻璃雙開門、木平台、橘色「商業設計學系」牌；東面素牆
//    （兩根白色落水管），北、西面依東面推。名稱改「商業設計館」（src/world/MapBuilder.js STYLE_BY_NAME 同為 white）。
//  - 工學館 w328790267：正射是口字形加缺口：東北 8F 長樓與東翼（L 形）、中間約 20×30 m 中庭、西側 4F 低樓
//    （紅磁磚屋頂露台、桌椅；2017-09 使用者全景：灰褐小口磚、西南角是半徑約 8 m 的圓弧轉角、每層橫向帶窗，
//    屋頂一圈深色鋼構棚架沿西面、繞過圓弧往外挑，正射上那條方格帶就是它）、南側 3F 方格玻璃帷幕低樓；外牆灰色小口磚（#8c8680）零星嵌暗紅小方磚，
//    頂層淺藍板＋東北角藍色圓形校徽、東北面轉角實牆上金色直書「中原大學工學院」、東面一層層錯開懸挑的混凝土盒狀樓梯平台（2018～2025
//    相片、2025-05 官方街景）；南面入口：細高樓梯塔（垂直藍玻璃帶、比主樓高一層）、塔右側主牆直書「化學工程學系」（墨綠）
//    「生物醫學工程學系」（藍）「機械工程學系」（橘紅）、金屬雨遮「工 學 館 Engineering Building」。輪廓不改
//    （整棟碰撞縮掉、只留分段擋人，西南圓弧外那一角走得過去）。
//
// 共用亂數：五棟都維持 kind campus；管理、自強、工學、資管的輪廓 pts 不動，商業設計館換輪廓但 b.acPts 留住原輪廓，
// 分段的建物都設 splitAc，src/world/MapBuilder.js 屋頂冷氣的 rnd2 抽取次數因此不變（落在中庭的冷氣只是不畫）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H, groundY } from '../Terrain.js';
import { canvasTexture } from '../../graphics/GpuMemLifecycle.js';

export const C_IDS = {
  mg: 'w392023399',
  zq: 'w392023401',
  im: 'w252996584',
  ss: 'w392023403',
  gx: 'w328790267',
};
export const SS_NAME = '商業設計館';

// ---------------- 座標框架 ----------------
const unit = (a, b) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    l = Math.hypot(dx, dz);
  return [dx / l, dz / l];
};
const affine = (O, U, V) => (u, v) => [
  +(O[0] + U[0] * u + V[0] * v).toFixed(2),
  +(O[1] + U[1] * u + V[1] * v).toFixed(2),
];
const area2 = (P) => {
  let s = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[i],
      c = P[(i + 1) % P.length];
    s += a[0] * c[1] - c[0] * a[1];
  }
  return s;
};
// 跟 OSM 輪廓同一個繞向（src/world/MapBuilder.js 的牆法線靠繞向決定朝外）
const like = (P, ref) => (Math.sign(area2(P)) === Math.sign(area2(ref)) ? P : P.slice().reverse());

// 管理大樓：u 沿西南面由西北往東南，v 往東北（窄巷那側）
const MG_O = [80.8, 57.3],
  MG_U = unit(MG_O, [120.8, 91.2]),
  MG_V = [MG_U[1], -MG_U[0]];
const mgW = affine(MG_O, MG_U, MG_V);
const MG = {
  L: 52.4,
  ent: [11, 21],
  vN: 15.66,
  drum: 24.6,
  red: [
    [0.6, 33],
    [43, 57.5],
  ],
  rv: [4.5, 15.4],
}; // ent：穿堂；vN：東北牆面
// 自強：仿射框架，u 沿西南面（A→D），v 沿西北面（A→B）；A(0,0) D(48.26,0) B(0,51.66) C(48.7,51.6)
const ZQ_A = [93, 40.4];
const zqW = affine(ZQ_A, unit(ZQ_A, [130.4, 70.9]), unit(ZQ_A, [127.1, 1.6]));
const ZQ = {
  court: [10, 35, 14.5, 40],
  link: 10,
  red: [35.3, 48.5, 26, 51.5],
  door: 25.3,
  pass: [12, 23],
}; // pass：正對管理大樓穿堂的斜柱穿堂（西南翼）
// 工學館：u 沿東北面，v 往內（西南）
const GX_O = [181, 37.6],
  GX_U = unit(GX_O, [218.8, 68.8]);
const gxW = affine(GX_O, GX_U, [-GX_U[1], GX_U[0]]);
const GX_PARTS = {
  L: [
    [0, 0],
    [49, 0],
    [71, 49],
    [56.5, 54.8],
    [53.6, 49.4],
    [50.0, 50.8],
    [48, 47],
    [36, 22],
    [0.62, 22],
    [-1.9, 16.6],
  ],
  // 西南角是半徑約 8 m 的圓弧（2017-09 使用者全景、正射棚架外緣弧），見 GX_ARC
  W: null,
  S: [
    [31, 50],
    [48, 47],
    [50.0, 50.8],
    [28, 59.4],
  ],
};
// 西側低樓西南角的圓弧（u,v）：西面 (0.62,22)→(19.6,62.7) 與南面 (19.6,62.7)→(28,59.4) 的轉角倒成半徑 R 的圓弧，
// 圓心 c、起訖切點 t1（西面上）、t2（南面上）；pts 由 t1 沿弧到 t2（不含端點，n 段）
const GX_ARC = (() => {
  const A = [0.62, 22],
    P = [19.6, 62.7],
    Bp = [28, 59.4],
    R = 8,
    n = 10;
  const u1 = unit(A, P),
    u2 = unit(P, Bp),
    half = Math.acos(-(u1[0] * u2[0] + u1[1] * u2[1])) / 2, // 內角的一半
    t = R / Math.tan(half),
    t1 = [P[0] - u1[0] * t, P[1] - u1[1] * t],
    t2 = [P[0] + u2[0] * t, P[1] + u2[1] * t],
    bis = unit([0, 0], [-u1[0] + u2[0], -u1[1] + u2[1]]),
    cl = R / Math.sin(half),
    c = [P[0] + bis[0] * cl, P[1] + bis[1] * cl];
  const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
  let a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
  // 走短的那一邊（約 86°）
  while (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
  while (a2 - a1 < -Math.PI) a2 += 2 * Math.PI;
  const at = (a, r = R) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(at(a1 + ((a2 - a1) * i) / n).map((x) => +x.toFixed(2)));
  return { R, c, t1, t2, a1, a2, at, pts };
})();
GX_PARTS.W = [[0.62, 22], [14, 22], [31, 50], [28, 59.4], ...GX_ARC.pts.slice().reverse()];
// 商業設計館：u 沿北面由西往東，v 往南
const SS_O = [133.3, 117.5],
  SS_U = unit(SS_O, [159.6, 125.3]);
const ssW = affine(SS_O, SS_U, [-SS_U[1], SS_U[0]]);
const SS = { L: 27.4, D: 18.8, box: [6.2, 11.8], boxOut: 2.4 };
const SS_PTS = [
  [0, 0],
  [SS.L, 0],
  [SS.L, SS.D],
  [0, SS.D],
  [0, SS.box[1]],
  [-SS.boxOut, SS.box[1]],
  [-SS.boxOut, SS.box[0]],
  [0, SS.box[0]],
];
// 資管系館（src/world/Interiors.js IM_SPEC 的同一組數字；不 import 避免循環載入）
const IM = { ox: 79.9, oz: 92.6, ang: Math.atan2(16.9, 49.3), L: 46, D: 12.5, FH: 3.8, NF: 3 };

// 穿堂口與兩棟之間的紅磚中庭：牆邊灌木種完後才藏（src/world/MapBuilder.js opts.vegHide，不重抽）
export const zoneCVegHide = () => [
  [
    mgW(MG.ent[0] - 1.5, -3.5),
    mgW(MG.ent[1] + 1.5, -3.5),
    mgW(MG.ent[1] + 1.5, 0.5),
    mgW(MG.ent[0] - 1.5, 0.5),
  ],
  [mgW(5.5, MG.vN - 0.5), mgW(35.5, MG.vN - 0.5), mgW(35.5, 21.5), mgW(5.5, 21.5)],
];

// ---------------- 外觀 look（src/core/Game.js 在 src/world/MapBuilder.js 蓋樓前套用） ----------------
const GX_BASE = {
  wall: { base: 'tile', colour: '#8c8680' },
  windows: { type: 'punched', bay: 3.0, accent: '#5a5550', glass: '#4a5560' },
  roof: { colour: '#7d7b77' },
  parapet: { h: 0.8, colour: '#857f79' },
};
export function zoneCLook(b) {
  if (b.id === C_IDS.mg) {
    const base = {
      wall: { base: 'stone', colour: '#a9a49c' },
      windows: {
        type: 'punched',
        bay: 3.6,
        accent: '#e2ddd2',
        glass: '#6f8a8c',
        types: ['punched', 'punched', 'punched', 'punched', 'gallery'],
      },
      bands: [{ colour: '#e2c4a8', h: 0.32, depth: 0.12, from: 1, to: 4 }],
      // 東北面（對自強的紅磚中庭）：整面深灰素混凝土，只有高處窄條窗（官方街景）；兩端山牆與穿堂兩側是素牆
      faces: [
        { on: 'ne', colour: '#77736d', windows: { type: 'slit', types: null, accent: '#6a6762' } },
        { on: ['nw', 'se'], windows: { type: 'none', types: null } },
      ],
      parapet: { h: 0.9, colour: '#a8a196' },
      roof: { colour: '#5e5d5a', ac: false }, // 兩段紅瓦斜屋頂由 buildZoneC 蓋
    };
    // 穿堂（u 11～21）切成一塊「只畫屋頂」的量體：一二樓挑空走得過去，三樓以上的牆由 buildZoneC 蓋
    const [e0, e1] = MG.ent,
      vN = MG.vN,
      O = b.pts,
      cut = (u) => [mgW(u, vN), mgW(u, 0)];
    const [w1, w0] = cut(e0),
      [x1, x0] = cut(e1);
    b.parts = [
      {
        pts: like([O[0], O[1], O[2], O[3], O[4], w1, w0, O[13]], O),
        h: b.h,
        floors: b.floors,
        label: '西北段',
      },
      {
        pts: like([w1, x1, x0, w0], O),
        h: b.h,
        floors: b.floors,
        label: '穿堂上方',
        look: { open: { bare: true } },
      },
      {
        pts: like([x1, O[5], O[6], O[7], O[8], O[9], O[10], O[11], O[12], x0], O),
        h: b.h,
        floors: b.floors,
        label: '東南段',
      },
    ];
    b.splitAc = 1;
    b.look = base;
  } else if (b.id === C_IDS.zq) {
    const P = (Q) =>
      like(
        Q.map(([u, v]) => zqW(u, v)),
        b.pts
      );
    const c = ZQ.court;
    b.parts = [
      {
        pts: P([
          [0, 0],
          [0, c[2]],
          [ZQ.pass[0], c[2]],
          [ZQ.pass[0], 0],
        ]),
        h: 13.8,
        floors: 4,
        label: '西南翼西段',
      },
      {
        pts: P([
          [ZQ.pass[0], 0],
          [ZQ.pass[0], c[2]],
          [ZQ.pass[1], c[2]],
          [ZQ.pass[1], 0],
        ]),
        h: 13.8,
        floors: 4,
        label: '斜柱穿堂上方',
        look: { open: { bare: true } },
      },
      {
        pts: P([
          [ZQ.pass[1], 0],
          [ZQ.pass[1], c[2]],
          [48.38, c[2]],
          [48.26, 0],
        ]),
        h: 13.8,
        floors: 4,
        label: '西南翼東段',
      },
      {
        pts: P([
          [0, c[2]],
          [0, c[3]],
          [ZQ.link, c[3]],
          [ZQ.link, c[2]],
        ]),
        h: 7.2,
        floors: 2,
        label: '西北連接段',
      },
      {
        pts: P([
          [0, c[3]],
          [0, 51.66],
          [c[1], 51.62],
          [c[1], c[3]],
        ]),
        h: 13.8,
        floors: 4,
        label: '東北翼',
      },
      {
        pts: P([
          [c[1], c[2]],
          [c[1], 51.62],
          [48.7, 51.6],
          [48.38, c[2]],
        ]),
        h: 13.8,
        floors: 4,
        label: '東南翼',
      },
    ];
    b.splitAc = 1;
    b.look = {
      wall: { base: 'stone', colour: '#7b7772' },
      windows: { type: 'punched', bay: 2.5, accent: '#d9d6cf', glass: '#4f5a62' },
      bands: [{ colour: '#dfba90', h: 0.3, depth: 0.08, at: 0.8, from: 0, to: 3 }], // 窗上米膚色磁磚帶（2024-04 相片）
      faces: [
        { on: 'nw', windows: { types: ['louver', 'louver', 'punched', 'punched'] } }, // 西牆一二樓橫向百葉
        { on: 'se', colour: '#8a8076', windows: { type: 'ribbon' } }, // 東南面灰褐帶狀立面、橫向帶窗
      ],
      parapet: { h: 0.9, colour: '#9a958d' },
      roof: { colour: '#efede8' }, // 白色防水層（正射）
    };
  } else if (b.id === C_IDS.ss) {
    b.acPts = b.pts; // 屋頂冷氣照原輪廓抽亂數
    b.name = SS_NAME;
    const P = (Q) =>
      like(
        Q.map(([u, v]) => ssW(u, v)),
        b.pts
      );
    b.pts = P(SS_PTS);
    b.parts = [
      {
        pts: P([
          [0, 0],
          [SS.L, 0],
          [SS.L, SS.D],
          [0, SS.D],
        ]),
        h: 13.8,
        floors: 4,
        label: '主體',
      },
      {
        pts: P([
          [-SS.boxOut, SS.box[0]],
          [0, SS.box[0]],
          [0, SS.box[1]],
          [-SS.boxOut, SS.box[1]],
        ]),
        h: 17.1,
        floors: 5,
        label: '西側樓梯間',
        look: {
          wall: { base: 'smooth', colour: '#e6e4de' },
          windows: { type: 'slit', bay: 2.4, accent: '#d8d6d0', glass: '#4d5a63' },
          parapet: { h: 0.6, colour: '#e6e4de' },
        },
      },
    ];
    b.splitAc = 1;
    b.look = {
      wall: { base: 'stone', colour: '#9c9a95' },
      plinth: { floors: 2, colour: '#857b70' }, // 一二樓灰褐粗洗石子
      windows: { type: 'punched', bay: 3.0, accent: '#e8e6e0', glass: '#5a6872' },
      fins: [{ on: 's', spacing: 3, depth: 0.45, t: 0.3, colour: '#a3a19b', from: 1, ends: true }],
      canopy: [
        { on: 's', at: 0.45, w: 4.5, d: 1.2, h: 3.4, colour: '#e8902e', t: 0.5, posts: false },
      ],
      parapet: { h: 0.7, colour: '#9a9893' },
      roof: { colour: '#6f6a63' },
    };
  } else if (b.id === C_IDS.gx) {
    const P = (Q) =>
      like(
        Q.map(([u, v]) => gxW(u, v)),
        b.pts
      );
    b.parts = [
      {
        pts: P(GX_PARTS.L),
        h: 27,
        floors: 8,
        label: '東北 8F',
        look: {
          ...GX_BASE,
          topFloor: { floors: 1, colour: '#a9c3df', windows: 'slit', glass: '#6f8fb0' },
        },
      },
      {
        pts: P(GX_PARTS.W),
        h: 13.8,
        floors: 4,
        label: '西側低樓',
        // 2017-09 使用者全景（西南角旁停車道）：和主樓同一種灰褐小口磚；西面上層是一組組細長直窗、
        // 西南圓弧面一樓一排橫向帶窗，二～四樓各一條細細的深色窗帶（buildZoneC 自己貼）
        look: {
          ...GX_BASE,
          windows: { ...GX_BASE.windows, types: ['pair', 'slit', 'slit', 'slit'] },
          faces: [{ on: 'sw', windows: { type: 'none', ground: 'ribbon', bay: 1.6, types: null } }],
        },
      },
      {
        pts: P(GX_PARTS.S),
        h: 10.5,
        floors: 3,
        label: '南側玻璃低樓',
        look: {
          ...GX_BASE,
          wall: { base: 'smooth', colour: '#c8c6c0' },
          faces: [
            {
              on: ['s', 'sw', 'se'],
              windows: { type: 'grid', glass: '#5d7d95', accent: '#d6d8d8' },
            },
          ],
        },
      },
    ];
    b.splitAc = 1;
    b.look = GX_BASE;
  }
}

// ---------------- 貼圖 ----------------
const TEX = {};
// canvas from src/graphics/GpuMemLifecycle.js (stored at the phone texture scale); this file keeps its own keys
function ctex(key, w, h, draw, repeat = true) {
  return TEX[key] || (TEX[key] = canvasTexture(w, h, draw, repeat));
}
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const noise = (g, W, H, base, n, seed, a = 0.06, sz = 6) => {
  const r = lcg(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * a})`;
    g.fillRect(r() * W, r() * H, 1 + r() * sz, 1 + r() * sz);
  }
};
// 花崗石女兒牆：一格 1.8 m × 1.8 m，中間一個深色小菱形孔（管理大樓、自強）
const diamondTex = (base = '#a8a196') =>
  ctex(`cDiamond${base}`, 128, 128, (g, W, H) => {
    noise(g, W, H, base, 1500, 5, 0.16, 2);
    g.fillStyle = 'rgba(70,64,58,0.25)';
    g.fillRect(0, H - 3, W, 3);
    g.fillStyle = '#2b2a28';
    g.beginPath();
    g.moveTo(W / 2, H * 0.36);
    g.lineTo(W / 2 + 10, H * 0.5);
    g.lineTo(W / 2, H * 0.64);
    g.lineTo(W / 2 - 10, H * 0.5);
    g.closePath();
    g.fill();
  });
const graniteTex = () =>
  ctex('cGranite', 128, 128, (g, W, H) => {
    noise(g, W, H, '#a49e95', 1800, 9, 0.18, 2);
  });
const tileRoofTex = () =>
  ctex('cTileRoof', 128, 128, (g, W, H) => {
    noise(g, W, H, '#9c4634', 500, 13, 0.08, 4);
    for (let x = 0; x < W; x += 8) {
      g.fillStyle = 'rgba(60,20,12,0.28)';
      g.fillRect(x, 0, 2, H);
      g.fillStyle = 'rgba(255,200,170,0.12)';
      g.fillRect(x + 3, 0, 2, H);
    }
    g.fillStyle = 'rgba(50,18,10,0.3)';
    for (let y = 0; y < H; y += 16) g.fillRect(0, y, W, 2);
  });
const brickPaveTex = () =>
  ctex('cBrickPave', 128, 128, (g, W, H) => {
    noise(g, W, H, '#b4553c', 600, 17, 0.1, 4);
    g.fillStyle = 'rgba(220,210,200,0.7)';
    for (let i = 0; i <= W; i += W / 4) {
      g.fillRect(i, 0, 2, H);
      g.fillRect(0, i, W, 2);
    }
  });
const gravelTex = () =>
  ctex('cGravel', 128, 128, (g, W, H) => {
    noise(g, W, H, '#d9d6cd', 1800, 21, 0.2, 2);
  });
const grassTex = () =>
  ctex('cGrass', 128, 128, (g, W, H) => {
    noise(g, W, H, '#5f7d3f', 1800, 29, 0.14, 2);
  });
const brickTileTex = () =>
  ctex('cGxTile', 128, 128, (g, W, H) => {
    noise(g, W, H, '#9d968c', 700, 33, 0.07, 3);
    g.fillStyle = 'rgba(80,70,60,0.3)';
    for (let y = 0; y < H; y += 16) {
      g.fillRect(0, y, W, 1);
      for (let x = 0; x < W; x += 16) g.fillRect(x, y, 1, 16);
    }
  });
const stairGlassTex = () =>
  ctex('cStairGlass', 64, 128, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#5f7d98');
    gr.addColorStop(1, '#3a536a');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#c8ccd0';
    g.fillRect(0, 0, 3, H);
    g.fillRect(W - 3, 0, 3, H);
    g.fillRect(0, H / 2 - 1, W, 3);
  });
// 自強外牆深灰洗石子、斜柱的褐灰粗洗石子（中段一條膚色帶；貼圖對應整根柱高）
const zqWallTex = () =>
  ctex('cZqWall', 128, 128, (g, W, H) => {
    noise(g, W, H, '#77736e', 1800, 63, 0.2, 2);
  });
const zqPierTex = () =>
  ctex(
    'cZqPier',
    128,
    256,
    (g, W, H) => {
      noise(g, W, H, '#7d7065', 3200, 67, 0.22, 2);
      g.fillStyle = '#e3bfa4';
      g.fillRect(0, H * 0.53, W, H * 0.07);
    },
    false
  );
// 5F 退縮露台：深色陰影牆、靠牆一排冷氣與盆栽（每格 3.6 m）
const terraceTex = () =>
  ctex('cTerrace', 128, 64, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2e2c2a');
    gr.addColorStop(1, '#55514c');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#6d6a66';
    g.fillRect(W * 0.38, H * 0.2, W * 0.26, H * 0.32);
    g.fillStyle = '#8a8784';
    g.fillRect(W * 0.1, H * 0.55, W * 0.16, H * 0.25);
    g.fillStyle = '#3f5a30';
    g.beginPath();
    g.arc(W * 0.8, H * 0.68, 9, 0, 7);
    g.fill();
  });
// 管理大樓前廣場：淺灰方磚夾白色長條磚（2025-10 相片）
const plazaTex = () =>
  ctex('cPlaza', 256, 256, (g, W, H) => {
    noise(g, W, H, '#9c9a96', 1600, 51, 0.1, 3);
    g.fillStyle = 'rgba(60,58,55,0.35)';
    for (let i = 0; i < W; i += 32) {
      g.fillRect(i, 0, 1, H);
      g.fillRect(0, i, W, 1);
    }
    const r = lcg(57);
    g.fillStyle = '#e2e0da';
    for (let y = 8; y < H; y += 32)
      for (let x = ((y / 32) % 2) * 40; x < W; x += 80 + r() * 30) g.fillRect(x, y, 48, 12);
  });
// 藍色大圖半圓筒（2025-10 相片：藍底、白字「運籌帷幄 追求卓越」、一圈圓形徽章）
const drumTex = () =>
  ctex('cDrum', 512, 192, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#1c5fb8');
    gr.addColorStop(1, '#0e3b86');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    g.font = '900 34px "Noto Sans TC","PingFang TC",sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('運籌帷幄', W * 0.08, H * 0.48);
    g.fillText('追求卓越', W * 0.08, H * 0.72);
    const r = lcg(41);
    for (let i = 0; i < 10; i++) {
      const x = W * (0.48 + (i % 5) * 0.09),
        y = H * (0.3 + Math.floor(i / 5) * 0.36);
      g.fillStyle = '#f4f6fa';
      g.beginPath();
      g.arc(x, y, 17, 0, 7);
      g.fill();
      g.fillStyle = ['#2a7a3a', '#c0302a', '#1d4f9a', '#d8a020'][Math.floor(r() * 4)];
      g.beginPath();
      g.arc(x, y, 9, 0, 7);
      g.fill();
    }
  });
// AACSB 藍色橫布條
const bannerTex = () =>
  ctex(
    'cBanner',
    1024,
    64,
    (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, '#2a66c0');
      gr.addColorStop(1, '#1d4fa0');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff';
      g.fillRect(24, 14, 54, 36);
      g.fillStyle = '#d23030';
      g.fillRect(24, 14, 54, 18);
      g.fillStyle = '#1d3f8a';
      g.fillRect(24, 14, 26, 18); // 國旗
      g.fillStyle = '#f4f6fa';
      g.beginPath();
      g.arc(112, 32, 22, 0, 7);
      g.fill();
      g.fillStyle = '#1d4fa0';
      g.beginPath();
      g.arc(112, 32, 14, 0, 7);
      g.fill(); // 校徽
      g.fillStyle = '#ffffff';
      g.fillRect(152, 10, 96, 44);
      g.fillStyle = '#1f55a8';
      g.font = '900 22px Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('AACSB', 200, 33);
      g.fillStyle = '#ffffff';
      g.font = '900 30px "Noto Sans TC","PingFang TC",sans-serif';
      g.fillText('中原大學商學院　榮獲 AACSB 國際商學認證', 555, 33);
      g.fillStyle = '#ffd23f';
      g.font = '900 26px Arial';
      g.fillText('Top 5%', 905, 33);
      g.fillStyle = '#e8eef8';
      g.beginPath();
      g.moveTo(950, H);
      g.lineTo(990, 12);
      g.lineTo(1024, H);
      g.fill(); // 雪山
    },
    false
  );
// 工學館校徽：藍色圓、白圈、紅十字
const logoTex = () =>
  ctex(
    'cLogo',
    256,
    256,
    (g, W, H) => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#1e56a8';
      g.beginPath();
      g.arc(W / 2, H / 2, W / 2 - 2, 0, 7);
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(W / 2, H / 2, W / 2 - 22, 0, 7);
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(W * 0.36, H * 0.3);
      g.lineTo(W * 0.64, H * 0.3);
      g.lineTo(W * 0.62, H * 0.62);
      g.lineTo(W / 2, H * 0.72);
      g.lineTo(W * 0.38, H * 0.62);
      g.closePath();
      g.fill();
      g.fillStyle = '#c62828';
      g.fillRect(W * 0.47, H * 0.34, W * 0.06, H * 0.32);
      g.fillRect(W * 0.41, H * 0.42, W * 0.18, H * 0.06);
    },
    false
  );
const SERIF = '"Noto Serif TC","Songti TC","PMingLiU",serif',
  SANS = '"Noto Sans TC","PingFang TC",sans-serif';
const hText = (key, text, colour, font, w = 1024, h = 160, bg = null) =>
  ctex(
    key,
    w,
    h,
    (g, W, H) => {
      if (bg) {
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
      }
      const chars = [...text],
        step = W / chars.length,
        px = Math.min(H * 0.72, step * 0.85);
      g.font = `900 ${px}px ${font}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      chars.forEach((c, i) => {
        if (c === ' ') return;
        g.fillStyle = 'rgba(30,20,10,0.4)';
        g.fillText(c, step * (i + 0.5) + 2, H / 2 + 3);
        g.fillStyle = colour;
        g.fillText(c, step * (i + 0.5), H / 2);
      });
    },
    false
  );
// 一整串橫書（英文）：量字寬置中一次畫完，字級盡量接近畫布高度
const lText = (key, text, colour, font, w = 1024, h = 256) =>
  ctex(
    key,
    w,
    h,
    (g, W, H) => {
      let px = H * 0.78;
      g.font = `bold ${px}px ${font}`;
      const tw = g.measureText(text).width;
      if (tw > W * 0.96) {
        px *= (W * 0.96) / tw;
        g.font = `bold ${px}px ${font}`;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(30,20,10,0.45)';
      g.fillText(text, W / 2 + 3, H / 2 + 4);
      g.fillStyle = colour;
      g.fillText(text, W / 2, H / 2);
    },
    false
  );
const vText = (key, text, colour, font, w = 160, h = 1024) =>
  ctex(
    key,
    w,
    h,
    (g, W, H) => {
      const chars = [...text],
        step = H / chars.length,
        px = Math.min(W * 0.8, step * 0.82);
      g.font = `900 ${px}px ${font}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      chars.forEach((c, i) => {
        g.fillStyle = 'rgba(40,25,10,0.4)';
        g.fillText(c, W / 2 + 3, step * (i + 0.5) + 4);
        g.fillStyle = colour;
        g.fillText(c, W / 2, step * (i + 0.5));
      });
    },
    false
  );
const gxSignTex = () =>
  ctex(
    'cGxSign',
    1024,
    256,
    (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#c9ccce');
      gr.addColorStop(1, '#9ea2a5');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#25313b';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `900 92px ${SANS}`;
      g.fillText('工　學　館', W / 2, H * 0.36);
      g.font = '600 46px Arial';
      g.fillText('Engineering Building', W / 2, H * 0.72);
    },
    false
  );
const ledTex = () =>
  ctex(
    'cLed',
    512,
    48,
    (g, W, H) => {
      g.fillStyle = '#0b0b0b';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff4030';
      g.font = `900 34px ${SANS}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('歡迎蒞臨', W * 0.3, H / 2);
      g.fillStyle = '#40e060';
      g.fillText('中原大學工學院', W * 0.68, H / 2);
    },
    false
  );

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
    granite: () => std({ map: graniteTex(), roughness: 0.9, side: THREE.DoubleSide }),
    mgDiamond: () =>
      std({
        map: diamondTex('#a8a196'),
        roughness: 0.9,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    zqDiamond: () =>
      std({
        map: diamondTex('#9a958d'),
        roughness: 0.9,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    tileRoof: () => std({ map: tileRoofTex(), roughness: 0.8, side: THREE.DoubleSide }),
    gable: () => std({ color: '#a49d93', roughness: 0.9, side: THREE.DoubleSide }),
    maroon: () => std({ color: '#7f2430', roughness: 0.7 }),
    soffit: () => std({ color: '#e6e3dc', roughness: 0.9, side: THREE.DoubleSide }),
    winGlass: () =>
      glow(
        {
          color: '#51656c',
          roughness: 0.15,
          metalness: 0.4,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        },
        0.6
      ),
    mgBand: () => std({ color: '#e2c4a8', roughness: 0.85 }),
    mgGlass: () =>
      glow(
        {
          color: '#1f3540',
          roughness: 0.15,
          metalness: 0.4,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        },
        0.6
      ),
    mgDark: () => std({ color: '#77736d', roughness: 0.95, side: THREE.DoubleSide }),
    zqWall: () => std({ map: zqWallTex(), roughness: 0.95, side: THREE.DoubleSide }),
    zqPier: () => std({ map: zqPierTex(), roughness: 0.9, side: THREE.DoubleSide }),
    zqBand: () =>
      std({ color: '#dfba90', roughness: 0.85, emissive: '#dfba90', emissiveIntensity: 0.12 }),
    terrace: () =>
      std({
        map: terraceTex(),
        roughness: 0.95,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    plaza: () =>
      std({
        map: plazaTex(),
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    drum: () => std({ map: drumTex(), roughness: 0.5, side: THREE.DoubleSide }),
    drumTop: () => std({ color: '#d7d3cb', roughness: 0.8 }),
    rail: () => std({ color: '#c9ccce', roughness: 0.45, metalness: 0.5 }),
    darkRail: () => std({ color: '#3a3d40', roughness: 0.5, metalness: 0.5 }),
    steel: () => std({ color: '#6c7074', roughness: 0.55, metalness: 0.5, side: THREE.DoubleSide }),
    pergola: () => std({ color: '#3b3d40', roughness: 0.6, metalness: 0.4 }),
    arcSlot: () => std({ color: '#2f3438', roughness: 0.3, metalness: 0.3 }),
    slab: () => std({ color: '#9a948c', roughness: 0.9 }),
    brickPave: () =>
      std({
        map: brickPaveTex(),
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
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    grass: () =>
      std({
        map: grassTex(),
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    rock: () => std({ color: '#8e8c86', roughness: 0.95, flatShading: true }),
    trunk: () => std({ color: '#5b4a3a', roughness: 0.95 }),
    leaf: () => std({ color: '#3f6a32', roughness: 0.9, flatShading: true }),
    leaf2: () => std({ color: '#4d7a3a', roughness: 0.9, flatShading: true }),
    door: () => glow({ color: '#2a3036', roughness: 0.25, metalness: 0.4 }, 0.4),
    glass: () =>
      glow({ color: '#3d5566', roughness: 0.12, metalness: 0.5, side: THREE.DoubleSide }, 0.5),
    ssGlass: () =>
      glow({ color: '#7d95a2', roughness: 0.08, metalness: 0.6, side: THREE.DoubleSide }, 0.6),
    redTile: () =>
      std({
        color: '#8a2f2a',
        roughness: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    // 管道間和外牆同一種灰褐小口磚（新中北路 490 巷口相片：直條與牆面同色，只是凸出、高出屋頂）
    gxTower: () =>
      std({ map: brickTileTex(), color: '#d6d0c8', roughness: 0.9, side: THREE.DoubleSide }),
    gxConc: () => std({ color: '#8f8982', roughness: 0.9, side: THREE.DoubleSide }),
    gxPlain: () =>
      std({
        map: brickTileTex(),
        color: '#b9b2a8',
        roughness: 0.9,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    stairGlass: () =>
      glow(
        {
          map: stairGlassTex(),
          emissiveMap: stairGlassTex(),
          roughness: 0.15,
          metalness: 0.4,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        },
        0.8
      ),
    white: () => std({ color: '#eceae5', roughness: 0.7 }),
    pipe: () => std({ color: '#e8e8e4', roughness: 0.5 }),
    wood: () => std({ color: '#9a6e46', roughness: 0.85 }),
    orange: () => std({ color: '#e8902e', roughness: 0.6 }),
    umbrella: () => std({ color: '#e9e3d4', roughness: 0.8, side: THREE.DoubleSide }),
    table: () => std({ color: '#d8d6d0', roughness: 0.6, metalness: 0.3 }),
    planter: () => std({ color: '#7a756d', roughness: 0.9 }),
    imRed: () => std({ color: '#7e2a33', roughness: 0.6 }),
    ssOrange: () =>
      std({
        color: '#f0a030',
        roughness: 0.7,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    ssRed: () =>
      std({
        color: '#d0453f',
        roughness: 0.7,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    ssYellow: () =>
      std({
        color: '#f2c040',
        roughness: 0.7,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    louver: () => std({ color: '#4b4f53', roughness: 0.6, metalness: 0.3 }),
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
    g.deleteAttribute?.('uv2');
    if (!g.attributes.uv)
      g.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)
      );
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
  // 3D 兩點之間的梁：斷面 w（沿 up）× d（沿水平法線 n）
  beam(m, p, q, w, d, n) {
    const X = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]),
      len = X.length();
    X.normalize();
    // n：斷面的水平法線；沒給或跟梁平行時取梁的水平垂直方向
    const hx = q[0] - p[0],
      hz = q[2] - p[2],
      hl = Math.hypot(hx, hz);
    if (
      !n ||
      (hl > 1e-6 && Math.abs((n[0] * hx + n[1] * hz) / (Math.hypot(n[0], n[1]) * hl)) > 0.95)
    )
      n = hl > 1e-6 ? [-hz, hx] : [1, 0];
    const Z = new THREE.Vector3(n[0], 0, n[1]).normalize(),
      Y = new THREE.Vector3().crossVectors(Z, X).normalize();
    Z.crossVectors(X, Y);
    const g = new THREE.BoxGeometry(len, w, d);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, Z));
    g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    return this.add(m, g);
  }
  cyl(m, x, z, r, y0, y1, seg = 16, open = false, r1 = r) {
    const g = new THREE.CylinderGeometry(r1, r, y1 - y0, seg, 1, open);
    g.translate(x, (y0 + y1) / 2, z);
    return this.add(m, g);
  }
  blob(m, x, y, z, r, sy = 0.8) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1, sy, 1);
    g.translate(x, y, z);
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
  tri(m, a, b, c, uv) {
    return this.quad(
      m,
      a,
      b,
      c,
      c,
      uv || [
        [0, 0],
        [1, 0],
        [0.5, 1],
        [0.5, 1],
      ]
    );
  }
  // 直立牆：從 a 走到 b，法線在右手邊（往東走朝南），u、v 以公尺除以 tu、tv
  wall(m, ax, az, bx, bz, y0, y1, tu = 4, tv = 4) {
    const l = Math.hypot(bx - ax, bz - az);
    return this.quad(
      m,
      [ax, y0, az],
      [bx, y0, bz],
      [bx, y1, bz],
      [ax, y1, az],
      [
        [0, y0 / tv],
        [l / tu, y0 / tv],
        [l / tu, y1 / tv],
        [0, y1 / tv],
      ]
    );
  }
  // 貼地／水平多邊形（y 可為函式）
  flat(m, pts, y, tile = 4) {
    const v = pts.map(([x, z]) => new THREE.Vector2(x, z)),
      tris = THREE.ShapeUtils.triangulateShape(v, []);
    const pos = [],
      uv = [];
    for (const t of tris)
      for (const i of t) {
        pos.push(pts[i][0], typeof y === 'function' ? y(pts[i][0], pts[i][1]) : y, pts[i][1]);
        uv.push(pts[i][0] / tile, pts[i][1] / tile);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) {
      const ux = p[i + 3] - p[i],
        uz = p[i + 5] - p[i + 2],
        wx = p[i + 6] - p[i],
        wz = p[i + 8] - p[i + 2],
        ny = uz * wx - ux * wz;
      if (ny < 0)
        for (let k = 0; k < 3; k++) {
          const t = p[i + 3 + k];
          p[i + 3 + k] = p[i + 6 + k];
          p[i + 6 + k] = t;
        }
    }
    g.computeVertexNormals();
    return this.add(m, g);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = ![
        'brickPave',
        'gravel',
        'grass',
        'plaza',
        'soffit',
        'winGlass',
        'mgGlass',
        'mgDiamond',
        'zqDiamond',
        'redTile',
        'stairGlass',
      ].includes(m);
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
      roughness: 0.4,
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
// 輪廓邊 a→c（OSM 繞向）的單位方向與朝外法線
const edge = (a, c) => {
  const dx = c[0] - a[0],
    dz = c[1] - a[1],
    l = Math.hypot(dx, dz);
  return { l, tx: dx / l, tz: dz / l, nx: dz / l, nz: -dx / l };
};
const along = (a, e, s, o) => [a[0] + e.tx * s + e.nx * o, a[1] + e.tz * s + e.nz * o];
const segDist = (p, a, c) => {
  const dx = c[0] - a[0],
    dz = c[1] - a[1],
    l2 = dx * dx + dz * dz,
    t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
};
const onRing = (p, R) => R.some((a, i) => segDist(p, a, R[(i + 1) % R.length]) < 0.3);
function pip(x, z, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i],
      [xj, zj] = P[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

// ---------------- 蓋 ----------------
export function buildZoneC(I, scene, data, collision) {
  const group = new THREE.Group();
  group.name = 'zoneC';
  const k = new Acc();
  const find = (id) => data.buildings.find((b) => b.id === id);
  const baseOf = (b, x, z) => (b && Number.isFinite(b.base) ? b.base : groundY(x, z));
  // I.addWall 的高度帶是相對牆中點地面的（src/physics/PhysWorld.js 會再加 H）：這裡傳世界高度，先換算（同 src/world/zones/ZoneG.js）
  const wallC = (ax, az, bx, bz, y0, y1) => {
    const g = H((ax + bx) / 2, (az + bz) / 2);
    I.addWall(ax, az, bx, bz, y0 - g, y1 - g);
  };
  const boxColl = (P, y0, y1) => {
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        c = P[(i + 1) % P.length];
      wallC(a[0], a[1], c[0], c[1], y0, y1);
    }
  };
  // 貼在輪廓邊外側 off 的面（朝外），貼圖每 tu × tv 公尺重複
  const _face = (m, a, c, y0, y1, off = 0.04, tu = 1.8, tv = 1.8) => {
    const e = edge(a, c),
      A = along(a, e, 0, off),
      C = along(a, e, e.l, off);
    k.wall(m, C[0], C[1], A[0], A[1], y0, y1, tu, tv);
  };
  // 同上，但貼圖垂直方向剛好鋪滿 y0..y1 一次（女兒牆菱形孔帶）；rev：邊是 +u 方向（不是 OSM 繞向）時反過來
  const faceBand = (m, a, c, y0, y1, off, tu, rev = false) => {
    if (rev) [a, c] = [c, a];
    const e = edge(a, c),
      A = along(a, e, 0, off),
      C = along(a, e, e.l, off),
      l = e.l / tu;
    k.quad(
      m,
      [C[0], y0, C[1]],
      [A[0], y0, A[1]],
      [A[0], y1, A[1]],
      [C[0], y1, C[1]],
      [
        [0, 0],
        [l, 0],
        [l, 1],
        [0, 1],
      ]
    );
  };
  // 雙坡紅瓦屋頂：p0→p1 為屋脊方向，簷口高 y、屋脊高 y + rise，四周出簷 o
  const gable = (p0, p1, p2, p3, y, rise, o = 0.45) => {
    const c = [(p0[0] + p1[0] + p2[0] + p3[0]) / 4, (p0[1] + p1[1] + p2[1] + p3[1]) / 4];
    const ex = (p) => {
      const dx = p[0] - c[0],
        dz = p[1] - c[1],
        l = Math.hypot(dx, dz);
      return [p[0] + (dx / l) * o, p[1] + (dz / l) * o];
    };
    const [q0, q1, q2, q3] = [p0, p1, p2, p3].map(ex),
      r0 = [(q0[0] + q3[0]) / 2, (q0[1] + q3[1]) / 2],
      r1 = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2];
    const L = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]),
      S = Math.hypot(r0[0] - q0[0], r0[1] - q0[1]) * 1.15,
      Y = y + rise,
      P3 = (p, h) => [p[0], h, p[1]];
    const uv = [
      [0, 0],
      [L / 2, 0],
      [L / 2, S / 2],
      [0, S / 2],
    ];
    k.quad('tileRoof', P3(q0, y), P3(q1, y), P3(r1, Y), P3(r0, Y), uv);
    k.quad('tileRoof', P3(q2, y), P3(q3, y), P3(r0, Y), P3(r1, Y), uv);
    k.tri('gable', P3(p3, y), P3(p0, y), P3([(p0[0] + p3[0]) / 2, (p0[1] + p3[1]) / 2], Y - 0.15));
    k.tri('gable', P3(p1, y), P3(p2, y), P3([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], Y - 0.15));
    k.beam('gable', P3(r0, Y + 0.06), P3(r1, Y + 0.06), 0.18, 0.3); // 屋脊
  };
  // 朝 nrm 那一面的直立牆（p、q 往 nrm 外推 off）
  const wallOut = (m, p, q, nrm, y0, y1, off = 0, tu = 4, tv = 4) => {
    const l = Math.hypot(nrm[0], nrm[1]),
      A = [p[0] + (nrm[0] / l) * off, p[1] + (nrm[1] / l) * off],
      C = [q[0] + (nrm[0] / l) * off, q[1] + (nrm[1] / l) * off];
    if (-(C[1] - A[1]) * nrm[0] + (C[0] - A[0]) * nrm[1] > 0)
      k.wall(m, A[0], A[1], C[0], C[1], y0, y1, tu, tv);
    else k.wall(m, C[0], C[1], A[0], A[1], y0, y1, tu, tv);
  };
  // src/world/MapBuilder.js 幫整棟加的碰撞多邊形（植栽照它種完了，共用亂數不變）縮成 at 那裡的一小點：之後只剩各分段擋人，
  // 穿堂和中庭就走得進去（做法同 src/world/zones/ZoneH.js 的空橋）
  const collapse = (ref, at) => {
    const pi = collision ? collision.polys.findIndex((q) => q.pts === ref) : -1;
    if (pi < 0) return;
    const n = ref.length;
    collision.insetPolygon(
      pi,
      Array.from({ length: n }, (_, i) => [
        at[0] + Math.cos((i / n) * 6.2832) * 0.05,
        at[1] + Math.sin((i / n) * 6.2832) * 0.05,
      ])
    );
  };
  // 一棵簡單的樹（中庭用，不進 src/world/MapBuilder.js 的植栽，也不抽共用亂數；樹幹有碰撞）
  const tree = (x, z, s, r) => {
    const y = H(x, z);
    collision?.addCircle(x, z, 0.35);
    k.cyl('trunk', x, z, 0.22 * s, y - 0.2, y + 3.2 * s, 8, false, 0.16 * s);
    k.blob(r() < 0.5 ? 'leaf' : 'leaf2', x, y + 4.2 * s, z, 2.4 * s, 0.75);
    k.blob('leaf', x + 1.1 * s, y + 3.8 * s, z + 0.6 * s, 1.6 * s, 0.7);
    k.blob('leaf2', x - 0.9 * s, y + 4.0 * s, z - 0.7 * s, 1.7 * s, 0.7);
  };

  // ===== 管理大樓 =====
  const mg = find(C_IDS.mg);
  if (mg) {
    const c0 = mgW(26, 7),
      B = baseOf(mg, ...c0),
      top = B + mg.h,
      fl = (mg.h - 0.6) / mg.floors; // fl 3.3
    const n = [-MG_V[0], -MG_V[1]]; // 西南面朝外
    const P = (u, v, y) => {
      const p = mgW(u, v);
      return [p[0], y, p[1]];
    };
    const ub = (m, u0, u1, v0, v1, y0, y1) => {
      const a = mgW(u0, (v0 + v1) / 2),
        c = mgW(u1, (v0 + v1) / 2);
      return k.slab(m, a[0], a[1], c[0], c[1], v1 - v0, y0, y1);
    };
    const colBox = (u0, u1, v0, v1, y0, y1) =>
      boxColl([mgW(u0, v0), mgW(u1, v0), mgW(u1, v1), mgW(u0, v1)], y0, y1);
    // 一樓方柱柱廊（穿堂以外，約 7.2 m 一根），穿堂 4 根兩層高的方柱
    const [e0, e1] = MG.ent,
      ecols = [0, 1, 2, 3].map((i) => e0 + ((e1 - e0) * i) / 3);
    for (let u = 0.45; u <= MG.L - 0.4; u += 7.25) {
      if (u > e0 - 1.5 && u < e1 + 1.5) continue;
      if (Math.abs(u - MG.drum) < 2.6) continue;
      const g0 = groundY(...mgW(u, -0.4)) - 0.1;
      ub('granite', u - 0.45, u + 0.45, -0.85, 0.05, g0, B + fl);
      colBox(u - 0.45, u + 0.45, -0.85, 0, g0, B + fl);
    }
    for (const u of ecols) {
      const g0 = groundY(...mgW(u, -0.4)) - 0.1;
      ub('granite', u - 0.5, u + 0.5, -1.0, 0.05, g0, B + 2 * fl);
      colBox(u - 0.5, u + 0.5, -1.0, 0, g0, B + 2 * fl);
    }
    // 穿堂（兩層高，走得過去，通到東北側對著自強的紅磚中庭）：地面鋪面、白色天花與梁、三四樓外牆與窗、
    // 靠正面的二樓過道（酒紅欄牆「College of Business」）
    if (mg.parts) {
      const vN = MG.vN,
        yC = B + 2 * fl,
        nN = MG_V,
        Q = [mgW(e0, -1.3), mgW(e1, -1.3), mgW(e1, vN + 0.1), mgW(e0, vN + 0.1)];
      k.flat('plaza', Q, (x, z) => H(x, z) + 0.035, 6);
      k.flat('soffit', [mgW(e0, 0), mgW(e1, 0), mgW(e1, vN), mgW(e0, vN)], yC, 4);
      for (let v = 3.9; v < vN - 1; v += 3.9) ub('soffit', e0, e1, v - 0.2, v + 0.2, yC - 0.5, yC);
      // 西南面三、四樓：花崗石牆、每格一扇橫拉窗、樓板膚色帶
      wallOut('granite', mgW(e0, 0), mgW(e1, 0), n, yC, B + 4 * fl, 0, 1.8, 1.8);
      for (const f of [2, 3])
        for (let i = 0; i < 3; i++) {
          const u0 = e0 + ((e1 - e0) * (i + 0.5)) / 3 - 0.8,
            y = B + f * fl + 1.0;
          wallOut('mgGlass', mgW(u0, 0), mgW(u0 + 1.6, 0), n, y, y + 1.45, 0.03);
          ub('white', u0 - 0.1, u0 + 1.7, -0.12, 0, y - 0.1, y);
          ub('white', u0 + 0.77, u0 + 0.83, -0.06, 0, y, y + 1.45);
        }
      for (const f of [2, 3, 4])
        ub('mgBand', e0, e1, -0.12, 0, B + f * fl - 0.16, B + f * fl + 0.16);
      // 東北面：深灰素混凝土
      wallOut('mgDark', mgW(e0, vN), mgW(e1, vN), nN, yC, top, 0, 3, 3);
      // 二樓過道：橫跨穿堂，前後酒紅欄牆
      ub('slab', e0, e1, 0.4, 2.6, B + fl - 0.25, B + fl);
      ub('maroon', e0, e1, 0.4, 0.55, B + fl, B + fl + 1.1);
      ub('maroon', e0, e1, 2.45, 2.6, B + fl, B + fl + 1.1);
      {
        const c = mgW((e0 + e1) / 2, 0.38);
        sign(
          group,
          lText('cMgCob', 'College of Business', '#f0d7be', '"Times New Roman",serif', 1024, 224),
          2.2,
          0.48,
          c[0],
          B + fl + 0.55,
          c[1],
          n[0],
          n[1],
          0.1,
          0.1
        );
      }
      // 碰撞：整棟的多邊形與穿堂上方那塊縮掉，只剩西北段、東南段擋人
      const cW = mgW(5, 7);
      collapse(mg.pts, cW);
      collapse(mg.parts[1].pts, cW);
      // 東北側夾在兩座樓梯間之間的紅磚中庭（正射：紅磚格子鋪面）
      k.flat(
        'brickPave',
        [mgW(6.3, vN + 0.05), mgW(34.5, vN + 0.05), mgW(34.5, 20.4), mgW(6.3, 19.7)],
        (x, z) => H(x, z) + 0.04,
        1.6
      );
    }
    // 紅底金字「商學院」匾（右至左），掛在中間兩根柱之間
    {
      const c = mgW((ecols[1] + ecols[2]) / 2, -0.6);
      sign(
        group,
        hText('cMgName', '院學商', '#e8c46a', SERIF, 768, 256, '#b3202a'),
        2.25,
        0.75,
        c[0],
        B + 2 * fl - 0.95,
        c[1],
        n[0],
        n[1],
        0.12,
        0.2
      );
    }
    // AACSB 藍色橫布條：掛在三樓樓板邊
    {
      const c = mgW((e0 + e1) / 2 + 2.5, -1.08);
      sign(group, bannerTex(), 21, 1.25, c[0], B + 2 * fl + 0.55, c[1], n[0], n[1], 0.15, 0.1);
    }
    // 入口右側的藍色大圖半圓筒（高約一層）
    {
      const C = mgW(MG.drum, 0),
        r = 2.1,
        y0 = groundY(...mgW(MG.drum, -1)) - 0.1,
        y1 = B + fl - 0.1;
      const g = new THREE.CylinderGeometry(r, r, y1 - y0, 24, 1, true, 0, Math.PI); // 半圓：本地 +x 那半邊，轉到朝西南
      g.rotateY(Math.atan2(-n[1], n[0]));
      g.translate(C[0], (y0 + y1) / 2, C[1]);
      k.add('drum', g);
      const ring = [];
      for (let i = 0; i <= 12; i++) {
        const t = (Math.PI * i) / 12,
          du = Math.cos(t) * r,
          dv = -Math.sin(t) * r;
        ring.push(mgW(MG.drum + du, dv));
      }
      k.flat('drumTop', ring, y1, 4);
      for (let i = 0; i < ring.length - 1; i++)
        wallC(ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1], y0, y1);
      // 頂上一圈白欄杆（樓梯平台）
      for (let i = 0; i < ring.length - 1; i++)
        k.beam(
          'rail',
          [ring[i][0], y1 + 1.0, ring[i][1]],
          [ring[i + 1][0], y1 + 1.0, ring[i + 1][1]],
          0.05,
          0.05,
          [0, 1]
        );
    }
    // 5F 開放框架層（西南面）：方框柱、上梁、矮欄牆、每格一根斜撐
    // 框後是退縮的露台（深色陰影，不是玻璃），每格左右各一根斜撐，開口成梯形
    {
      const y0 = B + 4 * fl,
        y1 = top - 1.0,
        nb = Math.round(MG.L / 3.6),
        st = MG.L / nb;
      faceBand('terrace', mgW(0, 0), mgW(MG.L, 0), y0 + 0.9, y1, 0.03, 3.6, true);
      for (let i = 0; i <= nb; i++)
        ub('granite', i * st - 0.25, i * st + 0.25, -0.45, 0.02, y0, y1);
      ub('granite', 0, MG.L, -0.3, 0.02, y0, y0 + 0.95);
      for (let i = 0; i < nb; i++) {
        const u = i * st;
        k.beam(
          'granite',
          P(u + 0.25, -0.2, y1 - 0.05),
          P(u + st * 0.3, -0.2, y0 + 0.95),
          0.26,
          0.25,
          n
        );
        k.beam(
          'granite',
          P(u + st - 0.25, -0.2, y1 - 0.05),
          P(u + st * 0.7, -0.2, y0 + 0.95),
          0.26,
          0.25,
          n
        );
      }
    }
    // 女兒牆一排菱形孔：四周各面（含東北窄巷）
    const R = mg.pts;
    for (let i = 0; i < R.length; i++) {
      const a = R[i],
        c = R[(i + 1) % R.length];
      if (Math.hypot(c[0] - a[0], c[1] - a[1]) < 1.5) continue;
      faceBand('mgDiamond', a, c, top - 1.0, top + 0.9, 0.04, 1.8);
    }
    // 屋頂：兩段紅瓦雙坡（屋脊沿長軸）
    // 前廣場鋪面（柱廊外到廣場中段）
    k.flat(
      'plaza',
      [mgW(-1, -1.3), mgW(51, -1.3), mgW(51, -13), mgW(-1, -13)],
      (x, z) => H(x, z) + 0.035,
      6
    );
    for (const [u0, u1] of MG.red) {
      const [v0, v1] = MG.rv;
      gable(mgW(u0, v0), mgW(u1, v0), mgW(u1, v1), mgW(u0, v1), top + 0.9, 2.2);
    }
  }

  // ===== 自強商學大樓 =====
  const zq = find(C_IDS.zq);
  if (zq && zq.parts) {
    const B = baseOf(zq, ...zqW(24, 7)),
      c = ZQ.court;
    // 女兒牆菱形孔：只貼在外圈（落在原輪廓上的邊）
    for (const V of zq.parts) {
      const top = B + V.h,
        Q = V.pts;
      for (let i = 0; i < Q.length; i++) {
        const a = Q[i],
          d = Q[(i + 1) % Q.length],
          mid = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
        if (Math.hypot(d[0] - a[0], d[1] - a[1]) < 1.5 || !onRing(mid, zq.pts)) continue;
        faceBand('zqDiamond', a, d, top - 0.5, top + 0.9, 0.04, 1.8);
      }
    }
    // 東南翼北段紅瓦雙坡（屋脊沿 v）
    {
      const [u0, u1, v0, v1] = ZQ.red,
        top = B + 13.8;
      gable(zqW(u0, v0), zqW(u0, v1), zqW(u1, v1), zqW(u1, v0), top + 0.9, 2.4);
    }
    // 西北連接段屋頂紅磚露台＋白欄杆
    {
      const top = B + 7.2,
        Q = [
          zqW(0.4, c[2] + 0.3),
          zqW(0.4, c[3] - 0.3),
          zqW(ZQ.link - 0.3, c[3] - 0.3),
          zqW(ZQ.link - 0.3, c[2] + 0.3),
        ];
      k.flat('brickPave', Q, top + 0.04, 1.2);
      for (let i = 0; i < 4; i++) {
        const a = Q[i],
          d = Q[(i + 1) % 4];
        k.beam('rail', [a[0], top + 1.0, a[1]], [d[0], top + 1.0, d[1]], 0.05, 0.05, [0, 1]);
      }
    }
    // 中庭：草地、碎石步道、大樹（src/world/MapBuilder.js 種樹時整個輪廓還擋著，中庭的樹自己種）
    {
      const Q = [
        zqW(c[0] + 0.3, c[2] + 0.3),
        zqW(c[0] + 0.3, c[3] - 0.3),
        zqW(c[1] - 0.3, c[3] - 0.3),
        zqW(c[1] - 0.3, c[2] + 0.3),
      ];
      k.flat('grass', Q, (x, z) => H(x, z) + 0.04, 4);
      k.flat(
        'gravel',
        [zqW(c[0] + 0.3, 26), zqW(c[0] + 0.3, 28), zqW(c[1] - 0.3, 28), zqW(c[1] - 0.3, 26)],
        (x, z) => H(x, z) + 0.06,
        2
      );
      const r = lcg(97);
      for (const [u, v, s] of [
        [13.5, 21, 1.15],
        [17, 34, 1.25],
        [24, 21, 1.1],
        [29, 33, 1.2],
        [13.5, 31, 0.95],
        [31, 19, 1.0],
        [25.5, 31, 1.35],
        [21, 36.5, 1.2],
        [30.5, 24.5, 1.1],
        [13.5, 36, 1.0],
      ]) {
        const p = zqW(u, v);
        tree(p[0], p[1], s, r);
      }
      // 穿堂出口到碎石步道的紅磚小徑
      k.flat(
        'brickPave',
        [zqW(15.5, c[2] - 0.1), zqW(19.5, c[2] - 0.1), zqW(19.5, 26), zqW(15.5, 26)],
        (x, z) => H(x, z) + 0.07,
        1.6
      );
    }
    // 斜柱穿堂（西南翼，正對管理大樓穿堂；2024-04 相片）：兩層高、走得過去通到中庭。正面四根往下變寬的褐灰洗石子大柱
    // （外側兩根寬、中間兩根窄）、紅底金字「自強商學大樓」匾、橘紅磚地、白色天花；三四樓牆與橫向帶窗自建
    {
      const [u0, u1] = ZQ.pass,
        vC = c[2],
        fl = 3.3,
        yC = B + 2 * fl,
        top = B + 13.8;
      const o = zqW(0, 0),
        vv = zqW(0, 1),
        uu = zqW(1, 0),
        nS = [o[0] - vv[0], o[1] - vv[1]],
        nN = [-nS[0], -nS[1]],
        _U = [uu[0] - o[0], uu[1] - o[1]];
      k.flat(
        'brickPave',
        [zqW(u0, -0.3), zqW(u1, -0.3), zqW(u1, vC + 0.1), zqW(u0, vC + 0.1)],
        (x, z) => H(x, z) + 0.05,
        1.6
      );
      k.flat('soffit', [zqW(u0, 0), zqW(u1, 0), zqW(u1, vC), zqW(u0, vC)], yC, 4);
      const zb = (m, a0, a1, b0, b1, y0, y1) => {
        const p = zqW(a0, (b0 + b1) / 2),
          q = zqW(a1, (b0 + b1) / 2);
        k.slab(m, p[0], p[1], q[0], q[1], b1 - b0, y0, y1);
      };
      for (let v = 3.6; v < vC - 1; v += 3.6) zb('soffit', u0, u1, v - 0.2, v + 0.2, yC - 0.5, yC);
      for (const [vf, nrm, off] of [
        [0, nS, -0.1],
        [vC, nN, 0.1],
      ]) {
        // 兩面：對管理大樓那面、對中庭那面
        wallOut('zqWall', zqW(u0, vf), zqW(u1, vf), nrm, yC, top, 0, 2, 2);
        for (const f of [2, 3]) {
          const y = B + f * fl + 1.0;
          wallOut('winGlass', zqW(u0 + 0.5, vf), zqW(u1 - 0.5, vf), nrm, y, y + 1.4, 0.03);
          for (let u = u0 + 0.5; u <= u1 - 0.45; u += (u1 - u0 - 1) / 6)
            zb(
              'white',
              u - 0.04,
              u + 0.04,
              vf + Math.min(0, off),
              vf + Math.max(0, off),
              y,
              y + 1.4
            );
          zb('zqBand', u0, u1, vf + Math.min(0, off), vf + Math.max(0, off), y + 1.4, y + 1.75);
        }
        zb(
          'zqBand',
          u0,
          u1,
          vf + Math.min(0, off * 1.5),
          vf + Math.max(0, off * 1.5),
          yC - 0.05,
          yC + 0.4
        );
      }
      // 正面四根斜柱：立面上是梯形（下寬上窄），柱深 1.5 m
      const g0 = (u, v) => H(...zqW(u, v)) - 0.15,
        P3 = (u, v, y) => {
          const p = zqW(u, v);
          return [p[0], y, p[1]];
        };
      for (const [uc, wb, wt] of [
        [u0 + 1.15, 2.3, 1.6],
        [u0 + 3.75, 1.15, 0.85],
        [u1 - 3.75, 1.15, 0.85],
        [u1 - 1.15, 2.3, 1.6],
      ]) {
        const va = -0.25,
          vb = 1.25,
          y0 = g0(uc, 0),
          UV = [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ];
        const b0 = uc - wb / 2,
          b1 = uc + wb / 2,
          t0 = uc - wt / 2,
          t1 = uc + wt / 2;
        k.quad('zqPier', P3(b0, va, y0), P3(b1, va, y0), P3(t1, va, yC), P3(t0, va, yC), UV); // 正面
        k.quad('zqPier', P3(b1, vb, y0), P3(b0, vb, y0), P3(t0, vb, yC), P3(t1, vb, yC), UV); // 背面
        k.quad('zqPier', P3(b0, vb, y0), P3(b0, va, y0), P3(t0, va, yC), P3(t0, vb, yC), UV);
        k.quad('zqPier', P3(b1, va, y0), P3(b1, vb, y0), P3(t1, vb, yC), P3(t1, va, yC), UV);
        boxColl([zqW(b0, va), zqW(b1, va), zqW(b1, vb), zqW(b0, vb)], y0, yC);
      }
      // 靠中庭那排細方柱
      for (const uc of [u0 + 0.3, u0 + 3.8, u1 - 3.8, u1 - 0.3]) {
        const y0 = g0(uc, vC - 0.6);
        zb('zqPier', uc - 0.28, uc + 0.28, vC - 0.9, vC - 0.34, y0, yC);
        boxColl(
          [
            zqW(uc - 0.28, vC - 0.9),
            zqW(uc + 0.28, vC - 0.9),
            zqW(uc + 0.28, vC - 0.34),
            zqW(uc - 0.28, vC - 0.34),
          ],
          y0,
          yC
        );
      }
      // 紅底金字「自強商學大樓」匾，掛在中間兩根斜柱之間
      {
        const p = zqW((u0 + u1) / 2, 0.5);
        sign(
          group,
          hText('cZqName', '自強商學大樓', '#f0cc66', SERIF, 1024, 230, '#c8281e'),
          2.5,
          0.58,
          p[0],
          yC - 0.5,
          p[1],
          nS[0],
          nS[1],
          0.12,
          0.2
        );
      }
      // 碰撞：整棟的多邊形與穿堂上方那塊縮掉，穿堂和中庭走得進去（中庭的樹幹另外有碰撞）
      const cS = zqW(5, 7);
      collapse(zq.pts, cS);
      collapse(zq.parts[1].pts, cS);
    }
    // 東南面中段入口：暗色門、雨遮、3 階淺台階、兩側坡道（不加碰撞，台階只有 0.45 m）
    {
      const C = zqW(48.48, ZQ.door),
        e = edge(zqW(48.7, 51.6), zqW(48.26, 0)); // C→D 方向，法線朝外（東南）
      const s0 = Math.hypot(C[0] - zqW(48.7, 51.6)[0], C[1] - zqW(48.7, 51.6)[1]),
        O = zqW(48.7, 51.6),
        y0 = groundY(...along(O, e, s0, 2.6)),
        yF = y0 + 0.45;
      const dA = along(O, e, s0 - 0.8, 0.03),
        dB = along(O, e, s0 + 0.8, 0.03);
      k.quad(
        'door',
        [dB[0], yF, dB[1]],
        [dA[0], yF, dA[1]],
        [dA[0], yF + 2.3, dA[1]],
        [dB[0], yF + 2.3, dB[1]]
      );
      {
        const p = along(O, e, s0 - 1.6, 1.0),
          q = along(O, e, s0 + 1.6, 1.0);
        k.slab('slab', p[0], p[1], q[0], q[1], 2.0, yF + 2.6, yF + 2.8);
      }
      for (let j = 0; j < 3; j++) {
        const o = 1.6 + j * 0.35 + 0.175,
          h = yF - (j + 1) * 0.15,
          p = along(O, e, s0 - 1.3, o),
          q = along(O, e, s0 + 1.3, o);
        k.slab('slab', p[0], p[1], q[0], q[1], 0.35, y0 - 0.2, h);
      }
      {
        const p = along(O, e, s0 - 1.3, 0.8),
          q = along(O, e, s0 + 1.3, 0.8);
        k.slab('slab', p[0], p[1], q[0], q[1], 1.6, y0 - 0.2, yF);
      }
      for (const sg of [-1, 1]) {
        // 坡道沿牆往兩側降
        const a0 = along(O, e, s0 + sg * 1.3, 0.75),
          a1 = along(O, e, s0 + sg * 5.8, 0.75);
        k.beam('slab', [a0[0], yF - 0.1, a0[1]], [a1[0], y0 - 0.05, a1[1]], 0.2, 1.4, [e.nx, e.nz]);
        const r0 = along(O, e, s0 + sg * 1.3, 1.45),
          r1 = along(O, e, s0 + sg * 5.8, 1.45);
        k.beam('darkRail', [r0[0], yF + 0.85, r0[1]], [r1[0], y0 + 0.85, r1[1]], 0.05, 0.05, [
          e.nx,
          e.nz,
        ]);
      }
    }
  }

  // ===== 資訊管理學系（src/world/Interiors.js 自建館的外觀補件） =====
  {
    const c = Math.cos(IM.ang),
      s = Math.sin(IM.ang),
      w = (x, z) => [IM.ox + x * c - z * s, IM.oz + x * s + z * c],
      B = H(IM.ox, IM.oz),
      D = IM.D;
    const lb = (m, x0, x1, y0, y1, z0, z1) => {
      const a = w(x0, (z0 + z1) / 2),
        b = w(x1, (z0 + z1) / 2);
      k.slab(m, a[0], a[1], b[0], b[1], z1 - z0, B + y0, B + y1);
    };
    // 2F、3F 欄板下緣的酒紅邊線（上緣那條原本就有）
    for (let f = 1; f < IM.NF; f++)
      lb('imRed', 0, IM.L, f * IM.FH - 0.02, f * IM.FH + 0.1, D - 0.02, D + 0.05);
    // 東端樓梯塔旁的深灰直條百葉
    for (let i = 0; i < 6; i++) {
      const x = IM.L + 4.1 + i * 0.32;
      lb('louver', x - 0.04, x + 0.04, 1.2, IM.FH * IM.NF + 1.4, D + 0.02, D + 0.4);
    }
    // 門前礫石庭園（灰白碎石、幾塊大石頭；不加碰撞，石頭不到 0.5 m）
    const G = [w(1.5, D + 1.2), w(IM.L - 1.5, D + 1.2), w(IM.L - 1.5, D + 4.6), w(1.5, D + 4.6)];
    k.flat('gravel', G, (x, z) => H(x, z) + 0.05, 2.5);
    const r = lcg(61);
    for (const [x, z, sc] of [
      [2.6, 3.0, 0.6],
      [4.4, 3.9, 0.45],
      [41.6, 3.2, 0.65],
      [43.4, 2.2, 0.45],
    ]) {
      // 大石頭只放兩端，中間留給走到走廊的人
      const p = w(x, D + z),
        y = H(...p),
        g = new THREE.DodecahedronGeometry(sc, 0);
      g.scale(1.3, 0.6, 1);
      g.rotateY(r() * 3);
      g.translate(p[0], y + sc * 0.25, p[1]);
      k.add('rock', g);
    }
  }

  // ===== 商業設計館 =====
  const ss = find(C_IDS.ss);
  if (ss && ss.parts) {
    const B = baseOf(ss, ...ssW(13, 9)),
      fl = 3.3;
    const eS = edge(ssW(SS.L, SS.D), ssW(0, SS.D)); // 南面，由東往西（OSM 繞向），法線朝南
    const S0 = ssW(SS.L, SS.D),
      ent = SS.L * 0.55; // 入口在南面中段（雨遮 at 0.45，從西量）
    // 鋁框玻璃雙開門＋木平台
    {
      const a = along(S0, eS, ent - 1.3, 0.03),
        b2 = along(S0, eS, ent + 1.3, 0.03),
        y0 = groundY(...along(S0, eS, ent, 1.5));
      k.quad(
        'ssGlass',
        [b2[0], y0, b2[1]],
        [a[0], y0, a[1]],
        [a[0], y0 + 3.0, a[1]],
        [b2[0], y0 + 3.0, b2[1]]
      );
      for (const t of [0, 0.5, 1]) {
        const q = [a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t];
        k.beam('rail', [q[0], y0, q[1]], [q[0], y0 + 3.0, q[1]], 0.08, 0.08, [eS.tx, eS.tz]);
      }
      k.beam('rail', [a[0], y0 + 2.35, a[1]], [b2[0], y0 + 2.35, b2[1]], 0.08, 0.08);
      k.beam('rail', [a[0], y0 + 3.0, a[1]], [b2[0], y0 + 3.0, b2[1]], 0.1, 0.1);
      const p = along(S0, eS, ent - 3.5, 1.6),
        q = along(S0, eS, ent + 3.5, 1.6);
      k.slab('wood', p[0], p[1], q[0], q[1], 3.0, y0 - 0.2, y0 + 0.12);
    }
    // 南面窗下板大色塊：鰭板之間一格一色（橘黃、朱紅、黃，不規則），2～4 樓每層都有
    {
      const r = lcg(71),
        cols = ['ssOrange', 'ssRed', 'ssYellow'];
      for (const kf of [1, 2, 3]) {
        const v = SS.D,
          e = edge(ssW(SS.L, v), ssW(0, v)),
          O = ssW(SS.L, v),
          y0 = B + kf * fl + 0.05,
          y1 = y0 + 1.35;
        let last = -1;
        for (let s0 = 0; s0 < SS.L - 0.5; s0 += 3) {
          let ci = Math.floor(r() * 3);
          if (ci === last && r() < 0.6) ci = (ci + 1) % 3;
          last = ci;
          const a = along(O, e, s0 + 0.15, 0.07),
            c2 = along(O, e, Math.min(SS.L, s0 + 3) - 0.15, 0.07);
          k.wall(cols[ci], c2[0], c2[1], a[0], a[1], y0, y1, 3, 1);
        }
      }
    }
    // 「商業設計學系」橘色牌（三樓窗下色塊上）
    {
      const p = along(S0, eS, ent + 4.5, 0.12);
      sign(
        group,
        hText('cSsSign', '商業設計學系', '#ffffff', SANS, 768, 128, '#e8902e'),
        3.6,
        0.6,
        p[0],
        B + 2 * fl + 0.75,
        p[1],
        eS.nx,
        eS.nz,
        0.12,
        0.1
      );
    }
    // 東面兩根白色落水管
    {
      const eE = edge(ssW(SS.L, 0), ssW(SS.L, SS.D));
      for (const s0 of [5.5, 12.5]) {
        const p = along(ssW(SS.L, 0), eE, s0, 0.15);
        k.cyl('pipe', p[0], p[1], 0.08, groundY(...p) - 0.1, B + 13.8 + 0.3, 8);
      }
    }
  }

  // ===== 工學館 =====
  const gx = find(C_IDS.gx);
  if (gx && gx.parts) {
    const B = baseOf(gx, ...gxW(30, 10)),
      fl = (27 - 0.6) / 8,
      top = B + 27;
    // --- 東面一層層往外懸挑的混凝土盒狀樓梯平台（實心矮牆＋上方欄杆、底面斜切；梯段藏在裡面），左右錯開 ---
    const NEc = gxW(49, 0),
      eE = edge(NEc, gxW(71, 49)); // 東面，法線朝東北東
    for (let f = 1; f < 8; f++) {
      const s0 = f % 2 ? 7.2 : 8.6,
        s1 = s0 + 3.4,
        y = B + f * fl,
        d = 1.8;
      const Q = [
          along(NEc, eE, s0, 0),
          along(NEc, eE, s1, 0),
          along(NEc, eE, s1, d),
          along(NEc, eE, s0, d),
        ],
        P3 = (p, h) => [p[0], h, p[1]];
      k.flat('gxConc', Q, y + 0.05, 2);
      for (const [a2, c2] of [
        [Q[1], Q[2]],
        [Q[2], Q[3]],
        [Q[3], Q[0]],
      ]) {
        // 外側實心矮牆 0.95 m（往外走時法線朝外）
        k.quad('gxConc', P3(c2, y - 0.6), P3(a2, y - 0.6), P3(a2, y + 0.95), P3(c2, y + 0.95), [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]);
        k.beam('darkRail', [a2[0], y + 1.1, a2[1]], [c2[0], y + 1.1, c2[1]], 0.05, 0.05);
      }
      // 底面斜切：從牆面 y-1.4 斜到外緣 y-0.6
      const W0 = along(NEc, eE, s0, 0),
        W1 = along(NEc, eE, s1, 0);
      k.quad('gxConc', P3(W1, y - 1.4), P3(W0, y - 1.4), P3(Q[3], y - 0.6), P3(Q[2], y - 0.6));
      k.tri('gxConc', P3(W0, y - 1.4), P3(W0, y + 0.05), P3(Q[3], y - 0.6));
      k.tri('gxConc', P3(W1, y + 0.05), P3(W1, y - 1.4), P3(Q[2], y - 0.6));
      for (let t = 0.15; t < 1; t += 0.2) {
        const pp = [Q[2][0] + (Q[3][0] - Q[2][0]) * t, Q[2][1] + (Q[3][1] - Q[2][1]) * t];
        k.box(
          'darkRail',
          pp[0] - 0.02,
          pp[0] + 0.02,
          y + 0.95,
          y + 1.1,
          pp[1] - 0.02,
          pp[1] + 0.02
        );
      }
    }
    // --- 東北角頂層：藍色圓形校徽（東面北端）、東北面金色直書「中原大學工學院」 ---
    {
      const p = along(NEc, eE, 3.4, 0.08);
      sign(group, logoTex(), 3.2, 3.2, p[0], top - 1.7, p[1], eE.nx, eE.nz, 0.15, 0.2);
    }
    {
      const eN = edge(gxW(0, 0), NEc),
        O = gxW(0, 0),
        p = along(O, eN, 46.3, 0.3),
        a2 = along(O, eN, 44.6, 0.05),
        c2 = along(O, eN, 48.4, 0.05);
      k.wall('gxPlain', c2[0], c2[1], a2[0], a2[1], top - 17.5, top - 2.2, 3, 3); // 轉角一道沒開窗的實牆
      sign(
        group,
        vText('cGxName', '中原大學工學院', '#e6c066', SERIF),
        2.6,
        14.0,
        p[0],
        top - 2.9 - 7.0,
        p[1],
        eN.nx,
        eN.nz,
        0.25,
        0.6
      );
    }
    // --- 東北面三道凸出的管道間（比屋頂高一截；Google 地圖相片從新中北路 490 巷口拍到：三道灰磚直條、高出屋頂） ---
    {
      const O = gxW(0, 0),
        eN = edge(O, NEc);
      [9, 21.5, 34].forEach((s0, i) => {
        const p = along(O, eN, s0 - 0.4, 0.22),
          q = along(O, eN, s0 + 3.0, 0.22);
        k.slab(
          'gxTower',
          p[0],
          p[1],
          q[0],
          q[1],
          0.45,
          groundY(...p) - 0.2,
          top + 1.6 + i * 0.5,
          3
        );
        // 凸出牆面 0.45 m、落地：外緣擋人
        const pa = along(O, eN, s0 - 0.4, 0.45),
          qa = along(O, eN, s0 + 3.0, 0.45);
        boxColl([p, pa, qa, q], groundY(...p) - 0.2, groundY(...p) + 4);
      });
    }
    // --- 外牆零星暗紅小方磚（東北面、東面，約每兩層一顆） ---
    {
      const r = lcg(23);
      for (const [a, c2] of [
        [gxW(0, 0), NEc],
        [NEc, gxW(71, 49)],
      ]) {
        const e = edge(a, c2);
        for (let f = 1; f < 7; f += 2)
          for (let s = 2.5 + r() * 2; s < e.l - 1; s += 4.2 + r() * 2.5) {
            if (a === NEc && s > 5 && s < 14) continue; // 樓梯平台那段
            if (a !== NEc && [9, 21.5, 34].some((q) => s > q - 0.6 && s < q + 2.7)) continue; // 管道間
            const p = along(a, e, s, 0.03),
              q = along(a, e, s + 0.45, 0.03),
              y = B + (f + 0.55) * fl + (r() - 0.5) * 0.6;
            k.wall('redTile', q[0], q[1], p[0], p[1], y, y + 0.45, 1, 1);
          }
      }
    }
    // --- 南面入口：細高樓梯塔（米灰方磚、垂直藍玻璃帶、比主樓高一層）、直書三系名、金屬雨遮招牌與 LED ---
    const Pc = gxW(56.5, 54.8),
      eS = edge(gxW(71, 49), Pc),
      eW = edge(Pc, gxW(53.6, 49.4)); // 南面（往西走）、塔西面（往北走）
    {
      const tw = 5,
        yT = top + 3.6,
        g0 = groundY(...along(Pc, eW, 0, 1)) - 0.1;
      const s0 = eS.l - tw; // 南面上塔的起點（從東往西量）
      // 塔的四角：T0 西南角、T1 東南、T2 東北、T3 西北；南、西兩面外推 0.15 m
      const tE = [-eS.tx, -eS.tz],
        tN = [eW.tx, eW.tz],
        o = 0.15;
      const T = (e, nn) => [Pc[0] + tE[0] * e + tN[0] * nn, Pc[1] + tE[1] * e + tN[1] * nn];
      const T0 = T(-o, -o),
        T1 = T(tw, -o),
        T2 = T(tw, tw),
        T3 = T(-o, tw);
      k.wall('gxTower', T0[0], T0[1], T1[0], T1[1], g0, yT, 3, 3); // 南面（往東走，法線朝南）
      k.wall('gxTower', T3[0], T3[1], T0[0], T0[1], g0, yT, 3, 3); // 西面
      k.wall('gxTower', T1[0], T1[1], T2[0], T2[1], top - 0.5, yT, 3, 3); // 東面、北面只露出屋頂以上
      k.wall('gxTower', T2[0], T2[1], T3[0], T3[1], top - 0.5, yT, 3, 3);
      k.flat('gxTower', [T0, T1, T2, T3], yT, 3);
      for (const [a2, c2] of [
        [T0, T1],
        [T1, T2],
        [T2, T3],
        [T3, T0],
      ])
        k.beam('darkRail', [a2[0], yT + 1.0, a2[1]], [c2[0], yT + 1.0, c2[1]], 0.05, 0.05);
      // 垂直藍玻璃帶（南面中段偏東，從三樓到塔頂）
      const ga = along(gxW(71, 49), eS, s0 + 1.2, 0.2),
        gb = along(gxW(71, 49), eS, s0 + 3.2, 0.2);
      k.quad(
        'stairGlass',
        [gb[0], B + 2 * fl, gb[1]],
        [ga[0], B + 2 * fl, ga[1]],
        [ga[0], yT - 0.8, ga[1]],
        [gb[0], yT - 0.8, gb[1]],
        [
          [0, 0],
          [1, 0],
          [1, (yT - 0.8 - B - 2 * fl) / 1.6],
          [0, (yT - 0.8 - B - 2 * fl) / 1.6],
        ]
      );
      // 直書三系名（塔南面西半、一二樓高）：藍「化學工程學系」、藍綠「生物醫學工程學系」、橘紅「機械工程學系」
      // 樓梯塔右邊（東側）主樓牆面，由西往東：墨綠「化學工程學系」、藍「生物醫學工程學系」、橘紅「機械工程學系」，三排錯開往上
      [
        ['化學工程學系', '#2f6a4a'],
        ['生物醫學工程學系', '#2f5fb0'],
        ['機械工程學系', '#d4502e'],
      ].forEach(([t, col], i) => {
        const p = along(gxW(71, 49), eS, s0 - 1.2 - i * 1.15, 0.08),
          hgt = [...t].length * 0.85,
          yb = B + fl + 0.4 + i * 0.9;
        sign(
          group,
          vText(`cGxDept${i}`, t, col, SANS, 128, 128 * [...t].length),
          0.85,
          hgt,
          p[0],
          yb + hgt / 2,
          p[1],
          eS.nx,
          eS.nz,
          0.12,
          0.2
        );
      });
      // 塔西側的入口雨遮（南側玻璃低樓的東端）：金屬面板招牌＋ LED 字幕
      const eSS = edge(gxW(53.6, 49.4), gxW(28, 59.4)); // 南側低樓南面（往西走）
      const cA = along(gxW(53.6, 49.4), eSS, 1.0, 0),
        cB = along(gxW(53.6, 49.4), eSS, 7.5, 0),
        cA2 = along(gxW(53.6, 49.4), eSS, 1.0, 2.6),
        cB2 = along(gxW(53.6, 49.4), eSS, 7.5, 2.6);
      const yc = B + 3.3;
      k.flat('steel', [cA, cB, cB2, cA2], yc, 2);
      k.flat('steel', [cA2, cB2, cB, cA], yc - 0.25, 2);
      k.wall('steel', cB2[0], cB2[1], cA2[0], cA2[1], yc - 0.25, yc + 0.02, 6.5, 0.3);
      {
        const p = along(gxW(53.6, 49.4), eSS, 4.25, 2.62);
        sign(group, gxSignTex(), 5.2, 1.3, p[0], yc + 0.68, p[1], eSS.nx, eSS.nz, 0.12, 0.5);
      }
      {
        const p = along(gxW(53.6, 49.4), eSS, 4.25, 2.63);
        sign(group, ledTex(), 4.4, 0.28, p[0], yc - 0.42, p[1], eSS.nx, eSS.nz, 0.6, 0.1);
      }
      // 入口玻璃門
      {
        const a = along(gxW(53.6, 49.4), eSS, 2.6, 0.03),
          b2 = along(gxW(53.6, 49.4), eSS, 5.9, 0.03),
          y0 = groundY(...along(gxW(53.6, 49.4), eSS, 4.2, 1.5));
        k.quad(
          'door',
          [b2[0], y0, b2[1]],
          [a[0], y0, a[1]],
          [a[0], y0 + 2.6, a[1]],
          [b2[0], y0 + 2.6, b2[1]]
        );
      }
    }
    // --- 中庭：草地與幾棵樹（src/world/MapBuilder.js 的樹長不進被輪廓擋住的中庭） ---
    {
      const Q = [
          [14.6, 22.6],
          [35.6, 22.6],
          [47.2, 46.6],
          [31.4, 49.3],
        ].map(([u, v]) => gxW(u, v)),
        r = lcg(53);
      k.flat('grass', Q, (x, z) => H(x, z) + 0.04, 4);
      for (const [u, v, sc] of [
        [22, 28, 1.1],
        [32, 31, 1.0],
        [37, 41, 1.15],
        [27, 42, 0.9],
      ]) {
        const p = gxW(u, v);
        tree(p[0], p[1], sc, r);
      }
    }
    // --- 西側低樓屋頂：紅磁磚露台、桌椅陽傘、花台、沿西面與西南圓弧外挑的鋼構棚架 ---
    {
      const Wp = gx.parts[1],
        yR = B + Wp.h,
        Q = GX_PARTS.W;
      const inset = Q.map(([u, v]) => {
        const cu = Q.reduce((s2, p) => s2 + p[0], 0) / Q.length,
          cv = Q.reduce((s2, p) => s2 + p[1], 0) / Q.length,
          du = u - cu,
          dv = v - cv,
          l = Math.hypot(du, dv);
        return gxW(u - (du / l) * 0.6, v - (dv / l) * 0.6);
      });
      k.flat('brickPave', inset, yR + 0.04, 1.2);
      for (const [u, v] of [
        [7, 27],
        [9, 31.5],
        [11, 36],
        [13.5, 41],
      ]) {
        const p = gxW(u, v);
        k.cyl('table', p[0], p[1], 0.5, yR + 0.7, yR + 0.75, 12);
        k.cyl('table', p[0], p[1], 0.05, yR, yR + 0.72, 6);
        k.cyl('table', p[0], p[1], 0.04, yR, yR + 2.3, 6);
        k.cyl('umbrella', p[0], p[1], 0.05, yR + 2.0, yR + 2.5, 10, true, 1.3);
      }
      for (const [u, v] of [
        [3.5, 25],
        [7.2, 33],
        [10, 40],
        [17, 45],
        [21.5, 52],
      ]) {
        const p = gxW(u, v);
        k.box('planter', p[0] - 0.6, p[0] + 0.6, yR, yR + 0.6, p[1] - 0.6, p[1] + 0.6);
        k.blob('leaf2', p[0], yR + 1.0, p[1], 0.7, 0.8);
      }
      // 西南圓弧面二～四樓的細窗帶：每層窗台上 1.0 m、高 0.45 m，貼在牆外 3 cm
      for (let f = 1; f < Wp.floors; f++) {
        const y0 = B + f * (Wp.h / Wp.floors) + 1.0;
        for (let i = 0; i < GX_ARC.pts.length - 1; i++) {
          const a = gxW(...GX_ARC.pts[i]),
            c2 = gxW(...GX_ARC.pts[i + 1]),
            mx = (a[0] + c2[0]) / 2,
            mz = (a[1] + c2[1]) / 2,
            cc = gxW(...GX_ARC.c);
          wallOut('arcSlot', a, c2, [mx - cc[0], mz - cc[1]], y0, y0 + 0.45, 0.03, 2, 0.45);
        }
      }
      // 外挑鋼構棚架（2017-09 使用者全景：屋頂一圈深色鋼梁沿西面、繞過西南圓弧往外挑，上面爬藤；
      // 正射 2024 的方格帶從西面中段一路繞到南面）：徑向挑梁每 1.4 m 一根，從牆內 0.9 m 挑到牆外 2.6 m，
      // 牆內、牆外 0.9 m、外緣三道縱梁，牆內那道每三根挑梁一根立柱落在露台上
      {
        const wallUV = [
          [0.62 + (GX_ARC.t1[0] - 0.62) * 0.35, 22 + (GX_ARC.t1[1] - 22) * 0.35],
          ...GX_ARC.pts,
          [28, 59.4],
        ];
        const Wp2 = wallUV.map(([u, v]) => gxW(u, v)),
          yP = yR + 1.5,
          cum = [0];
        for (let i = 1; i < Wp2.length; i++)
          cum.push(cum[i - 1] + Math.hypot(Wp2[i][0] - Wp2[i - 1][0], Wp2[i][1] - Wp2[i - 1][1]));
        const total = cum[cum.length - 1];
        // s 處的牆點與朝外法線（用分段的 pts 判斷哪一側在樓外）
        const at = (s) => {
          let i = 1;
          while (i < Wp2.length - 1 && cum[i] < s) i++;
          const a = Wp2[i - 1],
            c2 = Wp2[i],
            l = cum[i] - cum[i - 1],
            f = l > 0 ? (s - cum[i - 1]) / l : 0,
            p = [a[0] + (c2[0] - a[0]) * f, a[1] + (c2[1] - a[1]) * f];
          let nx = (c2[1] - a[1]) / l,
            nz = -(c2[0] - a[0]) / l;
          if (pip(p[0] + nx * 0.5, p[1] + nz * 0.5, Wp.pts)) [nx, nz] = [-nx, -nz];
          return { p, nx, nz };
        };
        const off = (q, o) => [q.p[0] + q.nx * o, q.p[1] + q.nz * o];
        const N = Math.max(2, Math.round(total / 1.4)),
          ribs = [];
        for (let i = 0; i <= N; i++) ribs.push(at((total * i) / N));
        ribs.forEach((q, i) => {
          const a = off(q, -0.9),
            c2 = off(q, 2.6);
          k.beam('pergola', [a[0], yP, a[1]], [c2[0], yP, c2[1]], 0.26, 0.1, [q.nz, -q.nx]);
          if (i % 3 === 0) k.cyl('pergola', a[0], a[1], 0.07, yR, yP, 6);
        });
        for (const o of [-0.9, 0.9, 2.6])
          for (let i = 0; i < N; i++) {
            const a = off(ribs[i], o),
              c2 = off(ribs[i + 1], o);
            k.beam('pergola', [a[0], yP + 0.16, a[1]], [c2[0], yP + 0.16, c2[1]], 0.12, 0.1);
          }
        // 爬藤：沿棚架零星幾叢（自己的 lcg，不動共用亂數）
        const rv = lcg(71);
        for (let i = 1; i < N; i += 2) {
          if (rv() < 0.35) continue;
          const c2 = off(ribs[i], 0.4 + rv() * 1.6);
          k.blob(rv() < 0.5 ? 'leaf' : 'leaf2', c2[0], yP + 0.35, c2[1], 0.7 + rv() * 0.5, 0.45);
        }
      }
      // 露台外緣白欄杆（在 0.8 m 女兒牆上）
      for (let i = 0; i < inset.length; i++) {
        const a = inset[i],
          c2 = inset[(i + 1) % inset.length];
        k.beam('rail', [a[0], yR + 1.15, a[1]], [c2[0], yR + 1.15, c2[1]], 0.05, 0.05, [0, 1]);
      }
    }
    // 碰撞：整棟輪廓的多邊形縮到中庭裡一小點，只剩三塊分段擋人（西南圓弧外那一角走得過去；
    // 中庭四周都是分段的牆，照樣進不去）
    collapse(gx.pts, gxW(32, 35));
  }

  k.finish(group);
  scene.add(group);
  I.updaters.push((dt, g) => {
    const n = g.night || 0;
    for (const m of glowMats) m.emissiveIntensity = n * 0.35 * m.userData.glow;
  });
  I.zoneC = { group };
  return group;
}
