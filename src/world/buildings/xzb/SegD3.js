// 大仁三街兩側（參考線 'D3'，s=0 在大仁街口往西南走到實踐路口，全長約 81 m；路寬 5 m）。
// 照 Google 街景（巷內只有 2024-08 一個年份是最新的，s 61 一帶預設是 2020-09，改切 2024-08）與國土測繪 2024 正射建模，
// 店家先後順序照照片，寬度照照片換算與原本夜市補建量體的分戶線（照片在 side-session-notes 的 zs-sv/D34/）。
//   西北側（+1、照片 _R）由大仁街往實踐路：17 號紅瓦山牆三樓透天（白色寶瓶欄杆陽台、青綠雨遮車庫）→ 四樓米色鐵窗（綠雨遮鐵捲門）→
//     四樓銀色鋁板包覆（紅色橫帶，一樓綠雨遮下是玻璃窗的機械工作室）→ 紅瓦山牆三樓透天 → 13 號三樓（拱形窗、大車庫門）→
//     11 號紅瓦山牆三樓（四樓紅色鐵皮加蓋、圓弧採光罩、滿滿盆栽）→ 四樓白磁磚（頂樓綠色玻璃加蓋）→ 9 號翔大拉麵（三樓、頂樓玻璃屋、圓形「拉麵」側招）→
//     7 號紅瓦山牆三樓 → 5 號綠雨遮玻璃店面 → 3 號紅瓦斜頂三樓（白色寶瓶欄杆、鐵門）
//   東南側（-1、照片 _L）由大仁街往實踐路：四樓白磁磚大鐵捲門車庫 → 四樓橘紅色凸窗 → 16 號四樓（半圓拱窗、橘紅凸窗、鐵皮雨遮門廊）→
//     綠雨遮鐵捲門四樓 → 灰色四樓 → 白磁磚橘紅凸窗四樓（綠色波浪雨遮車庫）→ 灰色雨遮窄店 → 東興素食（紅色布條「蔬食 即將在此為您服務」）→
//     12 號三樓加紅瓦山牆四樓（拱形門楣、鐵皮雨遮門廊）→ 四樓白磁磚（頂樓綠玻璃加蓋）→ 康櫻廣東粥（紅色直立招牌）→ 泰美味（雲泰料理美食 Tasty Thai，藍色浪板大招牌、白色雞蛋花）
// 兩端轉角不在這個檔：
//   大仁街口兩角（+1 的有間冰店單層鐵皮屋到 s≈8.7、-1 的食麪轉角樓）是 src/world/buildings/StreetDaren.js 的大仁街街屋，
//   冰店後面的 19 號紅瓦透天（s 8.8～14）在這裡；
//   實踐路口兩角（+1 s 62.5 起的 1 號飲丹丘、-1 s 63.8 起的兩層木窗老屋）是 src/world/buildings/shijian/S2.js。
// 原本兩側是 src/world/buildings/NightMarketFill.js 照正射補的通用量體（nm16～nm33，都有店面牆）：一律放 hide，資料留著、全圖亂數不變。
// 看不清的招牌不放字。
const R = 'D3';
const NC = { col: false };
const seg = (C, side, s0, s1, set = 3.8) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  return k;
};
// 三角稜柱：底邊在 y0、寬 x0～x1、高 rise，從 z0 延伸到 z1（山牆）
const prism = (C, k, x0, x1, y0, rise, z0, z1, hex) => {
  const g = new C.THREE.CylinderGeometry(1, 1, z1 - z0, 3);
  g.rotateX(-Math.PI / 2);
  g.scale((x1 - x0) / 2 / 0.866, rise / 1.5, 1);
  g.translate((x0 + x1) / 2, y0 + rise / 3, (z0 + z1) / 2);
  k._part(C.VC, C.paintGeo(g, hex));
};
const TILE = '#b4553e', // 紅瓦
  CREAM = '#e4dccb', // 米白磁磚
  WT = '#ebeae5', // 白磁磚
  GREEN = '#3f8a5a', // 綠色雨遮
  TEAL = '#4f8a86'; // 青綠雨遮
// 紅瓦山牆：三樓頂上一道紅瓦斜簷，正中一個白色三角山牆（灰泥浮雕）
const gable = (C, k, top, wall = '#efece4') => {
  const w = k.W;
  k.box(-0.05, w + 0.05, top - 0.05, top + 0.3, -0.7, 0.4, TILE, NC); // 紅瓦簷
  prism(C, k, 0.5, w - 0.5, top + 0.3, 1.5, -0.55, 0.3, TILE);
  prism(C, k, 0.75, w - 0.75, top + 0.32, 1.15, -0.6, -0.5, wall);
  k.box(w / 2 - 0.45, w / 2 + 0.45, top + 0.55, top + 0.95, -0.63, -0.6, '#c9b9a0', NC); // 山牆浮雕
};
// 寶瓶欄杆陽台（二樓）：白色欄杆、上下橫板
const balusters = (C, k, x0, x1, y) => {
  k.box(x0, x1, y, y + 0.12, -0.9, 0, '#f1efe9', NC);
  k.box(x0, x1, y + 0.95, y + 1.05, -0.92, -0.75, '#f1efe9', NC);
  for (let x = x0 + 0.15; x < x1 - 0.1; x += 0.28)
    k.cyl(x, -0.83, 0.07, y + 0.12, y + 0.95, '#f4f2ec', { seg: 6 });
};
// 橘紅色凸窗：二樓起每層一個白磁磚凸窗，底下一片橘紅色斜板
const orangeBays = (C, k, nf) => {
  const w = k.W;
  for (let f = 2; f <= nf; f++) {
    const y = 3.3 + (f - 2) * 3.0;
    k.box(0.5, w - 0.5, y + 0.45, y + 2.55, -0.55, 0, WT, NC);
    k.box(0.75, w - 0.75, y + 0.9, y + 2.2, -0.57, -0.55, '#4f6a70', NC);
    k.box(0.4, w - 0.4, y + 0.2, y + 0.45, -0.75, 0, '#cf5a36', NC);
  }
};

// 一格街屋：+1 西北側、-1 東南側
const N = (s0, s1, sp) => [R, s0, s1, 1, { d: 12, ...sp }];
const S = (s0, s1, sp) => [R, s0, s1, -1, { d: 12, ...sp }];

export default {
  // 夜市補建（NightMarketFill.js）在大仁三街兩側的量體，都有店面牆
  hide: [
    // 西北側 s 14.3～62.9
    'nm16',
    'nm17',
    'nm18',
    'nm19',
    'nm20',
    'nm21',
    'nm22',
    'nm23',
    'nm24',
    'nm25',
    // 東南側 s 18.3～60.4
    'nm26',
    'nm27',
    'nm28',
    'nm29',
    'nm30',
    'nm31',
    'nm32',
    'nm33',
  ],
  ownSign: ['翔大拉麵店', '東興素食', '康櫻廣東粥', '泰美味'],
  lots: [
    // ================= 西北側（+1）=================
    // 19 號：和 17 號相連的紅瓦山牆三樓透天，陽台擺滿盆栽、一樓青綠雨遮下鐵門車庫。
    //   前面（s < 8.8）是 src/world/buildings/StreetDaren.js 大仁街轉角的單層冰店鐵皮屋；深 5.2 m，不碰後面大仁街的花茶大師那格
    N(8.8, 14, {
      nf: 3,
      wall: CREAM,
      ground: 'gate',
      sh: '#9a9c9a',
      awn: TEAL,
      noband: 1,
      bal: 'arch',
      roof: 'none',
      d: 5.2,
    }),
    // 17 號：紅瓦山牆三樓透天，白色寶瓶欄杆陽台，一樓青綠雨遮下是鐵門車庫
    N(14, 19.5, {
      nf: 3,
      wall: CREAM,
      ground: 'gate',
      sh: '#9a9c9a',
      awn: TEAL,
      noband: 1,
      bal: 'arch',
      roof: 'none',
    }),
    // 四樓米色鐵窗，一樓綠雨遮鐵捲門
    N(19.5, 23.5, {
      nf: 4,
      wall: '#ddd3bd',
      ground: 'shutter',
      sh: '#8f9a8c',
      awn: GREEN,
      noband: 1,
      door: 0,
      bal: 'cage',
    }),
    // 四樓銀色鋁板包覆（紅色橫帶），一樓綠雨遮下整面玻璃窗的機械工作室
    N(23.5, 28, {
      nf: 4,
      wall: '#c3c7cb',
      ground: 'shop',
      awn: GREEN,
      noband: 1,
      bal: 'plain',
      hood: '#a8473a',
      roof: 'shack',
    }),
    // 紅瓦山牆三樓透天
    N(28, 31.5, {
      nf: 3,
      wall: CREAM,
      ground: 'gate',
      sh: '#a2a29e',
      noband: 1,
      bal: 'arch',
      roof: 'none',
    }),
    // 13 號：三樓米色磁磚，拱形鐵花窗，一樓大車庫鐵門
    N(31.5, 35.5, {
      nf: 3,
      wall: '#d9cdb3',
      ground: 'gate',
      sh: '#b3b3ae',
      noband: 1,
      door: 0,
      bal: 'arch',
      roof: 'none',
    }),
    // 11 號：紅瓦山牆三樓、四樓紅色鐵皮加蓋，一樓圓弧採光罩門廊與一大片盆栽
    N(35.5, 40, {
      nf: 3,
      wall: CREAM,
      ground: 'gate',
      sh: '#a2a29e',
      noband: 1,
      bal: 'arch',
      roof: 'none',
    }),
    // 四樓白磁磚，頂樓綠色玻璃加蓋
    N(40, 44, {
      nf: 4,
      wall: WT,
      ground: 'shutter',
      sh: '#a8aaa8',
      noband: 1,
      door: 0,
      bal: 'grille',
      roof: 'none',
    }),
    // 9 號翔大拉麵：三樓灰磚，頂樓玻璃屋，綠雨遮兩扇鐵捲門，圓形「拉麵」側招
    N(44, 49, {
      nf: 3,
      wall: '#b9bcbe',
      ground: 'shutter',
      sh: '#a9aba8',
      awn: GREEN,
      noband: 1,
      round: ['拉麵', '#f4f2ee', '#2a2a2a'],
      bal: 'plain',
      roof: 'none',
    }),
    // 7 號：紅瓦山牆三樓透天
    N(49, 53, {
      nf: 3,
      wall: CREAM,
      ground: 'gate',
      sh: '#a2a29e',
      awn: GREEN,
      noband: 1,
      bal: 'arch',
      roof: 'none',
    }),
    // 5 號：綠雨遮下整面玻璃店面
    N(53, 57, {
      nf: 3,
      wall: '#e6e1d4',
      ground: 'shop',
      awn: GREEN,
      noband: 1,
      bal: 'arch',
    }),
    // 3 號：紅瓦斜頂三樓（頂上綠色鐵皮），白色寶瓶欄杆，鐵門
    N(57, 62.5, {
      nf: 3,
      wall: '#e3dccb',
      ground: 'gate',
      sh: '#a8a8a4',
      noband: 1,
      bal: 'arch',
      roof: 'none',
    }),

    // ================= 東南側（-1）=================
    // 四樓白磁磚，一樓兩台車寬的鐵捲門車庫（後面還有房子，深度只到 8 m）
    S(14, 18, {
      nf: 4,
      wall: WT,
      ground: 'shutter',
      sh: '#9fa2a2',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 8,
    }),
    // 四樓橘紅色凸窗
    S(18, 22, { nf: 4, wall: WT, ground: 'gate', sh: '#8e918f', noband: 1, bal: 'plain', d: 8 }),
    // 16 號：半圓拱窗、橘紅凸窗，鐵皮雨遮門廊
    S(22, 26, {
      nf: 4,
      wall: '#e4e1d8',
      ground: 'gate',
      sh: '#7d7f7c',
      tin: true,
      noband: 1,
      bal: 'plain',
      d: 8,
    }),
    // 綠雨遮鐵捲門，樓上橘紅凸窗
    S(26, 30, {
      nf: 4,
      wall: WT,
      ground: 'shutter',
      sh: '#9b9e9c',
      awn: GREEN,
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    S(30, 33, { nf: 4, wall: '#cfcbc2', ground: 'gate', sh: '#8a8c8a', noband: 1, bal: 'cage' }),
    // 白磁磚橘紅凸窗，一樓綠色波浪邊雨遮下停車
    S(33, 37, {
      nf: 4,
      wall: WT,
      ground: 'open',
      awn: GREEN,
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 灰色雨遮窄店
    S(37, 40, {
      nf: 4,
      wall: '#d7d3ca',
      ground: 'shutter',
      sh: '#8d8f8e',
      awn: '#8a8c8c',
      noband: 1,
      bal: 'grille',
    }),
    // 東興素食：紅色布條，鐵捲門
    S(40, 44.5, {
      nf: 4,
      wall: '#e1ddd2',
      sign: ['東興素食', '#c8282a', '#ffffff'],
      banner: ['蔬食 即將在此為您服務', '#d8282a', '#ffffff'],
      ground: 'shutter',
      sh: '#a7a9a6',
      bal: 'grille',
    }),
    // 12 號：三樓加紅瓦山牆四樓（拱形陽台），一樓拱形門楣、鐵皮雨遮門廊
    S(44.5, 49.5, {
      nf: 3,
      wall: '#e9e6de',
      ground: 'gate',
      sh: '#6f6a62',
      tin: true,
      noband: 1,
      bal: 'plain',
      roof: 'none',
    }),
    // 四樓白磁磚，頂樓綠玻璃加蓋
    S(49.5, 53, {
      nf: 4,
      wall: WT,
      ground: 'shutter',
      sh: '#a1a3a1',
      noband: 1,
      bal: 'grille',
      roof: 'none',
    }),
    // 康櫻廣東粥：紅色直立招牌
    S(53, 56, {
      nf: 4,
      wall: '#e6e3da',
      sign: [' ', '#efefe9', '#333333'],
      vert: ['廣東粥', '#c8282a', '#ffffff'],
      ground: 'shop',
      bal: 'grille',
    }),
    // 泰美味：三樓紅瓦山牆（中間一個拱形陽台），一樓藍色浪板大招牌、白色雞蛋花
    S(56, 59.8, {
      nf: 3,
      wall: '#e7e3da',
      sign: ['雲泰料理美食 Tasty Thai', '#3d5f9e', '#ffffff'],
      ground: 'shop',
      bal: 'plain',
      roof: 'none',
    }),
    S(59.8, 63.8, {
      nf: 3,
      wall: '#e7e3da',
      sign: ['泰美味', '#3d5f9e', '#ffffff', 'Tasty Thai'],
      ground: 'shop',
      bal: 'arch',
      roof: 'none',
    }),
  ],

  custom(C) {
    // ---- 西北側：紅瓦山牆、寶瓶欄杆 ----
    for (const [s0, s1] of [
      [8.8, 14],
      [14, 19.5],
      [28, 31.5],
      [35.5, 40],
      [49, 53],
    ]) {
      const k = seg(C, 1, s0, s1);
      gable(C, k, 3.3 + 2 * 3.0);
      balusters(C, k, 0.2, k.W - 0.2, 3.3);
    }
    // 19 號陽台上一排盆栽
    {
      const k = seg(C, 1, 8.8, 14);
      for (let x = 0.5; x < k.W - 0.4; x += 0.55)
        k.box(
          x,
          x + 0.4,
          3.45,
          3.45 + 0.35 + (x % 1.1 > 0.5 ? 0.25 : 0),
          -0.8,
          -0.4,
          '#3f7a3a',
          NC
        );
    }
    // 11 號四樓的紅色鐵皮加蓋
    {
      const k = seg(C, 1, 35.5, 40),
        top = 3.3 + 2 * 3.0;
      k.box(0.3, k.W - 0.3, top + 0.3, top + 2.8, 1.2, 10, '#b5423a');
      k.box(0.1, k.W - 0.1, top + 2.8, top + 2.9, 1.0, 10.3, '#8c8f90', NC);
      // 一樓圓弧採光罩與盆栽
      k.box(0.2, k.W - 0.2, 2.6, 2.7, -1.25, 0, '#d9d6cc', NC);
      for (let x = 0.5; x < k.W - 0.4; x += 0.7)
        k.cyl(x, -0.6, 0.28, 0, 0.7 + (x % 0.5), '#4b8a3e', { seg: 7 });
    }
    // 3 號：紅瓦斜頂與頂上的綠色鐵皮
    {
      const k = seg(C, 1, 57, 62.5),
        top = 3.3 + 2 * 3.0;
      k.box(-0.05, k.W + 0.05, top - 0.05, top + 0.35, -0.7, 0.5, TILE, NC);
      k.box(0.3, k.W - 0.3, top + 0.35, top + 2.2, 2.5, 11, '#5e8a6a');
      balusters(C, k, 0.2, k.W - 0.2, 3.3);
    }
    // 四樓白磁磚、9 號拉麵的頂樓玻璃加蓋
    for (const [s0, s1, nf, col] of [
      [40, 44, 4, '#6f9a86'],
      [44, 49, 3, '#8fb4b8'],
    ]) {
      const k = seg(C, 1, s0, s1),
        top = 3.3 + (nf - 1) * 3.0;
      k.box(0.2, k.W - 0.2, top + 0.12, top + 2.5, 0.2, 7, col);
      k.box(0.05, k.W - 0.05, top + 2.5, top + 2.6, 0, 7.2, '#c9cbcb', NC);
    }
    // ---- 東南側 ----
    // 橘紅凸窗
    for (const [s0, s1] of [
      [18, 22],
      [22, 26],
      [26, 30],
      [33, 37],
    ])
      orangeBays(C, seg(C, -1, s0, s1), 4);
    // 16 號一樓的半圓拱窗（門廊上方）
    {
      const k = seg(C, -1, 22, 26);
      k.cyl(k.W / 2, -0.04, 1.1, 2.55, 2.62, '#cfcbc0', { seg: 12 });
    }
    // 12 號：紅瓦山牆的四樓（拱形陽台）
    {
      const k = seg(C, -1, 44.5, 49.5),
        top = 3.3 + 2 * 3.0;
      k.box(0.6, k.W - 0.6, top, top + 2.7, 0.3, 9, '#e9e6de');
      k.box(1.4, k.W - 1.4, top + 0.4, top + 2.1, 0.28, 0.3, '#4f5a60', NC);
      gable(C, k, top + 2.7, '#e9e6de');
    }
    // 四樓白磁磚的頂樓綠玻璃加蓋
    {
      const k = seg(C, -1, 49.5, 53),
        top = 3.3 + 3 * 3.0;
      k.box(0.2, k.W - 0.2, top + 0.12, top + 2.4, 0.3, 7, '#5f9a7a');
      k.box(0.05, k.W - 0.05, top + 2.4, top + 2.5, 0.1, 7.2, '#c9cbcb', NC);
    }
    // 泰美味：三樓頂的紅瓦斜簷與山牆、招牌上的白色雞蛋花
    {
      const k = seg(C, -1, 56, 63.8),
        top = 3.3 + 2 * 3.0;
      k.box(-0.05, k.W + 0.05, top - 0.05, top + 0.3, -0.7, 0.4, TILE, NC);
      const g = seg(C, -1, 59.8, 63.8);
      gable(C, g, top);
      // 雞蛋花貼在招牌上緣與兩端，不壓到字
      for (const [x, y] of [
        [0.35, 3.15],
        [1.1, 3.35],
        [3.6, 3.35],
        [4.3, 3.35],
        [7.45, 3.15],
      ])
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2,
            px = x + Math.cos(a) * 0.18,
            py = y + Math.sin(a) * 0.18;
          k.box(px - 0.12, px + 0.12, py - 0.12, py + 0.12, -0.34, -0.3, '#fbf8ef', NC);
        }
    }
  },
};
