// 新中北路249巷兩側（參考線 'Q'，s=0 在新中北路中心線，往北走；11弄口 s≈41.4、北端 s≈73 是縱貫線平交道；遊戲路寬 5 m）。
// 照 Google 街景（巷口到 11弄口 2026-05，11弄口以北 2024-08）與國土測繪 2024 正射建模，照片在 side-session-notes 的 xzb-sv/249/。
//   東側（+1）由南往北：巷口 s 14 以南是 SegX9 的雜草空地 → 鐵絲網圍起來的空地（大榕樹、後面一道灰色水泥牆；南段後面是 SegX8 的老屋）s 14.5～26 →
//     米黃磚三樓（青綠雨遮、藍灰鐵捲門、三樓外牆有鐵架）s 26～44.5 → 白色三樓大廠房（一樓兩道藍色鐵捲門、綠窗簾的玻璃店面，
//     三樓藍白「i win tech」看板）s 45～62.5，再往北是平交道
//   西側（-1）由南往北：巷口西轉角是 SegX9 的全家那棟（到 s≈20）→ 豆花店轉角三樓（一樓粉紅色浪板圍牆、紫色鐵捲門上紅底
//     「中原鐵路豆花」招牌、門口「豆花 豆漿」燈箱，二樓鏽色欄杆陽台）s 21～36.9，轉角另一面朝 11弄 →（11弄口）→
//     IAD SELECT SHOP 轉角四樓（一樓黑白格子飾帶、黑底白字招牌，三樓轉角黃底「中原傳統 豆花・豆漿」，主立面朝 11弄，巷子這面是灰色側牆）s 43.8～51 →
//     灰色三樓（一樓霧面花紋玻璃大窗、二三樓白色鐵窗）s 51～60 → 單層灰色加蓋 s 60～64（緊鄰平交道）
// 兩棟轉角樓的兩面各貼著一條巷子（兩條巷子斜交約 30°），照兩條立面線的交點做成多邊形（qkit.js polyBlock）。
// 原本巷子兩側在遊戲裡是空地（草地），沒有 drop／hide。看不清的招牌不放字。
import { NC, seg, polyBlock, winRow, cage, tree, bush, meshFence } from './qkit.js';

const R = 'Q';
const TAN = '#dccaa5', // 米黃磚
  WHITE = '#e8e6df',
  GREY = '#bab9b2',
  TEAL = '#4f8a86';

// 豆花店轉角樓、IAD 轉角樓的世界座標輪廓（立面線：249巷 3.4、11弄南側 2.4、11弄北側 3.6；交點用 xzAt 算好）
// 豆花店那棟只有 4 m 深（正射：沿 249巷的窄長條），後面是 11弄南側那排（SegQ2）的樓
const DOUHUA = [
  [-268.41, -154.93], // 249巷 s 21
  [-269.1, -170.83], // 249巷 s 36.9 = 11弄 s 5.15
  [-273.24, -168.4], // 11弄 s 9.93 = 249巷往西 7.4 那條線
  [-272.41, -154.76], // 249巷 s 21 往西 7.4
];
const IAD = [
  [-273.76, -175.05], // 11弄 s 7
  [-269.45, -177.59], // 11弄 s 2.0 = 249巷 s 43.8
  [-269.92, -184.82], // 249巷 s 51
  [-279.6, -184.3], // 249巷 s 51 往西 10
];

export default {
  lots: [
    // ================= 東側（+1）=================
    // 米黃磚三樓：一樓灰色鐵捲門，上面一道青綠雨遮
    [
      R,
      26,
      31,
      1,
      {
        nf: 3,
        wall: TAN,
        ground: 'shutter',
        sh: '#9aa0a2',
        awn: TEAL,
        noband: 1,
        door: 0,
        bal: 'plain',
        d: 9,
        roof: 'none',
      },
    ],
    // 同一排：藍灰色大鐵捲門、青綠雨遮（三樓外牆的鐵架在 custom）
    [
      R,
      31,
      37.5,
      1,
      {
        nf: 3,
        wall: TAN,
        ground: 'shutter',
        sh: '#5b7f95',
        awn: TEAL,
        noband: 1,
        door: 0,
        bal: 'plain',
        d: 9,
        roof: 'none',
      },
    ],
    // 同一排北段：一樓小門與鐵窗
    [
      R,
      37.5,
      44.5,
      1,
      { nf: 3, wall: TAN, ground: 'gate', noband: 1, bal: 'grille', d: 9, roof: 'none' },
    ],
    // 白色三樓大廠房（深 22 m）：一樓兩道藍色鐵捲門
    [
      R,
      45,
      51,
      1,
      {
        nf: 3,
        wall: WHITE,
        ground: 'shutter',
        sh: '#3d68a8',
        noband: 1,
        door: 0,
        bal: 'cage',
        d: 22,
        roof: 'none',
      },
    ],
    // 綠窗簾的玻璃店面（招牌看不清）
    [
      R,
      51,
      57,
      1,
      { nf: 3, wall: WHITE, ground: 'shop', noband: 1, bal: 'cage', d: 22, roof: 'none' },
    ],
    [
      R,
      57,
      62.5,
      1,
      {
        nf: 3,
        wall: WHITE,
        ground: 'shutter',
        sh: '#3d68a8',
        noband: 1,
        door: 0,
        bal: 'grille',
        d: 20,
        roof: 'tank',
      },
    ],
    // ================= 西側（-1）=================
    // 灰色三樓：一樓霧面花紋玻璃大窗（gate）、二三樓白色鐵窗
    [
      R,
      51,
      60,
      -1,
      { nf: 3, wall: GREY, ground: 'gate', noband: 1, bal: 'grille', d: 10, roof: 'none' },
    ],
    // 平交道邊的單層灰色加蓋
    [
      R,
      60,
      64,
      -1,
      { nf: 1, wall: GREY, ground: 'gate', noband: 1, door: 0, d: 6, roofCol: '#8f9294' },
    ],
  ],

  custom(C) {
    const { MR, FRONT, paint, lcg } = C;
    const r = lcg(24911);

    // ---- 東側 s 14.5～26：鐵絲網圍起來的空地，大榕樹、後面一道灰色水泥牆 ----
    // 南段（s < 18.5）後面 8.3 m 起是 SegX8 那間老屋的後半，水泥牆在那裡往前收
    {
      const k = seg(C, R, 1, 14.5, 26, 3.4),
        W = k.W,
        xb = k.sx(18.5);
      k.box(0, W, -0.5, 0.05, -0.9, 0, MR.concrete, { col: false, surface: true }); // 圍籬外的水泥邊
      k.box(0, xb, -0.5, 0.03, 0, 4.7, '#7c6d55', NC); // 泥土地
      k.box(xb, W, -0.5, 0.03, 0, 9, '#7c6d55', NC);
      meshFence(C, k, 0, W, -0.05, 1.9);
      k.box(0, xb, -0.5, 3.0, 4.6, 4.85, '#a9a8a2', { tile: [0.6, 0.6] }); // 後面的灰色水泥牆
      k.box(xb - 0.25, xb, -0.5, 3.0, 4.6, 9.25, '#a9a8a2', { tile: [0.6, 0.6] });
      k.box(xb, W, -0.5, 3.0, 9, 9.25, '#a9a8a2', { tile: [0.6, 0.6] });
      for (let i = 0; i < 14; i++) {
        const x = 0.5 + r() * (W - 1);
        bush(
          C,
          k,
          x,
          0.6 + r() * (x < xb ? 3.6 : 7.8),
          0.35 + r() * 0.4,
          r() < 0.5 ? '#4f7a3a' : '#5f8a44'
        );
      }
      tree(C, k, k.sx(16), 2.6, 4.6, 2.6);
      tree(C, k, k.sx(22.5), 5.5, 3.6, 2.0, ['#4b8a3e', '#3a6e36']);
      // 圍籬邊的電桿（街景 s 18）
      k.cyl(k.sx(18.2), -0.5, 0.17, 0, 9.5, '#a8a7a2', { seg: 8, r1: 0.13, col: true });
    }

    // ---- 東側米黃磚三樓：三樓外牆一排鐵架（街景看到的橘色鐵架、舊招牌框）----
    {
      const k = seg(C, R, 1, 26, 44.5, 3.4);
      for (let x = 1.5; x < k.W - 1; x += 3.2) {
        k.box(x, x + 0.08, 6.4, 8.8, -0.5, 0, '#c47a2c', NC);
        k.box(x - 0.4, x + 0.5, 8.7, 8.8, -0.5, 0, '#c47a2c', NC);
      }
    }

    // ---- 東側白色廠房：三樓藍白「i win tech」看板 ----
    {
      const k = seg(C, R, 1, 51, 62.5, 3.4);
      k.plane(
        paint('i win tech', '#ffffff', '#1d6fc0', null, 5.5, 1.6, 96),
        5.5,
        1.6,
        4.6,
        7.9,
        -0.06,
        FRONT,
        {
          emissive: 0.15,
        }
      );
    }

    // ---- 西側豆花店轉角樓（多邊形，三樓）----
    {
      const top = 9.3;
      const kq = seg(C, R, -1, 21, 36.9, 3.4),
        W = kq.W; // +x 朝南：x 0 在轉角（s 36.9）、W 在 s 21
      polyBlock(C, kq, DOUHUA, top, '#d6d1c4');
      // 一樓：s 21～30.5 粉紅色浪板圍牆（直條紋），s 30.5～36.5 紫色鐵捲門＋紅底招牌
      const p0 = kq.sx(30.5),
        p1 = kq.sx(21);
      kq.box(p0, p1, 0, 2.7, -0.12, -0.02, '#e0bccb', { col: false });
      for (let x = p0 + 0.12; x < p1; x += 0.24)
        kq.box(x, x + 0.06, 0, 2.7, -0.15, -0.12, '#d2aabb', NC);
      kq.box(p0, p1, 2.7, 2.78, -0.9, 0, '#5f8f6a', NC); // 圍牆上的綠色浪板簷
      kq.plane(C.shutterTex('#8e84b0'), 5.0, 2.4, kq.sx(33.6), 1.2, -0.03, FRONT);
      kq.box(kq.sx(36.4), kq.sx(30.8), 2.45, 2.65, -0.22, 0, '#7a7e80', NC);
      kq.box(kq.sx(36.6), kq.sx(30.6), 2.65, 3.35, -0.3, -0.02, '#7a1f2b', NC);
      kq.plane(
        paint('中原鐵路豆花', '#7a1f2b', '#f8ecd0', '傳統手工 0933-179151', 5.8, 0.7),
        5.8,
        0.7,
        kq.sx(33.6),
        3.0,
        -0.31,
        FRONT,
        { emissive: 0.3 }
      );
      // 門口「豆花 豆漿」白底藍字燈箱（轉角）
      kq.box(0.5, 1.1, 0, 1.6, -0.9, -0.5, '#f4f4f0');
      kq.plane(
        paint('豆花\n豆漿', '#f4f4f0', '#1f4fa0', null, 0.6, 1.1),
        0.6,
        1.1,
        0.8,
        1.0,
        -0.91,
        FRONT,
        {
          emissive: 0.4,
        }
      );
      kq.box(1.4, 1.75, 0, 0.6, -0.9, -0.55, '#e8602a'); // 三角錐
      // 二樓：整排鏽色欄杆陽台；二、三樓窗
      kq.box(0, W, 3.3, 3.4, -0.9, 0, '#c9c4b8', NC);
      kq.box(0, W, 4.25, 4.32, -0.9, -0.85, '#6b5a48', NC);
      for (let x = 0.1; x < W; x += 0.2)
        kq.box(x, x + 0.03, 3.4, 4.25, -0.88, -0.85, '#6b5a48', NC);
      winRow(C, kq, 0.4, W - 0.4, 4.9, 4, 1.5, 1.3);
      winRow(C, kq, 0.4, W - 0.4, 7.8, 4, 1.4, 1.2, false);
      kq.box(0, W, 6.2, 6.3, -0.6, 0, '#a7a49a', NC); // 三樓簷
      C.ac(kq, 2.2, 6.5, -0.5);
      C.ac(kq, 9.0, 6.5, -0.5);
      kq.box(W - 0.2, W, 0, 9.3, -0.05, 4, '#b9b6ae', NC); // 南邊和 SegX9 全家那棟之間的分戶牆邊
      // 11弄那面：一樓灰鐵捲門，二、三樓鐵窗
      const k11 = seg(C, 'Q11', -1, 5.15, 9.93, 2.4);
      k11.plane(C.shutterTex('#9a9c9a'), 2.6, 2.4, 2.2, 1.2, -0.03, FRONT);
      winRow(C, k11, 0.6, k11.W - 0.6, 4.9, 1, 1.4, 1.2);
      winRow(C, k11, 0.6, k11.W - 0.6, 7.8, 1, 1.3, 1.2, false);
      k11.box(-0.01, k11.W + 0.01, -0.5, 0.05, -0.8, 0, MR.concrete, { col: false, surface: true });
      kq.box(-0.01, W + 0.01, -0.5, 0.05, -0.9, 0, MR.concrete, { col: false, surface: true });
    }

    // ---- 西側 IAD SELECT SHOP 轉角樓（多邊形，四樓；主立面朝 11弄）----
    {
      const top = 12.3;
      const k11 = seg(C, 'Q11', 1, 2.0, 7, 3.6),
        W = k11.W; // +x 朝西：x 0 在轉角
      polyBlock(C, k11, IAD, top, '#e2dccf');
      // 一樓：黑白格子飾帶、黑底白字招牌、鐵捲門
      k11.plane(C.shutterTex('#a6a8a6'), W - 0.8, 2.3, W / 2, 1.15, -0.03, FRONT);
      k11.box(0, W, 2.45, 2.75, -0.12, 0, '#f2f2ee', NC);
      for (let x = 0; x < W - 0.01; x += 0.3)
        k11.box(
          x,
          x + 0.15,
          2.45 + ((x / 0.3) % 2 ? 0.15 : 0),
          2.6 + ((x / 0.3) % 2 ? 0.15 : 0),
          -0.13,
          -0.12,
          '#1c1c1e',
          NC
        );
      k11.box(0, W, 2.75, 3.6, -0.6, 0, '#1c1c1e', NC);
      k11.plane(
        paint('IAD SELECT SHOP', '#1c1c1e', '#f4f4f0', null, W - 0.2, 0.7),
        W - 0.2,
        0.7,
        W / 2,
        3.18,
        -0.61,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      // 二、三樓白色鐵窗籠，四樓窗
      for (const y of [3.4, 6.4]) {
        C.win(k11, W / 2, y + 1.45, W - 1, 1.4, false);
        cage(C, k11, 0.3, W - 0.3, y + 0.1, y + 2.6, 0.55);
      }
      winRow(C, k11, 0.4, W - 0.4, 10.8, 2, 1.5, 1.2);
      C.ac(k11, 0.4, 9.6, -0.45);
      k11.box(-0.01, W + 0.01, -0.5, 0.05, -2.1, 0, MR.concrete, { col: false, surface: true });
      // 249巷那面：灰色側牆，一樓格子飾帶延伸過來，轉角三樓黃底藍字「中原傳統 豆花・豆漿」
      const kq = seg(C, R, -1, 43.76, 51, 3.4); // +x 朝南：x 0 在 s 51、W 在轉角
      const Wq = kq.W;
      kq.box(Wq - 3.2, Wq, 2.45, 2.75, -0.12, 0, '#f2f2ee', NC);
      kq.box(Wq - 3.2, Wq, 2.75, 3.6, -0.6, 0, '#1c1c1e', NC);
      kq.plane(C.shutterTex('#a6a8a6'), 2.4, 2.3, Wq - 1.6, 1.15, -0.03, FRONT);
      kq.plane(
        paint('中原傳統\n豆花・豆漿', '#f2d21b', '#1f3f9a', null, 2.2, 1.4),
        2.2,
        1.4,
        Wq - 1.4,
        7.6,
        -0.25,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      kq.box(Wq - 2.55, Wq - 0.25, 6.85, 8.35, -0.24, 0, '#f2d21b', NC);
      for (const y of [4.9, 7.9, 10.9]) winRow(C, kq, 0.6, Wq - 3.2, y, 2, 1.2, 1.1);
      winRow(C, kq, 0.6, Wq - 3.4, 1.6, 1, 1.4, 1.1);
      kq.box(-0.01, Wq + 0.01, -0.5, 0.05, -0.9, 0, MR.concrete, { col: false, surface: true });
    }
  },

  footprints(F) {
    return [
      F(R, 14.5, 18.5, 1, 3.4, 4.9), // 東側鐵絲網空地（南段後面是 SegX8 的老屋）
      F(R, 18.5, 26, 1, 3.4, 9.3),
      [...DOUHUA],
      [...IAD],
    ];
  },
};
