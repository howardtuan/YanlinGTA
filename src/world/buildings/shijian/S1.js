// 實踐路街屋資料：S 段 s 0～200（中北路口往東南，東北側店面；西南側是中原國小圍牆）。格式見 src/world/buildings/StreetShijian.js 檔頭。
// 依 Google 街景 2026-05（FIFTY% 那一格是 2025-05）與國土測繪 2024 正射建模。
// 區域座標提醒：左側（side -1）x = s1 − s，右側（side +1）x = s − s0；從街上正對立面看，x 都是往左變大。
// 面寬超過 6 m 的棟拆成兩三格（不然樓上的窗會被拉成一長條），跨格的招牌由其中一格的 extra 畫。

const SET = 6.5; // 立面線離路中心（街景用機車停車帶與招牌反推）

// ---- 這一段自己用的小構件（都畫在 extra 裡）----
const all =
  (...fs) =>
  (k, c) =>
    fs.forEach((f) => f(k, c));
// 橫招：底板加字。o.edge 外框色、o.m 外框寬、o.z 凸出量
const hs = (k, c, x0, x1, y0, y1, text, bg, fg, sub, o = {}) => {
  const z = o.z ?? -0.3,
    m = o.m ?? 0.04,
    w = x1 - x0 - m * 2,
    h = y1 - y0 - m * 2;
  k.box(x0, x1, y0, y1, z + 0.01, 0, o.edge || bg, { col: false });
  k.plane(
    c.paint(text, bg, fg, sub || null, w, h, 128, o.style),
    w,
    h,
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    z,
    c.FRONT,
    { emissive: o.em ?? 0.35 }
  );
};
const sign = (x0, x1, dy0, dy1, text, bg, fg, sub, o) => (k, c) =>
  hs(k, c, x0, x1, c.gf + dy0, c.gf + dy1, text, bg, fg, sub, o);
// 垂直立面的側招：中間一片底板，兩面各貼一張
const side = (k, tex, x, y, z, w, h, bg, tr) => {
  if (bg) k.box(x - 0.05, x + 0.05, y - h / 2, y + h / 2, z - w / 2, z + w / 2, bg, { col: false });
  if (tex)
    for (const sd of [-1, 1])
      k.plane(tex, w, h, x + sd * 0.06, y, z, (sd * Math.PI) / 2, {
        emissive: 0.3,
        transparent: !!tr,
      });
};
// 直立側招（一格一個字）
const vs =
  (x, dy, text, bg, fg, cw = 0.7, z = -0.85) =>
  (k, c) => {
    const len = cw * [...text].length + 0.2;
    side(k, c.ROWT.vert(`sjS1${text}${bg}`, bg, fg, text), x, c.gf + dy + len / 2, z, cw, len, bg);
  };
// 圓形側招（text 給空字串就是只有圓框、不寫字）
const round =
  (x, dy, text, bg, fg, size = 1.0, z = -0.85) =>
  (k, c) =>
    side(k, c.roundSign(text, bg, fg), x, c.gf + dy, z, size, size, null, true);
// 沒有字的側招（街景看不清楚字的，只做色塊）
const slab =
  (x, dy0, dy1, col, z0 = -1.1, z1 = -0.3) =>
  (k, c) =>
    k.box(x - 0.06, x + 0.06, c.gf + dy0, c.gf + dy1, z0, z1, col, { col: false });
// 綠色玻璃凸窗（f0～f1 樓，2 樓 = 1）
const bay =
  (x0, x1, f0, f1 = f0) =>
  (k, c) => {
    const y0 = c.gf + (f0 - 1) * c.fh + 0.35,
      y1 = c.gf + f1 * c.fh - 0.35;
    k.box(x0, x1, y0, y1, -0.55, 0, '#7fae9f', { col: false });
    for (const y of [y0 - 0.08, y1])
      k.box(x0 - 0.04, x1 + 0.04, y, y + 0.08, -0.6, 0, '#e9e9e6', { col: false });
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.max(2, Math.round((x1 - x0) / 0.9)))
      k.box(x - 0.03, x + 0.03, y0, y1, -0.58, -0.55, '#e9e9e6', { col: false });
    for (let y = y0 + 1.2; y < y1 - 0.4; y += 1.2)
      k.box(x0, x1, y, y + 0.05, -0.58, -0.55, '#e9e9e6', { col: false });
  };
// 斜的帆布雨棚（街景裡整排店都是這種：從招牌下緣往外斜下去約 2 m，前緣一條垂邊）。spec 寫 can: '#色' 就會自動加（見檔尾 withCan）
const canopy =
  (col, o = {}) =>
  (k, c) => {
    const a = o.x0 ?? -0.05,
      b = o.x1 ?? c.w + 0.05,
      yt = c.gf - (o.top ?? 0.95),
      drop = o.drop ?? 0.8,
      out = o.out ?? 2.0,
      L = Math.hypot(drop, out);
    const g = new c.THREE.BoxGeometry(b - a, 0.06, L);
    g.rotateX(-Math.atan2(drop, out));
    g.translate((a + b) / 2, yt - drop / 2, -0.25 - out / 2);
    k._part(c.VC, c.paintGeo(g, col));
    k.box(a, b, yt - drop - 0.2, yt - drop + 0.02, -0.25 - out - 0.03, -0.25 - out + 0.02, col, {
      col: false,
    });
  };
const withCan = (L) => {
  const sp = L[4];
  if (!sp.can) return L;
  return [
    L[0],
    L[1],
    L[2],
    L[3],
    { ...sp, extra: sp.extra ? all(canopy(sp.can, sp.canO), sp.extra) : canopy(sp.can, sp.canO) },
  ];
};
// 白色花式鐵籠陽台（每層一個，凸出 0.7 m）
const whiteCage = (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh,
      W = '#e9e9e4';
    k.box(0.4, c.w - 0.4, y + 0.45, y + 0.53, -0.7, 0, W, { col: false });
    k.box(0.4, c.w - 0.4, y + 2.45, y + 2.52, -0.7, 0, W, { col: false });
    k.box(0.4, c.w - 0.4, y + 1.2, y + 1.24, -0.71, -0.68, W, { col: false });
    for (let x = 0.4; x <= c.w - 0.39; x += 0.22)
      k.box(x, x + 0.03, y + 0.53, y + 2.45, -0.71, -0.68, W, { col: false });
  }
};
// 把一樓整面蓋成素牆（公廁、停車場小屋這種沒有店面的）
const blank = (col) => (k, c) => k.box(0, c.w, 0, c.gf, -0.1, 0, col, { col: false });

// 小北百貨（畫在三格裡最右邊那一格，x 0～18.9 橫跨三格）：黃底大橫招、深藍下緣、入口藍帶、黃柱
const xiaobei = (k, c) => {
  const W = 18.9,
    y0 = c.gf - 0.1,
    y1 = c.gf + 1.55;
  k.box(0, W, y0, y1, -0.7, 0, '#f2d21f', { col: false });
  k.box(0, W, y0, y0 + 0.24, -0.72, 0, '#1f3f9a', { col: false });
  const tex = c.sg('sjS1xiaobei', 1536, 112, (g) => {
    g.fillStyle = '#f2d21f';
    g.fillRect(0, 0, 1536, 112);
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillStyle = '#d8362f';
    g.beginPath();
    g.arc(60, 56, 44, 0, 7);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(60, 56, 32, 0, 7);
    g.fill();
    g.font = c.font(84);
    g.fillStyle = '#1f3f9a';
    g.fillText('小北百貨', 130, 60);
    const x = 130 + g.measureText('小北百貨').width + 24;
    g.fillStyle = '#d8362f';
    g.fillText('24', x, 60);
    g.fillStyle = '#2f9a5a';
    g.fillText('H', x + g.measureText('24').width + 6, 60);
    g.fillStyle = '#1f3f9a';
    g.fillRect(1180, 78, 356, 34);
    g.fillStyle = '#ffffff';
    g.font = c.font(24, 700);
    g.fillText('中壢中原店', 1200, 96);
  });
  k.plane(tex, W, 1.38, W / 2, y0 + 0.24 + 0.7, -0.71, c.FRONT, { emissive: 0.35 });
  hs(k, c, 8.9, W, 2.55, y0, '入口 ENTRANCE', '#1f3f9a', '#ffffff', null, { z: -0.4 });
  for (const x of [0.15, 5.9, 8.6]) k.box(x, x + 0.45, 0, y0, -0.3, 0, '#f2d21f', { col: false });
};

// 由申甲大樓：1～2 樓灰色花崗石（粗石柱、線腳），樓上白灰色
const STONE = '#b4afa5';
const stone = (k, c) => {
  k.box(0, c.w, c.gf, c.gf + c.fh, -0.12, 0, c.wallMat('#b9b4aa'), { col: false }); // 2 樓石牆
  k.box(-0.02, c.w + 0.02, c.gf - 0.25, c.gf + 0.15, -0.55, 0, '#c4bfb4', { col: false }); // 一樓上緣線腳
  k.box(-0.02, c.w + 0.02, c.gf + c.fh - 0.1, c.gf + c.fh + 0.25, -0.5, 0, '#c4bfb4', {
    col: false,
  }); // 2 樓上緣線腳
  for (const x of [0, c.w - 0.9]) {
    k.box(x, x + 0.9, 0, c.gf - 0.25, -0.6, 0, STONE, { col: false });
    k.box(x - 0.05, x + 0.95, 0, 0.5, -0.68, 0, STONE, { col: false });
  } // 粗石柱
};
const greenWin = (x0, x1, dy0, dy1) => (k, c) => {
  k.box(x0, x1, c.gf + dy0, c.gf + dy1, -0.16, -0.1, '#6f9f94', { col: false });
  k.box(
    (x0 + x1) / 2 - 0.03,
    (x0 + x1) / 2 + 0.03,
    c.gf + dy0,
    c.gf + dy1,
    -0.18,
    -0.1,
    '#e9e9e6',
    { col: false }
  );
};
const youshenjia = (k, c) => {
  const m = c.w / 2;
  k.plane(
    c.paint('由申甲有限公司', '#a8a399', '#8a5a1e', null, 4.6, 0.8, 128, 'frame'),
    4.6,
    0.8,
    m,
    c.gf + 0.75,
    -0.14,
    c.FRONT
  ); // 石刻匾
  // 中央一道到頂的綠玻璃高窗，頂端收成拱形
  const y0 = c.gf + c.fh + 0.4,
    y1 = c.top - 2.2;
  k.box(m - 1.7, m + 1.7, y0, y1, -0.2, 0, '#6f9f94', { col: false });
  k.box(m - 1.3, m + 1.3, y1, y1 + 0.5, -0.2, 0, '#6f9f94', { col: false });
  k.box(m - 0.7, m + 0.7, y1 + 0.5, y1 + 0.8, -0.2, 0, '#6f9f94', { col: false });
  for (const x of [m - 1.7, m - 0.57, m + 0.57, m + 1.64])
    k.box(x, x + 0.06, y0, y1, -0.23, -0.2, '#e9e9e6', { col: false });
  for (let y = y0 + 1.5; y < y1; y += 1.55)
    k.box(m - 1.7, m + 1.7, y, y + 0.06, -0.23, -0.2, '#e9e9e6', { col: false });
  k.box(m - 2.2, m + 2.2, c.top + 0.12, c.top + 2.8, 3, 8, c.wallMat('#e6e6e2'), { col: false }); // 屋頂塔屋
  k.box(m - 2.4, m + 2.4, c.top + 2.8, c.top + 3.0, 2.8, 8.2, '#c4bfb4', { col: false });
};
// 樓上兩側的黑色鐵欄杆小陽台
const railBal = (k, c) => {
  for (let f = 3; f < c.nf; f += 2) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0.5, c.w - 0.5, y, y + 0.08, -0.6, 0, '#c4bfb4', { col: false });
    k.box(0.5, c.w - 0.5, y + 0.85, y + 0.9, -0.6, -0.56, '#1c1c1e', { col: false });
    for (let x = 0.5; x <= c.w - 0.5; x += 0.3)
      k.box(x, x + 0.03, y + 0.08, y + 0.85, -0.6, -0.57, '#1c1c1e', { col: false });
  }
};

// innisfree：1～2 樓整個鮮綠色方框門面，2 樓一大塊白底看板（街景是茶園照片，只在右上角寫小字）
const innisfree = (k, c) => {
  const W = 6.6,
    G = '#2fb24f';
  k.box(0, W, c.gf, c.gf + 3.1, -0.85, 0, G, { col: false });
  k.box(0.25, W - 0.25, c.gf + 0.2, c.gf + 2.9, -0.88, -0.85, '#dfe9e2', { col: false });
  k.box(0.25, W - 0.25, c.gf + 0.2, c.gf + 1.1, -0.89, -0.85, '#7fae86', { col: false }); // 看板下半的茶園
  k.plane(
    c.paint('innisfree', '#dfe9e2', '#3f5a48', null, 1.7, 0.42, 128),
    1.7,
    0.42,
    1.4,
    c.gf + 2.4,
    -0.9,
    c.FRONT,
    { emissive: 0.2 }
  );
  hs(k, c, 0, W, c.gf - 0.95, c.gf, 'innisfree', G, '#ffffff', null, { z: -0.95, m: 0.12 });
  for (const x of [0, W - 0.4]) k.box(x, x + 0.4, 0, c.gf, -0.85, 0, G, { col: false });
};

// 右側：停車場行人出入口小屋（灰色石材、玻璃磚牆、鋼桁架平棚、紅色 P 立柱），順便畫北邊的地下停車場汽車出入口白色薄膜棚
const kiosk = (k, c) => {
  k.box(0, 2.6, 0.3, c.gf - 0.3, -0.16, 0, '#a9c2c4', { col: false }); // 玻璃磚牆
  k.box(3.1, 4.0, 0, 2.2, -0.13, 0, '#2a2c30', { col: false }); // 門
  k.plane(c.YHT.win(), 1.3, 1.1, 5.4, 1.7, -0.11, c.FRONT);
  k.box(-0.4, c.w + 0.4, c.gf + 0.45, c.gf + 0.55, -0.9, c.d, '#6a6d70', { col: false }); // 屋頂上的鋼桁架平棚
  for (let x = -0.3; x < c.w + 0.4; x += 0.8)
    k.box(x, x + 0.05, c.gf, c.gf + 0.45, -0.9, -0.84, '#8a8d90', { col: false });
  k.box(-0.4, c.w + 0.4, c.gf, c.gf + 0.06, -0.9, -0.84, '#8a8d90', { col: false });
  k.box(2.7, 3.4, 0, 4.6, -0.75, -0.05, '#b8323a'); // 紅色馬賽克 P 立柱
  k.plane(
    c.paint('P', '#b8323a', '#ffffff', null, 0.6, 0.8, 96),
    0.6,
    0.8,
    3.05,
    4.0,
    -0.76,
    c.FRONT,
    { emissive: 0.3 }
  );
  for (let x = 3.6; x < 9.5; x += 0.55)
    k.box(x, x + 0.1, 0, 0.55, -3.3, -3.2, '#e2b02a', { col: false }); // 黃色短車阻
  k.box(-21, 0, -0.5, 0.05, -5.5, 0.5, c.MR.concrete, { col: false, surface: true }); // 汽車出入口前面的鋪面（s 39～60）
  // 汽車出入口（s 40～51.5，退到小屋立面線後面 5 m）：白色薄膜拱棚、入口橫樑一排標誌
  const x0 = -20,
    x1 = -8.5,
    zc = 5,
    zb = 17,
    n = 7,
    xm = (x0 + x1) / 2,
    R = (x1 - x0) / 2;
  const P = (a) => [xm - R * Math.cos(a), 3.2 + 3.0 * Math.sin(a)];
  for (let i = 0; i < n; i++) {
    const p = P((Math.PI * i) / n),
      q = P((Math.PI * (i + 1)) / n);
    const g = new c.THREE.BoxGeometry(Math.hypot(q[0] - p[0], q[1] - p[1]) + 0.06, 0.12, zb - zc);
    g.rotateZ(Math.atan2(q[1] - p[1], q[0] - p[0]));
    g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (zc + zb) / 2);
    k._part(c.VC, c.paintGeo(g, '#efeee6'));
  }
  for (const x of [x0, x1 - 0.2])
    for (const z of [zc, zb - 0.2]) k.box(x, x + 0.2, 0, 3.3, z, z + 0.2, '#8a8d90');
  k.box(x0, x1, 2.9, 3.6, zc - 0.1, zc, '#55585c', { col: false });
  k.plane(
    c.paint('中原國小\n地下停車場', '#c8202a', '#ffffff', null, 2.6, 0.9, 128),
    2.6,
    0.9,
    xm,
    3.3,
    zc - 0.12,
    c.FRONT,
    { emissive: 0.3 }
  );
  k.plane(
    c.paint('汽車入口', '#1f5fae', '#ffffff', null, 2.2, 0.5, 128),
    2.2,
    0.5,
    xm - 3.2,
    3.25,
    zc - 0.12,
    c.FRONT,
    { emissive: 0.3 }
  );
  k.plane(
    c.paint('汽車出口', '#1f5fae', '#ffffff', null, 2.2, 0.5, 128),
    2.2,
    0.5,
    xm + 3.2,
    3.25,
    zc - 0.12,
    c.FRONT,
    { emissive: 0.3 }
  );
};
// 右側：橘紅色波浪板小建築（弧形筒牆、深灰石柱與平屋頂、中間入口）
const orange = (k, c) => {
  for (let x = 0.2; x < c.w - 0.2; x += 0.45)
    if (x < 3.6 || x > 5.6)
      k.box(x, x + 0.22, 0.2, c.gf - 0.2, -0.2, -0.1, '#b8452e', { col: false });
  k.box(3.7, 5.5, 0, 2.5, -0.13, -0.1, '#2a2a2c', { col: false });
  for (const x of [-0.3, 3.3, 5.6, c.w])
    k.box(x, x + 0.3, 0, c.gf + 0.3, -0.35, 0.2, '#5a5a5c', { col: false });
  k.box(-0.5, c.w + 0.5, c.gf + 0.1, c.gf + 0.35, -0.9, c.d + 0.2, '#5a5a5c', { col: false });
};

// 小北百貨那棟大樓靠路口的一角：中北路街屋（7-ELEVEN 那一格）是斜的，跟這裡的第一格中間會空出一塊三角形，用幾個階梯狀的方塊補滿（畫在 s 30～36.3 那一格）
const xbCorner = (k, c) => {
  const W = c.wallMat('#e4e2dc');
  [
    [0, 3, 11.0],
    [3, 6, 9.6],
    [6, 9, 8.1],
    [9, 12, 6.7],
  ].forEach(([z0, z1, x1]) => k.box(c.w, x1, 0, c.top, z0, z1, W, { tile: [0.6, 0.6] }));
  hs(
    k,
    c,
    c.w + 0.3,
    10.8,
    c.gf + 2.4,
    c.gf + 7.6,
    '異國食品',
    '#2a2a2c',
    '#f4f4f0',
    'Import Food 小北熱賣中',
    { z: -0.12, em: 0.1 }
  ); // 轉角樓上的黑底白字大帆布
  k.box(c.w, 12.5, c.gf - 0.1, c.gf + 1.55, -0.7, 0, '#f2d21f', { col: false }); // 黃色橫招繞到轉角
  k.box(c.w, 12.5, c.gf - 0.1, c.gf + 0.14, -0.72, 0, '#1f3f9a', { col: false });
  k.plane(c.YHT.win(), 4.0, 2.6, c.w + 2.3, 1.5, -0.03, c.FRONT);
  for (const x of [c.w + 0.1, 11.9])
    k.box(x, x + 0.45, 0, c.gf - 0.1, -0.3, 0, '#f2d21f', { col: false });
  // 橫招上方斜掛的黃底直招「小北百貨」與藍底白字停車場指標 P
  side(
    k,
    c.ROWT.vert('sjS1xbV', '#f2d21f', '#1f3f9a', '小北百貨'),
    3.2,
    c.gf + 5.4,
    -1.3,
    1.15,
    4.8,
    '#2f9a5a'
  );
  side(
    k,
    c.paint('P', '#1f3f9a', '#ffffff', null, 1.6, 1.2, 96),
    3.2,
    c.gf + 2.3,
    -1.3,
    1.6,
    1.2,
    '#1f3f9a'
  );
};
// 小北百貨樓上外牆的兩塊白底紅字帆布「廣告外牆出租」
const xbAds = (k, c) => {
  for (const dy of [4.6, 7.5])
    hs(
      k,
      c,
      0.3,
      c.w - 0.3,
      c.gf + dy,
      c.gf + dy + 2.2,
      '廣告外牆出租',
      '#f4f4f0',
      '#d8362f',
      null,
      { z: -0.12, em: 0.1 }
    );
};

const T7 = { nf: 7, gf: 4.2, d: 10 }; // s 59～109 那排 7 層公寓：一樓加雨棚，招牌在雨棚上面
const XB = {
  nf: 10,
  gf: 3.6,
  wall: '#e4e2dc',
  ground: 'shop',
  noband: true,
  door: 0,
  bal: 'plain',
  d: 12,
  set: SET,
};
const YS = {
  nf: 8,
  gf: 4.4,
  fh: 3.1,
  wall: '#e6e6e2',
  noband: true,
  door: 0,
  bal: 'plain',
  d: 11,
  set: SET,
};
const KTV = { nf: 5, gf: 4.0, d: 10, set: SET, door: 0, bal: 'plain' }; // 右側崩潰潮玩／瘋時尚那棟 5 層樓

export default {
  // 街屋自己畫了招牌、data/cycu.json pois 裡也有同名的店（焦糖楓串燒、小螺莉螺螄粉、Innisfree、LE.select 只差空白或大小寫）
  ownSign: [
    '小北百貨',
    '加慕秀',
    '清心福全',
    '薯食好吃',
    '大中原滷味',
    '焦糖楓串燒',
    '小螺莉螺螄粉',
    'Innisfree',
    'LE.select',
    '餵 湯泡飯',
  ],
  drop: ['f1199', 'f1201'], // 由申甲、元氣眼鏡後面被壓到的填充樓
  // 中原國小圍牆（s 71～140）：矮牆、紅磚方柱（間距 3 m）、黑色鐵欄杆、整排大樹，牆外停滿機車；s 74.5～96.5 牆外多一道綠網圍籬加藍底彩繪板（s 85 以後網前只放交通錐，不停機車）。
  // s 28～39 是校舍旁的花台加綠網圍籬（底下同樣的藍底彩繪板），沒有紅磚柱。
  fences: [
    ['S', 28, 39, 1, { mesh: true, set: 6.6, tall: true }],
    [
      'S',
      71,
      140,
      1,
      {
        set: 7.6,
        bay: 3,
        shrub: 0,
        bikes: true,
        tall: true,
        mural: [[74.5, 96.5]],
        cones: [[85, 96.5]],
      },
    ],
  ],
  lots: [
    // ---- 左側（-1，東北）：s 30 起連續店面到大仁四街口 ----
    // 小北百貨沿實踐路的側面（路口那一格在 StreetZhongbei.js，只到 s≈30）；樓上是住宅大樓
    ['S', 30, 36.3, -1, { ...XB, extra: xbCorner }],
    ['S', 36.3, 42.6, -1, { ...XB, extra: xbAds }],
    ['S', 42.6, 48.9, -1, { ...XB, extra: xiaobei }],
    // s 48.9～49.7 是 0.8 m 的防火巷
    // 10 層粉白磁磚大樓：左半是地下停車場車道入口（2 樓外牆一塊白色帆布，字看不清楚不寫），右半一間滷味店（圓 logo 裡的店名看不清楚，不寫）
    [
      'S',
      49.7,
      54.4,
      -1,
      {
        nf: 10,
        gf: 3.6,
        wall: '#e6dcd8',
        ground: 'gate',
        sh: '#55585c',
        bal: 'plain',
        door: 0,
        noband: true,
        d: 12,
        set: SET,
        extra: (k, c) =>
          k.box(0.5, c.w - 0.5, c.gf + 0.3, c.gf + 2.6, -0.08, 0, '#eeeeea', { col: false }),
      },
    ],
    [
      'S',
      54.4,
      59.2,
      -1,
      {
        nf: 10,
        gf: 3.6,
        wall: '#e6dcd8',
        ground: 'shop',
        sign: ['', '#e9e2d2', '#6b5a48'],
        banner: ['秘制 滷肉飯 免費吃到飽', '#d8362f', '#ffe36a'],
        bal: 'plain',
        d: 12,
        set: SET,
        extra: (k, c) =>
          k.plane(
            c.roundSign('', '#efe8d8', '#8a7a66'),
            1.5,
            1.5,
            3.3,
            c.gf - 0.35,
            -0.34,
            c.FRONT,
            { transparent: true }
          ),
      },
    ],
    // 遠傳 FET：白底紅框大橫招、暗紅雨棚、左上一塊紅色凸出招牌、3 樓綠玻璃凸窗
    [
      'S',
      59.2,
      62.7,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'shop',
        can: '#8a2f3a',
        bal: 'grille',
        noband: true,
        set: SET,
      },
    ],
    [
      'S',
      62.7,
      66.2,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'shop',
        can: '#8a2f3a',
        bal: 'grille',
        noband: true,
        door: 0,
        set: SET,
        extra: all(
          sign(0, 5.8, -0.9, 0.6, '遠傳 FET', '#f4f4f2', '#3a3a3c', null, {
            edge: '#c8202a',
            m: 0.12,
            z: -0.5,
          }),
          (k, c) => k.box(5.95, 6.7, c.gf - 0.2, c.gf + 4.6, -0.9, -0.1, '#c8202a', { col: false }),
          bay(0.4, 2.8, 2)
        ),
      },
    ],
    // 浪漫（花店，招牌全文「浪漫心情 鮮花坊」）：粉紫灰橫招、米白帆布雨棚、桃紅色圓形側招（字看不清楚不寫）、2～3 樓綠玻璃
    [
      'S',
      66.2,
      69.2,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'open',
        can: '#e6dccb',
        sign: ['浪漫', '#cdb9c6', '#1c1c1c', '鮮花'],
        bal: 'plain',
        door: 0,
        set: SET,
        extra: all(bay(0.3, 2.7, 1, 2), round(0.12, 0.35, '', '#d6368a', '#ffffff', 1.1), (k) => {
          ['#e86a8a', '#f2c84a', '#8ac0e8', '#e88ac0', '#f08a4a'].forEach((col, j) =>
            k.box(
              0.3 + j * 0.5,
              0.65 + j * 0.5,
              0,
              0.9,
              -1.6 - (j % 2) * 0.4,
              -1.3 - (j % 2) * 0.4,
              col,
              { col: false }
            )
          );
        }),
      },
    ],
    // 加慕秀 HAIR SALON：炭灰橫招白字、灰米色雨棚、樓上白色鐵籠陽台、右端黑底白字直招
    [
      'S',
      69.2,
      73.8,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'shop',
        can: '#b9b3a8',
        bal: 'plain',
        noband: true,
        set: SET,
        extra: whiteCage,
      },
    ],
    [
      'S',
      73.8,
      78.4,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'shop',
        can: '#b9b3a8',
        bal: 'plain',
        noband: true,
        door: 0,
        set: SET,
        extra: all(
          whiteCage,
          sign(0, 9.0, -0.9, 0.15, '加慕秀', '#3c3d40', '#ffffff', 'HAIR SALON', { z: -0.35 }),
          vs(0.3, 3.4, '加慕秀', '#1c1c1c', '#ffffff', 1.15, -1.0)
        ),
      },
    ],
    // 小螺莉 螺螄粉：白底橘粉字、橘粉色帆布雨棚、門口攤車
    [
      'S',
      78.4,
      81.6,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'stall',
        can: '#e0906a',
        bal: 'plain',
        noband: true,
        set: SET,
      },
    ],
    [
      'S',
      81.6,
      84.9,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'stall',
        can: '#e0906a',
        bal: 'plain',
        noband: true,
        door: 0,
        set: SET,
        extra: all(
          sign(0.2, 6.3, -0.9, 0.15, '小螺莉 螺螄粉', '#f3efe8', '#d9825f', '真像肉・真有味', {
            z: -0.35,
          }),
          round(0.35, 0.9, '', '#ffffff', '#e58fa8', 0.8)
        ),
      },
    ],
    // FIFTY%：7 層公寓的 1～2 樓外面包一個白色方框（右邊柱子粗），2 樓整面玻璃，一樓黑色門楣白字、中間灰色鐵捲門兩側原木格柵，右柱上黑色方形側招 5/0
    [
      'S',
      84.9,
      92.3,
      -1,
      {
        ...T7,
        gf: 3.8,
        wall: '#e4e4e0',
        ground: 'shutter',
        sh: '#8d9094',
        bal: 'plain',
        noband: true,
        door: 0,
        set: SET,
        extra: (k, c) => {
          const yt = c.gf + c.fh + 0.3,
            Wt = '#efefec';
          k.box(1.2, c.w - 0.4, c.gf - 0.1, yt - 0.3, -0.5, 0, '#8fa3a8', { col: false }); // 2 樓玻璃
          for (let x = 2.5; x < c.w - 0.6; x += 1.3)
            k.box(x, x + 0.05, c.gf - 0.1, yt - 0.3, -0.53, -0.5, '#dfe3e3', { col: false });
          k.box(-0.05, c.w + 0.05, yt - 0.3, yt, -0.6, 0, Wt, { col: false });
          k.box(0, 1.2, 0, yt, -0.6, 0, Wt); // 白色方框的兩根柱子落地，擋人
          k.box(c.w - 0.4, c.w, 0, yt, -0.6, 0, Wt);
          hs(k, c, 1.2, c.w - 0.4, c.gf - 0.9, c.gf - 0.1, 'FIFTY %', '#1c1c1c', '#ffffff', null, {
            z: -0.55,
          });
          for (const x0 of [1.3, c.w - 2.3])
            for (let x = x0; x < x0 + 1.4; x += 0.22)
              k.box(x, x + 0.1, 0, c.gf - 0.9, -0.3, -0.2, '#b08a5a', { col: false });
          side(
            k,
            c.paint('5/0', '#1c1c1c', '#ffffff', null, 0.8, 0.8, 96),
            0.6,
            c.gf + 1.2,
            -1.05,
            0.8,
            0.8,
            '#1c1c1c'
          );
        },
      },
    ],
    // 焦糖楓 串燒：左邊是公寓大門，右邊黑框玻璃店面、綠色帆布雨棚，2 樓三塊白底黑字加一塊藍底黃字
    [
      'S',
      92.3,
      95,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'gate',
        sh: '#3a3d40',
        bal: 'plain',
        hood: '#5aa583',
        noband: true,
        door: 0,
        set: SET,
      },
    ],
    [
      'S',
      95,
      99.5,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'shop',
        can: '#2fa56a',
        bal: 'plain',
        hood: '#5aa583',
        noband: true,
        door: 0,
        set: SET,
        extra: (k, c) => {
          [
            ['焦', 3.5],
            ['糖', 2.8],
            ['楓', 2.1],
          ].forEach(([t, x]) =>
            hs(k, c, x, x + 0.7, c.gf - 0.95, c.gf + 0.15, t, '#f4f4f0', '#1c1c1c', null, {
              z: -0.25,
              m: 0.03,
            })
          );
          hs(k, c, 1.4, 2.1, c.gf - 0.95, c.gf + 0.15, '串\n燒', '#2a6a9a', '#f2d21f', null, {
            z: -0.25,
            m: 0.03,
          });
        },
      },
    ],
    // 有飲：淺灰底橘粉框、粉紅布條、左端圓角方形側招、3 樓綠玻璃凸窗
    [
      'S',
      99.5,
      104.3,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'shop',
        bal: 'plain',
        noband: true,
        set: SET,
        extra: all(
          sign(0.1, 4.7, -0.9, 0, '有飲', '#c9c9cc', '#3a3a3a', null, { edge: '#e58f6f', m: 0.1 }),
          (k, c) => {
            k.box(0.6, c.w - 1.2, c.gf - 1.6, c.gf - 1.1, -0.34, -0.3, '#f4b0c8', { col: false });
            side(
              k,
              c.paint('有飲', '#c9c9cc', '#3a3a3a', null, 1, 1, 96),
              c.w - 0.12,
              c.gf + 1.3,
              -0.85,
              1.1,
              1.1,
              '#c9c9cc'
            );
          },
          bay(0.6, 3.4, 2)
        ),
      },
    ],
    // 韓食（韓式炸雞專門店）：黃底紅字、灰褐色雨棚；樓上一塊暗紅底黃字直招，兩行直排「韓式炸雞」「辣炒年糕」
    [
      'S',
      104.3,
      108.5,
      -1,
      {
        ...T7,
        wall: '#e4e4e0',
        ground: 'stall',
        sign: ['韓食', '#e9b93a', '#c8202a', '韓式炸雞專門店'],
        can: '#6f6258',
        bal: 'plain',
        door: 0,
        set: SET,
        extra: (k, c) =>
          side(
            k,
            c.paint('辣 韓\n炒 式\n年 炸\n糕 雞', '#6a1a1a', '#f2d21f', null, 1.2, 3.0, 96),
            2.0,
            c.gf + 2.3,
            -0.95,
            1.2,
            3.0,
            '#6a1a1a'
          ),
      },
    ],
    // 康是美：兩層橘色橫招（2 樓那條右端白底藍字「藥」）、2 樓整排玻璃、左端橘底白字直招加白底藍字「藥」
    [
      'S',
      108.5,
      113.9,
      -1,
      {
        nf: 6,
        gf: 3.7,
        wall: '#c9c8c2',
        ground: 'shop',
        noband: true,
        door: 0,
        bal: 'plain',
        d: 10,
        set: SET,
      },
    ],
    [
      'S',
      113.9,
      119.3,
      -1,
      {
        nf: 6,
        gf: 3.7,
        wall: '#c9c8c2',
        ground: 'shop',
        noband: true,
        door: 0,
        bal: 'plain',
        d: 10,
        set: SET,
        extra: all(
          sign(0, 10.8, -0.95, 0.05, 'COSMED 康是美', '#f05a1e', '#ffffff', null, { z: -0.4 }),
          sign(0.9, 10.8, 2.15, 3.1, 'COSMED 康是美', '#f05a1e', '#ffffff', null, { z: -0.3 }),
          sign(0, 0.9, 2.15, 3.1, '藥', '#ffffff', '#2a6fb0', null, { z: -0.3 }),
          vs(10.6, 4.25, '康是美', '#f05a1e', '#ffffff', 1.25, -0.95),
          (k, c) =>
            side(
              k,
              c.paint('藥', '#ffffff', '#2a6fb0', null, 1.25, 1.25, 96, 'frame'),
              10.6,
              c.gf + 3.62,
              -0.95,
              1.25,
              1.25,
              '#2a6fb0'
            )
        ),
      },
    ],
    // 兩棟中間的綠色浪板鐵皮小屋，藍色鐵捲門貼紅紙「租」
    [
      'S',
      119.3,
      121.9,
      -1,
      {
        nf: 1,
        gf: 3.3,
        wall: '#5f8f7a',
        ground: 'shutter',
        sh: '#2f5f9a',
        door: 0,
        noband: true,
        tin: true,
        d: 5,
        set: SET,
        extra: (k, c) =>
          k.plane(
            c.paint('租', '#d8362f', '#1c1c1c', null, 0.5, 0.6, 96),
            0.5,
            0.6,
            c.w / 2,
            1.7,
            -0.05,
            c.FRONT
          ),
      },
    ],
    // 由申甲有限公司：8 層仿古典石材大樓（1～2 樓花崗石、粗石柱、石刻匾），左邊柱子上直招「家鄉碳烤雞排」
    [
      'S',
      121.9,
      127.1,
      -1,
      {
        ...YS,
        ground: 'shutter',
        sh: '#3a5a8a',
        extra: all(
          stone,
          greenWin(0.8, 4.4, 1.0, 2.3),
          railBal,
          vs(4.6, -1.1, '家鄉碳烤雞排', '#ece4d2', '#a03a2a', 0.62, -1.0)
        ),
      },
    ],
    [
      'S',
      127.1,
      132.4,
      -1,
      { ...YS, ground: 'shop', extra: all(stone, greenWin(0.6, 4.7, 1.3, 2.5), youshenjia) },
    ],
    [
      'S',
      132.4,
      137.5,
      -1,
      { ...YS, ground: 'open', extra: all(stone, greenWin(0.7, 4.3, 1.0, 2.3), railBal) },
    ],
    // 元氣の眼鏡：灰色清水模方盒、黑底白字橫招與直招、深灰雨棚
    [
      'S',
      137.5,
      143.6,
      -1,
      {
        nf: 6,
        gf: 4.2,
        wall: '#8f8f8d',
        ground: 'shop',
        sign: ['元氣の眼鏡', '#1e1e1e', '#ffffff'],
        can: '#5a5a58',
        bal: 'plain',
        vert: ['元氣の眼鏡', '#1e1e1e', '#ffffff'],
        d: 10,
        set: SET,
      },
    ],
    // 薯食好吃：米色磁磚窄樓、白底黑色毛筆字、門口烤物攤；隔壁牆上凸出一塊藍底白字「新世代 眼鏡中心」；淺藍圓招字看不清楚，只做色塊
    [
      'S',
      143.6,
      147.1,
      -1,
      {
        nf: 5,
        gf: 4.2,
        wall: '#d9cfb8',
        ground: 'stall',
        can: '#d8d6d0',
        bal: 'grille',
        noband: true,
        d: 10,
        set: SET,
      },
    ],
    [
      'S',
      147.1,
      150.6,
      -1,
      {
        nf: 5,
        gf: 4.2,
        wall: '#d9cfb8',
        ground: 'stall',
        can: '#d8d6d0',
        bal: 'grille',
        noband: true,
        door: 0,
        d: 10,
        set: SET,
        extra: all(
          sign(0.2, 5.6, -0.9, 0.15, '薯食好吃', '#eeeef2', '#1c1c1c', '馬鈴薯料理專賣店', {
            z: -0.35,
          }),
          (k, c) =>
            side(
              k,
              c.paint('新世代\n眼鏡中心', '#2a3f9a', '#ffffff', null, 1.9, 1.1, 96),
              6.3,
              c.gf + 1.9,
              -1.25,
              1.9,
              1.1,
              '#2a3f9a'
            ),
          round(0.3, 1.6, '', '#bfe0f0', '#5a9ac0', 0.9)
        ),
      },
    ],
    // 清心福全：深綠底白字、右端綠底圓角方招、3 樓窗外白底綠字「耀元不動產」
    [
      'S',
      150.6,
      156.5,
      -1,
      {
        nf: 5,
        gf: 4.2,
        wall: '#dcdcd6',
        ground: 'stall',
        sign: ['清心福全', '#2f6a4a', '#ffffff'],
        can: '#d8d6d0',
        bal: 'plain',
        d: 10,
        set: SET,
        extra: all(
          (k, c) =>
            side(
              k,
              c.paint('清心\n福全', '#2f6a4a', '#ffffff', null, 1, 1, 96),
              0.15,
              c.gf + 1.2,
              -0.85,
              1.0,
              1.0,
              '#2f6a4a'
            ),
          (k, c) =>
            hs(
              k,
              c,
              0.9,
              c.w - 0.9,
              c.gf + c.fh + 0.1,
              c.gf + c.fh + 0.7,
              '耀元不動產',
              '#ffffff',
              '#2f7a4a',
              null,
              { z: -0.1, em: 0.15 }
            )
        ),
      },
    ],
    // 龜記 GUIJI：紅磚色磁磚樓、墨綠灰橫招米色字、墨綠雨棚、右上紅底圓招（裡面是龜形 logo，不寫字）、4～5 樓一塊米色直招（字看不清楚，只做色塊）
    [
      'S',
      156.5,
      160,
      -1,
      {
        nf: 5,
        gf: 4.2,
        wall: '#b87058',
        ground: 'shop',
        can: '#3f5a4e',
        bal: 'grille',
        noband: true,
        d: 10,
        set: SET,
      },
    ],
    [
      'S',
      160,
      163.5,
      -1,
      {
        nf: 5,
        gf: 4.2,
        wall: '#b87058',
        ground: 'shop',
        can: '#3f5a4e',
        bal: 'grille',
        noband: true,
        door: 0,
        d: 10,
        set: SET,
        extra: all(
          sign(0, 7.0, -0.9, 0.3, 'GUIJI 龜記', '#3f4a44', '#e8dcc0', '中壢中原店', {
            z: -0.35,
            edge: '#e8dcc0',
            m: 0.05,
          }),
          round(1.6, 2.6, '', '#c8322f', '#ffffff', 1.2, -1.0),
          slab(3.2, 6.6, 10.2, '#d8d0b0', -1.0, -0.2)
        ),
      },
    ],
    // innisfree：同一棟紅磚樓，1～2 樓被鮮綠色門面包住
    [
      'S',
      163.5,
      166.8,
      -1,
      {
        nf: 5,
        gf: 4.2,
        wall: '#b87058',
        ground: 'shop',
        noband: true,
        door: 0,
        bal: 'plain',
        d: 10,
        set: SET,
      },
    ],
    [
      'S',
      166.8,
      170.1,
      -1,
      {
        nf: 5,
        gf: 4.2,
        wall: '#b87058',
        ground: 'shop',
        noband: true,
        door: 0,
        bal: 'plain',
        d: 10,
        set: SET,
        extra: innisfree,
      },
    ],
    // LE.SELECT：一層樓，上面一整條卡其色浪板看板、炭灰雨棚、紅色布條
    [
      'S',
      170.1,
      177.5,
      -1,
      {
        nf: 1,
        gf: 3.2,
        wall: '#8a8880',
        ground: 'shutter',
        sh: '#3a3a3c',
        noband: true,
        can: '#4a4a4a',
        canO: { top: 0.15, drop: 0.6 },
        door: 0,
        d: 8,
        set: SET,
        extra: (k, c) => {
          hs(k, c, 0, c.w, c.gf - 0.1, c.gf + 1.5, 'LE.SELECT', '#a9a583', '#f2f2f0', null, {
            z: -0.35,
            m: 0.2,
          });
          k.plane(
            c.paint('清倉大特價 全部六折', '#d8362f', '#ffffff', null, 4.2, 0.62, 128),
            4.2,
            0.62,
            2.3,
            2.12,
            -2.3,
            c.FRONT,
            { emissive: 0.15, double: true }
          ); // 掛在雨棚前緣下面的紅布條
          k.box(4.8, 6.9, 0, 1.45, -2.1, -1.0, '#6a5040', { col: false }); // 門口蓋著咖啡色帆布的攤車
          k.box(4.7, 7.0, 1.55, 2.1, -2.12, -2.06, '#e2c23a', { col: false });
          k.plane(
            c.paint('地瓜球 地瓜薯條', '#e2c23a', '#1c1c1c', null, 2.24, 0.49, 128),
            2.24,
            0.49,
            5.85,
            1.825,
            -2.13,
            c.FRONT,
            { emissive: 0.2 }
          );
        },
      },
    ],
    // 兩間店中間的攤位（黃、綠帆布棚；小招牌字看不清楚）
    [
      'S',
      177.5,
      179.5,
      -1,
      {
        nf: 1,
        gf: 2.8,
        wall: '#7a7a74',
        ground: 'stall',
        awn: ['#e2c02a', '#3f8a4a'],
        noband: true,
        door: 0,
        d: 4,
        set: SET,
      },
    ],
    // 捲髮奶奶 鮮奶脆皮甜甜圈：粉膚色橫招深藍字、深藍鐵捲門、屋頂深藍看板 Curly MaMa's、紅白條紋小雨棚
    [
      'S',
      179.5,
      185.3,
      -1,
      {
        nf: 1,
        gf: 3.3,
        wall: '#e8e4dc',
        ground: 'shutter',
        sh: '#24427f',
        sign: ['鮮奶脆皮甜甜圈', '#f0c4b4', '#2a3a78', '捲髮奶奶'],
        awn: ['#d8362f', '#ffffff'],
        roof: 'bill',
        bill: ["Curly MaMa's", '#1f2a5a', '#ffffff', 5.4, 1.7],
        banner: ['捲髮奶奶 中原店 全新開幕', '#ffffff', '#d8362f'],
        door: 0,
        d: 8,
        set: SET,
      },
    ],
    // 鐵三中（柳州螺螄粉）：2 樓深咖啡色木條板，前面一大塊藍綠色招牌銀白字（店名跟 data/cycu.json 的 POI「鐵三中螺螄粉 中原店」對得上）
    [
      'S',
      185.3,
      189,
      -1,
      {
        nf: 2,
        gf: 3.0,
        wall: '#4a3a30',
        ground: 'shop',
        noband: true,
        door: 0,
        bal: 'plain',
        d: 8,
        set: SET,
        extra: (k, c) =>
          hs(k, c, 0.15, c.w - 0.15, 2.9, 5.4, '鐵三中', '#6fc3c0', '#f4f4f4', '柳州 螺螄粉', {
            z: -0.4,
            m: 0.15,
          }),
      },
    ],
    // s 189～190.2 窄縫（電線桿、電箱）
    // 咖啡色磁磚窄樓：灰色鐵捲門，每層一個凸出的白色鐵窗陽台，沒有招牌
    [
      'S',
      190.2,
      193.9,
      -1,
      {
        nf: 5,
        wall: '#8a5f52',
        ground: 'shutter',
        sh: '#a8aaac',
        bal: 'plain',
        noband: true,
        d: 10,
        set: SET,
        extra: whiteCage,
      },
    ],
    // 大中原滷味：路口轉角的深紫黑色鐵皮攤位，電線桿旁一塊黑底白字圓招
    [
      'S',
      193.9,
      199,
      -1,
      {
        nf: 1,
        gf: 3.0,
        wall: '#2a2440',
        ground: 'stall',
        sign: ['大中原 滷味', '#2a2440', '#ffffff'],
        tin: true,
        door: 0,
        d: 6,
        set: SET,
        extra: (k, c) => {
          k.cyl(c.w - 0.5, -0.9, 0.14, 0, 7.5, '#6a6a68', { seg: 8 });
          k.plane(
            c.roundSign('大中原滷味', '#1c1c1c', '#ffffff'),
            1.6,
            1.6,
            c.w - 1.5,
            5.6,
            -1.0,
            c.FRONT,
            { transparent: true, emissive: 0.3 }
          );
        },
      },
    ],

    // ---- 右側（+1，西南）：國小圍牆以外的幾棟 ----
    // 中原國小地下停車場的行人出入口小屋（退縮），extra 連北邊的汽車出入口薄膜棚一起畫
    [
      'S',
      60,
      70,
      1,
      {
        nf: 1,
        gf: 3.2,
        wall: '#6a6a66',
        ground: 'shop',
        noband: true,
        door: 0,
        d: 5,
        set: 9.5,
        roofCol: '#6a6d70',
        extra: all(blank('#6a6a66'), kiosk),
      },
    ],
    // 橘紅色波浪板小建築（退縮約 9 m；看起來是公廁／通學步道入口）
    [
      'S',
      141,
      150,
      1,
      {
        nf: 1,
        gf: 3.4,
        wall: '#d2553a',
        ground: 'shop',
        noband: true,
        door: 0,
        d: 5,
        set: 13,
        roofCol: '#5a5a5c',
        extra: all(blank('#d2553a'), orange),
      },
    ],
    // 大樹下的老舊鐵皮攤棚（招牌字都看不清楚，不寫）
    [
      'S',
      152,
      158.5,
      1,
      {
        nf: 1,
        gf: 2.8,
        wall: '#6f6a62',
        ground: 'stall',
        tin: true,
        noband: true,
        door: 0,
        can: '#5a7a9a',
        canO: { top: 0.3, drop: 0.4, out: 1.5 },
        d: 4,
        set: SET,
      },
    ],
    [
      'S',
      158.5,
      165,
      1,
      {
        nf: 1,
        gf: 2.8,
        wall: '#6f6a62',
        ground: 'stall',
        tin: true,
        noband: true,
        door: 0,
        can: '#3f8a4a',
        canO: { top: 0.3, drop: 0.4, out: 1.5 },
        d: 4,
        set: SET,
      },
    ],
    // 5 層大樓北半：灰色洗石子柱加深紅色窗間牆。餵 湯泡飯（綠色帆布雨棚、2 樓咖啡色方形側招「餵」）、崩潰潮玩 COLLAPSE TOYS、瘋時尚 24H TV（樓上一大塊藍色看板）
    [
      'S',
      165,
      168.6,
      1,
      {
        ...KTV,
        wall: '#8f8680',
        ground: 'shutter',
        sh: '#8d9094',
        sign: ['餵 湯泡飯', '#55504c', '#ffffff'],
        can: '#3f9a6a',
        extra: (k, c) =>
          side(
            k,
            c.paint('餵', '#4a3a36', '#ffffff', null, 1.3, 1.5, 96),
            c.w - 0.4,
            c.gf + 1.9,
            -1.1,
            1.3,
            1.5,
            '#4a3a36'
          ),
      },
    ],
    [
      'S',
      168.6,
      173,
      1,
      {
        ...KTV,
        wall: '#8f8680',
        ground: 'shutter',
        sh: '#55585c',
        sign: ['崩潰潮玩', '#efe6d0', '#1c1c1c', 'COLLAPSE TOYS'],
        can: '#3f6aa0',
        extra: all(round(0.2, 1.5, '崩潰潮玩', '#f0c83a', '#1c1c1c', 1.3, -1.0), (k, c) => {
          k.box(0.5, c.w - 0.5, 0, 0.25, -1.3, 0, '#e8c82a', { col: false });
          k.box(0.5, c.w - 0.5, 0.25, 0.5, -0.8, 0, '#e8c82a', { col: false });
        }),
      },
    ],
    [
      'S',
      173,
      176.5,
      1,
      {
        ...KTV,
        wall: '#8f8680',
        low: '#c8322f',
        ground: 'open',
        sign: ['瘋時尚 24H TV', '#2a4a9a', '#ffffff', '影音多媒體／歡唱／餐點／飲品'],
        extra: sign(-0.9, 4.1, 0.3, 4.3, '瘋時尚\n24H KTV', '#2f4f9a', '#ffffff', null, {
          z: -0.5,
          m: 0.12,
        }),
      },
    ],
    // 同一棟的南半：深咖啡色磁磚，一樓攤位加綠色帆布雨棚；轉角 2 樓一圈藍色大看板「瘋時尚 KTV」、紅色直招「中源大戲院」
    [
      'S',
      176.5,
      181.5,
      1,
      {
        ...KTV,
        wall: '#6a4a40',
        ground: 'stall',
        can: '#3f8a4a',
        noband: true,
        extra: (k, c) =>
          side(
            k,
            c.paint('妹妹美甲', '#4a2a6a', '#ffffff', null, 2.0, 0.8, 96),
            1.8,
            c.gf + 0.9,
            -1.2,
            2.0,
            0.8,
            '#4a2a6a'
          ),
      },
    ], // 2 樓凸出的紫底白字側招
    [
      'S',
      181.5,
      186.5,
      1,
      { ...KTV, wall: '#6a4a40', ground: 'stall', can: '#3f8a4a', noband: true },
    ],
    [
      'S',
      186.5,
      191.5,
      1,
      { ...KTV, wall: '#6a4a40', ground: 'stall', can: '#3f8a4a', noband: true },
    ],
    // 日新路口轉角（街屋蓋到 s 195，再過去是日新路的路面）
    [
      'S',
      191.5,
      195,
      1,
      {
        ...KTV,
        wall: '#6a4a40',
        ground: 'stall',
        can: '#3f8a4a',
        noband: true,
        extra: all(
          sign(-6.5, 3.5, 0.2, 3.4, '瘋時尚 KTV', '#2f4f9a', '#ffffff', null, {
            z: -0.95,
            m: 0.15,
          }),
          (k, c) =>
            k.box(c.w, c.w + 0.25, c.gf + 0.2, c.gf + 3.4, -0.95, 7, '#2f4f9a', { col: false }),
          vs(3.2, 3.6, '中源大戲院', '#c8202a', '#ffe36a', 0.8, -0.7)
        ),
      },
    ],
  ].map(withCan),
};
