// 大仁二街 A 段：東南側 s 23.5～43.8，46 號到大仁二街40巷口（街景 2025-05，側面 2024-08／2022-08；正射 2024）
// 實景四棟：48 號白磁磚轉角透天（由 StreetDaren1.js 蓋，這裡不做）、46 號「馥約 fuyue」米白高牆拱窗、（白色附屬矮牆）、44 號「隹又隹」四樓、42 號「日禾廚房」轉角透天。
// 48／46 的牆在離路中心線 6.4 m（前面是前院），44／42 往街道凸出 2.5 m（3.9 m）。
// 每一格都用 nf:1 的素外殼（高度寫在 gf），立面全部在 custom 裡照實景畫；u = 從東北端（面對立面時的左手邊）往西南量的公尺數。
const F = (px, w = 900, fam = '"Noto Sans TC","Microsoft JhengHei",sans-serif') => `${w} ${px}px ${fam}`;
const NC = { col: false }, TL = { col: false, tile: [0.6, 0.6] };
const SK = 0.12, Z1 = -SK - 0.015;                           // 立面貼皮的厚度（蓋掉建造函式畫的一樓）、貼在皮上的窗與門
const WHITE = '#f2f2ee', CREAM = '#f3efe5', GREY44 = '#B9B3A6', WHITE42 = '#eeede8', BEIGE42 = '#d8ccb0';
const RED = '#b5472f', GREEN = '#5fb89a', BROWN = '#4a3b33', HEDGE = '#44703a', IRON = '#2b2b2e';

// ---- 幾何小工具 ----
const tint = (T, g, hex) => {
  const c = new T.THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new T.THREE.BufferAttribute(a, 3)); return g;
};
const part = (k, T, g, hex) => k._part('d2VC', tint(T, g, hex));
// 斜板：x0～x1 之間，從 (zA,yA) 斜到 (zB,yB)
const slope = (k, T, x0, x1, zA, yA, zB, yB, th, hex) => {
  const dz = zB - zA, dy = yB - yA, g = new T.THREE.BoxGeometry(x1 - x0, th, Math.hypot(dz, dy));
  g.rotateX(Math.atan2(-dy, dz)); g.translate((x0 + x1) / 2, (yA + yB) / 2, (zA + zB) / 2); return part(k, T, g, hex);
};
// 三角山牆（尖朝上的三角柱，沿 z 方向）
const gable = (k, T, xc, W, y0, H, z0, z1, hex) => {
  const g = new T.THREE.CylinderGeometry(1, 1, z1 - z0, 3); g.rotateX(-Math.PI / 2); g.scale(W / 2 / 0.866, H / 1.5, 1);
  g.translate(xc, y0 + H / 3, (z0 + z1) / 2); return part(k, T, g, hex);
};
// 垂直於立面的圓盤（圓招的本體）
const disc = (k, T, x, y, z, r, th, hex) => { const g = new T.THREE.CylinderGeometry(r, r, th, 20); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return part(k, T, g, hex); };
// 這一格的 u 座標工具（u = 離東北端的距離，面對立面時由左往右）
const mk = (k, T) => ({
  B: (u0, u1, y0, y1, z0, z1, mat, o = NC) => k.box(T.w - u1, T.w - u0, y0, y1, z0, z1, mat, o),
  P: (tex, w, h, u, y, z = Z1, o) => k.plane(tex, w, h, T.w - u, y, z, T.FRONT, o),
  S: (u0, u1, zA, yA, zB, yB, th, hex) => slope(k, T, T.w - u1, T.w - u0, zA, yA, zB, yB, th, hex),
  ac: (u, y, z = -0.55) => T.ac(k, T.w - u - 0.8, y, z),
});
const sideWin = (k, T, x, rot, z, y, w = 0.9, h = 1.0, lit = false) => k.plane(lit ? T.litWin(true) : T.YHT.win(), w, h, x, y, z, rot, lit ? { emissive: 0.5 } : {});

// ---- 貼圖 ----
const shutterDraw = (g, W, H, hex) => {
  g.fillStyle = hex; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 8) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, y, W, 3); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y + 6, W, 2); }
};
const shTex = (T, hex) => T.sg(`d2A_sh${hex}`, 64, 256, (g) => shutterDraw(g, 64, 256, hex));          // 細條鐵捲門
const cageTex = (T, col, arch) => T.sg(`d2A_cage${col}${arch ? 'A' : ''}`, 512, 128, (g) => { // 鐵籠：直條，中間可以是拱形放射花格
  g.clearRect(0, 0, 512, 128); g.fillStyle = col; g.strokeStyle = col;
  const bars = (x0, x1) => { for (let x = x0; x < x1; x += 12) g.fillRect(x, 0, 3, 128); };
  if (arch) {
    bars(0, 168); bars(346, 512); g.fillRect(166, 0, 5, 128); g.fillRect(341, 0, 5, 128);
    g.lineWidth = 4; const cx = 256, cy = 92, R = 82;
    g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(cx, cy, R * 0.45, Math.PI, 0); g.stroke();
    for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
    g.fillRect(170, cy, 172, 4); for (let x = 176; x < 340; x += 12) g.fillRect(x, cy, 3, 36);
  } else bars(0, 512);
  g.fillRect(0, 0, 512, 5); g.fillRect(0, 123, 512, 5); g.fillRect(0, 60, 512, 3);
});
const archWinTex = (T) => T.sg('d2A_arch46', 256, 544, (g) => {               // 馥約的大拱窗：下半落地玻璃＋紗簾，上半放射花格
  g.clearRect(0, 0, 256, 544); const cx = 128, sy = 128, R = 122;
  g.fillStyle = '#f7f6f1'; g.beginPath(); g.moveTo(6, 544); g.lineTo(6, sy); g.arc(cx, sy, R, Math.PI, 0); g.lineTo(250, 544); g.closePath(); g.fill();
  g.save(); g.beginPath(); g.arc(cx, sy, R - 12, Math.PI, 0); g.closePath(); g.clip(); g.fillStyle = '#5d6c76'; g.fillRect(0, 0, 256, sy); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 0, 110, sy); g.restore();
  g.strokeStyle = '#f7f6f1'; g.lineWidth = 5;
  for (const f of [0.42, 0.72]) { g.beginPath(); g.arc(cx, sy, (R - 12) * f, Math.PI, 0); g.stroke(); }
  for (let i = 1; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; g.beginPath(); g.moveTo(cx, sy); g.lineTo(cx + Math.cos(a) * (R - 12), sy + Math.sin(a) * (R - 12)); g.stroke(); }
  g.fillStyle = '#f7f6f1'; g.fillRect(6, sy - 4, 244, 96);                     // 中間的白色橫飾板
  for (let i = 0; i < 3; i++) {                                               // 三片落地玻璃，白色紗簾
    const x = 20 + i * 74; const gr = g.createLinearGradient(x, 0, x + 68, 0); gr.addColorStop(0, '#e9ecec'); gr.addColorStop(0.5, '#f8f8f5'); gr.addColorStop(1, '#dfe3e4'); g.fillStyle = gr; g.fillRect(x, 232, 68, 300);
    g.fillStyle = 'rgba(120,130,135,.18)'; for (let xx = x + 8; xx < x + 68; xx += 12) g.fillRect(xx, 232, 2, 300);
  }
});
const fuyueTex = (T) => T.sg('d2A_fuyue', 144, 256, (g) => {                  // 門柱立牌：十字、fuyue、馥約
  g.fillStyle = '#efebe1'; g.fillRect(0, 0, 144, 256); g.fillStyle = '#55524c'; g.fillRect(70, 26, 4, 34); g.fillRect(60, 36, 24, 4);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = F(30, 400, 'Georgia,"Times New Roman",serif'); [...'fuyue'].forEach((c, i) => g.fillText(c, 28 + i * 22, 96));
  g.font = F(20, 500); g.fillText('馥約', 72, 176);
});
const jiaTex = (T) => T.sg('d2A_jia', 256, 256, (g) => {                      // 隹又隹圓招：白底深框、卡通小象線條、手寫風店名、小字與電話
  g.clearRect(0, 0, 256, 256); g.fillStyle = '#f6f4ee'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#2a2826'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.ellipse(128, 62, 24, 22, 0, 0, 7); g.stroke();                       // 頭
  for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(128 + sd * 36, 58, 17, 21, sd * 0.3, 0, 7); g.stroke(); } // 大耳朵
  g.beginPath(); g.moveTo(128, 76); g.quadraticCurveTo(122, 96, 136, 100); g.stroke();                   // 鼻子
  g.strokeRect(112, 86, 32, 30); g.fillStyle = '#2a2826'; g.beginPath(); g.arc(119, 59, 2.5, 0, 7); g.arc(137, 59, 2.5, 0, 7); g.fill(); // 身體、眼睛
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = F(46, 700, '"Klee One","DFKai-SB","BiauKai","Noto Sans TC",sans-serif'); g.fillText('隹又隹', 128, 150);
  g.font = F(15, 500); g.fillText('咖哩・玩具・古物', 128, 188); g.font = F(18, 500); g.fillText('03-4662227', 128, 210); // 街景 2025-05 拉近（fov 20）讀得出來
});
const riheTex = (T) => T.sg('d2A_rihe', 256, 256, (g) => {                    // 日禾廚房圓招：米白底黑框，細線「日禾」＋兩筆淡橘斜線，下面小字「廚房」
  g.clearRect(0, 0, 256, 256); g.fillStyle = '#ece6d2'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#1e1e1f'; g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.stroke();
  g.strokeStyle = '#e6b27a'; g.lineWidth = 5; g.beginPath(); g.moveTo(196, 50); g.lineTo(150, 150); g.moveTo(212, 62); g.lineTo(166, 162); g.stroke();
  g.fillStyle = '#1e1e1f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = F(88, 500); g.fillText('日禾', 124, 110); g.font = F(38, 700); g.fillText('廚房', 128, 190);
});
const boardTex = (T) => T.sg('d2A_board', 144, 256, (g) => {                  // 黃色立牌：水餃／鍋貼／麵飯（第四行實景被擋住讀不到，不寫）
  g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 144, 256); g.fillStyle = '#f7d928'; g.fillRect(7, 7, 130, 242);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = F(52);
  [['水餃', '#d8281e'], ['鍋貼', '#1f4fae'], ['麵飯', '#1f8a3c']].forEach(([t, c], i) => { g.fillStyle = c; g.fillText(t, 72, 48 + i * 62); });
});
const plate42Tex = (T) => T.sg('d2A_plate42', 192, 128, (g) => {              // 門牌「大仁二街 42」
  g.fillStyle = '#c8326a'; g.fillRect(0, 0, 192, 128); g.fillStyle = '#fbfbf8'; g.fillRect(8, 8, 176, 112); g.fillStyle = '#c8326a'; g.fillRect(8, 8, 34, 112);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.font = F(22, 700); [...'中壢區'].forEach((c, i) => g.fillText(c, 25, 32 + i * 32));
  g.fillStyle = '#c8326a'; g.font = F(24, 700); g.fillText('大仁二街', 114, 32); g.font = F(60); g.fillText('42', 114, 84);
});
const shop44Tex = (T) => T.sg('d2A_shop44', 512, 256, (g) => {                // 隹又隹：深咖啡木框玻璃店面，裡面很暗
  g.fillStyle = '#3a2c24'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4; i++) { const x = 12 + i * 125; const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5a4a36'); gr.addColorStop(0.35, '#2a2420'); gr.addColorStop(1, '#16130f'); g.fillStyle = gr; g.fillRect(x, 14, 113, i === 1 ? 236 : 200); g.fillStyle = 'rgba(255,225,160,.5)'; g.fillRect(x + 36, 26, 30, 10); }
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(12, 14, 60, 236);
});
const canopyTex = (T) => T.sg('d2A_canopy', 128, 64, (g) => {                 // 綠色半透明採光罩
  g.clearRect(0, 0, 128, 64); g.fillStyle = 'rgba(96,196,164,0.66)'; g.fillRect(0, 0, 128, 64); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, 0, 128, 10);
  g.fillStyle = 'rgba(90,100,104,0.9)'; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 3, 64);
});
const shop42Tex = (T) => T.sg('d2A_shop42', 512, 256, (g) => {                // 日禾廚房店內：米白牆、木桌與圓凳
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#8f8676'); gr.addColorStop(0.62, '#a79b84'); gr.addColorStop(0.63, '#5d584f'); gr.addColorStop(1, '#4a463f'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#b79a64'; g.fillRect(24, 22, 70, 96); g.fillStyle = '#3f3429'; g.fillRect(380, 30, 96, 60);
  for (const [x, y, w] of [[40, 150, 150], [230, 138, 130], [370, 156, 120]]) {
    g.fillStyle = '#a57c48'; g.fillRect(x, y, w, 12); g.fillStyle = '#3a3330'; g.fillRect(x + w / 2 - 5, y + 12, 10, 70); g.fillRect(x + w / 2 - 30, y + 80, 60, 6);
    g.fillStyle = '#7a4a2a'; for (const dx of [-26, w + 4]) { g.fillRect(x + dx, y + 36, 24, 8); g.fillRect(x + dx + 9, y + 44, 6, 44); }
  }
  g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 4; i++) g.fillRect(300, 60 + i * 16, 60, 5);                   // 玻璃上貼的白字（營業時間，太小不寫字）
  g.fillStyle = '#2e2b28'; for (const x of [0, 150, 158, 330, 504]) g.fillRect(x, 0, 8, 256);
});
// 斜的貼圖平面（採光罩）：寬 w，從 (zA,yA) 斜到 (zB,yB)
const tilted = (k, tex, w, xc, zA, yA, zB, yB) => { const m = k.plane(tex, w, Math.hypot(zB - zA, yB - yA), xc, (yA + yB) / 2, (zA + zB) / 2, 0, { transparent: true, double: true }); m.rotation.x = Math.atan2(zB - zA, yB - yA); return m; };
const latticeTex = (T) => T.sg('d2A_lattice', 96, 240, (g) => {               // 42 號住家的白鐵花格門
  g.fillStyle = '#eeeeea'; g.fillRect(0, 0, 96, 240); g.fillStyle = '#6f7b82'; g.fillRect(10, 10, 76, 150);
  g.strokeStyle = '#f4f4f0'; g.lineWidth = 3; for (let x = 10; x <= 86; x += 19) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 160); g.stroke(); } for (let y = 10; y <= 160; y += 25) { g.beginPath(); g.moveTo(10, y); g.lineTo(86, y); g.stroke(); }
});
const tinTex = (T, hex) => T.sg(`d2A_tin${hex}`, 256, 64, (g) => {            // 直條浪板
  g.fillStyle = hex; g.fillRect(0, 0, 256, 64); for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, 0, 3, 64); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 6, 0, 2, 64); }
});
const tinPlane = (k, T, hex, w, h, x, y, z, rot) => k.plane(tinTex(T, hex), w, h, x, y, z, rot);

// 圓錐形柏樹盆栽
const cypress = (k, x, z, h, r = 0.3) => { k.box(x - 0.17, x + 0.17, 0.06, 0.36, z - 0.17, z + 0.17, '#4a4744', NC); k.cyl(x, z, r, 0.36, h, '#34573a', { seg: 7, r1: 0.03 }); };
const bush = (k, x, z, r, y0, y1, hex) => k.cyl(x, z, r, y0, y1, hex, { seg: 7, r1: r * 0.6 });

// 後牆開窗（nf:1 的素外殼沒有後窗，從後面或高處看才不會是一整面素牆）
const backWins = (k, T, ys, n = 2) => { for (const y of ys) for (let j = 0; j < n; j++) k.plane(T.YHT.win(), 1.4, 1.1, T.w * (j + 0.5) / n, y, T.d + 0.03, 0); };


const lot46 = (k, T) => {
  const { B, P, S } = mk(k, T), w = T.w, W = T.wallMat(WHITE);
  B(0, w, 0, 6.2, -SK, 0, CREAM); B(0, w, 6.2, T.top, -SK, 0, W, TL);
  P(archWinTex(T), 2.5, 5.3, 3.0, 2.85, Z1, { transparent: true });
  B(2.9, 3.1, 0.0, 0.2, -SK - 0.02, -SK, CREAM);
  for (const u of [0.6, 1.62]) B(u, u + 0.03, 0, 2.25, -SK - 0.012, -SK, '#cfcabd'); B(0.6, 1.65, 2.25, 2.28, -SK - 0.012, -SK, '#cfcabd'); // 跟牆同色的暗門
  B(4.75, 4.95, 2.15, 2.35, -SK - 0.16, -SK, '#f7f1dc'); B(5.2, 5.32, 2.9, 3.0, -SK - 0.2, -SK, '#e8e8e4'); // 壁燈、監視器
  B(0.02, 0.12, 0, 6.05, -SK - 0.09, -SK, '#e8e8e4');                                                    // 48／46 交界的落水管
  // 三樓：挑出 1 m 的陽台（跟 48 的三樓連成一線），白磁磚矮牆上一段深色矮欄杆，落地窗，上緣墨綠遮雨棚
  B(0, w, 6.02, 6.2, -1.0, 0, '#d8d6cf'); B(0, w, 6.2, 7.05, -1.0, -0.9, W, TL); B(0, 0.1, 6.2, 9.2, -1.0, 0, W, TL); B(w - 0.1, w, 6.2, 7.05, -1.0, 0, W, TL);
  P(cageTex(T, IRON, false), w - 0.1, 0.45, w / 2 + 0.05, 7.28, -0.95, { transparent: true, double: true });
  for (const u of [1.3, 3.25, 5.2]) P(u === 3.25 ? T.litWin(false) : T.ROWT.alWin(), 1.7, 2.1, u, 7.45, Z1, u === 3.25 ? { emissive: 0.45 } : undefined);
  S(0.05, w, -0.05, 9.3, -1.35, 8.85, 0.06, '#2f5d4a'); B(0.05, w, 8.72, 8.86, -1.37, -1.32, '#2f5d4a');
  // 屋頂：往後退的灰色鐵皮加蓋，正面兩個小窗
  B(0.3, w - 0.3, T.top, 11.7, 2.5, T.d - 0.2, '#9a9a98'); B(0.1, w - 0.1, 11.7, 11.8, 2.2, T.d, '#b7bcbf');
  for (const u of [1.8, 4.6]) P(T.ROWT.alWin(), 1.1, 1.0, u, 10.6, 2.48);
  backWins(k, T, [1.7, 4.8, 7.8]);
  // 前院：白碎石＋灰踏石、圓錐柏樹盆栽、白色長桌與收起的陽傘、臨路矮綠籬
  B(0, w, 0.05, 0.08, -3.3, 0, '#eceae3');
  for (const [u, z] of [[3.0, -0.7], [3.1, -1.4], [2.9, -2.1], [3.0, -2.8]]) B(u - 0.3, u + 0.3, 0.08, 0.1, z - 0.22, z + 0.22, '#9c9b96');
  for (const [u, z, h] of [[0.9, -2.3, 2.2], [1.7, -1.0, 1.7], [2.2, -2.5, 2.5], [3.8, -2.4, 2.4], [4.3, -0.6, 1.5], [4.9, -2.2, 2.0], [5.6, -2.6, 2.3], [6.1, -0.5, 1.6]]) cypress(k, w - u, z, h);
  B(0.7, w, 0.05, 0.62, -3.3, -2.95, HEDGE);
  B(4.5, 6.3, 0.7, 0.76, -1.7, -1.05, '#f4f4f0'); for (const u of [4.6, 6.15]) B(u, u + 0.06, 0.08, 0.7, -1.4, -1.34, '#e4e4e0');
  k.cyl(w - 3.75, -1.25, 0.03, 0.08, 1.1, '#e8e8e4', { seg: 6 }); k.cyl(w - 3.75, -1.25, 0.17, 1.0, 2.9, '#f6f6f2', { seg: 8, r1: 0.04 });
  // 門柱：白磁磚方柱＋米白立牌（†／fuyue／馥約）＋信箱與門牌 46；柱後一道白色格柵矮籬
  B(0.05, 0.47, 0, 1.6, -3.1, -2.68, W, TL); P(fuyueTex(T), 0.34, 0.6, 0.26, 1.22, -3.115, { emissive: 0.08 });
  B(0.1, 0.42, 0.38, 0.72, -3.2, -3.1, '#f2f2ee'); P(T.paint('46', '#f2f2ee', '#3a3a3a', null, 0.2, 0.14), 0.2, 0.14, 0.26, 0.58, -3.215);
  B(0, 0.05, 0.05, 0.9, -2.68, 0, '#f0f0ec');
};

// ---------------- 46 與 44 之間：46 側院的白色單層附屬牆（電表箱、白色小雨庇），後面是 44 的排煙管 ----------------
const lotGap = (k, T) => {
  const { B, S } = mk(k, T), w = T.w;
  B(0, w, 0, T.top, -SK, 0, CREAM);
  for (const u of [0.35, 1.2]) { B(u, u + 0.6, 1.15, 1.75, -SK - 0.16, -SK, '#f3f3ef'); for (const du of [0.17, 0.43]) B(u + du - 0.07, u + du + 0.07, 1.48, 1.62, -SK - 0.17, -SK - 0.16, '#3a3d40'); }
  S(0.1, w - 0.1, -SK, 2.6, -0.75, 2.3, 0.05, '#f4f4f0');
  k.cyl(0.26, 1.35, 0.2, T.top, 13.2, '#b9bdc0', { seg: 10 });                                           // 44 號側牆外的粗排煙管
};

// ---------------- 44 號「隹又隹」：四層（四樓退縮），淺灰米色小口磚 ----------------
const lot44 = (k, T) => {
  const { B, P, S, ac } = mk(k, T), w = T.w, W = T.wallMat(GREY44), R = Math.PI / 2;
  B(0, w, 0, T.top, -SK, 0, W, TL);
  // 一樓：深咖啡木框玻璃店面＋深咖啡帆布斜雨棚（遊戲裡只能挑到路緣）
  P(shop44Tex(T), 5.7, 2.65, 3.0, 1.325, Z1, { emissive: 0.3 }); B(0.1, 5.9, 2.65, 3.05, -SK - 0.05, -SK, '#3b2f2a');
  S(0.08, 5.92, -SK, 3.05, -0.86, 2.45, 0.05, BROWN); B(0.08, 5.92, 2.24, 2.46, -0.88, -0.84, BROWN);
  k.cyl(w - 0.14, -0.78, 0.05, 0, 2.95, '#9a9c9e', { seg: 6 }); B(0.09, 0.19, 2.86, 2.95, -0.8, -SK, '#9a9c9e'); // 雨棚左端外露的管線
  // 圓形側招「隹又隹」（掛在左前角，垂直於街道，雙面）
  disc(k, T, w - 0.14, 2.2, -0.42, 0.31, 0.1, '#2a2826');
  for (const sd of [-1, 1]) k.plane(jiaTex(T), 0.6, 0.6, w - 0.14 + sd * 0.055, 2.2, -0.42, sd * R, { transparent: true, emissive: 0.3 });
  for (const [u, r, h] of [[1.0, 0.22, 0.9], [1.5, 0.18, 0.7], [5.2, 0.24, 1.0]]) { B(u - 0.15, u + 0.15, 0.05, 0.3, -0.5, -0.2, '#8a5a3c'); bush(k, w - u, -0.35, r, 0.3, h, '#3f7a3c'); }
  T.bike(k, w - 3.6, -0.5, 0, '#2a2a30'); T.bike(k, w - 5.0 + 0.05, -0.55, 0, '#c9c9c4');
  // 二樓：寬的白鐵窗，左邊兩台冷氣疊放、右邊一台
  P(T.YHT.win(), 1.4, 1.4, 2.5, 4.9); P(T.YHT.win(), 1.4, 1.4, 3.9, 4.9); B(1.75, 4.65, 5.62, 5.68, -SK - 0.25, -SK, '#e9e9e5');
  ac(0.2, 3.5); ac(0.2, 4.15); ac(4.95, 3.6);
  // 三樓：兩個凸出的白色小鐵籠窗（淺綠小雨庇），兩側各一台窗型冷氣
  for (const u of [1.95, 4.05]) {
    P(u < 3 ? T.litWin(false) : T.ROWT.alWin(), 1.5, 1.4, u, 7.85, Z1, u < 3 ? { emissive: 0.45 } : undefined);
    B(u - 0.8, u + 0.8, 7.05, 7.12, -0.55, -SK, '#ecece8'); P(cageTex(T, '#f2f2ee', false), 1.6, 1.45, u, 7.85, -0.55, { transparent: true, double: true });
    for (const du of [-0.8, 0.8]) B(u + du - 0.02, u + du + 0.02, 7.12, 8.58, -0.55, -SK, '#ecece8');
    S(u - 0.9, u + 0.9, -SK, 8.85, -0.7, 8.6, 0.04, '#a9d3b4');
  }
  ac(0.2, 7.3, -0.45); ac(5.0, 7.3, -0.45);
  // 四樓退縮：前面女兒牆，深色鐵皮雨遮下兩個白鐵窗，白色鐵皮棚頂
  B(0, w, T.top, 10.3, -SK, 0.1, W, TL);
  B(0.15, w - 0.15, T.top, 12.4, 2.0, T.d - 0.3, W, TL); for (const u of [1.7, 4.3]) P(T.YHT.win(), 1.3, 1.2, u, 10.9, 1.98);
  S(0, w, 2.0, 12.35, 0.3, 11.95, 0.06, '#4a4d50'); B(-0.03, w, 12.4, 12.5, 1.8, T.d, '#e9e9e5');
  // 東北側牆：整面銀灰浪板，有窗
  tinPlane(k, T, '#b4b8ba', T.d, T.top - 2.8, w + 0.03, (T.top + 2.8) / 2, T.d / 2, R); tinPlane(k, T, '#b4b8ba', T.d - 2.3, 2.9, w + 0.03, T.top + 1.45, 2.0 + (T.d - 2.3) / 2, R);
  for (const [z, y] of [[3.2, 4.9], [6.5, 4.9], [3.2, 7.9]]) sideWin(k, T, w + 0.045, R, z, y, 1.0, 1.0);
  backWins(k, T, [1.7, 4.9, 7.9]);
};

// ---------------- 42 號「日禾廚房」：40巷口轉角透天，三樓大鐵籠＋紅瓦假屋簷，後半鐵皮加蓋 ----------------
const lot42 = (k, T) => {
  const { B, P, S, ac } = mk(k, T), w = T.w, W = T.wallMat(WHITE42), R = Math.PI / 2;
  B(0, w, 0, T.top, -SK, 0, W, TL);
  // 一樓：最左白鐵花格門與滅火器，整面銀色鐵捲門（捲到一半）下面是落地玻璃店面；上面綠色採光罩（轉過轉角包到 40巷側）
  P(latticeTex(T), 0.85, 2.3, 0.6, 1.15); B(1.08, 1.2, 0.35, 0.8, -SK - 0.12, -SK, '#c8281e');
  P(shop42Tex(T), 3.95, 2.0, 3.275, 1.0, Z1, { emissive: 0.25 }); B(1.3, 5.25, 2.0, 2.06, -SK - 0.05, -SK, '#1c1c1e'); // 不用 shopGlass：它的自發光太強，白天整面過曝
  P(shTex(T, '#b8b8b4'), 4.0, 1.2, 3.28, 2.62); B(1.25, 5.3, 3.2, 3.42, -SK - 0.12, -SK, '#8d9093');
  tilted(k, canopyTex(T), w + 0.85, (w - 0.85) / 2, -SK, 3.5, -0.9, 3.82); tilted(k, canopyTex(T), 0.85, -0.425, -0.9, 3.82, 3.95, 3.82);
  B(0, w + 0.88, 3.76, 3.84, -0.93, -0.87, '#7d8386'); B(w + 0.82, w + 0.88, 3.76, 3.84, -0.93, 3.95, '#7d8386'); B(0, w, 3.42, 3.5, -SK - 0.06, -SK, '#7d8386'); B(w, w + 0.85, 3.76, 3.84, 3.9, 3.96, '#7d8386');
  for (const u of [0.03, 1.4, 2.8, 4.2, w - 0.03]) S(u - 0.03, u + 0.03, -SK, 3.46, -0.9, 3.78, 0.06, '#7d8386');
  for (const z of [0.9, 2.4]) B(w, w + 0.85, 3.74, 3.8, z - 0.03, z + 0.03, '#7d8386');
  for (const u of [1.6, 2.8, 4.0, 5.2]) k.cyl(w - u, -0.5, 0.07, 3.38, 3.58, '#1e1e1f', { seg: 8 });
  // 轉角柱：門牌「大仁二街 42」、圓招「日禾／廚房」、不鏽鋼洗手台、紅磚小花台
  P(plate42Tex(T), 0.3, 0.2, 5.44, 2.05, Z1 - 0.005); B(5.38, 5.5, 1.76, 1.88, -SK - 0.012, -SK, '#c8281e');
  disc(k, T, 0.18, 2.75, -0.58, 0.41, 0.1, '#1e1e1f');
  for (const sd of [-1, 1]) k.plane(riheTex(T), 0.8, 0.8, 0.18 + sd * 0.055, 2.75, -0.58, sd * R, { transparent: true, emissive: 0.3 });
  B(5.36, 5.42, 3.15, 3.2, -0.6, -SK, '#1e1e1f');
  B(5.22, 5.58, 0.74, 0.88, -0.5, -SK, '#c9cccf'); B(5.36, 5.44, 0.05, 0.74, -0.36, -0.26, '#b4b8ba'); B(5.36, 5.44, 0.88, 1.1, -0.2, -SK, '#b4b8ba');
  B(4.95, 5.6, 0.05, 0.36, -0.86, -0.52, '#a8553c'); bush(k, 0.3, -0.69, 0.2, 0.36, 0.75, '#3f7a3c');
  // 黃色立牌（人行處，靠 44 那側，斜對著來車）
  B(0.08, 0.14, 0, 1.75, -0.86, -0.8, '#e9e9e5');
  for (const sd of [0, 1]) k.plane(boardTex(T), 0.9, 1.6, w - 0.45 - (sd ? 0.02 : 0), 0.95, -0.55 + (sd ? 0.02 : 0), -0.75 * Math.PI + sd * Math.PI, { emissive: 0.08 });
  T.bike(k, 1.3, -0.5, 0, '#b02a2a'); T.bike(k, 3.1, -0.55, 0, '#2f6db3');
  // 二樓：跟一樓同一面牆，一扇寬的深色鐵窗＋右邊冷氣室外機
  P(T.YHT.win(), 1.3, 1.3, 2.15, 4.95); P(T.YHT.win(), 1.3, 1.3, 3.45, 4.95); B(1.4, 4.2, 5.66, 5.72, -SK - 0.2, -SK, '#d0d0cc');
  ac(4.55, 4.5);
  // 三樓：挑出的白色大鐵籠（中間拱形放射花格），左右上方各一小片綠色雨庇
  B(0.15, w - 0.15, 6.28, 6.4, -0.82, 0, '#d8d6cf'); B(0.15, w - 0.15, 6.4, 7.2, -0.82, -0.74, W, TL);
  for (const u of [0.15, w - 0.23]) B(u, u + 0.08, 6.4, 9.15, -0.82, 0, W, TL);
  P(cageTex(T, '#e9e9e5', true), w - 0.4, 1.9, w / 2, 8.15, -0.8, { transparent: true, double: true });
  for (const u of [1.5, 4.1]) P(T.ROWT.alWin(), 1.6, 1.9, u, 7.6); P(T.litWin(false), 1.0, 1.9, 2.8, 7.6, Z1, { emissive: 0.45 });
  B(0.15, w - 0.15, 9.1, 9.22, -0.82, 0, W, TL);
  for (const u of [0.15, w - 1.45]) S(u, u + 1.3, -0.3, 9.32, -1.05, 9.12, 0.04, GREEN);
  // 屋頂：紅瓦假斜簷＋中央灰色三角山牆；後半米白鐵皮加蓋，正面兩個小窗
  S(0, w, -1.0, 9.3, 0.9, 10.15, 0.12, RED); B(0, w, T.top, 10.1, 0.8, 0.95, W, TL);
  gable(k, T, w / 2, 3.2, 9.45, 1.4, -0.92, 0.9, RED); gable(k, T, w / 2, 2.6, 9.45, 1.1, -0.98, -0.92, '#a3a29d');
  B(0.1, w - 0.1, T.top, 12.0, 3.0, T.d - 0.1, '#e3dfd2'); B(0, w, 12.0, 12.1, 2.8, T.d, '#d5d2c6');
  tinPlane(k, T, '#e3dfd2', w - 0.2, 2.5, w / 2, T.top + 1.25, 2.98, T.FRONT); for (const u of [1.6, 4.0]) P(T.ROWT.alWin(), 0.9, 0.9, u, 10.9, 2.96);
  // 40巷側牆（米黃小口磚）：前段鐵捲門，往後白鐵窗、冷氣室外機、落水管與鏽水痕，樓上小窗
  k.plane(shTex(T, '#b8b8b4'), 3.5, 2.7, -0.02, 1.35, 2.15, -R); B(w, w + 0.1, 2.7, 3.0, 0.3, 4.0, '#8d9093');
  sideWin(k, T, -0.02, -R, 7.6, 1.7, 1.4, 1.3);
  B(w, w + 0.42, 1.9, 2.5, 4.3, 5.1, '#e4e1d8'); B(w, w + 0.42, 0.55, 1.15, 5.3, 6.1, '#e4e1d8'); B(w, w + 0.3, 0.05, 0.55, 4.25, 4.9, '#a8553c');
  for (const z of [4.12, 6.4]) B(w, w + 0.07, 0, T.top, z, z + 0.08, z < 5 ? '#a8623a' : '#d8d6cf');
  for (const [z, y0, y1] of [[4.6, 3.2, 6.0], [5.9, 2.6, 4.4], [8.6, 4.2, 6.3]]) B(w, w + 0.012, y0, y1, z, z + 0.14, '#c9b392');
  for (const [y, zs] of [[4.95, [2.2, 5.3, 8.2]], [8.0, [2.2, 5.3, 8.2]]]) for (const z of zs) sideWin(k, T, -0.02, -R, z, y, 0.9, 1.0, y > 6 && z === 5.3);
  backWins(k, T, [1.7, 4.95, 8.0]);
};

export default {
  ownSign: ['馥約fuyue', '隹又隹咖哩'],
  drop: [],
  lots: [
    // 48 號（大仁一街口轉角的白磁磚透天，s 14～23.5）由 StreetDaren1.js 蓋，這裡不重複
    [23.5, 30, -1, { nf: 1, gf: 9.4, d: 8, set: 6.4, wall: CREAM, ground: 'open', door: 0, noband: true, bikes: -1, roofCol: '#a9aaa8', custom: lot46 }],
    [30, 32.2, -1, { nf: 1, gf: 2.8, d: 3, set: 5.0, wall: CREAM, ground: 'open', door: 0, noband: true, bikes: -1, roofCol: '#f1f1ed', custom: lotGap }],
    [32.2, 38.2, -1, { nf: 1, gf: 9.5, d: 10, set: 3.9, wall: GREY44, ground: 'open', door: 0, noband: true, bikes: -1, roofCol: '#c9c8c2', custom: lot44 }],
    [38.2, 43.8, -1, { nf: 1, gf: 9.5, d: 10, set: 3.9, wall: BEIGE42, ground: 'open', door: 0, noband: true, bikes: -1, roofCol: '#c9c8c2', custom: lot42 }],
  ],
};
