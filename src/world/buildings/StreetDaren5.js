// 大仁五街兩側（中北路口到大仁街／大仁四街口）：照 Google 街景 2024-08（路口 2026-05）、國土測繪 2024 正射建模，只做外觀，不能進入。
// 這條街不是一棟棟透天，而是幾棟長條集合住宅（一樓一間間店面）加上幾棟較矮的房子，所以一棟量體一個 Kit，
// 一樓店面寫在各棟的 units：[s0, s1, spec]。
//   s = 沿 D5_ROAD 從中北路口量起的公尺數；side +1 = 西南側（中北路那一側，往東南走的右手邊），−1 = 東北側（大仁街／校園側）
//   set = 立面離道路中心線的距離；每棟的區域座標原點在立面線上，+x 沿立面（side −1 時朝 s 變小的方向，立面才對著街），+z 離開街道
//   spec：g 'shop' 玻璃店面｜'shutter' 鐵捲門｜'gate' 梯間／大樓出入口｜'open' 挑空｜'wall' 實牆、sign [字, 底, 字色, 小字]、sh 鐵捲門色、
//   awn 雨棚 #hex 或 [色1, 色2] 條紋、vert [字, 底, 字色] 直立側招、round [字, 底, 字色] 圓形側招、banner [字, 底, 字色] 布條、low 一樓外牆色、
//   z 一樓退縮（公尺）、blank 招牌箱底色（看不清店名的只留空白招牌，不編店名）
//   NE1 加的選配欄位（不寫就沒有作用）：signH 招牌高、lint 鐵捲門上緣到招牌之間留的牆高、sd 招牌上緣比一樓頂低多少（負的 = 往上蓋到二樓女兒牆）、so 招牌版面 { px 字高比例, ax/ay 字的位置 0～1, sx/sy/spx 小字, stripes 右端直條色, blobs [[色, cx, cy, rx, ry]] 圖案色塊 }、
//   split [從左邊算起的比例, 寬, 色] 鐵捲門中間的牆柱、shFront 有 low 時把鐵捲門畫在牆板前面、graffiti 鐵捲門彩繪、side [字, 底, 字色] 招牌高度的凸出方形側招（sideL 改掛左邊）、
//   vlow [字, 底, 字色] 招牌高度的直立側招、plaque [字, 底, 字色, 寬] 門邊的直式小牌、win [寬, y0, y1, 鐵窗色]（g 'wall' 用的橫窗）；
//   量體：set1 = s1 那一端的 set（立面不平行道路時用）、props [[s, off, 沿街長, 深, y0, y1, 色, 上面灌木球半徑]] 路邊的箱形小物、plain 素面水泥牆（不貼磚紋）、gf（plainBlock 的一樓高，預設 3.3）、topBand 頂樓油漆色、sideWall 東南側牆色、
//   terraceWall 二樓露台女兒牆色、terrace2 { par 女兒牆高, top 加蓋頂高, wy 窗中心高, wh 窗高 }（都從一樓頂算起）、stairCol 梯間牆色、bayCol 三樓凸窗玻璃色、endBays [各開間比例] 西北端（最後一個梯間到山牆）的開間
//   （SW1 加的）g 'hatch' 實牆加圓舷窗與艙門｜'wood' 木門小店（door、win = 門與小窗在這間裡的位置 0～1）、gf 這一間自己的一樓高、signH 招牌高、oh 開口高、
//   art 招牌圖樣（ART 表的名字，蓋在 sign 上）、vertR [字, 底, 字色, 字寬, 底部高度] 掛在 s 大那一端的直立側招、
//   piers 柱與門楣的顏色（木質門框）、discs [[字, 底, 字色, 位置 0～1, 中心高度, 直徑, 外凸, 朝向（省略 = 垂直牆面）]] 圓形側招、acs [[位置 0～1, 高度]] 冷氣室外機、barrels 門口鐵桶數
//   NE2 加的：wallSign [字, 底, 字色, 小字, 高, 離一樓頂, 起點 s] 貼在二樓牆上的大橫招、hang [字, 底, 字色] 二樓牆上垂直掛的方形燈箱、annex [色, 高] 店面上方的二樓增建、
//   half 鐵捲門半開露出下面的玻璃門（框色）、plate 空白招牌箱上再貼一塊小白板、lobby 開放式門廳（內牆色）、acs2 二樓牆上的冷氣室外機台數或 [台數, 起點 x]、awnSlope 雨棚做成斜的（靠牆那側高出幾公尺）；disc 第 4～6 個值是直徑、離一樓頂的高度、橫向偏移
//   （SW2 加的欄位）signH 招牌帶高度、awnY／awnOut 雨棚高度與外伸、noTile 梯間柱不貼粉紅磁磚、door 素面門的顏色、doorAt 門中心（離本間起點）、
//   bare 門口不隨機放盆栽機車、inner 挑空內牆色、cones 三角錐數量、
//   add [{ x: [a, b] 離本間起點, y 底高, h 高, out 外凸, z 離立面線往內, bg 底色, t 字／v 直排字, fg, sub, fg2 第二行字色, sh 鐵捲門色 }] 額外的招牌箱、色塊、鐵捲門片
//   （SW 審查加的，不寫就沒有作用）add 的 perp: true = 垂直立面往外凸的雙面側招（x 是厚度、out 是外凸長度）、pier 這一間的分戶柱色、window: [y0, y1] 實牆落地窗的高度範圍、
//   discs 第 9 個值 true = 不畫連到牆上的橫桿（立在桿子上的圓招）；量體：bayPlain [開間編號] 這幾個開間樓上沒有鐵窗（白磁磚牆、兩扇窗加窗型冷氣）、band2Segs 第 4 個值 = 加蓋帶頂高（從一樓頂算起，預設 2.2）、endWins [離立面線的深度] 塔樓 s 大那一端山牆上每層的窗
//   （第二輪加的，不寫就沒有作用）量體：face [每個開間一個字串，s 由小到大，不含梯間；每個字 = 一層樓，從三樓往上] 樓上各戶的型式：
//     o 開放陽台｜n 開放陽台加綠色雨遮｜w 白鐵窗籠｜g 綠鐵窗籠加雨遮｜a 白色拱形花格｜b 綠玻璃凸窗｜r 弧形陽台｜d 深色鋁框凸窗｜x 白鋁窗封起來｜f 貼牆的白色直條鐵窗（沒寫到的才退回隨機）
//     terraceSegs [[s0, s1, 'alu' 封鋁窗加雨遮｜'grille' 綠鐵花窗加採光罩｜'open' 開放露台]]、bays [[s0, s1, 'cage'｜'strip' 窄牆小窗｜'plain'｜'white' 白磁磚加米色直條鐵窗]]（walkup 的鐵窗開間）、
//     roofWall 屋頂加蓋的牆色、bayWin [s0, s1] 裙樓二樓外凸的鋁窗、shelter 第 4 個值 'light' = 輕鋼架加透明浪板
//     kind 'decal' = 貼在別的檔案的量體牆上的招牌（不佔地、不進保留範圍）：signs [{ s: [a, b], y, h, art }]；kind 'oldBack' = 兩層老屋背面
//     （獨立審查加的）face 的 A = 深灰色拱形花格、terraceSegs 第 4 個值 = 鐵花窗顏色、darkCol 深色凸窗的框色（寫了就加一片雨遮色的斜頂）、endSign [圖樣, 寬, 高, 底高, 離立面線] 貼在 s1 那一端山牆上的大招牌
//   店面：slant 招牌做成上緣靠牆、下緣往外斜的帆布（外伸公尺）、annex 第 3 個值 = 各扇窗的位置、hang 第 4～5 個值 = 寬、高、hangArt／wallArt 吊牌與二樓橫招的圖樣、
//     add 的 at + ang：一塊斜掛的箱型側招（at 中心離本間起點、w 寬、ang 與立面的夾角，0 = 平行立面、π/2 = 垂直）
//   （第三輪東北側加的，不寫就沒有作用）量體：glassBay face 的 b（凸窗）畫成外凸的透明格子玻璃（不是不透明綠盒子）、terraceSegs 型式 'glass' = 三樓玻璃凸窗往下包到二樓露台、
//     arcBal [外凸深度, 色] face 的 r 改畫成淺弧形貼磚女兒牆陽台（不寫照舊是半圓柱）、podWins [[s0, s1, 'dark' 深色鐵窗籠｜'alu' 整排外凸鋁窗, 框色]] 裙樓二樓窗照段指定（範圍內不畫預設的白格柵窗）、
//     sideWins [離立面線深度…] plainBlock 在 s0 那一端（西北）側牆上每層的鐵窗小窗、duct [中心離立面線深度, 管寬] 貼著同一面側牆、從屋頂直通地面的粗灰色風管；
//   店面：awnText [字, 字色] 印在雨棚前緣垂邊的字、bannerBox [寬, 高, 中心高度] 布條尺寸（不寫照舊）、art 'ipet' 骨頭 I 的 I PeT 招牌
//   （西南側第三輪加的，不寫就沒有作用）店面：room 玻璃裡的室內貼圖（ROOM 表的名字，餐廳用，取代雜貨貨架）、astro [中心離本間起點, 寬, 高] g 'hatch' 的太空人改成貼牆的平板立牌、
//     hood 'hatch' 招牌下那片雨遮的顏色、roll [色1, 色2, 外伸, 下垂, 捲軸高] 捲收式條紋帆布雨棚（斜面布加前緣波浪垂邊）；
//     量體：band2Segs 型式 'alu' 小口磚牆上的白鋁框連續窗帶、arcs 第 5～6 個值 = 前緣比靠牆處低多少、靠牆處高度（圓弧採光罩，附白色骨架）
// 這個檔案不 import src/world/Interiors.js；Kit、材質、貼圖工具由 src/world/zones/Zones.js 呼叫 buildDaren5Street 時從 X 傳進來，
// Zones.js 另外 import D5_ST.drop、D5_ST.ownSign 與 d5Footprints() 來刪填充樓、保留空地。中北路口臨中北路的店面在 StreetZhongbei.js，這裡不重做。

export const D5_ROAD = [
  [-271, 108.1],
  [-256.1, 132.4],
  [-155, 240.2],
];
const HALF = 2.5; // 路寬 5 m（data/cycu.json）
export function d5At(s) {
  const R = D5_ROAD;
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
// 路上 s 處、往 side 那一側橫移 off 公尺的點
const d5P = (s, off, side) => {
  const m = d5At(s);
  return [m.x - m.uz * side * off, m.z + m.ux * side * off];
};
// 一棟的區域座標：立面線兩端 → 原點、角度、寬度；X(s) 把 s 換成區域 x
export function d5Frame({ s0, s1, side, set, set1 }) {
  const a = d5P(s0, set, side),
    b = d5P(s1, set1 ?? set, side),
    o = side > 0 ? a : b,
    e = side > 0 ? b : a;
  return {
    ox: o[0],
    oz: o[1],
    ang: Math.atan2(e[1] - o[1], e[0] - o[0]),
    w: Math.hypot(e[0] - o[0], e[1] - o[1]),
    apron: set - HALF,
  };
}

const G = '#3d6f60'; // 東北側梯間入口的墨綠弧形雨棚
const W = '#e8e6e0'; // 西南側梯間入口的白色半圓雨遮
export const D5_ST = {
  // 街屋自己掛招牌的 POI，地圖不再另外掛
  ownSign: [
    'CU部隊鍋&BBQ',
    '月出販賣部',
    '秋吉便當',
    'PAPAFUN趴趴樂',
    '美生美專業影印店',
    '原萬名',
    '妞妞雲泰美食',
    '慕森MuSen',
    '洗鞋達人',
    '御鼎牛排創意料理',
    '拾參咖啡館',
    '豪秋吐司',
    '繆思美睫',
    'SU DAK 大口韓食',
    'クルクル捲捲小物商店',
    '寶寶屋韓式料理',
    '樂野和風洋食屋',
    'MY HAIR STUDIO',
    '嬌都',
    '熊豆花',
    'GACHA player 扭蛋玩家',
    '這是你的Chill box',
    '美國熊ＥＳＨＯＰ',
  ],
  // 讓給自建量體的填充樓
  drop: [
    'f1180',
    'f1181',
    'f1182',
    'f1183',
    'f1184',
    'f1185',
    'f1186',
    'f1187',
    'f1188',
    'f1189',
    'f1190',
    'f1191',
    'f1192',
    'f1193',
    'f1194',
    'f1195',
    'f1196',
    'f1529',
    'f1530',
    'f1531',
    'f1532',
    'f1533',
    'f1534',
    'f1535',
    'f1536',
    'f1537',
    'f1538',
    'f1539',
    'f1540',
    'f1541',
    'f1560',
    'f1561',
    'f1562',
  ],
  blocks: [
    // ================= 東北側（side −1）=================
    // 中北路轉角屋面向大仁五街的側牆（量體在 StreetZhongbei.js 的 s57.4～60.4 那一格，這裡只在它的側牆外面貼招牌，不重做量體）：
    // 黃底大帆布「大展駕訓班／原場地考照／學生優惠」（電話不放）、上方藍白「環球當舖」橫招、牆腳紅色公告牌；路邊橘框凸面鏡
    {
      id: 'neCornerSign',
      kind: 'decal',
      s0: 7.1,
      s1: 12.85,
      side: -1,
      set: 4.1,
      set1: 3.0,
      d: 0.05, // 那面牆實測離中心線 4.22（s7.1）～3.13（s12.85），招牌貼在牆外 0.12
      signs: [
        { s: [7.5, 12.5], y: 1.15, h: 2.6, art: 'dazhan' },
        { s: [8.9, 12.7], y: 3.95, h: 1.25, art: 'pawn' },
        { s: [11.9, 12.4], y: 0.12, h: 0.95, bg: '#c8281e' },
      ], // 獨立審查：整組比原本低 1 m（街景車鏡頭高度落在帆布中間偏下，帆布下緣約在腰部）,
      mirror: [12.3, 2.85],
    },
    // 兩層老屋的背面（實景在 s14～21、離中心線約 9 m；遊戲裡中北路那幾格的後牆到 s≈17.7，所以這裡只補 s17.9～23 這一段）：
    // 髒灰水泥牆、右半多一層加蓋（窗下一條紅磚色瓦片小雨庇）、一排冷氣室外機、後門上的深灰鐵皮雨遮、前院灰色鐵板矮圍籬加白色小方磚矮牆；s14 路邊一支附路燈的水泥電線桿
    {
      id: 'neBack',
      kind: 'oldBack',
      s0: 17.9,
      s1: 23,
      side: -1,
      set: 9,
      d: 8,
      wall: '#8a8578',
      props: [
        [19.2, 5.3, 5.6, 0.12, 0, 1.05, '#8f9396'],
        [22.5, 5.3, 1.0, 0.3, 0, 1.0, '#e6e4de'],
        [16.2, 5.3, 0.4, 0.3, 0, 1.1, '#e6e4de'],
        [14, 4.6, 0.34, 0.34, 0, 9, '#8f8d86'],
        [14, 4.6, 1.5, 0.1, 8.2, 8.3, '#6a6a66'],
        [14, 3.9, 0.12, 1.3, 7.4, 7.5, '#8a8d90'],
        [14, 3.3, 0.3, 0.5, 7.3, 7.42, '#d8d8d0'],
      ],
    },
    // 中北路口後方那棟水泥樓（三層，每層約 3.5 m，屋頂再加一層綠色鐵皮；沒貼磚的清水泥牆，頂樓與東南側牆刷灰紫色油漆）：西角（粗落水管那個角）由 s20.5、s41.5 兩個街景點交會定位，
    // 立面比哈佛林的店面線退後約 4 m；前院是白磚花台、灌木與兩棵大樹
    {
      id: 'neOld',
      kind: 'plainBlock',
      s0: 24.6,
      s1: 34.3,
      side: -1,
      set: 11.7,
      set1: 12.27,
      d: 9,
      nf: 4,
      gf: 3.6,
      plain: true,
      wall: '#8d897e',
      topBand: '#9291a0',
      sideWall: '#8f8e9c',
      sideWins: [3.2, 6.6],
      duct: [0.5, 0.6],
      roofCol: '#4a4c50',
      roofWall: '#a9cdb0',
      trees: [
        [27.95, 3.36],
        [32.8, 3.08],
      ],
      units: [[24.6, 34.3, { g: 'wall' }]],
      props: [
        [26.6, 4.6, 6.4, 3.0, 0, 0.5, '#d9d6cf'],
        [26.6, 4.6, 6.0, 2.6, 0.5, 1.0, '#2f5f33'],
        [30.5, 9.0, 2.4, 3.2, 0, 2.5, '#8f8e9c'],
        [30.5, 9.0, 2.7, 3.5, 2.5, 2.62, '#6f6e7a'],
        [30.5, 7.37, 0.9, 0.06, 1.1, 1.9, '#3a4046'], // neOld 與管理室之間的灰紫色小棚子（一扇小窗）
        [28, 3.0, 0.34, 0.34, 0, 9, '#8f8d86'],
        [28, 3.0, 1.5, 0.1, 8.2, 8.3, '#6a6a66'],
        [28, 3.25, 0.5, 0.4, 6.4, 6.9, '#9a9a94'],
      ], // s28 水泥電線桿：橫擔、灰色廣播喇叭
    },
    // 42 號哈佛林A區管理中心：粉白小方磚一層小屋，深灰仿瓦雨遮；蓋在哈佛林A區西北端店面的前面（擋住 40 號最左邊那扇窄鐵捲門）。
    // 左邊一扇直條鐵窗的大窗、右邊一扇門，中間掛藍底白字直式小牌；小屋前靠路邊有一台白色加水站
    {
      id: 'neHut',
      kind: 'hut',
      s0: 31.8,
      s1: 36.4,
      side: -1,
      set: 5.9,
      d: 1.7,
      wall: '#eadcd6',
      low: '#9aa89a',
      roofCol: '#4a4c50',
      props: [
        [34.3, 3.35, 1.0, 0.7, 0, 1.95, '#eeeeea'],
        [34.3, 3.25, 1.3, 1.0, 1.95, 2.03, '#f6f6f4'],
      ],
      units: [
        [31.8, 35.15, { g: 'wall', win: [1.9, 1.05, 2.3, '#6f7478'] }],
        [35.15, 36.4, { g: 'gate', plaque: ['哈佛林A區管理中心', '#1f3fa0', '#ffffff', 0.17] }],
      ],
    },
    // 哈佛林A區：十層長條大樓（粉米色小口磚、磚褐色陽台女兒牆、墨綠雨遮），一樓與二樓露台女兒牆是灰綠小方磚，二樓是退縮露台加蓋，三樓以上再退 2.2 m。
    // 一樓每個梯間之間是「窄、寬、窄」三間店面（寬的 40、34、28、22 號是主鐵捲門加一扇窄門）；花台在窄寬交界前面，梯間前面不放
    {
      id: 'neA',
      kind: 'tower',
      s0: 34.5,
      s1: 100.7,
      side: -1,
      set: 8.3,
      d: 15,
      nf: 10,
      gf: 4.4,
      back: 2.2,
      wall: '#d6bfb3',
      base: '#6e7672',
      parapet: '#b39486',
      canopy: '#3f7a66',
      bayCol: '#6fa593',
      glassBay: true,
      arcBal: [0.9, '#c9ab9e'],
      band2: 'terrace',
      terraceWall: '#6e7672',
      terrace2: { par: 0.45, top: 1.8, wy: 1.05, wh: 1.1 },
      stairCol: 'wall#d2bdb2',
      endBays: [0.42, 0.58],
      // 樓上各戶（2024-08 街景逐開間看的）：40、38 號上方｜36、34、32｜30、28、26｜24、22、20｜尾端兩間
      face: [
        'aaoooooo',
        'xadxdoow',
        'owbdwood',
        'brgoooob',
        'Axowgogw',
        'Aoxooggo',
        'brooooob',
        'xwdoooox',
        'wxboxogg',
        'brooooob',
        'adoxowgw',
        'adowdoob',
        'aoowoooo',
      ],
      terraceSegs: [
        [34.5, 43.0, 'alu'],
        [43.0, 43.9, 'grille'],
        [46, 49.95, 'alu'],
        [49.95, 55.25, 'glass'],
        [55.25, 55.6, 'open'],
        [55.6, 59.3, 'grille', '#c9a85a'],
        [61.3, 65.8, 'grille', '#5a5a58'],
        [65.8, 71, 'open'],
        [71, 75, 'grille'],
        [77.2, 81.1, 'alu'],
        [81.1, 86.4, 'glass'],
        [86.4, 86.7, 'open'],
        [86.7, 90, 'grille', '#c9a85a'],
      ],
      stairs: [44.9, 60.3, 76.1, 91.4],
      paving: '#c9a898',
      pavBand: '#9a9a96',
      planters: {
        off: 3.6,
        len: 2.4,
        dep: 1.4,
        tile: '#d8cfc8',
        at: [39.5, 49.9, 55.4, 65.7, 71, 80.8, 86.3],
      },
      props: [
        [58.8, 3.7, 0.5, 0.5, 0, 0.6, '#e9e7e0', 0.55],
        [61.5, 3.7, 0.5, 0.5, 0, 0.6, '#e9e7e0', 0.55],
        [89.2, 3.9, 0.6, 0.6, 0, 0.6, '#e9e7e0', 0.8],
        [64.5, 3.0, 0.34, 0.34, 0, 9, '#8f8d86'],
        [95.6, 3.9, 3.4, 1.6, 0, 0.7, '#d8c4bc', 0.7],
        [99.3, 4.4, 2.6, 2.4, 0, 0.7, '#d8c4bc', 0.9],
      ], // s64.5 水泥電線桿；尾端廣場上兩座粉色方磚高花台
      units: [
        [
          34.5,
          39.9,
          {
            g: 'shutter',
            signH: 1.6,
            lint: 0.5,
            sd: -0.3,
            sign: ['部隊鍋&BBQ', '#9a9893', '#2a2826'],
            art: 'budae',
            sh: '#a7a49c',
            split: [0.38, 0.7, '#e4e2dc'],
          },
        ],
        [
          39.9,
          43.8,
          {
            g: 'shutter',
            signH: 1.3,
            lint: 0.5,
            sign: ['九日序', '#f2f2f0', '#1a1a1a', 'NINE DAY'],
            so: { px: 0.5, ax: 0.42, sx: 0.74, sy: 0.7, spx: 0.11 },
            side: ['', '#f4f4f2', '#1a1a1a'],
            sh: '#d8ceb8',
          },
        ],
        [43.8, 46, { g: 'gate', awn: G }],
        [
          46,
          49.9,
          {
            g: 'shutter',
            signH: 1.3,
            lint: 0.5,
            sign: ['I PeT', '#f4f2ee', '#1a1a1a'],
            art: 'ipet',
            awn: ['#efe9dc', '#efe9dc', '#c8322c', '#efe9dc', '#efe9dc', '#3f8a4a'],
            awnSlope: 0.5,
            side: ['●', '#f6f6f4', '#1f2f6a'],
            sideL: true,
            sh: '#bfc2c4',
          },
        ],
        [
          49.9,
          55.3,
          {
            g: 'shutter',
            signH: 1.3,
            lint: 0.5,
            sd: -0.2,
            sign: ['YUDING STEAK', '#f1efec', '#1a1a1a', 'CREATIVE CUISINE'],
            art: 'yuding',
            awn: '#4a3a3a',
            side: ['YUDING STEAK', '#1a1a1a', '#ffffff'],
            sh: '#a8a49c',
            low: '#ecebe6',
            shFront: true,
            split: [0.72, 0.25, '#ecebe6'],
          },
        ],
        [
          55.3,
          59.2,
          {
            g: 'shutter',
            signH: 1.2,
            lint: 0.4,
            sd: 0.3,
            sign: ['NUMBEAR 13 CAFÉ', '#f5f5f5', '#333333'],
            so: { px: 0.11, ax: 0.78, ay: 0.82 },
            sh: '#b9b6ae',
            low: '#f0efec',
            shFront: true,
          },
        ],
        [
          59.2,
          61.4,
          {
            g: 'gate',
            awn: G,
            add: [
              {
                x: [0.14, 0.26],
                perp: true,
                y: 3.3,
                h: 0.8,
                out: 1.6,
                bg: '#3a2a20',
                fg: '#d8b45a',
                t: '豪秋吐司',
              },
            ],
          },
        ],
        [
          61.4,
          65.8,
          {
            g: 'shop',
            signH: 1.9,
            sd: -0.2,
            sign: ['I MEAT it.', '#4a4a4c', '#ffffff'],
            art: 'imeat',
            slant: 0.75,
            frame: '#1c1c1e',
          },
        ],
        [
          65.8,
          71,
          {
            g: 'shutter',
            signH: 1.9,
            sd: -0.15,
            sign: ['洗鞋達人', '#1f2330', '#ffffff'],
            art: 'shoe',
            slant: 0.75,
            vlow: ['洗鞋達人', '#1a1a1a', '#ffffff'],
            sh: '#c9a23f',
            graffiti: true,
          },
        ],
        [
          71,
          75,
          {
            g: 'shutter',
            signH: 1.5,
            lint: 0.2,
            sd: 0.1,
            sign: ['MUSE EYELASH SALON', '#e9e6e0', '#7a7a7a'],
            art: 'muse',
            slant: 0.6,
            banner: ['出售', '#d6282b', '#ffffff'],
            bannerBox: [1.6, 0.9, 1.7],
            side: ['', '#f4f4f2', '#1a1a1a'],
            sh: '#c9c6be',
          },
        ],
        [75, 77.2, { g: 'gate', awn: G }],
        [
          77.2,
          80.9,
          {
            g: 'shutter',
            signH: 0.9,
            lint: 0.35,
            sd: 0.75,
            sign: ['SU닭', '#cfcdc8', '#7a5a48', 'SUDAK 春川辣炒雞 韓式火鍋烤肉'],
            awn: '#d8c8ae',
            awnText: ['白飯／麥茶／咖啡／韓式小菜無限享用', '#5a3a2a'],
            sh: '#4a4a4c',
          },
        ],
        [
          80.9,
          86.7,
          {
            g: 'shutter',
            signH: 0.9,
            lint: 0.35,
            sd: 0.75,
            sign: ['捲捲商店', '#f3f1ee', '#1a1a1a'],
            so: { px: 0.22, ax: 0.84 },
            sh: '#c9c6be',
            low: '#efede6',
            shFront: true,
            split: [0.75, 0.25, '#efede6'],
          },
        ],
        [
          86.7,
          90,
          {
            g: 'shutter',
            signH: 0.8,
            lint: 0.35,
            sd: 0.75,
            noband: true,
            sh: '#d8ceb8',
            side: ['Aiwoer\n髮妝', '#8e2f78', '#ffffff'],
          },
        ],
        [90, 92.8, { g: 'gate', awn: G }],
        [
          92.8,
          96.8,
          {
            g: 'shop',
            sign: ['胖先生麵包坊', '#f6f6f2', '#1b1b2a'],
            slant: 0.6,
            banner: ['中秋月餅預購中', '#d6282b', '#ffffff'],
            frame: '#3a2c26',
            annex: ['#f6f4ee', 2.4, [0.5]],
          },
        ],
        [
          96.8,
          100.7,
          {
            g: 'shop',
            sign: ['快洗可得', '#1f3f9a', '#ffffff', '24H 全自動洗衣 Coin Laundry'],
            awn: ['#3b7fc4', '#f2f2f0'],
            frame: '#e9e9e6',
            vertR: ['手作烘焙', '#f4f4f4', '#1b1b2a', 0.42, 3.2],
            annex: ['#f6f4ee', 2.4, [0.55]],
          },
        ],
      ],
    },
    // 第二棟長條大樓：一、二樓是淺灰白小口磚裙樓（一樓 3.3 m，上面先一段實牆、再一排連續橫窗，瓦片小屋簷頂約 7.4 m），
    // 三樓以上粉米色塔樓再退 0.7 m、數到六排窗；東南端 s145.3～148 一樓是地下車道
    // 獨立審查改正：裙樓立面離中心線 5.5 m（原調查把街景 fov 當水平視角，距離多算了 1/3；正射圖上裙樓前緣也在 5 m 上下），比哈佛林A區的店面線凸出 2.8 m；
    // 塔樓西北角由 s72.5、s92.3 兩個街景點交會在離中心線約 6.2 m、頂約 27 m；s101.4 路緣有一支水泥電線桿（下段黃色警示）
    // 一樓頂約 3.3 m、裙樓屋簷約 7.4 m（原 3.7／8.8 也是照多算的距離換的）；塔樓東南端蓋到車道上方（s163 往回看山牆角在 s≈148.6），不是只到 s145
    {
      id: 'neB',
      kind: 'tower',
      s0: 100.7,
      s1: 149,
      side: -1,
      set: 5.5,
      d: 15,
      nf: 8,
      gf: 3.3,
      y2: 7.2,
      glassBay: true,
      arcBal: [0.85, '#e4e0d8'],
      // 裙樓二樓窗（第三輪照街景）：MY HAIR、ZAZA、門廳上方是深色鐵窗籠；PINK CAKE 以東到車道上方是一整排外凸鋁窗（古銅色框）
      podWins: [
        [100.9, 108.7, 'dark'],
        [122.9, 148.5, 'alu', '#6e5644'],
      ],
      // 樓上各戶：這一棟不像哈佛林那麼規則，照街景大致排（由西北到東南 9 個開間，三樓到八樓）
      face: [
        'faooow',
        'xrddoo',
        'boowdo',
        'frodbo',
        'oooddb',
        'oooowo',
        'wrowog',
        'wowodo',
        'oooooo',
      ],
      top: 26.9,
      back: 0.7,
      wall: '#d9c2b6',
      base: '#cfcec8',
      parapet: '#b89a8c',
      canopy: '#3f7a66',
      band2: 'podium',
      towerS1: 148.8,
      eaveCol: '#6e5a50',
      stairs: [107.9, 124.15, 138.65],
      paving: '#b5a69b',
      pots: { off: 3.2, every: 5.6, from: 103, to: 138, palm: true },
      props: [
        [101.4, 3.0, 0.34, 0.34, 0, 9, '#8f8d86'],
        [101.4, 3.0, 0.36, 0.36, 0, 1.3, '#c9a82a'],
      ],
      units: [
        [
          100.7,
          105.3,
          {
            g: 'shutter',
            signH: 0.6,
            sign: ['MY HAIR STUDIO', '#1c1c1c', '#f2f2f2'],
            sh: '#a39e93',
            half: '#1c1c1e',
            add: [
              {
                at: 4.0,
                y: 3.5,
                h: 1.9,
                w: 1.3,
                out: 0.95,
                ang: 1.15,
                bg: '#1c1c1c',
                fg: '#e8e8e8',
                t: 'MY HAIR\nSTUDIO',
              },
            ],
          },
        ],
        [
          105.3,
          106.9,
          {
            g: 'shutter',
            signH: 0.6,
            sign: ['ZAZA', '#efefec', '#1c1c1c'],
            sh: '#a39e93',
            low: '#efefec',
          },
        ],
        [106.9, 108.9, { g: 'gate', lobby: '#7f8c98' }],
        [
          108.9,
          115.8,
          {
            g: 'shutter',
            signH: 0.75,
            blank: '#c8262c',
            plate: '#f6f4ee',
            sh: '#c9a23f',
            frame: '#c8262c',
            add: [{ x: [1.8, 4.55], y: 2.65, h: 0.43, out: 0.35, bg: '#f6f4ee', art: 'ning' }],
          },
        ],
        [
          115.8,
          120.4,
          {
            g: 'shutter',
            signH: 0.7,
            blank: '#c9363a',
            add: [
              {
                x: [4.3, 4.42],
                perp: true,
                y: 4.0,
                h: 1.0,
                out: 1.3,
                bg: '#c8303a',
                fg: '#ffffff',
                t: '窩咖啡\nCOFFEE ROASTER\n自家烘焙',
              },
            ],
            sh: '#9d978b',
          },
        ],
        [
          120.4,
          122.7,
          {
            g: 'shutter',
            signH: 0.7,
            sign: ['LIZ', '#efefec', '#1c1c1c'],
            sh: '#9d978b',
            low: '#efefec',
            add: [
              {
                x: [1.1, 1.22],
                perp: true,
                y: 3.0,
                h: 0.9,
                out: 1.3,
                bg: '#f4f4f4',
                fg: '#1c1c1c',
                t: 'LIZ',
              },
            ],
          },
        ],
        [122.7, 125.6, { g: 'gate' }],
        [
          125.6,
          131.6,
          {
            g: 'shop',
            signH: 0.6,
            blank: '#26282c',
            frame: '#3a2a22',
            discs: [['PINK CAKE', '#fbf3f4', '#a8323c', 0.8, 4.1, 2.1, 1.35]],
            acs2: [1, 5.0],
          },
        ],
        [
          131.6,
          137.7,
          {
            g: 'shutter',
            signH: 0.6,
            blank: '#f1efec',
            wallSign: ['Spotlight', '#f1efec', '#4a2f2a', null, 1.4, 0.12],
            wallArt: 'spotlight',
            hang: ['', '#f1efec', '#1c1c1c', 1.5, 1.5],
            hangArt: 'butterfly',
            sh: '#c9b890',
          },
        ], // 白底大橫招從鐵捲門上緣蓋到二樓窗台（一樓頂那條凸緣以下用同色空白招牌帶接起來）；左上白色蝴蝶圖吊牌（只有圖，不寫字）
        [137.7, 139.6, { g: 'gate', lobby: '#7f8c98', acs2: 2 }],
        [
          139.6,
          145.3,
          {
            g: 'shop',
            noband: true,
            signH: 0.3,
            awn: '#7a6258',
            awnY: 2.9,
            awnSlope: 0.6,
            add: [
              {
                at: 5.3,
                y: 0.9,
                h: 1.9,
                w: 1.2,
                out: 1.9,
                ang: 1.0,
                bg: '#1f2a52',
                fg: '#e9a08c',
                t: 'CHILL\nBOX',
              },
            ],
            frame: '#6a4a32',
            steps: 5,
          },
        ],
        [145.3, 148, { g: 'ramp' }],
        [148, 149, { g: 'wall', low: '#8a97a0' }],
      ],
    },
    // 轉角五層公寓：土黃方磚、深灰石材橫帶、白色不鏽鋼欄杆陽台；s159.6 之後人行道上有灰色鐵架雨棚；立面離中心線 6.7 m（獨立審查改正，原 8.5 同樣多算 1/3）
    {
      id: 'neC',
      kind: 'walkup',
      s0: 150.4,
      s1: 168,
      side: -1,
      set: 6.7,
      d: 13.3,
      nf: 5,
      gf: 3.6,
      wall: '#dcc096',
      base: '#dcc096',
      trim: '#8a8884',
      bal: 'stone',
      panel: '#b09a8c',
      gapPave: [1.4, '#a3a19b'],
      paving: '#b5574a',
      pavIn: ['#dcd8d0', 2.3, '#5a5a5c'],
      shelter: [159.6, 168, 3.75, 'light'],
      roofShed: '#3f8f72',
      endSign: ['gachapara', 6.5, 1.5, 4.3, 0.6], // 「瘋狂扭蛋樂園」大招牌在朝大仁四街口那一面（東南山牆）的雨棚上方，不在大仁五街這一面（獨立審查改正）
      units: [
        [
          150.4,
          154.1,
          { g: 'shutter', noband: true, sh: '#c8b98f', awn: '#e9e2cf', awnSlope: 0.6 },
        ],
        [
          154.1,
          157.5,
          { g: 'shutter', noband: true, sh: '#c8b98f', awn: '#e9e2cf', awnSlope: 0.6 },
        ],
        [
          157.5,
          161.5,
          {
            g: 'gate',
            signH: 0.8,
            add: [
              {
                x: [3.74, 3.86],
                perp: true,
                y: 2.6,
                h: 1.2,
                out: 1.5,
                bg: '#c9414f',
                fg: '#ffffff',
                t: '美國熊',
              },
            ],
          },
        ], // 門廳左柱一樓頂高度的紅色方形燈箱（不是掛在二樓的直招）
        [161.5, 164.4, { g: 'shop', noband: true, frame: '#4a3526' }],
        [164.4, 168, { g: 'shop', noband: true, frame: '#4a3526' }],
      ],
    },
    // ================= 西南側（side +1）=================
    // 中北路口後方三層舊樓的長側牆：一樓整面深藍星空圖輸出（酒吧），二樓淺灰面板，三樓裸露混凝土
    //   bar：{ door, box, wins, panel } = 小門、二樓外凸方形燈箱的 s、二樓直立深色玻璃窗的 [s0, s1]、二樓面板色
    {
      id: 'swBar',
      kind: 'plainBlock',
      s0: 14.2,
      s1: 25.5,
      side: 1,
      set: 3.5,
      d: 9,
      nf: 3,
      wall: '#7d7466',
      low: '#141c4a',
      bar: {
        door: 22.3,
        box: 22.1,
        wins: [
          [23.2, 24.8],
          [21.9, 22.8],
          [19.2, 20.8],
          [14.4, 15.6],
        ],
        panel: '#b9bcc2',
      },
      units: [[14.2, 25.5, { g: 'wall' }]],
    },
    // 綠牆小店（看不到店名）：橄欖綠牆、深色木門加木框小窗，上半灰白浪板牆與生鏽浪板斜雨遮；後面接白色舊屋
    {
      id: 'swGreen',
      kind: 'shed',
      s0: 25.5,
      s1: 29.6,
      side: 1,
      set: 3.6,
      d: 6,
      gf: 2.75,
      top: 4.0,
      wall: '#7c8a52',
      base: '#7c8a52',
      upper: '#c9c9c4',
      roofCol: '#8f7f70',
      eave: 0.8,
      rear: { z: 2.6, h: 9, wall: '#e2e0da' },
      units: [[25.5, 29.6, { g: 'wood', noband: true, door: 0.77, win: 0.46, frame: '#3a2a20' }]],
    },
    // 原萬名（門牌 57）：一層鐵皮店面，整面淺灰鐵捲門，上面 1.5 m 高的白底大招牌（紅色麵碗、三個深紅方塊字）
    {
      id: 'swWan',
      kind: 'shed',
      s0: 29.6,
      s1: 34.4,
      side: 1,
      set: 4,
      d: 8,
      gf: 4.5,
      wall: '#d6d6d8',
      base: '#c9cdd0',
      roofCol: '#b7bcbf',
      rear: { z: 3, h: 9, wall: '#e2e0da' },
      units: [
        [
          29.6,
          34.4,
          {
            g: 'shutter',
            sign: ['原萬名', '#f1f1f3', '#9c1f2e'],
            art: 'wan',
            signH: 1.5,
            oh: 2.95,
            sh: '#d6d6d8',
            paint: ['原萬名', '#2a2a2c'],
            discs: [['', '#f4f4f4', '#9c1f2e', 1.0, 4.45, 0.85, 0.6]],
          },
        ],
      ],
    },
    // 九層長條大樓（淺灰白小口磚，一樓挑高約 4.5 m）：二樓整排加蓋帶，band2Segs = [s0, s1, 型式]：
    //   lattice 貼齊牆面的米色花格磚｜win 外凸鋁窗加綠色雨遮｜cage 外凸灰色鐵格柵籠加綠浪板｜white 白框玻璃採光罩｜
    //   alu（第三輪）小口磚牆上一整排微凸的白鋁框窗加淺色水平雨遮（嘉霏、樂野上方，照評論相片）
    {
      id: 'swA',
      kind: 'tower',
      s0: 34.8,
      s1: 99.8,
      side: 1,
      set: 9.3,
      d: 12.5,
      nf: 9,
      gf: 4.75,
      back: 0,
      wall: '#b8b5ad',
      base: '#c9c6be',
      parapet: '#9c9a93',
      canopy: '#7fa08f',
      bayCol: '#6f9a8c',
      darkCol: '#aeb3b4',
      // 一樓高 4.75（街景量招牌上緣約 4.6～5.0）；樓上各戶：秋吉、PAPAFUN 上方｜美生美、月出、妞妞｜慕森、小巷43、KINDFOOD｜Nazo、寶寶屋、空白招牌｜嘉霏、樂野（三樓到九樓）
      face: [
        'ofofooo',
        'dgoxbbg',
        'dodxooo',
        'browwob',
        'woowooo',
        'wowgooo',
        'brooobo',
        'dogwowo',
        'ddgwwgo',
        'brofoob',
        'odgdwoo',
        'dooooog',
        'xoofoon',
      ],
      band2: 'cage',
      band2Glass: 99.8,
      apron2: { gutter: '#5a5a58' },
      endWins: [2.2, 5.5],
      band2Segs: [
        [34.8, 43.5, 'lattice'],
        [43.5, 53.3, 'win'],
        [53.3, 75.5, 'cage'],
        [75.5, 83.2, 'win'],
        [83.2, 92.1, 'white'],
        [92.1, 99.8, 'alu'],
      ],
      stairs: [44.55, 59.75, 75.85, 91.0],
      paving: '#d9d6cf',
      pavAlt: ['#c6a37a', 72, 80],
      planters: {
        off: 3.7,
        len: 4,
        dep: 1.5,
        tile: '#bdbab2',
        at: [38.5, 44.8, 51.1, 57.4, 63.7, 70, 76.3, 82.6, 88.9, 95.2],
        bollards: true,
        trees: [1],
      },
      units: [
        [
          34.8,
          39.5,
          {
            g: 'shop',
            sign: ['秋吉 便當專賣', '#f2efe8', '#b3202a'],
            art: 'chiuji',
            oh: 2.8,
            awn: '#4a4a4c',
            frame: '#3a3a3e',
            room: 'qiuji',
          },
        ],
        [
          39.5,
          43.5,
          {
            g: 'hatch',
            sign: ['PA PA FUN', '#1c1c1e', '#f08aa8'],
            art: 'papafun',
            signH: 0.95,
            oh: 3.0,
            low: '#f1eee8',
            hood: '#c4c7c9',
            astro: [3.2, 1.5, 2.3],
          },
        ],
        [43.5, 45.6, { g: 'gate', awn: W }],
        [
          45.6,
          49.6,
          {
            g: 'shop',
            sign: ['美生美專業影印店', '#17707a', '#ffffff'],
            signH: 0.9,
            oh: 2.8,
            add: [
              {
                at: 3.75,
                y: 4.5,
                h: 1.7,
                w: 0.75,
                out: 0.75,
                ang: 1.0,
                bg: '#17707a',
                fg: '#ffffff',
                v: '美生美複印',
              },
            ],
            awn: '#c9b27a',
            frame: '#a8824f',
          },
        ],
        [
          49.6,
          55.2,
          {
            g: 'shutter',
            sign: ['月出販賣部', '#f3ece6', '#1f2238', 'MOONRISE CONCEPT STORE'],
            art: 'moon',
            signH: 1.0,
            oh: 2.8,
            awn: '#4a4a4c',
            sh: '#7a6a5a',
            barrels: 4,
          },
        ],
        [
          55.2,
          58.7,
          {
            g: 'shutter',
            sign: ['妞妞 雲泰美食', '#e02a2a', '#ffe14a'],
            art: 'niu',
            signH: 1.5,
            oh: 2.8,
            add: [
              {
                at: 3.3,
                y: 2.95,
                h: 1.3,
                w: 0.8,
                out: 0.7,
                ang: 1.05,
                bg: '#e02a2a',
                fg: '#ffe14a',
                v: '妞妞',
              },
            ],
            awn: '#6b4a3c',
            sh: '#8a7a66',
          },
        ],
        [58.7, 60.8, { g: 'gate', awn: W }],
        [
          60.8,
          65.1,
          {
            g: 'shop',
            gf: 3.3,
            sign: ['慕森', '#eeeeec', '#555555'],
            art: 'musen',
            signH: 0.65,
            frame: '#1c1c1e',
            low: '#e9e7e2',
            acs: [[0.72, 3.85]],
            discs: [['', '#c8322c', '#ffffff', 0.98, 3.0, 0.45, 0.45]],
          },
        ],
        [
          65.1,
          70.5,
          {
            g: 'shutter',
            sign: ['小巷43', '#f2f1ee', '#222222', 'Alley.Cafe'],
            art: 'alley',
            signH: 1.2,
            oh: 2.85,
            discs: [['小巷43', '#ffffff', '#222222', 0.04, 4.25, 1.35, 1.75, -Math.PI * 0.75]],
            sh: '#8a6f55',
          },
        ],
        [
          70.5,
          74.8,
          {
            g: 'shutter',
            sign: ['KINDFOOD', '#f4f3ef', '#4a2e22', '健康廚房．舒肥餐盒'],
            art: 'kind',
            signH: 1.5,
            oh: 2.85,
            discs: [['KIND FOOD', '#ffffff', '#4a2e22', 0.03, 4.2, 1.2, 1.65]],
            sh: '#8a6f55',
          },
        ],
        [74.8, 76.9, { g: 'gate', awn: W }],
        [
          76.9,
          80.3,
          {
            g: 'shutter',
            noband: true,
            oh: 2.9,
            piers: '#6a4a36',
            discs: [
              ['Nazo', '#1a1a1a', '#ffffff', -0.08, 4.35, 1.4, 2.0],
              ['Nazo', '#1a1a1a', '#ffffff', 1.0, 2.75, 0.55, 0.5],
            ],
            sh: '#8a8478',
          },
        ],
        [
          80.3,
          85.8,
          {
            g: 'shutter',
            sign: ['寶寶屋 韓式料理', '#e23a3a', '#ffffff'],
            art: 'bao',
            signH: 1.4,
            oh: 2.85,
            add: [
              {
                at: 5.3,
                y: 3.3,
                h: 2.0,
                w: 0.95,
                out: 0.8,
                ang: 1.05,
                bg: '#d8322c',
                fg: '#ffffff',
                v: '寶寶屋',
              },
            ],
            awn: '#2a2a2c',
            sh: '#8a7f72',
          },
        ],
        [
          85.8,
          89.9,
          {
            g: 'shutter',
            sign: ['', '#f1f0ec', '#3a3a3a'],
            art: 'ink',
            signH: 0.8,
            oh: 2.9,
            sh: '#e6e2d6',
            discs: [['', '#f4f4f4', '#1a1a1a', 0.98, 4.1, 0.6, 0.5]],
          },
        ],
        [89.9, 92.1, { g: 'gate', awn: W }],
        [
          92.1,
          96.2,
          {
            g: 'shutter',
            sign: ['嘉霏髮妝', '#1a1a1a', '#ffffff', 'salon'],
            signH: 1.3,
            sh: '#cfc3b0',
            add: [0, 1, 2, 3, 4, 5].map((j) => ({
              x: [-0.17, 0.13],
              y: 3.17 + j * 0.21,
              h: 0.21,
              out: 0.38,
              bg: j % 2 ? '#f2f2f2' : '#1a1a1a',
            })),
          },
        ],
        [
          96.2,
          99.8,
          {
            g: 'shop',
            sign: ['樂野', '#232323', '#ffffff', '和風洋食屋'],
            art: 'leye',
            room: 'leye',
            signH: 1.3,
            awn: '#6b5a4a',
            discs: [['樂野', '#232323', '#ffffff', 0.94, 3.0, 1.0, 3.4, undefined, true]],
            add: [{ x: [3.33, 3.43], y: 0, h: 3.6, z: -3.35, out: 0.1, bg: '#6a4a3a' }],
            frame: '#2a2a2c',
          },
        ],
      ],
    },
    // 地下停車場車道（不鏽鋼欄杆、水泥矮牆）與鐵皮車庫
    { id: 'swRamp', kind: 'ramp', s0: 99.8, s1: 104, side: 1, set: 6, d: 9 },
    {
      id: 'swGarage',
      kind: 'hut',
      s0: 104,
      s1: 109.5,
      side: 1,
      set: 6,
      d: 8,
      wall: '#2f3440',
      roofCol: '#9a9a98',
      eave: 2.5,
      units: [
        [
          104,
          106.7,
          { g: 'shutter', sh: '#2f3440', noband: true, bare: true, paint: ['車庫', '#d08a2a'] },
        ],
        [
          106.7,
          109.5,
          { g: 'shutter', sh: '#2f3440', noband: true, bare: true, paint: ['車庫', '#d08a2a'] },
        ],
      ],
    },
    // 紅褐色丁掛磚六層公寓：每開間一個外凸白色鐵窗、青綠色浪板雨遮；s109.5～128.1 一樓往內退 2 m、前排磚柱、亂石拼貼地坪；
    // 招牌都掛在立面線的雨遮下面（不在退縮的牆上）；s137.4 之後是青綠色圓弧採光罩
    {
      id: 'swB',
      kind: 'walkup',
      s0: 109.5,
      s1: 143,
      side: 1,
      set: 3.7,
      d: 15,
      nf: 6,
      gf: 3.9,
      wall: '#a9523a',
      bal: 'cage',
      cage: '#e8e8e0',
      cageRoof: '#cfe6dc',
      bay: 5.5,
      recess: [109.5, 128.1, 2],
      pillars: [110.1, 115.8, 120.4, 127],
      eave: 1.2,
      eaveCol: '#8d8a86',
      endWall: '#e3d3b3',
      // 樓上其實是三棟各自的配置：大鐵窗籠之間夾窄牆、梯間；s137.4 之後是偏白磁磚加米色直條鐵窗
      bays: [
        [109.5, 115.1, 'cage'],
        [115.1, 120.5, 'cage'],
        [120.5, 126.2, 'cage'],
        [126.2, 127.6, 'strip'],
        [127.6, 131.6, 'cage'],
        [131.6, 134.6, 'plain'],
        [134.6, 137.4, 'cage'],
        [137.4, 143, 'white'],
      ],
      endWin: true,
      crazy: true,
      tin: '#4a4e55',
      arcs: [[137.4, 143, '#7fa39a']],
      props2: [[127.6, 0.7, 1.0, 0.7, 1.2, '#9a9c9e', '#d8b02a']],
      units: [
        [
          109.5,
          115.1,
          {
            g: 'gate',
            z: 2,
            noTile: true,
            pier: '#a9523a',
            doorAt: 3.3,
            add: [
              // 第三輪：s113.7～115.1 的藍色鐵捲門半開——退縮牆上只看到上面一截藍色橫帶（下緣一支壓條），下面是暗的室內，兩側導軌
              { x: [4.2, 5.42], y: 0, h: 2.05, z: 2, out: 0.02, bg: '#1f1e1c' },
              { x: [4.2, 5.42], y: 2.05, h: 1.2, z: 2, sh: '#3f6a8a' },
              { x: [4.2, 5.42], y: 1.98, h: 0.09, z: 2, out: 0.07, bg: '#2f4a66' },
              { x: [4.12, 4.2], y: 0, h: 3.25, z: 2, out: 0.08, bg: '#7a8a96' },
              { x: [5.42, 5.5], y: 0, h: 3.25, z: 2, out: 0.08, bg: '#7a8a96' },
              { x: [4.12, 5.5], y: 3.25, h: 0.3, z: 2, out: 0.25, bg: '#4a5a6a' },
              {
                x: [0.4, 0.8],
                y: 0.9,
                h: 1.9,
                out: 0.03,
                bg: '#f4f1ea',
                fg: '#c8281e',
                v: '本棟全新套房出租',
              },
              { x: [1.3, 2.4], y: 0, h: 2.15, z: 1.75, out: 0.06, bg: '#c9cccf' },
              { x: [1.4, 2.3], y: 1.0, h: 1.05, z: 1.69, out: 0.02, bg: '#7f8f96' },
            ],
          },
        ],
        [
          115.1,
          116.9,
          {
            g: 'gate',
            z: 2,
            noTile: true,
            pier: '#a9523a',
            doorAt: 0.75,
            add: [{ x: [0.85, 1.75], y: 0, h: 2.4, z: 2, sh: '#d8cfb8' }],
          },
        ],
        [
          116.9,
          120.5,
          {
            g: 'shutter',
            noband: true,
            sh: '#2f5f6e',
            z: 2,
            bare: true,
            signH: 0.8,
            add: [
              { x: [-0.5, 1.3], y: 2.9, h: 0.8, bg: '#262460', art: 'jiaodu' },
              { x: [1.36, 1.54], y: 2.55, h: 1.3, out: 0.16, bg: '#eef2f8' }, // 第三輪：招牌左側直條 LED 燈箱
              { x: [0.2, 1.5], y: 0, h: 2.3, z: 2, out: 0.05, bg: '#b9bcc0' },
            ],
          },
        ],
        [
          120.5,
          125.7,
          {
            g: 'shutter',
            sign: ['熊豆花', '#a9d8ec', '#e0662a'],
            art: 'beartofu',
            sh: '#d8c27a',
            z: 2,
            bare: true,
            signH: 0.8,
            add: [
              { x: [0.6, 1.5], y: 0, h: 1.3, out: 0.5, z: -0.5, bg: '#f4f6f8', art: 'bearstand' },
            ],
          },
        ],
        [
          125.7,
          128.1,
          {
            g: 'gate',
            z: 2,
            noTile: true,
            pier: '#a9523a',
            add: [
              {
                at: 1.3,
                y: 1.85,
                h: 1.5,
                w: 1.25,
                out: 0.8,
                ang: 1.1,
                bg: '#cfe6f2',
                fg: '#2a4f9a',
                t: '麻糬豆花\n手工傳統豆花\n綜合黑糖剉冰\n嫩仙草',
              },
            ],
          },
        ],
        [
          128.1,
          131.9,
          {
            g: 'shutter',
            sh: '#7a7a78',
            bare: true,
            signH: 0.85,
            add: [{ x: [0.3, 3.7], y: 4.0, h: 0.9, z: -0.95, out: 0.2, bg: '#b9b3d6' }],
          },
        ],
        [
          131.9,
          133.4,
          {
            g: 'gate',
            noTile: true,
            add: [
              {
                x: [0.02, 0.42],
                y: 1.2,
                h: 1.6,
                out: 0.14,
                bg: '#f4f1ea',
                fg: '#c8281e',
                v: '套房出租',
              },
            ],
          },
        ],
        [
          133.4,
          137.4,
          {
            g: 'shutter',
            blank: '#b8824f',
            awn: '#a9743f',
            awnY: 2.9,
            awnOut: 0.9,
            sh: '#c9a79a',
            bare: true,
            signH: 0.85,
            add: [{ x: [0.3, 3.7], y: 0, h: 0.16, out: 1.1, bg: '#7a6248' }],
          },
        ],
        [137.4, 138.6, { g: 'gate', noTile: true }],
        [
          138.6,
          143,
          {
            g: 'shutter',
            noband: true,
            signH: 0.92,
            sh: '#8a8478',
            bare: true,
            add: [
              {
                x: [0.3, 4.1],
                y: 2.94,
                h: 0.46,
                out: 0.26,
                bg: '#8b1a2b',
                fg: '#ffffff',
                t: '異國風服飾',
              },
              { x: [0.2, 4.2], y: 0, h: 0.16, out: 1.1, bg: '#7a6248' },
            ],
          },
        ],
      ],
    },
    // 米黃丁掛磚六層：每層外凸的實心磚砌陽台牆（二樓那一條是白色小方磚）加後退的深咖啡落地窗；一樓前段挑空停機車
    {
      id: 'swC',
      kind: 'walkup',
      s0: 143,
      s1: 158.4,
      side: 1,
      set: 3.7,
      d: 15,
      nf: 6,
      gf: 3.9,
      wall: '#c79a6b',
      bal: 'open',
      frame: '#4a3526',
      bay: 15.4,
      piers: [146.9, 150.8, 154.7],
      par2: ['#e2ddd0', 149.1],
      arcs: [[143, 149.1, '#7fa39a']],
      props2: [[144.3, 0.55, 0.7, 0.6, 1.3, '#8f9294']],
      plants: [
        [143.5, 0.5, 1.5],
        [145.0, 0.45, 1.2],
      ],
      units: [
        [
          143,
          145.3,
          {
            g: 'wall',
            low: '#e6e0d2',
            add: [
              {
                x: [1.75, 2.15],
                y: 1.1,
                h: 1.5,
                out: 0.08,
                bg: '#f4f1ea',
                fg: '#c8281e',
                v: '套房出租',
              },
            ],
          },
        ],
        [
          145.3,
          149.1,
          {
            g: 'open',
            inner: '#e9e6de',
            cones: 3,
            add: [
              {
                x: [0.5, 2.3],
                y: 4.25,
                h: 0.45,
                out: 0.2,
                bg: '#f4f1ea',
                fg: '#c8281e',
                t: '套房出租',
              },
              {
                x: [3.6, 4.0],
                y: 1.3,
                h: 1.5,
                out: 0.14,
                bg: '#f4f1ea',
                fg: '#c8281e',
                v: '套房出租',
              },
            ],
          },
        ],
        [
          149.1,
          151.7,
          {
            g: 'shutter',
            noband: true,
            sh: '#d9d2c4',
            bare: true,
            signH: 0.9,
            roll: ['#f2f2ee', '#b3b5b0', 1.1, 0.6],
            add: [
              { x: [0, 2.6], y: 4.3, h: 1.2, out: 0.45, bg: '#e8e8e4' },
              { x: [0.2, 2.5], y: 0, h: 0.16, out: 1.1, bg: '#7a4a3c' },
            ],
          },
        ],
        [
          151.7,
          154.7,
          {
            g: 'shutter',
            noband: true,
            roll: ['#f2f2ee', '#b3b5b0', 1.1, 0.6],
            sh: '#4f8f9a',
            bare: true,
            signH: 0.9,
          },
        ],
        [
          154.7,
          158.4,
          {
            g: 'shutter',
            noband: true,
            sh: '#b3202a',
            bare: true,
            signH: 0.9,
            add: [
              {
                x: [0, 3.7],
                y: 3.2,
                h: 1.2,
                out: 1.2,
                bg: '#1f4fc4',
                fg: '#ffffff',
                fg2: '#e8323c',
                t: 'GACHA\nPLAYER',
              },
              { x: [0, 3.7], y: 2.9, h: 0.3, out: 1.2, bg: '#1c1c1e' },
              { x: [0.16, 0.5], y: 0, h: 2.9, out: 0.14, bg: '#1f5fd0' },
              { x: [3.2, 3.54], y: 0, h: 2.9, out: 0.14, bg: '#1f5fd0' },
              { x: [0.2, 3.5], y: 0, h: 0.2, out: 1.1, bg: '#b89a6a' },
              { at: 3.78, y: 3.2, h: 1.2, w: 1.15, out: 0.6, bg: '#1f5fd0', art: 'shiba' },
            ],
          },
        ],
      ],
    },
    // 大仁四街口：灰褐色橫向溝紋磚六層，二樓以上轉角是圓弧（米色），一樓方正基座；路邊一支掛廣播喇叭的水泥電線桿
    {
      id: 'swD',
      kind: 'walkup',
      s0: 158.4,
      s1: 170,
      side: 1,
      set: 3.2,
      d: 14,
      nf: 6,
      gf: 3.7,
      wall: '#8c857c',
      bal: 'plain',
      bay: 9,
      winW: 1.3,
      winQ: [0.19, 0.66],
      winSmall: 1,
      corner: { r: 3.5, wall: '#cfc5b0', side: ['玩具', '#c8527a', '#ffffff'] },
      baseCol: '#4a4a4a',
      props2: [[160.6, 0.36, 0.9, 0.55, 1.05, '#2f5fb0']],
      poles: [[167.8, 0.5, 9]],
      units: [
        [
          158.4,
          161.2,
          {
            g: 'gate',
            awn: '#6f6f6f',
            awnOut: 0.65,
            noband: true,
            noTile: true,
            door: '#e4e0d6',
            doorAt: 2.05,
          },
        ],
        [161.2, 167, { g: 'wall', window: true }],
        [
          167,
          170,
          {
            g: 'wall',
            window: [0.9, 2.6],
            low: '#cfc5b0',
            add: [{ x: [0.1, 3.0], y: 0, h: 0.3, out: 0.6, bg: '#b5b0a4' }],
          },
        ],
      ],
    },
  ],
};

// 保留範圍：每棟從路緣到後牆（樹、街道家具、出生點不會長進來）
export function d5Footprints() {
  return D5_ST.blocks
    .filter((B) => B.kind !== 'decal')
    .map((B) => {
      const { ox, oz, ang, w, apron } = d5Frame(B),
        c = Math.cos(ang),
        s = Math.sin(ang),
        p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
      return [
        p(-0.1, -apron + 0.2),
        p(w + 0.1, -apron + 0.2),
        p(w + 0.1, B.d + 0.2),
        p(-0.1, B.d + 0.2),
      ];
    });
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

export function buildDaren5Street(I, scene, X) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS } = X;
  const { MR, FRONT, shopGlass } = rowTools();
  const def = (key, f) => {
    if (!MATS[key]) MATS[key] = f();
    return key;
  };
  const std = (o) =>
    new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  // 與中北路街屋共用同一組頂點色材質（同樣的 key，先建的那個生效）：'#hex' = 素色、'wall#hex' = 帶磁磚紋的牆
  const VC = def('zbVC', () => std({ vertexColors: true })),
    WVC = def('zbWVC', () => std({ map: YHT.facade(), vertexColors: true }));
  const lift = (hex, k = 0.18) => {
    const n = parseInt(hex.slice(1), 16),
      c = (s) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k);
    return `#${[16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`;
  };
  const wallOf = (hex) => `wall${lift(hex)}`;
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
  const NC = { col: false };
  // ---- 貼圖 ----
  const paint = (text, bg, fg, sub, wm, hm, ppm = 128) => {
    if (wm * ppm > 1536) ppm = 1536 / wm;
    const Wp = r16(wm * ppm),
      Hp = r16(hm * ppm);
    return sg(`d5_${text}|${bg}|${fg}|${sub || ''}|${Wp}x${Hp}`, Wp, Hp, (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, Wp, Hp);
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const lines = String(text).split('\n'),
        n = lines.length,
        avail = (Hp * (sub ? 0.6 : 0.82)) / n,
        px = Math.min(avail * 0.92, Wp * 0.5);
      const fit = (t) => {
        let p = px;
        g.font = font(p);
        while (g.measureText(t).width > Wp * 0.9 && p > 10) {
          p -= 2;
          g.font = font(p);
        }
      };
      const cy = sub ? Hp * 0.38 : Hp * 0.5;
      lines.forEach((t, i) => {
        fit(t);
        g.fillText(t, Wp / 2, cy + (i - (n - 1) / 2) * avail);
      });
      if (sub) {
        let p = Hp * 0.2;
        g.font = font(p, 700);
        while (g.measureText(sub).width > Wp * 0.92 && p > 9) {
          p -= 2;
          g.font = font(p, 700);
        }
        g.fillText(sub, Wp / 2, Hp * 0.8);
      }
    });
  };
  const roundSign = (text, bg, fg) =>
    sg(`d5R_${text}|${bg}|${fg}`, 128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = bg;
      g.beginPath();
      g.arc(64, 64, 62, 0, 7);
      g.fill();
      g.strokeStyle = fg;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(64, 64, 54, 0, 7);
      g.stroke();
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const t = [...text];
      if (text === 'PINK CAKE') {
        // 粉紅圓招：上面一個杯子蛋糕線條圖、下面一行字
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(52, 52);
        g.lineTo(56, 66);
        g.lineTo(72, 66);
        g.lineTo(76, 52);
        g.closePath();
        g.stroke();
        g.beginPath();
        g.arc(64, 46, 11, Math.PI, 0);
        g.stroke();
        g.beginPath();
        g.moveTo(64, 35);
        g.lineTo(64, 27);
        g.lineTo(71, 27);
        g.stroke();
        g.font = font(19, 700);
        g.fillText('PINK CAKE', 64, 86);
        return;
      }
      if (/^[一-鿿]+$/.test(text) && t.length > 2 && t.length <= 4) {
        g.font = font(38);
        g.fillText(t.slice(0, 2).join(''), 64, 44);
        g.fillText(t.slice(2).join(''), 64, 88);
      } else {
        let p = 46;
        g.font = font(p);
        while (g.measureText(text).width > 96 && p > 12) {
          p -= 2;
          g.font = font(p);
        }
        g.fillText(text, 64, 66);
      }
    });
  const shutterTex = (hex) =>
    sg(`d5Sh${hex}`, 64, 64, (g) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        g.fillStyle = 'rgba(255,255,255,0.2)';
        g.fillRect(0, y, 64, 3);
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(0, y + 6, 64, 2);
      }
    });
  // 招牌細部版面（sp.so）：字的大小位置、右端直條、圖案色塊
  const signArt = (text, bg, fg, sub, wm, hm, o) => {
    const ppm = Math.min(128, 1536 / wm),
      Wp = r16(wm * ppm),
      Hp = r16(hm * ppm);
    return sg(
      `d5A_${text}|${bg}|${fg}|${sub || ''}|${Wp}x${Hp}|${JSON.stringify(o)}`,
      Wp,
      Hp,
      (g) => {
        g.fillStyle = bg;
        g.fillRect(0, 0, Wp, Hp);
        let xr = Wp;
        if (o.stripes) {
          const sw = Hp * 0.12,
            n = o.stripes.length;
          o.stripes.forEach((c, i) => {
            g.fillStyle = c;
            g.fillRect(Wp - (n - i) * sw, 0, sw + 1, Hp);
          });
          xr = Wp - n * sw;
        }
        for (const [c, cx, cy, rx, ry] of o.blobs || []) {
          g.fillStyle = c;
          g.beginPath();
          g.ellipse(cx * xr, cy * Hp, rx * Hp, ry * Hp, 0, 0, 7);
          g.fill();
        }
        g.fillStyle = fg;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        let p = Hp * (o.px || 0.5);
        g.font = font(p);
        while (g.measureText(text).width > xr * 0.9 && p > 10) {
          p -= 2;
          g.font = font(p);
        }
        g.fillText(text, (o.ax ?? 0.5) * xr, (o.ay ?? 0.5) * Hp);
        if (sub) {
          let q = Hp * (o.spx || 0.14);
          g.font = font(q, 700);
          while (g.measureText(sub).width > xr * 0.9 && q > 8) {
            q -= 1;
            g.font = font(q, 700);
          }
          g.fillText(sub, (o.sx ?? o.ax ?? 0.5) * xr, (o.sy ?? 0.85) * Hp);
        }
      }
    );
  };
  const graffitiTex = () =>
    sg('d5Graf', 256, 128, (g) => {
      // 洗鞋達人鐵捲門的彩繪：土黃底、藍綠與黑色塊
      g.fillStyle = '#b08a3a';
      g.fillRect(0, 0, 256, 128);
      const cols = ['#2f7f86', '#1c1c1e', '#e8e2d0', '#c9a23f', '#3f9aa0'],
        q = lcg(77);
      for (let i = 0; i < 30; i++) {
        const x = q() * 256,
          y = 24 + q() * 96;
        g.fillStyle = cols[i % 5];
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 18 + q() * 40, y - 22 * q());
        g.lineTo(x + 28 + q() * 30, y + 8 + q() * 24);
        g.lineTo(x - 6, y + 18 * q());
        g.fill();
      }
      for (let y = 0; y < 128; y += 8) {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.fillRect(0, y + 6, 256, 2);
      }
    });
  const barsTex = (hex, arch) =>
    sg(`d5Bars${hex}${arch ? 'a' : ''}`, 128, 128, (g) => {
      // 鐵窗籠（透明底）；arch = 白色拱形花格
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = hex;
      g.strokeStyle = hex;
      g.lineWidth = 4;
      if (arch) {
        for (let i = 0; i < 3; i++) {
          const x0 = 4 + i * 41,
            x1 = x0 + 38;
          g.beginPath();
          g.moveTo(x0, 124);
          g.lineTo(x0, 44);
          g.arc((x0 + x1) / 2, 44, 19, Math.PI, 0);
          g.lineTo(x1, 124);
          g.stroke();
          for (let x = x0 + 9; x < x1; x += 10) g.fillRect(x, 30, 2, 96);
        }
        g.fillRect(0, 122, 128, 5);
        g.fillRect(0, 74, 128, 3);
      } else {
        for (let x = 2; x < 128; x += 9) g.fillRect(x, 0, 2.5, 128);
        for (const y of [0, 40, 84, 123]) g.fillRect(0, y, 128, 5);
      }
    });
  const glassGridTex = (cols, rows) =>
    sg(`d5GlassGrid${cols}x${rows}`, 128, 128, (g) => {
      // 第三輪東北側：透明格子玻璃（淡青綠半透明玻璃、灰白鋁框分格）
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(112,162,152,0.46)';
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < cols; i++) {
        const x = (128 * i) / cols;
        g.beginPath();
        g.moveTo(x + 6, 128);
        g.lineTo(x + 128 / cols - 4, 0);
        g.lineTo(x + 128 / cols + 10, 0);
        g.lineTo(x + 22, 128);
        g.fill();
      } // 斜的反光
      g.fillStyle = '#c9d0cc';
      for (let i = 0; i <= cols; i++)
        g.fillRect(Math.min(124, Math.max(0, (128 * i) / cols - 2)), 0, 4, 128);
      for (let j = 0; j <= rows; j++)
        g.fillRect(0, Math.min(124, Math.max(0, (128 * j) / rows - 2)), 128, 4);
    });
  const darkTex = sg('d5Dark', 128, 96, (g) => {
    // 挑空／車道裡面
    const gr = g.createLinearGradient(0, 0, 0, 96);
    gr.addColorStop(0, '#3a3834');
    gr.addColorStop(1, '#141312');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = 'rgba(255,245,220,.5)';
    g.fillRect(20, 6, 30, 3);
    g.fillRect(80, 6, 30, 3);
  });
  const gateTex = sg('d5Gate', 128, 160, (g) => {
    // 梯間入口的不鏽鋼格子玻璃門
    g.fillStyle = '#2c3034';
    g.fillRect(0, 0, 128, 160);
    g.fillStyle = '#56636c';
    g.fillRect(8, 8, 52, 146);
    g.fillRect(68, 8, 52, 146);
    g.fillStyle = '#c9cccf';
    for (let x = 8; x < 124; x += 13) g.fillRect(x, 8, 2, 146);
    for (let y = 8; y < 156; y += 24) g.fillRect(8, y, 112, 2);
    g.fillRect(0, 0, 128, 6);
    g.fillRect(0, 0, 6, 160);
    g.fillRect(122, 0, 6, 160);
    g.fillRect(60, 0, 8, 160);
    g.fillStyle = '#c8281e';
    g.fillRect(12, 20, 8, 60);
    g.fillRect(108, 20, 8, 60);
  });
  const litWin = sg('d5Lit', 256, 160, (g) => {
    g.fillStyle = '#d4d6d6';
    g.fillRect(0, 0, 256, 160);
    const gl = g.createLinearGradient(0, 8, 0, 152);
    gl.addColorStop(0, '#f6e2a8');
    gl.addColorStop(1, '#e0bd72');
    g.fillStyle = gl;
    g.fillRect(8, 8, 240, 144);
    g.fillStyle = 'rgba(150,110,80,.45)';
    g.fillRect(8, 8, 70, 144);
    g.fillRect(178, 8, 70, 144);
    g.fillStyle = '#d4d6d6';
    g.fillRect(124, 0, 8, 160);
  });
  const paintL = (lines, bg, wm, hm) => {
    // 每行各自顏色的招牌字：lines = [[字, 色], ...]
    const Wp = r16(wm * 128),
      Hp = r16(hm * 128);
    return sg(`d5L_${lines.join('|')}|${bg}|${Wp}x${Hp}`, Wp, Hp, (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, Wp, Hp);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const n = lines.length,
        av = (Hp * 0.86) / n;
      lines.forEach(([t, c], i) => {
        let px = av * 0.92;
        g.font = font(px);
        while (g.measureText(t).width > Wp * 0.88 && px > 10) {
          px -= 2;
          g.font = font(px);
        }
        g.fillStyle = c;
        g.fillText(t, Wp / 2, Hp / 2 + (i - (n - 1) / 2) * av);
      });
    });
  };
  const crazyTex = sg('d5Crazy', 256, 128, (g) => {
    // 亂石拼貼地坪：深色勾縫、淺色碎石片
    g.fillStyle = '#807b72';
    g.fillRect(0, 0, 256, 128);
    const q = lcg(4242);
    for (let y = 0; y < 128; y += 11)
      for (let x = 0; x < 256; x += 13) {
        const cx = x + 6.5 + (q() - 0.5) * 4,
          cy = y + 5.5 + (q() - 0.5) * 3.5,
          v = 186 + Math.floor(q() * 30);
        g.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
        g.beginPath();
        for (let j = 0; j < 5; j++) {
          const a2 = (j / 5) * Math.PI * 2 + q() * 0.6,
            rr = 4.2 + q() * 2.2;
          g.lineTo(cx + Math.cos(a2) * rr * 1.2, cy + Math.sin(a2) * rr);
        }
        g.closePath();
        g.fill();
      }
  });
  const carTex = (hex) =>
    sg(`d5Car${hex}`, 128, 96, (g) => {
      // 一樓挑空停車處：淺色內牆、後牆一扇門
      const gr = g.createLinearGradient(0, 0, 0, 96);
      gr.addColorStop(0, '#8f8b82');
      gr.addColorStop(0.18, hex);
      gr.addColorStop(0.8, hex);
      gr.addColorStop(1, '#a8a49a');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 96);
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.fillRect(0, 0, 14, 96);
      g.fillRect(114, 0, 14, 96);
      g.fillStyle = '#5a5046';
      g.fillRect(84, 34, 18, 50);
      g.fillStyle = '#3a3630';
      g.fillRect(22, 40, 26, 18);
    });
  const shopTex = (i) =>
    ROWT.shop(
      `d5${i}`,
      ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6],
      ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6],
      500 + i * 3
    );

  // ---- SW1：招牌圖樣（蓋在 sign 的招牌箱上）、酒吧星空圖輸出、木門、花格磚 ----
  const T = (g, t, x, y, px, col, maxW, al = 'center', wt = 900) => {
    g.textAlign = al;
    g.textBaseline = 'middle';
    g.fillStyle = col;
    g.font = font(px, wt);
    while (maxW && g.measureText(t).width > maxW && px > 8) {
      px -= 2;
      g.font = font(px, wt);
    }
    g.fillText(t, x, y);
  };
  const ART = {
    wan: (g, W, H) => {
      g.fillStyle = '#f1f1f3';
      g.fillRect(0, 0, W, H);
      const bx = W * 0.15,
        by = H * 0.56,
        br = H * 0.21;
      g.fillStyle = '#9c1f2e';
      g.strokeStyle = '#9c1f2e';
      g.lineWidth = Math.max(2, H * 0.022);
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI);
      g.fill();
      g.fillRect(bx - br * 0.45, by + br * 0.95, br * 0.9, br * 0.22);
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.arc(bx + i * br * 0.3, by - br * 0.08, br * 0.42, Math.PI, 0);
        g.stroke();
      }
      for (const dy of [0, 0.16]) {
        g.beginPath();
        g.moveTo(bx - br * 0.1, by - br * (1.25 - dy));
        g.lineTo(bx + br * 1.35, by - br * (1.5 - dy));
        g.stroke();
      }
      const sq = H * 0.5;
      ['原', '萬', '名'].forEach((c, i) => {
        const x = W * 0.35 + i * sq * 1.08;
        g.fillStyle = '#9c1f2e';
        g.fillRect(x, H * 0.27, sq, sq);
        T(g, c, x + sq / 2, H * 0.53, sq * 0.76, '#ffffff');
      });
      T(
        g,
        '客家麵食專賣店　Since 1982',
        W * 0.6,
        H * 0.14,
        H * 0.12,
        '#2a2a2c',
        W * 0.55,
        'center',
        700
      );
      T(
        g,
        '客家精緻湯頭，麵條湯汁味美',
        W * 0.6,
        H * 0.88,
        H * 0.085,
        '#2a2a2c',
        W * 0.5,
        'center',
        700
      );
    },
    chiuji: (g, W, H) => {
      g.fillStyle = '#f2efe8';
      g.fillRect(0, 0, W, H);
      T(g, '秋吉', W * 0.25, H * 0.5, H * 0.72, '#b3202a', W * 0.4);
      T(g, '便當專賣', W * 0.69, H * 0.5, H * 0.42, '#1c1c1c', W * 0.5);
    },
    papafun: (g, W, H) => {
      g.fillStyle = '#1c1c1e';
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 12) {
        g.fillStyle = 'rgba(255,255,255,.08)';
        g.fillRect(0, y, W, 4);
      }
      T(g, 'PA PA FUN', W / 2, H * 0.52, H * 0.44, '#f08aa8', W * 0.56);
      g.fillStyle = '#f08aa8';
      for (const x of [0.03, 0.8]) g.fillRect(W * x, H * 0.5, W * 0.17, Math.max(2, H * 0.035));
    },
    moon: (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#d8604a');
      gr.addColorStop(0.3, '#f3ece6');
      gr.addColorStop(0.7, '#f3ece6');
      gr.addColorStop(1, '#a8627a');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      T(g, '月 出 販 賣 部', W / 2, H * 0.45, H * 0.36, '#1f2238', W * 0.62);
      T(
        g,
        'M O O N R I S E   C O N C E P T   S T O R E',
        W / 2,
        H * 0.74,
        H * 0.1,
        '#1f2238',
        W * 0.6,
        'center',
        700
      );
    },
    niu: (g, W, H) => {
      g.fillStyle = '#e02a2a';
      g.fillRect(0, 0, W, H);
      T(g, '妞妞', W * 0.22, H * 0.46, H * 0.5, '#ffe14a', W * 0.36);
      T(g, '雲泰美食', W * 0.68, H * 0.46, H * 0.36, '#ffffff', W * 0.56);
    },
    musen: (g, W, H) => {
      g.fillStyle = '#eeeeec';
      g.fillRect(0, 0, W, H);
      T(g, '慕森', W / 2, H * 0.52, H * 0.42, '#555555', W * 0.3, 'center', 500);
    },
    alley: (g, W, H) => {
      g.fillStyle = '#f2f1ee';
      g.fillRect(0, 0, W, H);
      for (const [dy, col, ry] of [
        [0.1, '#c98a3c', 0.2],
        [0.02, '#5a8a3a', 0.1],
        [-0.04, '#e8d2a0', 0.1],
        [-0.14, '#d9a24a', 0.2],
      ]) {
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(W * 0.14, H * (0.5 + dy), W * 0.1, H * ry, 0, 0, 7);
        g.fill();
      }
      T(g, '小巷', W * 0.5, H * 0.4, H * 0.42, '#222222', W * 0.3);
      T(g, '43', W * 0.76, H * 0.48, H * 0.7, '#222222', W * 0.22, 'center', 500);
      T(g, 'Alley.Cafe', W * 0.5, H * 0.76, H * 0.17, '#222222', W * 0.3, 'center', 700);
    },
    kind: (g, W, H) => {
      g.fillStyle = '#f4f3ef';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#4a2e22';
      g.lineWidth = Math.max(2, H * 0.025);
      g.beginPath();
      g.arc(W * 0.18, H * 0.5, H * 0.36, 0, 7);
      g.stroke();
      T(g, 'KIND', W * 0.18, H * 0.4, H * 0.2, '#4a2e22', H * 0.56);
      T(g, 'FOOD', W * 0.18, H * 0.62, H * 0.2, '#4a2e22', H * 0.56);
      T(g, 'KINDFOOD', W * 0.66, H * 0.4, H * 0.3, '#4a2e22', W * 0.56);
      g.fillStyle = '#4a2e22';
      g.fillRect(W * 0.44, H * 0.62, W * 0.44, H * 0.15);
      T(g, '健康廚房．舒肥餐盒', W * 0.66, H * 0.7, H * 0.1, '#ffffff', W * 0.42, 'center', 700);
    },
    bao: (g, W, H) => {
      g.fillStyle = '#e23a3a';
      g.fillRect(0, 0, W, H);
      for (const [fx, hair] of [
        [0.13, '#2a2a2c'],
        [0.27, '#b9b9b9'],
      ]) {
        g.fillStyle = hair;
        g.beginPath();
        g.arc(W * fx, H * 0.42, H * 0.27, 0, 7);
        g.fill();
        g.fillStyle = '#f6d2b0';
        g.beginPath();
        g.arc(W * fx, H * 0.48, H * 0.22, 0, 7);
        g.fill();
        g.fillStyle = '#f4f2ee';
        g.fillRect(W * fx - H * 0.2, H * 0.72, H * 0.4, H * 0.28);
      }
      T(g, '寶寶屋', W * 0.66, H * 0.36, H * 0.48, '#ffffff', W * 0.5);
      g.fillStyle = '#1f2f7a';
      g.fillRect(W * 0.5, H * 0.68, W * 0.32, H * 0.22);
      T(g, '韓式料理', W * 0.66, H * 0.8, H * 0.16, '#ffffff', W * 0.3);
    },
    ink: (g, W, H) => {
      g.fillStyle = '#f1f0ec';
      g.fillRect(0, 0, W, H);
      for (const [dx, dy, rx, ry, col] of [
        [0, 0, 0.09, 0.2, '#2c2e30'],
        [0.06, 0.05, 0.07, 0.12, '#3a3c3e'],
        [-0.07, 0.04, 0.05, 0.1, '#444648'],
        [0.03, -0.1, 0.04, 0.08, '#5a8a4a'],
        [0.12, -0.02, 0.03, 0.05, '#2c2e30'],
      ]) {
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(W * (0.5 + dx), H * (0.52 + dy), W * rx, H * ry, 0.4, 0, 7);
        g.fill();
      }
    },
  };
  const serif = (px, it) => `${it ? 'italic ' : ''}700 ${px}px Georgia,"Times New Roman",serif`;
  const bear = (g, cx, cy, R) => {
    g.fillStyle = '#e8862a';
    for (const dx of [-0.7, 0.7]) {
      g.beginPath();
      g.arc(cx + dx * R, cy - R * 0.72, R * 0.36, 0, 7);
      g.fill();
    }
    g.beginPath();
    g.arc(cx, cy, R, 0, 7);
    g.fill();
    g.fillStyle = '#f6e2c0';
    g.beginPath();
    g.ellipse(cx, cy + R * 0.3, R * 0.5, R * 0.4, 0, 0, 7);
    g.fill();
    g.fillStyle = '#3a2a20';
    for (const dx of [-0.38, 0.38]) {
      g.beginPath();
      g.arc(cx + dx * R, cy - R * 0.15, R * 0.1, 0, 7);
      g.fill();
    }
    g.beginPath();
    g.arc(cx, cy + R * 0.18, R * 0.12, 0, 7);
    g.fill();
  };
  Object.assign(ART, {
    // 大展駕訓班大帆布：左上卡通人偶、紅字店名、藍色圓角長條「原場地考照」、右下紅字「學生優惠」（電話那一行不放）
    dazhan: (g, W, H) => {
      g.fillStyle = '#f2c230';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffffff';
      g.lineWidth = H * 0.012;
      g.strokeRect(H * 0.02, H * 0.02, W - H * 0.04, H - H * 0.04);
      const mx = W * 0.11,
        my = H * 0.2,
        mr = H * 0.13;
      g.fillStyle = '#f08a1a';
      g.beginPath();
      g.arc(mx, my, mr, 0, 7);
      g.fill();
      g.fillStyle = '#c8281e';
      g.beginPath();
      g.arc(mx, my - mr * 0.25, mr, Math.PI, 0);
      g.fill();
      g.fillRect(mx - mr * 0.2, my - mr * 0.3, mr * 1.5, mr * 0.2);
      g.fillStyle = '#1c1c1e';
      g.fillRect(mx - mr * 0.75, my - mr * 0.05, mr * 1.5, mr * 0.34);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(mx, my + mr * 0.55, mr * 0.3, 0, Math.PI);
      g.fill();
      g.fillStyle = '#c8281e';
      g.fillRect(mx - mr * 0.5, my + mr * 1.0, mr, mr * 0.5);
      T(g, '大展駕訓班', W * 0.6, H * 0.21, H * 0.28, '#c8281e', W * 0.7);
      const px0 = W * 0.06,
        pw = W * 0.88,
        py = H * 0.42,
        ph = H * 0.3;
      g.fillStyle = '#2a4fb8';
      g.fillRect(px0 + ph / 2, py, pw - ph, ph);
      for (const x of [px0 + ph / 2, px0 + pw - ph / 2]) {
        g.beginPath();
        g.arc(x, py + ph / 2, ph / 2, 0, 7);
        g.fill();
      }
      T(g, '原場地考照', px0 + pw / 2, py + ph / 2 + H * 0.01, H * 0.23, '#ffffff', pw * 0.8);
      T(g, '免費專車接送', W * 0.3, H * 0.87, H * 0.13, '#1c1c1e', W * 0.46, 'center', 700); // 電話那一列不放，改成兩列排滿
      T(g, '學生優惠', W * 0.77, H * 0.87, H * 0.17, '#c8281e', W * 0.38);
    },
    pawn: (g, W, H) => {
      // 環球當舖：左段淡黃白底紅色大字、中段藍底（小字看不清，只畫線條）、右段淺綠底加彩虹
      g.fillStyle = '#f6f2dc';
      g.fillRect(0, 0, W, H);
      T(g, '環球當舖', W * 0.21, H * 0.52, H * 0.5, '#c8281e', W * 0.38);
      g.fillStyle = '#2a5fc0';
      g.fillRect(W * 0.42, 0, W * 0.3, H);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i === 1 ? '#f2d83a' : '#ffffff';
        g.fillRect(W * 0.45, H * (0.2 + i * 0.24), W * (0.24 - (i % 2) * 0.05), H * 0.09);
      }
      g.fillStyle = '#cfe8c8';
      g.fillRect(W * 0.72, 0, W * 0.28, H);
      ['#e8483c', '#f0a030', '#f2d83a', '#4fae5a', '#3a7fd0'].forEach((c, i) => {
        g.strokeStyle = c;
        g.lineWidth = H * 0.06;
        g.beginPath();
        g.arc(W * 0.87, H * 1.0, H * (0.62 - i * 0.07), Math.PI, 0);
        g.stroke();
      });
    },
    gachapara: (g, W, H) => {
      // 瘋狂扭蛋樂園：白底、四周彩色扭蛋球、上面小字、中間粗黑字、下面桃紅片假名
      g.fillStyle = '#f8f6f0';
      g.fillRect(0, 0, W, H);
      const q = lcg(164),
        cols = ['#e8483c', '#f0a030', '#f2d83a', '#4fae5a', '#3a9fd8', '#e85a9a', '#8a5fd0'];
      for (let i = 0; i < 26; i++) {
        const e = i % 2,
          x = (e ? 0.02 + q() * 0.14 : 0.84 + q() * 0.14) * W,
          y = (0.08 + q() * 0.84) * H,
          rr = H * (0.06 + q() * 0.05);
        g.fillStyle = cols[i % 7];
        g.beginPath();
        g.arc(x, y, rr, Math.PI, 0);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(x, y, rr, 0, Math.PI);
        g.fill();
        g.strokeStyle = '#8a8a86';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, rr, 0, 7);
        g.stroke();
      }
      T(g, 'Gacha Paradise', W * 0.5, H * 0.16, H * 0.13, '#3a3a3c', W * 0.4, 'center', 700);
      T(g, '瘋狂扭蛋樂園', W * 0.5, H * 0.5, H * 0.42, '#1c1c1e', W * 0.62);
      T(g, 'ガチャパラダイス', W * 0.5, H * 0.85, H * 0.15, '#e0408a', W * 0.5, 'center', 700);
    },
    budae: (g, W, H) => {
      // 清水模底、左邊紅色毛筆 logo、右端五色直條
      g.fillStyle = '#9a9893';
      g.fillRect(0, 0, W, H);
      const sw = H * 0.12,
        cols = ['#2f4fa8', '#f0efe8', '#e8c63a', '#4f9a6a', '#c8322c'],
        xr = W - cols.length * sw;
      cols.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(xr + i * sw, 0, sw + 1, H);
      });
      g.strokeStyle = '#b5372c';
      g.lineCap = 'round';
      g.lineWidth = H * 0.11;
      const cx = W * 0.16,
        cy = H * 0.38;
      g.beginPath();
      g.arc(cx, cy, H * 0.26, Math.PI * 0.75, Math.PI * 2.1);
      g.stroke();
      g.beginPath();
      g.arc(cx + H * 0.4, cy + H * 0.05, H * 0.2, Math.PI * 1.1, Math.PI * 0.6);
      g.stroke();
      g.beginPath();
      g.moveTo(cx - H * 0.05, cy - H * 0.02);
      g.lineTo(cx + H * 0.12, cy + H * 0.1);
      g.stroke();
      g.lineCap = 'butt';
      T(g, '部隊鍋&BBQ', W * 0.22, H * 0.86, H * 0.12, '#2a2826', W * 0.32, 'center', 700);
    },
    yuding: (g, W, H) => {
      // 黑字店名、右邊鮭魚色公牛剪影
      g.fillStyle = '#f1efec';
      g.fillRect(0, 0, W, H);
      T(g, 'YUDING STEAK', W * 0.37, H * 0.48, H * 0.3, '#1a1a1a', W * 0.56);
      T(g, 'CREATIVE CUISINE', W * 0.42, H * 0.76, H * 0.09, '#555555', W * 0.3, 'center', 700);
      const bx = W * 0.8,
        by = H * 0.52,
        u = H * 0.3;
      g.fillStyle = '#d9907a';
      g.strokeStyle = '#d9907a';
      g.beginPath();
      g.ellipse(bx, by, u * 0.9, u * 0.5, 0, 0, 7);
      g.fill();
      g.beginPath();
      g.ellipse(bx - u * 0.75, by - u * 0.42, u * 0.42, u * 0.36, -0.3, 0, 7);
      g.fill();
      g.beginPath();
      g.ellipse(bx - u * 1.05, by - u * 0.1, u * 0.24, u * 0.2, 0.5, 0, 7);
      g.fill();
      for (const dx of [-0.6, -0.3, 0.45, 0.72])
        g.fillRect(bx + dx * u - u * 0.07, by + u * 0.2, u * 0.14, u * 0.8);
      g.lineWidth = u * 0.1;
      g.beginPath();
      g.arc(bx - u * 0.75, by - u * 1.0, u * 0.32, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
      g.beginPath();
      g.moveTo(bx + u * 0.85, by - u * 0.2);
      g.quadraticCurveTo(bx + u * 1.3, by - u * 0.7, bx + u * 1.15, by + u * 0.3);
      g.stroke();
    },
    imeat: (g, W, H) => {
      // 深灰帆布、左邊白字、右邊白色漢堡素描
      g.fillStyle = '#4a4a4c';
      g.fillRect(0, 0, W, H);
      T(g, 'I MEAT it.', W * 0.29, H * 0.52, H * 0.19, '#ffffff', W * 0.4);
      const bx = W * 0.73,
        by = H * 0.5,
        u = H * 0.36;
      g.fillStyle = '#e8e6e2';
      g.beginPath();
      g.ellipse(bx, by - u * 0.22, u * 0.95, u * 0.72, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = '#b9b6b0';
      g.fillRect(bx - u * 0.98, by - u * 0.14, u * 1.96, u * 0.2);
      g.fillStyle = '#e8e6e2';
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.arc(bx - u * 0.84 + i * u * 0.28, by + u * 0.1, u * 0.15, 0, Math.PI);
        g.fill();
      }
      g.fillStyle = '#8f8c86';
      g.fillRect(bx - u * 0.92, by + u * 0.2, u * 1.84, u * 0.2);
      g.fillStyle = '#e8e6e2';
      g.beginPath();
      g.ellipse(bx, by + u * 0.5, u * 0.92, u * 0.3, 0, 0, Math.PI);
      g.fill();
      g.fillRect(bx - u * 0.92, by + u * 0.44, u * 1.84, u * 0.08);
    },
    shoe: (g, W, H) => {
      // 深藍帆布、上面白色球鞋、下面白字
      g.fillStyle = '#1f2330';
      g.fillRect(0, 0, W, H);
      const bx = W * 0.5,
        by = H * 0.42,
        u = H * 0.26;
      g.fillStyle = '#eeeeea';
      g.beginPath();
      g.moveTo(bx - u * 1.1, by + u * 0.45);
      g.lineTo(bx - u * 1.0, by - u * 0.7);
      g.lineTo(bx - u * 0.35, by - u * 0.75);
      g.lineTo(bx - u * 0.2, by - u * 0.25);
      g.lineTo(bx + u * 0.75, by + u * 0.05);
      g.quadraticCurveTo(bx + u * 1.25, by + u * 0.15, bx + u * 1.2, by + u * 0.45);
      g.closePath();
      g.fill();
      g.fillStyle = '#c9c9c4';
      g.fillRect(bx - u * 1.15, by + u * 0.45, u * 2.4, u * 0.2);
      g.strokeStyle = '#1f2330';
      g.lineWidth = Math.max(2, u * 0.06);
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(bx - u * 0.25 + i * u * 0.22, by - u * 0.28 + i * u * 0.08);
        g.lineTo(bx - u * 0.45 + i * u * 0.22, by + u * 0.05 + i * u * 0.06);
        g.stroke();
      }
      T(g, '洗鞋達人', W * 0.5, H * 0.82, H * 0.19, '#ffffff', W * 0.5);
    },
    muse: (g, W, H) => {
      // 米白帆布、上面橢圓徽章裡一個 M、下面灰色襯線字
      g.fillStyle = '#e9e6e0';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#8a8680';
      g.lineWidth = Math.max(2, H * 0.014);
      g.beginPath();
      g.ellipse(W / 2, H * 0.36, H * 0.2, H * 0.25, 0, 0, 7);
      g.stroke();
      g.beginPath();
      g.ellipse(W / 2, H * 0.36, H * 0.24, H * 0.29, 0, 0, 7);
      g.stroke();
      g.fillStyle = '#7a7670';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = serif(H * 0.24);
      g.fillText('M', W / 2, H * 0.37);
      let px = H * 0.15;
      g.font = serif(px);
      while (g.measureText('MUSE EYELASH SALON').width > W * 0.8 && px > 8) {
        px -= 2;
        g.font = serif(px);
      }
      g.fillText('MUSE EYELASH SALON', W / 2, H * 0.8);
    },
    spotlight: (g, W, H) => {
      // 第三輪東北側：深咖啡色花體草寫字，下面一行小字網址
      g.fillStyle = '#f1efec';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#4a2f2a';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const script = (p) =>
        `italic 700 ${p}px "Snell Roundhand","Segoe Script","Lucida Handwriting","Brush Script MT","Apple Chancery",cursive`;
      let px = H * 0.72;
      g.font = script(px);
      while (g.measureText('Spotlight').width > W * 0.6 && px > 10) {
        px -= 2;
        g.font = script(px);
      }
      g.fillText('Spotlight', W * 0.5, H * 0.42);
      g.font = `400 ${Math.round(H * 0.075)}px Georgia,serif`;
      g.fillText('https://www.facebook.com/spotlightbody', W * 0.55, H * 0.82);
    },
    ipet: (g, W, H) => {
      // 第三輪東北側：I PeT 的「I」是直立的骨頭、和 PeT 之間一顆淡粉愛心，下面一行小字
      g.fillStyle = '#f4f2ee';
      g.fillRect(0, 0, W, H);
      const u = H * 0.52,
        bx = W * 0.27,
        by = H * 0.42;
      g.fillStyle = '#1a1a1a';
      g.fillRect(bx - u * 0.07, by - u * 0.36, u * 0.14, u * 0.72);
      for (const sy of [-1, 1])
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.arc(bx + sx * u * 0.08, by + sy * u * 0.4, u * 0.1, 0, 7);
          g.fill();
        }
      const hx = W * 0.36,
        hy = H * 0.44,
        hr = u * 0.17;
      g.fillStyle = '#f2b8c6';
      g.beginPath();
      g.moveTo(hx, hy + hr * 1.1);
      g.bezierCurveTo(
        hx - hr * 1.6,
        hy - hr * 0.1,
        hx - hr * 0.7,
        hy - hr * 1.3,
        hx,
        hy - hr * 0.4
      );
      g.bezierCurveTo(
        hx + hr * 0.7,
        hy - hr * 1.3,
        hx + hr * 1.6,
        hy - hr * 0.1,
        hx,
        hy + hr * 1.1
      );
      g.fill();
      T(g, 'PeT', W * 0.43, by, u * 0.95, '#1a1a1a', W * 0.5, 'left');
      T(g, 'DAMEN GUO PET SHOP', W * 0.5, H * 0.86, H * 0.1, '#3a3a3a', W * 0.7, 'center', 700);
    },
    butterfly: (g, W, H) => {
      // 白色吊牌上的黑色蝴蝶
      g.fillStyle = '#f1efec';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#1c1c1e';
      const cx = W / 2,
        cy = H * 0.5,
        u = Math.min(W, H) * 0.3;
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.ellipse(cx + sd * u * 0.6, cy - u * 0.35, u * 0.62, u * 0.5, sd * -0.5, 0, 7);
        g.fill();
        g.beginPath();
        g.ellipse(cx + sd * u * 0.45, cy + u * 0.45, u * 0.42, u * 0.36, sd * 0.6, 0, 7);
        g.fill();
      }
      g.fillStyle = '#f1efec';
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.ellipse(cx + sd * u * 0.65, cy - u * 0.38, u * 0.3, u * 0.2, sd * -0.5, 0, 7);
        g.fill();
      }
      g.fillStyle = '#1c1c1e';
      g.fillRect(cx - u * 0.06, cy - u * 0.7, u * 0.12, u * 1.5);
      g.strokeStyle = '#1c1c1e';
      g.lineWidth = Math.max(1.5, u * 0.04);
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx, cy - u * 0.7);
        g.quadraticCurveTo(cx + sd * u * 0.2, cy - u * 1.2, cx + sd * u * 0.45, cy - u * 1.15);
        g.stroke();
      }
    },
    beartofu: (g, W, H) => {
      // 熊豆花門楣菜單橫幅：左邊白底小熊、三欄標題（品項小字看不清，只畫線條）
      g.fillStyle = '#a9d8ec';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#f6f8fa';
      g.fillRect(H * 0.08, H * 0.1, H * 0.9, H * 0.8);
      bear(g, H * 0.53, H * 0.48, H * 0.24);
      const x0 = H * 1.1,
        cw = (W - x0 - H * 0.08) / 3;
      ['麻糬豆花', '手工傳統豆花', '其他冰品'].forEach((t, i) => {
        const cx = x0 + cw * (i + 0.5);
        T(g, t, cx, H * 0.2, H * 0.19, '#2a4f9a', cw * 0.86);
        g.fillStyle = '#5f7fae';
        for (let j = 0; j < 4; j++)
          g.fillRect(cx - cw * 0.4, H * (0.38 + j * 0.14), cw * (0.8 - (j % 2) * 0.12), H * 0.05);
        if (i) {
          g.fillStyle = '#f6f8fa';
          g.fillRect(x0 + cw * i - 1, H * 0.08, 2, H * 0.84);
        }
      });
    },
    shiba: (g, W, H) => {
      // GACHA 藍色招牌箱側面：白臉柴犬頭、下面一塊白底小牌「ガシャポン 扭蛋玩家」
      g.fillStyle = '#1f5fd0';
      g.fillRect(0, 0, W, H);
      const cx = W / 2,
        cy = H * 0.4,
        R = Math.min(W, H) * 0.27;
      g.fillStyle = '#c9ccd2';
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + sd * R * 0.95, cy - R * 0.2);
        g.lineTo(cx + sd * R * 0.75, cy - R * 1.25);
        g.lineTo(cx + sd * R * 0.2, cy - R * 0.7);
        g.fill();
      }
      g.beginPath();
      g.arc(cx, cy, R, 0, 7);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(cx, cy + R * 0.25, R * 0.78, R * 0.7, 0, 0, 7);
      g.fill();
      g.fillStyle = '#1c1c1e';
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.arc(cx + sd * R * 0.38, cy - R * 0.1, R * 0.09, 0, 7);
        g.fill();
      }
      g.beginPath();
      g.arc(cx, cy + R * 0.25, R * 0.12, 0, 7);
      g.fill();
      g.fillStyle = '#d8322c';
      g.fillRect(cx - R * 0.7, cy + R * 0.92, R * 1.4, R * 0.2);
      g.fillStyle = '#f6f4ee';
      g.fillRect(W * 0.08, H * 0.8, W * 0.84, H * 0.14);
      T(g, 'ガシャポン 扭蛋玩家', W * 0.5, H * 0.872, H * 0.085, '#1c1c1e', W * 0.78);
    },
    ning: (g, W, H) => {
      g.fillStyle = '#f6f4ee';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#9c1f2e';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let px = H * 0.7;
      g.font = serif(px, true);
      while (g.measureText('Ning Cafe').width > W * 0.7 && px > 8) {
        px -= 2;
        g.font = serif(px, true);
      }
      g.fillText('Ning Cafe', W / 2, H * 0.52);
    },
    bearstand: (g, W, H) => {
      g.fillStyle = '#f4f6f8';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#a9d8ec';
      g.beginPath();
      g.ellipse(W / 2, H * 0.45, W * 0.36, H * 0.34, 0, 0, 7);
      g.fill();
      bear(g, W / 2, H * 0.44, Math.min(W, H) * 0.2);
    },
    // 第三輪：嬌都美髮（左邊直排兩個小字「嬌都」，右邊大字「美髮」）
    jiaodu: (g, W, H) => {
      g.fillStyle = '#262460';
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.fillRect(W * 0.2, H * 0.14, Math.max(2, W * 0.008), H * 0.72);
      T(g, '嬌', W * 0.11, H * 0.31, H * 0.33, '#ffffff');
      T(g, '都', W * 0.11, H * 0.69, H * 0.33, '#ffffff');
      T(g, '美髮', W * 0.6, H * 0.53, H * 0.78, '#ffffff', W * 0.72);
    },
    // 第三輪：樂野（左上圓形刀叉標誌、右上一盤餐點照片、左下一碗湯，中間「樂野」「和風洋食屋」，下面品項與電話）
    leye: (g, W, H) => {
      g.fillStyle = '#232323';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#f2f2f2';
      g.lineWidth = Math.max(2, H * 0.03);
      g.strokeRect(H * 0.04, H * 0.04, W - H * 0.08, H * 0.92);
      g.beginPath();
      g.arc(W * 0.11, H * 0.3, H * 0.17, 0, 7);
      g.stroke();
      g.fillStyle = '#f2f2f2';
      g.fillRect(W * 0.095, H * 0.18, W * 0.008, H * 0.2);
      g.fillRect(W * 0.12, H * 0.18, W * 0.008, H * 0.2);
      const dish = (x, y, r, c) => {
        g.fillStyle = '#e8e2d6';
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.fill();
        g.fillStyle = c;
        g.beginPath();
        g.arc(x, y, r * 0.72, 0, 7);
        g.fill();
      };
      dish(W * 0.86, H * 0.26, H * 0.22, '#7a3a1a');
      dish(W * 0.1, H * 0.74, H * 0.17, '#d8b04a');
      T(g, '樂野', W * 0.38, H * 0.27, H * 0.38, '#ffffff', W * 0.3);
      T(g, '和風洋食屋', W * 0.5, H * 0.56, H * 0.24, '#ffffff', W * 0.5);
      T(g, '歐姆咖哩飯・義大利麵', W * 0.62, H * 0.74, H * 0.1, '#ffffff', W * 0.4, 'center', 700);
      T(g, '03－4383788', W * 0.62, H * 0.88, H * 0.12, '#ffffff', W * 0.4, 'center', 700);
    },
  });
  const artTex = (name, wm, hm) => {
    const ppm = Math.min(128, 1536 / wm),
      Wp = r16(wm * ppm),
      Hp = r16(hm * ppm);
    return sg(`d5Art_${name}|${Wp}x${Hp}`, Wp, Hp, (g) => ART[name](g, Wp, Hp));
  };
  const starTex = (wm, hm, B) =>
    sg(`d5Star${B.id}`, 1536, 480, (g) => {
      // 畫布左邊 = s 大的那一端（從街上看的左邊）
      const W = 1536,
        H = 480,
        cx = (s) => ((B.s1 - s) / wm) * W,
        R = lcg(4242),
        gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#2b5fd0');
      gr.addColorStop(0.45, '#1c3fa8');
      gr.addColorStop(0.8, '#0e1c5c');
      gr.addColorStop(1, '#070b22');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        const x = R() * W,
          y = R() * H * 0.6,
          rr = 60 + R() * 140,
          c = g.createRadialGradient(x, y, 0, x, y, rr);
        c.addColorStop(0, 'rgba(120,170,255,.35)');
        c.addColorStop(1, 'rgba(120,170,255,0)');
        g.fillStyle = c;
        g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      for (let i = 0; i < 700; i++) {
        g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`;
        const q = R() < 0.1 ? 3 : 1.5;
        g.fillRect(R() * W, R() * H * 0.78, q, q);
      }
      g.fillStyle = '#05060f';
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) g.lineTo(x, H * (0.83 + R() * 0.06));
      g.lineTo(W, H);
      g.fill();
      for (const [s, bw, bh] of [
        [20.9, 60, 150],
        [20.2, 46, 105],
        [19.5, 54, 125],
        [18.9, 40, 90],
      ]) {
        const x = cx(s);
        for (let yy = 0; yy < bh; yy += 9)
          for (let xx = 0; xx < bw; xx += 9) {
            g.fillStyle = `rgba(235,240,255,${0.45 + R() * 0.5})`;
            g.fillRect(x + xx, H * 0.84 - bh + yy, 4, 4);
          }
      }
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 2;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.font = font(46, 700);
      g.strokeText('THIS IS YOUR', cx(24.85), H * 0.3);
      g.strokeText('HAPPY', cx(24.85), H * 0.48);
      g.strokeText('HOUR', cx(24.85), H * 0.66);
      const xr = cx(14.5),
        xl = cx(17.9),
        tw = xr - xl;
      T(g, '這是你的', xl + tw * 0.48, H * 0.36, 120, '#ffffff', tw * 0.94);
      T(g, 'HAPPY', xl + tw * 0.76, H * 0.58, 46, '#f1dfe6', tw * 0.4, 'center', 500);
      T(g, 'HOUR', xl + tw * 0.8, H * 0.68, 46, '#f1dfe6', tw * 0.4, 'center', 500);
      T(g, 'SINCE 2020', xl + tw * 0.24, H * 0.6, 22, '#ffffff', tw * 0.4, 'center', 700);
      T(g, 'BAR｜BEER｜COCKTAIL', xl + tw * 0.27, H * 0.69, 22, '#ffffff', tw * 0.5, 'center', 700);
    });
  const barBox = sg('d5BarBox', 128, 160, (g) => {
    g.fillStyle = '#17171a';
    g.fillRect(0, 0, 128, 160);
    g.strokeStyle = '#c9a24a';
    g.lineWidth = 5;
    g.strokeRect(8, 8, 112, 144);
    g.lineWidth = 2;
    g.strokeRect(16, 16, 96, 128);
    T(g, '這是你的', 64, 68, 30, '#ffffff', 88);
    T(g, 'HAPPY HOUR', 64, 108, 14, '#c9a24a', 88, 'center', 700);
  });
  const barGlass = sg('d5BarGl', 64, 128, (g) => {
    const gr = g.createLinearGradient(0, 0, 64, 128);
    gr.addColorStop(0, '#5f6f7c');
    gr.addColorStop(0.5, '#27323c');
    gr.addColorStop(1, '#46545f');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 128);
  });
  const woodDoor = sg('d5WoodDoor', 128, 208, (g) => {
    g.fillStyle = '#3e2c22';
    g.fillRect(0, 0, 128, 208);
    g.fillStyle = '#2a1d16';
    g.fillRect(62, 0, 4, 208);
    for (const x of [8, 70]) {
      g.fillStyle = '#5a6a6c';
      g.fillRect(x, 14, 50, 120);
      g.strokeStyle = '#3e2c22';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x, 74);
      g.lineTo(x + 25, 14);
      g.lineTo(x + 50, 74);
      g.lineTo(x + 25, 134);
      g.closePath();
      g.stroke();
      g.fillStyle = '#33241b';
      g.fillRect(x, 146, 50, 50);
    }
  });
  const latticeTex = sg('d5Lattice', 128, 128, (g) => {
    g.fillStyle = '#b9a892';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#5c5348';
    for (let y = 5; y < 128; y += 16) for (let x = 5; x < 128; x += 16) g.fillRect(x, y, 7, 7);
  });
  // SW1：大樓二樓加蓋帶分段（x0～x1、樓板高 gf）
  const band2Seg = (k, x0, x1, gf, type, B, top = 2.2) => {
    const yb = gf + 0.7,
      yt = gf + top,
      L = x1 - x0;
    if (type === 'lattice') {
      k.box(x0, x1, yb, yt, -0.08, 0, '#b9a892', NC);
      const n = Math.max(1, Math.round(L / 1.2)),
        pw = L / n;
      for (let i = 0; i < n; i++)
        k.plane(
          latticeTex,
          pw - 0.12,
          yt - yb - 0.2,
          x0 + (i + 0.5) * pw,
          (yb + yt) / 2,
          -0.09,
          FRONT
        );
      k.box(x0, x1, yt, yt + 0.1, -0.35, 0, '#9ab3a2', NC);
    } else if (type === 'win') {
      k.box(x0, x1, gf + 0.1, yb, -0.6, 0, wallOf(B.wall), { col: false, tile: [0.6, 0.6] });
      k.box(x0, x1, yb, yt, -0.6, 0, '#dfe3e3', NC);
      const n = Math.max(1, Math.round(L / 1.6)),
        pw = L / n;
      for (let i = 0; i < n; i++)
        k.plane(
          ROWT.alWin(),
          pw - 0.1,
          yt - yb - 0.12,
          x0 + (i + 0.5) * pw,
          (yb + yt) / 2,
          -0.61,
          FRONT
        );
      k.box(x0 - 0.05, x1 + 0.05, yt, yt + 0.1, -1.0, 0, B.canopy, NC);
    } else if (type === 'cage') {
      k.box(x0, x1, gf + 0.22, gf + 0.3, -1.2, 0, '#8a8d90', NC);
      for (let x = x0; x < x1 - 0.01; x += 2.5) {
        const l = Math.min(2.5, x1 - x);
        k.plane(
          barsTex('#8a8d90'),
          l,
          yt - gf - 0.25,
          x + l / 2,
          (yt + gf + 0.3) / 2,
          -1.2,
          FRONT,
          { transparent: true, double: true }
        );
      }
      for (const [x, sd] of [
        [x0, -1],
        [x1, 1],
      ])
        k.plane(
          barsTex('#8a8d90'),
          1.2,
          yt - gf - 0.25,
          x,
          (yt + gf + 0.3) / 2,
          -0.6,
          (sd * Math.PI) / 2,
          { transparent: true, double: true }
        );
      k.box(x0 - 0.05, x1 + 0.05, yt + 0.05, yt + 0.13, -1.45, 0, '#8fae9c', NC);
    } else if (type === 'alu') {
      // 第三輪：嘉霏、樂野上方——小口磚牆面上一整排微凸的白鋁框窗（深色玻璃、部分霧面），上緣一條淺色水平雨遮
      const wy0 = gf + 0.6,
        wy1 = yt - 0.02,
        dz = -0.28;
      k.box(x0, x1, gf + 0.1, yt + 0.12, -0.05, 0, wallOf(B.wall), {
        col: false,
        tile: [0.6, 0.6],
      });
      k.box(x0 + 0.12, x1 - 0.12, wy0 - 0.06, wy1 + 0.06, dz, 0, '#efefeb', NC);
      k.box(x0 + 0.06, x1 - 0.06, wy0 - 0.14, wy0 - 0.06, dz - 0.08, 0, '#d9d8d2', NC);
      const n = Math.max(1, Math.round((L - 0.24) / 1.2)),
        pw = (L - 0.24) / n;
      for (let i = 0; i < n; i++)
        k.plane(
          aluBandTex((i * 7 + Math.round(x0 * 3)) % 5 === 1),
          pw - 0.06,
          wy1 - wy0 - 0.04,
          x0 + 0.12 + (i + 0.5) * pw,
          (wy0 + wy1) / 2,
          dz - 0.01,
          FRONT
        );
      k.box(x0 - 0.05, x1 + 0.05, yt + 0.12, yt + 0.2, -0.7, 0, '#e6e2d3', NC);
    } else {
      k.box(x0, x1, gf + 0.1, yt, -1.0, 0, '#cfe0e0', NC);
      for (let x = x0; x <= x1 + 0.01; x += L / Math.max(1, Math.round(L / 1.2)))
        k.box(
          Math.min(x, x1 - 0.07),
          Math.min(x, x1 - 0.07) + 0.07,
          gf + 0.1,
          yt + 0.1,
          -1.03,
          -1.0,
          '#f2f2ee',
          NC
        );
      for (const y of [gf + 0.1, gf + 0.75, yt])
        k.box(x0, x1, y, y + 0.08, -1.04, -1.0, '#f2f2ee', NC);
      k.box(x0, x1, yt + 0.08, yt + 0.16, -1.15, 0, '#f2f2ee', NC);
    }
  };
  const kits = [];
  const sphere = (k, x, y, z, r, hex) => {
    const g = new THREE.SphereGeometry(r, 7, 5);
    g.translate(x, y, z);
    k._part(VC, paintGeo(g, hex));
  };
  const rbox = (k, cx, cy, cz, bw, bh, bd, ry, hex, rx = 0) => {
    const g = new THREE.BoxGeometry(bw, bh, bd);
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    g.translate(cx, cy, cz);
    return k._part(VC, paintGeo(g, hex));
  }; // 可以轉角度的方塊（沒有碰撞）
  // 斜掛的箱型側招：中心 (cx, cy, cz)、寬 bw 高 bh、與立面夾角 ang（0 = 平行立面），兩面貼圖
  const board = (k, cx, cy, cz, bw, bh, ang, bg, tex) => {
    rbox(k, cx, cy, cz, bw, bh, 0.14, ang, bg);
    for (const sd of [0, 1]) {
      const a = FRONT + ang + sd * Math.PI;
      k.plane(tex, bw - 0.08, bh - 0.08, cx + Math.sin(a) * 0.08, cy, cz + Math.cos(a) * 0.08, a, {
        emissive: 0.3,
      });
    }
  };
  const aluBandTex = (frost) =>
    sg(`d5AluBand${frost ? 'f' : ''}`, 128, 128, (g) => {
      // 第三輪：白鋁框橫拉窗（左右兩扇、上面一排氣窗）；frost = 霧面玻璃
      g.fillStyle = '#f2f2ee';
      g.fillRect(0, 0, 128, 128);
      const gl = g.createLinearGradient(0, 0, 128, 128);
      gl.addColorStop(0, frost ? '#c9ccca' : '#4d5a60');
      gl.addColorStop(0.55, frost ? '#b7bbb9' : '#2f383d');
      gl.addColorStop(1, frost ? '#c2c5c3' : '#46525a');
      g.fillStyle = gl;
      g.fillRect(6, 6, 116, 26);
      g.fillRect(6, 38, 55, 84);
      g.fillRect(67, 38, 55, 84);
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.beginPath();
      g.moveTo(14, 122);
      g.lineTo(40, 38);
      g.lineTo(52, 38);
      g.lineTo(26, 122);
      g.fill();
    });
  // 第三輪：捲收式條紋帆布雨棚的布面（沿街方向一條條，stripe 公尺寬）
  const rollTex = (c1, c2, wm, stripe = 0.25) => {
    const Wp = r16(wm * 64);
    return sg(`d5Roll${c1}${c2}${Wp}`, Wp, 32, (g) => {
      const sw = stripe * 64;
      for (let x = 0, j = 0; x < Wp; x += sw, j++) {
        g.fillStyle = j % 2 ? c2 : c1;
        g.fillRect(x, 0, sw + 1, 32);
      }
    });
  };
  const valTex = (c1, c2, wm, stripe = 0.25) => {
    const Wp = r16(wm * 64);
    return sg(`d5Val${c1}${c2}${Wp}`, Wp, 32, (g) => {
      // 前緣垂邊：同色條紋、下緣一個個半圓波浪
      g.clearRect(0, 0, Wp, 32);
      const sw = stripe * 64;
      for (let x = 0, j = 0; x < Wp; x += sw, j++) {
        g.fillStyle = j % 2 ? c2 : c1;
        g.fillRect(x, 0, sw + 1, 18);
        g.beginPath();
        g.arc(x + sw / 2, 18, sw / 2, 0, Math.PI);
        g.fill();
      }
    });
  };
  // 第三輪：餐廳店面玻璃裡面看到的室內（取代雜貨貨架貼圖）
  const ROOM = {
    qiuji: (g, W, H) => {
      // 秋吉：黑色天花板加軌道燈、吊扇，白牆配淺木紋腰牆，左邊不鏽鋼工作台與冰箱，裡面一排高腳椅
      g.fillStyle = '#e9e7e2';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#26282a';
      g.fillRect(0, 0, W, H * 0.2);
      g.fillStyle = '#d8b98a';
      g.fillRect(0, H * 0.55, W, H * 0.45);
      g.fillStyle = 'rgba(120,90,50,.25)';
      for (let x = 0; x < W; x += 9) g.fillRect(x, H * 0.55, 2, H * 0.45);
      g.fillStyle = '#d9cbb6';
      g.fillRect(0, H * 0.86, W, H * 0.14);
      g.fillStyle = '#fff6d8';
      for (let x = W * 0.08; x < W; x += W * 0.14) {
        g.beginPath();
        g.arc(x, H * 0.165, H * 0.012, 0, 7);
        g.fill();
      }
      g.fillStyle = '#e8e8e4';
      g.fillRect(W * 0.38, H * 0.07, W * 0.24, H * 0.02);
      g.fillStyle = '#b9bec2';
      g.fillRect(W * 0.02, H * 0.3, W * 0.16, H * 0.6);
      g.fillStyle = '#7f8a90';
      g.fillRect(W * 0.04, H * 0.34, W * 0.12, H * 0.5);
      g.fillStyle = '#c9ccce';
      g.fillRect(W * 0.6, H * 0.6, W * 0.36, H * 0.06);
      g.fillStyle = '#8a8e90';
      g.fillRect(W * 0.62, H * 0.66, W * 0.02, H * 0.24);
      g.fillRect(W * 0.92, H * 0.66, W * 0.02, H * 0.24);
      g.fillStyle = '#5a7a3a';
      g.fillRect(W * 0.7, H * 0.52, W * 0.05, H * 0.08);
      g.fillStyle = '#2a2a2c';
      for (const x of [0.28, 0.36, 0.44]) {
        g.fillRect(W * x, H * 0.66, W * 0.05, H * 0.03);
        g.fillRect(W * x + W * 0.02, H * 0.69, W * 0.01, H * 0.2);
      }
    },
    leye: (g, W, H) => {
      // 樂野：鮮黃牆配原木牆板，門楣內側一條藍底白字布條，一桌桌原木桌椅
      g.fillStyle = '#efd94a';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#c99a62';
      g.fillRect(W * 0.3, H * 0.12, W * 0.4, H * 0.75);
      g.fillStyle = 'rgba(110,70,30,.25)';
      for (let x = W * 0.3; x < W * 0.7; x += 10) g.fillRect(x, H * 0.12, 2, H * 0.75);
      g.fillStyle = '#4a8a3a';
      g.fillRect(W * 0.76, H * 0.28, W * 0.14, H * 0.12);
      g.fillStyle = '#d9c3a0';
      g.fillRect(0, H * 0.86, W, H * 0.14);
      g.fillStyle = '#9cc9e8';
      g.fillRect(0, 0, W, H * 0.13);
      T(g, '樂野　和風洋食屋', W / 2, H * 0.066, H * 0.08, '#ffffff', W * 0.9);
      for (const x of [0.12, 0.42, 0.72]) {
        g.fillStyle = '#d8b07a';
        g.fillRect(W * x, H * 0.62, W * 0.18, H * 0.04);
        g.fillStyle = '#8a6a44';
        g.fillRect(W * x + W * 0.02, H * 0.66, W * 0.015, H * 0.2);
        g.fillRect(W * x + W * 0.145, H * 0.66, W * 0.015, H * 0.2);
        g.fillStyle = '#3a3a40';
        g.beginPath();
        g.ellipse(W * x + W * 0.04, H * 0.56, W * 0.035, H * 0.1, 0, 0, 7);
        g.fill();
        g.beginPath();
        g.arc(W * x + W * 0.04, H * 0.42, W * 0.025, 0, 7);
        g.fill();
      }
    },
  };
  const roomTex = (name) => sg(`d5Room_${name}`, 320, 256, (g) => ROOM[name](g, 320, 256));
  // 第三輪：PAPAFUN 門口的太空人立牌（透明底；深紫星空底座、黃色月球、白色太空人舉著黑底粉紅字小牌）
  const astroTex = sg('d5Astro', 192, 288, (g) => {
    g.clearRect(0, 0, 192, 288);
    const fill = (c, f) => {
      g.fillStyle = c;
      g.beginPath();
      f();
      g.fill();
    };
    fill('#2a2140', () => g.ellipse(84, 270, 84, 16, 0, 0, 7));
    g.fillStyle = '#ffffff';
    for (const [x, y] of [
      [30, 268],
      [70, 276],
      [120, 266],
      [150, 274],
    ])
      g.fillRect(x, y, 3, 3);
    fill('#f2c020', () => g.arc(62, 215, 60, 0, 7));
    g.strokeStyle = '#3a2a5a';
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = '#c99410';
    g.lineWidth = 5;
    for (const [x, y, r] of [
      [40, 205, 14],
      [72, 238, 10],
      [86, 196, 8],
    ]) {
      g.beginPath();
      g.arc(x, y, r, Math.PI * 0.1, Math.PI * 1.1);
      g.stroke();
    }
    g.strokeStyle = '#3a3a5a';
    g.lineWidth = 3;
    fill('#f4f4f6', () => g.ellipse(70, 150, 24, 14, 0, 0, 7));
    g.stroke();
    fill('#f4f4f6', () => g.ellipse(48, 160, 10, 24, 0.2, 0, 7));
    g.stroke();
    fill('#f4f4f6', () => g.ellipse(76, 112, 26, 30, 0, 0, 7));
    g.stroke();
    fill('#5a8ad8', () => g.rect(60, 104, 18, 12));
    fill('#f4f4f6', () => g.ellipse(104, 98, 9, 22, -0.6, 0, 7));
    g.stroke();
    fill('#f4f4f6', () => g.arc(78, 58, 30, 0, 7));
    g.stroke();
    fill('#4a3a7a', () => g.arc(80, 60, 22, 0, 7));
    fill('#e8e8ec', () => g.arc(80, 60, 15, 0, 7));
    fill('#1c1c1e', () => g.rect(104, 52, 62, 46));
    T(g, 'PAPA', 135, 66, 18, '#f08aa8', 54);
    T(g, 'FUN', 135, 86, 16, '#f08aa8', 54);
  });
  const clearTex = sg('d5Clear', 64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(214,226,230,.5)';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,.4)';
    for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillStyle = 'rgba(120,130,134,.75)';
    g.fillRect(0, 0, 64, 2);
    g.fillRect(0, 31, 64, 2);
  }); // 透明浪板
  const tree = (k, x, z, h, s, r) => {
    k.cyl(x, z, 0.2, 0, h, '#6a4a30', { seg: 6 });
    for (const [dx, dy, dz, q] of [
      [0, h + 0.5, 0, 1],
      [-1.1, h - 0.5, 0.4, 0.8],
      [1.2, h - 0.3, -0.3, 0.85],
    ])
      sphere(k, x + dx * s, dy, z + dz * s, s * q, r() < 0.5 ? '#3f7a3a' : '#4b8a3e');
  };
  const win = (k, x, y, w, h, z, r, gr) =>
    k.plane(
      r() < 0.18 ? litWin : gr ? YHT.win() : ROWT.alWin(),
      w,
      h,
      x,
      y,
      z - 0.02,
      FRONT,
      r() < 0.18 ? { emissive: 0.45 } : {}
    );
  const winL = (k, x, y, w, h, z, r) => {
    const lit = r() < 0.2;
    k.plane(
      lit ? litWin : ROWT.alWin(),
      w,
      h,
      x,
      y,
      z - 0.02,
      FRONT,
      lit ? { emissive: 0.45 } : {}
    );
  }; // 亮燈的窗貼圖與發光一起決定（SW2 的量體用）
  const ac = (k, x, y, z) => {
    k.box(x, x + 0.8, y, y + 0.5, z - 0.42, z - 0.02, MR.ac, NC);
    k.box(x + 0.05, x + 0.75, y + 0.06, y + 0.44, z - 0.43, z - 0.42, '#9a9a94', NC);
  };
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, col) => {
    k.box(x, x + 1.5, 0.28, 0.62, z - 0.14, z + 0.14, col, NC);
    k.box(x + 0.45, x + 1.0, 0.62, 0.72, z - 0.1, z + 0.1, '#1c1c1e', NC);
    k.box(x + 1.28, x + 1.34, 0.9, 0.96, z - 0.3, z + 0.3, '#1c1c1e', NC);
    k.box(x + 0.05, x + 0.5, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', NC);
    k.box(x + 1.2, x + 1.45, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', NC);
  };

  // ---- 一樓一間店面：x0～x1、一樓高 gf、立面在 z（退縮時 z > 0）----
  const unit = (k, x0, x1, gf, sp, i, r, pier) => {
    if (sp.gf) gf = sp.gf; // SW1：這一間自己的一樓高（招牌比別間低的店）
    const w = x1 - x0,
      z = sp.z || 0,
      g = sp.g,
      xc = (x0 + x1) / 2,
      sh = sp.signH ?? (g === 'gate' && !sp.sign ? 0 : 1.05),
      gh = sp.oh || gf - sh - 0.12 - (sp.lint || 0);
    for (const x of [x0, x1 - 0.16]) k.box(x, x + 0.16, 0, gf, z - 0.1, z, pier, NC); // 分戶柱
    if (sp.low) k.box(x0 + 0.16, x1 - 0.16, 0, gf, z - 0.05, z, sp.low, NC);
    if (g === 'wall' && sp.win) {
      const [ww, wy0, wy1, bars] = sp.win;
      k.box(
        xc - ww / 2 - 0.08,
        xc + ww / 2 + 0.08,
        wy0 - 0.08,
        wy1 + 0.08,
        z - 0.06,
        z,
        '#cfc8b8',
        NC
      );
      k.plane(ROWT.alWin(), ww, wy1 - wy0, xc, (wy0 + wy1) / 2, z - 0.07, FRONT);
      if (bars)
        k.plane(barsTex(bars), ww + 0.1, wy1 - wy0 + 0.1, xc, (wy0 + wy1) / 2, z - 0.14, FRONT, {
          transparent: true,
          double: true,
        });
    }
    if (sp.add)
      for (const it of sp.add) {
        // 額外的招牌箱、色塊、鐵捲門片（位置相對立面線，不跟著 z 退縮）
        if (it.at !== undefined) {
          // 斜掛的箱型側招
          const bh = it.h ?? 1.3,
            by = (it.y ?? gf - 1.15) + bh / 2,
            bz = (it.z || 0) - (it.out ?? 0.7),
            bx = x0 + it.at;
          board(
            k,
            bx,
            by,
            bz,
            it.w,
            bh,
            it.ang ?? Math.PI / 2,
            it.bg,
            it.art
              ? artTex(it.art, it.w, bh)
              : it.v
                ? ROWT.vert(`d5${it.v}${it.bg}`, it.bg, it.fg, it.v)
                : paint(it.t, it.bg, it.fg, it.sub, it.w, bh)
          );
          k.box(
            bx - 0.03,
            bx + 0.03,
            by + bh / 2 - 0.2,
            by + bh / 2 - 0.14,
            bz,
            it.z || 0,
            '#2a2a2c',
            NC
          );
          continue;
        }
        const a0 = x0 + it.x[0],
          a1 = x0 + it.x[1],
          aw = a1 - a0,
          am = (a0 + a1) / 2,
          y0 = it.y ?? gf - 1.15,
          ah = it.h ?? 0.9,
          zz = it.z || 0,
          out = it.out ?? 0.12;
        if (it.sh) {
          k.plane(shutterTex(it.sh), aw, ah, am, y0 + ah / 2, zz - 0.04, FRONT);
          continue;
        }
        if (it.perp) {
          k.box(a0, a1, y0, y0 + ah, zz - out, zz, it.bg, NC);
          for (const sd of [-1, 1])
            k.plane(
              paint(it.t, it.bg, it.fg, it.sub, out - 0.1, ah - 0.08),
              out - 0.1,
              ah - 0.08,
              sd < 0 ? a0 - 0.01 : a1 + 0.01,
              y0 + ah / 2,
              zz - out / 2,
              (sd * Math.PI) / 2,
              { emissive: 0.35 }
            );
          continue;
        } // 垂直立面的雙面側招
        k.box(a0, a1, y0, y0 + ah, zz - out, zz, it.bg, NC);
        if (it.art)
          k.plane(
            artTex(it.art, aw - 0.06, ah - 0.06),
            aw - 0.06,
            ah - 0.06,
            am,
            y0 + ah / 2,
            zz - out - 0.01,
            FRONT,
            { emissive: 0.3 }
          );
        else if (it.v)
          k.plane(
            ROWT.vert(`d5${it.v}${it.bg}`, it.bg, it.fg, it.v),
            aw,
            ah,
            am,
            y0 + ah / 2,
            zz - out - 0.01,
            FRONT,
            { emissive: 0.15 }
          );
        else if (it.t)
          k.plane(
            it.fg2
              ? paintL(
                  it.t.split('\n').map((t, j) => [t, j ? it.fg2 : it.fg]),
                  it.bg,
                  aw - 0.1,
                  ah - 0.08
                )
              : paint(it.t, it.bg, it.fg, it.sub, aw - 0.1, ah - 0.08),
            aw - 0.1,
            ah - 0.08,
            am,
            y0 + ah / 2,
            zz - out - 0.01,
            FRONT,
            { emissive: 0.35 }
          );
      }
    if (g === 'wall') {
      if (sp.window) {
        const [wa, wb] = Array.isArray(sp.window) ? sp.window : [0.3, 2.6];
        k.box(xc - 0.8, xc + 0.8, wa, wb, z - 0.08, z, '#cfc8b8', NC);
        k.plane(ROWT.alWin(), 1.4, wb - wa - 0.2, xc, (wa + wb) / 2, z - 0.09, FRONT);
      }
      return;
    }
    if (g === 'ramp') {
      k.plane(darkTex, w - 0.3, gh + 0.6, xc, (gh + 0.6) / 2, z - 0.03, FRONT);
      k.box(x0, x1, gh + 0.6, gh + 0.85, z - 0.12, z, '#8a8a86', NC);
      return;
    }
    // 招牌
    if (sp.sign) {
      const [text, bg, fg, sub] = sp.sign,
        out = sp.box || 0.3;
      if (sp.slant) {
        // 上緣靠牆、下緣往外斜的帆布招牌
        const th = Math.atan2(sp.slant, sh),
          L = Math.hypot(sp.slant, sh),
          yc = gf - sh / 2 - 0.05,
          zc = z - sp.slant / 2 - 0.05;
        rbox(k, xc, yc, zc + 0.03, w - 0.16, L, 0.05, 0, bg, th);
        k.box(
          x0 + 0.08,
          x1 - 0.08,
          gf - sh - 0.09,
          gf - sh - 0.03,
          z - sp.slant - 0.06,
          z,
          '#2a2a2c',
          NC
        );
        for (const x of [x0 + 0.08, x1 - 0.12])
          k.box(x, x + 0.04, gf - sh - 0.05, gf - sh * 0.5, z - sp.slant * 0.5, z, bg, NC);
        k.plane(
          sp.art ? artTex(sp.art, w - 0.3, L - 0.1) : paint(text, bg, fg, sub, w - 0.3, L - 0.1),
          w - 0.3,
          L - 0.1,
          xc,
          yc + 0.012 * Math.sin(th),
          zc - 0.012 * Math.cos(th),
          FRONT,
          { emissive: 0.3 }
        ).rotation.x = th;
      } else {
        k.box(x0 + 0.08, x1 - 0.08, gf - sh - 0.05, gf - 0.05, z - out, z, bg, NC);
        k.plane(
          sp.so
            ? signArt(text, bg, fg, sub, w - 0.3, sh - 0.12, sp.so)
            : paint(text, bg, fg, sub, w - 0.3, sh - 0.12),
          w - 0.3,
          sh - 0.12,
          xc,
          gf - sh / 2 - 0.05,
          z - out - 0.01,
          FRONT,
          { emissive: 0.35 }
        );
      }
    } else if (sp.blank)
      k.box(x0 + 0.08, x1 - 0.08, gf - sh - 0.05, gf - 0.05, z - 0.3, z, sp.blank, NC);
    if (sp.plate)
      k.box(
        xc - w * 0.24,
        xc + w * 0.16,
        gf - sh + 0.08,
        gf - 0.2,
        z - 0.34,
        z - 0.3,
        sp.plate,
        NC
      ); // 空白招牌箱上的小白板（字看不清，不寫）
    if (sp.wallSign) {
      // 二樓牆上的大橫招（可以跨到隔壁間：第 7 個值是起點 s 換算後的寬度）
      const [text, bg, fg, sub, h = 1.3, up = 0.3, ws] = sp.wallSign,
        wx1 = ws ? x1 + (sp._s0 - ws) : x1,
        ww = wx1 - x0 - 0.5,
        wc = (x0 + wx1) / 2;
      k.box(wc - ww / 2, wc + ww / 2, gf + up, gf + up + h, z - 0.16, z, bg, NC);
      k.plane(
        sp.wallArt
          ? artTex(sp.wallArt, ww - 0.2, h - 0.1)
          : paint(text, bg, fg, sub, ww - 0.2, h - 0.1),
        ww - 0.2,
        h - 0.1,
        wc,
        gf + up + h / 2,
        z - 0.17,
        FRONT,
        { emissive: 0.35 }
      );
    }
    if (sp.annex) {
      // 店面上方的二樓增建（白色油漆、深色窗、平屋簷、屋簷下掛冷氣）
      const [col, h] = sp.annex;
      k.box(x0, x1, gf, gf + h, z - 0.4, z + 0.5, col, NC);
      k.box(x0 - 0.05, x1 + 0.05, gf + h, gf + h + 0.1, z - 0.6, z + 0.5, '#8a8782', NC);
      for (const q of sp.annex[2] || [0.3, 0.72]) {
        k.box(
          x0 + w * q - 0.6,
          x0 + w * q + 0.6,
          gf + h - 1.9,
          gf + h - 0.55,
          z - 0.43,
          z - 0.4,
          '#5a4a40',
          NC
        );
        k.plane(ROWT.alWin(), 1.0, 1.15, x0 + w * q, gf + h - 1.22, z - 0.44, FRONT);
      }
    }
    if (sp.hang) {
      const [text, bg, fg, hw = 1.1, hh = 1.1] = sp.hang,
        hx = x1 - 0.5;
      for (const sd of [-1, 1])
        k.plane(
          sp.hangArt ? artTex(sp.hangArt, hw, hh) : paint(text, bg, fg, null, hw, hh, 96),
          hw,
          hh,
          hx + sd * 0.07,
          gf + 0.95 + hh / 2,
          z - 0.3 - hw / 2,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.box(hx - 0.06, hx + 0.06, gf + 0.95, gf + 0.95 + hh, z - 0.3 - hw, z - 0.3, bg, NC);
      k.box(hx - 0.03, hx + 0.03, gf + 1.95, gf + 2.0, z - 0.3, z, '#2a2a2c', NC);
    }
    if (sp.acs2) {
      const [an, ax = 0.5] = [].concat(sp.acs2);
      for (let j = 0; j < an; j++) ac(k, x0 + ax + j * 1.05, gf + 1.3, z);
    } else if (g !== 'gate' && !sp.noband)
      k.box(x0 + 0.16, x1 - 0.16, gf - sh, gf - 0.35, z - 0.06, z, '#d8d6cf', NC);
    if (sp.frame && sp.blank)
      for (const x of [x0 + 0.16, x1 - 0.28]) k.box(x, x + 0.12, 0, gh, z - 0.12, z, sp.frame, NC);
    if (sp.art && sp.sign && !sp.slant)
      k.plane(
        artTex(sp.art, w - 0.3, sh - 0.12),
        w - 0.3,
        sh - 0.12,
        xc,
        gf - sh / 2 - 0.05,
        z - (sp.box || 0.3) - 0.025,
        FRONT,
        { emissive: 0.35 }
      ); // SW1：招牌圖樣
    // 開口
    if (g === 'shop') {
      shopGlass(
        k,
        x0 + 0.3,
        x1 - 0.3,
        sp.steps ? 0.8 : 0,
        gh,
        sp.room ? roomTex(sp.room) : shopTex(i),
        z - 0.02
      );
      if (sp.frame) {
        for (const x of [x0 + 0.22, x1 - 0.34, xc - 0.06])
          k.box(x, x + 0.12, 0, gh, z - 0.1, z, sp.frame, NC);
        k.box(x0 + 0.22, x1 - 0.22, gh - 0.12, gh + 0.06, z - 0.1, z, sp.frame, NC);
      }
      if (sp.porthole)
        for (const dx of [-0.9, 0.9])
          k.plane(roundSign('', '#c9cccf', '#56636c'), 0.8, 0.8, xc + dx, 1.6, z - 0.09, FRONT, {
            transparent: true,
          }); // 不鏽鋼圓框（PAPAFUN 的舷窗）
      if (sp.steps) {
        for (let j = 0; j < sp.steps; j++)
          k.box(
            x0 + 0.3,
            x1 - 0.3,
            0,
            0.8 - j * 0.16,
            z - 0.6 - (j + 1) * 0.3,
            z - 0.6 - j * 0.3,
            '#a3a19b',
            NC
          );
        k.box(x0 + 0.3, x1 - 0.3, 0, 0.8, z - 0.6, z, '#a3a19b');
        for (const x of [x0 + 0.3, x1 - 0.36])
          k.box(x, x + 0.06, 0.8, 1.7, z - 2.1, z - 0.6, '#c9cccf', NC);
      }
    } else if (g === 'open') {
      k.plane(
        sp.inner ? carTex(sp.inner) : darkTex,
        w - 0.4,
        gh + 0.5,
        xc,
        (gh + 0.5) / 2,
        z - 0.03,
        FRONT
      );
      for (let j = 0; j < 2; j++) bike(k, x0 + 0.3 + j * 1.7, z - 0.5, bikeCols[(i + j) % 6]);
      for (let j = 0; j < (sp.cones || 0); j++) {
        const cx = x0 + 0.5 + (j * (w - 1)) / Math.max(1, sp.cones - 1);
        k.cyl(cx, z - 0.95, 0.16, 0, 0.6, '#e8642a', { seg: 8, r1: 0.03 });
        k.box(cx - 0.18, cx + 0.18, 0, 0.04, z - 1.13, z - 0.77, '#e8642a', NC);
      }
    } else if (g === 'hatch') {
      // SW1：整面實牆加不鏽鋼圓舷窗與圓角艙門（PAPAFUN），門口太空人坐月球立牌
      const px = x0 + w * 0.6,
        dx = x0 + w * 0.17;
      k.box(x0 + 0.16, x1 - 0.16, gh, gh + 0.12, z - 0.5, z, sp.hood || '#f4f2ee', NC);
      k.plane(roundSign('', '#4a545c', '#d5d8da'), 1.2, 1.2, px, 1.55, z - 0.09, FRONT, {
        transparent: true,
      });
      k.box(dx - 0.48, dx + 0.48, 0, 2.1, z - 0.08, z, '#b9bcc0', NC);
      k.plane(roundSign('', '#8a9096', '#e1e4e6'), 0.42, 0.42, dx, 1.55, z - 0.09, FRONT, {
        transparent: true,
      });
      k.box(dx + 0.62, dx + 0.92, 1.05, 1.9, z - 0.07, z, '#f08aa8', NC);
      k.box(dx + 0.98, dx + 1.2, 1.2, 1.8, z - 0.07, z, '#fbfbf8', NC);
      if (sp.astro) {
        // 第三輪：太空人坐月球的平板立牌，貼著牆立在舷窗左前方（astro = [中心離本間起點, 寬, 高]）
        const [ax, aw, ah] = sp.astro;
        k.plane(astroTex, aw, ah, x0 + ax, ah / 2, z - 0.16, FRONT, { transparent: true });
        k.box(x0 + ax - aw * 0.3, x0 + ax + aw * 0.3, 0, 0.05, z - 0.3, z - 0.05, '#2a2140', NC);
      } else {
        k.box(px + 0.1, px + 0.9, 0, 0.12, z - 1.75, z - 1.05, '#3a2a5a', NC);
        sphere(k, px + 0.5, 0.5, z - 1.4, 0.48, '#e8dcb0');
        sphere(k, px + 0.5, 1.12, z - 1.4, 0.3, '#f2f2f2');
        sphere(k, px + 0.5, 1.55, z - 1.4, 0.24, '#f6f6f6');
        k.box(px + 0.38, px + 0.62, 1.48, 1.62, z - 1.66, z - 1.6, '#2a2a3a', NC);
      }
    } else if (g === 'wood') {
      // SW1：木門小店（深色木頭雙開門、木框小窗加木窗台、紅色小海報、直立白色小燈箱）
      const dx = x0 + w * sp.door,
        wx = x0 + w * sp.win;
      k.box(dx - 0.72, dx + 0.72, 0, 2.25, z - 0.06, z, sp.frame, NC);
      k.plane(woodDoor, 1.3, 2.12, dx, 1.06, z - 0.07, FRONT);
      k.box(wx - 0.5, wx + 0.5, 1.15, 2.0, z - 0.06, z, sp.frame, NC);
      k.plane(ROWT.alWin(), 0.8, 0.65, wx, 1.58, z - 0.07, FRONT);
      k.box(wx - 0.6, wx + 0.6, 1.05, 1.13, z - 0.25, z, sp.frame, NC);
      k.box(dx - 1.02, dx - 0.84, 0.2, 0.75, z - 0.03, z, '#c8281e', NC);
      k.box(wx - 1.25, wx - 1.1, 1.3, 2.1, z - 0.14, z, '#f2f2ee', NC);
    } else if (g === 'gate') {
      const dw = Math.min(1.7, w - 0.5),
        dx = sp.doorAt ?? xc;
      if (sp.lobby) {
        k.plane(darkTex, w - 0.5, gf - 0.5, xc, (gf - 0.5) / 2, z - 0.03, FRONT);
        k.box(x0 + 0.5, x1 - 0.5, 0, 1.0, z - 0.035, z - 0.03, sp.lobby, NC);
        k.box(xc - 0.35, xc + 0.35, 1.3, 2.0, z - 0.05, z - 0.03, '#8a5a34', NC);
      } else if (sp.door) {
        k.box(dx - dw * 0.3, dx + dw * 0.3, 0, 2.25, z - 0.05, z, sp.door, NC);
        k.box(dx - dw * 0.3 - 0.08, dx + dw * 0.3 + 0.08, 0, 2.33, z - 0.03, z, '#b9b4a8', NC);
      } else k.plane(gateTex, dw, 2.3, dx, 1.15, z - 0.03, FRONT);
      if (sp.sh)
        k.plane(
          shutterTex(sp.sh),
          Math.min(2.2, w - dw - 0.6),
          2.6,
          x1 - 0.3 - Math.min(2.2, w - dw - 0.6) / 2,
          1.3,
          z - 0.04,
          FRONT
        );
      if (!sp.noTile)
        for (const x of [x0 + 0.16, x1 - 0.5]) {
          k.box(x, x + 0.34, 0, 1.2, z - 0.14, z, '#d6a8a8', NC);
          k.box(x, x + 0.34, 0.5, 0.65, z - 0.145, z, '#8fa89a', NC);
        } // 柱子下半段粉紅與灰綠橫條磁磚
    } else {
      k.plane(shutterTex(sp.sh || '#9a9a98'), w - 0.5, gh, xc, gh / 2, z - 0.02, FRONT);
      if (sp.half) {
        const hh = gh * 0.52;
        shopGlass(k, x0 + 0.35, x1 - 0.35, 0, hh, shopTex(i), z - 0.04);
        for (const x of [x0 + 0.3, xc - 0.05, x1 - 0.4])
          k.box(x, x + 0.1, 0, hh, z - 0.08, z - 0.04, sp.half, NC);
        k.box(x0 + 0.3, x1 - 0.3, hh - 0.05, hh + 0.08, z - 0.1, z - 0.04, '#7a7e80', NC);
      }
      k.box(x0 + 0.2, x1 - 0.2, gh - 0.02, gh + 0.2, z - 0.2, z, '#7a7e80', NC);
      if (sp.paint)
        k.plane(
          sg(`d5Pt${sp.paint[0]}`, 128, 64, (c) => {
            c.clearRect(0, 0, 128, 64);
            c.fillStyle = sp.paint[1];
            c.font = font(44);
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(sp.paint[0], 64, 34);
          }),
          1.6,
          0.8,
          xc,
          gh * 0.55,
          z - 0.04,
          FRONT,
          { transparent: true }
        );
    }
    // 雨棚
    if (sp.awn) {
      const A = Array.isArray(sp.awn) ? sp.awn : [sp.awn],
        y = sp.awnY ?? (g === 'gate' ? 2.75 : gf - sh - 0.2),
        out = sp.awnOut ?? (g === 'gate' ? 0.9 : 1.3);
      const n = A.length > 1 ? Math.max(2, Math.round(w / 0.32)) : 1,
        bw = (w - 0.2) / n;
      for (let j = 0; j < n; j++)
        k.box(
          x0 + 0.1 + j * bw,
          x0 + 0.1 + (j + 1) * bw + 0.005,
          y,
          y + 0.08,
          z - out,
          z,
          A[j % A.length],
          NC
        );
      k.box(x0 + 0.1, x1 - 0.1, y - 0.16, y, z - out - 0.02, z - out + 0.05, A[0], NC);
      if (g === 'gate') k.box(x0 + 0.3, x1 - 0.3, y + 0.08, y + 0.22, z - out * 0.6, z, A[0], NC); // 弧形雨棚拱起來的那一段
      if (sp.awnSlope)
        for (let j = 1; j <= 5; j++)
          k.box(
            x0 + 0.1,
            x1 - 0.1,
            y + (sp.awnSlope * (j - 1)) / 5,
            y + (sp.awnSlope * j) / 5 + 0.03,
            z - out * (1 - j / 6),
            z,
            A[0],
            NC
          ); // 斜的帆布雨棚（階梯狀疊出斜面）
      if (sp.awnText) {
        const [at, ac2] = sp.awnText,
          aw = w - 0.2;
        k.box(x0 + 0.1, x1 - 0.1, y - 0.36, y, z - out - 0.03, z - out + 0.02, A[0], NC);
        k.plane(
          paint(at, A[0], ac2, null, aw, 0.3, 112),
          aw,
          0.3,
          xc,
          y - 0.18,
          z - out - 0.04,
          FRONT
        );
      } // 第三輪東北側：雨棚前緣垂下來的那一條印字
    }
    if (sp.roll) {
      // 第三輪：捲收式條紋帆布雨棚（斜面布、前緣波浪垂邊、牆上捲軸盒）
      const [c1, c2, out = 1.2, drop = 0.7, yTop = gf - sh - 0.05] = sp.roll,
        aw = w - 0.2;
      k.plane(
        rollTex(c1, c2, aw),
        aw,
        Math.hypot(out, drop),
        xc,
        yTop - drop / 2,
        z - out / 2,
        FRONT,
        { double: true }
      ).rotation.x = Math.atan2(out, drop);
      k.plane(valTex(c1, c2, aw), aw, 0.28, xc, yTop - drop - 0.12, z - out - 0.01, FRONT, {
        transparent: true,
        double: true,
      });
      k.box(x0 + 0.1, x1 - 0.1, yTop - 0.05, yTop + 0.09, z - 0.16, z, '#9a9c9a', NC);
      for (const x of [x0 + 0.14, x1 - 0.18])
        rbox(
          k,
          x + 0.02,
          yTop - drop / 2,
          z - out / 2,
          0.04,
          0.04,
          Math.hypot(out, drop),
          0,
          '#8a8d90',
          -Math.atan2(drop, out)
        );
    }
    if (sp.banner) {
      const [bt, bb, bf] = sp.banner,
        [bw, bh, by] = sp.bannerBox || [Math.min(w - 0.6, 3), 0.5, gf - sh - 0.5];
      k.plane(paint(bt, bb, bf, null, bw, bh, 96), bw, bh, xc, by, z - 0.34, FRONT, {
        emissive: 0.15,
      });
    }
    // NE1 加的選配欄位
    if (sp.shFront)
      k.plane(shutterTex(sp.sh || '#9a9a98'), w - 0.5, gh, xc, gh / 2, z - 0.07, FRONT);
    if (sp.graffiti) k.plane(graffitiTex(), w - 0.5, gh, xc, gh / 2, z - 0.045, FRONT);
    if (sp.split) {
      const [q, pw, pc] = sp.split,
        xs = x1 - w * q;
      k.box(xs - pw / 2, xs + pw / 2, 0, gh + 0.05, z - 0.11, z, pc || pier, NC);
    }
    if (sp.side) {
      const [t, bg, fg] = sp.side,
        sx = sp.sideL ? x1 - 0.2 : x0 + 0.2,
        y = gf - sh / 2 - 0.05;
      for (const sd of [-1, 1])
        k.plane(
          paint(t, bg, fg, null, 0.9, 0.7, 96),
          0.9,
          0.7,
          sx + sd * 0.05,
          y,
          z - 0.8,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.box(sx - 0.04, sx + 0.04, y - 0.35, y + 0.35, z - 1.25, z - 0.35, bg, NC);
      k.box(sx - 0.03, sx + 0.03, y - 0.03, y + 0.03, z - 0.35, z, '#2a2a2c', NC);
    }
    if (sp.vlow) {
      const [t, bg, fg] = sp.vlow,
        cw = 0.38,
        len = cw * [...t].length + 0.1,
        y = gf - 0.1 - len / 2,
        sx = x0 + 0.2;
      for (const sd of [-1, 1])
        k.plane(
          ROWT.vert(`d5${t}${bg}`, bg, fg, t),
          cw + 0.04,
          len,
          sx + sd * 0.05,
          y,
          z - 0.6,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.box(sx - 0.04, sx + 0.04, y - len / 2, y + len / 2, z - 0.81, z - 0.39, bg, NC);
      k.box(sx - 0.03, sx + 0.03, y - 0.03, y + 0.03, z - 0.39, z, '#2a2a2c', NC);
    }
    if (sp.plaque) {
      const [t, bg, fg, pw = 0.3] = sp.plaque,
        n = [...t].length;
      k.plane(
        ROWT.vert(`d5${t}${bg}`, bg, fg, t),
        pw,
        pw * n * 0.92,
        x1 - 0.33,
        1.75,
        z - 0.16,
        FRONT,
        { emissive: 0.15 }
      );
    }
    if (sp.vert) {
      const [text, bg, fg] = sp.vert,
        n = [...text].length,
        cw = n > 5 ? 0.42 : 0.55,
        len = cw * n + 0.2;
      for (const sd of [-1, 1])
        k.plane(
          ROWT.vert(`d5${text}${bg}`, bg, fg, text),
          cw + 0.05,
          len,
          x0 + 0.2 + sd * 0.04,
          gf + 0.3 + len / 2,
          z - 0.55,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.box(x0 + 0.17, x0 + 0.23, gf + 0.3, gf + 0.3 + len, z - 0.85, z, '#2a2a2c', NC);
    }
    if (sp.round) {
      const [text, bg, fg] = sp.round;
      for (const sd of [-1, 1])
        k.plane(
          roundSign(text, bg, fg),
          0.9,
          0.9,
          x1 - 0.25 + sd * 0.03,
          gf - 0.2,
          z - 0.75,
          (sd * Math.PI) / 2,
          { transparent: true, emissive: 0.3 }
        );
      k.box(x1 - 0.28, x1 - 0.22, gf + 0.2, gf + 0.26, z - 1.1, z, '#2a2a2c', NC);
    }
    if (sp.vertR) {
      const [text, bg, fg, cw = 0.5, y0 = gf + 0.3] = sp.vertR,
        len = cw * [...text].length + 0.2;
      for (const sd of [-1, 1])
        k.plane(
          ROWT.vert(`d5${text}${bg}`, bg, fg, text),
          cw + 0.05,
          len,
          x1 - 0.2 + sd * 0.07,
          y0 + len / 2,
          z - 0.25 - (cw + 0.05) / 2,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
      k.box(x1 - 0.26, x1 - 0.14, y0, y0 + len, z - 0.3 - cw, z - 0.25, '#2a2a2c', NC);
      k.box(
        x1 - 0.23,
        x1 - 0.17,
        y0 + len * 0.5,
        y0 + len * 0.5 + 0.06,
        z - 0.25,
        z,
        '#2a2a2c',
        NC
      );
    } // SW1
    if (sp.discs)
      for (const [text, bg, fg, fx, y, size, out, face, noArm] of sp.discs) {
        const x = x0 + w * fx;
        for (const sd of [-1, 1]) {
          const rot = face === undefined ? (sd * Math.PI) / 2 : face + (sd > 0 ? 0 : Math.PI);
          k.plane(
            roundSign(text, bg, fg),
            size,
            size,
            x + Math.sin(rot) * 0.04,
            y,
            z - out + Math.cos(rot) * 0.04,
            rot,
            { transparent: true, emissive: 0.3 }
          );
        }
        if (!noArm)
          k.box(x - 0.03, x + 0.03, y - 0.03, y + 0.03, z - out + size / 2, z, '#2a2a2c', NC);
      } // SW1
    if (sp.piers) {
      for (const x of [x0, x1 - 0.32]) k.box(x, x + 0.32, 0, gh + 0.28, z - 0.13, z, sp.piers, NC);
      k.box(x0, x1, gh, gh + 0.28, z - 0.13, z, sp.piers, NC);
    } // SW1：木質柱與門楣
    if (sp.acs) for (const [fx, y] of sp.acs) ac(k, x0 + w * fx, y, z); // SW1
    if (sp.barrels)
      for (let j = 0; j < sp.barrels; j++) {
        const x = x1 - 0.7 - j * 0.64;
        k.cyl(x, z - 0.9, 0.29, 0, 0.88, j % 2 ? '#2f5fb8' : '#7a4a3a', { seg: 12 });
        k.cyl(x, z - 0.9, 0.12, 0.88, 1.05, '#f2f2ee', { seg: 8 });
        sphere(k, x, 1.25, z - 0.9, 0.2, '#4c7d3a');
      } // SW1：月出門口的 200 L 鐵桶
    if (sp.disc) {
      const [text, bg, fg, dd = 1.6, up = 1.5, dx = 0] = sp.disc;
      k.plane(roundSign(text, bg, fg), dd, dd, xc + dx, gf + up, z - 0.12, FRONT, {
        transparent: true,
        emissive: 0.35,
      });
    } // 二樓牆上的大圓招牌
    if (!sp.bare && (g === 'shop' || g === 'shutter') && w > 3.6 && r() < 0.45) {
      const px = x0 + 0.5 + r() * (w - 1.6);
      k.box(px, px + 0.5, 0, 0.5, z - 1.3, z - 0.8, '#8a6a4a', NC);
      sphere(k, px + 0.25, 0.85, z - 1.05, 0.42, '#4c7d3a');
    } // 門口盆栽
    if (!sp.bare && g === 'shutter' && w > 4 && r() < 0.3)
      bike(k, x0 + 0.6 + r() * (w - 2.6), z - 1.1, bikeCols[i % 6]);
  };

  // ---- 高樓樓上立面：梯間之間三開間（窄、寬、窄），凹陽台加女兒牆，住戶各自加鐵窗籠、拱形花格、凸窗 ----
  const FACE = {
    o: 'open',
    n: 'awn',
    w: 'cage',
    g: 'cageG',
    a: 'arch',
    b: 'bay',
    r: 'round',
    d: 'dark',
    x: 'box',
    f: 'flat',
    A: 'archD',
  };
  // 第三輪東北側：裙樓二樓窗照段指定（窗頂貼著屋簷 y2）。'dark' 深色鐵窗籠（外凸 0.4、密直條）｜'alu' 整排外凸鋁窗（框色 fc，外凸 0.5、下面一道窗台）
  const podWins = (k, B, seg, y2) => {
    const h = 1.6,
      wy = y2 - 0.65,
      ya = wy - h / 2,
      yb = wy + h / 2;
    for (const [a, b, type, fc] of B.podWins) {
      const [x0, x1] = seg(a, b),
        L = x1 - x0;
      if (type === 'dark') {
        const col = fc || '#34312e',
          n = Math.max(1, Math.round(L / 1.3)),
          pw = L / n,
          o = { transparent: true, double: true };
        k.plane(ROWT.alWin(), L - 0.2, h - 0.1, (x0 + x1) / 2, wy, -0.02, FRONT);
        for (let j = 0; j < n; j++)
          k.plane(barsTex(col), pw, h, x0 + (j + 0.5) * pw, wy, -0.4, FRONT, o);
        k.box(x0, x1, ya - 0.1, ya, -0.44, 0, col, NC);
        k.box(x0 - 0.05, x1 + 0.05, yb, yb + 0.1, -0.5, 0, col, NC);
        for (const xx of [x0, x1 - 0.06]) k.box(xx, xx + 0.06, ya, yb, -0.42, 0, col, NC);
      } else {
        const col = fc || '#7a6450',
          n = Math.max(1, Math.round(L / 1.25)),
          pw = L / n;
        k.box(x0, x1, ya - 0.1, yb + 0.02, -0.45, -0.05, '#3e4448', NC);
        for (let j = 0; j < n; j++) {
          k.plane(ROWT.alWin(), pw - 0.1, h - 0.12, x0 + (j + 0.5) * pw, wy, -0.47, FRONT);
          k.box(x0 + j * pw - 0.04, x0 + j * pw + 0.04, ya, yb, -0.5, -0.45, col, NC);
        }
        k.box(x1 - 0.04, x1 + 0.04, ya, yb, -0.5, -0.45, col, NC);
        for (const xx of [x0 - 0.04, x1 - 0.02]) k.box(xx, xx + 0.06, ya, yb, -0.5, 0, col, NC);
        k.box(x0 - 0.05, x1 + 0.05, ya - 0.14, ya, -0.6, 0, '#d8d6cf', NC); // 窗台
        k.box(x0 - 0.02, x1 + 0.02, yb, yb + 0.08, -0.52, 0, col, NC);
        k.box(x0, x1, ya - 0.02, ya + 0.04, -0.5, -0.45, col, NC);
      }
    }
  };
  // 第三輪東北側：外凸的透明格子玻璃凸窗（正面＋兩側面），cap = 上緣加白色窗楣（往下包到二樓的那一段不加）
  const glassBox = (k, xa, xb, ya, yb, z, out, cap = true) => {
    const bw = xb - xa,
      bh = yb - ya,
      ym = (ya + yb) / 2,
      rows = Math.max(1, Math.round(bh / 1.05)),
      o = { transparent: true, double: true };
    k.plane(
      glassGridTex(Math.max(2, Math.round(bw / 1.2)), rows),
      bw,
      bh,
      (xa + xb) / 2,
      ym,
      z - out,
      FRONT,
      o
    );
    for (const xx of [xa, xb])
      k.plane(glassGridTex(1, rows), out, bh, xx, ym, z - out / 2, Math.PI / 2, o);
    k.box(xa - 0.02, xb + 0.02, ya - 0.08, ya, z - out - 0.02, z, '#d8d6cf', NC);
    if (cap) k.box(xa - 0.08, xb + 0.08, yb, yb + 0.08, z - out - 0.08, z, '#e9e9e6', NC);
  };
  const towerFace = (k, B, F, xa, xb, y0, n, z, r) => {
    const fh = 3.0,
      sw = 2.2,
      cuts = [],
      bays = [];
    const st = B.stairs
      .map((s) => F.X(s))
      .filter((x) => x > xa + 2 && x < xb - 2)
      .sort((a, b) => a - b);
    let x = xa;
    for (const c of st) {
      cuts.push([x, c - sw / 2, 0], [c - sw / 2, c + sw / 2, 1]);
      x = c + sw / 2;
    }
    cuts.push([x, xb, 0]);
    for (let f = 0; f <= n; f++)
      k.box(xa, xb, y0 + f * fh - 0.09, y0 + f * fh + 0.09, z - 0.07, z, B.parapet, NC); // 每層樓板橫帶
    for (const [c0, c1, stair] of cuts) {
      if (c1 - c0 < 1) continue;
      if (stair) {
        // 梯間：內凹直條小窗
        k.box(c0, c1, y0, y0 + n * fh, z - 0.04, z, B.stairCol || '#9aa39e', NC);
        for (let f = 0; f < n; f++)
          k.plane(ROWT.alWin(), sw - 0.9, 1.3, (c0 + c1) / 2, y0 + f * fh + 1.6, z - 0.06, FRONT);
        continue;
      }
      const eb = B.endBays && c1 > xb - 0.01 ? B.endBays : null,
        L = c1 - c0,
        nb = eb ? eb.length : Math.max(1, Math.round(L / 4.4)),
        ws = eb || (nb === 3 ? [0.298, 0.404, 0.298] : Array(nb).fill(1 / nb));
      let bx = c0;
      ws.forEach((q, bi) => {
        bays.push([bx, bx + L * q, nb === 3 && bi === 1]);
        bx += L * q;
      });
    }
    bays.forEach(([b0, b1, mid], gi) => {
      const bw = b1 - b0,
        bc = (b0 + b1) / 2,
        row = B.face && B.face[B.side > 0 ? gi : bays.length - 1 - gi]; // face 的順序是 s 由小到大
      k.box(
        b0 - 0.08,
        b0 + 0.08,
        y0,
        y0 + n * fh,
        z - 0.1,
        z,
        B.wall[0] === '#' ? wallOf(B.wall) : B.wall,
        NC
      ); // 開間之間的牆垛
      for (let f = 0; f < n; f++) {
        const y = y0 + f * fh,
          q2 = r(),
          set = row && FACE[row[f]];
        const kind =
          set ||
          (mid
            ? f === 0
              ? 'bay'
              : f === 1
                ? 'round'
                : q2 < 0.45
                  ? 'dark'
                  : 'open'
            : q2 < 0.3
              ? 'cage'
              : q2 < 0.45
                ? 'arch'
                : q2 < 0.6
                  ? 'cageG'
                  : 'open');
        win(k, bc, y + 1.6, bw - 0.7, 1.7, z, r, false);
        if (kind === 'bay' && B.glassBay)
          glassBox(k, b0 + 0.3, b1 - 0.3, y + 0.5, y + 2.6, z, mid ? 0.6 : 0.5); // 透明格子玻璃凸窗（第三輪東北側）
        else if (kind === 'bay' && (mid || !set)) {
          k.box(b0 + 0.3, b1 - 0.3, y + 0.5, y + 2.6, z - 0.6, z, B.bayCol || '#4f7f6a', NC);
          for (const xx of [b0 + 0.5, bc - 0.04, b1 - 0.58])
            k.box(xx, xx + 0.08, y + 0.5, y + 2.6, z - 0.62, z - 0.6, '#e9e9e6', NC);
          k.box(b0 + 0.45, b1 - 0.45, y + 2.6, y + 2.68, z - 0.66, z, '#e9e9e6', NC);
        } else if (kind === 'bay') {
          k.box(b0 + 0.3, b1 - 0.3, y + 0.65, y + 2.5, z - 0.5, z, B.bayCol || '#4f7f6a', NC);
          k.plane(ROWT.alWin(), bw - 1.3, 1.45, bc, y + 1.58, z - 0.51, FRONT);
          k.box(b0 + 0.45, b1 - 0.45, y + 2.5, y + 2.57, z - 0.56, z, '#e9e9e6', NC);
        } // 窄開間的綠框玻璃凸窗
        else if (kind === 'round' && B.arcBal) {
          const [dep, col] = B.arcBal,
            hw = bw / 2 - 0.25,
            N = 9;
          for (let j = 0; j < N; j++) {
            const t = ((j + 0.5) / N) * 2 - 1,
              zz = z - dep * (1 - t * t);
            k.box(
              bc + hw * (t - 1 / N),
              bc + hw * (t + 1 / N),
              y,
              y + 1.05,
              zz,
              zz + 0.14,
              wallOf(col),
              NC
            );
            k.box(bc + hw * (t - 1 / N), bc + hw * (t + 1 / N), y - 0.12, y + 0.02, zz, z, col, NC);
            k.box(
              bc + hw * (t - 1 / N),
              bc + hw * (t + 1 / N),
              y + 1.05,
              y + 1.11,
              zz - 0.03,
              zz + 0.17,
              '#e9e7e2',
              NC
            );
          }
        } // 第三輪東北側：淺弧形外凸陽台（貼磚的弧形女兒牆，分 9 段拼出弧線）
        else if (kind === 'round')
          k.cyl(bc, z, Math.min(1.9, bw / 2 - 0.5), y, y + 1.05, wallOf(B.wall), { seg: 14 });
        else if (kind === 'dark') {
          k.box(b0 + 0.3, b1 - 0.3, y + 0.7, y + 2.5, z - 0.45, z, B.darkCol || '#3a4046', NC);
          if (B.darkCol) k.box(b0 + 0.25, b1 - 0.25, y + 2.5, y + 2.58, z - 0.55, z, B.canopy, NC);
          k.plane(ROWT.alWin(), bw - 1.5, 1.5, bc, y + 1.6, z - 0.46, FRONT);
        } else if (kind === 'box') {
          k.box(b0 + 0.3, b1 - 0.3, y + 0.75, y + 2.55, z - 0.48, z, '#dcd9cf', NC);
          k.plane(ROWT.alWin(), bw - 1.25, 1.4, bc, y + 1.7, z - 0.49, FRONT);
          k.box(b0 + 0.45, b1 - 0.45, y + 2.55, y + 2.61, z - 0.55, z, '#c9c6bc', NC);
        } // 白鋁窗封起來
        else {
          k.box(b0 + 0.12, b1 - 0.12, y + 0.09, y + 1.05, z - 0.22, z, B.parapet, NC); // 女兒牆
          if (kind === 'flat')
            k.plane(barsTex('#e8e8e0'), bw - 0.5, 1.9, bc, y + 1.75, z - 0.24, FRONT, {
              transparent: true,
              double: true,
            }); // 貼牆的白色直條鐵窗
          else if (kind === 'cage' || kind === 'cageG' || kind === 'arch' || kind === 'archD') {
            const arch = kind === 'arch' || kind === 'archD',
              col = kind === 'cageG' ? '#3f6a55' : kind === 'archD' ? '#6a625a' : '#e8e8e0',
              out = arch ? 0.24 : 0.7;
            k.plane(
              barsTex(col, arch),
              bw - 0.3,
              arch ? 1.5 : 2.4,
              bc,
              y + (arch ? 1.8 : 1.3),
              z - out,
              FRONT,
              { transparent: true, double: true }
            );
            if (!arch) {
              k.box(
                b0 + 0.1,
                b1 - 0.1,
                y + 2.5,
                y + 2.57,
                z - out - 0.12,
                z,
                set && kind === 'cage' ? '#e2e2dc' : B.canopy,
                NC
              );
              k.box(b0 + 0.15, b1 - 0.15, y + 0.06, y + 0.12, z - out, z, '#9a9a94', NC);
            }
          } else if (kind === 'awn' || (!set && r() < 0.35))
            k.box(b0 + 0.3, b1 - 0.3, y + 2.5, y + 2.56, z - 0.6, z, B.canopy, NC); // 綠色小雨遮
        }
        if (r() < 0.5)
          ac(
            k,
            r() < 0.5 ? b0 + 0.25 : b1 - 1.05,
            y + 0.15,
            z - (kind === 'cage' || kind === 'cageG' ? 0.7 : 0.22)
          );
      }
    });
  };

  const backWins = (k, w, d, gf, nf, fh, y2) => {
    // 後牆開窗，從巷子或高處看才不是整面素牆
    for (let f = 0; f < nf; f++) {
      const y = f === 0 ? 0.4 : (y2 ?? gf) + (f - 1) * fh + 0.4,
        n = Math.max(1, Math.round(w / 6.5));
      for (let j = 0; j < n; j++)
        k.plane(YHT.win(), 1.6, 1.2, (w * (j + 0.5)) / n, y + 1.1, d + 0.03, 0);
    }
  };

  D5_ST.blocks.forEach((B, bi) => {
    const F = d5Frame(B),
      w = F.w,
      r = lcg(7100 + bi * 13),
      side = B.side;
    F.X = (s) => (side > 0 ? s - B.s0 : B.s1 - s);
    const seg = (a, b) => {
      const p = F.X(a),
        q = F.X(b);
      return p < q ? [p, q] : [q, p];
    };
    const k = vcKit(new Kit(I, F.ox, F.oz, F.ang));
    kits.push(k);
    const d = B.d,
      fh = 3.0,
      wm = B.wall ? wallOf(B.wall) : null,
      pier = B.base || '#b9b6ae';
    // 路面沿街有高低差（整條約 0.4 m）：一樓店面、鋪面、花台各自用一個小 Kit 貼著自己腳下的地面，量體本身往下埋 0.8 m
    const sub = (xa) => {
      const [wx, wz] = k.w(xa, 0),
        q = vcKit(new Kit(I, wx, wz, F.ang));
      kits.push(q);
      return q;
    };
    const units = (gf) =>
      (B.units || []).forEach(([a, b, sp], i) => {
        const [x0, x1] = seg(a, b);
        if (sp.wallSign) sp._s0 = a;
        unit(
          sub(x0),
          0,
          x1 - x0,
          gf - (sp.sd || 0),
          sp,
          bi * 20 + i,
          r,
          sp.pier || (sp.g === 'gate' ? '#d9d6cf' : pier)
        );
      });
    const strip = (x0, x1, z0, z1, col, y = 0.05) => {
      for (let x = x0; x < x1 - 0.01; x += 5)
        sub(x).box(x === x0 ? -0.01 : 0, Math.min(5, x1 - x) + 0.01, -0.5, y, z0, z1, col, {
          col: false,
          surface: true,
        });
    };
    const apronOf = (col) => strip(0, w, -F.apron, 0, col);
    for (const [ps, off, len, dep, py0, py1, col, bush] of B.props || []) {
      const zc = -(B.set - off);
      sub(F.X(ps)).box(
        -len / 2,
        len / 2,
        py0,
        py1,
        zc - dep / 2,
        zc + dep / 2,
        col,
        py0 > 0 ? NC : undefined
      );
      if (bush) sphere(sub(F.X(ps)), 0, py1 + bush * 0.75, zc, bush, '#3f7a3a');
    }
    // SW1：鋪面切成 2.5 m 小塊、各自貼著自己腳下的地面（地面橫向也有高低差，整條的鋪面靠馬路那半會被草地蓋住）；gutter = 最靠馬路那一條的顏色（深灰石板水溝帶）、alt = [色, s0, s1] 換色的區段
    const apron2 = (col, gutter, alt) => {
      const A = F.apron,
        n = Math.max(1, Math.round(A / 1.7)),
        [a0, a1] = alt ? seg(alt[1], alt[2]) : [1, 0];
      for (let x = 0; x < w - 0.01; x += 2.5)
        for (let j = 0; j < n; j++) {
          const l = Math.min(2.5, w - x),
            za = -A + (A * j) / n,
            zb = -A + (A * (j + 1)) / n,
            [wx, wz] = k.w(x + l / 2, (za + zb) / 2),
            q = vcKit(new Kit(I, wx, wz, F.ang));
          kits.push(q);
          q.box(
            -l / 2 - 0.01,
            l / 2 + 0.01,
            -0.6,
            0.07,
            (za - zb) / 2 - 0.01,
            (zb - za) / 2 + 0.01,
            gutter && j === 0 && n > 2
              ? gutter
              : alt && j > 0 && x + l / 2 > a0 && x + l / 2 < a1
                ? alt[0]
                : col,
            { col: false, surface: true }
          );
        }
    };

    if (B.kind === 'tower') {
      const gf = B.gf,
        y2 = B.y2 || gf + 3.0,
        top = B.top || gf + (B.nf - 1) * fh,
        back = B.back,
        [tx0, tx1] = seg(B.s0, B.towerS1 || B.s1);
      k.box(0, w, -0.8, gf, 0, d, B.base ? wallOf(B.base) : wm, { tile: [0.6, 0.6] }); // 一樓
      k.box(tx0, tx1, gf, top, back, d, wm, { tile: [0.6, 0.6] }); // 塔樓
      k.box(tx0 - 0.02, tx1 + 0.02, top, top + 0.12, back - 0.04, d, 'gray', NC);
      if (B.endWins)
        for (let f = 2; f < B.nf; f++)
          for (const zq of B.endWins)
            k.plane(ROWT.alWin(), 1.5, 1.3, tx1 + 0.03, gf + (f - 1) * fh + 1.6, zq, Math.PI / 2); // s 大那一端山牆靠前的窗（SW 審查加的）
      if (B.band2 === 'terrace') {
        // 二樓退縮露台，多數封成鋁窗加墨綠浪板雨遮
        const T2 = B.terrace2 || { par: 0.9, top: 2.75, wy: 1.6, wh: 1.4 };
        k.box(
          0,
          w,
          gf,
          gf + T2.par,
          0,
          0.18,
          B.terraceWall ? wallOf(B.terraceWall) : B.parapet,
          NC
        );
        if (B.terraceSegs)
          for (const [a, b, type, gc = '#3f6a55'] of B.terraceSegs) {
            // 二樓露台照街景逐戶指定
            const [x, x1] = seg(a, b),
              xm = (x + x1) / 2;
            if (type === 'alu') {
              k.box(x, x1, gf, gf + T2.top, 0.2, back, '#e6e2d6', NC);
              const nw = Math.max(1, Math.round((x1 - x) / 1.5)),
                pw = (x1 - x) / nw;
              for (let j = 0; j < nw; j++)
                k.plane(
                  ROWT.alWin(),
                  pw - 0.08,
                  T2.wh,
                  x + (j + 0.5) * pw,
                  gf + T2.wy,
                  0.18,
                  FRONT
                );
              k.box(
                x - 0.05,
                x1 + 0.05,
                gf + T2.top,
                gf + T2.top + 0.08,
                -0.35,
                back,
                B.canopy,
                NC
              );
            } else if (type === 'grille') {
              win(k, xm, gf + 1.3, Math.min(2.6, x1 - x - 0.6), 1.4, back, r, false);
              k.plane(
                barsTex(gc),
                x1 - x,
                T2.top - T2.par,
                xm,
                gf + (T2.par + T2.top) / 2,
                0.1,
                FRONT,
                { transparent: true, double: true }
              );
              k.box(
                x - 0.05,
                x1 + 0.05,
                gf + T2.top,
                gf + T2.top + 0.07,
                -0.55,
                back,
                B.canopy,
                NC
              );
              for (const xx of [x, x1 - 0.06])
                k.box(xx, xx + 0.06, gf + T2.par, gf + T2.top, 0.06, 0.12, gc, NC);
            } else if (type === 'glass') {
              win(k, xm, gf + 1.3, Math.min(2.6, x1 - x - 0.6), 1.4, back, r, false);
              glassBox(k, x + 0.3, x1 - 0.3, gf + T2.par, y2 + 0.5, back, 0.6, false);
            } // 三樓的玻璃凸窗往下包到二樓露台（第三輪東北側）
            else {
              win(k, xm, gf + 1.3, Math.min(2.6, x1 - x - 0.6), 1.4, back, r, false);
              sphere(k, x + 0.9, gf + T2.par + 0.45, 0.9, 0.6, '#2f5f33');
            }
          }
        else
          for (let x = 0.2; x < w - 1; x += 4.4) {
            const x1 = Math.min(w - 0.2, x + 4.3);
            if (r() < 0.75) {
              k.box(x, x1, gf, gf + T2.top, 0.2, back, '#e6e2d6', NC);
              k.plane(ROWT.alWin(), x1 - x - 0.5, T2.wh, (x + x1) / 2, gf + T2.wy, 0.18, FRONT);
              k.box(
                x - 0.05,
                x1 + 0.05,
                gf + T2.top,
                gf + T2.top + 0.08,
                -0.35,
                back,
                B.canopy,
                NC
              );
            } else win(k, (x + x1) / 2, gf + 1.5, x1 - x - 0.8, 1.6, back, r, false);
          }
        towerFace(k, B, F, tx0, tx1, y2, B.nf - 2, back, r);
      } else if (B.band2 === 'podium') {
        // 兩層裙樓：二樓連續橫窗加小瓦片斜屋簷
        k.box(0, w, gf, y2 + 0.2, 0, back + 0.01, wallOf(B.base), { tile: [0.6, 0.6] });
        const podX = (B.podWins || []).map(([a, b]) => seg(a, b));
        if (B.podWins) podWins(k, B, seg, y2);
        for (let x = 0.4; x < w - 1; x += 3.4) {
          const wx = Math.min(w - 1.9, x + 1.5),
            wy = B.y2 ? y2 - 0.65 : gf + 1.6;
          if (podX.some(([p, q]) => wx > p - 1.6 && wx < q + 1.6)) continue; // podWins 指定的段落不畫預設白格柵窗
          k.plane(ROWT.alWin(), 3.0, 1.6, wx, wy, -0.02, FRONT);
          if (B.y2) {
            k.plane(barsTex('#d8d8d2'), 3.0, 1.6, wx, wy, -0.05, FRONT, {
              transparent: true,
              double: true,
            });
            k.box(wx - 1.6, wx + 1.6, wy - 0.92, wy - 0.82, -0.1, 0, '#d8d6cf', NC);
          }
        } // 窗頂貼著屋簷（街景量窗台約 5.9、窗頂約 7.5）
        if (B.bayWin) {
          const [b0, b1] = seg(B.bayWin[0], B.bayWin[1]);
          k.box(b0, b1, y2 - 1.55, y2 + 0.12, -0.5, 0, '#8a6a4a', NC);
          k.plane(ROWT.alWin(), b1 - b0 - 0.16, 1.45, (b0 + b1) / 2, y2 - 0.7, -0.51, FRONT);
          k.box(b0 - 0.05, b1 + 0.05, y2 + 0.12, y2 + 0.2, -0.6, 0, '#6e5a50', NC);
        } // 車道上方外凸的木色框鋁窗
        k.box(-0.05, w + 0.05, gf - 0.1, gf + 0.1, -0.2, 0, '#d8d6cf', NC);
        k.box(-0.05, w + 0.05, y2 + 0.2, y2 + 0.32, -0.45, back, B.eaveCol || '#a4583e', NC);
        k.box(-0.05, w + 0.05, y2 + 0.32, y2 + 0.5, -0.1, back, B.eaveCol || '#a4583e', NC);
        const [g0, g1] = seg(109, 122);
        if (B.y2) {
          k.box(g0, g1, y2 - 2.2, y2 + 0.2, -0.08, 0, '#27332e', NC);
          k.box(g0, g1, y2 - 2.2, y2 - 1.7, -0.11, 0, wallOf(B.base), NC);
          k.box(g0 - 0.05, g1 + 0.05, y2 - 0.1, y2 + 0.2, -0.5, 0, '#2f8f6a', NC);
          for (let x = g0; x <= g1 + 0.01; x += (g1 - g0) / 5)
            k.box(
              Math.min(x, g1 - 0.1),
              Math.min(x, g1 - 0.1) + 0.1,
              y2 - 1.9,
              y2 - 0.1,
              -0.12,
              -0.02,
              '#2f8f6a',
              NC
            );
        } // 實牆只到窗台高，上面是露台加綠色採光罩（綠柱＋綠浪板）
        else {
          k.box(g0, g1, gf + 0.6, y2 + 0.1, -0.06, 0, wallOf(B.base), NC);
          k.box(g0, g1, y2 + 0.5, y2 + 1.3, 0.2, back, '#2f8f6a', NC);
        } // 這一段是實牆女兒牆，後面露台蓋綠色採光罩
        if (tx1 < w - 0.5 || tx0 > 0.5) {
          const [e0, e1] = seg(B.towerS1, B.s1);
          k.box(e0, e1, y2 + 0.2, y2 + 0.5, back, d, '#c8703a', NC);
        }
        towerFace(k, B, F, tx0, tx1, y2 + 0.5, B.nf - 2, back, r);
      } else {
        // 二樓整排外凸的加蓋帶
        const [c0, c1] = seg(B.s0, B.band2Glass),
          [q0, q1] = seg(B.band2Glass, B.s1);
        const alu = (B.band2Segs || []).filter((q) => q[2] === 'alu').map((q) => seg(q[0], q[1]));
        let lx = 0;
        for (const [a0, a1] of [...alu.sort((p, q) => p[0] - q[0]), [w, w]]) {
          if (a0 > lx) k.box(lx, a0, gf - 0.05, gf + 0.1, -1.0, 0, '#9a9a94', NC);
          lx = Math.max(lx, a1);
        } // 外凸 1 m 的樓板邊；alu 那幾段窗帶貼著牆，不畫
        if (B.band2Segs)
          for (const [a, b, type, bt] of B.band2Segs) {
            const [x0, x1] = seg(a, b);
            band2Seg(k, x0, x1, gf, type, B, bt);
          }
        else {
          // SW1：分段型式
          for (let x = c0; x < c1 - 0.01; x += 2.5) {
            const l = Math.min(2.5, c1 - x);
            k.plane(barsTex('#8a8d90'), l, 2.3, x + l / 2, gf + 1.25, -1.0, FRONT, {
              transparent: true,
              double: true,
            });
          }
          k.box(c0, c1, gf + 2.4, gf + 2.5, -1.25, 0, B.canopy, NC);
        }
        if (q1 - q0 > 0.1) {
          k.box(q0, q1, gf + 0.1, gf + 2.4, -1.0, 0, '#cfe0e0', NC);
          for (let x = q0; x <= q1 + 0.01; x += 1.2)
            k.box(
              Math.min(x, q1 - 0.07),
              Math.min(x, q1 - 0.07) + 0.07,
              gf + 0.1,
              gf + 2.5,
              -1.03,
              -1.0,
              '#f2f2ee',
              NC
            );
          k.box(q0, q1, gf + 2.4, gf + 2.5, -1.1, 0, '#f2f2ee', NC);
        }
        for (let x = 1.2; x < w - 1; x += 4.4) win(k, x + 1, gf + 1.5, 2.6, 1.5, 0, r, false);
        towerFace(k, B, F, tx0, tx1, y2, B.nf - 2, 0, r);
      }
      for (const s of B.stairs) {
        const x = F.X(s);
        if (x > tx0 + 1 && x < tx1 - 1) {
          k.box(x - 2.2, x + 2.2, top + 0.12, top + 2.9, back + 1.5, back + 7, wm, NC);
          k.box(x - 2.4, x + 2.4, top + 2.9, top + 3.0, back + 1.3, back + 7.2, 'gray', NC);
          k.cyl(x + 3.4, back + 5, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 10 });
        }
      }
      backWins(k, w, d, gf, B.nf, fh, y2);
      units(gf);
      // 人行道鋪面、花台、盆栽
      apronOf(B.paving || '#a3a19b');
      if (B.pavBand)
        for (let x = 2.5; x < w; x += 5)
          sub(x).box(0, 0.2, 0.05, 0.056, -F.apron, 0, B.pavBand, NC);
      if (B.pavAlt) {
        const [a0, a1] = seg(B.pavAlt[1], B.pavAlt[2]);
        strip(a0, a1, -F.apron + 1.2, 0, B.pavAlt[0], 0.057);
      }
      if (B.apron2) apron2(B.paving, B.apron2.gutter, B.pavAlt); // SW1
      if (B.planters) {
        const P = B.planters,
          zc = -(B.set - P.off);
        P.at.forEach((s, j) => {
          const x = F.X(s),
            l2 = P.len / 2,
            q = sub(x);
          q.box(-l2, l2, 0, 0.6, zc - P.dep / 2, zc + P.dep / 2, P.tile);
          q.box(
            -l2 + 0.15,
            l2 - 0.15,
            0.6,
            P.len > 3 ? 0.95 : 0.7,
            zc - P.dep / 2 + 0.15,
            zc + P.dep / 2 - 0.15,
            '#2f5f33',
            NC
          );
          const br = P.len > 3 ? 0.68 : 0.55,
            bd = P.len > 3 ? 1.05 : 0.55;
          for (const dx of j % 4 === 3 && P.len <= 3 ? [0] : [-bd, bd])
            sphere(q, dx, 0.7 + br * 0.8, zc, br, (j + (dx > 0)) % 3 ? '#2f5f33' : '#39683a'); // 多數花台是兩顆修成球形的深綠灌木
          if (P.len > 3 && (P.trees ? P.trees.includes(j) : j % 3 === 1))
            tree(q, 0, zc, 2.2, 0.8, r);
          if (P.bollards && j) {
            const g = sub((F.X(P.at[j - 1]) + x) / 2);
            for (const dx of [-0.5, 0.5]) {
              g.cyl(dx, zc, 0.07, 0, 0.9, '#e8882a', { seg: 6 });
              g.cyl(dx, zc, 0.075, 0.5, 0.65, '#f2f2ee', { seg: 6 });
            }
          }
        });
      }
      if (B.pots)
        for (let s = B.pots.from; s <= B.pots.to; s += B.pots.every) {
          const q = sub(F.X(s)),
            zc = -(B.set - B.pots.off);
          q.cyl(0, zc, 0.3, 0, 0.62, '#f2f1ec', { seg: 12, col: true });
          if (B.pots.palm) {
            q.cyl(0, zc, 0.05, 0.62, 1.3, '#6a5a3a', { seg: 6 });
            for (let j = 0; j < 7; j++) {
              const a = j * 0.9;
              rbox(
                q,
                Math.sin(a) * 0.4,
                1.3 + (j % 2) * 0.12,
                zc + Math.cos(a) * 0.4,
                0.17,
                0.03,
                0.9,
                a,
                j % 2 ? '#3f7a3a' : '#356b36',
                0.42
              );
            }
          } else sphere(q, 0, 1.0, zc, 0.45, '#3f7a3a');
        } // 白色圓筒花盆種棕櫚
      return;
    }

    if (B.kind === 'walkup') {
      const gf = B.gf,
        top = gf + (B.nf - 1) * fh,
        cr = B.corner,
        wBody = cr ? w - cr.r : w;
      if (B.recess) {
        const [r0, r1] = seg(B.recess[0], B.recess[1]),
          rz = B.recess[2];
        k.box(r0, r1, -0.8, gf, rz, d, wm, { tile: [0.6, 0.6] });
        if (r0 > 0.01) k.box(0, r0, -0.8, gf, 0, d, wm, { tile: [0.6, 0.6] });
        if (r1 < w - 0.01) k.box(r1, w, -0.8, gf, 0, d, wm, { tile: [0.6, 0.6] });
        k.box(0, wBody, gf, top, 0, d, wm, { tile: [0.6, 0.6] });
        for (const s of B.pillars) {
          const x = F.X(s);
          k.box(x - 0.25, x + 0.25, 0, gf, 0, 0.5, wm);
        }
        strip(r0, r1, 0, rz, '#8f8a80', 0.06);
        if (B.crazy)
          for (let x = r0; x < r1 - 0.01; x += 5) {
            const l = Math.min(5, r1 - x);
            sub(x).plane(crazyTex, l, rz, l / 2, 0.066, rz / 2).rotation.x = -Math.PI / 2;
          }
      } else k.box(0, wBody, -0.8, top, 0, d, wm, { tile: [0.6, 0.6] });
      if (cr) {
        k.box(-0.02, wBody, top, top + 0.12, -0.04, d, 'gray', NC);
        k.box(wBody, w + 0.02, top, top + 0.12, cr.r, d, 'gray', NC);
        k.cyl(wBody, cr.r, cr.r + 0.03, top, top + 0.12, 'gray', { seg: 20 });
      } // 圓弧轉角的屋頂板跟著圓弧
      else k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', NC);
      if (cr) {
        // 圓弧轉角：一樓方正基座，二樓以上圓弧
        k.box(wBody, w, -0.8, gf, 0, d, cr.wall);
        k.box(wBody, w, gf, top, cr.r, d, cr.wall);
        k.cyl(wBody, cr.r, cr.r, gf, top, cr.wall, { seg: 20 });
        for (let f = 1; f < B.nf; f++)
          for (const a of [0.35, 0.8, 1.25]) {
            const y = gf + (f - 1) * fh + 1.5,
              px = wBody + Math.sin(a) * (cr.r + 0.03),
              pz = cr.r - Math.cos(a) * (cr.r + 0.03),
              lit = r() < 0.22;
            k.plane(
              lit ? litWin : ROWT.alWin(),
              0.9,
              1.6,
              px,
              y,
              pz,
              Math.PI - a,
              lit ? { emissive: 0.45 } : {}
            );
          }
        for (let f = 1; f < B.nf; f++)
          for (const q of [0.45, 0.65, 0.85])
            k.plane(ROWT.alWin(), 1.0, 1.6, w + 0.03, gf + (f - 1) * fh + 1.5, d * q, Math.PI / 2);
        for (const q of [0.5, 0.78])
          k.plane(shutterTex('#8a8d90'), d * 0.24, 2.7, w + 0.03, 1.35, d * q, Math.PI / 2);
        k.box(w, w + 0.7, 2.75, 2.9, d * 0.36, d * 0.92, '#6f6f6f', NC);
        if (cr.side) {
          k.box(w, w + 0.75, 2.5, 3.2, cr.r + 0.2, cr.r + 0.3, cr.side[1], NC);
          for (const sd of [-1, 1])
            k.plane(
              paint(cr.side[0], cr.side[1], cr.side[2], null, 0.7, 0.66),
              0.7,
              0.66,
              w + 0.38,
              2.85,
              cr.r + 0.25 + sd * 0.06,
              sd > 0 ? 0 : Math.PI,
              { emissive: 0.3 }
            );
        }
        k.box(wBody - 0.4, w, 0, 0.9, -0.07, 0, B.baseCol, NC);
        k.box(0, w, gf - 0.1, gf + 0.08, -0.08, 0, '#cfc8b8', NC);
      }
      if (B.trim) k.box(0, w, gf - 0.15, gf + 0.2, -0.08, 0, B.trim, NC);
      if (B.endWall) k.box(-0.03, 0, gf, top, 0, d, B.endWall, NC);
      if (B.endWin)
        for (let f = 1; f < B.nf; f++)
          for (const q of [0.28, 0.6]) {
            const y = gf + (f - 1) * fh + 1.6;
            k.plane(YHT.win(), 1.0, 1.1, -0.05, y, d * q, -Math.PI / 2);
            k.plane(barsTex(B.cage), 1.25, 1.3, -0.3, y, d * q, -Math.PI / 2, {
              transparent: true,
              double: true,
            });
            k.box(-0.3, -0.03, y - 0.68, y - 0.64, d * q - 0.62, d * q + 0.62, '#b9b6ae', NC);
          } // 山牆兩排小窗各帶白色小鐵窗
      const BY = B.bays ? B.bays.map(([a, b, t]) => [...seg(a, b), t]) : null,
        bayW = B.bay || 4.4,
        nb = BY ? BY.length : Math.max(1, Math.round(wBody / bayW)),
        bw0 = wBody / nb;
      for (let f = 1; f < B.nf; f++) {
        const y = gf + (f - 1) * fh;
        for (let j = 0; j < nb; j++) {
          const b0 = BY ? BY[j][0] : j * bw0,
            b1 = BY ? BY[j][1] : b0 + bw0,
            bw = b1 - b0,
            bc = (b0 + b1) / 2,
            bt = BY ? BY[j][2] : B.bayPlain && B.bayPlain.includes(j) ? 'plain' : null;
          if (bt === 'strip') {
            k.plane(YHT.win(), 0.7, 0.9, bc, y + 1.7, -0.02, FRONT);
            if (r() < 0.5) ac(k, bc - 0.4, y + 0.35, 0);
            k.box(bc + 0.42, bc + 0.5, gf, top, -0.1, 0, '#7a4a3a', NC);
            continue;
          } // 兩個鐵窗籠之間的窄牆：一扇小窗、一支落水管
          if (bt === 'white') {
            // 偏白磁磚牆、外凸的米色直條鐵窗
            if (f === 1) k.box(b0, b1, gf + 0.02, top, -0.04, 0, '#e6e2da', NC);
            win(k, bc, y + 1.5, bw - 2.0, 1.6, -0.04, r, false);
            k.plane(barsTex('#d8cdb0'), bw - 1.5, 2.1, bc, y + 1.35, -0.62, FRONT, {
              transparent: true,
              double: true,
            });
            for (const sd of [-1, 1])
              k.plane(
                barsTex('#d8cdb0'),
                0.6,
                2.1,
                bc + sd * (bw / 2 - 0.75),
                y + 1.35,
                -0.32,
                (sd * Math.PI) / 2,
                { transparent: true, double: true }
              );
            k.box(b0 + 0.75, b1 - 0.75, y + 0.26, y + 0.32, -0.62, 0, '#b9b6ae', NC);
            if (r() < 0.6) ac(k, b0 + 0.9, y + 0.36, -0.1);
            continue;
          }
          if (bt === 'plain') {
            if (f === 1) k.box(b0 + 0.25, b1 - 0.25, y + 0.1, y + 2.9, -0.03, 0, '#e6e2da', NC);
            for (const q of [0.3, 0.7]) {
              win(k, b0 + bw * q, y + 1.7, 1.5, 1.4, -0.03, r, false);
              ac(k, b0 + bw * q - 0.4, y + 0.42, -0.03);
            }
            continue;
          } // 沒有鐵窗的開間
          if (B.bal === 'cage') {
            // 大型外凸白色鐵窗加青綠浪板雨遮
            win(k, bc, y + 1.5, bw - 1.6, 1.6, 0, r, false);
            k.plane(barsTex(B.cage), bw - 1.2, 2.2, bc, y + 1.35, -0.8, FRONT, {
              transparent: true,
              double: true,
            });
            for (const sd of [-1, 1])
              k.plane(
                barsTex(B.cage),
                0.8,
                2.2,
                bc + sd * (bw / 2 - 0.6),
                y + 1.35,
                -0.4,
                (sd * Math.PI) / 2,
                { transparent: true, double: true }
              );
            k.box(b0 + 0.55, b1 - 0.55, y + 0.2, y + 0.27, -0.8, 0, '#b9b6ae', NC);
            k.box(b0 + 0.45, b1 - 0.45, y + 2.5, y + 2.58, -1.0, 0, B.cageRoof, NC);
            k.plane(YHT.win(), 0.7, 0.9, b1 - 0.02, y + 1.7, -0.02, FRONT);
          } else if (B.bal === 'open') {
            // 實心磚砌陽台牆＋後退的深咖啡落地窗
            k.box(b0 + 0.2, b1 - 0.2, y + 1.05, y + 2.75, -0.03, 0, '#2a2420', NC);
            k.box(b0, b1, y - 0.12, y + 1.0, -0.16, 0, wm, { col: false, tile: [0.6, 0.6] });
            if (f === 1 && B.par2) {
              const [q0, q1] = seg(B.s0, B.par2[1]);
              k.box(q0, q1, y - 0.12, y + 1.0, -0.17, 0, B.par2[0], NC);
            } // 二樓前段那一條是白色小方磚
            k.box(b0, b1, y + 1.0, y + 1.08, -0.2, 0, '#b08a5e', NC); // 外凸的磚砌陽台牆與壓頂
            const ps = [
              b0 + 0.2,
              ...(B.piers || []).map((s) => F.X(s)).filter((x) => x > b0 + 1 && x < b1 - 1),
              b1 - 0.2,
            ];
            for (let p = 0; p < ps.length - 1; p++) {
              const p0 = ps[p],
                p1 = ps[p + 1],
                pc = (p0 + p1) / 2,
                pw = p1 - p0 - 0.7;
              k.box(
                pc - pw / 2 - 0.08,
                pc + pw / 2 + 0.08,
                y + 1.1,
                y + 2.7,
                -0.05,
                0,
                B.frame,
                NC
              );
              winL(k, pc, y + 1.9, pw, 1.5, -0.04, r);
              if (p) {
                k.box(p0 - 0.2, p0 + 0.2, y + 1.0, y + 2.9, -0.14, 0, wm, {
                  col: false,
                  tile: [0.6, 0.6],
                });
                if (r() < 0.6) ac(k, p0 + 0.4, y + 0.4, -0.14);
              }
            }
          } else if (B.bal === 'rail') {
            // 深灰厚底座＋白色不鏽鋼橫桿欄杆
            win(k, bc, y + 1.55, bw - 1.2, 1.6, 0, r, false);
            k.box(b0 + 0.25, b1 - 0.25, y - 0.05, y + 0.25, -0.9, 0, B.trim, NC);
            for (const yy of [0.55, 0.8, 1.05])
              k.box(b0 + 0.25, b1 - 0.25, y + yy, y + yy + 0.04, -0.9, -0.86, '#e9e9e6', NC);
            for (const x of [b0 + 0.25, b1 - 0.29])
              k.box(x, x + 0.04, y + 0.25, y + 1.09, -0.9, -0.86, '#e9e9e6', NC);
          } else if (B.bal === 'stone') {
            // 深灰洗石厚底座的小陽台（比開間窄）＋白色不鏽鋼橫桿欄杆，後面落地窗；開間交界有幾排小窗
            const h0 = bc - 1.2,
              h1 = bc + 1.2,
              sq = B.shelter && f === 1 ? seg(B.shelter[0], B.shelter[1]) : null;
            if (sq && bc > sq[0] && bc < sq[1]) {
              k.plane(ROWT.alWin(), bw - 1.0, 1.3, bc, y + 1.7, -0.03, FRONT);
              continue;
            } // 鐵架雨棚上方那幾間的二樓是整排橫窗，沒有陽台
            k.box(bc - 0.95, bc + 0.95, y + 0.1, y + 2.4, -0.03, 0, '#3f4f4a', NC);
            k.plane(r() < 0.25 ? litWin : ROWT.alWin(), 1.7, 2.2, bc, y + 1.25, -0.04, FRONT);
            k.box(h0, h1, y - 0.5, y + 0.12, -1.0, 0, B.trim, NC);
            k.box(h0 + 0.3, h1 - 0.3, y - 0.8, y - 0.5, -0.75, 0, B.trim, NC);
            for (const yy of [0.4, 0.65, 0.9, 1.15]) {
              k.box(h0, h1, y + yy, y + yy + 0.04, -1.0, -0.96, '#e9e9e6', NC);
              for (const x of [h0, h1 - 0.04])
                k.box(x, x + 0.04, y + yy, y + yy + 0.04, -1.0, 0, '#e9e9e6', NC);
            }
            for (const x of [h0, bc - 0.02, h1 - 0.04])
              k.box(x, x + 0.04, y + 0.12, y + 1.19, -1.0, -0.96, '#e9e9e6', NC);
            if (B.panel && j === nb - 2) {
              k.box(b1 - 0.75, b1 + 0.75, y + 0.2, y + fh - 0.1, -0.03, 0, B.panel, NC);
              for (const dx of [-0.36, 0.36])
                k.plane(YHT.win(), 0.55, 0.8, b1 + dx, y + 1.7, -0.04, FRONT);
            }
          } else {
            const ww = B.winW || 0.9;
            (B.winQ || [0.3, 0.7]).forEach((q, qi) => {
              if (B.winSmall === qi && f >= 3) {
                k.box(
                  b0 + bw * q - 0.45,
                  b0 + bw * q + 0.45,
                  y + 1.75,
                  y + 2.45,
                  -0.06,
                  0,
                  '#cfc8b8',
                  NC
                );
                k.plane(ROWT.alWin(), 0.7, 0.5, b0 + bw * q, y + 2.1, -0.07, FRONT);
                return;
              } // 三樓以上這一排只有小氣窗
              const wq = f >= 2 ? Math.min(ww, 1.0) : ww;
              k.box(
                b0 + bw * q - wq / 2 - 0.1,
                b0 + bw * q + wq / 2 + 0.1,
                y + 0.7,
                y + 2.6,
                -0.06,
                0,
                '#cfc8b8',
                NC
              );
              winL(k, b0 + bw * q, y + 1.65, wq, 1.7, -0.05, r);
            });
          }
          if (r() < 0.55)
            ac(
              k,
              b0 + 0.2 + r() * 0.3,
              y + 0.3 + (B.bal === 'open' ? 0.1 : 0),
              B.bal === 'cage' ? -0.4 : 0
            );
        }
      }
      if (B.eave && B.eaveCol) {
        const [e0, e1] = seg(B.s0, 137.4);
        for (let j = 0; j < 3; j++)
          k.box(
            e0,
            e1,
            gf - 0.07 - j * 0.14,
            gf + 0.03 - j * 0.14,
            (-B.eave * (j + 1)) / 3,
            (-B.eave * j) / 3,
            B.eaveCol,
            NC
          );
      } // 往路邊斜下去的浪板雨遮
      else if (B.eave) {
        const [e0, e1] = seg(B.s0, 137.4);
        k.box(e0, e1, gf - 0.05, gf + 0.03, -B.eave, 0, '#a8aeb0', NC);
      } // 一樓上緣的浪板雨遮
      if (B.arcs)
        for (const [a, b, col, out = 1.25, drop = 0.6, y0 = gf + 0.25] of B.arcs) {
          // 圓弧採光罩雨遮：從牆面往外往下彎成四分之一圓（第三輪加深弧度：drop 前緣比靠牆處低多少、y0 靠牆處高度），
          // 每隔約 1.2 m 一支白色弧形骨架，前緣一條白色集水槽
          const [c0, c1] = seg(a, b),
            N = 8,
            P = (t) => [
              -out * Math.sin((t * Math.PI) / 2),
              y0 - drop * (1 - Math.cos((t * Math.PI) / 2)),
            ];
          const nr = Math.max(1, Math.round((c1 - c0) / 1.2));
          for (let j = 0; j < N; j++) {
            const [za, ya] = P(j / N),
              [zb, yb] = P((j + 1) / N);
            k.box(c0, c1, yb - 0.02, ya + 0.02, zb, za, col, NC);
            for (let q = 0; q <= nr; q++) {
              const x = Math.min(c0 + ((c1 - c0) * q) / nr, c1 - 0.06);
              k.box(x, x + 0.06, yb - 0.01, ya + 0.06, zb - 0.02, za, '#eeeeea', NC);
            }
          }
          k.box(
            c0,
            c1,
            y0 - drop - 0.12,
            y0 - drop + 0.02,
            -out - 0.06,
            -out + 0.06,
            '#eeeeea',
            NC
          );
          k.box(c0, c1, y0 - 0.04, y0 + 0.06, -0.08, 0, '#eeeeea', NC);
        }
      if (B.plants)
        for (const [s, off, ph] of B.plants) {
          const q = sub(F.X(s));
          q.cyl(0, -off, 0.22, 0, 0.4, '#a5583c', { seg: 8 });
          sphere(q, 0, ph * 0.6, -off, ph * 0.38, '#3f7a3a');
          sphere(q, 0.15, ph * 0.85, -off, ph * 0.26, '#4b8a3e');
        } // 牆前的大盆栽：[s, 離立面線, 高]
      if (B.tin) {
        k.box(0.5, wBody - 0.5, top + 0.12, top + 1.9, 0.8, d - 0.8, '#b9b6ae', NC);
        k.box(0.1, wBody - 0.1, top + 1.9, top + 2.02, 0.3, d - 0.3, B.tin, NC);
      } // 屋頂鐵皮加蓋
      if (B.props2)
        for (const [s, off, pw, pd, ph, col, cap] of B.props2) {
          const q = sub(F.X(s));
          q.box(-pw / 2, pw / 2, 0, ph, -off - pd / 2, -off + pd / 2, col);
          if (cap)
            q.box(
              -pw / 2 - 0.04,
              pw / 2 + 0.04,
              0,
              0.2,
              -off - pd / 2 - 0.04,
              -off + pd / 2 + 0.04,
              cap,
              NC
            );
        } // 路邊的設備箱、機台：[s, 離立面線, 寬, 深, 高, 色, 底座色]
      if (B.poles)
        for (const [s, off, ph] of B.poles) {
          const q = sub(F.X(s));
          q.cyl(0, -off, 0.15, 0, ph, '#8a8a84', { seg: 8, col: true });
          q.box(-0.9, 0.9, ph - 1.1, ph - 1.0, -off - 0.05, -off + 0.05, '#6a6a66', NC);
          for (const dx of [-0.45, 0.45])
            q.cyl(dx, -off - 0.3, 0.22, ph - 2.6, ph - 2.2, '#9a9a94', { seg: 8 });
        } // 水泥電線桿：橫擔、兩個廣播喇叭
      if (B.endSign) {
        const [art, ew, eh, ey, ez] = B.endSign;
        k.box(-0.14, 0, ey, ey + eh, ez, ez + ew, '#f8f6f0', NC);
        k.plane(
          artTex(art, ew, eh),
          ew - 0.08,
          eh - 0.08,
          -0.15,
          ey + eh / 2,
          ez + ew / 2,
          -Math.PI / 2,
          { emissive: 0.35 }
        );
      } // s1 那一端山牆上的大招牌
      if (B.shelter && B.shelter[3] === 'light') {
        // 輕鋼架雨棚：細圓管柱、方管樑、往路邊略斜的透明浪板
        const [h0, h1] = seg(B.shelter[0], B.shelter[1]),
          hy = B.shelter[2] || 3.0,
          zo = -F.apron + 1.0,
          hi = hy + 0.45,
          dep = -0.2 - zo,
          th = Math.atan2(hi - hy, dep),
          col = '#b4b9bc';
        for (const x of [h0 + 0.12, (h0 + h1) / 2, h1 - 0.12]) {
          k.cyl(x, zo, 0.05, 0, hy, col, { seg: 8, col: true });
          k.cyl(x, -0.2, 0.045, 0, hi, col, { seg: 8 });
          rbox(
            k,
            x,
            (hy + hi) / 2,
            (zo - 0.2) / 2,
            0.05,
            0.07,
            Math.hypot(dep, hi - hy) + 0.5,
            0,
            col,
            -th
          );
        }
        k.box(h0, h1, hy - 0.07, hy, zo - 0.035, zo + 0.035, col, NC);
        k.box(h0, h1, hi - 0.07, hi, -0.235, -0.165, col, NC);
        k.plane(
          clearTex,
          h1 - h0 + 0.3,
          Math.hypot(dep, hi - hy) + 0.55,
          (h0 + h1) / 2,
          (hy + hi) / 2 + 0.07,
          (zo - 0.2) / 2,
          0,
          { transparent: true, double: true }
        ).rotation.x = -Math.PI / 2 - th;
      } else if (B.shelter) {
        const [h0, h1] = seg(B.shelter[0], B.shelter[1]),
          hy = B.shelter[2] || 3.0;
        k.box(h0, h1, hy, hy + 0.1, -F.apron + 0.3, 0, '#8a8d90', NC);
        for (let x = h0 + 0.1; x <= h1; x += (h1 - h0 - 0.2) / 3)
          k.box(x - 0.05, x + 0.05, 0, hy, -F.apron + 0.35, -F.apron + 0.45, '#8a8d90');
      }
      if (B.roofShed) {
        k.box(0.4, wBody - 0.4, top + 2.5, top + 2.58, 0.3, d * 0.55, B.roofShed, NC);
        for (let x = 0.5; x <= wBody - 0.5; x += (wBody - 1) / 4)
          for (const zz of [0.4, d * 0.55 - 0.1])
            k.box(x - 0.04, x + 0.04, top + 0.12, top + 2.5, zz - 0.04, zz + 0.04, B.roofShed, NC);
      } // 屋頂綠色鐵架採光棚
      k.box(wBody * 0.3, wBody * 0.3 + 3, top + 0.12, top + 2.6, d * 0.4, d * 0.4 + 3, wm, NC);
      k.cyl(wBody * 0.7, d * 0.6, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 10 });
      backWins(k, w, d, gf, B.nf, fh);
      units(gf);
      apronOf(B.paving || '#bdb8ae');
      if (B.gapPave) strip(w, w + B.gapPave[0], -F.apron, 0, B.gapPave[1]); // 跟隔壁棟之間的窄縫也鋪起來（不然是草地）
      if (B.pavIn) {
        strip(0, w, -B.pavIn[1], 0, B.pavIn[0], 0.057);
        if (B.pavIn[2]) {
          strip(0, w, -B.pavIn[1] - 0.25, -B.pavIn[1], B.pavIn[2], 0.058);
          for (let x = 4.4; x < w - 1; x += 4.4)
            sub(x).box(-0.12, 0.12, 0.05, 0.059, -F.apron, 0, B.pavIn[2], NC);
        }
      } // 靠牆的白色方磚地坪＋深灰分隔帶
      return;
    }

    if (B.kind === 'plainBlock') {
      // 沒有店面的舊樓：素牆、小窗
      const gf = B.gf || 3.3,
        top = gf + (B.nf - 1) * fh;
      k.box(0, w, -0.8, top, 0, d, B.plain ? B.wall : wm, { tile: [0.9, 0.9] });
      k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', NC);
      if (B.sideWall) k.box(-0.03, 0, 0, top, -0.03, d, B.sideWall, NC);
      if (B.sideWins)
        for (let f = 1; f < B.nf; f++)
          for (const zq of B.sideWins) {
            const yy = gf + (f - 1) * fh + 1.55;
            k.plane(ROWT.alWin(), 0.9, 1.0, w + 0.05, yy, zq, Math.PI / 2);
            k.plane(barsTex('#4a4a48'), 1.0, 1.1, w + 0.18, yy, zq, Math.PI / 2, {
              transparent: true,
              double: true,
            });
            k.box(w + 0.03, w + 0.2, yy - 0.62, yy - 0.55, zq - 0.55, zq + 0.55, '#7a7884', NC);
          } // 第三輪東北側：s0 那一端（西北）側牆每層的鐵窗小窗
      if (B.duct) {
        const [dz, dw] = B.duct;
        k.box(w, w + dw, 0, top + 0.4, dz - dw / 2, dz + dw / 2, '#8e9094', NC);
        for (let y = 2.2; y < top; y += fh)
          k.box(
            w,
            w + dw + 0.04,
            y,
            y + 0.08,
            dz - dw / 2 - 0.04,
            dz + dw / 2 + 0.04,
            '#76787c',
            NC
          );
      } // 第三輪東北側：西北側牆靠前角、從屋頂直通地面的粗灰色風管
      if (B.topBand) {
        k.box(0, w, top - fh, top, -0.03, 0, B.topBand, NC);
        k.box(w, w + 0.03, top - fh, top, 0, d, B.topBand, NC);
      }
      if (B.low) k.box(0, w, 0, B.mural ? gf : 1.6, -0.04, 0, B.low, NC);
      if (B.f2) k.box(0, w, gf, gf + fh, -0.04, 0, B.f2, NC);
      if (B.mural) {
        const [t, bg, fg, sub] = B.mural;
        k.plane(
          paint(t, bg, fg, sub, w - 1, gf - 0.5, 64),
          w - 1,
          gf - 0.5,
          w / 2,
          gf / 2 + 0.1,
          -0.05,
          FRONT,
          { emissive: 0.12 }
        );
        k.box(w * 0.55, w * 0.55 + 1.1, 0, 2.2, -0.07, 0, '#1c1c1e', NC);
        k.box(w * 0.32, w * 0.32 + 0.9, gf + 0.6, gf + 1.5, -0.5, 0, '#1c1c1e', NC);
      }
      for (let f = 1; f < B.nf; f++) {
        const n = Math.max(1, Math.round(w / 4));
        for (let j = 0; j < n; j++)
          win(
            k,
            (w * (j + 0.5)) / n,
            gf + (f - 1) * fh + 1.5,
            B.f2 && f === 1 ? 2.2 : 1.3,
            1.3,
            0,
            r,
            !(B.f2 && f === 1)
          );
      }
      if (B.bar) {
        // SW1：酒吧側牆（一樓整面星空圖輸出與小門、二樓灰色面板加直立深色玻璃窗、外凸方形燈箱）
        const A = B.bar,
          dx = F.X(A.door),
          bx = F.X(A.box),
          mh = gf + 0.2;
        k.box(0, w, mh, gf + fh, -0.06, 0, A.panel, NC);
        k.box(0, w, gf + 1.6, gf + 1.63, -0.065, -0.06, '#9a9da3', NC);
        for (let x = 0.4; x < w; x += 2.3)
          k.box(x, x + 0.03, mh, gf + fh, -0.065, -0.06, '#9a9da3', NC);
        for (const [a, b] of A.wins) {
          const [x0, x1] = seg(a, b);
          k.box(x0 - 0.06, x1 + 0.06, gf + 0.5, gf + 2.85, -0.09, -0.06, '#5a4a40', NC);
          k.plane(barGlass, x1 - x0, 2.25, (x0 + x1) / 2, gf + 1.67, -0.1, FRONT);
        }
        k.plane(starTex(w, mh, B), w, mh, w / 2, mh / 2, -0.05, FRONT, { emissive: 0.1 });
        k.box(dx - 0.5, dx + 0.5, 0, 2.2, -0.08, 0, '#d9d6cf', NC);
        k.box(dx - 0.4, dx + 0.4, 0, 2.08, -0.09, 0, '#16161a', NC);
        k.box(dx - 0.6, dx + 0.6, 2.22, 2.3, -0.45, 0, '#6a5a48', NC);
        for (const sd of [-1, 1])
          k.box(
            dx + sd * 0.72 - 0.07,
            dx + sd * 0.72 + 0.07,
            1.95,
            2.2,
            -0.2,
            -0.05,
            '#2a2a2c',
            NC
          );
        k.box(dx - 1.3, dx - 0.8, 0.95, 1.7, -0.08, -0.05, '#1c1c1e', NC);
        k.box(bx - 0.14, bx + 0.14, gf + 0.7, gf + 2.2, -1.0, -0.06, '#17171a', NC);
        for (const sd of [-1, 1])
          k.plane(barBox, 0.9, 1.5, bx + sd * 0.15, gf + 1.45, -0.53, (sd * Math.PI) / 2, {
            emissive: 0.4,
          });
        apron2('#8f8d88');
        for (const x of [w - 1.0, w - 0.4]) {
          k.box(x - 0.24, x + 0.24, 0.4, 0.46, -0.75, -0.25, '#e6d3a0', NC);
          k.box(x - 0.24, x + 0.24, 0.46, 0.9, -0.3, -0.25, '#e6d3a0', NC);
          k.box(x - 0.03, x + 0.03, 0, 0.4, -0.5, -0.44, '#2a2a2c', NC);
        }
      }
      if (B.roofCol) {
        k.box(0.3, w - 0.3, top + 0.12, top + 2.2, 1, d - 1, B.roofWall || '#b9b6ae', NC);
        if (B.roofWall)
          for (let x = 0.45; x < w - 0.4; x += 0.3)
            k.box(x, x + 0.05, top + 0.12, top + 2.2, 0.97, 1, '#93b89b', NC);
        k.box(0, w, top + 2.2, top + 2.32, 0.5, d - 0.5, B.roofCol, NC);
      }
      k.box(w - 0.5, w - 0.35, 0, top, -0.15, 0, '#8a8d90', NC);
      backWins(k, w, d, gf, B.nf, fh);
      if (B.trees)
        for (const [s, off] of B.trees) {
          const x = F.X(s),
            z = -(B.set - off);
          k.cyl(x, z, 1.1, 0, 0.5, '#e6e4de', { seg: 12, col: true });
          tree(k, x, z, 7, 2.2, r);
        }
      k.box(-0.01, w + 0.01, -0.5, 0.05, -F.apron, 0, MR.concrete, { col: false, surface: true });
      return;
    }

    if (B.kind === 'hut') {
      // 一層小屋／鐵皮屋
      const gf = 3.2;
      k.box(0, w, -0.8, gf, 0, d, B.wall, { tile: [0.6, 0.6] });
      if (B.low) k.box(0, w, 0, 0.9, -0.03, 0, B.low, NC);
      k.box(-0.15, w + 0.15, gf, gf + 0.12, -(B.eave || 1.0), d, B.roofCol, NC);
      if (B.eave)
        for (const x of [0.1, w - 0.16])
          k.box(x, x + 0.06, 0, gf, -B.eave + 0.1, -B.eave + 0.16, '#8a8d90', NC);
      units(gf - 0.1);
      k.box(-0.01, w + 0.01, -0.5, 0.05, -F.apron, 0, MR.concrete, { col: false, surface: true });
      return;
    }

    if (B.kind === 'shed') {
      // SW1：一層鐵皮店面（下半牆 gf、上半浪板到 top、斜雨遮 eave），後面可接一棟舊屋 rear { z, h, wall }
      const gf = B.gf || 3.2,
        top = B.top || gf;
      k.box(0, w, -0.8, gf, 0, d, B.wall, { tile: [0.6, 0.6] });
      if (top > gf) {
        k.box(0, w, gf, top, 0, d, B.upper, NC);
        for (let x = 0.08; x < w; x += 0.24)
          k.box(x, x + 0.08, gf + 0.4, top, -0.03, 0, '#a9a9a4', NC);
        k.box(-0.05, w + 0.05, gf, gf + 0.4, -0.12, 0, B.wall, NC);
      }
      k.box(-0.15, w + 0.15, top, top + 0.1, -(B.eave || 0.25), d, B.roofCol, NC);
      if (B.eave) {
        k.box(-0.15, w + 0.15, top - 0.12, top, -B.eave - 0.25, -B.eave + 0.2, B.roofCol, NC);
        for (let x = 0; x < w; x += 0.3)
          k.box(x, x + 0.1, top + 0.1, top + 0.13, -B.eave, 0.3, '#6f6258', NC);
      }
      if (B.rear) {
        const R = B.rear;
        k.box(0, w, top, R.h, R.z, d, R.wall, NC);
        k.box(-0.02, w + 0.02, R.h, R.h + 0.12, R.z - 0.04, d, 'gray', NC);
        for (let y = Math.max(top + 0.6, 5.2); y + 1.6 < R.h; y += 3) {
          win(k, w * 0.3, y + 0.7, 1.3, 1.2, R.z, r, true);
          win(k, w * 0.72, y + 0.7, 1.3, 1.2, R.z, r, true);
          k.box(0.2, w - 0.2, y - 0.25, y - 0.13, R.z - 0.5, R.z, '#cfcdc6', NC);
        }
      }
      units(gf);
      k.box(-0.01, w + 0.01, -0.5, 0.05, -F.apron, 0, MR.concrete, { col: false, surface: true });
      apron2('#9b9993');
      return;
    }

    if (B.kind === 'decal') {
      // 貼在別的量體牆上的招牌（牆本身不在這個檔案）
      for (const S of B.signs) {
        const [x0, x1] = seg(S.s[0], S.s[1]),
          sw2 = x1 - x0;
        k.box(x0, x1, S.y, S.y + S.h, -0.05, 0.1, S.bg || '#f2c230', NC);
        if (S.art)
          k.plane(
            artTex(S.art, sw2, S.h),
            sw2 - 0.04,
            S.h - 0.04,
            (x0 + x1) / 2,
            S.y + S.h / 2,
            -0.06,
            FRONT,
            { emissive: 0.12 }
          );
      }
      if (B.mirror) {
        const x = F.X(B.mirror[0]),
          zm = -0.3;
        k.cyl(x, zm, 0.035, 0, 2.95, '#e8742a', { seg: 6 });
        for (const a of [FRONT + 0.7, 0.7])
          k.plane(
            roundSign('', a > 3 ? '#cfd6dc' : '#8a8d90', '#e8742a'),
            0.8,
            0.8,
            x + Math.sin(a) * 0.04,
            2.7,
            zm + Math.cos(a) * 0.04 - 0.05,
            a,
            { transparent: true }
          );
      } // 橘框凸面鏡
      return;
    }

    if (B.kind === 'oldBack') {
      // 兩層老屋的背面：s 大的那一半多一層加蓋
      const h2 = 6.4,
        h3 = 9.3,
        xr = w * 0.56,
        wl = B.wall;
      k.box(0, w, -0.8, h2, 0, d, wl);
      k.box(-0.03, w + 0.03, h2, h2 + 0.14, -0.1, d, '#77736a', NC);
      k.box(0, xr, h2, h3, 0.35, d, '#9a958a');
      k.box(-0.05, xr + 0.05, h3, h3 + 0.12, 0.2, d, '#6f6b63', NC);
      k.box(-0.05, xr + 0.1, h2 - 0.05, h2 + 0.7, -0.3, 0.35, '#a4503c', NC);
      for (let x = 0; x < xr; x += 0.32)
        k.box(x, x + 0.04, h2 - 0.05, h2 + 0.72, -0.31, -0.3, '#8a4030', NC); // 窗下的紅磚色瓦片小雨庇
      for (const [x, y0, y1, a] of [
        [0.9, 2.2, h2, 0.5],
        [2.7, 3.4, h2, 0.4],
        [w - 1.2, 1.5, h2, 0.45],
      ])
        k.box(x, x + 0.6, y0, y1, -0.012, 0, '#7b766b', NC, a); // 水漬
      win(k, xr * 0.5, h2 + 1.75, 1.5, 1.3, 0.35, r, false);
      k.plane(barsTex('#3a3c40'), 1.6, 1.4, xr * 0.5, h2 + 1.75, 0.3, FRONT, {
        transparent: true,
        double: true,
      });
      for (const x of [1.0, w - 1.3]) {
        k.plane(YHT.win(), 1.2, 1.3, x, 4.75, -0.02, FRONT);
        k.plane(barsTex('#3a3c40'), 1.3, 1.4, x, 4.75, -0.07, FRONT, {
          transparent: true,
          double: true,
        });
      }
      k.plane(YHT.win(), 1.1, 1.5, w - 1.1, 1.75, -0.02, FRONT);
      k.plane(barsTex('#4a3a30'), 1.2, 1.6, w - 1.1, 1.75, -0.07, FRONT, {
        transparent: true,
        double: true,
      });
      k.box(1.4, 2.3, 0, 2.05, -0.05, 0, '#4a4640', NC);
      k.box(0.2, w - 2.0, 2.9, 2.97, -1.5, 0, '#5f6468', NC);
      for (const x of [0.25, w - 2.1]) k.box(x, x + 0.05, 2.55, 2.9, -1.45, -1.4, '#5f6468', NC); // 後門與深灰鐵皮雨遮
      for (const [x, y] of [
        [0.3, 3.15],
        [1.5, 3.15],
        [2.9, 3.6],
        [0.4, 4.0],
        [w - 2.6, 3.3],
        [w - 2.4, 4.3],
      ])
        ac(k, x, y, 0); // 冷氣室外機群
      k.box(2.55, 2.63, 0, h2 + 2.2, -0.09, 0, '#e6e4de', NC);
      k.box(2.55, 3.6, 4.55, 4.63, -0.09, 0, '#e6e4de', NC); // 白色排水管
      for (const x of [xr * 0.3, xr * 0.75])
        k.cyl(x, d * 0.4, 0.55, h3 + 0.12, h3 + 1.5, '#c9cccf', { seg: 12 });
      k.cyl(w - 1.2, d * 0.5, 0.5, h2 + 0.14, h2 + 1.4, '#c9cccf', { seg: 12 });
      backWins(k, w, d, 3.2, 2, fh);
      k.box(-0.01, w + 0.01, -0.5, 0.05, -F.apron, 0, MR.concrete, { col: false, surface: true });
      return;
    }

    if (B.kind === 'ramp') {
      // 地下車道：兩側貼磁磚的矮牆、不鏽鋼欄杆，後面鐵皮圍牆
      for (const x of [0, w - 0.2]) {
        k.box(x, x + 0.2, 0, 1.15, -2.6, d, '#d6d4cc');
        k.box(x + 0.07, x + 0.13, 1.15, 1.5, -2.6, d, '#c9cccf', NC);
      }
      k.box(0, w, 0, 2.4, d - 0.15, d, '#c9c9c4');
      k.box(0.2, w - 0.2, -0.5, 0.04, -2.6, d, '#55585a', { col: false, surface: true });
      k.box(-0.01, w + 0.01, -0.5, 0.05, -F.apron, -2.6, MR.concrete, {
        col: false,
        surface: true,
      });
      k.box(0.3, w - 0.3, 0, 0.75, -0.7, -0.5, '#a3a39d');
      k.box(w / 2 - 0.03, w / 2 + 0.03, 0, 1.5, -0.85, -0.79, '#c9cccf', NC);
      k.box(w / 2 - 0.35, w / 2 + 0.35, 1.0, 1.5, -0.9, -0.86, '#f2f2ee', NC); // 車道口的水泥矮牆、白色告示牌
      k.box(0.35, w - 0.35, 0.82, 0.88, -3.0, -2.94, '#c9cccf', NC);
      for (const x of [0.35, w - 0.41]) k.box(x, x + 0.06, 0, 0.88, -3.0, -2.94, '#c9cccf', NC); // 路邊的不鏽鋼ㄇ形欄杆
      // 往下斜的車道（不挖地形，只做視覺）：矮牆後面的路面從矮牆頂高度一路斜到最裡面的地面，盡頭是一個暗的洞口，從街上越過矮牆看就是往下開的坡道
      const L = d - 0.2 + 0.5,
        th = Math.atan2(0.7, L);
      rbox(
        k,
        w / 2,
        0.37,
        (d - 0.2 - 0.5) / 2,
        w - 0.4,
        0.05,
        Math.hypot(L, 0.7),
        0,
        '#4c4f52',
        th
      );
      for (let j = 1; j < 5; j++)
        rbox(
          k,
          w / 2,
          0.37 + 0.03 - (j / 5 - 0.5) * 0.7,
          -0.5 + (L * j) / 5,
          w - 0.4,
          0.012,
          0.12,
          0,
          '#77797b',
          th
        ); // 防滑橫紋
      k.plane(darkTex, w - 0.4, 1.7, w / 2, 0.85, d - 0.17, FRONT);
      k.box(0.2, w - 0.2, 1.7, 2.4, d - 0.3, d - 0.15, '#8a8a86', NC);
    }
  });
  finishRow(scene, kits);
}
