// 實踐路街屋資料：S 段 s 200～330，兩側（中原夜市主街）。格式見 src/world/buildings/StreetShijian.js 檔頭。
// 照 Google 街景建模：s 205～300 是 2024-08，s 305～330（大仁三街／91巷以南）是 2026-05。
// 巷口留空：80巷 s 241～246.5（左）、三和二街 s 261.5～272（右）、70巷 s 274.5～280.5（左）、91巷 s 305.3～309.8（右）、大仁三街 s 306.5～314（左）。
// 區域座標提醒：站在街上面對立面時，x 小的那一端在右手邊（左側的格子 x=0 是 s 大的那端，右側的格子 x=0 是 s 小的那端）。

const HP = Math.PI / 2;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);
const all = (...fs) => (k, c) => fs.forEach((f) => f(k, c));
// 自己畫的貼圖（招牌圖案、塗鴉…）
const tex = (c, key, wm, hm, draw, ppm = 96) => { const W = r16(wm * ppm), H = r16(hm * ppm); return c.sg(`sjS2_${key}|${W}x${H}`, W, H, (g) => draw(g, W, H)); };
// 字轉 90 度的直立招牌貼圖（英文店名的側招）
const rotTex = (c, text, bg, fg, wm, hm) => tex(c, `rot_${text}|${bg}|${fg}`, wm, hm, (g, W, H) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.save(); g.translate(W / 2, H / 2); g.rotate(HP);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let p = W * 0.62; g.font = c.font(p); while (g.measureText(text).width > H * 0.88 && p > 10) { p -= 2; g.font = c.font(p); }
  g.fillText(text, 0, 0); g.restore();
});
// 貼在立面上的一塊看板（x0～x1、y0～y1；x 給負數是從另一端算回來），text 空字串就是沒有字的色塊
const board = (text, bg, fg, x0, x1, y0, y1, o = {}) => (k, c) => {
  const X0 = x0 < 0 ? c.w + x0 : x0, X1 = x1 <= 0 ? c.w + x1 : x1, w = X1 - X0, h = y1 - y0, z = o.z ?? -0.14;
  k.box(X0, X1, y0, y1, z + 0.02, 0, bg, { col: false });
  if (text) k.plane(c.paint(text, bg, fg, o.sub || null, w, h, o.ppm || 72, o.style), w, h, (X0 + X1) / 2, (y0 + y1) / 2, z, c.FRONT, { emissive: o.em ?? 0.25 });
};
// 垂直立面挑出來的側招：預設中文直書（一字一行），rot 是英文字轉 90 度，flat 是橫寫
const blade = (text, bg, fg, x, y0, y1, o = {}) => (k, c) => {
  const X = x < 0 ? c.w + x : x, wd = o.wd || 0.7, out = o.out ?? 0.25, h = y1 - y0, zc = -(out + wd / 2);
  k.box(X - 0.04, X + 0.04, y0, y1, -(out + wd), -out, bg, { col: false });
  if (text) {
    const t = o.rot ? rotTex(c, text, bg, fg, wd, h) : c.paint(o.flat ? text : [...text].join('\n'), bg, fg, null, wd, h, 96);
    for (const sd of [-1, 1]) k.plane(t, wd, h, X + sd * 0.05, (y0 + y1) / 2, zc, sd * HP, { emissive: 0.3 });
  }
  for (const y of [y1 - 0.12, y0 + 0.06]) k.box(X - 0.03, X + 0.03, y, y + 0.06, -out, 0, '#3a3a3a', { col: false });
};
// 圓形側招
const disc = (text, bg, fg, x, y, o = {}) => (k, c) => {
  const X = x < 0 ? c.w + x : x, size = o.size || 0.95, out = o.out || 0.8;
  for (const sd of [-1, 1]) k.plane(c.roundSign(text, bg, fg), size, size, X + sd * 0.03, y, -out, sd * HP, { transparent: true, emissive: 0.3 });
  k.box(X - 0.02, X + 0.02, y - 0.03, y + 0.03, -out, 0, '#2a2a2a', { col: false });
};
// 樓上窗戶的外框（綠色鐵皮大賣場的紅框大窗）
const winFrame = (col) => (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh, x0 = 0.42, x1 = c.w - 0.42;
    for (const yy of [0.72, 2.2]) k.box(x0, x1, y + yy, y + yy + 0.09, -0.07, 0, col, { col: false });
    for (const x of [x0, x1 - 0.09]) k.box(x, x + 0.09, y + 0.72, y + 2.29, -0.07, 0, col, { col: false });
  }
};
// 樓上整片深色玻璃（from～to 樓）
const darkGlass = (col = '#2c333b', from = 2, to = 99) => (k, c) => {
  for (let f = Math.max(1, from - 1); f < Math.min(c.nf, to); f++) {
    const y = c.gf + (f - 1) * c.fh, n = Math.max(1, Math.round((c.w - 0.8) / 1.5));
    k.box(0.4, c.w - 0.4, y + 0.5, y + 2.65, -0.05, 0, col, { col: false });
    for (let j = 0; j <= n; j++) { const x = 0.4 + j * (c.w - 0.86) / n; k.box(x, x + 0.06, y + 0.5, y + 2.65, -0.07, 0, '#1c1c1e', { col: false }); }
  }
};
// 樓上把大窗蓋掉，只留幾扇小窗（鐵皮牆）
const smallWins = (wall, xs, o = {}) => (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0.3, c.w - 0.3, y + 0.6, y + 2.4, -0.06, 0, c.wallMat(wall), { col: false, tile: [0.6, 0.6] });
    for (const fx of xs) k.plane(o.grille === false ? c.ROWT.alWin() : c.YHT.win(), o.ww || 1.2, 1.1, c.w * fx, y + 1.55, -0.08, c.FRONT);
  }
};
// 夾娃娃機一排（開放店面裡）
const claws = (x0, x1, col = '#f2c230') => (k, c) => {
  const X1 = x1 <= 0 ? c.w + x1 : x1;
  for (let x = x0; x + 0.85 <= X1; x += 1.0) {
    k.box(x, x + 0.85, 0, 0.75, -0.75, -0.1, col, { col: false }); k.box(x + 0.04, x + 0.81, 0.75, 1.55, -0.72, -0.13, '#cfe6ee', { col: false });
    k.box(x, x + 0.85, 1.55, 1.95, -0.75, -0.1, col, { col: false }); k.box(x + 0.3, x + 0.55, 0.2, 0.45, -0.77, -0.75, '#2a2a2a', { col: false });
  }
};
// 路邊攤車：不鏽鋼車身、帆布圍布、上方小招
const cart = (x, o = {}) => (k, c) => {
  const X = x < 0 ? c.w + x : x, w = o.w || 1.5, z0 = o.z ?? -1.9;
  k.box(X, X + w, 0.15, 0.95, z0, z0 + 0.75, o.body || '#c9c9c4', { col: false });
  if (o.tarp) k.box(X - 0.03, X + w + 0.03, 0.1, 0.9, z0 - 0.03, z0, o.tarp, { col: false });
  for (const xx of [X + 0.03, X + w - 0.07]) k.box(xx, xx + 0.04, 0.95, 1.95, z0 + 0.03, z0 + 0.07, '#8d9196', { col: false });
  k.box(X, X + w, 1.1, 1.6, z0 + 0.3, z0 + 0.7, '#dfe9ec', { col: false });
  if (o.sign) { const [t, bg, fg] = o.sign; k.box(X, X + w, 1.95, 2.3, z0, z0 + 0.06, bg, { col: false }); if (t) k.plane(c.paint(t, bg, fg, null, w, 0.35, 96), w, 0.35, X + w / 2, 2.125, z0 - 0.01, c.FRONT, { emissive: 0.3 }); }
};
// 屋頂鐵籠／鐵架
const roofCage = (h = 2.0) => (k, c) => {
  const col = '#7a7e82', n = Math.max(1, Math.round(c.w / 1.2));
  for (let j = 0; j <= n; j++) { const x = 0.2 + j * (c.w - 0.45) / n; k.box(x, x + 0.05, c.top + 0.12, c.top + h, 0.15, 0.2, col, { col: false }); }
  for (const yy of [0.7, 1.3, h]) k.box(0.2, c.w - 0.2, c.top + yy - 0.05, c.top + yy, 0.15, 0.2, col, { col: false });
  k.box(0.2, c.w - 0.2, c.top + h - 0.05, c.top + h, 0.15, 3.0, col, { col: false });
};
// 整修中的鷹架
const scaffold = () => (k, c) => {
  const col = '#8a8f94';
  for (const x of [0.1, c.w / 2, c.w - 0.1]) k.box(x - 0.03, x + 0.03, 0, c.top + 0.6, -0.95, -0.89, col, { col: false });
  for (let y = 2.0; y < c.top + 0.6; y += 1.8) { k.box(0, c.w, y, y + 0.05, -0.95, -0.89, col, { col: false }); k.box(0, c.w, y - 0.04, y, -0.9, -0.15, '#a89a7a', { col: false }); }
};
// 轉角圓弧：接在格子外側的一段半徑 R 的圓弧牆（side -1 接在 x<0，+1 接在 x>w），bands = [[y0, y1, 顏色], …] 是繞著圓弧的色帶
const corner = (side, R, wall, bands = []) => (k, c) => {
  const cx = side < 0 ? 0 : c.w, m = c.wallMat(wall), xa = side < 0 ? -R : c.w, xb = side < 0 ? 0 : c.w + R;
  k.box(xa, xb, -0.8, c.top, R, c.d, m, { col: false, tile: [0.6, 0.6] });
  k.cyl(cx, R, R, -0.8, c.top, m, { seg: 24 });
  k.box(xa, xb, c.top, c.top + 0.12, R, c.d, 'gray', { col: false });
  k.cyl(cx, R, R + 0.02, c.top, c.top + 0.12, '#9a9a96', { seg: 24 });
  for (const [y0, y1, col] of bands) k.cyl(cx, R, R + 0.05, y0, y1, col, { seg: 24 });
  k.wallLine(cx, 0, cx + side * R * 0.7, R * 0.3, 0, c.top); k.wallLine(cx + side * R * 0.7, R * 0.3, cx + side * R, R, 0, c.top);
  k.wallLine(cx + side * R, R, cx + side * R, c.d, 0, c.top); k.wallLine(cx + side * R, c.d, cx, c.d, 0, c.top);
};
// 往街上再伸出去的一截帆布雨棚（夜市攤位的棚子比一般店面深），cols 給兩色就是條紋
const awnExt = (cols, z1 = -2.0, drop = 0.16) => (k, c) => {
  const A = [].concat(cols), n = A.length > 1 ? Math.max(2, Math.round(c.w / 0.3)) : 1, bw = c.w / n;
  for (let j = 0; j < n; j++) k.box(-0.05 + j * bw, -0.05 + (j + 1) * bw + 0.01, c.gf - 1.05 - drop, c.gf - 0.97 - drop, z1, -1.2, A[j % A.length], { col: false });
};
// 只從 from 樓開始往上的直條格柵／窗上遮陽棚（下面幾層被招牌蓋住）
const finsFrom = (col, from) => (k, c) => {
  for (let f = from - 1; f < c.nf; f++) { const y = c.gf + (f - 1) * c.fh; for (let x = 0.3; x <= c.w - 0.3; x += 0.55) k.box(x, x + 0.1, y + 0.1, y + c.fh - 0.1, -0.3, 0, col, { col: false }); }
};
const hoodsFrom = (col, from) => (k, c) => {
  for (let f = from - 1; f < c.nf; f++) { const y = c.gf + (f - 1) * c.fh; k.box(0.4, c.w - 0.4, y + 2.25, y + 2.33, -0.65, 0, col, { col: false }); }
};

// 點22 的橫招：米白花磚底、中央紅色菱形白字
const dian22 = (k, c) => {
  const w = c.w - 0.15, t = tex(c, 'dian22', w, 0.8, (g, W, H) => {
    g.fillStyle = '#efe6d6'; g.fillRect(0, 0, W, H); g.strokeStyle = '#d8c8a8'; g.lineWidth = 2;
    for (let x = 0; x < W; x += H / 2) { g.strokeRect(x, 0, H / 2, H / 2); g.strokeRect(x, H / 2, H / 2, H / 2); }
    g.fillStyle = '#c8372f'; g.beginPath(); g.moveTo(W / 2 - H * 1.3, H / 2); g.lineTo(W / 2, H * 0.03); g.lineTo(W / 2 + H * 1.3, H / 2); g.lineTo(W / 2, H * 0.97); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = c.font(H * 0.5); g.fillText('點22', W / 2, H * 0.52);
    g.fillStyle = '#6a4a3a'; g.font = c.font(H * 0.22, 700); g.fillText('港式點心專賣店', W * 0.82, H * 0.5);
  }, 128);
  k.plane(t, w, 0.8, c.w / 2, c.gf - 0.44, -0.3, c.FRONT, { emissive: 0.35 });
};
// 點22 二樓整面的港點照片看板（畫成一籠一籠的點心），下緣一排冷氣
const dimsum = (k, c) => {
  const w = c.w - 0.5, h = c.top - c.gf - 0.9, t = tex(c, 'dimsum', w, h, (g, W, H) => {
    g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, W, H); const R = H * 0.3;
    for (let i = 0; i < 6; i++) {
      const x = W * (i + 0.5) / 6, y = H * (i % 2 ? 0.62 : 0.4);
      g.fillStyle = '#c9a36a'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); g.fillStyle = '#e9d5a8'; g.beginPath(); g.arc(x, y, R * 0.84, 0, 7); g.fill();
      g.fillStyle = ['#f6ecd8', '#f0c060', '#f2dcc0', '#e8a070'][i % 4]; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + Math.cos(j * 1.57 + 0.6) * R * 0.4, y + Math.sin(j * 1.57 + 0.6) * R * 0.4, R * 0.3, 0, 7); g.fill(); }
    }
  }, 48);
  k.box(0.2, c.w - 0.2, c.gf + 0.55, c.top - 0.25, -0.16, 0, '#5a3a22', { col: false });
  k.plane(t, w, h, c.w / 2, c.gf + 0.6 + h / 2, -0.17, c.FRONT, { emissive: 0.2 });
  for (let i = 0; i < 3; i++) c.ac(k, c.w * (0.2 + i * 0.25), c.gf + 0.02, -0.5);
};
// 紅茶大苑攤位上方的藍色飲料看板（兩杯飲料）
const teaBoard = (k, c) => {
  const w = c.w - 0.2, h = 2.8, y0 = c.top + 0.5, t = tex(c, 'teaBoard', w, h, (g, W, H) => {
    g.fillStyle = '#3a5f8f'; g.fillRect(0, 0, W, H);
    for (const [fx, col] of [[0.34, '#b5482a'], [0.62, '#2a2422']]) {
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(W * fx - W * 0.1, H * 0.3, W * 0.2, H * 0.55); g.fillStyle = col; g.fillRect(W * fx - W * 0.085, H * 0.42, W * 0.17, H * 0.41);
      g.fillStyle = '#3f8a3a'; g.beginPath(); g.arc(W * fx, H * 0.28, W * 0.05, 0, 7); g.fill();
    }
    g.fillStyle = '#ffffff'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.font = c.font(H * 0.07, 700); g.fillText('TEA GARDEN DRINKS', W * 0.97, H * 0.1);
  }, 64);
  k.plane(t, w, h, c.w / 2, y0 + h / 2, 0.45, c.FRONT, { emissive: 0.3, double: true });
  for (const x of [0.3, c.w - 0.36]) k.box(x, x + 0.06, c.top, y0 + h * 0.6, 0.47, 0.55, '#4a4d50', { col: false });
};
// 鐵捲門上的彩色塗鴉
const graffiti = (k, c) => {
  const w = c.w - 0.5, h = c.gf - 1.0, cols = ['#e04a3a', '#f2b632', '#3aa0c8', '#5ab85a', '#c85ab0', '#f28a32', '#2a2a2a'];
  const t = tex(c, 'graffiti', w, h, (g, W, H) => {
    g.fillStyle = '#4a4e52'; g.fillRect(0, 0, W, H); let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 46; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 10 + rnd() * W * 0.1, 8 + rnd() * H * 0.1, rnd() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1; for (let y = 0; y < H; y += 10) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y + 7, W, 2); }
  }, 48);
  k.plane(t, w, h, c.w / 2, h / 2, -0.04, c.FRONT);
};
// BREAKING HEART 鐵捲門上的米色蝴蝶
const butterfly = (k, c) => {
  const t = tex(c, 'butterfly', 1.2, 1.2, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.fillStyle = '#e6d8b8';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(W / 2 + sx * W * 0.22, H * 0.36, W * 0.2, H * 0.24, sx * 0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(W / 2 + sx * W * 0.17, H * 0.7, W * 0.14, H * 0.17, -sx * 0.5, 0, 7); g.fill(); }
  });
  k.plane(t, 1.2, 1.2, c.w / 2, 1.15, -0.04, c.FRONT, { transparent: true });
};
// QUEEN SHOP 那棟樓層之間的深灰石材橫帶（4F 靠東南那半是深藍浪板）
const QS = (blue) => (k, c) => {
  for (const [y0, y1] of [[c.gf + c.fh - 0.45, c.gf + c.fh + 0.45], [c.gf + 2 * c.fh - 0.15, c.gf + 2 * c.fh + 0.15]]) k.box(0, c.w, y0, y1, -0.1, 0, '#5b5b5b', { col: false });
  if (blue) k.box(0, c.w, c.gf + 2 * c.fh + 0.15, c.top, -0.08, 0, '#3b4a66', { col: false });
};
// 木造老屋：2F 下緣的風化木板帶、木窗直櫺，屋頂上方再撐一大片往街上挑出的鐵皮棚
const woodHouse = (k, c) => {
  k.box(0, c.w, c.gf - 0.2, c.gf + 0.95, -0.14, 0, '#7d7a6c', { col: false });
  for (let x = 0.05; x <= c.w; x += 1.4) k.box(x, x + 0.1, c.gf + 0.95, c.top, -0.16, 0, '#5f5346', { col: false });
  for (const y of [c.gf + 1.9, c.top - 0.12]) k.box(0, c.w, y, y + 0.1, -0.15, 0, '#5f5346', { col: false });
  k.box(-0.05, c.w + 0.05, c.top + 1.9, c.top + 2.0, -2.2, 5, c.MR.roof, { col: false });
  for (const x of [0.1, c.w - 0.2]) k.box(x, x + 0.1, c.top, c.top + 1.9, 0.2, 0.3, '#6a6e72', { col: false });
};

// 左側 s 211～241 的綠色鐵皮大賣場（一整棟，照一樓店面分格）
const GREEN = { nf: 2, wall: '#a3ad8c', bal: 'plain', roof: 'flat', door: 0, d: 14 };
const RED = '#b5413a';
// 右側 s 309.8～332 的五層公寓
const APT = { nf: 5, wall: '#d8d6cc', bal: 'grille', hood: '#3f8a5a', roof: 'tank', door: 0, d: 12 };

export default {
  ownSign: ['粥品 飯糰 刈包', '五桐號', '點22', '迷客夏', '飲丹丘 In Dan Q', '煎茶苑', '楚記福建炒麵', '紅茶大苑', '嘉義雞肉飯', 'COMEBUY', 'QUEENSHOP', '口吅品平價牛排'],
  drop: [],
  fences: [],
  lots: [
    // ---- 左側（東北側）----
    // 綠色鐵皮大賣場（2024-08）：大仁四街轉角攤 → 粥品 → Mr.K → Lucy's → 五桐號 → Une Femme → ZF → 葱燒包
    ['S', 211, 214, -1, { ...GREEN, ground: 'stall', awn: '#2f8a5b', extra: all(winFrame(RED), awnExt('#2f8a5b'), (k, c) => {
      // 轉角往大仁四街那邊只有帆布棚：綠色大雨棚再接一塊紫色的
      k.box(c.w, c.w + 2.5, c.gf - 1.05, c.gf - 0.97, -1.25, 2.5, '#2f8a5b', { col: false }); k.box(c.w + 2.4, c.w + 2.5, 0, c.gf - 0.97, -1.2, -1.1, '#8d9196', { col: false });
      k.box(c.w + 0.05, c.w + 2.5, c.gf - 0.9, c.gf - 0.82, 2.5, 6, '#6a4fa0', { col: false }); k.box(c.w + 2.4, c.w + 2.5, 0, c.gf - 0.9, 5.9, 6, '#8d9196', { col: false });
      k.box(c.w + 0.02, c.w + 0.1, c.gf + 0.4, c.gf + 2.6, 2, 7, '#e8c62a', { col: false });                // 側牆的黃色大看板（字看不清楚，不放字）
    }) }],
    ['S', 214, 218.8, -1, { ...GREEN, sign: ['粥品 飯糰 刈包', '#2b2420', '#f2f2f2'], ground: 'stall', awn: ['#3b4a8c', '#ffffff'], extra: all(winFrame(RED), awnExt(['#3b4a8c', '#ffffff'])) }],
    ['S', 218.8, 222.3, -1, { ...GREEN, noband: true, sign2: ['Mr.K 台式炸雞', '#1f2f7a', '#ffffff'], ground: 'shutter', sh: '#3a3d42', awn: '#e8e6e0', extra: all(winFrame(RED), cart(1.0, { sign: ['鹽酥雞 香雞排', '#f4f2ec', '#c0281f'] })) }],
    ['S', 222.3, 227.2, -1, { ...GREEN, sign: ['Lucy\'s', '#4a4a4a', '#ffffff'], ground: 'shop', awn: '#3c3c3c', bikes: 3, extra: all(winFrame(RED), blade('Lucy\'s', '#3a3a3e', '#ffffff', -0.3, 3.6, 7.2, { rot: true, wd: 1.0, out: 0.3 })) }],
    ['S', 227.2, 231.1, -1, { ...GREEN, sign: ['五桐號 WOOTEA', '#f6f4ee', '#1a1a1a'], ground: 'stall', awn: ['#e8772e', '#ffffff'], extra: all(winFrame(RED), (k, c) => {
      k.box(0.05, c.w - 0.05, c.gf - 0.97, c.gf - 0.85, -0.3, 0, '#e8772e', { col: false });                // 橫招下緣的橘條
      for (const x of [0, c.w - 0.5]) k.box(x, x + 0.5, 0, c.gf - 1.0, -0.12, 0, '#e9dcc6', { col: false }); // 米色門柱
    }, blade('五桐號', '#e9dcc6', '#3a2a1a', 0.3, 0.9, 2.3, { wd: 0.4, out: 0.12 })) }],
    ['S', 231.1, 234, -1, { ...GREEN, noband: true, ground: 'shutter', sh: '#4a4a4a', awn: '#3a3a3a', extra: all(
      (k, c) => board('Une Femme', '#e6dccb', '#4a3428', 0.15, -0.15, c.gf - 0.1, c.top + 1.5, { sub: 'CLOTHES.SHOES', ppm: 64 })(k, c),
      blade('', '#f2f2ee', '#f2f2ee', -0.1, 3.4, 8.2, { wd: 0.5, out: 0.2 }),
      cart(0.6, { tarp: '#5a7ab0', sign: ['狀元香滷味', '#d8282f', '#f2d02a'] })) }],
    ['S', 234, 236.7, -1, { ...GREEN, sign: ['ZF', '#1c1c1c', '#ffffff'], ground: 'shutter', sh: '#3a3a3a', awn: '#3a3a3a', bal: 'rail', extra: all(
      blade('ZF', '#1c1c1c', '#ffffff', -0.4, 5.6, 6.9, { flat: true, wd: 1.3, out: 0.3 }), disc('Une Femme', '#efe6d6', '#4a3428', -0.4, 4.6, { size: 1.1, out: 0.9 })) }],
    ['S', 236.7, 240.9, -1, { ...GREEN, sign: ['', '#c8372f', '#c8372f'], banner: ['葱燒包', '#2c4a7a', '#f2d02a'], ground: 'shutter', sh: '#2c4a7a', awn: ['#d8433b', '#ffffff'], d: 12, extra: all(winFrame(RED), blade('', '#c8372f', '#c8372f', 0.15, 3.6, 6.2, { wd: 0.5, out: 0.2 })) }],
    // 80巷 → 點22、整修中的窄樓、多賀攝影細長大樓、BREAKING HEART／吳家紅茶冰老屋、MUNINN
    ['S', 246.5, 253.8, -1, { nf: 2, wall: '#f0efea', sign: ['', '#efe6d6', '#efe6d6'], ground: 'shop', bal: 'plain', roof: 'flat', door: 0, d: 10, extra: all(dian22, dimsum, blade('', '#f4f4f0', '#f4f4f0', -0.15, 3.4, 8.6, { wd: 0.45, out: 0.2 })) }],
    ['S', 253.8, 256.3, -1, { nf: 3, wall: '#b9b9b5', ground: 'shutter', bal: 'plain', roof: 'flat', door: 0, d: 10, extra: all(scaffold(), blade('多賀攝影', '#2a2624', '#ffffff', 0.1, 4.6, 8.2, { wd: 0.8, out: 1.0 })) }],
    ['S', 256.3, 261, -1, { nf: 8, wall: '#4a362d', noband: true, sign2: ['多賀攝影', '#3a2c26', '#ffffff'], ground: 'open', awn: '#7a8a78', bal: 'plain', roof: 'flat', door: 0, bikes: 4, d: 12, extra: all(claws(0.4, -0.3), finsFrom('#7a5a44', 3)) }],
    ['S', 261, 263.4, -1, { nf: 2, wall: '#8f8a80', sign: ['BREAKING HEART', '#1c1c1c', '#ffffff'], ground: 'shutter', sh: '#2e2e30', bal: 'plain', hood: '#a8452f', roof: 'flat', door: 0, d: 6, extra: butterfly }],
    ['S', 263.4, 266.2, -1, { nf: 2, wall: '#8f8a80', sign: ['吳家紅茶冰', '#2a63b8', '#ffffff'], ground: 'shutter', sh: '#3a5f9a', bal: 'plain', hood: '#a8452f', roof: 'flat', door: 0, d: 6 }],
    ['S', 267, 274.5, -1, { nf: 4, wall: '#d9d5bd', sign: ['MUNINN', '#f2f2f2', '#111111'], ground: 'shutter', sh: '#3a3a3a', awn: '#2e2e2e', roof: 'flat', door: 0, d: 12, extra: all(smallWins('#d9d5bd', [0.3, 0.72]), (k, c) => {
      for (const [x0, x1] of [[0, 0.4], [c.w - 0.4, c.w + 0.5]]) k.box(x0, x1, 0, c.top, -0.09, x1 > c.w ? 1.2 : 0, '#b5544a', { col: false }); // 兩側轉角的紅褐色柱（西北那根順便補上路彎出來的縫）
      blade('', '#c8483a', '#c8483a', 0.15, c.gf + 0.5, c.gf + 2.5, { wd: 1.5, out: 0.2 })(k, c);            // 東南角 2F 垂直挑出的鐵架廣告牌（仲介廣告，不放字）
    }) }],
    // 70巷 → 木條小間、HARPER 白色門面（後面紅褐高樓）、花果好日、迷客夏、beU、飲丹丘（s 300 以南是 2026-05）
    ['S', 281.1, 282.5, -1, { nf: 2, wall: '#5a4636', noband: true, ground: 'shutter', sh: '#3a4a52', bal: 'plain', roof: 'flat', door: 0, d: 5 }],
    ['S', 282.5, 291.4, -1, { nf: 1, gf: 5.0, wall: '#efefec', noband: true, ground: 'shutter', sh: '#a08462', door: 0, roofCol: '#e4e4e0', tower: { nf: 7, back: 3, wall: '#7a4a3e', balc: '#5a3a30' }, d: 14, extra: (k, c) => {
      k.box(0, c.w, 3.1, c.top, -0.26, 0, '#efefec', { col: false });                                        // 捲門上方整面白牆
      k.box(c.w - 1.6, c.w, 0, 3.1, -0.26, 0, '#efefec', { col: false }); k.box(0, 2.9, 0, 3.1, -0.26, 0, '#efefec', { col: false });
      // 白牆實景被探照燈打得很亮：再貼一層微微發光的白面，金色襯線字「HARPER」直接畫在上面（靠東南那端）
      const blank = tex(c, 'harperBlank', 1, 1, (g, W, H) => { g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, W, H); }, 16), hT = c.top - 3.1;
      const top = tex(c, 'harperTop', c.w, hT, (g, W, H) => {
        g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, W, H); g.fillStyle = '#b08f4c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${H * 0.25}px Georgia,"Times New Roman",serif`;
        [...'HARPER'].forEach((ch, i) => g.fillText(ch, W * (1 - 4.0 / c.w) + i * W * 0.62 / c.w, H * 0.62));
      }, 64);
      k.plane(top, c.w, hT, c.w / 2, 3.1 + hT / 2, -0.27, c.FRONT, { emissive: 0.3 });
      k.plane(blank, 1.6, 3.1, c.w - 0.8, 1.55, -0.27, c.FRONT, { emissive: 0.3 }); k.plane(blank, 2.9, 3.1, 1.45, 1.55, -0.27, c.FRONT, { emissive: 0.3 });
      k.box(0.35, 2.55, 0.9, 2.5, -0.31, -0.26, '#39424a', { col: false });                                  // 右側櫥窗
      k.box(0.25, 2.65, 2.5, 2.62, -1.0, -0.26, '#d9c9a3', { col: false }); k.box(0.25, 2.65, 2.3, 2.5, -1.0, -0.96, '#d9c9a3', { col: false }); // 櫥窗上的米色雨棚
      for (let x = 0.8; x < c.w; x += 1.9) { k.box(x, x + 0.04, c.top - 0.1, c.top + 0.5, -0.5, -0.46, '#5a5a5a', { col: false }); k.box(x - 0.1, x + 0.14, c.top + 0.4, c.top + 0.52, -0.72, -0.46, '#d8d8d4', { col: false }); } // 上緣一排探照燈
      for (let x = 0.5; x + 1.6 < c.w; x += 2.1) { k.box(x, x + 1.6, 0.75, 0.82, -2.0, -1.94, '#f2f2ee', { col: false }); for (const xx of [x, x + 1.54]) k.box(xx, xx + 0.06, 0, 0.8, -2.0, -1.94, '#f2f2ee', { col: false }); } // 門前白色矮欄杆
    } }],
    ['S', 291.4, 294.6, -1, { nf: 3, wall: '#5a3d30', noband: true, banner: ['花果好日', '#ffffff', '#1a1a1a'], sign2: ['Poker Justice', '#111111', '#ffffff'], ground: 'shutter', sh: '#d8ccb0', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: disc('Poker Justice', '#1f2f6a', '#ffffff', -0.3, 5.2) }],
    ['S', 294.6, 299.6, -1, { nf: 3, wall: '#2b3440', sign: ['迷客夏 Milk Shop', '#3c5a34', '#ffffff', '綠光牧場主題飲品'], ground: 'shutter', sh: '#d8ccb0', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(disc('', '#3c7a3a', '#ffffff', -0.4, 4.6, { size: 1.1, out: 0.9 }), board('', '#f4f2ec', '#1a1a1a', 0.3, -0.3, 1.75, 2.35, { z: -0.3 })) }],
    ['S', 299.6, 302.5, -1, { nf: 3, wall: '#7a4638', sign: ['beU', '#e8922e', '#4a2a1a'], ground: 'stall', awn: '#e8922e', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(darkGlass(), disc('beU', '#e8922e', '#4a2a1a', -0.3, 4.4), (k, c) => { for (const x of [0, c.w - 0.45]) k.box(x, x + 0.45, 0, c.gf - 1.0, -0.12, 0, '#e8922e', { col: false }); }) }],
    ['S', 302.5, 306.5, -1, { nf: 3, wall: '#7a4638', sign: ['IN DAN Q 飲丹丘', '#5f7fa8', '#ffffff'], ground: 'shutter', sh: '#d8ccb0', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(darkGlass('#2c333b', 2, 2), (k, c) => board('Poker Justice\n德州撲克競技協會', '#111111', '#ffffff', 0.3, -0.3, c.gf + c.fh + 0.5, c.top - 0.4)(k, c), disc('', '#5f7fa8', '#ffffff', 0.3, 4.4), (k, c) => {
      k.box(-0.12, 0, c.gf - 0.85, c.gf - 0.03, 0, 6, '#5f7fa8', { col: false });                             // 藍灰橫招轉進大仁三街
      for (let f = 1; f < c.nf; f++) k.box(-0.06, 0, c.gf + (f - 1) * c.fh + 0.5, c.gf + (f - 1) * c.fh + 2.65, 0.5, c.d - 0.5, '#2c333b', { col: false });
    }) }],
    // 大仁三街 → 2 層木造玻璃窗老屋（屋頂上再撐一大片鐵皮棚），亭仔腳的小木亭在中間那間門口
    ['S', 314.6, 318, -1, { nf: 2, bal: 'glass', glass: '#687074', ground: 'stall', awn: ['#2f8a5b', '#ffffff'], roof: 'flat', door: 0, d: 10, extra: all(woodHouse, (k, c) => {
      // 面向大仁三街的側牆也是整排木窗
      k.box(c.w, c.w + 0.14, c.gf - 0.2, c.gf + 0.95, 0, c.d, '#7d7a6c', { col: false }); k.box(c.w + 0.02, c.w + 0.06, c.gf + 0.95, c.top, 0, c.d, '#687074', { col: false });
      for (let z = 0.05; z <= c.d; z += 1.4) k.box(c.w, c.w + 0.16, c.gf + 0.95, c.top, z, z + 0.1, '#5f5346', { col: false });
      for (const y of [c.gf + 1.9, c.top - 0.12]) k.box(c.w, c.w + 0.15, y, y + 0.1, 0, c.d, '#5f5346', { col: false });
    }) }],
    ['S', 318, 323, -1, { nf: 2, bal: 'glass', glass: '#687074', noband: true, ground: 'open', tin: true, roof: 'flat', door: 0, d: 10, extra: all(woodHouse, (k, c) => {
      k.box(2.6, 4.2, 0, 0.9, -0.9, -0.2, '#e4e8ea', { col: false });                                        // 冰櫃
      // 門口的小木亭：深木招白字、灰瓦屋頂
      k.box(0.3, 1.9, 0, 1.0, -2.3, -1.3, '#5a4636', { col: false }); for (const [x, z] of [[0.3, -2.3], [1.82, -2.3], [0.3, -1.38], [1.82, -1.38]]) k.box(x, x + 0.08, 1.0, 2.2, z, z + 0.08, '#5a4636', { col: false });
      k.box(0.15, 2.05, 2.2, 2.34, -2.45, -1.15, '#7a7a76', { col: false }); k.box(0.3, 1.9, 1.85, 2.2, -2.32, -2.28, '#3a2c22', { col: false });
      k.plane(c.paint('亭仔腳', '#3a2c22', '#ffffff', null, 1.6, 0.35, 96), 1.6, 0.35, 1.1, 2.02, -2.33, c.FRONT, { emissive: 0.3 });
    }) }],
    ['S', 323, 330, -1, { nf: 2, bal: 'glass', glass: '#687074', noband: true, ground: 'shutter', sh: '#8a8a86', tin: true, roof: 'flat', door: 0, d: 10, extra: all(woodHouse, blade('', '#2e2a28', '#2e2a28', -1.0, 4.0, 7.4, { wd: 0.8, out: 0.2 })) }],

    // ---- 右側（西南側）----
    // 日新路轉角的煎茶苑白磁磚樓（一樓整排攤位）、紅茶大苑看板攤、手撕鹽水雞、嘉義雞肉飯（2024-08）
    ['S', 208.5, 213, 1, { nf: 2, wall: '#e4e2da', sign: ['', '#c8372f', '#c8372f'], ground: 'shop', awn: ['#2f8a5b', '#ffffff'], bal: 'plain', roof: 'flat', door: 0, d: 12, extra: awnExt(['#2f8a5b', '#ffffff']) }],
    ['S', 213, 217, 1, { nf: 2, wall: '#e4e2da', noband: true, ground: 'stall', awn: ['#2f8a5b', '#ffffff'], bal: 'plain', roof: 'bill', bill: ['煎茶苑', '#2f9a4f', '#ffffff', 3.9, 1.3], door: 0, d: 12, extra: (k, c) => {
      awnExt(['#2f8a5b', '#ffffff'])(k, c);
      k.cyl(0.5, -0.35, 0.22, 2.4, c.top + 0.8, '#b8bcc0', { seg: 10 });                                     // 很粗的銀色排煙管
      disc('', '#1c1c1c', '#d8d8d4', -0.4, 4.9, { size: 1.2, out: 0.9 })(k, c);
    } }],
    ['S', 217, 222.5, 1, { nf: 2, wall: '#e4e2da', noband: true, ground: 'stall', awn: ['#2f8a5b', '#ffffff'], bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(
      awnExt(['#2f8a5b', '#ffffff']), board('楚記 福建炒麵', '#1c1c1c', '#ffffff', -2.9, -0.5, 2.3, 3.05, { z: -1.3 }),            // 掛在棚子前緣的小黑招
      (k, c) => { k.plane(c.paint('煎茶苑', '#2f9a4f', '#ffffff', null, 2.4, 1.5, 80), 2.4, 1.5, c.w - 1.3, c.top + 1.2, 0.5, c.FRONT - 0.5, { emissive: 0.35, double: true }); k.box(c.w - 1.4, c.w - 1.3, c.top, c.top + 0.5, 0.4, 0.5, '#4a4d50', { col: false }); }, // 東南端屋頂斜放的同款看板
      cart(1.2, { tarp: '#7a9ac8' }), cart(3.4, { tarp: '#7a9ac8', sign: ['', '#2f9a4f', '#ffffff'] })) }],
    ['S', 222.5, 226, 1, { nf: 1, wall: '#d9d9d2', noband: true, ground: 'stall', awn: '#2f8a5b', roof: 'flat', roofCol: '#8fa8a8', door: 0, d: 6, extra: all(awnExt('#2f8a5b'), teaBoard, disc('紅茶大苑', '#1f2f5a', '#ffffff', -0.2, 4.3, { size: 1.2, out: 1.0 })) }],
    ['S', 226, 229.5, 1, { nf: 2, wall: '#d9d9d2', noband: true, sign2: ['手撕鹽水雞', '#e9dfa8', '#a03a2a'], ground: 'shutter', awn: '#8a8a86', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(disc('無骨豆乳雞', '#f0b090', '#c0281f', -0.3, 4.7, { size: 1.1, out: 1.0 }), cart(0.3, { tarp: '#5a7ab0' }), cart(1.9, { tarp: '#5a7ab0', w: 1.3 })) }],
    ['S', 229.5, 235, 1, { nf: 2, wall: '#d9d9d2', noband: true, sign2: ['嘉義雞肉飯', '#e3dc4a', '#c0281f'], ground: 'open', awn: '#6b4a3a', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(
      (k, c) => { for (const x of [0.1, 2.3, c.w - 0.6]) k.box(x, x + 0.5, 0, c.gf - 1.0, -0.12, 0, '#f0b429', { col: false }); k.box(-0.01, c.w + 0.01, c.top, c.top + 0.9, -0.05, 0.15, c.wallMat('#d9d9d2'), { col: false }); }, // 黃色門柱、女兒牆
      board('嘉義雞肉飯專賣店', '#f0c832', '#c0281f', 0.7, 2.2, 1.0, 2.0, { z: -0.2 }),
      blade('雞肉飯', '#f6f4ee', '#c0281f', -0.1, 3.6, 5.4, { wd: 0.6, out: 0.4 })) }],
    // 米色 3 層樓（招牌字看不清楚，不放字）、塗鴉鐵捲門樓、SHU'S VOGUE、EVLAB 入口＋麻辣臭豆腐、COMEBUY 圓角樓
    ['S', 235, 238.2, 1, { nf: 3, wall: '#cdbfa5', ground: 'shutter', sh: '#4a4a4a', awn: '#8a8a86', bal: 'grille', roof: 'flat', door: 0, d: 12, extra: all(board('', '#e8822a', '#ffffff', 0.3, -0.3, 3.5, 4.4), disc('', '#e8822a', '#1c1c1c', 0.25, 5.2)) }],
    ['S', 238.2, 241.5, 1, { nf: 3, wall: '#cdbfa5', ground: 'shutter', sh: '#4a4a4a', awn: '#8a8a86', bal: 'grille', roof: 'flat', door: 0, d: 12 }],
    ['S', 241.5, 244.8, 1, { nf: 2, wall: '#e6e4dc', noband: true, ground: 'shutter', awn: '#8a8a86', bal: 'plain', roof: 'flat', door: 0, d: 7, extra: all(graffiti, (k, c) => k.box(c.w, c.w + 0.75, 0, c.top, 0, 1.2, c.wallMat('#e6e4dc'), { col: false }), // 路在這裡轉彎，補上跟隔壁之間的縫
       roofCage(), board('Hippie', '#e9dcc0', '#d8382f', 0.4, -0.4, 3.4, 4.3)) }],
    ['S', 245.6, 250, 1, { nf: 2, wall: '#ecebe6', ground: 'shutter', awn: '#3a3a3a', bal: 'plain', big: ['SHU\'S VOGUE', '#f1efe9', '#1a1a1a'], bigFrom: 1, roof: 'flat', door: 0, d: 10, extra: roofCage(1.6) }],
    ['S', 250, 252.5, 1, { nf: 4, wall: '#e8e6df', noband: true, ground: 'open', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(
      (k, c) => { for (const x of [0, c.w - 0.55]) k.box(x, x + 0.55, 0, c.gf, -0.12, 0, '#f2f2ee', { col: false }); k.box(0, c.w, c.gf - 1.0, c.gf, -0.12, 0, '#f2f2ee', { col: false }); }, // 白色內縮的樓梯入口
      board('EVLAB', '#f2f2ee', '#1a1a1a', 0.6, -0.6, 2.4, 2.9, { z: -0.15 }), disc('EVLAB', '#f4f4f2', '#1a1a1a', -0.2, 4.6)) }],
    ['S', 252.5, 256, 1, { nf: 4, wall: '#e8e6df', noband: true, sign2: ['麻辣臭豆腐', '#f2c230', '#c0281f'], ground: 'shutter', sh: '#f0a020', awn: ['#2f8a5b', '#ffffff'], bal: 'plain', roof: 'flat', door: 0, d: 12, extra: (k, c) => { k.cyl(c.w - 0.4, -0.3, 0.2, c.gf + 1.5, c.top + 0.6, '#b8bcc0', { seg: 10 }); for (const x of [0, c.w - 0.4]) k.box(x, x + 0.4, 0, c.gf - 1.0, -0.1, 0, '#f2c230', { col: false }); } }],
    ['S', 256, 259.5, 1, { nf: 6, wall: '#ebe7dc', sign: ['COMEBUY', '#c8283c', '#ffffff', 'The world\'s tea shop'], ground: 'stall', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: (k, c) => {
      const y2 = c.gf, y3 = c.gf + c.fh, ring = [[c.gf - 0.85, c.gf - 0.03, '#c8283c'], [y2, y3, '#4a4d52']];
      for (let f = 2; f < c.nf; f++) ring.push([c.gf + (f - 1) * c.fh + 0.85, c.gf + (f - 1) * c.fh + 2.2, '#3f4a54']);
      corner(1, 2, '#ebe7dc', ring)(k, c);
      k.box(0, c.w, y2, y3, -0.1, 0, '#4a4d52', { col: false });                                              // 2F 深灰浪板
      board('EVLAB', '#4a4d52', '#ffffff', 0.5, 2.6, y2 + 1.2, y2 + 1.9, { z: -0.13 })(k, c);
      for (const x of [0, c.w - 0.3]) k.box(x, x + 0.3, 0, c.gf - 1.0, -0.12, 0, '#8a6a4a', { col: false }); // 木色門柱
      k.cyl(c.w + 0.3, -0.6, 0.05, y2, y2 + 2.6, '#5a4636', { seg: 6 }); k.cyl(c.w + 0.3, -0.6, 1.2, y2 + 2.2, y2 + 2.65, '#9a5a4a', { seg: 12, r1: 0.05 }); // 2F 露臺的咖啡色大陽傘
    } }],
    // 三和二街 → QUEEN SHOP 圓角 4 層樓（含 KOL）、ISME、套圈圈、貪婪之島、茶嘵伊轉角樓（s 300 以南是 2026-05）
    ['S', 274, 278.5, 1, { nf: 4, wall: '#e3d9bf', sign: ['QUEEN SHOP', '#3a3a3a', '#ffffff'], ground: 'shutter', sh: '#4a4a4a', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: (k, c) => {
      const ring = [[c.gf - 0.85, c.gf + 0.1, '#3a3a3a'], [c.gf + c.fh - 0.45, c.gf + c.fh + 0.45, '#5b5b5b'], [c.gf + 2 * c.fh - 0.15, c.gf + 2 * c.fh + 0.15, '#5b5b5b']];
      for (let f = 1; f < c.nf; f++) ring.push([c.gf + (f - 1) * c.fh + 0.95, c.gf + (f - 1) * c.fh + 2.2, f === 3 ? '#3b4a66' : '#4a4f58']);
      corner(-1, 2, '#e3d9bf', ring)(k, c); QS(false)(k, c);
      k.box(-0.6, c.w + 0.1, c.gf + 0.1, c.gf + 0.22, -1.9, 0, '#8a6a4a', { col: false });                    // 木格柵平頂雨庇
      for (const x of [-0.5, c.w - 0.1]) k.box(x, x + 0.08, 0, c.gf + 0.1, -1.85, -1.77, '#6a5a4a', { col: false });
    } }],
    ['S', 278.5, 282.5, 1, { nf: 4, wall: '#e3d9bf', sign: ['', '#3a3a3a', '#3a3a3a'], ground: 'shutter', sh: '#4a4a4a', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: QS(false) }],
    ['S', 282.5, 285, 1, { nf: 4, wall: '#e3d9bf', ground: 'shutter', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: QS(true) }],
    ['S', 285, 288, 1, { nf: 4, wall: '#e3d9bf', sign: ['KOL', '#2a2a2a', '#ffffff'], ground: 'shutter', sh: '#2f7f86', bal: 'plain', roof: 'flat', door: 0, d: 12, extra: all(QS(true), disc('', '#f2f4f8', '#2a5aa8', 0.3, 4.4)) }],
    ['S', 288, 291.4, 1, { nf: 3, wall: '#e7e5de', sign: ['ISME', '#1c1c1c', '#ffffff', '1984 your own unique style'], ground: 'shutter', sh: '#1f5a60', awn: '#6b4a3a', bal: 'plain', roof: 'flat', door: 0, d: 12 }],
    ['S', 291.4, 295.4, 1, { nf: 3, wall: '#bdb8ad', sign: ['套圈圈', '#f2d02a', '#2f8a3a'], ground: 'shutter', bal: 'plain', big: ['In Fun 24h', '#f2c230', '#c0281f'], bigFrom: 1, roof: 'flat', door: 0, d: 12, extra: all(
      blade('套圈圈', '#f2d02a', '#2a5aa8', -0.3, 3.5, 4.9, { flat: true, wd: 1.3, out: 0.3 }), blade('In Fun', '#1c1c1c', '#e8382f', 0.3, 5.2, 6.4, { flat: true, wd: 1.2, out: 0.3 })) }],
    ['S', 295.4, 299.5, 1, { nf: 3, wall: '#c9c5ba', sign: ['貪婪之島 Greed Island', '#8a5a3a', '#ffffff', 'GK抽賞｜盲盒｜一番賞｜潮流玩具'], ground: 'shutter', awn: '#4a4a4a', bal: 'plain', roof: 'flat', door: 0, d: 12 }],
    ['S', 299.5, 303.6, 1, { nf: 2, wall: '#e2e2dc', sign: ['茶嘵伊', '#1f4a4a', '#ffffff'], ground: 'stall', awn: '#ece6d6', bal: 'plain', roof: 'flat', door: 0, d: 5.5, extra: disc('茶嘵伊', '#1f4a4a', '#ffffff', -0.3, 4.3) }],
    // 91巷 → 5 層公寓：口吅品、汪汪星球、灰色店面、Q-LAB、夾娃娃機（2026-05）
    ['S', 309.8, 316, 1, { ...APT, hood: null, noband: true, ground: 'shutter', sh: '#8a4a3a', awn: '#e8782a', extra: (k, c) => { hoodsFrom('#3f8a5a', 4)(k, c); board('口吅品 水牛精神\n超值套餐\n平價·不失品質', '#f3b21c', '#c0281f', 0.3, -0.3, c.gf + 0.2, c.gf + 2 * c.fh - 0.4, { ppm: 56 })(k, c); } }],
    ['S', 316, 321, 1, { ...APT, sign: ['汪汪星球', '#2b2a5a', '#ffffff', 'クレーンゲーム 24H'], ground: 'open', awn: ['#2f8a5b', '#ffffff'], extra: claws(0.4, -0.3, '#f6f4ee') }],
    ['S', 321, 324.5, 1, { ...APT, noband: true, ground: 'shop', awn: ['#8a6a4a', '#ffffff'] }],
    ['S', 324.5, 328, 1, { ...APT, sign: ['Q-LAB', '#f4f4f2', '#111111'], ground: 'shop', awn: '#4a4a4a', bikes: 3, extra: all(blade('Q-LAB', '#f4f4f2', '#111111', -0.2, 5.0, 11.5, { rot: true, wd: 1.0, out: 0.3 }), blade('BABY SWEET', '#d8282f', '#ffffff', -1.4, 6.2, 7.7, { flat: true, wd: 1.6, out: 0.3 })) }],
    ['S', 328, 330, 1, { ...APT, sign: ['', '#e6dcc0', '#e6dcc0'], ground: 'open', awn: '#e8c62a', extra: claws(0.3, -0.2) }],
  ],
};
