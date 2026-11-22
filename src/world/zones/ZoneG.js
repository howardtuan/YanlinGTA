// G 區「南側活動區」校內建築外觀（這裡只做外觀；學活室內在 js/sac.js、力行宿舍室內在 js/lixing.js）。
// 做法同 js/weiche.js：js/map.js 照舊用 OSM 輪廓蓋牆（輪廓、類型不動，共用亂數抽取次數不變），
// zoneGLook() 只換外觀 look／分段高度（在 js/main.js 套用），buildZoneG() 自建輪廓表達不了的構件，
// zoneGFootprints() 是自建構件伸出輪廓外的保留範圍。
//
// 依據（campus-survey/PLAN.md G 區、zone-G.md）：
//  - 學生活動中心 w392023427：屋頂完整長方形（正射 2024），麥當勞是一樓弧形黑框玻璃店面、上層懸挑在上面、
//    圓柱落在玻璃外（評論相片 2023-01、2025-11）；東北角郵局也是弧形玻璃、綠白「郵局 POST」招牌（2025-09）；
//    屋頂北側中央長弧頂採光罩約 64×10 m；外牆米灰小方磁磚、灰框凹窗、窗下黑色冷氣架；
//    西面一道垂直淺綠玻璃帶、往生科館的淺灰箱形空橋（官方街景 2017-09）。
//    麥當勞室內（js/interiors.js buildMcD）照舊，上層懸挑和弧形玻璃包在它外面。
//  - 生物科技館 w392023428：主體＋東側窄塔＋南翼（正射），東側淡綠玻璃樓梯塔從地面到頂（2026-05），
//    與學活之間空橋寬 3.3 m，牆米灰偏紫磁磚，西南玻璃門廳（2017-09）；東北角金色直書館名。
//  - 全人教育村 w392023429：北棟西段褐磚（2026-05）；南棟圓柱玻璃磚樓梯塔、半圓玻璃磚低量體、主牆褐紅磚
//    （官方街景 2026-05）。北棟金屬盒、圓形中棟照 PLAN 先保持。
//  - 室內游泳池 w392023430：屋脊偏北的不對稱雙坡、玫瑰紅浪板，東西兩端各一條約 5 m 藍灰玻璃帶（正射）；
//    西面橘紅門框（兩根方柱加橫樑、直書白字）、右側玻璃帶、左側黑色拱形雕塑，沒有小披簷（2017-09）。
//  - 體育館 w392023437：紅瓦斜裙主要在西側（約 7 m 寬），其他邊窄（正射）；西北角米褐圓柱樓梯塔、直立縫窗、
//    頂有天線，橘紅屋簷與腰帶，旁邊橘紅平頂雨廊亭（2017-09）；西面入口橘紅門廊框架加倒 V 斜撐、兩根灰圓柱。
//  - 力行大樓 w392023431：藍色偏粉 #6f86b8；東端山牆灰色清水混凝土空白牆、比本體高、掛紫紅大布條（2026-05）；
//    東面每層橫向長窗加白色出挑遮陽板（2017-09）。
// 沒有影像的面照同棟看得到的面推，入口、招牌等特殊構件不編。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H, Hgrid, groundY, surfaceAt, addPit, addBridge, LV_DECK } from '../Terrain.js';

export const G_IDS = { sac: 'w392023427', bio: 'w392023428', qr: 'w392023429', pool: 'w392023430', gym: 'w392023437', lx: 'w392023431' };

// ---------------- 學活的幾何（世界座標，x 向東、z 向南） ----------------
const SAC = {
  xW: -195.0, xE: -112.0, zN: -129.9, zS: -94.4, // OSM 輪廓（東南角被 sacTrimmedPts 挖給麥當勞室內）
  ov: 5.8,           // 懸挑上層的底（= 麥當勞店面＋招牌帶的頂）
  roof: 13.8, par: 14.4,
  dS: 3.0, dE: 2.4, dN: 1.0, // 南、東、北側懸挑深度
  xS0: -155.5,       // 南面柱廊西端（再往西是往二樓門廊的大階梯 x -162.5..-156.1）
  xN0: -124.0,       // 北面轉角懸挑西端
  mcd: { x0: -136, x1: -112, z0: -114, z1: -94 },
};
// 生科館切成主體／東側窄塔／南翼的分界
const BIO = { xT: -206.5, zW: -101.0, hMain: 30.3, hTower: 31.9, hWing: 26.9 };
// 空橋：生科館東側塔 → 學活西面，寬 3.3 m，約三樓
export const BRIDGE = { x0: -200.5, x1: -195.0, z0: -103.6, z1: -100.3, y0: 7.0, y1: 10.3 };
// 學活外牆上真的能走過去的門（js/sac.js 的室內用同一組數字挖門洞、留碰撞缺口）：
// s1 一樓南面入口、s2 二樓南面（沒有門，大階梯頂的平台和門廊整段敞開，直接走進中庭）、n1 一樓北面出口、nb 二樓北面接新中北路天橋（x 範圍）；wb 三樓西面接往生科館的空橋（z 範圍）
export const SAC_DOORS = { s1: [-152.17, -150.19], s2: [-162.5, -148.15], n1: [-148.8, -147.2], nb: [-164.4, -162.0], wb: [-103.2, -100.7] };

// ---------------- 外觀 look（js/main.js 在 map.js 蓋樓前套用） ----------------
// 只改 look、分段（parts＋splitAc 讓屋頂冷氣的 rnd2 抽取照舊）、高度；輪廓 pts、kind 都不動
export function zoneGLook(b) {
  if (b.id === G_IDS.sac) {
    b.look = {
      wall: { base: 'tile', colour: '#e4e2dc' },
      // 一樓北面是黑框格子大玻璃窗，上面 3 層灰框凹窗
      windows: { types: ['curtain', 'punched', 'punched', 'punched'], bay: 3.0, accent: '#8b8984', glass: '#4d5862' },
      roof: { colour: '#a3a29d' }, // 屋頂中央的灰盒拿掉，改成北側長弧頂採光罩（buildZoneG）
    };
  } else if (b.id === G_IDS.bio) {
    const L = b.look || {};
    b.look = { ...L, wall: { base: 'tile', colour: '#82787a' }, roof: { colour: '#b9b9b4' } }; // 西北角樓梯塔盒拿掉
    const cl = (keep) => clipPoly(b.pts, keep);
    const main = cl(([x, z]) => [BIO.xT - x, BIO.zW - z]), tower = cl(([x]) => [x - BIO.xT]), wing = cl(([x, z]) => [BIO.xT - x, z - BIO.zW]);
    if (main.length > 2 && tower.length > 2 && wing.length > 2) {
      b.parts = [{ pts: main, floors: 9, h: BIO.hMain, label: '主體' }, { pts: tower, floors: 9, h: BIO.hTower, label: '東側樓梯塔' }, { pts: wing, floors: 8, h: BIO.hWing, label: '南翼' }];
      b.splitAc = 1;
    }
  } else if (b.id === G_IDS.qr) {
    if (b.look?.wall) b.look.wall.colour = '#7a675f'; // 暗褐色面磚
  } else if (b.id === G_IDS.pool) {
    // 單層挑高（簷高約 8.5 m）、大型鋼框窗間距約 9 m；屋頂由 buildZoneG 蓋不對稱雙坡
    b.h = 8.5; b.floors = 2;
    b.look = {
      wall: { base: 'smooth', colour: '#7a6b60' },
      windows: { types: ['none', 'grid'], bay: 9, accent: '#3a3d40', glass: '#55646c' },
      parapet: { h: 0.0 },
      roof: { colour: '#8d8984', ac: false },
    };
  } else if (b.id === G_IDS.gym) {
    // 橘紅門廊、圓柱樓梯塔改由 buildZoneG 照實景位置蓋（原本的拱門 portal、東南角 stair_drum 拿掉）
    b.feature = (b.feature || []).filter(f => f !== 'stair_drum' && f !== 'entrance_canopy');
    if (b.parts?.[0]) b.parts[0].h = 14.5;
    const L = b.look || {};
    b.look = {
      wall: { base: 'smooth', colour: '#9c8a78' },
      windows: { types: ['none', 'ribbon', 'none'], bay: 4, accent: '#2c2f33', glass: '#3f4c56' },
      bands: [{ colour: '#c0582e', h: 0.45, depth: 0.2, to: 2 }],
      parapet: { h: 0.8, colour: '#c0582e' },
      roof: { colour: L.roof?.colour || '#9a5a3a' },
    };
  } else if (b.id === G_IDS.lx) {
    if (b.look?.wall) b.look.wall.colour = '#6f86b8';
    if (b.look) b.look.plinth = { floors: 1, colour: '#e6e4de' }; // 一樓白色抹灰牆
  }
}

// 凸多邊形以外也可用的半平面裁切：keep(p) 回傳 [d1, d2…]，全部 >= 0 的部分保留
function clipPoly(pts, keep) {
  let P = pts.map(p => [p[0], p[1]]);
  const n = keep(P[0]).length;
  for (let k = 0; k < n; k++) {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length], da = keep(a)[k], dc = keep(c)[k];
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (dc >= 0)) { const t = da / (da - dc); out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]); }
    }
    P = out; if (P.length < 3) return [];
  }
  return P;
}

// ---------------- 學活南面下沉舞台＋B1 麥當勞、往二樓的大階梯（地形，js/main.js 在蓋地圖前呼叫） ----------------
// 相片（2022～2025 評論相片、2024 正射）與使用者給的 B1 平面圖：南面廣場往北下降約 3.3 m 到 B1。
// B1 由西到東：樓梯廳（北）＋學習區（南）、學習區西南往南凸出到廣場底下的學餐攤販（js/sac_b1.js）、
// 麥當勞（js/interiors.js，整間轉 180 度，點餐大廳在西邊、直接通學習區，南牆封起來），
// 麥當勞南牆外是黑框弧形玻璃的練舞室，前面一塊 B1 小廣場，再往南是看台；B1 入口在攤販東邊、玻璃房西邊（街景：入口上方掛影印部、全家的招牌，進去右轉才是麥當勞），
// 西段中間有黃色扶手的直跑樓梯從廣場下來正對入口。再往西是長花台、紅磚平台和往二樓門廊的大階梯
// （x -162.5..-156.1，約 22 階、上升約 3.8 m）。坑都互相重疊幾公分（H() 用嚴格不等式，留縫會長出地形脊）。
// 學活的 base 用 Hgrid 算（js/map.js footBase），坑壓到它的輪廓也不會下沉。
export const PIT = {
  depth: 3.3,
  shop: [-135.95, -113.95, -111.9, -93.9],     // x0, z0, x1, z1：麥當勞室內（B1）
  west: [-152.05, -114.05, -135.9, -94.42],    // 樓梯廳＋學習區（學活底下）
  stall: [-152.05, -94.5, -142.65, -89.45],    // 學餐攤販（廣場底下：地面照畫，上面放甲板）
  court: [-142.7, -94.5, -114.7, -78.0],       // 下沉區（入口前平地、西段樓梯、玻璃房、小廣場、看台）
  flatW: -88.5,                                // 入口前的 B1 平地到這裡，再往南是西段樓梯
  flatE: -85.0,                                // 玻璃房前的小廣場到這裡，再往南是看台
  split: -136.0,                               // 西段樓梯／東段看台的分界（樓梯對齊入口 x -142.7..-136）
};
// 練舞室：麥當勞南牆外的黑框弧形玻璃房（弦在 z -94.0，往南凸出 sag m），沒有門
export const ROOM = { A: [-135.6, -94.0], B: [-115.1, -94.0], sag: 5.5 };
// 大階梯：從入口前庭（不是廣場地面）起步，rise 是廣場地面到二樓門廊的總高度；頂端平台北緣貼學活南牆（-94.42，跟門廊齊）
export const STAIR2F = { x: -159.3, w: 6.4, zFoot: -82.4, zTop: -92.55, rise: 3.8, steps: 20, landing: [-162.5, -94.42, -156.1, -92.55] };
// 一樓入口前庭（官方街景 2017-09、正射 2024）：比廣場高 4 階（約 0.6 m），南緣一整排小階梯：
// 西段東西向，到 x -154 轉成往東北斜，斜到長花台西南角（街景從南面看是由左下往右上斜退、正射的斜邊）。
// 前庭東到長花台西緣（x -144.9，靠前庭這面是一道比前庭高 0.9 m 的花崗石矮牆），西到大階梯西緣，北到學活南牆；
// 大階梯就從前庭起步。入口是柱廊最西兩根圓柱之間的寬開間（x -154.75..-147.6，原本中間那根拿掉），
// 地面是紅磚（大階梯東緣到長花台、牆邊往南約 8 m），其他是淺灰花崗石。
// 前庭東半在 B1 學餐攤販正上方（PIT.stall：H() 在那裡是 B1 地面），那塊不能用 pad（B1 的人會被抬上來），
// 改用甲板（buildZoneG）；pad 跟甲板相接的邊用 open 不畫牆、不封。
export const FORE = {
  rise: 0.6, steps: 4, depth: 1.5,                            // 小階梯 4 階、深 1.5 m
  top: [[-162.6, -75.6], [-154.0, -75.6], [-145.6, -80.2]],   // 小階梯頂緣（= 前庭南緣）：西端、轉折、東端
  xE: -144.9, nook: -143.0, nookZ: -92.7,                     // 東緣（長花台西緣）；花台北邊到柱廊矮牆之間的小角落
  brick: [-156.1, -94.42, -145.4, -86.6],                     // 紅磚範圍 x0, z0, x1, z1
  door: [-154.2, -148.15],                                    // 一樓入口（兩根圓柱之間，圓柱在 -154.75、-147.6）
  colB: -147.6,                                               // 入口東側圓柱
  porch: [-156.1, -94.42, -148.15, -92.05],                   // 二樓門廊（入口正上方，從大階梯頂往東延伸到入口東側圓柱）
};
let pitY = null, landY = null, foreY = null;
export function zoneGTerrain(data) {
  const g0 = Hgrid(-125, -100);
  pitY = g0 - PIT.depth;
  addPit(...PIT.shop, pitY); addPit(...PIT.west, pitY); addPit(...PIT.stall, pitY, { mask: false }); addPit(...PIT.court, pitY);
  const L = data.levels || (data.levels = {}); L.stairs = L.stairs || []; L.pads = L.pads || [];
  const [x0, , x1, z1] = PIT.court, site = '學生活動中心南面下沉舞台';
  const top = (x) => Hgrid(x, z1 + 0.5);
  const xw = (x0 + PIT.split) / 2, xe = (PIT.split + x1) / 2;
  L.stairs.push({ id: 'sac_b1_west', site, a: [xw, PIT.flatW], b: [xw, z1], w: PIT.split - x0, y0: pitY, y1: top(xw), steps: 20, rail: 'center', railColour: '#e0b52a', wall: 'granite' });
  L.stairs.push({ id: 'sac_b1_stage', site, a: [xe, PIT.flatE], b: [xe, z1], w: x1 - PIT.split, y0: pitY, y1: top(xe), steps: 10, wall: 'granite', top: '#c4beb3' });
  // 一樓入口前庭與南緣的 4 階小階梯（頂緣折線每一段一座，往前庭裡面爬）。
  // （map.js 的邊每 0.5 m 取樣一次，階梯兩端和轉折處各約 0.5 m 會被封起來，當作階梯的擋牆）
  const F = FORE, T = F.top, st = PIT.stall;
  foreY = Hgrid(-153, -86) + F.rise;
  T.slice(1).forEach(([bx, bz], i) => {
    const [ax, az] = T[i], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const nx = uz, nz = -ux; // 往北（往前庭裡面）的法線
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    L.stairs.push({ id: `sac_1f_steps${  i ? i + 1 : ''}`, site: '學生活動中心一樓入口前庭', a: [mx - nx * F.depth, mz - nz * F.depth], b: [mx, mz], w: len, y0: 'ground', y1: foreY, steps: F.steps, wall: 'granite', rail: 'none' });
  });
  // pad：攤販上方那塊挖掉（甲板），接甲板的兩條邊（open）；大階梯的東側與起步處接前庭
  const S2 = STAIR2F, xb = S2.x + S2.w / 2, tE = T[T.length - 1];
  const pts = [...T, [F.xE, tE[1]], [F.xE, st[3]], [st[0], st[3]], [st[0], -94.42], [xb, -94.42], [xb, S2.zFoot], [T[0][0], S2.zFoot]];
  const io = T.length + 1; // [F.xE, st[3]] 的序號：它開始的兩條邊接甲板
  L.pads.push({ id: 'sac_1f_forecourt', site: '學生活動中心一樓入口前庭', y: foreY, top: '#d3d0c9', wall: 'granite', open: [io, io + 1], pts });
  // 往二樓門廊的大階梯（從前庭起步）與頂端平台（從門廊的門走進學活二樓，js/sac.js）
  const gl = Hgrid(S2.x, S2.zTop - 1);
  landY = gl + S2.rise;
  L.stairs.push({ id: 'sac_2f_stair', site: '學生活動中心南面大階梯', a: [S2.x, S2.zFoot], b: [S2.x, S2.zTop], w: S2.w, y0: foreY, y1: landY, steps: S2.steps, rail: 'none', wall: 'granite' }); // 兩側實心矮牆在 buildZoneG
  const [lx0, lz0, lx1, lz1] = S2.landing;
  // 東邊（邊 1）接入口上方的二樓門廊甲板（buildZoneG），不封；西緣的實心矮牆在 buildZoneG
  L.pads.push({ id: 'sac_2f_landing', site: '學生活動中心二樓門廊', y: landY, top: '#cdbfae', wall: 'granite', open: [0, 1], pts: [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]] }); // 北邊（邊 0）直接進學活二樓中庭
  return { pitY, landY, foreY };
}

// ---------------- 保留範圍（伸出 OSM 輪廓的部分：柱廊、空橋、門廊、塔、雕塑、雨廊亭） ----------------
export function zoneGFootprints() {
  const r = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  return [
    r(-160.5, SAC.zS, SAC.xE + SAC.dE + 0.3, SAC.zS + SAC.dS + 0.3), // 學活南面柱廊（範圍沿用第一版，保留範圍不變）
    r(SAC.xE, SAC.zN - SAC.dN - 0.3, SAC.xE + SAC.dE + 0.3, SAC.zS),         // 東面柱廊（郵局轉角）
    r(SAC.xN0, SAC.zN - SAC.dN - 0.3, SAC.xE, SAC.zN),                       // 北面轉角懸挑
    r(BRIDGE.x0, BRIDGE.z0 - 0.3, BRIDGE.x1, BRIDGE.z1 + 0.3),               // 空橋
    ...poolFootprints(), ...gymFootprints(),
  ];
}

// ---------------- 貼圖 ----------------
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
const tiles = (g, W, Hh, base, step, seed) => {
  const r = lcg(seed); g.fillStyle = base; g.fillRect(0, 0, W, Hh);
  for (let y = 0; y < Hh; y += step) for (let x = 0; x < W; x += step) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(x, y, step, step); }
  g.fillStyle = 'rgba(120,115,105,0.18)'; for (let y = 0; y < Hh; y += step) g.fillRect(0, y, W, 1); for (let x = 0; x < W; x += step) g.fillRect(x, 0, 1, Hh);
};
// 學活外牆：4 個開間（12 m）× 1 層（3.3 m）。米灰小方磁磚、灰色混凝土凸框、深色玻璃、部分窗下黑色冷氣架
const PX = 1024 / 12;
const sacFacadeTex = () => ctex('gSacFacade', 1024, Math.round(3.3 * PX), (g, W, Hh) => {
  tiles(g, W, Hh, '#e4e2dc', 9, 11);
  for (let i = 0; i < 4; i++) {
    const cx = (i + 0.5) * 3 * PX, fw = 1.75 * PX, fh = 1.7 * PX, y0 = Hh - 2.45 * PX; // 窗框頂在樓板上 2.45 m
    g.fillStyle = '#8b8984'; g.fillRect(cx - fw / 2, y0, fw, fh);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - fw / 2, y0 + fh, fw, 4);
    const gw = 1.3 * PX, gh = 1.3 * PX, gx = cx - gw / 2, gy = y0 + (fh - gh) / 2;
    const gr = g.createLinearGradient(0, gy, 0, gy + gh); gr.addColorStop(0, '#5b6a76'); gr.addColorStop(1, '#2f3a43');
    g.fillStyle = gr; g.fillRect(gx, gy, gw, gh);
    g.fillStyle = '#4a4c4e'; g.fillRect(cx - 2, gy, 4, gh); g.fillRect(gx, gy + gh * 0.35, gw, 3);
    if (i % 2 === 0) { // 黑色鐵製冷氣架
      const aw = 0.95 * PX, ah = 0.6 * PX, ax = cx - aw / 2, ay = y0 + fh + 0.12 * PX;
      g.fillStyle = 'rgba(20,20,22,0.92)'; g.fillRect(ax, ay, aw, ah);
      g.strokeStyle = '#4a4a4c'; g.lineWidth = 2; for (let x = ax + 6; x < ax + aw; x += 7) { g.beginPath(); g.moveTo(x, ay); g.lineTo(x, ay + ah); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(ax, ay + ah, aw, 6);
    }
  }
});
const sacPlainTex = () => ctex('gSacPlain', 256, 256, (g, W, Hh) => tiles(g, W, Hh, '#e4e2dc', 9, 12));
// 弧形玻璃店面：一格 3 m 寬、整片 5.8 m 高（直櫺每 0.75 m，招牌帶 2.9～3.6 m）
const shopGlassTex = (key, band, lit, HT = 5.8, BAND = [2.9, 3.6], RAILS = [0.05, 0.45, 2.9, 3.6, 4.7, 5.75]) => ctex(key, 512, 1024, (g, W, Hh) => {
  const r = lcg(key.length * 97), m = Hh / HT;
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, lit[0]); gr.addColorStop(0.55, lit[1]); gr.addColorStop(1, lit[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(255,226,170,${0.35 + r() * 0.3})`; g.beginPath(); g.arc(30 + r() * (W - 60), 40 + r() * 120, 6, 0, 7); g.fill(); } // 室內吊燈
  for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(30,22,16,0.75)'; g.fillRect(r() * W, Hh - 1.1 * m - r() * 0.3 * m, 50 + r() * 60, 0.5 * m); } // 桌椅剪影
  const rf = g.createLinearGradient(0, 0, W, Hh); rf.addColorStop(0, 'rgba(200,220,230,0.2)'); rf.addColorStop(0.5, 'rgba(200,220,230,0.03)'); rf.addColorStop(1, 'rgba(200,220,230,0.16)');
  g.fillStyle = rf; g.fillRect(0, 0, W, Hh);
  if (band) { g.fillStyle = band; g.fillRect(0, Hh - BAND[1] * m, W, (BAND[1] - BAND[0]) * m); }
  g.fillStyle = '#18191b';
  for (let x = 0; x <= W; x += W / 4) g.fillRect(x - 3, 0, 6, Hh);
  for (const y of RAILS) g.fillRect(0, Hh - y * m - 3, W, 6);
});
// 淡綠玻璃帷幕（生科館樓梯塔、學活西面玻璃帶）：鋁框 1.2 m × 1.65 m
const greenCurtainTex = () => ctex('gGreenCurtain', 256, 352, (g, W, Hh) => {
  const gr = g.createLinearGradient(0, 0, W, Hh); gr.addColorStop(0, '#9cc4b8'); gr.addColorStop(0.5, '#7fa99f'); gr.addColorStop(1, '#a9cdc2');
  g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, W * 0.4, Hh);
  g.fillStyle = '#b9c0c0'; g.fillRect(0, 0, 8, Hh); g.fillRect(W / 2 - 3, 0, 6, Hh); g.fillRect(0, 0, W, 8); g.fillRect(0, Hh / 2 - 3, W, 6);
});
// 玻璃磚（全人南棟樓梯塔）：0.2 m 方磚，每層一圈褐磚帶
const glassBlockTex = () => ctex('gGlassBlock', 256, 256, (g, W, Hh) => {
  const r = lcg(5); g.fillStyle = '#8f9a9c'; g.fillRect(0, 0, W, Hh);
  const s = W / 8;
  for (let y = 0; y < Hh; y += s) for (let x = 0; x < W; x += s) {
    const v = 175 + Math.floor(r() * 35); g.fillStyle = `rgb(${v - 8},${v},${v + 4})`; g.fillRect(x + 3, y + 3, s - 6, s - 6);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 5, y + 5, s - 14, 3);
  }
});
// 玫瑰紅金屬浪板（游泳池屋頂）
const roofSheetTex = () => ctex('gRoofSheet', 128, 128, (g, W, Hh) => {
  g.fillStyle = '#b5545c'; g.fillRect(0, 0, W, Hh);
  for (let x = 0; x < W; x += 8) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, 0, 3, Hh); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 5, 0, 2, Hh); }
});
// 藍灰格狀玻璃（游泳池屋頂兩端、學活採光罩）
const roofGlassTex = () => ctex('gRoofGlass', 128, 128, (g, W, Hh) => {
  g.fillStyle = '#7f95a3'; g.fillRect(0, 0, W, Hh);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, W / 2, Hh / 2);
  g.fillStyle = '#4c5860'; for (let x = 0; x < W; x += W / 4) g.fillRect(x, 0, 3, Hh); g.fillRect(0, 0, W, 3); g.fillRect(0, Hh / 2, W, 2);
});
// 紅磚瓦（體育館斜裙）
const tileRoofTex = () => ctex('gTileRoof', 128, 128, (g, W, Hh) => {
  const r = lcg(9); g.fillStyle = '#c0603e'; g.fillRect(0, 0, W, Hh);
  for (let y = 0; y < Hh; y += 8) { g.fillStyle = 'rgba(60,20,10,0.35)'; g.fillRect(0, y, W, 2); for (let x = (y / 8) % 2 * 6; x < W; x += 12) { g.fillStyle = `rgba(${r() < 0.5 ? '255,200,170' : '80,30,20'},${0.08 + r() * 0.1})`; g.fillRect(x, y + 2, 11, 6); } }
});
// 灰色清水混凝土
const concTex = () => ctex('gConc', 256, 256, (g, W, Hh) => {
  const r = lcg(31); g.fillStyle = '#8d8d88'; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,40,38'},${0.03 + r() * 0.05})`; g.fillRect(r() * W, r() * Hh, 2 + r() * 9, 2 + r() * 9); }
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(40,40,38,0.08)'; g.fillRect(r() * W, 0, 2 + r() * 4, Hh); } // 雨水漬
});
// 力行東面：清水混凝土，每層一條橫向長窗（2 樘一組）
const lxEastTex = () => ctex('gLxEast', 512, 165, (g, W, Hh) => {
  g.drawImage(concTex().image, 0, 0, W, Hh);
  const m = W / 10; // 10 m 一個貼圖
  for (const x0 of [0.6, 5.6]) {
    g.fillStyle = '#2f3a40'; g.fillRect(x0 * m, Hh - 2.35 * m, 3.8 * m, 1.15 * m);
    g.fillStyle = 'rgba(190,200,205,0.35)'; g.fillRect(x0 * m, Hh - 2.35 * m, 3.8 * m, 0.4 * m);
    g.fillStyle = '#c9c7c0'; for (let x = x0; x <= x0 + 3.81; x += 0.95) g.fillRect(x * m - 1, Hh - 2.35 * m, 3, 1.15 * m);
    g.strokeStyle = 'rgba(60,60,60,0.6)'; g.lineWidth = 1; for (let x = x0 * m; x < (x0 + 3.8) * m; x += 6) { g.beginPath(); g.moveTo(x, Hh - 2.35 * m); g.lineTo(x + 6, Hh - 1.2 * m); g.stroke(); }
  }
});
function textTex(key, w, h, draw) { return ctex(key, w, h, draw, false); }
const mcdSignTex = () => textTex('gMcdSign', 1024, 128, (g, W, Hh) => {
  g.fillStyle = '#1c1c1e'; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = '#ffbc0d'; g.lineWidth = 16; g.beginPath(); // 金色拱門
  g.moveTo(40, 112); g.bezierCurveTo(40, 10, 100, 10, 100, 80); g.bezierCurveTo(100, 10, 160, 10, 160, 112); g.stroke();
  g.fillStyle = '#f4f4f2'; g.font = '800 84px "Helvetica Neue",Arial,sans-serif'; g.textBaseline = 'middle'; g.fillText("McDonald's", 200, Hh / 2 + 4);
});
const postSignTex = () => textTex('gPostSign', 1024, 160, (g, W, Hh) => {
  g.fillStyle = '#f2f4f0'; g.fillRect(0, 0, W * 0.42, Hh); g.fillStyle = '#2fa24a'; g.fillRect(W * 0.42, 0, W * 0.58, Hh);
  g.fillStyle = '#c8262c'; g.beginPath(); g.arc(80, Hh / 2, 52, 0, 7); g.fill(); g.fillStyle = '#f2f4f0'; g.beginPath(); g.arc(80, Hh / 2, 38, 0, 7); g.fill();
  g.fillStyle = '#c8262c'; g.font = '900 52px "Noto Sans TC","PingFang TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('郵', 80, Hh / 2 + 3);
  g.fillStyle = '#2f7a3a'; g.font = '900 96px "Noto Sans TC","PingFang TC",sans-serif'; g.fillText('郵 局', 270, Hh / 2 + 6);
  g.fillStyle = '#ffffff'; g.font = '800 104px "Helvetica Neue",Arial,sans-serif'; g.fillText('POST', 690, Hh / 2 + 6);
});
const vText = (key, text, colour, bg, font, w = 160, h = 1024) => textTex(key, w, h, (g, W, Hh) => {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, Hh); }
  const chars = [...text], step = Hh / chars.length, px = Math.min(W * 0.78, step * 0.82);
  g.font = `900 ${px}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((c, i) => { if (c === ' ') return; g.fillStyle = 'rgba(40,25,10,0.45)'; g.fillText(c, W / 2 + 3, step * (i + 0.5) + 4); g.fillStyle = colour; g.fillText(c, W / 2, step * (i + 0.5)); });
});
// 力行東端山牆的紫紅大布條（內容會換，用通用色塊和校名）
const lxBannerTex = () => textTex('gLxBanner', 512, 1024, (g, W, Hh) => {
  g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, W, 150);
  g.fillStyle = '#7a1f6e'; g.fillRect(0, 150, W, 650);
  g.fillStyle = '#e9e7f0'; g.fillRect(0, 800, W, Hh - 800);
  g.fillStyle = '#7a1f6e'; g.font = '900 72px "Noto Serif TC","Songti TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('中原大學', W / 2, 78);
  g.fillStyle = '#f3c64a'; g.font = '900 110px "Noto Sans TC","PingFang TC",sans-serif'; g.fillText('狂賀', W / 2, 270);
  g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 7; i++) g.fillRect(60, 380 + i * 52, W - 120 - (i % 3) * 40, 22);
  g.fillStyle = 'rgba(60,60,90,0.5)'; for (let i = 0; i < 3; i++) g.fillRect(40 + i * 150, 840, 120, 140);
});

// 學活一樓入口前庭：淺灰花崗石板（60 cm 見方，一張貼圖 2.4 m）、入口前紅磚（20×10 cm 錯縫，一張 1.2 m）
const foreGraniteTex = () => ctex('gForeGranite', 256, 256, (g, W, Hh) => {
  const r = lcg(41), s = W / 4;
  g.fillStyle = '#d5d2cb'; g.fillRect(0, 0, W, Hh);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + r() * 0.05})`; g.fillRect(x * s, y * s, s, s); }
  for (let i = 0; i < 2400; i++) { const v = 150 + r() * 90 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.45)`; g.fillRect(r() * W, r() * Hh, 1.5, 1.5); }
  g.fillStyle = 'rgba(105,100,92,0.4)'; for (let i = 0; i < 4; i++) { g.fillRect(0, i * s, W, 1.5); g.fillRect(i * s, 0, 1.5, Hh); }
});
const foreBrickTex = () => ctex('gForeBrick', 256, 256, (g, W, Hh) => {
  const r = lcg(43), bw = W / 6, bh = Hh / 12;
  g.fillStyle = '#9a7468'; g.fillRect(0, 0, W, Hh); // 灰縫
  for (let row = 0; row < 12; row++) for (let i = -1; i < 7; i++) {
    const x = i * bw + (row % 2 ? bw / 2 : 0);
    g.fillStyle = `hsl(${6 + r() * 10},${42 + r() * 14}%,${44 + r() * 10}%)`; g.fillRect(x + 1.5, row * bh + 1.5, bw - 3, bh - 3);
  }
});
// 二樓門廊前緣樑上的金色書法字「活動中心」（由右往左讀，貼圖由左往右畫「心中動活」）
const sacNameTex = () => textTex('gSacName', 1024, 192, (g, W, Hh) => {
  g.clearRect(0, 0, W, Hh); g.font = '900 150px "Noto Serif TC","Songti TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['心', '中', '動', '活'].forEach((t, i) => { const x = W * (i + 0.5) / 4; g.fillStyle = 'rgba(50,35,10,0.55)'; g.fillText(t, x + 4, Hh / 2 + 7); g.fillStyle = '#c6a050'; g.fillText(t, x, Hh / 2 + 3); });
});
// 入口兩條直布條（內容會換：只畫外框、抬頭字與字塊）
const sacBannerTex = (key, bg, fg, head) => textTex(key, 128, 512, (g, W, Hh) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(8, 8, W - 16, Hh - 16);
  let y0 = 34;
  if (head) {
    const s = W - 52; g.fillStyle = fg; g.fillRect(26, 24, s, s);
    g.fillStyle = bg; g.font = '900 60px "Noto Sans TC","PingFang TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(head, W / 2, 24 + s / 2 + 3);
    y0 = 24 + s + 18;
  }
  g.fillStyle = fg; for (let i = 0; i < 2; i++) for (let y = y0; y < Hh - 30; y += 24) if ((y * 7 + i * 13) % 6) g.fillRect(30 + i * 40, y, 28, 17);
});

// ---------------- 材質 ----------------
const MATS = {};
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const lit = (map, k = 0.45) => new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: k, roughness: 0.15, metalness: 0.3, side: THREE.DoubleSide });
  const m = {
    sacFacade: () => std({ map: sacFacadeTex() }),
    sacPlain: () => std({ map: sacPlainTex() }),
    soffit: () => std({ color: '#d3cfc6', roughness: 0.95 }),
    column: () => std({ color: '#e8e2d2', roughness: 0.7 }),
    roofGrey: () => std({ color: '#a3a29d', roughness: 0.95 }),
    // B1 到懸挑底約 9.1 m：下段 B1 店面、3.0～3.7 m 黑色招牌帶、上段一樓用餐區
    mcdGlass: () => lit(shopGlassTex('gMcdGlassB1', '#1c1c1e', ['#5d5a52', '#6f5a40', '#2d241c'], 9.1, [3.0, 3.7], [0.05, 0.45, 2.4, 3.0, 3.7, 5.2, 6.8, 9.05])),
    mcdUpper: () => lit(shopGlassTex('gMcdUpper', null, ['#5f5c55', '#6b5a44', '#352b22'], 5.8, [0, 0], [0.05, 1.1, 3.4, 4.6, 5.75]), 0.35),
    danceFloor: () => std({ color: '#b98a57', roughness: 0.45, emissive: '#b98a57', emissiveIntensity: 0.12 }),
    mirror: () => std({ color: '#cfd6da', roughness: 0.05, metalness: 0.9, emissive: '#9aa4aa', emissiveIntensity: 0.15 }),
    pitFloor: () => std({ color: '#a9a49b', roughness: 0.85 }),
    planter: () => std({ color: '#b9b4aa', roughness: 0.8 }),
    shrub: () => std({ color: '#4f7a3a', roughness: 0.95 }),
    balcony: () => std({ color: '#c8c6c0', roughness: 0.9 }),
    railYellow: () => std({ color: '#e0b52a', metalness: 0.4, roughness: 0.45 }),
    postGlass: () => lit(shopGlassTex('gPostGlass', '#2fa24a', ['#4a6f86', '#4e5a5e', '#2a2f32']), 0.3),
    greenGlass: () => std({ map: greenCurtainTex(), roughness: 0.15, metalness: 0.35 }),
    skylight: () => new THREE.MeshStandardMaterial({ map: roofGlassTex(), color: '#dfe6e6', roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide }),
    rib: () => std({ color: '#8e9396', metalness: 0.5, roughness: 0.45 }),
    lamp: () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff2d6', emissiveIntensity: 0.8 }),
    bridge: () => std({ color: '#c9c8c3', roughness: 0.9 }),
    win: () => std({ color: '#3d4f5c', roughness: 0.15, metalness: 0.5 }),
    bioLobby: () => lit(shopGlassTex('gBioLobby', null, ['#56656c', '#4b5559', '#2c3134']), 0.2),
    gold: () => std({ color: '#c9a45c', metalness: 0.7, roughness: 0.35 }),
    glassBlock: () => new THREE.MeshStandardMaterial({ map: glassBlockTex(), emissive: '#d8e0e0', emissiveMap: glassBlockTex(), emissiveIntensity: 0.12, roughness: 0.3, metalness: 0.1 }),
    brownBrick: () => std({ color: '#6e564c', roughness: 0.9 }),
    poolWall: () => std({ color: '#7a6b60', roughness: 0.9 }),
    poolRoof: () => std({ map: roofSheetTex(), roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
    roofGlass: () => std({ map: roofGlassTex(), roughness: 0.2, metalness: 0.4, side: THREE.DoubleSide }),
    orange: () => std({ color: '#d0683a', roughness: 0.75 }),
    gymOrange: () => std({ color: '#c0582e', roughness: 0.75 }),
    black: () => std({ color: '#1d1e20', metalness: 0.35, roughness: 0.5 }),
    door: () => lit(shopGlassTex('gDoorGlass', null, ['#4f5e66', '#3d474c', '#22282b']), 0.18),
    tileRoof: () => std({ map: tileRoofTex(), roughness: 0.8 }),
    solar: () => std({ color: '#2b3550', roughness: 0.3, metalness: 0.6 }),
    drum: () => std({ color: '#a8957f', roughness: 0.9 }),
    slit: () => std({ color: '#2a3036', roughness: 0.2, metalness: 0.4 }),
    steel: () => std({ color: '#c2c6ca', metalness: 0.8, roughness: 0.3 }),
    greyCol: () => std({ color: '#9c9fa1', roughness: 0.6 }),
    granite: () => std({ color: '#b8b3ab', roughness: 0.8 }),
    pavTile: () => std({ color: '#b9ab97', roughness: 0.9 }),
    conc: () => std({ map: concTex(), roughness: 0.95 }),
    lxEast: () => std({ map: lxEastTex(), roughness: 0.9 }),
    white: () => std({ color: '#e8e7e2', roughness: 0.8 }),
    foreGranite: () => std({ map: foreGraniteTex(), roughness: 0.8 }),
    foreBrick: () => std({ map: foreBrickTex(), roughness: 0.9 }),
  }[key];
  return (MATS[key] = m());
}

// ---------------- 幾何累加（依材質合併） ----------------
class Acc {
  constructor() { this.parts = new Map(); }
  add(m, g) { if (g.index) g = g.toNonIndexed(); if (!this.parts.has(m)) this.parts.set(m, []); this.parts.get(m).push(g); return g; }
  box(m, x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return this.add(m, g); }
  // 水平方向沿 (ax,az)-(bx,bz)、厚 th 的直立板
  slab(m, ax, az, bx, bz, th, y0, y1) { const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), g = new THREE.BoxGeometry(l, y1 - y0, th); g.rotateY(-Math.atan2(dz, dx)); g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2); return this.add(m, g); }
  beam(m, p, q, w, h) {
    const P = new THREE.Vector3(...p), Q = new THREE.Vector3(...q), dir = Q.clone().sub(P), len = dir.length(), g = new THREE.BoxGeometry(w, h, len);
    const z = dir.normalize(), x = new THREE.Vector3(0, 1, 0).cross(z); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize();
    g.applyMatrix4(new THREE.Matrix4().makeBasis(x, z.clone().cross(x), z)); g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    return this.add(m, g);
  }
  cyl(m, x, z, r, y0, y1, seg = 20, open = false) { const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, open); g.translate(x, (y0 + y1) / 2, z); return this.add(m, g); }
  // 任意四邊形（a,b,c,d 逆時針看向法線那面），uv 給四角
  quad(m, a, b, c, d, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const pos = [...a, ...b, ...c, ...a, ...c, ...d], u = [...uv[0], ...uv[1], ...uv[2], ...uv[0], ...uv[2], ...uv[3]];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.computeVertexNormals();
    return this.add(m, g);
  }
  tri(m, a, b, c) { return this.quad(m, a, b, c, c, [[0, 0], [1, 0], [0.5, 1], [0.5, 1]]); }
  // 直立牆：從 a 走到 b，法線在右手邊（x 東、z 南的平面上），u、v 以公尺除以 tu、tv
  wall(m, ax, az, bx, bz, y0, y1, tu = 4, tv = 4, u0 = 0, v0 = null) {
    const l = Math.hypot(bx - ax, bz - az), vb = v0 ?? y0 / tv, vt = vb + (y1 - y0) / tv;
    return this.quad(m, [ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [[u0, vb], [u0 + l / tu, vb], [u0 + l / tu, vt], [u0, vt]]);
  }
  flat(m, pts, y, down = false, tile = 4) {
    const v = pts.map(([x, z]) => new THREE.Vector2(x, z)), tris = THREE.ShapeUtils.triangulateShape(v, []);
    const pos = [], uv = [];
    for (const t of tris) for (const i of t) { pos.push(pts[i][0], y, pts[i][1]); uv.push(pts[i][0] / tile, pts[i][1] / tile); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    // 法線朝上（或朝下）
    const ny = g.attributes.normal.getY(0);
    if ((ny < 0) !== down) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } g.computeVertexNormals(); }
    return this.add(m, g);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = !['lamp', 'skylight'].includes(m); mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
// 牆面貼字（招牌）：w×h 的平面，面向 (nx,nz)
function sign(group, tex, w, h, x, y, z, nx, nz, emissive = 0.15) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.4, metalness: 0.3, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: emissive }));
  m.position.set(x, y, z); m.rotation.y = Math.atan2(nx, nz); group.add(m); return m;
}
// 三點定圓弧：從 A 經 Q 到 B，切 n 段
function arc3(A, Q, B, n) {
  const ax = A[0], az = A[1], bx = Q[0], bz = Q[1], cx = B[0], cz = B[1];
  const d = 2 * (ax * (bz - cz) + bx * (cz - az) + cx * (az - bz));
  const ux = ((ax * ax + az * az) * (bz - cz) + (bx * bx + bz * bz) * (cz - az) + (cx * cx + cz * cz) * (az - bz)) / d;
  const uz = ((ax * ax + az * az) * (cx - bx) + (bx * bx + bz * bz) * (ax - cx) + (cx * cx + cz * cz) * (bx - ax)) / d;
  const r = Math.hypot(ax - ux, az - uz), a0 = Math.atan2(az - uz, ax - ux), aq = Math.atan2(bz - uz, bx - ux), a1 = Math.atan2(cz - uz, cx - ux);
  const norm = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let sweep = norm(a1 - a0); if (norm(aq - a0) > sweep) sweep -= 2 * Math.PI; // 要經過 Q
  const out = []; for (let i = 0; i <= n; i++) { const a = a0 + sweep * i / n; out.push([ux + r * Math.cos(a), uz + r * Math.sin(a)]); }
  return out;
}

// 折線 P 在 x 處的 z（P 依 x 單調）
function arcZ(P, x) {
  for (let i = 0; i < P.length - 1; i++) { const a = P[i], c = P[i + 1]; if ((x - a[0]) * (x - c[0]) <= 0 && a[0] !== c[0]) return a[1] + (c[1] - a[1]) * (x - a[0]) / (c[0] - a[0]); }
  return P[0][1];
}

// ---------------- 游泳池、體育館的局部座標 ----------------
// 游泳池 OSM：NW(-43.8,-176.5) NE(13.7,-170.5) SE(11.3,-141.9) SW(-47.7,-147.9)。s 0→1 西到東，t 0→1 北到南
const POOL = { NW: [-43.8, -176.5], NE: [13.7, -170.5], SE: [11.3, -141.9], SW: [-47.7, -147.9], eave: 8.5, ridgeT: 0.28, rise: 4.0, glass: 5.0, over: 0.6 };
function poolAt(P, s, t) { const n = [P.NW[0] + (P.NE[0] - P.NW[0]) * s, P.NW[1] + (P.NE[1] - P.NW[1]) * s], q = [P.SW[0] + (P.SE[0] - P.SW[0]) * s, P.SW[1] + (P.SE[1] - P.SW[1]) * s]; return [n[0] + (q[0] - n[0]) * t, n[1] + (q[1] - n[1]) * t]; }
// 西面（SW→NW 的牆）往外的法線
function poolWest(P) { const dx = P.NW[0] - P.SW[0], dz = P.NW[1] - P.SW[1], l = Math.hypot(dx, dz); return { tx: dx / l, tz: dz / l, nx: dz / l, nz: -dx / l, l }; }
function poolFootprints() {
  const P = POOL, w = poolWest(P), at = (t, o) => { const p = poolAt(P, 0, t); return [p[0] + w.nx * o, p[1] + w.nz * o]; };
  return [[at(0.25, -0.2), at(0.62, -0.2), at(0.62, 9.5), at(0.25, 9.5)]]; // 西面入口門框、前庭雕塑
}
// 體育館：主館 NW(-11.2,-266.7) SW(-18.0,-188.0)；附屬棟入口牆 (-32.9,-218.5)→(-31.7,-232.1)
const GYM = { NW: [-11.2, -266.7], NE: [23.4, -263.8], SE: [16.4, -185.0], SW: [-18.0, -188.0], portA: [-32.9, -218.5], portB: [-31.7, -232.1], drum: [-16.6, -246.0], drumR: 3.0, pav: [-37.0, -248.0] };
function gymFootprints() {
  const { portA: A, portB: B } = GYM, dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz), nx = dz / l, nz = -dx / l; // 牆面朝西的法線
  const o = (p, k) => [p[0] + nx * k, p[1] + nz * k];
  const [px, pz] = GYM.pav, [cx, cz] = GYM.drum, r = GYM.drumR + 0.4;
  return [[o(A, -0.2), o(B, -0.2), o(B, 5.2), o(A, 5.2)], [[px - 2.6, pz - 5], [px + 2.6, pz - 5], [px + 2.6, pz + 5], [px - 2.6, pz + 5]], [[cx - r, cz - r], [cx + r, cz - r], [cx + r, cz + r], [cx - r, cz + r]]];
}

// ---------------- 蓋 ----------------
export function buildZoneG(I, scene, data, collision = null) {
  const group = new THREE.Group(); group.name = 'zoneG';
  const k = new Acc(), shapes = [];
  const find = id => data.buildings.find(b => b.id === id);
  const baseOf = (b, x, z) => (b && Number.isFinite(b.base) ? b.base : groundY(x, z));
  // I.addWall 的高度帶是「相對牆中點地面」的（js/physworld.js 會再加 H）：這裡傳世界高度，先換算
  const wallC = (ax, az, bx, bz, y0, y1) => { const g = H((ax + bx) / 2, (az + bz) / 2); I.addWall(ax, az, bx, bz, y0 - g, y1 - g); };
  // (圓柱站在學餐攤販上方的廣場上時，從廣場面起算，不是 B1)
  const colRound = (x, z, r, y1, m = 'column') => { const st = PIT.stall, y0 = (x > st[0] && x < st[2] && z > st[1] && z < st[3] ? Hgrid(x, z) : groundY(x, z)) - 0.2; k.cyl(m, x, z, r, y0, y1, 18); const s = r * 0.9; for (const [a, c] of [[[x - s, z - s], [x + s, z - s]], [[x + s, z - s], [x + s, z + s]], [[x + s, z + s], [x - s, z + s]], [[x - s, z + s], [x - s, z - s]]]) wallC(a[0], a[1], c[0], c[1], y0, y1); shapes.push({ name: 'column', pts: [[x - r, z - r], [x + r, z - r], [x + r, z + r], [x - r, z + r]], y0, y1 }); };

  // ===== 學生活動中心 =====
  const sac = find(G_IDS.sac);
  if (sac) {
    const B = baseOf(sac, -150, -110), S = SAC, yO = B + S.ov, yR = B + S.roof, yP = B + S.par, yT = B + 13.2;
    const xEo = S.xE + S.dE, zSo = S.zS + S.dS, zNo = S.zN - S.dN, m = S.mcd;
    // 懸挑上層的外牆：5.8～13.2 m 用學活立面貼圖（v 與 map.js 的樓層線 3.3 m 對齊），13.2 m 以上女兒牆素面
    let uAcc = 0;
    const face = (ax, az, bx, bz) => {
      const l = Math.hypot(bx - ax, bz - az);
      k.wall('sacFacade', ax, az, bx, bz, yO, yT, 12, 3.3, uAcc / 12, S.ov / 3.3);
      k.wall('sacPlain', ax, az, bx, bz, yT, yP, 4, 4, uAcc / 4);
      uAcc += l;
    };
    // 外圈（俯視順時針走，法線朝外）：北面轉角 → 東面 → 南面 → 柱廊西端
    // （牆的法線在前進方向的右手邊：往東走朝南、往北走朝東）
    face(S.xS0, S.zS, S.xS0, zSo);        // 南面柱廊西端
    face(S.xS0, zSo, xEo, zSo);           // 南面
    face(xEo, zSo, xEo, zNo);             // 東面
    face(xEo, zNo, S.xN0, zNo);           // 北面（轉角懸挑）
    face(S.xN0, zNo, S.xN0, S.zN);        // 北面轉角懸挑西端
    // 麥當勞上方的上層：補成完整長方形（只露出高出主屋頂的一小段側面）
    const yM = B + 14.45;
    k.wall('sacPlain', m.x0 - 0.2, m.z0 - 0.2, m.x0 - 0.2, S.zS, yR, yM);
    k.wall('sacPlain', S.xE, m.z0 - 0.2, m.x0 - 0.2, m.z0 - 0.2, yR, yM);
    k.flat('roofGrey', [[m.x0 - 0.2, m.z0 - 0.2], [S.xE, m.z0 - 0.2], [S.xE, S.zS], [m.x0 - 0.2, S.zS]], yM);
    // 懸挑底（天花）與頂
    const strips = [
      [[S.xS0, S.zS], [xEo, S.zS], [xEo, zSo], [S.xS0, zSo]],
      [[S.xE, zNo], [xEo, zNo], [xEo, S.zS], [S.xE, S.zS]],
      [[S.xN0, zNo], [S.xE, zNo], [S.xE, S.zN], [S.xN0, S.zN]],
    ];
    for (const p of strips) { k.flat('soffit', p, yO, true); k.flat('roofGrey', p, yP); }
    // 天花的嵌燈
    for (let x = S.xS0 + 3; x < S.xE; x += 4) k.box('lamp', x - 0.15, x + 0.15, yO - 0.02, yO - 0.005, S.zS + 1.4, S.zS + 1.7);
    for (let z = zNo + 2; z < S.zS - 1; z += 4) k.box('lamp', S.xE + 1.0, S.xE + 1.3, yO - 0.02, yO - 0.005, z - 0.15, z + 0.15);
    // 懸挑邊緣的樑（灰框）；入口上方的二樓門廊那段不畫（樑底離門廊地面不到 1.7 m，會撞頭）
    k.box('sacPlain', foreY !== null ? FORE.porch[2] : S.xS0, xEo, yO - 0.35, yO, zSo - 0.4, zSo);
    k.box('sacPlain', xEo - 0.4, xEo, yO - 0.35, yO, zNo, zSo);
    k.box('sacPlain', S.xN0, xEo, yO - 0.35, yO, zNo, zNo + 0.4);
    // 圓柱：南面柱廊、東面騎樓、北面轉角（奶油色、很粗）；落在練舞室玻璃裡的那幾根不畫。
    // 一樓入口是寬開間（街景）：原本 -150.1、-145.5 兩根換成一根 FORE.colB
    const cS = zSo - 0.75, cE = xEo - 0.75;
    const RP = arc3(ROOM.A, [(ROOM.A[0] + ROOM.B[0]) / 2, ROOM.A[1] + ROOM.sag], ROOM.B, 24);
    const inRoom = (x, z) => x > ROOM.A[0] - 0.6 && x < ROOM.B[0] + 0.6 && z > ROOM.A[1] && z < arcZ(RP, Math.min(Math.max(x, ROOM.A[0]), ROOM.B[0])) + 0.6;
    for (const x of [cE, -117.5, -124.5, -131.5, -138.5, ...(foreY !== null ? [FORE.colB] : [-145.5, -150.1]), S.xS0 + 0.75]) if (!inRoom(x, cS)) colRound(x, cS, 0.55, yO);
    // 北側緊鄰沿新中北路的服務道路，轉角圓柱放在輪廓內側
    for (const z of [-99.5, -116.5, -123.5, S.zN + 0.5]) colRound(cE, z, 0.55, yO);
    // 練舞室：麥當勞南牆外的黑框弧形玻璃房（B1 平面圖的粉紅半圓），從 B1 地面到廣場面上約 3.3 m，平屋頂；
    // 玻璃整圈封閉（街景上弧形玻璃沒有門，進不去）；裡面木地板、北牆整面鏡子＋把桿
    {
      const yP = pitY ?? B, P = RP, yTop = yP + 6.6;
      let u = 0;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], c = P[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        const y0 = yP - 0.1, v1 = (yTop - y0) / 9.1; // mcdGlass 的貼圖是 9.1 m 高
        k.quad('mcdGlass', [a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], yTop, c[1]], [a[0], yTop, a[1]], [[u, 0], [u + l / 3, 0], [u + l / 3, v1], [u, v1]]);
        k.slab('black', a[0], a[1], c[0], c[1], 0.12, y0, y0 + 0.3); wallC(a[0], a[1], c[0], c[1], y0, yTop);
        k.slab('black', a[0], a[1], c[0], c[1], 0.16, yTop - 0.05, yTop + 0.35); // 屋頂邊的黑色收邊
        u += l / 3;
      }
      const poly = [ROOM.A, ...P.slice(1, -1), ROOM.B];
      k.flat('roofGrey', poly, yTop + 0.3); k.flat('soffit', poly, yTop, true);
      k.flat('danceFloor', poly, yP + 0.02);
      k.box('mirror', ROOM.A[0] + 0.3, ROOM.B[0] - 0.3, yP + 0.1, yP + 2.5, -94.0, -93.96);
      k.box('rib', ROOM.A[0] + 0.6, ROOM.B[0] - 0.6, yP + 1.0, yP + 1.05, -93.72, -93.67);
      for (let x = ROOM.A[0] + 1; x < ROOM.B[0] - 0.5; x += 2.5) k.box('rib', x - 0.02, x + 0.02, yP + 0.02, yP + 1.0, -93.86, -93.82);
      for (let x = ROOM.A[0] + 2; x < ROOM.B[0] - 1; x += 3) for (const z of [-93.0, -91.0, -89.6]) if (z < arcZ(P, x) - 0.6) k.box('lamp', x - 0.6, x + 0.6, yTop - 0.03, yTop - 0.01, z - 0.1, z + 0.1);
      shapes.push({ name: 'mcdGlass', pts: poly, y0: yP, y1: yTop });
      I.zones.push({ name: '學生活動中心 B1 練舞室', pts: poly, y0: 0, y1: 6.6, ceil: () => 6.2 });
      // 招牌：玻璃中段的黑底「McDonald's」，高度約在廣場面（街景的招牌帶）；玻璃整圈沒有門，麥當勞要從西邊 B1 入口進去右轉
      const mid = P[Math.round(P.length * 0.55)], c0 = [(ROOM.A[0] + ROOM.B[0]) / 2, -104], nx = mid[0] - c0[0], nz = mid[1] - c0[1], l = Math.hypot(nx, nz);
      sign(group, mcdSignTex(), 5.6, 0.7, mid[0] + nx / l * 0.07, yP + 3.3, mid[1] + nz / l * 0.07, nx / l, nz / l, 0.55);
    }
    {
      // 麥當勞上面那層（一樓用餐區）在東面、南面東段臨街：從街面到懸挑底的玻璃
      const g1 = H(S.xE + 0.5, -104);
      k.wall('mcdUpper', S.xE + 0.45, -94.0, S.xE + 0.45, -113.9, g1 - 0.1, yO, 3, yO - g1 + 0.1, 0, 0);
      k.wall('mcdUpper', -114.7, -93.95, S.xE + 0.45, -93.95, g1 - 0.1, yO, 3, yO - g1 + 0.1, 0, 0);
      wallC(S.xE + 0.45, -94.0, S.xE + 0.45, -113.9, g1 - 0.1, yO);
    }
    // 郵局：東北角一樓弧形玻璃，綠白招牌
    {
      // 北側緊貼沿新中北路的服務道路：轉角只往外推 1 m（東）／0.4 m（北），用半徑 2.2 m 的圓角繞過去
      const A = [S.xE, -121.0], Bp = [-120.0, S.zN], ex = S.xE + 1.0, ez = S.zN - 0.4, rc = 2.2, P = [A, [ex, -122.2]];
      for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 * i / 8; P.push([ex - rc + rc * Math.cos(a), ez + rc - rc * Math.sin(a)]); }
      P.push([-118.8, ez], Bp);
      let u = 0;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], c = P[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        const y0 = Math.min(groundY(a[0], a[1]), groundY(c[0], c[1])) - 0.1;
        k.quad('postGlass', [a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], yO, c[1]], [a[0], yO, a[1]], [[u, 0], [u + l / 3, 0], [u + l / 3, 1], [u, 1]]);
        k.slab('black', a[0], a[1], c[0], c[1], 0.12, y0, y0 + 0.3);
        wallC(a[0], a[1], c[0], c[1], y0, yO); u += l / 3;
      }
      shapes.push({ name: 'postGlass', pts: [A, ...P, Bp, [S.xE, S.zN]], y0: B, y1: B + S.ov });
      const mid = P[Math.round(P.length / 2)], nx = mid[0] - (S.xE - 6), nz = mid[1] - (S.zN + 6), l = Math.hypot(nx, nz);
      sign(group, postSignTex(), 5.2, 0.82, mid[0] + nx / l * 0.06, B + 3.25, mid[1] + nz / l * 0.06, nx / l, nz / l, 0.35);
    }
    // 下沉區：B1 地坪、東西擋土牆、西側長花台、東側矮牆。碰撞線有高度帶（js/collision.js addSegment），
    // 只擋腳在坑裡（或樓梯上）的人，廣場上的人走到邊緣會掉下去（西段樓梯上方的柱廊邊另外有矮牆）
    if (pitY !== null) {
      const [x0, z0, x1, z1] = PIT.court, yP = pitY, gW = Hgrid(x0 - 1.5, -88), gE = Hgrid(x1 + 1.5, -88);
      const seg = (ax, az, bx, bz, ya, yb) => { if (collision) collision.addSegment(ax, az, bx, bz, ya, yb); };
      k.flat('pitFloor', [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], yP + 0.005);
      // 擋土牆（花崗石），頂端壓一條收邊；西牆北段同時是學餐攤販的東牆
      // （攤販那段只畫攤販天花以上：下面是攤販自己的東牆，js/sac_b1.js）
      k.box('planter', x0 - 0.5, x0, yP - 0.2, gW + 0.05, PIT.stall[3], z1); k.box('planter', x0 - 0.5, x0, yP + 2.75, gW + 0.05, z0, PIT.stall[3]); seg(x0, z0, x0, z1, yP - 0.1, gW - 0.45);
      k.box('planter', x1, x1 + 0.5, yP - 0.2, gE + 0.05, -94.0, z1); seg(x1, -94.0, x1, z1, yP - 0.1, gE - 0.45);
      // 東側：沿看台的矮牆（廣場那側的人不會掉下去）
      k.box('planter', x1, x1 + 0.3, gE, gE + 0.9, -93.9, z1); seg(x1 + 0.15, -93.9, x1 + 0.15, z1, gE - 0.6, gE + 0.9);
      // 西側長花台（攤販屋頂的廣場面上，花崗石框＋灌木），花台北邊到學活牆之間是柱廊下的矮牆
      const px0 = -144.9, px1 = x0 - 0.2, pz0 = -92.7, pz1 = z1 - 0.1;
      k.box('planter', px0, px1, gW - 0.2, gW + 0.55, pz0, pz1);
      // 灌木：一叢一叢高低不同（街景從前庭看得到矮牆後面的灌木頂）
      for (let z = pz0 + 0.2, i = 0; z < pz1 - 0.3; z += 1.6, i++) k.box('shrub', px0 + 0.2, px1 - 0.2, gW + 0.55, gW + 1.25 + (i % 3) * 0.2, z, Math.min(z + 1.5, pz1 - 0.2));
      // 靠前庭那面：比前庭高 0.9 m 的花崗石矮牆（從花台北端到前庭東南角）
      if (foreY !== null) k.box('planter', px0, px0 + 0.3, gW - 0.2, foreY + 0.9, pz0, FORE.top[FORE.top.length - 1][1]);
      for (const [a, c] of [[[px0, pz0], [px1, pz0]], [[px1, pz0], [px1, pz1]], [[px1, pz1], [px0, pz1]], [[px0, pz1], [px0, pz0]]]) seg(a[0], a[1], c[0], c[1], gW - 0.6, gW + 0.6);
      shapes.push({ name: 'planter', pts: [[px0, pz0], [px1, pz0], [px1, pz1], [px0, pz1]], y0: gW, y1: gW + 1 });
      // 花台北邊到學活牆之間：一樓入口前庭的東北角（比廣場高 0.6 m），矮牆比前庭高 0.9 m
      const fy = foreY ?? gW;
      k.box('planter', x0 - 0.3, x0, gW, fy + 0.9, -94.42, pz0); seg(x0 - 0.15, -94.42, x0 - 0.15, pz0, gW - 0.6, fy + 0.9);
      // 學餐攤販上方：甲板（地面照畫，js/terrain.js addPit mask: false），B1 的天花在 js/sac_b1.js。
      // 長花台以西、花台北邊的角落是一樓入口前庭（前庭高度），長花台底下照舊是廣場高度。
      // 甲板各往外多 5 cm 跟前庭 pad、彼此重疊（坑的邊用嚴格不等式，留縫會掉到 B1）
      const st = PIT.stall, xE = FORE.xE, nz = FORE.nookZ;
      addBridge([[(st[0] + xE) / 2, st[1] + 0.05], [(st[0] + xE) / 2, st[3] + 0.05]], xE - st[0] + 0.1, { yAt: () => fy, lv: LV_DECK });
      addBridge([[xE - 0.05, (st[1] + nz) / 2], [st[2], (st[1] + nz) / 2]], nz - st[1] + 0.1, { yAt: () => fy, lv: LV_DECK });
      addBridge([[(xE + st[2]) / 2, nz], [(xE + st[2]) / 2, st[3] + 0.05]], st[2] - xE + 0.1, { yAt: () => gW, lv: LV_DECK });
      // （學活南牆線 x -152..入口東緣：B1 天花以上的牆與一、二樓的門口都在 js/sac.js 的外殼碰撞）
      shapes.push({ name: 'pit', pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0: yP, y1: gW });
    }
    // ===== 一樓入口前庭、入口、二樓門廊（官方街景 2017-09） =====
    // 前庭與小階梯是 data.levels（zoneGTerrain），攤販上方那塊是上面的甲板；地面另外鋪（壓在 pad 上 1～2 cm）：
    // 整片淺灰花崗石、入口前紅磚。入口在柱廊最西兩根圓柱之間的寬開間：一排玻璃門、門楣上方是深色門洞，
    // 門口兩扇往外打開貼在兩側的不鏽鋼柵門；正上方是二樓門廊（甲板，大階梯頂的平台往東延伸），
    // 門廊前緣是一道實心的女兒牆，牆面金色書法字「活動中心」；兩條直布條（左深藍、右紅）從女兒牆頂垂到離地約 1 m，
    // 貼著兩根圓柱的內側、蓋住女兒牆兩端。大階梯兩側與頂端平台西緣是實心花崗石矮牆（不是欄杆）。
    if (foreY !== null && landY !== null) {
      const F = FORE, fy = foreY, S2 = STAIR2F, xb = S2.x + S2.w / 2, wz = -94.42;
      const T = F.top, tE = T[T.length - 1], [bx0, bz0, bx1, bz1] = F.brick, [dx0, dx1] = F.door, [px0, , px1, pz1] = F.porch;
      const [lx0, lz0, lx1, _lz1] = S2.landing;
      k.flat('foreGranite', [...T, [F.xE, tE[1]], [F.xE, F.nookZ], [F.nook, F.nookZ], [F.nook, wz], [xb, wz], [xb, S2.zFoot], [T[0][0], S2.zFoot]], fy + 0.012, false, 2.4);
      k.flat('foreBrick', [[bx0, bz0], [bx1, bz0], [bx1, bz1], [bx0, bz1]], fy + 0.022, false, 1.2);
      // 一樓：一排玻璃門（黑框）、門楣，貼著學活南牆；門楣到門廊樓板之間是深色的內凹門洞
      const ySl = landY - 0.35, nDoor = 6, dw = (dx1 - dx0 - 0.1) / nDoor;
      // （中間兩扇是開著的門洞，走得進去：js/sac.js；門扇往外推開貼在兩側）
      const [o1a, o1b] = SAC_DOORS.s1, [_o2a, _o2b] = SAC_DOORS.s2;
      k.box('door', dx0 + 0.05, o1a, fy, fy + 2.7, wz + 0.02, wz + 0.1); k.box('door', o1b, dx1 - 0.05, fy, fy + 2.7, wz + 0.02, wz + 0.1);
      for (let i = 0; i <= nDoor; i++) { const x = dx0 + 0.05 + i * dw; if (x > o1a + 0.1 && x < o1b - 0.1) continue; k.box('black', x - 0.04, x + 0.04, fy, fy + 2.7, wz + 0.1, wz + 0.16); }
      for (const x of [o1a, o1b]) k.box('door', x - 0.03, x + 0.03, fy, fy + 2.6, wz + 0.1, wz + 1.05);
      k.box('black', dx0, dx1, fy + 2.7, fy + 2.85, wz + 0.02, wz + 0.18);
      k.box('slit', px0, px1, fy + 2.85, ySl, wz + 0.01, wz + 0.12);
      // 兩扇打開的不鏽鋼柵門，貼在門口兩側（垂直學活牆）
      const gz0 = -93.95, gz1 = -92.75;
      for (const gx of [dx0 + 0.12, dx1 - 0.12]) {
        for (const z of [gz0 + 0.025, gz1 - 0.025]) k.box('steel', gx - 0.03, gx + 0.03, fy, fy + 1.85, z - 0.025, z + 0.025);
        for (const y of [fy + 0.1, fy + 1.82]) k.box('steel', gx - 0.03, gx + 0.03, y - 0.03, y + 0.03, gz0, gz1);
        for (let z = gz0 + 0.12; z < gz1 - 0.06; z += 0.12) k.box('steel', gx - 0.012, gx + 0.012, fy + 0.13, fy + 1.79, z - 0.012, z + 0.012);
      }
      // 二樓門廊：樓板（底下是一樓入口的天花，嵌燈）、地面（連同大階梯頂的平台一起鋪）、後面一排玻璃門
      k.box('sacPlain', px0, px1, ySl, landY - 0.02, wz, pz1);
      for (const x of [dx0 + 1.2, (dx0 + dx1) / 2, dx1 - 1.2]) k.box('lamp', x - 0.2, x + 0.2, ySl - 0.02, ySl - 0.005, -93.4, -93.0);
      k.flat('foreGranite', [[lx0, lz0], [px1, wz], [px1, pz1], [px0, pz1], [px0, S2.zTop], [lx0, S2.zTop]], landY + 0.012, false, 2.4);
      // （二樓南面沒有門：整段敞開，直接走進中庭，js/sac.js）
      // 頂端平台東緣底下（門廊西端、一樓入口的西牆）：平台底下封起來的花崗石牆
      k.box('granite', lx1 - 0.15, lx1, fy - 0.1, landY - 0.02, lz0, S2.zTop);
      // 門廊前緣的實心女兒牆（第一根圓柱穿過它）與金字；東端（入口東側圓柱旁）細欄杆
      const yPa = landY + 1.0;
      k.box('sacPlain', px0, px1, landY - 0.35, yPa, pz1 - 0.28, pz1);
      k.box('granite', px0 - 0.02, px1, yPa, yPa + 0.06, pz1 - 0.3, pz1 + 0.02);
      sign(group, sacNameTex(), 4.0, 0.75, (dx0 + dx1) / 2, landY + 0.33, pz1 + 0.015, 0, 1, 0.2);
      const ry = landY, rx = px1 - 0.15;
      k.box('steel', rx - 0.03, rx + 0.03, ry + 0.95, ry + 1.0, wz, pz1 - 0.28); k.box('steel', rx - 0.025, rx + 0.025, ry, ry + 1.0, (wz + pz1) / 2 - 0.025, (wz + pz1) / 2 + 0.025);
      // 大階梯兩側、頂端平台西緣：實心花崗石矮牆（順著坡，頂比踏面高約 1 m）
      {
        const xa = S2.x - S2.w / 2, t = 0.25, zf = S2.zFoot, zt = S2.zTop, yAt = z => fy + (landY - fy) * (z - zf) / (zt - zf) + (landY - fy) / S2.steps / 2;
        for (const x of [xa + t / 2, xb - t / 2]) {
          k.beam('granite', [x, yAt(zf) + 0.45, zf], [x, yAt(zt) + 0.45, zt], t, 1.1);
          k.beam('granite', [x, yAt(zf) + 1.02, zf], [x, yAt(zt) + 1.02, zt], t + 0.06, 0.06);
        }
        k.box('granite', lx0, lx0 + t, landY - 0.02, landY + 1.0, lz0, zt);
        k.box('granite', lx0 - 0.03, lx0 + t + 0.03, landY + 1.0, landY + 1.06, lz0, zt);
      }
      // 直布條：從女兒牆頂垂到離地約 1 m，貼著兩根圓柱內側
      const bTop = yPa, bH = bTop - fy - 1.0, bW = 0.85;
      sign(group, sacBannerTex('gSacBanBlue', '#25344c', '#e6edf3', null), bW, bH, dx0 + 0.45, bTop - bH / 2, pz1 + 0.06, 0, 1, 0.08);
      sign(group, sacBannerTex('gSacBanRed', '#c4262b', '#f7efe2', '賀'), bW, bH, dx1 - 0.45, bTop - bH / 2, pz1 + 0.06, 0, 1, 0.08);
      // 北面（新中北路側）一樓穿堂的出口：一組玻璃門，中間是開著的門洞（室內穿堂在 js/sac.js）
      {
        const nz = x => -128.4 + (-129.9 + 128.4) * (x + 163.2) / 51.2 - 0.05, ga = Hgrid(-148, -131), a = -149.6, b = -146.4, [oa, ob] = SAC_DOORS.n1;
        k.slab('door', a, nz(a), oa, nz(oa), 0.08, ga - 0.1, ga + 2.7); k.slab('door', ob, nz(ob), b, nz(b), 0.08, ga - 0.1, ga + 2.7);
        k.slab('door', oa, nz(oa), ob, nz(ob), 0.08, ga + 2.6, ga + 2.7);
        k.slab('black', a - 0.1, nz(a - 0.1) - 0.02, b + 0.1, nz(b + 0.1) - 0.02, 0.1, ga + 2.7, ga + 2.85);
        for (const x of [a, oa, ob, b]) k.slab('black', x - 0.04, nz(x) - 0.03, x + 0.04, nz(x) - 0.03, 0.1, ga - 0.1, ga + 2.7);
      }
      // 門廊走得上去：甲板（底下的一樓入口照樣能走；西端多 5 cm 跟大階梯頂的平台重疊）
      addBridge([[px0 - 0.05, (wz + pz1) / 2], [px1, (wz + pz1) / 2]], pz1 - wz, { yAt: () => landY, lv: LV_DECK });
      if (collision) {
        const b2 = [landY - 0.3, landY + 1.2];
        collision.addSegment(px0, pz1 - 0.28, px1, pz1 - 0.28, ...b2); // 門廊前緣（女兒牆）
        collision.addSegment(px1, wz, px1, pz1, ...b2);                // 門廊東端（入口東側圓柱）
        collision.addSegment(px0, S2.zTop, px0, pz1, ...b2);           // 大階梯頂東側到門廊前緣
        // 頂端平台東緣底下：平台是 pad，前庭的人從這裡鑽進平台底下會被抬上二樓，只擋前庭高度
        collision.addSegment(lx1, lz0, lx1, S2.zTop, fy - 0.5, landY - 0.6);
        // 大階梯兩側矮牆（只擋樓梯上的人；廣場上的人由 map.js 的封邊線擋）
        for (const x of [S2.x - S2.w / 2 + 0.25, xb - 0.25]) collision.addSegment(x, S2.zFoot, x, S2.zTop, fy - 0.2, landY + 1.2);
        collision.addSegment(F.xE, PIT.stall[3], F.xE, F.nookZ, fy - 0.5, fy + 0.9); // 甲板東緣（長花台西面）
        collision.addSegment(F.xE, F.nookZ, F.nook, F.nookZ, fy - 0.5, fy + 0.9);    // 長花台北面（前庭東北角）
        for (const gx of [dx0 + 0.12, dx1 - 0.12]) collision.addSegment(gx, gz0, gx, gz1, fy - 0.3, fy + 1.85); // 柵門
        // 執行期生成（停車、行人）別生在前庭和小階梯上（小階梯往南多算 1.6 m）
        if (Array.isArray(collision.reserved)) collision.reserved.push([...T.map(([x, z]) => [x, z + F.depth + 0.1]), [F.xE, tE[1] + F.depth + 0.1], [F.xE, wz], [T[0][0], wz]]);
      }
      shapes.push({ name: 'forecourt', pts: [...T.map(([x, z]) => [x, z + F.depth]), [F.xE, tE[1] + F.depth], [F.xE, F.nookZ], [F.nook, F.nookZ], [F.nook, wz], [T[0][0], wz]], y0: fy - F.rise, y1: fy });
      shapes.push({ name: 'porch', pts: [[px0, wz], [px1, wz], [px1, pz1], [px0, pz1]], y0: ySl, y1: yPa });
    }
    // 學活的碰撞輪廓：B1 西半（學習區、樓梯廳）挖空，跟麥當勞一樣能走進去。蓋完地圖（樹、灌木、冷氣都放完）才換，
    // 共用亂數不變；頂點數一樣、外框不變（新增的兩點在原本南邊的線上），新線段要登記到碰撞格子
    if (collision && pitY !== null) {
      const NEW = [[-181, -128.55], [-163.2, -128.4], [-112, -129.9], [-112, -114], [-152, -114], [-152, -94.415], [-160, -94.431], [-195.2, -94.5], [-195.05, -118.2], [-181, -118.2]];
      const same = (a, b) => a.length === b.length && a.every((p, i) => Math.abs(p[0] - b[i][0]) < 1e-6 && Math.abs(p[1] - b[i][1]) < 1e-6);
      const pi = collision.polys.findIndex(p => p.pts === sac.pts || same(p.pts, sac.pts));
      const P = pi >= 0 ? collision.polys[pi] : null;
      if (P && P.pts.length === NEW.length) {
        P.pts = NEW;
        for (let i = 0; i < NEW.length; i++) {
          const a = NEW[i], b = NEW[(i + 1) % NEW.length], si = P.s0 + i;
          collision.segs[si] = [a[0], a[1], b[0], b[1]];
          collision._each(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), (ix, iz) => { const c = collision._cell(ix, iz); if (!c.s.includes(si)) c.s.push(si); });
        }
        collision.sacPoly = P; // js/sac.js 蓋室內時把這塊實心輪廓換成外牆線
      } else console.warn('[zone_g] 學活碰撞輪廓找不到，B1 西半沒有挖空');
      // 執行期生成（機車、直升機、行人）別生在 B1 裡：原本這裡在學活輪廓內本來就算擋住，結果一樣
      if (Array.isArray(collision.reserved)) collision.reserved.push([[-152, -114], [PIT.west[2], -114], [PIT.west[2], -94.42], [-152, -94.42]]);
    }
    // 屋頂北側中央的長弧頂採光罩（約 64×10 m，離北緣約 10 m）
    {
      const x0 = -182, x1 = -118, z0 = -119.6, z1 = -109.6, rise = 1.8, n = 10, zc = (z0 + z1) / 2, hw = (z1 - z0) / 2;
      const yAt = i => yR + 0.5 + rise * Math.sin(Math.PI * i / n), zAt = i => zc - hw * Math.cos(Math.PI * i / n);
      for (let i = 0; i < n; i++) k.quad('skylight', [x0, yAt(i), zAt(i)], [x1, yAt(i), zAt(i)], [x1, yAt(i + 1), zAt(i + 1)], [x0, yAt(i + 1), zAt(i + 1)], [[0, 0], [16, 0], [16, 1], [0, 1]]);
      for (const x of [x0, x1]) for (let i = 0; i < n; i++) k.tri('skylight', [x, yR + 0.5, zc], [x, yAt(i), zAt(i)], [x, yAt(i + 1), zAt(i + 1)]);
      for (let x = x0; x <= x1 + 0.01; x += 4) for (let i = 0; i < n; i++) k.beam('rib', [x, yAt(i) + 0.03, zAt(i)], [x, yAt(i + 1) + 0.03, zAt(i + 1)], 0.1, 0.1);
      k.box('rib', x0 - 0.2, x1 + 0.2, yR, yR + 0.5, z0 - 0.2, z0 + 0.1); k.box('rib', x0 - 0.2, x1 + 0.2, yR, yR + 0.5, z1 - 0.1, z1 + 0.2);
      k.box('rib', x0 - 0.2, x0 + 0.1, yR, yR + 0.5, z0, z1); k.box('rib', x1 - 0.1, x1 + 0.2, yR, yR + 0.5, z0, z1);
      // 東北角 4 台圓形冷卻風機、西北角小機房
      for (let i = 0; i < 4; i++) { const x = -128 + i * 2.6; k.cyl('rib', x, -125.5, 1.0, yR, yR + 1.3, 16); k.cyl('black', x, -125.5, 0.8, yR + 1.3, yR + 1.35, 16); }
      k.box('sacPlain', -190, -184.5, yR, yR + 2.6, -127.5, -122.5);
    }
    // 西面：一道垂直淺綠玻璃帶（貫穿多層）
    {
      const z0 = -110.5, z1 = -106.0, xa = xOnEdge(sac.pts, z0, -1), xb = xOnEdge(sac.pts, z1, -1);
      if (xa !== null && xb !== null) k.wall('greenGlass', xa - 0.06, z0, xb - 0.06, z1, B + 0.3, yR - 0.4, 1.2, 1.65);
    }
  }

  // ===== 生物科技館 =====
  const bio = find(G_IDS.bio);
  if (bio) {
    const B = baseOf(bio, -212, -108), zN = Math.min(...bio.pts.map(p => p[1])), xE = Math.max(...bio.pts.map(p => p[0]));
    // 東側樓梯塔：北端整面淡綠玻璃帷幕從地面到頂、東面北段也包一段
    k.wall('greenGlass', xE - 0.25, zN - 0.07, BIO.xT + 0.4, zN - 0.07, B + 0.2, B + BIO.hTower - 0.3, 1.2, 1.65);
    k.wall('greenGlass', xE + 0.07, zN + 4.6, xE + 0.07, zN + 0.3, B + 0.2, B + BIO.hTower - 0.3, 1.2, 1.65);
    // 東北角金色直書館名（主體北面靠東）
    {
      const x = BIO.xT - 1.3;
      k.box('sacPlain', x - 0.8, x + 0.8, B + 11.2, B + 27.4, zN - 0.12, zN + 0.02);
      sign(group, vText('gBioName', '中原大學 生物科技館', '#d6b46a', null, '"Noto Serif TC","Songti TC",serif', 160, 1600), 1.3, 13.0, x, B + 19.3, zN - 0.14, 0, -1, 0.25);
    }
    // 西南玻璃門廳（南翼西面一樓）＋小雨遮
    {
      const xW = Math.min(...bio.pts.map(p => p[0])), z0 = -101.0, z1 = -96.5, y0 = groundY(xW, (z0 + z1) / 2);
      k.wall('bioLobby', xW - 0.06, z0, xW - 0.06, z1, y0 - 0.1, B + 3.6, 3, 3.7, 0, 0);
      k.box('white', xW - 1.2, xW, B + 3.6, B + 3.85, z0 - 0.4, z1 + 0.4);
      for (const z of [z0 - 0.1, z1 + 0.1]) k.box('white', xW - 1.1, xW - 0.85, y0 - 0.1, B + 3.6, z - 0.12, z + 0.12);
      k.box('granite', xW - 1.2, xW, y0 - 0.2, y0 + 0.15, z0 - 0.4, z1 + 0.4);
      shapes.push({ name: 'bioLobby', pts: [[xW - 1.2, z0 - 0.4], [xW, z0 - 0.4], [xW, z1 + 0.4], [xW - 1.2, z1 + 0.4]], y0: B, y1: B + 3.9 });
    }
  }
  // 空橋：生科館東側塔 → 學活西面（淺灰箱形、側面一排小窗）
  if (bio && sac) {
    const b0 = baseOf(sac, -197, -102), { x0, z0, z1 } = BRIDGE, x1 = xOnEdge(sac.pts, (z0 + z1) / 2, -1) ?? BRIDGE.x1;
    const y0 = b0 + BRIDGE.y0, y1 = b0 + BRIDGE.y1;
    // 箱形是空心的（三樓走得過去，地面與牆的碰撞、裡面的門在 js/sac.js）
    k.box('bridge', x0, x1, y0, y0 + 0.2, z0, z1); k.box('bridge', x0, x1, y1 - 0.25, y1, z0, z1);
    k.box('bridge', x0, x1, y0, y1, z0, z0 + 0.14); k.box('bridge', x0, x1, y0, y1, z1 - 0.14, z1); k.box('bridge', x0, x0 + 0.14, y0, y1, z0, z1);
    for (let x = x0 + 0.6; x < x1 - 0.8; x += 1.3) for (const z of [z0 - 0.02, z1 + 0.02]) k.box('win', x, x + 0.8, y0 + 1.3, y0 + 2.3, z - 0.02, z + 0.02);
    shapes.push({ name: 'bridge', pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1 });
  }

  // ===== 全人教育村南棟：圓柱玻璃磚樓梯塔、半圓玻璃磚低量體 =====
  const qr = find(G_IDS.qr);
  if (qr) {
    const B = baseOf(qr, -40, -50);
    const [cx, cz] = [-40.4, -49.4], r = 2.6, top = B + 31.0;
    k.cyl('glassBlock', cx, cz, r, groundY(cx, cz) - 0.2, top - 0.9, 24);
    for (let y = B + 3.3; y < top - 1; y += 3.3) k.cyl('brownBrick', cx, cz, r + 0.06, y - 0.25, y + 0.25, 24);
    k.cyl('brownBrick', cx, cz, r + 0.15, top - 0.9, top, 24);
    I.addWall(cx - r, cz - r, cx + r, cz - r, B - 1, top); I.addWall(cx + r, cz - r, cx + r, cz + r, B - 1, top); I.addWall(cx + r, cz + r, cx - r, cz + r, B - 1, top); I.addWall(cx - r, cz + r, cx - r, cz - r, B - 1, top);
    shapes.push({ name: 'qrDrum', pts: [[cx - r, cz - r], [cx + r, cz - r], [cx + r, cz + r], [cx - r, cz + r]], y0: B, y1: top });
    // 西南角半圓玻璃磚凸窗量體（低矮，兩層）
    const hx = -57.5, hz = -47.6, hr = 4.0, hy = B + 6.8, n = 14, P = [];
    for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; P.push([hx + hr * Math.cos(a), hz + hr * Math.sin(a)]); }
    for (let i = 0; i < n; i++) { const a = P[i], c = P[i + 1]; k.quad('glassBlock', [c[0], B - 0.3, c[1]], [a[0], B - 0.3, a[1]], [a[0], hy, a[1]], [c[0], hy, c[1]], [[0, 0], [1, 0], [1, 7], [0, 7]]); wallC(a[0], a[1], c[0], c[1], B - 1, hy); }
    k.flat('brownBrick', P, hy + 0.5); k.flat('brownBrick', P, hy, true);
    for (let i = 0; i < n; i++) { const a = P[i], c = P[i + 1]; k.slab('brownBrick', a[0], a[1], c[0], c[1], 0.3, hy, hy + 0.5); }
    shapes.push({ name: 'qrHalf', pts: P, y0: B, y1: hy + 0.5 });
  }

  // ===== 室內游泳池：不對稱雙坡、兩端玻璃帶、西面橘紅門框 =====
  const pool = find(G_IDS.pool);
  if (pool) {
    const P = POOL, B = baseOf(pool, -17, -159), yE = B + P.eave, yRd = yE + P.rise;
    const L = Math.hypot(P.NE[0] - P.NW[0], P.NE[1] - P.NW[1]);
    const o = P.over, at = (s, t) => poolAt(P, s, t);
    // 出簷：沿長邊往外 0.6 m、兩端 0.4 m
    const s0 = -0.4 / L, s1 = 1 + 0.4 / L, D = Math.hypot(P.SW[0] - P.NW[0], P.SW[1] - P.NW[1]);
    const tN = -o / D, tS = 1 + o / D, drop = o * P.rise / (P.ridgeT * D);          // 簷口比牆頂低一點
    const yN = yE - drop, yS = yE - o * P.rise / ((1 - P.ridgeT) * D);
    const g0 = P.glass / L, g1 = 1 - P.glass / L;
    const V = (s, t, y) => { const p = at(s, t); return [p[0], y, p[1]]; };
    for (const [sa, sb, m] of [[s0, g0, 'roofGlass'], [g0, g1, 'poolRoof'], [g1, s1, 'roofGlass']]) {
      const ul = (sb - sa) * L / 3;
      k.quad(m, V(sa, tN, yN), V(sb, tN, yN), V(sb, P.ridgeT, yRd), V(sa, P.ridgeT, yRd), [[0, 0], [ul, 0], [ul, 3], [0, 3]]); // 北坡（短）
      k.quad(m, V(sb, tS, yS), V(sa, tS, yS), V(sa, P.ridgeT, yRd), V(sb, P.ridgeT, yRd), [[0, 0], [ul, 0], [ul, 8], [0, 8]]); // 南坡（長）
    }
    // 屋脊蓋板、簷口封板
    k.beam('poolWall', V(s0, P.ridgeT, yRd + 0.08), V(s1, P.ridgeT, yRd + 0.08), 0.5, 0.16);
    k.beam('poolWall', V(s0, tN, yN - 0.15), V(s1, tN, yN - 0.15), 0.12, 0.35);
    k.beam('poolWall', V(s0, tS, yS - 0.15), V(s1, tS, yS - 0.15), 0.12, 0.35);
    // 東西兩端的三角山牆（牆頂到屋脊）
    for (const s of [0, 1]) k.tri('poolWall', V(s, 0, yE), V(s, 1, yE), V(s, P.ridgeT, yRd - 0.05));
    for (const s of [0, 1]) k.tri('poolWall', V(s, 1, yE), V(s, 0, yE), V(s, P.ridgeT, yRd - 0.05));
    shapes.push({ name: 'poolRoof', pts: [at(s0, tN), at(s1, tN), at(s1, tS), at(s0, tS)], y0: yE - 1, y1: yRd });
    // 西面入口：橘紅門框（兩根方柱加橫樑，柱上直書白字），中間玻璃門
    const w = poolWest(P), wp = (t, off) => { const p = at(0, t); return [p[0] + w.nx * off, p[1] + w.nz * off]; };
    const tc = 0.42, half = 2.6 / D, y0 = groundY(...wp(tc, 1)) - 0.1, yTop = B + 6.6;
    const ang = Math.atan2(w.nz, w.nx);
    const post = (t) => { const [x, z] = wp(t, 0.6); const bx = new THREE.BoxGeometry(1.2, yTop - y0, 0.8); bx.rotateY(-ang); bx.translate(x, (y0 + yTop) / 2, z); k.add('orange', bx); const c = 0.55; wallC(x - c, z - c, x + c, z - c, y0, yTop); wallC(x + c, z - c, x + c, z + c, y0, yTop); wallC(x + c, z + c, x - c, z + c, y0, yTop); wallC(x - c, z + c, x - c, z - c, y0, yTop); return [x, z]; };
    post(tc - half); const pB = post(tc + half);
    { const a = wp(tc - half - 0.4 / D, 0.6), c = wp(tc + half + 0.4 / D, 0.6); k.slab('orange', a[0], a[1], c[0], c[1], 1.25, yTop - 1.1, yTop); }
    { const a = wp(tc - half + 0.4 / D, 0.08), c = wp(tc + half - 0.4 / D, 0.08); k.slab('door', c[0], c[1], a[0], a[1], 0.06, y0, yTop - 1.1); }
    // 直書白字（南側門柱朝西那面）
    { const [x, z] = pB; sign(group, vText('gPoolName', '游泳池', '#f4f4f2', null, '"Noto Sans TC","PingFang TC",sans-serif', 128, 512), 0.7, 2.4, x + w.nx * 0.42, B + 3.6, z + w.nz * 0.42, w.nx, w.nz, 0.2); }
    // 門框南側：一整排大面玻璃（玻璃帶）
    { const a = wp(tc + half + 1.2 / D, 0.06), c = wp(0.93, 0.06); k.wall('door', a[0], a[1], c[0], c[1], groundY(c[0], c[1]) - 0.1, B + 5.2, 3, 5.3, 0, 0); }
    // 前庭左側（北邊）的黑色拱形雕塑
    {
      const [x, z] = wp(0.3, 6.5), tor = new THREE.TorusGeometry(1.5, 0.22, 10, 24, Math.PI);
      tor.rotateY(-Math.atan2(w.tz, w.tx)); tor.translate(x, groundY(x, z), z); k.add('black', tor);
      k.box('granite', x - 1.9, x + 1.9, groundY(x, z) - 0.2, groundY(x, z) + 0.12, z - 0.5, z + 0.5);
      shapes.push({ name: 'sculpture', pts: [[x - 1.9, z - 0.6], [x + 1.9, z - 0.6], [x + 1.9, z + 0.6], [x - 1.9, z + 0.6]], y0: B, y1: B + 1.8 });
      wallC(x - 1.6, z, x + 1.6, z, groundY(x, z) - 0.2, groundY(x, z) + 1.8);
    }
    shapes.push({ name: 'poolPortal', pts: [wp(tc - half - 0.1, 0), wp(tc + half + 0.1, 0), wp(tc + half + 0.1, 1.25), wp(tc - half - 0.1, 1.25)], y0, y1: yTop });
  }

  // ===== 體育館：西側寬紅瓦斜裙、西北米褐圓柱樓梯塔、橘紅門廊（倒 V 斜撐）、雨廊亭 =====
  const gym = find(G_IDS.gym);
  if (gym) {
    const B = baseOf(gym, 3, -226), top = B + (gym.parts?.[0]?.h || 14.5), rise = 2.0, G = GYM;
    // 主館四角 NW, NE, SE, SW；各邊往內縮（西 7 m、其他 1.5 m）得到內圈
    const C = [G.NW, G.NE, G.SE, G.SW];
    const ins = [1.5, 1.5, 1.5, 7.0]; // 邊 NW→NE（北）、NE→SE（東）、SE→SW（南）、SW→NW（西）
    const lines = C.map((a, i) => { const c = C[(i + 1) % 4], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l; return { p: [a[0] + nx * ins[i], a[1] + nz * ins[i]], d: [dx / l, dz / l] }; });
    // 法線 (-dz, dx)：順時針（俯視 x 東 z 南）走一圈時朝內
    const X = (L1, L2) => { const [p, d] = [L1.p, L1.d], [q, e] = [L2.p, L2.d], den = d[0] * e[1] - d[1] * e[0], t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den; return [p[0] + d[0] * t, p[1] + d[1] * t]; };
    const In = C.map((_, i) => X(lines[(i + 3) % 4], lines[i]));
    const yP = top + 0.8; // 斜裙從橘紅女兒牆頂開始
    for (let i = 0; i < 4; i++) {
      const a = C[i], c = C[(i + 1) % 4], ia = In[i], ic = In[(i + 1) % 4], l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      k.quad('tileRoof', [c[0], yP, c[1]], [a[0], yP, a[1]], [ia[0], yP + rise, ia[1]], [ic[0], yP + rise, ic[1]], [[l / 2.5, 0], [0, 0], [0, 3], [l / 2.5, 3]]);
    }
    // 中央平頂（太陽能板 4 列、中間縱向走道）
    k.flat('roofGrey', In, yP + rise - 0.02);
    {
      const [a, b2, c, d] = In, lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      for (const [t0, t1] of [[0.04, 0.22], [0.26, 0.46], [0.54, 0.74], [0.78, 0.96]]) {
        // 沿東西向（a→b2 為北邊）分 4 列，南北方向留 1.5 m 邊
        const p0 = lerp(lerp(a, b2, t0), lerp(d, c, t0), 0.03), p1 = lerp(lerp(a, b2, t1), lerp(d, c, t1), 0.03), p2 = lerp(lerp(a, b2, t1), lerp(d, c, t1), 0.97), p3 = lerp(lerp(a, b2, t0), lerp(d, c, t0), 0.97);
        k.flat('solar', [p0, p1, p2, p3], yP + rise + 0.35);
      }
    }
    shapes.push({ name: 'gymRoof', pts: C, y0: top, y1: yP + rise + 0.4 });
    // 西北角米褐圓柱樓梯塔（直立縫窗、頂有天線），比主館高
    {
      const [x, z] = G.drum, r = G.drumR, y0 = groundY(x, z) - 0.2, yT = B + 19.0;
      k.cyl('drum', x, z, r, y0, yT, 28); k.cyl('drum', x, z, r + 0.15, yT - 0.3, yT + 0.2, 28);
      k.box('slit', x - r - 0.04, x - r + 0.3, B + 2.0, yT - 1.5, z - 0.3, z + 0.3); // 朝西的直立縫窗
      k.box('slit', x - 0.3, x + 0.3, B + 2.0, yT - 1.5, z - r - 0.04, z - r + 0.3);  // 朝北
      k.box('steel', x - 0.06, x + 0.06, yT + 0.2, yT + 4.5, z - 0.06, z + 0.06);
      for (let i = 0; i < 3; i++) k.box('steel', x - 0.5 + i * 0.1, x + 0.5 - i * 0.1, yT + 1.5 + i * 1.0, yT + 1.55 + i * 1.0, z - 0.03, z + 0.03);
      const s = r * 0.9; wallC(x - s, z - s, x + s, z - s, y0, yT); wallC(x + s, z - s, x + s, z + s, y0, yT); wallC(x + s, z + s, x - s, z + s, y0, yT); wallC(x - s, z + s, x - s, z - s, y0, yT);
      shapes.push({ name: 'gymDrum', pts: [[x - r, z - r], [x + r, z - r], [x + r, z + r], [x - r, z + r]], y0, y1: yT });
    }
    // 西面主入口（附屬棟入口牆）：橘紅門廊框架、上段一排倒 V 斜撐、兩根灰圓柱、玻璃門面、花崗石台階
    {
      const A = G.portA, Bp = G.portB, dx = Bp[0] - A[0], dz = Bp[1] - A[1], l = Math.hypot(dx, dz), tx = dx / l, tz = dz / l, nx = dz / l, nz = -dx / l;
      const at2 = (s, o) => [A[0] + tx * s + nx * o, A[1] + tz * s + nz * o];
      const bA = baseOf(gym, A[0], A[1]), y0 = groundY(...at2(l / 2, 3)) - 0.1, yB = bA + 5.0, yTp = bA + 8.6, dep = 3.2;
      // 兩側框（橘紅厚板）與頂部大樑
      for (const s of [0.35, l - 0.35]) { const p = at2(s, 0), q = at2(s, dep); k.slab('gymOrange', p[0], p[1], q[0], q[1], 0.7, y0, yTp); wallC(p[0], p[1], q[0], q[1], y0, yTp); }
      { const p = at2(0, dep - 0.35), q = at2(l, dep - 0.35); k.slab('gymOrange', p[0], p[1], q[0], q[1], 0.7, yTp - 1.2, yTp); }
      { const p = at2(0.7, dep - 0.35), q = at2(l - 0.7, dep - 0.35); k.slab('gymOrange', p[0], p[1], q[0], q[1], 0.5, yB - 0.4, yB); }
      k.flat('gymOrange', [at2(0, 0), at2(l, 0), at2(l, dep), at2(0, dep)], yTp);
      k.flat('soffit', [at2(0.7, 0), at2(l - 0.7, 0), at2(l - 0.7, dep), at2(0.7, dep)], yTp - 1.2, true);
      // 倒 V 斜撐：下樑到上樑之間一排
      const nV = 5, s0 = 0.7, s1 = l - 0.7;
      for (let i = 0; i < nV; i++) {
        const sa = s0 + (s1 - s0) * i / nV, sb = s0 + (s1 - s0) * (i + 0.5) / nV, sc = s0 + (s1 - s0) * (i + 1) / nV;
        const pa = at2(sa, dep - 0.35), pb = at2(sb, dep - 0.35), pc = at2(sc, dep - 0.35);
        k.beam('gymOrange', [pa[0], yB, pa[1]], [pb[0], yTp - 1.2, pb[1]], 0.35, 0.35);
        k.beam('gymOrange', [pb[0], yTp - 1.2, pb[1]], [pc[0], yB, pc[1]], 0.35, 0.35);
      }
      // 兩根灰色圓柱
      for (const s of [l / 3, 2 * l / 3]) { const [x, z] = at2(s, dep - 0.5); colRound(x, z, 0.45, yB - 0.4, 'greyCol'); }
      // 玻璃門面（貼在附屬棟牆前）、花崗石台階
      { const p = at2(0.7, 0.08), q = at2(l - 0.7, 0.08); k.wall('door', q[0], q[1], p[0], p[1], y0, yB - 0.4, 3, yB - 0.4 - y0, 0, 0); }
      for (let i = 0; i < 3; i++) { const o1 = dep + 0.45 * (i + 1); k.flat('granite', [at2(1.2, 0), at2(l - 1.2, 0), at2(l - 1.2, o1), at2(1.2, o1)], y0 + 0.15 * (3 - i)); } // 花崗石台階（越外越低）
      shapes.push({ name: 'gymPortal', pts: [at2(0, 0), at2(l, 0), at2(l, dep + 2), at2(0, dep + 2)], y0, y1: yTp });
    }
    // 西北角雨廊亭：橘紅平頂、深色看板、磁磚方柱
    {
      const [px, pz] = G.pav, hw = 2.2, hl = 4.6, y0 = groundY(px, pz) - 0.1, yR2 = y0 + 3.5;
      k.box('gymOrange', px - hw - 0.3, px + hw + 0.3, yR2, yR2 + 0.55, pz - hl - 0.3, pz + hl + 0.3);
      k.box('black', px - hw - 0.32, px - hw - 0.28, yR2 - 0.7, yR2, pz - hl + 0.5, pz + hl - 0.5);
      for (const [cx, cz] of [[px - hw, pz - hl], [px + hw, pz - hl], [px - hw, pz + hl], [px + hw, pz + hl], [px - hw, pz], [px + hw, pz]]) {
        k.box('pavTile', cx - 0.25, cx + 0.25, y0, yR2, cz - 0.25, cz + 0.25);
        wallC(cx - 0.25, cz - 0.25, cx + 0.25, cz - 0.25, y0, yR2); wallC(cx + 0.25, cz - 0.25, cx + 0.25, cz + 0.25, y0, yR2); wallC(cx + 0.25, cz + 0.25, cx - 0.25, cz + 0.25, y0, yR2); wallC(cx - 0.25, cz + 0.25, cx - 0.25, cz - 0.25, y0, yR2);
      }
      shapes.push({ name: 'gymPavilion', pts: [[px - hw - 0.3, pz - hl - 0.3], [px + hw + 0.3, pz - hl - 0.3], [px + hw + 0.3, pz + hl + 0.3], [px - hw - 0.3, pz + hl + 0.3]], y0, y1: yR2 + 0.55 });
    }
  }

  // ===== 力行大樓：東端山牆（清水混凝土空白牆，高出屋頂、掛紫紅大布條）、東面遮陽板窗帶 =====
  const lx = find(G_IDS.lx);
  if (lx) {
    const B = baseOf(lx, -96, -165), h = lx.h || 17.1, fl = (h - 0.6) / 5;
    // 南翼東端（x -98.9，z -156.3..-150.7）與東翼南面（z -156.4）：空白混凝土牆，比本體高約 2 m
    const xG = -98.85, zA = -156.35, zB = -150.7, xE = -93.3, yG = B + h + 2.0;
    k.box('conc', xG - 0.05, xG + 0.3, B - 0.3, yG, zA, zB);
    k.box('conc', xG - 0.05, xE + 0.3, B - 0.3, yG, zA - 0.05, zA + 0.3);
    k.box('conc', xG - 0.05, xE + 0.3, yG - 0.3, yG, zA - 0.05, zB);
    sign(group, lxBannerTex(), 4.6, 9.2, xG + 0.32, B + 9.6, (zA + zB) / 2, 1, 0, 0.12);
    // 東面（x -93.3，z -177.4..-156.4）：清水混凝土、每層橫向長窗，窗上白色出挑遮陽板、窗下白窗台
    const z0 = -177.4, z1 = -156.6;
    for (let f = 0; f < 5; f++) {
      const y0 = B + f * fl, y1 = y0 + fl;
      k.wall('lxEast', xE + 0.05, z1, xE + 0.05, z0, y0, y1, 10, fl, 0, 0);
      k.box('white', xE + 0.05, xE + 0.75, y0 + 2.35, y0 + 2.5, z0 + 0.3, z1 - 0.3);  // 遮陽板
      k.box('white', xE + 0.05, xE + 0.3, y0 + 1.05, y0 + 1.15, z0 + 0.3, z1 - 0.3);  // 窗台
    }
    k.box('orange', xE + 0.12, xE + 0.25, B - 0.2, B + 4.0, -166.0, -165.85); // 外露橘色管線
    shapes.push({ name: 'lxEast', pts: [[xE, z0], [xE + 0.8, z0], [xE + 0.8, z1], [xE, z1]], y0: B, y1: B + h });
  }

  // ===== 南面大階梯 → 二樓門廊 → 學活二樓（js/sac.js）→ 新中北路天橋 → 力行男宿 =====
  // 大階梯與門廊平台是 data.levels（zoneGTerrain）；天橋是 tools/overrides.json 的 xinzhongbei_footbridge（LV_DECK）。
  // 門廊進門、穿過二樓中庭、從北面走上天橋都是用走的（學活室內 js/sac.js）；天橋北端是力行宿舍牆外的樓梯，往下走到二樓門口（js/lixing.js）。
  // 天橋兩側加有高度帶的欄杆碰撞。
  if (collision && landY !== null) {
    // 門廊平台三邊與大階梯兩側上段：map.js 的封邊線沒有高度帶，物理牆只到地面上 4 m，站在 3.8 m 的平台上
    // 角色控制器（腳上 0.35～1.6 m）會從牆頂上越過去，所以另外加只擋平台／上段樓梯高度的線
    {
      // （東邊不封：接入口上方的二樓門廊甲板，門廊自己的邊在前庭那段加）
      const S2 = STAIR2F, [lx0, lz0, _lx1, lz1] = S2.landing, g = landY - S2.rise, band = (ya, yb) => [Math.max(ya - 0.3, g + 2.6), yb + 1.2];
      const seg = (ax, az, bx2, bz, [ya, yb]) => collision.addSegment(ax, az, bx2, bz, ya, yb);
      seg(lx0, lz0, lx0, lz1, band(landY, landY));
      const y0 = foreY ?? g, xa = S2.x - S2.w / 2, xb = S2.x + S2.w / 2, zf = S2.zFoot, zt = S2.zTop, yAt = z => y0 + (landY - y0) * (z - zf) / (zt - zf);
      const z2 = zf + (zt - zf) * 0.6; // 樓梯下段離地不到 2.3 m，原本的封邊牆擋得住
      for (const x of [xa, xb]) seg(x, z2, x, zt, band(yAt(z2), landY));
    }
    const deckY = surfaceAt(-163.0, -141.6, 60), g0 = Hgrid(-163.0, -141.6);
    if (deckY > g0 + 3) {
      const bx = z => -162.7 + (-163.2 + 162.7) * (z + 165.0) / 36.6; // 天橋中心線（北端 z -165 → 南端 -128.4）
      // 兩側欄杆一路到力行端（z -165，接進力行南牆；最北 5.7 m 是力行牆外的樓梯，那段的欄杆碰撞在 js/lixing.js，這條只擋橋面高度）
      for (const o of [-1.42, 1.42]) collision.addSegment(bx(-165.0) + o, -165.0, bx(-128.6) + o, -128.6, deckY - 0.3, deckY + 0.6);
    }
  }

  k.finish(group);
  scene.add(group);
  I.zoneG = { group, shapes };
  return group;
}

// 多邊形在 z 這條水平線上最西（side -1）或最東（side 1）的交點 x
function xOnEdge(pts, z, side) {
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], c = pts[(i + 1) % pts.length];
    if ((a[1] - z) * (c[1] - z) > 0 || a[1] === c[1]) continue;
    const x = a[0] + (c[0] - a[0]) * (z - a[1]) / (c[1] - a[1]);
    if (best === null || (side < 0 ? x < best : x > best)) best = x;
  }
  return best;
}
