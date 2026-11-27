import { shrinkFont } from '../../../graphics/FitText.js';
// 實踐路街屋資料：N 段 s 0～110（中北路口往北，z 130→20），兩側。格式見 src/world/buildings/StreetShijian.js 檔頭。
// 照 Google 街景 2026-05 與國土測繪 2024 正射建模。s 0～約 14（西）／24（東）是中北路街屋的路口樓，這裡不重做。
// 實景：東側南半是一整棟 5F 紫褐磁磚公寓，北半是 9F 米色「柏德公園」大樓；西側南半是 5～6F 老公寓，北半是 10F 米色柏德大樓；
// 兩棟柏德大樓都貼著街，1～2F 是洗石子基座、2F 深色玻璃拱窗，一樓是一排小店。
// 留空的地方：東 s 23.9～25.7 防火巷、東 s 49.9～64.5 空地車道口、西 s 17.7～20.7 穿堂（遊戲步道）、西 s 58.5～68 柏德廣場入口。

const PI = Math.PI;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);
// 自己畫的貼圖：wm × hm 公尺，draw(g, W, H)
const tex = (c, key, wm, hm, draw, ppm = 128) => {
  const W = r16(wm * ppm),
    H = r16(hm * ppm);
  return c.sg(`sjN1_${key}`, W, H, (g) => draw(g, W, H));
};
// 一串字 [字, 顏色, 中心 x 比例, 中心 y 比例, 字高比例, 最寬比例]，太寬自動縮
const words = (c, g, W, H, items) => {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const [t, col, fx, fy, fp, mw = 0.9] of items) {
    shrinkFont(g, t, W * mw, H * fp, 8, (sz) => c.font(sz));
    g.fillStyle = col;
    g.fillText(t, W * fx, H * fy);
  }
};
const sign = (c, key, wm, hm, bg, items, deco) =>
  tex(c, key, wm, hm, (g, W, H) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    if (deco) deco(g, W, H);
    words(c, g, W, H, items);
  });
// 貼在立面上的橫招（中心 x、y；out 是凸出牆面多少）
const board = (k, t, w, h, x, y, bg, out = 0.3) => {
  k.box(x - w / 2 - 0.03, x + w / 2 + 0.03, y - h / 2 - 0.03, y + h / 2 + 0.03, -out, 0, bg, {
    col: false,
  });
  k.plane(t, w, h, x, y, -out - 0.01, PI, { emissive: 0.35 });
};
// 垂直街道的側招（兩面都有字）
const blade = (k, t, w, h, x, y, edge = '#2a2a2c', gap = 0.2) => {
  k.box(x - 0.04, x + 0.04, y - h / 2, y + h / 2, -gap - w, -gap, edge, { col: false });
  for (const sd of [-1, 1])
    k.plane(t, w, h, x + sd * 0.05, y, -gap - w / 2, (sd * PI) / 2, { emissive: 0.3 });
};
// 直排字的側招（ROWT.vert 一個字 0.6 m）
const vblade = (k, c, text, bg, fg, x, y0) => {
  const len = 0.6 * [...text].length + 0.2;
  blade(k, c.ROWT.vert(`sjN1${text}${bg}`, bg, fg, text), 0.6, len, x, y0 + len / 2, bg);
};

// 深色門面（蓋掉通用的亮貨架店面）：o.frame 框色、o.n 幾格、o.base 下半實板顏色、o.x1 門面右緣（留給側門）、o.deco(g, W, H) 自己加畫
const front = (k, c, key, o = {}) => {
  const x0 = 0.15,
    x1 = (o.x1 ?? c.w) - 0.15,
    gh = c.gf - 1.0,
    wm = x1 - x0;
  k.plane(
    tex(
      c,
      `fr${key}`,
      wm,
      gh,
      (g, W, H) => {
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, o.top || '#5a4c40');
        gr.addColorStop(1, o.bot || '#2a2420');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,226,170,.75)';
        for (let x = W * 0.12; x < W; x += W * 0.25) g.fillRect(x, H * 0.1, W * 0.07, H * 0.025); // 店裡的暖色燈
        if (o.base) {
          g.fillStyle = o.base;
          g.fillRect(0, H * 0.68, W, H * 0.32);
        }
        if (o.deco) o.deco(g, W, H);
        const n = o.n || 3,
          f = Math.max(3, W * 0.012);
        g.fillStyle = o.frame || '#141414';
        g.fillRect(0, 0, W, f * 1.6);
        g.fillRect(0, H - f, W, f);
        for (let j = 0; j <= n; j++) g.fillRect(Math.min(W - f, (j * W) / n - f / 2), 0, f, H);
        g.fillRect(0, H * 0.22, W, f * 0.8);
      },
      64
    ),
    wm,
    gh,
    (x0 + x1) / 2,
    gh / 2,
    -0.09,
    PI,
    { emissive: 0.4 }
  );
};
// 浮世繪浪花圖（黑宅拉麵、松川烤肉飯的門面貼圖）：x、w 是占門面寬度的比例
const wave = (x, w) => (g, W, H) => {
  g.fillStyle = '#22405f';
  g.fillRect(W * x, H * 0.5, W * w, H * 0.5);
  g.fillStyle = '#e8ecee';
  for (let j = 0; j < 4; j++) {
    g.beginPath();
    g.arc(W * (x + w * (0.15 + j * 0.24)), H * 0.98, H * (0.2 + (j % 2) * 0.12), PI, 0);
    g.fill();
  }
  g.fillStyle = '#22405f';
  for (let j = 0; j < 4; j++) {
    g.beginPath();
    g.arc(W * (x + w * (0.15 + j * 0.24)), H, H * (0.12 + (j % 2) * 0.1), PI, 0);
    g.fill();
  }
};
// 蓋住整條人行道的帆布斜雨棚（西側南半）：從牆面往外分段降低
const canopy = (k, x0, x1, y, col, depth = 3.0) => {
  for (let j = 0; j < 4; j++)
    k.box(
      x0,
      x1,
      y - j * 0.05,
      y - j * 0.05 + 0.05,
      (-(j + 1) * depth) / 4,
      (-j * depth) / 4 + 0.02,
      col,
      { col: false }
    );
  k.box(x0, x1, y - 0.33, y - 0.15, -depth - 0.02, -depth + 0.02, col, { col: false });
};

// ---- 東側南半：5F 紫褐小口磚公寓（s 25.7～49.9 六格同一棟）----
const APT = (o) => ({ nf: 5, gf: 3.4, wall: '#8a6c68', bal: 'plain', roof: 'flat', d: 12, ...o });

// ---- 柏德大樓（東 9F「柏德公園」、西 10F）：1～2F 洗石子、2F 深色玻璃拱窗／方窗、3F 樓板一圈簷線 ----
const STONE = '#b8a590';
const bdWin = (c, arch) =>
  tex(
    c,
    `bdw${arch ? 'A' : 'S'}`,
    2.4,
    2.0,
    (g, W, H) => {
      g.fillStyle = STONE;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#2f4a46';
      if (arch) {
        g.beginPath();
        g.moveTo(W * 0.1, H);
        g.lineTo(W * 0.1, H * 0.48);
        g.arc(W / 2, H * 0.48, W * 0.4, PI, 0);
        g.lineTo(W * 0.9, H);
        g.closePath();
        g.fill();
      } else g.fillRect(W * 0.06, H * 0.12, W * 0.88, H * 0.88);
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(W * 0.14, H * 0.3, W * 0.2, H * 0.6);
      g.fillStyle = '#e4e2da';
      g.fillRect(W * 0.49, arch ? H * 0.08 : H * 0.12, W * 0.02, H);
      g.fillRect(W * 0.06, H * 0.5, W * 0.88, H * 0.02);
    },
    64
  );
// o.arch 2F 拱窗、o.planter 人行道上的石砌花台（東側才有）、o.x 這一格自己的構件
const baide =
  (o = {}) =>
  (k, c) => {
    const { w, gf, fh } = c;
    for (const x of [0, w - 0.35]) k.box(x, x + 0.35, 0, gf, -0.14, 0, STONE, { col: false }); // 一樓洗石子柱
    k.box(-0.01, w + 0.01, gf, gf + fh, -0.1, 0, STONE, { col: false }); // 2F 洗石子牆
    k.box(-0.05, w + 0.05, gf + fh - 0.1, gf + fh + 0.18, -0.5, 0, '#b9ad92', { col: false }); // 3F 樓板簷線
    if (w > 1.6) {
      const n = Math.max(1, Math.round((w - 0.6) / 3.4)),
        cw = (w - 0.6) / n;
      for (let j = 0; j < n; j++)
        k.plane(
          bdWin(c, o.arch && j % 2 === 0),
          Math.min(cw - 0.3, 2.6),
          2.0,
          0.3 + cw * (j + 0.5),
          gf + 1.3,
          -0.11,
          PI
        );
    }
    if (o.planter) {
      k.box(w / 2 - 1.25, w / 2 + 1.25, 0, 0.5, -5.7, -4.5, '#9a958a');
      k.box(w / 2 - 1.1, w / 2 + 1.1, 0.5, 1.0, -5.55, -4.65, '#3f7a3a', { col: false });
    }
    if (o.x) o.x(k, c);
  };
const BDE = (o, b) => ({
  nf: 9,
  gf: 3.6,
  wall: '#f2caa0',
  bal: 'plain',
  roof: 'flat',
  d: 11,
  set: 9.5,
  ...o,
  extra: baide(b),
});
const BDW = (o, b) => ({
  nf: 10,
  gf: 3.6,
  wall: '#f0c89e',
  bal: 'plain',
  roof: 'flat',
  d: 12,
  set: 8.5,
  ...o,
  extra: baide(b),
});
// 鐵籠陽台＋雨遮掛在側牆上（x 那一面，dir +1 朝 +x）
const sideCage = (k, c, x, dir, z0, z1, hood, from = 3) => {
  for (let f = from; f <= c.nf; f++) {
    const y = c.gf + (f - 2) * c.fh,
      a = Math.min(x, x + dir * 0.8),
      b = Math.max(x, x + dir * 0.8);
    k.box(a, b, y + 0.05, y + 0.15, z0, z1, 'metal', { col: false });
    k.box(
      Math.min(x, x + dir * 0.95),
      Math.max(x, x + dir * 0.95),
      y + 2.4,
      y + 2.48,
      z0 - 0.1,
      z1 + 0.1,
      hood,
      { col: false }
    );
    for (let z = z0; z <= z1 + 0.01; z += 0.25)
      k.box(
        x + dir * 0.78 - 0.012,
        x + dir * 0.78 + 0.012,
        y + 0.15,
        y + 2.4,
        z,
        z + 0.025,
        'metal',
        { col: false }
      );
  }
};

// 正面的鐵籠陽台＋雨遮，從 from 樓開始（共用的 bal:'cage' 會連 2F 一起做；實景 2F 是大片玻璃窗的樓用這個）
const cages = (k, c, from, hood) => {
  for (let f = from; f <= c.nf; f++) {
    const y = c.gf + (f - 2) * c.fh;
    k.box(0.3, c.w - 0.3, y + 0.05, y + 0.15, -0.75, 0, 'metal', { col: false });
    k.box(0.3, c.w - 0.3, y + 2.55, y + 2.62, -0.75, 0, 'metal', { col: false });
    for (let x = 0.3; x <= c.w - 0.29; x += 0.18)
      k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, 'metal', { col: false });
    k.box(0.4, c.w - 0.4, y + 2.25, y + 2.33, -0.85, 0, hood, { col: false });
  }
};
// 2F 整面的大玻璃窗（蓋在共用的小窗上）
const bigWin = (k, c) => k.plane(c.ROWT.alWin(), c.w - 1.0, 2.0, c.w / 2, c.gf + 1.5, -0.035, PI);
// 人行道鋪面補高：每一格的地坪高度取自格子起點，這一段地形往北降、又有橫向坡，上坡那一端的鋪面會被草地蓋住。
// 照量到的高差（rx：沿立面到 x=w 的高差、rz：從立面到路緣的高差，公尺）疊一階一階的水泥板把草蓋掉
const TILT = {
  'E64.5': [-0.16, 0.14],
  E69: [-0.19, 0.17],
  'E74.8': [-0.07, 0.18],
  E77: [-0.12, 0.18],
  'E80.9': [-0.1, 0.18],
  'E84.4': [-0.07, 0.16],
  'E88.1': [-0.01, 0.12],
  'E105.2': [0.08, -0.1],
  'W14.8': [0.06, 0.04],
  'W20.7': [0.09, 0.03],
  'W28.9': [0.05, 0.03],
  'W33.5': [0.07, 0.02],
  W68: [0.34, -0.15],
  'W79.4': [0.32, -0.15],
  'W87.8': [0.18, -0.11],
  'W92.4': [0.11, -0.05],
  'W95.9': [0.2, -0.01],
  'W103.9': [0.12, 0.01],
};
const pave = (k, c, ap, rx, rz) => {
  const n = Math.max(1, Math.ceil(c.w / 1.2));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < 3; j++) {
      const x0 = (c.w * i) / n,
        x1 = (c.w * (i + 1)) / n,
        z0 = (-ap * (j + 1)) / 3,
        z1 = (-ap * j) / 3;
      const h = Math.max(
        ...[x0, x1].flatMap((x) => [z0, z1].map((z) => (rx * x) / c.w - (rz * z) / ap))
      );
      if (h > 0.02)
        k.box(x0 - 0.01, x1 + 0.01, -0.5, 0.07 + h, z0 - (j === 2 ? 0.2 : 0), z1, c.MR.concrete, {
          col: false,
        });
    }
};
const withPave = (lots) =>
  lots.map((L) => {
    const t = TILT[`${L[3] > 0 ? 'E' : 'W'}${L[1]}`],
      sp = L[4],
      ex = sp.extra;
    if (t)
      sp.extra = (k, c) => {
        if (ex) ex(k, c);
        pave(k, c, (sp.set || 5) - 3.5, t[0], t[1]);
      };
    return L;
  });

export default {
  ownSign: ['黑宅拉麵', '全家便利商店'],
  // f2_466～f2_469 紫褐公寓、f2_470～f2_472 實景是空地車道口（f2_471 沒有被格子碰到，但實景那裡沒有房子）、f2_465 柏德公園南端；
  // f2_940 215 號樓、f1049／f1050 全家那棟、f1047 是貼著街的柏德大樓（改由 W6～W11 蓋）
  drop: [
    'f2_465',
    'f2_466',
    'f2_467',
    'f2_468',
    'f2_469',
    'f2_470',
    'f2_471',
    'f2_472',
    'f2_940',
    'f1049',
    'f1050',
    'f1047',
  ],
  fences: [],
  lots: withPave([
    // ================= 東側（+1，往北走的右手邊）=================
    // E0 路口 NAFISHOP 那棟背面的灰色鐵皮雨淋板老屋（3F）：沿街只有一面沒有店面的牆，一樓紅磚、一扇白鐵門。
    // 中北路街屋的保留範圍佔掉後半，這裡只能補臨街 2.2 m 深的一片（s 15～21.5）和北端 6 m 深的一小段
    ...[
      [15, 21.5, 2.2],
      [21.5, 23.9, 6],
    ].map(([a, b, d], i) => [
      'N',
      a,
      b,
      1,
      {
        nf: 3,
        wall: '#8f9190',
        noband: true,
        ground: 'shutter',
        sh: '#7a4a44',
        door: 0,
        bal: 'grille',
        roof: 'flat',
        d,
        extra: (k, c) => {
          k.box(-0.01, c.w + 0.01, 0, c.gf - 0.3, -0.06, 0, c.wallMat('#7a4a44'), { col: false }); // 一樓紅磚牆
          for (let y = c.gf; y < c.top; y += 0.5)
            k.box(0, c.w, y, y + 0.04, -0.03, 0, '#7c7e7d', { col: false }); // 雨淋板的橫線
          if (!i) {
            k.box(0.6, 1.6, 0, 2.1, -0.09, -0.06, '#e8e6e0', { col: false });
            for (const x of [2.6, 3.6]) c.ac(k, x, c.gf + 0.2, -0.5);
            k.cyl(c.w - 0.6, -0.35, 0.11, 0, 7.5, '#5a4a3a', { seg: 6, col: true });
          } // 白鐵門、冷氣室外機、貼牆的木電桿
        },
      },
    ]),
    // E1 好食屋：白底橫招、橘色圓形筆刷＋黑字，白色側招，綠帆布雨棚
    [
      'N',
      25.7,
      30.3,
      1,
      APT({
        noband: true,
        ground: 'shop',
        awn: '#3f7f5f',
        extra: (k, c) => {
          front(k, c, 'haoshi', { x1: c.w - 1.0, n: 3, frame: '#3a3a3c' }); // 深色鋁框玻璃門面
          const dot = (g, W, H) => {
            g.fillStyle = '#f08a2a';
            g.beginPath();
            g.arc(W * 0.22, H * 0.5, H * 0.34, 0, 7);
            g.fill();
          };
          blade(
            k,
            sign(
              c,
              'haoshiB',
              1.7,
              1.0,
              '#e9e7e2',
              [['好食屋', '#1a1a1a', 0.55, 0.5, 0.56, 0.8]],
              dot
            ),
            1.7,
            1.0,
            c.w - 0.3,
            c.gf + 2.3,
            '#e9e7e2'
          ); // 2～3F 的白色側招
          board(
            k,
            sign(
              c,
              'haoshi',
              4.3,
              1.2,
              '#e9e7e2',
              [
                ['好食屋', '#1a1a1a', 0.5, 0.45, 0.62, 0.5],
                ['中原店', '#3a3a3a', 0.88, 0.78, 0.2, 0.2],
              ],
              (g, W, H) => {
                g.fillStyle = '#f08a2a';
                g.beginPath();
                g.arc(W * 0.3, H * 0.45, H * 0.36, 0, 7);
                g.fill();
              }
            ),
            4.3,
            1.2,
            c.w / 2,
            c.gf - 0.15,
            '#e9e7e2'
          );
        },
      }),
    ],
    // E2 鐵捲門（216 號），黃底綠字小側招只認得「素菜」
    [
      'N',
      30.3,
      34.4,
      1,
      APT({
        ground: 'shutter',
        sh: '#8d9094',
        awn: '#3f7f5f',
        extra: (k, c) => {
          blade(
            k,
            sign(
              c,
              'sucai',
              0.6,
              1.8,
              '#e8c93a',
              [
                ['素', '#2f7a3a', 0.5, 0.52, 0.24, 0.8],
                ['菜', '#2f7a3a', 0.5, 0.8, 0.24, 0.8],
              ],
              (g, W, H) => {
                g.fillStyle = '#f4f2ec';
                g.fillRect(0, 0, W, H * 0.34);
                g.fillStyle = '#2f7a3a';
                g.beginPath();
                g.arc(W / 2, H * 0.17, W * 0.3, 0, 7);
                g.fill();
              }
            ),
            0.6,
            1.8,
            c.w - 0.5,
            3.1
          );
        },
      }),
    ],
    // E3 黑宅拉麵：黑底白字橫招、灰瓦小披簷、黑色側招
    [
      'N',
      34.4,
      38.8,
      1,
      APT({
        sign: ['黑宅拉麵', '#1c1c1c', '#ffffff'],
        ground: 'shop',
        awn: '#6f7478',
        extra: (k, c) => {
          front(k, c, 'heizhai', { x1: c.w - 1.0, n: 3, base: '#1a1a1a', deco: wave(0.05, 0.5) }); // 黑色木格門面、浮世繪浪花貼圖
          const bowl = (g, W, H) => {
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(W / 2, H * 0.3, H * 0.2, 0, PI);
            g.fill();
            g.fillRect(W * 0.28, H * 0.25, W * 0.44, H * 0.035);
          };
          blade(
            k,
            sign(
              c,
              'heizhaiB',
              1.3,
              1.3,
              '#1c1c1c',
              [['黑宅拉麵', '#ffffff', 0.5, 0.74, 0.2, 0.86]],
              bowl
            ),
            1.3,
            1.3,
            c.w - 0.3,
            c.gf + 1.9,
            '#1c1c1c'
          ); // 方形黑色側招：白色碗形標
        },
      }),
    ],
    // E4 麻辣天后：桃紅橫招、黑色圓角方塊白字，米色布條
    [
      'N',
      38.8,
      42.6,
      1,
      APT({
        noband: true,
        ground: 'shutter',
        sh: '#8d9094',
        banner: ['台灣百大伴手禮名店', '#e8dfc8', '#8a2a2a'],
        extra: (k, c) => {
          const rr = (g, x, y, w, h, r) => {
            g.beginPath();
            g.moveTo(x + r, y);
            g.arcTo(x + w, y, x + w, y + h, r);
            g.arcTo(x + w, y + h, x, y + h, r);
            g.arcTo(x, y + h, x, y, r);
            g.arcTo(x, y, x + w, y, r);
            g.closePath();
            g.fill();
          };
          board(
            k,
            sign(
              c,
              'mala',
              3.6,
              1.1,
              '#d6249f',
              [
                ['麻辣天后', '#ffffff', 0.66, 0.42, 0.44, 0.52],
                ['炒香鍋', '#ffffff', 0.66, 0.76, 0.18, 0.3],
                ['中壢實踐店', '#ffffff', 0.2, 0.8, 0.16, 0.3],
              ],
              (g, W, H) => {
                g.fillStyle = '#17171a';
                rr(g, W * 0.38, H * 0.1, W * 0.57, H * 0.8, H * 0.14);
              }
            ),
            3.6,
            1.1,
            c.w / 2,
            c.gf - 0.2,
            '#d6249f'
          );
          blade(
            k,
            sign(
              c,
              'malaB',
              1.2,
              1.5,
              '#d6249f',
              [
                ['麻辣', '#ffffff', 0.5, 0.33, 0.26, 0.6],
                ['天后', '#ffffff', 0.5, 0.63, 0.26, 0.6],
              ],
              (g, W, H) => {
                g.fillStyle = '#17171a';
                rr(g, W * 0.14, H * 0.12, W * 0.72, H * 0.72, W * 0.1);
              }
            ),
            1.2,
            1.5,
            c.w - 0.3,
            c.gf + 2.4,
            '#d6249f'
          ); // 桃紅圓角側招
        },
      }),
    ],
    // E5 寬鐵捲門、白磁磚門框，沒有招牌，只剩舊的鐵架雨棚
    [
      'N',
      42.6,
      47.8,
      1,
      APT({
        noband: true,
        ground: 'shutter',
        sh: '#9a9c9e',
        door: 0,
        extra: (k, c) => {
          for (const x of [0.12, c.w - 0.47])
            k.box(x, x + 0.35, 0, c.gf - 0.6, -0.1, 0, '#e6e4de', { col: false });
          k.box(0.12, c.w - 0.12, c.gf - 0.95, c.gf - 0.6, -0.1, 0, '#e6e4de', { col: false });
          k.box(0.2, c.w - 0.2, c.gf - 0.3, c.gf - 0.24, -1.3, 0, '#4a4640', { col: false }); // 殘破的舊雨棚骨架
          for (let x = 0.2; x <= c.w - 0.2; x += 1.2)
            k.box(x, x + 0.05, c.gf - 0.36, c.gf - 0.3, -1.3, 0, '#5a3a2a', { col: false });
        },
      }),
    ],
    // E6 樓梯鐵門（220 號）；北山牆對著空地，3～5F 鐵籠陽台＋黃綠雨遮；空地街角 s 50～56 圍綠色鐵絲網圍籬
    [
      'N',
      47.8,
      49.9,
      1,
      APT({
        noband: true,
        ground: 'gate',
        sh: '#7a7e82',
        door: 0,
        extra: (k, c) => {
          sideCage(k, c, c.w, 1, 3.0, 7.0, '#b5c24a');
          k.box(c.w + 0.05, c.w + 14.5, -0.6, 0.04, -1.5, 16, '#a9a69e', { col: false }); // 空地的水泥地
          k.cyl(c.w + 0.7, -0.6, 0.14, 0, 9.5, '#5a4a3a', { seg: 6, col: true });
          k.box(c.w + 0.3, c.w + 1.1, 6.6, 6.75, -0.68, -0.52, '#3a3a3a', { col: false }); // 牆角的電桿
          for (const dz of [-0.95, -0.25])
            k.box(c.w + 0.5, c.w + 0.9, 6.9, 7.3, dz - 0.25, dz + 0.25, '#b9bcbe', { col: false }); // 兩支擴音喇叭
          k.box(c.w + 1.5, c.w + 2.6, 0, 1.3, -1.2, -0.5, '#8d9196'); // 灰色變電箱
          k.box(c.w + 0.3, c.w + 6.1, 0, 1.8, 0.0, 0.06, '#3f8f5a');
          k.box(c.w + 1.2, c.w + 4.6, 0.5, 1.6, -0.02, 0.0, '#3a6fa8', { col: false }); // 掛在圍籬上的藍色帆布
          for (let x = c.w + 0.3; x <= c.w + 6.11; x += 1.93)
            k.box(x - 0.04, x + 0.04, 0, 1.9, -0.03, 0.09, '#2f6a44', { col: false });
        },
      }),
    ],
    // ---- s 49.9～64.5 空地／車道口，不蓋 ----
    // E7 YYDS手機維修（柏德公園南端轉角）：深灰橫招包到南面，南面 2F 是 AM:TON 髮廊的白招牌，山牆有「柏德公園」綠色立體字
    [
      'N',
      64.5,
      69,
      1,
      BDE(
        {
          sign: ['YYDS手機維修', '#2a2a2e', '#ffffff', '手機周邊・中古機・免卡分期'],
          ground: 'shutter',
          sh: '#8d9094',
          banner: ['修手機', '#141414', '#f08a2a'],
        },
        {
          x: (k, c) => {
            k.box(-0.3, 0, c.gf - 0.85, c.gf - 0.03, 0.2, 5.6, '#2a2a2e', { col: false });
            k.plane(
              sign(c, 'yydsS', 5.2, 0.8, '#2a2a2e', [
                ['iPhone維修專門店', '#ffffff', 0.5, 0.5, 0.7, 0.92],
              ]),
              5.2,
              0.8,
              -0.31,
              c.gf - 0.44,
              2.9,
              -PI / 2,
              { emissive: 0.35 }
            );
            k.box(-0.25, 0, c.gf + 0.5, c.gf + 1.9, 0.3, 6.3, '#f1f0ec', { col: false });
            k.plane(
              sign(c, 'amtonS', 5.8, 1.3, '#f1f0ec', [['AM:TON', '#2a2a2a', 0.5, 0.5, 0.5, 0.6]]),
              5.8,
              1.3,
              -0.26,
              c.gf + 1.2,
              3.3,
              -PI / 2,
              { emissive: 0.3 }
            );
            const t = tex(
              c,
              'baideV',
              1.1,
              9,
              (g, W, H) => {
                g.clearRect(0, 0, W, H);
                words(
                  c,
                  g,
                  W,
                  H,
                  [...'柏德公園'].map((ch, i) => [ch, '#3f7a5a', 0.5, 0.125 + i * 0.25, 0.11, 0.95])
                );
              },
              64
            );
            k.plane(t, 1.1, 9, -0.02, c.gf + c.fh * 4.6, 2.2, -PI / 2, { transparent: true });
          },
        }
      ),
    ],
    // E8 簡單就好：凸出的白色燈箱橫招、黑色手寫字
    [
      'N',
      69,
      74.8,
      1,
      BDE(
        { sign: ['簡單就好', '#f1efe9', '#1a1a1a'], ground: 'shop' },
        {
          planter: true,
          x: (k, c) => front(k, c, 'jiandan', { x1: c.w - 1.0, n: 3, frame: '#4a3526' }),
        }
      ),
    ],
    // E9 上 2F 的樓梯口：黑底白字側招「夜未央 餐酒館」
    [
      'N',
      74.8,
      77,
      1,
      BDE(
        { noband: true, ground: 'gate', sh: '#6a6a66', door: 0 },
        {
          arch: true,
          x: (k, c) => {
            blade(
              k,
              sign(c, 'yewei', 1.3, 1.0, '#141414', [
                ['夜未央', '#ffffff', 0.5, 0.38, 0.5, 0.9],
                ['餐酒館', '#ffffff', 0.5, 0.8, 0.22, 0.6],
              ]),
              1.3,
              1.0,
              c.w - 0.25,
              c.gf + 0.9
            );
          },
        }
      ),
    ],
    // E10 236 號鐵捲門，門面沒有招牌；2F 高度白底黑字側招「董記」
    [
      'N',
      77,
      80.9,
      1,
      BDE(
        { noband: true, ground: 'shutter', sh: '#8d9094' },
        {
          planter: true,
          x: (k, c) => {
            blade(
              k,
              sign(c, 'dongji', 0.9, 1.4, '#f4f2ec', [
                ['董', '#1a1a1a', 0.5, 0.28, 0.4, 0.85],
                ['記', '#1a1a1a', 0.5, 0.72, 0.4, 0.85],
              ]),
              0.9,
              1.4,
              0.4,
              c.gf + 1.2
            );
          },
        }
      ),
    ],
    // E11 香港嘢：門楣粉彩條紋橫幅「港式美食」、灰色小雨棚、淡紫粉側招
    [
      'N',
      80.9,
      84.4,
      1,
      BDE(
        {
          noband: true,
          ground: 'shop',
          awn: '#8a8d92',
          banner: ['港式美食', '#f3d9e6', '#5a3a7a'],
        },
        {
          x: (k, c) => {
            blade(
              k,
              sign(
                c,
                'hkye',
                1.6,
                2.2,
                '#e6c3dc',
                [
                  ['香港嘢', '#5a2a7a', 0.5, 0.56, 0.2, 0.9],
                  ['香港美食', '#5a2a7a', 0.5, 0.76, 0.09, 0.8],
                  ['麵、飯、飲料', '#5a2a7a', 0.5, 0.88, 0.07, 0.8],
                ],
                (g, W, H) => {
                  g.fillStyle = '#f4ead8';
                  g.beginPath();
                  g.arc(W / 2, H * 0.24, W * 0.3, 0, 7);
                  g.fill();
                  g.fillStyle = '#e8c070';
                  g.beginPath();
                  g.arc(W / 2, H * 0.24, W * 0.22, 0, 7);
                  g.fill();
                  g.fillStyle = '#f6f0e0';
                  g.beginPath();
                  g.arc(W * 0.42, H * 0.22, W * 0.07, 0, 7);
                  g.fill();
                }
              ),
              1.6,
              2.2,
              c.w - 0.3,
              c.gf + 1.5
            );
          },
        }
      ),
    ],
    // E12 LICK BEAR：米黃橫招紅褐字、橘底圓形側招
    [
      'N',
      84.4,
      88.1,
      1,
      BDE(
        {
          sign: ['LICK BEAR', '#f0dfb8', '#b5432e', '韓熱狗・飯食・炸物'],
          ground: 'shop',
          round: ['LICK BEAR', '#e8a04a', '#1a1a1a'],
        },
        { planter: true }
      ),
    ],
    // E13 京の椿：白底黑毛筆字橫招、藍黑色小帆布簷
    [
      'N',
      88.1,
      91.7,
      1,
      BDE(
        { sign: ['京の椿', '#f5f3ee', '#111111'], ground: 'shop', awn: '#2a2f3a' },
        {
          arch: true,
          planter: true,
          x: (k, c) =>
            front(k, c, 'tsubaki', {
              x1: c.w - 1.0,
              n: 3,
              frame: '#6a4a30',
              top: '#6a5038',
              bot: '#33271e',
            }),
        }
      ),
    ],
    // E14 窄樓梯口：梯口上方「夜未央 餐酒館」側招
    [
      'N',
      92.4,
      93.5,
      1,
      BDE(
        { noband: true, ground: 'gate', sh: '#d8d6d0', door: 0, d: 3 },
        {
          x: (k, c) => {
            blade(
              k,
              sign(c, 'yewei', 1.3, 1.0, '#141414', [
                ['夜未央', '#ffffff', 0.5, 0.38, 0.5, 0.9],
                ['餐酒館', '#ffffff', 0.5, 0.8, 0.22, 0.6],
              ]),
              1.3,
              1.0,
              c.w / 2,
              c.gf + 0.4
            );
          },
        }
      ),
    ],
    // E15 Chic：淺灰紫橫招、黑色框白字
    [
      'N',
      93.5,
      97.3,
      1,
      BDE(
        { noband: true, ground: 'shutter', sh: '#8d9094' },
        {
          planter: true,
          x: (k, c) => {
            board(
              k,
              sign(
                c,
                'chic',
                3.5,
                0.8,
                '#b9b3c4',
                [['Chic', '#ffffff', 0.5, 0.52, 0.5, 0.3]],
                (g, W, H) => {
                  g.fillStyle = '#17171a';
                  g.fillRect(W * 0.3, H * 0.12, W * 0.4, H * 0.76);
                  g.strokeStyle = '#b9b3c4';
                  g.lineWidth = 3;
                  g.strokeRect(W * 0.32, H * 0.18, W * 0.36, H * 0.64);
                }
              ),
              3.5,
              0.8,
              c.w / 2,
              c.gf - 0.44,
              '#b9b3c4'
            );
          },
        }
      ),
    ],
    // E16 新洲海南雞：橘黃橫招綠字、同色直立側招
    [
      'N',
      97.3,
      100.3,
      1,
      BDE(
        { noband: true, ground: 'shop', door: 0 },
        {
          x: (k, c) => {
            board(
              k,
              sign(c, 'hainan', 2.8, 0.8, '#f0a53a', [
                ['新', '#2f6b3a', 0.1, 0.32, 0.3, 0.14],
                ['洲', '#2f6b3a', 0.1, 0.7, 0.3, 0.14],
                ['海南雞', '#2f6b3a', 0.58, 0.5, 0.74, 0.7],
              ]),
              2.8,
              0.8,
              c.w / 2,
              c.gf - 0.44,
              '#f0a53a'
            );
            vblade(k, c, '海南雞', '#f0a53a', '#2f6b3a', 0.3, c.gf + 0.6);
          },
        }
      ),
    ],
    // E17 南軒：深色窄店面，紅底白字側招掛在 2F 高度
    [
      'N',
      100.3,
      102.6,
      1,
      BDE(
        { noband: true, ground: 'shop', door: 0 },
        {
          x: (k, c) => {
            blade(
              k,
              sign(c, 'nanxuan', 2.2, 1.3, '#c8322e', [['南軒', '#ffffff', 0.5, 0.5, 0.66, 0.86]]),
              2.2,
              1.3,
              c.w / 2,
              c.gf + 1.0
            );
          },
        }
      ),
    ],
    // E18 肉麻鉄：深褐木格門面、木板底白字小橫招
    [
      'N',
      102.6,
      105.2,
      1,
      BDE(
        { sign: ['肉麻鉄', '#3a2a22', '#ffffff'], ground: 'shop', door: 0 },
        {
          x: (k, c) =>
            front(k, c, 'roumatetsu', {
              n: 4,
              frame: '#3a2a22',
              base: '#4a3428',
              top: '#5a4632',
              bot: '#2a201a',
            }),
        }
      ),
    ],
    // E19 HENK BURGER：紅底白字橫招
    [
      'N',
      105.2,
      109.2,
      1,
      BDE(
        { sign: ['HENK BURGER', '#d43a3f', '#ffffff', '美式手作漢堡'], ground: 'shop' },
        { arch: true, planter: true }
      ),
    ],
    // E20 樓梯口（圓形側招字看不清楚，不放）
    ['N', 109.2, 110, 1, BDE({ noband: true, ground: 'gate', sh: '#d8d6d0', door: 0 })],

    // ================= 西側（-1，往北走的左手邊；區域座標 x=0 在北端）=================
    // W0 路口「手機配件」那棟的北緣（中北路街屋蓋到 s≈14.8）：1～2F 包黑色金屬板，2F 高度彩色小牌，3F 以上鐵籠陽台綠浪板雨遮
    [
      'N',
      14.8,
      17.7,
      -1,
      {
        nf: 7,
        wall: '#b0736c',
        noband: true,
        ground: 'shutter',
        sh: '#1e1e1e',
        door: 0,
        bal: 'cage',
        hood: '#5aa57a',
        roof: 'flat',
        d: 9,
        set: 8.0,
        extra: (k, c) => {
          const { w, gf, fh } = c;
          k.box(-0.01, w + 0.01, 0, gf + fh * 0.9, -0.12, 0, '#1e1e1e', { col: false }); // 黑色金屬板包到 2F
          k.box(-0.05, w + 0.05, gf - 0.45, gf - 0.3, -0.7, 0, '#141414', { col: false }); // 一樓上緣的黑色金屬簷
          k.box(0, w, gf - 0.47, gf - 0.45, -0.68, -0.14, '#f4f2e8', { col: false }); // 簷下白光燈條
          k.plane(c.shutterTex('#1e1e1e'), 1.2, gf - 0.6, 0.75, (gf - 0.6) / 2, -0.13, PI);
          k.box(1.5, w - 0.1, 0.3, gf - 0.7, -0.15, -0.12, '#eceae6', { col: false }); // 白底公仔海報（字不放）
          const tag = (t, bg, x, y) =>
            board(
              k,
              sign(c, `tag${t}`, 1.6, 0.5, bg, [[t, '#ffffff', 0.5, 0.52, 0.7, 0.9]]),
              1.6,
              0.5,
              x,
              y,
              bg,
              0.22
            );
          tag('全機包膜', '#3f8fd0', w - 0.9, gf + 1.55);
          tag('軍規防摔', '#e8902a', w - 1.3, gf + 0.9);
          tag('機能掛繩', '#3f55d0', w - 2.1, gf + 0.3);
          vblade(k, c, '手機配件', '#141414', '#ffffff', 0.5, gf + fh * 1.0);
        },
      },
    ],
    // ---- s 17.7～20.7 留空：遊戲裡往西的步道（data/cycu.json 的 footway）從這裡穿過去；實景 215 號樓的穿堂車道在 s 22.5～27.1，這裡往南挪 4 m 對在步道上 ----
    // W1 215 號樓：2F 以上跨過穿堂（南邊 3 m 是架空的），2F 一圈深灰磁磚，穿堂口上方白底紅字「套房出租」牌，綠帆布雨棚
    [
      'N',
      20.7,
      28.9,
      -1,
      {
        nf: 6,
        wall: '#9a4f48',
        noband: true,
        ground: 'gate',
        sh: '#8a3a3a',
        door: 0,
        bal: 'plain',
        roof: 'flat',
        d: 9,
        set: 8.0,
        extra: (k, c) => {
          const { w, d, gf, fh, top } = c,
            G = 3.0,
            RB = c.wallMat('#9a4f48'),
            DG = c.wallMat('#5a5a5e');
          k.box(-0.01, 5.6, 0, gf, -0.1, 0, RB, { col: false }); // 一樓北半是紅磚色實牆，只留南邊一扇住戶鐵門
          k.plane(c.shutterTex('#8a3a3a'), 1.1, 2.2, 4.6, 1.1, -0.11, PI); // 住戶的紅色鐵柵門
          for (const x of [1.4, 3.0]) k.plane(c.ROWT.alWin(), 1.2, 1.0, x, 1.7, -0.11, PI);
          k.box(w, w + G, gf - 0.2, top, 0, d, RB, { col: false }); // 跨過穿堂的樓上
          k.box(w - 0.02, w + G + 0.02, top, top + 0.12, -0.04, d, 'gray', { col: false });
          canopy(k, -0.05, w + G, gf - 0.9, '#4f8f6f'); // 綠帆布雨棚蓋住整條人行道，接過穿堂口
          board(
            k,
            sign(c, 'rent215', 1.6, 0.6, '#f4f2ec', [['套房出租', '#d42a2a', 0.5, 0.5, 0.6, 0.9]]),
            1.6,
            0.6,
            w + G / 2,
            gf - 0.55,
            '#f4f2ec',
            0.16
          );
          k.box(-0.01, w + G + 0.01, gf, gf + fh, -0.07, 0, DG, { col: false }); // 2F 深灰小口磚
          for (const x of [w * 0.28, w * 0.72])
            k.plane(c.ROWT.alWin(), 1.6, 1.3, x, gf + 1.5, -0.08, PI);
          for (let f = 2; f <= c.nf; f++)
            k.plane(c.ROWT.alWin(), 1.4, 1.3, w + G / 2, gf + (f - 2) * fh + 1.5, -0.08, PI);
          k.box(0, 0.4, 0, top, -0.12, 0, DG, { col: false });
          k.box(w + G - 0.4, w + G, gf - 0.2, top, -0.12, 0, DG, { col: false }); // 兩邊深灰壁柱
        },
      },
    ],
    // W2 Dr.E 髮廊：黑底白字橫招、黑色側招，綠帆布雨棚，2F 大片玻璃窗，3F 以上鐵籠陽台綠浪板雨遮
    [
      'N',
      28.9,
      33.5,
      -1,
      {
        nf: 5,
        gf: 3.4,
        wall: '#a8706a',
        sign: ['Dr.E', '#1a1a1c', '#ffffff', '達特伊 Hair Salon'],
        ground: 'shop',
        door: 0,
        bal: 'plain',
        vert: ['Dr.E', '#1a1a1c', '#ffffff'],
        roof: 'flat',
        d: 11,
        set: 8.0,
        extra: (k, c) => {
          front(k, c, 'dre', { n: 5 });
          bigWin(k, c);
          cages(k, c, 3, '#5aa57a');
          canopy(k, -0.05, c.w + 0.05, c.gf - 0.9, '#4f8f6f');
        },
      },
    ],
    // W3 泰楊泰式料理：藍綠底金字橫招
    [
      'N',
      33.5,
      40,
      -1,
      {
        nf: 5,
        gf: 3.4,
        wall: '#a8706a',
        noband: true,
        ground: 'shop',
        bal: 'plain',
        roof: 'flat',
        d: 12,
        set: 8.0,
        extra: (k, c) => {
          bigWin(k, c);
          cages(k, c, 3, '#5aa57a'); // 2F 大片玻璃窗，3F 以上才是鐵籠陽台
          k.box(0.1, c.w - 0.1, c.gf - 0.95, c.gf + 0.55, -0.2, 0, '#1f7f8f', { col: false }); // 招牌兩側的藍綠色百葉
          front(k, c, 'taiyang', {
            x1: c.w - 1.0,
            n: 4,
            frame: '#1f7f8f',
            top: '#5a5a52',
            bot: '#2a2c2a',
          });
          canopy(k, -0.05, c.w + 0.05, c.gf - 0.9, '#4f8f6f');
          board(
            k,
            sign(
              c,
              'taiyang',
              4.6,
              1.5,
              '#1b7896',
              [
                ['泰楊', '#e8c060', 0.58, 0.42, 0.56, 0.5],
                ['泰式料理', '#e8c060', 0.58, 0.82, 0.18, 0.4],
              ],
              (g, W, H) => {
                g.strokeStyle = '#e8c060';
                g.lineWidth = H * 0.05;
                g.beginPath();
                g.arc(W * 0.17, H * 0.48, H * 0.3, 0, 7);
                g.stroke();
                g.fillStyle = '#e8c060';
                g.beginPath();
                g.arc(W * 0.17, H * 0.48, H * 0.14, 0, 7);
                g.fill();
              }
            ),
            4.6,
            1.5,
            c.w / 2,
            c.gf - 0.2,
            '#1b7896'
          );
        },
      },
    ],
    // W4 OPEN POKER：米色鐵捲門、黑底白字橫招、灰色小帆布雨棚
    [
      'N',
      40,
      43,
      -1,
      {
        nf: 6,
        wall: '#8a4a3c',
        sign: ['OPEN', '#17171a', '#ffffff', 'POKER 德州撲克競技協會'],
        ground: 'shutter',
        sh: '#d8cdb8',
        door: 0,
        awn: '#8a8d92',
        bal: 'plain',
        roof: 'flat',
        d: 12,
        set: 8.0,
      },
    ],
    // W5 全家便利商店：整面落地玻璃，白底橫招（上緣綠條、下緣藍條、藍字），一樓柱子貼黑色小口磚，兩塊方形側招；
    // 北面（對著廣場）2F 是「春潮商社」白底黑字招牌，一樓是黑底的 OPEN 撲克招牌與鐵捲門
    [
      'N',
      43,
      58.5,
      -1,
      {
        nf: 6,
        wall: '#8a4a3c',
        noband: true,
        ground: 'shop',
        door: 0,
        bal: 'grille',
        roof: 'tank',
        d: 12,
        set: 8.0,
        extra: (k, c) => {
          const { w, gf } = c;
          const fam = tex(
            c,
            'famBand',
            w - 0.15,
            1.0,
            (g, W, H) => {
              g.fillStyle = '#ffffff';
              g.fillRect(0, 0, W, H);
              g.fillStyle = '#2aa84a';
              g.fillRect(0, 0, W, H * 0.16);
              g.fillStyle = '#1f6fc0';
              g.fillRect(0, H * 0.86, W, H * 0.14);
              for (const fx of [0.27, 0.75]) {
                g.fillStyle = '#2aa84a';
                g.fillRect(W * (fx - 0.125), H * 0.32, H * 0.4, H * 0.18);
                g.fillStyle = '#1f6fc0';
                g.fillRect(W * (fx - 0.125), H * 0.52, H * 0.4, H * 0.18);
                words(c, g, W, H, [['全家 FamilyMart', '#1f6fc0', fx + 0.03, 0.52, 0.52, 0.24]]);
              }
            },
            64
          );
          board(k, fam, w - 0.15, 1.0, w / 2, gf - 0.44, '#ffffff', 0.28);
          k.box(-9.45, -0.15, -1.2, 0.04, -4.5, 14, '#b9aeaa', { col: false }); // 柏德廣場入口的灰粉地磚（地形往北降，掛在這格才不會被蓋住）
          for (const x of [0, 5.1, 10.3, w - 0.4])
            k.box(x, x + 0.4, 0, gf - 0.95, -0.12, 0, '#2a2a2c', { col: false });
          for (const x of [1.5, w - 1.0])
            blade(
              k,
              c.paint('FamilyMart', '#ffffff', '#1f6fc0', null, 1.1, 1.1, 96, 'fam'),
              1.6,
              1.6,
              x,
              gf + 1.7,
              '#f4f4f2'
            );
          k.plane(
            sign(c, 'hightide', 4.2, 1.3, '#f1f0ec', [
              ['春潮商社', '#1a1a1a', 0.5, 0.42, 0.5, 0.86],
              ['HIGH TIDE CORPORATION', '#1a1a1a', 0.5, 0.8, 0.14, 0.7],
            ]),
            4.2,
            1.3,
            -0.06,
            gf + 1.3,
            2.6,
            -PI / 2,
            { emissive: 0.3 }
          );
          k.box(-0.05, 0, gf + 0.6, gf + 2.0, 0.45, 4.75, '#f1f0ec', { col: false });
          k.box(-0.12, 0, gf - 0.9, gf - 0.1, 0.4, 8.2, '#17171a', { col: false });
          k.plane(
            sign(c, 'openN', 7.6, 0.7, '#17171a', [
              ['OPEN', '#ffffff', 0.22, 0.52, 0.72, 0.3],
              ['POKER 德州撲克競技協會', '#ffffff', 0.68, 0.55, 0.36, 0.5],
            ]),
            7.6,
            0.7,
            -0.13,
            gf - 0.5,
            4.3,
            -PI / 2,
            { emissive: 0.3 }
          );
          k.plane(c.shutterTex('#d8cdb8'), 3.0, gf - 1.0, -0.04, (gf - 1.0) / 2, 2.2, -PI / 2);
          k.plane(c.shutterTex('#2a2630'), 3.6, gf - 1.0, -0.04, (gf - 1.0) / 2, 6.0, -PI / 2);
        },
      },
    ],
    // ---- s 58.5～68 柏德廣場的人行廣場入口，不蓋 ----
    // W6 朱老鼠牛排館（柏德大樓南端轉角）：黃底藍字橫招、紅底白字小塊，轉角直立大側招，轉角每層白色陽台
    [
      'N',
      68,
      79.4,
      -1,
      BDW(
        { noband: true, ground: 'shop', banner: ['美國安格斯牛排', '#c8282a', '#ffffff'] },
        {
          x: (k, c) => {
            const { w, gf, fh } = c;
            board(
              k,
              sign(
                c,
                'zhu',
                9,
                1.0,
                '#f2c230',
                [
                  ['朱老鼠牛排館', '#1f3fa0', 0.44, 0.52, 0.8, 0.78],
                  ['中原實踐店', '#ffffff', 0.925, 0.5, 0.28, 0.13],
                ],
                (g, W, H) => {
                  g.fillStyle = '#d02a2a';
                  g.fillRect(W * 0.85, 0, W * 0.15, H);
                }
              ),
              9,
              1.0,
              w / 2,
              gf - 0.45,
              '#f2c230'
            );
            vblade(k, c, '朱老鼠牛排館', '#f2c230', '#1f3fa0', w - 0.2, gf + 0.3);
            front(k, c, 'zhu', { x1: w - 1.0, n: 6, frame: '#3a3a3c' }); // 深色玻璃門面
            for (let x = 0.6; x < w - 3; x += 0.9) {
              k.box(x, x + 0.5, 0, 0.45, -3.4, -2.9, '#8a4a32', { col: false });
              k.box(x - 0.1, x + 0.6, 0.45, 1.05, -3.5, -2.8, '#a8323a', { col: false });
            } // 前院邊一排紅葉盆栽
            for (let f = 3; f <= c.nf; f++) {
              const y = gf + (f - 2) * fh;
              k.box(w - 2.6, w + 0.5, y, y + 0.95, -0.9, 0, '#eeece6', { col: false });
              k.box(w, w + 0.5, y, y + 0.95, 0, 2.4, '#eeece6', { col: false });
            }
            k.box(w, w + 0.3, gf - 0.95, gf + 0.05, 0.5, 8, '#f2c230', { col: false }); // 南面（對著廣場）同款黃色橫招
            k.plane(
              sign(c, 'zhuS', 7, 0.9, '#f2c230', [
                ['朱老鼠牛排館', '#1f3fa0', 0.5, 0.52, 0.8, 0.9],
              ]),
              7,
              0.9,
              w + 0.31,
              gf - 0.45,
              4.25,
              PI / 2,
              { emissive: 0.35 }
            );
          },
        }
      ),
    ],
    // W7 黃燜雞米飯：黑底金黃字橫招、南端紅底白字直立側招
    [
      'N',
      79.4,
      87.8,
      -1,
      BDW(
        { sign: ['黃燜雞米飯', '#1a1a1a', '#e8c060', 'Braised Chicken Rice'], ground: 'shop' },
        {
          arch: true,
          x: (k, c) => {
            vblade(k, c, '黃燜雞米飯', '#c0202a', '#ffffff', c.w - 0.3, 1.2);
            front(k, c, 'hmj', { x1: c.w - 1.0, n: 5 });
          },
        }
      ),
    ],
    // W8 鹿橙：深藍底白字橫招（左右各一個大字）、灰瓦小簷、白底圓形側招
    [
      'N',
      87.8,
      92.4,
      -1,
      BDW(
        {
          noband: true,
          ground: 'shop',
          door: 0,
          awn: '#7a7f84',
          round: ['鹿橙', '#ffffff', '#1f2f55'],
        },
        {
          arch: true,
          x: (k, c) => {
            board(
              k,
              sign(c, 'lucheng', 4.4, 1.2, '#1f2f55', [
                ['鹿', '#ffffff', 0.13, 0.52, 0.7, 0.2],
                ['橙', '#ffffff', 0.87, 0.52, 0.7, 0.2],
                ['LU CHENG', '#ffffff', 0.5, 0.33, 0.3, 0.42],
                ['TEA SHOP', '#ffffff', 0.5, 0.7, 0.3, 0.42],
              ]),
              4.4,
              1.2,
              c.w / 2,
              c.gf - 0.3,
              '#1f2f55'
            );
          },
        }
      ),
    ],
    // W9 大樓側門／門廳：玻璃磚窗、灰色鐵門，沒有招牌
    [
      'N',
      92.4,
      95.9,
      -1,
      BDW({ noband: true, ground: 'gate', sh: '#8a8d90', door: 0 }, { arch: true }),
    ],
    // W10 松川烤肉飯：整格紅色琉璃瓦斜屋簷、門口直立招、3F 高度白底側招
    [
      'N',
      95.9,
      103.9,
      -1,
      BDW(
        { noband: true, ground: 'shop' },
        {
          arch: true,
          x: (k, c) => {
            const { w, gf } = c;
            front(k, c, 'songchuan', {
              x1: w - 1.0,
              n: 4,
              frame: '#3a2a22',
              deco: wave(0.5, 0.47),
            }); // 深褐木框門面，北半貼浮世繪浪花圖
            for (let j = 0; j < 5; j++)
              k.box(
                -0.05,
                w + 0.05,
                gf - 0.5 - j * 0.16,
                gf - 0.3 - j * 0.16,
                -0.35 - j * 0.3,
                -j * 0.3,
                j % 2 ? '#a03a3a' : '#b04444',
                { col: false }
              ); // 紅瓦斜簷（階梯狀疊出斜面）
            k.box(0.3, 1.1, 0, 2.0, -0.5, -0.4, '#f4f2ec', { col: false });
            k.plane(
              sign(c, 'songS', 0.7, 2.0, '#f4f2ec', [
                ['松', '#1a1a1a', 0.5, 0.12, 0.17, 0.8],
                ['川', '#1a1a1a', 0.5, 0.3, 0.17, 0.8],
                ['烤', '#d42a2a', 0.5, 0.52, 0.17, 0.8],
                ['肉', '#d42a2a', 0.5, 0.7, 0.17, 0.8],
                ['飯', '#d42a2a', 0.5, 0.88, 0.17, 0.8],
              ]),
              0.7,
              2.0,
              0.7,
              1.0,
              -0.51,
              PI,
              { emissive: 0.3 }
            );
            blade(
              k,
              sign(c, 'songB', 1.4, 1.8, '#f4f2ec', [
                ['松川', '#1a1a1a', 0.5, 0.25, 0.34, 0.8],
                ['烤肉飯', '#d42a2a', 0.5, 0.62, 0.3, 0.9],
              ]),
              1.4,
              1.8,
              w / 2,
              gf + c.fh + 1.4,
              '#f4f2ec'
            );
          },
        }
      ),
    ],
    // W11 學府米干：白底橫招，紅色「學府」＋黑色「米干」、紅色碗麵圖示，南緣 2～3F 高度同款側招
    [
      'N',
      103.9,
      110,
      -1,
      BDW(
        { noband: true, ground: 'shop' },
        {
          x: (k, c) => {
            const bowl = (g, W, H) => {
              g.fillStyle = '#c8323a';
              g.beginPath();
              g.arc(W * 0.84, H * 0.45, H * 0.26, 0, PI);
              g.fill();
              g.fillRect(W * 0.84 - H * 0.3, H * 0.4, H * 0.6, H * 0.06);
            };
            board(
              k,
              sign(
                c,
                'xuefu',
                5.5,
                1.1,
                '#f3f1ee',
                [
                  ['學府', '#c8323a', 0.27, 0.52, 0.76, 0.34],
                  ['米干', '#1a1a1a', 0.58, 0.52, 0.76, 0.26],
                ],
                bowl
              ),
              5.5,
              1.1,
              c.w / 2,
              c.gf - 0.45,
              '#f3f1ee'
            );
            blade(
              k,
              sign(c, 'xuefuB', 1.5, 1.9, '#f3f1ee', [
                ['學府', '#c8323a', 0.5, 0.3, 0.4, 0.85],
                ['米干', '#1a1a1a', 0.5, 0.72, 0.4, 0.85],
              ]),
              1.5,
              1.9,
              c.w - 0.3,
              c.gf + 2.4,
              '#f3f1ee'
            ); // 南緣、2～3F 高度的大側招
          },
        }
      ),
    ],
  ]),
};
