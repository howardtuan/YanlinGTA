// 力行宿舍室內（力行大樓 OSM w392023431）：照使用者給的「力行宿舍寢室分布圖」做成可以走進去的四層樓。
// 外觀仍由 js/map.js 照 OSM 輪廓畫（js/zone_g.js 換顏色、東端山牆），這裡做：
//  - 兩個天井（西棟、東棟）：b.holes 讓屋頂開洞、b.holeWalls = false 讓 map.js 不畫天井那圈牆（走廊是開放式，自己蓋）；
//  - 每層：北排寢室＋東西向主走廊、天井四周的迴廊（二樓以上有彩色色塊女兒牆）、中段南排寢室、兩翼南排寢室、
//    東西兩端凸出的曬衣場／浴廁／樓梯、中段北側樓梯、兩翼靠中段的樓梯（樓梯間朝前院，剪刀梯：兩條梯道方向相反，側面看是 X；
//    南端從南迴廊端頭的走道進去，北端各樓有一段走道接回主走廊）、東棟電梯；
//  - 一樓：中廊通到南面大門（門楣「力行大樓」），天井鋪面、涼亭、野餐桌；沿新中北路的一層樓門房（早餐屋、會客室、大門、傳達室、公佈欄）；
//  - 二樓：中廊南端的門開在二樓地板高度，出門是牆外的平台，沿著天橋方向往上走一段露天樓梯到新中北路天橋橋面
//    （天橋北端因此縮短：data.grade 的 cut0，js/map.js 照它少畫、少鋪橋面）；
//  - 寢室只有二樓 276～281 能進去（六人房：兩側各三組上床下桌、中間走道、門上氣窗、對外窗），其他寢室是關著的門。
// 依據：寢室分布圖（力行宿舍自治會）、Google 街景 2026-05（新中北路 291 號）、Google 地圖相片（天井 2023-01、寢室 2026-06）、
// YouTube「中原大學宿舍介紹_力行宿舍」（走廊藍牆、黃綠門與門上色帶、馬賽克洗手台、曬衣場、洗衣間）。
// 分布圖不是照比例畫的，這裡把它套進 OSM 輪廓：中段比圖上短，所以中段寢室比兩翼窄。
// 高度：每層 3.3 m。遊戲裡天橋橋面比二樓地板高約 2.6 m，這段高差由牆外的樓梯走（使用者指正：接天橋的樓梯在建築物外面）。
// 牆外樓梯的樣子：正射影像（NLSC 2024）看得到天橋頂棚在南牆前約 2 m 就停、中間是一小塊露天平台；直上、和天橋同寬是推測，
// 長度因為遊戲裡高差比實際大而拉長。
// 碰撞：把 map.js 加的整棟實心多邊形拿掉，換成外牆線（大門、天橋門留缺口）和室內牆，全部走 Interiors.addWall（高度以當地地面為準）。
// Local frame: origin at the north-west corner (-221.7, -183.8), x east along the north face, z south. y = metres above the building base.
import * as THREE from 'three';
import { H, surfaceAt } from './terrain.js';

export const LX_ID = 'w392023431';
const OX = -221.7, OZ = -183.8, ANG = Math.atan2(-1.2, 121.8), CA = Math.cos(ANG), SA = Math.sin(ANG);
const W = (x, z) => [OX + x * CA - z * SA, OZ + x * SA + z * CA];
const rectW = (x0, x1, z0, z1) => [W(x0, z0), W(x1, z0), W(x1, z1), W(x0, z1)];

// ---------------- plan (local metres) ----------------
const NX = 121.8;                       // length of the north bar
const RA = 7.4, CZ = 9.8;               // row A (north rooms) front wall, main corridor's south edge
const SG = 24.9, RC = 27.3;             // south gallery z 24.9..27.3, row C (south rooms) front wall
const WW = { x0: 0.25, g0: 2.6, g1: 31.4, x1: 33.8, e: 37.25 };       // west wing: gallery edges round the courtyard
const EW = { x0: 89.2, g0: 91.6, g1: 119.2, x1: 121.55, w: 85.75 };   // east wing
const MID = { x0: 37.5, x1: 85.5, z1: 19.15, hall0: 57.3, hall1: 60.3, door0: 57.5, door1: 60.1 };
const BW = { x0: -6.5, x1: 0.25, z0: 6.6, zA: 12.2, zB: 21.0, z1: 26.2 }; // west bump: 曬衣場 / 浴廁 / 樓梯
const BE = { x0: 121.55, x1: 128.0, z0: 7.95, zA: 13.5, zB: 21.5, z1: 26.9 };
const ROWC_W = { x0: 0.25, x1: 37.25, z1: 34.45 }, ROWC_E = { x0: 85.75, x1: 122.3, z1: 34.15 };
const OPEN_ROOMS = [276, 277, 278, 279, 280, 281];
const ROOM_SPOTS = {}; // 276～281: beds, desks and chairs in local metres (I.lixing.rooms, used by js/jianyu.js for 278)
const ST = 3.3;                         // storey height
// 兩翼靠中段的樓梯（分布圖「樓梯」）：樓梯間在兩翼朝前院的那一面（使用者指正；街景 2026-05 拍到東棟那面是清水混凝土＋藍白格子、
// 三個凸出的平台）。樓梯 z SW.z0..SW.z1，入口在南端：各樓南迴廊東端那段走道（一樓那段就是前院進來的通道，二樓以上的走道在它正上方；
// 使用者指正），每層樓南端的樓梯平台朝前院開口。
// 這兩座是剪刀梯（使用者指正：樓梯間兩邊都有樓梯，一樓到二樓從側面看像 X）：兩條梯道各一座直梯、方向相反，每層一段、沒有半層平台，
// 每層南北兩端都是整個井寬的樓層平台（下面的 scissor()）。平台長 SW.ld：梯段水平長 7.2 − 2 × 1.3 = 4.6 m，一段爬 3.3 m，約 35.7°。
// 北端平台各樓用一段走道（z CZ..SW.z0，原本主走廊上那格假的「儲藏室」門後面）接回東西向主走廊：使用者確認北端有通主走廊，並看過一、二樓平面圖（docs/floorplans/）確認配置（2026-11-22）。
// 1F：兩翼南迴廊東／西端那一格朝前院整個挖空（不是門；上面是二樓走道），從前院直接走進寢室走廊和樓梯口（使用者指正，東側鏡像）
const WD = { z0: 25.0, z1: 27.25 };
const SW = { z0: 17.7, z1: 24.9, ld: 1.3, fW: 37.5, fE: 85.53, sill: 1.1, head: 2.5 }; // fW / fE: the two faces on the forecourt (outline x)
const FB_ID = 'xinzhongbei_footbridge', FB_CUT = 5.7; // the footbridge's first metres are the outside stair (data.grade cut0)
const ANNEX = { z0: 29.6, z1: 34.3, x0: 38.3, x1: 84.7, gate0: 56.2, gate1: 61.4, h: 3.3 };
// courtyards + the galleries round them, 6 cm behind the walls that face them
const HOLES = [[0.19, 33.86, 7.34, 27.36], [89.14, 121.61, 7.34, 27.36]];

const area2 = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0);
export function lixingLook(b) {
  if (b.id !== LX_ID) return;
  const out = Math.sign(area2(b.pts));
  b.holes = HOLES.map(([x0, x1, z0, z1]) => { const r = rectW(x0, x1, z0, z1); return Math.sign(area2(r)) === out ? r.reverse() : r; });
  b.holeWalls = false; // js/map.js: no walls round the courtyards (the galleries are built here), roof and parapet as usual
  // door openings in the south wall of the middle block: 1F 大門, 2F 天橋門 at the 2F floor (world heights)
  const { f1 } = lxLevels(), p = W(MID.door0, 19.4), q = W(MID.door1, 19.4);
  b.wallDoors = [{ p, q, y0: f1 - 0.4, y1: f1 + 2.3 }, { p, q, y0: f1 + ST - 0.05, y1: f1 + ST + 2.3 }];
  for (const x of [SW.fW, SW.fE]) b.wallDoors.push({ p: W(x, WD.z0), q: W(x, WD.z1), y0: f1 - 1.5, y1: f1 + ST - 0.3 });
  // the floor landings (2F up) of the two wing stairs are open to the forecourt
  for (const x of [SW.fW, SW.fE]) for (let i = 0; i < 3; i++) { const y = f1 + ST * (i + 1); b.wallDoors.push({ p: W(x, SW.z1 - SW.ld + 0.1), q: W(x, SW.z1 - 0.1), y0: y + SW.sill, y1: y + SW.head }); }
}
// world heights that do not depend on the building's base: the 1F floor (just above the highest ground inside)
// and the footbridge deck (tools/overrides.json xinzhongbei_footbridge: 5.1 m above the road's centre)
function lxLevels() {
  let hi = -1e9;
  for (let x = -6; x <= 128; x += 2) for (let z = 0.5; z <= 34.5; z += 2) { const [wx, wz] = W(x, z); const h = H(wx, wz); if (h > hi) hi = h; }
  const [dx, dz] = W(58.8, 30), s = surfaceAt(dx, dz, 60);
  return { f1: hi + 0.12, deck: s > H(dx, dz) + 3 ? s : H(-163.0, -141.6) + 5.1 };
}
// 門房、大門台階蓋在前院：原本種在那裡的灌木和樹只隱藏
export function lixingVegHide() {
  const A = ANNEX;
  return [rectW(A.x0 - 0.8, A.x1 + 0.8, A.z0 - 0.8, A.z1 + 1.2), rectW(MID.hall0 - 1.5, MID.hall1 + 1.5, 19.3, 22.6), rectW(SW.fW - 0.3, SW.fW + 3.2, WD.z0 - 1, WD.z1 + 1), rectW(SW.fE - 3.2, SW.fE + 0.3, WD.z0 - 1, WD.z1 + 1)];
}

function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const signTex = (text, bg, fg, w = 512, h = 128, px = 64) => canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `900 ${px}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3); });

export function buildLixing(I, scene, data, collision, Kit, regMat) {
  const b = data?.buildings?.find(v => v.id === LX_ID);
  if (!b) return null;
  const k = new Kit(I, OX, OZ, ANG);
  const B = Number.isFinite(b.base) ? b.base : H(OX + 60, OZ + 5);
  k.base = B; k.group.position.y = B;
  const TOP = b.h || 17.1;

  // ---------------- heights ----------------
  const LV = lxLevels(), F1 = LV.f1 - B, DL = LV.deck - B; // 1F floor, bridge deck level
  // 1F just above the highest ground inside, 3.3 m a storey; the bridge deck is above the 2F floor: the stair outside the south wall
  const CLR = 3.0, SL = 0.25, F2 = F1 + ST;
  const FL = [F1, F2, F2 + ST, F2 + 2 * ST], CH = [CLR, CLR, CLR, CLR];
  const ROOF = FL[3] + CLR;

  // ---------------- materials (roofed over: a little glow of their own, like the other interiors) ----------------
  const std = (o, lift = 0) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o }); if (lift) { m.emissive.set(o.color || '#ffffff'); if (o.map) m.emissiveMap = o.map; m.emissiveIntensity = lift; } return m; };
  const rep = (t, x = 1, y = 1) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; // own generator: nothing shared is drawn here
  const terrazzo = rep(canvasTex(256, 256, (g) => { g.fillStyle = '#b9bcbb'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1200; i++) { const v = 150 + rnd() * 70 | 0; g.fillStyle = `rgb(${v},${v},${v - 4})`; g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 2, 2 + rnd() * 2); } g.fillStyle = 'rgba(70,70,70,.35)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 0, 2, 256); }));
  // 淺灰米色木紋美耐板（相片 2026-06）：細直紋，深淺很接近
  const woodG = rep(canvasTex(256, 256, (g) => { g.fillStyle = '#c4bcae'; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x++) { const v = rnd(); g.fillStyle = v > 0.5 ? `rgba(255,250,240,${(v - 0.5) * 0.22})` : `rgba(96,86,72,${(0.5 - v) * 0.26})`; g.fillRect(x, 0, 1, 256); } for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(110,98,84,0.10)'; g.fillRect(rnd() * 256, rnd() * 256, 1, 20 + rnd() * 60); } }));
  const mosaic = rep(canvasTex(64, 64, (g) => { for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { const v = [222, 160, 96][(rnd() * 3) | 0]; g.fillStyle = `rgb(${v},${v + 4},${v + 8})`; g.fillRect(x * 8, y * 8, 7, 7); } }));
  const tileW = rep(canvasTex(64, 64, (g) => { g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c9cbc8'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64); g.fillRect(0, 32, 64, 1); g.fillRect(32, 0, 1, 64); }));
  const tileD = rep(canvasTex(64, 64, (g) => { g.fillStyle = '#3d4044'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#2a2c2f'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); }));
  const paving = rep(canvasTex(128, 128, (g) => { g.fillStyle = '#a79f93'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 1400; i++) { const v = 120 + rnd() * 80 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(rnd() * 128, rnd() * 128, 2, 2); } }));
  const stone = rep(canvasTex(128, 128, (g) => { g.fillStyle = '#8f8e89'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { const v = 120 + rnd() * 50 | 0; g.fillStyle = `rgb(${v},${v},${v - 4})`; g.fillRect(rnd() * 128, rnd() * 128, 3, 2); } g.fillStyle = 'rgba(60,60,58,.5)'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 0, 2, 128); g.fillRect(0, 64, 128, 2); }));
  const brick = rep(canvasTex(64, 64, (g) => { g.fillStyle = '#b9b0a4'; g.fillRect(0, 0, 64, 64); for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { g.fillStyle = `hsl(${12 + rnd() * 8},${45 + rnd() * 15}%,${36 + rnd() * 10}%)`; g.fillRect(c * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14); if (r % 2) g.fillRect(-15, r * 16 + 1, 30, 14); } }));
  const winT = canvasTex(256, 192, (g) => { g.fillStyle = '#dfe3e0'; g.fillRect(0, 0, 256, 192); const sky = g.createLinearGradient(0, 0, 0, 192); sky.addColorStop(0, '#bfe0f5'); sky.addColorStop(1, '#eaf4f4'); g.fillStyle = sky; g.fillRect(8, 8, 240, 176); g.fillStyle = '#8d9498'; for (const x of [8, 86, 166, 244]) g.fillRect(x - 3, 8, 6, 176); g.fillRect(8, 60, 240, 5); g.strokeStyle = '#70777b'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 176); });
  const mat = (n, m) => regMat('lx_' + n, m);
  const MT = {
    floor: mat('floor', std({ map: terrazzo, roughness: 0.55 }, 0.2)), ceil: mat('ceil', std({ color: '#f1f0ea' }, 0.42)),
    white: mat('white', std({ color: '#efede6' }, 0.3)), blue: mat('blue', std({ color: '#2f7fc6' }, 0.28)), band: mat('band', std({ color: '#b7cf3a' }, 0.3)),
    teal: mat('teal', std({ color: '#27b3b0' }, 0.25)), green: mat('green', std({ color: '#79bd45' }, 0.25)), sky: mat('sky', std({ color: '#3d8fd8' }, 0.25)),
    stair: mat('stair', std({ color: '#a9a6a0', roughness: 0.7 }, 0.2)), rail: mat('rail', std({ color: '#2b2d30', metalness: 0.5, roughness: 0.45 })),
    wood: mat('wood', std({ map: woodG, roughness: 0.6 }, 0.2)), desk: mat('desk', std({ color: '#e4dfd4', roughness: 0.5 }, 0.22)), frame: mat('frame', std({ color: '#9a9b9c', metalness: 0.3, roughness: 0.5 }, 0.12)), vinyl: mat('vinyl', std({ color: '#cfd1cf', roughness: 0.45 }, 0.22)), mattress: mat('mattress', std({ color: '#d9dde2' }, 0.2)), ladder: mat('ladder', std({ color: '#f1f1ee', roughness: 0.4 }, 0.25)),
    chair: mat('chair', std({ color: '#e0622f', roughness: 0.6 }, 0.2)), steel: mat('steel', std({ color: '#b4b8bc', metalness: 0.7, roughness: 0.3 }, 0.08)),
    mosaic: mat('mosaic', std({ map: mosaic, roughness: 0.4 }, 0.25)), tileW: mat('tileW', std({ map: tileW, roughness: 0.35 }, 0.3)), tileD: mat('tileD', std({ map: tileD, roughness: 0.5 }, 0.15)),
    part: mat('part', std({ color: '#c9a678', roughness: 0.6 }, 0.2)), mirror: mat('mirror', std({ color: '#cfe0e6', metalness: 0.9, roughness: 0.08 })),
    light: mat('light', new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6e2', emissiveIntensity: 1.1 })),
    window: mat('window', new THREE.MeshStandardMaterial({ map: winT, emissive: '#ffffff', emissiveMap: winT, emissiveIntensity: 0.75, roughness: 0.3 })),
    paving: mat('paving', std({ map: paving, roughness: 0.9 })), brick: mat('brick', std({ map: brick, roughness: 0.85 })), pergola: mat('pergola', std({ color: '#3b3f44', metalness: 0.4, roughness: 0.5 })),
    table: mat('table', std({ color: '#7a5b3c', roughness: 0.7 })), plant: mat('plant', std({ color: '#3f8a3c', roughness: 0.9 })),
    stone: mat('stone', std({ map: stone, roughness: 0.85 })), canopy: mat('canopy', std({ color: '#e4e2dc', roughness: 0.8 })), grille: mat('grille', std({ color: '#7d7468', metalness: 0.5, roughness: 0.5 })),
    lattice: mat('lattice', std({ color: '#9a4a3a', roughness: 0.8 })), shutter: mat('shutter', std({ color: '#a7aaa8', metalness: 0.5, roughness: 0.45 })), machine: mat('machine', std({ color: '#e9eaec', roughness: 0.4 }, 0.2)),
    red: mat('red', std({ color: '#d43a2f', roughness: 0.6 }, 0.15)), conc: mat('conc', std({ color: '#b5b2aa', roughness: 0.9 })), orange: mat('orange', std({ color: '#c8452a', metalness: 0.3, roughness: 0.55 })), dark: mat('dark', std({ color: '#2a2b2d', roughness: 0.6 })),
  };
  const BLOCKS = [MT.sky, MT.teal, MT.green, MT.white, MT.blue];

  // ---------------- helpers ----------------
  const nc = { col: false };
  const bx = (x0, x1, y0, y1, z0, z1, m, o) => k.box(x0, x1, y0, y1, z0, z1, m, { ...nc, ...o });
  // collision wall line; y above the building base, stored above the local ground as Interiors wants it
  const wl = (x0, z0, x1, z1, y0, y1) => { const a = W(x0, z0), c = W(x1, z1), g = H((a[0] + c[0]) / 2, (a[1] + c[1]) / 2); I.addWall(a[0], a[1], c[0], c[1], y0 + B - g, y1 + B - g); };
  const wlRect = (x0, x1, z0, z1, y0, y1) => { wl(x0, z0, x1, z0, y0, y1); wl(x1, z0, x1, z1, y0, y1); wl(x1, z1, x0, z1, y0, y1); wl(x0, z1, x0, z0, y0, y1); };
  const cbx = (x0, x1, y0, y1, z0, z1, m, o) => { bx(x0, x1, y0, y1, z0, z1, m, o); wlRect(x0, x1, z0, z1, y0, y1); };
  // walkable surface: y is a height or (localX, localZ) => height
  const sf = (x0, x1, z0, z1, y) => I.addSurface(k.rect(x0, x1, z0, z1), typeof y === 'function' ? (x, z) => { const [lx, lz] = k.l(x, z); return y(lx, lz) + B - H(x, z); } : (x, z) => y + B - H(x, z));
  // surfaces within a step of the ground right under the footbridge (1F 大門 and its steps): Interiors counts floor heights
  // from the ground, the player on the deck counts from the deck, so up there these must not exist
  let feet = -1e9; I.updaters.push((dt, g) => { feet = g.player?.pos?.y ?? -1e9; });
  const sfLow = (x0, x1, z0, z1, y) => I.addSurface(k.rect(x0, x1, z0, z1), (x, z) => { if (feet > B + F1 + 2.6) return -1e6; const [lx, lz] = k.l(x, z); return (typeof y === 'function' ? y(lx, lz) : y) + B - H(x, z); });
  const T = 0.12; // wall thickness
  // axis-aligned wall on the line (x0,z0)-(x1,z1), drawn on side `s` (-1 / +1 along the normal axis, 0 centred), with collision
  const wall = (x0, z0, x1, z1, y0, y1, m, s = 0, o) => {
    if (Math.abs(x1 - x0) < 1e-6) { const a = x0 + (s < 0 ? -T : s > 0 ? 0 : -T / 2); bx(a, a + T, y0, y1, Math.min(z0, z1), Math.max(z0, z1), m, o); }
    else { const a = z0 + (s < 0 ? -T : s > 0 ? 0 : -T / 2); bx(Math.min(x0, x1), Math.max(x0, x1), y0, y1, a, a + T, m, o); }
    wl(x0, z0, x1, z1, y0, y1);
  };
  const clamp01 = (t) => t < 0 ? 0 : t > 1 ? 1 : t;

  // ---------------- doors: one texture atlas, one mesh ----------------
  const DC = { w: 64, h: 128, cols: 32, rows: 16 };
  const doorCv = document.createElement('canvas'); doorCv.width = DC.w * DC.cols; doorCv.height = DC.h * DC.rows;
  const dg = doorCv.getContext('2d'); let doorN = 0; const doorCell = new Map();
  const doorTex = new THREE.CanvasTexture(doorCv); doorTex.colorSpace = THREE.SRGBColorSpace; doorTex.anisotropy = 4;
  const doorMat = mat('doors', std({ map: doorTex, roughness: 0.6, side: THREE.DoubleSide }, 0.3));
  const cellOf = (label, bg) => {
    const key = label + bg; if (doorCell.has(key)) return doorCell.get(key);
    const n = doorN++, cx = (n % DC.cols) * DC.w, cy = Math.floor(n / DC.cols) * DC.h;
    dg.fillStyle = bg; dg.fillRect(cx, cy, DC.w, DC.h);
    dg.strokeStyle = 'rgba(0,0,0,.28)'; dg.lineWidth = 3; dg.strokeRect(cx + 1.5, cy + 1.5, DC.w - 3, DC.h - 3);
    dg.fillStyle = '#d7d9d6'; dg.fillRect(cx + 50, cy + 66, 7, 4); // handle
    dg.fillStyle = bg === '#e9e9e4' ? '#2d5f96' : '#fbfbf2'; dg.textAlign = 'center'; dg.textBaseline = 'middle';
    const chars = [...label], px = Math.min(26, 100 / chars.length);
    dg.font = `900 ${px}px ${FONT}`;
    chars.forEach((ch, i) => dg.fillText(ch, cx + 24, cy + 64 + (i - (chars.length - 1) / 2) * (px + 1)));
    doorCell.set(key, n); return n;
  };
  const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
  // a closed door leaf 0.9 x 2.1 on a wall face; `face` = the way it looks
  const door = (x, y, z, face, label, bg = '#c9cf3f', w = 0.9, h = 2.1) => {
    const n = cellOf(label, bg), g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    const u0 = (n % DC.cols) / DC.cols, v1 = 1 - Math.floor(n / DC.cols) / DC.rows, du = 1 / DC.cols, dv = 1 / DC.rows;
    for (let i = 0; i < 4; i++) uv.setXY(i, u0 + uv.getX(i) * du, v1 - dv + uv.getY(i) * dv);
    g.rotateY(ROT[face]); g.translate(x, y + h / 2, z); k._part(doorMat, g);
  };
  const plane = (tex, w, h, x, y, z, face, o) => k.plane(tex, w, h, x, y, z, ROT[face], o);
  const signs = new Map();
  const sign = (text, x, y, z, face, bg = '#1f5f8b', w = 1.1) => { if (!signs.has(text + bg)) signs.set(text + bg, signTex(text, bg, '#ffffff', 512, 128, text.length > 5 ? 56 : 76)); plane(signs.get(text + bg), w, w / 4, x, y, z, face, { emissive: 0.45 }); };

  // a row of closed rooms behind a corridor wall at z = zw; `face` = which way the wall looks ('s' or 'n').
  // cells: [x0, x1, label, kind]  kind: 'room' (door + number), 'svc' (white door + sign), 'open' (gap), 'solid'
  const rowFront = (f, zw, face, cells) => {
    const y = FL[f], c = y + CH[f], s = face === 's' ? -1 : 1, off = face === 's' ? 0.012 : -0.012;
    let run = null;
    const flush = () => {
      if (!run) return;
      const z0 = zw + (s < 0 ? -T : 0), z1 = z0 + T;
      bx(run[0], run[1], y, y + 2.1, z0, z1, MT.blue); bx(run[0], run[1], y + 2.1, y + 2.42, z0, z1, MT.band); bx(run[0], run[1], y + 2.42, c, z0, z1, MT.white);
      wl(run[0], zw, run[1], zw, y, c); run = null;
    };
    for (const [x0, x1, label, kind] of cells) {
      if (kind === 'open') { flush(); const z0 = zw + (s < 0 ? -T : 0); bx(x0, x1, y + 2.3, c, z0, z0 + T, MT.band); continue; }
      if (!run) run = [x0, x1]; else run[1] = x1;
      if (kind === 'solid') continue;
      const cx = (x0 + x1) / 2;
      door(cx, y, zw + off, face, label, kind === 'svc' ? '#e9e9e4' : kind === 'lead' ? '#59a83f' : kind === 'office' ? '#e2a528' : '#c9cf3f');
    }
    flush();
  };
  const split = (x0, x1, labels, kind = 'room') => labels.map((l, i) => { const w = (x1 - x0) / labels.length; return Array.isArray(l) ? [x0 + i * w, x0 + (i + 1) * w, l[0], l[1]] : [x0 + i * w, x0 + (i + 1) * w, String(l), kind]; });

  // ---------------- switchback stairs ----------------
  // well x0..x1, z0..z1; ax: the flights run along 'x' or 'z'; dir: +1 if the entry landing (floor level) is at the low end of that axis
  const stairs = ({ x0, x1, z0, z1, ax, dir, ld = 1.5, wallM = MT.white }) => {
    const a0 = ax === 'x' ? x0 : z0, a1 = ax === 'x' ? x1 : z1, c0 = ax === 'x' ? z0 : x0, c1 = ax === 'x' ? z1 : x1;
    const L = a1 - a0, cm = (c0 + c1) / 2;
    const A = (u) => dir > 0 ? a0 + u : a1 - u;                         // along-axis coordinate at distance u from the entry end
    const R = (u0, u1, v0, v1) => { const p = A(u0), q = A(u1), lo = Math.min(p, q), hi2 = Math.max(p, q); return ax === 'x' ? [lo, hi2, v0, v1] : [v0, v1, lo, hi2]; };
    const uOf = (lx, lz) => { const a = ax === 'x' ? lx : lz; return dir > 0 ? a - a0 : a1 - a; };
    const lanes = [[c0 + 0.1, cm - 0.07], [cm + 0.07, c1 - 0.1]];
    const ys = [FL[0]]; for (const [n, f] of [[2, 0], [2, 1], [2, 2]]) for (let i = 1; i <= n; i++) ys.push(FL[f] + (FL[f + 1] - FL[f]) * i / n);
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
    // spine between the two lanes, and what would otherwise be a drop: under the first flight's twin, past the last floor
    { const r = R(ld, L - ld, cm - 0.07, cm + 0.07); bx(r[0], r[1], FL[0], FL[3] + 1.1, r[2], r[3], wallM); if (ax === 'x') wl(r[0], cm, r[1], cm, FL[0], ROOF); else wl(cm, r[2], cm, r[3], FL[0], ROOF); }
    const bar = (u, [v0, v1], y0, y1, m) => { const r = R(u - 0.05, u + 0.05, v0, v1); bx(r[0], r[1], y0, y1, r[2], r[3], m); if (ax === 'x') wl(A(u), v0, A(u), v1, y0, y1); else wl(v0, A(u), v1, A(u), y0, y1); };
    bar(ld, lanes[1], FL[0], FL[0] + 2.4, wallM);
    bar(ld, lanes[0], FL[3], FL[3] + 1.1, MT.rail);
    // far end wall and the two sides (lining; the outer shell or the neighbours' walls carry the collision where they coincide)
    { const r = R(L - 0.1, L, c0, c1); bx(r[0], r[1], FL[0], ROOF, r[2], r[3], wallM); if (ax === 'x') wl(A(L), c0, A(L), c1, FL[0], ROOF); else wl(c0, A(L), c1, A(L), FL[0], ROOF); }
    for (const [v, s] of [[c0, 1], [c1, -1]]) {
      const side = (u0, u1, ya, yb) => { const r = R(u0, u1, s > 0 ? v : v - 0.1, s > 0 ? v + 0.1 : v); bx(r[0], r[1], ya, yb, r[2], r[3], wallM); };
      side(0.14, L, FL[0], ROOF);
      if (ax === 'x') wl(a0, v, a1, v, FL[0], ROOF); else wl(v, a0, v, a1, FL[0], ROOF);
    }
    // entry side: open one storey high at each floor, closed in between (the half landing of the tall 1F is behind it)
    for (let f = 0; f < 4; f++) {
      const y0 = FL[f] + 2.3, y1 = f < 3 ? FL[f + 1] : ROOF, r = R(-0.06, 0.06, c0, c1);
      bx(r[0], r[1], y0, y1, r[2], r[3], f === 0 ? MT.white : MT.band);
      if (ax === 'x') wl(A(0), c0, A(0), c1, y0, y1); else wl(c0, A(0), c1, A(0), y0, y1);
    }
    // window light on the far wall of each half landing
    for (let i = 1; i < ys.length; i += 2) { const u = L - 0.11, mid = (c0 + c1) / 2; const p = ax === 'x' ? [A(u), mid] : [mid, A(u)]; plane(winT, 1.6, 1.1, p[0], ys[i] + 1.6, p[1], ax === 'x' ? (dir > 0 ? 'w' : 'e') : (dir > 0 ? 'n' : 's'), { emissive: 0.7 }); }
  };

  // ---------------- scissor stairs（兩翼朝前院的兩座；使用者指正：樓梯間兩邊都有樓梯，側面看像 X）----------------
  // 井 x0..x1、z0..z1，梯段沿 z。兩條梯道各一座直梯、每層一段：梯道 nl（0 = x 小的那條）由南端平台往北上到上一層的北端平台，
  // 另一條由北端平台往南上到上一層的南端平台。每層南北兩端各一個整個井寬、長 ld 的樓層平台；南端（z1）是南迴廊端頭的走道，
  // 北端（z0）是接回主走廊的走道（使用者確認有通）。open: -1 / +1 = 南端平台（二樓以上）朝 x 小／大那一側開口（朝前院）。
  // 兩條梯道中間不再是通到屋頂的實牆，只留跟著梯段斜上去的欄板，站在梯段上看得到另一條；碰撞仍是整面
  // （人一定站在自己那條梯段上，欄板永遠在身旁，所以不會有看不見的牆，也不會跨到另一條掉下去）。
  const scissor = ({ x0, x1, z0, z1, ld, nl = 0, open = 0, wallM = MT.white }) => {
    const cm = (x0 + x1) / 2, lanes = [[x0 + 0.1, cm - 0.07], [cm + 0.07, x1 - 0.1]], zn = z0 + ld, zs = z1 - ld, run = zs - zn;
    const land = (za, zb, y) => { bx(x0 + 0.1, x1 - 0.1, y - 0.18, y, za, zb, MT.floor); sf(x0 + 0.1, x1 - 0.1, za, zb, y); };
    // 斜的板（欄板、扶手）：z 由 za 到 zb，底邊高度由 ya 到 yb，板高 h
    const rake = (xa, xb, za, zb, ya, yb, h, m) => {
      const len = zb - za, g = new THREE.BoxGeometry(xb - xa, h, len), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + h / 2 + ya + (yb - ya) * (p.getZ(i) / len + 0.5));
      g.translate((xa + xb) / 2, 0, (za + zb) / 2); g.computeVertexNormals(); k._part(m, g);
    };
    // 橫擋：畫面上一路封到井中線（不然中線那 7 cm 會留一條直縫，看得到梯段底下），碰撞線只到梯道邊（中線那面牆接手）
    const bar = (z, [v0, v1], y0, y1, yc, m) => { bx(v0 < cm ? v0 : cm, v0 < cm ? cm : v1, y0, y1, z - 0.05, z + 0.05, m); wl(v0, z, v1, z, y0, yc); };
    const rail = (z, ln) => { bar(z, ln, FL[3], FL[3] + 0.95, FL[3] + 1.5, wallM); bx(ln[0] < cm ? ln[0] : cm, ln[0] < cm ? cm : ln[1], FL[3] + 0.95, FL[3] + 1.01, z - 0.06, z + 0.06, MT.rail); }; // 欄板＋扶手，和梯段旁的一樣
    bx(x0 + 0.1, x1 - 0.1, FL[0] - 0.18, FL[0], zn, zs, MT.floor); // 一樓梯段底下的地面（走不進去，只是從另一條梯道看得到）
    for (let f = 0; f < 4; f++) {
      land(zs, z1, FL[f]); land(z0, zn, FL[f]);
      const top = f < 3 ? FL[f + 1] - 0.18 : ROOF;
      for (const z of [(z0 + zn) / 2, (zs + z1) / 2]) bx(cm - 0.5, cm + 0.5, top - 0.04, top - 0.01, z - 0.09, z + 0.09, MT.light);
      if (f === 3) break;
      const ya = FL[f], yb = FL[f + 1], n = Math.max(8, Math.round((yb - ya) / 0.165));
      lanes.forEach(([v0, v1], li) => {
        const north = li === nl; // 這一段往北上（低的那頭在南端平台）
        sf(v0, v1, zn, zs, (lx, lz) => ya + (yb - ya) * clamp01(north ? (zs - lz) / run : (lz - zn) / run));
        for (let j = 0; j < n; j++) {
          const h = ya + (yb - ya) * (j + 1) / n, a = run * j / n, c2 = run * (j + 1) / n;
          bx(v0, v1, h - 0.3, h, north ? zs - c2 : zn + a, north ? zs - a : zn + c2, MT.stair);
        }
        // 靠井中線那一側的欄板（各佔中線的一半）和扶手
        const xa = li === 0 ? cm - 0.07 : cm, yN = north ? yb : ya, yS = north ? ya : yb;
        rake(xa, xa + 0.07, zn, zs, yN - 0.36, yS - 0.36, 1.31, wallM); rake(xa - 0.01, xa + 0.08, zn, zs, yN + 0.95, yS + 0.95, 0.06, MT.rail);
      });
    }
    wl(cm, zn, cm, zs, FL[0], ROOF);
    // 會掉下去或卡住的地方：一樓兩端平台上、頭頂是梯段高處的那一條（梯段底下）封起來；四樓兩端平台上、沒有往上梯段的那一條加欄杆
    const [ln, lo] = [lanes[nl], lanes[1 - nl]];
    bar(zn, ln, FL[0], FL[1] - 0.3, FL[0] + 2.4, wallM); bar(zs, lo, FL[0], FL[1] - 0.3, FL[0] + 2.4, wallM);
    rail(zn, lo); rail(zs, ln);
    bx(x0, x1, ROOF, ROOF + 0.05, z0, z1, MT.ceil);
    // 兩側的牆：朝前院那一側在南端平台（二樓以上）開口，另一側整面
    for (const [v, s] of [[x0, 1], [x1, -1]]) {
      const side = (za, zb, ya, yb) => bx(s > 0 ? v : v - 0.1, s > 0 ? v + 0.1 : v, ya, yb, za, zb, wallM);
      if (open === -s) { side(z0, zs, FL[0], ROOF); let yy = FL[0]; for (let f = 1; f < 4; f++) { side(zs, z1 - 0.14, yy, FL[f] + SW.sill); yy = FL[f] + SW.head; } side(zs, z1 - 0.14, yy, ROOF); }
      else side(z0, z1 - 0.14, FL[0], ROOF);
      wl(v, z0, v, z1, FL[0], ROOF);
    }
    // 南北兩端：每層開一個樓層高的口，兩層之間封起來（北端原本是半層平台的窗，剪刀梯沒有半層平台，改成通道口）
    for (const z of [z0, z1]) for (let f = 0; f < 4; f++) {
      const y0 = FL[f] + 2.3, y1 = f < 3 ? FL[f + 1] : ROOF;
      bx(x0, x1, y0, y1 - 0.01, z - 0.06, z + 0.06, f === 0 ? MT.white : MT.band); wl(x0, z, x1, z, y0, y1); // (頂面略低於上一層地板，不和地板疊在同一面)
    }
  };

  // ---------------- per floor ----------------
  const num = (f, n) => String((f + 1) * 100 + n);
  const lights = (x0, x1, z0, z1, c, step = 4.2) => { const alongX = x1 - x0 > z1 - z0; if (alongX) for (let x = x0 + step / 2; x < x1; x += step) bx(x - 0.6, x + 0.6, c - 0.05, c - 0.02, (z0 + z1) / 2 - 0.09, (z0 + z1) / 2 + 0.09, MT.light); else for (let z = z0 + step / 2; z < z1; z += step) bx((x0 + x1) / 2 - 0.09, (x0 + x1) / 2 + 0.09, c - 0.05, c - 0.02, z - 0.6, z + 0.6, MT.light); };
  // floor slab + walkable surface + ceiling over a rectangle
  const room = (f, x0, x1, z0, z1, o = {}) => {
    const y = FL[f], c = y + CH[f];
    bx(x0, x1, y - SL, y, z0, z1, o.floor || MT.floor, { tile: [2.4, 2.4] }); sf(x0, x1, z0, z1, y);
    if (o.ceil !== false) bx(x0, x1, c - 0.03, c + 0.05, z0, z1, MT.ceil);
    if (o.lights !== false) lights(x0, x1, z0, z1, c, o.step);
  };
  const mA = (MID.x1 - MID.x0 - 5.5 - 3.3 - 2.5 - 5.0) / 11, sx = MID.x0 + 5.5 + 6 * mA; // 中段北側樓梯 x sx..sx+3.3
  for (let f = 0; f < 4; f++) {
    const y = FL[f], c = y + CH[f], up = f > 0;
    // --- main corridor and the galleries round the two courtyards
    room(f, 0.25, NX - 0.25, RA, CZ);
    for (const w of [WW, EW]) {
      room(f, w.x0, w.g0, CZ, RC); room(f, w.g1, w.x1, CZ, RC);
      room(f, w.g0, w.g1, SG, RC);
    }
    room(f, WW.x1, WW.e, SG, RC); room(f, EW.w, EW.x0, SG, RC);
    // --- row A: north rooms, west to east (分布圖最上面那排)
    {
      const w7 = (34.9 - 0.25) / 7, cells = [];
      [72, 71, 70, 69, 68, 67, 66].forEach((n, i) => cells.push([0.25 + i * w7, 0.25 + (i + 1) * w7, num(f, n), n === 66 ? 'lead' : 'room']));
      cells.push([34.9, MID.x0, '洗衣間', 'svc'], [MID.x0, MID.x0 + 5.5, '浴廁', 'svc']);
      [62, 60, 58, 56, 54, 52].forEach((n, i) => cells.push([MID.x0 + 5.5 + i * mA, MID.x0 + 5.5 + (i + 1) * mA, num(f, n), 'room']));
      cells.push([sx, sx + 3.3, '', 'open']);
      [2, 4, 6, 8, 10].forEach((n, i) => cells.push([sx + 3.3 + i * mA, sx + 3.3 + (i + 1) * mA, num(f, n), f === 0 && n === 2 ? 'office' : 'room']));
      const lx = sx + 3.3 + 5 * mA;
      cells.push([lx, lx + 2.5, '洗衣間', 'svc'], [lx + 2.5, MID.x1, '浴廁', 'svc']);
      const w8 = (NX - 0.25 - MID.x1) / 8;
      [15, 16, 17, 18, 19, 20, 21, 22].forEach((n, i) => cells.push([MID.x1 + i * w8, MID.x1 + (i + 1) * w8, num(f, n), n === 15 ? 'lead' : 'room']));
      rowFront(f, RA, 's', cells);
      if (f === 0) sign('指導老師辦公室', sx + 3.3 + mA / 2, y + 2.6, RA + 0.02, 's', '#b9831a', 1.5);
      sign('樓梯 ↑↓', sx + 1.65, y + 2.5, RA + 0.02, 's', '#2d3b4a', 1.2);
    }
    // --- row B: south side of the middle corridor; the 中廊 in the middle (aligned with the footbridge)
    {
      const cells = [[WW.x1, WW.e, '', 'open'], [WW.e, MID.x0, '', 'solid']]; // 兩翼剪刀梯北端的走道口（使用者確認有通；原本是一格假的「儲藏室」門）
      cells.push(...split(MID.x0, MID.hall0, [64, 63, 61, 59, 57, 55, 53, 51].map(n => num(f, n))));
      cells.push([MID.hall0, MID.hall1, '', 'open']);
      cells.push(...split(MID.hall1, MID.x1, [1, 3, 5, 7, 9, 11, 13, 14].map(n => num(f, n))));
      cells.push([MID.x1, EW.w, '', 'solid'], [EW.w, EW.x0, '', 'open']);
      rowFront(f, CZ, 'n', cells);
      for (const x of [(WW.x1 + WW.e) / 2, (EW.w + EW.x0) / 2]) sign('樓梯 ↑↓', x, y + 2.5, CZ - 0.02, 'n', '#2d3b4a', 1.2);
      sign(['中廊 · 大門', '中廊 · 天橋', '自習室', '休閒室'][f], (MID.hall0 + MID.hall1) / 2, y + 2.5, CZ - 0.02, 'n', '#1f5f8b', 1.4);
    }
    // --- row C: south rooms of the two wings
    {
      const w = (ROWC_W.x1 - ROWC_W.x0) / 11, cells = [];
      const names = f === 0 ? ['自習室', '自習室', '休閒室', '休閒室', 177, 178, 179, 180, '冰箱', 182, 183] : [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83];
      names.forEach((n, i) => { const lab = typeof n === 'number' ? (f === 0 ? String(n) : num(f, n)) : n; const open = typeof n === 'number' && OPEN_ROOMS.includes(+lab); cells.push([ROWC_W.x0 + i * w, ROWC_W.x0 + (i + 1) * w, lab, typeof n !== 'number' ? 'svc' : open ? 'bedroom' : 'room']); });
      // enterable rooms: wall pieces either side of a 0.9 m doorway
      const out = [];
      for (const cl of cells) { if (cl[3] !== 'bedroom') { out.push(cl); continue; } const cx = (cl[0] + cl[1]) / 2; out.push([cl[0], cx - 0.45, '', 'solid'], [cx - 0.45, cx + 0.45, '', 'open'], [cx + 0.45, cl[1], '', 'solid']); }
      rowFront(f, RC, 'n', out);
      const we = (ROWC_E.x1 - ROWC_E.x0) / 11, ce = [];
      (f === 0 ? [133, 132, '冰箱', 130, 129, 128, 127, 126, 125, 124, 123] : [33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23]).forEach((n, i) => ce.push([ROWC_E.x0 + i * we, Math.min(ROWC_E.x0 + (i + 1) * we, EW.x1), typeof n === 'number' ? (f === 0 ? String(n) : num(f, n)) : n, typeof n === 'number' ? 'room' : 'svc']));
      rowFront(f, RC, 'n', ce);
    }
    // --- wing walls that are not room fronts
    // west wing: gallery's west wall (曬衣場 is entered from the corridor's end, 浴廁 door, stair opening)
    for (const [z0, z1] of [[CZ, 15.4], [16.6, BW.zB + 0.3], [BW.z1 - 0.3, RC]]) wall(WW.x0, z0, WW.x0, z1, y, c, MT.blue, -1);
    bx(WW.x0 - T, WW.x0, y + 2.3, c, 15.4, 16.6, MT.band);
    wall(WW.x1, CZ + T, WW.x1, SG, y, c, MT.blue, 1);           // 樓梯間和它北端走道的西牆（從主走廊那排牆的背面起，走道口的色帶才不會和牆頭疊在同一面）
    // 剪刀梯北端平台 → 主走廊的走道（使用者確認有通，見 SW 上面的說明）：地板、天花、燈，靠中段那一側的牆；東棟鏡像（電梯門在 EW.x0 朝東迴廊那面，不受影響）
    for (const [xa, xb, xw, s] of [[WW.x1, WW.e, WW.e, -1], [EW.w, EW.x0, EW.w, 1]]) { room(f, xa, xb, CZ, SW.z0, { step: 2.6 }); wall(xw, CZ + T, xw, SW.z0, y, c, MT.blue, s); }
    bx(WW.x1, WW.e, y + 2.3, c, SG - T, SG, MT.band); sign('樓梯 ↑↓', (WW.x1 + WW.e) / 2, y + 2.5, SW.z1 + 0.07, 's', '#2d3b4a', 1.2); // 樓梯口（朝南迴廊東端的走道；牌子掛在 scissor() 南端門楣的南面外，門楣厚到 z1 + 0.06）
    if (f > 0) wall(WW.e, SG, WW.e, RC, y, c, MT.blue, 1); // (1F: open to the forecourt)
    // east wing (mirrored)
    for (const [z0, z1] of [[CZ, 16.4], [17.6, BE.zB + 0.3], [BE.z1 - 0.3, RC]]) wall(EW.x1, z0, EW.x1, z1, y, c, MT.blue, 1);
    bx(EW.x1, EW.x1 + T, y + 2.3, c, 16.4, 17.6, MT.band);
    wall(EW.x0, CZ + T, EW.x0, SG, y, c, MT.blue, -1); bx(EW.w, EW.x0, y + 2.3, c, SG - T, SG, MT.band); sign('樓梯 ↑↓', (EW.w + EW.x0) / 2, y + 2.5, SW.z1 + 0.07, 's', '#2d3b4a', 1.2); if (f > 0) wall(EW.w, SG, EW.w, RC, y, c, MT.blue, -1);
    door(EW.x0 + 0.012, y, 18.7, 'e', '電梯', '#b4b8bc', 1.2);
    // corridor ends: doorways into the two 曬衣場
    bx(0.13, 0.25, y + 2.3, c, RA, CZ, MT.band);
    wall(NX - 0.25, RA, NX - 0.25, BE.z0 + 0.1, y, c, MT.blue, 1); bx(NX - 0.25, NX - 0.13, y + 2.3, c, RA, CZ, MT.band);
    // --- courtyard side of the galleries: columns, parapets with colour blocks (2F up), the tall painted band over 1F
    for (const w of [WW, EW]) {
      const edges = [[w.g0, CZ, w.g1, CZ], [w.g0, SG, w.g1, SG], [w.g0, CZ, w.g0, SG], [w.g1, CZ, w.g1, SG]];
      for (const [x0, z0, x1, z1] of edges) {
        const len = Math.abs(x1 - x0) + Math.abs(z1 - z0), n = Math.round(len / 4.8), alongX = z0 === z1;
        const piece = (t0, t1, ya, yb, m) => alongX ? bx(x0 + (x1 - x0) * t0, x0 + (x1 - x0) * t1, ya, yb, z0 - 0.08, z0 + 0.08, m) : bx(x0 - 0.08, x0 + 0.08, ya, yb, z0 + (z1 - z0) * t0, z0 + (z1 - z0) * t1, m);
        for (let i = 0; i < n; i++) {
          if (up) piece(i / n, (i + 1) / n, y - SL, y + 1.1, BLOCKS[(i * 2 + f + (alongX ? 0 : 1)) % BLOCKS.length]);
          
        }
        if (up) { wl(x0, z0, x1, z1, y - 0.3, y + 1.4); piece(0, 1, y + 1.1, y + 1.16, MT.white); }
        if (f === 3) piece(0, 1, ROOF, TOP + 0.5, MT.sky); // fascia up to the roof parapet
        if (f === 0) for (let i = 0; i <= n; i++) { const t = i / n, px = alongX ? x0 + (x1 - x0) * t : x0, pz = alongX ? z0 : z0 + (z1 - z0) * t; bx(px - 0.17, px + 0.17, FL[0] - 0.3, ROOF, pz - 0.17, pz + 0.17, MT.white); wlRect(px - 0.17, px + 0.17, pz - 0.17, pz + 0.17, FL[0], ROOF); }
      }
    }
    // --- the two end blocks: 曬衣場 / 浴廁 (stairs below)
    for (const [bm, sideW] of [[BW, true], [BE, false]]) {
      const xi = sideW ? bm.x1 : bm.x0, xo = sideW ? bm.x0 : bm.x1, inF = sideW ? 'e' : 'w';
      const xa = Math.min(xi, xo), xb = Math.max(xi, xo), s = sideW ? 1 : -1; // s: from the outer wall inwards
      // 曬衣場: steel racks, white tile dado
      room(f, xa, xb, bm.z0, bm.zA, { floor: MT.tileD, step: 3 });
      bx(xa, xb, y, c, bm.z0, bm.z0 + 0.1, MT.tileW, { tile: [0.6, 0.6] }); bx(xo - (sideW ? 0 : 0.1), xo + (sideW ? 0.1 : 0), y, c, bm.z0, bm.zA, MT.tileW, { tile: [0.6, 0.6] });
      plane(winT, 2.6, 1.3, xo + s * 0.11, y + 1.75, (bm.z0 + bm.zA) / 2, sideW ? 'e' : 'w', { emissive: 0.7 });
      for (let z = bm.z0 + 1.2; z < bm.zA - 0.6; z += 1.3) { bx(xa + 0.6, xb - 0.6, y + 2.05, y + 2.09, z - 0.02, z + 0.02, MT.steel); for (const x of [xa + 0.6, xb - 0.6]) bx(x - 0.02, x + 0.02, y + 2.05, c, z - 0.02, z + 0.02, MT.steel); }
      sign('曬衣場', xi + (sideW ? 0.012 : -0.012), y + 2.5, sideW ? (RA + CZ) / 2 : (BE.z0 + 0.1 + CZ) / 2, inF, '#2a8f8a', 1.0);
      wall(xa, bm.zA, xb, bm.zA, y, c, MT.tileW, 0, { tile: [0.6, 0.6] });
      // 浴廁: mosaic trough along the north wall with mirrors, toilet / shower stalls along the outer wall
      room(f, xa, xb, bm.zA, bm.zB, { floor: MT.tileD, step: 3 });
      bx(xo - (sideW ? 0 : 0.1), xo + (sideW ? 0.1 : 0), y, c, bm.zA, bm.zB, MT.tileW, { tile: [0.6, 0.6] });
      cbx(xa + 0.5, xb - 1.6, y, y + 0.85, bm.zA + 0.06, bm.zA + 0.7, MT.mosaic, { tile: [0.5, 0.5] });
      bx(xa + 0.6, xb - 1.7, y + 0.78, y + 0.86, bm.zA + 0.16, bm.zA + 0.6, MT.tileD);
      bx(xa + 0.5, xb - 1.6, y + 1.15, y + 2.0, bm.zA + 0.06, bm.zA + 0.09, MT.mirror);
      for (let x = xa + 0.9; x < xb - 1.8; x += 0.8) bx(x - 0.02, x + 0.02, y + 0.95, y + 1.1, bm.zA + 0.1, bm.zA + 0.26, MT.steel);
      const stalls = Math.floor((bm.zB - bm.zA - 2.0) / 1.15);
      for (let i = 0; i <= stalls; i++) {
        const z = bm.zA + 1.7 + i * 1.15;
        cbx(xo + s * 0.1, xo + s * 1.5, y + 0.12, y + 2.0, z - 0.02, z + 0.02, MT.part);
        if (i < stalls) { bx(xo + s * 1.5 - 0.02, xo + s * 1.5 + 0.02, y + 0.12, y + 2.0, z + 0.05, z + 1.1, MT.part); wl(xo + s * 1.5, z, xo + s * 1.5, z + 1.15, y, y + 2.0); bx(xo + s * 0.25, xo + s * 0.75, y, y + 0.42, z + 0.35, z + 0.8, MT.machine); }
      }
      sign('浴廁', xi + (sideW ? 0.012 : -0.012), y + 2.5, sideW ? 16.0 : 17.0, inF, '#2a6fb0', 0.9);
      wall(xa, bm.zB, xb, bm.zB, y, c, MT.tileW, 0, { tile: [0.6, 0.6] });
    }
    // --- the 中廊
    {
      const hx0 = MID.hall0, hx1 = MID.hall1, zS = MID.z1;
      wall(hx0, CZ, hx0, zS + 0.15, y, c, MT.white, 1); wall(hx1, CZ, hx1, zS + 0.15, y, c, MT.white, -1); // (short of the outer wall's face at 19.4)
      if (f === 0) {
        room(f, hx0, hx1, CZ, 17.9); bx(hx0, hx1, y - SL, y, 17.9, 19.6, MT.floor, { tile: [2.4, 2.4] }); bx(hx0, hx1, c - 0.03, c + 0.05, 17.9, 19.4, MT.ceil); sfLow(hx0, hx1, 17.9, 19.6, y);
        // 白牆上的藍、綠直條和 CHUNG YUAN 字（影片 0:21）
        const stripe = canvasTex(1024, 256, (g) => { g.fillStyle = '#f3f2ec'; g.fillRect(0, 0, 1024, 256); const cols = ['#2f7fc6', '#27b3b0', '#79bd45', '#2f7fc6', '#27b3b0', '#2f7fc6', '#79bd45', '#27b3b0', '#2f7fc6']; cols.forEach((cl, i) => { g.fillStyle = cl; g.fillRect(40 + i * 110, 0, 34, 256); }); g.fillStyle = '#ffffff'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; [...'CHUNGYUAN'].forEach((ch, i) => g.fillText(ch, 57 + i * 110, i < 5 ? 60 : 200)); g.fillStyle = '#d8d4c8'; for (let i = 0; i < 8; i++) g.fillRect(96 + i * 110, 96, 40, 52); });
        plane(stripe, 8.6, 2.6, hx0 + T + 0.01, y + 1.45, (CZ + zS) / 2, 'e', { emissive: 0.4 }); plane(stripe, 8.6, 2.6, hx1 - T - 0.01, y + 1.45, (CZ + zS) / 2, 'w', { emissive: 0.4 });
      } else if (f === 1) {
        // 二樓：平的走道一路到南牆的門（門開在二樓地板高度），出門是牆外的平台和上天橋的樓梯（下面「牆外樓梯」）
        room(f, hx0, hx1, CZ, 19.3); bx(hx0, hx1, y - SL, y, 19.3, 19.4, MT.floor);
        sign('天橋 → 學生活動中心', (hx0 + hx1) / 2, y + 2.45, 19.27, 'n', '#2d3b4a', 2.0);
      } else {
        room(f, hx0, hx1, CZ, zS);
        wall(hx0, zS, hx1, zS, y, c, MT.white, -1); plane(winT, 2.2, 1.3, (hx0 + hx1) / 2, y + 1.7, zS - T - 0.01, 'n', { emissive: 0.7 });
        if (f === 2) for (const z of [12.2, 14.6, 17.0]) { cbx(hx0 + 0.5, hx1 - 0.5, y + 0.7, y + 0.75, z - 0.35, z + 0.35, MT.wood); for (const x of [hx0 + 0.9, hx1 - 0.9]) bx(x - 0.2, x + 0.2, y, y + 0.45, z + 0.5, z + 0.9, MT.chair); }
        else { cbx(hx0 + 0.2, hx0 + 1.0, y, y + 0.42, 11.5, 15.5, MT.sky); bx(hx0 + 0.2, hx0 + 0.42, y + 0.42, y + 0.85, 11.5, 15.5, MT.sky); cbx(hx1 - 0.5, hx1 - 0.15, y, y + 0.6, 12.4, 14.6, MT.wood); bx(hx1 - 0.3, hx1 - 0.24, y + 0.7, y + 1.4, 12.6, 14.4, MT.dark); }
      }
    }
    // --- filler ceilings / lining where the corridor passes the stair wells
    if (f === 0) for (const w of [WW, EW]) bx(w.g0, w.g1, y - SL - 0.3, y - 0.02, CZ, SG, MT.paving, { tile: [3, 3] }); // courtyard paving (surface below)
  }
  // top: roof over the galleries (the building's own roof has the two holes)
  for (const w of [WW, EW]) { bx(w.x0 - 0.1, w.x1 + 0.1, ROOF, ROOF + 0.2, RA - 0.1, CZ + 0.1, MT.ceil); bx(w.x0 - 0.1, w.g0 + 0.1, ROOF, ROOF + 0.2, CZ, RC + 0.1, MT.ceil); bx(w.g1 - 0.1, w.x1 + 0.1, ROOF, ROOF + 0.2, CZ, RC + 0.1, MT.ceil); bx(w.g0, w.g1, ROOF, ROOF + 0.2, SG - 0.1, RC + 0.1, MT.ceil); }

  // ---------------- courtyards (1F, open to the sky) ----------------
  for (const [w, east] of [[WW, false], [EW, true]]) {
    sf(w.g0, w.g1, CZ, SG, FL[0] - 0.02);
    const cx = (w.g0 + w.g1) / 2, cz = (CZ + SG) / 2, y = FL[0] - 0.02;
    // 涼亭（深色鋼架、透明頂）與野餐桌（相片 2023-01）
    const px0 = cx - 7, px1 = cx + 7, pz0 = cz - 3.4, pz1 = cz + 3.4;
    for (let x = px0; x <= px1 + 0.01; x += 4.67) for (const z of [pz0, pz1]) { cbx(x - 0.09, x + 0.09, y, y + 3.0, z - 0.09, z + 0.09, MT.pergola); bx(x - 0.22, x + 0.22, y, y + 0.35, z - 0.22, z + 0.22, MT.stair); }
    for (let x = px0; x <= px1 + 0.01; x += 4.67) bx(x - 0.06, x + 0.06, y + 3.0, y + 3.14, pz0 - 0.5, pz1 + 0.5, MT.pergola);
    for (const z of [pz0, cz, pz1]) bx(px0 - 0.5, px1 + 0.5, y + 3.14, y + 3.24, z - 0.05, z + 0.05, MT.pergola);
    bx(px0 - 0.5, px1 + 0.5, y + 3.24, y + 3.27, pz0 - 0.5, pz1 + 0.5, 'glass');
    for (const tx of [cx - 4.6, cx, cx + 4.6]) for (const tz of [cz - 1.6, cz + 1.6]) {
      cbx(tx - 0.9, tx + 0.9, y + 0.7, y + 0.75, tz - 0.38, tz + 0.38, MT.table);
      for (const s of [-1, 1]) { bx(tx - 0.9, tx + 0.9, y + 0.42, y + 0.46, tz + s * 0.62 - 0.14, tz + s * 0.62 + 0.14, MT.table); }
      for (const x of [tx - 0.7, tx + 0.7]) bx(x - 0.04, x + 0.04, y, y + 0.7, tz - 0.75, tz + 0.75, MT.pergola);
    }
    // 紅磚花台
    for (const [x0, x1, z0, z1] of [[w.g0 + 1.2, w.g0 + 5.5, CZ + 1.0, CZ + 2.2], [w.g1 - 5.5, w.g1 - 1.2, CZ + 1.0, CZ + 2.2], [w.g0 + 1.2, w.g0 + 5.5, SG - 2.2, SG - 1.0], [w.g1 - 5.5, w.g1 - 1.2, SG - 2.2, SG - 1.0]]) {
      cbx(x0, x1, y, y + 0.45, z0, z1, MT.brick, { tile: [0.5, 0.5] });
      for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.9) k.cyl(x, (z0 + z1) / 2, 0.36, y + 0.45, y + 1.05, MT.plant, { r1: 0.2, seg: 7 });
    }
    // 曬被場：不鏽鋼曬被架（分布圖：西棟天井西半、東棟天井整個）
    sign(east ? '大曬衣場 · 曬被場' : '曬被場 · 中庭', cx, FL[0] + 2.6, CZ - 0.1, 'n', '#2a8f8a', 2.0);
  }

  // ---------------- stairs ----------------
  stairs({ x0: BW.x0, x1: BW.x1, z0: BW.zB, z1: BW.z1, ax: 'x', dir: -1, wallM: MT.white });      // 西端
  stairs({ x0: BE.x0, x1: BE.x1, z0: BE.zB, z1: BE.z1, ax: 'x', dir: 1, wallM: MT.white });       // 東端
  scissor({ x0: WW.x1 + T, x1: WW.e, z0: SW.z0, z1: SW.z1, ld: SW.ld, nl: 0, open: 1 });  // 西棟靠中段（朝前院）：靠天井那條往北上
  scissor({ x0: EW.w, x1: EW.x0 - T, z0: SW.z0, z1: SW.z1, ld: SW.ld, nl: 1, open: -1 }); // 東棟靠中段（朝前院），鏡像
  // 樓梯間朝前院那一面：清水混凝土、藍白格子，二到四樓的樓梯平台往外凸出（實心混凝土欄板）、平台上方開口
  for (const [xf, xi, d] of [[SW.fW, WW.e, 1], [SW.fE, EW.w, -1]]) {
    const X = (a, b2) => [Math.min(xf + d * a, xf + d * b2), Math.max(xf + d * a, xf + d * b2)], za = SW.z1 - SW.ld, zb = SW.z1 + 0.1, zn = 19.55;
    const gy = (() => { const p = W(xf + d * 0.5, 22); return H(p[0], p[1]) - B; })();
    const P = (a, b2, y0, y1, z0, z1, m) => { const [xa, xb] = X(a, b2); bx(xa, xb, y0, y1, z0, z1, m); };
    P(0, 0.05, gy - 0.4, TOP + 0.6, zn, za, MT.conc);
    for (let f = 0; f < 5; f++) for (let j = 0; j < 3; j++) { const m = (f + j) % 2 ? MT.blue : j === 1 ? MT.white : null, zc = zn + 0.1 + j * (za - zn - 0.2) / 3; if (m) P(0.05, 0.07, FL[0] + f * ST + (j % 2) * 1.2, Math.min(TOP + 0.5, FL[0] + f * ST + (j % 2) * 1.2 + 1.7), zc, zc + (za - zn - 0.2) / 3, m); }
    const xin = Math.abs(xi - xf); // from the face back to the stair's lining
    let yy = gy - 0.4;
    for (let i = 0; i < 3; i++) {
      const yl = FL[0] + ST * (i + 1);
      P(-xin, 0.06, yy, yl - 0.25, za, zb, MT.conc);                 // wall up to the landing
      P(-xin, 0.85, yl - 0.25, yl + SW.sill, za - 0.1, zb, MT.conc); // the landing's projecting parapet
      yy = yl + SW.head;
    }
    P(-xin, 0.06, yy, TOP + 0.6, za, zb, MT.conc);
    P(-xin, 0.06, gy - 0.4, TOP + 0.6, za - 0.1, za + 0.1, MT.conc); P(-xin, 0.06, gy - 0.4, TOP + 0.6, zb - 0.2, zb, MT.conc); // jambs
  }
  stairs({ x0: sx, x1: sx + 3.3, z0: 0.25, z1: RA, ax: 'z', dir: -1, ld: 1.6, wallM: MT.blue }); // 中段北側
  for (const [x, z, face] of [[BW.x1 + 0.012, 23.6, 'e'], [BE.x0 - 0.012, 24.2, 'w']]) for (let f = 0; f < 4; f++) sign('樓梯 ↑↓', x, FL[f] + 2.5, z, face, '#2d3b4a', 1.0);

  // ---------------- elevator (東棟靠中段，分布圖「電梯」) ----------------
  {
    const rel = (f, x, z) => FL[f] + B - H(x, z);
    I.actions.push({
      poly: k.rect(EW.x0 + 0.05, EW.x0 + 1.5, 17.7, 19.7), y: 0, anyY: true,
      label: () => '按 <kbd>E</kbd> 搭電梯（1F → 2F → 3F → 4F）',
      fn: (g) => {
        const p = g.player; let cur = 0; for (let f = 0; f < 4; f++) if (p.y > rel(f, p.pos.x, p.pos.z) - 0.8) cur = f;
        const next = (cur + 1) % 4; p.y = rel(next, p.pos.x, p.pos.z) + 0.05; p.vy = 0;
        g.audio?.lift?.(); g.hud?.toast(`電梯 → ${next + 1}F`, 'good', 1200);
      },
    });
  }

  // ---------------- 276～281：六人房 ----------------
  {
    const f = 1, y = FL[f], c = y + CH[f], w = (ROWC_W.x1 - ROWC_W.x0) / 11, z0 = RC, z1 = ROWC_W.z1;
    OPEN_ROOMS.forEach((no) => {
      const i = no - 273, x0 = ROWC_W.x0 + i * w, x1 = x0 + w, cx = (x0 + x1) / 2, ix0 = x0 + T / 2, ix1 = x1 - T / 2;
      room(f, x0, x1, z0, z1 + 0.1, { lights: false, floor: MT.vinyl });
      bx(cx - 0.6, cx + 0.6, c - 0.06, c - 0.03, z0 + 2.2, z0 + 2.4, MT.light); bx(cx - 0.6, cx + 0.6, c - 0.06, c - 0.03, z0 + 5.0, z0 + 5.2, MT.light);
      // partitions (one per shared wall), south wall with the window, transom over the door, open door leaf with the number
      if (no === OPEN_ROOMS[0]) wall(x0, z0 + T, x0, z1, y, c, MT.white);
      wall(x1, z0 + T, x1, z1, y, c, MT.white);
      wall(x0, z1, x1, z1, y, c, MT.white, 1); plane(winT, 2.2, 1.35, cx, y + 1.75, z1 - 0.01, 'n', { emissive: 0.75 });
      plane(winT, 0.9, 0.34, cx, y + 2.5, z0 + T + 0.01, 's', { emissive: 0.6 });
      door(cx + 0.45 - 0.02, y, z0 + T + 0.45, 'w', String(no));
      // 每面牆：靠窗那端上下舖（爬梯也在靠窗那頭），接著 桌／衣櫥 三組，靠門那端的桌與衣櫥上面再架一張高架床（使用者給的配置，兩面牆相同）
      const zA = z0 + 0.95, LEN = z1 - 0.12 - zA, DW = 0.95, bedY = y + 1.72, BED = 2.0, DK = (LEN - BED) / 3 - 0.5, WD = 0.5;
      for (const side of [-1, 1]) {
        const wx = side < 0 ? ix0 : ix1, s = -side;                      // s: from the wall towards the aisle
        const X = (a, b2) => [Math.min(wx + s * a, wx + s * b2), Math.max(wx + s * a, wx + s * b2)];
        const Z = (t0, t1) => [zA + LEN - t1, zA + LEN - t0]; // t: distance from the window end (both walls: bunk by the window, loft bed by the door)
        const B3 = (a, b2, ya, yb, t0, t1, m) => { const [xa, xb] = X(a, b2), [za, zb] = Z(t0, t1); bx(xa, xb, ya, yb, za, zb, m); };
        const face = s > 0 ? 'e' : 'w', nos = side < 0 ? [1, 2, 3] : [4, 5, 6];
        const plate = (n, yy, t) => { const nt = signs.get('bed' + n) || signs.set('bed' + n, signTex(String(n), '#2e8f86', '#ffffff', 64, 64, 46)).get('bed' + n); plane(nt, 0.13, 0.13, wx + s * (DW + 0.006), yy, (Z(t, t)[0]), face, { emissive: 0.4 }); };
        const bed = (t0, t1, yy, n, gapAt0) => {                          // gapAt0: the gap in the side board (for the ladder) is at the t0 end                                  // deck + mattress + side board (with the number) + head / foot boards
          B3(0, DW, yy - 0.05, yy, t0, t1, MT.frame); B3(0.03, DW - 0.03, yy, yy + 0.12, t0 + 0.05, t1 - 0.05, MT.mattress);
          B3(DW - 0.025, DW, yy - 0.12, yy + 0.3, gapAt0 ? t0 + 0.5 : t0, gapAt0 ? t1 : t1 - 0.5, MT.wood); B3(0, DW, yy - 0.12, yy + 0.42, t0, t0 + 0.03, MT.wood); B3(0, DW, yy - 0.12, yy + 0.42, t1 - 0.03, t1, MT.wood);
          plate(n, yy + 0.12, gapAt0 ? t1 - 0.35 : t0 + 0.35);
        };
        const ladder = (t, top) => { for (const dt of [0, 0.36]) B3(DW, DW + 0.03, y, top, t + dt - 0.015, t + dt + 0.015, MT.ladder); for (let r = 0; r < 5; r++) B3(DW, DW + 0.03, y + 0.3 + r * 0.3, y + 0.33 + r * 0.3, t, t + 0.36, MT.ladder); };
        // 上下舖
        for (const t of [0.02, BED - 0.06]) for (const a of [0.0, DW - 0.04]) B3(a, a + 0.04, y, bedY + 0.45, t, t + 0.04, MT.frame);
        B3(0, DW, y, y + 0.3, 0.02, BED - 0.02, MT.wood); B3(0.03, DW - 0.03, y + 0.3, y + 0.42, 0.07, BED - 0.07, MT.mattress); plate(nos[0], y + 0.2, BED - 0.4);
        bed(0, BED, bedY, nos[1], true); ladder(0.1, bedY + 0.55); // 爬梯在靠窗那一端
        // 桌／衣櫥 三組；最後一組上面是高架床，那一組的衣櫥做矮的
        for (let u = 0; u < 3; u++) {
          const t0 = BED + u * (DK + WD), t1 = t0 + DK, t2 = t1 + WD, under = t1 > LEN - BED, wh = under ? bedY - 0.06 - y : 2.2;
          B3(0, 0.6, y + 0.72, y + 0.76, t0, t1, MT.desk);                                              // 桌面
          B3(0, 0.025, y, y + 1.62, t0, t1, MT.wood);                                                   // 背板
          for (const yy of [1.12, 1.4, 1.62]) B3(0, 0.28, y + yy - 0.025, y + yy, t0, t1, MT.wood);     // 上方層板
          B3(0.27, 0.28 - 0.0, y + 1.12, y + 1.62, (t0 + t1) / 2 - 0.012, (t0 + t1) / 2 + 0.012, MT.wood); B3(0, 0.28, y + 1.12, y + 1.62, (t0 + t1) / 2 - 0.012, (t0 + t1) / 2 + 0.012, MT.wood);
          B3(0, 0.55, y + 0.04, y + 0.07, t0, t1, MT.wood); B3(0, 0.55, y + 0.3, y + 0.33, t0, t1, MT.wood); // 桌下開放層架
          B3(0.3, 0.58, y + 0.56, y + 0.72, t0 + 0.04, t0 + 0.4, MT.wood);                              // 抽屜
          for (const yy of [0.95, 0.95]) B3(0.026, 0.03, y + yy, y + yy + 0.07, t0 + 0.2, t0 + 0.55, MT.ladder); // 插座面板
          B3(0, 0.6, y, y + wh, t1, t2, MT.wood);                                                       // 衣櫥
          B3(0.6, 0.604, y + 0.04, y + wh - 0.04, t1 + WD / 2 - 0.004, t1 + WD / 2 + 0.004, MT.frame);  // 門縫
          if (!under) B3(0.6, 0.604, y + 1.72, y + 1.728, t1 + 0.02, t2 - 0.02, MT.frame);
          for (const dt of [-0.06, 0.06]) B3(0.6, 0.625, y + 0.95, y + 1.13, t1 + WD / 2 + dt - 0.008, t1 + WD / 2 + dt + 0.008, MT.steel); // 把手
          B3(0.66, 0.98, y + 0.44, y + 0.47, t0 + 0.25, t0 + 0.65, MT.chair); B3(0.95, 0.98, y + 0.47, y + 0.85, t0 + 0.25, t0 + 0.65, MT.chair); B3(0.8, 0.84, y, y + 0.44, t0 + 0.43, t0 + 0.47, MT.steel); // 橘色椅子
        }
        // 另一端的高架床
        for (const t of [LEN - BED, LEN - 0.06]) for (const a of [0.0, DW - 0.04]) B3(a, a + 0.04, y, bedY + 0.45, t, t + 0.04, MT.frame);
        bed(LEN - BED, LEN, bedY, nos[2], true); ladder(LEN - BED + 0.1, bedY + 0.55);
        const [a, b2] = X(0, DW + 0.03); wlRect(a, b2, zA, zA + LEN, y, y + 2.2);
        // where people go (js/jianyu.js): bed decks, each desk with its chair; face = local angle towards the desk
        const R = (ROOM_SPOTS[no] ||= { door: [cx, z0 + T + 0.3], center: [cx, (z0 + z1) / 2], y, beds: {}, desks: [] });
        const mid = (p) => (p[0] + p[1]) / 2;
        R.beds[nos[0]] = { x: mid(X(0, DW)), z: mid(Z(0.07, BED - 0.07)), y: y + 0.42 };
        R.beds[nos[1]] = { x: mid(X(0, DW)), z: mid(Z(0, BED)), y: bedY + 0.12 };
        R.beds[nos[2]] = { x: mid(X(0, DW)), z: mid(Z(LEN - BED, LEN)), y: bedY + 0.12 };
        for (let u = 0; u < 3; u++) {
          const t0 = BED + u * (DK + WD), t1 = t0 + DK;
          R.desks.push({ side, u, bed: t1 > LEN - BED ? nos[2] : null, x: mid(X(0, 0.6)), z: mid(Z(t0, t1)), chair: { x: mid(X(0.66, 0.98)), z: mid(Z(t0 + 0.25, t0 + 0.65)) }, face: Math.atan2(-s, 0) });
        }
      }
      sign(`${no} 寢`, cx, y + 2.52, z0 - 0.02, 'n', '#59833a', 0.7);
    });
  }

  // ---------------- 1F 大門（中段南面，天橋正下方）----------------
  {
    const x0 = MID.door0, x1 = MID.door1, zf = 19.4, zs = 19.6, zE = 21.6;
    const [gx, gz] = W((x0 + x1) / 2, zE + 0.3), drop = Math.max(0.15, F1 - (H(gx, gz) - B)), n = Math.max(1, Math.round(drop / 0.16));
    sfLow(x0 - 0.6, x1 + 0.6, zs, zE, (lx, lz) => F1 - drop * clamp01((lz - zs) / (zE - zs)));
    for (let i = 0; i < n; i++) bx(x0 - 0.6, x1 + 0.6, F1 - drop - 0.6, F1 - drop * (i + 1) / n, zs + (zE - zs) * i / n, zs + (zE - zs) * (i + 1) / n, MT.stone, { tile: [1, 1] });
    for (const x of [x0 - 0.6, x1 + 0.6]) wl(x, zs, x, zE - 0.5, F1 - drop + 0.5, F1 + 1.0);
    // 磁磚門框與金字「力行大樓」（影片 0:17）
    for (const [a, b2] of [[x0 - 0.7, x0], [x1, x1 + 0.7]]) bx(a, b2, F1 - 0.3, F1 + 3.0, zf, zf + 0.35, MT.tileW, { tile: [0.3, 0.3] });
    bx(x0 - 0.7, x1 + 0.7, F1 + 2.3, F1 + 3.0, zf, zf + 0.35, MT.tileW, { tile: [0.3, 0.3] });
    const gold = canvasTex(512, 128, (g) => { g.fillStyle = '#e9e7df'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#b8892b'; g.font = `900 84px "Noto Serif TC","Songti TC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; [...'力行大樓'].forEach((ch, i) => g.fillText(ch, 76 + i * 120, 68)); });
    plane(gold, 2.5, 0.62, (x0 + x1) / 2, F1 + 2.65, zf + 0.36, 's', { emissive: 0.35 });
    // 2F 天橋門框（門開在二樓地板高度）
    for (const [a, b2] of [[x0 - 0.25, x0], [x1, x1 + 0.25]]) bx(a, b2, F2 - 0.2, F2 + 2.5, zf - 0.1, zf + 0.12, MT.band);
    bx(x0 - 0.25, x1 + 0.25, F2 + 2.3, F2 + 2.55, zf - 0.1, zf + 0.12, MT.band);
  }

  // ---------------- 牆外樓梯：二樓門口的平台 → 沿天橋方向往上 → 天橋橋面（一樓大門在它正下方）----------------
  // 天橋（橋面和模型）從 zT 才開始（data.grade 的 cut0，js/map.js）；這裡的平台和樓梯是一般的室內地面（高度從地面算），
  // 樓梯頂的平台和橋面北端重疊一小段，走上橋面時由 js/player.js 接手。
  let stairY = null;
  if (DL > F2 + 0.3) {
    const gi = data?.grade?.find(v => v.id === FB_ID), cut = gi?.cut0 ?? FB_CUT;
    const zf = 19.4, zL = zf + 1.3, zT = (gi ? k.l(gi.path[0][0], gi.path[0][1])[1] : zf) + cut;
    const x0 = MID.door0 - 0.05, x1 = MID.door1 + 0.05, rise = DL - F2, run = zT - zL, n = Math.max(6, Math.round(rise / 0.16));
    const yAt = (lz) => F2 + rise * clamp01((lz - zL) / run);
    bx(x0, x1, F2 - 0.2, F2, zf, zL, MT.stair); sf(x0, x1, zf - 0.1, zL, F2);
    sf(x0, x1, zL, zT, (lx, lz) => yAt(lz));
    for (let i = 0; i < n; i++) bx(x0, x1, F2 + rise * (i + 1) / n - 0.3, F2 + rise * (i + 1) / n, zL + run * i / n, zL + run * (i + 1) / n, MT.stair);
    sf(x0, x1, zT, zT + 1.3, DL);
    // 兩側：斜的側板、扶手和欄杆柱（天橋桁架的橘色），碰撞一路到橋面
    const slant = (x, w, h, dy) => { const g = new THREE.BoxGeometry(w, h, Math.hypot(run, rise)); g.rotateX(-Math.atan2(rise, run)); g.translate(x, F2 + rise / 2 + dy, zL + run / 2); k._part(MT.orange, g); };
    for (const x of [x0 + 0.04, x1 - 0.04]) {
      slant(x, 0.08, 0.34, -0.2); slant(x, 0.06, 0.06, 1.0);
      bx(x - 0.03, x + 0.03, F2 + 0.97, F2 + 1.03, zf + 0.12, zL, MT.orange);
      for (let i = 0; i <= n; i += 2) { const z = zL + run * i / n; bx(x - 0.025, x + 0.025, yAt(z) - 0.05, yAt(z) + 1.0, z - 0.025, z + 0.025, MT.orange); }
      bx(x - 0.025, x + 0.025, F2, F2 + 1.0, zf + 0.6, zf + 0.65, MT.orange);
      wl(x < 58.8 ? x0 : x1, zf, x < 58.8 ? x0 : x1, zT + 1.3, F2 - 0.3, DL + 1.2);
    }
    // 樓梯頂（天橋北端）下面的兩支柱子和橫梁
    const gy = (x, z) => { const p = W(x, z); return H(p[0], p[1]) - B; };
    for (const x of [x0 - 0.12, x1 + 0.12]) cbx(x - 0.12, x + 0.12, gy(x, zT + 0.2) - 0.4, DL - 0.4, zT + 0.08, zT + 0.32, MT.orange);
    bx(x0 - 0.24, x1 + 0.24, DL - 0.7, DL - 0.4, zT + 0.08, zT + 0.32, MT.orange);
    stairY = (wx, wz) => { const [lx, lz] = k.l(wx, wz); return lz < zT && lz > zf - 0.5 && lx > x0 - 0.3 && lx < x1 + 0.3 ? B + yAt(lz) : undefined; };
    // 行人（js/npc.js）走這條天橋到北端時，沿樓梯下到二樓門口，不要掉到地面
    const way = data?.roads?.find(r => r.grade === FB_ID); if (way) way.deckY = stairY;
  }

  // ---------------- 兩翼一樓朝前院挖空的那一格：地板延伸到牆面、往前院下去的台階 ----------------
  for (const [xf, xi, d] of [[SW.fW, WW.e, 1], [SW.fE, EW.w, -1]]) {
    const z0 = WD.z0, z1 = WD.z1, xs = xf + d * 0.3, xe = xf + d * 2.0, lo = Math.min, hi = Math.max;
    const [gx, gz] = W(xe + d * 0.3, (z0 + z1) / 2), drop = Math.max(0.15, F1 - (H(gx, gz) - B)), n = Math.max(1, Math.round(drop / 0.16));
    bx(lo(xi, xs), hi(xi, xs), F1 - SL, F1, z0, z1, MT.floor); sf(lo(xi - d * 0.1, xs), hi(xi - d * 0.1, xs), z0, z1, F1);
    bx(lo(xi, xf), hi(xi, xf), F1 + CLR - 0.03, F1 + CLR + 0.05, z0, z1, MT.ceil);
    sf(lo(xs, xe), hi(xs, xe), z0, z1, (lx) => F1 - drop * clamp01((lx - xs) / (xe - xs)));
    for (let i = 0; i < n; i++) { const a = xs + (xe - xs) * i / n, c2 = xs + (xe - xs) * (i + 1) / n; bx(lo(a, c2), hi(a, c2), F1 - drop - 0.6, F1 - drop * (i + 1) / n, z0, z1, MT.stone, { tile: [1, 1] }); }
    for (const z of [z0, z1]) wl(xs, z, xe - d * 0.5, z, F1 - drop + 0.5, F1 + 1.0);
  }

  // ---------------- 沿新中北路的一層樓門房（街景 2026-05）----------------
  {
    const A = ANNEX, [ax, az] = W((A.gate0 + A.gate1) / 2, (A.z0 + A.z1) / 2), g = H(ax, az) - B, yT = g + A.h;
    const gy = (x, z) => { const p = W(x, z); return H(p[0], p[1]) - B; };
    const block = (x0, x1) => { const lo = Math.min(gy(x0, A.z0), gy(x1, A.z1), gy(x0, A.z1), gy(x1, A.z0)) - 0.4; bx(x0, x1, lo, yT, A.z0, A.z1, MT.stone, { tile: [1.2, 1.2] }); wlRect(x0, x1, A.z0, A.z1, lo, yT + 0.5); };
    block(A.x0, 46.2);        // 早餐屋
    block(47.6, A.gate0);     // 會客室
    block(A.gate1, 70.5);     // 傳達室
    block(70.5, A.x1);        // 公佈欄那段
    // 早餐屋與會客室之間：鐵捲門（關著，不能通行；使用者說的通道在早餐屋西側，見上面）
    bx(46.2, 47.6, g - 0.4, yT, A.z0 + 0.4, A.z1 - 0.3, MT.shutter); wl(46.2, A.z1 - 0.3, 47.6, A.z1 - 0.3, g - 0.4, yT); wl(46.2, A.z0 + 0.4, 47.6, A.z0 + 0.4, g - 0.4, yT);
    // 平屋頂與出挑雨遮（往街上挑 1.4 m）、女兒牆
    bx(A.x0 - 0.3, A.x1 + 0.3, yT, yT + 0.22, A.z0 - 0.5, A.z1 + 1.4, MT.canopy);
    bx(A.x0 - 0.3, A.x1 + 0.3, yT + 0.22, yT + 0.6, A.z0 - 0.5, A.z0 - 0.35, MT.canopy);
    // 大門：兩側石柱、上方紅色格柵、拉開的鐵柵門、旋轉閘門
    for (const x of [A.gate0 + 0.15, A.gate1 - 0.15]) cbx(x - 0.15, x + 0.15, g - 0.4, yT, A.z1 - 0.7, A.z1 - 0.3, MT.stone);
    bx(A.gate0, A.gate1, g + 2.45, yT, A.z1 - 0.55, A.z1 - 0.45, MT.lattice);
    { const x0 = A.gate0 + 0.3, x1 = A.gate0 + 2.3, z = A.z1 - 0.2; for (let x = x0; x <= x1 + 0.01; x += 0.25) bx(x - 0.02, x + 0.02, g, g + 1.9, z - 0.02, z + 0.02, MT.grille); for (const yy of [0.1, 0.65, 1.2, 1.85]) bx(x0, x1, g + yy, g + yy + 0.05, z - 0.025, z + 0.025, MT.grille); wl(x0, z, x1, z, g, g + 1.9); }
    { const tx = A.gate0 + 0.9, tz = A.z0 + 1.2; k.cyl(tx, tz, 0.05, g, g + 2.1, MT.steel); for (let a = 0; a < 3; a++) for (const yy of [0.5, 0.9, 1.3, 1.7]) { const gm = new THREE.BoxGeometry(0.75, 0.03, 0.03).translate(0.375, 0, 0); gm.rotateY(a * Math.PI * 2 / 3); gm.translate(tx, g + yy, tz); k._part(MT.steel, gm); } wlRect(tx - 0.5, tx + 0.5, tz - 0.5, tz + 0.5, g, g + 2.0); }
    // 看板：早餐屋、中原大學租屋訊息、會客室、傳達室、力行宿舍公佈欄、禁止停車
    const zF = A.z1 + 0.02, board = (text, x, w, bg, yy = 1.9, h = 0.5) => { const key = 'bd' + text; if (!signs.has(key)) signs.set(key, signTex(text, bg, '#ffffff', 1024, 128, 76)); plane(signs.get(key), w, h, x, g + yy, zF, 's', { emissive: 0.35 }); };
    board('早餐屋', 42.2, 2.2, '#c0562a'); board('中原大學租屋訊息', 51.9, 3.6, '#2b5fae'); board('傳達室', 64.0, 2.0, '#3a4a5a'); board('力行宿舍公佈欄', 76.5, 3.6, '#1f2f9a');
    bx(74.6, 78.4, g + 0.75, g + 1.62, zF - 0.01, zF + 0.02, MT.white);
    bx(40.9, 43.5, g + 0.9, g + 1.6, zF - 0.01, zF + 0.02, MT.dark); // 早餐屋的窗口
    plane(winT, 1.4, 1.5, 67.6, g + 1.5, zF, 's', { emissive: 0.3 });  // 傳達室鐵窗
    for (let x = 66.95; x < 68.3; x += 0.14) bx(x - 0.012, x + 0.012, g + 0.75, g + 2.25, zF, zF + 0.03, MT.grille);
    board('會客室', 53.6, 1.6, '#3a4a5a', 2.55, 0.36);
    // 朝前院那面的門
    door(52.0, g, A.z0 - 0.012, 'n', '會客室', '#e9e9e4'); door(65.0, g, A.z0 - 0.012, 'n', '傳達室', '#e9e9e4'); door(42.0, g, A.z0 - 0.012, 'n', '早餐屋', '#e9e9e4');
  }

  // ---------------- outer shell: collision along the outline, gaps at the 1F 大門 and the 2F door to the outside stair ----------------
  {
    const P = b.pts, isMidS = (a, c) => { const la = k.l(a[0], a[1]), lc = k.l(c[0], c[1]); return Math.abs(la[1] - 19.4) < 0.3 && Math.abs(lc[1] - 19.4) < 0.3; };
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length];
      if (isMidS(a, c)) continue;
      { const la = k.l(a[0], a[1]), lc = k.l(c[0], c[1]), xf = [SW.fW, SW.fE].find(x => Math.abs(la[0] - x) < 0.3 && Math.abs(lc[0] - x) < 0.3);
        if (xf !== undefined) { // a wing's face on the forecourt: open at 1F where it is hollowed out
          const lo = Math.min(la[1], lc[1]), hi = Math.max(la[1], lc[1]);
          wl(xf, lo, xf, WD.z0, -1, TOP + 1); wl(xf, WD.z1, xf, hi, -1, TOP + 1); wl(xf, WD.z0, xf, WD.z1, F1 + CLR, TOP + 1); continue;
        } }
      const g = H((a[0] + c[0]) / 2, (a[1] + c[1]) / 2); I.addWall(a[0], a[1], c[0], c[1], B - g - 1, B - g + TOP + 1);
    }
    wl(MID.x0, 19.4, MID.door0, 19.4, -1, TOP + 1); wl(MID.door1, 19.4, MID.x1, 19.4, -1, TOP + 1);
    wl(MID.door0, 19.4, MID.door1, 19.4, F1 + 2.3, F2 - 0.05); wl(MID.door0, 19.4, MID.door1, 19.4, F2 + 2.3, TOP + 1);
    if (collision) {
      const pi = collision.polys.findIndex(p => p.pts === P || (p.pts.length === P.length && p.pts.every((q, i) => Math.abs(q[0] - P[i][0]) < 1e-6 && Math.abs(q[1] - P[i][1]) < 1e-6)));
      if (pi >= 0) {
        // the solid footprint goes: its outline becomes points on one corner in a height band nothing reaches
        const Q = collision.polys[pi], c0 = P[0];
        Q.pts = P.map(() => [c0[0], c0[1]]); Q.top = -Infinity;
        for (let i = 0; i < P.length; i++) collision.segs[Q.s0 + i] = [c0[0], c0[1], c0[0], c0[1], 1e8, 1e8 + 1];
      } else console.warn('[lixing] 力行大樓的碰撞輪廓找不到，室內進不去');
      // 執行期生成（機車、行人、空投）別生在宿舍裡：原本這裡整塊算擋住，結果一樣
      if (Array.isArray(collision.reserved)) collision.reserved.push(P.map(p => [p[0], p[1]]));
    }
  }

  // ---------------- camera / location zones (not over the courtyards: they are outdoors) ----------------
  {
    const g0 = H(...W(60, 10)), relF = FL.map(v => v + B - g0);
    const floorOf = (yy) => { let f = 1; for (let i = 0; i < 4; i++) if (yy > relF[i] - 1.2) f = i + 1; return f; };
    const ceil = (yy) => yy + 2.6;
    const zone = (x0, x1, z0, z1) => I.zones.push({ name: '力行宿舍', pts: k.rect(x0, x1, z0, z1), y0: -1.5, y1: TOP + 2, ceil, floorOf });
    zone(0, NX, 0, CZ); zone(MID.x0, MID.x1, CZ, 19.4);
    zone(BW.x0 - 0.2, 0, BW.z0 - 0.2, BW.z1 + 0.2); zone(BE.x0, BE.x1 + 0.2, BE.z0 - 0.2, BE.z1 + 0.3);
    for (const [w, xa, xb] of [[WW, 0, 37.5], [EW, 85.5, 122.6]]) { zone(xa, xb, SG, 34.7); zone(Math.min(w.x0, xa), w.g0, CZ, SG); zone(w.g1, Math.max(w.x1, xb), CZ, SG); }
    // (the strips between a courtyard and the middle block hold the stairs and their passages to the main corridor)
  }

  doorTex.needsUpdate = true;
  k.finish(scene);
  I.lixing = { k, FL, DL, B, W, stairY, rooms: ROOM_SPOTS, setFeet: (v) => { feet = v; } };
  return I.lixing;
}
