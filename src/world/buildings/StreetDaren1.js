// 大仁一街兩側的街屋（照 Google 街景 2024-08、國土測繪 2024 正射與 Google 衛星建模，只做外觀，不能進入）。
// 寫法比照 src/world/buildings/StreetZhongbei.js：每一格是 [s0, s1, side, spec]
//   s = 沿 D1_ROAD 從大仁二街／恩慈小門那一端（北端）往實踐路量的公尺數；路在 s≈73.4 的地方從東南向轉成西南向，格子不要跨過轉角
//   side +1 = 順著 s 走的右手邊，-1 = 左手邊
//   spec：nf 樓層、gf 一樓高、fh 樓高、d 深度、wall（WALL 鍵或 #hex）、low 一樓外牆 #hex、sign [字, 底, 字色, 小字, 樣式]、
//   ground 'shop'|'shutter'|'gate'|'open'|'stall'、sh 鐵捲門顏色、awn 雨棚 #hex 或 [色1, 色2] 條紋、
//   bal 'cage'|'grille'|'open'|'rail'|'glass'|'arch'|'plain'、glass 帷幕玻璃色、hood 窗罩色、
//   vert [字, 底, 字色] 直立招牌、round [字, 底, 字色] 圓形側招、banner [字, 底, 字色] 布條、
//   roof 'shack'|'tank'|'bill'、bill [字, 底, 字色, 寬, 高]、tin 鐵皮雨遮、arch 粉紅拱形女兒牆、fins 直條鰭板色、
//   big [字, 底, 字色] 樓上整面帆布（bigFrom、bigW、bigAt）、sign2 二樓橫招、noband 不畫一樓招牌帶、roofCol 鐵皮屋頂色、door 0 沒有樓梯門、
//   tower {nf, back, wall, balc} 裙樓上方的退縮住宅塔、bikes 騎樓機車數、set 立面離路中心線的距離（預設 SET）
//   B 段加的：slide 整格沿切線往 s 變大的方向平移幾公尺（轉角外側、s 範圍放不下的建物）、apron 前埕深度、pave 前埕鋪格子地磚、
//   plaza 只有鋪面的前庭、posts [[x, z, 'gate'|'bol'|'bush'|'rail'|'brick', 長度]] 前庭的柵欄機／矮柱／欄杆、podium [x0, x1, 深, 高出一樓] 一樓凸出的矮裙樓、ground 'wall' 一樓是牆加窗、bal 'recess' 凹陽台（face 正面磚色）|'wins' 一扇一扇的鋁窗、
//   belt 二樓樓板的石材腰帶色、bands 每層樓板的橫帶色、entry 住宅大門寬（在 x=0 那端）、lobby [中心 x, 寬, 雨遮帶抬高] 門廳、rear {nf, from, wall} 比前棟高的後棟、
//   sideAt [[x=0 側的窗 z…], [x=w 側的窗 z…]]（空陣列＝素牆）、rear.out 後棟在 x=0 側微凸並開直條鋁窗、nobikes 門前不隨機停機車、
//   roof 'pent' 屋突、board [x, z, 字, 底, 字色, 小字] 門口花台上的落地立牌、noac 不掛隨機冷氣、sideN 側牆每層窗數
//   A 段加的：bays 一樓開間數或每根柱子的中心 x、lintel 鐵捲門上的金屬門楣色、balF {樓層序: bal 樣式} 單獨指定某一層、strip [色, 起, 迄] 直條鐵柵（占面寬的比例）、
//   railing 屋頂欄杆、gable 山牆形女兒牆、tileCap 頂樓鐵窗籠上的紅瓦小山牆色、side0 x=0 側山牆色（加幾扇有綠遮陽棚的窗）、hedge [起, 迄] 門前花台、
//   ground 'porch' 內退門廊（porch {band, doors [[左緣, 寬, 色, 春聯]], stuff}）、bal 'para' 封閉式陽台|'small' 交錯小窗、fineSh 細葉片鐵捲門、carport 停車場車棚、
//   fyard 鐵皮加蓋的前院 {d 深度, open [[x0, x1, 'sh'|'door'|'red', 色]] 臨街矮牆上的鐵捲門／不鏽鋼門／貼春聯的門, pots 盆栽的 x, bikes 門口機車數, roof 鐵皮色, band 門楣色}、bal 'fan' 綠色扇形拱窗|'barred' 一扇亮著燈的鐵窗、side0sh [色, [z0, z1]…] x=0 側牆一樓的鐵捲門、side1sh 同樣的東西在 x=w 側、eave [色, 高度, 深度] 瓦片小雨遮；carport 可加 posts
//   D 段加的：factory 鐵皮廠房（h 屋簷高、rise 屋頂往後升高、fwins／vents 窗與通風口的 s、board [s0, s1, 色] 看板、swin 小鐵窗的 s、turret [s, 退縮, 邊長, 塔頂高, 錐頂高]、endBanner 掛大帆布那一端的 s）、
//   yard 矮花台圍起來的停車空地（gate [s0, s1] 入口、poles 電線桿的 s、board [s0, s1, 字, 底, 字色] 白色看板）、fwinDull 廠房窗改用灰綠舊窗、bal 'planter' 窗下實心花台|'lintel' 整排窗＋扁拱線腳|'slots' 窄窗各自一個鐵籠與小雨遮（slots [每層幾扇, 雨遮色]）、
//   discs [字, 底, 圓牌色, 外框色, 字色] 圓牌橫招、villa 仿洋樓的樓上立面、canopy 屋頂浪板棚色、acRack [起 x, 迄 x, 層數, 放大倍率] 冷氣室外機排（也可以給好幾組）、plate [字, 底, 字色] 一樓牆上的直立名牌、
//   alley [門色, 雨棚色] 兩棟之間的側門巷（鋪面、格柵鐵門、圓弧小雨棚）、nook [x0, x1, 門色] 一樓這一段改成磚牆＋鑄鐵花窗＋木門、lattice 包住一二樓的橫木條格柵色、
//   bannerN [[每行字], 底, 字色] 多行帆布、wdoor [x, 色] 加兩階踏步的小鐵門、cabs [[x0, x1, 高, 色]] 門前路邊的電信／電力箱、垃圾子車
//   site 工地（gate [s0, s1] 白色鋼板大門、bld [s0, s1, z0, z1, 樓層] 包藍網的興建中結構體、trucks 工程車）
//   C 段加的：factory 的 cx {rust 牆腳鏽水痕色, wins [[s, 寬]] 綠色橫窗, props [['pipe'|'box'|'ac'|'door'|'notice'|'duct', s]], rowBikes [s0, s1] 沿牆垂直停的一排機車}、
//   cageCol 鐵窗籠顏色、roof 'cover' 屋頂浪板加蓋（顏色用 roofCol）、cx 另有 dull 灰綠舊窗、props 'vent'|'rpipe'|'pole'；bal 'tiny' 每層一扇小鐵窗、para2 [色, 板色] 二樓窗下女兒牆帶、sdoor [x] 鐵捲門旁的不鏽鋼門、couplets [x, …] 門上的紅春聯
// 每一格自成一個 Kit，立面對著街道；收尾用 finishRow 一次合併。src/world/zones/Zones.js import D1_ST 與 d1Footprints() 來刪填充樓、保留空地。

import { H } from '../Terrain.js';

export const D1_ROAD = [
  [74.2, 297.9],
  [81.8, 310.3],
  [100.5, 337.2],
  [104.1, 342.4],
  [108.7, 349.6],
  [114.8, 358.8],
  [87.6, 388.3],
  [21.2, 460.4],
];
const HALF = 2.5; // 路寬 5 m 的一半（data/cycu.json）
const SET = 3.4; // 立面離中心線的預設距離
const halfAt = () => HALF,
  setAt = () => SET;

export const D1_ST = {
  ownSign: ['衛斯理探案館'], // 街屋自己掛招牌的店名，POI 不再另外掛
  drop: [
    'f2_88',
    'f2_87',
    'f2_86',
    'f2_85',
    'f2_84',
    'f2_99',
    'f2_98',
    'f2_97',
    'f2_89',
    'f2_95',
    'f2_94',
    'f1577',
    'f1578',
    'f1579',
    'f1580',
    'f1581',
    'f1582',
    'f1583',
    'f1584',
    'f1585',
    'f2_72',
    'f2_73',
    'f2_74',
    'f2_75',
    'f2_90',
    'f2_91',
    'f2_92',
    'f2_93',
    'f1574',
    'f1575',
    'f1576',
    'f2_117',
    'f2_118',
  ], // 這些格子蓋掉的通用填充樓
  lots: [
    // ---- 北段（s 0～73，東南向）----
    // A 段 s 6～45（2024-08 街景；s<6 是大仁二街路口不蓋）。整段都是住宅，沒有店招。
    // side -1（東北側，門牌 68 → 56）：一排 5F 公寓，一樓多半是鐵捲門車庫或內退門廊；立面離中心線 4.6 是用 s12.6 與 s22.3 兩個街景點對同一根柱子交會出來的
    [
      6,
      16.4,
      -1,
      {
        set: 4.6,
        nf: 5,
        gf: 3.5,
        wall: '#e4e4e0',
        ground: 'shutter',
        sh: '#b4b6b8',
        fineSh: true,
        bays: [1.05, 5.0, 9.5],
        lintel: '#d2d5d7',
        noband: true,
        door: 0,
        entry: 1.3,
        bal: 'para',
        railing: true,
        roof: 'tank',
        bikes: 5,
        side1sh: ['#b4b6b8', [0.9, 4.9], [5.8, 9.8]],
        d: 11,
      },
    ], // 68 號轉角樓：白小方磚、銀色鐵捲門車庫、不鏽鋼門楣，南端是住宅門；面 708 巷的北側牆一樓也是兩道鐵捲門
    [
      16.4,
      20.9,
      -1,
      {
        set: 4.6,
        nf: 5,
        gf: 3.5,
        wall: '#e6e5e0',
        ground: 'porch',
        porch: {
          doors: [
            [0.08, 0.13, '#2a2a2e'],
            [0.5, 0.3, '#93aaa4', true],
          ],
        },
        noband: true,
        door: 0,
        bal: 'para',
        railing: true,
        roof: 'flat',
        d: 15,
      },
    ], // 白磚窄樓：一樓內退門廊，雕花鐵門與貼春聯的玻璃門
    [
      20.9,
      26.4,
      -1,
      {
        set: 4.6,
        nf: 5,
        gf: 3.5,
        wall: '#bdbcb8',
        ground: 'porch',
        porch: {
          band: '#3f7f5f',
          doors: [
            [0.3, 0.3, '#8fa3a0'],
            [0.72, 0.12, '#6f8a80', true],
          ],
          stuff: [
            [0.08, '#5a8a4a'],
            [0.2, '#3f9a4f'],
            [0.64, '#d8d4c8'],
          ],
        },
        noband: true,
        door: 0,
        bal: 'plain',
        strip: ['#4a3a30', 0.66, 0.97],
        bikes: 3,
        roof: 'tank',
        d: 15,
      },
    ], // 64 號灰色洗石子：一樓門廊堆雜物，樓上北側三分之一是深咖啡直條鐵柵
    [
      26.4,
      30.5,
      -1,
      {
        set: 4.6,
        nf: 5,
        gf: 3.5,
        wall: '#e6e5e0',
        ground: 'porch',
        porch: {
          doors: [
            [0.06, 0.14, '#4a5a56'],
            [0.26, 0.68, '#5f8f7a', true],
          ],
        },
        noband: true,
        door: 0,
        bal: 'para',
        railing: true,
        roof: 'flat',
        d: 15,
      },
    ], // 白磚窄樓：一樓整面綠色隔熱紙玻璃門窗
    [
      30.5,
      34.5,
      -1,
      {
        set: 4.6,
        nf: 5,
        gf: 3.5,
        wall: '#9fb0c2',
        bands: '#c9a59c',
        ground: 'shutter',
        sh: '#b0b2b4',
        fineSh: true,
        lintel: '#e4e4e0',
        noband: true,
        door: 0,
        entry: 1.2,
        bal: 'cage',
        balF: { 1: 'plain', 4: 'plain' },
        roof: 'shack',
        d: 15,
      },
    ], // 60 號藍灰磚：粉磚橫帶、3F／4F 白鐵窗籠、屋頂樓梯間
    [
      34.5,
      37.3,
      -1,
      {
        set: 4.6,
        nf: 5,
        gf: 3.5,
        wall: '#9fb0c2',
        bands: '#c9a59c',
        ground: 'shutter',
        sh: '#9a7a5c',
        fineSh: true,
        noband: true,
        door: 0,
        entry: 1.2,
        bal: 'plain',
        eave: ['#2e2e30', 3.66, 0.7],
        roof: 'flat',
        d: 15,
      },
    ], // 60／58 號樓梯間：生鏽的舊信箱門板與鐵柵門
    [
      37.3,
      40.3,
      -1,
      {
        set: 4.6,
        nf: 5,
        gf: 3.5,
        wall: '#9a9a98',
        ground: 'gate',
        sh: '#2f6fb5',
        awn: '#9cc8a0',
        noband: true,
        door: 0,
        bal: 'plain',
        balF: { 2: 'cage' },
        roof: 'shack',
        side0: '#e8e8e4',
        d: 15,
      },
    ], // 灰色窄樓：藍浪板門、綠色雨遮、3F 鐵窗籠，面停車場的山牆漆白
    [
      40.3,
      44.9,
      -1,
      {
        carport: true,
        set: 4.9,
        gf: 2.6,
        sh: '#8aa690',
        roofCol: '#7a5a44',
        posts: [[0.3, 0.7, 'gate', 3]],
        d: 18,
      },
    ], // 停車場的鐵皮車棚與臨街綠色浪板圍籬（s 45～51 是出入口的通道，留空；黃色柵欄機立在車棚角落）
    // side +1（西南側，門牌 69 → 65）：三棟 3F 透天，再往南是 63、61 號兩棟矮房子，然後才是紅樓（s 38.5 起）
    [
      7.5,
      17,
      1,
      {
        set: 4.2,
        nf: 3,
        gf: 3.5,
        wall: '#e6e6e4',
        ground: 'shutter',
        sh: '#6f7275',
        fineSh: true,
        bays: [0.3, 0.8, 1.3, 4.75, 8.7, 9.2],
        lintel: '#74777a',
        noband: true,
        door: 0,
        bal: 'small',
        noac: true,
        gable: true,
        hedge: [0.02, 0.98],
        nobikes: true,
        side0sh: ['#6f7275', [0.9, 3.9], [4.6, 7.6]],
        roof: 'flat',
        d: 9,
      },
    ], // 白色二丁掛透天：兩道深灰車庫門、小窗、山牆形女兒牆、門前花台
    // 67、65 號的樓房本體退在 7.4 m，前面 3.2 m 是鐵皮加蓋的前院（臨街矮牆跟隔壁立面切齊）：從 s22.3 的街景看得到隔壁透天的整面側牆露在鐵皮頂後面
    [
      17,
      21.7,
      1,
      {
        set: 7.4,
        nf: 3,
        wall: '#ecebe6',
        ground: 'gate',
        noband: true,
        door: 0,
        bal: 'wcage',
        cageHood: '#b5483a',
        balF: { 1: 'fan' },
        noac: true,
        tileCap: '#b5483a',
        roof: 'shack',
        fyard: {
          d: 3.2,
          open: [
            [0.3, 2.4, 'sh', '#8a8780'],
            [2.8, 3.7, 'door'],
          ],
          pots: [4.2],
          bikes: 1,
        },
        d: 8.8,
      },
    ], // 67 號：前院鐵捲門＋不鏽鋼門，2F 綠色扇形拱窗，3F 白鐵窗籠陽台＋紅瓦小山牆
    [
      21.7,
      26.5,
      1,
      {
        set: 7.4,
        nf: 3,
        wall: '#ecebe6',
        ground: 'gate',
        noband: true,
        door: 0,
        bal: 'wcage',
        cageHood: '#b5483a',
        balF: { 1: 'barred' },
        noac: true,
        tileCap: '#b5483a',
        roof: 'shack',
        fyard: {
          d: 3.2,
          open: [
            [0.1, 0.9, 'red'],
            [1.3, 3.7, 'sh', '#8a8780'],
          ],
          pots: [1.1, 4.3],
          bikes: 2,
        },
        d: 8.8,
      },
    ], // 65 號：貼春聯的不鏽鋼門＋「庫」字鐵捲門，2F 一扇鐵窗
    [38.6, 71, 1, { pave: '#b9b6ae', set: 2.6, d: 1.6 }],
    [79.5, 90.3, 1, { pave: '#b9b6ae', set: 2.6, d: 3.0 }], // 紅樓（OSM 建物，見下面 d1Fix／d1Look）門前到路邊的水泥前埕
    // 63、61 號（2024-08 街景）：紅樓輪廓照實景收到 s 38.5 之後才放得下
    [
      26.5,
      30.9,
      1,
      {
        set: 4.2,
        nf: 2,
        gf: 3.2,
        wall: '#e9e8e3',
        ground: 'shutter',
        sh: '#7d7a72',
        fineSh: true,
        tin: true,
        bal: 'glass',
        noband: true,
        door: 0.9,
        noac: true,
        roof: 'shack',
        d: 12,
      },
    ], // 63 號：北端一扇格子鐵門＋「車庫」鐵捲門，2F 整面白鋁框玻璃陽光屋
    [
      30.9,
      38.3,
      1,
      {
        set: 4.2,
        nf: 2,
        gf: 3.2,
        wall: '#d9a898',
        ground: 'gate',
        sh: '#8a6a4a',
        awn: '#a8cdb0',
        bal: 'plain',
        noband: true,
        door: 1.1,
        roof: 'flat',
        d: 10,
      },
    ], // 61 號：粉橘小方磚 2F，古銅色落地玻璃拉門、淺綠圓弧採光罩雨遮
    // B 段 s 46～73.4 與轉角外側（2024-08 街景）：side -1 只有大仁一街 50 號與退在格子地磚前庭後面的米色套房大樓；side +1 整段是紅樓，不補
    // 大仁一街 50 號：褐色磁磚套房大樓，前棟 6F 凹陽台、後棟 8F；一樓米黃鐵捲門車庫，住宅大門在東南端，前埕停機車
    [
      50.3,
      58.7,
      -1,
      {
        nf: 6,
        gf: 3.6,
        wall: '#b5a088',
        face: '#9c7f6a',
        ground: 'shutter',
        sh: '#d6c394',
        awn: '#4a4038',
        bal: 'recess',
        belt: '#a59a8e',
        noband: true,
        door: 0,
        entry: 2.4,
        noac: true,
        bikes: 4,
        rear: { nf: 2, from: 8, wall: '#8c7262', out: 0.3 },
        sideAt: [[], []],
        board: [-0.5, -3.0, '小花羊花藝', '#f4f2ec', '#3a3a36', 'Goatflower workshop'],
        roof: 'flat',
        set: 6.8,
        d: 14,
      },
    ],
    // 米色套房大樓的前庭：黑白格子地磚、黃色柵欄機與車阻、黑色矮柱（臨街沒有建築）
    [
      65.5,
      72,
      -1,
      {
        plaza: true,
        set: 3.0,
        d: 11,
        posts: [
          [6.1, 0.9, 'gate', 3],
          [2.2, 1.6, 'gate'],
          [0.6, 1.9, 'gate'],
          [3.0, 1.4, 'rail', 1.6],
          [4.6, 1.2, 'rail', 1.2],
          [6.38, 4.5, 'brick', 6.5],
        ],
      },
    ],
    // 轉角外側的米色 5F 套房大樓（灰褐橫帶）：實際在 s 72～84、離中心線 10～14 m 以上，用 slide 沿北段方向平移過去，格子本身不跨轉角
    // 西北翼的端面（門廳在一樓，雕花大門）退在 14 m；東南那塊往路這邊凸出到 10 m，一樓外面包一圈矮裙樓與灌木花台
    [
      60.5,
      66,
      -1,
      {
        slide: 11.5,
        nf: 5,
        gf: 4.0,
        fh: 3.2,
        wall: '#d0bc9c',
        low: '#c4b296',
        ground: 'wall',
        bal: 'wins',
        bands: '#8d8177',
        noband: true,
        door: 0,
        lobby: [1.7, 2.0, 1.7],
        nobikes: true,
        noac: true,
        sideN: 3,
        roof: 'pent',
        set: 14,
        apron: 11,
        pave: true,
        posts: [
          [0.6, -5.5, 'bol'],
          [1.6, -5.5, 'bol'],
          [2.6, -5.5, 'bol'],
          [3.6, -5.5, 'bol'],
        ],
        d: 9.5,
      },
    ],
    [
      66,
      72.5,
      -1,
      {
        slide: 11.5,
        nf: 5,
        gf: 4.0,
        fh: 3.2,
        wall: '#d0bc9c',
        low: '#c4b296',
        ground: 'wall',
        bal: 'wins',
        bands: '#8d8177',
        noband: true,
        door: 0,
        podium: [0.8, 6.5, 1.8, 1.4],
        noac: true,
        sideN: 4,
        roof: 'flat',
        set: 10,
        apron: 7,
        pave: true,
        d: 12,
      },
    ],
    // ---- 南段（s 73～212，西南向）----
    // C 段 s 73.4～135（2024-08 街景）。這一段兩側都沒有店招。OSM 中心線比實際路面偏東南約 1 m：side -1 貼下限 3.0、side +1 退到 4.3
    // side -1（東南側）：一整面老鐵皮廠房的沿街牆（跟 D 段 s 135 以後是同一棟）。s<112 是白漆鐵皮板、牆腳大片鏽水痕、配電箱與封死的鏽鐵門；
    // s>112 是斑駁粉刷牆配綠色鐵絲網玻璃橫窗；沿牆一整排垂直停的機車。轉角外側 s 73.4～78.5 是無名支路，留空
    // 正射上這棟廠房從 s≈97 起往後深約 47 m（跟 D 段同一片屋頂），s<97 只是沿街的一條窄棚：所以在 s 100 切開，後兩格跟 D 段一樣做 44 m 深（屋頂斜率相同）
    // side -1（東南側）s 78.5～204.5：2024-08 街景還是舊鐵皮廠房與停車空地；Google 街景 2026-05（實踐路口往裡看）整塊已拆成「鼎藏中原匯」工地。
    // 臨街是灰色鍍鋅網片圍籬，靠實踐路口是白色鋼板大門；裡面是整平的水泥地、停著泵浦車與吊車，靠實踐路那一棟蓋到 4～5 層、整棟包藍色鷹架防護網（面實踐路的那一半在 src/world/buildings/shijian/S4.js）。
    // 靠環中東路那一棟在 src/world/buildings/StreetHuanzhong.js（HN s 563.5～600）；這裡的深度都留在它前面。s<100 後面有沒 drop 的 f2_104、f2_105，深度只到 20
    [78.5, 100, -1, { site: true, set: 3.0, d: 20 }],
    [
      100,
      150,
      -1,
      {
        site: true,
        set: 3.0,
        d: 33,
        stacks: [
          [128, 14, 4, 2.5, 1.1, '#7f8386'],
          [120, 10, 2.4, 4, 0.8, '#a9865c'],
        ],
      },
    ],
    [
      150,
      204.5,
      -1,
      {
        site: true,
        set: 3.0,
        d: 47,
        gate: [197.5, 204.5],
        bld: [157, 187.2, 21, 45, 5],
        trucks: [
          [160, 6, 9.5, '#c23a2e', '#b5362b', '#c9453a'],
          [166, 7, 8, '#e0b02a', '#d6a624', '#e0b02a'],
          [172, 8, 5.5, '#ecece8', '#dcdcd6', null],
        ],
      },
    ], // bld 接在實踐路那一半（S4.js siteFence：這條街的 s 187.4～201.5、離中心線 24～50 m）後面，兩塊合起來是轉角那一棟
    // side +1（西北側，門牌 43 → 27）：紅樓尾段之後是一排 3F 透天住家，中間隔著大仁一街35巷口（s 107～115.5 留空）
    [
      90.5,
      95.3,
      1,
      {
        nf: 3,
        wall: '#cdb98a',
        ground: 'shutter',
        sh: '#b9bcbe',
        bal: 'cage',
        cageCol: '#c9cbc8',
        para2: ['#cdb98a', '#eeeeea'],
        tin: true,
        noband: true,
        roof: 'cover',
        roofCol: '#5f9a72',
        set: 4.3,
        d: 11,
      },
    ], // 43 號：米黃馬賽克、銀色鐵捲門、兩層鐵窗籠、綠浪板加蓋
    [
      95.3,
      100.7,
      1,
      {
        nf: 3,
        wall: '#eeeeea',
        low: '#9db594',
        ground: 'wall',
        awn: '#2f8a63',
        bal: 'plain',
        noband: true,
        roof: 'cover',
        roofCol: '#5f9a72',
        bikes: 3,
        set: 4.3,
        d: 11,
      },
    ], // 41 號：白牆、一樓淺綠磁磚配小窗與鐵門、綠帆布雨棚、2F 大觀景窗
    [
      100.7,
      107,
      1,
      {
        nf: 3,
        wall: '#aea591',
        ground: 'shutter',
        sh: '#b4b7b9',
        bal: 'cage',
        cageCol: '#5a5048',
        para2: ['#a89878'],
        door: 0,
        sdoor: [0.62],
        noband: true,
        roof: 'shack',
        set: 4.3,
        d: 11,
      },
    ], // 39 號（35 巷口東北角）：灰小口磚、寬鐵捲門、深色直條鐵窗籠
    [
      115.5,
      121.1,
      1,
      {
        nf: 3,
        wall: '#efece2',
        bands: '#e2ddd0',
        ground: 'shutter',
        sh: '#a9a59c',
        awn: '#8b857c',
        bal: 'tiny',
        door: 0,
        noband: true,
        noac: true,
        roof: 'shack',
        set: 4.3,
        d: 12,
      },
    ], // 33 號（35 巷口西南角）：米白轉角樓、灰褐沖孔鐵捲門與弧形雨棚、樓上小窗
    [
      121.1,
      125.2,
      1,
      {
        nf: 3,
        wall: '#b8ad8c',
        ground: 'shutter',
        sh: '#8c8c88',
        bal: 'cage',
        cageCol: '#dcdcd8',
        balF: { 2: 'grille' },
        door: 0,
        sdoor: [0.62],
        noband: true,
        roof: 'shack',
        set: 4.3,
        d: 12,
      },
    ], // 31 號（雙併右戶）：橄欖卡其馬賽克、整面鐵捲門、2F 白鐵窗籠
    [
      125.2,
      129.3,
      1,
      {
        nf: 3,
        wall: '#b8ad8c',
        ground: 'gate',
        sh: '#6a6a66',
        bal: 'cage',
        cageCol: '#dcdcd8',
        door: 0,
        noband: true,
        tin: true,
        roof: 'shack',
        set: 4.3,
        d: 12,
      },
    ], // 29 號（雙併左戶）：深色玻璃門、兩層鐵窗籠
    [
      129.3,
      134.4,
      1,
      {
        nf: 3,
        wall: '#c9bd9c',
        ground: 'gate',
        sh: '#5a4638',
        awn: '#5a9ad0',
        bal: 'cage',
        cageCol: '#dcdcd8',
        couplets: [1.9, 3.5],
        door: 0,
        noband: true,
        roof: 'shack',
        set: 4.3,
        d: 12,
      },
    ], // 27 號：深色木框玻璃拉門、藍帆布雨棚、白鐵窗籠（s 134.4 以後是歡喜樓的入口巷）
    // D 段 s 135～206（2024-08 街景）。OSM 中心線比實際路面偏東南 2～4 m，所以 side +1 的立面退到 5.6、side -1 貼著下限 3.0
    // side +1（西北側）：歡喜樓 → 紅磚大樓 → 衛斯理探案館 → 白色大樓（中原福邸、全聯側面）。s 134.4～136.8、173.4～175.8 是兩條側門巷，留空
    // 歡喜樓（大仁一街 23-25，6F 粉灰紫小方磚、白鐵窗籠＋綠雨遮，頂層沒有鐵籠）：一樓由北往南是磚牆與名牌、兩道大鐵捲門、條紋圓弧雨棚的住戶大門、地下停車場車庫門
    [134.4, 136.8, 1, { alley: ['#6a5a48', '#cfd6cc'], set: 5.6, d: 12 }], // 歡喜樓的入口巷：格柵鐵門＋圓弧小雨棚
    [
      136.8,
      140.3,
      1,
      {
        set: 5.6,
        d: 16,
        nf: 6,
        wall: '#b89a94',
        ground: 'wall',
        bal: 'wcage',
        balF: { 5: 'tophood' },
        cageHood: '#8fe0b8',
        noac: true,
        plate: ['歡喜樓', '#2b2d3c', '#ffffff'],
        door: 0,
        roof: 'flat',
      },
    ],
    [
      140.3,
      145.9,
      1,
      {
        set: 5.6,
        d: 16,
        nf: 6,
        wall: '#b89a94',
        ground: 'shutter',
        sh: '#77746c',
        bal: 'wcage',
        balF: { 5: 'tophood' },
        cageHood: '#8fe0b8',
        noac: true,
        door: 0,
        roof: 'flat',
        bikes: 3,
      },
    ],
    [
      145.9,
      150.5,
      1,
      {
        set: 5.6,
        d: 16,
        nf: 6,
        wall: '#b89a94',
        ground: 'shutter',
        sh: '#77746c',
        bal: 'wcage',
        balF: { 5: 'tophood' },
        cageHood: '#8fe0b8',
        noac: true,
        door: 0,
        roof: 'flat',
        bikes: 3,
      },
    ],
    [
      150.5,
      154.5,
      1,
      {
        set: 5.6,
        d: 16,
        nf: 6,
        wall: '#b89a94',
        ground: 'gate',
        sh: '#8f8c84',
        arcAwn: ['#efe9dc', '#cdbb94'],
        bal: 'wcage',
        balF: { 5: 'tophood' },
        cageHood: '#8fe0b8',
        noac: true,
        door: 0,
        roof: 'flat',
      },
    ],
    [
      154.5,
      157.9,
      1,
      {
        set: 5.6,
        d: 16,
        nf: 6,
        wall: '#b89a94',
        ground: 'shutter',
        sh: '#9a9c9e',
        bal: 'wcage',
        balF: { 5: 'tophood' },
        cageHood: '#8fe0b8',
        noac: true,
        door: 0,
        roof: 'flat',
      },
    ],
    // 紅磚大樓（6F 鮭魚紅磚面磁磚、水泥色線腳）：2F 整排深色鋁窗＋扁拱線腳，3～6F 窗下凸出實心磚花台與窗型冷氣；一樓米色與灰色鐵捲門，最南邊一扇門
    [
      157.9,
      164.1,
      1,
      {
        set: 5.6,
        d: 15,
        nf: 6,
        wall: '#cb8577',
        bands: '#cdbfb0',
        ground: 'shutter',
        sh: '#cfc4ae',
        bays: 2,
        lintel: '#b9bcbe',
        noband: true,
        bal: 'planter',
        balF: { 1: 'lintel' },
        door: 0,
        noac: true,
        roof: 'flat',
        bikes: 3,
      },
    ],
    [
      164.1,
      173.4,
      1,
      {
        set: 5.6,
        d: 15,
        nf: 6,
        wall: '#cb8577',
        bands: '#cdbfb0',
        ground: 'shutter',
        sh: '#9b9b98',
        lintel: '#b9bcbe',
        noband: true,
        bal: 'planter',
        balF: { 1: 'lintel' },
        door: 0,
        nook: [6.7, 9.3, '#7a4a30'],
        noac: true,
        roof: 'flat',
        bikes: 3,
      },
    ],
    [173.4, 175.8, 1, { alley: ['#6a5a48', '#cfd6cc'], set: 5.6, d: 12 }], // 紅磚大樓的側門巷
    // 衛斯理探案館：2F 挑高（頂約 9 m）的仿洋樓立面、灰鐵捲門、紅浪板底的六個圓牌字橫招、屋頂鐵架綠浪板棚
    [
      175.8,
      180.7,
      1,
      {
        set: 5.6,
        d: 10,
        nf: 2,
        gf: 3.7,
        fh: 5.3,
        wall: '#e9e6e4',
        ground: 'shutter',
        sh: '#a8a59c',
        noband: true,
        discs: ['衛斯理探案館', '#b23a3f', '#f1e3c0', '#2f4f9a', '#1c1c1c'],
        villa: true,
        canopy: '#58a878',
        door: 0,
        noac: true,
        roof: 'flat',
      },
    ],
    // 白色大樓（7F 白色直條細磁磚，3F 以上一扇一扇的白鐵窗＋綠色小雨遮）：北端是「中原福邸」入口（深咖啡木格柵＋金字、紅底套房出租帆布），
    // 中段一樓是淺灰浪板牆、一二樓之間兩層冷氣室外機，南端 2F 樓板的寶藍長橫招是全聯的側面（從大仁一街只看得到尾段「中壢中原店」，店名招牌在實踐路那一面）
    [
      180.7,
      184.7,
      1,
      {
        set: 5.6,
        d: 15,
        nf: 7,
        wall: '#f4f4ee',
        low: '#060000',
        lattice: '#3b2a22',
        sign2: ['中原福邸', '#3b2a22', '#d9b45f'],
        bannerN: [
          ['中原福邸 套房出租', '電梯大樓 設備齊全', '間間有窗 洗衣免費'],
          '#c9252c',
          '#f5e04a',
        ],
        ground: 'gate',
        sh: '#3b2a22',
        noband: true,
        bal: 'slots',
        slots: [2, '#7fdcae'],
        balF: { 1: 'plain', 2: 'grille' },
        door: 0,
        noac: true,
        roof: 'flat',
      },
    ],
    [
      184.7,
      195.2,
      1,
      {
        set: 5.6,
        d: 15,
        nf: 7,
        wall: '#f4f4ee',
        ground: 'shutter',
        sh: '#c8ccd0',
        noband: true,
        bal: 'slots',
        slots: [4, '#7fdcae'],
        balF: { 1: 'wins' },
        acRack: [
          [0.9, 2.1, 1, 1.3],
          [2.5, 6.6, 2],
          [7.7, 10.4, 2, 1.3],
        ],
        wdoor: [3.4, '#eeeeea'],
        cabs: [
          [0.1, 1.3, 1.5],
          [1.4, 2.15, 1.25],
          [2.25, 3.0, 1.25],
        ],
        noac: true,
        roof: 'flat',
      },
    ],
    [
      195.2,
      205.1,
      1,
      {
        set: 5.6,
        d: 15,
        nf: 7,
        wall: '#f4f4ee',
        sign2: ['中壢中原店', '#2b2fb5', '#ffffff'],
        ground: 'shutter',
        sh: '#c8ccd0',
        noband: true,
        bal: 'slots',
        slots: [4, '#7fdcae'],
        balF: { 1: 'wins' },
        door: 0,
        cabs: [
          [1.5, 2.7, 1.9, '#b9c4b0'],
          [3.1, 4.2, 1.1, '#4f8a5a'],
        ],
        noac: true,
        roof: 'flat',
      },
    ],
  ],
};
export function d1At(s) {
  const R = D1_ROAD;
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
export function d1LotFrame([s0, s1, side, sp]) {
  const m = d1At((s0 + s1) / 2),
    w = s1 - s0,
    nx = -m.uz * side,
    nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux,
    az = side > 0 ? m.uz : -m.uz;
  const set = (sp && sp.set) || setAt((s0 + s1) / 2);
  const sl = (sp && sp.slide) || 0; // B 段：整格沿切線往 s 變大的方向平移
  return {
    ox: m.x + nx * set - (ax * w) / 2 + m.ux * sl,
    oz: m.z + nz * set - (az * w) / 2 + m.uz * sl,
    ang: Math.atan2(az, ax),
    w,
    apron: (sp && sp.apron) || Math.max(0.6, set - halfAt((s0 + s1) / 2)),
  };
}
// 紅樓（OSM w1361166181，kind town 的真建物：不 drop、不改 kind，仍是四個邊、每邊都超過 4 m、臨街的還是兩個邊，全圖共用亂數的抽取次數不變）
// 輪廓照 2024-08 街景與國土測繪 2024 正射重畫：原本北端從 s≈28.5 就開始、臨街邊離中心線只有 1.6～3.0 m（壓到路面）；
// 實際北山牆在 s≈38.5、立面離中心線 4.2 m，繞過轉角後沿南段到 s≈90.5（立面 5.6 m）。冷氣用原輪廓抽亂數（acPts）
const RED_ID = 'w1361166181',
  RED_PTS = [
    [78.1, 342.1],
    [92, 332.4],
    [108.8, 357.1],
    [99.3, 367.4],
  ];
export function d1Fix(b) {
  if (b.id === RED_ID) {
    b.acPts = b.pts;
    b.pts = RED_PTS.map((q) => q.slice());
  }
}
// 外觀：整棟紅褐色二丁掛、每層窗下一圈凸出的磚砌窗台、鋁窗；一樓是灰色鐵捲門（沒有店面）；北側山牆漆白
export function d1Look(b) {
  if (b.id !== RED_ID) return;
  b.noShop = true;
  b.look = {
    wall: { base: 'tile', colour: '#9a5142' },
    windows: { type: 'pair', ground: 'louver', bay: 4.2, accent: '#b4b7b8', glass: '#7f9a9c' },
    faces: [{ on: ['n', 'nw'], colour: '#e6e3dc', windows: 'none' }],
    bands: [{ colour: '#8a4638', at: 0.02, h: 0.95, depth: 0.4, on: ['ne', 'e', 'se', 's'] }],
    plinth: { h: 3.4, colour: '#8f8c86' },
    parapet: { h: 1.0, colour: '#8a4638' },
    roof: { colour: '#b9b6ae', extras: false },
  };
}
export function d1Footprints() {
  return D1_ST.lots.map((L) => {
    const { ox, oz, ang, w, apron } = d1LotFrame(L),
      c = Math.cos(ang),
      s = Math.sin(ang),
      d = L[3].d || 10;
    const p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    return [p(-0.1, -apron - 0.1), p(w + 0.1, -apron - 0.1), p(w + 0.1, d), p(-0.1, d)];
  });
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

export function buildDaren1Street(I, scene, X) {
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
  const VC = def('d1VC', () => std({ vertexColors: true })),
    WVC = def('d1WVC', () => std({ map: YHT.facade(), vertexColors: true }));
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
    return sg(`d1_${text}|${bg}|${fg}|${sub || ''}|${W}x${Hh}|${style || ''}`, W, Hh, (g) => {
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
        let p = px;
        g.font = font(p);
        while (g.measureText(t).width > W * 0.94 && p > 10) {
          p -= 2;
          g.font = font(p);
        }
        return p;
      };
      const cy = sub ? Hh * 0.38 : Hh * 0.5;
      lines.forEach((t, i) => {
        fit(t);
        g.fillText(t, W / 2, cy + (i - (n - 1) / 2) * avail);
      });
      if (sub) {
        let p = Hh * 0.2;
        g.font = font(p, 700);
        while (g.measureText(sub).width > W * 0.94 && p > 9) {
          p -= 2;
          g.font = font(p, 700);
        }
        g.fillText(sub, W / 2, Hh * 0.82);
      }
    });
  };
  const roundSign = (text, bg, fg) =>
    sg(`d1R_${text}|${bg}|${fg}`, 128, 128, (g) => {
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
        let p = 34;
        g.font = font(p);
        while (g.measureText(text).width > 100 && p > 12) {
          p -= 2;
          g.font = font(p);
        }
        g.fillText(text, 64, 66);
      }
    });
  const shutterTex = (hex) =>
    sg(`d1Sh${hex}`, 64, 64, (g) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(0, y, 64, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, y + 6, 64, 2);
      }
    });
  const openTex = sg('d1Open', 256, 160, (g) => {
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
  const archWin = sg('d1ArchWin', 256, 160, (g) => {
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
  const archRow = sg('d1ArchRow', 256, 64, (g) => {
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
    sg(`d1Lit${gr ? 1 : 0}`, 256, 160, (g) => {
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
      `d1${i}`,
      ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6],
      ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6],
      300 + i * 3
    );

  const kits = [];
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, rot, col) => {
    // 一台機車，順著立面停（rot 0）或垂直立面（rot 1）
    if (rot) {
      k.box(x - 0.14, x + 0.14, 0.28, 0.62, z, z + 1.5, col, { col: false });
      k.box(x - 0.1, x + 0.1, 0.62, 0.72, z + 0.45, z + 1.0, '#1c1c1e', { col: false });
      k.box(x - 0.3, x + 0.3, 0.9, 0.96, z + 1.28, z + 1.34, '#1c1c1e', { col: false });
      k.box(x - 0.08, x + 0.08, 0.0, 0.5, z + 0.05, z + 0.5, '#1c1c1e', { col: false });
      k.box(x - 0.08, x + 0.08, 0.0, 0.5, z + 1.2, z + 1.45, '#1c1c1e', { col: false });
    } else {
      k.box(x, x + 1.5, 0.28, 0.62, z - 0.14, z + 0.14, col, { col: false });
      k.box(x + 0.45, x + 1.0, 0.62, 0.72, z - 0.1, z + 0.1, '#1c1c1e', { col: false });
      k.box(x + 1.28, x + 1.34, 0.9, 0.96, z - 0.3, z + 0.3, '#1c1c1e', { col: false });
      k.box(x + 0.05, x + 0.5, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', { col: false });
      k.box(x + 1.2, x + 1.45, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', { col: false });
    }
  };

  // ---- B 段新增的樣式：格子地磚、凹陽台、住宅大門、門廳 ----
  const paveMat = () =>
    def('d1Pave', () => {
      const t = sg('d1Pave', 64, 64, (g) => {
        g.fillStyle = '#c4bfb2';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#8d8a82';
        g.fillRect(0, 0, 32, 32);
        g.fillRect(32, 32, 32, 32);
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
      return std({ map: t, roughness: 0.95 });
    });
  const recessTex = (lit) =>
    sg(`d1Recess${lit ? 1 : 0}`, 256, 128, (g) => {
      // 凹陽台裡面：落地窗與深色百葉
      g.fillStyle = '#2b2622';
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = lit ? '#ecca7c' : '#38444a';
      g.fillRect(18, 12, 132, 116);
      g.fillStyle = '#2b2622';
      g.fillRect(82, 12, 4, 116);
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(22, 16, 28, 110);
      g.fillStyle = '#54463c';
      for (let y = 14; y < 128; y += 9) g.fillRect(168, y, 74, 5);
    });
  const tallWinTex = sg('d1TallWin2', 64, 128, (g) => {
    // 後棟側牆的直條鋁窗：深色框、上下兩片藍灰玻璃
    g.fillStyle = '#3a3f42';
    g.fillRect(0, 0, 64, 128);
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#4d6a74');
    gr.addColorStop(1, '#2c424b');
    g.fillStyle = gr;
    g.fillRect(6, 6, 52, 70);
    g.fillRect(6, 82, 52, 40);
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.fillRect(10, 10, 12, 62);
  });
  const resDoorTex = sg('d1ResDoor', 128, 192, (g) => {
    // 住宅大門：深色門框、門扇與對講機
    g.fillStyle = '#2a2420';
    g.fillRect(0, 0, 128, 192);
    g.fillStyle = '#4a3a30';
    g.fillRect(10, 10, 52, 182);
    g.fillRect(66, 10, 52, 182);
    g.fillStyle = '#6b7478';
    g.fillRect(18, 22, 36, 70);
    g.fillRect(74, 22, 36, 70);
    g.fillStyle = '#c9c4b8';
    g.fillRect(58, 96, 4, 26);
    g.fillRect(66, 96, 4, 26);
  });
  const lobbyTex = sg('d1Lobby', 192, 192, (g) => {
    // 門廳：雕花深色雙開門
    g.fillStyle = '#3a2c24';
    g.fillRect(0, 0, 192, 192);
    g.fillStyle = '#6a4a38';
    for (const x of [10, 100]) {
      g.fillRect(x, 10, 82, 182);
    }
    g.strokeStyle = '#2a1e18';
    g.lineWidth = 3;
    for (const x of [10, 100])
      for (let j = 0; j < 3; j++) {
        g.strokeRect(x + 10, 20 + j * 56, 62, 46);
        g.beginPath();
        g.arc(x + 41, 43 + j * 56, 14, 0, 7);
        g.stroke();
      }
    g.fillStyle = '#d8c070';
    g.fillRect(86, 100, 5, 24);
    g.fillRect(101, 100, 5, 24);
  });
  const recess = (k, w, y, fh, wm, belt, r) => {
    // 一層凹陽台：柱子與女兒牆凸出 0.3，中間是暗的開口；belt 有值的那層（二樓）改成腰帶加欄杆
    const n = Math.max(1, Math.round(w / 2.8)),
      bw = w / n,
      pw = 0.55,
      y0 = belt ? y + 0.2 : y + 0.95,
      y1 = y + fh - 0.3;
    if (!belt) k.box(0, w, y - 0.3, y0, -0.3, 0, wm, { col: false, tile: [0.6, 0.6] });
    for (let j = 0; j <= n; j++) {
      const x = Math.min(w - pw, Math.max(0, j * bw - pw / 2));
      k.box(x, x + pw, y - 0.3, y + fh - 0.3, -0.3, 0, wm, { col: false, tile: [0.6, 0.6] });
    }
    for (let j = 0; j < n; j++) {
      const lit = r() < 0.2,
        xc = (j + 0.5) * bw;
      k.plane(
        recessTex(lit),
        bw - pw + 0.1,
        y1 - y0,
        xc,
        (y0 + y1) / 2,
        -0.03,
        FRONT,
        lit ? { emissive: 0.5 } : {}
      );
      if (belt)
        for (const yy of [0.55, 0.85, 1.15])
          k.box(
            xc - bw / 2 + pw / 2,
            xc + bw / 2 - pw / 2,
            y + yy,
            y + yy + 0.04,
            -0.28,
            -0.24,
            '#3a3a3a',
            { col: false }
          );
      else if (r() < 0.5)
        k.box(xc + 0.1, xc + 0.8, y0 + 0.02, y0 + 0.5, -0.26, -0.04, MR.ac, { col: false });
    }
  };
  const posts = (k, list) => {
    // 前庭的小東西：黃色柵欄機（len 是豎起來的柵欄桿長度）、黑色矮柱、不鏽鋼欄杆、灌木花台
    for (const [x, z, kind, len] of list || []) {
      if (kind === 'gate') {
        k.box(x - 0.18, x + 0.18, 0.05, 1.1, z - 0.18, z + 0.18, '#e8b417');
        if (len)
          for (let j = 0; j < 6; j++)
            k.box(
              x - 0.05,
              x + 0.05,
              1.1 + (j * len) / 6,
              1.1 + ((j + 1) * len) / 6,
              z - 0.05,
              z + 0.05,
              j % 2 ? '#f2f0ea' : '#c8323c',
              { col: false }
            );
      } else if (kind === 'brick')
        k.box(x - 0.12, x + 0.12, 0.05, 1.3, z, z + (len || 3), MR.brick, { tile: [1.2, 1.2] }); // 沿 z 方向的紅磚矮牆
      else if (kind === 'bol') k.cyl(x, z, 0.09, 0.05, 0.8, '#1c1c1e', { seg: 8 });
      else if (kind === 'rail') {
        for (const yy of [0.5, 0.95])
          k.box(x, x + (len || 1.5), yy, yy + 0.05, z - 0.025, z + 0.025, '#b9bcbf', {
            col: false,
          });
        for (const xx of [x, x + (len || 1.5) - 0.05])
          k.box(xx, xx + 0.05, 0.05, 0.95, z - 0.025, z + 0.025, '#b9bcbf', { col: false });
      } else if (kind === 'bush') {
        k.box(x, x + (len || 2), 0.05, 0.5, z, z + 0.9, '#bfae96');
        k.box(x + 0.1, x + (len || 2) - 0.1, 0.5, 1.1, z + 0.1, z + 0.8, MR.plant, { col: false });
      }
    }
  };
  // ---- A 段：細葉片鐵捲門、內退門廊、停車場車棚 ----
  const fineShTex = (hex) =>
    sg(`d1ShF${hex}`, 32, 256, (g) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, 32, 256);
      for (let y = 0; y < 256; y += 6) {
        g.fillStyle = 'rgba(255,255,255,0.2)';
        g.fillRect(0, y, 32, 2);
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(0, y + 4, 32, 2);
      }
    });
  const porchTex = (P) =>
    sg(`d1Porch${JSON.stringify(P)}`, 512, 256, (g) => {
      // 內退門廊：上緣陰影、白牆、幾扇門（doors [[左緣, 寬, 色, 貼春聯]]，比例從觀看者左邊算起）
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#77756f');
      gr.addColorStop(0.3, '#c4c2bb');
      gr.addColorStop(1, '#e2e0d9');
      g.fillStyle = gr;
      g.fillRect(0, 0, 512, 256);
      if (P.band) {
        g.fillStyle = P.band;
        g.fillRect(0, 34, 512, 24);
      }
      for (const [x, wf, col, red] of P.doors || []) {
        const X = x * 512,
          Wd = wf * 512;
        g.fillStyle = '#7b7e80';
        g.fillRect(X - 4, 60, Wd + 8, 196);
        g.fillStyle = col;
        g.fillRect(X, 66, Wd, 190);
        g.fillStyle = 'rgba(255,255,255,.16)';
        g.fillRect(X + 4, 70, Wd * 0.3, 182);
        if (Wd > 80) {
          g.fillStyle = '#7b7e80';
          g.fillRect(X + Wd / 2 - 2, 66, 4, 190);
        }
        if (red) {
          g.fillStyle = '#c8281e';
          g.fillRect(X + Wd * (Wd > 80 ? 0.25 : 0.5) - 8, 110, 16, 56);
        }
      }
      for (const [x, col] of P.stuff || []) {
        g.fillStyle = col;
        g.fillRect(x * 512, 196, 26, 60);
      }
    });
  const fanTex = sg('d1Fan', 256, 160, (g) => {
    // 綠色扇形拱窗：半圓玻璃、放射狀窗櫺（透明底）
    g.clearRect(0, 0, 256, 160);
    g.fillStyle = '#f2f1ec';
    g.beginPath();
    g.arc(128, 154, 126, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillStyle = '#6f9f84';
    g.beginPath();
    g.arc(128, 154, 112, Math.PI, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = '#dfe6dc';
    g.lineWidth = 4;
    for (let j = 1; j < 12; j++) {
      const a = Math.PI + (j * Math.PI) / 12;
      g.beginPath();
      g.moveTo(128, 154);
      g.lineTo(128 + Math.cos(a) * 112, 154 + Math.sin(a) * 112);
      g.stroke();
    }
    g.fillStyle = '#f2f1ec';
    g.beginPath();
    g.arc(128, 154, 26, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillRect(0, 150, 256, 10);
  });
  const fyard = (k, w, Y, wm) => {
    // 鐵皮加蓋的前院：臨街一道磁磚矮牆（上面開鐵捲門與不鏽鋼門）、深色門楣、往樓房升高的浪板頂
    const yd = Y.d || 3.2,
      yh = 2.05;
    k.box(0, w, 0, yh, -yd, -yd + 0.15, wm, { tile: [0.6, 0.6] });
    for (const x of [0, w - 0.12])
      k.box(x, x + 0.12, 0, yh + 0.3, -yd, 0, wm, { tile: [0.6, 0.6] });
    for (const [x0, x1, kind, col] of Y.open || []) {
      if (kind === 'sh') {
        k.plane(
          fineShTex(col || '#8a8780'),
          x1 - x0,
          yh - 0.08,
          (x0 + x1) / 2,
          (yh - 0.08) / 2,
          -yd - 0.02,
          FRONT
        );
        continue;
      }
      k.box(x0, x1, 0, yh - 0.12, -yd - 0.03, -yd, col || '#a4a6a6', { col: false });
      k.box(
        (x0 + x1) / 2 - 0.02,
        (x0 + x1) / 2 + 0.02,
        0,
        yh - 0.12,
        -yd - 0.04,
        -yd - 0.03,
        '#6f7275',
        { col: false }
      );
      if (kind === 'red') {
        const xc = x0 + (x1 - x0) * 0.27;
        k.box(xc - 0.11, xc + 0.11, 1.15, 1.75, -yd - 0.045, -yd - 0.03, '#c8281e', { col: false });
      }
    }
    k.box(-0.05, w + 0.05, yh, yh + 0.38, -yd - 0.12, -yd + 0.15, Y.band || '#4c4f4e', {
      col: false,
    });
    const g = k.box(-0.05, w + 0.05, yh + 0.38, yh + 0.44, -yd - 0.25, 0, Y.roof || '#93a69a', {
        col: false,
      }),
      p = g.attributes.position;
    for (let j = 0; j < p.count; j++)
      p.setY(j, p.getY(j) + (0.55 * Math.max(0, p.getZ(j) + yd)) / yd);
    g.computeVertexNormals();
    for (const x of Y.pots || []) {
      k.box(x - 0.17, x + 0.17, 0, 0.3, -yd - 0.5, -yd - 0.16, '#a3583a', { col: false });
      k.box(x - 0.26, x + 0.26, 0.3, 0.95, -yd - 0.6, -yd - 0.08, MR.plant, { col: false });
    }
    for (let j = 0; j < (Y.bikes || 0); j++)
      bike(k, 0.5 + j * 1.9, -yd - 0.75, 0, bikeCols[(j * 2 + 1) % 6]);
  };
  const carport = (k, w, sp, apron) => {
    // 鐵皮車棚：生鏽鐵皮頂、鐵柱，臨街一道浪板圍籬，裡面停一台車
    const d = sp.d || 12,
      h = sp.gf || 2.6,
      rc = sp.roofCol || '#7a5a44',
      fc = sp.sh || '#4f8a5a';
    k.box(-0.1, w + 0.1, h, h + 0.1, 0.2, d, rc, { col: false });
    for (let j = 0, n = Math.max(2, Math.round(d / 6)); j <= n; j++)
      for (const x of [0.15, w - 0.25]) {
        const z = 0.4 + ((d - 0.7) * j) / n;
        k.box(x, x + 0.1, 0, h, z, z + 0.1, '#6a5a50');
      }
    k.box(0.1, w - 0.1, 0, 1.6, 0, 0.08, fc);
    for (let x = 0.1; x < w - 0.16; x += 0.3)
      k.box(x, x + 0.06, 0, 1.6, -0.03, 0, '#76947c', { col: false });
    for (let z0 = 2.2, j = 0; z0 + 4.4 < d - 0.8; z0 += 5.4, j++) {
      // 車棚夠深就多停幾台
      k.box(
        w / 2 - 0.9,
        w / 2 + 0.9,
        0.3,
        0.95,
        z0,
        z0 + 4.4,
        ['#eeeeec', '#3a3d42', '#b9bcc0'][j % 3]
      );
      k.box(w / 2 - 0.8, w / 2 + 0.8, 0.95, 1.45, z0 + 1.0, z0 + 3.6, '#aeb8be', { col: false });
      for (const z of [z0 + 0.7, z0 + 3.7])
        for (const x of [w / 2 - 0.92, w / 2 + 0.72])
          k.box(x, x + 0.2, 0, 0.62, z - 0.31, z + 0.31, '#1c1c1e', { col: false });
    }
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, d, MR.concrete, { col: false, surface: true });
  };
  const plaza = (k, w, sp) => {
    // 只有鋪面的前庭
    k.box(0, w, -0.5, 0.05, 0, sp.d || 10, paveMat(), {
      col: false,
      surface: true,
      tile: [0.8, 0.8],
    });
    posts(k, sp.posts);
  };
  // ---- D 段新增的樣式：鐵皮廠房（factory）、矮花台圍起來的停車空地（yard）、圓牌橫招、仿洋樓立面 ----
  const facWinTex = sg('d1FacWin', 256, 96, (g) => {
    // 廠房的綠色鐵絲網玻璃橫窗：左右兩片，各有 X 形斜撐
    g.fillStyle = '#8f8a78';
    g.fillRect(0, 0, 256, 96);
    for (const x of [6, 131]) {
      const gr = g.createLinearGradient(0, 6, 0, 90);
      gr.addColorStop(0, '#7fb39c');
      gr.addColorStop(1, '#4f8672');
      g.fillStyle = gr;
      g.fillRect(x, 6, 119, 84);
      g.strokeStyle = 'rgba(214,226,212,.8)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, 6);
      g.lineTo(x + 119, 90);
      g.moveTo(x + 119, 6);
      g.lineTo(x, 90);
      g.moveTo(x + 59, 6);
      g.lineTo(x + 59, 90);
      g.moveTo(x, 48);
      g.lineTo(x + 119, 48);
      g.stroke();
    }
  });
  const facGrimeTex = (hex) =>
    sg(`d1FacGrime2${hex}`, 512, 96, (g) => {
      // 廠房牆腳：小廣告殘膠、幾張紅黃小廣告與鏽水痕
      g.fillStyle = hex;
      g.fillRect(0, 0, 512, 96);
      const q = lcg(977);
      for (let j = 0; j < 150; j++) {
        g.fillStyle = [
          'rgba(255,255,255,.28)',
          'rgba(120,112,98,.2)',
          'rgba(236,228,200,.3)',
          'rgba(150,140,128,.18)',
        ][j % 4];
        g.fillRect(q() * 500, 14 + q() * 70, 3 + q() * 7, 2 + q() * 5);
      }
      for (let j = 0; j < 5; j++) {
        g.fillStyle = ['#c8322e', '#d8b82e', '#c8322e', '#e8e4d8', '#b8342c'][j];
        g.fillRect(30 + j * 100 + q() * 30, 30 + q() * 30, 12, 8);
      }
      for (let j = 0; j < 6; j++) {
        g.fillStyle = 'rgba(150,96,60,.25)';
        g.fillRect(q() * 500, 0, 4 + q() * 5, 96);
      }
    });
  const xiTex = sg('d1XiBanner', 512, 192, (g) => {
    // 廠房山牆上的紅色大帆布：紅燈籠、回紋邊與圓形囍字
    g.fillStyle = '#b5362c';
    g.fillRect(0, 0, 512, 192);
    g.strokeStyle = '#e9d9a8';
    g.lineWidth = 4;
    for (const [x, y] of [
      [20, 20],
      [452, 132],
    ]) {
      g.strokeRect(x, y, 40, 40);
      g.strokeRect(x + 10, y + 10, 20, 20);
    }
    for (const y of [48, 96, 144]) {
      g.fillStyle = '#e8562c';
      g.beginPath();
      g.arc(130, y, 20, 0, 7);
      g.fill();
      g.fillStyle = '#f0b03a';
      g.fillRect(120, y - 2, 20, 4);
    }
    g.fillStyle = '#e9d9a8';
    g.beginPath();
    g.arc(350, 96, 52, 0, 7);
    g.fill();
    g.fillStyle = '#b5362c';
    g.beginPath();
    g.arc(350, 96, 44, 0, 7);
    g.fill();
    g.fillStyle = '#e9d9a8';
    g.font = font(58);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('囍', 350, 100);
  });
  const discSign = (text, bg, disc, ring, fg) =>
    sg(`d1Disc_${text}|${bg}`, 768, 144, (g) => {
      // 浪板底的橫招，每個字各在一個有外框的圓牌上
      g.fillStyle = bg;
      g.fillRect(0, 0, 768, 144);
      g.fillStyle = 'rgba(0,0,0,.16)';
      for (let x = 0; x < 768; x += 12) g.fillRect(x, 0, 4, 144);
      const t = [...text],
        st = 768 / (t.length + 0.4),
        rr = Math.min(st * 0.46, 62);
      t.forEach((ch, j) => {
        const cx = st * (j + 0.7);
        g.fillStyle = ring;
        g.beginPath();
        g.arc(cx, 72, rr, 0, 7);
        g.fill();
        g.fillStyle = disc;
        g.beginPath();
        g.arc(cx, 72, rr * 0.86, 0, 7);
        g.fill();
        g.fillStyle = fg;
        g.font = font(rr * 1.15);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(ch, cx, 72 + rr * 0.06);
      });
    });
  const villaTex = sg('d1Villa2', 256, 288, (g) => {
    // 仿洋樓的二樓立面：酒紅洗石子、白色轉角石與窗框，中間拱窗、兩邊長方窗，底下一道白色橫帶
    g.fillStyle = '#a2435a';
    g.fillRect(0, 0, 256, 288);
    g.fillStyle = '#efecea';
    g.fillRect(0, 0, 256, 10);
    g.fillRect(0, 244, 256, 44);
    for (let y = 16, j = 0; y < 240; y += 30, j++) {
      const q = j % 2 ? 12 : 22;
      g.fillRect(0, y, q, 20);
      g.fillRect(256 - q, y, q, 20);
    }
    const pane = (x, y, ww, hh) => {
      g.fillStyle = '#8fa3b4';
      g.fillRect(x, y, ww, hh);
      g.strokeStyle = '#efecea';
      g.lineWidth = 3;
      for (let j = 1; j < 3; j++) {
        g.beginPath();
        g.moveTo(x, y + (hh * j) / 3);
        g.lineTo(x + ww, y + (hh * j) / 3);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(x + ww / 2, y);
      g.lineTo(x + ww / 2, y + hh);
      g.stroke();
    };
    for (const [x, lit] of [
      [34, false],
      [176, true],
    ]) {
      // 左邊是封起來的白色窗板，右邊是長方窗；窗框兩側各一排凸出的白石
      g.fillStyle = '#efecea';
      g.fillRect(x - 5, 70, 56, 150);
      g.fillRect(x - 11, 62, 68, 10);
      for (let y = 84; y < 210; y += 34) {
        g.fillRect(x - 13, y, 10, 18);
        g.fillRect(x + 49, y, 10, 18);
      }
      if (lit) pane(x + 2, 80, 42, 132);
      else {
        g.strokeStyle = '#d2cecb';
        g.lineWidth = 2;
        g.strokeRect(x + 3, 80, 40, 132);
      }
    }
    g.fillStyle = '#efecea';
    g.beginPath();
    g.moveTo(100, 220);
    g.lineTo(100, 78);
    g.arc(128, 78, 28, Math.PI, 0);
    g.lineTo(156, 220);
    g.closePath();
    g.fill();
    g.save();
    g.beginPath();
    g.moveTo(105, 212);
    g.lineTo(105, 80);
    g.arc(128, 80, 23, Math.PI, 0);
    g.lineTo(151, 212);
    g.closePath();
    g.clip();
    pane(105, 54, 46, 158);
    g.restore();
  });
  const linesTex = (lines, bg, fg) =>
    sg(`d1Lines_${lines.join('|')}${bg}`, 512, r16(64 * lines.length), (g) => {
      // 多行字的帆布
      const H = r16(64 * lines.length),
        lh = H / lines.length;
      g.fillStyle = bg;
      g.fillRect(0, 0, 512, H);
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lines.forEach((t, j) => {
        g.font = font(Math.min(lh * 0.72, 480 / t.length));
        g.fillText(t, 256, lh * (j + 0.5) + 2);
      });
    });
  const sOf = (L, s) => (L[2] > 0 ? s - L[0] : L[1] - s); // 這一格裡 s 對應的區域 x
  // ---- C 段新增：廠房牆上的東西（cx）----
  const rustTex = (hex) =>
    sg(`d1Rust${hex}`, 512, 128, (g) => {
      // 牆腳往上竄的鏽水痕（透明底）
      g.clearRect(0, 0, 512, 128);
      const q = lcg(431),
        n = parseInt(hex.slice(1), 16),
        rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
      const gb = g.createLinearGradient(0, 70, 0, 128);
      gb.addColorStop(0, `rgba(${rgb},0)`);
      gb.addColorStop(1, `rgba(${rgb},.55)`);
      g.fillStyle = gb;
      g.fillRect(0, 70, 512, 58);
      for (let j = 0; j < 70; j++) {
        const x = q() * 506,
          ww = 3 + q() * 12,
          hh = 25 + q() * 100,
          gr = g.createLinearGradient(0, 128 - hh, 0, 128);
        gr.addColorStop(0, `rgba(${rgb},0)`);
        gr.addColorStop(0.5, `rgba(${rgb},.6)`);
        gr.addColorStop(1, `rgba(${rgb},.85)`);
        g.fillStyle = gr;
        g.fillRect(x, 128 - hh, ww, hh);
      }
    });
  const facWinDull = sg('d1FacWinDull', 256, 96, (g) => {
    // 舊廠房的綠框窗：深綠鐵框、灰綠的髒玻璃，三片直分
    g.fillStyle = '#3f6b55';
    g.fillRect(0, 0, 256, 96);
    for (let j = 0; j < 3; j++) {
      const x = 6 + j * 83,
        gr = g.createLinearGradient(0, 6, 0, 90);
      gr.addColorStop(0, '#7d9c8c');
      gr.addColorStop(1, '#46675a');
      g.fillStyle = gr;
      g.fillRect(x, 6, 78, 84);
      g.fillStyle = 'rgba(225,232,222,.35)';
      g.fillRect(x + 8 + j * 9, 14, 30, 40);
    }
    g.fillStyle = '#35584a';
    g.fillRect(0, 46, 256, 4);
  });
  const facC = (k, L, w, cx, h) => {
    const sx = (s) => sOf(L, s);
    if (cx.rust) {
      const n = Math.max(1, Math.ceil(w / 12));
      for (let j = 0; j < n; j++)
        k.plane(rustTex(cx.rust), w / n, 2.9, (w * (j + 0.5)) / n, 1.45, -0.035, FRONT, {
          transparent: true,
        });
    }
    for (const [s, ww] of cx.wins || []) {
      const x = sx(s);
      k.box(
        x - ww / 2 - 0.08,
        x + ww / 2 + 0.08,
        2.42,
        3.78,
        -0.06,
        0,
        cx.dull ? '#3f6b55' : '#5f8f74',
        { col: false }
      );
      k.plane(cx.dull ? facWinDull : facWinTex, ww, 1.2, x, 3.1, -0.07, FRONT);
    }
    for (const [kind, s] of cx.props || []) {
      const x = sx(s);
      if (kind === 'pipe') {
        k.box(x, x + 0.1, 0, h - 0.6, -0.14, -0.03, '#eceae4', { col: false });
        k.box(x + 0.25, x + 0.33, 0.4, h - 1.5, -0.12, -0.03, '#e2e0d8', { col: false });
      } else if (kind === 'box') {
        k.box(x - 0.3, x + 0.3, 1.0, 1.85, -0.26, -0.02, '#b9b8b0', { col: false });
        k.box(x - 0.24, x + 0.24, 1.08, 1.77, -0.275, -0.26, '#8f918c', { col: false });
      } else if (kind === 'ac') ac(k, x - 0.4, 2.3, -0.45);
      else if (kind === 'door') {
        k.box(x - 0.55, x + 0.55, 0, 2.25, -0.05, 0, '#7a4a30', { col: false });
        k.box(x - 0.45, x + 0.45, 0.05, 2.15, -0.065, -0.05, '#b9a48a', { col: false });
      } else if (kind === 'notice')
        k.box(x - 0.3, x + 0.3, 1.15, 2.0, -0.05, 0, '#c8322e', { col: false });
      else if (kind === 'vent')
        k.box(x - 0.35, x + 0.35, 4.6, 5.3, -0.05, 0, '#3a3a38', { col: false }); // 牆頂附近的深色通風口
      else if (kind === 'rpipe') {
        k.box(x, x + 0.07, 0, h - 0.5, -0.11, -0.03, '#8f6a52', { col: false });
        k.box(x - 1.6, x, 2.6, 2.68, -0.13, -0.04, '#b9b3a6', { col: false });
      } // 生鏽的立管與一段橫管
      else if (kind === 'pole') {
        k.cyl(x, -0.3, 0.13, 0, 9.2, '#8a8478', { seg: 8 });
        k.box(x - 0.9, x + 0.9, 8.3, 8.4, -0.36, -0.24, '#6f6a60', { col: false });
      } // 路邊的電線桿
      else if (kind === 'duct') {
        k.box(x - 0.5, x + 0.5, h - 1.6, h + 0.9, -1.0, -0.02, '#b4b8ba', { col: false });
        k.box(x - 0.5, x + 0.5, h + 0.2, h + 0.9, -0.02, 2.5, '#b4b8ba', { col: false });
      }
    }
    if (cx.rowBikes) {
      const [a, b] = cx.rowBikes.map(sx).sort((p, q) => p - q);
      for (let x = a + 0.4, j = 0; x < b - 0.3; x += 0.85, j++)
        if (j % 7 !== 5) bike(k, x, -1.62 - (j % 3) * 0.06, 1, bikeCols[(j * 5 + (j >> 2)) % 6]);
    }
  };
  const factory = (k, L, w, sp, apron) => {
    // 單層挑高的鐵皮廠房：連續的金屬板牆、綠色橫窗、百葉通風口，屋頂從臨街屋簷往後升高
    const h = sp.h || 6.4,
      d = sp.d || 24,
      rise = sp.rise || 0,
      wc = sp.wall || '#d9d6cc',
      sx = (s) => sOf(L, s);
    const slope = (g) => {
      const p = g.attributes.position;
      for (let j = 0; j < p.count; j++)
        if (p.getY(j) > 1) p.setY(j, p.getY(j) + (rise * Math.max(0, p.getZ(j))) / d);
      g.computeVertexNormals();
      return g;
    };
    slope(k.box(0, w, -0.8, h, 0, d, wc));
    slope(
      k.box(-0.25, w + 0.25, h, h + 0.14, -0.35, d + 0.1, sp.roofCol || '#d8d2c6', { col: false })
    );
    for (let x = 1.02; x < w - 0.2; x += 1.02)
      k.box(x, x + 0.03, 0, h, -0.022, 0, '#c2beb2', { col: false }); // 直向板縫
    for (const s of sp.fwins || []) {
      const x = sx(s);
      k.box(x - 2.06, x + 2.06, 2.5, 4.1, -0.06, 0, sp.fwinDull ? '#3f6b55' : '#8f8a78', {
        col: false,
      });
      k.plane(sp.fwinDull ? facWinDull : facWinTex, 3.9, 1.4, x, 3.3, -0.07, FRONT);
      k.box(x + 2.5, x + 2.6, 0, h, -0.1, 0, '#eceae4', { col: false });
    }
    for (const s of sp.vents || []) {
      const x = sx(s);
      k.box(x - 0.45, x + 0.45, 4.95, 5.6, -0.05, 0, '#6b4a36', { col: false });
      for (let j = 0; j < 4; j++)
        k.box(x - 0.4, x + 0.4, 5.02 + j * 0.15, 5.07 + j * 0.15, -0.07, -0.05, '#4a3224', {
          col: false,
        });
    }
    const n = Math.max(1, Math.ceil(w / 14));
    for (let j = 0; j < n; j++)
      k.plane(facGrimeTex(wc), w / n, 2.3, (w * (j + 0.5)) / n, 1.2, -0.03, FRONT);
    if (sp.board) {
      const [a, b] = [sx(sp.board[0]), sx(sp.board[1])].sort((p, q) => p - q);
      k.box(a, b, 1.4, 3.3, -0.07, 0, sp.board[2] || '#d9b53a', { col: false });
      k.box(a + 0.15, b - 0.15, 2.75, 3.1, -0.08, -0.07, '#3f6f3a', { col: false });
    }
    if (sp.swin) {
      const x = sx(sp.swin);
      k.plane(YHT.win(), 1.3, 1.3, x, 2.75, -0.03, FRONT);
      k.box(x - 1.5, x - 1.1, 1.5, 2.2, -0.2, 0, '#8a8d90', { col: false });
    }
    if (sp.turret) {
      // 屋頂上凸出的方塔與紅色四角錐頂
      const [ts, tb, tz, tt, th] = sp.turret,
        x = sx(ts),
        zc = tb + tz / 2;
      k.box(x - tz / 2, x + tz / 2, h, tt, tb, tb + tz, '#e6e3da', { col: false });
      const g = k.cyl(x, zc, (tz / 2 + 0.35) * Math.SQRT2, tt, tt + th, '#d8463e', {
        r1: 0.01,
        seg: 4,
      });
      g.translate(-x, 0, -zc);
      g.rotateY(Math.PI / 4);
      g.translate(x, 0, zc);
      k.plane(YHT.win(), 0.9, 0.9, x, (h + tt) / 2 + 0.6, tb - 0.03, FRONT);
    }
    if (sp.endBanner) {
      const x = sx(sp.endBanner),
        bw = Math.min(15, d - 5);
      k.plane(
        xiTex,
        bw,
        bw * 0.375,
        x < w / 2 ? -0.05 : w + 0.05,
        1.6 + bw * 0.19,
        2.5 + bw / 2,
        x < w / 2 ? -Math.PI / 2 : Math.PI / 2,
        { emissive: 0.08 }
      );
    }
    for (let j = 0; j < (sp.bikes || 0); j++)
      bike(k, 1.5 + j * ((w - 4) / Math.max(1, sp.bikes - 1)), -0.32, 0, bikeCols[j % 6]);
    if (sp.cx) facC(k, L, w, sp.cx, h); // C 段：鏽水痕、自訂寬度的窗、牆上的雜物、垂直停的機車
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
  };
  const yard = (k, L, w, sp, r) => {
    // 矮花台（下半亂石、上半紅磚）圍起來的停車空地：花台後面一排樹，gate 是入口的鐵網門
    const d = sp.d || 18,
      sx = (s) => sOf(L, s),
      [ga, gb] = sp.gate ? sp.gate.map(sx).sort((a, b) => a - b) : [w, w];
    k.box(0, w, -0.5, 0.04, 0.55, d, '#8d897f', { col: false, surface: true });
    for (const [a, b] of [
      [0, ga],
      [gb, w],
    ])
      if (b - a > 0.3) {
        k.box(a, b, -0.5, 0.55, 0, 0.55, '#9b968b');
        k.box(a + 0.03, b - 0.03, 0.55, 1.1, 0.04, 0.51, '#a65a44', { col: false });
        k.box(a + 0.15, b - 0.15, 1.05, 1.7, 0.1, 1.0, MR.plant, { col: false });
      }
    if (sp.gate) {
      k.box(ga, gb, 0.05, 1.9, 0.22, 0.27, '#3f7a52');
      k.box(ga + 0.2, gb - 0.2, 0.12, 1.0, 0.19, 0.22, '#2f6fc0', { col: false });
      k.box(ga - 0.5, ga, 0, 2.0, 0.02, 0.52, '#a65a44');
    }
    for (let x = 1.6; x < w - 1; x += 3.4 + r() * 1.6) {
      if (x > ga - 1 && x < gb + 1) continue;
      const z = 2.2 + r() * 1.6,
        th = 3.6 + r() * 2.2,
        gc = ['#4f8a3c', '#5c9a45', '#467a36'][(r() * 3) | 0];
      k.cyl(x, z, 0.13, 0, th * 0.6, '#5a4634', { seg: 6 });
      k.cyl(x, z, 0.8, th * 0.48, th * 0.78, gc, { r1: 1.45, seg: 8 });
      k.cyl(x, z, 1.45, th * 0.78, th * 1.15, gc, { r1: 0.35, seg: 8 });
    }
    for (const s of sp.poles || []) k.cyl(sx(s), -0.15, 0.14, 0, 8.6, '#8a8478', { seg: 8 });
    if (sp.board) {
      const [a, b] = [sx(sp.board[0]), sx(sp.board[1])].sort((p, q) => p - q);
      k.box(a, b, 1.3, 2.9, 0.26, 0.31, '#f1efe8', { col: false });
      if (sp.board[2])
        k.plane(
          paint(
            sp.board[2],
            sp.board[3] || '#f1efe8',
            sp.board[4] || '#333333',
            null,
            b - a - 0.3,
            0.6,
            96
          ),
          b - a - 0.3,
          0.6,
          (a + b) / 2,
          2.45,
          0.25,
          FRONT
        );
      for (const x of [a + 0.2, b - 0.26])
        k.box(x, x + 0.06, 1.1, 1.3, 0.26, 0.31, '#6f7377', { col: false });
    }
    for (let j = 0; j < (sp.bikes || 0); j++)
      bike(k, 1.2 + j * ((w - 3.4) / Math.max(1, sp.bikes - 1)), -0.32, 0, bikeCols[(j + 2) % 6]);
  };
  // 工地（2026-05）：整平的水泥地、臨街鍍鋅網片圍籬、gate [s0, s1] 白色鋼板大門、bld [s0, s1, z0, z1, 樓層] 包藍色防護網的興建中結構體、trucks [[s, z, 長, 車頭色, 車斗色, 臂架色]] 工程車、stacks [[s, z, 寬, 深, 高, 色]] 堆料；pave 色：只鋪一條水泥前埕
  const netTex = (wm, hm) => {
    const ppm = Math.min(24, 1536 / wm),
      W = r16(wm * ppm),
      Hh = r16(hm * ppm);
    return sg(`d1Net${W}x${Hh}`, W, Hh, (g) => {
      g.clearRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(44,112,190,0.64)';
      g.fillRect(0, 0, W, Hh);
      g.strokeStyle = 'rgba(215,220,224,0.7)';
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
  };
  const meshTex = sg('d1SiteMesh', 128, 96, (g) => {
    g.clearRect(0, 0, 128, 96);
    g.fillStyle = 'rgba(170,176,180,0.35)';
    g.fillRect(0, 0, 128, 96);
    g.strokeStyle = 'rgba(120,126,130,0.95)';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = 0; x <= 128; x += 8) {
      g.moveTo(x, 0);
      g.lineTo(x, 96);
    }
    for (let y = 0; y <= 96; y += 12) {
      g.moveTo(0, y);
      g.lineTo(128, y);
    }
    g.stroke();
    g.lineWidth = 5;
    g.strokeRect(0, 0, 128, 96);
  });
  const site = (k, L, w, sp) => {
    const d = sp.d || 30,
      sx = (s) => sOf(L, s),
      NC = { col: false },
      TR = { transparent: true, double: true };
    const gy = (x, z) => {
      const q = k.w(x, z);
      return H(q[0], q[1]) - k.base;
    }; // 這一點的地面比這格原點高多少：地是斜的，圍籬與鋪面一片一片貼著地走
    const bx = (x0, x1, y0, y1, z0, z1, c, o = NC) => {
      const g = gy((x0 + x1) / 2, (z0 + z1) / 2);
      return k.box(x0, x1, y0 + g, y1 + g, z0, z1, c, o);
    };
    const [ga, gb] = sp.gate ? sp.gate.map(sx).sort((a, b) => a - b) : [-1, -1];
    for (let x = 0; x < w - 0.01; x += 4)
      for (let z = 0.3; z < d - 0.01; z += 4)
        bx(x, Math.min(w, x + 4), -0.6, 0.07, z, Math.min(d, z + 4), '#b3b0a6'); // 整平的水泥地
    // 臨街：混凝土矮基座＋鍍鋅網片（一片 2.4 m）；大門那一段是白色鋼板＋上面一截鋼管欄杆
    for (let x = 0; x < w - 0.01; x += 2.4) {
      const x1 = Math.min(w, x + 2.4),
        xc = (x + x1) / 2,
        g = gy(xc, 0.13);
      if (xc > ga && xc < gb) {
        bx(x + 0.04, x1 - 0.04, 0.08, 1.75, 0.1, 0.16, '#e9e9e6');
        bx(x + 0.04, x1 - 0.04, 2.08, 2.14, 0.1, 0.16, '#e9e9e6');
        for (const xx of [x + 0.04, xc - 0.03, x1 - 0.1])
          k.box(xx, xx + 0.06, 1.75 + g, 2.1 + g, 0.1, 0.16, '#e9e9e6', NC);
        continue;
      }
      k.plane(meshTex, x1 - x, 1.7, xc, 1.15 + g, 0.12, FRONT, TR);
      k.box(x, x + 0.06, g - 0.3, 2.05 + g, 0.09, 0.15, '#8f959a', NC);
      bx(x, x1, -0.6, 0.3, 0.02, 0.24, '#a09d96');
    }
    k.wallLine(0, 0.13, w, 0.13, -1, 3);
    if (sp.gate) {
      // 面實踐路的那一端：轉角白色鋼板門，再過去接實踐路那邊的圍籬（src/world/buildings/shijian/S4.js）
      for (let z = 0.2; z < 9.8; z += 2.4) {
        const g = gy(0.05, z + 1.2);
        k.box(0.02, 0.08, 0.08 + g, 1.75 + g, z + 0.04, z + 2.36, '#e9e9e6', NC);
        k.box(0.02, 0.08, 2.08 + g, 2.14 + g, z + 0.04, z + 2.36, '#e9e9e6', NC);
        k.box(0.02, 0.08, 1.75 + g, 2.1 + g, z, z + 0.06, '#e9e9e6', NC);
      }
      k.wallLine(0.05, 0, 0.05, 9.8, -1, 3);
    }
    if (sp.bld) {
      // 興建中的 RC 結構體：灰色梁柱、每層深色開口、頂層棕色模板與往上伸的鷹架，四面包半透明藍網（樓高與顏色跟實踐路那一半一致）
      const [s0, s1, z0, z1, nf] = sp.bld,
        x0 = sx(s1),
        x1 = sx(s0),
        fh = 3.1,
        g = gy((x0 + x1) / 2, (z0 + z1) / 2),
        H1 = nf * fh + g;
      k.box(x0 + 0.7, x1 - 0.7, g - 1.5, H1, z0 + 0.7, z1 - 0.7, '#b9b6ae');
      for (let f = 0; f < nf; f++)
        k.box(
          x0 + 0.68,
          x1 - 0.68,
          g + f * fh + 0.5,
          g + f * fh + 2.7,
          z0 + 0.68,
          z1 - 0.68,
          '#77756f',
          NC
        );
      k.box(x0 + 0.5, x1 - 0.5, H1, H1 + 0.9, z0 + 0.5, z1 - 0.5, '#b08a5a', NC); // 最上層的木模板
      for (const z of [z0, z1 - 0.05]) {
        for (const y of [H1 + 0.9, H1 + 1.8])
          k.box(x0, x1, y, y + 0.05, z, z + 0.05, '#b9bcbe', NC);
        for (let x = x0; x <= x1; x += 1.8)
          k.box(x, x + 0.05, H1, H1 + 1.8, z, z + 0.05, '#b9bcbe', NC);
      }
      for (const x of [x0, x1 - 0.05])
        for (const y of [H1 + 0.9, H1 + 1.8])
          k.box(x, x + 0.05, y, y + 0.05, z0, z1, '#b9bcbe', NC);
      const hh = nf * fh,
        yc = g + hh / 2,
        lw = x1 - x0,
        ld = z1 - z0;
      k.plane(netTex(lw, hh), lw, hh, (x0 + x1) / 2, yc, z0 - 0.03, FRONT, TR);
      k.plane(netTex(lw, hh), lw, hh, (x0 + x1) / 2, yc, z1 + 0.03, 0, TR);
      k.plane(netTex(ld, hh), ld, hh, x0 - 0.03, yc, (z0 + z1) / 2, -Math.PI / 2, TR);
      k.plane(netTex(ld, hh), ld, hh, x1 + 0.03, yc, (z0 + z1) / 2, Math.PI / 2, TR);
      for (let x = x0 + 4; x < x1 - 2; x += 9) {
        bx(x, x + 2.4, 0.04, 0.9, z0 - 3.2, z0 - 2.0, '#a9865c', {});
        bx(x + 3, x + 5.4, 0.04, 0.5, z0 - 3.0, z0 - 1.8, '#7f8386', {});
      } // 堆在樓前的模板與鋼筋
    }
    if (sp.trucks) {
      // 停在空地上的工程車：紅色泵浦車（收起來的臂架）、黃色吊車、白色小貨車；位置照 2026-05 街景裡看到的那一區
      const truck = (x, z, len, cab, body, boom) => {
        const g = gy(x + 1.1, z + len / 2);
        k.box(x, x + 2.3, 0.5 + g, 2.6 + g, z, z + 2.0, cab);
        k.box(x + 0.15, x + 2.15, 1.5 + g, 2.3 + g, z - 0.02, z, '#2a3038', NC);
        k.box(x + 0.1, x + 2.2, 0.5 + g, 1.5 + g, z + 2.0, z + len, body);
        for (const zz of [z + 0.5, z + len - 1.2])
          for (const xx of [x - 0.05, x + 1.95])
            k.box(xx, xx + 0.4, 0.04 + g, 0.95 + g, zz, zz + 0.9, '#1c1c1e', NC);
        if (boom) k.box(x + 0.8, x + 1.5, 2.2 + g, 2.9 + g, z + 0.3, z + len + 1.5, boom, NC);
      };
      for (const [s, z, len, cab, body, boom] of sp.trucks) truck(sx(s), z, len, cab, body, boom);
    }
    for (const [s, z, ww, dd, hh, c] of sp.stacks || [])
      bx(sx(s), sx(s) + ww, 0.04, hh, z, z + dd, c, {}); // 堆放的模板、鋼筋
  };
  const alley = (k, w, sp, apron) => {
    // D 段：兩棟之間的側門巷：水泥鋪面、退進去一點的格柵鐵門、巷口的半透明圓弧小雨棚
    const [gc, cc] = sp.alley,
      d = sp.d || 10,
      zg = 1.3;
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, d, MR.concrete, { col: false, surface: true });
    k.box(0.05, w - 0.05, 0.05, 2.15, zg, zg + 0.06, gc);
    for (let x = 0.2; x < w - 0.2; x += 0.22)
      k.box(x, x + 0.05, 0.15, 2.05, zg - 0.03, zg, '#c9b89a', { col: false });
    k.box(0, w, 2.15, 2.75, zg - 0.05, zg + 0.1, gc, { col: false });
    for (const [y0, y1, z0, z1] of [
      [2.95, 3.03, -0.1, zg],
      [2.8, 2.98, -0.55, -0.05],
      [2.5, 2.84, -0.8, -0.5],
    ])
      k.box(0.02, w - 0.02, y0, y1, z0, z1, cc, { col: false });
  };
  const exposed = (L, lo) =>
    !D1_ST.lots.some(
      (M) =>
        M !== L &&
        !M[3].alley &&
        M[2] === L[2] &&
        (lo ? Math.abs(M[1] - L[0]) < 1.2 : Math.abs(M[0] - L[1]) < 1.2)
    ); // 這一側有沒有鄰居
  D1_ST.lots.forEach((L, i) => {
    const sp = L[3],
      { ox, oz, ang, w, apron } = d1LotFrame(L),
      r = lcg(5200 + i * 7);
    const ex0 = L[2] > 0 ? exposed(L, true) : exposed(L, false),
      ex1 = L[2] > 0 ? exposed(L, false) : exposed(L, true);
    const k = vcKit(new Kit(I, ox, oz, ang));
    kits.push(k);
    if (sp.plaza) {
      plaza(k, w, sp);
      return;
    }
    if (sp.carport) {
      carport(k, w, sp, apron);
      posts(k, sp.posts);
      return;
    } // A 段：停車場車棚
    if (sp.factory) {
      factory(k, L, w, sp, apron);
      return;
    } // D 段：鐵皮廠房
    if (sp.yard) {
      yard(k, L, w, sp, r);
      return;
    }
    if (sp.site) {
      site(k, L, w, sp);
      return;
    }
    if (sp.pave) {
      for (let x = 0; x < w - 0.01; x += 3) {
        const x1 = Math.min(w, x + 3),
          q = k.w((x + x1) / 2, (sp.d || 2) / 2),
          g = H(q[0], q[1]) - k.base;
        k.box(x, x1, g - 0.6, g + 0.06, 0, sp.d || 2, sp.pave, { col: false });
      }
      return;
    } // 只鋪一條貼著地形的水泥前埕（紅樓門前）
    if (sp.alley) {
      alley(k, w, sp, apron);
      return;
    } // D 段：側門巷                                                         // D 段：矮花台停車空地
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
    } else if (gk === 'wall') {
      // B 段：一樓是牆加鋁窗（門廳的位置不開窗）
      const n = Math.max(1, Math.round(w / 2.6));
      for (let j = 0; j < n; j++) {
        const x = (w * (j + 0.5)) / n;
        if (!sp.lobby || Math.abs(x - sp.lobby[0]) > sp.lobby[1] / 2 + 1.2)
          k.plane(ROWT.alWin(), 1.5, 1.2, x, 1.9, -0.06, FRONT);
      }
    } else if (gk === 'porch') {
      // A 段：一樓內退的門廊（兩側貼磚柱、上面一道樑，裡面是白牆與門）
      k.plane(porchTex(sp.porch || {}), w - 0.8, gh + 0.25, w / 2, (gh + 0.25) / 2, -0.03, FRONT, {
        emissive: 0.1,
      });
      for (const x of [0, w - 0.45])
        k.box(x, x + 0.45, 0, gf, -0.28, 0, wm, { col: false, tile: [0.6, 0.6] });
      k.box(0, w, gh + 0.25, gf, -0.28, 0, wm, { col: false, tile: [0.6, 0.6] });
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
    else if (!sp.nobikes && w > 4 && r() < 0.6) {
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
      const bk = (sp.balF && sp.balF[f]) || sp.bal || 'grille'; // A 段：balF {樓層序: 樣式} 可以單獨指定某一層（1 = 二樓）
      if (bk === 'cage') {
        win2(w / 2, y + 1.45, ww - 0.4, 1.4, false);
        k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -0.75, 0, sp.cageCol || 'metal', { col: false });
        k.box(0.3, w - 0.3, y + 2.55, y + 2.62, -0.75, 0, sp.cageCol || 'metal', { col: false });
        for (let x = 0.3; x <= w - 0.29; x += 0.18)
          k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, sp.cageCol || 'metal', {
            col: false,
          });
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
      } else if (bk === 'recess')
        recess(k, w, y, fh, wallMat(sp.face || sp.wall), f === 1 && sp.belt, r);
      else if (bk === 'wins') {
        const n = Math.max(1, Math.round(w / 2.6));
        for (let j = 0; j < n; j++) win2((w * (j + 0.5)) / n, y + 1.5, 1.5, 1.4, false);
      } else if (bk === 'planter' || bk === 'lintel') {
        // D 段：'planter' 窗下凸出的實心磚花台＋窗型冷氣；'lintel' 整排深色鋁窗＋扁拱線腳
        const n = Math.max(1, Math.round(w / 5.2)),
          bw = w / n;
        for (let j = 0; j < n; j++) {
          const x0 = j * bw + 0.45,
            x1 = (j + 1) * bw - 0.45;
          if (bk === 'planter') {
            k.box(x0, x1 - 1.1, y + 0.2, y + 1.1, -0.55, 0, wm, { col: false, tile: [0.6, 0.6] });
            win2((x0 + x1 - 1.1) / 2, y + 1.8, x1 - x0 - 1.5, 1.25, false);
            ac(k, x1 - 0.9, y + 1.15, -0.45);
          } else {
            win2((x0 + x1) / 2, y + 1.35, x1 - x0 - 0.3, 1.5, false);
            k.box(x0 - 0.2, x1 + 0.2, y + 2.2, y + 2.42, -0.14, 0, sp.bands || '#cdbfb0', {
              col: false,
            });
            for (const [q, up] of [
              [0.14, 0.13],
              [0.3, 0.24],
            ]) {
              const xa = x0 + (x1 - x0) * q,
                xb = x1 - (x1 - x0) * q;
              k.box(xa, xb, y + 2.2 + up, y + 2.42 + up, -0.14, 0, sp.bands || '#cdbfb0', {
                col: false,
              });
              k.box(xa + 0.1, xb - 0.1, y + 2.3, y + 2.2 + up, -0.1, 0, wm, {
                col: false,
                tile: [0.6, 0.6],
              });
            }
            k.box(x0 - 0.1, x1 + 0.1, y + 0.45, y + 0.58, -0.14, 0, sp.bands || '#cdbfb0', {
              col: false,
            });
            ac(k, x1 - 0.7, y + 1.5, -0.45);
          }
        }
      } else if (bk === 'wcage' || bk === 'tophood') {
        // D 段：'wcage' 白鐵窗籠（下半是凸出的磚面花台、上面浪板雨遮 cageHood）；'tophood' 頂層只有米黃長雨遮
        win2(w / 2, y + 1.45, ww - 0.4, 1.4, false);
        if (bk === 'wcage') {
          k.box(0.35, w - 0.35, y + 0.1, y + 0.75, -0.7, 0, wm, { col: false, tile: [0.6, 0.6] });
          for (const yy of [0.75, 2.3])
            k.box(0.3, w - 0.3, y + yy, y + yy + 0.05, -0.75, 0, '#eeeeea', { col: false });
          for (let x = 0.3; x <= w - 0.29; x += 0.2)
            k.box(x, x + 0.03, y + 0.8, y + 2.3, -0.75, -0.72, '#eeeeea', { col: false });
        }
        k.box(
          0.2,
          w - 0.2,
          y + 2.4,
          y + 2.46,
          bk === 'wcage' ? -0.95 : -0.8,
          0,
          bk === 'wcage' ? sp.cageHood || '#8fe0b8' : '#e6dcc0',
          { col: false }
        );
      } else if (bk === 'slots') {
        // D 段：一扇一扇的窄窗，各自一個白鐵籠與小雨遮（slots [每層幾扇, 雨遮色]）
        const [n, hc] = sp.slots || [Math.max(1, Math.round(w / 2.6)), '#4fc08a'];
        for (let j = 0; j < n; j++) {
          const x = (w * (j + 0.5)) / n;
          win2(x, y + 1.5, 1.2, 1.3, false);
          k.box(x - 0.7, x + 0.7, y + 0.78, y + 0.84, -0.5, 0, '#e8e8e4', { col: false });
          k.box(x - 0.75, x + 0.75, y + 2.25, y + 2.31, -0.62, 0, hc, { col: false });
          for (let b = 0; b <= 7; b++)
            k.box(
              x - 0.7 + b * 0.196,
              x - 0.675 + b * 0.196,
              y + 0.84,
              y + 2.25,
              -0.5,
              -0.475,
              '#e8e8e4',
              { col: false }
            );
        }
      } else if (bk === 'para') {
        k.box(0.12, w - 0.12, y, y + 1.45, -0.14, 0, wm, { col: false, tile: [0.6, 0.6] });
        win2(w / 2, y + 2.2, w - 0.5, 1.4, false);
      } // A 段：封閉式陽台，1.45 m 高的磁磚女兒牆上面一整排鋁窗
      else if (bk === 'small') {
        // A 段：一大一小交錯的小窗，上面一小塊磚砌窗楣
        const n = Math.max(2, Math.round(w / 2.1));
        for (let j = 0; j < n; j++) {
          const big = (j + f) % 2 === 0,
            sw = big ? 1.15 : 0.7,
            sh2 = big ? 1.2 : 0.7,
            x = (w * (j + 0.5)) / n,
            yy = y + 1.75;
          win(k, x, yy, sw, sh2, false);
          k.box(
            x - sw / 2 - 0.1,
            x + sw / 2 + 0.1,
            yy + sh2 / 2,
            yy + sh2 / 2 + 0.16,
            -0.2,
            0,
            wm,
            { col: false, tile: [0.6, 0.6] }
          );
        }
      } else if (bk === 'fan')
        k.plane(fanTex, 2.6, 1.6, w * 0.45, y + 1.05, -0.03, FRONT, { transparent: true }); // A 段：一扇綠色扇形拱窗
      else if (bk === 'barred')
        k.plane(litWin(true), 2.0, 1.1, w * 0.55, y + 1.15, -0.02, FRONT, { emissive: 0.5 }); // A 段：一扇裝鐵窗的方窗（亮著燈）
      else if (bk === 'tiny')
        win(k, w / 2, y + 1.65, 1.0, 0.9); // C 段：每層只有一扇裝鐵窗的小窗
      else if (bk === 'plain') win2(w / 2, y + 1.5, ww, 1.4, false);
      else win2(w / 2, y + 1.5, ww, 1.35);
      if (sp.hood) k.box(0.4, w - 0.4, y + 2.25, y + 2.33, -0.65, 0, sp.hood, { col: false });
      if (sp.fins)
        for (let x = 0.3; x <= w - 0.3; x += 0.55)
          k.box(x, x + 0.1, y + 0.1, y + fh - 0.1, -0.3, 0, sp.fins, { col: false });
      if (!sp.noac && r() < 0.65)
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
          ROWT.vert(`d1${text}${bg}`, bg, fg, text),
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
            for (const zc of sp.sideAt
              ? sp.sideAt[x < 0 ? 0 : 1]
              : sp.sideN
                ? Array.from({ length: sp.sideN }, (_, j) => (d * (j + 0.5)) / sp.sideN)
                : [d * 0.3, d * 0.7])
              k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, zc, rot);
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
    // ---- B 段新增的選項 ----
    if (sp.belt) k.box(-0.02, w + 0.02, gf - 0.35, gf + 0.2, -0.34, 0, sp.belt, { col: false });
    if (sp.face)
      k.box(-0.01, w + 0.01, gf - 1.0, gf, -0.045, 0, wallMat(sp.face), {
        col: false,
        tile: [0.6, 0.6],
      }); // 一樓門楣也貼正面的磚色
    if (sp.posts && !sp.plaza) posts(k, sp.posts);
    if (sp.board) {
      // 門口木條花台上的落地立牌 [x, z, 字, 底, 字色, 小字]
      const [bx, bz, bt, bb, bf, bs] = sp.board;
      k.box(bx - 0.8, bx + 0.8, 0, 0.85, bz - 0.3, bz + 0.3, '#9a7a56');
      k.box(bx - 0.7, bx + 0.7, 0.85, 1.05, bz - 0.2, bz + 0.2, MR.plant, { col: false });
      k.plane(paint(bt, bb, bf, bs, 1.2, 0.9, 128), 1.2, 0.9, bx, 1.5, bz - 0.32, FRONT, {
        emissive: 0.25,
        double: true,
      });
    }
    if (sp.podium) {
      // 一樓外面包一圈矮裙樓 [x0, x1, 凸出深度]：上緣橫帶、鋁窗、前面灌木花台
      const [p0, p1, pd, ph = 0.6] = sp.podium,
        pm = wallMat(sp.low || sp.wall),
        n = Math.max(1, Math.round((p1 - p0) / 2.6));
      k.box(p0, p1, 0, gf + ph, -pd, 0, pm, { col: false, tile: [0.6, 0.6] });
      k.box(p0 - 0.05, p1 + 0.05, gf + ph, gf + ph + 0.35, -pd - 0.05, 0, sp.bands || 'gray', {
        col: false,
      });
      k.box(p0 - 0.05, p1 + 0.05, gf - 0.9, gf - 0.55, -pd - 0.05, 0, sp.bands || 'gray', {
        col: false,
      });
      for (let j = 0; j < n; j++)
        k.plane(ROWT.alWin(), 1.5, 1.3, p0 + ((p1 - p0) * (j + 0.5)) / n, 1.8, -pd - 0.03, FRONT);
      k.box(p0 + 0.2, p1 - 0.2, 0, 0.55, -pd - 1.0, -pd, pm, { col: false, tile: [0.6, 0.6] });
      k.box(p0 + 0.3, p1 - 0.3, 0.55, 1.2, -pd - 0.9, -pd - 0.1, MR.plant, { col: false });
    }
    if (sp.bands)
      for (let f = 1; f <= nf; f++) {
        const y = f === nf ? top : gf + (f - 1) * fh;
        k.box(-0.06, w + 0.06, y - 0.3, y + (f === nf ? 0.1 : 0.12), -0.06, d + 0.06, sp.bands, {
          col: false,
        });
      } // 頂層那一圈壓在屋頂板下面 2 cm，才不會跟屋頂板同高閃爍
    if (sp.entry) {
      // 住宅大門（x=0 那端）：門柱蓋住鐵捲門，深色門加紅色門牌
      const ew = sp.entry,
        em = wallMat(sp.low || sp.wall);
      k.box(0, ew, 0, gf - 0.78, -0.26, 0, em, { col: false, tile: [0.6, 0.6] });
      k.plane(resDoorTex, 1.5, 2.3, ew / 2, 1.15, -0.27, FRONT);
      k.box(ew - 0.34, ew - 0.1, 1.7, 1.86, -0.28, -0.26, '#b8312f', { col: false });
    }
    if (sp.lobby) {
      // 門廳：三階踏步、雕花大門、上方凸出的磁磚雨遮帶、兩側灌木花台
      const [lx, lw, lift = 0] = sp.lobby,
        lm = wallMat(sp.low || sp.wall);
      k.box(lx - lw / 2 - 0.7, lx + lw / 2 + 0.7, gf - 0.95 + lift, gf - 0.25 + lift, -1.6, 0, lm, {
        col: false,
        tile: [0.6, 0.6],
      });
      k.plane(lobbyTex, lw, 2.15, lx, 0.45 + 1.075, -0.07, FRONT, { emissive: 0.1 });
      for (let j = 0; j < 3; j++)
        k.box(
          lx - lw / 2 - 0.4,
          lx + lw / 2 + 0.4,
          0,
          0.45 - j * 0.15,
          -0.5 - j * 0.35,
          j ? -0.5 - (j - 1) * 0.35 : 0,
          '#a8a39a',
          { col: false }
        );
      for (const sd of [-1, 1]) {
        const px = lx + sd * (lw / 2 + 1.0);
        k.box(px - 0.6, px + 0.6, 0, 0.5, -1.1, -0.05, lm, { col: false, tile: [0.6, 0.6] });
        k.box(px - 0.5, px + 0.5, 0.5, 1.15, -1.0, -0.15, MR.plant, { col: false });
      }
    }
    if (sp.rear) {
      // 後棟比前棟高幾層
      const R = sp.rear,
        z0 = R.from || d / 2,
        rn = R.nf || 2,
        rh = rn * fh,
        rw = wallMat(R.wall || sp.wall);
      k.box(0, w, top, top + rh, z0, d, rw, { col: false, tile: [0.6, 0.6] });
      k.box(-0.02, w + 0.02, top + rh, top + rh + 0.12, z0 - 0.04, d, 'gray', { col: false });
      for (const [a, b, c2, e] of [
        [0, w, z0, z0 + 0.04],
        [0, w, d - 0.04, d],
        [0, 0.04, z0, d],
        [w - 0.04, w, z0, d],
      ])
        k.box(a, b, top + rh + 0.95, top + rh + 1.0, c2, e, '#55585a', { col: false });
      for (let f = 0; f < rn; f++) {
        const y = top + f * fh + 0.3;
        for (let j = 0; j < 2; j++)
          k.plane(ROWT.alWin(), 1.5, 1.2, (w * (j + 0.5)) / 2, y + 1.1, z0 - 0.03, FRONT);
        for (let j = 0; j < 3; j++)
          k.plane(YHT.win(), 1.5, 1.1, (w * (j + 0.5)) / 3, y + 1.1, d + 0.03, 0);
        for (const [x, rot] of R.out
          ? [[w + 0.03, Math.PI / 2]]
          : [
              [-0.03, -Math.PI / 2],
              [w + 0.03, Math.PI / 2],
            ])
          k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, (z0 + d) / 2, rot);
      }
      if (R.out) {
        // 後棟在 x=0 那側微凸，從一樓到頂都是後棟的磚色，每層兩扇直條鋁窗
        k.box(-R.out, 0, 0, top + rh, z0, d, rw, { col: false, tile: [0.6, 0.6] });
        for (let f = 1; f < nf + rn; f++)
          for (const t of [0.3, 0.72])
            k.plane(
              tallWinTex,
              0.95,
              1.9,
              -R.out - 0.03,
              gf + (f - 1) * fh + 1.4,
              z0 + (d - z0) * t,
              -Math.PI / 2
            );
      }
    }
    if (sp.roof === 'pent') {
      const hx = w * 0.3,
        hz = d * 0.45;
      k.box(hx, hx + 3.2, top + 0.12, top + 2.8, hz, hz + 3.6, wallMat(sp.wall), {
        col: false,
        tile: [0.6, 0.6],
      });
      k.box(hx - 0.1, hx + 3.3, top + 2.8, top + 2.92, hz - 0.1, hz + 3.7, sp.bands || 'gray', {
        col: false,
      });
    }
    // ---- A 段新增的選項 ----
    if (sp.bays) {
      // 一樓分成幾個開間：貼牆磚的柱子蓋在鐵捲門上
      const x0 = sp.entry || 0,
        bwid = Array.isArray(sp.bays) ? 0 : (bodyW - x0) / sp.bays; // 給數字就平均分，給陣列就是每根柱子的中心 x
      const px = Array.isArray(sp.bays)
        ? sp.bays.map((c) => c - 0.25)
        : Array.from({ length: sp.bays + 1 }, (_, j) =>
            Math.min(bodyW - 0.5, Math.max(x0, x0 + j * bwid - 0.25))
          );
      for (const x of px)
        k.box(x, x + 0.5, 0, gf - 0.4, -0.24, 0, wm, { col: false, tile: [0.6, 0.6] });
    }
    if (sp.fineSh && sp.sh) {
      const xa = Math.max(0.2, sp.entry || 0),
        xb = bodyW - 0.2;
      k.plane(fineShTex(sp.sh), xb - xa, gh, (xa + xb) / 2, gh / 2, -0.03, FRONT);
    } // 細葉片的鐵捲門蓋在原本的上面
    if (sp.lintel)
      k.box(sp.entry || 0, bodyW, gh - 0.05, gh + 0.5, -0.27, 0, sp.lintel, { col: false }); // 鐵捲門上方的金屬門楣
    if (sp.strip) {
      const [sc, f0, f1] = sp.strip,
        xa = w * f0,
        xb = w * f1;
      k.box(xa, xb, gf + 0.1, top - 0.2, -0.1, -0.02, '#2a2624', { col: false });
      for (let x = xa; x <= xb - 0.05; x += 0.14)
        k.box(x, x + 0.06, gf + 0.1, top - 0.2, -0.16, -0.1, sc, { col: false });
    } // 一整條從二樓到頂的直條鐵柵
    if (sp.railing) {
      for (const yy of [0.55, 1.0])
        k.box(0.05, w - 0.05, top + yy, top + yy + 0.05, 0.05, 0.1, '#c9ccce', { col: false });
      for (let x = 0.05; x <= w - 0.05; x += 1.2)
        k.box(x, x + 0.05, top + 0.1, top + 1.0, 0.05, 0.1, '#c9ccce', { col: false });
    } // 屋頂不鏽鋼欄杆
    if (sp.gable) {
      k.box(0, w, top + 0.1, top + 0.7, -0.02, 0.2, wm, { col: false, tile: [0.6, 0.6] });
      k.box(w * 0.2, w * 0.8, top + 0.7, top + 1.1, -0.02, 0.2, wm, {
        col: false,
        tile: [0.6, 0.6],
      });
      k.box(w * 0.34, w * 0.66, top + 1.1, top + 1.45, -0.02, 0.2, wm, {
        col: false,
        tile: [0.6, 0.6],
      });
    } // 中間高、兩邊低的山牆形女兒牆
    if (sp.tileCap) {
      // 頂樓鐵窗籠上的紅瓦小山牆
      k.box(0.2, w - 0.2, top - 0.42, top - 0.28, -1.0, 0, sp.tileCap, { col: false });
      for (let j = 0; j < 4; j++)
        k.box(
          w / 2 - 1.2 + j * 0.3,
          w / 2 + 1.2 - j * 0.3,
          top - 0.28 + j * 0.22,
          top - 0.06 + j * 0.22,
          -0.95,
          -0.2,
          j < 3 ? '#efeee9' : sp.tileCap,
          { col: false }
        );
      for (let j = 0; j < 4; j++)
        k.box(
          w / 2 - 1.35 + j * 0.3,
          w / 2 + 1.35 - j * 0.3,
          top - 0.06 + j * 0.22,
          top + 0.0 + j * 0.22,
          -1.0,
          -0.15,
          sp.tileCap,
          { col: false }
        );
    }
    if (sp.side0) {
      k.box(-0.04, 0, 0, top + 0.1, 0, d, sp.side0, { col: false });
      for (let f = 2; f < nf; f++)
        for (const zc of [d * 0.35, d * 0.7]) {
          const yy = gf + (f - 1) * fh + 1.4;
          k.plane(YHT.win(), 1.1, 1.0, -0.06, yy, zc, -Math.PI / 2);
          k.box(-0.5, -0.04, yy + 0.55, yy + 0.62, zc - 0.7, zc + 0.7, '#6fa57a', { col: false });
        }
    } // x=0 那一側的山牆另外上色
    if (sp.eave) {
      const [ec, ey, ed] = sp.eave;
      k.box(0.1, w - 0.1, ey, ey + 0.1, -ed, 0, ec, { col: false });
      k.box(0.1, w - 0.1, ey - 0.14, ey, -ed - 0.04, -ed + 0.08, ec, { col: false });
    } // 二樓窗台下的瓦片小雨遮
    if (sp.side1sh)
      for (const [z0, z1] of sp.side1sh.slice(1)) {
        k.plane(
          fineShTex(sp.side1sh[0]),
          z1 - z0,
          gh,
          w + 0.06,
          gh / 2,
          (z0 + z1) / 2,
          Math.PI / 2
        );
        k.box(w, w + 0.2, gh - 0.05, gh + 0.45, z0 - 0.15, z1 + 0.15, sp.lintel || '#74777a', {
          col: false,
        });
      } // 審查加的：x=w 側牆一樓的車庫鐵捲門（side0sh 的另一側）
    if (sp.side0sh)
      for (const [z0, z1] of sp.side0sh.slice(1)) {
        k.plane(fineShTex(sp.side0sh[0]), z1 - z0, gh, -0.05, gh / 2, (z0 + z1) / 2, -Math.PI / 2);
        k.box(-0.2, 0, gh - 0.05, gh + 0.45, z0 - 0.15, z1 + 0.15, sp.lintel || '#74777a', {
          col: false,
        });
      } // x=0 側牆一樓的車庫鐵捲門
    if (sp.fyard) fyard(k, w, sp.fyard, wm); // 鐵皮加蓋的前院
    if (sp.hedge) {
      const xa = w * sp.hedge[0],
        xb = w * sp.hedge[1];
      k.box(xa, xb, 0, 0.35, -1.25, -0.55, '#b9b6ae', { col: false });
      k.box(xa + 0.08, xb - 0.08, 0.35, 0.85, -1.18, -0.62, MR.plant, { col: false });
    } // 門前的長條花台
    // ---- C 段新增的選項 ----
    if (sp.para2) {
      // 二樓窗下的實心女兒牆帶 [色, 上面那塊空白舊招牌板的顏色]
      k.box(0.12, w - 0.12, gf, gf + 0.85, -0.1, 0, wallMat(sp.para2[0]), {
        col: false,
        tile: [0.6, 0.6],
      });
      if (sp.para2[1])
        k.box(w * 0.3, w * 0.78, gf + 0.14, gf + 0.74, -0.13, -0.1, sp.para2[1], { col: false });
    }
    if (sp.couplets)
      for (const x of sp.couplets)
        k.box(x - 0.14, x + 0.14, 0.95, 2.05, -0.075, -0.05, '#c8322e', { col: false }); // 玻璃門上貼的紅春聯 [x, …]
    if (sp.sdoor) {
      // 鐵捲門旁的不鏽鋼住家門 [中心 x]（上面一格深色氣窗）
      const x = sp.sdoor[0];
      k.box(x - 0.52, x + 0.52, 0, 2.35, -0.07, 0, '#8f9396', { col: false });
      k.box(x - 0.44, x + 0.44, 0.05, 1.8, -0.085, -0.07, '#c6c9cb', { col: false });
      k.box(x - 0.44, x + 0.44, 1.88, 2.28, -0.085, -0.07, '#3a4650', { col: false });
    }
    if (sp.roof === 'cover') {
      // 屋頂浪板加蓋：後半一間小屋，整個屋頂上面罩一片浪板（roofCol）
      const rc = sp.roofCol || MR.roof;
      k.box(0.3, w - 0.3, top + 0.12, top + 2.0, d * 0.4, d - 0.4, wm, { col: false });
      for (const x of [0.15, w - 0.23])
        k.box(x, x + 0.08, top + 0.12, top + 2.0, 0.25, 0.33, '#8a8d90', { col: false });
      k.box(-0.1, w + 0.1, top + 2.0, top + 2.1, -0.5, d, rc, { col: false });
    }
    // ---- D 段新增的選項 ----
    if (sp.discs) {
      // 圓牌橫招 [字, 底, 圓牌色, 外框色, 字色]，上方一排投射燈
      const [t, bg, disc, ring, fg] = sp.discs;
      k.box(0.1, w - 0.1, gf - 0.98, gf - 0.02, -0.2, 0, bg, { col: false });
      k.plane(discSign(t, bg, disc, ring, fg), w - 0.3, 0.86, w / 2, gf - 0.5, -0.21, FRONT, {
        emissive: 0.3,
      });
      for (let x = 0.6; x < w - 0.4; x += 0.75)
        k.box(x, x + 0.1, gf - 0.02, gf + 0.12, -0.5, -0.2, '#2a2a2c', { col: false });
    }
    if (sp.arcAwn) {
      // 條紋圓弧雨棚 [色1, 色2]：往外鼓出去再垂下來
      const A = sp.arcAwn,
        n = Math.max(2, Math.round(w / 0.35)),
        bw = (w - 0.2) / n;
      for (let j = 0; j < n; j++) {
        const x0 = 0.1 + j * bw,
          x1 = x0 + bw + 0.005,
          c = A[j % A.length];
        k.box(x0, x1, gf - 0.72, gf - 0.64, -0.75, 0, c, { col: false });
        k.box(x0, x1, gf - 0.95, gf - 0.7, -1.15, -0.7, c, { col: false });
        k.box(x0, x1, gf - 1.3, gf - 0.92, -1.3, -1.1, c, { col: false });
      }
    }
    if (sp.villa)
      k.plane(villaTex, w, top - gf + 0.12, w / 2, (gf + top + 0.12) / 2, -0.08, FRONT, {
        emissive: 0.04,
      }); // 仿洋樓立面蓋住整個樓上
    if (sp.canopy) {
      // 屋頂鐵架上的浪板棚
      for (const x of [0.2, w - 0.28])
        for (const z of [0.1, d * 0.6])
          k.box(x, x + 0.08, top, top + 2.3, z, z + 0.08, '#8a8d90', { col: false });
      k.box(-0.1, w + 0.1, top + 2.3, top + 2.38, -0.9, d * 0.6 + 0.4, sp.canopy, { col: false });
      for (const yy of [0.9, 1.6])
        k.box(0.2, w - 0.2, top + yy, top + yy + 0.04, 0.1, 0.14, '#8a8d90', { col: false });
    }
    if (sp.acRack) {
      // 一二樓之間鐵架平台上的冷氣室外機排 [起 x, 迄 x, 幾層, 放大倍率]，也可以給好幾組
      for (const [xa, xb, rows, sc = 1] of Array.isArray(sp.acRack[0]) ? sp.acRack : [sp.acRack]) {
        const y0 = gf - 0.55,
          uw = 0.85 * sc,
          uh = 0.62 * sc;
        k.box(xa - 0.1, xb + 0.1, y0 - 0.08, y0, -1.0, 0, '#6f7377', { col: false });
        for (let rr = 0; rr < (rows || 1); rr++)
          for (let x = xa; x + uw <= xb + 0.01; x += uw + 0.13) {
            const yy = y0 + rr * (uh + 0.1);
            k.box(x, x + uw, yy, yy + uh, -0.92, -0.55, '#f1f0ec', { col: false });
            k.box(
              x + uw * 0.2,
              x + uw * 0.68,
              yy + uh * 0.2,
              yy + uh * 0.82,
              -0.935,
              -0.92,
              '#c3c6c8',
              { col: false }
            );
            k.box(
              x + uw * 0.36,
              x + uw * 0.52,
              yy + uh * 0.4,
              yy + uh * 0.62,
              -0.945,
              -0.935,
              '#8f9396',
              { col: false }
            );
          }
      }
    }
    if (sp.nook) {
      // 一樓這一段不是鐵捲門：磚牆上一扇鑄鐵花窗與一扇木門 [x0, x1, 門色]
      const [x0, x1, dc] = sp.nook;
      k.box(x0, x1, 0, gf - 0.3, -0.3, 0, wm, { col: false, tile: [0.6, 0.6] });
      k.box(x0 + 0.25, x0 + 1.25, 0.05, 2.2, -0.33, -0.3, dc, { col: false });
      k.box(x0 + 0.33, x0 + 1.17, 1.2, 2.05, -0.34, -0.33, '#5a3824', { col: false });
      k.plane(
        YHT.win(),
        Math.min(1.1, x1 - x0 - 1.6),
        1.5,
        (x0 + 1.25 + x1) / 2,
        1.5,
        -0.32,
        FRONT
      );
    }
    if (sp.lattice) {
      // 包住一二樓的橫木條格柵（招牌字掛在二樓這一段上）
      k.box(0.05, w - 0.05, gf - 0.05, gf + fh - 0.2, -0.12, 0, sp.lattice, { col: false });
      for (let y = gf + 0.05; y < gf + fh - 0.3; y += 0.3)
        k.box(0.02, w - 0.02, y, y + 0.17, -0.17, -0.12, lift(sp.lattice, 0.12), { col: false });
      for (let x = 0.1; x < w - 0.1; x += 0.28)
        k.box(x, x + 0.14, 0, 1.15, -0.5, -0.44, lift(sp.lattice, 0.2), { col: false }); // 門前的木條矮籬
    }
    if (sp.bannerN) {
      const [lines, bb, bf] = sp.bannerN,
        bw = Math.min(w - 0.5, 3.6),
        bh = 0.42 * lines.length;
      k.plane(linesTex(lines, bb, bf), bw, bh, w / 2, gf - 0.25 - bh / 2, -0.3, FRONT, {
        emissive: 0.15,
      });
    }
    if (sp.wdoor) {
      // 加兩階踏步的小鐵門 [中心 x, 色]
      const [x, dc] = sp.wdoor;
      k.box(x - 0.6, x + 0.6, 0.3, 2.35, -0.05, 0, dc, { col: false });
      k.box(x - 0.66, x + 0.66, 2.35, 2.43, -0.3, 0, '#b9bcbe', { col: false });
      k.box(x - 0.9, x + 0.9, 0, 0.3, -0.75, 0, MR.concrete, { col: false });
      k.box(x - 1.0, x + 1.0, 0, 0.15, -1.1, -0.75, MR.concrete, { col: false });
    }
    for (const [x0, x1, ch, cc = '#b4b6b2'] of sp.cabs || []) {
      k.box(x0, x1, 0, ch, -apron + 0.25, -apron + 1.0, cc);
      k.box(x0 - 0.03, x1 + 0.03, ch, ch + 0.05, -apron + 0.22, -apron + 1.03, '#8f9390', {
        col: false,
      });
    } // 路邊的電信／電力箱
    if (sp.plate) {
      const [t, bg, fg] = sp.plate,
        len = 0.5 * t.length + 0.5;
      k.box(0.22, 0.86, 0.25, 0.4 + len, -0.09, 0, bg, { col: false });
      k.plane(ROWT.vert(`d1P${t}${bg}`, bg, fg, t), 0.56, len, 0.54, 0.35 + len / 2, -0.1, FRONT);
    } // 一樓牆上的直立名牌
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, sp.pave ? paveMat() : MR.concrete, {
      col: false,
      surface: true,
      ...(sp.pave ? { tile: [0.8, 0.8] } : {}),
    });
  });

  finishRow(scene, kits);
}
