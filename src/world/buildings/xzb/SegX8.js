// 新中北路 s 731～895（力行宿舍前；Google 街景 2026-05、國土測繪 2024 正射、Google 衛星，調查筆記在 .xz/X8/survey.md）。
//   兩側的校舍都已經自建（力行大樓 src/world/buildings/Lixing.js、學活 src/world/buildings/Sac.js、生科與外觀 src/world/zones/ZoneG.js），
//   這裡只補校舍與道路之間、還有西端空著的路邊：
//   北側（+1）由東到西：東南角消防栓、紅白護欄桿、配電箱、小花台 → 東翼牆根矮牆＋垃圾桶 → 東段機車棚（白色浪板單斜屋頂、鋼柱、
//     灰色直條板圍牆＋白色橫桿、棚下一排機車）→ 門房前一排機車、天橋下大門口的黃色網狀線、兩座「禁止停車」路障、紅磚花台 →
//     西段機車棚 → 紅白斜紋電桿、消防栓 → 鐵絲網圍起來的空地（大樹）→ 三間老街屋（紫藍星空招牌店、香君美食坊、藍色鐵捲門）
//   南側（-1）由東到西：校園指標塔、盆栽 → 學活前行道樹 → 路邊一整排機車＋修剪綠籬牆（學活與生科之間斷開）、電桿、路邊電箱 →
//     爬滿藤蔓的矮牆與小綠地 → 3 樓街屋「米可立」「五条先生」→ 紅招牌店家（字看不清，不放字）
//   遊戲裡力行兩翼的牆面離中心線只有 6.8～7.9 m（實景更退），所以機車棚、機車和直條板圍牆都塞在人行道上（離中心 4.4 m 到牆面）。
//   南側學活前面有一條校內車道（data/cycu.json，離中心 6.5 m 起），綠籬與行道樹放在它和人行道之間。
const R = 'X';
const NC = { col: false };
const FNT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
// 力行大樓南面（OSM 輪廓）離中心線的距離：東翼 7.9→7.1、中段 7.1→6.8、西翼 6.8
const faceN = (s) =>
  s < 740.7
    ? 13.5
    : s < 777.5
      ? 7.9 - (0.8 * (s - 740.7)) / 36.8
      : s < 825.5
        ? 7.1 - (0.3 * (s - 777.5)) / 48
        : 6.8;
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（南側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標，有碰撞的 box 要用），所以把寬度搬到 k.W、還原 k.w
const seg = (C, side, s0, s1, set = 4.5) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  k.zo = (off) => off - set;
  return k;
};
const ball = (C, k, x, y, z, r, hex, sy = 1, sx = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(sx, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 闊葉樹：樹幹＋幾團樹冠（h 樹高、cr 樹冠半徑）
const tree = (C, k, x, z, h, cr, r) => {
  k.cyl(x, z, 0.26, -0.5, h - cr, '#5e4630', { seg: 6, r1: 0.17, col: true });
  const G = ['#3f7a3a', '#4b8a3e', '#356b34'];
  ball(C, k, x, h - cr * 0.85, z, cr * 0.8, G[0], 0.75);
  for (let j = 0; j < 4; j++) {
    const a = j * 1.57 + r() * 0.8,
      q = 0.55 + r() * 0.15;
    ball(
      C,
      k,
      x + Math.cos(a) * cr * 0.5,
      h - cr * (0.95 + r() * 0.3),
      z + Math.sin(a) * cr * 0.5,
      cr * q,
      G[1 + (j % 2)],
      0.72
    );
  }
};
// 斜板：沿 z 傾斜（從 (z0,y0) 斜到 (z1,y1)）
const slopeZ = (C, k, x0, x1, z0, y0, z1, y1, th, hex) => {
  const dz = z1 - z0,
    dy = y1 - y0,
    g = new C.THREE.BoxGeometry(x1 - x0, th, Math.hypot(dz, dy));
  g.rotateX(-Math.atan2(dy, dz));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return k._part(C.VC, C.paintGeo(g, hex));
};
// 平放在地上的貼圖（標線）
const flat = (k, tex, w, h, x, z, y = 0.07) => {
  const m = k.plane(tex, w, h, x, y, z, 0, { transparent: true });
  m.rotation.set(-Math.PI / 2, 0, 0);
  return m;
};

// ---------------- 貼圖 ----------------
const TX = (C) => ({
  // 鐵絲網（菱形網目，每公尺 64 像素，照板子大小畫，才不會被拉長）
  wire: (wm, hm) =>
    C.sg(`xzX8wire${wm}x${hm}`, Math.round(wm * 64), Math.round(hm * 64), (g, W, H) => {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(150,154,150,0.9)';
      g.lineWidth = 1.2;
      for (let x = -H; x < W + H; x += 6) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + H, H);
        g.stroke();
        g.beginPath();
        g.moveTo(x, H);
        g.lineTo(x + H, 0);
        g.stroke();
      }
      g.fillStyle = '#6a6e6c';
      g.fillRect(0, 0, W, 3);
      g.fillRect(0, H - 3, W, 3);
    }),
  // 大門口的黃色網狀線（禁止停車）
  grid: (wm, hm) =>
    C.sg(`xzX8grid${wm}x${hm}`, Math.round(wm * 64), Math.round(hm * 64), (g, W, H) => {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = '#e8c21e';
      g.lineWidth = 6;
      g.strokeRect(4, 4, W - 8, H - 8);
      g.save();
      g.beginPath();
      g.rect(4, 4, W - 8, H - 8);
      g.clip();
      g.lineWidth = 5;
      for (let x = -H; x < W + H; x += 64) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + H, H);
        g.stroke();
        g.beginPath();
        g.moveTo(x, H);
        g.lineTo(x + H, 0);
        g.stroke();
      }
      g.restore();
    }),
  // 紫藍星空招牌（字看不清，只畫底圖）
  stars: () =>
    C.sg('xzX8stars', 512, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 512, 128);
      gr.addColorStop(0, '#2a2a7a');
      gr.addColorStop(0.5, '#5a3a9a');
      gr.addColorStop(1, '#1e3a8a');
      g.fillStyle = gr;
      g.fillRect(0, 0, 512, 128);
      const r = C.lcg(8876);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`;
        const s = 1 + r() * 2.5;
        g.fillRect(r() * 512, r() * 128, s, s);
      }
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath();
      g.arc(420, 40, 22, 0, 7);
      g.fill();
    }),
  // 香君美食坊：白底，「美」是紅字
  xj: () =>
    C.sg('xzX8xj', 1024, 128, (g) => {
      g.fillStyle = '#f4f2ec';
      g.fillRect(0, 0, 1024, 128);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FNT(96);
      [...'香君美食坊'].forEach((t, i) => {
        g.fillStyle = t === '美' ? '#d0241c' : '#1c1c1c';
        g.fillText(t, 512 + (i - 2) * 150, 68);
      });
    }),
  // 封住店面的夾板（幾塊板子、接縫、塗鴉）
  ply: () =>
    C.sg('xzX8ply', 512, 176, (g) => {
      g.fillStyle = '#a89a80';
      g.fillRect(0, 0, 512, 176);
      const r = C.lcg(880);
      for (let x = 0; x < 512; x += 85) {
        g.fillStyle = `rgba(${r() < 0.5 ? '255,240,210' : '60,45,30'},0.12)`;
        g.fillRect(x, 0, 85, 176);
        g.fillStyle = 'rgba(40,30,20,0.55)';
        g.fillRect(x, 0, 2, 176);
      }
      g.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = ['#2a2a2a', '#3a5aa0', '#b03030'][i % 3];
        g.beginPath();
        let x = 40 + r() * 420,
          y = 60 + r() * 90;
        g.moveTo(x, y);
        for (let j = 0; j < 5; j++) g.lineTo((x += 8 + r() * 14), (y += (r() - 0.5) * 30));
        g.stroke();
      }
      g.fillStyle = '#3a6ab0';
      g.fillRect(470, 70, 26, 34); // 門邊的藍色小告示（字看不清）
    }),
});

export default {
  drop: [],
  ownSign: [],
  lots: [
    // ---------- 北側 s 876～895：三間老街屋（遊戲原本是草地）----------
    [
      R,
      876,
      880,
      1,
      {
        nf: 2,
        gf: 3.6,
        wall: '#cfcac0',
        ground: 'shutter',
        sh: '#9a9c9e',
        noband: true,
        door: 0,
        bal: 'open',
        d: 8,
        set: 5.0,
        roof: 'tank',
      },
    ], // 紫藍星空招牌店（2 樓有陽台；字看不清；招牌、紅磚柱在 custom）
    [
      R,
      880,
      887,
      1,
      {
        nf: 1,
        gf: 3.4,
        wall: '#bdb8ae',
        ground: 'shutter',
        sh: '#a89a80',
        noband: true,
        door: 0,
        d: 8,
        set: 5.0,
        roofCol: '#8a8d90',
      },
    ], // 香君美食坊（夾板封住；招牌、夾板在 custom）
    [
      R,
      887,
      895,
      1,
      {
        nf: 1,
        gf: 3.8,
        wall: '#c4c0b6',
        ground: 'shutter',
        sh: '#4a6a9a',
        noband: true,
        door: 0,
        d: 8,
        set: 5.0,
        roofCol: '#8a8d90',
      },
    ], // 藍色鐵捲門老屋（審查改：街景 s891 往北看是 1 樓，女兒牆上一條褪色白色招牌帶，字看不清；招牌帶在 custom）
    // ---------- 南側 s 877～895：3 樓街屋（遊戲原本是草地）----------
    [
      R,
      877,
      882,
      -1,
      {
        nf: 3,
        wall: '#d8d2c4',
        sign: ['米可立', '#1f57a8', '#ffffff', 'Onigiri  飯糰'],
        awn: '#3f8a5a',
        ground: 'shop',
        bal: 'plain',
        d: 10,
        set: 5.8,
      },
    ],
    [
      R,
      882,
      888,
      -1,
      {
        nf: 3,
        wall: '#d6d0c4',
        sign: ['五条先生', '#f4f4f2', '#1a1a1a', '24h自助桌游'],
        awn: '#3f8a5a',
        ground: 'shop',
        bal: 'plain',
        d: 12,
        set: 5.8,
        roof: 'shack',
      },
    ], // 三樓是後加的淺灰板（custom）
    [
      R,
      888,
      895,
      -1,
      { nf: 3, wall: '#cfc8bc', ground: 'shop', noband: true, bal: 'grille', d: 12, set: 5.8 },
    ], // 褪色紅招牌店家（招牌字看不清，不放字；紅色招牌板在 custom）。審查：街景 s891 往南看，「力行宿舍斜對麵」紅底黃字招牌在再往西一間（約 s 892～897，大半在本段外），不是這間
  ],

  custom(C) {
    const { bike, bikeCols, FRONT, paint, MR, lcg } = C;
    const T = TX(C);
    const STEEL = '#5a5e60';
    const r = lcg(8731);
    // 一排垂直路邊停的機車（off 是車尾離中心線的距離；skip 是不停車的 s 範圍）
    const bikeRow = (k, s0, s1, off, skip = []) => {
      for (let s = s0; s <= s1 - 0.6; s += 0.72 + r() * 0.12) {
        if (skip.some(([a, b]) => s > a - 0.6 && s < b)) continue;
        if (r() < 0.12) continue;
        bike(k, k.sx(s), k.zo(off + r() * 0.15), 1, bikeCols[(r() * 6) | 0]);
      }
    };
    const pole = (k, x, z, h = 10) => {
      // 水泥電桿（下段黃黑斜紋護套）＋橫擔
      k.cyl(x, z, 0.17, 0, h, '#a8a7a2', { seg: 8, r1: 0.13, col: true });
      for (let i = 0; i < 8; i++)
        k.cyl(x, z, 0.19, 0.25 * i, 0.25 * (i + 1), i % 2 ? '#1c1c1c' : '#e8c21e', { seg: 8 });
      k.box(x - 0.9, x + 0.9, h - 0.8, h - 0.68, z - 0.06, z + 0.06, '#6a6a66', NC);
      k.box(x - 0.6, x + 0.6, h - 1.6, h - 1.5, z - 0.05, z + 0.05, '#6a6a66', NC);
    };
    const hydrant = (k, x, z) => {
      k.cyl(x, z, 0.15, 0, 0.62, '#c8281e', { seg: 10, col: true });
      k.cyl(x, z, 0.17, 0.62, 0.72, '#c8281e', { seg: 10 });
      k.box(x - 0.24, x + 0.24, 0.38, 0.48, z - 0.06, z + 0.06, '#c8281e', NC);
    };
    const shrubs = (k, x0, x1, z0, z1, y, hex = '#3f6f34') => {
      const a = Math.min(x0, x1),
        b = Math.max(x0, x1);
      for (let x = a + 0.3; x < b - 0.2; x += 0.55)
        ball(C, k, x, y + 0.2, (z0 + z1) / 2 + (r() - 0.5) * 0.2, 0.38 + r() * 0.12, hex, 0.8);
    };

    // 機車棚：白色浪板單斜屋頂（靠路 2.45 m、靠牆 2.8 m）、靠路一排鋼柱、牆前灰色直條板圍牆＋白色橫桿、棚下一排機車
    // 一跨（約 3 m）一個 Kit：這段路往西一路下坡（s 827→882 掉約 1.7 m），Kit 的地面高是原點的地形高，太長的 Kit 西端會浮起來
    const shed = (s0, s1) => {
      const n = Math.max(1, Math.round((s1 - s0) / 3)),
        L = (s1 - s0) / n;
      for (let j = 0; j < n; j++) {
        const s = s0 + j * L,
          e = s + L,
          k = seg(C, 1, s, e),
          zf = k.zo(4.55),
          zb = k.zo(Math.min(faceN(s), faceN(e)) - 0.12);
        slopeZ(C, k, -0.02, L + 0.02, zf - 0.25, 2.45, zb, 2.8, 0.05, '#dfe2de');
        for (let x = 0.5; x < L; x += 1.0)
          slopeZ(C, k, x, x + 0.08, zf - 0.25, 2.49, zb, 2.84, 0.03, '#c4c8c4'); // 浪板的凹槽
        // 直條板圍牆（每片 0.6 m，片與片之間留細縫）＋白色橫桿
        for (let x = 0; x < L - 0.05; x += 0.62)
          k.box(x, Math.min(x + 0.58, L), -0.6, 2.2, zb - 0.18, zb - 0.06, '#b4b4ae', NC); // 往下補到地面（後面比前面低）
        k.box(0, L, 1.05, 1.13, zb - 0.26, zb - 0.18, '#f0f0ec', NC);
        k.box(0, L, 2.33, 2.45, zf - 0.08, zf + 0.04, STEEL, NC); // 前樑
        k.box(0, 0.1, -0.6, 2.4, zf - 0.05, zf + 0.05, STEEL); // 鋼柱
        if (j === n - 1) k.box(L - 0.1, L, -0.6, 2.4, zf - 0.05, zf + 0.05, STEEL);
        bikeRow(k, s + 0.2, e + 0.5, 4.45);
      }
    };

    // ======================= 北側（+1） =======================
    {
      // N1～N3 s 731～755：東南角消防栓、紅白護欄桿、配電箱 → 山牆前小花台 → 東翼牆根矮牆＋方柱、垃圾桶
      const k = seg(C, 1, 731, 755);
      hydrant(k, k.sx(733.2), k.zo(4.6));
      for (const s of [734.6, 736.0]) {
        k.cyl(k.sx(s), k.zo(4.45), 0.06, 0, 0.9, '#c8281e', { seg: 8, col: true });
        for (const y of [0.2, 0.5])
          k.cyl(k.sx(s), k.zo(4.45), 0.065, y, y + 0.15, '#f2f2ee', { seg: 8 });
      }
      k.box(k.sx(736.6), k.sx(737.8), 0, 1.4, k.zo(5.8), k.zo(6.4), '#8a8e90'); // 灰色配電箱
      k.box(k.sx(736.55), k.sx(737.85), 1.4, 1.46, k.zo(5.75), k.zo(6.45), '#7a7e80', NC);
      k.box(k.sx(739), k.sx(740.6), 0, 0.4, k.zo(5.0), k.zo(6.5), MR.concrete); // 小花台
      shrubs(k, k.sx(739), k.sx(740.6), k.zo(5.2), k.zo(6.3), 0.4);
      k.box(k.sx(743.2), k.sx(744.3), 0, 1.3, k.zo(7.0), k.zo(7.45), '#8a8e90'); // 配電箱
      for (let s = 744.5; s < 755; s += 3.5) {
        const e = Math.min(s + 3.5, 755),
          zb = k.zo(faceN(e) - 0.1);
        k.box(k.sx(s), k.sx(e), 0, 0.9, zb - 0.25, zb, '#9a9a94', NC); // 牆根矮牆
        k.box(k.sx(s), k.sx(s) + 0.3, 0, 1.15, zb - 0.3, zb, '#8e8e88', NC); // 方柱
      }
      for (const s of [745.6, 752.8]) {
        k.cyl(k.sx(s), k.zo(6.6), 0.3, 0, 1.0, '#2f4a3a', { seg: 10, col: true }); // 垃圾桶
        k.cyl(k.sx(s), k.zo(6.6), 0.32, 1.0, 1.06, '#26282b', { seg: 10 });
      }
    }
    shed(755, 778); // N4 東段機車棚
    {
      // N5 s 778～825：門房前一排機車；天橋下大門口（s 801.5～807.5）黃色網狀線、兩座「禁止停車」路障、門兩側紅磚花台
      const k = C.sink(seg(C, 1, 778, 825));
      bikeRow(k, 779.5, 799.6, 4.45);
      bikeRow(k, 809.8, 824.5, 4.45);
      flat(k, T.grid(6, 2), 6, 2, k.sx(804.5), k.zo(5.2));
      const sign = paint('禁止停車', '#f2c21a', '#d0201a', null, 0.8, 0.45);
      for (const s of [801.2, 808.2]) {
        const x = k.sx(s),
          z = k.zo(4.75);
        for (const dx of [-0.42, 0.38]) {
          k.box(x + dx, x + dx + 0.04, 0, 0.95, z - 0.22, z - 0.18, '#e8c21e', NC);
          k.box(x + dx, x + dx + 0.04, 0, 0.95, z + 0.18, z + 0.22, '#e8c21e', NC);
        }
        k.box(x - 0.42, x + 0.42, 0.35, 0.92, z - 0.17, z - 0.13, '#f2c21a', NC);
        k.box(x - 0.42, x + 0.42, 0.35, 0.92, z + 0.13, z + 0.17, '#f2c21a', NC);
        k.plane(sign, 0.8, 0.45, x, 0.64, z - 0.18, FRONT, { emissive: 0.15 });
        k.plane(sign, 0.8, 0.45, x, 0.64, z + 0.18, 0, { emissive: 0.15 });
      }
      for (const [a, b] of [
        [799.7, 800.9],
        [808.9, 810.1],
      ]) {
        k.box(k.sx(a), k.sx(b), 0, 0.5, k.zo(5.55), k.zo(6.15), MR.brick, { tile: [0.6, 0.6] });
        shrubs(k, k.sx(a), k.sx(b), k.zo(5.6), k.zo(6.1), 0.45);
      }
    }
    shed(826, 863); // N6 西段機車棚
    {
      // N7 s 863～866：紅白斜紋電桿、消防栓；N8 s 866～876：鐵絲網圍起來的空地（大樹）
      const a = C.sink(seg(C, 1, 863, 868.5, 4.8)),
        m = seg(C, 1, 868.5, 873.5, 4.8),
        b = seg(C, 1, 873.5, 876, 4.8);
      pole(a, a.sx(864.2), a.zo(4.45), 10);
      for (let i = 0; i < 6; i++)
        a.cyl(a.sx(864.2), a.zo(4.45), 0.2, 0.3 * i, 0.3 * (i + 1), i % 2 ? '#f2f2ee' : '#c8281e', {
          seg: 8,
        });
      hydrant(a, a.sx(865.4), a.zo(4.5));
      const D = 9.7; // 空地深度（到離中心 14.5 m；力行西端凸出的樓梯間從 15.1 m 起）
      // 參考線在 s 873.5 往左轉約 10°，北側在彎道外側，兩段的牆各多伸 0.45 m（4.8 × tan 5°）才不會在轉角裂開
      for (const [k, x0, x1] of [
        [a, a.sx(866), a.W],
        [m, 0, m.W + 0.45],
        [b, -0.45, b.W],
      ]) {
        k.box(x0, x1, 0, 0.5, 0, 0.22, '#a8a6a0'); // 混凝土矮牆
        k.box(x0, k === m ? x1 + 1.0 : x1, -0.5, 0.04, 0.22, D, '#7a6a52', NC); // 泥土地（轉角外側的楔形空隙由前一段多鋪一點補上）
        for (let x = x0; x <= x1 - 0.1; x += 2.5) k.box(x, x + 0.18, 0, 1.65, 0.02, 0.2, '#8e8e8a'); // 方柱
        const fw = Math.round((x1 - x0) * 10) / 10;
        k.plane(T.wire(fw, 1.15), x1 - x0, 1.15, (x0 + x1) / 2, 1.08, 0.11, 0, {
          transparent: true,
          double: true,
        });
        k.wallLine(x0, 0.11, x1, 0.11, 0.5, 1.65);
      }
      // 東側的鐵絲網（從路邊往後）
      a.box(a.sx(866), a.sx(866) + 0.18, 0, 1.65, D - 0.2, D, '#8e8e8a');
      a.plane(T.wire(9.5, 1.6), 9.5, 1.6, a.sx(866) + 0.09, 0.82, D / 2, Math.PI / 2, {
        transparent: true,
        double: true,
      });
      a.wallLine(a.sx(866) + 0.09, 0.2, a.sx(866) + 0.09, D, 0, 1.65);
      tree(C, m, m.sx(871), 5.4, 9, 4.0, r); // 大樹
      tree(C, a, a.sx(867.8), 2.6, 4.2, 1.5, r);
      tree(C, b, 1.6, 8.2, 4.8, 1.7, r);
    }
    {
      // N9 老街屋的招牌與細節（街屋本體在 lots）
      const k1 = seg(C, 1, 876, 880, 5.0);
      k1.box(0.2, 3.8, 2.8, 3.7, -0.48, -0.42, '#2a2a6a', NC);
      k1.plane(T.stars(), 3.6, 0.9, 2.0, 3.25, -0.49, FRONT, { emissive: 0.3 });
      for (const x of [0.02, 3.68])
        k1.box(x, x + 0.3, 0, 2.8, -0.32, 0, MR.brick, { tile: [0.6, 0.6] }); // 紅磚柱
      k1.box(-0.05, 4.05, 0, 0.04, -0.75, 0, '#b0503a', NC); // 紅色磁磚騎樓地坪
      const k2 = seg(C, 1, 880, 887, 5.0);
      k2.box(0.3, 6.7, 2.55, 3.35, -0.48, -0.42, '#f4f2ec', NC);
      k2.plane(T.xj(), 6.4, 0.8, 3.5, 2.95, -0.49, FRONT, { emissive: 0.3 });
      k2.plane(T.ply(), 6.6, 2.35, 3.5, 1.18, -0.05, FRONT);
      const k3 = seg(C, 1, 887, 895, 5.0);
      k3.box(0.2, 7.8, 2.75, 3.55, -0.12, -0.04, '#e6e2d8', NC); // 褪色白色招牌帶（字看不清）
    }

    // ======================= 南側（-1） =======================
    {
      // S1 s 746～790：學活東側廣場的校園指標塔、盆栽；學活前行道樹
      const k = seg(C, -1, 746, 790);
      const tx = k.sx(754.3),
        tz = k.zo(5.9);
      k.box(tx - 0.3, tx + 0.3, 0, 5.0, tz - 0.3, tz + 0.3, '#3a4a66');
      k.box(tx - 0.31, tx + 0.31, 1.5, 2.7, tz - 0.31, tz + 0.31, '#e0702a', NC);
      k.plane(
        paint('中原大學', '#3a4a66', '#ffffff', null, 0.56, 0.5),
        0.56,
        0.5,
        tx,
        4.4,
        tz - 0.32,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      k.plane(
        paint('A7', '#e0702a', '#ffffff', null, 0.56, 0.5),
        0.56,
        0.5,
        tx,
        2.1,
        tz - 0.32,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      for (const s of [747.6, 749.2, 750.8]) {
        k.cyl(k.sx(s), k.zo(5.9), 0.3, 0, 0.55, '#8a8a84', { seg: 10, col: true });
        ball(C, k, k.sx(s), 0.85, k.zo(5.9), 0.42, '#3f7a3a', 0.9);
      }
      for (const s of [758.5, 766.5, 774.5, 782.5]) tree(C, k, k.sx(s), k.zo(6.7), 6.2, 2.6, r);
    }
    // S2 s 758～868：路邊一整排機車、綠籬牆（學活與生科之間 s 837～842 斷開）、電桿、路邊電箱
    //   天橋下（s 797～812）沒有機車，綠籬中間有一道鐵柵門（s 803.5～806.5）；一段約 6 m 一個 Kit（往西下坡）
    const BIKES = [
        [759, 789.6],
        [791, 797],
        [812, 824.4],
        [826, 836.5],
        [843, 854],
      ],
      POLES = [790.3, 825.2, 845.2],
      GATE = [803.5, 806.5];
    for (const [h0, h1] of [
      [758, 837],
      [842, 868],
    ]) {
      const n = Math.round((h1 - h0) / 6),
        L = (h1 - h0) / n;
      for (let j = 0; j < n; j++) {
        const s0 = h0 + j * L,
          s1 = s0 + L,
          k = seg(C, -1, s0, s1),
          z0 = k.zo(6.35),
          z1 = k.zo(7.1);
        // 綠籬牆（遇到鐵柵門就分兩段）
        const parts =
          s0 < GATE[1] && s1 > GATE[0]
            ? [
                [s0, GATE[0]],
                [GATE[1], s1],
              ]
            : [[s0, s1]];
        for (const [a, b] of parts) {
          if (b - a < 0.05) continue;
          k.box(k.sx(b), k.sx(a), 0, 1.75, z0, z1, '#3f5f2e');
          for (let x = k.sx(b) + 0.3; x < k.sx(a); x += 0.9 + r() * 0.4)
            ball(
              C,
              k,
              x,
              1.75,
              (z0 + z1) / 2,
              0.42 + r() * 0.12,
              r() < 0.5 ? '#46692f' : '#3a5a2a',
              0.5,
              1.4
            );
          k.box(k.sx(b), k.sx(a), 0, 0.12, z0 - 0.08, z1 + 0.05, '#9a988e', NC); // 綠籬下的水泥緣
        }
        if (parts.length > 1) {
          const ga = k.sx(GATE[1]),
            gb = k.sx(GATE[0]);
          k.plane(C.bars, gb - ga, 1.6, (ga + gb) / 2, 0.85, (z0 + z1) / 2, FRONT, {
            transparent: true,
            double: true,
          });
          k.wallLine(ga, (z0 + z1) / 2, gb, (z0 + z1) / 2, 0, 1.6);
        }
        for (const [a, b] of BIKES) {
          const lo = Math.max(a, s0 + 0.35),
            hi = Math.min(b, s1 + 0.5);
          if (hi - lo > 0.7) bikeRow(k, lo, hi, 4.45);
        }
        for (const s of POLES) if (s >= s0 && s < s1) pole(k, k.sx(s), k.zo(4.35), 10);
        if (s0 <= 827.45 && s1 > 827.45)
          k.box(k.sx(827.9), k.sx(827.0), 0, 1.25, k.zo(5.55), k.zo(6.15), '#6f857a'); // 灰綠色路邊電箱
      }
    }
    {
      // S3 s 868～877：生科西邊爬滿藤蔓的矮牆、後面一小塊綠地和一棵樹
      const a = seg(C, -1, 868, 871, 5.0),
        a2 = seg(C, -1, 871, 873.5, 5.0),
        b = seg(C, -1, 873.5, 877, 5.0);
      for (const k of [a, a2, b]) {
        k.box(-0.15, k.W + 0.15, 0, 1.2, 0, 0.25, '#9a988e');
        for (let x = 0.2; x < k.W; x += 0.7 + r() * 0.3)
          ball(
            C,
            k,
            x,
            0.7 + r() * 0.5,
            0.05,
            0.45 + r() * 0.15,
            r() < 0.5 ? '#4a7a3a' : '#3c6a30',
            1.2,
            1.1
          );
        k.box(0, k.W, -0.5, 0.05, 0.25, 4.4, '#5d7d3e', NC); // 小綠地
      }
      tree(C, a2, a2.sx(871.5), 2.8, 6.0, 2.4, r);
    }
    {
      // S4 街屋細節：五条先生的三樓是後加的淺灰板；紅招牌店家的紅色招牌板（字看不清不放字）
      const k = seg(C, -1, 882, 888, 5.8);
      k.box(0.05, k.W - 0.05, 6.3, 9.3, -0.08, 0, '#b8bcc0', NC);
      const k2 = seg(C, -1, 888, 895, 5.8);
      k2.box(0.2, k2.W - 0.2, 2.45, 3.25, -0.3, 0, '#c4261e', NC);
    }
  },

  footprints(F) {
    return [
      F(R, 733, 755, 1, 4.3, 3.0), // 東南角設施、花台、矮牆
      F(R, 755, 778, 1, 4.3, 2.6), // 東段機車棚
      F(R, 779, 825, 1, 4.3, 1.8), // 門房前的機車、網狀線、路障、花台
      F(R, 826, 863, 1, 4.3, 2.3), // 西段機車棚
      F(R, 863.2, 873.5, 1, 4.3, 10.2), // 電桿、空地
      F(R, 873.5, 876, 1, 4.3, 10.2),
      F(R, 746, 758, -1, 4.3, 2.2), // 指標塔、盆栽
      F(R, 758, 868, -1, 4.3, 2.9), // 機車、綠籬
      F(R, 868, 873.5, -1, 4.9, 4.6), // 藤蔓矮牆、小綠地
      F(R, 873.5, 877, -1, 4.9, 4.6),
    ];
  },
};
