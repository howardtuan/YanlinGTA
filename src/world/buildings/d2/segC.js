// 大仁二街 C 段：東南側 s 78～126.4（街景 2024-08；正射 2024）
// 實景不是連續的透天店面，而是「社區中庭廣場」＋右邊三棟：
//   s 80.2～82 戶外樓梯 → s 82～101.3 開放廣場（三個黑石花台、八角花台與景石）→ 廣場最裡面是 8 樓米褐色集合住宅（一樓一排小店）
//   → s 101.3～106.2 食厭世 2 樓小樓（左前角是 45° 大切角）→ s 106.3～115 米色 7 樓車道塔樓 → s 116.2～126.4 白色小方磚 5 樓的前兩個開間（栩、Q烏龍麵舖）
// 22BURGER 左翼樓（s 68～80）在 B 段，白磁磚樓第三開間（啜麵）在 D 段。
// 建造函式畫的通用立面在這一段幾乎都用不上：各格用 BARE 關掉通用構件（樓上只剩貼牆的細框），再用 custom 蓋一層外皮或往前挑出的量體蓋住。
const F = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const NC = { col: false }, TL = { col: false, tile: [0.6, 0.6] }, TILE = { tile: [0.6, 0.6] };
const BARE = { ground: 'shutter', door: 0, noband: true, bal: 'glass', roof: 'none', bikes: -1 };
const REAR = '#8c7a6b', STONE = '#6f6f69', STONE_C = '#8b8b84', STONE_D = '#5c5c57', GRANITE = '#3a3d40', TEAL = '#4f8f86', BEIGE = '#b7a590', WHITE_T = '#d0cec7', HEDGE = '#3f6f35', PLANTER = '#2e3033';

// 自己加頂點色（slab 不會經過建造函式的自動上色）
const tint = (T, g, hex) => {
  const c = new T.THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new T.THREE.BufferAttribute(a, 3)); return g;
};
const slab = (k, T, x0, z0, x1, z1, th, y0, y1, hex, wall) => tint(T, k.slab(x0, z0, x1, z1, th, y0, y1, wall ? 'd2WVC' : 'd2VC', NC), hex);
const hexOf = (T, hex) => T.wallMat(hex).slice(4);          // 牆面色（跟建造函式一樣提亮過）
const parapet = (k, x0, x1, z0, z1, top, h, mat) => {      // 女兒牆（一圈薄牆）
  k.box(x0, x1, top, top + h, z0, z0 + 0.15, mat, TL); k.box(x0, x1, top, top + h, z1 - 0.15, z1, mat, TL);
  k.box(x0, x0 + 0.15, top, top + h, z0, z1, mat, TL); k.box(x1 - 0.15, x1, top, top + h, z0, z1, mat, TL);
};
const planter = (k, x0, x1, z0, z1) => {                    // 黑石花台＋綠籬
  k.box(x0, x1, 0, 0.8, z0, z1, PLANTER);
  k.box(x0 + 0.12, x1 - 0.12, 0.8, 1.25, z0 + 0.12, z1 - 0.12, HEDGE, NC);
};
const globeLamp = (k, x, z, y0 = 0) => {                    // 黃白色圓球庭園燈
  k.cyl(x, z, 0.05, y0, 3.1, '#1c1c1e', { seg: 6 });
  k.cyl(x, z, 0.15, 3.1, 3.35, '#f3e7b4', { seg: 8, r1: 0.28 }); k.cyl(x, z, 0.28, 3.35, 3.6, '#f3e7b4', { seg: 8, r1: 0.13 });
};

// ---- 貼圖 ----
const curtainTex = (T) => T.sg('d2C_curtain', 128, 512, (g) => { // 後棟中央的青綠色玻璃帷幕（白色窗格）
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, '#2f7f80'); gr.addColorStop(0.5, '#57a7a2'); gr.addColorStop(1, '#2f7f80'); g.fillStyle = gr; g.fillRect(0, 0, 128, 512);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(36, 0, 22, 512);
  g.fillStyle = '#e4ece9'; for (let x = 0; x <= 128; x += 32) g.fillRect(Math.min(x, 125) - 1, 0, 3, 512); for (let y = 0; y <= 512; y += 28) g.fillRect(0, Math.min(y, 509), 128, 3);
});
const louvreTex = (T) => T.sg('d2C_louvre', 64, 128, (g) => {   // 食厭世的紅褐色木百葉窗
  g.fillStyle = '#6e3d27'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#9a5a3c'; g.fillRect(5, 5, 54, 118);
  for (let y = 8; y < 122; y += 7) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(5, y + 5, 54, 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(5, y, 54, 2); }
  g.fillStyle = '#6e3d27'; g.fillRect(30, 0, 4, 128);
});
const bandWinTex = (T) => T.sg('d2C_bandwin', 256, 96, (g) => { // 食厭世二樓的橫向帶狀窗（淺綠玻璃、白鋁框）
  g.fillStyle = '#e9e9e4'; g.fillRect(0, 0, 256, 96); const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, '#7fa79a'); gr.addColorStop(1, '#a9c6b8'); g.fillStyle = gr; g.fillRect(6, 6, 244, 84);
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(20, 6, 50, 84); g.fillStyle = '#e9e9e4'; g.fillRect(0, 62, 256, 5); for (const x of [84, 170]) g.fillRect(x, 0, 5, 96);
});
const doorTex = (T) => T.sg('d2C_door', 128, 256, (g) => {      // 食厭世的單扇玻璃門
  g.fillStyle = '#e4e4e0'; g.fillRect(0, 0, 128, 256); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5a4a3a'); gr.addColorStop(1, '#2c2622'); g.fillStyle = gr; g.fillRect(8, 8, 112, 240);
  g.fillStyle = 'rgba(255,240,200,.5)'; g.fillRect(20, 20, 60, 8); g.fillStyle = '#8a6a4a'; g.fillRect(8, 150, 112, 40); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(12, 8, 30, 240);
  g.fillStyle = '#e4e4e0'; g.fillRect(0, 44, 128, 5); g.fillStyle = '#9a9a96'; g.fillRect(104, 120, 5, 40);
});
const qSignTex = (T, side) => {                              // Q烏龍麵舖：紅褐色放射紋底、圓形 Q、深褐色粗字、右邊黑臉端碗的小人
  const W = side ? 320 : 640, H = side ? 208 : 144;
  return T.sg(`d2C_qudon${side ? 1 : 0}`, W, H, (g) => {
    g.fillStyle = '#b5503a'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.fillStyle = 'rgba(232,150,96,.45)'; for (let i = 0; i < 18; i++) { g.rotate(Math.PI / 9); g.beginPath(); g.moveTo(0, 0); g.lineTo(W, -H * 0.09); g.lineTo(W, H * 0.09); g.closePath(); g.fill(); } g.restore();
    const star = ['#f6d038', '#7fc8e8', '#f2f2ee', '#f29ac0']; for (let i = 0; i < 16; i++) { g.fillStyle = star[i % 4]; const x = 8 + i * (W - 16) / 15; g.fillRect(x - 3, 4, 6, 6); g.fillRect(x - 3, H - 10, 6, 6); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const Q = (x, y, r) => { g.strokeStyle = '#3a1a10'; g.lineWidth = r * 0.22; g.fillStyle = '#e9a37c'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x + r * 0.3, y + r * 0.5); g.lineTo(x + r * 0.2, y + r * 1.5); g.stroke(); };
    const man = (x, y, r) => { g.fillStyle = '#161210'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#f4f2ec'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.15, r * 0.2, 0, 7); g.arc(x + r * 0.35, y - r * 0.15, r * 0.2, 0, 7); g.fill(); g.fillStyle = '#d8342c'; g.fillRect(x - r * 0.4, y + r * 0.35, r * 0.8, r * 0.2); g.fillStyle = '#f4f2ec'; g.fillRect(x - r * 1.1, y + r * 0.9, r * 2.2, r * 0.6); };
    g.fillStyle = '#3a1a10';
    if (side) { Q(60, 62, 34); g.fillStyle = '#3a1a10'; g.font = F(72); g.fillText('烏龍', 190, 62); g.fillText('麵舖', 120, 150); man(262, 140, 30); }
    else { Q(74, 62, 40); g.fillStyle = '#3a1a10'; g.font = F(92); g.fillText('烏龍麵舖', 320, 76); man(566, 62, 36); }
  });
};
const xuWallTex = (T) => T.sg('d2C_xuwall', 384, 128, (g) => {  // 「栩」騎樓內的白底橫招：中間圓形栩，左右刀叉湯匙
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, 384, 128); g.fillStyle = '#4a2c3a'; g.beginPath(); g.arc(192, 64, 50, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = F(60); g.fillText('栩', 192, 67);
  g.fillStyle = '#4a2c3a'; for (const x of [70, 96]) { g.fillRect(x, 30, 5, 70); g.fillRect(x - 6, 30, 17, 22); } for (const x of [290, 316]) { g.fillRect(x, 30, 5, 70); g.beginPath(); g.arc(x + 2, 40, 10, 0, 7); g.fill(); }
});

// ---- 後棟 8 樓集合住宅＋前面的整個廣場（花台、景石、戶外樓梯都放在這一格的前庭裡）----
const REAR_S1 = 109, REAR_SET = 23.25;
const SHOPS = [ // [s0, s1, 招牌字, 底色, 字色, 小字]；由右（西南）到左
  [105.8, 109, null, '#f2f2ee'],                                     // 「桔髮…」後半被擋住讀不全 → 素面白招
  [101, 105.8, '可麗餅&舒芙蕾', '#cdbfe0', '#4a2a70'],
  [96.8, 101, '沙輕', '#f5f5f0', '#4a4a48', '暖沙拉・輕食'],
  [92.6, 96.8, 'Miu Miu Nail', '#3a3b3f', '#ffffff'],
  [88.4, 92.6, '尋 炭火燒肉', '#efe9da', '#1a1a1a', 'MEAT'],
  [87, 88.4, 'lobby'],
  [83.4, 87, '潘許先生', '#f4f4f0', '#1a1a1a'],
  [79.2, 83.4, '沁月 義大利麵', '#f2f4f6', '#1f3f7a'],
  [75.6, 79.2, null, '#e9e6de'],
  [72, 75.6, null, '#e9e6de'],
];
const BAYS = [105.8, 102.7, 99.6, 96.5, 93.4, 84.2, 81.1, 78.0, 74.9]; // 八角凸窗每一直排的中心 s
const customRear = (k, T) => {
  const { w, d, top, gf, fh, nf } = T, X = (s) => REAR_S1 - s, Z = (o) => o - REAR_SET;   // o＝離路中心線幾公尺
  const wm = T.wallMat(REAR), hex = hexOf(T, REAR), zs = Z(21.5), zu = Z(23), y2 = gf + fh;
  // 一樓：往前凸 1.5 m 的店面排，屋頂就是二樓露台
  k.box(0, w, 0, gf, zs, 0, wm, TILE);
  k.box(-0.05, w + 0.05, gf, gf + 0.14, zs - 0.12, zu, '#6b5e54', NC);
  SHOPS.forEach(([s0, s1, text, bg, fg, sub], i) => {
    const x0 = X(s1), x1 = X(s0), xc = (x0 + x1) / 2, sw = x1 - x0 - 0.5;
    if (text === 'lobby') { k.box(x0 + 0.1, x1 - 0.1, 0, 2.9, zs - 0.03, zs, '#26221f', NC); k.box(x0 + 0.1, x1 - 0.1, 2.9, 3.0, zs - 0.3, zs, '#4a4440', NC); return; }
    T.shopGlass(k, x0 + 0.3, x1 - 0.3, 0.08, 2.6, T.ROWT.shop(`d2C${i}`, ['#f4e7cf', '#eef2f4', '#f6ead2', '#e8f0e4'][i % 4], ['#8a6a44', '#7f858c', '#6b4a2a', '#6a7a5a'][i % 4], 520 + i * 5), zs - 0.02);
    k.box(x0 + 0.2, x1 - 0.2, 2.72, 3.5, zs - 0.12, zs, bg, NC);
    if (text) k.plane(T.paint(text, bg, fg, sub || null, sw, 0.72), sw, 0.72, xc, 3.11, zs - 0.13, T.FRONT, { emissive: 0.35 });
  });
  // 二樓退縮露台：黑色直條欄杆、落地窗
  k.box(0, w, gf + 1.14, gf + 1.2, zs + 0.02, zs + 0.08, '#1c1c1e', NC); k.box(0, w, gf + 0.2, gf + 0.25, zs + 0.02, zs + 0.08, '#1c1c1e', NC);
  for (let x = 0.02; x < w; x += 0.45) k.box(x, x + 0.04, gf + 0.14, gf + 1.14, zs + 0.03, zs + 0.07, '#1c1c1e', NC);
  // 樓上外皮（蓋住建造函式畫的細框）＋女兒牆
  k.box(0, w, gf, top + 0.9, zu, 0, wm, TL);
  for (let x = 1.7; x < w - 1; x += 3.1) k.plane(T.ROWT.alWin(), 2.3, 2.0, x, gf + 1.3, zu - 0.02, T.FRONT);
  k.box(0, w, y2 - 0.25, y2 + 0.1, zu - 0.35, zu, '#75675c', NC);                // 二樓上緣的橫帶
  k.plane(T.paint('車位出租', '#f2c21a', '#c8201a', null, 2.2, 0.55), 2.2, 0.55, X(82.8), gf + 2.72, zu - 0.04, T.FRONT, { emissive: 0.2 });   // 掛在二樓牆面上緣（沁月與潘許先生之間的正上方）
  k.box(0, w, top + 0.9, top + 1.0, zu - 0.1, zu + 0.25, '#6b5e54', NC);
  // 3～8 樓：一直排一直排的八角凸窗，窗下深褐色百葉格柵
  for (const s of BAYS) {
    const xc = X(s);
    k.box(xc - 0.75, xc + 0.75, y2, top + 0.3, zu - 0.6, zu, wm, TL);
    slab(k, T, xc - 1.22, zu + 0.02, xc - 0.77, zu - 0.58, 0.3, y2, top + 0.3, hex, true);
    slab(k, T, xc + 0.77, zu - 0.58, xc + 1.22, zu + 0.02, 0.3, y2, top + 0.3, hex, true);
    for (let f = 2; f < nf; f++) {
      const y = gf + (f - 1) * fh;
      k.box(xc - 0.8, xc + 0.8, y - 0.05, y + 0.2, zu - 0.66, zu, '#75675c', NC);
      k.box(xc - 0.62, xc + 0.62, y + 0.35, y + 0.95, zu - 0.64, zu - 0.6, '#4a3f38', NC);
      const lit = T.r() < 0.18;
      k.plane(lit ? T.litWin(false) : T.ROWT.alWin(), 1.3, 1.55, xc, y + 1.95, zu - 0.62, T.FRONT, lit ? { emissive: 0.5 } : {});
      for (const sd of [-1, 1]) k.plane(T.ROWT.alWin(), 0.5, 1.55, xc + sd * (0.995 + 0.8 * 0.17), y + 1.95, zu - 0.28 - 0.6 * 0.17, Math.atan2(sd * 0.8, -0.6));
    }
  }
  // 正中央的青綠色玻璃帷幕（3F 到頂）
  const c0 = X(91.5), c1 = X(86.1);
  k.box(c0, c1, y2, top + 1.3, zu - 0.5, zu, '#3f8f8c', NC);
  k.plane(curtainTex(T), c1 - c0, top + 1.3 - y2, (c0 + c1) / 2, (y2 + top + 1.3) / 2, zu - 0.52, T.FRONT, { emissive: 0.04 });
  k.box(c0 - 0.1, c1 + 0.1, y2 - 0.3, y2, zu - 0.9, zu, '#75675c', NC);
  // 屋頂：前緣一整排青灰色鋼構棚架，兩端各一座樓梯間，右後方一座更高的灰色水塔間
  for (const z of [zu + 0.3, zu + 2.6]) k.box(1, w - 1, top + 3.0, top + 3.14, z, z + 0.14, '#7f9a98', NC);
  for (let x = 1; x <= w - 1; x += 3) for (const z of [zu + 0.3, zu + 2.6]) k.box(x, x + 0.12, top + 0.9, top + 3.0, z, z + 0.12, '#7f9a98', NC);
  for (let x = 1; x <= w - 1; x += 1) k.box(x, x + 0.06, top + 3.14, top + 3.2, zu + 0.1, zu + 2.9, '#7f9a98', NC);
  for (const x of [1.5, w - 5.5]) { k.box(x, x + 4, top, top + 3.2, 3.2, d - 0.3, wm, TL); k.box(x - 0.2, x + 4.2, top + 3.2, top + 3.4, 3.0, d - 0.1, '#c98a5a', NC); }
  k.box(8, 12, top, top + 5.2, 3.6, d - 0.3, '#9a9a96', NC);

  // ---- 廣場（s 80.2～101.3）----
  k.box(X(101.3), X(79.5), 0.05, 0.09, Z(3.35), zs, '#9d988f', NC);                                      // 灰色石板鋪面
  k.box(X(106.3), X(101.3), 0.05, 0.09, Z(12.7), zs, '#9d988f', NC);                                    // 食厭世後面到後棟店面之間也是鋪面
  for (let x = X(101.3); x < X(79.5); x += 2.4) k.box(x, x + 0.04, 0.09, 0.095, Z(3.35), zs, '#8a857c', NC);
  for (const [sa, sb] of [[83.5, 87.5], [90, 93.7], [96.8, 99.7]]) planter(k, X(sb), X(sa), Z(5.0), Z(6.2)); // 沿路三個黑石花台
  globeLamp(k, X(85), Z(5.6), 0.8); globeLamp(k, X(98), Z(5.6), 0.8);
  const ox = X(92), oz = Z(11);                                                                             // 中央八角花台＋兩塊景石
  k.cyl(ox, oz, 3.25, 0, 0.5, '#cfc3a8', { seg: 8, col: true }); k.cyl(ox, oz, 2.95, 0.5, 1.2, HEDGE, { seg: 8 });
  k.cyl(ox + 0.4, oz, 0.9, 0.9, 2.2, '#85878a', { seg: 6, r1: 0.7 }); k.cyl(ox + 0.5, oz - 0.1, 0.7, 2.2, 3.3, '#8d8f92', { seg: 5, r1: 0.45 }); k.cyl(ox + 0.45, oz, 0.45, 3.3, 3.9, '#85878a', { seg: 5, r1: 0.2 });
  k.cyl(ox - 0.9, oz + 0.3, 0.65, 0.9, 2.0, '#7b7d7f', { seg: 5, r1: 0.5 }); k.cyl(ox - 0.85, oz + 0.25, 0.5, 2.0, 2.9, '#85878a', { seg: 5, r1: 0.22 });
  for (const [dx, dz, r, h] of [[1.7, 0.9, 0.9, 2.0], [-1.6, -1.1, 0.8, 1.8], [0.2, 1.8, 0.7, 1.7], [-0.3, -1.9, 0.8, 1.9]]) k.cyl(ox + dx, oz + dz, r, 1.2, h, '#4a7a3c', { seg: 7, r1: r * 0.55 });
  for (const [s, o, r] of [[88, 17.5, 0], [96.5, 16.5, 1], [85.5, 12.5, 1]]) { const x = X(s), z = Z(o); if (r) k.box(x - 0.22, x + 0.22, 0.08, 0.5, z - 0.75, z + 0.75, '#a0563c', NC); else k.box(x - 0.75, x + 0.75, 0.08, 0.5, z - 0.22, z + 0.22, '#a0563c', NC); } // 紅磚色石椅
  // 戶外樓梯（s 80.2～82）：貼著 22 號側牆往裡上到二樓高度，再用走道接到後棟二樓露台
  const sx0 = X(82), sx1 = X(79.6), sz = Z(6.5), N = 14, run = 0.5, rise = (gf + 0.14) / N, GREYS = '#8f8f89', RAIL = '#1c1c1e';
  for (let i = 0; i < N; i++) {
    const h = (i + 1) * rise, z = sz + i * run;
    k.box(sx0, sx1, 0, h, z, z + run, GREYS, NC);
    k.box(sx0, sx0 + 0.05, h, h + 1.0, z + 0.2, z + 0.25, RAIL, NC); k.box(sx0, sx0 + 0.05, h + 0.95, h + 1.0, z, z + run, RAIL, NC);
  }
  k.wallRect(sx0, sx1, sz, sz + N * run, 0, gf);
  const lz = sz + N * run;                                                                                // 樓梯頂的平台與走道
  k.box(sx0, sx1, gf - 0.2, gf + 0.14, lz, zs, GREYS, NC);
  k.box(sx0, sx0 + 0.3, 0, gf - 0.2, lz, lz + 0.3, GREYS); k.box(sx0, sx0 + 0.3, 0, gf - 0.2, zs - 2.6, zs - 2.3, GREYS);
  k.box(sx0, sx0 + 0.05, gf + 1.09, gf + 1.14, lz, zs, RAIL, NC);
  for (let z = lz; z < zs; z += 0.45) k.box(sx0, sx0 + 0.05, gf + 0.14, gf + 1.09, z, z + 0.04, RAIL, NC);
  k.box(sx0 + 0.3, sx1, 0, 2.2, lz + 0.02, lz + 0.08, '#b9bdc0', NC);                                   // 平台下的不鏽鋼門
};

// ---- 食厭世：面路的 2.3 m 門面 ----
const customMoodDoor = (k, T) => {
  const { w, d, top, gf } = T, wm = T.wallMat(STONE), zf = -0.25;
  k.box(0, w, 0, top + 0.5, zf, 0, STONE_C);                                                             // 深灰洗石子外皮（素色，不要磁磚紋）
  k.box(-0.04, 0, 0, top + 0.5, zf, d, STONE_C, NC); k.box(0, w, top, top + 0.5, d - 0.15, d, wm, TL);
  k.box(-0.06, w, top + 0.25, top + 0.5, zf - 0.06, zf, STONE_D, NC);
  for (const [h, out] of [[0.15, 1.3], [0.3, 0.9], [0.45, 0.5]]) k.box(0.1, w, 0, h, zf - out, zf, '#9a9892', NC);   // 門前三階
  k.plane(doorTex(T), 1.2, 2.3, 1.2, 1.6, zf - 0.02, T.FRONT, { emissive: 0.3 });
  k.box(0.4, 2.0, 2.95, 3.0, zf - 0.85, zf, '#2f5a48', NC);                                              // 墨綠色玻璃雨庇＋黑鐵架
  for (const x of [0.45, 1.92]) k.box(x, x + 0.04, 2.9, 2.95, zf - 0.85, zf, '#1c1c1e', NC);
  k.plane(T.paint('美式咖啡 買一送一', '#c8201a', '#f6d038', null, 1.8, 0.5), 1.8, 0.5, 1.2, 2.62, zf - 0.87, T.FRONT, { emissive: 0.2, double: true });
  for (const sd of [-1, 1]) k.plane(T.roundSign('', '#4a4c50', '#e8e8e8'), 0.6, 0.6, 0.28 + sd * 0.025, 2.35, zf - 0.42, sd * Math.PI / 2, { transparent: true });   // 圓形小側招（字讀不清楚，素面）
  k.box(0.25, 0.31, 2.6, 2.65, zf - 0.72, zf, '#1c1c1e', NC);
  k.box(0, w, 1.0, 1.06, zf - 0.02, zf, TEAL, NC);
  k.plane(bandWinTex(T), w - 0.3, 1.3, w / 2, gf + 1.55, zf - 0.02, T.FRONT);
  k.box(0.2, 0.75, 0, 1.15, zf - 1.85, zf - 1.8, '#1c1c1e', NC);                                         // 立式黑板菜單
  k.plane(T.ROWT.alWin(), 0.9, 1.4, -0.05, 1.75, 0.7, -Math.PI / 2);                                     // 朝西南的側牆（比塔樓左段凸出 1.85 m）：一樓白框窗、二樓轉角窗
  k.plane(bandWinTex(T), 1.4, 1.3, -0.05, gf + 1.55, 0.6, -Math.PI / 2);
  k.box(-0.04, w, 0, top + 0.5, d, d + 0.04, STONE_C, NC);                                               // 背面
};
// ---- 食厭世：45° 大切角（雨棚、木百葉窗）＋面廣場的側面 ----
const customMoodCorner = (k, T) => {
  const { w, d, top, gf } = T, wm = T.wallMat(STONE), q = Math.SQRT1_2, ROT = Math.PI * 0.75;
  const pt = (u, e) => [1.3 + u * q + e * q, -1.3 + u * q - e * q];                     // 切角面上的點：u 沿面（往廣場那端為正）、e 往外
  const sl = (u0, u1, e, th, y0, y1, c, wall) => { const a = pt(u0, e), b = pt(u1, e); return slab(k, T, a[0], a[1], b[0], b[1], th, y0, y1, c, wall); };
  const pl = (tex, pw, ph, u, e, y, o) => { const p = pt(u, e); return k.plane(tex, pw, ph, p[0], y, p[1], ROT, o); };
  sl(-1.84, 1.84, -0.9, 1.8, 0, top + 0.12, STONE_C);                                 // 把三角形填滿（後半埋在兩格的殼裡）
  sl(-1.84, 1.84, -0.08, 0.16, top, top + 0.5, STONE_C); sl(-1.84, 1.84, 0.03, 0.06, top + 0.25, top + 0.5, STONE_D);
  k.wallLine(0, -2.6, 2.6, 0, 0, top);
  sl(-1.6, 1.6, 0.75, 1.5, 2.55, 2.63, '#2b3040'); sl(-1.6, 1.6, 0.4, 0.8, 2.63, 2.8, '#2b3040'); sl(-1.6, 1.6, 1.48, 0.04, 2.2, 2.55, '#2b3040'); // 深藍黑色帆布雨棚
  pl(T.paint('食厭世', '#2b3040', '#ffffff', null, 3.2, 0.35), 3.2, 0.35, 0, 1.51, 2.375, { emissive: 0.15 });
  for (const u of [-0.9, 0.9]) pl(louvreTex(T), 1.0, 1.6, u, 0.02, 1.55);
  sl(-0.25, 0.25, 0.03, 0.06, 1.25, 1.9, '#e6e0cf');
  sl(-1.84, 1.84, 0.01, 0.03, 1.0, 1.06, TEAL);
  pl(bandWinTex(T), 3.2, 1.3, 0, 0.02, gf + 1.55);
  // 面廣場那側：黑花崗石轉角柱、整排黑色帆布雨棚、木百葉窗
  k.box(w, w + 0.04, 0, top + 0.5, 0, d, STONE_C, NC); k.box(0, w, top, top + 0.5, d - 0.15, d, wm, TL);
  k.box(0, w + 0.04, 0, top + 0.5, d, d + 0.04, STONE_C, NC);                                             // 背面
  for (const z of [0, d - 0.55]) k.box(w, w + 0.16, 0, top + 0.5, z, z + 0.55, GRANITE, NC);              // 黑花崗石門形框：前後兩根柱
  k.box(w, w + 0.16, top - 0.8, top + 0.5, 0, d, GRANITE, NC);                                            // 上緣橫帶
  k.box(w, w + 0.3, top + 0.5, top + 0.65, -0.06, d + 0.06, '#2c2e30', NC);                               // 石材線腳
  k.box(w, w + 0.06, 2.8, top - 0.8, 0.55, d - 0.55, '#8d8573', NC);                                      // 框裡的卡其色洗石子牆（沒有窗）
  k.box(w, w + 1.2, 2.55, 2.63, 0.1, d, '#1f2024', NC); k.box(w + 1.16, w + 1.2, 2.25, 2.55, 0.1, d, '#1f2024', NC); k.box(w, w + 0.6, 2.63, 2.78, 0.1, d, '#1f2024', NC);
  for (const z of [d * 0.3, d * 0.7]) k.plane(louvreTex(T), 1.3, 1.7, w + 0.05, 1.5, z, Math.PI / 2);
  k.box(w + 0.04, w + 0.06, 1.0, 1.06, 0, d, TEAL, NC);
};

// ---- 米色 7 樓車道塔樓 ----
const customTowerSide = (k, T) => {                          // 左邊那一小段沒有窗的牆（退後一點），掛一支鋁風管（冷氣掛在主立面左柱上）
  const { w, d, top, gf, fh, nf } = T, wm = T.wallMat(BEIGE), zf = -0.25;
  k.box(0, w, 0, top + 0.9, zf, 0, wm, TILE);
  k.box(w - 0.15, w, top, top + 0.9, 0, d, wm, TL); k.box(0, w, top, top + 0.9, d - 0.15, d, wm, TL);
  k.cyl(0.35, zf - 0.2, 0.16, 1.3, 4.7, '#b9bdc0', { seg: 8 });
  for (let f = 1; f < nf; f++) {                                // 面廣場的東北側牆：每層兩扇窗＋窗型冷氣鐵架（二樓前半被食厭世擋住，只有後面那扇）
    const y = gf + (f - 1) * fh;
    for (const z of f > 1 ? [2.6, 7.4] : [7.4]) { k.plane(T.ROWT.alWin(), 1.4, 1.25, w + 0.03, y + 1.7, z, Math.PI / 2); k.box(w, w + 0.5, y + 0.55, y + 1.05, z + 0.9, z + 1.6, '#c9c4b8', NC); }
  }
  planter(k, 0, 1.6, -2.5, -1.0);
};
const customTower = (k, T) => {
  const { w, d, top, gf, fh, nf } = T, wm = T.wallMat(BEIGE), Z = -2, PR = 0.9, PL = 0.9;     // 車道口內凹 2 m：殼在裡面，樓上與兩側牆往前挑
  k.box(0, w, gf, top, Z, 0, wm, TL);
  k.box(0, PR, 0, gf, Z, 0, wm, TILE); k.box(w - PL, w, 0, gf, Z, 0, wm, TILE);
  k.box(PR, w - PL, 2.2, gf, -0.4, 0, wm, TL);                                                 // 車道口上方的橫梁
  k.plane(T.paint('限高200CM', '#c8201a', '#ffffff', null, 3.2, 0.4), 3.2, 0.4, (PR + w - PL) / 2, 2.45, -0.41, T.FRONT, { emissive: 0.25 });
  k.box(PR, w - PL, 0, 0.14, -0.06, 0, '#d8b02a', NC);                                         // 鐵捲門底的黃色警示邊
  k.box(w / 2 - 0.1, w / 2 + 0.1, gf - 0.45, gf - 0.2, Z - 0.12, Z, '#c8201a', NC);            // 門楣中央的紅色警示燈
  k.box(0.25, 0.65, 1.9, 2.4, Z - 0.04, Z, '#c8201a', NC);                                     // 右柱上的紅底小告示牌（字讀不清楚，不放字）
  for (let f = 1; f < nf; f++) {
    const y = gf + (f - 1) * fh;
    for (const x of [w * 0.27, w * 0.73]) { const lit = T.r() < 0.2; k.plane(lit ? T.litWin(false) : T.ROWT.alWin(), 1.5, 1.3, x, y + 1.7, Z - 0.02, T.FRONT, lit ? { emissive: 0.5 } : {}); k.box(x - 0.8, x + 0.8, y + 0.98, y + 1.04, Z - 0.06, Z, '#a3937f', NC); }
    if (f > 1) k.plane(T.ROWT.alWin(), 0.5, 0.4, w / 2, y + 2.1, Z - 0.02, T.FRONT);                // 小氣窗從三樓開始
    if (f === 1) { T.ac(k, 0.15, y + 0.2, Z - 0.42); T.ac(k, w - 0.95, y + 0.2, Z - 0.42); } else if (f % 2 === 0) T.ac(k, f % 4 ? 0.15 : w - 0.95, y + 0.3, Z - 0.42);
  }
  for (const y of [1.25, 2.3]) T.ac(k, w - 0.86, y, Z - 0.42);                                  // 左柱上疊兩台冷氣（2F 那台在上面的迴圈裡）
  k.box(-0.02, w + 0.02, top, top + 0.12, Z - 0.04, 0, 'gray', NC);
  parapet(k, 0, w, Z, d, top, 0.9, wm);
  k.box(0.9, w - 0.9, top + 0.9, top + 1.25, Z - 0.05, Z + 0.2, wm, TL);                       // 正面女兒牆中段加高（兩端切角造型）
  k.box(1.2, 5.2, top, top + 3.0, 3, 7, wm, TL); k.box(1.0, 5.4, top + 3.0, top + 3.15, 2.8, 7.2, '#8f8a80', NC);   // 屋頂退縮的樓梯間
  planter(k, 5.8, w, -4.1, -2.6);
};

// ---- 白色小方磚 5 樓的前兩個開間（騎樓；寫法與尺寸跟 D 段的啜麵那一開間對齊）----
const whiteBay = (k, T, door) => {
  const { w, d, top, gf, fh, nf } = T, wm = T.wallMat(WHITE_T), Z = -2;
  k.box(0, w, gf, top, Z, 0, wm, TL);                                               // 樓上挑出來的量體
  k.box(-0.02, w + 0.02, top, top + 0.12, Z - 0.04, 0, 'gray', NC);
  k.box(0, w, gf - 0.55, gf, Z, Z + 0.4, wm, TL);                                   // 騎樓上緣的樑
  for (const x of [0, w - 0.45]) k.box(x, x + 0.45, 0, gf, Z, Z + 0.45, wm, TILE);  // 騎樓柱
  k.box(0, w, 0.05, 0.07, Z, 0, '#4d4a47', NC);                                     // 黑底磨石子地
  k.box(0, w, gf - 0.02, gf, Z + 0.4, 0, '#e6e2d8', NC);
  k.box(0.3, 1.35, 0, 2.3, -0.08, 0, '#8d9196', NC); k.box(0.3, 1.35, 2.3, gf - 0.6, -0.08, 0, '#cfccc4', NC);   // 右邊的樓梯鐵門
  if (door) k.box(0.55, 1.1, 1.2, 1.9, -0.1, -0.08, door, NC);
  for (let f = 1; f < nf; f++) {                                                    // 每層一組三連鋁窗
    const y = gf + (f - 1) * fh, cw = (w - 0.9) / 3;
    for (let j = 0; j < 3; j++) { const lit = T.r() < 0.2; k.plane(lit ? T.litWin(false) : T.ROWT.alWin(), cw - 0.14, 1.6, 0.45 + cw * (j + 0.5), y + 1.75, Z - 0.02, T.FRONT, lit ? { emissive: 0.5 } : {}); }
    k.box(0.4, w - 0.4, y + 0.88, y + 0.95, Z - 0.06, Z, '#bdbbb4', NC);
  }
  parapet(k, 0, w, Z, d, top, 1.0, wm);
  k.box(0.2, w - 0.2, top + 0.12, top + 1.5, Z + 1.2, d - 0.4, '#8f9395', NC);      // 屋頂鐵皮加蓋＋深褐色屋簷
  k.box(-0.05, w + 0.05, top + 1.5, top + 1.62, Z + 0.5, d, '#5a4636', NC);
};
const customXu = (k, T) => {                                // 第一開間「栩」：灰色鐵捲門、圓形側招、騎樓內白底橫招、綠色浪板側牆
  const { w, d, top, gf, fh } = T, Z = -2;
  whiteBay(k, T, '#c8201a');
  k.box(0, w, gf + 0.05, gf + 0.3, Z - 0.6, Z, T.wallMat(WHITE_T), TL);             // 2F 窗下的磁磚雨庇橫帶
  k.box(w, w + 0.06, gf, top + 1.5, Z, d, '#6f8f5a', NC);                           // 朝車道那面整片綠色浪板
  for (let z = Z + 0.3; z < d; z += 0.6) k.box(w + 0.06, w + 0.08, gf, top + 1.5, z, z + 0.08, '#5d7a4b', NC);
  for (const sd of [-1, 1]) k.plane(T.roundSign('栩', '#4a2c3a', '#ffffff'), 0.85, 0.85, w - 0.22 + sd * 0.03, 2.75, Z - 0.5, sd * Math.PI / 2, { transparent: true, emissive: 0.3 });
  k.box(w - 0.25, w - 0.19, 3.1, 3.15, Z - 0.9, Z, '#1c1c1e', NC);
  k.plane(xuWallTex(T), 1.7, 0.57, w - 0.47, 2.2, Z + 1.25, -Math.PI / 2, { emissive: 0.25 });
  T.ac(k, 0.5, gf + fh + 0.3, Z - 0.42); T.ac(k, w - 1.5, gf + 0.35, Z - 0.42);
  k.box(w, w + 1.22, -0.5, 0.05, -T.apron, d, T.MR.concrete, NC);                   // 兩棟之間窄縫的地面
  globeLamp(k, w + 0.5, Z - 0.2); k.box(w + 0.15, w + 1.0, 0, 0.9, Z + 0.1, Z + 1.3, HEDGE, NC);        // 兩棟之間窄縫前的庭園燈與灌木
  for (const [x, c] of [[1.0, '#2a2a30'], [1.8, '#c9c9c4'], [2.6, '#2f6db3'], [3.5, '#2a2a30']]) T.bike(k, x, Z - 1.6, 1, c);
};
const customQ = (k, T) => {                                 // 第二開間「Q烏龍麵舖」：橘色鐵捲門、2F 窗下大橫招、垂直立面的側招
  const { w, gf, fh } = T, Z = -2;
  whiteBay(k, T, '#f2f2ee');
  k.box(-0.02, w + 0.02, gf - 0.1, gf - 0.02, Z - 0.9, Z, '#8f9395', NC);           // 橫招下的鐵皮小雨庇
  k.box(0.3, w - 0.3, gf + 0.05, gf + 1.1, Z - 0.5, Z, '#8a3a28', NC);
  k.plane(qSignTex(T, false), w - 0.6, 1.05, w / 2, gf + 0.575, Z - 0.51, T.FRONT, { emissive: 0.35 });
  k.box(0.2, 0.3, gf + 0.9, gf + 2.4, Z - 2.4, Z - 0.15, '#8a3a28', NC);            // 開間右端垂直立面的大側招（2～3 樓高度）
  for (const sd of [-1, 1]) k.plane(qSignTex(T, true), 2.25, 1.5, 0.25 + sd * 0.055, gf + 1.65, Z - 1.275, sd * Math.PI / 2, { emissive: 0.35 });
  ['#c8201a', '#3f9a4c', '#f2f2ee', '#e8c22a'].forEach((c, i) => { const x = 2.2 + i * 0.55; k.box(x, x + 0.42, 0.07, 0.5, -0.75, -0.3, c, NC); k.box(x, x + 0.42, 0.5, 0.95, -0.36, -0.3, c, NC); }); // 門前四張彩色塑膠椅
  T.ac(k, w - 1.3, gf + fh + 0.3, Z - 0.42);
  for (const [x, c] of [[0.8, '#2a2a30'], [1.6, '#2a2a30'], [2.5, '#b02a2a'], [3.3, '#2f6db3'], [4.1, '#2a2a30']]) T.bike(k, x, Z - 1.6, 1, c);
};

const WH = { ...BARE, set: 6.7, d: 12, nf: 5, gf: 3.4, fh: 3.1, wall: WHITE_T };
const TW = { ...BARE, nf: 7, gf: 4.0, fh: 3.25, wall: BEIGE };
const MOOD = { ...BARE, nf: 2, gf: 3.6, fh: 3.9, wall: STONE };
export default {
  ownSign: ['食厭世', '尋MEAT炭火燒肉', 'Amber 日式可麗餅&舒芙蕾'],
  drop: ['f1573', 'f1572', 'f1563'],
  lots: [
    // 後棟 8 樓集合住宅（立面在 off -23，一樓店面凸到 -21.5），前庭就是整個廣場
    [72, REAR_S1, -1, { ...BARE, set: REAR_SET, d: 7.2, nf: 8, gf: 3.6, fh: 3.3, wall: REAR, custom: customRear }],
    // 食厭世：切角那一格（殼在 off -8，切角用 custom 補）＋面路的門面；整棟只到 off -12.7（面廣場那面寬 4.7 m）
    [101.3, 103.9, -1, { ...MOOD, set: 8.0, d: 4.7, custom: customMoodCorner }],
    [103.9, 106.2, -1, { ...MOOD, set: 5.55, d: 7.15, custom: customMoodDoor }],
    // 米色 7 樓車道塔樓：左邊 1.7 m 無窗牆段（幾乎跟主立面齊平）＋主立面（車道口內凹 2 m）
    [106.3, 108, -1, { ...TW, set: 7.4, d: 11.6, custom: customTowerSide }],
    [108, 115, -1, { ...TW, set: 9.0, d: 10, sh: '#8e8e8a', custom: customTower }],
    // 白色小方磚 5 樓：栩、Q烏龍麵舖（第三開間啜麵在 D 段）
    [116.2, 121.3, -1, { ...WH, sh: '#8c8c8c', custom: customXu }],
    [121.3, 126.4, -1, { ...WH, sh: '#d9702c', custom: customQ }],
  ],
};
