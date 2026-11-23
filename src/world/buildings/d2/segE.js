// 大仁二街 E 段：西北側 s 78～120（大仁街口往西南）。街景 2024-08、國土測繪 2024 正射。
// 實景只有兩棟：轉角的全家（2 層八角形石材樓，後半在 StreetDaren.js 的保留範圍內，這裡只補前半）
// 與柏德廣場 9 層米色磁磚大樓（一樓由東北往西南：#15Bistro、弧形樓梯、玻璃店面、阿尼基），中間是人行通道。
const FONT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const VC = 'd2VC'; // StreetDaren2.js 的頂點色材質
const tint = (T, g, hex) => {
  const c = new T.THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new T.THREE.BufferAttribute(a, 3)); return g;
};
const hexOf = (m) => (m.startsWith('wall') ? m.slice(4) : m);
// 斜牆上的薄板：沿 a→b（x 由小到大），out 是往外推的距離
const slabC = (k, T, f, t0, t1, out, th, y0, y1, hex) => {
  const [x0, z0] = f.at(t0, out - th / 2), [x1, z1] = f.at(t1, out - th / 2);
  return tint(T, k.slab(x0, z0, x1, z1, th, y0, y1, VC, { col: false }), hex);
};
const prismC = (k, T, pts, y0, y1, hex) => { const m = k.prism(pts, y0, y1, VC); tint(T, m.geometry, hex); return m; };
const faceOf = (a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = dz / L, nz = -dx / L;
  return { L, rot: Math.atan2(nx, nz), at: (t, out = 0) => [a[0] + dx * t + nx * out, a[1] + dz * t + nz * out] };
};
const onFace = (k, f, tex, w, h, t, y, out, o) => { const [x, z] = f.at(t, out); return k.plane(tex, w, h, x, y, z, f.rot, o); };
// 格子窗貼圖：cols×rows 格，frame 框色、glass 玻璃色
const lattice = (T, cols, rows, frame, glass, fw = 0.14, curtain = false) => T.sg(`d2E_lat|${cols}|${rows}|${frame}|${glass}|${fw}|${curtain}`, cols * 48, rows * 48, (g) => {
  const f = 48 * fw; g.fillStyle = frame; g.fillRect(0, 0, cols * 48, rows * 48);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = c * 48 + f / 2, y = r * 48 + f / 2, s = 48 - f;
    g.fillStyle = glass; g.fillRect(x, y, s, s);
    if (curtain) { g.fillStyle = 'rgba(255,255,255,.28)'; for (let i = 0; i < 4; i++) g.fillRect(x + 3 + i * s / 4, y, s / 8, s); }
    g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x, y, s * 0.35, s);
  }
});
const flat = (T, key, W, H, draw) => T.sg(`d2E_${key}`, W, H, draw);
const cordyline = (k, x, z, y, col = '#8e2f4a') => { for (const [dx, dz, h, r1] of [[0, 0, 0.5, 0.16], [0.14, 0.08, 0.36, 0.13], [-0.1, 0.12, 0.3, 0.12]]) k.cyl(x + dx, z + dz, 0.03, y - 0.1, y + h, col, { r1, seg: 5 }); };
const parkRow = (k, T, x0, x1, z, step = 0.85) => { // 白線機車格（垂直於路）
  const cols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a', '#e8e6df'];
  let j = 0;
  for (let x = x0; x <= x1 + 0.01; x += step, j++) {
    k.box(x - 0.03, x + 0.03, 0.05, 0.062, z - 0.1, z + 1.7, '#f2f2ee', { col: false });
    if (x + step <= x1 + 0.01 && j % 7 !== 5) T.bike(k, x + step / 2, z, 1, cols[(j * 3) % 7]);
  }
};
const uRack = (k, x, z) => { // 不鏽鋼倒 U 形腳踏車架
  for (const zz of [z, z + 0.7]) k.box(x - 0.025, x + 0.025, 0.05, 0.85, zz - 0.025, zz + 0.025, '#c4c8cc', { col: false });
  k.box(x - 0.025, x + 0.025, 0.82, 0.87, z - 0.025, z + 0.725, '#c4c8cc', { col: false });
};

// ---------------- 全家（前半）----------------
function familyMart(k, T) {
  const { w, d, MR, FRONT } = T, F = -2.75, PL = 0.3, H = 9.7;
  const stone = T.wallMat('#9a968e'), SH = hexOf(stone), dark = '#9a9790';
  const A = [[-0.6, -0.5], [2.7, F], [8.0, F], [w, -0.5]]; // 正面 s 87.7～93.0（5.3 m，接近正八角形的邊長），兩端 45° 斜面
  const f1 = faceOf(A[0], A[1]), f2 = faceOf(A[1], A[2]), f3 = faceOf(A[2], A[3]);
  // 八角形的前半：梯形量體（立面在 off 9.3），後面的殼補到女兒牆高度
  prismC(k, T, [[0, 0], ...A, [w, 0]], 0, H, SH);
  k.box(0, w, T.top, H, 0, d, stone, { col: false, tile: [1.2, 1.2] });
  k.box(-0.045, 0, 0, H, 0, d, SH, { col: false }); k.box(w, w + 0.045, 0, H, -0.5, d, SH, { col: false }); // 蓋掉通用的側窗
  k.box(1.3, w - 0.5, H, H + 0.03, F + 0.6, d - 0.1, '#9a9892', { col: false });
  for (let i = 0; i < 3; i++) k.wallLine(A[i][0], A[i][1], A[i + 1][0], A[i + 1][1], 0, H);
  k.wallLine(0, 0, A[0][0], A[0][1], 0, H); k.wallLine(w, 0, w, -0.5, 0, H);
  // 轉角粗柱
  for (const [x, z] of [A[1], A[2]]) k.cyl(x, z + 0.12, 0.3, 0, H, dark, { seg: 8 });
  // 三面：招牌帶、2F 格子窗、石牆溝縫
  const win2F = (n) => lattice(T, n, 4, '#eef0ec', '#4f6b63', 0.16);
  [f1, f2, f3].forEach((f, i) => {
    slabC(k, T, f, -0.04, 1.04, 0.24, 0.3, 4.35, 5.45, '#fbfbf8');
    slabC(k, T, f, -0.045, 1.045, 0.26, 0.32, 5.17, 5.45, '#3db54a');
    slabC(k, T, f, -0.045, 1.045, 0.26, 0.32, 4.35, 4.44, '#2f7fd6');
    const ww = f.L - (i === 1 ? 1.2 : 1.0), n = i === 1 ? 9 : 8;
    onFace(k, f, win2F(n), ww, 1.5, 0.5, 6.4, 0.03);
    slabC(k, T, f, 0.03, 0.97, 0.02, 0.04, 7.6, 7.66, '#6f6c66');
    slabC(k, T, f, -0.02, 1.02, 0.06, 0.1, H - 0.3, H, '#8a8781');
    slabC(k, T, f, 0, 1, 0.05, 0.1, PL, PL + 0.25, dark);
  });
  // 女兒牆上的 V 形溝縫（正面）
  for (const x of [4.5, 6.2]) k.box(x - 0.03, x + 0.03, 7.66, H - 0.3, F - 0.02, F, '#6f6c66', { col: false });
  // 正面：招牌字、玻璃門、灰色金屬平雨庇
  onFace(k, f2, T.paint('全家 FamilyMart', '#fbfbf8', '#1f76d2', null, 3.3, 0.66, 96), 3.3, 0.66, 0.5, 4.8, 0.25, { emissive: 0.3 });
  T.shopGlass(k, 3.8, 6.9, PL, 3.4, T.ROWT.shop('d2E_fm', '#eef2f4', '#7f858c', 311), F - 0.02);
  for (const x of [4.55, 5.32, 6.1]) k.box(x, x + 0.06, PL, 2.9, F - 0.06, F, '#2a2c2e', { col: false });
  k.box(3.8, 6.9, 2.9, 2.98, F - 0.06, F, '#2a2c2e', { col: false });
  k.box(3.6, 7.1, 3.5, 3.64, F - 1.3, F, '#8c8c8c', { col: false });
  // 兩個斜面：霧面大玻璃窗
  const frost = flat(T, 'frost', 192, 128, (g) => { g.fillStyle = '#8e9296'; g.fillRect(0, 0, 192, 128); g.fillStyle = '#e4e6e3'; g.fillRect(5, 5, 88, 118); g.fillRect(99, 5, 88, 118); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(8, 8, 30, 112); });
  for (const f of [f1, f3]) onFace(k, f, frost, f.L - 1.0, 2.3, 0.5, PL + 2.15, 0.03);
  // 東北角屋頂高度的斜撐方形燈箱
  const side = flat(T, 'fmSide', 160, 160, (g) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 160, 160); g.fillStyle = '#3db54a'; g.fillRect(0, 0, 160, 58); g.fillStyle = '#2f7fd6'; g.fillRect(0, 58, 160, 6);
    g.fillStyle = '#1f76d2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FONT(26); g.fillText('FamilyMart', 80, 112);
  });
  for (const sd of [-1, 1]) k.plane(side, 1.2, 1.2, 2.6 + sd * 0.07, 8.2, F - 2.0, sd * Math.PI / 2, { emissive: 0.35 });
  k.box(2.54, 2.66, 7.6, 8.8, F - 2.6, F - 1.4, '#f4f4f0', { col: false });
  for (const y of [7.75, 8.6]) k.box(2.57, 2.63, y, y + 0.07, F - 1.4, F + 0.1, '#8a8d90', { col: false });
  // 廣場：比路面高兩階的灰白地磚，正門前的階梯邊緣漆紅色
  const pave = '#c9c7c1';
  k.box(0, w, 0.04, PL, -6.2, 0, pave, { col: false, surface: true });
  k.box(0, w, 0.04, 0.15, -6.55, -6.2, pave, { col: false, surface: true });
  k.box(3.7, 7.1, 0.04, 0.155, -6.57, -6.55, '#c9202b', { col: false });
  k.box(3.7, 7.1, 0.15, PL + 0.005, -6.22, -6.2, '#c9202b', { col: false });
  // 斜面前的深灰色花台、綠籬與朱蕉
  const planter = (pts, reds) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    prismC(k, T, pts, PL, PL + 0.8, '#5a5a5c');
    k.prism(pts.map(([x, z]) => [cx + (x - cx) * 0.9, cz + (z - cz) * 0.9]), PL + 0.8, PL + 1.3, MR.plant, { bevel: 0.12 });
    for (const [x, z] of reds) cordyline(k, x, z, PL + 1.2);
  };
  planter([[-0.4, -1.0], [2.4, -3.05], [2.5, -4.5], [1.0, -5.0], [-0.5, -4.2]], [[0.6, -2.9], [1.6, -3.7]]);
  planter([[w, -0.85], [8.3, -3.0], [8.25, -4.5], [9.8, -5.0], [w, -4.2]], [[10.3, -2.6], [9.3, -3.3], [10.6, -3.6]]);
  // 通道口的公布欄立牌（頂端「柏德｜廣場」）
  const ads = flat(T, 'ads', 96, 224, (g) => {
    g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 96, 224); const cs = ['#d9e6f4', '#f4e2c8', '#e3f0d8', '#f6d9d9', '#dcdcf2', '#fff3b8'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) { g.fillStyle = cs[(r * 3 + c * 5) % 6]; g.fillRect(5 + c * 30, 5 + r * 31, 26, 27); g.fillStyle = 'rgba(40,60,120,.45)'; g.fillRect(8 + c * 30, 10 + r * 31, 20, 3); g.fillRect(8 + c * 30, 17 + r * 31, 14, 2); }
  });
  const bx = w - 0.3, bz = -6.36, B0 = 0.15; // 街景兩個方向都看得到廣告面，而且就站在機車格後面的階梯邊（off≈5.7）
  k.box(bx - 0.47, bx + 0.47, B0, B0 + 2.75, bz - 0.14, bz + 0.14, '#f2f2ee', {});
  for (const [dz, r] of [[-0.15, FRONT], [0.15, FRONT + Math.PI]]) {
    k.plane(ads, 0.84, 1.95, bx, B0 + 1.3, bz + dz, r);
    k.plane(T.paint('柏德 廣場', '#f2f2ee', '#c9202b', null, 0.9, 0.3), 0.9, 0.3, bx, B0 + 2.53, bz + dz, r);
  }
  k.box(bx - 0.17, bx + 0.17, B0 + 2.75, B0 + 3.09, bz - 0.05, bz + 0.05, '#c9202b', { col: false });
  // 球形路燈、白線機車格
  k.cyl(0.5, -6.0, 0.05, PL, 3.5, '#1c1c1e', { seg: 6 }); k.cyl(0.5, -6.0, 0.14, 3.5, 3.6, '#1c1c1e', { seg: 8 }); k.cyl(0.5, -6.0, 0.2, 3.6, 3.95, '#f4f2e6', { seg: 10, r1: 0.14 });
  parkRow(k, T, 1.3, 11.5, -8.9);
}

// ---------------- 柏德廣場 9 層大樓 ----------------
function tower(k, T) {
  const { w, d, top, gf, fh, MR, FRONT } = T, Z = -0.5, PB = 0.85, B = gf + fh; // PB：#15 紅框與 2F 格子窗凸出主立面的深度（側面看得到兩欄窗格）
  const beige = T.wallMat('#dcc6b5'), grey = T.wallMat('#8b8985'), blue = '#3f63b0';
  const L = -Math.PI / 2, R = Math.PI / 2;
  // 正立面的皮：1～2F 灰色洗石子基座＋藍色細橫線，3F 以上米色磁磚（通用的窗與冷氣都包在裡面）
  k.box(0, w, 0, B, Z, 0, grey, { col: false, tile: [0.6, 0.6] });
  k.box(0, w, B, top + 1.0, Z, 0, beige, { col: false, tile: [0.6, 0.6] });
  k.wallLine(0, Z, w, Z, 0, top);
  k.box(-0.04, 0, 0, B, Z, d, grey, { col: false, tile: [0.6, 0.6] });
  k.box(w, w + 0.04, 0, B, Z, d, grey, { col: false, tile: [0.6, 0.6] });
  for (let y = 1.0; y < B; y += 1.0) { k.box(-0.05, w + 0.05, y, y + 0.06, Z - 0.012, Z, blue, { col: false }); k.box(-0.052, -0.04, y, y + 0.06, 8.6, 16, blue, { col: false }); k.box(w + 0.04, w + 0.052, y, y + 0.06, Z, 8, blue, { col: false }); }
  // 女兒牆與屋頂：圓形水塔、白色屋突、前段深藍色採光罩
  k.box(0, 0.2, top, top + 1.0, 0, d, beige, { col: false }); k.box(w - 0.2, w, top, top + 1.0, 0, d, beige, { col: false }); k.box(0, w, top, top + 1.0, d - 0.2, d, beige, { col: false });
  for (const [x, z] of [[3, 12], [5.3, 12.4], [13, 10], [15.2, 10.6], [4, 24], [14, 27], [11.6, 27.5], [6, 32]]) { k.cyl(x, z, 0.95, top + 0.5, top + 2.3, '#d4d6d2', { seg: 12 }); k.box(x - 0.8, x + 0.8, top + 0.12, top + 0.5, z - 0.8, z + 0.8, '#8a8d90', { col: false }); }
  k.box(7, 11.5, top + 0.12, top + 3.2, 15, 21, '#eeeeea', { col: false }); k.box(6.8, 11.7, top + 3.2, top + 3.35, 14.8, 21.2, '#c9c9c4', { col: false });
  k.box(2.5, 10, top + 2.3, top + 2.42, 1.5, 7.5, '#27406b', { col: false });
  for (const [x, z] of [[2.6, 1.6], [9.9, 1.6], [2.6, 7.4], [9.9, 7.4]]) k.box(x - 0.05, x + 0.05, top + 0.12, top + 2.3, z - 0.05, z + 0.05, '#8a8d90', { col: false });

  // --- a. #15Bistro（x 0～4.7）：洗石子檯座、紅色木格子凸窗、黑色木條招牌帶、2F 白框綠玻璃格子凸窗 ---
  const ax = 4.3, zf = Z - PB, red = '#c9202b', blk = '#2b2625', SD = 1.3; // SD：紅框沿通道轉進去的長度（只有切角那一小段）
  k.box(0, ax, 0, 1.0, zf, Z, grey, { tile: [0.6, 0.6] });
  k.box(0.02, ax - 0.02, 1.0, 3.1, zf + 0.03, Z, '#191616', { col: false });
  const redLat = (n, r) => lattice(T, n, r, red, '#1b1a1c', 0.2);
  k.plane(redLat(7, 3), ax, 2.1, ax / 2, 2.05, zf, FRONT);
  k.plane(redLat(2, 3), PB, 2.1, ax + 0.005, 2.05, Z - PB / 2, R);
  k.plane(redLat(3, 3), SD - zf, 2.1, -0.045, 2.05, (zf + SD) / 2, L);
  // 黑色橫木條招牌帶（實景只有約 0.65 m 高，像一圈往外斜的雨庇）
  k.box(-0.14, ax + 0.1, 3.1, 3.75, zf - 0.16, Z, blk, { col: false });
  k.box(-0.14, -0.04, 3.1, 3.75, zf - 0.16, 8.5, blk, { col: false });
  for (let y = 3.21; y < 3.72; y += 0.13) k.box(-0.15, ax + 0.11, y, y + 0.02, zf - 0.17, zf - 0.16, '#141212', { col: false });
  const s15 = flat(T, 's15b', 768, 112, (g) => {
    g.fillStyle = blk; g.fillRect(0, 0, 768, 112);
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 16; y < 112; y += 24) g.fillRect(0, y, 768, 3);
    // 圓形 logo：戴禮帽的人像（示意）
    g.fillStyle = '#e9dfc8'; g.beginPath(); g.arc(250, 56, 50, 0, 7); g.fill(); g.fillStyle = '#3a2a22'; g.beginPath(); g.arc(250, 56, 44, 0, 7); g.fill();
    g.fillStyle = '#e9dfc8'; g.fillRect(232, 22, 36, 30); g.fillRect(216, 50, 68, 7); g.beginPath(); g.ellipse(250, 76, 15, 16, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `italic ${FONT(60)}`; g.fillText('#15', 318, 60);
    g.font = FONT(28); g.fillText('拾伍號餐酒館', 440, 38);
    g.font = FONT(30, 700); g.fillText('B i s t r o', 442, 80);
  });
  k.plane(s15, 4.25, 0.62, ax / 2, 3.425, zf - 0.175, FRONT, { emissive: 0.3 });
  const wg = (n, r) => lattice(T, n, r, '#eef0ec', '#a8d0c0', 0.14, true);
  k.box(0, ax, 3.8, 6.0, zf, Z, '#eef0ec', { col: false });
  k.plane(wg(6, 4), ax - 0.1, 2.0, ax / 2, 4.9, zf - 0.01, FRONT);
  k.plane(wg(2, 4), PB, 2.0, ax + 0.005, 4.9, Z - PB / 2, R);
  k.plane(wg(3, 4), SD - zf, 2.0, -0.045, 4.9, (zf + SD) / 2, L);
  k.plane(wg(10, 3), 7.0, 1.8, -0.045, 4.95, 4.9, L);                                    // 側牆 2F 一排格子窗（招牌上面）
  k.box(2.7, 3.5, 0.05, 0.8, zf - 0.36, zf - 0.02, '#e4e1d8', { col: false }); k.box(2.76, 3.44, 0.12, 0.72, zf - 0.37, zf - 0.36, '#9a9a94', { col: false }); // 檯座前的冷氣室外機
  // 面通道的側牆：第二塊黑色橫招與下面的深色大玻璃窗
  const dk = flat(T, 'dkglass', 256, 96, (g) => { g.fillStyle = '#2b2625'; g.fillRect(0, 0, 256, 96); for (let i = 0; i < 4; i++) { g.fillStyle = '#23282c'; g.fillRect(4 + i * 63, 4, 59, 88); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(4 + i * 63, 4, 20, 88); } });
  k.plane(T.paint('#15 拾伍號餐酒館', blk, '#ffffff', 'Bistro', 4.4, 0.6), 4.4, 0.6, -0.145, 3.425, 5.0, L, { emissive: 0.3 });
  k.plane(dk, 7.0, 2.0, -0.045, 2.05, 4.95, L);
  parkRow(k, T, 0.1, 4.2, -3.2, 0.8);

  // --- b. 弧形樓梯（x 4.7～10）---
  const sx = 7.75, st = '#a09d96', rail = '#8a3b32';
  k.box(5.85, 9.65, 0, 3.1, Z - 0.03, Z, '#262321', { col: false });
  for (let i = 0; i < 6; i++) { const hw = 2.35 - i * 0.16, z0 = Z - 1.35 + i * 0.22; k.box(sx - hw, sx + hw, 0, 0.17 * (i + 1), z0, Z, st, { col: false }); }
  for (let i = 0; i < 10; i++) { const hw = 1.5 - i * 0.07, cx = sx - i * 0.09; k.box(cx - hw, cx + hw, 1.02 + i * 0.17, 1.19 + i * 0.17, Z - 0.036, Z - 0.03, i % 2 ? '#9d9a93' : '#6f6d68', { col: false }); } // 洞口裡繼續往上的階梯
  for (const x of [sx - 1.55, sx + 1.5]) { for (const [z, h] of [[Z - 1.2, 1.05], [Z - 0.6, 1.5], [Z - 0.05, 1.95]]) k.box(x, x + 0.05, 0.2, h, z - 0.025, z + 0.025, rail, { col: false }); k.box(x, x + 0.05, 1.0, 1.06, Z - 1.25, Z - 0.6, rail, { col: false }); k.box(x, x + 0.05, 1.45, 1.51, Z - 0.6, Z, rail, { col: false }); }
  k.box(5.6, 10.0, 3.15, 3.75, Z - 0.16, Z, '#f1efea', { col: false });                   // 字被塗掉的白色橫式招牌板
  k.box(5.7, 9.95, 3.95, 5.95, Z - 0.03, Z, '#3d3a36', { col: false });                   // 2F 敞開的樓梯間
  const fr = '#b4b8bc', fz = Z - 0.65;
  for (const x of [5.6, 7.05, 8.5, 9.95]) k.box(x, x + 0.05, 3.8, 6.05, fz, fz + 0.05, fr, { col: false });
  for (const y of [3.8, 4.55, 5.3, 6.0]) k.box(5.6, 10.0, y, y + 0.05, fz, fz + 0.05, fr, { col: false });
  for (const x of [5.6, 9.95]) for (const y of [3.8, 6.0]) k.box(x, x + 0.05, y, y + 0.05, fz, Z, fr, { col: false });
  k.box(7.4, 9.0, 4.5, 5.6, fz - 0.04, fz, '#a3a7ab', { col: false });
  k.box(9.7, 10.1, 0.7, 1.6, Z - 0.12, Z, '#d9d2bd', { col: false });                     // 米色配電箱
  // 樓梯旁突出的方形側招（只放讀得出來的店名）
  const oliv = flat(T, 'olivia', 160, 176, (g) => {
    g.fillStyle = '#5a5560'; g.fillRect(0, 0, 160, 176); g.strokeStyle = '#ffffff'; g.lineWidth = 4;
    g.beginPath(); g.arc(80, 62, 36, 0.25 * Math.PI, 2.75 * Math.PI); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(80, 60, 15, 19, 0, 0, 7); g.fill(); g.fillRect(70, 74, 20, 14);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FONT(18); g.fillText('奧麗薇雅美學中心', 80, 132);
  });
  for (const sd of [-1, 1]) k.plane(oliv, 1.0, 1.1, 10.22 + sd * 0.05, 4.95, Z - 0.75, sd * Math.PI / 2, { emissive: 0.25 });
  k.box(10.18, 10.26, 4.4, 5.5, Z - 1.25, Z, '#5a5560', { col: false });

  // --- c. 玻璃店面（x 10～13.9）：落地玻璃、石砌花台、2F 橫向木格柵 ---
  T.shopGlass(k, 10.55, 13.7, 0.12, 2.95, flat(T, 'darkshop', 256, 192, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, '#4d5654'); gr.addColorStop(1, '#2a302f'); g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(70, 0, 60, 192); g.fillRect(150, 0, 22, 192);
    const cs = ['#e8e4d6', '#d9b23a', '#3d7fc0', '#c94a3a', '#f2f2ee']; for (let i = 0; i < 9; i++) { g.fillStyle = cs[i % 5]; g.fillRect(10 + (i % 3) * 14, 70 + ((i / 3) | 0) * 22, 11, 16); }
  }), Z - 0.02);
  k.box(10.35, 14.0, 0, 0.6, Z - 1.25, Z - 0.3, '#8e8c88', {});
  k.box(10.47, 13.88, 0.6, 1.1, Z - 1.15, Z - 0.4, MR.plant, { col: false });
  cordyline(k, 10.9, Z - 0.75, 0.95); cordyline(k, 12.0, Z - 0.8, 1.0, '#6f7d3a');
  for (let i = 0; i < 6; i++) k.box(10.3, 14.0, 3.15 + i * 0.2, 3.3 + i * 0.2, Z - 0.08, Z, i % 2 ? '#a88a6c' : '#9a7c60', { col: false });
  // 2F 一排白框綠玻璃格子窗（c～d），c 段窗前掛白色空白帆布
  k.plane(lattice(T, 15, 2, '#eef0ec', '#8fbcae', 0.14, true), 7.2, 0.96, 13.95, 4.85, Z - 0.02, FRONT);
  k.plane(lattice(T, 3, 3, '#eef0ec', '#8fbcae', 0.14, true), 1.5, 1.5, 16.75, 5.6, Z - 0.021, FRONT);   // 靠西南角那一組比較高
  k.box(10.9, 13.7, 4.95, 5.7, Z - 0.09, Z - 0.05, '#efefeb', { col: false });

  // --- d. 阿尼基（x 13.9～18）：藍灰色鐵捲門、石階、黑底橫招、轉角直招 ---
  k.plane(T.shutterTex('#3f6388'), 2.6, 2.4, 15.45, 1.65, Z - 0.02, FRONT);
  k.box(14.1, 16.8, 2.85, 3.0, Z - 0.5, Z, '#3e8f93', { col: false });
  k.box(14.1, 16.8, 0, 0.22, Z - 0.75, Z, '#9a9892', { col: false }); k.box(14.1, 16.8, 0.22, 0.45, Z - 0.42, Z, '#9a9892', { col: false });
  k.box(16.95, 17.9, 0, 0.9, Z - 0.95, Z - 0.1, '#8e8c88', {}); k.cyl(17.42, Z - 0.52, 0.3, 0.9, 1.45, '#3f6e35', { seg: 7, r1: 0.12 });
  const ani = flat(T, 'aniki', 608, 176, (g) => {
    g.fillStyle = '#1c1c1f'; g.fillRect(0, 0, 608, 176);
    g.fillStyle = '#f4f2ec'; g.fillRect(140, 26, 330, 124); g.strokeStyle = '#1c1c1f'; g.lineWidth = 3; g.strokeRect(148, 34, 314, 108); g.strokeRect(155, 41, 300, 94);
    g.fillStyle = '#151515'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FONT(40); g.fillText('阿尼基美式餐廳', 305, 90);
    g.fillStyle = '#f4f2ec'; g.font = FONT(34, 700); g.fillText('商', 80, 60); g.fillText('標', 80, 120); g.fillText('註', 532, 60); g.fillText('冊', 532, 120);
  });
  k.box(13.95, 17.75, 3.0, 4.08, Z - 0.3, Z, '#1c1c1f', { col: false }); k.box(17.75, 17.85, 2.98, 4.1, Z - 0.34, Z, '#e9e9e4', { col: false });
  k.plane(ani, 3.75, 1.05, 15.85, 3.54, Z - 0.31, FRONT, { emissive: 0.35 });
  const aniV = flat(T, 'anikiV', 144, 512, (g) => {
    g.fillStyle = '#1c1c1f'; g.fillRect(0, 0, 144, 512); g.fillStyle = '#efe6cf'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic ${FONT(64)}`; ['A', 'n', 'i', 'K', 'i'].forEach((c, i) => g.fillText(c, 72, 44 + i * 56));
    // 光頭張嘴大叫的人臉（示意）
    g.beginPath(); g.ellipse(72, 400, 50, 70, 0, 0, 7); g.fill(); g.fillStyle = '#1c1c1f';
    g.beginPath(); g.ellipse(72, 436, 22, 26, 0, 0, 7); g.fill(); g.fillRect(40, 380, 22, 6); g.fillRect(82, 380, 22, 6); g.fillRect(66, 388, 12, 20);
  });
  for (const sd of [-1, 1]) k.plane(aniV, 0.9, 3.2, 17.72 + sd * 0.09, 7.0, Z - 0.75, sd * Math.PI / 2, { emissive: 0.3 });
  k.box(17.64, 17.8, 5.38, 8.62, Z - 1.22, Z - 0.28, '#1c1c1f', { col: false }); k.box(17.69, 17.75, 6.2, 6.26, Z - 0.3, Z, '#4a4d50', { col: false }); k.box(17.69, 17.75, 8.2, 8.26, Z - 0.3, Z, '#4a4d50', { col: false });
  uRack(k, 6.2, -2.8); uRack(k, 7.4, -2.8);
  // 人行通道（s 96.5～101.5）：跟廣場一樣的灰白地磚，上面是連到全家那棟 2F 的空橋與綠色採光罩
  k.box(-5, 0, 0, 0.06, -3.2, 17, '#c9c7c1', { col: false, surface: true });
  const bz0 = 12.3, bz1 = 16.3, bx0 = -6.5, st2 = '#c4c8cc';
  k.box(bx0, 0, 3.45, 3.7, bz0, bz1, '#9a9892', { col: false });
  for (const z of [bz0, bz1 - 0.05]) { for (const y of [3.95, 4.2, 4.45, 4.75]) k.box(bx0, 0, y, y + 0.04, z, z + 0.05, st2, { col: false }); for (let x = bx0; x <= -0.05; x += 1.3) k.box(x, x + 0.05, 3.7, 4.75, z, z + 0.05, st2, { col: false }); }
  for (const [z0, z1, y] of [[bz0 - 0.2, bz0 + 0.9, 6.0], [bz0 + 0.9, bz1 - 0.9, 6.3], [bz1 - 0.9, bz1 + 0.2, 6.0]]) k.box(bx0, 0, y, y + 0.1, z0, z1, '#3f7f62', { col: false });
  for (const x of [bx0 + 0.1, -0.2]) for (const z of [bz0, bz1 - 0.06]) k.box(x, x + 0.06, 4.75, 6.05, z, z + 0.06, '#2f6b4f', { col: false });

  // --- 3F～9F：東北角每層的切角凸窗（正面＋面通道那一面）、正面中間兩直排窗、兩側牆的窗 ---
  const al = T.ROWT.alWin(), bay = wg(2, 2), bayS = wg(3, 2);
  for (let f = 2; f < T.nf; f++) {
    const y = gf + (f - 1) * fh;
    k.box(0.05, 1.9, y + 0.75, y + 2.55, Z - 0.5, Z, '#eef0ec', { col: false });
    k.plane(bay, 1.75, 1.65, 0.975, y + 1.65, Z - 0.51, FRONT);
    k.plane(wg(1, 2), 0.5, 1.65, 1.905, y + 1.65, Z - 0.25, R);
    k.plane(al, 1.2, 1.3, 3.3, y + 1.6, Z - 0.02, FRONT);
    k.box(-0.5, 0, y + 0.75, y + 2.55, Z - 0.5, 2.6, '#eef0ec', { col: false });
    k.plane(bayS, 3.0, 1.65, -0.51, y + 1.65, 1.05, L);
    k.plane(al, 1.5, 1.3, 9.6, y + 1.6, Z - 0.02, FRONT);
    k.plane(al, 0.7, 1.15, 11.2, y + 1.65, Z - 0.02, FRONT);
    for (const z of [6, 17, 21.5, 31.5]) k.plane(al, 1.7, 1.3, -0.03, y + 1.6, z, L);
    for (const z of [3.2, 8, 18]) k.plane(al, 1.4, 1.2, w + 0.03, y + 1.6, z, R);
  }
}

export default {
  ownSign: ['全家便利商店', '#15Bistro 拾伍號餐酒館', 'Aniki阿尼基美式餐廳'],
  drop: [], // OSM w442454836 不 drop（會讓全圖共用亂數錯位），改由 StreetDaren2.js 的 d2Look 叫它不畫
  lots: [
    // 全家便利商店（17 號）：八角形石材樓的前半，立面在 off 9.3；殼只佔 off 12.05～14.8，前面的梯形量體在 custom 裡
    [85, 96.5, 1, { nf: 2, gf: 4.0, fh: 3.2, d: 2.75, set: 12.05, wall: '#77746e', ground: 'shutter', door: 0, noband: true, bal: 'plain', roof: 'none', bikes: 1, custom: familyMart }],
    // 柏德廣場 9 層大樓（12～18 號，取代 OSM w442454836）：主立面在 off 5.7（殼在 6.2，外面包一層 0.5 m 的皮），#15 的凸窗再凸出到 off 4.85
    [101.9, 119.9, 1, { nf: 9, gf: 3.6, fh: 3.05, d: 37, set: 6.2, wall: '#dcc6b5', ground: 'shutter', door: 0, noband: true, bal: 'plain', roof: 'none', bikes: 1, custom: tower }],
  ],
};
