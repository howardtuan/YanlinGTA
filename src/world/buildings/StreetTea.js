// 中北路南側、正門西邊：茶學苑 Tea Arts 中北店（可以在門口點餐，src/systems/minigames/TeaShop.js 放店員）與它左右那排店面（都不能進去）。
// 從 src/world/Interiors.js 原封不動搬出來；src/world/zones/Zones.js 決定建造順序、保留範圍。
import * as THREE from 'three';
import { H } from '../Terrain.js';
import { ctex, font, T, MATS, Kit, finishRow, lcg, YHT, ROWT, rowTools } from '../Kit.js';

// =====================================================================
// 茶學苑 Tea Arts 中北店: the drink shop on 中北路 just west of the 正門 (OSM POI at (-245.5, 90.9), south side
// of the street between 中北路193巷 and 早啊早餐店). Modelled on the user's photos: a 3-storey 透天 in light
// grey tile, 2F aluminium windows behind iron grilles with window AC units, a wide yellow sign board with
// white 「茶學苑」, a round yellow blade sign on a white bracket, a thin grey canopy over a yellow order counter
// with an open window and a glass panel with the lit 茶學苑 TEA ARTS logo, the glass door on the right; in
// front a raised wooden deck with dark-wood benches inside a black railing. You order at the counter from
// the deck (the shop itself is not enterable). src/systems/minigames/TeaShop.js puts the staff in (排球少年 吱吱 on his shifts).
// Local frame: +x runs west along 中北路, +z away from the street; the facade is z = 0, the deck z < 0.
// =====================================================================
export const TEA_SPEC = { ox: -243.01, oz: 90.77, ang: Math.atan2(0.354, -0.935), W: 6.0, D: 7.2, NF: 3, FH: 3.7, DECK: 2.0 };
export function teaFootprint() {
  const { ox, oz, ang, W, D, DECK } = TEA_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(-0.3, -DECK - 0.4), w(W + 0.3, -DECK - 0.4), w(W + 0.3, D + 0.3), w(-0.3, D + 0.3)]; // + the deck in front
}
const TEA_YELLOW = '#f2c21b';
const TEAT = {
  sign: () => ctex('teaSign2', 1024, 136, (g) => {
    g.fillStyle = TEA_YELLOW; g.fillRect(0, 0, 1024, 136);
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 124, 1024, 12);
    // slogan in a rounded outline on the left
    g.strokeStyle = '#5a3d12'; g.lineWidth = 3; g.beginPath(); g.roundRect(40, 46, 236, 40, 20); g.stroke();
    g.fillStyle = '#5a3d12'; g.font = font(22, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('做一杯有人情味的茶', 158, 67);
    g.fillStyle = '#ffffff'; g.font = `900 92px "Kaiti TC","STKaiti","BiauKai","DFKai-SB","Noto Serif TC",serif`; g.fillText('茶學苑', 520, 72);
  }, false),
  blade: () => ctex('teaBlade', 256, 256, (g) => { // round blade sign: yellow disc, line-drawn leaf-face logo
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = TEA_YELLOW; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
    g.strokeStyle = '#5a3d12'; g.lineWidth = 5; g.beginPath(); g.ellipse(128, 100, 30, 44, 0, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(128, 62); g.quadraticCurveTo(118, 100, 128, 140); g.stroke();
    g.beginPath(); g.arc(116, 96, 3, 0, 7); g.arc(140, 96, 3, 0, 7); g.fillStyle = '#5a3d12'; g.fill();
    g.font = font(38, 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('茶學苑', 128, 184);
  }, false),
  logo: () => ctex('teaLogo', 512, 384, (g) => { // the lit logo panel behind the glass, left of the order window
    const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#7a4e26'); gr.addColorStop(1, '#4f3016');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
    for (let x = 0; x < 512; x += 32) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 2, 384); }
    g.fillStyle = '#ffcf5a'; g.shadowColor = '#ffb020'; g.shadowBlur = 18;
    g.font = `900 120px "Kaiti TC","STKaiti","BiauKai","Noto Serif TC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('茶學苑', 256, 150);
    g.font = '700 58px Georgia,"Times New Roman",serif'; g.fillText('TEA ARTS', 256, 270);
  }, false),
  menu: () => ctex('teaMenu2', 1024, 384, (g) => {
    g.fillStyle = '#fbf3dc'; g.fillRect(0, 0, 1024, 384); g.fillStyle = TEA_YELLOW; g.fillRect(0, 0, 1024, 84);
    g.fillStyle = '#ffffff'; g.font = font(48); g.textAlign = 'center'; g.fillText('茶學苑 MENU', 512, 60);
    g.font = font(34, 700); g.textAlign = 'left';
    TEA_BOARD.forEach(([n, p], i) => {
      const x = 60 + (i % 2) * 480, y = 150 + Math.floor(i / 2) * 76;
      g.fillStyle = '#4a3214'; g.fillText(n, x, y); g.fillStyle = '#c0392b'; g.textAlign = 'right'; g.fillText(`$${  p}`, x + 400, y); g.textAlign = 'left';
    });
    g.fillStyle = '#8a6a3a'; g.font = font(24, 700); g.textAlign = 'center'; g.fillText('甜度冰塊可調 · 加珍珠 +10', 512, 366);
  }, false),
  poster: () => ctex('teaPoster', 256, 352, (g) => { // purple-cup poster on the white wall by the door
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 352); g.fillStyle = TEA_YELLOW; g.fillRect(0, 0, 256, 56);
    g.fillStyle = '#5a3d12'; g.font = font(34); g.textAlign = 'center'; g.fillText('新品上市', 128, 40);
    g.fillStyle = '#b97fd0'; g.beginPath(); g.moveTo(80, 90); g.lineTo(176, 90); g.lineTo(164, 280); g.lineTo(92, 280); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.font = font(34); g.fillText('茶', 128, 170); g.font = font(22); g.fillText('學苑', 134, 210);
    g.fillStyle = '#4a3214'; g.font = font(30); g.fillText('脆梅冰茶 $35', 128, 326);
  }, false),
  deck: () => ctex('teaDeck', 256, 256, (g) => { // wooden deck boards
    g.fillStyle = '#7a4a26'; g.fillRect(0, 0, 256, 256); const r = lcg(17);
    for (let y = 0; y < 256; y += 32) {
      g.fillStyle = `rgb(${128 + r() * 24 | 0},${78 + r() * 16 | 0},${40 + r() * 10 | 0})`; g.fillRect(0, y + 2, 256, 28);
      for (let i = 0; i < 10; i++) { g.strokeStyle = 'rgba(70,35,10,.25)'; g.lineWidth = 1; g.beginPath(); const yy = y + 4 + r() * 24; g.moveTo(0, yy); g.bezierCurveTo(80, yy + r() * 4, 170, yy - r() * 4, 256, yy); g.stroke(); }
    }
  }),
};
// what the menu board shows (src/systems/minigames/TeaShop.js has the orderable list with the same prices)
export const TEA_BOARD = [['珍珠奶茶', 50], ['茉莉綠茶', 30], ['四季春青茶', 30], ['冬瓜檸檬', 45], ['蜂蜜檸檬綠', 50], ['鮮奶紅茶', 55]];
export function buildTeaShop(I, scene) {
  const S = TEA_SPEC, W = S.W, D = S.D, F = S.FH, top = F * S.NF, DK = S.DECK;
  const k = new Kit(I, S.ox, S.oz, S.ang);
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set(o.color || '#ffffff'); m.emissiveMap = o.map || null; m.emissiveIntensity = lift; }
    return m;
  };
  const MT = {
    facade: def('teaFacade2', () => std({ map: YHT.facade(), color: '#dcdcd8' })),
    yellow: def('teaYellow', () => std({ color: TEA_YELLOW, roughness: 0.5 }, 0.12)),
    wood: def('teaWood', () => std({ color: '#c79a68', roughness: 0.55 }, 0.25)),
    darkWood: def('teaDarkWood', () => std({ map: TEAT.deck(), color: '#8a5a36', roughness: 0.6 })),
    deck: def('teaDeckM', () => std({ map: TEAT.deck(), roughness: 0.7 })),
    black: def('teaBlack', () => std({ color: '#1b1b1c', metalness: 0.4, roughness: 0.5 })),
    grey: def('teaGrey', () => std({ color: '#8b9094', metalness: 0.3, roughness: 0.5 })),
    wall: def('teaWall2', () => std({ color: '#f6f4ee' }, 0.2)),
    tile: def('teaTile', () => std({ map: YHT.tile(), roughness: 0.4 }, 0.2)),
    steel: def('teaSteel', () => std({ color: '#c7cbcf', metalness: 0.75, roughness: 0.3 }, 0.08)),
    white: def('teaWhite', () => std({ color: '#f4f4f0', roughness: 0.4 }, 0.2)),
    purple: def('teaPurple', () => std({ color: '#b27ccd', roughness: 0.45 }, 0.1)),
    shutter: def('teaShutter', () => std({ color: '#9aa0a3', metalness: 0.4, roughness: 0.5 })),
    light: def('teaLight', () => new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff3d6', emissiveIntensity: 1.2 })),
  };
  const CH = 2.95;                      // shop ceiling
  const OX0 = 2.2, OX1 = 4.5;           // open order window (above the counter)
  const GX1 = W - 0.2;                  // logo glass from OX1 to here
  const DX0 = 0.55, DX1 = 1.45;         // glass door on the right (as seen from the street)
  const SILL = 1.05, WTOP = 2.5;        // counter sill / window head

  // ---------------- shell ----------------
  k.box(0, 0.2, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(W - 0.2, W, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, -0.6, top, D - 0.2, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0, W, top, top + 0.15, 0, D, 'gray', { col: false });
  k.box(0, W, top, top + 0.9, -0.05, 0.15, MT.facade, { col: false, tile: [0.6, 0.6] });
  k.box(0.6, 1.8, top, top + 1.1, 3.0, 4.2, 'steel', { col: false });
  // inside: warm wood walls, tiled floor, lit ceiling
  k.box(0.2, W - 0.2, -0.6, 0.05, 0, D - 0.2, MT.tile, { col: false, tile: [0.6, 0.6] });
  k.box(0.2, 0.22, 0.05, CH, 0.2, D - 0.2, MT.wood, { col: false });
  k.box(W - 0.22, W - 0.2, 0.05, CH, 0.2, D - 0.2, MT.wood, { col: false });
  k.box(0.2, W - 0.2, 0.05, CH, D - 0.22, D - 0.2, MT.wood, { col: false });
  k.box(0.2, W - 0.2, CH, CH + 0.05, 0.2, D - 0.2, MT.white, { col: false });
  for (const z of [1.8, 4.4]) k.box(1.0, W - 1.0, CH - 0.04, CH, z - 0.15, z + 0.15, MT.light, { col: false });
  for (const x of [OX0 + 0.5, OX1 - 0.5]) { k.cyl(x, 0.9, 0.12, 2.3, 2.45, '#f3e2b8', { r1: 0.04, seg: 12 }); k.box(x - 0.005, x + 0.005, 2.45, CH, 0.895, 0.905, MT.black, { col: false }); } // pendant lamps

  // ---------------- ground-floor front ----------------
  // order counter: yellow below the sill, open window above, glass with the lit logo to its left (street view)
  k.box(OX0, GX1, 0, SILL, 0, 0.25, MT.yellow);
  k.box(OX0 - 0.05, GX1, SILL, SILL + 0.05, -0.32, 0.6, MT.white, { col: false });             // sill / counter top
  k.wallRect(OX0, GX1, -0.32, 0.25, 0, SILL + 0.05);
  k.box(OX1, OX1 + 0.06, SILL, WTOP, 0, 0.12, MT.black, { col: false });                         // window mullion
  k.box(OX1 + 0.06, GX1, SILL + 0.05, WTOP, 0.05, 0.09, 'glass', { col: false });
  k.plane(TEAT.logo(), GX1 - OX1 - 0.2, (GX1 - OX1 - 0.2) * 0.75, (OX1 + GX1) / 2 + 0.03, (SILL + WTOP) / 2 + 0.05, 0.3, Math.PI, { emissive: 0.8 });
  k.box(OX0, GX1, WTOP, 2.62, 0, 0.2, MT.black, { col: false });                                 // window head
  k.box(OX0 - 0.06, OX0, SILL, WTOP, 0, 0.15, MT.black, { col: false });
  // right of the counter: white wall with posters and the glass door (in the photo the shop's side entrance)
  k.box(0.2, DX0, 0, 2.62, 0, 0.2, MT.wall); k.box(DX1, OX0 - 0.06, 0, 2.62, 0, 0.2, MT.wall);
  k.box(DX0, DX1, 2.2, 2.62, 0, 0.2, MT.wall, { col: false });
  k.box(DX0, DX1, 0, 2.2, 0.08, 0.12, 'glass');
  for (const x of [DX0, DX1 - 0.05]) k.box(x, x + 0.05, 0, 2.2, 0.05, 0.15, MT.black, { col: false });
  k.box(DX0 + 0.08, DX0 + 0.12, 0.9, 1.25, 0.0, 0.05, MT.steel, { col: false });                 // door handle
  k.plane(TEAT.poster(), 0.5, 0.69, (DX1 + OX0) / 2, 1.5, -0.01, Math.PI);
  // grey canopy under the sign, then the yellow sign board right across the front
  k.box(-0.05, W + 0.05, 2.62, 2.7, -0.95, 0.05, MT.grey, { col: false });
  k.box(-0.05, W + 0.05, 2.7, 2.78, -0.97, -0.9, MT.grey, { col: false });
  k.box(0.05, W - 0.05, 2.84, 3.6, -0.16, 0, MT.yellow, { col: false });
  k.plane(TEAT.sign(), W - 0.2, (W - 0.2) * 136 / 1024, W / 2, 3.22, -0.165, Math.PI, { emissive: 0.35 });
  // round blade sign on a white bracket, sticking out over the deck at the right-hand end
  k.box(0.32, 0.38, 2.9, 3.62, -0.08, 0, MT.white, { col: false });
  k.box(0.32, 0.38, 3.48, 3.53, -1.15, 0, MT.white, { col: false });
  k.box(0.32, 0.38, 3.0, 3.05, -0.6, 0, MT.white, { col: false });
  for (const sd of [-1, 1]) k.plane(TEAT.blade(), 0.92, 0.92, 0.35 + sd * 0.025, 3.22, -0.85, sd * Math.PI / 2, { transparent: true, emissive: 0.35 });

  // upper floors: light grey tile, aluminium windows behind iron grilles, window AC units
  k.box(0.2, W - 0.2, F, top, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, 3.6, F, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  for (let f = 1; f < S.NF; f++) {
    const y = f * F;
    k.plane(YHT.win(), 1.6, 1.4, W - 1.3, y + 1.55, -0.01, Math.PI);
    k.plane(YHT.win(), 1.6, 1.4, W / 2 - 0.4, y + 1.55, -0.01, Math.PI);
    k.box(W - 2.1, W - 0.5, y + 0.82, y + 2.28, -0.25, -0.2, 'metal', { col: false });           // grille frames
    for (const xx of [W / 2 - 1.2, W / 2 + 0.4]) k.box(xx, xx + 0.04, y + 0.82, y + 2.28, -0.25, -0.02, 'metal', { col: false });
    k.box(0.55, 1.35, y + 1.95, y + 2.45, -0.4, -0.02, '#e6e2d6', { col: false });               // window AC
    k.box(W - 1.75, W - 0.95, y + 0.3, y + 0.8, -0.4, -0.02, '#e6e2d6', { col: false });
  }

  // ---------------- wooden deck in front, black railing, benches ----------------
  k.box(-0.05, W + 0.05, -0.4, 0.14, -DK, 0, MT.deck, { col: false, tile: [1, 1] });
  I.addSurface(k.rect(-0.05, W + 0.05, -DK, 0), (x, z) => Math.max(0.02, k.base + 0.14 - H(x, z))); // level with the rendered boards
  const RY = 0.14, RH = 1.0, RZ = -DK + 0.04, RX0 = 1.7;            // railing along the front from RX0 to the west end, then back to the wall
  k.box(RX0, W, RY + RH - 0.04, RY + RH, RZ - 0.02, RZ + 0.02, MT.black, { col: false });
  k.box(RX0, W, RY + 0.1, RY + 0.13, RZ - 0.015, RZ + 0.015, MT.black, { col: false });
  for (let x = RX0; x <= W + 0.001; x += 0.12) k.box(x - 0.012, x + 0.012, RY + 0.1, RY + RH, RZ - 0.012, RZ + 0.012, MT.black, { col: false });
  k.box(W - 0.04, W, RY + RH - 0.04, RY + RH, RZ, 0, MT.black, { col: false });
  for (let z = RZ; z < 0; z += 0.12) k.box(W - 0.032, W - 0.008, RY + 0.1, RY + RH, z - 0.012, z + 0.012, MT.black, { col: false });
  k.wallLine(RX0, RZ, W, RZ, 0, RY + RH); k.wallLine(W - 0.02, RZ, W - 0.02, 0, 0, RY + RH);
  // two benches against the railing: dark wood tops on black steel frames
  for (const [b0, b1] of [[1.9, 3.7], [4.0, 5.8]]) {
    const z0 = RZ + 0.12, z1 = RZ + 0.5;
    k.box(b0, b1, RY + 0.42, RY + 0.48, z0, z1, MT.darkWood, { col: false });
    for (const x of [b0 + 0.08, b1 - 0.12]) { k.box(x, x + 0.04, RY, RY + 0.42, z0 + 0.04, z0 + 0.08, MT.black, { col: false }); k.box(x, x + 0.04, RY, RY + 0.42, z1 - 0.08, z1 - 0.04, MT.black, { col: false }); }
    k.box(b0 + 0.08, b1 - 0.08, RY + 0.12, RY + 0.15, (z0 + z1) / 2 - 0.02, (z0 + z1) / 2 + 0.02, MT.black, { col: false });
    k.wallRect(b0, b1, z0, z1, 0, RY + 0.48);
  }

  // ---------------- counter inside, back bar ----------------
  // drinks waiting on the sill: the shop's purple cups with sealed lids
  for (const x of [2.5, 2.68, 2.86]) {
    k.cyl(x, -0.1, 0.043, SILL + 0.05, SILL + 0.25, MT.purple, { r1: 0.05, seg: 12 });
    k.cyl(x, -0.1, 0.05, SILL + 0.25, SILL + 0.27, MT.white, { seg: 12 });
  }
  k.box(OX1 - 0.55, OX1 - 0.2, SILL + 0.05, SILL + 0.1, 0.25, 0.5, '#222', { col: false });       // POS
  k.box(OX1 - 0.52, OX1 - 0.23, SILL + 0.1, SILL + 0.34, 0.4, 0.44, '#1a1a1a', { col: false });
  k.plane(T.sign('票投彥霖 ✌', '#ffd23f', '#c41d2a', 'teaVote', 256, 96, 46), 0.46, 0.17, 1.0, 1.45, -0.01, Math.PI); // 吱吱's poster by the door
  const BZ = D - 0.85;
  k.box(0.25, W - 0.25, 0, 0.92, BZ, D - 0.22, MT.steel);
  k.box(0.25, W - 0.25, 0.92, 0.96, BZ - 0.04, D - 0.22, MT.white, { col: false });
  for (const x of [2.4, 2.95, 3.5, 4.05]) {
    k.cyl(x, BZ + 0.32, 0.17, 0.96, 1.5, MT.steel, { seg: 16 });
    k.cyl(x, BZ + 0.32, 0.12, 1.5, 1.56, '#2a2a2a', { seg: 12 });
  }
  k.box(4.55, 5.05, 0.96, 1.5, BZ + 0.1, BZ + 0.55, MT.white, { col: false });                   // cup sealer
  k.box(4.65, 4.95, 1.2, 1.24, BZ + 0.08, BZ + 0.1, '#c41d2a', { col: false });
  k.box(0.9, 1.9, 0.96, 1.08, BZ + 0.1, BZ + 0.55, MT.steel, { col: false });                    // shaker station
  for (const x of [1.1, 1.4, 1.7]) k.cyl(x, BZ + 0.3, 0.05, 1.08, 1.32, MT.steel, { r1: 0.06, seg: 10 });
  k.plane(TEAT.menu(), 3.4, 1.27, 3.3, 2.1, D - 0.225, Math.PI, { emissive: 0.5 });
  k.box(OX0 - 0.1, OX0 - 0.06, 0, 1.0, 0.25, 1.4, MT.wood); // partition between the door lobby and the bar

  k.finish(scene);
  return {
    k, base: k.base,
    counter: k.w((OX0 + OX1) / 2, -0.9),                     // where you stand (on the deck) to order
    clerk: { at: k.w(OX1 - 0.4, 0.95), h: k.heading(Math.PI) }, // the regular clerk at the register
    zz: { at: k.w(OX0 + 0.6, 1.0), h: k.heading(Math.PI) },     // 吱吱 shaking drinks at the window on his shifts
  };
}

// =====================================================================
// 中北路 south side around 茶學苑 (from the user's street-view photos, east -> west):
//   雪糕早午餐 / BRUNCH 活力早午餐 · 大門口 影印 · [中北路193巷] · 麥食堂 (2 floors + roof canopy, a shuttered
//   unit next to 茶學苑) · 茶學苑 · 早啊早餐店 · 新時代眼鏡 · 得正 · 一成專業影印中心 · ZEISS 173/175 風格店
// Same frame as TEA_SPEC (+x runs west along 中北路, +z away from the street, facade z = 0). Each building
// is its own Kit so it sits on its own ground; none is enterable. TEA_ROW lists [x0, x1, depth] per lot.
// =====================================================================
const TEA_ROW = {
  brunch: [-22.4, -17.2, 11], daimen: [-17.2, -13.0, 11], mai: [-7.4, -0.05, 10],
  zaoa: [6.02, 9.3, 10], newera: [9.3, 13.6, 11], dezheng: [13.6, 18.0, 11], yicheng: [18.0, 21.6, 11], zeiss: [21.6, 30.0, 12],
};
// concrete apron (騎樓 strip) in front of the row, out to the kerb of 中北路 (8.5 m wide, tools/roads.json):
// the facades stand 6.3 m from the street's centre line, 5.9-6.1 m at 大門口 / BRUNCH past the bend
const TEA_APRON = { brunch: 1.65, daimen: 1.65 }, teaApron = (lot) => TEA_APRON[lot] ?? 2.05;
export function teaRowFootprints() {
  const { ox, oz, ang } = TEA_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  const r = (x0, x1, d, a) => [w(x0, -a - 0.2), w(x1, -a - 0.2), w(x1, d + 0.3), w(x0, d + 0.3)];
  const R = TEA_ROW; // the 193巷 between 大門口 and 麥食堂 stays clear
  return [r(R.brunch[0] - 0.2, R.daimen[1] + 0.1, 11, teaApron('brunch')), r(R.mai[0] - 0.1, R.mai[1], 10, teaApron('mai')), r(R.zaoa[0], R.zeiss[1] + 0.2, 12, teaApron('zaoa'))];
}
export function buildTeaRow(I, scene) {
  const S = TEA_SPEC, c = Math.cos(S.ang), s = Math.sin(S.ang);
  const at = (lot) => { const [x0] = TEA_ROW[lot]; const k = new Kit(I, S.ox + x0 * c, S.oz + x0 * s, S.ang); k.lot = lot; return k; };
  const width = (lot) => TEA_ROW[lot][1] - TEA_ROW[lot][0];
  const { MR, FRONT, shopGlass, ac, win, blade, shell } = rowTools();
  const kits = {};

  // ---------- 雪糕早午餐 / BRUNCH 活力早午餐 (5 floors, white tile, blue-grey sign band, grey rain hood) ----------
  {
    const k = at('brunch'), w = width('brunch'), d = TEA_ROW.brunch[2], F = 3.0, top = 15; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.1, w - 0.1, 2.5, 3.9, -0.3, 0, '#3f5670', { col: false });
    k.plane(ROWT.brunch(), w - 0.3, 1.32, w / 2, 3.2, -0.31, FRONT, { emissive: 0.3 });
    k.box(-0.05, w + 0.05, 4.2, 4.35, -1.0, 0, '#9aa3ab', { col: false });                      // rain hood over the shopfront
    k.box(-0.05, w + 0.05, 4.0, 4.35, -1.05, -0.95, '#3f5670', { col: false });
    k.plane(ROWT.shutter(), w - 0.6, 0.6, w / 2, 2.15, -0.03, FRONT);                            // shutter half up
    shopGlass(k, 0.3, w - 0.3, 0, 1.85, ROWT.shop('brunch', '#e9c98f', '#7a5a3a', 3));
    k.box(0.6, 1.3, 0, 1.2, -0.7, -0.6, '#f08a2c', { col: false });                               // A-frame menu board
    for (let f = 1; f < 5; f++) { const y = f * F + 1.4; win(k, w / 2, y + 0.85, w - 1.0, 1.5, false); k.box(0.3, w - 0.3, y - 0.05, y + 0.05, -0.15, 0, '#8a96a2', { col: false }); }
    ac(k, w - 1.2, 2 * F + 0.4); ac(k, 0.4, 3 * F + 0.4);
    k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 });                    // water tank
  }
  // ---------- 大門口 影印 (4 floors, white tile, purple sign; side wall with AC units faces the 193巷) ----------
  {
    const k = at('daimen'), w = width('daimen'), d = TEA_ROW.daimen[2], F = 3.2, top = 12.8; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.05, w - 0.05, 2.6, 3.6, -0.32, 0, '#3a2d9c', { col: false });
    k.plane(ROWT.daimen(), w - 0.15, 0.94, w / 2, 3.1, -0.33, FRONT, { emissive: 0.35 });
    k.box(0.1, w - 0.1, 2.3, 2.6, -0.08, 0, '#1d4f5c', { col: false });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('daimen', '#eef2f4', '#8b8f94', 5));
    for (const x of [0.5, w - 0.9]) k.plane(ROWT.vert('dm', '#3a2d9c', '#ffffff', '大門口影印'), 0.36, 1.8, x, 1.15, -0.04, FRONT);
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2, y + 1.55, w - 1.0, 1.4, false); k.box(0.2, w - 0.2, y + 0.75, y + 0.82, -0.18, 0, '#cfcfca', { col: false }); }
    ac(k, w - 1.3, F + 0.4); ac(k, 0.4, 2 * F + 2.2);
    for (const [z, y] of [[2.2, 4.3], [4.6, 4.3], [2.2, 7.5], [5.4, 10.7]]) k.box(w, w + 0.42, y, y + 0.52, z, z + 0.8, MR.ac, { col: false }); // on the lane-side wall
  }
  // ---------- 麥食堂 block: 2 floors with a mesh-caged 2F balcony and a rusty canopy roof over the terrace ----------
  {
    const k = at('mai'), w = width('mai'), d = TEA_ROW.mai[2], top = 6.6; kits[k.lot] = k;
    k.box(0, w, -0.8, 3.0, 0, d, MR.white);                                                     // ground floor
    k.box(0, w, 3.0, top, 1.1, d, MR.white);                                                    // 2F set back behind the balcony
    k.box(0, w, 2.9, 3.15, -0.35, 1.1, MR.concrete, { col: false });                             // balcony slab
    k.box(0, w, 3.15, 3.75, -0.35, -0.2, MR.white, { col: false });                              // parapet
    k.box(0, w, 6.3, top, -0.35, 1.1, MR.white, { col: false });                                 // lintel
    const mesh = k.plane(ROWT.mesh(), w - 0.2, 2.55, w / 2, 5.0, -0.3, FRONT, { transparent: true, double: true });
    mesh.material.map.repeat.set((w - 0.2) / 0.3, 2.55 / 0.3); mesh.material.alphaTest = 0.3; mesh.material.needsUpdate = true;
    for (let x = 0; x <= w + 0.01; x += w / 4) k.box(Math.min(x, w - 0.06), Math.min(x, w - 0.06) + 0.06, 3.75, 6.3, -0.33, -0.27, MR.black, { col: false });
    for (const x of [1.0, 3.2, 5.4]) win(k, x + 0.5, 4.8, 1.6, 1.3, false);
    for (const x of [0.4, 2.5, 4.9]) k.box(x, x + 0.5, 3.75, 4.05, -0.3, -0.05, MR.plant, { col: false }); // potted plants on the parapet
    // roof terrace: back room, railing, rusty corrugated canopy on black posts
    k.box(0, w, top, top + 0.15, 0, d, 'gray', { col: false });
    k.box(0.3, w - 0.3, top + 0.15, top + 2.4, 4.0, d - 0.2, MR.white, { col: false });
    k.box(0, w, top + 0.15, top + 1.1, -0.35, -0.3, MR.white, { col: false });
    k.box(-0.3, w + 0.3, 9.05, 9.12, -0.9, d, MR.rust, { col: false });
    k.box(-0.3, w + 0.3, 9.12, 9.2, -0.9, d, MR.roof, { col: false });
    for (const x of [0, w / 2, w - 0.1]) k.box(x, x + 0.1, top, 9.05, -0.3, -0.2, MR.black, { col: false });
    // east unit (x 0..4.2): 麥食堂 — navy sign, red opening banner, glass front, white vertical sign at the east end
    k.box(0.05, 4.2, 2.35, 2.95, -0.25, 0, '#26356b', { col: false });
    k.plane(ROWT.mai(), 4.1, 0.6, 2.13, 2.65, -0.26, FRONT, { emissive: 0.35 });
    k.plane(ROWT.maiBanner(), 1.5, 0.47, 3.35, 1.95, -0.06, FRONT);
    shopGlass(k, 0.2, 4.1, 0, 2.3, ROWT.shop('mai', '#f4dcae', '#6b3b2a', 9), -0.03);
    k.plane(ROWT.vert('mai', '#ffffff', '#c41d2a', '韓式炸雞', '豆腐煲專門店'), 0.42, 1.95, -0.255, 1.7, -0.345, FRONT);
    k.box(-0.47, -0.04, 0.7, 2.7, -0.34, -0.3, MR.white, { col: false });
    k.box(0, 4.3, 0, 0.16, -0.9, 0, MR.concrete, { col: false, surface: true });                 // two steps up to the door
    k.box(0, 4.3, 0.16, 0.32, -0.45, 0, MR.concrete, { col: false, surface: true });
    // west unit (x 4.3..w): closed shutter under a white wall, round signs
    k.plane(ROWT.shutter(), w - 4.6, 2.5, (4.3 + w) / 2, 1.25, -0.02, FRONT);
    k.box(5.25, 5.8, 2.55, 3.05, -0.08, 0, MR.black, { col: false });                              // small black logo board
  }
  // ---------- 早啊早餐店 (narrow 4-floor old concrete house, grilles, AC units, tin shack on the roof) ----------
  {
    const k = at('zaoa'), w = width('zaoa'), d = TEA_ROW.zaoa[2], F = 3.0, top = 12; kits[k.lot] = k;
    shell(k, w, d, top, MR.grime, [3, 3]);
    k.box(0.05, w - 0.05, 2.45, 3.15, -0.25, 0, '#5b4337', { col: false });
    k.plane(ROWT.zaoa(), w - 0.15, 0.62, w / 2, 2.8, -0.26, FRONT, { emissive: 0.3 });
    k.box(0, w, 2.25, 2.35, -0.8, 0, '#6b4a3a', { col: false });                                  // cloth awning
    shopGlass(k, 0.15, w - 0.95, 0, 2.2, ROWT.shop('zaoa', '#f1e2c4', '#8a6d4c', 11));
    k.plane(YHT.win(), 0.7, 2.1, w - 0.5, 1.05, -0.03, FRONT);                                    // iron gate to the stairs
    k.box(0.4, 1.0, 0, 0.9, -0.5, -0.05, '#3f7a4c', { col: false });                              // crates by the door
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2 + 0.3, y + 1.5, 1.9, 1.3); ac(k, 0.15, y + 0.4); }
    k.box(0.4, w - 0.4, F + 0.75, F + 2.3, -0.45, -0.4, 'metal', { col: false });                // 2F grille cage
    k.box(0.2, w - 0.2, top + 0.12, top + 2.2, 1.2, d - 0.5, MR.roof, { col: false });           // rooftop tin shack
    k.box(0, w, top + 2.2, top + 2.3, 0.6, d, MR.roof, { col: false });
  }
  // ---------- 新時代眼鏡 (billboard over 2F-3F, tall pink sign by 早啊, eyewear posters, Prize disc) ----------
  {
    const k = at('newera'), w = width('newera'), d = TEA_ROW.newera[2], F = 3.1, top = 12.4; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.25, w - 0.1, 3.2, 9.4, -0.45, -0.35, MR.black, { col: false });
    k.plane(ROWT.newera(), w - 0.45, 6.0, (0.25 + w - 0.1) / 2, 6.3, -0.46, FRONT, { emissive: 0.3 });
    for (const y of [4.0, 8.6]) k.box(0.25, w - 0.1, y, y + 0.06, -0.35, 0, 'metal', { col: false });
    k.box(-0.05, 0.5, 2.6, 13.6, -0.75, -0.55, '#a8456f', { col: false });                        // the tall pink sign
    k.plane(ROWT.newSign(), 0.5, 10.9, 0.22, 8.1, -0.76, FRONT, { emissive: 0.35 });
    k.box(0.15, 0.3, 2.6, 13.6, -0.55, 0, MR.black, { col: false });
    k.plane(ROWT.posters(), 2.6, 1.3, w - 1.55, 1.55, -0.03, FRONT);
    k.plane(ROWT.shutter(), 1.2, 2.4, 1.15, 1.2, -0.02, FRONT);
    k.box(0.5, w, 2.4, 2.6, -0.1, 0, MR.white, { col: false });
    blade(k, ROWT.prize(), 0.95, 2.3, 0.6, 0.45);
    win(k, w / 2, 3 * F + 1.5, 2.6, 1.3); ac(k, 0.7, 3 * F + 0.3);
  }
  // ---------- 得正 (white tile with red-brown edging, balcony cages, blue sign and blade) ----------
  {
    const k = at('dezheng'), w = width('dezheng'), d = TEA_ROW.dezheng[2], F = 3.2, top = 12.8; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    for (const x of [0, w - 0.18]) k.box(x, x + 0.18, 3.0, top, -0.08, 0, '#8a3a2a', { col: false });
    k.box(0.05, w - 0.05, 2.5, 3.4, -0.3, 0, '#1f5bb8', { col: false });
    k.plane(ROWT.dezheng(), w - 0.15, 0.82, w / 2, 2.95, -0.31, FRONT, { emissive: 0.35 });
    k.plane(ROWT.dzBanner(), 2.4, 0.45, w / 2, 2.15, -0.05, FRONT);
    shopGlass(k, 0.2, w - 0.2, 0, 1.9, ROWT.shop('dezheng', '#efe6d2', '#5b4a35', 13));
    k.cyl(w - 0.7, -0.5, 0.2, 0, 0.5, '#5a4a3a', { seg: 10 }); k.cyl(w - 0.7, -0.5, 0.5, 0.5, 1.6, MR.plant, { r1: 0.25, seg: 8 }); // potted 雞蛋花
    for (let f = 1; f < 4; f++) {
      const y = f * F; win(k, w / 2, y + 1.55, w - 1.2, 1.4);
      k.box(0.35, w - 0.35, y + 0.6, y + 0.68, -0.55, 0, 'metal', { col: false });
      for (let x = 0.35; x <= w - 0.34; x += 0.25) k.box(x, x + 0.03, y + 0.68, y + 2.5, -0.55, -0.52, '#dedfdc', { col: false });
      k.box(0.35, w - 0.35, y + 2.5, y + 2.56, -0.55, 0, 'metal', { col: false });
    }
    blade(k, ROWT.dzBlade(), w - 0.35, 5.6, 0.85, 0.75);
  }
  // ---------- 一成專業影印中心 (red brick, green window cages, fire ladder, tall white sign, green awning) ----------
  {
    const k = at('yicheng'), w = width('yicheng'), d = TEA_ROW.yicheng[2], F = 3.1, top = 12.4; kits[k.lot] = k;
    shell(k, w, d, top, MR.brick, [1.5, 1.5]);
    k.plane(ROWT.ycBand(), w - 0.2, 0.62, w / 2, 2.75, -0.04, FRONT, { emissive: 0.25 });
    k.box(-0.05, w + 0.05, 2.3, 2.38, -1.0, 0, MR.awning, { col: false });
    shopGlass(k, 0.2, w - 0.2, 0, 2.25, ROWT.shop('yicheng', '#f3f3ee', '#7d7f84', 17));
    for (const x of [0.6, 2.6]) k.plane(ROWT.vert('yc', '#ffffff', '#d0202a', '數位影印'), 0.3, 1.2, x, 1.2, -0.05, FRONT);
    for (const [x, z, h] of [[2.9, -0.6, 0.9], [3.0, -1.0, 0.6], [0.3, -0.7, 0.45]]) k.box(x - 0.25, x + 0.25, 0, h, z - 0.2, z + 0.2, MR.blue, { col: false }); // boxes of paper
    for (let f = 1; f < 4; f++) {
      const y = f * F; win(k, w / 2 + 0.3, y + 1.5, 2.2, 1.4);
      k.box(w / 2 - 0.85, w / 2 + 1.45, y + 0.75, y + 2.25, -0.45, -0.4, MR.green, { col: false });
    }
    k.plane(ROWT.yicheng(), 0.72, 6.5, 1.45, 7.3, -0.62, FRONT, { transparent: true, emissive: 0.35 });
    k.box(1.42, 1.48, 3.6, 11.0, -0.6, 0, MR.black, { col: false });
    for (const x of [0.12, 0.52]) k.box(x, x + 0.04, 3.0, top + 0.8, -0.95, -0.91, MR.rust, { col: false }); // fire ladder
    for (let y = 3.2; y < top + 0.8; y += 0.35) k.box(0.12, 0.56, y, y + 0.03, -0.94, -0.92, MR.rust, { col: false });
  }
  // ---------- ZEISS 173 / 175 風格店 (white vertical slats over the upper floors, big banner, glass front) ----------
  {
    const k = at('zeiss'), w = width('zeiss'), d = TEA_ROW.zeiss[2], top = 10.8; kits[k.lot] = k;
    shell(k, w, d, top, MR.white);
    for (let x = 0.1; x < w; x += 0.28) k.box(x, x + 0.08, 3.4, top + 0.8, -0.62, -0.5, MR.white, { col: false });
    k.box(0, w, top + 0.8, top + 0.9, -0.65, 0, MR.white, { col: false });
    k.plane(ROWT.zeiss(), 5.6, 2.8, w / 2 + 0.6, 6.2, -0.64, FRONT, { emissive: 0.2 });
    k.box(0.1, 3.6, 2.6, 3.3, -0.66, -0.1, '#6f7f8f', { col: false });
    k.plane(ROWT.zBand(), 3.5, 0.66, 1.85, 2.95, -0.67, FRONT, { emissive: 0.25 });
    k.box(3.6, w, 2.6, 3.3, -0.66, -0.6, MR.white, { col: false });
    for (let x = 3.7; x < w; x += 0.22) k.box(x, x + 0.06, 2.6, 3.3, -0.7, -0.66, MR.white, { col: false });
    shopGlass(k, 0.15, w - 0.15, 0, 2.55, ROWT.shop('zeiss', '#f6efe3', '#3d3a36', 19));
    k.plane(ROWT.num('173', '173'), 1.2, 0.3, w - 1.2, 2.4, -0.06, FRONT);
    k.plane(ROWT.num('175', '風格店 175'), 1.8, 0.3, 2.6, 2.4, -0.06, FRONT);
  }
  // ---------- concrete apron along the shopfronts (the tea shop has its own deck) ----------
  // (the kerbside 1.8 m of it is 中北路's green walkway, src/world/MapBuilder.js: the concrete only fills the rest)
  for (const [lot, a] of Object.entries(TEA_ROW)) {
    const k = kits[lot], w = a[1] - a[0], d = teaApron(lot) - 1.8;
    if (d > 0.05) k.box(-0.01, w + 0.01, -0.5, 0.05, -d, 0, MR.concrete, { col: false, surface: true });
  }
  finishRow(scene, Object.values(kits));
}
