// 學生活動中心室內（OSM w392023427）：一樓到四樓走得進去，二樓從南面門廊穿過中庭走上新中北路天橋，三樓走進往生科館的空橋。
// 外觀仍由 js/map.js 照輪廓畫、js/zone_g.js 補構件；麥當勞（js/interiors.js buildMcD）、古箏社教室（js/clubroom.js）、
// B1 學習區與學餐（js/sac_b1.js）照舊，這裡蓋它們以外的部分（輪廓 = sacTrimmedPts：東南角麥當勞那塊、西北角 js/clubroom.js 那塊不算）。
//
// 依據：
//  - 課外活動指導組《學生社團活動空間場地借用說明》（110 學年，有各場地的照片與房號）、活動中心管理細則、總務處場地收費表、學校新聞：
//    1F 培英廳（425 席、紅椅、深紅布幕、兩側奶油色圓柱與木格吸音板）、101 邱林信貞全球交誼廳、1 樓活動室、咖啡廳、郵局；
//    2F 前平台（大階梯上來直接走進去的半戶外紅磚中庭，南面沒有門；西端是貼滿海報的布告欄、上方圓窗，
//       中間一座往三樓的樓梯、南側一座往四樓的樓梯，兩側是三樓迴廊的白磁磚女兒牆；相片是面向西拍的，使用者確認）、
//       雅文多功能展演廳 A／B 廳、社團多功能交誼廳；
//    3F 課外活動指導組 313、學生會 308、活動教室 301／302／317／318、韻律教室 312、招待所、幾個紅磚平台（有鏡子）；
//    4F 大音樂練習室 411、琴房 412～414／418、小音樂練習室 417、武術練習室 419、社團辦公室、倉儲室、樂器室。
//    3F 西北角（主走廊西端）：古箏社教室（js/clubroom.js buildClub3F；使用者指正在 3 樓，哪一角是推測）。
//  - Google 地圖相片（培英廳 2023-09）、既有的街景與正射（屋頂北側的長弧頂採光罩、西面約三樓的空橋）。
// 找不到平面圖：每一層「有什麼」照上面的資料，「在該層的哪裡」是照建築外形排的（推測）：
// 東西向主走廊在採光罩下方，北排房間靠新中北路，中庭對著南面大門廊，培英廳在一樓西半挑高兩層。
// B1 的圓形旋轉梯（js/sac_b1.js）往上到一樓大廳、再到二樓中庭東牆邊為止（使用者指正）。
// 沒有來源的房間只寫社團辦公室、儲藏室、廁所。能進去的房間：培英廳、101 交誼廳、雅文 A 廳、301／302／317／318 活動教室、312 韻律教室、
// 303／401／403／405 社團辦公室、3F 古箏社教室、412 琴房、419 武術練習室；其他是關著的門。麥當勞上面的各樓層（弧形玻璃那塊）沒有做。
//
// 高度（世界高度）：一樓 = 入口前庭、二樓 = 南面門廊（大階梯頂）、三樓 = 往生科館空橋的地板、四樓再上 3.4 m。
// 新中北路天橋的橋面比二樓高約 1.1 m：二樓北面進門後是橋面高度的平台，往下走 7 階到二樓（不改天橋）。
// 碰撞：js/zone_g.js 換過的實心輪廓在這裡拿掉，換成外牆線（門口留缺口）和室內牆，全部走 Interiors.addWall。
// 座標：這個檔直接用世界座標（Kit 原點 0,0、不旋轉），y 是世界高度。
import * as THREE from 'three';
import { H, Hgrid, surfaceAt } from './terrain.js';
import { CLUB_DOOR, buildClub3F } from './clubroom.js';
import { G_IDS, FORE, STAIR2F, PIT, BRIDGE, SAC_DOORS } from './zone_g.js';

// ---------------- plan (world metres) ----------------
const XL = -194.85, XCL = -180.85, XMC = -136.15, XR = -112.15;   // inner faces: west wall, 古箏社 east wall, 麥當勞 west wall, east wall
const ZS = -94.65, ZN = -128.2, CN = -117.4, CS = -114.3;         // south wall, north lining, the main corridor's two walls
const AX0 = -166.1, AX1 = -146;                                   // 中庭（2F 前平台）x range
const V = { x0: -162.6, x1: -149.4, z0: -111.5, z1: -97.5 };      // the void over it on 3F / 4F
const ST = { x0: -169.8, x1: -166.1, z0: CS, z1: -106.3 };        // main stairs; the lift is behind them
const EL = { z0: -97.05, z1: ZS };                                // the lift: south end of the 中庭's west wall
const STE = { x0: -116, x1: XR, z0: -125.4, z1: CN };             // east stairs
const BH = { x0: -164.8, x1: -161.6 };                            // 2F hall to the footbridge
const NH = { x0: -149.6, x1: -146.4 };                            // 1F hall to the north door
const WC = -192;                                                  // 3F / 4F west corridor: XL..WC
const WCZ = -99.5;
const CF = { x0: -156.2, z0: -105.7, z1: -103.3 };                 // 中庭 centre flight 2F -> 3F (up to the east gallery)
const SF = { x1: -155.8, x2: -153.6, z0: -100.3, z1: -98.2 };     // south flight 3F -> 4F and its landing
const HALL = { x0: XL, x1: -170, z0: CS, z1: ZS, stage: -188.5, row0: -185, pitch: 0.95, rows: 15, step: 0.085 };
const WELL = [-147.9, -144.1, -110.9, -107.1];                    // the B1 spiral stair's well (js/sac_b1.js), x0 x1 z0 z1
// the outline's skewed walls
const zSouth = (x) => x > -144.4 ? -94.4 : -94.4 - 0.1 * (-144.4 - x) / 50.8;
const zNorth = (x) => x < -163.2 ? -128.55 + 0.15 * (x + 181) / 17.8 : -128.4 - 1.5 * (x + 163.2) / 51.2;
const xWest = (z) => -195.2 + 0.15 * (-94.5 - z) / 23.7;

// world heights that do not depend on anything built later
export function sacLevels() {
  const B = Hgrid(-170, -110), f1 = Hgrid(-153, -86) + FORE.rise, f2 = Hgrid(STAIR2F.x, STAIR2F.zTop - 1) + STAIR2F.rise, f3 = B + BRIDGE.y0 + 0.2;
  const s = surfaceAt(-163.0, -141.6, 60), deck = s > Hgrid(-163.0, -141.6) + 3 ? s : H(-163.0, -141.6) + 5.1;
  return { B, F: [f1, f2, f3, f3 + 3.4], deck, gN: Hgrid(-148, -131), pit: Hgrid(-125, -100) - PIT.depth };
}
// door openings: [{ p, q, y0, y1 }] in world coordinates (js/map.js b.wallDoors cuts them out of the walls)
function sacDoors() {
  const L = sacLevels(), D = SAC_DOORS, S = (a, b, y0, y1) => ({ p: [a, zSouth(a)], q: [b, zSouth(b)], y0, y1 }), N = (a, b, y0, y1) => ({ p: [a, zNorth(a)], q: [b, zNorth(b)], y0, y1 });
  return [
    S(...D.s1, L.F[0] - 0.05, L.F[0] + 2.7), S(...D.s2, L.F[1] - 0.02, L.F[1] + 2.5),
    N(...D.n1, L.gN - 0.2, L.gN + 2.6), N(...D.nb, L.deck - 0.05, L.deck + 2.05),
    { p: [CLUB_DOOR[0], -118.2], q: [CLUB_DOOR[1], -118.2], y0: L.F[2] - 0.02, y1: L.F[2] + 2.4 }, // 古箏社教室 (js/clubroom.js)
    { p: [xWest(D.wb[0]), D.wb[0]], q: [xWest(D.wb[1]), D.wb[1]], y0: L.F[2] - 0.02, y1: L.F[2] + 2.3 },
  ];
}
export function sacLook(b) { if (b.id === G_IDS.sac) b.wallDoors = sacDoors(); }

function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';

export function buildSac(I, scene, data, collision, Kit, regMat) {
  const b = data?.buildings?.find(v => v.id === G_IDS.sac);
  if (!b) return null;
  const k = new Kit(I, 0, 0, 0); k.base = 0; k.group.position.y = 0;
  const LV = sacLevels(), B = LV.B, FL = LV.F, DK = LV.deck, TOP = (Number.isFinite(b.base) ? b.base : B) + (b.h || 13.8);
  const [F1, F2, F3, F4] = FL, SL = 0.25, CT = Math.min(F4 + 3.0, TOP - 0.25);
  const CH = [F2 - F1 - 0.3, F3 - F2 - 0.3, F4 - F3 - 0.3, CT - F4];

  // ---------------- materials ----------------
  const std = (o, lift = 0) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o }); if (lift) { m.emissive.set(o.color || '#ffffff'); if (o.map) m.emissiveMap = o.map; m.emissiveIntensity = lift; } return m; };
  const rep = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  let seed = 23; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; // own generator: nothing shared is drawn here
  // 紅磚平台：紅褐色方磚、深灰色分隔帶（場地借用說明的照片）
  const redTile = rep(canvasTex(256, 256, (g) => { for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.fillStyle = `hsl(${12 + rnd() * 6},${52 + rnd() * 12}%,${40 + rnd() * 9}%)`; g.fillRect(x * 32, y * 32, 32, 32); } g.fillStyle = 'rgba(70,50,44,.55)'; for (let i = 0; i < 8; i++) { g.fillRect(i * 32, 0, 1.5, 256); g.fillRect(0, i * 32, 256, 1.5); } g.fillStyle = '#5b5a5c'; g.fillRect(0, 0, 256, 9); g.fillRect(0, 0, 9, 256); }));
  const terrazzo = rep(canvasTex(256, 256, (g) => { g.fillStyle = '#c4c1ba'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1200; i++) { const v = 150 + rnd() * 75 | 0; g.fillStyle = `rgb(${v},${v - 3},${v - 9})`; g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 2, 2 + rnd() * 2); } g.fillStyle = 'rgba(80,78,74,.35)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256); }));
  const vinyl = rep(canvasTex(256, 256, (g) => { for (let y = 0; y < 256; y += 32) { const v = rnd() * 14; g.fillStyle = `rgb(${150 + v | 0},${128 + v | 0},${104 + v | 0})`; g.fillRect(0, y, 256, 32); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,52,36,${0.04 + rnd() * 0.08})`; g.fillRect(rnd() * 256, y + rnd() * 32, 30 + rnd() * 60, 1); } g.fillStyle = 'rgba(60,44,30,.3)'; g.fillRect(0, y, 256, 1); g.fillRect((y * 5) % 256, y, 1, 32); } }));
  const tileW = rep(canvasTex(64, 64, (g) => { g.fillStyle = '#eeede8'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c6c7c3'; for (let i = 0; i < 64; i += 8) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); } }));
  const lattice = rep(canvasTex(128, 128, (g) => { g.fillStyle = '#3a1d14'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#9c5a34'; for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 5, 128); g.fillRect(0, i * 32, 128, 5); } }));
  const curtain = rep(canvasTex(128, 64, (g) => { for (let x = 0; x < 128; x++) { const v = 0.55 + 0.45 * Math.sin(x / 128 * Math.PI * 16); g.fillStyle = `rgb(${110 + 60 * v | 0},${14 + 10 * v | 0},${20 + 12 * v | 0})`; g.fillRect(x, 0, 1, 64); } }));
  const mat = (n, m) => regMat('sac_' + n, m);
  const winT = canvasTex(256, 192, (g) => { g.fillStyle = '#3d3029'; g.fillRect(0, 0, 256, 192); const sky = g.createLinearGradient(0, 0, 0, 192); sky.addColorStop(0, '#bfe0f5'); sky.addColorStop(1, '#e6f1ea'); g.fillStyle = sky; g.fillRect(8, 8, 240, 176); g.fillStyle = '#3d3029'; for (const x of [8, 128, 248]) g.fillRect(x - 4, 8, 8, 176); g.fillRect(8, 66, 240, 6); });
  const posters = canvasTex(1024, 256, (g) => { g.fillStyle = '#3f6470'; g.fillRect(0, 0, 1024, 256); for (let i = 0; i < 26; i++) { const x = 20 + (i % 13) * 76 + rnd() * 8, y = 22 + Math.floor(i / 13) * 112 + rnd() * 10; g.fillStyle = `hsl(${rnd() * 360 | 0},${40 + rnd() * 45 | 0}%,${45 + rnd() * 35 | 0}%)`; g.fillRect(x, y, 62, 88); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x + 6, y + 8, 50, 9); g.fillRect(x + 6, y + 60, 36, 5); g.fillRect(x + 6, y + 70, 44, 5); } });
  const MT = {
    red: mat('red', std({ map: redTile, roughness: 0.7 }, 0.2)), floor: mat('floor', std({ map: terrazzo, roughness: 0.55 }, 0.2)), vinyl: mat('vinyl', std({ map: vinyl, roughness: 0.55 }, 0.2)),
    ceil: mat('ceil', std({ color: '#f1f0ea' }, 0.42)), white: mat('white', std({ color: '#efede6' }, 0.3)), tileW: mat('tileW', std({ map: tileW, roughness: 0.4 }, 0.3)),
    band: mat('band', std({ color: '#dcd9d0' }, 0.3)), brown: mat('brown', std({ color: '#3d3029', roughness: 0.6 }, 0.1)), column: mat('column', std({ color: '#e8dcc2', roughness: 0.8 }, 0.25)),
    stair: mat('stair', std({ color: '#a9a6a0', roughness: 0.7 }, 0.2)), rail: mat('rail', std({ color: '#b9bdc1', metalness: 0.7, roughness: 0.3 }, 0.05)),
    light: mat('light', new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6e2', emissiveIntensity: 1.1 })),
    sky: mat('sky', new THREE.MeshStandardMaterial({ color: '#e8f3fa', emissive: '#dcecf7', emissiveIntensity: 0.95 })),
    window: mat('window', new THREE.MeshStandardMaterial({ map: winT, emissive: '#ffffff', emissiveMap: winT, emissiveIntensity: 0.75, roughness: 0.3 })),
    posters: mat('posters', std({ map: posters }, 0.4)), mirror: mat('mirror', std({ color: '#cfe0e6', metalness: 0.9, roughness: 0.08 })),
    wood: mat('wood', std({ color: '#b08d62', roughness: 0.6 }, 0.2)), darkwood: mat('darkwood', std({ color: '#5a3320', roughness: 0.6 }, 0.14)), lattice: mat('lattice', std({ map: lattice, roughness: 0.7 }, 0.2)),
    seat: mat('seat', std({ color: '#c8281e', roughness: 0.7 }, 0.2)), carpet: mat('carpet', std({ color: '#8f2a25', roughness: 0.95 }, 0.14)), curtain: mat('curtain', std({ map: curtain, roughness: 0.9 }, 0.25)),
    stage: mat('stage', std({ color: '#c59a62', roughness: 0.45 }, 0.22)), screen: mat('screen', new THREE.MeshStandardMaterial({ color: '#f4f6f8', emissive: '#e9eef4', emissiveIntensity: 0.7 })),
    steel: mat('steel', std({ color: '#b4b8bc', metalness: 0.7, roughness: 0.3 }, 0.08)), black: mat('black', std({ color: '#1d1d1f', roughness: 0.6 })), dark: mat('dark', std({ color: '#2f3033', roughness: 0.6 }, 0.05)),
    tableW: mat('tableW', std({ color: '#f1efe9', roughness: 0.4 }, 0.25)), tableWood: mat('tableWood', std({ color: '#a98a68', roughness: 0.5 }, 0.2)),
    cY: mat('cY', std({ color: '#f0c419', roughness: 0.6 }, 0.2)), cO: mat('cO', std({ color: '#f07a1c', roughness: 0.6 }, 0.2)), cR: mat('cR', std({ color: '#e0393a', roughness: 0.6 }, 0.2)), cW: mat('cW', std({ color: '#f2f2ee', roughness: 0.6 }, 0.25)),
    sofa: mat('sofa', std({ color: '#3f6f8f', roughness: 0.9 }, 0.15)), piano: mat('piano', std({ color: '#141416', roughness: 0.25, metalness: 0.2 }, 0.03)), ivory: mat('ivory', std({ color: '#f6f3ea', roughness: 0.4 }, 0.3)),
    matG: mat('matG', std({ color: '#8f9a78', roughness: 0.9 }, 0.15)), matR: mat('matR', std({ color: '#c92f2b', roughness: 0.9 }, 0.15)), padY: mat('padY', std({ color: '#e2c21f', roughness: 0.9 }, 0.2)),
    slat: mat('slat', std({ color: '#8a6238', roughness: 0.7 }, 0.2)), plant: mat('plant', std({ color: '#3f8a3c', roughness: 0.9 })), glass: mat('glassd', std({ color: '#7fa3b4', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.45 })),
  };

  // ---------------- helpers ----------------
  const nc = { col: false }, T = 0.12;
  const bx = (x0, x1, y0, y1, z0, z1, m, o) => k.box(Math.min(x0, x1), Math.max(x0, x1), y0, y1, Math.min(z0, z1), Math.max(z0, z1), m, { ...nc, ...o });
  // collision wall line with world heights; split where it crosses the edge of the B1 pits so that each piece counts from its own ground
  const SPX = [PIT.west[0], PIT.west[2]], SPZ = [PIT.west[1], PIT.west[3]];
  const wl = (ax, az, cx, cz, y0, y1) => {
    const ts = [0, 1];
    for (const X of SPX) if ((ax - X) * (cx - X) < 0) ts.push((X - ax) / (cx - ax));
    for (const Z of SPZ) if ((az - Z) * (cz - Z) < 0) ts.push((Z - az) / (cz - az));
    ts.sort((p, q) => p - q);
    for (let i = 0; i < ts.length - 1; i++) {
      if (ts[i + 1] - ts[i] < 1e-4) continue;
      const px = ax + (cx - ax) * ts[i], pz = az + (cz - az) * ts[i], qx = ax + (cx - ax) * ts[i + 1], qz = az + (cz - az) * ts[i + 1], g = H((px + qx) / 2, (pz + qz) / 2);
      I.addWall(px, pz, qx, qz, y0 - g, y1 - g);
    }
  };
  const wlRect = (x0, x1, z0, z1, y0, y1) => { wl(x0, z0, x1, z0, y0, y1); wl(x1, z0, x1, z1, y0, y1); wl(x1, z1, x0, z1, y0, y1); wl(x0, z1, x0, z0, y0, y1); };
  const cbx = (x0, x1, y0, y1, z0, z1, m, o) => { bx(x0, x1, y0, y1, z0, z1, m, o); wlRect(x0, x1, z0, z1, y0, y1); };
  // walkable surface: y is a world height or (x, z) => world height. Interiors wants heights above what the player's height
  // counts from, and that is not always the terrain here: the forecourt deck over the B1 stalls reaches about a metre in
  // under the south wall, the 2F porch deck lies over the 1F door. So the base is surfaceAt() at the player's feet, exactly
  // what js/player.js uses (only the player asks Interiors.groundAt).
  let feet = -1e9; I.updaters.push((dt, g) => { feet = g.player?.pos?.y ?? -1e9; });
  const sf = (x0, x1, z0, z1, y) => I.addSurface(k.rect(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)), typeof y === 'function' ? (x, z) => y(x, z) - surfaceAt(x, z, feet) : (x, z) => y - surfaceAt(x, z, feet));
  const clamp01 = (t) => t < 0 ? 0 : t > 1 ? 1 : t;
  const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }, NRM = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
  // wall on an axis-aligned line, body on side s (-1 / +1 along the normal axis, 0 centred), with collision
  const wall = (x0, z0, x1, z1, y0, y1, m, s = 0, o) => {
    if (Math.abs(x1 - x0) < 1e-6) { const a = x0 + (s < 0 ? -T : s > 0 ? 0 : -T / 2); bx(a, a + T, y0, y1, z0, z1, m, o); }
    else { const a = z0 + (s < 0 ? -T : s > 0 ? 0 : -T / 2); bx(x0, x1, y0, y1, a, a + T, m, o); }
    wl(x0, z0, x1, z1, y0, y1);
  };
  const win = (w, h, x, y, z, face) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ROT[face]); g.translate(x, y, z); k._part(MT.window, g); };
  const quad = (m, w, h, x, y, z, face) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ROT[face]); g.translate(x, y, z); k._part(m, g); };

  // ---------------- doors and signs: two texture atlases, one mesh each ----------------
  const atlas = (cw, chh, cols, rows, name) => {
    const cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = chh * rows;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = mat(name, std({ map: tex, roughness: 0.6, side: THREE.DoubleSide }, 0.35)), cells = new Map(); let n = 0;
    return {
      g: cv.getContext('2d'), tex,
      add(key, draw, w, h, x, y, z, face) {
        if (!cells.has(key)) { const i = n++; if (i >= cols * rows) console.warn('[sac] 圖集放不下', name); this.g.save(); this.g.translate((i % cols) * cw, Math.floor(i / cols) * chh); draw(this.g, cw, chh); this.g.restore(); cells.set(key, i); }
        const i = cells.get(key), geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv, u0 = (i % cols) / cols, v1 = 1 - Math.floor(i / cols) / rows;
        for (let j = 0; j < 4; j++) uv.setXY(j, u0 + uv.getX(j) / cols, v1 - 1 / rows + uv.getY(j) / rows);
        geo.rotateY(ROT[face]); geo.translate(x, y, z); k._part(m, geo);
      },
    };
  };
  const doorA = atlas(128, 256, 16, 8, 'doors'), signA = atlas(512, 128, 4, 16, 'signs');
  const LEAF = { room: '#8d6f52', svc: '#d6d3cb', office: '#6d8894', steel: '#a9adb1' };
  // a closed door 1.0 x 2.3 on a wall face: dark frame, leaf, a plate with the room's name over it
  const door = (x, y, z, face, label, kind = 'room') => doorA.add(label + kind, (g, w, h) => {
    g.fillStyle = '#3d3029'; g.fillRect(0, 0, w, h); g.fillStyle = LEAF[kind]; g.fillRect(7, 40, w - 14, h - 40);
    if (kind === 'office') { g.fillStyle = '#b9d3dc'; g.fillRect(16, 52, w - 32, 96); }
    if (kind === 'steel') { g.fillStyle = '#6f7478'; g.fillRect(w / 2 - 1, 40, 2, h - 40); }
    else { g.fillStyle = '#d7d9d6'; g.fillRect(w - 26, 150, 12, 5); }
    g.fillStyle = '#f4f2ec'; g.fillRect(5, 4, w - 10, 32);
    const parts = label.split(' '), lines = parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [label];
    g.fillStyle = '#2c2f33'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => { const px = Math.min(lines.length > 1 ? 15 : 22, (w - 14) / Math.max(1, [...t].length)); g.font = `900 ${px}px ${FONT}`; g.fillText(t, w / 2, lines.length > 1 ? 12 + i * 16 : 21); });
  }, 1.0, 2.3, x, y + 1.15, z, face);
  const sign = (text, x, y, z, face, bg = '#2d3b4a', w = 1.6) => signA.add(text + bg, (g, cw, chh) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, chh); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.min(76, (cw - 36) / [...text].length)}px ${FONT}`; g.fillText(text, cw / 2, chh / 2 + 3);
  }, w, w / 4, x, y, z, face);

  // a wall with doors along a line: axis 'x' (the line z = w) or 'z' (the line x = w); `face` = the way it looks.
  // cells: [u0, u1, label, kind]; kind: room / svc / office / steel (a closed door in the middle), solid, open (a gap with a header),
  // gap (a 1.1 m doorway in the middle with the name over it: the room behind is built)
  const front = (f, axis, w, face, cells, o = {}) => {
    const y = FL[f], c = y + CH[f], n = NRM[face][axis === 'x' ? 1 : 0], m = o.mat || MT.tileW, head = o.head ?? 2.3;
    const B2 = (u0, u1, ya, yb, mm) => { const d0 = n > 0 ? -T : 0; return axis === 'x' ? bx(u0, u1, ya, yb, w + d0, w + d0 + T, mm, { tile: [0.6, 0.6] }) : bx(w + d0, w + d0 + T, ya, yb, u0, u1, mm, { tile: [0.6, 0.6] }); };
    const WL = (u0, u1, ya, yb) => axis === 'x' ? wl(u0, w, u1, w, ya, yb) : wl(w, u0, w, u1, ya, yb);
    const at = (u, d) => axis === 'x' ? [u, w + n * d] : [w + n * d, u];
    const list = [];
    for (const cl of cells) {
      if (cl[3] !== 'gap') { list.push(cl); continue; }
      const cu = (cl[0] + cl[1]) / 2; list.push([cl[0], cu - 0.55, '', 'solid'], [cu - 0.55, cu + 0.55, '', 'open'], [cu + 0.55, cl[1], '', 'solid']);
      const p = at(cu, 0.014); sign(cl[2], p[0], y + 2.55, p[1], face, '#1f5f8b', Math.min(2.4, 0.3 + 0.2 * [...cl[2]].length));
    }
    let run = null;
    const flush = () => { if (!run) return; B2(run[0], run[1], y, c, m); WL(run[0], run[1], y, c); run = null; };
    for (const [u0, u1, label, kind] of list) {
      if (kind === 'open') { flush(); if (o.header !== false) { B2(u0, u1, y + head, c, MT.band); WL(u0, u1, y + head, c); } continue; }
      if (!run) run = [u0, u1]; else run[1] = u1;
      if (kind === 'solid') continue;
      const p = at((u0 + u1) / 2, 0.012); door(p[0], y, p[1], face, label, kind);
    }
    flush();
  };

  // ---------------- floors ----------------
  const lights = (x0, x1, z0, z1, c, step = 4.2) => { const alongX = x1 - x0 > z1 - z0; if (alongX) for (let x = x0 + step / 2; x < x1; x += step) bx(x - 0.6, x + 0.6, c - 0.05, c - 0.02, (z0 + z1) / 2 - 0.09, (z0 + z1) / 2 + 0.09, MT.light); else for (let z = z0 + step / 2; z < z1; z += step) bx((x0 + x1) / 2 - 0.09, (x0 + x1) / 2 + 0.09, c - 0.05, c - 0.02, z - 0.6, z + 0.6, MT.light); };
  // floor slab + walkable surface + ceiling over a rectangle
  const room = (f, x0, x1, z0, z1, o = {}) => {
    const y = FL[f], c = o.c ?? y + CH[f];
    bx(x0, x1, y - SL, y, z0, z1, o.floor || MT.floor, { tile: [2.4, 2.4] }); if (o.surf !== false) sf(x0, x1, z0, z1, y);
    if (o.ceil !== false) bx(x0, x1, c - 0.03, c + 0.05, z0, z1, o.ceilM || MT.ceil);
    if (o.lights !== false && o.ceil !== false) lights(x0, x1, z0, z1, c, o.step);
  };
  // the rectangles of a ring: `out` minus `hole` (both [x0, x1, z0, z1])
  const ring = ([x0, x1, z0, z1], [hx0, hx1, hz0, hz1]) => [[x0, hx0, z0, z1], [hx1, x1, z0, z1], [hx0, hx1, z0, hz0], [hx0, hx1, hz1, z1]];

  // ---------------- switchback stairs (as js/lixing.js) ----------------
  const stairs = ({ x0, x1, z0, z1, ax, dir, ld = 1.5, wallM = MT.white }) => {
    const a0 = ax === 'x' ? x0 : z0, a1 = ax === 'x' ? x1 : z1, c0 = ax === 'x' ? z0 : x0, c1 = ax === 'x' ? z1 : x1;
    const L = a1 - a0, cm = (c0 + c1) / 2;
    const A = (u) => dir > 0 ? a0 + u : a1 - u;
    const R = (u0, u1, v0, v1) => { const p = A(u0), q = A(u1), lo = Math.min(p, q), hi = Math.max(p, q); return ax === 'x' ? [lo, hi, v0, v1] : [v0, v1, lo, hi]; };
    const uOf = (lx, lz) => { const a = ax === 'x' ? lx : lz; return dir > 0 ? a - a0 : a1 - a; };
    const lanes = [[c0 + 0.1, cm - 0.07], [cm + 0.07, c1 - 0.1]];
    const ys = [FL[0]]; for (let f = 0; f < 3; f++) for (let i = 1; i <= 2; i++) ys.push(FL[f] + (FL[f + 1] - FL[f]) * i / 2);
    const slab = (r, y, m = MT.stair) => { bx(r[0], r[1], y - 0.18, y, r[2], r[3], m); sf(r[0], r[1], r[2], r[3], y); };
    slab(R(0, ld, c0 + 0.1, c1 - 0.1), ys[0], MT.floor);
    for (let i = 0; i < ys.length - 1; i++) {
      const up = i % 2 === 0, [v0, v1] = lanes[i % 2], ya = ys[i], yb = ys[i + 1], run = L - 2 * ld, n = Math.max(8, Math.round((yb - ya) / 0.16));
      const r = R(ld, L - ld, v0, v1);
      sf(r[0], r[1], r[2], r[3], (lx, lz) => { const t = clamp01((uOf(lx, lz) - ld) / run); return ya + (yb - ya) * (up ? t : 1 - t); });
      for (let j = 0; j < n; j++) {
        const t0 = j / n, t1 = (j + 1) / n, h = ya + (yb - ya) * (j + 1) / n;
        const s = up ? R(ld + run * t0, ld + run * t1, v0, v1) : R(L - ld - run * t1, L - ld - run * t0, v0, v1);
        bx(s[0], s[1], h - 0.3, h, s[2], s[3], MT.stair);
      }
      slab(up ? R(L - ld, L, c0 + 0.1, c1 - 0.1) : R(0, ld, c0 + 0.1, c1 - 0.1), yb, FL.includes(yb) ? MT.floor : MT.stair);
    }
    { const r = R(ld, L - ld, cm - 0.07, cm + 0.07); bx(r[0], r[1], FL[0], FL[3] + 1.1, r[2], r[3], wallM); if (ax === 'x') wl(r[0], cm, r[1], cm, FL[0], CT); else wl(cm, r[2], cm, r[3], FL[0], CT); }
    const bar = (u, [v0, v1], y0, y1, m) => { const r = R(u - 0.05, u + 0.05, v0, v1); bx(r[0], r[1], y0, y1, r[2], r[3], m); if (ax === 'x') wl(A(u), v0, A(u), v1, y0, y1); else wl(v0, A(u), v1, A(u), y0, y1); };
    bar(ld, lanes[1], FL[0], FL[0] + 2.4, wallM);
    bar(ld, lanes[0], FL[3], FL[3] + 1.1, MT.rail);
    { const r = R(L - 0.1, L, c0, c1); bx(r[0], r[1], FL[0], CT, r[2], r[3], wallM); if (ax === 'x') wl(A(L), c0, A(L), c1, FL[0], CT); else wl(c0, A(L), c1, A(L), FL[0], CT); }
    for (const [v, s] of [[c0, 1], [c1, -1]]) { const r = R(0.14, L, s > 0 ? v : v - 0.1, s > 0 ? v + 0.1 : v); bx(r[0], r[1], FL[0] - SL, CT, r[2], r[3], wallM); if (ax === 'x') wl(a0, v, a1, v, FL[0], CT); else wl(v, a0, v, a1, FL[0], CT); }
    for (let f = 0; f < 4; f++) {
      const y0 = FL[f] + 2.3, y1 = f < 3 ? FL[f + 1] : CT, r = R(-0.06, 0.06, c0, c1);
      bx(r[0], r[1], y0, y1, r[2], r[3], MT.band);
      if (ax === 'x') wl(A(0), c0, A(0), c1, y0, y1); else wl(c0, A(0), c1, A(0), y0, y1);
    }
    bx(...R(0, L, c0, c1).slice(0, 2), CT - 0.03, CT + 0.05, ...R(0, L, c0, c1).slice(2), MT.ceil);
    for (let f = 0; f < 4; f++) { const p = ax === 'x' ? [A(0.02), cm] : [cm, A(0.02)]; sign('樓梯 ↑↓', p[0] + (ax === 'x' ? -dir * 0.1 : 0), FL[f] + 2.55, p[1] + (ax === 'z' ? -dir * 0.1 : 0), ax === 'x' ? (dir > 0 ? 'w' : 'e') : (dir > 0 ? 'n' : 's'), '#2d3b4a', 1.2); }
  };

  // ---------------- furniture ----------------
  const chair = (x, z, m, face = 's') => { // `face`: the way the sitter looks
    const [nx, nz] = NRM[face];
    return (y) => { bx(x - 0.21, x + 0.21, y + 0.42, y + 0.46, z - 0.21, z + 0.21, m); bx(x - nx * 0.2 - (nx ? 0.02 : 0.21), x - nx * 0.2 + (nx ? 0.02 : 0.21), y + 0.46, y + 0.86, z - nz * 0.2 - (nz ? 0.02 : 0.21), z - nz * 0.2 + (nz ? 0.02 : 0.21), m); for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) bx(x + dx - 0.015, x + dx + 0.015, y, y + 0.42, z + dz - 0.015, z + dz + 0.015, MT.dark); };
  };
  const table = (y, x0, x1, z0, z1, m = MT.tableWood, h = 0.74) => { bx(x0, x1, y + h - 0.04, y + h, z0, z1, m); for (const x of [x0 + 0.06, x1 - 0.06]) for (const z of [z0 + 0.06, z1 - 0.06]) bx(x - 0.03, x + 0.03, y, y + h - 0.04, z - 0.03, z + 0.03, MT.black); wlRect(x0, x1, z0, z1, y, y + h); };
  const column = (x, z, y0, y1, r = 0.42) => { k.cyl(x, z, r, y0, y1, MT.column, { seg: 16 }); wlRect(x - r * 0.8, x + r * 0.8, z - r * 0.8, z + r * 0.8, y0, y1); };

  // =====================================================================
  // every floor: main corridor, north row, the walls round the 中庭
  // =====================================================================
  const NROW = [
    [[XCL, -174, '男廁', 'svc'], [-174, -168, '女廁', 'svc'], [-168, -160, '儲藏室', 'svc'], [-160, NH.x0, '1樓 活動室', 'room'], [NH.x0, NH.x1, '', 'open'],
      [NH.x1, -131, '101 邱林信貞全球交誼廳', 'gap'], [-131, -124, '機房', 'svc'], [-124, STE.x0, '郵局 請由戶外進出', 'svc'], [STE.x0, XR, '', 'open']],
    [[XCL, BH.x0, '雅文多功能展演廳 A 廳', 'gap'], [BH.x0, BH.x1, '', 'open'], [BH.x1, -150, '', 'solid'], [-150, -138, '雅文多功能展演廳 B廳', 'room'],
      [-138, -134.5, '男廁', 'svc'], [-134.5, -131, '女廁', 'svc'], [-131, STE.x0, '社團 多功能交誼廳', 'office'], [STE.x0, XR, '', 'open']],
    [[XCL, -174, '301 活動教室', 'gap'], [-174, -167.2, '302 活動教室', 'gap'], [-167.2, -162, '303 社團辦公室', 'gap'], [-162, -158, '308 學生會', 'office'], [-158, -150, '', 'solid'],
      [-150, -147.5, '男廁', 'svc'], [-147.5, -145, '女廁', 'svc'], [-145, -131, '312 韻律教室', 'gap'], [-131, -123.5, '317 活動教室', 'gap'], [-123.5, STE.x0, '318 活動教室', 'gap'], [STE.x0, XR, '', 'open']],
    [[XCL, -175, '401 社團辦公室', 'gap'], [-175, -169.5, '403 社團辦公室', 'gap'], [-169.5, -164, '405 社團辦公室', 'gap'], [-164, -161, '男廁', 'svc'], [-161, -158.5, '女廁', 'svc'],
      [-158.5, -146, '411 大音樂練習室', 'room'], [-146, -142.5, '412 琴房', 'gap'], [-142.5, -139, '413 琴房', 'room'], [-139, -135.5, '414 琴房', 'room'], [-135.5, -129, '417 小音樂練習室', 'room'],
      [-129, -125.5, '418 琴房', 'room'], [-125.5, STE.x0, '419 武術練習室', 'gap'], [STE.x0, XR, '', 'open']],
  ];
  const SROW = [ // the corridor's south wall, west of the 中庭 / east of it
    [[[XL, -188, '', 'solid'], [-188, -186.4, '', 'open'], [-186.4, ST.x0, '', 'solid'], [ST.x0, ST.x1, '', 'open']], [[XMC, XR, '', 'solid']]],
    [[[XCL, -176, '培英廳 燈光音控室', 'svc'], [-176, ST.x0, '', 'solid'], [ST.x0, ST.x1, '', 'open']], [[AX1, XR, '', 'solid']]],
    [[[WC, ST.x0, '313 課外活動指導組', 'office'], [ST.x0, ST.x1, '', 'open']], [[XMC, XR, '', 'solid']]],
    [[[WC, -181, '倉儲室', 'svc'], [-181, ST.x0, '樂器室', 'svc'], [ST.x0, ST.x1, '', 'open']], [[AX1, XR, '', 'solid']]],
  ];
  for (let f = 0; f < 4; f++) {
    const y = FL[f], c = y + CH[f], cw = f === 1 ? XCL : XL; // 2F: the corridor stops at 培英廳's upper half
    // --- main corridor (under the roof's long skylight)
    room(f, cw, XR, CN, CS, { floor: f ? MT.red : MT.floor });
    if (cw < XCL) front(f, 'x', CN, 's', f === 2 ? [[cw, CLUB_DOOR[0], '', 'solid'], [...CLUB_DOOR, '', 'open'], [CLUB_DOOR[1], XCL, '', 'solid']] : [[cw, XCL, '', 'solid']]); // 3F: 古箏社教室
    front(f, 'x', CN, 's', NROW[f]);
    front(f, 'x', CS, 'n', SROW[f][0]); front(f, 'x', CS, 'n', SROW[f][1]);
    wall(cw, CN, cw, CS, y, c, MT.tileW, f === 1 ? -1 : 1); wall(XR, CN, XR, CS, y, c, MT.tileW, -1);
    if (f !== 1) win(1.8, 1.3, cw + T + 0.01, y + 1.7, (CN + CS) / 2, 'e'); win(1.8, 1.3, XR - T - 0.01, y + 1.7, (CN + CS) / 2, 'w');
    quad(MT.posters, 5.2, 1.3, (XMC + XR) / 2, y + 1.5, CS - T - 0.01, 'n');
    // --- 中庭 / 大廳 south wall with its windows
    const ex = f === 0 || f === 2 ? XMC : AX1, gap = f === 0 ? SAC_DOORS.s1 : f === 1 ? SAC_DOORS.s2 : null;
    front(f, 'x', ZS, 'n', gap ? [[AX0, gap[0], '', 'solid'], [gap[0], gap[1], '', 'open'], [gap[1], ex, '', 'solid']] : [[AX0, ex, '', 'solid']], { head: f === 0 ? 2.7 : 2.5 });
    for (let x = AX0 + 2.2; x < ex - 1.2; x += 3.3) if (!gap || x < gap[0] - 1.4 || x > gap[1] + 1.4) win(2.2, 1.5, x, y + 1.75, ZS - T - 0.01, 'n');
    // --- the lift (behind the main stairs), 中庭 west wall
    door(AX0 + 0.012, y, (EL.z0 + EL.z1) / 2, 'e', '電梯', 'steel');
  }
  cbx(ST.x0, ST.x1, F1 - SL, CT, EL.z0, EL.z1, MT.tileW, { tile: [0.6, 0.6] });
  stairs({ ...ST, ax: 'z', dir: 1 });
  stairs({ ...STE, ax: 'z', dir: -1 });
  for (let f = 0; f < 4; f++) wall(STE.x0, ZN, STE.x1, ZN, FL[f], FL[f] + CH[f], MT.white, 1); // behind the east stairs
  // round columns of the 中庭, from the 1F lobby up to the skylight
  for (const x of [V.x0, V.x1]) for (const z of [V.z0, V.z1]) column(x, z, F1, CT);

  sign('古箏社 → 3F 走廊西端', ST.x1 + 0.02, F1 + 2.0, -111.2, 'e', '#5a1620', 1.9); sign('← 古箏社教室', -184.2, F3 + 2.55, CN + 0.02, 's', '#5a1620', 1.6);

  // ---------------- lift ----------------
  I.actions.push({
    poly: k.rect(AX0 + 0.05, AX0 + 1.6, EL.z0 + 0.2, EL.z1 - 0.2), y: 0, anyY: true,
    label: () => '按 <kbd>E</kbd> 搭電梯（1F → 2F → 3F → 4F）',
    fn: (g) => {
      const p = g.player, gh = H(p.pos.x, p.pos.z); let cur = 0; for (let f = 0; f < 4; f++) if (p.y > FL[f] - gh - 0.8) cur = f;
      const next = (cur + 1) % 4; const dy = FL[next] - gh + 0.05 - p.y; p.y += dy; p.pos.y += dy; p.vy = 0; // the feet go along (js/player.js compares the two)
      g.audio?.lift?.(); g.hud?.toast(`電梯 → ${next + 1}F`, 'good', 1200);
    },
  });

  // =====================================================================
  // 1F：入口大廳、北面穿堂、培英廳、101 全球交誼廳
  // =====================================================================
  {
    const f = 0, y = F1, c = y + CH[0], [wx0, wx1, wz0, wz1] = WELL, [d0, d1] = SAC_DOORS.s1;
    // lobby: everything but the well of the B1 spiral stair (its last step comes up on the well's north side)
    for (const [x0, x1, z0, z1] of ring([AX0, XMC, CS, ZS], WELL)) room(f, x0, x1, z0, z1);
    sf(d0, d1, ZS - 0.02, -94.4, y); bx(d0, d1, y - SL, y, ZS, -94.42, MT.floor);
    front(f, 'z', AX0, 'e', [[ST.z1, -101, '', 'solid'], [-101, -99, '培英廳 後門', 'room'], [-99, EL.z0, '', 'solid']]);
    front(f, 'z', XMC, 'w', [[CS, -108, '', 'solid'], [-108, -104, '原創咖啡', 'office'], [-104, ZS, '', 'solid']]);
    quad(MT.posters, 4.6, 1.25, XMC - T - 0.01, y + 1.5, -99.5, 'w');
    // rail round the well; the gap is where the stair's top landing meets the floor (north side)
    const gx0 = -147.1, gx1 = -144.9, rail = (x0, z0, x1, z1) => { const ax = Math.abs(x1 - x0) > 0.01; bx(ax ? x0 : x0 - 0.03, ax ? x1 : x0 + 0.03, y + 1.0, y + 1.06, ax ? z0 - 0.03 : z0, ax ? z0 + 0.03 : z1, MT.rail); bx(ax ? x0 : x0 - 0.02, ax ? x1 : x0 + 0.02, y + 0.5, y + 0.54, ax ? z0 - 0.02 : z0, ax ? z0 + 0.02 : z1, MT.rail); wl(x0, z0, x1, z1, y - 0.2, y + 1.1); };
    rail(wx0, wz0, gx0, wz0); rail(gx1, wz0, wx1, wz0); rail(wx1, wz0, wx1, wz1); rail(wx0, wz1, wx1, wz1); rail(wx0, wz0, wx0, wz1);
    for (const [x, z] of [[wx0, wz0], [gx0, wz0], [gx1, wz0], [wx1, wz0], [wx1, wz1], [wx0, wz1]]) bx(x - 0.03, x + 0.03, y, y + 1.06, z - 0.03, z + 0.03, MT.rail);
    bx(gx0, gx1, y - SL, y, wz0, wz0 + 0.32, MT.floor);
    sign('2F ↑ · B1 學習區 · 麥當勞 ↓', (gx0 + gx1) / 2, y + 2.5, wz0 - 0.4, 'n', '#2b5fae', 2.6); bx((gx0 + gx1) / 2 - 1.32, (gx0 + gx1) / 2 + 1.32, y + 2.15, c, wz0 - 0.36, wz0 - 0.3, MT.dark);
    // 服務台、公布欄、長椅
    cbx(-160.5, -157, y, y + 1.05, -101.2, -100.5, MT.wood); bx(-160.6, -156.9, y + 1.05, y + 1.1, -101.3, -100.4, MT.tableW);
    sign('服務台', -158.75, y + 2.5, -100.85, 's', '#1f5f8b', 1.1); bx(-159.4, -158.1, y + 2.1, c, -100.9, -100.82, MT.dark);
    for (const z of [-111, -104]) { cbx(-141.2, -139.4, y + 0.4, y + 0.46, z - 0.25, z + 0.25, MT.wood); for (const x of [-141.1, -139.5]) bx(x - 0.04, x + 0.04, y, y + 0.4, z - 0.22, z + 0.22, MT.dark); }
    // --- north hall to the door on 新中北路: the ground outside is lower, a ramp inside the door
    const zF = -126.6, zO = -128.9, gN = LV.gN + 0.02, [n0, n1] = SAC_DOORS.n1;
    room(f, NH.x0, NH.x1, zF, CN);
    bx(NH.x0, NH.x1, c - 0.03, c + 0.05, ZN - 0.6, zF, MT.ceil);
    sf(NH.x0, NH.x1, zO, zF, (x, z) => gN + (y - gN) * clamp01((z - zO) / (zF - zO)));
    for (let i = 0; i < 8; i++) { const za = zO + (zF - zO) * i / 8, zb = zO + (zF - zO) * (i + 1) / 8; bx(NH.x0, NH.x1, gN - 0.3, gN + (y - gN) * (i + 0.5) / 8, za, zb, MT.floor); }
    wall(NH.x0, ZN, NH.x0, CN, y - 0.6, c, MT.tileW, 1, { tile: [0.6, 0.6] }); wall(NH.x1, ZN, NH.x1, CN, y - 0.6, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    for (const [a, b2] of [[NH.x0, n0], [n1, NH.x1]]) cbx(a, b2, gN - 0.3, c, ZN - 0.6, ZN, MT.tileW, { tile: [0.6, 0.6] });
    bx(n0, n1, gN + 2.58, c, ZN - 0.6, ZN, MT.band);
    sign('新中北路 出口', (NH.x0 + NH.x1) / 2, y + 2.45, ZN + 0.02, 's', '#2d3b4a', 1.6);

    // --- 培英廳：一樓西半、挑高兩層。舞台在西端，觀眾席往東一排一排升高（15 排、每排 28 席，共 420 席）
    const A = HALL, hc = F3 - SL - 0.1, ax0 = A.x0, ax1 = A.x1;
    const rowY = (x) => y + A.step * Math.max(0, Math.min(A.rows - 1, Math.floor((x - A.row0) / A.pitch)));
    bx(ax0, A.row0, y - SL, y, A.z0, A.z1, MT.carpet);
    sf(ax0, ax1, A.z0, A.z1, (x) => rowY(x));
    for (let i = 0; i < A.rows; i++) { const x0 = A.row0 + i * A.pitch, x1 = i === A.rows - 1 ? ax1 : x0 + A.pitch; bx(x0, x1, y - SL, y + A.step * i, A.z0, A.z1, MT.carpet); }
    bx(ax0, ax1, hc, hc + 0.1, A.z0, A.z1, MT.ceil);
    for (let x = A.stage + 2; x < ax1 - 1; x += 3.6) { bx(x - 0.15, x + 0.15, hc - 0.32, hc, A.z0 + 0.6, A.z1 - 0.6, MT.white); bx(x + 0.15, x + 0.3, hc - 0.3, hc - 0.26, A.z0 + 1, A.z1 - 1, MT.light); }
    // walls: dark wood below, wood lattice panels between cream round columns above (相片 2023-09)
    for (const [z, s, face] of [[A.z0, 1, 's'], [A.z1, -1, 'n']]) {
      const za = s > 0 ? z + T : z - T - 0.1, parts = s > 0 ? [[ax0, -188], [-186.4, ax1]] : [[ax0, ax1]];
      for (const [p, q] of parts) bx(p, q, y, y + 2.4, za, za + 0.1, MT.darkwood);
      if (s > 0) bx(-188, -186.4, y + 2.2, y + 2.4, za, za + 0.1, MT.darkwood);
      bx(ax0, ax1, y + 2.4, hc, za, za + 0.1, MT.lattice, { tile: [1.2, 1.2] });
      wl(ax0, z, s > 0 ? -188 : ax1, z, y, hc); if (s > 0) { wl(-186.4, z, ax1, z, y, hc); wl(-188, z, -186.4, z, y + 2.2, hc); }
      for (let x = A.stage + 3.4; x < ax1; x += 4.6) column(x, z + s * 0.5, y, hc, 0.48);
    }
    wall(ax1, A.z0, ax1, A.z1, y, hc, MT.darkwood, -1); wall(ax0, A.z0, ax0, A.z1, y, hc, MT.black, 1);
    // stage 0.9 m up, steps at both ends, red curtains, projection screen
    const sy = y + 0.9;
    bx(ax0, A.stage, y, sy, A.z0 + 0.1, A.z1 - 0.1, MT.stage); sf(ax0, A.stage, A.z0, A.z1, sy);
    wl(A.stage, A.z0 + 1.5, A.stage, A.z1 - 1.5, y - 0.2, sy - 0.05);
    for (const [z0, z1] of [[A.z0 + 0.1, A.z0 + 1.5], [A.z1 - 1.5, A.z1 - 0.1]]) for (let i = 0; i < 2; i++) { const x0 = A.stage + (1 - i) * 0.32, h = y + 0.3 * (i + 1); bx(x0, x0 + 0.32, y, h, z0, z1, MT.stage); sf(x0, x0 + 0.32, z0, z1, h); }
    bx(ax0 + T, ax0 + T + 0.12, sy, hc - 0.2, A.z0 + 0.3, A.z1 - 0.3, MT.curtain, { tile: [2.5, 20] });
    for (const z of [A.z0 + 0.3, A.z1 - 2.6]) bx(A.stage - 0.6, A.stage - 0.45, sy, hc - 0.2, z, z + 2.3, MT.curtain, { tile: [2.5, 20] });
    bx(ax0 + T, A.stage - 0.3, hc - 1.2, hc - 0.2, A.z0 + 0.3, A.z1 - 0.3, MT.curtain, { tile: [2.5, 20] });
    bx(ax0 + 0.5, ax0 + 0.55, sy + 0.9, sy + 3.5, -107.5, -101.5, MT.screen);
    cbx(-192.2, -191.4, sy, sy + 1.1, -110.6, -109.9, MT.darkwood); // 講台
    // seats: two blocks with a centre aisle and an aisle along each wall
    const blocks = [[A.z0 + 1.2, -105.1], [-103.9, A.z1 - 1.2]];
    for (let i = 0; i < A.rows; i++) {
      const x0 = A.row0 + i * A.pitch + 0.3, h = y + A.step * i;
      for (const [z0, z1] of blocks) {
        const n = Math.round((z1 - z0) / 0.57), w = (z1 - z0) / n;
        for (let j = 0; j < n; j++) { const z = z0 + j * w; bx(x0, x0 + 0.48, h + 0.38, h + 0.5, z + 0.04, z + w - 0.04, MT.seat); bx(x0 + 0.42, x0 + 0.54, h + 0.38, h + 1.02, z + 0.04, z + w - 0.04, MT.seat); }
        bx(x0 + 0.1, x0 + 0.5, h, h + 0.38, z0, z1, MT.black); wlRect(x0, x0 + 0.54, z0, z1, h, h + 1.0);
      }
    }
    sign('培英廳', -187.2, y + 2.6, CS - T - 0.014, 'n', '#7a1f1c', 1.5);
    sign('培英廳', -187.2, y + 2.75, CS + 0.12, 's', '#7a1f1c', 1.3);

    // --- 101 邱林信貞全球交誼廳（約 47.5 坪）：木紋地板、沙發、圓桌
    const x0 = NH.x1, x1 = -131;
    room(f, x0, x1, ZN, CN, { floor: MT.vinyl });
    wall(x1, ZN, x1, CN, y, c, MT.white, -1); wall(x0, ZN, x0, CN, y, c, MT.white, 1); wall(x0, ZN, x1, ZN, y, c, MT.white, 1);
    for (let x = x0 + 2; x < x1 - 1; x += 3.4) win(2.4, 1.5, x, y + 1.7, ZN + T + 0.01, 's');
    for (const [tx, tz] of [[-142.5, -124.8], [-138, -124.8], [-133.8, -124.8], [-136, -120.6]]) {
      k.cyl(tx, tz, 0.55, y + 0.7, y + 0.74, MT.tableW, { seg: 18 }); k.cyl(tx, tz, 0.05, y, y + 0.7, MT.black, { seg: 8 }); wlRect(tx - 0.45, tx + 0.45, tz - 0.45, tz + 0.45, y, y + 0.74);
      [['s', 0, -0.85, MT.cR], ['n', 0, 0.85, MT.cW], ['e', -0.85, 0, MT.cY], ['w', 0.85, 0, MT.cO]].forEach(([fc, dx, dz, m]) => chair(tx + dx, tz + dz, m, fc)(y));
    }
    cbx(x0 + 0.3, x0 + 1.2, y, y + 0.42, -125.5, -120.5, MT.sofa); bx(x0 + 0.3, x0 + 0.55, y + 0.42, y + 0.85, -125.5, -120.5, MT.sofa);
    cbx(x0 + 1.9, x0 + 2.6, y, y + 0.4, -124.2, -121.8, MT.tableWood);
    sign('Global Lounge 全球交誼廳', (x0 + x1) / 2, y + 2.45, ZN + T + 0.02, 's', '#1f5f8b', 3.2);
  }

  // =====================================================================
  // 2F：前平台（中庭）、往天橋的通道、雅文多功能展演廳 A 廳
  // =====================================================================
  {
    const f = 1, y = F2, c = y + CH[1], [d0, d1] = SAC_DOORS.s2;
    // (the spiral stair from B1 / 1F comes up through the floor at the east wall and ends here: a hole, a rail, an alcove behind the wall line)
    const [wx0, wx1, wz0, wz1] = WELL, ez0 = -110.1, ez1 = -107.9;
    for (const [x0, x1, z0, z1] of ring([AX0, AX1, CS, ZS], [wx0, AX1, wz0, wz1])) room(f, x0, x1, z0, z1, { floor: MT.red, ceil: false });
    bx(wx0, wx0 + 0.3, y - SL, y, ez0, ez1, MT.red);
    for (const [x0, z0, x1, z1] of [[wx0, wz0, AX1, wz0], [wx0, wz1, AX1, wz1], [wx0, wz0, wx0, ez0], [wx0, ez1, wx0, wz1]]) {
      const ax = Math.abs(x1 - x0) > 0.01; wl(x0, z0, x1, z1, y - 0.2, y + 1.1);
      for (const h of [0.52, 1.03]) bx(ax ? x0 : x0 - 0.025, ax ? x1 : x0 + 0.025, y + h, y + h + 0.05, ax ? z0 - 0.025 : z0, ax ? z0 + 0.025 : z1, MT.rail);
    }
    for (const [x, z] of [[wx0, wz0], [wx0, ez0], [wx0, ez1], [wx0, wz1]]) bx(x - 0.03, x + 0.03, y, y + 1.08, z - 0.03, z + 0.03, MT.rail);
    wall(AX1, wz0, wx1, wz0, F1 + CH[0], c, MT.tileW, 1, { tile: [0.6, 0.6] }); wall(AX1, wz1, wx1, wz1, F1 + CH[0], c, MT.tileW, -1, { tile: [0.6, 0.6] }); wall(wx1, wz0, wx1, wz1, F1 + CH[0], c, MT.tileW, -1, { tile: [0.6, 0.6] });
    bx(wx0, wx1, c - 0.03, c + 0.05, wz0, wz1, MT.ceil);
    sign('樓梯 ↓ 1F · B1', wx0 + 0.4, y + 2.5, -109, 'w', '#2d3b4a', 1.6); bx(wx0 + 0.36, wx0 + 0.44, y + 2.2, c, -109.9, -108.1, MT.dark);
    for (const [x0, x1, z0, z1] of ring([AX0, AX1, CS, ZS], [V.x0, V.x1, V.z0, V.z1])) { bx(x0, x1, c - 0.03, c + 0.05, z0, z1, MT.ceil); lights(x0, x1, z0, z1, c); }
    sf(d0, d1, ZS - 0.02, -94.4, y); bx(d0, d1, y - SL, y, ZS, -94.42, MT.red, { tile: [2.4, 2.4] });
    front(f, 'z', AX0, 'e', [[ST.z1, EL.z0, '', 'solid']]);
    front(f, 'z', AX1, 'w', [[CS, WELL[2], '儲藏室', 'svc']]); front(f, 'z', AX1, 'w', [[WELL[3], -101, '', 'solid'], [-101, ZS, '倉儲室', 'svc']]);
    // 布告欄（北牆，貼滿海報）
    // （西端，面向東：一道獨立的牆，兩側留通道往後面走；正上方是三樓西牆的圓窗。使用者確認「2樓前平台」的相片是面向西拍的）
    cbx(-164.35, -164.15, y, y + 2.6, -109.2, -99.8, MT.dark); quad(MT.posters, 9.0, 1.6, -164.14, y + 1.5, -104.5, 'e');
    bx(-164.6, -163.7, y + 2.6, y + 2.78, -109.5, -99.5, MT.band);
    sign('2F 前平台', (d0 + d1) / 2, y + 2.6, ZS - T - 0.02, 'n', '#2d3b4a', 1.4);
    // --- hall to the footbridge: floor, 7 steps up to a landing level with the deck, the door
    const zT = -124.5, zB = -126.6, zW = -128.5, [n0, n1] = SAC_DOORS.nb, N = 7;
    room(f, BH.x0, BH.x1, zT, CN, { floor: MT.red });
    bx(BH.x0, BH.x1, c - 0.03, c + 0.05, zW, zT, MT.ceil);
    bx(BH.x0, BH.x1, y - SL, DK, zW + 0.1, zB, MT.red, { tile: [2.4, 2.4] }); sf(BH.x0, BH.x1, zW, zB, DK);
    sf(BH.x0, BH.x1, zB, zT, (x, z) => DK + (y - DK) * clamp01((z - zB) / (zT - zB)));
    for (let i = 0; i < N; i++) bx(BH.x0, BH.x1, y - SL, DK + (y - DK) * (i + 1) / N, zB + (zT - zB) * i / N, zB + (zT - zB) * (i + 1) / N, MT.stair);
    wall(BH.x0, ZN, BH.x0, CN, y, c, MT.tileW, 1, { tile: [0.6, 0.6] }); wall(BH.x1, ZN, BH.x1, CN, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    for (const x of [BH.x0 + T + 0.06, BH.x1 - T - 0.06]) { const g = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(zT - zB, DK - y)); g.rotateX(Math.atan2(DK - y, zT - zB)); g.translate(x, (DK + y) / 2 + 0.95, (zB + zT) / 2); k._part(MT.rail, g); }
    for (const [a, b2] of [[BH.x0, n0], [n1, BH.x1]]) cbx(a, b2, y, c, zW + 0.12, ZN, MT.tileW, { tile: [0.6, 0.6] });
    bx(n0, n1, DK + 2.05, c, zW + 0.12, ZN, MT.band);
    sign('天橋 → 力行宿舍', (BH.x0 + BH.x1) / 2, DK + 1.9 > c - 0.25 ? c - 0.25 : DK + 1.9, ZN + 0.03, 's', '#2d3b4a', 1.8);
    sign('往 天橋 · 力行宿舍', (BH.x0 + BH.x1) / 2, y + 2.6, CN + 0.2, 's', '#b9831a', 2.0); bx(BH.x0, BH.x1, y + 2.3, c, CN, CN + 0.14, MT.band);

    // --- 雅文多功能展演廳 A 廳：木紋地板、木格柵天花、黃椅白桌、深色窗框大窗
    const x0 = XCL, x1 = BH.x0;
    room(f, x0, x1, ZN, CN, { floor: MT.vinyl, lights: false });
    for (let z = ZN + 0.6; z < CN - 0.3; z += 0.5) bx(x0 + 0.2, x1 - 0.2, c - 0.2, c - 0.05, z, z + 0.07, MT.slat);
    for (let x = x0 + 2; x < x1 - 1; x += 3) for (const z of [-125.5, -120]) bx(x - 0.07, x + 0.07, c - 0.3, c - 0.2, z - 0.07, z + 0.07, MT.light);
    wall(x0, ZN, x0, CN, y, c, MT.white, 1); wall(x0, ZN, x1, ZN, y, c, MT.white, 1);
    for (let x = x0 + 1.8; x < x1 - 1; x += 2.8) win(2.2, 1.6, x, y + 1.7, ZN + T + 0.01, 's');
    for (const tx of [-178, -175, -169.5]) for (const tz of [-125.4, -121.2]) {
      table(y, tx - 0.45, tx + 0.45, tz - 0.45, tz + 0.45, MT.tableW);
      [['s', 0, -0.75], ['n', 0, 0.75], ['e', -0.75, 0], ['w', 0.75, 0]].forEach(([fc, dx, dz]) => chair(tx + dx, tz + dz, MT.cY, fc)(y));
    }
    bx(x0 + T, x0 + T + 0.03, y + 0.9, y + 2.2, -125, -121, MT.screen);
  }

  // =====================================================================
  // 3F / 4F：中庭四周的迴廊（白磁磚女兒牆＋不鏽鋼欄杆）、西側走廊
  // =====================================================================
  for (const f of [2, 3]) {
    const y = FL[f], c = y + CH[f], ex = f === 2 ? XMC : AX1;
    for (const [x0, x1, z0, z1] of ring([AX0, AX1, CS, ZS], [V.x0, V.x1, V.z0, V.z1])) room(f, x0, x1, z0, z1, { floor: MT.red });
    if (f === 2) room(f, AX1, XMC, CS, ZS, { floor: MT.red }); // 3樓右邊平台
    const edges = f === 2
      ? [[V.x0, V.z0, V.x1, V.z0], [V.x0, V.z1, V.x1, V.z1], [V.x0, V.z0, V.x0, SF.z0], [V.x0, SF.z1, V.x0, V.z1], [V.x1, V.z0, V.x1, CF.z0], [V.x1, CF.z1, V.x1, V.z1]]
      : [[V.x0, V.z0, V.x1, V.z0], [V.x0, V.z1, SF.x1, V.z1], [SF.x2, V.z1, V.x1, V.z1], [V.x0, V.z0, V.x0, V.z1], [V.x1, V.z0, V.x1, V.z1]];
    for (const [x0, z0, x1, z1] of edges) {
      const alongX = z0 === z1;
      if (alongX) { bx(x0, x1, y - SL, y + 0.95, z0 - 0.09, z0 + 0.09, MT.tileW, { tile: [0.6, 0.6] }); bx(x0, x1, y + 1.12, y + 1.17, z0 - 0.03, z0 + 0.03, MT.rail); }
      else { bx(x0 - 0.09, x0 + 0.09, y - SL, y + 0.95, z0, z1, MT.tileW, { tile: [0.6, 0.6] }); bx(x0 - 0.03, x0 + 0.03, y + 1.12, y + 1.17, z0, z1, MT.rail); }
      wl(x0, z0, x1, z1, y - 0.3, y + 1.3);
    }
    front(f, 'z', AX0, 'e', f === 2 ? [[ST.z1, -103, '', 'solid'], [-103, EL.z0, '招待所', 'office']] : [[ST.z1, EL.z0, '425 社團辦公室', 'room']]);
    if (f === 3) front(f, 'z', AX1, 'w', [[CS, -108, '431 社團辦公室', 'room'], [-108, -101, '433 社團辦公室', 'room'], [-101, ZS, '435 社團辦公室', 'room']]);
    else {
      // 3樓右邊平台：東牆整面鏡子（社團練舞用）
      wall(XMC, CS, XMC, ZS, y, c, MT.tileW, -1, { tile: [0.6, 0.6] }); bx(XMC - T - 0.03, XMC - T, y + 0.2, y + 2.2, -112.5, -96.5, MT.mirror);
      sign('3樓 活動平台', -141, y + 2.6, ZS - T - 0.02, 'n', '#2d3b4a', 1.6);
    }
    // --- west corridor (3F: to the bridge to 生物科技館)
    room(f, XL, WC, CS, WCZ, { floor: MT.red });
    wall(XL, WCZ, WC, WCZ, y, c, MT.tileW, -1, { tile: [0.6, 0.6] });
    front(f, 'z', WC, 'w', f === 2 ? [[CS, WCZ, '', 'solid']] : [[CS, -107, '421 社團辦公室', 'room'], [-107, WCZ, '423 社團辦公室', 'room']]);
    const [b0, b1] = SAC_DOORS.wb;
    front(f, 'z', XL, 'e', f === 2 ? [[CS, b0, '', 'solid'], [b0, b1, '', 'open'], [b1, WCZ, '', 'solid']] : [[CS, WCZ, '', 'solid']]);
    win(2.2, 1.4, XL + T + 0.01, y + 1.7, -110.5, 'e'); if (f === 3) win(2.2, 1.4, XL + T + 0.01, y + 1.7, -103.5, 'e');
  }
  // 圓窗（3F 北牆，2F 布告欄正上方）、中庭頂的採光罩
  { const g = new THREE.CircleGeometry(1.35, 36); g.rotateY(Math.PI / 2); g.translate(AX0 + 0.02, F3 + 1.55, -104.5); k._part(MT.window, g); const t = new THREE.TorusGeometry(1.4, 0.1, 8, 36); t.rotateY(Math.PI / 2); t.translate(AX0 + 0.04, F3 + 1.55, -104.5); k._part(MT.band, t); }
  // 中庭裡的兩座直跑樓梯（相片）：正中間 2F → 3F 東側迴廊（往東上）、南側 3F 西側迴廊 → 4F 南側迴廊（往東上，頂端一塊平台）
  {
    const flight = (x0, x1, z0, z1, ya, yb, lo) => {
      const n = Math.round((yb - ya) / 0.17), sl = Math.atan2(yb - ya, x1 - x0), len = Math.hypot(x1 - x0, yb - ya);
      sf(x0, x1, z0, z1, (x) => ya + (yb - ya) * clamp01((x - x0) / (x1 - x0)));
      for (let i = 0; i < n; i++) { const h = ya + (yb - ya) * (i + 1) / n; bx(x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n, h - 0.36, h, z0, z1, MT.stair); }
      for (const z of [z0, z1]) {
        wl(x0, z, x1, z, lo, yb + 1.1);
        for (const [dy, th, m] of [[0.95, 0.05, MT.rail], [0.5, 0.04, MT.rail], [-0.12, 0.3, MT.white]]) { const g = new THREE.BoxGeometry(len, th, 0.06); g.rotateZ(sl); g.translate((x0 + x1) / 2, (ya + yb) / 2 + dy, z); k._part(m, g); }
      }
    };
    flight(CF.x0, V.x1, CF.z0, CF.z1, F2, F3, F2 - 0.2); wl(V.x1, CF.z0, V.x1, CF.z1, F2 - 0.2, F3 - 0.4);
    flight(V.x0, SF.x1, SF.z0, SF.z1, F3, F4, F3 - 0.3);
    bx(SF.x1, SF.x2, F4 - SL, F4, SF.z0, V.z1, MT.red, { tile: [2.4, 2.4] }); sf(SF.x1, SF.x2, SF.z0, V.z1, F4);
    for (const [ax, az, cx, cz] of [[SF.x1, SF.z0, SF.x2, SF.z0], [SF.x2, SF.z0, SF.x2, V.z1], [SF.x1, SF.z1, SF.x1, V.z1]]) { wl(ax, az, cx, cz, F4 - 0.3, F4 + 1.3); bx(Math.min(ax, cx) - 0.03, Math.max(ax, cx) + 0.03, F4 + 1.0, F4 + 1.06, Math.min(az, cz) - 0.03, Math.max(az, cz) + 0.03, MT.rail); }
  }
  bx(V.x0 - 0.1, V.x1 + 0.1, CT - 0.03, CT + 0.05, V.z0 - 0.1, V.z1 + 0.1, MT.sky);
  for (let x = V.x0; x <= V.x1 + 0.01; x += (V.x1 - V.x0) / 6) bx(x - 0.05, x + 0.05, CT - 0.14, CT - 0.03, V.z0, V.z1, MT.white);

  // ---------------- 3F：往生物科技館的空橋（箱形外殼在 js/zone_g.js） ----------------
  {
    const y = F3, x0 = BRIDGE.x0 + 0.14, [b0, b1] = SAC_DOORS.wb, z0 = BRIDGE.z0 + 0.14, z1 = BRIDGE.z1 - 0.14, c = B + BRIDGE.y1 - 0.25;
    sf(x0, XL + 0.05, z0, z1, y);
    wl(x0, z0, XL, z0, y - 0.4, c + 0.4); wl(x0, z1, XL, z1, y - 0.4, c + 0.4); wl(x0, z0, x0, z1, y - 0.4, c + 0.4);
    for (const [za, zb] of [[z0, b0], [b1, z1]]) cbx(xWest(-102) - 0.1, XL, y, c, za, zb, MT.white);
    bx(xWest(-102) - 0.1, XL, y + 2.3, c, b0, b1, MT.band);
    for (let x = x0 + 0.7; x < XL - 1.2; x += 1.3) { win(0.8, 1.0, x + 0.4, y + 1.6, z0 + 0.01, 's'); win(0.8, 1.0, x + 0.4, y + 1.6, z1 - 0.01, 'n'); }
    bx(x0 + 0.5, XL - 0.6, c - 0.03, c, (z0 + z1) / 2 - 0.08, (z0 + z1) / 2 + 0.08, MT.light);
    door(x0 + 0.012, y, (z0 + z1) / 2, 'e', '生物科技館', 'steel');
    sign('生物科技館 門禁管制', x0 + 0.014, y + 2.55, (z0 + z1) / 2, 'e', '#7a1f1c', 1.9);
    sign('空橋 → 生物科技館', XL + T + 0.02, y + 2.6, (b0 + b1) / 2, 'e', '#2d3b4a', 1.8);
    I.actions.push({ x: x0 + 0.7, z: (z0 + z1) / 2, r: 1.2, y: y - H(x0 + 0.7, (z0 + z1) / 2), label: () => '生物科技館的門要刷卡（門禁管制）', fn: (g) => g.hud?.toast('🔒 生物科技館這扇門要刷教職員證，進不去', 'bad', 1800) });
  }

  // =====================================================================
  // 進得去的房間：301 活動教室、312 韻律教室（3F），412 琴房、419 武術練習室（4F）
  // =====================================================================
  const shell = (f, x0, x1, z1 = CN, o = {}) => { // floor, ceiling, side walls and the north wall with windows; the corridor wall is in NROW
    const y = FL[f], c = y + CH[f], zb = o.back ?? ZN;
    room(f, x0, x1, zb, z1, { floor: o.floor || MT.vinyl, ceilM: o.ceilM });
    wall(x0, zb, x0, z1, y, c, MT.white, 1); wall(x1, zb, x1, z1, y, c, MT.white, -1); wall(x0, zb, x1, zb, y, c, MT.white, 1);
    if (o.win !== false) for (let x = x0 + 1.6; x < x1 - 1.0; x += 2.8) win(2.0, 1.4, x, y + 1.7, zb + T + 0.01, 's');
    return [y, c];
  };
  // 301／302／317／318：木紋長桌圍成方框、橘紅白三色椅、白板（場地借用說明的照片，四間一樣）
  for (const [x0, x1] of [[XCL, -174], [-174, -167.2], [-131, -123.5], [-123.5, STE.x0]]) {
    const [y] = shell(2, x0, x1), cx = (x0 + x1) / 2, cols = [MT.cO, MT.cR, MT.cW];
    table(y, cx - 2.0, cx + 2.0, -125.9, -125.2); table(y, cx - 2.0, cx - 1.3, -125.2, -121.4); table(y, cx + 1.3, cx + 2.0, -125.2, -121.4); table(y, cx - 2.0, cx + 2.0, -121.4, -120.7);
    for (let i = 0; i < 5; i++) { chair(cx - 1.6 + i * 0.8, -126.4, cols[i % 3], 's')(y); chair(cx - 1.6 + i * 0.8, -120.2, cols[(i + 1) % 3], 'n')(y); }
    for (let i = 0; i < 5; i++) { chair(cx - 2.5, -124.9 + i * 0.8, cols[(i + 1) % 3], 'e')(y); chair(cx + 2.5, -124.9 + i * 0.8, cols[(i + 2) % 3], 'w')(y); }
    bx(x0 + T, x0 + T + 0.03, y + 0.95, y + 2.05, -120.6, -118.4, MT.screen);
  }
  // 社團辦公室：幾張桌子、椅子、靠牆的鐵櫃和布告欄（沒有照片，簡單擺）
  for (const [f, x0, x1] of [[2, -167.2, -162], [3, XCL, -175], [3, -175, -169.5], [3, -169.5, -164]]) {
    const [y] = shell(f, x0, x1), cx = (x0 + x1) / 2, cols = [MT.cO, MT.cR, MT.cW];
    for (const z of [-125.2, -122.2]) {
      table(y, cx - 1.0, cx + 1.0, z - 0.4, z + 0.4);
      for (const dx of [-0.5, 0.5]) { chair(cx + dx, z - 0.75, cols[(f + (dx > 0 ? 1 : 0)) % 3], 's')(y); chair(cx + dx, z + 0.75, MT.cW, 'n')(y); }
    }
    cbx(x1 - T - 0.45, x1 - T, y, y + 1.85, -127.6, -125.2, MT.steel); quad(MT.posters, 2.6, 0.9, x0 + T + 0.015, y + 1.6, -122.6, 'e');
  }
  { // 312：木地板、黑色格子梁天花、整面鏡子與把桿（禁止穿鞋）
    const [y, c] = shell(2, -145, -131, CN, { ceilM: MT.black });
    for (let x = -143; x < -131.5; x += 2.4) bx(x - 0.1, x + 0.1, c - 0.3, c - 0.03, ZN + 0.2, CN - 0.2, MT.white);
    for (let z = ZN + 2; z < CN - 1; z += 2.6) bx(-144.8, -131.2, c - 0.3, c - 0.03, z - 0.1, z + 0.1, MT.white);
    bx(-145 + T, -145 + T + 0.03, y + 0.15, y + 2.2, ZN + 0.6, CN - 0.6, MT.mirror);
    bx(-131 - T - 0.03, -131 - T, y + 0.15, y + 2.2, ZN + 0.6, CN - 0.6, MT.mirror);
    bx(-131 - T - 0.3, -131 - T - 0.25, y + 0.98, y + 1.03, ZN + 0.8, CN - 0.8, MT.wood);
    for (let z = ZN + 1; z < CN - 0.8; z += 2.4) bx(-131 - T - 0.3, -131 - T - 0.03, y + 0.98, y + 1.02, z - 0.02, z + 0.02, MT.steel);
    cbx(-139.5, -138.3, y, y + 0.45, CN - T - 0.5, CN - T - 0.1, MT.wood); // 鞋櫃
  }
  { // 412 琴房：直立鋼琴、琴椅（房間小，後面是樂器室）
    const [y] = shell(3, -146, -142.5, CN, { back: -122.4, win: false });
    cbx(-145.8, -144.3, y, y + 1.25, -122.4 + T, -122.4 + T + 0.6, MT.piano); bx(-145.7, -144.4, y + 0.68, y + 0.74, -121.7, -121.4, MT.ivory); bx(-145.8, -144.3, y + 0.6, y + 0.68, -121.75, -121.4, MT.piano);
    cbx(-145.45, -144.65, y + 0.44, y + 0.5, -120.9, -120.55, MT.black); for (const x of [-145.4, -144.7]) bx(x - 0.03, x + 0.03, y, y + 0.44, -120.85, -120.6, MT.black);
    win(1.6, 1.2, -143.2, y + 1.7, -122.4 + T + 0.01, 's');
  }
  { // 419：灰綠軟墊中間一塊紅色、黃色牆面防撞墊、半圓拱窗
    const [y] = shell(3, -125.5, STE.x0, CN, { floor: MT.matG, win: false });
    bx(-122.6, -119.2, y, y + 0.012, -124.6, -121.4, MT.matR);
    for (const [a, b2, z] of [[-125.5 + T, STE.x0 - T, ZN + T]]) bx(a, b2, y, y + 1.5, z, z + 0.06, MT.padY);
    bx(-125.5 + T, -125.5 + T + 0.06, y, y + 1.5, ZN + 0.3, CN - 0.3, MT.padY); bx(STE.x0 - T - 0.06, STE.x0 - T, y, y + 1.5, ZN + 0.3, CN - 0.3, MT.padY);
    const g = new THREE.CircleGeometry(1.5, 28, 0, Math.PI); g.translate(-120.7, y + 1.55, ZN + T + 0.07); k._part(MT.window, g);
    const t = new THREE.TorusGeometry(1.55, 0.09, 8, 28, Math.PI); t.translate(-120.7, y + 1.55, ZN + T + 0.08); k._part(MT.band, t);
  }

  // =====================================================================
  // outer shell: collision along the outline, gaps at the doors (heights as js/map.js b.wallDoors)
  // =====================================================================
  {
    const P = b.pts, cutsAll = [...sacDoors(),
      // over the B1 rooms (the 學習區 opens south to the stalls and the B1 entrance, east to 麥當勞): the wall starts at their ceiling
      { p: [PIT.west[0], zSouth(PIT.west[0])], q: [-144.4, -94.4], y0: -1e3, y1: LV.pit + 2.6 }, { p: [-144.4, -94.4], q: [-136, -94.4], y0: -1e3, y1: LV.pit + 2.6 }, { p: [-136, -94.4], q: [-136, -114], y0: -1e3, y1: LV.pit + 2.6 }];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], e = P[(i + 1) % P.length], dx = e[0] - a[0], dz = e[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
      const tx = dx / l, tz = dz / l, ya = B - 1, yb = TOP + 1;
      const cuts = cutsAll.map(d => {
        const off = q => Math.abs((q[0] - a[0]) * tz - (q[1] - a[1]) * tx), at = q => (q[0] - a[0]) * tx + (q[1] - a[1]) * tz;
        if (off(d.p) > 0.5 || off(d.q) > 0.5) return null;
        const t0 = Math.max(0, Math.min(at(d.p), at(d.q))), t1 = Math.min(l, Math.max(at(d.p), at(d.q)));
        return t1 - t0 > 0.02 ? { t0, t1, y0: d.y0, y1: d.y1 } : null;
      }).filter(Boolean);
      const ts = [...new Set([0, l, ...cuts.flatMap(q => [q.t0, q.t1])])].sort((p, q) => p - q);
      for (let m = 0; m < ts.length - 1; m++) {
        const s = ts[m], en = ts[m + 1], tm = (s + en) / 2; if (en - s < 1e-3) continue;
        const W2 = (y0, y1) => { if (y1 > y0 + 1e-3) wl(a[0] + tx * s, a[1] + tz * s, a[0] + tx * en, a[1] + tz * en, y0, y1); };
        let yy = ya;
        for (const q of cuts.filter(q => tm > q.t0 && tm < q.t1).sort((p, q2) => p.y0 - q2.y0)) { if (q.y0 > yy) W2(yy, Math.min(yb, q.y0)); yy = Math.max(yy, q.y1); }
        W2(yy, yb);
      }
    }
    if (collision) {
      const Q = collision.sacPoly;
      if (Q) {
        // the solid footprint goes: its outline becomes points on one corner in a height band nothing reaches (as js/lixing.js)
        const n = Q.pts.length, c0 = Q.pts[0];
        Q.pts = Q.pts.map(() => [c0[0], c0[1]]); Q.top = -Infinity;
        for (let i = 0; i < n; i++) collision.segs[Q.s0 + i] = [c0[0], c0[1], c0[0], c0[1], 1e8, 1e8 + 1];
      } else console.warn('[sac] 學活的碰撞輪廓找不到，室內進不去');
      // 執行期生成（機車、行人、空投）別生在學活裡：原本這裡整塊算擋住，結果一樣
      if (Array.isArray(collision.reserved)) collision.reserved.push(P.map(p => [p[0], p[1]]));
    }
  }

  // ---------------- camera / location zones (heights count from the ground under each piece: the B1 pit is 3.3 m lower) ----------------
  {
    const zone = (x0, x1, z0, z1) => {
      const xs = [x0, ...SPX.filter(v => v > x0 && v < x1), x1], zs = [z0, ...SPZ.filter(v => v > z0 && v < z1), z1];
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
        const g = H((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2), fOf = (yy) => { let f = 0; for (let n = 0; n < 4; n++) if (yy + g > FL[n] - 1.2) f = n; return f; };
        I.zones.push({ name: '學生活動中心', pts: k.rect(xs[i], xs[i + 1], zs[j], zs[j + 1]), y0: F1 - g - 0.2, y1: TOP - g, ceil: (yy) => { const f = fOf(yy); return FL[f] + CH[f] - 0.3 - g; }, floorOf: (yy) => fOf(yy) + 1 });
      }
    };
    zone(XCL, XR, ZN - 0.7, CN); zone(XL, XR, CN, CS); zone(XL, XMC, CS, ZS); zone(BRIDGE.x0, XL, BRIDGE.z0, BRIDGE.z1);
  }

  doorA.tex.needsUpdate = true; signA.tex.needsUpdate = true;
  k.finish(scene);
  I.club = buildClub3F(I, scene, Kit, regMat, { F3, c: F3 + CH[2], sf });
  I.sac = { k, FL, DK, B, setFeet: (v) => { feet = v; } };
  return I.sac;
}
