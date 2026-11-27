import { shrinkFont } from '../../../graphics/FitText.js';
// 日新路各段共用的構件（從 src/world/buildings/shijian/S2.js 複製來的通用幾個，各段資料檔 import 這裡）。
// 每個構件都是 (k, c) => {...}，c 是 src/world/buildings/StreetRixin.js 傳給 spec.extra 的 ctx。
export const HP = Math.PI / 2;
export const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);
export const all =
  (...fs) =>
  (k, c) =>
    fs.forEach((f) => f(k, c));
// 自己畫的貼圖（招牌圖案、塗鴉…）
export const tex = (c, key, wm, hm, draw, ppm = 96) => {
  const W = r16(wm * ppm),
    H = r16(hm * ppm);
  return c.sg(`rxK_${key}|${W}x${H}`, W, H, (g) => draw(g, W, H));
};
// 字轉 90 度的直立招牌貼圖（英文店名的側招）
export const rotTex = (c, text, bg, fg, wm, hm) =>
  tex(c, `rot_${text}|${bg}|${fg}`, wm, hm, (g, W, H) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(HP);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    shrinkFont(g, text, H * 0.88, W * 0.62, 10, (sz) => c.font(sz));
    g.fillText(text, 0, 0);
    g.restore();
  });
// 貼在立面上的一塊看板（x0～x1、y0～y1；x 給負數是從另一端算回來），text 空字串就是沒有字的色塊
export const board =
  (text, bg, fg, x0, x1, y0, y1, o = {}) =>
  (k, c) => {
    const X0 = x0 < 0 ? c.w + x0 : x0,
      X1 = x1 <= 0 ? c.w + x1 : x1,
      w = X1 - X0,
      h = y1 - y0,
      z = o.z ?? -0.14;
    k.box(X0, X1, y0, y1, z + 0.02, 0, bg, { col: false });
    if (text)
      k.plane(
        c.paint(text, bg, fg, o.sub || null, w, h, o.ppm || 72, o.style),
        w,
        h,
        (X0 + X1) / 2,
        (y0 + y1) / 2,
        z,
        c.FRONT,
        { emissive: o.em ?? 0.25 }
      );
  };
// 垂直立面挑出來的側招：預設中文直書（一字一行），rot 是英文字轉 90 度，flat 是橫寫
export const blade =
  (text, bg, fg, x, y0, y1, o = {}) =>
  (k, c) => {
    const X = x < 0 ? c.w + x : x,
      wd = o.wd || 0.7,
      out = o.out ?? 0.25,
      h = y1 - y0,
      zc = -(out + wd / 2);
    k.box(X - 0.04, X + 0.04, y0, y1, -(out + wd), -out, bg, { col: false });
    if (text) {
      const t = o.rot
        ? rotTex(c, text, bg, fg, wd, h)
        : c.paint(o.flat ? text : [...text].join('\n'), bg, fg, null, wd, h, 96);
      for (const sd of [-1, 1])
        k.plane(t, wd, h, X + sd * 0.05, (y0 + y1) / 2, zc, sd * HP, { emissive: 0.3 });
    }
    for (const y of [y1 - 0.12, y0 + 0.06])
      k.box(X - 0.03, X + 0.03, y, y + 0.06, -out, 0, '#3a3a3a', { col: false });
  };
// 圓形側招
export const disc =
  (text, bg, fg, x, y, o = {}) =>
  (k, c) => {
    const X = x < 0 ? c.w + x : x,
      size = o.size || 0.95,
      out = o.out || 0.8;
    for (const sd of [-1, 1])
      k.plane(c.roundSign(text, bg, fg), size, size, X + sd * 0.03, y, -out, sd * HP, {
        transparent: true,
        emissive: 0.3,
      });
    k.box(X - 0.02, X + 0.02, y - 0.03, y + 0.03, -out, 0, '#2a2a2a', { col: false });
  };
// 樓上窗戶的外框（綠色鐵皮大賣場的紅框大窗）
export const winFrame = (col) => (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh,
      x0 = 0.42,
      x1 = c.w - 0.42;
    for (const yy of [0.72, 2.2])
      k.box(x0, x1, y + yy, y + yy + 0.09, -0.07, 0, col, { col: false });
    for (const x of [x0, x1 - 0.09])
      k.box(x, x + 0.09, y + 0.72, y + 2.29, -0.07, 0, col, { col: false });
  }
};
// 樓上整片深色玻璃（from～to 樓）
export const darkGlass =
  (col = '#2c333b', from = 2, to = 99) =>
  (k, c) => {
    for (let f = Math.max(1, from - 1); f < Math.min(c.nf, to); f++) {
      const y = c.gf + (f - 1) * c.fh,
        n = Math.max(1, Math.round((c.w - 0.8) / 1.5));
      k.box(0.4, c.w - 0.4, y + 0.5, y + 2.65, -0.05, 0, col, { col: false });
      for (let j = 0; j <= n; j++) {
        const x = 0.4 + (j * (c.w - 0.86)) / n;
        k.box(x, x + 0.06, y + 0.5, y + 2.65, -0.07, 0, '#1c1c1e', { col: false });
      }
    }
  };
// 樓上把大窗蓋掉，只留幾扇小窗（鐵皮牆）
export const smallWins =
  (wall, xs, o = {}) =>
  (k, c) => {
    for (let f = 1; f < c.nf; f++) {
      const y = c.gf + (f - 1) * c.fh;
      k.box(0.3, c.w - 0.3, y + 0.6, y + 2.4, -0.06, 0, c.wallMat(wall), {
        col: false,
        tile: [0.6, 0.6],
      });
      for (const fx of xs)
        k.plane(
          o.grille === false ? c.ROWT.alWin() : c.YHT.win(),
          o.ww || 1.2,
          1.1,
          c.w * fx,
          y + 1.55,
          -0.08,
          c.FRONT
        );
    }
  };
// 夾娃娃機一排（開放店面裡）
export const claws =
  (x0, x1, col = '#f2c230') =>
  (k, c) => {
    const X1 = x1 <= 0 ? c.w + x1 : x1;
    for (let x = x0; x + 0.85 <= X1; x += 1.0) {
      k.box(x, x + 0.85, 0, 0.75, -0.75, -0.1, col, { col: false });
      k.box(x + 0.04, x + 0.81, 0.75, 1.55, -0.72, -0.13, '#cfe6ee', { col: false });
      k.box(x, x + 0.85, 1.55, 1.95, -0.75, -0.1, col, { col: false });
      k.box(x + 0.3, x + 0.55, 0.2, 0.45, -0.77, -0.75, '#2a2a2a', { col: false });
    }
  };
// 路邊攤車：不鏽鋼車身、帆布圍布、上方小招
export const cart =
  (x, o = {}) =>
  (k, c) => {
    const X = x < 0 ? c.w + x : x,
      w = o.w || 1.5,
      z0 = o.z ?? -1.9;
    k.box(X, X + w, 0.15, 0.95, z0, z0 + 0.75, o.body || '#c9c9c4', { col: false });
    if (o.tarp) k.box(X - 0.03, X + w + 0.03, 0.1, 0.9, z0 - 0.03, z0, o.tarp, { col: false });
    for (const xx of [X + 0.03, X + w - 0.07])
      k.box(xx, xx + 0.04, 0.95, 1.95, z0 + 0.03, z0 + 0.07, '#8d9196', { col: false });
    k.box(X, X + w, 1.1, 1.6, z0 + 0.3, z0 + 0.7, '#dfe9ec', { col: false });
    if (o.sign) {
      const [t, bg, fg] = o.sign;
      k.box(X, X + w, 1.95, 2.3, z0, z0 + 0.06, bg, { col: false });
      if (t)
        k.plane(
          c.paint(t, bg, fg, null, w, 0.35, 96),
          w,
          0.35,
          X + w / 2,
          2.125,
          z0 - 0.01,
          c.FRONT,
          { emissive: 0.3 }
        );
    }
  };
// 屋頂鐵籠／鐵架
export const roofCage =
  (h = 2.0) =>
  (k, c) => {
    const col = '#7a7e82',
      n = Math.max(1, Math.round(c.w / 1.2));
    for (let j = 0; j <= n; j++) {
      const x = 0.2 + (j * (c.w - 0.45)) / n;
      k.box(x, x + 0.05, c.top + 0.12, c.top + h, 0.15, 0.2, col, { col: false });
    }
    for (const yy of [0.7, 1.3, h])
      k.box(0.2, c.w - 0.2, c.top + yy - 0.05, c.top + yy, 0.15, 0.2, col, { col: false });
    k.box(0.2, c.w - 0.2, c.top + h - 0.05, c.top + h, 0.15, 3.0, col, { col: false });
  };
// 整修中的鷹架
export const scaffold = () => (k, c) => {
  const col = '#8a8f94';
  for (const x of [0.1, c.w / 2, c.w - 0.1])
    k.box(x - 0.03, x + 0.03, 0, c.top + 0.6, -0.95, -0.89, col, { col: false });
  for (let y = 2.0; y < c.top + 0.6; y += 1.8) {
    k.box(0, c.w, y, y + 0.05, -0.95, -0.89, col, { col: false });
    k.box(0, c.w, y - 0.04, y, -0.9, -0.15, '#a89a7a', { col: false });
  }
};
// 轉角圓弧：接在格子外側的一段半徑 R 的圓弧牆（side -1 接在 x<0，+1 接在 x>w），bands = [[y0, y1, 顏色], …] 是繞著圓弧的色帶
export const corner =
  (side, R, wall, bands = []) =>
  (k, c) => {
    const cx = side < 0 ? 0 : c.w,
      m = c.wallMat(wall),
      xa = side < 0 ? -R : c.w,
      xb = side < 0 ? 0 : c.w + R;
    k.box(xa, xb, -0.8, c.top, R, c.d, m, { col: false, tile: [0.6, 0.6] });
    k.cyl(cx, R, R, -0.8, c.top, m, { seg: 24 });
    k.box(xa, xb, c.top, c.top + 0.12, R, c.d, 'gray', { col: false });
    k.cyl(cx, R, R + 0.02, c.top, c.top + 0.12, '#9a9a96', { seg: 24 });
    for (const [y0, y1, col] of bands) k.cyl(cx, R, R + 0.05, y0, y1, col, { seg: 24 });
    k.wallLine(cx, 0, cx + side * R * 0.7, R * 0.3, 0, c.top);
    k.wallLine(cx + side * R * 0.7, R * 0.3, cx + side * R, R, 0, c.top);
    k.wallLine(cx + side * R, R, cx + side * R, c.d, 0, c.top);
    k.wallLine(cx + side * R, c.d, cx, c.d, 0, c.top);
  };
// 往街上再伸出去的一截帆布雨棚（夜市攤位的棚子比一般店面深），cols 給兩色就是條紋
export const awnExt =
  (cols, z1 = -2.0, drop = 0.16) =>
  (k, c) => {
    const A = [].concat(cols),
      n = A.length > 1 ? Math.max(2, Math.round(c.w / 0.3)) : 1,
      bw = c.w / n;
    for (let j = 0; j < n; j++)
      k.box(
        -0.05 + j * bw,
        -0.05 + (j + 1) * bw + 0.01,
        c.gf - 1.05 - drop,
        c.gf - 0.97 - drop,
        z1,
        -1.2,
        A[j % A.length],
        { col: false }
      );
  };
// 只從 from 樓開始往上的直條格柵／窗上遮陽棚（下面幾層被招牌蓋住）
export const finsFrom = (col, from) => (k, c) => {
  for (let f = from - 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    for (let x = 0.3; x <= c.w - 0.3; x += 0.55)
      k.box(x, x + 0.1, y + 0.1, y + c.fh - 0.1, -0.3, 0, col, { col: false });
  }
};
export const hoodsFrom = (col, from) => (k, c) => {
  for (let f = from - 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0.4, c.w - 0.4, y + 2.25, y + 2.33, -0.65, 0, col, { col: false });
  }
};
