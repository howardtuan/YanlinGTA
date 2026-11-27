// 力行北街 s 262～425 兩側（參考線 'LB'，s=0 在中北路口往東南走；日新路口 s≈240、大勇一街十字路口 s≈340、弘揚路口 s≈446；路寬 6 m）。
// 照 Google 街景（車拍 2024-08、2026-05，使用者相片球 2025-06：相片球位置會差幾公尺，店家先後順序照照片、寬度與分戶線照國土測繪 2024 正射屋頂）建模，
// 照片在 side-session-notes 的 zs-sv/LB/（s 256～436）。大勇一街是 data/cycu.json 的路名（路面字「大…」看不清），在這裡十字交叉。
//   西南側（+1、照片 _R）由日新路往弘揚路：3 樓白色小方磁磚舊樓（Heineken 圓招、藍雨棚，57 號）→ 儒林園套房（暗紅花崗石挑高騎樓、門楣大字）→
//     5 樓公寓樓梯口 → 天下奇冰 ICEVER（二樓白色格柵、抹然心動布條）→ 黑色帆布雨棚小店 → 灰帆布屋簷小吃店（黃黑圓招看不清）→
//     停車場車道（綠色矮牆、黃色收費告示）→ 墨綠鐵捲門兩間（灰綠仿瓦雨遮、二樓綠招牌看不清）→ 飽福 熱炒／飯麵館 →
//     紅燈籠公寓樓梯口 → 6 樓白磁磚轉角樓（朝大勇一街那面白雨棚店面）→ 大勇一街 →
//     KYMCO 光陽機車 民翔車業（5 樓白色小方磁磚轉角，朝大勇一街那面 YAMAHA 直招、Castrol）→ 4 樓白格子磁磚（一樓古銅色鐵窗花）→ 防火巷 →
//     5 樓白磁磚（騎樓柱、灰鐵捲門）→ 台G店 補氣行家 → 4 樓紅磚（陽台種花、深色木門店）→ TEAGOTO（文化石）→ 無界ラーメン（紅磚）→
//     往西南的窄巷 → 杏好有仁（3 樓米黃磁磚兩戶相連，紅瓦小雨遮）→ 空地 → N&L Hair Salon／新永賓理髮（4 樓白磁磚藍收邊）→
//     7 號 6 樓白磁磚公寓（灰浪板雨遮、塗鴉電箱）
//   東北側（-1、照片 _L）：3～4 樓米黃舊樓（一樓鐵皮牆、管線）→ 3 樓「車庫」透天兩戶（二樓拱窗，右戶是吾栖 Home Bistro）→ 胖菓子（白色方形雨棚，小貓、吐司圖案）→
//     4 樓米黃舊樓（紅布條「12/26 試營運 12/30 全面九折」）→ KiKi Garden Pasta → 私巷（藍綠鐵門框）→ 3 樓米黃透天（拱窗）→
//     綠色外牆 5 樓 → 3 樓米黃透天（兩扇大鐵捲門、紅春聯鐵門）→ 4 樓灰白磁磚 → 肉鬼山 沙威瑪（40 號）→ 紅磚樓（白色直招看不清）→
//     Fans → 4 樓米黃小方磁磚舊公寓（30 號）→ 生活故事轉角樓（一樓深色石材，朝大勇一街那面紅招牌「工作夥伴」）→ 大勇一街 →
//     7 樓咖啡色磁磚轉角大樓（朝大勇一街那面綠色洗衣店招牌看不清；紅白棋盤磚、盆景松）→ 藍色外牆大樓（車道入口）→
//     4 樓紅磚倉庫店面（花崗石柱）→ 4 樓米黃公寓（套房出租直招）→ 白色小方磁磚拱廊大樓（三連拱騎樓、鑄鐵矮欄杆）→
//     往東北的社區巷道（路口黃色網狀線）→ 白色拱窗大樓（雙拱騎樓、綠籬）→ 4 樓白磁磚舊公寓（鐵門、管線）→ 防火巷（弘揚路口轉角歸 SegH1）
// 兩端接縫：
//   日新路口那頭：-1 從 s 262 開始（之前是 src/world/buildings/StreetRixin.js 的日新路街屋 #47～#49）；+1 從 s 262 開始，
//     s 259～264 的夜市補建 nm35 一起藏起來，s 259～262 留給日新路口那格（#32 到 s 259）不蓋。
//   弘揚路口那頭：+1 做到 s 425、-1 做到 s 423.5（後面是防火巷），s 425 之後兩角是 xzb/SegH1.js。
// 大勇一街口兩側的四個轉角樓都在這裡，朝大勇一街那面用 side 畫店面；大勇一街的路面（半寬 2.5 m）不蓋：
//   西角做到 s 334.2、南角從 s 342 開始，北角做到 s 337、東角從 s 344.2 開始（大勇一街往兩側走時中心線會偏 1～3 m，往深處算過不會壓到路面）。
// 拿掉的：有店面牆的填充樓與夜市補建 nm34、nm35、nm156（大勇一街東角大樓的後半段）放 hide；原本 noShop 的填充樓放 drop。看不清的招牌不放字。
const R = 'LB';
const NC = { col: false };
// 開一個 Kit：k.W 是格寬（C.kit 把寬度存在 k.w，會蓋掉 Kit 自己的 w()，所以搬到 k.W 再還原）
const seg = (C, side, s0, s1, set = 4.3) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  return k;
};
// 球（盆景松的樹冠、紅燈籠）
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 10, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 招牌一塊：底板＋字（貼在 z 往街道那側）
const board = (C, k, text, bg, fg, sub, x0, x1, y0, y1, z, emissive = 0.3) => {
  const w = x1 - x0,
    h = y1 - y0;
  k.box(x0, x1, y0, y1, z, z + 0.12, bg, NC);
  k.plane(C.paint(text, bg, fg, sub, w, h), w, h, (x0 + x1) / 2, (y0 + y1) / 2, z - 0.01, C.FRONT, {
    emissive,
  });
};
// 盆景松：方形水泥盆＋細幹＋幾團扁平的樹冠
const pine = (C, k, x, z) => {
  k.box(x - 0.45, x + 0.45, 0, 0.5, z - 0.45, z + 0.45, '#9a9892');
  k.cyl(x, z, 0.08, 0.5, 2.3, '#5a4632', { seg: 6 });
  for (const [dx, y, r] of [
    [-0.4, 1.3, 0.55],
    [0.35, 1.75, 0.5],
    [-0.15, 2.25, 0.45],
    [0.1, 2.65, 0.35],
  ])
    ball(C, k, x + dx, y, z, r, '#3f6a34', 0.45);
};

const WT = '#e9e8e3', // 白色小方磁磚
  BG = '#e2d4b4', // 米黃磁磚
  OLD = '#d6d3ca', // 灰白舊公寓
  RB = '#a8604c'; // 紅磚色磁磚

const S = (s0, s1, sp) => [R, s0, s1, 1, { d: 13, ...sp }]; // 西南側
const N = (s0, s1, sp) => [R, s0, s1, -1, { d: 13, ...sp }]; // 東北側

export default {
  // 有店面牆的填充樓、夜市補建：資料留著、不畫
  hide: [
    'nm34',
    'nm35',
    // 大勇一街東角那棟咖啡色大樓後半段（沿大勇一街，s 344～351、離中心線 14.4～18.7 m）的夜市補建量體
    'nm156',
    // 西南側
    'f2_313',
    'f2_316',
    'f2_317',
    'f2_319',
    'f2_320',
    'f2_321',
    'f2_324',
    'f2_325',
    'f2_326',
    'f2_327',
    'f2_499',
    'f2_500',
    'f2_501',
    'f2_503',
    'f2_507',
    'f2_510',
    // 東北側
    'f2_557',
    'f2_556',
    'f2_552',
    'f2_550',
    'f2_378',
    'f2_374',
    'f2_373',
    'f2_368',
  ],
  // 原本 noShop 的填充樓
  drop: [
    // 西南側
    'f2_314',
    'f2_315',
    'f2_318',
    'f2_322',
    'f2_323',
    'f2_502',
    'f2_504',
    'f2_505',
    'f2_506',
    'f2_508',
    'f2_509',
    // 東北側
    'f2_559',
    'f2_558',
    'f2_555',
    'f2_554',
    'f2_553',
    'f2_551',
    'f2_549',
    'f2_548',
    'f2_380',
    'f2_379',
    'f2_377',
    'f2_376',
    'f2_375',
  ],
  // 跟 data/cycu.json pois 的 name 完全一樣
  ownSign: [
    '天下奇冰',
    '飽福飯麵館',
    '台G店創始店',
    '杏好有仁',
    'KiKi Garden 義大利麵',
    '胖菓子pan.guozi',
    '吾栖 Home Bistro',
  ],
  lots: [
    // ================= 西南側（+1）=================
    // 57 號：3 樓白色小方磁磚舊樓，一樓小店掛 Heineken 圓招、藍色雨棚，門口紅藍白帆布攤車（custom）
    S(262, 265.5, {
      nf: 3,
      wall: WT,
      ground: 'shop',
      noband: 1,
      awn: '#2f6fb0',
      round: ['Heineken', '#1d6a38', '#ffffff'],
      door: 0,
      bal: 'cage',
    }),
    // 儒林園（套房出租）：暗紅花崗石的挑高騎樓（石柱在 custom），門楣大字「儒林園」，樓上鐵窗陽台
    S(265.5, 284, {
      nf: 7,
      gf: 5.0,
      wall: '#cfcbc2',
      low: '#6a3a34',
      sign: ['儒林園', '#5e302c', '#e8d6a6'],
      ground: 'gate',
      sh: '#3a2c2a',
      door: 0,
      bal: 'cage',
      d: 14,
      roof: 'tank',
    }),
    // 5 樓公寓的樓梯口
    S(284, 289, {
      nf: 5,
      wall: OLD,
      ground: 'gate',
      sh: '#5a5a58',
      noband: 1,
      door: 0,
      bal: 'cage',
    }),
    // 天下奇冰 ICEVER：二樓白色金屬格柵外牆（custom）與大字，一樓白色大理石牆、灰鐵捲門，綠色布條「抹然心動」
    S(289, 296, {
      nf: 5,
      wall: OLD,
      low: '#eeede8',
      sign: ['抹然心動 抹茶冰品 仙草奶凍', '#f2efe2', '#3c7a32', 'ICEVER 冰品 甜品 水果'],
      sign2: ['天下奇冰', '#e8e8e4', '#6a5a40'],
      ground: 'shutter',
      sh: '#b8b6b0',
      door: 0,
      bal: 'cage',
    }),
    // 黑色帆布雨棚的小店（樓上綠、橘色遮雨棚）
    S(296, 300.3, {
      nf: 5,
      wall: '#d4d0c6',
      awn: '#2a2a2a',
      ground: 'shop',
      noband: 1,
      bal: 'cage',
      hood: '#4a9a6a',
    }),
    // 小吃店：灰色帆布屋簷、黑鐵捲門，黃黑圓形招牌（店名看不清）
    S(300.3, 304.3, {
      nf: 5,
      wall: '#d4d0c6',
      awn: '#6a6c6e',
      ground: 'shutter',
      sh: '#2a2a2a',
      noband: 1,
      round: [' ', '#f2c230', '#1a1a1a'],
      bal: 'cage',
      hood: '#d8884a',
    }),
    // s 304.3～308.5 是停車場車道（custom：綠色矮牆、黃色收費告示）
    // 墨綠鐵捲門兩間，上方灰綠色仿瓦片雨遮，二樓綠色招牌（電話看不清）
    S(308.5, 317.3, {
      nf: 5,
      wall: '#d8d6cf',
      awn: '#7d8c84',
      ground: 'shutter',
      sh: '#24413a',
      noband: 1,
      sign2: [' ', '#2f7a4a', '#ffffff'],
      door: 0,
      bal: 'cage',
    }),
    // 飽福：二樓深藍大招牌「飽福 熱炒」，黑底直立招牌「飽福飯麵館」，灰鐵捲門
    S(317.3, 325.5, {
      nf: 5,
      wall: '#d8d6cf',
      sign2: ['飽福 熱炒', '#1d2a4a', '#ffffff'],
      vert: ['飽福飯麵館', '#1a1a1a', '#e8e04a'],
      ground: 'shutter',
      sh: '#5a5e62',
      noband: 1,
      door: 0,
      bal: 'cage',
    }),
    // 舊公寓樓梯口：紅燈籠、盆栽（custom）
    S(325.5, 328.5, {
      nf: 6,
      wall: WT,
      ground: 'gate',
      sh: '#6a6a66',
      noband: 1,
      door: 0,
      bal: 'cage',
    }),
    // 大勇一街西角：6 樓白磁磚公寓，朝大勇一街那面是白色雨棚的店面
    S(328.5, 334.2, {
      nf: 6,
      wall: WT,
      ground: 'shutter',
      sh: '#9a9a96',
      noband: 1,
      bal: 'cage',
      d: 12,
      side: { at: 1, awn: '#f2f2ee', ground: 'shutter', sh: '#8a8c8e' },
    }),
    // ---- 大勇一街 ----
    // 南角：KYMCO 光陽機車 民翔車業，5 樓白色小方磁磚，綠色鐵捲門、藍色雨棚；朝大勇一街那面是 YAMAHA 直招與 Castrol 招牌（custom）
    S(342, 347.5, {
      nf: 5,
      wall: WT,
      sign: ['KYMCO 光陽機車', '#d8282a', '#ffffff', '民翔車業'],
      awn: '#2f7fc8',
      ground: 'shutter',
      sh: '#2f7a4a',
      door: 0,
      bal: 'plain',
      d: 15,
      side: {
        at: 0,
        sign: ['YAMAHA 民翔', '#f4f2ee', '#c8282a'],
        awn: '#2f7fc8',
        ground: 'open',
        to: 9,
      },
    }),
    // 4 樓白格子磁磚：一樓整面古銅色鐵窗花（custom），門口紅旗
    S(347.5, 351, {
      nf: 4,
      wall: '#e4e3de',
      ground: 'shutter',
      sh: '#6a5236',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // s 351～352 防火巷
    // 5 樓白磁磚：騎樓柱、灰鐵捲門
    S(352, 359, {
      nf: 5,
      wall: '#e6e5e0',
      ground: 'shutter',
      sh: '#8a8c8e',
      noband: 1,
      bal: 'open',
    }),
    // 台G店 補氣行家（25 號）：灰色直條格柵外框、紅黃字，左邊黑色圓形小雞標誌
    S(359, 366, {
      nf: 5,
      wall: '#e6e5e0',
      low: '#7a7c7e',
      sign: ['台G店 補氣行家', '#4a4c4e', '#e8402a', '創立民國92年'],
      round: [' ', '#1a1a1a', '#f2d23a'],
      ground: 'shutter',
      sh: '#8a8c8e',
      door: 0,
      bal: 'open',
    }),
    // 4 樓紅磚透天：陽台種花，一樓深色木門店（字看不清）
    S(366, 370.5, {
      nf: 4,
      wall: RB,
      low: '#3a2e28',
      ground: 'shop',
      noband: 1,
      bal: 'open',
      roof: 'shack',
    }),
    // TEAGOTO（23 號）：文化石外牆，一樓木條招牌、壁燈、灰鐵捲門
    S(370.5, 376, {
      nf: 4,
      wall: '#c09a84',
      sign: ['TEAGOTO', '#a8743e', '#ffffff'],
      ground: 'shutter',
      sh: '#9a9a98',
      bal: 'plain',
    }),
    // 無界ラーメン：4 樓紅磚色，白色圓招、布簾「麵心…拉麵」
    S(376, 381.5, {
      nf: 4,
      wall: '#b0705a',
      sign: ['麵心 拉麵', '#f2efe6', '#2a2a2a'],
      round: ['無界', '#ffffff', '#1a1a1a'],
      ground: 'shutter',
      sh: '#5a5a5a',
      door: 0,
      bal: 'plain',
    }),
    // s 381.5～385.5 往西南的窄巷
    // 杏好有仁：3 樓米黃磁磚兩戶相連，二樓扇形鐵窗，紅瓦小雨遮（custom），藍鐵捲門
    S(385.5, 391, {
      nf: 3,
      wall: BG,
      sign: ['杏好有仁', '#f2f0ea', '#6a5a4a'],
      ground: 'shutter',
      sh: '#2f6f9a',
      door: 0,
      bal: 'arch',
      roof: 'shack',
    }),
    S(391, 396.5, {
      nf: 3,
      wall: BG,
      ground: 'gate',
      sh: '#6a5a46',
      noband: 1,
      bal: 'arch',
      roof: 'shack',
    }),
    // s 396.5～405 空地（停車）
    // N&L Hair Salon：4 樓白磁磚藍收邊，黃鐵捲門；右邊是中間的窄樓梯口
    S(405, 409.5, {
      nf: 4,
      wall: WT,
      sign: ['N&L Hair Salon', '#f2f2ee', '#2a2a2a'],
      ground: 'shutter',
      sh: '#d8a83a',
      bal: 'plain',
      hood: '#2f5fb0',
    }),
    // 新永賓理髮：二樓藍色大招牌，一樓紅底「套房出租」、綠鐵捲門
    S(409.5, 414.5, {
      nf: 4,
      wall: WT,
      sign: ['套房出租 0909665300', '#d8282a', '#ffffff'],
      sign2: ['新永賓理髮 學生剪髮 山本平頭', '#2f5fb0', '#ffffff'],
      ground: 'shutter',
      sh: '#3a7a5a',
      door: 0,
      bal: 'plain',
      hood: '#2f5fb0',
    }),
    // 7 號：6 樓白磁磚公寓，一樓灰色浪板雨遮、鐵窗、不鏽鋼大門
    S(414.5, 425, {
      nf: 6,
      wall: '#e4e3de',
      ground: 'gate',
      sh: '#b8bab8',
      noband: 1,
      tin: 1,
      bal: 'open',
    }),

    // ================= 東北側（-1）=================
    // 3～4 樓米黃舊樓：一樓鐵皮牆、一堆管線（custom）
    N(262, 267, {
      nf: 4,
      wall: '#ddd0b0',
      ground: 'shutter',
      sh: '#9a9c9a',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 3 樓米黃透天兩戶：二樓拱形窗，一樓兩扇鐵捲門（紅字「車庫」）、中間公寓鐵門；右邊那扇上方毛筆字「吾栖」（吾栖 Home Bistro）
    N(267, 271, {
      nf: 3,
      wall: BG,
      ground: 'shutter',
      sh: '#b0b0ac',
      noband: 1,
      bal: 'arch',
      roof: 'shack',
    }),
    N(271, 275, {
      nf: 3,
      wall: BG,
      sign: ['吾栖', '#e8e4dc', '#3a3a3a'],
      ground: 'shutter',
      sh: '#b0b0ac',
      door: 0,
      bal: 'arch',
      roof: 'shack',
    }),
    // 胖菓子 pan.guozi：白色方形雨棚的新潮店面（小貓、吐司圖案；雨棚在 custom）
    N(275, 279, {
      nf: 4,
      wall: '#e2d8c0',
      ground: 'shutter',
      sh: '#cfcfcb',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 4 樓米黃舊樓：灰鐵捲門掛紅布條，白色圓形大招牌（字看不清）
    N(279, 285, {
      nf: 4,
      wall: '#dfd2b4',
      awn: '#4a4a4a',
      banner: ['12/26 試營運 12/30 全面九折', '#c8282a', '#ffffff'],
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      round: [' ', '#f4f2ee', '#1a1a1a'],
      bal: 'plain',
    }),
    // KiKi Garden Pasta：二樓綠色大招牌，一樓條紋遮陽棚、鐵捲門
    N(285, 290.5, {
      nf: 4,
      wall: '#d8d2c4',
      sign2: ['KiKi Garden Pasta', '#2f8a4a', '#ffffff'],
      awn: ['#f2f2ee', '#4a4a4a'],
      ground: 'shutter',
      sh: '#9a9a98',
      noband: 1,
      bal: 'plain',
    }),
    // s 290.5～293.5 私巷（藍綠色鐵門框在 custom）
    // 3 樓米黃透天：拱窗、鐵捲門
    N(293.5, 299, {
      nf: 3,
      wall: BG,
      ground: 'shutter',
      sh: '#a0a09c',
      noband: 1,
      bal: 'arch',
      roof: 'shack',
    }),
    // 綠色外牆 5 樓
    N(299, 304, {
      nf: 5,
      wall: '#9cc2a6',
      ground: 'shutter',
      sh: '#a0a09c',
      noband: 1,
      bal: 'plain',
    }),
    // 3 樓米色磁磚透天：兩扇大鐵捲門、貼紅春聯的鐵門
    N(304, 311, {
      nf: 3,
      wall: '#ddd0b4',
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      bal: 'plain',
      roof: 'shack',
    }),
    // 4 樓灰白磁磚
    N(311, 315.5, {
      nf: 4,
      wall: '#cfcfca',
      ground: 'shutter',
      sh: '#9a9a98',
      noband: 1,
      bal: 'cage',
    }),
    // 肉鬼山 沙威瑪（40 號）：3 樓米黃磁磚透天，二樓拱窗
    N(315.5, 320, {
      nf: 3,
      wall: BG,
      sign: ['肉鬼山 沙威瑪', '#f4f2ee', '#3a2a22', 'SHAWARMA'],
      ground: 'shutter',
      sh: '#a8a8a4',
      bal: 'arch',
      roof: 'shack',
    }),
    // 紅磚色樓：白色直立招牌（字看不清）、灰鐵捲門
    N(320, 324.5, {
      nf: 4,
      wall: RB,
      ground: 'shutter',
      sh: '#a0a0a0',
      noband: 1,
      vert: ['　　　', '#f4f2ee', '#1a1a1a'],
      bal: 'plain',
    }),
    // Fans：紅色草寫字，綠色雨棚
    N(324.5, 327, {
      nf: 4,
      wall: '#d8d2c4',
      sign: ['Fans', '#f2f2ee', '#c8282a'],
      awn: '#3f7a4a',
      ground: 'shop',
      door: 0,
      bal: 'plain',
    }),
    // 30 號：4 樓米黃小方磁磚舊公寓，二樓凸窗，一樓不鏽鋼鐵捲門與公寓鐵門
    N(327, 331.5, {
      nf: 4,
      wall: '#e6dabc',
      ground: 'shutter',
      sh: '#b8b8b4',
      noband: 1,
      bal: 'open',
    }),
    // 大勇一街北角：生活故事，3 樓米黃樓，一樓深色石材；朝大勇一街那面米色帆布雨棚、紅招牌「工作夥伴」
    N(331.5, 337, {
      nf: 3,
      wall: BG,
      low: '#4a3c34',
      sign: ['生活故事', '#3a2e28', '#f4f2ee'],
      ground: 'shop',
      door: 0,
      bal: 'plain',
      d: 12,
      side: { at: 1, sign: ['工作夥伴', '#c8282a', '#ffffff'], awn: '#cdbb98', ground: 'shop' },
    }),
    // ---- 大勇一街 ----
    // 東角：7 樓咖啡色磁磚大樓（鑄鐵陽台），一樓灰色大鐵捲門；朝大勇一街那面是綠色招牌的洗衣店（字看不清）；門口盆景松（custom）
    N(344.2, 354.5, {
      nf: 7,
      wall: '#9a7660',
      ground: 'shutter',
      sh: '#b8b8b4',
      noband: 1,
      bal: 'open',
      d: 14.5,
      side: { at: 0, sign: [' ', '#2f9a5a', '#ffffff'], ground: 'shutter', sh: '#c4c4c0' },
    }),
    // 藍色外牆大樓：一樓是車道入口
    N(354.5, 362, {
      nf: 8,
      wall: '#7f94b8',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 14,
    }),
    // 4 樓紅磚色公寓：二樓整排鋁窗與遮雨鐵架，一樓花崗石柱、大開口倉庫式店面與公寓鐵門
    N(362, 368.5, {
      nf: 4,
      wall: RB,
      low: '#a8a69e',
      ground: 'open',
      noband: 1,
      bal: 'plain',
      hood: '#8a8a88',
    }),
    // 14 號：4 樓米黃磁磚舊公寓，一樓公寓入口與鐵捲門、紅字「套房出租」直立牌、機車停車格
    N(368.5, 378, {
      nf: 4,
      wall: '#e2d6bc',
      ground: 'gate',
      sh: '#9a9a96',
      noband: 1,
      vert: ['套房出租', '#f4f2ee', '#c8282a'],
      bal: 'plain',
      bikes: 3,
    }),
    // 10 號：白色小方磁磚拱廊大樓，一樓拱形騎樓（拱與鑄鐵矮欄杆在 custom），騎樓內停汽車
    N(378, 396, { nf: 4, wall: WT, ground: 'open', noband: 1, door: 0, bal: 'arch', d: 14 }),
    // s 396～402 往東北的社區巷道
    // 白色拱窗大樓：雙拱騎樓、圓拱鐵窗、白欄杆陽台，前面一排綠籬（custom）
    N(402, 416.5, {
      nf: 4,
      wall: '#e8e6e0',
      ground: 'gate',
      sh: '#8a8a86',
      noband: 1,
      door: 0,
      bal: 'arch',
    }),
    // 4 樓白磁磚舊公寓：鐵門、管線
    N(417, 423.5, {
      nf: 4,
      wall: '#dedcd6',
      ground: 'gate',
      sh: '#8a8a86',
      noband: 1,
      bal: 'cage',
    }),
  ],

  custom(C) {
    // 57 號門口的攤車：綠色頂棚、紅藍白條紋帆布
    {
      const k = seg(C, 1, 262, 265.5);
      k.box(0.6, 2.8, 0, 1.5, -1.15, -0.25, '#3a5fa8');
      for (let j = 0; j < 5; j++)
        k.box(
          0.6 + j * 0.44,
          0.82 + j * 0.44,
          0.2,
          1.5,
          -1.17,
          -1.15,
          j % 2 ? '#d83a3a' : '#f2f2ee',
          NC
        );
      k.box(0.5, 2.9, 1.5, 1.75, -1.2, -0.2, '#2f9a4a', NC);
    }
    // 儒林園：暗紅花崗石柱與騎樓天花（騎樓深 1.2 m 之內，不伸到路面）
    {
      const k = seg(C, 1, 265.5, 284),
        w = k.W;
      for (const x of [0.15, 6.2, 12.3, w - 0.75])
        k.box(x, x + 0.6, 0, 4.9, -1.2, -0.05, '#6e3832');
      k.box(0, w, 4.15, 5.0, -1.2, 0, '#6e3832', NC);
      board(C, k, '儒林園 套房出租', '#f4f2ee', '#c8282a', null, w - 5.5, w - 3.3, 2.0, 2.6, -0.1);
    }
    // ICEVER：二樓白色金屬格柵、騎樓邊白色格柵立牌
    {
      const k = seg(C, 1, 289, 296),
        w = k.W,
        y0 = 3.3;
      for (let y = y0 + 1.25; y < y0 + 3.0; y += 0.22)
        k.box(0.1, w - 0.1, y, y + 0.1, -0.32, -0.2, '#f2f2ee', NC);
      k.box(-0.2, 0.9, 0, 2.2, -1.2, -0.6, '#f2f2ee');
      k.plane(
        C.paint('ICEVER', '#f2f2ee', '#8a7a5a', '冰品 甜品', 0.9, 0.9),
        0.9,
        0.9,
        0.35,
        1.6,
        -1.21,
        C.FRONT,
        {
          emissive: 0.2,
        }
      );
    }
    // 停車場車道：兩側綠色矮牆、黃色收費告示
    {
      const k = seg(C, 1, 304.3, 308.5),
        w = k.W;
      k.box(0.05, 0.35, 0, 1.1, 0, 6, '#3f8a4a');
      k.box(w - 0.35, w - 0.05, 0, 1.1, 0, 6, '#3f8a4a');
      k.cyl(0.6, -0.4, 0.05, 0, 2.6, '#8a8d90', { seg: 6 });
      board(C, k, '停車場', '#f2d23a', '#1a1a1a', '計時收費', 0.15, 1.05, 1.6, 2.6, -0.5);
    }
    // 舊公寓樓梯口的紅燈籠與盆栽
    {
      const k = seg(C, 1, 325.5, 328.5);
      for (const x of [0.7, 2.2]) {
        k.cyl(x, -0.6, 0.015, 2.2, 2.6, '#3a3a3a', { seg: 4 });
        ball(C, k, x, 2.0, -0.6, 0.3, '#d8282a', 1.2);
      }
      k.cyl(1.5, -0.8, 0.3, 0, 0.45, '#b06a4a', { seg: 8 });
      ball(C, k, 1.5, 0.75, -0.8, 0.45, '#4f8a3e');
    }
    // KYMCO 民翔車業：朝大勇一街那面的 YAMAHA 直招與 Castrol 招牌
    {
      const k = seg(C, 1, 342, 347.5);
      // 側牆在區域 x = 0（s0 那端），往大勇一街是 -x
      k.plane(
        C.ROWT.vert('zbLB3yamaha', '#f4f2ee', '#c8282a', 'YAMAHA'),
        0.7,
        3.8,
        -0.45,
        6.6,
        3.2,
        0,
        { emissive: 0.3 }
      );
      k.plane(
        C.ROWT.vert('zbLB3yamaha', '#f4f2ee', '#c8282a', 'YAMAHA'),
        0.7,
        3.8,
        -0.45,
        6.6,
        3.2,
        Math.PI,
        {
          emissive: 0.3,
        }
      );
      k.box(-0.08, 0, 3.5, 4.6, 4.6, 7.4, '#2f8a4a', NC);
      k.plane(
        C.paint('Castrol 嘉實多', '#2f8a4a', '#ffffff', '機油', 2.7, 1.0),
        2.7,
        1.0,
        -0.09,
        4.05,
        6.0,
        -Math.PI / 2,
        {
          emissive: 0.3,
        }
      );
    }
    // 4 樓白格子磁磚：一樓古銅色鐵窗花、門口紅旗
    {
      const k = seg(C, 1, 347.5, 351),
        w = k.W;
      for (let x = 0.3; x < w - 0.2; x += 0.45)
        k.box(x, x + 0.05, 0.3, 2.3, -0.12, -0.06, '#7a5a32', NC);
      for (const y of [0.3, 1.3, 2.3])
        k.box(0.3, w - 0.3, y, y + 0.05, -0.12, -0.06, '#7a5a32', NC);
      k.cyl(w - 0.6, -0.9, 0.025, 0, 2.6, '#8a8d90', { seg: 4 });
      k.box(w - 0.6, w - 0.58, 1.6, 2.5, -0.9, 0.1, '#d8282a', NC);
    }
    // 杏好有仁兩戶：二樓窗上的紅瓦小雨遮、門口磚柱矮牆
    for (const [s0, s1] of [
      [385.5, 391],
      [391, 396.5],
    ]) {
      const k = seg(C, 1, s0, s1),
        w = k.W;
      k.box(0.3, w - 0.3, 5.6, 5.75, -0.7, 0, '#c0503a', NC);
      k.box(0.2, 0.7, 0, 1.3, -1.2, -0.7, '#c8a27a');
      k.box(0.7, w - 1.2, 0, 0.7, -1.15, -1.0, '#c8a27a');
    }
    // 新永賓理髮：理髮店旋轉燈
    {
      const k = seg(C, 1, 409.5, 414.5);
      k.cyl(0.4, -0.6, 0.14, 1.6, 2.6, '#f2f2ee', { seg: 10 });
      k.cyl(0.4, -0.6, 0.15, 1.9, 2.0, '#d8282a', { seg: 10 });
      k.cyl(0.4, -0.6, 0.15, 2.2, 2.3, '#2f5fb0', { seg: 10 });
    }
    // 7 號門口的塗鴉電箱
    {
      const k = seg(C, 1, 414.5, 425);
      k.box(0.3, 1.5, 0, 1.4, -1.15, -0.55, '#8aa88a');
    }

    // ---- 東北側 ----
    // 3～4 樓米黃舊樓一樓的管線
    {
      const k = seg(C, -1, 262, 267),
        w = k.W;
      for (const x of [1.4, 1.8, 3.6]) k.cyl(x, -0.2, 0.13, 1.0, 3.6, '#7a7c7e', { seg: 8 });
      k.box(2.2, 3.2, 2.6, 3.2, -0.3, -0.05, '#e8e8e4', NC);
      k.box(0.2, w - 0.2, 0, 1.6, -1.1, -0.3, '#5a7ab8');
    }
    // 白色方形雨棚：從一樓頂伸出來的大白盒子
    {
      const k = seg(C, -1, 275, 279),
        w = k.W;
      k.box(0.1, w - 0.4, 2.3, 4.4, -1.15, 0, '#f2f1ec');
      k.plane(
        C.paint('胖菓子', '#f2f1ec', '#3a3a3a', 'pan.guozi', 2.2, 0.8),
        2.2,
        0.8,
        (w - 0.3) / 2,
        3.3,
        -1.16,
        C.FRONT,
        {
          emissive: 0.2,
        }
      );
    }
    // 私巷口的藍綠色鐵門框
    {
      const k = seg(C, -1, 290.5, 293.5),
        w = k.W;
      for (const x of [0.15, w - 0.35]) k.box(x, x + 0.2, 0, 3.3, 0.2, 0.4, '#3a7a86');
      k.box(0.15, w - 0.15, 3.1, 3.4, 0.2, 0.4, '#3a7a86');
    }
    // 東角大樓門口：兩棵盆景松、紅白棋盤磚
    {
      const k = seg(C, -1, 344.2, 354.5),
        w = k.W;
      for (let i = 0; i * 0.6 < w - 0.3; i++)
        for (let j = 0; j < 2; j++)
          if ((i + j) % 2 === 0) {
            const x = i * 0.6,
              z = -1.2 + j * 0.6;
            k.box(x, Math.min(w, x + 0.6), 0.05, 0.07, z, z + 0.6, '#b8584a', {
              col: false,
              surface: true,
            });
          }
      pine(C, k, 2.0, -0.7);
      pine(C, k, w - 3.0, -0.7);
    }
    // 10 號拱廊大樓：一樓方柱、拱形楣與鑄鐵矮欄杆
    {
      const k = seg(C, -1, 378, 396),
        w = k.W,
        n = 4,
        bay = w / n;
      k.box(0, w, 2.6, 3.3, -0.3, 0, WT, NC);
      for (let j = 0; j <= n; j++) {
        const x = Math.min(w - 0.6, j * bay);
        k.box(x, x + 0.6, 0, 3.3, -0.6, 0, WT);
      }
      for (let j = 0; j < n; j++) {
        const x0 = j * bay + 0.6,
          x1 = (j + 1) * bay;
        // 拱：用幾塊漸低的板子疊出圓弧
        for (let q = 0; q < 6; q++) {
          const t = q / 6,
            dx = (x1 - x0) * 0.5 * (1 - Math.cos((t * Math.PI) / 2)),
            h = 0.5 * Math.sin(((1 - t) * Math.PI) / 2);
          k.box(x0 + dx * 0.9, x1 - dx * 0.9, 2.1 + h * 0.2, 2.6, -0.3, -0.05, WT, NC);
        }
        k.box(x0 + 0.1, x1 - 0.1, 0, 0.45, -0.4, -0.2, '#d8d6cf');
        for (let x = x0 + 0.2; x < x1 - 0.2; x += 0.25)
          k.box(x, x + 0.03, 0.45, 1.1, -0.32, -0.29, '#1e1e1f', NC);
        k.box(x0 + 0.1, x1 - 0.1, 1.08, 1.14, -0.33, -0.28, '#1e1e1f', NC);
      }
    }
    // 白色拱窗大樓：騎樓柱與前面一排綠籬
    {
      const k = seg(C, -1, 402, 416.5),
        w = k.W;
      for (const x of [0, w / 3, (2 * w) / 3, w - 0.6])
        k.box(x, x + 0.6, 0, 3.3, -0.5, 0, '#e8e6e0');
      k.box(0.6, w - 0.6, 0, 0.5, -1.1, -0.6, '#d8d6cf');
      for (let x = 0.9; x < w - 0.8; x += 0.9) ball(C, k, x, 0.85, -0.85, 0.5, '#4f7f3e', 0.8);
    }
  },
  // custom 佔的地：停車場車道兩邊的矮牆
  footprints(F) {
    return [F(R, 304.3, 308.5, 1, 4.3, 6, 0)];
  },
};
