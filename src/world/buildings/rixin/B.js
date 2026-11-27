// 日新路街屋資料：B 段 s 81.5（協同街口）～157.7（力行北街口），兩側。格式見 src/world/buildings/StreetRixin.js 檔頭。
// 照 Google 街景建模：日新路上是 2024-08 的街景車，協同街口兩個轉角另外參考 2025-05／06 的使用者全景。
// 面寬比例照街景量，再對齊遊戲裡的路口（街景車在這段的定位比遊戲路網往中山東路方向偏、而且整段被壓短，
//   力行北街口差約 7 m，所以不照街景座標硬放，而是用兩個路口當錨點：協同街 s 81.5、力行北街 s 157.7）。
// 巷口留空：協同街（寬 6 m，往右側時路斜向 s 增加的方向，深處到 s≈86.8）右側 s<87、左側 s<84.6；
//   力行北街（寬 6 m）右側 s>154.5、左側 s>153.3（左側最後一棟是圓角轉角樓，圓角半徑 1.7 m 才不吃進力行北街）。
// 路在 s 97.8（左轉）、118.9、143.8（右轉）有轉折：格子在轉折點分開，外角那一側前一格多做 0.4～0.5 m 蓋住立面的縫。
// 立面離路中心 4.6 m（預設）；右側後面 22 m 以外有通用填充樓，這段格子最深 12 m，不用 drop。
// 區域座標提醒：站在街上面對立面時，x 小的那一端在右手邊（左側 side -1 的格子 x=0 是 s 大的那端，右側 side +1 的格子 x=0 是 s 小的那端）。
import { HP, all, tex, board, blade, disc, corner, darkGlass } from './kit.js';

const BRICK = '#b98a72'; // 中華電信、好聲音那棟五樓轉角大樓的紅褐色磁磚
// 側牆（巷子那一面）上的一塊看板：x 側牆位置、dir -1 朝 -x、+1 朝 +x，z0～z1 沿側牆，y0～y1 高度
const sideBoard = (t, x, dir, z0, z1, y0, y1) => (k, c) =>
  k.plane(t(c), z1 - z0, y1 - y0, x + dir * 0.06, (y0 + y1) / 2, (z0 + z1) / 2, dir * HP, {
    emissive: 0.3,
  });
// 韓辛：黃底大看板，一碗紅色拉麵、白字 24H
const ramenTex = (c) =>
  tex(c, 'rxB_ramen', 4.2, 3.2, (g, W, H) => {
    g.fillStyle = '#f2b630';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    g.font = c.font(H * 0.2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('24H', W / 2, H * 0.14);
    g.fillStyle = '#c8302a';
    g.beginPath();
    g.ellipse(W / 2, H * 0.5, W * 0.3, H * 0.1, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(W / 2, H * 0.5, W * 0.3, 0, Math.PI);
    g.fill();
    g.fillStyle = '#f6d890';
    g.beginPath();
    g.ellipse(W / 2, H * 0.5, W * 0.26, H * 0.07, 0, 0, 7);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(W * 0.15, H * 0.8, W * 0.7, H * 0.13);
    g.fillStyle = '#c8302a';
    g.font = c.font(H * 0.09);
    g.fillText('KOREAN STYLE', W / 2, H * 0.865);
  });
// 林永方：二樓以上鐵架撐著的大型直立看板，白底上一籠湯包、紅字店名
const dumplingTex = (c) =>
  tex(c, 'rxB_dumpling', 2.0, 6.4, (g, W, H) => {
    g.fillStyle = '#f6f4ee';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#c0281f';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = c.font(W * 0.5);
    ['林', '永', '方'].forEach((t, i) => g.fillText(t, W / 2, H * (0.1 + i * 0.1)));
    g.fillStyle = '#8a6a3a';
    g.beginPath();
    g.ellipse(W / 2, H * 0.62, W * 0.42, H * 0.12, 0, 0, 7);
    g.fill();
    g.fillStyle = '#f2ece0';
    for (const [x, y] of [
      [0.3, 0.57],
      [0.55, 0.55],
      [0.75, 0.6],
      [0.4, 0.66],
      [0.62, 0.68],
    ]) {
      g.beginPath();
      g.arc(W * x, H * y, W * 0.13, 0, 7);
      g.fill();
    }
    g.fillStyle = '#2a2a2a';
    g.font = c.font(W * 0.16, 700);
    g.fillText('手工湯包', W / 2, H * 0.84);
    g.fillText('大腸麵線', W / 2, H * 0.91);
  });
// TWOTWO：招牌上方一排黑框照片
const framesTex = (c) =>
  tex(c, 'rxB_frames', 4.4, 1.3, (g, W, H) => {
    g.fillStyle = '#e4e4e0';
    g.fillRect(0, 0, W, H);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = W * (0.04 + i * 0.19),
        w = W * 0.15;
      g.fillStyle = '#1e1e1e';
      g.fillRect(x, H * 0.12, w, H * 0.76);
      g.fillStyle = ['#6a6a6a', '#9a9a9a', '#4a4a4a', '#8a8a8a', '#5a5a5a'][i];
      g.fillRect(x + w * 0.1, H * 0.2, w * 0.8, H * 0.6);
    }
  });
// 紅白條紋帆布蓋著的貨架（N.S Shopping 門口）
const stripeTex = (c) =>
  tex(c, 'rxB_stripe', 1.4, 1.8, (g, W, H) => {
    g.fillStyle = '#f4f0ee';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#d8342c';
    for (let x = 0; x < W; x += W / 7) g.fillRect(x, 0, W / 14, H);
  });
const covered = (x) => (k, c) => {
  k.box(x, x + 1.4, 0, 1.8, -1.35, -0.45, '#d8a8a4'); // 帆布蓋著的貨架，擋人
  k.plane(stripeTex(c), 1.4, 1.8, x + 0.7, 0.9, -1.36, c.FRONT);
};
// 理髮店的旋轉燈柱（紅白藍）
const barber = (x) => (k, c) => {
  for (const [y0, col] of [
    [2.0, '#d8342c'],
    [2.3, '#f4f4f0'],
    [2.6, '#2a5fb0'],
    [2.9, '#f4f4f0'],
  ])
    k.cyl(x, -0.35, 0.12, y0, y0 + 0.3, col, { seg: 8 });
};
// 一樓前面的落地立牌
const standee = (t, bg, fg, x) => (k, c) => {
  k.box(x, x + 0.6, 0, 1.5, -1.4, -1.3, bg, { col: false });
  k.plane(
    c.paint([...t].join('\n'), bg, fg, null, 0.55, 1.35, 96),
    0.55,
    1.35,
    x + 0.3,
    0.8,
    -1.41,
    c.FRONT,
    { emissive: 0.3 }
  );
};

export default {
  ownSign: [
    '韓辛24H無人拉麵',
    '便宜go即期品專賣',
    '好樣的包膜爆多配件',
    '一沐日',
    '林永方手工湯包麵線',
    '中原第一家麻辣豆腐鴨血煲',
    'Two Two 日新服飾',
    '雞排一生',
    '太子包膜',
    '孫東寶台式牛排',
    '一品香便當',
    '不二加美瞳隱眼專賣',
  ],
  drop: [],
  fences: [],
  lots: [
    // ---- 右側（+1，東南側）：協同街轉角 → 力行北街轉角 ----
    // 韓辛 24H 無人拉麵：協同街轉角的九樓灰色大樓，一樓白色圓弧招牌，協同街那面掛黃色拉麵大看板
    [
      'R',
      87,
      93.5,
      1,
      {
        nf: 9,
        gf: 3.6,
        wall: '#b8b6b0',
        sign: ['韓辛  24H 無人拉麵', '#f4f4f2', '#2a2a2a', 'KOREAN STYLE  라면 편의점'],
        ground: 'shop',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 9,
        extra: all(
          sideBoard(ramenTex, 0, -1, 0.6, 4.8, 3.9, 7.1),
          (k, c) => {
            k.box(-0.3, 0, c.gf - 0.85, c.gf - 0.03, 0, 4.5, '#f4f4f2', { col: false });
            k.plane(
              c.paint('韓辛 24H 無人拉麵', '#f4f4f2', '#2a2a2a', null, 4.4, 0.8, 96),
              4.4,
              0.8,
              -0.31,
              c.gf - 0.44,
              2.25,
              -HP,
              { emissive: 0.35 }
            );
          },
          disc('韓辛', '#ffffff', '#c0281f', 0.4, 4.6, { size: 0.9, out: 0.75 })
        ),
      },
    ],
    // 鶴茶樓：五樓白磁磚大窗，一、二樓整片橄欖綠招牌牆
    //   路在 s 97.8 往左轉，右側是外角：前半格多做 0.5 m 蓋住轉角的縫
    [
      'R',
      93.5,
      98.3,
      1,
      {
        nf: 5,
        wall: '#ebe8e1',
        noband: true,
        ground: 'shutter',
        sh: '#d4d4cf',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          board('鶴茶樓', '#6c7a4e', '#efe6c8', 0.05, -0.05, 2.35, 4.4, { z: -0.3, ppm: 96 }),
          board('', '#d8c27a', '#4a3a20', 1.0, -0.2, 1.85, 2.3, { z: -0.36 }),
          blade('', '#5a6470', '#ffffff', 0.4, 7.0, 8.4, { wd: 1.6, out: 0.4 })
        ),
      },
    ],
    [
      'R',
      97.8,
      100.5,
      1,
      {
        nf: 5,
        wall: '#ebe8e1',
        noband: true,
        ground: 'shutter',
        sh: '#d4d4cf',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          board('', '#6c7a4e', '#efe6c8', 0.05, -0.05, 2.35, 4.4, { z: -0.3 }),
          board('', '#7c8a5c', '#efe6c8', 0.6, 1.9, 2.8, 4.0, { z: -0.33 }),
          board('', '#d8c27a', '#4a3a20', 0.1, 1.2, 1.85, 2.3, { z: -0.36 })
        ),
      },
    ],
    // 便宜GO 即期品專賣：五樓白磁磚開放陽台，紅色大招牌、橘白條紋雨棚
    [
      'R',
      100.5,
      105.9,
      1,
      {
        nf: 5,
        wall: '#ecebe6',
        sign: ['便宜GO', '#e0342c', '#ffffff', '即期品專賣'],
        awn: ['#f08a2a', '#f6f2ea'],
        ground: 'shutter',
        sh: '#b9b9b4',
        bal: 'open',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(board('EAGLE', '#f2c530', '#c0281f', -1.2, -0.1, 2.5, 3.25, { z: -0.31 })),
      },
    ],
    // 好樣的包膜：一樓黑底白立體字招牌、紅色直招，二三樓挑出一塊黑底黃字大側招
    [
      'R',
      105.9,
      111.8,
      1,
      {
        nf: 5,
        wall: '#dad8d2',
        sign: ['好樣的包膜', '#2a2a2a', '#f2f2f2'],
        ground: 'shutter',
        sh: '#b0b0ac',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          blade('好樣的包膜', '#d8342c', '#ffffff', -0.35, 0.3, 2.6, { wd: 0.5, out: 0.05 }),
          blade(
            '3C 車用螢幕保護貼\n汽機車手機支架\n爆多手機配件',
            '#232323',
            '#f2d230',
            0.5,
            4.0,
            7.0,
            { wd: 1.8, out: 0.3, flat: true }
          )
        ),
      },
    ],
    // 一沐日：四樓米色磁磚鐵窗，一樓上方墨綠色大招牌
    [
      'R',
      111.8,
      118.9,
      1,
      {
        nf: 4,
        wall: '#e3dccb',
        sign: ['一沐日', '#5c7448', '#ffffff', 'A nice holiday'],
        ground: 'shutter',
        sh: '#cacac4',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          board('', '#5c7448', '#ffffff', 0.05, -0.05, 3.3, 4.1, { z: -0.3 }),
          disc('一沐日', '#f2f0e6', '#4a6a3a', -0.5, 2.9, { size: 0.8, out: 0.2 })
        ),
      },
    ],
    // 林永方手工湯包麵線：五樓白磁磚鐵窗，深灰招牌白字，二樓以上鐵架撐著一塊大湯包看板
    [
      'R',
      118.9,
      124.6,
      1,
      {
        nf: 5,
        wall: '#edece7',
        sign: ['林永方', '#3a3a3c', '#f2f2f2', 'LIN YONG FANG  手工湯包・麵線'],
        ground: 'open',
        bal: 'cage',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          (k, c) => {
            const y0 = 6.2,
              h = 6.4,
              x = c.w - 0.6;
            k.box(x - 0.06, x + 0.06, y0, y0 + h, -2.3, -0.3, '#4a4d50', { col: false });
            for (const sd of [-1, 1])
              k.plane(dumplingTex(c), 2.0, h, x + sd * 0.07, y0 + h / 2, -1.3, sd * HP, {
                emissive: 0.3,
              });
            for (const y of [y0 + 0.4, y0 + h - 0.4])
              k.box(x - 0.04, x + 0.04, y, y + 0.08, -0.3, 0, '#4a4d50', { col: false });
          },
          (k, c) => {
            k.box(1.6, 2.4, 0, 1.6, -1.1, -1.0, '#2a2a2a', { col: false });
            k.plane(
              c.paint('林永方\n手工湯包\n大腸麵線', '#f6f4ee', '#2a2a2a', null, 0.75, 1.4, 96),
              0.75,
              1.4,
              2.0,
              0.85,
              -1.11,
              c.FRONT,
              { emissive: 0.2 }
            );
          }
        ),
      },
    ],
    // 中原第一家麻辣豆腐鴨血煲：紅招牌、紅白條紋雨棚、紅色直招與六角形側招
    [
      'R',
      124.6,
      131.8,
      1,
      {
        nf: 5,
        wall: '#e9e7e1',
        sign: ['中原第一家', '#d8342c', '#ffffff', '麻辣豆腐．鴨血煲  中原總店'],
        awn: ['#d8342c', '#f6f2ea'],
        ground: 'shutter',
        sh: '#b44a3a',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          blade('麻辣豆腐鴨血煲', '#d8342c', '#ffffff', 0.4, 0.3, 2.5, { wd: 0.45, out: 0.05 }),
          blade('鴨血煲', '#d8342c', '#ffffff', -0.4, 4.2, 6.6, { wd: 0.8, out: 0.3 }),
          disc('麻辣', '#d8342c', '#ffffff', 2.4, 4.8, { size: 0.9, out: 0.75 })
        ),
      },
    ],
    // TWOTWO Fashion Studio：黑底白字招牌，上方一排相框，灰白條紋雨棚
    [
      'R',
      131.8,
      136.7,
      1,
      {
        nf: 5,
        wall: '#e7e5df',
        sign: ['TWOTWO', '#262626', '#ffffff', 'Fashion Studio'],
        awn: ['#8a8a86', '#f2f2ee'],
        ground: 'shutter',
        sh: '#a0a09c',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all((k, c) => {
          k.box(0.2, c.w - 0.2, c.gf, c.gf + 1.4, -0.24, 0, '#e4e4e0', { col: false });
          k.plane(framesTex(c), c.w - 0.4, 1.3, c.w / 2, c.gf + 0.7, -0.25, c.FRONT, {
            emissive: 0.15,
          });
        }),
      },
    ],
    // 雞排一生：白底紅字大招牌、紅色布條，白色直招
    [
      'R',
      136.7,
      143.8,
      1,
      {
        nf: 5,
        wall: '#eae8e2',
        sign: ['雞排一生', '#ffffff', '#c0281f', 'CHICKEN LIFETIME  鹹酥雞・串物・雞排・啤酒'],
        banner: ['貢丸串 鹽酥雞', '#d8342c', '#ffffff'],
        ground: 'shutter',
        sh: '#a8a8a4',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(blade('雞排一生', '#ffffff', '#c0281f', -0.4, 4.0, 7.2, { wd: 0.8, out: 0.3 })),
      },
    ],
    // 太子包膜：深灰招牌（娃娃頭像）、綠色雨棚，五樓白磁磚鐵窗
    [
      'R',
      143.8,
      148.4,
      1,
      {
        nf: 5,
        wall: '#eeede8',
        sign: ['太子包膜', '#2e2e30', '#ffffff', '專業包膜・精準保護貼  中原店'],
        awn: '#3f9a5a',
        ground: 'shutter',
        sh: '#9a9a96',
        bal: 'cage',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(disc('太子', '#f2f0ea', '#c0281f', 0.6, 2.9, { size: 0.8, out: 0.2 })),
      },
    ],
    // G.P（GOOD YEAR、pierre cardin）：力行北街轉角，白底藍字招牌、綠雨棚、白色直招「地平線鞋坊」
    [
      'R',
      148.4,
      154.5,
      1,
      {
        nf: 5,
        wall: '#e8e6e0',
        sign: ['G.P', '#f6f6f4', '#2a4fa0', 'GOOD YEAR ・ pierre cardin'],
        awn: '#3f9a5a',
        ground: 'shop',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          blade('地平線鞋坊', '#ffffff', '#2a2a2a', -0.3, 3.6, 7.4, { wd: 0.8, out: 0.3 })
        ),
      },
    ],

    // ---- 左側（-1，西北側）：協同街轉角 → 力行北街轉角 ----
    // 孫東寶台式牛排：協同街轉角七樓紅磚色大樓，二樓整片玻璃，紅色雨棚包過轉角、掛一塊大紅側招
    [
      'R',
      84.6,
      93.2,
      -1,
      {
        nf: 7,
        gf: 3.4,
        wall: '#8e5444',
        sign: ['孫東寶', '#c8202a', '#ffffff', '台式牛排教父'],
        awn: '#c8202a',
        ground: 'shutter',
        sh: '#2c2c2c',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          darkGlass('#4a6a78', 2, 2),
          (k, c) => {
            k.box(c.w - 0.05, c.w + 1.25, c.gf - 1.05, c.gf - 0.97, 0, 7, '#c8202a', {
              col: false,
            });
            k.box(c.w, c.w + 0.28, c.gf - 0.85, c.gf - 0.03, 0, 6, '#c8202a', { col: false });
            k.plane(
              c.paint('孫東寶 台式牛排', '#c8202a', '#ffffff', null, 5.8, 0.8, 96),
              5.8,
              0.8,
              c.w + 0.29,
              c.gf - 0.44,
              3.0,
              HP,
              { emissive: 0.35 }
            );
          },
          blade('孫東寶\n台式牛排教父', '#c8202a', '#ffffff', 0.8, 4.0, 6.4, {
            wd: 2.4,
            out: 0.4,
            flat: true,
          })
        ),
      },
    ],
    // N.S Shopping：七樓白磁磚公寓，黑底金字招牌與直招、紅白條紋雨棚，門口兩座條紋帆布蓋著的貨架
    [
      'R',
      93.2,
      97.8,
      -1,
      {
        nf: 7,
        wall: '#efede7',
        sign: ['N.S Shopping', '#1e1e1e', '#e2bc5a'],
        awn: ['#d8342c', '#f6f2ea'],
        ground: 'shutter',
        sh: '#8a8a86',
        bal: 'open',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          blade('N.S', '#1e1e1e', '#e2bc5a', -0.6, 4.2, 6.4, { wd: 1.0, out: 0.3 }),
          covered(0.6),
          covered(2.4)
        ),
      },
    ],
    [
      'R',
      97.8,
      103.4,
      -1,
      {
        nf: 7,
        wall: '#efede7',
        noband: true,
        ground: 'gate',
        sh: '#6a6a66',
        bal: 'open',
        roof: 'shack',
        door: 0,
        d: 12,
      },
    ],
    // 新學城眼鏡：五樓米色磁磚開放陽台，咖啡色招牌金字
    [
      'R',
      103.4,
      109.3,
      -1,
      {
        nf: 5,
        wall: '#e3d9c5',
        sign: ['新學城 眼鏡', '#3a2e26', '#e0c070', '03-4376013'],
        ground: 'shutter',
        sh: '#34404c',
        bal: 'open',
        roof: 'flat',
        door: 0,
        d: 12,
      },
    ],
    // 一品香飲食店：五樓灰白磁磚，黃底藍字招牌、灰藍雨棚，一樓開放的便當店
    [
      'R',
      109.3,
      114.6,
      -1,
      {
        nf: 5,
        wall: '#e4e3de',
        sign: ['一品香飲食店', '#f2c530', '#1f3f9a', '訂購專線 438-7346'],
        awn: '#6a7684',
        ground: 'open',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
      },
    ],
    // 文山素食：五樓米灰色鐵窗，米黃色直招（路在 s 118.9 往右轉，左側是外角：這格多做 0.4 m 蓋住轉角的縫）
    [
      'R',
      114.6,
      119.3,
      -1,
      {
        nf: 5,
        wall: '#ddd7c9',
        noband: true,
        ground: 'open',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(blade('文山素食', '#f2e6b0', '#4a3a20', 0.3, 3.6, 7.0, { wd: 0.8, out: 0.3 })),
      },
    ],
    // 隔壁一樓攤架蓋著灰藍帆布，門口紅色「鹽烤魚」立牌（沒有店招）
    [
      'R',
      118.9,
      123.3,
      -1,
      {
        nf: 5,
        wall: '#d6d2c8',
        noband: true,
        ground: 'open',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          (k, c) => {
            k.box(0.3, 2.4, 0, 1.6, -1.0, -0.1, '#7f98ad'); // 帆布蓋著的攤架，擋人
            k.box(2.6, 3.9, 0, 1.2, -0.9, -0.1, '#5c4a44');
          },
          standee('鹽烤魚', '#d8342c', '#ffffff', 3.3)
        ),
      },
    ],
    // 男女髮廊：粉紅磚色窄樓，紅白條紋雨棚，二樓紅色招牌加理髮燈柱
    [
      'R',
      123.3,
      128.1,
      -1,
      {
        nf: 5,
        wall: '#c99c8c',
        noband: true,
        awn: ['#d8342c', '#f6f2ea'],
        ground: 'open',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          board('男女髮廊', '#d8342c', '#ffffff', 0.3, 3.2, 3.5, 4.6, { z: -0.2 }),
          barber(3.5)
        ),
      },
    ],
    // 犇響咖啡冰飲：五樓紅褐磁磚，淡紫色招牌深藍字
    [
      'R',
      128.1,
      133.1,
      -1,
      {
        nf: 5,
        wall: '#b98a72',
        sign: ['犇響咖啡冰飲', '#c4c8ea', '#2a2f6a', 'ENJOY COFFEE DRINK'],
        awn: '#55524e',
        ground: 'shutter',
        sh: '#9a9a96',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
      },
    ],
    // 公益彩券（台灣彩券）：黃招牌、黃色雨棚
    [
      'R',
      133.1,
      138.0,
      -1,
      {
        nf: 5,
        wall: BRICK,
        sign: ['公益彩券', '#f2c530', '#c0281f', '台灣彩券'],
        awn: '#f2c530',
        ground: 'shutter',
        sh: '#9a9a96',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
      },
    ],
    // 中華電信：白底藍綠條紋招牌，藍色直招（路在 s 143.8 往右轉，這格多做 0.4 m 蓋住外角的縫）
    [
      'R',
      138.0,
      144.2,
      -1,
      {
        nf: 5,
        wall: BRICK,
        sign: ['中華電信', '#ffffff', '#1f4fa0', 'Chunghwa Telecom'],
        ground: 'shutter',
        sh: '#b9b9b4',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          board('', '#3aa0d8', '#ffffff', 0.05, -0.05, 2.38, 2.46, { z: -0.3 }),
          blade('中華電信', '#2a6fc0', '#ffffff', -0.4, 4.0, 8.0, { wd: 0.8, out: 0.3 })
        ),
      },
    ],
    // 不二加（美瞳專賣）、好聲音通訊：同一棟紅褐磁磚大樓
    [
      'R',
      143.8,
      146.6,
      -1,
      {
        nf: 5,
        wall: BRICK,
        sign: ['不二加', '#1e1e1e', '#ffffff', 'MY COLOR 美瞳專賣'],
        awn: '#d8d0ac',
        ground: 'shutter',
        sh: '#9a9a96',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
      },
    ],
    [
      'R',
      146.6,
      149.4,
      -1,
      {
        nf: 5,
        wall: BRICK,
        sign: ['好聲音', '#1e1e1e', '#ffffff', '通訊'],
        awn: '#d8d0ac',
        ground: 'shop',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: disc('好聲音', '#ffffff', '#c0281f', 0.4, 5.6, { size: 1.0, out: 0.85 }),
      },
    ],
    // 力行北街轉角：大樓的圓角，一樓白底綠橘紅條紋招牌（字看不清，不寫字）
    [
      'R',
      149.4,
      151.6,
      -1,
      {
        nf: 5,
        wall: BRICK,
        sign: ['', '#ffffff', '#2a2a2a', null, 'seven'],
        ground: 'shutter',
        sh: '#a8a8a4',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 8,
        extra: corner(-1, 1.7, BRICK, [[2.45, 3.25, '#f4f4f0']]),
      },
    ],
  ],
};
