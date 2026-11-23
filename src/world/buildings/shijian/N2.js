// 實踐路街屋資料：N 段 s 110～225（z 20→-85），兩側。格式見 src/world/buildings/StreetShijian.js 檔頭。
// 照 Google 街景 2026-05 與國土測繪 2024 正射建模。店名看不清楚的格子一律不寫字。
// 不蓋的開口：東側地下停車場車道口 s 118～121、東側中北路165巷口 s 161.5～172、西側巷口機車空地 s 180～188.4、s 211.5 以北的新中北路口；
// 東側 s 196～222 是既有的 OSM 建物 w1559051239（芸熙美甲、麻豆子），不蓋也不刪。
// 區域座標提醒：西側（side -1）的格子 x=0 在北端（s1）、x=w 在南端（s0）；東側（side +1）x=0 在南端、x=w 在北端。

const SIDE = Math.PI / 2;
// 凸出立面的雙面燈箱招牌：x 沿立面的位置、y 中心高度、bw×bh 大小、out 離牆多遠
const blade = (k, tex, x, y, bw, bh, out = 0.25, o = {}) => {
  for (const sd of [-1, 1])
    k.plane(tex, bw, bh, x + sd * 0.05, y, -out - bw / 2, sd * SIDE, { emissive: 0.3, ...o });
  if (!o.transparent)
    k.box(x - 0.04, x + 0.04, y - bh / 2, y + bh / 2, -out - bw, -out, '#2a2a2c', { col: false });
  k.box(x - 0.02, x + 0.02, y + bh / 2 - 0.14, y + bh / 2 - 0.08, -out, 0, '#2a2a2c', {
    col: false,
  });
};
// 拱窗（透明底，疊在牆上）：白框、墨綠玻璃；gr 加白色鐵窗
const archTex = (c, gr) =>
  c.sg(`sjN2arch${gr ? 1 : 0}`, 192, 128, (g) => {
    g.clearRect(0, 0, 192, 128);
    const path = (m) => {
      g.beginPath();
      g.moveTo(m, 128 - m);
      g.lineTo(m, 62);
      g.ellipse(96, 62, 96 - m, 56 - m, 0, Math.PI, 0);
      g.lineTo(192 - m, 128 - m);
      g.closePath();
    };
    g.fillStyle = '#e6e4dc';
    path(0);
    g.fill();
    g.fillStyle = gr ? '#8fc4b4' : '#5d7a70';
    path(7);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.2)';
    g.fillRect(14, 64, 56, 56);
    g.fillStyle = '#e6e4dc';
    g.fillRect(93, 8, 6, 120);
    g.fillRect(0, 60, 192, 5);
    if (gr) {
      for (let x = 12; x < 192; x += 12) g.fillRect(x, 66, 3, 56);
      g.fillRect(4, 92, 184, 3);
    }
  });
// 一、二樓洗石子：二樓窗的四周補上洗石子色（窗照原樣留著），樓層線加一道腰線
const stone2 = (k, c, col) => {
  const y = c.gf,
    m = c.wallMat(col),
    o = { col: false, tile: [0.6, 0.6] };
  k.box(-0.01, c.w + 0.01, y, y + 0.78, -0.07, 0, m, o);
  k.box(-0.01, c.w + 0.01, y + 2.22, y + c.fh, -0.07, 0, m, o);
  k.box(-0.01, 0.5, y + 0.78, y + 2.22, -0.07, 0, m, o);
  k.box(c.w - 0.5, c.w + 0.01, y + 0.78, y + 2.22, -0.07, 0, m, o);
  k.box(-0.03, c.w + 0.03, y + c.fh - 0.1, y + c.fh + 0.12, -0.3, 0, m, { col: false });
};
// 店前的台階（只是外觀，不擋人）
const steps = (k, c, col = '#a9a498') => {
  k.box(0, c.w, 0.05, 0.2, -0.7, 0, col, { col: false });
  k.box(0, c.w, 0.2, 0.36, -0.35, 0, col, { col: false });
};

// 彎道內側相鄰兩格的立面之間會差一小段，用一根跟外牆同色的牆柱補上（x0～x1 是這一格的區域座標，接在北端外側）
const pier = (k, c, x0, x1, col, dz = 1.5) =>
  k.box(x0, x1, 0, c.top - 0.06, 0, dz, c.wallMat(col), { tile: [0.6, 0.6] });
// 深色玻璃（蓋在通用櫥窗前面，店裡看起來是暗的）
const darkGlass = (k, c, x0, x1, y0 = 0.25, col = '#3c4246') =>
  k.box(x0, x1, y0, c.gf - 1.0, -0.07, -0.03, col, { col: false });
// 三樓整排黑色鐵欄杆陽台
const rail3 = (k, c) => {
  const y = c.gf + c.fh;
  k.box(0.1, c.w - 0.1, y, y + 0.1, -1.0, 0, '#2b2b2b', { col: false });
  for (const yy of [0.5, 0.85, 1.2])
    k.box(0.1, c.w - 0.1, y + yy, y + yy + 0.04, -1.0, -0.96, '#2b2b2b', { col: false });
  for (const x of [0.1, c.w - 0.14])
    k.box(x, x + 0.04, y, y + 1.2, -1.0, -0.96, '#2b2b2b', { col: false });
};
// 熊貓臉（熊貓自助洗衣招牌右邊）
const pandaTex = (c) =>
  c.sg('sjN2panda', 128, 96, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = '#1a1a1a';
    for (const x of [34, 94]) {
      g.beginPath();
      g.arc(x, 22, 15, 0, 7);
      g.fill();
    }
    g.beginPath();
    g.ellipse(64, 56, 46, 37, 0, 0, 7);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(64, 56, 42, 33, 0, 0, 7);
    g.fill();
    g.fillStyle = '#1a1a1a';
    for (const x of [46, 82]) {
      g.beginPath();
      g.ellipse(x, 50, 10, 13, x < 64 ? 0.4 : -0.4, 0, 7);
      g.fill();
    }
    g.beginPath();
    g.ellipse(64, 68, 6, 4, 0, 0, 7);
    g.fill();
  });
// 享吃涼麵的橫招：白底、紅太陽、左邊一隻白貓、黑字
const noodleTex = (c) =>
  c.sg('sjN2noodle', 768, 96, (g) => {
    g.fillStyle = '#f5f0e8';
    g.fillRect(0, 0, 768, 96);
    g.fillStyle = '#d83a2a';
    g.beginPath();
    g.arc(470, 44, 40, 0, 7);
    g.fill();
    g.strokeStyle = '#3a3a3a';
    g.lineWidth = 3;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(118, 30);
    g.lineTo(126, 10);
    g.lineTo(142, 26);
    g.lineTo(170, 26);
    g.lineTo(186, 10);
    g.lineTo(194, 30);
    g.ellipse(156, 54, 42, 30, 0, -0.5, Math.PI + 0.5);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#3a3a3a';
    for (const x of [142, 170]) {
      g.beginPath();
      g.arc(x, 50, 3, 0, 7);
      g.fill();
    }
    g.fillStyle = '#1a1a1a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = c.font(64);
    g.fillText('享吃涼麵', 384, 48);
    g.font = c.font(20, 700);
    g.fillText('中壢店', 620, 76);
  });

// ---- 西側 s 110～138.3：7 樓大樓（一、二樓洗石子、二樓拱窗，三樓以上米色小口磚），跟 N1 段北端是同一棟 ----
const W1 = {
  nf: 7,
  gf: 3.8,
  wall: '#cbbfa9',
  bal: 'plain',
  d: 16,
  set: 5.5,
  door: 0,
  roof: 'flat',
  bikes: 2,
};
const w1x = (more) => (k, c) => {
  const y = c.gf;
  k.box(-0.01, c.w + 0.01, y, y + c.fh, -0.07, 0, c.wallMat('#a89a82'), {
    col: false,
    tile: [0.6, 0.6],
  });
  k.box(-0.03, c.w + 0.03, y + c.fh - 0.1, y + c.fh + 0.12, -0.3, 0, c.wallMat('#a89a82'), {
    col: false,
  });
  const n = Math.max(1, Math.round(c.w / 3.2)),
    cw = c.w / n;
  for (let j = 0; j < n; j++)
    k.plane(archTex(c), Math.min(2.2, cw - 0.7), 1.7, cw * (j + 0.5), y + 1.25, -0.09, c.FRONT, {
      transparent: true,
    });
  steps(k, c);
  if (more) more(k, c);
};
// ---- 西側 s 140.5～161.2：深紫褐小口磚 5 樓公寓（二樓扁拱窗加白鐵窗，屋頂女兒牆上有黑欄杆）----
const W2 = { nf: 5, wall: '#a88a88', bal: 'plain', d: 12, set: 5.5, door: 0, roof: 'flat' };
const w2x = (more) => (k, c) => {
  const y = c.gf;
  k.box(0.3, c.w - 0.3, y + 0.3, y + 2.4, -0.07, 0, c.wallMat('#a88a88'), {
    col: false,
    tile: [0.6, 0.6],
  });
  k.plane(archTex(c, true), c.w - 0.9, 1.5, c.w / 2, y + 1.25, -0.09, c.FRONT, {
    transparent: true,
  });
  k.box(0, c.w, c.top + 0.95, c.top + 1.0, 0.05, 0.1, '#2b2b2b', { col: false });
  for (let x = 0.05; x < c.w; x += 0.9)
    k.box(x, x + 0.04, c.top + 0.12, c.top + 0.95, 0.05, 0.09, '#2b2b2b', { col: false });
  if (more) more(k, c);
};
// ---- 西側 s 161.2～180：紅褐磁磚 5 樓轉角樓（白色鐵籠窗、屋頂鐵皮加蓋）----
const W3 = { nf: 5, wall: '#8a5a52', bal: 'cage', d: 12, set: 5.3, door: 0, roof: 'shack' };
// ---- 西側 s 194.8～211.5：8 樓淺灰藍馬賽克大樓，樓層間有藍色馬賽克橫帶 ----
const W5 = { nf: 8, gf: 3.7, wall: '#c0c8ce', d: 14, set: 5.2, door: 0, roof: 'tank' };
const w5x = (more) => (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(-0.01, c.w + 0.01, y - 0.1, y + 0.14, -0.05, 0, c.wallMat('#5a78a8'), {
      col: false,
      tile: [0.6, 0.6],
    });
  }
  if (more) more(k, c);
};
// ---- 東側 s 110～118：7 樓大樓（一、二樓洗石子），門前退縮廣場：黑白棋盤格地磚、洗石子圓花台 ----
const E0 = { nf: 7, gf: 3.6, wall: '#b9ad9c', d: 12, set: 8.5, door: 0, roof: 'flat' };
const e0x = (more) => (k, c) => {
  stone2(k, c, '#a59a86');
  for (let i = 0; i * 0.4 < c.w - 0.39; i++)
    for (let j = 0; j < 2; j++)
      k.box(
        i * 0.4,
        i * 0.4 + 0.4,
        0.05,
        0.065,
        -2.3 + j * 0.4,
        -1.9 + j * 0.4,
        (i + j) % 2 ? '#e8e6e0' : '#2a2a2c',
        { col: false }
      );
  for (let x = 1.4; x < c.w; x += 2.7) {
    // 圓花台：灌木加一棵小樹
    k.cyl(x, -3.7, 0.85, 0, 0.6, '#a8a294', { seg: 12, col: true });
    k.cyl(x, -3.7, 0.7, 0.6, 1.3, '#3f7a3a', { seg: 8 });
    k.cyl(x, -3.7, 0.05, 1.3, 2.9, '#6a4a30', { seg: 5 });
    const g = new c.THREE.SphereGeometry(0.55, 7, 5);
    g.translate(x, 3.1, -3.7);
    k._part(c.VC, c.paintGeo(g, '#4b8a3e'));
  }
  if (more) more(k, c);
};
// ---- 東側 s 121～135.5：5 樓公寓（一、二樓褐色洗石子，三樓以上淺灰白小口磚），貼著路邊 ----
const E1 = { nf: 5, wall: '#d0cbc0', bal: 'plain', d: 12, set: 4.3, door: 0, roof: 'tank' };
// ---- 東側 s 135.5～161.5：3 樓米粉色小口磚舊街屋，貼著路邊 ----
const E3 = { nf: 3, wall: '#d8c0a8', bal: 'rail', d: 9, set: 4.3, door: 0, roof: 'flat' };
const drip = (k, c) => {
  for (let x = 0; x < c.w; x += 0.3)
    k.cyl(x + 0.15, -1.3, 0.09, c.gf - 1.04, c.gf - 0.9, '#c87858', { seg: 6 });
}; // 雨庇前緣的紅陶筒瓦滴水
// ---- 東側 s 177～193：5 樓米色磁磚公寓，門前退縮停機車 ----
const E5 = { nf: 5, wall: '#d2c2a4', bal: 'plain', d: 12, set: 6.5, roof: 'flat' };

// 貼在玻璃上的金黃色大字（透明底）
const goldTex = (c, t) =>
  c.sg(`sjN2gold${t}`, 256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = '#e8b830';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = c.font(96);
    g.fillText(t, 128, 68);
  });
// 泰國國旗
const thaiTex = (c) =>
  c.sg('sjN2thai', 96, 64, (g) => {
    g.fillStyle = '#c8202a';
    g.fillRect(0, 0, 96, 64);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 11, 96, 42);
    g.fillStyle = '#2a3a7a';
    g.fillRect(0, 21, 96, 22);
  });
// 瑞典國旗（伊萊克斯的旗幟招牌）
const sweTex = (c) =>
  c.sg('sjN2swe', 128, 80, (g) => {
    g.fillStyle = '#1f4f9a';
    g.fillRect(0, 0, 128, 80);
    g.fillStyle = '#f2c830';
    g.fillRect(36, 0, 16, 80);
    g.fillRect(0, 32, 128, 16);
  });
// 安全帽看板：一排彩色安全帽（實景只有商品照片與品牌標誌，沒有店名）
const helmetTex = (c, n, bg, logos) =>
  c.sg(`sjN2helm${n}${bg}`, 64 * n, 96, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 64 * n, 96);
    const cols = [
      '#3a8ad0',
      '#2a2a2c',
      '#d83a2a',
      '#e8e8e8',
      '#3fa86a',
      '#e0a020',
      '#8a4ab0',
      '#e86a9a',
    ];
    for (let i = 0; i < n; i++) {
      const x = 32 + i * 64,
        y = logos ? 40 : 50;
      g.fillStyle = cols[(i * 3 + n) % 8];
      g.beginPath();
      g.ellipse(x, y, 25, 27, 0, Math.PI, 0);
      g.lineTo(x + 25, y + 16);
      g.lineTo(x - 25, y + 16);
      g.closePath();
      g.fill();
      g.fillStyle = '#16181c';
      g.beginPath();
      g.ellipse(x + 5, y + 2, 17, 13, 0, Math.PI * 1.1, Math.PI * 0.1);
      g.lineTo(x + 22, y + 12);
      g.lineTo(x - 9, y + 12);
      g.closePath();
      g.fill();
      if (logos) {
        g.fillStyle = '#6a6a6c';
        g.fillRect(x - 18, 78, 36, 7);
      }
    }
  });
// 一樓門面的彩色木作（透明底，疊在櫥窗玻璃前）：kind 'arch' 圓拱牆、'grid' 歐式格子門窗
const frontTex = (c, kind, col) =>
  c.sg(`sjN2front${kind}${col}`, 256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = col;
    g.fillRect(0, 0, 256, 128);
    if (kind === 'arch') {
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.moveTo(22, 128);
      g.lineTo(22, 120);
      g.ellipse(128, 120, 106, 96, 0, Math.PI, 0);
      g.lineTo(234, 128);
      g.closePath();
      g.fill();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#f4f2ea';
      g.fillRect(126, 30, 4, 98);
      g.fillRect(40, 84, 176, 4);
    } else
      for (const [x0, n] of [
        [14, 3],
        [104, 2],
        [160, 3],
      ])
        for (let i = 0; i < n; i++)
          for (let y = 16; y < 96; y += 26) g.clearRect(x0 + i * 28 + 2, y, 24, 22);
  });
// 飲料海報（青嵐轉角外牆）
const posterTex = (c) =>
  c.sg('sjN2poster', 128, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 160);
    gr.addColorStop(0, '#6aa0d8');
    gr.addColorStop(1, '#3f78b8');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 160);
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath();
    g.moveTo(42, 50);
    g.lineTo(86, 50);
    g.lineTo(80, 130);
    g.lineTo(48, 130);
    g.closePath();
    g.fill();
    g.fillStyle = '#e8c890';
    g.beginPath();
    g.moveTo(44, 74);
    g.lineTo(84, 74);
    g.lineTo(80, 128);
    g.lineTo(48, 128);
    g.closePath();
    g.fill();
    g.fillStyle = '#f4f4f0';
    g.fillRect(40, 44, 48, 8);
    g.fillRect(66, 22, 4, 24);
  });

export default {
  ownSign: [],
  drop: [
    'f1046',
    'f2_477',
    'f2_478',
    'f2_479',
    'f2_480',
    'f2_481',
    'f2_482',
    'f2_483',
    'f2_484',
    'f2_603',
  ],
  fences: [],
  lots: [
    // 彎道內側（西側 s 151.7、168.1；東側 s 125.7、187）相鄰兩格的保留範圍會在屋後交疊，所以那幾格里程拉開一點、深度做淺；
    // 立面上差的那一小段（0.4～1.3 m）用 pier() 補一根同色牆柱。
    // ================= 西側（往北走的左手邊），由南往北 =================
    // W1 大樓：福州乾拌麵（沒有橫招，門口一支落地直立燈箱）
    [
      'N',
      110,
      112.5,
      -1,
      {
        ...W1,
        ground: 'open',
        awn: '#4a4a4a',
        noband: true,
        bikes: 0,
        extra: w1x((k, c) => {
          blade(
            k,
            c.paint('乾\n拌\n麵', '#ffffff', '#d0282a', null, 0.6, 1.5),
            0.5,
            1.3,
            0.6,
            1.5,
            1.0
          );
          blade(
            k,
            c.paint('福州', '#ffffff', '#2a4a9a', null, 0.6, 0.35),
            0.5,
            2.25,
            0.6,
            0.35,
            1.0
          );
        }),
      },
    ],
    [
      'N',
      112.5,
      117.5,
      -1,
      {
        ...W1,
        sign: ['', '#ffffff', '#1a1a1a'],
        round: ['自助洗衣', '#1a1a1a', '#ffffff'],
        ground: 'open',
        extra: w1x((k, c) => {
          k.plane(
            c.paint(
              '熊貓24hr自助洗衣宅',
              '#ffffff',
              '#1a1a1a',
              'Panda 24hr Self-service Laundry House',
              c.w - 1.6,
              0.8
            ),
            c.w - 1.6,
            0.8,
            c.w / 2 + 0.65,
            c.gf - 0.44,
            -0.3,
            c.FRONT,
            { emissive: 0.35 }
          );
          k.plane(pandaTex(c), 1.05, 0.79, 0.75, c.gf - 0.44, -0.3, c.FRONT, { emissive: 0.35 });
          k.box(0.4, 1.8, 0.9, c.gf - 1.5, -0.08, -0.04, '#4a96c8', { col: false }); // 店內藍色海報牆
          k.box(0.4, 1.8, 0.05, 0.9, -0.08, -0.04, '#e4e4e0', { col: false });
        }),
      },
    ],
    [
      'N',
      117.5,
      121.3,
      -1,
      {
        ...W1,
        sign: ['雨傘王', '#c8283a', '#ffffff'],
        ground: 'shop',
        bikes: 1,
        extra: w1x((k, c) =>
          blade(
            k,
            c.paint('雨傘王', '#c8283a', '#ffffff', 'Umbrella King', 1.5, 1.0),
            0.3,
            c.gf + 2.3,
            1.5,
            1.0
          )
        ),
      },
    ],
    [
      'N',
      121.3,
      128,
      -1,
      {
        ...W1,
        sign: ['樂韓鍋', '#1a1a1a', '#f0a030'],
        ground: 'shop',
        extra: w1x((k, c) => {
          blade(
            k,
            c.paint('樂韓鍋', '#1a1a1a', '#f0a030', null, 1.3, 1.0),
            0.5,
            c.gf + 1.2,
            1.3,
            1.0
          );
          k.plane(
            c.paint('樂韓鍋 中壢中原店 1/10 歡慶開幕', '#d42a2a', '#f5e060', null, c.w - 0.8, 0.6),
            c.w - 0.8,
            0.6,
            c.w / 2,
            c.gf - 1.2,
            -0.31,
            c.FRONT,
            { emissive: 0.15 }
          ); // 紅布條
        }),
      },
    ],
    // 金州食堂：招牌在灰黑瓦片斜雨庇下，門前木棧平台與木欄杆
    [
      'N',
      128,
      135.3,
      -1,
      {
        ...W1,
        sign: ['金州食堂 韓國料理', '#c8202a', '#f5e060'],
        ground: 'shop',
        bikes: 0,
        extra: w1x((k, c) => {
          blade(
            k,
            c.paint('金州食堂\n韓國料理', '#c8202a', '#ffffff', null, 1.4, 1.8),
            2.2,
            c.gf + 3.0,
            1.4,
            1.8
          );
          for (let j = 0; j < 4; j++)
            k.box(
              -0.05,
              c.w + 0.05,
              c.gf - j * 0.11,
              c.gf + 0.1 - j * 0.11,
              -0.45 - j * 0.4,
              -j * 0.4,
              '#4a4a4c',
              { col: false }
            ); // 招牌上方的灰黑瓦片斜雨庇
          k.box(0.6, c.w - 2.2, 0.05, 0.5, -1.45, 0, '#8a5a3a', { col: false });
          for (const yy of [0.75, 1.05])
            k.box(0.6, c.w - 2.2, yy, yy + 0.07, -1.45, -1.38, '#8a5a3a', { col: false });
          for (let x = 0.6; x <= c.w - 2.2; x += 1.1)
            k.box(x, x + 0.08, 0.5, 1.12, -1.45, -1.37, '#8a5a3a', { col: false });
          k.plane(
            c.paint('韓\n國\n料\n理', '#c8202a', '#ffffff', null, 0.5, 1.9),
            0.5,
            1.9,
            c.w - 1.6,
            1.5,
            -0.09,
            c.FRONT,
            { emissive: 0.2 }
          );
        }),
      },
    ],
    // CUT2 快剪：白色帆布雨棚（棚緣小字看不清楚，不寫），上半淺灰鐵捲門
    [
      'N',
      135.3,
      138.3,
      -1,
      {
        ...W1,
        ground: 'gate',
        sh: '#b8b4ac',
        awn: '#e8e6e0',
        noband: true,
        bikes: 0,
        extra: w1x((k, c) => {
          k.box(0, c.w, c.gf - 0.95, c.gf - 0.1, -0.8, 0, '#e8e6e0', { col: false });
          blade(k, c.roundSign('CUT2', '#ffffff', '#1a1a1a'), c.w - 0.1, 2.5, 0.7, 0.7, 0.1, {
            transparent: true,
          }); // 小圓招掛在鐵捲門南側、一樓高度
        }),
      },
    ],
    // 兩棟大樓中間的鐵皮窄縫（門牌 243）
    [
      'N',
      138.3,
      140.5,
      -1,
      {
        nf: 1,
        gf: 3.5,
        wall: '#a8aaa8',
        ground: 'shutter',
        sh: '#a8aaa8',
        door: 0,
        noband: true,
        d: 4,
        set: 5.5,
      },
    ],
    // W2 公寓：小吃攤（店名看不清楚，不寫字）
    [
      'N',
      140.5,
      144.8,
      -1,
      {
        ...W2,
        ground: 'stall',
        awn: '#3a3a3a',
        noband: true,
        extra: w2x((k, c) => {
          k.box(c.w - 1.7, c.w - 0.3, 0.3, 1.9, -1.25, -1.15, '#c8502a', { col: false }); // 門口的紅橘色菜單看板（字看不清楚，不寫）
          k.box(c.w - 1.55, c.w - 0.45, 0.9, 1.75, -1.27, -1.25, '#f0d8a8', { col: false });
        }),
      },
    ],
    // T-SHIRT王：黑色長橫帶（右端白字電話），下面掛一塊小白牌
    [
      'N',
      144.8,
      148.65,
      -1,
      {
        ...W2,
        d: 10,
        sign: ['', '#2a2a2a', '#ffffff'],
        ground: 'shop',
        extra: w2x((k, c) => {
          k.plane(
            c.paint('03-4382586', '#2a2a2a', '#ffffff', null, 1.3, 0.3),
            1.3,
            0.3,
            0.9,
            c.gf - 0.44,
            -0.3,
            c.FRONT,
            { emissive: 0.3 }
          );
          k.plane(
            c.paint('班系團服旗艦館', '#2a2a2a', '#ffffff', null, 1.5, 0.3),
            1.5,
            0.3,
            2.45,
            c.gf - 0.44,
            -0.3,
            c.FRONT,
            { emissive: 0.3 }
          );
          k.plane(
            c.paint('T-SHIRT 王', '#ffffff', '#1a1a1a', null, 1.5, 0.75),
            1.5,
            0.75,
            c.w - 1.1,
            c.gf - 1.1,
            -0.32,
            c.FRONT,
            { emissive: 0.3 }
          );
          darkGlass(k, c, 0.3, c.w - 0.3);
          pier(k, c, -0.7, 0, '#a88a88');
        }),
      },
    ],
    // 火漂火辣：木格門面，門邊木牌直書店名
    [
      'N',
      150.35,
      155,
      -1,
      {
        ...W2,
        d: 4.5,
        sign: ['火漂火辣', '#f0efe8', '#1a1a1a', '麻辣食堂'],
        ground: 'shop',
        extra: w2x((k, c) => {
          k.plane(
            frontTex(c, 'grid', '#8a6a48'),
            c.w - 0.5,
            c.gf - 1.0,
            c.w / 2,
            (c.gf - 1.0) / 2,
            -0.09,
            c.FRONT,
            { transparent: true }
          );
          k.plane(
            c.paint('火\n漂\n火\n辣', '#8a6a48', '#1a1a1a', null, 0.45, 1.8),
            0.45,
            1.8,
            c.w - 0.5,
            1.5,
            -0.12,
            c.FRONT
          );
          blade(
            k,
            c.roundSign('麻辣食堂', '#f4f4f0', '#3a3a3a'),
            c.w - 0.3,
            c.gf + 2.2,
            1.4,
            1.4,
            0.3,
            { transparent: true }
          ); // 二樓的白色圓招（南端）
        }),
      },
    ],
    // 享吃涼麵：招牌上緣一道綠色鐵皮雨庇，下面一條紅布條（字看不清楚，不寫）
    [
      'N',
      155,
      161.2,
      -1,
      {
        ...W2,
        d: 10,
        sign: ['', '#f5f0e8', '#1a1a1a'],
        ground: 'shutter',
        sh: '#6a6a6c',
        extra: w2x((k, c) => {
          k.plane(noodleTex(c), c.w - 0.15, 0.8, c.w / 2, c.gf - 0.44, -0.3, c.FRONT, {
            emissive: 0.35,
          });
          k.box(-0.05, c.w + 0.05, c.gf, c.gf + 0.1, -1.0, 0, '#3f8f6a', { col: false });
          k.box(0.8, c.w - 0.8, c.gf - 1.25, c.gf - 0.9, -0.33, -0.3, '#e04a3a', { col: false });
          blade(
            k,
            c.roundSign('享吃涼麵', '#ffffff', '#d83a2a'),
            c.w - 0.4,
            c.gf + 1.9,
            1.5,
            1.5,
            0.3,
            { transparent: true }
          );
          for (const x of [1.2, 3.0])
            k.box(x, x + 1.2, 0.05, 1.0, -1.4, -0.7, '#1e1e20', { col: false }); // 門前兩座黑色木作櫃檯
        }),
      },
    ],
    // W3 轉角樓：藍色木門窗的理髮店（小橫牌看不清楚，不寫字），門邊紅白藍理髮燈
    [
      'N',
      161.2,
      164.45,
      -1,
      {
        ...W3,
        d: 8,
        ground: 'shop',
        noband: true,
        extra: (k, c) => {
          k.plane(
            frontTex(c, 'grid', '#4a86b8'),
            c.w - 0.3,
            c.gf - 0.95,
            c.w / 2,
            (c.gf - 0.95) / 2,
            -0.09,
            c.FRONT,
            { transparent: true }
          );
          k.box(0.2, c.w - 0.2, c.gf - 0.95, c.gf - 0.3, -0.12, 0, '#3a4a5a', { col: false });
          k.box(1.0, 2.6, c.gf - 0.85, c.gf - 0.4, -0.16, -0.12, '#2a3a6a', { col: false });
          [
            ['#d8282a', 0],
            ['#f2f2f2', 1],
            ['#2a4aa8', 2],
            ['#f2f2f2', 3],
            ['#d8282a', 4],
          ].forEach(([col, j]) =>
            k.cyl(c.w - 0.25, -0.25, 0.09, 1.4 + j * 0.14, 1.54 + j * 0.14, col, { seg: 8 })
          );
          pier(k, c, -1.25, 0, '#8a5a52', 2);
        },
      },
    ],
    // 紅磚面小店（粉紅布條與店名看不清楚，不寫字）；上緣是 Knight 那條白色長招牌的南段
    [
      'N',
      167.55,
      171.5,
      -1,
      {
        ...W3,
        d: 4,
        sign: ['', '#f2f0ea', '#1a1a1a'],
        ground: 'shop',
        extra: (k, c) => {
          for (const x of [0, c.w - 0.9])
            k.box(x, x + 0.9, 0, c.gf - 0.85, -0.1, 0, c.MR.brick, {
              col: false,
              tile: [0.6, 0.6],
            });
          k.box(0.8, c.w - 0.8, c.gf - 1.5, c.gf - 1.0, -0.2, -0.17, '#e8a8b8', { col: false });
        },
      },
    ],
    // Knight 髮廊：白色長招牌（實景順著轉角彎，這裡在面巷子那一側再掛一段）、紅色琉璃瓦斜雨庇
    [
      'N',
      171.5,
      180,
      -1,
      {
        ...W3,
        d: 8,
        sign: ['Knight', '#f2f0ea', '#1a1a1a', '03-4566674'],
        awn: '#c8403a',
        ground: 'shop',
        extra: (k, c) => {
          k.box(0.2, c.w - 0.2, 0.05, 0.9, -0.1, -0.03, '#5a4a48', { col: false }); // 深色玻璃下緣的腰牆
          darkGlass(k, c, 0.2, c.w - 0.2, 0.9, '#3a363e');
          k.box(-0.3, 0, c.gf - 0.85, c.gf - 0.03, -0.28, 6, '#f2f0ea', { col: false });
          k.plane(
            c.paint('Knight', '#f2f0ea', '#1a1a1a', null, 4, 0.8),
            4,
            0.8,
            -0.31,
            c.gf - 0.44,
            2.6,
            -SIDE,
            { emissive: 0.35 }
          );
          k.box(-1.2, 0, c.gf - 1.05, c.gf - 0.95, -1.25, 6, '#c8403a', { col: false });
        },
      },
    ],
    // s 180～189 巷口與機車停車空地，不蓋（遊戲裡巷子在 s 180.9 往正西走，269 號南半只做一道 1 m 深的鐵捲門牆，才不會壓到巷子）
    // 269 號鐵捲門平房：女兒牆貼藍色馬賽克，北端一扇不鏽鋼小門
    [
      'N',
      189,
      190.5,
      -1,
      {
        nf: 1,
        gf: 4.0,
        wall: '#9a9a98',
        ground: 'shutter',
        sh: '#8a8478',
        door: 0,
        noband: true,
        roofCol: '#8a8a88',
        d: 1,
        set: 5.2,
        extra: (k, c) => {
          k.box(-0.05, c.w + 0.05, c.top, c.top + 0.9, -0.05, 0.2, c.wallMat('#4a6a9a'), {
            col: false,
            tile: [0.6, 0.6],
          });
          // 南邊巷口的機車停車空地（實景是柏油地、停滿機車）：鋪一塊柏油、擺兩排機車
          k.box(c.w, c.w + 3.2, 0, 0.06, -1.4, 6, '#3c3c3e', { col: false });
          const cols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
          for (let j = 0; j < 8; j++)
            c.bike(k, c.w + 0.1 + (j % 2) * 1.6, 0.5 + (j >> 1) * 0.9, 0, cols[(j * 5) % 6]);
        },
      },
    ],
    [
      'N',
      190.5,
      194.8,
      -1,
      {
        nf: 1,
        gf: 4.0,
        wall: '#9a9a98',
        ground: 'shutter',
        sh: '#8a8478',
        door: 0,
        noband: true,
        roofCol: '#8a8a88',
        d: 3,
        set: 5.2,
        extra: (k, c) => {
          k.box(-0.05, c.w + 0.05, c.top, c.top + 0.9, -0.05, 0.2, c.wallMat('#4a6a9a'), {
            col: false,
            tile: [0.6, 0.6],
          });
          k.box(0, 1.3, 0, c.gf, -0.06, 0, c.wallMat('#9a9a98'), { col: false });
          k.box(0.2, 1.1, 0.05, 2.1, -0.09, -0.06, '#b8bcc0', { col: false });
        },
      },
    ],
    // W5 大樓：伊萊克斯自助洗衣（北端是藍泉加水站的投幣加水機）
    [
      'N',
      194.8,
      202.4,
      -1,
      {
        ...W5,
        d: 8,
        sign: ['Electrolux 伊萊克斯 洗脫烘 一機完成', '#1f3f8a', '#ffffff', '歐洲瑞典SE第一品牌'],
        ground: 'shop',
        extra: w5x((k, c) => {
          k.box(0.05, c.w - 0.05, c.gf - 0.93, c.gf - 0.85, -0.29, 0, '#f08a2a', { col: false });
          k.box(1.7, c.w - 0.15, 0.05, 0.9, -0.08, -0.03, '#1f3f8a', { col: false });
          k.plane(
            c.paint('伊\n萊\n克\n斯', '#1f3f8a', '#ffffff', null, 0.5, 2.0),
            0.5,
            2.0,
            2.3,
            1.4,
            -0.1,
            c.FRONT,
            { emissive: 0.2 }
          );
          k.box(0.05, 1.7, 0, c.gf - 0.9, -0.07, 0, '#e8e8e4', { col: false }); // 加水站：白牆、四台加水機、綠色人工草皮
          k.plane(
            c.paint('藍泉加水站', '#2a5aa8', '#ffffff', null, 1.5, 0.35),
            1.5,
            0.35,
            0.9,
            c.gf - 1.15,
            -0.1,
            c.FRONT,
            { emissive: 0.3 }
          );
          for (let j = 0; j < 4; j++) {
            const x = 0.12 + j * 0.4;
            k.box(x, x + 0.34, 0.5, 1.9, -0.45, -0.07, '#f0f0ee', { col: false });
            k.box(x, x + 0.34, 1.55, 1.9, -0.46, -0.45, '#2a7ad0', { col: false });
          }
          k.box(0.05, 1.7, 0.05, 0.08, -1.1, 0, '#4a9a4a', { col: false });
          blade(k, sweTex(c), c.w - 0.2, c.gf + 2.3, 1.7, 1.05, 0.2);
          k.box(c.w - 3.3, c.w - 0.15, 0.05, c.gf - 0.95, -0.08, -0.03, '#1f3f8a', { col: false }); // 南半邊的藍色海報牆（洗衣機圖）
          k.box(c.w - 3.0, c.w - 1.3, 0.5, 2.3, -0.1, -0.08, '#e8eef4', { col: false });
          k.box(c.w - 2.75, c.w - 1.55, 0.6, 1.7, -0.12, -0.1, '#b8bcc4', { col: false });
          for (let f = 1; f < c.nf; f++)
            for (const zc of [2.4, 5.6])
              k.plane(c.YHT.win(), 1.2, 1.1, c.w + 0.03, c.gf + (f - 1) * c.fh + 1.4, zc, SIDE); // 南側外牆（269 號平房上方）的窗
          pier(k, c, -0.3, 0, '#c0c8ce');
        }),
      },
    ],
    // 安全帽店：一樓黑色門面與安全帽展示櫃，二樓整面白底安全帽看板（沒有店名），上面凸出藍底「安全帽／雨衣」
    [
      'N',
      202.6,
      211.5,
      -1,
      {
        ...W5,
        ground: 'shop',
        noband: true,
        roof: 'flat',
        extra: w5x((k, c) => {
          k.box(0.05, c.w - 0.05, c.gf - 0.95, c.gf - 0.25, -0.12, 0, '#1a1a1c', { col: false });
          k.plane(
            helmetTex(c, 12, '#1a1a1c', false),
            c.w - 0.3,
            0.6,
            c.w / 2,
            c.gf - 0.6,
            -0.13,
            c.FRONT,
            { emissive: 0.25 }
          );
          k.box(0.1, c.w - 0.1, c.gf - 0.1, c.gf + 2.3, -0.2, 0, '#f2f2f0', { col: false });
          k.plane(
            helmetTex(c, 5, '#f4f4f2', true),
            c.w - 0.3,
            2.3,
            c.w / 2,
            c.gf + 1.1,
            -0.21,
            c.FRONT,
            { emissive: 0.25 }
          );
          k.box(c.w - 1.1, c.w - 0.1, 0, c.gf - 0.95, -0.06, 0, '#2a2a2c', { col: false });
          k.box(c.w - 0.95, c.w - 0.25, 0.05, 2.1, -0.09, -0.06, '#9a9ea2', { col: false });
          darkGlass(k, c, 0.2, c.w - 1.2, 0.2, '#2a2a2e'); // 玻璃展示櫃：一層一層的安全帽
          for (const y of [0.65, 1.25, 1.85, 2.45])
            k.plane(
              helmetTex(c, 12, '#26262a', false),
              c.w - 1.7,
              0.55,
              (c.w - 1.0) / 2,
              y,
              -0.09,
              c.FRONT,
              { emissive: 0.2 }
            );
          blade(
            k,
            c.paint('安全帽', '#2a4fa0', '#f5d820', null, 2.2, 0.8),
            c.w - 0.3,
            c.gf + 3.8,
            2.2,
            0.8,
            0.2
          );
          blade(
            k,
            c.paint('雨衣', '#2a4fa0', '#ffffff', null, 2.2, 0.7),
            c.w - 0.3,
            c.gf + 3.05,
            2.2,
            0.7,
            0.2
          );
        }),
      },
    ],

    // ================= 東側（往北走的右手邊），由南往北 =================
    // E0 大樓：朝酒晚舞（米白鐵捲門），二樓掛「2ACO」深色橫牌
    [
      'N',
      110,
      115,
      1,
      {
        ...E0,
        sign: ['朝酒晚舞', '#eeeeee', '#1a1a1a'],
        sign2: ['2ACO', '#2a2c38', '#ffffff'],
        ground: 'shutter',
        sh: '#c9c0ae',
        bal: 'plain',
        extra: e0x(),
      },
    ],
    [
      'N',
      115,
      118,
      1,
      {
        ...E0,
        sign: ['小而大', '#e8e0d0', '#b0282a', '餃子館'],
        awn: '#4a4a4a',
        ground: 'shop',
        bal: 'open',
        extra: e0x((k, c) => {
          darkGlass(k, c, 0.2, c.w - 0.2, 0.25, '#423e3a');
          k.box(1.0, 2.0, 0.05, c.gf - 1.0, -0.1, -0.07, '#8a6a4a', { col: false }); // 深色玻璃與木格柵門
          // 北邊的地下停車場車道口（s 118～121）：柏油斜坡、洗石子矮牆、黃色防撞桿、裡面的灰鐵捲門
          const m = c.wallMat('#a59a86');
          k.box(c.w + 0.2, c.w + 3.0, -0.3, 0.16, -4.9, 3.0, '#3c3c3e', { col: false });
          k.box(c.w, c.w + 0.2, 0, 0.9, -3.6, 3.0, m);
          k.box(c.w, c.w + 3.0, 0, 3.2, 3.0, 3.3, m);
          k.plane(c.shutterTex('#9a9a98'), 2.6, 2.6, c.w + 1.55, 1.3, 2.98, c.FRONT);
          for (const x of [0.7, 2.4]) k.cyl(c.w + x, -4.6, 0.08, 0, 0.9, '#e8c020', { seg: 8 });
        }),
      },
    ],
    // s 118～121 地下停車場車道口，不蓋
    // E1 公寓：鮮茶道（深灰黑橫招、凸出的方形側招；面向車道的山牆掛白色橫幅）
    [
      'N',
      121,
      126.1,
      1,
      {
        ...E1,
        d: 9,
        sign: ['中原實踐店 416-1686', '#2a2a2c', '#ffffff'],
        ground: 'open',
        extra: (k, c) => {
          stone2(k, c, '#8a7a64');
          k.box(0.8, c.w - 1.4, 0, 1.05, -0.35, -0.05, '#2a2a2c', { col: false });
          k.box(0.75, c.w - 1.35, 1.05, 1.1, -0.4, -0.02, '#c8c4bc', { col: false }); // 點餐櫃檯
          pier(k, c, c.w, c.w + 0.46, '#d0cbc0');
          blade(
            k,
            c.paint('鮮茶道', '#f2f2ee', '#1a1a1a', 'Presotea', 1.7, 1.0),
            0.6,
            c.gf + 1.9,
            1.7,
            1.0
          );
          k.box(-0.05, 0, 0, c.gf + c.fh, 0, c.d, c.wallMat('#8a7a64'), {
            col: false,
            tile: [0.6, 0.6],
          });
          k.plane(
            c.paint('Presotea', '#f4f4f0', '#3a3a3a', '永遠的新鮮人 Stay fresh', 5, 1.3),
            5,
            1.3,
            -0.07,
            4.6,
            4.5,
            -SIDE
          );
        },
      },
    ],
    // 夾娃娃機店（整間敞開）；二樓外牆是樓上髮廊的米色橫招
    [
      'N',
      126.9,
      130.8,
      1,
      {
        ...E1,
        d: 9,
        ground: 'open',
        awn: '#9aa08a',
        noband: true,
        sign2: ['Salon', '#e6dcc8', '#2a2a2a'],
        roof: 'flat',
        extra: (k, c) => {
          stone2(k, c, '#8a7a64');
          for (let j = 0; j < 3; j++) {
            const x = 0.7 + j * 1.1;
            k.box(x, x + 0.8, 0.05, 1.9, -0.5, 0.0, '#f0b8c8', { col: false });
            k.box(x + 0.06, x + 0.74, 0.9, 1.75, -0.52, -0.5, '#dff0f4', { col: false });
          } // 粉色機台
        },
      },
    ],
    // 自助洗衣（只看得到圓招上的「洗衣」兩個大字），北端是樓梯門
    [
      'N',
      130.8,
      135.5,
      1,
      {
        ...E1,
        ground: 'open',
        awn: '#e8e8e4',
        noband: true,
        door: 1,
        roof: 'flat',
        extra: (k, c) => {
          stone2(k, c, '#8a7a64');
          blade(
            k,
            c.roundSign('洗衣', '#2a3558', '#ffffff'),
            c.w - 1.0,
            c.gf + 2.0,
            2.0,
            2.0,
            0.3,
            { transparent: true }
          );
        },
      },
    ],
    // E2 舊街屋：火少爺炒飯專賣店（灰鐵捲門，北端是樓梯口；招牌掛在平雨庇下面）
    [
      'N',
      135.5,
      141,
      1,
      {
        ...E3,
        wall: '#d4bca6',
        sign: ['火少爺 炒飯專賣店', '#f5f5f2', '#1a1a1a'],
        vert: ['火少爺', '#f5f5f2', '#d8281e'],
        ground: 'shutter',
        sh: '#8a8a8c',
        door: 1,
        extra: (k, c) =>
          k.box(-0.05, c.w + 0.05, c.gf, c.gf + 0.12, -1.3, 0, '#d8d8d4', { col: false }),
      },
    ], // 灰白平雨庇在招牌上方
    // E3 舊街屋：泰饗（木紋底招牌、泰國國旗、深藍灰鐵捲門）
    [
      'N',
      141,
      146.7,
      1,
      {
        ...E3,
        sign: ['泰饗 泰式料理', '#a87848', '#b8201a', '正宗'],
        ground: 'shutter',
        sh: '#3f4d66',
        awn: '#e8e8e4',
        extra: (k, c) => {
          k.plane(thaiTex(c), 0.8, 0.55, c.w - 0.65, c.gf - 0.44, -0.3, c.FRONT, { emissive: 0.3 }); // 國旗在招牌左端（面對店面的左手邊 = 北端）
          blade(
            k,
            c.paint('泰饗\n泰式料理', '#a87848', '#b8201a', '03-4658586', 1.7, 1.3),
            0.4,
            c.gf + 2.0,
            1.7,
            1.3
          );
        },
      },
    ],
    [
      'N',
      146.7,
      151,
      1,
      {
        ...E3,
        bal: 'plain',
        sign: ['', '#e4e4e6', '#e8504a'],
        round: ['海碗', '#ffffff', '#e8504a'],
        awn: '#4a4c52',
        ground: 'shop',
        extra: (k, c) => {
          drip(k, c);
          rail3(k, c);
          k.box(0.05, c.w - 0.05, c.gf - 0.03, c.gf + 0.85, -0.28, 0, '#e4e4e6', { col: false }); // 招牌比一般的高，蓋到二樓窗下
          k.plane(
            c.paint('海碗', '#e4e4e6', '#e8504a', 'Ocean Bowl', c.w - 0.3, 1.5),
            c.w - 0.3,
            1.5,
            c.w / 2,
            c.gf,
            -0.3,
            c.FRONT,
            { emissive: 0.35 }
          );
          darkGlass(k, c, 0.3, c.w - 0.3, 0.1, '#4a565e');
        },
      },
    ],
    // 278 號小店（店名看不清楚，不寫字）
    [
      'N',
      151,
      155.5,
      1,
      {
        ...E3,
        bal: 'plain',
        ground: 'stall',
        awn: '#4a4c52',
        noband: true,
        extra: (k, c) => {
          drip(k, c);
          rail3(k, c);
          k.box(0.05, c.w - 0.05, c.gf - 0.95, c.gf - 0.3, -0.1, 0, '#7a5a3c', { col: false });
        },
      },
    ],
    // 天地咖哩：沒有橫招，落地玻璃上貼金黃色大字；一樓紅磚柱、灰色水泥平雨庇
    [
      'N',
      155.5,
      161.5,
      1,
      {
        ...E3,
        bal: 'plain',
        ground: 'shop',
        awn: '#8a8a86',
        noband: true,
        extra: (k, c) => {
          rail3(k, c);
          for (const x of [0, c.w - 0.5])
            k.box(x, x + 0.5, 0, c.gf - 1.0, -0.1, 0, c.wallMat('#8a5a44'), {
              col: false,
              tile: [0.6, 0.6],
            });
          darkGlass(k, c, 0.5, c.w - 0.5, 0.1, '#4a3a2c');
          k.plane(goldTex(c, '天地'), 1.5, 0.75, c.w - 1.6, 1.5, -0.09, c.FRONT, {
            transparent: true,
            emissive: 0.3,
          }); // 面對店面：左「天地」右「咖哩」
          k.plane(goldTex(c, '咖哩'), 1.5, 0.75, 1.6, 1.5, -0.09, c.FRONT, {
            transparent: true,
            emissive: 0.3,
          });
        },
      },
    ],
    // s 161.5～172 中北路165巷口，不蓋
    // E4 轉角樓：青嵐（深藍色雨庇式招牌、白色門面；面向巷口的外牆掛藍色飲料海報與藍色橫帶）
    [
      'N',
      172,
      177,
      1,
      {
        nf: 4,
        wall: '#bab8b0',
        sign: ['青嵐', '#2a3350', '#ffffff', '中壢中原店'],
        ground: 'shop',
        bal: 'plain',
        d: 9,
        set: 5.2,
        door: 0,
        roof: 'flat',
        extra: (k, c) => {
          k.box(-0.3, c.w + 0.02, c.gf - 0.85, c.gf - 0.03, -0.9, -0.28, '#2a3350', { col: false }); // 招牌本體往前凸成雨庇
          k.plane(
            c.paint('青嵐', '#2a3350', '#ffffff', '中壢中原店', c.w, 0.8),
            c.w,
            0.8,
            c.w / 2,
            c.gf - 0.44,
            -0.91,
            c.FRONT,
            { emissive: 0.35 }
          );
          k.box(-0.06, 0, 0, c.gf - 0.03, 0, c.d, '#f2f0ea', { col: false });
          k.box(-0.3, -0.06, c.gf - 0.85, c.gf - 0.03, -0.9, 6, '#3f5a9a', { col: false });
          k.plane(
            c.paint('CHIN LAN', '#3f5a9a', '#ffffff', null, 4.5, 0.8),
            4.5,
            0.8,
            -0.31,
            c.gf - 0.44,
            2.8,
            -SIDE,
            { emissive: 0.35 }
          );
          k.plane(posterTex(c), 3.4, 4.6, -0.04, c.gf + 3.0, 2.6, -SIDE, { emissive: 0.15 });
          k.box(0, c.w, 0, c.gf - 0.85, -0.1, 0, '#f2f0ea', { col: false }); // 整面白色門面，中間偏北是內凹的點餐口
          k.box(1.5, c.w - 0.9, 0.05, 2.6, -0.12, -0.1, '#5a5650', { col: false });
          k.box(1.7, c.w - 1.2, 0.05, 1.0, -0.25, -0.12, '#e8e6e0', { col: false });
          k.plane(
            c.paint('青\n嵐', '#f2f0ea', '#5a4a30', null, 0.45, 1.0),
            0.45,
            1.0,
            0.6,
            1.6,
            -0.12,
            c.FRONT
          ); // 南端白柱上直書店名
          k.plane(
            c.paint('CHIN LAN', '#f2f0ea', '#5a4a30', null, 0.6, 0.16),
            0.6,
            0.16,
            0.6,
            2.25,
            -0.12,
            c.FRONT
          );
        },
      },
    ],
    // E5 公寓：御食苑（黃色圓拱牆面，北端黑鐵門是樓梯間），門口掛紅燈籠
    [
      'N',
      177,
      184.85,
      1,
      {
        ...E5,
        d: 6.5,
        sign: ['御食苑', '#f0f0ee', '#1a1a1a', '炒飯／麵食／小品'],
        ground: 'shop',
        bikes: 4,
        extra: (k, c) => {
          k.plane(
            frontTex(c, 'arch', '#e0b458'),
            c.w - 1.3,
            c.gf - 1.0,
            (c.w - 1.0) / 2,
            (c.gf - 1.0) / 2,
            -0.09,
            c.FRONT,
            { transparent: true }
          );
          blade(k, c.roundSign('御食苑', '#ffffff', '#1a1a1a'), 0.4, c.gf + 2.4, 1.4, 1.4, 0.3, {
            transparent: true,
          });
          for (const x of [1.0, c.w - 2.2]) {
            k.cyl(x, -0.7, 0.17, c.gf - 1.6, c.gf - 1.2, '#d8282a', { seg: 8 });
            k.box(x - 0.01, x + 0.01, c.gf - 1.2, c.gf - 0.85, -0.71, -0.69, '#2a2a2a', {
              col: false,
            });
          }
          k.box(c.w - 0.95, c.w - 0.1, 0.05, 2.3, -0.06, -0.03, '#1e1e20', { col: false });
          pier(k, c, c.w, c.w + 0.41, '#d2c2a4');
        },
      },
    ],
    // 碰碰胡 24h 自助桌遊：青綠色霧面大玻璃
    [
      'N',
      186.15,
      193,
      1,
      {
        ...E5,
        d: 6.5,
        sign: ['碰碰胡 PON PON HU', '#f2f2f0', '#8a8a8a', '24h自助桌遊'],
        vert: ['碰碰胡', '#f2f2f0', '#8a8a8a'],
        ground: 'shop',
        door: 0,
        bikes: 4,
        extra: (k, c) => {
          k.box(0.3, c.w - 0.3, 0.3, c.gf - 1.2, -0.07, -0.03, '#9cc8c0', { col: false });
        },
      },
    ],
    // 夾在公寓與 w1559051239 之間的深褐色小店（門上小橫牌看不清楚，不寫字）
    [
      'N',
      193,
      195,
      1,
      {
        nf: 1,
        gf: 3.4,
        wall: '#5a4a40',
        ground: 'shop',
        door: 0,
        noband: true,
        roofCol: '#4a4a48',
        d: 3,
        set: 6.5,
      },
    ],
  ],
};
