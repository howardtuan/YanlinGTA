// 新中北路 s 150～250 兩側（Google 街景 2026-05、國土測繪 2024 正射）。這段不是連續街屋：
//   北側（+1，靠校園）：巷口紅磚矮牆與南洋杉 → 2 樓老透天 → 單層鐵皮車庫 → 3 樓奶油色＋橘褐色 4 樓陽台樓 → 537 巷 →
//     紅磚柱鋼管圍籬、草地大樹（後面是電力中心）→ 第一停車場的白色鐵皮棚、告示 → 入口（s 228.6～234.2，兩邊門柱都貼「歡迎包月」）→ 掛第二塊告示的鐵欄杆、鐵網圍籬 → 校園車道（s≈250）
//   南側（-1）：瑞恩帝兒環中幼兒園的直式招牌、白色拱門、黃色麋鹿、亂石矮牆與紅布條、校車場 → 2 棟 3 樓透天 →
//     車道、人行坡道口、樹籬島與立牌 → 樹籬 → 鐵網圍籬的平面停車場
// 遊戲資料的人行坡道（footway）接到路邊的位置在 s 217～221，比實景（s 222～229）偏東，所以樹籬島與立牌縮在坡道東邊 s 213.4～216.6，坡道西邊整段做成綠籬。
// 街景網址的 fov 在 4:3 的瀏覽器窗格裡是垂直視角，各棟的 s 與退縮是用換算後的水平視角（fov 90 → 約 106°）＋正射影像重新量過的。
const R = 'X';
const FNT = (px) => `900 ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
// 開一個 Kit，k.sx(s) 把沿線距離換成區域 x（南側的 +x 朝 s 變小的方向）
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標，有碰撞的 box 要用），所以這裡把寬度搬到 k.W、還原 k.w
const seg = (C, side, s0, s1, set) => { const k = C.kit(R, s0, s1, side, set); k.W = s1 - s0; delete k.w; k.sx = (s) => (side > 0 ? s - s0 : s1 - s); return k; };
const ball = (C, k, x, y, z, r, hex, sy = 1, sx = 1) => { const g = new C.THREE.SphereGeometry(r, 8, 6); g.scale(sx, sy, 1); g.translate(x, y, z); k._part(C.VC, C.paintGeo(g, hex)); };
// 闊葉大樹：樹幹＋幾團樹冠（h 樹高、cr 樹冠半徑）
const tree = (C, k, x, z, h, cr, r) => {
  k.cyl(x, z, 0.28, -0.5, h - cr, '#5e4630', { seg: 6, r1: 0.18 });
  const G = ['#3f7a3a', '#4b8a3e', '#356b34'];
  ball(C, k, x, h - cr * 0.85, z, cr * 0.8, G[0], 0.75);
  for (let j = 0; j < 4; j++) { const a = j * 1.57 + r() * 0.8, q = 0.55 + r() * 0.15; ball(C, k, x + Math.cos(a) * cr * 0.5, h - cr * (0.95 + r() * 0.3), z + Math.sin(a) * cr * 0.5, cr * q, G[1 + (j % 2)], 0.72); }
};
// 南洋杉／龍柏：尖錐形
const conifer = (C, k, x, z, h, rad) => { k.cyl(x, z, 0.22, -0.5, h * 0.3, '#5e4630', { seg: 6 }); k.cyl(x, z, rad, h * 0.18, h * 0.62, '#2f5a36', { seg: 8, r1: rad * 0.55 }); k.cyl(x, z, rad * 0.62, h * 0.55, h, '#356b3c', { seg: 8, r1: 0.05 }); };
// 一輛車（len 車長、wid 車寬；turn 為真時車頭朝區域 z，否則順著區域 x）：車身、車窗、車頂、輪子
const car = (k, x, z, len, wid, hgt, body, roof, turn) => {
  const B = (a0, a1, y0, y1, b0, b1, m, o) => (turn ? k.box(x + b0, x + b1, y0, y1, z + a0, z + a1, m, o) : k.box(x + a0, x + a1, y0, y1, z + b0, z + b1, m, o));
  B(0, len, 0.3, hgt * 0.55, 0, wid, body); B(len * 0.08, len * 0.92, hgt * 0.55, hgt * 0.92, 0.06, wid - 0.06, '#27323a', { col: false });
  B(len * 0.06, len * 0.94, hgt * 0.92, hgt, 0.02, wid - 0.02, roof || body, { col: false });
  for (const a of [len * 0.2, len * 0.8]) for (const b of [-0.02, wid - 0.2]) B(a - 0.32, a + 0.32, 0, 0.64, b, b + 0.22, '#1c1c1e', { col: false });
};

export default {
  drop: ['f2_172', 'f2_173'], // 由 S7、S8 兩棟透天取代
  ownSign: [],
  lots: [
    // ---- 北側 ----
    [R, 163.5, 169.8, 1, { nf: 2, gf: 3.7, fh: 4.0, wall: '#cfc6b4', ground: 'shutter', sh: '#6b4a3c', bal: 'open', d: 15, set: 7.2, noband: 1, roof: 'tank', hood: '#b9b6ae' }],   // N1 米灰小口磚老透天，咖啡色鐵捲門
    [R, 179.4, 186.6, 1, { nf: 3, wall: '#e6dcc4', ground: 'shutter', bal: 'plain', d: 13.6, set: 9.8, noband: 1, roof: 'tank' }],                          // N3 東半：奶油色 3 樓，退在一樓鐵皮增建（custom）後面
    [R, 186.6, 191.3, 1, { nf: 4, wall: '#b0705a', ground: 'shutter', sh: '#8a8d90', bal: 'open', d: 17, set: 6.4, noband: 1, roof: 'none' }],                // N3 西半：橘褐色小口磚 4 樓陽台樓，實景幾乎貼著路邊
    // ---- 南側 ----
    [R, 193.7, 199.9, -1, { nf: 3, gf: 3.6, fh: 3.4, wall: '#d4c9b0', ground: 'shutter', sh: '#55565a', bal: 'plain', d: 10, set: 8.4, noband: 1, roof: 'none', bikes: 3 }],  // S7 米色鰭片透天（鰭片與屋頂棚架在 custom）
    [R, 199.9, 208.4, -1, { nf: 3, wall: '#d6ccb6', ground: 'gate', sh: '#cfc8b8', bal: 'open', d: 18, set: 9.6, noband: 1, roof: 'none', bikes: 0 }],      // S8 米色陽台樓，比 S7 再退一點（綠屋頂、帆布罩著的車在 custom）
  ],
  custom(C) {
    const { MR, FRONT, lcg, sg, paint, bars } = C, r = lcg(7702);
    // ---------- 貼圖 ----------
    const stone = sg('xzb2Stone', 256, 128, (g) => { // 亂石砌
      const q = lcg(31); g.fillStyle = '#6f675c'; g.fillRect(0, 0, 256, 128);
      for (let y = 0; y < 128; y += 26) for (let x = -20 + (y % 52 ? 14 : 0); x < 256;) { const w = 26 + q() * 26, v = 120 + q() * 50 | 0; g.fillStyle = `rgb(${v + 14},${v + 6},${v - 6})`; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, 22, 7); g.fill(); x += w; }
    });
    const mesh = sg('xzb2Mesh', 64, 64, (g) => { // 灰色鐵網
      g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(150,154,156,.9)'; g.lineWidth = 1.5;
      for (let i = -64; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); }
      g.fillStyle = '#8a8d90'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 61, 64, 3);
    });
    const blueBars = sg('xzb2BlueBars', 64, 64, (g) => { // 停車場入口西邊的藍灰色直條鐵欄杆
      g.clearRect(0, 0, 64, 64); g.fillStyle = '#5f7896'; for (let x = 3; x < 64; x += 8) g.fillRect(x, 0, 2.5, 64); g.fillRect(0, 1, 64, 4); g.fillRect(0, 30, 64, 3); g.fillRect(0, 59, 64, 4);
    });
    const kgSign = sg('xzb2KgSignB', 160, 672, (g) => { // 綠底直式招牌：園徽、瑞恩帝兒（藍，直排）、環中（紅，直排）、幼兒園（藍，橫排）、紅底 435-5555
      g.fillStyle = '#3fae6a'; g.fillRect(0, 0, 160, 672);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 6; y < 672; y += 14) { g.fillRect(4, y, 4, 4); g.fillRect(152, y, 4, 4); }
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(80, 52, 46, 0, 7); g.fill(); g.fillStyle = '#e8a23a'; g.beginPath(); g.arc(80, 52, 36, 0, 7); g.fill(); g.fillStyle = '#7a4a2c'; g.beginPath(); g.arc(80, 56, 20, 0, 7); g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FNT(92);
      [...'瑞恩帝兒'].forEach((t, i) => { g.fillStyle = '#1d2f7a'; g.fillText(t, 80, 150 + i * 88); });
      g.font = FNT(74); [...'環中'].forEach((t, i) => { g.fillStyle = '#d42a2a'; g.fillText(t, 80, 500 + i * 68); });
      g.font = FNT(44); g.fillStyle = '#1d2f7a'; g.fillText('幼兒園', 80, 620);
      g.fillStyle = '#d42a2a'; g.fillRect(0, 644, 160, 28); g.fillStyle = '#ffffff'; g.font = FNT(24); g.fillText('435-5555', 80, 659);
    });
    const kgGate = sg('xzb2KgGate', 256, 256, (g) => { // 白色鍛鐵拱門
      g.clearRect(0, 0, 256, 256); g.strokeStyle = '#f4f4f0'; g.lineWidth = 7;
      const top = (x) => 78 - 62 * Math.sin(Math.PI * x / 256);
      g.beginPath(); g.moveTo(4, 252); g.lineTo(4, top(4)); for (let x = 4; x <= 252; x += 8) g.lineTo(x, top(x)); g.lineTo(252, 252); g.closePath(); g.stroke();
      g.lineWidth = 3; for (let x = 20; x < 252; x += 16) { g.beginPath(); g.moveTo(x, top(x)); g.lineTo(x, 252); g.stroke(); }
      g.lineWidth = 6; g.beginPath(); g.moveTo(128, top(128)); g.lineTo(128, 252); g.stroke(); g.beginPath(); g.moveTo(4, 150); g.lineTo(252, 150); g.stroke();
      for (const x of [70, 186]) { g.fillStyle = '#f4f4f0'; g.beginPath(); g.arc(x, 112, 26, 0, 7); g.fill(); g.fillStyle = '#3b6fc4'; g.beginPath(); g.arc(x, 112, 19, 0, 7); g.fill(); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(x, 112, 9, 0, 7); g.fill(); }
    });
    const kgBanner = sg('xzb2KgBannerC', 1024, 176, (g) => { // 紅布條：恭賀名單／賀~大班／瑞恩帝兒，其餘小字看不清只畫成一排排短線
      g.fillStyle = '#d8456a'; g.fillRect(0, 0, 1024, 176); g.fillStyle = '#c22f55'; g.fillRect(0, 0, 1024, 10); g.fillRect(0, 166, 1024, 10);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.font = FNT(64); g.fillText('恭賀名單', 150, 56); g.font = FNT(48); g.fillText('賀~大班', 150, 126);
      g.font = `italic ${FNT(46)}`; g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.strokeText('瑞恩帝兒', 430, 104); g.fillStyle = '#2a4fc0'; g.fillText('瑞恩帝兒', 430, 104);   // 藍字白邊，直接印在布條上
      const q = lcg(88);
      for (let y = 22; y < 160; y += 15) for (let x = 300; x < 1000; x += 40) { if (x < 560 && y > 66 && y < 140) continue; g.fillStyle = q() < 0.25 ? 'rgba(255,236,150,.9)' : 'rgba(255,255,255,.85)'; g.fillRect(x, y, 24 + q() * 12, 6); }
    });
    const blueBoard = sg('xzb2Board', 128, 104, (g) => { g.fillStyle = '#3b6fc4'; g.fillRect(0, 0, 128, 104); g.fillStyle = '#e8eef8'; for (let i = 0; i < 6; i++) g.fillRect(8 + (i % 3) * 39, 10 + (i / 3 | 0) * 46, 34, 40); });
    const parkNotice = sg('xzb2ParkNotice', 352, 192, (g) => { // 藍底白字標題＋白底收費說明（小字看不清，畫成色條）
      g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 352, 192); g.fillStyle = '#1f4fa8'; g.fillRect(0, 0, 352, 56);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FNT(34); g.fillText('中原大學第一停車場', 176, 30);
      for (let i = 0; i < 6; i++) { g.fillStyle = i === 2 || i === 5 ? '#c8202a' : '#1f4fa8'; g.fillRect(16, 70 + i * 19, 200 + ((i * 53) % 110), 8); }
    });
    const wonder = sg('xzb2Wonder', 256, 256, (g) => { // 白色圓牌：綠色樹形＋WONDER TREE
      g.clearRect(0, 0, 256, 256); g.fillStyle = '#fbfbf7'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#5a8f4a'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 114, 0, 7); g.stroke();
      g.fillStyle = '#5a8f4a'; for (const [x, y, q] of [[128, 82, 40], [98, 104, 30], [158, 104, 30]]) { g.beginPath(); g.arc(x, y, q, 0, 7); g.fill(); } g.fillRect(122, 110, 12, 46);
      g.fillStyle = '#3d6b34'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 28px "Noto Sans TC",sans-serif'; g.fillText('WONDER TREE', 128, 184);
    });
    const vsign = (k, tex, wd, len, x, y, z) => { for (const sd of [-1, 1]) k.plane(tex, wd, len, x + sd * 0.04, y, z, sd * Math.PI / 2, { emissive: 0.3 }); };

    // ---------- 圍籬 ----------
    // 北側校園圍籬：紅磚柱（0.45 見方、1.3 高、水泥壓頂）每 3.3 m 一根、兩道鋼管橫桿、底下 0.3 高紅磚矮牆；net 為真那段中間改灰色鐵網、'bars' 改藍灰色直條鐵欄杆（可傳函式逐格決定）
    const brickFence = (s0, s1, set, net) => {
      const n = Math.max(1, Math.round((s1 - s0) / 3.3)), b = (s1 - s0) / n;
      for (let j = 0; j < n; j++) {
        const k = seg(C, 1, s0 + j * b, s0 + (j + 1) * b, set);
        k.box(0, b, -0.5, 0.3, 0.1, 0.32, '#9a5a48');
        for (const x of j === n - 1 ? [0, b - 0.45] : [0]) { k.box(x, x + 0.45, -0.5, 1.3, 0, 0.45, '#9a5a48'); k.box(x - 0.04, x + 0.49, 1.3, 1.38, -0.04, 0.49, '#c9c5ba', { col: false }); }
        const nk = typeof net === 'function' ? net(j) : net;
        if (nk === 'bars') k.plane(blueBars, b - 0.45, 1.25, b / 2 + 0.22, 0.92, 0.2, FRONT, { transparent: true, double: true });
        else if (nk) k.plane(mesh, b - 0.45, 1.0, b / 2 + 0.22, 0.8, 0.2, FRONT, { transparent: true, double: true });
        else for (const y of [0.62, 1.02]) k.box(0.45, b, y, y + 0.07, 0.18, 0.25, '#9a9c9c', { col: false });
        k.wallRect(0, b, 0.15, 0.3, 0, 1.2);
      }
    };
    // 幼兒園亂石矮牆：石砌方柱（柱頂黑色庭園燈，實景約每 2.8 m 一根）＋黑色鐵欄杆
    const stoneFence = (s0, s1, set, h, ph, rail = true) => {
      const n = Math.max(1, Math.round((s1 - s0) / 2.9)), b = (s1 - s0) / n;
      for (let j = 0; j < n; j++) {
        const k = seg(C, -1, s0 + j * b, s0 + (j + 1) * b, set);
        k.box(0, b, -0.5, h, 0.05, 0.45, '#8d8478'); k.plane(stone, b, h, b / 2, h / 2, 0.04, FRONT);
        for (const x of j === 0 ? [0, b - 0.55] : [0]) {
          k.box(x, x + 0.55, -0.5, ph, 0, 0.55, '#8d8478'); k.plane(stone, 0.55, ph, x + 0.275, ph / 2, -0.01, FRONT); k.box(x - 0.04, x + 0.59, ph, ph + 0.08, -0.04, 0.59, '#6f675c', { col: false });
          k.box(x + 0.2, x + 0.35, ph + 0.08, ph + 0.3, 0.2, 0.35, '#1c1c1e', { col: false }); ball(C, k, x + 0.275, ph + 0.42, 0.275, 0.14, '#f4e9c0');
        }
        if (rail) k.plane(bars, b - 0.55, ph - h - 0.25, b / 2 + 0.27, h + (ph - h - 0.25) / 2, 0.25, FRONT, { transparent: true, double: true });
        for (let x = 0.8; x < b - 0.4; x += 0.9) ball(C, k, x + r() * 0.3, h + 0.35, 0.95, 0.42, r() < 0.35 ? '#8a3a4a' : '#3f7a3a', 1.1);      // 牆內的朱蕉、變葉木
      }
    };

    // ================= 北側 =================
    { // N0b [158,163.5] 紅磚矮牆＋黑鐵欄杆，後面 2 棵南洋杉
      const k = seg(C, 1, 158, 163.3, 6.6);
      k.box(0, k.W, -0.5, 0.9, 0, 0.3, '#9a5a48'); k.plane(bars, k.W, 0.8, k.W / 2, 1.3, 0.15, FRONT, { transparent: true, double: true });
      for (const x of [0, k.W - 0.4]) { k.box(x, x + 0.4, -0.5, 1.8, -0.05, 0.35, '#9a5a48'); k.box(x - 0.04, x + 0.44, 1.8, 1.88, -0.09, 0.39, '#c9c5ba', { col: false }); }
      conifer(C, k, 1.4, 3.2, 14, 2.0); conifer(C, k, 3.9, 5.5, 11, 1.7);
    }
    { // N1 的女兒牆盆栽與水泥雨遮
      const k = seg(C, 1, 163.5, 169.8, 7.2);
      k.box(0.3, k.W - 1.2, 2.9, 3.02, -0.7, 0, '#b9b6ae', { col: false });
      k.box(0, k.W, 7.7, 8.5, -0.05, 0.15, 'wall#d6cdbb', { col: false });                                          // 高女兒牆（實景一樓、二樓都很高，整棟約 8.5 m）
      for (let x = 0.6; x < k.W - 0.5; x += 1.1) ball(C, k, x, 8.8, 0.35, 0.3, '#4b8a3e');
      k.box(0, 0.06, 0, 7.7, 0.02, 14.98, '#8f8b84', { col: false });                                              // 東側牆沒貼磚，水泥灰
    }
    { // N2 [169.8,179.4] 單層鐵皮車庫，由東到西：灰色鐵門、深灰大捲門、白牆一小段（電表、水桶、盆栽）
      const k = seg(C, 1, 169.8, 179.4, 7.2), w = k.W, D = 12;
      k.box(0, w, -0.5, 3.0, 0, D, 'wall#e8e4dc', { tile: [0.6, 0.6] });
      k.box(0.3, 1.4, 0, 2.3, -0.04, 0, '#7a7e82', { col: false });
      k.plane(C.shutterTex('#4a4d50'), 4.3, 2.6, 1.7 + 2.15, 1.3, -0.02, FRONT); k.box(1.6, 6.1, 2.6, 2.8, -0.2, 0, '#5a5d60', { col: false });
      k.box(6.9, 7.4, 1.2, 1.9, -0.14, 0, '#c9c9c4', { col: false });                                               // 電表箱
      k.box(6.45, 6.53, 0, 3.0, -0.1, -0.02, '#c9c9c4', { col: false });                                             // 落水管
      k.cyl(8.5, -0.5, 0.28, 0, 0.75, '#2f6db3', { seg: 8 });                                                      // 藍色水桶
      for (const x of [7.7, 9.0]) { k.box(x, x + 0.4, 0, 0.35, -0.6, -0.2, '#9a5a48', { col: false }); ball(C, k, x + 0.2, 0.65, -0.4, 0.32, '#4b8a3e'); }
      // 單斜鐵皮屋頂：往街道斜下，一片一片疊上去（正射看是淺綠灰色）
      for (let j = 0; j < 5; j++) k.box(-0.3, w + 0.3, 3.0 + j * 0.12, 3.1 + j * 0.12, -0.7 + j * 2.55, 2.0 + j * 2.55, '#8f9d8a', { col: false });
      k.box(0, w, 3.0, 3.5, D - 0.1, D, 'wall#e8e4dc', { col: false });
      k.box(-0.01, w + 0.01, -0.5, 0.05, -k.apron + 0.2, 0, MR.concrete, { col: false, surface: true });
    }
    { // N3 東半一樓往街道增建的米色浪板鐵皮（前緣離中心線 6.8，往後接到奶油色 3 樓的立面）：貼紅色春聯的門在東、灰色鐵捲門在西
      const k = seg(C, 1, 179.4, 186.6, 6.8), w = k.W;
      k.box(0.05, w, -0.5, 2.8, 0, 3.0, '#d8cfb4');
      for (let x = 0.05; x < w; x += 0.35) k.box(x, x + 0.05, 0, 2.8, -0.02, 0, '#c4bb9f', { col: false });
      k.plane(C.shutterTex('#8a8d90'), 3.0, 2.3, 5.2, 1.15, -0.04, FRONT);
      k.box(1.6, 2.6, 0, 2.1, -0.05, 0, '#6f6a62', { col: false }); for (const x of [1.42, 2.63]) k.box(x, x + 0.15, 0.5, 2.0, -0.06, 0, '#c8202a', { col: false }); k.box(1.7, 2.5, 2.12, 2.3, -0.06, 0, '#c8202a', { col: false });
      k.box(-0.1, w + 0.1, 2.8, 2.9, -0.4, 1.6, '#b9b4a0', { col: false }); k.box(-0.1, w + 0.1, 2.95, 3.05, 1.4, 3.05, '#b9b4a0', { col: false });
    }
    { // N3 西半：門邊紅色春聯、屋頂鐵欄杆
      const k = seg(C, 1, 186.6, 191.3, 6.4), w = k.W, top = 3.3 + 3 * 3.0;
      for (const x of [0.3, w - 1.45]) k.box(x, x + 0.15, 0.6, 2.1, -0.04, 0, '#c8202a', { col: false });
      k.plane(bars, w - 0.2, 0.9, w / 2, top + 0.57, 0.1, FRONT, { transparent: true, double: true });
      k.box(w - 0.05, w + 0.02, 0, top, 0.02, 16.98, '#e6dcc4', { col: false });                                     // 沿 537 巷的西側牆是奶油色粉刷
      for (let f = 0; f < 4; f++) for (const z of [3, 7, 11, 15]) k.plane(C.YHT.win(), 0.9, 0.9, w + 0.04, (f ? 3.3 + (f - 1) * 3 : 0.3) + 1.6, z, Math.PI / 2);
    }
    // N4 [191.5,195.5] 是 537 巷，留空
    brickFence(195.9, 226.6, 6.3);                                                                                 // N5、N6 紅磚柱＋鋼管圍籬
    for (let s0 = 196.4; s0 < 218.7; s0 += 4.46) { const k = seg(C, 1, s0, s0 + 4.5, 6.95); k.box(0, k.W, -0.4, 0.06, 0, 10.3, '#4a8a3e', { col: false }); }   // 圍籬後面到電力中心前是草地
    [[201, 11.5, 11.5, 4.2], [208.5, 12.2, 12, 4.4], [216.8, 9.8, 11, 4.0]].forEach(([s, off, h, cr]) => { const k = seg(C, 1, s - 1, s + 1, off); tree(C, k, 1, 0, h, cr, r); });
    { // 台電變電箱 2 個＋水泥電桿
      const k = seg(C, 1, 212.6, 216, 5.15);
      for (const x of [0, 1.25]) { k.box(x, x + 1.0, 0, 1.5, 0, 0.7, '#8fae8c'); k.box(x - 0.03, x + 1.03, 1.5, 1.56, -0.03, 0.73, '#7c9a7a', { col: false }); k.box(x + 0.3, x + 0.7, 0.9, 1.2, -0.02, 0, '#e8d23a', { col: false }); }
      k.cyl(2.9, 0.3, 0.16, 0, 9.5, '#a3a19b', { seg: 8, r1: 0.11 }); k.box(2.9, 4.3, 8.6, 8.68, 0.26, 0.34, '#8a8d90', { col: false }); k.box(4.0, 4.5, 8.5, 8.6, 0.15, 0.45, '#d8d8d0', { col: false });
    }
    { // N6 [220.3,226.4] 白色鐵皮管理棚（白鋼柱＋單斜浪板屋頂），棚下西邊三分之一是深灰色貨櫃屋；圍籬上掛告示牌，棚子西南角有藍色圓形 P 牌
      const k = seg(C, 1, 220.3, 226.4, 6.9), w = k.W;
      for (const x of [0, w - 0.12]) for (const z of [0, 6.4]) k.box(x, x + 0.12, 0, z ? 3.6 : 3.2, z, z + 0.12, '#eeeeee', { col: false });
      for (let j = 0; j < 4; j++) k.box(-0.3, w + 0.3, 3.2 + j * 0.13, 3.28 + j * 0.13, -0.4 + j * 1.75, 1.5 + j * 1.75, '#eeeeee', { col: false });
      k.box(-0.3, w + 0.3, 3.0, 3.2, -0.42, -0.36, '#eeeeee', { col: false });
      k.box(3.4, 5.9, 0, 2.5, 0.6, 3.2, '#3c3f42'); k.box(3.8, 4.7, 0, 2.0, 0.56, 0.6, '#55585c', { col: false });
      k.plane(parkNotice, 3.2, 1.5, 4.3, 1.2, -0.72, FRONT, { emissive: 0.15 }); for (const x of [2.9, 5.7]) k.box(x - 0.03, x + 0.03, 0, 1.95, -0.7, -0.64, '#8a8d90', { col: false });
      k.plane(C.roundSign('P', '#1f4fa8', '#ffffff'), 0.8, 0.8, w - 0.2, 3.1, -0.48, FRONT, { transparent: true, double: true, emissive: 0.3 });
    }
    { // s≈227 入口東側：大紅磚門柱正面貼直式「歡迎包月」，旁邊鐵桿掛藍底直式招牌「中原大學第一停車場」（離地 1～4.4 m）
      const k = seg(C, 1, 226.6, 228.6, 6.3);
      k.box(0.1, 0.7, -0.5, 1.5, 0, 0.6, '#9a5a48'); k.box(0.05, 0.75, 1.5, 1.6, -0.05, 0.65, '#c9c5ba', { col: false });
      k.plane(C.ROWT.vert('xzb2Mon', '#c8202a', '#ffffff', '歡迎包月'), 0.36, 1.25, 0.4, 0.72, -0.02, FRONT, { emissive: 0.2 });
      k.cyl(1.15, 0.45, 0.07, 0, 4.6, '#8a8d90', { seg: 6 }); k.box(1.12, 1.18, 1.0, 4.4, -0.2, 0.4, '#1a4390', { col: false });
      vsign(k, C.ROWT.vert('xzb2P1', '#1f4fa8', '#ffffff', '中原大學第一停車場'), 0.56, 3.4, 1.15, 2.7, 0.1);
    }
    { // N7 [228.6,234.2] 第一停車場出入口（寬約 5.6 m）：中間分隔島、黃色柵欄機、紅白柵欄桿，兩邊黃色防撞桿（車道留空）
      const k = seg(C, 1, 228.6, 234.2, 8.2), w = k.W;
      k.box(2.4, 3.2, -0.3, 0.18, 0, 4.2, '#c9c5ba');                                                              // 中央分隔島
      for (const [z, dir] of [[1.0, 1], [3.0, -1]]) {
        k.box(2.58, 3.02, 0.18, 1.3, z, z + 0.45, '#e8c21e'); k.box(2.56, 3.04, 1.3, 1.36, z - 0.02, z + 0.47, '#d8d8d0', { col: false });
        for (let j = 0; j < 4; j++) { const x0 = dir > 0 ? 3.02 + j * 0.55 : 2.58 - (j + 1) * 0.55; k.box(x0, x0 + 0.55, 1.0, 1.08, z + 0.19, z + 0.25, j % 2 ? '#f4f4f0' : '#c8202a', { col: false }); }
      }
      for (const x of [0.1, w - 0.3]) for (let z = 0.3; z < 3; z += 1.1) k.cyl(x, z, 0.08, 0, 0.9, '#e8c21e', { seg: 6 });
    }
    { // s≈234.6 入口西側：紅磚門柱（比圍籬柱高）正面也貼直式「歡迎包月」；門柱東南角一支藍色立柱，柱頂是藍底白字的圓形 P 牌（牌面垂直道路）
      const k = seg(C, 1, 234.2, 235.0, 6.3);
      k.box(0.1, 0.7, -0.5, 1.6, -0.02, 0.6, '#9a5a48'); k.box(0.05, 0.75, 1.6, 1.7, -0.05, 0.65, '#c9c5ba', { col: false });
      k.plane(C.ROWT.vert('xzb2Mon', '#c8202a', '#ffffff', '歡迎包月'), 0.36, 1.25, 0.4, 0.78, -0.04, FRONT, { emissive: 0.2 });
      k.box(-0.02, 0.1, 0, 2.3, -0.75, -0.3, '#2a62c4', { col: false }); k.cyl(0.04, -0.52, 0.2, 0, 0.12, '#8a8d90', { seg: 8 });
      for (const sd of [-1, 1]) k.plane(C.roundSign('P', '#1f4fa8', '#ffffff'), 0.8, 0.8, 0.04 + sd * 0.07, 2.65, -0.52, sd * Math.PI / 2, { transparent: true, emissive: 0.3 });
    }
    brickFence(234.45, 245.6, 6.3, (j) => (j ? true : 'bars'));                                                    // N8 圍籬：靠入口那格是藍灰色直條鐵欄杆（掛第二塊收費告示），其餘是灰色鐵網；第一根柱子包在門柱裡
    { const k = seg(C, 1, 235.3, 237.7, 6.3); k.plane(parkNotice, 2.4, 1.2, 1.2, 0.98, 0.14, FRONT, { emissive: 0.15 }); }
    { // s≈245 車道口的橘色方柱立牌（約 6 m 高，正面與側面嵌深灰色面板，面板上的白字看不清不寫）
      const p = seg(C, 1, 244.4, 245.4, 7.6);
      p.box(0.15, 0.85, 0, 6.0, 0, 0.7, '#e0622a'); p.box(0.1, 0.9, 6.0, 6.08, -0.05, 0.75, '#6f7275', { col: false });
      p.box(0.25, 0.75, 0.9, 5.2, -0.03, 0, '#4a4d52', { col: false }); p.box(0.85, 0.88, 0.9, 5.2, 0.1, 0.6, '#4a4d52', { col: false });
    }
    // N9 [246,254] 是校園車道，留空

    // ================= 南側 =================
    stoneFence(158.2, 163.0, 8.2, 1.3, 2.2);                                                                       // S1 石砌矮牆＋鐵欄杆
    { // S1 藍色海報看板、後面一棵大松樹、s≈159 的直式大招牌（掛在生鏽鋼桿的側面，離地 4～10.6 m，招牌面垂直道路）
      const k = seg(C, -1, 158.2, 163.0, 8.2);
      k.plane(blueBoard, 1.5, 1.2, k.sx(161.4), 1.75, -0.03, FRONT);
      tree(C, k, k.sx(160.4), 3.0, 9.5, 2.6, r);
      const x = k.sx(159.0); k.cyl(x, 1.2, 0.17, 0, 10.8, '#8a7466', { seg: 8 }); k.box(x - 0.03, x + 0.03, 3.95, 10.65, -0.42, 1.02, '#2c7a48', { col: false });
      vsign(k, kgSign, 1.4, 6.6, x, 7.3, 0.3);
    }
    { // S2 [163,170.4] 幼兒園大門：兩根石砌門柱（約 1.9 m，柱頂黑色庭園燈）＋白色鍛鐵拱門（中間最高約 2.8 m）
      const k = seg(C, -1, 163.0, 170.4, 8.5), w = k.W;
      for (const x of [0, w - 0.75]) { k.box(x, x + 0.75, -0.5, 1.9, 0, 0.75, '#8d8478'); k.plane(stone, 0.75, 1.9, x + 0.375, 0.95, -0.01, FRONT); k.box(x - 0.05, x + 0.8, 1.9, 2.0, -0.05, 0.8, '#6f675c', { col: false }); k.box(x + 0.28, x + 0.47, 2.0, 2.3, 0.28, 0.47, '#1c1c1e', { col: false }); ball(C, k, x + 0.375, 2.45, 0.375, 0.2, '#f4e9c0'); }
      k.plane(kgGate, w - 1.5, 2.8, w / 2, 1.4, 0.35, FRONT, { transparent: true, double: true }); k.wallRect(0.75, w - 0.75, 0.3, 0.4, 0, 2.0);
      k.box(0.75, w - 0.75, -0.3, 0.04, 0.4, 5, '#d8d4c8', { col: false });                                         // 門內白色碎石地坪
    }
    stoneFence(170.4, 184.5, 7.6, 1.1, 2.2);                                                                       // S4 亂石矮牆＋石柱＋鐵欄杆
    { // 黃色麋鹿（綠色鹿角、手上拿書）坐在大門西邊的高台上，腳離地約 3 m、鹿角頂約 7 m
      const k = seg(C, -1, 170.4, 172.6, 8.3), x = k.W / 2, Y = 1.2;
      const mb = (bx, by, bz, br, hex, sy, sx) => ball(C, k, bx, by + Y, bz, br, hex, sy, sx), bb = (x0, x1, y0, y1, z0, z1, m) => k.box(x0, x1, y0 + Y, y1 + Y, z0, z1, m, { col: false });
      k.box(x - 0.9, x + 0.9, -0.5, 1.5 + Y, 0.2, 1.7, '#8d8478'); k.plane(stone, 1.8, 1.5 + Y, x, (1.5 + Y) / 2, 0.19, FRONT);
      for (const sx of [-1.1, 0, 1.1]) ball(C, k, x + sx, 1.3, -0.1, 0.75, '#3f7a3a', 1.2);                          // 高台前面的灌木
      mb(x, 2.6, 0.8, 1.05, '#f2c230', 1.15); mb(x, 2.5, 0.35, 0.55, '#fbe9a8', 1.1);                                 // 身體、肚子
      for (const sx of [-0.55, 0.55]) { bb(x + sx - 0.22, x + sx + 0.22, 0.7, 1.9, -0.35, 0.15, '#f2c230'); bb(x + sx - 0.26, x + sx + 0.26, 0.45, 0.75, -0.5, 0.15, '#7a4a2c'); }
      mb(x, 4.25, 0.7, 0.85, '#f2c230'); mb(x, 4.0, 0.0, 0.48, '#f7d966', 0.8); mb(x, 4.12, -0.42, 0.14, '#7a2a2a');   // 頭、鼻吻、鼻子
      for (const sx of [-0.33, 0.33]) { mb(x + sx, 4.5, 0.02, 0.12, '#ffffff'); mb(x + sx, 4.5, -0.07, 0.06, '#1c1c1e'); mb(x + sx * 2.7, 4.7, 0.7, 0.26, '#f2c230', 0.6); }
      for (const sx of [-1, 1]) { bb(x + sx * 0.3 - 0.09, x + sx * 0.3 + 0.09, 4.9, 5.9, 0.6, 0.8, '#5a8a3a'); bb(x + sx * 0.3 + (sx > 0 ? 0 : -0.7), x + sx * 0.3 + (sx > 0 ? 0.7 : 0), 5.35, 5.52, 0.6, 0.8, '#5a8a3a'); bb(x + sx * 0.95 - 0.08, x + sx * 0.95 + 0.08, 5.35, 6.0, 0.6, 0.8, '#5a8a3a'); }
      bb(x - 0.55, x + 0.55, 2.3, 3.0, -0.38, -0.28, '#c8202a'); bb(x - 0.48, x + 0.48, 2.36, 2.94, -0.4, -0.38, '#f4f4f0');   // 書
      for (const sx of [-0.8, 0.8]) bb(x + sx - 0.16, x + sx + 0.16, 2.5, 3.3, -0.3, 0.5, '#f2c230');
    }
    { // 緊貼圍牆後面架起來的大紅布條（約 9×2 m，離地 2.6～4.6）
      const k = seg(C, -1, 175.4, 184.5, 8.2), w = k.W;
      k.plane(kgBanner, w, 2.0, w / 2, 3.6, 0, FRONT, { double: true, emissive: 0.1 });
      for (const x of [0.05, w / 2, w - 0.05]) k.box(x - 0.04, x + 0.04, 0, 4.7, 0.02, 0.1, '#8a8d90', { col: false });
    }
    { // S5 [184.5,188.2] 校車出入口（留空），裡面停一排黃色車身、綠色車頂的校車，場地西邊一棵樹
      const q = lcg(5);
      for (let j = 0; j < 3; j++) { const kk = seg(C, -1, 184.3 + j * 2.6, 186.6 + j * 2.6, 11.6 + q() * 0.6); car(kk, 0.1, 0, 5.2, 2.0, 2.1, '#f2c230', '#3fae6a', true); }
      const k = seg(C, -1, 183.4, 193.5, 11.2); k.box(0, k.W, -0.3, 0.03, 0, 7.6, '#5b5b5e', { col: false });      // 柏油場地
      const e = seg(C, -1, 184.5, 188.2, 6.3); e.box(0, e.W, -0.3, 0.03, 0, 4.95, '#5b5b5e', { col: false });       // 出入口的柏油
      tree(C, k, k.sx(192.4), 1.6, 8, 2.8, r);
    }
    { // S6 [188.2,194.6] 亂石砌擋牆（約 1.6 m）＋牆上鐵欄杆與樹籬、立在牆前的藍色公告欄、西端的圓形道路反射鏡
      const k = seg(C, -1, 188.2, 194.6, 7.4), w = k.W;
      k.box(0, w, -0.5, 1.6, 0, 1.0, '#8d8478'); k.plane(stone, w, 1.6, w / 2, 0.8, -0.01, FRONT); k.box(0.1, w - 0.1, 1.6, 2.3, 0.3, 0.95, '#3f7a3a', { col: false });
      k.plane(bars, w, 0.8, w / 2, 2.0, 0.12, FRONT, { transparent: true, double: true });
      const bx = k.sx(193.0); k.plane(blueBoard, 1.3, 1.5, bx, 1.15, -0.3, FRONT, { double: true }); for (const x of [bx - 0.6, bx + 0.6]) k.box(x - 0.03, x + 0.03, 0, 1.9, -0.31, -0.25, '#3b6fc4', { col: false });
      k.cyl(0.2, -0.2, 0.04, 0, 2.4, '#e07a2a', { seg: 6 }); k.plane(C.roundSign(' ', '#c9d4dc', '#e07a2a'), 0.75, 0.75, 0.2, 2.5, -0.26, FRONT, { transparent: true, double: true });
    }
    { // S7 的 4 道垂直磁磚壁柱（二樓到女兒牆頂）、窗下磁磚腰牆、高女兒牆、屋頂深色鐵皮棚架、門前紅色地磚平台（實景每層都高，女兒牆頂約 11.6 m）
      const k = seg(C, -1, 193.7, 199.9, 8.4), w = k.W, top = 3.6 + 2 * 3.4;
      k.box(0, w, top, top + 1.2, -0.05, 0.2, 'wall#ddd3bc', { col: false });
      for (let j = 0; j < 4; j++) { const x = 0.05 + j * (w - 0.3) / 3; k.box(x, x + 0.22, 3.6, top + 1.25, -0.35, 0, '#ddd3bc', { col: false }); }
      for (const y of [3.6, 7.0]) k.box(0.25, w - 0.25, y, y + 0.9, -0.1, 0, '#c4b89c', { col: false });
      for (const x of [0.5, w - 0.6]) for (const z of [1.5, 8]) k.box(x, x + 0.1, top, top + 3.3, z, z + 0.1, '#4a4038', { col: false });
      k.box(0.2, w - 0.2, top + 3.3, top + 3.4, 1.0, 8.6, '#4a4038', { col: false });
      k.box(0.2, w - 1.0, 0.05, 0.15, -1.6, 0, '#a8553f', { col: false });
    }
    { // S8 的陽台欄杆牆、屋頂前緣的紅瓦收邊、綠色屋頂與紅色水塔、整個用墨綠色帆布罩起來的車、盆栽與交通錐
      const k = seg(C, -1, 199.9, 208.4, 9.6), w = k.W, top = 9.3;
      for (const y of [3.3, 6.3]) { k.box(0.15, w - 0.15, y - 0.12, y + 0.95, -1.0, -0.85, '#ddd6c6', { col: false }); k.box(0.15, w - 0.15, y - 0.12, y, -1.0, 0, '#d0c9b9', { col: false }); for (const x of [0.15, w - 0.3]) k.box(x, x + 0.15, y, y + 0.95, -1.0, 0, '#ddd6c6', { col: false }); }
      k.box(0.15, w - 0.15, top - 0.1, top + 0.02, -1.0, 0, '#d0c9b9', { col: false });
      k.box(-0.05, w + 0.05, top + 0.12, top + 0.5, -1.05, -0.75, '#b5523a', { col: false }); k.box(-0.3, 0, top + 0.12, top + 0.5, -1.05, 6, '#b5523a', { col: false });
      k.box(0.2, w - 0.2, top + 0.13, top + 0.17, 0.2, 17.8, '#4f9a78', { col: false }); k.cyl(w - 2.2, 13, 0.7, top + 0.6, top + 2.0, '#b0342c', { seg: 10 }); for (const [x, z] of [[-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5]]) k.box(w - 2.2 + x - 0.04, w - 2.2 + x + 0.04, top + 0.13, top + 0.6, 13 + z - 0.04, 13 + z + 0.04, '#8a8d90', { col: false });
      k.box(3.3, 7.0, 0, 1.9, -4.0, -1.3, '#3d4a40'); k.box(3.4, 6.9, 1.9, 2.1, -3.9, -1.4, '#465449', { col: false });
      for (const x of [0.6, 1.4, 7.6]) { k.box(x, x + 0.4, 0, 0.35, -1.0, -0.6, '#9a5a48', { col: false }); ball(C, k, x + 0.2, 0.7, -0.8, 0.35, '#4b8a3e'); }
      for (const [x, z] of [[1.6, -4.3], [5.2, -4.5]]) k.cyl(x, z, 0.18, 0, 0.7, '#e0621e', { seg: 8, r1: 0.03 });
      for (let j = 0; j < 3; j++) k.plane(C.archWin, 1.3, 1.7, -0.03, 4.8, 4.5 + j * 4.5, -Math.PI / 2);             // 西側牆 3 扇拱形窗
    }
    { // S9 [208.4,213.4] 往後面專用停車場的車道：柏油，路口留空，裡面靠西邊停兩輛車
      const k = seg(C, -1, 208.5, 213.3, 6.3);
      k.box(0, k.W, -0.3, 0.03, 0, 16, '#5b5b5e', { col: false });
      car(k, 0.3, 7.5, 4.4, 1.8, 1.5, '#2a2a30', null, true); car(k, 0.3, 12.5, 4.4, 1.8, 1.5, '#8a8d90', null, true);
    }
    { // S10 樹籬島 [213.4,216.6]：修剪的綠籬、兩棵樹、島靠坡道那一角是白色圓形 WONDER TREE 招牌，島後面靠車道一支鐵桿燈箱立牌（上段藍底「專用停車場 P→」，下段紅底店家招牌讀不到字）
      const k = seg(C, -1, 213.4, 216.6, 7.0), w = k.W;
      k.box(0, w, -0.3, 0.25, 0, 2.6, '#c9c5ba'); k.box(0.15, w - 0.15, 0.25, 1.5, 0.15, 2.45, '#3f7a3a', { col: false });
      tree(C, k, 0.6, 1.8, 6.5, 1.8, r); tree(C, k, 1.5, 1.7, 5.0, 1.2, r);
      const x = k.sx(213.65); k.cyl(x, 0.65, 0.07, 0, 5.5, '#8a8d90', { seg: 6 });                                   // 立牌在島靠車道的東北角、樹的前面
      k.box(x - 0.06, x + 0.06, 3.55, 5.55, -0.15, 1.45, '#e9e9e4', { col: false });                                     // 燈箱本體（朝東那面是素面背板）
      k.plane(paint('專用停車場 P→', '#2a6fd0', '#ffffff', null, 1.5, 0.4, 128), 1.5, 0.4, x - 0.07, 5.3, 0.65, -Math.PI / 2, { emissive: 0.3 });   // 只有朝西那面有字
      k.plane(paint(' ', '#d8352e', '#ffffff', null, 1.5, 1.45, 32), 1.5, 1.45, x - 0.07, 4.33, 0.65, -Math.PI / 2, { emissive: 0.15 });           // 下半紅底的店家招牌，字被樹擋住讀不到，不寫
      const x2 = k.sx(216.2); k.cyl(x2, -0.15, 0.05, 0, 2.6, '#f4f4f0', { seg: 6 });
      k.plane(wonder, 1.3, 1.3, x2, 2.7, -0.22, FRONT, { transparent: true, double: true, emissive: 0.3 }); k.box(x2 - 0.5, x2 + 0.5, 1.5, 1.8, -0.2, -0.16, '#f4f4f0', { col: false });
    }
    // S11 遊戲資料的人行坡道口在 s 217～221：留空，坡道口放 3 個黃黑相間的 ㄇ 形車阻
    { const k = seg(C, -1, 218.6, 222.6, 6.6);
      for (let j = 0; j < 3; j++) { const x = 0.3 + j * 1.3, z = 1.7 - j * 0.9; for (let i = 0; i < 4; i++) { k.box(x, x + 0.07, i * 0.22, i * 0.22 + 0.22, z, z + 0.07, i % 2 ? '#1c1c1e' : '#e8c21e', { col: false }); k.box(x + 0.6, x + 0.67, i * 0.22, i * 0.22 + 0.22, z, z + 0.07, i % 2 ? '#1c1c1e' : '#e8c21e', { col: false }); } k.box(x, x + 0.67, 0.88, 0.95, z, z + 0.07, '#e8c21e', { col: false }); }
    }
    { // S12 [223.6,236] 2 m 多高的茂密綠籬（上緣不整齊）＋水泥電桿（有變壓器，s≈234.5）
      for (let a = 223.6; a < 235.9; a += 3.1) { const k = seg(C, -1, a, a + 3.1, 6.7); k.box(0, k.W, -0.3, 1.9, 0, 1.3, '#356b34'); for (let x = 0.4; x < k.W; x += 0.8) ball(C, k, x + r() * 0.3, 1.85 + r() * 0.3, 0.45 + r() * 0.4, 0.55 + r() * 0.2, r() < 0.5 ? '#3f7a3a' : '#356b34', 0.8); }
      const k = seg(C, -1, 234, 235, 5.9); k.cyl(0.5, 0, 0.16, 0, 9.5, '#a3a19b', { seg: 8, r1: 0.11 }); k.box(0.2, 0.8, 6.2, 7.1, -0.5, -0.1, '#8a8d90', { col: false }); k.box(-0.4, 1.4, 8.7, 8.78, -0.04, 0.04, '#8a8d90', { col: false });
    }
    { // S13 [236,250] 平面停車場：綠籬西端的鐵架掛紅白告示（字看不清），入口在 s 238～242，其餘是鐵管柱＋鐵網圍籬（約 1.8 m）
      for (let s = 242; s < 249.9; s += 2.65) { const k = seg(C, -1, s, s + 2.65, 6.7); k.plane(mesh, k.W, 1.7, k.W / 2, 0.9, 0.03, FRONT, { transparent: true, double: true }); for (const x of s < 243 ? [0, k.W - 0.06] : [0]) k.cyl(x + 0.03, 0.03, 0.035, 0, 1.85, '#8a8d90', { seg: 6 }); k.box(0, k.W, 1.75, 1.8, 0, 0.05, '#8a8d90', { col: false }); k.wallRect(0, k.W, 0, 0.06, 0, 1.8); }
      const k = seg(C, -1, 236.2, 237.6, 7.0); for (const x of [0.1, 1.2]) k.box(x, x + 0.05, 0, 2.2, 0.3, 0.35, '#8a8d90', { col: false });
      for (let j = 0; j < 3; j++) { k.box(0.1, 1.25, 0.6 + j * 0.52, 1.05 + j * 0.52, 0.27, 0.3, j % 2 ? '#c8202a' : '#f4f4f0', { col: false }); k.box(0.2, 1.15, 0.78 + j * 0.52, 0.86 + j * 0.52, 0.26, 0.27, j % 2 ? '#f4f4f0' : '#c8202a', { col: false }); }
      const q = lcg(19), cols = ['#c9c9c4', '#2a2a30', '#2f6db3'];
      for (let j = 0; j < 3; j++) { const kk = seg(C, -1, 243 + j * 2.5, 245 + j * 2.5, 9.2 + q() * 0.5); car(kk, 0.1, 0, 4.3, 1.75, 1.5, cols[j], null, true); }
    }
  },
  footprints(F) {
    return [
      F(R, 158, 163.3, 1, 6.6, 7, 0.3),      // N0b 矮牆與南洋杉
      F(R, 169.8, 179.4, 1, 7.2, 12.1, 1.2), // N2 車庫
      F(R, 179.4, 186.6, 1, 6.8, 3.0, 0.5),  // N3 鐵皮增建
      F(R, 195.9, 211.8, 1, 6.3, 11, 0.2),   // N5 圍籬、草地、大樹（照道路轉折分三段，才不會切到路面）
      F(R, 211.8, 218.8, 1, 6.3, 11, 1.4),   //   （含變電箱）
      F(R, 218.8, 226.6, 1, 6.3, 7.4, 0.2),  // N6 圍籬、管理棚
      F(R, 226.6, 228.6, 1, 6.3, 0.7, 0.2),  // 入口門柱與直式招牌
      F(R, 230.8, 232.0, 1, 8.2, 4.4, 0.2),  // N7 收費分隔島
      F(R, 234.2, 245.6, 1, 6.3, 0.6, 0.9),  // 入口西門柱、N8 圍籬、方柱立牌
      F(R, 158.2, 163, -1, 8.2, 2.2, 0.5),   // S1 石牆、招牌
      F(R, 163, 170.4, -1, 8.5, 5, 0.3),     // S2 大門
      F(R, 170.4, 184.5, -1, 7.6, 2.6, 0.3), // S4 石牆、麋鹿、布條
      F(R, 183.4, 193.5, -1, 11.2, 7.6, 0),  // S5 校車場
      F(R, 184.5, 188.2, -1, 6.3, 4.95, 0),  // S5 出入口
      F(R, 188.2, 194.6, -1, 7.4, 1.0, 0.4), // S6 擋牆
      F(R, 199.9, 208.4, -1, 9.6, 0.1, 4.6), // S8 前面罩著帆布的車
      F(R, 208.5, 213.3, -1, 6.3, 16, 0),    // S9 車道
      F(R, 213.4, 216.6, -1, 7.0, 2.7, 0.3), // S10 樹籬島
      F(R, 223.6, 238, -1, 6.7, 1.4, 0.9),   // S12 綠籬、電桿
      F(R, 242, 250, -1, 6.7, 7.5, 0.2),     // S13 圍籬與停的車
    ];
  },
};
