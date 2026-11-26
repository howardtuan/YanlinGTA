// 大仁四街兩側（參考線 'D4'，s=0 在大仁街口往西南走，s≈44.6 大仁五街從西北側接進來，終點 s≈90.5 是實踐路口；路寬 5 m）。
// 照 Google 街景官方 2026-05（巷內整條都有）與國土測繪 2024 正射建模，店家先後順序照照片、寬度照照片換算與原本夜市補建量體的分戶線，
// 店名對照 data/cycu.json 的 POI（照片在 side-session-notes 的 zs-sv/D34/）。
//   東南側（-1、照片 _L）由大仁街往實踐路：B.M.W Big Mouth Woman（四樓灰磁磚舊公寓，黑色鐵捲門）→ 獨品滷肉飯（木頭招牌）→
//     小撫州江西炒粉（紅招牌）→ 素怡園素食自助餐 → 小店（門口一棵樹）→ 全家便利商店中壢新仁店（兩間寬，二樓藍色條紋雨遮）→
//     學仕特髮型 Master（樓梯口）→ 紅磚五樓兩間（可印客製、髮戲 DRAMA HAIR 的樓梯口與直立招牌）→ 安師傅冰火菠蘿／一番賞 →
//     怪獸玩模（青綠招牌，二樓小尾巴美甲工作室）→ 灰色帆布雨遮的外送店（外送專線 0989-694-072，門口木頭小攤）
//   西北側（+1、照片 _R）：大仁街口到 s 23 是 src/world/buildings/StreetDarenFill.js（童裝、925 SILVER、傑威手機那棟五層公寓）；
//     s 24.7～42.8 是大仁五街東北角那棟五層公寓（src/world/buildings/StreetDaren5.js，山牆上「瘋狂扭蛋樂園」大招牌，立面離這條中心線 8.3 m），
//     它前面這裡只補一樓的菓點子鮮果茶（一層店面，帆布雨棚，頂不高過扭蛋樂園招牌）；s 42.8～48 是大仁五街口；
//     s 48～63.9 是大仁五街西南角的六層圓角樓（StreetDaren5.js，打鏢 HITDARTS）；s 64～75.9 補：窄三樓（白帆布雨遮、綠色帆布罩）→
//     林記古意奶茶（中原商圈招牌）→ 馥鄉蛋包飯（直立招牌）
// 兩端轉角不在這個檔：
//   大仁街口兩角（s 0～14：-1 的董記牛肉麵、超會呷在地小吃、大雞排；+1 的旺刈包）是 src/world/buildings/StreetDaren.js 的大仁街街屋；
//   實踐路口兩角（+1 s 75.9 起、-1 s 67.4 起）是 src/world/buildings/shijian/S1.js。
// 原本兩側是 src/world/buildings/NightMarketFill.js 照正射補的通用量體（nm2～nm15，都有店面牆）：一律放 hide，資料留著、全圖亂數不變。
//   其中 nm15（+1 s 27～41、4 樓）蓋在大仁五街轉角公寓的山牆前面、擋住扭蛋樂園招牌，實景那裡只有一樓店面，所以也藏起來。
// 看不清的招牌不放字。
const R = 'D4';
const NC = { col: false };
const seg = (C, side, s0, s1, set = 3.8) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  return k;
};
const OLD = '#c9c8c0', // 舊公寓的灰白磁磚
  RB = '#a8604c'; // 紅磚

const E = (s0, s1, sp) => [R, s0, s1, -1, { d: 13, ...sp }];
const W = (s0, s1, sp) => [R, s0, s1, 1, { d: 11, ...sp }];

export default {
  // 夜市補建（NightMarketFill.js）在大仁四街兩側的量體，都有店面牆
  hide: [
    // 東南側 s 14.3～68
    'nm2',
    'nm3',
    'nm4',
    'nm5',
    'nm6',
    'nm10',
    'nm11',
    'nm12',
    'nm13',
    'nm14',
    // 西北側：大仁五街轉角公寓山牆前面那條（s 27～41）、實踐路口前三棟（s 64～77）
    'nm15',
    'nm7',
    'nm8',
    'nm9',
  ],
  ownSign: [
    '獨品滷肉飯',
    '素怡園素食自助餐',
    '全家便利商店',
    '菓點子',
    '可印客製',
    '髮戲DRAMA HAIR',
    '安師傅 冰火菠蘿',
    '怪獸玩模',
    '林記古意奶茶',
    '馥鄉蛋包飯',
  ],
  lots: [
    // ================= 東南側（-1）=================
    // B.M.W Big Mouth Woman：四樓灰白舊公寓，黑色鐵捲門，白底小招牌（黃色燈箱掛在大仁街那頭的二樓，不重複放）
    E(14, 17.5, {
      nf: 4,
      wall: OLD,
      sign: ['B.M.W Big Mouth Woman', '#f2f0ea', '#2a2a2a'],
      ground: 'shutter',
      sh: '#3a3a3a',
      door: 0,
      bal: 'cage',
    }),
    // 獨品滷肉飯：木頭招牌、圓形側招
    E(17.5, 21, {
      nf: 4,
      wall: OLD,
      sign: ['獨品 滷肉飯專賣店', '#6a4a32', '#f4e8d4'],
      round: ['獨品', '#f4f2ee', '#2a2a2a'],
      ground: 'shop',
      bal: 'cage',
    }),
    // 小撫州 江西炒粉：紅底白字
    E(21, 25.5, {
      nf: 4,
      wall: OLD,
      sign: ['小撫州 江西炒粉', '#d8323a', '#ffffff'],
      ground: 'shop',
      bal: 'cage',
    }),
    // 素怡園素食自助餐：整面玻璃，紅色直立招牌
    E(25.5, 29.5, {
      nf: 4,
      wall: OLD,
      sign: ['素怡園 素食自助餐', '#e8e4d8', '#3a5a3a'],
      vert: ['素食館', '#b8282a', '#ffffff'],
      ground: 'shop',
      bal: 'cage',
    }),
    // 小店，門口一棵樹（招牌看不清）
    E(29.5, 32.5, { nf: 4, wall: OLD, ground: 'shop', noband: 1, bal: 'cage' }),
    // 全家便利商店 中壢新仁店：兩間寬，樓上木板加蓋與藍色條紋雨遮
    E(32.5, 38, {
      nf: 4,
      wall: OLD,
      sign: ['全家 FamilyMart', '#0a9d58', '#ffffff', '中壢新仁店'],
      ground: 'shop',
      door: 0,
      bal: 'cage',
      hood: '#3a6ab0',
    }),
    E(38, 43, {
      nf: 4,
      wall: OLD,
      sign: ['全家 FamilyMart', '#0a9d58', '#ffffff', '中壢新仁店'],
      ground: 'shop',
      bal: 'cage',
      hood: '#3a6ab0',
    }),
    // 學仕特髮型 Master：藍底招牌，樓梯口
    E(43, 46, {
      nf: 4,
      wall: '#bdb9b0',
      sign: ['學仕特髮型 Master', '#2f6fc0', '#ffffff', '剪燙染護造型大師'],
      ground: 'gate',
      sh: '#5a5a58',
      bal: 'cage',
    }),
    // 紅磚五樓：可印客製（白底招牌）
    E(46, 50.5, {
      nf: 5,
      wall: RB,
      sign: ['可印客製', '#f4f2ee', '#3a3a3a'],
      ground: 'shutter',
      sh: '#b8b4aa',
      bal: 'glass',
      glass: RB,
    }),
    // 紅磚五樓：髮戲 DRAMA HAIR 的樓梯口與直立招牌，鐵捲門
    E(50.5, 54, {
      nf: 5,
      wall: RB,
      vert: ['髮戲', '#2a2626', '#f2e6d0'],
      ground: 'gate',
      sh: '#c4c0b8',
      noband: 1,
      bal: 'plain',
    }),
    // 安師傅 冰火菠蘿（黃色招牌）／一番賞（藍色招牌）
    E(54, 58, {
      nf: 4,
      wall: '#d8d2c6',
      sign: ['安師傅 冰火菠蘿', '#f2d23a', '#2a4a9a'],
      sign2: ['一番賞', '#2f6f8f', '#ffffff'],
      ground: 'shutter',
      sh: '#d6d4cf',
      bal: 'plain',
    }),
    // 怪獸玩模：青綠招牌；二樓小尾巴美甲工作室
    E(58, 62, {
      nf: 4,
      wall: '#dcd8cf',
      sign: ['怪獸玩模 一番賞・GK雕像', '#5ab8c8', '#1a2a3a'],
      sign2: ['小尾巴美甲工作室', '#f4f2ee', '#2a5a9a'],
      ground: 'shop',
      bal: 'plain',
    }),
    // 灰色帆布雨遮的外送店（雨遮上的字看不清），深綠色鐵捲門
    E(62, 67.4, {
      nf: 3,
      wall: '#cfd2d4',
      sign: ['外送專線：0989-694-072', '#2a2a2a', '#f2c230'],
      awn: '#5a5c5e',
      ground: 'shutter',
      sh: '#2f5a5a',
      bal: 'plain',
      roof: 'shack',
    }),

    // ================= 西北側（+1）=================
    // 菓點子 鮮果茶：大仁五街轉角公寓前的一層店面（後面是 StreetDaren5.js 的公寓山牆，離中心線 8.3 m）
    W(29, 37, {
      nf: 1,
      gf: 3.3,
      d: 4.2,
      wall: '#d8d2c4',
      sign: ['菓點子 鮮果茶', '#4f8a80', '#ffffff', 'FRESH JUICE & TEA'],
      ground: 'shop',
      roofCol: '#6a6c6e',
    }),
    // 窄三樓：白帆布雨遮，門口綠色帆布罩著的攤車
    W(64, 66.5, {
      nf: 3,
      wall: '#e4e2dc',
      ground: 'shutter',
      sh: '#6a6a6a',
      awn: '#eeeeea',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 林記古意奶茶：黑底招牌（上緣一行小字「中原商圈」）
    W(66.5, 71, {
      nf: 4,
      wall: '#e8e6e0',
      sign: ['林記 古意奶茶', '#2a2a2a', '#f0e6c8', '中原商圈'],
      ground: 'shop',
      bal: 'grille',
    }),
    // 馥鄉蛋包飯：直立招牌、霓虹燈
    W(71, 75.9, {
      nf: 4,
      wall: '#e4e2dc',
      sign: ['馥鄉蛋包飯', '#c8382a', '#ffffff'],
      vert: ['蛋包飯', '#d8a030', '#7a1a1a'],
      ground: 'shop',
      bal: 'grille',
    }),
  ],

  custom(C) {
    // 菓點子門口的木頭欄杆
    {
      const k = seg(C, 1, 29, 37);
      for (let x = 0.2; x < k.W; x += 1.3) k.box(x, x + 0.08, 0, 0.9, -1.15, -1.07, '#7a5a3a', NC);
      k.box(0.2, k.W - 0.2, 0.85, 0.93, -1.16, -1.06, '#7a5a3a', NC);
    }
    // 外送店門口的木頭小攤（像小木屋）
    {
      const k = seg(C, -1, 62, 67.4);
      k.box(0.6, 2.1, 0, 1.6, -1.2, -0.2, '#b08a5a');
      k.box(0.45, 2.25, 1.6, 1.75, -1.3, -0.1, '#8a6a42', NC);
    }
  },
};
