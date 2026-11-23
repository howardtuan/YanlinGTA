// 日新路街屋資料：A 段 s 0～81.5（中山東路二段口到協同街口），兩側。格式見 src/world/buildings/StreetRixin.js 檔頭。
// 照 Google 街景建模：s<50 是 2024-08，協同二街以後是 2026-05（大埔鐵板燒左半 2024 是上官木桶鍋，2026 換成 MORE THAN TEA）。
// 巷口留空：中山東路（中心 s 0，寬 12，北緣 s≈6）、協同二街 s 51.9～56.9（只在左側，右側是 T 字）、協同街 s 78.5～84.5（左側斜著往回，大埔只蓋到 s 75、深 8 m；協同二街口前的白色矮樓只到 s 50）。
// 右側 s 54～66 是「中壢區普仁市民活動中心」，在 src/world/buildings/PurenCenter.js 另外蓋（OSM 輪廓偏了，那邊把它藏起來照實景重蓋），這段不蓋。
//   s 42.6～54 是廣源快餐那棟灰色七樓（實景整棟一直接到活動中心；s<50 照 2024 街景量的格子比 2026 的短了一截，所以拆兩格）。
// 兩個轉角樓面中山東路那一面也在這裡畫（天下眼鏡、小林眼鏡那棟圓角大樓）。
// 區域座標提醒：站在街上面對立面時，x 小的那一端在右手邊（左側 side -1 的格子 x=0 是 s 大的那端，右側 side +1 的格子 x=0 是 s 小的那端）。
import { HP, all, tex, board, blade, disc, cart } from './kit.js';

const TILE = '#dcd8ce'; // 小林眼鏡那棟七樓大樓的灰白磁磚
// 側面（中山東路那一面）的一樓店面與樓上窗戶：x 是側牆的位置，dir -1 朝 -x、+1 朝 +x，z0～z1 是沿側牆的範圍
const sideFace =
  (x, dir, z0, z1, o = {}) =>
  (k, c) => {
    // o.slope：側面不是垂直日新路時，x 隨 z 變化的斜率（x = x0 + slope·(z − z0)）
    const sl = o.slope || 0,
      xa = (z) => x + sl * (z - z0),
      rot = dir * HP + Math.atan(sl),
      Ls = Math.hypot(1, sl);
    const L = z1 - z0,
      zc = (z0 + z1) / 2,
      xp = (z) => xa(z) + dir * 0.03;
    if (o.shutter)
      k.plane(
        c.shutterTex(o.shutter),
        (L - 0.6) * Ls,
        c.gf - 1.0,
        xp(zc),
        (c.gf - 1.0) / 2,
        zc,
        rot
      );
    if (o.sign) {
      const [t, bg, fg] = o.sign;
      if (sl)
        slabC(
          k,
          c,
          xa(z0) + dir * 0.16,
          z0,
          xa(z1) + dir * 0.16,
          z1,
          0.28,
          c.gf - 0.9,
          c.gf - 0.05,
          bg
        );
      else
        k.box(x + dir * 0.02, x + dir * 0.3, c.gf - 0.9, c.gf - 0.05, z0, z1, bg, { col: false });
      k.plane(
        c.paint(t, bg, fg, null, (L - 0.1) * Ls, 0.8, 96),
        (L - 0.1) * Ls,
        0.8,
        xa(zc) + dir * 0.31,
        c.gf - 0.47,
        zc,
        rot,
        { emissive: 0.3 }
      );
    }
    const n = Math.max(1, Math.round(L / 3));
    for (let f = 1; f < c.nf; f++)
      for (let j = 0; j < n; j++) {
        const zz = z0 + ((j + 0.5) * L) / n;
        k.plane(
          c.YHT.win(),
          Math.min(1.8, L / n - 0.6) * Ls,
          1.3,
          xp(zz),
          c.gf + (f - 1) * c.fh + 1.5,
          zz,
          rot
        );
      }
  };
// 斜 45 度的一塊招牌（圓角或截角上）：cx,cz 中心、ang 面向（右側轉角 -3π/4 朝 -x -z）
const slant =
  (t, w, h, cx, y, cz, ang, o = {}) =>
  (k, c) =>
    k.plane(c.paint(t[0], t[1], t[2], t[3] || null, w, h, 96), w, h, cx, y, cz, ang, {
      emissive: o.em ?? 0.3,
    });
// 斜放的方塊（k.slab 不會自動轉成頂點色材質，這裡自己轉）
const slabC = (k, c, x0, z0, x1, z1, th, y0, y1, hex) => {
  const dx = x1 - x0,
    dz = z1 - z0,
    g = new c.THREE.BoxGeometry(Math.hypot(dx, dz), y1 - y0, th);
  g.rotateY(-Math.atan2(dz, dx));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  k._part(c.VC, c.paintGeo(g, hex));
};
// 二樓的斜格子鐵窗（巨贊那段）
const lattice = (x0, x1) => (k, c) => {
  const w = x1 - x0,
    h = 1.2,
    t = tex(
      c,
      'rxA_lattice',
      w,
      h,
      (g, W, H) => {
        g.fillStyle = '#3c3a36';
        g.fillRect(0, 0, W, H);
        g.strokeStyle = '#a89c86';
        g.lineWidth = 3;
        for (let x = -H; x < W + H; x += H / 3) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x + H, H);
          g.stroke();
          g.beginPath();
          g.moveTo(x + H, 0);
          g.lineTo(x, H);
          g.stroke();
        }
      },
      64
    );
  k.plane(t, w, h, (x0 + x1) / 2, c.gf + 2.2, -0.06, c.FRONT);
};
// 小林眼鏡：轉角截角上白色磁磚招牌盒（二樓高），藍字加圓形標誌，一樓是貼滿海報的玻璃店面
// 頂點色的稜柱（k.prism 不吃 '#hex'／'wall#hex'，這裡自己做）：pts = [[x, z], …]，牆面用帶磁磚紋的 WVC
const prismC = (k, c, pts, y0, y1, hex, wall = false) => {
  // 自己組有索引的幾何（position、normal、uv），才能跟 k.box 的方塊合併成同一個網格；pts 要是凸多邊形
  const P = [],
    N = [],
    U = [],
    I = [],
    quad = (a, b, cc, d, n) => {
      const o = P.length / 3;
      for (const v of [a, b, cc, d]) {
        P.push(...v);
        N.push(...n);
      }
      U.push(0, 0, 1, 0, 1, 1, 0, 1);
      I.push(o, o + 1, o + 2, o, o + 2, o + 3, o, o + 2, o + 1, o, o + 3, o + 2);
    }; // 兩面都畫，不用管繞向
  const n = pts.length,
    cx = pts.reduce((s, q) => s + q[0], 0) / n,
    cz = pts.reduce((s, q) => s + q[1], 0) / n;
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i],
      [bx, bz] = pts[(i + 1) % n];
    let nx = bz - az,
      nz = -(bx - ax);
    const L = Math.hypot(nx, nz) || 1;
    nx /= L;
    nz /= L;
    if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) {
      nx = -nx;
      nz = -nz;
      quad([bx, y0, bz], [ax, y0, az], [ax, y1, az], [bx, y1, bz], [nx, 0, nz]);
    } else quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [nx, 0, nz]);
  }
  for (const [y, ny] of [
    [y1, 1],
    [y0, -1],
  ]) {
    const o = P.length / 3;
    for (const [x, z] of pts) {
      P.push(x, y, z);
      N.push(0, ny, 0);
      U.push(x * 0.3, z * 0.3);
    }
    for (let i = 1; i < n - 1; i++) I.push(o, o + i, o + i + 1, o, o + i + 1, o + i);
  }
  const g = new c.THREE.BufferGeometry();
  g.setAttribute('position', new c.THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new c.THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new c.THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  k._part(wall ? c.WVC : c.VC, c.paintGeo(g, hex));
};
// 遊戲裡中山東路跟日新路的夾角比實景斜，面中山東路的那一面照遊戲的路斜切（x = KS(z)），才不會伸進中山東路
const KSL = 0.23,
  KS = (R, z) => Math.min(0, -R + KSL * Math.max(0, z - 1.3));
const kobayashi = (R) => (k, c) => {
  const A = [0.6, -0.35],
    B = [KS(R, 0.6 + R) - 0.2, 0.6 + R],
    y0 = c.gf,
    y1 = c.gf + 3.0,
    D = R + 4.5,
    F = (z) => KS(R, z);
  // 圓角大樓從三樓才開始，一二樓是截角的白色磁磚盒（一樓玻璃店面退進去一點）
  const m = c.wallMat(TILE);
  prismC(
    k,
    c,
    [
      [F(R), R],
      [0, R],
      [0, c.d],
      [F(c.d), c.d],
    ],
    y1,
    c.top,
    m.slice(4),
    true
  );
  k.cyl(0, R, R, y1, c.top, m, { seg: 24 });
  prismC(
    k,
    c,
    [
      [F(R), R],
      [0, R],
      [0, c.d],
      [F(c.d), c.d],
    ],
    c.top,
    c.top + 0.12,
    '#9a9a96'
  );
  k.cyl(0, R, R + 0.02, c.top, c.top + 0.12, '#9a9a96', { seg: 24 });
  prismC(
    k,
    c,
    [
      [F(D), D],
      [0, D],
      [0, c.d],
      [F(c.d), c.d],
    ],
    0,
    y1,
    m.slice(4),
    true
  );
  k.prism([[3.2, D], [F(D) - 0.2, D], B, A, [3.2, -0.35]], y0, y1, c.MR.white); // 二樓高的招牌盒
  k.prism(
    [
      [3.0, D],
      [F(D), D],
      [F(2.9), 2.9],
      [0.4, -0.05],
      [3.0, -0.05],
    ],
    0,
    y0,
    c.MR.black
  ); // 一樓店面
  k.wallLine(0.4, 0, F(2.9), 2.9, 0, c.top);
  k.wallLine(F(2.9), 2.9, F(c.d), c.d, 0, c.top);
  k.wallLine(F(c.d), c.d, 0, c.d, 0, c.top);
  // 截角面的外法線（朝 -x -z）；斜切後角度不是正 45 度，招牌跟著面轉
  const fl = Math.hypot(B[0] - A[0], B[1] - A[1]),
    nx = -(B[1] - A[1]) / fl,
    nz = (B[0] - A[0]) / fl,
    fr = Math.atan2(nx, nz);
  const mx = (A[0] + B[0]) / 2 + nx * 0.03,
    mz = (A[1] + B[1]) / 2 + nz * 0.03,
    L = fl - 0.3;
  slabC(k, c, 0.2, 0.08, F(2.73) + 0.05, 2.73, 0.06, 0.05, y0 - 0.1, '#5a6a74'); // 一樓截角的玻璃
  const logo = tex(
    c,
    'rxA_kbys',
    L,
    2.6,
    (g, W, H) => {
      g.fillStyle = '#f4f4f0';
      g.fillRect(0, 0, W, H);
      g.lineWidth = H * 0.07;
      g.strokeStyle = '#2a5fae';
      g.beginPath();
      g.arc(W / 2 - H * 0.12, H * 0.27, H * 0.15, 0.4, 5.8);
      g.stroke();
      g.strokeStyle = '#3aa08a';
      g.beginPath();
      g.arc(W / 2 + H * 0.12, H * 0.27, H * 0.15, 3.5, 2.6 + 6.28);
      g.stroke();
      g.fillStyle = '#2a4f9e';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let p = H * 0.32;
      g.font = c.font(p);
      while (g.measureText('小林眼鏡').width > W * 0.9) {
        p -= 2;
        g.font = c.font(p);
      }
      g.fillText('小林眼鏡', W / 2, H * 0.68);
    },
    96
  );
  k.plane(logo, L, 2.6, mx, y0 + 1.5, mz, fr, { emissive: 0.35 });
  // 一樓：截角下是玻璃門與 Clex1480 的海報
  const post = tex(
    c,
    'rxA_clex',
    2.4,
    1.6,
    (g, W, H) => {
      g.fillStyle = '#e8eef4';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2c6d0';
      g.fillRect(W * 0.52, 0, W * 0.48, H * 0.45);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = ['#d8b8a0', '#c8a890', '#e0c0a8', '#b89880'][i];
        g.beginPath();
        g.arc(W * (0.08 + i * 0.12), H * 0.22, H * 0.09, 0, 7);
        g.fill();
        g.fillStyle = '#ffffff';
        g.fillRect(W * (0.03 + i * 0.12), H * 0.31, W * 0.1, H * 0.2);
      }
      g.fillStyle = '#2a4f9e';
      g.font = c.font(H * 0.16);
      g.textAlign = 'left';
      g.fillText('Clex1480', W * 0.04, H * 0.68);
      g.fillStyle = '#c0281f';
      g.font = c.font(H * 0.18);
      g.fillText('1980', W * 0.6, H * 0.3);
    },
    80
  );
  k.plane(post, 2.4, 1.6, (0.4 - R) / 2 + nx * 0.2, 2.0, 1.45 + nx * 0.2, (-3 * Math.PI) / 4, {
    emissive: 0.2,
  });
  k.box(-0.6, 0.6, 0, 0.35, -1.2, -0.2, '#c9c5ba', { col: false }); // 門口的台階
  blade('小林眼鏡', '#f6f6f2', '#2a4f9e', 0.25, 0.35, 2.7, { wd: 0.45, out: 0.02 })(k, c); // 日新路側柱子上的直立小招
  // 圓角大樓上的出租看板與生鏽鐵架
  slant(
    ['出租\n廣告牆‧套房', '#f6e6d0', '#c0281f'],
    2.2,
    1.6,
    -0.707 * (R + 0.12),
    c.gf + 2 * c.fh + 1.6,
    R - 0.707 * (R + 0.12),
    (-3 * Math.PI) / 4
  )(k, c);
  slant(
    ['便宜出租', '#f2d230', '#1a1a1a'],
    2.0,
    0.8,
    -0.707 * (R + 0.12),
    c.gf + 4 * c.fh + 2.0,
    R - 0.707 * (R + 0.12),
    (-3 * Math.PI) / 4
  )(k, c);
  for (let a = 0; a <= 4; a++) {
    const t = Math.PI + (a * Math.PI) / 8,
      x = Math.cos(t) * (R + 0.5),
      z = R + Math.sin(t) * (R + 0.5);
    k.box(x - 0.04, x + 0.04, c.gf + 3 * c.fh, c.top + 0.8, z - 0.04, z + 0.04, '#7a4a2c', {
      col: false,
    });
  }
  for (const y of [c.gf + 3 * c.fh + 0.1, c.gf + 4 * c.fh + 0.1, c.top + 0.7])
    for (let a = 0; a < 4; a++) {
      const t0 = Math.PI + (a * Math.PI) / 8,
        t1 = t0 + Math.PI / 8,
        r = R + 0.5;
      slabC(
        k,
        c,
        Math.cos(t0) * r,
        R + Math.sin(t0) * r,
        Math.cos(t1) * r,
        R + Math.sin(t1) * r,
        0.06,
        y,
        y + 0.08,
        '#7a4a2c'
      );
    }
  // 屋頂女兒牆上一圈綠色琉璃瓦簷
  k.box(-0.1, c.w, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false });
};
// 鄉堤早午餐門口：綠色直立招牌、紅椅子
const xiangdi = (k, c) => {
  k.box(0.2, 0.75, 0, 2.5, -1.1, -0.9, '#2f9a52', { col: false });
  k.plane(
    c.paint('鄉\n堤', '#2f9a52', '#ffffff', '早午餐', 0.55, 2.4, 96),
    0.55,
    2.4,
    0.475,
    1.25,
    -1.11,
    c.FRONT,
    { emissive: 0.25 }
  );
  for (const x of [1.4, 2.3, 3.0]) {
    k.box(x, x + 0.4, 0, 0.45, -0.9, -0.5, '#d8342c', { col: false });
    k.box(x, x + 0.4, 0.45, 0.9, -0.52, -0.48, '#d8342c', { col: false });
  }
  k.box(1.8, 2.5, 0.7, 0.75, -0.95, -0.35, '#e8e6e0', { col: false });
  k.box(2.1, 2.2, 0, 0.7, -0.7, -0.6, '#8a8d90', { col: false });
};
// 50嵐：黃底招牌上的藍色橢圓標誌
const fifty = (k, c) => {
  const w = c.w - 0.15,
    t = tex(
      c,
      'rxA_50lan',
      w,
      0.9,
      (g, W, H) => {
        g.fillStyle = '#f2d630';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#2a5fae';
        g.beginPath();
        g.ellipse(W / 2, H / 2, W * 0.24, H * 0.36, 0, 0, 7);
        g.fill();
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = c.font(H * 0.42);
        g.fillText('50嵐', W / 2, H * 0.53);
      },
      128
    );
  k.box(0.05, c.w - 0.05, c.gf - 0.95, c.gf - 0.03, -0.28, 0, '#f2d630', { col: false });
  k.plane(t, w, 0.9, c.w / 2, c.gf - 0.49, -0.29, c.FRONT, { emissive: 0.35 });
};
// 全家：白底藍字招牌，上緣綠帶、下緣藍帶；轉進協同街那一面也有
const famSign = (L, x, z, rot) => (k, c) =>
  k.plane(
    tex(
      c,
      `rxA_fam${L}`,
      L,
      1.1,
      (g, W, H) => {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#2fa84a';
        g.fillRect(0, 0, W, H * 0.22);
        g.fillStyle = '#1f5fb0';
        g.fillRect(0, H * 0.9, W, H * 0.1);
        g.fillStyle = '#1f5fb0';
        g.textBaseline = 'middle';
        g.textAlign = 'center';
        g.font = c.font(H * 0.42);
        g.fillText('全家 FamilyMart', W * 0.42, H * 0.57);
        g.font = c.font(H * 0.17, 700);
        g.fillText('中壢日新店', W * 0.88, H * 0.6);
      },
      96
    ),
    L,
    1.1,
    x,
    c.gf - 0.45,
    z,
    rot,
    { emissive: 0.4 }
  );
// 鐵皮牆：直條浪板紋
const tinWall = (x0, x1, y0, y1) => (k, c) => {
  for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.25)
    k.box(x, x + 0.06, y0, y1, -0.05, 0, '#b4b8bb', { col: false });
};
// 大埔鐵板燒：屋頂的大招牌與鐵皮雙斜屋頂、一樓兩家店
const dapu = (k, c) => {
  const w = c.w,
    y0 = c.top + 0.05;
  k.box(0.2, w - 0.2, y0, y0 + 1.3, -0.25, 0.05, '#f4f2ee', { col: false });
  k.plane(
    tex(
      c,
      'rxA_dapu',
      w - 0.6,
      1.2,
      (g, W, H) => {
        g.fillStyle = '#f4f2ee';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#e07a96';
        g.fillRect(0, H * 0.78, W, H * 0.22);
        g.textBaseline = 'middle';
        g.textAlign = 'center';
        g.font = c.font(H * 0.6);
        g.fillStyle = '#1f6a3a';
        g.fillText('大埔', W * 0.26, H * 0.42);
        g.fillStyle = '#c0281f';
        g.fillText('平價鐵板燒', W * 0.6, H * 0.42);
      },
      64
    ),
    w - 0.6,
    1.2,
    w / 2,
    y0 + 0.65,
    -0.26,
    c.FRONT,
    { emissive: 0.35 }
  );
  // 雙斜屋頂（屋脊順著路）
  const { THREE } = c,
    rise = 1.6,
    half = c.d / 2,
    ln = Math.hypot(half, rise),
    ang = Math.atan2(rise, half);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(w + 0.3, 0.08, ln + 0.3);
    g.rotateX(s * ang);
    g.translate(w / 2, c.top + rise / 2, half + (s * half) / 2);
    k._part(c.VC, c.paintGeo(g, '#c9ccce'));
  }
  // 一樓：左半（x 大）MORE THAN TEA，右半（x 小）大埔鐵板燒的紅色招牌
  board('MORE THAN TEA', '#efe6d2', '#5a3a22', -8.2, -0.3, c.gf - 0.95, c.gf - 0.25, { z: -0.25 })(
    k,
    c
  );
  k.box(w - 8.0, w - 4.6, 0, 0.9, -0.1, 0, '#a8343a', { col: false });
  board('大埔鐵板燒', '#c8372f', '#ffffff', 0.4, 8.0, c.gf - 0.95, c.gf - 0.25, { z: -0.25 })(k, c);
  board('新品上市', '#d8342c', '#ffffff', 8.6, 11.6, c.gf - 1.6, c.gf - 1.05, { z: -0.2 })(k, c);
  blade('大埔鐵板燒', '#f4f2ee', '#c0281f', 0.3, 2.2, 7.4, { wd: 0.9, out: 0.6 })(k, c);
  k.box(-0.01, w + 0.01, 0.01, 0.03, -1.9, 0, '#d8a69a', { col: false }); // 前面的紅白地磚
};

export default {
  ownSign: [
    '小林眼鏡',
    '三家專業烤肉',
    '明日理髮廳',
    '美衣潔智能自助洗衣',
    '上宇林',
    '鄉堤早餐',
    '草地人牛排',
    '喵宅MeowHouse',
    '大埔鐵板燒',
  ],
  drop: [
    'f2_272',
    'f2_291',
    'f2_292',
    'f2_293',
    'f2_294',
    'f2_309',
    'f1726',
    'f1727',
    'f1728',
    'f1729',
    'f1730',
  ],
  fences: [],
  lots: [
    // ---- 左側（-1，西北側）：天下眼鏡轉角 → 協同二街 ----
    // 天下眼鏡：六樓米色磁磚轉角樓，中山東路面綠色大招牌、PENTAX 大看板、兩樘鐵捲門
    [
      'R',
      7.5,
      12.8,
      -1,
      {
        nf: 6,
        wall: '#d9ccb0',
        sign: ['天下光學隱形眼鏡', '#1f6e6a', '#ffffff', '服務中心'],
        ground: 'shutter',
        sh: '#4a6670',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 9.2,
        extra: all(
          sideFace(5.3, 1, 0, 9.2, {
            shutter: '#4a6670',
            sign: ['天下光學隱形眼鏡', '#1f6e6a', '#ffffff'],
          }),
          (k, c) => {
            k.box(c.w + 0.02, c.w + 0.35, 0, c.gf - 0.9, 4.3, 4.9, '#e8a0a8', { col: false });
          },
          (k, c) => {
            const y0 = c.gf + 0.4,
              h = 2 * c.fh + 0.6;
            k.box(c.w + 0.02, c.w + 0.2, y0, y0 + h, 1.0, 6.4, '#f4f1ec', { col: false });
            k.plane(
              tex(
                c,
                'rxA_pentax',
                5.2,
                h,
                (g, W, H) => {
                  g.fillStyle = '#f4f1ec';
                  g.fillRect(0, 0, W, H);
                  g.fillStyle = '#c8402a';
                  g.fillRect(W * 0.08, H * 0.12, W * 0.45, H * 0.6);
                  g.fillStyle = '#2a2a2a';
                  g.beginPath();
                  g.arc(W * 0.3, H * 0.3, H * 0.12, 0, 7);
                  g.fill();
                  g.fillStyle = '#1a1a1a';
                  g.textAlign = 'center';
                  g.font = c.font(H * 0.1);
                  g.fillText('PENTAX', W * 0.75, H * 0.12);
                  g.fillStyle = '#2a4f9e';
                  g.fillRect(W * 0.08, H * 0.8, W * 0.84, H * 0.12);
                },
                48
              ),
              5.2,
              h,
              c.w + 0.22,
              y0 + h / 2,
              3.7,
              HP,
              { emissive: 0.15 }
            );
          },
          blade('天下隱形眼鏡', '#1f6e6a', '#ffffff', -0.3, 3.4, 9.6, { wd: 0.8, out: 0.3 })
        ),
      },
    ],
    // 大家刻印鎖匙社、泰福軒：同一棟五樓白磁磚鐵窗公寓
    [
      'R',
      12.8,
      16.3,
      -1,
      {
        nf: 5,
        wall: '#e6e3dc',
        noband: true,
        ground: 'shutter',
        sh: '#8e9093',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 9.2,
        extra: all(
          blade('大家刻印鎖匙社', '#2a3fb0', '#ffffff', -0.35, 3.6, 8.6, { wd: 0.75, out: 0.3 }),
          disc('大家鎖匙', '#f2c230', '#1a1a1a', -1.2, 5.6, { size: 1.0, out: 0.8 }),
          blade('刻印橡皮', '#2a3fb0', '#ffffff', 0.35, 0.4, 2.6, { wd: 0.4, out: 0.05 })
        ),
      },
    ],
    [
      'R',
      16.3,
      22.3,
      -1,
      {
        nf: 5,
        wall: '#e6e3dc',
        noband: true,
        ground: 'shutter',
        sh: '#2c58a8',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          board('泰福軒  泰國佛牌', '#1c1a18', '#e8c060', 1.9, -0.05, 2.45, 3.3, { z: -0.28 }),
          board('四面佛', '#f2d230', '#1a1a1a', 0.05, 1.9, 2.45, 3.3, {
            z: -0.28,
            sub: '參拜／還願',
          })
        ),
      },
    ],
    // 美衣潔自助洗衣：白招牌、紅布條，五樓米色
    [
      'R',
      22.3,
      25.6,
      -1,
      {
        nf: 5,
        wall: '#e3d9c4',
        sign: ['洗衣', '#f6f6f4', '#2a2a2a', '美衣潔智能自助洗衣'],
        banner: ['', '#d8342c', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          blade('洗衣', '#ffffff', '#2a2a2a', 0.3, 3.7, 5.5, { wd: 0.7, out: 0.3 }),
          blade('', '#1c1c1c', '#ffffff', -0.4, 4.4, 6.6, { wd: 0.6, out: 0.3 })
        ),
      },
    ],
    // 明日理髮廳：兩層灰色水泥樓、三樓鐵皮加蓋，咖啡色木招牌
    [
      'R',
      25.6,
      30,
      -1,
      {
        nf: 2,
        wall: '#9c9a94',
        sign: ['明日理髮廳', '#6b4a32', '#e9c46a'],
        ground: 'shutter',
        sh: '#7e8c84',
        bal: 'rail',
        roof: 'shack',
        door: 0,
        d: 12,
        extra: disc('明日理髮廳', '#ffffff', '#c0281f', -0.3, 6.6, { size: 1.1, out: 0.9 }),
      },
    ],
    // 三家專業烤肉：兩樓米色磁磚、三樓鐵皮，門口一台不鏽鋼攤車
    [
      'R',
      30,
      35.2,
      -1,
      {
        nf: 3,
        wall: '#e0d8c8',
        sign: ['專業烤肉', '#f6f3ee', '#c8281f', '鹹酥雞‧魷魚絲'],
        ground: 'open',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          (k, c) => {
            const y = c.gf + c.fh;
            k.box(-0.02, c.w + 0.02, y, c.top + 0.1, -0.12, 0, c.MR.roof, { col: false });
            k.plane(c.YHT.win(), c.w - 1.2, 1.2, c.w / 2, y + 1.5, -0.14, c.FRONT);
          },
          cart(1.2, {
            w: 1.8,
            body: '#d8d8d4',
            tarp: '#d8342c',
            sign: ['三家專業烤肉', '#f6f3ee', '#c8281f'],
          }),
          blade('烤肉', '#f4f2ee', '#c8281f', -0.3, 3.6, 4.6, { flat: true, wd: 1.3, out: 0.3 })
        ),
      },
    ],
    // 上宇林、博揚牙醫：同一棟六樓白磁磚
    [
      'R',
      35.2,
      40.5,
      -1,
      {
        nf: 6,
        wall: '#e6e1d6',
        sign: ['上宇林', '#4a3426', '#ffffff', '頂級茶飲 厚鮮奶茶專門店'],
        ground: 'shutter',
        sh: '#3c4650',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: blade('上宇林', '#f2f0ea', '#3a2a22', -0.3, 6.6, 10.6, { wd: 0.9, out: 0.3 }),
      },
    ],
    [
      'R',
      40.5,
      45,
      -1,
      {
        nf: 6,
        wall: '#e6e1d6',
        sign: ['博揚牙醫', '#d8eaf6', '#2a4a9a'],
        ground: 'shutter',
        sh: '#566a7a',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: blade('博揚牙醫診所', '#cfe2f2', '#2a3f8a', 0.4, 5.0, 12.0, { wd: 0.9, out: 0.3 }),
      },
    ],
    // 協同二街口前退縮的兩層白色矮樓，牆上一排冷氣室外機，門前幾棵小樹
    [
      'R',
      45,
      50,
      -1,
      {
        nf: 2,
        wall: '#efeee9',
        noband: true,
        ground: 'shutter',
        sh: '#8a8d90',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 8,
        set: 6.6,
        extra: (k, c) => {
          for (let i = 0; i < 4; i++) c.ac(k, 0.3 + i * 1.05, 2.2 + (i % 2) * 0.55, -0.5);
          for (const x of [0.9, 2.5, 4.1]) {
            k.box(x - 0.3, x + 0.3, 0, 0.4, -2.2, -1.6, '#b9b6ae', { col: false });
            k.cyl(x, -1.9, 0.06, 0.4, 1.7, '#6a4a30', { seg: 5 });
            const g = new c.THREE.SphereGeometry(0.55, 7, 5);
            g.translate(x, 2.0, -1.9);
            k._part(c.VC, c.paintGeo(g, '#4b8a3e'));
          }
        },
      },
    ],
    // 協同二街到協同街：大埔鐵板燒一整棟兩層鐵皮屋頂，前面退縮的紅白地磚
    [
      'R',
      57.4,
      75,
      -1,
      {
        nf: 2,
        wall: '#f2f0ea',
        noband: true,
        ground: 'shop',
        awn: '#8a5a44',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 8,
        set: 6.8,
        apron: 1.9,
        bikes: 3,
        extra: dapu,
      },
    ],

    // ---- 右側（+1，東南側）：小林眼鏡轉角那棟七樓大樓 → 協同街 ----
    [
      'R',
      10,
      12.6,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        noband: true,
        ground: 'shop',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 12,
        apron: 0.6,
        extra: all(
          sideFace(KS(2.5, 3.0), -1, 3.0, 12, {
            slope: KSL,
            shutter: '#cfcfcb',
            sign: ['', '#f2f2ee', '#2a4f9e'],
          }),
          kobayashi(2.5)
        ),
      },
    ],
    [
      'R',
      12.6,
      15.6,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        noband: true,
        ground: 'shutter',
        sh: '#eeeeea',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 14,
        extra: all(
          (k, c) => k.box(0, 1.2, c.gf, c.gf + 3.0, -0.35, 0, '#f2f2ee', { col: false }),
          board('現代', '#eeeeea', '#1f4fa0', 0.6, -0.6, 1.3, 1.9, { z: -0.04, sub: '營業所' }),
          (k, c) =>
            k.box(-0.01, c.w + 0.01, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false })
        ),
      },
    ],
    [
      'R',
      15.6,
      19.3,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        noband: true,
        ground: 'shutter',
        sh: '#2c3550',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 14,
        extra: all(
          board('台灣彩券', '#2f8a5b', '#ffffff', 0.05, 1.7, 2.5, 3.35, { z: -0.3 }),
          board('公益彩券', '#f6efd8', '#c0281f', 1.7, -0.05, 2.5, 3.35, { z: -0.3 }),
          disc('台灣彩券', '#f2b632', '#c0281f', -0.2, 4.2, { size: 0.9, out: 0.7 }),
          disc('台灣彩券', '#f2b632', '#c0281f', -0.2, 5.4, { size: 0.9, out: 0.7 }),
          (k, c) =>
            k.box(-0.01, c.w + 0.01, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false })
        ),
      },
    ],
    // 大樓車道與巨贊機械（二樓斜格子鐵窗、米色橫招）
    [
      'R',
      19.3,
      25.8,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        noband: true,
        sign2: ['巨贊機械股份有限公司', '#e9e2cf', '#8a6a2a'],
        ground: 'shutter',
        sh: '#3a5fa0',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 14,
        extra: all(
          lattice(0.4, 6.1),
          (k, c) => {
            k.box(0.15, 3.2, 0, c.gf - 0.4, -0.05, -0.03, '#26272a', { col: false });
            for (let x = 0.3; x < 3.2; x += 0.6)
              k.box(x, x + 0.12, 0.01, 0.03, -2.0, 0, '#e8962a', { col: false });
          },
          board('大樓車道\n禁止停車', '#f2d230', '#c0281f', 0.4, 3.0, 2.35, 3.25, { z: -0.1 }),
          board('套房', '#c0281f', '#ffffff', 3.5, 6.2, 2.4, 3.2, { z: -0.1 }),
          (k, c) =>
            k.box(-0.01, c.w + 0.01, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false })
        ),
      },
    ],
    [
      'R',
      25.8,
      29.6,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        sign: ['鄉堤 早午餐', '#2f9a52', '#ffffff', 'CHANTE BRUNCH'],
        banner: ['豬腳飯／豬皮飯', '#c8372f', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 14,
        extra: all(xiangdi, (k, c) =>
          k.box(-0.01, c.w + 0.01, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false })
        ),
      },
    ],
    [
      'R',
      29.6,
      33.2,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        noband: true,
        ground: 'shop',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 14,
        extra: all(fifty, (k, c) =>
          k.box(-0.01, c.w + 0.01, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false })
        ),
      },
    ],
    [
      'R',
      33.2,
      36.8,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        sign: ['草地人牛排', '#f0b23a', '#b8261c'],
        ground: 'shutter',
        sh: '#3f7f8a',
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 14,
        extra: all(
          blade('草地人牛排', '#f29a1f', '#1a1a1a', 0.3, 3.5, 7.4, { wd: 0.95, out: 0.3 }),
          (k, c) =>
            k.box(-0.01, c.w + 0.01, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false })
        ),
      },
    ],
    // Stella 時尚美睫／時尚美甲（紫、粉紅兩塊招牌、鐵皮雨遮），二樓是喵宅 Meow House
    [
      'R',
      36.8,
      42.6,
      1,
      {
        nf: 7,
        gf: 3.4,
        wall: TILE,
        noband: true,
        ground: 'shutter',
        sh: '#3f8f99',
        tin: true,
        bal: 'grille',
        roof: 'flat',
        door: 0,
        d: 14,
        extra: all(
          board('Stella 時尚美睫', '#6a5ac8', '#ffffff', 2.9, -0.05, 3.5, 4.4, {
            z: -0.2,
            sub: '美睫教學',
          }),
          board('時尚美甲', '#e0708a', '#ffffff', 0.05, 2.9, 3.5, 4.4, { z: -0.2 }),
          board('Meow House\n2F', '#ffffff', '#3a3a3a', -1.3, -0.2, 4.6, 5.9, { z: -0.12 }),
          (k, c) => {
            k.box(0.6, 2.6, 0, 0.95, -1.0, -0.4, '#f2f2ee', { col: false });
            for (const x of [0.4, 3.4, 4.6]) {
              k.box(x, x + 0.4, 0, 0.35, -1.2, -0.8, '#a0522d', { col: false });
              const g = new c.THREE.SphereGeometry(0.35, 6, 4);
              g.translate(x + 0.2, 0.6, -1.0);
              k._part(c.VC, c.paintGeo(g, '#4c7d3a'));
            }
          },
          (k, c) =>
            k.box(-0.01, c.w + 0.01, c.top - 0.5, c.top - 0.2, -0.45, 0, '#4f8a6a', { col: false })
        ),
      },
    ],
    // 廣源快餐：灰色舊樓
    [
      'R',
      42.6,
      47.6,
      1,
      {
        nf: 5,
        wall: '#8f8d86',
        noband: true,
        ground: 'shutter',
        sh: '#5a5d60',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        extra: all(
          blade('廣源快餐', '#f2b22e', '#c0281f', 0.4, 2.4, 5.6, { wd: 0.9, out: 0.3 }),
          (k, c) => k.box(2.4, 3.6, 0, 0.9, -1.2, -0.5, '#e0602a', { col: false })
        ),
      },
    ],
    // 廣源快餐那棟灰色七樓靠活動中心的那一截（鐵窗、每層一排冷氣，一樓拉下鐵捲門）
    [
      'R',
      47.6,
      54,
      1,
      {
        nf: 7,
        wall: '#8f8d86',
        noband: true,
        ground: 'shutter',
        sh: '#6a6d70',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 12,
        set: 5.0, // 路在 s 49.4 轉彎，照預設退縮 s 47.6 那端會吃進路面
        apron: 0.8,
      },
    ],
    // s 54～66 是普仁市民活動中心（src/world/buildings/PurenCenter.js），再過去是全家那棟鐵皮兩層樓
    [
      'R',
      66,
      78.3,
      1,
      {
        nf: 2,
        gf: 3.6,
        wall: '#c8cbcd',
        noband: true,
        ground: 'shop',
        bal: 'plain',
        roof: 'flat',
        door: 0,
        d: 16,
        bikes: 3,
        extra: all(
          tinWall(0, 12.3, 3.6, 6.6),
          famSign(12.1, 6.15, -0.06, Math.PI),
          (k, c) => {
            k.box(-0.05, c.w + 0.25, c.gf - 1.05, c.gf + 0.15, -0.05, 0, '#ffffff', { col: false });
            k.box(c.w, c.w + 0.25, c.gf - 1.05, c.gf + 0.15, 0, 5.0, '#ffffff', { col: false });
            famSign(5.0, c.w + 0.27, 2.5, HP)(k, c);
          },
          (k, c) => {
            k.plane(c.YHT.win(), 3.6, 2.2, c.w + 0.03, 1.4, 2.5, HP);
            k.cyl(c.w - 0.3, -2.6, 0.08, 0, 5.4, '#8d9196', { seg: 6 });
            k.box(c.w - 0.55, c.w - 0.05, 3.6, 5.2, -2.75, -2.45, '#2fa84a', { col: false });
            k.plane(
              c.paint('FamilyMart', '#ffffff', '#1f5fb0', null, 1.4, 0.5, 96),
              1.4,
              0.5,
              c.w - 0.3,
              4.4,
              -2.76,
              c.FRONT,
              { emissive: 0.35 }
            );
          }
        ),
      },
    ],
  ],
};
