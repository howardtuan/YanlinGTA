// 新中北路249巷11弄兩側（參考線 'Q11'，s=0 在 249巷中心線，往西南西走、和縱貫線平行；遊戲路寬 3 m）。
// 照 Google 街景 2026-05（照片在 side-session-notes 的 xzb-sv/249/，B_s* 那幾張）與國土測繪 2024 正射建模。
// 實景 11弄只到 s≈112 和一條往南通到新中北路的無名巷交會（Google 地圖再往西標成 185巷6弄，不在這個檔）。
//   北側（+1，鐵道側）由東往西：一整排面向 11弄的四、五樓老公寓，後面到鐵道圍籬之間是空地停車：
//     s 2～7 IAD SELECT SHOP 轉角樓（SegQ1）→ 鋁框玻璃大門四樓（白鐵窗籠）→ 三間棕色圓拱磁磚陽台四樓（藍、灰鐵捲門，一間門上一排抽風扇）→
//     米色鐵窗四樓 → 黃底紅字「精緻套房出租」招牌的五樓米色磁磚公寓 → 四樓兩間 → 紅褐磁磚四樓（紅黃條紋雨遮、鋁門玻璃店面）→
//     紅磚磁磚四樓 → 米色四樓兩間 → 白磁磚四樓（二樓鐵窗籠）→ 藍色海報的玻璃店面四樓 → 四樓 → 棕色馬賽克磁磚四樓（藍鐵捲門，36 號）→
//     紅磚磁磚四樓 → 四樓 → 棕色馬賽克四樓（40 號）→ 白磁磚三樓（鐵皮雨遮）→ 四樓 → 陽台擺滿盆栽的三樓老屋（綠色雨遮）s 108
//   南側（-1，新中北路那排的後面）由東往西：s 5～10 豆花店轉角樓（SegQ1）→ 橘紅磚磁磚四樓（黃底紅字「套房出租」、樓梯口）→
//     灰色花磚陽台四樓 → 白色四樓（綠雨遮小店）→ 一路是灰色洗石子／水泥外牆的四、五樓後棟（鐵窗、冷氣、排煙管、樓梯口、綠色鐵櫃）→
//     白色四樓 → 包著鷹架防塵網施工中的五樓 → 米黃磚四樓 → 白色四樓（木頭花架門廊、盆栽）→ 灰色四樓（窗外一片藍色浪板）→ 白色三樓 s 108
//   南側後牆接著新中北路北側那排（SegX9）街屋的後牆，深度照兩條路之間量（11～13 m）。
// 原本兩側在遊戲裡是空地（草地），沒有 drop／hide。看不清的招牌不放字。
import { NC, seg, cage } from './qkit.js';

const R = 'Q11';
const BEIGE = '#ddd3c0',
  GREYC = '#aeaca4', // 灰色水泥外牆
  WHITE = '#e7e4dc',
  BRICK = '#b25d45', // 紅磚色磁磚
  BROWN = '#8a5a48', // 棕色馬賽克
  SN = 3.6; // 北側立面離中心線（實景 11弄中心比遊戲路面偏北）

const N = (s0, s1, sp) => [R, s0, s1, 1, { nf: 4, d: 11, set: SN, noband: 1, ...sp }];
const S = (s0, s1, d, sp) => [R, s0, s1, -1, { nf: 4, d, noband: 1, ...sp }];

export default {
  lots: [
    // ================= 北側（+1）=================
    N(7, 11.5, { wall: '#ddd5c6', ground: 'gate', bal: 'cage' }), // 鋁框玻璃大門
    N(11.5, 16, { wall: '#d8cfbf', ground: 'shutter', sh: '#8f9496', door: 0, bal: 'cage' }), // 圓拱磁磚陽台（custom）、抽風扇
    N(16, 20.5, { wall: '#d8cfbf', ground: 'shutter', sh: '#3e64a8', bal: 'cage' }),
    N(20.5, 25, { wall: '#d8cfbf', ground: 'shutter', sh: '#9a9c9a', bal: 'cage' }),
    N(25, 29.5, { wall: BEIGE, ground: 'gate', bal: 'grille' }),
    N(29.5, 34, {
      nf: 5,
      wall: '#e2d6bd',
      low: '#7a4a35',
      ground: 'gate',
      bal: 'grille',
      roof: 'tank',
    }), // 精緻套房出租
    N(34, 38.5, { wall: '#d4cfc4', ground: 'shutter', sh: '#a3a5a3', bal: 'grille' }),
    N(38.5, 43, { wall: BEIGE, ground: 'gate', bal: 'cage' }),
    N(43, 47.5, { wall: BRICK, ground: 'shop', awn: ['#d8402a', '#f2c230'], bal: 'grille' }), // 紅黃條紋雨遮
    N(47.5, 52, { wall: BRICK, ground: 'shutter', sh: '#a3a5a3', bal: 'grille' }),
    N(52, 56.5, { wall: BEIGE, ground: 'shutter', sh: '#9a9c9a', bal: 'cage' }),
    N(56.5, 61, { wall: '#d6d0c2', ground: 'gate', bal: 'grille' }),
    N(61, 65.5, { wall: '#ecebe6', ground: 'shutter', sh: '#a6a8a6', bal: 'cage' }),
    N(65.5, 70, { wall: '#dcdad4', ground: 'shop', bal: 'plain' }), // 藍色海報的玻璃店面（custom）
    N(70, 74.5, { wall: BEIGE, ground: 'gate', bal: 'grille' }),
    N(74.5, 79, { wall: BROWN, ground: 'shutter', sh: '#3e5f9a', bal: 'plain' }), // 36 號
    N(79, 83.5, { wall: BRICK, ground: 'gate', bal: 'grille' }),
    N(83.5, 88, { wall: '#d2ccbf', ground: 'shutter', sh: '#9a9c9a', bal: 'grille' }),
    N(88, 92.5, { wall: BROWN, ground: 'shutter', sh: '#8f9496', bal: 'plain' }), // 40 號
    N(92.5, 97, { nf: 3, wall: '#eceae4', ground: 'gate', tin: 1, bal: 'grille' }),
    N(97, 101.5, { wall: '#d9d3c6', ground: 'shutter', sh: '#a3a5a3', bal: 'cage' }),
    N(101.5, 108, {
      nf: 3,
      wall: '#c9c6bc',
      ground: 'gate',
      awn: '#3f8a5a',
      bal: 'open',
      roof: 'shack',
    }), // 盆栽老屋
    // ================= 南側（-1，新中北路那排的後棟）=================
    S(9.93, 12.2, 7.5, { wall: '#c9714a', ground: 'gate', door: 0, bal: 'grille' }),
    S(12.2, 16.5, 11.8, { wall: '#c9714a', ground: 'gate', bal: 'grille' }), // 套房出租
    S(16.5, 21, 11.8, { wall: '#a9a7a0', ground: 'gate', bal: 'grille' }), // 花磚陽台（custom）
    S(21, 25.5, 12.4, { wall: WHITE, ground: 'shop', awn: '#3f8a5a', bal: 'grille' }),
    S(25.5, 30, 12.4, { wall: '#d9d6cc', ground: 'gate', bal: 'grille' }),
    S(30, 34.5, 12.2, { wall: GREYC, ground: 'gate', bal: 'grille' }), // 綠色鐵櫃（custom）
    S(34.5, 39, 12.2, { wall: '#b3b0a7', ground: 'gate', bal: 'grille' }),
    S(39, 43.5, 12.2, { nf: 5, wall: GREYC, ground: 'shutter', sh: '#8f9496', bal: 'grille' }),
    S(43.5, 48, 12.0, { nf: 5, wall: '#a7a59d', ground: 'gate', bal: 'grille' }), // 排煙管（custom）
    S(48, 52.5, 12.0, { wall: GREYC, ground: 'gate', bal: 'grille' }),
    S(52.5, 57, 12.0, { nf: 5, wall: '#c8c5bc', ground: 'gate', bal: 'grille' }),
    S(57, 61.5, 11.8, { wall: '#bbb8af', ground: 'shutter', sh: '#9a9c9a', bal: 'grille' }),
    S(61.5, 66, 11.8, { wall: '#e9e7e1', ground: 'gate', bal: 'grille' }),
    S(66, 70.5, 11.8, { nf: 5, wall: '#8d8f8c', ground: 'gate', door: 0, bal: 'plain' }), // 鷹架防塵網（custom）
    S(70.5, 75, 11.6, { wall: GREYC, ground: 'gate', bal: 'grille' }),
    S(75, 79.5, 11.6, { wall: '#cdb48e', ground: 'gate', bal: 'grille' }),
    S(79.5, 84, 11.4, { wall: '#ece9e0', ground: 'gate', bal: 'grille' }), // 木頭花架門廊（custom）
    S(84, 88.5, 11.4, { wall: '#b8b5ac', ground: 'gate', bal: 'grille' }),
    S(88.5, 93, 11.2, { wall: '#a6a49c', ground: 'gate', bal: 'grille' }), // 藍色浪板（custom）
    S(93, 97.5, 11.2, { wall: GREYC, ground: 'shutter', sh: '#9a9c9a', bal: 'grille' }),
    S(97.5, 102, 10.9, { wall: '#c4c1b8', ground: 'gate', bal: 'grille' }),
    S(102, 108, 10.7, { nf: 3, wall: '#e6e4dd', ground: 'gate', door: 0, bal: 'grille' }),
  ],

  custom(C) {
    const { FRONT, paint } = C;
    // ---- 北側 s 11.5～25：三間棕色圓拱磁磚陽台（每層陽台矮牆一排棕色拱形磁磚），一間鐵捲門上一排抽風扇 ----
    for (const [s0, s1] of [
      [11.5, 16],
      [16, 20.5],
      [20.5, 25],
    ]) {
      const k = seg(C, R, 1, s0, s1, SN);
      for (const y of [3.3, 6.3, 9.3]) {
        k.box(0.3, k.W - 0.3, y, y + 0.95, -0.8, -0.72, '#d8cfbf', NC);
        for (let x = 0.5; x < k.W - 0.9; x += 1.2)
          k.box(x, x + 0.95, y + 0.15, y + 0.85, -0.83, -0.8, '#8f4f36', NC);
      }
    }
    {
      const k = seg(C, R, 1, 11.5, 16, SN);
      for (let x = 0.4; x < 3.2; x += 0.75) {
        k.box(x, x + 0.6, 2.05, 2.65, -0.12, -0.02, '#3a3c3e', NC);
        k.cyl(x + 0.3, -0.13, 0.24, 2.1, 2.6, '#6a6c6e', { seg: 8 });
      }
    }
    // ---- 北側 s 29.5～34：黃底紅字「精緻套房出租」招牌（二樓高度，靠東邊）----
    {
      const k = seg(C, R, 1, 29.5, 34, SN);
      k.box(0.2, 2.2, 3.4, 4.8, -0.18, -0.02, '#f2d21b', NC);
      k.plane(
        paint('精緻套房出租', '#f2d21b', '#d0201a', '電梯大樓／頂級裝潢', 1.9, 1.3),
        1.9,
        1.3,
        1.2,
        4.1,
        -0.19,
        FRONT,
        {
          emissive: 0.25,
        }
      );
    }
    // ---- 北側 s 65.5～70：玻璃店面貼滿藍色海報（字看不清）----
    {
      const k = seg(C, R, 1, 65.5, 70, SN);
      k.box(0.3, 3.2, 0.3, 2.2, -0.06, -0.02, '#2f4f86', NC);
      k.box(0.5, 3.0, 1.2, 1.5, -0.07, -0.06, '#dfe6f0', NC);
      k.box(3.3, 3.7, 1.2, 3.0, -0.25, -0.02, '#1c1c1e', NC); // 門邊黑色小直招
    }
    // ---- 北側 s 101.5～108：盆栽老屋，二樓陽台一排盆栽 ----
    {
      const k = seg(C, R, 1, 101.5, 108, SN);
      for (let x = 0.5; x < k.W - 0.5; x += 0.55) {
        k.box(x, x + 0.35, 3.45, 3.75, -0.7, -0.4, '#3a3a38', NC);
        const g = new C.THREE.SphereGeometry(0.32, 6, 5);
        g.translate(x + 0.17, 4.05, -0.55);
        k._part(C.VC, C.paintGeo(g, x % 1.1 < 0.55 ? '#4b8a3e' : '#3f7a3a'));
      }
    }
    // ---- 南側 s 12.2～16.5：黃底紅字「套房出租」看板、樓梯口欄杆 ----
    {
      const k = seg(C, R, -1, 12.2, 16.5, 2.4);
      k.box(k.W - 1.6, k.W - 0.2, 0.6, 2.1, -0.12, -0.02, '#f2d21b', NC);
      k.plane(
        paint('套房\n出租', '#f2d21b', '#d0201a', null, 1.3, 1.4),
        1.3,
        1.4,
        k.W - 0.9,
        1.35,
        -0.13,
        FRONT,
        {
          emissive: 0.2,
        }
      );
      k.box(k.W - 3.0, k.W - 2.9, 0, 1.0, -0.6, 0, '#c9c9c4', NC);
    }
    // ---- 南側 s 16.5～21：灰色花磚陽台（二、三樓整面鏤空花磚矮牆）----
    {
      const k = seg(C, R, -1, 16.5, 21, 2.4);
      const brickTex = C.sg('q249bloc', 128, 64, (g) => {
        g.fillStyle = '#c9c7c0';
        g.fillRect(0, 0, 128, 64);
        g.fillStyle = '#5a5a58';
        for (let x = 0; x < 128; x += 16)
          for (let y = 0; y < 64; y += 16) {
            g.beginPath();
            g.arc(x + 8, y + 8, 5, 0, Math.PI * 2);
            g.fill();
          }
      });
      for (const y of [3.3, 6.3]) {
        k.box(0.3, k.W - 0.3, y, y + 1.0, -0.7, -0.6, '#c9c7c0', NC);
        k.plane(brickTex, k.W - 0.7, 0.9, k.W / 2, y + 0.5, -0.71, FRONT);
      }
    }
    // ---- 南側 s 30～34.5：門口綠色鐵皮櫃、水泥台階 ----
    {
      const k = seg(C, R, -1, 30, 34.5, 2.4);
      k.box(1.2, 2.2, 0, 1.5, -0.7, -0.05, '#6e9a86');
      k.box(2.6, 3.6, 0, 0.18, -0.6, 0, '#a3a19b', NC);
      k.box(2.6, 3.6, 0.18, 0.36, -0.35, 0, '#a3a19b', NC);
    }
    // ---- 南側 s 43.5～48：沿外牆爬上去的銀色排煙管 ----
    {
      const k = seg(C, R, -1, 43.5, 48, 2.4);
      k.box(1.0, 1.7, 2.0, 15.6, -0.6, -0.05, '#b9bcbf', NC);
      k.box(1.0, 1.7, 2.0, 2.6, -1.1, -0.05, '#b9bcbf', NC);
    }
    // ---- 南側 s 66～70.5：包著深灰色防塵網的鷹架（施工中）----
    {
      const k = seg(C, R, -1, 66, 70.5, 2.4),
        top = 3.3 + 4 * 3.0;
      // 防塵網到牆面之間整塊算實心（有碰撞），不會從側邊鑽進網子裡
      k.box(-0.1, k.W + 0.1, 0, top + 0.6, -0.75, -0.02, '#6f736f');
      for (let x = 0; x <= k.W; x += 1.5)
        k.box(x, x + 0.05, 0, top + 0.6, -0.78, -0.74, '#9a9c9e', NC);
      for (let y = 2; y < top; y += 2)
        k.box(-0.1, k.W + 0.1, y, y + 0.05, -0.79, -0.75, '#9a9c9e', NC);
    }
    // ---- 南側 s 79.5～84：木頭花架門廊、盆栽 ----
    {
      const k = seg(C, R, -1, 79.5, 84, 2.4);
      for (const x of [1.4, 3.6]) k.box(x, x + 0.12, 0, 2.5, -1.0, -0.88, '#7a5232', NC);
      k.box(1.2, 3.9, 2.5, 2.6, -1.1, 0, '#7a5232', NC);
      for (let x = 1.3; x < 3.8; x += 0.5) k.box(x, x + 0.06, 2.6, 2.66, -1.1, 0, '#8a6040', NC);
      for (const x of [0.4, 4.0]) {
        k.box(x - 0.2, x + 0.2, 0, 0.35, -0.6, -0.2, '#a0522d', NC);
        const g = new C.THREE.SphereGeometry(0.35, 6, 5);
        g.translate(x, 0.6, -0.4);
        k._part(C.VC, C.paintGeo(g, '#4b8a3e'));
      }
    }
    // ---- 南側 s 88.5～93：二樓窗外一片藍色浪板 ----
    {
      const k = seg(C, R, -1, 88.5, 93, 2.4);
      k.box(0.6, 3.4, 3.6, 5.6, -0.12, -0.02, '#4f78b8', NC);
      for (let x = 0.7; x < 3.4; x += 0.2)
        k.box(x, x + 0.06, 3.6, 5.6, -0.15, -0.12, '#3f68a8', NC);
    }
    // ---- 南側最西邊 s 102～108：二樓凸出的老鐵窗籠 ----
    {
      const k = seg(C, R, -1, 102, 108, 2.4);
      cage(C, k, 0.5, 2.8, 3.5, 5.6, 0.4, '#d8d8d2');
    }
  },
};
