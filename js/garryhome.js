// 黃蓋瑞家：孫師傅牛肉拉麵（彥霖以前住的地方）隔壁那戶的 2 樓，同一層、不同戶。
// 原本 f900、f901 兩間窄街屋（f900 已經讓 1.5 m 給彥霖那棟）合成一戶 8 m 寬、4 層的透天重蓋。
// 從彥霖那棟 2 樓樓梯口右側牆的門（interiors.js buildYanlinHome 的 GZ0..GZ1）進來是一條走廊，房門在房間右側牆的下方。
// 房間照使用者畫的格局（圖上方 = 臨中北路那面牆）：
//   左上 床（床頭靠左牆）· 上方 對外窗下的桌子（筆電、文具、wifi 機、延長線、充電中的手機、吐司小夜燈）＋椅子
//   右上 衣櫃 · 右邊 電視櫃 · 右下 門 · 左邊 小對外窗下的 IKEA 沙發
//   靠浴室的桌子放 K-pop 專輯和手燈（＋椅子）· 左下 浴室
// 座標：彥霖那棟的框架（YH_SPEC 的原點與方向），單位公尺；x 沿中北路，z 往街區裡面。2F 樓板高 4.617 m（跟彥霖那棟一樣）。
import * as THREE from 'three';
import { H } from './terrain.js';
import { makeLightstick, CONCERTS } from './concert.js';

export const GARRY = { X0: 5.82, X1: 13.8, D: 19.1, F2: 4.617, FH: 3.3, NF: 4 };
const RX0 = 7.1, RX1 = 13.6, RZ0 = 0.2, RZ1 = 7.4; // the room
const CW0 = 6.0, CZ0 = 5.6, CZ1 = 14.2;           // corridor x CW0..RX0, z CZ0..CZ1
const DZ0 = 5.9, DZ1 = 6.8;                       // room door (on the room's right wall, x = RX0)
const LDZ0 = 12.72, LDZ1 = 13.88;                 // doorway from 彥霖's landing (YH local 9.42..10.28 x 1.35)
const BX0 = 10.0, BZ0 = 5.25;                     // bathroom: x BX0..RX1, z BZ0..RZ1

// the two town houses this replaces (js/main.js skips them) and the footprint trees / furniture keep off
export const GARRY_IDS = ['f900', 'f901'];
export function garryOutline(YH) {
  const c = Math.cos(YH.ang), s = Math.sin(YH.ang), w = (x, z) => [YH.ox + x * c - z * s, YH.oz + x * s + z * c];
  return [w(GARRY.X0, 0), w(GARRY.X1, 0), w(GARRY.X1, GARRY.D), w(GARRY.X0, GARRY.D)];
}

function tex(w, h, draw, rep) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

export function buildGarryHome(I, scene, Kit, regMat, YH) {
  const G = GARRY, F = G.F2, CH = F + 2.85, top = F + (G.NF - 1) * G.FH;
  const k = new Kit(I, YH.ox, YH.oz, YH.ang, 1), base = k.base;
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
    ceil: def('grCeil', std({ color: '#f6f5f1' }, 0.45)), tile: def('grTile', std({ map: T.tile, roughness: 0.3 }, 0.2)),
    oak: def('grOak', std({ color: '#c49a6c', roughness: 0.55 }, 0.12)), white: def('grWhite', std({ color: '#f4f4f1', roughness: 0.45 }, 0.15)),
    black: def('grBlack', std({ color: '#1c1c20', roughness: 0.4 })), grey: def('grGrey', std({ color: '#8d9297', roughness: 0.9 }, 0.1)),
    sofa: def('grSofa', std({ color: '#6f7a80', roughness: 0.95 }, 0.12)), metal: def('grMetal', std({ color: '#b9bec3', metalness: 0.7, roughness: 0.3 })),
    door: def('grDoor', std({ color: '#7b5a3e', roughness: 0.55 }, 0.1)), porcelain: def('grPorc', std({ color: '#f7f7f4', roughness: 0.2 }, 0.15)),
    glass: 'glass', light: def('grLight', new THREE.MeshStandardMaterial({ color: '#fff8ea', emissive: '#fff4dc', emissiveIntensity: 1.1 })),
  };
  const surf = (x0, x1, z0, z1, h) => I.addSurface(k.rect(x0, x1, z0, z1), (x, z) => base + h - H(x, z));
  const box = (x0, x1, y0, y1, z0, z1, m, o) => k.box(x0, x1, y0, y1, z0, z1, m, o);
  const nc = { col: false };

  // ---------------- shell: 4-storey 透天, tiled facade, 1F shutter, windows with grilles, roof extension ----------------
  const X0 = G.X0, X1 = G.X1;
  box(X0, X0 + 0.18, -0.6, top, 0, G.D, MT.facade, { tile: [0.6, 0.6] });
  box(X1 - 0.2, X1, -0.6, top, 0, G.D, MT.facade, { tile: [0.6, 0.6] });
  box(X0, X1, -0.6, top, G.D - 0.2, G.D, MT.facade, { tile: [0.6, 0.6] });
  box(X0, X1, top - 0.2, top, 0, G.D, 'gray', nc);
  box(X0, X1, top, top + 0.9, -0.05, 0.15, MT.facade, nc);
  box(X0 + 0.4, X1 - 0.4, top, top + 2.4, 8, G.D - 0.4, '#8a959d', nc);         // 頂樓加蓋
  box(X0 + 0.6, X0 + 1.8, top, top + 1.1, 2.5, 3.7, 'steel', nc);                // water tank
  // 1F: rolled-down shutter, the street door on the right
  box(X0 + 0.18, X1 - 1.5, -0.6, 3.6, 0, 0.12, MT.shutter, { tile: [1, 1] });
  box(X1 - 1.5, X1 - 0.2, 0, 2.3, 0.02, 0.1, MT.door); box(X1 - 1.5, X1 - 0.2, 2.3, 3.6, 0, 0.12, MT.facade);
  box(X0 + 0.18, X1 - 0.2, 3.6, F, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  box(X0, X1, 3.55, 3.65, -1.1, 0, '#5d666d', nc);                                // awning
  // 2F front: the room's street window over the desk (the rest is wall)
  const WX0 = 8.75, WX1 = 9.85, WY0 = F + 1.0, WY1 = F + 2.15;
  box(X0 + 0.18, WX0, F, F + 3.3, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  box(WX1, X1 - 0.2, F, F + 3.3, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  box(WX0, WX1, F, WY0, 0, 0.2, MT.facade); box(WX0, WX1, WY1, F + 3.3, 0, 0.2, MT.facade);
  box(WX0, WX1, WY0, WY1, 0.08, 0.11, MT.glass);
  box(WX0 - 0.05, WX1 + 0.05, WY0 - 0.05, WY0, -0.06, 0.2, MT.metal, nc);
  for (let x = WX0 + 0.1; x < WX1; x += 0.16) box(x - 0.012, x + 0.012, WY0, WY1, -0.1, -0.08, MT.black, nc); // iron grille
  box(WX0 - 0.05, WX1 + 0.05, WY1, WY1 + 0.03, -0.12, 0, MT.black, nc);
  box(11.2, 12.0, F + 0.4, F + 0.95, -0.42, -0.02, '#e6e2d6', nc);                 // outdoor AC unit
  // 3F-4F
  for (let f = 1; f < G.NF - 1; f++) {
    const y = F + f * G.FH;
    box(X0 + 0.18, X1 - 0.2, y, y + G.FH, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
    k.plane(T.win, 2.6, 1.4, (X0 + X1) / 2 - 1, y + 1.55, -0.01, Math.PI); k.plane(T.win, 1.4, 1.1, X1 - 1.4, y + 1.6, -0.01, Math.PI);
    box(X0 + 1.2, X0 + 2.0, y + 0.35, y + 0.9, -0.4, -0.02, '#e6e2d6', nc);
  }
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.5), new THREE.MeshStandardMaterial({ map: tex(256, 76, (c) => { c.fillStyle = '#21486e'; c.fillRect(0, 0, 256, 76); c.fillStyle = '#fff'; c.font = '900 40px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('黃宅', 128, 40); }), emissive: '#ffffff', emissiveIntensity: 0.25 })); g.position.set(X1 - 0.85, 2.6, -0.01); g.rotation.y = Math.PI; k.group.add(g); }

  // ---------------- 2F: floor, ceiling, corridor ----------------
  box(X0 + 0.18, X1 - 0.2, F - 0.25, F, 0.2, CZ1 + 0.2, MT.floor, { col: false, tile: [1.2, 1.2] });
  surf(CW0, RX1, RZ0, RZ1, F); surf(CW0, RX0, CZ0, CZ1, F);
  box(CW0 - 0.18, RX1, CH, CH + 0.06, RZ0, CZ1 + 0.2, MT.ceil, nc);
  // corridor walls: front end, the room's right wall with its door, the back end; the far wall of the corridor past the room
  box(CW0, RX0, F, CH, CZ0 - 0.12, CZ0, MT.plaster);                                  // corridor front end
  box(RX0, RX0 + 0.12, F, CH, RZ0, DZ0, MT.plaster); box(RX0, RX0 + 0.12, F, CH, DZ1, RZ1 + 0.12, MT.plaster);
  box(RX0, RX0 + 0.12, F + 2.1, CH, DZ0, DZ1, MT.plaster, nc);
  box(RX0, RX0 + 0.12, F, CH, RZ1 + 0.12, CZ1, MT.plaster);                           // corridor right wall past the room
  box(CW0, RX0 + 0.12, F, CH, CZ1, CZ1 + 0.2, MT.plaster);                            // back end
  // the shared wall: doorway from 彥霖's landing
  box(X0 + 0.18, CW0, F, CH, CZ0, LDZ0, MT.plaster, nc); box(X0 + 0.18, CW0, F, CH, LDZ1, CZ1, MT.plaster, nc);
  box(X0 + 0.18, CW0, F + 2.18, CH, LDZ0, LDZ1, MT.plaster, nc);
  k.wallLine(CW0, CZ0, CW0, LDZ0, F - 0.2, CH); k.wallLine(CW0, LDZ1, CW0, CZ1, F - 0.2, CH);
  surf(X0 - 0.05, CW0 + 0.02, LDZ0, LDZ1, F);
  // corridor light, shoe rack by the room door, a little calendar
  box(6.3, 6.8, CH - 0.05, CH, 9.5, 10.1, MT.light, nc);
  box(CW0 + 0.02, CW0 + 0.4, F, F + 0.9, 6.0, 7.0, MT.oak);
  for (let i = 0; i < 3; i++) box(CW0 + 0.08, CW0 + 0.36, F + 0.95, F + 1.03, 6.1 + i * 0.3, 6.35 + i * 0.3, ['#f2f2f2', '#1c1c20', '#d33'][i], nc);
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
  // walls: street wall (with the window), left wall (small window), back wall (bathroom side)
  box(RX0, WX0, F, CH, RZ0 - 0.0, RZ0 + 0.02, MT.plaster, nc); box(WX1, RX1, F, CH, RZ0, RZ0 + 0.02, MT.plaster, nc);
  box(WX0, WX1, F, WY0, RZ0, RZ0 + 0.02, MT.plaster, nc); box(WX0, WX1, WY1, CH, RZ0, RZ0 + 0.02, MT.plaster, nc);
  const LW0 = 2.95, LW1 = 4.35, LY0 = F + 1.15, LY1 = F + 1.95; // the small window on the left wall
  box(RX1 - 0.02, RX1, F, CH, RZ0, LW0, MT.plaster, nc); box(RX1 - 0.02, RX1, F, CH, LW1, RZ1, MT.plaster, nc);
  box(RX1 - 0.02, RX1, F, LY0, LW0, LW1, MT.plaster, nc); box(RX1 - 0.02, RX1, LY1, CH, LW0, LW1, MT.plaster, nc);
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(LW1 - LW0, LY1 - LY0), new THREE.MeshBasicMaterial({ color: '#dbe8f0' })); g.position.set(RX1 - 0.015, (LY0 + LY1) / 2, (LW0 + LW1) / 2); g.rotation.y = -Math.PI / 2; k.group.add(g); }
  box(RX1 - 0.05, RX1, LY0 - 0.04, LY0, LW0 - 0.05, LW1 + 0.05, MT.metal, nc); box(RX1 - 0.04, RX1, LY0, LY1, (LW0 + LW1) / 2 - 0.02, (LW0 + LW1) / 2 + 0.02, MT.metal, nc);
  box(RX0, RX1, F, CH, RZ1, RZ1 + 0.12, MT.plaster);                                   // back wall
  k.wallLine(RX0 + 0.12, RZ0 + 0.05, RX1 - 0.05, RZ0 + 0.05, F - 0.2, CH); k.wallLine(RX1 - 0.05, RZ0, RX1 - 0.05, RZ1, F - 0.2, CH);
  box(8.9, 9.7, CH - 0.05, CH, 2.6, 3.4, MT.light, nc); box(10.9, 11.7, CH - 0.05, CH, 2.6, 3.4, MT.light, nc); // ceiling lights
  box(RX0 + 0.12, RX0 + 0.14, F + 0.3, F + 0.4, 4.95, 5.05, MT.white, nc);          // switch
  const dk = (x0, x1, z0, z1, h) => k.wallRect(x0, x1, z0, z1, F - 0.2, F + h);

  // bed (top-left): oak frame, headboard on the left wall, grey-blue quilted duvet, two pillows
  const BX = 11.35, BZ = 0.45, BZ2 = 2.15;
  box(BX, RX1 - 0.05, F, F + 0.4, BZ, BZ2, MT.oak, nc); box(RX1 - 0.12, RX1 - 0.04, F, F + 1.0, BZ, BZ2, MT.oak, nc); dk(BX, RX1 - 0.05, BZ, BZ2, 0.9);
  box(BX + 0.04, RX1 - 0.13, F + 0.4, F + 0.6, BZ + 0.04, BZ2 - 0.04, MT.white, nc);
  { const g = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, BZ2 - BZ - 0.02), new THREE.MeshStandardMaterial({ map: T.duvet, roughness: 0.95, emissive: '#7d97b5', emissiveIntensity: 0.12 })); g.position.set(BX + 0.78, F + 0.63, (BZ + BZ2) / 2); g.rotation.z = 0.01; k.group.add(g); }
  for (const z of [BZ + 0.45, BZ2 - 0.45]) box(RX1 - 0.62, RX1 - 0.15, F + 0.6, F + 0.75, z - 0.32, z + 0.32, MT.white, nc);
  // desk under the street window, chair
  const D1X0 = 8.5, D1X1 = 10.1, D1Z0 = 0.24, D1Z1 = 0.9, DH = 0.75;
  box(D1X0, D1X1, F + DH - 0.04, F + DH, D1Z0, D1Z1, MT.white, nc);
  for (const x of [D1X0 + 0.03, D1X1 - 0.07]) for (const z of [D1Z0 + 0.03, D1Z1 - 0.07]) box(x, x + 0.04, F, F + DH - 0.04, z, z + 0.04, MT.black, nc);
  dk(D1X0, D1X1, D1Z0, D1Z1, DH);
  const chair = (x, z, h) => { // office chair: five-star base, gas lift, seat, back
    const g = new THREE.Group(); g.position.set(x, F, z); g.rotation.y = h; k.group.add(g);
    const blk = new THREE.MeshStandardMaterial({ color: '#202024', roughness: 0.5 }), seat = new THREE.MeshStandardMaterial({ color: '#2f3640', roughness: 0.9, emissive: '#2f3640', emissiveIntensity: 0.15 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.3), blk); l.position.set(Math.sin(a) * 0.15, 0.05, Math.cos(a) * 0.15); l.rotation.y = a; g.add(l); }
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 8), blk); p.position.y = 0.25; g.add(p);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.44), seat); s.position.y = 0.47; g.add(s);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.06), seat); b.position.set(0, 0.8, -0.22); b.rotation.x = -0.08; g.add(b);
    dk(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0.5);
  };
  chair(9.3, 1.45, Math.PI);
  // desk 1 things: open laptop, pen cup, notebook, wifi router, power strip, the charging phone (alarm), toast night light
  const Y = F + DH;
  box(9.05, 9.43, Y, Y + 0.018, 0.36, 0.62, '#b9bdc2', nc);
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.23), new THREE.MeshBasicMaterial({ map: T.screen, toneMapped: false })); s.position.set(9.24, Y + 0.13, 0.355); s.rotation.x = -0.25; k.group.add(s);
    box(9.05, 9.43, Y + 0.01, Y + 0.25, 0.33, 0.35, '#b9bdc2', nc); }
  box(8.7, 8.78, Y, Y + 0.11, 0.4, 0.48, '#2f62c9', nc);                                                   // pen cup
  for (const [dx, c] of [[0, '#e8323c'], [0.02, '#111'], [0.04, '#ffd23f']]) box(8.71 + dx, 8.72 + dx, Y + 0.11, Y + 0.16, 0.43, 0.44, c, nc);
  box(8.6, 8.84, Y, Y + 0.012, 0.6, 0.78, '#f1e6c8', nc);                                                  // notebook
  box(9.7, 9.92, Y, Y + 0.035, 0.32, 0.46, MT.white, nc);                                                  // wifi router + antennas
  for (const x of [9.72, 9.81, 9.9]) box(x - 0.006, x + 0.006, Y + 0.035, Y + 0.17, 0.43, 0.442, MT.white, nc);
  box(9.73, 9.76, Y + 0.036, Y + 0.04, 0.33, 0.34, new THREE.MeshBasicMaterial({ color: '#3fd16b' }), nc);
  box(8.6, 9.0, Y, Y + 0.035, 0.27, 0.33, MT.white, nc);                                                   // power strip
  for (let i = 0; i < 4; i++) box(8.64 + i * 0.09, 8.68 + i * 0.09, Y + 0.035, Y + 0.037, 0.29, 0.31, '#333', nc);
  box(9.5, 9.58, Y, Y + 0.01, 0.62, 0.78, '#1a1a1d', nc);                                                  // phone (alarm)
  const phoneScr = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.145), new THREE.MeshBasicMaterial({ color: '#0d1020', toneMapped: false }));
  phoneScr.rotation.x = -Math.PI / 2; phoneScr.position.set(9.54, Y + 0.0115, 0.70); k.group.add(phoneScr);
  { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(9.54, Y + 0.005, 0.62), new THREE.Vector3(9.4, Y + 0.004, 0.5), new THREE.Vector3(9.0, Y + 0.004, 0.32)]); const g = new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.003, 4), new THREE.MeshStandardMaterial({ color: '#fafafa' })); k.group.add(g); } // charging cable
  // toast night light: a slice of bread with a crust, lit from inside at night
  const toastMat = new THREE.MeshStandardMaterial({ color: '#f3d28c', roughness: 0.7, emissive: '#ffcf7a', emissiveIntensity: 0.2 });
  const crustMat = new THREE.MeshStandardMaterial({ color: '#b5732e', roughness: 0.8, emissive: '#7a4415', emissiveIntensity: 0.1 });
  { const sh = new THREE.Shape(); sh.moveTo(-0.07, 0); sh.lineTo(0.07, 0); sh.lineTo(0.07, 0.1); sh.bezierCurveTo(0.09, 0.15, 0.05, 0.17, 0.0, 0.17); sh.bezierCurveTo(-0.05, 0.17, -0.09, 0.15, -0.07, 0.1); sh.lineTo(-0.07, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    const toast = new THREE.Mesh(g, [toastMat, crustMat]); toast.position.set(10.0, Y, 0.72); toast.rotation.y = Math.PI * 0.85; k.group.add(toast); }
  // wardrobe on the right wall (top), TV cabinet + TV below it
  box(RX0 + 0.12, RX0 + 0.72, F, F + 2.1, 0.8, 2.6, MT.white); box(RX0 + 0.72, RX0 + 0.73, F + 0.05, F + 2.05, 1.69, 1.71, '#bbb', nc);
  for (const z of [1.6, 1.8]) box(RX0 + 0.73, RX0 + 0.76, F + 0.95, F + 1.25, z - 0.01, z + 0.01, MT.metal, nc);
  box(RX0 + 0.12, RX0 + 0.55, F, F + 0.5, 3.0, 4.9, MT.oak); dk(RX0 + 0.12, RX0 + 0.55, 3.0, 4.9, 0.5);
  box(RX0 + 0.28, RX0 + 0.34, F + 0.5, F + 0.58, 3.7, 4.2, MT.black, nc);
  box(RX0 + 0.29, RX0 + 0.33, F + 0.58, F + 1.3, 3.33, 4.57, MT.black, nc);
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.68), new THREE.MeshBasicMaterial({ map: T.tv, toneMapped: false })); s.position.set(RX0 + 0.335, F + 0.94, 3.95); s.rotation.y = Math.PI / 2; k.group.add(s); }
  // IKEA sofa under the left window: grey two-seater, low arms
  const SX = RX1 - 0.85;
  box(SX, RX1 - 0.05, F, F + 0.42, 2.6, 4.75, MT.sofa); box(RX1 - 0.25, RX1 - 0.05, F + 0.42, F + 0.85, 2.6, 4.75, MT.sofa, nc);
  for (const z of [2.6, 4.55]) box(SX, RX1 - 0.05, F + 0.42, F + 0.62, z, z + 0.2, MT.sofa, nc);
  for (const z of [3.05, 3.95]) box(SX + 0.08, RX1 - 0.27, F + 0.42, F + 0.5, z - 0.38, z + 0.38, '#7b868c', nc);
  // desk by the bathroom: K-pop albums and lightsticks; chair in front
  const D2X0 = 10.6, D2X1 = 12.2, D2Z0 = 4.4, D2Z1 = 5.05;
  box(D2X0, D2X1, F + DH - 0.04, F + DH, D2Z0, D2Z1, MT.oak, nc);
  for (const x of [D2X0 + 0.03, D2X1 - 0.07]) for (const z of [D2Z0 + 0.03, D2Z1 - 0.07]) box(x, x + 0.04, F, F + DH - 0.04, z, z + 0.04, MT.black, nc);
  dk(D2X0, D2X1, D2Z0, D2Z1, DH);
  chair(11.2, 3.85, 0);
  const covers = ['#ff4fa3', '#9b7bff', '#ffd23f', '#1aa3c4', '#111', '#e8323c', '#f2f2f2'];
  for (let i = 0; i < 7; i++) { const x = 10.7 + i * 0.045; box(x, x + 0.035, Y, Y + 0.3, 4.8, 5.0, covers[i], nc); } // albums standing in a row
  box(11.15, 11.45, Y, Y + 0.02, 4.6, 4.9, '#ff4fa3', nc);                                                // an open album with photocards
  for (let i = 0; i < 3; i++) box(11.18 + i * 0.09, 11.24 + i * 0.09, Y + 0.02, Y + 0.022, 4.63, 4.72, ['#ffd23f', '#7fe3ff', '#fff'][i], nc);
  for (const [x, c] of [[11.75, CONCERTS[0]], [11.95, CONCERTS[1]]]) { const ls = makeLightstick(c); ls.position.set(x, Y + 0.02, 4.85); ls.scale.setScalar(0.85); ls.userData.pulse(0.3); k.group.add(ls); box(x - 0.04, x + 0.04, Y, Y + 0.02, 4.81, 4.89, MT.black, nc); }
  // bathroom (bottom-left): walls with a doorway, tiles, toilet, basin, shower
  box(BX0, BX0 + 0.1, F, CH, BZ0, RZ1, MT.plaster);
  box(BX0 + 0.1, BX0 + 0.3, F, CH, BZ0, BZ0 + 0.1, MT.plaster); box(BX0 + 1.1, RX1, F, CH, BZ0, BZ0 + 0.1, MT.plaster);
  box(BX0 + 0.3, BX0 + 1.1, F + 2.05, CH, BZ0, BZ0 + 0.1, MT.plaster, nc);
  box(BX0 + 0.1, RX1, F + 0.005, F + 0.01, BZ0 + 0.1, RZ1, MT.tile, { col: false, tile: [0.6, 0.6] });
  box(RX1 - 0.03, RX1 - 0.02, F, F + 1.5, BZ0 + 0.1, RZ1, MT.tile, { col: false, tile: [0.6, 0.6] });
  box(BX0 + 1.6, BX0 + 2.0, F, F + 0.42, RZ1 - 0.62, RZ1 - 0.1, MT.porcelain); box(BX0 + 1.62, BX0 + 1.98, F + 0.42, F + 0.75, RZ1 - 0.25, RZ1 - 0.12, MT.porcelain, nc);
  box(BX0 + 0.2, BX0 + 0.7, F + 0.8, F + 0.9, RZ1 - 0.5, RZ1 - 0.1, MT.porcelain); box(BX0 + 0.25, BX0 + 0.65, F + 1.25, F + 1.85, RZ1 - 0.13, RZ1 - 0.1, '#cfe3ec', nc); // basin + mirror
  box(RX1 - 1.0, RX1 - 0.05, F, F + 0.05, BZ0 + 0.15, BZ0 + 1.1, MT.porcelain, nc); box(RX1 - 1.0, RX1 - 0.98, F, F + 1.9, BZ0 + 0.15, BZ0 + 1.1, MT.glass, nc); // shower tray + screen
  box(RX1 - 0.15, RX1 - 0.1, F + 1.9, F + 2.0, BZ0 + 0.5, BZ0 + 0.7, MT.metal, nc);

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
    rdoor.rotation.y += ((near(roomDoorAt, 1.8) ? -Math.PI / 2 : 0) - rdoor.rotation.y) * Math.min(1, dt * 5);
    ldoor.rotation.y += ((near(landAt, 2.0) ? -Math.PI / 2 : 0) - ldoor.rotation.y) * Math.min(1, dt * 5);
  });
  const at = (x, z) => { const q = k.w(x, z); return { x: q[0], z: q[1], y: F + base - H(q[0], q[1]) }; };
  return {
    k, base, F, at, phoneScr,
    phone: at(9.54, 1.15),                         // stand here to reach the phone on the desk
    seat: { ...at(9.3, 1.45), h: k.heading(0) },    // 蓋瑞 at the street-window desk (facing the window)
    bed: { ...at(12.4, 1.3), h: k.heading(-Math.PI / 2) },
    room: k.rect(RX0, RX1, RZ0, RZ1), albums: at(11.0, 3.9), tv: at(8.5, 3.95),
  };
}
