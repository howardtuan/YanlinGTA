// 力行北街 s 150～224 兩側（中原夜市那排，到日新路口轉角前）（參考線 'LB'，s=0 在中北路口往東南走；路寬 6 m）。
// 照 Google 街景（s 172 以後是 2026-05 街景車；s 148、s 160 只有 2025-06 使用者相片球，位置會偏幾公尺）與國土測繪 2024 正射建模，
// 寬度用 2026-05 車拍照片的視角換算（照片在 side-session-notes 的 zs-sv/LB/）。
//   西南側（+1、照片 _R）由中北路往日新路：4 樓灰白磁磚（紅框玻璃店面、橘紅雨棚、白鐵捲門）→
//     老師傅牛肉麵（一樓鐵架玻璃雨棚、屋頂深灰大招牌、路邊方形立招、黃色「9」圓牌、門口一排盆栽）→
//     KK 撞球（77 號，一樓整面玻璃門窗，上面一整排撞球圖案的大招牌）→ 75 號 4 樓（FAFA.CE 美甲灰色雨棚、套房出租的公寓入口）→
//     73 號 4 樓（米色雨棚鐵捲門）→ 71 號 4 樓灰白磁磚轉角樓（小豬很忙蔬果魯味：咖啡色波浪雨棚、白色直立招牌、巷口燈箱、紅色蔬果立牌，
//     巷口加蓋一間玻璃屋）→ 往西南的小巷（s 199～203.5）→ 5 樓米白磁磚轉角樓（每層紅色腰帶，一樓兩間店、黃綠帆布雨棚）→
//     4 樓米色舊樓（灰雨棚鐵捲門）→ 鐵柵門防火巷 → 4 樓紅磚色磁磚樓（綠色長雨棚，下面是藍白帆布蓋著的攤車）
//   東北側（-1、照片 _L）由中北路往日新路：7 層灰色磁磚大樓群的東南段（前面行道樹、花台、紅磚柱黑鐵欄杆圍牆，樓梯間凸出、鏤空磚陽台）→
//     不鏽鋼伸縮大門車道（s 185～189.5）→ 矮牆後的大樹叢 → 往東北的窄巷（s 196.5～198.6）→
//     4 樓舊公寓（紅鐵捲門、藍色小雨棚；隔壁精篆印社，二樓整面紅藍大招牌、鑰匙造型立牌）→ 70 號 4 樓（綠白條紋雨棚，一樓敞開停機車）→
//     IT'S NOT EASY（白鐵捲門、貓咪圓招牌）→ 灰鐵捲門窄樓 → 68 號 4 樓米黃磁磚舊公寓（公寓入口、綠雨棚灰鐵捲門）
// 兩端接縫：
//   s 150 以前是 SegLB1.js；西南側 4 樓灰白磁磚從 s 150.2 起（左邊那面鐵皮圍牆與紅色直立招牌在 s 150 以前，歸 SegLB1），
//   東北側大樓群、圍牆、行道樹從 s 150 起做。
//   s 224 以後是日新路口四角（src/world/buildings/StreetRixin.js 的 #43～#46、#57），兩側都做到 s 224 為止，不動那幾格。
// 東北側大樓群在遊戲裡是 OSM 建物 r8847869（3 層、s 53.7～185.6、離中心線 11.9 m 起，大部分在 SegLB1 的範圍），這裡不動它，
//   只在它前面補 7 層灰磁磚立面量體（離中心線 11.5 m、深 9 m），圍牆與行道樹照實景。
// 原本兩側是 src/world/buildings/NightMarketFill.js 照正射補的通用量體（nm36～nm53，都有店面牆）與填充樓 f1681～f1688：
//   一律放 hide（資料留著、全圖亂數不變）；f1683、f1685 原本就 noShop，drop 掉會讓全圖停放機車重排，所以也放 hide。
// 看不清的招牌不放字。
const R = 'LB';
const NC = { col: false };
const PI = Math.PI;
const seg = (C, side, s0, s1, set = 4.3) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  return k;
};
// 一格裡面 s → 區域 x（+1 側 x 隨 s 增加；-1 側 x=0 在 s1 那端）
const sx = (side, s0, s1, s) => (side > 0 ? s - s0 : s1 - s);
const GREEN = ['#3f7a3a', '#4b8a3e', '#356b34', '#5a8f45'];
const blob = (C, k, x, y, z, rx, ry, rz, hex) => {
  const g = new C.THREE.SphereGeometry(1, 7, 5);
  g.scale(rx, ry, rz);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 行道樹：樹幹＋三四團樹冠
const tree = (C, k, x, z, h, r, seed) => {
  k.cyl(x, z, 0.16, 0, h - r * 0.4, '#6a5040', { seg: 7, col: true });
  for (const [dx, dy, dz, f] of [
    [0, 0.45, 0, 1],
    [-0.75, -0.35, 0.3, 0.8],
    [0.7, -0.25, -0.35, 0.82],
    [0.1, -0.1, 0.8, 0.7],
  ])
    blob(
      C,
      k,
      x + dx * r,
      h + dy * r,
      z + dz * r,
      r * f,
      r * f * 0.75,
      r * f,
      GREEN[(seed + Math.round(dx * 3 + dz * 5 + 8)) % 4]
    );
};
const shrub = (C, k, x, z, r, y = 0, hex = '#4b8a3e') =>
  blob(C, k, x, y + r * 0.55, z, r, r * 0.7, r, hex);

// 一格街屋：+1 西南側、-1 東北側
const P = (s0, s1, sp) => [R, s0, s1, 1, { d: 11, ...sp }];
const Q = (s0, s1, sp) => [R, s0, s1, -1, { d: 12, ...sp }];

export default {
  // 夜市補建（NightMarketFill.js）與填充樓：都有店面牆，不能 drop
  hide: [
    // 東北側 s 152.4～223.5
    'nm53',
    'nm52',
    'nm51',
    'nm50',
    'nm49',
    'nm48',
    'nm47',
    'nm46',
    'nm45',
    'nm44',
    'nm39',
    'nm38',
    'nm37',
    'nm36',
    // 西南側 s 205～224.5
    'nm43',
    'nm42',
    'nm41',
    'nm40',
    // 西南側 s 148.5～193.8 的填充樓（f1681 跨在 s 150 接縫上，實景那段是這裡的 4 樓灰白磁磚與 SegLB1 的鐵皮圍牆）
    'f1681',
    'f1682',
    'f1684',
    'f1686',
    'f1687',
    'f1688',
    // 原本就 noShop 的填充樓（s 159～175.2，實景是老師傅牛肉麵與 KK 撞球）：drop 會讓全圖停放機車重排，也放 hide（xzLook 會補 facade glass）
    'f1683',
    'f1685',
  ],
  ownSign: ['老師傅牛肉麵', '小豬很忙蔬果魯味', 'IT’S NOT EASY'],
  lots: [
    // ================= 西南側（+1）=================
    // 4 樓灰白磁磚：一樓紅框玻璃店面（店內貼海報）、橘紅雨棚，旁邊白鐵捲門與鋁門，樓上紫色窗簾
    P(150.2, 157.5, {
      nf: 4,
      wall: '#d3d4d0',
      ground: 'shop',
      awn: '#cf4a2c',
      noband: 1,
      bal: 'plain',
    }),
    // 老師傅牛肉麵：一樓鐵皮屋（前面的鐵架玻璃雨棚、立招、盆栽在 custom），屋頂深灰大招牌粉紅字
    P(157.5, 165.5, {
      nf: 1,
      gf: 3.2,
      wall: '#9b9d9e',
      ground: 'shop',
      noband: 1,
      door: 0,
      roof: 'bill',
      bill: ['老師傅牛肉麵', '#4a4b4f', '#e8558a', 7.4, 1.5],
      roofCol: '#7d8184',
      set: 5.6,
      d: 9.5,
      bikes: 2,
    }),
    // KK 撞球（77 號）：一樓整面玻璃門窗，上面的撞球大招牌在 custom
    P(165.5, 182.3, {
      nf: 1,
      gf: 3.1,
      wall: '#c9c9c4',
      ground: 'shop',
      noband: 1,
      roofCol: '#8f9396',
      d: 12,
      bikes: 4,
    }),
    // 75 號：4 樓米灰磁磚，一樓 FAFA.CE 美甲（灰色雨棚、灰鐵捲門），右邊是套房出租的公寓入口
    P(182.3, 187, {
      nf: 4,
      wall: '#d4cfc3',
      sign: ['FAFA.CE', '#6c7075', '#ffffff', 'NAILS. LASHES. BROWS'],
      awn: '#6c7075',
      ground: 'shutter',
      sh: '#6e7376',
      bal: 'grille',
    }),
    // 73 號：4 樓，米色雨棚鐵捲門
    P(187, 191.8, {
      nf: 4,
      wall: '#dcd6c8',
      awn: '#c9b48c',
      ground: 'shutter',
      sh: '#8d8f8e',
      noband: 1,
      bal: 'cage',
    }),
    // 71 號小豬很忙蔬果魯味：4 樓灰白磁磚轉角樓，咖啡色波浪雨棚、白色直立招牌（字看不清），巷口燈箱與玻璃屋在 custom
    P(191.8, 197.3, {
      nf: 4,
      wall: '#d0d1cd',
      awn: '#7d6b5c',
      ground: 'shutter',
      sh: '#8f8c86',
      noband: 1,
      vert: ['    ', '#f3f1ea', '#c8282a'],
      bal: 'plain',
      d: 10,
    }),
    // 巷口對角的 5 樓米白磁磚轉角樓：每層紅色腰帶（custom），一樓兩間店、黃綠帆布雨棚，頂樓拱形鐵窗
    P(203.5, 212, {
      nf: 5,
      wall: '#e2dccd',
      ground: 'shop',
      awn: '#bdb56e',
      noband: 1,
      bal: 'grille',
      door: 0,
      d: 12,
    }),
    // 4 樓米色舊樓：灰雨棚鐵捲門
    P(212, 218.6, {
      nf: 4,
      wall: '#ddd4bf',
      ground: 'shutter',
      sh: '#9a9a96',
      awn: '#8c8f92',
      noband: 1,
      bal: 'cage',
      d: 12,
    }),
    // 68 號對面：4 樓紅磚色磁磚樓，綠色長雨棚，下面是藍白帆布蓋著的攤車（custom）
    P(219.8, 224, {
      nf: 4,
      wall: '#9a5444',
      ground: 'shutter',
      sh: '#9a9c9a',
      awn: '#3f8a5a',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 10,
    }),

    // ================= 東北側（-1）=================
    // 窄巷東南邊的 4 樓舊公寓：紅鐵捲門、藍色小雨棚（側牆對著窄巷）
    Q(198.6, 201.6, {
      nf: 4,
      wall: '#c9c5ba',
      ground: 'shutter',
      sh: '#8a3a32',
      awn: '#3f78a8',
      noband: 1,
      door: 0,
      bal: 'grille',
    }),
    // 精篆印社：同一棟的另一間，一樓玻璃門店面，二樓整面紅藍大招牌（custom）
    Q(201.6, 204.6, {
      nf: 4,
      wall: '#c9c5ba',
      ground: 'shop',
      noband: 1,
      bal: 'grille',
    }),
    // 70 號：4 樓米色磁磚，一樓綠白條紋雨棚，裡面敞開停機車和汽車
    Q(204.6, 211, {
      nf: 4,
      wall: '#e2d6bd',
      ground: 'open',
      awn: ['#3f8a5a', '#f2f0e8'],
      noband: 1,
      door: 0,
      bal: 'cage',
    }),
    // IT'S NOT EASY：白鐵捲門、貓咪圓形招牌
    Q(211, 215.2, {
      nf: 4,
      wall: '#dcd4c4',
      ground: 'shutter',
      sh: '#c9cbc9',
      noband: 1,
      round: ["IT'S NOT EASY", '#f4f2ee', '#333333'],
      bal: 'rail',
    }),
    // 灰鐵捲門窄樓，白色小雨棚
    Q(215.2, 218.3, {
      nf: 4,
      wall: '#d3cfc4',
      ground: 'shutter',
      sh: '#8e9aa2',
      awn: '#e9e8e2',
      noband: 1,
      door: 0,
      bal: 'grille',
    }),
    // 68 號：4 樓米黃磁磚舊公寓，左邊公寓入口，右邊綠雨棚灰鐵捲門（二樓「斗六當歸鴨」大招牌在 s 224 以後的日新路口轉角樓上）
    Q(218.3, 224, {
      nf: 4,
      wall: '#cdb98f',
      ground: 'shutter',
      sh: '#8f918e',
      awn: '#4f9a6a',
      noband: 1,
      bal: 'grille',
    }),
  ],

  custom(C) {
    const { THREE } = C;
    const wm = (hex) => C.wallMat(hex);
    // ======================= 西南側（+1） =======================
    // 4 樓灰白磁磚：玻璃店面的紅色外框
    {
      const k = seg(C, 1, 150.2, 157.5);
      for (const x of [0.12, 4.4]) k.box(x, x + 0.14, 0, 2.3, -0.12, 0, '#b8322a', NC);
      k.box(0.12, 4.54, 2.3, 2.45, -0.12, 0, '#b8322a', NC);
    }
    // 老師傅牛肉麵：鐵架玻璃雨棚伸到路邊、門口一排盆栽、路邊方形立招與黃色「9」圓牌
    {
      const k = seg(C, 1, 157.5, 165.5, 5.6),
        W = k.W;
      for (const x of [0.1, W / 2, W - 0.2]) k.box(x, x + 0.1, 0, 2.9, -1.25, -1.15, '#2a2b2d', NC);
      k.box(-0.05, W + 0.05, 2.9, 2.98, -1.3, 0, '#9db4bd', NC); // 玻璃雨棚
      for (let x = 0.4; x < W; x += 1.1) k.box(x, x + 0.04, 2.98, 3.04, -1.3, 0, '#2a2b2d', NC);
      for (let x = 0.5; x < W - 0.5; x += 0.85) {
        k.box(x - 0.22, x + 0.22, 0, 0.4, -1.0, -0.6, '#7a5a44', NC);
        shrub(C, k, x, -0.8, 0.38 + (x % 0.5) * 0.3, 0.35, GREEN[Math.round(x * 3) % 4]);
      }
      // 路邊方形立招（深灰底粉紅字）掛在鐵柱上
      k.cyl(0.35, -1.25, 0.08, 0, 5.4, '#8a7a5a', { seg: 8, col: true });
      for (const sd of [-1, 1])
        k.plane(
          C.paint('老師傅 牛肉麵', '#4a4b4f', '#e8558a', null, 1.7, 1.4, 96),
          1.7,
          1.4,
          0.35 + sd * 0.06,
          4.6,
          -2.2,
          (sd * PI) / 2,
          { emissive: 0.3 }
        );
      k.box(0.32, 0.38, 3.85, 5.35, -3.1, -1.3, '#3c3d40', NC);
      // 黃色「9」圓牌
      for (const sd of [-1, 1])
        k.plane(
          C.roundSign('9', '#f2d335', '#2c4a8a'),
          0.7,
          0.7,
          W - 0.3 + sd * 0.03,
          2.4,
          -1.6,
          (sd * PI) / 2,
          { transparent: true, emissive: 0.3 }
        );
    }
    // KK 撞球：一樓上面整排撞球圖案大招牌
    {
      const k = seg(C, 1, 165.5, 182.3),
        W = k.W;
      const tex = C.sg('lbKKBalls', 1024, 112, (g) => {
        g.fillStyle = '#2a2f3a';
        g.fillRect(0, 0, 1024, 112);
        const cols = [
          '#e8b020',
          '#2a52b8',
          '#c82828',
          '#6a2a8a',
          '#e86a20',
          '#2a7a3a',
          '#8a2a2a',
          '#1a1a1a',
        ];
        let n = 1;
        for (let x = 150; x < 1024; x += 52) {
          const y = 56 + ((n * 37) % 23) - 11,
            r = 30 + ((n * 13) % 9);
          g.fillStyle = cols[n % 8];
          g.beginPath();
          g.arc(x, y, r, 0, PI * 2);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,.25)';
          g.beginPath();
          g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, PI * 2);
          g.fill();
          g.fillStyle = '#f4f2ea';
          g.beginPath();
          g.arc(x, y, r * 0.45, 0, PI * 2);
          g.fill();
          g.fillStyle = '#111';
          g.font = `900 ${Math.round(r * 0.6)}px sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(((n * 7) % 15) + 1), x, y + 1);
          n++;
        }
        g.font = 'italic 900 96px sans-serif';
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.lineWidth = 6;
        g.strokeStyle = '#2a2a2a';
        g.strokeText('KK', 14, 60);
        g.fillStyle = '#f2e05a';
        g.fillText('KK', 14, 60);
      });
      k.box(-0.05, W + 0.05, 3.1, 4.95, 0, 0.25, '#2a2f3a', NC);
      k.plane(tex, W, 1.8, W / 2, 4.03, -0.02, C.FRONT, { emissive: 0.25 });
      k.box(-0.05, W + 0.05, 2.95, 3.1, -1.1, 0, '#5f6366', NC); // 招牌下的窄雨遮
      // 玻璃門上的黃字「KK 撞球」
      k.plane(
        C.paint('KK 撞球', 'rgba(0,0,0,0)', '#f2d335', null, 1.8, 0.45, 128),
        1.8,
        0.45,
        W / 2,
        1.7,
        -0.05,
        C.FRONT,
        { transparent: true }
      );
    }
    // 71 號：巷口那頭的「小豬很忙」燈箱（白底黑字、上緣粉紅豬）、門口紅色蔬果立牌、巷口加蓋的玻璃屋
    {
      const k = seg(C, 1, 191.8, 197.3),
        W = k.W;
      for (const sd of [-1, 1])
        k.plane(
          C.paint('小豬很忙', '#f6f3ec', '#1e1e1e', null, 2.2, 0.8, 110),
          2.2,
          0.8,
          W - 0.35 + sd * 0.09,
          5.0,
          -1.35,
          (sd * PI) / 2,
          { emissive: 0.35 }
        );
      k.box(W - 0.44, W - 0.26, 5.4, 5.75, -2.3, -0.4, '#e8879a', NC); // 粉紅豬造型上緣
      k.box(W - 0.4, W - 0.3, 4.5, 4.6, -0.3, 0, '#2a2a2a', NC);
      k.box(1.1, 1.7, 0, 1.3, -1.0, -0.7, '#c8282a', NC);
      k.plane(
        C.paint('蔬果', '#c8282a', '#ffffff', null, 0.55, 0.9, 96),
        0.55,
        0.9,
        1.4,
        0.75,
        -1.01,
        C.FRONT
      );
      // 巷口玻璃屋：鋁框玻璃牆、鐵皮平頂
      const g = seg(C, 1, 197.3, 199.0),
        gw = g.W;
      g.box(0, gw, 0, 0.35, -0.4, 4, '#d9d6cf', NC);
      for (const [x0, x1, z0, z1] of [
        [0, gw, -0.42, -0.38],
        [gw - 0.04, gw, -0.4, 4],
      ])
        g.box(x0, x1, 0.35, 2.55, z0, z1, '#9fb8c0', NC);
      g.box(0, gw, 0, 2.6, 3.9, 4.0, '#d0d1cd', NC);
      g.wallRect(0, gw, -0.4, 4, 0, 2.6);
      for (const x of [0, gw / 2, gw - 0.06])
        g.box(x, x + 0.06, 0.35, 2.55, -0.46, -0.38, '#c9cbcc', NC);
      for (const z of [1.3, 2.7])
        g.box(gw - 0.06, gw + 0.01, 0.35, 2.55, z, z + 0.06, '#c9cbcc', NC);
      g.box(-0.05, gw + 0.1, 2.55, 2.65, -0.55, 4.1, '#8f9396', NC);
      // 裡面的紅白桌椅
      g.box(0.5, 1.2, 0.7, 0.75, 0.6, 1.3, '#c8282a', NC);
      g.box(0.8, 0.9, 0, 0.7, 0.9, 1.0, '#e8e6e0', NC);
    }
    // 巷口對角 5 樓轉角樓：每層窗台的紅色腰帶（正面與對著小巷的側面）、頂樓拱形鐵窗、門口黃紅塑膠籃
    {
      const k = seg(C, 1, 203.5, 212),
        W = k.W,
        d = 12;
      for (let f = 1; f < 5; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.box(-0.05, W + 0.05, y + 0.05, y + 0.4, -0.1, 0, '#c4473a', NC);
        k.box(-0.1, 0, y + 0.05, y + 0.4, -0.1, d, '#c4473a', NC);
      }
      k.box(-0.1, 0, 2.55, 2.65, -1.2, d, '#9a9c9a', NC); // 對著小巷那面的灰色帆布騎樓棚
      for (let i = 0; i < 3; i++)
        k.plane(C.archWin, 1.5, 1.1, 1.6 + i * 2.6, 3.3 + 3 * 3.0 + 1.6, -0.06, C.FRONT);
      for (const [x, c] of [
        [1.2, '#e8c22a'],
        [1.75, '#c8282a'],
        [1.45, '#e8c22a'],
        [5.6, '#e8c22a'],
      ]) {
        const y = x === 1.45 ? 0.42 : 0;
        k.box(x - 0.25, x + 0.25, y, y + 0.4, -0.9, -0.5, c, NC);
      }
    }
    // 防火巷：灰泥牆夾著一道黑鐵柵門
    {
      const k = seg(C, 1, 218.6, 219.8),
        W = k.W;
      k.plane(C.bars, W, 2.0, W / 2, 1.0, 0.2, C.FRONT, { transparent: true, double: true });
      k.wallLine(0, 0.2, W, 0.2, 0, 2.0);
      k.box(0, W, 2.0, 2.1, 0.1, 0.3, '#2a2a2a', NC);
    }
    // 紅磚樓前藍白帆布蓋著的攤車
    {
      const k = seg(C, 1, 219.8, 224);
      const tarp = C.sg('lbTarp', 64, 64, (g) => {
        for (let y = 0; y < 64; y += 16) {
          g.fillStyle = '#2f6db3';
          g.fillRect(0, y, 64, 8);
          g.fillStyle = '#eef0f2';
          g.fillRect(0, y + 8, 64, 8);
        }
      });
      for (const [x0, x1] of [
        [0.3, 1.9],
        [2.2, 3.9],
      ]) {
        k.box(x0, x1, 0, 1.45, -1.05, -0.15, '#2f6db3');
        k.plane(tarp, x1 - x0, 1.45, (x0 + x1) / 2, 0.73, -1.06, C.FRONT);
        k.box(x0 - 0.05, x1 + 0.05, 1.45, 1.55, -1.1, -0.1, '#d89a3a', NC);
      }
    }

    // ======================= 東北側（-1） =======================
    // 7 層灰色磁磚大樓群的東南段（s 150～184.5），立面離中心線 11.5 m
    {
      const S0 = 150,
        S1 = 184.5,
        k = seg(C, -1, S0, S1, 11.5),
        W = k.W,
        D = 9,
        TOP = 3.3 + 6 * 3.0;
      k.box(0, W, -0.8, TOP, 0, D, wm('#97979a'), { tile: [0.6, 0.6] });
      k.box(-0.1, W + 0.1, TOP, TOP + 0.9, -0.1, D + 0.1, wm('#9a9b9e'), {
        col: false,
        tile: [0.6, 0.6],
      }); // 女兒牆
      k.box(0.2, W - 0.2, TOP + 0.1, TOP + 0.2, 0.2, D - 0.2, '#7d7f80', NC);
      // 屋頂太陽能板
      for (let x = 1; x < W - 3; x += 3.4)
        for (const z of [1.2, 4.8]) {
          const g = new THREE.BoxGeometry(3.1, 0.08, 3.2);
          g.rotateX(-0.2);
          g.translate(x + 1.55, TOP + 1.3, z + 1.6);
          k._part(C.VC, C.paintGeo(g, '#2b3f63'));
          k.box(x + 0.2, x + 0.3, TOP + 0.9, TOP + 1.55, z + 2.8, z + 2.9, '#9a9c9e', NC);
        }
      // 樓梯間凸出（s 168.5～172.5）：每層一片鏤空磚
      const xs0 = sx(-1, S0, S1, 172.5),
        xs1 = sx(-1, S0, S1, 168.5);
      k.box(xs0, xs1, 3.3, TOP + 1.2, -1.5, 0, wm('#8a8b8f'), { tile: [0.6, 0.6] });
      const perf = C.sg('lbPerf', 128, 64, (g) => {
        g.fillStyle = '#b8b9bb';
        g.fillRect(0, 0, 128, 64);
        g.fillStyle = '#3a3c40';
        for (let y = 6; y < 60; y += 12) for (let x = 5; x < 124; x += 12) g.fillRect(x, y, 7, 7);
      });
      for (let f = 1; f < 7; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.box(xs0 - 0.05, xs1 + 0.05, y + 0.85, y + 0.95, -1.6, 0, '#c9c9c6', NC);
        k.plane(perf, xs1 - xs0 - 0.6, 1.5, (xs0 + xs1) / 2, y + 1.8, -1.52, C.FRONT);
      }
      // 各層窗戶與冷氣（樓梯間那段跳過）
      for (let f = 0; f < 7; f++) {
        const y = f === 0 ? 0.9 : 3.3 + (f - 1) * 3.0 + 0.9;
        for (let x = 1.0; x < W - 1.2; x += 3.1) {
          if (x + 1.6 > xs0 - 0.3 && x < xs1 + 0.3) continue;
          C.win(k, x + 0.8, y + 0.7, 1.5, 1.35, f === 0);
          k.box(x - 0.05, x + 1.65, y - 0.05, y + 0.03, -0.12, 0, '#c9c9c6', NC);
          if (f > 0 && (f + Math.round(x)) % 3 === 0) C.ac(k, x + 1.8, y + 0.1, -0.45);
        }
        if (f > 0) k.box(-0.02, W + 0.02, y - 0.95, y - 0.85, -0.06, 0, '#a2a3a5', NC); // 每層的橫向飾帶
      }
      // 樓前的院子：灌木
      for (let x = 1.2; x < W - 0.5; x += 2.3)
        shrub(C, k, x, -2.6 - (x % 1.3), 0.7 + (x % 0.7) * 0.4, 0, GREEN[Math.round(x) % 4]);
    }
    // 人行道邊的花台、行道樹與紅磚柱黑鐵欄杆圍牆（s 150～196.5），區域座標 z=0 在路面邊緣（離中心線 3 m）
    {
      const S0 = 150,
        S1 = 196.5,
        k = seg(C, -1, S0, S1, 3.0),
        X = (s) => sx(-1, S0, S1, s);
      const GATE0 = 185.3,
        GATE1 = 189.5,
        FZ = 2.2; // 圍牆離路面邊緣 2.2 m
      // 花台：灰色水泥矮台，裡面種灌木
      for (const [a, b] of [
        [150, 157],
        [158.6, 165.5],
        [167, 174],
        [175.6, 184.8],
        [190.2, 196.2],
      ]) {
        k.box(X(b), X(a), 0, 0.5, 0.35, 1.75, '#b9b7b0', { surface: false });
        for (let s = a + 0.6; s < b - 0.4; s += 1.1)
          shrub(C, k, X(s), 1.05, 0.42 + ((s * 7) % 3) * 0.08, 0.45, GREEN[Math.round(s) % 4]);
      }
      // 行道樹
      let n = 0;
      for (const s of [151.5, 157.8, 166.2, 174.8, 181.5, 192.5])
        tree(C, k, X(s), 1.05, 7.5 + (n % 3) * 0.8, 2.4 + (n++ % 2) * 0.4, n);
      // 圍牆：水泥矮牆＋黑鐵欄杆，每 3.4 m 一根紅磚柱（白色柱頭）
      // 花式黑鐵欄杆：一格約 3 m，直條加中間一圈圓形花飾
      const fence = C.sg('lbFence', 256, 96, (g) => {
        g.clearRect(0, 0, 256, 96);
        g.fillStyle = '#1c1c1e';
        g.fillRect(0, 0, 256, 6);
        g.fillRect(0, 88, 256, 8);
        for (let x = 2; x < 256; x += 11) g.fillRect(x, 0, 4, 96);
        g.strokeStyle = '#1c1c1e';
        g.lineWidth = 5;
        g.beginPath();
        g.arc(128, 48, 26, 0, PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(128, 48, 12, 0, PI * 2);
        g.stroke();
      });
      for (const [a, b] of [
        [150, GATE0],
        [GATE1, 196.5],
      ]) {
        const x0 = X(b),
          x1 = X(a),
          w = x1 - x0,
          n = Math.max(1, Math.round(w / 3.2)),
          bw = w / n;
        k.box(x0, x1, 0, 0.6, FZ, FZ + 0.25, '#c4c1b8');
        k.wallLine(x0, FZ + 0.12, x1, FZ + 0.12, 0.6, 1.8);
        for (let j = 0; j <= n; j++) {
          const c = Math.min(Math.max(x0 + j * bw, x0 + 0.25), x1 - 0.25);
          k.box(c - 0.25, c + 0.25, 0, 1.95, FZ - 0.12, FZ + 0.37, '#a4513c');
          k.box(c - 0.3, c + 0.3, 1.95, 2.1, FZ - 0.17, FZ + 0.42, '#e2dfd6', NC);
          if (j < n)
            k.plane(fence, bw - 0.5, 1.15, x0 + (j + 0.5) * bw, 1.2, FZ + 0.12, C.FRONT, {
              transparent: true,
              double: true,
            });
        }
      }
      // 車道：紅磚鋪面，入口一道不鏽鋼伸縮大門（斜格子），兩邊各一根紅磚門柱
      {
        const x0 = X(GATE1),
          x1 = X(GATE0);
        k.box(x0, x1, -0.02, 0.03, 0, 6, '#a86a58', { col: false, surface: true });
        for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.28)
          k.box(x, x + 0.05, 0.05, 1.55, FZ + 0.05, FZ + 0.12, '#cfd3d6', NC);
        for (const y of [0.12, 1.5]) k.box(x0, x1, y, y + 0.06, FZ, FZ + 0.16, '#b9bdc1', NC);
        for (let x = x0; x < x1 - 0.5; x += 0.56) {
          const g = new THREE.BoxGeometry(0.03, 1.55, 0.03);
          g.rotateZ(0.32);
          g.translate(x + 0.28, 0.8, FZ + 0.09);
          k._part(C.VC, C.paintGeo(g, '#c4c8cc'));
        }
        k.wallLine(x0, FZ + 0.09, x1, FZ + 0.09, 0, 1.6);
        k.box(x0 + 0.1, x0 + 0.6, 0, 0.9, FZ - 0.3, FZ - 0.05, '#8a7a5a', NC); // 管理室信箱台
      }
      // 矮牆後面的大樹叢（s 189.5～196.5）
      for (const [s, z, h, r] of [
        [190.6, 4.2, 8.5, 3.0],
        [193.4, 6.0, 9.5, 3.3],
        [195.4, 3.6, 7.2, 2.4],
      ])
        tree(C, k, X(s), z, h, r, Math.round(s));
      // 窄巷口的藍色路燈桿與黃色箱子
      k.cyl(X(197.8), 0.6, 0.07, 0, 4.2, '#2f4f8a', { seg: 8, col: true });
      k.box(X(197.2), X(196.7), 0, 0.85, 0.9, 1.4, '#e2b82a');
    }
    // 精篆印社：二樓整面紅底大招牌（下排藍底小字）、門口鑰匙造型的黃色立牌
    {
      const k = seg(C, -1, 201.6, 204.6),
        W = k.W;
      k.box(-0.3, W + 0.3, 3.2, 5.6, -0.55, -0.05, '#c8282a', NC);
      k.plane(
        C.paint('精篆印社', '#c8282a', '#ffffff', null, W + 0.5, 1.3, 110),
        W + 0.5,
        1.3,
        W / 2,
        4.9,
        -0.56,
        C.FRONT,
        {
          emissive: 0.3,
        }
      );
      k.plane(
        C.paint('刻名 姓名貼 橡皮章', '#2a4aa8', '#ffffff', null, W + 0.5, 0.9, 110),
        W + 0.5,
        0.9,
        W / 2,
        3.75,
        -0.56,
        C.FRONT,
        { emissive: 0.3 }
      );
      k.cyl(W - 0.6, -1.2, 0.05, 0, 1.0, '#555', { seg: 6 });
      for (const sd of [-1, 1])
        k.plane(
          C.paint('精篆印社', '#f2d335', '#c8282a', null, 0.6, 1.5, 96),
          0.6,
          1.5,
          W - 0.6 + sd * 0.03,
          1.75,
          -1.2,
          (sd * PI) / 2
        );
    }
  },
  // custom 佔的地：大樓群的立面量體、人行道邊的花台與圍牆、巷口玻璃屋
  footprints(F) {
    return [
      F(R, 150, 184.5, -1, 11.5, 9),
      F(R, 150, 196.5, -1, 3.0, 2.7),
      F(R, 197.3, 199.0, 1, 3.9, 4.4),
    ];
  },
};
