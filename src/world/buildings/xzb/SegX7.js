// 新中北路 s 630～731（游泳池與全人教育村之間那段；照 Google 街景 2026-05、國土測繪 2024 正射建模）
// 這段兩側都是校內有名字的建物（北：中原大學室內游泳池 w392023430；南：全人教育村 w392023429），本體不歸這裡，
// 範圍內也沒有任何填充樓，所以沒有 lots、沒有 drop，全部用 custom 補路邊的東西：
//   北側（+1）由東到西：人行小門（藍色開放時間牌）→ 黑色鐵欄杆圍牆（灰色方柱、s≈684 雙扇鐵門、紅布條）＋欄杆內一排樹
//                     → 人行道上整排機車 → 台電電箱群與灰色鐵網圍籬、塗鴉電箱 → 磚紅色厚簷涼亭（裡面停機車）
//                     → 249 巷口東南角的大樹林、黑色石材矮花台、綠籬
//   南側（-1）由東到西：大草坪上的紅葉大樹、往全人東側入口的扶手 → 人行道旁的綠籬與小樹、黃黑斜紋電桿
//                     → 全人大道口東側轉角的一排樹與矮綠籬（路燈遊戲本來就有）
// 249 巷口（北側）與全人大道口（南側）都在 s≈731 以西，這裡不蓋到那裡。
// 這段參考線在 s 641.5、687.4、718.6 有轉折，所以跟 SegL3.js 一樣一律先算世界座標再換回各 Kit 的區域座標：
//   A(s, off) ＝ 沿參考線 'X' 里程 s、離道路中心線 off 公尺（正＝北側、負＝南側）的世界座標 [x, z]
const REF = 'X';
const S0 = 564.6092358213785; // LINE[0] 在參考線 'X' 上的里程
const LINE = [
  [71.3, -101.0],
  [50.9, -108.0],
  [29.1, -115.5],
  [22.3, -117.5],
  [12.4, -120.9],
  [-1.5, -125.6],
  [-46.3, -135.7],
  [-77.0, -141.1],
  [-89.5, -142.7],
  [-96.6, -142.7],
  [-103.7, -142.9],
  [-144.9, -143.2],
];
const SEGL = LINE.slice(1).map((b, i) => Math.hypot(b[0] - LINE[i][0], b[1] - LINE[i][1]));
const A = (s, off = 0) => {
  let acc = 0;
  s -= S0;
  for (let i = 0; i < SEGL.length; i++) {
    const l = SEGL[i];
    if (s <= acc + l || i === SEGL.length - 1) {
      const a = LINE[i],
        b = LINE[i + 1],
        ux = (b[0] - a[0]) / l,
        uz = (b[1] - a[1]) / l,
        t = s - acc;
      return [a[0] + ux * t - uz * off, a[1] + uz * t + ux * off];
    }
    acc += l;
  }
  return LINE[0];
};
// 世界座標 → [s, off]（取最近的那一段）
const SO = (x, z) => {
  let best = null,
    acc = 0;
  for (let i = 0; i < SEGL.length; i++) {
    const a = LINE[i],
      b = LINE[i + 1],
      l = SEGL[i],
      ux = (b[0] - a[0]) / l,
      uz = (b[1] - a[1]) / l;
    const t = Math.min(l, Math.max(0, (x - a[0]) * ux + (z - a[1]) * uz)),
      d = Math.hypot(x - a[0] - ux * t, z - a[1] - uz * t);
    if (!best || d < best[0]) best = [d, acc + t, -(x - a[0]) * uz + (z - a[1]) * ux];
    acc += l;
  }
  return [best[1] + S0, best[2]];
};
// a→b 上比例 t 的點，再往行進方向的右手邊偏 v 公尺
const side = (a, b, t, v) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    l = Math.hypot(dx, dz) || 1;
  return [a[0] + dx * t - (dz / l) * v, a[1] + dz * t + (dx / l) * v];
};
const BENDS = [641.5, 687.4, 718.6];

// ---- 量好的位置（s、離中心線）----
const FENCE = 9.5; // 北側鐵欄杆線
const POSTS = [634.2, 639.1, 644.0, 648.9, 653.8, 658.7, 663.6, 668.5, 673.4, 678.3, 683.2];
const GATE = [683.2, 686.4]; // 雙扇鐵門
const POSTS2 = [686.4, 691.0, 695.5, 699.8]; // 欄杆一直接到電箱圍籬（街景 s≈700 往北看）
const BOX = { s0: 700.0, s1: 708.5, o0: 9.6, o1: 13.4 }; // 台電電箱圍籬
const PAV = { s0: 708.8, s1: 713.3, o0: 8.2, o1: 12.7 }; // 磚紅色涼亭
const PLANT = { s0: 713.6, s1: 728.4, o: 9.6 }; // 黑色石材矮花台前緣
const HEDGE_S = { o0: -6.7, o1: -7.9 }; // 南側人行道後面的綠籬帶

export default {
  drop: [], // 範圍內沒有填充樓
  ownSign: [],
  lots: [],

  custom(C) {
    const { THREE, VC, lcg, sg, paint, paintGeo } = C;
    const PI = Math.PI;
    const K = (p) => {
      const [s, off] = SO(p[0], p[1]),
        k = C.kit(REF, s - 0.01, s + 0.01, off < 0 ? -1 : 1, Math.max(0.05, Math.abs(off)));
      if (typeof k.w !== 'function') delete k.w; // C.kit 把寬度寫進 k.w 會蓋掉 Kit.w()（碰撞要用）
      return k;
    };
    const L = (k, p) => k.l(p[0], p[1]);
    const part = (k, g, hex) => k._part(VC, paintGeo(g, hex));
    // a→b 一條方塊：厚 th、高 y0～y1；col 預設有碰撞
    const slab = (k, a, b, th, y0, y1, hex, col = true) => {
      const [x0, z0] = L(k, a),
        [x1, z1] = L(k, b),
        dx = x1 - x0,
        dz = z1 - z0,
        len = Math.hypot(dx, dz);
      if (len < 0.01) return;
      const g = new THREE.BoxGeometry(len, y1 - y0, th);
      g.rotateY(-Math.atan2(dz, dx));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      part(k, g, hex);
      if (!col) return;
      if (th < 0.5) {
        k.wallLine(x0, z0, x1, z1, y0, y1);
        return;
      }
      const nx = ((-dz / len) * th) / 2,
        nz = ((dx / len) * th) / 2,
        c = [
          [x0 + nx, z0 + nz],
          [x1 + nx, z1 + nz],
          [x1 - nx, z1 - nz],
          [x0 - nx, z0 - nz],
        ];
      c.forEach((q, i) => {
        const r = c[(i + 1) % 4];
        k.wallLine(q[0], q[1], r[0], r[1], y0, y1);
      });
    };
    // 沿參考線一段 s0～s1、離中心線 o0～o1 的方塊（跨過轉折就切成幾段）
    const band = (k, s0, s1, o0, o1, y0, y1, hex, col = true) => {
      const om = (o0 + o1) / 2,
        th = Math.abs(o1 - o0);
      const cuts = [s0, ...BENDS.filter((v) => v > s0 && v < s1), s1];
      for (let i = 0; i < cuts.length - 1; i++)
        slab(k, A(cuts[i], om), A(cuts[i + 1], om), th, y0, y1, hex, col);
    };
    const cyl = (k, p, r, y0, y1, hex, o) => {
      const [x, z] = L(k, p);
      return k.cyl(x, z, r, y0, y1, hex, o);
    };
    const blob = (k, p, y, rx, ry, rz, hex) => {
      const [x, z] = L(k, p),
        g = new THREE.SphereGeometry(1, 8, 6);
      g.scale(rx, ry, rz);
      g.translate(x, y, z);
      part(k, g, hex);
    };
    // 沿 a→b 立一片雙面的網／欄杆貼圖
    const pane = (k, tex, a, b, y0, y1, o) => {
      const [x0, z0] = L(k, a),
        [x1, z1] = L(k, b);
      return k.plane(
        tex,
        Math.hypot(x1 - x0, z1 - z0),
        y1 - y0,
        (x0 + x1) / 2,
        (y0 + y1) / 2,
        (z0 + z1) / 2,
        -Math.atan2(z1 - z0, x1 - x0),
        { transparent: true, double: true, ...o }
      );
    };
    // 沿 a→b 貼一片朝街（朝 a→b 的左手邊）的單面貼圖
    const face = (k, tex, a, b, y0, y1, o = {}) => {
      const [x0, z0] = L(k, a),
        [x1, z1] = L(k, b);
      return k.plane(
        tex,
        Math.hypot(x1 - x0, z1 - z0),
        y1 - y0,
        (x0 + x1) / 2,
        (y0 + y1) / 2,
        (z0 + z1) / 2,
        -Math.atan2(z1 - z0, x1 - x0) + PI,
        o
      );
    };
    // 方柱（中心 p、邊長 a、沿 dir 方向擺正）
    const post = (k, p, a, y0, y1, hex, dir) => {
      const l = Math.hypot(dir[0], dir[1]),
        h = a / 2,
        d = [dir[0] / l, dir[1] / l];
      slab(
        k,
        [p[0] - d[0] * h, p[1] - d[1] * h],
        [p[0] + d[0] * h, p[1] + d[1] * h],
        a,
        y0,
        y1,
        hex
      );
    };
    const tdir = (s) => {
      const a = A(s - 0.5),
        b = A(s + 0.5);
      return [b[0] - a[0], b[1] - a[1]];
    };
    // 樹：樹幹＋四團樹冠；lean 是樹冠整團往哪個世界方向偏（公尺）
    const GREEN = ['#3f7a3a', '#4b8a3e', '#356b34', '#5a8f45'],
      DARK = ['#2f5f2e', '#3a6c36', '#2a5530', '#44773c'],
      AUTUMN = ['#8a3f2a', '#9a5a32', '#4b8a3e', '#5f7a3a', '#3f7a3a', '#a2472e'];
    const tree = (p, h, r, rnd, cols = GREEN, lean = [0, 0]) => {
      const k = K(p);
      cyl(k, p, 0.12 + r * 0.04, -1.5, h - r * 0.5, '#5f4632', { seg: 7, col: true });
      const c = [p[0] + lean[0], p[1] + lean[1]];
      for (const [dx, dy, dz, f] of [
        [0, 0.35, 0, 1],
        [-0.6, -0.25, 0.35, 0.75],
        [0.6, -0.2, -0.3, 0.78],
        [0.1, -0.3, 0.65, 0.7],
      ])
        blob(
          k,
          [c[0] + dx * r, c[1] + dz * r],
          h - r * 0.55 + dy * r,
          r * f,
          r * f * 0.72,
          r * f,
          cols[(rnd() * cols.length) | 0]
        );
    };
    // 機車：a 車尾、b 車頭（世界座標）→ 交給 ParkedScooters 統一實體化（碰撞＋撞倒＋F 騎走）
    const moto = (k, a, b, col) => {
      const mx = (a[0] + b[0]) / 2,
        mz = (a[1] + b[1]) / 2;
      k.I.addScooter(mx, mz, Math.atan2(b[0] - a[0], b[1] - a[1]), col);
    };
    const MCOL = [
      '#2a2a30',
      '#d8d8d2',
      '#b02a2a',
      '#2f6db3',
      '#3f7a4c',
      '#9a9ca0',
      '#f0f0ea',
      '#1f3a5f',
    ];
    // 一排機車：s0～s1，車尾離中心線 oRear、車頭朝 oFront，斜停 slant（弧度），fill 是停滿的比例
    const motoRow = (s0, s1, oRear, oFront, step, seed, slant = 0.25, fill = 0.85) => {
      const r = lcg(seed);
      let k = null,
        kS = -99;
      for (let s = s0; s <= s1; s += step) {
        if (r() > fill) continue;
        if (s - kS > 12) {
          k = K(A(s + 6, (oRear + oFront) / 2));
          kS = s;
        }
        const a = A(s, oRear),
          f = A(s, oFront),
          dx = f[0] - a[0],
          dz = f[1] - a[1],
          len = Math.hypot(dx, dz),
          ang = slant + (r() - 0.5) * 0.12,
          c = Math.cos(ang),
          sn = Math.sin(ang),
          ux = (dx * c - dz * sn) / len,
          uz = (dx * sn + dz * c) / len;
        moto(k, a, [a[0] + ux * 1.75, a[1] + uz * 1.75], MCOL[(r() * MCOL.length) | 0]);
      }
    };

    // ---- 貼圖 ----
    const T = {
      bars: () =>
        sg('xzX7bars', 512, 64, (g) => {
          // 黑色鐵欄杆：直條約 12 cm 一根，上下兩道橫桿
          g.clearRect(0, 0, 512, 64);
          g.fillStyle = '#1e1f21';
          for (let x = 2; x < 512; x += 13) g.fillRect(x, 0, 3, 64);
          g.fillRect(0, 3, 512, 4);
          g.fillRect(0, 54, 512, 4);
        }),
      mesh: () =>
        sg('xzX7mesh', 256, 128, (g) => {
          // 灰色方格鐵網
          g.clearRect(0, 0, 256, 128);
          g.strokeStyle = 'rgba(150,154,156,.9)';
          g.lineWidth = 1.5;
          for (let x = 0; x <= 256; x += 10) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, 128);
            g.stroke();
          }
          for (let y = 0; y <= 128; y += 10) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(256, y);
            g.stroke();
          }
          g.fillStyle = '#8f9294';
          g.fillRect(0, 0, 256, 4);
          g.fillRect(0, 124, 256, 4);
        }),
      graf: () =>
        sg('xzX7graf', 128, 128, (g) => {
          // 灰色電箱上的塗鴉（不寫字，只畫幾道噴漆線條）
          const r = lcg(7071);
          g.fillStyle = '#b8b8b4';
          g.fillRect(0, 0, 128, 128);
          g.lineCap = 'round';
          for (let i = 0; i < 9; i++) {
            g.strokeStyle = ['#2a2a2a', '#c8342c', '#2f6db3', '#e8b030', '#f4f4f0'][i % 5];
            g.lineWidth = 3 + r() * 6;
            g.beginPath();
            g.moveTo(r() * 128, 20 + r() * 100);
            g.bezierCurveTo(r() * 128, r() * 128, r() * 128, r() * 128, r() * 128, 20 + r() * 100);
            g.stroke();
          }
        }),
      cab: () =>
        sg('xzX7cab', 256, 96, (g) => {
          // 米白色台電電箱：四個門片、門縫與小把手
          g.fillStyle = '#d6d3cc';
          g.fillRect(0, 0, 256, 96);
          g.fillStyle = 'rgba(0,0,0,.28)';
          for (let x = 0; x <= 256; x += 64) g.fillRect(x - 1, 0, 2, 96);
          g.fillRect(0, 6, 256, 2);
          g.fillStyle = '#7a7a76';
          for (let x = 26; x < 256; x += 64) g.fillRect(x, 44, 12, 4);
          g.fillStyle = 'rgba(0,0,0,.12)';
          g.fillRect(0, 86, 256, 10);
        }),
    };

    // ================= 北側 =================
    // ---- 人行小門（s 630～634）：兩根灰色門柱、往北的步道、藍底白字開放時間牌 ----
    {
      const k = K(A(632, FENCE));
      for (const s of [630.45, 633.9]) {
        post(k, A(s, FENCE), 0.4, -0.3, 2.25, '#9a9a96', tdir(s));
        cyl(k, A(s, FENCE), 0.27, 2.25, 2.4, '#8a8a86', { seg: 4 });
      }
      // 步道鋪面（往北沿游泳池東側）
      band(k, 630.6, 633.5, FENCE - 0.2, 18.0, -0.3, 0.04, '#a8a49c', false);
      // 開放時間牌：掛在東側門柱朝街的那面（上方標題看不清，不寫）
      const p = A(630.45, FENCE - 0.22),
        q = A(630.45, FENCE - 5),
        [x, z] = L(k, p),
        [tx, tz] = L(k, q);
      k.plane(
        paint('OPEN', '#1f5fa8', '#ffffff', 'Mon-Fri 07:00-22:30', 0.55, 0.75, 160),
        0.55,
        0.75,
        x,
        1.45,
        z,
        Math.atan2(tx - x, tz - z),
        { emissive: 0.2 }
      );
    }
    // ---- 鐵欄杆圍牆（s 634～697）----
    {
      const bars = T.bars();
      const run = (list) => {
        const k = K(A((list[0] + list[list.length - 1]) / 2, FENCE));
        for (let i = 0; i < list.length; i++) {
          const s = list[i];
          post(k, A(s, FENCE), 0.36, -0.3, 2.1, '#9c9a95', tdir(s));
          cyl(k, A(s, FENCE), 0.26, 2.1, 2.2, '#8f8d88', { seg: 4 });
          if (i === list.length - 1) break;
          const a = A(s + 0.18, FENCE),
            b = A(list[i + 1] - 0.18, FENCE);
          slab(k, a, b, 0.26, -0.3, 0.3, '#8d8b86'); // 灰色水泥矮牆
          k.wallLine(...L(k, a), ...L(k, b), 0.3, 1.9);
          pane(k, bars, A(s + 0.18, FENCE + 0.02), A(list[i + 1] - 0.18, FENCE + 0.02), 0.3, 1.9);
        }
        return k;
      };
      run(POSTS);
      const k2 = run(POSTS2);
      // 雙扇鐵門（灰框黑欄杆，關著）
      const g0 = GATE[0] + 0.2,
        g1 = GATE[1] - 0.2,
        gm = (g0 + g1) / 2;
      for (const [a0, a1] of [
        [g0, gm - 0.02],
        [gm + 0.02, g1],
      ]) {
        slab(k2, A(a0, FENCE), A(a1, FENCE), 0.06, 0.08, 0.14, '#8a8c8e', false);
        slab(k2, A(a0, FENCE), A(a1, FENCE), 0.06, 1.84, 1.9, '#8a8c8e', false);
        slab(k2, A(a0, FENCE), A(a0 + 0.06, FENCE), 0.06, 0.08, 1.9, '#8a8c8e', false);
        slab(k2, A(a1 - 0.06, FENCE), A(a1, FENCE), 0.06, 0.08, 1.9, '#8a8c8e', false);
        pane(k2, bars, A(a0, FENCE + 0.01), A(a1, FENCE + 0.01), 0.14, 1.84);
      }
      k2.wallLine(...L(k2, A(g0, FENCE)), ...L(k2, A(g1, FENCE)), 0, 1.9);
      // 欄杆上的紅色布條（字看不清，不寫）
    }
    {
      // 欄杆上的紅色布條（街景 s≈684 往北看在鐵門東邊，字看不清，不寫）
      const k = K(A(680, FENCE));
      slab(k, A(678.8, FENCE - 0.06), A(682.0, FENCE - 0.06), 0.02, 0.85, 1.75, '#c0282a', false);
    }
    // ---- 欄杆內一排樹（樹冠往街上伸）----
    {
      const r = lcg(7101);
      for (const [s, h, rr] of [
        [637.5, 9.5, 3.4],
        [644.5, 10.5, 3.8],
        [651.5, 9.8, 3.5],
        [658.5, 10.2, 3.6],
        [665.5, 9.4, 3.3],
        [672.0, 9.8, 3.4],
        [678.5, 9.0, 3.1],
      ]) {
        const wall = 19.5 - (s - 634.6) * 0.1368, // 游泳池南牆離中心線的距離
          o = Math.min(FENCE + 1.3, (FENCE + wall) / 2),
          p = A(s, o),
          q = A(s, o - 1.4);
        tree(p, h, rr, r, DARK, [q[0] - p[0], q[1] - p[1]]);
      }
    }
    // ---- 人行道上的機車（兩排，s 634～708；鐵門與人行小門前留空）----
    motoRow(634.8, 682.6, 9.15, 7.0, 0.78, 7201, 0.22, 0.9);
    motoRow(687.0, 699.6, 9.15, 7.0, 0.78, 7202, 0.22, 0.9);
    motoRow(700.2, 703.0, 9.1, 7.0, 0.78, 7203, 0.22, 0.9);
    motoRow(705.0, 708.0, 9.1, 7.0, 0.78, 7204, 0.22, 0.9);
    motoRow(634.8, 708.0, 6.85, 4.95, 0.78, 7205, 0.22, 0.8);
    // ---- 台電電箱群與灰色鐵網圍籬（s 700～708.5）----
    {
      const k = K(A((BOX.s0 + BOX.s1) / 2, (BOX.o0 + BOX.o1) / 2)),
        mesh = T.mesh(),
        cab = T.cab();
      const c = [A(BOX.s0, BOX.o0), A(BOX.s1, BOX.o0), A(BOX.s1, BOX.o1), A(BOX.s0, BOX.o1)];
      c.forEach((p, i) => {
        const q = c[(i + 1) % 4];
        pane(k, mesh, p, q, 0.05, 2.6);
        k.wallLine(...L(k, p), ...L(k, q), 0, 2.6);
        post(k, p, 0.08, -0.2, 2.65, '#8f9294', tdir(BOX.s0));
      });
      for (const s of [702.8, 705.6]) {
        post(k, A(s, BOX.o0), 0.06, -0.2, 2.65, '#8f9294', tdir(s));
        post(k, A(s, BOX.o1), 0.06, -0.2, 2.65, '#8f9294', tdir(s));
      }
      // 電箱：四組，朝街那面貼門片
      const cs = [700.6, 702.6, 704.6, 706.4, 708.0];
      for (let i = 0; i < cs.length - 1; i++) {
        const s0 = cs[i] + 0.05,
          s1 = cs[i + 1] - 0.05,
          o0 = 10.3,
          o1 = 11.9,
          hh = i === 1 ? 2.2 : 2.4;
        band(k, s0, s1, o0, o1, -0.2, hh, '#d6d3cc', true);
        band(k, s0 - 0.04, s1 + 0.04, o0 - 0.05, o1 + 0.05, hh, hh + 0.08, '#c2bfb8', false);
        face(k, cab, A(s0, o0 - 0.01), A(s1, o0 - 0.01), 0.05, hh - 0.05);
      }
      // 圍籬外、機車堆裡的灰色塗鴉電箱
      band(k, 703.4, 704.6, 8.65, 9.25, -0.1, 1.4, '#b8b8b4', true);
      face(k, T.graf(), A(703.4, 8.63), A(704.6, 8.63), 0.05, 1.35);
    }
    // ---- 磚紅色厚簷涼亭（s 708.8～713.3）----
    {
      const k = K(A((PAV.s0 + PAV.s1) / 2, (PAV.o0 + PAV.o1) / 2)),
        d = tdir(PAV.s0);
      const cs = [
        A(PAV.s0 + 0.3, PAV.o0 + 0.3),
        A(PAV.s1 - 0.3, PAV.o0 + 0.3),
        A(PAV.s1 - 0.3, PAV.o1 - 0.3),
        A(PAV.s0 + 0.3, PAV.o1 - 0.3),
      ];
      for (const p of cs) post(k, p, 0.5, -0.2, 2.35, '#dcc8a8', d);
      // 後面一道米色矮牆（柱牆貼米色磁磚）
      slab(k, cs[3], cs[2], 0.22, -0.2, 1.1, '#dcc8a8');
      // 厚平頂：四面磚紅封簷＋頂板＋簷底
      const e = [A(PAV.s0, PAV.o0), A(PAV.s1, PAV.o0), A(PAV.s1, PAV.o1), A(PAV.s0, PAV.o1)];
      e.forEach((p, i) => slab(k, p, e[(i + 1) % 4], 0.3, 2.3, 3.2, '#cf6a40', false));
      band(k, PAV.s0 + 0.1, PAV.s1 - 0.1, PAV.o0 + 0.1, PAV.o1 - 0.1, 2.95, 3.12, '#8a8682', false);
      band(
        k,
        PAV.s0 + 0.15,
        PAV.s1 - 0.15,
        PAV.o0 + 0.15,
        PAV.o1 - 0.15,
        2.3,
        2.36,
        '#d9d4ca',
        false
      );
    }
    motoRow(709.4, 712.6, 12.0, 10.0, 0.8, 7206, 0.1, 0.95);
    motoRow(709.4, 712.6, 9.9, 8.0, 0.8, 7207, 0.1, 0.8);
    // ---- 249 巷口東南角：大樹林、黑色石材矮花台、機車、綠籬 ----
    {
      const k = K(A((PLANT.s0 + PLANT.s1) / 2, PLANT.o + 1));
      band(k, PLANT.s0, PLANT.s1, PLANT.o, PLANT.o + 0.35, -0.2, 0.45, '#2b2b2b');
      slab(k, A(PLANT.s0, PLANT.o), A(PLANT.s0, PLANT.o + 4.5), 0.35, -0.2, 0.45, '#2b2b2b');
      slab(k, A(PLANT.s1, PLANT.o), A(PLANT.s1, PLANT.o + 4.0), 0.35, -0.2, 0.45, '#2b2b2b');
      band(
        k,
        PLANT.s0 + 0.2,
        PLANT.s1 - 0.2,
        PLANT.o + 0.35,
        PLANT.o + 4.2,
        -0.2,
        0.36,
        '#4a3a2c',
        false
      );
      // 巷口轉角的低矮綠籬
      band(k, 728.8, 730.8, 7.2, 9.6, -0.2, 0.7, '#4f7a3a', true);
    }
    motoRow(714.2, 727.6, 9.3, 7.3, 0.78, 7208, 0.2, 0.85);
    {
      const r = lcg(7301);
      for (const [s, o, h, rr] of [
        [711.0, 16.0, 11.0, 4.8],
        [717.4, 12.8, 12.0, 5.0],
        [722.8, 16.8, 11.0, 4.8],
        [727.0, 12.4, 10.5, 4.4],
      ])
        tree(A(s, o), h, rr, r, DARK);
      // 花台裡的低矮灌木
      const k = K(A(721, PLANT.o + 2));
      for (let s = PLANT.s0 + 1; s < PLANT.s1 - 0.5; s += 1.6)
        blob(k, A(s, PLANT.o + 1.0 + r() * 0.8), 0.6, 0.8, 0.45, 0.8, GREEN[(r() * 4) | 0]);
    }

    // ================= 南側 =================
    // ---- 大草坪上的紅葉大樹（s 633～655）與往全人東側入口的扶手 ----
    {
      const r = lcg(7401);
      for (const [s, o, h, rr] of [
        [636.5, -10.5, 11.0, 4.4],
        [641.6, -9.2, 12.0, 4.3],
        [649.6, -8.2, 10.5, 3.2],
        [653.4, -8.0, 10.8, 3.8],
      ])
        tree(A(s, o), h, rr, r, AUTUMN);
      const k = K(A(645.5, -7.4));
      // 草坪（人行道後面到全人教育村牆腳）
      band(k, 633.6, 655.0, -6.7, -11.8, -0.3, 0.04, '#6f8f4a', false);
      for (const s of [644.4, 646.6]) cyl(k, A(s, -7.4), 0.035, -0.2, 0.95, '#9a9ca0', { seg: 6 });
      slab(k, A(644.4, -7.4), A(646.6, -7.4), 0.05, 0.92, 0.97, '#9a9ca0', false);
    }
    // ---- 人行道後面的綠籬帶（s 655～717）、小樹、黃黑斜紋電桿 ----
    {
      // 實景是灰色水泥矮花台（約 0.45 m），上面一排低矮灌木，不是整片綠牆
      for (const [k, a, b] of [
        [K(A(670, -7.3)), 655.0, 687.4],
        [K(A(702, -7.3)), 687.4, 717.0],
      ]) {
        band(k, a, b, HEDGE_S.o0, HEDGE_S.o1, -0.2, 0.45, '#8f8c86', true);
        band(
          k,
          a + 0.1,
          b - 0.1,
          HEDGE_S.o0 - 0.12,
          HEDGE_S.o1 + 0.12,
          0.45,
          0.78,
          '#3d6630',
          false
        );
      }
      // 綠籬後面到建物牆腳的草地
      band(K(A(670, -10)), 655.0, 687.4, HEDGE_S.o1, -11.8, -0.3, 0.04, '#6f8f4a', false);
      band(K(A(702, -10)), 687.4, 717.0, HEDGE_S.o1, -11.8, -0.3, 0.04, '#6f8f4a', false);
      const r = lcg(7501);
      for (const [s, h, rr] of [
        [666.0, 5.5, 2.2],
        [680.5, 6.0, 2.4],
        [696.0, 8.0, 3.0],
        [704.5, 8.5, 3.0],
        [711.5, 8.0, 2.9],
      ])
        tree(A(s, -8.9), h, rr, r, GREEN);
      // 黃黑斜紋水泥電線桿：街景 s≈700 一支、往東 s≈676 一支（後者位置 ±5 m），立在花台前緣；斜紋到約 2.6 m
      for (const ps of [676.0, 700.0]) {
        const p = A(ps, -6.4),
          kp = K(p),
          o = A(ps, -4.0);
        cyl(kp, p, 0.17, -1.5, 10.0, '#a9a79f', { seg: 8, col: true });
        for (let i = 0; i < 8; i++)
          cyl(kp, p, 0.182, 0.2 + i * 0.32, 0.52 + i * 0.32, i % 2 ? '#1c1c1e' : '#d8b02a', {
            seg: 8,
          });
        slab(kp, side(p, o, 0, -0.6), side(p, o, 0, 0.6), 0.12, 8.6, 8.72, '#8d9196', false);
      }
      // 南側路邊斜停一排機車（實景停在車道邊的機車格；遊戲的路較窄，放在路緣與花台之間的人行道上，電桿旁留空）
      motoRow(662.0, 674.6, -4.95, -6.55, 0.78, 7551, -0.22, 0.85);
      motoRow(677.4, 698.6, -4.95, -6.55, 0.78, 7552, -0.22, 0.85);
      motoRow(701.4, 706.0, -4.95, -6.55, 0.78, 7553, -0.22, 0.85);
    }
    // ---- 全人大道口東側轉角：一排樹、矮綠籬（s 717～728）----
    {
      const k = K(A(722.5, -6.9));
      band(k, 717.6, 727.6, -6.6, -7.2, -0.2, 0.6, '#4f7a3a', true);
      const r = lcg(7601);
      for (const s of [718.2, 720.5, 722.8, 725.1, 727.4])
        tree(A(s, -10.0), 8.5 + r() * 1.5, 2.9, r, GREEN);
      // 路燈遊戲本來就有一支（s≈716 南側），這裡不重複加
    }
  },

  // custom 佔的地：只圈真的蓋了東西的地方（樹不圈，樹下照樣留給遊戲）
  footprints() {
    const band = (s0, s1, o0, o1) => [A(s0, o0), A(s1, o0), A(s1, o1), A(s0, o1)];
    return [
      band(630.2, 641.5, 4.8, FENCE + 0.3),
      band(641.5, 687.4, 4.8, FENCE + 0.3),
      band(687.4, 700.0, 4.8, FENCE + 0.3), // 鐵欄杆圍牆與人行道上的機車
      band(630.6, 633.5, FENCE, 18.0), // 人行小門與步道
      band(700.0, 708.5, 4.8, 9.6),
      band(BOX.s0 - 0.1, BOX.s1 + 0.1, BOX.o0 - 0.1, BOX.o1 + 0.1), // 電箱群
      band(PAV.s0 - 0.1, PAV.s1 + 0.1, 4.8, PAV.o1 + 0.1), // 涼亭
      band(PLANT.s0, 718.6, 6.8, PLANT.o + 4.5),
      band(718.6, 731.0, 6.8, PLANT.o + 4.5), // 花台、機車、綠籬
      band(662.0, 687.4, -4.8, HEDGE_S.o0),
      band(687.4, 706.6, -4.8, HEDGE_S.o0), // 南側機車
      band(655.0, 687.4, HEDGE_S.o1 - 0.1, HEDGE_S.o0 + 0.1),
      band(687.4, 717.0, HEDGE_S.o1 - 0.1, HEDGE_S.o0 + 0.1), // 南側綠籬
      band(717.6, 727.6, -7.3, -6.5),
    ];
  },
};
