// 中山東路 s 545.3～749 兩側（日新路口到弘揚路口；Google 街景 2026-05，日新路口 s<570 只有 2025-06 使用者相片球；
// 國土測繪 2024 正射、Google 衛星）。格子大多照原本填充樓的地界（和正射看到的屋頂分界一致）。
//   西南側（+1）由西到東：JV3C 手機配件（s 545.3～557，主體在這段；Z2 做到 s 545.3）→ 全國電子 → 施工中的灰色 3 樓 →
//     宵夜便當 → 狗屋寵物美容館 → 寵物店（五金倉庫）→ Domino's 達美樂 → 綠雨遮 5 樓 → 車庫樓 → 育源堂中藥房 →
//     木吉可樂樂器（Mugiker）→ 紅茶巴士 → 美新自助洗衣 → 陽光飯糰 → 台灣大哥大 myfone（莒光路口西角）→ 莒光路 →
//     唯酷 3C配件專賣（東角）→ 御品廣東粥烏龍麵 → 商行五金 → 一間通訊 → 中古機買賣 → 手機現場維修 →
//     遠傳 FET 6 樓圓角轉角樓 → 大勇二街 → 斯朵利髮型圓柱轉角樓 → WEKII → 手機維修 → 日進健保藥局 → KYMCO 志佳車業行 →
//     冠美廣告社 → 半雞八兩 → RAMA VII（s 741～749，弘揚路口對面，西南側沒有路口）
//   東北側（-1）由西到東：（日新路口東角小林眼鏡在日新路 A 段）→ 健康按摩院 → 7 樓白色小方磁磚長公寓（凱美牙醫、富居窗簾、
//     井 丼飯咖哩飯、大廳、金麗華銀樓、全家餐）→ 兩間 3 樓紅磚老屋（中華電信直招、木百葉）→ 熱線手機館 → M&W Hair Salon、
//     NOKIA 手機看板 → 拿坡里披薩 → 美達寵物／很便宜寵物店 → 米色鐵窗 4 樓 → 二手筆電專賣店 → 車道 → 招牌鵝肉飯 →
//     老夫妻手機館 → 手機現場維修 → 修竿3C數位通訊 → 溫州大餛飩 → 大勇一街 → 米炭火燒肉小酒館（黑鐵皮）→ 粥大福 → 食霸 →
//     中華電信 → 黑色窄樓 → 紅磚車庫樓 → 大來燈飾 → 拉門壁紙（到 s 725.7 為止）
//   範圍：西南側（+1）s 545.3～749（JV3C 主體在這段，Z2 做到 s 545.3；RAMA VII 到 s 749，弘揚路口對面），
//     東北側（-1）s 571.8～725.7（西接日新路 A 段小林眼鏡；s 725.7～743.4 的 swïter 詩威特、甜緣豆花甜作坊、康聯藥局圓角轉角樓
//     是 f2_685 那一棟，主體在弘揚路側，整棟歸 SegH1，這裡不蓋、也不 hide f2_685／f2_684）。
//   遊戲裡莒光路、大勇一街、大勇二街的位置與角度跟實景差幾公尺（大勇二街斜很多），轉角樓照遊戲的路切，才不會蓋到路上。
//   有店面牆的填充樓列在 hide（資料留著、不畫、碰撞收成一點），原本 noShop 的 f2_687、f2_686 drop。看不清的招牌不放字。
const R = 'Z',
  SW = 10.8, // 西南側（莒光路以西）立面離中心線
  SW2 = 10.0, // 西南側（莒光路以東）
  SE = 10.0; // 東北側
const NC = { col: false };
const W = (s0, s1, sp) => [R, s0, s1, 1, { set: s0 < 630 ? SW : SW2, d: 13, ...sp }];
const E = (s0, s1, sp) => [R, s0, s1, -1, { set: SE, d: 13, ...sp }];
// 開一個 Kit（見 SegX11）：k.W 格寬，k.sx(s) 沿線距離換區域 x
const seg = (C, side, s0, s1, set) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  return k;
};
const WT = '#e9e8e3', // 白色小方磁磚
  RB = '#a8604c', // 紅磚
  GT = '#c2bfb6', // 灰磁磚
  BG = '#e3d6b8'; // 米黃磁磚
// 斜面上的窗：沿 (x0,z0)→(x1,z1) 每層兩扇，法線 (nx,nz)
const slantWins = (C, k, x0, z0, x1, z1, nx, nz, gf, fh, nf) => {
  const rot = Math.atan2(nx, nz);
  for (let f = 1; f < nf; f++)
    for (const t of [0.3, 0.7])
      k.plane(
        C.YHT.win(),
        1.3,
        1.2,
        x0 + (x1 - x0) * t + nx * 0.06,
        gf + (f - 1) * fh + 1.5,
        z0 + (z1 - z0) * t + nz * 0.06,
        rot
      );
};
const sign = (C, k, text, bg, fg, w, h, x, y, z, rot, sub) =>
  k.plane(C.paint(text, bg, fg, sub || null, w, h), w, h, x, y, z, rot, { emissive: 0.3 });

export default {
  drop: ['f2_687', 'f2_686'],
  hide: [
    // 西南側
    'f1237',
    'f1238',
    'f1239',
    'f1240',
    'f1241',
    'f1242',
    'f1243',
    'f1244',
    'f1245',
    'f1246',
    'f1247',
    'f1248',
    'f1249',
    'f1250',
    'f1203',
    'f1204',
    // 東北側
    'f1765',
    'f1764',
    'f1763',
    'f1762',
    'f1761',
    'f1760',
    'f1759',
    'f1758',
    'f1757',
    'f1756',
    'f1755',
    'f1754',
    'f1737',
    'f1736',
    'f1735',
    'f1734',
    'f1733',
    'f1732',
    'f1731',
    'f2_688',
    'f2_713',
    'f2_693',
    'f2_692',
    'f2_691',
    'f2_690',
    'f2_689',
  ],
  // 自己掛了招牌的店（POI 不再另外掛；胖老爹的 POI 落在對面，改掛在全家餐那格）
  ownSign: [
    'JV3C手機配件',
    '全國電子',
    '胖老爹美式炸雞',
    '狗屋寵物美容館',
    '達美樂披薩',
    '金麗華銀樓珠寶',
    '木吉可樂器',
    '熱綫手機館',
    '台灣大哥大',
    '拿坡里披薩',
    '美達寵物精品',
    '唯酷3C配件',
    '一間通訊',
    '老夫妻手機館',
    '修竿3c數位通訊',
    '遠傳電信',
    '米炭火燒肉小酒館',
    '粥大福',
    '食霸重慶麻辣火鍋',
    '中華電信',
    '斯朵利美甲美學',
    'WEKII德國足弓墊',
    '大來燈飾',
    '日進藥局',
    'KYMCO 光陽機車',
    '炸雞的行家-半雞八兩',
  ],
  lots: [
    // ================= 西南側（+1）=================
    // JV3C 手機配件：3 樓灰色樓，二三樓整面手機大看板，頂樓鐵皮加蓋
    W(545.3, 557, {
      nf: 3,
      wall: '#9c9d9a',
      sign: ['JV3C 手機配件', '#1e1e20', '#f2f2f2'],
      big: ['', '#3c4a5c', '#ffffff'],
      vert: ['手機配件', '#1e1e20', '#ffffff'],
      roof: 'shack',
    }),
    W(557, 563.5, {
      nf: 3,
      wall: '#b3b0a8',
      sign: ['全國電子', '#d8282a', '#ffffff'],
      bal: 'grille',
    }),
    // 2026 年包著鷹架與鐵皮在整修
    W(563.5, 568.4, {
      nf: 3,
      wall: '#a9aaa6',
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      door: 0,
      tin: 1,
      bal: 'grille',
    }),
    // 宵夜便當：4 樓灰磁磚老樓、藍鐵捲門、黃色小直招
    W(568.4, 573, {
      nf: 4,
      wall: GT,
      ground: 'shutter',
      sh: '#2f6f9a',
      noband: 1,
      door: 0,
      vert: ['宵夜便當', '#f2d22a', '#222222'],
    }),
    // 狗屋寵物美容館：二樓白色大招牌，一樓寵物用品店（紫色布條）
    W(573, 578.2, {
      nf: 4,
      wall: '#b9a48e',
      sign: ['WDJ 頂級乾糧', '#6b4a96', '#ffffff'],
      sign2: ['狗屋寵物美容館', '#f6f6f2', '#2a2a6a'],
      bal: 'plain',
    }),
    // 二樓紅色「寵物店」招牌，一樓開著的五金倉庫
    W(578.2, 583.4, {
      nf: 4,
      wall: GT,
      ground: 'open',
      noband: 1,
      sign2: ['寵物店', '#d8282a', '#ffffff'],
      bal: 'grille',
      tin: 1,
    }),
    // Domino's 達美樂：黑色招牌、玻璃店面，掛直立骨牌招牌（custom）
    W(583.4, 588.6, {
      nf: 5,
      wall: '#cfcdc6',
      sign: ["Domino's", '#1e1e20', '#f4f4f4'],
      bal: 'cage',
      bikes: 3,
    }),
    // 5 樓磁磚公寓：樓上綠色遮雨棚、一樓鐵捲門
    W(588.6, 593.6, {
      nf: 5,
      wall: '#c8c4ba',
      ground: 'shutter',
      noband: 1,
      door: 0,
      hood: '#4f8a5a',
      bal: 'grille',
    }),
    // 4 樓鐵窗樓，一樓車庫
    W(593.6, 598.4, { nf: 4, wall: '#d8d6cf', ground: 'open', noband: 1, door: 0, bal: 'cage' }),
    // 育源堂中藥房：黃底黑字老招牌、整面鐵窗陽台（門牌 92）
    W(598.4, 603.5, {
      nf: 4,
      wall: '#dcdad3',
      sign: ['育源堂中藥房', '#e8c040', '#1a1a1a', null, 'frame'],
      ground: 'shutter',
      sh: '#b9bab8',
      bal: 'cage',
    }),
    // 木吉可樂樂器 中原店（Mugiker）
    W(603.5, 608.7, {
      nf: 4,
      wall: '#d2d0c9',
      sign: ['木吉可樂樂器 中原店', '#2a2a2a', '#f2f2f2'],
      sign2: ['Mugiker', '#3a3434', '#f4f4f4'],
      round: ['Mugiker', '#1e1e1e', '#ffffff'],
      bal: 'grille',
    }),
    // 紅茶巴士：紅白小店面，樓上紅磚鐵窗
    W(608.7, 612.9, {
      nf: 4,
      wall: RB,
      sign: ['紅茶巴士', '#f6f4f0', '#c8282a', '新新式紅茶冰｜杯杯新潮'],
      bal: 'grille',
    }),
    // 美新自助洗衣（門牌 98）
    W(612.9, 617.8, {
      nf: 4,
      wall: '#b5735e',
      sign: ['美新自助洗衣', '#f4f2ea', '#2a3f9a'],
      vert: ['美新自助洗衣', '#f2d43a', '#2a3f9a'],
      bal: 'grille',
    }),
    // 陽光飯糰（紅直招）＋台灣大哥大 myfone（莒光路口西角，5 樓米黃公寓）
    W(617.8, 621.6, {
      nf: 5,
      wall: BG,
      noband: 1,
      vert: ['陽光飯糰', '#c8282a', '#ffffff'],
      bal: 'grille',
    }),
    W(621.6, 627.5, {
      nf: 5,
      wall: BG,
      sign: ['台灣大哥大', '#f26a21', '#ffffff', 'myfone 中壢中山東加盟門市'],
      vert: ['台灣大哥大', '#f26a21', '#ffffff'],
      bal: 'open',
      door: 0,
    }),
    // ---- 莒光路以東 ----
    // 唯酷 3C配件專賣：4 樓紅磚轉角樓，二三樓手機保護貼大看板
    W(635.5, 641.5, {
      nf: 4,
      wall: '#b0705c',
      sign: ['唯酷 3C配件專賣', '#f07a3a', '#1a1a1a'],
      big: ['藍寶石 玻璃螢幕保護貼', '#2b3038', '#f4f4f4'],
      bigFrom: 2,
      vert: ['3C配件', '#d8402a', '#ffffff'],
      door: 0,
    }),
    // 御品 廣東粥·烏龍麵：4 樓灰色鐵窗公寓
    W(641.5, 646.5, {
      nf: 4,
      wall: '#b4b2ab',
      sign: ['御品 廣東粥·烏龍麵', '#f4f2ee', '#c8282a', '(03)456-9223'],
      bal: 'cage',
    }),
    W(646.5, 651, {
      nf: 5,
      wall: '#bcb8ae',
      ground: 'shutter',
      sh: '#3a5f9a',
      noband: 1,
      vert: ['商行五金', '#f4f4f2', '#2a4aa0'],
      bal: 'grille',
    }),
    W(651, 655.5, {
      nf: 5,
      wall: '#c9c6bd',
      sign: ['一間通訊', '#1e1e20', '#f2f2f2'],
      vert: ['一間通訊', '#1e1e20', '#ffffff'],
      bal: 'plain',
    }),
    W(655.5, 659.8, {
      nf: 4,
      wall: '#d9d4c8',
      noband: 1,
      vert: ['中古機買賣', '#f4f4f2', '#2a4aa0'],
      bal: 'grille',
    }),
    W(659.8, 664.5, {
      nf: 5,
      wall: '#b8b6b0',
      sign: ['手機現場維修 歡迎比價', '#f2d23a', '#c8282a'],
      banner: ['空壓殼/玻璃貼/充電線 一律100元', '#f2e07a', '#2a2aa0'],
      bal: 'cage',
    }),
    // 遠傳 FET：6 樓白色小方磁磚，轉角圓弧（custom），參考線在 s 670.9 轉折，切兩格
    W(664.5, 670.9, {
      nf: 6,
      wall: WT,
      sign: ['遠傳 FET', '#ffffff', '#d8282a', '中壢中原加盟門市'],
      bal: 'plain',
      d: 14,
    }),
    W(670.9, 680.4, {
      nf: 6,
      wall: WT,
      sign: ['遠傳 FET', '#ffffff', '#d8282a', '中壢中原加盟門市'],
      bal: 'plain',
      d: 14,
      door: 0,
    }),
    // s 690～698.5 斯朵利髮型圓柱轉角（custom），這格是它沿中山東路的另一半
    W(698.5, 702, {
      nf: 5,
      wall: '#efeeea',
      sign: ['洗髮 99 洗+剪 288 專業燙染 888', '#1e1e20', '#f4f4f4'],
      sign2: ['毛孔大掃除 749 深層順勢撥筋 749', '#7a4a9a', '#ffffff'],
      bal: 'plain',
      d: 11,
      door: 0,
    }),
    // WEKII 德國上健康足弓墊
    W(702, 708, {
      nf: 5,
      wall: '#d4d4cf',
      sign: ['WEKII', '#e8604a', '#3a2020', '德國上健康足弓墊'],
      vert: ['WEKII', '#e8604a', '#ffffff'],
      bal: 'plain',
    }),
    // 5 樓灰綠公寓，一排白色手機直招
    W(708, 714, {
      nf: 5,
      wall: '#b7bdb2',
      sign: ['手機維修', '#f4f4f2', '#d8282a'],
      vert: ['中古機買賣', '#f4f4f2', '#2a4aa0'],
      bal: 'grille',
    }),
    // 日進健保藥局：5 樓白磁磚、拱形鐵窗陽台
    W(714, 721, {
      nf: 5,
      wall: WT,
      sign: ['日進健保藥局', '#f2d23a', '#1a3a9a', '用藥諮詢服務 資深藥師主持'],
      vert: ['日進健保藥局', '#f2d23a', '#1a3a9a'],
      bal: 'arch',
    }),
    // KYMCO 光陽原廠授權 志佳車業行
    W(721, 727, {
      nf: 5,
      wall: WT,
      sign: ['KYMCO', '#f4f4f2', '#c8282a', '光陽原廠授權 志佳車業行'],
      ground: 'open',
      banner: ['換油 齒輪油', '#f2d23a', '#c8282a'],
      bal: 'cage',
      bikes: 4,
    }),
    // 冠美廣告社
    W(727, 734, {
      nf: 5,
      wall: '#e4e2dc',
      sign: ['招牌 冠美廣告社', '#1e2a3a', '#f4f4f4', '名片/菜單 DM 傳單'],
      vert: ['冠美廣告 招牌', '#3a2a5a', '#f2d23a'],
      bal: 'grille',
    }),
    // 半雞八兩：鐵捲門「每週一公休」
    W(734, 741, {
      nf: 5,
      wall: WT,
      sign: ['炸雞的行家 半雞八兩', '#f2e06a', '#c8282a', '美味分享 鮮嫩現炸'],
      vert: ['半雞八兩', '#f2d23a', '#c8282a'],
      ground: 'shutter',
      sh: '#6a4a3a',
      bal: 'rail',
    }),
    // RAMA VII：5 樓白磁磚、凸窗、寶瓶欄杆陽台，一樓紅色門
    W(741, 749, {
      nf: 5,
      wall: '#ecebe6',
      sign: ['RAMA VII', '#6a6c6e', '#f2f2f2'],
      bal: 'rail',
      bikes: 4,
    }),

    // ================= 東北側（-1）=================
    E(571.8, 575.6, {
      nf: 6,
      wall: GT,
      sign: ['健康按摩院', '#2f7a4a', '#ffffff'],
      vert: ['按摩', '#2f6a8a', '#ffffff'],
      bal: 'grille',
    }),
    // 7 樓白色小方磁磚長公寓（藍色腰帶線在 custom）
    E(575.6, 579.6, {
      nf: 7,
      wall: WT,
      sign: ['凱美牙醫診所', '#1f3f8a', '#ffffff'],
      vert: ['凱美牙醫', '#1e7a5a', '#ffffff'],
      bal: 'grille',
    }),
    E(579.6, 584.2, { nf: 7, wall: WT, sign: ['富居窗簾', '#d42a2a', '#ffffff'], bal: 'plain' }),
    E(584.2, 588.6, {
      nf: 7,
      wall: WT,
      sign: ['井 丼飯·咖哩飯專賣', '#f4f4f2', '#222222'],
      vert: ['衣美管家', '#2a62b0', '#ffffff'],
      bal: 'grille',
    }),
    E(588.6, 591.6, {
      nf: 7,
      wall: WT,
      ground: 'gate',
      noband: 1,
      vert: ['葉代書', '#f4f4f2', '#222222'],
      bal: 'plain',
    }),
    E(591.6, 596.4, {
      nf: 7,
      wall: WT,
      sign: ['銀樓', '#c8282a', '#ffffff'],
      vert: ['金麗華銀樓', '#f4f4f2', '#2a4a9a'],
      bal: 'grille',
    }),
    E(596.4, 600.6, { nf: 7, wall: WT, noband: 1, bal: 'plain' }),
    E(600.6, 605.1, {
      nf: 7,
      wall: WT,
      sign: ['全家餐 8塊雞', '#d8282a', '#ffffff', '4668860'],
      vert: ['胖老爹美式炸雞', '#c8282a', '#f2d23a'],
      bal: 'grille',
      roof: 'tank',
    }),
    // 兩間 3 樓紅磚老屋（綠色雨遮）
    E(605.1, 608.7, {
      nf: 3,
      wall: RB,
      awn: '#4f8a5a',
      noband: 1,
      vert: ['中華電信', '#1f5fae', '#ffffff'],
      bal: 'grille',
      roof: 'shack',
    }),
    E(608.7, 612.1, { nf: 3, wall: '#b06650', awn: '#4f8a5a', noband: 1, bal: 'plain' }),
    E(612.1, 616.3, {
      nf: 4,
      wall: '#a86e5e',
      sign: ['熱線手機館', '#f4f4f2', '#2a3f9a'],
      ground: 'shutter',
      sh: '#3a6a8a',
      vert: ['熱線手機館', '#2a4fa8', '#ffffff'],
      bal: 'grille',
      roof: 'shack',
    }),
    E(616.3, 620.4, {
      nf: 5,
      wall: WT,
      sign: ['M&W Hair Salon', '#d8343a', '#ffffff'],
      ground: 'open',
      bal: 'plain',
    }),
    E(620.4, 624.6, {
      nf: 5,
      wall: WT,
      sign: ['NOKIA MOTOROLA SAMSUNG', '#f4f4f2', '#1a3a8a'],
      big: ['', '#2a3550', '#ffffff'],
      bigFrom: 3,
      bal: 'plain',
    }),
    E(624.6, 628.4, {
      nf: 3,
      wall: '#8e8d88',
      sign: ['拿坡里 披薩·炸雞', '#f4f2ee', '#c8282a'],
      vert: ['拿坡里', '#c8282a', '#ffffff'],
      bal: 'plain',
    }),
    E(628.4, 635.5, {
      nf: 4,
      wall: '#c9c4b6',
      sign: ['很便宜寵物店', '#d8282a', '#ffffff'],
      awn: '#d8282a',
      big: ['美達寵物 ROYAL CANIN', '#efefec', '#c85a5a'],
      bigFrom: 2,
      bigW: 6,
      bal: 'plain',
    }),
    E(635.5, 640.5, { nf: 4, wall: '#ddd2bc', awn: '#3a6ab0', noband: 1, bal: 'cage' }),
    E(640.5, 645.5, {
      nf: 4,
      wall: '#cfcac0',
      sign: ['二手筆電專賣店', '#f2c23a', '#1a1a1a'],
      ground: 'shutter',
      sh: '#3a6ab0',
      big: ['售 普忠路農地 110～2300坪', '#f4d23a', '#c8282a'],
      bigFrom: 2,
      vert: ['中藥 金香', '#2a2a6a', '#f2d23a'],
    }),
    // s 645.5～649 車道（沒蓋）
    E(649, 654.5, {
      nf: 4,
      wall: '#8a9aae',
      sign: ['招牌鵝肉飯', '#2a4aa0', '#ffffff'],
      vert: ['招牌鵝肉飯', '#2a4aa0', '#ffffff'],
      bal: 'plain',
    }),
    E(654.5, 659.8, {
      nf: 4,
      wall: '#d6d2c8',
      sign: ['老夫妻手機館', '#f2d23a', '#1a3a8a'],
      vert: ['中原樂藥', '#f4f4f2', '#2a4aa0'],
      bal: 'grille',
    }),
    E(659.8, 664.6, {
      nf: 4,
      wall: '#ecebe6',
      sign: ['手機現場維修', '#2f9a5a', '#ffffff'],
      ground: 'shutter',
      bal: 'plain',
    }),
    // 修竿3C數位通訊：低矮老屋，樓頂鋼架上高高的黃色直招（custom）
    E(664.6, 670, {
      nf: 2,
      wall: '#c6c1b4',
      sign: ['修竿3C數位通訊', '#f2d23a', '#1a1a1a'],
      bal: 'plain',
      d: 12,
    }),
    // 溫州大餛飩（大勇一街口，遊戲裡的路斜過來，只能淺淺一格）
    E(670, 673.2, {
      nf: 2,
      wall: '#d9cfc0',
      sign: ['溫州大餛飩', '#e6a0b4', '#a01a3a'],
      awn: ['#d8282a', '#f4f4f2'],
      d: 6,
      door: 0,
    }),
    // ---- 大勇一街以東 ----
    // 米 燒肉小酒館：3 樓黑色鐵皮外牆
    E(680.6, 693, {
      nf: 3,
      wall: '#34363a',
      sign: ['米炭火燒肉小酒館', '#f4f4f2', '#2a2a2a'],
      round: ['米', '#f4f4f2', '#222222'],
      banner: ['本店營業至5月27日', '#1a1a1a', '#f2c23a'],
      bal: 'plain',
      roof: 'shack',
      door: 0,
    }),
    E(693, 697.6, {
      nf: 4,
      wall: RB,
      low: '#3f7a4a',
      sign: ['粥大福', '#2f6a3a', '#e8c860'],
      vert: ['粥大福', '#2f6a3a', '#f2e8c0'],
      bal: 'grille',
    }),
    E(697.6, 702.8, {
      nf: 3,
      wall: '#b0705e',
      sign: ['食霸 SHIGA 重慶麻辣火鍋', '#f0e2c0', '#a0281a'],
      ground: 'shutter',
      sh: '#3a5f9a',
      bal: 'plain',
    }),
    E(702.8, 707.6, {
      nf: 3,
      wall: '#e4e3de',
      sign: ['中華電信 Chunghwa Telecom', '#f4f4f2', '#1f5fae'],
      ground: 'shutter',
      vert: ['二手機回收買賣', '#d8282a', '#ffffff'],
      bal: 'plain',
      roof: 'shack',
    }),
    E(707.6, 709.2, {
      nf: 3,
      wall: '#2a2c30',
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    E(709.2, 714.5, {
      nf: 4,
      wall: RB,
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      hood: '#5f8a6a',
    }),
    E(714.5, 720, {
      nf: 3,
      wall: '#9aa89a',
      sign: ['全國批發特價優惠', '#d8282a', '#ffffff'],
      vert: ['大來燈飾', '#f2f2ee', '#222222'],
      bal: 'plain',
    }),
    // 拉門 壁紙 百葉：5 樓白樓（東北側做到 s 725.7，再過去 f2_685 那棟轉角樓整棟歸 SegH1）
    E(720, 725.7, {
      nf: 5,
      wall: '#ecebe6',
      sign: ['拉門 壁紙 百葉', '#2a4aa0', '#ffffff'],
      bal: 'grille',
    }),
  ],
  custom(C) {
    const { FRONT } = C;
    // ---- 西南側 ----
    // Domino's 的直立骨牌招牌（藍紅兩格白點）
    {
      const k = seg(C, 1, 583.4, 588.6, SW);
      k.box(0.3, 0.42, 4.6, 6.2, -1.0, 0.0, '#5a5c60', NC);
      for (const [y0, col] of [
        [4.8, '#d8202a'],
        [5.6, '#0b64a8'],
      ]) {
        k.box(0.2, 0.52, y0, y0 + 0.78, -1.1, -0.3, col, NC);
        for (const sd of [-1, 1]) {
          k.box(
            0.2 + (sd < 0 ? -0.02 : 0.32),
            0.22 + (sd < 0 ? -0.02 : 0.32) + 0.0,
            y0 + 0.3,
            y0 + 0.48,
            -0.8,
            -0.62,
            '#ffffff',
            NC
          );
        }
      }
    }
    // 台灣大哥大：莒光路那一面的橘色招牌
    {
      const k = seg(C, 1, 621.6, 627.5, SW);
      k.box(k.W, k.W + 0.25, 2.5, 3.3, 0.2, 9, '#f26a21', NC);
      sign(
        C,
        k,
        '台灣大哥大 myfone',
        '#f26a21',
        '#ffffff',
        8.6,
        0.75,
        k.W + 0.27,
        2.9,
        4.6,
        Math.PI / 2
      );
    }
    // 唯酷：莒光路那一面的手機保護貼大看板與橘招牌
    {
      const k = seg(C, 1, 635.5, 641.5, SW2);
      k.box(-0.25, 0, 2.5, 3.3, 0.2, 11, '#f07a3a', NC);
      sign(
        C,
        k,
        '唯酷 3C配件專賣',
        '#f07a3a',
        '#1a1a1a',
        10.6,
        0.75,
        -0.27,
        2.9,
        5.6,
        -Math.PI / 2
      );
      sign(C, k, '無懼刮傷 極度耐用', '#2b3038', '#f4f4f4', 9, 5.4, -0.04, 6.6, 6, -Math.PI / 2);
    }
    // 遠傳 FET 轉角：圓弧轉角＋沿大勇二街（遊戲裡斜的）那一面
    {
      const s0 = 680.4,
        k = seg(C, 1, s0, 686.5, SW2),
        gf = 3.3,
        fh = 3.0,
        nf = 6,
        top = gf + (nf - 1) * fh,
        d = 14,
        xm = (z) => 3.13 + 0.71 * z, // 大勇二街西緣（留 0.4 m）
        r = 2.6,
        cx = 3.13 - 0.516 * r;
      // 主體：往後一階一階跟著斜的路
      k.box(0, cx, 0, top, 0, r + 0.2, `wall${WT}`);
      for (let z = r; z < d; z += 1)
        k.box(0, Math.min(xm(z), 8), 0, top, z, Math.min(z + 1, d), `wall${WT}`);
      k.cyl(cx, r, r, 0, top, `wall${WT}`, { seg: 16, col: true });
      // 斜面外皮與窗
      const p0 = [cx + r * 0.816, r - r * 0.579],
        p1 = [xm(d) - 0.05, d];
      C.paintGeo(k.slab(p0[0], p0[1], p1[0], p1[1], 0.15, 0, top, C.WVC, NC), WT);
      slantWins(C, k, p0[0], p0[1], p1[0], p1[1], 0.816, -0.579, gf, fh, nf);
      // 圓弧上的樓層線與一樓紅白招牌
      for (let f = 1; f < nf; f++)
        k.cyl(cx, r, r + 0.08, gf + (f - 1) * fh - 0.1, gf + (f - 1) * fh + 0.05, '#d6d4ce', {
          seg: 16,
        });
      k.cyl(cx, r, r + 0.3, gf - 0.9, gf - 0.1, '#d8282a', { seg: 16 });
      sign(
        C,
        k,
        '遠傳',
        '#d8282a',
        '#ffffff',
        1.8,
        0.7,
        cx + r * 0.7 + 0.25,
        gf - 0.5,
        r - r * 0.7 - 0.25,
        (3 * Math.PI) / 4
      );
      // 樓層的帶狀窗
      for (let f = 1; f < nf; f++) C.win(k, cx / 2, gf + (f - 1) * fh + 1.5, cx - 0.4, 1.3, false);
      C.shopGlass(k, 0.1, cx, 0, gf - 1.0, C.ROWT.shop('zbFET', '#f6f2ee', '#c8282a', 377));
      // 紅色直立旗牌
      k.box(cx + 0.6, cx + 1.0, 0, 2.6, -0.6, -0.2, '#d8282a', NC);
    }
    // 斯朵利髮型：白色圓柱轉角樓（5 樓），一樓玻璃店面＋白柱騎樓，沿大勇二街（遊戲裡斜的）那一面一階一階退
    {
      const s0 = 690,
        k = seg(C, 1, s0, 698.5, SW2),
        w = k.W,
        gf = 3.6,
        fh = 3.0,
        nf = 5,
        top = gf + (nf - 1) * fh,
        d = 12,
        xs = (z) => 0.5 + 0.71 * z, // 大勇二街東緣（留 0.4 m）
        r = 2.4,
        cx = 0.5 + 0.71 * r + 1.226 * r;
      // 一樓往裡退 1.6 m 是騎樓
      k.box(cx, w, gf, top, 0, r + 0.2, '#efeeea');
      k.box(cx, w, 0, gf, 1.6, r + 0.2, '#efeeea');
      for (let z = r; z < d; z += 1) {
        const x0 = xs(Math.min(z + 1, d));
        if (x0 < w - 0.5) k.box(x0, w, 0, top, z, Math.min(z + 1, d), '#efeeea');
      }
      k.cyl(cx, r, r, 0, top, '#efeeea', { seg: 16, col: true });
      for (let f = 1; f < nf; f++) {
        k.cyl(cx, r, r + 0.06, gf + (f - 1) * fh - 0.1, gf + (f - 1) * fh + 0.05, '#cfcdc6', {
          seg: 16,
        });
        C.win(k, (cx + w) / 2, gf + (f - 1) * fh + 1.5, w - cx - 0.8, 1.3, false);
      }
      const p0 = [cx - r * 0.816, r + r * 0.579],
        p1 = [Math.min(xs(d), w - 0.3), Math.min(d, (w - 0.3 - 0.5) / 0.71)];
      C.paintGeo(k.slab(p0[0], p0[1], p1[0], p1[1], 0.15, 0, top, C.WVC, NC), '#efeeea');
      slantWins(C, k, p0[0], p0[1], p1[0], p1[1], -0.816, 0.579, gf, fh, nf);
      // 一樓玻璃店面（往裡退成騎樓）與白柱
      C.shopGlass(k, cx, w, 0, gf - 1.1, C.ROWT.shop('zbXDL', '#f4efe8', '#8a6a8a', 391), 1.57);
      for (const x of [cx, cx + 2.8, w - 0.3])
        k.box(x - 0.25, x + 0.25, 0, gf, -0.05, 0.45, '#f6f5f1');
      // 粉紅「斯朵利髮型」＋紫色 SPA 館招牌掛在圓柱上（斜 45 度兩面）
      for (const [t, bg, y] of [
        ['斯朵利髮型', '#e0508a', gf + 0.2],
        ['斯朵利美妍SPA館', '#7a4a9a', gf + 1.2],
      ])
        sign(
          C,
          k,
          t,
          bg,
          '#ffffff',
          3.4,
          0.8,
          cx - r * 0.72 - 0.2,
          y,
          r - r * 0.72 - 0.2,
          -(3 * Math.PI) / 4
        );
      sign(
        C,
        k,
        '專業燙染 888 熱塑燙·離子燙 988',
        '#1e1e20',
        '#f4f4f4',
        w - cx,
        0.8,
        (cx + w) / 2,
        gf - 0.45,
        -0.3,
        FRONT
      );
      sign(
        C,
        k,
        '手/足保養 299 單色美甲 299',
        '#3a8ac8',
        '#ffffff',
        w - cx,
        0.8,
        (cx + w) / 2,
        gf + 0.55,
        -0.1,
        FRONT
      );
      // 直立粉紅招牌
      k.plane(
        C.ROWT.vert('zb斯朵利髮型#e0508a', '#e0508a', '#ffffff', '斯朵利髮型'),
        0.7,
        3.2,
        cx + 0.3,
        gf + 3.4,
        -0.6,
        Math.PI / 2,
        { emissive: 0.3 }
      );
    }
    // ---- 東北側 ----
    // 7 樓白磁磚長公寓的藍色腰帶線
    {
      const k = seg(C, -1, 575.6, 605.1, SE);
      for (let f = 1; f < 7; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.box(0, k.W, y - 0.12, y + 0.06, -0.08, 0, '#5a7ab8', NC);
      }
    }
    // 參考線在 s 697.6 往右轉 16 度，粥大福與食霸之間外側立面會裂開一道楔形縫（前緣約 2.8 m、往後越寬），用紅磚牆一階一階補起來
    {
      const k = seg(C, -1, 693, 697.6, SE);
      for (let z = 0; z < 13; z += 1)
        k.box(-0.281 * (SE + z + 1) - 0.05, 0.05, 0, 9.3, z, z + 1, `wall${RB}`);
    }
    // 修竿通訊：樓頂鋼架上高高的黃色直招
    {
      const k = seg(C, -1, 664.6, 670, SE),
        y0 = 6.3;
      for (const x of [k.W - 1.2, k.W - 0.4])
        k.box(x, x + 0.1, y0, y0 + 7, 1.0, 1.1, '#5a5c60', NC);
      k.box(k.W - 1.3, k.W - 0.3, y0 + 1.5, y0 + 7.5, 0.6, 0.9, '#f2d23a', NC);
      k.plane(
        C.ROWT.vert('zb修竿通訊#f2d23a', '#f2d23a', '#1a1a1a', '修竿通訊'),
        0.95,
        5.8,
        k.W - 0.8,
        y0 + 4.5,
        0.58,
        FRONT,
        { emissive: 0.3 }
      );
      for (let x = 0.5; x < k.W - 1.4; x += 1.6)
        k.box(x, x + 0.08, y0, y0 + 3, 1.2, 1.28, '#6a6c70', NC);
    }
  },
  // 斯朵利、遠傳轉角 custom 佔的地
  footprints(F) {
    return [F(R, 680.4, 686.5, 1, SW2, 14, 3.7), F(R, 690, 698.5, 1, SW2, 12, 3.7)];
  },
};
