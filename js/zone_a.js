// A 區「正門／行政」校內建築外觀（都不能進去，只做外觀）。
// 做法同 js/zone_g.js、js/zone_e.js：js/map.js 照舊蓋牆，zoneALook() 在 js/main.js 蓋樓前換輪廓／名稱／look，
// buildZoneA() 自建輪廓表達不了的構件（js/interiors.js 呼叫）。
//
// 依據（campus-survey/PLAN.md 批次 1、zone-A.md 與其補充調查）：
//  - 行政大樓 w392023425（OSM 名「校史館」）：Google 衛星標籤、校方報導都說這棟是行政大樓，校史館在 1 樓兩側
//    （2017-10 揭牌）。遊戲名稱改「行政大樓（含校史館）」，js/missions.js 用 NAME_ALIAS 新舊名都找得到。
//    三層，每層樓板邊是很厚的白色水平板；1F 退縮在細白柱後面（黑框落地玻璃）；密鰭片在**西面北半段的 2F**
//    （2022-05 相片、2019-04 相片右側），不是北面；2F 板面中央金色「行政大樓」（右至左）；屋頂整面太陽能板，
//    東側南北各一座深色機房、西南一座白色小屋、深咖啡色鋼構棚架、白色細欄杆（正射 2024、空拍 2021）。
//  - 懷恩樓 w229238548：正射 2024 量到遊戲輪廓偏北，整棟往南 2 m；調查寫西端少約 4 m，但西端外面就是 OSM 服務
//    道路（輪廓離路緣只剩 1 m），正射上實際屋頂端也只比 OSM 多約 1 m，所以西端不延長。沒有中央樓梯塔
//    （2022-03 近照那座塔是後面圖書館的雙塔），屋頂全是太陽能板。南面中央門廊只有一層高：三個半圓拱、拱上
//    金屬字「懷恩樓」（右至左）、頂上是露台加紅色欄杆；正面兩翼 2F 是拱形外廊，北面（背面）沒有拱廊。
//  - 張靜愚紀念圖書館 w392023426：正射量到實際屋頂西緣比 OSM 多約 4～5 m、南緣東段多約 2 m。粗獷主義倒階梯：
//    1～3F 磁磚退縮，4F 深色帶狀玻璃、5F 混凝土方塊與細長直窗交錯，出挑下緣是一排倒三角折板；南面入口左側
//    兩片並排的斜切楔形塔（灰磁磚、中間一道窄縫，頂面斜切，約 22 m）；屋頂 3 條東西向鋸齒採光帶（北側立面是
//    玻璃）、四角各一塊 4×4 m 天窗、北側機電區（冷卻水塔）。
//  - 科學館 w392023392：正射量到主樓（西段）整體偏北東，西段往西 2.5 m、往南 1.5 m（東端接理學大樓那段不動）。
//    主樓磚紅、每層白色窗台窗楣帶；西面（山牆）是淺灰白磁磚、樓梯塔北側每層一片懸挑白色陽台＋冷氣；西南角磚紅圓角
//    樓梯塔，直排金色大字「中原大學」，塔頂白色格柵（2019-04 相片；先前說的粉紅是掛上去的布條）；天文台圓頂
//    照正射位置（約 24.957626, 121.241936）放在方形磚塔上；南面中段一條垂直玻璃樓梯窗帶。
//  - 下沉廣場「泉源之谷」用 2020 改建後的版本：耐候鋼板斜切擋土牆（刻「泉源之谷 Vale of Springs」）、米色透水
//    鋪面、草坪圓島、白色碎石庭園、灰色石板「溪流」，東南角 V 形混凝土大階梯夾花台（正射 2024、2020-10／
//    2023-10 相片）。廣場下沉 0.8 m、東側 15 m 寬大階梯與平台是 data/cycu.json 原有的 levels（沒動），這裡只換鋪面
//    與加構件。
//  - 圖書館南面平台：比步道高約 1.5 m 的磚造平台（磚牆＋混凝土壓頂的實心欄牆）。南緣是一整片約 18.7 m 寬、往北爬的
//    淺灰混凝土大階梯（上下兩段、中間一道平台），兩條南北向的混凝土花台（種馬纓丹）把它分成三段，花台旁不鏽鋼扶手；
//    東南角階梯轉過來，沿平台東緣也有一段朝東的階梯接到下沉廣場西側步道（正射 2024 量位置、2017-09 街景兩張），平台中央四片三角形玻璃天窗（地下室採光，正射 2024），大門是黑框玻璃門＋斜面玻璃雨遮、
//    上方館名，雙塔南面掛「全人」牌（2020-10 官方相片）。平台、階梯用 data.levels（zoneATerrain，可以走上去）。
//
// 共用亂數：OSM 建物的輪廓 pts 改了，但 b.acPts 留住原本輪廓（平移量相同），js/map.js 屋頂冷氣的 rnd2 抽取
// 次數因此不變；名稱、look、parts 都在 map.js 的共用抽取之後才用到（行政大樓新名稱在 STYLE_BY_NAME 也是 white）。
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { groundY, Hgrid, addPit } from './terrain.js';

export const A_IDS = { adm: 'w392023425', hue: 'w229238548', lib: 'w392023426', sci: 'w392023392' };
export const ADM_NAME = '行政大樓（含校史館）';
// 舊名 ↔ 新名（js/missions.js 找任務點時兩個都認）
export const NAME_ALIAS = { '校史館': ADM_NAME, [ADM_NAME]: '校史館' };

const mv = (P, dx, dz) => P.map(([x, z]) => [+(x + dx).toFixed(2), +(z + dz).toFixed(2)]);

// 懷恩樓：整棟往南（垂直長軸）2 m
const HUE_SHIFT = [-0.63, 1.9];
// 科學館：西段（x < -40 的頂點）平移量
const SCI_SHIFT = [-2.5, 1.5];
// 圖書館：照正射量的新輪廓（西緣 -215、南緣拉成 z ≈ -10；北側機電區凸出照 OSM）
const LIB_PTS = [[-215.0, -47.6], [-172.4, -48.7], [-172.7, -57.5], [-164.1, -56.0], [-160.6, -53.2], [-159.7, -48.6], [-152.4, -48.8], [-151.4, -10.2], [-215.0, -9.8]];
// 圖書館樓層：5F／17.1 m，上 2 層外推 2.5 m（倒階梯）
const LIB = { h: 17.1, floors: 5, over: 2.5, tfFloors: 2 };

// ---------------- 圖書館南面平台（data.levels：可以走上去的平台與兩段階梯） ----------------
// 正射 2024 量：平台西緣 x -191.9（靠雙塔那段到 -195.5）、南緣 z 15.6，東北角斜邊沿圖書館東側草坪。
// 南緣大階梯（正射 40 px/m 放大量）：x -184.7～-166.0、從 z 21.3（步道）往北爬到 z 15.6（平台），z 18.1～18.9 是中間
// 平台；兩條花台在 x -182.1～-180.5、-173.5～-171.9 貫穿全深。平台東緣 z 9.6～15.5 一段朝東的階梯（正射上的淺色條，
// 2017-09 街景從步道看過去右手邊那片一階階往上的階梯），底下接下沉廣場西側步道（data/cycu.json 的 west_landing）
const LIBP = {
  pts: [[-195.5, -12.3], [-173.2, -12.3], [-173.2, -0.9], [-167.1, 9.3], [-167.1, 15.6], [-191.9, 15.6], [-191.9, -1.0], [-195.5, -1.0]],
  main: { x0: -184.7, x1: -166.0, zB: 21.3, zL1: 18.9, zL0: 18.1, zT: 15.6, steps: 5 }, // 上下兩段各 5 階
  east: { a: [-164.4, 12.55], b: [-167.1, 12.55], w: 5.9, steps: 4 },
  // 東緣階梯、大階梯東端與西側步道（west_landing，y 0.25）之間原本是低 0.8 m 的草地，補一塊同高的步道接起來
  // （2017-09 街景：步道直接接到階梯底，沒有高低差）
  walk: { y: 0.25, pts: [[-164.4, 9.6], [-162.45, 9.6], [-162.76, 10.65], [-165.83, 21.3], [-166.0, 21.3], [-166.0, 15.5], [-164.4, 15.5]] },
  planters: [[-182.1, -180.5], [-173.5, -171.9]],
  rise: 1.5,
  // 平台東邊的下沉庭院（2019-07 街景 P5 四向、使用者 2025 相片）：樹林地面比東邊草地低約 1 m、比平台低約 2.5 m，
  // 圖書館一樓的黑框玻璃雙開門開在平台東側磚牆上（朝東、上方是建物出挑的天花），南面一樓是格柵窗；
  // 坡道從庭院往東爬到草地（兩側不鏽鋼扶手），庭院東緣草地邊是一道刻白字的磚紅色斜頂矮牆。
  // 坑（js/terrain.js addPit）只能是方塊：A 塊貼建物南面、B 塊在平台斜邊與南邊步道之間（平台底下那部分被 pad 蓋住）
  court: { A: [-173.2, -10.2, -153.0, -0.9], B: [-173.2, -0.9, -158.5, 9.6], drop: 1.0, ramp: { z: 1.5, x0: -166.5, w: 1.7 }, door: { z0: -9.4, z1: -5.6 } },
  sky: { c: [-179.4, 5.6], r: 4.4, rot: 0.26 }, // 中央四片三角玻璃天窗
};
let libPadY = null, libMidY = null, courtY = null;
// js/map.js 種完樹之後才把平台上的樹、棕櫚、灌木藏起來（opts.treeHide，種樹位置與共用亂數抽取次數不變；樹的碰撞一起拿掉）
export const zoneATreeHide = () => [LIBP.pts, LIBP.walk.pts, [[LIBP.main.x0, LIBP.main.zT], [LIBP.main.x1, LIBP.main.zT], [LIBP.main.x1, LIBP.main.zB], [LIBP.main.x0, LIBP.main.zB]]];
export function zoneATerrain(data) {
  const L = data.levels || (data.levels = {}); L.pads = L.pads || []; L.stairs = L.stairs || [];
  const P = LIBP.pts, g = Math.max(...P.map(([x, z]) => Hgrid(x, z)));
  libPadY = +(Math.min(...P.map(([x, z]) => Hgrid(x, z))) + LIBP.rise).toFixed(2);
  if (libPadY < g + 0.6) libPadY = +(g + 0.6).toFixed(2);
  const site = '張靜愚紀念圖書館南面平台';
  L.pads.push({ id: 'lib_south_terrace', y: libPadY, top: '#9a948b', wall: 'brick', site, pts: P.map(p => p.slice()) });
  // 南緣大階梯：下段（步道→中間平台）、中間平台、上段（→平台）；扶手、花台由 buildZoneA 畫
  const M = LIBP.main, xc = (M.x0 + M.x1) / 2, w = M.x1 - M.x0, gB = Hgrid(xc, M.zB + 0.5);
  libMidY = +((gB + libPadY) / 2).toFixed(2);
  L.stairs.push({ id: 'lib_south_stair_lo', site, a: [xc, M.zB], b: [xc, M.zL1], w, y0: 'ground', y1: libMidY, steps: M.steps, wall: 'granite', rail: 'none' });
  L.pads.push({ id: 'lib_south_landing', y: libMidY, top: '#b9b6ae', wall: 'granite', site, pts: [[M.x0, M.zL0], [M.x1, M.zL0], [M.x1, M.zL1], [M.x0, M.zL1]] });
  L.stairs.push({ id: 'lib_south_stair_hi', site, a: [xc, M.zL0], b: [xc, M.zT], w, y0: libMidY, y1: libPadY, steps: M.steps, wall: 'granite', rail: 'none' });
  // 下沉庭院：地面比東側草地低 drop；坡道往東爬回草地
  const C = LIBP.court;
  courtY = +(Hgrid(C.A[2] + 0.5, -5) - C.drop).toFixed(2);
  addPit(...C.A, courtY, { veg: true }); addPit(...C.B, courtY, { veg: true }); // 庭院本來就是樹林：原本種的樹留著，跟著坑底降下去
  L.stairs.push({ id: 'lib_court_ramp', site: '張靜愚紀念圖書館東側下沉庭院', a: [C.ramp.x0, C.ramp.z], b: [C.B[2] + 0.1, C.ramp.z], w: C.ramp.w, y0: courtY, y1: 'ground', steps: 0, rail: 'sides', railColour: '#c9ccce', wall: 'brick' });
  const E = LIBP.east;
  L.pads.push({ id: 'lib_east_walk', y: LIBP.walk.y, top: '#c8c4bc', wall: 'granite', site, pts: LIBP.walk.pts.map(p => p.slice()) });
  L.stairs.push({ id: 'lib_east_stair', site, a: E.a.slice(), b: E.b.slice(), w: E.w, y0: LIBP.walk.y, y1: libPadY, steps: E.steps, wall: 'granite', rail: 'none' });
}

// ---------------- 外觀 look（js/main.js 在 map.js 蓋樓前套用） ----------------
export function zoneALook(b) {
  if (b.id === A_IDS.adm) {
    b.name = ADM_NAME;
    const L = b.look || {};
    // 鰭片、樓板厚白板都改由 buildZoneA 照實景位置蓋（原本 fins on 'n' 拿掉）
    b.look = { ...L, fins: [], bands: [], parapet: { h: 0.6, colour: '#f2f1ec' }, wall: { base: 'smooth', colour: '#ecebe6' },
      windows: { ...(L.windows || {}), glass: '#3f4c55' } };
  } else if (b.id === A_IDS.hue) {
    b.acPts = b.pts; // 屋頂冷氣抽取照原本輪廓（有太陽能板，本來就不畫）
    b.pts = mv(b.pts, ...HUE_SHIFT);
    // 南面中央門廊（輪廓凸出的那塊）只有一層高，主體兩層
    const P = b.pts, bump = [P[2], P[3], P[4], P[5]], main = [P[0], P[1], P[2], P[5], P[6], P[7]];
    b.parts = [{ pts: main, h: b.h || 7.2, floors: 2, label: '主體' }, { pts: bump, h: 4.2, floors: 1, label: '門廊' }];
    b.splitAc = 1;
    const L = b.look || {};
    delete L.portal; // 門廊改成 parts 的一層量體（buildZoneA 加字、紅欄杆）
    L.windows = { ...(L.windows || {}), type: 'punched', ground: 'arch' };
    // 正面（南）兩翼 2F 是拱形外廊；背面（北）一樓沒有拱廊
    L.faces = [{ on: 's', windows: { type: 'arch' } }, { on: 'n', windows: { ground: null } }];
    b.look = L;
  } else if (b.id === A_IDS.lib) {
    b.acPts = b.pts;
    b.pts = LIB_PTS.map(p => p.slice());
    b.h = LIB.h; b.floors = LIB.floors;
    b.look = {
      wall: { base: 'tile', colour: '#a89f92' },
      windows: { types: ['punched', 'punched', 'punched', 'ribbon', 'slit'], bay: 2.6, accent: '#4a4a48', glass: '#2f383f' },
      topFloor: { floors: LIB.tfFloors, setback: -LIB.over, colour: '#6f675f' },
      parapet: { h: 0.8, colour: '#6f675f' },
      roof: { colour: '#4c4945', ac: false }, // 採光帶、天窗、機電由 buildZoneA 照正射位置蓋
    };
  } else if (b.id === A_IDS.sci) {
    b.acPts = mv(b.pts, ...SCI_SHIFT); // 平移不改冷氣抽取次數，冷氣落在實際屋頂上
    b.pts = b.pts.map(([x, z]) => (x < -40 ? [+(x + SCI_SHIFT[0]).toFixed(2), +(z + SCI_SHIFT[1]).toFixed(2)] : [x, z]));
    b.feature = (b.feature || []).filter(f => f !== 'observatory'); // 圓頂改照正射位置蓋
    const L = b.look || {};
    b.look = {
      ...L,
      wall: { base: 'tile', colour: '#9a4b3c' },
      bands: [{ colour: '#e8e4dc', h: 0.22, depth: 0.18, at: [0.03, 0.74] }], // 窗台＋窗楣兩條白帶
      faces: [{ on: 'w', colour: '#d3d5d1', windows: { type: 'punched', bay: 3.0, accent: '#e8e4dc' } }],
    };
  }
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
const noise = (g, W, H, base, n, seed, a = 0.06, sz = 6) => {
  const r = lcg(seed); g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * a})`; g.fillRect(r() * W, r() * H, 1 + r() * sz, 1 + r() * sz); }
};
// 耐候鋼板：鏽紅、深淺斑駁、直向鏽水痕、鋼板接縫
// 花台清水混凝土：淺灰、水漬斑駁、模板接縫
const concTex = () => ctex('aPlanterConc', 128, 128, (g, W, H) => {
  noise(g, W, H, '#b4b2ab', 900, 71, 0.07, 5);
  g.fillStyle = 'rgba(60,60,55,0.18)'; g.fillRect(0, H - 3, W, 3); g.fillRect(W - 2, 0, 2, H);
});
// 馬纓丹：深綠葉叢點綴橘、粉紅、黃小花
const lantanaTex = () => ctex('aLantana', 128, 128, (g, W, H) => {
  noise(g, W, H, '#3f6a30', 700, 83, 0.18, 6);
  const r = lcg(97), C = ['#e8743a', '#e9568a', '#f2c94c', '#f08a4b'];
  for (let i = 0; i < 90; i++) { g.fillStyle = C[Math.floor(r() * C.length)]; g.beginPath(); g.arc(r() * W, r() * H, 1.5 + r() * 2.5, 0, Math.PI * 2); g.fill(); }
});
const cortenTex = () => ctex('aCorten', 256, 256, (g, W, H) => {
  noise(g, W, H, '#7a3426', 1400, 3, 0.12, 8);
  const r = lcg(7);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(60,20,10,${0.08 + r() * 0.12})`; g.fillRect(r() * W, 0, 1 + r() * 3, H * (0.3 + r() * 0.7)); }
  g.fillStyle = 'rgba(30,10,5,0.5)'; g.fillRect(0, 0, 2, H); g.fillRect(W / 2, 0, 2, H);
});
// 米色透水鋪面：0.3×0.6 m 長條磚
const pavingTex = () => ctex('aPaving', 256, 256, (g, W, H) => {
  noise(g, W, H, '#c4ad86', 900, 11, 0.07, 5);
  g.fillStyle = 'rgba(120,100,70,0.35)';
  const s = W / 8; for (let y = 0; y < H; y += s / 2) { g.fillRect(0, y, W, 1); for (let x = ((y / (s / 2)) % 2) * s / 2; x < W; x += s) g.fillRect(x, y, 1, s / 2); }
});
const gravelTex = () => ctex('aGravel', 128, 128, (g, W, H) => {
  noise(g, W, H, '#e6e3da', 1600, 21, 0.18, 2);
});
const stoneTex = () => ctex('aStone', 128, 128, (g, W, H) => {
  noise(g, W, H, '#8e9092', 500, 23, 0.1, 6);
  g.fillStyle = 'rgba(40,40,40,0.4)'; for (let x = 0; x < W; x += W / 3) g.fillRect(x, 0, 2, H); g.fillRect(0, H / 2, W, 2);
});
const grassTex = () => ctex('aGrass', 128, 128, (g, W, H) => { noise(g, W, H, '#6b8a46', 1800, 29, 0.14, 2); });
// 太陽能板：深藍格子
const solarTex = () => ctex('aSolar', 128, 128, (g, W, H) => {
  g.fillStyle = '#2c3a55'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(160,180,210,0.25)'; for (let x = 0; x < W; x += W / 4) g.fillRect(x, 0, 2, H); for (let y = 0; y < H; y += H / 6) g.fillRect(0, y, W, 1);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, W / 2, H / 2);
});
// 天窗：4×4 淺色方格
const skyTex = () => ctex('aSky', 128, 128, (g, W, H) => {
  g.fillStyle = '#8c857a'; g.fillRect(0, 0, W, H);
  const s = W / 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#efe6d6' : '#e2d6c2'; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); }
});
// 採光帶北面的直立玻璃（鋁框 1.3 m）
const sawGlassTex = () => ctex('aSawGlass', 128, 64, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6f8494'); gr.addColorStop(1, '#2e3a44');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#9a9c9e'; g.fillRect(0, 0, 3, H); g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3);
});
// 科學館南面垂直玻璃樓梯窗帶（每層一道橫框）
const stairGlassTex = () => ctex('aStairGlass', 128, 128, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#6d8291'); gr.addColorStop(1, '#465863');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#55595c'; g.fillRect(0, 0, W, 4); g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H); g.fillRect(W / 2 - 1, 0, 2, H);
});
// 圖書館塔：灰色磚形磁磚
const libTileTex = () => ctex('aLibTile', 128, 128, (g, W, H) => {
  noise(g, W, H, '#8f877b', 600, 31, 0.08, 4);
  g.fillStyle = 'rgba(60,55,48,0.35)'; const s = H / 10; for (let y = 0; y < H; y += s) { g.fillRect(0, y, W, 1); for (let x = ((y / s) % 2) * W / 8; x < W; x += W / 4) g.fillRect(x, y, 1, s); }
});
// 磚紅磁磚（科學館樓梯塔、天文台塔）
const brickTex = () => ctex('aBrick', 128, 128, (g, W, H) => {
  noise(g, W, H, '#9a4b3c', 700, 37, 0.08, 4);
  g.fillStyle = 'rgba(60,25,18,0.25)'; const s = H / 12; for (let y = 0; y < H; y += s) g.fillRect(0, y, W, 1);
});
// 平台欄牆：褐灰色長條磚（2019-07 街景 R4）
const terraceBrickTex = () => ctex('aTerraceBrick', 128, 128, (g, W, H) => {
  noise(g, W, H, '#7c675a', 600, 41, 0.1, 4);
  g.fillStyle = 'rgba(45,35,30,0.45)'; const s = H / 12; for (let y = 0; y < H; y += s) { g.fillRect(0, y, W, 2); for (let x = ((y / s) % 2) * W / 6; x < W; x += W / 3) g.fillRect(x, y, 2, s); }
});
// 懷恩樓門廊正面：三個半圓拱（中間主入口略大），淺色磚拱圈、拱內退縮暗處與橘色木門（2022-03 近照）
// 貼圖對應寬 7.4 m、高 3.55 m
const huePortalTex = () => ctex('aHuePortal', 512, 246, (g, W, H) => {
  const m = W / 7.4, r = lcg(53);
  g.fillStyle = '#937d5c'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 5) for (let x = (y / 5 % 2) * 7; x < W; x += 14) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${r() * 0.08})`; g.fillRect(x, y, 13, 4); }
  for (const [cx, hw, spring] of [[1.35, 0.95, 2.1], [3.7, 1.2, 2.2], [6.05, 0.95, 2.1]]) {
    const x0 = (cx - hw) * m, x1 = (cx + hw) * m, ys = H - spring * m, rr = hw * m;
    g.fillStyle = '#d8cfc0'; g.beginPath(); g.moveTo(x0 - 8, H); g.lineTo(x0 - 8, ys); g.arc(cx * m, ys, rr + 8, Math.PI, 0); g.lineTo(x1 + 8, H); g.fill(); // 拱圈
    g.fillStyle = '#3c3530'; g.beginPath(); g.moveTo(x0, H); g.lineTo(x0, ys); g.arc(cx * m, ys, rr, Math.PI, 0); g.lineTo(x1, H); g.fill();
    const dw = hw * 0.75 * m, dh = 2.0 * m; g.fillStyle = '#c9772a'; g.fillRect(cx * m - dw, H - dh, dw * 2, dh); // 退縮牆上的橘色木門
    g.fillStyle = 'rgba(60,30,10,0.5)'; g.fillRect(cx * m - 1, H - dh, 2, dh);
  }
});
function textTex(key, w, h, draw) { return ctex(key, w, h, draw, false); }
// 橫寫字（右至左的招牌請傳入已反轉的字串）
const hText = (key, text, colour, font, w = 1024, h = 160, bg = null) => textTex(key, w, h, (g, W, H) => {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  const chars = [...text], step = W / chars.length, px = Math.min(H * 0.8, step * 0.85);
  g.font = `900 ${px}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((c, i) => { if (c === ' ') return; g.fillStyle = 'rgba(30,20,10,0.45)'; g.fillText(c, step * (i + 0.5) + 3, H / 2 + 4); g.fillStyle = colour; g.fillText(c, step * (i + 0.5), H / 2); });
});
const vText = (key, text, colour, font, w = 160, h = 1024) => textTex(key, w, h, (g, W, H) => {
  const chars = [...text], step = H / chars.length, px = Math.min(W * 0.8, step * 0.82);
  g.font = `900 ${px}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((c, i) => { g.fillStyle = 'rgba(40,25,10,0.45)'; g.fillText(c, W / 2 + 3, step * (i + 0.5) + 4); g.fillStyle = colour; g.fillText(c, W / 2, step * (i + 0.5)); });
});
const SERIF = '"Noto Serif TC","Songti TC","PMingLiU",serif', SANS = '"Noto Sans TC","PingFang TC",sans-serif';
// 耐候鋼牆上的字（淺色）
const valeTex = () => textTex('aVale', 1024, 192, (g, W, H) => {
  g.fillStyle = 'rgba(236,226,206,0.92)'; g.textBaseline = 'middle';
  g.font = `900 110px ${SERIF}`; g.textAlign = 'left'; g.fillText('泉源之谷', 20, H * 0.42);
  g.font = '600 52px "Times New Roman",serif'; g.fillText('Vale of Springs', 500, H * 0.48);
});

// 庭院東緣磚紅矮牆上的白色刻字：幾行長短不一的直書小字（相片上看不清內容，只做字跡的樣子，不寫成真的文字）
const engraveTex = () => ctex('aEngrave', 512, 128, (g, W, H) => {
  g.clearRect(0, 0, W, H);
  const r = lcg(131); g.fillStyle = 'rgba(240,236,226,0.9)';
  const cols = [[30, 0.55], [52, 0.7], [74, 0.4], [96, 0.75], [118, 0.6], [200, 0.8], [222, 0.85], [244, 0.65], [266, 0.9], [288, 0.5], [310, 0.8], [332, 0.6], [440, 0.45]];
  for (const [x, f] of cols) for (let y = 14; y < 14 + (H - 28) * f; y += 9) { g.fillRect(x + r() * 2, y, 7 + r() * 3, 3 + r() * 4); }
}, false);

// ---------------- 材質 ----------------
const MATS = {}, glowMats = [];
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const glow = (o, k = 1) => { const m = std({ emissive: '#ffd49a', emissiveIntensity: 0, ...o }); m.userData.glow = k; glowMats.push(m); return m; };
  const m = {
    white: () => std({ color: '#eceae5', roughness: 0.75 }),
    slab: () => std({ color: '#f2f1ec', roughness: 0.7 }),
    fin: () => std({ color: '#e4e4df', roughness: 0.7 }),
    gold: () => std({ color: '#c9a35a', metalness: 0.75, roughness: 0.35 }),
    darkBox: () => std({ color: '#4a4f55', roughness: 0.8 }),
    pergola: () => std({ color: '#4a3f38', roughness: 0.6, metalness: 0.4 }),
    rail: () => std({ color: '#e8e8e4', roughness: 0.5, metalness: 0.3 }),
    redRail: () => std({ color: '#b8323a', roughness: 0.55, metalness: 0.3 }),
    solar: () => std({ map: solarTex(), roughness: 0.3, metalness: 0.55, side: THREE.DoubleSide }),
    frame: () => std({ color: '#9a9c9e', roughness: 0.6, metalness: 0.4 }),
    brick: () => std({ map: brickTex(), roughness: 0.9 }),
    sciWhite: () => std({ color: '#e8e4dc', roughness: 0.8 }),
    ac: () => std({ color: '#d9d8d2', roughness: 0.6 }),
    dome: () => std({ color: '#e9e8e3', roughness: 0.45, metalness: 0.2 }),
    slot: () => std({ color: '#2a2f33', roughness: 0.4 }),
    stairGlass: () => glow({ map: stairGlassTex(), roughness: 0.15, metalness: 0.4, emissiveMap: stairGlassTex(), side: THREE.DoubleSide }, 0.8),
    huePortal: () => std({ map: huePortalTex(), roughness: 0.9, side: THREE.DoubleSide }),
    terraceBrick: () => std({ map: terraceBrickTex(), roughness: 0.95, side: THREE.DoubleSide }),
    libTile: () => std({ map: libTileTex(), roughness: 0.9, side: THREE.DoubleSide }),
    conc: () => std({ color: '#6f675f', roughness: 0.95, side: THREE.DoubleSide }),
    sawRoof: () => std({ color: '#8d877d', roughness: 0.9, side: THREE.DoubleSide }),
    sawGlass: () => glow({ map: sawGlassTex(), roughness: 0.15, metalness: 0.45, emissiveMap: sawGlassTex(), side: THREE.DoubleSide }, 0.6),
    sky: () => std({ map: skyTex(), roughness: 0.4, metalness: 0.1 }),
    skyGlass: () => glow({ color: '#7f97a6', roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.85, side: THREE.DoubleSide }, 0.4),
    cool: () => std({ color: '#b8bcbf', roughness: 0.6, metalness: 0.3 }),
    glass1f: () => glow({ color: '#2d3a42', roughness: 0.12, metalness: 0.5 }, 0.5),
    corten: () => std({ map: cortenTex(), roughness: 0.85, metalness: 0.15, side: THREE.DoubleSide }),
    paving: () => std({ map: pavingTex(), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    gravel: () => std({ map: gravelTex(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    stone: () => std({ map: stoneTex(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    grass: () => std({ map: grassTex(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    rock: () => std({ color: '#9b9a95', roughness: 0.9 }),
    step: () => std({ color: '#a39d92', roughness: 0.9, side: THREE.DoubleSide }),
    steel: () => std({ color: '#c9ccce', roughness: 0.25, metalness: 0.85 }),
    planter: () => std({ map: concTex(), roughness: 0.95 }),
    lantana: () => std({ map: lantanaTex(), roughness: 1, flatShading: true }),
    redWall: () => std({ color: '#a2463c', roughness: 0.8, side: THREE.DoubleSide }),
    courtBrick: () => std({ map: brickTex(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    bark: () => std({ color: '#5b4a3c', roughness: 1 }),
    canopy: () => std({ color: '#4d7034', roughness: 1, flatShading: true }),
    rail: () => std({ color: '#8b8378', roughness: 0.95, side: THREE.DoubleSide }), // 平台與階梯欄牆的混凝土壓頂、短柱、粗扶手（2019-07 街景 R4）
  }[key];
  return (MATS[key] = m());
}

// ---------------- 幾何累加（依材質合併） ----------------
class Acc {
  constructor() { this.parts = new Map(); }
  add(m, g) { if (g.index) g = g.toNonIndexed(); g.deleteAttribute?.('uv2'); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!this.parts.has(m)) this.parts.set(m, []); this.parts.get(m).push(g); return g; }
  box(m, x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return this.add(m, g); }
  // 水平方向沿 (ax,az)-(bx,bz)、厚 th 的直立板
  // tile：貼圖每 tile 公尺重複一次（預設整面 0..1）
  slab(m, ax, az, bx, bz, th, y0, y1, tile = 0) { const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), g = new THREE.BoxGeometry(l, y1 - y0, th); if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * l / tile, uv.getY(i) * (y1 - y0) / tile); } g.rotateY(-Math.atan2(dz, dx)); g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2); return this.add(m, g); }
  cyl(m, x, z, r, y0, y1, seg = 20, open = false) { const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, open); g.translate(x, (y0 + y1) / 2, z); return this.add(m, g); }
  quad(m, a, b, c, d, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const pos = [...a, ...b, ...c, ...a, ...c, ...d], u = [...uv[0], ...uv[1], ...uv[2], ...uv[0], ...uv[2], ...uv[3]];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.computeVertexNormals();
    return this.add(m, g);
  }
  tri(m, a, b, c) { return this.quad(m, a, b, c, c, [[0, 0], [1, 0], [0.5, 1], [0.5, 1]]); }
  // 直立牆：從 a 走到 b，法線在右手邊（往東走朝南、往北走朝東），u、v 以公尺除以 tu、tv
  wall(m, ax, az, bx, bz, y0, y1, tu = 4, tv = 4) {
    const l = Math.hypot(bx - ax, bz - az);
    return this.quad(m, [ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [[0, y0 / tv], [l / tu, y0 / tv], [l / tu, y1 / tv], [0, y1 / tv]]);
  }
  // 貼地多邊形（y 可為函式：每個頂點自己取地面高）
  flat(m, pts, y, down = false, tile = 4) {
    const v = pts.map(([x, z]) => new THREE.Vector2(x, z)), tris = THREE.ShapeUtils.triangulateShape(v, []);
    const pos = [], uv = [];
    for (const t of tris) for (const i of t) { pos.push(pts[i][0], typeof y === 'function' ? y(pts[i][0], pts[i][1]) : y, pts[i][1]); uv.push(pts[i][0] / tile, pts[i][1] / tile); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // 法線朝上（或朝下）：三角形繞向統一
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) {
      const ux = p[i + 3] - p[i], uz = p[i + 5] - p[i + 2], wx = p[i + 6] - p[i], wz = p[i + 8] - p[i + 2], ny = uz * wx - ux * wz;
      if ((ny < 0) !== down) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
    }
    g.computeVertexNormals();
    return this.add(m, g);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = !['paving', 'gravel', 'stone', 'grass', 'sky'].includes(m); mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
// 牆面貼字（招牌）：w×h 的平面，面向 (nx,nz)
function sign(group, tex, w, h, x, y, z, nx, nz, emissive = 0.1, metal = 0.3) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.4, metalness: metal, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: emissive }));
  m.position.set(x, y, z); m.rotation.y = Math.atan2(nx, nz); group.add(m); return m;
}
function pip(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
// 邊 a→c 的單位方向 t 與朝外法線 n（輪廓逆時針：n = (tz, -tx)）
const edge = (a, c) => { const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); return { l, tx: dx / l, tz: dz / l, nx: dz / l, nz: -dx / l }; };
const along = (a, e, s, o) => [a[0] + e.tx * s + e.nx * o, a[1] + e.tz * s + e.nz * o];

// ---------------- 蓋 ----------------
export function buildZoneA(I, scene, data) {
  const group = new THREE.Group(); group.name = 'zoneA';
  const k = new Acc(), shapes = [];
  const find = id => data.buildings.find(b => b.id === id);
  const baseOf = (b, x, z) => (b && Number.isFinite(b.base) ? b.base : groundY(x, z));
  const wallC = (ax, az, bx, bz, y0, y1) => I.addWall(ax, az, bx, bz, y0, y1);
  const boxColl = (P, y0, y1) => { for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length]; wallC(a[0], a[1], c[0], c[1], y0, y1); } };
  // 沿邊的直立長條（box）：邊 a→c 上 s0..s1、往外 o0..o1
  const strip = (m, a, e, s0, s1, o0, o1, y0, y1, tile = 0) => { const p = along(a, e, s0, (o0 + o1) / 2), q = along(a, e, s1, (o0 + o1) / 2); return k.slab(m, p[0], p[1], q[0], q[1], o1 - o0, y0, y1, tile); };
  // 圓管（扶手）：a→b，半徑 r
  const tube = (m, a, b, r) => {
    const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), l = v.length();
    const g = new THREE.CylinderGeometry(r, r, l, 8, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); return k.add(m, g);
  };
  const stripPts = (a, e, s0, s1, o0, o1) => [along(a, e, s0, o0), along(a, e, s1, o0), along(a, e, s1, o1), along(a, e, s0, o1)];

  // ===== 行政大樓（含校史館） =====
  const adm = find(A_IDS.adm);
  if (adm) {
    const P = adm.pts, B = baseOf(adm, -78, 98), fl = (adm.h - 0.6) / adm.floors, top = B + adm.h; // 3F：fl 3.3
    const [NW, NE, SE, SW] = P;
    const at = (u, v) => { const n = [NW[0] + (NE[0] - NW[0]) * v, NW[1] + (NE[1] - NW[1]) * v], s = [SW[0] + (SE[0] - SW[0]) * v, SW[1] + (SE[1] - SW[1]) * v]; return [n[0] + (s[0] - n[0]) * u, n[1] + (s[1] - n[1]) * u]; };
    const du = edge(NW, SW); // 由北往南
    // 每層樓板邊的厚白板（2F、3F 樓板與屋頂邊），比牆面外凸約 0.8 m，轉角接起來
    for (const [yc, hh] of [[B + fl, 0.6], [B + 2 * fl, 0.6], [top - 0.15, 0.5]]) {
      for (let i = 0; i < P.length; i++) {
        const a = P[i], c = P[(i + 1) % P.length], e = edge(a, c);
        strip('slab', a, e, -0.85, e.l + 0.85, -0.15, 0.85, yc - hh / 2, yc + hh / 2);
      }
    }
    // 西面（SW→NW）北半段 2F 的白色直立鰭片，間距約 0.55 m
    const eW = edge(SW, NW);
    for (let s = eW.l * 0.5 + 0.3; s < eW.l - 0.4; s += 0.55) {
      const p = along(SW, eW, s, 0.05), q = along(SW, eW, s, 0.6);
      k.slab('fin', p[0], p[1], q[0], q[1], 0.12, B + fl + 0.3, B + 2 * fl - 0.3);
    }
    // 2F 樓板（3F 樓板邊）中央金色「行政大樓」，右至左讀
    { const c = along(SW, eW, eW.l * 0.5, 0.87); sign(group, hText('aAdmName', '樓大政行', '#d6ad5c', SERIF), 3.4, 0.5, c[0], B + 2 * fl, c[1], eW.nx, eW.nz, 0.12, 0.6); }
    // 1F：細白柱（在出挑下方，牆退縮 1 m），校史館兩側入口的小門牌
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length], e = edge(a, c), n = Math.max(1, Math.round(e.l / 3.6));
      for (let j = 0; j <= n; j++) {
        const [x, z] = along(a, e, (j / n) * e.l, -0.35), y0 = groundY(x, z) - 0.1;
        k.cyl('white', x, z, 0.16, y0, B + fl - 0.25, 10);
        boxColl([[x - 0.16, z - 0.16], [x + 0.16, z - 0.16], [x + 0.16, z + 0.16], [x - 0.16, z + 0.16]], y0, B + fl);
      }
    }
    for (const fr of [0.22, 0.78]) {
      const c = along(SW, eW, eW.l * fr, -0.95);
      sign(group, hText('aHisName', '校史館', '#d6ad5c', SERIF, 512, 160, 'rgba(30,30,32,0.92)'), 1.5, 0.45, c[0], B + 2.55, c[1], eW.nx, eW.nz, 0.15, 0.4);
    }
    // 屋頂：東側南北兩座深色機房、西南白色小屋、兩座深咖啡色鋼構棚架、白色細欄杆
    const ubox = (m, u, v, lu, lv, h) => { const c = at(u, v); const p = [c[0] - du.tx * lu / 2, c[1] - du.tz * lu / 2], q = [c[0] + du.tx * lu / 2, c[1] + du.tz * lu / 2]; k.slab(m, p[0], p[1], q[0], q[1], lv, top, top + h); };
    ubox('darkBox', 0.12, 0.8, 4.0, 3.2, 2.6);
    ubox('darkBox', 0.86, 0.8, 4.0, 3.2, 2.6);
    ubox('white', 0.9, 0.18, 2.6, 2.6, 2.8);
    for (const u0 of [0.36, 0.58]) {
      const lu = 6, lv = 5, ys = top + 2.6;
      for (const du2 of [-lu / 2, lu / 2]) for (const dv of [-lv / 2, lv / 2]) {
        const c = at(u0, 0.5), x = c[0] + du.tx * du2 + du.nx * dv, z = c[1] + du.tz * du2 + du.nz * dv;
        k.box('pergola', x - 0.1, x + 0.1, top, ys, z - 0.1, z + 0.1);
      }
      for (const dv of [-lv / 2, -lv / 6, lv / 6, lv / 2]) { const c = at(u0, 0.5), p = [c[0] - du.tx * lu / 2 + du.nx * dv, c[1] - du.tz * lu / 2 + du.nz * dv], q = [c[0] + du.tx * lu / 2 + du.nx * dv, c[1] + du.tz * lu / 2 + du.nz * dv]; k.slab('pergola', p[0], p[1], q[0], q[1], 0.12, ys - 0.2, ys); }
    }
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length], e = edge(a, c);
      strip('rail', a, e, 0.3, e.l - 0.3, -0.35, -0.3, top + 1.05, top + 1.1);
      for (let s = 0.3; s < e.l - 0.2; s += 2.0) { const p = along(a, e, s, -0.32); k.box('rail', p[0] - 0.025, p[0] + 0.025, top + 0.6, top + 1.1, p[1] - 0.025, p[1] + 0.025); }
    }
    shapes.push({ name: 'admSlabs', pts: P.map(p => p.slice()), y0: B, y1: top + 2.8 });
  }

  // ===== 懷恩樓：門廊加字與紅欄杆、屋頂太陽能板 =====
  const hue = find(A_IDS.hue);
  if (hue && hue.parts) {
    const B = baseOf(hue, -185, 30), [main, bump] = hue.parts.map(V => V.pts), topM = B + hue.parts[0].h, topB = B + hue.parts[1].h;
    // 門廊南面（bump[1]→bump[2]）：拱上方金屬字「懷恩樓」，右至左讀
    const eS = edge(bump[1], bump[2]);
    { const c = along(bump[1], eS, eS.l / 2, 0.04); sign(group, hText('aHueName', '樓恩懷', '#d9c08a', SERIF, 768, 192), 3.0, 0.55, c[0], topB - 0.32, c[1], eS.nx, eS.nz, 0.1, 0.7); }
    // 三個半圓拱（蓋在 map.js 依 4 m 間距排的兩個拱上）
    { const p = along(bump[1], eS, 0, 0.03), q = along(bump[1], eS, eS.l, 0.03), y0 = Math.min(groundY(...p), groundY(...q)) - 0.05;
      k.quad('huePortal', [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], B + 3.55, q[1]], [p[0], B + 3.55, p[1]], [[0, (y0 - B) / 3.55], [1, (y0 - B) / 3.55], [1, 1], [0, 1]]); }
    // 露台紅色欄杆（門廊頂三面，在 0.7 m 女兒牆上）
    for (const [a, c] of [[bump[0], bump[1]], [bump[1], bump[2]], [bump[2], bump[3]]]) {
      const e = edge(a, c), y0 = topB + 0.7;
      strip('redRail', a, e, 0.1, e.l - 0.1, -0.2, -0.12, y0 + 0.42, y0 + 0.5);
      strip('redRail', a, e, 0.1, e.l - 0.1, -0.2, -0.12, y0 + 0.05, y0 + 0.1);
      for (let s = 0.1; s <= e.l - 0.05; s += 0.6) { const p = along(a, e, s, -0.16); k.box('redRail', p[0] - 0.03, p[0] + 0.03, y0, y0 + 0.5, p[1] - 0.03, p[1] + 0.03); }
    }
    // 屋頂太陽能板：沿長軸兩排長帶（每排 2 列斜板），四周留 1 m 檢修走道
    const eN = edge(main[5], main[0]); // 北面由西往東
    const O = main[5], U = [eN.tx, eN.tz], V = [-eN.nx, -eN.nz]; // V 朝南
    const loc = ([x, z]) => [(x - O[0]) * U[0] + (z - O[1]) * U[1], (x - O[0]) * V[0] + (z - O[1]) * V[1]];
    const W = Math.max(...main.map(p => loc(p)[1])), u0 = Math.min(...main.map(p => loc(p)[0])), u1 = Math.max(...main.map(p => loc(p)[0]));
    const Wp = (u, v) => [O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v];
    const inRoof = (u, v) => { const p = Wp(u, v); return pip(p[0], p[1], main); };
    for (let v = 1.0; v + 1.7 <= W - 1.0; v += 2.2) {
      let run = null;
      const flush = () => {
        if (!run) return;
        const [ua, ub] = run, A = Wp(ua, v), Bp = Wp(ub, v), C = Wp(ub, v + 1.7), D = Wp(ua, v + 1.7), y0 = topM + 0.75, y1 = topM + 0.3;
        k.quad('solar', [A[0], y0, A[1]], [Bp[0], y0, Bp[1]], [C[0], y1, C[1]], [D[0], y1, D[1]], [[0, 0], [(ub - ua) / 2, 0], [(ub - ua) / 2, 1], [0, 1]]);
        k.quad('frame', [Bp[0], topM, Bp[1]], [A[0], topM, A[1]], [A[0], y0, A[1]], [Bp[0], y0, Bp[1]]);
        run = null;
      };
      for (let u = u0 + 1; u + 2 <= u1 - 1; u += 2) {
        const ok = inRoof(u, v) && inRoof(u + 2, v) && inRoof(u, v + 1.7) && inRoof(u + 2, v + 1.7);
        if (ok) run = run ? [run[0], u + 2] : [u, u + 2]; else flush();
      }
      flush();
    }
    shapes.push({ name: 'huePortalRail', pts: bump.map(p => p.slice()), y0: B, y1: topB + 1.2 });
  }

  // ===== 張靜愚紀念圖書館 =====
  const lib = find(A_IDS.lib);
  if (lib) {
    const P = lib.pts, B = baseOf(lib, -183, -30), fl = (lib.h - 0.6) / lib.floors, top = B + lib.h, yT = B + (lib.floors - LIB.tfFloors) * fl;
    // 出挑下緣的倒三角折板：每 2.6 m 一個倒金字塔（外緣在出挑底，尖端落在退縮的牆上、低 0.55 m（不切到 3F 窗頂））
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length], e = edge(a, c);
      if (e.l < 4) continue;
      const n = Math.max(1, Math.round(e.l / 2.6)), st = e.l / n;
      for (let j = 0; j < n; j++) {
        const s0 = j * st, s1 = s0 + st, o0 = along(a, e, s0, 0), o1 = along(a, e, s1, 0), i0 = along(a, e, s0, -LIB.over), i1 = along(a, e, s1, -LIB.over), ap = along(a, e, (s0 + s1) / 2, -LIB.over + 0.05);
        const O0 = [o0[0], yT, o0[1]], O1 = [o1[0], yT, o1[1]], I0 = [i0[0], yT, i0[1]], I1 = [i1[0], yT, i1[1]], A = [ap[0], yT - 0.55, ap[1]];
        k.tri('conc', O0, O1, A); k.tri('conc', I0, O0, A); k.tri('conc', O1, I1, A);
      }
    }
    // 屋頂 3 條東西向鋸齒採光帶：北側直立玻璃、往南斜下
    const x0 = -205, x1 = -165, hs = 1.2, dpt = 3.4; // 每條約 3.4 m 寬，條帶之間露出約 2 m 深色屋面（正射上的暗帶）
    for (const zN of [-37.8, -32.4, -27.0]) {
      const zS = zN + dpt;
      k.quad('sawGlass', [x1, top, zN], [x0, top, zN], [x0, top + hs, zN], [x1, top + hs, zN], [[0, 0], [(x1 - x0) / 1.3, 0], [(x1 - x0) / 1.3, 1], [0, 1]]);
      k.quad('sawRoof', [x0, top + hs, zN], [x0, top, zS], [x1, top, zS], [x1, top + hs, zN]);
      k.tri('sawRoof', [x0, top, zN], [x0, top, zS], [x0, top + hs, zN]);
      k.tri('sawRoof', [x1, top, zS], [x1, top, zN], [x1, top + hs, zN]);
    }
    // 四角天窗（約 4.6 m 見方，淺色方格）
    for (const [cx, cz] of [[-207.8, -39.8], [-161.0, -40.6], [-207.0, -15.3], [-160.4, -16.9]]) {
      k.box('conc', cx - 2.4, cx + 2.4, top, top + 0.45, cz - 2.4, cz + 2.4);
      k.flat('sky', [[cx - 2.2, cz - 2.2], [cx + 2.2, cz - 2.2], [cx + 2.2, cz + 2.2], [cx - 2.2, cz + 2.2]], top + 0.47, false, 4.4);
    }
    // 北側機電區：兩座冷卻水塔、一座機房
    for (const [cx, cz] of [[-179.0, -42.7], [-172.4, -43.5]]) { k.cyl('cool', cx, cz, 1.4, top, top + 2.2, 16); k.cyl('darkBox', cx, cz, 0.9, top + 2.2, top + 2.5, 12); }
    k.box('darkBox', -192.7, -188.7, top, top + 2.5, -42.0, -38.0);
    k.box('cool', -168.5, -163.5, top, top + 1.6, -53.5, -49.5);
    // 南面入口左側的斜切楔形雙塔：兩片並排的灰磁磚板塊、中間一道窄縫，頂面北高南低
    const zA = -9.9 - LIB.over, zB = -6.6;
    for (const [xa, xb] of [[-204.2, -200.3], [-199.5, -195.6]]) {
      const yN = B + 22.0, yS = B + 15.8, g0 = groundY((xa + xb) / 2, zB) - 0.2;
      k.wall('libTile', xa, zA, xa, zB, g0, yS, 3, 3); // 西面（往南走朝西）
      k.wall('libTile', xb, zB, xb, zA, g0, yS, 3, 3); // 東面
      k.wall('libTile', xa, zB, xb, zB, g0, yS, 3, 3); // 南面
      k.tri('libTile', [xa, yS, zA], [xa, yS, zB], [xa, yN, zA]);
      k.tri('libTile', [xb, yS, zB], [xb, yS, zA], [xb, yN, zA]);
      k.quad('libTile', [xa, yN, zA], [xa, yS, zB], [xb, yS, zB], [xb, yN, zA]);
      k.wall('libTile', xb, zA, xa, zA, top, yN, 3, 3); // 北面高出屋頂的部分
      boxColl([[xa, zA], [xb, zA], [xb, zB], [xa, zB]], g0, yN);
      shapes.push({ name: 'libTower', pts: [[xa, zA], [xb, zA], [xb, zB], [xa, zB]], y0: g0, y1: yN });
    }
    k.box('slot', -200.3, -199.5, B, B + 15.6, -10.5, -6.9); // 兩塔之間的窄縫（深色）
    // ---- 南面平台的構件（平台與階梯本身是 data.levels，js/map.js 畫磚牆、封邊） ----
    if (libPadY !== null) {
      const yP = libPadY, zW = -9.9 - LIB.over + 0.02;
      // 平台外緣：褐灰長條磚牆面（蓋過 map.js pad 的紅磚擋土牆，外推 3 cm），上面 0.5 m 磚欄牆＋短柱＋混凝土扶手
      // （2019-07 街景 R4：磚牆頂一條混凝土扶手架在短柱上，中間是空的）
      const brickUV = (l, h) => [[0, 0], [l / 1.6, 0], [l / 1.6, h / 1.6], [0, h / 1.6]];
      // 欄牆斷面（平台面以上的高度）：實心磚 0.55 m、壓頂 0.15 m、短柱 0.3 m、扶手樑 0.22 m；短柱約 2.4 m 一根
      const RAIL = { brick: 0.55, cope: 0.7, post: 1.0, top: 1.22, gap: 2.4 };
      const cap = (a, c) => {
        const e = edge(a, c);
        let g = Infinity; for (let t = 0; t <= 1.001; t += 0.1) g = Math.min(g, groundY(...along(a, e, e.l * t, 0.5)));
        const p = along(a, e, 0, 0.03), q = along(a, e, e.l, 0.03), yb = g - 0.6;
        k.quad('terraceBrick', [p[0], yb, p[1]], [q[0], yb, q[1]], [q[0], yP + 0.5, q[1]], [p[0], yP + 0.5, p[1]], brickUV(e.l, yP + 0.5 - yb));
        strip('terraceBrick', a, e, 0, e.l, -0.28, 0.0, yP, yP + RAIL.brick, 1.6);
        // 混凝土壓頂（比磚牆兩側各寬出幾公分）→ 稀疏的矮胖短柱 → 厚實的混凝土扶手樑
        strip('rail', a, e, -0.04, e.l + 0.04, -0.32, 0.04, yP + RAIL.brick, yP + RAIL.cope);
        const n = Math.max(1, Math.round(e.l / RAIL.gap));
        for (let i = 0; i <= n; i++) { const s2 = Math.min(Math.max(e.l * i / n, 0.14), e.l - 0.14); strip('rail', a, e, s2 - 0.14, s2 + 0.14, -0.26, -0.02, yP + RAIL.cope, yP + RAIL.post); }
        strip('rail', a, e, -0.04, e.l + 0.04, -0.3, 0.02, yP + RAIL.post, yP + RAIL.top);
      };
      // 南緣只剩大階梯西邊那段（x -191.9～-184.7）有欄牆；大階梯與東緣階梯是開放的
      for (const [a, c] of [[[-191.9, -1.0], [-191.9, 15.6]], [[-191.9, 15.6], [-184.7, 15.6]], [[-167.1, 9.3], [-173.2, -0.9]], [[-173.2, -0.9], [-173.2, -12.3]], [[-195.5, -1.0], [-191.9, -1.0]], [[-195.5, -6.6], [-195.5, -1.0]]]) cap(c, a);
      // ---- 南緣大階梯（2017-09 街景）：淺灰混凝土踏階是 data.levels 畫的；這裡加兩條貫穿全深的混凝土花台
      // （頂面跟著踏階一階階往上、高出踏階約 0.6 m，種馬纓丹）與花台東側的不鏽鋼扶手 ----
      const M = LIBP.main;
      const surf = (x, z) => groundY(x, z);
      for (const [px0, px1] of LIBP.planters) {
        const xc = (px0 + px1) / 2, n = 24, dz = (M.zB + 0.3 - M.zT) / n;
        let gMin = Infinity, yMax = -Infinity;
        for (let i = 0; i < n; i++) {
          const z0 = M.zT + i * dz, z1 = z0 + dz, ys = surf(xc, (z0 + z1) / 2), g = Math.min(ys, groundY(xc, M.zB + 0.6)) - 0.3;
          k.box('planter', px0, px1, g, ys + 0.6, z0, z1); gMin = Math.min(gMin, g); yMax = Math.max(yMax, ys + 0.6);
          // 馬纓丹：一叢叢矮灌木（深綠帶橘、粉紅小花）
          if (i % 2 === 0) { const gg = new THREE.DodecahedronGeometry(0.62, 0); gg.scale(1.15, 0.55, 1.0); gg.translate(xc + (i % 4 ? 0.12 : -0.12), ys + 0.85, (z0 + z1) / 2 + dz / 2); k.add('lantana', gg); }
        }
        boxColl([[px0, M.zT], [px1, M.zT], [px1, M.zB + 0.3], [px0, M.zB + 0.3]], gMin, yMax + 0.4);
        shapes.push({ name: 'libPlanter', pts: [[px0, M.zT], [px1, M.zT], [px1, M.zB + 0.3], [px0, M.zB + 0.3]], y0: gMin, y1: yMax });
        // 不鏽鋼扶手：花台東側 0.35 m，從步道一路沿踏階斜上到平台，底端往下彎（2017-09 街景）
        const rx = px1 + 0.35, pts = [];
        for (let z = M.zB + 0.4; z >= M.zT - 0.2; z -= 0.6) pts.push([rx, surf(rx, z) + 0.9, z]);
        for (let i = 0; i < pts.length - 1; i++) tube('steel', pts[i], pts[i + 1], 0.025);
        for (let i = 0; i < pts.length; i += 3) tube('steel', [rx, pts[i][1] - 0.9, pts[i][2]], pts[i], 0.022);
        tube('steel', [rx, pts[0][1] - 0.9, pts[0][2] + 0.35], [rx, pts[0][1], pts[0][2] + 0.35], 0.022);
        tube('steel', [rx, pts[0][1], pts[0][2] + 0.35], pts[0], 0.025);
      }
      // ---- 平台東邊的下沉庭院（坑在 zoneATerrain 挖；地面網格在坑上方被遮掉，這裡畫地面、擋土牆與構件） ----
      if (courtY !== null) {
        const C = LIBP.court, yC = courtY, [ax0, az0, ax1, az1] = C.A, [bx0, bz0, bx1, bz1] = C.B;
        const top = (x, z) => Hgrid(x, z);
        // 地面：樹下青苔草地，靠門口一片紅磚鋪面（P5 h180、h270）
        k.flat('grass', [[ax0, az0], [ax1, az0], [ax1, az1], [bx1, bz0], [bx1, bz1], [bx0, bz1]], yC + 0.02);
        k.flat('courtBrick', [[ax0, az0 + 0.6], [ax0 + 7.5, az0 + 0.6], [ax0 + 7.5, -3.6], [ax0, -3.6]], yC + 0.04, false, 1.6);
        k.flat('courtBrick', [[ax0 + 4.0, -3.6], [ax0 + 7.5, -3.6], [C.ramp.x0, C.ramp.z - 0.85], [C.ramp.x0 - 2.0, C.ramp.z + 0.85]], yC + 0.04, false, 1.6);
        // 擋土牆：東緣（A 塊東邊）、A 塊南緣、B 塊東緣（坡道處留口）、B 塊南緣（南邊步道 pad 那段 map.js 已畫），牆頂高出草地 0.1 m
        const ret = (a, c, m = 'terraceBrick', over = 0.1, coll = true) => {
          const e = edge(a, c), n = Math.max(2, Math.ceil(e.l / 1.0));
          for (let i = 0; i < n; i++) {
            const p = along(a, e, e.l * i / n, 0), q = along(a, e, e.l * (i + 1) / n, 0), yt = Math.max(top(...p), top(...q)) + over;
            k.quad(m, [p[0], yC - 0.1, p[1]], [q[0], yC - 0.1, q[1]], [q[0], yt, q[1]], [p[0], yt, p[1]], [[0, 0], [e.l / n / 1.6, 0], [e.l / n / 1.6, (yt - yC) / 1.6], [0, (yt - yC) / 1.6]]);
          }
          if (coll) wallC(a[0], a[1], c[0], c[1], yC - 0.1, Math.max(top(...a), top(...c)) + 1.2);
        };
        const rz0 = C.ramp.z - C.ramp.w / 2 - 0.15, rz1 = C.ramp.z + C.ramp.w / 2 + 0.15;
        ret([ax1, az1], [bx1, az1]);
        ret([bx1, az1], [bx1, rz0]); ret([bx1, rz1], [bx1, bz1]);
        ret([bx1, bz1], [-164.4, bz1]);
        // 南緣、B 塊東緣牆頂的不鏽鋼欄杆（坡道口除外）
        for (const [a, c] of [[[ax1, az1], [bx1, az1]], [[bx1, az1], [bx1, rz0]], [[bx1, rz1], [bx1, bz1]]]) {
          const e = edge(a, c), n = Math.max(2, Math.round(e.l / 1.6)), P = [];
          for (let i = 0; i <= n; i++) { const q = along(a, e, e.l * i / n, -0.12); P.push([q[0], top(...q) + 0.1, q[1]]); }
          for (let i = 0; i < n; i++) tube('steel', [P[i][0], P[i][1] + 0.9, P[i][2]], [P[i + 1][0], P[i + 1][1] + 0.9, P[i + 1][2]], 0.025);
          for (const q of P) tube('steel', q, [q[0], q[1] + 0.9, q[2]], 0.022);
        }
        // 東緣：磚紅色斜頂矮牆（北高南低）＋白色刻字，北端接一段混凝土矮台（使用者相片）
        { const a = [ax1, az0], c = [ax1, az1], e = edge(a, c), n = 12, h0 = 1.0, h1 = 0.35;
          for (let i = 0; i < n; i++) {
            const t0 = i / n, t1 = (i + 1) / n, p = along(a, e, e.l * t0, 0), q = along(a, e, e.l * t1, 0);
            const y0 = top(...p) + h0 + (h1 - h0) * t0, y1 = top(...q) + h0 + (h1 - h0) * t1;
            k.quad('redWall', [p[0] + 0.12, yC - 0.1, p[1]], [q[0] + 0.12, yC - 0.1, q[1]], [q[0] + 0.12, y1, q[1]], [p[0] + 0.12, y0, p[1]]);
            k.quad('redWall', [p[0] - 0.12, yC - 0.1, p[1]], [q[0] - 0.12, yC - 0.1, q[1]], [q[0] - 0.12, y1, q[1]], [p[0] - 0.12, y0, p[1]]);
            k.quad('redWall', [p[0] - 0.12, y0, p[1]], [q[0] - 0.12, y1, q[1]], [q[0] + 0.12, y1, q[1]], [p[0] + 0.12, y0, p[1]]);
          }
          k.quad('redWall', [ax1 - 0.12, yC - 0.1, az1], [ax1 + 0.12, yC - 0.1, az1], [ax1 + 0.12, top(ax1, az1) + h1, az1], [ax1 - 0.12, top(ax1, az1) + h1, az1]);
          wallC(ax1, az0, ax1, az1, yC - 0.1, top(ax1, (az0 + az1) / 2) + 1.2);
          // 刻字在朝東（草地）那面，偏南段
          const zc = az0 + (az1 - az0) * 0.6, yt = top(ax1, zc) + h0 + (h1 - h0) * 0.6;
          sign(group, engraveTex(), 3.6, 0.9, ax1 + 0.14, yt - 0.5, zc, 1, 0, 0.05, 0.05);
          k.box('planter', ax1 + 0.15, ax1 + 1.1, top(ax1 + 0.6, az0 + 1.2) - 0.2, top(ax1 + 0.6, az0 + 1.2) + 0.4, az0 + 0.3, az0 + 2.3);
          shapes.push({ name: 'libCourtRedWall', pts: [[ax1 - 0.12, az0], [ax1 + 0.12, az0], [ax1 + 0.12, az1], [ax1 - 0.12, az1]], y0: yC, y1: top(ax1, az0) + h0 });
        }
        // 建物南面一樓：坑把地面降低了，牆腳補磚、一樓格柵窗往下延伸到庭院地面（P5 h000）
        { const zf = az0 + 0.04, gB = top(ax0 + 1, az0 - 0.5);
          k.wall('terraceBrick', ax0, zf, ax1, zf, yC - 0.1, gB + 0.2, 1.6, 1.6);
          for (let x = ax0 + 8.5; x < ax1 - 1; x += 3.6) { k.box('slot', x, x + 2.8, yC + 0.5, gB + 2.6, zf - 0.02, zf + 0.03); for (let j = 1; j < 4; j++) k.box('frame', x + j * 0.7 - 0.03, x + j * 0.7 + 0.03, yC + 0.5, gB + 2.6, zf + 0.03, zf + 0.06); }
        }
        // 一樓入口：平台東側磚牆上的黑框玻璃雙開門＋上方氣窗（朝東，P5 h270），門前天花是建物出挑
        { const x = ax0 + 0.08, { z0, z1 } = C.door, yD = yC + 2.5, yT = yC + 3.2;
          k.wall('glass1f', x, z1, x, z0, yC, yT, 1.9, 3.2);
          for (const z of [z0, (z0 + z1) / 2 - 0.9, (z0 + z1) / 2, (z0 + z1) / 2 + 0.9, z1]) k.box('slot', x, x + 0.1, yC, yT, z - 0.05, z + 0.05);
          k.box('slot', x, x + 0.1, yD - 0.05, yD + 0.05, z0, z1);
          for (const z of [(z0 + z1) / 2 - 0.25, (z0 + z1) / 2 + 0.25]) tube('steel', [x + 0.16, yC + 0.85, z], [x + 0.16, yC + 1.55, z], 0.02);
          k.box('darkBox', x + 0.02, x + 1.8, yC + 0.01, yC + 0.03, z0 + 0.2, z1 - 0.2); // 腳踏墊
          k.box('conc', x, x + 2.6, yT + 0.1, yT + 0.4, az0, z1 + 0.6); // 門口上方的混凝土天花
          wallC(x, z0, x, z1, yC, yT);
        }
        // 庭院裡的大樹（P5 相片：整片樹林；這塊原本沒有種到樹，補幾棵，只加細的樹幹碰撞）
        for (const [x, z, h, r] of [[-167.5, -6.5, 8.5, 3.6], [-160.5, -7.5, 9.5, 4.0], [-156.0, -3.2, 8.0, 3.4], [-164.5, -2.6, 9.0, 3.8], [-162.0, 5.5, 8.5, 3.4]]) {
          k.cyl('bark', x, z, 0.22, yC, yC + h * 0.62, 8);
          const g1 = new THREE.DodecahedronGeometry(r, 1); g1.scale(1.0, 0.45, 1.0); g1.translate(x, yC + h * 0.78, z); k.add('canopy', g1);
          const g2 = new THREE.DodecahedronGeometry(r * 0.6, 0); g2.scale(1.0, 0.5, 1.0); g2.translate(x + r * 0.3, yC + h * 0.95, z - r * 0.2); k.add('canopy', g2);
          boxColl([[x - 0.25, z - 0.25], [x + 0.25, z - 0.25], [x + 0.25, z + 0.25], [x - 0.25, z + 0.25]], yC, yC + 3);
        }
        // 南面二樓陽台（2019-07 街景 P5 h000、h090）：一樓窗戶上方沿南面一整條、約 2.4 m 深，褐灰磚欄牆＋混凝土壓頂
        // 與短柱扶手，上方是 3F 出挑；東端接東面室外樓梯的頂，中段南牆一樘黑框玻璃門進館。只做外觀（不能走上去）
        { const y2 = B + fl, xw = ax0, xe = -149.9, zN = az0, zS = az0 + 2.4;
          k.box('conc', xw, xe, y2 - 0.35, y2, zN, zS); // 樓板
          const par = (a, c) => { const e = edge(a, c);
            strip('terraceBrick', a, e, 0, e.l, -0.25, 0, y2, y2 + 0.55, 1.6);
            strip('rail', a, e, -0.03, e.l + 0.03, -0.29, 0.03, y2 + 0.55, y2 + 0.68);
            const n = Math.max(1, Math.round(e.l / 2.4));
            for (let i = 0; i <= n; i++) { const s2 = Math.min(Math.max(e.l * i / n, 0.13), e.l - 0.13); strip('rail', a, e, s2 - 0.13, s2 + 0.13, -0.24, -0.02, y2 + 0.68, y2 + 0.95); }
            strip('rail', a, e, -0.03, e.l + 0.03, -0.27, 0.01, y2 + 0.95, y2 + 1.12);
            wallC(a[0], a[1], c[0], c[1], y2 - 0.35, y2 + 1.12);
          };
          // 輪廓逆時針（朝外法線在右手）：南緣由東往西、西端由南往北；東端只封樓梯頂以南那段
          par([xe, zS], [xw, zS]); par([xw, zS], [xw, zN]); par([xe, zN + 1.1], [xe, zS]);
          k.quad('terraceBrick', [xw, y2 - 0.35, zS + 0.04], [xe, y2 - 0.35, zS + 0.04], [xe, y2, zS + 0.04], [xw, y2, zS + 0.04]);
          // 進館門：黑框玻璃雙開門＋氣窗（朝南）
          const dx0 = -160.2, dx1 = -157.6, zf = zN + 0.03, yD = y2 + 2.5;
          k.wall('glass1f', dx0, zf, dx1, zf, y2, y2 + 3.0, 2.6, 3.0);
          for (const x of [dx0, (dx0 + dx1) / 2, dx1]) k.box('slot', x - 0.05, x + 0.05, y2, y2 + 3.0, zf, zf + 0.1);
          k.box('slot', dx0, dx1, yD - 0.05, yD + 0.05, zf, zf + 0.1);
          for (const x of [(dx0 + dx1) / 2 - 0.22, (dx0 + dx1) / 2 + 0.22]) tube('steel', [x, y2 + 0.85, zf + 0.15], [x, y2 + 1.55, zf + 0.15], 0.02);
          shapes.push({ name: 'libBalcony2F', pts: [[xw, zN], [xe, zN], [xe, zS], [xw, zS]], y0: y2 - 0.35, y1: y2 + 1.12 });
        }
        // 圖書館東面的室外樓梯（2019-07 街景 Q5 h200、h270）：貼著東牆由北往南爬到二樓陽台，外側磚牆、斜混凝土扶牆，
        // 踏階紅褐色磁磚；樓梯底下就是一樓。只做外觀（實心，有碰撞）
        { const xa = -151.75, xb = -149.9, zB = -22.0, zT = -11.4, n = 20, gS = top((xa + xb) / 2, zB - 0.5), yTop = B + fl; // 頂端接南面二樓陽台
          for (let i = 0; i < n; i++) { const z0 = zB + (zT - zB) * i / n, z1 = zB + (zT - zB) * (i + 1) / n, y = gS + (yTop - gS) * (i + 1) / n; k.box('step', xa, xb - 0.25, y - 0.16, y, z0, z1); k.box('redWall', xa, xb - 0.25, y - 0.02, y + 0.01, z0, z0 + 0.06); }
          k.box('step', xa, xb - 0.25, yTop - 0.2, yTop, zT, zT + 1.2); // 頂端平台
          // 外側磚牆：底邊沿地面、頂邊沿踏階斜線＋扶牆
          k.quad('terraceBrick', [xb, gS - 0.2, zB], [xb, gS - 0.2, zT + 1.2], [xb, yTop + 0.9, zT + 1.2], [xb, gS + 0.9, zB], [[0, 0], [(zT + 1.2 - zB) / 1.6, 0], [(zT + 1.2 - zB) / 1.6, (yTop + 1.1 - gS) / 1.6], [0, 1.1 / 1.6]]);
          k.quad('terraceBrick', [xb - 0.25, gS - 0.2, zB], [xb - 0.25, gS - 0.2, zT + 1.2], [xb - 0.25, yTop + 0.9, zT + 1.2], [xb - 0.25, gS + 0.9, zB]);
          k.quad('rail', [xb - 0.3, gS + 0.9, zB - 0.05], [xb + 0.05, gS + 0.9, zB - 0.05], [xb + 0.05, yTop + 0.9, zT + 1.2], [xb - 0.3, yTop + 0.9, zT + 1.2]);
          k.quad('terraceBrick', [xb - 0.25, gS - 0.2, zB], [xb, gS - 0.2, zB], [xb, gS + 0.9, zB], [xb - 0.25, gS + 0.9, zB]);
          boxColl([[xa, zB], [xb, zB], [xb, zT + 1.2], [xa, zT + 1.2]], gS - 0.2, yTop + 0.9);
          shapes.push({ name: 'libEastStair', pts: [[xa, zB], [xb, zB], [xb, zT + 1.2], [xa, zT + 1.2]], y0: gS, y1: yTop + 0.9 });
        }
        shapes.push({ name: 'libCourt', pts: [[ax0, az0], [ax1, az0], [ax1, az1], [bx1, az1], [bx1, bz1], [bx0, bz1]], y0: yC, y1: yC });
      }
      // 大門：雙塔東側，黑框玻璃門與兩層高玻璃，前面斜面玻璃雨遮，兩根兩層高混凝土圓柱撐館名橫樑（2020-10 相片）
      const xa = -194.6, xb = -184.2;
      k.wall('glass1f', xa, zW, xb, zW, yP, yP + 3.4, 2.6, 3.4);
      for (let x = xa; x <= xb + 0.01; x += 2.6) k.box('slot', x - 0.06, x + 0.06, yP, yP + 3.4, zW, zW + 0.08);
      k.box('slot', xa, xb, yP + 2.3, yP + 2.42, zW, zW + 0.08);
      { const y1 = yP + 3.7, y2 = yP + 2.5, d = 3.6, xs = [-192.4, -186.4]; // 雨遮夾在兩根圓柱內側
        k.quad('skyGlass', [xs[0], y1, zW], [xs[1], y1, zW], [xs[1], y2, zW + d], [xs[0], y2, zW + d]);
        // 黑色細框：沿斜面從牆上（y1）到前緣（y2）的細桿，兩面都畫
        for (let x = xs[0]; x <= xs[1] + 0.01; x += (xs[1] - xs[0]) / 5) {
          const P0 = [x - 0.045, y1 + 0.03, zW], P1 = [x + 0.045, y1 + 0.03, zW], P2 = [x + 0.045, y2 + 0.03, zW + d], P3 = [x - 0.045, y2 + 0.03, zW + d];
          k.quad('slot', P0, P1, P2, P3); k.quad('slot', P1, P0, P3, P2);
        }
        for (const x of xs) { k.box('slot', x - 0.06, x + 0.06, yP, y2, zW + d - 0.06, zW + d + 0.06); wallC(x - 0.06, zW + d, x + 0.06, zW + d, yP, y2); }
        k.box('slot', xs[0], xs[1], y2 - 0.12, y2, zW + d - 0.06, zW + d + 0.06);
      }
      const yTl = B + (lib.floors - LIB.tfFloors) * ((lib.h - 0.6) / lib.floors);
      for (const x of [-192.9, -185.9]) {
        const z = -10.6;
        k.cyl('step', x, z, 0.42, yP, yTl, 16);
        boxColl([[x - 0.42, z - 0.42], [x + 0.42, z - 0.42], [x + 0.42, z + 0.42], [x - 0.42, z + 0.42]], yP, yTl);
      }
      k.box('step', -193.4, -185.4, yP + 4.0, yP + 4.75, -10.9, -10.3); // 館名橫樑
      sign(group, hText('aLibName', '館書圖念紀愚靜張', '#d9b86a', SERIF, 1024, 128), 5.2, 0.6, -189.4, yP + 4.38, -10.28, 0, 1, 0.1, 0.6); // 右至左
      // 「全人」牌（東塔南面）
      sign(group, hText('aQuanRen', '全人', '#e2c27a', SERIF, 256, 128, '#2a2522'), 1.7, 0.85, -197.55, yP + 2.6, -6.6 + 0.03, 0, 1, 0.08, 0.3);
      // 中央四片三角形玻璃天窗：旋轉的方形分成四塊，各自往中心斜升，白框
      { const { c, r, rot } = LIBP.sky, cs = Math.cos(rot), sn = Math.sin(rot), Q = (u, v) => [c[0] + u * cs - v * sn, c[1] + u * sn + v * cs];
        const cor = [Q(-r, -r), Q(r, -r), Q(r, r), Q(-r, r)], yk = yP + 0.35, ya = yP + 1.7;
        k.flat('step', cor, yk); // 底座頂
        for (let i = 0; i < 4; i++) {
          const a = cor[i], b = cor[(i + 1) % 4];
          k.quad('step', [b[0], yP - 0.05, b[1]], [a[0], yP - 0.05, a[1]], [a[0], yk, a[1]], [b[0], yk, b[1]]);
          const m = [(a[0] + b[0]) / 2 * 0.15 + c[0] * 0.85, (a[1] + b[1]) / 2 * 0.15 + c[1] * 0.85];
          k.tri('skyGlass', [a[0], yk, a[1]], [b[0], yk, b[1]], [m[0], ya, m[1]]);
          k.slab('rail', a[0], a[1], c[0], c[1], 0.15, yk, yk + 0.12);
          wallC(a[0], a[1], b[0], b[1], yP - 0.05, ya);
        }
        shapes.push({ name: 'libSkylight', pts: cor, y0: yP, y1: ya });
      }
    }
  }

  // ===== 科學館 =====
  const sci = find(A_IDS.sci);
  if (sci) {
    const P = sci.pts, B = baseOf(sci, -55, 30), fl = (sci.h - 0.6) / (sci.floors || 8), top = B + sci.h;
    // 西面（SW→NW）：西南角磚紅圓角樓梯塔、直排金字「中原大學」、塔頂白色格柵；北段每層懸挑白色陽台＋冷氣
    const SWc = P[10], NWc = P[11], eW = edge(SWc, NWc), s0 = 0.4, s1 = 5.2, yTw = top + 2.4;
    const g0 = groundY(...along(SWc, eW, (s0 + s1) / 2, 0.5)) - 0.2;
    strip('brick', SWc, eW, s0, s1, -1.5, 0.5, g0, yTw, 2);
    strip('brick', SWc, eW, s0 + 0.5, s1 - 0.5, 0.5, 1.0, g0, yTw, 2);
    for (const s of [s0 + 0.5, s1 - 0.5]) { const [x, z] = along(SWc, eW, s, 0.5); k.cyl('brick', x, z, 0.5, g0, yTw, 12); }
    boxColl(stripPts(SWc, eW, s0, s1, -0.2, 1.0), g0, yTw);
    { const c = along(SWc, eW, (s0 + s1) / 2, 1.03); sign(group, vText('aSciName', '中原大學', '#d2ad62', SERIF), 2.3, 11.5, c[0], B + 18.5, c[1], eW.nx, eW.nz, 0.12, 0.65); }
    for (let j = 0; j < 6; j++) { const s = s0 + 0.3 + j * (s1 - s0 - 0.6) / 5; const p = along(SWc, eW, s, -1.6), q = along(SWc, eW, s, 1.0); k.slab('sciWhite', p[0], p[1], q[0], q[1], 0.12, yTw + 0.6, yTw + 0.8); }
    for (const s of [s0 + 0.3, s1 - 0.3]) { const [x, z] = along(SWc, eW, s, 0.7); k.box('sciWhite', x - 0.08, x + 0.08, yTw, yTw + 0.8, z - 0.08, z + 0.08); }
    shapes.push({ name: 'sciTower', pts: stripPts(SWc, eW, s0, s1, -1.5, 1.0), y0: g0, y1: yTw + 0.8 });
    for (let f = 1; f <= 6; f++) {
      const y = B + f * fl, sa = s1 + 0.3, sb = s1 + 0.3 + eW.l / 3; // 緊貼西南角樓梯塔北側，約占白牆 1/3（pI_h090、2019-04 相片）
      strip('sciWhite', SWc, eW, sa, sb, 0, 1.2, y - 0.18, y);
      strip('sciWhite', SWc, eW, sa, sb, 1.08, 1.2, y, y + 0.95);
      for (const s of [sa + 1.5, sa + (sb - sa) / 2 + 1.0, sb - 1.4]) k.slab('ac', ...along(SWc, eW, s - 0.4, 0.55), ...along(SWc, eW, s + 0.4, 0.55), 0.3, y, y + 0.6);
    }
    shapes.push({ name: 'sciBalcony', pts: stripPts(SWc, eW, s1 + 0.3, s1 + 0.3 + eW.l / 3, 0, 1.2), y0: B + fl, y1: B + 6 * fl + 1 });
    // 南面（西段南牆 P[9]→P[10]）中段的垂直玻璃樓梯窗帶
    { const a = P[9], e = edge(a, P[10]), sc = e.l * 0.5, p = along(a, e, sc - 1.2, 0.06), q = along(a, e, sc + 1.2, 0.06); k.wall('stairGlass', p[0], p[1], q[0], q[1], B + 1.0, top - 0.6, 2.4, fl); }
    // 天文台：方形磚塔（約 6.5 m 見方、3.6 m）上的白色圓頂與旁邊的細天線（正射位置）
    const [ox, oz] = [-56.9, 41.3], cr = 3.25, yc = top + 3.6, r = 3.0;
    k.box('brick', ox - cr, ox + cr, top, yc, oz - cr, oz + cr);
    k.box('sciWhite', ox - cr - 0.1, ox + cr + 0.1, yc - 0.25, yc, oz - cr - 0.1, oz + cr + 0.1);
    for (const wx of [ox - cr - 0.01, ox + cr + 0.01]) k.box('slot', wx - 0.03, wx + 0.03, top + 1.4, top + 2.4, oz - 0.4, oz + 0.4); // 塔身小窗
    k.cyl('dome', ox, oz, r, yc, yc + 1.2, 28);
    { const g = new THREE.SphereGeometry(r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(ox, yc + 1.2, oz); k.add('dome', g); }
    k.box('slot', ox - 0.35, ox + 0.35, yc + 1.25, yc + 4.1, oz + r * 0.2, oz + r * 0.2 + 0.05); // 圓頂開縫（關著）
    k.cyl('frame', ox - cr - 0.8, oz - 1.5, 0.07, top, top + 9.5, 6);
    shapes.push({ name: 'sciObservatory', pts: [[ox - cr, oz - cr], [ox + cr, oz - cr], [ox + cr, oz + cr], [ox - cr, oz + cr]], y0: top, y1: yc + 4.2 });
  }

  // ===== 下沉廣場「泉源之谷」（2020 改建後） =====
  {
    const gy = (x, z) => groundY(x, z);
    // 米色透水鋪面：鋪滿整個廣場底（data/cycu.json floors 的範圍，四邊貼到西側步道、南側上層平台的紅磚擋土牆），
    // 只有西北角留一塊三角草坡（正射 2024 上那塊綠地），用矮鋼板圍邊
    const FL = [[-152.03, 2.3], [-110.33, 14.33], [-116.7, 36.43], [-158.4, 24.4]];
    const onEdge = (a, c, x) => [x, a[1] + (c[1] - a[1]) * (x - a[0]) / (c[0] - a[0])];
    const nw0 = onEdge(FL[0], FL[1], -144.0), nw1 = [-154.9, FL[0][1] + (FL[3][1] - FL[0][1]) * (-154.9 - FL[0][0]) / (FL[3][0] - FL[0][0])];
    const PL = [nw0, FL[1], FL[2], FL[3], nw1];
    // 四個角在擋土牆線上，groundY 會取到旁邊平台的高度，所以鋪面固定在廣場底的高度
    const yF = gy(-137.0, 20.0);
    k.flat('paving', PL, yF + 0.05);
    k.flat('grass', [FL[0], nw0, nw1], (x, z) => Math.min(gy(x, z), yF + 0.6) + 0.25);
    // 草坪圓島（直徑約 9 m）＋耐候鋼板矮圈
    const [ix, iz, ir] = [-140.5, 17.2, 4.4], N = 24, ring = [];
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; ring.push([ix + Math.cos(a) * ir, iz + Math.sin(a) * ir]); }
    k.flat('grass', ring, (x, z) => gy(x, z) + 0.32);
    for (let i = 0; i < N; i++) { const a = ring[i], c = ring[(i + 1) % N]; k.slab('corten', a[0], a[1], c[0], c[1], 0.12, gy(a[0], a[1]) - 0.1, gy(a[0], a[1]) + 0.35); }
    // 白色碎石庭園＋幾顆景石
    const gv = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; gv.push([-132.0 + Math.cos(a) * 4.2, 12.6 + Math.sin(a) * 2.2]); }
    k.flat('gravel', gv, (x, z) => gy(x, z) + 0.08);
    for (const [x, z, s] of [[-133.5, 12.0, 0.7], [-131.0, 13.4, 0.5], [-129.8, 11.6, 0.4], [-134.6, 13.6, 0.35]]) { const g = new THREE.DodecahedronGeometry(s, 0); g.scale(1.3, 0.7, 1); g.translate(x, gy(x, z) + s * 0.4, z); k.add('rock', g); }
    // 灰色石板「溪流」：繞過圓島，西北往東南
    const brook = [[-150.5, 10.8], [-147.0, 11.6], [-145.2, 13.8], [-145.0, 18.5], [-142.0, 22.6], [-136.5, 23.2], [-131.0, 25.4], [-127.0, 28.4]];
    for (let i = 0; i < brook.length - 1; i++) {
      const a = brook[i], c = brook[i + 1], e = edge(a, c), w = 0.65;
      k.flat('stone', [along(a, e, -0.3, -w), along(a, e, e.l + 0.3, -w), along(a, e, e.l + 0.3, w), along(a, e, -0.3, w)], (x, z) => gy(x, z) + 0.1, false, 2);
    }
    // 耐候鋼板斜切擋土牆：北緣（留出北邊步道下來的開口）；頂面斜切。東側大階梯、平台是 data/cycu.json 原有的 levels，不另外蓋
    const corten = (a, c, h0, h1, coll, text) => {
      const e = edge(a, c), g0 = Math.min(gy(...a), gy(...c)) - 0.15, ya = gy(...a) + h0, yc = gy(...c) + h1;
      const p0 = along(a, e, 0, -0.1), p1 = along(c, e, 0, -0.1), q0 = along(a, e, 0, 0.1), q1 = along(c, e, 0, 0.1);
      k.quad('corten', [q0[0], g0, q0[1]], [q1[0], g0, q1[1]], [q1[0], yc, q1[1]], [q0[0], ya, q0[1]], [[0, 0], [e.l / 3, 0], [e.l / 3, (yc - g0) / 3], [0, (ya - g0) / 3]]);
      k.quad('corten', [p1[0], g0, p1[1]], [p0[0], g0, p0[1]], [p0[0], ya, p0[1]], [p1[0], yc, p1[1]], [[0, 0], [e.l / 3, 0], [e.l / 3, (ya - g0) / 3], [0, (yc - g0) / 3]]);
      k.quad('corten', [q0[0], ya, q0[1]], [q1[0], yc, q1[1]], [p1[0], yc, p1[1]], [p0[0], ya, p0[1]]);
      k.quad('corten', [p0[0], g0, p0[1]], [q0[0], g0, q0[1]], [q0[0], ya, q0[1]], [p0[0], ya, p0[1]]);
      k.quad('corten', [q1[0], g0, q1[1]], [p1[0], g0, p1[1]], [p1[0], yc, p1[1]], [q1[0], yc, q1[1]]);
      if (coll) wallC(a[0], a[1], c[0], c[1], g0, Math.max(ya, yc));
      if (text) { const m = along(a, e, e.l * 0.3, 0.12); sign(group, valeTex(), 3.6, 0.68, m[0], ya + (yc - ya) * 0.3 - 0.75, m[1], e.nx, e.nz, 0, 0.1); } // 字在法線那面（朝廣場）
      shapes.push({ name: 'corten', pts: [p0, p1, q1, q0], y0: g0, y1: Math.max(ya, yc) });
    };
    // 斜切高牆緊貼廣場南緣的紅磚擋土牆（上層平台 upper_terrace 的北牆），立在牆前 0.2 m，刻「泉源之谷 Vale of Springs」
    // （2020-10 pH_h190～h270、2023-10 相片）；西端讓開西側 9 m 寬階梯的底，東端讓開東側 15 m 寬大階梯。
    // 紅磚牆本身已有碰撞，鋼板跟著加碰撞不會多擋路
    const sEdge = (x) => { const q = onEdge(FL[3], FL[2], x); return [q[0] + 0.055, q[1] - 0.19]; }; // 往廣場內 0.2 m
    corten(sEdge(-151.0), sEdge(-137.0), 2.4, 2.25, true, true);
    corten(sEdge(-137.0), sEdge(-123.0), 2.25, 2.05, true);
    // 西北角草坡邊（中間留一個缺口給步道下來）與北緣：矮鋼板邊、不加碰撞（任務四機車從校史館騎往圖書館會穿過廣場北半）
    const hyp = (t) => [nw1[0] + (nw0[0] - nw1[0]) * t, nw1[1] + (nw0[1] - nw1[1]) * t];
    corten(hyp(0), hyp(0.4), 0.4, 0.4, false);
    corten(hyp(0.62), hyp(1), 0.4, 0.4, false);
    { const nEdge = (x) => { const q = onEdge(FL[0], FL[1], x); return [q[0] - 0.055, q[1] + 0.19]; }; corten(nEdge(-143.6), nEdge(-123.0), 0.4, 0.3, false); }
    shapes.push({ name: 'plaza', pts: PL, y0: 0, y1: 0 });
  }

  k.finish(group);
  scene.add(group);
  I.updaters.push((dt, g) => { const n = g.night || 0; for (const m of glowMats) m.emissiveIntensity = n * 0.35 * m.userData.glow; });
  I.zoneA = { group, shapes };
  return group;
}
