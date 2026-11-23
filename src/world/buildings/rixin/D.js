// 日新路街屋資料：D 段 s 220.6（三和三街口）～實踐路轉角前，兩側。格式見 src/world/buildings/StreetRixin.js 檔頭。
// 照 Google 街景建模（2024-08 車拍為主，招牌以 2025 縮圖為準），面寬與分戶照國土測繪 2024 正射與街景估。
// 實踐路口兩個轉角在 src/world/buildings/shijian/S2.js（右側 s>299、左側 s>296），這裡做到它們前面為止。
// 巷口留空：左側 s 220.6～222.6（三和三街往西北的窄巷，巷口有紅色帳篷攤）、s 250～251.5（窄弄）、s 270.5～272.8（窄巷，巷口有茶飲車）。
// 區域座標提醒：站在街上面對立面時，x 小的那一端在右手邊（左側 side -1 的格子 x=0 是 s 大的那端，右側 side +1 的格子 x=0 是 s 小的那端）。
import { all, tex, board, blade, disc, darkGlass, roofCage, scaffold, corner, cart } from './kit.js';

// 雨棚前緣垂下來的一條布邊，印店名（INIT.、Mais Oui 的黑色帆布雨棚）
const valance = (text, bg, fg) => (k, c) => {
  const y0 = c.gf - 1.55, y1 = c.gf - 1.05;
  k.box(-0.05, c.w + 0.05, y0, y1, -1.33, -1.27, bg, { col: false });
  if (text) k.plane(c.paint(text, bg, fg, null, c.w, y1 - y0, 96), c.w, y1 - y0, c.w / 2, (y0 + y1) / 2, -1.34, c.FRONT, { emissive: 0.3 });
};
// 樓上窗戶上下的紅磚飾帶（日新路這一排老街屋常見的磚紅色面板）
const brickBands = (col = '#a8503a', from = 2) => (k, c) => {
  for (let f = from - 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0.3, c.w - 0.3, y + 0.05, y + 0.72, -0.05, 0, c.wallMat(col), { col: false, tile: [0.6, 0.6] });
    k.box(0.3, c.w - 0.3, y + 2.28, y + c.fh - 0.02, -0.05, 0, c.wallMat(col), { col: false, tile: [0.6, 0.6] });
  }
};
// 立面上的直條壁柱（紅褐色）
const pilasters = (col, xs) => (k, c) => { for (const fx of xs) { const x = Math.min(c.w - 0.35, Math.max(0, c.w * fx - 0.17)); k.box(x, x + 0.35, c.gf - 0.9, c.top + 0.1, -0.14, 0, col, { col: false }); } };
// 屈臣氏那棟二樓的彩色玻璃帷幕（藍、粉、紫漸層，靠轉角那端印 HELLO BEAUTIFUL）
const rainbow = (k, c) => {
  const w = c.w - 0.2, h = c.fh - 0.35, t = tex(c, 'rxD_rainbow', w, h, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, '#6f9fd8'); gr.addColorStop(0.3, '#d98fc0'); gr.addColorStop(0.55, '#9fd0e8'); gr.addColorStop(0.8, '#b48ad8'); gr.addColorStop(1, '#e89ab8');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.18)'; for (let x = 0; x < W; x += W / 8) g.fillRect(x, 0, 3, H);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = c.font(H * 0.13, 700); g.fillText('HELLO BEAUTIFUL', W * 0.8, H * 0.55);
  }, 40);
  k.plane(t, w, h, c.w / 2, c.gf + 0.2 + h / 2, -0.09, c.FRONT, { emissive: 0.25 });
};
// V LENS 樓上的廣告看板：白底、左邊一張人像、右邊品牌字
const vlensBill = (k, c) => {
  const w = 3.4, h = 2.6, y0 = c.gf + 0.4, t = tex(c, 'rxD_vlens', w, h, (g, W, H) => {
    g.fillStyle = '#f6f4f2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2220'; g.beginPath(); g.ellipse(W * 0.3, H * 0.42, W * 0.17, H * 0.4, 0, 0, 7); g.fill();          // 頭髮
    g.fillStyle = '#f2d6c4'; g.beginPath(); g.ellipse(W * 0.32, H * 0.48, W * 0.11, H * 0.3, 0, 0, 7); g.fill();         // 臉
    g.fillStyle = '#c86a6a'; g.fillRect(W * 0.29, H * 0.66, W * 0.06, H * 0.03);
    g.fillStyle = '#2a2a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = c.font(H * 0.16); g.fillText('V LENS', W * 0.72, H * 0.6);
    g.fillStyle = '#7a5aa8'; g.beginPath(); g.arc(W * 0.72, H * 0.32, H * 0.1, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.font = c.font(H * 0.12); g.fillText('V', W * 0.72, H * 0.33);
  }, 64);
  const x = c.w * 0.45;
  k.box(x - w / 2 - 0.05, x + w / 2 + 0.05, y0 - 0.05, y0 + h + 0.05, -0.32, -0.12, '#d8d6d2', { col: false });
  k.plane(t, w, h, x, y0 + h / 2, -0.33, c.FRONT, { emissive: 0.25 });
};
// 紅色帳篷攤：四角錐紅帆布屋頂、紅色圍布（三和三街巷口）
const redTent = (k, c) => {
  const w = c.w, d = c.d;
  for (const [x, z] of [[0.1, 0.1], [w - 0.18, 0.1], [0.1, d - 0.18], [w - 0.18, d - 0.18]]) k.box(x, x + 0.08, 0, 2.3, z, z + 0.08, '#b8b8b4', { col: false });
  k.cyl(w / 2, d / 2, Math.max(w, d) * 0.74, 2.3, 3.4, '#d23a3a', { seg: 4, r1: 0.05, col: false });
  k.box(0.05, w - 0.05, 2.0, 2.32, -0.02, 0.02, '#c83030', { col: false });
};
// 拱廊騎樓：白色方柱加一道拱圈橫樑
const arcade = (k, c) => {
  const n = Math.max(2, Math.round(c.w / 3.2)), bw = c.w / n;
  for (let j = 0; j <= n; j++) { const x = Math.min(c.w - 0.45, Math.max(0, j * bw - 0.22)); k.box(x, x + 0.45, 0, c.gf, -0.3, 0, '#eceae4', { col: false }); }
  k.box(0, c.w, c.gf - 0.75, c.gf, -0.3, 0, '#eceae4', { col: false });
  for (let j = 0; j < n; j++) k.cyl(bw * (j + 0.5), -0.15, bw / 2 - 0.25, c.gf - 0.95, c.gf - 0.75, '#eceae4', { seg: 12, col: false });
};
// 老市場大樓：二樓外推的雨庇、三樓外面一圈生鏽鐵架
const marketFrame = (k, c) => {
  const y2 = c.gf + c.fh;
  k.box(-0.05, c.w + 0.05, y2 - 0.15, y2, -0.9, 0, '#b8b4aa', { col: false });                                   // 二樓頂的水泥雨庇
  for (const yy of [0.05, 1.1, 2.4]) k.box(0, c.w, y2 + yy, y2 + yy + 0.06, -0.85, -0.79, '#7a5a48', { col: false });
  for (let x = 0.1; x < c.w; x += 1.6) k.box(x, x + 0.06, y2, y2 + 2.5, -0.85, -0.79, '#7a5a48', { col: false });
};
// 攤位上的大陽傘
const umbrella = (x, z, col, r = 1.4) => (k) => { k.cyl(x, z, 0.04, 0, 2.5, '#5a5a56', { seg: 6, col: false }); k.cyl(x, z, r, 2.3, 2.75, col, { seg: 12, r1: 0.05, col: false }); };

const WTS = '#ecebe6'; // 屈臣氏那棟的白磁磚
const BEI = '#e3d9c2'; // 幽林、膜型機那棟的米色
// 立面離路中心線：正射量到左側約 5～6 m、右側約 4.6～5.5 m（街景車到兩側店面都有 4 m 以上），沒寫 set 的格子用這兩個值
const SET = { [-1]: 5.4, 1: 5.0 };
const lots = [
    // ---- 左側（西北側，往實踐路走的左手邊）----
    // 三和三街巷口的紅色帳篷攤、小時候彈珠堂、寶島8號雞排、INIT.、Mais Oui（2024-08／2025）
    ['R', 222.6, 226.4, -1, { nf: 1, gf: 2.3, wall: '#c83030', noband: true, ground: 'shutter', sh: '#c43030', roof: 'flat', roofCol: '#c83030', door: 0, d: 3.6, set: 6.0, extra: redTent }],
    ['R', 226.4, 236, -1, { nf: 4, wall: '#cdb89e', sign: ['小時候彈珠堂', '#f4f2ee', '#2a2a2a', '一起回到小時候'], ground: 'shutter', sh: '#8d9094', awn: '#4a4a4a', bal: 'grille', roof: 'shack', door: 0, d: 13, extra: all(brickBands('#a8503a', 2),
      (k, c) => { k.box(c.w * 0.45, c.w - 0.4, c.top + 0.12, c.top + 2.4, 2.0, c.d - 1.0, '#e9e7e1', { col: false }); k.box(c.w * 0.4, c.w - 0.2, c.top + 2.4, c.top + 2.5, 1.6, c.d - 0.6, '#3a6fb0', { col: false }); }, // 頂樓加蓋、藍色鐵皮屋頂
      (k, c) => k.plane(c.roundSign('', '#8a7ab0', '#f4f0f8'), 1.2, 1.2, 2.6, c.gf + 2 * c.fh + 1.3, -0.08, c.FRONT, { transparent: true, emissive: 0.2 })) }],
    ['R', 236, 241.5, -1, { nf: 4, wall: '#cdb89e', sign: ['寶島8號雞排 中原店', '#d8282f', '#ffffff'], ground: 'shutter', sh: '#9a9a96', awn: '#4a4a4a', bal: 'cage', roof: 'flat', d: 13, extra: all(
      board('寶島8號雞排', '#f6efe8', '#c0281f', 0.2, -0.2, 3.45, 4.75, { sub: 'Formosa No.8 Chicken', ppm: 96 }), brickBands('#a8503a', 3)) }],
    ['R', 241.5, 245.5, -1, { nf: 4, wall: '#e6e0d6', noband: true, ground: 'shutter', sh: '#9a9a96', awn: '#2a2a2a', bal: 'grille', roof: 'flat', door: 0, d: 13, extra: all(valance('INIT.  INIT.  INIT.', '#2a2a2a', '#f4f4f0'), brickBands('#b0604a', 4)) }],
    ['R', 245.5, 250, -1, { nf: 4, wall: '#bdb6ac', noband: true, ground: 'shutter', sh: '#a8a69e', awn: '#2a2a2a', bal: 'grille', roof: 'tank', d: 13, extra: all(valance('Mais Oui', '#2a2a2a', '#f4f4f0'), brickBands('#a0503c', 3)) }],
    // 窄弄 → 拾汣茶屋、淺綠磁磚樓、兩棟洗石子紅磚飾帶樓、白色窄樓（2024-08）
    ['R', 251.5, 256.5, -1, { nf: 3, wall: '#e8e6e0', sign: ['拾汣茶屋', '#3f6a55', '#f4f0e0'], ground: 'shutter', sh: '#2a3a5a', awn: ['#8a3a2a', '#f4f0e8'], bal: 'plain', big: ['拾汣茶屋', '#f6f6f2', '#5a6a4a'], bigFrom: 1, roof: 'flat', d: 13 }],
    ['R', 256.5, 260.5, -1, { nf: 3, wall: '#bcd0b0', noband: true, ground: 'shutter', sh: '#2a4a8a', awn: '#9aa8a0', bal: 'plain', roof: 'flat', d: 13 }],
    ['R', 260.5, 264, -1, { nf: 3, wall: '#bdb6aa', noband: true, ground: 'shutter', sh: '#d8cdb0', awn: '#8a8d90', bal: 'plain', roof: 'flat', d: 13, extra: brickBands('#a8503a', 2) }],
    ['R', 264, 267.5, -1, { nf: 3, wall: '#bdb6aa', noband: true, ground: 'shutter', sh: '#2a4a8a', awn: '#8a8d90', bal: 'plain', roof: 'flat', d: 13, extra: brickBands('#a8503a', 2) }],
    ['R', 267.5, 270.5, -1, { nf: 4, wall: '#ecebe6', sign: ['', '#f4f2ee', '#f4f2ee'], ground: 'shutter', sh: '#8a5a3a', awn: '#d8d6d0', bal: 'plain', roof: 'flat', door: 0, d: 13 }],
    // 窄巷（巷口一台綠色茶飲車）→ 外掛鐵架的高樓、V LENS、老市場大樓前的攤位（2024-08）
    ['R', 272.8, 279, -1, { nf: 5, wall: '#d8d6d0', noband: true, ground: 'shutter', sh: '#a8483a', awn: '#3f9a5a', bal: 'plain', roof: 'flat', d: 13, extra: all(scaffold(), roofCage(2.4),
      (k, c) => { k.box(c.w + 0.3, c.w + 1.5, 0, 1.6, -1.2, -0.4, '#3f9a5a', { col: false }); k.box(c.w + 0.35, c.w + 1.45, 1.6, 2.0, -1.15, -0.45, '#f2f2ee', { col: false }); }) }], // 巷口的綠色茶飲車
    ['R', 279, 286, -1, { nf: 4, wall: '#cfccc4', sign: ['V LENS', '#f4f2f0', '#5a3a8a', 'LENS STORE 中壢中原店'], ground: 'shutter', sh: '#a8a69e', awn: '#d8d6d0', bal: 'plain', roof: 'flat', d: 13, extra: vlensBill }],
    ['R', 286, 295.5, -1, { nf: 4, gf: 3.6, wall: '#d5d2ca', noband: true, ground: 'open', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(marketFrame,
      cart(0.6, { tarp: '#d8d6d0', sign: ['李記 麵粉煎', '#f6f0d8', '#c0281f'], w: 1.8 }), umbrella(1.6, -1.6, '#c83a4a', 1.5),
      cart(6.2, { tarp: '#5a7ab0', sign: ['10元蜜汁燒烤', '#c0281f', '#ffffff'], w: 2.2 }), (k, c) => k.box(5.9, 8.7, 2.3, 2.4, -2.4, -0.2, c.MR.roof, { col: false }), // 燒烤攤的鐵皮棚
      umbrella(4.3, -1.7, '#e8dcc0', 1.4)) }],

    // ---- 右側（東南側）----
    // 三和三街口的屈臣氏轉角大樓（含 PLAN.B STUDIO）、窄攤、幽林／膜型機、有料水餃（2025 縮圖）
    ['R', 225.6, 238, 1, { nf: 6, gf: 3.6, wall: WTS, sign: ['watsons 屈臣氏', '#1f9e9a', '#ffffff'], ground: 'shop', bal: 'plain', roof: 'tank', door: 0, d: 15, extra: all(rainbow,
      (k, c) => corner(-1, 1.3, WTS, [[c.gf - 0.85, c.gf - 0.03, '#1f9e9a'], [c.gf + 0.2, c.gf + c.fh - 0.15, '#b48ad8']])(k, c),
      disc('', '#1c1c1c', '#f4f4f0', 0.4, 7.6, { size: 1.4, out: 1.0 })) }],
    ['R', 238, 243.5, 1, { nf: 6, gf: 3.6, wall: WTS, noband: true, ground: 'shop', bal: 'plain', roof: 'flat', d: 15, extra: all(darkGlass('#5f9ea6', 2, 3),
      board('PLAN.B STUDIO', '#262626', '#ffffff', 0.4, -0.4, 3.75, 5.0, { sub: 'KOREAN SELF PHOTO STUDIO', ppm: 96 }), board('', '#2a2a2a', '#2a2a2a', 0, 0, 2.55, 2.85)) }],
    ['R', 243.5, 245.5, 1, { nf: 1, gf: 3.0, wall: '#d9d4c8', noband: true, ground: 'open', awn: ['#e0702a', '#f4f0e8'], roof: 'flat', door: 0, d: 6 }],
    ['R', 245.5, 250.5, 1, { nf: 6, wall: BEI, noband: true, sign2: ['幽林 YU LIN', '#f1efec', '#4a4a4a'], ground: 'shutter', sh: '#4a4e52', awn: '#3f9a5a', bal: 'grille', roof: 'flat', d: 15, extra: all(
      blade('幽林', '#f6f6f4', '#2a2a2a', 0.4, 5.0, 6.8, { wd: 0.75, out: 0.3 }), disc('PARFUM', '#f4f4f2', '#2a2a2a', 0.4, 7.9, { size: 1.2, out: 0.9 })) }],
    ['R', 250.5, 255.5, 1, { nf: 6, wall: BEI, noband: true, sign2: ['膜型機 手機維修 專業包膜', '#f2f0ec', '#3a2a2a'], ground: 'shutter', sh: '#a8a69e', awn: '#3f9a5a', bal: 'grille', roof: 'tank', d: 15, extra: all(
      board('', '#e86a8a', '#ffffff', 0.1, -0.1, 3.4, 3.6), board('PARFUM 時尚美學', '#f4f4f2', '#22325a', 0.2, 3.4, 7.0, 7.6, { ppm: 96 }), disc('膜型機', '#f4f4f2', '#2a2a2a', -0.3, 8.2, { size: 1.2, out: 1.0 })) }],
    ['R', 255.5, 264.5, 1, { nf: 4, wall: '#e8e0cc', noband: true, sign2: ['有料水餃專賣  鍋貼小籠包', '#e9e2cf', '#2a2a2a'], ground: 'open', awn: '#3f9a5a', bal: 'plain', roof: 'flat', d: 15, extra: all(
      board('', '#f4f4f0', '#f4f4f0', 1.5, -1.5, 4.95, 5.35), blade('鍋貼小籠包', '#ffffff', '#c0281f', -0.3, 4.3, 7.6, { wd: 0.8, out: 0.3 })) }],
    // 拱廊白磁磚樓、手作工坊、白馬賽克陽台樓、紅褐壁柱樓、灰磁磚樓、白馬賽克大窗樓、璀璨／姊妹美甲（2025 縮圖）
    ['R', 264.5, 269.5, 1, { nf: 4, wall: '#e6e4de', noband: true, ground: 'open', bal: 'grille', roof: 'tank', door: 0, d: 15, extra: arcade }],
    ['R', 269.5, 274.5, 1, { nf: 4, wall: '#b4b5b0', sign: ['手作工坊', '#f4f4ee', '#2a2a2a'], ground: 'shutter', sh: '#8a8a86', awn: '#a8a59a', bal: 'plain', roof: 'flat', d: 15, extra: blade('手作工坊', '#f4f4ee', '#2a5a3a', -0.4, 5.6, 8.0, { wd: 0.8, out: 0.25 }) }],
    ['R', 274.5, 279, 1, { nf: 5, wall: '#eeeeea', noband: true, ground: 'shutter', sh: '#5a5e62', awn: '#5a5a5a', bal: 'cage', roof: 'tank', d: 15 }],
    ['R', 279, 283, 1, { nf: 4, wall: '#e6dcc8', noband: true, ground: 'shutter', sh: '#2a4a7a', awn: '#3a3a3a', bal: 'grille', roof: 'flat', d: 15, extra: pilasters('#8a4a3a', [0.05, 0.5, 0.95]) }],
    ['R', 283, 286.5, 1, { nf: 5, wall: '#d0d0cc', noband: true, ground: 'shop', awn: '#3a3a3a', bal: 'plain', roof: 'flat', d: 15 }],
    ['R', 286.5, 290.5, 1, { nf: 4, wall: '#efefea', noband: true, ground: 'shop', awn: '#3a3a3a', bal: 'plain', roof: 'flat', d: 15, extra: blade('扭蛋部超母屋', '#f8f2ec', '#d8286a', -0.3, 4.0, 9.6, { wd: 0.9, out: 0.3 }) }],
    ['R', 290.5, 294.5, 1, { nf: 4, wall: '#e6dcc8', noband: true, ground: 'shutter', sh: '#8d9094', awn: '#3a3a3a', bal: 'grille', roof: 'flat', d: 15, extra: all(pilasters('#8a4a3a', [0.05, 0.5, 0.95]), board('', '#efe6e2', '#efe6e2', 0.2, -0.2, 3.4, 4.6)) }],
    ['R', 294.5, 299, 1, { nf: 4, wall: '#e6dcc8', noband: true, sign2: ['姊妹美甲彩繪坊', '#4a2a7a', '#ffffff'], ground: 'shutter', sh: '#8d9094', awn: '#3a3a3a', bal: 'grille', roof: 'flat', d: 15, extra: pilasters('#8a4a3a', [0.05, 0.5, 0.95]) }],
];
export default {
  ownSign: ['小時候彈珠堂', '拾汣茶屋', '幽林', '手作工坊'],
  drop: [],
  fences: [],
  lots: lots.map((L) => (L[4].set ? L : [L[0], L[1], L[2], L[3], { ...L[4], set: SET[L[3]] }])),
};
