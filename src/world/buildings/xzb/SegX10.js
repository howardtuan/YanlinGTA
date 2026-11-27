// 新中北路 s 1014～1222（實踐路口往西、過中北橋到信陽街口，兩側；Google 街景 2026-05（s 1048 以西）與 2011-11（s 1018～1042）、
//   國土測繪 2024 正射、Google 衛星與地圖店名、評論照片，調查筆記在 scratchpad x10/survey.md）。
//   北側（+1）由東到西：
//     實踐路口西北角到 185巷（s 1021～1045，只有 2011 街景，店家多半換過，只做樓的樣子、不寫舊招牌字）：紅色轉角 4 樓 → 老街屋 →
//       灰磁磚 4 樓（白鐵窗）→ 綠雨遮 4 樓 → 白磁磚 5 樓（綠色窗雨遮）→ 185巷東轉角白色 5 樓（淺綠玻璃窗、綠雨遮）
//     185巷到溪（s 1051～1081）：米色 3 樓老洋樓轉角 → 白色鐵皮屋（水果甜點壁畫，「BH 黑心」「蝦皮店到店」）→ 停車空地 →
//       「中大撞球俱樂部」長平房 → 灰色鐵捲門小店（白色書法招牌，字看不清）→ 溪邊水泥牆
//     溪西（中北橋以西）：7-ELEVEN 大樓（OSM，不動）→ 151巷 → 4 樓灰白小磁磚街屋一排（YAMAHA、傑盟國際廣告、山本專業平頭理髮、148 台越美食、
//       猴娃吉選物販賣店）→ 紅磚 4 樓 → 紅褐磁磚 7 樓（木紋一樓）→ 米色 2 樓 → 320 HAIR SALON → 武理物業紅磚 5 樓 → 巨人車業 →
//       白磁磚 5 樓 → 金門高粱酒／公益彩券 → 碎石空地 → 灰白磁磚 5 樓 → 「慢 Slow Hair Salon」紅磚 3 樓轉角（105巷口）
//   南側（-1）由東到西：
//     實踐路口西南角到 200巷（s 1020～1043，2011 街景＋2026 地圖／評論照片）：灰磁磚 8 樓轉角（世界豆漿店，OSM 店名還在；實踐路那面的立面在 shijian/N2.js）→
//       藍灰小磁磚 5 樓一排（SYM 銓勝車業在這排，照 2026-10 評論照片與地圖位置）
//     200巷到溪（s 1051～1075，2026）：老湯鍋轉角 → 悅之香客家麵飯館 → KYMCO 聖源車業行 → 888大水餃（白帆布鐵皮攤、綠雨遮）
//     溪西：286水餃店（藍色木板鐵皮小屋、紅布條）→ 平面停車場 → 綠色鐵皮圍籬（後面是樹林，s 1105～1165）→ 舊磁磚空地 →
//       吾芳素食米黃色鐵皮 2 樓 → 通道 → 綠色鐵皮長屋 → 紅磚車庫（車輛出入請勿停車，信陽街口東南角）
//   遊戲原本：北側 s 1021～1045、南側 s 1020～1043 與 1051～1075、北側 151巷以西 s 1112～1177 都是空地或樹林；
//     北側 185巷到溪的兩棟 OSM（w587181283、w587172214）樣子不對，hide 掉照實景重蓋；溪西的填充樓換成實景。
const R = 'X';
const NC = { col: false };
const FNT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（南側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標，有碰撞的 box 要用），所以把寬度搬到 k.W、還原 k.w
const seg = (C, side, s0, s1, set = 6.5) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  k.zo = (off) => off - set;
  return k;
};
const ball = (C, k, x, y, z, r, hex, sy = 1, sx = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(sx, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 斜板：沿 x 傾斜的屋頂（從 (x0,y0) 斜到 (x1,y1)），z0～z1 是深度
const slopeX = (C, k, x0, y0, x1, y1, z0, z1, th, hex) => {
  const dx = x1 - x0,
    dy = y1 - y0,
    g = new C.THREE.BoxGeometry(Math.hypot(dx, dy), th, z1 - z0);
  g.rotateZ(Math.atan2(dy, dx));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return k._part(C.VC, C.paintGeo(g, hex));
};
const flat = (k, tex, w, h, x, z, y = 0.06) => {
  const m = k.plane(tex, w, h, x, y, z, 0, { transparent: true });
  m.rotation.set(-Math.PI / 2, 0, 0);
  return m;
};

// 街屋共用的幾種樣子
const MOSAIC = '#d6d8d6'; // 灰白小磁磚（151巷以西那排 4 樓）
const BLUEGREY = '#8f9aa6'; // 藍灰小磁磚（實踐路口西南那排 5 樓）

// ---------------- 貼圖 ----------------
const TX = (C) => ({
  // 白色鐵皮屋牆上的水果、甜點插畫（愛心、杯子、蛋糕）
  mural: () =>
    C.sg('xzX10mural', 512, 160, (g) => {
      g.fillStyle = '#eeeeea';
      g.fillRect(0, 0, 512, 160);
      g.strokeStyle = 'rgba(150,150,146,0.5)';
      g.lineWidth = 2;
      for (let x = 0; x < 512; x += 12) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, 160);
        g.stroke();
      }
      const r = C.lcg(10140);
      const cols = ['#d8423a', '#e8a33a', '#c86a9a', '#e8c83a', '#7aa04a'];
      for (let i = 0; i < 16; i++) {
        const x = 20 + r() * 470,
          y = 20 + r() * 110,
          c = cols[i % 5];
        g.fillStyle = c;
        g.strokeStyle = '#6a4a3a';
        g.lineWidth = 2;
        if (i % 3 === 0) {
          // 愛心
          g.beginPath();
          g.moveTo(x, y + 8);
          g.bezierCurveTo(x - 14, y - 4, x - 6, y - 14, x, y - 4);
          g.bezierCurveTo(x + 6, y - 14, x + 14, y - 4, x, y + 8);
          g.fill();
          g.stroke();
        } else if (i % 3 === 1) {
          // 杯子
          g.fillRect(x - 8, y - 10, 16, 20);
          g.strokeRect(x - 8, y - 10, 16, 20);
          g.fillStyle = '#f6f0e0';
          g.fillRect(x - 9, y - 14, 18, 5);
        } else {
          // 圓形水果
          g.beginPath();
          g.arc(x, y, 9, 0, 7);
          g.fill();
          g.stroke();
        }
      }
    }),
  // 888大水餃攤子上蓋的白色帆布（皺摺）
  tarp: () =>
    C.sg('xzX10tarp', 256, 128, (g) => {
      g.fillStyle = '#e4e2dc';
      g.fillRect(0, 0, 256, 128);
      const r = C.lcg(10780);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(120,118,110,${0.15 + r() * 0.25})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        const x = r() * 256;
        g.moveTo(x, 0);
        g.quadraticCurveTo(x + (r() - 0.5) * 40, 64, x + (r() - 0.5) * 30, 128);
        g.stroke();
      }
    }),
  // 286水餃店：藍色木板牆＋白色大「286」塗字
  plank: () =>
    C.sg('xzX10plank', 512, 160, (g) => {
      g.fillStyle = '#2f5aa8';
      g.fillRect(0, 0, 512, 160);
      g.fillStyle = 'rgba(10,20,50,0.35)';
      for (let y = 0; y < 160; y += 14) g.fillRect(0, y, 512, 2);
      g.fillStyle = '#f4f2ec';
      g.font = FNT(120);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('286', 200, 92);
      g.strokeStyle = '#d8402a';
      g.lineWidth = 6;
      g.strokeText('286', 200, 92);
      g.fillStyle = '#f4f2ec';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(380 + i * 30, 40 + (i % 2) * 12, 10, Math.PI, 0);
        g.fill();
      } // 浪花
    }),
  // 286水餃店的紅色長布條（左邊白底圓形廚師標誌＋「286 水餃店」，右邊紅底黃字）
  b286: () =>
    C.sg('xzX10b286', 1024, 128, (g) => {
      g.fillStyle = '#f2efe8';
      g.fillRect(0, 0, 330, 128);
      g.fillStyle = '#c8281e';
      g.fillRect(330, 0, 694, 128);
      g.beginPath();
      g.arc(64, 64, 46, 0, 7);
      g.fillStyle = '#d8402a';
      g.fill();
      g.fillStyle = '#f6e0c8';
      g.beginPath();
      g.arc(64, 72, 26, 0, 7);
      g.fill();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#1c1c1c';
      g.font = FNT(78);
      g.fillText('286', 190, 58);
      g.fillStyle = '#c8281e';
      g.font = FNT(26);
      g.fillText('水餃店', 290, 50);
      g.fillStyle = '#1c1c1c';
      g.font = FNT(20, 700);
      g.fillText('24小時營業', 200, 108);
      g.fillStyle = '#f2e21a';
      g.font = FNT(72);
      g.fillText('歡迎批發團購餐點外送', 677, 68);
    }),
  // 巨人車業 2 樓的大看板（白底、賽車手機車剪影、藍字）
  juren: () =>
    C.sg('xzX10juren', 1024, 256, (g) => {
      g.fillStyle = '#f2f2f0';
      g.fillRect(0, 0, 1024, 256);
      g.fillStyle = '#c03a3a';
      g.beginPath();
      g.ellipse(330, 140, 190, 70, -0.15, 0, 7);
      g.fill();
      g.fillStyle = '#2a2a2e';
      g.beginPath();
      g.arc(200, 190, 46, 0, 7);
      g.arc(470, 170, 46, 0, 7);
      g.fill();
      g.fillStyle = '#f0f0f0';
      g.beginPath();
      g.arc(200, 190, 26, 0, 7);
      g.arc(470, 170, 26, 0, 7);
      g.fill();
      g.fillStyle = '#e8a030';
      g.beginPath();
      g.ellipse(360, 80, 60, 34, 0, 0, 7);
      g.fill(); // 騎士
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#1f3a8a';
      g.font = FNT(96);
      g.fillText('巨人車業', 780, 170);
      g.fillStyle = '#d8282a';
      g.font = FNT(40, 700);
      g.fillText('REPSOL', 880, 60);
    }),
  // 木紋飾板（紅褐 7 樓的一樓門面）
  wood: () =>
    C.sg('xzX10wood', 128, 256, (g) => {
      g.fillStyle = '#9a6a42';
      g.fillRect(0, 0, 128, 256);
      for (let x = 0; x < 128; x += 16) {
        g.fillStyle = x % 32 ? 'rgba(60,35,15,0.25)' : 'rgba(255,220,170,0.12)';
        g.fillRect(x, 0, 14, 256);
      }
    }),
  // 綠色鐵皮圍籬（直條浪板，塗鴉幾筆）
  fence: (wm) =>
    C.sg(`xzX10fence${wm}`, Math.round(wm * 32), 80, (g, W, H) => {
      g.fillStyle = '#3f7a52';
      g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 6) {
        g.fillStyle = 'rgba(20,50,30,0.35)';
        g.fillRect(x, 0, 2, H);
      }
      const r = C.lcg(11050 + W);
      g.lineWidth = 3;
      for (let i = 0; i < W / 120; i++) {
        g.strokeStyle = ['#1c1c1c', '#e8e2d8'][i % 2];
        let x = r() * W,
          y = 20 + r() * 40;
        g.beginPath();
        g.moveTo(x, y);
        for (let j = 0; j < 5; j++) g.lineTo((x += 6 + r() * 10), (y += (r() - 0.5) * 20));
        g.stroke();
      }
    }),
  // 碎石空地
  gravel: () =>
    C.sg('xzX10gravel', 128, 128, (g) => {
      g.fillStyle = '#8a8478';
      g.fillRect(0, 0, 128, 128);
      const r = C.lcg(11980);
      for (let i = 0; i < 500; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '60,56,50' : '190,184,170'},0.5)`;
        g.fillRect(r() * 128, r() * 128, 2, 2);
      }
    }),
  // 舊磁磚地坪
  tile: () =>
    C.sg('xzX10tile', 128, 128, (g) => {
      g.fillStyle = '#b8b2a4';
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(90,86,78,0.5)';
      g.lineWidth = 2;
      for (let x = 0; x <= 128; x += 32) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, 128);
        g.moveTo(0, x);
        g.lineTo(128, x);
        g.stroke();
      }
    }),
});

export default {
  // 原本就 noShop 的填充樓：溪西南側 f1058、f1057（286水餃店與停車場）、信陽街口東南 f1063、f1061、f1060、f1059，
  //   151巷以西北側 f787、f788、f790（f790 實景是碎石空地）
  drop: ['f1058', 'f1057', 'f1063', 'f1061', 'f1060', 'f1059', 'f787', 'f788', 'f790'],
  // 有店面牆的填充樓（f1062、f789、f791）與樣子不對的 OSM（185巷到溪的 w587181283、w587172214）：不畫、碰撞收成一點
  hide: ['f1062', 'f789', 'f791', 'w587181283', 'w587172214'],
  ownSign: ['世界豆漿店', '老湯鍋24H(中壢中原)', '蝦皮店到店'],
  lots: [
    // ======================= 北側（+1） =======================
    // ---- 實踐路口西北角到 185巷（2011 街景，不寫舊招牌字）----
    [
      R,
      1021,
      1025.5,
      1,
      {
        nf: 4,
        wall: '#b8463a',
        ground: 'shutter',
        sh: '#a8aaa8',
        noband: 1,
        bal: 'grille',
        d: 12,
        set: 8,
        door: 0,
        roof: 'shack',
      },
    ], // 紅色轉角 4 樓
    [
      R,
      1025.5,
      1029.5,
      1,
      { nf: 4, wall: '#cbc3b2', ground: 'shop', bal: 'open', d: 12, set: 8, roof: 'none' },
    ],
    [
      R,
      1029.5,
      1033.5,
      1,
      {
        nf: 4,
        wall: '#a9aaa6',
        ground: 'shutter',
        noband: 1,
        bal: 'cage',
        d: 12,
        set: 8,
        door: 0,
        roof: 'tank',
      },
    ], // 灰磁磚、2 樓以上白鐵窗
    [
      R,
      1033.5,
      1037,
      1,
      {
        nf: 4,
        wall: '#cfc9bd',
        ground: 'shop',
        awn: '#3f7a52',
        bal: 'grille',
        d: 12,
        set: 8,
        roof: 'none',
      },
    ],
    [
      R,
      1037,
      1041,
      1,
      {
        nf: 5,
        wall: '#e6e4de',
        ground: 'shop',
        awn: '#c8c4b8',
        bal: 'plain',
        hood: '#3f8a5a',
        d: 12,
        set: 8,
        roof: 'tank',
      },
    ], // 白磁磚 5 樓、綠色窗雨遮
    [
      R,
      1041,
      1045,
      1,
      {
        nf: 5,
        wall: '#ecebe6',
        ground: 'shop',
        awn: '#3f7a52',
        bal: 'plain',
        d: 12,
        set: 8,
        roof: 'none',
      },
    ], // 185巷東轉角（淺綠玻璃窗在 custom）
    // ---- 185巷到溪（2026）----
    [
      R,
      1051.6,
      1056,
      1,
      {
        nf: 3,
        wall: '#c8bca4',
        ground: 'shutter',
        sh: '#9a9a94',
        awn: '#8a8c88',
        noband: 1,
        bal: 'grille',
        d: 7,
        set: 7,
        door: 0,
        roof: 'none',
      },
    ], // 米色老洋樓轉角（2、3 樓外凸在 custom）
    [
      R,
      1056,
      1059.6,
      1,
      {
        nf: 1,
        gf: 4.4,
        wall: '#eeeeea',
        sign: ['BH 黑心', '#1a1a1a', '#f4f4f2', '美甲・美睫・紋繡'],
        ground: 'shutter',
        sh: '#a8aaa8',
        d: 7.5,
        set: 7,
        door: 0,
        roofCol: '#c4c6c4',
      },
    ],
    [
      R,
      1059.6,
      1066,
      1,
      {
        nf: 1,
        gf: 4.4,
        wall: '#eeeeea',
        sign: ['蝦皮店到店', '#e2463a', '#ffffff', '中壢新中北二店'],
        ground: 'shutter',
        sh: '#a8aaa8',
        d: 9,
        set: 7,
        door: 0,
        roofCol: '#c4c6c4',
      },
    ],
    [
      R,
      1068.2,
      1077.6,
      1,
      {
        nf: 1,
        gf: 3.6,
        wall: '#e8e6e0',
        sign: ['中大撞球俱樂部', '#f2f0ea', '#c0282a'],
        ground: 'shop',
        vert: ['中大撞球', '#f2c21a', '#c0282a'],
        d: 12,
        set: 7,
        door: 0,
        roofCol: '#8a6a52',
        bikes: 4,
      },
    ],
    [
      R,
      1077.6,
      1080.6,
      1,
      {
        nf: 1,
        gf: 3.4,
        wall: '#d8d6d0',
        ground: 'shutter',
        sh: '#9a9c9a',
        d: 5.5,
        set: 7,
        door: 0,
        roofCol: '#8a8d90',
      },
    ], // 白色書法招牌（字看不清，custom）
    // ---- 151巷以西 ----
    [
      R,
      1112.4,
      1116.4,
      1,
      {
        nf: 4,
        wall: MOSAIC,
        ground: 'shutter',
        sh: '#c8c0a8',
        noband: 1,
        bal: 'plain',
        d: 9,
        set: 8,
        roof: 'none',
      },
    ], // 米色鐵捲門＋樓梯口
    [
      R,
      1116.4,
      1120.4,
      1,
      {
        nf: 4,
        wall: MOSAIC,
        sign: ['YAMAHA', '#9a96c8', '#e8302a', '03-4560611'],
        ground: 'open',
        bal: 'plain',
        d: 12,
        set: 8,
        door: 0,
        roof: 'none',
        bikes: 2,
      },
    ],
    [
      R,
      1120.4,
      1124.4,
      1,
      {
        nf: 4,
        wall: MOSAIC,
        ground: 'shop',
        awn: '#2f6a4a',
        bal: 'plain',
        d: 12,
        set: 8,
        roof: 'none',
      },
    ], // 機車材料行（YAMAHA 招牌帶延伸過來，在 custom）
    [
      R,
      1124.4,
      1128.4,
      1,
      {
        nf: 4,
        wall: MOSAIC,
        ground: 'gate',
        awn: '#d8cfb4',
        noband: 1,
        bal: 'plain',
        d: 12,
        set: 8,
        roof: 'none',
      },
    ], // 米色帆布雨遮、木門、綠色石材牆
    [
      R,
      1128.4,
      1132.4,
      1,
      {
        nf: 4,
        wall: MOSAIC,
        sign: ['傑盟國際廣告', '#1c1c1e', '#ffffff', '大量輸出 立體字 LED招牌 帆布 印刷設計'],
        vert: ['傑盟國際廣告', '#1c1c1e', '#ffffff'],
        ground: 'shop',
        bal: 'plain',
        d: 12,
        set: 8,
        roof: 'none',
      },
    ],
    [
      R,
      1132.4,
      1137.4,
      1,
      {
        nf: 4,
        wall: '#8e8e88',
        ground: 'gate',
        noband: 1,
        bal: 'plain',
        vert: ['山本專業平頭理髮', '#c8281e', '#ffffff'],
        d: 12,
        set: 8,
        roof: 'tank',
      },
    ], // 灰色洗石子、綠色鋁窗
    [
      R,
      1137.4,
      1143.2,
      1,
      {
        nf: 4,
        wall: '#e4e2dc',
        sign: ['148 台越美食', '#f8f2f2', '#d0243a', 'Quán Ăn Việt 越南河粉 春捲'],
        awn: '#d8cfb4',
        ground: 'shop',
        bal: 'plain',
        d: 12,
        set: 8,
      },
    ],
    [
      R,
      1143.2,
      1147.4,
      1,
      {
        nf: 5,
        wall: '#d8cbb0',
        sign: ['猴娃吉', '#f8f6f2', '#d0242a', '選物販賣店'],
        ground: 'open',
        bal: 'plain',
        d: 12,
        set: 8,
        roof: 'none',
      },
    ],
    [
      R,
      1147.4,
      1152,
      1,
      {
        nf: 4,
        wall: '#9a4e3a',
        ground: 'shutter',
        sh: '#a8aaa8',
        noband: 1,
        bal: 'plain',
        d: 14,
        set: 8,
        door: 0,
      },
    ], // 紅磚 4 樓
    [
      R,
      1152,
      1160,
      1,
      {
        nf: 7,
        wall: '#8a4a3a',
        ground: 'gate',
        noband: 1,
        bal: 'plain',
        d: 14,
        set: 8,
        roof: 'tank',
      },
    ], // 紅褐磁磚 7 樓（一樓木紋飾板在 custom）
    [
      R,
      1160,
      1163.5,
      1,
      {
        nf: 2,
        wall: '#d8cca8',
        ground: 'shutter',
        sh: '#8e9294',
        awn: '#3f7a52',
        noband: 1,
        bal: 'plain',
        d: 10,
        set: 8,
        door: 0,
      },
    ],
    [
      R,
      1163.5,
      1167.2,
      1,
      {
        nf: 4,
        wall: '#ecebe6',
        sign: ['320 HAIR SALON', '#f6f6f4', '#1a1a1a'],
        ground: 'shop',
        bal: 'plain',
        d: 14,
        set: 8,
      },
    ],
    [
      R,
      1167.2,
      1172,
      1,
      {
        nf: 5,
        wall: '#9a5442',
        ground: 'shop',
        noband: 1,
        bal: 'plain',
        vert: ['武理物業管理集團', '#1a1a1a', '#d8b04a'],
        d: 14,
        set: 8,
        roof: 'none',
      },
    ],
    [
      R,
      1172,
      1179.5,
      1,
      {
        nf: 4,
        wall: '#e2e2de',
        ground: 'shutter',
        sh: '#a8aaa8',
        noband: 1,
        bal: 'plain',
        vert: ['巨人車業', '#1f3a8a', '#ffffff'],
        d: 14,
        set: 8,
        door: 0,
        bikes: 5,
      },
    ], // 2 樓大看板在 custom
    [
      R,
      1179.5,
      1186.5,
      1,
      { nf: 5, wall: '#e8e8e4', ground: 'gate', noband: 1, bal: 'plain', d: 14, set: 8 },
    ], // 白磁磚 5 樓（住家門、盆栽）
    [
      R,
      1186.5,
      1194.5,
      1,
      {
        nf: 4,
        wall: '#d4cbb4',
        sign: ['公益彩券', '#f2d21a', '#d0242a', '台灣彩券'],
        sign2: ['金門高粱酒', '#1f4aa0', '#ffffff'],
        vert: ['金門高粱酒', '#c8281e', '#ffffff'],
        ground: 'shop',
        bal: 'plain',
        d: 14,
        set: 8,
      },
    ],
    [
      R,
      1205,
      1210.5,
      1,
      {
        nf: 5,
        wall: '#cfd0cc',
        ground: 'shutter',
        sh: '#a8aaa8',
        noband: 1,
        bal: 'rail',
        d: 14,
        set: 8,
        door: 0,
      },
    ], // 灰白磁磚、凸窗、兩間鐵捲門
    [
      R,
      1210.5,
      1219.4,
      1,
      {
        nf: 3,
        wall: '#a85a44',
        sign: ['慢 Slow', '#f6f6f4', '#1a1a1a', 'Hair Salon'],
        ground: 'shop',
        bal: 'plain',
        d: 12,
        set: 8,
      },
    ], // 紅磚弧形轉角（105巷口）

    // ======================= 南側（-1） =======================
    // ---- 實踐路口西南角到 200巷 ----
    [
      R,
      1020,
      1025,
      -1,
      {
        nf: 8, // 2011 街景只拍到 6 樓以下；實踐路那面（src/world/buildings/shijian/N2.js W5，2026 街景）是 8 樓，同一棟
        wall: '#9a9c98',
        sign: ['世界豆漿店', '#c8281e', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        d: 10, // 再往後是實踐路那棟 8 樓的南半（shijian/N2.js 伊萊克斯那格），原本 d 12 跟它重疊
        set: 8,
      },
    ], // 灰磁磚 8 樓轉角（實踐路那面由 shijian/N2.js 貼立面）
    [
      R,
      1025,
      1030,
      -1,
      {
        nf: 5,
        wall: BLUEGREY,
        ground: 'shop',
        noband: 1,
        bal: 'cage',
        d: 10, // 再往後是實踐路那棟 8 樓的南半（shijian/N2.js 伊萊克斯那格），原本 d 12 跟它重疊
        set: 8,
        roof: 'none',
      },
    ],
    [
      R,
      1030,
      1035,
      -1,
      {
        nf: 5,
        wall: BLUEGREY,
        sign: ['SYM', '#d8202a', '#ffffff', '銓勝車業行  TEL 03-4360800'],
        awn: '#2f6a4a',
        ground: 'open',
        bal: 'cage',
        d: 12,
        set: 8,
        door: 0,
        roof: 'none',
        bikes: 3,
      },
    ],
    [
      R,
      1035,
      1039.5,
      -1,
      { nf: 5, wall: BLUEGREY, ground: 'shop', noband: 1, bal: 'cage', d: 8, set: 8, roof: 'none' },
    ],
    [
      R,
      1039.5,
      1043.4,
      -1,
      {
        nf: 5,
        wall: BLUEGREY,
        ground: 'shutter',
        noband: 1,
        bal: 'cage',
        d: 4.5,
        set: 8,
        door: 0,
        roof: 'none',
      },
    ], // 200巷口（巷子斜往東南，不能太深）
    // ---- 200巷到溪（2026）----
    [
      R,
      1051.6,
      1058,
      -1,
      {
        nf: 4,
        wall: '#e2e0da',
        sign: ['老湯鍋', '#232326', '#d8282a', '每鍋170元 白飯免費 冰飲無限暢飲'],
        vert: ['24H老湯鍋', '#f2c21a', '#c8281e'],
        ground: 'shop',
        bal: 'grille',
        d: 10,
        set: 6.5,
      },
    ],
    [
      R,
      1058,
      1063.5,
      -1,
      {
        nf: 4,
        wall: '#dedcd6',
        sign: ['悅之香 客家麵飯館', '#f4efe6', '#c8282a', '香菇牛肉麵 客家大湯麵 香菇雞肉飯'],
        ground: 'open',
        bal: 'grille',
        d: 10,
        set: 6.5,
        door: 0,
        roof: 'none',
      },
    ],
    [
      R,
      1063.5,
      1068.5,
      -1,
      {
        nf: 4,
        wall: '#e6e4de',
        sign: ['KYMCO', '#f6f6f4', '#c8282a', '光陽原廠授權 聖源車業行'],
        ground: 'open',
        bal: 'grille',
        d: 10,
        set: 6.5,
        door: 0,
        bikes: 3,
      },
    ],
    [
      R,
      1068.5,
      1075,
      -1,
      {
        nf: 1,
        gf: 3.4,
        wall: '#d8d6d0',
        sign: ['手工水餃', '#f2d21a', '#c8281e', '888大水餃 韭菜 高麗菜'],
        awn: '#3f7a52',
        ground: 'stall',
        d: 4.5,
        set: 6.5,
        door: 0,
        roofCol: '#3f6a48',
      },
    ], // 白帆布、紅色伸出招牌在 custom
    // ---- 溪西 ----
    [
      R,
      1089.6,
      1096,
      -1,
      {
        nf: 1,
        gf: 2.9,
        wall: '#2f5aa8',
        ground: 'open',
        noband: 1,
        d: 6,
        set: 6.5,
        door: 0,
        roofCol: '#8a5a3a',
      },
    ], // 286水餃店（布條、木板牆在 custom）
    [
      R,
      1179,
      1192,
      -1,
      {
        nf: 2,
        gf: 3.2,
        fh: 2.8,
        wall: '#d4c98e',
        ground: 'shutter',
        sh: '#2f3e5e',
        noband: 1,
        bal: 'plain',
        d: 10,
        set: 6.5,
        door: 0,
        roof: 'none',
      },
    ], // 吾芳素食米黃鐵皮 2 樓
    [
      R,
      1199,
      1206.5,
      -1,
      {
        nf: 1,
        gf: 3.0,
        wall: '#7a9a6a',
        ground: 'shutter',
        sh: '#9a9c9a',
        noband: 1,
        d: 8,
        set: 7.5,
        door: 0,
        roofCol: '#6a8a5a',
      },
    ], // 綠色鐵皮長屋
    [
      R,
      1206.5,
      1217,
      -1,
      {
        nf: 1,
        gf: 3.8,
        wall: '#a0503a',
        sign: ['車輛出入請勿停車', '#1f4aa0', '#e8302a'],
        ground: 'shutter',
        sh: '#8e9294',
        d: 9,
        set: 7.5,
        door: 0,
        roofCol: '#6a4a3a',
      },
    ], // 紅磚車庫（信陽街口）
  ],

  custom(C) {
    const { paint, FRONT, MR, lcg, bike, bikeCols } = C;
    const T = TX(C);
    const r = lcg(10140);
    const bikeRow = (k, s0, s1, off, skip = []) => {
      for (let s = s0; s <= s1 - 0.6; s += 0.72 + r() * 0.12) {
        if (skip.some(([a, b]) => s > a - 0.6 && s < b)) continue;
        if (r() < 0.15) continue;
        bike(k, k.sx(s), k.zo(off + r() * 0.15), 1, bikeCols[(r() * 6) | 0]);
      }
    };

    // ======================= 北側（+1） =======================
    {
      // 185巷東轉角：2 樓以上淺綠玻璃窗
      const k = seg(C, 1, 1041, 1045, 8);
      for (let f = 0; f < 4; f++)
        k.box(0.4, 3.6, 3.6 + f * 3, 5.6 + f * 3, -0.06, 0, '#8fb8a8', NC);
      // 實踐路口西北角紅色轉角樓的東側山牆（實景對著育德街）也刷紅
      const e = seg(C, 1, 1021, 1025.5, 8);
      e.box(-0.06, 0, 0, 12.3, 0, 12, '#b8463a', NC);
    }
    {
      // 米色老洋樓轉角：2、3 樓外凸、灰色雨遮
      const k = seg(C, 1, 1051.6, 1056, 7);
      k.box(-0.05, k.W + 0.05, 3.3, 9.3, -0.6, 0, '#c4b8a0');
      k.box(-0.1, k.W + 0.1, 3.25, 3.35, -0.7, 0, '#9a9286', NC);
      for (const y of [4.3, 7.3])
        k.plane(C.bars, 1.2, 1.2, 1.4, y + 0.6, -0.62, FRONT, { transparent: true });
    }
    {
      // 白色鐵皮屋：招牌上面整面水果甜點插畫
      const k = C.sink(seg(C, 1, 1056, 1066, 7));
      k.box(0, k.W, 4.4, 6.2, 0, 0.25, '#eeeeea', NC);
      k.plane(T.mural(), 9.8, 1.7, 5, 5.3, -0.02, FRONT);
      // 屋前的紅色小立架
      for (const s of [1057.4, 1062.2])
        k.box(k.sx(s), k.sx(s) + 0.9, 0, 0.7, -1.6, -1.5, '#c8281e', NC);
      // 停車空地（s 1066～1068.2）一棵大樹
      ball(C, k, k.sx(1067.2), 5.2, 4.5, 2.2, '#3f7a3a', 0.8);
      k.cyl(k.sx(1067.2), 4.5, 0.2, 0, 4.4, '#5e4630', { seg: 6, col: true });
    }
    {
      // 白色書法招牌小店＋門口紅色小攤車（橋頭的水泥矮牆與鐵管欄杆由 src/world/MapBuilder.js BRIDGE_LOOK 畫）
      const k = seg(C, 1, 1077.6, 1088.5, 7);
      k.box(0.1, 2.9, 2.5, 3.3, -0.25, 0, '#f2f0ea', NC); // 招牌（字看不清不寫）
      k.box(0.5, 1.5, 0, 1.3, -1.2, -0.6, '#c8281e');
      k.box(0.45, 1.55, 1.3, 1.4, -1.25, -0.55, '#d8d6d0', NC);
    }
    {
      // YAMAHA 招牌帶延伸到隔壁機車材料行、紅白 YAMAHA 直招
      const k = seg(C, 1, 1120.4, 1124.4, 8);
      k.box(0.05, 3.95, 2.45, 3.27, -0.28, 0, '#9a96c8', NC);
      const v = paint('YAMAHA', '#f2f0ea', '#d8282a', null, 0.9, 0.9);
      for (const sd of [-1, 1])
        k.plane(v, 0.9, 0.9, -3.8 + sd * 0.03, 5.0, -0.6, (sd * Math.PI) / 2, { emissive: 0.3 });
      // 門口一疊輪胎
      for (let i = 0; i < 3; i++)
        k.cyl(-2, -1.2, 0.32, i * 0.2, i * 0.2 + 0.19, '#222224', { seg: 10 });
    }
    {
      // 山本專業平頭理髮門口的旋轉燈
      const k = seg(C, 1, 1132.4, 1137.4, 8);
      k.cyl(4.6, -0.35, 0.13, 1.4, 2.4, '#f4f4f2', { seg: 10 });
      for (let i = 0; i < 4; i++)
        k.cyl(4.6, -0.35, 0.135, 1.5 + i * 0.22, 1.6 + i * 0.22, i % 2 ? '#2a4aa8' : '#c8281e', {
          seg: 10,
        });
      k.box(0.6, 2.6, 0.6, 2.6, -0.04, 0, '#4a7a5a', NC); // 綠色石材牆面（隔壁傑盟那側）
    }
    {
      // 紅褐 7 樓的一樓木紋飾板
      const k = seg(C, 1, 1152, 1160, 8);
      k.plane(T.wood(), 2.0, 3.2, 1.2, 1.6, -0.05, FRONT);
      k.plane(T.wood(), 1.4, 3.2, 6.2, 1.6, -0.05, FRONT);
      k.box(0.2, 6.8, 3.1, 3.4, -0.4, 0, '#7a4a32', NC);
    }
    {
      // 巨人車業 2 樓的大看板
      const k = seg(C, 1, 1172, 1179.5, 8);
      k.box(0.2, 7.3, 3.4, 5.8, -0.35, -0.05, '#e8e8e6', NC);
      k.plane(T.juren(), 7.0, 2.3, 3.75, 4.6, -0.36, FRONT, { emissive: 0.25 });
      k.plane(C.YHT.win(), 2.6, 2.3, 5.6, 1.15, -0.06, FRONT); // 玻璃門
      k.box(4.2, 4.6, 0.3, 1.8, -0.08, -0.06, '#2a4aa8', NC); // 米其林海報
      for (let i = 0; i < 3; i++)
        k.cyl(1.2, -1.4, 0.32, i * 0.2, i * 0.2 + 0.19, '#222224', { seg: 10 });
    }
    {
      // 碎石空地（s 1194.5～1205）：輪胎堆、後面圍網
      const k = seg(C, 1, 1194.5, 1205, 8);
      C.pave(k, 0, k.W, -0.5, 0.04, -1.2, 12, '#8a8478');
      flat(k, T.gravel(), k.W, 13, k.W / 2, 5.3, 0.05);
      for (const [x, z] of [
        [0.8, 0.6],
        [1.6, 0.4],
        [6.4, 0.8],
      ])
        for (let i = 0; i < 4; i++)
          k.cyl(x, z, 0.33, i * 0.2, i * 0.2 + 0.19, '#1e1e20', { seg: 10 });
      k.plane(C.bars, k.W, 1.8, k.W / 2, 0.9, 12, FRONT, { transparent: true, double: true });
      k.wallLine(0, 12, k.W, 12, 0, 1.8); // 後面圍網擋人
    }

    // ======================= 南側（-1） =======================
    {
      // 888大水餃：攤子整個蓋白色帆布、上方紅色伸出招牌「大水餃」
      const k = seg(C, -1, 1068.5, 1075, 6.5);
      k.plane(T.tarp(), 6.4, 1.6, 3.25, 4.2, -0.02, FRONT);
      k.box(0.1, 6.4, 3.4, 5.0, 0, 4.4, '#d8d6d0', NC);
      const big = paint('大水餃', '#c8281e', '#ffffff', null, 1.6, 0.7);
      for (const sd of [-1, 1])
        k.plane(big, 1.6, 0.7, 6.2 + sd * 0.03, 5.3, -0.9, (sd * Math.PI) / 2, { emissive: 0.3 });
      k.box(6.17, 6.23, 4.9, 5.7, -1.7, -0.1, '#5a5a5a', NC);
    }
    {
      // 286水餃店：藍色木板牆、紅色長布條、生鏽浪板屋頂
      const k = seg(C, -1, 1089.6, 1096, 6.5);
      k.plane(T.plank(), 6.2, 1.5, 3.2, 0.78, -0.04, FRONT);
      k.plane(T.b286(), 6.4, 0.85, 3.2, 2.45, -0.12, FRONT, { emissive: 0.3 });
      k.box(-0.1, 6.5, 2.0, 2.04, -0.12, 0, '#c8281e', NC);
      // 東側（對著溪）的牆也是藍色木板
      k.plane(T.plank(), 5.8, 1.5, 6.42, 0.78, 3.0, Math.PI / 2);
    }
    {
      // 平面停車場（s 1096～1105）：藍色 P 牌、柵欄機；之後綠色鐵皮圍籬一直到 s 1165
      const k = C.sink(seg(C, -1, 1096, 1105, 6.5), 1); // 往西低 0.7 m：P 牌桿、柵欄機、圍籬往下補
      const P = paint('P', '#1f4aa0', '#ffffff', '入口', 0.7, 1.0);
      k.cyl(k.sx(1097.2), -0.6, 0.05, 0, 2.6, '#8a8d90', { seg: 6, col: true });
      k.plane(P, 0.7, 1.0, k.sx(1097.2), 2.2, -0.66, FRONT, { emissive: 0.3 });
      k.box(k.sx(1098.4), k.sx(1098.4) + 0.35, 0, 1.0, -0.2, 0.15, '#e8c21e');
      k.box(k.sx(1098.4) - 3, k.sx(1098.4), 0.85, 0.92, -0.04, 0.04, '#f2f2ee', NC);
      // 停車場邊的低矮圍籬（西側）
      for (let s = 1101; s < 1105; s += 1)
        k.box(k.sx(s + 1), k.sx(s), 0, 1.2, -0.05, 0.05, '#3f7a52', NC);
    }
    for (let s = 1105; s < 1165; s += 6) {
      const e = Math.min(s + 6, 1165),
        k = C.sink(seg(C, -1, s, e, 6.6)),
        w = e - s;
      k.box(0, w, 0, 2.5, 0, 0.06, '#3f7a52');
      k.plane(T.fence(w), w, 3.1, w / 2, 0.95, -0.01, FRONT); // 往下多 0.6 m，坡上低的那頭不露縫
      k.wallLine(0, 0.03, w, 0.03, 0, 2.5);
      if ((s - 1105) % 12 === 0) k.cyl(w / 2, -0.2, 0.06, 0, 2.6, '#5a6a5e', { seg: 6 });
    }
    {
      // 舊磁磚空地（s 1165～1179）：塗鴉矮牆、雜草
      const k = seg(C, -1, 1165, 1179, 6.5);
      flat(k, T.tile(), k.W, 9, k.W / 2, 4.5, 0.05);
      k.box(0.5, 4.5, 0, 1.0, 8.6, 8.9, '#a8a49a');
      for (let i = 0; i < 6; i++) ball(C, k, 1 + r() * 12, 0.3, 2 + r() * 6, 0.45, '#5a7a3a', 0.6);
    }
    {
      // 吾芳素食：2 樓褪色白色大招牌、紅色收邊、西側小招牌、一樓綠色鐵皮牆＋鐵窗
      const k = seg(C, -1, 1179, 1192, 6.5);
      k.box(0.4, 5.6, 3.8, 5.6, -0.08, 0, '#ecebe6', NC);
      k.plane(
        paint('吾芳', '#ecebe6', '#cfcac2', null, 5.0, 1.6),
        5.0,
        1.6,
        3.0,
        4.7,
        -0.09,
        FRONT
      );
      k.box(5.8, 9.0, 0.1, 3.0, -0.05, 0, '#5a8a5a', NC);
      k.plane(C.bars, 1.2, 1.0, 7.4, 1.6, -0.07, FRONT, { transparent: true });
      for (const x of [-0.05, 12.95]) k.box(x, x + 0.1, 0, 6.0, -0.12, 0.1, '#a83a2a', NC); // 紅色收邊（前緣）
      k.box(-0.1, 13.1, 5.9, 6.05, -0.12, 10, '#a83a2a', NC);
      slopeX(C, k, -0.2, 6.0, 6.5, 7.4, 0, 10, 0.06, '#c8bc84'); // 山牆屋頂
      slopeX(C, k, 6.5, 7.4, 13.2, 6.0, 0, 10, 0.06, '#c8bc84');
      k.box(-0.1, 2.6, 2.2, 2.9, -0.3, -0.1, '#f2efe8', NC);
      k.plane(
        paint('吾芳素食', '#f2efe8', '#d0242a', null, 2.6, 0.6),
        2.6,
        0.6,
        1.25,
        2.55,
        -0.31,
        FRONT,
        { emissive: 0.3 }
      );
    }
    {
      // 紅磚車庫：鐵皮斜屋頂、兩側白漆字鐵皮圍籬
      const k = seg(C, -1, 1206.5, 1217, 7.5);
      slopeX(C, k, -0.4, 3.8, 5.25, 5.2, -0.6, 9.2, 0.08, '#6a4a3a');
      slopeX(C, k, 5.25, 5.2, 10.9, 3.8, -0.6, 9.2, 0.08, '#6a4a3a');
      k.box(0, 10.5, 3.8, 5.1, -0.02, 0, '#a0503a', NC);
    }
    // 人行道上的機車（照街景：北側 151巷以西整排、南側 200巷到溪、溪西圍籬前）
    bikeRow(seg(C, 1, 1112.5, 1150, 8), 1113, 1150, 5.0, [[1124.4, 1128.4]]);
    bikeRow(seg(C, 1, 1150, 1176, 8), 1152, 1174, 5.0, [[1160, 1163.5]]);
    bikeRow(seg(C, -1, 1110, 1160, 6.6), 1112, 1158, 4.7);
    void MR;
  },

  footprints(F) {
    return [
      F(R, 1056, 1066, 1, 7, 9), // 白色鐵皮屋前
      F(R, 1066, 1068.2, 1, 5, 9), // 停車空地的樹
      F(R, 1077.6, 1088.5, 1, 4.6, 2.5), // 小店、橋頭
      F(R, 1194.5, 1205, 1, 6.5, 13.5), // 碎石空地
      F(R, 1068.5, 1075, -1, 6.5, 4.5),
      F(R, 1096, 1105, -1, 4.6, 2.5), // 停車場入口
      F(R, 1105, 1165, -1, 4.6, 2.2), // 綠色鐵皮圍籬與前面的機車
      F(R, 1165, 1179, -1, 6.4, 9.2), // 舊磁磚空地
      F(R, 1112.5, 1176, 1, 4.6, 3.5), // 北側人行道上的機車
    ];
  },
};
