// 大仁街：中北路口的轉角店面、大仁街兩側公寓店面、原泰阿杜／餡實餃色（都不能進去）。
// 從 src/world/Interiors.js 原封不動搬出來；src/world/zones/Zones.js 決定建造順序、保留範圍、要拿掉的填充樓。
import * as THREE from 'three';
import { ctex, font, T, MATS, Kit, finishRow, lcg, YHT, sg, ROWT, rowTools } from '../Kit.js';

// =====================================================================
// The corner across 中北路 from 大門口, where 大仁街 leaves 中北路 for the main gate (user's street-view photos).
//   along 中北路 (north side, going west from the corner): 幾何光學 GEOMETRIC OPTICS · 經典數位印刷 JINGDIAN ·
//     神威影印社 shen wei · 藍色美而美
//   along 大仁街 (west side, going towards the gate): 天一影印 / 套房出租 / 天一打字行 in the tall corner building ·
//     菁英 elite 英日語 (billboard on the roof) · 信義房屋 本透店 for sale · 麻友趣 自助桌遊24H
//     (mint-green siding, teal window hoods) · 陽光煎匙; then 原泰阿杜 / 餡實餃色 round the bend (buildDarenGd, below)
// Two frames share the corner point P (where the two facade lines meet): frame A runs east along 中北路 (the
// row sits at x < 0), frame B runs up 大仁街 (x > 0); in both z grows away from the street. The corner
// building is a prism filling the wedge between them (it has no shopfront on 中北路). None is enterable.
// =====================================================================
export const DAREN_SPEC = {
  px: -223.66, pz: 96.45,                     // corner of the two facade lines (6.3 m off 中北路, 4.5 m off 大仁街)
  angA: Math.atan2(-0.354, 0.935),            // +x east along 中北路
  angB: Math.atan2(24.5, 41.3),               // +x up 大仁街 towards the gate
  A: { geo: [-6, 0, 10], jd: [-10.2, -6, 10], sw: [-14, -10.2, 10], blue: [-17.8, -14, 10] }, // stop short of the tower behind (f1525)
  B: { elite: [6, 11.5, 9], sinyi: [11.5, 16.5, 9], mahjong: [16.5, 25.5, 9], sunny: [25.5, 31.5, 9] }, // B x = metres along 大仁街; 原泰阿杜 (buildDarenGd) takes over from 31.5, round the bend, then 餡實餃色 and the lot at s 57
  cornerB: 6, cornerD: 10.9, apronA: 1.6, apronB: 1.8, // apronA: to the kerb of 中北路 (8.5 m, tools/roads.json)
};
const darenFrame = (ang) => { const c = Math.cos(ang), s = Math.sin(ang), { px, pz } = DAREN_SPEC; return (x, z) => [px + x * c - z * s, pz + x * s + z * c]; };
export function darenFootprints() {
  const S = DAREN_SPEC, a = darenFrame(S.angA), b = darenFrame(S.angB);
  return [
    [a(-17.9, -S.apronA - 0.2), a(0.3, -S.apronA - 0.2), b(0, -S.apronB - 0.2), b(31.7, -S.apronB - 0.2), b(31.7, 9.3), b(S.cornerB, S.cornerD), a(-17.9, 10.3)],
  ];
}
// the red food-photo banner of 原泰阿杜: white panel of dish photos over a red strip (only the phone line is legible)
function gdBanner(g, w, h, text) {
  g.fillStyle = '#c91f2b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6f3ec'; g.fillRect(6, 6, w - 12, h - 58);
  const r = lcg(w), cols = ['#d98a3a', '#7fae5a', '#c9452e', '#e8c04a', '#a8c97a', '#d96a3a', '#f0dca0', '#8a4a2a'];
  for (let x = 12, i = 0; x < w - 90; x += 100, i++) {
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.ellipse(x + 44, 6 + (h - 58) / 2, 40, 36, 0, 0, 7); g.fill();
    g.fillStyle = cols[(i * 3 + 2) % cols.length]; g.beginPath(); g.ellipse(x + 44 + r() * 8, 6 + (h - 58) / 2 + 4, 24, 20, 0, 0, 7); g.fill();
    g.fillStyle = '#d6d2c8'; g.fillRect(x + 6, h - 62, 76, 3);
  }
  if (text) { g.fillStyle = '#ffffff'; g.font = font(40); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('預約專線：03-466-7555', w * 0.5, h - 28); }
}
const CT = {
  tianyi: () => sg('cnTianyi', 1024, 192, (g) => {
    g.fillStyle = '#25307a'; g.fillRect(0, 0, 1024, 192);
    const papers = [['#c62d4a', 'PAPAGO'], ['#d86a9c', 'PAPAGO'], ['#3f8fc9', 'PAPAGO']];
    papers.forEach(([c, t], i) => { g.fillStyle = c; g.fillRect(24 + i * 128, 26, 112, 140); g.fillStyle = '#fff'; g.font = 'italic 900 22px Georgia,serif'; g.textAlign = 'center'; g.fillText(t, 80 + i * 128, 102); });
    g.fillStyle = '#ffffff'; g.font = font(96); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('天一影印', 470, 80);
    g.font = '700 34px Georgia,serif'; g.fillText('TEL. 03-416-1671', 520, 158);
  }),
  tianyiBand: () => sg('cnTianyiBand', 1024, 96, (g) => {
    g.fillStyle = '#2f6f68'; g.fillRect(0, 0, 1024, 96); g.fillStyle = '#ffffff'; g.font = font(54); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('天一影印廣場', 30, 50); g.font = '900 50px Arial'; g.fillText('TEL:4161671', 560, 50);
  }),
  tianyiShop: () => sg('cnTianyiShop', 512, 256, (g) => { // dark-blue glass with the service list
    g.fillStyle = '#1d2a6b'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#ffffff'; g.font = font(22, 700); g.textAlign = 'left';
    ['· 論文印刷裝訂', '· 彩色輸出', '· 名片 / 海報', '· 講義 / 考古題', '· 掃描 / 護貝'].forEach((t, i) => g.fillText(t, 300, 40 + i * 42));
    g.fillStyle = '#fbe6b8'; g.fillRect(20, 20, 250, 216); g.fillStyle = '#7a5a3a'; for (let y = 60; y < 236; y += 40) g.fillRect(20, y, 250, 4);
  }),
  suite: () => sg('cnSuite', 256, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#1e3f8a'; g.font = font(54); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('套房出租', 128, 52);
    g.fillStyle = '#c41d2a'; g.font = font(22, 700); g.fillText('0932-xxx-xxx', 128, 104);
  }),
  geo: () => sg('cnGeo', 1024, 256, (g) => {
    g.fillStyle = '#26272b'; g.fillRect(0, 0, 1024, 256);
    g.fillStyle = '#e8a3b4'; g.beginPath(); g.moveTo(40, 210); g.lineTo(210, 210); g.lineTo(210, 40); g.closePath(); g.fill();
    g.fillStyle = '#d8ead2'; g.fillRect(150, 120, 120, 110); g.fillStyle = '#a9d1ec'; g.beginPath(); g.arc(300, 120, 64, 0, 7); g.fill();
    g.fillStyle = '#f2f2f2'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = '500 72px "Helvetica Neue",Arial,sans-serif'; g.fillText('GEOMETRIC', 390, 104); const gw = g.measureText('GEOMETRIC ').width;
    g.font = '300 60px "Helvetica Neue",Arial,sans-serif'; g.fillText('OPTICS', Math.min(390 + gw, 1010 - g.measureText('OPTICS').width), 108);
    g.textAlign = 'right'; g.font = font(44, 700); g.fillText('幾 何 光 學', 1000, 204);
  }),
  geoBlade: () => sg('cnGeoBlade', 256, 256, (g) => {
    g.fillStyle = '#26272b'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#e8a3b4'; g.beginPath(); g.moveTo(30, 200); g.lineTo(130, 200); g.lineTo(130, 90); g.closePath(); g.fill();
    g.fillStyle = '#d8ead2'; g.fillRect(100, 140, 70, 64); g.fillStyle = '#a9d1ec'; g.beginPath(); g.arc(180, 130, 40, 0, 7); g.fill();
    g.fillStyle = '#f2f2f2'; g.font = font(26, 700); g.textAlign = 'center'; g.fillText('幾何光學眼鏡所', 128, 46); g.font = '500 22px Arial'; g.fillText('GEOMETRIC OPTICS', 128, 74);
  }),
  siding: () => ctex('cnSiding', 64, 64, (g) => { g.fillStyle = '#d5d6d3'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) { g.fillStyle = '#bfc0bc'; g.fillRect(0, y + 6, 64, 2); } }),
  pink: () => ctex('cnPink', 128, 128, (g) => { // pink mosaic with a white diamond
    g.fillStyle = '#d8a6a0'; g.fillRect(0, 0, 128, 128); const r = lcg(41);
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) { g.fillStyle = `rgb(${214 + r() * 14 | 0},${160 + r() * 14 | 0},${152 + r() * 12 | 0})`; g.fillRect(x + 1, y + 1, 7, 7); }
  }),
  jd: () => sg('cnJd', 1024, 192, (g) => {
    g.fillStyle = '#1f6fd0'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#ffffff'; g.fillRect(780, 0, 244, 192);
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(40, 30, 130, 130, 20); g.fill(); g.fillStyle = '#1f6fd0'; g.font = '900 120px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('J', 105, 100);
    g.fillStyle = '#ffffff'; g.font = '700 70px "Helvetica Neue",Arial'; g.textAlign = 'left'; g.fillText('JINGDIAN', 200, 70); g.font = font(56); g.fillText('經典數位印刷', 200, 145);
    g.fillStyle = '#1f6fd0'; g.font = font(34); g.textAlign = 'center'; g.fillText('桃園中原店', 900, 70); g.font = '700 26px Arial'; g.fillText('TEL (03)456-0318', 900, 130);
  }),
  jdVert: () => sg('cnJdVert', 192, 1024, (g) => {
    g.fillStyle = '#1f6fd0'; g.fillRect(0, 0, 192, 1024); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(10, 10, 172, 1004);
    g.fillStyle = '#ffffff'; g.font = font(112); g.textAlign = 'center'; g.textBaseline = 'middle'; [...'經典數位印刷'].forEach((ch, i) => g.fillText(ch, 96, 90 + i * 132));
    g.font = font(24, 700); g.fillText('桃園中原店', 96, 900); g.fillText('(03)456-0318', 96, 950);
  }),
  sw: () => sg('cnSw', 1024, 192, (g) => {
    g.fillStyle = '#2b3a9c'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#ffffff'; g.font = font(96); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('神威影印社', 30, 80);
    g.fillStyle = '#4fb3ff'; g.font = 'italic 900 70px Arial'; g.fillText('shen wei', 560, 80); g.fillStyle = '#ffffff'; g.font = font(24, 700); g.fillText('論文 · 彩色 · 大圖 · 裝訂', 40, 160);
  }),
  swVert: () => sg('cnSwVert', 192, 1024, (g) => {
    g.fillStyle = '#1e2b86'; g.fillRect(0, 0, 192, 1024); g.fillStyle = '#ffffff'; g.font = font(120); g.textAlign = 'center'; g.textBaseline = 'middle';
    [...'神威影印社'].forEach((ch, i) => g.fillText(ch, 70, 90 + i * 150)); g.save(); g.translate(150, 520); g.rotate(Math.PI / 2); g.fillStyle = '#4fb3ff'; g.font = 'italic 900 72px Arial'; g.fillText('shen wei', 0, 0); g.restore();
    g.font = font(26, 700); g.fillStyle = '#fff'; g.fillText('中原店', 96, 970);
  }),
  mem: () => sg('cnMem', 768, 192, (g) => {
    g.fillStyle = '#2a63b8'; g.fillRect(0, 0, 768, 192); g.fillStyle = '#ffffff'; g.font = font(84); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('藍色美而美', 384, 82);
    g.font = font(30, 700); g.fillText('早午餐 · 漢堡 · 蛋餅', 384, 158);
  }),
  elite: () => sg('cnElite', 1024, 512, (g) => { // the roof billboard
    g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, 1024, 512); g.fillStyle = '#2d3f9a'; g.fillRect(0, 410, 1024, 102);
    g.fillStyle = '#2d3f9a'; g.font = 'italic 900 150px Georgia,serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('elite', 40, 170);
    g.font = '400 34px Georgia,serif'; g.fillText('Language Academy', 60, 270); g.font = font(56); g.fillText('菁英英日語', 60, 350);
    g.fillStyle = '#e9a23b'; g.beginPath(); g.ellipse(760, 230, 120, 150, 0, 0, 7); g.fill(); g.fillStyle = '#f0cfb2'; g.beginPath(); g.ellipse(760, 200, 62, 78, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(760, 150, 70, 46, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#ffffff'; g.font = font(40); g.fillText('英日文會話', 40, 462); g.font = '900 52px Arial'; g.fillText('(03)426-6300', 560, 462);
  }),
  mahjong: () => sg('cnMahjong', 1024, 192, (g) => {
    g.fillStyle = '#f7eef2'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#e0457b'; g.fillRect(0, 0, 1024, 14); g.fillRect(0, 178, 1024, 14);
    g.fillStyle = '#f3c33b'; g.beginPath(); g.arc(90, 96, 66, 0, 7); g.fill(); g.fillStyle = '#c41d2a'; g.font = font(44); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('麻友', 90, 98);
    g.fillStyle = '#c41d2a'; g.font = font(78); g.textAlign = 'left'; g.fillText('麻友趣', 190, 96); g.fillStyle = '#e0457b'; g.font = font(92); g.fillText('自助桌遊24H', 470, 96);
  }),
  mjBanner: () => sg('cnMjBan', 1024, 128, (g) => {
    g.fillStyle = '#c8202a'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#ffe14d'; g.font = font(44); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('麻友趣音樂桌遊來回嘍～　不限時段　買一送一', 512, 66);
  }),
  mint: () => ctex('cnMint', 64, 64, (g) => { g.fillStyle = '#b9d3c0'; g.fillRect(0, 0, 64, 64); for (let x = 0; x < 64; x += 8) { g.fillStyle = '#a3c0ab'; g.fillRect(x + 6, 0, 2, 64); } }),
  lattice: () => sg('cnLattice', 128, 128, (g) => { g.fillStyle = '#5c6c74'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f2f2ee'; for (let i = 0; i <= 128; i += 16) { g.fillRect(i - 2, 0, 4, 128); g.fillRect(0, i - 2, 128, 4); } }),
  tarp: () => ctex('cnTarp', 64, 64, (g) => { for (let x = 0; x < 64; x += 16) { g.fillStyle = '#4f8fd0'; g.fillRect(x, 0, 8, 64); g.fillStyle = '#eef3f7'; g.fillRect(x + 8, 0, 8, 64); } }),
  sinyi: () => sg('cnSinyi', 512, 384, (g) => { // 信義房屋 for-sale board over the shopfront
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 384); g.fillStyle = '#d0202a'; g.fillRect(20, 20, 150, 150);
    g.fillStyle = '#ffffff'; g.font = font(120); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('售', 95, 100);
    g.fillStyle = '#1f5a3a'; g.font = 'italic 900 44px Arial'; g.fillText('SinyiCare', 350, 60); g.font = font(22, 700); g.fillText('信義房屋 中原加盟店', 350, 110);
    g.fillStyle = '#222'; g.font = font(64); g.fillText('本透店', 95, 230); g.font = font(24, 700); g.fillText('土地 25.4 坪', 95, 290);
    g.fillStyle = '#d0202a'; g.font = '900 56px Arial'; g.fillText('03-466-1999', 330, 300);
    g.fillStyle = '#2f8a4a'; g.fillRect(0, 340, 512, 44);
  }),
  sunny: () => sg('cnSunny', 1024, 288, (g) => {
    g.fillStyle = '#f2c230'; g.fillRect(0, 0, 1024, 288); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 270, 1024, 18);
    g.strokeStyle = '#5a4a3a'; g.fillStyle = '#5a4a3a'; g.lineWidth = 5; g.beginPath(); g.arc(150, 150, 50, Math.PI, 0); g.stroke();
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; g.beginPath(); g.moveTo(150 + Math.cos(a) * 62, 150 + Math.sin(a) * 62); g.lineTo(150 + Math.cos(a) * 84, 150 + Math.sin(a) * 84); g.stroke(); }
    g.fillRect(70, 150, 160, 5); g.font = '700 18px Georgia,serif'; g.textAlign = 'center'; g.fillText('HAVE A NICE DAY', 150, 182);
    g.font = font(120); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('陽光煎匙', 280, 135);
    g.font = font(36, 700); g.textAlign = 'right'; g.fillText('手作、新鮮、早午餐', 980, 236);
  }),
  // 原泰阿杜: the round sign (a man in sunglasses), the food-photo banner, the orange-pink brick tile
  aduSign: () => sg('cnAduSign', 256, 256, (g) => {
    g.clearRect(0, 0, 256, 256); g.fillStyle = '#17120f'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    g.fillStyle = '#3b6fa8'; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill();
    g.fillStyle = '#e9a24a'; g.beginPath(); g.arc(128, 128, 112, Math.PI * 0.55, Math.PI * 1.45); g.fill();
    g.fillStyle = '#e8b48f'; g.beginPath(); g.ellipse(100, 140, 44, 56, 0, 0, 7); g.fill();     // face
    g.fillStyle = '#1b1613'; g.beginPath(); g.ellipse(100, 98, 52, 30, 0, Math.PI, 0); g.fill(); // hair
    g.fillRect(52, 98, 14, 40);
    g.fillStyle = '#0d0d0d'; g.fillRect(64, 124, 34, 22); g.fillRect(102, 124, 34, 22); g.fillRect(96, 130, 10, 5); // sunglasses
    g.fillStyle = '#7a3a2c'; g.beginPath(); g.ellipse(100, 176, 14, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#f6efe0'; g.font = font(70); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('阿', 190, 96); g.fillText('杜', 190, 168);
  }),
  gdBannerN: () => sg('cnGdBannerN', 1536, 176, (g) => gdBanner(g, 1536, 176, true)),
  gdBannerC: () => sg('cnGdBannerC', 384, 176, (g) => gdBanner(g, 384, 176, false)),
  gdBrick: () => ctex('cnGdBrick', 128, 128, (g) => { // 1 m of staggered 25 x 12.5 cm tiles, pale grout (tinted by the material)
    g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, 128, 128); const r = lcg(131);
    for (let row = 0; row < 8; row++) for (let c = 0; c < 5; c++) {
      const x = c * 32 - (row % 2 ? 16 : 0), y = row * 16, v = 188 + r() * 40 | 0;
      g.fillStyle = `rgb(${v},${v - 8},${v - 14})`; g.fillRect(x + 1.5, y + 1.5, 29, 13);
    }
  }),
  gdPosters: () => sg('cnGdPosters', 128, 96, (g) => {
    g.fillStyle = '#e9f0f4'; g.fillRect(0, 0, 128, 96); const r = lcg(7);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) { g.fillStyle = ['#4f8fd0', '#f0cf45', '#e8744a', '#8fc7a2'][(x + y * 2) % 4]; g.fillRect(x * 32 + 3, y * 32 + 3, 26, 26); g.fillStyle = '#ffffff'; g.fillRect(x * 32 + 8 + r() * 6, y * 32 + 8, 8, 10); }
  }),
  gdStripe: () => ctex('cnGdStripe', 64, 64, (g) => { for (let x = 0; x < 64; x += 16) { g.fillStyle = '#f3f0dc'; g.fillRect(x, 0, 8, 64); g.fillStyle = '#f0cf45'; g.fillRect(x + 8, 0, 8, 64); } }),
  xsValance: () => sg('cnXsValance', 1024, 128, (g) => {
    for (let x = 0; x < 1024; x += 64) { g.fillStyle = '#f3f0dc'; g.fillRect(x, 0, 32, 128); g.fillStyle = '#f0cf45'; g.fillRect(x + 32, 0, 32, 128); }
    g.fillStyle = 'rgba(243,240,220,.85)'; g.fillRect(250, 20, 524, 88);
    g.fillStyle = '#4a5a8a'; g.font = font(84); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('餡實餃色', 512, 66);
  }),
  xsBanner: () => sg('cnXsBanner', 768, 128, (g) => { // red banner with a yellow burst (the small print is unreadable in the photos: left out)
    g.fillStyle = '#c8202a'; g.fillRect(0, 0, 768, 128); g.fillStyle = '#f2c230'; g.beginPath();
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, rr = i % 2 ? 40 : 60; g.lineTo(100 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g.closePath(); g.fill();
    g.fillStyle = '#f2c230'; g.fillRect(200, 52, 500, 8); g.fillRect(200, 72, 420, 8);
  }),
  xsFlag: () => sg('cnXsFlag', 192, 512, (g) => {
    g.fillStyle = '#f2d24a'; g.fillRect(0, 0, 192, 512); g.strokeStyle = '#b8862a'; g.lineWidth = 6; g.strokeRect(8, 8, 176, 496);
    g.fillStyle = '#9a3a22'; g.font = font(92); g.textAlign = 'center'; g.textBaseline = 'middle';
    [...'餡實餃色'].forEach((ch, i) => g.fillText(ch, 96, 70 + i * 100)); g.font = font(30, 700); g.fillText('早午晚餐', 96, 478);
  }),
  reed: () => ctex('cnReed', 64, 64, (g) => { g.fillStyle = '#b58a4a'; g.fillRect(0, 0, 64, 64); const r = lcg(97); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${90 + r() * 60 | 0},${60 + r() * 40 | 0},20,.5)`; g.fillRect(r() * 64, 0, 1.5, 64); } }),
};
export function buildDarenCorner(I, scene) {
  const S = DAREN_SPEC, { MR, FRONT, shopGlass, ac, win, blade, shell } = rowTools();
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const MC = {
    beige: def('cnBeige', () => std({ map: YHT.facade(), color: '#efe2c4' })),
    siding: def('cnSidingM', () => std({ map: CT.siding() })),
    pink: def('cnPinkM', () => std({ map: CT.pink() })),
    mint: def('cnMintM', () => std({ map: CT.mint() })),
    tarp: def('cnTarpM', () => std({ map: CT.tarp(), roughness: 0.7 })),
    teal: def('cnTeal', () => std({ color: '#4aa597', roughness: 0.5 })),
    eliteBlue: def('cnEliteBlue', () => std({ color: '#2457b5', roughness: 0.6 })),
  };
  const fA = darenFrame(S.angA), fB = darenFrame(S.angB);
  const kits = [];
  const kit = (frame, ang, x0) => { const [x, z] = frame(x0, 0); const k = new Kit(I, x, z, ang); kits.push(k); return k; };
  const lot = (side, name) => { const [x0, x1, d] = S[side][name]; return { k: kit(side === 'A' ? fA : fB, side === 'A' ? S.angA : S.angB, x0), w: x1 - x0, d }; };
  // tall sign standing out from the wall (perpendicular to the facade), readable from both directions of the street
  const tallBlade = (k, tex, x, y0, y1, out, gap = 0.15) => {
    for (const sd of [-1, 1]) k.plane(tex, out, y1 - y0, x + sd * 0.04, (y0 + y1) / 2, -gap - out / 2, sd * Math.PI / 2, { emissive: 0.3 });
    k.box(x - 0.035, x + 0.035, y0, y1, -gap - out, -gap, MR.white, { col: false });
    for (const y of [y0 + 0.3, y1 - 0.3]) k.box(x - 0.02, x + 0.02, y, y + 0.05, -gap, 0, MR.black, { col: false });
  };

  // ---------- the corner building: 6 floors of cream tile, fronting 大仁街 only (天一影印 / 套房出租 / 天一打字行);
  // on 中北路 the first shop is 幾何光學, whose east wall meets this building at the corner point P ----------
  {
    const kA = kit(fA, S.angA, 0), kB = kit(fB, S.angB, 0), top = 19.2, F = 3.2, W = S.cornerB, D = S.cornerD;
    const toA = (bx, bz) => { const [x, z] = fB(bx, bz); return kA.l(x, z); };
    const bb = toA(W, D), dA = S.A.geo[2];
    const pts = [[0, 0], toA(W, 0), bb, [bb[0], dA], [0, dA]];
    kA.prism(pts, -0.8, top, MC.beige);
    kA.prism(pts, top, top + 0.15, 'gray', { shadow: false });
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; kA.wallLine(a[0], a[1], b[0], b[1], 0, top); }
    kB.box(0.8, 4.4, top + 0.15, top + 2.4, 3.0, 7.0, MR.roof, { col: false });                    // tin roof shed
    // 大仁街 face (x 0..W): 天一影印 sign over a teal band and the shop; the 套房出租 stair door at the far end
    kB.box(0.05, W - 0.05, 2.55, 3.45, -0.3, 0, '#25307a', { col: false });
    kB.plane(CT.tianyi(), W - 0.15, 0.85, W / 2, 3.0, -0.31, FRONT, { emissive: 0.35 });
    kB.plane(CT.tianyiBand(), 3.6, 0.34, 2.0, 2.36, -0.04, FRONT, { emissive: 0.25 });
    shopGlass(kB, 0.1, 3.9, 0, 2.15, CT.tianyiShop(), -0.03);
    kB.plane(CT.suite(), 0.9, 0.45, W - 1.0, 2.35, -0.05, FRONT);
    kB.box(4.05, W - 0.1, 0, 2.15, -0.06, 0, '#7fae9a', { col: false });                            // tiled stair entrance
    kB.plane(YHT.win(), 0.9, 2.0, W - 1.0, 1.0, -0.07, FRONT);
    kB.plane(T.verticalText('天一打字行', 'tyType'), 0.34, 1.7, 4.2, 1.1, -0.08, FRONT);
    kB.plane(ROWT.vert('suite', '#ffffff', '#c41d2a', '套房招租中'), 0.32, 1.6, W - 0.2, 1.1, -0.08, FRONT);
    for (let f = 1; f < 6; f++) {
      const y = f * F;
      if (f === 1) { kB.box(0.2, W - 0.2, y + 0.4, y + 2.6, -0.06, 0, 'tint', { col: false }); for (let x = 0.2; x <= W - 0.2; x += 1.12) kB.box(x, x + 0.06, y + 0.4, y + 2.6, -0.1, 0, MR.white, { col: false }); }
      else { win(kB, W / 2, y + 1.5, W - 1.4, 1.4, f > 3); kB.box(0.4, W - 0.4, y + 0.72, y + 0.8, -0.2, 0, MR.white, { col: false }); }
      if (f < 4) ac(kB, W - 1.1, y + 0.05);
    }
    // the part of its east wall that rises above 幾何光學, seen from 中北路: AC units
    for (const [z, y] of [[2.5, 13.6], [6.0, 13.6], [4.0, 16.8]]) kA.box(-0.45, -0.02, y, y + 0.52, z, z + 0.8, MR.ac, { col: false });
  }
  // ---------- 幾何光學 GEOMETRIC OPTICS (grey siding with white diamonds, big black sign, blade sign) ----------
  {
    const { k, w, d } = lot('A', 'geo'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MC.siding, [2, 2]);
    k.box(0.05, w - 0.05, 2.45, 3.9, -0.38, 0, '#26272b', { col: false });
    k.plane(CT.geo(), w - 0.15, 1.36, w / 2, 3.17, -0.39, FRONT, { emissive: 0.3 });
    k.box(0, w, 2.3, 2.45, -0.8, 0, '#3a3b3e', { col: false });                                     // thin canopy
    shopGlass(k, 1.3, w - 0.2, 0, 2.25, ROWT.shop('geo', '#fbf8f2', '#b48a5a', 47));
    k.box(1.6, w - 0.5, 0, 0.02, -0.7, -0.1, '#8a2a2a', { col: false });                            // red door mat
    k.plane(YHT.win(), 0.9, 2.2, 0.65, 1.1, -0.03, FRONT);                                          // steel gate to the stairs (west end)
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2 - 0.4, y + 1.5, 1.4, 1.5, false); win(k, w / 2 + 1.6, y + 1.5, 1.2, 1.1, false); }
    for (let i = 0; i < 4; i++) { const x = 0.9 + i * 1.3, y = 3 * F + 2.65; k.box(x - 0.22, x + 0.22, y - 0.22, y + 0.22, -0.06, 0, MR.white, { col: false }); }
    blade(k, CT.geoBlade(), w - 0.25, 5.6, 1.1, 0.9);
  }
  // ---------- 經典數位印刷 JINGDIAN (pink tile, blue sign, tall blue blade sign) ----------
  {
    const { k, w, d } = lot('A', 'jd'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MC.pink, [1.2, 1.2]);
    k.box(0.05, w - 0.05, 2.45, 3.45, -0.32, 0, '#1f6fd0', { col: false });
    k.plane(CT.jd(), w - 0.15, 0.95, w / 2, 2.95, -0.33, FRONT, { emissive: 0.35 });
    k.plane(ROWT.vert('jd24', '#1f6fd0', '#ffffff', '24H'), 0.3, 0.6, w - 0.4, 1.9, -0.05, FRONT);
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('jd', '#f2f4f6', '#8b8f94', 53));
    for (const [x, z, h] of [[1.0, -0.4, 0.5], [1.5, -0.45, 0.35]]) k.box(x - 0.25, x + 0.25, 0, h, z - 0.2, z + 0.2, '#b58b5a', { col: false });
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2, y + 1.5, w - 1.2, 1.3, f === 1); }
    for (let i = 0; i < 3; i++) { const x = 0.8 + i * 1.3, y = 3 * F + 2.65; k.box(x - 0.2, x + 0.2, y - 0.2, y + 0.2, -0.05, 0, MR.white, { col: false }); }
    tallBlade(k, CT.jdVert(), 0.25, 4.2, 10.6, 1.25);
  }
  // ---------- 神威影印社 shen wei (white tile with iron balconies, dark-blue band and tall blade sign) ----------
  {
    const { k, w, d } = lot('A', 'sw'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.05, w - 0.05, 2.45, 3.4, -0.3, 0, '#2b3a9c', { col: false });
    k.plane(CT.sw(), w - 0.15, 0.9, w / 2, 2.92, -0.31, FRONT, { emissive: 0.35 });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('sw', '#eef0f3', '#7d8086', 59));
    for (let f = 1; f < 4; f++) {
      const y = f * F; win(k, w / 2, y + 1.55, w - 1.0, 1.4);
      k.box(0.3, w - 0.3, y + 0.6, y + 0.68, -0.5, 0, 'metal', { col: false });
      for (let x = 0.3; x <= w - 0.29; x += 0.22) k.box(x, x + 0.03, y + 0.68, y + 1.6, -0.5, -0.47, 'metal', { col: false });
    }
    tallBlade(k, CT.swVert(), w - 0.3, 3.9, 11.6, 1.2);
  }
  // ---------- 藍色美而美 (breakfast shop: blue sign, open front with the griddle) ----------
  {
    const { k, w, d } = lot('A', 'blue'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.05, w - 0.05, 2.45, 3.3, -0.3, 0, '#2a63b8', { col: false });
    k.plane(CT.mem(), w - 0.15, 0.8, w / 2, 2.88, -0.31, FRONT, { emissive: 0.35 });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('mem', '#f7ecd2', '#8a6a44', 79));
    k.box(w - 1.9, w - 0.3, 0, 0.95, -0.8, -0.15, 'steel', { col: false });                          // griddle counter
    k.box(w - 1.8, w - 0.4, 0.95, 0.98, -0.75, -0.2, '#2b2b2b', { col: false });
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2, y + 1.5, w - 1.2, 1.3, f < 3); if (f < 3) ac(k, 0.3, y + 0.2); }
  }
  // ---------- 菁英 elite 英日語 (3 floors, blue awning, AC units, the billboard on the roof) ----------
  {
    const { k, w, d } = lot('B', 'elite'), F = 3.2, top = 9.6;
    shell(k, w, d, top, MR.white);
    k.box(-0.05, w + 0.05, 2.55, 2.75, -1.1, 0, MC.eliteBlue, { col: false });
    k.box(-0.05, w + 0.05, 2.35, 2.75, -1.15, -1.05, MC.eliteBlue, { col: false });
    shopGlass(k, 0.3, w - 0.3, 0, 2.3, ROWT.shop('elite', '#f1dcb8', '#6b4a2a', 61));
    for (let i = 0; i < 4; i++) ac(k, 0.4 + i * 1.3, F + 0.3 + (i % 2) * 0.7);
    win(k, w / 2, F + 1.9, w - 1.2, 0.9); win(k, w / 2, 2 * F + 1.5, w - 1.2, 1.3, false);
    k.box(0.2, w - 0.2, top + 0.12, top + 4.2, 0.6, 0.75, MR.black, { col: false });               // billboard frame on the roof
    k.plane(CT.elite(), w - 0.4, (w - 0.4) / 2, w / 2, top + 0.12 + (w - 0.4) / 4 + 0.6, 0.58, FRONT, { emissive: 0.3 });
    for (const x of [0.5, w - 0.6]) k.box(x, x + 0.1, top, top + 0.75, 0.6, 1.6, MR.black, { col: false });
    for (const x of [0.8, w - 0.9]) k.box(x, x + 0.08, top + 3.4, top + 3.5, -0.4, 0.6, MR.black, { col: false }); // floodlight arms
  }
  // ---------- 麻友趣 自助桌遊24H (mint siding, teal window hoods, lattice windows, tarp-covered machines) ----------
  {
    const { k, w, d } = lot('B', 'mahjong'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MC.mint, [1, 1]);
    k.box(0, 0.4, 3.0, top, -0.06, 0, MR.brick, { col: false });                  // brick strip at the corner
    k.box(0.05, w - 0.05, 2.5, 3.35, -0.6, -0.3, '#f7eef2', { col: false });
    k.plane(CT.mahjong(), w - 0.15, 0.82, w / 2, 2.93, -0.61, FRONT, { emissive: 0.4 });
    k.box(-0.05, w + 0.05, 3.35, 3.45, -1.4, 0, MR.roof, { col: false });                           // tin roof over the arcade
    k.plane(CT.mjBanner(), 4.6, 0.58, w - 2.6, 2.05, -0.05, FRONT);
    shopGlass(k, 0.4, 2.2, 0, 2.3, ROWT.shop('mj', '#e9f0ea', '#4a6a58', 67));
    for (const x of [3.0, 4.4]) k.box(x, x + 1.2, 0, 1.7, -1.1, -0.2, MC.tarp, { col: false });     // claw machines under tarps
    k.box(5.8, 6.8, 0, 1.1, -0.5, -0.1, '#cfd3d6', { col: false });                                 // drinking-water machine
    for (let f = 1; f < 4; f++) {
      const y = f * F;
      for (const x of [w / 2 - 1.6, w / 2 + 1.6]) {
        k.plane(CT.lattice(), 2.2, 1.6, x, y + 1.5, -0.03, FRONT);
        k.box(x - 1.25, x + 1.25, y + 2.4, y + 2.5, -0.7, 0, MC.teal, { col: false });               // window hood
      }
      if (f < 3) { ac(k, 0.6, y + 0.1, -0.55); ac(k, w - 1.6, y + 0.1, -0.55); }
    }
    k.box(1.2, w - 1.2, top + 0.12, top + 2.6, 2.0, d - 0.5, MR.white, { col: false });             // rooftop room with a gable
    k.plane(CT.lattice(), 1.8, 1.4, w / 2, top + 1.4, 1.98, FRONT);
    k.box(0.9, w - 0.9, top + 2.6, top + 2.75, 1.4, d, MR.roof, { col: false });
  }
  // ---------- 信義房屋 本透店: 4 floors, a row of AC units on the tin canopy, green window hoods, for-sale board ----------
  {
    const { k, w, d } = lot('B', 'sinyi'), F = 3.1, top = 12.4;
    shell(k, w, d, top, MC.beige);
    k.box(-0.05, w + 0.05, 2.6, 2.72, -1.1, 0, MR.roof, { col: false });                             // tin canopy
    for (let i = 0; i < 4; i++) ac(k, 0.3 + i * 1.15, 2.72, -0.95);
    k.plane(ROWT.shutter(), w - 0.6, 2.4, w / 2, 1.2, -0.02, FRONT);
    k.plane(CT.sinyi(), 2.2, 1.65, w / 2 + 0.4, 1.25, -0.06, FRONT);
    for (let f = 1; f < 4; f++) {
      const y = f * F; win(k, w / 2, y + 1.5, w - 1.2, 1.3);
      k.box(0.5, w - 0.5, y + 2.3, y + 2.4, -0.6, 0, MC.teal, { col: false });
    }
  }
  // ---------- 陽光煎匙: red-brick 4 floors with green iron window hoods, the big yellow sign, glass front and plants ----------
  {
    const { k, w, d } = lot('B', 'sunny'), F = 3.1, top = 12.4;
    shell(k, w, d, top, MR.brick, [1.5, 1.5]);
    k.box(0.05, w - 0.05, 2.45, 4.0, -0.35, 0, '#f2c230', { col: false });
    k.plane(CT.sunny(), w - 0.15, 1.5, w / 2, 3.22, -0.36, FRONT, { emissive: 0.3 });
    k.box(-0.05, w + 0.05, 2.35, 2.45, -0.9, 0, '#3a3530', { col: false });
    shopGlass(k, 0.3, w - 1.4, 0, 2.3, ROWT.shop('sunny', '#f6ead2', '#a07a4a', 83));
    k.plane(YHT.win(), 0.9, 2.2, w - 0.85, 1.1, -0.03, FRONT);                                      // iron gate to the stairs
    for (const x of [1.0, 3.2]) { k.cyl(x, -0.55, 0.18, 0, 0.45, '#6b4a2a', { seg: 10 }); k.cyl(x, -0.55, 0.4, 0.45, 1.2, MR.plant, { r1: 0.2, seg: 8 }); }
    for (let f = 2; f < 4; f++) {
      const y = f * F; for (const x of [1.4, w - 1.6]) { win(k, x, y + 1.5, 1.8, 1.3); k.box(x - 1.0, x + 1.0, y + 2.3, y + 2.4, -0.55, 0, MC.teal, { col: false }); }
    }
    ac(k, 0.3, F + 1.2);
  }
  // ---------- concrete aprons along both streets ----------
  {
    const kA = kits[0], kB = kits[1];
    // the kerbside 1.8 m along 中北路 is its green walkway (src/world/MapBuilder.js): concrete only behind it
    if (S.apronA > 1.85) kA.box(-17.8, 0.3, -0.5, 0.05, -(S.apronA - 1.8), 0, MR.concrete, { col: false, surface: true });
    kB.box(-0.3, 31.7, -0.5, 0.05, -S.apronB, 0, MR.concrete, { col: false, surface: true });
  }
  finishRow(scene, kits);
}

// =====================================================================
// 大仁街, past the OSM town houses f1550 / f1551: rows of 4–7 floor 公寓 with shops on the ground floor, laid out from Google street view
// (2026-05) and the OSM shop names. A generic street-house kit: each lot is a row in DAREN_ST.lots
//   [s0, s1, side, spec]  s = metres along 大仁街 from 中北路, side +1 = right walking from 中北路, -1 = left
//   spec: nf floors, fh floor height, d depth, wall (WALL key), sign [text, bg, fg, sub?] or null,
//         ground 'shop' | 'shutter' | 'gate', awn awning colour, hood window-hood colour, bal 'grille' | 'cage' | 'open',
//         vert [text, bg, fg] tall blade sign, roof 'shack' | 'tank'
// Each lot is its own Kit squared to the street at its middle, facade SET metres off the centre line.
// =====================================================================
export const DAREN_ROAD = [[-225.2, 90.3], [-183.9, 114.8], [-171.0, 157.2], [-167.7, 165.0], [-121.4, 210.9], [-97.7, 233.9], [-79.8, 254.6], [-75.6, 259.8], [-64.6, 270.5], [-60.8, 274.2], [-53.7, 283.3], [-31.8, 301.3], [24.5, 348.8]];
const DAREN_SET = 4.3, DAREN_APRON = 1.8;
export const DAREN_ST = {
  drop: ['f1550', 'f1551', 'f1552', 'f1553', 'f1554', 'f1555', 'f1556', 'f1557', // generic filler houses these lots replace
    'f1549', 'f1559', 'f1542', 'f1543', 'f1544', 'f1545', 'f1546', 'f1547', 'f1548', 'f1526',
    'f1666', 'f1665', 'f1664', 'f1663', 'f1662', 'f1661', 'f1660', 'f1659', 'f1658', 'f1657', 'f1656'],
  lots: [
    // right side after 原泰阿杜 and 餡實餃色 (buildDarenGd, s 48-57). Those two shops are on the old f1550 / f1551 plots (14 and 16
    // 大仁街, next to 陽光煎匙 at 12), so the two lots below carry no sign: what their real shops are could not be read.
    [57, 60, 1, { nf: 5, wall: 'grey', sign: null, ground: 'gate', awn: '#1e1e1f', bal: 'grille', hood: '#3f8a6a' }],
    [60, 64.6, 1, { nf: 5, wall: 'grey', sign: null, ground: 'shop', awn: '#2a2522', bal: 'cage' }],
    [64.6, 69, 1, { nf: 5, wall: 'tile', sign: null, ground: 'shop', bal: 'grille', hood: '#4aa597' }],
    [69, 75, 1, { nf: 5, wall: 'beige', sign: ['大三元麻將會館', '#8a1414', '#f4c64a'], ground: 'gate', bal: 'cage', vert: ['麻將', '#8a1414', '#f4c64a'] }],
    [75, 80.2, 1, { nf: 4, wall: 'tile', sign: ['丸冰', '#f3f1ec', '#555046', "maru's ice"], ground: 'shop', awn: '#e8e4da', bal: 'grille', hood: '#4aa597' }],
    [80.2, 85.6, 1, { nf: 5, wall: 'grey', sign: null, ground: 'shutter', awn: '#3f8a6a', bal: 'cage', hood: '#4aa597', roof: 'shack' }],
    [85.6, 91.5, 1, { nf: 5, wall: 'pinkGrey', sign: null, ground: 'gate', awn: '#3f8a6a', bal: 'grille' }],
    // left side, from where the campus fence ends to the bend
    [59, 63.5, -1, { d: 7, nf: 5, wall: 'tile', sign: ['薰衣草', '#6b3fa0', '#ffffff', '韓式海苔飯捲'], ground: 'shop', awn: '#3c4f8a', bal: 'cage', hood: '#3f8a6a' }],
    [63.5, 68, -1, { nf: 5, wall: 'tile', sign: ['大圖輸出', '#2a63b8', '#ffffff'], ground: 'shop', awn: '#2a63b8', bal: 'cage', hood: '#3f8a6a' }],
    [68, 73.5, -1, { nf: 5, wall: 'tile', sign: ['瑞麟美而美', '#d0202a', '#ffffff'], ground: 'shop', awn: '#2a63b8', bal: 'cage', hood: '#3f8a6a' }],
    [73.5, 78.5, -1, { nf: 5, wall: 'tile', sign: null, ground: 'shutter', bal: 'cage', hood: '#3f8a6a', roof: 'tank' }],
    [78.5, 84, -1, { nf: 5, wall: 'grey', sign: ['沐樂食堂', '#2f2a26', '#f0d9a8'], ground: 'shop', awn: '#3a3530', bal: 'cage' }],
    [84, 88.5, -1, { nf: 4, wall: 'grime', sign: null, ground: 'gate', bal: 'grille', roof: 'shack' }],
    [88.5, 94, -1, { nf: 7, fh: 3.0, wall: 'beige', sign: ['墨爾漢堡', '#ffffff', '#222222'], ground: 'shop', awn: '#c62026', bal: 'grille' }],
    // section 3: the bend to 大仁四街 (s ≈ 166). Right: grey stone-tile 公寓 with green slanted awnings; left: red-brown
    // tile blocks with a dark arcade, then 7–8 floor towers
    [93, 99, 1, { nf: 5, wall: 'beige', sign: null, ground: 'gate', bal: 'grille', roof: 'tank' }],
    [100, 105, 1, { nf: 5, wall: 'grey', sign: null, ground: 'shutter', bal: 'cage', hood: '#3f8a6a' }],
    [105, 110, 1, { nf: 5, wall: 'stone', sign: null, ground: 'gate', awn: '#3f8a6a', bal: 'grille', hood: '#3f8a6a' }],
    [110, 115.5, 1, { nf: 5, wall: 'stone', sign: ['晨食司控', '#f4f4f0', '#2a5aa8'], ground: 'shop', awn: '#3f8a6a', bal: 'grille', hood: '#3f8a6a' }],
    [115.5, 121, 1, { nf: 5, wall: 'stone', sign: ['8 Code 鬆餅', '#f3e3c8', '#5a3a1c'], ground: 'shop', awn: '#3f8a6a', bal: 'grille', hood: '#3f8a6a' }],
    [121, 126, 1, { nf: 5, wall: 'stone', sign: null, ground: 'shutter', awn: '#3f8a6a', bal: 'grille', hood: '#3f8a6a', roof: 'shack' }],
    [126, 131.5, 1, { nf: 5, wall: 'grey', sign: ['功夫温泉', '#1f3a5f', '#ffffff'], ground: 'shop', bal: 'cage' }],
    [131.5, 137, 1, { nf: 5, wall: 'tile', sign: null, ground: 'gate', bal: 'grille', hood: '#3f8a6a' }],
    [137, 143, 1, { nf: 6, wall: 'grey', sign: ['桌弄', '#8a2a22', '#f6e7d0'], ground: 'shop', bal: 'grille', vert: ['桌弄', '#a3262a', '#ffffff'] }],
    [143, 148, 1, { d: 7, nf: 5, wall: 'tile', sign: null, ground: 'shutter', bal: 'cage', hood: '#3f8a6a' }],
    [148, 153.5, 1, { d: 7, nf: 5, wall: 'tile', sign: ['Carousel 旋轉木馬', '#f6e8ef', '#c2477a', '兒童服飾'], ground: 'shop', awn: '#e7b3c8', bal: 'grille' }],
    [153.5, 158, 1, { d: 7, nf: 5, wall: 'grey', sign: null, ground: 'gate', bal: 'cage', roof: 'shack' }],
    [158, 161.5, 1, { d: 7, nf: 5, wall: 'tile', sign: ['川督極品麻辣臭豆腐', '#d0202a', '#ffffff'], ground: 'shop', awn: '#2a63b8', bal: 'grille' }],
    [104, 110, -1, { nf: 5, wall: 'redbrown', sign: ['享玩桌遊', '#2a7a4a', '#ffffff'], ground: 'shop', bal: 'grille' }],
    [110, 116, -1, { nf: 5, wall: 'redbrown', sign: null, ground: 'gate', bal: 'grille', roof: 'tank' }],
    [116, 122, -1, { nf: 5, wall: 'redbrown', sign: null, ground: 'shutter', bal: 'grille' }],
    [122, 128, -1, { nf: 5, wall: 'pinkGrey', sign: null, ground: 'shutter', bal: 'cage', hood: '#3f8a6a' }],
    [128, 134, -1, { nf: 6, wall: 'beige', sign: null, ground: 'gate', bal: 'grille' }],
    [134, 140, -1, { nf: 8, wall: 'beige', sign: null, ground: 'shop', awn: '#2a63b8', bal: 'open' }],
    [140, 145, -1, { nf: 8, wall: 'beige', sign: null, ground: 'shutter', bal: 'open' }],
    [145, 149.5, -1, { nf: 5, wall: 'tile', sign: ['AS艾拾金耳', '#1d1d1f', '#e8c27a', '采耳專門店'], ground: 'shop', bal: 'grille' }],
    [149.5, 153.5, -1, { nf: 5, wall: 'tile', sign: ['州味涼麵', '#f2c230', '#8a1414'], ground: 'shop', awn: '#c62026', bal: 'grille' }],
    [153.5, 158, -1, { nf: 5, wall: 'grey', sign: ['福祿壽囍鯛魚燒', '#c62026', '#ffe14d'], ground: 'shop', bal: 'cage' }],
    [158, 164, -1, { nf: 8, wall: 'tile', sign: ['德式披薩', '#2f2a26', '#ffffff'], ground: 'shop', bal: 'open' }],
    // section 4: 大仁四街 to the end. Right: older 3–5 floor houses and 透天 with tin canopies, side lanes at
    // s ≈ 199 (實踐路80巷), 233 (實踐路70巷), 265 (大仁三街), 294 (大仁街84巷); left: one-storey tin-roofed stalls up to
    // where the campus starts (s ≈ 192)
    [169.5, 174.5, 1, { nf: 4, wall: 'tile', sign: ['六季鮮魚湯', '#1f5aa8', '#ffffff'], ground: 'shop', awn: '#1f5aa8', bal: 'grille' }],
    [174.5, 179.5, 1, { nf: 4, wall: 'beige', sign: null, ground: 'shutter', bal: 'grille', tin: true }],
    [179.5, 185, 1, { nf: 5, wall: 'beige', sign: null, ground: 'gate', bal: 'cage', roof: 'shack' }],
    [185, 190, 1, { nf: 5, wall: 'beige', sign: ['熊樂火鍋', '#2b2320', '#f6d9a0'], ground: 'shop', bal: 'grille', tin: true }],
    [190, 195.5, 1, { nf: 5, wall: 'tile', sign: ['一起開丼', '#f4f1e6', '#c0392b', 'Ms.mo 奶酪小姐'], ground: 'shop', bal: 'grille', tin: true }],
    [202.5, 208, 1, { nf: 4, wall: 'grey', sign: null, ground: 'shutter', bal: 'cage', tin: true }],
    [208, 213, 1, { nf: 4, wall: 'tile', sign: null, ground: 'gate', bal: 'grille', tin: true }],
    [213, 218.5, 1, { nf: 4, wall: 'tile', sign: ['漢堡邦', '#f2c230', '#8a1414'], ground: 'shop', bal: 'grille', tin: true }],
    [218.5, 224, 1, { nf: 4, wall: 'grey', sign: null, ground: 'shutter', bal: 'grille', tin: true }],
    [224, 229, 1, { nf: 4, wall: 'beige', sign: ['宜珍快餐', '#d0202a', '#ffffff'], ground: 'shop', bal: 'cage', tin: true }],
    [235.5, 240.5, 1, { nf: 4, wall: 'tile', sign: ['艾修通訊', '#1f6fd0', '#ffffff'], ground: 'shop', bal: 'grille' }],
    [240.5, 246, 1, { nf: 4, wall: 'beige', sign: ['中福鍋燒麵', '#f6e7c4', '#8a1414'], ground: 'shop', bal: 'grille', tin: true }],
    [246, 251, 1, { nf: 3, wall: 'tile', sign: null, ground: 'shutter', bal: 'grille', tin: true, frame: '#c62026' }],
    [251, 256, 1, { nf: 4, wall: 'grey', sign: ['花茶大師', '#3b6b3a', '#ffffff', 'Master Of Tea'], ground: 'shop', bal: 'grille' }],
    [256, 261.5, 1, { nf: 3, wall: 'tile', sign: ['艾尚豆花', '#f4ead6', '#6b3a1a'], ground: 'shop', bal: 'grille', tin: true }],
    [268.5, 273.5, 1, { nf: 4, wall: 'grey', sign: ['食麪', '#1d1d1f', '#ffffff'], ground: 'shop', bal: 'grille' }],
    [273.5, 279, 1, { nf: 4, wall: 'beige', sign: null, ground: 'shutter', bal: 'cage', tin: true }],
    [279, 285, 1, { nf: 3, wall: 'tile', sign: null, ground: 'gate', bal: 'grille', tin: true }],
    [285, 290.5, 1, { nf: 4, wall: 'beige', sign: null, ground: 'shutter', bal: 'grille', roof: 'tank' }],
    [296.5, 302, 1, { nf: 3, wall: 'beige', sign: null, ground: 'gate', bal: 'grille', tin: true }],
    [302, 308, 1, { nf: 3, wall: 'tile', sign: null, ground: 'gate', bal: 'grille', tin: true }],
    [308, 314, 1, { nf: 3, wall: 'beige', sign: ['找個地方 cafe', '#efe6d6', '#4a3a2a'], ground: 'shop', bal: 'grille', tin: true }],
    [314, 320, 1, { nf: 4, wall: 'grey', sign: null, ground: 'shutter', bal: 'cage' }],
    [320, 326, 1, { nf: 4, wall: 'tile', sign: ['咖喱就好啦', '#f2c230', '#5a3a1c'], ground: 'shop', bal: 'grille', tin: true }],
    [326, 332, 1, { nf: 4, wall: 'beige', sign: null, ground: 'gate', bal: 'grille' }],
    [332, 338, 1, { nf: 4, wall: 'tile', sign: null, ground: 'shutter', bal: 'cage', tin: true }],
    [338, 344, 1, { nf: 4, wall: 'grey', sign: null, ground: 'gate', bal: 'grille' }],
    [344, 351, 1, { nf: 4, wall: 'tile', sign: ['全家便利商店', '#0a9d58', '#ffffff', 'FamilyMart'], ground: 'shop', bal: 'grille' }],
    [168, 176, -1, { d: 6, nf: 1, fh: 2.8, wall: 'grime', sign: null, ground: 'shutter', tin: true }],
    [176, 184, -1, { d: 6, nf: 1, fh: 2.8, wall: 'grime', sign: null, ground: 'shop', tin: true }],
    [184, 192, -1, { d: 6, nf: 1, fh: 2.8, wall: 'grime', sign: null, ground: 'shutter', tin: true }],
  ],
};
function darenAt(s) {
  const R = DAREN_ROAD; let acc = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i], b = R[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= acc + L || i === R.length - 2) { const t = (s - acc) / L; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L }; }
    acc += L;
  }
}
// local frame of one lot: origin at its start corner on the facade line, +x along the facade (towards s0 on the
// left side so the facade faces the street), +z away from the street
function darenLotFrame([s0, s1, side]) {
  const m = darenAt((s0 + s1) / 2), w = s1 - s0, nx = -m.uz * side, nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux, az = side > 0 ? m.uz : -m.uz;
  return { ox: m.x + nx * DAREN_SET - ax * w / 2, oz: m.z + nz * DAREN_SET - az * w / 2, ang: Math.atan2(az, ax), w };
}
export function darenStreetFootprints() {
  return DAREN_ST.lots.map((L) => {
    const { ox, oz, ang, w } = darenLotFrame(L), c = Math.cos(ang), s = Math.sin(ang), d = L[3].d || 10;
    const p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    return [p(-0.1, -DAREN_APRON - 0.2), p(w + 0.1, -DAREN_APRON - 0.2), p(w + 0.1, d), p(-0.1, d)];
  });
}
const genSign = (text, bg, fg, sub) => sg(`dsSign_${  text  }${bg}`, 1024, 192, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 192); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let px = 116; g.font = font(px); while (g.measureText(text).width > 940 && px > 40) { px -= 4; g.font = font(px); }
  g.fillText(text, 512, sub ? 80 : 98);
  if (sub) { g.font = font(30, 700); g.fillText(sub, 512, 162); }
});
export function buildDarenStreet(I, scene) {
  const { MR, FRONT, shopGlass, ac, win, shell } = rowTools();
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const WALL = {
    tile: def('dsTile', () => std({ map: YHT.facade(), color: '#f0efea' })),
    beige: def('dsBeige', () => std({ map: YHT.facade(), color: '#eadfc6' })),
    grey: def('dsGrey', () => std({ map: YHT.facade(), color: '#c9c8c2' })),
    pinkGrey: def('dsPinkGrey', () => std({ map: YHT.facade(), color: '#e3cfc9' })),
    stone: def('dsStone', () => std({ map: YHT.facade(), color: '#b9b7af' })),
    redbrown: def('dsRedBrown', () => std({ map: YHT.facade(), color: '#b07a66' })),
    grime: MR.grime, brick: MR.brick, mosaic: MR.mosaic,
  };
  const kits = [];
  DAREN_ST.lots.forEach((L, i) => {
    const sp = L[3], { ox, oz, ang, w } = darenLotFrame(L), r = lcg(1000 + i * 7);
    const k = new Kit(I, ox, oz, ang); kits.push(k);
    const F = sp.fh || 3.0, nf = sp.nf || 5, top = F * nf, d = sp.d || 10;
    shell(k, w, d, top, WALL[sp.wall] || WALL.tile);
    for (const x of [0, w - 0.12]) k.box(x, x + 0.12, 0, top, -0.06, 0, '#b9b6ae', { col: false });       // party-wall edges
    // ground floor
    if (sp.sign) {
      const [text, bg, fg, sub] = sp.sign;
      k.box(0.05, w - 0.05, 2.45, 3.25, -0.28, 0, bg, { col: false });
      k.plane(genSign(text, bg, fg, sub), w - 0.15, 0.75, w / 2, 2.85, -0.29, FRONT, { emissive: 0.35 });
    } else k.box(0.05, w - 0.05, 2.45, 2.9, -0.06, 0, '#d8d6cf', { col: false });
    if (sp.awn) k.box(-0.05, w + 0.05, 2.3, 2.42, -1.2, 0, sp.awn, { col: false });
    if (sp.tin) { const ty = nf === 1 ? top : sp.sign ? 3.35 : 2.95; k.box(-0.1, w + 0.1, ty, ty + 0.08, -1.3, nf === 1 ? d : 0, MR.roof, { col: false }); } // tin canopy over the sign (whole roof on a one-storey stall)
    if (sp.frame) for (const [x0, x1, y0, y1] of [[0.1, 0.25, 0, 2.4], [w - 0.25, w - 0.1, 0, 2.4], [0.1, w - 0.1, 2.25, 2.4]]) k.box(x0, x1, y0, y1, -0.1, 0, sp.frame, { col: false });
    const doorW = 1.0;                                                                                         // stair door to the flats upstairs
    k.plane(YHT.win(), doorW - 0.1, 2.2, w - doorW / 2 - 0.1, 1.1, -0.03, FRONT);
    if (sp.ground === 'shop') shopGlass(k, 0.15, w - doorW - 0.2, 0, 2.3, ROWT.shop(`ds${  i}`, ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8'][i % 4], ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a'][i % 4], 200 + i));
    else if (sp.ground === 'gate') { k.plane(ROWT.shutter(), w - doorW - 0.4, 2.3, (w - doorW) / 2, 1.15, -0.02, FRONT); k.plane(YHT.win(), w - doorW - 0.5, 2.1, (w - doorW) / 2, 1.05, -0.05, FRONT); }
    else k.plane(ROWT.shutter(), w - doorW - 0.4, 2.3, (w - doorW) / 2, 1.15, -0.02, FRONT);
    if (r() < 0.6) for (let j = 0; j < 2; j++) k.box(0.4 + j * 0.9 + r() * 0.3, 0.9 + j * 0.9 + r() * 0.3, 0, 0.55 + r() * 0.3, -0.9, -0.4, ['#3f7a4c', '#2f6db3', '#c9c9c4'][(i + j) % 3], { col: false });
    // upper floors
    for (let f = 1; f < nf; f++) {
      const y = f * F, ww = w - 1.0;
      if (sp.bal === 'cage') {                                                                                 // iron balcony cage sticking out
        win(k, w / 2, y + 1.45, ww - 0.4, 1.4, false);
        k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -0.75, 0, 'metal', { col: false });
        k.box(0.3, w - 0.3, y + 2.55, y + 2.62, -0.75, 0, 'metal', { col: false });
        for (let x = 0.3; x <= w - 0.29; x += 0.18) k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, 'metal', { col: false });
      } else if (sp.bal === 'open') { k.box(0.3, w - 0.3, y, y + 0.9, -0.8, -0.7, WALL[sp.wall] || WALL.tile, { col: false }); win(k, w / 2, y + 1.6, ww, 1.6, false); }
      else win(k, w / 2, y + 1.5, ww, 1.35);
      if (sp.hood) k.box(0.4, w - 0.4, y + 2.25, y + 2.33, -0.65, 0, sp.hood, { col: false });
      if (r() < 0.7) ac(k, r() < 0.5 ? 0.25 : w - 1.05, y + 0.1 + (r() < 0.5 ? 0 : 1.9), sp.bal === 'cage' ? -1.2 : -0.45);
    }
    if (sp.vert) { const [text, bg, fg] = sp.vert; for (const sd of [-1, 1]) k.plane(ROWT.vert(`ds${  text}`, bg, fg, text), 0.6, 0.6 * text.length + 0.2, 0.25 + sd * 0.04, F + 0.4 + (0.6 * text.length + 0.2) / 2, -0.55, sd * Math.PI / 2, { emissive: 0.3 }); }
    if (sp.roof === 'shack') { k.box(0.4, w - 0.4, top + 0.12, top + 2.2, 2.0, d - 0.5, MR.roof, { col: false }); k.box(0.2, w - 0.2, top + 2.2, top + 2.3, 1.4, d, MR.roof, { col: false }); }
    else if (sp.roof === 'tank') k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 });
    k.box(-0.01, w + 0.01, -0.5, 0.05, -DAREN_APRON, 0, MR.concrete, { col: false, surface: true });
  });
  finishRow(scene, kits);
}

// =====================================================================
// 原泰阿杜 泰國私廚 (大仁街 14 號) and 餡實餃色 (16 號), where the bend of 大仁街 was filled with the generic OSM houses f1550 / f1551.
// From Google street view / review photos (2026-01): 12 陽光煎匙 · 14 原泰阿杜 (4 floors of orange-pink brick tile on the
// corner, reed-fringe awning, red food-photo banner, round sign) · 16 餡實餃色 (3 floors of mustard tile, striped awning, tin
// frame on the roof). Frame N runs up 大仁街 (B frame, from B x 31.5 where 陽光煎匙 ends); the corner (B x ~42, 42 degrees)
// is cut by a short chamfer; frame S is the lot frame of the s 52-57 lot, the same facade line as the lots of DAREN_ST.
// =====================================================================
const GD_X0 = 31.5, GD_CH = 1.3, GD_DA = 14, GD_DB = 12;
function darenGdGeom() {
  const S = DAREN_SPEC, fB = darenFrame(S.angB), [ox, oz] = fB(GD_X0, 0);
  const lot = darenLotFrame([52, 57, 1]), cs = Math.cos(S.angB), sn = Math.sin(S.angB);
  const p1 = [(lot.ox - ox) * cs + (lot.oz - oz) * sn, -(lot.ox - ox) * sn + (lot.oz - oz) * cs]; // south end of 原泰阿杜, in frame N
  const psi = lot.ang - S.angB, t = p1[1] / Math.sin(psi), cx = p1[0] - t * Math.cos(psi);          // corner (cx, 0)
  const dS = [Math.cos(psi), Math.sin(psi)], nS = [-Math.sin(psi), Math.cos(psi)];
  const pa = [cx - GD_CH, 0], pb = [cx + GD_CH * dS[0], GD_CH * dS[1]];
  return { ox, oz, ang: S.angB, lot, p1, psi, cx, pa, pb, dS, nS, pts: [[0, 0], pa, pb, p1, [p1[0] + nS[0] * GD_DA, p1[1] + nS[1] * GD_DA], [0, GD_DA + 1]] };
}
export function darenGdFootprints() {
  const G = darenGdGeom(), c = Math.cos(G.ang), s = Math.sin(G.ang), w = ([x, z]) => [G.ox + x * c - z * s, G.oz + x * s + z * c];
  const out = [G.dS[1], -G.dS[0]], ap = 2.0, o = (p) => [p[0] + out[0] * ap, p[1] + out[1] * ap];
  const a = [[0, -ap], [G.cx, -ap], o([G.cx, 0]), o(G.p1), G.pts[4], G.pts[5]].map(w);
  const L = G.lot, lc = Math.cos(L.ang), ls = Math.sin(L.ang), p = (x, z) => [L.ox + x * lc - z * ls, L.oz + x * ls + z * lc];
  return [a, [p(-0.1, -DAREN_APRON - 0.2), p(5.1, -DAREN_APRON - 0.2), p(5.1, GD_DB), p(-0.1, GD_DB)]];
}
export function buildDarenGd(I, scene) {
  const { MR, FRONT, shopGlass, ac, win, shell } = rowTools();
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const MC = {
    brick: def('gdBrickM', () => std({ map: CT.gdBrick(), color: '#f0a888' })),
    mustard: def('gdMustardM', () => std({ map: YHT.facade(), color: '#c08a45' })),
    reed: def('cnReedM', () => std({ map: CT.reed() })),
    stripe: def('gdStripeM', () => std({ map: CT.gdStripe(), roughness: 0.7 })),
    tarp: def('gdTarpM', () => std({ color: '#8f908c', roughness: 0.8 })),
    corr: def('gdCorrM', () => std({ color: '#7f8fa3', metalness: 0.4, roughness: 0.5 })),
    hood: def('gdHoodM', () => std({ color: '#1d9a82', roughness: 0.6 })),
  };
  const G = darenGdGeom(), kits = [];
  const kN = new Kit(I, G.ox, G.oz, G.ang); kits.push(kN);
  const { cx, pa, pb, p1, psi } = G, LN = pa[0], F = 3.3, top = 13.2;
  // ---------- 原泰阿杜: the building is a prism over the polygon (flat run, chamfer, short run towards 餡實餃色) ----------
  kN.prism(G.pts, -0.8, top, MC.brick);
  kN.prism(G.pts, top, top + 0.15, 'gray', { shadow: false });
  for (let i = 0; i < G.pts.length; i++) { const a = G.pts[i], b = G.pts[(i + 1) % G.pts.length]; kN.wallLine(a[0], a[1], b[0], b[1], 0, top); }
  const faceRot = (phi) => Math.PI - phi; // plane facing the street from a facade running along angle phi in frame N
  // banner (food photos, phone line) along the 2F floor line: flat run, then folded round the chamfer
  kN.box(0.05, LN, 3.2, 4.4, -0.3, 0, '#c91f2b', { col: false });
  kN.plane(CT.gdBannerN(), LN - 0.1, 1.05, LN / 2, 3.8, -0.31, FRONT, { emissive: 0.3 });
  const chL = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), chPhi = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
  const nOut = (phi) => [Math.sin(phi), -Math.cos(phi)];
  { const n = nOut(chPhi); kN.plane(CT.gdBannerC(), chL, 1.05, mid[0] + n[0] * 0.03, 3.8, mid[1] + n[1] * 0.03, faceRot(chPhi), { emissive: 0.3 }); }
  // windows: iron grilles with an arched green hood, one pair per floor on the flat run, one on the chamfer
  for (let f = 1; f < 4; f++) {
    const y = f * F + 1.25;
    for (const x of [3.2, 6.1]) { win(kN, x, y + 0.9, 1.7, 1.8, true); kN.box(x - 1.0, x + 1.0, y + 1.8, y + 1.9, -0.7, 0, MC.hood, { col: false }); kN.box(x - 1.0, x + 1.0, y - 0.12, y - 0.04, -0.3, 0, '#8a96a2', { col: false }); }
    const n = nOut(chPhi), wc = Math.min(1.5, chL - 0.4);
    kN.plane(YHT.win(), wc, 1.8, mid[0] + n[0] * 0.03, y + 0.9, mid[1] + n[1] * 0.03, faceRot(chPhi), {});
    if (f < 3) ac(kN, 0.35, f * F + 0.3, -0.5);
  }
  // ground floor: stair door, wood-framed window, wood door, drinks counter, fence with plants, round sign
  kN.box(0.1, 1.15, 0, 2.2, -0.06, 0, '#8d8f8a', { col: false });
  kN.plane(YHT.win(), 0.85, 2.0, 0.62, 1.05, -0.07, FRONT);
  shopGlass(kN, 1.4, 3.0, 0, 2.2, ROWT.shop('gd', '#f1e6cc', '#7a5a3a', 89), -0.03);
  for (const x of [1.3, 3.0]) kN.box(x, x + 0.1, 0, 2.3, -0.1, 0, '#6b4a2a', { col: false });
  kN.box(1.3, 3.1, 2.2, 2.3, -0.1, 0, '#6b4a2a', { col: false });
  kN.box(3.2, 4.3, 0, 2.15, -0.08, 0, '#4a3322', { col: false });
  shopGlass(kN, 6.3, LN - 0.2, 0, 2.2, ROWT.shop('gd2', '#efe0c0', '#6b4a2a', 97), -0.03);
  kN.box(4.5, 6.2, 0, 1.15, -0.95, -0.25, '#dfe6ea', { col: false });                              // drinks counter
  kN.plane(CT.gdPosters(), 1.6, 1.0, 5.35, 0.62, -0.96, FRONT);
  kN.box(4.45, 6.25, 1.15, 1.22, -1.0, -0.2, '#7a5a3a', { col: false });
  kN.box(6.3, LN + 0.1, 0, 1.0, -1.0, -0.94, '#8a6a44', { col: false });                              // wooden fence
  for (const x of [6.4, 7.3, 8.2, LN]) kN.box(x, x + 0.07, 0, 1.1, -1.02, -0.92, '#6b4a2a', { col: false });
  for (const [x, z, h] of [[6.7, -0.7, 0.5], [7.6, -0.6, 0.7], [8.5, -0.7, 0.45], [5.0, -1.2, 0.4]]) { kN.cyl(x, z, 0.2, 0, 0.35, '#6b4a2a', { seg: 8 }); kN.cyl(x, z, 0.3, 0.35, 0.35 + h, MR.plant, { r1: 0.38, seg: 8 }); }
  kN.box(7.0, 8.4, 0.4, 0.45, -0.6, -0.2, '#b8232a', { col: false });                                 // red bench
  for (const x of [7.05, 8.3]) kN.box(x, x + 0.05, 0, 0.4, -0.55, -0.25, '#b8232a', { col: false });
  // reed-fringe awning (grey checked tarp on top) and the grey corrugated one round the corner
  kN.box(1.0, LN + 0.3, 3.0, 3.08, -1.4, 0, MC.tarp, { col: false });
  kN.box(1.0, LN + 0.3, 2.2, 2.95, -1.42, -1.36, MC.reed, { col: false, tile: [1, 1] });
  kN.box(1.0, LN + 0.3, 2.9, 3.0, -1.4, 0, MC.reed, { col: false, tile: [1, 1] });
  { const n = nOut(chPhi), o = 0.8; kN.slab(pa[0] + n[0] * o - 0.5, pa[1] + n[1] * o, pb[0] + n[0] * o + 0.4 * Math.cos(chPhi), pb[1] + n[1] * o + 0.4 * Math.sin(chPhi), 1.6, 2.7, 2.78, MR.roof, { col: false }); }
  // round sign on a black bar, 2F, at the corner end of the flat run
  kN.box(LN - 1.3, LN - 1.2, 5.45, 5.95, -1.9, 0, '#2b2b2b', { col: false });                           // black bar
  kN.plane(CT.aduSign(), 1.5, 1.5, LN - 1.25, 7.0, -1.2, Math.PI + 0.8, { transparent: true, emissive: 0.3 }); // faces up and across the street
  kN.box(LN - 1.27, LN - 1.23, 5.95, 6.3, -1.25, -1.15, '#2b2b2b', { col: false });
  // roof: water tank and a tin shed at the back
  kN.cyl(3.5, 8.5, 0.6, top + 0.15, top + 1.6, '#d8d8d0', { seg: 12 });
  kN.box(1.5, 6.5, top + 0.15, top + 1.6, 9.5, 13.2, MR.roof, { col: false });
  // concrete apron round the corner
  const out = [Math.sin(psi), -Math.cos(psi)], o2 = (p, d) => [p[0] + out[0] * d, p[1] + out[1] * d];
  kN.box(-0.3, LN, -0.5, 0.05, -1.8, 0, MR.concrete, { col: false, surface: true });
  kN.prism([pa, [LN, -1.8], [cx, -1.8], o2([cx, 0], 1.8), o2(p1, 1.8), p1, pb], -0.5, 0.05, MR.concrete, { surface: true, shadow: false });

  // ---------- 餡實餃色 (16): 3 floors of mustard tile, striped awning with its name, tin frame on the roof, yellow flag ----------
  const L = G.lot, kS = new Kit(I, L.ox, L.oz, L.ang); kits.push(kS);
  const w = 5, d = GD_DB, Fb = 3.1, topB = 6.4;
  shell(kS, w, d, topB, MC.mustard, [0.6, 0.6]);
  for (const x of [0, w - 0.12]) kS.box(x, x + 0.12, 0, topB, -0.06, 0, '#b9b6ae', { col: false });
  for (const x of [1.3, 3.7]) { win(kS, x, Fb + 1.7, 1.2, 1.25, false); kS.box(x - 0.67, x + 0.67, Fb + 1.05, Fb + 1.12, -0.12, 0, '#f0f0ec', { col: false }); }
  kS.box(0.1, w - 0.1, 2.35, 2.45, -0.05, 0, '#2a2522', { col: false });
  kS.plane(CT.xsBanner(), w - 0.3, 0.55, w / 2, 1.95, -0.09, FRONT, { emissive: 0.3 });
  kS.box(-0.1, w + 0.1, 2.62, 2.7, -1.5, 0, MC.stripe, { col: false });                               // awning
  kS.plane(CT.xsValance(), w - 0.1, 0.45, w / 2, 2.4, -1.52, FRONT, { emissive: 0.25 });
  kS.box(0.15, 1.5, 0, 2.3, -0.12, 0, '#241f1c', { col: false });                                     // dark entrance with red couplets
  for (const x of [0.2, 1.3]) kS.box(x, x + 0.1, 0.7, 1.7, -0.14, -0.1, '#c8202a', { col: false });
  shopGlass(kS, 1.7, w - 0.2, 0, 1.9, ROWT.shop('xs', '#f4e7cf', '#8a6a44', 93), -0.03);
  kS.box(2.0, w - 0.3, 0, 1.0, -0.7, -0.3, '#cfd3d6', { col: false });                                 // open counter
  for (const [x, z] of [[0.3, 2.0], [w - 0.4, 2.0], [0.3, 8.0], [w - 0.4, 8.0]]) kS.box(x, x + 0.1, topB, topB + 2.5, z, z + 0.1, '#6a6f75', { col: false });
  kS.box(-0.1, w + 0.1, topB + 2.5, topB + 2.6, 1.9, 8.2, MC.corr, { col: false });                  // corrugated cover on the tin frame
  for (const sd of [-1, 1]) kS.plane(CT.xsFlag(), 0.6, 2.2, 0.35 + sd * 0.04, topB - 1.2, -0.65, sd * Math.PI / 2, { emissive: 0.25 });
  kS.box(0.32, 0.38, topB - 2.3, topB - 0.1, -0.7, -0.6, '#6a6f75', { col: false });
  kS.box(0.32, 0.38, topB - 0.1, topB - 0.04, -0.7, 0, '#6a6f75', { col: false });
  kS.box(-0.01, w + 0.01, -0.5, 0.05, -DAREN_APRON, 0, MR.concrete, { col: false, surface: true });
  finishRow(scene, kits);
}
