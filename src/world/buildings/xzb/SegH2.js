// 弘揚路 s 151～316 兩側（大智街口到實踐路／大仁二街口；Google 街景官方 2026-05（s 200 以東）、2025-05（s 164～188 的東南側）、
// 2024-08（s 164～188 的西北側），國土測繪 2024 正射）。店家先後順序照照片，寬度照照片換算與現有填充樓的分戶線。
//   東南側（+1、照片 _R）由西到東：大智街 → 新資生藥局 6 樓灰磁磚圓角轉角樓 → WENIC HAIR → WEME HAIR SALON、好好早午餐
//     （兩棟 3 樓紅瓦山牆老透天）→ 福田永豐 4 樓窄樓 → 4 樓紅磚樓（綠雨遮兩戶）→ 7 樓白磁磚大樓（綠雨遮大門、深色招牌店、冒大仙成都鮮冒菜）→
//     退縮的灰色鐵捲門（門口黃色網狀線）→ 小米／嘉香小菜灰色水泥窄樓 → 嘉香粥麵 → 日式威廉弘揚店 → 5 樓藍鐵捲門 →
//     八方雲集轉角樓 → 振興街 → 全家便利商店圓角轉角樓（5 樓白磁磚綠鐵窗）→ ONE 桌遊 → 紅黃招牌店 → 兆邑現炒 → 一飛沖天麻辣燙 →
//     紅雨遮店 → 豆花王（褐色長帆布雨遮）→ 洪立自助洗衣 → 轉角（6 樓白磁磚凸窗）
//   西北側（-1、照片 _L）由西到東：一品香滷味 → 鬼匠拉麵 → 龍貓早午餐 → 深灰色新公寓 → 大嗑 BRUNCH 轉角 → 三和三街 →
//     6 樓轉角樓（白色店面）→ DIY 洗衣工坊 → 得來素 → 弘揚電腦 → 攬攬風味小火鍋（170 號）→ 露天停車場 → 綠野鮮蔬 →
//     淺藍色 7 樓（韓奶奶韓式豆腐鍋物）→ 別丟臉 → 4 樓白磁磚老街屋 → 綠色波浪磁磚老樓 → 晨間廚房 → 紅吱吱牛排館 →
//     綠雨遮店 → 白招牌店 → 新潔自助洗衣坊 → 鏡站眼鏡 → 帕娣美學（轉角樓面弘揚路的那一面，好了啦飲料攤）
//   接縫：西端 +1 的小雞食代轉角（到 s 151）與 -1 的三串窟（到 s 160，已 hide f2_367）在 SegH1。
//     東端兩個轉角樓的本體在實踐路 src/world/buildings/shijian/S3.js（-1 側 5 樓白樓、+1 側 7 樓灰樓，側牆斜斜地對著弘揚路），
//     這裡只在它們面弘揚路的那一側貼正立面：-1 帕娣美學 s 291.9～305（貼著側牆，立面往前 1.2 m）、+1 s 287～312.6 的騎樓店面。
//   路口留空：大智街（+1 s 151～159）、三和三街（-1 s 190.3～195.7）、振興街（+1 s 240.8～246.3）。
//   有店面牆的填充樓與夜市補建伸到路口的三棟（nm0、nm1、nm293）放 hide，原本 noShop 的 drop。看不清的招牌不放字（6 樓轉角白店面、深色招牌店、紅黃招牌店、白招牌店…）。
const R = 'H',
  SR = 6.5, // 東南側（+1）立面離中心線
  SL = 6.5; // 西北側（-1）立面離中心線
const NC = { col: false };
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（-1 側的 +x 朝 s 變小的方向）
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標），所以把寬度搬到 k.W、還原 k.w
const seg = (C, side, s0, s1, set) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  return k;
};
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 三角稜柱：底邊在 y0、寬 x0～x1、高 rise，從 z0 延伸到 z1（山牆屋頂）
const prism = (C, k, x0, x1, y0, rise, z0, z1, hex) => {
  const g = new C.THREE.CylinderGeometry(1, 1, z1 - z0, 3);
  g.rotateX(-Math.PI / 2);
  g.scale((x1 - x0) / 2 / 0.866, rise / 1.5, 1);
  g.translate((x0 + x1) / 2, y0 + rise / 3, (z0 + z1) / 2);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 白磁磚凸窗：二樓起每層 n 個（xs 是中心位置）
const bays = (C, k, xs, nf, wall, from = 2) => {
  for (const xc of xs)
    for (let f = from; f <= nf; f++) {
      const y = 3.3 + (f - 2) * 3.0;
      k.box(xc - 1.0, xc + 1.0, y + 0.5, y + 2.5, -0.55, 0, wall, NC);
      k.box(xc - 0.8, xc + 0.8, y + 0.85, y + 2.2, -0.57, -0.55, '#4f6a70', NC);
      k.box(xc - 1.05, xc + 1.05, y + 0.42, y + 0.52, -0.62, 0, '#c9c7c0', NC);
    }
};
// 圓角轉角：圓心 (r, r)，轉角在 x = 0 那一端
const roundCorner = (C, k, r, top, d, wall, nf, frame) => {
  k.cyl(r, r, r, 0, top, wall, { seg: 20, col: true });
  k.box(0, r, 0, top, r, d, wall);
  k.cyl(r, r, r + 0.1, top, top + 0.15, '#cfcdc6', { seg: 20 });
  // 二樓以上每層一圈深色窗帶（frame 有給就在窗帶上下加一圈窗框色）
  for (let f = 2; f <= nf; f++) {
    const y = 3.3 + (f - 2) * 3.0;
    k.cyl(r, r, r + 0.03, y + 0.9, y + 2.1, '#3e4a55', { seg: 20 });
    if (frame)
      for (const yy of [y + 0.85, y + 2.1])
        k.cyl(r, r, r + 0.12, yy, yy + 0.08, frame, { seg: 20 });
  }
};
// 一排紅燈籠
const lanterns = (C, k, x0, x1, y, z, step = 1.0) => {
  for (let x = x0; x <= x1 + 0.01; x += step) ball(C, k, x, y, z, 0.2, '#d8302a', 1.15);
};

// 一格街屋：[ref, s0, s1, side, spec]，set 沒寫就用 SR／SL
const E = (s0, s1, sp) => [R, s0, s1, 1, { set: SR, d: 12, ...sp }];
const W = (s0, s1, sp) => [R, s0, s1, -1, { set: SL, d: 11, ...sp }];
const WT = '#e9e8e3', // 白磁磚
  RB = '#a8604c', // 紅磚
  GT = '#b3b3ad', // 新資生的灰磁磚
  SJW = '#e2e0da'; // 實踐路那棟轉角白樓（shijian/S3.js）的牆色

export default {
  // 原本就 noShop 的填充樓
  drop: [
    'f2_366',
    'f2_636',
    'f2_637',
    'f2_638',
    'f2_639',
    'f2_640',
    'f2_641',
    'f2_643',
    'f2_644',
    'f2_645',
    'f2_647',
    'f2_648',
  ],
  // 有店面牆的填充樓
  hide: [
    // 西北側
    'f2_365',
    'f2_364',
    'f2_363',
    'f2_362',
    'f1380',
    'f1379',
    'f1378',
    'f1377',
    'f1376',
    'f1375',
    'f1374',
    'f1373',
    'f1372',
    'f1388',
    'f1387',
    'f1386',
    'f1385',
    'f1384',
    'f1383',
    'f1382',
    'f1381',
    // 東南側
    'f2_642',
    'f2_646',
    'f1270',
    'f1271',
    'f1272',
    'f1273',
    'f1274',
    'f1275',
    'f1276',
    'f1277',
    // 夜市補建（src/world/buildings/NightMarketFill.js）伸到弘揚路口的三棟：+1 s 287.7～292.6 的 5 樓、s 293.7～301.6 的鐵皮屋，
    // -1 s 287.6～291.2 的 2 樓
    'nm0',
    'nm293',
    'nm1',
  ],
  ownSign: [
    '新資生連鎖藥局',
    '好好早午餐',
    '嘉香麵飯粥',
    '小米義式廚房',
    '日式威廉',
    '八方雲集',
    '全家便利商店',
    'One 桌遊',
    '兆邑現炒館',
    '一品香滷味',
    '鬼匠拉麵',
    '大嗑',
    '得來素蔬食早午餐',
    '綠野鮮蹤',
    '韓奶奶',
    '紅吱吱平價牛排館',
    '鏡站眼鏡',
  ],
  lots: [
    // ================= 東南側（+1）=================
    // s 151～159：大智街；s 159～161.4 新資生的圓角（custom）
    // 新資生藥局：6 樓灰色磁磚，一樓整條紅色大招牌
    E(161.4, 166, {
      nf: 6,
      wall: GT,
      sign: [
        '新資生藥局',
        '#d8262c',
        '#ffffff',
        '處方調劑·營養保健·婦嬰用品·醫療器材·醫學美容·奶粉尿布',
      ],
      bal: 'plain',
      d: 13,
      bikes: 3,
    }),
    // WENIC HAIR：4 樓白磁磚，淡紫灰雨遮
    E(166, 170, {
      nf: 4,
      wall: WT,
      sign: ['WENIC HAIR', '#f2f0ee', '#6a5a7a'],
      awn: '#b8b0c8',
      bal: 'grille',
      d: 13,
    }),
    // 3 樓紅瓦山牆老透天兩棟（拱形窗、山牆在 custom）：WEME HAIR SALON（淺米色鐵捲門、白色木格柵）、好好早午餐
    E(170, 174.5, {
      nf: 3,
      wall: '#c4c2bc',
      sign: ['WEME HAIR SALON', '#c9c6d2', '#4a4658'],
      ground: 'shutter',
      sh: '#cdbb92',
      door: 0,
      bal: 'arch',
      roof: 'none',
      d: 13,
    }),
    E(174.5, 179.5, {
      nf: 3,
      wall: '#c9c7c0',
      sign: ['好² Hao & Hao brunch 好好早午餐', '#2a2a2c', '#ffffff', '03-4162340'],
      ground: 'shutter',
      sh: '#8a8682',
      door: 0,
      bal: 'arch',
      roof: 'none',
      d: 13,
    }),
    // 福田永豐：4 樓窄樓，樓頂鐵皮加蓋，一樓藍招牌、紅布條
    E(179.5, 184, {
      nf: 4,
      wall: '#c9c8c2',
      sign: ['福田永豐', '#23408a', '#ffffff'],
      banner: [' ', '#d8282a', '#ffffff'],
      ground: 'shutter',
      sh: '#a8a6a0',
      door: 0,
      bal: 'arch',
      roof: 'shack',
      d: 13,
    }),
    // 4 樓紅磚樓：綠色雨遮兩戶
    E(184, 189.5, {
      nf: 4,
      wall: RB,
      ground: 'shop',
      awn: '#2f8a4a',
      noband: 1,
      bal: 'plain',
      d: 13,
    }),
    E(189.5, 195, {
      nf: 4,
      wall: RB,
      ground: 'shutter',
      sh: '#b4b4b0',
      awn: '#2f8a4a',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 13,
      bikes: 3,
    }),
    // 7 樓白磁磚大樓：綠雨遮大門、深色招牌店（字看不清）、冒大仙
    E(195, 201.5, {
      nf: 7,
      wall: WT,
      ground: 'gate',
      sh: '#6a6a66',
      awn: '#2f8a4a',
      noband: 1,
      bal: 'grille',
      d: 11.5,
    }),
    E(201.5, 207.7, {
      nf: 7,
      wall: WT,
      sign: [' ', '#2b2b2d', '#ffffff'],
      bal: 'grille',
      roof: 'tank',
      d: 11.5,
    }),
    E(207.7, 215, {
      nf: 7,
      wall: WT,
      sign: ['冒大仙 MAO DAXIAN 成都鮮冒菜', '#7cc242', '#ffffff', '中原加盟店'],
      banner: ['白飯&飲料 內用無限供應', '#4fae3a', '#ffffff'],
      ground: 'shutter',
      sh: '#b8b8b2',
      bal: 'cage',
      d: 11.5,
    }),
    // 退縮的灰色鐵捲門（門口黃色網狀線在 custom）
    E(215, 218.2, {
      set: 9,
      nf: 4,
      wall: '#9a9a96',
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 9.5,
    }),
    // 小米／嘉香小菜：灰色清水模窄樓，樓頂鐵皮加蓋，一樓藍色小雨遮
    E(218.2, 221.2, {
      nf: 4,
      wall: '#9e9c96',
      ground: 'shop',
      awn: '#3a8ad0',
      noband: 1,
      vert: ['嘉香 鹹粥 小菜', '#f2c230', '#c8282a'],
      round: ['小米', '#d6d6d4', '#3a3a3a'],
      bal: 'plain',
      roof: 'shack',
      d: 12,
    }),
    // 嘉香粥麵：紅白條紋雨遮，樓上整面白窗簾
    E(221.2, 225.5, {
      nf: 4,
      wall: '#dcd9d0',
      sign: ['嘉香 粥麵', '#f2c230', '#c8282a', '海鮮粥·皮蛋瘦肉粥·鍋燒麵·板條·米粉湯·肉燥飯'],
      awn: ['#d8282a', '#f6f2ee'],
      bal: 'glass',
      glass: '#d8dcdc',
      d: 12,
    }),
    // 日式威廉弘揚店：紫色招牌、藍色鐵捲門
    E(225.5, 231, {
      nf: 5,
      wall: WT,
      sign: ['日式 威廉 William 弘揚店', '#6a5aa8', '#ffffff', '03-456-1866'],
      ground: 'shutter',
      sh: '#3a6ab0',
      door: 0,
      bal: 'grille',
      d: 12,
    }),
    E(231, 234.5, {
      nf: 5,
      wall: '#e4e2dc',
      ground: 'shutter',
      sh: '#3d5a8a',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 八方雲集轉角樓：4 樓白磁磚，扇形鐵窗，紅色招牌、黃色側招
    E(234.5, 240.8, {
      nf: 4,
      wall: WT,
      sign: ['八方雲集鍋貼水餃專賣店', '#d8323a', '#ffffff', '訂購專線：466-7967'],
      vert: ['八方雲集', '#f2c230', '#c8282a'],
      bal: 'arch',
      d: 12,
    }),
    // s 240.8～246.3：振興街；s 246.3～248.7 全家的圓角（custom）
    // 全家便利商店：5 樓白磁磚、綠框鐵窗，長面寬店面
    E(248.7, 257, {
      nf: 5,
      wall: WT,
      sign: ['全家 FamilyMart', '#ffffff', '#1a7ac0', null, 'fam'],
      hood: '#3f8a5a',
      bal: 'cage',
      d: 13,
      bikes: 4,
    }),
    E(257, 265, {
      nf: 5,
      wall: WT,
      sign: ['全家 FamilyMart', '#ffffff', '#1a7ac0', null, 'fam'],
      banner: ['住家 0952-710-839', '#d8282a', '#ffffff'],
      vert: ['FamilyMart', '#ffffff', '#1a7ac0'],
      hood: '#3f8a5a',
      bal: 'cage',
      d: 13,
      bikes: 5,
    }),
    // ONE 桌遊：白招牌綠圓標誌、藍雨遮
    E(265, 270.2, {
      nf: 5,
      wall: WT,
      sign: ['ONE 桌遊  ONE board game', '#ffffff', '#2a9a7a'],
      awn: '#2a6ab0',
      bal: 'cage',
      d: 13,
    }),
    // 6 樓白磁磚凸窗公寓（凸窗在 custom）：紅黃招牌店、兆邑現炒、一飛沖天、紅雨遮店
    E(270.2, 274.2, {
      nf: 6,
      wall: WT,
      sign: [' ', '#d8282a', '#f2d23a'],
      bal: 'plain',
      d: 13,
    }),
    E(274.2, 278.2, {
      nf: 6,
      wall: WT,
      sign: ['兆邑 現炒', '#1c1c1c', '#ffffff'],
      vert: ['兆邑 現炒', '#1c1c1c', '#ffffff'],
      bal: 'plain',
      d: 13,
    }),
    E(278.2, 282.5, {
      nf: 6,
      wall: WT,
      sign: ['一飛沖天', '#f4f2ee', '#c8282a', '麻辣燙·關東煮'],
      awn: '#2b2b2b',
      bal: 'plain',
      d: 13,
    }),
    E(282.5, 287, {
      nf: 6,
      wall: WT,
      ground: 'shop',
      awn: '#c8483a',
      noband: 1,
      bal: 'plain',
      d: 13,
    }),
    // 轉角 6 樓白磁磚凸窗樓面弘揚路的騎樓店面（後面是實踐路那棟 7 樓的側牆，深度只做到側牆）
    E(287, 296, {
      nf: 6,
      wall: WT,
      ground: 'open',
      awn: '#8a6a5a',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    E(296, 302.5, {
      nf: 6,
      wall: WT,
      ground: 'open',
      awn: '#8a6a5a',
      noband: 1,
      door: 0,
      bal: 'plain',
      roof: 'none',
      d: 6.2,
    }),
    E(302.5, 309, {
      nf: 6,
      wall: WT,
      ground: 'shop',
      awn: '#c8786a',
      noband: 1,
      vert: ['洪立 自助洗衣', '#c8582a', '#f6e8c8'],
      bal: 'plain',
      roof: 'none',
      d: 5,
    }),
    E(309, 312.6, {
      nf: 6,
      wall: WT,
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      roof: 'none',
      d: 3.6,
      // 實踐路那面（街景 2026-05）：騎樓店面、紅色招牌帶（字看不清，不放字）
      side: { at: 1, sign: ['', '#b8322a', '#ffffff'], ground: 'shop' },
    }),

    // ================= 西北側（-1）=================
    // 一品香滷味：5 樓灰白磁磚，藍白條紋雨遮
    W(160, 166.3, {
      nf: 5,
      wall: '#d9d6d0',
      sign: ['一品香滷味', '#f2c230', '#c8282a'],
      awn: ['#3a5ab0', '#f2f2f2'],
      bal: 'glass',
      glass: '#6f8a92',
      d: 16,
    }),
    // 鬼匠拉麵：紅色招牌、直立燈箱、紅燈籠（custom）
    W(166.3, 172, {
      nf: 5,
      wall: '#c9c6c0',
      sign: ['鬼匠', '#c8282a', '#ffffff', '加盟專線 0922-280170'],
      vert: ['鬼匠', '#c8282a', '#ffffff'],
      bal: 'grille',
      d: 16,
    }),
    // 龍貓早午餐：米色手繪招牌、褐色雨遮、紅布條
    W(172, 178, {
      nf: 4,
      wall: '#dcd8cc',
      sign: ['早午餐', '#e8dcc0', '#3a3a3a'],
      awn: '#7a5e52',
      banner: ['火腿起司吐司+小熱狗+紅茶=50元', '#d8402a', '#ffffff'],
      bal: 'plain',
      d: 16,
    }),
    // 深灰色新公寓：黑色欄杆陽台，一樓鐵捲門
    W(178, 183.6, {
      nf: 5,
      wall: '#6e6e70',
      ground: 'shutter',
      sh: '#8a8a88',
      noband: 1,
      door: 0,
      bal: 'rail',
      d: 16,
    }),
    // 大嗑 BRUNCH：三和三街口轉角，黑底紅字招牌、紅燈籠（custom）
    W(183.6, 190.3, {
      nf: 5,
      wall: '#b9ad9e',
      sign: ['大嗑 BRUNCH', '#1c1c1c', '#e8382a'],
      banner: ['全球咖啡權威認證', '#d8282a', '#ffffff'],
      bal: 'glass',
      glass: '#7a948a',
      d: 16,
    }),
    // s 190.3～195.7：三和三街
    // 6 樓轉角樓：一樓白色店面（圓形標誌招牌、藍字小招牌，字看不清）
    W(195.7, 202, {
      nf: 6,
      wall: '#b5afa4',
      low: '#eeeeea',
      sign: [' ', '#f4f4f2', '#2a4aa0'],
      round: [' ', '#f4f4f2', '#c8282a'],
      bal: 'cage',
      d: 13.5,
    }),
    W(202, 207.6, {
      nf: 6,
      wall: '#b5afa4',
      ground: 'shop',
      noband: 1,
      bal: 'cage',
      roof: 'tank',
      d: 13.5,
    }),
    // DIY 洗衣工坊：粉紅磁磚 5 樓
    W(207.6, 210.8, {
      nf: 5,
      wall: '#c99a94',
      sign: ['DIY 洗衣工坊', '#f2f2f2', '#2a5ab0', 'COMMER WASHER & DRYER'],
      bal: 'cage',
    }),
    // 得來素：6 樓灰白磁磚，綠黑招牌、直立綠招牌
    W(210.8, 214.3, {
      nf: 6,
      wall: '#d6d4ce',
      sign: ['DELAISU 得來素', '#4fae3a', '#ffffff', 'vegetarian'],
      vert: ['得來素', '#2a5a3a', '#ffffff'],
      banner: ['快樂全家餐', '#c8282a', '#ffffff'],
      bal: 'grille',
    }),
    // 弘揚電腦：5 樓淺粉磁磚，綠雨遮
    W(214.3, 221.5, {
      nf: 5,
      wall: '#d4b8b2',
      sign: ['弘揚電腦', '#2a5ab0', '#ffffff', '專業維修·中古買賣·周邊耗材  436-0955'],
      vert: ['弘揚電腦', '#2a5ab0', '#ffffff'],
      awn: '#3f9a6a',
      bal: 'grille',
    }),
    // 攬攬風味小火鍋：4 樓白磁磚，深藍招牌、落地玻璃（170 號門牌在 custom）
    W(221.5, 229.5, {
      nf: 4,
      wall: WT,
      sign: ['攬攬 風味小火鍋', '#1f2f6a', '#ffffff'],
      bal: 'plain',
      bikes: 3,
    }),
    // s 229.5～233.5：露天停車場（custom）
    // 綠野鮮蔬：3 樓老街屋，二樓大看板、綠雨遮
    W(233.5, 239, {
      nf: 3,
      wall: '#d2d0c8',
      big: ['綠野鮮蔬\n健康素食自助餐', '#eef4e4', '#2a8a3a'],
      bigFrom: 2,
      awn: '#3f9a5a',
      banner: ['自助餐 60', '#e8f0d8', '#c8282a'],
      bal: 'plain',
      roof: 'shack',
    }),
    // 淺藍色 7 樓：一樓韓奶奶（紅白藍招牌、藍白遮雨棚）
    W(239, 246.5, {
      nf: 7,
      wall: '#a9c6d8',
      sign: ['韓奶奶 韓式豆腐鍋物', '#f6f2ee', '#c8282a', '中原代表店'],
      awn: ['#2a5ab0', '#f2f2f2'],
      bal: 'plain',
      roof: 'tank',
    }),
    // 別丟臉 Face Clean 美膚舒壓專門店：4 樓
    W(246.5, 251.5, {
      nf: 4,
      wall: '#d8b8a8',
      sign: ['別丟臉 Face Clean', '#7ec4d8', '#ffffff', '美膚舒壓專門店'],
      bal: 'open',
    }),
    // 4 樓白磁磚老街屋：二樓綠鐵窗，一樓停機車、沒有招牌
    W(251.5, 256.5, {
      nf: 4,
      wall: '#e0deda',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'cage',
      bikes: 3,
    }),
    // 綠色波浪磁磚陽台老樓（波浪欄杆在 custom），一樓車庫
    W(256.5, 261.5, {
      nf: 3,
      wall: '#7a9a84',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'open',
      roof: 'shack',
    }),
    // 晨間廚房 LaMorning：藍黃招牌
    W(261.5, 265.5, {
      nf: 4,
      wall: WT,
      sign: ['晨間廚房 LaMorning', '#2a7ad0', '#ffffff'],
      bal: 'cage',
    }),
    // 紅吱吱平價牛排館：6 樓白磁磚，二樓大看板、紅白條紋雨遮、圓形紅招牌
    W(265.5, 271.5, {
      nf: 6,
      wall: WT,
      sign: ['紅吱吱 平價牛排館', '#c8282a', '#ffffff', 'HONGZHIZHI  03-4661170'],
      awn: ['#d8282a', '#f6f2ee'],
      round: ['紅吱吱', '#c8282a', '#ffffff'],
      bal: 'plain',
    }),
    W(271.5, 276, {
      nf: 6,
      wall: WT,
      ground: 'shop',
      awn: '#3f9a5a',
      noband: 1,
      bal: 'plain',
    }),
    W(276, 280.5, {
      nf: 6,
      wall: WT,
      sign: [' ', '#f2f2f0', '#3a6a3a'],
      bal: 'plain',
      roof: 'tank',
    }),
    // 新潔投幣式自助洗衣坊：白底招牌、直立招牌
    W(280.5, 286, {
      nf: 5,
      wall: WT,
      sign: ['新潔投幣式自助洗衣坊', '#f4f4f2', '#c8282a', '24H Shin Jie Coin Laundry'],
      vert: ['新潔自助洗衣坊', '#f4f2f0', '#c8282a'],
      bal: 'cage',
    }),
    // 鏡站眼鏡驗光所：紫白招牌、鐵皮雨遮、促銷布條，樓頂白色欄杆
    W(286, 291.9, {
      nf: 4,
      wall: '#e6e4de',
      sign: ['鏡站眼鏡驗光所  EYEWEAR STATION', '#f6f4f8', '#6a3a8a', 'TEL:03-4662058'],
      tin: 1,
      banner: ['全館大放送 配鏡 1680', '#4a2a8a', '#ffffff'],
      bal: 'plain',
    }),
    // 帕娣美學：轉角白樓（本體在 shijian/S3.js）面弘揚路的那一面，貼著側牆
    W(291.9, 305, {
      set: 5.3,
      nf: 5,
      wall: SJW,
      sign: ['帕娣美學 HAIR SALON', '#f4f4f2', '#2a2a2a', '預約專線：0968030782'],
      awn: '#d8d6d0',
      ground: 'shutter',
      sh: '#9a9a96',
      bal: 'plain',
      roof: 'none',
      d: 3,
    }),
  ],

  custom(C) {
    const { FRONT, paint, lcg } = C;
    // ---- 東南側 ----
    // 新資生的圓角（大智街那一角）：灰磁磚圓柱、一樓紅色招牌帶、轉角直立「藥」字大招牌
    {
      const k = seg(C, 1, 159, 161.4, SR),
        r = 2.4,
        top = 3.3 + 5 * 3.0;
      roundCorner(C, k, r, top, 13, GT, 6);
      k.cyl(r, r, r + 0.25, 2.45, 3.3, '#d8262c', { seg: 20 });
      const a = -0.75 * Math.PI,
        cx = r - (r + 0.35) * 0.707,
        cz = r - (r + 0.35) * 0.707;
      k.plane(paint('藥', '#d8262c', '#ffffff', null, 1.4, 6), 1.4, 6, cx, 3.3 + 3.4, cz, a, {
        emissive: 0.25,
      });
      k.plane(
        paint('新資生', '#d8262c', '#ffffff', null, 2.2, 0.85),
        2.2,
        0.85,
        cx,
        2.88,
        cz - 0.02,
        a,
        { emissive: 0.25 }
      );
    }
    // 兩棟紅瓦山牆老透天：三樓頂上的山牆與紅瓦斜頂
    for (const [s0, s1, wall] of [
      [170, 174.5, '#c4c2bc'],
      [174.5, 179.5, '#c9c7c0'],
    ]) {
      const k = seg(C, 1, s0, s1, SR),
        w = k.W,
        top = 3.3 + 2 * 3.0;
      k.box(0, w, top, top + 0.35, -0.15, 13, wall, NC);
      prism(C, k, 0.1, w - 0.1, top + 0.35, 1.9, -0.25, 12.5, wall);
      prism(C, k, -0.25, w + 0.25, top + 0.25, 2.3, 0.15, 12.8, '#b4553e');
      k.box(w / 2 - 0.6, w / 2 + 0.6, top + 0.6, top + 1.5, -0.27, -0.25, '#4f6a70', NC); // 山牆上的小窗
    }
    // 退縮鐵捲門前的黃色網狀線
    {
      const k = seg(C, 1, 215, 218.2, SR),
        w = k.W;
      for (const [x0, x1, z0, z1] of [
        [0.1, 0.25, -1.3, 2.4],
        [w - 0.25, w - 0.1, -1.3, 2.4],
        [0.1, w - 0.1, -1.3, -1.15],
        [0.1, w - 0.1, 2.25, 2.4],
      ])
        k.box(x0, x1, 0.02, 0.05, z0, z1, '#e8b82a', NC);
      for (let t = -1.2; t < 2.4; t += 0.9) {
        const g = new C.THREE.BoxGeometry(0.12, 0.03, Math.hypot(w - 0.4, 3.4) * 0.5);
        g.rotateY(Math.atan2(w - 0.4, 3.4));
        g.translate(w / 2, 0.035, t + 0.4);
        k._part(C.VC, C.paintGeo(g, '#e8b82a'));
      }
    }
    // 全家的圓角（振興街那一角）：白磁磚圓柱、一樓全家招牌帶（藍、綠、白）
    {
      const k = seg(C, 1, 246.3, 248.7, SR),
        r = 2.4,
        top = 3.3 + 4 * 3.0;
      roundCorner(C, k, r, top, 13, WT, 5, '#3f8a5a');
      k.cyl(r, r, r + 0.25, 2.5, 3.3, '#ffffff', { seg: 20 });
      k.cyl(r, r, r + 0.26, 3.12, 3.3, '#00a0e0', { seg: 20 });
      k.cyl(r, r, r + 0.26, 3.0, 3.12, '#2fb34a', { seg: 20 });
      k.cyl(r, r, r + 0.26, 0, 0.5, '#d9d9d4', { seg: 20 });
    }
    // 6 樓白磁磚凸窗公寓（s 270.2～312.6）：每格兩組凸窗
    for (const [s0, s1] of [
      [270.2, 274.2],
      [274.2, 278.2],
      [278.2, 282.5],
      [282.5, 287],
      [287, 296],
      [296, 302.5],
      [302.5, 309],
      [309, 312.6],
    ]) {
      const k = seg(C, 1, s0, s1, SR),
        w = k.W,
        n = w > 7 ? 3 : w > 3.8 ? 2 : 1;
      bays(
        C,
        k,
        Array.from({ length: n }, (_, j) => (w * (j + 0.5)) / n),
        6,
        '#e4e2dc'
      );
    }
    // 兆邑現炒門口的紅燈籠
    {
      const k = seg(C, 1, 274.2, 278.2, SR);
      lanterns(C, k, 0.6, k.W - 0.6, 2.35, -0.9, 0.95);
    }
    // 豆花王：KING'S 豆花王布丁豆花攤車（米白招牌）
    {
      const k = seg(C, 1, 287, 296, SR),
        x = 6.2;
      k.box(x - 0.9, x + 0.9, 0.2, 1.0, -1.1, -0.3, '#e8e2d2');
      k.box(x - 0.9, x + 0.9, 1.0, 1.05, -1.15, -0.25, '#6a5a4a', NC);
      for (const xx of [x - 0.85, x + 0.85])
        k.box(xx - 0.03, xx + 0.03, 1.05, 2.1, -1.1, -1.04, '#8a8a88', NC);
      k.box(x - 0.95, x + 0.95, 2.1, 2.55, -1.15, -1.05, '#efe6cf', NC);
      k.plane(
        paint("KING'S 豆花王", '#efe6cf', '#7a4a2a', null, 1.8, 0.4),
        1.8,
        0.4,
        x,
        2.33,
        -1.16,
        FRONT
      );
      k.plane(
        paint('布丁豆花', '#e8e2d2', '#7a4a2a', null, 1.7, 0.5),
        1.7,
        0.5,
        x,
        0.6,
        -1.11,
        FRONT
      );
      for (const xx of [x - 0.6, x + 0.6]) k.cyl(xx, -0.7, 0.12, 0, 0.2, '#3a3a3a', { seg: 8 });
    }
    // ---- 西北側 ----
    // 鬼匠、大嗑的一排紅燈籠
    {
      const k = seg(C, -1, 166.3, 172, SL);
      lanterns(C, k, 0.6, k.W - 0.6, 2.35, -0.9, 1.1);
      const k2 = seg(C, -1, 183.6, 190.3, SL);
      for (const x of [0.8, 2.6, 4.4, 6.0]) ball(C, k2, x, 2.4, -1.0, 0.3, '#d8302a', 1.2);
    }
    // 攬攬：牆角藍色圓形「170」門牌
    {
      const k = seg(C, -1, 221.5, 229.5, SL),
        x = k.sx(229.3);
      k.plane(paint('170', '#1f2f6a', '#ffffff', null, 0.9, 0.9), 0.9, 0.9, x, 4.6, -0.6, FRONT, {
        emissive: 0.2,
        double: true,
      });
    }
    // 露天停車場（s 229.5～233.5）：水泥地、橘色導線、價目牌與 P 字
    {
      const k = seg(C, -1, 229.5, 233.5, SL),
        w = k.W;
      k.box(0, w, -0.3, 0.12, -1.4, 18, '#b9b8b2', { col: false, surface: true });
      k.box(1.8, 2.0, 0.12, 0.14, 0, 16, '#e8742a', NC);
      k.box(0.3, 3.7, 0.12, 0.14, 1.0, 1.2, '#e8742a', NC);
      k.box(w - 0.6, w - 0.5, 0, 2.2, 0.3, 0.4, '#5a5e60');
      k.plane(
        paint('40元', '#f2f2ee', '#1a1a1a', '計時收費', 0.8, 1.0),
        0.8,
        1.0,
        w - 0.55,
        1.6,
        0.24,
        FRONT,
        { emissive: 0.15 }
      );
      k.plane(
        paint('P', '#2a5ab0', '#ffffff', null, 0.5, 0.5),
        0.5,
        0.5,
        w - 0.55,
        2.4,
        0.24,
        FRONT,
        {
          emissive: 0.2,
        }
      );
      // 柵欄機
      k.box(0.3, 0.6, 0, 1.0, 3.0, 3.3, '#e8c02a');
      k.box(0.6, 3.6, 0.85, 0.92, 3.1, 3.2, '#e8e8e4', NC);
    }
    // 綠色波浪磁磚老樓：二三樓陽台的波浪形磁磚欄杆
    {
      const k = seg(C, -1, 256.5, 261.5, SL),
        w = k.W;
      for (const y of [3.3, 3.3 + 3.0]) {
        k.box(0.1, w - 0.1, y, y + 0.8, -0.7, -0.5, '#4f7a5e', NC);
        for (let x = 0.6; x < w - 0.3; x += 1.2) ball(C, k, x, y + 0.8, -0.6, 0.45, '#4f7a5e', 0.5);
      }
      const r = lcg(31256);
      for (let x = 0.5; x < w - 0.3; x += 0.8)
        ball(C, k, x, 3.3 + 2 * 3.0 + 0.5, 0.6, 0.4 + r() * 0.2, '#4b8a3e', 0.9); // 樓頂盆栽
    }
    // 紅吱吱二樓的大看板（紅底、牛排照片位置用暗紅色塊代替）
    {
      const k = seg(C, -1, 265.5, 271.5, SL),
        w = k.W - 0.6;
      k.box(0.3, k.W - 0.3, 3.5, 6.1, -0.35, -0.05, '#7a1a1e', NC);
      k.plane(
        paint(
          '紅吱吱 HONGZHIZHI',
          '#9a1f24',
          '#ffffff',
          '內用均附：玉米濃湯、吐司、飲料無限供應',
          w,
          2.5
        ),
        w,
        2.5,
        k.W / 2,
        4.8,
        -0.36,
        FRONT,
        { emissive: 0.2 }
      );
    }
    // 帕娣美學轉角的好了啦飲料攤（紅色看板）
    {
      const k = seg(C, -1, 291.9, 305, 5.3),
        x = 1.6;
      k.box(x - 0.8, x + 0.8, 0, 1.0, -1.6, -0.6, '#c9b892');
      k.box(x - 0.8, x + 0.8, 1.0, 1.05, -1.65, -0.55, '#5a5a58', NC);
      k.box(x - 0.85, x + 0.85, 2.0, 2.6, -1.7, -1.6, '#c8282a', NC);
      k.plane(
        paint('好了啦 超大杯 1000c.c', '#c8282a', '#f6e6a0', null, 1.7, 0.6),
        1.7,
        0.6,
        x,
        2.3,
        -1.71,
        FRONT,
        { emissive: 0.25 }
      );
      for (const xx of [x - 0.78, x + 0.78])
        k.box(xx - 0.03, xx + 0.03, 1.05, 2.0, -1.62, -1.58, '#8a8a88', NC);
    }
  },

  // custom 佔的地
  footprints(F) {
    return [
      F(R, 159, 161.4, 1, SR, 13, 0), // 新資生圓角
      F(R, 246.3, 248.7, 1, SR, 13, 0), // 全家圓角
      F(R, 229.5, 233.5, -1, SL, 18, 0.8), // 露天停車場
    ];
  },
};
