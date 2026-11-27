// 新中北路 s 430～530（新中一街口一帶，兩側；Google 街景 2026-05、國土測繪 2024 正射、Google 衛星）。
//   路窄，兩側屋簷前緣離中心線約 5.5～6.5 m，立面沿用 X4 的 set 6.2。
//   北側（+1）由東到西（東端接 SegX4.js 的白色一樓，s 430.2）：灰色文化石 5F → 中古電視 → 鐵皮小店 → 轉角小店 →
//     新中一街口（s 452～461，不蓋）→ BURGER TREE → 可可熊早午餐（同一幢暗紅 2F）→ 泓彥食堂 3F → 灰色磁磚 4F → 老町吐司工房 4F →
//     金隆便當 5F → 私人宅院（深灰磚矮牆、暗紅鐵大門、松柏樹，s 497～524）
//   南側（-1）由東到西（東端接 SegX4.js 的日嚐麵飯館，s 433）：白色 3F 眼鏡驗光所 → 窄 4F 娃娃機店 → 防火巷 → 2F「小時代」→
//     米褐 3F 車庫住宅 → 紅磚 6F 星城錢街／中古電腦 → 電線桿 → 416 巷口鐵拱門（s 480.5～485）→
//     深灰 6F 公寓、君隆牛肉麵（OSM w588976203、w588976206，不動，只在門面前掛招牌）→ Moss hair → 老裴早午餐 → 粉紅磁磚 5F →
//     中原收費停車場（s 521 以西，露天、綠色鐵絲網圍籬）
//   南側 s 454～470 後面有 src/world/CampusFix.js 新增的 6F cf-f1070b（立面在離中心線 7.5～8.3 m，不是這個檔能 DROP 的），
//   所以小時代西半、米褐 3F、星城東半只蓋 1～1.5 m 深的「門面」貼在它前面；f1070（填充）DROP 掉，星城西半自己蓋 15 m 深。
//   Kit 的區域座標：北側 x=0 在東端（s 小的那端），南側 x=0 在西端（s 大的那端）；-z 是街道。
const R = 'X',
  SET = 6.2;
const FNT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const one = (o) => ({ nf: 1, door: 0, set: SET, ...o });

// 星城那棟紅磚 6F（東半是門面、西半是整棟）
const XC = (o) => ({
  nf: 6,
  gf: 3.6,
  fh: 3.0,
  wall: '#8e4a3c',
  ground: 'shop',
  awn: ['#3a7cc0', '#f4f2ee'],
  bal: 'plain',
  roof: 'none',
  door: 0,
  set: SET,
  ...o,
});
// 小時代（2F 水泥磚、綠色長雨棚，二樓整面被招牌遮住）
const XSD = (o) => ({
  nf: 2,
  gf: 3.4,
  fh: 3.2,
  wall: '#8e8b86',
  ground: 'open',
  awn: '#2f8a5a',
  bal: 'plain',
  noband: true,
  roof: 'none',
  door: 0,
  set: SET,
  ...o,
});

export default {
  // 北側 f941、f983、f942～f947：實景是 3～5F 街屋（475～497）與宅院圍牆＋樹（497～523）；南側 f1070：星城紅磚樓的位置，自己重蓋
  drop: ['f941', 'f983', 'f942', 'f943', 'f944', 'f945', 'f946', 'f947', 'f1070'],
  ownSign: [], // 這段沒有 POI
  lots: [
    // ---- 北側 ----
    [
      R,
      430.2,
      438.5,
      1,
      {
        nf: 5,
        gf: 4.0,
        fh: 3.0,
        d: 14,
        set: SET,
        wall: '#8d8e8c',
        ground: 'shop',
        bal: 'plain',
        noband: true,
        roof: 'none',
        door: 0,
      },
    ], // 灰色文化石 5F（一樓玻璃店面上方的黑色鐵花雨庇、白色直立招牌在 custom）
    [
      R,
      438.5,
      443.5,
      1,
      one({
        gf: 3.4,
        d: 12,
        wall: '#e2ddd0',
        sign: ['中古電視', '#b8262b', '#ffffff'],
        ground: 'open',
        roofCol: '#7f9a74',
      }),
    ],
    [
      R,
      443.5,
      447.5,
      1,
      one({ gf: 3.3, d: 12, wall: '#ddd8cc', ground: 'shop', noband: true, roofCol: '#7f9a74' }),
    ], // 鐵皮小店（店名看不清）
    [
      R,
      447.5,
      452,
      1,
      one({
        gf: 3.0,
        d: 9,
        wall: '#e8e6e0',
        low: '#c8442c',
        ground: 'stall',
        noband: true,
        roofCol: '#9a9da0',
      }),
    ], // 新中一街東角的小攤店
    [
      R,
      461,
      466.5,
      1,
      {
        nf: 2,
        gf: 3.4,
        fh: 3.2,
        d: 12,
        set: SET,
        wall: '#7e2a32',
        low: '#e6d9b0',
        sign: ['BURGER TREE', '#8db04a', '#1a1a1a'],
        round: ['漢堡樹', '#4f8a2a', '#ffffff'],
        ground: 'shop',
        bal: 'grille',
        roof: 'none',
        door: 0,
      },
    ], // 白色女兒牆裝飾條在 custom
    [
      R,
      466.5,
      472,
      1,
      {
        nf: 2,
        gf: 3.4,
        fh: 3.2,
        d: 12,
        set: SET,
        wall: '#7e2a32',
        sign: ['可可熊', '#6b4a35', '#ffffff', '早午餐'],
        ground: 'shop',
        bal: 'grille',
        roof: 'none',
        door: 0,
      },
    ],
    [
      R,
      472,
      478,
      1,
      {
        nf: 3,
        gf: 3.4,
        fh: 3.0,
        d: 13,
        set: SET,
        wall: '#8a8278',
        sign: ['泓彥食堂', '#e8d641', '#1a1a1a'],
        vert: ['泓彥食堂', '#e8d641', '#1a1a1a'],
        awn: '#e8d641',
        ground: 'shop',
        bal: 'grille',
        roof: 'tank',
        door: 0,
      },
    ],
    [
      R,
      478,
      484,
      1,
      {
        nf: 3,
        gf: 3.3,
        fh: 3.2,
        d: 13,
        set: SET,
        wall: '#9a9893',
        ground: 'shutter',
        sh: '#a3a5a8',
        awn: '#4a8a5a',
        noband: true,
        bal: 'plain',
        roof: 'none',
      },
    ], // 灰色磁磚 4F（鐵捲門、綠色小帆布棚）
    [
      R,
      484,
      490,
      1,
      {
        nf: 3,
        gf: 3.3,
        fh: 3.2,
        d: 13,
        set: SET,
        wall: '#9c9a95',
        ground: 'shutter',
        sh: '#b4b4b0',
        sign: ['老町吐司工房', '#e27a2a', '#4a2a1a'],
        sign2: ['套房出租', '#ffffff', '#d8232a'],
        awn: ['#c8302a', '#f4f2ee'],
        bal: 'plain',
        roof: 'tank',
        door: 0,
      },
    ],
    [
      R,
      490,
      497,
      1,
      {
        nf: 5,
        gf: 3.4,
        fh: 3.0,
        d: 14,
        set: SET,
        wall: '#d2c6b0',
        sign: ['金隆便當', '#2a2624', '#ffffff'],
        awn: '#7a4030',
        ground: 'shop',
        bal: 'plain',
        roof: 'none',
      },
    ],
    // ---- 南側 ----
    [
      R,
      433.0,
      441,
      -1,
      {
        nf: 3,
        gf: 3.6,
        fh: 3.0,
        d: 12,
        set: SET,
        wall: '#e8e8e4',
        ground: 'shop',
        bal: 'plain',
        noband: true,
        roof: 'shack',
        door: 0,
      },
    ], // 白色眼鏡驗光所（三樓白色帆布廣告、藍色側招在 custom）
    [
      R,
      441,
      445.5,
      -1,
      {
        nf: 4,
        gf: 3.4,
        fh: 3.0,
        d: 12,
        set: SET,
        wall: '#ddd6c8',
        ground: 'open',
        bal: 'cage',
        noband: true,
        roof: 'none',
        door: 0,
      },
    ], // 窄 4F 娃娃機店
    [R, 447.5, 452, -1, XSD({ d: 5.8 })], // 小時代東半（後面斜斜的是 cf-f1070b，只能蓋 5.8 m 深）
    [R, 452, 457, -1, XSD({ d: 1.1 })], // 小時代西半：貼在 cf-f1070b 前面的門面
    [
      R,
      457,
      463,
      -1,
      {
        nf: 3,
        gf: 3.2,
        fh: 3.0,
        d: 0.9,
        set: 6.5,
        wall: '#b9a98e',
        ground: 'open',
        bal: 'open',
        noband: true,
        roof: 'none',
        door: 0,
      },
    ], // 米褐 3F 車庫住宅（門面）
    [R, 463, 470.6, -1, XC({ d: 1.5, sign: ['星城 錢街', '#f4f2ee', '#b8282a'] })], // 星城東半（門面）
    [R, 470.6, 478, -1, XC({ d: 15, sign: ['中古電腦', '#2a3fa0', '#ffffff', '電腦維修'] })],
    [
      R,
      503.3,
      509,
      -1,
      {
        nf: 5,
        gf: 3.4,
        fh: 3.0,
        d: 13,
        set: SET,
        wall: '#c8a89a',
        noband: true,
        ground: 'shop',
        bal: 'rail',
        roof: 'none',
        door: 0,
      },
    ],
    [
      R,
      509,
      514,
      -1,
      {
        nf: 5,
        gf: 3.4,
        fh: 3.0,
        d: 13,
        set: SET,
        wall: '#c8a89a',
        sign: ['老裴', '#5a3a30', '#f2c83a', '早午餐'],
        ground: 'shop',
        bal: 'cage',
        roof: 'none',
      },
    ], // 門口木柵座位區、紅色燈籠在 custom
    [
      R,
      514,
      521,
      -1,
      {
        nf: 5,
        gf: 3.4,
        fh: 3.0,
        d: 13,
        set: SET,
        wall: '#c88a80',
        ground: 'shutter',
        sh: '#a9a9a4',
        noband: true,
        bal: 'cage',
        roof: 'tank',
      },
    ], // 粉紅磁磚 5F（紅色招牌只露一角，看不清，不放字）
  ],

  custom(C) {
    const { THREE, VC, FRONT, sg, paint, paintGeo, bike, bikeCols, openTex } = C;
    const PI = Math.PI,
      NC = { col: false },
      STEEL = '#4a4d50';
    // C.kit 會把寬度塞進 k.w，蓋掉 Kit 自己的 w()（區域→世界座標，碰撞要用），所以改放到 k.W
    const K = (s0, s1, side, set = SET) => {
      const k = C.kit(R, s0, s1, side, set),
        w = k.w;
      delete k.w;
      k.W = w;
      return k;
    };
    const addG = (k, g, hex) => k._part(VC, paintGeo(g, hex));
    const slopeZ = (k, x0, x1, z0, y0, z1, y1, th, hex) => {
      const dz = z1 - z0,
        dy = y1 - y0,
        g = new THREE.BoxGeometry(x1 - x0, th, Math.hypot(dz, dy));
      g.rotateX(-Math.atan2(dy, dz));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      return addG(k, g, hex);
    };
    const board = (k, tex, bw, bh, xc, y0, z = -0.06, em = 0.3) => {
      k.box(xc - bw / 2, xc + bw / 2, y0, y0 + bh, z, z + 0.1, STEEL, NC);
      k.plane(tex, bw, bh, xc, y0 + bh / 2, z - 0.012, FRONT, { emissive: em });
    };
    // 垂直於路的側招（兩面都有字，zc 是板子中心離立面的距離，負的是伸到街上）
    const flag = (k, tex, fw, fh, x, yc, zc, o = {}) => {
      k.box(
        x - 0.035,
        x + 0.035,
        yc - fh / 2,
        yc + fh / 2,
        zc - fw / 2,
        zc + fw / 2,
        o.edge || '#e8e6e0',
        NC
      );
      for (const sd of [-1, 1])
        k.plane(tex, fw, fh, x + sd * 0.045, yc, zc, (sd * PI) / 2, { emissive: o.em ?? 0.3 });
    };
    const ball = (k, x, y, z, r, hex, sy = 1) => {
      const g = new THREE.SphereGeometry(r, 8, 6);
      g.scale(1, sy, 1);
      g.translate(x, y, z);
      addG(k, g, hex);
    };
    const tree = (k, x, z, h, cr, r) => {
      k.cyl(x, z, 0.26, -0.5, h - cr, '#5e4630', { seg: 6, r1: 0.16, col: true });
      const G = ['#3f7a3a', '#4b8a3e', '#356b34'];
      ball(k, x, h - cr * 0.85, z, cr * 0.8, G[0], 0.75);
      for (let j = 0; j < 4; j++) {
        const a = j * 1.57 + r() * 0.8;
        ball(
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
    // 松柏（龍柏類）：深綠色、從低處就長滿葉子的尖塔形
    const conifer = (k, x, z, h, rad) => {
      k.cyl(x, z, 0.2, -0.5, h * 0.25, '#5e4630', { seg: 6 });
      k.cyl(x, z, rad, h * 0.15, h * 0.6, '#2f5a36', { seg: 8, r1: rad * 0.6 });
      k.cyl(x, z, rad * 0.65, h * 0.52, h, '#356b3c', { seg: 8, r1: 0.08 });
    };
    const pole = (k, x, z) => {
      k.cyl(x, z, 0.16, -0.5, 9, '#a9a7a0', { seg: 8, col: true });
      for (let i = 0; i < 4; i++)
        k.cyl(x, z, 0.165, 0.4 + i * 0.3, 0.55 + i * 0.3, i % 2 ? '#1e1e1e' : '#e8c02a', {
          seg: 8,
        });
    };

    // ---------- 貼圖 ----------
    const T = {
      filigree: () =>
        sg('xzX5filigree', 512, 64, (g) => {
          // 黑色鏤空鐵花（透明底）
          g.clearRect(0, 0, 512, 64);
          g.strokeStyle = '#1c1c1e';
          g.fillStyle = '#1c1c1e';
          g.fillRect(0, 0, 512, 6);
          g.fillRect(0, 58, 512, 6);
          g.lineWidth = 4;
          for (let x = 0; x < 512; x += 32) {
            g.beginPath();
            g.arc(x + 16, 32, 12, 0, 7);
            g.stroke();
            g.fillRect(x, 6, 3, 52);
          }
        }),
      canvas3f: () =>
        sg('xzX5canvas3f', 512, 192, (g) => {
          // 眼鏡行三樓白色帆布廣告：白底、幾排黑色三角點
          g.fillStyle = '#f4f4f0';
          g.fillRect(0, 0, 512, 192);
          g.fillStyle = '#1c1c1e';
          for (let y = 30, row = 0; y < 180; y += 44, row++)
            for (let x = 30 + (row % 2) * 22; x < 500; x += 44) {
              g.beginPath();
              g.moveTo(x, y - 10);
              g.lineTo(x + 11, y + 9);
              g.lineTo(x - 11, y + 9);
              g.closePath();
              g.fill();
            }
        }),
      mesh: () =>
        sg('xzX5mesh', 128, 128, (g) => {
          // 綠色鐵絲網（菱形網、透明底）
          g.clearRect(0, 0, 128, 128);
          g.strokeStyle = 'rgba(60,120,80,.85)';
          g.lineWidth = 2;
          for (let i = -128; i < 256; i += 16) {
            g.beginPath();
            g.moveTo(i, 0);
            g.lineTo(i + 128, 128);
            g.stroke();
            g.beginPath();
            g.moveTo(i, 128);
            g.lineTo(i + 128, 0);
            g.stroke();
          }
        }),
      brickWall: () =>
        sg('xzX5brickWall', 256, 64, (g) => {
          // 深灰磚矮牆
          g.fillStyle = '#4a4640';
          g.fillRect(0, 0, 256, 64);
          g.fillStyle = '#5a5650';
          for (let y = 0; y < 64; y += 8)
            for (let x = (y / 8) % 2 ? 8 : 0; x < 256; x += 16) g.fillRect(x + 1, y + 1, 14, 6);
        }),
      xsd: () =>
        sg('xzX5xsd', 1024, 256, (g) => {
          // 小時代：深灰藍底、白色大字
          g.fillStyle = '#3a4150';
          g.fillRect(0, 0, 1024, 256);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#ffffff';
          g.font = FNT(170);
          g.fillText('小時代', 470, 132);
        }),
      gate: () =>
        sg('xzX5gate', 256, 128, (g) => {
          // 暗紅色鐵大門（雙扇、直條）
          g.fillStyle = '#6e2622';
          g.fillRect(0, 0, 256, 128);
          g.fillStyle = '#4e1a18';
          for (let x = 6; x < 256; x += 14) g.fillRect(x, 10, 5, 112);
          g.fillRect(0, 0, 256, 10);
          g.fillRect(0, 60, 256, 6);
          g.fillRect(0, 118, 256, 10);
          g.fillRect(126, 0, 4, 128);
        }),
    };

    // 一樓鐵皮屋的屋頂顏色（lots 的 roofCol 被外殼的灰色屋頂板蓋住，這裡再鋪一層）
    for (const [, s0, s1, side, sp] of this.lots)
      if (sp.nf === 1 && sp.roofCol) {
        const k = K(s0, s1, side, sp.set);
        k.box(-0.15, k.W + 0.15, sp.gf + 0.12, sp.gf + 0.17, -0.4, sp.d, sp.roofCol, NC);
      }

    // ================= 北側 =================
    {
      // N1：灰色文化石 5F（一樓上方整面黑色鏤空鐵花雨庇、西側二樓以上的白色直立招牌（字看不清，不放字）、路邊白色方形立牌）
      const k = K(430.2, 438.5, 1),
        w = k.W;
      k.box(-0.05, w + 0.05, 3.3, 3.38, -0.9, 0, '#1c1c1e', NC);
      k.plane(T.filigree(), w + 0.1, 0.6, w / 2, 3.68, -0.9, FRONT, { transparent: true });
      k.box(w - 0.6, w - 0.5, 4.6, 12.5, -0.9, -0.1, '#f2f1ec', NC);
      k.box(1.0, 1.7, 0, 1.2, -1.6, -1.52, '#f2f1ec', NC);
    }
    {
      // N2：中古電視（簷口綠色浪板、門牌 437 號、門口堆的舊電視）
      const k = K(438.5, 443.5, 1),
        w = k.W;
      k.box(-0.05, w + 0.05, 3.4, 3.5, -0.9, 0, '#7f9a74', NC);
      k.plane(
        paint('437號', '#ffffff', '#1a1a1a', null, 0.5, 0.25, 256),
        0.5,
        0.25,
        0.5,
        2.2,
        -0.05,
        FRONT
      );
      for (let i = 0; i < 4; i++)
        k.box(0.5 + i * 0.9, 1.2 + i * 0.9, 0, 0.6 + (i % 2) * 0.5, -0.9, -0.3, '#2a2c2e', NC);
    }
    {
      // N3：綠浪板簷口、門上的紅色小海報
      const k = K(443.5, 447.5, 1),
        w = k.W;
      k.box(-0.05, w + 0.05, 3.3, 3.4, -0.9, 0, '#7f9a74', NC);
      k.box(0.6, 1.0, 1.2, 1.8, -0.06, -0.04, '#c8302a', NC);
    }
    {
      // N5、N6：同一幢暗紅 2F 的白色女兒牆裝飾條
      const k = K(461, 472, 1),
        w = k.W,
        top = 3.4 + 3.2;
      k.box(0, w, top + 0.1, top + 0.9, -0.08, 0.2, '#f2f1ec', NC);
      k.box(0, w, top + 0.35, top + 0.45, -0.14, -0.08, '#d8d6cf', NC);
      k.box(0, w, top + 0.1, top + 0.9, 11.8, 12.0, '#f2f1ec', NC);
    }
    {
      // N10：金隆便當的黑色直立側招在西端（從東邊看過去在左手邊）
      const k = K(490, 497, 1),
        w = k.W;
      flag(
        k,
        paint('金\n隆\n便\n當', '#2a2624', '#ffffff', null, 0.8, 2.8),
        0.8,
        2.8,
        w - 0.3,
        6.2,
        -0.55,
        { edge: '#2a2624' }
      );
    }
    {
      // N11：私人宅院（深灰磚矮牆、暗紅雙扇鐵大門、門前水泥坡道、牆內整排松柏與幾棵大樹、牆前一整排機車）
      const k = K(497, 524, 1, 6.5),
        w = k.W,
        r = C.lcg(5497),
        g0 = 509 - 497,
        g1 = 514 - 497;
      for (const [x0, x1] of [
        [0, g0 - 0.3],
        [g1 + 0.3, w],
      ]) {
        k.box(x0, x1, 0, 1.5, 0, 0.3, 'wall#4a4640');
        k.plane(T.brickWall(), x1 - x0, 1.5, (x0 + x1) / 2, 0.75, -0.01, FRONT);
        k.box(x0 - 0.02, x1 + 0.02, 1.5, 1.6, -0.04, 0.34, '#3a3632', NC);
      }
      pole(k, 3.2, -0.4); // 牆前一對電線桿
      pole(k, 3.6, -0.4);
      for (const x of [g0 - 0.3, g1]) k.box(x, x + 0.3, 0, 2.4, -0.05, 0.35, '#3a3632'); // 門柱
      k.box(g0, g1, 0, 2.1, 0.1, 0.18, '#6e2622');
      k.plane(T.gate(), g1 - g0, 2.1, (g0 + g1) / 2, 1.05, 0.09, FRONT);
      k.box(g0 - 0.3, g1 + 0.3, -0.5, 0.06, -1.9, 0.1, '#a9a7a0', NC); // 門前水泥坡道
      for (let x = 0.8, i = 0; x < w - 0.5; x += 0.75, i++) {
        if (x > g0 - 1.2 && x < g1 + 0.6) continue;
        if (r() < 0.2) continue;
        bike(k, x, -1.9, 1, bikeCols[(i * 5 + 2) % 6]);
      }
      // 牆內：實景沿牆是一排茂密的闊葉樹（樹冠從牆頭就開始），後面夾幾棵高高的松柏
      for (let x = 1.6; x < w - 1.0; x += 3.2) {
        if (x > g0 - 1.0 && x < g1 + 1.0) continue;
        tree(k, x + (r() - 0.5) * 0.8, 2.2 + r() * 1.2, 6 + r() * 2, 2.2 + r() * 0.5, r);
      }
      for (const [x, z, h, rad] of [
        [6.5, 6.5, 10, 1.6],
        [9.5, 8, 11, 1.7],
        [20, 7, 9.5, 1.5],
      ])
        conifer(k, x, z, h, rad);
      for (const [x, z, h, cr] of [
        [14.5, 9.5, 9, 3.2],
        [24, 9, 8.5, 3.0],
      ])
        tree(k, x, z, h, cr, r);
      k.box(0, w, -0.5, 0.04, 0.3, 24, '#8a8a72', NC); // 院子地面
      // 院子深處的老屋（從大門正對看得到：米白 2F、綠色飾邊、紅門；正射上離中心線約 30～40 m、屋頂灰色帶一塊紅色）
      const hx0 = 11,
        hx1 = 25,
        hz0 = 24,
        hz1 = 33,
        hh = 6.6;
      k.box(hx0, hx1, 0, hh, hz0, hz1, 'wall#d8d0bc');
      for (const y of [3.2, hh - 0.25])
        k.box(hx0 - 0.05, hx1 + 0.05, y, y + 0.25, hz0 - 0.06, hz1 + 0.05, '#3f7a52', NC);
      k.box(hx0 - 0.1, hx1 + 0.1, hh, hh + 0.15, hz0 - 0.1, hz1 + 0.1, C.MR.roof, NC);
      k.box(hx0 + 2, hx0 + 7, hh + 0.15, hh + 0.25, hz0 + 0.5, hz0 + 5, '#b84a3a', NC);
      k.box(17, 19, 0, 2.3, hz0 - 0.06, hz0, '#a8322a', NC); // 紅門
      for (const x of [13, 15, 21, 23]) {
        k.box(x - 0.6, x + 0.6, 1.0, 2.3, hz0 - 0.06, hz0, '#2c3a40', NC);
        k.box(x - 0.6, x + 0.6, 4.2, 5.5, hz0 - 0.06, hz0, '#2c3a40', NC);
      }
      // 東邊靠牆的紅頂平房
      k.box(6.5, 11, 0, 3.0, 19.5, 26, 'wall#cfc6b2');
      k.box(6.4, 11.1, 3.0, 3.15, 19.4, 26.1, '#b84a3a', NC);
    }

    // ================= 南側 =================
    {
      // S1：白色眼鏡驗光所（三樓白色帆布廣告、二樓東側凸出的深藍側招；店名第一個字看不清，只放看得清的「眼鏡 驗光所」）
      const k = K(433.0, 441, -1),
        w = k.W;
      k.plane(T.canvas3f(), w - 0.6, 2.6, w / 2, 3.6 + 3.0 + 1.4, -0.08, FRONT, { emissive: 0.1 });
      flag(
        k,
        paint('眼鏡\n驗光所', '#23307a', '#ffffff', null, 1.2, 1.8),
        1.2,
        1.8,
        w - 0.3,
        5.2,
        -0.7,
        { edge: '#23307a' }
      );
    }
    {
      // S3：小時代（二樓整面招牌、黃色大布條、東端直立紅招、頂樓深灰斜鐵皮棚）
      const k = K(447.5, 457, -1),
        w = k.W;
      // 實景：二樓上半是小時代大招牌，下半掛一條黃色大布條（不是在一樓）
      board(k, T.xsd(), w - 0.4, 1.8, w / 2, 4.7, -0.85, 0.3); // 板子要在冷氣室外機前面
      board(
        k,
        paint('五折天歡喜購', '#f2d23a', '#d8232a', null, 6.2, 1.0),
        6.2,
        1.0,
        w / 2 + 0.6,
        3.6,
        -0.95,
        0.2
      );
      flag(
        k,
        paint('小\n時\n代', '#c8302a', '#ffffff', '24H', 0.9, 2.6),
        0.9,
        2.6,
        w - 0.15,
        4.9,
        -0.6,
        { edge: '#c8302a' }
      );
      // 頂樓斜鐵皮棚只蓋在東半（5.8 m 深的那段，x = w-4.5 ～ w）
      const xe = 452 - 447.5;
      slopeZ(k, w - xe + 0.1, w - 0.1, 0.3, 6.7, 5.4, 8.3, 0.08, '#5a5d60');
      for (const z of [0.4, 5.3])
        for (const x of [w - xe + 0.2, w - 0.3])
          k.box(x, x + 0.08, 6.6, 6.7 + (z / 5.1) * 1.6, z, z + 0.08, STEEL, NC);
    }
    {
      // S5：星城（東端二樓以上掛白底紅字的「星城」直招）
      const k = K(463, 478, -1),
        w = k.W;
      flag(k, paint('星\n城', '#f4f2ee', '#b8282a', null, 0.9, 2.0), 0.9, 2.0, w - 0.3, 5.6, -0.6, {
        edge: '#c9a04a',
      });
    }
    {
      // S6：電線桿
      const k = K(478, 480.5, -1);
      pole(k, 1.2, -0.3);
    }
    {
      // S7：416 巷口的鐵拱門與黃黑橫桿（立柱在巷子兩邊，拱門不加碰撞）
      const k = K(480.5, 485, -1, 6.4),
        w = k.W;
      for (const x of [0.15, w - 0.15])
        k.cyl(x, 0.2, 0.09, 0, 4.4, '#3a3d40', { seg: 8, col: true });
      const g = new THREE.TorusGeometry(w / 2 - 0.15, 0.07, 6, 18, PI);
      g.scale(1, 0.25, 1);
      g.translate(w / 2, 4.4, 0.2);
      addG(k, g, '#3a3d40');
      k.box(0.15, w - 0.15, 4.0, 4.06, 0.17, 0.23, '#3a3d40', NC);
      const bl = (w * 0.7 - 0.3) / 6;
      for (let i = 0; i < 6; i++)
        k.box(
          0.3 + i * bl,
          0.3 + (i + 1) * bl,
          1.0,
          1.1,
          0.15,
          0.25,
          i % 2 ? '#1c1c1e' : '#f2c81e',
          NC
        );
      k.box(0.05, 0.3, 0, 1.15, 0.1, 0.3, '#3a3d40', NC);
    }
    {
      // S8：君隆牛肉麵（OSM w588976206 的門面：紅色店面、黃底紅字長招；建物本身不動）
      const k = K(495.6, 502.6, -1, 7.35),
        w = k.W;
      k.box(0.2, w - 0.2, 0, 2.6, 0, 0.08, '#b8302a'); // 店面貼在 OSM 牆外 0.5 m，本身擋人
      k.plane(openTex, w - 1.6, 2.1, w / 2, 1.05, -0.01, FRONT, { emissive: 0.25 });
      board(
        k,
        paint('君隆牛肉麵', '#f0d24a', '#c8281e', '水餃 燴飯 炒飯 炒麵 (03)461-5683', w - 0.5, 1.0),
        w - 0.5,
        1.0,
        w / 2,
        2.7,
        -0.3
      );
    }
    {
      // S9：Moss hair（一樓上方整片白色鐵皮大招牌、下面紅布條、西端伸出去的白色側招與電話）
      const k = K(503.3, 509, -1),
        w = k.W;
      board(
        k,
        paint('Moss hair', '#f0f0ee', '#3a3a3a', null, w - 0.2, 1.3),
        w - 0.2,
        1.3,
        w / 2,
        2.4,
        -0.35
      );
      k.plane(
        paint('學生剪髮 300 元', '#c8302a', '#ffffff', null, 2.6, 0.45),
        2.6,
        0.45,
        w / 2 + 0.6,
        2.12,
        -0.4,
        FRONT,
        { emissive: 0.15 }
      );
      flag(
        k,
        paint('Moss hair', '#f4f4f2', '#3a3a3a', '03-4513457', 1.8, 0.9),
        1.8,
        0.9,
        0.3,
        4.6,
        -1.0,
        { edge: '#d8d8d4' }
      );
    }
    {
      // S10：老裴早午餐門口的木柵座位區與紅色鳳梨燈籠
      const k = K(509, 514, -1),
        w = k.W;
      for (let x = 0.4; x < w - 1.4; x += 0.25)
        k.box(x, x + 0.08, 0, 0.9, -1.5, -1.42, '#8a6a4a', NC);
      k.box(0.4, w - 1.4, 0.85, 0.92, -1.52, -1.4, '#7a5a3a', NC);
      for (const x of [1.0, 2.6]) {
        const g = new THREE.SphereGeometry(0.22, 8, 6);
        g.scale(1, 1.3, 1);
        g.translate(x, 2.0, -1.1);
        addG(k, g, '#d8302a');
      }
    }
    {
      // S11：粉紅磁磚 5F 對停車場的西側牆，實景是整面沒有窗的磁磚凹框，蓋掉外露側牆自動開的窗
      const k = K(514, 521, -1),
        top = 3.4 + 4 * 3.0;
      k.box(-0.1, -0.04, 3.2, top, 0.15, 12.85, 'wall#c88a80', NC);
      for (let y = 3.2 + 3.0; y < top - 0.5; y += 3.0)
        k.box(-0.14, -0.1, y - 0.12, y + 0.12, 0.15, 12.85, '#b07a70', NC);
      for (const z of [4.3, 8.6]) k.box(-0.14, -0.1, 3.2, top, z - 0.12, z + 0.12, '#b07a70', NC);
    }
    {
      // S12：中原收費停車場（臨路綠色鐵絲網圍籬約 1.6 m、柏油地、圍籬外一排機車）
      const k = K(521, 530, -1, 6.0),
        w = k.W,
        r = C.lcg(5521);
      for (let x = 0; x <= w + 0.01; x += w / 4) k.cyl(x, 0, 0.04, 0, 1.65, '#3c6e4c', { seg: 6 });
      k.box(0, w, 1.6, 1.65, -0.03, 0.03, '#3c6e4c', NC);
      k.wallRect(0, w, -0.02, 0.02, 0, 1.6);
      for (const sd of [-1, 1])
        k.plane(T.mesh(), w, 1.6, w / 2, 0.8, sd * 0.01, sd < 0 ? FRONT : 0, { transparent: true });
      k.box(0, w, -0.5, 0.03, 0.05, 18, '#55565a', NC);
      for (let x = 0.6, i = 0; x < w - 0.6; x += 0.8, i++)
        if (r() > 0.25) bike(k, x, -1.8, 1, bikeCols[(i * 3 + 1) % 6]);
    }
  },

  footprints(F) {
    return [
      F(R, 497, 524, 1, 6.5, 34), // 宅院圍牆、院子的樹與深處的老屋
      F(R, 480.5, 485, -1, 6.4, 0.6), // 416 巷口拱門立柱
      F(R, 521, 530, -1, 6.0, 18), // 收費停車場
    ];
  },
};
