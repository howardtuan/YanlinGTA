// 新中北路 s 524.5～630 兩側（新中一街／新中二街路口一帶；Google 街景 2026-05、國土測繪 2024 正射、Google 衛星）。
//   北側（+1）由東到西：紅褐磚 4 樓（兩間小吃，東間紅白條紋雨遮、橘色直立招牌看不清）→ 灰綠窄樓（3 樓紅布條「售本棟」）→ 米褐 5 樓 →
//     SUZUKI 機車行 → 藍灰框架轉角大樓（兩扇藍鐵捲門）→ 新中一街 → 御膳園轉角 → 灰色 5 樓小吃 → 喬美洗衣 → 東雅髮藝 → EATING → 同悅老磚房 → 灰色 2 樓老屋 →
//     隆華燒臘快餐 → 晨美好 → 高記商行 → gogoro 社區店 → 不倒翁牛排（單層，後面退縮一棟白色 4 樓）→ 往北的機車停車通道（西邊接游泳池，X7）
//   南側（-1）由東到西：中原收費停車場的鐵網圍籬（人行道上整排機車）→ 新中二街 → 全家轉角大樓 → 橘白雨遮小吃 → Oh My Bread →
//     俊誠車業 gogoro／俊誠機車行 YAMAHA 轉角 → 往南小巷 → 全人教育村前草坪（ZoneG 自建，不動）
//   看不清的招牌一律不放字（N1 橘色直立招牌、N2／N3 一樓店名、Oh My Bread 中文名、停車場黃色看板、通道藍色告示牌）。
//   遊戲裡的新中一街（OSM）在 s 561.4～567.9；新中一街上的街景拍攝點在 s≈565.8，實景路口位置和遊戲一致，
//   所以 N5 做到 s 561.2、西轉角從 s 568.3 起（審查時更正：原本以為實景路口在 s 566～574，留了一塊空地）；
//   往南小巷在遊戲裡往東南彎，俊誠機車行西半間只做到 s 611.2、深 5.5 m，後面不伸進巷子。
const R = 'X',
  SN = 7.4, // 北側立面離中心線
  SS = 7.8; // 南側立面離中心線
const PI = Math.PI;
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
const NC = { col: false };

export default {
  // f948～f955：北側 s 524.5～561 的填充樓，由 N1～N5 取代（f948 那格實景是大樹，DROP 後留空）
  drop: ['f948', 'f949', 'f950', 'f951', 'f952', 'f953', 'f954', 'f955'],
  ownSign: ['全家便利商店'],
  lots: [
    // ---- 北側 ----
    // 審查更正（s 531、543、553 三個垂直街景量測）：N1 紅磚樓實景在 s≈529.5～536.5，東邊 s 524.5～529.5 是大樹和機車（不蓋），
    //   N2～N5 跟著往西挪 1～2 m；SUZUKI 實景只有約 5 m 寬
    // N1 紅褐磚 4 樓（一棟兩間店面；東側山牆、橘色直立招牌在 custom）
    [
      R,
      529.6,
      533,
      1,
      {
        nf: 4,
        wall: '#a8705a',
        ground: 'open',
        awn: ['#c8282a', '#f2efe8'],
        bal: 'plain',
        d: 14,
        noband: 1,
        roof: 'tank',
        door: 0,
        bikes: 2,
      },
    ],
    [
      R,
      533,
      536.2,
      1,
      { nf: 4, wall: '#a8705a', ground: 'open', bal: 'plain', d: 14, noband: 1, roof: 'none' },
    ],
    // N2 灰綠窄樓：3 樓整面白色鐵窗籠、頂樓鐵皮加蓋（「售本棟」布條在 custom）
    [
      R,
      536.2,
      541.8,
      1,
      {
        nf: 4,
        wall: '#8f9c80',
        ground: 'open',
        bal: 'cage',
        d: 14,
        noband: 1,
        roof: 'shack',
        door: 0,
      },
    ],
    // N3 米褐磁磚 5 樓
    [
      R,
      541.8,
      547.2,
      1,
      { nf: 5, wall: '#c8b79b', ground: 'shop', bal: 'plain', d: 14, noband: 1, roof: 'tank' },
    ],
    // N4 SUZUKI 機車行：開放店面、2 樓白色鐵花陽台＋鐵窗
    [
      R,
      547.2,
      552.4,
      1,
      {
        nf: 4,
        wall: '#9a9890',
        ground: 'open',
        sign: ['SUZUKI', '#f8f8f6', '#1f2f6e'],
        bal: 'cage',
        d: 14,
        roof: 'none',
        door: 0,
        bikes: 3,
      },
    ],
    // N5 新中一街東轉角：米白窗間牆＋藍灰框架（框架在 custom）、兩扇藍鐵捲門
    [
      R,
      552.4,
      561.2,
      1,
      {
        nf: 4,
        wall: '#cfc9b8',
        ground: 'shutter',
        sh: '#3a6ea8',
        bal: 'plain',
        d: 14,
        noband: 1,
        roof: 'none',
        door: 0,
      },
    ],
    // N6 新中一街西轉角（側面紅底黃字布招「御膳園」在 custom）
    //   審查更正：街景車在新中一街上的拍攝點在 s≈565.8，實景路口就在遊戲的新中一街（s 561.4～567.9），
    //   s 568～579 是三棟窄街屋：御膳園轉角 4 樓 → 灰色小磁磚 5 樓小吃 → 白色花瓶欄杆 2 樓洗衣店（直立招牌「喬美洗衣」）
    [
      R,
      568.3,
      571.8,
      1,
      { nf: 4, wall: '#dfe3e6', ground: 'open', bal: 'plain', d: 14, noband: 1, roof: 'tank' },
    ],
    [
      R,
      571.8,
      575.5,
      1,
      {
        nf: 5,
        wall: '#a9a8a2',
        ground: 'open',
        awn: '#d8d2c2',
        bal: 'plain',
        d: 14,
        noband: 1,
        roof: 'none',
        door: 0,
      },
    ],
    [
      R,
      575.5,
      579,
      1,
      {
        nf: 2,
        wall: '#e8e6e0',
        ground: 'shop',
        vert: ['喬美洗衣', '#ffffff', '#1a1a1a'],
        bal: 'rail',
        d: 14,
        noband: 1,
        roof: 'none',
      },
    ],
    // N7 東雅髮藝（一樓上方綠色琉璃瓦小披簷、頂樓綠色浪板鋼架在 custom）：實景 2 樓＋頂樓鋼架，不是 3 樓
    [
      R,
      579,
      584,
      1,
      {
        nf: 2,
        wall: '#a5a49c',
        ground: 'shop',
        sign: ['東雅髮藝', '#1a1a1a', '#ffffff'],
        vert: ['東雅髮藝', '#ffffff', '#8a1c1c'],
        bal: 'plain',
        d: 14,
        roof: 'none',
      },
    ],
    // N8 EATING（頂樓鋼架在 custom）
    [
      R,
      584,
      589,
      1,
      {
        nf: 3,
        wall: '#e4e2dc',
        ground: 'shop',
        sign: ['EATING', '#3a3c3f', '#ffffff', 'Brunch & Dinner'],
        round: ['Eating', '#1f3360', '#ffffff'],
        bal: 'plain',
        d: 14,
        roof: 'none',
        door: 0,
      },
    ],
    // N9 老磚造 2 樓（右側一串紅底白字方塊招牌、頂樓鋼構架在 custom）
    [
      R,
      589,
      594,
      1,
      {
        nf: 2,
        wall: '#8b5a48',
        ground: 'open',
        bal: 'plain',
        d: 12,
        noband: 1,
        roof: 'none',
        door: 0,
      },
    ],
    // N10 灰色 2 樓老屋：藍灰鐵捲門、頂樓鏤空花磚女兒牆（custom）
    [
      R,
      594,
      599,
      1,
      {
        nf: 2,
        wall: '#8d8a84',
        ground: 'shutter',
        sh: '#5a7088',
        bal: 'plain',
        d: 12,
        noband: 1,
        roof: 'none',
        door: 0,
      },
    ],
    // N11 隆華燒臘快餐
    [
      R,
      599,
      604,
      1,
      {
        nf: 4,
        wall: '#e2ddd0',
        ground: 'open',
        sign: ['隆華燒臘快餐', '#f2c81e', '#c8281e', '外送專線：03-4518166'],
        bal: 'plain',
        d: 14,
        roof: 'shack',
        door: 0,
      },
    ],
    // N12 晨美好（紅色雨遮；3 樓綠色雨遮在 custom）
    [
      R,
      604,
      608,
      1,
      {
        nf: 4,
        wall: '#b4b0a6',
        ground: 'shop',
        sign: ['晨美好', '#b8652a', '#ffffff'],
        awn: '#b8282a',
        bal: 'grille',
        d: 14,
        roof: 'none',
        door: 0,
      },
    ],
    // N13 高記商行
    [
      R,
      608,
      613,
      1,
      {
        nf: 3,
        wall: '#cbbfa6',
        ground: 'shutter',
        sh: '#3a6ea8',
        sign: ['高記商行', '#151515', '#ffffff'],
        vert: ['高記商行', '#ffffff', '#151515'],
        bal: 'plain',
        d: 14,
        roof: 'none',
      },
    ],
    // N14 gogoro 社區店（藍色直立燈箱在 custom）
    [
      R,
      613,
      618,
      1,
      {
        nf: 2,
        wall: '#c6c2b6',
        ground: 'open',
        sign: ['gogoro', '#1e5bb8', '#ffffff', '社區店'],
        bal: 'plain',
        d: 12,
        roof: 'tank',
        door: 0,
        bikes: 3,
      },
    ],
    // N15 不倒翁牛排：單層轉角（後面退縮的 4 樓白樓、側面招牌、不倒翁人偶在 custom）
    [
      R,
      618,
      624,
      1,
      {
        nf: 1,
        gf: 3.4,
        wall: '#ece8dc',
        ground: 'open',
        sign: ['不倒翁牛排', '#ee8a1e', '#1a1a1a', 'Tumbler Steak'],
        d: 9.4,
        door: 0,
        roofCol: '#c9c9c4',
      },
    ],
    // ---- 南側（s 530～563.2 是停車場圍籬，在 custom）----
    // 審查更正（垂直街景量測：全家西界 s≈585.7、小吃／Oh My Bread 交界 s≈597.3、YAMAHA 西界 s≈611.3、
    //   新中二街上的拍攝點推算全家東側轉角 s≈573）：原本整排偏西約 3 m，而且漏了全家西邊一棟灰色 4 樓
    // S2 全家轉角住宅大樓 7 樓（轉角台階在 custom）
    [
      R,
      573.5,
      585.7,
      -1,
      {
        nf: 7,
        gf: 3.6,
        wall: '#e6e6e2',
        ground: 'shop',
        sign: ['全家 FamilyMart', '#ffffff', '#0a7a3a', null, 'fam'],
        bal: 'cage',
        d: 15,
        set: SS,
        roof: 'tank',
        door: 0,
      },
    ],
    // S2b 灰色 4 樓：一樓灰色浪板店面（紅色直招字看不清，不放）、樓上白色拱形鐵窗
    [
      R,
      585.7,
      591.4,
      -1,
      {
        nf: 4,
        wall: '#a7a39a',
        ground: 'open',
        bal: 'arch',
        d: 15,
        set: SS,
        noband: 1,
        roof: 'none',
        door: 0,
      },
    ],
    // S3 小吃店：橘白條紋雨遮（3 樓白色欄杆）
    [
      R,
      591.4,
      597.3,
      -1,
      {
        nf: 4,
        wall: '#9b978e',
        ground: 'open',
        awn: ['#e8742a', '#f4f0e8'],
        bal: 'plain',
        d: 15,
        set: SS,
        noband: 1,
        roof: 'none',
        door: 0,
        bikes: 2,
      },
    ],
    // S4 Oh My Bread：木紋招牌板、綠色帆布雨遮、鐵捲門
    [
      R,
      597.3,
      602.3,
      -1,
      {
        nf: 4,
        wall: '#8f8c85',
        ground: 'shutter',
        sh: '#a4a39d',
        sign: ['Oh My Bread', '#8a5a36', '#ffffff'],
        awn: '#2f7a4a',
        bal: 'plain',
        d: 15,
        set: SS,
        roof: 'none',
        door: 0,
      },
    ],
    // S5 俊誠機車行（一間店，一樓整面白底大招牌：東邊 YAMAHA、西邊店名電話；東緣掛 gogoro 俊誠車業藍色側招在 custom）
    //   2～4 樓白色拱形鐵窗籠＋綠色雨遮；西半間收到 s 611.2、深 5.5 m，不伸進往南小巷
    [
      R,
      602.3,
      606.2,
      -1,
      {
        nf: 4,
        wall: '#b9b2a4',
        ground: 'open',
        sign: ['YAMAHA', '#ffffff', '#e2401e'],
        bal: 'arch',
        hood: '#2f7a4a',
        d: 16,
        set: SS,
        roof: 'none',
        door: 0,
        bikes: 3, // 往南小巷那面（街景 2026-05）：同一條白底紫字 SYM 三陽機車招牌延伸到這裡，下面灰色鐵捲門
        side: {
          at: 1,
          from: 5.7,
          to: 10.5,
          sign: ['三陽機車', '#f4f2ee', '#b0306a', '(03)463-2069'],
          ground: 'shutter',
          sh: '#9a9c9e',
        },
      },
    ],
    [
      R,
      606.2,
      611.2,
      -1,
      {
        nf: 4,
        wall: '#b9b2a4',
        ground: 'open',
        sign: ['俊誠機車行', '#ffffff', '#1f2f6e', '機車代驗中心・(03)463-2069'],
        bal: 'arch',
        hood: '#2f7a4a',
        d: 5.5,
        set: SS,
        roof: 'none',
        door: 0,
        bikes: 3, // 往南小巷那面（街景 2026-05）：路口一小段橘色 KYMCO、接著白底紫字 SYM 三陽機車招牌，一樓開放店面擺安全帽
        side: { at: 1, sign: ['SYM 三陽機車', '#f4f2ee', '#b0306a'], ground: 'open', to: 5.2 },
      },
    ],
  ],
  custom(C) {
    const { MR, FRONT, paint, bike, bikeCols, YHT, sg } = C;
    const top4 = 3.3 + 3 * 3.0; // 4 樓街屋屋頂高
    // ---- 北側 ----
    // N1 東側山牆（白灰水泥面＋兩台冷氣）與橘色直立招牌（字看不清，不寫字）
    {
      const k = seg(C, 1, 529.6, 536.2, SN);
      k.box(-0.08, -0.01, 0, top4, 0.1, 14, '#c9c6bd', NC);
      for (const [z, y] of [
        [3.5, 4.2],
        [8.5, 7.2],
      ]) {
        k.box(-0.55, -0.08, y, y + 0.5, z, z + 0.8, '#e8e8e4', NC);
        k.box(-0.56, -0.54, y + 0.06, y + 0.44, z + 0.05, z + 0.75, '#9a9a94', NC);
      }
      k.box(0.6, 0.75, 3.6, 7.2, -1.1, -0.2, '#e2672a', NC); // 東緣
    }
    // N2 3 樓紅布條「售本棟」（旁邊仲介照片、電話看不清，不放）
    {
      const k = seg(C, 1, 536.2, 541.8, SN);
      k.plane(
        paint('售本棟', '#c8202a', '#ffffff', null, 2.4, 0.9),
        2.4,
        0.9,
        1.6,
        7.1,
        -0.8,
        FRONT,
        {
          emissive: 0.15,
        }
      );
    }
    // N5 藍灰框架：直柱、每層窗下腰帶、女兒牆；兩扇鐵捲門中間的柱
    {
      const k = seg(C, 1, 552.4, 561.2, SN),
        w = k.W,
        F = '#7a8ba2';
      for (const x of [0, w / 2 - 0.2, w - 0.4]) k.box(x, x + 0.4, 0, top4 + 0.9, -0.25, 0, F, NC);
      for (let f = 1; f < 4; f++) {
        const y = 3.3 + (f - 1) * 3.0;
        k.box(0, w, y - 0.05, y + 0.6, -0.2, 0, F, NC);
      }
      k.box(0, w, top4, top4 + 0.9, -0.25, 0.15, F, NC);
      k.box(w - 0.15, w, top4, top4 + 0.9, 0, 14, F, NC);
      k.box(0, w, 2.3, 2.55, -0.3, 0, F, NC);
    }
    // N6 新中一街這面（東側）的紅底黃字布招「御膳園」
    {
      const k = seg(C, 1, 568.3, 571.8, SN);
      k.plane(
        paint('御\n膳\n園', '#c8202a', '#f6d21e', null, 1.1, 3.0),
        1.1,
        3.0,
        -0.06,
        5.2,
        1.4,
        -PI / 2,
        {
          emissive: 0.2,
        }
      );
    }
    // N7 一樓上方綠色琉璃瓦小披簷
    {
      const k = seg(C, 1, 579, 584, SN);
      k.box(0.05, k.W - 0.05, 3.32, 3.42, -0.85, 0, '#2f7a46', NC);
      k.box(0.05, k.W - 0.05, 3.42, 3.62, -0.5, 0, '#3f8a52', NC);
    }
    // N8、N9 頂樓鋼架
    const frame = (s0, s1, y, rc = MR.roof) => {
      const k = seg(C, 1, s0, s1, SN),
        w = k.W;
      for (const x of [0.4, w - 0.5])
        for (const z of [1.5, 8.5]) k.box(x, x + 0.1, y, y + 2.4, z, z + 0.1, '#5a5d60', NC);
      for (const z of [1.5, 8.5]) k.box(0.4, w - 0.4, y + 2.3, y + 2.4, z, z + 0.1, '#5a5d60', NC);
      k.box(0.3, w - 0.3, y + 2.4, y + 2.48, 1.3, 8.8, rc, NC);
    };
    frame(579, 584, 3.3 + 3.0 + 0.12, '#3f8a6a'); // 東雅髮藝頂樓綠色浪板鋼架
    frame(584, 589, 3.3 + 2 * 3.0 + 0.12);
    frame(589, 594, 3.3 + 3.0 + 0.12);
    // N9 右側一串紅底白字方塊招牌：同悅／休閒／運動／鞋（垂直立面，兩面都有字）
    {
      const k = seg(C, 1, 589, 594, SN);
      k.box(0.36, 0.42, 2.3, 5.6, -0.95, -0.05, '#4a4d50', NC);
      ['同悅', '休閒', '運動', '鞋'].forEach((t, j) => {
        const y = 5.2 - j * 0.8;
        k.box(0.34, 0.44, y - 0.36, y + 0.36, -0.9, -0.18, '#c8281e', NC);
        for (const sd of [-1, 1])
          k.plane(
            paint(t, '#c8281e', '#ffffff', null, 0.72, 0.72),
            0.72,
            0.72,
            0.39 + sd * 0.06,
            y,
            -0.54,
            (sd * PI) / 2,
            {
              emissive: 0.3,
            }
          );
      });
    }
    // N10 頂樓鏤空花磚女兒牆
    {
      const k = seg(C, 1, 594, 599, SN),
        y = 3.3 + 3.0;
      k.box(0, k.W, y, y + 0.15, -0.1, 0.1, '#8d8a84', NC);
      k.box(0, k.W, y + 0.95, y + 1.05, -0.1, 0.1, '#8d8a84', NC);
      for (let x = 0; x < k.W - 0.1; x += 0.42)
        k.box(x, x + 0.14, y + 0.15, y + 0.95, -0.08, 0.08, '#8d8a84', NC);
    }
    // N12 3 樓綠色雨遮
    {
      const k = seg(C, 1, 604, 608, SN),
        y = 3.3 + 3.0 + 2.3;
      k.box(0.3, k.W - 0.3, y, y + 0.08, -0.85, 0, '#2f7a4a', NC);
    }
    // N14 藍色直立燈箱（沒有字，街景在西緣）
    {
      const k = seg(C, 1, 613, 618, SN);
      k.box(k.W - 0.45, k.W - 0.25, 3.4, 6.0, -1.1, -0.2, '#1e5bb8', NC);
    }
    // N15 不倒翁：後面退縮的白色 4 樓、西側面也包一圈招牌、轉角的不倒翁人偶
    {
      const k = seg(C, 1, 618, 624, SN),
        w = k.W;
      k.box(0, w, 0, top4, 9.6, 19.6, 'wall#ecebe6');
      for (let f = 0; f < 4; f++) {
        const y = f === 0 ? 3.4 : 3.3 + (f - 1) * 3.0 + 1.4;
        if (f) k.plane(YHT.win(), w - 1.4, 1.3, w / 2, y, 9.57, FRONT);
        for (const z of [12.5, 16.5])
          k.plane(YHT.win(), 1.3, 1.2, w + 0.03, f ? y : 1.5, z, PI / 2);
      }
      k.box(0, w, top4, top4 + 0.8, 9.6, 9.75, '#ecebe6', NC);
      k.plane(
        paint('不倒翁牛排', '#ee8a1e', '#1a1a1a', 'Tumbler Steak', 8.6, 0.8),
        8.6,
        0.8,
        w + 0.06,
        2.96,
        4.75,
        PI / 2,
        {
          emissive: 0.35,
        }
      );
      // 審查：街景（s≈637 往東看）側面招牌帶沿著機車通道一路包到後面，不只前段
      k.box(w, w + 0.05, 2.55, 3.4, 0.4, 9.3, '#ee8a1e', NC);
      // 人偶：黑白條紋的身體、白色圓頭，站在招牌轉角上方（街景是立在屋頂邊，約 2.5 m 高）
      const px = w - 0.6,
        pz = 0.2;
      for (let j = 0; j < 4; j++)
        k.cyl(
          px,
          pz,
          0.5 - j * 0.04,
          3.5 + j * 0.42,
          3.5 + (j + 1) * 0.42,
          j % 2 ? '#f2f2ee' : '#1c1c1e',
          {
            seg: 12,
          }
        );
      const g = new C.THREE.SphereGeometry(0.42, 12, 8);
      g.translate(px, 5.55, pz);
      k._part(C.VC, C.paintGeo(g, '#f4efe4'));
    }
    // N16 往北的機車停車通道（s 624～630，只做到離中心線 17 m，不伸進游泳池）
    {
      const k = seg(C, 1, 624, 630, SN),
        w = k.W;
      k.box(-0.01, w, -0.5, 0.03, 0, 9.6, MR.concrete, { col: false, surface: true });
      for (let j = 0; j < 7; j++) {
        bike(k, 0.3, 0.6 + j * 1.25, 1, bikeCols[j % 6]);
        if (j < 5) bike(k, w - 1.9, 1.2 + j * 1.4, 1, bikeCols[(j + 3) % 6]);
      }
      k.box(w - 0.6, w - 0.52, 0, 2.4, 0.3, 0.38, '#5a5d60', NC);
      k.box(w - 0.95, w - 0.15, 1.6, 2.3, 0.22, 0.3, '#1e5bb8', NC);
    }
    // ---- 南側 ----
    // S1 中原收費停車場：沿路 1.8 m 鐵網圍籬、黃黑斜紋柱，人行道上一整排機車，靠新中二街口一間小木造收費亭
    {
      const k = seg(C, -1, 530, 563.2, SS),
        w = k.W,
        ap = k.apron,
        H = 1.8;
      const mesh = sg('xzX6Mesh', 64, 64, (g) => {
        g.clearRect(0, 0, 64, 64);
        g.strokeStyle = '#7d8079';
        g.lineWidth = 2;
        for (let i = -64; i < 64; i += 10) {
          g.beginPath();
          g.moveTo(i, 0);
          g.lineTo(i + 64, 64);
          g.stroke();
          g.beginPath();
          g.moveTo(i + 64, 0);
          g.lineTo(i, 64);
          g.stroke();
        }
      });
      k.box(-0.01, w + 0.01, -0.5, 0.05, -ap, 0, MR.concrete, { col: false, surface: true });
      const n = Math.round(w / 2.5),
        pw = w / n;
      for (let j = 0; j <= n; j++) {
        const x = Math.min(j * pw, w - 0.08);
        for (let b = 0; b < 4; b++)
          k.box(
            x,
            x + 0.08,
            (b * H) / 4,
            ((b + 1) * H) / 4,
            0.12,
            0.2,
            b % 2 ? '#7a7d78' : '#8e918b', // 審查：街景圍籬柱是灰色鍍鋅管，黃黑斜紋只在路口電線桿底部
            NC
          );
        if (j < n)
          for (let q = 0; q < 2; q++)
            k.plane(mesh, pw / 2, H - 0.1, x + pw / 4 + (q * pw) / 2, H / 2, 0.16, FRONT, {
              transparent: true,
              double: true,
            });
      }
      k.box(0, w, H - 0.05, H + 0.02, 0.12, 0.2, '#6f726c', NC);
      k.wallLine(0, 0.16, w, 0.16, 0, H);
      // 圍籬上的黃底看板（字看不清，不寫字）
      k.box(8.4, 9.6, 0.9, 1.7, 0.06, 0.12, '#f2c81e', NC);
      // 人行道上一整排機車（新中二街口留空）
      for (let x = 1.6, j = 0; x < w - 1; x += 0.85, j++)
        bike(k, x, -1.6, 1, bikeCols[(j * 5) % 6]);
      // 收費亭
      k.box(1.6, 3.6, 0, 2.4, 1.6, 3.6, '#8a6a48');
      k.box(1.4, 3.8, 2.4, 2.55, 1.4, 3.8, '#5e4630', NC);
      k.plane(YHT.win(), 1.2, 0.9, 2.6, 1.5, 1.57, FRONT);
    }
    // 南側新中二街口西邊沒蓋房子的地方鋪成人行道（實景是路口的綠色行人區與騎樓前空地，不鋪到遊戲的路面上）
    //   北側 s 568.3～574 原本也鋪了，審查時發現實景那裡是街屋，改成 N6 三棟
    for (const [s0, s1, side, set, d] of [[570.5, 573.5, -1, SS, 5]]) {
      const k = seg(C, side, s0, s1, set);
      k.box(0, k.W, -0.5, 0.05, -k.apron, d, MR.concrete, { col: false, surface: true });
    }
    // S2 全家轉角台階＋欄杆（新中二街那一角）
    {
      const k = seg(C, -1, 573.5, 585.7, SS),
        w = k.W;
      for (let j = 0; j < 3; j++)
        k.box(w - 1.6, w, 0, 0.15 * (j + 1), -0.3 * (3 - j), -0.3 * (2 - j), '#b9b6ae', NC);
      k.box(w - 1.6, w - 1.55, 0, 1.0, -0.9, 0, '#9aa0a4', NC);
      k.box(w - 1.6, w, 0.95, 1.0, -0.9, -0.85, '#9aa0a4', NC);
    }
    // S5 東緣伸出人行道的 gogoro 藍色側招（雙面，字：gogoro／俊誠車業）
    {
      const k = seg(C, -1, 602.3, 606.2, SS),
        x = k.W - 0.25,
        y = 4.1;
      k.box(x - 0.03, x + 0.03, y - 0.6, y + 0.6, -1.5, -0.1, '#1e5bb8', NC);
      for (const sd of [-1, 1])
        k.plane(
          paint('gogoro', '#1e5bb8', '#ffffff', '俊誠車業', 1.3, 1.1),
          1.3,
          1.1,
          x + sd * 0.04,
          y,
          -0.8,
          (sd * PI) / 2,
          { emissive: 0.3 }
        );
    }
  },
  footprints(F) {
    return [
      F(R, 618, 624, 1, 17, 10), // 不倒翁後面的白色 4 樓
      F(R, 624, 630, 1, SN, 9.6), // 機車停車通道
      F(R, 530, 562, -1, SS, 0.4, 3.3), // 停車場圍籬＋前面停滿機車的人行道（實景沒有行道樹）
      F(R, 559.9, 562, -1, SS + 1.6, 2), // 收費亭
    ];
  },
};
