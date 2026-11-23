// 大仁二街 D 段：東南側 s 126～141（街景 2024-08；正射 2024）。s 140.9 以後到實踐路口的 7-ELEVEN 轉角樓由實踐路那邊蓋（shijian/S3.js），這裡不重複。
// 實景兩棟：白色小方磚 5 樓（這一段只有啜麵那一開間，烏龍麵舖那一開間在 C 段）＋咖啡色磁磚 4 樓（這裡只做東北端的鐵捲門開間與樓梯門）。
// 兩棟中間 0.2 m 的縫有一根不鏽鋼排風管。立面在離路中心線 4.7 m；白樓一樓是內縮 2 m 的騎樓，所以外殼設在 6.7、樓上用 custom 往前挑出來。
const F = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const BROWN = '#83604f', TRIM = '#ded9cd', GREYW = '#c8c5bc', WHITE_T = '#d0cec7';
const TL = { col: false, tile: [0.6, 0.6] }, NC = { col: false };
const GF = 3.5, FH = 3.2;                                    // 咖啡樓一樓高與樓高（三個開間＋切角共用，樓板才對得齊）

// 自己加頂點色（slab／prism 不會經過建造函式的自動上色）
const tint = (T, g, hex) => {
  const c = new T.THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new T.THREE.BufferAttribute(a, 3)); return g;
};
const slab = (k, T, x0, z0, x1, z1, th, y0, y1, hex) => tint(T, k.slab(x0, z0, x1, z1, th, y0, y1, 'd2VC', NC), hex);
// ---- 貼圖 ----
const logo7 = (g, x, y, s) => {                               // 7-ELEVEN 標誌：橘紅漸層的 7 上面壓綠字
  const gr = g.createLinearGradient(0, y, 0, y + s); gr.addColorStop(0, '#f26b21'); gr.addColorStop(0.48, '#f26b21'); gr.addColorStop(0.52, '#e2231a'); gr.addColorStop(1, '#e2231a');
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = gr; g.font = `900 ${s * 1.05}px Arial,sans-serif`; g.fillText('7', x + s * 0.5, y + s * 0.54);
  g.font = `900 ${s * 0.25}px Arial,sans-serif`; g.lineWidth = s * 0.07; g.strokeStyle = '#ffffff'; g.strokeText('ELEVEN', x + s * 0.5, y + s * 0.56); g.fillStyle = '#00843d'; g.fillText('ELEVEN', x + s * 0.5, y + s * 0.56);
};
const boxSignTex = (T) => T.sg('d2D_7box', 256, 256, (g) => { // 綠框方形側招
  g.fillStyle = '#00843d'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fbfbf8'; g.fillRect(16, 16, 224, 224); logo7(g, 38, 30, 180);
});
const tsumiVertTex = (T) => T.sg('d2D_tsumiV', 192, 512, (g) => { // 啜麵直立燈箱
  g.fillStyle = '#f6f5f2'; g.fillRect(0, 0, 192, 512); g.strokeStyle = '#b9b9b4'; g.lineWidth = 6; g.strokeRect(3, 3, 186, 506);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d8342c'; g.font = F(140); g.fillText('啜', 96, 110); g.fillText('麵', 96, 268);
  g.fillStyle = '#1c1c1c'; g.font = '900 34px Arial,sans-serif'; g.fillText('TSU MI', 96, 380); g.font = F(36, 700); g.fillText('自助泡麵', 96, 436);
});
const tsumiRedTex = (T) => T.sg('d2D_tsumiR', 256, 192, (g) => { // 啜麵紅色方招
  g.fillStyle = '#d8342c'; g.fillRect(0, 0, 256, 192); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f6d038';
  g.font = '900 22px Arial,sans-serif'; g.fillText('TSU MI', 128, 34); g.font = F(96); g.fillText('啜麵', 128, 110);
});
const tsumiShopTex = (T) => T.sg('d2D_tsumiShop', 512, 320, (g) => { // 啜麵店面：整面玻璃，裡面橘色牆
  const gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, '#f0803f'); gr.addColorStop(1, '#d9571f'); g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#f7e6cf'; g.fillRect(0, 0, 512, 22); g.fillStyle = 'rgba(255,250,235,.9)'; for (let x = 40; x < 512; x += 120) g.fillRect(x, 8, 50, 6); // 天花與崁燈
  g.fillStyle = '#f4f1ea'; g.fillRect(250, 70, 70, 70); g.fillStyle = '#d8342c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = F(30); g.fillText('啜麵', 285, 106); // 牆上的小 logo
  g.fillStyle = '#6a4630'; g.fillRect(20, 205, 200, 115); g.fillStyle = '#8a6040'; g.fillRect(20, 200, 200, 10); // 櫃台
  g.fillStyle = '#e9e4d8'; g.fillRect(380, 150, 110, 170); g.fillStyle = '#c9c4b8'; g.fillRect(388, 160, 94, 60);     // 機台
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 0, 150, 320);
  g.fillStyle = '#d9d9d6'; g.fillRect(0, 0, 512, 8); g.fillRect(0, 0, 8, 320); g.fillRect(504, 0, 8, 320); g.fillRect(236, 0, 8, 320); g.fillRect(0, 44, 512, 6); g.fillRect(370, 44, 6, 276); // 鋁框與玻璃門
  g.fillStyle = '#8d8d88'; g.fillRect(360, 170, 6, 40);
});
// ---- 共用構件 ----
const parapet = (k, x0, x1, z0, z1, top, h, mat, o) => {      // 女兒牆（一圈薄牆）
  k.box(x0, x1, top, top + h, z0, z0 + 0.15, mat, o); k.box(x0, x1, top, top + h, z1 - 0.15, z1, mat, o);
  k.box(x0, x0 + 0.15, top, top + h, z0, z1, mat, o); k.box(x1 - 0.15, x1, top, top + h, z0, z1, mat, o);
};
const acHood = (k, T, x, y, z = -0.45) => { T.ac(k, x, y, z); k.box(x - 0.1, x + 0.9, y + 0.62, y + 0.67, z - 0.3, 0, '#9a9d9e', NC); }; // 窗型冷氣＋小鐵雨遮
// 咖啡樓樓上：把建造函式畫的一整條連窗用磚柱隔成一扇一扇，每層樓板位置一條白色飾帶
const brownUpper = (k, T, piers, pil) => {
  const wm = T.wallMat(BROWN);
  for (let f = 1; f < T.nf; f++) {
    const y = T.gf + (f - 1) * T.fh;
    k.box(0.02, T.w - 0.02, y + 0.28, y + 0.5, -0.06, 0, TRIM, NC);
    for (const [a, b] of [[0.3, 0.75], [T.w - 0.75, T.w - 0.3], ...piers]) k.box(a, b, y + 0.7, y + 2.35, -0.05, 0, wm, TL);
    const ed = [0.75, ...piers.flat(), T.w - 0.75];                                  // 每扇窗上半的米色捲簾
    for (let j = 0; j < ed.length; j += 2) k.box(ed[j] + 0.12, ed[j + 1] - 0.12, y + 1.5 + (j % 4 ? 0.2 : 0), y + 2.14, -0.035, -0.02, '#e3d9c0', NC);
  }
  k.box(0, T.w, 0.05, 0.065, -T.apron + 0.03, -T.apron + 0.15, '#c8312b', NC);      // 路邊紅線（一路畫到路口）
  for (const x of pil) k.box(x, x + 0.38, T.gf - 0.4, T.top + 0.9, -0.1, 0, T.wallMat('#cfc7b6'), TL);   // 開間之間的米白直柱
  parapet(k, 0, T.w, 0, T.d, T.top, 0.9, wm, TL);
};

// ---- D1 白色小方磚 5 樓：啜麵（s 126.4～131.8）----
const customTsumi = (k, T) => {
  const { w, d, top, gf, fh, nf } = T, wm = T.wallMat(WHITE_T), Z = -2;         // Z：樓上立面（外殼在騎樓裡面 2 m）
  k.box(0, w, gf, top, Z, 0, wm, TL);                                           // 樓上挑出來的量體
  k.box(-0.02, w + 0.02, top, top + 0.12, Z - 0.04, 0, 'gray', NC);
  k.box(0, w, gf - 0.55, gf, Z, Z + 0.4, wm, TL);                               // 騎樓上緣的樑
  k.box(-0.02, w + 0.02, gf - 0.62, gf - 0.55, Z - 0.35, Z + 0.1, '#8f9395', NC); // 鐵皮雨遮邊
  for (const x of [0, w - 0.3]) k.box(x, x + (x ? 0.3 : 0.45), 0, gf, Z, Z + 0.45, wm, { tile: [0.6, 0.6] }); // 騎樓柱（小方磚）
  k.box(0, w, 0.05, 0.07, Z, 0, '#4d4a47', NC);                                 // 深色磨石子地
  k.box(0, w, gf - 0.02, gf, Z + 0.4, 0, '#e6e2d8', NC);                         // 騎樓天花
  // 一樓：左邊（東北端）1.3 m 灰色樓梯鐵門，其餘整面玻璃店面
  k.box(0, w, 0, gf, -0.1, 0, '#cfccc4', NC);
  k.plane(tsumiShopTex(T), w - 1.6, 2.9, (w - 1.5) / 2 + 0.1, 1.45, -0.11, T.FRONT, { emissive: 0.55 });
  k.box(w - 1.35, w - 0.15, 0, 2.35, -0.13, -0.1, '#8d9196', NC); k.box(w - 0.8, w - 0.74, 0, 2.35, -0.14, -0.1, '#6f7376', NC);
  k.box(w - 1.3, w - 0.95, 1.2, 1.55, -0.2, -0.13, '#b02a2a', NC);               // 信箱
  // 樓上：每層 3 扇橫向鋁窗
  for (let f = 1; f < nf; f++) {
    const y = gf + (f - 1) * fh, cw = (w - 0.9) / 3;
    for (let j = 0; j < 3; j++) {
      const lit = T.r() < 0.2;
      k.plane(lit ? T.litWin(false) : T.ROWT.alWin(), cw - 0.14, 1.6, 0.45 + cw * (j + 0.5), y + 1.75, Z - 0.02, T.FRONT, lit ? { emissive: 0.5 } : {});
    }
    k.box(0.4, w - 0.4, y + 0.88, y + 0.95, Z - 0.06, Z, '#bdbbb4', NC);       // 窗台
  }
  T.ac(k, 2.6, gf + 0.25, Z - 0.45); k.box(2.5, 3.5, gf + 0.9, gf + 0.95, Z - 0.75, Z, '#9a9d9e', NC); // 2 樓窗下的冷氣室外機＋雨遮
  T.ac(k, 0.6, gf + fh * 2 + 0.3, Z - 0.42);
  // 屋頂：女兒牆＋淺綠色屋頂面（正射）
  parapet(k, 0, w, Z, d, top, 1.0, wm, TL);
  k.box(0.3, w - 0.3, top + 0.12, top + 0.16, Z + 1.0, d - 0.4, '#a9c3a0', NC);
  // 兩棟之間縫裡的不鏽鋼排風管（從 2 樓直上屋頂）
  k.cyl(-0.1, Z + 0.1, 0.2, gf + 0.6, top + 1.6, '#b9bdc0', { seg: 10 });
  k.box(-0.15, 0.05, gf + 0.6, gf + 1.0, Z + 0.1, Z + 1.2, '#b9bdc0', NC);
  // 啜麵直立燈箱（3～4 樓、西南端，垂直立面伸出）
  const vx = 0.75, vy0 = gf + fh + 2.9, vy1 = vy0 + 3.2, vz = Z - 0.85;
  k.box(vx - 0.07, vx + 0.07, vy0, vy1, vz - 0.6, vz + 0.6, '#e9e8e4', NC);
  for (const sd of [-1, 1]) k.plane(tsumiVertTex(T), 1.2, 3.2, vx + sd * 0.075, (vy0 + vy1) / 2, vz, sd * Math.PI / 2, { emissive: 0.4 });
  for (const yy of [vy0 + 0.4, vy1 - 0.4]) k.box(vx - 0.03, vx + 0.03, yy, yy + 0.05, Z - 0.25, Z, '#2b2b2b', NC);
  // 啜麵紅色方招（2 樓，斜向伸出）
  const th = -1.65, cx = 1.25, cz = Z - 0.75, tx = Math.cos(th), tz = -Math.sin(th), nx = Math.sin(th), nz = Math.cos(th), ry = gf + 2.25;
  slab(k, T, cx - tx * 0.8, cz - tz * 0.8, cx + tx * 0.8, cz + tz * 0.8, 0.12, ry - 0.6, ry + 0.6, '#b3261f');
  k.plane(tsumiRedTex(T), 1.6, 1.2, cx + nx * 0.065, ry, cz + nz * 0.065, th, { emissive: 0.4 });
  k.plane(tsumiRedTex(T), 1.6, 1.2, cx - nx * 0.065, ry, cz - nz * 0.065, th + Math.PI, { emissive: 0.4 });
  slab(k, T, cx + tx * 0.8, cz + tz * 0.8, cx + tx * 0.8, Z, 0.05, ry + 0.3, ry + 0.35, '#2b2b2b');
  // 門口：無字 A 字立牌（上白下黃）、橘色交通錐、機車
  k.box(2.0, 2.5, 0.07, 1.0, Z + 0.55, Z + 0.6, '#f1eee6', NC); k.box(2.02, 2.48, 0.1, 0.55, Z + 0.54, Z + 0.56, '#f0c53a', NC);
  k.cyl(1.9, Z - 0.9, 0.16, 0.05, 0.7, '#e8632a', { seg: 8, r1: 0.03 });
  ['#c9c9c4', '#2a2a30', '#2f6db3', '#c9c9c4'].forEach((c, j) => T.bike(k, 2.6 + j * 0.75, Z - 1.65, 1, c));
};

// ---- D2 咖啡樓鐵捲門開間（s 132～138）----
const customShutter = (k, T) => {
  const { w, gf, fh, top, d } = T;
  brownUpper(k, T, [[2.35, 2.85]], [0]);
  // 一樓：整面灰色鐵捲門，兩邊與上緣是灰白水泥漆牆（不用 low，不然會把鐵捲門蓋住）
  k.box(0, w, 2.7, gf + 0.28, -0.04, 0, GREYW, NC); for (const x of [0, w - 0.2]) k.box(x, x + 0.2, 0, 2.7, -0.04, 0, GREYW, NC);
  k.box(w, w + 0.2, -0.5, 0.05, -T.apron, 0.4, T.MR.concrete, NC); k.box(w, w + 0.2, 0, top, 0.1, 0.4, '#3a3a3a', NC); // 跟白樓中間那條縫的地面與縫底
  acHood(k, T, 3.2, gf + fh + 0.1); acHood(k, T, 2.0, gf + fh * 2 + 1.3);
  // 7-ELEVEN 綠框方形側招（2～3 樓之間，黑鐵架伸出）
  const sx = 1.0, sy = gf + fh - 0.3, sz = -1.3;
  k.box(sx - 0.1, sx + 0.1, sy - 0.75, sy + 0.75, sz - 0.75, sz + 0.75, '#00843d', NC);
  for (const sd of [-1, 1]) k.plane(boxSignTex(T), 1.5, 1.5, sx + sd * 0.105, sy, sz, sd * Math.PI / 2, { emissive: 0.4 });
  for (const yy of [sy - 0.5, sy + 0.5]) k.box(sx - 0.04, sx + 0.04, yy, yy + 0.07, sz + 0.75, 0, '#1c1c1e', NC);
  // 鐵捲門左前方的大盆栽樹與一堆小盆
  const px = w - 1.0, pz = -0.75;
  k.cyl(px, pz, 0.45, 0.05, 0.6, '#5a5550', { seg: 10 }); k.cyl(px, pz, 0.09, 0.6, 2.3, '#5b4632', { seg: 6 });
  [[0.45, 1.05, 1.3, 2.0], [1.05, 1.25, 2.0, 2.9], [1.25, 0.9, 2.9, 3.6], [0.9, 0.25, 3.6, 4.2]].forEach(([r0, r1, a, b], j) => k.cyl(px + (j % 2) * 0.12, pz, r0, a, b, j % 2 ? '#3f6e35' : '#37622f', { seg: 9, r1 }));
  [[0.3, 0.75, 0.8, 1.3], [0.75, 0.55, 1.3, 1.9], [0.55, 0.15, 1.9, 2.3]].forEach(([r0, r1, a, b]) => k.cyl(px - 1.0, pz - 0.15, r0, a, b, '#467a3a', { seg: 8, r1 }));
  [[px - 1.3, -0.5, '#a8623c'], [px - 1.7, -0.9, '#e8e4da'], [px - 0.7, -1.25, '#2b2b2b'], [px + 0.5, -1.2, '#a8623c'], [px - 2.1, -0.45, '#e8e4da']].forEach(([x, z, c]) => { k.cyl(x, z, 0.2, 0.05, 0.4, c, { seg: 8 }); k.cyl(x, z, 0.28, 0.4, 0.85, T.MR.plant, { seg: 6, r1: 0.12 }); });
  // 黃底紅字「套房出租」人行立牌（立在棧板上）
  const th = 2.6, cx = 2.6, cz = -0.95, tx = Math.cos(th), tz = -Math.sin(th), nx = Math.sin(th), nz = Math.cos(th), tex = T.paint('套\n房\n出\n租', '#f2d21f', '#d42a1f', null, 0.5, 1.3);
  k.box(cx - 0.45, cx + 0.45, 0.05, 0.17, cz - 0.35, cz + 0.35, '#b08a5a', NC);
  slab(k, T, cx - tx * 0.25, cz - tz * 0.25, cx + tx * 0.25, cz + tz * 0.25, 0.05, 0.17, 1.55, '#d9bd1c');
  k.plane(tex, 0.5, 1.3, cx + nx * 0.03, 0.88, cz + nz * 0.03, th, { emissive: 0.2 });
  k.plane(tex, 0.5, 1.3, cx - nx * 0.03, 0.88, cz - nz * 0.03, th + Math.PI, { emissive: 0.2 });
  k.box(0.3, w - 0.3, top + 0.12, top + 0.15, 0.3, d - 0.3, '#d2d1cb', NC);        // 灰白防水漆屋頂面
};

// ---- D3 咖啡樓鐵窗開間（s 138～145.1）----
// ---- D4 咖啡樓 7-Eleven 開間（s 145.1～152.2）----
// ---- D5 轉角：45° 切角（7-Eleven 入口）＋實踐路面（s 152.2～155.7）----
const BR = { set: 4.7, d: 8.5, nf: 4, gf: GF, fh: FH, wall: BROWN, bal: 'plain', door: 0 };
export default {
  ownSign: ['TSU MI：啜麵'],
  drop: ['f1571', 'f1570', 'f1569'],
  lots: [
    [126.4, 131.8, -1, { set: 6.7, d: 12, nf: 5, gf: 3.4, fh: 3.1, wall: WHITE_T, ground: 'shop', door: 0, noband: true, bal: 'glass', roof: 'none', custom: customTsumi }],
    [132, 138, -1, { ...BR, ground: 'shutter', sh: '#a8a9a7', roof: 'none', bikes: 1, custom: customShutter }],
    // s 138～140.9：同一棟咖啡樓的樓梯門那一小段，接到實踐路那邊蓋的 7-ELEVEN 轉角樓（shijian/S3.js，S 417.2～426.2，佔 s 140.9 以後）
    [138, 140.9, -1, { ...BR, ground: 'open', door: 1, noband: true, roof: 'none', bikes: -1 }],
  ],
};
