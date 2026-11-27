// 幸福街 s 213～408（中山東路口往南，參考線 'F'；路寬 5 m）。照 Google 街景官方 2022-06（s 196～208）、2024-08（s 244～400）、
// 使用者相片球 2025-04（s 220、232、400；拍攝位置會差到 30～40 m，只拿來看外觀，先後順序以官方車拍的門牌為準）
// 與國土測繪 2024 正射建模（照片在 side-session-notes 的 zs-sv/F/）。
//   西側（+1）整條是老街溪與溪邊綠帶、公園（大樹、涼亭、木欄杆），這個檔不蓋東西。
//   東側（-1、照片 _L）由北往南：
//     中山東路口的圓弧轉角樓「專業現場維修中心」（SegZ2 的 Z s 382.5～388，F s≈201～213；幸福街那面只加 side 店面，見下）→
//     63～67 號：5 樓舊公寓（綠色鐵皮窗遮、二樓米色看板）、4～5 樓舊樓兩棟、綠色雨遮 4 樓 →
//     69／71 號 5 樓白色小磁磚（鐵捲門上金屬字看不清）→ 73 號 4 樓白磁磚（一樓機車庫）→ 75 號 4 樓深灰條紋磁磚（白框格柵大門）→
//     77、79、81 號 3 樓白磁磚透天（拱形鐵窗、綠色窗遮、紅瓦簷，前院退縮約 5.5 m，弧形車棚：深色、透明、綠色）→
//     85 號 6 樓灰白小磁磚（一樓美髮店、綠色鐵皮雨遮）→ 藍色圓弧雨遮＋鏤空花磚的鐵捲門 →
//     87／89 號 8 樓直條藍玻璃樓梯塔（拱形入口、不鏽鋼門）→ 6 樓公寓兩間（白色鐵窗、鐵捲門）→ 綠色透明拱形雨遮的鐵捲門 →
//     91／93 號 8 樓直條藍玻璃樓梯塔 → 綠色拱形雨遮＋綠色門口雨遮 →
//     97～105 號 5 樓紅褐色磚面公寓四間（白色窗框凸出、綠色鐵皮雨遮、一樓整排鐵捲門）→
//     107／109 號 4 樓白牆「築岳空間設計」（尖頂白色招牌、車庫停車）→ 111 號 5 樓紅褐磚（生鏽鐵捲門）→
//     113 號 4 樓褐色條紋磚 → 115 號 4 樓粉褐色磚 → 117 號 5 樓二樓紅磚帶、白色鐵窗 → 119 號 4 樓紅磚（一樓開放通道）→
//     121／123 號 7 樓白色小磁磚社區大樓（OSM w1388641486，s 372～408；輪廓與樓高跟實景差不多，但一樓是通用店面，hide 後照同一個輪廓重蓋）：北翼山牆對街（s 372～382.6）→
//     中庭前約 2 m 白磁磚圍牆（藍色壓頂、刺網、牆內龍柏，s 382.6～393.5）→ 藍頂警衛亭（綠燈）→
//     南翼（s 398～408）一樓地下室車道入口（藍色磁磚雨遮）、鐵門、信箱。
//   s 340 附近的路面沒有路口；s≈388 黃色網狀線是社區大樓前道路轉彎處。
// 接縫：北端從 s 213（SegZ2 轉角格在幸福街這側佔到 s≈213）開始；南端那棟社區大樓跨過 s 400，整棟歸這個檔，做到 s 408（F3 從 s 409、125 號開始）。
// 轉角樓的側面：SegZ2.js 的 Z s 382.5～388（+1）轉角格加了 side（幸福街那面靠路口的綠色招牌與鐵捲門），那格其他東西沒動。
// 拿掉：原本 noShop 的填充樓 drop（f2_767、f2_766、f2_765、f2_764、f2_763、f1453、f1452、f1448、f1447）；
//   有店面牆的填充樓與 OSM 建物 hide（f2_751、f1451、f1450、f1449、f1446；OSM w1388641488——s 279～315 的那塊公寓輪廓離路 6～7.5 m、
//   正面是一整片，改成一間一間照實景蓋；OSM w1388641486——社區大樓，照輪廓重蓋成北翼、南翼、中段與中庭圍牆）。
// 看不清的招牌不放字（69／71 號鐵捲門上的金屬字、65 號二樓的米色看板、築岳旁邊的綠色小招牌）。
const R = 'F',
  S = 3.8; // 立面離中心線（路面外 1.3 m）
const NC = { col: false };
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（-1 側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標），所以把寬度搬到 k.W、還原 k.w
const seg = (C, side, s0, s1, set) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  k.zo = (off) => off - set;
  return k;
};
// 斜放的薄板（車棚弧頂的一片）：在 x-y 平面上從 (x0, y0) 到 (x1, y1)，z 方向 z0～z1
const slab = (C, k, x0, y0, x1, y1, z0, z1, t, hex) => {
  const L = Math.hypot(x1 - x0, y1 - y0),
    g = new C.THREE.BoxGeometry(L, t, z1 - z0);
  g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  k._part(C.VC, C.paintGeo(g, hex));
};
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 龍柏：細長的深綠色圓錐樹冠
const juniper = (C, k, x, z, h, r) => {
  k.cyl(x, z, 0.12, 0, 1.2, '#5e4630', { seg: 6 });
  const g = new C.THREE.ConeGeometry(r, h - 0.8, 8);
  g.translate(x, 0.8 + (h - 0.8) / 2, z);
  k._part(C.VC, C.paintGeo(g, '#2f5a36'));
  ball(C, k, x, 1.6, z, r * 0.9, '#35643a', 0.8);
};

const E = (s0, s1, sp) => [R, s0, s1, -1, { d: 12, ...sp }];
const OLD = '#c9c5b8', // 舊公寓的米灰色
  WT = '#e8e8e3', // 白色小磁磚
  GW = '#d2d2cc', // 灰白小磁磚
  RB = '#9a5a48', // 紅褐色磚面
  GA = '#3f8a5a'; // 綠色鐵皮窗遮／雨遮
// 77～81 號透天退縮（前院車棚）
const SB = S + 5.5;
// 社區大樓南翼立面離中心線（門口有台階，比街屋往路邊靠）
const CS = 3.4;
// 兩座 8 樓樓梯塔（87／89、91／93）
const TOWERS = [
  [285.5, 290],
  [304, 308.5],
];
// 弧形車棚：[s0, s1, 顏色]
const PORCH = [
  [258, 263.5, '#5a5a58'],
  [263.5, 269, '#c9d2d4'],
  [269, 274.5, '#5aa070'],
];

export default {
  // 原本就 noShop 的填充樓
  drop: ['f2_767', 'f2_766', 'f2_765', 'f2_764', 'f2_763', 'f1453', 'f1452', 'f1448', 'f1447'],
  // 有店面牆的填充樓與 OSM 建物（w1388641488 公寓、w1388641486 社區大樓，一樓都是通用店面，改成照實景重蓋）
  hide: ['f2_751', 'f1451', 'f1450', 'f1449', 'f1446', 'w1388641488', 'w1388641486'],
  ownSign: ['築岳空間設計'],
  lots: [
    // 65 號：5 樓舊公寓，綠色鐵皮窗遮，二樓米色看板（字看不清），一樓鐵捲門、門口停車
    E(213, 220, {
      nf: 5,
      wall: OLD,
      sign2: [' ', '#e6dcbc', '#6a5a3a'],
      ground: 'shutter',
      sh: '#8e8e8a',
      noband: 1,
      bal: 'cage',
      hood: GA,
    }),
    // 4～5 樓舊樓（陽台、鐵窗）
    E(220, 228, {
      nf: 5,
      wall: '#d6d1c4',
      ground: 'shutter',
      sh: '#a2a29e',
      noband: 1,
      bal: 'grille',
    }),
    E(228, 235, {
      nf: 4,
      wall: '#dedad0',
      ground: 'shutter',
      sh: '#9a9a96',
      noband: 1,
      bal: 'cage',
    }),
    // 67 號：綠色鐵皮雨遮，4 樓白磁磚
    E(235, 241, {
      nf: 4,
      wall: WT,
      awn: GA,
      ground: 'gate',
      sh: '#b4b4b0',
      noband: 1,
      bal: 'plain',
    }),
    // 69／71 號：5 樓白色小磁磚，凸窗，一樓大片鐵捲門（上方金屬字看不清）＋不鏽鋼門
    E(241, 247.5, {
      nf: 5,
      wall: WT,
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      bal: 'plain',
    }),
    // 73 號：4 樓白磁磚，一樓開放的機車庫（藍色牆）
    E(247.5, 252, {
      nf: 4,
      wall: '#e4e4de',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      bikes: 1,
    }),
    // 75 號：4 樓深灰色條紋磁磚，一樓白框格柵大門
    E(252, 258, {
      nf: 4,
      wall: '#74767a',
      ground: 'gate',
      sh: '#ecece8',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 77、79、81 號：3 樓白磁磚透天，拱形鐵窗、綠色窗遮，前院弧形車棚（custom）
    ...PORCH.map(([a, b]) =>
      E(a, b, {
        nf: 3,
        set: SB,
        d: 7, // 後面是後排的填充樓 f2_778（離中心線 16.4 m 起）
        wall: '#ecebe6',
        ground: 'gate',
        sh: '#b8b8b4',
        noband: 1,
        bal: 'arch',
        hood: GA,
        roof: 'tank',
      })
    ),
    // 85 號：6 樓灰白小磁磚，一樓美髮店（玻璃門、海報），綠色鐵皮雨遮
    E(274.5, 281, {
      nf: 6,
      wall: GW,
      awn: '#7f9a86',
      ground: 'shop',
      noband: 1,
      bal: 'grille',
      d: 18,
    }),
    // 藍色圓弧雨遮、鏤空花磚的鐵捲門
    E(281, 285.5, {
      nf: 6,
      wall: GW,
      awn: '#3f7a8c',
      ground: 'shutter',
      sh: '#a4a6a4',
      noband: 1,
      door: 0,
      bal: 'cage',
      d: 18,
    }),
    // 87／89 號：8 樓樓梯塔，直條藍玻璃（custom），拱形入口不鏽鋼門
    E(285.5, 290, {
      nf: 8,
      wall: '#dcdcd6',
      ground: 'gate',
      sh: '#b6b6b0',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 18,
      roof: 'none',
    }),
    // 6 樓公寓：白色鐵窗、鐵皮雨遮，鐵捲門
    E(290, 294.5, {
      nf: 6,
      wall: GW,
      ground: 'shutter',
      sh: '#a2a29e',
      noband: 1,
      bal: 'cage',
      d: 18,
    }),
    E(294.5, 299.5, {
      nf: 6,
      wall: '#d8d8d2',
      ground: 'shutter',
      sh: '#9e9e9a',
      noband: 1,
      bal: 'grille',
      d: 18,
    }),
    // 綠色透明拱形雨遮（custom）的鐵捲門，旁邊綠色門口雨遮
    E(299.5, 304, {
      nf: 6,
      wall: GW,
      ground: 'shutter',
      sh: '#a0a09c',
      noband: 1,
      bal: 'cage',
      d: 18,
    }),
    // 91／93 號：8 樓樓梯塔
    E(304, 308.5, {
      nf: 8,
      wall: '#dcdcd6',
      ground: 'gate',
      sh: '#b6b6b0',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 18,
      roof: 'none',
    }),
    E(308.5, 315, {
      nf: 6,
      wall: GW,
      ground: 'shutter',
      sh: '#a0a09c',
      noband: 1,
      bal: 'grille',
      d: 18,
    }),
    // 97～105 號：5 樓紅褐色磚面公寓，白色窗框凸出，綠色鐵皮雨遮，一樓整排鐵捲門
    E(315, 320.5, { nf: 5, wall: RB, ground: 'shutter', sh: '#a6a6a2', noband: 1, bal: 'open' }),
    E(320.5, 326, {
      nf: 5,
      wall: RB,
      ground: 'shutter',
      sh: '#a6a6a2',
      noband: 1,
      bal: 'open',
      hood: GA,
    }),
    E(326, 331.5, { nf: 5, wall: RB, ground: 'shutter', sh: '#9e9e9a', noband: 1, bal: 'open' }),
    E(331.5, 337, {
      nf: 5,
      wall: '#a0624e',
      ground: 'shutter',
      sh: '#a2a29e',
      noband: 1,
      bal: 'open',
      hood: GA,
    }),
    // 107／109 號：築岳空間設計，4 樓白牆、二樓大玻璃窗，一樓車庫停車＋木門，尖頂白色招牌（custom 補尖頂）
    E(337, 343, {
      nf: 4,
      wall: '#efefea',
      sign: ['築岳空間設計', '#f4f4f0', '#2a2a2a'],
      ground: 'open',
      bal: 'plain',
    }),
    // 111 號：5 樓紅褐磚，生鏽鐵捲門
    E(343, 348.5, { nf: 5, wall: RB, ground: 'shutter', sh: '#9a8c7c', noband: 1, bal: 'open' }),
    // 113 號：4 樓褐色條紋磚，鐵皮雨遮，兩片鐵捲門＋不鏽鋼門
    E(348.5, 353.5, {
      nf: 4,
      wall: '#8c6c5a',
      tin: 1,
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      bal: 'plain',
    }),
    // 115 號：4 樓粉褐色磚，鐵捲門
    E(353.5, 358.5, {
      nf: 4,
      wall: '#c4a090',
      ground: 'shutter',
      sh: '#a4a4a0',
      noband: 1,
      bal: 'grille',
    }),
    // 117 號：5 樓，二樓紅磚帶（custom）、白色鐵窗
    E(358.5, 363.5, {
      nf: 5,
      wall: '#cfcac0',
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      bal: 'cage',
    }),
    // 119 號：4 樓紅磚，一樓開放通道、紅磚門框
    E(363.5, 371.5, {
      nf: 4,
      wall: '#a85a44',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'rail',
    }),
    // 121／123 號社區大樓（照 OSM w1388641486 的輪廓重蓋）：7 樓白色小磁磚、鐵窗凸窗
    // 北翼山牆對街（s 372～382.6，離中心線 4.4 m，一樓沒有店面）
    E(372, 382.6, {
      nf: 7,
      set: 4.4,
      d: 18.8,
      wall: WT,
      ground: 'gate',
      sh: '#e2e2dc',
      noband: 1,
      door: 0,
      bal: 'cage',
      roof: 'tank',
    }),
    // 南翼（s 397.5～408，離中心線 3.4 m）：一樓車道入口、鐵門、信箱（custom）
    E(397.5, 408, {
      nf: 7,
      set: CS,
      d: 19.8,
      wall: WT,
      ground: 'gate',
      sh: '#e2e2dc',
      noband: 1,
      door: 0,
      bal: 'cage',
      roof: 'tank',
    }),
  ],

  custom(C) {
    const { FRONT, lcg } = C;
    // ---- 77～81 號前院：白磁磚矮牆、不鏽鋼大門、弧形車棚 ----
    for (const [a, b, col] of PORCH) {
      const k = seg(C, -1, a, b, S),
        w = k.W,
        zf = k.zo(SB); // 透天立面
      // 矮牆（兩側與前面，中間留大門）
      k.box(0, 0.2, 0, 1.0, 0, zf, '#eeeeea');
      k.box(0, 1.0, 0, 1.0, 0, 0.2, '#eeeeea');
      k.box(w - 1.0, w, 0, 1.0, 0, 0.2, '#eeeeea');
      k.box(0.95, 1.05, 0, 1.5, -0.02, 0.22, '#c8c8c4', NC); // 門柱
      k.box(w - 1.05, w - 0.95, 0, 1.5, -0.02, 0.22, '#c8c8c4', NC);
      for (let x = 1.1; x < w - 1.05; x += 0.14)
        k.box(x, x + 0.03, 0, 1.3, 0.06, 0.1, '#b8bcbe', NC); // 不鏽鋼大門
      k.box(1.05, w - 1.0, 1.25, 1.32, 0.05, 0.11, '#b8bcbe', NC);
      // 弧形車棚：四根柱子＋八片斜板拼成的弧頂（前緣在矮牆上方，後面接到二樓）
      for (const x of [0.3, w - 0.3])
        for (const z of [0.5, zf - 0.4]) k.cyl(x, z, 0.06, 0, 2.6, '#5a5c5e', { seg: 6 });
      const n = 8,
        rise = 0.7;
      for (let j = 0; j < n; j++) {
        const t0 = j / n,
          t1 = (j + 1) / n,
          y = (t) => 2.6 + rise * Math.sin(Math.PI * t);
        slab(C, k, 0.1 + t0 * (w - 0.2), y(t0), 0.1 + t1 * (w - 0.2), y(t1), 0.2, zf, 0.05, col);
      }
      k.box(0.1, w - 0.1, 2.5, 2.62, 0.15, 0.25, '#4a4c4e', NC); // 前緣橫樑
      // 二樓以上的紅瓦簷
      k.box(
        -0.05,
        w + 0.05,
        3.3 + 3.0 * 2 - 0.15,
        3.3 + 3.0 * 2 + 0.15,
        zf - 0.6,
        zf,
        '#a84a36',
        NC
      );
      k.box(-0.05, w + 0.05, 3.3 + 3.0 - 0.1, 3.3 + 3.0 + 0.1, zf - 0.45, zf, '#a84a36', NC);
      // 前院停一台車（深色、白色、銀色）
      const cc = ['#2a2c30', '#e8e8e4', '#a8acb0'][PORCH.findIndex((p) => p[0] === a)];
      k.box(w / 2 - 0.85, w / 2 + 0.85, 0.3, 1.1, 1.0, 5.0, cc);
      k.box(w / 2 - 0.75, w / 2 + 0.75, 1.1, 1.55, 1.8, 4.0, cc, NC);
      k.box(w / 2 - 0.72, w / 2 + 0.72, 1.12, 1.5, 1.75, 1.8, '#3a4a58', NC);
    }
    // ---- 85 號旁、藍色圓弧雨遮下的鏤空花磚（鐵捲門上方）----
    {
      const k = seg(C, -1, 281, 285.5, S);
      k.box(0.2, k.W - 0.2, 1.8, 2.25, -0.06, 0, '#6a8a88', NC);
    }
    // ---- 兩座樓梯塔：直條藍玻璃＋白色橫框、拱形入口 ----
    for (const [a, b] of TOWERS) {
      const k = seg(C, -1, a, b, S),
        w = k.W,
        top = 3.3 + 7 * 3.0,
        gx0 = w * 0.5 - 0.9,
        gx1 = w * 0.5 + 0.9;
      k.box(gx0 - 0.15, gx1 + 0.15, 3.6, top + 0.6, -0.25, 0, '#cfcfca', NC); // 玻璃外框
      k.box(gx0, gx1, 3.7, top + 0.5, -0.3, -0.24, '#3e6a9a', NC);
      for (let y = 4.5; y < top; y += 1.5)
        k.box(gx0, gx1, y, y + 0.08, -0.33, -0.28, '#dcdcd8', NC);
      k.box(w * 0.5 - 0.04, w * 0.5 + 0.04, 3.7, top + 0.5, -0.33, -0.28, '#dcdcd8', NC);
      // 拱形入口（灰色磁磚門框，上緣一圈拱）
      k.box(0.2, w - 0.2, 2.35, 2.6, -0.2, 0, '#b4b4ae', NC);
      const g = new C.THREE.TorusGeometry(0.95, 0.12, 6, 14, Math.PI);
      g.translate(w * 0.5, 1.4, -0.12);
      k._part(C.VC, C.paintGeo(g, '#b4b4ae'));
      // 屋頂樓梯間
      k.box(gx0 - 0.3, gx1 + 0.3, top, top + 2.6, 0.2, 4.0, '#dcdcd6');
    }
    // ---- 91 號那排的綠色透明拱形雨遮（鐵捲門上方）與綠色門口雨遮 ----
    for (const [a, b] of [
      [299.5, 304],
      [308.5, 315],
    ]) {
      const k = seg(C, -1, a, b, S),
        w = k.W,
        n = 6;
      for (let j = 0; j < n; j++) {
        const y = (t) => 2.35 + 0.55 * Math.sin(Math.PI * t);
        slab(
          C,
          k,
          0.2 + (j / n) * (w - 0.4),
          y(j / n),
          0.2 + ((j + 1) / n) * (w - 0.4),
          y((j + 1) / n),
          -0.9,
          0,
          0.04,
          '#4f9a68'
        );
      }
      // 門口小雨遮（靠 s 大那端）
      k.box(0.2, 1.4, 2.1, 2.25, -0.75, 0, '#3f8a5a', NC);
    }
    // ---- 築岳空間設計：招牌上方的尖頂 ----
    {
      const k = seg(C, -1, 337, 343, S),
        w = k.W;
      slab(C, k, 0.05, 3.3 - 0.05, w / 2, 3.3 + 0.75, -0.3, -0.24, 0.12, '#f4f4f0');
      slab(C, k, w / 2, 3.3 + 0.75, w - 0.05, 3.3 - 0.05, -0.3, -0.24, 0.12, '#f4f4f0');
      // 車庫裡的銀色小車
      k.box(1.0, 2.7, 0.3, 1.1, 0.4, 4.2, '#b0b2b4');
      k.box(1.1, 2.6, 1.1, 1.6, 1.0, 3.2, '#b0b2b4', NC);
    }
    // ---- 117 號二樓的紅磚帶 ----
    {
      const k = seg(C, -1, 358.5, 363.5, S);
      k.box(0, k.W, 3.3, 3.95, -0.08, 0, '#a85a44', NC);
      k.box(0, k.W, 5.85, 6.3, -0.08, 0, '#a85a44', NC);
    }
    // ---- 121／123 號社區大樓（照 OSM w1388641486 的輪廓重蓋）中庭前的白磁磚圍牆、刺網、龍柏，與警衛亭 ----
    // 圍牆沿著輪廓的缺口（s 382.6～397.5，離中心線約 4.2 m）；參考線在 s 389.8 轉彎，分兩段蓋
    const WS = 4.2,
      r = lcg(29388);
    for (const [a, b] of [
      [382.6, 389.8],
      [389.8, 393.5],
    ]) {
      const k = seg(C, -1, a, b, WS),
        w = k.W;
      k.box(0, w, 0, 2.0, 0, 0.25, '#e6e6e0');
      k.box(-0.02, w + 0.02, 2.0, 2.12, -0.04, 0.29, '#3a5a8a', NC); // 藍色壓頂
      // 刺網：一圈一圈的鐵絲
      for (let x = 0.25; x < w; x += 0.5) {
        const g = new C.THREE.TorusGeometry(0.22, 0.012, 3, 10);
        g.rotateY(Math.PI / 2);
        g.translate(x, 2.38, 0.12);
        k._part(C.VC, C.paintGeo(g, '#8a8c8e'));
      }
      for (let x = 0.2; x < w; x += 2.5) k.box(x, x + 0.04, 2.1, 2.65, 0.1, 0.14, '#6a6c6e', NC);
      // 牆內的龍柏
      for (let x = 1.0; x < w - 0.5; x += 2.2)
        juniper(C, k, x + r() * 0.5, 1.4 + r() * 1.2, 6 + r() * 2, 1.1 + r() * 0.3);
    }
    {
      // 藍頂警衛亭（s 393.5～397）：白磁磚、朝路小窗、綠色號誌燈
      const k = seg(C, -1, 393.5, 397.5, WS),
        w = k.W;
      k.box(0.3, w - 0.3, 0, 2.5, 0, 2.4, '#e6e6e0');
      k.plane(C.YHT.win(), 1.6, 0.9, w / 2, 1.6, -0.02, FRONT);
      k.box(0.1, w - 0.1, 2.5, 2.7, -0.4, 2.7, '#3a5a8a', NC);
      k.box(w - 0.7, w - 0.3, 1.9, 2.4, -0.25, 0, '#2a2c2e', NC);
      ball(C, k, w - 0.5, 2.15, -0.27, 0.13, '#3ac060');
    }
    {
      // 南翼一樓：地下室車道入口（深色坡道口）與藍色磁磚雨遮、綠格鐵門、信箱、門口台階與盆栽（+x 朝北，車道在北邊）
      const k = seg(C, -1, 397.5, 408, CS),
        w = k.W;
      k.box(w - 4.6, w - 0.6, 0, 2.5, -0.06, 0, '#26272a', NC); // 車道口
      k.box(w - 4.8, w - 0.4, 2.5, 2.75, -0.7, 0, '#3a5a8a', NC); // 藍色磁磚雨遮
      k.box(w - 6.3, w - 5.0, 0.3, 2.4, -0.06, 0, '#8aa890', NC); // 綠格鐵門
      k.box(w - 7.6, w - 6.5, 0.6, 2.0, -0.12, 0, '#b89a7a', NC); // 信箱
      k.box(w - 7.0, w - 4.9, 0, 0.3, -0.35, 0, '#d8d8d2'); // 台階
      for (let x = 0.6; x < w - 7.9; x += 0.9) {
        k.cyl(x, -0.3, 0.2, 0, 0.35, '#5a5248', { seg: 8 });
        ball(C, k, x, 0.6, -0.3, 0.28, '#3f7a3a');
      }
    }
    // 中庭後面接起南北兩翼的 7 樓量體（離中心線 15～23 m）；參考線在 s 389.8 轉彎，分兩段
    for (const [a, b] of [
      [382.6, 389.8],
      [389.8, 397.5],
    ]) {
      const k = seg(C, -1, a, b, 15),
        top = 3.3 + 6 * 3.0;
      k.box(-0.3, k.W + 0.3, 0, top, 0, 8, `wall${WT}`);
      for (let y = 4.1; y < top; y += 3.0)
        k.plane(C.YHT.win(), k.W - 2, 1.3, k.W / 2, y, -0.03, FRONT);
    }
  },

  footprints(F) {
    return [
      F(R, 382.6, 389.8, -1, 4.2, 1.0, 0), // 社區大樓中庭前的圍牆
      F(R, 389.8, 397.5, -1, 4.2, 2.7, 0.4), // 圍牆與警衛亭
    ];
  },
};
