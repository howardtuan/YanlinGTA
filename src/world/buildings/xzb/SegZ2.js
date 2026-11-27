// 中山東路 s 330～550 兩側（普仁橋、幸福街口到日新路口前；Google 街景官方 2026-05 與使用者相片球 2025-04／2025-06 混用、
// 國土測繪 2024 正射）。相片球的拍攝位置會差 3～10 m，店家先後順序照照片，寬度照正射與現有建物輪廓量。
//   東南側（+1）由西到東：NET 大樓前空地（柏昶新世界招商圍籬、市集；NET 大樓本體在 SegZ1）→ 大樹、普仁橋邊老街溪步道入口的紅色愛心拱門 →
//     幸福街 → 熊嗨星看板轉角樓（專業現場維修中心）→ 4 樓米黃樓 → Konica 照相 5 樓 → 毛起來愛看板 4 樓 →
//     3 樓藍色白格柵樓（住商不動產、振盛五金行）→ 3 樓灰色老屋 → 國霖動物醫院／中圓寵物家族轉角樓 → 民享街 →
//     寶島眼鏡 7 樓白色小磁磚圓角大樓（世豐門窗、蘭洛莉茶語、嫁粧總匯）→ 5 樓粉紅窄樓（永裕行 被棉 床罩）→ 中壢郵局 →
//     中山凱悅集合住宅（原悅牙醫診所、大廳、車庫、佳園耳鼻喉科診所）→ Q-Parking 露天停車場 → 唿唿哈點心專賣店（紅色鐵皮頂、舊彩繪側牆）→
//     陳記媽媽便當 → 兩間 3 樓 → 58灶咖 → 3 樓灰色騎樓老街屋兩棟（右轉尚有停車場）
//   西北側（-1）由西到東：提琴專業維修 4 樓白樓 → 7 樓紅褐磁磚大樓（拱形大廳、中原耘禾牙醫診所）→ 老街溪、普仁綠地 → 幸福街 →
//     1 層鐵皮平房（紅燈籠）→ 寵物公園 PetPark → 鉢一鍋／寬達聯合會計師事務所新大樓（退縮、前面石材地坪）→ 治平街 →
//     佑全中壢中山藥局轉角 → 震天堂中醫診所 → 夾娃娃機 → gogoro 社區店 → 仲信會計／柏樂診所 → 中華電信／神腦數位 → 灰色 6 樓 →
//     德美診所 → 黑色直條格柵 4 樓（租）→ 周師傅 → 3 樓紅磚老屋（植栽）→ 4 樓灰樓 → 大象喵樂園 → 5 樓白樓 → 綠鐵皮 2 樓 → 3 樓 →
//     夾娃娃機 → KYMCO 機車行
//   接縫：西端 s 330 西北側的灰色 4 樓（聯安家醫眼科、刮刮樂）在 SegZ1；東端 +1 的 JV3C 手機配件（s≈545～557，主體在 550 以東）歸 SegZ3，
//     這段只蓋到 s 545.3；-1 的天下光學轉角樓（s 536.3～545.5）在日新路 src/world/buildings/rixin/A.js，這段只蓋到 s 536.3。
//   路口留空：幸福街（+1 s 377.5～382.5、-1 s 383～388.5）、民享街（+1 s 422.5～428.5）、治平街（-1 s 427.5～435.5）。
//   有店面牆的填充樓與兩棟 OSM 建物（寶島眼鏡 w1388641484、中山凱悅 w1388641454）不能 drop，列在 hide；原本 noShop 的填充樓 drop。
//   看不清的招牌不放字（米黃樓的紅色直招、夾娃娃機店、三間 3 樓的招牌、灰色老屋的漫畫看板…）。
const R = 'Z',
  SR = 10.2, // 東南側（+1）立面離中心線
  SL = 10.2; // 西北側（-1）立面離中心線
const NC = { col: false };
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（-1 側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標），所以把寬度搬到 k.W、還原 k.w
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
  k.cyl(x, z, 0.22, -0.5, h - cr, '#5e4630', { seg: 6, col: true });
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
// 圓環的一段（愛心拱門、大廳拱）：圓心 (x, y, z)，在 x-y 平面上，從角度 a0 轉 arc
const ring = (C, k, x, y, z, rad, tube, a0, arc, hex) => {
  const g = new C.THREE.TorusGeometry(rad, tube, 6, 18, arc);
  g.rotateZ(a0);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};

// 一格街屋：[ref, s0, s1, side, spec]，set 沒寫就用 SR／SL
const E = (s0, s1, sp) => [R, s0, s1, 1, { set: SR, d: 12, ...sp }];
const W = (s0, s1, sp) => [R, s0, s1, -1, { set: SL, d: 14, ...sp }];
const RB = '#a8604c', // 紅磚
  WT = '#e9e8e3', // 白磁磚
  GR = '#a9a8a2', // 灰色磁磚
  KB = '#a87562', // 中山凱悅、7 樓大樓的紅褐磁磚
  KM = '#c9b49a', // 中山凱悅中間的米色磁磚
  BD = '#e2e0da'; // 寶島眼鏡大樓的白色小方磁磚

export default {
  // 原本就 noShop 的填充樓
  drop: ['f882', 'f2_536', 'f2_274', 'f2_288', 'f2_283', 'f2_758'],
  // 有店面牆的填充樓與 OSM 建物（寶島眼鏡大樓 w1388641484、中山凱悅 w1388641454，輪廓與樓高都跟實景不合）
  hide: [
    // 西北側
    'f884',
    'f883',
    'f881',
    'f880',
    'f879',
    'f2_540',
    'f2_539',
    'f2_538',
    'f2_537',
    'f2_535',
    'f2_534',
    'f2_273',
    'f2_275',
    'f2_290',
    'f2_289',
    'f2_287',
    'f2_286',
    'f2_285',
    'f2_284',
    'f2_282',
    'f2_281',
    'f2_280',
    'f2_279',
    'f2_278',
    // 東南側
    'f2_757',
    'f2_759',
    'f2_760',
    'f2_761',
    'f2_762',
    'f2_752',
    'f2_753',
    'w1388641484',
    'f1225',
    'w1388641454',
    'f1226',
    'f1227',
    'f1228',
    'f1229',
    'f1230',
    'f1231',
    'f1232',
    'f1233',
    'f1234',
    'f1235',
    'f1236',
  ],
  ownSign: [
    '中原耘禾牙醫診所',
    '寵物公園',
    '佑全中壢中山藥局',
    'Gogoro社區店',
    '柏樂診所',
    '中華電信',
    '德美診所',
    '大象樂園寵物生活館',
    '中圓寵物家族',
    '唿唿哈點心專賣',
    '陳記媽媽便當',
  ],
  lots: [
    // ================= 東南側（+1）=================
    // s 330～377.5：NET 大樓前空地、老街溪步道（custom）
    // 熊嗨星看板轉角樓：4 樓灰色老樓，二三樓藍底人像大看板，一樓綠色長招牌
    E(382.5, 388, {
      nf: 4,
      wall: '#a3a29c',
      sign: ['專業現場維修中心', '#2f9a56', '#ffffff'],
      big: ['我保證 熊嗨星', '#2c4fa0', '#ffffff'],
      bigFrom: 2,
      ground: 'shutter',
      sh: '#9a9a96',
      door: 0,
      bal: 'plain',
      d: 10,
    }),
    // 4 樓米黃樓：一樓鐵捲門（紅色直招看不清）
    E(388, 393, {
      nf: 4,
      wall: '#e0cf9e',
      ground: 'shutter',
      sh: '#b4b2aa',
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 10,
    }),
    // 5 樓灰褐色樓：一樓 Konica 照相館藍招牌，二樓紅色長招牌（字看不清）
    E(393, 398, {
      nf: 5,
      wall: '#8e857a',
      sign: ['Konica', '#2a4a9a', '#ffffff'],
      sign2: [' ', '#c8282a', '#ffffff'],
      bal: 'rail',
      d: 10,
    }),
    // 4 樓白磁磚：二樓「毛起來愛」寵物美容大看板
    E(398, 403, {
      nf: 4,
      wall: WT,
      big: ['毛起來愛', '#2a5a3a', '#ffffff'],
      bigFrom: 2,
      bigW: 4.2,
      ground: 'shop',
      noband: 1,
      bal: 'grille',
      d: 10,
    }),
    // 3 樓藍色立面、白色格柵窗，兩戶：住商不動產、振盛五金行
    E(403, 408, {
      nf: 3,
      wall: '#5a7fa8',
      ground: 'shop',
      bal: 'cage',
      vert: ['住商不動產', '#2a8a4a', '#ffffff'],
      d: 10,
    }),
    E(408, 413, {
      nf: 3,
      wall: '#5a7fa8',
      ground: 'shutter',
      sh: '#a8aaa8',
      noband: 1,
      door: 0,
      bal: 'cage',
      vert: ['振盛五金行', '#f4f2ee', '#2a3a8a'],
      d: 10,
    }),
    // 3 樓灰色老屋（二樓漫畫看板，一樓鐵捲門）
    E(413, 417.5, {
      nf: 3,
      wall: '#9e9b94',
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 10,
    }),
    // 民享街西角：3 樓米黃轉角樓，二樓整面玻璃，國霖動物醫院、一樓中圓寵物家族 PETS FAMILY
    E(417.5, 422.5, {
      nf: 3,
      wall: '#e6d3a8',
      sign: ['中圓寵物家族 PETS FAMILY', '#f2f0ea', '#2a4a8a'],
      sign2: ['國霖動物醫院', '#2a6ac0', '#ffffff'],
      bal: 'plain',
      d: 10,
    }),
    // 民享街東角：寶島眼鏡 7 樓白色小方磁磚大樓（民享街那一角是圓角，custom）
    E(431, 437, {
      nf: 7,
      wall: BD,
      sign: ['寶島眼鏡', '#23308a', '#ffffff'],
      sign2: ['世豐門窗', '#3a8ad0', '#ffffff'],
      vert: ['寶島眼鏡', '#23308a', '#ffffff'],
      bal: 'plain',
      roof: 'tank',
      d: 14,
    }),
    E(437, 445, {
      nf: 7,
      wall: BD,
      sign: ['嫁粧總匯 工廠直營', '#c8282a', '#ffffff'],
      sign2: ['蘭洛莉茶語', '#3a9a4a', '#ffffff'],
      bal: 'plain',
      d: 14,
    }),
    // 5 樓粉紅窄樓：永裕行 被棉 床罩
    E(445, 449.5, {
      nf: 5,
      wall: '#d9a3a0',
      sign: ['總代理進口毛毯 床罩類', '#c8282a', '#ffffff'],
      vert: ['永裕行 被棉 床罩', '#c8282a', '#ffffff'],
      bal: 'cage',
      d: 14,
    }),
    // 中壢郵局：3 樓，紅褐色直條立面、白色壁柱、米白色弧形女兒牆（custom）
    E(449.5, 462, {
      nf: 3,
      gf: 3.6,
      wall: '#a3503c',
      sign: ['郵局  POST', '#1e8f4e', '#ffffff'],
      bal: 'cage',
      roof: 'none',
      d: 16,
      bikes: 4,
    }),
    // 中山凱悅集合住宅：11 樓紅褐與米色小方磁磚、凸窗（凸窗在 custom）
    E(462, 468, {
      nf: 11,
      wall: KB,
      sign: ['原悅牙醫診所', '#f4f2ee', '#c8402a', 'Yuan Yue dental clinic'],
      vert: ['原悅牙醫診所', '#f4f2ee', '#c8402a'],
      bal: 'plain',
      roof: 'none',
      d: 24,
      bikes: 3,
    }),
    E(468, 474, {
      nf: 11,
      wall: KB,
      ground: 'shutter',
      sh: '#b8b6b0',
      noband: 1,
      door: 0,
      bal: 'plain',
      roof: 'tank',
      d: 24,
    }),
    // 大廳：三角山牆門廊、深色石材門柱（custom）
    E(474, 480, {
      nf: 11,
      wall: KM,
      ground: 'gate',
      sh: '#8a8a86',
      noband: 1,
      bal: 'plain',
      roof: 'none',
      d: 24,
    }),
    E(480, 490, {
      nf: 11,
      wall: KB,
      ground: 'shutter',
      sh: '#d8d6d0',
      sign: ['佳園耳鼻喉科診所', '#f2f2ee', '#2a3a9a', '鼻過敏·失眠·內視鏡·成人健檢'],
      vert: ['佳園耳鼻喉科診所', '#f2f2ee', '#2a3a9a'],
      door: 0,
      bal: 'plain',
      roof: 'none',
      d: 24,
    }),
    // s 490～497：Q-Parking 露天停車場（custom）
    // 唿唿哈點心專賣店：4 樓，頂樓紅色鐵皮斜頂，朝停車場的側牆是褪色的舊彩繪廣告（custom）
    E(497, 504, {
      nf: 4,
      wall: '#d2cabe',
      sign: ['唿唿哈', '#e8995a', '#ffffff', '點心專賣店'],
      bal: 'cage',
      roof: 'none',
      d: 12,
    }),
    // 陳記媽媽便當（自助餐）
    E(504, 510, {
      nf: 3,
      wall: '#b8a898',
      sign: ['陳記媽媽便當 自助餐', '#c8282a', '#ffffff'],
      vert: ['媽媽便當', '#c8282a', '#ffffff'],
      bal: 'grille',
      d: 12,
    }),
    E(510, 516, { nf: 3, wall: '#d0c8b8', ground: 'shop', bal: 'grille', d: 12 }),
    E(516, 521.5, {
      nf: 4,
      wall: '#c4bdb0',
      ground: 'shop',
      vert: ['58灶咖', '#2a4a9a', '#ffffff'],
      bal: 'cage',
      d: 12,
    }),
    E(521.5, 527, { nf: 3, wall: '#b9b3a8', ground: 'shop', bal: 'grille', d: 12 }),
    // 3 樓灰色騎樓老街屋：二三樓灰色鐵皮遮雨棚（custom）、鐵窗、紅燈籠，一樓鐵門
    E(527, 536, {
      nf: 3,
      wall: '#a9aaa6',
      ground: 'gate',
      sh: '#7d7f80',
      noband: 1,
      bal: 'cage',
      roof: 'none',
      d: 14,
    }),
    E(536, 545.3, {
      nf: 3,
      wall: '#a4a5a1',
      ground: 'gate',
      sh: '#7d7f80',
      noband: 1,
      bal: 'cage',
      roof: 'none',
      d: 14,
    }),

    // ================= 西北側（-1）=================
    // 提琴專業維修：4 樓白樓，二樓玻璃窗，一樓藍招牌
    W(330, 335.5, {
      nf: 4,
      wall: '#e8e6e0',
      sign: ['提琴專業維修', '#2f5fa8', '#ffffff'],
      bal: 'plain',
      d: 12,
    }),
    // 7 樓紅褐磁磚大樓（門牌 341～347）：一樓石材騎樓，中間拱形大廳（custom），東南端中原耘禾牙醫診所
    W(335.5, 342, {
      nf: 7,
      wall: KB,
      low: '#8a5a4c',
      ground: 'open',
      noband: 1,
      door: 0,
      bal: 'plain',
      roof: 'none',
      d: 18,
    }),
    W(342, 349, {
      nf: 7,
      wall: KB,
      low: '#8a5a4c',
      ground: 'gate',
      sh: '#6a6a66',
      noband: 1,
      bal: 'plain',
      roof: 'tank',
      d: 18,
    }),
    W(349, 363, {
      nf: 7,
      wall: KB,
      low: '#8a5a4c',
      sign: [
        '中原耘禾牙醫診所',
        '#f2f0ec',
        '#a0555a',
        'CHUNG-YUAN HARVEST DENTAL CLINIC  03-4368666',
      ],
      vert: ['中原耘禾牙醫', '#f6f4f0', '#8a5a5a'],
      bal: 'plain',
      roof: 'none',
      d: 18,
    }),
    // s 363～383：老街溪、普仁綠地；幸福街
    // 1 層灰色鐵皮平房：藍色鐵捲門、一排紅燈籠（custom）
    W(388.5, 396, {
      nf: 1,
      gf: 3.0,
      wall: '#9a9c9e',
      ground: 'shutter',
      sh: '#3d5a7a',
      noband: 1,
      door: 0,
      roofCol: '#6d7275',
      d: 8,
    }),
    // 寵物公園 PetPark：二樓黑底綠字大招牌，一樓騎樓綠色鐵捲門
    W(396, 410, {
      nf: 4,
      wall: '#77716a',
      sign2: ['寵物公園  PetPark 寵物美容醫療', '#1c1c1c', '#4cc05a'],
      ground: 'shutter',
      sh: '#3f6a4a',
      noband: 1,
      door: 0,
      bal: 'plain',
      d: 14,
    }),
    // 鉢一鍋／寬達聯合會計師事務所：退縮 4 m 的 5 樓新大樓，白磁磚＋黑色直條格柵，前面石材地坪停車
    W(410, 427.5, {
      set: 14.5,
      nf: 5,
      wall: '#ecebe6',
      sign: ['鉢一鍋 時尚鍋物', '#e8602a', '#ffffff', 'COME EAT HOT POT  03-466-8111'],
      sign2: ['寬達聯合會計師事務所  QUANDA', '#2a3550', '#ffffff'],
      fins: '#2b2b2d',
      bal: 'plain',
      roof: 'none',
      d: 14,
    }),
    // 治平街東角：佑全中壢中山藥局（4 樓，二三樓白色「健保特約藥局」大看板，樓頂鐵架在 custom）
    // 治平街斜接中山東路，照正射路緣從 s 432.7 退到 s 435.5，西北後角才不壓到治平街（tools/roads.json shift 移過的位置）
    W(435.5, 444, {
      set: 9.8,
      nf: 4,
      wall: '#e6e1d2',
      sign: ['佑全中壢中山藥局', '#1f8a4a', '#ffffff'],
      big: ['藥  健保特約藥局', '#f6f6f2', '#2a8a4a'],
      bigFrom: 2,
      vert: ['佑全中壢中山藥局', '#1f8a4a', '#ffffff'],
      roof: 'none',
      d: 12,
      bikes: 4,
    }),
    // 震天堂中醫診所：7 樓窄樓
    W(444, 449, {
      nf: 7,
      wall: '#b9b5ae',
      sign: ['震天堂中醫診所', '#1f6e4a', '#ffffff', '內婦兒科·針灸酸痛·傷科推拿'],
      vert: ['震天堂中醫診所', '#1f6e4a', '#ffffff'],
      bal: 'plain',
      d: 12,
    }),
    // 夾娃娃機店（5 樓）
    W(449, 454, { nf: 5, wall: '#c7b9a8', ground: 'shop', bal: 'grille', d: 12 }),
    // gogoro 社區店：紅磚柱、黑白格地磚
    W(454, 459, {
      nf: 5,
      wall: RB,
      sign: ['gogoro 社區店', '#2f5fb8', '#ffffff'],
      vert: ['gogoro', '#2f5fb8', '#ffffff'],
      ground: 'shutter',
      sh: '#8a8c8e',
      bal: 'grille',
      d: 12,
    }),
    // 仲信會計事務所、柏樂診所
    W(459, 464, {
      nf: 6,
      wall: '#c9c2b6',
      sign: ['柏樂診所', '#d8e04a', '#2a5a2a', '失眠·淺眠·多夢'],
      vert: ['仲信會計事務所', '#2a4aa0', '#ffffff'],
      bal: 'grille',
      d: 12,
    }),
    W(464, 468, {
      nf: 6,
      wall: '#bdb6aa',
      ground: 'shop',
      vert: ['柏樂診所', '#e8d84a', '#2a4a2a'],
      bal: 'grille',
      d: 12,
    }),
    // 中華電信／神腦數位：5 樓紅褐磁磚
    W(468, 474, {
      nf: 5,
      wall: '#a8705a',
      sign: ['中華電信  senao 神腦數位', '#ffffff', '#1a4a9a', '特約服務中心'],
      vert: ['神腦數位', '#1a4a9a', '#ffffff'],
      bal: 'grille',
      d: 14,
    }),
    // 灰色 6 樓（整排冷氣、一樓鐵捲門、紅色鐵柵欄）
    W(474, 479, {
      nf: 6,
      wall: GR,
      ground: 'shutter',
      noband: 1,
      door: 0,
      bal: 'grille',
      d: 14,
    }),
    // 德美診所：青綠色木條立面，二樓以上直立大看板（皮膚科、醫學美容）
    W(479, 484.5, {
      nf: 5,
      wall: '#b9b4aa',
      low: '#3a9e94',
      sign: ['德美診所', '#3a9e94', '#ffffff'],
      big: ['皮膚科\n醫學美容\n德美診所', '#f4f6f6', '#2a7a74'],
      bigFrom: 2,
      bigW: 3.6,
      bigAt: 0.62,
      vert: ['德美診所', '#2f8f88', '#ffffff'],
      bal: 'grille',
      d: 14,
    }),
    // 黑色直條格柵 4 樓（一樓車庫、黃色「租」牌）
    W(484.5, 489, {
      nf: 4,
      wall: '#3a3a3c',
      fins: '#1c1c1e',
      ground: 'open',
      noband: 1,
      door: 0,
      banner: ['租', '#f2c230', '#c8202a'],
      bal: 'plain',
      d: 14,
    }),
    // 周師傅（1968 年 炭烤排骨·雞排 便當專賣）
    W(489, 494.5, {
      nf: 4,
      wall: '#c9c2b6',
      sign: ['周師傅 燒肉飯', '#f2c230', '#c8282a'],
      sign2: ['周師傅 1968年 炭烤排骨·雞排 便當專賣', '#c8282a', '#ffffff'],
      vert: ['周師傅', '#f2c230', '#c8282a'],
      bal: 'grille',
      d: 14,
    }),
    // 3 樓紅磚老屋：木框窗、陽台植栽、紅燈籠（植栽在 custom）
    W(494.5, 499.5, {
      nf: 3,
      wall: RB,
      ground: 'shutter',
      sh: '#9a9890',
      awn: '#8a5a4a',
      noband: 1,
      door: 0,
      bal: 'open',
      roof: 'none',
      d: 12,
    }),
    // 4 樓灰樓：白鐵窗，一樓夾娃娃機店
    W(499.5, 504.5, { nf: 4, wall: GR, ground: 'shop', bal: 'cage', d: 14 }),
    // 大象喵樂園：5 樓褐色整面鐵窗，直立橘招牌（黑貓）
    W(504.5, 510, {
      nf: 5,
      wall: '#9a7a62',
      sign: ['大象喵樂園', '#e8892a', '#1a1a1a'],
      vert: ['大象喵樂園', '#e8892a', '#1a1a1a'],
      bal: 'cage',
      d: 14,
    }),
    W(510, 516, { nf: 5, wall: WT, ground: 'shutter', noband: 1, door: 0, bal: 'grille', d: 14 }),
    // 2 樓淺綠鐵皮屋
    W(516, 521, {
      nf: 2,
      wall: '#9fb89a',
      ground: 'shutter',
      sh: '#a8aaa6',
      noband: 1,
      door: 0,
      bal: 'plain',
      roof: 'shack',
      d: 12,
    }),
    W(521, 526.5, { nf: 3, wall: '#cbbfae', ground: 'shop', bal: 'grille', d: 12 }),
    // 夾娃娃機店
    W(526.5, 531.5, { nf: 3, wall: '#d8d2c4', ground: 'shop', bal: 'cage', d: 12 }),
    // KYMCO 機車行（二樓白色鐵皮、紅色直立旗）
    W(531.5, 536.3, {
      nf: 3,
      wall: '#e6e4de',
      sign: ['KYMCO', '#f6f6f4', '#c8202a'],
      vert: ['KYMCO', '#c8202a', '#ffffff'],
      tin: 1,
      bal: 'plain',
      d: 12,
      bikes: 3,
    }),
  ],

  custom(C) {
    const { FRONT, paint, lcg } = C;
    // ---- 東南側 ----
    // NET 大樓前空地（s 330～363）：沿街橘色低護欄＋柏昶新世界招商布條圍籬，靠老街溪那頭兩棵大樹、藍色 P 牌
    {
      const k = seg(C, 1, 330, 363, SR),
        w = k.W;
      for (let x = 1.0; x <= w - 1; x += 2.4)
        k.box(x, x + 0.08, 0, 1.0, -0.04, 0.04, '#e8902a', NC);
      k.box(1.0, w - 1, 0.92, 1.0, -0.04, 0.04, '#e8902a', NC);
      k.box(1.0, w - 1, 0.45, 0.5, -0.04, 0.04, '#e8902a', NC);
      // 布條（貼在護欄外側）
      const B = [
        [5.0, 10.0, '柏昶新世界', '#24305e', '#ffffff'],
        [10.0, 17.0, '火熱招商中', '#c8282a', '#ffffff'],
        [17.0, 23.0, '市集｜攤商', '#1a1a1a', '#f2d23a'],
        [23.0, 28.5, '柏昶新世界 招商中', '#f2d23a', '#24305e'],
      ];
      for (const [a, b, t, bg, fg] of B)
        k.plane(paint(t, bg, fg, null, b - a, 0.85), b - a, 0.85, (a + b) / 2, 0.5, -0.06, FRONT, {
          emissive: 0.1,
        });
      const r = lcg(23330);
      tree(C, k, w - 3.5, 2.5, 13, 3.6, r);
      tree(C, k, w - 0.8, 7.5, 12, 3.2, r);
      k.cyl(w - 2.2, -0.6, 0.05, 0, 2.6, '#8a8d90', { seg: 6 });
      k.box(w - 2.6, w - 1.8, 2.0, 2.8, -0.66, -0.6, '#2a5ab0', NC);
      k.plane(
        paint('P', '#2a5ab0', '#ffffff', null, 0.7, 0.7),
        0.7,
        0.7,
        w - 2.2,
        2.4,
        -0.67,
        FRONT,
        {
          emissive: 0.2,
        }
      );
    }
    // 老街溪步道入口的紅色愛心拱門（幸福街口、溪岸那一角）
    {
      const k = seg(C, 1, 374, 377.4, SR),
        cx = k.W / 2,
        red = '#d8282a',
        z = 0.8;
      ring(C, k, cx - 0.62, 2.55, z, 0.66, 0.08, 0, Math.PI * 1.05, red);
      ring(C, k, cx + 0.62, 2.55, z, 0.66, 0.08, -Math.PI * 0.05, Math.PI * 1.05, red);
      // 兩隻腳往下收（底部開口讓人走過去）
      for (const sd of [-1, 1]) {
        const g = new C.THREE.BoxGeometry(0.16, 2.2, 0.16);
        g.rotateZ(-sd * 0.32);
        g.translate(cx + sd * 0.95, 1.35, z);
        k._part(C.VC, C.paintGeo(g, red));
      }
    }
    // 寶島眼鏡大樓民享街那一角的圓角（s 428.6～431）：白牆圓柱＋每層一圈深色窗帶
    {
      const k = seg(C, 1, 428.6, 431, SR),
        top = 3.3 + 6 * 3.0,
        r = 2.4;
      k.cyl(r, r, r, 0, top, BD, { seg: 20, col: true });
      k.box(0, r, 0, top, r, 14, BD);
      for (let f = 1; f < 7; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.cyl(r, r, r + 0.03, y + 0.9, y + 2.1, '#3e4a55', { seg: 20 });
      }
      k.cyl(r, r, r + 0.25, 3.3 - 0.85, 3.3 - 0.05, '#23308a', { seg: 20 }); // 一樓上緣寶島眼鏡藍色招牌帶
      k.cyl(r, r, r + 0.1, top, top + 0.12, '#cfcdc6', { seg: 20 });
    }
    // 中壢郵局：白色壁柱、米白色弧形女兒牆（四個圓頭凸塊）、門口台階
    {
      const k = seg(C, 1, 449.5, 462, SR),
        w = k.W,
        gf = 3.6,
        top = gf + 2 * 3.0;
      for (let x = 0.2; x <= w - 0.3; x += 2.45)
        k.box(x, x + 0.35, gf, top, -0.25, 0, '#efe9dc', NC);
      k.box(0, w, top, top + 1.1, -0.1, 0.4, '#efe9dc', NC);
      const n = 4,
        cw = w / n;
      for (let i = 0; i < n; i++) {
        const a = i * cw + 0.35,
          b = (i + 1) * cw - 0.35;
        k.box(a + 0.5, b - 0.5, top - 0.1, top + 1.3, -0.75, 0, '#f1ece0', NC);
        for (const x of [a + 0.5, b - 0.5])
          k.cyl(x, -0.25, 0.5, top - 0.1, top + 1.3, '#f1ece0', { seg: 10 });
      }
      k.box(1.0, w - 1.0, 0, 0.3, -1.4, 0, '#c9c4b8', { col: false, surface: true }); // 台階
      // 郵筒（綠、紅）
      k.box(w * 0.55, w * 0.55 + 0.5, 0, 1.3, -2.2, -1.75, '#2a8a4a');
      k.box(w * 0.55 + 0.6, w * 0.55 + 1.1, 0, 1.3, -2.2, -1.75, '#c8282a');
    }
    // 中山凱悅：凸窗（每格兩列，二樓以上）、大廳三角山牆門廊與深色石材門柱
    {
      for (const [s0, s1, col] of [
        [462, 468, '#b98470'],
        [468, 474, '#b98470'],
        [474, 480, '#d6c3a8'],
        [480, 490, '#b98470'],
      ]) {
        const k = seg(C, 1, s0, s1, SR),
          w = k.W,
          n = w > 8 ? 3 : 2;
        for (let j = 0; j < n; j++) {
          const xc = (w * (j + 0.5)) / n;
          for (let f = 1; f < 11; f++) {
            const y = 3.3 + (f - 1) * 3.0;
            k.box(xc - 0.9, xc + 0.9, y + 0.6, y + 2.4, -0.6, 0, col, NC);
            k.box(xc - 0.75, xc + 0.75, y + 0.9, y + 2.2, -0.62, -0.6, '#4f6a70', NC);
          }
        }
        k.box(0, w, 3.3 + 10 * 3.0, 3.3 + 10 * 3.0 + 1.2, -0.1, 0.3, col, NC); // 女兒牆
      }
      const k = seg(C, 1, 474, 480, SR),
        w = k.W;
      for (const x of [0.3, w - 1.0]) k.box(x, x + 0.7, 0, 3.3, -0.6, 0, '#3e3a3c');
      k.box(1.3, w - 1.3, 2.5, 2.7, -0.7, 0, '#e6e2da', NC);
      // 三角山牆
      const g = new C.THREE.CylinderGeometry(1.0, 1.0, w - 2.6, 3);
      g.rotateX(-Math.PI / 2);
      g.rotateY(Math.PI / 2);
      g.scale(1, 0.55, 0.5);
      g.translate(w / 2, 2.95, -0.45);
      k._part(C.VC, C.paintGeo(g, '#ece8e0'));
      // 車庫鐵捲門上的紅字
      const kg = seg(C, 1, 480, 490, SR);
      kg.plane(
        paint('車庫', '#d8d6d0', '#c8282a', null, 2.0, 0.6),
        2.0,
        0.6,
        2.4,
        1.3,
        -0.05,
        FRONT
      );
    }
    // Q-Parking 露天停車場（s 490～497）：紅橘色 P 價目大牌、黃色網狀線、入口三角錐
    {
      const k = seg(C, 1, 490, 497, SR),
        w = k.W;
      k.cyl(w - 0.6, -0.5, 0.07, 0, 4.6, '#7a7d80', { seg: 6, col: true });
      k.plane(
        paint('P', '#e8582a', '#ffffff', null, 1.0, 1.0),
        1.0,
        1.0,
        w - 0.6,
        4.0,
        -0.62,
        FRONT,
        {
          emissive: 0.3,
          double: true,
        }
      );
      k.plane(
        paint('20元/180分', '#f2c230', '#c8282a', null, 1.0, 0.5),
        1.0,
        0.5,
        w - 0.6,
        3.2,
        -0.62,
        FRONT,
        { emissive: 0.2, double: true }
      );
      k.box(0.4, 1.6, 0, 1.9, -0.5, -0.4, '#c8282a', NC);
      k.plane(
        paint('Q-Parking', '#c8282a', '#ffffff', '計時收費 請先繳費', 1.2, 0.9),
        1.2,
        0.9,
        1.0,
        1.4,
        -0.51,
        FRONT
      );
      k.box(0, w, -0.3, 0.15, 0, 22, '#3c3d3f', { col: false, surface: true }); // 柏油地面
      for (let x = 1.0; x < w - 0.5; x += 0.5) k.box(x, x + 0.12, 0.15, 0.17, 1, 7, '#e8c02a', NC);
    }
    // 唿唿哈：頂樓紅色鐵皮斜頂、朝停車場的側牆褪色舊彩繪廣告
    {
      const k = seg(C, 1, 497, 504, SR),
        w = k.W,
        top = 3.3 + 3 * 3.0;
      for (const [y0, y1, z0, z1] of [
        [top, top + 0.7, 0.4, 11.6],
        [top + 0.7, top + 1.3, 1.6, 10.4],
        [top + 1.3, top + 1.8, 3.0, 9.0],
      ])
        k.box(-0.1, w + 0.1, y0, y1, z0, z1, '#b0302a', NC);
      k.plane(
        paint('婚紗攝影', '#cdbfa8', '#9a6a5a', null, 10, 4),
        10,
        4,
        -0.04,
        top - 3.0,
        6,
        -Math.PI / 2
      );
    }
    // 灰色騎樓老街屋：二樓、三樓的灰色鐵皮遮雨棚，一排紅燈籠，二樓藍色「右轉 尚有停車場」
    {
      for (const [s0, s1] of [
        [527, 536],
        [536, 545.3],
      ]) {
        const k = seg(C, 1, s0, s1, SR),
          w = k.W;
        for (const y of [3.3 + 2.4, 3.3 + 3.0 + 2.4]) {
          k.box(-0.05, w + 0.05, y, y + 0.08, -1.0, 0, '#8e9294', NC);
          k.box(-0.05, w + 0.05, y - 0.55, y + 0.05, -1.05, -0.98, '#9a9ea0', NC);
        }
        for (let x = 1.0; x < w - 0.5; x += 2.2) ball(C, k, x, 2.6, -1.0, 0.2, '#d8302a', 1.15);
      }
      const k = seg(C, 1, 527, 536, SR);
      k.box(0.2, 4.6, 3.5, 4.5, -1.1, -1.05, '#2a3fa8', NC);
      k.plane(
        paint('右轉 尚有停車場', '#2a3fa8', '#ffffff', null, 4.3, 0.9),
        4.3,
        0.9,
        2.4,
        4.0,
        -1.11,
        FRONT,
        { emissive: 0.25 }
      );
    }
    // ---- 西北側 ----
    // 7 樓紅褐大樓的拱形大廳（s 342～349）：深色石材柱、拱形門楣，大廳裡是玻璃門
    {
      const k = seg(C, -1, 342, 349, SL),
        w = k.W;
      for (const x of [0.2, w - 1.0]) k.box(x, x + 0.8, 0, 3.3, -0.4, 0, '#6e4a40');
      k.box(0.2, w - 0.2, 3.3 - 0.75, 3.3, -0.4, 0, '#9a6a58', NC);
      ring(C, k, w / 2, 1.0, -0.3, w / 2 - 1.0, 0.12, 0.08, Math.PI - 0.16, '#d8c2a8');
      k.plane(
        paint('341~347', '#7a5a4c', '#e8dccc', null, 0.8, 0.3),
        0.8,
        0.3,
        w - 0.6,
        2.0,
        -0.41,
        FRONT
      );
    }
    // 7 樓大樓東南端、溪邊的綠色採光罩
    {
      const k = seg(C, -1, 363, 366, SL);
      k.box(-0.2, k.W, 2.8, 2.9, 0, 6, '#5f9a86', NC);
      for (const x of [0.3, k.W - 0.3]) k.cyl(x, 0.4, 0.06, 0, 2.8, '#6a6d70', { seg: 6 });
    }
    // 1 層鐵皮平房的一排紅燈籠
    {
      const k = seg(C, -1, 388.5, 396, SL);
      for (let x = 0.6; x < k.W - 0.3; x += 0.9) ball(C, k, x, 2.35, -0.45, 0.2, '#d8302a', 1.15);
    }
    // 佑全樓頂的鋼構廣告架
    {
      const k = seg(C, -1, 435.5, 444, 9.8),
        w = k.W,
        top = 3.3 + 3 * 3.0;
      for (let x = 0.4; x < w; x += 2.6)
        for (const z of [0.6, 4.0]) k.box(x, x + 0.12, top, top + 3.2, z, z + 0.12, '#5a5e60', NC);
      for (const y of [top + 1.6, top + 3.1])
        k.box(0.4, w - 0.4, y, y + 0.1, 0.6, 0.72, '#5a5e60', NC);
      for (let z = 0.6; z < 4.1; z += 1.1)
        k.box(0.4, w - 0.4, top + 3.1, top + 3.2, z, z + 0.08, '#5a5e60', NC);
      // 治平街那面側牆的「サツドラ 札幌藥粧」藍色直立牌
      k.plane(
        paint('サツドラ\n札幌藥粧', '#2a4aa8', '#ffffff', null, 1.4, 3.2),
        1.4,
        3.2,
        w + 0.04,
        3.3 + 1.8,
        1.2,
        Math.PI / 2,
        { emissive: 0.2 }
      );
    }
    // 3 樓紅磚老屋的陽台植栽
    {
      const k = seg(C, -1, 494.5, 499.5, SL),
        r = lcg(23494);
      for (let x = 0.5; x < k.W - 0.3; x += 0.7)
        ball(
          C,
          k,
          x,
          3.3 + 1.0 + r() * 0.3,
          -0.75,
          0.35 + r() * 0.15,
          r() < 0.5 ? '#4b8a3e' : '#5f9a4a',
          0.9
        );
      for (let x = 0.4; x < k.W - 0.6; x += 1.3) ball(C, k, x, 0.45, -1.3, 0.4, '#4b8a3e', 0.9);
    }
  },

  // custom 佔的地
  footprints(F) {
    return [
      F(R, 333, 361, 1, SR, 0.4, 0.3), // NET 大樓前空地的圍籬
      F(R, 428.6, 431, 1, SR, 14, 0), // 寶島眼鏡圓角
      F(R, 490, 497, 1, SR, 20, 0.8), // Q-Parking
      F(R, 363, 366, -1, SL, 6, 0), // 綠色採光罩
    ];
  },
};
