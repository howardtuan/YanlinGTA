// 新中北路 s 356～433（469 巷口以西，兩側；Google 街景 2026-05、國土測繪 2024 正射）。
//   這段路是直的，兩側都是正對著路的一樓鐵皮店面（少數 2 樓），所以本體用 lots，招牌、側招、屋頂看板與空地小物在 custom 補。
//   實際的路比遊戲窄，屋簷前緣離中心線約 5.2 m，所以整段立面都放在 set 6.2（預設 7.4 太退後）。
//   北側（+1）由東到西：469 巷口西北轉角露天停車場（靠新中北路這側；靠巷子那側在 SegL1.js）→ 多多嗨 → 春園快餐 → 7-ELEVEN → 馬丘自助桌遊 →
//     ZU'S HAIR → 良任 足體保健（2 樓）→ 石片柱鐵捲門 → 屋頂深灰格柵的鐵捲門 → 加一減一 → 白色一樓
//   南側（-1）由東到西（東端接 SegX1.js 的初樂，s 370.2）：米色鐵捲門鐵皮屋 → 夾娃娃機店（舊招牌第一快餐、側招平價串燒）→ 囍勒烤 → 光頭叔叔の簡單麵包店 →
//     雜草空地 → 便宜租車 → 八方來 → 韓老爺 → 憶阿嬤 → PPLAN BEE → 銀灰浪板 2 樓雜貨店 → 米色浪板 2 樓 → 紅茶洋行 → 山東餃子館 → 日嚐麵飯館
//   Kit 的區域座標：北側 x=0 在東端（s 小的那端），南側 x=0 在西端（s 大的那端）；-z 是街道。
const R = 'X', SET = 6.2;
const FNT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const SERIF = (px) => `900 ${px}px "Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif`;
const one = (o) => ({ nf: 1, door: 0, set: SET, ...o });

export default {
  // f771～f774 是 ZU'S HAIR 到白色一樓的位置（f766～f770 已經在 SegL1.js 的 drop 裡）；南側這段原本沒有建物資料
  drop: ['f771', 'f772', 'f773', 'f774'],
  ownSign: ['7-Eleven'],
  lots: [
    // ---- 北側（靠 469 巷）----
    [R, 369.6, 379.6, 1, one({ gf: 4.2, d: 13, wall: '#d9d2c0', ground: 'shutter', sh: '#2f5f9a', noband: true, roofCol: '#d4d6d4', bikes: 1 })],          // 多多嗨（招牌、磚柱、石階在 custom）
    [R, 379.6, 386.0, 1, one({ gf: 4.0, d: 13, wall: '#e8e6e0', sign: ['春園快餐', '#ead9b0', '#c8281e', '(03) 461-1981　461-1305'], ground: 'shop', roofCol: '#d4d6d4' })],
    [R, 386.0, 395.8, 1, one({ gf: 3.8, d: 12, wall: '#f0efea', ground: 'shop', noband: true, roofCol: '#4f6b58', bikes: 1 })],                 // 7-ELEVEN（門楣的三色條與標誌在 custom）
    [R, 395.8, 400.6, 1, one({ gf: 3.8, d: 13, wall: '#a9a8a2', sign: ['馬丘', '#efe6cf', '#7a4a2a', '自助桌遊'], ground: 'shop', roofCol: '#4f6b58', bikes: 1 })],
    [R, 400.6, 405.6, 1, one({ gf: 3.6, d: 12, wall: '#e8e6e0', ground: 'shutter', sh: '#3d566e', noband: true, roofCol: '#5a5d60' })],
    [R, 405.6, 410.4, 1, { nf: 2, gf: 3.4, d: 12, set: 6.7, wall: '#eeece4', ground: 'shutter', sh: '#e2d3a8', noband: true, bal: 'grille', roof: 'tank', door: 0, bikes: 1 }], // 良任（比兩邊退後一點；一樓與招牌在 custom）
    [R, 410.4, 415.4, 1, one({ gf: 3.2, d: 12, set: 6.6, wall: '#8e8e8a', ground: 'shutter', sh: '#a8a8a4', noband: true, roofCol: '#55585c', bikes: 1 })],              // 石片柱鐵捲門
    [R, 415.4, 419.9, 1, one({ gf: 3.4, d: 12, wall: '#6a6c6f', ground: 'shutter', sh: '#a9a69f', noband: true, roofCol: '#c9c9c4', bikes: 1 })],              // 屋頂有深灰格柵圍屏
    [R, 419.9, 424.5, 1, one({ gf: 3.1, d: 12, wall: '#f2f1ec', ground: 'shop', noband: true, roofCol: '#b9cbb0' })],                                        // 加一減一
    [R, 424.5, 430.2, 1, one({ gf: 3.3, d: 12, wall: '#e6e4dc', ground: 'shutter', sh: '#b8b2a4', noband: true, roofCol: '#d4d6d4', door: 1, bikes: 1 })],   // 白色一樓
    // ---- 南側 ----
    [R, 370.4, 375.1, -1, one({ gf: 3.0, d: 12, wall: '#cfc6ae', ground: 'shutter', sh: '#b9ab93', noband: true, roofCol: '#8f9aa0', bikes: 1 })],            // 米色鐵捲門鐵皮屋
    [R, 375.1, 379.2, -1, one({ gf: 3.2, d: 12, wall: '#e4e0d4', ground: 'open', noband: true, roofCol: '#d9cfae' })],                                       // 夾娃娃機店
    [R, 379.2, 383.6, -1, one({ gf: 3.2, d: 12, wall: '#e4e0d4', ground: 'shutter', sh: '#3f6f8f', noband: true, roofCol: '#d9cfae' })],                     // 囍勒烤
    [R, 383.6, 387.3, -1, one({ gf: 3.2, d: 12, wall: '#ecebe6', ground: 'open', noband: true, roofCol: '#d9cfae' })],                                       // 光頭叔叔の簡單麵包店
    [R, 391.2, 395.7, -1, one({ gf: 3.3, d: 14, wall: '#ecebe6', ground: 'open', noband: true, roofCol: '#9fb0a0' })],                                       // 便宜租車
    [R, 395.7, 399.6, -1, one({ gf: 3.2, d: 14, wall: '#e4e0d4', ground: 'open', noband: true, roofCol: '#b9cbb0', bikes: 1 })],                             // 八方來
    [R, 399.6, 404.1, -1, one({ gf: 3.2, d: 14, wall: '#7a5236', ground: 'shop', noband: true, roofCol: '#e8e8e4' })],                                       // 韓老爺
    [R, 404.1, 408.1, -1, one({ gf: 3.2, d: 14, wall: '#d8d4cc', sign: ['憶阿嬤', '#8f2630', '#ffffff'], ground: 'shutter', sh: '#3f78b5', roofCol: '#b9cbb0' })],
    [R, 408.1, 412.3, -1, one({ gf: 3.3, d: 14, wall: '#cfcdc6', ground: 'shop', noband: true, roofCol: '#e8e8e4' })],                                       // PPLAN BEE
    [R, 412.3, 416.8, -1, { nf: 2, gf: 3.3, fh: 3.1, d: 14, set: 5.4, wall: '#b9bcbb', ground: 'open', bal: 'grille', noband: true, roof: 'tin', door: 0, bikes: 1 }],   // 銀灰浪板 2 樓雜貨店
    [R, 416.8, 420.5, -1, { nf: 2, gf: 3.2, fh: 2.8, d: 14, set: 5.4, wall: '#cfc9b6', ground: 'shutter', sh: '#a39e94', bal: 'grille', noband: true, roof: 'tin', door: 0, bikes: 1 }], // 米色浪板 2 樓
    [R, 420.5, 424.8, -1, one({ gf: 3.0, d: 14, wall: '#d6ccb0', ground: 'shutter', sh: '#2f6fb0', noband: true, roofCol: '#b8a36a' })],                                 // 紅茶洋行（簷下布條在 custom）
    [R, 424.8, 428.5, -1, one({ gf: 3.2, d: 14, wall: '#d8d4cc', sign: ['山東餃子館', '#7a3230', '#2a1614'], ground: 'shutter', sh: '#8f8d88', roofCol: '#5f7a66' })],
    [R, 428.5, 433.0, -1, one({ gf: 3.2, d: 14, wall: '#d8d4cc', ground: 'shutter', sh: '#6f6f72', noband: true, roofCol: '#5f7a66', bikes: 1 })],             // 日嚐麵飯館
  ],

  custom(C) {
    const { THREE, VC, FRONT, sg, paint, paintGeo, roundSign, bike, bikeCols } = C;
    const PI = Math.PI, NC = { col: false }, STEEL = '#4a4d50';
    // C.kit 會把寬度塞進 k.w，蓋掉 Kit 自己的 w()（區域→世界座標，碰撞要用），所以改放到 k.W
    const K = (s0, s1, side, set = SET) => { const k = C.kit(R, s0, s1, side, set), w = k.w; delete k.w; k.W = w; return k; };
    const addG = (k, g, hex) => k._part(VC, paintGeo(g, hex));
    // 斜板：沿 z 傾斜（從 (z0,y0) 斜到 (z1,y1)）／沿 x 傾斜
    const slopeZ = (k, x0, x1, z0, y0, z1, y1, th, hex) => { const dz = z1 - z0, dy = y1 - y0, g = new THREE.BoxGeometry(x1 - x0, th, Math.hypot(dz, dy)); g.rotateX(-Math.atan2(dy, dz)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return addG(k, g, hex); };
    const slopeX = (k, x0, y0, x1, y1, z0, z1, th, hex) => { const dx = x1 - x0, dy = y1 - y0, g = new THREE.BoxGeometry(Math.hypot(dx, dy), th, z1 - z0); g.rotateZ(Math.atan2(dy, dx)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return addG(k, g, hex); };
    // 面向街道的招牌板（y0 是下緣；legs 是板子下面鐵架腳的高度）
    const board = (k, tex, bw, bh, xc, y0, z = -0.06, legs = 0, em = 0.3) => {
      k.box(xc - bw / 2, xc + bw / 2, y0, y0 + bh, z, z + 0.1, STEEL, NC);
      k.plane(tex, bw, bh, xc, y0 + bh / 2, z - 0.012, FRONT, { emissive: em });
      if (legs) for (const x of [xc - bw / 2 + 0.25, xc + bw / 2 - 0.25]) { k.box(x - 0.04, x + 0.04, y0 - legs, y0, z + 0.02, z + 0.1, STEEL, NC); k.box(x - 0.03, x + 0.03, y0 - legs, y0 + bh * 0.7, z + 0.1, z + 1.3, STEEL, NC); }
    };
    // 垂直於路的側招（兩面都有字，zc 是板子中心離立面的距離，負的是伸到街上）
    const flag = (k, tex, fw, fh, x, yc, zc, o = {}) => {
      k.box(x - 0.035, x + 0.035, yc - fh / 2, yc + fh / 2, zc - fw / 2, zc + fw / 2, o.edge || '#e8e6e0', NC);
      for (const sd of [-1, 1]) k.plane(tex, fw, fh, x + sd * 0.045, yc, zc, sd * PI / 2, { emissive: o.em ?? 0.3, transparent: !!o.transparent });
    };
    // 店面前緣的鐵皮屋簷：實景的招牌都立在屋簷前緣（離中心線約 5.2 m），鐵捲門在屋簷後面約 1 m
    const eave = (k, y, hex = '#b9bcbb', out = 1.0) => k.box(-0.05, k.W + 0.05, y, y + 0.1, -out, 0, hex, NC);
    const EZ = -1.06;                                                  // 立在屋簷前緣的招牌板的 z
    const disc2 = (k, tex, dia, x, yc, zc) => { for (const sd of [-1, 1]) k.plane(tex, dia, dia, x + sd * 0.03, yc, zc, sd * PI / 2, { transparent: true, emissive: 0.3 }); };
    const carK = (k, x, z, hex) => {                                  // 垂直立面停著的車（方盒）
      k.box(x, x + 1.75, 0.28, 0.9, z, z + 4.2, hex);
      k.box(x + 0.12, x + 1.63, 0.9, 1.42, z + 0.9, z + 3.2, '#27303a', NC);
      for (const [a, b] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) k.box(x + 1.75 * a - 0.12, x + 1.75 * a + 0.12, 0, 0.55, z + 4.2 * b - 0.3, z + 4.2 * b + 0.3, '#1c1c1e', NC);
    };
    const pot = (k, x, z, h = 0.9) => { k.cyl(x, z, 0.2, 0, 0.4, '#8a5a40', { seg: 8 }); const g = new THREE.SphereGeometry(0.34, 7, 5); g.scale(1, h / 0.6, 1); g.translate(x, 0.4 + h * 0.5, z); addG(k, g, '#2f5f2c'); };

    // ---------- 貼圖 ----------
    const T = {
      corr: (hex, n = 28) => sg(`xzX4corr${hex}${n}`, 512, 32, (g) => { // 直紋浪板
        g.fillStyle = hex; g.fillRect(0, 0, 512, 32); const p = 512 / n;
        for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(i * p, 0, p * 0.3, 32); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(i * p + p * 0.6, 0, p * 0.25, 32); }
      }),
      disc: (hex, rim) => sg(`xzX4disc${hex}${rim || ''}`, 128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.fillStyle = rim || hex; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = hex; g.beginPath(); g.arc(64, 64, rim ? 54 : 62, 0, 7); g.fill(); }),
      ddh: () => sg('xzX4ddh', 1536, 160, (g) => {                    // 多多嗨：橘底、三組彩色卡通字、藍色泡泡與氣球
        g.fillStyle = '#f08a3c'; g.fillRect(0, 0, 1536, 160); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (let i = 0; i < 3; i++) {
          const x0 = 60 + i * 500;
          g.fillStyle = '#3a8fe0'; g.beginPath(); g.arc(x0 + 8, 80, 52, 0, 7); g.fill(); g.fillStyle = '#f6e9d2'; g.beginPath(); g.arc(x0 + 8, 86, 30, 0, 7); g.fill(); g.beginPath(); g.arc(x0 - 14, 58, 12, 0, 7); g.fill(); g.beginPath(); g.arc(x0 + 30, 58, 12, 0, 7); g.fill();
          [['多', '#4caf50'], ['多', '#2f7fd0'], ['嗨', '#f2d53c']].forEach(([t, c], j) => { g.font = FNT(118); g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeText(t, x0 + 130 + j * 118, 84); g.fillStyle = c; g.fillText(t, x0 + 130 + j * 118, 84); });
          [['#e8423a', 0], ['#f2d53c', 1], ['#4caf50', 2]].forEach(([c, j]) => { g.fillStyle = c; g.beginPath(); g.ellipse(x0 + 452 + (j - 1) * 20, 50 + (j % 2) * 26, 15, 19, 0, 0, 7); g.fill(); });
        }
      }),
      claw: () => sg('xzX4claw', 256, 160, (g) => {                   // 開放式店面裡的黃色夾娃娃機
        const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#6a665c'); gr.addColorStop(1, '#2a2824'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
        g.fillStyle = 'rgba(255,250,230,.95)'; for (let x = 16; x < 256; x += 84) g.fillRect(x, 8, 56, 6);
        for (let i = 0; i < 5; i++) { const x = 6 + i * 50; g.fillStyle = '#f2c81e'; g.fillRect(x, 50, 44, 110); g.fillStyle = '#bfe4f0'; g.fillRect(x + 4, 58, 36, 46); g.fillStyle = ['#e8423a', '#f08ab0', '#4caf50', '#3a8ac8', '#f2f2ee'][i]; g.fillRect(x + 8, 84, 28, 18); g.fillStyle = '#c89a12'; g.fillRect(x, 110, 44, 6); g.fillStyle = '#2a2a2a'; g.fillRect(x + 14, 122, 16, 12); }
      }),
      xile: () => sg('xzX4xile', 672, 208, (g) => {                   // 囍勒烤：白底、紅色雙線回紋框、黑字，中間紅圓「囍」
        g.fillStyle = '#f8f6f0'; g.fillRect(0, 0, 672, 208); g.strokeStyle = '#c8281e'; g.lineWidth = 6; g.strokeRect(8, 8, 656, 192); g.lineWidth = 3; g.strokeRect(20, 20, 632, 168);
        for (const [x, y] of [[20, 20], [628, 20], [20, 164], [628, 164]]) g.strokeRect(x, y, 24, 24);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1a1a1a'; g.font = FNT(140); g.fillText('勒', 170, 110); g.fillText('烤', 502, 110);
        g.fillStyle = '#c8281e'; g.beginPath(); g.arc(336, 104, 72, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.font = FNT(96); g.fillText('囍', 336, 110);
      }),
      rent: () => sg('xzX4rent', 576, 336, (g) => {                   // 便宜租車：上半汽車照片（灰藍底）、下半白底紅字與電話
        const gr = g.createLinearGradient(0, 0, 0, 150); gr.addColorStop(0, '#8fa3b8'); gr.addColorStop(1, '#5f7388'); g.fillStyle = gr; g.fillRect(0, 0, 576, 150);
        for (const [x, c] of [[150, '#e8e8e4'], [330, '#b02a2a'], [480, '#2a2a30']]) { g.fillStyle = c; g.beginPath(); g.roundRect(x - 70, 78, 140, 40, 14); g.fill(); g.beginPath(); g.roundRect(x - 44, 50, 88, 40, 16); g.fill(); g.fillStyle = '#1c1c1e'; g.beginPath(); g.arc(x - 40, 120, 15, 0, 7); g.arc(x + 40, 120, 15, 0, 7); g.fill(); }
        g.fillStyle = '#2f6fd0'; g.beginPath(); g.arc(46, 80, 30, 0, 7); g.fill(); g.fillStyle = '#f4c8a8'; g.beginPath(); g.arc(46, 70, 16, 0, 7); g.fill();
        g.fillStyle = '#fbfbf8'; g.fillRect(0, 150, 576, 186); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d8232a'; g.font = FNT(112); g.fillText('便宜租車', 288, 218); g.font = FNT(48); g.fillText('(03) 451-7856', 288, 300);
      }),
      han: () => sg('xzX4han', 576, 320, (g) => {                     // 韓老爺：白底、紅色筆刷、黑色毛筆字
        g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 576, 320); g.fillStyle = '#c8281e'; g.beginPath(); g.ellipse(300, 96, 200, 34, -0.08, 0, 7); g.fill();
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#141414'; g.font = SERIF(150); g.fillText('韓老爺', 276, 140);
        g.font = FNT(40); g.fillText('台式拌麵', 470, 232); g.font = FNT(26, 700); g.fillText('Since 2020', 86, 36); g.font = FNT(28, 700); g.fillText('中壢中原店 03-4626889', 288, 290);
      }),
      bee: () => sg('xzX4bee2', 672, 208, (g) => {                     // PPLAN BEE 小小蜜蜂手工豆花：黃底黑字、六角形標誌、白色蜂巢線
        g.fillStyle = '#f2c935'; g.fillRect(0, 0, 672, 208); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4;
        const hex = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = PI / 6 + i * PI / 3; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); };
        for (const [x, y] of [[560, 60], [612, 90], [560, 120], [612, 150], [508, 90]]) { hex(x, y, 30); g.stroke(); }
        g.fillStyle = '#1a1a1a'; hex(78, 80, 46); g.fill(); g.fillStyle = '#f2c935'; g.fillRect(56, 68, 44, 8); g.fillRect(56, 86, 44, 8);
        g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = FNT(84); g.fillText('PPLAN BEE', 140, 78); g.font = FNT(42); g.fillText('小小蜜蜂手工豆花', 142, 158); g.font = FNT(22, 700); g.textAlign = 'right'; g.fillText('豆花・剉冰・甜湯・飲品', 660, 186);
      }),
      godz: () => sg('xzX4godz3', 736, 544, (g) => {                   // 日嚐麵飯館大看板：左邊黑色毛筆字與三個圓，右邊淺色底上一隻深灰藍色恐龍捧一大碗炒飯
        g.fillStyle = '#f4f5f3'; g.fillRect(0, 0, 736, 544); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#141414'; g.font = SERIF(170); g.fillText('日', 100, 130); g.fillText('嚐', 100, 310);
        [['麵', '#c8281e', '#ffffff'], ['飯', '#c8281e', '#ffffff'], ['館', '#f4f5f3', '#141414']].forEach(([t, bg, fg], i) => { g.fillStyle = bg; g.beginPath(); g.arc(238, 96 + i * 112, 48, 0, 7); g.fill(); if (i === 2) { g.strokeStyle = '#141414'; g.lineWidth = 4; g.stroke(); } g.fillStyle = fg; g.font = FNT(60); g.fillText(t, 238, 100 + i * 112); });
        g.fillStyle = '#141414'; g.font = FNT(66); g.fillText('delicious!', 190, 486);
        g.fillStyle = '#4a5a66'; g.beginPath(); g.ellipse(600, 300, 120, 200, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(540, 110, 96, 70, -0.25, 0, 7); g.fill(); g.beginPath(); g.ellipse(462, 132, 56, 34, -0.15, 0, 7); g.fill();
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(650 + i * 8, 60 + i * 66); g.lineTo(730, 78 + i * 66); g.lineTo(664 + i * 8, 122 + i * 66); g.closePath(); g.fill(); }
        g.fillStyle = '#7d8c96'; g.beginPath(); g.ellipse(590, 330, 70, 130, 0, 0, 7); g.fill();
        g.fillStyle = '#c8342c'; g.beginPath(); g.ellipse(476, 140, 40, 14, -0.15, 0, 7); g.fill();                                     // 張開的嘴
        g.fillStyle = '#fbfaf6'; g.beginPath(); g.arc(528, 88, 11, 0, 7); g.fill(); g.fillStyle = '#141414'; g.beginPath(); g.arc(526, 88, 5, 0, 7); g.fill();
        g.fillStyle = '#e8b040'; g.beginPath(); g.ellipse(500, 350, 126, 70, 0, PI, 0); g.fill();                                       // 炒飯
        const rr = [[430, 318], [470, 300], [520, 296], [560, 312], [500, 326], [452, 338], [544, 336]]; rr.forEach(([x, y], i) => { g.fillStyle = ['#5fae4a', '#e8423a', '#f4f2ea'][i % 3]; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
        g.fillStyle = '#f4f2ea'; g.beginPath(); g.ellipse(500, 350, 132, 84, 0, 0, PI); g.fill(); g.strokeStyle = '#3a6fb0'; g.lineWidth = 6; g.beginPath(); g.ellipse(500, 352, 128, 20, 0, 0, PI); g.stroke();
      }),
      shandong: () => sg('xzX4shandong', 384, 256, (g) => {           // 山東餃子館屋頂燈箱：紅底、黑色大字橫書、下排白色電話
        g.fillStyle = '#c8342c'; g.fillRect(0, 0, 384, 256); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#161616'; g.font = SERIF(72); g.fillText('山東餃子館', 192, 100);
        g.fillStyle = '#f2d21f'; g.fillRect(14, 168, 44, 56); g.fillStyle = '#ffffff'; g.font = FNT(50); g.fillText('(03)455-5962', 218, 198);
      }),
      tea: () => sg('xzX4tea', 256, 320, (g) => {                     // 紅茶洋行側招：紅底、白色圓形人像、白字
        g.fillStyle = '#c23a3a'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#fbfaf6'; g.beginPath(); g.arc(128, 96, 70, 0, 7); g.fill();
        g.fillStyle = '#c23a3a'; g.beginPath(); g.arc(128, 80, 24, 0, 7); g.fill(); g.beginPath(); g.ellipse(128, 136, 38, 26, 0, PI, 0); g.fill();
        g.fillStyle = '#fbfaf6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FNT(56); g.fillText('紅茶洋行', 128, 216); g.font = FNT(24, 700); g.fillText('大大杯紅茶小賣所', 128, 276);
      }),
      sevenBand: () => sg('xzX4sevenBand', 1536, 128, (g) => {       // 7-ELEVEN 門楣：白底、橘綠紅三色條，中間與西段各一塊白底標誌（實景門楣上沒有「7-ELEVEN」大字）
        g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 1536, 128);
        g.fillStyle = '#f26b21'; g.fillRect(0, 22, 1536, 22); g.fillStyle = '#00843d'; g.fillRect(0, 52, 1536, 24); g.fillStyle = '#e2231a'; g.fillRect(0, 84, 1536, 22);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const x of [560, 1260]) {
          g.fillStyle = '#fbfbf8'; g.fillRect(x - 120, 0, 240, 128);
          g.fillStyle = '#f26b21'; g.beginPath(); g.moveTo(x - 44, 10); g.lineTo(x + 44, 10); g.lineTo(x + 44, 34); g.lineTo(x + 12, 100); g.lineTo(x - 18, 100); g.lineTo(x + 12, 36); g.lineTo(x - 44, 36); g.closePath(); g.fill();
          g.fillStyle = '#e2231a'; g.fillRect(x - 44, 10, 88, 10);
          g.fillStyle = '#fbfbf8'; g.fillRect(x - 70, 52, 140, 30); g.fillStyle = '#00843d'; g.font = FNT(30); g.fillText('ELEVEn', x, 68);
        }
      }),
      seven: () => sg('xzX4seven', 128, 128, (g) => {                 // 7-ELEVEN 立柱招牌：綠框白底、橘紅色 7
        g.fillStyle = '#00843d'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffffff'; g.fillRect(10, 10, 108, 108);
        g.fillStyle = '#f26b21'; g.beginPath(); g.moveTo(30, 26); g.lineTo(98, 26); g.lineTo(98, 44); g.lineTo(70, 104); g.lineTo(48, 104); g.lineTo(74, 46); g.lineTo(30, 46); g.closePath(); g.fill();
        g.fillStyle = '#e2231a'; g.fillRect(30, 26, 68, 8); g.fillStyle = '#00843d'; g.fillRect(24, 64, 80, 12);
      }),
      clock: () => sg('xzX4clock', 128, 128, (g) => {                 // 白面黑框圓鐘
        g.clearRect(0, 0, 128, 128); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = '#f8f8f4'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill();
        g.strokeStyle = '#1a1a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 26); g.moveTo(64, 64); g.lineTo(90, 76); g.stroke();
        for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.fillRect(64 + Math.cos(a) * 44 - 2, 64 + Math.sin(a) * 44 - 2, 4, 4); }
      }),
      shopW: () => sg('xzX4shopW', 256, 160, (g) => {                 // 白框落地玻璃（加一減一）
        g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, 256, 160);
        for (let i = 0; i < 3; i++) { const gr = g.createLinearGradient(0, 8, 0, 152); gr.addColorStop(0, '#f1dfb4'); gr.addColorStop(1, '#8f8a78'); g.fillStyle = gr; g.fillRect(8 + i * 83, 8, 75, 144); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(12 + i * 83, 12, 18, 136); }
      }),
      wood: () => sg('xzX4wood', 256, 160, (g) => {                   // 木框玻璃門與木紋牆（韓老爺）
        g.fillStyle = '#7a5236'; g.fillRect(0, 0, 256, 160); for (let x = 0; x < 256; x += 16) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x, 0, 2, 160); }
        for (const x of [118, 178]) { const gr = g.createLinearGradient(0, 22, 0, 150); gr.addColorStop(0, '#d8c8a0'); gr.addColorStop(1, '#4a4034'); g.fillStyle = gr; g.fillRect(x, 22, 52, 130); }
        g.fillStyle = '#1a1a1a'; g.fillRect(8, 2, 240, 16); g.fillStyle = '#e8e2d0'; for (let x = 20; x < 240; x += 26) { g.beginPath(); g.arc(x, 10, 6, 0, 7); g.fill(); }
        g.fillStyle = '#a8573f'; g.fillRect(4, 104, 100, 56); g.fillStyle = '#bfe4f0'; g.fillRect(8, 66, 92, 38); g.fillStyle = '#f4f3ee'; g.fillRect(236, 30, 14, 110);   // 東半紅磚矮檯與菜櫃、西端白色直布條
      }),
      eatery: () => sg('xzX4eatery', 256, 128, (g) => {               // 春園快餐店面：深色鋁框玻璃、裡面暗暗的，下半截藍色波浪貼皮，門在東側
        g.fillStyle = '#2e3134'; g.fillRect(0, 0, 256, 128);
        for (let i = 0; i < 4; i++) { const gr = g.createLinearGradient(0, 6, 0, 84); gr.addColorStop(0, '#6a665c'); gr.addColorStop(1, '#3a3834'); g.fillStyle = gr; g.fillRect(6 + i * 62, 6, 56, i === 3 ? 118 : 78); }
        g.fillStyle = 'rgba(255,240,200,.5)'; for (const x of [18, 80, 142]) g.fillRect(x, 14, 30, 4);
        g.fillStyle = '#2f6fc0'; g.fillRect(0, 86, 188, 42); g.strokeStyle = '#8fc0f0'; g.lineWidth = 4;
        for (const y of [98, 112]) { g.beginPath(); for (let x = 0; x <= 188; x += 4) g[x === 0 ? 'moveTo' : 'lineTo'](x, y + Math.sin(x / 9) * 4); g.stroke(); }
      }),
      frost: () => sg('xzX4frost', 256, 160, (g) => {                 // 深灰鋁框霧面玻璃拉門（馬丘）
        g.fillStyle = '#8f8f8a'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#3a3c3f'; g.fillRect(10, 6, 236, 154);
        for (let i = 0; i < 4; i++) { const gr = g.createLinearGradient(0, 12, 0, 156); gr.addColorStop(0, '#b9c2c4'); gr.addColorStop(1, '#7d8688'); g.fillStyle = gr; g.fillRect(16 + i * 58, 12, 50, 144); }
      }),
      lr2f: () => sg('xzX4lr2f', 256, 80, (g) => {                    // 良任二樓：整排白色格子窗框、淺綠色玻璃
        g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, 256, 80);
        for (let i = 0; i < 4; i++) { g.fillStyle = '#b9d2c8'; g.fillRect(6 + i * 62, 8, 58, 64); g.strokeStyle = '#f2f1ec'; g.lineWidth = 2; for (let x = 1; x < 5; x++) { g.beginPath(); g.moveTo(6 + i * 62 + x * 11.6, 8); g.lineTo(6 + i * 62 + x * 11.6, 72); g.stroke(); } for (let y = 1; y < 4; y++) { g.beginPath(); g.moveTo(6 + i * 62, 8 + y * 16); g.lineTo(64 + i * 62, 8 + y * 16); g.stroke(); } }
      }),
      lr1f: () => sg('xzX4lr1f2', 256, 144, (g) => {                   // 良任一樓：米黃牆、中間深色鋁框玻璃門、兩側各一扇窗
        g.fillStyle = '#e2d3a8'; g.fillRect(0, 0, 256, 144);
        for (const [x, y, w, h] of [[98, 30, 60, 114], [12, 30, 76, 96], [168, 30, 68, 96]]) { g.fillStyle = '#4a4d50'; g.fillRect(x - 4, y - 4, w + 8, h + 8); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#5f6f70'); gr.addColorStop(1, '#2f3a3c'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
        g.fillStyle = '#4a4d50'; g.fillRect(126, 30, 4, 114);
      }),
      dark: () => sg('xzX4dark', 256, 144, (g) => {                   // 淺灰清水模牆＋黑框落地玻璃門（PPLAN BEE）
        g.fillStyle = '#cfcdc6'; g.fillRect(0, 0, 256, 144); g.fillStyle = '#1a1a1a'; g.fillRect(70, 8, 150, 136);
        for (const x of [76, 148]) { const gr = g.createLinearGradient(0, 14, 0, 140); gr.addColorStop(0, '#6a6458'); gr.addColorStop(1, '#2a2824'); g.fillStyle = gr; g.fillRect(x, 14, 66, 128); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 4, 18, 14, 120); }
        g.fillStyle = '#1a1a1a'; g.fillRect(30, 70, 24, 6); g.fillRect(30, 82, 24, 4);
      }),
      lattice: () => sg('xzX4lattice', 128, 128, (g) => {             // 鐵捲門下的菱格鋁拉門
        g.fillStyle = '#b8b2a4'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#7f7b70'; g.lineWidth = 3;
        for (let i = -128; i < 256; i += 20) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 128, 0); g.stroke(); }
      }),
      betel: () => sg('xzX4betel', 128, 192, (g) => {                 // 門口立牌：紅字檳榔、藍字菸酒
        g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 128, 192); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FNT(54); g.fillStyle = '#d8232a'; g.fillText('檳榔', 64, 54); g.fillStyle = '#2a4fb0'; g.fillText('菸酒', 64, 138);
      }),
      brick: () => sg('xzX4brick', 128, 64, (g) => {                  // 紅磚牆
        g.fillStyle = '#9a4a38'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#c9b8a8';
        for (let y = 0; y < 64; y += 8) { g.fillRect(0, y, 128, 1); for (let x = (y / 8) % 2 ? 8 : 0; x < 128; x += 16) g.fillRect(x, y, 1, 8); }
      }),
    };
    const openClaw = (k) => k.plane(T.claw(), k.W - 0.5, 2.2, k.W / 2, 1.1, -0.045, FRONT, { emissive: 0.45 });
    // 一樓鐵皮屋的屋頂顏色（lots 的 roofCol 被外殼的灰色屋頂板蓋住，這裡再鋪一層）
    for (const [, s0, s1, side, sp] of this.lots) if (sp.nf === 1 && sp.roofCol) { const k = K(s0, s1, side, sp.set); k.box(-0.15, k.W + 0.15, sp.gf + 0.12, sp.gf + 0.17, -0.4, sp.d, sp.roofCol, NC); }

    // ================= 北側 =================
    { // N0：469 巷口西北轉角露天停車場靠新中北路這側（柏油地、路邊一排橘色防撞桿、停著的車；靠巷子那側與欄杆在 SegL1.js）
      const k = K(356, 369.6, 1, 5.3);
      k.prism([[2.8, 0], [13.5, 0], [13.5, 10.2]], -0.6, 0.03, '#55565a', { shadow: false });
      k.prism([[0.3, 0.9], [3.2, 0.9], [0.3, 3.8]], -0.6, 0.03, '#55565a', { shadow: false });                     // 轉角尖端（L1 的停車場南邊）實景也是柏油，不是草地
      for (let x = 1.2; x < 13.6; x += 1.55) { k.cyl(x, -0.15, 0.06, 0, 0.8, '#e8742a', { seg: 8 }); k.cyl(x, -0.15, 0.065, 0.5, 0.62, '#f2f2ee', { seg: 8 }); }
      carK(k, 11.2, 0.7, '#f0f0ec'); carK(k, 8.6, 0.9, '#e8e8e4');
    }
    { // N1：多多嗨（米白小口磚方柱、兩片藍鐵捲門、橘色卡通招牌、門口石階；東牆是深綠色浪板）
      const k = K(369.6, 379.6, 1), w = k.W;
      for (const [x0, x1] of [[0, 0.7], [5.9, 6.6], [9.0, 9.7]]) k.box(x0, x1, 0, 3.25, -0.2, 0, 'wall#d9d2c0', NC);
      k.box(9.7, w, 0, 3.25, -0.12, 0, '#f0efea', NC);
      k.box(0, w, 3.2, 4.2, -0.32, 0, '#f08a3c', NC); k.plane(T.ddh(), w - 0.1, 0.96, w / 2, 3.7, -0.335, FRONT, { emissive: 0.35 });
      k.box(1.6, 5.0, 0, 0.18, -1.15, 0, '#a9a7a0', NC); k.box(1.9, 4.7, 0.18, 0.36, -0.8, 0, '#b4b2ab', NC);
      k.plane(T.corr('#3f6b52', 60), 13, 3.2, -0.04, 1.6, 6.5, -PI / 2);
      k.plane(T.ddh(), 9, 0.9, -0.05, 3.72, 4.6, -PI / 2, { emissive: 0.3 });                                   // 橘色招牌帶轉到東牆上緣（從 469 巷口看得到）
      slopeX(k, -1.3, 2.9, -0.02, 3.3, 1, 12.5, 0.06, '#a9c9a0');                                             // 東側沿停車場的淺綠色雨遮
      for (const [x, z] of [[2.5, 3], [7.5, 3], [2.5, 7], [7.5, 7], [2.5, 11], [7.5, 11]]) k.cyl(x, z, 0.28, 4.2, 4.6, '#c9ccd0', { seg: 8 }); // 屋頂通風球
    }
    { // N2：春園快餐（深色鋁框玻璃店面、下半截藍色波浪貼皮、冷氣室外機、屋頂西端的鐵架立招）
      const k = K(379.6, 386.0, 1), w = k.W;
      k.plane(T.eatery(), w - 0.3, 3.0, w / 2, 1.5, -0.045, FRONT, { emissive: 0.15 });
      for (const x of [w - 1.95, w - 1.2]) { k.box(x, x + 0.6, 0, 1.7, -0.75, -0.3, '#e4e1d8', NC); k.box(x + 0.05, x + 0.55, 1.05, 1.6, -0.76, -0.74, '#8a8d90', NC); } // 西端兩台直立式冷氣室外機
      k.box(0.3, 0.85, 0, 1.3, -0.9, -0.82, '#c8281e', NC);                                                   // 門口的紅色直立小牌（字看不清）
      // 屋頂西端的鐵架立招：垂直於路、兩面都有字，頂離地約 6.5 m
      for (const z of [0.5, 2.5]) k.box(w - 0.95, w - 0.85, 4.0, 6.5, z - 0.05, z + 0.05, STEEL, NC);
      flag(k, paint('春園快餐', '#fbf3f0', '#c8281e', null, 2.4, 1.5), 2.4, 1.5, w - 0.9, 5.7, 1.5);
    }
    { // N3：7-ELEVEN（門口一整排垂直停的機車、盆栽、屋頂東端的方形立柱招牌）
      const k = K(386.0, 395.8, 1), w = k.W;
      k.box(0.05, w - 0.05, 2.95, 3.77, -0.28, 0, '#fbfbf8', NC); k.plane(T.sevenBand(), w - 0.15, 0.8, w / 2, 3.36, -0.29, FRONT, { emissive: 0.35 });
      for (let x = 2.3, i = 0; x < w - 0.3; x += 0.74, i++) if (i !== 3 && i !== 4) bike(k, x, -1.9, 1, bikeCols[(i * 5 + 1) % 6]);
      pot(k, 3.9, -0.5); pot(k, 5.4, -0.5);
      for (let x = 6.4; x < w - 0.5; x += 0.55) k.box(x, x + 0.5, 0, 0.75, -0.55, -0.15, '#2f6db3', NC);       // 西段玻璃前的藍色飲料籃
      k.box(1.25, 1.39, 3.8, 5.3, 0.6, 0.74, '#c9ccd0', NC);
      for (const sd of [-1, 1]) k.plane(T.seven(), 1.2, 1.2, 1.32 + sd * 0.1, 5.9, 0.67, sd * PI / 2, { emissive: 0.4 });
      k.box(1.24, 1.4, 5.3, 6.5, 0.07, 1.27, '#00843d', NC);
      k.box(6.4, w - 0.6, 2.32, 2.74, -0.34, -0.3, '#a8d4f0', NC);                                              // 門楣西段下方的淺藍色橫布條（字看不清）
      for (const x of [0.25, 0.95]) k.box(x, x + 0.6, 0, 1.5, -0.7, -0.3, '#e4e1d8', NC);                       // 東端的直立式冷氣室外機
    }
    { // N4：馬丘自助桌遊（灰石牆、門口三階洗石子階梯、東端牆角的圓形側招）
      const k = K(395.8, 400.6, 1), w = k.W;
      k.box(0.3, w - 0.3, 0, 0.17, -1.2, 0, '#a3a19b', NC); k.box(0.45, w - 0.45, 0.17, 0.34, -0.85, 0, '#aeaca6', NC); k.box(0.6, w - 0.6, 0.34, 0.5, -0.5, 0, '#b9b7b0', NC);
      k.plane(T.frost(), w - 0.3, 2.3, w / 2, 1.65, -0.045, FRONT);
      disc2(k, roundSign('馬丘', '#efe6cf', '#7a4a2a'), 1.2, 0.1, 3.7, -0.75);
      k.cyl(w - 0.1, -0.95, 0.16, -0.5, 9, '#a9a7a0', { seg: 8, col: true }); for (let i = 0; i < 4; i++) k.cyl(w - 0.1, -0.95, 0.165, 0.4 + i * 0.3, 0.55 + i * 0.3, i % 2 ? '#1e1e1e' : '#e8c02a', { seg: 8 }); // 與 ZU'S HAIR 交界前的電線桿
      k.plane(T.disc('#d8232a'), 0.42, 0.42, w - 0.55, 3.2, -0.305, FRONT, { transparent: true });           // 招牌右上角的紅色 24hr 小圓標
      k.plane(paint('24hr', '#d8232a', '#ffffff', null, 0.3, 0.16, 256), 0.3, 0.16, w - 0.55, 3.2, -0.31, FRONT);
    }
    { // N5：ZU'S HAIR（西端黑色燈柱上的兩個圓鐘、門口盆栽；後面退縮的灰色水泥 2 樓）
      const k = K(400.6, 405.6, 1), w = k.W;
      k.box(0.05, w - 0.05, 2.7, 3.57, -0.28, 0, '#1f2a2a', NC);                                              // 深墨綠門楣：字在東邊，西端留給兩個圓鐘
      k.plane(paint('ZU\'S HAIR', '#1f2a2a', '#ffffff', null, w - 1.9, 0.8), w - 1.9, 0.8, (w - 1.7) / 2, 3.14, -0.29, FRONT, { emissive: 0.35 });
      k.cyl(w - 0.82, -0.5, 0.05, 0, 3.5, '#1c1c1e', { seg: 8 });
      for (const x of [w - 0.45, w - 1.2]) k.plane(T.clock(), 0.72, 0.72, x, 3.15, -0.52, FRONT, { transparent: true, emissive: 0.3 }); // 兩個圓鐘並排在招牌西端
      pot(k, 0.6, -0.5); pot(k, 1.3, -0.55, 0.7); pot(k, 3.6, -0.5, 1.1);
      k.box(0.2, w - 0.2, 3.6, 9.3, 5, 12, '#8f8f88', NC); k.box(0.1, w - 0.1, 9.3, 9.42, 4.9, 12.1, '#7d7d77', NC);                 // 實景是灰色 3 樓
      for (const y of [5.1, 7.9]) k.plane(C.YHT.win(), 1.4, 1.1, w / 2, y, 4.97, FRONT); k.box(1.0, 1.8, 4.2, 4.7, 4.6, 5.0, '#e4e1d8', NC);
    }
    { // N6：良任 足體保健（一樓米黃牆與玻璃門、一二樓之間的紅色橫招、二樓東端的紅色直立招牌、門口立牌）
      const k = K(405.6, 410.4, 1, 6.7), w = k.W;
      k.plane(T.lr1f(), w - 0.3, 2.4, w / 2, 1.2, -0.045, FRONT);
      k.box(0.12, w - 0.12, 3.9, 6.4, -0.05, 0, '#eeece4', NC); k.plane(T.lr2f(), w - 0.5, 1.35, w / 2, 5.25, -0.06, FRONT); // 二樓實景是白牆與整排格子窗
      board(k, paint('良任', '#d8344a', '#ffffff', '足體保健・全身推拿', w - 0.2, 1.3), w - 0.2, 1.3, w / 2, 2.6, -0.2);
      flag(k, C.ROWT.vert('xzX4liangren', '#d8344a', '#ffffff', '良任足體養生'), 0.9, 3.0, 0.2, 5.6, -0.6, { edge: '#d8344a' });
      k.box(3.2, 3.7, 0, 1.0, -1.3, -1.24, '#d8232a', NC);
    }
    { // N7：石片柱鐵捲門（兩根深灰文化石方柱往前凸、西側凹進去的門廊、往路邊斜下的鐵皮雨遮；後面高出一截灰藍色 2 樓牆）
      const k = K(410.4, 415.4, 1, 6.6), w = k.W;
      for (const x of [0, 2.9]) k.box(x, x + 0.7, 0, 2.7, -1.0, 0, '#77777a', NC);
      k.box(3.6, w, 0, 2.7, -0.04, 0, '#3a3c3f', NC); k.box(3.9, 4.7, 0, 2.1, -0.07, -0.04, '#4a3a2a', NC);     // 門廊與深色鐵花門
      k.box(w - 0.3, w, 0, 2.7, -1.0, 0, '#d8d6cf', NC);
      slopeZ(k, -0.05, w + 0.05, -1.3, 2.65, 0.3, 3.2, 0.06, '#b9bcbb');
      k.box(0, w, -0.4, 0.045, -2.2, 0, '#55565a', NC);                                                       // 深灰色石板鋪面
      k.box(0.1, w - 0.1, 3.2, 6.0, 4, 12, '#9aa3ad', NC); k.box(1.2, 2.0, 6.0, 6.5, 6, 6.8, '#e4e1d8', NC);
    }
    { // N8：灰鐵捲門＋古銅色鐵花門，屋頂立一道深灰色水平格柵圍屏
      const k = K(415.4, 419.9, 1), w = k.W;
      k.box(0, 1.3, 0, 2.5, -0.04, 0, '#4a4c4f', NC); k.box(0.2, 1.1, 0, 2.15, -0.07, -0.04, '#6a4a2e', NC);
      for (const x of [0.12, 1.18]) k.box(x - 0.06, x + 0.06, 0.7, 2.0, -0.08, -0.07, '#c8281e', NC);           // 門旁的紅色春聯
      k.box(0, w, 2.5, 3.4, -0.12, 0, '#4a4c4f', NC);
      for (let i = 0; i < 5; i++) k.box(-0.1, w + 0.1, 3.56 + i * 0.26, 3.56 + i * 0.26 + 0.2, 0.2, 0.26, '#4f5357', NC);
      for (const x of [-0.05, w / 2, w + 0.05]) k.box(x - 0.04, x + 0.04, 3.4, 4.85, 0.26, 0.34, '#3a3d40', NC);
    }
    { // N9：加一減一（白框落地玻璃、屋簷上方整面橫招、西端牆角的圓形側招）
      const k = K(419.9, 424.5, 1), w = k.W;
      k.plane(T.shopW(), 3.1, 2.3, 1.75, 1.2, -0.045, FRONT, { emissive: 0.3 });
      k.plane(C.shutterTex('#a8a8a4'), 1.1, 1.2, w - 0.75, 1.7, -0.045, FRONT);
      board(k, paint('加一減一', '#d9d8cc', '#1a1a1a', '甜點・蛋糕・客製', 4.4, 1.5), 4.4, 1.5, w / 2, 3.1, -0.3);
      disc2(k, T.disc('#fbfaf6', '#1a1a1a'), 0.8, w - 0.1, 2.9, -0.75);
      pot(k, 0.5, -0.55, 1.2);
    }
    { // N10：白色一樓（東半米灰鐵捲門、下半露出菱格鋁拉門，西半白牆與門，簷口一片白色平雨遮；後面一棟白色 2 樓小屋）
      const k = K(424.5, 430.2, 1), w = k.W;
      k.plane(T.lattice(), 2.9, 0.9, 1.7, 0.45, -0.035, FRONT);
      k.box(3.3, 4.75, 0, 2.5, -0.06, 0, '#e6e4dc', NC);
      k.box(4.72, 4.8, 0.6, 1.9, -0.07, -0.05, '#c8281e', NC);
      k.box(3.5, 3.9, 1.2, 1.7, -0.14, -0.06, '#8a8d90', NC);
      k.box(-0.05, w + 0.05, 2.75, 2.85, -1.0, 0, '#f0efea', NC);
      k.box(0.6, w - 0.4, 3.3, 9.0, 8, 12, '#e4e3de', NC); k.box(0.5, w - 0.3, 9.0, 9.1, 7.9, 12.1, '#c9c9c4', NC); for (const y of [5.0, 7.7]) k.plane(C.YHT.win(), 1.4, 1.1, w / 2, y, 7.97, FRONT); // 實景後面是 3 樓
    }

    // ================= 南側 =================
    { // S1：米色鐵捲門鐵皮屋（鏽灰浪板單斜屋頂往路邊斜下、米黃封簷板、屋頂上空的鍍鋅招牌架、東邊界一支細高的鐵格架）
      const k = K(370.4, 375.1, -1), w = k.W;
      slopeZ(k, -0.1, w + 0.1, -0.9, 2.8, 3.5, 3.7, 0.08, '#9a9788'); k.box(-0.1, w + 0.1, 2.58, 2.8, -0.95, -0.87, '#d8c9a0', NC);
      k.box(0, w, 3.0, 3.6, 2.6, 12, '#cfc6ae', NC); k.box(-0.1, w + 0.1, 3.6, 3.7, 3.4, 12.1, '#9a9788', NC);
      for (const x of [0.15, w - 0.55]) k.box(x, x + 0.4, 0.4, 2.3, -0.04, 0, x < 1 ? '#d8d0bc' : '#b84a3a', NC); // 兩側貼滿褪色小廣告
      for (const x of [0.2, w - 0.2]) k.box(x - 0.04, x + 0.04, 3.0, 5.6, 0.9, 0.98, '#a9aeb2', NC);
      for (const y of [3.7, 5.55]) k.box(0.2, w - 0.2, y, y + 0.07, 0.9, 0.98, '#a9aeb2', NC);
      k.box(w / 2 - 0.03, w / 2 + 0.03, 3.7, 5.6, 0.9, 0.98, '#a9aeb2', NC);
      for (const dx of [0, 0.3]) k.box(w - 0.02 + dx, w + 0.04 + dx, 0, 9, 0.6, 0.66, '#a9aeb2', NC);
      for (let y = 0.6; y < 9; y += 0.6) k.box(w - 0.02, w + 0.34, y, y + 0.04, 0.6, 0.66, '#a9aeb2', NC);
    }
    { // S2：夾娃娃機店（屋頂鐵架上褪色的舊招牌、西端屋頂白色燈箱側招「平價串燒」）
      const k = K(375.1, 379.2, -1), w = k.W;
      openClaw(k);
      eave(k, 2.4, '#d9cfae');
      board(k, paint('第一快餐', '#d9d2bd', '#c7bda4', null, 3.4, 1.6), 3.4, 1.6, w / 2 + 0.3, 2.5, EZ, 0, 0.05);
      flag(k, paint('平\n價\n串\n燒', '#fbfaf6', '#d42a1f', null, 1.3, 2.8), 1.3, 2.8, 0.25, 4.0, -1.05);          // 西端從屋簷往路上伸出去的白色燈箱側招
      k.box(0.2, 0.3, 2.5, 5.4, -0.45, -0.35, STEEL, NC);
    }
    { // S3：囍勒烤（灰藍鐵捲門、屋簷上方白底紅框橫招）
      const k = K(379.2, 383.6, -1), w = k.W;
      eave(k, 2.4, '#d9cfae');
      board(k, T.xile(), 4.2, 1.3, w / 2, 2.5, EZ);
    }
    { // S4：光頭叔叔の簡單麵包店（現在是夾娃娃機店；屋頂鐵架白底大招牌）
      const k = K(383.6, 387.3, -1), w = k.W;
      openClaw(k);
      eave(k, 2.4, '#d9cfae');
      board(k, paint('光頭叔叔の\n簡單麵包店', '#fbfaf6', '#1a1a1a', null, 3.6, 2.0), 3.6, 2.0, w / 2, 2.5, EZ);
    }
    { // S5：兩棟房子之間的雜草空地（深處一道紅磚牆、水泥地上停一台銀色休旅車、西邊界路邊的電線桿）
      const k = K(387.3, 391.2, -1, 5.3), w = k.W, r = C.lcg(4387);
      k.box(0, w, -0.5, 0.07, 0.3, 6.5, '#a9a7a0', NC);
      k.box(0, w, -0.3, 2.5, 8.6, 8.8, '#9a4a38'); k.plane(T.brick(), w, 2.5, w / 2, 1.25, 8.58, FRONT);
      for (let i = 0; i < 9; i++) { const g = new THREE.SphereGeometry(0.5 + r() * 0.35, 6, 4); g.scale(1, 0.55, 1); g.translate(0.4 + r() * (w - 0.8), 0.2 + r() * 0.25, 6.6 + r() * 1.8); addG(k, g, ['#3a6e33', '#44753a', '#2f5f2c'][i % 3]); }
      for (let i = 0; i < 4; i++) { const g = new THREE.SphereGeometry(0.6, 6, 4); g.scale(1.2, 0.5, 0.25); g.translate(0.6 + i * 0.9, 2.3 - (i % 2) * 0.5, 8.5); addG(k, g, '#2f5f2c'); } // 牆頭垂下來的藤蔓
      carK(k, 1.3, 1.2, '#b9bcc0'); k.box(1.42, 2.93, 1.42, 1.5, 2.1, 5.2, '#b9bcc0', NC);
      k.cyl(0.1, -0.2, 0.16, -0.5, 9, '#a9a7a0', { seg: 8, col: true }); for (let i = 0; i < 4; i++) k.cyl(0.1, -0.2, 0.165, 0.4 + i * 0.3, 0.55 + i * 0.3, i % 2 ? '#1e1e1e' : '#e8c02a', { seg: 8 });
      { // 掛在電線桿西側的藍色大側招：實景垂直於路、伸到路面上方；這裡不能伸到路上，改成斜 45° 對著來車方向，從同一個街景點看起來才像
        const tx = paint('便\n宜\n租\n車', '#2a3f9a', '#ffffff', '451-7856', 1.5, 3.0), NE = 3 * PI / 4;
        for (const a of [0, PI]) k.plane(tx, 1.5, 3.0, -0.75 + Math.sin(NE + a) * 0.04, 5.8, -0.2 + Math.cos(NE + a) * 0.04, NE + a, { emissive: 0.3 });
        k.box(-0.3, 0.1, 6.6, 6.68, -0.24, -0.16, STEEL, NC);
      }
    }
    { // S6：便宜租車（開放式車庫裡的白牆與機車、屋頂鐵架大招牌、東端凸出的藍色側招、門邊紫色小牌）
      const k = K(391.2, 395.7, -1), w = k.W;
      k.box(0.3, w - 0.3, 0, 2.3, 0.0, 0.02, '#ecebe6', NC); k.plane(T.corr('#e8e6e0', 14), w - 0.6, 2.3, w / 2, 1.15, -0.04, FRONT, { emissive: 0.25 });
      for (let x = 0.8, i = 0; x < w - 0.8; x += 0.8, i++) bike(k, x, -0.9, 1, bikeCols[(i * 3 + 2) % 6]);
      eave(k, 2.4, '#9fb0a0');
      board(k, T.rent(), 4.4, 2.6, w / 2, 2.5, EZ);
      k.box(0.05, 0.3, 1.1, 1.9, -0.06, -0.02, '#7a3a9a', NC);
    }
    { // S7：八方來（門口不鏽鋼餐檯與玻璃菜櫃、屋簷上方米黃橫招、東端直式側招、簷下紅色菜單布條）
      const k = K(395.7, 399.6, -1), w = k.W;
      k.box(0.4, w - 0.9, 0, 0.9, -0.75, -0.1, '#c9ccd0', NC); k.box(0.4, w - 0.9, 0.9, 1.4, -0.7, -0.15, '#bfe4f0', NC); k.box(0.38, w - 0.88, 1.4, 1.44, -0.75, -0.1, '#8d9196', NC);
      eave(k, 2.4, '#b9cbb0');
      board(k, paint('八方來', '#ecdcb8', '#d8402a', null, 3.8, 1.3), 3.8, 1.3, w / 2, 2.5, EZ);
      flag(k, paint('八\n方\n來', '#ecdcb8', '#d8402a', null, 0.7, 1.8), 0.7, 1.8, w - 0.1, 4.75, -0.6, { edge: '#ecdcb8' });
      k.box(0.3, w - 0.4, 1.7, 2.4, -1.04, -1.02, '#c8281e', NC); for (let i = 0; i < 4; i++) k.box(0.5, w - 0.6, 1.8 + i * 0.15, 1.84 + i * 0.15, -1.05, -1.04, '#f0c8c0', NC); // 簷下的紅色菜單布條（字太小，只畫幾條白線）
    }
    { // S8：韓老爺 台式拌麵（木紋牆與木框玻璃門、紅磚矮檯與菜櫃、屋頂白底毛筆字大招牌）
      const k = K(399.6, 404.1, -1), w = k.W;
      k.plane(T.wood(), w - 0.3, 2.3, w / 2, 1.15, -0.045, FRONT, { emissive: 0.2 });
      k.box(0.1, 0.5, 0.5, 2.6, -0.1, -0.05, '#f4f3ee', NC);
      eave(k, 2.4, '#e8e8e4');
      board(k, T.han(), 4.4, 2.4, w / 2, 2.5, EZ);
    }
    { // S9：憶阿嬤（東側沿牆往上的銀色排煙管、屋頂鐵架上凸出的紅色側招）
      const k = K(404.1, 408.1, -1), w = k.W;
      k.cyl(w - 0.35, -0.25, 0.17, 0.4, 4.6, '#c9ccd0', { seg: 10 }); k.cyl(w - 0.35, -0.25, 0.22, 4.6, 4.8, '#b4b8bb', { seg: 10 });
      k.plane(T.disc('#fbfaf6'), 0.5, 0.5, 0.55, 2.76, -0.3, FRONT, { transparent: true });
      flag(k, paint('憶\n阿\n嬤', '#a82a34', '#ffffff', null, 2.0, 2.8), 2.0, 2.8, w - 0.25, 5.4, -0.85, { edge: '#a82a34' });
      for (const y of [4.2, 6.6]) k.box(w - 0.29, w - 0.21, y, y + 0.08, 0.1, 1.6, STEEL, NC); k.box(w - 0.29, w - 0.21, 3.2, 6.7, 1.5, 1.6, STEEL, NC);
    }
    { // S10：PPLAN BEE 小小蜜蜂手工豆花（整面黃色橫招、淺灰牆與黑框落地玻璃門、東端牆角黃色圓形側招）
      const k = K(408.1, 412.3, -1), w = k.W;
      eave(k, 2.4, '#e9b93a');
      board(k, T.bee(), 4.2, 1.3, w / 2, 2.5, EZ);
      k.plane(T.dark(), w - 0.3, 2.3, w / 2, 1.15, -0.045, FRONT, { emissive: 0.15 });
      disc2(k, T.disc('#f2c935', '#1a1a1a'), 0.8, w - 0.05, 2.9, -1.5);
    }
    { // S11：銀灰浪板 2 樓雜貨店（東端黃色直立凸出招牌，字看不清所以不放字；東側門口立牌、西側黃色塑膠籃）
      const k = K(412.3, 416.8, -1, 5.4), w = k.W;
      k.box(w - 0.14, w - 0.06, 2.6, 6.5, -0.85, -0.05, '#f2d21f', NC);
      k.box(w - 0.83, w - 0.77, 0, 1.3, -0.75, -0.15, '#8a8d90', NC); for (const sd of [-1, 1]) k.plane(T.betel(), 0.6, 1.0, w - 0.8 + sd * 0.04, 0.8, -0.45, sd * PI / 2, { emissive: 0.2 });
      for (const [x, y] of [[0.3, 0], [0.9, 0], [0.6, 0.32], [0.3, 0.32]]) k.box(x, x + 0.55, y, y + 0.3, -0.7, -0.25, '#f2c81e', NC);
    }
    { // S12：米色浪板 2 樓（簷口一條灰色平雨遮、一樓東寬西窄兩片鐵捲門）
      const k = K(416.8, 420.5, -1, 5.4), w = k.W;
      k.box(-0.05, w + 0.05, 2.9, 3.0, -0.6, 0, '#8f9296', NC);
      k.box(1.2, 1.5, 0, 2.2, -0.06, 0, '#cfc9b6', NC);
    }
    { // S13：紅茶洋行（鏽黃浪板屋頂朝路邊斜下，上面兩個不鏽鋼通風球；屋簷深灰雨遮；屋頂西端垂直於路的紅色側招）
      const k = K(420.5, 424.8, -1), w = k.W, T0 = 3.0;
      slopeZ(k, -0.15, w + 0.15, -0.6, T0 - 0.1, 3.4, T0 + 1.7, 0.08, '#b8a36a'); k.box(-0.15, w + 0.15, T0 + 1.65, T0 + 1.73, 3.4, 14.1, '#b8a36a', NC);
      k.box(0, w, T0, T0 + 1.65, 3.0, 14, '#d6ccb0', NC);
      for (const z of [1.2, 2.6]) k.cyl(w / 2 + (z < 2 ? -0.8 : 0.7), z, 0.28, T0 + 0.25 + z * 0.45, T0 + 0.85 + z * 0.45, '#c9ccd0', { seg: 8 });
      k.box(-0.05, w + 0.05, 2.75, 2.85, -1.0, 0, '#4a4d50', NC);
      k.plane(paint('紅茶洋行', '#8f2a2a', '#ffffff', '大大杯紅茶小賣所', 3.3, 0.6), 3.3, 0.6, w / 2 + 0.2, 2.42, -0.9, FRONT, { emissive: 0.15 }); // 掛在屋簷前緣下面的暗紅布條（實景在鐵捲門上緣，不是門中間）
      flag(k, T.tea(), 1.5, 1.85, 0.9, 4.3, -0.95, { edge: '#c23a3a' });                                        // 從屋簷往路上伸出去的側招（兩個街景點交會在 s≈423.9，中心離地約 4.3 m）
      for (const y of [3.6, 5.0]) k.box(0.86, 0.94, y, y + 0.08, -0.2, 1.6, STEEL, NC); k.box(0.86, 0.94, 3.5, 5.1, 1.5, 1.6, STEEL, NC);
    }
    { // S14：山東餃子館（西端屋頂凸出的紅色燈箱側招）
      const k = K(424.8, 428.5, -1);
      flag(k, T.shandong(), 1.9, 1.3, 0.3, 4.25, 0.75, { edge: '#f0efea' });                                    // 實景是橫式燈箱（紅底黑字、白色電話），立在屋頂上、垂直於路
      for (const z of [0.2, 1.3]) k.box(0.26, 0.34, 3.2, 3.6, z - 0.04, z + 0.04, STEEL, NC);
    }
    { // S15：日嚐麵飯館（屋頂大看板：毛筆字與捧炒飯的灰綠色恐龍；簷下紅色橫布條，字不完整所以不放）
      const k = K(428.5, 433.0, -1), w = k.W;
      eave(k, 2.45, '#5f7a66');
      board(k, T.godz(), 4.4, 3.3, w / 2, 2.55, EZ);
      k.box(0.7, w - 1.2, 2.0, 2.45, -1.04, -1.02, '#c8281e', NC);
    }
  },

  footprints(F) {
    const park = F(R, 358.8, 369.5, 1, 5.3, 10.2), tip = F(R, 356.4, 359.1, 1, 6.2, 2.9);
    return [
      [tip[0], tip[1], tip[3]],                                      // 轉角尖端的柏油地（三角形）
      [park[0], park[1], park[2]],                                   // 轉角停車場靠新中北路這側（三角形，東邊接 SegL1.js 的停車場）
      F(R, 387.3, 391.2, -1, 5.3, 8.9),                              // 南側雜草空地
    ];
  },
};
