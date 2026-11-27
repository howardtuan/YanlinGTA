// 幸福街 s 409～583（到地圖南緣）東側（參考線 'F'，s 往南走，-1＝東側＝照片 _L；+1 西側整條是老街溪與莒光公園綠帶，不蓋東西）。
// 照 Google 街景 2024-08（車拍）與 2025-04（使用者相片球：s400、s484、s544），國土測繪 2024 正射量寬度與深度。
// 北端接縫：s 372～408 的七層白磁磚大樓（OSM w1388641486，跨在 s 400 上）整棟歸 SegF2.js，這裡從它南牆 s 409 接起。
// 南端：s≈542 莒光路從東邊接進來（遊戲裡的參考線在路口斜一段），路口以南 s 549.5～583 已經在地圖南緣 30 m 內，只求外觀合理。
//   東側（-1）由北往南：125、127 號四樓紅褐磁磚透天（一樓鐵捲門，127 那片噴紅字「車庫」）→
//     至德堂（紅磚祠堂：一樓紅柱門廊、黑底金字匾、屋頂白色寶瓶欄杆與橘紅瓦頂，前院白欄杆、紅磚金爐、龍柏）→
//     147～153 號新建五樓灰白磁磚透天四戶（一樓退縮、前院鋪面，深褐色直條格柵、玻璃陽台）→
//     155～165 號舊透天（前院拱形車棚：咖啡色、灰色鋼桁架、綠色透明板，矮牆與鐵門）→ 167 號（二樓兩個圓窗、米黃色弧形雨遮、白色鐵花門）→
//     169～173 號舊透天（鐵捲門）→ 175 號台灣房屋轉角樓（米白條紋外牆、一樓大廣告「台灣房屋 梁寶玉」、轉角灰磁磚圓弧玻璃凸窗，
//     莒光路那面也是鐵捲門店面）→【莒光路口】→ SYM 三陽機車（五樓米白老公寓圓角，招牌在莒光路那面，綠色雨遮）→
//     PGO 摩特動力 欣近介（一樓黑色大招牌）→ 兩棟公寓間的通道（停車）→ 179～183 號五樓灰白小磁磚老公寓（紅鐵門、粉紅雨遮）
// 原本的填充樓 f1426～f1445：有店面牆的放 hide（資料留著、不畫、碰撞收成一點，全圖亂數不變），原本 noShop 的放 drop。
// 看不清的招牌不放字（SYM 旁邊的換電站招牌只看到一半，不寫字）。
const R = 'F';
const NC = { col: false };
// 地面鋪面：這一塊地面高低差超過 8 cm 就用 C.drape 鋪成貼地形的斜面（不會一格一階、低的那頭浮起來），平地照舊用平板
const pave = (C, k, x0, x1, y0, y1, z0, z1, mat) =>
  C.slopeOf(k, x0, x1, z0, z1) > 0.08
    ? C.drape(k, x0, x1, z0, z1, mat, y1)
    : k.box(x0, x1, y0, y1, z0, z1, mat, { col: false, surface: true });
// 貼地的元件往下多做 d 公尺：一個 Kit 只照原點的地面高度畫，地面有坡時低的那頭才不會露出縫（高的那頭只是多埋進土裡）
const sink = (k, d = 0.6) => {
  const b = k.box.bind(k);
  k.box = (x0, x1, y0, ...r) => b(x0, x1, y0 <= 0.01 ? y0 - d : y0, ...r);
  return k;
};
// 開一個對著街的 Kit：x=0 在 s1 那端（-1 側 +x 朝 s 變小），k.W 是寬度，k.X(s) 把里程換成區域 x
const seg = (C, s0, s1, set = 3.8) => {
  const k = C.kit(R, s0, s1, -1, set);
  k.W = s1 - s0;
  delete k.w;
  k.X = (s) => s1 - s;
  return k;
};
// 任意方向的方塊（先繞 z 軸轉 rz、再繞 x 軸轉 rx），用頂點色畫
const rbox = (C, k, cx, cy, cz, sx, sy, sz, hex, rz = 0, rx = 0) => {
  const g = new C.THREE.BoxGeometry(sx, sy, sz);
  if (rz) g.rotateZ(rz);
  if (rx) g.rotateX(rx);
  g.translate(cx, cy, cz);
  k._part(C.VC, C.paintGeo(g, hex));
};
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 10, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
const cone = (C, k, x, y, z, r, h, hex) => {
  const g = new C.THREE.ConeGeometry(r, h, 10);
  g.translate(x, y + h / 2, z);
  k._part(C.VC, C.paintGeo(g, hex));
  // 龍柏貼地長，下半身那一圈擋人（不然人會整個走進樹裡）
  const c = r * 0.7;
  k.wallRect(x - c, x + c, z - c, z + c, y, y + h * 0.5);
};
// 三角稜柱（瓦頂）：底在 y0、寬 x0～x1、高 rise，從 z0 延伸到 z1
const prism = (C, k, x0, x1, y0, rise, z0, z1, hex) => {
  const g = new C.THREE.CylinderGeometry(1, 1, z1 - z0, 3);
  g.rotateX(-Math.PI / 2);
  g.scale((x1 - x0) / 2 / 0.866, rise / 1.5, 1);
  g.translate((x0 + x1) / 2, y0 + rise / 3, (z0 + z1) / 2);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 對著街的圓窗（圓柱轉成面向街道）
const disc = (C, k, x, y, z, r, hex) => {
  const g = new C.THREE.CylinderGeometry(r, r, 0.12, 14);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 前院拱形車棚：弧線橫跨 x0～x1（從街上看是一道拱），從 z0（街道那端）延伸到 z1，拱腳高 yb、拱高 rise
const archShed = (C, k, x0, x1, z0, z1, yb, rise, hex, post = '#8a8c8c', truss) => {
  const n = 7,
    half = (x1 - x0) / 2,
    cx = (x0 + x1) / 2,
    R2 = (half * half + rise * rise) / (2 * rise), // 圓弧半徑
    a = Math.asin(half / R2),
    cy = yb + rise - R2;
  for (let i = 0; i < n; i++) {
    const t0 = -a + (2 * a * i) / n,
      t1 = -a + (2 * a * (i + 1)) / n,
      xa = cx + R2 * Math.sin(t0),
      ya = cy + R2 * Math.cos(t0),
      xb = cx + R2 * Math.sin(t1),
      yb2 = cy + R2 * Math.cos(t1);
    rbox(
      C,
      k,
      (xa + xb) / 2,
      (ya + yb2) / 2,
      (z0 + z1) / 2,
      Math.hypot(xb - xa, yb2 - ya) + 0.04,
      0.05,
      z1 - z0,
      hex,
      Math.atan2(yb2 - ya, xb - xa)
    );
    if (truss)
      rbox(
        C,
        k,
        (xa + xb) / 2,
        (ya + yb2) / 2 - 0.12,
        z0 + 0.1,
        Math.hypot(xb - xa, yb2 - ya),
        0.06,
        0.06,
        truss,
        Math.atan2(yb2 - ya, xb - xa)
      );
  }
  for (const x of [x0 + 0.1, x1 - 0.1]) {
    k.box(x - 0.06, x + 0.06, 0, yb, z0 + 0.05, z0 + 0.17, post, NC);
    k.box(x - 0.06, x + 0.06, yb - 0.1, yb, z0 + 0.05, z1, post, NC);
  }
};
// 前院矮牆＋鐵門：x0～x1 一道矮牆（在 z），中間 g0～g1 是鐵門
const yardWall = (C, k, x0, x1, g0, g1, z, wallHex, gateHex, h = 1.1) => {
  if (g0 > x0 + 0.05) k.box(x0, g0, 0, h, z, z + 0.2, wallHex);
  if (x1 > g1 + 0.05) k.box(g1, x1, 0, h, z, z + 0.2, wallHex);
  k.box(g0, g1, 0, 1.6, z + 0.05, z + 0.12, gateHex); // 關著的鐵門也擋人
  for (let x = g0 + 0.12; x < g1 - 0.05; x += 0.16)
    k.box(x, x + 0.03, 0.1, 1.6, z + 0.03, z + 0.05, '#3a3c3e', NC);
};
// 白色寶瓶欄杆（x0～x1，在 z，底在 y）
const balusters = (C, k, x0, x1, y, z, h = 0.9) => {
  k.box(x0, x1, y, y + 0.12, z - 0.12, z + 0.12, '#f1efe9', NC);
  k.box(x0, x1, y + h, y + h + 0.1, z - 0.14, z + 0.14, '#f1efe9', NC);
  for (let x = x0 + 0.15; x < x1 - 0.1; x += 0.3)
    k.cyl(x, z, 0.07, y + 0.12, y + h, '#f4f2ec', { seg: 6 });
};
// 樹：樹幹＋兩團樹冠
const tree = (C, k, x, z, h = 3.2, r = 1.3) => {
  k.cyl(x, z, 0.12, 0, h * 0.55, '#6a5238', { seg: 6 });
  ball(C, k, x, h * 0.65, z, r, '#4f7f3a', 0.8);
  ball(C, k, x + r * 0.4, h * 0.85, z - r * 0.2, r * 0.7, '#5a8c42', 0.8);
};

const RTILE = '#a8614c', // 紅褐磁磚
  RB = '#a4513c', // 紅磚
  WT = '#e9e8e3', // 白磁磚
  NEWG = '#7b7e82', // 新建透天的深灰條紋磚
  CREAM = '#e3ddcd', // 米白
  GREEN = '#3f8a5a'; // 綠色雨遮

// 一格街屋（東側）
const E = (s0, s1, sp) => [R, s0, s1, -1, { d: 12, ...sp }];
// 新建透天：一樓退縮 1.4 m（custom 自己蓋），樓上立面離中心線 4.4 m
const NEW = (s0, s1) =>
  E(s0, s1, {
    set: 4.4,
    d: 13,
    nf: 5,
    fh: 3.1,
    wall: NEWG,
    bal: 'plain',
    inside: true,
    noband: 1,
    door: 0,
    roof: 'tank',
  });
// 有前院車棚的舊透天：房子立面離中心線 8 m，前院（3.9～8 m）在 custom
const YARD = 8;
const OLDH = (s0, s1, sp) =>
  E(s0, s1, { set: YARD, d: 10, ground: 'gate', noband: 1, door: 0, ...sp });

export default {
  // 有店面牆的填充樓：hide
  hide: [
    'f1445',
    'f1444',
    'f1442',
    'f1441',
    'f1440',
    'f1439',
    'f1438',
    'f1437',
    'f1435',
    'f1433',
    'f1432',
    'f1428',
    'f1427',
    'f1426',
  ],
  // 原本就 noShop 的填充樓：drop
  drop: ['f1443', 'f1436', 'f1434', 'f1431', 'f1430', 'f1429'],
  ownSign: ['SYM 三陽機車'],
  lots: [
    // ---- 125、127 號：四樓紅褐磁磚，一樓上方深灰色橫帶 ----
    E(409, 413.5, {
      nf: 4,
      fh: 3.1,
      d: 14,
      wall: RTILE,
      ground: 'shutter',
      sh: '#b2b1ab',
      door: 1,
      noband: 1,
      bal: 'plain',
      roof: 'shack',
    }),
    E(413.5, 419, {
      nf: 4,
      fh: 3.1,
      d: 14,
      wall: RTILE,
      ground: 'shutter',
      sh: '#a9a9a3',
      door: 1,
      noband: 1,
      bal: 'plain',
    }),
    // ---- 147～153 號新建透天（一樓與格柵在 custom）----
    NEW(435.3, 441),
    NEW(441, 446.7),
    NEW(446.7, 452.4),
    NEW(452.4, 458),
    // ---- 舊透天（前院車棚）----
    OLDH(458, 463, { nf: 4, wall: '#c9d0d8', bal: 'cage', sh: '#8a8c8e' }), // 白藍小磁磚、凸窗
    OLDH(463, 469, { nf: 4, wall: '#d3d5d6', bal: 'cage', sh: '#9a9c9c', roof: 'shack' }), // 155、157
    OLDH(469, 474, { nf: 4, wall: '#d8c4b2', bal: 'plain', sh: '#7e8082', hood: GREEN }),
    OLDH(474, 479, { nf: 3, wall: '#e2e0da', bal: 'cage', sh: '#8a8c8e' }),
    OLDH(479, 484, { nf: 4, wall: '#cfd3d6', bal: 'plain', sh: '#7a7c7e', hood: GREEN }),
    // 167 號：灰色小磁磚，二樓兩個圓窗（custom），前院淺
    E(484, 489, {
      set: 6,
      d: 11,
      nf: 4,
      wall: '#a9adb0',
      ground: 'gate',
      sh: '#8a8c8e',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 169～173 號：鐵捲門
    E(489, 494, {
      set: 4.6,
      nf: 4,
      wall: '#b9c4cf',
      ground: 'shutter',
      sh: '#a8aaa8',
      noband: 1,
      door: 1,
      bal: 'cage',
      tin: 1,
    }),
    E(494, 499.5, {
      set: 4.3,
      nf: 5,
      fh: 2.9,
      wall: '#e4e4e0',
      ground: 'shutter',
      sh: '#a4a6a4',
      noband: 1,
      door: 0,
      bal: 'cage',
    }), // 169
    E(499.5, 504, {
      set: 4.3,
      nf: 4,
      wall: '#dcdcd6',
      ground: 'shutter',
      sh: '#9c9e9c',
      noband: 1,
      door: 1,
      bal: 'plain',
      hood: GREEN,
    }), // 171
    E(504, 508.5, {
      set: 4.3,
      nf: 3,
      wall: '#d9cdb5',
      ground: 'shutter',
      sh: '#a0a09a',
      noband: 1,
      door: 1,
      bal: 'plain',
    }),
    E(508.5, 513.5, {
      nf: 4,
      wall: '#d3d4d0',
      ground: 'shutter',
      sh: '#a6a8a6',
      noband: 1,
      door: 1,
      bal: 'cage',
      roof: 'tank',
    }), // 173
    // ---- 175 號台灣房屋轉角樓：米白條紋外牆（窗上綠色小雨遮），廣告與轉角圓弧凸窗在 custom ----
    E(513.5, 529, {
      d: 8,
      nf: 4,
      wall: CREAM,
      ground: 'shutter',
      sh: '#b4b4ae',
      noband: 1,
      door: 0,
      bal: 'plain',
      hood: GREEN,
      roof: 'tank',
    }),
    E(529, 536.5, {
      d: 8,
      nf: 4,
      wall: CREAM,
      ground: 'shutter',
      sh: '#a6a8a6',
      noband: 1,
      door: 0,
      bal: 'plain',
      side: { at: 1, ground: 'shutter', sh: '#a6a8a6', to: 6.5 },
    }),
    // ---- 莒光路口以南（地圖南緣）----
    // SYM 三陽機車：五樓米白老公寓，招牌在莒光路那面，騎樓停滿機車；幸福街這面也是開放的店面
    // （北端 s 549.5～551.5 的圓角與莒光路那面在 custom）
    E(551.5, 556, {
      d: 13,
      nf: 5,
      wall: CREAM,
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      awn: GREEN,
      bikes: 2,
    }),
    // PGO 摩特動力 欣近介：一樓整面黑色大招牌（在 custom）
    E(556, 562, {
      d: 12,
      nf: 5,
      wall: '#e2e2de',
      ground: 'shutter',
      sh: '#3a3a3a',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 179～183 號：五樓灰白／淺藍小磁磚老公寓，鐵窗
    E(565, 571, {
      d: 12,
      nf: 5,
      fh: 2.9,
      wall: '#cfd4d8',
      ground: 'gate',
      sh: '#8a8c8e',
      noband: 1,
      door: 1,
      bal: 'cage',
    }),
    E(571, 577, {
      d: 12,
      nf: 5,
      fh: 2.9,
      wall: '#d8d8d4',
      ground: 'gate',
      sh: '#b03a32',
      noband: 1,
      door: 1,
      bal: 'cage',
      awn: '#d88a8a',
    }),
    E(577, 583, {
      d: 12,
      nf: 5,
      fh: 2.9,
      wall: '#cdd2d6',
      ground: 'gate',
      sh: '#8a8c8e',
      noband: 1,
      door: 1,
      bal: 'cage',
    }),
  ],

  custom(C) {
    const { FRONT, paint, YHT } = C;
    // ---- 125、127：一樓上方深灰色橫帶、127 鐵捲門上的紅字「車庫」、窄門上的黑色直書字看不清不寫 ----
    {
      const k = seg(C, 409, 419);
      k.box(0, k.W, 3.0, 3.35, -0.35, 0, '#5a5c5e', NC);
      k.plane(
        paint('車　　庫', '#a9a9a3', '#c0503a', null, 3.6, 0.9, 64),
        3.6,
        0.9,
        2.5,
        1.2,
        -0.04,
        FRONT
      );
      // 一樓上方的灰色雨遮（只做到 127 那半）
      k.box(0, 5.5, 3.35, 3.45, -0.9, 0, '#7a7c7e', NC);
    }
    // ---- 至德堂（s 419～435.3）：前院白欄杆（中間台階）、紅磚金爐、紅柱門廊、黑底金字匾、屋頂白欄杆與橘紅瓦頂 ----
    {
      const k = sink(seg(C, 419, 435.3)),
        W = k.W,
        F0 = 4.0, // 門廊前緣（離立面線）
        F1 = 5.6; // 祠堂正面牆
      k.box(0.2, W - 0.2, 0, 0.45, 0.2, 15, '#b9aa9a', { col: false, surface: true }); // 台基
      // 前院欄杆：中間台階留空（x 6.5～8.6）
      balusters(C, k, 0.2, 6.5, 0.45, 0.35);
      balusters(C, k, 8.6, W - 0.2, 0.45, 0.35);
      k.box(0.2, 6.5, 0, 1.4, 0.25, 0.45, '#f1efe9', { col: true }); // 碰撞用（欄杆本身不擋）
      k.box(8.6, W - 0.2, 0, 1.4, 0.25, 0.45, '#f1efe9', { col: true });
      for (let i = 0; i < 3; i++)
        k.box(6.5, 8.6, 0, 0.15 * (i + 1), 0.2 + i * 0.3, 1.2, '#a89a8a', NC); // 台階
      // 祠堂本體：紅磚，門廊下方正面牆、木門、鐵窗
      k.box(0.6, W - 0.6, 0.45, 6.0, F1, 14.6, RB);
      k.plane(C.shutterTex('#6e5a48'), 1.6, 2.4, 7.6, 1.65, F1 - 0.03, FRONT); // 木門
      for (const x of [4.2, 11.0]) {
        k.plane(YHT.win(), 1.5, 1.2, x, 1.9, F1 - 0.03, FRONT);
        k.plane(YHT.win(), 1.5, 1.0, x, 4.3, F1 - 0.03, FRONT);
      }
      // 匾：黑底金字「至德堂」
      k.box(9.0, 12.6, 4.55, 5.35, F1 - 0.1, F1, '#1e1a16', NC);
      k.plane(
        paint('至德堂', '#1e1a16', '#d8b24a', null, 3.4, 0.7, 96),
        3.4,
        0.7,
        10.8,
        4.95,
        F1 - 0.12,
        FRONT,
        { emissive: 0.15 }
      );
      // 紅柱（柱頭雕花）＋門廊頂的紅磚樑
      for (const x of [2.4, 6.0, 9.4, 13.4]) {
        k.cyl(x, F0 + 0.3, 0.3, 0.45, 5.4, '#c0393a', { seg: 12, col: true });
        k.box(x - 0.45, x + 0.45, 5.15, 5.45, F0 + 0.0, F0 + 0.6, '#b8342e', NC);
      }
      k.box(0.6, W - 0.6, 5.45, 6.0, F0 - 0.1, F1, RB, NC); // 樑
      k.box(0.6, W - 0.6, 5.9, 6.05, F0 - 0.15, 14.6, '#b8b2a8', NC); // 屋頂板
      // 屋頂：前緣白色寶瓶欄杆、後面橘紅瓦頂與青綠色採光罩
      balusters(C, k, 0.6, W - 0.6, 6.05, F0);
      for (const x of [0.75, W - 0.75]) balusters(C, k, F0, 14.4, 6.05, x);
      prism(C, k, 1.2, W - 1.2, 6.05, 2.0, 8.5, 14.6, '#d0603a');
      rbox(C, k, W / 2, 7.3, 6.6, W - 2.4, 0.06, 3.6, '#5a9a90', 0, -0.35); // 採光罩（往街道傾）
      for (const x of [1.4, W - 1.4]) k.box(x - 0.05, x + 0.05, 6.05, 7.7, 5.2, 5.3, '#8a8c8c', NC);
      // 金爐（南端前院）：紅磚爐身、金色浮雕、紅瓦簷、灰石香爐頂
      {
        const x = 1.6,
          z = 1.6;
        k.box(x - 0.9, x + 0.9, 0.45, 0.75, z - 0.9, z + 0.9, '#b8604a');
        k.box(x - 0.7, x + 0.7, 0.75, 2.1, z - 0.7, z + 0.7, RB);
        k.box(x - 0.3, x + 0.3, 1.1, 1.8, z - 0.72, z - 0.7, '#c9a24a', NC);
        k.box(x - 0.95, x + 0.95, 2.1, 2.25, z - 0.95, z + 0.95, '#a8402e', NC);
        prism(C, k, x - 0.85, x + 0.85, 2.25, 0.35, z - 0.85, z + 0.85, '#a8402e');
        k.cyl(x, z, 0.4, 2.45, 2.75, '#8a8c86', { seg: 10 });
        ball(C, k, x, 3.05, z, 0.42, '#8a8c86', 0.9);
        k.cyl(x, z, 0.25, 3.35, 3.7, '#7e807a', { seg: 10 });
      }
      // 前院的樹與龍柏
      tree(C, k, 10.6, 1.8, 3.4, 1.2);
      cone(C, k, 13.6, 0.45, 2.2, 1.1, 3.6, '#3e6a3a');
      cone(C, k, 4.6, 0.45, 2.0, 0.8, 2.6, '#3e6a3a');
    }
    // ---- 147～153 號新建透天：一樓退縮（木紋門＋玻璃門）、前院鋪面、深褐色直條格柵與玻璃陽台、白磁磚分戶柱 ----
    for (const [s0, s1, no] of [
      [435.3, 441, '147'],
      [441, 446.7, '149'],
      [446.7, 452.4, '151'],
      [452.4, 458, '153'],
    ]) {
      const k = sink(seg(C, s0, s1, 4.4)),
        W = k.W,
        gf = 3.3;
      k.box(0, W, 0, gf, 1.4, 13, NEWG); // 一樓（退 1.4 m）
      k.box(0, W, gf - 0.25, gf, 0, 1.4, WT, NC); // 二樓樓板（騎樓頂）
      k.box(0.6, 1.7, 0, 2.3, 1.36, 1.4, '#4a3a2e', NC); // 木紋門
      k.plane(YHT.win(), 2.0, 2.3, 3.3, 1.15, 1.37, FRONT); // 玻璃門
      k.plane(YHT.win(), 1.2, 1.6, 4.9, 1.4, 1.37, FRONT);
      k.plane(paint(no, '#e86a8a', '#ffffff', null, 0.4, 0.2, 64), 0.4, 0.2, 2.0, 2.5, 1.35, FRONT);
      k.box(-0.02, 0.35, 0, 15.6, -0.25, 13, WT); // 白磁磚分戶柱（騎樓裡也擋人）
      pave(C, k, -0.1, W + 0.1, -1.3, 0.02, -0.6, 1.4, '#c9b89a'); // 前院木紋地磚
      // 深褐色直條格柵（南半，二到五樓）與玻璃陽台（北半）
      for (let x = 0.6; x < W / 2; x += 0.32)
        k.box(x, x + 0.1, gf + 0.1, 15.6, -0.55, -0.4, '#4a3a2c', NC);
      for (let f = 0; f < 4; f++) {
        const y = gf + f * 3.1;
        k.box(W / 2, W - 0.2, y, y + 0.15, -0.9, 0, WT, NC);
        k.box(W / 2, W - 0.2, y + 0.15, y + 1.1, -0.9, -0.85, '#8fb0b4', NC);
        k.box(W / 2, W - 0.2, y + 1.05, y + 1.12, -0.92, -0.83, '#2e2e2e', NC);
      }
    }
    // ---- 舊透天前院：車棚、矮牆與鐵門 ----
    const Y0 = 3.9 - YARD; // 前院前緣（區域 z，負值＝房子前面）
    const yard = (s0, s1, shed, sp = {}) => {
      const k = seg(C, s0, s1, YARD),
        W = k.W;
      yardWall(
        C,
        k,
        0.1,
        W - 0.1,
        sp.g0 ?? 1.0,
        sp.g1 ?? W - 1.2,
        Y0,
        sp.wall || '#a89a88',
        sp.gate || '#9c9e9e'
      );
      if (shed === 'arch')
        archShed(
          C,
          k,
          0.05,
          W - 0.05,
          Y0 + 0.1,
          -0.05,
          2.6,
          sp.rise || 1.0,
          sp.roof,
          '#7a7c7c',
          sp.truss
        );
      else if (shed === 'flat') {
        k.box(-0.05, W + 0.05, 2.6, 2.7, Y0 + 0.1, 0, sp.roof, NC);
        for (const x of [0.15, W - 0.25])
          k.box(x, x + 0.1, 0, 2.6, Y0 + 0.2, Y0 + 0.3, '#7a7c7c', NC);
      }
      return k;
    };
    yard(458, 463, 'arch', { roof: '#7a6a58', rise: 0.9, gate: '#5a5c5c' });
    yard(463, 469, 'arch', {
      roof: '#9a9c9c',
      rise: 1.2,
      truss: '#6a6c6c',
      wall: '#a8987e',
      gate: '#c8c8c4',
    }); // 155、157
    yard(469, 474, 'arch', { roof: '#3f8f6a', rise: 0.9 });
    yard(474, 479, 'flat', { roof: GREEN });
    yard(479, 484, 'arch', { roof: GREEN, rise: 0.8 });
    // 167 號：二樓兩個圓窗、米黃色弧形雨遮、白色鐵花門
    {
      const k = seg(C, 484, 489, 6),
        W = k.W,
        z0 = 3.9 - 6;
      for (const x of [1.4, 2.7]) {
        disc(C, k, x, 4.8, -0.05, 0.38, '#2a2e33');
        disc(C, k, x, 4.8, -0.02, 0.46, '#d8d8d4');
      }
      archShed(C, k, 0.05, W - 0.05, z0 + 0.1, -0.05, 2.7, 0.5, '#d8c9a0', '#6a6c6c');
      yardWall(C, k, 0.1, W - 0.1, 0.9, W - 0.9, z0, '#8a7c70', '#eeeeea');
    }
    // 169 號：鐵捲門上方弧形鐵皮雨遮
    {
      const k = seg(C, 494, 499.5, 4.3);
      archShed(C, k, 0.05, k.W - 0.05, -0.4, 0, 2.9, 0.45, '#b8bcbe', '#8a8c8c');
    }
    // ---- 175 號台灣房屋：一樓大廣告（北段）、轉角灰磁磚圓弧玻璃凸窗、窗上的綠色小雨遮 ----
    {
      const k = seg(C, 513.5, 536.5),
        W = k.W; // x=0 在轉角（s 536.5）
      // 廣告貼在鐵捲門罩盒前面（罩盒外伸 0.22 m），上緣在灰色腰帶下
      k.box(1.0, 10.5, 0.55, 3.15, -0.3, -0.02, '#e9e4d8'); // 擋人：轉角這一格的 Kit 是直的，路是彎的，廣告板在 s 529 以南離立面 1 m 多
      k.plane(
        paint(
          '台灣房屋　梁寶玉\n0937-123-883',
          '#e8642a',
          '#ffffff',
          '不動產經紀人　歡迎洽詢委託',
          9.3,
          2.4,
          96
        ),
        9.3,
        2.4,
        5.75,
        1.85,
        -0.31,
        FRONT,
        { emissive: 0.2 }
      );
      // 轉角圓弧凸窗：二樓以上灰磁磚圓柱，每層一圈玻璃
      const r = 1.6,
        top = 3.3 + 3 * 3.0;
      k.cyl(r - 0.3, r - 0.3, r, 3.3, top + 0.1, '#8e9090', { seg: 16 });
      for (let f = 0; f < 3; f++) {
        const y = 3.3 + f * 3.0;
        k.cyl(r - 0.3, r - 0.3, r + 0.03, y + 0.7, y + 2.5, '#6f8c99', { seg: 16 });
      }
      k.box(0.05, W - 0.05, 3.2, 3.35, -0.5, 0, '#8e9090', NC); // 一樓上方灰色腰帶
      // 前面的盆栽
      for (let x = 12; x < W - 0.5; x += 1.6) ball(C, k, x, 0.5, -0.6, 0.45, '#4f7f3a', 0.9);
    }
    // ---- SYM 轉角：圓角、轉角前的機車；PGO 欣近介黑色大招牌 ----
    {
      // 區域座標：x=0 在 s 551.5（接主體那格）、x=2 在北端 s 549.5；莒光路那面朝 +x
      const k = seg(C, 549.5, 551.5, 3.8),
        W = k.W,
        r = 2.0,
        d = 13,
        top = 3.3 + 4 * 3.0,
        E90 = Math.PI / 2; // 朝 +x 的面
      k.cyl(W - r, r, r, 0, top, `wall${CREAM}`, { seg: 20, col: true });
      k.box(0, W, r, top, r, d, `wall${CREAM}`);
      k.box(-0.05, W + 0.05, top, top + 0.15, r, d, '#cfcdc6', NC);
      k.cyl(W - r, r, r + 0.1, top, top + 0.15, '#cfcdc6', { seg: 20 });
      // 二樓以上每層一圈深色窗帶（圓角）與北面的窗
      for (let f = 0; f < 4; f++) {
        const y = 3.3 + f * 3.0;
        k.cyl(W - r, r, r + 0.03, y + 0.8, y + 2.2, '#56636b', { seg: 20 });
        for (const z of [4.2, 7.0, 9.8]) k.plane(YHT.win(), 2.2, 1.3, W + 0.03, y + 1.5, z, E90);
      }
      // 一樓：圓角與北面都是開放的店面（騎樓停滿機車），綠色雨遮繞過轉角
      k.plane(C.openTex, 10.4, 2.3, W + 0.03, 1.15, r + 5.4, E90, { emissive: 0.3 });
      k.wallLine(W, r, W, d, 0, 2.3); // 店面那張圖本身擋人（主體從 2 m 高起，一樓是空的）
      k.box(W, W + 1.2, 2.3, 2.4, r, d - 0.3, GREEN, NC);
      k.cyl(W - r, r, r + 1.2, 2.3, 2.4, GREEN, { seg: 20 });
      // 北面招牌：紅底白字 SYM，上方白底「機車排氣檢驗站」
      k.box(W, W + 0.25, 2.45, 3.25, r + 0.4, r + 7.4, '#c8102e', NC);
      k.plane(
        paint('SYM 三陽機車', '#c8102e', '#ffffff', null, 7.0, 0.8, 96),
        7.0,
        0.8,
        W + 0.27,
        2.85,
        r + 3.9,
        E90,
        { emissive: 0.35 }
      );
      k.box(W, W + 0.2, 3.3, 3.95, r + 6.0, d - 0.6, '#f4f2ee', NC);
      k.plane(
        paint('機車排氣檢驗站', '#f4f2ee', '#2a4aa0', null, d - r - 6.6, 0.65, 96),
        d - r - 6.6,
        0.65,
        W + 0.22,
        3.62,
        (r + 6.0 + d - 0.6) / 2,
        E90,
        { emissive: 0.3 }
      );
      for (let i = 0; i < 5; i++)
        k.scooter(
          W + 0.9 + (i % 2) * 0.6,
          r + 0.5 + i * 2.0,
          1,
          ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#e8e8e4'][i]
        );
    }
    {
      const k = seg(C, 556, 562, 3.8),
        W = k.W;
      k.box(0.3, W - 0.3, 0.3, 3.4, -0.3, -0.02, '#161616', NC);
      k.plane(
        paint(
          'PGO 摩特動力\n欣近介',
          '#161616',
          '#ffffff',
          '合理的價格　貼心的服務　(03)465-0489',
          W - 0.8,
          2.9,
          96
        ),
        W - 0.8,
        2.9,
        W / 2,
        1.85,
        -0.31,
        FRONT,
        { emissive: 0.2 }
      );
    }
    // 兩棟公寓之間的通道：紅白格子地磚、底端紅色鐵門
    {
      const k = seg(C, 562, 565, 3.8),
        W = k.W;
      for (let i = 0; i < 6; i++)
        k.box(0, W, 0, 0.04, i * 2, i * 2 + 1, i % 2 ? '#c8c4bc' : '#a8463a', {
          col: false,
          surface: true,
        });
      k.box(0, W, 0, 2.4, 11.5, 11.7, '#a8342a');
      k.box(-0.05, 0.1, 0, 2.0, 0, 11.5, '#d8d8d4');
      k.box(W - 0.1, W + 0.05, 0, 2.0, 0, 11.5, '#d8d8d4');
    }
  },

  footprints(F) {
    return [
      F(R, 419, 435.3, -1, 3.8, 15, 0.2), // 至德堂與前院
      F(R, 458, 484, -1, 3.8, 5, 0.2), // 舊透天前院
      F(R, 484, 489, -1, 3.8, 3, 0.2),
      F(R, 549.5, 556, -1, 3.8, 3, 1.5), // SYM 轉角前
      F(R, 549.5, 551.5, -1, 3.8, 13, 0), // SYM 圓角那格
      F(R, 562, 565, -1, 3.8, 12, 0.2), // 通道
    ];
  },
};
