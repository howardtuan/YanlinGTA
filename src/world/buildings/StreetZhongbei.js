import { shrinkFont } from '../../graphics/FitText.js';
// 中北路兩側的街屋（照 Google 街景 2026-05 / 2024-08 與 OSM 店名建模，只做外觀，不能進入）。
// 寫法比照 src/world/Interiors.js 的 DAREN_ST：每一格是 [s0, s1, side, spec]
//   s = 沿 ZB_ROAD 從正門端往西量的公尺數；side +1 = 茶學苑側（往西走的右手邊，遊戲 z 較小），-1 = 大仁街側
//   spec：nf 樓層、gf 一樓高、fh 樓高、d 深度、wall（WALL 鍵或 #hex）、low 一樓外牆 #hex、sign [字, 底, 字色, 小字, 樣式]、
//   ground 'shop'|'shutter'|'gate'|'open'|'stall'、sh 鐵捲門顏色、awn 雨棚 #hex 或 [色1, 色2] 條紋、
//   bal 'cage'|'grille'|'open'|'rail'|'glass'|'arch'|'plain'、glass 帷幕玻璃色、hood 窗罩色、
//   vert [字, 底, 字色] 直立招牌、round [字, 底, 字色] 圓形側招、banner [字, 底, 字色] 布條、
//   roof 'shack'|'tank'|'bill'、bill [字, 底, 字色, 寬, 高]、tin 鐵皮雨遮、arch 粉紅拱形女兒牆、fins 直條鰭板色、
//   big [字, 底, 字色] 樓上整面帆布（bigFrom 從第幾樓、bigW 寬度、bigAt 水平位置）、sign2 二樓橫招、noband 不畫一樓招牌帶、roofCol 鐵皮屋頂色、door 0 沒有樓梯門、tower {nf, back, wall, balc} 裙樓上方的退縮住宅塔、bikes 騎樓機車數、
//   set 立面離路中心線的距離（預設依路段）
// 每一格自成一個 Kit，立面對著街道；收尾用 finishRow 一次合併。
// 這個檔案不 import src/world/Interiors.js（它要用的 Kit、材質、貼圖工具都由 src/world/Interiors.js 呼叫 buildZhongbeiStreet 時從 X 傳進來），
// src/world/zones/Zones.js 直接 import 這裡的 ZB_ST.drop 與 zbFootprints() 來刪填充樓、保留空地。

export const ZB_ROAD = [
  [-209.2, 85.4],
  [-225.2, 90.3],
  [-231.9, 93.3],
  [-271.0, 108.1],
  [-287.9, 114.5],
  [-331.5, 130.4],
  [-470.8, 181.4],
  [-517.7, 196.9],
  [-533.0, 202.4],
  [-618.3, 236.2],
  [-624.7, 237.8],
  [-704.4, 268.5],
  [-728.6, 276.1],
  [-930.2, 369.4],
];
// 路寬的一半（tools/roads.json / cycu.json）：中北路 8.5、橋 7、橋西 9、中北路二段 13
const halfAt = (s) => (s < 328 ? 4.25 : s < 345 ? 3.5 : s < 528 ? 4.5 : 6.5);
// 立面離中心線：街景量到正門段 6.0～6.3 m，實踐路以西約 6.6，二段約 8.6
const setAt = (s) => (s < 130 ? 6.1 : s < 345 ? 6.6 : s < 528 ? 6.6 : 8.6);

export const ZB_ST = {
  ownSign: [
    '7-Eleven',
    '仁愛眼鏡',
    '寶雅',
    '家樂福超市',
    '遠傳電信',
    '開源社香雞排',
    '三顧茅廬麻辣滷味',
    '馬來一哥',
    '海口鮮魚湯/朋淇早午餐',
    '脆皮臭豆腐',
    '大腸包小腸',
    '巨林美而美',
    '笨港朝天雞',
    '阿秋鹹粥',
    '圓環肉羹',
    '夢工場照相館',
    '羽之鍋',
    'nafishop',
    '晶澈BTP',
    '功夫茶 KUNGFUTEA',
    '路邊烤肉wildbbq',
    '可不可熟成紅茶',
    '三井3C',
    '年青人眼鏡',
    '八方雲集',
    '酉客棧 유주막 U Chicken Bistro',
  ], // 街屋自己掛招牌的店名，POI 不再另外掛
  drop: [
    'f1179',
    'f1471',
    'f1472',
    'f1473',
    'f1477',
    'f1478',
    'f1479',
    'f1480',
    'f1481',
    'f1482',
    'f1483',
    'f1505',
    'f1506',
    'f1525',
    'f2_224',
    'f2_225',
    'f2_226',
    'f2_231',
    'f2_232',
    'f2_233',
    'f2_234',
    'f2_235',
    'f2_236',
    'f2_237',
    'f2_238',
    'f2_239',
    'f2_240',
    'f2_241',
    'f2_242',
    'f2_266',
    'f2_267', // 寶雅東側那棟的後半（noShop）
    'f2_459',
    'f2_460',
    'f2_461',
    'f2_462',
    'f2_463',
    'f2_464',
    'f2_872',
    'f2_873',
    'f2_874',
    'f2_875',
    'f2_876',
    'f2_877',
    'f2_878',
    'f2_879',
    'f2_880',
    'f2_881',
    'f2_882',
    'f2_883',
    'f2_884',
    'f2_885',
    'f2_886',
    'f2_887',
    'f2_888',
    'f2_889',
    'f2_890',
    'f2_891',
    'f2_892',
    'f2_893',
    'f2_894',
    'f2_895',
    'f2_896',
    'f2_897',
    'f866',
    'f870',
    'f885',
    'f886',
    'f887',
    'f888',
    'f892',
    'f893',
    'f894',
    'f895',
    'f896',
    'f897',
    'f898',
    'f900',
    'f901',
    'f902',
    'f903',
    'f904',
    'f905',
    'f906',
    'f907',
    'f908',
    'f909',
  ], // 這些格子蓋掉的通用填充樓（檢查腳本算出來的）
  // 中原國小沿路的圍牆 [s0, s1, side]：洗石子花台、紅磚方柱、黑色鐵欄杆、灌木與大樹（校門 s≈245～262 與 s≈200～208 的側門留開口）
  fences: [
    [141.5, 200, -1],
    [208, 245, -1],
    [262, 271.4, -1],
  ],
  lots: [
    // ---- 大仁街側（S，往西走的左手邊）----
    // S1 藍色美而美之後到大仁五街（2026-05）
    [
      36.2,
      40,
      -1,
      {
        nf: 3,
        wall: 'grime',
        sign: ['Pàspi', '#ffffff', '#e0663a', 'Italian Pasta'],
        ground: 'shop',
        bal: 'grille',
        banner: ['會員獨享', '#d8282f', '#ffffff'],
        roof: 'tank',
        d: 8,
      },
    ],
    [40, 45, -1, { nf: 4, wall: '#cfccc4', ground: 'shutter', sh: '#8d9094', bal: 'plain', d: 8 }],
    [
      45,
      50,
      -1,
      {
        nf: 4,
        wall: '#eeeeea',
        sign: ['UG', '#2f7a4f', '#ffffff', 'UNI GREEN'],
        ground: 'shop',
        bal: 'grille',
        round: ['UG', '#2f7a4f', '#ffffff'],
        d: 8,
      },
    ],
    [
      50,
      57.4,
      -1,
      {
        nf: 2,
        wall: 'grime',
        sign: ['路邊烤肉', '#ffffff', '#111111'],
        vert: ['路邊烤肉', '#ffffff', '#111111'],
        ground: 'shutter',
        sh: '#4a4e52',
        bal: 'grille',
        banner: ['外帶 烤肉', '#d42a1f', '#ffffff'],
        roof: 'tank',
        d: 8,
      },
    ],
    [
      57.4,
      60.4,
      -1,
      {
        nf: 3,
        wall: '#8f8b84',
        sign: ['大展駕訓班', '#f2d02a', '#d42a1f'],
        ground: 'stall',
        bal: 'plain',
        d: 6,
      },
    ],
    // S2 大仁五街到實踐路（2026-05）
    [
      68.4,
      75,
      -1,
      {
        nf: 3,
        wall: '#5a5048',
        low: '#8a8278',
        sign: ['非凡比驗光所', '#e8e6e0', '#3a3a3a', 'OPTICAL.1998'],
        vert: ['非凡比', '#4a3228', '#ffffff'],
        ground: 'shop',
        bal: 'rail',
        d: 8,
      },
    ],
    [
      75,
      80,
      -1,
      {
        nf: 3,
        wall: '#d8d4cc',
        sign: ['大無敵', '#9c3b2a', '#ffffff', '烤肉飯'],
        round: ['烤肉飯', '#d32f2f', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        banner: ['烤肉飯 便當', '#d32f2f', '#ffffff'],
        d: 9,
      },
    ],
    [
      80,
      85,
      -1,
      {
        nf: 3,
        wall: '#d8d4cc',
        sign: ['八方雲集', '#f2c718', '#111111', '鍋貼水餃專賣店 466-7666'],
        vert: ['八方雲集', '#f2c718', '#111111'],
        ground: 'shop',
        bal: 'plain',
        banner: ['鍋貼 水餃', '#c8262d', '#ffffff'],
        d: 9,
      },
    ],
    [
      85,
      94.5,
      -1,
      {
        nf: 3,
        gf: 3.6,
        wall: '#efefea',
        sign: ['三井3C', '#3d4250', '#ffffff', '智慧・生活・好鄰居 中原門市'],
        vert: ['三井3C', '#3d4250', '#ffffff'],
        ground: 'shop',
        bal: 'arch',
        banner: ['APP 會員', '#2a5fd0', '#ffffff'],
        d: 10,
      },
    ],
    [
      94.5,
      100,
      -1,
      {
        nf: 4,
        wall: '#8a5a4a',
        sign: ['羽の鍋', '#2a2a2a', '#ffffff', '訂購專線 03-466-6512'],
        vert: ['羽の鍋', '#2a2a2a', '#ffffff'],
        ground: 'shop',
        awn: '#6a4a3a',
        bal: 'plain',
        fins: '#b8b8b4',
        d: 10,
      },
    ],
    [
      100,
      102.5,
      -1,
      { nf: 4, wall: '#e6dcc4', ground: 'gate', sh: '#7a2a4a', bal: 'grille', door: 0, d: 10 },
    ],
    [
      102.5,
      109,
      -1,
      { nf: 5, wall: '#8a5a4a', ground: 'open', bal: 'plain', fins: '#e8e8e4', d: 10 },
    ],
    [
      109,
      126.9,
      -1,
      {
        nf: 5,
        gf: 3.6,
        wall: '#d9cfbf',
        sign: ['7-ELEVEN', '#ffffff', '#00843d', null, 'seven'],
        sign2: ['小北百貨 24H', '#ffd700', '#1a3c8f'],
        big: ['廣告外牆出租\n小北照亮你的生活點滴', '#f4f4f2', '#d42a1f'],
        vert: ['小北百貨', '#ffd700', '#1a3c8f'],
        ground: 'shop',
        bal: 'plain',
        d: 10, // 實踐路那面（街景 2026-05）：整排玻璃店面、7-11 色帶，樓上小北百貨看板
        side: {
          at: 1,
          sign: ['7-ELEVEN', '#ffffff', '#00843d', null, 'seven'],
          big: ['小北百貨 24H', '#ffd700', '#1a3c8f'],
        },
      },
    ],
    // S3 實踐路到力行北街是中原國小，沿路的圍牆在 fences
    // S4 力行北街到幸福街（2026-05）
    [
      281.7,
      289,
      -1,
      {
        nf: 4,
        wall: '#d8d4cc',
        low: '#3aaa6a',
        sign: ['YoYo PET 佑佑寵物', '#d8506a', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 9, // 力行北街那面（街景 2026-05）：招牌繞過轉角接著寫，一樓整排玻璃櫥窗、綠色柱子
        side: { at: 0, sign: ['YoYo PET 佑佑寵物', '#d8506a', '#ffffff', 'TEL'], ground: 'shop' },
      },
    ],
    [
      289,
      292,
      -1,
      {
        nf: 4,
        wall: '#8a4a3a',
        sign: ['牧野飛行', '#7a7a78', '#ffffff'],
        ground: 'shutter',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      292,
      296,
      -1,
      {
        nf: 4,
        wall: '#8a4a3a',
        sign: ['Knight hair salon', '#ffffff', '#1a1a1a'],
        banner: ['8.5折 $999', '#ffffff', '#d42a1f'],
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      296,
      299,
      -1,
      {
        nf: 4,
        wall: '#d8d4cc',
        sign: ['三顧茅廬', '#d42a3a', '#ffffff', '麻辣滷味'],
        awn: '#7a5a3a',
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      299,
      302,
      -1,
      {
        nf: 4,
        wall: '#8a4a3a',
        vert: ['巨林美而美', '#d42a3a', '#f2d02a'],
        ground: 'shutter',
        sh: '#4a4e52',
        awn: '#6a4a38',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      302,
      307,
      -1,
      {
        nf: 4,
        wall: '#d8d4cc',
        sign: ['彩虹攝影', '#1f3fa8', '#ffffff'],
        ground: 'shutter',
        sh: '#2a3f6a',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      307,
      312,
      -1,
      {
        nf: 4,
        wall: '#8a4a3a',
        sign: ['朋淇早餐店 海口鮮魚湯', '#f2f2f0', '#2a2a2a'],
        ground: 'shutter',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      312,
      319,
      -1,
      {
        nf: 4,
        wall: '#d8d4cc',
        sign: ['阿秋鹹粥', '#ffffff', '#d42a1f', '24H'],
        round: ['阿秋', '#ffffff', '#d42a1f'],
        ground: 'stall',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      319,
      325.6,
      -1,
      {
        nf: 4,
        wall: 'grime',
        vert: ['50', '#d42a1f', '#ffffff'],
        ground: 'open',
        bal: 'grille',
        d: 9, // 幸福街那面（街景 2025-06 相片球）：阿秋鹹粥的側面，白底紅字招牌、一樓開放的菜單牆小吃攤
        side: { at: 1, sign: ['阿秋鹹粥', '#ffffff', '#d42a1f', '24H'], ground: 'open' },
      },
    ],
    // S5 中北橋西到中北路28巷（2026-05）
    // 中北橋西南角（s 345～357）是新街溪與河岸，原本這格蓋在河上（國土測繪 2024 正射、Google 街景 2026-05），拿掉
    [
      357,
      370,
      -1,
      {
        nf: 2,
        wall: '#e0d8bc',
        sign: ['扑藝 salon', '#f2f2f0', '#1a1a1a', '中北店'],
        vert: ['扑藝', '#f2f2f0', '#1a1a1a'],
        ground: 'shop',
        bal: 'grille',
        tin: true,
        d: 9,
      },
    ],
    [
      370.5,
      376.7,
      -1,
      {
        nf: 4,
        wall: '#d8d6d0',
        arch: '#d8a0a0',
        sign: ['五折天 歡喜購', '#f5c020', '#d42a1f', '即期商品專賣店'],
        vert: ['五折天', '#f5c020', '#d42a1f'],
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      383.6,
      387,
      -1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['香港許記燒臘', '#d42a1f', '#ffffff'],
        vert: ['香港許記', '#d42a1f', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      387,
      391,
      -1,
      {
        nf: 4,
        wall: '#a8a69e',
        sign: ['晟新 自助洗衣', '#a8d8f0', '#1f3a8a'],
        awn: '#3a9a6a',
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [391, 394, -1, { nf: 3, wall: '#e8e8e6', ground: 'shutter', bal: 'grille', d: 9 }],
    [
      394,
      399,
      -1,
      {
        nf: 3,
        wall: '#a8b4a8',
        sign: ['大阪燒', '#f0eef8', '#1a1a1a', 'Okonomiyaki'],
        ground: 'shutter',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      399,
      404,
      -1,
      {
        nf: 4,
        wall: '#8a4a3a',
        sign: ['KYMCO', '#f4f4f4', '#d42a1f'],
        vert: ['KYMCO', '#f4f4f4', '#d42a1f'],
        ground: 'open',
        bikes: 3,
        bal: 'grille',
        d: 9,
      },
    ],
    [
      404,
      411,
      -1,
      {
        nf: 2,
        wall: '#f5c518',
        sign: ['蝦皮店到店', '#ee4d2d', '#ffffff'],
        big: ['SECOND FLOOR\nsince 2020', '#1a2a4a', '#f2e6b0'],
        bigFrom: 1,
        ground: 'shop',
        bal: 'plain',
        d: 9,
      },
    ],
    [
      411,
      415,
      -1,
      {
        nf: 2,
        wall: '#e8d890',
        sign: ['夾娃娃', '#f5c518', '#d42a1f'],
        ground: 'open',
        bal: 'plain',
        d: 9,
      },
    ],
    [
      415,
      424,
      -1,
      {
        nf: 4,
        wall: '#e8e4da',
        sign: ['7-ELEVEN', '#ffffff', '#00843d', null, 'seven'],
        vert: ['7-11', '#00843d', '#ffffff'],
        ground: 'shop',
        bal: 'plain',
        d: 9,
      },
    ],
    [
      424,
      433.6,
      -1,
      {
        nf: 3,
        wall: '#3a3a3c',
        sign: ['林燒肉 燒烤｜海鮮｜啤酒', '#1a1a1a', '#ffffff', 'LINSHAOROU'],
        big: ['林燒肉\nLINSHAOROU', '#3a3a3c', '#ffffff'],
        bigFrom: 1,
        ground: 'shop',
        bal: 'plain',
        d: 9,
      },
    ],
    // S6 中北路28巷到中山東路（2024-08）
    [
      440,
      447.2,
      -1,
      {
        nf: 5,
        wall: '#f0efea',
        sign: ['麗媽香香鍋', '#f2c830', '#d42a1f'],
        vert: ['香香鍋', '#f2c830', '#d42a1f'],
        ground: 'shutter',
        sh: '#2a5aa8',
        bal: 'open',
        d: 3,
      },
    ],
    [
      447.2,
      452,
      -1,
      {
        nf: 5,
        wall: '#b8b6b0',
        sign: ['大世界西服社', '#ffffff', '#1a1a1a'],
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      452,
      456,
      -1,
      {
        nf: 5,
        wall: '#b8b6b0',
        sign: ['一神教真理堂', '#c8d83a', '#2a5a2a'],
        ground: 'shutter',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      456,
      461,
      -1,
      {
        nf: 5,
        wall: '#b8b6b0',
        sign: ['QBurger', '#ffffff', '#f08a2a', '饗樂餐飲'],
        round: ['Q', '#f08a2a', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      461,
      468,
      -1,
      {
        nf: 5,
        wall: '#b8b6b0',
        sign: ['金昌鐘錶眼鏡刻印行', '#f2d02a', '#d42a1f'],
        vert: ['金昌鐘錶', '#f2d02a', '#d42a1f'],
        ground: 'shutter',
        sh: '#1e1e1f',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      468,
      473,
      -1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['風味便當', '#f0b040', '#1a1a1a', '訂購專線 03-4665262'],
        ground: 'shop',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      473,
      477,
      -1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['大昇踏腳車行', '#2a5aa8', '#ffffff'],
        ground: 'open',
        bikes: 2,
        bal: 'grille',
        d: 9,
      },
    ],
    [
      477,
      484,
      -1,
      {
        nf: 4,
        wall: '#c04a3a',
        sign: ['找餐店', '#2a3ad0', '#ffffff', 'ZHAO BRUNCH'],
        vert: ['找餐店', '#2a3ad0', '#ffffff'],
        ground: 'stall',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      484,
      490,
      -1,
      {
        nf: 3,
        wall: '#c04a3a',
        sign: ['髮中心', '#f4f4f2', '#2a2a2a'],
        ground: 'shutter',
        bal: 'plain',
        d: 9,
      },
    ],
    [
      490,
      496,
      -1,
      {
        nf: 3,
        wall: 'brick',
        sign: ['酥炸哥 鹽酥雞', '#ffffff', '#7a3ab0'],
        awn: '#6a4a38',
        ground: 'shutter',
        bal: 'grille',
        d: 9,
      },
    ],
    [
      496,
      508,
      -1,
      {
        nf: 4,
        wall: '#8a4a3a',
        sign: ['酉客棧 U CHICKEN BISTRO', '#1f1f1f', '#ffffff', '03 438 0057'],
        ground: 'shop',
        bal: 'rail',
        d: 9,
      },
    ],
    [
      508,
      515.8,
      -1,
      {
        nf: 2,
        wall: '#8a4a3a',
        sign: ['韓式炸雞', '#1f1f1f', '#f2e6b0'],
        ground: 'shop',
        bal: 'rail',
        d: 5, // 中山東路那面（街景 2026-05）：路口安全帽店，白色招牌帶印一排安全帽（沒有字），一樓開放擺滿安全帽
        side: { at: 1, sign: ['', '#f4f4f2', '#2a2a2a'], ground: 'open' },
      },
    ],
    // 中北路二段（2026-05 到 s≈567，其後 2024）
    [
      536.5,
      548,
      -1,
      {
        nf: 3,
        wall: '#b8b6b0',
        sign: ['舒適名床量販', '#ffffff', '#2a5aa8'],
        ground: 'shop',
        bal: 'grille',
        roof: 'bill',
        bill: ['承聚廣告', '#d42a1f', '#ffffff', 6, 1.8],
        d: 8, // 中山東路那面（街景 2026-05）：轉角是六六大舜，白色招牌帶紅字、一樓玻璃店面
        side: { at: 0, sign: ['六六大舜', '#f4f2ee', '#c8282a'], ground: 'shop' },
      },
    ],
    // ---- 茶學苑側（N，往西走的右手邊）----
    // N1 ZEISS 之後到 165巷（2026-05）
    [
      64.6,
      69.8,
      1,
      {
        nf: 4,
        wall: '#c9c6be',
        sign: ['夢工場 數位照相', '#f4f4f2', '#1f3a7a', 'picture'],
        vert: ['夢工場', '#d42a1f', '#ffffff'],
        ground: 'shop',
        bal: 'plain',
        hood: '#6a4a38',
        d: 10,
      },
    ],
    [
      69.8,
      76.4,
      1,
      {
        nf: 4,
        wall: '#c9c6be',
        sign: ['年青人眼鏡', '#f5d020', '#1f3a7a', 'YM'],
        vert: ['年青人', '#f5d020', '#1f3a7a'],
        banner: ['880', '#2a6fc0', '#ffffff'],
        awn: '#2a6fc0',
        ground: 'shop',
        bal: 'plain',
        d: 10,
      },
    ],
    // N2 165巷到實踐路
    [
      86.2,
      89.5,
      1,
      {
        nf: 4,
        wall: '#a8826e',
        ground: 'open',
        bal: 'plain',
        round: ['P', '#e0498a', '#ffffff'],
        d: 10,
      },
    ],
    [
      89.5,
      99.5,
      1,
      {
        nf: 4,
        wall: '#4a4a4e',
        big: ['P 中原\n機車停車場\n臨停 15元', '#e85a9a', '#ffffff'],
        bigFrom: 1,
        bigW: 3.6,
        bigAt: 0.42,
        sign: ['租 金店面 約65坪', '#f5d020', '#d42a1f', '0911-066-412'],
        ground: 'open',
        bikes: 4,
        bal: 'plain',
        d: 10,
      },
    ],
    [
      99.5,
      105,
      1,
      {
        nf: 4,
        wall: '#4a4a4e',
        fins: '#2a2a2e',
        sign: ['晶澈', '#e8e6e2', '#3a3a3a', 'PEGAVISION 晶碩光學'],
        ground: 'shop',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      105,
      109.3,
      1,
      {
        nf: 4,
        wall: '#4a4a4e',
        fins: '#2a2a2e',
        sign: ['視爵眼鏡', '#1f1f1f', '#ffffff'],
        ground: 'shop',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      109.3,
      112.6,
      1,
      {
        nf: 5,
        bal: 'glass',
        glass: '#5a8a8a',
        sign: ['KEBUKE', '#1f4a5a', '#ffffff', '可不可熟成紅茶'],
        round: ['可不可', '#ffffff', '#222222'],
        ground: 'shop',
        d: 10,
      },
    ],
    [
      112.6,
      116.8,
      1,
      {
        nf: 4,
        wall: '#9a4a3a',
        sign: ['誠品眼鏡', '#f5e030', '#1a7a3a', '保證全區最便宜'],
        vert: ['誠品眼鏡', '#f5e030', '#1a7a3a'],
        banner: ['多焦鏡片 2880', '#e87aa0', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      116.8,
      121.2,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['NAFISHOP', '#1a1a1a', '#ffffff', 'CLOTHES'],
        big: ['新品上市', '#2f5fa8', '#ffe14d'],
        bigFrom: 1,
        ground: 'shutter',
        sh: '#3a6aa8',
        bal: 'plain',
        d: 5, // 實踐路那面（街景 2026-05）：CLOTHES｜NAFISHOP 黑招牌、藍色鐵捲門，裡側一扇白鐵門
        side: {
          at: 1,
          sign: ['NAFISHOP', '#1a1a1a', '#ffffff', 'CLOTHES'],
          ground: 'shutter',
          sh: '#3a6aa8',
          to: 3.8,
        },
      },
    ],
    // N3 實踐路到信陽街27巷（轉角 2026，其餘 2024-08）
    [
      134.4,
      141,
      1,
      {
        nf: 5,
        bal: 'glass',
        glass: '#9ab8c0',
        sign: ['手機配件', '#1a1a1a', '#ffffff'],
        ground: 'shop',
        d: 10, // 實踐路那面（街景 2026-05）：開放店面，黑色招牌帶上兩排彩色小招牌，裡側兩片手機殼海報
        side: {
          at: 0,
          ground: 'open',
          to: 5.5,
          subs: [
            ['鋼化玻璃', '#e8a0a8', '#ffffff'],
            ['平板皮套', '#e8a0a8', '#ffffff'],
            ['快充插頭', '#e8a0a8', '#ffffff'],
            ['軍規防摔', '#f0a040', '#ffffff'],
            ['汽機車架', '#8ac08a', '#ffffff'],
            ['鏡頭保貼', '#7aa8c8', '#ffffff'],
            ['全機包膜', '#3a8ad8', '#ffffff'],
            ['機能掛繩', '#3a6ad8', '#ffffff'],
          ],
          panels: [
            [5.7, 7.6, 'SKINARMA\niPhone 16', '#1c1c1e', '#ffffff'],
            [7.7, 9.7, '五匹\n手機支架', '#e8e8e6', '#1a1a1a'],
          ],
        },
      },
    ],
    [
      141,
      145,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['台灣大哥大 myfone', '#f26a1f', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      145,
      150,
      1,
      {
        nf: 4,
        wall: '#9a4a3a',
        sign: ['茶湯會', '#e8dcc0', '#2a1a10', 'TP TEA'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      150,
      154.5,
      1,
      {
        nf: 4,
        wall: '#9a4a3a',
        sign: ['William', '#4a3a30', '#ffffff'],
        ground: 'shutter',
        sh: '#5a5e62',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      154.5,
      159,
      1,
      {
        nf: 4,
        wall: '#c85a6a',
        sign: ['禾日 皮蛋麻辣麵', '#7a2a2a', '#ffffff', '全新上市'],
        ground: 'shutter',
        sh: '#d8a020',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      159,
      163,
      1,
      {
        nf: 4,
        wall: '#c85a6a',
        sign: ['E視力眼鏡', '#1f6a4a', '#ffffff'],
        ground: 'shutter',
        sh: '#8d9094',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      163,
      167.5,
      1,
      {
        nf: 4,
        wall: '#2a8a3a',
        sign: ['SUBWAY', '#2a8a3a', '#ffc20e'],
        vert: ['SUBWAY', '#2a8a3a', '#ffc20e'],
        ground: 'shop',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      167.5,
      172,
      1,
      {
        nf: 4,
        wall: '#cfccc4',
        sign: ['Yun Yun Spa', '#ffffff', '#1f3a7a', '越式養生洗髮'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      172,
      176.5,
      1,
      {
        nf: 4,
        wall: '#cfccc4',
        sign: ['匠堡', '#ffffff', '#8a3a2a', '早午餐'],
        awn: '#7a5a40',
        ground: 'stall',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      176.5,
      181.5,
      1,
      {
        nf: 4,
        wall: '#cfccc4',
        sign: ['燙或染', '#1f1f1f', '#ffffff', '666'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      181.5,
      188,
      1,
      {
        nf: 4,
        wall: '#cfccc4',
        sign: ['YAMAHA', '#ffffff', '#d4202a'],
        vert: ['YAMAHA', '#ffffff', '#d4202a'],
        ground: 'open',
        bikes: 3,
        bal: 'grille',
        d: 10,
      },
    ],
    [
      188,
      193.5,
      1,
      {
        nf: 4,
        wall: '#e8e2d4',
        sign: ['Ace Hair', '#4a3e3e', '#ffffff', 'HAIR DESIGN'],
        awn: '#3a9a6a',
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      193.5,
      197.5,
      1,
      {
        nf: 3,
        wall: '#5a4a3a',
        sign: ['Knight', '#2a2420', '#ffffff'],
        ground: 'shutter',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      197.5,
      202,
      1,
      {
        nf: 4,
        wall: '#222222',
        sign: ['亞米秀', '#ffffff', '#111111'],
        ground: 'shutter',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      202,
      215.5,
      1,
      {
        nf: 4,
        gf: 3.6,
        wall: '#e8e0d8',
        sign: ['Carrefour market 家樂福', '#f6e4ec', '#8a4a78', '24H'],
        vert: ['家樂福超市', '#e05a8a', '#ffffff'],
        awn: '#c83a2a',
        ground: 'shop',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      215.5,
      220.5,
      1,
      {
        nf: 4,
        wall: '#cfccc4',
        sign: ['泰開運', '#f07a3a', '#ffffff'],
        vert: ['泰開運', '#f07a3a', '#ffffff'],
        round: ['JC', '#2a9a8a', '#ffffff'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [220.5, 224.5, 1, { nf: 4, wall: '#cfccc4', ground: 'shutter', bal: 'grille', d: 10 }],
    [
      224.5,
      229.5,
      1,
      {
        nf: 4,
        wall: '#eeeeea',
        sign: ['FH SALON', '#ffffff', '#1f3070', '桃樂髮藝設計'],
        vert: ['桃樂髮藝', '#ffffff', '#1f3070'],
        ground: 'shutter',
        sh: '#2a5aa8',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      229.5,
      233.5,
      1,
      {
        nf: 4,
        wall: '#eeeeea',
        sign: ['信美', '#ffffff', '#2a5aa8', '彩色 黑白 影印裝訂'],
        vert: ['信美複印行', '#1f3070', '#ffffff'],
        ground: 'shutter',
        sh: '#2a5aa8',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      233.5,
      238,
      1,
      {
        nf: 4,
        wall: '#eeeeea',
        sign: ['白巷子', '#ffffff', '#111111', 'WHITE ALLEY'],
        round: ['白巷子', '#ffffff', '#111111'],
        banner: ['買二送一', '#e87aa0', '#ffffff'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      238,
      243,
      1,
      {
        nf: 4,
        wall: '#a8a69e',
        sign: ['軒利印刷', '#d42a1f', '#f5d020'],
        vert: ['軒利印刷', '#d42a1f', '#f5d020'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      243,
      247.5,
      1,
      {
        nf: 3,
        wall: '#d8d6d0',
        sign: ['向陽 數位影像', '#2a5aa8', '#ffffff'],
        vert: ['向陽影像', '#1f3070', '#ffffff'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      247.5,
      254,
      1,
      {
        nf: 3,
        wall: '#3a8a4a',
        sign: ['懷仁大藥局', '#2f7a3f', '#f5e6a8'],
        vert: ['藥', '#2f7a3f', '#f5e6a8'],
        ground: 'shutter',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      254,
      261,
      1,
      {
        nf: 3,
        wall: '#bdbbb4',
        sign: ['中原專業影印', '#ffffff', '#b03a3a', 'COPY'],
        ground: 'shutter',
        sh: '#d8a020',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      261,
      269,
      1,
      {
        nf: 2,
        wall: '#cfccc4',
        sign: ['和也 串燒專門', '#1f3070', '#ffffff', '二號店'],
        round: ['和也', '#1f3070', '#ffffff'],
        ground: 'shutter',
        sh: '#d8a020',
        bal: 'grille',
        roof: 'bill',
        bill: ['中華順氣研究會', '#f2f2f0', '#2a2a2a', 4, 1.2],
        d: 10,
      },
    ],
    [
      269,
      276.2,
      1,
      {
        nf: 1,
        wall: '#3a7ac0',
        sign: ['西瓜汁', '#d42a1f', '#ffffff'],
        ground: 'stall',
        tin: true,
        d: 6,
      },
    ],
    // N4 信陽街27巷到中北橋：一樓攤販鐵皮屋（2026-05）
    [
      283.8,
      288.3,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        noband: true,
        ground: 'stall',
        awn: '#3a9a7a',
        roof: 'bill',
        bill: ['開源社\n香雞排', '#f0eee8', '#d42a1f', 4.4, 1.6],
        roofCol: '#8fa8a8',
        d: 7,
      },
    ],
    [
      288.3,
      292.8,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        noband: true,
        ground: 'stall',
        awn: '#3a9a7a',
        roof: 'bill',
        bill: ['漢堡・三明治\n素食', '#f2f0e6', '#3a7a4a', 4.2, 1.5],
        roofCol: '#8fa8a8',
        d: 7,
      },
    ],
    [
      292.8,
      298.8,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        noband: true,
        ground: 'stall',
        awn: '#3a9a7a',
        roof: 'bill',
        bill: ['笨港朝天雞', '#f2e04a', '#d42a1f', 5.6, 1.6],
        roofCol: '#7a98a0',
        d: 7,
      },
    ],
    [
      298.8,
      302.8,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        noband: true,
        ground: 'shutter',
        sh: '#6a4a38',
        roof: 'bill',
        bill: ['凌家舖子 即將開幕\n炸物・煲仔飯', '#d42a1f', '#ffffff', 3.8, 1.4],
        roofCol: '#8fa8a8',
        d: 7,
      },
    ],
    [
      302.8,
      306.8,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        noband: true,
        ground: 'stall',
        roof: 'bill',
        bill: ['馬來一哥\n馬來西亞道地美食', '#2a2a2a', '#f2d02a', 3.8, 1.8],
        roofCol: '#8fa8a8',
        d: 7,
      },
    ],
    [
      306.8,
      311.8,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        noband: true,
        ground: 'stall',
        awn: '#3a9a7a',
        roof: 'bill',
        bill: ['岡山\n炒牛羊肉', '#f4f4f2', '#d42a1f', 5, 2.4],
        roofCol: '#8fa8a8',
        d: 4, // 後面就是新街溪（樹下），國土測繪 2024 正射
      },
    ],
    // s 311.8～328 是新街溪北岸的大樹、電線桿和中北橋的黃色波浪欄杆（Google 街景 2025-06、2026-05），原本兩格小攤（糖炒栗子、生炒羊肉）蓋在河上，拿掉
    // N5 中北橋西到新中北路34巷（2026-05）
    // 寶雅東側那棟（Google 地圖使用者全景 2025-06、國土測繪 2024 正射）：深灰外牆、整排淺綠玻璃窗，
    // 東側就是進 Times 停車場的巷子；屋頂是一大片灰色條紋鐵皮，往後一直到停車場邊（約 24 m 深）
    [
      347.7,
      352,
      1,
      { nf: 5, wall: '#55585c', bal: 'glass', glass: '#3f4a4b', ground: 'shop', d: 24 },
    ],
    // 寶雅：2 層裙樓（屋頂整片太陽能板，正射量約 21 m 深），上面退縮一棟紫灰陽台的住宅高樓（陰影很長，取 11 層）
    [
      352,
      375,
      1,
      {
        nf: 2,
        gf: 3.8,
        wall: '#e8e8e6',
        sign: ['POYA 寶雅', '#d8287a', '#ffffff', 'www.poya.com.tw'],
        vert: ['寶雅', '#d8287a', '#ffffff'],
        ground: 'shop',
        bikes: 6,
        bal: 'plain',
        tower: { nf: 11, back: 3, depth: 12, wall: '#e9e7e3', balc: '#6a6070' },
        solar: true,
        d: 21,
      },
    ],
    [
      375,
      380,
      1,
      {
        nf: 5,
        wall: '#c0603a',
        sign: ['鍾愛一生 動物醫院', '#2a2a7a', '#f5e6a8'],
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      380,
      385,
      1,
      {
        nf: 5,
        wall: '#efe9dc',
        sign: ['品臻牙醫診所', '#2a5a9a', '#ffffff'],
        ground: 'shutter',
        sh: '#e8e8e6',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      385,
      392,
      1,
      {
        nf: 7,
        wall: '#b8a488',
        sign: ['佳國耳鼻喉科', '#f4f4f0', '#2a5a9a'],
        ground: 'shutter',
        sh: '#e8e8e6',
        bal: 'open',
        d: 10,
      },
    ],
    [
      392,
      399,
      1,
      {
        nf: 7,
        wall: '#b8a488',
        sign: ['佳愷藥局', '#ffffff', '#2a7a4a'],
        vert: ['佳愷藥局', '#ffffff', '#2a7a4a'],
        ground: 'shutter',
        sh: '#e8e8e6',
        bal: 'open',
        d: 10,
      },
    ],
    [399, 406, 1, { nf: 7, wall: '#b8a488', ground: 'shutter', sh: '#e8e8e6', bal: 'open', d: 10 }],
    [
      406,
      411,
      1,
      {
        nf: 4,
        bal: 'glass',
        glass: '#7a8a96',
        sign: ['麥面庄', '#f4f4f2', '#1a1a1a', '一九九三創始', 'frame'],
        banner: ['還是麥麵庄 12月中', '#d42a1f', '#ffffff'],
        ground: 'shop',
        d: 10,
      },
    ],
    [
      411,
      415,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['速衣淨', '#a8d0f0', '#1f3a8a', '自助洗衣'],
        banner: ['代洗代烘', '#d42a1f', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      415,
      420,
      1,
      {
        nf: 3,
        wall: '#a8a69e',
        vert: ['雅砌出租', '#f2d02a', '#2a7a3a'],
        ground: 'shutter',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      420,
      426,
      1,
      {
        nf: 4,
        wall: '#bdbbb4',
        sign: ['老天鵝 鵝肉專賣店', '#f2c830', '#111111'],
        vert: ['老天鵝', '#f2c830', '#111111'],
        awn: '#e08a2a',
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      426,
      438.8,
      1,
      {
        nf: 5,
        bal: 'glass',
        glass: '#4a9ab0',
        sign: ['全家 FamilyMart', '#ffffff', '#1a6ab0', null, 'fam'],
        ground: 'shop',
        d: 3,
      },
    ],
    // N6 新中北路34巷到中山東路（2024-08）
    [
      445.2,
      452,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['筱芸永和豆漿大王', '#d42a1f', '#ffffff'],
        vert: ['永和豆漿', '#d42a1f', '#ffffff'],
        awn: '#6a4a38',
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      452,
      459.5,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['蛋白盒子', '#d42a2a', '#ffffff', 'THE PROTEIN BOX'],
        round: ['健康餐盒', '#d42a2a', '#ffffff'],
        awn: '#3a9a6a',
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      459.5,
      464,
      1,
      {
        nf: 3,
        wall: '#f0ece4',
        low: '#b08a5a',
        sign: ['好咖 Thai', '#ffffff', '#2a2a2a'],
        ground: 'shop',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      464,
      470,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['YONEX', '#2a8a4a', '#ffffff', '中原體育用品'],
        vert: ['VICTOR', '#1f4fa0', '#ffffff'],
        ground: 'shutter',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      470,
      475,
      1,
      {
        nf: 4,
        wall: '#b8b6b0',
        sign: ['DEVILCASE', '#ffffff', '#1a1a1a', '手機防摔殼｜螢幕保護貼'],
        ground: 'shutter',
        sh: '#1e1e1f',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      475,
      480,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['植美家 UEMIYA', '#6aa86a', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      480,
      485,
      1,
      {
        nf: 3,
        wall: '#8a6a4a',
        sign: ['', '#f4f4f2', '#f4f4f2'],
        ground: 'shutter',
        sh: '#5a3a28',
        bal: 'plain',
        d: 10,
      },
    ],
    [
      485,
      489,
      1,
      {
        nf: 4,
        wall: '#d8d6d0',
        sign: ['歡壽司婆', '#d42a1f', '#ffffff'],
        vert: ['歡壽司婆', '#d42a1f', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      489,
      495,
      1,
      {
        nf: 4,
        wall: '#eeeeea',
        sign: ['MACU 麻古茶坊', '#ffffff', '#d42a2a'],
        round: ['麻古', '#d42a2a', '#ffffff'],
        ground: 'shutter',
        sh: '#eeeeea',
        bal: 'grille',
        d: 10,
      },
    ],
    [
      495,
      501,
      1,
      {
        nf: 4,
        wall: '#a8a69e',
        sign: ['視鏡會', '#7a5ad0', '#ffffff', '4384388'],
        vert: ['驗光所', '#7a5ad0', '#ffffff'],
        ground: 'shutter',
        sh: '#7a5ad0',
        bal: 'rail',
        d: 10,
      },
    ],
    [
      501,
      521.5,
      1,
      {
        nf: 2,
        wall: '#a8a69e',
        sign: ['騎士安全部品', '#1a1a1a', '#ffffff'],
        vert: ['騎士安全部品', '#1a1a1a', '#ffffff'],
        ground: 'shutter',
        sh: '#2a3f6a',
        bal: 'plain',
        roof: 'bill',
        bill: ['HJC   SHOEI   SHARK   OGK   agv', '#f4f4f2', '#2a2a2a', 14, 3.2],
        d: 10, // 中山東路那面（街景 2026-05）：深藍「騎士」店招、玻璃店面，二樓一片橘色看板（字看不清）
        side: {
          at: 1,
          sign: ['騎士安全部品', '#1a2a4a', '#ffffff'],
          ground: 'shop',
          big: ['', '#e8963a', '#ffffff'],
        },
      },
    ],
    // 中北路二段（2026-05）
    [
      541.5,
      549.5,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        noband: true,
        ground: 'stall',
        roof: 'bill',
        bill: ['台北高明\n一對一補習班', '#2a6ad0', '#ffffff', 5, 2],
        roofCol: '#8fa8a8',
        d: 6, // 中山東路那面（街景 2026-05）：單層鐵皮屋，紅色招牌帶（字看不清）、一樓開放店面
        side: { at: 0, sign: ['', '#c8282a', '#ffffff'], ground: 'open' },
      },
    ],
    [
      549.5,
      556,
      1,
      {
        nf: 1,
        wall: '#cfcbbd',
        sign: ['肉乾・肉鬆', '#d42a1f', '#ffffff'],
        ground: 'stall',
        awn: '#d42a1f',
        tin: true,
        d: 6,
      },
    ],
    [
      556,
      563.8,
      1,
      {
        nf: 2,
        wall: '#e8d890',
        sign: ['惢翔 60元便當', '#f2c830', '#d42a1f'],
        awn: ['#d42a1f', '#f2c830'],
        ground: 'shop',
        bal: 'plain',
        d: 6,
      },
    ],
  ],
};
export function zbAt(s) {
  const R = ZB_ROAD;
  let acc = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i],
      b = R[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= acc + L || i === R.length - 2) {
      const t = (s - acc) / L;
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        ux: (b[0] - a[0]) / L,
        uz: (b[1] - a[1]) / L,
      };
    }
    acc += L;
  }
}
// 每一格的區域座標：原點在立面線的起點，+x 沿立面（side -1 時朝 s 變小的方向，立面才對著街），+z 離開街道
export function zbLotFrame([s0, s1, side, sp]) {
  const m = zbAt((s0 + s1) / 2),
    w = s1 - s0,
    nx = -m.uz * side,
    nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux,
    az = side > 0 ? m.uz : -m.uz;
  const set = (sp && sp.set) || setAt((s0 + s1) / 2);
  return {
    ox: m.x + nx * set - (ax * w) / 2,
    oz: m.z + nz * set - (az * w) / 2,
    ang: Math.atan2(az, ax),
    w,
    apron: Math.max(0.6, set - halfAt((s0 + s1) / 2)),
  };
}
export function zbFootprints() {
  const fp = ZB_ST.fences.map(([s0, s1, side]) => {
    const { ox, oz, ang, w, apron } = zbLotFrame([s0, s1, side, { set: setAt(s0) + 0.35 }]),
      c = Math.cos(ang),
      s = Math.sin(ang),
      p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, 1.8), p(-0.1, 1.8)];
  });
  return fp.concat(
    ZB_ST.lots.map((L) => {
      const { ox, oz, ang, w, apron } = zbLotFrame(L),
        c = Math.cos(ang),
        s = Math.sin(ang),
        d = L[3].d || 10;
      const p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
      return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, d), p(-0.1, d)];
    })
  );
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

// 轉角格對著另一條街的側面：把側牆當成另一個立面來畫（側面座標 x 沿側牆、z 往牆外為負，轉 90° 回格子座標）。
// side：at 哪一端、sign 一樓招牌帶、subs 黑色招牌帶上兩排小招牌、ground 'shop'|'open'|'shutter'（sh 鐵捲門色）、
//   from / to 店面從離正面幾公尺到幾公尺、panels [[z0, z1, 字, 底, 字色]] 一樓的海報板、big [字, 底, 字色] 樓上整面帆布、awn 一樓雨棚色
// 這裡不用 r()，也不動輪廓，其他格的亂數與全圖停放機車都不受影響
// 側面座標工具由各街屋檔（這裡和 src/world/buildings/StreetXinzhongbei.js）傳進來
export function makeSideShop({ paint, shopGlass, shopTex, openTex, shutterTex, ROWT, FRONT }) {
  return (k0, S, xs, w, d, gf, top, i) => {
    const R = xs > 0,
      P = (sx, sz) => (R ? [w - sz, sx] : [sz, d - sx]),
      k = {
        box: (x0, x1, y0, y1, z0, z1, mat, o) => {
          const [a0, b0] = P(x0, z0),
            [a1, b1] = P(x1, z1);
          return k0.box(
            Math.min(a0, a1),
            Math.max(a0, a1),
            y0,
            y1,
            Math.min(b0, b1),
            Math.max(b0, b1),
            mat,
            o
          );
        },
        plane: (tex, pw, ph, x, y, z, rot = 0, o) => {
          const [a, b] = P(x, z);
          return k0.plane(tex, pw, ph, a, y, b, rot + (R ? -Math.PI / 2 : Math.PI / 2), o);
        },
      };
    const span = (z0, z1) => (R ? [z0, z1] : [d - z1, d - z0]),
      [a, b] = span(S.from ?? 0.3, S.to ?? d - 0.3),
      len = b - a,
      gh = gf - 1.0;
    if (S.sign) {
      const [text, bg, fg, sub, style] = S.sign;
      k.box(a, b, gf - 0.85, gf - 0.03, -0.28, 0, bg, { col: false });
      k.plane(
        paint(text, bg, fg, sub, len - 0.1, 0.8, 128, style),
        len - 0.1,
        0.8,
        (a + b) / 2,
        gf - 0.44,
        -0.29,
        FRONT,
        { emissive: 0.35 }
      );
    }
    if (S.subs) {
      const [c0, c1] = span(0.1, d - 0.1),
        per = Math.ceil(S.subs.length / 2),
        cw = (c1 - c0) / per;
      k.box(c0, c1, gf - 0.85, gf + 1.45, -0.3, 0, '#1c1c1e', { col: false });
      S.subs.forEach(([t, bg, fg], j) => {
        const row = (j / per) | 0,
          c = R ? j % per : per - 1 - (j % per);
        k.plane(
          paint(t, bg, fg, null, cw - 0.2, 0.5, 96),
          cw - 0.2,
          0.5,
          c0 + cw * (c + 0.5),
          gf + 1.05 - row * 0.65,
          -0.32,
          FRONT,
          { emissive: 0.35 }
        );
      });
    }
    if (S.awn) k.box(a - 0.05, b + 0.05, gh + 0.3, gh + 0.42, -1.2, 0, S.awn, { col: false });
    const gk = S.ground || 'shop';
    if (gk === 'shop') shopGlass(k, a + 0.1, b - 0.1, 0, gh, shopTex(i + 1));
    else if (gk === 'open') {
      k.plane(openTex, len - 0.2, gh, (a + b) / 2, gh / 2, -0.03, FRONT, { emissive: 0.3 });
      for (const x of [a, b - 0.1]) k.box(x, x + 0.1, 0, gh, -0.1, 0, '#8a8680', { col: false });
    } else {
      k.plane(
        S.sh ? shutterTex(S.sh) : ROWT.shutter(),
        len - 0.2,
        gh,
        (a + b) / 2,
        gh / 2,
        -0.02,
        FRONT
      );
      k.box(a + 0.05, b - 0.05, gh - 0.02, gh + 0.2, -0.22, 0, '#7a7e80', { col: false });
    }
    for (const [z0, z1, t, bg, fg] of S.panels || []) {
      const [p0, p1] = span(z0, z1);
      k.plane(
        paint(t, bg, fg, null, p1 - p0, gh, 64),
        p1 - p0,
        gh,
        (p0 + p1) / 2,
        gh / 2,
        -0.04,
        FRONT,
        {
          emissive: 0.25,
        }
      );
    }
    if (S.big) {
      const [bt, bb, bf] = S.big,
        [c0, c1] = span(0.3, d - 0.3),
        y0 = gf + (S.subs ? 1.6 : 0.2),
        bh = top - y0 - 0.2;
      k.plane(
        paint(bt, bb, bf, null, c1 - c0, bh, 40),
        c1 - c0,
        bh,
        (c0 + c1) / 2,
        y0 + bh / 2,
        -0.07,
        FRONT,
        {
          emissive: 0.15,
        }
      );
    }
  };
}

export function buildZhongbeiStreet(I, scene, X) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS } = X;
  const { MR, FRONT, shopGlass, ac, win, shell } = rowTools();
  const def = (key, f) => {
    if (!MATS[key]) MATS[key] = f();
    return key;
  };
  const std = (o) =>
    new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  // 單色的方塊（招牌底、雨棚、牆…）全部用頂點顏色畫在同一種材質上，一排房子只剩幾種材質，才不會有上百個 draw call：
  // 'VC' 是素色、'WVC' 是帶磁磚紋的牆；k.box / k.cyl 收到 #hex 或 'wall#hex' 就自動改成這兩種材質加頂點色
  const VC = def('zbVC', () => std({ vertexColors: true })),
    WVC = def('zbWVC', () => std({ map: YHT.facade(), vertexColors: true }));
  const MRW = { grime: MR.grime, brick: MR.brick, mosaic: MR.mosaic };
  const WALLC = {
    tile: '#f0efea',
    beige: '#eadfc6',
    grey: '#c9c8c2',
    pinkGrey: '#e3cfc9',
    stone: '#b9b7af',
    redbrown: '#b07a66',
  };
  // 磁磚貼面在日光下看起來比色票暗，深色與飽和色往白色提亮一點才像街景裡的樣子
  const lift = (hex, k = 0.22) => {
    const n = parseInt(hex.slice(1), 16),
      c = (s) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k);
    return `#${[16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`;
  };
  const wallMat = (w) =>
    MRW[w]
      ? MRW[w]
      : WALLC[w]
        ? `wall${WALLC[w]}`
        : w && w[0] === '#'
          ? `wall${lift(w)}`
          : `wall${WALLC.tile}`;
  const paintGeo = (g, hex) => {
    const c = new THREE.Color(hex),
      n = g.attributes.position.count,
      a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = c.r;
      a[i * 3 + 1] = c.g;
      a[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const vcKit = (k) => {
    const kb = k.box.bind(k),
      kc = k.cyl.bind(k),
      hexOf = (m) =>
        typeof m !== 'string' ? null : m[0] === '#' ? m : m.startsWith('wall#') ? m.slice(4) : null;
    k.box = (x0, x1, y0, y1, z0, z1, mat, o) => {
      const h = hexOf(mat);
      return h
        ? paintGeo(kb(x0, x1, y0, y1, z0, z1, mat[0] === '#' ? VC : WVC, o), h)
        : kb(x0, x1, y0, y1, z0, z1, mat, o);
    };
    k.cyl = (x, z, r, y0, y1, mat, o) => {
      const h = hexOf(mat);
      return h ? paintGeo(kc(x, z, r, y0, y1, VC, o), h) : kc(x, z, r, y0, y1, mat, o);
    };
    return k;
  };
  // ---- textures ----
  // 招牌：一公尺 ppm 像素，字自動縮到放得下；text 可用 \n 分行；sub 小字；style 加上品牌色條
  const paint = (text, bg, fg, sub, wm, hm, ppm = 128, style) => {
    if (wm * ppm > 1536) ppm = 1536 / wm;
    const W = r16(wm * ppm),
      Hh = r16(hm * ppm);
    return sg(`zb_${text}|${bg}|${fg}|${sub || ''}|${W}x${Hh}|${style || ''}`, W, Hh, (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, Hh);
      if (style === 'seven') {
        const hs = Hh / 3;
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, hs * 0.5);
        g.fillStyle = '#f26b21';
        g.fillRect(0, hs * 0.5, W, hs * 0.5);
        g.fillStyle = '#00843d';
        g.fillRect(0, hs, W, hs * 0.5);
        g.fillStyle = '#e2231a';
        g.fillRect(0, hs * 1.5, W, hs * 0.5);
        g.fillStyle = '#ffffff';
        g.fillRect(0, hs * 2, W, hs);
      }
      if (style === 'fam') {
        g.fillStyle = '#00a0e0';
        g.fillRect(0, 0, W, Hh * 0.16);
        g.fillStyle = '#2fb34a';
        g.fillRect(0, Hh * 0.16, W, Hh * 0.1);
      }
      if (style === 'frame') {
        g.strokeStyle = fg;
        g.lineWidth = Math.max(3, Hh * 0.04);
        g.strokeRect(Hh * 0.06, Hh * 0.06, W - Hh * 0.12, Hh * 0.88);
      }
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const lines = String(text).split('\n'),
        n = lines.length,
        avail = (Hh * (sub ? 0.64 : 0.86)) / n;
      const px = Math.min(avail * 0.92, W * 0.5);
      const fit = (t) => {
        const p = shrinkFont(g, t, W * 0.94, px, 10, font);
        return p;
      };
      const cy = sub ? Hh * 0.38 : Hh * 0.5;
      lines.forEach((t, i) => {
        fit(t);
        g.fillText(t, W / 2, cy + (i - (n - 1) / 2) * avail);
      });
      if (sub) {
        shrinkFont(g, sub, W * 0.94, Hh * 0.2, 9, (sz) => font(sz, 700));
        g.fillText(sub, W / 2, Hh * 0.82);
      }
    });
  };
  const roundSign = (text, bg, fg) =>
    sg(`zbR_${text}|${bg}|${fg}`, 128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = bg;
      g.beginPath();
      g.arc(64, 64, 62, 0, 7);
      g.fill();
      g.strokeStyle = fg;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(64, 64, 52, 0, 7);
      g.stroke();
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const t = [...text];
      if (t.length <= 2) {
        g.font = font(t.length === 1 ? 70 : 48);
        g.fillText(text, 64, 66);
      } else if (t.length <= 4) {
        g.font = font(40);
        g.fillText(t.slice(0, 2).join(''), 64, 44);
        g.fillText(t.slice(2).join(''), 64, 88);
      } else {
        shrinkFont(g, text, 100, 34, 12, font);
        g.fillText(text, 64, 66);
      }
    });
  const shutterTex = (hex) =>
    sg(`zbSh${hex}`, 64, 64, (g) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(0, y, 64, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, y + 6, 64, 2);
      }
    });
  const openTex = sg('zbOpen', 256, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 160);
    gr.addColorStop(0, '#4a4640');
    gr.addColorStop(0.3, '#2a2724');
    gr.addColorStop(1, '#161513');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = 'rgba(255,248,225,.85)';
    for (let x = 24; x < 256; x += 80) g.fillRect(x, 8, 36, 5);
    const r = lcg(41);
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 34 + r() * 8;
      g.fillStyle = ['#3a3a40', '#6a2a2a', '#2a4a6a', '#5a5a52'][i % 4];
      g.fillRect(x, 96, 20, 44);
      g.fillRect(x - 4, 112, 28, 12);
    }
  });
  const archWin = sg('zbArchWin', 256, 160, (g) => {
    // 三井3C 的白色拱形鐵窗
    g.fillStyle = '#e8e8e4';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#566673';
    g.fillRect(10, 10, 236, 140);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(14, 14, 100, 130);
    g.strokeStyle = '#f2f2ee';
    g.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const x0 = 14 + i * 77,
        x1 = x0 + 70;
      g.beginPath();
      g.moveTo(x0, 148);
      g.lineTo(x0, 70);
      g.arc((x0 + x1) / 2, 70, 35, Math.PI, 0);
      g.lineTo(x1, 148);
      g.stroke();
      g.beginPath();
      g.moveTo((x0 + x1) / 2, 35);
      g.lineTo((x0 + x1) / 2, 148);
      g.stroke();
    }
  });
  const archRow = sg('zbArchRow', 256, 64, (g) => {
    // 粉紅拱形女兒牆
    g.fillStyle = '#d8a0a0';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#efe0d8';
    for (let x = 6; x < 256; x += 32) {
      g.beginPath();
      g.moveTo(x, 58);
      g.lineTo(x, 28);
      g.arc(x + 10, 28, 10, Math.PI, 0);
      g.lineTo(x + 20, 58);
      g.closePath();
      g.fill();
    }
  });
  const bars = sg('zbBars', 64, 64, (g) => {
    // 圍牆黑色鐵欄杆
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = '#1c1c1e';
    for (let x = 4; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillRect(0, 2, 64, 4);
    g.fillRect(0, 58, 64, 4);
  });
  const litWin = (gr) =>
    sg(`zbLit${gr ? 1 : 0}`, 256, 160, (g) => {
      // 亮著燈的窗：暖色玻璃、窗簾，鐵窗版加欄杆
      g.fillStyle = '#d4d6d6';
      g.fillRect(0, 0, 256, 160);
      const gl = g.createLinearGradient(0, 8, 0, 152);
      gl.addColorStop(0, '#f6e2a8');
      gl.addColorStop(1, '#e0bd72');
      g.fillStyle = gl;
      g.fillRect(8, 8, 240, 144);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(14, 12, 50, 136);
      g.fillStyle = 'rgba(150,110,80,.45)';
      g.fillRect(8, 8, 70, 144);
      g.fillRect(178, 8, 70, 144);
      g.fillStyle = '#d4d6d6';
      g.fillRect(124, 0, 8, 160);
      if (gr) {
        g.fillStyle = '#3a3a3a';
        for (let x = 22; x < 256; x += 30) g.fillRect(x, 0, 4, 160);
        g.fillRect(0, 76, 256, 4);
      }
    });
  const shopTex = (i) =>
    ROWT.shop(
      `zb${i}`,
      ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6],
      ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6],
      300 + i * 3
    );

  const kits = [];
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, rot, col) => k.scooter(x, z, rot, col);

  const exposed = (L, lo) =>
    !ZB_ST.lots.some(
      (M) =>
        M !== L && M[2] === L[2] && (lo ? Math.abs(M[1] - L[0]) < 1.2 : Math.abs(M[0] - L[1]) < 1.2)
    ); // 這一側有沒有鄰居
  const sideShop = makeSideShop({ paint, shopGlass, shopTex, openTex, shutterTex, ROWT, FRONT });
  ZB_ST.lots.forEach((L, i) => {
    const sp = L[3],
      { ox, oz, ang, w, apron } = zbLotFrame(L),
      r = lcg(2000 + i * 7);
    const ex0 = L[2] > 0 ? exposed(L, true) : exposed(L, false),
      ex1 = L[2] > 0 ? exposed(L, false) : exposed(L, true);
    const k = vcKit(new Kit(I, ox, oz, ang));
    kits.push(k);
    const win2 = (x, y, ww, h, gr = true) =>
      r() < 0.2
        ? k.plane(litWin(gr), ww, h, x, y, -0.02, FRONT, { emissive: 0.5 })
        : win(k, x, y, ww, h, gr); // 兩成的窗亮著燈
    const nf = sp.nf || 4,
      fh = sp.fh || 3.0,
      gf = sp.gf || (nf === 1 ? 3.2 : 3.3),
      top = gf + (nf - 1) * fh,
      d = sp.d || 10;
    // 轉角另一面的店面畫在哪一面側牆：at 1 = s1 那端、0 = s0 那端（side -1 的 +x 朝 s 變小）
    const sideX = sp.side ? ((sp.side.at === 1) === L[2] > 0 ? w : 0) : -1;
    const glassWall = sp.bal === 'glass';
    const wm = glassWall && sp.glass ? sp.glass : wallMat(sp.wall);
    shell(k, w, d, top, wm);
    if (sp.low && !glassWall)
      k.box(-0.01, w + 0.01, 0, gf, -0.05, 0, wallMat(sp.low), { col: false, tile: [0.6, 0.6] });
    for (const x of [0, w - 0.12]) k.box(x, x + 0.12, 0, top, -0.06, 0, '#b9b6ae', { col: false }); // 分戶牆邊
    // ---- 一樓 ----
    if (sp.sign) {
      const [text, bg, fg, sub, style] = sp.sign,
        sw = w - 0.15,
        sh = 0.8;
      k.box(0.05, w - 0.05, gf - 0.85, gf - 0.03, -0.28, 0, bg, { col: false });
      k.plane(
        paint(text, bg, fg, sub, sw, sh, 128, style),
        sw,
        sh,
        w / 2,
        gf - 0.44,
        -0.29,
        FRONT,
        { emissive: 0.35 }
      );
    } else if (!sp.noband)
      k.box(0.05, w - 0.05, gf - 0.85, gf - 0.4, -0.06, 0, '#d8d6cf', { col: false });
    if (sp.awn) {
      const A = Array.isArray(sp.awn) ? sp.awn : [sp.awn],
        n = A.length > 1 ? Math.max(2, Math.round(w / 0.3)) : 1,
        bw = w / n;
      for (let j = 0; j < n; j++)
        k.box(
          -0.05 + j * bw,
          -0.05 + (j + 1) * bw + 0.01,
          gf - 1.05,
          gf - 0.97,
          -1.25,
          0,
          A[j % A.length],
          { col: false }
        );
      k.box(-0.05, w + 0.05, gf - 1.18, gf - 1.05, -1.27, -1.2, A[0], { col: false });
    }
    if (sp.tin) {
      const ty = nf === 1 ? top : sp.sign ? gf + 0.1 : gf - 0.35;
      k.box(-0.1, w + 0.1, ty, ty + 0.08, -1.3, nf === 1 ? d : 0, MR.roof, { col: false });
    }
    const doorW = sp.door === 0 ? 0 : 1.0,
      bodyW = w - doorW;
    if (doorW) k.plane(YHT.win(), doorW - 0.1, 2.2, w - doorW / 2 - 0.1, 1.1, -0.03, FRONT);
    const gh = gf - 1.0;
    const gk = sp.ground || 'shop';
    if (gk === 'shop' || gk === 'stall') {
      shopGlass(k, 0.15, bodyW - 0.2 + (doorW ? 0 : 0.2), 0, gh, shopTex(i));
      if (gk === 'stall') {
        k.box(0.3, bodyW - 0.3, 0, 0.95, -0.55, -0.05, '#c9c9c4', { col: false });
        k.box(0.3, bodyW - 0.3, 0.95, 1.0, -0.6, -0.02, '#8d9196', { col: false });
      }
    } else if (gk === 'open') {
      k.plane(openTex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.03, FRONT, { emissive: 0.3 });
      for (const x of [0.12, bodyW - 0.22])
        k.box(x, x + 0.1, 0, gh, -0.1, 0, '#8a8680', { col: false });
    } else {
      const tex = sp.sh ? shutterTex(sp.sh) : ROWT.shutter();
      k.plane(tex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.02, FRONT);
      if (gk === 'gate')
        k.plane(YHT.win(), bodyW - 0.5, gh - 0.4, bodyW / 2, gh / 2 - 0.15, -0.05, FRONT);
      k.box(0.15, bodyW - 0.15, gh - 0.02, gh + 0.2, -0.22, 0, '#7a7e80', { col: false }); // 鐵捲門的罩盒
    }
    if (sp.bikes)
      for (let j = 0; j < sp.bikes; j++) {
        const x = 0.2 + j * ((w - 2.2) / Math.max(1, sp.bikes - 0.5));
        bike(k, x, -0.9 - (j % 2) * 0.35, 0, bikeCols[(i + j) % 6]);
      }
    else if (w > 4 && r() < 0.6) {
      // 騎樓邊停幾台機車
      const n = 1 + ((r() * 3) | 0);
      let x = 0.3 + r() * 1.5;
      for (let j = 0; j < n && x < w - 1.7; j++) {
        const per = r() < 0.4;
        bike(
          k,
          per ? x + 0.3 : x,
          per ? -1.75 : -1.0 - r() * 0.3,
          per ? 1 : 0,
          bikeCols[(i * 3 + j) % 6]
        );
        x += per ? 0.8 : 1.9 + r() * 0.5;
      }
    }
    if (r() < 0.3) k.box(w - 0.38, w - 0.3, 0, top, -0.13, -0.05, '#8a8d90', { col: false }); // 外牆水管
    if ((gk === 'shop' || gk === 'stall') && w > 3.5 && r() < 0.4) {
      const sx = 0.4 + r() * (w - 2);
      k.box(sx, sx + 0.55, 0, 0.95, -1.5, -1.45, '#26282b', { col: false });
      k.box(sx + 0.04, sx + 0.51, 0.55, 0.9, -1.51, -1.49, '#f3efe4', { col: false });
    } // 門口立牌
    if (sp.banner) {
      const [bt, bb, bf] = sp.banner;
      k.plane(
        paint(bt, bb, bf, null, Math.min(w - 0.4, 3.4), 0.5, 96),
        Math.min(w - 0.4, 3.4),
        0.5,
        w / 2,
        gf - 1.5,
        -0.3,
        FRONT,
        { emissive: 0.15 }
      );
    }
    // ---- 樓上 ----
    for (let f = 1; f < nf; f++) {
      const y = gf + (f - 1) * fh,
        ww = w - 1.0;
      if (glassWall) {
        // 玻璃帷幕：一格一格的窗與白色分隔
        k.box(0.05, w - 0.05, y, y + 0.4, -0.08, -0.02, '#e9e9e6', { col: false });
        for (let x = 0.05; x <= w - 0.04; x += 1.4)
          k.box(x, x + 0.07, y, y + fh, -0.1, -0.02, '#e9e9e6', { col: false });
        if (f === 1)
          k.box(0.05, w - 0.05, y + fh - 0.06, y + fh, -0.18, -0.02, '#e9e9e6', { col: false });
        continue;
      }
      const bk = sp.bal || 'grille';
      if (bk === 'cage') {
        win2(w / 2, y + 1.45, ww - 0.4, 1.4, false);
        k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -0.75, 0, 'metal', { col: false });
        k.box(0.3, w - 0.3, y + 2.55, y + 2.62, -0.75, 0, 'metal', { col: false });
        for (let x = 0.3; x <= w - 0.29; x += 0.18)
          k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, 'metal', { col: false });
      } else if (bk === 'open') {
        k.box(0.3, w - 0.3, y, y + 0.9, -0.8, -0.7, wallMat(sp.wall), { col: false });
        win2(w / 2, y + 1.6, ww, 1.6, false);
      } else if (bk === 'rail') {
        win2(w / 2, y + 1.5, ww, 1.4, false);
        if (f === 1) {
          k.box(0.1, w - 0.1, y, y + 0.1, -1.0, 0, '#2b2b2b', { col: false });
          for (const yy of [0.5, 0.85, 1.2])
            k.box(0.1, w - 0.1, y + yy, y + yy + 0.04, -1.0, -0.96, '#2b2b2b', { col: false });
          for (const x of [0.1, w - 0.14])
            k.box(x, x + 0.04, y, y + 1.2, -1.0, -0.96, '#2b2b2b', { col: false });
        }
      } else if (bk === 'arch') {
        const n = Math.max(1, Math.round(ww / 3.2)),
          cw = ww / n;
        for (let j = 0; j < n; j++)
          k.plane(archWin, cw - 0.2, 1.7, 0.5 + cw * (j + 0.5), y + 1.5, -0.03, FRONT);
      } else if (bk === 'plain') win2(w / 2, y + 1.5, ww, 1.4, false);
      else win2(w / 2, y + 1.5, ww, 1.35);
      if (sp.hood) k.box(0.4, w - 0.4, y + 2.25, y + 2.33, -0.65, 0, sp.hood, { col: false });
      if (sp.fins)
        for (let x = 0.3; x <= w - 0.3; x += 0.55)
          k.box(x, x + 0.1, y + 0.1, y + fh - 0.1, -0.3, 0, sp.fins, { col: false });
      if (r() < 0.65)
        ac(
          k,
          r() < 0.5 ? 0.25 : w - 1.05,
          y + 0.1 + (r() < 0.5 ? 0 : 1.9),
          bk === 'cage' ? -1.2 : -0.45
        );
    }
    if (sp.big) {
      const [bt, bb, bf] = sp.big,
        y0 = gf + ((sp.bigFrom || 2) - 1) * fh,
        bh = top - y0 - 0.1,
        bw = sp.bigW || w - 0.6,
        bx = sp.bigW ? w * (sp.bigAt || 0.5) : w / 2;
      k.plane(paint(bt, bb, bf, null, bw, bh, 40), bw, bh, bx, y0 + bh / 2 + 0.05, -0.06, FRONT, {
        emissive: 0.15,
      });
    }
    if (sp.sign2) {
      const [bt, bb, bf] = sp.sign2;
      k.box(0.1, w - 0.1, gf + 0.3, gf + 1.5, -0.2, -0.06, bb, { col: false });
      k.plane(
        paint(bt, bb, bf, null, w - 0.3, 1.1, 100),
        w - 0.3,
        1.1,
        w / 2,
        gf + 0.9,
        -0.21,
        FRONT,
        { emissive: 0.3 }
      );
    }
    if (sp.vert) {
      const [text, bg, fg] = sp.vert,
        len = 0.6 * text.length + 0.2;
      for (const sd of [-1, 1])
        k.plane(
          ROWT.vert(`zb${text}${bg}`, bg, fg, text),
          0.6,
          len,
          0.25 + sd * 0.04,
          gf + 0.4 + len / 2,
          -0.55,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
    }
    if (sp.round) {
      const [text, bg, fg] = sp.round;
      for (const sd of [-1, 1])
        k.plane(
          roundSign(text, bg, fg),
          0.85,
          0.85,
          w - 0.3 + sd * 0.03,
          gf + 1.5,
          -0.7,
          (sd * Math.PI) / 2,
          { transparent: true, emissive: 0.3 }
        );
    }
    if (sp.arch) {
      k.box(0, w, top + 0.12, top + 0.95, d - 0.2, d, sp.arch, { col: false });
      k.box(0, 0.12, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false });
      k.box(w - 0.12, w, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false });
      k.box(0, w, top + 0.12, top + 0.95, -0.02, 0.1, sp.arch, { col: false });
      k.plane(archRow, w, 0.8, w / 2, top + 0.53, -0.04, FRONT);
    }
    if (sp.tower) {
      const T = sp.tower,
        back = T.back || 2.5,
        tn = T.nf || 8,
        tw = wallMat(T.wall || '#e9e7e3'),
        th = tn * 3.0;
      k.box(
        0.3,
        w - 0.3,
        top + 0.12,
        top + 0.12 + th,
        back,
        T.depth ? back + T.depth : d - 0.5,
        tw
      );
      for (let f = 0; f < tn; f++) {
        const y = top + 0.12 + f * 3.0;
        k.box(0.3, w - 0.3, y + 0.05, y + 0.2, back - 1.0, back, T.balc || '#6a6070', {
          col: false,
        });
        win2(w / 2, y + 1.7, w - 1.6, 1.4, false);
        if (r() < 0.5) ac(k, 0.8 + r() * (w - 3), y + 0.3, back - 0.5);
      }
    }
    // 裙樓屋頂的太陽能板（高樓後面那段），一排排深藍色斜板；不用 r()
    if (sp.solar) {
      const z0 = sp.tower && sp.tower.depth ? sp.tower.back + sp.tower.depth + 1 : 1;
      for (let z = z0; z < d - 1.6; z += 2.1)
        for (let x = 0.8; x < w - 2.2; x += 3.4) {
          k.box(x, x + 3.2, top + 0.3, top + 0.42, z, z + 1.7, '#2a3a5a', { col: false });
          k.box(x + 0.1, x + 3.1, top + 0.12, top + 0.3, z + 0.7, z + 0.9, '#8a8d90', {
            col: false,
          });
        }
    }
    // 後牆與沒有鄰居的側牆開窗，頂樓隨機加水塔／頂樓加蓋，從高處或巷口看才不會是一整面素牆
    if (nf > 1) {
      for (let f = 0; f < nf; f++) {
        const y = f === 0 ? 0.3 : gf + (f - 1) * fh + 0.3,
          n = w > 7 ? 3 : w > 4 ? 2 : 1;
        for (let j = 0; j < n; j++)
          k.plane(YHT.win(), 1.5, 1.1, (w * (j + 0.5)) / n, y + 1.1, d + 0.03, 0);
        for (const [x, rot, ex, xs] of [
          [-0.03, -Math.PI / 2, ex0, 0],
          [w + 0.03, Math.PI / 2, ex1, w],
        ])
          if (ex && !(sideX === xs && f === 0))
            for (const zc of [d * 0.3, d * 0.7]) k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, zc, rot);
      }
    }
    if (sp.side) sideShop(k, sp.side, sideX, w, d, gf, top, i);
    if (nf > 1 && !sp.roof) {
      const q = r();
      if (q < 0.3)
        k.cyl(w * (0.3 + r() * 0.4), d * 0.7, 0.55, top + 0.12, top + 1.4, '#d8d8d0', { seg: 10 });
      else if (q < 0.55) {
        const hx = w * (0.15 + r() * 0.3),
          hz = d * 0.35;
        k.box(hx, hx + 2.2, top + 0.12, top + 2.6, hz, hz + 2.4, wallMat(sp.wall), { col: false });
        k.box(hx - 0.15, hx + 2.35, top + 2.6, top + 2.72, hz - 0.15, hz + 2.55, MR.roof, {
          col: false,
        });
      } else if (q < 0.7) {
        k.box(0.3, w - 0.3, top + 0.12, top + 2.3, d * 0.45, d - 0.4, '#3a6fb0', { col: false });
        k.box(0.1, w - 0.1, top + 2.3, top + 2.4, d * 0.4, d - 0.2, MR.roof, { col: false });
      }
    }
    if (sp.roof === 'shack') {
      k.box(0.4, w - 0.4, top + 0.12, top + 2.2, 2.0, d - 0.5, MR.roof, { col: false });
      k.box(0.2, w - 0.2, top + 2.2, top + 2.3, 1.4, d, MR.roof, { col: false });
    } else if (sp.roof === 'tank') {
      k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 });
      if (w > 4.5) k.cyl(w / 2 + 1.3, d - 3, 0.5, top + 0.12, top + 1.3, '#cfd2d4', { seg: 10 });
    } else if (sp.roof === 'bill' && sp.bill) {
      // 屋頂鐵架看板
      const [bt, bb, bf, bw0, bh] = sp.bill,
        bw = Math.min(bw0 || w - 0.6, w),
        y0 = top + (nf === 1 ? 0.9 : 0.4);
      k.plane(paint(bt, bb, bf, null, bw, bh, 80), bw, bh, w / 2, y0 + bh / 2, 0.45, FRONT, {
        emissive: 0.35,
        double: true,
      });
      k.box(w / 2 - bw / 2 - 0.04, w / 2 + bw / 2 + 0.04, y0 - 0.06, y0, 0.4, 0.5, '#4a4d50', {
        col: false,
      });
      for (const x of [w / 2 - bw / 2 + 0.2, w / 2 + bw / 2 - 0.25])
        k.box(x, x + 0.06, top, y0 + bh * 0.6, 0.38, 0.5, '#4a4d50', { col: false });
    }
    if (nf === 1) {
      // 一樓鐵皮屋：浪板屋頂往後傾
      k.box(-0.15, w + 0.15, top - 0.12, top, -0.4, d, sp.roofCol || MR.roof, { col: false });
    }
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
  });

  // ---- 中原國小圍牆（Google 街景 2024-08）：低矮洗石子花台、灌木、紅磚方柱加黑色鐵欄杆、行道大樹 ----
  ZB_ST.fences.forEach(([s0, s1, side], i) => {
    const { ox, oz, ang, w, apron } = zbLotFrame([s0, s1, side, { set: setAt(s0) + 0.35 }]),
      r = lcg(4000 + i);
    const k = vcKit(new Kit(I, ox, oz, ang));
    kits.push(k);
    k.box(0, w, -0.4, 0.55, 0.2, 1.3, '#c9c5ba'); // 花台
    k.wallLine(0, 0.25, w, 0.25, -0.4, 2.0);
    k.box(0.1, w - 0.1, 0.55, 1.1, 0.35, 1.15, '#3f7a3a', { col: false }); // 灌木
    const n = Math.max(1, Math.round(w / 4)),
      bay = w / n;
    for (let j = 0; j <= n; j++) {
      const x = Math.min(w - 0.24, Math.max(0, j * bay - 0.12));
      k.box(x, x + 0.24, 0.55, 2.0, 0.1, 0.4, '#a0523a', { col: false });
      k.box(x - 0.03, x + 0.27, 2.0, 2.08, 0.07, 0.43, '#e8e6e0', { col: false });
    }
    for (let j = 0; j < n; j++)
      k.plane(bars, bay - 0.34, 1.0, (j + 0.5) * bay, 1.35, 0.25, FRONT, {
        transparent: true,
        double: true,
      });
    for (let x = 4 + r() * 3; x < w - 3; x += 9 + r() * 5) {
      // 大樹：樹幹加兩三團樹冠
      const h = 5 + r() * 2.5,
        s = 1.2 + r() * 0.6;
      k.cyl(x, 0.85, 0.22, 0, h, '#6a4a30', { seg: 6, col: true });
      for (const [dx, dy, dz, q] of [
        [0, h + 0.6, 0, 1],
        [-1.2, h - 0.6, 0.4, 0.8],
        [1.3, h - 0.3, -0.2, 0.85],
      ]) {
        const g = new THREE.SphereGeometry(s * q, 7, 5);
        g.translate(x + dx, dy, 0.85 + dz);
        k._part(VC, paintGeo(g, r() < 0.5 ? '#3f7a3a' : '#4b8a3e'));
      }
    }
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
  });
  timesParking(I, kits, Kit, vcKit, lcg);
  finishRow(scene, kits);
}

// Times 中壢中原夜市停車場（寶雅後面，data/cycu.json 的 parking 區）：Google 衛星與國土測繪 2024 正射上是一整片平面停車場，
// 停車格一排排和西南邊（寶雅那排的後牆）平行，中間兩條車道，平常停得很滿。白色停車格線＋停放的汽車；自己的亂數，不碰全圖亂數
const TIMES_LOT = [
  [-528.4, 118.3],
  [-515.7, 138.9],
  [-491.2, 159.0],
  [-522.7, 183.4],
  [-556.6, 142.1],
];
function timesParking(I, kits, Kit, vcKit, lcg) {
  const inLot = (x, z) => {
    let c = false;
    for (let i = 0, j = TIMES_LOT.length - 1; i < TIMES_LOT.length; j = i++) {
      const [xi, zi] = TIMES_LOT[i],
        [xj, zj] = TIMES_LOT[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  // 原點在西南邊的東南端，+x 沿西南邊往西北，+z 往東北進停車場
  const [ox, oz] = TIMES_LOT[3],
    ux = (TIMES_LOT[4][0] - ox) / 53.43,
    uz = (TIMES_LOT[4][1] - oz) / 53.43;
  const k = vcKit(new Kit(I, ox, oz, Math.atan2(uz, ux)));
  kits.push(k);
  const W = (x, z) => [ox + x * ux - z * uz, oz + x * uz + z * ux];
  const r = lcg(7310);
  const CARS = ['#e8e8e6', '#1e1f22', '#9a9ea3', '#c9c9c4', '#2a3a5a', '#7a1e22', '#d8d4c8'];
  // 停車格排（離西南邊的 z 範圍）：中間隔 6 m 車道
  for (const [z0, z1] of [
    [1.0, 6.0],
    [12.0, 17.0],
    [17.0, 22.0],
    [28.0, 33.0],
    [33.0, 38.0],
  ])
    for (let x = 2; x < 60; x += 2.5) {
      const ok = [
        [x, z0],
        [x + 2.5, z0],
        [x, z1],
        [x + 2.5, z1],
      ].every(([a, b]) => inLot(...W(a, b)));
      if (!ok) continue;
      k.box(x - 0.06, x + 0.06, 0.02, 0.05, z0, z1, '#f2f2ee', { col: false });
      k.box(x + 2.44, x + 2.56, 0.02, 0.05, z0, z1, '#f2f2ee', { col: false });
      if (r() < 0.72) k.car(x + 1.25, (z0 + z1) / 2, r() < 0.5 ? 0 : Math.PI, CARS[(r() * 7) | 0]);
    }
}
