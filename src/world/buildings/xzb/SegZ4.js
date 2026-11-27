// 中山東路 s 749～886 兩側（弘揚路口往東南到環中東路口；Google 街景 2026-05，國土測繪 2024 正射、Google 衛星）。
// 遊戲的路網只到環中東路口（再過去是地圖邊界），兩側都做到路口轉角為止。
//   西南側（+1）由弘揚路口往東南：RAMA VII 那棟的鐵皮圍板（Z3 做到 s 749）→ 撈油水 Bolu 港式菠蘿茶飲 5 樓白磁磚圓角轉角樓
//     （大勇四街那一面是玻璃帷幕與「敦煌舞蹈團 中原教室」綠招牌）→ 大勇四街 → 6 樓紅磚圓角轉角大樓（彭壽堂、aeontek 宏佳騰
//     桃園車業 機車排氣檢驗站、TOTO 普仁衛浴）→ 6 樓白色窄樓（Caesar 直立看板，門口一棵行道樹）→ AGMA 起司鍋（烤肉工廠）→
//     6 樓灰白老公寓（透明雨遮、鐵捲門）→ 炸雞食堂／現炸海鮮攤 → 大桃園工業地廠房 → 空店面 → 宏悅牙醫 → 粥攤 → 灰色鐵捲門 →
//     洪記豆漿大王（國泰街口）→ 國泰街 → 拉亞漢堡 LAYA BURGER 5 樓圓角轉角樓 → 兩間鐵捲門住家（褐、藍）→ yc HAIR SALON →
//     刻印大小章 → 味味香烤鴨 6 樓圓角轉角樓（環中東路口西角，樓頂紅白大看板）
//   東北側（-1）由弘揚路口往東南：（清心福全轉角樓歸 SegH1，到 s 768.3 為止）→ 大東 剪燙染 3 樓老樓 → 饗樂樂 獨享鍋 →
//     貝多芬牙醫診所 → 台南無刺 虱目魚專賣店 5 樓紅磚 → 龍門洗衣（屋頂白色大看板）→ YAMAHA 可承機車行 → 水餃小籠包 →
//     佰元鍋 188吃到飽（一樓鐵皮店＋大看板）→ 松柏中醫診所（一樓突出，後面退縮 7 樓灰白大樓）→ 翌盛法律事務所／李經國聯合診所
//     7 樓磚紅樓 → 大樹藥局 Great Tree 中壢環東藥局（2 樓、樓頂大看板）→ 平面收費停車場（柵欄機、繳費柱、大樹直立高柱招牌）→
//     灰色工地圍籬 → 包著鷹架的新建物（環中東路口東角，前面一片鋪面空地）
//   遊戲的大勇四街、國泰街比實景各往東南偏 3～6 m，路寬照遊戲的路；格子寬度照正射看到的屋頂分界，再依遊戲的路口伸縮。
//   東北側 s 768.3～776.9 後面是弘揚路那排填充樓（f1093），這兩格只做 10.5 m 深；西南側國泰街口後面有 f2_909，那幾格只做 9.5 m 深。
//   有店面牆的填充樓列在 hide，原本 noShop 的 drop。看不清的招牌不放字，工地圍籬上的競選看板只畫色塊。
const R = 'Z',
  SR = 10.0, // 西南側（+1）立面離中心線
  SL = 10.3; // 東北側（-1）
const NC = { col: false };
const W = (s0, s1, sp) => [R, s0, s1, 1, { set: SR, d: 13, ...sp }];
const E = (s0, s1, sp) => [R, s0, s1, -1, { set: SL, d: 13, ...sp }];
// 開一個 Kit（見 SegX11）：k.W 格寬，k.sx(s) 沿線距離換區域 x
const seg = (C, side, s0, s1, set) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  return k;
};
const WT = '#e6e5e0', // 白磁磚
  RB = '#9a5040', // 紅磚
  GW = '#d0cec7'; // 灰白老公寓
const sign = (C, k, text, bg, fg, w, h, x, y, z, rot, sub) =>
  k.plane(C.paint(text, bg, fg, sub || null, w, h), w, h, x, y, z, rot, { emissive: 0.3 });
const ball = (C, k, x, y, z, r, hex, sy = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(1, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 闊葉行道樹：樹幹＋幾團樹冠
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
// 圓角轉角樓的圓弧那一小格（半徑＝格寬）：at 's1' 轉角在 s 較大那頭（區域 x = W）、's0' 在 x = 0。
// 回傳 { k, cx, r, top, sideX, dir }，招牌之類由呼叫端再掛
const roundCorner = (C, side, s0, s1, set, o) => {
  const k = seg(C, side, s0, s1, set),
    w = k.W,
    r = w,
    gf = o.gf || 3.3,
    fh = o.fh || 3.0,
    nf = o.nf,
    d = o.d || 13,
    top = gf + (nf - 1) * fh,
    end = o.at === 's1',
    dir = end ? 1 : -1,
    cx = end ? w - r : r,
    sideX = end ? w : 0,
    wm = `wall${o.wall}`;
  // 主體：後半整格，前面一根圓柱（圓柱伸進隔壁那格的部分藏在樓裡）
  k.box(0, w, 0, top, r, d, wm);
  k.cyl(cx, r, r, 0, top, wm, { seg: 20, col: true });
  // 樓層線、一樓深色玻璃與招牌帶
  for (let f = 1; f < nf; f++) {
    const y = gf + (f - 1) * fh;
    k.cyl(cx, r, r + 0.07, y - 0.1, y + 0.05, o.band || '#cfccc4', { seg: 20 });
  }
  k.cyl(cx, r, r + 0.03, 0.05, gf - 1.0, '#3a444c', { seg: 20 });
  k.cyl(cx, r, r + 0.2, gf - 0.9, gf - 0.15, o.signCol || '#d8d6cf', { seg: 20 });
  // 圓弧上的窗：每層三扇，依弧上的法線轉向
  for (let f = 1; f < nf; f++)
    for (const a of [Math.PI / 8, Math.PI / 4, (3 * Math.PI) / 8]) {
      const nx = dir * Math.sin(a),
        nz = -Math.cos(a);
      k.plane(
        C.YHT.win(),
        1.0,
        1.3,
        cx + nx * (r + 0.05),
        gf + (f - 1) * fh + 1.5,
        r + nz * (r + 0.05),
        Math.atan2(nx, nz)
      );
    }
  // 側面（對著巷子／路口）的窗
  const rot = end ? Math.PI / 2 : -Math.PI / 2;
  for (let f = 1; f < nf; f++)
    for (let z = r + 1.6; z < d - 1; z += 2.8)
      k.plane(C.YHT.win(), 1.4, 1.3, sideX + dir * 0.03, gf + (f - 1) * fh + 1.5, z, rot);
  k.box(-0.02, w + 0.02, top, top + 0.15, r, d, 'gray', NC);
  // 圓角前的人行道鋪面
  C.pave(k, -0.01, w + 0.01, -0.5, 0.05, -k.apron, r, C.MR.concrete);
  // 掛在圓弧 45 度的招牌
  const sign45 = (text, bg, fg, sw, sh, y, sub) => {
    const n = Math.SQRT1_2;
    sign(
      C,
      k,
      text,
      bg,
      fg,
      sw,
      sh,
      cx + dir * n * (r + 0.24),
      y,
      r - n * (r + 0.24),
      Math.atan2(dir * n, -n),
      sub
    );
  };
  return { k, cx, r, top, gf, fh, d, sideX, dir, rot, sign45 };
};

export default {
  drop: [
    // 原本 noShop 的填充樓
    'f2_915',
    'f2_916',
    'f2_918',
    'f2_919',
    'f2_908',
    'f1144',
  ],
  hide: [
    // 西南側
    'f2_917',
    'f2_907',
    // 東北側（街屋）
    'f1137',
    'f1136',
    'f1135',
    'f1134',
    'f1133',
    'f1132',
    'f1131',
    'f1130',
    'f1129',
    'f1128',
    'f1127',
    // 東北側（停車場與工地）
    'f1126',
    'f1125',
    'f1143',
    'f1142',
    'f1141',
    'f1140',
    'f1139',
    'f1138',
    'f1164',
    'f1166',
  ],
  // 自己掛了招牌的店（POI 不再另外掛）
  ownSign: [
    '撈油水 港式菠蘿茶飲',
    '六輪工房 宏佳騰中原旗艦店',
    '普仁衛浴建材',
    'AGMA 烤肉工廠',
    '胖嘟嘟現炸湯翅',
    '宏悅牙醫',
    '亞美の豆漿大王',
    '拉亞漢堡',
    'yc HAIR SALON',
    '味味香北平烤鴨',
    '168獨享鍋',
    '貝多芬牙醫',
    '台南虱目魚',
    '水餃小籠包',
    '佰元鍋',
    '松柏中醫診所',
    '李經國聯合診所',
    '大樹藥局',
    // 2026-05 街景看不到的店：巨田電器行（龍門洗衣／可承那一帶）、食玩天堂親子新樂園（環中東路口東角是工地）
    '巨田電器行',
    '食玩天堂親子新樂園',
  ],
  lots: [
    // ================= 西南側（+1）=================
    // RAMA VII 那棟 5 樓白磁磚的最後一跨：一樓鐵皮圍板
    W(749, 753, {
      nf: 5,
      wall: '#ecebe6',
      ground: 'shutter',
      sh: '#a9acae',
      noband: 1,
      door: 0,
      bal: 'rail',
    }),
    // 撈油水 Bolu：5 樓白磁磚、凸窗鐵窗，深灰長招牌、褐色雨遮；大勇四街口是圓角（custom）
    W(753, 764, {
      nf: 5,
      wall: WT,
      sign: ['Bolu 撈油水', '#3a3f45', '#efe6d6'],
      awn: '#7a5a4a',
      bal: 'cage',
    }),
    W(764, 768.5, {
      nf: 5,
      wall: WT,
      noband: 1,
      awn: '#7a5a4a',
      round: ['撈油水', '#2a2a2a', '#ffffff'],
      bal: 'grille',
      door: 0,
    }),
    // ---- 大勇四街以東：6 樓紅磚大樓（彭壽堂的圓角在 custom）----
    W(781.3, 790, {
      nf: 6,
      wall: RB,
      sign: ['aeontek 宏佳騰', '#e0383a', '#ffffff', '桃園車業 機車排氣檢驗站'],
      vert: ['宏佳騰機車', '#e0383a', '#ffffff'],
      ground: 'open',
      bikes: 4,
      bal: 'plain',
    }),
    W(790, 795, {
      nf: 6,
      wall: RB,
      sign: ['TOTO', '#2a2826', '#e8dcc0'],
      bal: 'plain',
      door: 0,
    }),
    // 6 樓白色窄樓：Caesar 直立看板，一樓暗色大門
    W(795, 799, {
      nf: 6,
      wall: '#e9e7e1',
      ground: 'gate',
      noband: 1,
      door: 0,
      vert: ['Caesar 凱撒衛浴', '#eef2f6', '#2a3a6a'],
      bal: 'plain',
    }),
    // AGMA 起司鍋：黑底彩字招牌、鐵捲門拉下，上方「烤肉工廠」布條與圓形黑招牌
    W(799, 805.5, {
      nf: 6,
      wall: '#e4e2dc',
      sign: ['AGMA 起司鍋', '#1e1e20', '#f2c23a'],
      sign2: ['烤肉工廠', '#f2ece4', '#c8282a'],
      round: ['烤肉工廠', '#1e1e20', '#ffffff'],
      ground: 'shutter',
      sh: '#8a8c8e',
      bal: 'plain',
    }),
    // 6 樓灰白老公寓：騎樓透明雨遮、鐵捲門
    W(805.5, 810, { nf: 6, wall: GW, ground: 'shutter', noband: 1, tin: 1, bal: 'grille' }),
    W(810, 814.5, {
      nf: 6,
      wall: GW,
      ground: 'shutter',
      noband: 1,
      tin: 1,
      bal: 'grille',
      door: 0,
    }),
    // 炸雞食堂（紅色大吊牌）與現炸海鮮攤、白色遮陽篷
    W(814.5, 819, {
      nf: 6,
      wall: '#d4d1c8',
      ground: 'stall',
      awn: '#f2f2ee',
      noband: 1,
      sign2: ['炸雞食堂 現炸現賣 6支100元', '#c8282a', '#f4e8c8'],
      banner: ['現炸海鮮', '#2a4aa0', '#ffffff'],
      bal: 'plain',
    }),
    W(819, 823.5, {
      nf: 6,
      wall: '#d4d1c8',
      sign: ['專售 大桃園地區工業地廠房', '#f4f2ee', '#c8282a', '200-8000 坪'],
      ground: 'stall',
      vert: ['工業地廠房', '#c8282a', '#ffffff'],
      bal: 'grille',
    }),
    W(823.5, 829, {
      nf: 5,
      wall: '#d4d1c8',
      ground: 'shutter',
      sh: '#d8d6cc',
      noband: 1,
      bal: 'grille',
    }),
    // 宏悅牙醫（後面有 f2_909，只做 9.5 m 深）
    W(829, 834, {
      nf: 5,
      d: 9.5,
      wall: '#d4d1c8',
      sign: ['宏悅牙醫', '#5a7ab8', '#ffffff'],
      vert: ['植牙專科 牙周病專科', '#c8282a', '#ffffff'],
      ground: 'shutter',
      sh: '#b8b8b4',
      bal: 'cage',
    }),
    // 5 樓白磁磚：粥攤（紅布蓋著）、灰色鐵捲門住家
    W(834, 839, { nf: 5, d: 9.5, wall: WT, ground: 'stall', noband: 1, bal: 'cage' }),
    W(839, 842, {
      nf: 5,
      d: 9.5,
      wall: WT,
      ground: 'shutter',
      sh: '#9a9c9e',
      noband: 1,
      door: 0,
      bal: 'plain',
    }),
    // 洪記豆漿大王（國泰街口，紅招牌轉到巷子那一面在 custom）
    W(842, 844.8, {
      nf: 5,
      d: 9.5,
      wall: '#d8d4ca',
      sign: ['洪記豆漿大王', '#c8282a', '#ffffff', '466-887'],
      vert: ['洪記豆漿大王', '#c8282a', '#ffffff'],
      bal: 'plain',
      door: 0,
    }),
    // ---- 國泰街以東 ----
    // 拉亞漢堡：5 樓白磁磚圓角轉角樓（圓角在 custom），黃綠招牌
    W(855.2, 858.5, {
      nf: 5,
      wall: '#e4e2dc',
      sign: ['LAYA BURGER 拉亞漢堡', '#a8c83a', '#22301a', 'WE START A DAY TOGETHER'],
      bal: 'open',
      door: 0,
    }),
    // 6 樓灰白公寓：兩間鐵捲門住家（褐、藍）、yc HAIR SALON、刻印
    W(858.5, 862, {
      nf: 6,
      wall: GW,
      ground: 'shutter',
      sh: '#6a4a3a',
      noband: 1,
      bal: 'grille',
    }),
    W(862, 865.5, {
      nf: 6,
      wall: GW,
      ground: 'shutter',
      sh: '#2f5f9a',
      noband: 1,
      door: 0,
      bal: 'grille',
    }),
    W(865.5, 870.5, {
      nf: 6,
      wall: GW,
      sign: ['yc HAIR SALON', '#f4f4f2', '#2a2a2a'],
      round: ['yc', '#f4f4f2', '#222222'],
      bal: 'plain',
    }),
    W(870.5, 875, {
      nf: 6,
      wall: '#e2e0d8',
      sign: ['專業刻印', '#3a8ac8', '#ffffff', '03-4378135'],
      vert: ['公司大小章', '#f2e8c0', '#2a2a2a'],
      ground: 'shutter',
      sh: '#9a9c9e',
      bal: 'plain',
    }),
    // 味味香烤鴨：6 樓白磁磚圓角轉角樓（圓角在 custom），紅白條紋雨遮，樓頂紅白大看板
    W(875, 883, {
      nf: 6,
      wall: '#ecebe4',
      sign: ['味味香烤鴨', '#f2e070', '#c8282a', '皮脆肉香 鮮嫩多汁 03-4162797'],
      awn: ['#c8282a', '#f4f4f2'],
      vert: ['現烤現切', '#f2d23a', '#c8282a'],
      bal: 'rail',
      roof: 'bill',
      bill: ['中北路二段 0925-611-037', '#f4f4f0', '#c8282a', 7.6, 2.6],
    }),

    // ================= 東北側（-1）=================
    // 大東：3 樓灰色老樓，二樓陽台、頂樓鐵皮加蓋（後面是 f1093，只做 10.5 m 深）
    E(768.3, 771.9, {
      nf: 3,
      d: 10.5,
      wall: '#a9a79f',
      sign: ['大東 燙or染 999 離子燙 799', '#2a4aa0', '#ffffff', '男女剪髮 150'],
      vert: ['男女剪髮 一律150元', '#f2d23a', '#c8282a'],
      bal: 'grille',
      roof: 'shack',
    }),
    // 饗樂樂 獨享鍋：紅底白字招牌，樓上整面火鍋大看板
    E(771.9, 776.9, {
      nf: 3,
      d: 10.5,
      wall: '#b4b0a8',
      sign: ['饗樂樂 獨享鍋', '#d42a3a', '#ffffff', '肉品買1送1'],
      big: ['饗樂樂 獨享鍋\n無限放題', '#f6f2ea', '#c8282a'],
      bigFrom: 2,
      bal: 'plain',
    }),
    E(776.9, 781.2, {
      nf: 3,
      wall: '#d8d7d1',
      sign: ['貝多芬牙醫診所', '#cfcfca', '#3a3a3a'],
      bal: 'plain',
    }),
    E(781.2, 786.2, {
      nf: 5,
      wall: RB,
      sign: ['台南無刺 虱目魚專賣店', '#f2efe6', '#1e1e1e', '中壢店'],
      vert: ['虱目魚專賣店', '#2a2a2a', '#f4f4f2'],
      bal: 'cage',
    }),
    // 龍門洗衣：2 樓鐵皮，屋頂鐵架上白色大看板
    E(786.2, 791, {
      nf: 2,
      wall: '#c9c6bd',
      sign: ['龍門洗衣', '#3a9a4a', '#ffffff'],
      tin: 1,
      bal: 'plain',
      roof: 'bill',
      bill: ['龍門洗衣\n0975-856-138', '#f4f4f0', '#2a6a3a', 4.6, 3.4],
    }),
    E(791, 795.6, {
      nf: 2,
      wall: '#cfd0cd',
      sign: ['YAMAHA 可承', '#f6f6f4', '#c8282a', 'Ka Cheng Motor Shop'],
      ground: 'open',
      bikes: 3,
      bal: 'plain',
      door: 0,
    }),
    // 水餃小籠包：4 樓褐色磁磚、陽台花台、黃色雨遮
    E(795.6, 800.2, {
      nf: 4,
      wall: '#a87866',
      awn: '#e8c040',
      noband: 1,
      vert: ['水餃 小籠包', '#f4f4f2', '#c8282a'],
      bal: 'rail',
    }),
    // 佰元鍋：一樓鐵皮店，上面鐵架大看板
    E(800.2, 805, {
      nf: 1,
      wall: '#8a8a86',
      sign: ['佰元鍋', '#2a2a2a', '#f2d23a'],
      vert: ['佰元鍋', '#c8282a', '#ffffff'],
      roof: 'bill',
      bill: ['188吃到飽\n佰元鍋', '#f4efe6', '#c8282a', 4.6, 4.0],
    }),
    // 松柏中醫診所：一樓突出的店面，後面退縮 7 樓灰白大樓（右邊一間藍色鐵捲門在 custom）
    E(805, 814, {
      nf: 1,
      d: 16,
      wall: '#d6d6d0',
      sign: ['松柏中醫診所', '#2f9a7a', '#ffffff'],
      ground: 'shutter',
      sh: '#c8c4b8',
      tower: { nf: 6, back: 3, wall: '#dcdcd6', balc: '#b8b8b2' },
    }),
    // 翌盛法律事務所：7 樓磚紅磁磚窄樓，一樓李經國聯合診所
    E(814, 819, {
      nf: 7,
      wall: '#a8705e',
      sign: ['李經國聯合診所', '#1e3a2a', '#f4f4f4'],
      sign2: ['翌盛法律事務所', '#1f3f7a', '#ffffff'],
      vert: ['翌盛法律事務所', '#1f3f7a', '#ffffff'],
      bal: 'arch',
    }),
    // 大樹藥局：2 樓磚牆，綠色長招牌，樓頂大看板
    E(819, 833, {
      nf: 2,
      d: 16,
      wall: '#9a6a58',
      sign: ['大樹 Great Tree', '#2f9a4a', '#ffffff', '藥 中壢環東藥局'],
      bal: 'plain',
      bikes: 4,
      roof: 'bill',
      bill: ['藥\n奶粉婦嬰 寵物生活 輔具醫材 藥品保健', '#f4f4f0', '#2f9a4a', 11, 4.2],
    }),
  ],
  custom(C) {
    const { FRONT, lcg, MR } = C;
    // ---- 西南側 ----
    // 撈油水：大勇四街口的圓角，巷子那一面上半是玻璃帷幕、「敦煌舞蹈團 中原教室」綠招牌
    {
      const c = roundCorner(C, 1, 768.5, 771.5, SR, {
        nf: 5,
        wall: WT,
        at: 's1',
        signCol: '#3a3f45',
      });
      const { k } = c;
      c.sign45('撈油水', '#3a3f45', '#efe6d6', 2.0, 0.65, c.gf - 0.5);
      k.box(c.sideX, c.sideX + 0.12, c.gf + 3.0, c.top - 0.3, c.r + 0.5, c.d - 0.5, '#7d93a0', NC);
      sign(
        C,
        k,
        '敦煌舞蹈團 中原教室',
        '#1f6a4a',
        '#ffffff',
        7.0,
        0.9,
        c.sideX + 0.14,
        c.gf + 2.3,
        (c.r + c.d) / 2,
        c.rot
      );
    }
    // 彭壽堂：紅磚大樓在大勇四街口的圓角，深色木招牌
    {
      const c = roundCorner(C, 1, 778.3, 781.3, SR, {
        nf: 6,
        wall: RB,
        at: 's0',
        band: '#b06a58',
        signCol: '#3a3430',
      });
      c.sign45('彭壽堂', '#3a3430', '#d8d0c0', 2.2, 0.75, c.gf - 0.5);
      c.k.plane(
        C.ROWT.vert('zb機車排氣檢驗站#f4f4f2', '#f4f4f2', '#2a4aa0', '機車排氣檢驗站'),
        0.6,
        4.4,
        c.sideX - 0.04,
        2.3,
        c.r + 0.6,
        c.rot,
        { emissive: 0.3 }
      );
    }
    // 白色窄樓前的行道樹
    {
      const k = seg(C, 1, 795, 799, SR);
      tree(C, k, 2.2, -1.9, 7.5, 2.4, lcg(11741));
    }
    // 洪記豆漿大王：紅招牌轉到國泰街那一面
    {
      const k = seg(C, 1, 842, 844.8, SR);
      k.box(k.W, k.W + 0.22, 2.5, 3.3, 0.1, 8.5, '#c8282a', NC);
      sign(
        C,
        k,
        '洪記豆漿大王 466-887',
        '#c8282a',
        '#ffffff',
        8.2,
        0.75,
        k.W + 0.24,
        2.9,
        4.3,
        Math.PI / 2
      );
    }
    // 拉亞漢堡：國泰街口的圓角，黃綠招牌
    {
      const c = roundCorner(C, 1, 852.2, 855.2, SR, {
        nf: 5,
        wall: '#e4e2dc',
        at: 's0',
        signCol: '#a8c83a',
      });
      c.sign45('拉亞漢堡', '#a8c83a', '#22301a', 2.2, 0.7, c.gf - 0.5);
      sign(
        C,
        c.k,
        'WE START A DAY TOGETHER',
        '#a8c83a',
        '#22301a',
        6.0,
        0.8,
        c.sideX - 0.04,
        c.gf - 0.5,
        (c.r + c.d) / 2,
        c.rot
      );
    }
    // 味味香烤鴨：環中東路口的圓角，黃色大招牌轉到環中東路那一面
    {
      const c = roundCorner(C, 1, 883, 886, SR, {
        nf: 6,
        wall: '#ecebe4',
        at: 's1',
        signCol: '#f2e070',
      });
      c.sign45('味味香烤鴨', '#f2e070', '#c8282a', 2.4, 0.75, c.gf - 0.5);
      c.k.box(c.sideX, c.sideX + 0.2, c.gf - 0.9, c.gf - 0.1, c.r, c.d - 0.5, '#f2e070', NC);
      sign(
        C,
        c.k,
        '味味香烤鴨 皮脆肉香',
        '#f2e070',
        '#c8282a',
        c.d - c.r - 0.8,
        0.75,
        c.sideX + 0.22,
        c.gf - 0.5,
        (c.r + c.d - 0.5) / 2,
        c.rot
      );
    }
    // ---- 東北側 ----
    // 松柏中醫隔壁那一間的藍色鐵捲門（s 811～814）
    {
      const k = seg(C, -1, 811, 814, SL);
      k.plane(C.shutterTex('#2a3f6a'), 2.6, 2.3, 1.5, 1.15, -0.04, FRONT);
    }
    // 大樹藥局：柱子上的綠色直立招牌、紅色「母嬰用品館」招牌
    {
      const k = seg(C, -1, 819, 833, SL);
      // 停車場那頭往西：輔具·醫材、奶粉·婦嬰、處方·領藥（騎樓的深色方柱）
      for (const [x, t] of [
        [0.7, '輔具·醫材'],
        [7.0, '奶粉·婦嬰'],
        [13.2, '處方·領藥'],
      ]) {
        k.box(x - 0.35, x + 0.35, 0, 2.45, -0.3, 0, '#3a3a3a', NC);
        k.plane(
          C.ROWT.vert(`zb${t}#2f9a4a`, '#2f9a4a', '#ffffff', t),
          0.65,
          1.9,
          x,
          1.3,
          -0.32,
          FRONT,
          {
            emissive: 0.3,
          }
        );
      }
      sign(C, k, 'Pets 寵物生活專區', '#e8a0a0', '#ffffff', 3.2, 0.5, 10.1, 1.9, -0.12, FRONT);
      k.box(0.4, 3.6, 2.5, 3.3, -0.36, -0.28, '#d8343a', NC);
      sign(C, k, '嬰 母嬰用品館', '#d8343a', '#ffffff', 3.1, 0.7, 2.0, 2.9, -0.37, FRONT);
    }
    // 平面收費停車場（s 833～860）：柏油、白線、前緣矮柱鐵鍊，靠大樹那頭是出入口（柵欄機、票機），中間藍色與橘色繳費柱；
    // 靠工地那頭立著大樹藥局的綠色直立高柱招牌（藥、大樹 Great Tree、P）
    {
      // 整塊地往東南低半公尺多：柏油、人行道照地勢鋪成斜面，白線貼著柏油畫，貼地的柱子、票機往下補到地面
      const k = C.sink(seg(C, -1, 833, 860, SL), 1),
        w = k.W,
        D = 24;
      C.pave(k, -0.01, w + 0.01, -0.5, 0.05, -k.apron, 0, MR.concrete);
      C.pave(k, 0, w, -0.5, 0.045, 0, D, '#4f5154');
      const line = (x0, x1, z0, z1) => C.drape(k, x0, x1, z0, z1, '#efefea', 0.06, false);
      for (const [z0, z1] of [
        [1.2, 6.2],
        [11.5, 16.5],
        [17.5, 22.5],
      ])
        for (let x = 1.5; x < w - 6.5; x += 2.5) line(x, x + 0.1, z0, z1);
      for (const z of [6.2, 11.5]) line(1.5, w - 6.5, z, z + 0.1);
      // 前緣矮柱與鐵鍊（出入口 x 21～27 不圍）
      for (let x = 0.4; x < 20.5; x += 2.4) {
        k.cyl(x, -0.3, 0.1, 0, 0.85, '#2a2a2a', { seg: 8 });
        if (x + 2.4 < 20.5) k.box(x, x + 2.4, 0.62, 0.66, -0.32, -0.28, '#6a6c70', NC);
      }
      // 出入口：票機、柵欄機、P 牌
      k.box(21.0, 21.6, 0, 1.3, 1.0, 1.5, '#e8b81e');
      k.box(21.2, 21.5, 0, 1.0, 3.8, 4.2, '#e8742a');
      k.box(21.6, 24.6, 0.95, 1.03, 4.0, 4.08, '#f2f2ee', NC);
      for (let x = 22; x < 24.5; x += 0.8)
        k.box(x, x + 0.4, 0.95, 1.035, 3.99, 4.09, '#d8282a', NC);
      k.cyl(26.4, -0.6, 0.05, 0, 2.6, '#8a8d90', { seg: 6 });
      k.plane(
        C.paint('P', '#1f4aa0', '#ffffff', '入口', 0.7, 1.0),
        0.7,
        1.0,
        26.4,
        2.2,
        -0.66,
        FRONT,
        {
          emissive: 0.3,
        }
      );
      // 繳費柱
      for (const [x, col] of [
        [11.0, '#2a5ab0'],
        [4.6, '#e8742a'],
      ]) {
        k.box(x, x + 0.5, 0, 1.9, 0.5, 0.8, col);
        k.box(x + 0.08, x + 0.42, 1.1, 1.5, 0.48, 0.5, '#e8eef2', NC);
      }
      // 大樹的直立高柱招牌
      {
        const x = 1.2;
        k.box(x - 0.18, x + 0.18, 0, 8.6, -0.6, -0.25, '#2f8a44');
        k.box(x - 0.45, x + 0.45, 4.4, 9.8, -0.75, -0.1, '#2f9a4a', NC);
        k.plane(
          C.ROWT.vert('zb大樹 Great Tree#2f9a4a', '#2f9a4a', '#ffffff', '大樹'),
          0.8,
          3.0,
          x,
          6.4,
          -0.76,
          FRONT,
          { emissive: 0.3 }
        );
        sign(C, k, '藥', '#2f9a4a', '#ffffff', 0.85, 0.85, x, 9.2, -0.76, FRONT);
        k.box(x - 0.4, x + 0.4, 2.4, 3.2, -0.72, -0.62, '#1f4aa0', NC);
        sign(C, k, 'P', '#1f4aa0', '#ffffff', 0.75, 0.75, x, 2.8, -0.73, FRONT);
        // 底座斜紋
        k.box(x - 0.3, x + 0.3, 0, 1.4, -0.7, -0.15, '#e8742a');
      }
    }
    // 工地（s 860～884，環中東路口東角）：停車場那一側灰色鐵皮圍籬（掛競選看板，只畫色塊）、
    // 退在後面包著鷹架的 3 樓深色新建物＋頂樓鋼構，前面一片鋪面空地、橘色警示帶與三角錐
    {
      const k = C.sink(seg(C, -1, 860, 884, SL), 1),
        w = k.W,
        x0 = 2.0,
        x1 = 21.5,
        z0 = 3.2,
        z1 = 12.7,
        h = 9.6;
      C.pave(k, -0.01, w + 0.01, -0.5, 0.05, -k.apron, z0, '#b8b4aa');
      // 主體與樓層線、一樓白柱深色玻璃
      k.box(x0, x1, 0, h, z0, z1, '#45484b');
      for (const y of [3.4, 6.5])
        k.box(x0 - 0.04, x1 + 0.04, y, y + 0.18, z0 - 0.04, z1, '#4a4e52', NC);
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4)
        k.box(x - 0.3, x + 0.3, 0, 3.4, z0 - 0.12, z0 + 0.3, '#e4e2dc', NC);
      // 頂樓鋼構
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4)
        for (const z of [z0, z1 - 0.2])
          k.box(x - 0.12, x + 0.12, h, h + 3.6, z, z + 0.24, '#3a3d40', NC);
      for (const z of [z0, z1 - 0.2]) k.box(x0, x1, h + 3.4, h + 3.6, z, z + 0.24, '#3a3d40', NC);
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4)
        k.box(x - 0.1, x + 0.1, h + 3.4, h + 3.6, z0, z1, '#3a3d40', NC);
      // 鷹架：正面與路口側面一格一格的鋼管
      const sx = '#8e9296';
      for (let x = x0 - 0.8; x <= x1 + 0.9; x += 1.8)
        k.box(x, x + 0.06, 0, h + 4.0, z0 - 1.0, z0 - 0.94, sx, NC);
      for (let y = 2; y <= h + 4; y += 2)
        k.box(x0 - 0.8, x1 + 0.9, y, y + 0.06, z0 - 1.0, z0 - 0.94, sx, NC);
      for (let z = z0 - 1.0; z <= z1 + 0.1; z += 1.8)
        k.box(x0 - 1.0, x0 - 0.94, 0, h + 4.0, z, z + 0.06, sx, NC);
      for (let y = 2; y <= h + 4; y += 2)
        k.box(x0 - 1.0, x0 - 0.94, y, y + 0.06, z0 - 1.0, z1, sx, NC);
      // 警示帶與三角錐
      k.box(x0 - 1.5, x1 + 1, 0.9, 0.96, z0 - 1.8, z0 - 1.76, '#f08a1e', NC);
      for (const x of [3, 8.5, 14, 19.5]) {
        k.cyl(x, z0 - 2.6, 0.2, 0, 0.12, '#e8742a', { seg: 8 });
        k.cyl(x, z0 - 2.6, 0.12, 0.12, 0.7, '#f08a1e', { seg: 8 });
      }
      // 停車場那一側的灰色鐵皮圍籬（往後到 off ≈ 30）與看板色塊
      const fx = w - 0.35;
      k.box(fx, fx + 0.12, 0, 4.2, -0.2, 20, '#5a5e62');
      for (let z = 0; z < 20; z += 4) k.box(fx - 0.1, fx, 0, 4.4, z, z + 0.12, '#44484c', NC);
      for (const [z, bg] of [
        [3.5, '#2a5ab0'],
        [10.5, '#3aa06a'],
        [16.0, '#f4f4f0'],
      ])
        k.box(fx + 0.12, fx + 0.16, 1.0, 3.6, z - 2.6, z + 2.6, bg, NC);
    }
  },
  // 圓角轉角、停車場、工地 custom 佔的地
  footprints(F) {
    return [
      F(R, 768.5, 771.5, 1, SR, 13, 3.7),
      F(R, 778.3, 781.3, 1, SR, 13, 3.7),
      F(R, 852.2, 855.2, 1, SR, 13, 3.7),
      F(R, 883, 886, 1, SR, 13, 3.7),
      F(R, 833, 860, -1, SL, 24, 3.9),
      F(R, 860, 884, -1, SL, 20, 3.9),
    ];
  },
};
