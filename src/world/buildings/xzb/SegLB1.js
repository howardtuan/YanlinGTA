// 力行北街 s 14～150 兩側（參考線 'LB'，s=0 在中北路口往東南走；路寬 6 m）。
// 照 Google 街景（2025-06 使用者相片球為主，s 4、s 136 是 2026-05 車拍）、國土測繪 2024 正射與 Google 衛星建模，
// 店名對照 data/cycu.json 的 POI 與 Google 地圖（照片在 side-session-notes 的 zs-sv/LB/）。
//   西南側（+1、照片 _R）由中北路口往東南：（YoYo PET 佑佑寵物轉角樓歸 StreetZhongbei.js，到 s 14）→ 131 巷口（窄巷）→
//     高記老牌紅心粉圓（4 樓灰磁磚，大紅招牌、藍鐵捲門）→ 深色店面（黑招牌）→ 阿燁紅麵線（3 樓暗紅磁磚，黑色木作招牌、圓形徽記）→
//     巷口（遊戲路網的「131巷」，實景是 121 巷）→ 阿寶肉羹大王（5 樓米白／暗紅轉角老公寓，紅綠招牌、藍鐵捲門）→
//     滝神 平價生魚片丼飯（4 樓暗紅磚，白燈籠、藍鐵捲門）→ 6 樓紅磁磚（一樓整面白色格子鐵捲門）→ 4 樓灰磁磚騎樓 → 5 樓米色街屋 →
//     （遊戲路網的「121巷」路口，實景這裡沒有巷子，照路網留空）→ 5 樓紅磁磚（一樓綠牆店面）→ 窄防火巷（鐵門）→
//     5 樓灰磁磚騎樓圓角轉角樓（一整排灰鐵捲門，出租中）→ 治平街 → 朝天椒麻辣鴛鴦火鍋（一層紅色鐵皮屋、紅色浪板大招牌）→
//     鐵皮棚停車處（s 134～146.5）→ 鐵皮圍牆與紅色直立招牌（s 146.5～150）；之後的 4 樓紅框玻璃店（s 150.2 起）、老時代牛肉麵歸 SegLB2
//   東北側（-1、照片 _L）：7 層灰色磁磚大樓群（屋頂太陽能板），臨街是人行道、洗石子花台、一排高大行道樹、
//     紅磚方柱加黑色花式鐵欄杆圍牆；s 16～32 圍牆後有黑色鐵棚架（停車棚），s≈87 紅磚車道入口、s≈100 有雨遮的出入口、
//     s≈124 小鐵門，s≈101 人行道上一排彩繪電箱。大樓立面照正射離中心線 11.4～15 m（貼在 OSM r8847869 前緣外），做到 s 150（之後歸 SegLB2）。
//     s 22.7～34.3 圍牆後面那棟 OSM 低樓（w637853854）保留。
// 原本 +1 側 s 71～146 是通用填充樓：有店面牆的放 hide，原本 noShop 的放 drop。f1681（s 148.5 起）歸 SegLB2。
// 看不清的招牌不放字。
const R = 'LB';
const NC = { col: false };
const PI = Math.PI;
// 開一個 Kit（見 SegD4）：k.W 格寬，k.X(s) 沿線距離換區域 x，k.Z(o) 離中心線距離換區域 z
const seg = (C, side, s0, s1, set = 4.3) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.X = (s) => (side > 0 ? s - s0 : s1 - s);
  k.Z = (o) => o - set;
  return k;
};
const sign = (C, k, text, bg, fg, w, h, x, y, z, rot = PI, sub = null) =>
  k.plane(C.paint(text, bg, fg, sub, w, h), w, h, x, y, z, rot, { emissive: 0.3 });
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 高大行道樹（樟樹、欖仁一類）：細高樹幹、樹冠在 5 m 以上
const tree = (C, k, x, z, h, cr, r) => {
  k.cyl(x, z, 0.2, -0.5, h - cr, '#5e4630', { seg: 6, col: true });
  const G = ['#3f7a3a', '#4b8a3e', '#356b34'];
  ball(C, k, x, h - cr * 0.85, z, cr * 0.8, G[0], 0.8);
  for (let j = 0; j < 4; j++) {
    const a = j * 1.57 + r() * 0.8;
    ball(
      C,
      k,
      x + Math.cos(a) * cr * 0.5,
      h - cr * (0.95 + r() * 0.3),
      z + Math.sin(a) * cr * 0.5,
      cr * (0.55 + r() * 0.15),
      G[1 + (j % 2)],
      0.75
    );
  }
};

const GT = '#a9a7a1', // 灰磁磚
  MR_ = '#8e4a42', // 暗紅磁磚
  RT = '#a0503f'; // 紅磁磚

const W = (s0, s1, sp) => [R, s0, s1, 1, { d: 12, ...sp }];

// 東北側大樓群的分段（s0, s1, 立面離中心線, 樓層, 牆色, 深度）：照正射屋頂的臨街邊。
// s 53.7 以後遊戲裡已經有一整片 3 層的 OSM 建物（r8847869，臨街邊離中心線 13.8→12.4 m、前排量體到 27 m 才是中庭），
// 它保留不藏，這裡的 7 層大樓立面貼在它前緣外約 1 m（照參考線轉折切段）、深到中庭邊，等於把前排那棟包起來長高
const TOWERS = [
  [35, 53.5, 15, 7, '#a6a49e', 12],
  [53.5, 65.65, 12.8, 7, '#a9a7a1', 14],
  [65.65, 77.75, 12.6, 7, '#a9a7a1', 14],
  [77.75, 99, 12.3, 6, '#8f8d88', 14.5],
  [99, 106.93, 12.0, 7, '#a6a49e', 15],
  [106.93, 124, 11.8, 7, '#a6a49e', 15],
  [124, 150, 11.4, 7, '#9d9b96', 15.5],
];
// 圍牆的開口（s0, s1）：車道、出入口、小鐵門
const GAPS = [
  [84.5, 90.5],
  [98.6, 101.4],
  [123.6, 125.4],
];
// 參考線的轉折點（s），長的圍牆、花台在這裡切段，才會貼著路
const BEND = [14, 16.26, 29.19, 39.29, 65.65, 77.75, 106.93, 146.66, 150];

export default {
  drop: [
    // 原本 noShop 的填充樓
    'f2_946',
    'f2_947',
    'f2_949',
    'f1677',
    'f1679',
    'f1680',
  ],
  hide: [
    // 有店面牆的填充樓：灰磁磚轉角樓那排、朝天椒那排
    'f2_945',
    'f2_948',
    'f2_950',
    'f1675',
    'f1676',
    'f1678',
  ],
  ownSign: [
    '阿燁紅麵線',
    '阿寶肉羹大王',
    '滝神 平價生魚片丼飯',
    '朝天椒麻辣鴛鴦火鍋店',
    // 2025-06 街景看不到的店（灰磁磚轉角樓一整排鐵捲門出租中）
    '萊爾富',
    '粉紅蛙仙草奶凍之家',
    'Quán ăn Việt Nam',
  ],
  lots: [
    // ================= 西南側（+1）=================
    // s 14～17 是 131 巷口（遊戲路網沒有這條，留一個窄縫）
    // 高記老牌紅心粉圓：4 樓灰磁磚，大紅招牌「創立於1987年」，藍色鐵捲門
    W(17, 20.8, {
      nf: 4,
      wall: '#b9b7b0',
      sign: ['高記老牌紅心粉圓', '#c8202a', '#ffffff', '創立於1987年'],
      ground: 'shutter',
      sh: '#2f4f8a',
      bal: 'grille',
    }),
    // 深色店面：黑色招牌（字看不清）、黑色門面
    W(20.8, 23.6, {
      nf: 4,
      wall: '#b0aaa2',
      low: '#2a2a2a',
      sign: ['', '#1e1e1e', '#d04040'],
      ground: 'open',
      door: 0,
      bal: 'grille',
    }),
    // 阿燁紅麵線：3 樓暗紅磁磚，黑色木作招牌（圓形徽記在 custom），一樓深色木窗
    W(23.6, 26.6, {
      nf: 3,
      wall: MR_,
      noband: 1,
      ground: 'open',
      door: 0,
      bal: 'glass',
      glass: '#7a8a8a',
      d: 10,
    }),
    // ---- 巷口（遊戲路網的 131 巷，s 26.7～31.7）----
    // 阿寶肉羹大王：5 樓米白／暗紅轉角老公寓，紅底黃字招牌加綠色下緣，藍鐵捲門，直立紅招牌
    W(31.8, 38.6, {
      nf: 5,
      wall: '#ddd6c6',
      sign: ['阿寶 肉焿大王', '#c8282a', '#f2d23a'],
      vert: ['阿寶 肉焿大王', '#c8282a', '#f2d23a'],
      ground: 'shutter',
      sh: '#3a6aa0',
      bal: 'cage',
      d: 13,
    }),
    // 滝神 平價生魚片丼飯：4 樓暗紅磚，深色木招牌、白燈籠（custom），藍鐵捲門
    W(38.6, 43.8, {
      nf: 4,
      wall: MR_,
      sign: ['平價生魚片丼飯', '#2a2826', '#f4f2ee'],
      vert: ['生魚片丼飯', '#f4f2ee', '#2a2a2a'],
      ground: 'shutter',
      sh: '#3a5a78',
      bal: 'cage',
    }),
    // 6 樓紅磁磚：一樓整面白色格子鐵捲門（未營業）
    W(43.8, 50, {
      nf: 6,
      wall: RT,
      ground: 'gate',
      sh: '#e8e8e4',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 4 樓灰磁磚：騎樓、灰鐵捲門
    W(50, 56.5, {
      nf: 4,
      wall: '#b4b3ad',
      ground: 'shutter',
      sh: '#8a8c8e',
      bal: 'grille',
    }),
    // 5 樓米色街屋
    W(56.5, 63, {
      nf: 5,
      wall: '#d8cfbd',
      ground: 'shutter',
      sh: '#a8aaa8',
      bal: 'cage',
    }),
    // ---- 遊戲路網的 121 巷（s 63.2～68.2）----
    // 5 樓紅磁磚：一樓綠色牆面的店（外送機車停門口）
    W(68.3, 76, {
      nf: 5,
      wall: RT,
      low: '#4f9a3a',
      noband: 1,
      ground: 'open',
      bal: 'plain',
    }),
    // ---- s 76～77.2 窄防火巷（鐵門在 custom）----
    // 5 樓灰磁磚騎樓轉角樓：一整排灰鐵捲門（紅色出租告示），轉角圓弧在 custom
    W(77.2, 82.6, {
      nf: 5,
      wall: GT,
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      bal: 'plain',
      d: 13,
    }),
    W(82.6, 88, {
      nf: 5,
      wall: GT,
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      bal: 'plain',
      d: 13,
    }),
    W(88, 93.4, {
      nf: 5,
      wall: GT,
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      bal: 'plain',
      d: 13,
    }),
    W(93.4, 98.8, {
      nf: 5,
      wall: GT,
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      bal: 'plain',
      d: 13,
    }),
    // ---- 治平街（s 104.4～109.4）----
    // 朝天椒麻辣鴛鴦火鍋：一層紅色鐵皮屋，大片落地玻璃、黑鐵捲門，屋頂上紅色浪板大招牌（custom）
    W(110, 118, {
      nf: 1,
      gf: 3.6,
      wall: '#c8302a',
      noband: 1,
      ground: 'shop',
      door: 0,
      d: 16,
      set: 5.2,
    }),
    W(118, 126, {
      nf: 1,
      gf: 3.6,
      wall: '#c8302a',
      noband: 1,
      ground: 'shutter',
      sh: '#2a2a2c',
      door: 0,
      d: 16,
      set: 5.2,
    }),
    W(126, 134, {
      nf: 1,
      gf: 3.6,
      wall: '#c8302a',
      noband: 1,
      ground: 'shop',
      door: 0,
      d: 16,
      set: 5.2,
    }),
    // ---- s 134～146.5 鐵皮棚停車處、s 146.5～150 鐵皮圍牆（custom）；紅框玻璃店那棟 4 樓在 s 150.2 以後，歸 SegLB2 ----
  ],

  custom(C) {
    const r = C.lcg(26261);
    // ================= 西南側（+1）=================
    // 131 巷口窄縫：巷子裡的水泥地
    {
      const k = seg(C, 1, 14, 17);
      k.box(-0.01, k.W + 0.01, -0.5, 0.04, -k.apron, 12, C.MR.concrete, {
        col: false,
        surface: true,
      });
    }
    // 阿燁紅麵線：黑色木作招牌板，左邊一個圓形徽記（字看不清不放），樓下深色木窗框
    {
      const k = seg(C, 1, 23.6, 26.6);
      k.box(0.05, k.W - 0.05, 2.35, 3.25, -0.32, 0, '#2a2624', NC);
      for (let y = 2.45; y < 3.2; y += 0.16)
        k.box(0.1, k.W - 0.1, y, y + 0.03, -0.34, -0.31, '#4a4440', NC);
      k.cyl(0.75, -0.36, 0.4, 2.4, 3.2, '#7a5a5c', { seg: 8 });
      k.box(0.3, 2.2, 0.9, 2.0, -0.08, 0, '#4a3a2e', NC); // 木窗框
      k.box(0.2, 1.4, 0, 0.45, -1.1, -0.5, '#d8d0c0', NC); // 門口小木桌
    }
    // 阿寶肉羹大王：招牌下緣綠色帶、巷子那一面的窗
    {
      const k = seg(C, 1, 31.8, 38.6);
      k.box(0.05, k.W - 0.05, 2.4, 2.5, -0.3, -0.02, '#2f8a4a', NC);
      for (let f = 1; f < 5; f++)
        for (const z of [2.2, 5.4, 8.6])
          k.plane(C.YHT.win(), 1.3, 1.2, -0.03, 3.3 + (f - 1) * 3 + 1.5, z, -PI / 2);
    }
    // 滝神：一排白燈籠
    {
      const k = seg(C, 1, 38.6, 43.8);
      for (let x = 0.5; x < k.W - 0.3; x += 0.62) {
        k.cyl(x, -0.45, 0.17, 1.95, 2.35, '#f4f2ec', { seg: 8 });
        k.cyl(x, -0.45, 0.05, 2.08, 2.22, '#c8282a', { seg: 6 });
      }
    }
    // 綠牆店：門口的外送箱機車、小黃牌
    {
      const k = seg(C, 1, 68.3, 76);
      k.box(4.6, 5.6, 1.3, 1.9, -0.06, -0.01, '#e8c838', NC);
      k.scooter(2.0, -0.9, 0, '#2a2a30');
      k.box(2.3, 2.85, 1.0, 1.5, -0.95, -0.45, '#e0407a', NC); // 熊貓外送箱
    }
    // 窄防火巷：灰色鐵門（看得到後面的窄巷）
    {
      const k = seg(C, 1, 76, 77.2);
      k.plane(C.bars, k.W, 2.0, k.W / 2, 1.0, 0.3, PI, { transparent: true, double: true });
      k.box(0, k.W, 0, 2.0, 0.3, 0.34, '#5a5c5e', { col: true });
      k.box(0, k.W, -0.5, 0.04, -k.apron, 12, C.MR.concrete, { col: false, surface: true });
    }
    // 灰磁磚騎樓轉角樓：騎樓柱子與樓板（一樓鐵捲門退在柱子後面）、紅色出租告示
    {
      const k = seg(C, 1, 77.2, 104.3),
        w = k.W;
      k.box(0, w - 5.5, 2.95, 3.3, -1.25, 0, GT, NC);
      for (let x = 0; x < w - 5; x += 5.4) k.box(x, x + 0.5, 0, 3.0, -1.25, -0.75, GT, NC);
      k.box(1.0, 1.6, 1.6, 2.4, -0.8, -0.74, '#d8282a', NC);
      // 圓角：半徑 5.5 m，圓心在 s 98.8 那格的後方
      const cx = w - 5.5,
        rr = 5.5,
        top = 3.3 + 4 * 3.0;
      k.box(cx, w, 0, top, rr, 13, C.wallMat(GT));
      k.cyl(cx, rr, rr, 3.3, top, C.wallMat(GT), { seg: 20, col: true });
      k.cyl(cx, rr, rr - 1.2, 0, 3.3, '#7f8183', { seg: 20, col: true }); // 一樓退縮的鐵捲門圈
      k.cyl(cx, rr, rr + 0.05, 2.95, 3.3, '#9a9893', { seg: 20 });
      for (let f = 1; f < 5; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.cyl(cx, rr, rr + 0.07, y - 0.1, y + 0.05, '#c6c4be', { seg: 20 });
        for (const a of [PI / 8, PI / 4, (3 * PI) / 8]) {
          const nx = Math.sin(a),
            nz = -Math.cos(a);
          k.plane(
            C.YHT.win(),
            1.2,
            1.3,
            cx + nx * (rr + 0.05),
            y + 1.5,
            rr + nz * (rr + 0.05),
            Math.atan2(nx, nz)
          );
        }
      }
      // 圓弧下的騎樓柱
      for (const a of [0.15, PI / 4, PI / 2 - 0.1]) {
        const x = cx + Math.sin(a) * (rr - 0.3),
          z = rr - Math.cos(a) * (rr - 0.3);
        k.cyl(x, z, 0.28, 0, 3.3, GT, { seg: 8 });
      }
      // 治平街那一面的窗
      for (let f = 1; f < 5; f++)
        for (let z = rr + 1.6; z < 12; z += 2.8)
          k.plane(C.YHT.win(), 1.4, 1.3, w + 0.03, 3.3 + (f - 1) * 3 + 1.5, z, PI / 2);
      k.box(cx, w + 0.02, top, top + 0.15, rr, 13, 'gray', NC);
      k.box(-0.01, w + 0.01, -0.5, 0.05, -k.apron, rr, C.MR.concrete, {
        col: false,
        surface: true,
      });
    }
    // 朝天椒：屋頂上整排紅色浪板大招牌、左右直立招牌、門口木桌椅
    {
      const k = seg(C, 1, 110, 134, 5.2),
        w = k.W;
      k.box(0.2, w - 0.2, 3.6, 5.2, 0.3, 0.5, '#c8302a', NC);
      for (let x = 0.4; x < w - 0.3; x += 0.5)
        k.box(x, x + 0.12, 3.62, 5.18, 0.24, 0.3, '#e8e0d8', NC);
      sign(C, k, '朝天椒', '#c8302a', '#ffffff', 6.0, 1.3, w / 2 + 3, 4.4, 0.22);
      sign(C, k, '麻辣鴛鴦火鍋', '#c8302a', '#ffffff', 4.0, 0.9, w / 2 - 3.2, 4.4, 0.22);
      k.box(w / 2 - 0.6, w / 2 + 0.6, 3.8, 5.0, 0.18, 0.24, '#f4f2ec', NC); // 徽記底
      ball(C, k, w / 2, 4.4, 0.16, 0.4, '#a06a3a', 1.2);
      k.box(-0.3, w + 0.3, 3.5, 3.62, -1.6, 0, '#8a2a22', NC); // 屋簷
      for (const x of [0.5, w - 1.0]) {
        k.box(x, x + 0.5, 0.2, 3.3, -1.3, -1.15, '#c8282a', NC);
        k.plane(
          C.ROWT.vert('lb朝天椒#c8282a', '#c8282a', '#ffffff', '朝天椒'),
          0.5,
          2.8,
          x + 0.25,
          1.9,
          -1.32,
          PI,
          {
            emissive: 0.3,
          }
        );
      }
      k.box(16, 18.4, 1.0, 2.6, -0.06, -0.01, '#f2d23a', NC); // 黃色價目海報
      for (const x of [2.5, 5.5, 18.5]) {
        k.box(x, x + 1.4, 0.72, 0.78, -1.0, -0.3, '#7a5a3a', NC);
        for (const dx of [0.1, 1.2])
          k.box(x + dx, x + dx + 0.08, 0, 0.72, -0.95, -0.35, '#5a4028', NC);
        for (const dz of [-1.25, -0.1]) k.box(x, x + 1.4, 0.4, 0.45, dz - 0.15, dz, '#6a4a30', NC);
      }
      k.box(-0.01, w + 0.01, -0.5, 0.05, -k.apron, 0, C.MR.concrete, { col: false, surface: true });
    }
    // 鐵皮棚停車處：細鐵柱、往後傾的浪板屋頂，停一台綠色帆布小貨車
    {
      const k = seg(C, 1, 134, 146.5),
        w = k.W;
      for (const x of [0.15, w / 2, w - 0.25])
        for (const z of [0.3, 9.5]) k.box(x, x + 0.1, 0, 3.2, z, z + 0.1, '#6a6c6e', NC);
      k.box(-0.1, w + 0.1, 3.2, 3.28, 0, 10, C.MR.roof, NC);
      k.box(0, w, 0, 3.2, 10, 10.2, C.wallMat('#9a9c9a'));
      k.box(1.2, 3.0, 0.4, 1.4, 1.0, 5.6, '#e4e4e0'); // 小貨車
      k.box(1.25, 2.95, 1.4, 2.6, 2.4, 5.6, '#3f6a3a', NC); // 綠色帆布
      k.box(1.25, 2.95, 1.4, 2.2, 1.0, 2.3, '#dcdcd8', NC); // 車頭
      k.box(-0.01, w + 0.01, -0.5, 0.05, -k.apron, 10, C.MR.concrete, {
        col: false,
        surface: true,
      });
    }
    // 鐵皮圍牆：灰色浪板，靠紅框店那頭立一支紅色直立招牌（店名看不清不放字）
    {
      const k = seg(C, 1, 146.5, 150),
        w = k.W;
      k.box(0, w, 0, 2.4, 0, 0.08, C.wallMat('#8e9294'));
      for (const x of [0.05, w - 0.12]) k.box(x, x + 0.08, 0, 2.5, -0.06, 0.12, '#5f6264', NC);
      k.box(w - 1.1, w - 0.5, 0.6, 3.4, -0.35, -0.15, '#c8302a', NC);
      k.box(w - 0.85, w - 0.75, 0, 0.6, -0.3, -0.2, '#5f6264', NC);
      k.box(-0.01, w + 0.01, -0.5, 0.05, -k.apron, 0, C.MR.concrete, { col: false, surface: true });
    }

    // ================= 東北側（-1）=================
    // 人行道外側的洗石子花台＋灌木、行道樹、紅磚方柱加黑色花式鐵欄杆圍牆（開口留給車道與出入口）
    const FO = 7.4; // 圍牆離中心線
    for (let i = 0; i < BEND.length - 1; i++) {
      const a = BEND[i],
        b = BEND[i + 1];
      const k = seg(C, -1, a, b, 4.5),
        w = k.W;
      // 花台：從人行道邊到圍牆前（車道開口那段不做）
      const cuts = GAPS.filter(([g0, g1]) => g1 > a && g0 < b).map(([g0, g1]) => [
        k.X(Math.min(b, g1)),
        k.X(Math.max(a, g0)),
      ]);
      const spans = [];
      let x0 = 0;
      for (const [c0, c1] of cuts.sort((p, q) => p[0] - q[0])) {
        if (c0 > x0) spans.push([x0, c0]);
        x0 = Math.max(x0, c1);
      }
      if (x0 < w) spans.push([x0, w]);
      for (const [p0, p1] of spans) {
        if (p1 - p0 < 0.6) continue;
        k.box(p0, p1, -0.4, 0.55, 0.2, 2.2, '#c9c5ba'); // 洗石子花台
        k.box(p0 + 0.1, p1 - 0.1, 0.55, 1.05, 0.35, 2.05, '#3f7a3a', NC); // 灌木
        // 圍牆：矮牆、紅磚方柱（灰色石帽）、黑色鐵欄杆
        const z = FO - 4.5;
        k.box(p0, p1, 0, 0.6, z, z + 0.3, '#bdb9ae');
        const n = Math.max(1, Math.round((p1 - p0) / 3.2)),
          bay = (p1 - p0) / n;
        for (let j = 0; j <= n; j++) {
          const x = Math.min(p1 - 0.4, Math.max(p0, p0 + j * bay - 0.2));
          k.box(x, x + 0.4, 0.6, 1.95, z - 0.05, z + 0.35, '#a0523a', NC);
          k.box(x - 0.05, x + 0.45, 1.95, 2.25, z - 0.1, z + 0.4, '#cfcac0', NC);
        }
        for (let j = 0; j < n; j++)
          k.plane(C.bars, bay - 0.44, 1.2, p0 + (j + 0.5) * bay, 1.25, z + 0.15, PI, {
            transparent: true,
            double: true,
          });
        k.wallLine(p0, z + 0.15, p1, z + 0.15, 0, 2.0);
        // 行道樹（在花台裡）
        for (let x = p0 + 1.5 + r() * 2; x < p1 - 1.2; x += 6 + r() * 2.5)
          tree(C, k, x, 1.2, 8.5 + r() * 2.5, 2.2 + r() * 0.6, r);
      }
      k.box(-0.01, w + 0.01, -0.5, 0.05, -1.5, 0.2, C.MR.concrete, { col: false, surface: true });
    }
    // s 16～32：圍牆後面的黑色鐵棚架（停車棚），下面停一排機車
    {
      const k = seg(C, -1, 16.5, 29.19, 8.2),
        w = k.W;
      for (let x = 0.2; x < w; x += 3.0)
        for (const z of [0.2, 3.6]) k.box(x, x + 0.14, 0, 2.6, z, z + 0.14, '#2a2a2c', NC);
      k.box(0, w, 2.6, 2.72, 0, 3.9, '#2a2a2c', NC);
      for (let x = 0.3; x < w; x += 0.6) k.box(x, x + 0.08, 2.72, 2.84, 0, 3.9, '#3a3a3c', NC);
      for (let x = 0.6; x < w - 1; x += 0.9)
        k.scooter(x, 1.2, 1, ['#2a2a30', '#c9c9c4', '#2f6db3'][((x * 3) % 3) | 0]);
    }
    {
      const k = seg(C, -1, 29.19, 33, 8.2),
        w = k.W;
      for (let x = 0.2; x < w; x += 3.0)
        for (const z of [0.2, 3.6]) k.box(x, x + 0.14, 0, 2.6, z, z + 0.14, '#2a2a2c', NC);
      k.box(0, w, 2.6, 2.72, 0, 3.9, '#2a2a2c', NC);
      for (let x = 0.3; x < w; x += 0.6) k.box(x, x + 0.08, 2.72, 2.84, 0, 3.9, '#3a3a3c', NC);
    }
    // 7 層灰色磁磚大樓：一樓深色玻璃與鐵窗，樓上整齊的窗、冷氣、陽台，屋頂太陽能板
    for (const [s0, s1, set, nf, wall, d] of TOWERS) {
      const k = seg(C, -1, s0, s1, set),
        w = k.W,
        gf = 3.6,
        fh = 3.0,
        top = gf + (nf - 1) * fh,
        wm = C.wallMat(wall);
      C.shell(k, w, d, top, wm);
      k.box(0.3, w - 0.3, 0.3, gf - 0.5, -0.04, 0, '#3a4046', NC); // 一樓深色窗帶
      for (let x = 1.2; x < w - 1; x += 3.4)
        k.plane(C.bars, 2.4, 1.6, x + 1.2, 1.6, -0.08, PI, { transparent: true });
      k.box(0, w, gf - 0.3, gf, -0.5, 0, '#8e8c86', NC); // 一樓上方的雨遮板
      for (let f = 1; f < nf; f++) {
        const y = gf + (f - 1) * fh;
        k.box(-0.02, w + 0.02, y - 0.08, y + 0.06, -0.12, 0, '#c4c2bc', NC); // 樓層線
        for (let x = 0.9, j = 0; x < w - 1.6; x += 3.1, j++) {
          C.win(k, x + 0.8, y + 1.5, 1.6, 1.4, j % 3 === 0);
          if (r() < 0.35) C.ac(k, x + (r() < 0.5 ? -0.5 : 1.7), y + 0.4);
        }
        // 幾處凸出的陽台（白色欄杆）
        for (let x = 4; x < w - 3; x += 9) {
          k.box(x, x + 2.6, y - 0.05, y + 0.08, -1.0, 0, '#bdbbb5', NC);
          k.box(x, x + 2.6, y + 0.08, y + 1.0, -1.0, -0.95, '#d8d6d0', NC);
        }
      }
      // 樓梯間（一段比較高的直條）
      const sx = w * 0.45;
      k.box(sx, sx + 2.4, 0, top + 2.8, -0.3, 3, C.wallMat('#9c9a95'));
      for (let f = 1; f < nf; f++)
        k.plane(C.YHT.win(), 1.0, 1.6, sx + 1.2, gf + (f - 1) * fh + 1.6, -0.32, PI);
      // 屋頂太陽能板
      for (let z = 1.2; z < d - 1.5; z += 2.4)
        k.box(0.8, w - 0.8, top + 0.6, top + 0.75, z, z + 2.0, '#2c3a5a', NC);
      for (const x of [0.8, w / 2, w - 1.0])
        k.box(x, x + 0.15, top, top + 0.6, 1.2, d - 1.5, '#6a6c70', NC);
    }
    // s 136 一帶一樓的排氣管
    {
      const k = seg(C, -1, 134, 140, 11.4);
      for (const x of [1.2, 1.8, 2.6]) k.cyl(x, -0.4, 0.14, 0.5, 4.2, '#9a9c9e', { seg: 8 });
    }
    // s≈100 有雨遮的出入口、s≈87 紅磚車道
    {
      const k = seg(C, -1, 98.6, 101.4, 7.4);
      k.box(0, k.W, 2.6, 2.75, 0, 2.5, '#3a4a40', NC);
      k.box(0.2, k.W - 0.2, 0, 2.2, 2.4, 2.5, '#3a3a3c', NC);
    }
    {
      const k = seg(C, -1, 84.5, 90.5, 4.5);
      k.box(-0.01, k.W + 0.01, -0.5, 0.06, -1.5, 9.0, '#a85a44', { col: false, surface: true });
    }
    // s≈101～105 人行道上的彩繪電箱
    {
      const k = seg(C, -1, 101.5, 105.5, 3.5);
      const cols = ['#4a8ac8', '#3a7ab8', '#5aa0d8', '#6a9ad0'];
      for (let j = 0; j < 4; j++) {
        const x = 0.1 + j * 0.98;
        k.box(x, x + 0.85, 0, 1.4 - (j === 0 ? 0.2 : 0), 0.1, 0.6, cols[j]);
        k.box(x + 0.1, x + 0.75, 0.5, 1.1, 0.08, 0.1, '#e8b0c0', NC);
      }
    }
  },

  // custom 蓋的東西佔的地：灰磁磚轉角樓圓角、鐵皮棚、鐵棚架、東北側第一棟大樓（其他幾棟蓋在 OSM 建物 r8847869 的前排上，不另外佔地）
  footprints(F) {
    return [
      F(R, 98.8, 104.3, 1, 4.3, 13, 1.5),
      F(R, 134, 146.5, 1, 4.3, 10.2, 1.5),
      F(R, 16.5, 33, -1, 8.2, 4, 0),
      F(R, 35, 53.5, -1, 15, 12, 1.2),
    ];
  },
};
