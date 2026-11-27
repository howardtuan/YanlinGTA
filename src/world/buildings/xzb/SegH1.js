// 弘揚路 s 0～160（中山東路口往東北到大智街口）兩側：照 Google 街景（路口官方 2026-05；東南側 2025-05、西北側 2024-07，
// 力行北街口 s 136、148 兩點 2026-05）、國土測繪 2024 正射與 OSM 店家位置建模。2025-05 那組全景的拍攝點會差 3～8 m，
// 店家先後順序照照片，寬度用照片比例、側巷（振興街／協同街 s≈71.5、力行北街 s≈128、大智街 s≈156）位置與 OSM 店家點位互相對照。
//   東南側（+1）由西南到東北：清心福全轉角 3 樓灰色老樓（三樓「售 普仁首府」看板）→ 4 樓灰色老樓（睫作美睫館）→ 4 樓粉紅磁磚兩間（綠鐵皮雨遮）→
//     7 樓粉紅灰陽台公寓兩間（紅招牌看不清）→ 6 樓白磁磚凸窗公寓：灶腳排骨、YAMAHA 機車行、郁記廣東粥、小木屋鬆餅、轉角玻璃屋 →
//     振興街 → 有點東西（轉角咖啡）→ 向日葵早午餐 → 百貨批發量販店（7 樓）→ 阿福港式炸雞 → 天漫麵屋 → KYMCO 晉揚車業行 →
//     喵爪屋（夾娃娃機）→ 古早味魷魚羹專賣店 → 正高雄黑輪大王 → 鐵捲門一間 → 小雞食代（5 樓白磁磚圓弧轉角）→ 大智街（新資生藥局在 SegH2）
//   西北側（-1）由西南到東北：康聯藥局 6 樓白磁磚圓弧轉角樓 → 機車行（黃雨棚）→ 忠昇人力 → 蝦皮店到店 → 隨主飡法式水煮專賣 →
//     全家便利商店（5 樓紅磚、招牌橫跨兩間）→ 協同街 → 6 樓米色陽台公寓（綠白條紋雨棚）→ 5 樓灰樓（白色直招看不清）→
//     4 樓紅磚：SOON Hair Saloon、早餐店 → 3 樓灰綠老樓（頂樓綠色樓梯、學生電梯套房招牌）→ 4 樓白磁磚 → 7-ELEVEN（5 樓白磁磚）→
//     Hanji Club 地瓜俱樂部（5 樓磚紅圓弧轉角，一樓米白外牆、繞轉角一圈的米白弧形招牌帶；2026-05 換的，之前是紅柱餐廳）→ 力行北街 → Q Burger 轉角早午餐（白色陽傘、側牆漢堡大看板）→ 5 樓灰樓 →
//     4 樓磚紅兩間（招牌看不清）→ 三串窟 NAKED CLAMS（5 樓紅磚，做到 s 160 為止；右鄰一品香滷味歸 SegH2）
//   中山東路口兩個轉角樓由這段從弘揚路這側蓋整棟，格子從 H s 10（＝中山東路立面線，Z 中心線 10 m）開始，不伸進中山東路：
//     西北角康聯藥局：H s 10～20、深 7.7 m（佔 Z -1 側 s 735～742.7），面向中山東路的那面（藥局櫥窗、藍招牌、直招、窗）也在這裡的 custom 貼在 Z 立面線上；
//       SegZ3 的西北側（-1）只做到 Z s 725.7，Z s 725.7～735 的 swïter 詩威特、甜緣豆花甜作坊也由這段用 ref 'Z' 蓋（深 10 m，到 H s 20 為止，
//       後面接弘揚路這側的機車行）。
//     東南角清心福全：H s 10～21、深 13 m（佔 Z -1 側 s≈755.3～768.3），面向中山東路那面（清心福全綠招牌、1299 紅白招牌、鐵捲門）也在這裡，
//       SegZ4 的西北側（-1）從 Z s 768.3 開始。
//   東端：+1 到小雞食代 s 151 為止（大智街與新資生藥局歸 SegH2）；-1 三串窟做到 s 160，s 155～161 的填充樓 f2_367 由這段 hide。
//   有店面牆的填充樓列在 hide；原本 noShop 的 drop。看不清的招牌不放字（7 樓公寓的紅招牌、機車行的直招、Q Burger 旁的店…）。
const R = 'H',
  SR = 6.3, // 東南側（+1）立面離中心線
  SL = 6.3; // 西北側（-1）立面離中心線
const NC = { col: false };
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（-1 側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標），所以把寬度搬到 k.W、還原 k.w
const seg = (C, side, s0, s1, set, ref = R) => {
  const k = C.kit(ref, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  k.zo = (off) => off - set;
  return k;
};
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 10, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 圓錐（陽傘）：中心 (x, z)，傘面底在 y
const cone = (C, k, x, y, z, r, h, hex) => {
  const g = new C.THREE.ConeGeometry(r, h, 10, 1, true);
  g.translate(x, y + h / 2, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 招牌一塊：底板＋字（貼在 z 往街道那側）
const board = (C, k, text, bg, fg, sub, x0, x1, y0, y1, z, emissive = 0.3) => {
  const w = x1 - x0,
    h = y1 - y0;
  k.box(x0, x1, y0, y1, z, z + 0.15, bg, NC);
  k.plane(C.paint(text, bg, fg, sub, w, h), w, h, (x0 + x1) / 2, (y0 + y1) / 2, z - 0.01, C.FRONT, {
    emissive,
  });
};
// 一格街屋：[ref, s0, s1, side, spec]，set 沒寫就用 SR／SL
const E = (s0, s1, sp) => [R, s0, s1, 1, { set: SR, d: 14, ...sp }];
const W = (s0, s1, sp) => [R, s0, s1, -1, { set: SL, d: 14, ...sp }];
const WT = '#e9e8e3', // 白磁磚
  GT = '#dcdcd5', // 白磁磚格子（6 樓公寓）
  PK = '#dbb2ab', // 粉紅磁磚
  RB = '#a8604c', // 紅磚
  OG = '#9e9b94', // 灰色斑駁老樓
  BG = '#d9c9a8'; // 米色
const BLANK = '　　　'; // 看不清字的直招

export default {
  // 原本就 noShop 的填充樓
  drop: [
    'f2_682',
    'f2_677',
    'f2_498',
    'f2_497',
    'f2_494',
    'f2_492',
    'f2_489',
    'f1094',
    'f1101',
    'f1595',
    'f1596',
    'f1599',
    'f1601',
  ],
  // 有店面牆的填充樓（f1091、f1092、f2_685 是中山東路口的轉角樓，Z 的清單也有）
  hide: [
    // 西北側
    'f2_685',
    'f2_684',
    'f2_683',
    'f2_681',
    'f2_680',
    'f2_679',
    'f2_678',
    'f2_676',
    'f2_496',
    'f2_495',
    'f2_493',
    'f2_522',
    'f2_491',
    'f2_490',
    'f2_361',
    'f2_360',
    'f2_359',
    'f2_358',
    'f2_367',
    // 東南側
    'f1091',
    'f1092',
    'f1093',
    'f1095',
    'f1096',
    'f1097',
    'f1098',
    'f1099',
    'f1100',
    'f1594',
    'f1597',
    'f1598',
    'f1600',
    'f1602',
    'f1603',
    'f1604',
    'f1605',
  ],
  ownSign: [
    '康聯藥局',
    '蝦皮店到店',
    '隨主飡法式水煮專賣',
    '全家便利商店',
    'SOON Hair Saloon',
    '7-Eleven',
    'Q Burger',
    '三串窟',
    '灶腳排骨',
    '小木屋鬆餅',
    '有點東西',
    '阿福港式炸雞',
    'KYMCO 光陽機車',
    '古早味魷魚羹專賣店',
    '高雄黑輪大王',
    // 街景上沒有看到這兩家的招牌（早餐店沒掛招牌；力行北街口那間 2026-05 已換成 Hanji Club 地瓜俱樂部），不讓地圖另外掛
    '悠活早午餐',
    '麻子辣麻辣燙',
  ],
  lots: [
    // ================= 東南側（+1）=================
    // 清心福全轉角 3 樓灰色老樓：路口那一間是清心福全（綠招牌），往東北兩間綠鐵皮雨遮鐵捲門，三樓黃底「售 普仁首府」看板，頂樓鐵皮加蓋
    E(10, 14, {
      nf: 3,
      wall: OG,
      sign: ['清心福全', '#1f6a4a', '#ffffff'],
      ground: 'shop',
      door: 0,
      bal: 'grille',
      roof: 'shack',
      d: 13,
    }),
    E(14, 21, {
      nf: 3,
      wall: OG,
      awn: '#3f8a5e',
      ground: 'shutter',
      sh: '#9aa69a',
      noband: 1,
      bal: 'grille',
      roof: 'shack',
      d: 13,
    }),
    // 4 樓灰色斑駁老樓：綠鐵皮雨遮、鐵捲門，紅色直招「睫作美睫館 699」，騎樓邊政治看板
    E(21, 28.5, {
      nf: 4,
      wall: '#a19e96',
      awn: '#3f8a5e',
      ground: 'shutter',
      sh: '#3e4648',
      noband: 1,
      door: 0,
      vert: ['睫作美睫館', '#c8282a', '#ffffff'],
      bal: 'grille',
    }),
    // 4 樓粉紅磁磚兩間：一樓整排綠鐵皮雨遮、鐵捲門
    E(28.5, 33, {
      nf: 4,
      wall: PK,
      awn: '#3f8a5e',
      ground: 'shutter',
      sh: '#9a9a96',
      noband: 1,
      bal: 'plain',
    }),
    E(33, 37.5, {
      nf: 4,
      wall: PK,
      awn: '#3f8a5e',
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 7 樓粉紅灰陽台公寓：一樓紅色招牌、黃色直招（字都看不清）
    E(37.5, 42, {
      nf: 7,
      wall: '#d6bdb5',
      sign: [' ', '#c8282a', '#ffffff'],
      bal: 'open',
      roof: 'tank',
    }),
    E(42, 46.5, {
      nf: 7,
      wall: '#d6bdb5',
      sign: [' ', '#b8282a', '#ffffff'],
      vert: [BLANK, '#e8c22a', '#c8282a'],
      bal: 'open',
    }),
    // 6 樓白磁磚凸窗公寓（29～33 號）
    E(46.5, 51.25, {
      nf: 6,
      wall: GT,
      sign: ['灶腳排骨', '#c8282a', '#ffffff', '飯麵・便當・小菜'],
      ground: 'stall',
      bal: 'cage',
    }),
    E(51.25, 55.5, {
      nf: 6,
      wall: GT,
      sign: ['YAMAHA', '#f2f0ec', '#c8282a', '03-283…'],
      awn: ['#c8282a', '#f2f0ec'],
      ground: 'open',
      vert: ['YAMAHA', '#f2f0ec', '#c8282a'],
      bal: 'grille',
      roof: 'tank',
    }),
    E(55.5, 60, {
      nf: 6,
      wall: GT,
      sign: ['郁記 廣東粥', '#f2d23a', '#c8282a', '(03)437-4561'],
      awn: '#e2c25a',
      ground: 'stall',
      vert: ['郁記廣東粥', '#f2e8c8', '#c8282a'],
      bal: 'cage',
    }),
    E(60, 65.5, {
      nf: 6,
      wall: GT,
      sign: ['小木屋鬆餅', '#9a9c9e', '#e8e8e4'],
      ground: 'shutter',
      sh: '#b4b4b0',
      door: 0,
      bal: 'grille',
    }),
    // 振興街口的玻璃屋（藍色雨遮）
    E(65.5, 68.5, {
      nf: 6,
      wall: GT,
      ground: 'shop',
      awn: '#2a6a9a',
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 12,
    }),
    // ---- 振興街（s 68.5～75）----
    // 6 樓粉紅白磁磚公寓：轉角「有點東西」咖啡（落地窗、紅雨遮）、向日葵早午餐
    E(75, 80.5, {
      nf: 6,
      wall: '#e4cfc8',
      sign: ['有點東西', '#f4f2ee', '#2a3a5a'],
      awn: '#a8302a',
      ground: 'shop',
      door: 0,
      bal: 'cage',
      d: 12,
    }),
    E(80.5, 86, {
      nf: 6,
      wall: '#e4cfc8',
      sign: ['向日葵 早午餐', '#f2d23a', '#c8282a'],
      awn: '#f0efea',
      ground: 'open',
      bal: 'cage',
    }),
    // 7 樓白磁磚：百貨批發量販店（黃底紅字大招牌、黃色雨遮），二樓白底紅字直招
    E(86, 94, {
      nf: 7,
      wall: WT,
      sign: ['百貨批發量販店', '#f2d23a', '#c8282a', '批發零售 禮品贈品 電器文具 五金百貨'],
      awn: '#d8b84a',
      ground: 'stall',
      vert: ['百貨批發', '#f4f2ee', '#c8282a'],
      bal: 'cage',
      roof: 'tank',
    }),
    // 6 樓白磁磚公寓（43～58 號）
    E(94, 103, {
      nf: 6,
      wall: GT,
      sign: ['港式  阿福  炸雞', '#f2d23a', '#c8282a', '香雞排 鹽酥雞　　甜不辣 魷魚頭'],
      ground: 'shutter',
      sh: '#a8a8a4',
      vert: ['阿福港式炸雞', '#f2c230', '#c8282a'],
      bal: 'cage',
    }),
    E(103, 109.5, {
      nf: 6,
      wall: GT,
      sign: ['天漫麵屋', '#1e1e1f', '#d8a84a', '拉麵・丼飯'],
      ground: 'shutter',
      sh: '#5a5e62',
      door: 0,
      bal: 'cage',
    }),
    E(109.5, 115.5, {
      nf: 6,
      wall: GT,
      sign: ['KYMCO', '#d8282a', '#ffffff', '晉揚車業行'],
      ground: 'shutter',
      sh: '#6a7a8a',
      vert: ['KYMCO', '#d8282a', '#ffffff'],
      bal: 'cage',
      roof: 'tank',
    }),
    E(115.5, 120.5, {
      nf: 6,
      wall: GT,
      sign: ['喵爪屋', '#f2d86a', '#3a2a2a'],
      ground: 'open',
      door: 0,
      bal: 'cage',
    }),
    E(120.5, 125.5, {
      nf: 6,
      wall: GT,
      sign: ['古早味', '#e8efe8', '#1a1a1a', '魷魚羹專賣店 24H'],
      ground: 'shutter',
      sh: '#a8aaa8',
      bal: 'cage',
    }),
    E(125.5, 130.5, {
      nf: 6,
      wall: GT,
      sign: ['正 高雄黑輪大王', '#e8e2d2', '#1a1a1a'],
      awn: ['#c8282a', '#f2f0ec'],
      ground: 'shutter',
      sh: '#9a9a96',
      door: 0,
      vert: ['黑輪大王', '#1e1e1f', '#ffffff'],
      bal: 'cage',
    }),
    E(130.5, 137, {
      nf: 6,
      wall: GT,
      ground: 'shutter',
      sh: '#a4a6a4',
      noband: 1,
      bal: 'cage',
      roof: 'tank',
    }),
    // 小雞食代：5 樓白磁磚，大智街口圓弧轉角（圓角在 custom），黑底招牌、紅色圓形立體招牌、黑色柱子
    E(137, 142.5, {
      nf: 5,
      wall: WT,
      sign: ['小雞食代', '#1e1e1f', '#f2a83a', '03-4666894'],
      ground: 'shop',
      bal: 'plain',
    }),
    E(142.5, 148.5, {
      nf: 5,
      wall: WT,
      sign: ['小雞食代', '#1e1e1f', '#f2a83a'],
      ground: 'shop',
      door: 0,
      round: ['小雞', '#d8282a', '#ffffff'],
      bal: 'plain',
      d: 12,
    }),

    // ================= 西北側（-1）=================
    // 中山東路這面（ref 'Z'，-1 側）：swïter 詩威特（5 樓白磁磚，紫色招牌與直招）、甜緣豆花甜作坊（5 樓灰白磁磚，二樓房仲看板、紅燈籠）
    [
      'Z',
      725.7,
      730,
      -1,
      {
        set: 10,
        d: 10,
        nf: 5,
        wall: '#e6e4de',
        sign: ['swïter 詩威特', '#5a3a7a', '#ffffff', '肌膚美麗的專家'],
        ground: 'open',
        vert: ['詩威特', '#5a3a7a', '#ffffff'],
        bal: 'cage',
      },
    ],
    [
      'Z',
      730,
      735,
      -1,
      {
        set: 10,
        d: 10,
        nf: 5,
        wall: '#d8d6d0',
        sign: ['甜緣 豆花甜作坊', '#e4e0d8', '#5a4a3a'],
        ground: 'shop',
        door: 0,
        big: ['店面/住宅 468-9191', '#f2f0ea', '#c8282a'],
        bigFrom: 2,
        bigW: 3.6,
        bal: 'grille',
        roof: 'tank',
      },
    ],
    // 康聯藥局轉角樓：6 樓白磁磚（圓弧轉角在 custom）。弘揚路這面一樓是貼滿海報的鐵皮雨遮店面
    W(12.5, 20, {
      nf: 6,
      wall: WT,
      tin: 1,
      ground: 'shutter',
      sh: '#d6d4ce',
      noband: 1,
      door: 0,
      vert: ['康聯藥局', '#23308a', '#ffffff'],
      bal: 'grille',
      roof: 'tank',
      d: 7.7,
    }),
    // 5 樓白磁磚：機車行（黃色遮雨棚、黑色直招看不清）
    W(20, 27.5, {
      nf: 5,
      wall: WT,
      awn: '#d8b84a',
      ground: 'shutter',
      sh: '#8a8a86',
      noband: 1,
      vert: [BLANK, '#1e1e1f', '#f2d23a'],
      bal: 'plain',
    }),
    // 5 樓白磁磚：忠昇人力（黑招牌、藍色雨遮）
    W(27.5, 32, {
      nf: 5,
      wall: WT,
      sign: ['忠昇人力', '#1e1e1f', '#ffffff', '0923-309-231'],
      awn: '#2a7ac0',
      ground: 'shutter',
      sh: '#9a9c9e',
      door: 0,
      bal: 'plain',
    }),
    W(32, 38, {
      nf: 5,
      wall: '#e2e0da',
      sign: ['蝦皮店到店', '#e8402a', '#ffffff'],
      ground: 'shop',
      vert: ['蝦皮店到店', '#e8402a', '#ffffff'],
      bal: 'plain',
    }),
    // 隨主飡法式水煮專賣：藍色大招牌，騎樓口掛圓形藍色立體招牌
    W(38, 47, {
      nf: 5,
      wall: '#d4d4cf',
      sign: ['隨主飡 法式水煮專賣', '#2a4f9a', '#ffffff'],
      ground: 'shop',
      round: ['隨主飡', '#2a4f9a', '#b8e04a'],
      bal: 'plain',
      roof: 'tank',
    }),
    // 全家便利商店：5 樓紅磚，招牌橫跨兩間；西南那間一樓是冷氣室外機、鐵門
    W(47, 56, {
      nf: 5,
      wall: RB,
      sign: ['全家 FamilyMart', '#f4f4f0', '#2a5aa8', null, 'fam'],
      ground: 'gate',
      sh: '#5a5e62',
      bal: 'plain',
      d: 13,
    }),
    // 協同街斜接，長方形後角會壓進協同街：照正射東北牆退到 s 65、深 10 m（原本 s 66、深 11 m，壓進 2.1 m）
    W(56, 65, {
      nf: 5,
      wall: RB,
      sign: ['全家 FamilyMart', '#f4f4f0', '#2a5aa8', null, 'fam'],
      ground: 'shop',
      vert: ['FamilyMart', '#2fb34a', '#ffffff'],
      bal: 'plain',
      roof: 'tank',
      d: 10,
    }),
    // ---- 協同街（s 65～73）----
    // 6 樓米色陽台公寓：一樓綠白條紋雨棚（住家），巷口那頭綠色鐵捲門小店
    W(73, 79, {
      nf: 6,
      wall: BG,
      awn: ['#3f8a5e', '#f0efea'],
      ground: 'gate',
      sh: '#6a6e70',
      noband: 1,
      bal: 'open',
      d: 12,
    }),
    // 5 樓灰樓：鐵捲門、白色直招（看不清）
    W(79, 83.5, {
      nf: 5,
      wall: '#a9a8a2',
      ground: 'shutter',
      sh: '#9a9a96',
      noband: 1,
      door: 0,
      vert: [BLANK, '#f4f2ee', '#2a2a2a'],
      bal: 'glass',
      glass: '#3e4a55',
    }),
    // 4 樓紅磚（39 號）：SOON Hair Saloon（白色招牌）、早餐店
    W(83.5, 89, {
      nf: 4,
      wall: RB,
      sign: ['SOON', '#f4f2ee', '#3a3a3a', 'Hair Saloon'],
      ground: 'shop',
      bal: 'plain',
    }),
    W(89, 94.5, {
      nf: 4,
      wall: RB,
      ground: 'open',
      noband: 1,
      bal: 'plain',
      roof: 'tank',
    }),
    // 3 樓灰綠老樓（41 號）：藍色鐵捲門，頂樓綠色樓梯（custom），左鄰掛紅黃「學生電梯套房」招牌
    W(94.5, 100.5, {
      nf: 3,
      wall: '#8e9a92',
      ground: 'shutter',
      sh: '#3a5a7a',
      noband: 1,
      vert: ['學生電梯套房', '#c8282a', '#f2d23a'],
      bal: 'rail',
      roof: 'none',
    }),
    // 4 樓白磁磚：灰色鐵捲門
    W(100.5, 106, {
      nf: 4,
      wall: WT,
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      bal: 'open',
    }),
    // 7-ELEVEN（47 號）：5 樓白磁磚
    W(106, 115, {
      nf: 5,
      wall: '#e6e4de',
      sign: ['7-ELEVEN', '#ffffff', '#00843d', null, 'seven'],
      ground: 'shop',
      vert: ['7-ELEVEN', '#00843d', '#ffffff'],
      bal: 'open',
      roof: 'tank',
    }),
    // 力行北街口 Hanji Club 地瓜俱樂部（2026-05）：5 樓磚紅圓弧轉角（圓角與朝力行北街那面在 custom），
    // 一樓米白外牆、米白招牌帶深灰字、白鐵捲門
    W(115, 121, {
      nf: 5,
      wall: '#b5705c',
      low: '#e6dcc8',
      sign: ['Hanji Club', '#e6dcc6', '#3a3a3a', '地瓜俱樂部'],
      ground: 'shutter',
      sh: '#e4e4e0',
      door: 0,
      bal: 'plain',
      d: 13,
    }),
    // ---- 力行北街（s 123.5～133）----
    // Q Burger 轉角早午餐：3 樓白樓，一樓橘色招牌帶、白色陽傘（custom），朝力行北街的側牆是漢堡大看板（custom）
    W(133, 139.5, {
      nf: 3,
      wall: '#e8e6e0',
      sign: ['Q Burger', '#e8582a', '#ffffff'],
      ground: 'shop',
      door: 0,
      bal: 'plain',
      roof: 'none',
      d: 12,
    }),
    // 5 樓灰樓：黑色直招、紅色圓形招牌（字看不清）
    W(139.5, 144.5, {
      nf: 5,
      wall: '#b4b3ad',
      ground: 'shop',
      noband: 1,
      vert: [BLANK, '#1e1e1f', '#e8e8e4'],
      round: [' ', '#d8282a', '#ffffff'],
      bal: 'plain',
    }),
    // 4 樓磚紅兩間：白底招牌（字看不清），左邊直立白藍招牌
    W(144.5, 150, {
      nf: 4,
      wall: '#a8705e',
      sign: [' ', '#eeeeea', '#2a3a5a'],
      awn: '#e8e0c8',
      ground: 'shop',
      vert: [BLANK, '#f2f2ee', '#2a5aa8'],
      bal: 'plain',
    }),
    W(150, 155.5, {
      nf: 4,
      wall: '#a8705e',
      sign: [' ', '#e8eef4', '#2a4a8a'],
      awn: '#e8e0c8',
      ground: 'shop',
      door: 0,
      bal: 'plain',
      roof: 'tank',
    }),
    // 三串窟 NAKED CLAMS（63 號）：5 樓紅磚，白底綠字招牌、綠色雨遮
    W(155.5, 160, {
      nf: 5,
      wall: RB,
      sign: ['三串窟', '#f4f2ee', '#3a6a4a', '彰化溫血海鮮蚵仔麵線'],
      awn: '#5a8a6a',
      ground: 'shutter',
      sh: '#8a8c8e',
      door: 0,
      bal: 'plain',
    }),
  ],
  custom(C) {
    const { FRONT, paint, win } = C;
    // ---- 中山東路口：康聯藥局（西北角）----
    // 圓弧轉角（H s 10～12.5）：白磁磚圓柱，一樓上緣一圈藍色康聯藥局招牌帶
    {
      const k = seg(C, -1, 10, 12.5, SL),
        r = 2.5,
        top = 3.3 + 5 * 3.0;
      k.cyl(0, r, r, 0, top, WT, { seg: 20, col: true });
      k.box(0, r, 0, top, r, 7.7, WT);
      for (let f = 1; f < 6; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.cyl(0, r, r + 0.03, y + 0.9, y + 2.1, '#59636b', { seg: 20 });
      }
      k.cyl(0, r, r + 0.25, 3.3 - 0.85, 3.3 - 0.05, '#23308a', { seg: 20 });
      k.cyl(0, r, r + 0.1, top, top + 0.12, '#cfcdc6', { seg: 20 });
    }
    // 面向中山東路的那面（Z -1 側 s 735～740.2，貼在 Z 立面線上）：藥局櫥窗、藍色康聯藥局招牌、直招、綠十字、樓上窗
    {
      const k = seg(C, -1, 735, 740.2, 9.95, 'Z'),
        w = k.W;
      C.shopGlass(k, 0.3, w - 0.3, 0, 2.3, C.openTex, -0.04);
      board(C, k, '康聯藥局', '#23308a', '#ffffff', null, 0.2, w - 0.2, 2.45, 3.25, -0.3);
      board(C, k, '杏輝專櫃', '#f4f2ee', '#23308a', null, 1.6, 2.4, 0.2, 2.2, -0.45, 0.2);
      for (const sd of [-1, 1])
        k.plane(
          C.ROWT.vert('zb康聯藥局#23308a', '#23308a', '#ffffff', '康聯藥局'),
          0.7,
          3.2,
          w - 1.2 + sd * 0.04,
          5.6,
          -0.6,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.box(w - 1.6, w - 0.9, 3.7, 4.4, -0.3, -0.05, '#2f9a56', NC); // 綠十字燈箱
      k.plane(
        paint('＋', '#2f9a56', '#ffffff', null, 0.7, 0.7),
        0.7,
        0.7,
        w - 1.25,
        4.05,
        -0.31,
        FRONT,
        {
          emissive: 0.4,
        }
      );
      for (let f = 1; f < 6; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        for (const x of [1.4, 3.8]) win(k, x, y + 1.5, 1.8, 1.4, true);
      }
    }
    // ---- 中山東路口：清心福全（東南角）----
    // 面向中山東路那面（Z -1 側 s 755.3～768.3）：路口清心福全綠招牌、紅白「1299 999」招牌、鐵捲門，二三樓鐵窗
    {
      const k = seg(C, -1, 755.3, 768.3, 9.95, 'Z'),
        w = k.W;
      C.shopGlass(k, w - 4.0, w - 0.3, 0, 2.3, C.openTex, -0.04);
      board(C, k, '清心福全', '#1f6a4a', '#ffffff', null, w - 4.2, w - 0.1, 2.45, 3.25, -0.3);
      board(C, k, '1299  999', '#f4f2ee', '#c8282a', null, w - 8.5, w - 4.3, 2.45, 3.25, -0.3);
      k.plane(C.shutterTex('#9a9c9e'), 3.8, 2.3, w - 6.4, 1.15, -0.03, FRONT);
      k.plane(C.shutterTex('#8a8c8e'), 3.4, 2.3, 2.4, 1.15, -0.03, FRONT);
      for (let f = 1; f < 3; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        for (const x of [2.2, 6.2, 10.4]) win(k, x, y + 1.5, 2.2, 1.3, true);
      }
      k.box(0.3, w - 0.3, 3.3 + 2.4, 3.3 + 2.5, -1.0, 0, '#8e9294', NC); // 二樓鐵窗下的遮雨板
    }
    // ---- 東南側 ----
    // 清心福全那棟三樓的黃底「售 普仁首府」看板（s 14～21 那格，偏西南）
    {
      const k = seg(C, 1, 14, 21, SR);
      board(
        C,
        k,
        '售 普仁首府',
        '#f2e04a',
        '#c8282a',
        '69~71坪 面寬6.2米 電梯別墅',
        1.2,
        4.6,
        6.6,
        8.6,
        -0.2,
        0.15
      );
    }
    // 小雞食代圓弧轉角（s 148.5～151）：白磁磚圓柱、一樓一圈黑色招牌帶、黑色柱子
    {
      const k = seg(C, 1, 148.5, 151, SR),
        r = 2.5,
        top = 3.3 + 4 * 3.0;
      k.cyl(0, r, r, 0, top, WT, { seg: 20, col: true });
      k.box(0, r, 0, top, r, 12, WT);
      for (let f = 1; f < 5; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.cyl(0, r, r + 0.03, y + 0.9, y + 2.1, '#59636b', { seg: 20 });
      }
      k.cyl(0, r, r + 0.25, 3.3 - 0.85, 3.3 - 0.05, '#1e1e1f', { seg: 20 });
      k.cyl(0, r, r + 0.1, top, top + 0.12, '#cfcdc6', { seg: 20 });
      k.cyl(1.95, 0.55, 0.22, 0, 2.5, '#1e1e1f', { seg: 8 }); // 轉角黑柱
    }
    {
      // 小雞食代騎樓的黑色柱子、門口盆栽
      const k = seg(C, 1, 137, 148.5, SR),
        w = k.W;
      for (const x of [0.3, 5.6, w - 0.4]) k.box(x - 0.25, x + 0.25, 0, 2.5, -0.5, 0, '#1e1e1f');
      for (const x of [2.0, 8.0]) {
        k.cyl(x, -0.9, 0.25, 0, 0.45, '#8a5a3a', { seg: 8 });
        ball(C, k, x, 0.85, -0.9, 0.45, '#4c7d3a', 1.1);
      }
    }
    // ---- 西北側 ----
    // 力行北街口 Hanji Club 的圓弧轉角（s 121～123.5）：樓上磚紅圓柱，一樓米白、上緣一圈米白弧形招牌帶
    {
      const k = seg(C, -1, 121, 123.5, SL),
        r = 2.5,
        top = 3.3 + 4 * 3.0;
      k.cyl(r, r, r, 0, top, '#b5705c', { seg: 20, col: true });
      k.box(0, r, 0, top, r, 13, '#b5705c');
      for (let f = 1; f < 5; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.cyl(r, r, r + 0.03, y + 0.9, y + 2.1, '#4e585e', { seg: 20 });
      }
      k.cyl(r, r, r + 0.05, 0, 2.4, '#e6dcc8', { seg: 20 });
      k.cyl(r, r, r + 0.3, 2.45, 3.25, '#e6dcc6', { seg: 20 });
      k.box(-0.3, 0, 2.45, 3.25, r, 13, '#e6dcc6', NC); // 招牌帶接到力行北街那面
      // 轉角弧面上的招牌字（斜 45° 貼一塊）
      k.plane(
        paint('Hanji Club', '#e6dcc6', '#3a3a3a', '地瓜俱樂部', 2.6, 0.78),
        2.6,
        0.78,
        r - (r + 0.32) * Math.SQRT1_2,
        2.85,
        r - (r + 0.32) * Math.SQRT1_2,
        -Math.PI * 0.75,
        { emissive: 0.15 }
      );
      // 朝力行北街那面（區域 x = 0、面向 -x）：米白外牆、白鐵捲門、招牌、盆栽
      k.box(-0.08, 0, 0, 2.45, r, 12.5, '#e6dcc8', NC);
      k.plane(C.shutterTex('#e4e4e0'), 4.6, 2.2, -0.1, 1.15, r + 3.2, -Math.PI / 2);
      k.plane(
        paint('Hanji Club', '#e6dcc6', '#3a3a3a', '地瓜俱樂部', 6.0, 0.78),
        6.0,
        0.78,
        -0.32,
        2.85,
        r + 4.0,
        -Math.PI / 2,
        { emissive: 0.15 }
      );
      for (const z of [r + 0.3, r + 2.2, r + 4.6, r + 6.0]) {
        k.cyl(-0.7, z, 0.3, 0, 0.55, '#8a8a86', { seg: 10 });
        ball(C, k, -0.7, 0.95, z, 0.5, '#4c7d3a', 1.0);
      }
      k.cyl(r, r, r + 0.1, top, top + 0.12, '#cfcdc6', { seg: 20 });
    }
    // 3 樓灰綠老樓頂樓的綠色樓梯與欄杆
    {
      const k = seg(C, -1, 94.5, 100.5, SL),
        w = k.W,
        top = 3.3 + 2 * 3.0;
      k.box(0.3, w - 0.3, top + 0.12, top + 1.1, -0.05, 0.05, '#c9cfcc', NC);
      for (let j = 0; j < 8; j++)
        k.box(
          w - 3.2 + j * 0.3,
          w - 2.9 + j * 0.3,
          top + 0.12,
          top + 0.4 + j * 0.3,
          0.3,
          1.5,
          '#3aa58a',
          NC
        );
      k.box(0.3, w - 0.3, top + 2.5, top + 2.6, 0.2, 2.0, '#d8dcd8', NC);
    }
    // Q Burger：白色陽傘兩支、騎樓矮牆，朝力行北街的側牆是漢堡大看板
    {
      const k = seg(C, -1, 133, 139.5, SL),
        w = k.W;
      k.box(0.2, w, 0, 0.9, -1.4, -1.25, '#e8e6e0'); // 白色矮牆
      for (const x of [2.0, 4.6]) {
        k.cyl(x, -0.6, 0.04, 0, 2.3, '#8a8d90', { seg: 6 });
        cone(C, k, x, 2.0, -0.6, 1.3, 0.6, '#f2f0ea');
      }
      // 側牆看板（s0 那頭＝區域 x = w，朝力行北街）
      k.box(w, w + 0.15, 4.0, 9.0, 1.0, 10.0, '#f4f2ee', NC);
      k.plane(
        paint('Q Burger', '#f4f2ee', '#e8582a', '早午餐', 8.4, 4.4),
        8.4,
        4.4,
        w + 0.17,
        6.5,
        5.5,
        Math.PI / 2,
        { emissive: 0.15 }
      );
      ball(C, k, w + 0.4, 7.6, 8.0, 1.0, '#d89a4a', 0.45); // 漢堡（上面的麵包）
      ball(C, k, w + 0.35, 7.0, 8.0, 0.95, '#6a3a22', 0.25); // 肉排
      ball(C, k, w + 0.4, 6.55, 8.0, 0.95, '#d89a4a', 0.3); // 下面的麵包
    }
  },
  // custom 佔的地
  footprints(F) {
    return [
      F(R, 10, 12.5, -1, SL, 7.7, 0), // 康聯藥局圓角
      F(R, 148.5, 151, 1, SR, 12, 0), // 小雞食代圓角
      F(R, 121, 123.5, -1, SL, 13, 0), // Hanji Club 圓角
    ];
  },
};
