// 環中東路（校園東南側那段）與環中東路708巷兩側的街屋（照 Google 街景 2024-07／2026-05、國土測繪 2024 正射與 Google 衛星建模，只做外觀，不能進入）。
// 寫法比照 src/world/buildings/StreetZhongbei.js：每一格是 [ref, s0, s1, side, spec]
//   ref  參考線：'HN' 環中東路北側車道、'HS' 南側車道、'L8' 環中東路708巷（s=0 在環中東路巷口，往巷內走）
//   s    沿參考線由東往西量的公尺數；side +1 = 往西走的右手邊（HN 的北側／靠校園側），-1 = 左手邊（HS 的南側）
//   spec 欄位與 src/world/buildings/StreetZhongbei.js 相同（nf、gf、fh、d、wall、low、sign、ground、sh、awn、bal、glass、hood、vert、round、banner、
//        roof、bill、tin、arch、fins、big、sign2、noband、roofCol、door、tower、bikes、set）
//   另外加的通用選項：own '名稱'（這一格不蓋制式街屋，交給 buildHuanzhongStreet 裡 OWN[名稱] 的專用量體；座標、深度 d、保留範圍照樣用這一格）、
//        fp（自訂保留範圍，區域座標多邊形；楔形基地用）、pave（門前鋪紅磚人行道）、trees [x…]（行道樹）、mc [[x0,x1]…]（垂直停放的機車格）、poles [x…]（水泥電線桿）
// 每一格自成一個 Kit，立面對著街道；收尾用 finishRow 一次合併。
// 這個檔案不 import src/world/Interiors.js（Kit、材質、貼圖工具由 src/world/zones/Zones.js 呼叫 buildHuanzhongStreet 時從 X 傳進來），
// src/world/zones/Zones.js 直接 import 這裡的 HZ_ST.drop 與 hzFootprints() 來刪填充樓、保留空地。

// 參考線（data/cycu.json 的道路中心線，遊戲座標 x 東、z 南）
import { H } from '../Terrain.js';

export const HZ_REF = {
  HN: [[594.4, 80.3], [562.6, 105.5], [532.8, 129.6], [531.7, 130.5], [511.5, 146.5], [506.5, 150.5], [486.4, 166.5], [481.3, 170.4], [463.1, 184.8], [461.1, 186.4], [453.2, 192.7], [441, 202.4], [400.8, 234.6], [380.6, 250.5], [375.6, 254.5], [355.4, 270.5], [347.2, 277.1], [327, 293.5], [321.1, 298.3], [309.1, 307.8], [284.7, 327], [254.2, 351.3], [223, 376.4], [192.7, 400.9], [184, 407.6], [178, 412.6], [171.6, 417.7], [161.6, 426], [131.2, 450.4], [124.9, 455.1], [99.7, 474.9], [67.5, 500.5], [36.5, 523.8], [11.8, 543.1], [-0.3, 552.2], [-25.2, 570.9], [-49.9, 589.9], [-74.7, 608.9], [-99.5, 627.9], [-124.5, 646.5]],
  HS: [[576.6, 104.2], [527.6, 145.4], [519.5, 152.2], [512.5, 158], [487.4, 178.1], [469, 192.1], [447, 210], [406.8, 242.1], [386.5, 257.9], [362.2, 277.3], [339.9, 295.1], [315.6, 314.6], [277.4, 345], [246.5, 370.3], [215.2, 395.2], [184, 420.2], [173.5, 429.1], [156.2, 443.1], [131, 462.8], [105.8, 482.7], [78.8, 503.4], [74, 507], [42.6, 531.6], [17.8, 550.6], [6.2, 559.7], [-19.1, 578.8], [-44, 597.7], [-68.8, 616.7], [-93.6, 635.7], [-118.4, 654.5]],
  L8: [[309.1, 307.8], [301.5, 306.4], [283, 297.5], [274.8, 293.2], [260.5, 289], [244.7, 284.2], [235.3, 302.8], [232.8, 308.8], [198.6, 294.8], [194.3, 298.2], [169.5, 287.9], [165.4, 286.8], [160.9, 283], [156.2, 260.7], [153.6, 259.4], [139.1, 259], [130.2, 256.5], [116.3, 247.2], [113.5, 245.6], [110.9, 249.2], [96.3, 282.1], [87, 290.2], [79, 293.4]],
};
// 路寬的一半（data/cycu.json）：環中東路單側車道 7.4、708巷 5
const HALF = { HN: 3.7, HS: 3.7, L8: 2.5 };
// 立面離參考線的預設距離（各格可用 spec.set 覆寫）
const SET = { HN: 9.5, HS: 9.5, L8: 4.0 };

export const HZ_ST = {
  ownSign: ['YAMAHA', '19house炙燒牛排', '有魚兩棲爬蟲專賣店', '鳳味坊養生烏骨雞', '振宇五金'], // 街屋自己掛招牌的店名，POI 不再另外掛
  drop: [
    'f2_5', 'f2_6', 'f2_7', 'f2_8', 'f2_9', 'f2_10', 'f2_11', 'f2_12', 'f2_13', 'f2_14', 'f2_15', 'f2_16', 'f2_17', 'f2_18', 'f2_19', 'f2_20', 'f2_21', 'f2_22', 'f2_23', 'f2_24', 'f2_25', 'f2_46', 'f2_50', 'f2_53', 'f2_76', 'f2_77', 'f2_78', // A 段
  ],    // 被自建街屋取代的填充樓（全部是 synthetic，各自用自己的亂數，刪掉不影響別的東西）
  lots: [
    // ---- A 段：環中東路北側（靠校園側），708巷口往西到 s≈512（街景 2026-05，少數 2024-07；國土測繪 2024 正射）----
    // 全段沒有騎樓：立面離車道中心 12～12.5 m（鐵皮屋那排 10.5 m），前面是約 7.5 m 寬的紅磚人行道，靠車道那排是機車格與修成圓球的行道樹。
    // 實際只有 Yamaha、19 House、5 樓磁磚樓、7 樓辦公大樓、一排鐵皮屋、振宇五金、5 樓紅磚色樓；s 433～448.5 是貨櫃屋、車道、停車場與雜木空地
    ['HN', 376.5, 387.5, 1, { own: 'yamaha', set: 12, d: 15.5, fp: [[-0.1, -8.5], [11.1, -8.5], [11.1, 15.5], [7.6, 15.5], [0.2, 0]], pave: 1, trees: [4.5], mc: [[6.0, 10.7]] }], // 遊戲裡的 708 巷比實景偏西：東牆從 s375 退到 376.5，背面斜邊照遊戲的巷子切
    ['HN', 387.5, 400, 1, { own: 'house19', set: 12, d: 14.5, pave: 1, trees: [4.5], mc: [[0.3, 3.2], [6.0, 12.2]] }],
    ['HN', 400, 412.5, 1, { own: 'a3', set: 12, d: 13.5, pave: 1, trees: [4.0], mc: [[0.3, 2.7], [5.5, 12.2]] }],
    ['HN', 412.5, 433, 1, { own: 'a4', set: 12.5, d: 11.5, pave: 1, trees: [3.5, 15.5], mc: [[0.3, 2.2], [5.0, 14.2], [17.0, 20.2]] }],
    ['HN', 433, 448.5, 1, { own: 'gapA', set: 12, d: 23.5, pave: 1, trees: [10.2], poles: [11.4] }],
    ['HN', 448.5, 453, 1, { own: 'shedBlue', set: 10.5, d: 7.5, pave: 1, trees: [3.5], mc: [[0.3, 2.2]] }],
    ['HN', 453, 462, 1, { own: 'temple', set: 10.5, d: 7.5, pave: 1, mc: [[0.5, 8.6]] }],
    ['HN', 462, 471, 1, { own: 'tangfeng', set: 10.5, d: 7.5, pave: 1, trees: [1.0], mc: [[2.6, 8.6]] }],
    ['HN', 471, 474, 1, { own: 'a11', set: 12, d: 6, pave: 1 }],
    ['HN', 474, 490.5, 1, { own: 'zhenyu', set: 12.5, d: 17, pave: 1, trees: [4.0, 15.0], mc: [[9.5, 13.5]] }],
    ['HN', 490.5, 503.5, 1, { own: 'a13', set: 12.5, d: 21, pave: 1, trees: [10.5], poles: [9.4], mc: [[0.3, 8.6]] }],
    ['HN', 503.5, 511.5, 1, { own: 'jiayu', set: 13, d: 7.5, pave: 1, poles: [3.5], mc: [[4.5, 7.8]] }],
  ],
};
export function hzAt(ref, s) {
  const R = HZ_REF[ref]; let acc = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i], b = R[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= acc + L || i === R.length - 2) { const t = (s - acc) / L; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L }; }
    acc += L;
  }
}
// 每一格的區域座標：原點在立面線的起點，+x 沿立面（side -1 時朝 s 變小的方向，立面才對著街），+z 離開街道
export function hzLotFrame([ref, s0, s1, side, sp]) {
  const m = hzAt(ref, (s0 + s1) / 2), w = s1 - s0, nx = -m.uz * side, nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux, az = side > 0 ? m.uz : -m.uz;
  const set = (sp && sp.set) || SET[ref];
  return { ox: m.x + nx * set - ax * w / 2, oz: m.z + nz * set - az * w / 2, ang: Math.atan2(az, ax), w, apron: Math.min((sp && sp.apron) || 99, Math.max(0.6, set - HALF[ref])) };
}
export function hzFootprints() {
  return HZ_ST.lots.map((L) => {
    const { ox, oz, ang, w, apron } = hzLotFrame(L), c = Math.cos(ang), s = Math.sin(ang), d = L[4].d || 10;
    const p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    if (L[4].fp) return L[4].fp.map(([x, z]) => p(x, z));
    return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, d), p(-0.1, d)];
  });
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

export function buildHuanzhongStreet(I, scene, X) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS } = X;
  const { MR, FRONT, shopGlass, ac, win, shell } = rowTools();
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  // 單色的方塊（招牌底、雨棚、牆…）全部用頂點顏色畫在同一種材質上，一排房子只剩幾種材質，才不會有上百個 draw call：
  // 'VC' 是素色、'WVC' 是帶磁磚紋的牆；k.box / k.cyl 收到 #hex 或 'wall#hex' 就自動改成這兩種材質加頂點色
  const VC = def('zbVC', () => std({ vertexColors: true })), WVC = def('zbWVC', () => std({ map: YHT.facade(), vertexColors: true }));
  const MRW = { grime: MR.grime, brick: MR.brick, mosaic: MR.mosaic };
  const WALLC = { tile: '#f0efea', beige: '#eadfc6', grey: '#c9c8c2', pinkGrey: '#e3cfc9', stone: '#b9b7af', redbrown: '#b07a66' };
  // 磁磚貼面在日光下看起來比色票暗，深色與飽和色往白色提亮一點才像街景裡的樣子
  const lift = (hex, k = 0.22) => { const n = parseInt(hex.slice(1), 16), c = (s) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k); return `#${  [16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`; };
  const wallMat = (w) => (MRW[w] ? MRW[w] : WALLC[w] ? `wall${  WALLC[w]}` : w && w[0] === '#' ? `wall${  lift(w)}` : `wall${  WALLC.tile}`);
  const paintGeo = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  };
  const vcKit = (k) => {
    const kb = k.box.bind(k), kc = k.cyl.bind(k), hexOf = (m) => (typeof m !== 'string' ? null : m[0] === '#' ? m : m.startsWith('wall#') ? m.slice(4) : null);
    k.box = (x0, x1, y0, y1, z0, z1, mat, o) => { const h = hexOf(mat); return h ? paintGeo(kb(x0, x1, y0, y1, z0, z1, mat[0] === '#' ? VC : WVC, o), h) : kb(x0, x1, y0, y1, z0, z1, mat, o); };
    k.cyl = (x, z, r, y0, y1, mat, o) => { const h = hexOf(mat); return h ? paintGeo(kc(x, z, r, y0, y1, VC, o), h) : kc(x, z, r, y0, y1, mat, o); };
    return k;
  };
  // ---- textures ----
  // 招牌：一公尺 ppm 像素，字自動縮到放得下；text 可用 \n 分行；sub 小字；style 加上品牌色條
  const paint = (text, bg, fg, sub, wm, hm, ppm = 128, style) => {
    if (wm * ppm > 1536) ppm = 1536 / wm;
    const W = r16(wm * ppm), Hh = r16(hm * ppm);
    return sg(`hz_${text}|${bg}|${fg}|${sub || ''}|${W}x${Hh}|${style || ''}`, W, Hh, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
      if (style === 'seven') { const hs = Hh / 3; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, hs * 0.5); g.fillStyle = '#f26b21'; g.fillRect(0, hs * 0.5, W, hs * 0.5); g.fillStyle = '#00843d'; g.fillRect(0, hs, W, hs * 0.5); g.fillStyle = '#e2231a'; g.fillRect(0, hs * 1.5, W, hs * 0.5); g.fillStyle = '#ffffff'; g.fillRect(0, hs * 2, W, hs); }
      if (style === 'fam') { g.fillStyle = '#00a0e0'; g.fillRect(0, 0, W, Hh * 0.16); g.fillStyle = '#2fb34a'; g.fillRect(0, Hh * 0.16, W, Hh * 0.1); }
      if (style === 'frame') { g.strokeStyle = fg; g.lineWidth = Math.max(3, Hh * 0.04); g.strokeRect(Hh * 0.06, Hh * 0.06, W - Hh * 0.12, Hh * 0.88); }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = String(text).split('\n'), n = lines.length, avail = Hh * (sub ? 0.64 : 0.86) / n;
      const px = Math.min(avail * 0.92, W * 0.5);
      const fit = (t) => { let p = px; g.font = font(p); while (g.measureText(t).width > W * 0.94 && p > 10) { p -= 2; g.font = font(p); } return p; };
      const cy = sub ? Hh * 0.38 : Hh * 0.5;
      lines.forEach((t, i) => { fit(t); g.fillText(t, W / 2, cy + (i - (n - 1) / 2) * avail); });
      if (sub) { let p = Hh * 0.2; g.font = font(p, 700); while (g.measureText(sub).width > W * 0.94 && p > 9) { p -= 2; g.font = font(p, 700); } g.fillText(sub, W / 2, Hh * 0.82); }
    });
  };
  const roundSign = (text, bg, fg) => sg(`hzR_${text}|${bg}|${fg}`, 128, 128, (g) => {
    g.clearRect(0, 0, 128, 128); g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = fg; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; const t = [...text];
    if (t.length <= 2) { g.font = font(t.length === 1 ? 70 : 48); g.fillText(text, 64, 66); }
    else if (t.length <= 4) { g.font = font(40); g.fillText(t.slice(0, 2).join(''), 64, 44); g.fillText(t.slice(2).join(''), 64, 88); }
    else { let p = 34; g.font = font(p); while (g.measureText(text).width > 100 && p > 12) { p -= 2; g.font = font(p); } g.fillText(text, 64, 66); }
  });
  const shutterTex = (hex) => sg(`hzSh${  hex}`, 64, 64, (g) => {
    g.fillStyle = hex; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, y, 64, 3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y + 6, 64, 2); }
  });
  const openTex = sg('hzOpen', 256, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#4a4640'); gr.addColorStop(0.3, '#2a2724'); gr.addColorStop(1, '#161513'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
    g.fillStyle = 'rgba(255,248,225,.85)'; for (let x = 24; x < 256; x += 80) g.fillRect(x, 8, 36, 5);
    const r = lcg(41); for (let i = 0; i < 7; i++) { const x = 8 + i * 34 + r() * 8; g.fillStyle = ['#3a3a40', '#6a2a2a', '#2a4a6a', '#5a5a52'][i % 4]; g.fillRect(x, 96, 20, 44); g.fillRect(x - 4, 112, 28, 12); }
  });
  const archWin = sg('hzArchWin', 256, 160, (g) => { // 三井3C 的白色拱形鐵窗
    g.fillStyle = '#e8e8e4'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#566673'; g.fillRect(10, 10, 236, 140);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(14, 14, 100, 130);
    g.strokeStyle = '#f2f2ee'; g.lineWidth = 5;
    for (let i = 0; i < 3; i++) { const x0 = 14 + i * 77, x1 = x0 + 70; g.beginPath(); g.moveTo(x0, 148); g.lineTo(x0, 70); g.arc((x0 + x1) / 2, 70, 35, Math.PI, 0); g.lineTo(x1, 148); g.stroke(); g.beginPath(); g.moveTo((x0 + x1) / 2, 35); g.lineTo((x0 + x1) / 2, 148); g.stroke(); }
  });
  const archRow = sg('hzArchRow', 256, 64, (g) => { // 粉紅拱形女兒牆
    g.fillStyle = '#d8a0a0'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#efe0d8';
    for (let x = 6; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 58); g.lineTo(x, 28); g.arc(x + 10, 28, 10, Math.PI, 0); g.lineTo(x + 20, 58); g.closePath(); g.fill(); }
  });
  const litWin = (gr) => sg(`hzLit${  gr ? 1 : 0}`, 256, 160, (g) => { // 亮著燈的窗：暖色玻璃、窗簾，鐵窗版加欄杆
    g.fillStyle = '#d4d6d6'; g.fillRect(0, 0, 256, 160); const gl = g.createLinearGradient(0, 8, 0, 152); gl.addColorStop(0, '#f6e2a8'); gl.addColorStop(1, '#e0bd72');
    g.fillStyle = gl; g.fillRect(8, 8, 240, 144); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(14, 12, 50, 136);
    g.fillStyle = 'rgba(150,110,80,.45)'; g.fillRect(8, 8, 70, 144); g.fillRect(178, 8, 70, 144); g.fillStyle = '#d4d6d6'; g.fillRect(124, 0, 8, 160);
    if (gr) { g.fillStyle = '#3a3a3a'; for (let x = 22; x < 256; x += 30) g.fillRect(x, 0, 4, 160); g.fillRect(0, 76, 256, 4); }
  });
  const shopTex = (i) => ROWT.shop(`hz${  i}`, ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6], ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6], 300 + i * 3);

  const kits = [];
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, rot, col) => { // 一台機車，順著立面停（rot 0）或垂直立面（rot 1）
    if (rot) { k.box(x - 0.14, x + 0.14, 0.28, 0.62, z, z + 1.5, col, { col: false }); k.box(x - 0.1, x + 0.1, 0.62, 0.72, z + 0.45, z + 1.0, '#1c1c1e', { col: false }); k.box(x - 0.3, x + 0.3, 0.9, 0.96, z + 1.28, z + 1.34, '#1c1c1e', { col: false }); k.box(x - 0.08, x + 0.08, 0.0, 0.5, z + 0.05, z + 0.5, '#1c1c1e', { col: false }); k.box(x - 0.08, x + 0.08, 0.0, 0.5, z + 1.2, z + 1.45, '#1c1c1e', { col: false }); }
    else { k.box(x, x + 1.5, 0.28, 0.62, z - 0.14, z + 0.14, col, { col: false }); k.box(x + 0.45, x + 1.0, 0.62, 0.72, z - 0.1, z + 0.1, '#1c1c1e', { col: false }); k.box(x + 1.28, x + 1.34, 0.9, 0.96, z - 0.3, z + 0.3, '#1c1c1e', { col: false }); k.box(x + 0.05, x + 0.5, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', { col: false }); k.box(x + 1.2, x + 1.45, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', { col: false }); }
  };

  // ---- 非制式量體（spec.own）共用的小工具：招牌畫布、直立側招、樹、汽車、鐵塔招牌架、多邊形柱 ----
  const nb = { col: false };
  const fitText = (g, t, x, y, maxW, px, col, wgt = 900, align = 'center') => { g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; let p = px; g.font = font(p, wgt); while (g.measureText(t).width > maxW && p > 8) { p -= 1; g.font = font(p, wgt); } g.fillText(t, x, y); };
  const board = (key, wm, hm, draw, ppm = 96) => { if (wm * ppm > 1536) ppm = 1536 / wm; const W = r16(wm * ppm), Hh = r16(hm * ppm); return sg(`hzB_${key}`, W, Hh, (g) => draw(g, W, Hh)); };
  const vtex = (text, bg, fg, wm, hm, cap) => board(`v_${text}|${bg}|${fg}|${wm}x${hm}|${cap || ''}`, wm, hm, (g, W, Hh) => { // 直寫的招牌面，cap = 頂端圓形標誌的顏色
    g.fillStyle = bg; g.fillRect(0, 0, W, Hh); const t = [...text], top = cap ? W : 0, ch = (Hh - top - W * 0.1) / t.length;
    if (cap) { g.fillStyle = cap; g.beginPath(); g.arc(W / 2, W / 2, W * 0.36, 0, 7); g.fill(); }
    t.forEach((c, j) => fitText(g, c, W / 2, top + W * 0.05 + ch * (j + 0.5), W * 0.86, Math.min(W * 0.8, ch * 0.92), fg));
  }, 128);
  // 凸出牆面的直立側招（兩面都有字）：x 沿立面的位置、y0 底、hm 高、zc 招牌中心離立面（負值 = 伸到街上）、wm 寬
  const vsign = (k, text, bg, fg, x, y0, hm, zc, wm = 0.9, cap) => { const t = vtex(text, bg, fg, wm, hm, cap); for (const sd of [-1, 1]) k.plane(t, wm, hm, x + sd * 0.07, y0 + hm / 2, zc, sd * Math.PI / 2, { emissive: 0.3 }); k.box(x - 0.06, x + 0.06, y0, y0 + hm, zc - wm / 2, zc + wm / 2, bg, nb); };
  const hsign = (k, tex, wm, hm, x, y, z = -0.14, em = 0.35) => { k.box(x - wm / 2 - 0.05, x + wm / 2 + 0.05, y - hm / 2 - 0.05, y + hm / 2 + 0.05, z + 0.02, 0, '#3a3d42', nb); k.plane(tex, wm, hm, x, y, z, FRONT, { emissive: em }); };
  const blob = (k, x, y, z, s, hex) => { const g = new THREE.SphereGeometry(s, 7, 5); g.translate(x, y, z); k._part(VC, paintGeo(g, hex)); };
  const tree = (k, x, z, h, s, r) => { k.cyl(x, z, 0.14 + s * 0.05, 0, h, '#6a4a30', { seg: 6, col: true }); for (const [dx, dy, dz, q] of [[0, h + s * 0.35, 0, 1], [-s * 0.6, h - s * 0.25, s * 0.25, 0.8], [s * 0.65, h - s * 0.1, -s * 0.15, 0.85]]) blob(k, x + dx, dy, z + dz, s * q, r() < 0.5 ? '#3f7a3a' : '#4b8a3e'); };
  const car = (k, x, z, hex) => { k.box(x, x + 1.8, 0.3, 0.95, z, z + 4.3, hex); k.box(x + 0.12, x + 1.68, 0.95, 1.48, z + 1.0, z + 3.3, '#2a2d33', nb); for (const zz of [0.55, 3.15]) k.box(x - 0.03, x + 1.83, 0, 0.62, z + zz, z + zz + 0.62, '#1c1c1e', nb); };
  const lattice = (k, x, z, y0, h, s = 0.8) => { for (const [dx, dz] of [[0, 0], [s, 0], [0, s], [s, s]]) k.box(x + dx - 0.03, x + dx + 0.03, y0, y0 + h, z + dz - 0.03, z + dz + 0.03, '#6a6d70', nb); for (let y = y0 + 0.6; y <= y0 + h; y += 0.9) { k.box(x, x + s, y, y + 0.05, z - 0.03, z + 0.03, '#6a6d70', nb); k.box(x, x + s, y, y + 0.05, z + s - 0.03, z + s + 0.03, '#6a6d70', nb); k.box(x - 0.03, x + 0.03, y, y + 0.05, z, z + s, '#6a6d70', nb); k.box(x + s - 0.03, x + s + 0.03, y, y + 0.05, z, z + s, '#6a6d70', nb); } };
  const polyPrism = (k, pts, y0, y1, hex) => { // 凸多邊形柱（區域座標 [x,z]）：楔形基地用；跟 k.box 一樣併進頂點色材質
    const pos = [], nor = [], idx = [], n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n, cz = pts.reduce((s, p) => s + p[1], 0) / n;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); let nx = dz / L, nz = -dx / L;
      const flip = ((a[0] + b[0]) / 2 - cx) * nx + ((a[1] + b[1]) / 2 - cz) * nz < 0; if (flip) { nx = -nx; nz = -nz; }
      const v = pos.length / 3; pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]); for (let j = 0; j < 4; j++) nor.push(nx, 0, nz);
      if (flip) idx.push(v, v + 1, v + 2, v, v + 2, v + 3); else idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
    }
    const t0 = pos.length / 3; for (const p of pts) { pos.push(p[0], y1, p[1]); nor.push(0, 1, 0); }
    for (let i = 1; i < n - 1; i++) { const a = pts[0], b = pts[i], c = pts[i + 1], up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]); if (up > 0) idx.push(t0, t0 + i, t0 + i + 1); else idx.push(t0, t0 + i + 1, t0 + i); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.setIndex(idx);
    return k._part(VC, paintGeo(g, hex));
  };
  // 紅磚人行道鋪面（spec.pave）
  const PAVE = def('hzPave', () => { const t = sg('hzPaveT', 128, 128, (g) => { g.fillStyle = '#8f8a82'; g.fillRect(0, 0, 128, 128); const r = lcg(77); for (let y = 0; y < 8; y++) for (let x = -1; x < 4; x++) { const v = r(); g.fillStyle = v < 0.33 ? '#a9584a' : v < 0.66 ? '#b06150' : '#9f5145'; g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return std({ map: t, roughness: 0.95 }); });
  // 每一格門前的人行道：鋪面（pave = 紅磚）、行道樹（trees：x 位置，種在離車道中心 6 m 的樹穴）、垂直停放的機車格（mc：[x0,x1] 區段）、水泥電線桿（poles）
  const street = (k, w, apron, set, sp, r) => {
    if (!sp.pave) k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
    else { // 人行道有 7～8 m 寬，地形有起伏：鋪面做成貼著地形的網格（高出地面 6 cm），才不會被草地穿出來
      const nx = Math.max(1, Math.ceil(w / 1.5)), nz = Math.max(1, Math.ceil(apron / 1.5)), pos = [], uv = [], idx = [];
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = w * i / nx, z = -apron + (apron + 0.3) * j / nz, [wx, wz] = k.w(x, z); pos.push(x, Math.max(H(wx, wz) - k.base + 0.06, j === nz ? 0.02 : -9), z); uv.push(x / 1.6, z / 1.6); }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); k._part(PAVE, g);
    }
    for (const x of sp.trees || []) { tree(k, x, 6 - set, 3.2, 1.15, r); k.box(x - 0.7, x + 0.7, 0.05, 0.07, 5.3 - set, 6.7 - set, '#6b5a44', nb); }
    for (const [x0, x1] of sp.mc || []) for (let x = x0; x <= x1 + 0.01; x += 0.95) { k.box(x - 0.03, x + 0.03, 0.05, 0.065, 4.7 - set, 6.7 - set, '#e8e8e4', nb); if (x + 0.95 <= x1 + 0.01 && r() < 0.62 && !(sp.trees || []).some((t) => Math.abs(t - x - 0.47) < 1.0)) bike(k, x + 0.47, 4.9 - set, 1, bikeCols[(r() * 6) | 0]); }
    for (const x of sp.poles || []) { k.cyl(x, 5 - set, 0.17, 0, 9.5, '#b9b6ae', { seg: 8, col: true, r1: 0.12 }); for (let j = 0; j < 6; j++) k.cyl(x, 5 - set, 0.185, 0.2 + j * 0.3, 0.5 + j * 0.3, j % 2 ? '#1c1c1e' : '#f2c230', { seg: 8 }); k.box(x - 0.9, x + 0.9, 8.6, 8.7, 4.95 - set, 5.05 - set, '#8a8d90', nb); }
  };
  // ---- A 段（環中東路北側，708巷口往西）專用的貼圖 ----
  const darkGl = sg('hzDarkGl', 256, 128, (g) => { g.fillStyle = '#17191b'; g.fillRect(0, 0, 256, 128); for (let i = 0; i < 4; i++) { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#46545c'); gr.addColorStop(0.55, '#2a3238'); gr.addColorStop(1, '#1d2226'); g.fillStyle = gr; g.fillRect(i * 64 + 3, 4, 58, 120); g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(i * 64 + 8, 6, 14, 116); } });
  const darkShop = sg('hzDarkShop', 256, 160, (g) => { g.fillStyle = '#141516'; g.fillRect(0, 0, 256, 160); for (let i = 0; i < 3; i++) { const x = i * 85 + 3, gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#3a332a'); gr.addColorStop(0.5, '#2a2622'); gr.addColorStop(1, '#1a1a1a'); g.fillStyle = gr; g.fillRect(x, 4, 80, 152); g.fillStyle = 'rgba(255,214,150,.75)'; g.fillRect(x + 14, 22, 10, 6); g.fillRect(x + 52, 30, 10, 6); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 6, 6, 18, 148); } });
  const bandWin = sg('hzBandWin', 512, 96, (g) => { g.fillStyle = '#c4c9c7'; g.fillRect(0, 0, 512, 96); for (let i = 0; i < 8; i++) { const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, '#b4c9c1'); gr.addColorStop(1, '#7f9c95'); g.fillStyle = gr; g.fillRect(i * 64 + 3, 5, 58, 86); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(i * 64 + 8, 7, 12, 82); } });
  const curtain = sg('hzCurtain', 128, 768, (g) => { // 720 號大樓的玻璃帷幕直帶：白色格框、淺綠玻璃、頂端半圓拱
    g.clearRect(0, 0, 128, 768); g.beginPath(); g.moveTo(0, 768); g.lineTo(0, 64); g.arc(64, 64, 64, Math.PI, 0); g.lineTo(128, 768); g.closePath(); g.save(); g.clip(); g.fillStyle = '#eef0ee'; g.fillRect(0, 0, 128, 768);
    for (let y = 0; y < 768; y += 32) for (let x = 0; x < 4; x++) { g.fillStyle = ((y / 32) * 3 + x) % 7 === 0 ? '#86a39a' : '#a4bdb4'; g.fillRect(x * 32 + 3, y + 3, 26, 26); } g.restore();
  });
  const listings = sg('hzListings', 256, 128, (g) => { g.fillStyle = '#2a332e'; g.fillRect(0, 0, 256, 128); const r = lcg(9); for (let y = 0; y < 5; y++) for (let x = 0; x < 12; x++) { g.fillStyle = r() < 0.2 ? '#f2d86a' : '#f4f4ee'; g.fillRect(6 + x * 21, 8 + y * 23, 17, 19); g.fillStyle = '#c0392b'; g.fillRect(8 + x * 21, 10 + y * 23, 13, 4); } });
  const scooter = (g, cx, cy, s, col) => { g.fillStyle = '#1c1c1e'; for (const dx of [-1, 1]) { g.beginPath(); g.arc(cx + dx * s * 0.9, cy + s * 0.45, s * 0.3, 0, 7); g.fill(); } g.fillStyle = col; g.beginPath(); g.moveTo(cx - s * 1.15, cy + s * 0.2); g.lineTo(cx - s * 0.7, cy - s * 0.35); g.lineTo(cx + s * 0.2, cy - s * 0.3); g.lineTo(cx + s * 0.55, cy - s * 0.95); g.lineTo(cx + s * 0.8, cy - s * 0.95); g.lineTo(cx + s * 1.1, cy + s * 0.3); g.lineTo(cx - s * 0.2, cy + s * 0.45); g.closePath(); g.fill(); };
  const yamSign = board('yamSign', 10.5, 1.3, (g, W, Hh) => { // 白底、下緣紅帶，紅色音叉圓標＋YAMAHA，右邊小字
    g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#d8262c'; g.fillRect(0, Hh * 0.84, W, Hh * 0.16);
    const cx = W * 0.2, cy = Hh * 0.42, R = Hh * 0.3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.strokeStyle = '#f0f0f0'; g.lineWidth = R * 0.16; for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a * 2.094) * R * 0.8, cy - Math.cos(a * 2.094) * R * 0.8); g.stroke(); }
    fitText(g, 'YAMAHA', W * 0.36, cy, W * 0.24, Hh * 0.62, '#d8262c'); g.fillStyle = '#2a5fd0'; g.beginPath(); g.arc(W * 0.62, cy, Hh * 0.2, 0, 7); g.fill(); fitText(g, '機車排氣檢驗站', W * 0.8, cy, W * 0.28, Hh * 0.36, '#111111');
  });
  const yamAds = board('yamAds', 10.5, 2.1, (g, W, Hh) => { // 三幅機車廣告照片（字看不清，只畫色塊與機車）
    const P = [['#d9d9d6', '#b9bbbd', '#1f2124'], ['#1f4f9a', '#3f86d8', '#f2f2f2'], ['#f2f2ee', '#dfe3e6', '#8a8f96']];
    P.forEach(([c0, c1, sc], j) => { const x = j * W / 3, gr = g.createLinearGradient(x, 0, x + W / 3, Hh); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x + 3, 3, W / 3 - 6, Hh - 6); scooter(g, x + W / 6 + (j === 2 ? -W * 0.04 : 0), Hh * 0.62, Hh * 0.3, sc); });
    g.fillStyle = '#3a3a3a'; g.fillRect(W * 0.07, Hh * 0.2, Hh * 0.12, Hh * 0.62); for (const dx of [0.25, 0.28, 0.3]) { g.fillStyle = '#6a5a52'; g.fillRect(W * (0.66 + dx - 0.02), Hh * 0.3, Hh * 0.1, Hh * 0.55); }
  });
  const yamShow = sg('hzYamShow', 256, 192, (g) => { g.fillStyle = '#e9e6df'; g.fillRect(0, 0, 256, 192); g.fillStyle = '#b9b5ac'; g.fillRect(0, 130, 256, 62); g.fillStyle = 'rgba(255,255,255,.9)'; for (let x = 20; x < 256; x += 70) g.fillRect(x, 10, 40, 6); scooter(g, 60, 140, 30, '#2a2a30'); scooter(g, 150, 146, 32, '#b02a2a'); scooter(g, 220, 138, 26, '#2f6db3'); });
  const sanluPoster = board('sanlu', 2.6, 2.2, (g, W, Hh) => { // 米色海報：一杯奶茶、「鮮奶」「麻薯飲」、紅印章、「三露 奶茶舖」
    g.fillStyle = '#e9d3b5'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#f6efe2'; g.beginPath(); g.moveTo(W * 0.14, Hh * 0.3); g.lineTo(W * 0.5, Hh * 0.3); g.lineTo(W * 0.44, Hh * 0.82); g.lineTo(W * 0.2, Hh * 0.82); g.closePath(); g.fill();
    g.fillStyle = '#b98a5e'; g.beginPath(); g.moveTo(W * 0.155, Hh * 0.42); g.lineTo(W * 0.485, Hh * 0.42); g.lineTo(W * 0.44, Hh * 0.82); g.lineTo(W * 0.2, Hh * 0.82); g.closePath(); g.fill(); g.fillStyle = '#5a3a2a'; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(W * (0.24 + j * 0.04), Hh * 0.77, W * 0.018, 0, 7); g.fill(); }
    fitText(g, '鮮奶', W * 0.74, Hh * 0.2, W * 0.4, Hh * 0.17, '#5a3a2a'); fitText(g, '麻薯飲', W * 0.74, Hh * 0.42, W * 0.44, Hh * 0.17, '#5a3a2a'); g.fillStyle = '#c0392b'; g.fillRect(W * 0.66, Hh * 0.56, W * 0.16, W * 0.16); fitText(g, '三露 奶茶舖', W * 0.5, Hh * 0.91, W * 0.8, Hh * 0.1, '#5a3a2a', 700);
  });
  const sanluSign = board('sanluS', 2.6, 0.6, (g, W, Hh) => { g.fillStyle = '#222222'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(W / 2, Hh * 0.3, Hh * 0.22, Hh * 0.12, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(W / 2 + Hh * 0.18, Hh * 0.28); g.lineTo(W / 2 + Hh * 0.36, Hh * 0.2); g.lineTo(W / 2 + Hh * 0.2, Hh * 0.36); g.fill(); fitText(g, 'SANLU', W / 2, Hh * 0.72, W * 0.5, Hh * 0.3, '#ffffff', 700); });
  const fwSign = board('fengwei', 5.8, 1.0, (g, W, Hh) => { // 紅底白字「鳳味坊 [黃底公雞圓標] 烏骨雞」，下排訂購專線
    g.fillStyle = '#b3262b'; g.fillRect(0, 0, W, Hh); fitText(g, '鳳味坊', W * 0.22, Hh * 0.42, W * 0.36, Hh * 0.62, '#ffffff'); fitText(g, '烏骨雞', W * 0.78, Hh * 0.42, W * 0.36, Hh * 0.62, '#ffffff');
    g.fillStyle = '#f2c230'; g.beginPath(); g.arc(W / 2, Hh * 0.42, Hh * 0.33, 0, 7); g.fill(); g.fillStyle = '#5a2a1a'; g.beginPath(); g.ellipse(W / 2, Hh * 0.46, Hh * 0.17, Hh * 0.13, 0, 0, 7); g.fill(); g.beginPath(); g.arc(W / 2 + Hh * 0.13, Hh * 0.3, Hh * 0.08, 0, 7); g.fill(); g.fillStyle = '#c0392b'; g.fillRect(W / 2 + Hh * 0.1, Hh * 0.18, Hh * 0.07, Hh * 0.06);
    fitText(g, '訂購專線：456-0159', W / 2, Hh * 0.88, W * 0.5, Hh * 0.16, '#ffffff', 700);
  });
  const zsSign = board('zhushang', 7.0, 1.3, (g, W, Hh) => { // 深綠底白字「住商不動產」，最左邊白底綠字方形標誌，右側小字
    g.fillStyle = '#1f5a3c'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#ffffff'; g.fillRect(Hh * 0.12, Hh * 0.12, Hh * 0.95, Hh * 0.76); fitText(g, '住商', Hh * 0.6, Hh * 0.35, Hh * 0.8, Hh * 0.34, '#1f5a3c'); fitText(g, '不動產', Hh * 0.6, Hh * 0.68, Hh * 0.8, Hh * 0.26, '#1f5a3c');
    fitText(g, '住商不動產', W * 0.47, Hh * 0.5, W * 0.46, Hh * 0.66, '#ffffff'); fitText(g, '中壢後站加盟店', W * 0.86, Hh * 0.32, W * 0.25, Hh * 0.2, '#ffffff', 700); fitText(g, '03-271-1577', W * 0.86, Hh * 0.64, W * 0.25, Hh * 0.24, '#ffffff', 700);
  });
  const blueBoard = board('a8blue', 4.3, 2.8, (g, W, Hh) => { // 藍底看板：黃白字與竹葉（店名看不清，只畫色塊，不寫字）
    g.fillStyle = '#3f66b0'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#3f9a5a'; g.lineWidth = Hh * 0.025; for (let j = 0; j < 6; j++) { g.beginPath(); g.moveTo(W * (0.04 + j * 0.03), Hh * 0.05); g.lineTo(W * (0.12 + j * 0.04), Hh * (0.3 + j * 0.03)); g.stroke(); }
    g.fillStyle = '#f2d23a'; g.fillRect(W * 0.3, Hh * 0.14, W * 0.42, Hh * 0.16); g.fillStyle = '#f4f4f0'; for (let j = 0; j < 3; j++) g.fillRect(W * 0.12, Hh * (0.42 + j * 0.13), W * (0.6 - j * 0.08), Hh * 0.06); g.fillStyle = '#f4f4f0'; g.fillRect(W * 0.78, Hh * 0.6, W * 0.16, W * 0.16); g.fillStyle = '#f2d23a'; g.fillRect(W * 0.12, Hh * 0.84, W * 0.5, Hh * 0.07);
  });
  const templeBoard = board('xuanlong', 8.5, 2.6, (g, W, Hh) => { // 紅底黃字「玄龍宮」，下排「濟公禪師 王母娘娘」，左側龍的彩繪、上排四幅神像、右側卡通濟公
    g.fillStyle = '#c8281e'; g.fillRect(0, 0, W, Hh); const gr = g.createLinearGradient(0, 0, W * 0.24, Hh); gr.addColorStop(0, '#2a3f7a'); gr.addColorStop(1, '#8fb0d8'); g.fillStyle = gr; g.fillRect(Hh * 0.04, Hh * 0.04, W * 0.24, Hh * 0.92);
    g.strokeStyle = '#f4f0e0'; g.lineWidth = Hh * 0.07; g.beginPath(); g.moveTo(W * 0.04, Hh * 0.75); g.bezierCurveTo(W * 0.1, Hh * 0.2, W * 0.16, Hh * 0.9, W * 0.22, Hh * 0.3); g.stroke(); g.fillStyle = '#f4f0e0'; g.beginPath(); g.arc(W * 0.22, Hh * 0.28, Hh * 0.09, 0, 7); g.fill();
    for (let j = 0; j < 4; j++) { g.fillStyle = ['#f2e2c0', '#e8c890', '#f0d8b0', '#e0b880'][j]; g.fillRect(W * (0.3 + j * 0.09), Hh * 0.05, W * 0.075, Hh * 0.3); g.fillStyle = ['#7a2a2a', '#2a4a7a', '#7a5a2a', '#4a2a6a'][j]; g.fillRect(W * (0.315 + j * 0.09), Hh * 0.17, W * 0.045, Hh * 0.18); }
    fitText(g, '玄龍宮', W * 0.52, Hh * 0.56, W * 0.42, Hh * 0.4, '#f6d23a'); fitText(g, '濟公禪師 王母娘娘', W * 0.52, Hh * 0.88, W * 0.42, Hh * 0.13, '#f6d23a', 700);
    g.fillStyle = '#f2d8b8'; g.beginPath(); g.arc(W * 0.88, Hh * 0.5, Hh * 0.2, 0, 7); g.fill(); g.fillStyle = '#2a2a4a'; g.fillRect(W * 0.88 - Hh * 0.22, Hh * 0.16, Hh * 0.44, Hh * 0.18); g.fillStyle = '#f4f4f0'; g.fillRect(W * 0.88 - Hh * 0.2, Hh * 0.7, Hh * 0.4, Hh * 0.26);
  });
  const templeDoor = sg('hzTempleDoor', 256, 256, (g) => { g.fillStyle = '#3a2a22'; g.fillRect(0, 0, 256, 256); for (const x of [6, 132]) { g.fillStyle = '#5a4a3a'; g.fillRect(x, 6, 118, 244); g.fillStyle = '#e8b83a'; g.beginPath(); g.arc(x + 59, 150, 34, 0, 7); g.fill(); g.fillStyle = '#b8442a'; g.beginPath(); g.arc(x + 59, 150, 20, 0, 7); g.fill(); } });
  const tfBoard = board('tangfeng', 8.8, 2.4, (g, W, Hh) => { // 黃底：紅字「唐風」紫字「采」紅字「廣告」，一列藍底白字小方塊，最下排紅字電話
    g.fillStyle = '#f4c21f'; g.fillRect(0, 0, W, Hh); [...'唐風采廣告'].forEach((c, j) => fitText(g, c, W * (0.12 + j * 0.19), Hh * 0.32, W * 0.17, Hh * 0.52, j === 2 ? '#6a3fb0' : '#d42a20'));
    ['廣告看板', '帆布', '大圖輸出', 'LED字幕機'].forEach((t, j) => { g.fillStyle = '#2a4fa8'; g.fillRect(W * (0.04 + j * 0.24), Hh * 0.62, W * 0.2, Hh * 0.13); fitText(g, t, W * (0.14 + j * 0.24), Hh * 0.69, W * 0.18, Hh * 0.1, '#ffffff', 700); });
    fitText(g, '0988-137886', W * 0.26, Hh * 0.88, W * 0.42, Hh * 0.17, '#d42a20'); fitText(g, '0971-489550', W * 0.74, Hh * 0.88, W * 0.42, Hh * 0.17, '#d42a20');
  });
  const zySign = board('zhenyu', 9.5, 1.2, (g, W, Hh) => { // 亮藍底白字「振宇五金 ZhenYu Hardware」＋白色膠囊 since1989
    g.fillStyle = '#2f8fd6'; g.fillRect(0, 0, W, Hh); fitText(g, '振宇五金', W * 0.3, Hh * 0.45, W * 0.44, Hh * 0.7, '#ffffff'); fitText(g, 'ZhenYu Hardware', W * 0.75, Hh * 0.3, W * 0.42, Hh * 0.36, '#ffffff', 800);
    g.fillStyle = '#ffffff'; const cw = W * 0.17, chh = Hh * 0.24, x0 = W * 0.78, y0 = Hh * 0.56; g.beginPath(); g.arc(x0, y0 + chh / 2, chh / 2, Math.PI / 2, Math.PI * 1.5); g.arc(x0 + cw, y0 + chh / 2, chh / 2, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill(); fitText(g, 'since1989', x0 + cw / 2, y0 + chh / 2, cw, chh * 0.8, '#2f8fd6', 800);
  });
  const jyBoard = board('jiayu', 5.0, 1.7, (g, W, Hh) => { // 藍底白字：左邊直寫大字「佳語」，中間三排服務項目，下排電話
    g.fillStyle = '#2a4fa0'; g.fillRect(0, 0, W, Hh); fitText(g, '佳', W * 0.1, Hh * 0.27, W * 0.17, Hh * 0.44, '#ffffff'); fitText(g, '語', W * 0.1, Hh * 0.72, W * 0.17, Hh * 0.44, '#ffffff');
    ['房屋修繕 塑膠地板', '裝潢 油漆 木作 拆除', '水電 衛浴 防水 窗簾'].forEach((t, j) => fitText(g, t, W * 0.6, Hh * (0.15 + j * 0.2), W * 0.74, Hh * 0.17, '#ffffff', 800)); fitText(g, '0986-834-965', W * 0.6, Hh * 0.82, W * 0.7, Hh * 0.2, '#ffffff');
  });
  // 鐵皮屋的殼：浪板牆、屋簷上方一片立起來的山牆（背後撐看板）、往後傾的屋頂
  const tin = (k, w, d, eave, topY, roofCol) => { k.box(0, w, -0.8, eave, 0, d, '#d8d8d2'); k.box(0, w, eave, topY, 0, 0.14, '#d8d8d2', nb); k.box(-0.12, w + 0.12, eave + 0.45, eave + 0.55, 0.14, d * 0.5, roofCol, nb); k.box(-0.12, w + 0.12, eave, eave + 0.1, d * 0.5, d + 0.12, roofCol, nb); k.box(-0.02, w + 0.02, eave, eave + 0.45, d * 0.5 - 0.05, d * 0.5, '#d8d8d2', nb); };

  // ---- 專用量體（spec.own 指到這裡）：k 是那一格的 Kit（+x 沿立面往西、+z 往屋內）、w 寬、d 深、r 亂數、i 格子序號 ----
  const OWN = {
    // A1 Yamaha 機車行（街景 2026-05）：2 層樓高的白色鐵皮店面，楔形基地（背面斜邊貼著 708 巷），一樓整面玻璃、白底紅字橫招、
    // 橫招上方三幅機車廣告看板、頂緣深灰鐵皮；屋頂西南角鋼架撐起的直立看板「機車排氣檢驗站」到 13 m
    yamaha(k, w, d, r, sp, i) {
      const P = [[0.3, 0], [w, 0], [w, d], [7.6, d]];
      polyPrism(k, P, -0.8, 8, '#ececec'); polyPrism(k, P, 8, 8.1, '#3a3d42'); P.forEach((a, j) => { const b = P[(j + 1) % 4]; k.wallLine(a[0], a[1], b[0], b[1], 0, 8); });
      k.box(0.3, w, 7.1, 8.02, -0.07, 0, '#3a3d42', nb); k.box(w, w + 0.06, 7.1, 8.02, -0.07, d, '#3a3d42', nb); paintGeo(k.slab(0.26, 0, 7.56, d, 0.08, 7.1, 8.02, VC, nb), '#3a3d42');
      for (const x of [0.3, 3.9, 7.1, w - 0.4]) k.box(x, x + 0.4, 0, 3.6, -0.1, 0, '#f0f0ee', nb);
      shopGlass(k, 0.7, 3.9, 0, 3.0, shopTex(i)); shopGlass(k, 7.5, w - 0.4, 0, 3.0, shopTex(i + 1)); k.plane(yamShow, 2.8, 3.0, 5.7, 1.5, -0.03, FRONT, { emissive: 0.45 });
      k.box(0.3, w, 3.0, 3.6, -0.08, 0, '#f0f0ee', nb); k.box(1.0, 3.6, 3.08, 3.52, -0.1, -0.08, '#3f6fb8', nb); k.box(7.8, 10.2, 3.08, 3.52, -0.1, -0.08, '#e8b8c0', nb);
      hsign(k, yamSign, 10.5, 1.3, 5.65, 4.27, -0.16); hsign(k, yamAds, 10.5, 2.05, 5.65, 6.03, -0.12, 0.2);
      k.plane(vtex('山葉機車', '#ffffff', '#111111', 0.3, 1.4), 0.3, 1.4, w - 0.2, 2.1, -0.11, FRONT);
      vsign(k, '機車排氣檢驗站', '#f4f4f4', '#111111', w - 1.0, 8.7, 4.3, 1.3, 1.3, '#2a5fd0');                    // 屋頂西南角的直立看板
      for (const z of [0.62, 1.98]) k.box(w - 1.05, w - 0.95, 8.1, 13, z - 0.05, z + 0.05, '#55585c', nb);
      for (const y of [9.6, 11.6]) { k.box(w - 3.4, w - 1.0, y, y + 0.07, 1.26, 1.34, '#55585c', nb); } k.box(w - 3.45, w - 3.37, 8.1, 11.7, 1.26, 1.34, '#55585c', nb);
      for (const x of [2.6, 8.2]) { k.cyl(x, -3.4, 0.03, 0, 2.7, '#c9c9c4', { seg: 6 }); const t = vtex('YAMAHA', '#ffffff', '#d8262c', 0.55, 1.9); k.plane(t, 0.55, 1.9, x + 0.3, 1.7, -3.4, FRONT, { double: true }); } // 門口兩支直立旗
      for (let j = 0; j < 5; j++) bike(k, 0.9 + j * 0.95, -2.3, 1, bikeCols[j % 6]);                             // 門口的展示機車
    },
    // A2 19 House 炙燒牛排＋三露奶茶舖（2026-05）：1 層挑高的白色方盒平房；東邊 9.5 m 是牛排館（黑框深色落地玻璃＋上排高窗、黑底白字橫招），
    // 西邊 3 m 是飲料小店（米色大海報、黑底白字 SANLU）；屋頂淺綠鐵皮
    house19(k, w, d, r, sp, i) {
      k.box(0, w, -0.8, 5.8, 0, d, '#f2f2f0'); k.box(-0.03, w + 0.03, 5.8, 5.95, -0.05, d, '#e4e4e0', nb); k.box(0.3, w - 0.3, 5.95, 6.0, 0.3, d - 0.3, '#cfe0c4', nb);
      for (const [x0, x1] of [[0.5, 4.7], [5.1, 9.2]]) { shopGlass(k, x0, x1, 0, 2.8, darkShop); k.plane(darkGl, x1 - x0, 1.05, (x0 + x1) / 2, 4.85, -0.02, FRONT); }
      hsign(k, paint('19 House 炙燒牛排', '#2b2b2b', '#ffffff', null, 8.4, 1.05), 8.4, 1.05, 4.85, 3.5, -0.16);
      shopGlass(k, 9.8, w - 0.3, 0, 2.3, shopTex(i)); hsign(k, sanluSign, 2.6, 0.6, 11.0, 2.75, -0.16); k.plane(sanluPoster, 2.6, 2.2, 11.0, 4.3, -0.04, FRONT, { emissive: 0.15 });
      for (let f = 0; f < 2; f++) for (let j = 0; j < 3; j++) k.plane(YHT.win(), 1.5, 1.1, w * (j + 0.5) / 3, 1.4 + f * 2.4, d + 0.03, 0);
    },
    // A3 5 樓磁磚樓（2026-05）：1～2 樓紅褐二丁掛、3～5 樓淺灰褐小口磚，4 開間、每開間一樘鋁窗一台冷氣、每層一圈窗台板；
    // 東店面鐵捲門貼「店面出租」＋藍綠帆布雨棚，西店面「有魚兩棲爬蟲專賣」（橫招＋2～4 樓直立側招）；東側整面淺灰抹灰牆與空的招牌鋼架
    a3(k, w, d, r, sp, i) {
      const lo = `wall${lift('#7d4b3d')}`, hi = `wall${lift('#a8937f')}`, gf = 4.0, fh = 3.2, mid = gf + fh, top = 17.5, T = { tile: [0.6, 0.6] }, bay = w / 4;
      k.box(0, w, -0.8, mid, 0, d, lo, T); k.box(0, w, mid, top, 0, d, hi, T); k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', nb); k.box(-0.06, 0, 5.9, top, 0, d, '#cfcfc9', nb);
      for (let j = 0; j <= 4; j++) { const x = Math.min(w - 0.36, Math.max(0, j * bay - 0.18)); k.box(x, x + 0.36, 0, mid, -0.16, 0, lo, nb); k.box(x, x + 0.36, mid, top, -0.16, 0, hi, nb); }
      for (let f = 1; f <= 4; f++) {
        const y = gf + (f - 1) * fh, c = f < 2 ? lo : hi; k.box(0, w, y + 0.55, y + 0.75, -0.3, 0, c, nb);
        for (let j = 0; j < 4; j++) { const cx = (j + 0.5) * bay; if (r() < 0.2) k.plane(litWin(false), 1.7, 1.4, cx - 0.4, y + 1.5, -0.02, FRONT, { emissive: 0.5 }); else k.plane(ROWT.alWin(), 1.7, 1.4, cx - 0.4, y + 1.5, -0.02, FRONT); ac(k, cx + 0.5, y + 1.7); }
      }
      k.plane(YHT.win(), 0.9, 2.2, 0.75, 1.1, -0.03, FRONT);                                                 // 最東邊的住家鐵門
      k.plane(shutterTex('#9a9a94'), 4.6, 3.0, 3.7, 1.5, -0.02, FRONT); k.box(1.4, 6.0, 2.98, 3.2, -0.22, 0, '#7a7e80', nb);
      k.plane(paint('店面出租', '#ffffff', '#d42a1f', null, 0.8, 0.45, 128), 0.8, 0.45, 3.7, 1.9, -0.04, FRONT);
      k.box(0.2, 6.1, 3.22, 3.32, -1.2, 0, '#3f8f86', nb); k.box(0.2, 6.1, 3.05, 3.24, -1.22, -1.15, '#3f8f86', nb);
      shopGlass(k, 6.5, w - 0.3, 0, 2.7, shopTex(i)); k.box(6.4, w - 0.1, 2.78, 2.88, -1.0, 0, '#3a3f44', nb);
      hsign(k, paint('有魚兩棲爬蟲專賣', '#26262a', '#ffffff', '中壢店', 5.5, 1.1), 5.5, 1.1, 9.45, 3.6, -0.2);
      vsign(k, '有魚兩棲爬蟲專賣', '#1c1c1e', '#ffffff', w - 0.3, 4.7, 6.0, -0.65, 0.85);
      for (const z of [-0.15, -1.75]) k.box(0.26, 0.34, 8.6, 15.2, z - 0.04, z + 0.04, '#55585c', nb); for (const y of [8.6, 11.9, 15.12]) k.box(0.26, 0.34, y, y + 0.08, -1.75, 0, '#55585c', nb); // 東側空的招牌鋼架
      k.box(1.0, 5.5, top + 0.12, top + 2.3, 5, 10, '#7f8c98', nb); k.box(7, 11, top + 0.12, top + 2.0, 6, 11, '#e8e8e4', nb);
      for (let f = 0; f < 5; f++) for (let j = 0; j < 3; j++) k.plane(YHT.win(), 1.5, 1.1, w * (j + 0.5) / 3, (f ? gf + (f - 1) * fh : 0) + 1.5, d + 0.03, 0);
    },
    // A4 720 號 7 樓辦公大樓（2026-05；一樓鳳味坊烏骨雞、住商不動產）：紅褐磁磚柱與橫帶、米色窗台牆、每層整排淺綠帶窗，
    // 中間偏東一道 2～7 樓的玻璃帷幕直帶（頂端半圓拱）、底下是大樓入口；西側米白側牆 6 層小陽台與圓角樓梯間；屋頂深灰大平頂
    a4(k, w, d, r) {
      const wl = `wall${lift('#8a5a48')}`, gf = 4.2, fh = 3.4, top = gf + 6 * fh, T = { tile: [0.6, 0.6] }, bg = '#d9cfbd';
      k.box(0, w, -0.8, top, 0, d, wl, T); k.box(-0.02, w + 0.02, top, top + 0.5, -0.06, d, wl, { ...nb, ...T });
      for (const x of [0, 9.2, 13.0, w - 0.3]) k.box(x, x + 0.3, 0, top + 0.5, -0.14, 0, wl, { ...nb, ...T });
      for (let f = 1; f <= 6; f++) {
        const y = gf + (f - 1) * fh;
        for (const [x0, x1] of [[0.3, 9.2], [13.3, w - 0.3]]) { k.box(x0, x1, y + 0.3, y + 1.25, -0.07, 0, 'wall#c9b79f', { ...nb, ...T }); k.plane(bandWin, x1 - x0 - 0.3, 1.65, (x0 + x1) / 2, y + 2.1, -0.03, FRONT, r() < 0.15 ? { emissive: 0.35 } : {}); }
        k.box(w, w + 1.0, y, y + 1.0, 4.5, 8.5, '#f0efe9', nb); k.plane(ROWT.alWin(), 2.2, 1.4, w + 0.1, y + 1.95, 6.5, Math.PI / 2);                      // 西側牆的小陽台
        k.plane(ROWT.alWin(), 2.0, 1.3, w * 0.25, y + 1.6, d + 0.03, 0); k.plane(ROWT.alWin(), 2.0, 1.3, w * 0.75, y + 1.6, d + 0.03, 0);
      }
      k.plane(curtain, 3.5, 20.2, 11.25, gf + 10.1, -0.05, FRONT, { transparent: true });
      k.box(w, w + 0.08, 0, top + 0.5, 0, d, bg, nb); k.cyl(w - 0.6, 1.5, 1.4, 0, top + 0.5, bg, { seg: 14 });   // 西側米白側牆、轉角的圓角樓梯間
      for (const [x, z] of [[0.4, 0.4], [w - 0.4, 0.4], [0.4, d - 0.4], [w - 0.4, d - 0.4], [w / 2, 0.4], [w / 2, d - 0.4]]) k.box(x - 0.2, x + 0.2, top + 0.5, top + 2.9, z - 0.2, z + 0.2, '#8a8d90', nb);
      k.box(-1.3, w + 1.3, top + 2.9, top + 3.4, -1.3, d + 1.3, '#3b3f45', nb);                                // 屋頂的深灰大平頂
      k.plane(shutterTex('#a3a39d'), 8.3, 3.3, 4.75, 1.65, -0.02, FRONT); for (let j = 0; j < 8; j++) blob(k, 1.2 + j * 1.0, 3.25, -0.3, 0.16, '#c8281e');   // 鳳味坊鐵捲門、門楣下一排紅燈籠
      hsign(k, fwSign, 5.8, 1.0, 4.75, 4.2, -0.18);
      k.plane(darkGl, 2.6, 2.8, 11.25, 1.4, -0.03, FRONT); k.box(9.6, 12.9, 3.0, 3.12, -1.2, 0, '#1e1e1f', nb); k.plane(paint('720', '#c8262d', '#ffffff', null, 0.4, 0.24, 256), 0.4, 0.24, 9.35, 2.4, -0.16, FRONT);
      shopGlass(k, 13.6, w - 0.4, 0, 2.9, listings); k.box(13.4, w, 3.05, 3.15, -1.5, 0, '#2f9a63', nb); k.box(13.4, w, 2.85, 3.07, -1.52, -1.45, '#2f9a63', nb);
      hsign(k, zsSign, 7.0, 1.3, 16.9, 3.95, -0.2);
      vsign(k, '鳳味坊烏骨雞', '#b3262b', '#ffffff', 9.0, 4.9, 2.5, -0.5, 0.55); vsign(k, '鳳味坊烏骨雞', '#b3262b', '#ffffff', 9.25, 8.4, 9.0, -0.7, 1.0, '#f2c230');
      vsign(k, '住商不動產', '#1f5a3c', '#ffffff', w - 0.25, 5.0, 5.0, -0.7, 0.9);
    },
    // A5～A7（2024-07／2026-05）：緊貼大樓西牆的白色貨櫃屋與紅磚矮花台、通往後面停車場的水泥車道、柏油停車場與北緣的深藍鐵皮車棚、
    // 雜木空地（低矮舊浪板棚、5～8 m 雜樹）與後面的大樹。這裡實際沒有房子
    gapA(k, w, d, r, sp) {
      const ap = sp.set - 3.7;
      k.box(0.9, 4.9, 0, 2.8, 2, 5, '#e6e6e2'); k.box(0.85, 4.95, 2.8, 2.88, 1.95, 5.05, '#cfcfca', nb); k.plane(ROWT.alWin(), 1.0, 0.8, 2.2, 1.7, 1.97, FRONT); k.box(3.3, 4.1, 1.5, 2.0, 1.6, 2.0, MR.ac, nb);
      k.box(0.5, 4.5, 0, 0.9, 0, 0.4, '#9c5a44'); k.box(0.6, 4.4, 0.9, 1.3, 0.05, 0.35, '#4c7d3a', nb); k.box(4.9, 5.5, 0, 1.1, 0.3, 0.38, '#f0f0ec', nb);      // 紅磚矮花台與盆栽、白色立牌
      k.box(5, 10.5, -0.5, 0.06, -ap, 5, '#b5b2aa', { col: false, surface: true });                           // 水泥車道
      k.box(0, 13.6, -0.5, 0.045, 5, d, '#55575a', { col: false, surface: true }); k.box(10.5, w, -0.5, 0.04, 0, 5, '#6f6a55', { col: false, surface: true }); k.box(13.6, w, -0.5, 0.04, 5, d, '#5d6b45', { col: false, surface: true });
      for (let j = 0; j <= 4; j++) k.box(1.2 + j * 2.6, 1.26 + j * 2.6, 0.045, 0.055, 14.5, 19.5, '#e8e8e4', nb);
      car(k, 1.6, 14.9, '#c9c9c4'); car(k, 6.8, 14.9, '#2a2d33'); car(k, 9.4, 15.0, '#8a2a2a'); car(k, 11.2, 7.0, '#3a4a5a');
      for (const x of [1.0, 4.6, 8.2, 11.8]) for (const z of [20.2, 23.0]) k.box(x - 0.05, x + 0.05, 0, 2.9, z - 0.05, z + 0.05, '#8a8d90', nb); k.box(0.7, 12.1, 2.9, 3.0, 19.9, 23.3, '#2f4a7a', nb);   // 深藍鐵皮車棚
      k.box(11.3, 14.6, 0, 2.4, 1.6, 4.4, '#cfcfc8'); k.box(11.1, 14.8, 2.4, 2.5, 1.3, 4.6, '#9a6a4a', nb);       // 生鏽的低矮浪板棚
      for (const [x, z, h, s] of [[11.4, 0.9, 3.6, 1.7], [14.4, 5.6, 4.6, 2.0], [12.6, 8.2, 4.2, 1.8]]) tree(k, x, z, h, s, r);
      for (const [x, z, s] of [[12.6, 0.8, 0.9], [14.2, 1.0, 1.0], [15.0, 3.2, 0.8], [10.9, 5.6, 0.8]]) blob(k, x, s * 0.6, z, s, '#3f7a3a');
      tree(k, 14.2, 15, 6.5, 4.2, r); tree(k, 13.4, 21, 5.5, 3.2, r);                                          // 後面的大樹
    },
    // A8 鐵皮屋第 1 間（2026-05）：灰藍鐵捲門、灰白浪板雨庇、屋簷上方藍底看板（店名看不清，不寫字）、紅色鐵皮屋頂
    shedBlue(k, w, d) {
      tin(k, w, d, 3.0, 5.95, '#c8402f'); k.plane(shutterTex('#5f6b78'), w - 0.8, 2.6, w / 2, 1.3, -0.02, FRONT); k.box(-0.05, w + 0.05, 2.78, 2.86, -1.5, 0, '#cfcfc8', nb);
      k.plane(blueBoard, w - 0.2, 2.8, w / 2, 4.5, -0.05, FRONT, { emissive: 0.2 }); k.box(0.4, 1.3, 0, 0.9, -1.2, -0.3, '#8a8478', nb); k.box(1.6, 2.8, 0, 0.75, -3.0, -2.92, '#d9cfae', nb);
    },
    // A9 玄龍宮（2026-05）：鐵皮屋宮廟，中間紅框廟門、兩側淺紫牆、黃綠帆布雨棚，屋簷上方整面紅底黃字看板；屋頂有空的鐵塔招牌架與黃旗
    temple(k, w, d) {
      tin(k, w, d, 3.2, 6.5, '#f0f0f0'); for (const x of [0, w - 0.1]) k.box(x, x + 0.1, 0, 6.5, -0.04, 0.14, '#c8281e', nb);
      k.box(0.3, 3.2, 0, 2.95, -0.05, 0, '#c9b6d6', nb); k.box(5.8, w - 0.3, 0, 2.95, -0.05, 0, '#c9b6d6', nb); k.box(3.2, 5.8, 0, 2.95, -0.1, 0, '#c8281e', nb); k.plane(templeDoor, 2.3, 2.6, 4.5, 1.32, -0.12, FRONT, { emissive: 0.25 });
      k.box(1.5, 7.5, 2.86, 2.94, -2.0, 0, '#f2c230', nb); k.box(1.5, 7.5, 2.62, 2.87, -2.03, -1.96, '#2f9a8a', nb); for (const x of [1.55, 7.4]) k.box(x, x + 0.05, 0, 2.86, -1.98, -1.93, '#8a8d90', nb);
      k.plane(templeBoard, 8.5, 2.6, w / 2, 4.85, -0.05, FRONT, { emissive: 0.35 });
      lattice(k, 1.0, 2.4, 3.7, 4.2); k.cyl(0.4, 1.0, 0.03, 3.3, 7.6, '#8a8d90', { seg: 6 }); k.box(0.4, 1.05, 7.0, 7.5, 0.98, 1.02, '#f2c230', nb);
    },
    // A10 唐風采廣告（2026-05）：鐵皮屋，東半深綠鐵捲門＋藍綠帆布雨棚、西半敞開堆滿雜物，屋簷上方黃底大看板；屋頂西端空的鐵塔招牌架
    tangfeng(k, w, d) {
      tin(k, w, d, 3.2, 6.5, '#f0f0f0'); k.plane(shutterTex('#3d5a4e'), 4.0, 2.7, 2.3, 1.35, -0.02, FRONT); k.box(0.1, 4.6, 2.86, 2.94, -1.5, 0, '#2f8f86', nb); k.box(0.1, 4.6, 2.66, 2.87, -1.52, -1.46, '#2f8f86', nb);
      k.plane(openTex, 4.2, 2.8, 6.7, 1.4, -0.03, FRONT, { emissive: 0.3 }); k.box(4.45, 5.35, 1.5, 2.1, -0.07, 0, '#f4c21f', nb);                          // 門邊小黃牌（字看不清）
      k.box(5.0, 6.6, 0, 1.1, -0.9, -0.75, '#c9b28a', nb); k.box(6.8, 7.5, 0, 0.6, -1.3, -0.6, '#b89a6a', nb); k.box(7.6, 8.5, 0, 0.7, -0.9, -0.5, '#e8e6e0', nb); k.box(4.7, 4.76, 0, 2.3, -0.6, -0.54, '#b9bcc0', nb); k.box(5.1, 5.16, 0, 2.3, -0.6, -0.54, '#b9bcc0', nb);
      k.plane(tfBoard, 8.8, 2.4, w / 2, 4.75, -0.05, FRONT, { emissive: 0.35 }); k.box(w - 0.14, w - 0.04, 3.4, 5.0, -0.9, -0.1, '#f4c21f', nb);
      lattice(k, w - 1.6, 2.4, 3.7, 4.2);
    },
    // A11 唐風采與振宇五金之間的窄縫（2026-05）：白色浪板兩層小屋，一樓前面綠色浪板圍起、靠著鋁梯、牆上有藤蔓
    a11(k, w) {
      k.box(0.25, w - 0.25, -0.8, 5.5, 0.5, 5.5, '#e8e8e4'); k.box(0.15, w - 0.15, 5.5, 5.58, 0.4, 5.6, '#cfcfca', nb); k.plane(ROWT.alWin(), 0.9, 0.8, w / 2, 4.2, 0.48, FRONT);
      k.box(0.1, w - 0.1, 0, 2.2, 0, 0.08, '#6f9a72'); k.box(0.5, 0.56, 0, 3.4, -0.3, -0.24, '#b9bcc0', nb); k.box(0.9, 0.96, 0, 3.4, -0.3, -0.24, '#b9bcc0', nb);
      for (const [x, y, s] of [[2.2, 2.6, 0.5], [2.5, 3.3, 0.4], [1.9, 3.0, 0.35]]) blob(k, x, y, 0.4, s, '#3f7a3a');
    },
    // A12 振宇五金 中壢店（756 號，2026-05）：2 層黑灰立面，一二樓間一道日式深灰瓦片斜屋簷，東半藍綠牆＋玻璃自動門、西半深色落地玻璃（門口堆水泥袋），
    // 二樓整排深色大玻璃窗，窗上亮藍橫招；東南角鋼架撐起、與馬路垂直的直立看板到 11 m；屋頂淺綠鐵皮
    zhenyu(k, w, d) {
      const bk = '#2e2f31';
      k.box(0, w, -0.8, 8.6, 0, d, bk); k.box(0.3, w - 0.3, 8.6, 8.66, 0.3, d - 0.3, '#b9cdb4', nb);
      k.box(-0.2, w + 0.2, 3.78, 3.92, -0.7, 0, '#4a4d50', nb); k.box(-0.2, w + 0.2, 3.6, 3.76, -1.3, -0.62, '#4a4d50', nb); k.box(-0.2, w + 0.2, 3.42, 3.58, -1.9, -1.22, '#4a4d50', nb);   // 瓦片斜屋簷（三階）
      k.box(0.15, 7.0, 0, 3.4, -0.05, 0, '#2aa7c0', nb); k.plane(darkGl, 3.4, 2.7, 3.6, 1.35, -0.07, FRONT, { emissive: 0.15 }); k.box(2.0, 5.2, 2.75, 3.25, -0.12, -0.05, '#2f55a8', nb);        // 藍綠牆、玻璃自動門、門上的藍色橫布條
      shopGlass(k, 7.3, w - 0.3, 0, 3.2, darkShop);
      for (let j = 0; j < 4; j++) { const x = 8.0 + j * 1.5; k.box(x, x + 1.2, 0, 0.5 + (j % 2) * 0.25, -1.1, -0.35, j % 2 ? '#a8a49a' : '#c9c2ae', nb); }                              // 門口成排的水泥袋、砂袋
      k.plane(darkGl, 7.0, 2.1, 4.1, 5.55, -0.02, FRONT); k.plane(darkGl, 7.8, 2.1, 12.1, 5.55, -0.02, FRONT);
      hsign(k, zySign, 9.5, 1.2, 11.4, 7.6, -0.12); k.plane(paint('中壢店　03-433-2208', bk, '#ffffff', null, 4.4, 0.5, 128), 4.4, 0.5, 3.6, 7.4, -0.03, FRONT, { emissive: 0.25 });
      vsign(k, '振宇五金', '#2f8fd6', '#ffffff', 0.7, 6.5, 4.5, -1.0, 1.6, '#ffffff'); k.box(0.62, 0.78, 3.9, 11.0, -0.2, -0.08, '#55585c', nb); k.box(0.62, 0.78, 8.6, 11.0, 0.5, 0.62, '#55585c', nb); k.box(0.62, 0.78, 10.9, 11.0, -1.8, 0.6, '#55585c', nb);
      for (const x of [5, 10]) k.box(x, x + 0.3, 8.66, 9.0, 0.1, 0.4, '#2a2a2c', nb);                                // 屋頂前緣的探照燈
    },
    // A13 5 樓紅磚色樓（2026-05）：一樓淺米色牆、挑高 4.5 m，東半灰鐵捲門、西半車庫式大開口（照街景；調查表的東西寫反），正面沒有招牌；
    // 每層窗台下一圈凸出的水平板帶、每層 2 組白框鋁窗、2～4 樓各有一個凸出的小平台；屋頂退縮的樓梯間
    a13(k, w, d, r) {
      const wl = `wall${lift('#9a5a4e')}`, gf = 4.5, fh = 3.3, top = 18, T = { tile: [0.6, 0.6] };
      k.box(0, w, -0.8, top, 0, d, wl, T); k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', nb); k.box(-0.01, w + 0.01, 0, gf - 0.2, -0.06, 0, '#c9bca8', nb);
      k.plane(shutterTex('#a9a9a3'), 5.6, 3.6, 3.3, 1.8, -0.08, FRONT); k.box(0.4, 6.2, 3.58, 3.85, -0.26, 0, '#8d9094', nb); k.plane(openTex, 5.6, 3.6, 9.7, 1.8, -0.08, FRONT, { emissive: 0.2 });
      k.box(w - 0.5, w - 0.2, 1.6, 1.9, -0.09, -0.06, '#c8262d', nb);
      for (let f = 1; f <= 4; f++) {
        const y = gf + (f - 1) * fh; k.box(-0.05, w + 0.05, y - 0.2, y + 0.15, -0.45, 0, wl, { ...nb, ...T });
        for (const cx of [2.0, 4.5, 8.5, 11.0]) { if (r() < 0.18) k.plane(litWin(false), 2.4, 1.5, cx, y + 1.75, -0.02, FRONT, { emissive: 0.5 }); else k.plane(ROWT.alWin(), 2.4, 1.5, cx, y + 1.75, -0.02, FRONT); }
        if (f < 4) k.box(5.6 + f * 0.3, 7.1 + f * 0.3, y + 0.15, y + 0.75, -0.9, 0, wl, { ...nb, ...T });
        for (const zc of [d * 0.3, d * 0.7]) { k.plane(YHT.win(), 1.2, 1.1, w + 0.03, y + 1.5, zc, Math.PI / 2); k.plane(YHT.win(), 1.2, 1.1, -0.03, y + 1.5, zc, -Math.PI / 2); }
        for (let j = 0; j < 3; j++) k.plane(YHT.win(), 1.5, 1.1, w * (j + 0.5) / 3, y + 1.5, d + 0.03, 0);
      }
      k.box(-0.05, w + 0.05, top - 0.5, top + 0.12, -0.2, 0, wl, { ...nb, ...T }); k.box(3, 8, top + 0.12, top + 3.1, 6, 11, wl, { ...nb, ...T }); k.box(8.5, 12, top + 0.12, top + 2.2, 12, 18, '#8a5a40', nb);
      k.box(w + 0.02, w + 0.14, 5.0, 11.5, 1.0, 1.9, '#2a4fa0', nb);                                              // 西牆的藍色直立側招（字判讀不確定，不寫字）
    },
    // A14 淺綠浪板圍籬＋佳語修繕小屋（2026-05）：小屋退縮 1 m，藍色鐵捲門、綠色弧形浪板雨棚，屋頂上方藍底白字橫看板
    jiayu(k, w) {
      k.box(0, 3.5, 0, 2.2, 0, 0.08, '#9db59a'); k.box(3.6, w - 0.1, -0.8, 3.0, 1, 7, '#d8d8d2'); k.box(3.5, w, 3.0, 3.08, 0.9, 7.1, '#b7bcbf', nb);
      k.plane(shutterTex('#3f5f8f'), 3.4, 2.5, 5.75, 1.25, 0.98, FRONT); k.box(3.5, w, 2.86, 2.96, -0.5, 1.0, '#4f9a6a', nb); k.box(3.5, w, 2.7, 2.88, -1.0, -0.45, '#4f9a6a', nb); k.box(3.5, w, 2.45, 2.72, -1.3, -0.95, '#4f9a6a', nb);
      k.plane(jyBoard, 5.0, 1.7, w - 2.5, 4.2, 0.9, FRONT, { emissive: 0.3, double: true }); for (const x of [w - 4.8, w - 0.3]) k.box(x, x + 0.08, 3.0, 5.05, 0.92, 1.0, '#55585c', nb);
    },
  };

  const exposed = (L, lo) => !HZ_ST.lots.some((M) => M !== L && M[0] === L[0] && M[3] === L[3] && (lo ? Math.abs(M[2] - L[1]) < 1.2 : Math.abs(M[1] - L[2]) < 1.2)); // 這一側有沒有鄰居
  HZ_ST.lots.forEach((L, i) => {
    const sp = L[4], { ox, oz, ang, w, apron } = hzLotFrame(L), r = lcg(6000 + i * 7);
    const ex0 = L[3] > 0 ? exposed(L, true) : exposed(L, false), ex1 = L[3] > 0 ? exposed(L, false) : exposed(L, true);
    const k = vcKit(new Kit(I, ox, oz, ang)); kits.push(k);
    const set = sp.set || SET[L[0]];
    if (sp.own) { OWN[sp.own](k, w, sp.d || 10, r, sp, i); street(k, w, apron, set, sp, r); return; }
    const win2 = (x, y, ww, h, gr = true) => (r() < 0.2 ? k.plane(litWin(gr), ww, h, x, y, -0.02, FRONT, { emissive: 0.5 }) : win(k, x, y, ww, h, gr)); // 兩成的窗亮著燈
    const nf = sp.nf || 4, fh = sp.fh || 3.0, gf = sp.gf || (nf === 1 ? 3.2 : 3.3), top = gf + (nf - 1) * fh, d = sp.d || 10;
    const glassWall = sp.bal === 'glass';
    const wm = glassWall && sp.glass ? sp.glass : wallMat(sp.wall);
    shell(k, w, d, top, wm);
    if (sp.low && !glassWall) k.box(-0.01, w + 0.01, 0, gf, -0.05, 0, wallMat(sp.low), { col: false, tile: [0.6, 0.6] });
    for (const x of [0, w - 0.12]) k.box(x, x + 0.12, 0, top, -0.06, 0, '#b9b6ae', { col: false });                  // 分戶牆邊
    // ---- 一樓 ----
    if (sp.sign) {
      const [text, bg, fg, sub, style] = sp.sign, sw = w - 0.15, sh = 0.8;
      k.box(0.05, w - 0.05, gf - 0.85, gf - 0.03, -0.28, 0, bg, { col: false });
      k.plane(paint(text, bg, fg, sub, sw, sh, 128, style), sw, sh, w / 2, gf - 0.44, -0.29, FRONT, { emissive: 0.35 });
    } else if (!sp.noband) k.box(0.05, w - 0.05, gf - 0.85, gf - 0.4, -0.06, 0, '#d8d6cf', { col: false });
    if (sp.awn) {
      const A = Array.isArray(sp.awn) ? sp.awn : [sp.awn], n = A.length > 1 ? Math.max(2, Math.round(w / 0.3)) : 1, bw = w / n;
      for (let j = 0; j < n; j++) k.box(-0.05 + j * bw, -0.05 + (j + 1) * bw + 0.01, gf - 1.05, gf - 0.97, -1.25, 0, A[j % A.length], { col: false });
      k.box(-0.05, w + 0.05, gf - 1.18, gf - 1.05, -1.27, -1.2, A[0], { col: false });
    }
    if (sp.tin) { const ty = nf === 1 ? top : sp.sign ? gf + 0.1 : gf - 0.35; k.box(-0.1, w + 0.1, ty, ty + 0.08, -1.3, nf === 1 ? d : 0, MR.roof, { col: false }); }
    const doorW = sp.door === 0 ? 0 : 1.0, bodyW = w - doorW;
    if (doorW) k.plane(YHT.win(), doorW - 0.1, 2.2, w - doorW / 2 - 0.1, 1.1, -0.03, FRONT);
    const gh = gf - 1.0;
    const gk = sp.ground || 'shop';
    if (gk === 'shop' || gk === 'stall') {
      shopGlass(k, 0.15, bodyW - 0.2 + (doorW ? 0 : 0.2), 0, gh, shopTex(i));
      if (gk === 'stall') { k.box(0.3, bodyW - 0.3, 0, 0.95, -0.55, -0.05, '#c9c9c4', { col: false }); k.box(0.3, bodyW - 0.3, 0.95, 1.0, -0.6, -0.02, '#8d9196', { col: false }); }
    } else if (gk === 'open') {
      k.plane(openTex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.03, FRONT, { emissive: 0.3 });
      for (const x of [0.12, bodyW - 0.22]) k.box(x, x + 0.1, 0, gh, -0.1, 0, '#8a8680', { col: false });
    } else {
      const tex = sp.sh ? shutterTex(sp.sh) : ROWT.shutter();
      k.plane(tex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.02, FRONT);
      if (gk === 'gate') k.plane(YHT.win(), bodyW - 0.5, gh - 0.4, bodyW / 2, gh / 2 - 0.15, -0.05, FRONT);
      k.box(0.15, bodyW - 0.15, gh - 0.02, gh + 0.2, -0.22, 0, '#7a7e80', { col: false });                       // 鐵捲門的罩盒
    }
    if (sp.bikes) for (let j = 0; j < sp.bikes; j++) { const x = 0.2 + j * ((w - 2.2) / Math.max(1, sp.bikes - 0.5)); bike(k, x, -0.9 - (j % 2) * 0.35, 0, bikeCols[(i + j) % 6]); }
    else if (w > 4 && r() < 0.6) {                                                                       // 騎樓邊停幾台機車
      const n = 1 + (r() * 3 | 0); let x = 0.3 + r() * 1.5;
      for (let j = 0; j < n && x < w - 1.7; j++) { const per = r() < 0.4; bike(k, per ? x + 0.3 : x, per ? -1.75 : -1.0 - r() * 0.3, per ? 1 : 0, bikeCols[(i * 3 + j) % 6]); x += per ? 0.8 : 1.9 + r() * 0.5; }
    }
    if (r() < 0.3) k.box(w - 0.38, w - 0.3, 0, top, -0.13, -0.05, '#8a8d90', { col: false });           // 外牆水管
    if ((gk === 'shop' || gk === 'stall') && w > 3.5 && r() < 0.4) { const sx = 0.4 + r() * (w - 2); k.box(sx, sx + 0.55, 0, 0.95, -1.5, -1.45, '#26282b', { col: false }); k.box(sx + 0.04, sx + 0.51, 0.55, 0.9, -1.51, -1.49, '#f3efe4', { col: false }); } // 門口立牌
    if (sp.banner) { const [bt, bb, bf] = sp.banner; k.plane(paint(bt, bb, bf, null, Math.min(w - 0.4, 3.4), 0.5, 96), Math.min(w - 0.4, 3.4), 0.5, w / 2, gf - 1.5, -0.3, FRONT, { emissive: 0.15 }); }
    // ---- 樓上 ----
    for (let f = 1; f < nf; f++) {
      const y = gf + (f - 1) * fh, ww = w - 1.0;
      if (glassWall) {                                                                                     // 玻璃帷幕：一格一格的窗與白色分隔
        k.box(0.05, w - 0.05, y, y + 0.4, -0.08, -0.02, '#e9e9e6', { col: false });
        for (let x = 0.05; x <= w - 0.04; x += 1.4) k.box(x, x + 0.07, y, y + fh, -0.1, -0.02, '#e9e9e6', { col: false });
        if (f === 1) k.box(0.05, w - 0.05, y + fh - 0.06, y + fh, -0.18, -0.02, '#e9e9e6', { col: false });
        continue;
      }
      const bk = sp.bal || 'grille';
      if (bk === 'cage') {
        win2(w / 2, y + 1.45, ww - 0.4, 1.4, false);
        k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -0.75, 0, 'metal', { col: false });
        k.box(0.3, w - 0.3, y + 2.55, y + 2.62, -0.75, 0, 'metal', { col: false });
        for (let x = 0.3; x <= w - 0.29; x += 0.18) k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, 'metal', { col: false });
      } else if (bk === 'open') { k.box(0.3, w - 0.3, y, y + 0.9, -0.8, -0.7, wallMat(sp.wall), { col: false }); win2(w / 2, y + 1.6, ww, 1.6, false); }
      else if (bk === 'rail') {
        win2(w / 2, y + 1.5, ww, 1.4, false);
        if (f === 1) { k.box(0.1, w - 0.1, y, y + 0.1, -1.0, 0, '#2b2b2b', { col: false }); for (const yy of [0.5, 0.85, 1.2]) k.box(0.1, w - 0.1, y + yy, y + yy + 0.04, -1.0, -0.96, '#2b2b2b', { col: false }); for (const x of [0.1, w - 0.14]) k.box(x, x + 0.04, y, y + 1.2, -1.0, -0.96, '#2b2b2b', { col: false }); }
      } else if (bk === 'arch') {
        const n = Math.max(1, Math.round(ww / 3.2)), cw = ww / n;
        for (let j = 0; j < n; j++) k.plane(archWin, cw - 0.2, 1.7, 0.5 + cw * (j + 0.5), y + 1.5, -0.03, FRONT);
      } else if (bk === 'plain') win2(w / 2, y + 1.5, ww, 1.4, false);
      else win2(w / 2, y + 1.5, ww, 1.35);
      if (sp.hood) k.box(0.4, w - 0.4, y + 2.25, y + 2.33, -0.65, 0, sp.hood, { col: false });
      if (sp.fins) for (let x = 0.3; x <= w - 0.3; x += 0.55) k.box(x, x + 0.1, y + 0.1, y + fh - 0.1, -0.3, 0, sp.fins, { col: false });
      if (r() < 0.65) ac(k, r() < 0.5 ? 0.25 : w - 1.05, y + 0.1 + (r() < 0.5 ? 0 : 1.9), bk === 'cage' ? -1.2 : -0.45);
    }
    if (sp.big) { const [bt, bb, bf] = sp.big, y0 = gf + ((sp.bigFrom || 2) - 1) * fh, bh = top - y0 - 0.1, bw = sp.bigW || w - 0.6, bx = sp.bigW ? w * (sp.bigAt || 0.5) : w / 2; k.plane(paint(bt, bb, bf, null, bw, bh, 40), bw, bh, bx, y0 + bh / 2 + 0.05, -0.06, FRONT, { emissive: 0.15 }); }
    if (sp.sign2) { const [bt, bb, bf] = sp.sign2; k.box(0.1, w - 0.1, gf + 0.3, gf + 1.5, -0.2, -0.06, bb, { col: false }); k.plane(paint(bt, bb, bf, null, w - 0.3, 1.1, 100), w - 0.3, 1.1, w / 2, gf + 0.9, -0.21, FRONT, { emissive: 0.3 }); }
    if (sp.vert) { const [text, bg, fg] = sp.vert, len = 0.6 * text.length + 0.2; for (const sd of [-1, 1]) k.plane(ROWT.vert(`hz${  text  }${bg}`, bg, fg, text), 0.6, len, 0.25 + sd * 0.04, gf + 0.4 + len / 2, -0.55, sd * Math.PI / 2, { emissive: 0.3 }); }
    if (sp.round) { const [text, bg, fg] = sp.round; for (const sd of [-1, 1]) k.plane(roundSign(text, bg, fg), 0.85, 0.85, w - 0.3 + sd * 0.03, gf + 1.5, -0.7, sd * Math.PI / 2, { transparent: true, emissive: 0.3 }); }
    if (sp.arch) { k.box(0, w, top + 0.12, top + 0.95, d - 0.2, d, sp.arch, { col: false }); k.box(0, 0.12, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false }); k.box(w - 0.12, w, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false }); k.box(0, w, top + 0.12, top + 0.95, -0.02, 0.1, sp.arch, { col: false }); k.plane(archRow, w, 0.8, w / 2, top + 0.53, -0.04, FRONT); }
    if (sp.tower) {
      const T = sp.tower, back = T.back || 2.5, tn = T.nf || 8, tw = wallMat(T.wall || '#e9e7e3'), th = tn * 3.0;
      k.box(0.3, w - 0.3, top + 0.12, top + 0.12 + th, back, d - 0.5, tw);
      for (let f = 0; f < tn; f++) {
        const y = top + 0.12 + f * 3.0;
        k.box(0.3, w - 0.3, y + 0.05, y + 0.2, back - 1.0, back, T.balc || '#6a6070', { col: false });
        win2(w / 2, y + 1.7, w - 1.6, 1.4, false);
        if (r() < 0.5) ac(k, 0.8 + r() * (w - 3), y + 0.3, back - 0.5);
      }
    }
    // 後牆與沒有鄰居的側牆開窗，頂樓隨機加水塔／頂樓加蓋，從高處或巷口看才不會是一整面素牆
    if (nf > 1) {
      for (let f = 0; f < nf; f++) {
        const y = f === 0 ? 0.3 : gf + (f - 1) * fh + 0.3, n = w > 7 ? 3 : w > 4 ? 2 : 1;
        for (let j = 0; j < n; j++) k.plane(YHT.win(), 1.5, 1.1, w * (j + 0.5) / n, y + 1.1, d + 0.03, 0);
        for (const [x, rot, ex] of [[-0.03, -Math.PI / 2, ex0], [w + 0.03, Math.PI / 2, ex1]]) if (ex) for (const zc of [d * 0.3, d * 0.7]) k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, zc, rot);
      }
    }
    if (nf > 1 && !sp.roof) {
      const q = r();
      if (q < 0.3) k.cyl(w * (0.3 + r() * 0.4), d * 0.7, 0.55, top + 0.12, top + 1.4, '#d8d8d0', { seg: 10 });
      else if (q < 0.55) { const hx = w * (0.15 + r() * 0.3), hz = d * 0.35; k.box(hx, hx + 2.2, top + 0.12, top + 2.6, hz, hz + 2.4, wallMat(sp.wall), { col: false }); k.box(hx - 0.15, hx + 2.35, top + 2.6, top + 2.72, hz - 0.15, hz + 2.55, MR.roof, { col: false }); }
      else if (q < 0.7) { k.box(0.3, w - 0.3, top + 0.12, top + 2.3, d * 0.45, d - 0.4, '#3a6fb0', { col: false }); k.box(0.1, w - 0.1, top + 2.3, top + 2.4, d * 0.4, d - 0.2, MR.roof, { col: false }); }
    }
    if (sp.roof === 'shack') { k.box(0.4, w - 0.4, top + 0.12, top + 2.2, 2.0, d - 0.5, MR.roof, { col: false }); k.box(0.2, w - 0.2, top + 2.2, top + 2.3, 1.4, d, MR.roof, { col: false }); }
    else if (sp.roof === 'tank') { k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 }); if (w > 4.5) k.cyl(w / 2 + 1.3, d - 3, 0.5, top + 0.12, top + 1.3, '#cfd2d4', { seg: 10 }); }
    else if (sp.roof === 'bill' && sp.bill) {                                                                // 屋頂鐵架看板
      const [bt, bb, bf, bw0, bh] = sp.bill, bw = Math.min(bw0 || w - 0.6, w), y0 = top + (nf === 1 ? 0.9 : 0.4);
      k.plane(paint(bt, bb, bf, null, bw, bh, 80), bw, bh, w / 2, y0 + bh / 2, 0.45, FRONT, { emissive: 0.35, double: true });
      k.box(w / 2 - bw / 2 - 0.04, w / 2 + bw / 2 + 0.04, y0 - 0.06, y0, 0.4, 0.5, '#4a4d50', { col: false });
      for (const x of [w / 2 - bw / 2 + 0.2, w / 2 + bw / 2 - 0.25]) k.box(x, x + 0.06, top, y0 + bh * 0.6, 0.38, 0.5, '#4a4d50', { col: false });
    }
    if (nf === 1) { // 一樓鐵皮屋：浪板屋頂往後傾
      k.box(-0.15, w + 0.15, top - 0.12, top, -0.4, d, sp.roofCol || MR.roof, { col: false });
    }
    street(k, w, apron, set, sp, r);
  });
  finishRow(scene, kits);
}
