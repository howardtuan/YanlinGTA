// 學生活動中心室內（OSM w392023427）：一樓到四樓走得進去，二樓從南面門廊進中庭、往北走上新中北路天橋，三樓走進往生科館的空橋。
// 外觀仍由 src/world/MapBuilder.js 照輪廓畫、src/world/zones/ZoneG.js 補構件；麥當勞（src/world/Interiors.js buildMcD）、古箏社教室（src/world/buildings/ClubRoom.js）、
// B1 用餐區與學餐（src/world/buildings/SacB1.js）在別的檔，這裡蓋其他部分（輪廓 = sacTrimmedPts：東南角麥當勞那塊、西北角古箏社那塊另外蓋，
// 但古箏社那角的一、二樓是培英廳北半和側走廊，麥當勞那塊的二樓以上是這裡的房間，輪廓牆在那幾層挖開，見 sacDoors）。
//
// 依據：一到四樓照使用者給的修改版平面圖（docs/references/floorplans/sac/sac-1f.svg～sac-4f.svg，照實際狀況修改，2026-11-26），座標直接量圖。
//  1F：培英廳在西半（北移，舞台在西、座位往東升高、正門在東牆北段，從服務台所在的前廳進去），北側側走廊通女廁男廁，南側原創咖啡（正門朝東），
//      中間大廳＋主走廊，101 邱林信貞全球交誼廳，東北郵局（請由戶外進出），東南麥當勞；直跑樓梯上二樓，旋轉梯上二樓、下 B1。
//  2F：前平台（中庭）南面開放、北邊往天橋，西邊布告欄牆後面是培英廳上空；中庭東邊走廊（旋轉梯頂、往三樓的樓梯）、雅文 A 廳（北）、B 廳（東）、
//      倉儲室；西南角樓梯間（透明玻璃自動門）和電梯；大廳東半到麥當勞上面是挑空（麥當勞上空）。
//  3F：招待所（門禁）、招待所前平台、北排廁所／302～310／學生會、中庭上方挑空（南北各一座往四樓的樓梯）、僑生聯誼會、三樓活動平台、
//      課外活動指導組、311／312、三面整片全身鏡；西南樓梯間接往生科館的空橋。
//  4F：北側走廊（攝影社、403～410）、南側走廊（422～433、古箏社、儲藏室）、三塊挑空和中間的四樓空橋、419 武術練習室、411 大音樂練習室、
//      琴房 412～417、樓梯間。
// 修改版各層之間有幾處對不上，這裡的取捨：
//  - 旋轉梯：B1 的位置是使用者給的 B1 平面圖、又被 B1 的坑框住，一、二樓修改版畫的位置各差約 5 m，照 B1 不動；
//    二樓出口改成和一樓一樣朝北，接到二樓走廊（SacB1.js）。
//  - 往三樓的樓梯：二樓圖畫在走廊東段、三樓圖畫在挑空東緣，兩張接不起來；用三樓圖的位置（從二樓走廊往東上到三樓挑空東側的迴廊），往北挪開旋轉梯頂。
//  - 一樓往二樓的直跑樓梯：圖上往東上，頂端會落在二樓的挑空裡；改成往西上，頂端接中庭東緣。
//  - 中庭的圓柱：一、二、四樓圖一致（x -163.5／-155.5），三樓圖往西偏約 7 m，照多數；三樓挑空西緣跟著放在中庭西牆（x -163.9）。
//  - 往天橋的 7 階：二樓圖往東挪了 3.6 m，但外牆上的天橋門（SAC_DOORS.nb）不動，照門的位置。
//  - 西南樓梯間：二到四樓；一樓圖沒有畫，電梯一樓放在南側走道同一位置。四樓圖只畫一跑，這裡做成和二、三樓一樣的折返梯。
//  - 古箏社：教室留在三樓西北角（黃蓋瑞、社員的劇情在這裡，使用者先前也指正在三樓），門改開在南牆東段、接招待所前平台；
//    三樓招待所放在教室南邊；四樓南排的「古箏社」當成社辦（關著的門）。
//  - 二樓培英廳上空：圖上是欄杆，這裡做成牆（布告欄牆、往樓梯間的走廊北牆），從中庭看不到觀眾席。
//  - 四樓空橋的圓弧、419 東牆的半圓形玻璃窗做成直的；4F 琴房 412～417 的小隔間簡化成一排門。
//  - 白色區塊（圖上「室內細部未繪製」）是關著的門；進得去的房間：培英廳、101、原創咖啡、雅文 A 廳、302 活動教室、312 韻律教室、古箏社教室、419 武術練習室。
//
// 高度（世界高度）：一樓 = 入口前庭、二樓 = 南面門廊（大階梯頂）、三樓 = 往生科館空橋的地板、四樓再上 3.4 m。
// 新中北路天橋的橋面比二樓高約 1.1 m：二樓北面進門後是橋面高度的平台，往下走 7 階到二樓（不改天橋）。
// 碰撞：src/world/zones/ZoneG.js 換過的實心輪廓在這裡拿掉，換成外牆線（門口留缺口）和室內牆，全部走 Interiors.addWall。
// 座標：這個檔直接用世界座標（Kit 原點 0,0、不旋轉），y 是世界高度。
import * as THREE from 'three';
import { H, Hgrid, surfaceAt } from '../Terrain.js';
import { CLUB_DOOR, buildClub3F } from './ClubRoom.js';
import { G_IDS, FORE, STAIR2F, PIT, BRIDGE, SAC_DOORS } from '../zones/ZoneG.js';
import {
  canvasTexture,
  scaledCanvas,
  blankTexture,
  uploadAndRelease,
} from '../../graphics/GpuMemLifecycle.js';

// ---------------- plan (world metres) ----------------
// 1F～4F 照修改版平面圖（docs/references/floorplans/sac/，量圖的座標直接寫在這裡）；各層之間對不上的地方怎麼取捨見檔頭
const XL = -194.85,
  XR = -112.15,
  ZS = -94.65,
  ZN = -128.2; // inner faces: west, east, south walls, north lining
const XC = -181,
  ZC = -118.2; // the 古箏社 corner (src/world/buildings/ClubRoom.js): x < XC, z < ZC (open on 1F / 2F, the classroom on 3F)
const XMC = -136.15; // 麥當勞's west wall (1F); north wall z = MZ
const MZ = -114.3;
// columns of the 中庭 / 挑空, 1F up to the skylight (1F / 2F / 4F plans)
const COLS = [
  [-163.49, -116.84],
  [-155.49, -116.84],
  [-163.49, -104.94],
  [-155.49, -104.94],
];
const EL = { x0: -189.49, x1: -184.82, z0: -97.84, z1: ZS }; // the lift (SW corner, every floor)
const SWS = { x0: XL, x1: -191.8, z0: -100.4, z1: ZS }; // SW stairs 2F -> 4F, in at the north end
const NES = { x0: -136.4, x1: -133.15, z0: -128.8, z1: -123.84 }; // NE stairs 3F -> 4F, in at the south end
const BH = { x0: -164.8, x1: -161.6 }; // 2F hall to the footbridge (where the outside door is)
const NH = { x0: -149.6, x1: -146.4 }; // 1F hall to the north door
// 1F
const C1 = { n: -117.4, w: -165.6 }; // main corridor's north wall; lobby / corridor west wall (前廳 east wall)
const FOY = { x0: -170, x1: -165.6, z0: -127.07, z1: -105.31 }; // 培英廳前廳 (服務台)
const CAFE = { x0: XL, x1: -165.6, z0: -105.31, z1: -99.97 }; // 原創咖啡
const F12 = { x0: -150.0, x1: -155.04, z0: -108.4, z1: -106.6 }; // 1F -> 2F flight, up westwards onto the 2F 中庭
// 2F
const ATR = { x0: -163.93, x1: -155.04 }; // 中庭 (2F 前平台)
const C2 = { n: -117.73, s: -109.62, e: -130.04 }; // 2F corridor east of the 中庭; south of it is the void over the lobby / 麥當勞
const PV = { s: -105.18 }; // 培英廳上空's south wall (2F); west of ATR.x0
const F23 = { x0: -150.1, x1: -141.03, z0: -116.4, z1: -113.8 }; // 2F -> 3F flight, up eastwards
// 3F
const VD = { x0: ATR.x0, x1: -141.03, z0: -118.62, z1: -104.07 }; // 3F 挑空 (over the 中庭)
const C3 = { n: -122.62 }; // north rooms' wall
const F34 = {
  x0: -146.25,
  x1: -152.6,
  n: [-118.62, -116.62],
  s: [-106.07, -104.07],
  l3: -144.4,
  l4: -154.6,
}; // 3F -> 4F flights (up westwards) and their landings
const S3 = { n: -104.07, r: -99.51 }; // 3F south corridor / the south rooms' wall
const GU = -184.81; // 招待所's east wall (3F / 4F)
// 4F
const C4 = { n: -123.84, s: -119.18 }; // north corridor
const S4 = { n: -104.29, r: -100.18 }; // south corridor
const BR = { x0: -172.27, x1: -167.82 }; // 四樓空橋 between the voids
const V4E = { x0: -140.49 }; // east edge of the 4F 挑空 (VD.x0 .. here)
const R419 = { x0: -135.6, x1: -129.04 };
const R411 = { x0: -122.6 };
const HALL = {
  x0: XL,
  x1: FOY.x0,
  z0: -124.96,
  z1: CAFE.z0,
  stage: -188.5,
  row0: -185,
  pitch: 0.95,
  rows: 15,
  step: 0.085,
  door: [-123.62, -119.29], // 正門 on the east wall (from the 前廳)
};
const WELL = [-147.9, -144.1, -110.9, -107.1]; // the B1 spiral stair's well (src/world/buildings/SacB1.js), x0 x1 z0 z1
// the outline's skewed walls
const zSouth = (x) => (x > -144.4 ? -94.4 : -94.4 - (0.1 * (-144.4 - x)) / 50.8);
const zNorth = (x) =>
  x < -163.2 ? -128.55 + (0.15 * (x + 181)) / 17.8 : -128.4 - (1.5 * (x + 163.2)) / 51.2;
const xWest = (z) => -195.2 + (0.15 * (-94.5 - z)) / 23.7;

// world heights that do not depend on anything built later
export function sacLevels() {
  const B = Hgrid(-170, -110),
    f1 = Hgrid(-153, -86) + FORE.rise,
    f2 = Hgrid(STAIR2F.x, STAIR2F.zTop - 1) + STAIR2F.rise,
    f3 = B + BRIDGE.y0 + 0.2;
  const s = surfaceAt(-163.0, -141.6, 60),
    deck = s > Hgrid(-163.0, -141.6) + 3 ? s : H(-163.0, -141.6) + 5.1;
  return {
    B,
    F: [f1, f2, f3, f3 + 3.4],
    deck,
    gN: Hgrid(-148, -131),
    pit: Hgrid(-125, -100) - PIT.depth,
  };
}
// door openings: [{ p, q, y0, y1 }] in world coordinates (src/world/MapBuilder.js b.wallDoors cuts them out of the walls)
function sacDoors() {
  const L = sacLevels(),
    D = SAC_DOORS,
    S = (a, b, y0, y1) => ({ p: [a, zSouth(a)], q: [b, zSouth(b)], y0, y1 }),
    N = (a, b, y0, y1) => ({ p: [a, zNorth(a)], q: [b, zNorth(b)], y0, y1 });
  return [
    S(...D.s1, L.F[0] - 0.05, L.F[0] + 2.7),
    S(...D.s2, L.F[1] - 0.02, L.F[1] + 2.5),
    N(...D.n1, L.gN - 0.2, L.gN + 2.6),
    N(...D.nb, L.deck - 0.05, L.deck + 2.05),
    { p: [CLUB_DOOR[0], ZC], q: [CLUB_DOOR[1], ZC], y0: L.F[2] - 0.02, y1: L.F[2] + 2.4 }, // 古箏社教室 (src/world/buildings/ClubRoom.js)
    {
      p: [xWest(D.wb[0]), D.wb[0]],
      q: [xWest(D.wb[1]), D.wb[1]],
      y0: L.F[2] - 0.02,
      y1: L.F[2] + 2.3,
    },
    // the outline's inner edges (inside the building, nothing of them shows outside):
    // the 古箏社 corner is open on 1F / 2F (培英廳 and its side corridor), the block over 麥當勞 from 2F up (rooms over the store)
    { p: [-195.05, ZC], q: [XC, ZC], y0: L.F[0] - 0.3, y1: L.F[2] - 0.3 },
    { p: [XC, ZC], q: [XC, -128.55], y0: L.F[0] - 0.3, y1: L.F[2] - 0.3 },
    { p: [-136, -114], q: [-112, -114], y0: L.F[1] - 0.35, y1: L.F[3] + 8 },
    { p: [-136, -94.4], q: [-136, -114], y0: L.F[1] - 0.35, y1: L.F[3] + 8 },
  ];
}
export function sacLook(b) {
  if (b.id === G_IDS.sac) b.wallDoors = sacDoors();
}

// canvas from src/graphics/GpuMemLifecycle.js (stored at the phone texture scale), not repeating
function canvasTex(w, h, draw) {
  return canvasTexture(w, h, draw, false);
}
const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';

export function buildSac(I, scene, data, collision, Kit, regMat) {
  const b = data?.buildings?.find((v) => v.id === G_IDS.sac);
  if (!b) return null;
  const k = new Kit(I, 0, 0, 0);
  k.base = 0;
  k.group.position.y = 0;
  const LV = sacLevels(),
    B = LV.B,
    FL = LV.F,
    DK = LV.deck,
    TOP = (Number.isFinite(b.base) ? b.base : B) + (b.h || 13.8);
  const [F1, F2, F3, F4] = FL,
    SL = 0.25,
    CT = Math.min(F4 + 3.0, TOP - 0.25);
  const CH = [F2 - F1 - 0.3, F3 - F2 - 0.3, F4 - F3 - 0.3, CT - F4];

  // ---------------- materials ----------------
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
    if (lift) {
      m.emissive.set(o.color || '#ffffff');
      if (o.map) m.emissiveMap = o.map;
      m.emissiveIntensity = lift;
    }
    return m;
  };
  const rep = (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  let seed = 23;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; // own generator: nothing shared is drawn here
  // 紅磚平台：紅褐色方磚、深灰色分隔帶（場地借用說明的照片）
  const redTile = rep(
    canvasTex(256, 256, (g) => {
      for (let x = 0; x < 8; x++)
        for (let y = 0; y < 8; y++) {
          g.fillStyle = `hsl(${12 + rnd() * 6},${52 + rnd() * 12}%,${40 + rnd() * 9}%)`;
          g.fillRect(x * 32, y * 32, 32, 32);
        }
      g.fillStyle = 'rgba(70,50,44,.55)';
      for (let i = 0; i < 8; i++) {
        g.fillRect(i * 32, 0, 1.5, 256);
        g.fillRect(0, i * 32, 256, 1.5);
      }
      g.fillStyle = '#5b5a5c';
      g.fillRect(0, 0, 256, 9);
      g.fillRect(0, 0, 9, 256);
    })
  );
  const terrazzo = rep(
    canvasTex(256, 256, (g) => {
      g.fillStyle = '#c4c1ba';
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1200; i++) {
        const v = (150 + rnd() * 75) | 0;
        g.fillStyle = `rgb(${v},${v - 3},${v - 9})`;
        g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 2, 2 + rnd() * 2);
      }
      g.fillStyle = 'rgba(80,78,74,.35)';
      g.fillRect(0, 0, 256, 2);
      g.fillRect(0, 0, 2, 256);
    })
  );
  const vinyl = rep(
    canvasTex(256, 256, (g) => {
      for (let y = 0; y < 256; y += 32) {
        const v = rnd() * 14;
        g.fillStyle = `rgb(${(150 + v) | 0},${(128 + v) | 0},${(104 + v) | 0})`;
        g.fillRect(0, y, 256, 32);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(70,52,36,${0.04 + rnd() * 0.08})`;
          g.fillRect(rnd() * 256, y + rnd() * 32, 30 + rnd() * 60, 1);
        }
        g.fillStyle = 'rgba(60,44,30,.3)';
        g.fillRect(0, y, 256, 1);
        g.fillRect((y * 5) % 256, y, 1, 32);
      }
    })
  );
  const tileW = rep(
    canvasTex(64, 64, (g) => {
      g.fillStyle = '#eeede8';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#c6c7c3';
      for (let i = 0; i < 64; i += 8) {
        g.fillRect(i, 0, 1, 64);
        g.fillRect(0, i, 64, 1);
      }
    })
  );
  const lattice = rep(
    canvasTex(128, 128, (g) => {
      g.fillStyle = '#3a1d14';
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#9c5a34';
      for (let i = 0; i < 4; i++) {
        g.fillRect(i * 32, 0, 5, 128);
        g.fillRect(0, i * 32, 128, 5);
      }
    })
  );
  const curtain = rep(
    canvasTex(128, 64, (g) => {
      for (let x = 0; x < 128; x++) {
        const v = 0.55 + 0.45 * Math.sin((x / 128) * Math.PI * 16);
        g.fillStyle = `rgb(${(110 + 60 * v) | 0},${(14 + 10 * v) | 0},${(20 + 12 * v) | 0})`;
        g.fillRect(x, 0, 1, 64);
      }
    })
  );
  const mat = (n, m) => regMat(`sac_${n}`, m);
  const winT = canvasTex(256, 192, (g) => {
    g.fillStyle = '#3d3029';
    g.fillRect(0, 0, 256, 192);
    const sky = g.createLinearGradient(0, 0, 0, 192);
    sky.addColorStop(0, '#bfe0f5');
    sky.addColorStop(1, '#e6f1ea');
    g.fillStyle = sky;
    g.fillRect(8, 8, 240, 176);
    g.fillStyle = '#3d3029';
    for (const x of [8, 128, 248]) g.fillRect(x - 4, 8, 8, 176);
    g.fillRect(8, 66, 240, 6);
  });
  const posters = canvasTex(1024, 256, (g) => {
    g.fillStyle = '#3f6470';
    g.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 26; i++) {
      const x = 20 + (i % 13) * 76 + rnd() * 8,
        y = 22 + Math.floor(i / 13) * 112 + rnd() * 10;
      g.fillStyle = `hsl(${(rnd() * 360) | 0},${(40 + rnd() * 45) | 0}%,${(45 + rnd() * 35) | 0}%)`;
      g.fillRect(x, y, 62, 88);
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.fillRect(x + 6, y + 8, 50, 9);
      g.fillRect(x + 6, y + 60, 36, 5);
      g.fillRect(x + 6, y + 70, 44, 5);
    }
  });
  const MT = {
    red: mat('red', std({ map: redTile, roughness: 0.7 }, 0.2)),
    floor: mat('floor', std({ map: terrazzo, roughness: 0.55 }, 0.2)),
    vinyl: mat('vinyl', std({ map: vinyl, roughness: 0.55 }, 0.2)),
    ceil: mat('ceil', std({ color: '#f1f0ea' }, 0.42)),
    white: mat('white', std({ color: '#efede6' }, 0.3)),
    tileW: mat('tileW', std({ map: tileW, roughness: 0.4 }, 0.3)),
    band: mat('band', std({ color: '#dcd9d0' }, 0.3)),
    brown: mat('brown', std({ color: '#3d3029', roughness: 0.6 }, 0.1)),
    column: mat('column', std({ color: '#e8dcc2', roughness: 0.8 }, 0.25)),
    stair: mat('stair', std({ color: '#a9a6a0', roughness: 0.7 }, 0.2)),
    rail: mat('rail', std({ color: '#b9bdc1', metalness: 0.7, roughness: 0.3 }, 0.05)),
    light: mat(
      'light',
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#fff6e2',
        emissiveIntensity: 1.1,
      })
    ),
    sky: mat(
      'sky',
      new THREE.MeshStandardMaterial({
        color: '#e8f3fa',
        emissive: '#dcecf7',
        emissiveIntensity: 0.95,
      })
    ),
    window: mat(
      'window',
      new THREE.MeshStandardMaterial({
        map: winT,
        emissive: '#ffffff',
        emissiveMap: winT,
        emissiveIntensity: 0.75,
        roughness: 0.3,
      })
    ),
    posters: mat('posters', std({ map: posters }, 0.4)),
    mirror: mat('mirror', std({ color: '#cfe0e6', metalness: 0.9, roughness: 0.08 })),
    wood: mat('wood', std({ color: '#b08d62', roughness: 0.6 }, 0.2)),
    darkwood: mat('darkwood', std({ color: '#5a3320', roughness: 0.6 }, 0.14)),
    lattice: mat('lattice', std({ map: lattice, roughness: 0.7 }, 0.2)),
    seat: mat('seat', std({ color: '#c8281e', roughness: 0.7 }, 0.2)),
    carpet: mat('carpet', std({ color: '#8f2a25', roughness: 0.95 }, 0.14)),
    curtain: mat('curtain', std({ map: curtain, roughness: 0.9 }, 0.25)),
    stage: mat('stage', std({ color: '#c59a62', roughness: 0.45 }, 0.22)),
    screen: mat(
      'screen',
      new THREE.MeshStandardMaterial({
        color: '#f4f6f8',
        emissive: '#e9eef4',
        emissiveIntensity: 0.7,
      })
    ),
    steel: mat('steel', std({ color: '#b4b8bc', metalness: 0.7, roughness: 0.3 }, 0.08)),
    black: mat('black', std({ color: '#1d1d1f', roughness: 0.6 })),
    dark: mat('dark', std({ color: '#2f3033', roughness: 0.6 }, 0.05)),
    tableW: mat('tableW', std({ color: '#f1efe9', roughness: 0.4 }, 0.25)),
    tableWood: mat('tableWood', std({ color: '#a98a68', roughness: 0.5 }, 0.2)),
    cY: mat('cY', std({ color: '#f0c419', roughness: 0.6 }, 0.2)),
    cO: mat('cO', std({ color: '#f07a1c', roughness: 0.6 }, 0.2)),
    cR: mat('cR', std({ color: '#e0393a', roughness: 0.6 }, 0.2)),
    cW: mat('cW', std({ color: '#f2f2ee', roughness: 0.6 }, 0.25)),
    sofa: mat('sofa', std({ color: '#3f6f8f', roughness: 0.9 }, 0.15)),
    piano: mat('piano', std({ color: '#141416', roughness: 0.25, metalness: 0.2 }, 0.03)),
    ivory: mat('ivory', std({ color: '#f6f3ea', roughness: 0.4 }, 0.3)),
    matG: mat('matG', std({ color: '#8f9a78', roughness: 0.9 }, 0.15)),
    matR: mat('matR', std({ color: '#c92f2b', roughness: 0.9 }, 0.15)),
    padY: mat('padY', std({ color: '#e2c21f', roughness: 0.9 }, 0.2)),
    slat: mat('slat', std({ color: '#8a6238', roughness: 0.7 }, 0.2)),
    plant: mat('plant', std({ color: '#3f8a3c', roughness: 0.9 })),
    glass: mat(
      'glassd',
      std({ color: '#7fa3b4', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.45 })
    ),
  };

  // ---------------- helpers ----------------
  const nc = { col: false },
    T = 0.12;
  const bx = (x0, x1, y0, y1, z0, z1, m, o) =>
    k.box(Math.min(x0, x1), Math.max(x0, x1), y0, y1, Math.min(z0, z1), Math.max(z0, z1), m, {
      ...nc,
      ...o,
    });
  // collision wall line with world heights; split where it crosses the edge of the B1 pits so that each piece counts from its own ground
  const SPX = [PIT.west[0], PIT.west[2]],
    SPZ = [PIT.west[1], PIT.west[3]];
  const wl = (ax, az, cx, cz, y0, y1) => {
    const ts = [0, 1];
    for (const X of SPX) if ((ax - X) * (cx - X) < 0) ts.push((X - ax) / (cx - ax));
    for (const Z of SPZ) if ((az - Z) * (cz - Z) < 0) ts.push((Z - az) / (cz - az));
    ts.sort((p, q) => p - q);
    for (let i = 0; i < ts.length - 1; i++) {
      if (ts[i + 1] - ts[i] < 1e-4) continue;
      const px = ax + (cx - ax) * ts[i],
        pz = az + (cz - az) * ts[i],
        qx = ax + (cx - ax) * ts[i + 1],
        qz = az + (cz - az) * ts[i + 1],
        g = H((px + qx) / 2, (pz + qz) / 2);
      I.addWall(px, pz, qx, qz, y0 - g, y1 - g);
    }
  };
  const wlRect = (x0, x1, z0, z1, y0, y1) => {
    wl(x0, z0, x1, z0, y0, y1);
    wl(x1, z0, x1, z1, y0, y1);
    wl(x1, z1, x0, z1, y0, y1);
    wl(x0, z1, x0, z0, y0, y1);
  };
  const cbx = (x0, x1, y0, y1, z0, z1, m, o) => {
    bx(x0, x1, y0, y1, z0, z1, m, o);
    wlRect(x0, x1, z0, z1, y0, y1);
  };
  // walkable surface: y is a world height or (x, z) => world height. Interiors wants heights above what the player's height
  // counts from, and that is not always the terrain here: the forecourt deck over the B1 stalls reaches about a metre in
  // under the south wall, the 2F porch deck lies over the 1F door. So the base is surfaceAt() at the player's feet, exactly
  // what src/entities/Player.js uses (only the player asks Interiors.groundAt).
  let feet = -1e9;
  I.updaters.push((dt, g) => {
    feet = g.player?.pos?.y ?? -1e9;
  });
  const sf = (x0, x1, z0, z1, y) =>
    I.addSurface(
      k.rect(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)),
      typeof y === 'function'
        ? (x, z) => y(x, z) - surfaceAt(x, z, feet)
        : (x, z) => y - surfaceAt(x, z, feet)
    );
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 },
    NRM = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
  // wall on an axis-aligned line, body on side s (-1 / +1 along the normal axis, 0 centred), with collision
  const wall = (x0, z0, x1, z1, y0, y1, m, s = 0, o) => {
    if (Math.abs(x1 - x0) < 1e-6) {
      const a = x0 + (s < 0 ? -T : s > 0 ? 0 : -T / 2);
      bx(a, a + T, y0, y1, z0, z1, m, o);
    } else {
      const a = z0 + (s < 0 ? -T : s > 0 ? 0 : -T / 2);
      bx(x0, x1, y0, y1, a, a + T, m, o);
    }
    wl(x0, z0, x1, z1, y0, y1);
  };
  const win = (w, h, x, y, z, face) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(ROT[face]);
    g.translate(x, y, z);
    k._part(MT.window, g);
  };
  const quad = (m, w, h, x, y, z, face) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(ROT[face]);
    g.translate(x, y, z);
    k._part(m, g);
  };

  // ---------------- doors and signs: two texture atlases, one mesh each ----------------
  const atlas = (cw, chh, cols, rows, name) => {
    // stored at the phone texture scale (cells are drawn in full-size pixels); on the GPU once built, see below
    const { cv, g } = scaledCanvas(cw * cols, chh * rows);
    const tex = g ? new THREE.CanvasTexture(cv) : blankTexture();
    if (g) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
    }
    const m = mat(name, std({ map: tex, roughness: 0.6, side: THREE.DoubleSide }, 0.35)),
      cells = new Map();
    let n = 0;
    return {
      g,
      tex,
      add(key, draw, w, h, x, y, z, face) {
        if (!cells.has(key)) {
          const i = n++;
          if (i >= cols * rows) console.warn('[sac] 圖集放不下', name);
          if (this.g) {
            this.g.save();
            this.g.translate((i % cols) * cw, Math.floor(i / cols) * chh);
            draw(this.g, cw, chh);
            this.g.restore();
          }
          cells.set(key, i);
        }
        const i = cells.get(key),
          geo = new THREE.PlaneGeometry(w, h),
          uv = geo.attributes.uv,
          u0 = (i % cols) / cols,
          v1 = 1 - Math.floor(i / cols) / rows;
        for (let j = 0; j < 4; j++)
          uv.setXY(j, u0 + uv.getX(j) / cols, v1 - 1 / rows + uv.getY(j) / rows);
        geo.rotateY(ROT[face]);
        geo.translate(x, y, z);
        k._part(m, geo);
      },
    };
  };
  const doorA = atlas(128, 256, 16, 8, 'doors'),
    signA = atlas(512, 128, 4, 16, 'signs');
  const LEAF = { room: '#8d6f52', svc: '#d6d3cb', office: '#6d8894', steel: '#a9adb1' };
  // a closed door 1.0 x 2.3 on a wall face: dark frame, leaf, a plate with the room's name over it
  const door = (x, y, z, face, label, kind = 'room') =>
    doorA.add(
      label + kind,
      (g, w, h) => {
        g.fillStyle = '#3d3029';
        g.fillRect(0, 0, w, h);
        g.fillStyle = LEAF[kind];
        g.fillRect(7, 40, w - 14, h - 40);
        if (kind === 'office') {
          g.fillStyle = '#b9d3dc';
          g.fillRect(16, 52, w - 32, 96);
        }
        if (kind === 'steel') {
          g.fillStyle = '#6f7478';
          g.fillRect(w / 2 - 1, 40, 2, h - 40);
        } else {
          g.fillStyle = '#d7d9d6';
          g.fillRect(w - 26, 150, 12, 5);
        }
        g.fillStyle = '#f4f2ec';
        g.fillRect(5, 4, w - 10, 32);
        const parts = label.split(' '),
          lines = parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [label];
        g.fillStyle = '#2c2f33';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        lines.forEach((t, i) => {
          const px = Math.min(lines.length > 1 ? 15 : 22, (w - 14) / Math.max(1, [...t].length));
          g.font = `900 ${px}px ${FONT}`;
          g.fillText(t, w / 2, lines.length > 1 ? 12 + i * 16 : 21);
        });
      },
      1.0,
      2.3,
      x,
      y + 1.15,
      z,
      face
    );
  const sign = (text, x, y, z, face, bg = '#2d3b4a', w = 1.6) =>
    signA.add(
      text + bg,
      (g, cw, chh) => {
        g.fillStyle = bg;
        g.fillRect(0, 0, cw, chh);
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `900 ${Math.min(76, (cw - 36) / [...text].length)}px ${FONT}`;
        g.fillText(text, cw / 2, chh / 2 + 3);
      },
      w,
      w / 4,
      x,
      y,
      z,
      face
    );

  // a wall with doors along a line: axis 'x' (the line z = w) or 'z' (the line x = w); `face` = the way it looks.
  // cells: [u0, u1, label, kind]; kind: room / svc / office / steel (a closed door in the middle), solid, open (a gap with a header),
  // gap (a 1.1 m doorway in the middle with the name over it: the room behind is built)
  const front = (f, axis, w, face, cells, o = {}) => {
    const y = FL[f],
      c = y + CH[f],
      n = NRM[face][axis === 'x' ? 1 : 0],
      m = o.mat || MT.tileW,
      head = o.head ?? 2.3;
    const B2 = (u0, u1, ya, yb, mm) => {
      const d0 = n > 0 ? -T : 0;
      return axis === 'x'
        ? bx(u0, u1, ya, yb, w + d0, w + d0 + T, mm, { tile: [0.6, 0.6] })
        : bx(w + d0, w + d0 + T, ya, yb, u0, u1, mm, { tile: [0.6, 0.6] });
    };
    const WL = (u0, u1, ya, yb) =>
      axis === 'x' ? wl(u0, w, u1, w, ya, yb) : wl(w, u0, w, u1, ya, yb);
    const at = (u, d) => (axis === 'x' ? [u, w + n * d] : [w + n * d, u]);
    const list = [];
    for (const cl of cells) {
      if (cl[3] !== 'gap') {
        list.push(cl);
        continue;
      }
      const cu = (cl[0] + cl[1]) / 2;
      list.push(
        [cl[0], cu - 0.55, '', 'solid'],
        [cu - 0.55, cu + 0.55, '', 'open'],
        [cu + 0.55, cl[1], '', 'solid']
      );
      const p = at(cu, 0.014);
      sign(
        cl[2],
        p[0],
        y + 2.55,
        p[1],
        face,
        '#1f5f8b',
        Math.min(2.4, 0.3 + 0.2 * [...cl[2]].length)
      );
    }
    let run = null;
    const flush = () => {
      if (!run) return;
      B2(run[0], run[1], y, c, m);
      WL(run[0], run[1], y, c);
      run = null;
    };
    for (const [u0, u1, label, kind] of list) {
      if (kind === 'open') {
        flush();
        if (o.header !== false) {
          B2(u0, u1, y + head, c, MT.band);
          WL(u0, u1, y + head, c);
        }
        continue;
      }
      if (!run) run = [u0, u1];
      else run[1] = u1;
      if (kind === 'solid') continue;
      const p = at((u0 + u1) / 2, 0.012);
      door(p[0], y, p[1], face, label, kind);
    }
    flush();
  };

  // ---------------- floors ----------------
  const lights = (x0, x1, z0, z1, c, step = 4.2) => {
    const alongX = x1 - x0 > z1 - z0;
    if (alongX)
      for (let x = x0 + step / 2; x < x1; x += step)
        bx(
          x - 0.6,
          x + 0.6,
          c - 0.05,
          c - 0.02,
          (z0 + z1) / 2 - 0.09,
          (z0 + z1) / 2 + 0.09,
          MT.light
        );
    else
      for (let z = z0 + step / 2; z < z1; z += step)
        bx(
          (x0 + x1) / 2 - 0.09,
          (x0 + x1) / 2 + 0.09,
          c - 0.05,
          c - 0.02,
          z - 0.6,
          z + 0.6,
          MT.light
        );
  };
  // floor slab + walkable surface + ceiling over a rectangle
  const room = (f, x0, x1, z0, z1, o = {}) => {
    const y = FL[f],
      c = o.c ?? y + CH[f];
    bx(x0, x1, y - SL, y, z0, z1, o.floor || MT.floor, { tile: [2.4, 2.4] });
    if (o.surf !== false) sf(x0, x1, z0, z1, y);
    if (o.ceil !== false) bx(x0, x1, c - 0.03, c + 0.05, z0, z1, o.ceilM || MT.ceil);
    if (o.lights !== false && o.ceil !== false) lights(x0, x1, z0, z1, c, o.step);
  };

  // ---------------- switchback stairs (as src/world/buildings/Lixing.js) ----------------
  const stairs = ({ x0, x1, z0, z1, ax, dir, ld = 1.5, wallM = MT.white, fa = 0, fb = 3 }) => {
    const a0 = ax === 'x' ? x0 : z0,
      a1 = ax === 'x' ? x1 : z1,
      c0 = ax === 'x' ? z0 : x0,
      c1 = ax === 'x' ? z1 : x1;
    const L = a1 - a0,
      cm = (c0 + c1) / 2;
    const A = (u) => (dir > 0 ? a0 + u : a1 - u);
    const R = (u0, u1, v0, v1) => {
      const p = A(u0),
        q = A(u1),
        lo = Math.min(p, q),
        hi = Math.max(p, q);
      return ax === 'x' ? [lo, hi, v0, v1] : [v0, v1, lo, hi];
    };
    const uOf = (lx, lz) => {
      const a = ax === 'x' ? lx : lz;
      return dir > 0 ? a - a0 : a1 - a;
    };
    const lanes = [
      [c0 + 0.1, cm - 0.07],
      [cm + 0.07, c1 - 0.1],
    ];
    // floors fa..fb; you go in and out at the u = 0 end on every floor
    const ys = [FL[fa]];
    for (let f = fa; f < fb; f++)
      for (let i = 1; i <= 2; i++) ys.push(FL[f] + ((FL[f + 1] - FL[f]) * i) / 2);
    const slab = (r, y, m = MT.stair) => {
      bx(r[0], r[1], y - 0.18, y, r[2], r[3], m);
      sf(r[0], r[1], r[2], r[3], y);
    };
    slab(R(0, ld, c0 + 0.1, c1 - 0.1), ys[0], MT.floor);
    for (let i = 0; i < ys.length - 1; i++) {
      const up = i % 2 === 0,
        [v0, v1] = lanes[i % 2],
        ya = ys[i],
        yb = ys[i + 1],
        run = L - 2 * ld,
        n = Math.max(8, Math.round((yb - ya) / 0.16));
      const r = R(ld, L - ld, v0, v1);
      sf(r[0], r[1], r[2], r[3], (lx, lz) => {
        const t = clamp01((uOf(lx, lz) - ld) / run);
        return ya + (yb - ya) * (up ? t : 1 - t);
      });
      for (let j = 0; j < n; j++) {
        const t0 = j / n,
          t1 = (j + 1) / n,
          h = ya + ((yb - ya) * (j + 1)) / n;
        const s = up
          ? R(ld + run * t0, ld + run * t1, v0, v1)
          : R(L - ld - run * t1, L - ld - run * t0, v0, v1);
        bx(s[0], s[1], h - 0.3, h, s[2], s[3], MT.stair);
      }
      slab(
        up ? R(L - ld, L, c0 + 0.1, c1 - 0.1) : R(0, ld, c0 + 0.1, c1 - 0.1),
        yb,
        FL.includes(yb) ? MT.floor : MT.stair
      );
    }
    {
      const r = R(ld, L - ld, cm - 0.07, cm + 0.07);
      bx(r[0], r[1], FL[fa], FL[fb] + 1.1, r[2], r[3], wallM);
      if (ax === 'x') wl(r[0], cm, r[1], cm, FL[fa], CT);
      else wl(cm, r[2], cm, r[3], FL[fa], CT);
    }
    const bar = (u, [v0, v1], y0, y1, m) => {
      const r = R(u - 0.05, u + 0.05, v0, v1);
      bx(r[0], r[1], y0, y1, r[2], r[3], m);
      if (ax === 'x') wl(A(u), v0, A(u), v1, y0, y1);
      else wl(v0, A(u), v1, A(u), y0, y1);
    };
    bar(ld, lanes[1], FL[fa], FL[fa] + 2.4, wallM);
    bar(ld, lanes[0], FL[fb], FL[fb] + 1.1, MT.rail);
    {
      const r = R(L - 0.1, L, c0, c1);
      bx(r[0], r[1], FL[fa], CT, r[2], r[3], wallM);
      if (ax === 'x') wl(A(L), c0, A(L), c1, FL[fa], CT);
      else wl(c0, A(L), c1, A(L), FL[fa], CT);
    }
    for (const [v, s] of [
      [c0, 1],
      [c1, -1],
    ]) {
      const r = R(0.14, L, s > 0 ? v : v - 0.1, s > 0 ? v + 0.1 : v);
      bx(r[0], r[1], FL[fa] - SL, CT, r[2], r[3], wallM);
      if (ax === 'x') wl(a0, v, a1, v, FL[fa], CT);
      else wl(v, a0, v, a1, FL[fa], CT);
    }
    for (let f = fa; f <= fb; f++) {
      const y0 = FL[f] + 2.3,
        y1 = f < fb ? FL[f + 1] : CT,
        r = R(-0.06, 0.06, c0, c1);
      bx(r[0], r[1], y0, y1, r[2], r[3], MT.band);
      if (ax === 'x') wl(A(0), c0, A(0), c1, y0, y1);
      else wl(c0, A(0), c1, A(0), y0, y1);
    }
    bx(...R(0, L, c0, c1).slice(0, 2), CT - 0.03, CT + 0.05, ...R(0, L, c0, c1).slice(2), MT.ceil);
    for (let f = fa; f <= fb; f++) {
      const p = ax === 'x' ? [A(0.02), cm] : [cm, A(0.02)];
      sign(
        '樓梯 ↑↓',
        p[0] + (ax === 'x' ? -dir * 0.1 : 0),
        FL[f] + 2.55,
        p[1] + (ax === 'z' ? -dir * 0.1 : 0),
        ax === 'x' ? (dir > 0 ? 'w' : 'e') : dir > 0 ? 'n' : 's',
        '#2d3b4a',
        1.2
      );
    }
  };

  // ---------------- furniture ----------------
  const chair = (x, z, m, face = 's') => {
    // `face`: the way the sitter looks
    const [nx, nz] = NRM[face];
    return (y) =>
      k.furniture(() => {
        bx(x - 0.21, x + 0.21, y + 0.42, y + 0.46, z - 0.21, z + 0.21, m);
        bx(
          x - nx * 0.2 - (nx ? 0.02 : 0.21),
          x - nx * 0.2 + (nx ? 0.02 : 0.21),
          y + 0.46,
          y + 0.86,
          z - nz * 0.2 - (nz ? 0.02 : 0.21),
          z - nz * 0.2 + (nz ? 0.02 : 0.21),
          m
        );
        for (const [dx, dz] of [
          [-0.17, -0.17],
          [0.17, -0.17],
          [-0.17, 0.17],
          [0.17, 0.17],
        ])
          bx(x + dx - 0.015, x + dx + 0.015, y, y + 0.42, z + dz - 0.015, z + dz + 0.015, MT.dark);
      });
  };
  const table = (y, x0, x1, z0, z1, m = MT.tableWood, h = 0.74) => {
    k.furniture(() => {
      bx(x0, x1, y + h - 0.04, y + h, z0, z1, m);
      for (const x of [x0 + 0.06, x1 - 0.06])
        for (const z of [z0 + 0.06, z1 - 0.06])
          bx(x - 0.03, x + 0.03, y, y + h - 0.04, z - 0.03, z + 0.03, MT.black);
    });
    wlRect(x0, x1, z0, z1, y, y + h);
  };
  const column = (x, z, y0, y1, r = 0.42) => {
    k.cyl(x, z, r, y0, y1, MT.column, { seg: 16 });
    wlRect(x - r * 0.8, x + r * 0.8, z - r * 0.8, z + r * 0.8, y0, y1);
  };

  // =====================================================================
  // shared pieces: floors with holes and open ceilings, parapets, door rows, flights
  // =====================================================================
  // the rectangles of r ([x0, x1, z0, z1]) outside the holes, merged along x
  const minus = (r, holes) => {
    const xs = new Set([r[0], r[1]]),
      zs = new Set([r[2], r[3]]);
    for (const h of holes) {
      for (const x of [h[0], h[1]]) if (x > r[0] && x < r[1]) xs.add(x);
      for (const z of [h[2], h[3]]) if (z > r[2] && z < r[3]) zs.add(z);
    }
    const X = [...xs].sort((p, q) => p - q),
      Z = [...zs].sort((p, q) => p - q),
      out = [];
    for (let j = 0; j < Z.length - 1; j++) {
      let run = null;
      for (let i = 0; i < X.length - 1; i++) {
        const cx = (X[i] + X[i + 1]) / 2,
          cz = (Z[j] + Z[j + 1]) / 2,
          hole = holes.some((h) => cx > h[0] && cx < h[1] && cz > h[2] && cz < h[3]);
        if (hole) {
          if (run) out.push(run);
          run = null;
        } else if (run) run[1] = X[i + 1];
        else run = [X[i], X[i + 1], Z[j], Z[j + 1]];
      }
      if (run) out.push(run);
    }
    return out.filter((q) => q[1] - q[0] > 0.02 && q[3] - q[2] > 0.02);
  };
  // floor slab + walkable surface over r minus `holes`; ceiling (with lights) except over `open` (the 挑空 above)
  const area = (f, r, o = {}) => {
    const holes = o.holes || [];
    for (const q of minus(r, holes)) room(f, ...q, { ...o, ceil: false });
    if (o.ceil === false) return;
    const c = FL[f] + CH[f];
    for (const q of minus(r, [...holes, ...(o.open || [])])) {
      bx(q[0], q[1], c - 0.03, c + 0.05, q[2], q[3], o.ceilM || MT.ceil);
      if (o.lights !== false) lights(q[0], q[1], q[2], q[3], c, o.step);
    }
  };
  // white-tile parapet with a steel rail along a 挑空 edge (axis-aligned)
  const parapet = (f, x0, z0, x1, z1) => {
    const y = FL[f];
    if (Math.abs(x1 - x0) < 0.01 && Math.abs(z1 - z0) < 0.01) return;
    if (z0 === z1) {
      bx(x0, x1, y - SL, y + 0.95, z0 - 0.09, z0 + 0.09, MT.tileW, { tile: [0.6, 0.6] });
      bx(x0, x1, y + 1.12, y + 1.17, z0 - 0.03, z0 + 0.03, MT.rail);
    } else {
      bx(x0 - 0.09, x0 + 0.09, y - SL, y + 0.95, z0, z1, MT.tileW, { tile: [0.6, 0.6] });
      bx(x0 - 0.03, x0 + 0.03, y + 1.12, y + 1.17, z0, z1, MT.rail);
    }
    wl(x0, z0, x1, z1, y - 0.3, y + 1.3);
  };
  // thin steel rail (round the spiral stair's well)
  const steelRail = (y, x0, z0, x1, z1) => {
    const ax = Math.abs(x1 - x0) > 0.01;
    for (const [h, t] of [
      [0.5, 0.02],
      [1.0, 0.03],
    ])
      bx(
        ax ? x0 : x0 - t,
        ax ? x1 : x0 + t,
        y + h,
        y + h + 0.05,
        ax ? z0 - t : z0,
        ax ? z0 + t : z1,
        MT.rail
      );
    for (const [x, z] of [
      [x0, z0],
      [x1, z1],
    ])
      bx(x - 0.03, x + 0.03, y, y + 1.06, z - 0.03, z + 0.03, MT.rail);
    wl(x0, z0, x1, z1, y - 0.2, y + 1.1);
  };
  // a wall along a line from u0 to u1 with doors [a, b, label, kind] (kind as `front`; 'open' with a label gets a sign over it)
  const doorRow = (f, axis, w, face, u0, u1, doors, o = {}) => {
    const cells = [],
      n = NRM[face][axis === 'x' ? 1 : 0];
    let u = u0;
    for (const [a, b, label, kind] of [...doors].sort((p, q) => p[0] - q[0])) {
      if (a > u + 0.01) cells.push([u, a, '', 'solid']);
      cells.push([a, b, kind === 'open' ? '' : label, kind]);
      if (kind === 'open' && label) {
        const cu = (a + b) / 2,
          p = axis === 'x' ? [cu, w + n * 0.014] : [w + n * 0.014, cu];
        sign(
          label,
          p[0],
          FL[f] + 2.55,
          p[1],
          face,
          '#1f5f8b',
          Math.min(2.4, 0.3 + 0.2 * [...label].length)
        );
      }
      u = b;
    }
    if (u1 > u + 0.01) cells.push([u, u1, '', 'solid']);
    front(f, axis, w, face, cells, o);
  };
  // straight flight from (x0, ya) to (x1, yb) (either way along x), parapets with a rail on both sides
  const flight = (x0, x1, z0, z1, ya, yb, lo) => {
    const n = Math.round((yb - ya) / 0.17),
      sl = Math.atan2(yb - ya, x1 - x0),
      len = Math.hypot(x1 - x0, yb - ya);
    sf(x0, x1, z0, z1, (x) => ya + (yb - ya) * clamp01((x - x0) / (x1 - x0)));
    for (let i = 0; i < n; i++) {
      const h = ya + ((yb - ya) * (i + 1)) / n;
      bx(x0 + ((x1 - x0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n, h - 0.36, h, z0, z1, MT.stair);
    }
    for (const z of [z0, z1]) {
      wl(x0, z, x1, z, lo, yb + 1.1);
      for (const [dy, th, m] of [
        [0.95, 0.05, MT.rail],
        [0.5, 0.04, MT.rail],
        [-0.12, 0.3, MT.white],
      ]) {
        const g = new THREE.BoxGeometry(len, th, 0.06);
        g.rotateZ(sl);
        g.translate((x0 + x1) / 2, (ya + yb) / 2 + dy, z);
        k._part(m, g);
      }
    }
  };
  // open glass sliding doors (樓梯間的透明玻璃自動門) in a doorway along x = w, z0..z1
  const glassDoors = (f, w, z0, z1) => {
    const y = FL[f];
    for (const [a, b] of [
      [z0 + 0.05, z0 + 0.45],
      [z1 - 0.45, z1 - 0.05],
    ]) {
      bx(w - 0.03, w + 0.03, y, y + 2.25, a, b, MT.glass);
      bx(w - 0.04, w + 0.04, y + 2.25, y + 2.3, a, b, MT.steel);
    }
    bx(w - 0.08, w + 0.08, y + 2.3, y + 2.42, z0, z1, MT.steel);
  };
  // 廁所：走廊牆上一個開口、兩階上去的前室，前室後牆上女廁、男廁兩扇門
  const wcVest = (f, x0, x1, zb, zf, s0, s1) => {
    const y = FL[f],
      c = y + CH[f],
      up = 0.3,
      zs = zf - 0.6,
      xm = (x0 + x1) / 2;
    bx(x0, x1, y, y + up, zb, zs, MT.floor, { tile: [2.4, 2.4] });
    sf(x0, x1, zb, zs, y + up);
    sf(s0, s1, zs, zf, (x, z) => y + up * clamp01((zf - z) / (zf - zs)));
    bx(s0, s1, y, y + up / 2, zf - 0.3, zf, MT.stair);
    bx(s0, s1, y, y + up, zs, zf - 0.3, MT.stair);
    bx(x0, x1, c - 0.03, c + 0.05, zb, zf, MT.ceil);
    wall(x0, zb, x0, zf, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(x1, zb, x1, zf, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(x0, zb, x1, zb, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    door(xm - 1.0, y + up, zb + 0.012, 's', '女廁', 'svc');
    door(xm + 1.0, y + up, zb + 0.012, 's', '男廁', 'svc');
    bx(xm - 0.06, xm + 0.06, y + up, c, zb, zb + 1.2, MT.tileW, { tile: [0.6, 0.6] });
    sign('女廁 · 男廁', xm, y + 2.55, zf + 0.014, 'n', '#3b6b4a', 1.4);
  };

  // a room off a corridor: floor, ceiling, side walls and the north wall with windows (the corridor wall is a doorRow)
  const shell = (f, x0, x1, z1, o = {}) => {
    const y = FL[f],
      c = y + CH[f],
      zb = o.back ?? ZN;
    room(f, x0, x1, zb, z1, { floor: o.floor || MT.vinyl, ceilM: o.ceilM });
    wall(x0, zb, x0, z1, y, c, MT.white, 1);
    wall(x1, zb, x1, z1, y, c, MT.white, -1);
    wall(x0, zb, x1, zb, y, c, MT.white, 1);
    if (o.win !== false)
      for (let x = x0 + 1.6; x < x1 - 1.0; x += 2.8) win(2.0, 1.4, x, y + 1.7, zb + T + 0.01, 's');
    return [y, c];
  };

  // =====================================================================
  // every floor: the lift (SW corner), the round columns from the 1F lobby up to the skylight
  // =====================================================================
  cbx(EL.x0, EL.x1, F1 - SL, CT, EL.z0, EL.z1, MT.tileW, { tile: [0.6, 0.6] });
  for (let f = 0; f < 4; f++) {
    door((EL.x0 + EL.x1) / 2, FL[f], EL.z0 - 0.012, 'n', '電梯', 'steel');
    sign(`${f + 1}F`, (EL.x0 + EL.x1) / 2, FL[f] + 2.62, EL.z0 - 0.014, 'n', '#2d3b4a', 0.6);
  }
  for (const [x, z] of COLS) column(x, z, F1, CT);
  I.actions.push({
    poly: k.rect(EL.x0 + 0.6, EL.x1 - 0.6, EL.z0 - 1.5, EL.z0 - 0.1),
    y: 0,
    anyY: true,
    label: () => '按 <kbd>E</kbd> 搭電梯（1F → 2F → 3F → 4F）',
    fn: (g) => {
      const p = g.player,
        gh = H(p.pos.x, p.pos.z);
      let cur = 0;
      for (let f = 0; f < 4; f++) if (p.y > FL[f] - gh - 0.8) cur = f;
      const next = (cur + 1) % 4;
      const dy = FL[next] - gh + 0.05 - p.y;
      p.y += dy;
      p.pos.y += dy;
      p.vy = 0; // the feet go along (src/entities/Player.js compares the two)
      g.audio?.lift?.();
      g.hud?.toast(`電梯 → ${next + 1}F`, 'good', 1200);
    },
  });
  // SW stairs 2F -> 4F (樓梯間, behind the glass doors), NE stairs 3F -> 4F (north row)
  stairs({ ...SWS, ax: 'z', dir: 1, ld: 1.2, fa: 1, fb: 3 });
  stairs({ ...NES, ax: 'z', dir: -1, ld: 1.0, fa: 2, fb: 3 });

  // =====================================================================
  // 1F：大廳、主走廊、培英廳（前廳、側走廊）、原創咖啡、101 全球交誼廳、北門
  // =====================================================================
  {
    const f = 0,
      y = F1,
      c = y + CH[0],
      [wx0, wx1, wz0, wz1] = WELL,
      [d0, d1] = SAC_DOORS.s1;
    // lobby + main corridor; over the lobby's SE part there is no 2F floor (挑空 up to 3F)
    area(f, [C1.w, XMC, C1.n, ZS], { holes: [WELL], open: [[ATR.x1, XMC, C2.s, ZS]] });
    area(f, [XMC, XR, C1.n, MZ]);
    sf(d0, d1, ZS - 0.02, -94.4, y);
    bx(d0, d1, y - SL, y, ZS, -94.42, MT.floor);
    // corridor's north wall: the north door's hall, 101, 郵局 (closed: 請由戶外進出)
    doorRow(f, 'x', C1.n, 's', C1.w, XR, [
      [NH.x0, NH.x1, '', 'open'],
      [-139.25, -138.15, '101 邱林信貞全球交誼廳', 'open'],
    ]);
    sign('郵局（請由戶外進出）', -118.1, y + 2.45, C1.n + 0.02, 's', '#2a7a4a', 2.4);
    wall(XR, C1.n, XR, MZ, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    win(1.6, 1.3, XR - T - 0.01, y + 1.7, (C1.n + MZ) / 2, 'w');
    // 麥當勞's walls (the store is B1 + 1F high; over it the 2F floor / 麥當勞上空)
    wall(XMC, MZ, XR, MZ, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(XMC, MZ, XMC, ZS, y, F2 - 0.1, MT.tileW, 1, { tile: [0.6, 0.6] });
    quad(MT.posters, 4.6, 1.25, XMC - 0.01, y + 1.5, -100, 'w');
    sign('麥當勞（B1，由下沉廣場進出）', XMC - 0.014, y + 2.5, -106.5, 'w', '#b8141b', 2.6);
    // lobby's west wall: 培英廳大門 (into the 前廳), 原創咖啡's door; the south strip is open
    doorRow(f, 'z', C1.w, 'e', C1.n, CAFE.z1, [
      [-116.73, -112.4, '培英廳', 'open'],
      [-103.18, -102.18, '原創咖啡', 'open'],
    ]);
    // south wall: the entrance; windows
    front(
      f,
      'x',
      ZS,
      'n',
      [
        [XL, d0, '', 'solid'],
        [d0, d1, '', 'open'],
        [d1, XMC, '', 'solid'],
      ],
      { head: 2.7 }
    );
    for (let x = XL + 2.4; x < XMC - 1.2; x += 3.3)
      if (x < d0 - 1.4 || x > d1 + 1.4) win(2.2, 1.5, x, y + 1.75, ZS - T - 0.01, 'n');
    // rail round the B1 spiral stair's well; the gap is where its top landing meets the floor (north side)
    const gx0 = -147.1,
      gx1 = -144.9;
    steelRail(y, wx0, wz0, gx0, wz0);
    steelRail(y, gx1, wz0, wx1, wz0);
    steelRail(y, wx1, wz0, wx1, wz1);
    steelRail(y, wx0, wz1, wx1, wz1);
    steelRail(y, wx0, wz0, wx0, wz1);
    bx(gx0, gx1, y - SL, y, wz0, wz0 + 0.32, MT.floor);
    sign('2F ↑ · B1 用餐區 · 麥當勞 ↓', (gx0 + gx1) / 2, y + 2.5, wz0 - 0.4, 'n', '#2b5fae', 2.6);
    bx((gx0 + gx1) / 2 - 1.32, (gx0 + gx1) / 2 + 1.32, y + 2.15, c, wz0 - 0.36, wz0 - 0.3, MT.dark);
    // 往二樓的樓梯: a straight flight up westwards onto the 2F 中庭's east edge
    flight(F12.x0, F12.x1, F12.z0, F12.z1, F1, F2, F1 - 0.2);
    sign('2F ↑', F12.x0 + 0.02, y + 1.9, (F12.z0 + F12.z1) / 2, 'e', '#2d3b4a', 0.8);
    // benches
    for (const z of [-111, -104]) {
      cbx(-141.2, -139.4, y + 0.4, y + 0.46, z - 0.25, z + 0.25, MT.wood);
      for (const x of [-141.1, -139.5])
        bx(x - 0.04, x + 0.04, y, y + 0.4, z - 0.22, z + 0.22, MT.dark);
    }

    // --- north hall to the door on 新中北路: the ground outside is lower, a ramp inside the door
    const zF = -126.6,
      zO = -128.9,
      gN = LV.gN + 0.02,
      [n0, n1] = SAC_DOORS.n1;
    room(f, NH.x0, NH.x1, zF, C1.n);
    bx(NH.x0, NH.x1, c - 0.03, c + 0.05, ZN - 0.6, zF, MT.ceil);
    sf(NH.x0, NH.x1, zO, zF, (x, z) => gN + (y - gN) * clamp01((z - zO) / (zF - zO)));
    for (let i = 0; i < 8; i++) {
      const za = zO + ((zF - zO) * i) / 8,
        zb = zO + ((zF - zO) * (i + 1)) / 8;
      bx(NH.x0, NH.x1, gN - 0.3, gN + ((y - gN) * (i + 0.5)) / 8, za, zb, MT.floor);
    }
    wall(NH.x0, ZN, NH.x0, C1.n, y - 0.6, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(NH.x1, ZN, NH.x1, C1.n, y - 0.6, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    for (const [a, b2] of [
      [NH.x0, n0],
      [n1, NH.x1],
    ])
      cbx(a, b2, gN - 0.3, c, ZN - 0.6, ZN, MT.tileW, { tile: [0.6, 0.6] });
    bx(n0, n1, gN + 2.58, c, ZN - 0.6, ZN, MT.band);
    sign('新中北路 出口', (NH.x0 + NH.x1) / 2, y + 2.45, ZN + 0.02, 's', '#2d3b4a', 1.6);

    // --- 101 邱林信貞全球交誼廳（約 47.5 坪）：木紋地板、沙發、圓桌
    {
      const x0 = NH.x1,
        x1 = -131;
      room(f, x0, x1, ZN, C1.n, { floor: MT.vinyl });
      wall(x1, ZN, x1, C1.n, y, c, MT.white, -1);
      wall(x0, ZN, x0, C1.n, y, c, MT.white, 1);
      wall(x0, ZN, x1, ZN, y, c, MT.white, 1);
      for (let x = x0 + 2; x < x1 - 1; x += 3.4) win(2.4, 1.5, x, y + 1.7, ZN + T + 0.01, 's');
      for (const [tx, tz] of [
        [-142.5, -124.8],
        [-138, -124.8],
        [-133.8, -124.8],
        [-136, -120.6],
      ]) {
        k.cyl(tx, tz, 0.55, y + 0.7, y + 0.74, MT.tableW, { seg: 18 });
        k.cyl(tx, tz, 0.05, y, y + 0.7, MT.black, { seg: 8 });
        wlRect(tx - 0.45, tx + 0.45, tz - 0.45, tz + 0.45, y, y + 0.74);
        [
          ['s', 0, -0.85, MT.cR],
          ['n', 0, 0.85, MT.cW],
          ['e', -0.85, 0, MT.cY],
          ['w', 0.85, 0, MT.cO],
        ].forEach(([fc, dx, dz, m]) => chair(tx + dx, tz + dz, m, fc)(y));
      }
      cbx(x0 + 0.3, x0 + 1.2, y, y + 0.42, -125.5, -120.5, MT.sofa);
      bx(x0 + 0.3, x0 + 0.55, y + 0.42, y + 0.85, -125.5, -120.5, MT.sofa);
      cbx(x0 + 1.9, x0 + 2.6, y, y + 0.4, -124.2, -121.8, MT.tableWood);
      sign('Global Lounge 全球交誼廳', (x0 + x1) / 2, y + 2.45, ZN + T + 0.02, 's', '#1f5f8b', 3.2);
    }

    // --- 培英廳前廳（服務台）、往女廁男廁的側走廊
    area(f, [FOY.x0, FOY.x1, FOY.z0, FOY.z1]);
    area(f, [XL, FOY.x0, FOY.z0, HALL.z0]);
    doorRow(f, 'x', FOY.z0, 's', XL, FOY.x1, [
      [-192.82, -191.82, '女廁', 'svc'],
      [-188.71, -187.71, '男廁', 'svc'],
    ]);
    wall(XL, FOY.z0, XL, HALL.z0, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(FOY.x1, FOY.z0, FOY.x1, C1.n, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(FOY.x0, FOY.z1, FOY.x1, FOY.z1, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    cbx(-168.17, -167.47, y, y + 1.05, -114.71, -111.21, MT.wood);
    bx(-168.27, -167.37, y + 1.05, y + 1.1, -114.81, -111.11, MT.tableW);
    sign('服務台', -167.82, y + 2.5, -112.96, 'e', '#1f5f8b', 1.1);
    bx(-167.86, -167.78, y + 2.1, c, -113.6, -112.3, MT.dark);
    quad(MT.posters, 4.2, 1.2, FOY.x1 - T - 0.01, y + 1.5, -109, 'w');
    sign('女廁 · 男廁 ←', FOY.x0 + 0.02, y + 2.55, -126.0, 'e', '#3b6b4a', 1.5);

    // --- 培英廳：一樓西半、挑高兩層（北半在古箏社那一角底下）。舞台在西端，觀眾席往東一排一排升高（15 排），
    // 正門在東牆北段（前廳進去），門裡幾階下到前廳的地面
    const A = HALL,
      hc = F3 - SL - 0.1,
      ax0 = A.x0,
      ax1 = A.x1,
      zm = (A.z0 + A.z1) / 2,
      [h0, h1] = A.door,
      rTop = A.step * (A.rows - 3), // the row the steps come down from
      xR = A.row0 + (A.rows - 2) * A.pitch; // the steps start here (the last two rows are steps in the door band)
    const rowY = (x) =>
      y + A.step * Math.max(0, Math.min(A.rows - 1, Math.floor((x - A.row0) / A.pitch)));
    const inDoor = (z) => z > h0 && z < h1;
    bx(ax0, A.row0, y - SL, y, A.z0, A.z1, MT.carpet);
    sf(ax0, ax1, A.z0, A.z1, (x, z) =>
      inDoor(z) && x > xR ? Math.min(rowY(x), y + rTop * clamp01((ax1 - x) / (ax1 - xR))) : rowY(x)
    );
    for (let i = 0; i < A.rows; i++) {
      const x0 = A.row0 + i * A.pitch,
        x1 = i === A.rows - 1 ? ax1 : x0 + A.pitch;
      if (x0 >= xR - 0.01) {
        bx(x0, x1, y - SL, y + A.step * i, A.z0, h0, MT.carpet);
        bx(x0, x1, y - SL, y + A.step * i, h1, A.z1, MT.carpet);
      } else bx(x0, x1, y - SL, y + A.step * i, A.z0, A.z1, MT.carpet);
    }
    for (let i = 0; i < 4; i++) {
      const xa = xR + ((ax1 - xR) * i) / 4,
        xb = xR + ((ax1 - xR) * (i + 1)) / 4;
      bx(xa, xb, y - SL, y + (rTop * (4 - i)) / 4 - 0.03, h0, h1, MT.carpet);
    }
    bx(ax0, ax1, hc, hc + 0.1, A.z0, A.z1, MT.ceil);
    for (let x = A.stage + 2; x < ax1 - 1; x += 3.6) {
      bx(x - 0.15, x + 0.15, hc - 0.32, hc, A.z0 + 0.6, A.z1 - 0.6, MT.white);
      bx(x + 0.15, x + 0.3, hc - 0.3, hc - 0.26, A.z0 + 1, A.z1 - 1, MT.light);
    }
    // walls: dark wood below, wood lattice panels between cream round columns above (相片 2023-09)
    for (const [z, s] of [
      [A.z0, 1],
      [A.z1, -1],
    ]) {
      const za = s > 0 ? z + T : z - T - 0.1;
      bx(ax0, ax1, y, y + 2.4, za, za + 0.1, MT.darkwood);
      bx(ax0, ax1, y + 2.4, hc, za, za + 0.1, MT.lattice, { tile: [1.2, 1.2] });
      wl(ax0, z, ax1, z, y, hc);
      bx(ax0, ax1, y, hc, s > 0 ? z : z - T, s > 0 ? z + T : z, MT.white);
      for (let x = A.stage + 3.4; x < ax1; x += 4.6) column(x, z + s * 0.4, y, hc, 0.38);
    }
    for (const [za, zb] of [
      [A.z0, h0],
      [h1, A.z1],
    ])
      wall(ax1, za, ax1, zb, y, hc, MT.darkwood, -1);
    bx(ax1 - T, ax1, y + 2.6, hc, h0, h1, MT.darkwood);
    wl(ax1, h0, ax1, h1, y + 2.6, hc);
    wall(ax0, A.z0, ax0, A.z1, y, hc, MT.black, 1);
    sign('培英廳', ax1 + 0.014, y + 2.75, (h0 + h1) / 2, 'e', '#7a1f1c', 1.5);
    sign('培英廳 正門', FOY.x1 - T - 0.014, y + 2.55, (h0 + h1) / 2, 'w', '#7a1f1c', 1.6);
    // stage 0.9 m up, steps at both ends, red curtains, projection screen
    const sy = y + 0.9;
    bx(ax0, A.stage, y, sy, A.z0 + 0.1, A.z1 - 0.1, MT.stage);
    sf(ax0, A.stage, A.z0, A.z1, sy);
    wl(A.stage, A.z0 + 1.5, A.stage, A.z1 - 1.5, y - 0.2, sy - 0.05);
    for (const [z0, z1] of [
      [A.z0 + 0.1, A.z0 + 1.5],
      [A.z1 - 1.5, A.z1 - 0.1],
    ])
      for (let i = 0; i < 2; i++) {
        const x0 = A.stage + (1 - i) * 0.32,
          h = y + 0.3 * (i + 1);
        bx(x0, x0 + 0.32, y, h, z0, z1, MT.stage);
        sf(x0, x0 + 0.32, z0, z1, h);
      }
    bx(ax0 + T, ax0 + T + 0.12, sy, hc - 0.2, A.z0 + 0.3, A.z1 - 0.3, MT.curtain, {
      tile: [2.5, 20],
    });
    for (const z of [A.z0 + 0.3, A.z1 - 2.6])
      bx(A.stage - 0.6, A.stage - 0.45, sy, hc - 0.2, z, z + 2.3, MT.curtain, { tile: [2.5, 20] });
    bx(ax0 + T, A.stage - 0.3, hc - 1.2, hc - 0.2, A.z0 + 0.3, A.z1 - 0.3, MT.curtain, {
      tile: [2.5, 20],
    });
    bx(ax0 + 0.5, ax0 + 0.55, sy + 0.9, sy + 3.5, zm - 3, zm + 3, MT.screen);
    cbx(-192.2, -191.4, sy, sy + 1.1, -121.26, -120.56, MT.darkwood); // 講台
    // seats: two blocks with a centre aisle and an aisle along each wall; the last two rows are a cross aisle from the door
    for (let i = 0; i < A.rows - 2; i++) {
      const x0 = A.row0 + i * A.pitch + 0.3,
        h = y + A.step * i,
        blocks = [
          [A.z0 + 1.5, zm - 0.8],
          [zm + 0.8, A.z1 - 1.5],
        ];
      for (const [z0, z1] of blocks) {
        const n = Math.round((z1 - z0) / 0.57),
          w = (z1 - z0) / n;
        // the seats themselves: furniture, hidden from > 45 m (Kit.furniture)
        k.furniture(() => {
          for (let j = 0; j < n; j++) {
            const z = z0 + j * w;
            bx(x0, x0 + 0.48, h + 0.38, h + 0.5, z + 0.04, z + w - 0.04, MT.seat);
            bx(x0 + 0.42, x0 + 0.54, h + 0.38, h + 1.02, z + 0.04, z + w - 0.04, MT.seat);
          }
        });
        bx(x0 + 0.1, x0 + 0.5, h, h + 0.38, z0, z1, MT.black);
        wlRect(x0, x0 + 0.54, z0, z1, h, h + 1.0);
      }
    }

    // --- 原創咖啡：櫃台在西端，長條座位區
    area(f, [CAFE.x0, CAFE.x1, CAFE.z0, CAFE.z1], { floor: MT.vinyl });
    wall(XL, CAFE.z0, FOY.x0, CAFE.z0, y, c, MT.white, 1);
    wall(XL, CAFE.z1, CAFE.x1, CAFE.z1, y, c, MT.white, -1);
    wall(XL, CAFE.z0, XL, CAFE.z1, y, c, MT.white, 1);
    cbx(XL + 1.4, XL + 2.0, y, y + 1.05, CAFE.z0 + 0.6, CAFE.z1 - 0.9, MT.wood);
    bx(XL + 1.35, XL + 2.05, y + 1.05, y + 1.1, CAFE.z0 + 0.55, CAFE.z1 - 0.85, MT.tableW);
    cbx(XL + T, XL + 0.7, y, y + 2.0, CAFE.z0 + 0.5, CAFE.z1 - 0.5, MT.darkwood);
    sign('原創咖啡', XL + T + 0.02, y + 2.4, (CAFE.z0 + CAFE.z1) / 2, 'e', '#5a3320', 1.6);
    for (let x = -188; x < CAFE.x1 - 3; x += 3.4) {
      const tz = (CAFE.z0 + CAFE.z1) / 2;
      table(y, x - 0.45, x + 0.45, tz - 0.45, tz + 0.45, MT.tableWood);
      chair(x, tz - 0.85, MT.cW, 's')(y);
      chair(x, tz + 0.85, MT.cO, 'n')(y);
    }
    // --- the strip along the south wall (to the lift)
    area(f, [XL, C1.w, CAFE.z1, ZS]);
    wall(XL, CAFE.z1, XL, ZS, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    sign('電梯 →', -180, y + 2.5, CAFE.z1 + 0.02, 's', '#2d3b4a', 1.0);
  }

  // =====================================================================
  // 2F：前平台（中庭）、往天橋、主走廊東段（旋轉梯頂、往三樓的樓梯）、雅文 A／B 廳、
  // 培英廳上空、往樓梯間的走廊、麥當勞上空（大廳挑空到三樓）
  // =====================================================================
  {
    const f = 1,
      y = F2,
      c = y + CH[1],
      [d0] = SAC_DOORS.s2,
      [wx0, wx1, wz0] = WELL;
    const OPEN3 = [[VD.x0, VD.x1, VD.z0, VD.z1]]; // the 3F 挑空 over the middle
    area(f, [ATR.x0, ATR.x1, C2.n, ZS], { floor: MT.red, open: OPEN3 });
    area(f, [ATR.x1, C2.e, C2.n, C2.s], {
      floor: MT.red,
      holes: [[wx0, wx1, wz0, C2.s]],
      open: OPEN3,
    });
    area(f, [BH.x1, -155.27, ZN, -124.5], { floor: MT.red });
    area(f, [BH.x0, -155.27, -124.5, C2.n], { floor: MT.red });
    area(f, [-184.82, ATR.x0, PV.s, -99.84], { floor: MT.red });
    area(f, [XL, -184.82, PV.s, ZS], {
      floor: MT.red,
      holes: [
        [SWS.x0, SWS.x1, SWS.z0, SWS.z1],
        [EL.x0, EL.x1, EL.z0, EL.z1],
      ],
    });
    // 培英廳上空 (closed off): its east wall is the 中庭's west wall with the 布告欄, its south wall the corridor to the stairs
    wall(BH.x0, ZN, BH.x0, C2.n, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(BH.x0, C2.n, ATR.x0, C2.n, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(ATR.x0, C2.n, ATR.x0, PV.s, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(XL, PV.s, ATR.x0, PV.s, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    cbx(ATR.x0, ATR.x0 + 0.2, y, y + 2.6, -116.07, -110.4, MT.dark);
    quad(MT.posters, 5.5, 1.6, ATR.x0 + 0.215, y + 1.5, -113.24, 'e');
    bx(ATR.x0 - 0.05, ATR.x0 + 0.3, y + 2.6, y + 2.78, -116.3, -110.17, MT.band);
    // corridor to the 樓梯間 (glass doors) and the lift; 倉儲室 along its south side
    doorRow(f, 'x', -99.84, 'n', -184.82, ATR.x0, [[-167.71, -165.93, '倉儲室', 'svc']]);
    wall(ATR.x0, -99.84, ATR.x0, ZS, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    doorRow(f, 'z', -184.82, 'e', PV.s, ZS, [[-104.07, -100.51, '樓梯間', 'open']]);
    glassDoors(f, -184.82, -104.07, -100.51);
    sign('樓梯 · 電梯 →', -172, y + 2.5, PV.s + 0.02, 's', '#2d3b4a', 1.6);
    wall(XL, PV.s, XL, SWS.z0, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(SWS.x1, ZS, -184.82, ZS, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    // south: the porch is open (大階梯 up from the forecourt); east of the 中庭 the lobby's 挑空 and 麥當勞上空
    front(
      f,
      'x',
      ZS,
      'n',
      [
        [ATR.x0, d0, '', 'solid'],
        [d0, ATR.x1, '', 'open'],
      ],
      { head: 2.5 }
    );
    sign('2F 前平台', (d0 + ATR.x1) / 2, y + 2.6, ZS - T - 0.02, 'n', '#2d3b4a', 1.4);
    wall(ATR.x1, ZS, XR, ZS, F2 - 0.35, F3 - 0.3, MT.tileW, -1, { tile: [0.6, 0.6] });
    for (let x = ATR.x1 + 2; x < XR - 1; x += 3.3) win(2.2, 1.5, x, y + 1.6, ZS - T - 0.01, 'n');
    wall(XR, C2.s, XR, ZS, F2 - 0.35, F3 - 0.3, MT.tileW, -1, { tile: [0.6, 0.6] });
    bx(XMC, XR, F2 - 0.13, F2 - 0.09, C2.s, ZS, MT.band); // 麥當勞上空: the top of the block over the store
    // the 挑空 edges: the 中庭's east edge (the flight from 1F comes up here), the corridor's south edge
    parapet(f, ATR.x1, C2.s, ATR.x1, F12.z0);
    parapet(f, ATR.x1, F12.z1, ATR.x1, ZS);
    parapet(f, ATR.x1, C2.s, wx0, C2.s);
    parapet(f, wx1, C2.s, C2.e, C2.s);
    // the B1 spiral stair ends here: it comes up through the corridor's south edge, out to the north
    const gx0 = -147.1,
      gx1 = -144.9;
    steelRail(y, wx0, wz0, gx0, wz0);
    steelRail(y, gx1, wz0, wx1, wz0);
    steelRail(y, wx0, wz0, wx0, C2.s);
    steelRail(y, wx1, wz0, wx1, C2.s);
    bx(gx0, gx1, y - SL, y, wz0, wz0 + 0.32, MT.red);
    sign('樓梯 ↓ 1F · B1', (gx0 + gx1) / 2, y + 2.5, wz0 - 0.4, 'n', '#2d3b4a', 1.6);
    // 往三樓的樓梯 (up eastwards to the 3F gallery east of the 挑空)
    flight(F23.x0, F23.x1, F23.z0, F23.z1, F2, F3, F2 - 0.2);
    sign('3F ↑', F23.x0 - 0.02, y + 1.9, (F23.z0 + F23.z1) / 2, 'w', '#2d3b4a', 0.8);
    // corridor's north wall: 雅文 A 廳 (double door), the rest closed
    doorRow(f, 'x', C2.n, 's', -155.27, XR, [[-140.71, -136.71, '雅文多功能展演廳 A 廳', 'open']]);
    wall(-155.27, ZN, -155.27, C2.n, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    // 雅文 B 廳 (closed): the corridor's east end
    doorRow(f, 'z', C2.e, 'w', C2.n, C2.s, [
      [-117.07, -114.84, '雅文多功能展演廳 B 廳', 'room'],
      [-111.96, -110.73, 'B 廳 側門', 'room'],
    ]);
    wall(C2.e, C2.s, XR, C2.s, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });

    // --- hall to the footbridge: floor, 7 steps up to a landing level with the deck, the door
    const zT = -124.5,
      zB = -126.6,
      zW = -128.5,
      [n0, n1] = SAC_DOORS.nb,
      N = 7;
    bx(BH.x0, BH.x1, y - SL, DK, zW + 0.1, zB, MT.red, { tile: [2.4, 2.4] });
    sf(BH.x0, BH.x1, zW, zB, DK);
    sf(BH.x0, BH.x1, zB, zT, (x, z) => DK + (y - DK) * clamp01((z - zB) / (zT - zB)));
    for (let i = 0; i < N; i++)
      bx(
        BH.x0,
        BH.x1,
        y - SL,
        DK + ((y - DK) * (i + 1)) / N,
        zB + ((zT - zB) * i) / N,
        zB + ((zT - zB) * (i + 1)) / N,
        MT.stair
      );
    wall(BH.x1, ZN, BH.x1, zT, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    for (const x of [BH.x0 + T + 0.06, BH.x1 - 0.06]) {
      const g = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(zT - zB, DK - y));
      g.rotateX(Math.atan2(DK - y, zT - zB));
      g.translate(x, (DK + y) / 2 + 0.95, (zB + zT) / 2);
      k._part(MT.rail, g);
    }
    for (const [a, b2] of [
      [BH.x0, n0],
      [n1, BH.x1],
    ])
      cbx(a, b2, y, c, zW + 0.12, ZN, MT.tileW, { tile: [0.6, 0.6] });
    bx(n0, n1, DK + 2.05, c, zW + 0.12, ZN, MT.band);
    wall(BH.x1, ZN, -155.27, ZN, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    for (const x of [-159.6, -156.8]) win(2.0, 1.4, x, y + 1.7, ZN + 0.01, 's');
    sign(
      '天橋 → 力行宿舍',
      (BH.x0 + BH.x1) / 2,
      DK + 1.9 > c - 0.25 ? c - 0.25 : DK + 1.9,
      ZN + 0.03,
      's',
      '#2d3b4a',
      1.8
    );
    sign('往 天橋 · 力行宿舍', (BH.x0 + BH.x1) / 2 + 2.5, y + 2.6, C2.n + 0.2, 's', '#b9831a', 2.0);

    // --- 雅文多功能展演廳 A 廳：木紋地板、木格柵天花、黃椅白桌、深色窗框大窗；西端服務台，東北角倉儲室
    const x0 = -141.71,
      x1 = -116.04;
    room(f, x0, x1, ZN, C2.n, { floor: MT.vinyl, lights: false });
    for (let z = ZN + 0.6; z < C2.n - 0.3; z += 0.5)
      bx(x0 + 0.2, x1 - 0.2, c - 0.2, c - 0.05, z, z + 0.07, MT.slat);
    for (let x = x0 + 2; x < x1 - 1; x += 3)
      for (const z of [-125.5, -120.5])
        bx(x - 0.07, x + 0.07, c - 0.3, c - 0.2, z - 0.07, z + 0.07, MT.light);
    wall(x0, ZN, x0, C2.n, y, c, MT.white, -1);
    wall(x0, ZN, x1, ZN, y, c, MT.white, -1);
    for (let x = x0 + 1.8; x < x1 - 1; x += 2.8) win(2.2, 1.6, x, y + 1.7, ZN + 0.01, 's');
    doorRow(f, 'z', x1, 'w', ZN, C2.n, [[-120.96, -118.84, '倉儲室', 'svc']], { mat: MT.white });
    cbx(-132.33, -132.21, y, c, ZN, -121.51, MT.white); // the partition
    cbx(-140.93, -140.04, y, y + 1.05, -122.84, -119.4, MT.wood); // 服務台
    bx(-141.0, -139.97, y + 1.05, y + 1.1, -122.9, -119.34, MT.tableW);
    for (const tx of [-129, -125.5, -122, -118.8])
      for (const tz of [-125.4, -121.4]) {
        table(y, tx - 0.45, tx + 0.45, tz - 0.45, tz + 0.45, MT.tableW);
        [
          ['s', 0, -0.75],
          ['n', 0, 0.75],
          ['e', -0.75, 0],
          ['w', 0.75, 0],
        ].forEach(([fc, dx, dz]) => chair(tx + dx, tz + dz, MT.cY, fc)(y));
      }
    bx(-132.21, -132.18, y + 0.9, y + 2.2, -127.5, -123.5, MT.screen);
  }

  // =====================================================================
  // 3F：招待所前平台、北排教室與社辦（302 活動教室進得去）、中庭上方的挑空（四周白磁磚女兒牆）、
  // 僑生聯誼會、三樓活動平台、課外活動指導組、311／312（312 韻律教室進得去）、樓梯間（往生科館的空橋）
  // =====================================================================
  // the 4F 挑空 (3F has no ceiling under them)
  const OPEN4 = [
    [GU, BR.x0, C4.s, S4.n],
    [BR.x1, V4E.x0, C4.s, S4.n],
    [R419.x1, R411.x0, C4.s, S4.n],
  ];
  {
    const f = 2,
      y = F3,
      c = y + CH[2],
      [b0, b1] = SAC_DOORS.wb,
      o = { floor: MT.red, open: OPEN4 };
    area(f, [GU, XC, ZC, S3.n], o);
    area(f, [XC, VD.x0, C3.n, S3.n], o);
    area(f, [VD.x0, XR, C3.n, VD.z0], o);
    area(f, [F34.x0, F34.l3, ...F34.n], o);
    area(f, [F34.x0, F34.l3, ...F34.s], o);
    area(f, [VD.x1, -136.25, VD.z0, S3.n], o);
    area(f, [-129.47, -116.81, VD.z0, S3.n], o);
    area(f, [GU, -116.81, S3.n, S3.r], o);
    area(f, [-169.81, -136.03, S3.r, ZS], o);
    area(f, [NES.x0, NES.x1, NES.z1, C3.n], o);
    area(f, [XL, GU, S3.n, ZS], {
      ...o,
      holes: [
        [SWS.x0, SWS.x1, SWS.z0, SWS.z1],
        [EL.x0, EL.x1, EL.z0, EL.z1],
      ],
    });
    // north row (the 古箏社教室's door is on its own wall, src/world/buildings/ClubRoom.js)
    doorRow(f, 'x', C3.n, 's', XC, XR, [
      [-179.47, -174.92, '', 'open'],
      [-171.59, -170.03, '302 活動教室', 'open'],
      [-166.81, -165.25, '303', 'office'],
      [-163.47, -161.92, '304', 'office'],
      [-159.92, -158.36, '305', 'office'],
      [-153.7, -152.14, '306', 'room'],
      [-147.81, -146.25, '307', 'room'],
      [NES.x0, NES.x1, '', 'open'],
      [-132.14, -130.59, '學生會', 'office'],
      [-123.36, -121.81, '309', 'room'],
      [-115.47, -113.92, '310', 'room'],
    ]);
    wcVest(f, -180.36, -173.92, -125.07, C3.n, -179.47, -174.92);
    wall(XR, C3.n, XR, VD.z0, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    win(1.6, 1.3, XR - T - 0.01, y + 1.7, (C3.n + VD.z0) / 2, 'w');
    sign('← 古箏社教室', XC + 1.4, y + 2.55, C3.n + 0.02, 's', '#5a1620', 1.6);
    // the 挑空's edges: parapets; the flights 3F -> 4F sit in two notches (their own rails), the one from 2F comes up the east edge
    const [n0, n1] = F34.n,
      [s0, s1] = F34.s;
    parapet(f, VD.x0, VD.z0, F34.x1, VD.z0);
    parapet(f, F34.l3, VD.z0, VD.x1, VD.z0);
    parapet(f, F34.x0, n1, F34.l3, n1);
    parapet(f, F34.l3, n0, F34.l3, n1);
    parapet(f, VD.x0, VD.z1, F34.x1, VD.z1);
    parapet(f, F34.l3, VD.z1, VD.x1, VD.z1);
    parapet(f, F34.x0, s0, F34.l3, s0);
    parapet(f, F34.l3, s0, F34.l3, s1);
    parapet(f, VD.x0, VD.z0, VD.x0, VD.z1);
    parapet(f, VD.x1, VD.z0, VD.x1, F23.z0);
    parapet(f, VD.x1, F23.z1, VD.x1, VD.z1);
    flight(F34.x0, F34.x1, n0, n1, F3, F4, F3 - 0.3);
    flight(F34.x0, F34.x1, s0, s1, F3, F4, F3 - 0.3);
    // 招待所 (closed, 門禁; two floors high): its east wall on the platform, the round window in it
    doorRow(f, 'z', GU, 'e', ZC, ZS, [
      [-116.6, -115.4, '招待所', 'office'],
      [-103.96, -101.51, '', 'open'],
    ]);
    glassDoors(f, GU, -103.96, -101.51);
    wall(GU, ZC, GU, S3.n, c, CT, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(XL, S3.n, GU, S3.n, y, CT, MT.tileW, -1, { tile: [0.6, 0.6] });
    {
      const g = new THREE.CircleGeometry(1.2, 36);
      g.rotateY(Math.PI / 2);
      g.translate(GU + 0.02, y + 2.0, -111.95);
      k._part(MT.window, g);
      const t = new THREE.TorusGeometry(1.25, 0.1, 8, 36);
      t.rotateY(Math.PI / 2);
      t.translate(GU + 0.04, y + 2.0, -111.95);
      k._part(MT.band, t);
    }
    I.actions.push({
      x: GU + 0.7,
      z: -116,
      r: 1.1,
      y: y - H(GU + 0.7, -116),
      label: () => '招待所的門要刷卡（門禁管制）',
      fn: (g) => g.hud?.toast('🔒 招待所有門禁，要刷卡才進得去', 'bad', 1800),
    });
    sign('3樓 招待所前平台', -174, y + 2.6, S3.n - 0.02, 'n', '#2d3b4a', 2.0);
    // 樓梯間 (SW): the bridge to 生物科技館 comes in on its west wall
    front(f, 'z', XL, 'e', [
      [S3.n, b0, '', 'solid'],
      [b0, b1, '', 'open'],
      [b1, SWS.z0, '', 'solid'],
    ]);
    wall(SWS.x1, ZS, GU, ZS, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    // the south rooms: 311 (closed), 312 韻律教室; 課外活動指導組 (closed); 整片全身鏡 on the platform's walls
    doorRow(f, 'x', S3.r, 'n', GU, -169.81, [
      [-182.25, -180.36, '311', 'room'],
      [-174.59, -172.7, '312 韻律教室', 'open'],
    ]);
    doorRow(f, 'x', S3.r, 'n', -136.03, XR, [[-128.59, -123.14, '課外活動指導組', 'office']]);
    sign('課外活動指導組', (-128.59 + -123.14) / 2, y + 2.6, S3.r - 0.014, 'n', '#1f5f8b', 2.2);
    wall(-136.03, S3.r, -136.03, ZS, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    bx(-136.06, -136.03, y + 0.2, y + 2.3, S3.r + 0.15, ZS - 0.15, MT.mirror);
    wall(-169.81, ZS, -136.03, ZS, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    for (let x = -167.6; x < -137.5; x += 3.3) win(2.2, 1.5, x, y + 1.7, ZS - T - 0.01, 'n');
    sign('3樓 活動平台', -152.9, y + 2.6, ZS - T - 0.02, 'n', '#2d3b4a', 1.6);
    // 僑生聯誼會 (closed): door from the corridor, 佈告欄 on its west wall
    doorRow(f, 'x', VD.z0, 'n', -136.25, -129.47, [[-134.7, -131.36, '僑生聯誼會', 'office']]);
    wall(-136.25, VD.z0, -136.25, S3.n, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(-136.25, S3.n, -129.47, S3.n, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(-129.47, VD.z0, -129.47, S3.n, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    cbx(-136.45, -136.25, y + 0.9, y + 2.1, -114.18, -108.84, MT.dark);
    quad(MT.posters, 5.1, 1.1, -136.46, y + 1.5, -111.51, 'w');
    // 三樓活動平台: the closed room at its east end, a mirror on its west wall
    wall(-116.81, VD.z0, -116.81, S3.r, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(-116.81, VD.z0, XR, VD.z0, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    bx(-116.84, -116.81, y + 0.2, y + 2.3, -118.18, -104.4, MT.mirror);
    sign('3樓 活動平台', -116.84, y + 2.6, -102, 'w', '#2d3b4a', 1.6);

    // --- 302 活動教室：木紋長桌排成兩排、橘紅白三色椅、白板
    {
      const [y2] = shell(f, -173.92, -167.59, C3.n),
        cx = (-173.92 + -167.59) / 2,
        cols = [MT.cO, MT.cR, MT.cW];
      // rows pushed north so the front chairs leave ~1.6 m inside the door (the door is mid-row)
      for (const tz of [-127.2, -125.0]) {
        table(y2, cx - 2.0, cx + 2.0, tz - 0.35, tz + 0.35);
        for (let i = 0; i < 4; i++) chair(cx - 1.5 + i, tz + 0.7, cols[i % 3], 'n')(y2);
      }
      bx(-173.92 + T, -173.92 + T + 0.03, y2 + 0.95, y2 + 2.05, -127.2, -124.2, MT.screen);
    }
    // --- 312 韻律教室：木地板、黑色格子梁天花、整面鏡子與把桿（禁止穿鞋）；外面東牆是平台的整片全身鏡
    {
      const x0 = -177.36,
        x1 = -169.81;
      room(f, x0, x1, S3.r, ZS, { floor: MT.vinyl, ceilM: MT.black });
      wall(x0, S3.r, x0, ZS, y, c, MT.white, 1);
      wall(x1, S3.r, x1, ZS, y, c, MT.white, -1);
      wall(x0, ZS, x1, ZS, y, c, MT.white, -1);
      for (let x = x0 + 1.2; x < x1 - 0.5; x += 2.4)
        bx(x - 0.1, x + 0.1, c - 0.3, c - 0.03, S3.r + 0.2, ZS - 0.2, MT.white);
      bx(x0 + T, x0 + T + 0.03, y + 0.15, y + 2.2, S3.r + 0.4, ZS - 0.4, MT.mirror);
      bx(x0 + T + 0.25, x0 + T + 0.3, y + 0.98, y + 1.03, S3.r + 0.5, ZS - 0.5, MT.wood);
      for (let z = S3.r + 0.8; z < ZS - 0.4; z += 1.6)
        bx(x0 + T + 0.03, x0 + T + 0.3, y + 0.98, y + 1.02, z - 0.02, z + 0.02, MT.steel);
      bx(x1, x1 + 0.03, y + 0.2, y + 2.3, S3.r + 0.15, ZS - 0.15, MT.mirror); // outside: 整片全身鏡 on the platform
      cbx(x1 - T - 0.5, x1 - T - 0.1, y, y + 0.45, S3.r + 0.3, S3.r + 1.5, MT.wood); // 鞋櫃
      win(2.0, 1.3, (x0 + x1) / 2, y + 1.7, ZS - T - 0.01, 'n');
    }
  }

  // =====================================================================
  // 4F：北側走廊（社辦、攝影社）、南側走廊（社辦、古箏社、儲藏室）、三塊挑空和中間的四樓空橋、
  // 419 武術練習室（進得去）、411 大音樂練習室與琴房（練習室大門進去）、樓梯間
  // =====================================================================
  {
    const f = 3,
      y = F4,
      c = y + CH[3],
      n1 = F34.n[1],
      s0 = F34.s[0],
      o = { floor: MT.red };
    area(f, [XC, XR, C4.n, C4.s], o);
    area(f, [GU, R411.x0, S4.n, S4.r], o);
    area(f, [BR.x0, BR.x1, C4.s, S4.n], o);
    area(f, [F34.l4, F34.x1, C4.s, n1], o);
    area(f, [F34.l4, F34.x1, s0, S4.n], o);
    area(f, [V4E.x0, R419.x0, C4.s, S4.n], o);
    area(f, [R411.x0, XR, S4.n, S4.r], o);
    area(f, [XL, GU, S4.n, ZS], {
      ...o,
      holes: [
        [SWS.x0, SWS.x1, SWS.z0, SWS.z1],
        [EL.x0, EL.x1, EL.z0, EL.z1],
      ],
    });
    // north row
    doorRow(f, 'x', C4.n, 's', XC, XR, [
      [-178.27, -173.93, '', 'open'],
      [-167.16, -165.71, '攝影社 後門', 'office'],
      [-163.82, -162.38, '攝影社', 'office'],
      [-160.6, -159.04, '403', 'office'],
      [-156.82, -155.38, '404', 'office'],
      [-153.27, -151.82, '405', 'office'],
      [-147.82, -146.49, '406', 'office'],
      [-144.49, -143.16, '407', 'office'],
      [NES.x0, NES.x1, '', 'open'],
      [-129.6, -128.04, '408', 'office'],
      [-119.93, -118.27, '409', 'office'],
      [-115.16, -113.27, '410', 'office'],
    ]);
    wcVest(f, -179.38, -172.6, -126.18, C4.n, -178.27, -173.93);
    wall(XC, C4.n, XC, C4.s, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(XR, C4.n, XR, C4.s, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    win(1.6, 1.3, XR - T - 0.01, y + 1.7, (C4.n + C4.s) / 2, 'w');
    sign('北側走廊', -149.6, y + 2.6, C4.n + 0.02, 's', '#2d3b4a', 1.2);
    // the 挑空 edges (the bridge between the west and middle ones, the landings of the flights from 3F)
    parapet(f, XC, C4.s, BR.x0, C4.s);
    parapet(f, BR.x1, C4.s, F34.l4, C4.s);
    parapet(f, F34.x1, C4.s, V4E.x0, C4.s);
    parapet(f, R419.x1, C4.s, R411.x0, C4.s);
    parapet(f, GU, S4.n, BR.x0, S4.n);
    parapet(f, BR.x1, S4.n, F34.l4, S4.n);
    parapet(f, F34.x1, S4.n, V4E.x0, S4.n);
    parapet(f, R419.x1, S4.n, R411.x0, S4.n);
    parapet(f, BR.x0, C4.s, BR.x0, S4.n);
    parapet(f, BR.x1, C4.s, BR.x1, S4.n);
    parapet(f, F34.l4, C4.s, F34.l4, n1);
    parapet(f, F34.l4, n1, F34.x1, n1);
    parapet(f, F34.l4, s0, F34.l4, S4.n);
    parapet(f, F34.l4, s0, F34.x1, s0);
    parapet(f, V4E.x0, C4.s, V4E.x0, S4.n);
    sign('四樓空橋', (BR.x0 + BR.x1) / 2, y + 2.4, C4.s + 0.3, 's', '#2d3b4a', 1.2);
    // the roof over the 挑空: the skylight over the middle one, plain ceiling over the others
    for (const q of minus(
      [BR.x1, V4E.x0, C4.s, S4.n],
      [
        [F34.l4, F34.x1, C4.s, n1],
        [F34.l4, F34.x1, s0, S4.n],
      ]
    ))
      bx(q[0], q[1], CT - 0.03, CT + 0.05, q[2], q[3], MT.sky);
    for (let x = BR.x1 + 1.5; x < V4E.x0 - 0.5; x += 3.2)
      bx(x - 0.05, x + 0.05, CT - 0.14, CT - 0.03, C4.s, S4.n, MT.white);
    for (const [x0, x1, z0] of [
      [GU, XC, ZC],
      [XC, BR.x0, C4.s],
      [R419.x1, R411.x0, C4.s],
    ])
      bx(x0, x1, CT - 0.03, CT + 0.05, z0, S4.n, MT.ceil);
    // south row
    doorRow(f, 'x', S4.r, 'n', GU, R411.x0, [
      [-183.71, -182.38, '433', 'office'],
      [-179.49, -178.16, '433', 'office'],
      [-174.82, -173.38, '431', 'office'],
      [-170.16, -168.71, '431', 'office'],
      [-167.38, -166.16, '429', 'office'],
      [-163.16, -161.93, '429', 'office'],
      [-160.82, -159.04, '428', 'office'],
      [-157.16, -155.49, '427', 'office'],
      [-153.27, -151.6, '426', 'office'],
      [-146.16, -144.38, '儲藏室', 'svc'],
      [-141.82, -140.49, '424', 'office'],
      [-138.16, -136.82, '424', 'office'],
      [-135.38, -134.04, '422', 'office'],
      [-131.16, -129.82, '422', 'office'],
      [-128.71, -127.04, '古箏社', 'office'],
      [-124.6, -123.04, '古箏社', 'office'],
    ]);
    sign('南側走廊', -149.2, y + 2.6, S4.r - 0.02, 'n', '#2d3b4a', 1.2);
    // 樓梯間 (SW), glass doors to the south corridor; 招待所上空 north of it
    doorRow(f, 'z', GU, 'e', S4.n, ZS, [[S4.n, S4.r, '', 'open']]);
    glassDoors(f, GU, S4.n + 0.05, S4.r - 0.05);
    wall(XL, S4.n, GU, S4.n, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    wall(XL, S4.n, XL, SWS.z0, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(SWS.x1, ZS, GU, ZS, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    // 419 武術練習室：灰綠軟墊中間一塊紅色、黃色牆面防撞墊；東牆對著挑空的大玻璃窗（平面圖上是半圓形外凸的玻璃，這裡做成平的）
    {
      const x0 = R419.x0,
        x1 = R419.x1;
      room(f, x0, x1, C4.s, S4.n, { floor: MT.matG });
      wall(x0, C4.s, x0, S4.n, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
      wall(x1, C4.s, x1, S4.n, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
      doorRow(f, 'x', C4.s, 'n', x0, x1, [[-135.27, -133.49, '419 武術練習室', 'open']]);
      doorRow(f, 'x', S4.n, 's', x0, x1, [[-135.27, -133.6, '419 後門', 'open']]);
      bx(x0 + 1.6, x1 - 0.8, y, y + 0.012, -114.6, -108.8, MT.matR);
      bx(x0 + T, x0 + T + 0.06, y, y + 1.5, C4.s + 0.3, S4.n - 0.3, MT.padY);
      bx(x1 - T - 0.06, x1 - T, y, y + 1.5, C4.s + 0.3, -113.9, MT.padY);
      bx(x1 - T - 0.06, x1 - T, y, y + 1.5, -109.9, S4.n - 0.3, MT.padY);
      win(3.4, 1.8, x1 + 0.01, y + 1.5, -111.9, 'e');
      win(3.4, 1.8, x1 - T - 0.01, y + 1.5, -111.9, 'w');
    }
    // 411 大音樂練習室 (closed, its door in the 練習室 lobby) and the 琴房 412～417 off that lobby
    wall(R411.x0, C4.s, R411.x0, S4.n, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    wall(R411.x0, C4.s, XR, C4.s, y, c, MT.tileW, 1, { tile: [0.6, 0.6] });
    doorRow(f, 'x', S4.n, 's', R411.x0, XR, [[-115.04, -112.49, '411 大音樂練習室', 'room']]);
    doorRow(f, 'z', R411.x0, 'w', S4.n, S4.r, [[-104.18, -101.73, '練習室', 'open']]);
    doorRow(f, 'x', S4.r, 'n', R411.x0, XR, [
      [-122.3, -121.1, '416 琴房', 'room'],
      [-120.6, -119.4, '417 小音樂練習室', 'room'],
      [-118.2, -117.0, '415 琴房', 'room'],
      [-116.5, -115.3, '414 琴房', 'room'],
      [-114.6, -113.4, '412 琴房', 'room'],
      [-113.3, -112.3, '413 琴房', 'room'],
    ]);
    wall(XR, S4.n, XR, S4.r, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    cbx(-121.9, -120.5, y, y + 1.25, S4.n + T, S4.n + T + 0.6, MT.piano); // a piano waiting in the lobby
    bx(-121.8, -120.6, y + 0.68, y + 0.74, S4.n + T + 0.6, S4.n + T + 0.9, MT.ivory);
  }

  // ---------------- 3F：往生物科技館的空橋（箱形外殼在 src/world/zones/ZoneG.js） ----------------
  {
    const y = F3,
      x0 = BRIDGE.x0 + 0.14,
      [b0, b1] = SAC_DOORS.wb,
      z0 = BRIDGE.z0 + 0.14,
      z1 = BRIDGE.z1 - 0.14,
      c = B + BRIDGE.y1 - 0.25;
    sf(x0, XL + 0.05, z0, z1, y);
    wl(x0, z0, XL, z0, y - 0.4, c + 0.4);
    wl(x0, z1, XL, z1, y - 0.4, c + 0.4);
    wl(x0, z0, x0, z1, y - 0.4, c + 0.4);
    for (const [za, zb] of [
      [z0, b0],
      [b1, z1],
    ])
      cbx(xWest(-102) - 0.1, XL, y, c, za, zb, MT.white);
    bx(xWest(-102) - 0.1, XL, y + 2.3, c, b0, b1, MT.band);
    for (let x = x0 + 0.7; x < XL - 1.2; x += 1.3) {
      win(0.8, 1.0, x + 0.4, y + 1.6, z0 + 0.01, 's');
      win(0.8, 1.0, x + 0.4, y + 1.6, z1 - 0.01, 'n');
    }
    bx(x0 + 0.5, XL - 0.6, c - 0.03, c, (z0 + z1) / 2 - 0.08, (z0 + z1) / 2 + 0.08, MT.light);
    door(x0 + 0.012, y, (z0 + z1) / 2, 'e', '生物科技館', 'steel');
    sign('生物科技館 門禁管制', x0 + 0.014, y + 2.55, (z0 + z1) / 2, 'e', '#7a1f1c', 1.9);
    sign('空橋 → 生物科技館', XL + T + 0.02, y + 2.6, (b0 + b1) / 2, 'e', '#2d3b4a', 1.8);
    I.actions.push({
      x: x0 + 0.7,
      z: (z0 + z1) / 2,
      r: 1.2,
      y: y - H(x0 + 0.7, (z0 + z1) / 2),
      label: () => '生物科技館的門要刷卡（門禁管制）',
      fn: (g) => g.hud?.toast('🔒 生物科技館這扇門要刷教職員證，進不去', 'bad', 1800),
    });
  }

  // =====================================================================
  // outer shell: collision along the outline, gaps at the doors (heights as src/world/MapBuilder.js b.wallDoors)
  // =====================================================================
  {
    const P = b.pts,
      cutsAll = [
        ...sacDoors(),
        // over the B1 rooms (the 用餐區 opens south to the stalls and the B1 entrance, east to 麥當勞): the wall starts at their ceiling
        { p: [PIT.west[0], zSouth(PIT.west[0])], q: [-144.4, -94.4], y0: -1e3, y1: LV.pit + 2.6 },
        { p: [-144.4, -94.4], q: [-136, -94.4], y0: -1e3, y1: LV.pit + 2.6 },
        { p: [-136, -94.4], q: [-136, -114], y0: -1e3, y1: LV.pit + 2.6 },
      ];
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        e = P[(i + 1) % P.length],
        dx = e[0] - a[0],
        dz = e[1] - a[1],
        l = Math.hypot(dx, dz);
      if (l < 0.05) continue;
      const tx = dx / l,
        tz = dz / l,
        ya = B - 1,
        yb = TOP + 1;
      const cuts = cutsAll
        .map((d) => {
          const off = (q) => Math.abs((q[0] - a[0]) * tz - (q[1] - a[1]) * tx),
            at = (q) => (q[0] - a[0]) * tx + (q[1] - a[1]) * tz;
          if (off(d.p) > 0.5 || off(d.q) > 0.5) return null;
          const t0 = Math.max(0, Math.min(at(d.p), at(d.q))),
            t1 = Math.min(l, Math.max(at(d.p), at(d.q)));
          return t1 - t0 > 0.02 ? { t0, t1, y0: d.y0, y1: d.y1 } : null;
        })
        .filter(Boolean);
      const ts = [...new Set([0, l, ...cuts.flatMap((q) => [q.t0, q.t1])])].sort((p, q) => p - q);
      for (let m = 0; m < ts.length - 1; m++) {
        const s = ts[m],
          en = ts[m + 1],
          tm = (s + en) / 2;
        if (en - s < 1e-3) continue;
        const W2 = (y0, y1) => {
          if (y1 > y0 + 1e-3)
            wl(a[0] + tx * s, a[1] + tz * s, a[0] + tx * en, a[1] + tz * en, y0, y1);
        };
        let yy = ya;
        for (const q of cuts.filter((q) => tm > q.t0 && tm < q.t1).sort((p, q2) => p.y0 - q2.y0)) {
          if (q.y0 > yy) W2(yy, Math.min(yb, q.y0));
          yy = Math.max(yy, q.y1);
        }
        W2(yy, yb);
      }
    }
    if (collision) {
      const Q = collision.sacPoly;
      if (Q) {
        // the solid footprint goes: its outline becomes points on one corner in a height band nothing reaches (as src/world/buildings/Lixing.js)
        const n = Q.pts.length,
          c0 = Q.pts[0];
        Q.pts = Q.pts.map(() => [c0[0], c0[1]]);
        Q.top = -Infinity;
        for (let i = 0; i < n; i++)
          collision.segs[Q.s0 + i] = [c0[0], c0[1], c0[0], c0[1], 1e8, 1e8 + 1];
      } else console.warn('[sac] 學活的碰撞輪廓找不到，室內進不去');
      // 執行期生成（機車、行人、空投）別生在學活裡：原本這裡整塊算擋住，結果一樣
      if (Array.isArray(collision.reserved)) collision.reserved.push(P.map((p) => [p[0], p[1]]));
    }
  }

  // ---------------- camera / location zones (heights count from the ground under each piece: the B1 pit is 3.3 m lower) ----------------
  {
    const zone = (x0, x1, z0, z1, ya = F1 - 0.2, yb = TOP) => {
      const xs = [x0, ...SPX.filter((v) => v > x0 && v < x1), x1],
        zs = [z0, ...SPZ.filter((v) => v > z0 && v < z1), z1];
      for (let i = 0; i < xs.length - 1; i++)
        for (let j = 0; j < zs.length - 1; j++) {
          const g = H((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2),
            fOf = (yy) => {
              let f = 0;
              for (let n = 0; n < 4; n++) if (yy + g > FL[n] - 1.2) f = n;
              return f;
            };
          I.zones.push({
            name: '學生活動中心',
            pts: k.rect(xs[i], xs[i + 1], zs[j], zs[j + 1]),
            y0: ya - g,
            y1: yb - g,
            ceil: (yy) => {
              const f = fOf(yy);
              return FL[f] + CH[f] - 0.3 - g;
            },
            floorOf: (yy) => fOf(yy) + 1,
          });
        }
    };
    zone(XC, XR, ZN - 0.7, ZC);
    zone(XL, XC, ZN - 0.7, ZC, F1 - 0.2, F3 - 0.35); // the 古箏社 corner: 1F / 2F (3F is the classroom's own zone)
    zone(XL, XMC, ZC, ZS);
    zone(XMC, XR, ZC, MZ);
    zone(XMC, XR, MZ, ZS, F2 - 0.4); // over 麥當勞
    zone(BRIDGE.x0, XL, BRIDGE.z0, BRIDGE.z1);
  }

  doorA.tex.needsUpdate = true;
  signA.tex.needsUpdate = true;
  // nothing draws into the two atlases again: to the GPU now, their canvases released (GpuMemLifecycle)
  uploadAndRelease(doorA.tex);
  uploadAndRelease(signA.tex);
  k.finish(scene);
  I.club = buildClub3F(I, scene, Kit, regMat, { F3, c: F3 + CH[2], sf });
  I.sac = {
    k,
    FL,
    DK,
    B,
    setFeet: (v) => {
      feet = v;
    },
  };
  return I.sac;
}
