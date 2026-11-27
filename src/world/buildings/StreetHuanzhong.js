// 環中東路（校園東南側那段）與環中東路708巷兩側的街屋（照 Google 街景 2024-07／2026-05、國土測繪 2024 正射與 Google 衛星建模，只做外觀，不能進入）。
// 寫法比照 src/world/buildings/StreetZhongbei.js：每一格是 [ref, s0, s1, side, spec]
//   ref  參考線：'HN' 環中東路北側車道、'HS' 南側車道、'L8' 環中東路708巷（s=0 在環中東路巷口，往巷內走）
//   s    沿參考線由東往西量的公尺數；side +1 = 往西走的右手邊（HN 的北側／靠校園側），-1 = 左手邊（HS 的南側）
//   spec 欄位與 src/world/buildings/StreetZhongbei.js 相同（nf、gf、fh、d、wall、low、sign、ground、sh、awn、bal、glass、hood、vert、round、banner、
//        roof、bill、tin、arch、fins、big、sign2、noband、roofCol、door、tower、bikes、set）
//   另外加的通用選項：own '名稱'（這一格不蓋制式街屋，交給 buildHuanzhongStreet 裡 OWN[名稱] 的專用量體；座標、深度 d、保留範圍照樣用這一格）、
//        fp（自訂保留範圍，區域座標多邊形；楔形基地用）、pave（門前鋪紅磚人行道；給 '#hex' 就鋪成那個顏色的素面，貼著地形）、trees [x…]（行道樹；[x, 樹幹高, 樹冠半徑] 是大樹）、mc [[x0,x1]…]（垂直停放的機車格）、poles [x…]（水泥電線桿）、
//        verge [o0, o1, 缺口]（離車道中心 o0～o1 公尺的植栽帶：草地＋紅葉石楠矮籬，缺口 [[x0,x1]…] 留給穿過的步道）、apron（限制門前鋪面的寬度，0 = 不鋪）
// 每一格自成一個 Kit，立面對著街道；收尾用 finishRow 一次合併。
// 這個檔案不 import src/world/Interiors.js（Kit、材質、貼圖工具由 src/world/zones/Zones.js 呼叫 buildHuanzhongStreet 時從 X 傳進來），
// src/world/zones/Zones.js 直接 import 這裡的 HZ_ST.drop 與 hzFootprints() 來刪填充樓、保留空地。

// 參考線（data/cycu.json 的道路中心線，遊戲座標 x 東、z 南）
import { H } from '../Terrain.js';
import { shrinkFont } from '../../graphics/FitText.js';

export const HZ_REF = {
  HN: [
    [594.4, 80.3],
    [562.6, 105.5],
    [532.8, 129.6],
    [531.7, 130.5],
    [511.5, 146.5],
    [506.5, 150.5],
    [486.4, 166.5],
    [481.3, 170.4],
    [463.1, 184.8],
    [461.1, 186.4],
    [453.2, 192.7],
    [441, 202.4],
    [400.8, 234.6],
    [380.6, 250.5],
    [375.6, 254.5],
    [355.4, 270.5],
    [347.2, 277.1],
    [327, 293.5],
    [321.1, 298.3],
    [309.1, 307.8],
    [284.7, 327],
    [254.2, 351.3],
    [223, 376.4],
    [192.7, 400.9],
    [184, 407.6],
    [178, 412.6],
    [171.6, 417.7],
    [161.6, 426],
    [131.2, 450.4],
    [124.9, 455.1],
    [99.7, 474.9],
    [67.5, 500.5],
    [36.5, 523.8],
    [11.8, 543.1],
    [-0.3, 552.2],
    [-25.2, 570.9],
    [-49.9, 589.9],
    [-74.7, 608.9],
    [-99.5, 627.9],
    [-124.5, 646.5],
  ],
  HS: [
    [576.6, 104.2],
    [527.6, 145.4],
    [519.5, 152.2],
    [512.5, 158],
    [487.4, 178.1],
    [469, 192.1],
    [447, 210],
    [406.8, 242.1],
    [386.5, 257.9],
    [362.2, 277.3],
    [339.9, 295.1],
    [315.6, 314.6],
    [277.4, 345],
    [246.5, 370.3],
    [215.2, 395.2],
    [184, 420.2],
    [173.5, 429.1],
    [156.2, 443.1],
    [131, 462.8],
    [105.8, 482.7],
    [78.8, 503.4],
    [74, 507],
    [42.6, 531.6],
    [17.8, 550.6],
    [6.2, 559.7],
    [-19.1, 578.8],
    [-44, 597.7],
    [-68.8, 616.7],
    [-93.6, 635.7],
    [-118.4, 654.5],
  ],
  L8: [
    [309.1, 307.8],
    [301.5, 306.4],
    [283, 297.5],
    [274.8, 293.2],
    [260.5, 289],
    [244.7, 284.2],
    [235.3, 302.8],
    [232.8, 308.8],
    [198.6, 294.8],
    [194.3, 298.2],
    [169.5, 287.9],
    [165.4, 286.8],
    [160.9, 283],
    [156.2, 260.7],
    [153.6, 259.4],
    [139.1, 259],
    [130.2, 256.5],
    [116.3, 247.2],
    [113.5, 245.6],
    [110.9, 249.2],
    [96.3, 282.1],
    [87, 290.2],
    [79, 293.4],
  ],
};
// 路寬的一半（data/cycu.json）：環中東路單側車道 7.4、708巷 5
const HALF = { HN: 3.7, HS: 3.7, L8: 2.5 };
// 立面離參考線的預設距離（各格可用 spec.set 覆寫）
const SET = { HN: 9.5, HS: 9.5, L8: 4.0 };

export const HZ_ST = {
  ownSign: [
    'YAMAHA',
    '19house炙燒牛排',
    '有魚兩棲爬蟲專賣店',
    '鳳味坊養生烏骨雞',
    '振宇五金',
    'Garden hair salon',
    'Mr.May義式百匯',
    '台灣中油',
    '吳二哥花雕雞',
    '極限專賣 EXSHOP',
    '世國汽車輪胎電機行',
    '賀眾牌',
    '大輪車業',
  ], // 街屋自己掛招牌的店名，POI 不再另外掛
  drop: [
    'f2_5',
    'f2_6',
    'f2_7',
    'f2_8',
    'f2_9',
    'f2_10',
    'f2_11',
    'f2_12',
    'f2_13',
    'f2_14',
    'f2_15',
    'f2_16',
    'f2_17',
    'f2_18',
    'f2_19',
    'f2_20',
    'f2_21',
    'f2_22',
    'f2_23',
    'f2_24',
    'f2_25',
    'f2_46',
    'f2_50',
    'f2_53',
    'f2_76',
    'f2_77',
    'f2_78', // A 段
    'f2_79',
    'f2_80',
    'f2_81',
    'f2_82',
    'f2_83',
    'f2_101',
    'f2_114',
    'f2_117',
    'f2_118', // B 段（f2_101、f2_114、f2_117、f2_118 是後排：實際在車棚屋頂下、美髮店後面與工地裡）
    'f2_630',
    'f2_632',
    'f2_633',
    'f2_634',
    'f2_635', // C 段（f2_631 在聯南廠房屋頂底下的深處、緊貼 685 巷，留著當廠房後半）
    'f2_156',
    'f2_157',
    'f2_158',
    'f2_159',
    'f2_160',
    'f2_174',
    'f2_175',
    'f12',
    'f1327', // D 段（北側停車場、悍將與 1973、南側空地與變電所的位置）
    'f2_45',
    'f2_44',
    'f2_43',
    'f2_42',
    'f2_41',
    'f2_52',
    'f2_51', // E 段（708 巷兩側）
    'f2_31',
    'f2_32',
    'f2_33',
    'f2_34',
    'f2_35',
    'f2_36',
    'f2_37',
    'f2_38',
    'f2_39',
    'f2_40',
    'f2_47', // F 段（708 巷中段南側，機車平台後面那排）
  ], // 被自建街屋取代的填充樓（全部是 synthetic，各自用自己的亂數，刪掉不影響別的東西）
  lots: [
    // ---- A 段：環中東路北側（靠校園側），708巷口往西到 s≈512（街景 2026-05，少數 2024-07；國土測繪 2024 正射）----
    // 全段沒有騎樓：立面離車道中心 12～12.5 m（鐵皮屋那排 10.5 m），前面是約 7.5 m 寬的紅磚人行道，靠車道那排是機車格與修成圓球的行道樹。
    // 實際只有 Yamaha、19 House、5 樓磁磚樓、7 樓辦公大樓、一排鐵皮屋、振宇五金、5 樓紅磚色樓；s 433～448.5 是貨櫃屋、車道、停車場與雜木空地
    [
      'HN',
      376.5,
      387.5,
      1,
      {
        own: 'yamaha',
        set: 12,
        d: 15.5,
        fp: [
          [-0.1, -8.5],
          [11.1, -8.5],
          [11.1, 15.5],
          [7.6, 15.5],
          [0.2, 0],
        ],
        pave: 1,
        trees: [4.5],
        mc: [[6.0, 10.7]],
      },
    ], // 遊戲裡的 708 巷比實景偏西：東牆從 s375 退到 376.5，背面斜邊照遊戲的巷子切
    [
      'HN',
      387.5,
      400,
      1,
      {
        own: 'house19',
        set: 12,
        d: 14.5,
        pave: 1,
        trees: [4.5],
        mc: [
          [0.3, 3.2],
          [6.0, 12.2],
        ],
      },
    ],
    [
      'HN',
      400,
      412.5,
      1,
      {
        own: 'a3',
        set: 12,
        d: 13.5,
        pave: 1,
        trees: [4.0],
        mc: [
          [0.3, 2.7],
          [5.5, 12.2],
        ],
      },
    ],
    [
      'HN',
      412.5,
      433,
      1,
      {
        own: 'a4',
        set: 12.5,
        d: 11.5,
        pave: 1,
        trees: [3.5, 15.5],
        mc: [
          [0.3, 2.2],
          [5.0, 14.2],
          [17.0, 20.2],
        ],
      },
    ],
    ['HN', 433, 448.5, 1, { own: 'gapA', set: 12, d: 23.5, pave: 1, trees: [10.2], poles: [11.4] }],
    [
      'HN',
      448.5,
      453,
      1,
      { own: 'shedBlue', set: 10.5, d: 7.5, pave: 1, trees: [3.5], mc: [[0.3, 2.2]] },
    ],
    ['HN', 453, 462, 1, { own: 'temple', set: 10.5, d: 7.5, pave: 1, mc: [[0.5, 8.6]] }],
    [
      'HN',
      462,
      471,
      1,
      { own: 'tangfeng', set: 10.5, d: 7.5, pave: 1, trees: [1.0], mc: [[2.6, 8.6]] },
    ],
    ['HN', 471, 474, 1, { own: 'a11', set: 12, d: 6, pave: 1 }],
    [
      'HN',
      474,
      490.5,
      1,
      { own: 'zhenyu', set: 12.5, d: 17, pave: 1, trees: [4.0, 15.0], mc: [[9.5, 13.5]] },
    ],
    [
      'HN',
      490.5,
      503.5,
      1,
      { own: 'a13', set: 12.5, d: 21, pave: 1, trees: [10.5], poles: [9.4], mc: [[0.3, 8.6]] },
    ],
    [
      'HN',
      503.5,
      511.5,
      1,
      { own: 'jiayu', set: 13, d: 7.5, pave: 1, poles: [3.5], mc: [[4.5, 7.8]] },
    ],
    // ---- B 段：環中東路北側 s 511.5～600（街景 2026-05；國土測繪 2024 正射）----
    // 實際是紅鐵皮大車棚、退到後面的 Garden 花園美髮店、太陽帝國大廈（OSM 建物 w1113208995，保留不動）、圍著白色圍籬的工地（2026-05 蓋到 3～4 層、包著藍色防護網）
    [
      'HN',
      511.5,
      527,
      1,
      { own: 'carport', set: 11, d: 23.4, pave: 1, trees: [2.5], mc: [[0.3, 5.0]] },
    ],
    ['HN', 527, 536.5, 1, { own: 'garden', set: 11, d: 16.5, pave: 1, trees: [1.0] }],
    [
      'HN',
      563.5,
      600,
      1,
      { own: 'site', set: 10, d: 24, pave: 1, trees: [1.5, 13.5, 30.5], poles: [11] },
    ],
    // ---- C 段：環中東路南側（HS、side -1），708 巷口對面往西到 s≈589（街景 2026-05；國土測繪 2024 正射）----
    // 整段沒有兩層以上的街屋：黃色的 M'car 收購站、退縮的天王汽車修車棚、聯南實業三棟綠色鐵皮廠房、九良汽車的中古車車棚、金發財停車場車道、
    // 慈濟志業園區的工地圍籬（退到離車道中心 12.5 m，前面是 2026 年新做的植栽帶與灰色人行道）、慈濟公園的圓形廣場、807 檳榔攤與旁邊的空地、深處的鐵皮倉庫。
    // 這一側的區域座標 +x 朝東（s 變小）：x = 那一格的 s1 − s。東半段沒有人行道，車道邊到牆面是水泥地
    ['HS', 339.5, 348, -1, { own: 'mcar', set: 6, d: 12, pave: '#a8a6a0' }], // 實際東牆在 s≈337，遊戲的號誌桿立在 s 337.7：東牆退到 339.5 才不會把它擠掉
    [
      'HS',
      348,
      364,
      -1,
      {
        own: 'tianwang',
        set: 9,
        d: 14,
        pave: '#a8a6a0',
        fp: [
          [-0.1, -1.5],
          [5.5, -1.5],
          [5.5, -5.5],
          [16.1, -5.5],
          [16.1, 14],
          [-0.1, 14],
        ],
      },
    ], // 保留範圍避開前院西北角的公車站牌（慈濟志業園區站）
    ['HS', 364, 397.5, -1, { own: 'liannan', set: 6.5, d: 30, pave: '#a8a6a0', poles: [17.5] }],
    ['HS', 398.5, 431, -1, { own: 'jiuliang', set: 7.5, d: 11.3, pave: '#a8a6a0' }],
    [
      'HS',
      431,
      447,
      -1,
      {
        own: 'drive',
        set: 6.5,
        d: 24.5,
        apron: 0,
        fp: [
          [-0.1, -3.0],
          [16.1, -3.0],
          [18.5, 4],
          [30.5, 24.5],
          [19, 24.5],
          [9, 4],
          [-0.1, 4],
        ],
      },
    ],
    [
      'HS',
      447,
      466.5,
      -1,
      {
        own: 'sitefence',
        set: 12.5,
        d: 0.8,
        pave: '#b9b7b0',
        verge: [4.2, 8],
        trees: [
          [4.5, 4.6, 2.3],
          [14.5, 4.2, 2.1],
        ],
        note: 0.9,
      },
    ], // s 466.5～473 是遊戲裡的 service 路（工地大門），不蓋東西
    [
      'HS',
      473,
      511,
      -1,
      {
        own: 'sitefence',
        set: 12.5,
        d: 12.2,
        pave: '#b9b7b0',
        verge: [4.2, 8],
        trees: [
          [3, 4.4, 2.2],
          [11, 4.8, 2.4],
          [19, 4.2, 2.1],
          [27, 4.6, 2.3],
        ],
        gate: [32.5, 38],
        turn: 12,
        fp: [
          [-0.6, -9.0],
          [38.1, -9.0],
          [38.1, 0.8],
          [0.6, 0.8],
          [0.6, 12.2],
          [-0.6, 12.2],
        ],
      },
    ],
    [
      'HS',
      511,
      553.5,
      -1,
      {
        own: 'park',
        set: 12,
        d: 20.5,
        pave: '#b9b7b0',
        verge: [
          4.2,
          8,
          [
            [0, 5],
            [22.5, 27.5],
            [34, 40.5],
          ],
        ],
        trees: [
          [5.5, 4.4, 2.2],
          [13.5, 4.8, 2.4],
          [21.5, 4.4, 2.2],
          [29.5, 4.6, 2.3],
        ],
        poles: [36.5],
        fp: [
          [-0.1, -8.5],
          [42.6, -8.5],
          [42.6, 1.2],
          [28.5, 1.2],
          [18.5, 9],
          [18.5, 16],
          [13, 20.5],
          [-0.1, 20.5],
        ],
      },
    ],
    [
      'HS',
      554,
      564,
      -1,
      {
        own: 'shop807',
        set: 6.5,
        d: 22,
        pave: '#a8a6a0',
        poles: [9.6],
        fp: [
          [-0.1, -3.0],
          [10.1, -3.0],
          [12.8, 5],
          [12.8, 22],
          [-0.1, 22],
        ],
      },
    ],
    ['HS', 564, 589, -1, { own: 'lot807', set: 6, d: 14, pave: '#a8a6a0', poles: [0.4] }],
    ['HS', 573, 587, -1, { own: 'warehouse', set: 20, d: 16, apron: 0 }],
    // ---- D 段：708 巷口以東到新中北路口，南北兩側（街景 2026-05；國土測繪 2024 正射）----
    // 北側沒有校地圍牆，也沒有人行道：路緣外直接是各家的水泥地，沿街是一層樓的鐵皮店面、檳榔攤、車行車棚、修車廠，只有 708 巷口三間三層舊透天。
    [
      'HN',
      62,
      97.5,
      1,
      {
        own: 'dn1',
        set: 5,
        d: 25,
        fp: [
          [-0.1, -1.4],
          [35.6, -1.4],
          [35.6, 25],
          [19.5, 25],
          [19.5, 13],
          [-0.1, 11.4], // 這一角離新中北路中心線只剩 4.3 m（路寬 8.5），保留範圍不能蓋到車道
        ],
      },
    ], // 後面 off 22～36 是新中北路，餐廳只做到 off 30
    ['HN', 98, 104.5, 1, { own: 'muke', set: 5.5, d: 3.5 }],
    ['HN', 105, 114.5, 1, { own: 'dn3', set: 9.5, d: 10, poles: [6] }],
    [
      'HN',
      114.5,
      123.5,
      1,
      {
        own: 'musicbar',
        set: 6.5,
        d: 5,
        fp: [
          [-0.1, -3.0],
          [9.1, -3.0],
          [9.1, 2.4],
          [21.6, 2.4],
          [21.6, 21.5],
          [2.4, 21.5],
          [2.4, 5.1],
          [-0.1, 5.1],
        ],
      },
    ], // 後面那棟紅屋頂大屋延伸到 s 136
    ['HN', 123.5, 130.5, 1, { own: 'jiayidong', set: 5, d: 4 }],
    ['HN', 130.5, 134.5, 1, { own: 'yshed', set: 5, d: 3 }],
    ['HN', 137, 151.5, 1, { own: 'steak', set: 11, d: 7 }],
    ['HN', 152.5, 178, 1, { own: 'kuyi', set: 6.5, d: 17.5, poles: [23.8] }], // s 178～184.5 是遊戲裡的 service 路（通往後面），不蓋東西
    ['HN', 184.5, 195, 1, { own: 'hanjiang', set: 8, d: 30 }],
    ['HN', 195, 218, 1, { own: 'f1973', set: 10, d: 30 }],
    ['HN', 218, 242.5, 1, { own: 'gravel73', set: 5, d: 33 }],
    ['HN', 242.5, 257.5, 1, { own: 'jiuyu', set: 7.5, d: 16 }],
    ['HN', 257.5, 273, 1, { own: 'florist', set: 7.5, d: 17 }],
    ['HN', 274, 281.5, 1, { own: 'alishan', set: 5.5, d: 4 }],
    ['HN', 281.5, 293.5, 1, { own: 'lot15', set: 5, d: 9, poles: [0.4] }],
    [
      'HN',
      293.5,
      318.5,
      1,
      {
        own: 'hot',
        set: 10.5,
        d: 19.5,
        fp: [
          [-0.1, -7.0],
          [25.1, -7.0],
          [25.1, 2.5],
          [4.5, 19.5],
          [-2, 19.5],
        ],
      },
    ], // 屋身斜向東北，西北角讓開埤塘公園的步道
    ['HN', 322, 346, 1, { own: 'plaza', set: 5, d: 23, poles: [-0.3] }],
    ['HN', 347, 352, 1, { own: 'liangshi', set: 9, d: 10 }],
    ['HN', 352, 359, 1, { own: 'spring', set: 9, d: 10 }],
    [
      'HN',
      359,
      367,
      1,
      {
        own: 'corner18',
        set: 9,
        d: 19,
        apron: 0,
        fp: [
          [-0.1, -5.5],
          [5.5, -5.5],
          [9.95, 1.6],
          [17.05, 14.85],
          [8.8, 18.85],
          [-0.1, 1.9],
        ],
      },
    ], // 夾在環中東路與 708 巷之間的楔形，西南角削角，前院讓開巷口
    // 南側：空地、斜放的台電變電所、兩棟 OSM 真實建物（w1034725687 森林川家具、w1034725686 響叮噹）裡分別是 DAIKIN／傑輝／森林川與響叮噹／尚揚／森棲棲，
    // 這兩棟不 drop、不改輪廓，只把立面招牌做成貼在它們北牆外的薄板（edgeKit），響叮噹那棟用 hzFix 把高度改成兩層樓高；再往西是中油加油站、停車棚、環北印刷
    ['HS', 48, 72, -1, { own: 'ds1e', set: 5, d: 25 }],
    [
      'HS',
      77,
      96,
      -1,
      {
        own: 'ds1w',
        set: 5,
        d: 25,
        fp: [
          [-0.1, -1.5],
          [19.1, -1.5],
          [19.1, 2],
          [14, 25],
          [-0.1, 25],
        ],
      },
    ], // s 72～77 是遊戲裡的 service 路（綠光花園的車道）
    [
      'HS',
      97.5,
      131,
      -1,
      {
        own: 'substation',
        set: 10,
        d: 37,
        fp: [
          [-0.1, -6.5],
          [33.6, -6.5],
          [33.6, 14.5],
          [21.6, 36.5],
          [6, 29.5],
          [-0.1, 15],
        ],
      },
    ],
    ['HS', 131.5, 146, -1, { own: 'daikin', set: 3.8, d: 0.5, apron: 0 }],
    ['HS', 146, 159.5, -1, { own: 'jiehui', set: 3.8, d: 0.5, apron: 0 }],
    ['HS', 159.5, 190, -1, { own: 'senlin', set: 3.8, d: 0.5, apron: 0 }],
    ['HS', 194.5, 234, -1, { own: 'xdd', set: 3.8, d: 0.5, apron: 0 }],
    ['HS', 234, 254, -1, { own: 'shangyang', set: 3.8, d: 0.5, apron: 0 }],
    ['HS', 254, 266.5, -1, { own: 'senqiqi', set: 3.8, d: 0.5, apron: 0 }],
    [
      'HS',
      267,
      296,
      -1,
      {
        own: 'cpc',
        set: 9.5,
        d: 24,
        apron: 0,
        fp: [
          [-0.1, -5.9],
          [18.0, -5.9],
          [19.3, 4],
          [20.8, 14],
          [21, 24],
          [-0.1, 24],
        ],
      },
    ], // s 270～276 是遊戲裡的 service 路（加油站東側往後面），不鋪不蓋
    ['HS', 296, 310, -1, { own: 'teal', set: 12, d: 23 }],
    ['HS', 310, 317, -1, { own: 'mutou', set: 5, d: 15 }],
    ['HS', 317, 327.5, -1, { own: 'huanbei', set: 6.5, d: 12 }],
    // ---- E 段：環中東路708巷 巷口～s≈96（街景 2024-08；國土測繪 2024 正射）----
    // 很窄的單線巷，兩側房子貼著路緣、沒有人行道；北側（side +1）巷口轉角屋（在 D 段 corner18）、10 號、12 號、塗鴉水泥牆、小車庫、紅磚圍牆，轉南後西側是校內機車停車場；
    // 南側（side -1）是兩間破舊的 2 樓水泥老屋，之後一整片塗鴉圍牆圍起來的空地（藤蔓方塊、水塔、柏樹），轉角往南的死巷旁一棟 2 樓米色老屋。
    // 遊戲裡的 708 巷比實景偏西，巷口南側被 A 段 Yamaha 與 19 House 的背面佔到 s≈35，所以 S2、S3 往巷內挪了約 5 m
    ['L8', 26.5, 36.5, 1, { own: 'lane10', set: 3.3, d: 10, apron: 0 }],
    ['L8', 36.5, 43, 1, { own: 'lane12', set: 2.8, d: 11, apron: 0 }],
    ['L8', 43, 50, 1, { own: 'netwall', set: 2.8, d: 9, apron: 0 }],
    ['L8', 50, 53.5, 1, { own: 'garage5', set: 3.2, d: 5, apron: 0 }],
    ['L8', 53.5, 68.5, 1, { own: 'brickwall', set: 2.8, d: 1.2, apron: 0 }], // 後面就是校內的景觀系館（OSM w587175193，只改成 4 層樓高）
    ['L8', 72, 93.5, 1, { own: 'motopark', set: 3, d: 22, apron: 0 }],
    [
      'L8',
      35.5,
      42,
      -1,
      {
        own: 'oldhouse2',
        set: 2.7,
        d: 9.5,
        apron: 0,
        fp: [
          [-0.1, -0.2],
          [6.6, -0.2],
          [6.6, 5.6],
          [3, 9.6],
          [-0.1, 9.6],
        ],
      },
    ], // 東北角讓開 Yamaha 背牆、後面讓開 19 House
    ['L8', 42, 49.5, -1, { own: 'oldhouse3', set: 2.7, d: 9, apron: 0 }],
    ['L8', 49.5, 67, -1, { own: 'vacantA', set: 2.7, d: 16, apron: 0 }],
    ['L8', 71, 92, -1, { own: 'vacantB', set: 2.7, d: 20, apron: 0 }],
    [
      'L8',
      92,
      96,
      -1,
      {
        own: 'deadend',
        set: 2.7,
        d: 1,
        apron: 0,
        fpw: [
          [230.39, 317.47],
          [234.27, 310.48],
          [243.45, 315.58],
          [239.57, 322.57],
        ],
      },
    ], // 往南死巷東側的米色老屋（不平行 708 巷，直接給世界座標）
    // ---- F 段：環中東路708巷 中段 s≈96～182（街景 2024-08；國土測繪 2024 正射）----
    // 兩邊都是中原大學的機車停車場：北側（side +1）一整排校內機車棚、停車場柵門、紅磚圓花台與大樹、紅磚矮牆；
    // 南側（side -1）是高起的水泥機車停車平台（東區、西臂），平台後面才是一排 1～2 樓的老房子背牆（杯情城市、老莊工作室、斑馬壁畫的藍樓）；
    // 西端轉彎處有 4 棟真正面對巷子的房子（修改衣服、50 號黃樓、48 號白磁磚窄樓，46 號在 G 段）
    ['L8', 97, 119, 1, { own: 'cpRow', set: 5, d: 5.2, apron: 0, lines: 1 }],
    ['L8', 122, 133, 1, { own: 'cpRow', set: 6, d: 5, apron: 0, lines: 1, hedge: 1 }],
    ['L8', 133.5, 138.5, 1, { own: 'parkGate', set: 3, d: 6, apron: 0 }],
    ['L8', 139, 146, 1, { own: 'treeBed', set: 2.2, d: 8, apron: 0 }],
    ['L8', 146, 165, 1, { own: 'cpRow', set: 6.5, d: 5, apron: 0, wall: 1 }],
    ['L8', 166, 175, 1, { own: 'redWall', set: 2.2, d: 6, apron: 0 }],
    ['L8', 176.5, 185, 1, { own: 'redWall', set: 2.2, d: 6, apron: 0 }],
    ['L8', 101, 133, -1, { own: 'platE', set: 2.5, d: 10, apron: 0 }],
    ['L8', 101, 121, -1, { own: 'fS2', set: 13, d: 9, apron: 0 }],
    ['L8', 121, 129, -1, { own: 'fS3', set: 17, d: 8, apron: 0 }],
    ['L8', 129, 137, -1, { own: 'cupCity', set: 13.5, d: 8, apron: 0 }],
    ['L8', 139.5, 164, -1, { own: 'platW', set: 2.7, d: 7.6, apron: 0 }],
    ['L8', 139.5, 145, -1, { own: 'laozhuang', set: 10.5, d: 7, apron: 0 }],
    ['L8', 145, 148.5, -1, { own: 'fS7', set: 10.5, d: 8, apron: 0 }],
    ['L8', 148.5, 154, -1, { own: 'fS8', set: 10.5, d: 8, apron: 0 }],
    ['L8', 154, 163.5, -1, { own: 'zebra', set: 10.5, d: 11, apron: 0 }],
    ['L8', 166, 169.5, -1, { own: 'tailor1', set: 6, d: 9, apron: 0 }],
    ['L8', 170, 177.5, -1, { own: 'no50', set: 4.5, d: 8, apron: 0 }],
    ['L8', 178, 182, -1, { own: 'no48', set: 4, d: 10, apron: 0 }],
    // ---- G 段：環中東路708巷 內段 s≈183～306（街景 2024-08；國土測繪 2024 正射）----
    // 巷子有兩個直角彎：往北（46 號）、往西（一整排貼著巷子的 2～4 樓街屋：42 號、40 號阿來、荏苒古著、大觀園巷口乾麵、複合式速食、圓招店、30 號影印）、
    // 再往南（米白住家、26 號、元氣影印店那棟鐵皮屋、巷尾施工中的大樓）。北側／西側是校內機車棚、彩繪擋土牆與建築館，不蓋街屋。
    // 46 號（w587178600）、元氣影印店（w587179838）、巷尾大樓（w587179834）都是 OSM 真實建物：不 drop、不改名稱，只把招牌立面做成貼在牆外的薄板
    [
      'L8',
      184,
      198,
      1,
      {
        own: 'cpRow',
        set: 5,
        d: 6,
        apron: 0,
        wall: 1,
        fp: [
          [-0.1, -0.2],
          [14.1, -0.2],
          [14.1, 6],
          [6.3, 6],
          [6.3, 2.8],
          [4.7, 2.8],
          [4.7, 6],
          [-0.1, 6],
        ],
      },
    ], // 保留範圍在 (5.5, 3.6) 挖一個缺口：校內機車停車場原本就在那裡生一台機車，擋住會讓全圖停車的亂數順序整個位移
    ['L8', 202, 215.5, 1, { own: 'muralWall', set: 2.6, d: 3, apron: 0 }],
    ['L8', 216.5, 224.6, 1, { own: 'muralWall', set: 2.6, d: 3, apron: 0 }],
    ['L8', 226, 241, 1, { own: 'muralWall', set: 2.6, d: 3, apron: 0, vine: 1 }],
    ['L8', 183, 199, -1, { own: 'no46', set: 3.8, d: 0.5, apron: 0 }],
    ['L8', 201.5, 206.5, -1, { own: 'blueShed', set: 2.8, d: 2.5, apron: 0 }],
    ['L8', 206.5, 216, -1, { own: 'no42', set: 2.8, d: 8, apron: 0 }],
    ['L8', 216.5, 224, -1, { own: 'alai', set: 2.8, d: 9, apron: 0 }],
    ['L8', 224, 228, -1, { own: 'renran', set: 2.8, d: 8, apron: 0 }],
    ['L8', 228, 232.5, -1, { own: 'dagy', set: 2.8, d: 9, apron: 0 }],
    ['L8', 232.5, 237.5, -1, { own: 'fastfood', set: 2.8, d: 9, apron: 0 }],
    ['L8', 237.5, 241.5, -1, { own: 'roundShop', set: 2.8, d: 9, apron: 0 }],
    ['L8', 241.5, 245, -1, { own: 'no30', set: 2.8, d: 10, apron: 0 }],
    ['L8', 250, 257, -1, { own: 'no30w', set: 2.5, d: 5.5, apron: 0 }],
    ['L8', 257, 264.5, -1, { own: 'home4', set: 3, d: 10, apron: 0 }],
    ['L8', 264.5, 271.5, -1, { own: 'no26', set: 3, d: 10, apron: 0 }],
    ['L8', 272, 282, -1, { own: 'yuanqi', set: 3, d: 0.5, apron: 0 }],
    ['L8', 289, 297, -1, { own: 'site708', set: 3, d: 0.5, apron: 0 }],
    // ---- H 段：環中東路 實踐路口以西（街景 2026-05，少數 2024-07；OSM 店名與輪廓）----
    // 北側 s 697～757：實踐路 S4 的轉角樓以西到振興街口，一排 4～7 樓透天；s 761～833 是 OSM 那排三樓街屋（w1153472233～263，只改高度、前面掛招牌）；
    // s 837～913：大輪車業、世國汽車、一整排米色 4 樓長公寓（普仁地政士事務所、電池）、賀眾牌、紅磚 6 樓、7 樓窄樓。後面的填充樓照 HZ_HIDE 隱藏（不 drop）
    ['HN', 697, 703.5, 1, { nf: 4, wall: '#9a5a48', bal: 'rail', ground: 'shop', d: 14, set: 9.6 }],
    [
      'HN',
      703.5,
      711,
      1,
      { nf: 7, wall: '#e6e5e0', ground: 'shutter', sh: '#5a5c60', d: 14, set: 9.6 },
    ],
    [
      'HN',
      711,
      717.5,
      1,
      {
        nf: 5,
        wall: '#8e8f8c',
        ground: 'shop',
        sign: ['吳二哥', '#2a2a2c', '#f0c04a'],
        d: 14,
        set: 9.6,
      },
    ],
    ['HN', 717.5, 723, 1, { nf: 5, wall: 'beige', ground: 'shop', d: 14, set: 9.6 }],
    ['HN', 723, 728, 1, { nf: 5, wall: 'beige', ground: 'shutter', d: 14, set: 9.6 }],
    ['HN', 728, 733, 1, { nf: 5, wall: '#6f7072', ground: 'shop', d: 14, set: 9.6 }],
    ['HN', 733, 738, 1, { nf: 5, wall: 'beige', ground: 'shutter', d: 14, set: 9.6 }],
    ['HN', 738, 743, 1, { nf: 5, wall: 'beige', ground: 'shop', awn: '#e0902a', d: 14, set: 9.6 }],
    ['HN', 743, 748, 1, { nf: 5, wall: 'beige', ground: 'shop', d: 14, set: 9.6 }],
    ['HN', 748, 752.5, 1, { nf: 4, wall: 'beige', ground: 'shop', d: 14, set: 9.6 }],
    [
      'HN',
      752.5,
      756.5,
      1,
      {
        nf: 4,
        wall: 'grey',
        ground: 'shop',
        sign2: ['CARIN', '#f4f0ee', '#3a3a3a'],
        d: 14,
        set: 9.6,
      },
    ], // 振興街口東側的弧形轉角樓
    ['HN', 820, 836.5, 1, { own: 'hzSignsN', set: 9.3, d: 0.3, apron: 0 }], // OSM 那排街屋前面的招牌（中信房屋、有巢氏房屋）與 7 樓窄樓的直立「極限專賣」
    [
      'HN',
      834.2,
      837.5,
      1,
      {
        nf: 7,
        wall: '#b3a89c',
        ground: 'shop',
        sign: ['EXSHOP', '#1a1a1a', '#f2d23a'],
        d: 14,
        set: 9.6,
      },
    ], // OSM 那排西端與大輪車業之間的 7 樓窄樓（一樓極限專賣 EXSHOP）
    [
      'HN',
      837.5,
      843,
      1,
      {
        nf: 4,
        wall: '#c9c4c0',
        ground: 'open',
        sign: ['大輪車業', '#f2c8c8', '#2a2a2a'],
        d: 14,
        set: 9.6,
      },
    ],
    [
      'HN',
      843,
      848.5,
      1,
      { nf: 4, wall: '#d8cbb0', ground: 'shutter', sh: '#3d6ea8', d: 14, set: 9.6 },
    ],
    [
      'HN',
      848.5,
      853.5,
      1,
      {
        nf: 5,
        wall: '#cfc6b0',
        ground: 'shop',
        sign: ['世國汽車', '#1f6f5a', '#ffffff'],
        d: 14,
        set: 9.6,
      },
    ],
    ['HN', 853.5, 859, 1, { nf: 4, wall: '#d9cba8', bal: 'rail', ground: 'shop', d: 14, set: 9.6 }],
    [
      'HN',
      859,
      864.5,
      1,
      {
        nf: 4,
        wall: '#d9cba8',
        bal: 'rail',
        ground: 'shop',
        sign: ['普仁地政士事務所', '#1f4f9a', '#ffffff'],
        d: 14,
        set: 9.6,
      },
    ],
    [
      'HN',
      864.5,
      870,
      1,
      {
        nf: 4,
        wall: '#d9cba8',
        bal: 'rail',
        ground: 'shop',
        sign: ['電池', '#f2d23a', '#1f3f9a'],
        d: 14,
        set: 9.6,
      },
    ],
    [
      'HN',
      870,
      875.5,
      1,
      { nf: 4, wall: '#d9cba8', bal: 'rail', ground: 'shutter', sh: '#3d6ea8', d: 14, set: 9.6 },
    ],
    [
      'HN',
      875.5,
      880.5,
      1,
      { nf: 4, wall: '#d9cba8', bal: 'rail', ground: 'shop', d: 14, set: 9.6 },
    ],
    [
      'HN',
      880.5,
      885,
      1,
      { nf: 4, wall: '#d9cba8', bal: 'rail', ground: 'shutter', d: 14, set: 9.6 },
    ],
    [
      'HN',
      885,
      890,
      1,
      {
        nf: 4,
        wall: '#ecebe6',
        ground: 'shop',
        sign: ['賀眾牌', '#2a2a2c', '#ffffff'],
        d: 14,
        set: 9.6,
      },
    ],
    ['HN', 890, 896.5, 1, { nf: 4, wall: '#e6e4de', ground: 'shop', d: 14, set: 9.6 }],
    [
      'HN',
      896.5,
      901.5,
      1,
      { nf: 6, wall: '#9a4a3a', bal: 'grille', ground: 'shop', d: 14, set: 9.6 },
    ],
    ['HN', 901.5, 907, 1, { nf: 6, wall: '#b9bcbc', ground: 'shop', d: 14, set: 9.6 }],
    ['HN', 907, 911, 1, { nf: 7, wall: '#d8d6cf', ground: 'shutter', d: 14, set: 9.6 }],
    ['HN', 911, 913.5, 1, { nf: 5, wall: '#e3d9c4', ground: 'shutter', d: 14, set: 9.6 }],
    // 南側 s 588～685：TOYOTA 環中保修廠（退在停車場後面）、夾子園（實踐路往南那條路的西側）
    ['HS', 588, 610, -1, { own: 'toyota', set: 24, d: 18, apron: 0 }],
    ['HS', 649, 685, -1, { own: 'jiazi', set: 8, d: 22, apron: 0 }],
    // ---- I 段：環中東路南側 s 691～887（街景 2024-07，西端停車場 2022-06）----
    // s 691～813 是一整棟 OSM 一樓商業建物 w1457393677、s 814～851 是 OSM w1457393689：不 drop、不改輪廓，hzFix 改高度，立面做成貼在北牆外的薄板（edgeKit）
    ['HS', 691.3, 701.2, -1, { own: 'iYokohama', set: 6, d: 0.5, apron: 0 }],
    ['HS', 701.2, 714.5, -1, { own: 'iLuxur', set: 6, d: 0.5, apron: 0 }],
    ['HS', 714.5, 724.5, -1, { own: 'iShedG', set: 6, d: 0.5, apron: 0 }],
    ['HS', 724.5, 736.5, -1, { own: 'iBstone', set: 6, d: 0.5, apron: 0 }],
    ['HS', 736.5, 745, -1, { own: 'iWanhe', set: 6, d: 0.5, apron: 0 }],
    ['HS', 745, 751, -1, { own: 'iTin', set: 6, d: 0.5, apron: 0 }],
    ['HS', 751, 762, -1, { own: 'iPgate', set: 6, d: 0.5, apron: 0 }],
    ['HS', 762, 793.4, -1, { own: 'iOm', set: 6, d: 0.5, apron: 0 }],
    ['HS', 793.4, 802.5, -1, { own: 'iBed', set: 6, d: 0.5, apron: 0 }],
    ['HS', 802.5, 813.3, -1, { own: 'iTail', set: 6, d: 0.5, apron: 0 }],
    ['HS', 814.2, 851.3, -1, { own: 'iShidai', set: 6, d: 0.5, apron: 0 }],
    // 實景是空地停車場（街景 2022-06、2025-06），原本的填充樓照 HZ_HIDE 隱藏。保留範圍從那排填充樓的牆線（z 1.8）後面才開始：
    // Furniture 會在它們的店面牆前 1.4 m 停機車，擋掉那幾台全圖的停放機車就會重排
    [
      'HS',
      852,
      886.5,
      -1,
      {
        own: 'lotI',
        set: 6.5,
        d: 26,
        fp: [
          [-0.1, 1.9],
          [34.6, 1.9],
          [34.6, 26],
          [-0.1, 26],
        ],
      },
    ],
    // A0 新中北路口東南角（HS s 0～48 的東南側）：小象汽車的露天中古車場＋兩層樓車行（街景 2024-08；國土測繪 2024 正射）。
    // 新中北路那邊的 SegX0 只做路口西側、這裡 D 段從 s 48 才開始，兩邊都沒做，原本留著一塊 7 m 高的填充樓 f8（hide）。
    // 保留範圍只取 f8 輪廓往內縮 0.7 m：Furniture 在 f8 店面牆外 1.4 m 停機車，蓋到就會讓全圖停放機車重排
    [
      'HS',
      0,
      48,
      -1,
      {
        own: 'xiaoxiang',
        set: 6.5,
        d: 20,
        apron: 0,
        fpw: [
          [584.5, 113.8],
          [615.7, 154.6],
          [593.1, 171.9],
          [561.9, 131.1],
        ],
      },
    ],
  ],
};
// OSM 真實建物只改高度（不 drop、不改 kind、不改輪廓，抽亂數的次數不變，快照已驗證）
// 太陽帝國大廈（門牌 772，街景 2026-05）：實際 13 層＋屋頂冠帶約 49.5 m，OSM 只記 5 樓
// 景觀系館（OSM w587175193，708 巷紅磚圍牆後面，街景 2024-08）：實際 4 層樓，OSM 記得太矮
// 響叮噹五金百貨（OSM w1034725686，街景 2026-05）：實際是兩層樓高的鐵皮賣場（尚揚、森棲棲 7.2～7.6 m），OSM 只記 3.9 m
// 振興街口以西那排 OSM 街屋（w1153472233～263，街景 2026-05）：實際 4 樓（轉角那棟 5 樓），OSM 只記 3 樓；牆面是米色、灰色磁磚（hzLook 換色）
const HZ_ROW4 = new Set([
  'w1153472233',
  'w1153472234',
  'w1153472235',
  'w1153472236',
  'w1153472237',
  'w1153472253',
  'w1153472254',
  'w1153472255',
  'w1153472256',
  'w1153472257',
  'w1153472258',
  'w1153472259',
  'w1153472260',
  'w1153472262',
  'w1153472263',
]);
export function hzFix(b) {
  if (b.id === 'w1113208995') {
    b.h = 49.5;
    b.floors = 13;
  } else if (b.id === 'w1034725686') {
    b.h = 7.6;
    b.floors = 2;
  } else if (b.id === 'w587175193') {
    b.h = 14;
    b.floors = 4;
  } else if (b.id === 'w1457393677') {
    b.h = 7;
    b.floors = 2;
  } else if (b.id === 'w1457393689') {
    b.h = 6.5;
    b.floors = 2;
  } else if (HZ_ROW4.has(b.id)) {
    b.h = b.id === 'w1153472233' ? 17.1 : 13.8;
    b.floors = b.id === 'w1153472233' ? 5 : 4;
  }
}
// 森林川家具、響叮噹兩棟 OSM 建物的北牆已經被自建立面板蓋住，但 MapBuilder 自動長出的一樓店面斜雨棚凸出牆面 1.25 m，會從立面板前面穿出一條橫線：
// 照大仁二街 d2Look 的做法用 noShop 只是不畫店面與雨棚（共用亂數照抽），牆色照舊，只把牆面花紋設成平滑
// I 段兩棟 OSM 建物（w1457393677、w1457393689）同理：北牆被立面板蓋住。
// 環中東路南側那排鐵皮店面（w1457393677，街景 2024-07）實際兩層樓高約 7 m，OSM 只記一樓 3.9 m；w1457393689 實際是兩層樓高的車行，OSM 記 4 樓（hzFix）
const HZ_NOSHOP = new Set(['w1034725687', 'w1034725686', 'w1457393677', 'w1457393689']);
// G 段 708 巷往西那排填充樓不能 drop：它們的店面牆在 world.shopWalls 裡，Furniture 照 walls[(wi * 7919) % walls.length] 挑牆擺機車，
// 牆數一變全圖的路邊機車、停車都會重排。照大仁二街的做法留著資料、只叫 MapBuilder 不畫牆和屋頂（look.open.bare＋noShop，亂數照抽），
// 碰撞輪廓在 buildHuanzhongStreet 最後收成一個點（hzUncollide）
const HZ_HIDE = new Set([
  'f2_26',
  'f2_27',
  'f2_28',
  'f2_29',
  'f2_30', // G 段
  'f1269',
  'f1320',
  'f1321',
  'f2_845',
  'f2_846',
  'f2_847',
  'f2_848',
  'f2_849',
  'f2_850',
  'f2_851',
  'f2_852',
  'f2_853',
  'f2_854',
  'f2_855',
  'f2_856',
  'f2_857',
  'f2_858',
  'f2_859', // H 段
  'f552',
  'f553',
  'f554',
  'f555',
  'f556',
  'f559',
  'f560',
  'f561',
  'f562',
  'f570',
  'f571',
  'f572',
  'f8', // A0：新中北路口東南角，實景是小象汽車的露天中古車場（照 SegX0 的轉角補建，見 OWN.xiaoxiang）
]); // I 段：s 852～886 實景是空地停車場
export function hzLook(b) {
  if (HZ_NOSHOP.has(b.id)) {
    b.look = { ...(b.look || {}), wall: { base: 'smooth', ...(b.look?.wall || {}) } };
    b.noShop = true;
  }
  if (HZ_ROW4.has(b.id) && !b.look)
    b.look = {
      wall: {
        colour: ['#cdc5b5', '#b4b3ad', '#d8cdb6', '#9a9c9c', '#c3b9a6'][
          [...HZ_ROW4].indexOf(b.id) % 5
        ],
      },
    };
  if (HZ_HIDE.has(b.id)) {
    // 原本就 noShop、沒有 look 的填充樓（I 段 f552～f556）本來不產生店面牆；一加 look，MapBuilder 會把它當成「有店面但不畫」推進
    // world.shopWalls，牆數一變全圖停放機車就重排。facade 設成 glass 只換樣式（rb() 照抽，填充樓的 rnd2 是各自的種子），店面牆照舊不產生
    if (b.noShop && !b.look) b.facade = 'glass';
    // look.open.bare 只拿掉牆和平屋頂，斜屋頂（f8 的 gabled）照畫；填充樓的亂數是自己的種子，拿掉斜屋頂不影響全圖
    if (b.synthetic && b.roof) delete b.roof;
    b.look = {
      ...(b.look || {}),
      wall: { base: 'smooth', colour: '#d9d9d6' },
      open: { bare: true },
      roof: { ac: false, extras: false },
    };
    b.noShop = true;
  }
}
function hzUncollide(data, collision) {
  if (!data || !collision || !collision.polys) return;
  for (const b of data.buildings) {
    if (!HZ_HIDE.has(b.id)) continue;
    const pi = collision.polys.findIndex((q) => q.pts === b.pts);
    if (pi < 0) {
      console.warn(`[huanzhong] 找不到 ${b.id} 的碰撞輪廓`);
      continue;
    }
    const Q = collision.polys[pi],
      n = b.pts.length,
      c0 = b.pts[0];
    Q.pts = b.pts.map(() => [c0[0], c0[1]]);
    Q.top = -Infinity;
    for (let k = 0; k < n; k++)
      collision.segs[Q.s0 + k] = [c0[0], c0[1], c0[0], c0[1], 1e8, 1e8 + 1];
  }
}
export function hzAt(ref, s) {
  const R = HZ_REF[ref];
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
export function hzLotFrame([ref, s0, s1, side, sp]) {
  const m = hzAt(ref, (s0 + s1) / 2),
    w = s1 - s0,
    nx = -m.uz * side,
    nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux,
    az = side > 0 ? m.uz : -m.uz;
  const set = (sp && sp.set) || SET[ref];
  return {
    ox: m.x + nx * set - (ax * w) / 2,
    oz: m.z + nz * set - (az * w) / 2,
    ang: Math.atan2(az, ax),
    w,
    apron: Math.min(sp && sp.apron != null ? sp.apron : 99, Math.max(0.6, set - HALF[ref])),
  };
}
export function hzFootprints() {
  return HZ_ST.lots.map((L) => {
    const { ox, oz, ang, w, apron } = hzLotFrame(L),
      c = Math.cos(ang),
      s = Math.sin(ang),
      d = L[4].d || 10;
    const p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    if (L[4].fpw) return L[4].fpw; // 直接給世界座標的保留範圍（不平行參考線的房子）
    if (L[4].fp) return L[4].fp.map(([x, z]) => p(x, z));
    return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, d), p(-0.1, d)];
  });
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

export function buildHuanzhongStreet(I, scene, X, data, collision) {
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
    return sg(`hz_${text}|${bg}|${fg}|${sub || ''}|${W}x${Hh}|${style || ''}`, W, Hh, (g) => {
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
    sg(`hzR_${text}|${bg}|${fg}`, 128, 128, (g) => {
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
    sg(`hzSh${hex}`, 64, 64, (g) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(0, y, 64, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, y + 6, 64, 2);
      }
    });
  const openTex = sg('hzOpen', 256, 160, (g) => {
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
  const archWin = sg('hzArchWin', 256, 160, (g) => {
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
  const archRow = sg('hzArchRow', 256, 64, (g) => {
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
  const litWin = (gr) =>
    sg(`hzLit${gr ? 1 : 0}`, 256, 160, (g) => {
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
      `hz${i}`,
      ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6],
      ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6],
      300 + i * 3
    );

  const kits = [];
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, rot, col) => k.scooter(x, z, rot, col);

  // ---- 非制式量體（spec.own）共用的小工具：招牌畫布、直立側招、樹、汽車、鐵塔招牌架、多邊形柱 ----
  const nb = { col: false };
  const fitText = (g, t, x, y, maxW, px, col, wgt = 900, align = 'center') => {
    g.fillStyle = col;
    g.textAlign = align;
    g.textBaseline = 'middle';
    shrinkFont(g, t, maxW, px, 8, (sz) => font(sz, wgt), 1);
    g.fillText(t, x, y);
  };
  const board = (key, wm, hm, draw, ppm = 96) => {
    if (wm * ppm > 1536) ppm = 1536 / wm;
    const W = r16(wm * ppm),
      Hh = r16(hm * ppm);
    return sg(`hzB_${key}`, W, Hh, (g) => draw(g, W, Hh));
  };
  const vtex = (text, bg, fg, wm, hm, cap) =>
    board(
      `v_${text}|${bg}|${fg}|${wm}x${hm}|${cap || ''}`,
      wm,
      hm,
      (g, W, Hh) => {
        // 直寫的招牌面，cap = 頂端圓形標誌的顏色
        g.fillStyle = bg;
        g.fillRect(0, 0, W, Hh);
        const t = [...text],
          top = cap ? W : 0,
          ch = (Hh - top - W * 0.1) / t.length;
        if (cap) {
          g.fillStyle = cap;
          g.beginPath();
          g.arc(W / 2, W / 2, W * 0.36, 0, 7);
          g.fill();
        }
        t.forEach((c, j) =>
          fitText(
            g,
            c,
            W / 2,
            top + W * 0.05 + ch * (j + 0.5),
            W * 0.86,
            Math.min(W * 0.8, ch * 0.92),
            fg
          )
        );
      },
      128
    );
  // 凸出牆面的直立側招（兩面都有字）：x 沿立面的位置、y0 底、hm 高、zc 招牌中心離立面（負值 = 伸到街上）、wm 寬
  const vsign = (k, text, bg, fg, x, y0, hm, zc, wm = 0.9, cap) => {
    const t = vtex(text, bg, fg, wm, hm, cap);
    for (const sd of [-1, 1])
      k.plane(t, wm, hm, x + sd * 0.07, y0 + hm / 2, zc, (sd * Math.PI) / 2, { emissive: 0.3 });
    k.box(x - 0.06, x + 0.06, y0, y0 + hm, zc - wm / 2, zc + wm / 2, bg, nb);
  };
  const hsign = (k, tex, wm, hm, x, y, z = -0.14, em = 0.35) => {
    k.box(
      x - wm / 2 - 0.05,
      x + wm / 2 + 0.05,
      y - hm / 2 - 0.05,
      y + hm / 2 + 0.05,
      z + 0.02,
      0,
      '#3a3d42',
      nb
    );
    k.plane(tex, wm, hm, x, y, z, FRONT, { emissive: em });
  };
  const blob = (k, x, y, z, s, hex) => {
    const g = new THREE.SphereGeometry(s, 7, 5);
    g.translate(x, y, z);
    k._part(VC, paintGeo(g, hex));
  };
  const tree = (k, x, z, h, s, r, y = 0) => {
    k.cyl(x, z, 0.14 + s * 0.05, y ? y - 0.3 : 0, y + h, '#6a4a30', { seg: 6, col: true });
    for (const [dx, dy, dz, q] of [
      [0, h + s * 0.35, 0, 1],
      [-s * 0.6, h - s * 0.25, s * 0.25, 0.8],
      [s * 0.65, h - s * 0.1, -s * 0.15, 0.85],
    ])
      blob(k, x + dx, y + dy, z + dz, s * q, r() < 0.5 ? '#3f7a3a' : '#4b8a3e');
  }; // y = 樹腳的地面高度（植栽帶的樹用）
  const car = (k, x, z, hex) => k.car(x + 0.9, z + 2.15, Math.PI, hex);
  const lattice = (k, x, z, y0, h, s = 0.8) => {
    for (const [dx, dz] of [
      [0, 0],
      [s, 0],
      [0, s],
      [s, s],
    ])
      k.box(x + dx - 0.03, x + dx + 0.03, y0, y0 + h, z + dz - 0.03, z + dz + 0.03, '#6a6d70', nb);
    for (let y = y0 + 0.6; y <= y0 + h; y += 0.9) {
      k.box(x, x + s, y, y + 0.05, z - 0.03, z + 0.03, '#6a6d70', nb);
      k.box(x, x + s, y, y + 0.05, z + s - 0.03, z + s + 0.03, '#6a6d70', nb);
      k.box(x - 0.03, x + 0.03, y, y + 0.05, z, z + s, '#6a6d70', nb);
      k.box(x + s - 0.03, x + s + 0.03, y, y + 0.05, z, z + s, '#6a6d70', nb);
    }
  };
  const polyPrism = (k, pts, y0, y1, hex, col = true) => {
    // 凸多邊形柱（區域座標 [x,z]）：楔形基地用；跟 k.box 一樣併進頂點色材質
    const pos = [],
      nor = [],
      idx = [],
      n = pts.length,
      cx = pts.reduce((s, p) => s + p[0], 0) / n,
      cz = pts.reduce((s, p) => s + p[1], 0) / n;
    for (let i = 0; i < n; i++) {
      const a = pts[i],
        b = pts[(i + 1) % n],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        L = Math.hypot(dx, dz);
      if (col && y0 < 2.2 && y1 > 0.35) k.wallLine(a[0], a[1], b[0], b[1], y0, y1);
      let nx = dz / L,
        nz = -dx / L;
      const flip = ((a[0] + b[0]) / 2 - cx) * nx + ((a[1] + b[1]) / 2 - cz) * nz < 0;
      if (flip) {
        nx = -nx;
        nz = -nz;
      }
      const v = pos.length / 3;
      pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]);
      for (let j = 0; j < 4; j++) nor.push(nx, 0, nz);
      if (flip) idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      else idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
    }
    const t0 = pos.length / 3;
    for (const p of pts) {
      pos.push(p[0], y1, p[1]);
      nor.push(0, 1, 0);
    }
    for (let i = 1; i < n - 1; i++) {
      const a = pts[0],
        b = pts[i],
        c = pts[i + 1],
        up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      if (up > 0) idx.push(t0, t0 + i, t0 + i + 1);
      else idx.push(t0, t0 + i + 1, t0 + i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2)
    );
    g.setIndex(idx);
    return k._part(VC, paintGeo(g, hex));
  };
  // ---- C 段（環中東路南側）加的小工具：貼地形的地面、雙斜屋頂、浪板紋、尖塔形針葉樹 ----
  const gy = (k, x, z) => {
    const [wx, wz] = k.w(x, z);
    return H(wx, wz) - k.base;
  }; // 區域座標 (x,z) 的地面比這一格的基準高多少
  const vcGeo = (pos, idx, hex, nor) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2)
    );
    g.setIndex(idx);
    if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    else g.computeVertexNormals();
    return paintGeo(g, hex);
  };
  // 貼著地形的四邊形地面（a→b 前緣、d→c 後緣，區域座標 [x,z]）：水泥地、柏油車道、草帶、步道
  const drape = (k, a, b, c, d, hex, lift = 0.06) => {
    const len = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]),
      nu = Math.max(1, Math.ceil(Math.max(len(a, b), len(d, c)) / 1.5)),
      nv = Math.max(1, Math.ceil(Math.max(len(a, d), len(b, c)) / 1.5)),
      pos = [],
      idx = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const u = i / nu,
          v = j / nv,
          x = (a[0] * (1 - u) + b[0] * u) * (1 - v) + (d[0] * (1 - u) + c[0] * u) * v,
          z = (a[1] * (1 - u) + b[1] * u) * (1 - v) + (d[1] * (1 - u) + c[1] * u) * v;
        pos.push(x, gy(k, x, z) + lift, z);
      }
    const up = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]) > 0;
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const p = j * (nu + 1) + i,
          q = p + 1,
          s = p + nu + 1,
          t = s + 1;
        if (up) idx.push(p, s, q, q, s, t);
        else idx.push(p, q, s, q, t, s);
      }
    return k._part(VC, vcGeo(pos, idx, hex));
  };
  const rectG = (k, x0, x1, z0, z1, hex, lift) =>
    drape(k, [x0, z0], [x1, z0], [x1, z1], [x0, z1], hex, lift);
  const disc = (k, cx, cz, r0, r1, hex, lift = 0.06) => {
    // 貼著地形的圓環（r0 = 0 就是圓盤）
    const n = 32,
      m = Math.max(1, Math.ceil((r1 - r0) / 1.5)),
      pos = [],
      idx = [];
    for (let j = 0; j <= m; j++)
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2,
          rr = r0 + ((r1 - r0) * j) / m,
          x = cx + Math.cos(a) * rr,
          z = cz + Math.sin(a) * rr;
        pos.push(x, gy(k, x, z) + lift, z);
      }
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        const p = j * (n + 1) + i,
          q = p + 1,
          s = p + n + 1,
          t = s + 1;
        idx.push(p, q, s, q, t, s);
      }
    return k._part(VC, vcGeo(pos, idx, hex));
  };
  // 雙斜鐵皮屋頂（屋脊順著 z）＋前後山牆的三角形
  const gable = (k, x0, x1, z0, z1, eave, ridge, roofHex, endHex, ov = 0.3) => {
    const xm = (x0 + x1) / 2,
      hw = (x1 - x0) / 2 + ov,
      a = Math.atan2(ridge - eave, (x1 - x0) / 2),
      top = ridge + 0.06;
    for (const sd of [-1, 1]) {
      const g = new THREE.BoxGeometry(hw / Math.cos(a), 0.1, z1 - z0 + ov * 2);
      g.rotateZ(-sd * a);
      g.translate(xm + (sd * hw) / 2, top - (Math.tan(a) * hw) / 2, (z0 + z1) / 2);
      k._part(VC, paintGeo(g, roofHex));
    }
    if (endHex)
      for (const z of [z0, z1])
        k._part(
          VC,
          vcGeo(
            [x0, eave, z, x1, eave, z, xm, ridge, z, x0, eave, z, xm, ridge, z, x1, eave, z],
            [0, 1, 2, 3, 4, 5],
            endHex,
            [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1]
          )
        );
  };
  const rnd1 = (v) => Math.round(v * 10) / 10;
  const corrTex = (hex, wm, hm) =>
    board(
      `corr${hex}|${wm}x${hm}`,
      wm,
      hm,
      (g, W, Hh) => {
        g.fillStyle = hex;
        g.fillRect(0, 0, W, Hh);
        const n = Math.max(2, Math.round(wm / 0.25)),
          cw = W / n;
        for (let j = 0; j < n; j++) {
          g.fillStyle = 'rgba(255,255,255,0.14)';
          g.fillRect(j * cw, 0, cw * 0.3, Hh);
          g.fillStyle = 'rgba(0,0,0,0.17)';
          g.fillRect(j * cw + cw * 0.6, 0, cw * 0.3, Hh);
        }
      },
      32
    );
  const corr = (k, hex, x0, x1, y0, y1, z = -0.02) =>
    k.plane(
      corrTex(hex, rnd1(x1 - x0), rnd1(y1 - y0)),
      x1 - x0,
      y1 - y0,
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      z,
      FRONT
    ); // 立面上的直紋浪板
  const conifer = (k, x, z, h) => {
    const y = gy(k, x, z);
    k.cyl(x, z, 0.22, y - 0.3, y + 3, '#5a4030', { seg: 6, col: true });
    k.cyl(x, z, 2.0, y + 1.8, y + h * 0.62, '#2c5534', { seg: 8, r1: 1.0 });
    k.cyl(x, z, 1.25, y + h * 0.55, y + h, '#356540', { seg: 8, r1: 0.06 });
  };
  const vcol = (g, t, x, y0, ch, px, col) =>
    [...t].forEach((c, j) => fitText(g, c, x, y0 + ch * (j + 0.5), px * 1.1, px, col, 800)); // 直寫一行小字
  // ---- C 段的招牌貼圖 ----
  const mcarHead = (g, x, y, wd, hh) => {
    fitText(g, "M'car", x + wd * 0.5, y + hh * 0.28, wd, hh * 0.36, '#2a4fb0', 800);
    fitText(g, '買', x + wd * 0.5, y + hh * 0.7, wd * 0.8, hh * 0.5, '#2a4fb0');
  };
  const mcarSign = board('mcar', 8.3, 1.3, (g, W, Hh) => {
    // 黃底黑字「中古車收購便利站」，左端藍色 M'car 買，上方片假名小字、右下服務專線
    g.fillStyle = '#f0b83a';
    g.fillRect(0, 0, W, Hh);
    mcarHead(g, W * 0.015, 0, W * 0.1, Hh);
    fitText(
      g,
      'チュウコシャ カイトリ ステーション',
      W * 0.55,
      Hh * 0.11,
      W * 0.4,
      Hh * 0.13,
      '#1a1a1a',
      700
    );
    fitText(g, '中古車收購便利站', W * 0.555, Hh * 0.52, W * 0.86, Hh * 0.6, '#1a1a1a');
    fitText(g, '服務專線：465-5600', W * 0.83, Hh * 0.9, W * 0.3, Hh * 0.15, '#1a1a1a', 700);
  });
  const mcarEast = board('mcarE', 8.0, 3.2, (g, W, Hh) => {
    // 東側牆的黃色帆布：上緣同名橫幅，下面直書多行小字
    g.fillStyle = '#e6b83c';
    g.fillRect(0, 0, W, Hh);
    mcarHead(g, W * 0.03, Hh * 0.03, W * 0.1, Hh * 0.22);
    fitText(g, '中古車收購便利站', W * 0.56, Hh * 0.14, W * 0.8, Hh * 0.2, '#1a1a1a');
    [
      '嚴選優質好車現場展售',
      '客製化代尋・代購各式車款',
      '高價收購',
      '不限廠牌・不限車種',
      '專業鑑定・客觀鑑價',
    ].forEach((t, j) =>
      vcol(
        g,
        t,
        W * (0.88 - j * 0.19),
        Hh * 0.3,
        (Hh * 0.66) / 12,
        Hh * 0.05,
        j === 2 ? '#c8202a' : '#1a1a1a'
      )
    );
  });
  const mcarSide = board('mcarS', 2.8, 2.6, (g, W, Hh) => {
    g.fillStyle = '#e6b83c';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = 'rgba(40,30,10,.55)';
    for (let j = 0; j < 7; j++)
      g.fillRect(W * 0.12, Hh * (0.3 + j * 0.085), W * (0.5 + ((j * 7) % 3) * 0.12), Hh * 0.022);
    g.fillStyle = 'rgba(40,30,10,.75)';
    g.fillRect(W * 0.12, Hh * 0.1, W * 0.76, Hh * 0.09);
  }); // 鐵捲門右邊的黃帆布（小字看不清，只畫橫條）
  const twBox = board('tianwangBox', 1.2, 1.5, (g, W, Hh) => {
    g.fillStyle = '#c8202a';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#f4f4f0';
    g.fillRect(W * 0.12, Hh * 0.06, W * 0.76, Hh * 0.12);
    fitText(g, '天王汽車', W / 2, Hh * 0.42, W * 0.9, Hh * 0.3, '#ffffff');
    g.fillStyle = '#7a1418';
    g.fillRect(0, Hh * 0.66, W, Hh * 0.34);
    fitText(g, '巨力機油', W / 2, Hh * 0.83, W * 0.86, Hh * 0.22, '#f6d23a');
  });
  const twBoard = board('tianwangBd', 6.0, 3.0, (g, W, Hh) => {
    // 上緣深色橫條白字「天王汽車 工作室」，下面紅橘底的機油瓶與「王者誕生」
    const gr = g.createLinearGradient(0, 0, W, Hh);
    gr.addColorStop(0, '#c8301f');
    gr.addColorStop(1, '#e8632a');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#2a2a36';
    g.fillRect(0, 0, W, Hh * 0.24);
    fitText(g, '天王汽車 工作室', W * 0.42, Hh * 0.12, W * 0.62, Hh * 0.19, '#ffffff');
    fitText(g, '巨力機油', W * 0.87, Hh * 0.12, W * 0.2, Hh * 0.11, '#ffffff', 700);
    [
      ['#e8c83a', 0.14],
      ['#3f9a4a', 0.25],
      ['#e8a82a', 0.36],
    ].forEach(([c, x]) => {
      g.fillStyle = c;
      g.fillRect(W * x, Hh * 0.46, W * 0.085, Hh * 0.44);
      g.fillRect(W * (x + 0.025), Hh * 0.38, W * 0.035, Hh * 0.1);
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.fillRect(W * (x + 0.012), Hh * 0.58, W * 0.06, Hh * 0.16);
    });
    fitText(g, '王者誕生', W * 0.74, Hh * 0.6, W * 0.4, Hh * 0.26, '#fff2c0');
  });
  const pTex = (sd) =>
    board(`jlP${sd}`, 1.6, 1.6, (g, W, Hh) => {
      g.fillStyle = '#2a3f9a';
      g.fillRect(0, 0, W, Hh);
      fitText(g, 'P', W / 2, Hh * 0.38, W * 0.7, Hh * 0.66, '#f2e6a0');
      g.fillStyle = '#f2c230';
      g.fillRect(W * 0.25, Hh * 0.78, W * 0.5, Hh * 0.08);
      g.beginPath();
      const tx = sd > 0 ? W * 0.1 : W * 0.9,
        bx = sd > 0 ? W * 0.3 : W * 0.7;
      g.moveTo(tx, Hh * 0.82);
      g.lineTo(bx, Hh * 0.7);
      g.lineTo(bx, Hh * 0.94);
      g.closePath();
      g.fill();
    });
  const chain = board(
    'chainlink',
    3,
    1.5,
    (g, W, Hh) => {
      g.clearRect(0, 0, W, Hh);
      g.strokeStyle = 'rgba(200,205,208,0.9)';
      g.lineWidth = 1.6;
      g.beginPath();
      for (let x = -Hh; x < W; x += 10) {
        g.moveTo(x, 0);
        g.lineTo(x + Hh, Hh);
        g.moveTo(x + Hh, 0);
        g.lineTo(x, Hh);
      }
      g.stroke();
    },
    64
  );
  const siteTex = board('sitePink', 6.5, 2.4, (g, W, Hh) => {
    // 工地圍籬的輸出畫面：淡粉到米色，一幅一幅直書短文（字太小不寫，只畫細條）與綠色小圓標
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, '#ecc6c0');
    gr.addColorStop(0.5, '#ead6c4');
    gr.addColorStop(1, '#ecc9c2');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, Hh);
    const rr = lcg(511);
    for (let j = 0; j < 3; j++) {
      const x0 = (W * (j + 0.14)) / 3;
      g.fillStyle = 'rgba(255,255,255,.28)';
      g.fillRect((W * j) / 3 + 3, 4, W / 3 - 6, Hh - 8);
      g.fillStyle = 'rgba(110,80,70,.6)';
      for (let c = 0; c < 6; c++)
        g.fillRect(x0 + c * W * 0.035, Hh * 0.2, W * 0.008, Hh * (0.3 + rr() * 0.3));
      g.fillStyle = '#4f9a5a';
      g.beginPath();
      g.arc((W * (j + 0.86)) / 3, Hh * 0.62, Hh * 0.035, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(90,90,90,.35)';
      g.fillRect((W * j) / 3, 0, 2, Hh);
    }
  });
  const sh807 = board('sh807', 5.0, 2.6, (g, W, Hh) => {
    // 藍色鐵捲門上的白色手寫字
    g.fillStyle = '#3d5f8f';
    g.fillRect(0, 0, W, Hh);
    for (let y = 0; y < Hh; y += Hh / 22) {
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(0, y, W, Hh / 60);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fillRect(0, y + Hh / 34, W, Hh / 80);
    }
    g.fillStyle = '#34527c';
    g.fillRect(W * 0.495, 0, W * 0.012, Hh);
    fitText(g, '營業時間', W * 0.5, Hh * 0.3, W * 0.5, Hh * 0.2, 'rgba(240,240,240,.92)', 700);
    fitText(
      g,
      'pm1:00～Am2:00',
      W * 0.5,
      Hh * 0.52,
      W * 0.6,
      Hh * 0.15,
      'rgba(240,240,240,.92)',
      700
    );
    fitText(
      g,
      '出入口請勿停車',
      W * 0.5,
      Hh * 0.73,
      W * 0.66,
      Hh * 0.15,
      'rgba(240,240,240,.92)',
      700
    );
  });
  const bjSign = board('shuangjia', 5.0, 0.9, (g, W, Hh) => {
    // 綠底橫招：左邊一對老虎，「双呷」橘字、「檳榔」白字
    g.fillStyle = '#3d8f5a';
    g.fillRect(0, 0, W, Hh);
    for (const cx of [0.09, 0.2]) {
      g.fillStyle = '#e8922a';
      g.beginPath();
      g.ellipse(W * cx, Hh * 0.5, W * 0.045, Hh * 0.36, 0, 0, 7);
      g.fill();
      g.fillStyle = '#2a1a10';
      for (let j = -2; j <= 2; j++) g.fillRect(W * (cx + j * 0.016) - 2, Hh * 0.22, 3, Hh * 0.56);
    }
    fitText(g, '双呷', W * 0.44, Hh * 0.5, W * 0.3, Hh * 0.74, '#f08a2a');
    fitText(g, '檳榔', W * 0.79, Hh * 0.5, W * 0.34, Hh * 0.74, '#ffffff');
  });
  const flBoard = (wm) =>
    board(`fuli${wm}`, wm, 2.5, (g, W, Hh) => {
      g.fillStyle = '#f2d23c';
      g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#c8202a';
      g.lineWidth = 5;
      g.strokeRect(W * 0.04, Hh * 0.06, W * 0.13, Hh * 0.5);
      fitText(g, '福利社', W * 0.58, Hh * 0.2, W * 0.72, Hh * 0.3, '#1a1a1a');
      fitText(g, '休息站', W * 0.58, Hh * 0.52, W * 0.72, Hh * 0.3, '#1a1a1a');
    }); // 黃色帆布看板（小字與電話看不清，不寫）
  const graffiti = board(
    'graf807',
    7,
    2,
    (g, W, Hh) => {
      g.fillStyle = '#e4dfcf';
      g.fillRect(0, 0, W, Hh);
      for (let x = 0; x < W; x += W / 28) {
        g.fillStyle = 'rgba(0,0,0,0.1)';
        g.fillRect(x, 0, W / 90, Hh);
      }
      g.strokeStyle = '#1a1a1a';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(W * 0.5, Hh * 0.7);
      g.bezierCurveTo(W * 0.52, Hh * 0.2, W * 0.6, Hh * 0.9, W * 0.62, Hh * 0.35);
      g.bezierCurveTo(W * 0.66, Hh * 0.8, W * 0.7, Hh * 0.2, W * 0.74, Hh * 0.62);
      g.stroke();
    },
    48
  );
  // 紅磚人行道鋪面（spec.pave）
  const PAVE = def('hzPave', () => {
    const t = sg('hzPaveT', 128, 128, (g) => {
      g.fillStyle = '#8f8a82';
      g.fillRect(0, 0, 128, 128);
      const r = lcg(77);
      for (let y = 0; y < 8; y++)
        for (let x = -1; x < 4; x++) {
          const v = r();
          g.fillStyle = v < 0.33 ? '#a9584a' : v < 0.66 ? '#b06150' : '#9f5145';
          g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14);
        }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return std({ map: t, roughness: 0.95 });
  });
  // 每一格門前的人行道：鋪面（pave = 紅磚）、行道樹（trees：x 位置，種在離車道中心 6 m 的樹穴）、垂直停放的機車格（mc：[x0,x1] 區段）、水泥電線桿（poles）
  const street = (k, w, apron, set, sp, r) => {
    if (!sp.pave) {
      if (apron > 0)
        k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
    } else if (sp.pave !== 1)
      rectG(k, 0, w, -apron, 0.3, sp.pave); // 素面鋪面（水泥地、灰色人行道）
    else {
      // 人行道有 7～8 m 寬，地形有起伏：鋪面做成貼著地形的網格（高出地面 6 cm），才不會被草地穿出來
      const nx = Math.max(1, Math.ceil(w / 1.5)),
        nz = Math.max(1, Math.ceil(apron / 1.5)),
        pos = [],
        uv = [],
        idx = [];
      for (let j = 0; j <= nz; j++)
        for (let i = 0; i <= nx; i++) {
          const x = (w * i) / nx,
            z = -apron + ((apron + 0.3) * j) / nz,
            [wx, wz] = k.w(x, z);
          pos.push(x, Math.max(H(wx, wz) - k.base + 0.06, j === nz ? 0.02 : -9), z);
          uv.push(x / 1.6, z / 1.6);
        }
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          const a = j * (nx + 1) + i,
            b = a + 1,
            c = a + nx + 1,
            e = c + 1;
          idx.push(a, c, b, b, c, e);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      k._part(PAVE, g);
    }
    if (sp.verge) {
      // 植栽帶：草地＋一叢一叢的紅葉石楠矮籬（綠底、頂端紅褐）
      const [o0, o1, gaps = []] = sp.verge,
        zc = (o0 + o1) / 2 + 0.5 - set;
      let x0 = 0,
        n = 0;
      for (const [g0, g1] of [...gaps, [w, w]]) {
        if (g0 - x0 > 0.6) {
          rectG(k, x0, g0, o0 - set, o1 - set, '#5f8246', 0.09);
          for (let x = x0 + 0.3; x < g0 - 0.8; x += 1.7, n++) {
            const l = Math.min(1.5, g0 - 0.3 - x),
              y = gy(k, x + l / 2, zc);
            k.box(x, x + l, y - 0.2, y + 0.55, zc - 1.0, zc + 1.0, '#4f7a3a', nb);
            if (n % 3 !== 1)
              k.box(x + 0.05, x + l - 0.05, y + 0.55, y + 0.68, zc - 0.9, zc + 0.9, '#9a4f3a', nb);
          }
        }
        x0 = g1;
      }
    }
    for (const t of sp.trees || []) {
      if (Array.isArray(t)) tree(k, t[0], 6 - set, t[1], t[2], r, gy(k, t[0], 6 - set));
      else {
        tree(k, t, 6 - set, 3.2, 1.15, r);
        k.box(t - 0.7, t + 0.7, 0.05, 0.07, 5.3 - set, 6.7 - set, '#6b5a44', nb);
      }
    }
    for (const [x0, x1] of sp.mc || [])
      for (let x = x0; x <= x1 + 0.01; x += 0.95) {
        k.box(x - 0.03, x + 0.03, 0.05, 0.065, 4.7 - set, 6.7 - set, '#e8e8e4', nb);
        if (
          x + 0.95 <= x1 + 0.01 &&
          r() < 0.62 &&
          !(sp.trees || []).some((t) => Math.abs(t - x - 0.47) < 1.0)
        )
          bike(k, x + 0.47, 4.9 - set, 1, bikeCols[(r() * 6) | 0]);
      }
    for (const x of sp.poles || []) {
      k.cyl(x, 5 - set, 0.17, -0.3, 9.5, '#b9b6ae', { seg: 8, col: true, r1: 0.12 });
      for (let j = 0; j < 6; j++)
        k.cyl(x, 5 - set, 0.185, 0.2 + j * 0.3, 0.5 + j * 0.3, j % 2 ? '#1c1c1e' : '#f2c230', {
          seg: 8,
        });
      k.box(x - 0.9, x + 0.9, 8.6, 8.7, 4.95 - set, 5.05 - set, '#8a8d90', nb);
    }
  };
  // ---- A 段（環中東路北側，708巷口往西）專用的貼圖 ----
  const darkGl = sg('hzDarkGl', 256, 128, (g) => {
    g.fillStyle = '#17191b';
    g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 4; i++) {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, '#46545c');
      gr.addColorStop(0.55, '#2a3238');
      gr.addColorStop(1, '#1d2226');
      g.fillStyle = gr;
      g.fillRect(i * 64 + 3, 4, 58, 120);
      g.fillStyle = 'rgba(255,255,255,.10)';
      g.fillRect(i * 64 + 8, 6, 14, 116);
    }
  });
  const darkShop = sg('hzDarkShop', 256, 160, (g) => {
    g.fillStyle = '#141516';
    g.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 3; i++) {
      const x = i * 85 + 3,
        gr = g.createLinearGradient(0, 0, 0, 160);
      gr.addColorStop(0, '#3a332a');
      gr.addColorStop(0.5, '#2a2622');
      gr.addColorStop(1, '#1a1a1a');
      g.fillStyle = gr;
      g.fillRect(x, 4, 80, 152);
      g.fillStyle = 'rgba(255,214,150,.75)';
      g.fillRect(x + 14, 22, 10, 6);
      g.fillRect(x + 52, 30, 10, 6);
      g.fillStyle = 'rgba(255,255,255,.08)';
      g.fillRect(x + 6, 6, 18, 148);
    }
  });
  const bandWin = sg('hzBandWin', 512, 96, (g) => {
    g.fillStyle = '#c4c9c7';
    g.fillRect(0, 0, 512, 96);
    for (let i = 0; i < 8; i++) {
      const gr = g.createLinearGradient(0, 0, 0, 96);
      gr.addColorStop(0, '#b4c9c1');
      gr.addColorStop(1, '#7f9c95');
      g.fillStyle = gr;
      g.fillRect(i * 64 + 3, 5, 58, 86);
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(i * 64 + 8, 7, 12, 82);
    }
  });
  const curtain = sg('hzCurtain', 128, 768, (g) => {
    // 720 號大樓的玻璃帷幕直帶：白色格框、淺綠玻璃、頂端半圓拱
    g.clearRect(0, 0, 128, 768);
    g.beginPath();
    g.moveTo(0, 768);
    g.lineTo(0, 64);
    g.arc(64, 64, 64, Math.PI, 0);
    g.lineTo(128, 768);
    g.closePath();
    g.save();
    g.clip();
    g.fillStyle = '#eef0ee';
    g.fillRect(0, 0, 128, 768);
    for (let y = 0; y < 768; y += 32)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = ((y / 32) * 3 + x) % 7 === 0 ? '#86a39a' : '#a4bdb4';
        g.fillRect(x * 32 + 3, y + 3, 26, 26);
      }
    g.restore();
  });
  const listings = sg('hzListings', 256, 128, (g) => {
    g.fillStyle = '#2a332e';
    g.fillRect(0, 0, 256, 128);
    const r = lcg(9);
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 12; x++) {
        g.fillStyle = r() < 0.2 ? '#f2d86a' : '#f4f4ee';
        g.fillRect(6 + x * 21, 8 + y * 23, 17, 19);
        g.fillStyle = '#c0392b';
        g.fillRect(8 + x * 21, 10 + y * 23, 13, 4);
      }
  });
  const scooter = (g, cx, cy, s, col) => {
    g.fillStyle = '#1c1c1e';
    for (const dx of [-1, 1]) {
      g.beginPath();
      g.arc(cx + dx * s * 0.9, cy + s * 0.45, s * 0.3, 0, 7);
      g.fill();
    }
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(cx - s * 1.15, cy + s * 0.2);
    g.lineTo(cx - s * 0.7, cy - s * 0.35);
    g.lineTo(cx + s * 0.2, cy - s * 0.3);
    g.lineTo(cx + s * 0.55, cy - s * 0.95);
    g.lineTo(cx + s * 0.8, cy - s * 0.95);
    g.lineTo(cx + s * 1.1, cy + s * 0.3);
    g.lineTo(cx - s * 0.2, cy + s * 0.45);
    g.closePath();
    g.fill();
  };
  const yamSign = board('yamSign', 10.5, 1.3, (g, W, Hh) => {
    // 白底、下緣紅帶，紅色音叉圓標＋YAMAHA，右邊小字
    g.fillStyle = '#f0f0f0';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#d8262c';
    g.fillRect(0, Hh * 0.84, W, Hh * 0.16);
    const cx = W * 0.2,
      cy = Hh * 0.42,
      R = Hh * 0.3;
    g.beginPath();
    g.arc(cx, cy, R, 0, 7);
    g.fill();
    g.strokeStyle = '#f0f0f0';
    g.lineWidth = R * 0.16;
    for (let a = 0; a < 3; a++) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.sin(a * 2.094) * R * 0.8, cy - Math.cos(a * 2.094) * R * 0.8);
      g.stroke();
    }
    fitText(g, 'YAMAHA', W * 0.36, cy, W * 0.24, Hh * 0.62, '#d8262c');
    g.fillStyle = '#2a5fd0';
    g.beginPath();
    g.arc(W * 0.62, cy, Hh * 0.2, 0, 7);
    g.fill();
    fitText(g, '機車排氣檢驗站', W * 0.8, cy, W * 0.28, Hh * 0.36, '#111111');
  });
  const yamAds = board('yamAds', 10.5, 2.1, (g, W, Hh) => {
    // 三幅機車廣告照片（字看不清，只畫色塊與機車）
    const P = [
      ['#d9d9d6', '#b9bbbd', '#1f2124'],
      ['#1f4f9a', '#3f86d8', '#f2f2f2'],
      ['#f2f2ee', '#dfe3e6', '#8a8f96'],
    ];
    P.forEach(([c0, c1, sc], j) => {
      const x = (j * W) / 3,
        gr = g.createLinearGradient(x, 0, x + W / 3, Hh);
      gr.addColorStop(0, c0);
      gr.addColorStop(1, c1);
      g.fillStyle = gr;
      g.fillRect(x + 3, 3, W / 3 - 6, Hh - 6);
      scooter(g, x + W / 6 + (j === 2 ? -W * 0.04 : 0), Hh * 0.62, Hh * 0.3, sc);
    });
    g.fillStyle = '#3a3a3a';
    g.fillRect(W * 0.07, Hh * 0.2, Hh * 0.12, Hh * 0.62);
    for (const dx of [0.25, 0.28, 0.3]) {
      g.fillStyle = '#6a5a52';
      g.fillRect(W * (0.66 + dx - 0.02), Hh * 0.3, Hh * 0.1, Hh * 0.55);
    }
  });
  const yamShow = sg('hzYamShow', 256, 192, (g) => {
    g.fillStyle = '#e9e6df';
    g.fillRect(0, 0, 256, 192);
    g.fillStyle = '#b9b5ac';
    g.fillRect(0, 130, 256, 62);
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (let x = 20; x < 256; x += 70) g.fillRect(x, 10, 40, 6);
    scooter(g, 60, 140, 30, '#2a2a30');
    scooter(g, 150, 146, 32, '#b02a2a');
    scooter(g, 220, 138, 26, '#2f6db3');
  });
  const sanluPoster = board('sanlu', 2.6, 2.2, (g, W, Hh) => {
    // 米色海報：一杯奶茶、「鮮奶」「麻薯飲」、紅印章、「三露 奶茶舖」
    g.fillStyle = '#e9d3b5';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#f6efe2';
    g.beginPath();
    g.moveTo(W * 0.14, Hh * 0.3);
    g.lineTo(W * 0.5, Hh * 0.3);
    g.lineTo(W * 0.44, Hh * 0.82);
    g.lineTo(W * 0.2, Hh * 0.82);
    g.closePath();
    g.fill();
    g.fillStyle = '#b98a5e';
    g.beginPath();
    g.moveTo(W * 0.155, Hh * 0.42);
    g.lineTo(W * 0.485, Hh * 0.42);
    g.lineTo(W * 0.44, Hh * 0.82);
    g.lineTo(W * 0.2, Hh * 0.82);
    g.closePath();
    g.fill();
    g.fillStyle = '#5a3a2a';
    for (let j = 0; j < 5; j++) {
      g.beginPath();
      g.arc(W * (0.24 + j * 0.04), Hh * 0.77, W * 0.018, 0, 7);
      g.fill();
    }
    fitText(g, '鮮奶', W * 0.74, Hh * 0.2, W * 0.4, Hh * 0.17, '#5a3a2a');
    fitText(g, '麻薯飲', W * 0.74, Hh * 0.42, W * 0.44, Hh * 0.17, '#5a3a2a');
    g.fillStyle = '#c0392b';
    g.fillRect(W * 0.66, Hh * 0.56, W * 0.16, W * 0.16);
    fitText(g, '三露 奶茶舖', W * 0.5, Hh * 0.91, W * 0.8, Hh * 0.1, '#5a3a2a', 700);
  });
  const sanluSign = board('sanluS', 2.6, 0.6, (g, W, Hh) => {
    g.fillStyle = '#222222';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(W / 2, Hh * 0.3, Hh * 0.22, Hh * 0.12, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.moveTo(W / 2 + Hh * 0.18, Hh * 0.28);
    g.lineTo(W / 2 + Hh * 0.36, Hh * 0.2);
    g.lineTo(W / 2 + Hh * 0.2, Hh * 0.36);
    g.fill();
    fitText(g, 'SANLU', W / 2, Hh * 0.72, W * 0.5, Hh * 0.3, '#ffffff', 700);
  });
  const fwSign = board('fengwei', 5.8, 1.0, (g, W, Hh) => {
    // 紅底白字「鳳味坊 [黃底公雞圓標] 烏骨雞」，下排訂購專線
    g.fillStyle = '#b3262b';
    g.fillRect(0, 0, W, Hh);
    fitText(g, '鳳味坊', W * 0.22, Hh * 0.42, W * 0.36, Hh * 0.62, '#ffffff');
    fitText(g, '烏骨雞', W * 0.78, Hh * 0.42, W * 0.36, Hh * 0.62, '#ffffff');
    g.fillStyle = '#f2c230';
    g.beginPath();
    g.arc(W / 2, Hh * 0.42, Hh * 0.33, 0, 7);
    g.fill();
    g.fillStyle = '#5a2a1a';
    g.beginPath();
    g.ellipse(W / 2, Hh * 0.46, Hh * 0.17, Hh * 0.13, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(W / 2 + Hh * 0.13, Hh * 0.3, Hh * 0.08, 0, 7);
    g.fill();
    g.fillStyle = '#c0392b';
    g.fillRect(W / 2 + Hh * 0.1, Hh * 0.18, Hh * 0.07, Hh * 0.06);
    fitText(g, '訂購專線：456-0159', W / 2, Hh * 0.88, W * 0.5, Hh * 0.16, '#ffffff', 700);
  });
  const zsSign = board('zhushang', 7.0, 1.3, (g, W, Hh) => {
    // 深綠底白字「住商不動產」，最左邊白底綠字方形標誌，右側小字
    g.fillStyle = '#1f5a3c';
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#ffffff';
    g.fillRect(Hh * 0.12, Hh * 0.12, Hh * 0.95, Hh * 0.76);
    fitText(g, '住商', Hh * 0.6, Hh * 0.35, Hh * 0.8, Hh * 0.34, '#1f5a3c');
    fitText(g, '不動產', Hh * 0.6, Hh * 0.68, Hh * 0.8, Hh * 0.26, '#1f5a3c');
    fitText(g, '住商不動產', W * 0.47, Hh * 0.5, W * 0.46, Hh * 0.66, '#ffffff');
    fitText(g, '中壢後站加盟店', W * 0.86, Hh * 0.32, W * 0.25, Hh * 0.2, '#ffffff', 700);
    fitText(g, '03-271-1577', W * 0.86, Hh * 0.64, W * 0.25, Hh * 0.24, '#ffffff', 700);
  });
  const blueBoard = board('a8blue', 4.3, 2.8, (g, W, Hh) => {
    // 藍底看板：黃白字與竹葉（店名看不清，只畫色塊，不寫字）
    g.fillStyle = '#3f66b0';
    g.fillRect(0, 0, W, Hh);
    g.strokeStyle = '#3f9a5a';
    g.lineWidth = Hh * 0.025;
    for (let j = 0; j < 6; j++) {
      g.beginPath();
      g.moveTo(W * (0.04 + j * 0.03), Hh * 0.05);
      g.lineTo(W * (0.12 + j * 0.04), Hh * (0.3 + j * 0.03));
      g.stroke();
    }
    g.fillStyle = '#f2d23a';
    g.fillRect(W * 0.3, Hh * 0.14, W * 0.42, Hh * 0.16);
    g.fillStyle = '#f4f4f0';
    for (let j = 0; j < 3; j++)
      g.fillRect(W * 0.12, Hh * (0.42 + j * 0.13), W * (0.6 - j * 0.08), Hh * 0.06);
    g.fillStyle = '#f4f4f0';
    g.fillRect(W * 0.78, Hh * 0.6, W * 0.16, W * 0.16);
    g.fillStyle = '#f2d23a';
    g.fillRect(W * 0.12, Hh * 0.84, W * 0.5, Hh * 0.07);
  });
  const templeBoard = board('xuanlong', 8.5, 2.6, (g, W, Hh) => {
    // 紅底黃字「玄龍宮」，下排「濟公禪師 王母娘娘」，左側龍的彩繪、上排四幅神像、右側卡通濟公
    g.fillStyle = '#c8281e';
    g.fillRect(0, 0, W, Hh);
    const gr = g.createLinearGradient(0, 0, W * 0.24, Hh);
    gr.addColorStop(0, '#2a3f7a');
    gr.addColorStop(1, '#8fb0d8');
    g.fillStyle = gr;
    g.fillRect(Hh * 0.04, Hh * 0.04, W * 0.24, Hh * 0.92);
    g.strokeStyle = '#f4f0e0';
    g.lineWidth = Hh * 0.07;
    g.beginPath();
    g.moveTo(W * 0.04, Hh * 0.75);
    g.bezierCurveTo(W * 0.1, Hh * 0.2, W * 0.16, Hh * 0.9, W * 0.22, Hh * 0.3);
    g.stroke();
    g.fillStyle = '#f4f0e0';
    g.beginPath();
    g.arc(W * 0.22, Hh * 0.28, Hh * 0.09, 0, 7);
    g.fill();
    for (let j = 0; j < 4; j++) {
      g.fillStyle = ['#f2e2c0', '#e8c890', '#f0d8b0', '#e0b880'][j];
      g.fillRect(W * (0.3 + j * 0.09), Hh * 0.05, W * 0.075, Hh * 0.3);
      g.fillStyle = ['#7a2a2a', '#2a4a7a', '#7a5a2a', '#4a2a6a'][j];
      g.fillRect(W * (0.315 + j * 0.09), Hh * 0.17, W * 0.045, Hh * 0.18);
    }
    fitText(g, '玄龍宮', W * 0.52, Hh * 0.56, W * 0.42, Hh * 0.4, '#f6d23a');
    fitText(g, '濟公禪師 王母娘娘', W * 0.52, Hh * 0.88, W * 0.42, Hh * 0.13, '#f6d23a', 700);
    g.fillStyle = '#f2d8b8';
    g.beginPath();
    g.arc(W * 0.88, Hh * 0.5, Hh * 0.2, 0, 7);
    g.fill();
    g.fillStyle = '#2a2a4a';
    g.fillRect(W * 0.88 - Hh * 0.22, Hh * 0.16, Hh * 0.44, Hh * 0.18);
    g.fillStyle = '#f4f4f0';
    g.fillRect(W * 0.88 - Hh * 0.2, Hh * 0.7, Hh * 0.4, Hh * 0.26);
  });
  const templeDoor = sg('hzTempleDoor', 256, 256, (g) => {
    g.fillStyle = '#3a2a22';
    g.fillRect(0, 0, 256, 256);
    for (const x of [6, 132]) {
      g.fillStyle = '#5a4a3a';
      g.fillRect(x, 6, 118, 244);
      g.fillStyle = '#e8b83a';
      g.beginPath();
      g.arc(x + 59, 150, 34, 0, 7);
      g.fill();
      g.fillStyle = '#b8442a';
      g.beginPath();
      g.arc(x + 59, 150, 20, 0, 7);
      g.fill();
    }
  });
  const tfBoard = board('tangfeng', 8.8, 2.4, (g, W, Hh) => {
    // 黃底：紅字「唐風」紫字「采」紅字「廣告」，一列藍底白字小方塊，最下排紅字電話
    g.fillStyle = '#f4c21f';
    g.fillRect(0, 0, W, Hh);
    [...'唐風采廣告'].forEach((c, j) =>
      fitText(
        g,
        c,
        W * (0.12 + j * 0.19),
        Hh * 0.32,
        W * 0.17,
        Hh * 0.52,
        j === 2 ? '#6a3fb0' : '#d42a20'
      )
    );
    ['廣告看板', '帆布', '大圖輸出', 'LED字幕機'].forEach((t, j) => {
      g.fillStyle = '#2a4fa8';
      g.fillRect(W * (0.04 + j * 0.24), Hh * 0.62, W * 0.2, Hh * 0.13);
      fitText(g, t, W * (0.14 + j * 0.24), Hh * 0.69, W * 0.18, Hh * 0.1, '#ffffff', 700);
    });
    fitText(g, '0988-137886', W * 0.26, Hh * 0.88, W * 0.42, Hh * 0.17, '#d42a20');
    fitText(g, '0971-489550', W * 0.74, Hh * 0.88, W * 0.42, Hh * 0.17, '#d42a20');
  });
  const zySign = board('zhenyu', 9.5, 1.2, (g, W, Hh) => {
    // 亮藍底白字「振宇五金 ZhenYu Hardware」＋白色膠囊 since1989
    g.fillStyle = '#2f8fd6';
    g.fillRect(0, 0, W, Hh);
    fitText(g, '振宇五金', W * 0.3, Hh * 0.45, W * 0.44, Hh * 0.7, '#ffffff');
    fitText(g, 'ZhenYu Hardware', W * 0.75, Hh * 0.3, W * 0.42, Hh * 0.36, '#ffffff', 800);
    g.fillStyle = '#ffffff';
    const cw = W * 0.17,
      chh = Hh * 0.24,
      x0 = W * 0.78,
      y0 = Hh * 0.56;
    g.beginPath();
    g.arc(x0, y0 + chh / 2, chh / 2, Math.PI / 2, Math.PI * 1.5);
    g.arc(x0 + cw, y0 + chh / 2, chh / 2, -Math.PI / 2, Math.PI / 2);
    g.closePath();
    g.fill();
    fitText(g, 'since1989', x0 + cw / 2, y0 + chh / 2, cw, chh * 0.8, '#2f8fd6', 800);
  });
  const jyBoard = board('jiayu', 5.0, 1.7, (g, W, Hh) => {
    // 藍底白字：左邊直寫大字「佳語」，中間三排服務項目，下排電話
    g.fillStyle = '#2a4fa0';
    g.fillRect(0, 0, W, Hh);
    fitText(g, '佳', W * 0.1, Hh * 0.27, W * 0.17, Hh * 0.44, '#ffffff');
    fitText(g, '語', W * 0.1, Hh * 0.72, W * 0.17, Hh * 0.44, '#ffffff');
    ['房屋修繕 塑膠地板', '裝潢 油漆 木作 拆除', '水電 衛浴 防水 窗簾'].forEach((t, j) =>
      fitText(g, t, W * 0.6, Hh * (0.15 + j * 0.2), W * 0.74, Hh * 0.17, '#ffffff', 800)
    );
    fitText(g, '0986-834-965', W * 0.6, Hh * 0.82, W * 0.7, Hh * 0.2, '#ffffff');
  });
  // 鐵皮屋的殼：浪板牆、屋簷上方一片立起來的山牆（背後撐看板）、往後傾的屋頂
  const tin = (k, w, d, eave, topY, roofCol) => {
    k.box(0, w, -0.8, eave, 0, d, '#d8d8d2');
    k.box(0, w, eave, topY, 0, 0.14, '#d8d8d2', nb);
    k.box(-0.12, w + 0.12, eave + 0.45, eave + 0.55, 0.14, d * 0.5, roofCol, nb);
    k.box(-0.12, w + 0.12, eave, eave + 0.1, d * 0.5, d + 0.12, roofCol, nb);
    k.box(-0.02, w + 0.02, eave, eave + 0.45, d * 0.5 - 0.05, d * 0.5, '#d8d8d2', nb);
  };

  // ---- D 段（708 巷口以東，南北兩側）共用的小工具與招牌貼圖 ----
  const carY = (k, x, z, hex) => {
    const y = gy(k, x + 0.9, z + 2.1);
    k.box(x, x + 1.8, y + 0.3, y + 0.95, z, z + 4.3, hex);
    k.box(x + 0.12, x + 1.68, y + 0.95, y + 1.48, z + 1.0, z + 3.3, '#2a2d33', nb);
    for (const zz of [0.55, 3.15])
      k.box(x - 0.03, x + 1.83, y, y + 0.62, z + zz, z + zz + 0.62, '#1c1c1e', nb);
  }; // 停在斜坡上也貼地的車
  const flood = (k, x, y, z) => {
    k.box(x - 0.03, x + 0.03, y, y + 0.45, z - 1.2, z, '#2a2a2c', nb);
    k.box(x - 0.16, x + 0.16, y + 0.38, y + 0.56, z - 1.38, z - 1.14, '#3a3d42', nb);
  }; // 從招牌頂伸出去的投射燈
  const fill = (g, W, Hh, c) => {
    g.fillStyle = c;
    g.fillRect(0, 0, W, Hh);
  };
  const mukeTex = board('muke', 6.5, 3.3, (g, W, Hh) => {
    // 慕客專業檳榔：整面淺藍板、橘紅字
    fill(g, W, Hh, '#a9c6dc');
    fitText(g, '慕客專業檳榔', W * 0.4, Hh * 0.14, W * 0.5, Hh * 0.2, '#d4502a');
    vcol(g, '產地直營', W * 0.065, Hh * 0.3, Hh * 0.16, Hh * 0.13, '#d4502a');
    g.fillStyle = '#bcd4e4';
    g.fillRect(W * 0.7, 0, W * 0.3, Hh);
    vcol(g, '慕客', W * 0.92, Hh * 0.08, Hh * 0.42, Hh * 0.36, '#d4502a');
    vcol(g, '檳榔', W * 0.78, Hh * 0.08, Hh * 0.42, Hh * 0.36, '#d4502a');
    g.fillStyle = '#e8ecee';
    g.fillRect(W * 0.14, Hh * 0.3, W * 0.54, Hh * 0.7);
    g.fillStyle = '#4a5a64';
    g.fillRect(W * 0.16, Hh * 0.33, W * 0.3, Hh * 0.38);
    g.fillRect(W * 0.49, Hh * 0.33, W * 0.17, Hh * 0.64);
    fitText(g, '慕客專業檳榔', W * 0.31, Hh * 0.85, W * 0.28, Hh * 0.09, '#d4502a', 700);
  });
  const mbTex = board('musicbar', 9, 3.3, (g, W, Hh) => {
    // 黑牆：兩處白色方形圖案（篆體字認不出來，只畫方框）＋ Music Bar，中間偏右一扇黑門
    fill(g, W, Hh, '#1b1b1b');
    const rr = lcg(23);
    for (let j = 0; j < 14; j++) {
      g.fillStyle = 'rgba(120,118,110,0.18)';
      g.fillRect(rr() * W, rr() * Hh, W * 0.04 * rr(), Hh * 0.1 * rr());
    }
    for (const u of [0.17, 0.83]) {
      const s = Hh * 0.34,
        x = W * u - s / 2,
        y = Hh * 0.2;
      g.strokeStyle = '#e8e4d8';
      g.lineWidth = Math.max(2, s * 0.06);
      g.strokeRect(x, y, s, s);
      for (let j = 1; j < 3; j++) {
        g.beginPath();
        g.moveTo(x + s * 0.2, y + (s * j) / 3);
        g.lineTo(x + s * 0.8, y + (s * j) / 3);
        g.stroke();
      }
      fitText(g, 'Music Bar', W * u, Hh * 0.68, W * 0.16, Hh * 0.1, '#e8e4d8', 500);
    }
    g.fillStyle = '#0c0c0c';
    g.fillRect(W * 0.54, Hh * 0.32, W * 0.11, Hh * 0.68);
    g.strokeStyle = '#4a4a48';
    g.lineWidth = 2;
    g.strokeRect(W * 0.54, Hh * 0.32, W * 0.11, Hh * 0.68);
    g.fillStyle = '#3f8f5a';
    g.fillRect(W * 0.665, Hh * 0.5, W * 0.025, Hh * 0.08);
  });
  const jyDong = (g, cx, cy, R) => {
    g.fillStyle = '#d8322a';
    g.beginPath();
    g.arc(cx, cy, R, 0, 7);
    g.fill();
    fitText(g, '東', cx, cy + R * 0.05, R * 1.5, R * 1.4, '#111111');
  };
  const jyBill = board('jiayidong', 5, 2.5, (g, W, Hh) => {
    fill(g, W, Hh, '#d6d6cf');
    fitText(g, '嘉', W * 0.18, Hh * 0.36, W * 0.26, Hh * 0.5, '#8a8a84');
    fitText(g, '義', W * 0.82, Hh * 0.36, W * 0.26, Hh * 0.5, '#8a8a84');
    jyDong(g, W * 0.5, Hh * 0.36, Hh * 0.3);
    fitText(g, '菁仔行', W * 0.5, Hh * 0.83, W * 0.6, Hh * 0.24, '#8a8a84');
  });
  const jyBanner = board('jiayidongB', 3.6, 1.6, (g, W, Hh) => {
    fill(g, W, Hh, '#141414');
    fitText(g, '嘉', W * 0.2, Hh * 0.4, W * 0.26, Hh * 0.5, '#f4f4f0');
    fitText(g, '義', W * 0.8, Hh * 0.4, W * 0.26, Hh * 0.5, '#f4f4f0');
    jyDong(g, W * 0.5, Hh * 0.4, Hh * 0.28);
    fitText(g, '行', W * 0.5, Hh * 0.85, W * 0.2, Hh * 0.2, '#f4f4f0');
  });
  const jyKiosk = board('jiayidongK', 3, 2.8, (g, W, Hh) => {
    fill(g, W, Hh, '#2f7a3d');
    g.fillStyle = '#e8ece8';
    g.fillRect(W * 0.08, Hh * 0.12, W * 0.84, Hh * 0.42);
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let x = 0.1; x < 0.9; x += 0.08) g.fillRect(W * x, Hh * 0.13, W * 0.03, Hh * 0.4);
    fitText(g, '菁仔 特幼 普通(小口)', W * 0.5, Hh * 0.68, W * 0.88, Hh * 0.11, '#f2d23a', 800);
    fitText(g, '普通(大口)', W * 0.5, Hh * 0.84, W * 0.6, Hh * 0.11, '#f0a0b8', 800);
  });
  const steakTex = board('laodifang', 4.0, 0.6, (g, W, Hh) => {
    g.clearRect(0, 0, W, Hh);
    [...'佬地方牛排'].forEach((c, j) =>
      fitText(g, c, W * (0.1 + j * 0.2), Hh * 0.52, W * 0.16, Hh * 0.9, '#c8323a')
    );
  }); // 釘在木封簷板上的紅色立體字，沒有底板
  const steakWin = board('laodifangW', 4.0, 2.6, (g, W, Hh) => {
    fill(g, W, Hh, '#5f6a70');
    g.fillStyle = 'rgba(255,255,255,.72)';
    g.fillRect(W * 0.04, Hh * 0.05, W * 0.92, Hh * 0.45);
    for (let x = 0.06; x < 0.95; x += 0.07) {
      g.fillStyle = 'rgba(200,200,196,.8)';
      g.fillRect(W * x, Hh * 0.05, W * 0.012, Hh * 0.45);
    }
    fitText(g, '牛排 豬排', W * 0.5, Hh * 0.64, W * 0.8, Hh * 0.16, '#f4f4f0', 800);
    fitText(g, '雞排 魚排', W * 0.5, Hh * 0.84, W * 0.8, Hh * 0.16, '#5f9fe0', 800);
  });
  const kuyiTex = board('kuyi', 25.5, 2.3, (g, W, Hh) => {
    // 深灰浪板飾帶：金黃 K 標＋白色立體字「古意汽車」＋小字 KUYI CAR
    fill(g, W, Hh, '#33363a');
    for (let x = 0; x < W; x += W / 100) {
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fillRect(x, 0, W / 300, Hh);
    }
    g.fillStyle = '#e6a820';
    g.fillRect(W * 0.345, Hh * 0.18, W * 0.012, Hh * 0.56);
    g.beginPath();
    g.moveTo(W * 0.36, Hh * 0.46);
    g.lineTo(W * 0.39, Hh * 0.18);
    g.lineTo(W * 0.405, Hh * 0.18);
    g.lineTo(W * 0.377, Hh * 0.46);
    g.lineTo(W * 0.405, Hh * 0.74);
    g.lineTo(W * 0.39, Hh * 0.74);
    g.closePath();
    g.fill();
    fitText(g, '古意汽車', W * 0.57, Hh * 0.45, W * 0.3, Hh * 0.6, '#f4f4f0');
    fitText(g, 'KUYI CAR', W * 0.57, Hh * 0.87, W * 0.1, Hh * 0.14, '#f4f4f0', 600);
  });
  const hjSign = board('hanjiang', 10.3, 1.0, (g, W, Hh) => {
    fill(g, W, Hh, '#2b3f9e');
    fitText(g, '悍將汽車百貨', W * 0.3, Hh * 0.5, W * 0.56, Hh * 0.76, '#ffffff');
    fitText(g, '行車記錄器．LED/HID燈', W * 0.79, Hh * 0.3, W * 0.38, Hh * 0.3, '#ffffff', 700);
    fitText(g, '車用安卓機．車用精品百貨', W * 0.79, Hh * 0.72, W * 0.38, Hh * 0.3, '#ffffff', 700);
  });
  const f73Banner = board('f1973b', 15, 0.8, (g, W, Hh) => {
    fill(g, W, Hh, '#f2f2ee');
    [
      ['#8a6a4a', 0.02],
      ['#9aa4ae', 0.11],
      ['#c9b08a', 0.83],
      ['#6a7a8a', 0.92],
    ].forEach(([c, x]) => {
      g.fillStyle = c;
      g.fillRect(W * x, Hh * 0.12, W * 0.07, Hh * 0.76);
    });
    g.fillStyle = '#1e1e1f';
    g.fillRect(W * 0.21, Hh * 0.14, W * 0.07, Hh * 0.72);
    fitText(g, '1973', W * 0.245, Hh * 0.5, W * 0.06, Hh * 0.5, '#ffffff');
    fitText(g, '全台款式最多最齊全', W * 0.55, Hh * 0.5, W * 0.5, Hh * 0.72, '#2b3a6a');
  });
  const f73Tower = board('f1973t', 1.6, 6, (g, W, Hh) => {
    fill(g, W, Hh, '#1e1e1f');
    fitText(g, '1973', W * 0.5, Hh * 0.06, W * 0.8, Hh * 0.07, '#f4f4f0', 700);
    [...'家具床墊'].forEach((c, j) =>
      fitText(
        g,
        c,
        W * 0.5,
        Hh * (0.2 + j * 0.2 + (j > 1 ? 0.04 : 0)),
        W * 0.86,
        Hh * 0.19,
        '#f4f4f0'
      )
    );
  });
  const f73Side = board('f1973s', 8, 4.5, (g, W, Hh) => {
    fill(g, W, Hh, '#f2f2ee');
    g.fillStyle = '#1e1e1f';
    g.fillRect(W * 0.06, Hh * 0.1, W * 0.26, Hh * 0.34);
    fitText(g, '1973', W * 0.19, Hh * 0.27, W * 0.22, Hh * 0.24, '#ffffff');
    fitText(g, 'MIT 台灣本地設計製造', W * 0.66, Hh * 0.2, W * 0.58, Hh * 0.13, '#2b3a6a', 800);
    fitText(g, 'Hilker', W * 0.66, Hh * 0.4, W * 0.3, Hh * 0.13, '#6a6d70', 700);
    fitText(g, '1973專用停車場', W * 0.5, Hh * 0.74, W * 0.86, Hh * 0.24, '#1e1e1f');
  });
  const jyuSign = board('jiuyu', 15, 1.0, (g, W, Hh) => {
    fill(g, W, Hh, '#27358f');
    fitText(g, '久育汽車', W * 0.4, Hh * 0.5, W * 0.4, Hh * 0.78, '#ffffff');
    fitText(g, '(03)4555-922', W * 0.74, Hh * 0.5, W * 0.2, Hh * 0.34, '#ffffff', 700);
    g.fillStyle = '#f4f4f0';
    g.fillRect(W * 0.885, Hh * 0.1, W * 0.105, Hh * 0.8);
    fitText(g, '雙B', W * 0.937, Hh * 0.5, W * 0.09, Hh * 0.6, '#27358f');
  });
  const mintWin = board('mintWin', 1.0, 2.0, (g, W, Hh) => {
    fill(g, W, Hh, '#f0f0ee');
    g.fillStyle = '#9fd0c0';
    g.beginPath();
    g.moveTo(W * 0.1, Hh);
    g.lineTo(W * 0.1, Hh * 0.3);
    g.arc(W * 0.5, Hh * 0.3, W * 0.4, Math.PI, 0);
    g.lineTo(W * 0.9, Hh);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(60,110,95,.5)';
    for (let y = 0.2; y < 0.98; y += 0.06) g.fillRect(W * 0.14, Hh * y, W * 0.72, Hh * 0.015);
  });
  const flSign = board('lvzhilian', 15.5, 1.2, (g, W, Hh) => {
    // 灰底白色花葉橫幅：西段「綠之戀 花坊」、東段兩行小字
    fill(g, W, Hh, '#8c8f8a');
    const rr = lcg(57);
    g.fillStyle = 'rgba(255,255,255,.3)';
    for (let j = 0; j < 46; j++) {
      const x = rr() * W,
        y = rr() * Hh,
        a = rr() * 3;
      g.beginPath();
      g.ellipse(x, y, Hh * 0.26, Hh * 0.07, a, 0, 7);
      g.fill();
    }
    fitText(g, '綠之戀', W * 0.2, Hh * 0.5, W * 0.26, Hh * 0.84, '#ffffff');
    fitText(g, '花坊', W * 0.4, Hh * 0.56, W * 0.1, Hh * 0.52, '#ffffff');
    fitText(
      g,
      '節慶花束．婚禮會場．展場佈置',
      W * 0.76,
      Hh * 0.32,
      W * 0.42,
      Hh * 0.3,
      '#ffffff',
      700
    );
    fitText(
      g,
      '剪綵開幕．生日派對．盆栽租賃',
      W * 0.76,
      Hh * 0.72,
      W * 0.42,
      Hh * 0.3,
      '#ffffff',
      700
    );
  });
  const alWinTex = board('alishanW', 3.2, 3.0, (g, W, Hh) => {
    fill(g, W, Hh, '#e4e0d4');
    g.fillStyle = '#56666f';
    g.fillRect(W * 0.08, Hh * 0.08, W * 0.84, Hh * 0.42);
    g.fillStyle = 'rgba(255,255,255,.2)';
    g.fillRect(W * 0.1, Hh * 0.1, W * 0.25, Hh * 0.38);
    g.fillStyle = '#e8d84a';
    g.fillRect(W * 0.08, Hh * 0.56, W * 0.84, Hh * 0.36);
    fitText(g, '特幼 普通', W * 0.5, Hh * 0.74, W * 0.76, Hh * 0.22, '#c8202a');
  });
  const alSign = board('alishan', 7.5, 1.4, (g, W, Hh) => {
    // 黃底：山形商標、深藍大字「阿里山」、紅字小字，右端藍底白字直寫「菁仔行」
    fill(g, W, Hh, '#e8d84a');
    g.fillStyle = '#1f3a8a';
    g.beginPath();
    g.moveTo(W * 0.03, Hh * 0.62);
    g.lineTo(W * 0.1, Hh * 0.16);
    g.lineTo(W * 0.14, Hh * 0.4);
    g.lineTo(W * 0.18, Hh * 0.22);
    g.lineTo(W * 0.23, Hh * 0.62);
    g.closePath();
    g.fill();
    fitText(g, '阿里山', W * 0.52, Hh * 0.4, W * 0.5, Hh * 0.66, '#1f3a8a');
    fitText(g, '產地直營 品質保證', W * 0.5, Hh * 0.86, W * 0.5, Hh * 0.2, '#c8202a', 800);
    g.fillStyle = '#2a4fa8';
    g.fillRect(W * 0.86, 0, W * 0.14, Hh);
    vcol(g, '菁仔行', W * 0.93, Hh * 0.05, Hh * 0.3, Hh * 0.27, '#ffffff');
  });
  const hotPink = board('hotPink', 18, 3.3, (g, W, Hh) => {
    // 好車大聯盟：粉橘底，青綠小車吉祥物＋藍字 HOT＋大聯盟，深灰大字，右邊菁銳汽車與電話
    fill(g, W, Hh, '#f0b8a8');
    g.fillStyle = '#5fc0a8';
    g.beginPath();
    g.ellipse(W * 0.09, Hh * 0.5, W * 0.055, Hh * 0.26, 0, 0, 7);
    g.fill();
    g.fillStyle = '#1c1c1e';
    for (const dx of [-0.03, 0.03]) {
      g.beginPath();
      g.arc(W * (0.09 + dx), Hh * 0.74, Hh * 0.07, 0, 7);
      g.fill();
    }
    fitText(g, 'HOT', W * 0.2, Hh * 0.4, W * 0.1, Hh * 0.42, '#2a6fd0');
    fitText(g, '大聯盟', W * 0.2, Hh * 0.74, W * 0.09, Hh * 0.2, '#3a3d42', 800);
    fitText(g, '好車大聯盟', W * 0.5, Hh * 0.5, W * 0.4, Hh * 0.5, '#4a4a4c');
    fitText(g, '菁銳汽車', W * 0.86, Hh * 0.36, W * 0.22, Hh * 0.3, '#4a4a4c');
    fitText(g, '03-462-5122', W * 0.86, Hh * 0.7, W * 0.22, Hh * 0.2, '#4a4a4c', 800);
  });
  const hotYel = board('hotYel', 7, 3.3, (g, W, Hh) => {
    fill(g, W, Hh, '#f0c020');
    fitText(g, 'HOT保修大聯盟', W * 0.5, Hh * 0.36, W * 0.9, Hh * 0.36, '#1a1a1a');
    fitText(g, '庫柏汽車 0981-725-402', W * 0.5, Hh * 0.74, W * 0.9, Hh * 0.2, '#1a1a1a', 800);
  });
  const lsBill = board('liangshiB', 6, 6, (g, W, Hh) => {
    fill(g, W, Hh, '#dfe5e8');
    g.fillStyle = '#8fa4b0';
    g.fillRect(0, 0, W, Hh * 0.82);
    g.strokeStyle = '#f6f6f2';
    g.lineWidth = W * 0.012;
    for (let j = 0; j < 2; j++) {
      const x = W * (0.1 + j * 0.42),
        wd = W * 0.36;
      g.strokeRect(x, Hh * 0.14, wd, Hh * 0.6);
      for (let a = 1; a < 4; a++) {
        g.beginPath();
        g.moveTo(x + (wd * a) / 4, Hh * 0.14);
        g.lineTo(x + (wd * a) / 4, Hh * 0.74);
        g.stroke();
      }
      for (let b = 1; b < 5; b++) {
        g.beginPath();
        g.moveTo(x, Hh * (0.14 + 0.12 * b));
        g.lineTo(x + wd, Hh * (0.14 + 0.12 * b));
        g.stroke();
      }
    }
    g.fillStyle = '#27358f';
    g.fillRect(0, Hh * 0.86, W, Hh * 0.14);
  }); // 東山牆的門窗廣告看板：格子門窗照片＋深藍底條（公司名看不清，不寫字）
  const springSign = board('spring', 6, 1.0, (g, W, Hh) => {
    fill(g, W, Hh, '#e58aa0');
    for (const cx of [0.04, 0.085]) {
      g.fillStyle = '#3a2a30';
      g.beginPath();
      g.ellipse(W * cx, Hh * 0.6, W * 0.016, Hh * 0.2, 0, 0, 7);
      g.fill();
      g.beginPath();
      g.arc(W * cx, Hh * 0.32, Hh * 0.1, 0, 7);
      g.fill();
    }
    fitText(g, 'Spring', W * 0.2, Hh * 0.4, W * 0.16, Hh * 0.44, '#f6e04a');
    fitText(g, '春天', W * 0.38, Hh * 0.4, W * 0.16, Hh * 0.56, '#c8323a');
    fitText(g, '貓狗生活館', W * 0.68, Hh * 0.4, W * 0.4, Hh * 0.52, '#ffffff');
    fitText(g, 'TEL:(03)438-3661', W * 0.6, Hh * 0.84, W * 0.4, Hh * 0.18, '#ffffff', 700);
    g.fillStyle = '#f6e04a';
    g.beginPath();
    g.arc(W * 0.95, Hh * 0.5, Hh * 0.2, 0, 7);
    g.fill();
  });
  const tpcPlate = board('tpcPlate', 3.0, 0.8, (g, W, Hh) => {
    fill(g, W, Hh, '#9a9c98');
    g.strokeStyle = '#2a2a2a';
    g.lineWidth = Hh * 0.05;
    g.beginPath();
    g.arc(W * 0.1, Hh * 0.5, Hh * 0.28, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(W * 0.1, Hh * 0.24);
    g.lineTo(W * 0.1, Hh * 0.76);
    g.stroke();
    fitText(g, '台灣電力公司', W * 0.58, Hh * 0.3, W * 0.72, Hh * 0.36, '#1a1a1a');
    fitText(g, '中原一次配電變電所', W * 0.58, Hh * 0.72, W * 0.78, Hh * 0.34, '#1a1a1a');
  });
  const ledTex = board('subLed', 1.5, 0.5, (g, W, Hh) => {
    fill(g, W, Hh, '#0c0c0c');
    g.fillStyle = '#e02a20';
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 26; x++)
        if ((x * 7 + y * 5) % 4)
          g.fillRect(W * (0.04 + x * 0.036), Hh * (0.2 + y * 0.24), W * 0.018, Hh * 0.1);
  });
  const subGlass = board(
    'subGlass',
    10,
    15,
    (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, W, Hh);
      gr.addColorStop(0, '#86b0ac');
      gr.addColorStop(1, '#5f8a8a');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#3f5f60';
      g.lineWidth = 3;
      for (let j = 0; j <= 6; j++) {
        g.beginPath();
        g.moveTo((W * j) / 6, 0);
        g.lineTo((W * j) / 6, Hh);
        g.stroke();
      }
      for (let j = 0; j <= 7; j++) {
        g.beginPath();
        g.moveTo(0, (Hh * j) / 7);
        g.lineTo(W, (Hh * j) / 7);
        g.stroke();
      }
    },
    32
  );
  const subStripe = (wm) =>
    board(
      `subStripe${wm}`,
      wm,
      10,
      (g, W, Hh) => {
        fill(g, W, Hh, '#d9d9d4');
        const rr = lcg(91),
          m = W / wm;
        for (let x = 0; x < W;) {
          const a = (0.6 + rr()) * m,
            b = (0.4 + rr() * 0.6) * m;
          g.fillStyle = '#5a5c5e';
          g.fillRect(x + a, Hh * rr() * 0.3, b, Hh);
          x += a + b;
        }
      },
      32
    ); // 灰白與深灰相間的粗直條紋金屬板
  const subLouvre = board(
    'subLouvre',
    9,
    5,
    (g, W, Hh) => {
      fill(g, W, Hh, '#8f918e');
      for (let y = 0; y < Hh; y += Hh / 28) {
        g.fillStyle = 'rgba(0,0,0,.3)';
        g.fillRect(0, y, W, Hh / 70);
      }
    },
    32
  );
  const jhBanner = board('jiehuiB', 5.2, 3.2, (g, W, Hh) => {
    fill(g, W, Hh, '#141416');
    ['RELEASE YOUR', 'FULL', 'POTENTIAL'].forEach((t, j) =>
      fitText(g, t, W * 0.36, Hh * (0.18 + j * 0.2), W * 0.62, Hh * 0.17, '#f4f4f0')
    );
    g.fillStyle = '#c8202a';
    g.beginPath();
    g.ellipse(W * 0.68, Hh * 0.74, W * 0.24, Hh * 0.12, 0, 0, 7);
    g.fill();
    g.fillStyle = '#1c1c1e';
    for (const dx of [-0.13, 0.13]) {
      g.beginPath();
      g.arc(W * (0.68 + dx), Hh * 0.84, Hh * 0.06, 0, 7);
      g.fill();
    }
  });
  const sqqSign = board('senqiqi', 12, 3.0, (g, W, Hh) => {
    // 深綠底白字「森棲棲」，兩端是小動物照片（只畫色塊）
    fill(g, W, Hh, '#2f6b3a');
    [
      ['#c9d86a', 0.02],
      ['#e8e0d0', 0.12],
      ['#d8b890', 0.8],
      ['#e8d0b0', 0.9],
    ].forEach(([c, x]) => {
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(W * (x + 0.04), Hh * 0.5, W * 0.035, Hh * 0.26, 0, 0, 7);
      g.fill();
    });
    fitText(g, '森棲棲', W * 0.38, Hh * 0.42, W * 0.3, Hh * 0.6, '#ffffff');
    fitText(g, '非犬貓精品旅館', W * 0.66, Hh * 0.26, W * 0.24, Hh * 0.2, '#ffffff', 800);
    fitText(
      g,
      '桃園市中壢區環中東路673號',
      W * 0.66,
      Hh * 0.52,
      W * 0.24,
      Hh * 0.13,
      '#ffffff',
      700
    );
    fitText(g, 'TEL:0909-031-335', W * 0.66, Hh * 0.74, W * 0.24, Hh * 0.13, '#ffffff', 700);
  });
  const syBanner = board('shangyang', 17, 2.6, (g, W, Hh) => {
    fill(g, W, Hh, '#e9b3b3');
    fitText(g, '尚揚汽車工房', W * 0.4, Hh * 0.4, W * 0.7, Hh * 0.6, '#c8323a');
    fitText(g, '03-4356877', W * 0.88, Hh * 0.52, W * 0.2, Hh * 0.2, '#ffffff', 800);
    fitText(
      g,
      '新舊汽車買賣仲介．專業音響工程．天窗更換．隔熱紙．精品百貨．基礎保養',
      W * 0.5,
      Hh * 0.88,
      W * 0.94,
      Hh * 0.13,
      '#5a3a3a',
      700
    );
  });
  const xddSign = board('xiangdingdang', 40.8, 4.0, (g, W, Hh) => {
    // 褪色粉灰底大招牌帶：藍色鈴鐺圓標、灰色大字「響叮噹」、藍「五金」綠「百貨」黑「生活館」、小字環中店，右段綠色 24H 圓標與白字
    fill(g, W, Hh, '#b9a9a4');
    g.fillStyle = '#3f7fc0';
    g.beginPath();
    g.arc(W * 0.06, Hh * 0.5, Hh * 0.34, 0, 7);
    g.fill();
    g.fillStyle = '#e8e8e4';
    g.beginPath();
    g.moveTo(W * 0.06 - Hh * 0.2, Hh * 0.66);
    g.quadraticCurveTo(W * 0.06, Hh * 0.02, W * 0.06 + Hh * 0.2, Hh * 0.66);
    g.closePath();
    g.fill();
    fitText(g, '響叮噹', W * 0.21, Hh * 0.5, W * 0.2, Hh * 0.7, '#6a6a6c');
    fitText(g, '五金', W * 0.39, Hh * 0.5, W * 0.11, Hh * 0.56, '#2a5fc0');
    fitText(g, '百貨', W * 0.5, Hh * 0.5, W * 0.11, Hh * 0.56, '#3f9a4a');
    fitText(g, '生活館', W * 0.63, Hh * 0.5, W * 0.14, Hh * 0.56, '#2a2a2a');
    fitText(g, '環中店', W * 0.72, Hh * 0.66, W * 0.04, Hh * 0.2, '#6a6a6c', 800);
    g.fillStyle = '#3f9a4a';
    g.beginPath();
    g.arc(W * 0.8, Hh * 0.5, Hh * 0.3, 0, 7);
    g.fill();
    fitText(g, '24H', W * 0.8, Hh * 0.5, Hh * 0.46, Hh * 0.26, '#ffffff');
    fitText(g, '全年無休', W * 0.91, Hh * 0.36, W * 0.14, Hh * 0.34, '#ffffff');
    fitText(g, '(03)4511199', W * 0.91, Hh * 0.7, W * 0.14, Hh * 0.22, '#ffffff', 800);
  });
  const stripeCurtain = board(
    'xddCurtain',
    5.6,
    4.6,
    (g, W, Hh) => {
      fill(g, W, Hh, '#f2f2f2');
      g.fillStyle = '#d8404a';
      for (let j = 0; j < 14; j += 2) g.fillRect((W * j) / 14, 0, W / 14, Hh);
    },
    32
  );
  const hbBill = board('huanbei', 10.5, 4.5, (g, W, Hh) => {
    // 白底看板：左邊彩色圓標、黑色大字「環北印刷」、右邊紅字直排小字，下面紅帶與藍帶
    fill(g, W, Hh, '#ecebe4');
    [
      ['#d8322a', 0],
      ['#2f55b0', 2.1],
      ['#f2c230', 4.2],
    ].forEach(([c, a]) => {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(W * 0.09, Hh * 0.32);
      g.arc(W * 0.09, Hh * 0.32, Hh * 0.17, a, a + 2.1);
      g.closePath();
      g.fill();
    });
    fitText(g, '環北印刷', W * 0.47, Hh * 0.33, W * 0.52, Hh * 0.46, '#1a1a1a');
    ['彩色印刷', '影印裝訂', '型錄海報', '喜帖名片'].forEach((t, j) =>
      vcol(g, t, W * (0.955 - j * 0.052), Hh * 0.08, Hh * 0.13, Hh * 0.1, '#d8322a')
    );
    g.fillStyle = '#d8322a';
    g.fillRect(0, Hh * 0.68, W, Hh * 0.12);
    g.fillStyle = '#2f55b0';
    g.fillRect(0, Hh * 0.82, W, Hh * 0.18);
  });
  const cpcTorch = board('cpcTorch', 1.8, 1.8, (g, W, Hh) => {
    g.clearRect(0, 0, W, Hh);
    g.fillStyle = '#f4f4f4';
    g.beginPath();
    g.arc(W / 2, Hh / 2, W * 0.48, 0, 7);
    g.fill();
    g.strokeStyle = '#1f4fa8';
    g.lineWidth = W * 0.06;
    g.beginPath();
    g.arc(W / 2, Hh / 2, W * 0.4, 0, 7);
    g.stroke();
    g.fillStyle = '#d8322a';
    g.beginPath();
    g.moveTo(W * 0.5, Hh * 0.2);
    g.quadraticCurveTo(W * 0.72, Hh * 0.46, W * 0.5, Hh * 0.6);
    g.quadraticCurveTo(W * 0.3, Hh * 0.46, W * 0.5, Hh * 0.2);
    g.fill();
    g.fillStyle = '#1f4fa8';
    g.fillRect(W * 0.46, Hh * 0.6, W * 0.08, Hh * 0.18);
  }); // 中油火炬圓標（不寫字）

  const tiltX = (k, x0, x1, yA, zA, yB, zB, th, hex) => {
    const L = Math.hypot(yB - yA, zB - zA),
      g = new THREE.BoxGeometry(x1 - x0, th, L);
    g.rotateX(-Math.atan2(yB - yA, zB - zA));
    g.translate((x0 + x1) / 2, (yA + yB) / 2, (zA + zB) / 2);
    return k._part(VC, paintGeo(g, hex));
  }; // 沿 x 的斜板（mansard 斜面、斜屋頂）
  const rodX = (k, x0, x1, y, z, r, hex) => {
    const g = new THREE.CylinderGeometry(r, r, x1 - x0, 12);
    g.rotateZ(Math.PI / 2);
    g.translate((x0 + x1) / 2, y, z);
    return k._part(VC, paintGeo(g, hex));
  }; // 沿 x 的圓棒（圓弧雨庇的前緣）
  const tri = (k, [a, b, c], hex) =>
    k._part(
      VC,
      vcGeo(
        [...a, ...b, ...c, ...a, ...c, ...b],
        [0, 1, 2, 3, 4, 5],
        hex,
        [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1]
      )
    ); // 一片 xy 平面上的雙面三角形（山牆）
  // 另外開一個 Kit：原點在世界座標 A（西端），+x 朝 B（東端），+z 離開街道；用在貼著 OSM 真實建物北牆的立面板，還有斜放的變電所
  const subKit = (ox, oz, ang) => {
    const q = vcKit(new Kit(I, ox, oz, ang));
    kits.push(q);
    return q;
  };
  const edgeKit = (A, B) => {
    const a = Math.atan2(B[1] - A[1], B[0] - A[0]);
    return subKit(A[0] + Math.sin(a) * 0.25, A[1] - Math.cos(a) * 0.25, a);
  }; // 原點往街上推 25 cm（OSM 牆面的橫帶才不會穿出立面板）
  // 兩棟 OSM 真實建物的北牆（data/cycu.json 的輪廓頂點；s 是 HS 參考線上的位置），沿牆按 s 線性內插
  const along = (P0, s0, P1, s1) => (s) => {
    const t = (s - s0) / (s1 - s0);
    return [P0[0] + (P1[0] - P0[0]) * t, P0[1] + (P1[1] - P0[1]) * t];
  };
  const W87 = along([469.8, 196], 140.8, [437.4, 223], 182.9),
    W86 = along([429.5, 229.6], 193.2, [371, 274.1], 266.7);
  // I 段：環中東路南側兩棟 OSM 建物的北牆（s 是 HS 參考線上的位置）
  const WI0 = along([41, 541.5], 691.3, [33.3, 547.7], 701.2),
    WI = along([32.7, 546.9], 701.2, [-56.1, 615.3], 813.3),
    WJ = along([-57.3, 615.3], 814.2, [-86.1, 638.7], 851.3);
  const iFace = (W, s0, s1) => edgeKit(W(s1), W(s0)); // x = 0 在西端（s1），往東增加
  const iTruss = (q, x0, x1, y0, y1, z) => {
    // 屋頂上的鋼架（看板的支架）：四根柱子＋橫桿
    for (const x of [x0, x1])
      for (const zz of [z, z + 1.6])
        q.box(x - 0.08, x + 0.08, y0, y1, zz - 0.08, zz + 0.08, '#5a5d60', nb);
    for (let y = y0 + 1.2; y < y1; y += 1.6) {
      q.box(x0, x1, y, y + 0.08, z - 0.06, z + 0.06, '#5a5d60', nb);
      q.box(x0, x1, y, y + 0.08, z + 1.54, z + 1.66, '#5a5d60', nb);
    }
  };
  // 貼在 OSM 北牆外 5 cm 的立面板（edgeKit 原點又往街上推 25 cm，所以正面在 OSM 牆外 0.55 m）：
  // 碰撞跟著立面板正面走，不然人會走進立面板裡、停在後面的 OSM 牆線（#302）
  const skin = (q, L, h, hex) => {
    q.box(0, L, -0.3, h, -0.3, -0.05, hex, nb);
    q.wallLine(0, -0.3, L, -0.3, -0.3, h);
  };
  // ---- E 段的貼圖：708 巷南側空地圍牆的彩色塗鴉（藍、橘、黑白）----
  const wallArt = (wm) =>
    board(
      `wallArt${rnd1(wm)}`,
      rnd1(wm),
      1.7,
      (g, W, Hh) => {
        fill(g, W, Hh, '#6a6f78');
        const rr = lcg(Math.round(wm * 13));
        for (let j = 0; j < wm * 1.2; j++) {
          g.strokeStyle = ['#2a5fc0', '#e8822a', '#f2f2ee', '#1a1a1a', '#3fa0c0'][j % 5];
          g.lineWidth = 6 + rr() * 10;
          g.beginPath();
          const x = rr() * W;
          g.moveTo(x, Hh * (0.2 + rr() * 0.6));
          g.bezierCurveTo(
            x + rr() * 80,
            Hh * rr(),
            x + rr() * 120,
            Hh * rr(),
            x + 40 + rr() * 140,
            Hh * (0.2 + rr() * 0.6)
          );
          g.stroke();
        }
      },
      48
    );
  // ---- 專用量體（spec.own 指到這裡）：k 是那一格的 Kit（+x 沿立面往西、+z 往屋內）、w 寬、d 深、r 亂數、i 格子序號 ----
  const OWN = {
    // A1 Yamaha 機車行（街景 2026-05）：2 層樓高的白色鐵皮店面，楔形基地（背面斜邊貼著 708 巷），一樓整面玻璃、白底紅字橫招、
    // 橫招上方三幅機車廣告看板、頂緣深灰鐵皮；屋頂西南角鋼架撐起的直立看板「機車排氣檢驗站」到 13 m
    yamaha(k, w, d, r, sp, i) {
      const P = [
        [0.3, 0],
        [w, 0],
        [w, d],
        [7.6, d],
      ];
      polyPrism(k, P, -0.8, 8, '#ececec');
      polyPrism(k, P, 8, 8.1, '#3a3d42');
      P.forEach((a, j) => {
        const b = P[(j + 1) % 4];
        k.wallLine(a[0], a[1], b[0], b[1], 0, 8);
      });
      k.box(0.3, w, 7.1, 8.02, -0.07, 0, '#3a3d42', nb);
      k.box(w, w + 0.06, 7.1, 8.02, -0.07, d, '#3a3d42', nb);
      paintGeo(k.slab(0.26, 0, 7.56, d, 0.08, 7.1, 8.02, VC, nb), '#3a3d42');
      for (const x of [0.3, 3.9, 7.1, w - 0.4]) k.box(x, x + 0.4, 0, 3.6, -0.1, 0, '#f0f0ee', nb);
      shopGlass(k, 0.7, 3.9, 0, 3.0, shopTex(i));
      shopGlass(k, 7.5, w - 0.4, 0, 3.0, shopTex(i + 1));
      k.plane(yamShow, 2.8, 3.0, 5.7, 1.5, -0.03, FRONT, { emissive: 0.45 });
      k.box(0.3, w, 3.0, 3.6, -0.08, 0, '#f0f0ee', nb);
      k.box(1.0, 3.6, 3.08, 3.52, -0.1, -0.08, '#3f6fb8', nb);
      k.box(7.8, 10.2, 3.08, 3.52, -0.1, -0.08, '#e8b8c0', nb);
      hsign(k, yamSign, 10.5, 1.3, 5.65, 4.27, -0.16);
      hsign(k, yamAds, 10.5, 2.05, 5.65, 6.03, -0.12, 0.2);
      k.plane(
        vtex('山葉機車', '#ffffff', '#111111', 0.3, 1.4),
        0.3,
        1.4,
        w - 0.2,
        2.1,
        -0.11,
        FRONT
      );
      vsign(k, '機車排氣檢驗站', '#f4f4f4', '#111111', w - 1.0, 8.7, 4.3, 1.3, 1.3, '#2a5fd0'); // 屋頂西南角的直立看板
      for (const z of [0.62, 1.98])
        k.box(w - 1.05, w - 0.95, 8.1, 13, z - 0.05, z + 0.05, '#55585c', nb);
      for (const y of [9.6, 11.6]) {
        k.box(w - 3.4, w - 1.0, y, y + 0.07, 1.26, 1.34, '#55585c', nb);
      }
      k.box(w - 3.45, w - 3.37, 8.1, 11.7, 1.26, 1.34, '#55585c', nb);
      for (const x of [2.6, 8.2]) {
        k.cyl(x, -3.4, 0.03, 0, 2.7, '#c9c9c4', { seg: 6 });
        const t = vtex('YAMAHA', '#ffffff', '#d8262c', 0.55, 1.9);
        k.plane(t, 0.55, 1.9, x + 0.3, 1.7, -3.4, FRONT, { double: true });
      } // 門口兩支直立旗
      for (let j = 0; j < 5; j++) bike(k, 0.9 + j * 0.95, -2.3, 1, bikeCols[j % 6]); // 門口的展示機車
    },
    // A2 19 House 炙燒牛排＋三露奶茶舖（2026-05）：1 層挑高的白色方盒平房；東邊 9.5 m 是牛排館（黑框深色落地玻璃＋上排高窗、黑底白字橫招），
    // 西邊 3 m 是飲料小店（米色大海報、黑底白字 SANLU）；屋頂淺綠鐵皮
    house19(k, w, d, r, sp, i) {
      k.box(0, w, -0.8, 5.8, 0, d, '#f2f2f0');
      k.box(-0.03, w + 0.03, 5.8, 5.95, -0.05, d, '#e4e4e0', nb);
      k.box(0.3, w - 0.3, 5.95, 6.0, 0.3, d - 0.3, '#cfe0c4', nb);
      for (const [x0, x1] of [
        [0.5, 4.7],
        [5.1, 9.2],
      ]) {
        shopGlass(k, x0, x1, 0, 2.8, darkShop);
        k.plane(darkGl, x1 - x0, 1.05, (x0 + x1) / 2, 4.85, -0.02, FRONT);
      }
      hsign(
        k,
        paint('19 House 炙燒牛排', '#2b2b2b', '#ffffff', null, 8.4, 1.05),
        8.4,
        1.05,
        4.85,
        3.5,
        -0.16
      );
      shopGlass(k, 9.8, w - 0.3, 0, 2.3, shopTex(i));
      hsign(k, sanluSign, 2.6, 0.6, 11.0, 2.75, -0.16);
      k.plane(sanluPoster, 2.6, 2.2, 11.0, 4.3, -0.04, FRONT, { emissive: 0.15 });
      for (let f = 0; f < 2; f++)
        for (let j = 0; j < 3; j++)
          k.plane(YHT.win(), 1.5, 1.1, (w * (j + 0.5)) / 3, 1.4 + f * 2.4, d + 0.03, 0);
    },
    // A3 5 樓磁磚樓（2026-05）：1～2 樓紅褐二丁掛、3～5 樓淺灰褐小口磚，4 開間、每開間一樘鋁窗一台冷氣、每層一圈窗台板；
    // 東店面鐵捲門貼「店面出租」＋藍綠帆布雨棚，西店面「有魚兩棲爬蟲專賣」（橫招＋2～4 樓直立側招）；東側整面淺灰抹灰牆與空的招牌鋼架
    a3(k, w, d, r, sp, i) {
      const lo = `wall${lift('#7d4b3d')}`,
        hi = `wall${lift('#a8937f')}`,
        gf = 4.0,
        fh = 3.2,
        mid = gf + fh,
        top = 17.5,
        T = { tile: [0.6, 0.6] },
        bay = w / 4;
      k.box(0, w, -0.8, mid, 0, d, lo, T);
      k.box(0, w, mid, top, 0, d, hi, T);
      k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', nb);
      k.box(-0.06, 0, 5.9, top, 0, d, '#cfcfc9', nb);
      for (let j = 0; j <= 4; j++) {
        const x = Math.min(w - 0.36, Math.max(0, j * bay - 0.18));
        k.box(x, x + 0.36, 0, mid, -0.16, 0, lo, nb);
        k.box(x, x + 0.36, mid, top, -0.16, 0, hi, nb);
      }
      for (let f = 1; f <= 4; f++) {
        const y = gf + (f - 1) * fh,
          c = f < 2 ? lo : hi;
        k.box(0, w, y + 0.55, y + 0.75, -0.3, 0, c, nb);
        for (let j = 0; j < 4; j++) {
          const cx = (j + 0.5) * bay;
          if (r() < 0.2)
            k.plane(litWin(false), 1.7, 1.4, cx - 0.4, y + 1.5, -0.02, FRONT, { emissive: 0.5 });
          else k.plane(ROWT.alWin(), 1.7, 1.4, cx - 0.4, y + 1.5, -0.02, FRONT);
          ac(k, cx + 0.5, y + 1.7);
        }
      }
      k.plane(YHT.win(), 0.9, 2.2, 0.75, 1.1, -0.03, FRONT); // 最東邊的住家鐵門
      k.plane(shutterTex('#9a9a94'), 4.6, 3.0, 3.7, 1.5, -0.02, FRONT);
      k.box(1.4, 6.0, 2.98, 3.2, -0.22, 0, '#7a7e80', nb);
      k.plane(
        paint('店面出租', '#ffffff', '#d42a1f', null, 0.8, 0.45, 128),
        0.8,
        0.45,
        3.7,
        1.9,
        -0.04,
        FRONT
      );
      k.box(0.2, 6.1, 3.22, 3.32, -1.2, 0, '#3f8f86', nb);
      k.box(0.2, 6.1, 3.05, 3.24, -1.22, -1.15, '#3f8f86', nb);
      shopGlass(k, 6.5, w - 0.3, 0, 2.7, shopTex(i));
      k.box(6.4, w - 0.1, 2.78, 2.88, -1.0, 0, '#3a3f44', nb);
      hsign(
        k,
        paint('有魚兩棲爬蟲專賣', '#26262a', '#ffffff', '中壢店', 5.5, 1.1),
        5.5,
        1.1,
        9.45,
        3.6,
        -0.2
      );
      vsign(k, '有魚兩棲爬蟲專賣', '#1c1c1e', '#ffffff', w - 0.3, 4.7, 6.0, -0.65, 0.85);
      for (const z of [-0.15, -1.75])
        k.box(0.26, 0.34, 8.6, 15.2, z - 0.04, z + 0.04, '#55585c', nb);
      for (const y of [8.6, 11.9, 15.12]) k.box(0.26, 0.34, y, y + 0.08, -1.75, 0, '#55585c', nb); // 東側空的招牌鋼架
      k.box(1.0, 5.5, top + 0.12, top + 2.3, 5, 10, '#7f8c98', nb);
      k.box(7, 11, top + 0.12, top + 2.0, 6, 11, '#e8e8e4', nb);
      for (let f = 0; f < 5; f++)
        for (let j = 0; j < 3; j++)
          k.plane(
            YHT.win(),
            1.5,
            1.1,
            (w * (j + 0.5)) / 3,
            (f ? gf + (f - 1) * fh : 0) + 1.5,
            d + 0.03,
            0
          );
    },
    // A4 720 號 7 樓辦公大樓（2026-05；一樓鳳味坊烏骨雞、住商不動產）：紅褐磁磚柱與橫帶、米色窗台牆、每層整排淺綠帶窗，
    // 中間偏東一道 2～7 樓的玻璃帷幕直帶（頂端半圓拱）、底下是大樓入口；西側米白側牆 6 層小陽台與圓角樓梯間；屋頂深灰大平頂
    a4(k, w, d, r) {
      const wl = `wall${lift('#8a5a48')}`,
        gf = 4.2,
        fh = 3.4,
        top = gf + 6 * fh,
        T = { tile: [0.6, 0.6] },
        bg = '#d9cfbd';
      k.box(0, w, -0.8, top, 0, d, wl, T);
      k.box(-0.02, w + 0.02, top, top + 0.5, -0.06, d, wl, { ...nb, ...T });
      for (const x of [0, 9.2, 13.0, w - 0.3])
        k.box(x, x + 0.3, 0, top + 0.5, -0.14, 0, wl, { ...nb, ...T });
      for (let f = 1; f <= 6; f++) {
        const y = gf + (f - 1) * fh;
        for (const [x0, x1] of [
          [0.3, 9.2],
          [13.3, w - 0.3],
        ]) {
          k.box(x0, x1, y + 0.3, y + 1.25, -0.07, 0, 'wall#c9b79f', { ...nb, ...T });
          k.plane(
            bandWin,
            x1 - x0 - 0.3,
            1.65,
            (x0 + x1) / 2,
            y + 2.1,
            -0.03,
            FRONT,
            r() < 0.15 ? { emissive: 0.35 } : {}
          );
        }
        k.box(w, w + 1.0, y, y + 1.0, 4.5, 8.5, '#f0efe9', nb);
        k.plane(ROWT.alWin(), 2.2, 1.4, w + 0.1, y + 1.95, 6.5, Math.PI / 2); // 西側牆的小陽台
        k.plane(ROWT.alWin(), 2.0, 1.3, w * 0.25, y + 1.6, d + 0.03, 0);
        k.plane(ROWT.alWin(), 2.0, 1.3, w * 0.75, y + 1.6, d + 0.03, 0);
      }
      k.plane(curtain, 3.5, 20.2, 11.25, gf + 10.1, -0.05, FRONT, { transparent: true });
      k.box(w, w + 0.08, 0, top + 0.5, 0, d, bg, nb);
      k.cyl(w - 0.6, 1.5, 1.4, 0, top + 0.5, bg, { seg: 14 }); // 西側米白側牆、轉角的圓角樓梯間
      for (const [x, z] of [
        [0.4, 0.4],
        [w - 0.4, 0.4],
        [0.4, d - 0.4],
        [w - 0.4, d - 0.4],
        [w / 2, 0.4],
        [w / 2, d - 0.4],
      ])
        k.box(x - 0.2, x + 0.2, top + 0.5, top + 2.9, z - 0.2, z + 0.2, '#8a8d90', nb);
      k.box(-1.3, w + 1.3, top + 2.9, top + 3.4, -1.3, d + 1.3, '#3b3f45', nb); // 屋頂的深灰大平頂
      k.plane(shutterTex('#a3a39d'), 8.3, 3.3, 4.75, 1.65, -0.02, FRONT);
      for (let j = 0; j < 8; j++) blob(k, 1.2 + j * 1.0, 3.25, -0.3, 0.16, '#c8281e'); // 鳳味坊鐵捲門、門楣下一排紅燈籠
      hsign(k, fwSign, 5.8, 1.0, 4.75, 4.2, -0.18);
      k.plane(darkGl, 2.6, 2.8, 11.25, 1.4, -0.03, FRONT);
      k.box(9.6, 12.9, 3.0, 3.12, -1.2, 0, '#1e1e1f', nb);
      k.plane(
        paint('720', '#c8262d', '#ffffff', null, 0.4, 0.24, 256),
        0.4,
        0.24,
        9.35,
        2.4,
        -0.16,
        FRONT
      );
      shopGlass(k, 13.6, w - 0.4, 0, 2.9, listings);
      k.box(13.4, w, 3.05, 3.15, -1.5, 0, '#2f9a63', nb);
      k.box(13.4, w, 2.85, 3.07, -1.52, -1.45, '#2f9a63', nb);
      hsign(k, zsSign, 7.0, 1.3, 16.9, 3.95, -0.2);
      vsign(k, '鳳味坊烏骨雞', '#b3262b', '#ffffff', 9.0, 4.9, 2.5, -0.5, 0.55);
      vsign(k, '鳳味坊烏骨雞', '#b3262b', '#ffffff', 9.25, 8.4, 9.0, -0.7, 1.0, '#f2c230');
      vsign(k, '住商不動產', '#1f5a3c', '#ffffff', w - 0.25, 5.0, 5.0, -0.7, 0.9);
    },
    // A5～A7（2024-07／2026-05）：緊貼大樓西牆的白色貨櫃屋與紅磚矮花台、通往後面停車場的水泥車道、柏油停車場與北緣的深藍鐵皮車棚、
    // 雜木空地（低矮舊浪板棚、5～8 m 雜樹）與後面的大樹。這裡實際沒有房子
    gapA(k, w, d, r, sp) {
      const ap = sp.set - 3.7;
      k.box(0.9, 4.9, 0, 2.8, 2, 5, '#e6e6e2');
      k.box(0.85, 4.95, 2.8, 2.88, 1.95, 5.05, '#cfcfca', nb);
      k.plane(ROWT.alWin(), 1.0, 0.8, 2.2, 1.7, 1.97, FRONT);
      k.box(3.3, 4.1, 1.5, 2.0, 1.6, 2.0, MR.ac, nb);
      k.box(0.5, 4.5, 0, 0.9, 0, 0.4, '#9c5a44');
      k.box(0.6, 4.4, 0.9, 1.3, 0.05, 0.35, '#4c7d3a', nb);
      k.box(4.9, 5.5, 0, 1.1, 0.3, 0.38, '#f0f0ec', nb); // 紅磚矮花台與盆栽、白色立牌
      k.box(5, 10.5, -0.5, 0.06, -ap, 5, '#b5b2aa', { col: false, surface: true }); // 水泥車道
      k.box(0, 13.6, -0.5, 0.045, 5, d, '#55575a', { col: false, surface: true });
      k.box(10.5, w, -0.5, 0.04, 0, 5, '#6f6a55', { col: false, surface: true });
      k.box(13.6, w, -0.5, 0.04, 5, d, '#5d6b45', { col: false, surface: true });
      for (let j = 0; j <= 4; j++)
        k.box(1.2 + j * 2.6, 1.26 + j * 2.6, 0.045, 0.055, 14.5, 19.5, '#e8e8e4', nb);
      car(k, 1.6, 14.9, '#c9c9c4');
      car(k, 6.8, 14.9, '#2a2d33');
      car(k, 9.4, 15.0, '#8a2a2a');
      car(k, 11.2, 7.0, '#3a4a5a');
      for (const x of [1.0, 4.6, 8.2, 11.8])
        for (const z of [20.2, 23.0])
          k.box(x - 0.05, x + 0.05, 0, 2.9, z - 0.05, z + 0.05, '#8a8d90', nb);
      k.box(0.7, 12.1, 2.9, 3.0, 19.9, 23.3, '#2f4a7a', nb); // 深藍鐵皮車棚
      k.box(11.3, 14.6, 0, 2.4, 1.6, 4.4, '#cfcfc8');
      k.box(11.1, 14.8, 2.4, 2.5, 1.3, 4.6, '#9a6a4a', nb); // 生鏽的低矮浪板棚
      for (const [x, z, h, s] of [
        [11.4, 0.9, 3.6, 1.7],
        [14.4, 5.6, 4.6, 2.0],
        [12.6, 8.2, 4.2, 1.8],
      ])
        tree(k, x, z, h, s, r);
      for (const [x, z, s] of [
        [12.6, 0.8, 0.9],
        [14.2, 1.0, 1.0],
        [15.0, 3.2, 0.8],
        [10.9, 5.6, 0.8],
      ])
        blob(k, x, s * 0.6, z, s, '#3f7a3a');
      tree(k, 14.2, 15, 6.5, 4.2, r);
      tree(k, 13.4, 21, 5.5, 3.2, r); // 後面的大樹
    },
    // A8 鐵皮屋第 1 間（2026-05）：灰藍鐵捲門、灰白浪板雨庇、屋簷上方藍底看板（店名看不清，不寫字）、紅色鐵皮屋頂
    shedBlue(k, w, d) {
      tin(k, w, d, 3.0, 5.95, '#c8402f');
      k.plane(shutterTex('#5f6b78'), w - 0.8, 2.6, w / 2, 1.3, -0.02, FRONT);
      k.box(-0.05, w + 0.05, 2.78, 2.86, -1.5, 0, '#cfcfc8', nb);
      k.plane(blueBoard, w - 0.2, 2.8, w / 2, 4.5, -0.05, FRONT, { emissive: 0.2 });
      k.box(0.4, 1.3, 0, 0.9, -1.2, -0.3, '#8a8478', nb);
      k.box(1.6, 2.8, 0, 0.75, -3.0, -2.92, '#d9cfae', nb);
    },
    // A9 玄龍宮（2026-05）：鐵皮屋宮廟，中間紅框廟門、兩側淺紫牆、黃綠帆布雨棚，屋簷上方整面紅底黃字看板；屋頂有空的鐵塔招牌架與黃旗
    temple(k, w, d) {
      tin(k, w, d, 3.2, 6.5, '#f0f0f0');
      for (const x of [0, w - 0.1]) k.box(x, x + 0.1, 0, 6.5, -0.04, 0.14, '#c8281e', nb);
      k.box(0.3, 3.2, 0, 2.95, -0.05, 0, '#c9b6d6', nb);
      k.box(5.8, w - 0.3, 0, 2.95, -0.05, 0, '#c9b6d6', nb);
      k.box(3.2, 5.8, 0, 2.95, -0.1, 0, '#c8281e', nb);
      k.plane(templeDoor, 2.3, 2.6, 4.5, 1.32, -0.12, FRONT, { emissive: 0.25 });
      k.box(1.5, 7.5, 2.86, 2.94, -2.0, 0, '#f2c230', nb);
      k.box(1.5, 7.5, 2.62, 2.87, -2.03, -1.96, '#2f9a8a', nb);
      for (const x of [1.55, 7.4]) k.box(x, x + 0.05, 0, 2.86, -1.98, -1.93, '#8a8d90', nb);
      k.plane(templeBoard, 8.5, 2.6, w / 2, 4.85, -0.05, FRONT, { emissive: 0.35 });
      lattice(k, 1.0, 2.4, 3.7, 4.2);
      k.cyl(0.4, 1.0, 0.03, 3.3, 7.6, '#8a8d90', { seg: 6 });
      k.box(0.4, 1.05, 7.0, 7.5, 0.98, 1.02, '#f2c230', nb);
    },
    // A10 唐風采廣告（2026-05）：鐵皮屋，東半深綠鐵捲門＋藍綠帆布雨棚、西半敞開堆滿雜物，屋簷上方黃底大看板；屋頂西端空的鐵塔招牌架
    tangfeng(k, w, d) {
      tin(k, w, d, 3.2, 6.5, '#f0f0f0');
      k.plane(shutterTex('#3d5a4e'), 4.0, 2.7, 2.3, 1.35, -0.02, FRONT);
      k.box(0.1, 4.6, 2.86, 2.94, -1.5, 0, '#2f8f86', nb);
      k.box(0.1, 4.6, 2.66, 2.87, -1.52, -1.46, '#2f8f86', nb);
      k.plane(openTex, 4.2, 2.8, 6.7, 1.4, -0.03, FRONT, { emissive: 0.3 });
      k.box(4.45, 5.35, 1.5, 2.1, -0.07, 0, '#f4c21f', nb); // 門邊小黃牌（字看不清）
      k.box(5.0, 6.6, 0, 1.1, -0.9, -0.75, '#c9b28a', nb);
      k.box(6.8, 7.5, 0, 0.6, -1.3, -0.6, '#b89a6a', nb);
      k.box(7.6, 8.5, 0, 0.7, -0.9, -0.5, '#e8e6e0', nb);
      k.box(4.7, 4.76, 0, 2.3, -0.6, -0.54, '#b9bcc0', nb);
      k.box(5.1, 5.16, 0, 2.3, -0.6, -0.54, '#b9bcc0', nb);
      k.plane(tfBoard, 8.8, 2.4, w / 2, 4.75, -0.05, FRONT, { emissive: 0.35 });
      k.box(w - 0.14, w - 0.04, 3.4, 5.0, -0.9, -0.1, '#f4c21f', nb);
      lattice(k, w - 1.6, 2.4, 3.7, 4.2);
    },
    // A11 唐風采與振宇五金之間的窄縫（2026-05）：白色浪板兩層小屋，一樓前面綠色浪板圍起、靠著鋁梯、牆上有藤蔓
    a11(k, w) {
      k.box(0.25, w - 0.25, -0.8, 5.5, 0.5, 5.5, '#e8e8e4');
      k.box(0.15, w - 0.15, 5.5, 5.58, 0.4, 5.6, '#cfcfca', nb);
      k.plane(ROWT.alWin(), 0.9, 0.8, w / 2, 4.2, 0.48, FRONT);
      k.box(0.1, w - 0.1, 0, 2.2, 0, 0.08, '#6f9a72');
      k.box(0.5, 0.56, 0, 3.4, -0.3, -0.24, '#b9bcc0', nb);
      k.box(0.9, 0.96, 0, 3.4, -0.3, -0.24, '#b9bcc0', nb);
      for (const [x, y, s] of [
        [2.2, 2.6, 0.5],
        [2.5, 3.3, 0.4],
        [1.9, 3.0, 0.35],
      ])
        blob(k, x, y, 0.4, s, '#3f7a3a');
    },
    // A12 振宇五金 中壢店（756 號，2026-05）：2 層黑灰立面，一二樓間一道日式深灰瓦片斜屋簷，東半藍綠牆＋玻璃自動門、西半深色落地玻璃（門口堆水泥袋），
    // 二樓整排深色大玻璃窗，窗上亮藍橫招；東南角鋼架撐起、與馬路垂直的直立看板到 11 m；屋頂淺綠鐵皮
    zhenyu(k, w, d) {
      const bk = '#2e2f31';
      k.box(0, w, -0.8, 8.6, 0, d, bk);
      k.box(0.3, w - 0.3, 8.6, 8.66, 0.3, d - 0.3, '#b9cdb4', nb);
      k.box(-0.2, w + 0.2, 3.78, 3.92, -0.7, 0, '#4a4d50', nb);
      k.box(-0.2, w + 0.2, 3.6, 3.76, -1.3, -0.62, '#4a4d50', nb);
      k.box(-0.2, w + 0.2, 3.42, 3.58, -1.9, -1.22, '#4a4d50', nb); // 瓦片斜屋簷（三階）
      k.box(0.15, 7.0, 0, 3.4, -0.05, 0, '#2aa7c0', nb);
      k.plane(darkGl, 3.4, 2.7, 3.6, 1.35, -0.07, FRONT, { emissive: 0.15 });
      k.box(2.0, 5.2, 2.75, 3.25, -0.12, -0.05, '#2f55a8', nb); // 藍綠牆、玻璃自動門、門上的藍色橫布條
      shopGlass(k, 7.3, w - 0.3, 0, 3.2, darkShop);
      for (let j = 0; j < 4; j++) {
        const x = 8.0 + j * 1.5;
        k.box(x, x + 1.2, 0, 0.5 + (j % 2) * 0.25, -1.1, -0.35, j % 2 ? '#a8a49a' : '#c9c2ae', nb);
      } // 門口成排的水泥袋、砂袋
      k.plane(darkGl, 7.0, 2.1, 4.1, 5.55, -0.02, FRONT);
      k.plane(darkGl, 7.8, 2.1, 12.1, 5.55, -0.02, FRONT);
      hsign(k, zySign, 9.5, 1.2, 11.4, 7.6, -0.12);
      k.plane(
        paint('中壢店　03-433-2208', bk, '#ffffff', null, 4.4, 0.5, 128),
        4.4,
        0.5,
        3.6,
        7.4,
        -0.03,
        FRONT,
        { emissive: 0.25 }
      );
      vsign(k, '振宇五金', '#2f8fd6', '#ffffff', 0.7, 6.5, 4.5, -1.0, 1.6, '#ffffff');
      k.box(0.62, 0.78, 3.9, 11.0, -0.2, -0.08, '#55585c', nb);
      k.box(0.62, 0.78, 8.6, 11.0, 0.5, 0.62, '#55585c', nb);
      k.box(0.62, 0.78, 10.9, 11.0, -1.8, 0.6, '#55585c', nb);
      for (const x of [5, 10]) k.box(x, x + 0.3, 8.66, 9.0, 0.1, 0.4, '#2a2a2c', nb); // 屋頂前緣的探照燈
    },
    // A13 5 樓紅磚色樓（2026-05）：一樓淺米色牆、挑高 4.5 m，東半灰鐵捲門、西半車庫式大開口（照街景；調查表的東西寫反），正面沒有招牌；
    // 每層窗台下一圈凸出的水平板帶、每層 2 組白框鋁窗、2～4 樓各有一個凸出的小平台；屋頂退縮的樓梯間
    a13(k, w, d, r) {
      const wl = `wall${lift('#9a5a4e')}`,
        gf = 4.5,
        fh = 3.3,
        top = 18,
        T = { tile: [0.6, 0.6] };
      k.box(0, w, -0.8, top, 0, d, wl, T);
      k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', nb);
      k.box(-0.01, w + 0.01, 0, gf - 0.2, -0.06, 0, '#c9bca8', nb);
      k.plane(shutterTex('#a9a9a3'), 5.6, 3.6, 3.3, 1.8, -0.08, FRONT);
      k.box(0.4, 6.2, 3.58, 3.85, -0.26, 0, '#8d9094', nb);
      k.plane(openTex, 5.6, 3.6, 9.7, 1.8, -0.08, FRONT, { emissive: 0.2 });
      k.box(w - 0.5, w - 0.2, 1.6, 1.9, -0.09, -0.06, '#c8262d', nb);
      for (let f = 1; f <= 4; f++) {
        const y = gf + (f - 1) * fh;
        k.box(-0.05, w + 0.05, y - 0.2, y + 0.15, -0.45, 0, wl, { ...nb, ...T });
        for (const cx of [2.0, 4.5, 8.5, 11.0]) {
          if (r() < 0.18)
            k.plane(litWin(false), 2.4, 1.5, cx, y + 1.75, -0.02, FRONT, { emissive: 0.5 });
          else k.plane(ROWT.alWin(), 2.4, 1.5, cx, y + 1.75, -0.02, FRONT);
        }
        if (f < 4)
          k.box(5.6 + f * 0.3, 7.1 + f * 0.3, y + 0.15, y + 0.75, -0.9, 0, wl, { ...nb, ...T });
        for (const zc of [d * 0.3, d * 0.7]) {
          k.plane(YHT.win(), 1.2, 1.1, w + 0.03, y + 1.5, zc, Math.PI / 2);
          k.plane(YHT.win(), 1.2, 1.1, -0.03, y + 1.5, zc, -Math.PI / 2);
        }
        for (let j = 0; j < 3; j++)
          k.plane(YHT.win(), 1.5, 1.1, (w * (j + 0.5)) / 3, y + 1.5, d + 0.03, 0);
      }
      k.box(-0.05, w + 0.05, top - 0.5, top + 0.12, -0.2, 0, wl, { ...nb, ...T });
      k.box(3, 8, top + 0.12, top + 3.1, 6, 11, wl, { ...nb, ...T });
      k.box(8.5, 12, top + 0.12, top + 2.2, 12, 18, '#8a5a40', nb);
      k.box(w + 0.02, w + 0.14, 5.0, 11.5, 1.0, 1.9, '#2a4fa0', nb); // 西牆的藍色直立側招（字判讀不確定，不寫字）
    },
    // A14 淺綠浪板圍籬＋佳語修繕小屋（2026-05）：小屋退縮 1 m，藍色鐵捲門、綠色弧形浪板雨棚，屋頂上方藍底白字橫看板
    jiayu(k, w) {
      k.box(0, 3.5, 0, 2.2, 0, 0.08, '#9db59a');
      k.box(3.6, w - 0.1, -0.8, 3.0, 1, 7, '#d8d8d2');
      k.box(3.5, w, 3.0, 3.08, 0.9, 7.1, '#b7bcbf', nb);
      k.plane(shutterTex('#3f5f8f'), 3.4, 2.5, 5.75, 1.25, 0.98, FRONT);
      k.box(3.5, w, 2.86, 2.96, -0.5, 1.0, '#4f9a6a', nb);
      k.box(3.5, w, 2.7, 2.88, -1.0, -0.45, '#4f9a6a', nb);
      k.box(3.5, w, 2.45, 2.72, -1.3, -0.95, '#4f9a6a', nb);
      k.plane(jyBoard, 5.0, 1.7, w - 2.5, 4.2, 0.9, FRONT, { emissive: 0.3, double: true });
      for (const x of [w - 4.8, w - 0.3]) k.box(x, x + 0.08, 3.0, 5.05, 0.92, 1.0, '#55585c', nb);
    },
    // B3 紅鐵皮大車棚（2026-05）：人行道邊一排藍盆矮綠籬（中間留車道開口）、水泥前庭、鋼柱撐起的紅色鐵皮屋頂（簷口 3.2 m，深灰封板），沒有招牌
    carport(k, w, d, r) {
      k.box(0, w, -0.5, 0.05, 0, d, '#b5b2aa', { col: false, surface: true });
      for (const [x0, x1] of [
        [1.5, 6.0],
        [9.5, 13.5],
      ]) {
        k.box(x0, x1, 0, 0.35, 0.05, 0.5, '#2f6fb5');
        k.box(x0 + 0.05, x1 - 0.05, 0.35, 0.85, 0.08, 0.47, '#3f7a3a', nb);
      }
      for (const [x, z, sz] of [
        [14.0, 1.2, 1.1],
        [14.8, 3.0, 1.2],
        [14.3, 4.6, 0.9],
      ])
        blob(k, x, sz * 0.8, z, sz, '#3f7a3a');
      for (const x of [1.7, 7.0, 12.3])
        for (const z of [3.4, 9.2, 15.0, 20.8])
          k.box(x - 0.08, x + 0.08, 0, 3.2, z - 0.08, z + 0.08, '#8a8d90', nb);
      k.box(1.3, 12.7, 3.2, 3.6, 2.9, 3.1, '#3a3d3d', nb);
      k.box(1.3, 12.7, 3.5, 3.62, 3.0, 21.3, '#d9534a', nb);
      for (const x of [4.6, 9.2]) k.box(x, x + 0.9, 3.62, 3.64, 4, 20, '#7a3a36', nb); // 屋頂上兩條深色採光帶
      k.box(1.5, 12.5, 0, 3.2, 21.0, 21.2, '#77797c'); // 車棚後牆
      car(k, 2.6, 6.0, '#c9c9c4');
      car(k, 8.4, 5.6, '#2a2d33');
      car(k, 5.4, 13.0, '#5a6a7a');
    },
    // B4 Garden 花園 Hair Salon（2026-05）：水泥車道一路通到退縮約 9 m 的 1 層白色店面，整面落地玻璃、白色平雨庇、招牌帶黑字
    garden(k, w, d) {
      k.box(0, w, -0.5, 0.05, 0, d, '#b5b2aa', { col: false, surface: true });
      k.box(0.5, 9.0, 0, 5.0, 9, 16, '#f0f0ee');
      k.box(0.4, 9.1, 5.0, 5.12, 8.9, 16.1, '#dcdcd8', nb);
      shopGlass(k, 1.0, 7.5, 0, 3.0, ROWT.shop('hzGarden', '#f4efe6', '#8a8580', 77), 8.98);
      k.box(0.5, 9.0, 3.0, 3.15, 8.0, 9.0, '#f4f4f2', nb); // 白色平雨庇
      k.plane(
        board('garden', 5.0, 1.4, (g, W, Hh) => {
          g.fillStyle = '#f0f0ee';
          g.fillRect(0, 0, W, Hh);
          fitText(g, 'Garden 花園', W / 2, Hh * 0.4, W * 0.92, Hh * 0.5, '#1a1a1a');
          fitText(g, 'Hair Salon', W / 2, Hh * 0.8, W * 0.6, Hh * 0.24, '#1a1a1a', 500);
        }),
        5.0,
        1.4,
        3.3,
        4.1,
        8.97,
        FRONT,
        { emissive: 0.25 }
      );
      car(k, 2.2, 3.6, '#1c1c1e');
      car(k, 5.4, 3.8, '#1c1c1e');
    },
    // B6 工地（2026-05）：臨街白色浪板圍籬、6 片白鐵門、往西是混凝土基座上的圍籬板（白浪板與灰綠彩繪帆布交替，帆布上的字「打造中原新商圈　再創城市永恆新頁」）、
    // 圍籬頂往人行道外挑的白色防護棚與紅色警示燈；後面是包著藍色鷹架防護網、蓋到 3～4 層的 RC 結構體。完工後的樣子不知道，照現況做成興建中
    site(k, w, d) {
      k.box(0, w, -0.5, 0.03, 0, d, '#a89a78', { col: false, surface: true }); // 整過地的黃土
      k.box(0, 12.5, 0, 2.6, 0, 0.1, '#dcdcd8'); // 白色浪板圍籬
      for (let x = 0.6; x < 12.5; x += 0.6) k.box(x, x + 0.03, 0, 2.6, -0.02, 0, '#c4c4c0', nb);
      for (let j = 0; j < 6; j++) {
        const x = 12.5 + j * 2.33;
        k.box(x + 0.04, x + 2.29, 0.1, 2.5, 0, 0.08, '#e2e2de');
        k.box(x, x + 0.06, 0, 2.6, -0.03, 0.1, '#8a8d90', nb);
      }
      k.box(26.5, w, 0, 0.5, -0.05, 0.25, '#9a9892'); // 混凝土基座
      const mural = board('siteMural', 8.5, 2.3, (g, W, Hh) => {
        g.fillStyle = '#9aa596';
        g.fillRect(0, 0, W, Hh);
        g.strokeStyle = 'rgba(255,255,255,.55)';
        g.lineWidth = 3;
        g.beginPath();
        for (let i = 0; i < 9; i++) {
          const x = W * (0.05 + i * 0.11);
          g.rect(x, Hh * (0.25 + (i % 3) * 0.08), W * 0.07, Hh * (0.45 - (i % 3) * 0.08));
        }
        g.moveTo(0, Hh * 0.72);
        g.lineTo(W, Hh * 0.72);
        g.stroke();
        fitText(
          g,
          '打造中原新商圈　再創城市永恆新頁',
          W / 2,
          Hh * 0.86,
          W * 0.9,
          Hh * 0.14,
          '#ffffff',
          700
        );
      });
      k.box(26.5, 29.0, 0.5, 2.8, 0, 0.08, '#dcdcd8');
      k.box(29.0, w, 0.5, 2.8, 0, 0.08, '#9aa596');
      k.plane(mural, w - 29.1, 2.3, (29 + w) / 2, 1.65, -0.02, FRONT);
      k.box(0, w, 2.95, 3.03, -1.5, 0.1, '#ececea', nb);
      for (let x = 0.2; x < w; x += 3) k.box(x, x + 0.06, 2.6, 3.0, -1.45, 0.1, '#b9bcbf', nb); // 外挑防護棚
      for (let x = 3; x < w; x += 6)
        k.box(x - 0.08, x + 0.08, 3.03, 3.2, -1.5, -1.34, '#e0352b', nb);
      // 興建中的結構體：灰色清水混凝土梁柱＋藍色防護網，頂端高低不齊
      const x0 = 4,
        x1 = w,
        z0 = 6.5,
        z1 = d - 1;
      k.box(x0 + 0.3, x1, 0, 11.2, z0 + 0.3, z1, '#8a8d8c');
      for (const [a, b, h] of [
        [x0 + 6, x0 + 10, 13.6],
        [x0 + 20, x0 + 25, 13.9],
      ])
        k.box(a, b, 11.2, h, z0 + 0.3, z0 + 6, '#8a8d8c', nb);
      for (let f = 0; f < 3; f++)
        for (let x = x0 + 1.2; x < x1 - 3; x += 4.6)
          k.box(x, x + 3.2, 0.9 + f * 3.6, 3.2 + f * 3.6, z0 + 0.24, z0 + 0.32, '#3a3d40', nb); // 樓層開口
      const netAt = (a, b, y0, y1) => {
        // 半透明藍網＋鷹架格線，一格 1.8 m
        const wm = b - a,
          hm = y1 - y0,
          ppm = Math.min(24, 1536 / wm),
          W = r16(wm * ppm),
          Hh = r16(hm * ppm);
        const t = sg(`hzNet${W}x${Hh}`, W, Hh, (g) => {
          g.clearRect(0, 0, W, Hh);
          g.fillStyle = 'rgba(70,130,205,0.5)';
          g.fillRect(0, 0, W, Hh);
          g.strokeStyle = 'rgba(40,90,170,0.95)';
          g.lineWidth = 2;
          g.beginPath();
          for (let x = 0; x <= wm; x += 1.8) {
            g.moveTo((x * W) / wm, 0);
            g.lineTo((x * W) / wm, Hh);
          }
          for (let y = 0; y <= hm; y += 1.8) {
            g.moveTo(0, Hh - (y * Hh) / hm);
            g.lineTo(W, Hh - (y * Hh) / hm);
          }
          g.stroke();
        });
        k.plane(t, wm, hm, (a + b) / 2, (y0 + y1) / 2, z0 - 0.08, FRONT, {
          transparent: true,
          double: true,
        });
      };
      netAt(x0, x1, 0.3, 11.8);
      for (const [a, b, h] of [
        [x0 + 5.7, x0 + 10.3, 14.0],
        [x0 + 19.7, x0 + 25.3, 14.3],
      ])
        netAt(a, b, 11.8, h); // 藍色鷹架防護網（半透明，看得到後面的梁柱）
      for (const x of [x0 + 1.5, x0 + 3.2])
        k.box(x, x + 0.12, 0, 3.4, z0 + 0.4, z0 + 0.52, '#d8572a', nb); // 東端一樓的橘紅鋼支撐
    },
    // ======== C 段：環中東路南側（街景 2026-05）。+x 朝東，x = 這一格的 s1 − s ========
    // C1 M'car 中古車收購便利站：黃色 1 層鐵皮店面，一樓上緣整條黃底黑字橫招、中間藍色鐵捲門、門前水泥地漆成藍色，後面是灰色鐵皮山牆；
    // 東側牆整面黃帆布（直書小字）、西北角黃色直立桿招到 11 m、屋頂鋼架撐起一塊側對馬路的大看板（內容看不到，不放字）
    mcar(k, w, d, r, sp) {
      k.box(0, w, -0.8, 3.5, 0, d, '#dfae3c');
      k.box(0.3, w - 0.3, 3.5, 5.0, 3, d, '#9a9c98', nb);
      gable(k, 0.3, w - 0.3, 3, d, 5.0, 6.0, '#8d8f8a', '#9a9c98', 0.2);
      rectG(k, 0, w, 3.7 - sp.set, 0, '#2f6fd0', 0.085); // 門前的藍色地坪
      k.plane(shutterTex('#3f6fae'), 4.5, 3.0, w - 2.75, 1.5, -0.02, FRONT);
      k.box(w - 5.1, w - 0.4, 3.0, 3.2, -0.2, 0, '#7a7e80', nb);
      k.box(-0.1, w + 0.1, 3.32, 3.42, -1.3, 0, '#b9b6ae', nb);
      hsign(k, mcarSign, 8.3, 1.3, w / 2, 4.15, -0.2);
      k.plane(mcarSide, 2.8, 2.6, 1.75, 1.6, -0.03, FRONT);
      k.plane(mcarEast, 8.0, 3.2, w + 0.03, 1.8, 4.6, Math.PI / 2, { emissive: 0.1 });
      k.cyl(0.35, -0.9, 0.11, 0, 5.0, '#e0a020', { seg: 8, col: true });
      vsign(k, '中古車收購便利站', '#f0b83a', '#1a1a1a', 0.35, 5.0, 6.0, -0.9, 1.2);
      lattice(k, w - 3.4, 3.6, 3.5, 4.2, 1.0);
      k.box(w - 2.98, w - 2.82, 6.0, 11.0, 1.6, 6.6, '#d4d4cf', nb);
      for (const z of [1.7, 6.5])
        k.box(w - 2.95, w - 2.85, 3.5, 6.0, z - 0.05, z + 0.05, '#6a6d70', nb);
    },
    // C2 天王汽車＋C2b 看板牆：退縮到離車道中心 9 m 的開放式鐵皮修車棚（山牆朝路，簷 4.5 m、脊 6.5 m，整面敞開），前面是水泥前院；
    // 棚口東側掛紅色燈箱「天王汽車／巨力機油」；西邊 4.5 m 是灰浪板圍牆，上面架 6×3 m 大看板「天王汽車 工作室」
    tianwang(k, w, d) {
      const X0 = 4.5,
        GR = '#8d8f8a';
      k.box(X0, w, -0.5, 0.05, 0, d, '#9c9a94', { col: false, surface: true });
      for (const x of [X0, w - 0.15]) k.box(x, x + 0.15, -0.8, 4.5, 0, d, GR);
      k.box(X0, w, -0.8, 4.5, d - 0.15, d, GR);
      k.box(X0, w, 3.8, 4.5, 0, 0.12, GR, nb);
      corr(k, GR, X0, w, 3.8, 4.5);
      gable(k, X0, w, 0, d, 4.5, 6.5, '#83868a', GR, 0.4);
      k.plane(openTex, w - X0 - 0.4, 3.8, (X0 + w) / 2, 1.9, d - 0.2, FRONT, { emissive: 0.2 });
      for (const x of [X0 + 0.15, (X0 + w) / 2 - 0.09, w - 0.33]) {
        k.box(x, x + 0.18, 0, 3.8, 0, 0.18, '#6a6258', nb);
        k.box(x - 0.02, x + 0.2, 1.0, 2.6, -0.02, 0, '#c8202a', nb);
      }
      k.box(13.9, 15.1, 2.5, 4.0, -0.5, -0.3, '#c8202a', nb);
      k.plane(twBox, 1.2, 1.5, 14.5, 3.25, -0.52, FRONT, { emissive: 0.45 });
      car(k, 6.3, 5, '#8a8d90');
      car(k, 11.8, 7, '#c9c9c4');
      car(k, 8.0, -4.9, '#b9bcc0');
      car(k, 12.0, -5.0, '#e8e8e4'); // 棚裡與前院待修的車
      for (const [x, z] of [
        [9.6, 9.5],
        [14.6, 11.5],
        [5.2, 11.8],
      ])
        k.cyl(x, z, 0.33, 0.05, 0.75, '#1c1c1e', { seg: 10 }); // 輪胎堆
      k.box(0, X0, -0.8, 2.0, 0, 0.1, GR);
      corr(k, GR, 0, X0, 0, 2.0);
      k.box(0.05, 6.05, 2.0, 5.0, -0.28, -0.2, '#3a3d42', nb);
      k.plane(twBoard, 6.0, 3.0, 3.05, 3.5, -0.3, FRONT, { emissive: 0.3 });
      for (const x of [0.4, 5.6]) k.box(x, x + 0.1, 0, 5.0, -0.2, -0.1, '#55585c', nb);
      for (let j = 0; j < 3; j++) bike(k, 0.5 + j * 1.25, -0.9, 0, bikeCols[j * 2]);
      for (const [x, s] of [
        [4.3, 0.5],
        [3.7, 0.35],
      ])
        blob(k, x, s, -0.6, s, '#3f7a3a');
    },
    // C3～C5 聯南實業三棟鼠尾草綠直紋浪板廠房：A 棟（東 15 m）牆高 6 m、緩斜屋頂到 7.5 m、牆頂外挑半透明遮雨棚、灰小門＋兩道藍色鐵捲門＋舊排風罩，
    // 西北角一支 12 m 高桿四格直招（深紅褪色，字看不清，不放字）；B 棟簷高 4.8 m、整面敞開的大開口上一條藍色門楣；C 棟一個敞開的開口（裡面停機車）、西端白色落水管。建物本身沒有招牌
    liannan(k, w, d) {
      const G = '#7f9a78',
        RF = '#6f7c88',
        A0 = 18.5,
        dB = 22,
        SH = '#3f6c9c';
      k.box(A0, w, -0.8, 6.0, 0, d, G);
      gable(k, A0, w, 0, d, 6.0, 7.5, RF, G, 0.25);
      corr(k, G, A0, w, 0, 6.0);
      k.box(A0, w, 5.45, 5.55, -1.5, 0, '#cdd3d1', nb);
      for (let x = A0 + 0.4; x < w; x += 3.6)
        k.box(x, x + 0.06, 5.15, 5.47, -1.5, 0, '#6a6d70', nb);
      k.plane(shutterTex(SH), 6.0, 4.2, 28.5, 2.1, -0.04, FRONT);
      k.plane(shutterTex(SH), 4.0, 4.2, 22.5, 2.1, -0.04, FRONT);
      for (const [x0, x1] of [
        [25.4, 31.6],
        [20.4, 24.6],
      ])
        k.box(x0, x1, 4.2, 4.5, -0.2, 0, '#5f6f68', nb);
      k.box(31.65, 32.55, 0, 2.2, -0.06, 0, '#9a9d9c', nb);
      k.box(19.0, 20.0, 2.5, 3.3, -0.5, 0, '#4a4d4c', nb);
      k.cyl(19.5, -2.0, 0.16, 0, 12, '#8a8d90', { seg: 8, col: true });
      for (let j = 0; j < 4; j++)
        k.box(19.44, 19.56, 5.0 + j * 1.65, 6.5 + j * 1.65, -2.8, -1.2, '#6b3a3a', nb);
      k.cyl(22.5, -2.0, 0.11, 0, 0.7, '#c8202a', { seg: 8 }); // 消防栓
      k.box(0, A0, -0.8, 4.8, 0, dB, G);
      k.box(-0.15, A0, 4.8, 4.92, -0.3, dB + 0.15, RF, nb);
      corr(k, G, 0, A0, 0, 4.8);
      k.plane(openTex, 7.0, 3.8, 13.0, 1.9, -0.04, FRONT, { emissive: 0.25 });
      k.box(9.4, 16.6, 3.8, 4.8, -0.08, 0, '#3a6ea8', nb);
      k.box(17.1, 18.0, 0, 2.1, -0.06, 0, '#9a9d9c', nb);
      k.plane(openTex, 5.0, 3.6, 5.5, 1.8, -0.04, FRONT, { emissive: 0.25 });
      for (let j = 0; j < 3; j++) bike(k, 3.8 + j * 1.2, -1.75, 1, bikeCols[(j * 3 + 1) % 6]);
      k.box(0.1, 0.22, 0, 4.8, -0.12, 0, '#f0f0ec', nb);
    },
    // C6 九良汽車的中古車展售車棚＋C7 西端的小雨棚與水塔：沒有牆，鏽褐鐵柱撐著鐵皮屋頂（前簷底 3.3 m、一圈灰綠浪板垂簷、上緣鏽紅收邊），
    // 屋頂一格一格灰白與暗紅相間、最西一格鮮紅；棚下停滿車頭朝路的中古車，前排柱上四塊紅底白字小橫牌，東段前緣菱形鐵絲網；
    // 西端 12 m 鋼架高桿：直書「九良汽車」，下掛藍底 P 牌（黃色箭頭指向車道）
    jiuliang(k, w, d) {
      const X0 = 5.5,
        bays = 6,
        bw = (w - X0) / bays,
        RC = ['#c8473f', '#c9c9c4', '#7a3f45', '#c9c9c4', '#7a3f45', '#c9c9c4'],
        D = 11;
      k.box(X0, w, -0.5, 0.05, 0, D, '#b5b2aa', { col: false, surface: true });
      k.box(1.0, X0, -0.5, 0.05, 0, 6, '#b5b2aa', { col: false, surface: true });
      for (let j = 0; j <= bays; j++)
        for (const z of [0.1, D / 2, D - 0.2]) {
          const x = X0 + 0.1 + (j * (w - X0 - 0.2)) / bays;
          k.box(x - 0.08, x + 0.08, 0, 4.0, z - 0.08, z + 0.08, '#6a4a38', nb);
        }
      k.box(X0, w, 3.94, 4.0, -2.5, D + 0.2, '#e6dfc8', nb);
      for (let j = 0; j < bays; j++)
        k.box(X0 + j * bw + 0.2, X0 + (j + 1) * bw - 0.2, 4.0, 4.07, -2.3, D, RC[j], nb);
      k.box(X0, w, 3.3, 4.3, -2.5, -2.42, '#8a968a', nb);
      k.box(X0 - 0.03, w + 0.03, 4.3, 4.42, -2.56, -2.4, '#a4573f', nb);
      for (const x of [X0, w - 0.08]) k.box(x, x + 0.08, 3.3, 4.3, -2.5, D + 0.2, '#8a968a', nb);
      const cc = [
        '#e8e8e4',
        '#2a2d33',
        '#c9c9c4',
        '#8a2a2a',
        '#2f4f9a',
        '#b9bcc0',
        '#1c1c1e',
        '#e8e8e4',
        '#5a6a7a',
        '#c8202a',
      ];
      for (let j = 0; j < 10; j++) car(k, X0 + 0.7 + j * 2.62, 0.9 + (j % 3) * 0.3, cc[j]);
      for (let j = 0; j < 4; j++) car(k, X0 + 2.2 + j * 6.3, 6.3, cc[(j + 4) % 10]);
      for (const x of [28, 21, 15, 10])
        hsign(k, paint('九良汽車', '#b8323a', '#ffffff', null, 1.4, 0.8), 1.4, 0.8, x, 2.6, -0.1);
      const fence = (x0, x1) => {
        for (let x = x0; x < x1 - 0.1; x += 3) {
          const l = Math.min(3, x1 - x);
          k.plane(chain, l, 1.5, x + l / 2, 0.75, -2.0, FRONT, { transparent: true, double: true });
        }
        for (let x = x0; x <= x1 + 0.01; x += 3)
          k.box(x - 0.03, x + 0.03, 0, 1.55, -2.03, -1.97, '#b9bcc0', nb);
        k.box(x0, x1, 1.5, 1.55, -2.03, -1.97, '#b9bcc0', nb);
        k.wallLine(x0, -2, x1, -2, 0, 1.5);
      };
      fence(20, 32);
      fence(5.6, 8.6);
      for (const x of [11.5, 16.5]) k.cone(x, -2.6);
      for (const x of [13.2, 18.3]) k.cyl(x, -2.5, 0.3, 0.05, 0.25, '#1c1c1e', { seg: 10 }); // 交通錐與廢輪胎
      lattice(k, 4.2, -1.8, 0, 12, 0.8);
      vsign(k, '九良汽車', '#b23a48', '#ffffff', 4.6, 6.0, 5.0, -2.5, 1.2);
      for (const sd of [-1, 1])
        k.plane(pTex(sd), 1.6, 1.6, 4.6 + sd * 0.07, 4.8, -2.7, (sd * Math.PI) / 2, {
          emissive: 0.3,
        });
      k.box(4.54, 4.66, 4.0, 5.6, -3.5, -1.9, '#2a3f9a', nb);
      for (const [x, z] of [
        [1.2, -1.4],
        [3.7, -1.4],
        [1.2, 2.4],
        [3.7, 2.4],
      ])
        k.box(x - 0.05, x + 0.05, 0, 2.5, z - 0.05, z + 0.05, '#8a8d90', nb);
      k.box(1.0, 3.9, 2.5, 2.6, -1.6, 2.6, '#7b8794', nb);
      car(k, 1.55, -1.3, '#3f6fb0');
      lattice(k, 2.2, 4.0, 0, 4.2, 1.2);
      k.cyl(2.8, 4.6, 0.68, 4.2, 5.6, '#cfd2d4', { seg: 12 }); // 鐵架水塔
    },
    // C8 金發財停車場的出入車道：柏油路從路邊斜向東南東繞到車棚後面的停車場，東側一排大樹、西側鐵皮圍籬。沒有建物也沒有招牌（P 牌掛在九良的高桿上）
    drive(k, w, d, r) {
      const AS = '#4f5054';
      drape(k, [5, -2.8], [14, -2.8], [16.25, 4], [9.55, 4], AS, 0.075);
      drape(k, [9.55, 4], [16.25, 4], [26.25, 24], [19.55, 24], AS, 0.075);
      paintGeo(k.slab(9.0, 4.2, 18.5, 23, 0.08, -0.6, 2.0, VC), '#8a968a');
      paintGeo(k.slab(0, 6, 9.0, 4.2, 0.08, -0.6, 2.0, VC), '#8a968a');
      for (const [x, z, h, s] of [
        [19.2, 7.5, 5.2, 2.6],
        [21.0, 11.8, 6, 2.8],
        [24.6, 16.5, 6.4, 3.0],
        [27.6, 21, 6, 2.8],
      ])
        tree(k, x, z, h, s, r, gy(k, x, z));
      for (const [x, z, s] of [
        [2.0, 0.5, 0.9],
        [4.2, 1.6, 1.1],
        [6.6, 1.2, 0.8],
        [3.0, 3.4, 1.0],
      ])
        blob(k, x, gy(k, x, z) + s * 0.5, z, s, '#3f7a3a');
    },
    // C9 慈濟中壢志業園區工地圍籬：高 2.4 m 的甲種圍籬，整面貼淡粉到米色的輸出畫面（小字不寫）；大門是白色鋼板推拉門（門東側柱上綠色告示牌），
    // 遊戲裡的 service 路從大門穿過，所以門板做成拉開、停在路的西側；西端轉向南之後換成綠色浪板。圍籬前面是灰色人行道與植栽帶（street 的 pave／verge）
    sitefence(k, w, d, r, sp) {
      const g0 = sp.gate ? sp.gate[0] : w,
        n = Math.max(1, Math.round(g0 / 6.5)),
        pw = g0 / n;
      k.box(0, g0, -0.8, 2.4, 0, 0.1, '#e9c9c0');
      for (let j = 0; j < n; j++) k.plane(siteTex, pw, 2.4, (j + 0.5) * pw, 1.2, -0.02, FRONT);
      for (let j = 0; j <= n; j++)
        k.box(j * pw - 0.04, j * pw + 0.04, 0, 2.5, -0.05, 0.12, '#9a9d9c', nb);
      if (sp.gate) {
        const [a, b] = sp.gate;
        k.box(a, b, -0.3, 2.4, -0.02, 0.08, '#eeeeea');
        for (let x = a; x <= b + 0.01; x += (b - a) / 3)
          k.box(x - 0.04, x + 0.04, 0, 2.45, -0.06, 0.1, '#b9bcbf', nb);
        [
          ['#2a5fd0', 0.5],
          ['#d8262c', 2.3],
          ['#f2c230', 4.1],
        ].forEach(([c, x]) => k.box(a + x, a + x + 0.55, 1.35, 1.9, -0.05, -0.02, c, nb));
        if (w - b > 0.05) k.box(b, w, -0.8, 2.6, 0, 0.1, '#e9c9c0');
      }
      if (sp.note != null) {
        k.box(sp.note - 0.75, sp.note + 0.75, 1.3, 2.5, -0.09, -0.02, '#2f8f5a', nb);
        k.box(sp.note - 0.6, sp.note + 0.6, 1.9, 2.3, -0.1, -0.09, '#e8f0e8', nb);
      }
      if (sp.turn) {
        k.box(-0.05, 0.05, -0.8, 2.0, 0.1, sp.turn, '#6f9a72');
      }
      for (const x of [w * 0.3, w * 0.7]) k.cone(x, -4.3);
    },
    // C10 慈濟公園：沒有建物。紅磚色寬步道從人行道斜進去接圓形廣場（中間圓草地、白色石材環、外圈紅磚色透水磚、弧形座椅），
    // 西緣一條灰色高壓磚步道沿檳榔攤東牆往裡走、步道口亂石砌圓花台；東北角清水混凝土矮花台與兩塊黃黑紐澤西護欄
    park(k, w, d, r) {
      const RB = '#a8574a',
        cx = 9.5,
        cz = 11;
      rectG(k, 22.5, 27.5, -8.3, 0.3, RB, 0.1);
      drape(k, [22.5, 0.3], [27.5, 0.3], [17.0, 8.2], [14.0, 4.6], RB, 0.08);
      disc(k, cx, cz, 4.5, 8.0, RB, 0.08);
      disc(k, cx, cz, 3.0, 4.5, '#e4e2dc', 0.1);
      disc(k, cx, cz, 0, 3.0, '#5f8a48', 0.12);
      for (const a0 of [0.5, 3.4])
        for (let a = a0; a < a0 + 1.3; a += 0.14) {
          const x = cx + Math.cos(a) * 6.4,
            z = cz + Math.sin(a) * 6.4,
            y = gy(k, x, z);
          k.cyl(x, z, 0.42, y, y + 0.45, '#c9c4b8', { seg: 8 });
        } // 弧形座椅
      rectG(k, 2, 5, -8.3, 20, '#b9b7b0', 0.1);
      {
        const y = gy(k, 0.9, -5.5);
        k.cyl(0.9, -5.5, 1.25, y - 0.3, y + 1.0, '#8f8c84', { seg: 10, col: true });
        for (const [dx, dz, s] of [
          [0, 0, 0.9],
          [-0.5, 0.4, 0.7],
          [0.5, -0.3, 0.75],
        ])
          blob(k, 0.9 + dx, y + 1.0 + s * 0.5, -5.5 + dz, s, '#3f7a3a');
      }
      {
        const y = gy(k, 37, 0.55);
        k.box(34, 40, y - 0.4, y + 0.8, 0.3, 0.8, '#b5b3ac');
        for (let x = 34.5; x < 40; x += 1.1) blob(k, x, y + 1.0, 0.55, 0.42, '#4b8a3e');
      }
      for (const x of [35.0, 37.4]) {
        const y = gy(k, x + 1, -5);
        k.box(x, x + 2.0, y, y + 0.8, -5.3, -4.8, '#f2c230');
        for (let j = 0; j < 4; j++)
          k.box(
            x + 0.15 + j * 0.5,
            x + 0.38 + j * 0.5,
            y + 0.1,
            y + 0.8,
            -5.32,
            -4.78,
            '#1c1c1e',
            nb
          );
      }
      for (const [x, z, h, s] of [
        [15.5, 1.8, 3.6, 1.7],
        [21.5, 3.6, 4.0, 1.9],
        [1.0, 9.5, 3.4, 1.6],
      ])
        tree(k, x, z, h, s, r, gy(k, x, z));
    },
    // C11 807 福利社休息站／双呷檳榔：東間檳榔攤（白磁磚牆裙＋整面玻璃窗、簷口綠色橫招）、西間藍色鐵捲門（白色手寫字）與鏽紅簷口、門前暗紅舊沙發；
    // 屋頂上退縮的紅色鐵皮小屋、鋼架上朝路的黃色帆布看板「福利社 休息站」（紅鐵皮屋西面還有一塊）、白色直立燈箱「專業檳榔」到 10 m、西北角紅色小燈箱「807」；
    // 西間後面接一長條米黃鐵皮長屋，屋後一排高約 14 m 的尖塔形針葉樹
    shop807(k, w, d, r, sp, i) {
      k.box(6, w, -0.8, 3.2, 0, 5, '#e8e4d8');
      k.box(6, w, 0, 1.0, -0.04, 0, '#f4f4f0', nb);
      shopGlass(k, 6.25, w - 0.2, 1.0, 2.5, shopTex(i));
      k.box(0, 6, -0.8, 3.2, 0, 6.5, '#d6d1c2');
      k.plane(sh807, 5.0, 2.6, 3.0, 1.3, -0.02, FRONT);
      k.box(-0.2, 6.1, 3.05, 3.25, -0.9, 0, '#7a3b30', nb);
      k.box(5.85, 6.05, 0, 3.2, -0.12, 0, '#d6d1c2', nb);
      k.plane(
        paint('807', '#2a4fa0', '#ffffff', null, 0.36, 0.2, 256),
        0.36,
        0.2,
        5.95,
        2.0,
        -0.13,
        FRONT
      );
      k.box(1.0, 2.7, 0, 0.42, -1.3, -0.5, '#6a2a2a', nb);
      k.box(1.0, 2.7, 0.42, 0.85, -0.7, -0.5, '#6a2a2a', nb); // 門前的暗紅舊沙發
      hsign(k, bjSign, 5.0, 0.9, 7.5, 3.0, -0.35);
      k.box(-0.1, w + 0.1, 3.2, 3.3, -0.3, 6.6, '#b7bcbf', nb);
      k.box(w + 0.1, w + 0.9, 0.2, 0.9, -0.6, -0.1, MR.ac, nb);
      k.box(3.5, 8.5, 3.3, 6.3, 2, 6, '#b23a36', nb);
      k.box(3.4, 8.6, 6.3, 6.42, 1.9, 6.1, '#8a2f2c', nb);
      k.plane(ROWT.alWin(), 1.1, 0.9, 3.47, 5.6, 2.7, -Math.PI / 2);
      k.plane(flBoard(3.5), 3.5, 2.5, 7.95, 5.25, 0.25, FRONT, { emissive: 0.3 });
      k.box(6.15, 9.75, 3.95, 6.55, 0.27, 0.35, '#55585c', nb);
      for (const x of [6.3, 9.5]) k.box(x, x + 0.08, 3.3, 6.5, 0.35, 0.43, '#55585c', nb);
      k.plane(flBoard(3.0), 3.0, 2.5, 3.44, 4.75, 4.4, -Math.PI / 2, { emissive: 0.3 });
      vsign(k, '專業檳榔', '#f4f4f0', '#1a1a1a', 5.8, 6.5, 3.5, 0.9, 1.0);
      for (const z of [0.5, 1.3]) k.box(5.75, 5.85, 3.3, 10.0, z - 0.04, z + 0.04, '#55585c', nb);
      k.box(0.0, 0.12, 2.5, 3.9, -0.7, -0.1, '#c8202a', nb);
      for (const sd of [-1, 1])
        k.plane(
          paint('807', '#c8202a', '#ffffff', null, 0.6, 0.5, 128),
          0.6,
          0.5,
          0.06 + sd * 0.07,
          3.6,
          -0.4,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.box(0.5, 6, -0.8, 3.0, 6.5, 20.5, '#d8cf9a');
      k.box(0.3, 6.2, 3.0, 3.1, 6.4, 20.7, '#d4d4cf', nb);
      for (const z of [9, 13, 17]) {
        k.plane(ROWT.alWin(), 1.3, 1.0, 0.47, 1.7, z, -Math.PI / 2);
        k.box(0.1, 0.5, 2.1, 2.6, z + 1.0, z + 1.8, MR.ac, nb);
        k.box(-0.2, 0.5, 2.75, 2.8, z - 0.9, z + 0.9, '#b9a878', nb);
      }
      for (const [x, z, h] of [
        [10.6, 7.2, 14],
        [8.6, 10.5, 13],
        [10.8, 13.6, 14.5],
        [8.4, 16.8, 13.5],
        [10.6, 20, 14],
      ])
        conifer(k, x, z, h);
    },
    // C12 807 旁的水泥空地：沿路東段米白浪板圍籬（有黑色塗鴉、信箱）、中間出入口（鏽鐵管柵門常開）、西段鏽紅矮浪板圍籬與大盆栽、路邊兩座灰色電箱；
    // 圍籬裡面是畫了黃色停車格線的水泥地
    lot807(k, w, d) {
      rectG(k, 0, w, 0, d, '#b5b2aa', 0.05);
      for (let j = 0; j < 4; j++)
        rectG(k, 20.3, 24.6, 2 + j * 2.7, 2.12 + j * 2.7, '#e8c23a', 0.065);
      k.box(18, w, -0.6, 2.0, 0, 0.08, '#e4dfcf');
      k.plane(graffiti, 7, 2.0, 21.5, 1.0, -0.02, FRONT);
      k.box(18.25, 18.7, 0.9, 1.3, -0.4, -0.04, '#3a3d42', nb);
      k.plane(
        paint('807', '#3a3d42', '#ffffff', null, 0.4, 0.3, 128),
        0.4,
        0.3,
        18.47,
        1.1,
        -0.41,
        FRONT
      );
      for (const x of [12.2, 13.7, 15.2])
        k.box(x - 0.03, x + 0.03, 0, 1.6, -0.36, -0.3, '#6a3a2a', nb);
      for (const y of [0.3, 0.9, 1.5]) k.box(12.2, 15.2, y, y + 0.06, -0.36, -0.3, '#6a3a2a', nb);
      k.box(0, 12, -0.6, 1.2, 0, 0.08, '#8a4a38');
      corr(k, '#8a4a38', 0, 12, 0, 1.2);
      for (const x of [2.5, 6, 9.5]) {
        k.cyl(x, -0.6, 0.35, 0, 0.6, '#9a6a4a', { seg: 8 });
        blob(k, x, 1.0, -0.6, 0.55, '#3f7a3a');
      }
      k.box(2.2, 3.0, 0, 1.6, -1.9, -1.3, '#9a9d9a');
      k.box(3.2, 4.0, 0, 1.6, -1.9, -1.3, '#9a9d9a');
      car(k, 21.5, 5.2, '#c9c9c4');
      car(k, 6, 8, '#2a2d33');
    },
    // C12 深處的鐵皮倉庫：淺灰藍浪板，山牆朝路（簷 7.5 m、脊 9.5 m），正面偏東一道藍色大鐵捲門、西邊一扇小窗。位置與方位把握度低（正射上像是偏轉約 30°），這裡做成平行道路
    warehouse(k, w, d) {
      k.box(0, w, -0.8, 7.5, 0, d, '#b9c2c4');
      gable(k, 0, w, 0, d, 7.5, 9.5, '#a9b2b6', '#b9c2c4', 0.3);
      corr(k, '#b9c2c4', 0, w, 0, 7.5);
      k.plane(shutterTex('#3b78c2'), 5, 5, 8.5, 2.5, -0.04, FRONT);
      k.box(5.9, 11.1, 5.0, 5.25, -0.2, 0, '#7a8894', nb);
      k.plane(ROWT.alWin(), 1.4, 1.1, 2.6, 2.4, -0.04, FRONT);
    },
    // ======== D 段：708 巷口以東（街景 2026-05）。北側 +x 朝西（x = s − s0），南側 +x 朝東（x = s1 − s） ========
    // DN1 停車場：水泥地停一排車，後面一排大樹與棕櫚，樹後是退縮的 Mr.May 圓頂餐廳（只看得到 Mr.May 字樣）；東北角一支 8 m 黑色招牌柱（字看不清，不放字）
    dn1(k, w, d, r) {
      rectG(k, 0, w, 0, 12.5, '#9c9890', 0.05);
      const cc = [
        '#e8e8e4',
        '#c9c9c4',
        '#b02a2a',
        '#c9c9c4',
        '#2a2d33',
        '#e8e8e4',
        '#8a8d90',
        '#e8e8e4',
      ];
      for (let j = 0; j < 8; j++) carY(k, 6 + j * 2.7, 2 + (j % 2) * 0.4, cc[j]);
      for (const [x, z, h, s] of [
        [1.5, 12.2, 6.5, 3.2], // 新中北路路緣在這裡約 z 12.6，樹幹原本在車道上，退到路緣後
        [6.5, 15, 7, 3.4],
        [11.5, 14.5, 6.5, 3.0],
        [16.5, 15, 7.5, 3.6],
        [23, 12.8, 5, 2.4],
        [32, 12.8, 5.5, 2.6],
      ])
        tree(k, x, z, h, s, r, gy(k, x, z));
      for (const [x, z] of [
        [4, 13.5],
        [14, 13],
        [26, 12.7],
        [30, 13.2],
      ]) {
        const y = gy(k, x, z);
        k.cyl(x, z, 0.2, y - 0.3, y + 9, '#8a7a62', { seg: 6, col: true, r1: 0.16 });
        for (let j = 0; j < 7; j++) {
          const a = j * 0.9;
          blob(k, x + Math.cos(a) * 1.1, y + 9 - 0.2, z + Math.sin(a) * 1.1, 0.75, '#4f8a3e');
        }
      } // 棕櫚
      // 餐廳本體是圓頂建築，由新中北路那邊蓋（src/world/buildings/xzb/SegX3.js，圓心約在這裡的 x 28.2、z 17、半徑 4.4）；
      // 這裡只把 Mr.May 招牌貼在圓頂朝環中東路那面
      k.plane(
        paint('Mr.May', '#2a2420', '#e8d8b0', null, 1.6, 0.4, 128),
        1.6,
        0.4,
        28.2,
        3.2,
        12.5,
        FRONT,
        { emissive: 0.3 }
      );
      for (const x of [26, 29.6]) k.box(x, x + 0.5, 0, 1.8, 12.4, 12.9, '#b5ae9e'); // 洗石子門柱
      k.box(34.9, 35.25, 0, 8, 0.9, 1.25, '#1c1c1e');
      k.box(34.6, 35.55, 4.6, 8, 0.85, 1.3, '#1c1c1e', nb);
    },
    // DN2 慕客專業檳榔：整面淺藍板的小攤，橘紅字，中間鋁框玻璃窗＋玻璃門
    muke(k, w, d) {
      k.box(0, w, -0.8, 3.3, 0, d, '#a9c6dc');
      k.plane(mukeTex, w, 3.3, w / 2, 1.65, -0.02, FRONT, { emissive: 0.2 });
      k.box(-0.1, w + 0.1, 3.3, 3.4, -0.6, d, '#d8dde0', nb);
      bike(k, 1.0, -1.3, 0, bikeCols[1]);
    },
    // DN3 老平房：退縮、灰綠鐵捲門兩道、局部紅磚、鏽紅鐵皮斜屋頂、屋頂不鏽鋼水塔；前面一棵大樹
    dn3(k, w, d, r) {
      k.box(0, w, -0.8, 3.2, 0, d, '#8f9a8c');
      k.box(6.6, w, 0, 1.2, -0.04, 0, '#9a5a46', nb);
      for (const x of [2.0, 5.2]) k.plane(shutterTex('#7d8a7c'), 2.6, 2.5, x, 1.25, -0.03, FRONT);
      gable(k, 0, w, 0, d, 3.2, 4.3, '#9a4a34', '#8f9a8c', 0.3);
      for (const x of [3, 4.4, 5.8]) k.cyl(x, 7, 0.5, 4.0, 5.2, '#cfd2d4', { seg: 10 });
      tree(k, 4.5, -2.4, 3.6, 2.6, r);
    },
    // DN4 Music Bar：一層黑色平頂店面（牆面剝落），白色平板屋頂出挑 1 m、板下一排小燈；後面一棟紅色鐵皮屋頂的大屋延伸到 s 136
    musicbar(k, w, d) {
      k.box(0, w, -0.8, 3.3, 0, d, '#1b1b1b');
      k.plane(mbTex, w, 3.3, w / 2, 1.65, -0.02, FRONT);
      k.box(-0.3, w + 0.3, 3.3, 3.6, -1.0, d, '#ecebe6', nb);
      for (let x = 0.6; x < w; x += 1.1) blob(k, x, 3.25, -0.75, 0.07, '#fff4d0');
      for (const x of [0.05, w - 0.15]) k.box(x, x + 0.1, 0, 3.3, -0.12, -0.02, '#8a8d90', nb);
      k.box(2.5, 21.5, -0.8, 3.2, 5.2, 21.5, '#c9c4b8');
      tiltX(k, 2.3, 21.7, 3.1, 4.9, 6.0, 13.35, 0.1, '#e2463c');
      tiltX(k, 2.3, 21.7, 6.0, 13.35, 3.1, 21.8, 0.1, '#e2463c');
      for (const x of [2.5, 21.5]) {
        const a = [x, 3.2, 5.2],
          b = [x, 3.2, 21.5],
          c = [x, 6.0, 13.35];
        k._part(
          VC,
          vcGeo(
            [...a, ...b, ...c, ...a, ...c, ...b],
            [0, 1, 2, 3, 4, 5],
            '#c9c4b8',
            [1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0]
          )
        );
      } // 兩端的三角山牆（前後兩面各自給法線）
    },
    // DN5 嘉義東菁仔行：東半開放式鐵皮棚（裡面掛黑底帆布、白色冰櫃），西半綠色檳榔亭；棚頂立一面灰白底大看板
    jiayidong(k, w, d) {
      for (const [x, z] of [
        [0.1, 0.1],
        [3.9, 0.1],
        [0.1, d - 0.1],
      ])
        k.box(x - 0.06, x + 0.06, 0, 2.8, z - 0.06, z + 0.06, '#6a6d70');
      k.box(-0.1, 4.0, 2.75, 2.85, -0.2, d, '#8a5a3a', nb);
      k.box(0, 4, -0.8, 2.75, d - 0.1, d, '#2a2a2a');
      k.plane(jyBanner, 3.6, 1.6, 2, 1.9, d - 0.12, FRONT, { emissive: 0.15 });
      k.box(0.4, 1.6, 0, 1.0, d - 1.0, d - 0.2, '#f2f2ee', nb);
      k.box(4, w, -0.8, 2.8, 0.3, d, '#2f7a3d');
      k.plane(jyKiosk, 3, 2.8, 5.5, 1.4, 0.28, FRONT, { emissive: 0.2 });
      k.box(3.9, w + 0.1, 2.8, 2.9, 0, d + 0.1, '#e6e6de', nb);
      for (const x of [1.6, 6.4]) k.box(x - 0.05, x + 0.05, 2.8, 5.3, 0.95, 1.05, '#55585c', nb);
      k.plane(jyBill, 5, 2.5, 4, 4.05, 0.9, FRONT, { emissive: 0.2, double: true });
      k.box(0.55, 0.65, 0, 4.6, -0.3, -0.2, '#55585c', nb);
      k.box(0.2, 1.0, 3.0, 4.6, -0.36, -0.3, '#2f7a3d', nb);
      k.plane(roundSign('東', '#d8322a', '#111111'), 0.6, 0.6, 0.6, 3.9, -0.37, FRONT, {
        transparent: true,
      });
    },
    // DN6 黃色鐵皮小屋：灰綠鐵捲門拉下、淺色浪板單斜屋頂，沒有招牌
    yshed(k, w, d) {
      k.box(0, w, -0.8, 3.0, 0, d, '#dcae2e');
      k.plane(shutterTex('#7d8a7c'), 3.0, 2.5, w / 2, 1.25, -0.03, FRONT);
      tiltX(k, -0.1, w + 0.1, 3.2, -0.3, 2.9, d + 0.2, 0.08, '#d8d8d0');
    },
    // DN7 佬地方牛排（鐵捲門拉下，像是歇業）：退縮的一層老店，東段敞開、中段藍色鐵捲門、西段玻璃貼「牛排 豬排 雞排 魚排」；
    // 木封簷板上釘紅色立體字「佬地方牛排」，淺色浪板屋頂、中段後面一個米色小屋頂；前院水泥地，路邊一道木條欄杆
    steak(k, w, d) {
      k.box(0, w, -0.8, 3.2, 0, d, '#6f6a60');
      k.plane(openTex, 5.2, 2.9, 2.8, 1.45, -0.03, FRONT, { emissive: 0.1 });
      k.plane(shutterTex('#3d6f9e'), 5.0, 2.9, 8.0, 1.45, -0.03, FRONT);
      k.plane(steakWin, 4.0, 2.6, 12.5, 1.3, -0.03, FRONT, { emissive: 0.2 });
      k.box(-0.1, w + 0.1, 2.9, 3.5, -0.25, 0, '#4a3628', nb);
      k.plane(steakTex, 4.0, 0.6, 8.25, 3.2, -0.27, FRONT, { transparent: true, emissive: 0.2 });
      k.box(-0.2, w + 0.2, 3.5, 3.6, -0.3, d, '#c9cac6', nb);
      gable(k, 5, 10, 3, d, 4.0, 4.8, '#e0d8c0', '#e0d8c0', 0.2);
      for (let x = 0; x <= w + 0.01; x += 1.45)
        k.box(x - 0.05, x + 0.05, 0, 1.1, -5.55, -5.45, '#7a5a3a', nb);
      for (const y of [0.45, 0.95]) k.box(0, w, y, y + 0.08, -5.54, -5.46, '#7a5a3a', nb);
      k.wallLine(0, -5.5, w, -5.5, 0, 1.1);
      car(k, 1.4, -4.9, '#e8e8e4');
    },
    // DN8 古意汽車：四面開放的中古車車棚，深灰浪板飾帶（金黃 K 標＋白字「古意汽車」＋KUYI CAR），棚頂三盞投射燈；東界藍色浪板圍籬、生鏽高桿與直立燈箱
    kuyi(k, w, d) {
      rectG(k, 0, w, 0, d, '#a8a6a0', 0.05);
      for (const x of [0.3, 6.5, 12.7, 18.9, w - 0.3])
        for (const z of [0.4, 8.7, d - 0.3])
          k.box(x - 0.12, x + 0.12, 0, 5.2, z - 0.12, z + 0.12, '#1e1e1f');
      k.box(-0.1, w + 0.1, 5.2, 5.35, -0.15, d, '#3a3d40', nb);
      k.box(-0.1, w + 0.1, 3.0, 5.3, -0.15, 0.1, '#33363a', nb);
      k.box(-0.15, 0.05, 3.0, 5.3, 0, d, '#33363a', nb);
      k.plane(kuyiTex, w, 2.3, w / 2, 4.15, -0.17, FRONT, { emissive: 0.25 });
      for (const x of [5, 12.75, 20.5]) flood(k, x, 5.3, 0);
      const cc = [
        '#f2f2ee',
        '#e8e8e4',
        '#f2f2ee',
        '#c9c9c4',
        '#f2f2ee',
        '#2a2d33',
        '#f2f2ee',
        '#e8e8e4',
        '#f2f2ee',
      ];
      for (let j = 0; j < 9; j++) {
        car(k, 1.2 + j * 2.65, 1.2, cc[j]);
        car(k, 1.2 + j * 2.65, 8.2, cc[(j + 4) % 9]);
      }
      k.box(-0.4, -0.3, 0, 2.0, -2.5, d, '#3f74b0');
      corr(k, '#3f74b0', -0.4, -0.3, 0, 2.0);
      k.cyl(-0.7, -2.0, 0.15, 0, 10, '#7a4a2c', { seg: 8, col: true });
      k.box(-1.2, -0.2, 3.5, 9, -2.2, -1.9, '#f2e8b0', nb);
      k.plane(
        vtex('古意汽車', '#f2e8b0', '#3a3a3a', 1.0, 5.5),
        1.0,
        5.5,
        -0.7,
        6.25,
        -2.22,
        FRONT,
        { emissive: 0.3 }
      );
    },
    // DN9 悍將汽車百貨：山牆朝街的兩層樓高鐵皮屋（淺灰浪板、綠色收邊），一樓整面鋁框玻璃（貼藍色海報），藍底白字橫招、上方鐵架遮雨棚；屋頂西側一面空白白色看板
    hanjiang(k, w, d, r, sp, i) {
      k.box(0, w, -0.8, 6.3, 0, d, '#c9ccc6');
      corr(k, '#c9ccc6', 0, w, 5.15, 6.3);
      gable(k, 0, w, 0, d, 6.3, 7.5, '#b9bcb8', '#c9ccc6', 0.3);
      k.box(-0.05, w + 0.05, 6.2, 6.35, -0.1, 0, '#3f8a5a', nb);
      for (const x of [-0.05, w - 0.1]) k.box(x, x + 0.15, 0, 6.3, -0.1, 0, '#3f8a5a', nb);
      shopGlass(
        k,
        0.3,
        w - 0.3,
        0,
        4.1,
        board('hjGlass', 9.7, 4.1, (g, W, Hh) => {
          fill(g, W, Hh, '#2a3238');
          for (let j = 0; j < 4; j++) {
            g.fillStyle = j % 2 ? '#2a4fb0' : '#1f3f8f';
            g.fillRect(W * (0.03 + j * 0.24), Hh * 0.12, W * 0.2, Hh * 0.55);
          }
          fitText(g, '4K+4K', W * 0.15, Hh * 0.4, W * 0.18, Hh * 0.14, '#ffffff');
          g.fillStyle = 'rgba(255,240,210,.5)';
          g.fillRect(0, Hh * 0.72, W, Hh * 0.04);
        })
      );
      hsign(k, hjSign, 10.3, 1.0, w / 2, 4.62, -0.16);
      k.box(-0.1, w + 0.1, 5.2, 5.28, -1.3, 0, '#8a8d90', nb);
      for (const x of [0.4, w / 2, w - 0.4])
        k.box(x - 0.03, x + 0.03, 5.28, 5.9, -1.25, -1.19, '#8a8d90', nb);
      for (const x of [w - 4.3, w - 0.7])
        k.box(x - 0.06, x + 0.06, 6.3, 11, 2.0, 2.12, '#55585c', nb);
      k.box(w - 4.6, w - 0.4, 7.4, 11, 1.9, 2.0, '#f2f2ee', nb);
      vsign(k, '悍將汽車百貨', '#2b3f9e', '#ffffff', 0.2, 4.0, 3.8, -0.6, 0.8);
      k.plane(
        paint('雨刷 腳踏墊\n行車記錄器', '#2b3f9e', '#ffffff', null, 0.9, 1.5, 128),
        0.9,
        1.5,
        1.0,
        0.85,
        -2.6,
        FRONT,
        { double: true }
      );
      car(k, 7.8, -5.2, '#e8e8e4');
    },
    // DN10 1973 家具床墊：23 m 寬的家具賣場，正面上半深灰瓦片斜面、下緣白色圓弧雨庇與白底橫布條，一樓退縮的玻璃櫥窗與藍白鐵捲門；
    // 西端黑底白字直立招牌塔「1973／家具床墊」＋粉紅圓牌「床」，西側牆一大片白底看板；斜面頂 5 盞投射燈
    f1973(k, w, d, r, sp, i) {
      k.box(0, w, -0.8, 4.8, 0, d, '#e6e4dc');
      k.box(0, w, 4.8, 7.4, 0.8, d, '#d8d8d0');
      tiltX(k, -0.05, w + 0.05, 4.8, -0.55, 7.4, 0.85, 0.16, '#3a3d40');
      k.box(-0.1, w + 0.1, 7.4, 7.5, 0.7, d, '#e6e4c8', nb);
      k.box(0, w, 4.5, 4.8, -3, 0, '#f0f0ee', nb);
      rodX(k, 0, w, 4.25, -2.55, 0.45, '#f0f0ee');
      k.plane(f73Banner, 15, 0.8, w / 2, 3.4, -2.96, FRONT, { emissive: 0.2 });
      for (const x of [0.3, w / 2, w - 0.3])
        k.box(x - 0.03, x + 0.03, 3.0, 4.5, -2.9, -2.84, '#8a8d90', nb);
      shopGlass(k, 0.5, 13, 0, 3.6, shopTex(i));
      k.plane(shutterTex('#cfd8e6'), 4.0, 3.6, 15.5, 1.8, -0.03, FRONT);
      shopGlass(k, 18, 20.8, 0, 3.6, shopTex(i + 1));
      k.box(21.2, 22.8, 0, 10, -1.8, -1.2, '#1e1e1f');
      k.plane(f73Tower, 1.6, 6, 22, 6.8, -1.82, FRONT, { emissive: 0.3 });
      k.plane(roundSign('床', '#e9a6b8', '#ffffff'), 1.0, 1.0, 20.5, 7.6, -1.6, FRONT, {
        transparent: true,
        emissive: 0.3,
      });
      k.plane(f73Side, 8, 4.5, w + 0.03, 4.0, 8, Math.PI / 2, { emissive: 0.15 });
      for (let j = 0; j < 5; j++) flood(k, 2.3 + j * 4.6, 7.4, 0.85);
      car(k, 3, -6.0, '#f2f2ee');
    },
    // DN11 1973 的碎石停車場：路邊 4 個水泥花槽，西界鏽色浪板圍籬往裡走，深處一棟白牆綠瓦的一層小屋
    gravel73(k, w, d) {
      rectG(k, 0, w, 0, 25, '#a8a090', 0.05);
      for (const x of [2, 6, 10, 14]) {
        k.box(x, x + 1.6, 0, 0.5, 0.3, 1.1, '#a9a69e');
        blob(k, x + 0.8, 0.75, 0.7, 0.45, '#3f7a3a');
      }
      k.box(w - 0.12, w, 0, 1.8, 0, 25, '#8a4a38');
      k.box(12, 24, -0.5, 3.2, 23, d, '#efefea');
      gable(k, 12, 24, 23, d, 3.2, 4.4, '#4f8a5a', '#efefea', 0.3);
      car(k, 4, 4, '#2a2d33');
    },
    // DN12 久育汽車：一層藍色浪板修車廠，東半是牆（鐵窗、冷氣、門），西半敞開的修車間；深藍底白色書法字橫招；屋頂西端藍底直招與空白白色看板
    jiuyu(k, w, d) {
      k.box(0, w, -0.8, 4.7, 0, d, '#6f95cf');
      corr(k, '#6f95cf', 0, 7.6, 0, 3.55);
      for (const x of [-0.05, w - 0.35]) k.box(x, x + 0.4, 0, 4.7, -0.06, 0.4, '#2f55b0', nb);
      k.plane(ROWT.alWin(), 1.8, 1.3, 2.4, 1.8, -0.04, FRONT);
      ac(k, 4.0, 2.2);
      k.plane(shutterTex('#5a6a7a'), 0.95, 2.1, 6.3, 1.05, -0.04, FRONT);
      k.plane(openTex, 7.0, 3.5, 11.3, 1.75, -0.03, FRONT, { emissive: 0.2 });
      hsign(k, jyuSign, 15, 1.0, w / 2, 4.1, -0.16);
      k.box(-0.2, w + 0.2, 4.7, 4.8, -0.3, d, '#9a9c98', nb);
      vsign(k, '久育汽車', '#27358f', '#ffffff', 13.5, 4.8, 3.2, 1.0, 1.0);
      for (const x of [10.2, 14.3]) k.box(x - 0.05, x + 0.05, 4.8, 9.0, 1.9, 2.0, '#55585c', nb);
      k.box(10, 14.5, 6.6, 9.0, 1.8, 1.9, '#f2f2ee', nb);
      car(k, 9.5, -4.0, '#2a2d33');
      car(k, 12.3, -4.2, '#c9c9c4');
    },
    // DN13 綠之戀 花坊：一層灰色浪板花店，簷口整條灰底白色花葉橫幅，白框玻璃門窗與薄荷綠拱形百葉窗，門前雞蛋花樹與成排盆栽、4 盞投射燈
    florist(k, w, d, r, sp, i) {
      k.box(0, w, -0.8, 4.4, 0, d, '#8d8f88');
      corr(k, '#8d8f88', 0, w, 2.8, 3.2);
      k.box(-0.05, w + 0.05, 3.2, 4.4, -0.12, 0, '#8c8f8a', nb);
      k.plane(flSign, w, 1.2, w / 2, 3.8, -0.13, FRONT, { emissive: 0.2 });
      shopGlass(k, 0.5, 6.6, 0, 2.8, shopTex(i));
      k.plane(mintWin, 1.0, 2.0, 7.5, 1.0, -0.03, FRONT);
      shopGlass(k, 8.5, w - 0.5, 0, 2.8, shopTex(i + 2));
      for (const x of [0.4, 6.6, 8.4, w - 0.55])
        k.box(x, x + 0.15, 0, 2.85, -0.08, 0, '#f4f4f2', nb);
      k.box(-0.2, w + 0.2, 4.4, 4.5, -0.3, d, '#7f9abf', nb);
      for (const x of [2, 6, 9.5, 13.5]) flood(k, x, 4.4, 0);
      tree(k, 3, -2.2, 2.6, 1.3, r);
      for (const [dx, dz] of [
        [-0.6, 0.2],
        [0.5, -0.3],
        [0, 0.6],
      ])
        blob(k, 3 + dx, 3.4, -2.2 + dz, 0.3, '#f0a8c0');
      for (let x = 0.7; x < w - 0.5; x += 0.9) {
        k.cyl(x, -0.6, 0.22, 0, 0.35, '#8a5a3a', { seg: 8 });
        blob(k, x, 0.6, -0.6, 0.32, x % 2 < 1 ? '#3f7a3a' : '#5a9a4a');
      }
    },
    // DN14 阿里山菁仔行：檳榔攤，上方黃底橫招，東半藍色鐵捲門、中間黃底直招、西半玻璃窗；屋頂鐵架撐一面側向的白色空白看板
    alishan(k, w, d) {
      k.box(0, w, -0.8, 3.2, 0, d, '#d8d4c8');
      k.plane(shutterTex('#3b78b5'), 3.6, 3.0, 1.9, 1.5, -0.03, FRONT);
      k.plane(alWinTex, 3.2, 3.0, 5.7, 1.5, -0.03, FRONT, { emissive: 0.15 });
      k.box(0, w, 3.2, 4.6, -0.15, 0.1, '#e8d84a', nb);
      k.plane(alSign, w, 1.4, w / 2, 3.9, -0.17, FRONT, { emissive: 0.3 });
      k.plane(
        vtex('阿里山菁仔行', '#e8d84a', '#1f3a8a', 0.45, 2.6),
        0.45,
        2.6,
        3.85,
        1.55,
        -0.06,
        FRONT
      );
      lattice(k, 3.4, 1.2, 4.6, 3.4, 0.6);
      k.box(3.65, 3.75, 5.2, 8.0, 0.2, 3.8, '#f2f2ee', nb);
    },
    // DN15 修車廠前的水泥空地，停待售車
    lot15(k, w, d) {
      rectG(k, 0, w, 0, d, '#a8a6a0', 0.05);
      for (let j = 0; j < 4; j++)
        carY(k, 1.0 + j * 2.7, 1.2, ['#c9c9c4', '#2a2d33', '#8a8d90', '#e8e8e4'][j]);
    },
    // DN16 HOT 好車大聯盟／庫柏汽車（門牌 668）：長條鐵皮修車廠，一樓整排敞開的修車間（白色方柱），上面招牌帶：西段粉橘底「好車大聯盟」、東段黃底「HOT保修大聯盟」；
    // 西段屋頂一座空的鏽褐鋼構看板架。屋身往北斜向東，西北角照遊戲裡埤塘公園的步道切掉
    hot(k, w, d) {
      const P = [
        [0, 0],
        [25, 0],
        [25, 2.5],
        [4.5, 19.5],
        [-2, 19.5],
      ];
      polyPrism(k, P, -0.8, 6.8, '#b9b08c');
      polyPrism(k, P, 6.8, 6.95, '#4a4d50');
      P.forEach((a, j) => {
        const b = P[(j + 1) % P.length];
        k.wallLine(a[0], a[1], b[0], b[1], 0, 6.8);
      });
      k.plane(openTex, 24.4, 4.9, 12.5, 2.45, -0.04, FRONT, { emissive: 0.2 });
      for (const x of [0, 6.25, 12.5, 18.75, 24.5]) k.box(x, x + 0.5, 0, 4.9, -0.35, 0, '#f2f2ee');
      k.box(0, 25, 4.9, 8.2, -0.25, 0.05, '#b9b08c', nb);
      k.plane(hotYel, 7, 3.3, 3.5, 6.55, -0.27, FRONT, { emissive: 0.3 });
      k.plane(hotPink, 18, 3.3, 16, 6.55, -0.27, FRONT, { emissive: 0.3 });
      for (let x = 1.5; x < 25; x += 3) blob(k, x, 4.8, -0.4, 0.1, '#fff4d0');
      for (const x of [7.5, 16, 24.3]) k.box(x - 0.1, x + 0.1, 6.95, 13, 1.0, 1.2, '#7a4a2c', nb);
      for (const y of [9.4, 11.2, 13]) k.box(7, 24.6, y - 0.1, y, 1.0, 1.2, '#7a4a2c', nb);
      for (const x of [7, 24.5]) k.box(x - 0.08, x + 0.08, 8.2, 13, 1.0, 1.2, '#7a4a2c', nb);
      const cc = ['#e8e8e4', '#2a2d33', '#f2f2ee', '#e8e8e4', '#c8202a', '#f2f2ee'];
      for (let j = 0; j < 6; j++) carY(k, 1.5 + j * 3.6, -6.2, cc[j]);
    },
    // DN17 埤塘公園入口廣場：灰褐石板鋪面，路邊一排 7 個水泥花槽，一棵大樹、後緣綠色欄杆（留出公園步道的缺口）、2 支白色庭園燈。遊戲裡的步道照樣從廣場穿過
    plaza(k, w, d, r) {
      rectG(k, 0, w, 0, d, '#bdb6a8', 0.07);
      for (let j = 0; j < 7; j++) {
        const x = 2.5 + j * 2.6,
          y = gy(k, x + 0.8, 1.2);
        k.box(x, x + 1.6, y - 0.2, y + 0.5, 0.8, 1.6, '#a9a69e');
        k.box(x + 0.08, x + 1.52, y + 0.5, y + 0.6, 0.88, 1.52, '#5f8a48', nb);
      }
      {
        const y = gy(k, 4, 13.5);
        tree(k, 4, 13.5, 4.8, 3.4, r, y);
        k.box(1.5, 6.5, y - 0.2, y + 0.6, 16.5, 17.3, '#4f7a3a', nb);
        k.box(6.8, 8.6, y, y + 0.45, 12.5, 13.0, '#8a6a4a', nb);
      }
      for (const [x0, x1] of [
        [0, 1.5],
        [5, w],
      ]) {
        const y = gy(k, (x0 + x1) / 2, d);
        k.box(x0, x1, y + 1.1, y + 1.18, d - 0.04, d + 0.04, '#3f7a4c', nb);
        for (let x = x0; x <= x1 + 0.01; x += 2)
          k.box(x - 0.04, x + 0.04, y - 0.2, y + 1.2, d - 0.04, d + 0.04, '#3f7a4c', nb);
        k.wallLine(x0, d, x1, d, y - 0.2, y + 1.2);
      }
      for (const [x, z] of [
        [11, 3.5],
        [19, 15],
      ]) {
        const y = gy(k, x, z);
        k.cyl(x, z, 0.07, y, y + 3, '#f2f2ee', { seg: 6 });
        blob(k, x, y + 3.1, z, 0.22, '#fff8e0');
      }
    },
    // DN18a 三層舊透天（清水泥發黑）：一樓白色鐵捲門＋深藍底白字「良師鋁門窗」與綠色浪板小雨庇；東山牆朝廣場掛一整面門窗廣告看板（公司名看不清，不寫字）
    liangshi(k, w, d) {
      k.box(0, w, -0.8, 9, 0, d, '#5a5650');
      k.plane(shutterTex('#e8e8e4'), 4.4, 2.6, w / 2, 1.3, -0.03, FRONT);
      hsign(
        k,
        paint('良師鋁門窗', '#27358f', '#ffffff', null, 4.6, 0.6, 128),
        4.6,
        0.6,
        w / 2,
        2.95,
        -0.14
      );
      k.box(-0.05, w + 0.05, 3.35, 3.45, -0.8, 0, '#4f8a5a', nb);
      for (const y of [3.2, 6.1]) {
        k.box(0.2, w - 0.2, y, y + 0.12, -0.8, 0, '#6a6660', nb);
        win(k, w / 2, y + 1.5, w - 1.2, 1.35);
        for (let x = 0.2; x <= w - 0.2; x += 0.3)
          k.box(x, x + 0.03, y + 0.12, y + 1.1, -0.8, -0.77, '#3a3a3a', nb);
        k.box(0.2, w - 0.2, y + 1.08, y + 1.14, -0.8, -0.74, '#3a3a3a', nb);
      }
      k.box(-0.02, w + 0.02, 9, 9.12, -0.04, d, 'gray', nb);
      k.cyl(2.5, 7, 0.6, 9.1, 10.4, '#cfd2d4', { seg: 10 });
      k.box(0.5, 3.8, 9.1, 11, 4.5, 9.5, '#8a4a34', nb);
      k.box(-0.35, -0.05, 3.6, 9.5, 1.5, 7.5, '#55585c', nb);
      k.plane(lsBill, 6, 5.9, -0.37, 6.55, 4.5, -Math.PI / 2, { emissive: 0.15 });
    },
    // DN18b 三層清水泥舊透天：二三樓各 2 扇拱形格柵鐵窗、西半凸出的樓梯間比屋頂高 1 m；一樓白色加蓋店面＋白色平頂雨庇，雨庇前緣粉紅底「Spring 春天 貓狗生活館」
    spring(k, w, d) {
      k.box(0, w, -0.8, 9.1, 0, d, '#77746c');
      k.box(3.5, w, -0.8, 10.1, -1, 3, '#6f6c64');
      for (const y of [3.2, 6.1]) {
        k.plane(archWin, 2.8, 1.7, 1.75, y + 1.5, -0.03, FRONT);
        k.plane(ROWT.alWin(), 0.8, 0.6, 5.2, y + 1.9, -1.03, FRONT);
      }
      k.box(0.2, w - 0.2, 0, 2.9, -1.2, 0, '#f2f2ee');
      k.plane(YHT.win(), 1.0, 2.1, 2.0, 1.05, -1.22, FRONT);
      k.plane(ROWT.alWin(), 1.0, 0.8, 4.6, 1.7, -1.22, FRONT);
      k.box(-0.1, w + 0.1, 2.9, 3.0, -2.6, 0, '#f4f4f2', nb);
      for (const x of [0.3, w - 0.3]) k.box(x - 0.04, x + 0.04, 0, 2.9, -2.5, -2.42, '#f4f4f2', nb);
      k.box(0.45, 6.55, 2.9, 3.9, -2.62, -2.55, '#e58aa0', nb);
      k.plane(springSign, 6, 1.0, 3.5, 3.4, -2.64, FRONT, { emissive: 0.3 });
      for (let j = 0; j < 5; j++) bike(k, 0.6 + j * 1.2, -4.4, 1, bikeCols[(j * 2 + 1) % 6]);
    },
    // DN18c 708 巷口東側轉角三層透天（708 巷調查的 N1，巷內門牌 2）：夾在環中東路與 708 巷之間的楔形，朝環中東路面寬約 8 m、沿巷深約 23 m，西南角削角；
    // 深咖啡二丁掛、樓層間米白飾帶、白框格子窗、陽台黑色鐵欄杆、外掛冷氣很多；朝環中東路一樓深咖啡帆布雨棚、門口擺滿盆栽，
    // 巷側一樓兩片落地玻璃貼桃紅橫幅「Spring 春天 貓狗生活館」（街景 2024-08），後段實牆、小窗、不鏽鋼門與木格柵；後半屋頂加灰白鐵皮
    corner18(k, w, d) {
      const P = [
          [0, 0],
          [7.3, 0],
          [9.83, 1.8],
          [16.9, 14.8],
          [8.8, 18.7],
          [0, 2],
        ],
        TOP = 10.5,
        BR = '#5a4038',
        BAND = '#e0d4bc';
      polyPrism(k, P, -0.8, TOP, BR);
      polyPrism(k, P, TOP, TOP + 0.1, BAND);
      P.forEach((a, j) => {
        const b = P[(j + 1) % P.length];
        k.wallLine(a[0], a[1], b[0], b[1], 0, TOP);
      });
      rectG(k, 0, 6.5, -5.3, 0, '#a8a6a0', 0.05);
      // 朝環中東路的正面
      for (const y of [3.3, 6.5, 9.5]) k.box(-0.02, 7.3, y, y + 0.18, -0.06, 0, BAND, nb);
      for (const y of [3.3, 6.5]) {
        k.plane(ROWT.alWin(), 2.4, 1.5, 2.0, y + 1.6, -0.03, FRONT);
        k.plane(ROWT.alWin(), 0.9, 1.0, 4.6, y + 1.8, -0.03, FRONT);
        k.box(0.4, 6.0, y, y + 0.1, -0.9, 0, '#6a5a50', nb);
        k.box(0.4, 6.0, y + 1.0, y + 1.06, -0.9, -0.84, '#2a2a2a', nb);
        for (let x = 0.4; x <= 6.0; x += 0.25)
          k.box(x, x + 0.03, y + 0.1, y + 1.0, -0.88, -0.85, '#2a2a2a', nb);
      }
      k.plane(shopTex(5), 5.6, 2.4, 3.4, 1.2, -0.03, FRONT, { emissive: 0.3 });
      k.box(0.3, 6.6, 2.6, 2.7, -2.0, 0, '#4a3530', nb);
      k.box(0.3, 6.6, 2.3, 2.7, -2.05, -1.97, '#4a3530', nb);
      for (let x = 0.5; x < 6.6; x += 0.7) {
        k.cyl(x, -0.5, 0.2, 0, 0.35, '#8a5a3a', { seg: 8 });
        blob(k, x, 0.65, -0.5, 0.33, '#3f7a3a');
      }
      // 削角面：每層一扇窗、2～3 樓陽台
      const qc = subKit(...k.w(7.3, 0), k.ang + Math.atan2(1.8, 2.53)),
        LC = 3.1;
      for (const y of [3.3, 6.5, 9.5]) qc.box(0, LC, y, y + 0.18, -0.06, 0, BAND, nb);
      qc.plane(shopTex(6), 2.2, 2.4, LC / 2, 1.2, -0.03, FRONT, { emissive: 0.3 });
      qc.box(0, LC, 2.6, 2.7, -1.8, 0, '#4a3530', nb);
      for (const y of [3.3, 6.5]) {
        qc.plane(ROWT.alWin(), 1.6, 1.5, LC / 2, y + 1.6, -0.03, FRONT);
        qc.box(0.1, LC - 0.1, y, y + 0.1, -0.9, 0, '#6a5a50', nb);
        qc.box(0.1, LC - 0.1, y + 1.0, y + 1.06, -0.9, -0.84, '#2a2a2a', nb);
        for (let x = 0.1; x <= LC - 0.1; x += 0.25)
          qc.box(x, x + 0.03, y + 0.1, y + 1.0, -0.88, -0.85, '#2a2a2a', nb);
        qc.box(0.4, 1.2, y + 2.0, y + 2.5, -0.5, 0, MR.ac, nb);
      }
      // 708 巷側（+x 往巷內）
      const ql = subKit(...k.w(9.83, 1.8), k.ang + Math.atan2(13, 7.07)),
        LL = 14.8;
      for (const y of [3.3, 6.5, 9.5]) ql.box(0, LL, y, y + 0.18, -0.06, 0, BAND, nb);
      shopGlass(ql, 0.3, 2.4, 0, 2.7, shopTex(7));
      shopGlass(ql, 2.6, 4.8, 0, 2.7, shopTex(8));
      ql.box(0.2, 5.0, 2.75, 3.25, -0.08, 0, '#d8456e', nb);
      ql.plane(springSign, 4.8, 0.5, 2.6, 3.0, -0.09, FRONT, { emissive: 0.3 });
      for (const x of [6.8, 9.2]) ql.plane(ROWT.alWin(), 1.0, 0.9, x, 1.9, -0.03, FRONT);
      ql.box(11.8, 12.9, 0, 2.3, -0.05, 0, '#b9bcbf', nb);
      ql.plane(
        paint('2', '#f4f4f0', '#c8202a', null, 0.3, 0.25, 128),
        0.3,
        0.25,
        11.5,
        1.7,
        -0.06,
        FRONT
      );
      for (let x = 13.1; x < 14.4; x += 0.24)
        ql.box(x, x + 0.14, 0.4, 3.0, -0.25, -0.12, '#9a7a5a', nb);
      for (const y of [3.3, 6.5])
        for (let j = 0; j < 5; j++) {
          const x = 1.4 + j * 2.9;
          ql.plane(ROWT.alWin(), 1.5, 1.4, x, y + 1.6, -0.03, FRONT);
          if (j % 2 === 0) {
            ql.box(x + 0.85, x + 1.65, y + 0.7, y + 1.2, -0.55, -0.02, MR.ac, nb);
            ql.box(x + 0.85, x + 1.65, y + 0.66, y + 0.7, -0.6, 0, '#55585c', nb);
          }
        }
      for (const y of [3.3, 6.5]) {
        ql.box(0.1, 3.2, y, y + 0.1, -0.9, 0, '#6a5a50', nb);
        ql.box(0.1, 3.2, y + 1.0, y + 1.06, -0.9, -0.84, '#2a2a2a', nb);
        for (let x = 0.1; x <= 3.2; x += 0.25)
          ql.box(x, x + 0.03, y + 0.1, y + 1.0, -0.88, -0.85, '#2a2a2a', nb);
      }
      ql.box(4, LL - 0.3, TOP + 0.1, TOP + 1.3, 0.5, 8, '#c9cdd0', nb);
      ql.box(3.8, LL - 0.1, TOP + 1.3, TOP + 1.4, 0.3, 8.2, '#b9bdc0', nb);
    },
    // DS1 東段（s 48～72）：碎石車道、生鏽鐵柵門（洗石子門柱）與矮牆，門後一棟廢棄的一層平頂小屋；沒有沿街建物
    ds1e(k, w, d, r) {
      rectG(k, 0, 12, 0, 20, '#9a9488', 0.05);
      rectG(k, 12, w, 0, d, '#6f8a52', 0.04);
      for (const x of [13.6, 19.8]) k.box(x, x + 0.6, 0, 2, 3.7, 4.3, '#b5ae9e');
      k.box(14.2, 19.8, 0.05, 1.7, 3.95, 4.05, '#7a4a2c');
      k.box(20.4, w, 0, 0.9, 3.85, 4.15, '#a8a49a');
      k.box(12, 22, -0.5, 3.0, 15, 23, '#b8b4a8');
      k.box(11.8, 22.2, 3.0, 3.15, 14.8, 23.2, '#8a8780', nb);
      k.plane(ROWT.alWin(), 1.4, 1.0, 16, 1.7, 14.97, FRONT);
      for (const [x, z, h, s] of [
        [22, 2, 3.2, 1.8],
        [23.2, 9, 4, 2.4],
        [8, 22, 4.5, 2.6],
      ])
        tree(k, x, z, h, s, r, gy(k, x, z));
    },
    // DS1 西段（s 77～96）：草地、灌木與停車，s 84 路邊一支約 12 m 的鏽色鋼柱看板（綠光花園婚宴的藍底直幅，字不完整，不寫字）
    ds1w(k, w, d, r) {
      rectG(k, 0, 14, 0, 20, '#6f8a52', 0.04);
      for (const [x, z, h, s] of [
        [2.5, 6, 3.6, 2.2],
        [6, 14, 4.2, 2.6],
        [10, 9, 3.2, 1.8],
        [3, 18, 4.8, 2.8],
      ])
        tree(k, x, z, h, s, r, gy(k, x, z));
      for (const [x, z, s] of [
        [1.2, 1.2, 0.8],
        [5, 1.5, 0.9],
        [9, 1.3, 0.7],
      ])
        blob(k, x, gy(k, x, z) + s * 0.6, z, s, '#3f7a3a');
      const y = gy(k, 12, -0.2);
      k.cyl(12, -0.2, 0.2, y - 0.3, y + 12, '#7a4a2c', { seg: 8, col: true });
      k.box(12.2, 13.6, y + 6, y + 11.5, -0.3, -0.1, '#2f6fb5', nb);
      k.plane(
        board('lgBanner', 1.4, 5.5, (g, W, Hh) => {
          fill(g, W, Hh, '#2f6fb5');
          g.fillStyle = 'rgba(255,255,255,.75)';
          for (let j = 0; j < 8; j++)
            g.fillRect(W * 0.3, Hh * (0.06 + j * 0.11), W * 0.4, Hh * 0.07);
        }),
        1.4,
        5.5,
        12.9,
        y + 8.75,
        -0.32,
        FRONT,
        { double: true }
      );
      carY(k, 15.5, 2, '#e8e8e4');
      carY(k, 17.6, 2.3, '#8a8d90');
    },
    // DS2 台灣電力公司 中原一次配電變電所：斜放 27° 的屋內式變電所（約 22 m），灰色條形磁磚基座、北角藍綠玻璃帷幕方盒、灰白直條紋金屬板、深灰斜屋頂；
    // 前緣圍牆（灰石板基座＋仿木欄杆、米色小口磚柱）、不鏽鋼橫拉柵門、石板名牌、LED 告示牌，牆內草地與樹；西端是隔壁 DAIKIN 的特賣會大布條
    substation(k, w, d, r) {
      rectG(k, 0, w, 0.3, 16, '#6f9a52', 0.06);
      const rail = board('subRail', 3, 1, (g, W, Hh) => {
        g.clearRect(0, 0, W, Hh);
        g.fillStyle = '#8a6a4a';
        g.fillRect(0, 0, W, Hh * 0.1);
        for (let x = 0; x < W; x += W / 18) g.fillRect(x, 0, W / 50, Hh);
      });
      for (const [x0, x1] of [
        [0, 14],
        [20, w],
      ]) {
        k.box(x0, x1, -0.3, 0.6, -0.15, 0.15, '#9a9c98');
        for (let x = x0; x < x1 - 0.1; x += 3) {
          const l = Math.min(3, x1 - x);
          k.plane(rail, l, 1.0, x + l / 2, 1.1, 0, FRONT, { transparent: true, double: true });
        }
        for (let x = x0; x <= x1 + 0.01; x += 3) {
          k.box(x - 0.2, x + 0.2, 0, 1.8, -0.2, 0.2, '#cfc3a8', nb);
          k.box(x - 0.24, x + 0.24, 1.8, 1.9, -0.24, 0.24, '#8a8c88', nb);
        }
        k.wallLine(x0, 0, x1, 0, 0, 1.6);
      }
      k.box(14, 20, 0.1, 1.6, -0.05, 0.05, '#c9ccce');
      for (let x = 14.3; x < 20; x += 0.6) k.box(x, x + 0.05, 0.1, 1.6, -0.08, 0.08, '#9a9d9f', nb);
      k.box(20.3, 23.3, 0.9, 1.7, -0.3, -0.2, '#8a8c88', nb);
      k.plane(tpcPlate, 3, 0.8, 21.8, 1.3, -0.31, FRONT);
      k.box(24, 25.6, 1.2, 1.8, -0.35, -0.2, '#1a1a1a', nb);
      k.plane(ledTex, 1.5, 0.5, 24.8, 1.5, -0.36, FRONT, { emissive: 0.6 });
      for (const [x, z] of [
        [4, 4],
        [9, 9],
        [27, 4.5],
      ])
        tree(k, x, z, 3, 1.8, r, gy(k, x, z));
      for (const x of [8, 26]) {
        const y = gy(k, x, 2);
        k.cyl(x, 2, 0.06, y, y + 3, '#f2f2ee', { seg: 6 });
        blob(k, x, y + 3.1, 2, 0.2, '#fff8e0');
      }
      k.box(2.6, 2.75, 0, 4.6, -0.6, -0.45, '#55585c', nb);
      k.plane(
        board('ds3sale', 4.5, 3, (g, W, Hh) => {
          fill(g, W, Hh, '#e8508a');
          fitText(g, '特賣會', W / 2, Hh * 0.24, W * 0.8, Hh * 0.3, '#ffffff');
          fitText(g, '指定空調家電', W / 2, Hh * 0.52, W * 0.8, Hh * 0.18, '#ffffff');
          fitText(g, 'SALE 最高折扣50%', W / 2, Hh * 0.78, W * 0.86, Hh * 0.18, '#fff2a0');
        }),
        4.5,
        3,
        2.7,
        3.0,
        -0.62,
        FRONT,
        { emissive: 0.2, double: true }
      );
      // 主量體：北角 (19.6, 7)、東角 (33.4, 14)、西角 (6.4, 28.7)（2024 正射量的，±3 m）
      const [nx, nz] = k.w(19.6, 7),
        q = subKit(nx, nz, k.ang + Math.atan2(7, 13.8)),
        L1 = 15.4,
        L2 = 25.4;
      q.box(0, L1, -1.5, 7, 0, L2, 'wall#8b8d88', { tile: [0.9, 0.6] });
      q.box(0, L1, 7, 17, 0, L2, '#d9d9d4');
      q.plane(subStripe(15), L1 - 10.4, 10, 10.3 + (L1 - 10.3) / 2, 12, -0.03, FRONT);
      q.plane(subStripe(25), L2, 10, -0.03, 12, L2 / 2, -Math.PI / 2);
      q.plane(subStripe(25), L2, 10, L1 + 0.03, 12, L2 / 2, Math.PI / 2);
      q.plane(subStripe(15), L1, 10, L1 / 2, 12, L2 + 0.03, 0);
      tiltX(q, -0.6, L1 + 0.6, 18.6, -0.6, 17.0, L2 + 0.6, 0.2, '#4a4d50');
      q.box(0.3, 10.3, 7, 22, -2, 6, '#6f9a98');
      q.plane(subGlass, 10, 15, 5.3, 14.5, -2.03, FRONT, { emissive: 0.1 });
      q.plane(subGlass, 8, 15, 0.27, 14.5, 2, -Math.PI / 2);
      q.plane(subGlass, 8, 15, 10.33, 14.5, 2, Math.PI / 2);
      q.box(0.2, 10.4, 22, 22.25, -2.1, 6.1, '#5a5c5e', nb);
      q.box(11.2, 14.7, 0, 6, -0.2, 0, '#b9b6ae', nb);
      q.plane(openTex, 2.6, 5.2, 12.95, 2.6, -0.22, FRONT);
      q.plane(subLouvre, 9, 5, 5.3, 3.4, -0.03, FRONT);
    },
    // DS3 DAIKIN 大金空調：OSM 森林川家具輪廓的東北斜邊就是它的立面。灰色浪板山牆廠房，正面整個敞開、開口內上方藍白橫幅；路邊藍白直立招牌；門前停一整排機車
    daikin() {
      const A = [469.8, 196],
        B = [484.3, 196],
        q = edgeKit(A, B),
        L = 14.5;
      skin(q, L, 7.2, '#8f9499');
      q.plane(openTex, L - 1, 6, L / 2, 3, -0.32, FRONT, { emissive: 0.2 });
      corr(q, '#8f9499', 0, L, 6, 7.2, -0.32);
      tri(
        q,
        [
          [0, 7.2, -0.2],
          [L, 7.2, -0.2],
          [L / 2, 9.7, -0.2],
        ],
        '#8f9499'
      );
      q.plane(
        paint('DAIKIN 大金空調', '#f4f4f4', '#1f5fb0', null, 6, 0.8, 96),
        6,
        0.8,
        L / 2,
        5.4,
        -0.34,
        FRONT,
        { emissive: 0.3 }
      );
      q.box(L - 0.3, L + 0.1, 0, 11, -2.6, -2.2, '#e8e8e8');
      q.plane(
        board('daikinV', 1.2, 6, (g, W, Hh) => {
          fill(g, W, Hh, '#f4f4f4');
          g.fillStyle = '#1f5fb0';
          g.fillRect(0, 0, W, Hh * 0.16);
          fitText(g, 'DAIKIN', W / 2, Hh * 0.08, W * 0.9, Hh * 0.1, '#ffffff');
          vcol(g, '大金空調', W / 2, Hh * 0.2, Hh * 0.17, W * 0.7, '#1f5fb0');
        }),
        1.2,
        6,
        L - 0.1,
        7.5,
        -2.62,
        FRONT,
        { emissive: 0.3 }
      );
      for (let j = 0; j < 9; j++) bike(q, 1.0 + j * 1.3, -2.1, 1, bikeCols[j % 6]);
      const q2 = edgeKit(W87(146), W87(140.8)),
        L2 = 5.2;
      skin(q2, L2, 7.2, '#8f9499');
      q2.plane(openTex, L2 - 0.3, 6, L2 / 2, 3, -0.32, FRONT, { emissive: 0.2 });
      corr(q2, '#8f9499', 0, L2, 6, 7.2, -0.32);
      for (let j = 0; j < 3; j++) bike(q2, 0.8 + j * 1.3, -2.1, 1, bikeCols[(j + 3) % 6]);
    },
    // DS4 傑輝汽車（門牌 667）：白色浪板修車廠、藍色牆裙，前面透明浪板雨棚；西半敞開修車間（地面漆藍）、東半黑底賽車布條與 LED 字幕牆；門口西側藍底白字直招
    jiehui() {
      const q = edgeKit(W87(159.5), W87(146)),
        L = 13.5;
      skin(q, L, 7.2, '#c5c8c6');
      corr(q, '#c5c8c6', 0, L, 5.2, 7.2, -0.32);
      q.box(0, L, 0, 0.6, -0.34, -0.3, '#2f6fb0', nb);
      q.plane(openTex, 6.4, 4.8, 3.4, 2.4, -0.33, FRONT, { emissive: 0.2 });
      rectG(q, 0, 6.8, -4, -0.3, '#2f6fb0', 0.08);
      q.plane(jhBanner, 5.2, 3.2, 9.8, 2.6, -0.33, FRONT, { emissive: 0.2 });
      q.plane(ledTex, 0.7, 3.0, 12.9, 2.3, -0.33, FRONT, { emissive: 0.5 });
      q.box(0, L, 4.95, 5.05, -2.6, -0.3, '#d6e4e6', nb);
      for (const x of [0.2, L / 2, L - 0.2])
        q.box(x - 0.04, x + 0.04, 4.6, 5.0, -2.5, -2.42, '#8a8d90', nb);
      q.plane(
        vtex('傑輝汽車', '#2a5fc0', '#ffffff', 0.8, 3.2, '#f4f4f4'),
        0.8,
        3.2,
        0.6,
        3.1,
        -0.45,
        FRONT,
        { emissive: 0.3 }
      );
      carY(q, 1.3, -4.6, '#e8b830');
      carY(q, 3.8, -4.6, '#f2f2ee');
    },
    // DS5 森林川（家具）：兩層展示館，磚紅仿木橫紋板，一樓整排落地玻璃、出挑雨庇，二樓藍綠橫向窗帶，女兒牆銀色立體字「森林川」與 WOOD DESIGN FURNITURE；
    // 東端圓形木紋商標與 6 塊白底小牌、路邊直立招牌。s 183 以西 OSM 輪廓往後斜退，那一角照實景補成實心量體
    senlin() {
      const q = edgeKit(W87(190), W87(159.5)),
        L = 30.5,
        H8 = 8.5,
        [cx] = q.l(437.4, 223),
        D = q.l(437.4, 249.9),
        C = [cx, q.l(437.4, 223)[1]],
        t = (0 - C[0]) / (D[0] - C[0]),
        F = [0, C[1] + (D[1] - C[1]) * t];
      polyPrism(q, [[0, 0], [C[0], 0], F], -0.8, H8, '#a5553a');
      q.wallLine(0, 0, F[0], F[1], 0, H8);
      q.wallLine(0, 0, C[0], 0, 0, H8);
      const wood = board(
        'senWood',
        L,
        H8,
        (g, W, Hh) => {
          fill(g, W, Hh, '#a5553a');
          for (let y = 0; y < Hh; y += Hh / 60) {
            g.fillStyle = 'rgba(60,20,10,.16)';
            g.fillRect(0, y, W, Hh / 200);
          }
        },
        24
      );
      skin(q, L, H8, '#a5553a');
      q.plane(wood, L, H8 + 0.3, L / 2, H8 / 2 - 0.15, -0.31, FRONT);
      shopGlass(q, 0.4, L - 4, 0, 3.8, shopTex(31), -0.33);
      q.box(0, L, 3.8, 4.1, -1.5, -0.3, '#a5553a', nb);
      for (const [x0, x1] of [
        [1, 8],
        [9, 13],
      ])
        q.box(x0, x1, 4.9, 6.6, -0.38, -0.3, '#5f9a9a', nb);
      q.box(13.6, 15.6, 4.5, H8, -0.4, -0.3, '#9a9c98', nb);
      const silver = (t, wm, hm, px) =>
        board(`silver_${t}`, wm, hm, (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          fitText(g, t, W / 2, Hh / 2, W * 0.96, Hh * px, '#e4e6e8');
        });
      q.plane(silver('森林川', 5, 1.4, 0.9), 5, 1.4, L - 9, 7.4, -0.34, FRONT, {
        transparent: true,
        emissive: 0.3,
      });
      ['WOOD', 'DESIGN', 'FURNITURE'].forEach((t, j) =>
        q.plane(
          silver(t, 2.6, 0.5, 0.8),
          2.6,
          0.5,
          L - 14.5 - j * 0.5,
          8.0 - j * 0.55,
          -0.34,
          FRONT,
          { transparent: true, emissive: 0.3 }
        )
      );
      q.plane(roundSign('木', '#8a5a3a', '#f0e0c0'), 1.4, 1.4, L - 2.6, 7.0, -0.34, FRONT, {
        transparent: true,
      });
      for (let j = 0; j < 6; j++)
        q.box(
          L - 3.6 + (j % 2) * 1.3,
          L - 2.5 + (j % 2) * 1.3,
          2.6 + (j >> 1) * 0.9,
          3.2 + (j >> 1) * 0.9,
          -0.36,
          -0.3,
          '#f4f4f0',
          nb
        );
      q.box(L + 0.2, L + 0.6, 0, 7, -3.4, -3.0, '#8a8d90');
      q.plane(
        vtex('森林川家具', '#f4f4f0', '#5a3a2a', 0.9, 4.5),
        0.9,
        4.5,
        L + 0.4,
        4.6,
        -3.42,
        FRONT,
        { emissive: 0.3 }
      );
      for (const x of [20, 22]) bike(q, x, -2.2, 1, bikeCols[x % 6]);
    },
    // DS6 響叮噹五金百貨生活館 環中店：一樓東段深灰浪板牆與兩片紅白直條紋帆布捲簾、中段紅框玻璃門、西段深色石材柱間的玻璃櫥窗（上緣紅底白圖示方牌）；
    // 上面 4 m 高的大招牌帶（高出屋頂當女兒牆）與 8 盞投射燈；西北角路邊一座鋼架看板「響叮噹 24H 流通百貨」
    xdd() {
      const q = edgeKit(W86(234), W86(194.5)),
        L = 39.5;
      skin(q, L, 5.2, '#3c3f42');
      q.plane(stripeCurtain, 4.0, 4.6, 33.5, 2.3, -0.32, FRONT);
      q.plane(stripeCurtain, 4.0, 4.6, 29.5, 2.3, -0.32, FRONT);
      q.plane(openTex, 2.4, 4.4, 26.3, 2.2, -0.32, FRONT, { emissive: 0.2 });
      corr(q, '#3c3f42', 17, 25, 0, 5.2, -0.32);
      shopGlass(q, 14.2, 16.8, 0, 3.2, shopTex(40), -0.33);
      for (const x of [14, 16.8]) q.box(x, x + 0.2, 0, 3.4, -0.42, -0.3, '#c8202a', nb);
      q.box(14, 17, 3.2, 3.4, -0.42, -0.3, '#c8202a', nb);
      shopGlass(q, 0.5, 13.8, 0, 3.8, shopTex(41), -0.33);
      for (let x = 0.3; x < 14; x += 3.4) q.box(x, x + 0.45, 0, 5.2, -0.45, -0.3, '#2a2826', nb);
      for (let x = 0.8; x < 13.6; x += 0.75)
        q.box(x, x + 0.55, 4.05, 4.6, -0.36, -0.32, '#c8202a', nb);
      q.box(0, L, 5.2, 9.2, -0.4, -0.05, '#b9a9a4', nb);
      q.plane(xddSign, L, 4.0, L / 2, 7.2, -0.42, FRONT, { emissive: 0.2 });
      for (let j = 0; j < 8; j++) flood(q, 2.5 + j * 4.95, 9.2, -0.1);
      lattice(q, -2.8, -3.2, 0, 10, 0.8);
      q.box(-4.6, -0.6, 10, 12.4, -2.9, -2.7, '#3a3d42', nb);
      q.plane(
        paint('響叮噹\n24H 流通百貨', '#c8302a', '#ffffff', null, 4.0, 2.4, 96),
        4.0,
        2.4,
        -2.6,
        11.2,
        -2.92,
        FRONT,
        { emissive: 0.35, double: true }
      );
      carY(q, 8, -4.7, '#c9c9c4');
      carY(q, 21, -4.7, '#5a6a7a');
    },
    // DS7 尚揚汽車工房（門牌 673）：米白浪板鐵皮屋，上半牆粉紅底紅字大橫幅，一樓灰白雨庇與黑底 E-CAN 橫招，東段藍色鐵捲門、中西段敞開店面與白底直招；東北角紅底直招
    shangyang() {
      const q = edgeKit(W86(254), W86(234)),
        L = 20;
      skin(q, L, 7.6, '#c9c7b4');
      corr(q, '#c9c7b4', 0, L, 3.9, 7.6, -0.31);
      q.plane(syBanner, 17, 2.6, 10, 5.8, -0.33, FRONT, { emissive: 0.2 });
      q.box(0, L, 3.55, 3.65, -1.3, -0.3, '#d8d8d2', nb);
      q.plane(
        paint('E-CAN', '#1a1a1a', '#ffffff', '行車紀錄器．電子後視鏡．行車安全', 6, 0.7, 128),
        6,
        0.7,
        8,
        3.15,
        -0.34,
        FRONT,
        { emissive: 0.3 }
      );
      q.plane(shutterTex('#2f6fb0'), 6, 3.5, 16.8, 1.75, -0.33, FRONT);
      q.plane(openTex, 12.5, 3.3, 7, 1.65, -0.33, FRONT, { emissive: 0.25 });
      for (const x of [3.5, 11])
        q.plane(
          vtex('斗龍汽車隔熱防爆膜', '#f4f4f0', '#1f3a8a', 0.5, 2.6),
          0.5,
          2.6,
          x,
          1.5,
          -0.4,
          FRONT,
          { emissive: 0.2 }
        );
      q.plane(
        vtex('尚揚汽車工房', '#c8323a', '#ffffff', 0.8, 3.6),
        0.8,
        3.6,
        L - 0.5,
        5.6,
        -0.5,
        FRONT,
        { emissive: 0.3 }
      );
      carY(q, 9, -4.7, '#f2f2ee');
    },
    // DS8 森棲棲 非犬貓精品旅館：同一排鐵皮屋的西段，上半牆深綠底橫幅（兩端小動物照片），東半玻璃店面（木籠架）、西半藍色鐵捲門
    senqiqi() {
      const q = edgeKit(W86(266.5), W86(254)),
        L = 12.5;
      skin(q, L, 7.6, '#c9c7b4');
      corr(q, '#c9c7b4', 0, L, 3.8, 4.3, -0.31);
      q.plane(sqqSign, 12, 3.0, L / 2, 5.9, -0.33, FRONT, { emissive: 0.25 });
      q.box(0, L, 3.6, 3.7, -1.2, -0.3, '#d8d8d2', nb);
      shopGlass(q, 6.6, L - 0.4, 0, 3.4, ROWT.shop('hzSqq', '#e8dcc0', '#8a6a44', 117), -0.33);
      q.plane(shutterTex('#2f6fb0'), 6, 3.5, 3.2, 1.75, -0.33, FRONT);
    },
    // DS9 台灣中油加油站：白色圓柱的加油棚（簷帶上白下藍、中間紅線、白底藍字 CPC），棚頂深藍太陽能板斜屋架，棚下兩排加油島，後面一層白色站屋；
    // 東邊 s 270 路邊中油火炬圓標桿、s 267 白色鐵塔油價牌。整塊水泥地，遊戲的 service 路從東側穿過
    cpc(k, w, d) {
      rectG(k, 0, 18, -5.8, 24, '#b5b2aa', 0.05);
      rectG(k, 23.2, w, -5.8, 1, '#b5b2aa', 0.05);
      for (const x of [5.5, 11.25, 17])
        for (const z of [3, 11.5]) k.cyl(x, z, 0.35, 0, 5.9, '#f2f2f2', { seg: 12, col: true });
      k.box(4, 18.5, 6.9, 7.9, 0, 14.5, '#eeeeee', nb);
      k.box(4, 18.5, 5.9, 6.9, 0, 14.5, '#1f4fa8', nb);
      k.box(3.97, 18.53, 6.85, 6.95, -0.03, 14.53, '#d8322a', nb);
      for (const x of [6.8, 15.7])
        k.plane(
          paint('CPC', '#eeeeee', '#1f4fa8', null, 2.6, 0.9, 96),
          2.6,
          0.9,
          x,
          7.4,
          -0.04,
          FRONT,
          { emissive: 0.3 }
        );
      tiltX(k, 4.5, 18, 8.0, 1.5, 9.3, 13, 0.12, '#1f2f5a');
      for (const x of [5, 11.25, 17.5])
        for (const z of [2, 12.5])
          k.box(x - 0.05, x + 0.05, 7.9, z > 5 ? 9.2 : 8.0, z - 0.05, z + 0.05, '#8a8d90', nb);
      for (const z of [5, 9.5]) {
        k.box(6, 16.5, 0, 0.25, z - 0.5, z + 0.5, '#c9c9c4');
        for (const x of [8, 11.25, 14.5]) {
          k.box(x - 0.4, x + 0.4, 0.25, 2.0, z - 0.3, z + 0.3, '#f2f2f2');
          k.box(x - 0.42, x + 0.42, 1.4, 1.8, z - 0.32, z + 0.32, '#1f4fa8', nb);
        }
      }
      k.box(5, 17, -0.5, 3.6, 15, 22.5, '#f2f2ee');
      k.box(4.8, 17.2, 3.6, 3.75, 14.8, 22.7, '#c9c9c4', nb);
      shopGlass(k, 7, 12, 0, 2.6, shopTex(50), 14.98);
      k.box(5, 17, 2.8, 3.1, 14.4, 15, '#1f4fa8', nb);
      {
        const y = gy(k, 26, -4.5);
        k.cyl(26, -4.5, 0.14, y - 0.3, y + 8, '#e8e8e8', { seg: 8, col: true });
        k.plane(cpcTorch, 1.8, 1.8, 26, y + 8.4, -4.62, FRONT, { transparent: true, double: true });
      }
      {
        const y = gy(k, 28.7, -4.5);
        lattice(k, 28.4, -4.8, y, 7, 0.6);
        k.box(28.1, 29.3, y + 4, y + 7.2, -4.95, -4.85, '#f2f2f2', nb);
        for (let j = 0; j < 4; j++)
          k.box(28.2, 29.2, y + 4.3 + j * 0.7, y + 4.75 + j * 0.7, -4.97, -4.95, '#2a2a2a', nb);
      }
    },
    // DS10 加油站西邊的停車棚：平頂鋼棚、四周一圈青綠浪板飾帶（東側面掛桃紅布條，字看不清，不寫字），棚下停車；西側藍色浪板矮牆；棚後一棟米黃色兩層民宅
    teal(k, w, d) {
      rectG(k, 0, w, 0, 11, '#b5b2aa', 0.05);
      for (const x of [1, 7, 13])
        for (const z of [0.4, 7.6]) k.cyl(x, z, 0.1, 0, 3.5, '#9a9d9f', { seg: 8, col: true });
      k.box(0, w, 4.75, 4.85, 0, 8, '#7a7e80', nb);
      for (const [x0, x1, z0, z1] of [
        [0, w, -0.05, 0.05],
        [0, w, 7.95, 8.05],
        [-0.05, 0.05, 0, 8],
        [w - 0.05, w + 0.05, 0, 8],
      ])
        k.box(x0, x1, 3.5, 4.8, z0, z1, '#2f8f88', nb);
      k.plane(
        board('tealPink', 6, 1, (g, W, Hh) => {
          fill(g, W, Hh, '#e04a8a');
          g.fillStyle = 'rgba(255,255,255,.7)';
          for (let j = 0; j < 9; j++)
            g.fillRect(W * (0.06 + j * 0.1), Hh * 0.3, W * 0.07, Hh * 0.4);
        }),
        6,
        1,
        w + 0.08,
        4.15,
        4,
        Math.PI / 2
      );
      car(k, 2, 1.8, '#2a2d33');
      car(k, 6.5, 2, '#c9c9c4');
      car(k, 10.5, 1.6, '#e8e8e4');
      k.box(-0.1, 0, 0, 1.5, -6, 10, '#3f74b0');
      k.box(1, 13, -0.5, 6.6, 13, 23, '#d8c9a0');
      k.box(1, 13, 3.2, 3.3, 12.2, 13, '#c9bc94', nb);
      k.box(1, 13, 3.3, 4.2, 12.2, 12.35, '#c9bc94', nb);
      for (const x of [3.5, 9.5]) {
        k.plane(ROWT.alWin(), 2.0, 1.3, x, 1.6, 12.98, FRONT);
        k.plane(ROWT.alWin(), 2.0, 1.3, x, 4.9, 12.98, FRONT);
      }
      k.box(2, 8, 6.6, 8.6, 15, 21, '#a9b2b6', nb);
      k.cyl(10.5, 18, 0.55, 6.6, 7.9, '#cfd2d4', { seg: 10 });
    },
    // DS11 碎石車道（往後面的木工坊），入口東側一塊墨綠底白字直寫招牌板「123木頭人手作家具」（朝西；朝東那面是手繪家具圖，字看不清，不寫字）
    mutou(k, w, d) {
      rectG(k, 0, w, 0, d, '#9a9488', 0.05);
      for (const z of [0.5, 1.8]) k.box(5.95, 6.05, 0, 4.2, z - 0.05, z + 0.05, '#3a3d3d', nb);
      k.box(5.96, 6.04, 0.8, 4.1, 0.35, 1.95, '#3f5f58');
      k.plane(
        vtex('123木頭人手作家具', '#3f5f58', '#ffffff', 1.5, 3.2),
        1.5,
        3.2,
        5.93,
        2.45,
        1.15,
        -Math.PI / 2,
        { emissive: 0.2 }
      );
    },
    // DS12 環北印刷：兩層鐵皮屋，二樓整面白底廣告看板（黑色書法大字、紅字直排小字、紅帶與藍帶），墨綠雨庇，一樓兩道深灰鐵捲門拉下；東側山牆淺灰浪板
    huanbei(k, w, d) {
      k.box(0, w, -0.8, 9.3, 0, d, '#cfc6a8');
      corr(k, '#cfc6a8', 0, w, 3.6, 4.4);
      k.box(-0.2, w + 0.2, 9.3, 9.4, -0.3, d, '#a8aba8', nb);
      k.box(0, w, 4.4, 9.2, -0.25, 0, '#ecebe4', nb);
      k.plane(hbBill, w, 4.5, w / 2, 6.8, -0.27, FRONT, { emissive: 0.2 });
      k.box(-0.1, w + 0.1, 3.5, 3.6, -1, 0, '#2f5a44', nb);
      for (const x of [2.6, 7.9]) k.plane(shutterTex('#4a4a4a'), 4.4, 3.3, x, 1.65, -0.03, FRONT);
      k.box(w, w + 0.05, 0, 9.3, 0, d, '#c9cbc8', nb);
    },
    // ======== E 段：環中東路708巷（街景 2024-08）。北側 +x 往巷內（x = s − s0），南側 +x 往巷口（x = s1 − s） ========
    // N2 巷 10 號：灰色水泥 2 樓老屋（發黑發霉），二樓整層往巷子外挑 1 m；一樓由東到西：不鏽鋼格柵門、深藍鐵捲門、黃底紅字直立小燈箱「精緻套房」、深色小門、米色鐵捲門；二樓 3 樘深灰框大鋁窗
    lane10(k, w, d) {
      const C = '#7d7b74';
      k.box(0, w, -0.8, 3.3, 0, d, C);
      k.box(0, w, 3.3, 6.8, -1, d, C);
      k.box(0, w, 3.2, 3.32, -1.02, 0, '#55534e', nb);
      k.box(0.3, 1.3, 0, 2.2, -0.05, 0, '#b9bcbf', nb);
      for (let x = 0.4; x < 1.3; x += 0.15) k.box(x, x + 0.04, 0, 2.2, -0.08, -0.05, '#9a9d9f', nb);
      k.plane(shutterTex('#2f3a66'), 5, 2.8, 4.0, 1.4, -0.03, FRONT);
      k.box(1.4, 6.6, 2.8, 3.2, -0.08, 0, '#2f3a66', nb);
      k.box(6.4, 6.9, 1.4, 3.2, -0.2, -0.06, '#f4f4f0', nb);
      k.plane(
        vtex('精緻套房', '#e8c93a', '#c0281e', 0.42, 1.6),
        0.42,
        1.6,
        6.65,
        2.3,
        -0.21,
        FRONT,
        { emissive: 0.4 }
      );
      k.box(7.0, 7.9, 0, 2.1, -0.05, 0, '#2a2a2c', nb);
      k.plane(shutterTex('#b9a58c'), 2.2, 2.6, 8.9, 1.3, -0.03, FRONT);
      for (let j = 0; j < 3; j++) {
        const x = 0.4 + j * 3.2;
        k.plane(ROWT.alWin(), 2.8, 2.0, x + 1.4, 5.0, -1.03, FRONT);
        k.box(x, x + 2.8, 3.9, 6.1, -1.06, -1.0, '#3a3f48', nb);
      }
      k.box(-0.02, w + 0.02, 6.8, 6.9, -1.04, d, '#55534e', nb);
      k.box(4.0, 4.8, 0, 0.45, -0.8, -0.35, '#8a6a4a', nb);
    },
    // N3 巷 12 號：米褐橫紋磁磚，一樓整面米色鐵捲門＋左邊深綠格子玻璃門（紅、綠信箱），樓上被外凸 0.8 m 的白色菱格鐵窗籠整個包住（裡面是陽台、盆栽）
    lane12(k, w, d, r) {
      k.box(0, w, -0.8, 9.2, 0, d, 'wall#a08a70', { tile: [0.6, 0.3] });
      k.box(-0.02, w + 0.02, 3.2, 3.45, -0.08, 0, '#5a4636', nb);
      k.plane(shutterTex('#b9a58c'), 4.5, 2.9, 2.55, 1.45, -0.03, FRONT);
      k.box(5.0, 6.2, 0, 2.3, -0.05, 0, '#2f4a44', nb);
      k.box(5.0, 5.3, 1.2, 1.5, -0.2, -0.05, '#c8202a', nb);
      k.box(5.9, 6.2, 1.2, 1.5, -0.2, -0.05, '#3f7a3a', nb);
      const cage = board(
        'diamondCage',
        2,
        2,
        (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          g.strokeStyle = '#ececea';
          g.lineWidth = 3;
          for (let j = -8; j <= 8; j++) {
            g.beginPath();
            g.moveTo((j * W) / 8, 0);
            g.lineTo((j * W) / 8 + W, Hh);
            g.moveTo((j * W) / 8, Hh);
            g.lineTo((j * W) / 8 + W, 0);
            g.stroke();
          }
        },
        64
      );
      for (const y of [3.45, 6.3]) {
        k.box(0.1, w - 0.1, y, y + 0.1, -0.8, 0, '#e8e8e8', nb);
        win(k, w / 2, y + 1.5, w - 1.2, 1.4);
        for (let x = 1; x < w - 0.5; x += 1.6) blob(k, x, y + 0.45, -0.4, 0.3, '#4f8a3e');
      }
      for (let x = 0.1; x < w - 0.15; x += 2) {
        const l = Math.min(2, w - 0.1 - x);
        k.plane(cage, l, 2.85, x + l / 2, 4.9, -0.82, FRONT, { transparent: true, double: true });
        k.plane(cage, l, 2.85, x + l / 2, 7.75, -0.82, FRONT, { transparent: true, double: true });
      }
      for (const x of [0.12, w - 0.12]) {
        k.plane(cage, 0.8, 2.85, x, 4.9, -0.4, Math.PI / 2, { transparent: true, double: true });
        k.plane(cage, 0.8, 2.85, x, 7.75, -0.4, Math.PI / 2, { transparent: true, double: true });
      }
      k.box(0.05, w - 0.05, 9.15, 9.3, -0.85, 0, '#e8e8e8', nb);
      k.box(-0.02, w + 0.02, 9.2, 9.32, -0.04, d, 'gray', nb);
      if (r() < 2) k.cyl(w / 2, d - 2, 0.55, 9.3, 10.5, '#cfd2d4', { seg: 10 });
    },
    // N4 水泥圍牆（2.6 m，黑白噴漆人臉塗鴉、牆頂一整排蛇籠鐵絲網），牆後是黑色遮陽網搭的弧頂棚架；更後面的校內小樓不在這一段
    netwall(k, w, d) {
      k.box(0, w, -0.6, 2.6, 0, 0.2, '#4d4b47');
      k.plane(
        board('faceGraffiti', 7, 2.6, (g, W, Hh) => {
          fill(g, W, Hh, '#4d4b47');
          g.fillStyle = 'rgba(235,235,230,.75)';
          g.beginPath();
          g.ellipse(W * 0.72, Hh * 0.55, W * 0.12, Hh * 0.36, 0, 0, 7);
          g.fill();
          g.fillStyle = '#1e1e1e';
          for (const [x, y, rx] of [
            [0.68, 0.45, 0.025],
            [0.77, 0.45, 0.025],
            [0.72, 0.72, 0.05],
          ]) {
            g.beginPath();
            g.ellipse(W * x, Hh * y, W * rx, Hh * 0.05, 0, 0, 7);
            g.fill();
          }
          g.strokeStyle = 'rgba(230,230,225,.6)';
          g.lineWidth = 4;
          for (let j = 0; j < 9; j++) {
            g.beginPath();
            g.moveTo(W * (0.05 + j * 0.05), Hh * 0.9);
            g.lineTo(W * (0.1 + j * 0.045), Hh * 0.2);
            g.stroke();
          }
        }),
        w,
        2.6,
        w / 2,
        1.3,
        -0.02,
        FRONT
      );
      for (let x = 0.3; x < w; x += 0.45) {
        const g = new THREE.TorusGeometry(0.28, 0.012, 4, 10);
        g.rotateY(Math.PI / 2);
        g.translate(x, 2.92, 0.1);
        k._part(VC, paintGeo(g, '#a8acae'));
      }
      {
        const g = new THREE.CylinderGeometry(4, 4, w - 0.2, 14, 1, true, -Math.PI / 2, Math.PI);
        g.rotateZ(Math.PI / 2);
        g.scale(1, 1.0, 1);
        g.translate(w / 2, 0.5, 5);
        k._part(VC, paintGeo(g, '#1c1d1e'));
      }
    },
    // N5 灰鐵捲門小車庫：一層、雙斜小屋頂（屋脊垂直巷子、灰白浪板、木封簷板）
    garage5(k, w, d) {
      k.box(0, w, -0.8, 2.9, 0, d, '#b9b6ae');
      k.plane(shutterTex('#9a9a98'), w - 0.4, 2.8, w / 2, 1.4, -0.03, FRONT);
      gable(k, 0, w, 0, d, 2.9, 3.8, '#d0d0cc', '#b9b6ae', 0.3);
      k.box(-0.3, w + 0.3, 2.8, 2.95, -0.32, -0.28, '#6a4a30', nb);
    },
    // N6 紅磚圍牆（2 m，塗鴉，東端一段較矮、磚色較亮），牆後濃密樹叢；轉角外側一棵大樹
    brickwall(k, w, d, r) {
      k.box(0, 2.5, -0.6, 1.6, 0, 0.25, 'wall#b06a50', { tile: [0.25, 0.1] });
      k.box(2.5, w, -0.6, 2.0, 0, 0.25, 'wall#9c5a44', { tile: [0.25, 0.1] });
      k.box(2.5, w, 2.0, 2.08, -0.03, 0.28, '#8a4a38', nb);
      k.plane(
        board('brickGraffiti', 4, 1.4, (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          g.lineWidth = 6;
          [
            ['#2a5fc0', 0.1],
            ['#f2f2ee', 0.4],
            ['#1a1a1a', 0.7],
          ].forEach(([c, x]) => {
            g.strokeStyle = c;
            g.beginPath();
            g.moveTo(W * x, Hh * 0.8);
            g.bezierCurveTo(
              W * (x + 0.05),
              Hh * 0.1,
              W * (x + 0.15),
              Hh * 0.9,
              W * (x + 0.25),
              Hh * 0.3
            );
            g.stroke();
          });
        }),
        4,
        1.4,
        7,
        1.0,
        -0.02,
        FRONT,
        { transparent: true }
      );
      for (let x = 0.6; x < w; x += 1.4)
        blob(k, x, 2.4 + r() * 0.8, 0.8, 0.7 + r() * 0.4, r() < 0.5 ? '#3f7a3a' : '#4b8a3e');
    },
    // N7 校內機車停車場：高起約 0.4 m 的水泥平台（臨巷矮擋土牆），平台上 3 排白色鋼柱、白色平頂的機車棚（長向大致東西），棚下停滿機車；入口紅白擋桿與柵欄機；轉角外側一棵大樹
    motopark(k, w, d, r) {
      rectG(k, 0, w, 0.4, d, '#b5b2aa', 0.42);
      k.box(0, w, -0.5, 0.45, 0, 0.4, '#a8a69e');
      for (const [x0, x1] of [
        [6, 10.5],
        [12.75, 17.25],
        [17.8, 21.3],
      ]) {
        for (const x of [x0 + 0.2, x1 - 0.2])
          for (let z = 9; z <= 21.01; z += 4)
            k.box(x - 0.06, x + 0.06, 0.4, 2.9, z - 0.06, z + 0.06, '#f2f2ee', nb);
        k.box(x0 - 0.2, x1 + 0.2, 2.9, 3.3, 8.6, 21.4, '#e6e4de', nb);
        k.box(x0 - 0.22, x1 + 0.22, 3.0, 3.12, 8.58, 21.42, '#b9a890', nb);
        for (let z = 9.6; z < 20.6; z += 0.95) {
          bike(k, x0 + 0.3, z, 0, bikeCols[((z * 3) | 0) % 6]);
          if (x1 - x0 > 4) bike(k, x1 - 1.8, z + 0.4, 0, bikeCols[((z * 5) | 0) % 6]);
        }
      }
      k.box(1.5, 1.9, 0.4, 1.4, 1.0, 1.4, '#e8e8e4', nb);
      k.box(1.7, 1.78, 1.2, 1.28, 1.2, 4.8, '#d8322a', nb);
      for (let z = 1.6; z < 4.8; z += 0.8) k.box(1.69, 1.79, 1.19, 1.29, z, z + 0.4, '#f2f2ee', nb);
      for (let x = 0.4; x < 5; x += 0.8) blob(k, x, 0.8, 0.6, 0.4, '#3f7a3a');
      tree(k, -1.5, 3, 5, 3.6, r, gy(k, -1.5, 3));
      for (let x = 14; x < w; x += 0.12 * 20)
        k.box(x, x + 0.05, 0.4, 1.3, 0.3, 0.35, '#c9ccce', nb);
      k.box(14, w, 1.25, 1.3, 0.3, 0.35, '#c9ccce', nb);
    },
    // S2 灰水泥 2 樓老屋：平屋簷挑出、一樓鏽紅浪板斜雨遮（上面長草）、深綠木板門與木窗，二樓外挑實心水泥欄板陽台、深色門窗
    oldhouse2(k, w, d) {
      const P = [
          [0, 0],
          [w, 0],
          [w, 5.5],
          [3, 9.4],
          [0, 9.4],
        ],
        C = '#807e76';
      polyPrism(k, P, -0.8, 6.2, C);
      P.forEach((a, j) => {
        const b = P[(j + 1) % P.length];
        k.wallLine(a[0], a[1], b[0], b[1], 0, 6.2);
      });
      k.box(-0.3, w + 0.3, 6.2, 6.4, -0.8, 1.5, '#6f6d66', nb);
      tiltX(k, 0, w, 2.6, -1.5, 3.0, 0, 0.06, '#8a5a44');
      for (let x = 0.5; x < w; x += 1.3) blob(k, x, 2.85, -0.9, 0.18, '#5f8a48');
      k.box(1.0, 2.2, 0, 2.2, -0.05, 0, '#3f5a4a', nb);
      k.box(3.0, 5.0, 0.9, 2.0, -0.05, 0, '#3f5a4a', nb);
      k.box(w - 0.9, w - 0.1, 0.4, 2.4, -0.06, 0, '#c84a4a', nb);
      k.box(w - 0.75, w - 0.25, 1.0, 1.8, -0.07, -0.06, '#f2f2ee', nb);
      k.box(0.2, w - 0.2, 3.2, 3.32, -1.0, 0, '#6f6d66', nb);
      k.box(0.2, w - 0.2, 3.32, 4.2, -1.0, -0.88, C, nb);
      k.plane(shutterTex('#2a2a2c'), 1.0, 2.0, 2.0, 4.3, -0.03, FRONT);
      k.plane(ROWT.alWin(), 1.8, 1.2, 4.6, 4.6, -0.03, FRONT);
    },
    // S3 灰水泥 2 樓老屋：一樓灰褐鐵捲門＋同色鐵門（菱形紅春聯）、門前三階樓梯、圓弧收邊的水泥雨庇接鏽浪板、西端木條柵欄開口；
    // 二樓退縮 2 m 做露台（實心水泥欄板），上方鐵架斜撐的鏽色浪板遮陽棚；西北角屋頂樓梯間凸出
    oldhouse3(k, w, d) {
      const C = '#7f7c73';
      k.box(0, w, -0.8, 3.3, 0, d, C);
      k.box(0, w, 3.3, 6.3, 2, d, C);
      k.box(0, w, 3.3, 4.3, -0.05, 0.2, C, nb);
      k.box(-0.02, w + 0.02, 3.3, 3.42, -0.05, 2, '#6f6d66', nb);
      k.plane(shutterTex('#6e665c'), 4, 2.9, 5.2, 1.45, -0.03, FRONT);
      k.box(1.6, 2.6, 0, 2.3, -0.05, 0, '#6e665c', nb);
      k.box(1.95, 2.25, 1.4, 1.7, -0.07, -0.05, '#c8202a', nb);
      for (let j = 0; j < 3; j++)
        k.box(0.2, 1.4, 0, 0.18 * (j + 1), -0.9 + j * 0.3, 0, '#9a9890', nb);
      for (let x = 0.1; x < 1.4; x += 0.2) k.box(x, x + 0.08, 0, 2.6, -0.12, -0.05, '#8a6a4a', nb);
      k.box(0, w, 3.0, 3.3, -1.0, 0, '#8f8c84', nb);
      rodX(k, 0, w, 3.15, -1.0, 0.15, '#8f8c84');
      tiltX(k, 0, w, 2.6, -1.9, 3.0, -1.0, 0.05, '#8a5a44');
      k.plane(ROWT.alWin(), 1.4, 1.2, 2.0, 4.8, 1.97, FRONT);
      k.box(4.2, 5.2, 3.3, 5.4, 1.95, 2.0, '#2a2a2c', nb);
      tiltX(k, -0.1, w + 0.1, 6.4, 2.0, 5.5, -0.3, 0.05, '#7a5a48');
      for (const x of [0.3, w / 2, w - 0.3])
        k.box(x - 0.03, x + 0.03, 4.3, 5.55, -0.25, -0.2, '#55585c', nb);
      k.box(0, 3, 6.3, 8.8, 2, 5, C, nb);
      k.box(-0.05, 3.05, 8.8, 8.9, 1.95, 5.05, '#6f6d66', nb);
      k.plane(ROWT.alWin(), 1.0, 1.0, 1.5, 7.6, 1.97, FRONT);
      k.plane(ROWT.alWin(), 1.0, 1.0, -0.03, 4.8, 5.5, -Math.PI / 2);
    },
    // S4 前段（s 49.5～67）：塗鴉水泥圍牆（1.6～1.8 m、牆頂垂藤蔓）圍起來的雜草空地，裡面一個被藤蔓整個包住的方塊、4 座放在地上的不鏽鋼水塔
    vacantA(k, w, d, r) {
      rectG(k, 0, w, 0.25, d, '#6f8a52', 0.05);
      k.box(0, w, -0.6, 1.7, 0, 0.25, '#6a6f78');
      k.plane(wallArt(w), w, 1.7, w / 2, 0.85, -0.02, FRONT);
      for (let x = 0.4; x < w; x += 0.9) blob(k, x, 1.75, 0.05, 0.28, '#4f7a3a');
      k.box(5, 13, -0.3, 5, 3.3, 9.3, '#3f6a2c');
      for (let j = 0; j < 18; j++)
        blob(k, 5 + r() * 8, 1 + r() * 4.2, 3.2 + (j % 2 ? 6.2 : 0), 0.7, '#4f7a3a');
      for (const [x, z] of [
        [0.8, 2.3],
        [2.4, 2.3],
        [0.8, 3.9],
        [2.4, 3.9],
      ])
        k.cyl(x, z, 0.75, 0, 2.5, '#cfd2d4', { seg: 12, col: true });
      k.box(0.0, 3.2, 2.5, 2.56, 1.5, 4.7, '#9a9d9f', nb);
      for (const [x, z, s] of [
        [15, 4, 1.2],
        [9, 13, 1.4],
        [3, 12, 1.1],
      ])
        blob(k, x, s * 0.6, z, s, '#4f7a3a');
    },
    // S4 後段（s 71～92，轉南後的東側）：同一道塗鴉圍牆（s≈80 一扇綠色鐵柵門），牆內大片草地與矮綠籬、一棵柏類針葉樹；空地後方一棟一層樓的灰色水泥矮屋（鏽灰浪板斜屋頂，左邊接深色鐵皮矮棚）
    vacantB(k, w, d, r) {
      rectG(k, 0, w, 0.25, d, '#6f8a52', 0.05);
      k.box(0, 11.2, -0.6, 1.7, 0, 0.25, '#6a6f78');
      k.box(12.8, w, -0.6, 1.7, 0, 0.25, '#6a6f78');
      k.plane(wallArt(11.2), 11.2, 1.7, 5.6, 0.85, -0.02, FRONT);
      k.plane(wallArt(w - 12.8), w - 12.8, 1.7, (12.8 + w) / 2, 0.85, -0.02, FRONT);
      k.slab(w, 0.12, 20.74, -0.21, 0.25, -0.6, 1.7, '#6a6f78');
      k.box(11.2, 12.8, 0, 1.6, 0.05, 0.15, '#3f7a4c');
      for (let x = 0.4; x < w; x += 0.9) blob(k, x, 1.75, 0.05, 0.28, '#4f7a3a');
      conifer(k, 20, 7.3, 9);
      for (let x = 2; x < 18; x += 1.6) blob(k, x, 0.45, 3.0, 0.5, '#3f7a3a');
      k.box(-1, 8, -0.5, 3.0, 12.5, 18.5, '#8a877e');
      k.box(2.5, 4, 1.2, 2.2, 12.47, 12.5, '#e8e8e4', nb);
      tiltX(k, -1.2, 8.2, 3.4, 12.2, 2.9, 18.8, 0.08, '#6e6a66');
      k.box(8, 11, -0.5, 2.2, 13, 18, '#3a3d40');
      k.box(7.9, 11.1, 2.2, 2.3, 12.8, 18.2, '#4a4d50', nb);
    },
    // S6 往南死巷東側的 2 樓米色老屋：西立面二樓外挑陽台（不鏽鋼欄杆、掛滿衣服，南段用黃褐浪板包起來），一樓鐵窗鐵門；北側牆刷白、沒開窗；
    // 屋頂西北角一支白色方形煙囪狀凸出；屋前紅磚矮牆圍的小院子（香蕉、姑婆芋）
    deadend() {
      const q = subKit(231.7, 318.2, Math.atan2(-0.874, 0.485)),
        L = 8,
        D = 9,
        C = '#cfc8b4';
      q.box(0, L, -0.8, 6.2, 0, D, C);
      q.box(L - 0.02, L + 0.03, 0, 6.2, 0, D, '#e4e2da', nb);
      q.box(-0.02, L + 0.02, 6.2, 6.32, -0.04, D, 'gray', nb);
      q.box(L - 1.2, L - 0.2, 6.2, 8.2, 0.3, 1.3, '#f2f2ee', nb);
      for (const x of [1.2, 4.6]) q.plane(YHT.win(), 1.6, 1.3, x + 0.8, 1.7, -0.03, FRONT);
      q.box(6.4, 7.4, 0, 2.2, -0.05, 0, '#55585c', nb);
      q.box(0.2, L - 0.2, 3.1, 3.2, -1.0, 0, '#9a9890', nb);
      q.box(0.2, L - 0.2, 4.15, 4.2, -1.0, -0.95, '#c9ccce', nb);
      for (let x = 0.2; x < L - 0.1; x += 0.3)
        q.box(x, x + 0.025, 3.2, 4.15, -1.0, -0.97, '#c9ccce', nb);
      q.box(0.2, 2.8, 3.2, 6.0, -1.02, -0.95, '#c2a66a', nb);
      for (let x = 3.2; x < L - 0.5; x += 0.45)
        q.box(
          x,
          x + 0.35,
          4.6,
          5.3 + (x % 1) * 0.3,
          -0.9,
          -0.86,
          ['#c84a4a', '#f2f2ee', '#4a6fb0', '#e8c93a'][((x * 2) | 0) % 4],
          nb
        );
      q.plane(ROWT.alWin(), 2.0, 1.4, 5.2, 4.9, -0.03, FRONT);
      q.box(0.5, 6, -0.6, 1.0, -1.35, -1.15, 'wall#9c5a44', { tile: [0.25, 0.1] });
      for (const [x, s, c] of [
        [1.2, 0.8, '#5f9a4a'],
        [3, 1.0, '#4f8a3e'],
        [4.8, 0.7, '#3f7a3a'],
      ])
        blob(q, x, 1.0 + s * 0.5, -0.6, s, c);
    },
    // ======== F 段：環中東路708巷 中段（街景 2024-08） ========
    // 校內機車棚（北側）：白灰鋼柱、淺 V 形浪板屋頂（朝路那半生鏽紅棕、背面米白），簷高約 2.6 m，棚下停滿機車；lines = 棚前水泥地畫白色機車格、hedge = 通道口綠籬花台、wall = 棚前紅磚矮牆
    cpRow(k, w, d, r, sp) {
      rectG(k, 0, w, 0, d, '#b5b2aa', 0.05);
      for (let x = 0.3; x < w; x += 5)
        for (const z of [0.3, d - 0.3])
          k.box(x - 0.07, x + 0.07, 0, 2.7, z - 0.07, z + 0.07, '#c8c8c4', nb);
      tiltX(k, -0.2, w + 0.2, 2.7, -0.4, 2.95, d / 2, 0.06, '#9a4a3a');
      tiltX(k, -0.2, w + 0.2, 2.95, d / 2, 2.75, d + 0.3, 0.06, '#d8c8a8');
      for (let x = 0.6; x < w - 1; x += 0.95)
        bike(k, x, 0.8 + ((x * 7) % 3) * 0.2, 1, bikeCols[((x * 3) | 0) % 6]);
      if (sp.lines)
        for (let x = 0; x <= w; x += 0.95)
          rectG(k, x, x + 0.06, 2.5 - sp.set, -0.3, '#e8e8e4', 0.07);
      if (sp.hedge) {
        k.box(-2.8, -1.2, 0, 0.8, 2.5 - sp.set, 0, '#a9a69e');
        blob(k, -2, 1.0, (2.5 - sp.set) / 2, 0.6, '#3f7a3a');
      }
      if (sp.wall) {
        const z = 2 - sp.set;
        k.box(0, w, -0.5, 1.1, z, z + 0.25, 'wall#a8553a', { tile: [0.25, 0.1] });
        k.box(0, w, 1.1, 1.18, z - 0.03, z + 0.28, '#b5b2aa', nb);
        for (let x = 3; x < w; x += 6) blob(k, x, 1.5, z + 1.2, 0.8, '#5f8a48');
      }
    },
    // 停車場柵門（北側車道出入口）：紅白柵欄臂、米色柵欄機、黑底紅字 LED 車位小看板、不鏽鋼倒 U 形護欄
    parkGate(k, w) {
      rectG(k, 0, w, -0.5, 6, '#4f5054', 0.06);
      k.box(0.3, 0.8, 0, 1.2, 0.3, 0.8, '#e6dcc0');
      k.box(0.5, 0.58, 1.0, 1.08, 0.5, 4.5, '#d8322a', nb);
      for (let z = 1; z < 4.5; z += 0.8) k.box(0.49, 0.59, 0.99, 1.09, z, z + 0.4, '#f2f2ee', nb);
      k.box(w - 0.9, w - 0.1, 1.2, 1.8, 0.2, 0.3, '#111111', nb);
      k.plane(
        paint('312', '#111111', '#e02a20', null, 0.7, 0.45, 128),
        0.7,
        0.45,
        w - 0.5,
        1.5,
        0.19,
        FRONT,
        { emissive: 0.6 }
      );
      k.box(w - 0.55, w - 0.45, 0, 1.2, 0.2, 0.3, '#55585c', nb);
      for (const x of [1.5, 3.5]) {
        k.box(x, x + 0.06, 0, 0.8, -0.4, -0.34, '#c9ccce', nb);
        k.box(x + 0.9, x + 0.96, 0, 0.8, -0.4, -0.34, '#c9ccce', nb);
        k.box(x, x + 0.96, 0.78, 0.84, -0.4, -0.34, '#c9ccce', nb);
      }
    },
    // 紅磚砌的圓角花台：一大叢灌木與一棵大樹（樹高約 10 m），一根傾斜的灰色鋼管柱
    treeBed(k, w, d, r) {
      k.box(0.5, w - 0.3, -0.3, 0.6, 0, 5, 'wall#a8553a', { tile: [0.25, 0.1] });
      k.box(0.7, w - 0.5, 0.6, 0.65, 0.2, 4.8, '#5a4a38', nb);
      tree(k, 3.5, 2.8, 6, 4, r);
      for (const x of [1.5, 4.8]) blob(k, x, 1.2, 2, 0.9, '#3f7a3a');
      const g = new THREE.CylinderGeometry(0.1, 0.1, 6, 8);
      g.rotateZ(0.25);
      g.translate(w - 1.2, 3, 3);
      k._part(VC, paintGeo(g, '#8a8d90'));
    },
    // 北側紅磚矮牆（高 1.1 m、水泥壓頂、白漆藍漆塗鴉），牆後雜草與更北邊的露天停車場
    redWall(k, w, d) {
      k.box(0, w, -0.5, 1.1, 0, 0.25, 'wall#a8553a', { tile: [0.25, 0.1] });
      k.box(0, w, 1.1, 1.18, -0.03, 0.28, '#b5b2aa', nb);
      rectG(k, 0, w, 0.3, d, '#6f8a52', 0.05);
      for (let x = 0.8; x < w; x += 1.4) blob(k, x, 0.7, 1.2, 0.6, '#5f8a48');
    },
    // 南側「中原大學機車停車場」東區平台：比路面高約 0.9 m（往西漸低到 0.5 m）的水泥平台，擋土牆貼著路緣，平台上畫滿白色機車格、停機車；西北角階梯與不鏽鋼扶手
    platE(k, w, d, r) {
      k.box(0, w / 2, -0.6, 0.55, 0, d, '#b9b4a8', { surface: true });
      k.box(w / 2, w, -0.6, 0.85, 0, d, '#b9b4a8', { surface: true });
      k.box(0, w, -0.6, 0.2, -0.05, 0, '#8f8b82', nb);
      for (const z of [0.6, 5.6])
        for (let x = 0.4; x < w - 1; x += 0.95) {
          const y = x < w / 2 ? 0.55 : 0.85;
          k.box(x, x + 0.05, y, y + 0.01, z, z + 2, '#e8e8e4', nb);
          if (r() < 0.55) bike(k, x + 0.47, z + 0.2, 1, bikeCols[(r() * 6) | 0]);
        }
      for (let j = 0; j < 3; j++)
        k.box(0.2, 1.6, 0, 0.18 * (j + 1), -0.9 + j * 0.3, -0.6 + j * 0.3, '#a9a69e', nb);
      k.box(1.7, 1.76, 0.55, 1.45, -0.6, 2, '#c9ccce', nb);
      k.box(w - 0.3, w, 0.85, 1.9, 0, d, '#c9ccce', nb);
    },
    // 平台南側後排（off -13）：東邊一片大樹、紅瓦斜屋頂舊平房（白色山牆）、淺綠浪板斜屋頂鐵皮棚；牆腳被平台南緣矮牆擋住
    fS2(k, w, d, r) {
      for (const [x, z] of [
        [17.5, 2],
        [19.5, 5],
      ])
        tree(k, x, z, 5, 3.2, r, gy(k, x, z));
      k.box(8, 15, -0.5, 3.0, 0, d, '#e8e4da');
      gable(k, 8, 15, 0, d, 3.0, 4.5, '#9a4a3a', '#e8e4da', 0.3);
      k.box(0, 8, -0.5, 2.8, 0, d, '#b9b6ae');
      tiltX(k, -0.2, 8.2, 3.2, -0.3, 2.6, d + 0.3, 0.06, '#a9c2a4');
      k.box(0, 15, -0.5, 1.2, -0.3, -0.05, '#8f8b82', nb);
    },
    // 平台西南角後方的舊 2 樓水泥樓（發黑），每層兩三樘舊鋁窗＋直條鐵窗、二樓窗下冷氣；屋頂右半一間小加蓋
    fS3(k, w, d) {
      const C = '#8c877c';
      k.box(0, w, -0.5, 6.2, 0, d, C);
      k.box(-0.02, w + 0.02, 6.2, 7.0, -0.04, d, C, nb);
      k.box(0, 4, 7.0, 9.4, 1, 5, C, nb);
      k.plane(ROWT.alWin(), 1, 0.9, 2, 8.2, 0.97, FRONT);
      for (const y of [1.0, 4.1])
        for (const x of [1.6, 4.0, 6.4]) {
          k.plane(YHT.win(), 1.4, 1.2, x, y + 0.6, -0.03, FRONT);
          if (y > 2) ac(k, x - 0.4, y - 0.7);
        }
    },
    // 「杯情城市」山牆平房：屋脊垂直巷子、山牆朝北，淺灰水泥漆，山牆中央手寫灰黑毛筆大字（下面的小字看不清不寫）；左上冷氣、左下紅磚補牆與小窗、牆腳塗鴉
    cupCity(k, w, d) {
      const C = '#a9a7a3';
      k.box(0, w, -0.5, 3.0, 0, d, C);
      gable(k, 0, w, 0, d, 3.0, 4.8, '#55585c', C, 0.3);
      k.plane(
        board('beiqing', 5, 1.0, (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          fitText(g, '杯情城市', W / 2, Hh / 2, W * 0.95, Hh * 0.9, '#5a5a5a', 700);
        }),
        5,
        1.0,
        w / 2,
        2.1,
        -0.03,
        FRONT,
        { transparent: true }
      );
      k.box(w - 1.6, w - 0.8, 2.3, 2.8, -0.45, 0, MR.ac, nb);
      k.box(w - 1.8, w - 0.6, 0, 1.0, -0.04, 0, 'wall#9c5a44', { tile: [0.25, 0.1] });
      k.plane(ROWT.alWin(), 0.7, 0.6, w - 2.5, 1.4, -0.03, FRONT);
    },
    // 停車場西臂：水泥地（東半比路高約 0.5 m、往西降到與路同高），兩排白線機車格；西端出入口紅白柵欄臂、米色柵欄機、黑底看板「P 中原大學 機車停車場」與三列紅色 LED 空位數字
    platW(k, w, d, r) {
      k.box(w / 2, w, -0.6, 0.45, 0, d, '#b5b0a6', { surface: true });
      rectG(k, 0, w / 2, 0, d, '#b5b0a6', 0.08);
      k.box(w / 2, w, -0.6, 0.2, -0.05, 0, '#8f8b82', nb);
      for (const z of [0.4, 5.0])
        for (let x = 4.2; x < w - 0.5; x += 0.95) {
          const y = x < w / 2 ? 0.09 : 0.45;
          k.box(x, x + 0.05, y, y + 0.01, z, z + 2, '#e8e8e4', nb);
          if (r() < 0.5) bike(k, x + 0.47, z + 0.2, 1, bikeCols[(r() * 6) | 0]);
        }
      k.box(1.0, 1.5, 0, 1.2, -0.2, 0.3, '#e6dcc0');
      k.box(1.2, 1.28, 1.0, 1.08, 0.3, 4.0, '#d8322a', nb);
      for (let z = 0.7; z < 4; z += 0.8) k.box(1.19, 1.29, 0.99, 1.09, z, z + 0.4, '#f2f2ee', nb);
      k.box(2.2, 3.6, 0, 2.6, -0.5, -0.35, '#111111');
      k.plane(
        board('cycuMoto', 1.3, 2.2, (g, W, Hh) => {
          fill(g, W, Hh, '#111111');
          g.fillStyle = '#2a5fc0';
          g.fillRect(W * 0.08, Hh * 0.04, W * 0.3, W * 0.3);
          fitText(g, 'P', W * 0.23, Hh * 0.04 + W * 0.15, W * 0.26, W * 0.26, '#ffffff');
          fitText(g, '中原大學', W * 0.68, Hh * 0.08, W * 0.58, Hh * 0.07, '#ffffff');
          fitText(g, '機車停車場', W * 0.68, Hh * 0.16, W * 0.58, Hh * 0.07, '#ffffff');
          [
            ['東區二空位', '154'],
            ['東區一空位', '312'],
            ['', '19'],
          ].forEach(([t, n], j) => {
            const y = Hh * (0.36 + j * 0.2);
            if (t) fitText(g, t, W * 0.3, y, W * 0.5, Hh * 0.05, '#ffffff', 700);
            fitText(g, n, W * 0.76, y, W * 0.4, Hh * 0.12, '#e02a20');
          });
        }),
        1.3,
        2.2,
        2.9,
        1.4,
        -0.52,
        FRONT,
        { emissive: 0.5 }
      );
    },
    // 「老莊工作室」牆面平房：灰白水泥漆、上緣深灰壓頂，牆上半手寫藍色大字（右邊三行小字看不清不寫），下半手寫告示與塗鴉；三個小窗洞用橘棕木板封住；後面深灰單斜鐵皮屋頂
    laozhuang(k, w, d) {
      const C = '#b9b6ae';
      k.box(0, w, -0.5, 3.3, 0, d, C);
      k.box(-0.02, w + 0.02, 3.3, 3.5, -0.06, 0.3, '#4a4d50', nb);
      tiltX(k, -0.1, w + 0.1, 3.6, 0.3, 3.0, d + 0.2, 0.06, '#4a4d50');
      k.plane(
        board('laozhuang', 4.2, 0.8, (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          fitText(g, '老莊工作室', W / 2, Hh / 2, W * 0.96, Hh * 0.9, '#3a5fa8', 700);
        }),
        4.2,
        0.8,
        w / 2 + 0.6,
        2.7,
        -0.03,
        FRONT,
        { transparent: true }
      );
      for (const [x, h] of [
        [1.2, 2.0],
        [3.0, 1.0],
        [4.6, 1.0],
      ])
        k.box(x - 0.5, x + 0.5, 0.5, 0.5 + h, -0.06, 0, '#b0683a', nb);
      k.plane(
        board('jeaGraf', 3, 0.9, (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          fitText(g, 'JeA', W * 0.3, Hh / 2, W * 0.4, Hh * 0.8, '#3fa04a');
          g.strokeStyle = '#2a2a2a';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(W * 0.55, Hh * 0.8);
          g.bezierCurveTo(W * 0.7, Hh * 0.1, W * 0.8, Hh, W * 0.95, Hh * 0.2);
          g.stroke();
        }),
        3,
        0.9,
        w / 2,
        0.6,
        -0.04,
        FRONT,
        { transparent: true }
      );
    },
    // 矮 2 樓水泥樓（有塗鴉）：二樓一樘橫拉窗、一樓小鐵窗與窗型冷氣；女兒牆上兩台冷氣；屋頂一座往東傾斜、比樓寬的單斜鋼棚
    fS7(k, w, d) {
      k.box(0, w, -0.5, 5.8, 0, d, '#8a8478');
      k.plane(ROWT.alWin(), 2.2, 1.0, w / 2, 4.4, -0.03, FRONT);
      k.plane(YHT.win(), 0.9, 0.9, 1.2, 1.6, -0.03, FRONT);
      k.box(2.2, 2.9, 1.3, 1.8, -0.4, 0, MR.ac, nb);
      for (const x of [0.6, 2.0]) k.box(x, x + 0.8, 5.8, 6.3, 1, 1.6, MR.ac, nb);
      for (const x of [0.2, w - 0.2]) k.box(x - 0.05, x + 0.05, 5.8, 8.3, 1, 1.1, '#55585c', nb);
      tiltX(k, -0.3, w + 4.5, 8.3, 0.5, 7.9, d, 0.06, '#7d6f60');
    },
    // 深色舊 2 樓清水水泥樓（比兩邊高、山牆狀斜頂女兒牆，牆上長出兩叢榕樹苗）：二樓左小右大兩樘窗（右邊橘棕木框鐵窗）、一樓一樘鐵窗、牆腳藍白塗鴉
    fS8(k, w, d, r) {
      k.box(0, w, -0.5, 6.4, 0, d, '#5a5650');
      tri(
        k,
        [
          [0, 6.4, 0],
          [w, 6.4, 0],
          [0, 7.5, 0],
        ],
        '#5a5650'
      );
      k.plane(ROWT.alWin(), 0.8, 0.9, w - 1.2, 4.6, -0.03, FRONT);
      k.plane(YHT.win(), 1.6, 1.3, 1.5, 4.5, -0.03, FRONT);
      k.box(0.6, 2.4, 3.8, 5.2, -0.05, -0.02, '#b0683a', nb);
      k.plane(YHT.win(), 1.2, 1.0, w / 2, 1.6, -0.03, FRONT);
      for (const [x, y] of [
        [w - 0.8, 5.6],
        [0.8, 3.4],
      ])
        blob(k, x, y, -0.4, 0.7, '#4f8a3e');
    },
    // 藍色 2 樓樓（斑馬壁畫）：整棟灰藍漆、樓板處出挑水泥板簷，一樓三樘方窗黑色鐵窗＋大幅斑馬紋拱形壁畫圍著中間橘棕色圖案（細節看不清，只畫色塊）、西端一扇門；
    // 二樓兩樘方窗、中間白色大冷氣與排風管；屋頂整層鋼柱鐵皮棚（四面透空），棚下不鏽鋼水塔；店名看不到，不放招牌
    zebra(k, w, d) {
      k.box(0, w, -0.5, 6.4, 0, d, '#4a5a78');
      k.box(0, w, -0.5, 3.2, -0.02, 0, '#3f4f6e', nb);
      for (const y of [3.2, 6.4]) k.box(-0.1, w + 0.1, y - 0.15, y, -0.4, 0, '#4a5a78', nb);
      k.plane(
        board('zebraMural', 6, 2.6, (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          for (let j = 0; j < 14; j++) {
            g.strokeStyle = j % 2 ? '#111111' : '#f2f2ee';
            g.lineWidth = W * 0.022;
            g.beginPath();
            g.arc(W / 2, Hh, W * (0.22 + j * 0.02), Math.PI, 0);
            g.stroke();
          }
          g.fillStyle = '#b8682e';
          g.beginPath();
          g.ellipse(W / 2, Hh * 0.72, W * 0.1, Hh * 0.26, 0, 0, 7);
          g.fill();
        }),
        6,
        2.6,
        w / 2,
        1.5,
        -0.04,
        FRONT,
        { transparent: true }
      );
      for (const x of [1.4, w / 2, w - 2.6]) k.plane(YHT.win(), 1.1, 1.1, x, 1.7, -0.05, FRONT);
      k.box(0.3, 1.2, 0, 2.2, -0.05, 0, '#2a2a2c', nb);
      for (const x of [2.2, w - 2.2]) k.plane(YHT.win(), 1.4, 1.3, x, 4.8, -0.03, FRONT);
      k.box(w / 2 - 0.6, w / 2 + 0.6, 3.3, 4.2, -0.7, 0, MR.ac, nb);
      k.box(w / 2 + 0.7, w / 2 + 0.8, 0, 4.2, -0.12, -0.02, '#f2f2ee', nb);
      for (const x of [0.2, w / 2, w - 0.2])
        for (const z of [0.3, d - 0.3])
          k.box(x - 0.06, x + 0.06, 6.4, 8.9, z - 0.06, z + 0.06, '#6a6d70', nb);
      k.box(-0.2, w + 0.2, 8.9, 9.0, 0, d, '#4a4d50', nb);
      k.cyl(w / 2, d / 2, 0.6, 6.4, 7.8, '#cfd2d4', { seg: 10 });
      blob(k, 0.8, 7.0, 0.6, 0.5, '#4f8a3e');
    },
    // 灰色 2 樓＋3 樓綠鐵皮加蓋（修改衣服）：一樓深色店面、門邊紅春聯、門口木椅與交通錐、小綠鐵皮雨棚；門邊白底紅字直立小招牌「修改衣服」；二樓鋁窗與窗型冷氣
    tailor1(k, w, d) {
      const C = '#8e8a7e';
      k.box(0, w, -0.5, 6.2, 0, d, C);
      k.box(0, w, 6.2, 9.0, 0, d, '#dcdcd8');
      k.box(-0.02, w + 0.02, 6.2, 9.0, -0.04, 0, '#8fae86', nb);
      k.box(-0.2, w + 0.2, 9.0, 9.1, -0.3, d, '#9a9c98', nb);
      k.plane(darkShop, 2.6, 2.6, w / 2 + 0.3, 1.3, -0.03, FRONT, { emissive: 0.3 });
      k.box(w / 2 - 1.15, w / 2 - 0.95, 0.6, 2.4, -0.05, -0.03, '#c8202a', nb);
      k.box(-0.1, w + 0.1, 2.9, 3.0, -1.2, 0, '#6f8f6a', nb);
      k.plane(vtex('修改衣服', '#f0ece4', '#c8322a', 0.4, 1.3), 0.4, 1.3, 0.3, 3.6, -0.06, FRONT, {
        emissive: 0.3,
      });
      k.plane(ROWT.alWin(), 1.6, 1.2, w / 2, 4.8, -0.03, FRONT);
      k.box(2.6, 3.2, 4.2, 4.6, -0.4, 0, MR.ac, nb);
      k.box(0.6, 1.4, 0, 0.45, -1.0, -0.6, '#8a6a4a', nb);
      for (const x of [2.2, 2.9]) k.cone(x, -1.2);
    },
    // 50 號：橘黃色 3 樓＋屋頂整層鋼棚（看起來像 4 層），每層樓板處一道寬清水水泥帶、二樓下一圈淺綠浪板裙板；一樓整排淺綠浪板單斜雨棚（幾乎蓋到路邊），
    // 雨棚下由南到北藍色鐵捲門、深灰鐵捲門、不鏽鋼雕花大門（紅色門牌 50）、紅色「請勿停車」活動柵欄；二樓花格鐵窗與北端外推凸窗，三樓小窗與白色百葉鐵捲窗
    no50(k, w, d) {
      const Y = '#e0a030',
        G = '#8f8a80',
        W2 = w + 3,
        x0 = -1.5;
      k.box(x0, x0 + W2, -0.5, 9.6, 0, d, Y);
      for (const y of [3.6, 6.6]) k.box(x0 - 0.02, x0 + W2 + 0.02, y, y + 1.0, -0.15, 0, G, nb);
      k.box(x0 - 0.03, x0 + W2 + 0.03, 2.6, 3.6, -0.16, -0.1, '#9dbf96', nb);
      for (const x of [x0 + 0.2, x0 + W2 / 2, x0 + W2 - 0.2])
        for (const z of [0.3, d - 0.3])
          k.box(x - 0.06, x + 0.06, 9.6, 12.2, z - 0.06, z + 0.06, '#8a8d90', nb);
      tiltX(k, x0 - 1, x0 + W2 + 0.2, 12.4, -1, 12.0, d, 0.06, '#8a8d90');
      tiltX(k, x0, x0 + W2, 3.0, -2.6, 3.3, 0, 0.06, '#8fae86');
      for (const x of [x0 + 0.3, x0 + W2 / 2, x0 + W2 - 0.3])
        k.box(x - 0.05, x + 0.05, 0, 3.0, -2.5, -2.4, '#d8d8d4', nb);
      k.plane(shutterTex('#3d6ea8'), 4.4, 2.6, x0 + W2 - 2.6, 1.3, -0.03, FRONT);
      k.plane(shutterTex('#3a3a3c'), 4.2, 2.6, x0 + W2 - 7.3, 1.3, -0.03, FRONT);
      k.box(x0 + 0.3, x0 + 2.3, 0, 2.5, -0.05, 0, '#b9bcbf', nb);
      k.plane(
        paint('50', '#c8202a', '#ffffff', null, 0.3, 0.2, 128),
        0.3,
        0.2,
        x0 + 1.3,
        2.7,
        -0.06,
        FRONT
      );
      for (const x of [x0 + 3, x0 + 5.5, x0 + 8]) {
        k.box(x - 0.5, x + 0.5, 0, 1.0, -2.2, -2.15, '#c8202a', nb);
      }
      for (let j = 0; j < 4; j++)
        k.plane(YHT.win(), 1.6, 1.2, x0 + W2 - 1.4 - j * 2.4, 5.4, -0.03, FRONT);
      k.box(x0 + 0.2, x0 + 3.2, 4.6, 6.4, -0.6, 0, '#9fc8b8', nb);
      for (let j = 0; j < 3; j++)
        k.plane(ROWT.alWin(), 1.0, 1.0, x0 + W2 - 1.2 - j * 1.6, 8.3, -0.03, FRONT);
      k.plane(shutterTex('#e8e8e4'), 3, 1.5, x0 + 3.2, 8.3, -0.03, FRONT);
    },
    // 48 號：白色小口磁磚 4 樓窄樓（修改衣褲）：一樓白鋁框玻璃店面（紅字「修改」）、紅底白字門牌 48、生鏽的紅色波浪板雨棚，雨棚上方垂直立面的粉紫底紅字側招「修改衣褲」；
    // 二樓窗下白底綠字橫布條（只抄得到「金字招牌 專門修改」）；樓上白色方格鐵窗、三樓綠框窗；平頂女兒牆
    no48(k, w, d) {
      k.box(0, w, -0.5, 12.5, 0, d, 'wall#e8e8e4', { tile: [0.3, 0.3] });
      k.box(-0.02, w + 0.02, 12.5, 13.2, -0.04, d, '#dcdcd6', nb);
      shopGlass(k, 0.3, w - 0.3, 0, 2.8, ROWT.shop('hz48', '#f2eee6', '#8a6a5a', 48));
      k.plane(vtex('修改', '#f2f2ee', '#c8202a', 0.3, 0.7), 0.3, 0.7, 1.2, 1.5, -0.04, FRONT);
      k.plane(
        paint('48', '#c8202a', '#ffffff', null, 0.3, 0.2, 128),
        0.3,
        0.2,
        w / 2,
        3.0,
        -0.04,
        FRONT
      );
      k.box(-0.1, w + 0.1, 3.2, 3.3, -1.5, 0, '#b0483a', nb);
      for (const sd of [-1, 1])
        k.plane(
          paint('修改衣褲', '#d8a8c8', '#c8202a', null, 2.2, 0.9, 128, 'frame'),
          2.2,
          0.9,
          w - 0.3 + sd * 0.08,
          3.85,
          -1.1,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.plane(
        board('jinzi', 3.6, 0.6, (g, W, Hh) => {
          fill(g, W, Hh, '#eef2ea');
          vcol(g, '金字招牌', W * 0.05, 0, Hh / 4, Hh * 0.22, '#3a8a5a');
          fitText(g, '專門修改', W * 0.45, Hh / 2, W * 0.6, Hh * 0.7, '#3a8a5a');
        }),
        3.6,
        0.6,
        w / 2,
        3.65,
        -0.05,
        FRONT,
        { emissive: 0.2 }
      );
      for (let f = 1; f < 4; f++) {
        const y = 3.3 + (f - 1) * 3;
        k.plane(f === 2 ? ROWT.alWin() : YHT.win(), 2.0, 1.4, w / 2, y + 1.6, -0.03, FRONT);
        if (f === 2) k.box(w / 2 - 1.1, w / 2 + 1.1, y + 0.8, y + 2.4, -0.06, -0.03, '#2f9a6a', nb);
        k.box(w / 2 - 1.1, w / 2 + 1.1, y + 0.6, y + 0.75, -0.4, 0, '#f2f2ee', nb);
      }
      k.cyl(0.5, -0.6, 0.35, 0, 0.5, '#8a5a3a', { seg: 8 });
      blob(k, 0.5, 1.0, -0.6, 0.55, '#3f7a3a');
    },
    // ======== G 段：環中東路708巷 內段（街景 2024-08） ========
    // 校內擋土牆（高約 1.8 m，整面藍、綠、橘彩繪塗鴉），牆頂與牆後是大樹；vine = 牆後爬藤覆蓋的建物牆面
    muralWall(k, w, d, r, sp) {
      k.box(0, w, -0.6, 1.8, 0, 0.35, '#8f8b82');
      k.plane(wallArt(w), w, 1.8, w / 2, 0.9, -0.02, FRONT);
      for (let x = 1; x < w; x += 2.6)
        blob(k, x, 2.4 + r() * 0.6, 0.9, 1.0 + r() * 0.4, r() < 0.5 ? '#3f7a3a' : '#4b8a3e');
      if (sp.vine) for (let x = 1.5; x < w; x += 3) tree(k, x, 2.2, 4.5, 2.6, r);
    },
    // 46 號（OSM w587178600，名稱照舊）：一樓灰色文化石，二樓整排深色大玻璃，屋頂紅色鐵皮與往巷子外挑的大屋簷（紅色簷帶、白色簷底）；
    // 一樓由南到北：電表箱與白色鐵格柵樓梯門、玻璃店面（橫招「24小時 輸贏啦 自助桌遊」、紅色鳳梨吊飾、門牌 46）、藍色鐵捲門上黑格柵與墨綠圓牌（字看不清不寫）、藍色鐵捲門上的小字「麻辣臭豆腐」
    no46() {
      const A = [154.1, 264],
        B = [155.7, 277.2],
        q = edgeKit(A, B),
        L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      q.box(-1.5, 0, -0.8, 7.2, 0, 7, '#9a9da0');
      skin(q, L, 7.2, '#9a9da0');
      q.plane(
        board(
          'cultStone',
          6,
          3.6,
          (g, W, Hh) => {
            fill(g, W, Hh, '#9a9da0');
            for (let y = 0; y < Hh; y += Hh / 24) {
              g.fillStyle = 'rgba(0,0,0,.12)';
              g.fillRect(0, y, W, 2);
            }
          },
          24
        ),
        L + 1.5,
        3.6,
        (L - 1.5) / 2,
        1.8,
        -0.32,
        FRONT
      );
      q.plane(darkGl, L + 1.5, 2.8, (L - 1.5) / 2, 5.0, -0.33, FRONT);
      for (let x = -1.5; x < L; x += 3) q.box(x, x + 0.08, 3.6, 6.4, -0.36, -0.3, '#d8d8d4', nb);
      q.box(-1.7, L + 0.2, 6.6, 7.2, -1.8, -0.3, '#b3262a', nb);
      q.box(-1.7, L + 0.2, 6.55, 6.6, -1.8, -0.3, '#d8d4cc', nb);
      q.box(L - 1.2, L - 0.4, 0.8, 1.8, -0.5, -0.3, '#8a8d90', nb);
      q.box(L - 0.4, L, 0, 2.4, -0.34, -0.3, '#f2f2ee', nb);
      shopGlass(q, L - 6.2, L - 1.3, 0, 2.6, ROWT.shop('hz46', '#eef0f4', '#7f858c', 46), -0.33);
      q.plane(
        board('shuyingla', 5, 0.9, (g, W, Hh) => {
          fill(g, W, Hh, '#eef0f4');
          g.strokeStyle = '#8fb0d8';
          g.lineWidth = 3;
          g.strokeRect(2, 2, W - 4, Hh - 4);
          const tile = (t, x, c) => {
            g.fillStyle = '#f4f4f0';
            g.fillRect(x - Hh * 0.28, Hh * 0.14, Hh * 0.56, Hh * 0.72);
            g.strokeStyle = '#2f7a5a';
            g.strokeRect(x - Hh * 0.28, Hh * 0.14, Hh * 0.56, Hh * 0.72);
            fitText(g, t, x, Hh / 2, Hh * 0.5, Hh * 0.46, c);
          };
          ['24', '小', '時'].forEach((t, j) =>
            tile(t, W * (0.07 + j * 0.09), j ? '#2f7a5a' : '#c8202a')
          );
          g.fillStyle = '#2a5fc0';
          g.beginPath();
          g.ellipse(W * 0.5, Hh * 0.52, W * 0.12, Hh * 0.36, 0, 0, 7);
          g.fill();
          fitText(g, '輸贏啦', W * 0.5, Hh * 0.55, W * 0.2, Hh * 0.4, '#ffffff');
          g.fillStyle = '#4fae5a';
          g.beginPath();
          g.arc(W * 0.5, Hh * 0.14, Hh * 0.12, 0, 7);
          g.fill();
          [...'自助桌遊'].forEach((t, j) => tile(t, W * (0.68 + j * 0.09), '#2a3f7a'));
        }),
        5,
        0.9,
        L - 3.75,
        3.1,
        -0.36,
        FRONT,
        { emissive: 0.35 }
      );
      q.plane(
        paint('46', '#2a5fc0', '#ffffff', null, 0.3, 0.2, 128),
        0.3,
        0.2,
        L - 6.4,
        2.2,
        -0.35,
        FRONT
      );
      blob(q, L - 1.6, 2.3, -0.6, 0.18, '#d8322a');
      q.plane(shutterTex('#3f6fc0'), 5.2, 2.8, 3.4, 1.4, -0.33, FRONT);
      q.box(0.8, 6.0, 2.8, 3.5, -0.36, -0.3, '#2a2a2a', nb);
      q.plane(roundSign('', '#1f3a34', '#f2f2ee'), 0.9, 0.9, 3.4, 3.15, -0.37, FRONT, {
        transparent: true,
      });
      q.plane(shutterTex('#3f6fc0'), 1.4, 2.8, -0.75, 1.4, -0.33, FRONT);
      q.plane(
        board('mala', 1.4, 0.3, (g, W, Hh) => {
          fill(g, W, Hh, '#9a9da0');
          [...'麻辣臭豆腐'].forEach((c, j) => {
            fitText(g, c, W * (0.1 + j * 0.2), Hh / 2, W * 0.16, Hh * 0.8, '#222222');
            if (j) {
              g.fillStyle = '#222222';
              g.fillRect(W * j * 0.2, Hh * 0.15, 1, Hh * 0.7);
            }
          });
        }),
        1.4,
        0.3,
        -0.75,
        3.05,
        -0.34,
        FRONT
      );
    },
    // 深藍鐵皮小棚屋（貼在 46 號北牆外）：單斜鐵皮頂，紫褐色小捲門與褐色木門
    blueShed(k, w, d) {
      k.box(0, w, -0.6, 2.8, 0, d, '#26306a');
      tiltX(k, -0.1, w + 0.1, 2.9, -0.3, 2.6, d + 0.1, 0.05, '#4a5070');
      k.plane(shutterTex('#8a6a70'), 1.5, 2.2, 1.2, 1.1, -0.03, FRONT);
      k.box(3.2, 4.1, 0, 2.1, -0.05, 0, '#6a4a30', nb);
    },
    // 42 號：一樓白色小口磚（東端黃底紅字斜掛燈箱「□華麵飯館」，第一個字被擋住，只寫看得清的「華麵飯館」）、門牌 42、兩片銀色鐵捲門與收起的咖啡色捲簾雨遮、深色鋁窗與冷氣；
    // 一樓頂灰色小披簷上一個不鏽鋼水塔；二樓是水泥柱＋淺綠鐵皮斜屋頂的開放棚架、局部深色木板牆
    no42(k, w, d) {
      k.box(0, w, -0.6, 3.2, 0, d, 'wall#dcdcd6', { tile: [0.3, 0.3] });
      k.plane(shutterTex('#b9b9b4'), 4.0, 2.7, w - 5.5, 1.35, -0.03, FRONT);
      k.box(w - 7.6, w - 3.4, 2.8, 3.05, -0.35, 0, '#7a5a45', nb);
      k.plane(
        paint('42', '#2a5fc0', '#ffffff', null, 0.3, 0.2, 128),
        0.3,
        0.2,
        w - 3.2,
        2.3,
        -0.04,
        FRONT
      );
      for (const x of [1.0, 2.6]) k.plane(ROWT.alWin(), 1.2, 1.3, x, 1.7, -0.03, FRONT);
      ac(k, 0.4, 0.4);
      k.box(-0.1, w + 0.1, 3.2, 3.35, -0.8, 0, '#8c8f8a', nb);
      k.cyl(w - 1.5, -0.3, 0.5, 3.35, 4.4, '#cfd2d4', { seg: 10 });
      for (const x of [0.2, w / 2, w - 0.2])
        k.box(x - 0.15, x + 0.15, 3.2, 6.0, 0.2, 0.5, '#9a9890', nb);
      tiltX(k, -0.2, w + 0.2, 6.3, -0.2, 5.8, d, 0.06, '#b9c9a0');
      k.box(0.3, 3.5, 3.2, 5.8, 3, 3.1, '#4a4038', nb);
      k.box(w - 0.3, w - 0.2, 3.3, 5.0, -0.6, -0.5, '#55585c', nb);
      k.plane(
        paint('華麵飯館', '#f2c21a', '#c8302a', null, 3.5, 0.9, 96),
        3.5,
        0.9,
        w - 2.0,
        4.4,
        -0.62,
        FRONT,
        { emissive: 0.35 }
      );
    },
    // 40 號 阿來：4 樓白色小方磚，一樓東 2.5 m 鐵窗牆、西 5 m 深色鋁框玻璃店門（紅黃菜單）；白底橫招「阿來 炒飯／炒麵 香 好料 Q 吃 飽」，上方垂白色小花藤蔓；
    // 樓上每層一組凸出的白色拱頂花格鐵窗＋冷氣，二樓晾衣服
    alai(k, w, d, r) {
      k.box(0, w, -0.6, 12.2, 0, d, 'wall#d9d8d0', { tile: [0.3, 0.3] });
      k.box(-0.02, w + 0.02, 12.2, 12.32, -0.04, d, 'gray', nb);
      k.plane(YHT.win(), 2.0, 1.6, w - 1.3, 1.6, -0.03, FRONT);
      shopGlass(k, 0.3, 5.0, 0, 2.6, ROWT.shop('hzAlai', '#f6ead2', '#a07a4a', 40));
      k.plane(
        board('alai', 4.5, 0.7, (g, W, Hh) => {
          fill(g, W, Hh, '#f2efe6');
          fitText(g, '阿來', W * 0.22, Hh / 2, W * 0.3, Hh * 0.8, '#d02a22');
          fitText(g, '炒飯', W * 0.53, Hh * 0.3, W * 0.2, Hh * 0.4, '#2540a0');
          fitText(g, '炒麵', W * 0.53, Hh * 0.72, W * 0.2, Hh * 0.4, '#2540a0');
          fitText(g, '香 好料', W * 0.82, Hh * 0.3, W * 0.25, Hh * 0.34, '#d02a22', 700);
          fitText(g, 'Q 吃 飽', W * 0.82, Hh * 0.72, W * 0.25, Hh * 0.34, '#2540a0', 700);
        }),
        4.5,
        0.7,
        2.6,
        2.95,
        -0.05,
        FRONT,
        { emissive: 0.3 }
      );
      for (let x = 0.4; x < 5; x += 0.5) blob(k, x, 3.4, -0.15, 0.18, '#e8efe0');
      for (let f = 1; f < 4; f++) {
        const y = 3.2 + (f - 1) * 3;
        k.box(0.6, w - 0.6, y + 0.5, y + 2.6, -0.6, 0, '#f2f2ee', nb);
        k.plane(archWin, w - 1.4, 1.9, w / 2, y + 1.55, -0.62, FRONT);
        ac(k, 0.1, y + 0.2, -0.9);
        if (f === 1)
          for (let x = 1.5; x < w - 1.5; x += 0.6)
            k.box(
              x,
              x + 0.4,
              y + 1.2,
              y + 1.9,
              -0.45,
              -0.42,
              ['#c84a4a', '#4a6fb0', '#f2f2ee'][((x * 2) | 0) % 3],
              nb
            );
      }
    },
    // 荏苒古著：米黃小磁磚 3 樓，一樓米灰鐵捲門兩片、鐵皮披簷下黑底白字橫招（左邊白色小印章），樓上整排外凸白鐵窗與冷氣，頂部外挑屋簷
    renran(k, w, d) {
      k.box(0, w, -0.6, 9.2, 0, d, 'wall#cfc49a', { tile: [0.3, 0.3] });
      k.box(-0.3, w + 0.3, 9.2, 9.4, -0.6, d, '#8f8c84', nb);
      k.plane(shutterTex('#a89f8e'), w - 0.4, 2.6, w / 2, 1.3, -0.03, FRONT);
      k.box(-0.1, w + 0.1, 3.4, 3.5, -0.8, 0, '#9a9c98', nb);
      k.plane(
        board('renran', 3.5, 0.6, (g, W, Hh) => {
          fill(g, W, Hh, '#1c1c1c');
          g.strokeStyle = '#f0f0f0';
          g.lineWidth = 3;
          g.strokeRect(W * 0.04, Hh * 0.2, Hh * 0.6, Hh * 0.6);
          fitText(g, '荏苒古著', W * 0.56, Hh / 2, W * 0.74, Hh * 0.7, '#f0f0f0');
        }),
        3.5,
        0.6,
        w / 2,
        2.95,
        -0.05,
        FRONT,
        { emissive: 0.3 }
      );
      for (let f = 1; f < 3; f++) {
        const y = 3.2 + (f - 1) * 3;
        k.box(0.3, w - 0.3, y + 0.5, y + 2.5, -0.45, 0, '#f2f2ee', nb);
        k.plane(YHT.win(), w - 0.8, 1.8, w / 2, y + 1.5, -0.47, FRONT);
      }
    },
    // 大觀園巷口乾麵：白磁磚 4 樓＋屋頂鐵皮棚，一樓開放式攤位用藍白條紋帆布圍住，簷下米白底黑書法字橫幅「大觀園巷口乾麵」（右端碗麵照片）、白底紅字小牌「水餃」；
    // 二樓窗下那塊紅字招牌只看得清「金園」兩字，不寫字
    dagy(k, w, d) {
      k.box(0, w, -0.6, 12.2, 0, d, 'wall#dedbd2', { tile: [0.3, 0.3] });
      for (const x of [0.2, w - 0.2])
        for (const z of [0.5, d - 0.5])
          k.box(x - 0.05, x + 0.05, 12.2, 14.4, z - 0.05, z + 0.05, '#6a6d70', nb);
      k.box(-0.2, w + 0.2, 14.4, 14.5, 0.2, d, '#9a9c98', nb);
      k.plane(
        board(
          'blueStripe',
          w,
          2.3,
          (g, W, Hh) => {
            for (let j = 0; j < 16; j++) {
              g.fillStyle = j % 2 ? '#e8e8e8' : '#3f6fb0';
              g.fillRect((W * j) / 16, 0, W / 16 + 1, Hh);
            }
          },
          32
        ),
        w - 0.3,
        2.3,
        w / 2,
        1.15,
        -0.4,
        FRONT
      );
      k.box(0, w, 2.5, 2.6, -0.9, 0, '#8c8f8a', nb);
      k.plane(
        board('dagy', 4, 0.7, (g, W, Hh) => {
          fill(g, W, Hh, '#e8e2cf');
          fitText(g, '大觀園巷口乾麵', W * 0.42, Hh / 2, W * 0.78, Hh * 0.7, '#1a1a1a', 700);
          g.fillStyle = '#d8552a';
          g.beginPath();
          g.arc(W * 0.9, Hh / 2, Hh * 0.36, 0, 7);
          g.fill();
        }),
        4,
        0.7,
        w / 2,
        2.95,
        -0.06,
        FRONT,
        { emissive: 0.25 }
      );
      k.plane(vtex('水餃', '#f4f4f0', '#c8302a', 0.35, 0.9), 0.35, 0.9, 0.4, 1.2, -0.45, FRONT);
      k.box(0.3, w - 0.3, 3.9, 4.7, -0.12, 0, '#f2efe6', nb);
      for (let f = 1; f < 4; f++) {
        const y = 3.2 + (f - 1) * 3;
        k.plane(YHT.win(), w - 1.0, 1.4, w / 2, y + 1.7, -0.03, FRONT);
        ac(k, 0.2, y + 0.3);
      }
    },
    // 複合式速食：白色橫紋磁磚 4 樓，一樓深灰鐵捲門、上方橘紅橫帶與黑褐底金色書法字橫招；二樓起每層鐵欄杆陽台＋淺綠半透明浪板遮雨棚，陽台上冷氣
    fastfood(k, w, d) {
      k.box(0, w, -0.6, 12.2, 0, d, 'wall#e6e4dc', { tile: [0.6, 0.3] });
      k.plane(shutterTex('#6a6660'), w - 0.5, 2.5, w / 2, 1.25, -0.03, FRONT);
      k.box(0, w, 3.15, 3.4, -0.1, 0, '#d8552a', nb);
      k.plane(
        paint('複合式速食', '#2a2019', '#d9b25a', null, 4.5, 0.5, 128),
        4.5,
        0.5,
        w / 2,
        2.85,
        -0.05,
        FRONT,
        { emissive: 0.3 }
      );
      for (let f = 1; f < 4; f++) {
        const y = 3.2 + (f - 1) * 3;
        k.box(0.1, w - 0.1, y, y + 0.1, -1, 0, '#9a9890', nb);
        k.box(0.1, w - 0.1, y + 1.0, y + 1.05, -1, -0.95, '#2a2a2a', nb);
        for (let x = 0.1; x < w; x += 0.3)
          k.box(x, x + 0.025, y + 0.1, y + 1.0, -0.99, -0.96, '#2a2a2a', nb);
        k.plane(ROWT.alWin(), w - 1.2, 1.5, w / 2, y + 1.6, -0.03, FRONT);
        k.box(-0.1, w + 0.1, y + 2.6, y + 2.66, -1.1, 0, '#9fc7a8', nb);
        k.box(0.4, 1.2, y + 0.1, y + 0.6, -0.8, -0.3, MR.ac, nb);
      }
    },
    // 圓形招牌店：深灰褐小磁磚 3 樓，一樓米灰鐵捲門、門邊電表與白色保麗龍箱，捲門上方凸出圓形燈箱（字看不清，不寫字）、西側牆角空白的白色直立燈箱、小綠遮雨棚
    roundShop(k, w, d) {
      k.box(0, w, -0.6, 9.2, 0, d, 'wall#6b5f52', { tile: [0.3, 0.3] });
      k.plane(shutterTex('#a89f8e'), w - 0.8, 2.6, w / 2 + 0.2, 1.3, -0.03, FRONT);
      k.box(0.2, 0.7, 0, 0.6, -0.5, -0.1, '#f2f2f0', nb);
      k.box(w / 2 - 0.05, w / 2 + 0.05, 2.9, 3.6, -0.7, 0, '#55585c', nb);
      for (const sd of [-1, 1])
        k.plane(
          roundSign('', '#f4f4f0', '#c8202a'),
          0.7,
          0.7,
          w / 2 + sd * 0.07,
          3.25,
          -0.7,
          (sd * Math.PI) / 2,
          { transparent: true, emissive: 0.3 }
        );
      k.box(0.05, 0.65, 0, 1.6, -0.35, -0.05, '#f4f4f2', nb);
      k.box(1, w - 0.2, 2.75, 2.85, -0.6, 0, '#5f9a6a', nb);
      for (let f = 1; f < 3; f++) {
        const y = 3.2 + (f - 1) * 3;
        k.plane(YHT.win(), w - 1.0, 1.4, w / 2, y + 1.6, -0.03, FRONT);
        ac(k, 0.2, y + 0.2);
      }
    },
    // 30 號 轉角 4 樓：北立面米白橫紋二丁掛，一樓深灰鐵捲門（上方紅字小橫牌看不清不寫）、門牌 30、轉角斜切的水泥外挑簷；樓上白色凸窗鐵窗與冷氣；
    // 二～三樓一塊向外斜掛的藍底黃邊大看板，黃色大字直排「影印」（上面一行小字看不清不寫）
    no30(k, w, d) {
      k.box(0, w, -0.6, 12.4, 0, d, 'wall#d8d2c0', { tile: [0.6, 0.3] });
      k.box(-0.02, w + 0.02, 12.4, 12.5, -0.04, d, 'gray', nb);
      k.plane(shutterTex('#5a5754'), 4, 2.7, w / 2 + 0.4, 1.35, -0.03, FRONT);
      k.plane(
        paint('30', '#c8202a', '#ffffff', null, 0.3, 0.2, 128),
        0.3,
        0.2,
        0.4,
        2.2,
        -0.04,
        FRONT
      );
      k.box(-0.4, w, 3.4, 3.8, -0.8, 0, '#a9a69e', nb);
      k.box(-0.4, 0, 3.4, 3.8, 0, d, '#a9a69e', nb);
      for (let f = 1; f < 4; f++) {
        const y = 3.4 + (f - 1) * 3;
        k.box(0.5, w - 0.5, y + 0.6, y + 2.4, -0.5, 0, '#f2f2ee', nb);
        k.plane(YHT.win(), w - 1.2, 1.6, w / 2, y + 1.5, -0.52, FRONT);
        ac(k, w - 1.0, y + 0.1, -0.9);
      }
      k.box(0.6, 0.7, 4.0, 9.0, -1.6, -0.2, '#55585c', nb);
      k.plane(
        board('yinyin', 2.5, 4, (g, W, Hh) => {
          fill(g, W, Hh, '#f0a020');
          g.fillStyle = '#2a4fb0';
          g.fillRect(W * 0.06, Hh * 0.04, W * 0.88, Hh * 0.92);
          fitText(g, '影', W / 2, Hh * 0.38, W * 0.7, Hh * 0.3, '#f6d23a');
          fitText(g, '印', W / 2, Hh * 0.72, W * 0.7, Hh * 0.3, '#f6d23a');
        }),
        2.5,
        4,
        0.65,
        6.5,
        -1.6,
        Math.PI / 2,
        { emissive: 0.3, double: true }
      );
    },
    // 30 號的西側牆（沿往南那段巷子）：整面沒有窗的水泥粉光牆，牆腳 2 m 彩色塗鴉
    no30w(k, w, d) {
      k.box(0, w, -0.6, 12.4, 0, d, '#9a958c');
      k.box(-0.02, w + 0.02, 12.4, 12.5, -0.04, d, 'gray', nb);
      k.plane(wallArt(w), w, 2, w / 2, 1.0, -0.02, FRONT);
    },
    // 米白橫紋磁磚 4 樓住家：一樓北半白磁磚牆與電表箱、南半深色鋁框玻璃拉門＋生鏽鐵架撐的灰浪板雨遮；樓上每層兩組白色凸出鐵窗與窗型冷氣
    home4(k, w, d) {
      k.box(0, w, -0.6, 12.2, 0, d, 'wall#d6d0be', { tile: [0.6, 0.3] });
      k.box(-0.02, w + 0.02, 12.2, 12.32, -0.04, d, 'gray', nb);
      k.box(w - 1.4, w - 0.6, 0.8, 1.8, -0.25, 0, '#8a8d90', nb);
      shopGlass(k, 0.3, 3.8, 0, 2.5, darkShop);
      tiltX(k, 0, 4, 2.8, -1.1, 3.0, 0, 0.05, '#9a9c98');
      for (let f = 1; f < 4; f++) {
        const y = 3.2 + (f - 1) * 3;
        for (const x of [1.9, w - 1.9]) {
          k.box(x - 1.3, x + 1.3, y + 0.6, y + 2.4, -0.5, 0, '#f2f2ee', nb);
          k.plane(YHT.win(), 2.4, 1.6, x, y + 1.5, -0.52, FRONT);
        }
        k.box(w / 2 - 0.35, w / 2 + 0.35, y + 0.9, y + 1.4, -0.5, 0, MR.ac, nb);
      }
    },
    // 26 號：白色平滑塗料 4 樓（頂樓是鋁窗加蓋），一樓兩片深灰鐵捲門、門牌 26 與綠色信箱；二樓鐵窗陽台與遮陽板、三樓兩扇直立半圓拱窗
    no26(k, w, d) {
      k.box(0, w, -0.6, 12.2, 0, d, '#e9e6df');
      k.box(-0.02, w + 0.02, 12.2, 12.32, -0.04, d, 'gray', nb);
      k.plane(shutterTex('#5a5754'), 6, 2.7, w / 2, 1.35, -0.03, FRONT);
      k.plane(
        paint('26', '#2a5fc0', '#ffffff', null, 0.3, 0.2, 128),
        0.3,
        0.2,
        0.3,
        2.2,
        -0.04,
        FRONT
      );
      k.box(0.1, 0.45, 1.0, 1.4, -0.25, 0, '#3f8a4c', nb);
      k.box(0.2, w - 0.2, 3.2, 3.3, -0.9, 0, '#9a9890', nb);
      k.plane(YHT.win(), w - 1.2, 1.4, w / 2, 4.6, -0.03, FRONT);
      k.box(0.1, w - 0.1, 5.9, 5.98, -0.7, 0, '#cfcfcb', nb);
      const arch = board('archTall', 0.6, 1.5, (g, W, Hh) => {
        fill(g, W, Hh, '#e9e6df');
        g.fillStyle = '#4a5a64';
        g.beginPath();
        g.moveTo(W * 0.1, Hh);
        g.lineTo(W * 0.1, W * 0.5);
        g.arc(W / 2, W * 0.5, W * 0.4, Math.PI, 0);
        g.lineTo(W * 0.9, Hh);
        g.closePath();
        g.fill();
      });
      for (const x of [2.6, w - 2.6]) k.plane(arch, 0.6, 1.5, x, 7.6, -0.03, FRONT);
      k.plane(ROWT.alWin(), w - 1, 1.6, w / 2, 10.8, -0.03, FRONT);
    },
    // 元氣影印店那棟鐵皮屋（OSM w587179838，名稱照舊）：一樓北半紅磚／水泥、南半紅磚，二樓米色直紋鐵皮、白格方鐵窗與窗型冷氣＋淺綠小雨遮；
    // 北半影印店敞開店面與綠色帆布雨遮、門口彩色價目牌（店名沒拍到不寫）；南半早餐店藍色鐵捲門、灰白條紋帆布雨棚，雨棚下黃橘底橫招只寫看得到的下排「漢堡／三明治／蛋餅／奶茶／咖啡」；
    // 南山牆橘紅牆面上白底深藍字直式招牌「素食」
    yuanqi() {
      const A = [99.6, 279.3],
        B = [103.8, 271],
        q = edgeKit(A, B),
        L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      skin(q, L, 3.2, '#a8452f');
      q.plane(
        board(
          'tinBeige',
          L,
          4,
          (g, W, Hh) => {
            fill(g, W, Hh, '#cfc9a8');
            for (let x = 0; x < W; x += W / 40) {
              g.fillStyle = 'rgba(0,0,0,.12)';
              g.fillRect(x, 0, 2, Hh);
            }
          },
          24
        ),
        L,
        4,
        L / 2,
        5.2,
        -0.32,
        FRONT
      );
      for (const x of [1.5, 4.5, 7.5]) {
        q.plane(YHT.win(), 1.2, 1.1, x, 4.9, -0.34, FRONT);
        q.box(x - 0.6, x + 0.6, 5.5, 5.58, -0.9, -0.3, '#9fc7a8', nb);
      }
      q.plane(openTex, 4.2, 2.8, L - 2.4, 1.4, -0.33, FRONT, { emissive: 0.35 });
      q.box(L - 4.6, L, 2.9, 3.0, -1.5, -0.3, '#3f9a5a', nb);
      q.box(L - 1.2, L - 0.4, 0, 1.6, -1.2, -1.1, '#f4f4f0', nb);
      for (let j = 0; j < 4; j++)
        q.box(
          L - 1.15,
          L - 0.45,
          0.3 + j * 0.32,
          0.55 + j * 0.32,
          -1.21,
          -1.2,
          ['#e8c93a', '#c84a4a', '#4a8fd0', '#4fae5a'][j],
          nb
        );
      q.plane(shutterTex('#2f5fa8'), 4.4, 2.5, 2.6, 1.25, -0.33, FRONT);
      for (let x = 0.3; x < 5; x += 0.4)
        q.box(x, x + 0.2, 3.0, 3.1, -1.3, -0.3, x % 0.8 < 0.4 ? '#6e6a60' : '#d8d4c8', nb);
      q.plane(
        board('breakfast', 4.6, 0.9, (g, W, Hh) => {
          fill(g, W, Hh, '#f5b21e');
          fitText(
            g,
            '漢堡／三明治／蛋餅／奶茶／咖啡',
            W / 2,
            Hh * 0.74,
            W * 0.94,
            Hh * 0.34,
            '#111111',
            800
          );
        }),
        4.6,
        0.9,
        2.6,
        2.75,
        -0.34,
        FRONT,
        { emissive: 0.3 }
      );
      const s = edgeKit([105.3, 281.6], A),
        LS = Math.hypot(A[0] - 105.3, A[1] - 281.6);
      skin(s, LS, 3.2, '#d8552f');
      s.plane(vtex('素食', '#f4f4f2', '#1f2f6a', 0.9, 1.4), 0.9, 1.4, LS / 2, 1.8, -0.33, FRONT, {
        emissive: 0.3,
      });
    },
    // 巷尾施工中的大樓（OSM w587179834，名稱照舊）：2024-08 整棟包著鷹架與藍色防護網，一樓清水混凝土柱梁、淺綠鐵板工地圍籬與綠色鐵管大門、生鏽鋼板防護棚、灰色配電箱。完工外觀不知道，照現況做成興建中
    site708() {
      const A = [90.7, 292.8],
        B = [95.8, 289.7],
        q = edgeKit(A, B),
        L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      q.box(0, L, -0.5, 2, -1.2, -1.1, '#6fae8f');
      q.box(L * 0.55, L * 0.55 + 2.2, 0.1, 1.9, -1.25, -1.2, '#3f8a4c', nb);
      q.box(-0.3, L + 0.3, 3.9, 4.05, -2.3, -0.3, '#7a4a2c', nb);
      for (const x of [0.5, 1.4, 2.3]) q.box(x - 0.4, x + 0.4, 0, 1.4, -1.8, -1.3, '#9a9d9f', nb);
      const net = board(
        'net708',
        6,
        17,
        (g, W, Hh) => {
          g.clearRect(0, 0, W, Hh);
          g.fillStyle = 'rgba(47,98,200,0.75)';
          g.fillRect(0, 0, W, Hh);
          g.strokeStyle = 'rgba(30,60,140,0.95)';
          g.lineWidth = 2;
          for (let y = 0; y < Hh; y += Hh / 9.5) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          for (let x = 0; x < W; x += W / 3.3) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, Hh);
            g.stroke();
          }
        },
        24
      );
      q.plane(net, L, 13, L / 2, 10.6, -0.4, FRONT, { transparent: true, double: true });
    },
    // ======== H 段：環中東路 實踐路口以西（街景 2026-05／2024-07） ========
    // OSM 那排三樓街屋（只改高度）前面掛的招牌：中信房屋（綠底白字）、有巢氏房屋（綠底白字）、EXSHOP（黑底黃字，旁邊直立「極限專賣」）
    hzSignsN(k) {
      const hb = (t, bg, fg, x0, x1) => {
        k.box(x0, x1, 3.3, 4.1, -0.1, 0.25, bg, nb);
        k.plane(
          paint(t, bg, fg, null, x1 - x0 - 0.1, 0.75, 128),
          x1 - x0 - 0.1,
          0.75,
          (x0 + x1) / 2,
          3.7,
          -0.11,
          FRONT,
          { emissive: 0.35 }
        );
      };
      hb('中信房屋', '#2a7a50', '#ffffff', 3.4, 7.8);
      hb('有巢氏房屋', '#1f8a4a', '#ffffff', 8.4, 13.8);
      k.plane(vtex('極限專賣', '#1a1a1a', '#f2d23a', 0.7, 2.6), 0.7, 2.6, 16.0, 6.0, -0.35, FRONT, {
        emissive: 0.3,
      });
    },
    // TOYOTA 環中保修廠：退在停車場後面的白色兩層樓高廠房，山牆朝街（紅色簷帶），正面白底紅字 TOYOTA、右邊「環中保修廠」，一樓整排保修工作間；前面柏油停車場停滿車
    toyota(k, w, d, r) {
      k.box(0, w, -0.8, 7.2, 0, d, '#f0efea');
      gable(k, 0, w, 0, d, 7.2, 9.6, '#c8302a', '#f0efea', 0.4);
      k.box(-0.05, w + 0.05, 7.0, 7.3, -0.45, d, '#c8302a', nb);
      k.plane(
        paint('TOYOTA', '#ffffff', '#c8102e', null, 6, 1.1, 128),
        6,
        1.1,
        w / 2 - 2,
        5.4,
        -0.03,
        FRONT,
        { emissive: 0.2 }
      );
      k.plane(
        paint('環中保修廠', '#ffffff', '#2a2a2a', null, 4, 0.8, 128),
        4,
        0.8,
        w / 2 + 4.5,
        5.4,
        -0.03,
        FRONT,
        { emissive: 0.2 }
      );
      for (let j = 0; j < 4; j++) {
        const x = 1.5 + j * 5;
        k.plane(openTex, 4.0, 3.8, x + 2, 1.9, -0.03, FRONT, { emissive: 0.25 });
      }
      rectG(k, 4, w, -19.8, 0, '#5a5c5e', 0.03);
      for (let j = 0; j < 6; j++)
        car(
          k,
          5 + j * 2.6,
          -9 - (j % 2) * 5,
          ['#f2f2ee', '#2a2d33', '#8a8d90', '#c8302a', '#3a4a6a', '#f2f2ee'][j]
        );
    },
    // 夾子園：一層樓高的大鐵皮棚（夾娃娃機店），簷口整面黃底卡通大招牌、藍字「夾子園」，一樓整面敞開、裡面一排排彩色夾娃娃機
    jiazi(k, w, d) {
      // 本體退後 3 m，前面是整排敞開的騎樓（柱子＋雨遮），簷口整面招牌掛在雨遮前緣
      k.box(0, w, -0.8, 6.6, 3, d, '#c9cdd0');
      k.box(-0.2, w + 0.2, 4.2, 4.45, -1.6, 3, '#e6e4de', nb);
      k.box(-0.2, w + 0.2, 4.45, 6.6, -1.6, -1.35, '#e6e4de', nb);
      k.plane(
        board('jiazi', w, 2.15, (g, W, Hh) => {
          fill(g, W, Hh, '#f6d44a');
          for (let j = 0; j < 9; j++) {
            g.fillStyle = ['#f29ab8', '#8fd0f0', '#fff4c0'][j % 3];
            g.beginPath();
            g.ellipse(
              W * (0.05 + j * 0.11),
              Hh * (0.3 + (j % 2) * 0.35),
              Hh * 0.22,
              Hh * 0.2,
              0,
              0,
              7
            );
            g.fill();
          }
          fitText(g, '夾子園', W * 0.62, Hh * 0.5, W * 0.3, Hh * 0.7, '#1f3f9a');
        }),
        w,
        2.15,
        w / 2,
        5.52,
        -1.62,
        FRONT,
        { emissive: 0.3 }
      );
      for (let x = 0.3; x < w - 0.2; x += 6) k.box(x, x + 0.25, 0, 4.2, -1.45, -1.2, '#d6d4ce'); // 騎樓柱
      // 夾娃娃機：一整排擋在騎樓裡（碰撞照機台外框，#302）
      for (let x = 0.6; x < w - 1; x += 1.25) {
        k.box(
          x,
          x + 1.0,
          0,
          1.9,
          1.4,
          2.5,
          ['#f29ab8', '#8fd0f0', '#f6d44a', '#9ad08a'][Math.floor(x) % 4]
        );
        k.box(x + 0.08, x + 0.92, 0.9, 1.75, 1.35, 1.4, '#dfeef4', nb);
      }
      k.plane(openTex, w - 0.4, 4.0, w / 2, 2.0, 2.97, FRONT, { emissive: 0.25 });
    },
    // ======== I 段：環中東路南側 s 691～887（街景 2024-07） ========
    // IS1 YOKOHAMA 速安輪胎：兩層樓高的鐵皮廠房，簷口黑底白字 YOKOHAMA，一樓整排敞開的保修間；東端屋頂上一座鋼架塔、掛直立的黑色 YOKOHAMA 大看板
    iYokohama() {
      const L = 9.9,
        q = iFace(WI0, 691.3, 701.2);
      skin(q, L, 6.8, '#d8d8d4');
      corr(q, '#c9cbcc', 0, L, 5.4, 6.8, -0.31);
      q.box(0, L, 4.1, 5.4, -0.55, -0.3, '#1a1a1a', nb);
      q.plane(
        paint('YOKOHAMA', '#1a1a1a', '#ffffff', null, 5.2, 0.9, 128),
        5.2,
        0.9,
        4.2,
        4.75,
        -0.57,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      q.plane(
        paint('速安', '#ffffff', '#c8102e', null, 1.6, 0.8, 128),
        1.6,
        0.8,
        8.4,
        4.75,
        -0.57,
        FRONT,
        { emissive: 0.3 }
      );
      q.plane(openTex, L - 0.6, 3.6, L / 2, 1.8, -0.33, FRONT, { emissive: 0.25 });
      for (const x of [0.15, 4.9, L - 0.35]) q.box(x, x + 0.2, 0, 4.1, -0.5, -0.3, '#9a9c9c', nb);
      iTruss(q, L - 2.2, L - 0.4, 6.8, 16, 1.5);
      q.plane(
        board('yokoV', 1.6, 7.5, (g, W, Hh) => {
          fill(g, W, Hh, '#1a1a1a');
          g.save();
          g.translate(W / 2, Hh / 2);
          g.rotate(Math.PI / 2);
          fitText(g, 'YOKOHAMA', 0, 0, Hh * 0.9, W * 0.55, '#ffffff');
          g.restore();
        }),
        1.6,
        7.5,
        L - 1.3,
        12.4,
        1.3,
        FRONT,
        { emissive: 0.3 }
      );
    },
    // IS2 永義傢俱 蕾瑞思名床：一樓玻璃店面上方整面橘紅大招牌（Luxuriate. 蕾瑞思名床，下面紅底「永義傢俱」），屋頂上一座空的鋼架看板框
    iLuxur() {
      const L = 13.3,
        q = iFace(WI, 701.2, 714.5);
      skin(q, L, 6.0, '#bdbfbf');
      q.plane(
        board('luxur', 12.6, 2.9, (g, W, Hh) => {
          fill(g, W, Hh, '#e2602c');
          g.fillStyle = '#c8262a';
          g.fillRect(0, Hh * 0.66, W, Hh * 0.34);
          fitText(g, 'Luxuriate.', W * 0.55, Hh * 0.17, W * 0.3, Hh * 0.2, '#fff4d8', 700);
          fitText(g, '蕾瑞思名床', W * 0.55, Hh * 0.44, W * 0.55, Hh * 0.32, '#fff4d8');
          fitText(g, '永義傢俱', W * 0.55, Hh * 0.83, W * 0.4, Hh * 0.26, '#fff4d8');
          g.fillStyle = '#d8d8d0';
          g.fillRect(W * 0.03, Hh * 0.12, W * 0.14, Hh * 0.45);
        }),
        12.6,
        2.9,
        L / 2,
        4.35,
        -0.36,
        FRONT,
        { emissive: 0.3 }
      );
      q.plane(openTex, L - 0.6, 2.9, L / 2, 1.45, -0.33, FRONT, { emissive: 0.25 });
      for (let x = 0.5; x < L; x += 3.1) {
        q.box(x - 0.06, x + 0.06, 6.0, 9.4, 0.4, 0.52, '#5a5d60', nb);
        q.box(x - 0.06, x + 0.06, 6.0, 9.4, 1.6, 1.72, '#5a5d60', nb);
      }
      for (const y of [7.2, 9.3]) q.box(0.4, L - 0.4, y, y + 0.1, 0.4, 0.52, '#5a5d60', nb);
    },
    // IS3 灰色鐵皮店（拉下鐵捲門），門口立著藍色直立招牌（字看不清）
    iShedG() {
      const L = 10,
        q = iFace(WI, 714.5, 724.5);
      skin(q, L, 6.4, '#a4a6a4');
      corr(q, '#a4a6a4', 0, L, 3.6, 6.4, -0.31);
      q.box(0, L, 3.4, 3.6, -1.0, -0.3, '#8a8c8c', nb);
      q.plane(shutterTex('#6a6c6e'), 4.4, 3.3, 2.6, 1.65, -0.33, FRONT);
      q.plane(shutterTex('#6a6c6e'), 4.4, 3.3, 7.4, 1.65, -0.33, FRONT);
      q.box(0.3, 1.0, 0, 5.4, -0.9, -0.75, '#1f4fa8', nb);
    },
    // IS4 BRIDGESTONE 輪胎行：山牆朝街的鐵皮屋，簷下深灰簷板白字 BRIDGESTONE，下面一條白底紅字 BRIDGESTONE（右端紅底白 B），一樓敞開
    iBstone() {
      const L = 12,
        q = iFace(WI, 724.5, 736.5);
      skin(q, L, 5.6, '#d8d8d4');
      gable(q, 0, L, -0.35, 2.5, 5.6, 7.4, '#8a8d90', '#d8d8d4', 0.15);
      q.box(0, L, 4.4, 5.6, -0.6, -0.3, '#3a3d42', nb);
      q.plane(
        paint('BRIDGESTONE', '#3a3d42', '#ffffff', null, 6, 0.8, 128),
        6,
        0.8,
        L / 2,
        5.0,
        -0.62,
        FRONT,
        { emissive: 0.3 }
      );
      q.plane(
        paint('BRIDGESTONE', '#ffffff', '#c8102e', null, 7, 0.65, 128),
        7,
        0.65,
        L / 2 + 0.5,
        3.75,
        -0.34,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      q.plane(
        paint('B', '#c8102e', '#ffffff', null, 0.65, 0.65, 128),
        0.65,
        0.65,
        1.2,
        3.75,
        -0.34,
        FRONT,
        { emissive: 0.3 }
      );
      q.plane(openTex, L - 0.6, 3.3, L / 2, 1.65, -0.33, FRONT, { emissive: 0.25 });
      for (const x of [0.15, 6, L - 0.35]) q.box(x, x + 0.2, 0, 3.4, -0.5, -0.3, '#9a9c9c', nb);
    },
    // IS5 新萬和汽車：矮一點的鐵皮屋，簷下藍底白字招牌，西端一支藍色直立招牌
    iWanhe() {
      const L = 8.5,
        q = iFace(WI, 736.5, 745);
      skin(q, L, 5.0, '#cfd0cc');
      corr(q, '#bfc1bf', 0, L, 3.8, 5.0, -0.31);
      q.plane(
        paint('新萬和汽車', '#1f4fa8', '#ffffff', null, 5, 0.7, 128),
        5,
        0.7,
        L / 2,
        3.3,
        -0.34,
        FRONT,
        { emissive: 0.3 }
      );
      q.plane(openTex, L - 0.6, 2.9, L / 2, 1.45, -0.33, FRONT, { emissive: 0.25 });
      q.plane(vtex('新萬和汽車', '#1f4fa8', '#ffffff', 0.8, 3.8), 0.8, 3.8, 0.6, 5.4, -1.0, FRONT, {
        emissive: 0.3,
      });
      q.box(0.55, 0.65, 0, 3.5, -1.05, -0.95, '#8a8d90', nb);
    },
    // IS6 米色鐵皮小店：黃色招牌（字看不清）、鐵捲門半開
    iTin() {
      const L = 6,
        q = iFace(WI, 745, 751);
      skin(q, L, 4.6, '#e0d8c4');
      corr(q, '#d4ccb6', 0, L, 3.6, 4.6, -0.31);
      q.box(0.3, L - 0.3, 2.9, 3.6, -0.45, -0.3, '#f2c83a', nb);
      q.plane(shutterTex('#8a8c8c'), L - 1, 1.6, L / 2, 2.1, -0.33, FRONT);
      q.plane(openTex, L - 1, 1.3, L / 2, 0.65, -0.33, FRONT, { emissive: 0.25 });
    },
    // IS7 停車場入口：紅色斜屋頂的雨棚通道，旁邊黃底「P 月租‧臨停」牌；屋頂上一座斜立的大看板鋼架（看板背面朝街，字看不清）
    iPgate() {
      const L = 11,
        q = iFace(WI, 751, 762);
      skin(q, L, 4.2, '#cfcfca');
      q.plane(openTex, 6.4, 3.6, 4.4, 1.8, -0.33, FRONT, { emissive: 0.15 });
      tiltX(q, 0.6, 8.4, 4.2, -2.2, 5.2, 1.0, 0.12, '#b8352c');
      for (const x of [0.8, 8.2]) q.box(x - 0.08, x + 0.08, 0, 4.2, -2.1, -1.95, '#8a8d90', nb);
      q.plane(
        board('pgate', 1.9, 1.5, (g, W, Hh) => {
          fill(g, W, Hh, '#f6d02a');
          fitText(g, 'P', W * 0.2, Hh * 0.45, W * 0.3, Hh * 0.7, '#1f3f9a');
          fitText(g, '月租', W * 0.65, Hh * 0.3, W * 0.6, Hh * 0.3, '#c8262a');
          fitText(g, '臨停', W * 0.65, Hh * 0.68, W * 0.6, Hh * 0.3, '#c8262a');
        }),
        1.9,
        1.5,
        9.6,
        2.6,
        -1.2,
        FRONT,
        { emissive: 0.3 }
      );
      q.box(9.55, 9.65, 0, 1.85, -1.25, -1.15, '#5a5d60', nb);
      corr(q, '#c9c7b4', 8.5, L, 0, 4.2, -0.31);
      iTruss(q, 1.5, 9, 4.2, 9.5, 2.5);
      q.box(0.8, 9.7, 8.4, 13.2, 2.3, 2.5, '#2a3550', nb);
    },
    // IS8 歐美傢俱系統設計：兩層樓高的鐵皮大賣場，上半灰色浪板，簷口白底黑字橫招牌（下面一行 OM FURNITURE INTERIOR DESIGN），一樓整面玻璃；
    // 門口掛紅底白字「結束營業」「全面出清」直幅布條
    iOm() {
      const L = 31.4,
        q = iFace(WI, 762, 793.4);
      skin(q, L, 7.4, '#e6e6e2');
      corr(q, '#c4c6c6', 0, L, 5.6, 7.4, -0.31);
      q.plane(
        board('omFurn', 24, 2.0, (g, W, Hh) => {
          fill(g, W, Hh, '#f2f2ee');
          fitText(g, '歐美傢俱系統設計', W * 0.5, Hh * 0.33, W * 0.6, Hh * 0.48, '#2a2a2c');
          fitText(
            g,
            'OM FURNITURE INTERIOR DESIGN',
            W * 0.5,
            Hh * 0.78,
            W * 0.55,
            Hh * 0.28,
            '#2a2a2c',
            700
          );
        }),
        24,
        2.0,
        13,
        4.5,
        -0.36,
        FRONT,
        { emissive: 0.25 }
      );
      q.box(0, L, 3.3, 3.45, -1.1, -0.3, '#d8d8d2', nb);
      q.plane(openTex, L - 0.8, 3.2, L / 2, 1.6, -0.33, FRONT, { emissive: 0.3 });
      for (let x = 3; x < L - 2; x += 4.6) q.box(x, x + 0.5, 0, 3.3, -0.45, -0.3, '#6a9a5a', nb);
      q.plane(vtex('結束營業', '#d8262a', '#ffffff', 1.1, 4.6), 1.1, 4.6, 22.6, 3.6, -0.6, FRONT, {
        emissive: 0.3,
      });
      q.plane(vtex('全面出清', '#d8262a', '#ffffff', 1.1, 4.6), 1.1, 4.6, 23.8, 3.6, -0.6, FRONT, {
        emissive: 0.3,
      });
      q.plane(vtex('全面出清', '#d8262a', '#ffffff', 1.4, 3.6), 1.4, 3.6, 29.6, 2.4, -0.6, FRONT, {
        emissive: 0.3,
      });
    },
    // IS9 床墊店：三層樓高的藍灰色鐵皮屋，二樓一排窗，一樓上方藍底招牌「5尺床頭箱＋5尺3分合板床底＋5尺經典獨立筒床墊 NT$4,999」
    iBed() {
      const L = 9.1,
        q = iFace(WI, 793.4, 802.5);
      skin(q, L, 10.2, '#9eabc2');
      corr(q, '#9eabc2', 0, L, 5.6, 10.2, -0.31);
      q.box(0, L, 7, 10.2, -0.3, 9, '#9eabc2');
      q.box(0.6, L - 0.6, 6.4, 8.0, -0.36, -0.3, '#3a4a5e', nb);
      for (let x = 1.4; x < L - 0.8; x += 1.6)
        q.box(x, x + 0.06, 6.4, 8.0, -0.4, -0.36, '#d8d8d2', nb);
      q.plane(
        board('bed5', 8.6, 1.9, (g, W, Hh) => {
          const gr = g.createLinearGradient(0, 0, 0, Hh);
          gr.addColorStop(0, '#4a8ad8');
          gr.addColorStop(1, '#1f5fb0');
          g.fillStyle = gr;
          g.fillRect(0, 0, W, Hh);
          fitText(
            g,
            '5尺床頭箱＋5尺3分合板床底',
            W * 0.38,
            Hh * 0.2,
            W * 0.7,
            Hh * 0.24,
            '#ffffff'
          );
          fitText(g, '＋5尺經典獨立筒床墊', W * 0.38, Hh * 0.48, W * 0.7, Hh * 0.24, '#ffffff');
          fitText(g, 'NT$4,999', W * 0.38, Hh * 0.8, W * 0.4, Hh * 0.3, '#f6d02a');
          g.fillStyle = '#e8eef4';
          g.fillRect(W * 0.78, Hh * 0.15, W * 0.18, Hh * 0.7);
        }),
        8.6,
        1.9,
        L / 2,
        4.4,
        -0.36,
        FRONT,
        { emissive: 0.3 }
      );
      q.plane(openTex, L - 0.6, 3.4, L / 2, 1.7, -0.33, FRONT, { emissive: 0.3 });
    },
    // IS10 西端：矮的車棚（鐵皮頂、裡面停車）和一間兩樓高的小屋
    iTail() {
      const L = 10.8,
        q = iFace(WI, 802.5, 813.3);
      skin(q, L, 3.8, '#c9c7b4');
      q.plane(openTex, 5.4, 2.9, 3.2, 1.45, -0.33, FRONT, { emissive: 0.15 });
      tiltX(q, 0.3, 6.2, 3.3, -1.6, 3.8, 0, 0.1, '#8a8d90');
      q.box(7, L - 0.2, 0, 6.2, -0.3, -0.1, '#d6d0c0');
      q.plane(shutterTex('#4a6a9a'), 3, 2.6, 8.7, 1.3, -0.33, FRONT);
      q.box(7.4, L - 0.6, 4.2, 5.2, -0.36, -0.3, '#4a5560', nb);
    },
    // IS11 OSM w1457393689：兩層樓高的車行。東半灰色鐵皮、三扇鐵捲門；西半紅白簷帶、一樓敞開，門口一支紅色直立招牌（字看不清）
    iShidai() {
      const L = 37.1,
        q = iFace(WJ, 814.2, 851.3);
      skin(q, L, 6.3, '#c6c8c8');
      corr(q, '#b4b6b6', 22, L, 3.6, 6.3, -0.31);
      for (const x of [24.6, 29.2, 33.8])
        q.plane(shutterTex('#7a7c7e'), 4, 3.3, x, 1.65, -0.33, FRONT);
      q.box(0, 21.6, 4.6, 5.6, -0.6, -0.3, '#f2f2ee', nb);
      q.box(0, 21.6, 4.35, 4.6, -0.6, -0.3, '#c8262a', nb);
      q.plane(openTex, 20.6, 3.8, 10.8, 1.9, -0.33, FRONT, { emissive: 0.25 });
      q.box(1.5, 2.4, 0, 8.4, -1.4, -1.2, '#c8262a', nb);
    },
    // I 段西端：空地停車場（柏油、停滿車），後面是雜草空地
    // A0 小象汽車（新中北路口東南角，街景 2024-08）：沿兩條路是柏油露天車場、矮緣石，停兩排中古車；路口轉角一支高柱招牌
    // （上段灰褐底白字「花田盛事／築夢莊園／120公尺右轉」，下段橘紅底「TCBU 認證聯盟／政府立案／公會保證」）；
    // 東側兩層白色車行，一樓藍色門楣、北面藍色車棚，屋頂鋼架上大看板（SAVE 認證／小象汽車 (03)453-5088／5525 認證保固）；
    // 新中北路邊藍色立牌「高價收購／免費估價」；車場後面一排樹。
    // 車排、車行跟新中北路平行，另開一個朝正北的 Kit（K，原點在車行西北角 (600, 118)，+x 東、+z 南）；轉角招牌與環中東路那邊的
    // 緣石用這一格自己的 Kit（立面對著環中東路），世界座標用 k.l() 換成區域座標
    xiaoxiang(k, w, d, r) {
      const K = vcKit(new Kit(I, 600, 118, 0));
      kits.push(K);
      const ASP = '#5c5e60',
        KERB = '#b9b6ae';
      // 柏油車場：新中北路人行道外緣（z 111.8）到樹前（z 127），西邊到環中東路人行道外緣
      drape(K, [-22.5, -6.2], [0, -6.2], [0, 9], [-26, 9], ASP, 0.04);
      drape(K, [-33.4, 3], [-22.5, -6.2], [-26, 9], [-26, 9], ASP, 0.04);
      K.box(-22.5, 0, 0, 0.22, -6.3, -6.05, KERB, nb); // 新中北路邊的矮緣石
      {
        const [xa, za] = k.l(577.5, 111.8),
          [xb] = k.l(566.6, 121.0);
        k.box(Math.min(xa, xb), Math.max(xa, xb), 0, 0.22, za - 0.12, za + 0.12, KERB, nb); // 環中東路邊
      }
      // 兩排中古車（車頭朝路）
      const cc = [
        '#f2f2ee',
        '#2a2d33',
        '#8a8d90',
        '#b02a2a',
        '#3a4a6a',
        '#e8e8e4',
        '#5a5c60',
        '#c9c9c4',
      ];
      for (let j = 0; j < 8; j++) K.car(-21 + j * 2.6, -3.4, Math.PI, cc[j % 8]);
      for (let j = 0; j < 10; j++) K.car(-29 + j * 2.7, 3.2, 0, cc[(j + 3) % 8]);
      // 車行：兩層白樓，11.5 × 13
      const y0 = gy(K, 5, 6),
        top = y0 + 7.0;
      K.box(0, 11.5, y0 - 0.5, top, 0, 13, '#e8e8e4');
      K.box(-0.05, 11.55, top, top + 0.6, -0.05, 13.05, '#dcdcd8', nb); // 女兒牆
      // 西面（對著車場）：一樓深色玻璃門窗＋藍色門楣，二樓三扇窗
      K.box(-0.06, 0, y0, y0 + 2.8, 1.5, 11.5, '#2a3440', nb);
      K.box(-0.25, 0, y0 + 2.85, y0 + 3.7, 0, 13, '#2f5fa8', nb);
      for (const z of [2, 5.5, 9]) K.box(-0.05, 0, y0 + 4.4, y0 + 5.9, z, z + 2.2, '#3a4652', nb);
      // 北面（新中北路）：二樓窗、冷氣；前面藍色車棚
      for (const x of [1.5, 5, 8.5]) K.box(x, x + 2, y0 + 4.4, y0 + 5.9, -0.05, 0, '#3a4652', nb);
      for (const x of [3.6, 7.1]) K.box(x, x + 0.8, y0 + 4.0, y0 + 4.55, -0.5, 0, '#d8d8d4', nb);
      K.box(-4, 11.5, y0 + 3.3, y0 + 3.45, -5, 0, '#2f5fa8', nb);
      for (const [x, z] of [
        [-3.8, -4.8],
        [11.2, -4.8],
      ])
        K.box(x, x + 0.15, y0, y0 + 3.3, z, z + 0.15, '#8a8d90', nb);
      // 屋頂鋼架大看板（朝西，對著環中東路口）
      const bw = 10,
        bh = 4.6,
        by = top + 0.8;
      for (const z of [1, 5.5, 10.5]) K.box(0.9, 1.1, top, by + bh, z, z + 0.2, '#4a4d50', nb);
      for (const z of [1, 10.5]) K.box(4.5, 4.7, top, by + bh - 1, z, z + 0.2, '#4a4d50', nb);
      const bill = board('xiaoxiangBill', bw, bh, (g, W, Hh) => {
        fill(g, W, Hh, '#1f4fa8');
        g.fillStyle = '#f4f4f2';
        g.fillRect(0, 0, W, Hh * 0.3);
        g.fillStyle = '#e8a81e';
        g.fillRect(W * 0.02, Hh * 0.04, W * 0.12, Hh * 0.22);
        fitText(g, 'SAVE', W * 0.08, Hh * 0.15, W * 0.1, Hh * 0.12, '#1a1a1a');
        fitText(g, '小象汽車', W * 0.5, Hh * 0.12, W * 0.6, Hh * 0.2, '#1f4fa8');
        fitText(g, '(03)453-5088', W * 0.5, Hh * 0.255, W * 0.4, Hh * 0.07, '#1a1a1a', 700);
        fitText(g, '5525認證保固', W * 0.5, Hh * 0.47, W * 0.9, Hh * 0.22, '#ffffff');
        fitText(g, 'SAVE認證 好車保證!', W * 0.62, Hh * 0.75, W * 0.65, Hh * 0.13, '#ffe24a');
        g.fillStyle = '#c9a070';
        g.beginPath();
        g.arc(W * 0.14, Hh * 0.78, Hh * 0.14, 0, Math.PI * 2);
        g.fill(); // 小熊吉祥物（只畫色塊）
      });
      K.box(0.6, 0.9, by, by + bh, 0.5, 0.5 + bw, '#d8d8d4', nb);
      K.plane(bill, bw, bh, 0.58, by + bh / 2, 0.5 + bw / 2, -Math.PI / 2, { emissive: 0.25 });
      // 新中北路邊藍色立牌
      {
        const yb = gy(K, -16.5, -5.2);
        for (const z of [-5.6, -4.6]) K.box(-16.5, -16.4, yb, yb + 2.6, z, z + 0.08, '#8a8d90', nb);
        const t = board('xiaoxiangStand', 1.1, 2.0, (g, W, Hh) => {
          fill(g, W, Hh, '#2f6fc8');
          ['高價收購', '免費估價'].forEach((txt, i) =>
            txt
              .split('')
              .forEach((ch, j) =>
                fitText(
                  g,
                  ch,
                  W * (0.72 - i * 0.44),
                  Hh * (0.14 + j * 0.24),
                  W * 0.4,
                  Hh * 0.2,
                  '#ffffff'
                )
              )
          );
        });
        K.box(-16.45, -16.4, yb + 0.6, yb + 2.6, -5.6, -4.5, '#2f6fc8', nb);
        K.plane(t, 1.1, 2.0, -16.48, yb + 1.6, -5.05, -Math.PI / 2);
        K.plane(t, 1.1, 2.0, -16.37, yb + 1.6, -5.05, Math.PI / 2);
      }
      // 路口高柱招牌（世界座標 (573.6, 115.4)，招牌面對著環中東路口）
      {
        const [px, pz] = k.l(573.6, 115.4),
          yp = gy(k, px, pz);
        k.box(px - 0.12, px + 0.12, yp - 0.3, yp + 9.2, pz - 0.12, pz + 0.12, '#5a5c60');
        const up = board('xiaoxiangPylonA', 1.6, 3.6, (g, W, Hh) => {
          fill(g, W, Hh, '#6e6560');
          '花田盛事'
            .split('')
            .forEach((ch, j) =>
              fitText(g, ch, W * 0.62, Hh * (0.12 + j * 0.19), W * 0.6, Hh * 0.17, '#f4f4f2')
            );
          '築夢莊園'
            .split('')
            .forEach((ch, j) =>
              fitText(g, ch, W * 0.2, Hh * (0.14 + j * 0.13), W * 0.3, Hh * 0.11, '#f4f4f2', 700)
            );
          g.fillStyle = '#1e2a4a';
          g.fillRect(0, Hh * 0.9, W, Hh * 0.1);
          fitText(g, '120公尺右轉', W * 0.5, Hh * 0.95, W * 0.9, Hh * 0.07, '#ffffff', 700);
        });
        const lo = board('xiaoxiangPylonB', 1.6, 3.2, (g, W, Hh) => {
          fill(g, W, Hh, '#d85a2a');
          g.fillStyle = '#f4f4f2';
          g.fillRect(W * 0.06, Hh * 0.04, W * 0.88, Hh * 0.26);
          fitText(g, 'TCBU', W * 0.5, Hh * 0.13, W * 0.8, Hh * 0.14, '#1f3f8a');
          fitText(g, '認證聯盟', W * 0.5, Hh * 0.25, W * 0.8, Hh * 0.07, '#1a1a1a', 700);
          ['政府立案', '公會保證'].forEach((txt, i) =>
            txt
              .split('')
              .forEach((ch, j) =>
                fitText(
                  g,
                  ch,
                  W * (0.28 + i * 0.44),
                  Hh * (0.4 + j * 0.16),
                  W * 0.4,
                  Hh * 0.14,
                  '#ffffff'
                )
              )
          );
        });
        for (const [tex, y, h] of [
          [up, 5.4, 3.6],
          [lo, 2.1, 3.2],
        ]) {
          k.box(px - 0.8, px + 0.8, yp + y, yp + y + h, pz - 0.1, pz + 0.1, '#d8d8d4', nb);
          k.plane(tex, 1.6, h, px, yp + y + h / 2, pz - 0.11, FRONT, { emissive: 0.2 });
          k.plane(tex, 1.6, h, px, yp + y + h / 2, pz + 0.11, 0, { emissive: 0.2 });
        }
      }
      // 車場後面一排樹
      for (const [x, z, h, s] of [
        [-30, 9.5, 5, 2.8],
        [-24, 11, 6, 3.2],
        [-17, 10.5, 5.5, 3],
        [-10, 11.5, 6.5, 3.4],
        [-3.5, 10.5, 5, 2.6],
      ])
        tree(K, x, z, h, s, r, gy(K, x, z));
    },
    lotI(k, w, d) {
      rectG(k, 0, w, 0, 14, '#5c5e60', 0.03);
      rectG(k, 0, w, 14, d, '#7a8a5a', 0.02);
      const cc = ['#f2f2ee', '#2a2d33', '#8a8d90', '#c8302a', '#3a4a6a', '#f2f2ee', '#5a5c60'];
      for (let j = 0; j < 11; j++) car(k, 1.2 + j * 3, 2.4, cc[j % 7]);
      for (let j = 0; j < 6; j++) car(k, 4 + j * 4.6, 9.4, cc[(j + 3) % 7]);
    },
  };

  const exposed = (L, lo) =>
    !HZ_ST.lots.some(
      (M) =>
        M !== L &&
        M[0] === L[0] &&
        M[3] === L[3] &&
        (lo ? Math.abs(M[2] - L[1]) < 1.2 : Math.abs(M[1] - L[2]) < 1.2)
    ); // 這一側有沒有鄰居
  HZ_ST.lots.forEach((L, i) => {
    const sp = L[4],
      { ox, oz, ang, w, apron } = hzLotFrame(L),
      r = lcg(6000 + i * 7);
    const ex0 = L[3] > 0 ? exposed(L, true) : exposed(L, false),
      ex1 = L[3] > 0 ? exposed(L, false) : exposed(L, true);
    const k = vcKit(new Kit(I, ox, oz, ang));
    kits.push(k);
    const set = sp.set || SET[L[0]];
    if (sp.own) {
      OWN[sp.own](k, w, sp.d || 10, r, sp, i);
      street(k, w, apron, set, sp, r);
      return;
    }
    const win2 = (x, y, ww, h, gr = true) =>
      r() < 0.2
        ? k.plane(litWin(gr), ww, h, x, y, -0.02, FRONT, { emissive: 0.5 })
        : win(k, x, y, ww, h, gr); // 兩成的窗亮著燈
    const nf = sp.nf || 4,
      fh = sp.fh || 3.0,
      gf = sp.gf || (nf === 1 ? 3.2 : 3.3),
      top = gf + (nf - 1) * fh,
      d = sp.d || 10;
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
          ROWT.vert(`hz${text}${bg}`, bg, fg, text),
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
      k.box(0.3, w - 0.3, top + 0.12, top + 0.12 + th, back, d - 0.5, tw);
      for (let f = 0; f < tn; f++) {
        const y = top + 0.12 + f * 3.0;
        k.box(0.3, w - 0.3, y + 0.05, y + 0.2, back - 1.0, back, T.balc || '#6a6070', {
          col: false,
        });
        win2(w / 2, y + 1.7, w - 1.6, 1.4, false);
        if (r() < 0.5) ac(k, 0.8 + r() * (w - 3), y + 0.3, back - 0.5);
      }
    }
    // 後牆與沒有鄰居的側牆開窗，頂樓隨機加水塔／頂樓加蓋，從高處或巷口看才不會是一整面素牆
    if (nf > 1) {
      for (let f = 0; f < nf; f++) {
        const y = f === 0 ? 0.3 : gf + (f - 1) * fh + 0.3,
          n = w > 7 ? 3 : w > 4 ? 2 : 1;
        for (let j = 0; j < n; j++)
          k.plane(YHT.win(), 1.5, 1.1, (w * (j + 0.5)) / n, y + 1.1, d + 0.03, 0);
        for (const [x, rot, ex] of [
          [-0.03, -Math.PI / 2, ex0],
          [w + 0.03, Math.PI / 2, ex1],
        ])
          if (ex)
            for (const zc of [d * 0.3, d * 0.7]) k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, zc, rot);
      }
    }
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
    street(k, w, apron, set, sp, r);
  });
  finishRow(scene, kits);
  hzUncollide(data, collision);
}
