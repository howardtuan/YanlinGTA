// 新中北路185巷6弄兩側（參考線 'Q6'，s=0 在 249巷11弄西端和往南無名巷的交會點，往西南西走到老街溪邊 s≈68.7；遊戲路寬 3 m）。
// 照 Google 街景 2026-05（185巷口以西 2022-06）與國土測繪 2024 正射建模，照片在 side-session-notes 的 xzb-sv/249/（C_s* 那幾張）。
// 實景路面中心和 11弄一樣比遊戲偏北約 2 m，北側立面照 11弄用 3.6、南側 2.4（都在路面外）。
//   北側（+1，鐵道側）由東往西：s 0～3 是通往後排的通道口（遊戲 11弄路尾在這裡折角，留空）→ 陽台擺滿盆栽的三樓老屋（綠雨遮、藍黃直立招牌）→
//     紅磚三樓（二樓寶瓶欄杆、綠色鐵皮雨遮、一道花紋鏤空鐵捲門，20 號）→ 紅褐磚三樓兩間 → 粉紅磁磚三樓（紅色鐵窗籠、「萬吉來」春聯、不鏽鋼門，12 號）→
//     紅磚三樓（二樓冷氣、鐵窗）→ 綠雨遮鐵捲門三樓（8 號）→ 185巷口對面米色磁磚三樓（白色大鐵窗籠）→ 三樓兩間到老街溪邊
//   南側（-1）由東往西：無名巷西轉角灰色鐵皮包覆四樓（綠色窗雨遮）→ 米色磁磚四樓（綠窗雨遮、拱形鐵窗）→ 四樓 → 粉紅褐磁磚四樓（「萬吉來」、綠色信箱）→
//     灰色鐵皮包覆五樓（每扇窗一片綠色雨遮）→ 四樓 → 185巷東轉角四樓（銀色排煙管、白色布招）→（185巷）→ 西轉角白色三樓 → 三樓 → 兩樓到溪邊
//   南側後牆接新中北路北側那排（SegX9、SegX10）的後牆，深度照兩條路之間量。
// 原本北側 s 17～65 是一排 OSM 通用量體（w587181284～w587181295）、南側 185巷以西三棟（w587181287～w587181289），樣子和實景對不上：
// 全部放 hide（資料留著、不畫、碰撞收成一點，全圖亂數不變），照實景重蓋。看不清的招牌不放字。
import { NC, seg, cage } from './qkit.js';

const R = 'Q6';
const SN = 3.6;
const N = (s0, s1, sp) => [R, s0, s1, 1, { nf: 3, d: 11, set: SN, noband: 1, ...sp }];
const S = (s0, s1, d, sp) => [R, s0, s1, -1, { nf: 4, d, noband: 1, ...sp }];
const GREEN = '#3f8a5a';

export default {
  hide: [
    // 北側 OSM 通用量體
    'w587181284',
    'w587181285',
    'w587181286',
    'w587181291',
    'w587181292',
    'w587181293',
    'w587181294',
    'w587181295',
    // 南側 185巷以西
    'w587181287',
    'w587181288',
    'w587181289',
  ],
  lots: [
    // ================= 北側（+1）=================
    N(3, 9.5, { wall: '#c9c6bc', ground: 'gate', awn: GREEN, bal: 'open', roof: 'shack' }), // 盆栽老屋（custom）
    N(9.5, 16, {
      wall: 'brick',
      ground: 'shutter',
      sh: '#9a9c9a',
      awn: '#5f8f6a',
      bal: 'plain',
      roof: 'none',
    }), // 20 號（欄杆、花紋鐵捲門在 custom）
    N(16, 22, { wall: '#a65a44', ground: 'gate', bal: 'grille', roof: 'none' }),
    N(22, 27, { wall: '#ad6450', ground: 'shutter', sh: '#a3a5a3', bal: 'grille' }),
    N(27, 33.5, { wall: '#d38f78', ground: 'gate', bal: 'plain', roof: 'none' }), // 12 號粉紅磁磚（紅色鐵窗籠在 custom）
    N(33.5, 40, { wall: 'brick', ground: 'gate', door: 0, bal: 'grille', roof: 'none' }),
    N(40, 46, { wall: '#cfc7b6', ground: 'shutter', sh: '#9a9c9a', awn: '#5f8f6a', bal: 'cage' }), // 8 號
    N(46, 52, { wall: '#e2d8c0', ground: 'shutter', sh: '#a6a8a6', bal: 'cage' }),
    N(52, 58, { wall: '#d7d0c0', ground: 'gate', bal: 'grille', tin: 1 }),
    N(58, 65, { wall: '#c8c4b8', ground: 'shutter', sh: '#9a9c9a', bal: 'grille', roof: 'shack' }),
    // ================= 南側（-1）=================
    S(2.5, 9, 8.5, { wall: '#b8bcbf', ground: 'gate', bal: 'plain', hood: GREEN }), // 灰色鐵皮包覆轉角
    S(9, 15, 8.5, { wall: '#e0d6c4', ground: 'gate', bal: 'arch', hood: GREEN }),
    S(15, 21, 7.5, { wall: '#d6cfc2', ground: 'shutter', sh: '#9a9c9a', bal: 'grille' }),
    S(21, 27, 7.5, { wall: '#c79a86', ground: 'gate', bal: 'grille' }), // 萬吉來、綠色信箱（custom）
    S(27, 33, 7.5, { nf: 5, wall: '#c2c6c8', ground: 'gate', bal: 'plain', hood: GREEN }),
    S(33, 38.5, 7.5, { wall: '#d9d4c8', ground: 'shutter', sh: '#a3a5a3', bal: 'grille' }),
    S(38.5, 43, 7.5, { wall: '#cfcac0', ground: 'gate', bal: 'grille', roof: 'tank' }), // 185巷東轉角（排煙管在 custom）
    S(51, 58, 13.5, { nf: 3, wall: '#dfe3e6', ground: 'shutter', sh: '#6f8fa8', bal: 'grille' }),
    S(58, 64.5, 13.5, { nf: 3, wall: '#d8d4c9', ground: 'gate', bal: 'grille', roof: 'shack' }),
    S(64.5, 68, 10.5, {
      nf: 2,
      wall: '#cfcac0',
      ground: 'shutter',
      sh: '#9a9c9a',
      door: 0,
      bal: 'plain',
    }),
  ],

  custom(C) {
    const { FRONT } = C;
    // ---- 北側 s 3～9.5：盆栽老屋，二樓陽台一排盆栽、藍黃直立招牌（字看不清）----
    {
      const k = seg(C, R, 1, 3, 9.5, SN);
      for (let x = 0.5; x < k.W - 0.5; x += 0.55) {
        k.box(x, x + 0.35, 3.45, 3.75, -0.7, -0.4, '#3a3a38', NC);
        const g = new C.THREE.SphereGeometry(0.32, 6, 5);
        g.translate(x + 0.17, 4.05, -0.55);
        k._part(C.VC, C.paintGeo(g, x % 1.1 < 0.55 ? '#4b8a3e' : '#3f7a3a'));
      }
      k.box(5.6, 5.75, 3.4, 6.2, -0.9, -0.3, '#2f5fa8', NC);
      k.box(5.58, 5.77, 4.2, 5.4, -0.85, -0.35, '#f2c418', NC);
    }
    // ---- 北側 s 9.5～16：二樓寶瓶欄杆，一道黑色花紋鏤空鐵捲門 ----
    {
      const k = seg(C, R, 1, 9.5, 16, SN);
      k.box(0.2, k.W - 0.2, 3.3, 3.42, -0.75, 0, '#d8cfc0', NC);
      k.box(0.2, k.W - 0.2, 4.15, 4.27, -0.78, -0.62, '#d8cfc0', NC);
      for (let x = 0.35; x < k.W - 0.3; x += 0.26)
        k.cyl(x, -0.7, 0.06, 3.42, 4.15, '#e4ddd0', { seg: 6 });
      const lace = C.sg('q6lace', 128, 128, (g) => {
        g.fillStyle = '#9a9c9a';
        g.fillRect(0, 0, 128, 128);
        g.fillStyle = '#2a2a2c';
        for (let x = 0; x < 128; x += 16)
          for (let y = 0; y < 128; y += 16) {
            g.beginPath();
            g.arc(x + 8, y + 8, 5, 0, Math.PI * 2);
            g.fill();
          }
      });
      k.plane(lace, 2.6, 2.2, 3.9, 1.15, -0.04, FRONT);
    }
    // ---- 北側 s 27～33.5：粉紅磁磚三樓，二三樓紅色鐵窗籠、門上「萬吉來」紅春聯 ----
    {
      const k = seg(C, R, 1, 27, 33.5, SN);
      for (const y of [3.4, 6.4]) {
        C.win(k, k.W / 2, y + 1.4, k.W - 1.4, 1.3, false);
        cage(C, k, 0.6, k.W - 0.6, y + 0.3, y + 2.5, 0.55, '#8a2f2a');
      }
      k.box(4.6, 5.2, 0.6, 2.0, -0.04, -0.02, '#c8231e', NC);
    }
    // ---- 南側 s 21～27：「萬吉來」紅春聯、綠色信箱 ----
    {
      const k = seg(C, R, -1, 21, 27, 2.4);
      k.box(0.6, 1.2, 0.7, 2.1, -0.04, -0.02, '#c8231e', NC);
      k.box(2.0, 2.4, 1.0, 1.45, -0.18, -0.02, '#2f8a4a', NC);
    }
    // ---- 南側 s 38.5～44：185巷東轉角，沿牆的銀色排煙管 ----
    {
      const k = seg(C, R, -1, 38.5, 44, 2.4);
      k.box(0.2, 0.9, 2.2, 6.6, -0.65, -0.05, '#b9bcbf', NC);
      k.box(0.2, 1.8, 2.2, 2.9, -0.65, -0.05, '#b9bcbf', NC);
    }
  },
};
