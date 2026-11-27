// 中山東路一段 s 0～330 兩側（西南端跨縱貫線的中原陸橋到中北路二段口；Google 街景 2026-05（s 280～304 只有 2025-04 使用者上傳相片球）、
// 國土測繪 2024 正射、Google 衛星）。s 0～199 是高架橋（cycu.json grade zhongshan_viaduct），橋本體與橋面不動，
// 這裡只蓋兩旁平面側車道外的街屋；高架段的街景是在橋面上拍的，一樓多半被護欄擋住，看不到的部分照正射與衛星推。
//   右手邊（+1，西南側）由頭到尾：鐵皮平房（樓頂「SAKURA 櫻花整體廚房」大看板）→ 縱貫線鐵路 → 紅磚 4 樓公寓兩排（中間 s≈49 窄巷，
//     南棟側牆「誠徵設計師」看板、樓頂破看板鐵架）→ 米橘色 4 樓（一樓粉紅牆）→ 力揚停車場 中山東站 → 綠色鐵皮倉庫 → 深綠鐵皮圍籬 →
//     白色斑駁 3 樓 → 白色拱窗寶瓶欄杆 3 樓 → s≈117 巷子 → 米白藍小磁磚 4 樓 → 紅磚菱形腰帶 4 樓 → 灰色洗石子老公寓兩棟 →
//     洗石子 2 樓（不敗麻將專賣店直立招牌）→ 洗石子 3 樓轉角樓 → s≈165 巷子 → 米白磁磚騎樓 → 灰色植栽陽台 → 好客 → 紅褐磁磚 3 樓 →
//     潮工房機車坐墊 → 機車行鐵皮棚 →（中北路二段路口：補習班轉角與舒適名床由 StreetZhongbei 做）→ 六六大舜腿庫飯 → 拉麵店 →
//     中北藥妝藥局（白色鏤空花磚立面）→ 拆除中的空地（殘屋、鏽鐵架）→ 黃網狀線巷口（後面 8 樓米色塔樓）→ NET 服飾大樓（一樓すき家，
//     樓頂一排廣告看板，轉角斜面對著中北路二段口廣場）
//   左手邊（-1，東北側）由頭到尾：2 樓米黃磁磚看板樓（樓頂「新識界」「感謝花蓮光復」兩面大看板）→ 縱貫線鐵路、樹叢 →
//     黃鐵皮平房 → 白色 2～3 樓 → 白磁磚 3 樓 → 三間紅木門 2 樓老屋 → 鐵捲門 2 樓 → 灰鐵皮平房 → 灰鐵皮 3 樓（綠雨遮）→
//     黃鐵皮 2 樓 → 水泥圍牆 → 米色 5 樓窄樓 → 灰鐵皮平房 → 灰白綠框窗老屋 →（新中北路兩側轉角由 SegX11 做）→
//     灰磁磚 4 樓（二樓木板封窗）→ 哈品咖啡 → 米灰磁磚 2 樓 → 灰水泥紅磚 4 樓 → 打鑰匙店 → 黑框大窗 4 樓 → 灰磁磚騎樓兩棟 →
//     有巢氏看板樓（專業鑰匙）→（中北路口兩個轉角由 StreetZhongbei 做）→ 大中華粥麵館 → 淘寶娃娃屋 → 哞噠啦 → 綠馬賽克陽台樓 →
//     阿亮魯肉飯 → 灰色老樓 → 85°C → 中原診所（新天地藥局）→ 滑龍粥 → 夏之戀泳裝 → 強尼登山用品 → 韓一館 → 鍋泰暖 GOITARZEN →
//     綠框窗 3 樓 → 白鐵窗 4 樓 → 深色 5 樓 → 聯安家醫眼科診所 → 公益彩券 → 白磁磚 4 樓 → 聯安家庭醫師科（到 s 330 接 SegZ2）
//   有店面牆的填充樓與 NET 的 OSM 建物不能 drop，列在 hide（資料留著、不畫、碰撞收成一點）；原本 noShop 的填充樓 drop。
//   看不清的招牌不放字（白鐵窗 4 樓的綠色長招牌、塔樓直立招牌、NET 樓頂大部分廣告…）。
const R = 'Z',
  SR1 = 8.6, // 右側橋下（s < 140）：側車道外緣約 7.2
  SR2 = 9.7, // 右側橋下（s 140～195）：側車道往外移到 7.6，外緣約 9.4
  SR3 = 9.6, // 右側平面段
  SL1 = 9.6, // 左側橋下
  SL3 = 9.8, // 左側平面段
  SN = 11; // NET 大樓前面是寬人行道
const NC = { col: false };
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（左側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z（寫法同 SegX11）
const seg = (C, side, s0, s1, set) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  k.zo = (off) => off - set;
  return k;
};
// 一格街屋：[ref, s0, s1, side, spec]
const Rt = (s0, s1, sp) => [R, s0, s1, 1, { set: SR3, ...sp }];
const Lt = (s0, s1, sp) => [R, s0, s1, -1, { set: SL3, ...sp }];
const RB = '#a8604c', // 紅磚
  RBT = '#a0644f', // 紅褐小方磁磚
  WT = '#ecebe6', // 白磁磚
  XS = '#9b9990', // 灰色洗石子
  GT = '#b5b2aa'; // 灰磁磚
// 不跟街道平行的單色厚板（Kit.slab 的頂點色版：沿 (x0,z0)-(x1,z1) 中線、厚 th；碰撞另外用 wallLine 加）
const slabV = (C, k, x0, z0, x1, z1, th, y0, y1, hex) => {
  const dx = x1 - x0,
    dz = z1 - z0,
    g = new C.THREE.BoxGeometry(Math.hypot(dx, dz), y1 - y0, th);
  g.rotateY(-Math.atan2(dz, dx));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 洗石子老公寓二樓頂的腰帶與菱形裝飾
const diaTex = (C) =>
  C.sg('z1Dia', 128, 32, (g) => {
    g.fillStyle = '#8f8d86';
    g.fillRect(0, 0, 128, 32);
    g.fillStyle = '#c9c7c0';
    for (const cx of [40, 88]) {
      g.beginPath();
      g.moveTo(cx - 22, 16);
      g.lineTo(cx, 4);
      g.lineTo(cx + 22, 16);
      g.lineTo(cx, 28);
      g.closePath();
      g.fill();
    }
  });
const diamonds = (C, k, x0, x1, y) => {
  k.box(x0, x1, y, y + 0.55, -0.12, 0, '#8f8d86', NC);
  const n = Math.max(1, Math.round((x1 - x0) / 3.6)),
    cw = (x1 - x0) / n;
  for (let i = 0; i < n; i++)
    k.plane(diaTex(C), cw - 0.2, 0.5, x0 + cw * (i + 0.5), y + 0.275, -0.13, C.FRONT);
};

export default {
  // 原本就 noShop 的填充樓：左側橋下 f2_715、f2_716、f2_718、f2_720～f2_723，左側 s 160～167 的 f1487
  drop: ['f2_723', 'f2_722', 'f2_721', 'f2_720', 'f2_718', 'f2_716', 'f2_715', 'f1487'],
  // 有店面牆的填充樓與 OSM 建物（NET w440611857：輪廓前緣斜著伸到人行道上、樓高也不對）
  hide: [
    'f2_724',
    'f2_719',
    'f2_717',
    'f1486',
    'f1512',
    'f1476',
    'f1475',
    'f1474',
    'f869',
    'f868',
    'f867',
    'f871',
    'f876',
    'f875',
    'f874',
    'f873',
    'f872',
    'f877',
    'f878',
    'f937',
    'w440611857',
  ],
  // 自己掛招牌的店（東東麵館、東洋電器行、全冠食品行、康是美是 POI 裡的舊店名，2025～2026 街景已經不是這些店，也不再另外掛）
  ownSign: [
    '85度C',
    '阿亮魯肉飯',
    '大中華粥麵館',
    '滑龍粥',
    '鍋泰暖',
    '韓一館',
    '夏之戀泳裝',
    '台灣彩券',
    'すき家',
    'NET',
    '東東麵館',
    '東洋電器行',
    '全冠食品行',
    '康是美',
  ],
  lots: [
    // ================= 右手邊（西南側）=================
    // 陸橋起點西南側：鐵皮平房，樓頂鐵架大看板（從橋上看得到）
    Rt(-3, 9, {
      set: 14.5,
      apron: 1,
      nf: 1,
      gf: 3.6,
      wall: '#d6d4cc',
      ground: 'shutter',
      noband: 1,
      door: 0,
      roof: 'bill',
      bill: ['SAKURA 櫻花整體廚房\n福州店 03-4379500', '#f4f4f2', '#d8282a', 9, 3.6],
      roofCol: '#c9c9c4',
      d: 10,
    }),
    // 縱貫線鐵路以東：紅磚 4 樓（後面沿鐵路一排老公寓）、紅褐小方磁磚 4 樓（白框鋁窗、頂樓灰綠鐵皮加蓋，側牆對著窄巷）
    Rt(28, 33.6, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: RB,
      ground: 'shutter',
      noband: 1,
      bal: 'grille',
      d: 14,
    }),
    Rt(33.6, 40.2, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: RBT,
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      roof: 'shack',
      d: 14,
    }),
    Rt(40.2, 46.8, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: RBT,
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      roof: 'shack',
      d: 14,
    }),
    // s≈49 窄巷東側：紅磚 4 樓（綠色雨遮、鐵窗陽台；側牆「誠徵設計師」看板與樓頂破看板鐵架在 custom）
    Rt(51.2, 57, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: RB,
      ground: 'shutter',
      noband: 1,
      bal: 'cage',
      hood: '#3f8a55',
      roof: 'tank',
      d: 14,
    }),
    Rt(57, 62, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: RB,
      ground: 'shutter',
      noband: 1,
      bal: 'grille',
      hood: '#3f8a55',
      d: 14,
    }),
    // 米橘色 4 樓公寓（一樓粉紅牆、鋁窗鐵窗），停車場西邊
    Rt(62, 68, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: '#e2b48c',
      low: '#e6bcc0',
      ground: 'shutter',
      sh: '#9a9a96',
      noband: 1,
      bal: 'grille',
      roof: 'shack',
      d: 14,
    }),
    // s 68～80：力揚停車場 中山東站（custom）
    // 綠色鐵皮倉庫（鐵捲門，挑高）
    Rt(80, 90, {
      set: SR1,
      apron: 1.2,
      nf: 2,
      gf: 3.8,
      fh: 3.2,
      wall: '#8fae9a',
      ground: 'shutter',
      sh: '#a9b2ad',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 16,
    }),
    // s 90～95：深綠鐵皮圍籬（custom）
    // 白色斑駁水泥 3 樓（腰帶線、黑色鐵窗，頂樓灰白鐵皮加蓋）
    Rt(95, 104, {
      set: SR1,
      apron: 1.2,
      nf: 3,
      wall: '#e0ddd4',
      ground: 'shutter',
      sh: '#8a8a86',
      noband: 1,
      door: 0,
      bal: 'grille',
      hood: '#b8a888',
      roof: 'shack',
      d: 12,
    }),
    // 白色 3 樓（拱形窗、白色寶瓶欄杆陽台、頂樓米色鐵皮加蓋，樓前小庭院）
    Rt(104, 114.8, {
      set: SR1,
      apron: 1.2,
      nf: 3,
      wall: '#efeee9',
      ground: 'gate',
      noband: 1,
      bal: 'arch',
      roof: 'shack',
      d: 12,
    }),
    // s≈117 巷子以東：米白／藍小方磁磚 4 樓（鏽蝕鐵窗）、紅磚 4 樓（整面鐵窗陽台、二樓灰色菱形腰帶）
    Rt(119.2, 125, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: '#d4d6d2',
      ground: 'shutter',
      noband: 1,
      bal: 'cage',
      roof: 'shack',
      d: 12,
    }),
    Rt(125, 131, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: RB,
      ground: 'shutter',
      noband: 1,
      bal: 'cage',
      d: 12,
    }),
    // 灰色洗石子老公寓（二樓腰帶菱形裝飾、白色鐵窗、三樓整面鐵窗陽台，頂樓鐵皮）
    Rt(131, 135.6, {
      set: SR1,
      apron: 1.2,
      nf: 4,
      wall: XS,
      ground: 'shutter',
      noband: 1,
      bal: 'grille',
      roof: 'shack',
      d: 12,
    }),
    Rt(135.6, 140.6, {
      set: SR1,
      apron: 1.2,
      nf: 3,
      wall: XS,
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'cage',
      d: 12,
    }),
    // 洗石子 2 樓（二樓頂兩組菱形、白鐵窗、一樓鐵捲門），西端直立招牌「不敗麻將專賣店」，後面 4～5 樓灰色舊樓
    Rt(140.6, 151.6, {
      set: SR2,
      apron: 0.6,
      nf: 2,
      wall: XS,
      ground: 'shutter',
      noband: 1,
      bal: 'grille',
      vert: ['不敗麻將專賣店', '#f2e2a8', '#c8202a'],
      d: 12,
    }),
    // 洗石子 3 樓轉角老樓（白鐵窗、一樓鐵捲門、側面鐵梯），東邊是 s≈165 的巷子
    Rt(151.6, 163.2, {
      set: SR2,
      apron: 0.6,
      nf: 3,
      wall: XS,
      ground: 'shutter',
      noband: 1,
      bal: 'grille',
      d: 12,
    }),
    // 巷子以東：米白小方磁磚騎樓（藍鐵捲門）→ 灰色老屋（二樓植栽陽台）→ 好客 → 紅褐磁磚 3 樓 → 潮工房機車坐墊 → 機車行鐵皮棚
    Rt(167, 172.4, {
      set: SR2,
      apron: 0.6,
      nf: 3,
      wall: '#e8e2d0',
      ground: 'shutter',
      sh: '#3f6f9a',
      noband: 1,
      bal: 'plain',
      d: 12,
    }),
    Rt(172.4, 177, {
      set: SR2,
      apron: 0.6,
      nf: 3,
      wall: '#9c9a92',
      ground: 'shutter',
      noband: 1,
      bal: 'open',
      d: 12,
    }),
    Rt(177, 180.6, {
      set: SR2,
      apron: 0.6,
      nf: 2,
      wall: '#e9e7e0',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      round: ['好客', '#f2ead2', '#2a5a2a'],
      roof: 'shack',
      d: 12,
    }),
    Rt(180.6, 185.6, {
      set: SR2,
      apron: 0.6,
      nf: 3,
      wall: '#c98a7a',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 12,
    }),
    Rt(185.6, 190.4, {
      set: SR2,
      apron: 0.6,
      nf: 4,
      wall: '#77766f',
      sign: ['潮工房機車坐墊', '#2f8a4a', '#ffffff', '(03)465-9176'],
      vert: ['機車座墊', '#2f8a4a', '#ffffff'],
      ground: 'open',
      bal: 'plain',
      d: 12,
    }),
    Rt(190.4, 194.4, {
      set: SR2,
      apron: 0.6,
      nf: 1,
      gf: 3.0,
      wall: '#cfcbbd',
      ground: 'open',
      noband: 1,
      door: 0,
      roofCol: '#9aa8a8',
      d: 4,
    }),
    // ---- 中北路二段口以東（平面）----
    // 六六大舜腿庫飯：2 樓白磁磚轉角，樓頂紅色「永聚廣告」看板（西邊是 StreetZhongbei 的舒適名床）
    Rt(228.4, 235.6, {
      nf: 2,
      wall: WT,
      sign: ['六六大舜 腿庫飯', '#f4f4f2', '#c8202a', 'BRAISED PORK LEG RICE'],
      vert: ['六六大舜', '#f4f4f2', '#c8202a'],
      ground: 'shop',
      bal: 'plain',
      roof: 'bill',
      bill: ['永聚廣告 0925611037', '#d42a1f', '#ffffff', 6, 1.6],
      d: 10,
    }),
    // 拉麵店：2 樓白色小方磁磚（一樓綠色鐵皮雨遮、二樓鐵網）；後面是 s≈266 巷子繞過來的車道，深度到那邊為止
    Rt(235.6, 242, {
      nf: 2,
      wall: WT,
      sign: ['ラーメン', '#c8202a', '#ffffff'],
      awn: '#3f7a55',
      ground: 'shop',
      bal: 'cage',
      d: 9.4,
    }),
    // 中北藥妝藥局：3 樓老樓，二三樓白色鏤空花磚＋綠框（在 custom）
    Rt(242, 252.6, {
      nf: 3,
      wall: '#e6e4dc',
      sign: ['中北藥妝藥局', '#1f3f7a', '#ffffff', 'CHUNG PEI PHARMACY'],
      vert: ['中北藥妝藥局', '#1f3f7a', '#ffffff'],
      ground: 'shutter',
      sh: '#d8d6ce',
      bal: 'plain',
      roof: 'shack',
      d: 6.4,
    }),
    // s 252.6～263.4 拆除中的空地、s≈266 巷口、NET 大樓與後面的塔樓都在 custom

    // ================= 左手邊（東北側）=================
    // 陸橋起點東北側：2 樓米黃磁磚樓（一樓鐵窗、塗鴉），樓頂兩面大看板
    Lt(6, 12, {
      set: 9,
      apron: 2,
      nf: 2,
      wall: '#dccb9e',
      ground: 'shutter',
      sh: '#8a8a86',
      noband: 1,
      door: 0,
      bal: 'grille',
      roof: 'bill',
      bill: ['新識界 THE NEXUS\n80-350坪 即刻進駐 03-4375757', '#2a3a8f', '#ffffff', 5.8, 3.4],
      d: 10,
    }),
    Lt(12, 18, {
      set: 9,
      apron: 2,
      nf: 2,
      wall: '#dccb9e',
      ground: 'shutter',
      sh: '#8a8a86',
      noband: 1,
      door: 0,
      bal: 'grille',
      roof: 'bill',
      bill: ['感謝 所有中壢人參加\n花蓮光復 鏟子超人及志工', '#1c1c1c', '#f2d23a', 5.8, 3.4],
      d: 10,
    }),
    // 鐵路與樹叢以東，橋下（平面側車道外）：黃鐵皮平房 → 白色 2～3 樓（鐵捲門、二樓陽台）→ 白磁磚 3 樓（大窗）
    Lt(60, 65, {
      set: SL1,
      apron: 1.4,
      nf: 1,
      wall: '#d8c27a',
      ground: 'shutter',
      noband: 1,
      door: 0,
      roofCol: '#d8c070',
      d: 9,
    }),
    Lt(65, 69.4, {
      set: SL1,
      apron: 1.4,
      nf: 3,
      wall: '#e2e0d8',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'open',
      d: 11,
    }),
    Lt(69.4, 72.6, {
      set: SL1,
      apron: 1.4,
      nf: 3,
      wall: '#efeee9',
      ground: 'shutter',
      sh: '#8f2a26',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 11,
    }),
    // 三間紅色木框玻璃門 2 樓老屋（二樓磚砌女兒牆、長滿植物）
    Lt(72.6, 76.2, {
      set: SL1,
      apron: 1.4,
      nf: 2,
      wall: '#e6e3db',
      ground: 'shutter',
      sh: '#8f2a26',
      noband: 1,
      door: 0,
      bal: 'open',
      d: 11,
    }),
    Lt(76.2, 79.8, {
      set: SL1,
      apron: 1.4,
      nf: 2,
      wall: '#e6e3db',
      ground: 'shutter',
      sh: '#8f2a26',
      noband: 1,
      door: 0,
      bal: 'open',
      d: 11,
    }),
    Lt(79.8, 83.4, {
      set: SL1,
      apron: 1.4,
      nf: 2,
      wall: '#e6e3db',
      ground: 'shutter',
      sh: '#8f2a26',
      noband: 1,
      door: 0,
      bal: 'open',
      d: 11,
    }),
    // 鐵捲門 2 樓 → 灰鐵皮平房（白鐵窗）→ 灰鐵皮外牆 3 樓（一樓米色磁磚、綠雨遮）
    Lt(83.4, 87, {
      set: SL1,
      apron: 1.4,
      nf: 2,
      wall: '#d6d3cb',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 11,
    }),
    Lt(87, 91, {
      set: SL1,
      apron: 1.4,
      nf: 1,
      wall: '#a9adb0',
      ground: 'shutter',
      noband: 1,
      door: 0,
      roofCol: '#9aa0a4',
      d: 8,
    }),
    Lt(91, 99, {
      set: SL1,
      apron: 1.4,
      nf: 3,
      wall: '#b4b8bb',
      low: '#d8c8a8',
      awn: '#3f7a55',
      ground: 'shutter',
      noband: 1,
      bal: 'grille',
      d: 13,
    }),
    // 黃色鐵皮 2 樓（紅磚女兒牆）→ 水泥矮牆＋鐵網（後面平房）→ 米色 5 樓窄樓（每層鐵欄陽台、冷氣）→ 灰鐵皮平房
    Lt(99, 103, {
      set: SL1,
      apron: 1.4,
      nf: 2,
      wall: '#d8c27a',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 10,
    }),
    Lt(103, 110.6, {
      set: SL1,
      apron: 1.4,
      nf: 1,
      gf: 2.6,
      wall: '#9c9a94',
      ground: 'gate',
      noband: 1,
      door: 0,
      roofCol: '#8d8b86',
      d: 8,
    }),
    Lt(110.6, 114.6, {
      set: SL1,
      apron: 1.4,
      nf: 5,
      wall: '#d6cbb4',
      ground: 'shutter',
      noband: 1,
      bal: 'cage',
      roof: 'shack',
      d: 13,
    }),
    Lt(114.6, 119.4, {
      set: SL1,
      apron: 1.4,
      nf: 1,
      wall: '#b9bdbf',
      ground: 'shutter',
      noband: 1,
      door: 0,
      roofCol: '#b0b4b6',
      d: 9,
    }),
    // 灰白水泥 2 樓老屋（綠色鐵框大窗、平頂），東邊接 SegX11 的新中北路 1 號
    Lt(119.4, 124.2, {
      set: SL1,
      apron: 1.4,
      nf: 2,
      wall: '#cfccc4',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      hood: '#3f7a55',
      d: 9,
    }),
    // ---- 新中北路口以東（s 124～160 由 SegX11 做）----
    // 灰磁磚 4 樓（三樓黑框大窗、二樓木板封窗，一樓掛紅燈籠）
    Lt(159.8, 164.2, {
      set: SL1,
      apron: 0.7,
      nf: 4,
      wall: '#9a9a96',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 14,
    }),
    // 哈品咖啡：3 樓，綠色橫招牌、直立招牌「哈品烘焙咖啡有限公司」
    Lt(164.2, 169.4, {
      set: SL1,
      apron: 0.7,
      nf: 3,
      wall: '#a8a8a2',
      sign: ['哈品咖啡', '#c8d84a', '#2a3a2a', '436-2086'],
      sign2: ['品咖啡 品生活 盡在哈品咖啡', '#c8d84a', '#2a3a2a'],
      vert: ['哈品烘焙咖啡有限公司', '#c8d84a', '#2a3a2a'],
      ground: 'shop',
      bal: 'plain',
      d: 14,
    }),
    Lt(169.4, 173, {
      set: SL1,
      apron: 0.7,
      nf: 2,
      wall: '#c9c2b4',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 12,
    }),
    Lt(173, 178, {
      set: SL1,
      apron: 0.7,
      nf: 4,
      wall: '#a5a29b',
      hood: RB,
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 14,
    }),
    // 打鑰匙店：3 樓灰磁磚、白框格子窗，一樓黃色招牌（鑰匙、遙控器圖）
    Lt(178, 183, {
      set: SL1,
      apron: 0.7,
      nf: 3,
      wall: '#b8b5ae',
      sign: ['(03)466-5796  (03)456-9674', '#e8d24a', '#2a2a2a'],
      ground: 'open',
      bal: 'grille',
      d: 14,
    }),
    Lt(183, 188, {
      set: SL1,
      apron: 0.7,
      nf: 4,
      wall: '#bdb9b0',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 14,
    }),
    Lt(188, 192.4, {
      set: SL1,
      apron: 0.7,
      nf: 3,
      wall: '#a9a59d',
      ground: 'shutter',
      awn: '#e8e8e4',
      noband: 1,
      bal: 'plain',
      d: 14,
    }),
    Lt(192.4, 196.6, {
      set: SL1,
      apron: 0.7,
      nf: 4,
      wall: GT,
      ground: 'shutter',
      awn: '#f0f0ee',
      noband: 1,
      bal: 'plain',
      d: 14,
    }),
    // 有巢氏看板樓：二樓大面玻璃（貼 X 膠帶、空置），三樓整面看板（在 custom），東端直立招牌「專業鑰匙」
    Lt(196.6, 202.8, {
      set: SL1,
      apron: 0.7,
      nf: 3,
      wall: '#cfc9bd',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      vert: ['專業鑰匙', '#f2f0ea', '#2a2a8a'],
      d: 14,
    }),
    // ---- 中北路口以東（平面）----
    // 大中華粥麵館：夾在 StreetZhongbei 轉角樓（韓式炸雞、酉客棧）斜背牆前面的窄樓
    Lt(239.6, 243.4, {
      nf: 4,
      wall: '#d8d6d0',
      sign: ['大中華 粥麵館', '#f4f4f2', '#2a2a2a'],
      ground: 'shop',
      bal: 'grille',
      d: 3.6,
    }),
    // 淘寶娃娃屋（平價燒肉 99 布條）：5 樓白磁磚，三樓以上整面白鐵窗
    Lt(243.4, 248.8, {
      nf: 5,
      wall: WT,
      sign: ['淘寶 娃娃屋', '#e84a9a', '#ffffff'],
      banner: ['平價燒肉 99', '#3a5ab0', '#ffffff'],
      ground: 'open',
      bal: 'cage',
      d: 13.8,
    }),
    Lt(248.8, 252.4, {
      nf: 4,
      wall: '#9a9690',
      sign: ['哞噠啦', '#1f1f1f', '#f2e6c8', '手工小籠包'],
      ground: 'shop',
      bal: 'grille',
      d: 15,
    }),
    // 4 樓老樓：陽台綠色馬賽克圓弧欄、黑色門框鐵捲門
    Lt(252.4, 257.4, {
      nf: 4,
      wall: '#c8c6be',
      ground: 'shutter',
      sh: '#5a5a5a',
      noband: 1,
      bal: 'open',
      hood: '#5f9a86',
      d: 15,
    }),
    Lt(257.4, 262.4, {
      nf: 5,
      wall: '#c4c2bb',
      sign: ['阿亮魯肉飯', '#f4f4f2', '#2a2a2a', '4563268'],
      vert: ['阿亮魯肉飯', '#f4f4f2', '#2a2a2a'],
      ground: 'shop',
      bal: 'plain',
      d: 15,
    }),
    Lt(262.4, 266, {
      nf: 4,
      wall: '#a9a7a0',
      ground: 'shutter',
      noband: 1,
      bal: 'plain',
      d: 15,
    }),
    Lt(266, 270, {
      nf: 4,
      wall: '#bdbab2',
      sign: ['85°C', '#d8282a', '#ffffff'],
      round: ['85°C', '#d8282a', '#ffffff'],
      ground: 'shop',
      bal: 'plain',
      d: 15,
    }),
    // 中原診所（綠色鐵捲門），樓上黃色直立招牌「新天地藥局」
    Lt(270, 273.8, {
      nf: 4,
      wall: '#c8c6c0',
      sign: ['中原診所', '#2a5ab0', '#ffffff', '03-456-9788'],
      vert: ['新天地藥局', '#f2d23a', '#2a2a2a'],
      ground: 'shutter',
      sh: '#3f7a55',
      bal: 'grille',
      d: 15,
    }),
    Lt(273.8, 277.6, {
      nf: 4,
      wall: GT,
      sign: ['滑龍粥', '#1f1f1f', '#ffffff'],
      vert: ['滑龍粥', '#1f1f1f', '#f2d23a'],
      ground: 'shop',
      bal: 'grille',
      d: 15,
    }),
    Lt(277.6, 281.2, {
      nf: 4,
      wall: '#c9c6be',
      sign: ['夏之戀泳裝', '#2a4ab0', '#ffffff'],
      vert: ['夏之戀泳裝', '#2a4ab0', '#ffffff'],
      ground: 'shop',
      bal: 'plain',
      d: 15,
    }),
    Lt(281.2, 285, {
      nf: 3,
      wall: '#bdb9b0',
      sign: ['強尼 登山·旅遊·戶外用品', '#f2c830', '#c8202a'],
      vert: ['強尼 戶外用品', '#f2c830', '#c8202a'],
      ground: 'shop',
      bal: 'plain',
      d: 15,
    }),
    Lt(285, 289.4, {
      nf: 3,
      wall: '#e4e2dc',
      sign: ['韓一館 韓國料理', '#f4f4f2', '#2a2a2a'],
      vert: ['韓一館', '#f2d23a', '#2a2a2a'],
      ground: 'shop',
      bal: 'plain',
      d: 15,
    }),
    // 鍋泰暖 GOITARZEN 泰式風味鍋物：二三樓整面藍綠色大招牌
    Lt(289.4, 294.6, {
      nf: 3,
      wall: '#e8e8e4',
      sign: ['鍋泰暖 GOITARZEN', '#1f8a8a', '#ffffff', '泰式風味鍋物'],
      big: ['GOITARZEN\n泰式風味鍋物', '#1f5f9a', '#f2c830'],
      vert: ['鍋泰暖', '#2f8a5a', '#ffffff'],
      ground: 'shop',
      d: 15,
    }),
    // 綠框窗 3 樓老樓（綠色雨遮、鐵捲門）→ 白鐵窗 4 樓（綠色長招牌看不清）→ 深色 5 樓（每層鐵窗陽台、一排冷氣、紅色雨遮）
    Lt(294.6, 299.4, {
      nf: 3,
      wall: '#e6e4dc',
      ground: 'shutter',
      awn: '#3f8a55',
      noband: 1,
      bal: 'grille',
      hood: '#3f8a55',
      d: 15,
    }),
    Lt(299.4, 304.2, {
      nf: 4,
      wall: '#e4e2da',
      ground: 'shutter',
      noband: 1,
      bal: 'cage',
      awn: '#c8a060',
      d: 15,
    }),
    Lt(304.2, 308.8, {
      nf: 5,
      wall: '#7f7a72',
      ground: 'shop',
      awn: '#b04a3a',
      noband: 1,
      bal: 'cage',
      d: 15,
    }),
    // 聯安家醫眼科診所：二樓以上整面深藍紫大招牌
    Lt(308.8, 313.8, {
      nf: 4,
      wall: '#c9c6be',
      big: ['聯安 家醫眼科診所\n眼科·神經·美型·健檢\n免開刀免雷射度數矯正', '#2a2a6a', '#ffffff'],
      ground: 'shutter',
      awn: '#e8e8e4',
      noband: 1,
      d: 15,
    }),
    // 公益彩券：4 樓紅磚、整面鐵窗
    Lt(313.8, 318.6, {
      nf: 4,
      wall: RB,
      sign: ['公益彩券  台灣彩券', '#f2d23a', '#c8202a'],
      ground: 'open',
      bal: 'cage',
      d: 15,
    }),
    Lt(318.6, 324.2, {
      nf: 4,
      wall: '#e2e1dc',
      ground: 'shutter',
      noband: 1,
      bal: 'cage',
      d: 15,
    }),
    // 聯安家醫眼科診所 家庭醫師科：深灰鐵皮立面（白字），一樓玻璃門
    Lt(324.2, 330, {
      nf: 3,
      wall: '#5f6468',
      big: ['聯安家醫眼科診所\n家庭醫師科', '#4f5458', '#ffffff'],
      ground: 'shop',
      noband: 1,
      d: 15,
    }),
  ],

  custom(C) {
    const { FRONT, paint, lcg, sg } = C;
    // ---- 右手邊 ----
    // 窄巷東側紅磚樓：側牆對著巷子的「誠徵設計師」看板、樓頂破損的看板鐵架
    {
      const k = seg(C, 1, 51.2, 57, SR1),
        top = 3.3 + 3 * 3.0;
      k.plane(
        paint('誠徵 設計師.技術師', '#f4f4f2', '#c8202a', '03-409-2109', 3.4, 2.2),
        3.4,
        2.2,
        -0.06,
        top - 2.2,
        3.5,
        -Math.PI / 2,
        { emissive: 0.1 }
      );
      for (const x of [0.6, 4.4]) k.box(x, x + 0.1, top, top + 4.2, 0.6, 0.7, '#5a5d60', NC);
      k.box(0.5, 4.6, top + 4.1, top + 4.2, 0.6, 0.7, '#5a5d60', NC);
      k.box(0.6, 2.4, top + 2.2, top + 4.0, 0.72, 0.76, '#b8b8b2', NC); // 破掉剩一角的看板布
    }
    // 力揚停車場 中山東站（s 68～80）：柏油地、紅色收費亭、黃色繳費機、藍色 P 字立牌、紅色價目牌，停幾台車
    {
      const k = seg(C, 1, 68, 80, SR1),
        w = k.W;
      C.pave(k, 0, w, -0.5, 0.03, -1.2, 16, '#5c5c5a');
      k.box(4.6, 6.0, 0, 2.3, 5.2, 6.6, '#c8302a');
      k.box(4.4, 6.2, 2.3, 2.45, 5.0, 6.8, '#e8e8e4', NC);
      k.box(7.2, 7.8, 0, 1.6, 0.3, 0.8, '#e8c22a');
      k.cyl(1.8, -0.6, 0.08, 0, 4.6, '#8a8d90', { seg: 6 });
      k.box(1.3, 2.3, 3.4, 4.6, -0.75, -0.45, '#2f4a8a', NC);
      for (const sd of [-1, 1])
        k.plane(
          paint('P', '#2f4a8a', '#ffffff', null, 0.9, 1.1),
          0.9,
          1.1,
          1.8,
          4.0,
          -0.6 + sd * 0.16,
          sd > 0 ? 0 : Math.PI,
          { emissive: 0.3 }
        );
      k.box(0.3, 0.4, 0, 1.2, -0.9, -0.8, '#5a5d60', NC);
      k.box(0.2, 1.4, 1.2, 2.6, -0.95, -0.85, '#c8202a', NC);
      k.plane(
        paint('力揚停車場\n30元/H\n當日最高100元', '#c8202a', '#ffffff', '中山東站', 1.2, 1.4),
        1.2,
        1.4,
        0.8,
        1.9,
        -0.96,
        FRONT,
        { emissive: 0.15 }
      );
      k.car(3.2, 10, Math.PI / 2, '#c9c9c4');
      k.car(6.4, 10.5, Math.PI / 2, '#2a2a30');
      k.car(9.6, 10, Math.PI / 2, '#b8bcc0');
    }
    // 深綠鐵皮圍籬（s 90～95）
    {
      const k = seg(C, 1, 90, 95, SR1),
        w = k.W;
      k.box(0, w, 0, 2.6, -0.02, 0.06, '#2f5a44');
      for (let x = 0.2; x < w; x += 0.6) k.box(x, x + 0.05, 0, 2.6, -0.05, -0.02, '#284e3a', NC);
    }
    // 洗石子老公寓的菱形腰帶
    for (const [s0, s1, set, y] of [
      [125, 131, SR1, 5.95],
      [131, 135.6, SR1, 5.95],
      [135.6, 140.6, SR1, 5.95],
      [140.6, 151.6, SR2, 5.75],
      [151.6, 163.2, SR2, 5.95],
    ]) {
      const k = seg(C, 1, s0, s1, set);
      diamonds(C, k, 0.1, k.W - 0.1, y);
    }
    // 不敗麻將那棟 2 樓後面的 5 樓灰色舊樓（從橋上看得到上半截）
    {
      const k = seg(C, 1, 140.6, 151.6, SR2),
        w = k.W;
      k.box(0.4, w - 0.4, 0, 15.3, 6, 12, '#a5a39b');
      for (let f = 2; f < 5; f++)
        for (const x of [2.2, w / 2, w - 2.2])
          k.plane(C.YHT.win(), 1.6, 1.2, x, 3.3 + (f - 1) * 3 + 1.4, 5.97, FRONT);
      k.box(1.5, 5, 15.3, 17.3, 8, 11, '#b9b6ae', NC); // 頂樓加蓋
    }
    // 中北藥妝藥局：二三樓白色鏤空花磚＋綠色框
    {
      const k = seg(C, 1, 242, 252.6, SR3),
        w = k.W;
      const lat = sg('z1Lattice', 128, 128, (g) => {
        g.fillStyle = '#e6e6e0';
        g.fillRect(0, 0, 128, 128);
        g.fillStyle = '#5c625e';
        for (let y = 0; y < 128; y += 16)
          for (let x = 0; x < 128; x += 16) {
            g.beginPath();
            g.arc(x + 8, y + 8, 4.5, 0, 7);
            g.fill();
          }
      });
      for (const [a, b] of [
        [0.3, w / 2 - 0.15],
        [w / 2 + 0.15, w - 0.3],
      ])
        k.plane(lat, b - a, 5.4, (a + b) / 2, 6.3, -0.08, FRONT);
      for (const x of [0.15, w / 2 - 0.15, w - 0.45])
        k.box(x, x + 0.3, 3.3, 9.3, -0.16, 0, '#3f7a55', NC);
      for (const y of [3.4, 6.2, 9.1]) k.box(0.15, w - 0.15, y, y + 0.2, -0.16, 0, '#3f7a55', NC);
    }
    // 拆除中的空地（s 252.6～263.4）：藥局旁剩一截 2 樓殘屋（上面鐵皮棚）、鏽鐵拱架、瓦礫堆、「出租」紅字牌
    {
      const k = seg(C, 1, 252.6, 263.4, SR3),
        w = k.W;
      k.box(0.1, 4.0, 0, 6.2, 0.4, 3.4, '#bdb8ac');
      k.box(0.6, 3.6, 3.6, 5.6, 0.38, 0.4, '#3a3632', NC); // 拆掉牆的二樓開口
      k.box(0, 4.3, 6.2, 6.32, 0.2, 3.6, '#8a8a86', NC);
      k.plane(paint('出租', '#f4f4f2', '#c8202a', null, 1.2, 0.8), 1.2, 0.8, 2.0, 1.6, 0.37, FRONT);
      for (const x of [4.8, 7.6, 10.4]) k.box(x, x + 0.14, 0, 4.6, 0.2, 0.34, '#7a4a32', NC);
      k.box(4.8, 10.54, 4.4, 4.6, 0.2, 0.34, '#7a4a32', NC);
      for (const x of [4.8, 10.4]) k.box(x, x + 0.14, 0, 4.0, 2.6, 2.74, '#7a4a32', NC);
      k.box(4.8, 10.54, 3.8, 4.0, 0.2, 2.74, '#7a4a32', NC);
      const r = lcg(11253);
      for (let i = 0; i < 7; i++) {
        const x = 4.4 + r() * 5.6,
          z = 0.4 + r() * 2.2,
          s = 0.4 + r() * 0.6;
        k.box(x, x + s, 0, 0.2 + r() * 0.4, z, z + s * 0.8, r() < 0.5 ? '#8a7f72' : '#a89c8a', NC);
      }
      k.box(0, w, 0, 0.5, -0.05, 0.05, '#4a6a9a', NC); // 前緣藍色矮擋板
    }
    // 黃網狀線巷子後面的 8 樓米色塔樓（綠色窗、八角形塔頂）
    {
      const k = seg(C, 1, 257, 267, SR3),
        w = k.W,
        z0 = 30.4 - SR3,
        h = 3.6 + 7 * 3.1;
      k.box(0, w, 0, h, z0, z0 + 12, '#d9ccb2');
      for (let f = 1; f < 8; f++)
        for (let x = 1.2; x < w - 1; x += 2.6)
          k.plane(C.YHT.win(), 1.6, 1.5, x + 0.8, 3.6 + (f - 1) * 3.1 + 1.5, z0 - 0.03, FRONT);
      k.box(0.3, w - 0.3, 0, 3.2, z0 - 0.04, z0, '#7f9a8c', NC);
      k.cyl(w / 2, z0 + 3.5, 3.6, h, h + 3.2, '#d9ccb2', { seg: 8 });
      k.cyl(w / 2, z0 + 3.5, 3.9, h + 3.2, h + 3.5, '#6f8a7c', { seg: 8, r1: 1.2 });
    }
    // NET 服飾大樓（s 273～301）：一樓服飾店與すき家、二到四樓白框玻璃櫥窗、五樓黑色帶狀外牆、樓頂一整排廣告看板；
    // 東端轉角是一面斜著對著中北路二段口廣場的黑白直條外牆（大「NET」字、一樓すき家）
    {
      const k = seg(C, 1, 273, 301, SN),
        w = k.W,
        H = 21;
      const cloth = sg('z1Cloth', 256, 128, (g) => {
        g.fillStyle = '#3a4048';
        g.fillRect(0, 0, 256, 128);
        g.fillStyle = 'rgba(255,255,255,.12)';
        g.fillRect(0, 0, 256, 20);
        const r = lcg(273);
        for (let x = 6; x < 250; x += 14) {
          g.fillStyle = ['#d8d8d4', '#8aa0c0', '#2a2a30', '#c8a888', '#e8e0d0', '#6a7a8a'][
            (r() * 6) | 0
          ];
          g.fillRect(x, 36 + r() * 8, 10, 48 + r() * 20);
        }
        g.fillStyle = '#9a9a98';
        g.fillRect(0, 30, 256, 3);
      });
      k.box(0, w, 0, H, 0, 30, '#e8e7e2');
      C.pave(k, -0.2, w + 4, -0.5, 0.06, -4.5, 0, C.MR.concrete); // 店前寬人行道
      // 一樓：西段服飾店玻璃、中段 NET 店面、東段すき家（紅磚柱、紅黃招牌）
      C.shopGlass(k, 0.3, 7.6, 0, 3.6, C.openTex);
      C.shopGlass(k, 7.9, 19.2, 0, 3.6, C.openTex);
      C.shopGlass(k, 19.8, w - 0.4, 0, 3.6, C.openTex);
      for (const x of [19.4, w - 0.4]) k.box(x, x + 0.4, 0, 3.7, -0.12, 0, '#9a4a3a', NC);
      k.box(0, 19.4, 3.7, 4.4, -0.6, 0, '#2a2a2c', NC);
      k.plane(
        paint('NET', '#2a2a2c', '#ffffff', null, 2.4, 0.6),
        2.4,
        0.6,
        13.5,
        4.05,
        -0.61,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      k.box(19.4, w, 3.7, 4.5, -0.3, 0, '#c8202a', NC);
      k.plane(
        paint('牛丼　すき家 SUKIYA　咖哩　OPEN 24', '#c8202a', '#ffffff', null, w - 19.6, 0.7),
        w - 19.6,
        0.7,
        (19.4 + w) / 2,
        4.1,
        -0.31,
        FRONT,
        { emissive: 0.35 }
      );
      // 二到四樓：白框玻璃櫥窗
      const cols = [0, 9.3, 18.6, w - 0.5];
      for (let f = 0; f < 3; f++) {
        const y = 4.5 + f * 4;
        for (let i = 0; i < cols.length - 1; i++)
          k.plane(
            cloth,
            cols[i + 1] - cols[i] - 0.6,
            3.2,
            (cols[i] + cols[i + 1] + 0.5) / 2,
            y + 2,
            -0.05,
            FRONT
          );
        k.box(0, w, y + 3.6, y + 4, -0.25, 0, '#f2f2ee', NC);
      }
      for (const x of cols) k.box(x, x + 0.5, 4.4, 16.5, -0.25, 0, '#f2f2ee', NC);
      // 五樓：黑色帶狀外牆、白字 NET、一排窄窗
      k.box(0, w, 16.5, H, -0.08, 0, '#2c2c2e', NC);
      for (let x = 0.8; x < w - 1; x += 1.8)
        k.box(x, x + 1.2, 17.0, 18.0, -0.1, -0.08, '#46505a', NC);
      k.plane(
        paint('NET', '#2c2c2e', '#ffffff', null, 4.2, 1.5),
        4.2,
        1.5,
        w / 2,
        19.4,
        -0.1,
        FRONT,
        {
          emissive: 0.4,
        }
      );
      // 樓頂兩排廣告看板（看得清的才寫字）
      const ads = [
        ['', '#f2d23a', '#2a2a2a'],
        ['', '#e8e4da', '#2a2a2a'],
        ['柏維新世界', '#2a5ab0', '#ffffff'],
        ['', '#3a3a8a', '#ffffff'],
        ['', '#f2c830', '#2a2a2a'],
        ['', '#d8282a', '#ffffff'],
        ['', '#e8e4da', '#2a2a2a'],
        ['暢滋牛排', '#c8202a', '#ffffff'],
        ['潮乃藥', '#1f3f7a', '#ffffff'],
        ['', '#2a2a2a', '#f2d23a'],
      ];
      const aw = (w - 1) / 5;
      ads.forEach(([t, bg, fg], i) => {
        const x = 0.5 + (i % 5) * aw,
          y = H + 0.3 + (i < 5 ? 2.9 : 0);
        k.plane(
          paint(t || ' ', bg, fg, null, aw - 0.15, 2.7),
          aw - 0.15,
          2.7,
          x + aw / 2,
          y + 1.35,
          0.8,
          FRONT,
          {
            emissive: 0.3,
            double: true,
          }
        );
      });
      k.box(0.4, w - 0.4, H, H + 6.1, 0.9, 1.1, '#3a3d40', NC);
      // 轉角斜面：從前緣東端（s 301、離中心線 11）斜到 s≈311、離中心線 27，厚 8.6 的斜板把三角形填滿
      const A = [w, 0],
        B = [w + 10, 16],
        L = Math.hypot(B[0] - A[0], B[1] - A[1]),
        tx = (B[0] - A[0]) / L,
        tz = (B[1] - A[1]) / L,
        nx = tz,
        nz = -tx, // 朝外（廣場）
        th = 8.6,
        P = (t, off = 0) => [A[0] + tx * t + nx * off, A[1] + tz * t + nz * off],
        rot = Math.atan2(nx, nz);
      const [a0x, a0z] = P(0, -th / 2),
        [a1x, a1z] = P(L, -th / 2);
      slabV(C, k, a0x, a0z, a1x, a1z, th, 0, H, '#2a2a2c');
      k.wallLine(A[0], A[1], B[0], B[1], 0, H);
      k.box(w - 0.5, B[0], 0, H, B[1] - 0.3, 30, '#2a2a2c');
      // 黑白直條、大「NET」、一樓すき家與玻璃店面
      for (let t = 4.6; t < L - 1; t += 2.6) {
        const [px, pz] = P(t, 0.04);
        slabV(
          C,
          k,
          px - tx * 0.6,
          pz - tz * 0.6,
          px + tx * 0.6,
          pz + tz * 0.6,
          0.06,
          4.6,
          H,
          '#efefec'
        );
      }
      {
        const [px, pz] = P(2.6, 0.1);
        k.plane(paint('NET', '#1f1f21', '#ffffff', null, 4.4, 2.2), 4.4, 2.2, px, 11.5, pz, rot, {
          emissive: 0.4,
        });
      }
      {
        const [px, pz] = P(3.2, 0.1);
        k.plane(
          paint('牛丼　すき家　咖哩　24', '#c8202a', '#ffffff', null, 5.6, 0.7),
          5.6,
          0.7,
          px,
          4.1,
          pz,
          rot,
          { emissive: 0.35 }
        );
        const [gx, gz] = P(3.2, 0.06);
        k.plane(C.openTex, 5.4, 3.2, gx, 1.6, gz, rot, { emissive: 0.2 });
      }
      {
        const [px, pz] = P(12.5, 0.08);
        k.plane(C.openTex, 8.4, 3.2, px, 1.6, pz, rot, { emissive: 0.2 });
        const [bx, bz] = P(13.5, 0.12);
        k.plane(
          paint('熊嘟皇家樂園', '#f2d23a', '#2a5ab0', null, 5.2, 5.6),
          5.2,
          5.6,
          bx,
          13.5,
          bz,
          rot,
          {
            emissive: 0.3,
          }
        );
      }
    }
    // ---- 左手邊 ----
    // 有巢氏看板樓：三樓整面兩塊看板
    {
      const k = seg(C, -1, 196.6, 202.8, SL1),
        y = 3.3 + 2 * 3.0;
      k.plane(
        paint(
          '撥款迅速急可先借\n免費諮詢估價',
          '#3a3aa0',
          '#ffffff',
          '0968-180679  03-458-2999',
          3.4,
          2.8
        ),
        3.4,
        2.8,
        k.sx(198.4),
        y - 1.5,
        -0.12,
        FRONT,
        { emissive: 0.2 }
      );
      k.plane(
        paint('有巢氏房屋\n中壢福州東興加盟店', '#2f8a4a', '#ffffff', '03-433-3277', 2.6, 2.8),
        2.6,
        2.8,
        k.sx(201.3),
        y - 1.5,
        -0.12,
        FRONT,
        { emissive: 0.2 }
      );
      k.box(0.05, k.W - 0.05, y - 3.05, y - 2.85, -0.2, 0, '#c8202a', NC);
      // 二樓整面玻璃（空置），中間一道窗框
      k.box(0.3, k.W - 0.3, 3.5, 6.1, -0.1, -0.02, '#5a6670', NC);
      k.box(k.W / 2 - 0.06, k.W / 2 + 0.06, 3.5, 6.1, -0.13, -0.1, '#d8d8d4', NC);
    }
  },

  // custom 佔的地
  footprints(F) {
    return [
      F(R, 68, 80, 1, SR1, 16, 1.2), // 停車場
      F(R, 90, 95, 1, SR1, 6, 1.2), // 圍籬
      F(R, 252.6, 263.4, 1, SR3, 3.6, 2.5), // 拆除空地
      F(R, 257, 267, 1, 30.4, 12, 0), // 塔樓
      F(R, 273, 301, 1, SN, 30, 4.5), // NET
      F(R, 301, 311, 1, 27, 14, 8), // NET 轉角斜面
    ];
  },
};
