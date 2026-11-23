// 日新路街屋資料：C 段 s 157.7（力行北街口）～220.6（三和三街口），兩側。格式見 src/world/buildings/StreetRixin.js 檔頭。
// 照 Google 街景建模：s 160～195 是 2026-05，s 195～221 是 2025-05／2024-08；面寬比例照街景量，再對齊遊戲裡的路口
//   （街景車的定位比遊戲路網往實踐路方向偏 3～4 m，所以用路口對齊：力行北街 s 157.7、日新路63巷 s 193.9、三和三街 s 220.6）。
// 巷口留空：力行北街（寬 6 m）兩側 s<161；日新路63巷（寬 5 m，只往左側）s 191.4～196.4；三和三街（寬 5 m，只往右側）s>218.1。
// 路很窄：立面離路中心 4.6 m，路緣 3.75 m，騎樓前只剩 0.85 m，攤車都貼著立面放（z -0.85），不壓到路面。
// 區域座標提醒：站在街上面對立面時，x 小的那一端在右手邊（左側 side -1 的格子 x=0 是 s 大的那端，右側 side +1 的格子 x=0 是 s 小的那端）。
import { all, board, blade, disc, awnExt, cart, claws } from './kit.js';

// 夜市攤位收攤後的深灰色伸縮雨棚，棚邊印「中原商圈」
const shopCircle = (x0, x1) => (k, c) => {
  const X1 = x1 <= 0 ? c.w + x1 : x1,
    w = X1 - x0,
    y = c.gf - 1.42;
  k.box(x0, X1, y - 0.02, y + 0.3, -2.02, -1.98, '#3a3c40', { col: false });
  k.plane(
    c.paint('中原商圈', '#3a3c40', '#f2f2ee', null, Math.min(w, 2.4), 0.28, 96),
    Math.min(w, 2.4),
    0.28,
    X1 - Math.min(w, 2.4) / 2 - 0.2,
    y + 0.14,
    -2.03,
    c.FRONT,
    { emissive: 0.2 }
  );
};
// 招牌左端貼一個白底圓形標（娃娃機店的 LA）
const signDot = (text, bg, fg) => (k, c) =>
  k.plane(c.roundSign(text, bg, fg), 0.72, 0.72, c.w - 0.6, c.gf - 0.44, -0.31, c.FRONT, {
    transparent: true,
    emissive: 0.35,
  });
// 一排盆花（花坊門口）
const pots = (x0, x1) => (k, c) => {
  const X1 = x1 <= 0 ? c.w + x1 : x1,
    cols = ['#d8406a', '#f2c230', '#f4f4f0', '#c86ad0', '#e8703a'];
  for (let x = x0, i = 0; x + 0.4 <= X1; x += 0.45, i++) {
    k.box(x, x + 0.36, 0, 0.3, -0.8, -0.45, '#2a2a2a', { col: false });
    k.box(x - 0.02, x + 0.38, 0.3, 0.62, -0.82, -0.43, i % 2 ? '#3f7a3a' : '#4b8a3e', {
      col: false,
    });
    k.box(x + 0.06, x + 0.3, 0.62, 0.78, -0.72, -0.52, cols[i % cols.length], { col: false });
  }
};
// 綠色波浪女兒牆（s 193.5～198 那棟：每層窗上一道薄荷綠的花邊）
const scallop = (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0.1, c.w - 0.1, y + 2.35, y + 2.75, -0.12, 0, '#8cbfa2', { col: false });
    k.box(0.1, c.w - 0.1, y + 2.75, y + 2.95, -0.14, 0, '#7a5a5a', { col: false });
  }
};
// 三層樓灰磚老樓（7-ELEVEN 那棟）樓層之間的水平飾帶
const bands = (col) => (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0, c.w, y - 0.05, y + 0.55, -0.12, 0, col, { col: false });
  }
};

const GREY3 = { nf: 3, gf: 3.4, wall: '#c9cbc6', bal: 'plain', d: 14 }; // 右側 7-ELEVEN 那排三層樓
const BEIGE5 = { nf: 5, wall: '#f0e0b8', bal: 'grille', awn: '#3e4044', d: 14 }; // 左側米色磁磚五樓公寓，夜市攤位的深灰雨棚

export default {
  ownSign: ['中原自助冰城', '惹草拈花花坊', 'Queen日系內睡衣'],
  drop: [],
  fences: [],
  lots: [
    // ---- 右側（東南側，順 s 走的右手邊）----
    // 力行北街口轉角：三層灰磚樓，一樓轉角是 7-ELEVEN，門口一台紅色攤車
    [
      'R',
      161.0,
      166.5,
      1,
      {
        ...GREY3,
        sign: ['7-ELEVEN', '#ffffff', '#00843d', null, 'seven'],
        ground: 'shop',
        door: 0,
        extra: all(
          bands('#b9bbb6'),
          blade('7-ELEVEN', '#00843d', '#ffffff', 0.4, 3.6, 5.6, { rot: true, wd: 0.6 }),
          cart(0.3, {
            z: -0.85,
            w: 1.4,
            body: '#c8402a',
            tarp: '#b8302a',
            sign: ['', '#c8402a', '#ffffff'],
          })
        ),
      },
    ],
    [
      'R',
      166.5,
      171.5,
      1,
      {
        ...GREY3,
        sign: ['', '#e6e0cc', '#333333'],
        ground: 'open',
        extra: all(bands('#b9bbb6'), claws(0.4, -0.4, '#f2c230')),
      },
    ],
    [
      'R',
      171.5,
      176.8,
      1,
      { ...GREY3, sign: ['', '#e6e0cc', '#333333'], ground: 'open', extra: bands('#b9bbb6') },
    ],
    // 娃娃機店（紅底白字招牌、右邊白圓 LA）
    [
      'R',
      176.8,
      181.4,
      1,
      {
        nf: 3,
        gf: 3.4,
        wall: '#d2d3cf',
        sign: ['娃娃機', '#d8435a', '#ffffff', '인형뽑기'],
        ground: 'open',
        bal: 'plain',
        d: 14,
        extra: all(
          signDot('LA', '#ffffff', '#d8435a'),
          board('', '#7fae8a', '#ffffff', 0.3, -0.3, 3.7, 4.5),
          claws(0.4, -0.4, '#f4f4f0')
        ),
      },
    ],
    // 選物販賣機店（黃底卡通招牌）
    [
      'R',
      181.4,
      185.9,
      1,
      {
        nf: 4,
        wall: '#d8d8d4',
        sign: ['第二代選物販賣機', '#f4d34a', '#d2342a'],
        ground: 'open',
        bal: 'plain',
        d: 14,
        extra: all(
          blade('', '#7a2a6a', '#ffffff', -0.3, 6.6, 9.8, { wd: 0.9 }),
          claws(0.4, -0.4, '#e8a0c8')
        ),
      },
    ],
    // 白磁磚四樓、淺藍窗、綠色雨棚，騎樓柱上掛黃色直招「歡樂趣」
    [
      'R',
      185.9,
      193.5,
      1,
      {
        nf: 4,
        wall: '#ecebe6',
        ground: 'shutter',
        sh: '#9a9c98',
        awn: '#3f9a5a',
        bal: 'plain',
        hood: '#9bc4d8',
        d: 14,
        extra: blade('歡樂趣', '#f2d02a', '#d2342a', 0.5, 5.6, 9.4, { wd: 0.8, out: 0.2 }),
      },
    ],
    // 每層窗上有薄荷綠花邊的四樓
    [
      'R',
      193.5,
      198.2,
      1,
      {
        nf: 4,
        wall: '#efeeea',
        ground: 'shop',
        awn: '#3f9a5a',
        bal: 'grille',
        d: 14,
        extra: scallop,
      },
    ],
    // 惹草拈花花坊：灰磚四樓，門口擺滿盆花
    [
      'R',
      198.2,
      205.2,
      1,
      {
        nf: 4,
        wall: '#c8cac6',
        sign: ['惹草拈花 花坊', '#f0d040', '#9a2a22', 'FLOWER AND STRAW FLOWER'],
        ground: 'open',
        awn: '#3f9a5a',
        bal: 'plain',
        d: 14,
        extra: pots(0.3, -0.3),
      },
    ],
    // 深海鮭魚頭（深藍圓招）
    [
      'R',
      205.2,
      210.5,
      1,
      {
        nf: 4,
        wall: '#e9e8e3',
        ground: 'shop',
        bal: 'grille',
        noband: true,
        d: 14,
        extra: disc('深海', '#253a82', '#ffffff', -0.4, 4.2, { size: 1.2, out: 0.9 }),
      },
    ],
    // 三和三街口：全家便利商店（灰磚四樓）
    [
      'R',
      210.5,
      218.0,
      1,
      {
        nf: 4,
        wall: '#c3c5c0',
        sign: ['FamilyMart 全家', '#ffffff', '#0a7cc0', null, 'fam'],
        ground: 'shop',
        bal: 'plain',
        door: 0,
        d: 14,
        extra: blade('FamilyMart', '#2fb34a', '#ffffff', -0.4, 5.0, 7.0, {
          rot: true,
          wd: 0.8,
          out: 0.6,
        }),
      },
    ],

    // ---- 左側（西北側，順 s 走的左手邊）----
    // 力行北街口轉角：米色四樓加頂樓鐵皮，一樓收攤的夜市攤位
    [
      'R',
      161.0,
      167.0,
      -1,
      {
        ...BEIGE5,
        nf: 4,
        ground: 'shutter',
        sh: '#5a5e62',
        roof: 'shack',
        extra: shopCircle(0.3, -0.3),
      },
    ],
    [
      'R',
      167.0,
      175.0,
      -1,
      {
        ...BEIGE5,
        ground: 'shutter',
        sh: '#5a5e62',
        extra: all(shopCircle(0.3, -0.3), awnExt('#3e4044', -2.0, 0.2)),
      },
    ],
    // 麵在中原（二樓黑底招牌），中間一條穿進去的通道；騎樓前阿順伯紅茶冰的攤車
    [
      'R',
      175.0,
      183.0,
      -1,
      {
        ...BEIGE5,
        ground: 'open',
        extra: all(
          board('麵在中原', '#1a1a1a', '#ffffff', 3.0, 5.8, 3.6, 4.8),
          shopCircle(0.3, -0.3),
          awnExt('#3e4044', -2.0, 0.2),
          cart(0.2, { z: -0.85, w: 1.5, sign: ['阿順伯 紅茶冰', '#d8342a', '#ffffff'] })
        ),
      },
    ],
    // Jestrab 杰蘇翠手機配件，樓上挑出藍色 P 機車停車場與「來都來了」直招
    [
      'R',
      183.0,
      191.2,
      -1,
      {
        ...BEIGE5,
        wall: '#ead8ae',
        sign: ['Jestrab 杰蘇翠  各大廠牌手機配件／維修／包膜', '#e8eef8', '#1f3f9a'],
        ground: 'shop',
        awn: '#3e4044',
        extra: all(
          blade('P', '#1f4fb0', '#ffffff', 0.5, 6.4, 8.6, { wd: 1.2, flat: true }),
          blade('來都來了', '#1a1a1a', '#e03a2a', 0.5, 4.0, 6.2, { wd: 0.7 })
        ),
      },
    ],
    // 日新路63巷口 s 191.4～196.4 留空
    // 中原自助冰城：藍色大招牌、黃色雨棚，門口清粥小菜的攤車
    [
      'R',
      196.6,
      202.5,
      -1,
      {
        ...BEIGE5,
        sign: ['中原自助冰城', '#3a4fa8', '#ffffff'],
        ground: 'open',
        awn: '#e8c040',
        extra: cart(0.3, { z: -0.85, w: 1.4, sign: ['清粥小菜', '#d8342a', '#ffffff'] }),
      },
    ],
    // 勇伯油飯：開放式不鏽鋼料理台，綠色雨棚
    [
      'R',
      202.5,
      208.0,
      -1,
      {
        ...BEIGE5,
        wall: '#ecdcb6',
        ground: 'open',
        awn: '#3f9a5a',
        noband: true,
        extra: blade('油飯', '#f2e6c8', '#c8302a', -0.6, 1.0, 2.4, { wd: 0.5, out: 0.1 }),
      },
    ],
    // Queen 日系內睡衣：白色五樓，二樓挑出粉紅招牌
    [
      'R',
      208.0,
      214.5,
      -1,
      {
        ...BEIGE5,
        wall: '#eeeeea',
        ground: 'shutter',
        sh: '#9a9c98',
        awn: ['#3f9a5a', '#f4f4f0'],
        extra: blade('QUEEN\n日系內衣', '#f6dde2', '#c0303a', 0.5, 4.0, 6.0, {
          wd: 1.6,
          flat: true,
        }),
      },
    ],
    // cont. 大陸眼鏡（綠色大招牌）
    [
      'R',
      214.5,
      220.6,
      -1,
      {
        ...BEIGE5,
        wall: '#f0f0ec',
        sign: ['cont. 大陸眼鏡', '#2f9a4a', '#ffffff'],
        ground: 'shop',
        awn: '#e8e8e4',
      },
    ],
  ],
};
