// 黃蓋瑞家：孫師傅牛肉拉麵（彥霖以前住的地方）隔壁那戶的 2 樓，同一層、不同戶。
// 臨中北路那一排是 js/street_zhongbei.js 照街景蓋的店面（隔壁是「五折天」、再過去「扑藝 salon」，只做外觀），
// 所以蓋瑞家是它們後面的一棟 3 層樓後棟：x 跟原本的 f900／f901 一樣（從彥霖那棟的牆到 13.8 m），z 從 10.4 m 到 19.1 m，
// 跟五折天的後牆之間留一道採光井。從彥霖那棟 2 樓樓梯口右側牆的門（interiors.js buildYanlinHome 的 GZ0..GZ1）
// 進來是一條走廊，房門在房間右側牆的下方。
// 房間照使用者畫的平面圖（從上往下看，不能鏡射）：轉 180 度放進來——圖的右邊 = 彥霖家那側（x 小），圖的上方 = 後巷（z 大）。
// 每件家具都用圖上的像素座標換算（下面的 PX / PZ / rectOf），房間外框在圖上是 (105,120)–(1920,1898)：
//   左上 床 · 上方 對外窗下的桌子（筆電、文具、wifi 機、延長線、充電中的手機、吐司小夜燈），椅子在桌子下方
//   右上 衣櫃 · 右邊中間 電視 · 右下 門 · 左邊中間 小對外窗下的 IKEA 沙發（面對電視）
//   中間偏左下 放 K-pop 專輯和手燈的桌子（椅子在它上方），再下面緊鄰 左下角的浴室（門開在浴室右邊牆，對著房門）
// 座標：彥霖那棟的方向，原點沿 z 往裡移 DZ（Kit 的 local z 0 = 世界上離中北路立面 10.4 m），單位公尺。
// 2F 樓板跟彥霖那棟同高（彥霖那棟地面 + 4.617 m）。
import * as THREE from 'three';
import { H } from '../Terrain.js';
import { makeLightstick, CONCERTS } from '../../systems/minigames/Concert.js';

export const GARRY = { X0: 5.82, X1: 13.8, DZ: 10.4, D: 8.7, F2: 4.617, FH: 3.3, NF: 3 };
const RX0 = 7.1, RX1 = 13.6, RZ0 = 2.1, RZ1 = 8.5; // the room: 6.5 x 6.4 m (the drawing is almost square)
// the drawing -> the room (turned 180 degrees: drawing right = small x, drawing top = large z)
const PX = (px) => RX1 - (px - 105) / 1815 * (RX1 - RX0), PZ = (py) => RZ1 - (py - 120) / 1778 * (RZ1 - RZ0);
const rectOf = (l, t, r, b) => ({ x0: PX(r), x1: PX(l), z0: PZ(b), z1: PZ(t), cx: (PX(l) + PX(r)) / 2, cz: (PZ(t) + PZ(b)) / 2 });
export const GARRY_PLAN = { // rectangles measured off the drawing (pixels: left, top, right, bottom)
  bed: [185, 175, 850, 630], desk: [963, 175, 1628, 377], chair: [1162, 425, 1438, 545], wardrobe: [1675, 262, 1875, 715], tv: [1707, 782, 1875, 1295],
  sofa: [185, 702, 353, 1295], chair2: [587, 960, 862, 1080], desk2: [435, 1110, 1015, 1318], bath: [160, 1380, 1077, 1835],
  winTop: [1158, 120, 1472, 120], winLeft: [105, 802, 105, 1153], door: [1920, 1432, 1920, 1782],
};
const PL = Object.fromEntries(Object.entries(GARRY_PLAN).map(([n, q]) => [n, rectOf(...q)]));
const CW0 = 6.0, CZ0 = RZ0, CZ1 = 4.4;            // corridor x CW0..RX0, z CZ0..CZ1
const DZ0 = PL.door.cz - 0.5, DZ1 = PL.door.cz + 0.5; // room door (drawing: right wall, near the bottom), straight across the corridor from 彥霖's landing
const LDZ0 = 12.72 - 10.4, LDZ1 = 13.88 - 10.4;   // doorway from 彥霖's landing (YH local 9.42..10.28 x 1.35, minus DZ)

// the back building's outline (trees and street furniture keep off it)
export function garryOutline(YH) {
  const c = Math.cos(YH.ang), s = Math.sin(YH.ang), w = (x, z) => [YH.ox + x * c - z * s, YH.oz + x * s + z * c], z0 = GARRY.DZ, z1 = GARRY.DZ + GARRY.D;
  return [w(GARRY.X0, z0 - 0.4), w(GARRY.X1, z0 - 0.4), w(GARRY.X1, z1), w(GARRY.X0, z1)];
}

function tex(w, h, draw, rep) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

export function buildGarryHome(I, scene, Kit, regMat, YH) {
  const G = GARRY, c0 = Math.cos(YH.ang), s0 = Math.sin(YH.ang);
  const k = new Kit(I, YH.ox - G.DZ * s0, YH.oz + G.DZ * c0, YH.ang, 1), base = k.base;
  // I.addWall's heights count from the ground under each wall's midpoint (js/physworld.js adds it back); this house's count from base
  k.wallLine = (x0, z0, x1, z1, y0, y1) => { const a = k.w(x0, z0), b = k.w(x1, z1), g = base - H((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); I.addWall(a[0], a[1], b[0], b[1], y0 + g, y1 + g); };
  k.wallRect = (x0, x1, z0, z1, y0, y1) => { k.wallLine(x0, z0, x1, z0, y0, y1); k.wallLine(x1, z0, x1, z1, y0, y1); k.wallLine(x1, z1, x0, z1, y0, y1); k.wallLine(x0, z1, x0, z0, y0, y1); };
  const F = H(YH.ox, YH.oz) + G.F2 - base, CH = F + 2.85, top = F + (G.NF - 1) * G.FH; // 2F level with 彥霖's landing
  const std = (o, lift = 0) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.5, ...o }); if (lift) { m.emissive.set(o.color || '#ffffff'); if (o.map) m.emissiveMap = o.map; m.emissiveIntensity = lift; } return m; };
  const T = {
    facade: tex(128, 128, (g) => { g.fillStyle = '#c7c3bb'; g.fillRect(0, 0, 128, 128); const r = lcg(9); for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 16) { const v = 200 + (r() * 22 | 0); g.fillStyle = `rgb(${v},${v - 3},${v - 9})`; g.fillRect(x + 1, y + 1, 15, 7); } }, true),
    wood: tex(256, 256, (g) => { const r = lcg(4); for (let y = 0; y < 256; y += 32) { g.fillStyle = `rgb(${170 + r() * 20 | 0},${128 + r() * 16 | 0},${86 + r() * 12 | 0})`; g.fillRect(0, y, 256, 31); g.fillStyle = 'rgba(80,50,20,.25)'; g.fillRect(0, y + 31, 256, 1); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(100,60,30,.18)'; g.beginPath(); const yy = y + 3 + r() * 26; g.moveTo(0, yy); g.bezierCurveTo(90, yy + 3, 170, yy - 3, 256, yy); g.stroke(); } } }, true),
    shutter: tex(128, 128, (g) => { g.fillStyle = '#9aa1a6'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 8) { g.fillStyle = '#7f868b'; g.fillRect(0, y + 6, 128, 2); } }, true),
    tile: tex(128, 128, (g) => { g.fillStyle = '#dde3e6'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { g.fillStyle = (x + y) % 64 ? '#eef2f3' : '#e4eaec'; g.fillRect(x + 1, y + 1, 30, 30); } }, true),
    duvet: tex(256, 256, (g) => { g.fillStyle = '#7d97b5'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } }),
    win: tex(256, 160, (g) => { g.fillStyle = '#c8cbcf'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#5d6f7d'; g.fillRect(10, 10, 236, 140); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(18, 14, 50, 132); g.fillStyle = '#c8cbcf'; g.fillRect(124, 0, 8, 160); g.fillStyle = 'rgba(48,48,46,0.92)'; for (let x = 16; x < 256; x += 20) g.fillRect(x, 0, 3, 160); g.fillRect(0, 52, 256, 3); g.fillRect(0, 108, 256, 3); }),
    screen: tex(256, 160, (g) => { const gr = g.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, '#2d6cdf'); gr.addColorStop(1, '#9b5cff'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 22px sans-serif'; g.fillText('古箏社 期末成發', 18, 40); g.font = '700 14px sans-serif'; for (let i = 0; i < 5; i++) g.fillRect(18, 60 + i * 16, 120 + (i * 37) % 90, 6); }),
    tv: tex(256, 144, (g) => { const gr = g.createLinearGradient(0, 0, 256, 144); gr.addColorStop(0, '#ff4fa3'); gr.addColorStop(1, '#7b5bff'); g.fillStyle = gr; g.fillRect(0, 0, 256, 144); g.fillStyle = '#fff'; g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.fillText('K-POP 舞台精選', 128, 82); }),
  };
  const def = (key, m) => regMat(key, m);
  const MT = {
    facade: def('grFacade', std({ map: T.facade })), shutter: def('grShutter', std({ map: T.shutter, metalness: 0.3 })),
    plaster: def('grPlaster', std({ color: '#f1efe9' }, 0.3)), floor: def('grFloor', std({ map: T.wood, roughness: 0.5 }, 0.15)),
    ceil: def('grCeil', std({ color: '#f6f5f1' }, 0.45)), tile: def('grTile', std({ map: T.tile, color: '#e0e4e8', roughness: 0.5 }, 0.16)),
    oak: def('grOak', std({ color: '#c49a6c', roughness: 0.55 }, 0.12)), white: def('grWhite', std({ color: '#f4f4f1', roughness: 0.45 }, 0.15)),
    black: def('grBlack', std({ color: '#1c1c20', roughness: 0.4 })), grey: def('grGrey', std({ color: '#8d9297', roughness: 0.9 }, 0.1)),
    sofa: def('grSofa', std({ color: '#6f7a80', roughness: 0.95 }, 0.12)), metal: def('grMetal', std({ color: '#b9bec3', metalness: 0.7, roughness: 0.3 })),
    door: def('grDoor', std({ color: '#7b5a3e', roughness: 0.55 }, 0.1)), porcelain: def('grPorc', std({ color: '#d9dad8', roughness: 0.4 }, 0.05)),
    glass: 'glass', light: def('grLight', new THREE.MeshStandardMaterial({ color: '#fff8ea', emissive: '#fff4dc', emissiveIntensity: 1.1 })),
  };
  const at = (x, z) => { const q = k.w(x, z); return { x: q[0], z: q[1], y: F + base - H(q[0], q[1]) }; };
  const surf = (x0, x1, z0, z1, h) => I.addSurface(k.rect(x0, x1, z0, z1), (x, z) => base + h - H(x, z));
  const box = (x0, x1, y0, y1, z0, z1, m, o) => k.box(x0, x1, y0, y1, z0, z1, m, o);
  const nc = { col: false };

  // ---------------- shell: 4-storey 透天, tiled facade, 1F shutter, windows with grilles, roof extension ----------------
  const X0 = G.X0, X1 = G.X1;
  // shared side wall with 彥霖's house: a doorway at the 2F landing (the way in, LDZ0..LDZ1), solid everywhere else
  box(X0, X0 + 0.18, -0.6, top, 0, LDZ0, MT.facade, { tile: [0.6, 0.6] }); box(X0, X0 + 0.18, -0.6, top, LDZ1, G.D, MT.facade, { tile: [0.6, 0.6] });
  box(X0, X0 + 0.18, -0.6, F, LDZ0, LDZ1, MT.facade); box(X0, X0 + 0.18, F + 2.18, top, LDZ0, LDZ1, MT.facade);
  const tl = { tile: [0.6, 0.6] };
  // side wall (drawing left) with the small window over the sofa, back wall (drawing top) with the small window over the desk
  const LW0 = PL.winLeft.z0, LW1 = PL.winLeft.z1, LY0 = F + 1.15, LY1 = F + 1.95, WX0 = PL.winTop.x0, WX1 = PL.winTop.x1, WY0 = F + 1.05, WY1 = F + 2.0;
  box(X1 - 0.2, X1, -0.6, top, 0, LW0, MT.facade, tl); box(X1 - 0.2, X1, -0.6, top, LW1, G.D, MT.facade, tl);
  box(X1 - 0.2, X1, -0.6, LY0, LW0, LW1, MT.facade, tl); box(X1 - 0.2, X1, LY1, top, LW0, LW1, MT.facade, tl);
  box(X0, WX0, -0.6, top, G.D - 0.2, G.D, MT.facade, tl); box(WX1, X1, -0.6, top, G.D - 0.2, G.D, MT.facade, tl);
  box(WX0, WX1, -0.6, WY0, G.D - 0.2, G.D, MT.facade, tl); box(WX0, WX1, WY1, top, G.D - 0.2, G.D, MT.facade, tl);
  // both windows: aluminium frame, two sliding panes, an iron grille outside
  box(X1 - 0.12, X1 - 0.09, LY0, LY1, LW0, LW1, MT.glass); box(WX0, WX1, WY0, WY1, G.D - 0.12, G.D - 0.09, MT.glass);
  const fr = 0.035, mz = (LW0 + LW1) / 2, mx = (WX0 + WX1) / 2;
  for (const [z0, z1, y0, y1] of [[LW0, LW1, LY0, LY0 + fr], [LW0, LW1, LY1 - fr, LY1], [LW0, LW0 + fr, LY0, LY1], [LW1 - fr, LW1, LY0, LY1], [mz - 0.02, mz + 0.02, LY0, LY1]]) box(X1 - 0.14, X1 - 0.07, y0, y1, z0, z1, MT.metal, nc);
  for (const [x0, x1, y0, y1] of [[WX0, WX1, WY0, WY0 + fr], [WX0, WX1, WY1 - fr, WY1], [WX0, WX0 + fr, WY0, WY1], [WX1 - fr, WX1, WY0, WY1], [mx - 0.02, mx + 0.02, WY0, WY1]]) box(x0, x1, y0, y1, G.D - 0.14, G.D - 0.07, MT.metal, nc);
  for (let z = LW0 + 0.1; z < LW1; z += 0.16) box(X1 + 0.02, X1 + 0.04, LY0, LY1, z - 0.01, z + 0.01, MT.black, nc);
  for (let x = WX0 + 0.1; x < WX1; x += 0.16) box(x - 0.01, x + 0.01, WY0, WY1, G.D + 0.02, G.D + 0.04, MT.black, nc);
  box(X0, X1, top - 0.2, top, 0, G.D, 'gray', nc);
  box(X0, X1, top, top + 0.9, -0.05, 0.15, MT.facade, nc);
  box(X0 + 0.4, X1 - 0.4, top, top + 2.4, 4, G.D - 0.4, '#8a959d', nc);         // 頂樓加蓋
  box(X0 + 0.6, X0 + 1.8, top, top + 1.1, 2.5, 3.7, 'steel', nc);                // water tank
  // front on the light well behind 五折天: plain wall, 3F windows; back wall: windows on 1F and 3F
  box(X0 + 0.18, X1 - 0.2, -0.6, top, 0, 0.2, MT.facade, tl);
  k.plane(T.win, 2.6, 1.4, (X0 + X1) / 2 - 1, F + G.FH + 1.55, -0.01, Math.PI);
  for (const y of [0.4, F + G.FH]) k.plane(T.win, 2.2, 1.3, (X0 + X1) / 2, y + 1.6, G.D + 0.01, 0);

  // ---------------- 2F: floor, ceiling, corridor ----------------
  box(X0 + 0.18, X1 - 0.2, F - 0.25, F, 0.2, RZ1, MT.floor, { col: false, tile: [1.2, 1.2] });
  surf(RX0 - 0.02, RX1, RZ0, RZ1, F); surf(CW0, RX0, CZ0, CZ1, F);
  box(CW0 - 0.18, RX1, CH, CH + 0.06, RZ0 - 0.12, RZ1, MT.ceil, nc);
  // corridor: front end (runs on as the room's bottom wall), back end; the room's right wall with its door
  box(CW0, RX1, F, CH, RZ0 - 0.12, RZ0, MT.plaster);
  box(RX0, RX0 + 0.12, F, CH, RZ0, DZ0, MT.plaster); box(RX0, RX0 + 0.12, F, CH, DZ1, RZ1, MT.plaster);
  box(RX0, RX0 + 0.12, F + 2.1, CH, DZ0, DZ1, MT.plaster, nc);
  box(CW0, RX0 + 0.12, F, CH, CZ1, CZ1 + 0.2, MT.plaster);
  // the shared wall: doorway from 彥霖's landing
  box(X0 + 0.18, CW0, F, CH, CZ0, LDZ0, MT.plaster, nc); box(X0 + 0.18, CW0, F, CH, LDZ1, CZ1, MT.plaster, nc);
  box(X0 + 0.18, CW0, F + 2.18, CH, LDZ0, LDZ1, MT.plaster, nc);
  k.wallLine(CW0, CZ0, CW0, LDZ0, F - 0.2, CH); k.wallLine(CW0, LDZ1, CW0, CZ1, F - 0.2, CH);
  // floor through the doorway: 彥霖's landing ends at x 5.53, inside the shared wall, so this one reaches back over it (no gap to fall
  // through), and the whole storey has a floor: nobody can end up in the dark shell underneath
  surf(5.2, CW0 + 0.1, LDZ0 - 0.2, LDZ1 + 0.2, F); surf(X0, X1, 0, G.D, F);
  // corridor light, shoe rack by the room door, a little calendar
  box(6.3, 6.8, CH - 0.05, CH, 2.9, 3.5, MT.light, nc);
  box(CW0 + 0.02, RX0 - 0.05, F, F + 0.9, CZ1 - 0.42, CZ1 - 0.02, MT.oak);      // shoe rack at the far end of the corridor (past the room door)
  for (let i = 0; i < 3; i++) box(CW0 + 0.1 + i * 0.32, CW0 + 0.35 + i * 0.32, F + 0.9, F + 0.98, CZ1 - 0.38, CZ1 - 0.08, ['#f2f2f2', '#1c1c20', '#d33'][i], nc);
  // room door (hinged on the room side, opens in when you come near)
  const rdoor = new THREE.Group(); rdoor.position.set(RX0 + 0.06, F, DZ1); k.group.add(rdoor);
  const dm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.06, DZ1 - DZ0 - 0.02), new THREE.MeshStandardMaterial({ color: '#7b5a3e', roughness: 0.55, emissive: '#7b5a3e', emissiveIntensity: 0.12 }));
  dm.position.set(0, 1.03, -(DZ1 - DZ0) / 2); rdoor.add(dm);
  const kn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.8, roughness: 0.25 })); kn.position.set(-0.05, 1.0, -(DZ1 - DZ0) + 0.1); rdoor.add(kn);
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshBasicMaterial({ map: tex(200, 80, (c) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 200, 80); c.fillStyle = '#21486e'; c.font = '900 40px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('蓋瑞', 100, 44); }) })); g.position.set(RX0 - 0.01, F + 1.6, DZ1 + 0.3); g.rotation.y = -Math.PI / 2; k.group.add(g); }
  // doorway leaf from 彥霖's landing (on the corridor side)
  const ldoor = new THREE.Group(); ldoor.position.set(CW0 - 0.05, F, LDZ0); k.group.add(ldoor);
  const ld = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.12, LDZ1 - LDZ0 - 0.04), new THREE.MeshStandardMaterial({ color: '#e9e3d6', roughness: 0.5, emissive: '#e9e3d6', emissiveIntensity: 0.12 }));
  ld.position.set(0, 1.06, (LDZ1 - LDZ0) / 2); ldoor.add(ld);

  // ---------------- the room ----------------
  // inside faces of the outer walls, round the two windows
  for (const [z0, z1, y0, y1] of [[RZ0, LW0, F, CH], [LW1, RZ1, F, CH], [LW0, LW1, F, LY0], [LW0, LW1, LY1, CH]]) box(RX1 - 0.02, RX1, y0, y1, z0, z1, MT.plaster, nc);
  for (const [x0, x1, y0, y1] of [[RX0, WX0, F, CH], [WX1, RX1, F, CH], [WX0, WX1, F, WY0], [WX0, WX1, WY1, CH]]) box(x0, x1, y0, y1, RZ1 - 0.02, RZ1, MT.plaster, nc);
  for (const x of [8.6, 11.0]) box(x, x + 0.8, CH - 0.05, CH, 5.5, 6.3, MT.light, nc); // ceiling lights
  box(RX0 + 0.12, RX0 + 0.14, F + 1.15, F + 1.27, DZ1 + 0.12, DZ1 + 0.2, MT.white, nc);  // light switch by the door
  const dk = (x0, x1, z0, z1, h) => k.wallRect(x0, x1, z0, z1, F - 0.2, F + h);

  // bed (top-left): oak frame, headboard on the left wall, grey-blue quilted duvet, two pillows
  const BX = 11.35, BZ2 = RZ1 - 0.1, BZ = BZ2 - (PL.bed.z1 - PL.bed.z0);
  box(BX, RX1 - 0.05, F, F + 0.4, BZ, BZ2, MT.oak, nc); box(RX1 - 0.12, RX1 - 0.04, F, F + 1.0, BZ, BZ2, MT.oak, nc); dk(BX, RX1 - 0.05, BZ, BZ2, 0.9);
  box(BX + 0.04, RX1 - 0.13, F + 0.4, F + 0.6, BZ + 0.04, BZ2 - 0.04, MT.white, nc);
  // the made bed: a flat duvet. Asleep: the same duvet drawn up over him to the chest, draped over the bed's sides and foot
  const flatDuvet = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, BZ2 - BZ - 0.02), new THREE.MeshStandardMaterial({ map: T.duvet, roughness: 0.95, emissive: '#7d97b5', emissiveIntensity: 0.12 }));
  flatDuvet.position.set(BX + 0.78, F + 0.63, (BZ + BZ2) / 2); flatDuvet.rotation.z = 0.01; k.group.add(flatDuvet);
  const SLZ = (BZ + BZ2) / 2, QX0 = 11.31, QX1 = 12.74; // he lies along z = SLZ; the duvet reaches from the foot (QX0) to his chest (QX1)
  const lerpPts = (pts, x) => { for (let i = 0; i + 1 < pts.length; i++) if (x <= pts[i + 1][0]) { const t = Math.max(0, (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])), e = t * t * (3 - 2 * t); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * e; } return pts[pts.length - 1][1]; };
  // height of the cloth above the floor over him (measured off the lying figure: toes up, shins low, chest high) and how wide he is there
  const ridge = [[11.31, 0.8], [11.4, 0.885], [11.56, 0.88], [11.72, 0.8], [11.92, 0.82], [12.1, 0.865], [12.3, 0.905], [12.6, 0.935], [12.74, 0.935]], width = [[11.31, 0.2], [11.95, 0.21], [12.28, 0.35], [12.74, 0.36]];
  const quiltHeight = (x, z) => {
    if (x < QX0 || x > QX1 || z < BZ || z > BZ2) return null;
    const d = Math.max(0, (Math.abs(z - SLZ) - lerpPts(width, x)) / 0.3), f = d >= 1 ? 0 : 1 - d * d * (3 - 2 * d);
    return 0.645 + (lerpPts(ridge, x) - 0.645) * f + 0.005 * Math.sin(x * 19 + z * 7) * Math.sin(z * 23 - x * 5);
  };
  const quilt = (() => {
    const xs = [QX0 - 0.03], zs = [BZ - 0.05]; for (let i = 0; i <= 44; i++) xs.push(QX0 + (QX1 - QX0) * i / 44); xs.push(QX1 + 0.025, QX1 + 0.01); // last two: the turned edge
    for (let j = 0; j <= 52; j++) zs.push(BZ + (BZ2 - BZ) * j / 52); zs.push(BZ2 + 0.05);
    const pos = [], uv = [], idx = [], nz = zs.length;
    xs.forEach((x, i) => zs.forEach((z, j) => {
      const side = j === 0 || j === nz - 1, foot = i === 0, cx = Math.min(QX1, Math.max(QX0, x)), cz = Math.min(BZ2, Math.max(BZ, z));
      let y = quiltHeight(cx, cz);
      if (side || foot) y = 0.37 + 0.02 * Math.sin(x * 9 + z * 8); // hangs over the edge of the mattress
      else if (i === xs.length - 2) y -= 0.02; else if (i === xs.length - 1) y -= 0.055;
      pos.push(x, F + y, z); uv.push((x - QX0) / (QX1 - QX0), (z - BZ) / (BZ2 - BZ));
    }));
    for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < nz; j++) { const q = i * nz + j; idx.push(q, q + 1, q + nz, q + 1, q + nz + 1, q + nz); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const map = tex(512, 512, (c) => { c.fillStyle = '#7d97b5'; c.fillRect(0, 0, 512, 512); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 5; for (let q = 0; q <= 512; q += 64) { c.beginPath(); c.moveTo(q, 0); c.lineTo(q, 512); c.moveTo(0, q); c.lineTo(512, q); c.stroke(); } c.fillStyle = '#f1f0ea'; c.fillRect(462, 0, 50, 512); c.fillStyle = 'rgba(60,80,110,.25)'; c.fillRect(459, 0, 4, 512); }); // turned-down white sheet at the chest
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.1 }));
    m.visible = false; k.group.add(m); return m;
  })();
  box(RX1 - 0.62, RX1 - 0.15, F + 0.6, F + 0.75, SLZ - 0.42, SLZ + 0.42, MT.white, nc); // pillow
  // the window desk, pushed against the top wall (as long as the bed, as drawn); its chair is on the room side
  const DH = 0.75, Y = F + DH, D1X0 = PL.desk.x0, D1X1 = PL.desk.x1, D1Z1 = RZ1 - 0.04, D1Z0 = D1Z1 - (PL.desk.z1 - PL.desk.z0);
  const table = (x0, x1, z0, z1, m) => { box(x0, x1, Y - 0.04, Y, z0, z1, m, nc); for (const x of [x0 + 0.03, x1 - 0.07]) for (const z of [z0 + 0.03, z1 - 0.07]) box(x, x + 0.04, F, Y - 0.04, z, z + 0.04, MT.black, nc); dk(x0, x1, z0, z1, DH); };
  table(D1X0, D1X1, D1Z0, D1Z1, MT.white);
  const chair = (x, z, h) => { // office chair: five-star base, gas lift, seat, back
    const g = new THREE.Group(); g.position.set(x, F, z); g.rotation.y = h; k.group.add(g);
    const blk = new THREE.MeshStandardMaterial({ color: '#202024', roughness: 0.5 }), seat = new THREE.MeshStandardMaterial({ color: '#2f3640', roughness: 0.9, emissive: '#2f3640', emissiveIntensity: 0.15 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.3), blk); l.position.set(Math.sin(a) * 0.15, 0.05, Math.cos(a) * 0.15); l.rotation.y = a; g.add(l); }
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 8), blk); p.position.y = 0.25; g.add(p);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.44), seat); s.position.y = 0.47; g.add(s);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.06), seat); b.position.set(0, 0.8, -0.22); b.rotation.x = -0.08; g.add(b);
    dk(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0.5);
    return g;
  };
  const CX = PL.chair.cx, CZ = D1Z0 - 0.36;
  const deskChair = chair(CX, CZ, 0); // faces the desk (+z); swivels with 蓋瑞 (js/garry.js)
  // on it (he sits on the -z side, his left is +x): laptop in front of him, the charging phone by his right hand, notebook and pens,
  // power strip and wifi router along the wall, the toast night light at the bed end
  const dz = (d) => D1Z0 + d; // d: metres in from the desk's front edge
  box(CX - 0.19, CX + 0.19, Y, Y + 0.018, dz(0.12), dz(0.38), '#b9bdc2', nc);
  { const lid = new THREE.Group(); lid.position.set(CX, Y + 0.018, dz(0.38)); lid.rotation.x = 0.22; k.group.add(lid); // leans back, the screen faces him
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.25, 0.012), new THREE.MeshStandardMaterial({ color: '#b9bdc2', metalness: 0.4, roughness: 0.4 })); back.position.set(0, 0.125, 0); lid.add(back);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.23), new THREE.MeshBasicMaterial({ map: T.screen, toneMapped: false })); s.position.set(0, 0.125, -0.008); s.rotation.y = Math.PI; lid.add(s); }
  const PHX = CX - 0.4, PHZ = dz(0.2);
  box(PHX - 0.04, PHX + 0.04, Y, Y + 0.01, PHZ - 0.08, PHZ + 0.08, '#1a1a1d', nc);                          // phone (alarm)
  const phoneScr = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.145), new THREE.MeshBasicMaterial({ color: '#0d1020', toneMapped: false }));
  phoneScr.rotation.x = -Math.PI / 2; phoneScr.position.set(PHX, Y + 0.0115, PHZ); k.group.add(phoneScr);
  const PSX = CX - 0.25; // power strip
  box(PSX - 0.22, PSX + 0.22, Y, Y + 0.035, dz(0.6), dz(0.66), MT.white, nc);
  for (let i = 0; i < 4; i++) box(PSX - 0.17 + i * 0.1, PSX - 0.13 + i * 0.1, Y + 0.035, Y + 0.037, dz(0.615), dz(0.645), '#333', nc);
  { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(PHX, Y + 0.005, PHZ + 0.08), new THREE.Vector3(PHX + 0.06, Y + 0.004, dz(0.42)), new THREE.Vector3(PSX - 0.1, Y + 0.03, dz(0.6))]); k.group.add(new THREE.Mesh(new THREE.TubeGeometry(c, 14, 0.003, 4), new THREE.MeshStandardMaterial({ color: '#fafafa' }))); } // charging cable
  const RTX = D1X0 + 0.3; // wifi router + antennas
  box(RTX - 0.12, RTX + 0.12, Y, Y + 0.035, dz(0.5), dz(0.64), MT.white, nc);
  for (const x of [-0.1, 0, 0.1]) box(RTX + x - 0.006, RTX + x + 0.006, Y + 0.035, Y + 0.18, dz(0.625), dz(0.637), MT.white, nc);
  box(RTX - 0.02, RTX + 0.02, Y + 0.036, Y + 0.04, dz(0.505), dz(0.515), new THREE.MeshBasicMaterial({ color: '#3fd16b' }), nc);
  const NBX = CX + 0.5; // notebook, pen cup
  box(NBX - 0.13, NBX + 0.13, Y, Y + 0.012, dz(0.14), dz(0.33), '#f1e6c8', nc); box(NBX - 0.02, NBX + 0.1, Y + 0.012, Y + 0.02, dz(0.22), dz(0.23), '#2f62c9', nc);
  box(NBX + 0.02, NBX + 0.1, Y, Y + 0.11, dz(0.46), dz(0.54), '#2f62c9', nc);
  for (const [dx, c] of [[0.03, '#e8323c'], [0.055, '#111'], [0.08, '#ffd23f']]) box(NBX + dx, NBX + dx + 0.01, Y + 0.11, Y + 0.16, dz(0.49), dz(0.5), c, nc);
  const toastMat = new THREE.MeshStandardMaterial({ color: '#f3d28c', roughness: 0.7, emissive: '#ffcf7a', emissiveIntensity: 0.2 });
  const crustMat = new THREE.MeshStandardMaterial({ color: '#b5732e', roughness: 0.8, emissive: '#7a4415', emissiveIntensity: 0.1 });
  { const sh = new THREE.Shape(); sh.moveTo(-0.07, 0); sh.lineTo(0.07, 0); sh.lineTo(0.07, 0.1); sh.bezierCurveTo(0.09, 0.15, 0.05, 0.17, 0.0, 0.17); sh.bezierCurveTo(-0.05, 0.17, -0.09, 0.15, -0.07, 0.1); sh.lineTo(-0.07, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    const toast = new THREE.Mesh(g, [toastMat, crustMat]); toast.position.set(D1X1 - 0.25, Y, dz(0.42)); toast.rotation.y = Math.PI + 0.35; k.group.add(toast); }
  // wardrobe (right wall, top) and TV (right wall, middle), both facing the room (+x)
  const WR = RX0 + 0.12, WRD = WR + PL.wardrobe.x1 - PL.wardrobe.x0, wz = PL.wardrobe.cz, TVD = WR + 0.48, tz = PL.tv.cz;
  box(WR, WRD, F, F + 2.1, PL.wardrobe.z0, PL.wardrobe.z1, MT.white); box(WRD, WRD + 0.01, F + 0.05, F + 2.05, wz - 0.008, wz + 0.008, '#bbb', nc);
  for (const z of [wz - 0.08, wz + 0.08]) box(WRD + 0.01, WRD + 0.04, F + 0.95, F + 1.25, z - 0.01, z + 0.01, MT.metal, nc);
  box(WR, TVD, F, F + 0.5, PL.tv.z0, PL.tv.z1, MT.oak);
  box(WR + 0.16, WR + 0.22, F + 0.5, F + 0.58, tz - 0.25, tz + 0.25, MT.black, nc); box(WR + 0.17, WR + 0.21, F + 0.58, F + 1.3, tz - 0.62, tz + 0.62, MT.black, nc);
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.68), new THREE.MeshBasicMaterial({ map: T.tv, toneMapped: false })); s.position.set(WR + 0.215, F + 0.94, tz); s.rotation.y = Math.PI / 2; k.group.add(s); }
  // IKEA sofa under the left window, facing the TV
  const SX = RX1 - 0.85, sz0 = PL.sofa.z0, sz1 = PL.sofa.z1, sm = (sz0 + sz1) / 2;
  box(SX, RX1 - 0.05, F, F + 0.42, sz0, sz1, MT.sofa); box(RX1 - 0.25, RX1 - 0.05, F + 0.42, F + 0.85, sz0, sz1, MT.sofa, nc);
  for (const z of [sz0, sz1 - 0.2]) box(SX, RX1 - 0.05, F + 0.42, F + 0.62, z, z + 0.2, MT.sofa, nc);
  for (const z of [(sz0 + 0.2 + sm) / 2, (sz1 - 0.2 + sm) / 2]) box(SX + 0.08, RX1 - 0.27, F + 0.42, F + 0.5, z - 0.4, z + 0.4, '#7b868c', nc);
  // the second desk, just above the bathroom: K-pop albums and lightsticks; its chair is on the bed side (drawing: above it)
  const D2 = PL.desk2; table(D2.x0, D2.x1, D2.z0, D2.z1, MT.oak);
  chair(PL.chair2.cx, D2.z1 + 0.34, Math.PI);
  const covers = ['#ff4fa3', '#9b7bff', '#ffd23f', '#1aa3c4', '#111', '#e8323c', '#f2f2f2', '#3fae49', '#7fe3ff'];
  covers.forEach((c, i) => { const x = D2.x0 + 0.15 + i * 0.045; box(x, x + 0.035, Y, Y + 0.3, D2.z0 + 0.08, D2.z0 + 0.3, c, nc); }); // albums standing in a row along the bathroom side
  box(D2.cx - 0.2, D2.cx + 0.1, Y, Y + 0.02, D2.z0 + 0.3, D2.z0 + 0.6, '#ff4fa3', nc);                     // an open album with photocards
  for (let i = 0; i < 3; i++) box(D2.cx - 0.17 + i * 0.09, D2.cx - 0.11 + i * 0.09, Y + 0.02, Y + 0.022, D2.z0 + 0.4, D2.z0 + 0.49, ['#ffd23f', '#7fe3ff', '#fff'][i], nc);
  for (const [x, c] of [[D2.x1 - 0.45, CONCERTS[0]], [D2.x1 - 0.22, CONCERTS[1]]]) { const ls = makeLightstick(c); ls.position.set(x, Y + 0.02, D2.z0 + 0.22); ls.scale.setScalar(0.85); ls.userData.pulse(0.3); k.group.add(ls); box(x - 0.04, x + 0.04, Y, Y + 0.02, D2.z0 + 0.18, D2.z0 + 0.26, MT.black, nc); }
  // bathroom in the bottom-left corner; its door is in its right wall (toward the room door), clear of the desk
  const BX0 = PL.bath.x0, BZ1 = PL.bath.z1, bd0 = RZ0 + 0.45, bd1 = RZ0 + 1.35;
  box(BX0, BX0 + 0.1, F, CH, RZ0, bd0, MT.plaster); box(BX0, BX0 + 0.1, F, CH, bd1, BZ1, MT.plaster); box(BX0, BX0 + 0.1, F + 2.05, CH, bd0, bd1, MT.plaster, nc);
  box(BX0 + 0.1, RX1, F, CH, BZ1 - 0.1, BZ1, MT.plaster);
  for (const z of [bd0 - 0.02, bd1 - 0.02]) box(BX0 - 0.02, BX0 + 0.12, F, F + 2.05, z, z + 0.04, MT.door, nc); box(BX0 - 0.02, BX0 + 0.12, F + 2.0, F + 2.05, bd0 + 0.02, bd1 - 0.02, MT.door, nc);
  box(BX0 + 0.1, RX1, F + 0.005, F + 0.01, RZ0, BZ1 - 0.1, MT.tile, { col: false, tile: [0.6, 0.6] });
  box(BX0 + 0.1, RX1, F, F + 1.6, RZ0, RZ0 + 0.01, MT.tile, { col: false, tile: [0.6, 0.6] }); box(RX1 - 0.03, RX1 - 0.02, F, F + 1.6, RZ0, BZ1 - 0.1, MT.tile, { col: false, tile: [0.6, 0.6] });
  box(11.75, 12.13, F, F + 0.42, RZ0 + 0.15, RZ0 + 0.68, MT.porcelain); box(11.77, 12.11, F + 0.42, F + 0.78, RZ0 + 0.02, RZ0 + 0.16, MT.porcelain, nc); // toilet
  box(10.75, 11.25, F + 0.78, F + 0.9, RZ0 + 0.02, RZ0 + 0.42, MT.porcelain); box(10.8, 11.2, F + 1.25, F + 1.85, RZ0 + 0.015, RZ0 + 0.04, '#cfe3ec', nc); // basin + mirror
  box(12.6, RX1 - 0.03, F, F + 0.05, RZ0 + 0.02, BZ1 - 0.1, MT.porcelain, nc); box(12.6, 12.62, F, F + 1.9, RZ0 + 0.02, RZ0 + 0.95, MT.glass, nc); box(RX1 - 0.12, RX1 - 0.06, F + 1.95, F + 2.0, RZ0 + 0.6, RZ0 + 0.8, MT.metal, nc); // shower

  k.finish(scene);
  // zones: corridor and room (camera ceiling + location name)
  const yIn = F - 0.3;
  I.zones.push({ name: '黃蓋瑞家 走廊', pts: k.rect(CW0 - 0.2, RX0, CZ0, CZ1), y0: yIn, y1: CH, ceil: () => CH - 0.1 });
  I.zones.push({ name: '黃蓋瑞的房間', pts: k.rect(RX0, RX1, RZ0, RZ1), y0: yIn, y1: CH, ceil: () => CH - 0.1 });
  // night light glows at night; doors open when you come near
  const roomDoorAt = k.w(RX0, (DZ0 + DZ1) / 2), landAt = k.w(CW0, (LDZ0 + LDZ1) / 2);
  I.updaters.push((dt, g) => {
    toastMat.emissiveIntensity = 0.2 + (g.night || 0) * 1.6;
    const p = g.player.worldPos(), up = !g.player.vehicle && g.player.y > F - 1;
    const near = (q, r) => up && Math.hypot(p.x - q[0], p.z - q[1]) < r;
    // under the flat there is only the closed shell (1F): anyone in there (an old save, a long hitch) is put back in the corridor
    if (!g.player.vehicle && !g.player.seat) {
      const l = k.l(p.x, p.z);
      if (l[0] > X0 + 0.25 && l[0] < X1 - 0.25 && l[1] > 0.25 && l[1] < G.D - 0.25 && g.player.pos.y < base + F - 1.2) {
        const a = at(6.6, 2.9); g.player.place(a.x, a.z, g.player.heading); g.player.y = a.y; g.player.pos.y += a.y; g.player.vy = 0; g.player.ground = a.y; g.hud.toast('🪜 回到 2 樓走廊', 'good', 1800);
      }
    }
    rdoor.rotation.y += ((near(roomDoorAt, 1.8) ? -Math.PI / 2 : 0) - rdoor.rotation.y) * Math.min(1, dt * 5);
    ldoor.rotation.y += ((near(landAt, 2.0) ? -Math.PI / 2 : 0) - ldoor.rotation.y) * Math.min(1, dt * 5);
  });
  return {
    k, base, F, at, phoneScr,
    phone: at(PHX - 0.35, CZ + 0.02),               // stand here (between the wardrobe and the chair) to reach the phone
    seat: { ...at(CX, CZ), h: k.heading(0) },       // 蓋瑞 at the window desk, facing it (+z)
    chairTo: (h) => { deskChair.rotation.y = h - k.heading(0); }, // turn the chair to a world heading
    bed: { ...at(12.2, SLZ), h: k.heading(-Math.PI / 2) }, // hips here; lying back, the head points away from the heading (+x, the pillow)
    tuckIn: (on) => { quilt.visible = on; flatDuvet.visible = !on; }, quiltHeight,
    room: k.rect(RX0, RX1, RZ0, RZ1), albums: at(D2.x0 + 0.3, D2.z1 + 0.4), tv: at(8.6, tz), plan: PL,
  };
}
