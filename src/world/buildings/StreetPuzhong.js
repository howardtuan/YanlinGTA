// 普忠路兩側的街屋（照 Google 街景與國土測繪 2024 正射建模，只做外觀，不能進入）。
// 寫法比照 src/world/buildings/StreetZhongbei.js：每一格是 [s0, s1, side, spec]
//   s = 沿 PZ_ROAD（普忠路往東南那條車道的中心線）從鐵路地下道口往新中北路口量的公尺數；
//   side +1 = 西南側（往東南走的右手邊，中原大學這一側），-1 = 東北側（隔著往西北的車道）
//   spec：nf 樓層、gf 一樓高、fh 樓高、d 深度、wall（WALL 鍵或 #hex）、low 一樓外牆 #hex、sign [字, 底, 字色, 小字, 樣式（'seven' 7-ELEVEN 色條、'cols' 用空白分欄的直書、由右到左）]、
//   ground 'shop'|'shutter'|'gate'|'open'|'stall'|'dark' 深色玻璃門面加古銅大門、sh 鐵捲門顏色、awn 雨棚 #hex 或 [色1, 色2] 條紋、
//   bal 'cage'|'grille'|'open'|'rail'|'glass'|'arch'|'plain'|'band' 磁磚牆上的綠玻璃橫帶窗、glass 帷幕／橫帶窗玻璃色、hood 窗罩色、
//   vert [字, 底, 字色] 直立招牌（vertAt [下緣高, 長, 寬, z] 指定位置大小）、side [字, 底, 字色, 寬, 高, 下緣高] 垂直立面的箱型側招（字可用 \n 分行；flip 同 vert）、round [字, 底, 字色, 直徑] 圓形側招、banner [字, 底, 字色] 布條、
//   roof 'shack'|'tank'|'bill'、bill [字, 底, 字色, 寬, 高]、tin 鐵皮雨遮、arch 粉紅拱形女兒牆、fins 直條鰭板色、
//   big [字, 底, 字色] 樓上整面帆布（bigFrom 從第幾樓、bigW 寬度、bigAt 水平位置）、sign2 二樓橫招、noband 不畫一樓招牌帶、roofCol 鐵皮屋頂色、door 0 沒有樓梯門、tower {nf, back, wall, balc} 裙樓上方的退縮住宅塔、bikes 騎樓機車數、
//   set 立面離 PZ_ROAD 中心線的距離（預設：西南側 7.1、東北側 17.1，跟原本的填充街屋同一條線）、apron 門前鋪面深度上限
//   porch 一樓前簷深度（招牌改掛在前簷前緣；porchKind 'flat'|'arch' 半圓筒採光罩|'frame' 淺弧採光罩|'room' 凸出來的鐵皮前屋（整面鐵捲門，awn 變成門楣上方的條紋遮陽棚）、porchH 簷高、porchCol 簷色）、
//   signH 招牌高（預設 0.8）、signY 招牌下緣高度、band 沒有招牌時那條帶子的顏色、flip 直立招牌換到左邊／圓招換到右邊、roof 'pent' 退縮的水泥頂樓
// kind（不寫就是上面的標準街屋）：
//   'shed' 單層鐵皮屋／展示間：h 簷高、bd 屋身深度（預設 d）、wall 浪板色、front 正面另一個顏色、low [色, 高] 下半段顏色、roof 屋頂色、gable 山牆朝街的屋脊高、
//          bays [[s0, s1, 'open'|'shutter'|'glass', 色]] 正面的開口、wins [下緣高, 上緣高] 正面上半一排橫拉窗、door 開口高、posts 門框色、lip 開口上方出挑平簷的深度（lipCol 簷色）、
//          sign [字, 底, 字色, 小字] 全寬橫招 或 signs [[s0, s1, 字, 底, 字色, 小字]] 分段橫招（signH／signY 同上）
//   'site' 沒有臨路建物的場地（車行露天車場、加油站、空地）：pave 鋪面色（0 = 不鋪）、d 只當保留範圍
//   兩種都可以帶 items（位置一律用「里程 s、離 PZ_ROAD 中心線的距離 off」）：
//     ['cars', s0, s1, off, {skip}] 一排車頭朝街的待售車（off 是車頭）、['pylon', s, off, {h, col, truss, top [字, 底, 字色, 寬, 高, 小字], frame 頂牌外框色, vert／low [字, 底, 字色, 寬, 長], out 1 = 直立燈箱掛在靠車道那一側}] 招牌鐵柱（看板面垂直道路，兩面可讀）、
//     ['canopy', s0, s1, off0, off1, {h, roof, post, rail}] 平頂鋼棚、['gas', s0, s1, off0, off1, {h}] 中油加油棚（含加油島、屋頂圓標）、['stack', s, off, {h, rows [[字, 底, 字色]]}] 油價牌塔、['roundel', s, off, {h 圓心高, d 直徑}] 立桿上的中油圓標（面向沿路兩個方向）、
//     ['panel', sA, offA, sB, offB, {y, h, text, bg, fg, sub, posts, solid, both, th}] 一面看板／布條（站在讀得到字的那一側，A 是左手邊）、
//     ['fence', sA, offA, sB, offB, {h, col}] 浪板圍籬、['box', s0, s1, off0, off1, {y0, y1, col, solid, win 窗的排數}] 素面量體、['tree', s, off, 高]、['tank', s, off, 底高] 不鏽鋼水塔
// 普忠路是斜坡（s 120～270 地面高了 3 m）：每一格的基準高度取立面中點的地面；'site'／'shed' 的鋪面貼著地形鋪，items 裡的每個物件各自落在自己那一點的地面上。
// 每一格自成一個 Kit，立面對著街道；收尾用 finishRow 一次合併。
// 這個檔案不 import src/world/Interiors.js（Kit、材質、貼圖工具由 src/world/zones/Zones.js 呼叫 buildPuzhongStreet 時從 X 傳進來），
// src/world/zones/Zones.js 直接 import 這裡的 PZ_ST.drop 與 pzFootprints() 來刪填充樓、保留空地。

export const PZ_ROAD = [[259.3, -421.1], [263.8, -411.5], [272.8, -400.1], [348.4, -315.8], [395.7, -262.8], [431.2, -223.6], [543.2, -98.5], [563.4, -76.4], [613.5, -20.6], [648.6, 19.0], [663.8, 24.4]];
// 車道外緣離 PZ_ROAD：西南側是往東南車道的一半 4.5；東北側隔著往西北的車道（中心線相距 8.7、寬 8.3）
const halfAt = (side) => (side > 0 ? 4.5 : 12.85);
// 立面離 PZ_ROAD：跟原本的填充街屋同一條線（西南側 7.1、東北側 17.1）
const setAt = (side) => (side > 0 ? 7.1 : 17.1);

export const PZ_ST = {
  ownSign: ['7-Eleven'], // 街屋自己掛招牌的店名，POI 不再另外掛
  drop: ['f119', 'f120', 'f121', 'f176', 'f177', 'f178', 'f179', 'f180', 'f181', 'f182', 'f352', 'f353', 'f354', 'f355', 'f356', 'f357', 'f358', 'f371', 'f372', 'f373', 'f374', 'f375', 'f376', 'f377', 'f378', 'f379', 'f380', 'f381', 'f382', 'f383', 'f410', 'f419', 'f420', 'f421'], // 這些格子蓋掉的通用填充樓（檢查腳本算出來的）
  fences: [], // 沿路圍牆 [s0, s1, side]
  lots: [
    // ---- s 120～270 西南側（中原大學這一側；街景 2026-05、正射 2024）：整段沒有連棟透天，依序是圍籬雜木空地、中原側門車道、欣格汽車、伯利馬車庫、中油祥益站、洗車看板空地、霖龍、樂福車業、柴犬車庫 ----
    [120, 131, 1, { kind: 'site', set: 4.8, d: 1.6, pave: 0, items: [['fence', 120, 4.9, 131, 4.9, { h: 2, col: '#8fa593' }], ['tree', 122, 9, 9], ['tree', 125.5, 13, 10], ['tree', 128.5, 8.5, 8.5], ['tree', 123.5, 17, 10], ['tree', 129, 15, 9]] }], // 綠色浪板圍籬＋雜木（圍籬上的賣地帆布是臨時廣告，不放）
    // s 131～145 中原大學側門車道：留空（校名矮牆掛在下一格的 items 裡）
    [145, 177.5, 1, { kind: 'site', set: 4.8, d: 22.5, items: [ // 欣格汽車：露天車場＋平頂鋼棚＋招牌鐵柱
      ['panel', 144.6, 5.8, 141.8, 5.8, { y: 0, h: 1.05, th: 0.3, solid: 1, text: '中原大學', bg: '#8c8f92', fg: '#ffffff' }],
      ['pylon', 155.3, 6, { h: 11, col: '#7a4a34', out: 1, frame: '#a4532f', top: ['欣格汽車', '#27357a', '#ffffff', 5, 1.6], vert: ['欣格汽車', '#2f73d0', '#ffffff', 1.3, 4.5] }],
      ['cars', 146.5, 156.5, 12.5, { skip: 0.2 }], ['cars', 146.5, 156.5, 19.5],
      ['cars', 158.5, 177, 5.3], ['cars', 158.5, 177, 11.5, { skip: 0.15 }], ['cars', 158.5, 177, 17, { skip: 0.2 }],
      ['canopy', 157.5, 177, 10.5, 22.5, { h: 3.7, roof: '#a9b3a6', post: '#6b6b6b', rail: 1.2 }],
      ['panel', 157.3, 10.5, 157.3, 22.5, { y: 3.9, h: 2, text: '5525 認證保固', bg: '#2f73d0', fg: '#ffffff' }],
      ['fence', 157.3, 10.5, 157.3, 22.5, { h: 1.6, col: '#8c4a3a' }],
    ] }],
    [147.5, 157, 1, { kind: 'shed', set: 28, d: 6, apron: 0.6, h: 4.5, wall: '#e9e7e0', bays: [[148, 156.5, 'glass']], door: 2.8, posts: '#2b2f33', sign: ['欣格汽車', '#f4f4f0', '#d42a1f'], signH: 1.2, signY: 3.1 }], // 欣格汽車車場最裡面的辦公室
    [177.5, 187, 1, { kind: 'shed', set: 10.5, d: 10, h: 7.6, wall: '#cfc8b2', front: '#232323', bays: [[178.5, 186, 'shutter', '#2a2a2a']], posts: '#1c1c1c', door: 5.2, lip: 1.2, sign: ['伯利馬車庫', '#ecebe8', '#1a1a1a', 'Prima Garage'], signH: 1.6, signY: 5.9, items: [
      ['pylon', 178, 6.2, { h: 10.5, col: '#4a3a30', out: 1, top: ['Prima Garage', '#f2f2ee', '#1a1a1a', 3.6, 1.3], vert: ['伯利馬車庫', '#f2f2ee', '#1a1a1a', 1, 4.5], low: ['便宜代步車', '#1a1a1a', '#ffffff', 0.8, 2.4] }], ['cars', 183.2, 186, 5.6],
    ] }],
    [187, 213, 1, { kind: 'site', set: 4.8, d: 26, items: [ // 台灣中油祥益站：加油棚＋牌塔＋洗車藍帆布棚，兩側是出入車道
      ['gas', 194.3, 206.8, 10.5, 30.5, { h: 5.3 }],
      ['canopy', 188, 192.5, 15, 21, { h: 3, roof: '#2456b5', post: '#c9c2a8' }],
      ['stack', 198, 5.6, { h: 7, w: 1.6, rows: [['台灣中油', '#f1f1ef', '#1f4fb0'], ['祥益加油站', '#1f4fb0', '#ffffff'], ['服務專線 1912', '#f1f1ef', '#1f4fb0'], ['', '#f1f1ef'], ['', '#1f4fb0'], ['歡迎光臨', '#1f4fb0', '#ffffff'], ['入口', '#f1f1ef', '#1f4fb0'], ['98無鉛', '#3f8f6a', '#ffffff'], ['95無鉛', '#8a8d90', '#ffffff'], ['92無鉛', '#7a6f80', '#ffffff'], ['超柴', '#1f4fb0', '#ffffff']] }],
      ['roundel', 202.8, 5, { h: 7, d: 2 }], // 臨路電線桿上伸出來的第二顆中油圓標（面向來車方向）
    ] }],
    [213, 222.5, 1, { kind: 'site', set: 4.8, d: 12, pave: '#7c8263', items: [['panel', 217, 5.6, 213.2, 9.6, { y: 0.4, h: 4, posts: 3, text: '全國第一 台灣最好\nSpa\n美容洗車機', bg: '#3f8fd8', fg: '#ffe23a' }], ['tree', 220.5, 11, 5]] }], // 斜放的洗車看板＋雜草空地
    [222.5, 227.5, 1, { kind: 'shed', set: 6.8, d: 6, h: 3.6, wall: '#4f7fa8', roof: '#9aa79a', bays: [[222.8, 224.8, 'shutter', '#4a78a0'], [225.1, 227.2, 'glass']], door: 2.6, posts: '#3f6a90', lip: 1, lipCol: '#9aa79a', items: [ // 霖龍（藍色鐵皮小店：西北半邊藍鐵捲門、東南半邊玻璃門窗，黃底紅字直立招牌架在和粉紅鐵皮屋交界那一角的鐵架上）
      ['pylon', 227.2, 6.5, { h: 8, col: '#5a5d60', vert: ['霖龍', '#f2d21f', '#d02020', 1.3, 2.7] }], ['tank', 225, 10.5, 3.75],
    ] }],
    [227.5, 231.5, 1, { kind: 'shed', set: 8, d: 8, h: 7.2, wall: '#cdbfa6', low: ['#e3a3b4', 3.4], roof: '#8a4a30', items: [['tank', 229.5, 12.5, 7.3]] }], // 霖龍後棟：兩層粉紅鐵皮屋，臨路面沒有門窗（側牆的選舉看板不放）
    [231.5, 254, 1, { kind: 'shed', set: 12.5, d: 14, h: 5, wall: '#e4e2da', bays: [[232, 242.6, 'open'], [242.9, 253.5, 'open']], door: 3.7, signs: [[243, 254, 'SAVE 認證車聯盟', '#2f6fd0', '#ffffff'], [231.5, 243, '樂福車業', '#f4f4f0', '#1f4fb0']], signH: 1.2, signY: 3.75, items: [['cars', 232.5, 253.5, 6.5]] }], // 樂福車業：正面全開的鐵皮棚
    [254, 260.5, 1, { kind: 'site', set: 4.8, d: 8, items: [ // 樂福車業招牌鐵塔＋柴犬車庫的門型長橫幅（遊戲裡 s 262～268 是一條便道，車場本體不鋪）
      ['pylon', 256.5, 7, { h: 11, truss: 1, out: 1, col: '#b9bcc0', top: ['超高價估車', '#1f3f9a', '#ffd21f', 5, 1.8, '樂福車業'], vert: ['樂福車業', '#2f73d0', '#ffffff', 1.3, 5.5] }],
      ['panel', 270, 6, 258.5, 6, { y: 3.2, h: 1.3, posts: 2, both: 1, text: '柴犬車庫', bg: '#e2502a', fg: '#ffffff' }],
      ['fence', 257.6, 6.7, 259.6, 12.2, { h: 1.8, col: '#6f7f8c' }], // 車道東南邊的灰藍浪板圍籬（實景一路斜進去到離線 27 m；遊戲裡後面是便道，只做臨路這一小段）
    ] }],
    [267.5, 270, 1, { kind: 'site', set: 18, d: 10, pave: '#8f8d88' }], // 柴犬車庫的露天車場：實景是整片水泥地，原本的填充樓 f357 拿掉（便道兩旁不放車）
    // ---- s 120～270 東北側（門牌 207～247 號；街景 2026-05，211 巷口那張是 2024-08；正射 2024）：Kia 服務廠、211 巷、五戶三樓半透天、日達汽車、KYMCO、231 巷、四戶透天、全盛車業、東熱、綠玻璃樓 ----
    [120, 129.5, -1, { kind: 'shed', set: 18.3, d: 24, h: 7.4, wall: '#e8e8e6', bays: [[120.3, 122.8, 'shutter', '#e9e9e6'], [123.3, 129.2, 'glass']], door: 3.3, posts: '#3a3a3c', sign: ['KIA 服務廠', '#232325', '#ffffff', '桃鑫商用車'], signH: 2.3, signY: 5.1, items: [['panel', 124, 18.2, 128, 18.2, { y: 3.68, h: 0.5, text: '服務廠入口', bg: '#f4f4f2', fg: '#d42a1f' }], ['cars', 121, 129, 13.2]] }], // Kia 服務廠的展示間（西北邊 s<120 還有一段維修車道）
    // s 129.5～144 普忠路 211 巷：留空
    [144, 155.5, -1, { nf: 3, gf: 4.4, fh: 3.6, set: 17.8, d: 13, wall: '#e4e1d8', low: '#cfc6b4', porch: 3.3, porchH: 3.5, sign: ['7-ELEVEN', '#ffffff', '#00843d', null, 'seven'], signH: 1, ground: 'shop', bal: 'grille', roof: 'shack', door: 0 }],
    [155.5, 162.5, -1, { nf: 3, gf: 4.4, fh: 3.6, set: 17.8, d: 15, wall: '#e4e1d8', porch: 3.3, porchH: 3.5, sign: ['專營 三角皮帶輪 鏈輪 齒輪 連軸器 鑄鐵 傳動製品 車床 零件加工 插鍵加工', '#2a35c8', '#ffffff', null, 'cols'], signH: 1.1, signY: 3.7, side: ['珈鑫\n企業有限公司', '#2a35c8', '#ffffff', 2, 1.5, 8], ground: 'open', bal: 'grille', hood: '#4f9a6a', roof: 'shack' }],
    [162.5, 169.5, -1, { nf: 3, gf: 4.4, fh: 3.6, set: 17.8, d: 15, wall: '#e4e1d8', porch: 3.3, porchH: 3.5, sign: ['弘爺漢堡', '#f4f4ee', '#1a1a1a', 'HONGYA HAMBURGER'], signH: 1.2, round: ['弘爺漢堡', '#ffffff', '#c0392b', 1.5], flip: 1, ground: 'shutter', sh: '#9db59a', bal: 'grille', roof: 'shack' }],
    [169.5, 176, -1, { nf: 3, gf: 4.4, fh: 3.6, set: 17.8, d: 15, wall: '#e4e1d8', porch: 3.3, porchH: 3, sign: ['郁香茶葉精緻烘焙茶廠', '#f2f2ee', '#1a1a1a'], signH: 0.45, signY: 2.55, vert: ['茶葉批發', '#ffffff', '#1a1a1a'], vertAt: [0.5, 2.4, 0.55, -3.5], flip: 1, ground: 'open', bal: 'grille', roof: 'shack' }],
    [176, 182.5, -1, { nf: 3, gf: 4.4, fh: 3.6, set: 17.8, d: 15, wall: '#e4e1d8', low: '#8a6e58', porch: 3.3, porchH: 3.2, porchCol: '#4a4a4c', noband: 1, side: ['頂赫公司', '#ffffff', '#1f4fa8', 2.2, 1.1, 6.6], flip: 1, ground: 'shop', bal: 'plain', roof: 'shack' }],
    [182.5, 191.5, -1, { kind: 'shed', set: 14.5, d: 22, bd: 8.5, h: 4.6, wall: '#b9cdb5', roof: '#8a5a3a', bays: [[187.5, 191.2, 'open']], door: 3.7, posts: '#2e6f8e', signs: [[184.1, 187.1, '日達汽車', '#2a6fc0', '#ffffff', '引擎 底盤 冷氣 保養']], signH: 1.4, signY: 2.25, items: [['box', 182.8, 191.2, 22.6, 31, { y1: 11.5, col: '#a8523a', solid: 1, win: 2 }]] }], // 日達汽車：淺綠鐵皮棚，緊貼棚子後面（正射離線 22.5 起）是一棟三層紅磚樓，從對向車道看得到二、三樓的窗
    [191.5, 205, -1, { kind: 'shed', set: 14.3, d: 30, h: 6.4, gable: 7.6, wins: [5.15, 6.15], wall: '#cfcabb', roof: '#d9d6cc', bays: [[192, 204.5, 'open']], door: 3.2, posts: '#f0f0ee', sign: ['KYMCO', '#e0182a', '#ffffff', '鑫暘車業有限公司'], signH: 1.4, signY: 3.4 }], // KYMCO 鑫暘車業：山牆朝路的大鐵皮屋（對向車道遠看量到簷高 6.4、屋脊 7.5，紅招牌帶上方還有一排橫拉窗）
    // s 205～213 普忠路 231 巷：留空
    [213, 220, -1, { nf: 3, gf: 4.3, fh: 3.6, set: 17.8, d: 15, wall: '#e6e3da', porch: 3.5, porchKind: 'frame', porchH: 3.4, sign: ['慧辰中醫診所', '#3f97a5', '#ffffff'], signH: 1.5, signY: 3.9, vert: ['慧辰中醫診所', '#3f97a5', '#ffffff'], vertAt: [5.8, 7, 1.1], flip: 1, ground: 'shop', bal: 'plain', roof: 'pent' }],
    [220, 227, -1, { nf: 3, gf: 4.3, fh: 3.6, set: 17.8, d: 15, wall: '#e6e3da', low: '#8a6e58', porch: 3.5, porchKind: 'arch', porchH: 3.1, porchCol: '#e6e0d0', noband: 1, ground: 'shutter', sh: '#5d6066', bal: 'plain', hood: '#9aa0a4', roof: 'pent' }],
    [227, 234.5, -1, { nf: 3, gf: 4.3, fh: 3.6, set: 17.8, d: 15, wall: '#e6e3da', porch: 3.5, porchH: 3.9, noband: 1, ground: 'shutter', sh: '#8a8d90', bal: 'grille', hood: '#7a5a40', roof: 'pent' }],
    [234.5, 241.5, -1, { nf: 3, gf: 4.3, fh: 3.6, set: 17.8, d: 15, wall: '#e6e3da', porch: 3.3, porchKind: 'room', porchH: 3.6, porchCol: '#b9b9b0', noband: 1, awn: ['#c8392b', '#e0b030'], ground: 'shutter', sh: '#8b8377', bal: 'grille', roof: 'pent' }], // 239 號：凸出來的鐵皮前屋、生鏽鐵捲門、紅黃條紋遮陽棚
    [241.5, 249.5, -1, { kind: 'shed', set: 14.5, d: 10, h: 6.4, wall: '#9aa0a4', bays: [[242, 249, 'open']], door: 4.3, posts: '#2f4aa0', sign: ['全盛車業保修廠', '#6f9fc8', '#ffd21f'], signH: 1.5, signY: 4.75 }],
    [249.5, 259, -1, { nf: 3, gf: 3.8, fh: 3.45, set: 17.8, d: 15, wall: '#e4e1d8', low: '#a9a9a4', porch: 3.3, porchH: 3.7, porchCol: '#b9b6ae', sign: ['東熱', '#e4dfd0', '#8fa0b4'], signH: 1.9, signY: 4.6, ground: 'open', bal: 'plain', hood: '#4f9a6a', roof: 'shack' }], // 東熱：橫招已經褪色；三層樓，二樓的窗從對面看被架高的橫招擋住
    [259, 270, -1, { nf: 5, gf: 3.8, fh: 3.6, set: 17.8, d: 26, wall: '#cfcabf', bal: 'band', glass: '#6fb5a8', band: '#2f3238', ground: 'dark', door: 0, roof: 'pent' }], // 247 號綠玻璃樓：臨路面五層（四樓頂約 14.6 m），上面再一層退縮的塔屋（東南端 s 270～273.5 屬下一段）
  ],
};
export function pzAt(s) {
  const R = PZ_ROAD; let acc = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i], b = R[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= acc + L || i === R.length - 2) { const t = (s - acc) / L; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L }; }
    acc += L;
  }
}
// 每一格的區域座標：原點在立面線的起點，+x 沿立面（side -1 時朝 s 變小的方向，立面才對著街），+z 離開街道
export function pzLotFrame([s0, s1, side, sp]) {
  const m = pzAt((s0 + s1) / 2), w = s1 - s0, nx = -m.uz * side, nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux, az = side > 0 ? m.uz : -m.uz;
  const set = (sp && sp.set) || setAt(side);
  return { ox: m.x + nx * set - ax * w / 2, oz: m.z + nz * set - az * w / 2, ang: Math.atan2(az, ax), w, apron: Math.max(0.6, Math.min(sp && sp.apron !== undefined ? sp.apron : 9, set - halfAt(side))) };
}
export function pzFootprints() {
  const fp = PZ_ST.fences.map(([s0, s1, side]) => {
    const { ox, oz, ang, w, apron } = pzLotFrame([s0, s1, side, { set: setAt(side) + 0.35 }]), c = Math.cos(ang), s = Math.sin(ang), p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, 1.8), p(-0.1, 1.8)];
  });
  return fp.concat(PZ_ST.lots.map((L) => {
    const { ox, oz, ang, w, apron } = pzLotFrame(L), c = Math.cos(ang), s = Math.sin(ang), d = L[3].d || 10;
    const p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, d), p(-0.1, d)];
  }));
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

export function buildPuzhongStreet(I, scene, X) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS } = X;
  const { MR, FRONT, shopGlass, ac, win, shell } = rowTools();
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  // 單色的方塊（招牌底、雨棚、牆…）全部用頂點顏色畫在同一種材質上，一排房子只剩幾種材質，才不會有上百個 draw call：
  // 'VC' 是素色、'WVC' 是帶磁磚紋的牆；k.box / k.cyl 收到 #hex 或 'wall#hex' 就自動改成這兩種材質加頂點色
  const VC = def('pzVC', () => std({ vertexColors: true })), WVC = def('pzWVC', () => std({ map: YHT.facade(), vertexColors: true }));
  const MRW = { grime: MR.grime, brick: MR.brick, mosaic: MR.mosaic };
  const WALLC = { tile: '#f0efea', beige: '#eadfc6', grey: '#c9c8c2', pinkGrey: '#e3cfc9', stone: '#b9b7af', redbrown: '#b07a66' };
  // 磁磚貼面在日光下看起來比色票暗，深色與飽和色往白色提亮一點才像街景裡的樣子
  const lift = (hex, k = 0.22) => { const n = parseInt(hex.slice(1), 16), c = (s) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k); return `#${  [16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`; };
  const wallMat = (w) => (MRW[w] ? MRW[w] : WALLC[w] ? `wall${  WALLC[w]}` : w && w[0] === '#' ? `wall${  lift(w)}` : `wall${  WALLC.tile}`);
  const paintGeo = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  };
  const vcKit = (k) => {
    const kb = k.box.bind(k), kc = k.cyl.bind(k), hexOf = (m) => (typeof m !== 'string' ? null : m[0] === '#' ? m : m.startsWith('wall#') ? m.slice(4) : null);
    k.box = (x0, x1, y0, y1, z0, z1, mat, o) => { const h = hexOf(mat); return h ? paintGeo(kb(x0, x1, y0, y1, z0, z1, mat[0] === '#' ? VC : WVC, o), h) : kb(x0, x1, y0, y1, z0, z1, mat, o); };
    k.cyl = (x, z, r, y0, y1, mat, o) => { const h = hexOf(mat); return h ? paintGeo(kc(x, z, r, y0, y1, VC, o), h) : kc(x, z, r, y0, y1, mat, o); };
    return k;
  };
  // ---- textures ----
  // 招牌：一公尺 ppm 像素，字自動縮到放得下；text 可用 \n 分行；sub 小字；style 加上品牌色條
  const paint = (text, bg, fg, sub, wm, hm, ppm = 128, style) => {
    if (wm * ppm > 1536) ppm = 1536 / wm;
    const W = r16(wm * ppm), Hh = r16(hm * ppm);
    return sg(`pz_${text}|${bg}|${fg}|${sub || ''}|${W}x${Hh}|${style || ''}`, W, Hh, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
      if (style === 'seven') { // 白底上橘、綠、紅三條橫紋，中間偏左一塊白底放字
        [['#f26b21', 0.16], ['#00843d', 0.41], ['#e2231a', 0.66]].forEach(([c, y]) => { g.fillStyle = c; g.fillRect(0, Hh * y, W, Hh * 0.2); });
        const bw = Math.min(W * 0.3, Hh * 2.8), bx = W * 0.42 - bw / 2; g.fillStyle = '#ffffff'; g.fillRect(bx, 0, bw, Hh);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let p = Hh * 0.62; g.font = font(p); while (g.measureText(text).width > bw * 0.9 && p > 8) { p -= 2; g.font = font(p); }
        g.fillText(text, bx + bw / 2, Hh / 2); return;
      }
      if (style === 'cols') { // 直書分欄，由右到左
        const cols = String(text).split(' '), cw = W / cols.length, px = Math.min(cw * 0.8, Hh * 0.9 / Math.max(...cols.map((c) => [...c].length)));
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(px);
        cols.forEach((c, i) => { const ch = [...c]; ch.forEach((q, j) => g.fillText(q, W - cw * (i + 0.5), Hh / 2 + (j - (ch.length - 1) / 2) * px * 1.04)); }); return;
      }
      if (style === 'fam') { g.fillStyle = '#00a0e0'; g.fillRect(0, 0, W, Hh * 0.16); g.fillStyle = '#2fb34a'; g.fillRect(0, Hh * 0.16, W, Hh * 0.1); }
      if (style === 'frame') { g.strokeStyle = fg; g.lineWidth = Math.max(3, Hh * 0.04); g.strokeRect(Hh * 0.06, Hh * 0.06, W - Hh * 0.12, Hh * 0.88); }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = String(text).split('\n'), n = lines.length, avail = Hh * (sub ? 0.64 : 0.86) / n;
      const px = Math.min(avail * 0.92, W * 0.5);
      const fit = (t) => { let p = px; g.font = font(p); while (g.measureText(t).width > W * 0.94 && p > 10) { p -= 2; g.font = font(p); } return p; };
      const cy = sub ? Hh * 0.38 : Hh * 0.5;
      lines.forEach((t, i) => { fit(t); g.fillText(t, W / 2, cy + (i - (n - 1) / 2) * avail); });
      if (sub) { let p = Hh * 0.2; g.font = font(p, 700); while (g.measureText(sub).width > W * 0.94 && p > 9) { p -= 2; g.font = font(p, 700); } g.fillText(sub, W / 2, Hh * 0.82); }
    });
  };
  const roundSign = (text, bg, fg) => sg(`pzR_${text}|${bg}|${fg}`, 128, 128, (g) => {
    g.clearRect(0, 0, 128, 128); g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = fg; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; const t = [...text];
    if (t.length <= 2) { g.font = font(t.length === 1 ? 70 : 48); g.fillText(text, 64, 66); }
    else if (t.length <= 4) { g.font = font(40); g.fillText(t.slice(0, 2).join(''), 64, 44); g.fillText(t.slice(2).join(''), 64, 88); }
    else { let p = 34; g.font = font(p); while (g.measureText(text).width > 100 && p > 12) { p -= 2; g.font = font(p); } g.fillText(text, 64, 66); }
  });
  const shutterTex = (hex) => sg(`pzSh${  hex}`, 64, 64, (g) => {
    g.fillStyle = hex; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, y, 64, 3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y + 6, 64, 2); }
  });
  const openTex = sg('pzOpen', 256, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#4a4640'); gr.addColorStop(0.3, '#2a2724'); gr.addColorStop(1, '#161513'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
    g.fillStyle = 'rgba(255,248,225,.85)'; for (let x = 24; x < 256; x += 80) g.fillRect(x, 8, 36, 5);
    const r = lcg(41); for (let i = 0; i < 7; i++) { const x = 8 + i * 34 + r() * 8; g.fillStyle = ['#3a3a40', '#6a2a2a', '#2a4a6a', '#5a5a52'][i % 4]; g.fillRect(x, 96, 20, 44); g.fillRect(x - 4, 112, 28, 12); }
  });
  const archWin = sg('pzArchWin', 256, 160, (g) => { // 白色拱形鐵窗
    g.fillStyle = '#e8e8e4'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#566673'; g.fillRect(10, 10, 236, 140);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(14, 14, 100, 130);
    g.strokeStyle = '#f2f2ee'; g.lineWidth = 5;
    for (let i = 0; i < 3; i++) { const x0 = 14 + i * 77, x1 = x0 + 70; g.beginPath(); g.moveTo(x0, 148); g.lineTo(x0, 70); g.arc((x0 + x1) / 2, 70, 35, Math.PI, 0); g.lineTo(x1, 148); g.stroke(); g.beginPath(); g.moveTo((x0 + x1) / 2, 35); g.lineTo((x0 + x1) / 2, 148); g.stroke(); }
  });
  const archRow = sg('pzArchRow', 256, 64, (g) => { // 粉紅拱形女兒牆
    g.fillStyle = '#d8a0a0'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#efe0d8';
    for (let x = 6; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 58); g.lineTo(x, 28); g.arc(x + 10, 28, 10, Math.PI, 0); g.lineTo(x + 20, 58); g.closePath(); g.fill(); }
  });
  const bars = sg('pzBars', 64, 64, (g) => { // 圍牆黑色鐵欄杆
    g.clearRect(0, 0, 64, 64); g.fillStyle = '#1c1c1e'; for (let x = 4; x < 64; x += 8) g.fillRect(x, 0, 3, 64); g.fillRect(0, 2, 64, 4); g.fillRect(0, 58, 64, 4);
  });
  const litWin = (gr) => sg(`pzLit${  gr ? 1 : 0}`, 256, 160, (g) => { // 亮著燈的窗：暖色玻璃、窗簾，鐵窗版加欄杆
    g.fillStyle = '#d4d6d6'; g.fillRect(0, 0, 256, 160); const gl = g.createLinearGradient(0, 8, 0, 152); gl.addColorStop(0, '#f6e2a8'); gl.addColorStop(1, '#e0bd72');
    g.fillStyle = gl; g.fillRect(8, 8, 240, 144); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(14, 12, 50, 136);
    g.fillStyle = 'rgba(150,110,80,.45)'; g.fillRect(8, 8, 70, 144); g.fillRect(178, 8, 70, 144); g.fillStyle = '#d4d6d6'; g.fillRect(124, 0, 8, 160);
    if (gr) { g.fillStyle = '#3a3a3a'; for (let x = 22; x < 256; x += 30) g.fillRect(x, 0, 4, 160); g.fillRect(0, 76, 256, 4); }
  });
  const shopTex = (i) => ROWT.shop(`pz${  i}`, ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6], ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6], 300 + i * 3);

  const kits = [];
  const hAt = (x, z) => new Kit(I, x, z, 0).base; // 那一點的地面高度（Kit 的基準高度就是原點的地形高度）
  // 在母 Kit 的 (x, z) 開一個小 Kit（基準高度＝那一點的地面），回傳的代理仍然吃母 Kit 的區域座標：斜坡上的車、柱子、看板才會各自貼地
  const sub = (k, x, z) => {
    const [wx, wz] = k.w(x, z), q = vcKit(new Kit(I, wx, wz, k.ang)); kits.push(q);
    return {
      box: (x0, x1, y0, y1, z0, z1, m, o) => q.box(x0 - x, x1 - x, y0, y1, z0 - z, z1 - z, m, o),
      cyl: (cx, cz, r, y0, y1, m, o) => q.cyl(cx - x, cz - z, r, y0, y1, m, o),
      slab: (x0, z0, x1, z1, th, y0, y1, m, o) => q.slab(x0 - x, z0 - z, x1 - x, z1 - z, th, y0, y1, m, o),
      plane: (tex, pw, ph, px, py, pz, rot, o) => q.plane(tex, pw, ph, px - x, py, pz - z, rot, o),
      _part: (m, g) => q._part(m, g.translate(-x, 0, -z)),
    };
  };
  const drape = (k, x0, x1, z0, z1, hex, up = 0.09) => { // 貼著地形的鋪面（平板在斜坡上會一半埋進土裡）
    const nx = Math.max(1, Math.ceil((x1 - x0) / 2.5)), nz = Math.max(1, Math.ceil((z1 - z0) / 2.5)), pos = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz, [wx, wz] = k.w(x, z); pos.push(x, hAt(wx, wz) - k.base + up, z); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, c = a + nx + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.setIndex(idx); g.computeVertexNormals();
    return k._part(VC, paintGeo(g, hex));
  };
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, rot, col) => { // 一台機車，順著立面停（rot 0）或垂直立面（rot 1）
    if (rot) { k.box(x - 0.14, x + 0.14, 0.28, 0.62, z, z + 1.5, col, { col: false }); k.box(x - 0.1, x + 0.1, 0.62, 0.72, z + 0.45, z + 1.0, '#1c1c1e', { col: false }); k.box(x - 0.3, x + 0.3, 0.9, 0.96, z + 1.28, z + 1.34, '#1c1c1e', { col: false }); k.box(x - 0.08, x + 0.08, 0.0, 0.5, z + 0.05, z + 0.5, '#1c1c1e', { col: false }); k.box(x - 0.08, x + 0.08, 0.0, 0.5, z + 1.2, z + 1.45, '#1c1c1e', { col: false }); }
    else { k.box(x, x + 1.5, 0.28, 0.62, z - 0.14, z + 0.14, col, { col: false }); k.box(x + 0.45, x + 1.0, 0.62, 0.72, z - 0.1, z + 0.1, '#1c1c1e', { col: false }); k.box(x + 1.28, x + 1.34, 0.9, 0.96, z - 0.3, z + 0.3, '#1c1c1e', { col: false }); k.box(x + 0.05, x + 0.5, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', { col: false }); k.box(x + 1.2, x + 1.45, 0, 0.5, z - 0.08, z + 0.08, '#1c1c1e', { col: false }); }
  };

  // ================= kind 'site'／'shed' 的零件（座標都是 Kit 區域座標：x 沿立面、z 離開街道、立面線 z = 0） =================
  const shutterFine = (hex) => sg(`pzShF${  hex}`, 32, 256, (g) => { g.fillStyle = hex; g.fillRect(0, 0, 32, 256); for (let y = 0; y < 256; y += 8) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, y, 32, 2); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y + 6, 32, 2); } });
  const cpcLogo = sg('pzCpcLogo', 128, 128, (g) => { // 中油的圓形火炬標誌（只畫形狀，沒有字）
    g.clearRect(0, 0, 128, 128); g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = '#1f4fb0'; g.lineWidth = 9; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 41, 0, 7); g.stroke();
    g.fillStyle = '#1f4fb0'; g.beginPath(); g.moveTo(54, 66); g.lineTo(74, 66); g.lineTo(68, 100); g.lineTo(60, 100); g.closePath(); g.fill();
    g.fillStyle = '#d6262b'; g.beginPath(); g.moveTo(64, 28); g.bezierCurveTo(84, 44, 78, 60, 64, 62); g.bezierCurveTo(50, 60, 46, 46, 64, 28); g.fill();
  });
  const carCols = ['#e9e9e6', '#d0d2d4', '#1c1d20', '#3a3d42', '#8a8f96', '#f2f2f0', '#7a2226', '#56606c', '#c9c9c4', '#17181a'];
  const car = (k, x, z, col) => { // 一台待售車：x 是車身中線、z 是車頭（朝街），車尾在 z + 4.3
    k.box(x - 0.88, x + 0.88, 0.3, 0.86, z, z + 4.3, col);
    k.box(x - 0.78, x + 0.78, 0.86, 1.36, z + 1.25, z + 3.55, '#23272c', { col: false });
    k.box(x - 0.8, x + 0.8, 1.36, 1.42, z + 1.4, z + 3.4, col, { col: false });
    for (const wz of [z + 0.55, z + 3.1]) for (const wx of [x - 0.92, x + 0.72]) k.box(wx, wx + 0.2, 0.02, 0.64, wz, wz + 0.64, '#141416', { col: false });
    for (const lx of [x - 0.8, x + 0.5]) k.box(lx, lx + 0.3, 0.6, 0.74, z - 0.02, z, '#f4f1e6', { col: false });
  };
  const tree = (k, x, z, h, r) => { // 樹幹加三團樹冠
    const s = h * 0.24; k.cyl(x, z, 0.2, -0.4, h * 0.7, '#6a4a30', { seg: 6 });
    for (const [dx, dy, dz, q] of [[0, h * 0.78, 0, 1], [-s * 0.7, h * 0.62, s * 0.3, 0.8], [s * 0.75, h * 0.66, -s * 0.2, 0.85]]) { const g = new THREE.SphereGeometry(s * q, 7, 5); g.translate(x + dx, dy, z + dz); k._part(VC, paintGeo(g, r() < 0.5 ? '#2f5a2c' : '#3f7a3a')); }
  };
  const gable = (k, x0, x1, y0, y1, z0, z1, hex) => { // 山牆朝街的雙斜屋頂（三角柱）
    const xm = (x0 + x1) / 2, P = [[x0, y0, z0], [x1, y0, z0], [xm, y1, z0], [x0, y0, z1], [x1, y0, z1], [xm, y1, z1]], pos = [], idx = [];
    const face = (...ids) => { const b = pos.length / 3; ids.forEach((q) => pos.push(...P[q])); for (let j = 1; j < ids.length - 1; j++) idx.push(b, b + j, b + j + 1); };
    face(0, 2, 1); face(3, 4, 5); face(0, 3, 5, 2); face(1, 2, 5, 4);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.setIndex(idx); g.computeVertexNormals();
    return k._part(VC, paintGeo(g, hex));
  };
  // 從 A 到 B 的一面板子（站在讀得到字的那一側，A 在左手邊）；posts 立柱數、solid 有碰撞的實牆、both 背面也有字
  const panel = (k, ax, az, bx, bz, o) => {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), th = Math.atan2(dz, dx), nx = -dz / len, nz = dx / len, cx = (ax + bx) / 2, cz = (az + bz) / 2, y0 = o.y || 0, h = o.h || 1.2, t = o.th || 0.12;
    paintGeo(k.slab(ax, az, bx, bz, t, y0 || -0.4, y0 + h, VC, { col: !!o.solid }), o.bg);
    if (o.text) for (const sd of o.both ? [1, -1] : [1]) k.plane(paint(o.text, o.bg, o.fg, o.sub, len - 0.1, h - 0.08, 96), len - 0.1, h - 0.08, cx + sd * nx * (t / 2 + 0.02), y0 + h / 2, cz + sd * nz * (t / 2 + 0.02), -th + (sd < 0 ? Math.PI : 0), { emissive: o.em ?? 0.3 });
    for (let j = 0; j < (o.posts || 0); j++) { const u = o.posts === 1 ? 0.5 : j / (o.posts - 1), px = ax + dx * u - nx * (t / 2 + 0.1), pz = az + dz * u - nz * (t / 2 + 0.1); k.box(px - 0.09, px + 0.09, -0.6, y0 + h, pz - 0.09, pz + 0.09, '#4a4d50'); }
  };
  const pylon = (k, x, z, o) => { // 招牌鐵柱：頂端橫向箱型看板＋下面一兩支直立燈箱，看板面垂直道路
    const h = o.h || 10, pc = o.col || '#6a4a3a';
    for (const q of o.truss ? [-0.45, 0.45] : [0]) k.box(x - 0.13, x + 0.13, -0.6, h - 0.2, z + q - 0.13, z + q + 0.13, pc);
    if (o.truss) for (let y = 0.9; y < h - 1; y += 1.1) k.box(x - 0.04, x + 0.04, y, y + 0.08, z - 0.45, z + 0.45, pc, { col: false });
    const face = (tex, w, hh, yc, zc) => { for (const sd of [-1, 1]) k.plane(tex, w, hh, x + sd * 0.2, yc, zc, sd * Math.PI / 2, { emissive: 0.35 }); };
    let y = h;
    if (o.top) { const [t, bg, fg, w, hh, sub] = o.top, m = o.frame ? 0.36 : 0.1; k.box(x - 0.18, x + 0.18, h - hh, h, z - w / 2, z + w / 2, o.frame || bg, { col: false }); face(paint(t, bg, fg, sub, w - m, hh - m, 96), w - m, hh - m, h - hh / 2, z); y = h - hh - 0.25; }
    for (const v of [o.vert, o.low]) if (v) { const [t, bg, fg, w, len] = v, zc = z + (o.out ? -1 : 1) * ((o.truss ? 0.6 : 0.2) + w / 2); k.box(x - 0.18, x + 0.18, y - len, y, zc - w / 2, zc + w / 2, bg, { col: false }); face(ROWT.vert(`pzP${  t  }${bg}`, bg, fg, t), w - 0.08, len - 0.08, y - len / 2, zc); y -= len + 0.2; }
  };
  const canopy = (k, x0, x1, z0, z1, o) => { // 平頂鋼棚：只有柱子有碰撞，底下可以停車
    const h = o.h || 3.2, t = 0.18, pc = o.post || '#6b6b6b', nx = Math.max(2, Math.round((x1 - x0) / 6) + 1), nz = Math.max(2, Math.round((z1 - z0) / 6) + 1);
    k.box(x0, x1, h, h + t, z0, z1, o.roof || '#a9b3a6', { col: false });
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) { const x = x0 + 0.15 + (x1 - x0 - 0.3) * a / (nx - 1), z = z0 + 0.15 + (z1 - z0 - 0.3) * b / (nz - 1); k.box(x - 0.08, x + 0.08, -0.6, h, z - 0.08, z + 0.08, pc); if (o.rail) k.box(x - 0.03, x + 0.03, h + t, h + t + o.rail, z - 0.03, z + 0.03, pc, { col: false }); }
    if (o.rail) { const y = h + t + o.rail; for (const z of [z0 + 0.12, z1 - 0.18]) k.box(x0, x1, y, y + 0.06, z, z + 0.06, pc, { col: false }); for (const x of [x0 + 0.12, x1 - 0.18]) k.box(x, x + 0.06, y, y + 0.06, z0, z1, pc, { col: false }); }
  };
  const gasCanopy = (k, x0, x1, z0, z1, o = {}) => { // 中油加油棚：白色棚簷加藍、紅帶，頂面太陽能板，兩座加油島，屋頂圓標
    const h = o.h || 5, t = 1.2, W = '#f1f1ef', B = '#1f4fb0', xm = (x0 + x1) / 2;
    k.box(x0, x1, h, h + t, z0, z1, W, { col: false });
    k.box(x0 + 0.02, x1 - 0.02, h - 0.04, h + 0.02, z0 + 0.02, z1 - 0.02, '#e2e2de', { col: false }); // 棚底是白的（藍帶只在簷口一圈）
    k.box(x0 - 0.03, x1 + 0.03, h, h + 0.32, z0 - 0.03, z1 + 0.03, B, { col: false });
    k.box(x0 - 0.03, x1 + 0.03, h + 0.32, h + 0.42, z0 - 0.03, z1 + 0.03, '#d6262b', { col: false });
    k.box(x0 + 0.4, x1 - 0.4, h + t, h + t + 0.1, z0 + 0.4, z1 - 0.4, '#4a5670', { col: false });
    for (const z of [z0 + 3.5, z1 - 3.5]) {
      for (const x of [x0 + 1.6, xm, x1 - 1.6]) k.box(x - 0.25, x + 0.25, -0.6, h, z - 0.25, z + 0.25, '#33363a');
      k.box(x0 + 1.0, x1 - 1.0, -0.4, 0.2, z - 0.6, z + 0.6, '#e8c21f', { col: false });
      for (const x of [x0 + 3.6, x1 - 3.6]) { k.box(x - 0.5, x + 0.5, 0.2, 2.0, z - 0.3, z + 0.3, '#f1f1ef'); k.box(x - 0.52, x + 0.52, 1.5, 2.0, z - 0.32, z + 0.32, B, { col: false }); }
    }
    const tw = 2.4, th = 0.66, ty = h + 0.42 + (t - 0.42) / 2, tex = paint('中油', W, B, null, tw, th, 96);
    k.plane(tex, tw, th, x1 - 2.2, ty, z0 - 0.05, FRONT, { emissive: 0.35 });
    k.plane(tex, tw, th, x0 - 0.05, ty, z0 + 2.6, -Math.PI / 2, { emissive: 0.35 }); k.plane(tex, tw, th, x1 + 0.05, ty, z0 + 2.6, Math.PI / 2, { emissive: 0.35 });
    k.box(x0 + 1.4, x0 + 1.6, h + t, h + t + 1.0, z0 + 1.4, z0 + 1.6, '#8a8d90', { col: false });
    for (const sd of [-1, 1]) k.plane(cpcLogo, 2.5, 2.5, x0 + 1.5 + sd * 0.04, h + t + 2.2, z0 + 1.5, sd * Math.PI / 2, { transparent: true, emissive: 0.35 });
    for (const sd of [-1, 1]) k.plane(cpcLogo, 2.5, 2.5, x0 + 1.5, h + t + 2.2, z0 + 1.5 + sd * 0.04, sd > 0 ? 0 : FRONT, { transparent: true, emissive: 0.35 });
  };
  const buildSite = (k, L, sp, w, apron, i) => {
    const side = L[2], set = sp.set || setAt(side), d = sp.d || 10, r = lcg(7000 + i * 13), ap = Math.min(apron, Math.max(0, set - halfAt(side)));
    const lx = (s) => (side > 0 ? s - L[0] : L[1] - s), lz = (off) => off - set, span = (a, b) => [Math.min(lx(a), lx(b)), Math.max(lx(a), lx(b))];
    if (sp.kind === 'shed') {
      const h = sp.h || 5, bd = sp.bd || d, wall = sp.wall || '#cfc8b2', dh = sp.door || Math.min(h - 1.3, 4), pc = sp.posts || '#e6e6e2';
      k.box(0, w, -1.2, h, 0, bd, wall);
      if (sp.low) k.box(-0.02, w + 0.02, -1.2, sp.low[1], -0.02, bd + 0.02, sp.low[0], { col: false });
      if (sp.front) k.box(0, w, 0, h, -0.05, 0, sp.front, { col: false });
      if (sp.gable) gable(k, -0.2, w + 0.2, h, sp.gable, -0.3, bd + 0.1, sp.roof || '#d9d6cc');
      else k.box(-0.15, w + 0.15, h, h + 0.12, -0.3, bd + 0.1, sp.roof || MR.roof, { col: false });
      for (const [sa, sb, kind, col] of sp.bays || []) {
        const [xa, xb] = span(sa, sb), bw = xb - xa;
        if (kind === 'open') { const n = Math.max(1, Math.round(bw / 5)); for (let j = 0; j < n; j++) k.plane(openTex, bw / n, dh, xa + bw * (j + 0.5) / n, dh / 2, -0.07, FRONT, { emissive: 0.3 }); }
        else if (kind === 'glass') k.plane(shopTex(i), bw, dh, xa + bw / 2, dh / 2, -0.07, FRONT, { emissive: 0.5 });
        else k.plane(shutterFine(col || '#8a8d90'), bw, dh, xa + bw / 2, dh / 2, -0.07, FRONT);
        for (const x of [xa - 0.12, xb]) k.box(x, x + 0.12, 0, dh, -0.14, 0, pc, { col: false });
        k.box(xa - 0.12, xb + 0.12, dh, dh + 0.14, -0.14, 0, pc, { col: false });
      }
      if (sp.wins) { const [y0, y1] = sp.wins, n = Math.max(1, Math.round((w - 1) / 2.4)), ww = (w - 1) / n; for (let j = 0; j < n; j++) k.plane(ROWT.alWin(), ww - 0.25, y1 - y0, 0.5 + ww * (j + 0.5), (y0 + y1) / 2, -0.03, FRONT); }
      if (sp.lip) k.box(-0.1, w + 0.1, dh + 0.14, dh + 0.34, -sp.lip, 0, sp.lipCol || sp.front || '#2a2a2a', { col: false });
      const sy = sp.signY ?? dh + 0.3, sh = sp.signH || 1.2, sz = sp.lip ? -sp.lip : 0;
      for (const [sa, sb, text, bg, fg, sub, style] of sp.signs || (sp.sign ? [[L[0], L[1], ...sp.sign]] : [])) {
        const [xa, xb] = span(sa, sb);
        k.box(xa, xb, sy, sy + sh, sz - 0.2, sz, bg, { col: false });
        k.plane(paint(text, bg, fg, sub, xb - xa - 0.1, sh - 0.06, 96, style), xb - xa - 0.1, sh - 0.06, (xa + xb) / 2, sy + sh / 2, sz - 0.21, FRONT, { emissive: 0.35 });
      }
      drape(k, 0, w, -ap, 0, '#a3a19b');
    } else if (sp.pave !== 0) drape(k, 0, w, -ap, d, sp.pave || '#8f8d88');
    for (const [t, a, b, c, e, f] of sp.items || []) {
      if (t === 'cars') { const [x0, x1] = span(a, b), o = e || {}, n = Math.floor((x1 - x0) / 2.7); for (let j = 0; j < n; j++) { const q = r(), col = carCols[r() * carCols.length | 0], x = x0 + (x1 - x0 - n * 2.7) / 2 + 2.7 * (j + 0.5), z = lz(c) + r() * 0.5; if (q >= (o.skip || 0)) car(sub(k, x, z + 2.15), x, z, col); } }
      else if (t === 'pylon') pylon(sub(k, lx(a), lz(b)), lx(a), lz(b), c || {});
      else if (t === 'canopy') { const [x0, x1] = span(a, b); canopy(sub(k, (x0 + x1) / 2, (lz(c) + lz(e)) / 2), x0, x1, lz(c), lz(e), f || {}); }
      else if (t === 'gas') { const [x0, x1] = span(a, b); gasCanopy(sub(k, (x0 + x1) / 2, (lz(c) + lz(e)) / 2), x0, x1, lz(c), lz(e), f || {}); }
      else if (t === 'panel') panel(sub(k, (lx(a) + lx(c)) / 2, (lz(b) + lz(e)) / 2), lx(a), lz(b), lx(c), lz(e), f || {});
      else if (t === 'fence') { // 每 4 m 一段，各自貼地
        const o = f || {}, xa = lx(a), za = lz(b), xb = lx(c), zb = lz(e), n = Math.max(1, Math.ceil(Math.hypot(xb - xa, zb - za) / 4));
        for (let j = 0; j < n; j++) { const u0 = j / n, u1 = (j + 1) / n, p = [xa + (xb - xa) * u0, za + (zb - za) * u0, xa + (xb - xa) * u1, za + (zb - za) * u1]; paintGeo(sub(k, (p[0] + p[2]) / 2, (p[1] + p[3]) / 2).slab(p[0], p[1], p[2], p[3], 0.08, -0.4, o.h || 2, VC), o.col || '#8fa593'); }
      } else if (t === 'tree') tree(sub(k, lx(a), lz(b)), lx(a), lz(b), c || 8, r);
      else if (t === 'tank') { const x = lx(a), z = lz(b), y = c || 0; for (const [qx, qz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) k.box(x + qx - 0.04, x + qx + 0.04, y, y + 1.0, z + qz - 0.04, z + qz + 0.04, '#a03a2a', { col: false }); k.cyl(x, z, 0.62, y + 1.0, y + 2.4, '#c9ccd0', { seg: 12 }); }
      else if (t === 'stack') { const x = lx(a), z = lz(b), o = c || {}, bw = o.w || 2.2, q = sub(k, x, z); let y = o.h || 7; q.box(x - 0.1, x + 0.1, -0.6, y, z - 0.1, z + 0.1, '#8a8d90'); for (const [text, bg, fg] of o.rows || []) { y -= 0.6; q.box(x - 0.14, x + 0.14, y, y + 0.54, z - bw / 2, z + bw / 2, bg, { col: false }); if (text) for (const sd of [-1, 1]) q.plane(paint(text, bg, fg, null, bw - 0.1, 0.48, 96), bw - 0.1, 0.48, x + sd * 0.16, y + 0.27, z, sd * Math.PI / 2, { emissive: 0.4 }); } }
      else if (t === 'box') { const [x0, x1] = span(a, b), o = f || {}, z0 = lz(c), y1 = o.y1 || 3, q = sub(k, (x0 + x1) / 2, (z0 + lz(e)) / 2); q.box(x0, x1, o.y0 ?? -1.2, y1, z0, lz(e), o.col || '#c9c8c2', { col: !!o.solid }); for (let j = 0; j < (o.win || 0); j++) for (const u of [0.28, 0.72]) q.plane(YHT.win(), 1.6, 1.2, x0 + (x1 - x0) * u, y1 - 1.7 - j * 3.3, z0 - 0.03, FRONT); }
      else if (t === 'roundel') { const x = lx(a), z = lz(b), o = c || {}, hc = o.h || 7, dd = o.d || 2, q = sub(k, x, z); q.box(x - 0.07, x + 0.07, -0.6, hc + dd / 2, z + dd / 2 + 0.05, z + dd / 2 + 0.19, '#7d7f82'); q.box(x - 0.05, x + 0.05, hc - 0.05, hc + 0.05, z, z + dd / 2 + 0.1, '#7d7f82', { col: false }); for (const sd of [-1, 1]) q.plane(cpcLogo, dd, dd, x + sd * 0.06, hc, z, sd * Math.PI / 2, { transparent: true, emissive: 0.35 }); }
    }
  };

  const exposed = (L, lo) => !PZ_ST.lots.some((M) => M !== L && M[2] === L[2] && (lo ? Math.abs(M[1] - L[0]) < 1.2 : Math.abs(M[0] - L[1]) < 1.2)); // 這一側有沒有鄰居
  PZ_ST.lots.forEach((L, i) => {
    const sp = L[3], { ox, oz, ang, w, apron } = pzLotFrame(L), r = lcg(2000 + i * 7);
    const ex0 = L[2] > 0 ? exposed(L, true) : exposed(L, false), ex1 = L[2] > 0 ? exposed(L, false) : exposed(L, true);
    const k = vcKit(new Kit(I, ox, oz, ang)); kits.push(k);
    { const [mx, mz] = k.w(w / 2, 0); k.base = hAt(mx, mz); k.group.position.y = k.base; } // 基準高度取立面中點：斜坡上兩端才不會一頭埋進土裡、一頭懸空
    if (sp.kind === 'site' || sp.kind === 'shed') { buildSite(k, L, sp, w, apron, i); return; }
    const win2 = (x, y, ww, h, gr = true) => (r() < 0.2 ? k.plane(litWin(gr), ww, h, x, y, -0.02, FRONT, { emissive: 0.5 }) : win(k, x, y, ww, h, gr)); // 兩成的窗亮著燈
    const nf = sp.nf || 4, fh = sp.fh || 3.0, gf = sp.gf || (nf === 1 ? 3.2 : 3.3), top = gf + (nf - 1) * fh, d = sp.d || 10;
    const glassWall = sp.bal === 'glass';
    const wm = glassWall && sp.glass ? sp.glass : wallMat(sp.wall);
    shell(k, w, d, top, wm);
    if (sp.low && !glassWall) k.box(-0.01, w + 0.01, 0, gf, -0.015, 0, wallMat(sp.low), { col: false, tile: [0.6, 0.6] }); // 厚度要比門面貼圖（z = -0.02）薄，不然會蓋住店面
    for (const x of [0, w - 0.12]) k.box(x, x + 0.12, 0, top, -0.06, 0, '#b9b6ae', { col: false });                  // 分戶牆邊
    // ---- 一樓 ----
    const pd = sp.porch || 0, ph = sp.porchH || gf - 0.1;                                                  // 一樓前簷：深度與簷高
    if (sp.sign) {
      const [text, bg, fg, sub, style] = sp.sign, sw = w - 0.15, sh = sp.signH || 0.8, sy = sp.signY ?? (pd ? ph - 0.3 : gf - 0.85);
      k.box(0.05, w - 0.05, sy, sy + sh + 0.02, -pd - 0.28, -pd, bg, { col: false });
      k.plane(paint(text, bg, fg, sub, sw, sh, 128, style), sw, sh, w / 2, sy + sh / 2 + 0.01, -pd - 0.29, FRONT, { emissive: 0.35 });
      if (pd && sy > ph + 0.15) for (const x of [0.5, w - 0.6]) k.box(x, x + 0.1, ph, sy, -pd - 0.2, -pd - 0.1, '#6a6d70', { col: false }); // 架高的招牌：兩支鐵架撐在前簷上
    } else if (!sp.noband) k.box(0.05, w - 0.05, gf - 0.85, gf - 0.4, -0.06, 0, sp.band || '#d8d6cf', { col: false });
    if (pd) {
      const pk = sp.porchKind || 'flat', pc = sp.porchCol || '#c9c6bd';
      if (pk === 'room') { k.box(0, w, -0.5, ph, -pd, 0, pc); k.plane(sp.sh ? shutterTex(sp.sh) : ROWT.shutter(), w - 0.8, ph - 1.0, w / 2, (ph - 1.0) / 2, -pd - 0.02, FRONT); } // 凸出來的鐵皮前屋：整面鐵捲門，上面一截浪板門楣
      else if (pk === 'flat') k.box(-0.05, w + 0.05, ph, ph + 0.1, -pd, 0, pc, { col: false });
      else {                                                                                               // 拱形採光罩：從街上看得到弧形的端面
        const rise = pk === 'arch' ? 1.5 : 0.6, n = 8;
        for (let j = 0; j < n; j++) { const xa = w * j / n, xb = w * (j + 1) / n, ya = ph + rise * Math.sin(Math.PI * j / n), yb = ph + rise * Math.sin(Math.PI * (j + 1) / n), g = new THREE.BoxGeometry(Math.hypot(xb - xa, yb - ya) + 0.03, 0.07, pd); g.rotateZ(Math.atan2(yb - ya, xb - xa)); g.translate((xa + xb) / 2, (ya + yb) / 2, -pd / 2); k._part(VC, paintGeo(g, pc)); }
        k.box(0, w, ph - 0.1, ph, -pd, -pd + 0.1, '#5a4a3c', { col: false });
      }
      for (const x of [0.08, w - 0.2]) k.box(x, x + 0.12, 0, ph, -pd, -pd + 0.12, sp.porchPost || '#e6e6e2', { col: false });
    }
    if (sp.awn) {
      const A = Array.isArray(sp.awn) ? sp.awn : [sp.awn], n = A.length > 1 ? Math.max(2, Math.round(w / 0.3)) : 1, bw = w / n;
      if (pd && sp.porchKind === 'room') for (let j = 0; j < n; j++) { const xa = -0.05 + j * bw; k.box(xa, xa + bw + 0.01, ph - 0.05, ph + 0.7, -pd - 0.55, -pd - 0.49, A[j % A.length], { col: false }); k.box(xa, xa + bw + 0.01, ph + 0.7, ph + 0.76, -pd - 0.55, -pd + 0.5, A[j % A.length], { col: false }); } // 前屋門楣上方的條紋遮陽棚
      else {
        for (let j = 0; j < n; j++) k.box(-0.05 + j * bw, -0.05 + (j + 1) * bw + 0.01, gf - 1.05, gf - 0.97, -1.25, 0, A[j % A.length], { col: false });
        k.box(-0.05, w + 0.05, gf - 1.18, gf - 1.05, -1.27, -1.2, A[0], { col: false });
      }
    }
    if (sp.tin) { const ty = nf === 1 ? top : sp.sign ? gf + 0.1 : gf - 0.35; k.box(-0.1, w + 0.1, ty, ty + 0.08, -1.3, nf === 1 ? d : 0, MR.roof, { col: false }); }
    const doorW = sp.door === 0 ? 0 : 1.0, bodyW = w - doorW;
    if (doorW) k.plane(YHT.win(), doorW - 0.1, 2.2, w - doorW / 2 - 0.1, 1.1, -0.03, FRONT);
    const gh = gf - 1.0;
    const gk = sp.ground || 'shop';
    if (gk === 'shop' || gk === 'stall') {
      shopGlass(k, 0.15, bodyW - 0.2 + (doorW ? 0 : 0.2), 0, gh, shopTex(i));
      if (gk === 'stall') { k.box(0.3, bodyW - 0.3, 0, 0.95, -0.55, -0.05, '#c9c9c4', { col: false }); k.box(0.3, bodyW - 0.3, 0.95, 1.0, -0.6, -0.02, '#8d9196', { col: false }); }
    } else if (gk === 'dark') {                                                                          // 深色玻璃門面：直框分格，中間一扇古銅大門
      k.box(0.15, bodyW - 0.15, 0, gh, -0.04, 0, '#27343a', { col: false });
      for (let x = 0.15; x <= bodyW - 0.2; x += (bodyW - 0.38) / Math.max(2, Math.round(bodyW / 1.8))) k.box(x, x + 0.08, 0, gh, -0.07, 0, '#15191c', { col: false });
      k.box(bodyW / 2 - 0.9, bodyW / 2 + 0.9, 0, gh - 0.3, -0.09, 0, '#7a6a55', { col: false }); k.box(bodyW / 2 - 0.02, bodyW / 2 + 0.02, 0, gh - 0.3, -0.1, 0, '#4a3f33', { col: false });
    } else if (gk === 'open') {
      k.plane(openTex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.03, FRONT, { emissive: 0.3 });
      for (const x of [0.12, bodyW - 0.22]) k.box(x, x + 0.1, 0, gh, -0.1, 0, '#8a8680', { col: false });
    } else {
      const tex = sp.sh ? shutterTex(sp.sh) : ROWT.shutter();
      k.plane(tex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.02, FRONT);
      if (gk === 'gate') k.plane(YHT.win(), bodyW - 0.5, gh - 0.4, bodyW / 2, gh / 2 - 0.15, -0.05, FRONT);
      k.box(0.15, bodyW - 0.15, gh - 0.02, gh + 0.2, -0.22, 0, '#7a7e80', { col: false });                       // 鐵捲門的罩盒
    }
    if (sp.bikes) for (let j = 0; j < sp.bikes; j++) { const x = 0.2 + j * ((w - 2.2) / Math.max(1, sp.bikes - 0.5)); bike(k, x, -0.9 - (j % 2) * 0.35, 0, bikeCols[(i + j) % 6]); }
    else if (w > 4 && r() < 0.6) {                                                                       // 騎樓邊停幾台機車
      const n = 1 + (r() * 3 | 0); let x = 0.3 + r() * 1.5;
      for (let j = 0; j < n && x < w - 1.7; j++) { const per = r() < 0.4; bike(k, per ? x + 0.3 : x, per ? -1.75 : -1.0 - r() * 0.3, per ? 1 : 0, bikeCols[(i * 3 + j) % 6]); x += per ? 0.8 : 1.9 + r() * 0.5; }
    }
    if (r() < 0.3) k.box(w - 0.38, w - 0.3, 0, top, -0.13, -0.05, '#8a8d90', { col: false });           // 外牆水管
    if ((gk === 'shop' || gk === 'stall') && w > 3.5 && r() < 0.4) { const sx = 0.4 + r() * (w - 2); k.box(sx, sx + 0.55, 0, 0.95, -1.5, -1.45, '#26282b', { col: false }); k.box(sx + 0.04, sx + 0.51, 0.55, 0.9, -1.51, -1.49, '#f3efe4', { col: false }); } // 門口立牌
    if (sp.banner) { const [bt, bb, bf] = sp.banner; k.plane(paint(bt, bb, bf, null, Math.min(w - 0.4, 3.4), 0.5, 96), Math.min(w - 0.4, 3.4), 0.5, w / 2, gf - 1.5, -0.3, FRONT, { emissive: 0.15 }); }
    // ---- 樓上 ----
    for (let f = 1; f < nf; f++) {
      const y = gf + (f - 1) * fh, ww = w - 1.0;
      if (glassWall) {                                                                                     // 玻璃帷幕：一格一格的窗與白色分隔
        k.box(0.05, w - 0.05, y, y + 0.4, -0.08, -0.02, '#e9e9e6', { col: false });
        for (let x = 0.05; x <= w - 0.04; x += 1.4) k.box(x, x + 0.07, y, y + fh, -0.1, -0.02, '#e9e9e6', { col: false });
        if (f === 1) k.box(0.05, w - 0.05, y + fh - 0.06, y + fh, -0.18, -0.02, '#e9e9e6', { col: false });
        continue;
      }
      const bk = sp.bal || 'grille';
      if (bk === 'band') {                                                                               // 磁磚牆上的綠色反射玻璃橫帶窗：寬的開間分成兩組，每組三分割
        const n = w > 9 ? 2 : 1, gw = (w - 0.9 - (n - 1) * 0.7) / n;
        for (let j = 0; j < n; j++) { const x0 = 0.45 + j * (gw + 0.7); k.box(x0, x0 + gw, y + 0.95, y + 2.7, -0.04, 0, sp.glass || '#6fb5a8', { col: false }); for (let q = 0; q <= 3; q++) { const mx = x0 + (gw - 0.07) * q / 3; k.box(mx, mx + 0.07, y + 0.95, y + 2.7, -0.07, 0, '#3f4f4c', { col: false }); } k.box(x0 - 0.05, x0 + gw + 0.05, y + 0.87, y + 0.95, -0.12, 0, '#b9b6ae', { col: false }); }
      } else if (bk === 'cage') {
        win2(w / 2, y + 1.45, ww - 0.4, 1.4, false);
        k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -0.75, 0, 'metal', { col: false });
        k.box(0.3, w - 0.3, y + 2.55, y + 2.62, -0.75, 0, 'metal', { col: false });
        for (let x = 0.3; x <= w - 0.29; x += 0.18) k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, 'metal', { col: false });
      } else if (bk === 'open') { k.box(0.3, w - 0.3, y, y + 0.9, -0.8, -0.7, wallMat(sp.wall), { col: false }); win2(w / 2, y + 1.6, ww, 1.6, false); }
      else if (bk === 'rail') {
        win2(w / 2, y + 1.5, ww, 1.4, false);
        if (f === 1) { k.box(0.1, w - 0.1, y, y + 0.1, -1.0, 0, '#2b2b2b', { col: false }); for (const yy of [0.5, 0.85, 1.2]) k.box(0.1, w - 0.1, y + yy, y + yy + 0.04, -1.0, -0.96, '#2b2b2b', { col: false }); for (const x of [0.1, w - 0.14]) k.box(x, x + 0.04, y, y + 1.2, -1.0, -0.96, '#2b2b2b', { col: false }); }
      } else if (bk === 'arch') {
        const n = Math.max(1, Math.round(ww / 3.2)), cw = ww / n;
        for (let j = 0; j < n; j++) k.plane(archWin, cw - 0.2, 1.7, 0.5 + cw * (j + 0.5), y + 1.5, -0.03, FRONT);
      } else if (bk === 'plain') win2(w / 2, y + 1.5, ww, 1.4, false);
      else win2(w / 2, y + 1.5, ww, 1.35);
      if (sp.hood) k.box(0.4, w - 0.4, y + 2.25, y + 2.33, -0.65, 0, sp.hood, { col: false });
      if (sp.fins) for (let x = 0.3; x <= w - 0.3; x += 0.55) k.box(x, x + 0.1, y + 0.1, y + fh - 0.1, -0.3, 0, sp.fins, { col: false });
      if (r() < 0.65) ac(k, r() < 0.5 ? 0.25 : w - 1.05, y + 0.1 + (r() < 0.5 ? 0 : 1.9), bk === 'cage' ? -1.2 : -0.45);
    }
    if (sp.big) { const [bt, bb, bf] = sp.big, y0 = gf + ((sp.bigFrom || 2) - 1) * fh, bh = top - y0 - 0.1, bw = sp.bigW || w - 0.6, bx = sp.bigW ? w * (sp.bigAt || 0.5) : w / 2; k.plane(paint(bt, bb, bf, null, bw, bh, 40), bw, bh, bx, y0 + bh / 2 + 0.05, -0.06, FRONT, { emissive: 0.15 }); }
    if (sp.sign2) { const [bt, bb, bf] = sp.sign2; k.box(0.1, w - 0.1, gf + 0.3, gf + 1.5, -0.2, -0.06, bb, { col: false }); k.plane(paint(bt, bb, bf, null, w - 0.3, 1.1, 100), w - 0.3, 1.1, w / 2, gf + 0.9, -0.21, FRONT, { emissive: 0.3 }); }
    if (sp.vert) { const [text, bg, fg] = sp.vert, [vy = gf + 0.4, len = 0.6 * text.length + 0.2, vw = 0.6, vz = -0.25 - vw / 2] = sp.vertAt || [], vx = sp.flip ? w - 0.25 : 0.25; for (const sd of [-1, 1]) k.plane(ROWT.vert(`pz${  text  }${bg}`, bg, fg, text), vw, len, vx + sd * 0.04, vy + len / 2, vz, sd * Math.PI / 2, { emissive: 0.3 }); }
    if (sp.side) { const [text, bg, fg, sw, sh, sy] = sp.side, vx = sp.flip ? w - 0.3 : 0.3, zc = -0.5 - sw / 2; k.box(vx - 0.1, vx + 0.1, sy, sy + sh, zc - sw / 2, zc + sw / 2, bg, { col: false }); k.box(vx - 0.04, vx + 0.04, sy + sh * 0.45, sy + sh * 0.55, zc + sw / 2, 0, '#6a6d70', { col: false }); for (const sd of [-1, 1]) k.plane(paint(text, bg, fg, null, sw - 0.1, sh - 0.1, 96), sw - 0.1, sh - 0.1, vx + sd * 0.11, sy + sh / 2, zc, sd * Math.PI / 2, { emissive: 0.3 }); } // 箱型側招：垂直立面、兩面可讀
    if (sp.round) { const [text, bg, fg, rs = 0.85] = sp.round, rx = sp.flip ? 0.3 : w - 0.3; for (const sd of [-1, 1]) k.plane(roundSign(text, bg, fg), rs, rs, rx + sd * 0.03, gf + 1.1 + rs / 2, -0.25 - rs / 2, sd * Math.PI / 2, { transparent: true, emissive: 0.3 }); }
    if (sp.arch) { k.box(0, w, top + 0.12, top + 0.95, d - 0.2, d, sp.arch, { col: false }); k.box(0, 0.12, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false }); k.box(w - 0.12, w, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false }); k.box(0, w, top + 0.12, top + 0.95, -0.02, 0.1, sp.arch, { col: false }); k.plane(archRow, w, 0.8, w / 2, top + 0.53, -0.04, FRONT); }
    if (sp.tower) {
      const T = sp.tower, back = T.back || 2.5, tn = T.nf || 8, tw = wallMat(T.wall || '#e9e7e3'), th = tn * 3.0;
      k.box(0.3, w - 0.3, top + 0.12, top + 0.12 + th, back, d - 0.5, tw);
      for (let f = 0; f < tn; f++) {
        const y = top + 0.12 + f * 3.0;
        k.box(0.3, w - 0.3, y + 0.05, y + 0.2, back - 1.0, back, T.balc || '#6a6070', { col: false });
        win2(w / 2, y + 1.7, w - 1.6, 1.4, false);
        if (r() < 0.5) ac(k, 0.8 + r() * (w - 3), y + 0.3, back - 0.5);
      }
    }
    // 後牆與沒有鄰居的側牆開窗，頂樓隨機加水塔／頂樓加蓋，從高處或巷口看才不會是一整面素牆
    if (nf > 1) {
      for (let f = 0; f < nf; f++) {
        const y = f === 0 ? 0.3 : gf + (f - 1) * fh + 0.3, n = w > 7 ? 3 : w > 4 ? 2 : 1;
        for (let j = 0; j < n; j++) k.plane(YHT.win(), 1.5, 1.1, w * (j + 0.5) / n, y + 1.1, d + 0.03, 0);
        for (const [x, rot, ex] of [[-0.03, -Math.PI / 2, ex0], [w + 0.03, Math.PI / 2, ex1]]) if (ex) for (const zc of [d * 0.3, d * 0.7]) k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, zc, rot);
      }
    }
    if (nf > 1 && !sp.roof) {
      const q = r();
      if (q < 0.3) k.cyl(w * (0.3 + r() * 0.4), d * 0.7, 0.55, top + 0.12, top + 1.4, '#d8d8d0', { seg: 10 });
      else if (q < 0.55) { const hx = w * (0.15 + r() * 0.3), hz = d * 0.35; k.box(hx, hx + 2.2, top + 0.12, top + 2.6, hz, hz + 2.4, wallMat(sp.wall), { col: false }); k.box(hx - 0.15, hx + 2.35, top + 2.6, top + 2.72, hz - 0.15, hz + 2.55, MR.roof, { col: false }); }
      else if (q < 0.7) { k.box(0.3, w - 0.3, top + 0.12, top + 2.3, d * 0.45, d - 0.4, '#3a6fb0', { col: false }); k.box(0.1, w - 0.1, top + 2.3, top + 2.4, d * 0.4, d - 0.2, MR.roof, { col: false }); }
    }
    if (sp.roof === 'shack') { k.box(0.4, w - 0.4, top + 0.12, top + 2.2, 2.0, d - 0.5, MR.roof, { col: false }); k.box(0.2, w - 0.2, top + 2.2, top + 2.3, 1.4, d, MR.roof, { col: false }); }
    else if (sp.roof === 'pent') { k.box(0.3, w - 0.3, top + 0.12, top + 2.9, 3.2, d - 0.5, wallMat(sp.wall), { col: false }); k.box(0.1, w - 0.1, top + 2.9, top + 3.02, 2.9, d - 0.3, 'gray', { col: false }); k.plane(YHT.win(), Math.min(2.4, w - 1.6), 1.2, w / 2, top + 1.6, 3.17, FRONT); }
    else if (sp.roof === 'tank') { k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 }); if (w > 4.5) k.cyl(w / 2 + 1.3, d - 3, 0.5, top + 0.12, top + 1.3, '#cfd2d4', { seg: 10 }); }
    else if (sp.roof === 'bill' && sp.bill) {                                                                // 屋頂鐵架看板
      const [bt, bb, bf, bw0, bh] = sp.bill, bw = Math.min(bw0 || w - 0.6, w), y0 = top + (nf === 1 ? 0.9 : 0.4);
      k.plane(paint(bt, bb, bf, null, bw, bh, 80), bw, bh, w / 2, y0 + bh / 2, 0.45, FRONT, { emissive: 0.35, double: true });
      k.box(w / 2 - bw / 2 - 0.04, w / 2 + bw / 2 + 0.04, y0 - 0.06, y0, 0.4, 0.5, '#4a4d50', { col: false });
      for (const x of [w / 2 - bw / 2 + 0.2, w / 2 + bw / 2 - 0.25]) k.box(x, x + 0.06, top, y0 + bh * 0.6, 0.38, 0.5, '#4a4d50', { col: false });
    }
    if (nf === 1) { // 一樓鐵皮屋：浪板屋頂往後傾
      k.box(-0.15, w + 0.15, top - 0.12, top, -0.4, d, sp.roofCol || MR.roof, { col: false });
    }
    drape(k, 0, w, -apron, 0, '#a3a19b'); // 門前鋪面貼著地形鋪
  });

  // ---- 沿路圍牆（PZ_ST.fences）：低矮花台、灌木、紅磚方柱加黑色鐵欄杆、行道大樹 ----
  PZ_ST.fences.forEach(([s0, s1, side], i) => {
    const { ox, oz, ang, w, apron } = pzLotFrame([s0, s1, side, { set: setAt(side) + 0.35 }]), r = lcg(4000 + i);
    const k = vcKit(new Kit(I, ox, oz, ang)); kits.push(k);
    k.box(0, w, -0.4, 0.55, 0.2, 1.3, '#c9c5ba');                                                          // 花台
    k.box(0.1, w - 0.1, 0.55, 1.1, 0.35, 1.15, '#3f7a3a', { col: false });                                  // 灌木
    const n = Math.max(1, Math.round(w / 4)), bay = w / n;
    for (let j = 0; j <= n; j++) { const x = Math.min(w - 0.24, Math.max(0, j * bay - 0.12)); k.box(x, x + 0.24, 0.55, 2.0, 0.1, 0.4, '#a0523a', { col: false }); k.box(x - 0.03, x + 0.27, 2.0, 2.08, 0.07, 0.43, '#e8e6e0', { col: false }); }
    for (let j = 0; j < n; j++) k.plane(bars, bay - 0.34, 1.0, (j + 0.5) * bay, 1.35, 0.25, FRONT, { transparent: true, double: true });
    for (let x = 4 + r() * 3; x < w - 3; x += 9 + r() * 5) {                                              // 大樹：樹幹加兩三團樹冠
      const h = 5 + r() * 2.5, s = 1.2 + r() * 0.6; k.cyl(x, 0.85, 0.22, 0, h, '#6a4a30', { seg: 6 });
      for (const [dx, dy, dz, q] of [[0, h + 0.6, 0, 1], [-1.2, h - 0.6, 0.4, 0.8], [1.3, h - 0.3, -0.2, 0.85]]) { const g = new THREE.SphereGeometry(s * q, 7, 5); g.translate(x + dx, dy, 0.85 + dz); k._part(VC, paintGeo(g, r() < 0.5 ? '#3f7a3a' : '#4b8a3e')); }
    }
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
  });
  finishRow(scene, kits);
}
