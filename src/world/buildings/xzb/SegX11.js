// 新中北路 s 1222～1515 兩側（信陽街口往西到中山東路一段高架橋路口；Google 街景 2026-05（s 1340～1365 只有 2022-06）、
// 國土測繪 2024 正射、Google 衛星）。
//   北側（+1）由東到西：灰色水泥車庫（1 層）→ 明日資訊 → 灰綠老屋 → 全悅牙醫（白色直條格柵）→ 紅磚花窗樓 → 紅磚 3 樓兩間（頂樓鋼構雨棚）→
//     藍鐵捲門＋綠鐵皮圍籬的空地 → 長頸鹿房屋 → 兩棟灰色老屋 → 立得屋五金百貨賣場（白色鐵皮大賣場）→ 停車空地 → 白色鐵皮廠房 →
//     Derek 德瑞克名床 → mint（白色拱廊）→
//     8 樓紅磚長公寓（YC HAIR SALON、安馨中醫、永潔牙醫、云禾美學）→ 47巷 → 國王漢堡轉角 → 橘子物業 → 城鄉地政士 → 39 號白磁磚樓 →
//     灰樓 → 徽風岸咖啡 → 春和西服 → 邦德西服 Mr. Bespoke → 洗石子浮雕樓 → 15巷 → 灰白公寓、綠雨遮兩棟 → 刈包四神湯／姜家古早味麵店 →
//     兩棟 4 樓 → 新中北路 1 號轉角老屋
//   南側（-1）由東到西：停車場水泥圍牆（「出入口請勿停車」大門、後面 1 層水泥平房）→ 香菓子專業檳榔、磐岩炒廚（1 層店面）→
//     中原苑 9 樓公寓（地下室坡道、大廳、藍泉優質加水站）→ 藍色鐵皮圍籬空地 → 洗石子 2 樓 → 大王檳榔 → 影印印刷 → 亞太音樂協會 →
//     白磁磚轉角樓 → 58巷 → 宜特影印轉角 → 設計裝修 → DANA STUDIO → 大象租屋中心 → 車庫樓 → 碳老爹 → 粉紅磁磚 5 樓兩棟 → 34巷 →
//     白色服飾店轉角 → 一排 4 樓老街屋（公益彩券…）→ 5～6 樓公寓 → 4 樓紅磚樓 → 兩間娃娃機店到路口
//   西端（中山東路一段）是高架橋（cycu.json grade zhongshan_viaduct），橋本體與面向中山東路那一面不做。
//   有店面牆的填充樓與兩棟 OSM 建物不能 drop，列在 hide（資料留著、不畫、碰撞收成一點）；原本 noShop 的填充樓 drop。
//   看不清的招牌不放字（全悅以西的黃底直招、碳老爹隔壁的紅白大直招、娃娃機店…）。
const R = 'X',
  SN = 7.6, // 北側立面離中心線
  SS = 7.7; // 南側立面離中心線
const NC = { col: false };
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（南側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標，有碰撞的 box 要用），所以把寬度搬到 k.W、還原 k.w
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
// 闊葉樹：樹幹＋幾團樹冠
const tree = (C, k, x, z, h, cr, r) => {
  k.cyl(x, z, 0.2, -0.5, h - cr, '#5e4630', { seg: 6, col: true });
  const G = ['#3f7a3a', '#4b8a3e', '#356b34'];
  ball(C, k, x, h - cr * 0.85, z, cr * 0.8, G[0], 0.75);
  for (let j = 0; j < 4; j++) {
    const a = j * 1.57 + r() * 0.8;
    ball(
      C,
      k,
      x + Math.cos(a) * cr * 0.5,
      h - cr * (0.95 + r() * 0.3),
      z + Math.sin(a) * cr * 0.5,
      cr * (0.55 + r() * 0.15),
      G[1 + (j % 2)],
      0.72
    );
  }
};

// 一格街屋：[ref, s0, s1, side, spec]，set 沒寫就用 SN／SS
const N = (s0, s1, sp) => [R, s0, s1, 1, { set: SN, ...sp }];
const S = (s0, s1, sp) => [R, s0, s1, -1, { set: SS, ...sp }];
const RB = '#a8604c', // 紅磚
  WT = '#e9e8e3', // 白磁磚
  PK = '#d8b4ab', // 粉紅磁磚
  GR = '#aaa9a2', // 灰色水泥
  PB = '#8f7a62'; // 褐色洗石子

export default {
  // 原本就 noShop 的填充樓：北側 f793～f804（f792、f794… 有店面牆的在 hide）、15巷以西 f2_725～f2_727、f2_714；
  // 南側 58巷東角 f2_217／f2_218、34巷以西 f1490～f1500 裡的 noShop 那幾棟、西端 f1489
  drop: [
    'f793',
    'f795',
    'f798',
    'f799',
    'f800',
    'f801',
    'f803',
    'f804',
    'f2_725',
    'f2_726',
    'f2_727',
    'f2_714',
    'f2_218',
    'f2_217',
    'f1496',
    'f1495',
    'f1494',
    'f1492',
    'f1491',
    'f1490',
    'f1500',
    'f1498',
    'f1489',
  ],
  // 有店面牆的填充樓與 OSM 建物（Mint pasta w1553447850、8 樓紅磚公寓 w1556458644，輪廓與樓高都跟實景不合，後者還伸到人行道上）
  hide: [
    'f792',
    'f794',
    'f796',
    'f797',
    'f802',
    'f805',
    'f806',
    'f2_221',
    'f2_220',
    'f2_219',
    'f1493',
    'f1501',
    'f1499',
    'f1497',
    'f1488',
    'w1553447850',
    'w1556458644',
  ],
  ownSign: [],
  lots: [
    // ================= 北側 =================
    // 信陽街口西北角：1 層灰色水泥車庫（鏽鐵捲門＋藍色小鐵門，門牌 101）
    N(1226, 1229.6, {
      nf: 1,
      gf: 3.4,
      wall: '#9d9c96',
      ground: 'shutter',
      sh: '#8a7a68',
      noband: 1,
      door: 0,
      d: 9,
      roofCol: '#8d8b86',
    }),
    // 明日資訊電腦快修中心：4 樓白磁磚、二三樓白色花窗鐵窗
    N(1229.6, 1234.8, {
      nf: 4,
      wall: WT,
      sign: ['明日資訊 電腦快修中心', '#3a6fb0', '#ffffff', '0920-868063'],
      bal: 'cage',
      d: 14,
    }),
    // 灰綠色 3 樓老屋（二樓陽台、綠色雨遮、灰鐵捲門）
    N(1234.8, 1239.2, {
      nf: 3,
      wall: '#9aa592',
      ground: 'shutter',
      awn: '#5f8a5a',
      noband: 1,
      door: 0,
      bal: 'open',
      d: 14,
    }),
    // 全悅牙醫診所：4 樓白色直條鋁格柵立面
    N(1239.2, 1245, {
      nf: 4,
      wall: '#f2f1ec',
      sign: ['全悅牙醫診所', '#f4f3ee', '#2f4f9a', 'ALL JOY DENTAL CLINIC 466-3569'],
      fins: '#f7f7f4',
      bal: 'plain',
      d: 14,
      vert: ['全悅牙醫', '#ffffff', '#2f4f9a'],
    }),
    // 紅磚 4 樓：二樓白色花窗鐵窗＋盆栽，一樓藍灰鐵捲門
    N(1245, 1249.8, {
      nf: 4,
      wall: RB,
      ground: 'shutter',
      sh: '#5f7f96',
      noband: 1,
      door: 0,
      bal: 'cage',
      d: 14,
    }),
    // 紅磚 3 樓兩間：二樓大窗、一樓白鐵捲門，頂樓鋼構雨棚
    N(1249.8, 1256, {
      nf: 3,
      wall: RB,
      ground: 'shutter',
      sh: '#d6d6d2',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 14,
      roof: 'shack',
    }),
    N(1256, 1262.4, {
      nf: 3,
      wall: '#b06650',
      ground: 'shutter',
      sh: '#d6d6d2',
      awn: '#e6dcc4',
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 14,
      roof: 'shack',
    }),
    // s 1262.4～1270.6：藍色大鐵捲門＋綠鐵皮圍籬的空地（custom）
    // 長頸鹿房屋：4 樓紅磚，後面接一棟白色 5 樓（東側整面素牆對著空地）
    N(1270.6, 1276, {
      nf: 4,
      wall: '#b5735e',
      sign: ['長頸鹿房屋', '#f4efe6', '#c8282a'],
      bal: 'plain',
      d: 14,
      vert: ['長頸鹿房屋', '#c8282a', '#ffffff'],
    }),
    // 兩棟灰色 3 樓老屋：東間二樓花磚欄杆陽台、一樓車庫＋鐵皮雨遮；西間二樓白鐵窗、一樓兩扇鐵捲門
    N(1281.4, 1287.4, {
      nf: 3,
      wall: GR,
      ground: 'open',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'cage',
      d: 13,
      roof: 'shack',
    }),
    N(1276, 1281.4, {
      nf: 3,
      wall: '#9e9d97',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 13,
    }),
    // 立得屋五金百貨賣場：1～2 層高的白色鐵皮大賣場，上半截白色浪板牆面整排紅色大字，一樓整面玻璃窗（參考線在 s 1293.2 轉折，切成三格）
    N(1287.4, 1293.2, {
      nf: 2,
      gf: 3.6,
      fh: 3.0,
      wall: '#ecebe6',
      ground: 'shop',
      noband: 1,
      bal: 'plain',
      big: ['立得屋', '#efeee8', '#cf2a24'],
      bigFrom: 1,
      d: 18,
      roof: 'none',
      bikes: 3,
    }),
    N(1293.2, 1305, {
      nf: 2,
      gf: 3.6,
      fh: 3.0,
      wall: '#ecebe6',
      ground: 'shop',
      noband: 1,
      bal: 'plain',
      big: ['五金百貨', '#efeee8', '#cf2a24'],
      bigFrom: 1,
      d: 18,
      roof: 'none',
      bikes: 5,
    }),
    N(1305, 1316, {
      nf: 2,
      gf: 3.6,
      fh: 3.0,
      wall: '#ecebe6',
      ground: 'shop',
      noband: 1,
      bal: 'plain',
      big: ['百貨賣場', '#efeee8', '#cf2a24'],
      bigFrom: 1,
      d: 18,
      roof: 'none',
      bikes: 4,
    }),
    // s 1316～1318.2：賣場西邊的停車空地（入口橫桿，custom）
    // 1～2 層白色鐵皮廠房（灰色鐵捲門），比街屋退一點
    N(1318.2, 1320.8, {
      set: SN + 0.8,
      nf: 1,
      gf: 4.6,
      wall: '#e4e3dd',
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      door: 0,
      d: 12,
      roofCol: '#d6d6d0',
    }),
    // Derek 德瑞克名床：5 樓紅磚、二樓花窗鐵窗、深綠色招牌
    N(1320.8, 1326.2, {
      nf: 5,
      wall: RB,
      sign: ['Derek 德瑞克名床', '#4f6a52', '#f2efe6', 'Mattress & Bedding'],
      bal: 'arch',
      d: 13,
    }),
    // mint：同一棟 5 樓紅磚，一樓白色拱廊（拱廊在 custom）
    N(1326.2, 1333.4, {
      nf: 5,
      wall: RB,
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'rail',
      d: 13,
    }),
    // 8 樓紅磚長公寓（一樓騎樓、紅磚地）：由東到西 YC HAIR SALON → 安馨中醫診所 → 黑色招牌（字看不清）→ 住家 → 鐵捲門 → 云禾美學 → 永潔牙醫
    N(1333.4, 1338.4, {
      nf: 8,
      wall: '#b46e58',
      sign: ['YC HAIR SALON', '#1e1e20', '#f2f2ee'],
      bal: 'grille',
      d: 10.4,
      roof: 'tank',
    }),
    N(1338.4, 1344.2, {
      nf: 8,
      wall: '#b46e58',
      sign: ['安馨中醫診所', '#2f8a4a', '#ffffff', '(03)438-6930'],
      bal: 'open',
      d: 10.4,
      roof: 'none',
    }),
    N(1344.2, 1349.6, {
      nf: 8,
      wall: '#b46e58',
      sign: ['', '#1e1e20', '#f2f2ee'],
      bal: 'grille',
      d: 10.4,
      roof: 'none',
    }),
    N(1349.6, 1357.4, {
      nf: 8,
      wall: '#b46e58',
      ground: 'shutter',
      sh: '#9a9c9e',
      bal: 'open',
      d: 10.4,
      roof: 'tank',
    }),
    N(1357.4, 1361.6, {
      nf: 8,
      wall: '#b46e58',
      ground: 'shutter',
      sh: '#9a9c9e',
      bal: 'grille',
      d: 10.4,
      roof: 'none',
    }),
    N(1361.6, 1367.4, {
      nf: 8,
      wall: '#b46e58',
      sign: ['云禾美學', '#f1efea', '#7a6a4a'],
      bal: 'open',
      d: 10.4,
      roof: 'none',
    }),
    N(1367.4, 1379.8, {
      nf: 8,
      wall: '#b46e58',
      sign: ['永潔牙醫診所 DENTAL CLINIC', '#4a5056', '#f2f2ee'],
      bal: 'grille',
      d: 10.4,
      roof: 'shack',
    }),
    // 47巷（s 1380.3～1385.3）
    // 國王漢堡：4 樓白磁磚圓弧轉角樓、黃底藍紫字大招牌
    N(1385.8, 1391.6, {
      nf: 4,
      wall: WT,
      sign: ['國王漢堡', '#f2c94a', '#4a3aa8'],
      bal: 'plain',
      d: 12,
    }),
    // 橘子物業管理公司：4 樓粉褐磁磚
    N(1391.6, 1396.2, {
      nf: 4,
      wall: '#c49a8a',
      sign: ['橘子物業管理公司', '#d8322a', '#ffffff', '電話:03-4360880 專業包租代管管理'],
      bal: 'plain',
      d: 12,
    }),
    // 城鄉地政士（代書）：4 樓灰磚、紫色雨遮
    N(1396.2, 1400.4, {
      nf: 4,
      wall: '#a3a09a',
      sign: ['城鄉地政士(代書)', '#f2d23a', '#c8202a', '0928-208364'],
      awn: '#5a3f7a',
      bal: 'plain',
      d: 12,
    }),
    // 39 號：3 樓白小磁磚樓兩開間，藍鐵捲門
    N(1400.4, 1409.1, {
      nf: 3,
      wall: '#eeeeea',
      ground: 'shutter',
      sh: '#3f6f9a',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 灰色 4 樓（二樓一排冷氣）、髮型工作室的紅白直招（字看不清，不寫）
    N(1409.1, 1416.6, {
      nf: 4,
      wall: '#9d9b95',
      ground: 'shutter',
      sh: '#a8aaac',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 徽風岸咖啡工坊：4 樓深咖啡色木紋橫條立面
    N(1416.6, 1421.8, {
      nf: 4,
      wall: '#5a4436',
      sign: ['徽風岸 咖啡工坊', '#1c1c1c', '#f2f2ee', '自家烘焙咖啡豆'],
      fins: '#4a382c',
      bal: 'plain',
      d: 12,
    }),
    N(1421.8, 1424.6, {
      nf: 4,
      wall: WT,
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 春和西服：3 樓粉褐磁磚、黃底黑字招牌、藍鐵捲門
    N(1424.6, 1429.6, {
      nf: 3,
      wall: '#c09888',
      sign: ['春和西服 男女褲訂做', '#f0c93a', '#1c1c1c', '各種衣服修改 換拉鍊'],
      bal: 'plain',
      d: 12,
      vert: ['春和西服', '#f4f2ec', '#1c1c1c'],
    }),
    // 褐色 3 樓（二樓大面窗＋冷氣），一樓灰色雨遮＋玻璃門住家
    N(1429.6, 1434.4, {
      nf: 3,
      wall: '#9a7a66',
      ground: 'gate',
      awn: '#8d9196',
      noband: 1,
      bal: 'plain',
      d: 12,
    }),
    // 邦德西服 Mr. Bespoke：黑底白字（直招也是黑底）
    N(1434.4, 1438.8, {
      nf: 4,
      wall: '#cfd3d8',
      sign: ['Mr. Bespoke 邦德西服', '#1e1e20', '#f2f2ee', '西服訂製'],
      bal: 'plain',
      d: 12,
      vert: ['邦德西服', '#1e1e20', '#f2f2ee'],
    }),
    // 米色洗石子 3 樓（貝殼浮雕、二樓白格窗、一樓鐵花＋灰鐵捲門）
    N(1438.8, 1442.8, {
      nf: 3,
      wall: '#cbbfa6',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      hood: '#bdb29a',
      d: 12,
    }),
    // 灰色樓：一樓玻璃門
    N(1442.8, 1447, {
      nf: 4,
      wall: '#b9b8b2',
      ground: 'gate',
      noband: 1,
      bal: 'plain',
      d: 12,
    }),
    // 4 樓灰磚樓（綠色鋁窗）到 15巷口
    N(1447, 1451.6, {
      nf: 4,
      wall: '#8e8c88',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 15巷（s 1451.9～1456.9）
    // 5 樓灰白小磁磚轉角公寓（綠色雨遮窗、灰鐵捲門＋紅春聯）
    N(1457.2, 1462.4, {
      nf: 5,
      wall: '#d4d6d6',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      hood: '#5f9a6a',
      d: 12,
    }),
    // 4 樓灰色公寓：一樓綠雨遮＋綠鐵捲門
    N(1462.4, 1466.4, {
      nf: 4,
      wall: '#a6a7a3',
      ground: 'shutter',
      sh: '#4f7a5a',
      awn: '#4f8a5a',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 4 樓米白磚樓：二樓鐵花陽台，一樓綠色波浪雨遮＋整面玻璃門
    N(1466.4, 1471.2, {
      nf: 4,
      wall: '#e6e0d2',
      ground: 'shop',
      awn: ['#3f8a5a', '#f2f2ee'],
      noband: 1,
      bal: 'rail',
      d: 12,
    }),
    // 3 樓灰色老屋：一樓鐵皮雨遮下兩攤——刈包四神湯（橘色直立旗）、姜家古早味麵店（紅底白字菜單看板）
    N(1471.2, 1475.6, {
      nf: 3,
      wall: '#a9a7a0',
      ground: 'open',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'cage',
      d: 9,
      vert: ['刈包四神湯', '#e88a2a', '#1c1c1c'],
    }),
    N(1475.6, 1481.2, {
      nf: 3,
      wall: '#a9a7a0',
      ground: 'open',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 9,
      banner: ['姜家古早味麵店', '#c8282a', '#ffffff'],
    }),
    // 2～3 樓老屋（灰鐵捲門）
    N(1481.2, 1485.2, {
      nf: 3,
      wall: '#b3b1aa',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 8.5,
    }),
    // 4 樓白磁磚樓（二樓木格窗、一樓鐵皮雨遮＋灰鐵捲門）
    N(1485.2, 1490, {
      nf: 4,
      wall: '#e4e3de',
      ground: 'shutter',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 8.5,
    }),
    // 4 樓灰色小磁磚樓（二樓大面玻璃窗、一樓灰鐵捲門＋褐色木框玻璃門）
    N(1490, 1494.6, {
      nf: 4,
      wall: '#7f8a94',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 8.5,
    }),
    // 新中北路 1 號：3 樓白灰色老屋轉角（二三樓綠框鐵花窗，一樓騎樓＋藍鐵捲門），西邊就是中山東路高架橋
    N(1494.6, 1502.4, {
      nf: 3,
      wall: '#d2d0c8',
      ground: 'shutter',
      sh: '#3f6f9a',
      noband: 1,
      door: 0,
      bal: 'cage',
      d: 8.5,
    }),

    // ================= 南側 =================
    // s 1226～1262.4：停車場水泥圍牆與後面的平房（custom）
    // 香菓子專業檳榔：1 層店面（綠底紅字大招牌、玻璃櫃台），後面接中原苑公寓
    S(1262.4, 1271.4, {
      nf: 1,
      gf: 3.6,
      wall: '#d8d4ca',
      sign: ['香菓子專業檳榔', '#8fd07a', '#d0241c', '批發 零售 外送專線 03-43808'],
      ground: 'stall',
      d: 11,
      roofCol: '#9a9890',
    }),
    // 磐岩炒廚：1 層店面，深灰色波浪板招牌，整面玻璃門窗
    S(1271.4, 1282.2, {
      nf: 1,
      gf: 3.8,
      wall: '#3c3e42',
      sign: ['磐岩炒廚', '#36383c', '#f2f2ee', '外帶＋外送 打包您的美食生活'],
      ground: 'shop',
      d: 11,
      roofCol: '#7a7c80',
    }),
    // 中原苑：9 樓粉紅磚公寓（凸窗），一樓東邊地下室坡道、中間大廳、西邊藍泉優質加水站
    S(1283.6, 1288.6, {
      nf: 9,
      wall: '#c99a8c',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 16,
      roof: 'shack',
    }),
    S(1288.6, 1293.2, {
      nf: 9,
      wall: '#c99a8c',
      sign: ['中原苑', '#f2d23a', '#2f4f9a'],
      ground: 'gate',
      bal: 'open',
      d: 16,
      roof: 'none',
    }),
    S(1293.2, 1299.2, {
      nf: 9,
      wall: '#c99a8c',
      sign: ['藍泉優質加水站', '#2f7ac8', '#ffffff', 'LAN CHYUAN'],
      bal: 'plain',
      d: 16,
      roof: 'tank',
      vert: ['加水站', '#2f7ac8', '#ffffff'],
    }),
    // s 1299.2～1303.6：藍色鐵皮圍籬空地（custom）
    // 2 樓褐色洗石子老屋：二樓方窗、一樓兩扇藍鐵捲門＋鐵皮雨遮
    S(1303.6, 1311.2, {
      nf: 2,
      wall: PB,
      ground: 'shutter',
      sh: '#3f6f9a',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 大王檳榔：3 樓，二樓綠白招牌、直立燈箱；隔壁橘底藍字直招「大聯盟檳榔」
    S(1311.2, 1315.8, {
      nf: 3,
      wall: '#8a7660',
      sign2: ['大王檳榔 DA WANG', '#2f9a5a', '#ffffff'],
      ground: 'shutter',
      sh: '#3f6f9a',
      noband: 1,
      bal: 'grille',
      d: 12,
      vert: ['大王檳榔', '#f4f2ec', '#2f9a5a'],
    }),
    // 影印 印刷（黃底紅字、since 1989），4 樓褐色洗石子、凸窗
    S(1315.8, 1321.8, {
      nf: 4,
      wall: PB,
      sign2: ['影印 印刷 03-4566777', '#f2d23a', '#c8202a'],
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 12,
      vert: ['大聯盟檳榔', '#e8862a', '#2f4f9a'],
    }),
    // 亞太音樂藝術教育文化協會：4 樓褐色洗石子
    S(1321.8, 1329.4, {
      nf: 4,
      wall: '#97806a',
      sign: ['亞太音樂藝術教育文化協會', '#f2d23a', '#c8202a', 'TEL:0935-123-487'],
      bal: 'plain',
      d: 12,
    }),
    // 4 樓白磁磚轉角樓（二三樓鐵窗、一樓深綠雨遮＋藍鐵捲門＋玻璃小店）；實景巷口比遊戲的 58巷寬（路口黃色網狀線），s 1338.2～1341.7 留空
    S(1329.4, 1338.2, {
      nf: 4,
      wall: WT,
      ground: 'shutter',
      sh: '#3f6f9a',
      awn: '#2f6a4a',
      noband: 1,
      bal: 'grille',
      d: 12,
    }),
    // 58巷（s 1341.7～1346.7）
    // 宜特 ELITE CORP 影印輸出：4 樓白磁磚轉角樓
    S(1347.2, 1353.2, {
      nf: 4,
      wall: WT,
      sign: ['宜特 工程圖 彩色影印', '#efe2b8', '#c8202a', 'TEL:466-5278 466-6276'],
      bal: 'plain',
      d: 12,
    }),
    // 5 樓白磁磚（綠白直招「設計裝修」）
    S(1353.2, 1358.2, {
      nf: 5,
      wall: '#e4e4e0',
      ground: 'gate',
      noband: 1,
      bal: 'plain',
      d: 12,
      vert: ['設計裝修', '#2f8a4a', '#ffffff'],
    }),
    // DANA STUDIO：4 樓白磁磚，一樓住家門＋鐵門
    S(1358.2, 1366, {
      nf: 4,
      wall: '#e2e2de',
      sign: ['DANA STUDIO', '#f4f2ec', '#5a4a3a'],
      ground: 'gate',
      bal: 'plain',
      d: 12,
    }),
    // 大象租屋中心：4 樓粉紅磁磚、藍底白字招牌＋藍直招
    S(1366, 1372, {
      nf: 4,
      wall: PK,
      sign: ['大象租屋中心', '#2f4f9a', '#ffffff', '專業租賃'],
      bal: 'plain',
      d: 12,
      vert: ['大象租屋', '#2f4f9a', '#ffffff'],
    }),
    // 4 樓：一樓車庫（藍綠牆）
    S(1372, 1377.8, {
      nf: 4,
      wall: '#c9a09a',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 碳老爹：3 樓褐色洗石子老屋（三樓綠鐵皮加蓋），一樓小吃店
    S(1377.8, 1382.6, {
      nf: 3,
      wall: PB,
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 12,
      roof: 'shack',
      vert: ['碳老爹', '#f4f2ec', '#1c1c1c'],
    }),
    // 粉紅小磁磚 5 樓兩棟（大面凸窗）：一樓灰鐵捲門、娃娃機；西棟一樓理髮
    S(1382.6, 1394.6, {
      nf: 5,
      wall: '#d6aaa2',
      ground: 'shop',
      noband: 1,
      bal: 'plain',
      hood: '#c9c4bd',
      d: 12,
    }),
    S(1394.6, 1406.4, {
      nf: 5,
      wall: '#d0a49c',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      hood: '#c9c4bd',
      d: 12,
    }),
    // 34巷（s 1406.6～1411.6）
    // 4 樓灰褐磁磚轉角樓（綠色雨遮窗），一樓白色玻璃服飾店＋深灰雨遮
    S(1411.8, 1418, {
      nf: 4,
      wall: '#9c8f82',
      ground: 'shop',
      awn: '#4a4d50',
      noband: 1,
      bal: 'plain',
      hood: '#4f8a5a',
      d: 12,
    }),
    // 一排 4 樓老街屋，一樓鐵皮雨遮連續
    S(1418, 1423.2, {
      nf: 4,
      wall: '#a3a29c',
      ground: 'shutter',
      sh: '#3f6f9a',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 12,
    }),
    S(1423.2, 1428.2, {
      nf: 4,
      wall: '#9a948a',
      ground: 'shutter',
      sh: '#3f6f9a',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    S(1428.2, 1433.2, {
      nf: 4,
      wall: '#e6e6e2',
      ground: 'shutter',
      sh: '#3f6f9a',
      tin: 1,
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 12,
    }),
    // 紅褐磁磚樓：一樓紅底黃字「公益彩券」（褪色）
    S(1433.2, 1438.4, {
      nf: 4,
      wall: '#9a5a4a',
      sign: ['公益彩券', '#b8322a', '#f2d23a'],
      ground: 'shutter',
      tin: 1,
      bal: 'plain',
      d: 12,
    }),
    // 4 樓粉紅小磁磚樓（白窗、一樓木門住家＋紅燈籠）
    S(1438.4, 1442.6, {
      nf: 4,
      wall: '#d8b0a8',
      ground: 'gate',
      tin: 1,
      noband: 1,
      bal: 'plain',
      d: 12,
    }),
    // 5 樓白磁磚：一樓藍色雨遮店面（白色直立毛筆字招牌看不清）
    S(1442.6, 1447.6, {
      nf: 5,
      wall: WT,
      ground: 'shop',
      awn: '#2f5f9a',
      noband: 1,
      bal: 'plain',
      hood: '#4f8a5a',
      d: 12,
    }),
    // 5 樓灰白磁磚：一樓綠色長雨遮、玻璃門（補習班海報看不清）
    S(1447.6, 1452.8, {
      nf: 5,
      wall: '#d2d3d0',
      ground: 'shop',
      awn: '#3f7a4a',
      noband: 1,
      bal: 'plain',
      hood: '#4f8a5a',
      d: 12,
    }),
    // 5 樓米色磁磚（二樓灰色橫帶），一樓開放車庫
    S(1452.8, 1458.2, {
      nf: 5,
      wall: '#d9cdb6',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 12,
    }),
    // 6 樓紅褐磁磚（灰鐵捲門＋小門）
    S(1458.2, 1464, {
      nf: 6,
      wall: '#a2604e',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 12,
    }),
    // 4 樓紅磚樓一排（二樓綠色小雨遮窗、一樓藍鐵捲門、雜貨店）
    S(1464, 1469.2, {
      nf: 4,
      wall: '#a8604c',
      ground: 'shutter',
      sh: '#3f6f9a',
      noband: 1,
      bal: 'plain',
      hood: '#4f8a5a',
      d: 10,
    }),
    S(1469.2, 1474.4, {
      nf: 4,
      wall: '#a8604c',
      ground: 'shop',
      noband: 1,
      bal: 'plain',
      d: 10,
    }),
    S(1474.4, 1480.2, {
      nf: 4,
      wall: '#b06a54',
      ground: 'shop',
      noband: 1,
      bal: 'plain',
      d: 10,
    }),
    // 3～4 樓灰色＋紅磚腰帶老街屋：一樓兩間娃娃機店（透明塑膠門簾、黃色機台）到路口
    S(1480.2, 1488.4, {
      nf: 4,
      wall: '#b8b6ae',
      ground: 'stall',
      awn: '#2f5f9a',
      noband: 1,
      bal: 'plain',
      hood: '#a8604c',
      d: 10,
    }),
    S(1488.4, 1499.6, {
      nf: 3,
      wall: '#b8b6ae',
      ground: 'stall',
      awn: '#2f5f9a',
      noband: 1,
      bal: 'plain',
      hood: '#a8604c',
      d: 10,
    }),
  ],

  custom(C) {
    const { FRONT, paint, lcg } = C;
    // ---- 北側 ----
    // 長頸鹿房屋後面那棟白色 5 樓：東側整面素牆對著空地
    {
      const k = seg(C, 1, 1270.6, 1276, SN);
      k.box(0.2, k.W, 0, 15.6, 6, 14, '#e6e5e0');
    }
    // s 1262.4～1270.6 空地：藍色大鐵捲門（白字「請勿停車」）＋綠色鐵皮圍籬，裡面幾棵樹
    {
      const k = seg(C, 1, 1262.4, 1270.6, SN),
        w = k.W;
      k.box(0, 3.6, 0, 3.0, -0.05, 0.1, '#3a78b0');
      k.plane(
        paint('請勿停車', '#3a78b0', '#f2f2ee', null, 2.2, 0.5),
        2.2,
        0.5,
        1.8,
        1.3,
        -0.07,
        FRONT,
        {
          emissive: 0.1,
        }
      );
      k.box(0, 3.6, 3.0, 3.3, -0.3, 0.1, '#7a7e80', NC); // 鐵捲門罩盒
      k.box(3.6, w, 0, 2.6, -0.02, 0.05, '#8fb08a'); // 綠鐵皮圍籬
      for (let x = 3.9; x < w; x += 0.9) k.box(x, x + 0.05, 0, 2.6, -0.05, -0.02, '#7a9a76', NC);
      const r = lcg(11262);
      tree(C, k, 2.0, 5.5, 6.5, 2.4, r);
      tree(C, k, 5.0, 8.0, 5.5, 2.0, r);
    }
    // 賣場西邊的停車空地（s 1316～1318.2）：黃色網狀線、紅白入口橫桿
    {
      const k = seg(C, 1, 1316, 1318.2, SN);
      k.box(0.2, 0.35, 0, 1.0, -0.3, -0.15, '#3a3a3a');
      k.box(0.25, k.W - 0.1, 0.9, 0.98, -0.28, -0.2, '#d8282a', NC);
    }
    // mint：一樓白色拱廊（三個圓拱、粉紅內牆、綠色腰帶、深綠「mint」字）
    {
      const k = seg(C, 1, 1326.2, 1333.4, SN),
        w = k.W;
      k.box(0, w, 3.1, 3.5, -0.05, 0.02, '#2f6a4a', NC); // 綠色腰帶
      const n = 3,
        cw = w / n;
      for (let i = 0; i < n; i++) {
        const a = i * cw + 0.35,
          b = (i + 1) * cw - 0.35,
          m = (a + b) / 2;
        // 拱裡面：粉紅內牆＋兩扇圓頂木框玻璃窗（蓋在街屋一樓的開放店面貼圖前面）
        k.box(a, b, 0, 2.4, -0.045, -0.035, '#e8c6bc', NC);
        k.plane(C.YHT.win(), (b - a) * 0.7, 1.4, m, 1.2, -0.05, FRONT);
        // 圓拱：拱腳上方用三階白色方塊收成弧形
        for (const [dx, y0] of [
          [0.55, 1.75],
          [0.3, 2.05],
          [0.12, 2.25],
        ]) {
          k.box(a, a + dx, y0, 2.4, -0.12, 0.3, '#f6f4ee', NC);
          k.box(b - dx, b, y0, 2.4, -0.12, 0.3, '#f6f4ee', NC);
        }
      }
      // 拱柱與拱上方的白牆
      for (let i = 0; i <= n; i++)
        k.box(
          Math.max(0, i * cw - 0.35),
          Math.min(w, i * cw + 0.35),
          0,
          3.1,
          -0.12,
          0.4,
          '#f6f4ee'
        );
      k.box(0, w, 2.4, 3.1, -0.12, 0.4, '#f6f4ee', NC);
      k.plane(
        paint('mint', '#f6f4ee', '#2f6a3a', null, 3.0, 0.75),
        3.0,
        0.75,
        w / 2,
        2.75,
        -0.14,
        FRONT,
        {
          emissive: 0.2,
        }
      );
    }
    // ---- 南側 ----
    // 停車場（s 1226～1262.4）：路邊約 2 m 高水泥板圍牆，s 1247.4～1252.4 是大門（門楣紅字「出入口請勿停車」、鐵門「車位出租」），
    // 圍牆後面 1 層灰色水泥平房（綠色鐵捲門、中間開放車位）與鐵皮車棚
    {
      const k = C.sink(seg(C, -1, 1226, 1262.4, SS)),
        w = k.W,
        g0 = k.sx(1252.4),
        g1 = k.sx(1247.4);
      for (const [a, b] of [
        [0, g0],
        [g1, w],
      ]) {
        k.box(a, b, 0, 2.0, 0, 0.18, '#a7a59e');
        for (let x = a; x < b; x += 2.0) k.box(x, x + 0.25, 0, 2.1, -0.06, 0.24, '#9a9892', NC);
      }
      // 大門：兩根門柱＋門楣
      for (const x of [g0 - 0.5, g1]) k.box(x, x + 0.5, 0, 3.2, -0.1, 0.4, '#a09e98');
      k.box(g0 - 0.5, g1 + 0.5, 2.6, 3.2, -0.1, 0.4, '#a09e98', NC);
      k.plane(
        paint('出入口請勿停車', '#e8e4da', '#c8202a', null, g1 - g0, 0.45),
        g1 - g0,
        0.45,
        (g0 + g1) / 2,
        2.88,
        -0.12,
        FRONT,
        { emissive: 0.1 }
      );
      k.plane(
        paint('車位出租', '#4a6a8a', '#ffffff', null, 1.0, 0.4),
        1.0,
        0.4,
        g1 + 0.25,
        1.6,
        -0.12,
        FRONT
      );
      // 平房（s 1236～1262，離中心線 11～24 m）
      const h0 = k.sx(1262.4),
        h1 = k.sx(1236);
      k.box(h0, h1, 0, 3.4, 3.4, 15, '#a3a19a');
      k.box(h0 - 0.2, h1 + 0.2, 3.4, 3.6, 3.0, 15.2, '#8d8b86', NC);
      for (let x = h0 + 0.8; x < h1 - 2.5; x += 4.2) {
        if (Math.abs(x - (h0 + h1) / 2) < 2) {
          k.box(x, x + 3.2, 0, 2.8, 3.38, 3.4, '#3a3a38', NC); // 開放車位
          continue;
        }
        k.plane(C.shutterTex('#6f9a7a'), 3.2, 2.6, x + 1.6, 1.3, 3.37, FRONT);
      }
      // 鐵皮車棚（東邊，平房旁）
      const c0 = k.sx(1236),
        c1 = k.sx(1227);
      for (const x of [c0 + 0.3, c1 - 0.3])
        for (const z of [3.6, 12]) k.cyl(x, z, 0.08, 0, 3.0, '#8a8d90', { seg: 6 });
      k.box(c0, c1, 3.0, 3.1, 3.2, 12.4, '#7a8c96', NC);
      const r = lcg(11226);
      tree(C, k, k.sx(1229), 18, 7, 2.6, r);
    }
    // 中原苑：香菓子、磐岩炒廚兩間 1 層店面後面的公寓本體（9 樓），兩間店與公寓之間的窄巷
    {
      const k = seg(C, -1, 1262.4, 1282.2, SS);
      k.box(0, k.W, 0, 3.3 + 8 * 3.0, 11, 22, '#c99a8c');
      for (let f = 1; f < 9; f++)
        for (let x = 1; x < k.W - 2; x += 3.4)
          k.plane(C.YHT.win(), 1.6, 1.2, x + 0.8, 3.3 + (f - 1) * 3 + 1.5, 10.97, FRONT);
    }
    // 藍色鐵皮圍籬空地（s 1299.2～1303.6，黃牌「證件借現金」），後面一棵大樹
    {
      const k = seg(C, -1, 1299.2, 1303.6, SS),
        w = k.W;
      k.box(0, w, 0, 2.4, -0.02, 0.06, '#4a7aa8');
      for (let x = 0.2; x < w; x += 0.6) k.box(x, x + 0.05, 0, 2.4, -0.05, -0.02, '#3f6a96', NC);
      k.plane(
        paint('證件借現金', '#f2d23a', '#c8202a', '0958-252-033', 1.5, 0.8),
        1.5,
        0.8,
        w / 2,
        1.4,
        -0.07,
        FRONT
      );
      tree(C, k, w / 2, 5, 8.5, 3.2, lcg(11299));
    }
    // 西南角路口的大芒果樹
    {
      const k = seg(C, -1, 1499.6, 1503, SS);
      tree(C, k, 1.6, -1.6, 6.5, 2.6, lcg(11500));
    }
  },

  // custom 佔的地
  footprints(F) {
    return [
      F(R, 1262.4, 1270.6, 1, SN, 12, 2.5), // 北側空地
      F(R, 1226, 1262.4, -1, SS, 24, 2.5), // 南側停車場
      F(R, 1262.4, 1282.2, -1, SS, 22, 0),
      F(R, 1299.2, 1303.6, -1, SS, 10, 2.5),
    ];
  },
};
