// 實踐路／弘揚路口兩棟轉角樓「面大仁二街」的那一面。量體在 src/world/buildings/shijian/S3.js（7-ELEVEN S 417.2～426.2、
// 永祿小吃＋後面的轉角白磁磚樓 S 399.5～406.5），這裡只補側面的立面，由那兩格的 extra 呼叫。
// 照 Google 街景 2024-08（大仁二街）與 2026-05（路口）、國土測繪 2024 正射；原本在 d2/segD.js、segF.js 照實景做過，
// 轉角改由實踐路那邊蓋之後搬過來，座標換成那兩格的側面。
const H = Math.PI / 2,
  FRONT = Math.PI;
const NC = { col: false },
  TL = { col: false, tile: [0.6, 0.6] },
  TC = { tile: [0.6, 0.6] };
const F = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;

// 側面的座標：u 沿立面、v < 0 往街上、y 高度（跟正面立面的 x、z 一樣寫）；a = ±90° 轉回那一格的區域座標，(tx, tz) 是 u = v = 0 的位置。
// su 把 u 方向等比例縮放（舊的立面量的是實景面寬，這一格的側面短一點時用）。
const faceKit = (k, c, a, tx, tz, su = 1) => {
  const P = a > 0 ? (u, v) => [v + tx, -u * su + tz] : (u, v) => [-v + tx, u * su + tz];
  const along = (rot) => Math.abs(Math.sin(rot)) < 1e-6; // 面向 ±v 的板子，寬度是沿 u 的，要跟著縮放
  return {
    box: (u0, u1, y0, y1, v0, v1, m, o) => {
      const [xa, za] = P(u0, v0),
        [xb, zb] = P(u1, v1);
      return k.box(
        Math.min(xa, xb),
        Math.max(xa, xb),
        y0,
        y1,
        Math.min(za, zb),
        Math.max(za, zb),
        m,
        o
      );
    },
    plane: (t, w, h, u, y, v, rot = 0, o) => {
      const [x, z] = P(u, v);
      return k.plane(t, along(rot) ? w * su : w, h, x, y, z, rot + a, o);
    },
    cyl: (u, v, r, y0, y1, m, o) => {
      const [x, z] = P(u, v);
      return k.cyl(x, z, r, y0, y1, m, o);
    },
    // 斜板：u0～u1，從 (vA, yA) 斜到 (vB, yB)（帆布棚、浪板雨遮、瓦簷）
    slab: (u0, u1, vA, yA, vB, yB, hex, th = 0.06) => {
      const L = Math.hypot(vB - vA, yB - yA),
        g = new c.THREE.BoxGeometry((u1 - u0) * su, th, L);
      g.rotateX(-Math.atan2(yB - yA, vB - vA));
      g.translate(((u0 + u1) / 2) * su, (yA + yB) / 2, (vA + vB) / 2);
      g.rotateY(a);
      g.translate(tx, 0, tz);
      k._part(c.VC, c.paintGeo(g, hex));
    },
  };
};

// ---------------- 貼圖 ----------------
const logo7 = (g, x, y, s) => {
  // 7-ELEVEN 標誌：橘紅漸層的 7 上面壓綠字
  const gr = g.createLinearGradient(0, y, 0, y + s);
  gr.addColorStop(0, '#f26b21');
  gr.addColorStop(0.48, '#f26b21');
  gr.addColorStop(0.52, '#e2231a');
  gr.addColorStop(1, '#e2231a');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = gr;
  g.font = `900 ${s * 1.05}px Arial,sans-serif`;
  g.fillText('7', x + s * 0.5, y + s * 0.54);
  g.font = `900 ${s * 0.25}px Arial,sans-serif`;
  g.lineWidth = s * 0.07;
  g.strokeStyle = '#ffffff';
  g.strokeText('ELEVEN', x + s * 0.5, y + s * 0.56);
  g.fillStyle = '#00843d';
  g.fillText('ELEVEN', x + s * 0.5, y + s * 0.56);
};
const bandTex = (c, wm, logo) => {
  // 白底橘綠紅橫條招牌帶
  const W = Math.max(64, Math.round((wm * 96) / 16) * 16);
  return c.sg(`d2C_7band_${W}_${logo ? 1 : 0}`, W, 96, (g) => {
    g.fillStyle = '#f7f7f4';
    g.fillRect(0, 0, W, 96);
    g.fillStyle = '#f26b21';
    g.fillRect(0, 14, W, 15);
    g.fillStyle = '#00843d';
    g.fillRect(0, 36, W, 24);
    g.fillStyle = '#e2231a';
    g.fillRect(0, 67, W, 15);
    if (logo) {
      g.fillStyle = '#f7f7f4';
      g.fillRect(W / 2 - 62, 0, 124, 96);
      logo7(g, W / 2 - 44, 4, 88);
    }
  });
};
const shelves = (g, W, Hh) => {
  // 便利商店裡面：天花燈、一排排貨架
  const gr = g.createLinearGradient(0, 0, 0, Hh);
  gr.addColorStop(0, '#fbf6e6');
  gr.addColorStop(1, '#d9d2bc');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, Hh);
  g.fillStyle = 'rgba(255,255,255,.95)';
  for (let x = 30; x < W; x += 90) g.fillRect(x, 14, 50, 6);
  const cols = ['#d94a3a', '#3a7ad9', '#e8b93a', '#4aa05a', '#8a5ad0'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < W / 23; i++) {
      g.fillStyle = cols[(i + r * 2) % 5];
      g.fillRect(14 + i * 23, Hh * 0.42 + r * Hh * 0.17, 18, Hh * 0.12);
    }
  g.fillStyle = '#8a8478';
  for (let r = 0; r < 3; r++) g.fillRect(8, Hh * 0.55 + r * Hh * 0.17, W - 16, 5);
  g.fillStyle = 'rgba(70,90,100,.28)';
  g.fillRect(0, 0, W, Hh); // 玻璃反光，看起來比裡面暗
};
const doorTex = (c) =>
  c.sg('d2C_7door', 384, 288, (g) => {
    // 轉角的玻璃自動門
    shelves(g, 384, 288);
    g.fillStyle = '#55595c';
    g.fillRect(0, 0, 384, 10);
    g.fillRect(0, 0, 8, 288);
    g.fillRect(376, 0, 8, 288);
    g.fillRect(189, 0, 6, 288);
    g.fillStyle = '#00843d';
    g.fillRect(130, 140, 124, 8);
  });
const shopTex = (c) =>
  c.sg('d2C_7shop', 768, 256, (g) => {
    // 大仁二街那面的整排落地玻璃（四片）
    shelves(g, 768, 256);
    g.fillStyle = '#55595c';
    g.fillRect(0, 0, 768, 8);
    for (const x of [0, 190, 380, 570, 760]) g.fillRect(x, 0, 8, 256);
  });
const posterTex = (c) =>
  c.sg('d2C_cityprima', 256, 192, (g) => {
    // 玻璃上的 CITY PRIMA 咖啡海報
    g.fillStyle = '#f3f1ec';
    g.fillRect(0, 0, 256, 192);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#3a3a3a';
    g.font = '700 22px Arial,sans-serif';
    g.fillText('CITY PRIMA', 128, 28);
    g.font = F(26, 700);
    g.fillText('精品咖啡', 128, 60);
    g.fillStyle = '#2a2624';
    g.fillRect(96, 92, 56, 78);
    g.fillStyle = '#e8e4da';
    g.fillRect(104, 112, 40, 26);
    g.fillStyle = '#d9b99a';
    g.fillRect(150, 130, 90, 34);
  });
export const grilleTex = (sg, n) =>
  sg(`d2C_grille${n}`, n * 77, 208, (g) => {
    // 白色鐵窗花：直條、上緣 n 個半圓拱，裡面是米色捲簾
    const W = n * 77;
    g.fillStyle = '#59636b';
    g.fillRect(0, 0, W, 208);
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fillRect(8, 8, W * 0.4, 192);
    g.fillStyle = '#b9b3a4';
    g.fillRect(0, 100, W, 60);
    g.strokeStyle = '#f1f0ea';
    g.fillStyle = '#f1f0ea';
    g.lineWidth = 4;
    g.strokeRect(2, 2, W - 4, 204);
    for (let x = 12; x < W; x += 14) g.fillRect(x, 46, 3, 160);
    g.fillRect(0, 44, W, 5);
    g.fillRect(0, 120, W, 4);
    for (let i = 0; i < n; i++) {
      const cx = 38 + i * 77;
      g.beginPath();
      g.arc(cx, 44, 36, Math.PI, 0);
      g.stroke();
      g.beginPath();
      g.arc(cx, 44, 18, Math.PI, 0);
      g.stroke();
      g.fillRect(cx - 1, 8, 3, 36);
    }
  });
const archTex = (c, frame, glass, spokes = 5) =>
  c.sg(`d2C_arch|${frame}|${glass}|${spokes}`, 256, 128, (g) => {
    // 半圓拱窗（放射狀窗櫺）
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
const archOpen = (c, key, body, top, frame) =>
  c.sg(`d2C_ao|${key}`, 128, 192, (g) => {
    // 拱形開口／小拱窗（背景透明）
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
const railTex = (c, n, col) =>
  c.sg(`d2C_rail|${n}|${col}`, n * 16, 64, (g) => {
    // 一排直條欄杆（背景透明）
    g.clearRect(0, 0, n * 16, 64);
    g.fillStyle = col;
    for (let i = 0; i < n; i++) g.fillRect(i * 16 + 6, 0, 4, 64);
    g.fillRect(0, 0, n * 16, 6);
    g.fillRect(0, 56, n * 16, 8);
  });
const lattice = (c, cols, rows, frame, glass, fw = 0.14) =>
  c.sg(`d2C_lat|${cols}|${rows}|${frame}|${glass}|${fw}`, cols * 48, rows * 48, (g) => {
    const f = 48 * fw;
    g.fillStyle = frame;
    g.fillRect(0, 0, cols * 48, rows * 48);
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = i * 48 + f / 2,
          y = j * 48 + f / 2,
          s = 48 - f;
        g.fillStyle = glass;
        g.fillRect(x, y, s, s);
        g.fillStyle = 'rgba(255,255,255,.10)';
        g.fillRect(x, y, s * 0.35, s);
      }
  });
const godTex = (c) =>
  c.sg('d2C_god', 64, 96, (g) => {
    g.fillStyle = '#d9c9a4';
    g.fillRect(0, 0, 64, 96);
    g.fillStyle = '#c8442c';
    g.fillRect(14, 30, 36, 56);
    g.fillStyle = '#2f6fb3';
    g.fillRect(20, 44, 24, 26);
    g.fillStyle = '#e8b88a';
    g.beginPath();
    g.arc(32, 20, 11, 0, 7);
    g.fill();
  });
const fanTex = (c) =>
  c.sg('d2C_fan', 96, 96, (g) => {
    g.fillStyle = '#e4e1d8';
    g.fillRect(0, 0, 96, 96);
    g.fillStyle = '#4a4c4e';
    g.beginPath();
    g.arc(48, 48, 36, 0, 7);
    g.fill();
    g.strokeStyle = '#8d9196';
    g.lineWidth = 2;
    for (let r = 8; r < 36; r += 7) {
      g.beginPath();
      g.arc(48, 48, r, 0, 7);
      g.stroke();
    }
  });

// 窗型冷氣＋上面的小鐵雨遮（u 是冷氣左緣）
const acHood = (f, u, y) => {
  f.box(u, u + 0.7, y, y + 0.45, -0.5, -0.06, '#e4e3de', NC);
  f.box(u + 0.05, u + 0.65, y + 0.06, y + 0.39, -0.505, -0.5, '#9c9a94', NC);
  f.box(u - 0.1, u + 0.8, y + 0.52, y + 0.57, -0.78, 0, '#9a9d9e', NC);
};

// ---------------- 7-ELEVEN 咖啡色磁磚 4 樓：面大仁二街那一面（S3.js S 417.2～426.2 那一格的 x = w 面）----------------
// u = 0 在路口那一端（大仁二街 s≈155.3），往東北到 u = d（s≈141.3）。實景分三段：
//   u 0～3.1 轉角（實景是 45° 切角，這裡量體是直角，切角面的自動門與標誌招牌帶放在這一段）
//   u 3.1～10.2 7-Eleven 落地玻璃店面（米色磁磚腰牆、CITY PRIMA 海報；三色招牌帶只到 u 7.7，後面是素面白樑）
//   u 10.2～d 樓梯／鐵窗那一開間的西南半（電箱、白色鐵窗花、2 樓高度的鐵皮雨遮上一排冷氣室外機；東北半 s 138～141.2 在 d2/segD.js）
export function sevenDaren2Face(k, c) {
  const f = faceKit(k, c, -H, c.w, 0),
    { gf, fh, top, nf, d } = c;
  const BROWN = c.wallMat('#83604f'),
    BEIGE = c.wallMat('#e2d6bd'),
    GREYW = c.wallMat('#c8c5bc'),
    TRIM = '#ded9cd';
  // 整面咖啡色磁磚（蓋掉外殼的素牆）
  f.box(0, d, gf - 0.05, top, -0.05, 0, BROWN, TL);
  // ---- 一樓 ----
  f.box(0, 0.55, 0, gf - 0.95, -0.22, 0, BEIGE, TL);
  f.box(2.55, 3.9, 0, gf - 0.95, -0.16, 0, BEIGE, TL); // 轉角兩根米色磁磚柱
  f.plane(doorTex(c), 2.0, gf - 0.95, 1.55, (gf - 0.95) / 2, -0.04, FRONT, { emissive: 0.3 });
  f.box(3.9, 10.1, 0, 0.9, -0.1, 0, BEIGE, TL); // 玻璃下的米色磁磚腰牆
  f.box(10.0, 10.2, 0, gf - 0.85, -0.1, 0, BEIGE, TL);
  f.plane(shopTex(c), 6.1, gf - 1.85, 6.95, 0.9 + (gf - 1.85) / 2, -0.04, FRONT, { emissive: 0.2 });
  f.plane(posterTex(c), 1.9, 1.45, 8.85, 1.7, -0.08, FRONT, { emissive: 0.4 });
  f.box(4.0, 7.6, 0.95, 1.2, -0.075, -0.045, '#f1f0ea', NC); // 玻璃下緣一排白底小貼紙
  // 招牌帶：轉角那一段正中是 7-ELEVEN 標誌，u 7.7 以後是素面白樑（跟正面的招牌帶在轉角接起來）
  f.box(-0.3, 7.7, gf - 0.95, gf - 0.05, -0.3, 0, '#f4f4f0', NC); // 從正面招牌帶的轉角接過來
  f.plane(bandTex(c, 3.1, true), 3.1, 0.9, 1.55, gf - 0.5, -0.31, FRONT, { emissive: 0.4 });
  f.plane(bandTex(c, 4.6, false), 4.6, 0.9, 5.4, gf - 0.5, -0.31, FRONT, { emissive: 0.4 });
  f.box(7.7, 10.2, gf - 0.85, gf - 0.15, -0.12, 0, '#e6e4dd', NC);
  // 樓梯／鐵窗那一開間：灰白水泥漆牆、電箱、白色鐵窗花，2 樓高度的平鐵皮雨遮上一排冷氣室外機
  f.box(10.2, d, 0, gf - 0.4, -0.12, 0, GREYW, TL);
  f.box(10.45, 11.05, 0.9, 2.4, -0.32, -0.12, '#9b9d98', NC);
  f.box(10.5, 11.0, 2.4, 2.75, -0.24, -0.12, '#a7a9a4', NC);
  f.plane(grilleTex(c.sg, 2), 1.75, 2.05, d - 0.9, 1.95, -0.13, FRONT);
  f.box(11.4, d, 0, 0.3, -0.75, -0.12, '#a3a19b', NC); // 鐵窗前的水泥台
  f.box(10.3, d, gf - 0.12, gf - 0.04, -1.1, 0, '#8f9394', NC);
  for (const u of [10.5, 12.2, d - 0.1])
    f.box(u, u + 0.05, gf - 0.5, gf - 0.12, -0.9, 0, '#6f7374', NC);
  const unit = (u, w, y, h, col) => {
    f.box(u, u + w, y, y + h, -0.85, -0.3, col, NC);
    for (let yy = y + 0.1; yy < y + h - 0.08; yy += 0.12)
      f.box(u + 0.06, u + w - 0.06, yy, yy + 0.04, -0.87, -0.85, '#a9a595', NC);
  };
  const y0 = gf - 0.04;
  unit(10.5, 0.85, y0, 0.6, '#eeeeea');
  unit(11.45, 0.8, y0, 0.55, '#d6d1bf');
  unit(12.35, 0.8, y0, 0.55, '#d6d1bf');
  unit(12.35, 0.8, y0 + 0.55, 0.5, '#d9d4c2');
  unit(13.2, 0.75, y0, 0.6, '#d6d1bf');
  // ---- 樓上：每層樓板一條白色飾帶，窗子之間是磚柱，每扇窗上半拉著米色捲簾，幾台窗型冷氣 ----
  const wins = [1.55, 4.55, 6.65, 8.75, 11.1, 13.0];
  for (let fl = 1; fl < nf; fl++) {
    const y = gf + (fl - 1) * fh;
    f.box(0, d, y + 0.2, y + 0.42, -0.08, 0, TRIM, NC);
    for (const u of wins) {
      const ww = u === 1.55 ? 1.25 : 1.45;
      if (u === 1.55) {
        f.box(u - 0.8, u + 0.8, y + 0.7, y + 2.4, -0.12, -0.05, TRIM, NC);
      } // 轉角那一扇是白色凸窗框
      f.plane(c.ROWT.alWin(), ww, 1.4, u, y + 1.5, u === 1.55 ? -0.13 : -0.06, FRONT);
      f.box(
        u - ww / 2 + 0.05,
        u + ww / 2 - 0.05,
        y + 1.62 + ((fl + Math.round(u)) % 2) * 0.18,
        y + 2.18,
        u === 1.55 ? -0.145 : -0.075,
        u === 1.55 ? -0.135 : -0.065,
        '#e3d9c0',
        NC
      );
      f.box(u - ww / 2 - 0.08, u + ww / 2 + 0.08, y + 0.72, y + 0.8, -0.16, 0, TRIM, NC); // 窗台
    }
  }
  for (const [u, fl] of [
    [5.4, 1],
    [9.6, 1],
    [3.0, 2],
    [7.5, 2],
    [12.0, 2],
    [5.5, 3],
    [9.7, 3],
    [12.1, 3],
  ])
    acHood(f, u, gf + (fl - 1) * fh + 0.95);
  // 3 樓窗戶下半的白底紅字「套房出租」布條（小字與私人電話不放）
  f.plane(
    c.paint('套房出租', '#f4f2ea', '#d42a1f', null, 1.5, 0.75),
    1.5,
    0.75,
    13.0,
    gf + fh + 1.15,
    -0.1,
    FRONT,
    { emissive: 0.15 }
  );
  f.box(0, 0.28, gf - 0.05, top, -0.1, 0, TRIM, NC); // 轉角的白色直飾帶
}

// ---------------- 轉角白磁磚樓（門牌 1）：面大仁二街那一面（S3.js S 399.5～406.5 那一格的 x = 0 面，z 6.5～14.5 的後棟）----------------
// u = 0 在東北端（大仁二街 s≈142.3），往西南到 u = 8.7（s≈151，接永祿小吃的小屋）；實景面寬 8.7 m，這一格的後棟只有 8 m，u 方向等比例縮一點。
// 一樓：東北半是「阿迪早點」早餐攤（白磁磚柱、不鏽鋼攤台、綠帆布捲棚、圓形燈箱、「飯糰」立牌），西南半是 1 號大門（深褐雙開鐵門、門神、紅浪板雨遮）；
// 攤子和大門往外搭出 2 m，上面是平台（通風球、大冷氣）。2 樓米黃磁磚兩個大半圓拱窗，3 樓往外挑 1 m（拱形陽台＋鐵窗花架），紅瓦簷。
export function adiDaren2Face(k, c) {
  const z0 = 6.5,
    f = faceKit(k, c, H, 0, c.d, (c.d - z0) / 8.7),
    w = 8.7;
  const WH = c.wallMat('#ecebe6'),
    BG = c.wallMat('#e8d2a2'),
    red = '#b8452f',
    tile = c.wallMat('#f4f4f0'),
    FZ = -2.0,
    P = 2.65,
    TOP3 = 9.3;
  f.box(0, 3.7, 0, 2.9, -0.06, 0, '#3a342c', NC);
  f.box(3.7, w, 0, 2.9, -0.06, 0, WH, TL);
  f.box(0, w, 2.9, 6.0, -0.06, 0, BG, TL);
  f.box(0, w, TOP3, 12.3, -0.06, 0, WH, TL); // 退縮的 4 樓（後棟一路蓋到 12.3）
  f.box(0, w, P, P + 0.25, FZ, 0, '#9a988f', NC); // 往外搭出來的平台
  // 阿迪早點
  f.box(0, 0.35, 0, P, FZ, FZ + 0.4, tile, TC);
  f.box(3.5, 3.9, 0, P, FZ, FZ + 0.4, tile, TC);
  f.box(3.7, 3.9, 0, P, FZ + 0.4, 0, WH, TC);
  f.plane(c.ROWT.shop('d2C_adi', '#f4e7cf', '#8a6a44', 517), 3.3, 2.4, 1.85, 1.3, -0.08, FRONT, {
    emissive: 0.35,
  });
  f.box(0.5, 3.3, 0, 0.95, FZ - 0.35, FZ + 0.2, '#c8d24a');
  f.box(0.45, 3.35, 0.95, 1.0, FZ - 0.4, FZ + 0.25, '#c4c8cc', NC);
  f.box(0.6, 1.2, 1.0, 1.25, FZ - 0.2, FZ + 0.15, '#8d9196', NC);
  f.box(2.3, 3.2, 1.0, 1.55, FZ - 0.12, FZ - 0.06, '#f2d43a', NC); // 黃色菜單板
  for (const u of [1.2, 2.5]) {
    f.box(u - 0.01, u + 0.01, 2.3, P, FZ + 0.29, FZ + 0.31, '#151515', NC);
    f.cyl(u, FZ + 0.3, 0.16, 2.1, 2.3, '#151515', { seg: 8, r1: 0.05, col: false });
  }
  f.slab(0.05, 3.85, FZ - 0.8, 2.05, FZ + 0.1, 2.72, '#2f9a78', 0.05); // 綠色帆布捲棚
  f.box(0.05, 3.85, 1.9, 2.1, FZ - 0.81, FZ - 0.78, '#2a8a6c', NC);
  f.cyl(1.0, -1.1, 0.26, P + 0.25, P + 0.55, '#c9ced2', { seg: 10, col: false });
  f.cyl(1.0, -1.1, 0.3, P + 0.55, P + 0.85, '#d5d9dc', { seg: 10, r1: 0.12, col: false }); // 通風球
  f.cyl(2.3, -0.8, 0.18, P + 0.25, P + 0.65, '#f0f0ec', { seg: 8, col: false });
  for (const sd of [-1, 1])
    f.plane(
      c.roundSign('阿迪早點', '#ffffff', '#111111'),
      0.66,
      0.66,
      3.95 + sd * 0.03,
      2.2,
      FZ - 0.78,
      sd * H,
      { transparent: true, emissive: 0.3 }
    );
  f.box(3.93, 3.97, 2.52, 2.56, FZ - 0.85, FZ - 0.4, '#1c1c1e', NC);
  // 「飯糰」立牌（黃底黑字）
  f.box(4.22, 4.28, 0.05, 1.15, FZ - 1.03, FZ - 0.47, '#3a3a3c', NC);
  for (const sd of [-1, 1])
    f.plane(
      c.paint('飯糰', '#f2d43a', '#1a1a1a', null, 0.6, 0.5),
      0.5,
      0.94,
      4.25 + sd * 0.035,
      0.65,
      FZ - 0.75,
      sd * H,
      { emissive: 0.15 }
    );
  // 1 號大門
  f.box(3.9, 4.6, 0, P, FZ - 0.4, FZ + 0.3, tile, TC);
  f.box(7.95, 8.65, 0, P, FZ - 0.4, FZ + 0.3, tile, TC);
  f.box(4.6, 7.95, 0, 2.35, FZ - 0.05, FZ + 0.05, '#6a4a38');
  f.box(4.6, 7.95, 2.35, P, FZ - 0.03, FZ + 0.03, '#4a3428', NC);
  for (let u = 4.75; u < 7.9; u += 0.4)
    f.box(u, u + 0.22, 2.02, 2.26, FZ - 0.06, FZ - 0.05, '#2a1c14', NC);
  f.box(6.26, 6.3, 0, 2.35, FZ - 0.065, FZ - 0.05, '#1a1210', NC);
  for (const u of [5.45, 7.1]) f.plane(godTex(c), 0.34, 0.5, u, 1.45, FZ - 0.07, FRONT);
  f.plane(
    c.paint('1', '#2f6fb3', '#ffffff', null, 0.2, 0.16),
    0.2,
    0.16,
    8.12,
    1.75,
    FZ - 0.41,
    FRONT
  );
  f.plane(
    c.paint('1', '#f3dede', '#c8202c', null, 0.2, 0.26),
    0.2,
    0.26,
    4.3,
    1.75,
    FZ - 0.41,
    FRONT
  );
  f.box(8.2, 8.5, 1.1, 1.45, FZ - 0.52, FZ - 0.4, '#c8202c', NC); // 紅信箱
  f.cyl(4.75, FZ - 0.2, 0.07, 0.05, 0.55, '#c8202c', { seg: 8, col: false }); // 滅火器
  f.slab(4.2, w, FZ - 0.75, 2.38, FZ, 2.74, '#c8442c', 0.05); // 紅橘色浪板小雨遮
  f.box(8.5, w, 0, P, FZ + 0.3, 0, WH, TC);
  // 平台上：大型冷氣室外機、鏽色浪板
  f.box(5.3, 6.3, P + 0.25, P + 1.25, -1.75, -0.95, c.MR.ac, NC);
  f.plane(fanTex(c), 0.9, 0.9, 5.8, P + 0.75, -1.76, FRONT);
  f.box(6.9, 8.4, P + 0.25, P + 1.0, -1.95, -1.9, '#a8683c', NC);
  // 2 樓：米黃磁磚牆上兩個大半圓拱窗，西南端兩個小拱窗
  for (const u of [1.75, 5.7])
    f.plane(archTex(c, '#efe7d2', '#4a5a60', 5), 2.4, 1.3, u, 4.4, -0.08, FRONT, {
      transparent: true,
    });
  for (const u of [7.5, 8.2])
    f.plane(archOpen(c, 'sm', '#4a5a60', '#4a5a60', '#efe7d2'), 0.5, 1.25, u, 4.45, -0.08, FRONT, {
      transparent: true,
    });
  // 3 樓：往外挑 1 m（托架），東北半拱形陽台＋欄杆，西南半鐵窗花架
  f.box(0, w, 5.8, TOP3, -1.0, 0, WH, TL);
  for (const u of [0, 4.25, w - 0.25]) {
    f.box(u, u + 0.25, 5.3, 5.8, -0.6, 0, '#e6e5e0', NC);
    f.box(u, u + 0.25, 5.55, 5.8, -0.9, -0.6, '#e6e5e0', NC);
  }
  f.plane(archOpen(c, 'balc', '#4a3d36', '#c9603a'), 2.25, 2.7, 2.7, 7.45, -1.02, FRONT, {
    transparent: true,
  });
  f.plane(archOpen(c, 'balc', '#4a3d36', '#c9603a'), 0.85, 2.5, 0.98, 7.35, -1.02, FRONT, {
    transparent: true,
  });
  f.box(0.55, 3.85, 6.1, 6.95, -1.03, -1.0, '#f0f0ec', NC);
  f.box(0.5, 3.9, 6.9, 6.96, -1.5, -1.0, '#d5d5d0', NC);
  f.plane(railTex(c, 24, '#e6e6e2'), 3.4, 0.85, 2.2, 7.4, -1.5, FRONT, {
    transparent: true,
    double: true,
  });
  f.box(4.75, 8.4, 6.35, 8.95, -1.3, -1.0, WH, TL);
  f.plane(lattice(c, 2, 1, '#f2f2ee', '#6d8088', 0.07), 3.2, 1.45, 6.57, 7.3, -1.31, FRONT);
  f.plane(archTex(c, '#f2f2ee', '#6d8088', 3), 2.6, 0.65, 6.57, 8.4, -1.31, FRONT, {
    transparent: true,
  });
  // 3 樓頂的紅瓦斜簷；4 樓一排格子窗
  f.slab(-0.1, w, -1.5, TOP3, 0.2, TOP3 + 1.0, red, 0.12);
  f.plane(lattice(c, 4, 1, '#f2f2ee', '#6d8088', 0.08), 4.4, 1.3, 4.6, 10.9, -0.08, FRONT);
  // 西南邊接著的永祿小吃小屋（量體是 S3.js 那一格的一樓外殼）：深褐木格柵牆、鏽鐵皮屋頂垂下來的破浪板與簷口舊招牌板（字看不清楚不放）
  const hu = w + z0 / ((c.d - z0) / 8.7); // 小屋的西南端（路口）
  f.box(w, hu, 0, 2.75, -0.08, 0, '#4a3626', NC);
  for (let u = w + 0.3; u < hu - 0.8; u += 1.5)
    f.plane(lattice(c, 3, 4, '#3a2a1e', '#6a5a48', 0.22), 1.2, 1.9, u + 0.6, 1.3, -0.09, FRONT);
  f.slab(w, hu, -0.7, 2.6, 0.1, 3.0, '#8f8074', 0.05);
  f.box(w + 0.4, hu - 0.4, 2.85, 3.35, -0.78, -0.72, '#d9dcd8', NC);
}
