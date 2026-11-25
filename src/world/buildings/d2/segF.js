// 大仁二街 F 段：西北側 s 121～157（柏德廣場往西南到實踐路／弘揚路口）。街景 2024-08（路口 2026-05）、國土測繪 2024 正射。
// 由東北往西南：11 號灰色花崗石 4 層透天、9 號退縮的白磁磚 3 層（門前車棚）、7 號 FADEOS（前 2 層＋後段綠鐵皮）、
// 5 號磚紅 4 層（美鞋澡堂／印象派攝影）、轉角白磁磚樓（阿迪早點＋1 號大門）、轉角一層木造小屋（永祿小吃）。
// 每一格都用 nf:1 的素殼（gf＝總高），立面全部在 custom 裡自己畫；一樓門面在 off 4.0，凸出物不超過 off 3.2。
const FONT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const SERIF = (px, w = 700) => `${w} ${px}px "Noto Serif TC","Songti TC","PMingLiU",Georgia,serif`;
const RT = Math.PI / 2;
const NC = { col: false },
  TL = { col: false, tile: [0.6, 0.6] },
  TC = { tile: [0.6, 0.6] };
const morph = (g, fn) => {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = fn(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, v[0], v[1], v[2]);
  }
  g.computeVertexNormals();
  return g;
};
// 單斜：dir 是低的那一邊（f 街道側、b 後側、l x0 側、r x1 側），低邊高度 y0+th
const slope = (k, x0, x1, y0, y1, z0, z1, hex, dir = 'f', th = 0.1) => {
  const ym = (y0 + y1) / 2,
    xm = (x0 + x1) / 2,
    zm = (z0 + z1) / 2;
  return morph(k.box(x0, x1, y0, y1, z0, z1, hex, NC), (x, y, z) => {
    if (y < ym) return [x, y, z];
    const low = dir === 'f' ? z < zm : dir === 'b' ? z > zm : dir === 'l' ? x < xm : x > xm;
    return [x, low ? y0 + th : y1, z];
  });
};
// 山牆：axis 'z' = 屋脊順著 z（三角形朝街），'x' = 屋脊順著立面
const gable = (k, x0, x1, y0, y1, z0, z1, hex, axis = 'z') => {
  const ym = (y0 + y1) / 2,
    xm = (x0 + x1) / 2,
    zm = (z0 + z1) / 2;
  return morph(k.box(x0, x1, y0, y1, z0, z1, hex, NC), (x, y, z) =>
    y < ym ? [x, y, z] : axis === 'z' ? [xm, y, z] : [x, y, zm]
  );
};
// ---- 貼圖 ----
const lattice = (T, cols, rows, frame, glass, fw = 0.14) =>
  T.sg(`d2F_lat|${cols}|${rows}|${frame}|${glass}|${fw}`, cols * 48, rows * 48, (g) => {
    const f = 48 * fw;
    g.fillStyle = frame;
    g.fillRect(0, 0, cols * 48, rows * 48);
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const x = c * 48 + f / 2,
          y = r * 48 + f / 2,
          s = 48 - f;
        g.fillStyle = glass;
        g.fillRect(x, y, s, s);
        g.fillStyle = 'rgba(255,255,255,.10)';
        g.fillRect(x, y, s * 0.35, s);
      }
  });
// 半圓拱窗（放射狀窗櫺，背景透明）
const archTex = (T, frame, glass, spokes = 5) =>
  T.sg(`d2F_arch|${frame}|${glass}|${spokes}`, 256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    g.beginPath();
    g.moveTo(4, 128);
    g.arc(128, 128, 124, Math.PI, 0);
    g.closePath();
    g.fillStyle = glass;
    g.fill();
    g.strokeStyle = frame;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(128, 128, 118, Math.PI, 0);
    g.stroke();
    g.lineWidth = 5;
    for (let i = 1; i < spokes; i++) {
      const a = (Math.PI * i) / spokes;
      g.beginPath();
      g.moveTo(128 - Math.cos(a) * 38, 128 - Math.sin(a) * 38);
      g.lineTo(128 - Math.cos(a) * 118, 128 - Math.sin(a) * 118);
      g.stroke();
    }
    g.beginPath();
    g.arc(128, 128, 38, Math.PI, 0);
    g.stroke();
    g.fillStyle = frame;
    g.fillRect(0, 121, 256, 7);
  });
// 拱形開口／拱形小窗（下方矩形＋上方半圓，背景透明）：top 是頂部的顏色（陽台天花）
const archOpen = (T, key, body, top, frame) =>
  T.sg(`d2F_ao|${key}`, 128, 192, (g) => {
    g.clearRect(0, 0, 128, 192);
    g.beginPath();
    g.moveTo(4, 192);
    g.lineTo(4, 64);
    g.arc(64, 64, 60, Math.PI, 0);
    g.lineTo(124, 192);
    g.closePath();
    const gr = g.createLinearGradient(0, 0, 0, 192);
    gr.addColorStop(0, top);
    gr.addColorStop(0.3, top);
    gr.addColorStop(0.42, body);
    gr.addColorStop(1, body);
    g.fillStyle = gr;
    g.fill();
    if (frame) {
      g.strokeStyle = frame;
      g.lineWidth = 6;
      g.stroke();
      g.beginPath();
      g.moveTo(64, 6);
      g.lineTo(64, 192);
      g.moveTo(4, 70);
      g.lineTo(124, 70);
      g.stroke();
    }
  });
// 一排直條欄杆（背景透明）
const railTex = (T, n, col) =>
  T.sg(`d2F_rail|${n}|${col}`, n * 16, 64, (g) => {
    g.clearRect(0, 0, n * 16, 64);
    g.fillStyle = col;
    for (let i = 0; i < n; i++) g.fillRect(i * 16 + 6, 0, 4, 64);
    g.fillRect(0, 0, n * 16, 6);
    g.fillRect(0, 56, n * 16, 8);
  });
const flat = (T, key, W, H, draw) => T.sg(`d2F_${key}`, W, H, draw);
const spaced = (g, text, cx, y, step) => {
  const t = [...text];
  t.forEach((c, i) => g.fillText(c, cx + (i - (t.length - 1) / 2) * step, y));
};
// ---- 小東西 ----
const pot = (k, T, x, z, h = 0.7, r = 0.3, potCol = '#8a5a44') => {
  k.cyl(x, z, r * 0.6, 0.05, 0.4, potCol, { r1: r * 0.75, seg: 8 });
  k.cyl(x, z, r, 0.4, 0.4 + h, T.MR.plant, { r1: r * 0.55, seg: 7 });
};
// 立在路邊的雙面立牌（垂直街道，從兩個方向都讀得到）
const standBoard = (k, tex, x, z, w, h, frame = '#3a3a3c') => {
  k.box(x - 0.03, x + 0.03, 0.05, h + 0.15, z - w / 2, z + w / 2, frame, NC);
  for (const sd of [-1, 1])
    k.plane(tex, w - 0.06, h - 0.06, x + sd * 0.035, 0.15 + h / 2, z, sd * RT, { emissive: 0.15 });
};
// 車頭朝 +z（朝屋內）→ 交給統一停放車輛系統
const car = (k, x0, x1, z0, z1, hex) => k.car((x0 + x1) / 2, (z0 + z1) / 2, 0, hex);

// 後牆的窗（從後面或高處看才不會是一整面素牆）
const backWins = (k, T, ys, n = 2) => {
  for (const y of ys)
    for (let j = 0; j < n; j++)
      k.plane(T.YHT.win(), 1.5, 1.1, (T.w * (j + 0.5)) / n, y, T.d + 0.03, 0);
};

// ---------------- 11 號：灰色花崗石 4 層透天 ----------------
function house11(k, T) {
  const { w, top, FRONT } = T,
    G = T.wallMat('#8e8e8b'),
    GZ = -1.6,
    BK = '#0e0e10';
  k.box(0, w, 3.25, top, -0.14, 0, G, TL);
  // 一樓：兩端花崗石門柱、整面黑色鐵格柵門（後面是深色鏡面玻璃）、淺灰平頂雨庇
  k.box(0, 0.6, 0, 3.05, GZ, 0, G, TC);
  k.box(w - 0.6, w, 0, 3.05, GZ, 0, G, TC);
  k.box(0.6, w - 0.6, 0, 3.05, GZ + 0.1, 0, '#15181b');
  k.plane(lattice(T, 12, 6, BK, '#39464e', 0.16), 4.8, 2.25, 4.0, 1.28, GZ + 0.08, FRONT);
  k.plane(lattice(T, 16, 3, BK, '#4a4038', 0.16), 4.8, 0.52, 4.0, 2.74, GZ + 0.08, FRONT);
  for (const x of [1.55, 2.8, 4.0, 5.2, 6.45])
    k.box(x - 0.05, x + 0.05, 0.1, 3.05, GZ + 0.02, GZ + 0.1, BK, NC);
  k.box(1.5, 6.5, 2.4, 2.5, GZ + 0.02, GZ + 0.1, BK, NC);
  k.box(0, w, 3.05, 3.3, -2.2, 0, '#b5b5b0', NC);
  k.plane(
    T.paint('11', '#c8202c', '#ffffff', null, 0.26, 0.2),
    0.26,
    0.2,
    0.3,
    1.7,
    GZ - 0.01,
    FRONT
  );
  k.box(w - 0.5, w - 0.15, 1.2, 1.6, GZ - 0.1, GZ, '#1c1c1e', NC); // 黑色信箱
  k.box(0.2, w - 0.2, 0.05, 0.16, -2.55, GZ, '#b3b1ab', { col: false, surface: true }); // 門前台階
  // 「請勿停車」活動護欄、盆栽
  k.box(3.0, 4.3, 0.16, 0.2, -2.42, -2.1, '#1c1c1e', NC);
  k.plane(
    T.paint('請勿停車', '#1c1c1e', '#ffffff', 'NO PARKING', 1.3, 0.56),
    1.3,
    0.56,
    3.65,
    0.48,
    -2.3,
    FRONT
  );
  k.box(3.0, 4.3, 0.2, 0.76, -2.29, -2.25, '#1c1c1e', NC);
  pot(k, T, 1.0, -2.1, 0.9, 0.32, '#5a5a5c');
  pot(k, T, 5.6, -2.15, 0.5, 0.24, '#b0402c');
  // 2F：牆面內縮，深色鋁窗＋窄長窗，上面一片遮陽板；兩側花崗石直柱
  k.plane(lattice(T, 4, 1, '#2a2c2e', '#4d5c63', 0.07), 3.5, 1.8, 2.9, 4.75, -0.16, FRONT);
  k.plane(lattice(T, 1, 1, '#2a2c2e', '#3a474d', 0.1), 0.6, 1.9, 5.6, 4.7, -0.16, FRONT);
  k.box(0.55, w - 0.55, 5.95, 6.05, -0.9, 0, '#a5a5a0', NC);
  k.box(0, 0.55, 3.3, 9.9, -1.0, 0, G, TL);
  k.box(w - 0.55, w, 3.3, 9.9, -1.0, 0, G, TL);
  // 3F：凸出的玻璃陽光屋（上半霧面 6 片、下半透明欄板 3 片）
  k.box(0.55, w - 0.55, 6.2, 6.6, -1.0, 0, G, TL);
  k.box(0.55, w - 0.55, 6.6, 9.6, -0.95, 0, '#9fb5ab', NC);
  k.plane(
    flat(T, 'sunroom', 384, 192, (g) => {
      g.fillStyle = '#e4e7e3';
      g.fillRect(0, 0, 384, 192);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = '#c6d6cf';
        g.fillRect(i * 64 + 3, 4, 58, 112);
        g.fillStyle = 'rgba(255,255,255,.3)';
        g.fillRect(i * 64 + 6, 8, 18, 104);
      }
      for (let i = 0; i < 3; i++) {
        g.fillStyle = '#7b978d';
        g.fillRect(i * 128 + 3, 122, 122, 66);
        g.fillStyle = 'rgba(255,255,255,.16)';
        g.fillRect(i * 128 + 8, 126, 40, 58);
      }
    }),
    w - 1.1,
    3.0,
    w / 2,
    8.1,
    -0.96,
    FRONT
  );
  k.box(0, w, 9.6, 9.9, -1.05, 0, G, TL);
  // 4F：退縮的一排玻璃
  k.plane(lattice(T, 6, 1, '#dfe3e0', '#8fa7a0', 0.06), w - 1.2, 2.2, w / 2, 11.2, -0.16, FRONT);
  k.box(0, w, 12.65, top, -0.22, 0, G, TL);
  // 東北側（面窄縫）：灰牆上掛冷氣室外機與生鏽鐵架；窄縫口的電線桿
  for (const [z, y] of [
    [0.5, 3.7],
    [0.5, 1.1],
    [1.7, 2.3],
  ]) {
    k.box(-0.42, 0, y, y + 0.75, z, z + 0.95, T.MR.ac, NC);
    k.box(-0.46, 0, y - 0.08, y, z - 0.05, z + 1.0, '#7a4a2c', NC);
  }
  k.cyl(-0.45, -2.15, 0.16, 0, 9.5, '#a09e96', { seg: 8, col: true });
  backWins(k, T, [1.5, 4.7, 7.9, 11.1]);
}

// ---------------- 9 號：退縮的白磁磚 3 層舊透天，門前鐵架車棚 ----------------
function house9(k, T) {
  const { w, d, top, FRONT } = T,
    W = T.wallMat('#e9e7df'),
    red = '#b5432e',
    CZ = -3.5;
  k.box(0, w, 3.0, top, -0.14, 0, W, TL);
  k.box(0, w, 0, 3.0, -0.14, 0, T.wallMat('#9fd0c4'), TL);
  // 一樓：青綠磁磚牆、鐵窗、鐵門、門牌 9
  k.plane(T.YHT.win(), 1.5, 1.5, 1.2, 1.65, -0.16, FRONT);
  k.box(2.35, 3.3, 0.05, 2.15, -0.18, -0.14, '#3c4044', NC);
  k.box(2.42, 3.23, 1.2, 2.05, -0.19, -0.18, '#55606a', NC);
  k.plane(T.paint('9', '#2f6fb3', '#ffffff', null, 0.2, 0.16), 0.2, 0.16, 2.15, 1.95, -0.16, FRONT);
  // 車棚：灰色平頂、正面木色桁架、細柱
  k.box(0, w, 2.7, 2.9, CZ, 0, '#b8b8b2', NC);
  for (const x of [0.07, w - 0.07]) k.cyl(x, CZ + 0.07, 0.05, 0, 2.7, '#8a6a4a', { seg: 6 });
  k.plane(
    flat(T, 'truss', 256, 40, (g) => {
      g.clearRect(0, 0, 256, 40);
      g.strokeStyle = '#9a5f2e';
      g.lineWidth = 5;
      g.strokeRect(2, 3, 252, 34);
      g.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.moveTo(i * 32, i % 2 ? 4 : 36);
        g.lineTo(i * 32 + 32, i % 2 ? 36 : 4);
        g.stroke();
      }
    }),
    w,
    0.5,
    w / 2,
    2.44,
    CZ,
    FRONT,
    { transparent: true, double: true }
  );
  // 西南邊的半圓拱形矮鐵門
  k.plane(
    flat(T, 'lowgate', 128, 96, (g) => {
      g.clearRect(0, 0, 128, 96);
      g.strokeStyle = '#1c1c1e';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(4, 96);
      g.lineTo(4, 62);
      g.arc(64, 62, 60, Math.PI, 0);
      g.lineTo(124, 96);
      g.stroke();
      g.lineWidth = 3;
      for (let x = 16; x < 124; x += 12) {
        const dy = Math.sqrt(Math.max(0, 3600 - (x - 64) * (x - 64)));
        g.beginPath();
        g.moveTo(x, 96);
        g.lineTo(x, 62 - dy);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(4, 90);
      g.lineTo(124, 90);
      g.stroke();
    }),
    1.7,
    1.2,
    2.75,
    0.65,
    CZ - 0.03,
    FRONT,
    { transparent: true, double: true }
  );
  // 棚下：橘色休旅車（車頭朝內）、機車、盆栽、黃色球形燈
  car(k, 0.3, 2.05, -4.25, -0.35, '#c8641e');
  T.bike(k, 2.75, -2.3, 1, '#2a2a30');
  pot(k, T, 3.3, -0.5, 0.6, 0.25);
  pot(k, T, 2.3, -0.45, 0.45, 0.2, '#c9c2b0');
  k.cyl(2.2, -3.9, 0.04, 0.05, 0.35, '#3a3a3c', { seg: 6 });
  k.cyl(2.2, -3.9, 0.17, 0.35, 0.65, '#e8c21e', { seg: 8, r1: 0.1 });
  // 2F：大半圓拱窗＋冷氣
  k.plane(archTex(T, '#e9e7df', '#4b5357', 5), 2.4, 1.3, w / 2, 4.55, -0.16, FRONT, {
    transparent: true,
  });
  T.ac(k, 0.1, 3.75, -0.55);
  // 3F：往外挑的陽台（弧形收邊）、白色欄杆、拱形開口、右邊鐵窗
  k.box(0, w, 5.95, 6.2, -1.2, 0, '#eeeeea', NC);
  k.box(0.2, w - 0.2, 5.72, 5.95, -0.8, 0, '#e4e4df', NC);
  k.box(0.4, w - 0.4, 5.52, 5.72, -0.4, 0, '#dcdcd6', NC);
  k.box(0, w, 7.1, 7.2, -1.2, -1.1, '#f4f4f0', NC);
  k.plane(railTex(T, 22, '#f4f4f0'), w, 0.9, w / 2, 6.65, -1.15, FRONT, {
    transparent: true,
    double: true,
  });
  for (const x of [0, w - 0.3]) k.box(x, x + 0.3, 6.2, top, -1.2, 0, W, TL);
  k.box(0, w, 8.55, top, -1.2, 0, W, TL);
  k.plane(archOpen(T, 'b9', '#3a3835', '#c9c2b4'), 1.9, 2.5, 2.45, 7.5, -0.16, FRONT, {
    transparent: true,
  });
  k.plane(T.litWin(true), 0.9, 1.2, 0.7, 7.55, -0.16, FRONT, { emissive: 0.5 });
  // 紅瓦斜頂＋正中的白色小山牆
  gable(k, -0.1, w + 0.1, top, top + 1.5, -1.6, d, red, 'x');
  gable(k, 0.95, 2.75, top, top + 1.2, -1.72, 1.4, red, 'z');
  gable(k, 1.1, 2.6, top, top + 0.98, -1.76, -1.7, '#f0efea', 'z');
  backWins(k, T, [1.5, 4.6, 7.6], 1);
}

// ---------------- 7 號：FADEOS 芙蒂絲保養美學（前 2 層＋後段 3F 綠色鐵皮棚）----------------
function fadeos(k, T) {
  const { w, d, top, FRONT } = T,
    BK = '#1b1b1c',
    BZ = '#2b2622';
  k.box(0, w, 0, 2.9, -0.14, 0, BK, NC);
  k.box(0, w, 2.9, top, -0.14, 0, BZ, NC);
  // 一樓：藍色鐵捲門（拉下）、右邊上樓的黑門與門牌 7、門楣投射燈
  k.plane(T.shutterTex('#2f6fb3'), 3.4, 2.5, 3.45, 1.3, -0.15, FRONT);
  k.box(1.7, w - 0.05, 2.55, 2.75, -0.24, -0.14, '#232325', NC);
  k.box(0.4, 1.4, 0.05, 2.15, -0.17, -0.14, '#2c2c30', NC);
  k.box(1.22, 1.28, 1.0, 1.2, -0.2, -0.17, '#b9bdc0', NC);
  k.plane(
    T.paint('7', '#e9a9b8', '#7a1c2c', null, 0.24, 0.18),
    0.24,
    0.18,
    1.55,
    2.35,
    -0.15,
    FRONT
  );
  for (const x of [1.3, 2.5, 3.7, 4.9])
    k.box(x - 0.06, x + 0.06, 2.7, 2.84, -0.34, -0.14, '#111111', NC);
  k.cyl(0.85, -0.16, 0.08, 2.5, 2.52, '#c9a24a', { seg: 8 });
  // 斜掛的白底橫招（上緣往前傾）
  morph(k.box(0.1, w - 0.1, 2.9, 4.22, -0.3, 0, '#f3f2ef', NC), (x, y, z) =>
    y > 3.5 && z < -0.2 ? [x, y, -0.5] : [x, y, z]
  );
  const sign = k.plane(
    flat(T, 'fadeos', 1024, 272, (g) => {
      g.fillStyle = '#f3f2ef';
      g.fillRect(0, 0, 1024, 272);
      g.strokeStyle = '#8a5a2b';
      g.lineWidth = 4;
      g.strokeRect(16, 16, 992, 240);
      g.fillStyle = '#8a5a2b';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = SERIF(118);
      spaced(g, 'FADEOS', 512, 108, 122);
      g.font = SERIF(44, 600);
      spaced(g, '•芙蒂絲保養美學•', 512, 208, 68);
    }),
    4.9,
    1.3,
    w / 2,
    3.56,
    -0.412,
    FRONT,
    { emissive: 0.3 }
  );
  sign.rotation.x = -0.151;
  // 東北端的圓形側招
  for (const sd of [-1, 1])
    k.plane(
      T.roundSign('FADEOS', '#ffffff', '#111111'),
      0.62,
      0.62,
      0.06 + sd * 0.025,
      2.6,
      -0.6,
      sd * RT,
      { transparent: true, emissive: 0.3 }
    );
  k.box(0.04, 0.08, 2.88, 2.93, -0.9, -0.14, '#1c1c1e', NC);
  // 2F：一整排深古銅色格子窗（上排橫氣窗、下排大窗，白窗簾）
  k.plane(
    flat(T, 'fwin', 256, 96, (g) => {
      g.fillStyle = '#3a2c22';
      g.fillRect(0, 0, 256, 96);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = '#6f7a7a';
        g.fillRect(i * 64 + 4, 4, 56, 22);
        g.fillStyle = '#b4b5ad';
        g.fillRect(i * 64 + 4, 32, 56, 60);
        g.fillStyle = 'rgba(90,100,104,.55)';
        g.fillRect(i * 64 + 4, 32, 14, 60);
        g.fillStyle = 'rgba(0,0,0,.08)';
        for (let x = 22; x < 58; x += 8) g.fillRect(i * 64 + x, 32, 2, 60);
      }
    }),
    w - 0.3,
    1.65,
    w / 2,
    5.08,
    -0.16,
    FRONT,
    { emissive: 0.22 }
  );
  k.box(0, w, 5.95, top, -0.32, 0, BZ, NC);
  // 2F 東北側牆（9 號退縮所以露出來）：白色鐵皮上的通風口
  k.box(-0.04, 0, 4.2, 4.7, 1.4, 1.9, '#8d9196', NC);
  k.box(-0.03, 0, 5.9, top, 0, 3.5, '#9a9c98', NC);
  // 後段 3F：退縮 3 m 的綠色鐵架棚、白欄杆、淺綠浪板斜頂
  k.box(0, w, top, 8.6, 4.2, d, '#2fa85a', NC);
  for (const x of [0.06, w / 2, w - 0.06])
    k.box(x - 0.06, x + 0.06, top, 8.6, 3.0, 3.12, '#2fa85a', NC);
  k.plane(railTex(T, 26, '#f0f0ec'), w, 0.95, w / 2, top + 0.5, 3.0, FRONT, {
    transparent: true,
    double: true,
  });
  k.box(4.1, 4.9, 7.0, 8.2, 3.5, 3.55, '#d8dde6', NC);
  k.box(3.2, 3.8, 7.2, 8.2, 3.5, 3.55, '#c98a8a', NC); // 晾的衣服
  slope(k, -0.1, w + 0.1, 8.6, 9.3, 2.8, d, '#9fd6a8', 'f', 0.08);
  // 門口：立牌（r_16 拉近五行都讀得到；LINE 帳號不放）、爬藤盆栽、三角錐
  for (const x of [4.3, 5.08]) k.box(x, x + 0.06, 0.05, 2.15, -0.5, -0.44, '#8a6a4a', NC); // 木框腳架：板子掛在上半段（r_16）
  k.box(4.3, 5.14, 0.62, 1.9, -0.49, -0.45, '#8a6a4a', NC);
  k.plane(
    flat(T, 'fstand', 192, 288, (g) => {
      g.fillStyle = '#fbfbf8';
      g.fillRect(0, 0, 192, 288);
      g.fillStyle = '#1a1a1a';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FONT(24, 700);
      ['預約制｜服務項目', 'SRB冰晶粉嫩術', '熱蠟美肌除毛', '美體SPA按摩', '美業共享空間'].forEach(
        (t, i) => g.fillText(t, 96, 46 + i * 46, 180)
      );
    }),
    0.78,
    1.2,
    4.72,
    1.26,
    -0.51,
    FRONT,
    { emissive: 0.12 }
  );
  pot(k, T, 3.9, -0.4, 1.5, 0.3, '#3a3a3c');
  pot(k, T, 0.25, -0.4, 0.4, 0.2);
  k.cone(1.6, -0.6);
  backWins(k, T, [1.5, 4.5, 7.4]);
}

// ---------------- 5 號：磚紅 4 層樓，1F 美鞋澡堂、2F 印象派攝影工作室 ----------------
function meixie(k, T) {
  const { w, top, FRONT } = T,
    BR = T.wallMat('#8a4a36'),
    cream = '#e8e0cf',
    teal = '#1f7a68',
    F2 = 3.95,
    F3 = 6.4,
    F4 = 9.5;
  k.box(0, w, 0, top, -0.14, 0, BR, TL);
  for (const y of [F3 - 0.1, F4 - 0.1, 12.4]) k.box(0, w, y, y + 0.18, -0.18, 0, cream, NC);
  // 一樓：兩片深綠鐵捲門（左窄右寬）、銀色直柱、青綠弧形雨庇、橫招
  k.plane(T.shutterTex('#1f5a4a'), 2.75, 2.3, 1.875, 1.15, -0.15, FRONT);
  k.plane(T.shutterTex('#1f5a4a'), 1.2, 2.3, 4.0, 1.15, -0.15, FRONT);
  k.box(3.25, 3.4, 0, 2.3, -0.2, -0.14, '#b9bdc0', NC);
  slope(k, 0, w, 2.3, 3.0, -0.75, 0, teal, 'f', 0.14);
  for (const x of [0, 1.26, 2.52, 3.78, w - 0.06])
    slope(k, x, x + 0.06, 2.32, 3.03, -0.78, 0, '#c5cacc', 'f', 0.14);
  k.box(0, w, 2.27, 2.36, -0.79, -0.72, '#c5cacc', NC);
  k.box(0.05, w - 0.05, 3.0, 3.93, -0.3, 0, '#dfe9ec', NC);
  k.plane(
    flat(T, 'meixie', 1024, 192, (g) => {
      g.fillStyle = '#dfe9ec';
      g.fillRect(0, 0, 1024, 192);
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (const [x, y, r] of [
        [60, 150, 16],
        [110, 36, 10],
        [470, 40, 14],
        [520, 150, 18],
        [300, 24, 8],
      ]) {
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.fill();
      }
      g.lineWidth = 12;
      g.strokeStyle = '#f39a1e';
      g.beginPath();
      g.arc(150, 130, 96, Math.PI * 1.05, Math.PI * 1.75);
      g.stroke();
      g.strokeStyle = '#f6c21e';
      g.beginPath();
      g.arc(150, 130, 82, Math.PI * 1.05, Math.PI * 1.75);
      g.stroke();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FONT(104);
      g.lineJoin = 'round';
      [...'美鞋澡堂'].forEach((c, i) => {
        const x = 150 + i * 106,
          y = 104;
        g.strokeStyle = '#111111';
        g.lineWidth = 12;
        g.strokeText(c, x, y);
        g.fillStyle = ['#e8262a', '#f5c518', '#5ec4ea', '#3bb54a'][i];
        g.fillText(c, x, y);
      });
      ['清潔', '除臭', '殺菌', '塗染', '保養'].forEach((t, i) => {
        const x = 630 + i * 78;
        g.fillStyle = '#1d3f8f';
        g.fillRect(x - 24, 34, 48, 48);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x, 58, 12, 0, 7);
        g.fill();
        g.fillStyle = '#111111';
        g.font = FONT(24, 700);
        g.fillText(t, x, 108);
      });
      g.font = FONT(22, 700);
      g.fillText('中壢中原店', 786, 156);
    }),
    4.98,
    0.9,
    w / 2,
    3.47,
    -0.31,
    FRONT,
    { emissive: 0.3 }
  );
  // 與 7 號交界磚柱上的「洗包洗鞋」小牌
  k.plane(
    T.paint('洗包洗鞋', '#1a1a1a', '#ffffff', null, 0.5, 0.2),
    0.42,
    0.18,
    0.24,
    1.6,
    -0.15,
    FRONT
  );
  // 2F：一整面大玻璃櫥窗，裡面掛 4 件白色禮服（攝影工作室）
  k.plane(
    flat(T, 'show', 512, 224, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 224);
      gr.addColorStop(0, '#7f8f92');
      gr.addColorStop(1, '#a9b3b0');
      g.fillStyle = gr;
      g.fillRect(0, 0, 512, 224);
      for (let i = 0; i < 4; i++) {
        const x = 46 + i * 84;
        g.fillStyle = i === 3 ? '#cfd3d2' : '#f1f1ee';
        g.beginPath();
        g.moveTo(x + 22, 22);
        g.lineTo(x + 46, 22);
        g.lineTo(x + 70, 44);
        g.lineTo(x + 60, 80);
        g.lineTo(x + 56, 150);
        g.lineTo(x + 12, 150);
        g.lineTo(x + 8, 80);
        g.lineTo(x - 2, 44);
        g.closePath();
        g.fill();
        g.strokeStyle = '#555c5e';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + 34, 22);
        g.lineTo(x + 34, 6);
        g.stroke();
      }
      g.fillStyle = '#4c7d3a';
      g.beginPath();
      g.arc(402, 118, 11, 0, 7);
      g.arc(394, 130, 9, 0, 7);
      g.fill();
      g.fillStyle = '#3d3a37';
      g.fillRect(424, 0, 6, 224);
      for (let x = 440; x < 512; x += 22) {
        g.fillStyle = '#5b6668';
        g.fillRect(x, 6, 16, 212);
      }
      g.strokeStyle = '#3d3a37';
      g.lineWidth = 8;
      g.strokeRect(0, 0, 512, 224);
    }),
    w - 0.4,
    2.15,
    w / 2,
    F2 + 1.2,
    -0.16,
    FRONT,
    { emissive: 0.12 }
  );
  // 3F／4F：深陽台（磚欄、橘紅色天花），3F 多一道黑鐵花欄杆
  const recess = flat(T, 'recess', 256, 160, (g) => {
    g.fillStyle = '#c9603a';
    g.fillRect(0, 0, 256, 46);
    const gr = g.createLinearGradient(0, 46, 0, 160);
    gr.addColorStop(0, '#6a4a3c');
    gr.addColorStop(1, '#3a332f');
    g.fillStyle = gr;
    g.fillRect(0, 46, 256, 114);
    g.fillStyle = '#2a2826';
    g.fillRect(40, 66, 60, 94);
    g.fillStyle = '#56636a';
    g.fillRect(130, 76, 90, 60);
  });
  for (const y of [F3, F4]) k.plane(recess, w - 0.6, 1.95, w / 2, y + 1.9, -0.16, FRONT);
  k.plane(railTex(T, 30, '#1c1c1e'), w - 0.6, 0.42, w / 2, F3 + 1.12, -0.19, FRONT, {
    transparent: true,
  });
  T.ac(k, w - 1.3, F3 + 0.25, -0.55);
  gable(k, 1.55, 3.55, top, top + 0.7, -0.14, 0.2, BR, 'z');
  k.box(-0.04, 0, 6.25, 9.3, 0.2, 3.0, '#2fb54a', NC); // 東北側牆（7 號屋頂以上）的鮮綠色牆板
  // 西南側牆（比轉角屋凸出的那一段）：米黃底「照相」牆招；往路上挑的黃色雙面側招
  k.plane(
    flat(T, 'zhao', 512, 288, (g) => {
      g.fillStyle = '#e6d9a8';
      g.fillRect(0, 0, 512, 288);
      g.fillStyle = '#1a1a1a';
      g.fillRect(0, 0, 512, 62);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#e6d9a8';
      g.font = FONT(44);
      spaced(g, '印象派攝影工作室', 256, 33, 60);
      g.fillStyle = '#1a1a1a';
      g.font = FONT(150);
      spaced(g, '照相', 256, 160, 190);
      g.font = FONT(26, 700);
      g.fillText('請上二樓', 420, 262);
    }),
    1.85,
    1.04,
    w + 0.02,
    4.85,
    0.98,
    RT,
    { emissive: 0.12 }
  );
  // 兩面的紅色方塊都在靠路的那一端（街景 r_03 從東北看在左、v_04 從西南看在右），所以東北面的版面左右對調
  const yel = (mir) =>
    flat(T, `yel${mir ? 'M' : ''}`, 512, 288, (g) => {
      const tx = mir ? 182 : 0,
        rx = mir ? 26 : 350;
      g.fillStyle = '#f2d43a';
      g.fillRect(0, 0, 512, 288);
      g.strokeStyle = '#2a3fa0';
      g.lineWidth = 12;
      g.strokeRect(6, 6, 500, 276);
      g.fillStyle = '#2a3fa0';
      g.fillRect(6, 140, 500, 8);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#111111';
      g.font = FONT(54);
      g.fillText('快', tx + 60, 46);
      g.fillText('照', tx + 270, 46);
      spaced(g, '證件照', tx + 165, 104, 105);
      g.fillStyle = '#1b1b1b';
      g.fillRect(tx + 138, 30, 54, 34);
      g.fillStyle = '#f2d43a';
      g.beginPath();
      g.arc(tx + 165, 47, 10, 0, 7);
      g.fill();
      g.fillStyle = '#d8232a';
      g.fillRect(rx, 22, 136, 78);
      g.fillStyle = '#ffffff';
      g.font = FONT(40);
      g.fillText('印象派', rx + 68, 62);
      g.fillStyle = '#d8232a';
      g.font = FONT(26);
      g.fillText('2 F', rx + 68, 120);
      g.fillStyle = '#1c2a80';
      g.font = FONT(50);
      g.fillText('洗', tx + 60, 180);
      g.fillText('包', tx + 270, 180);
      g.fillText('洗', tx + 60, 240);
      g.fillText('鞋', tx + 270, 240);
      g.fillStyle = '#d8232a';
      g.fillRect(rx, 160, 136, 108);
      g.fillStyle = '#ffffff';
      g.font = FONT(40);
      g.fillText('美鞋', rx + 68, 190);
      g.fillText('澡堂', rx + 68, 238);
    });
  for (const sd of [-1, 1])
    k.plane(yel(sd < 0), 1.9, 1.07, w - 0.06 + sd * 0.05, 5.35, -1.15, sd * RT, { emissive: 0.3 });
  k.box(w - 0.1, w - 0.02, 4.8, 5.9, -2.12, -0.14, '#2a3fa0', NC);
  // 黃色側招下方的白底「照相」小燈箱（雙面，雨庇外側）
  k.box(w - 0.1, w - 0.02, 2.36, 2.84, -1.56, -0.8, '#f4f4f0', NC);
  for (const sd of [-1, 1])
    k.plane(
      T.paint('照相', '#f4f4f0', '#111111', null, 0.7, 0.42),
      0.7,
      0.42,
      w - 0.06 + sd * 0.045,
      2.6,
      -1.18,
      sd * RT,
      { emissive: 0.3 }
    );
  // 門口：黃底立牌、盆栽、機車
  standBoard(
    k,
    flat(T, 'ystand', 128, 256, (g) => {
      g.fillStyle = '#f2d43a';
      g.fillRect(0, 0, 128, 256);
      g.fillStyle = '#111111';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FONT(30);
      ['洗相片', '快照', '請上2F', '洗鞋', '洗包'].forEach((t, i) => {
        g.fillStyle = i === 2 ? '#d8232a' : '#111111';
        g.fillText(t, 64, 34 + i * 47);
      });
    }),
    4.85,
    -0.5,
    0.6,
    1.2
  );
  pot(k, T, 0.3, -0.45, 1.2, 0.28);
  pot(k, T, 3.3, -0.5, 0.8, 0.25, '#4a5a8a');
  T.bike(k, 1.0, -0.75, 0, '#2a2a30');
  backWins(k, T, [1.5, 5.0, 8.0, 11.0]);
}

// ---------------- 轉角白磁磚樓（門牌 1）：1F 東北半阿迪早點、西南半深褐鐵門 ----------------
// ---------------- 轉角一層木造小屋「永祿小吃」----------------
const base = (H, d, set, wall, roofCol, custom) => ({
  nf: 1,
  gf: H,
  d,
  set,
  wall,
  ground: 'open',
  door: 0,
  noband: true,
  bikes: -1,
  roofCol,
  custom,
});
export default {
  ownSign: ['芙蒂絲Fadeos保養美學', '阿迪早點'], // 阿迪早點的圓形燈箱畫在 ./corners.js（轉角白磁磚樓的側面）
  drop: [],
  lots: [
    [121.2, 128.3, 1, base(13, 12.4, 5.6, '#8e8e8b', '#9a9a96', house11)],
    [128.3, 132.0, 1, base(9.2, 11, 7.5, '#e9e7df', '#b5432e', house9)],
    [132.0, 137.2, 1, base(6.2, 14, 4.0, '#e6e8e3', '#e8e8e4', fadeos)],
    [137.2, 142.3, 1, base(12.8, 14.5, 4.0, '#8d877b', '#8d8a84', meixie)],
    // s 143 以後到實踐路口（轉角白磁磚樓、永祿小吃小屋）由實踐路那邊蓋（shijian/S3.js，S 399.5～406.5），這裡不重複
  ],
};
