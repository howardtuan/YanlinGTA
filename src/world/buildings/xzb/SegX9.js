// 新中北路 s 895～1014（力行宿舍西端到實踐路口，兩側）。
//   依據：Google 街景（s 899～935 是 2026-05；s 947 以西 Google 只有 2011-11）、Google 地圖 2026 店名標籤、國土測繪 2024 正射、Google 衛星。
//   2011 的店名只拿來判斷樓高、開間與外牆；2026 地圖上已經不在的店不寫字（招牌底留素色），2026 還在的店（中原眼鏡、大自在運動精品、
//   唐老鴨牛排館）照 2011 的招牌寫。
//   北側（+1）由東到西：249巷東邊的雜草空地（磚造破屋殘牆、鐵皮圍籬）、「右轉平交道 限高3.7公尺」紅色直立牌 → 249巷 →
//     米黃磁磚 5 樓轉角（全家招牌延伸過來）→ 全家（深灰直條格柵立面）→ 7-ELEVEn → 農稼飯 → KING CHARLIE 炸雞國王 → 紅褐磁磚 4 樓雜貨店 →
//     SUPER STEAK 超牛排 →（以下 2011 街景）3 樓老屋 ×3 → 大自在運動精品專賣店 → 紅磚 4 樓 → 3 樓老屋 → 4 樓兩開間（2011 是巨人機車精品）→
//     4 樓（2011 是大自在量販店）→ 2 樓老屋 ×2（東邊那間白色大看板、西邊那間綠色鐵皮）→ 育德街 → 育德街西轉角 3 樓
//   南側（-1）由東到西：灰色 4 樓「宿舍斜對面麵」紅底黃字招牌 → 綠色鐵皮 2 樓「黑糖粉圓 手作 檸檬愛玉」＋綠棚攤車 → 248巷 →
//     灰色 5 樓「双囍 複合式桌遊」轉角 → XMOTO 洗機車 → 白磁磚 6 樓「麵屋 LUNA」→ 燕國牛排 → 焱 鐵板燒 → 清心福全 →
//     （以下 2011 街景）3 樓 → 中原眼鏡 → 4 樓 ×2 → 灰色 5 樓 ×2 → 唐老鴨牛排館（兩開間）→ OSM w588110022（松屋町、KABO 那排，不動）
//   北側原本是一整棟 OSM w588110020（92 m 長的 4 樓方塊，牆面壓到路面），南側 s 930～946 是有店面牆的填充樓 f2_585～f2_587：
//   都列在 hide（不畫、碰撞收成一點、全圖亂數不變）；原本就 noShop 的 f2_584、f2_609 用 drop。後排的 f2_588 離路 27 m 以上，留著當後棟。
//   249巷、248巷、育德街照遊戲路面（data/cycu.json）留開口；248巷往南南西斜，轉角那棟（双囍）後半段照巷子斜度一階一階退。
const R = 'X',
  SN = 5.0, // 北側立面離中心線（正射：騎樓前緣約 4.5～5.5 m）
  SS = 5.8; // 南側立面離中心線（接 SegX8 的 5.8）
const NC = { col: false };
const seg = (C, side, s0, s1, set) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  k.zo = (off) => off - set;
  return k;
};
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 2011 之後換過、看不出現況的店：一樓素色招牌底、不放字（預設鐵捲門；2026 地圖那一帶有在營業的店家，幾間改成亮燈的店面）
const old = (nf, wall, o = {}) => ({
  nf,
  wall,
  ground: 'shutter',
  bal: nf > 2 ? 'grille' : 'plain',
  d: 16,
  set: SN,
  ...o,
});

export default {
  drop: ['f2_584', 'f2_609'],
  // 北側整棟 OSM（實景是一排透天街屋）與南側有店面牆的填充樓：不畫、碰撞收成一點，由這段自建的街屋取代
  hide: ['w588110020', 'f2_585', 'f2_586', 'f2_587'],
  ownSign: ['全家便利商店', '7-Eleven', '清心福全', '唐老鴨牛排館總店'],
  lots: [
    // ======================= 北側（+1） =======================
    // N1 249巷西轉角：米黃磁磚 5 樓，一樓全家（招牌從隔壁延伸過來），巷子那面是娃娃機店（custom）
    [
      R,
      908.5,
      912,
      1,
      {
        nf: 5,
        wall: '#dccb9e',
        noband: true, // 全家招牌橫跨兩間，在 custom
        ground: 'shop',
        bal: 'grille',
        d: 16,
        set: SN,
        door: 0,
        roof: 'tank',
      },
    ],
    // N2 全家：二樓以上深灰直條格柵、一樓整面玻璃、店外木長椅（custom）
    [
      R,
      912,
      916.5,
      1,
      {
        nf: 4,
        wall: '#5a5d62',
        noband: true,
        ground: 'shop',
        bal: 'plain',
        fins: '#3c3f44',
        d: 16,
        set: SN,
        bikes: 1,
      },
    ],
    // N3 7-ELEVEn（門牌 239、241，兩個門）：二樓白色鐵窗、灰色立面，門口一疊藍綠塑膠籃（custom）
    [
      R,
      916.5,
      923,
      1,
      {
        nf: 3,
        wall: '#b9b7af',
        noband: true, // 白底招牌（兩側橘綠紅條紋、中間 logo）在 custom
        ground: 'shop',
        bal: 'cage',
        d: 16,
        set: SN,
      },
    ],
    // N4 農稼飯：白色老屋、白色直立大招牌「農稼飯 外送專線」
    [
      R,
      923,
      927,
      1,
      {
        nf: 3,
        wall: '#e4e2dc',
        vert: ['農稼飯', '#f4f2ea', '#3a2a1a'],
        ground: 'shop',
        noband: true,
        bal: 'cage',
        d: 16,
        set: SN,
      },
    ],
    // N5 KING CHARLIE 炸雞國王：白色立面，二樓黑色招牌帶＋紅底雞頭 logo（custom），一樓「CHARLIE」白招牌
    [
      R,
      927,
      932,
      1,
      {
        nf: 4,
        wall: '#eeede8',
        sign: ['KING CHARLIE 炸雞國王', '#f4f4f0', '#1a1a1a'],
        sign2: ['KING CHARLIE', '#1c1c1e', '#ffffff'],
        ground: 'shop',
        bal: 'plain',
        d: 16,
        set: SN,
      },
    ],
    // N6 紅褐磁磚 4 樓：咖啡紅帆布雨遮下是雜貨店（招牌看不清，不放字）、二樓白框窗
    [
      R,
      932,
      936.5,
      1,
      {
        nf: 4,
        wall: '#a8705a',
        ground: 'open',
        awn: '#8a4a3a',
        noband: true,
        bal: 'plain',
        d: 16,
        set: SN,
        door: 0,
      },
    ],
    // N7 SUPER STEAK 超牛排：黑底招牌＋黑色直立招牌
    [
      R,
      936.5,
      941.5,
      1,
      {
        nf: 4,
        wall: '#b4b2aa',
        sign: ['SUPER STEAK 超牛排', '#1a1a1a', '#f2e2b0'],
        vert: ['超牛排', '#1a1a1a', '#f0d060'],
        ground: 'shop',
        bal: 'grille',
        d: 16,
        set: SN,
      },
    ],
    // N8～N10 3 樓灰色老屋（2011：馨園快餐、花茶專賣店、泗元碳烤；現況不明，不放字）
    [R, 941.5, 946.5, 1, old(3, '#a9a7a0', { awn: '#8a6a50', ground: 'shop' })],
    [R, 946.5, 951.5, 1, old(3, '#bdb8ae', { ground: 'shop' })],
    [R, 951.5, 956.5, 1, old(3, '#b0aea6', { roof: 'shack', bal: 'cage' })],
    // N11 大自在運動精品專賣店（2026 地圖還在）：3 樓，藍色招牌
    [
      R,
      956.5,
      962,
      1,
      {
        nf: 3,
        wall: '#c9c6bc',
        sign: ['大自在 運動精品專賣店', '#1f4f9a', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 16,
        set: SN,
      },
    ],
    // N12 紅磚 4 樓（2011：小店 10 元專賣）、N13 3 樓灰色老屋（2011：阿甘米干）
    [R, 962, 967.5, 1, old(4, 'brick', { roof: 'tank', ground: 'shop' })],
    [R, 967.5, 972.5, 1, old(3, '#a4a39c', { ground: 'shop' })],
    // N14 4 樓兩開間（2011：巨人機車精品，整面黃色大招牌；現況不明）
    [R, 972.5, 978.2, 1, old(4, '#bab7ae')],
    [R, 978.2, 984, 1, old(4, '#bab7ae', { roof: 'shack' })],
    // N15 4 樓（2011：大自在運動精品量販店，門牌 215）
    [R, 984, 990.5, 1, old(4, '#cbc7bd', { ground: 'shop' })],
    // N16 2 樓老屋：東邊那間 2011 是白色大看板＋綠色波浪雨遮，西邊那間綠色鐵皮（育德街東轉角）
    [R, 990.5, 996, 1, old(2, '#d8d6d0', { awn: '#3f8a5a', fh: 3.2 })],
    [R, 996, 1001.6, 1, old(2, '#5f8f5a', { fh: 3.2, roofCol: '#6a7a6a', roof: 'shack' })],
    // N17 育德街西轉角（實踐路口東北角）：3 樓（2011 是紅色立面的茶飲店，現況不明）
    [R, 1005.3, 1014, 1, old(3, '#d2cbbf', { d: 14 })],

    // ======================= 南側（-1） =======================
    // S1 灰色 4 樓老公寓：二樓紅底黃字大招牌「宿舍斜對面麵」、一樓橘色雨遮
    [
      R,
      895,
      901.5,
      -1,
      {
        nf: 4,
        wall: '#a9a8a0',
        sign2: ['宿舍斜對面麵', '#c8231e', '#f5d21a'],
        ground: 'shutter',
        sh: '#8a9a7a',
        awn: '#e0802a',
        noband: true,
        bal: 'plain', // 鐵窗會擋到二樓的大招牌
        d: 13,
        set: SS,
        door: 0,
      },
    ],
    // S2 248巷東轉角：2 樓綠色鐵皮老屋，黑底招牌「新中北 黑糖粉圓 手作 檸檬愛玉」，綠鐵捲門、綠棚攤車（custom）
    [
      R,
      901.5,
      907.2,
      -1,
      {
        nf: 2,
        wall: '#9aa874',
        sign: ['黑糖粉圓 手作 檸檬愛玉', '#1c1c1c', '#f2f2ee', '新中北'],
        ground: 'shutter',
        sh: '#7aa86a',
        bal: 'plain',
        d: 12,
        set: SS,
        roofCol: '#8a9a6a',
        roof: 'shack',
        door: 0,
      },
    ],
    // S3 248巷西轉角：灰色 5 樓老公寓，二樓白底大招牌「双囍 複合式桌遊 03-4161166」、一樓綠色雨遮、騎樓停滿機車
    //    （只蓋前面 4 m，後半段照巷子斜度一階一階退，在 custom）
    [
      R,
      914,
      921.5,
      -1,
      {
        nf: 5,
        wall: '#9d9c94',
        sign2: ['双囍 複合式桌遊 03-4161166', '#f4f2ee', '#c8233a'],
        awn: '#3f7a5a',
        ground: 'shutter',
        noband: true,
        bal: 'plain',
        d: 4,
        set: SS,
        roof: 'none',
        bikes: 4,
      },
    ],
    // S4 XMOTO 洗機車：灰白 3 樓，一樓白底招牌
    [
      R,
      921.5,
      926,
      -1,
      {
        nf: 3,
        wall: '#c4c3bd',
        sign: ['XMOTO AI全自動洗機車設備', '#f4f4f2', '#1a1a1a'],
        ground: 'open',
        bal: 'plain',
        d: 13,
        set: SS,
        bikes: 3,
      },
    ],
    // S5 白磁磚 6 樓「麵屋 LUNA」（黑底金字）
    [
      R,
      926,
      932,
      -1,
      {
        nf: 6,
        wall: '#e6e4de',
        sign: ['麵屋 LUNA', '#1a1a1a', '#d8b45a'],
        ground: 'shutter',
        sh: '#5a4a3a',
        bal: 'plain',
        d: 13,
        set: SS,
      },
    ],
    // S6 燕國牛排：白磁磚 5 樓，二樓紅底黃字大招牌，一樓娃娃機台、紅白條紋雨遮
    [
      R,
      932,
      936.5,
      -1,
      {
        nf: 5,
        wall: '#e9e7e1',
        sign2: ['燕國牛排 複合式餐廳', '#c8231e', '#f5d21a'],
        awn: ['#c8282a', '#f2efe8'],
        ground: 'shop',
        noband: true,
        bal: 'plain',
        d: 13,
        set: SS,
      },
    ],
    // S7 焱 鐵板燒：白磁磚 5 樓，黑底招牌，一樓玻璃門
    [
      R,
      936.5,
      940.5,
      -1,
      {
        nf: 5,
        wall: '#e2e0da',
        sign: ['焱 鐵板燒', '#1c1c1e', '#f2f2ee'],
        ground: 'shop',
        bal: 'grille',
        d: 13,
        set: SS,
      },
    ],
    // S8 清心福全：灰白 5 樓，深綠招牌
    [
      R,
      940.5,
      945,
      -1,
      {
        nf: 5,
        wall: '#cfd0cb',
        sign: ['清心福全', '#1f4a36', '#f2efe2'],
        ground: 'shop',
        bal: 'grille',
        d: 13,
        set: SS,
      },
    ],
    // S9 3 樓（2011 威廉髮藝；2026 街景遠處是黑色圓招牌的炸雞店，字看不清）
    [
      R,
      945,
      949,
      -1,
      {
        nf: 3,
        wall: '#bcb9b0',
        sign: ['', '#1c1c1e', '#1c1c1e'],
        ground: 'shop',
        bal: 'grille',
        d: 13,
        set: SS,
      },
    ],
    // S10 中原眼鏡（2026 地圖還在）：灰色 4 樓，藍底黃字
    [
      R,
      949,
      953.5,
      -1,
      {
        nf: 4,
        wall: '#a9a8a2',
        sign: ['中原眼鏡', '#1f4fa0', '#f5d21a'],
        ground: 'shop',
        bal: 'cage',
        d: 13,
        set: SS,
      },
    ],
    // S11、S12 4 樓（2011：義杯麵、THE BEST CHOICE 咖啡大看板；現況不明）
    [R, 953.5, 958, -1, old(4, '#b7b4ac', { set: SS, d: 13 })],
    [R, 958, 962.5, -1, old(4, '#e2e0da', { set: SS, d: 13, bal: 'rail' })],
    // S13、S14 灰色 5 樓（2011：機車行、8鍋臭臭鍋；現況不明）
    [R, 962.5, 968, -1, old(5, '#9fa09a', { set: SS, d: 13, ground: 'open' })],
    [R, 968, 973, -1, old(5, '#a7a59e', { set: SS, d: 13 })],
    // S15 唐老鴨牛排館（遊戲 POI「唐老鴨牛排館總店」）：5 樓兩開間，黃底黑字大招牌＋黃色直立招牌
    [
      R,
      973,
      978,
      -1,
      {
        nf: 5,
        wall: '#b2b0a8',
        sign: ['唐老鴨牛排館', '#f2c418', '#1a1a1a'],
        vert: ['唐老鴨牛排館', '#f2c418', '#1a1a1a'],
        ground: 'shutter',
        sh: '#9a9a90',
        bal: 'grille',
        d: 13,
        set: SS,
      },
    ],
    [
      R,
      978,
      983,
      -1,
      {
        nf: 5,
        wall: '#b2b0a8',
        sign: ['唐老鴨牛排館', '#f2c418', '#1a1a1a'],
        ground: 'shop',
        bal: 'grille',
        d: 13,
        set: SS,
      },
    ],
  ],

  custom(C) {
    const { MR, FRONT, paint, lcg, bike, bikeCols } = C;
    const r = lcg(9895);
    const pole = (k, x, z, h = 10, stripe = true) => {
      // 水泥電桿（下段黃黑斜紋護套）＋橫擔
      k.cyl(x, z, 0.17, 0, h, '#a8a7a2', { seg: 8, r1: 0.13, col: true });
      if (stripe)
        for (let i = 0; i < 8; i++)
          k.cyl(x, z, 0.19, 0.25 * i, 0.25 * (i + 1), i % 2 ? '#1c1c1c' : '#e8c21e', { seg: 8 });
      k.box(x - 0.9, x + 0.9, h - 0.8, h - 0.68, z - 0.06, z + 0.06, '#6a6a66', NC);
      k.box(x - 0.6, x + 0.6, h - 1.6, h - 1.5, z - 0.05, z + 0.05, '#6a6a66', NC);
    };

    // ======================= 北側 =======================
    {
      // N0 249巷東邊的雜草空地（s 895～901.5）：破磚牆、鐵皮圍籬、雜草、小樹；巷口電桿掛紅色直立牌「右轉平交道 限高3.7公尺」
      const k = seg(C, 1, 895, 901.5, SN);
      k.box(0, k.W, -0.5, 0.04, -0.3, 6, '#7a6a52', NC); // 泥土地
      k.box(0, k.W, 0, 0.12, -0.3, 0, MR.concrete, NC); // 破碎的水泥鋪面
      k.box(-0.05, 0.25, 0, 2.2, 0.5, 6, '#4f7a5a'); // 東邊（SegX8 老屋）那面綠色鐵皮牆
      k.plane(
        paint('', '#c8231e', '#c8231e', null, 0.8, 0.6),
        0.8,
        0.6,
        0.27,
        1.5,
        3.0,
        Math.PI / 2
      );
      k.box(0.3, 2.6, 0, 1.4, 4.6, 5.0, MR.brick, { tile: [0.6, 0.6] }); // 破磚牆
      k.box(0.3, 2.0, 1.4, 1.5, 4.5, 5.1, '#8a8e90', NC); // 塌下來的鐵皮
      for (let i = 0; i < 9; i++)
        ball(
          C,
          k,
          0.6 + r() * (k.W - 1.2),
          0.25,
          0.6 + r() * 4.8,
          0.35 + r() * 0.3,
          '#4f7a3a',
          0.7
        );
      k.cyl(3.6, 4.2, 0.18, -0.3, 3.2, '#5e4630', { seg: 6, col: true });
      ball(C, k, 3.6, 4.2, 4.2, 1.8, '#3f7a3a', 0.8);
      ball(C, k, 2.8, 3.6, 4.6, 1.2, '#4b8a3e', 0.8);
      // 電桿在巷口西邊（米黃轉角大樓的巷子那面前面，街景 s 899 往北看在巷子左手邊）
      const px = k.sx(908.2),
        pz = -0.4;
      pole(k, px, pz, 10);
      // 紅底白字兩行直書（右行「右轉平交道」、左行「限高3.7公尺」），正面對著新中北路
      const V = C.ROWT.vert,
        col1 = V('x9rail1', '#c8231e', '#ffffff', '右轉平交道'),
        col2 = V('x9rail2', '#c8231e', '#ffffff', '限高3.7公尺'),
        bz = pz - 0.22;
      k.box(px - 0.4, px + 0.4, 2.0, 4.3, bz, bz + 0.06, '#c8231e', NC);
      for (const [rot, zz, sgn] of [
        [FRONT, bz - 0.01, -1], // 北側 Kit 的 +x 朝西：從路上看，右手邊是 -x
        [0, bz + 0.07, 1],
      ]) {
        k.plane(col1, 0.34, 1.5, px + 0.19 * sgn, 3.45, zz, rot, { emissive: 0.25 });
        k.plane(col2, 0.34, 2.1, px - 0.19 * sgn, 3.15, zz, rot, { emissive: 0.25 });
      }
    }
    {
      // N1 轉角大樓巷子那面：娃娃機店（一樓開口、娃娃機台）
      const k = seg(C, 1, 908.5, 912, SN);
      k.plane(C.openTex, 3.5, 2.3, -0.04, 1.15, 2.4, -Math.PI / 2, { emissive: 0.3 });
      for (let j = 0; j < 3; j++) {
        const z = 0.9 + j * 0.85;
        k.box(-0.6, -0.05, 0, 1.75, z, z + 0.75, j % 2 ? '#e84a7a' : '#f2c418');
        k.box(-0.58, -0.07, 0.8, 1.55, z + 0.05, z + 0.7, '#cfe4ee', NC);
      }
      k.plane(
        paint('選物販賣機', '#f2c418', '#d0201a', null, 2.4, 0.5),
        2.4,
        0.5,
        -0.06,
        2.65,
        2.4,
        -Math.PI / 2,
        { emissive: 0.3 }
      );
    }
    {
      // N1＋N2 全家：深灰金屬波浪板大招牌橫跨兩間（左邊綠藍方塊 logo、白字「全家 FamilyMart」）
      const FNT = (px) => `900 ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
      const kf = seg(C, 1, 908.5, 916.5, SN);
      const famTex = C.sg('xzX9fam', 1024, 128, (g) => {
        g.fillStyle = '#4a4e54';
        g.fillRect(0, 0, 1024, 128);
        for (let x = 0; x < 1024; x += 12) {
          g.fillStyle = 'rgba(255,255,255,0.08)';
          g.fillRect(x, 0, 5, 128);
        }
        g.fillStyle = '#2fb34a';
        g.fillRect(150, 30, 70, 32);
        g.fillStyle = '#5aa0e0';
        g.fillRect(150, 66, 70, 32);
        g.fillStyle = '#f4f4f0';
        g.font = FNT(78);
        g.textBaseline = 'middle';
        g.fillText('全家 FamilyMart', 250, 68);
      });
      kf.box(0.1, 7.9, 2.35, 3.3, -0.32, -0.02, '#4a4e54', NC);
      kf.plane(famTex, 7.8, 0.95, 4.0, 2.82, -0.33, FRONT, { emissive: 0.35 });
      // N3 7-ELEVEn：白底招牌，兩側橘綠紅條紋，中間 logo
      const ks = seg(C, 1, 916.5, 923, SN);
      const sevTex = C.sg('xzX9seven', 1024, 128, (g) => {
        g.fillStyle = '#f6f6f2';
        g.fillRect(0, 0, 1024, 128);
        for (const [x0, x1] of [
          [30, 400],
          [624, 994],
        ]) {
          g.fillStyle = '#f26b21';
          g.fillRect(x0, 34, x1 - x0, 18);
          g.fillStyle = '#00843d';
          g.fillRect(x0, 56, x1 - x0, 18);
          g.fillStyle = '#e2231a';
          g.fillRect(x0, 78, x1 - x0, 18);
        }
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#f26b21';
        g.font = FNT(96);
        g.fillText('7', 512, 52);
        g.fillStyle = '#00843d';
        g.font = FNT(34);
        g.fillText('ELEVEn', 512, 100);
      });
      ks.box(0.1, 6.4, 2.35, 3.3, -0.32, -0.02, '#f6f6f2', NC);
      ks.plane(sevTex, 6.3, 0.95, 3.25, 2.82, -0.33, FRONT, { emissive: 0.4 });
      // N2 全家店外木長椅、N3 7-ELEVEn 門口一疊藍綠塑膠籃
      const k = seg(C, 1, 912, 916.5, SN);
      for (const x of [0.6, 2.6]) {
        k.box(x, x + 1.4, 0.42, 0.48, -1.1, -0.75, '#9a6a3a', NC);
        for (const dx of [0.1, 1.2])
          k.box(x + dx, x + dx + 0.08, 0, 0.42, -1.05, -0.8, '#2a2a2a', NC);
      }
      const k2 = seg(C, 1, 916.5, 923, SN);
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 4 + (i % 3); j++)
          k2.box(
            0.4 + i * 0.55,
            0.92 + i * 0.55,
            j * 0.3,
            j * 0.3 + 0.28,
            -0.9,
            -0.5,
            j % 2 ? '#2a6ab0' : '#2f9a6a',
            NC
          );
    }
    {
      // N5 KING CHARLIE 二樓的紅底雞頭 logo（方形燈箱）
      const k = seg(C, 1, 927, 932, SN);
      k.box(0.4, 1.5, 3.7, 4.75, -0.3, -0.2, '#d0201a', NC);
      k.plane(
        paint('KC', '#d0201a', '#ffffff', 'SINCE 2003', 1.0, 0.95),
        1.0,
        0.95,
        0.95,
        4.22,
        -0.31,
        FRONT,
        {
          emissive: 0.35,
        }
      );
    }

    // ======================= 南側 =======================
    {
      // S2 愛玉店前的綠棚攤車（紅黃小招牌「協力 香雞排」）
      const k = seg(C, -1, 901.5, 907.2, SS);
      const x = 3.2,
        z = -1.0;
      k.box(x, x + 1.8, 0.3, 1.0, z - 0.4, z + 0.4, '#d8d8d2');
      k.box(x, x + 1.8, 1.0, 1.05, z - 0.45, z + 0.45, '#8d9196', NC);
      for (const dx of [0.05, 1.7])
        k.box(x + dx, x + dx + 0.05, 1.05, 2.2, z - 0.4, z - 0.35, '#8a8a84', NC);
      k.box(x - 0.3, x + 2.1, 2.2, 2.28, z - 0.8, z + 0.5, '#3f9a5a', NC); // 綠色帆布棚
      k.box(x - 0.3, x + 2.1, 1.95, 2.2, z - 0.82, z - 0.78, '#3f9a5a', NC);
      k.plane(
        paint('協力 香雞排', '#d8301e', '#f5d21a', null, 1.6, 0.3),
        1.6,
        0.3,
        x + 0.9,
        1.65,
        z - 0.41,
        FRONT,
        {
          emissive: 0.25,
        }
      );
      for (const dx of [0.2, 1.4]) k.cyl(x + dx, z, 0.12, 0, 0.3, '#2a2a2a', { seg: 8 });
    }
    {
      // S3 双囍轉角大樓後半段：248巷往南南西斜（遊戲路面西緣 s = 913.2 + 0.6 × (離中心 − 5.5)），一階 3 m 往西退
      const top = 3.3 + 4 * 3.0;
      for (const [a, b] of [
        [9.8, 12.8],
        [12.8, 15.8],
      ]) {
        const s0 = 913.5 + 0.6 * (b - 5.5);
        if (s0 > 921.2) continue;
        const k = seg(C, -1, s0, 921.5, SS);
        k.box(0, k.W, 0, top, k.zo(a), k.zo(b), 'wall#9d9c94', { tile: [0.6, 0.6] });
        k.box(-0.02, k.W + 0.02, top, top + 0.12, k.zo(a), k.zo(b), 'gray', NC);
        for (let f = 0; f < 5; f++)
          k.plane(
            C.YHT.win(),
            1.2,
            1.1,
            k.W + 0.03,
            (f === 0 ? 0.3 : 3.3 + (f - 1) * 3 + 0.3) + 1.1,
            (k.zo(a) + k.zo(b)) / 2,
            Math.PI / 2
          );
      }
      // 巷口那面的窗
      const k = seg(C, -1, 914, 921.5, SS);
      for (let f = 1; f < 5; f++)
        k.plane(C.YHT.win(), 1.4, 1.2, k.W + 0.03, 3.3 + (f - 1) * 3 + 1.4, 2.0, Math.PI / 2);
    }
    {
      // 路邊電桿：清心福全門口（街景 s 935 南側）、248巷口東側、育德街口
      const a = seg(C, -1, 940.5, 945, SS);
      pole(a, 0.5, a.zo(4.4), 10);
      const b = seg(C, -1, 901.5, 907.2, SS);
      pole(b, 0.3, b.zo(4.4), 10);
      const c = seg(C, 1, 990.5, 996, SN);
      pole(c, c.W - 0.4, c.zo(4.4), 10);
      // 南側騎樓前一排機車（燕國牛排～清心福全）
      for (let s = 932.4; s < 944.6; s += 0.75 + r() * 0.15) {
        if (r() < 0.15) continue;
        bike(a, a.sx(s), a.zo(4.5 + r() * 0.15), 1, bikeCols[(r() * 6) | 0]);
      }
    }
  },

  footprints(F) {
    return [
      F(R, 895, 901.5, 1, 4.3, 6.8), // 249巷東邊的空地
      F(R, 901.5, 907.2, -1, 4.3, 1.8), // 愛玉店前的攤車、電桿
      F(R, 917.5, 921.5, -1, SS, 10.5), // 双囍轉角大樓後半段
      F(R, 932, 945, -1, 4.3, 1.6), // 騎樓前的機車、電桿
    ];
  },
};
