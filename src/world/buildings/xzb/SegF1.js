// 幸福街 s 13～173.5 東側（中北路口轉角之後到中山東路口的紅燈籠小屋之前；參考線 'F'，s=0 在中北路口往南走，路寬 5 m）。
// 照 Google 街景（s 4～28 是 2017-09／2025-06 使用者相片球，s 40～64 是 2026-05 車拍，s 76 是 2022-06，s 88～184 是 2024-08）、
// 國土測繪 2024 正射與 OSM 輪廓建模，店家先後順序照照片、寬度照照片換算與 OSM 輪廓（照片在 side-session-notes 的 zs-sv/F/）。
//   東側（-1、照片 _L）由中北路往中山東路：
//     大衛剪髮（2025，2017 是大埔鐵板燒）→ 達達美甲（2017 是 BURTY 柏堤）→ 鐵捲門店（二樓整面玻璃，粉紅花圖招牌看不清）→ 窄兩樓店面 →
//     中原天廈（5～9 號，OSM w1153472232，12 樓以上白磁磚，量體和實景差不多所以保留；前面補白磁磚花台矮牆、黑金色大門與雨棚、前庭的樹）→
//     中壢錫安堂（13 號，4 樓白色小磁磚，一樓紫色招牌、二樓幸福裝潢修繕招牌）→ 協同街（東側岔巷，s≈68～74）→
//     5 樓黃褐色磁磚圓弧轉角樓（2022 是跳蚤本舖，2026 一樓紅白招牌帶、黃色「全新二手交流站」布旗；協同街那面是騎樓、紅色直立招牌）→
//     25 號 4 樓粉白小磁磚 → 4 樓白磁磚（招牌看不清）→ 27 號 Mr.GEORGE BARBERSHOP → 6 樓褐色面磚兩戶（黑色鐵花台、一樓黑色瓦片雨遮）→
//     5 樓紅磚窄樓 → 7 樓灰色水泥樓 → 35 號 4 樓紅褐面磚（兩層綠色圓弧鐵皮雨遮、「套房出租」直招）→ 4 樓黃褐磁磚（一樓車庫）→
//     5 樓白磁磚紅框（一樓車棚）→ 41～43 號 3 樓白色小磁磚至德堂（灰色洗石子圍牆、白色寶瓶欄杆、前院樹）→
//     冷卻水塔與白色鐵皮倉庫（橘色收邊、藍色鐵捲門）→ 一長段白色鐵皮牆到中山東路口
//   西側（+1）整段是老街溪：遊戲裡已經有溪邊步道與欄杆，這裡不加東西。
// 接縫：北端 s 0～13 是 src/world/buildings/StreetZhongbei.js 的中北路街屋（#23 阿秋鹹粥、#24；#24 面幸福街那面加了阿秋的側面店面）；
//   南端做到 s 173.5，之後的紅燈籠小屋（F s≈174～181）與中山東路口兩角屬於 xzb/SegZ2.js。
// 原本這段是 OSM 的 10 層方塊 w1153472267（輪廓壓到協同街口、樓高 33.6 m，實景是 5 樓轉角樓與 4～6 樓透天一排）與填充樓：
//   有店面牆的 w1153472267、f2_546、f2_543、f2_541 放 hide；原本 noShop 的 f2_547、f2_542 drop。看不清的招牌不放字。
const R = 'F',
  SE = 3.8; // 立面離中心線（路面外 1.3 m 人行道）
const NC = { col: false };
// 地面鋪面：這一塊地面高低差超過 8 cm 就用 C.drape 鋪成貼地形的斜面（不會一格一階、低的那頭浮起來），平地照舊用平板
const pave = (C, k, x0, x1, y0, y1, z0, z1, mat) =>
  C.slopeOf(k, x0, x1, z0, z1) > 0.08
    ? C.drape(k, x0, x1, z0, z1, mat, y1)
    : k.box(x0, x1, y0, y1, z0, z1, mat, { col: false, surface: true });
// 貼地的元件往下多做 d 公尺：一個 Kit 只照原點的地面高度畫，地面有坡時低的那頭才不會露出縫（高的那頭只是多埋進土裡）
const sink = (k, d = 0.6) => {
  const b = k.box.bind(k);
  k.box = (x0, x1, y0, ...r) => b(x0, x1, y0 <= 0.01 ? y0 - d : y0, ...r);
  return k;
};
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（-1 側的 +x 朝 s 變小的方向）
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標），所以把寬度搬到 k.W、還原 k.w
const seg = (C, s0, s1, set = SE) => {
  const k = C.kit(R, s0, s1, -1, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => s1 - s;
  return k;
};
// 人行道（自建的東西前面也要有，和街屋格一樣）
const apron = (C, k, x0, x1) => pave(C, k, x0, x1, -0.5, 0.05, -k.apron, 0, C.MR.concrete);

const WT = '#eceae4', // 白色小磁磚
  PW = '#e6d6cf', // 粉白小磁磚
  BRN = '#c99a5e', // 黃褐色磁磚（轉角樓）
  RB = '#a8604c'; // 紅磚

const E = (s0, s1, sp) => [R, s0, s1, -1, { d: 12, ...sp }];

// 協同街（data/cycu.json）：中心線從幸福街 s≈68 的 (-526.0, 264.4) 往東南，路寬 5 m
const XT = { x: -526.0, z: 264.4, ux: 0.7177, uz: 0.6963 };

export default {
  // 原本就 noShop 的填充樓
  drop: ['f2_547', 'f2_542'],
  // 有店面牆的填充樓與 OSM 建物（w1153472267：10 層方塊壓到協同街口，實景是 5 樓轉角樓與一排透天）
  hide: ['w1153472267', 'f2_546', 'f2_543', 'f2_541'],
  ownSign: ['大衛剪髮', '達達美甲', '中壢錫安堂', 'Mr.GEORGE BARBERSHOP'],
  lots: [
    // ---- 中北路口到中原天廈 ----
    // 大衛剪髮（2025）：三樓白磁磚，藍色招牌「剪髮均一價 $200」
    E(13, 19.5, {
      nf: 3,
      d: 10,
      wall: WT,
      sign: ['大衛剪髮', '#2a3a8a', '#ffffff', '剪髮均一價 $200'],
      ground: 'shop',
      bal: 'plain',
    }),
    // 達達美甲：同一排藍色招牌（後面是中原天廈斜斜的輪廓，深度只有 6 m）
    E(19.5, 25, {
      nf: 3,
      d: 6,
      wall: WT,
      sign: ['達達美甲', '#2a3a8a', '#ffffff'],
      ground: 'shop',
      bal: 'plain',
    }),
    // 鐵捲門店：二樓整面玻璃、粉紅花圖招牌（字看不清）
    E(25, 30.5, {
      nf: 3,
      d: 8,
      wall: WT,
      sign: ['', '#d88aa8', '#ffffff'],
      ground: 'shutter',
      sh: '#9a9c9e',
      bal: 'glass',
      glass: '#3e5a5a',
    }),
    // 窄兩樓店面（深色店面、紅色直立招牌看不清）
    E(30.5, 33.5, {
      nf: 2,
      d: 8,
      wall: '#e4e2dc',
      ground: 'shop',
      noband: 1,
      bal: 'plain',
    }),
    // ---- 中壢錫安堂（13 號）：4 樓白色小磁磚，一樓退縮騎樓、紫色招牌，二樓藍白「幸福裝潢修繕」招牌 ----
    E(57.6, 67.6, {
      nf: 4,
      d: 6,
      wall: WT,
      sign: ['中壢錫安堂', '#5a3a8a', '#ffffff', '03-4566747'],
      sign2: ['幸福裝潢修繕', '#f4f4f2', '#2a5aa0'],
      ground: 'shop',
      bal: 'plain',
    }),
    // ---- 協同街以南（轉角樓在 custom） ----
    // 25 號：4 樓粉白小磁磚，灰色鐵捲門、鐵皮雨遮
    E(85, 90.5, {
      nf: 4,
      wall: PW,
      ground: 'shutter',
      sh: '#9a9a98',
      noband: 1,
      tin: true,
      bal: 'cage',
    }),
    // 4 樓白磁磚（一樓橘色招牌看不清）
    E(90.5, 95.5, {
      nf: 4,
      wall: '#e8e4dc',
      ground: 'shutter',
      sh: '#a8a8a4',
      noband: 1,
      tin: true,
      bal: 'cage',
    }),
    // 27 號 Mr.GEORGE BARBERSHOP：4 樓粉白小磁磚，鐵捲門上的復古招牌
    E(95.5, 101.5, {
      nf: 4,
      wall: PW,
      sign: ['BARBERSHOP', '#e8e6e0', '#2a2a2a', 'Mr.GEORGE · Keep it Handsome'],
      ground: 'shutter',
      sh: '#b8b8b4',
      tin: true,
      bal: 'plain',
    }),
    // 6 樓褐色面磚兩戶：米色牆面＋黑色鐵花台；一樓黑色瓦片雨遮（custom）、大鐵捲門
    E(101.5, 107, {
      nf: 6,
      wall: '#c6ab84',
      ground: 'shutter',
      sh: '#8a8884',
      noband: 1,
      bal: 'cage',
    }),
    E(107, 113, {
      nf: 6,
      wall: '#8e6c52',
      ground: 'shutter',
      sh: '#7e7c78',
      noband: 1,
      bal: 'plain',
    }),
    // 5 樓紅磚窄樓，一樓綠色雨遮
    E(113, 117, {
      nf: 5,
      wall: RB,
      ground: 'shutter',
      sh: '#9a9a96',
      noband: 1,
      awn: '#4f8a6a',
      bal: 'grille',
    }),
    // 7 樓灰色水泥樓（窗很少）
    E(117, 121, {
      nf: 7,
      wall: '#a9a8a2',
      ground: 'shutter',
      sh: '#8a8a86',
      noband: 1,
      bal: 'plain',
    }),
    // 35 號：4 樓紅褐面磚，兩層綠色圓弧鐵皮雨遮（custom）、「套房出租」直招，一樓鐵捲門與樓梯門
    E(121, 127, {
      nf: 4,
      wall: '#a86a50',
      vert: ['套房出租', '#f4f4f2', '#2a4a9a'],
      ground: 'shutter',
      sh: '#9a9a96',
      noband: 1,
      bal: 'grille',
    }),
    // 4 樓黃褐磁磚：一樓整間車庫
    E(127, 131.5, { nf: 4, wall: '#c8a066', ground: 'open', noband: 1, bal: 'plain' }),
    // 5 樓白磁磚紅框：一樓車棚與鐵柵門
    E(131.5, 135.5, {
      nf: 5,
      wall: WT,
      ground: 'gate',
      sh: '#6a6a68',
      noband: 1,
      bal: 'rail',
      hood: '#a84a3a',
    }),
    // 41～43 號至德堂：3 樓白色小磁磚，退在圍牆後面約 3 m（圍牆、前院樹、匾額在 custom）
    E(135.5, 151, {
      nf: 3,
      set: 6.9,
      d: 11,
      wall: '#e4e0d6',
      ground: 'gate',
      sh: '#5a5a58',
      noband: 1,
      bal: 'rail',
      door: 0,
    }),
  ],

  custom(C) {
    // 窄兩樓店面的紅色直立招牌（字看不清不放字；vert 不能給空字串，貼圖寬度會變 0、遊戲載入失敗）
    {
      const k = seg(C, 30.5, 33.5);
      k.box(k.W - 0.75, k.W - 0.3, 2.3, 5.2, -0.75, -0.55, '#c8282a', NC);
    }
    const { FRONT, paint, THREE } = C;
    // ---- 中原天廈前庭（s 33.5～49.4）：白磁磚花台矮牆、黑金色大門、雨棚、樹 ----
    {
      const k = seg(C, 33.5, 49.4),
        W = k.W,
        gx0 = k.sx(41.2),
        gx1 = k.sx(38.4);
      apron(C, k, 0, W);
      pave(C, k, 0, W, 0, 0.06, 0, 5.6, '#d8d4ca'); // 前庭地磚
      // 花台矮牆（大門兩側）
      k.box(0, gx0, 0, 0.75, 0.1, 0.45, `wall${WT}`);
      k.box(gx1, W, 0, 0.75, 0.1, 0.45, `wall${WT}`);
      k.box(0.3, gx0 - 0.3, 0.75, 0.95, 0.15, 0.4, '#4c7d3a', NC);
      k.box(gx1 + 0.3, W - 0.3, 0.75, 0.95, 0.15, 0.4, '#4c7d3a', NC);
      // 大門：兩根白磁磚門柱、黑金色鐵門、圓弧雨棚
      for (const x of [gx0 - 0.5, gx1]) k.box(x, x + 0.5, 0, 2.9, 0.6, 1.1, `wall${WT}`);
      k.box(gx0, gx1, 0, 2.3, 0.8, 0.88, '#2a2620');
      for (let x = gx0 + 0.25; x < gx1 - 0.1; x += 0.35)
        k.box(x, x + 0.05, 0.3, 2.2, 0.76, 0.8, '#b8973a', NC);
      k.box(gx0, gx1, 1.1, 1.16, 0.76, 0.8, '#b8973a', NC);
      k.box(gx0 - 0.6, gx1 + 0.6, 2.9, 3.05, 0.2, 2.6, '#d8c890', NC);
      k.cyl((gx0 + gx1) / 2, 1.4, 0.06, 2.9, 3.4, '#d8c890', { seg: 6 });
      // 前庭的樹
      for (const s of [35.5, 45, 47.8]) {
        const x = k.sx(s);
        k.cyl(x, 1.6, 0.12, 0, 2.6, '#6a5238', { seg: 6 });
        const g = new THREE.SphereGeometry(1.3, 8, 6);
        g.scale(1, 0.8, 1);
        g.translate(x, 3.2, 1.6);
        k._part(C.VC, C.paintGeo(g, '#4f7d3a'));
      }
    }

    // ---- 協同街口的 5 樓黃褐色磁磚圓弧轉角樓（s ≈ 74～85） ----
    {
      const k = seg(C, 66, 86),
        D = 12,
        gf = 3.3,
        nf = 5,
        top = gf + (nf - 1) * 3.0,
        x1 = k.sx(85);
      // 協同街南側的建築線（中心線往西南 2.5 m 路面＋0.7 m 人行道）換成區域座標：x = ax + dx·z
      const off = 3.2,
        px = XT.x - XT.uz * off,
        pz = XT.z + XT.ux * off,
        A = k.l(px, pz),
        B = k.l(px + XT.ux * 20, pz + XT.uz * 20),
        dx = (B[0] - A[0]) / (B[1] - A[1]),
        ax = A[0] - A[1] * dx,
        xa = (z) => ax + dx * z;
      // 圓弧轉角：圓心離兩面牆都是 r
      const r = 2.4,
        sq = Math.hypot(1, dx),
        xc = ax + dx * r - r * sq,
        nx = 1 / sq,
        nz = -dx / sq, // 協同街那面朝外的法線
        a1 = Math.atan2(nz, nx),
        pts = [
          [x1, 0],
          [xc, 0],
        ];
      for (let i = 1; i < 12; i++) {
        const a = -Math.PI / 2 + ((a1 + Math.PI / 2) * i) / 12;
        pts.push([xc + r * Math.cos(a), r + r * Math.sin(a)]);
      }
      pts.push([xc + r * nx, r + r * nz], [xa(D), D], [x1, D]);
      const body = k.prism(pts, 0, top, C.WVC);
      C.paintGeo(body.geometry, BRN);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i],
          q = pts[(i + 1) % pts.length];
        k.wallLine(p[0], p[1], q[0], q[1], 0, top);
      }
      // 屋頂女兒牆與頂樓鐵皮加蓋
      k.cyl(xc, r, r + 0.08, top, top + 0.9, BRN, { seg: 20 });
      k.box(x1, xc, top, top + 0.9, 0, 0.2, BRN, NC);
      k.box(x1 + 1, xc - 1, top, top + 2.6, 3, D - 1, '#d8d4c8', NC);
      k.box(x1 + 0.8, xc - 0.8, top + 2.6, top + 2.75, 2.6, D - 0.8, '#6f8a7c', NC);
      // 正面（幸福街）：二樓以上每層三扇窗、橫向分層線
      const fw = xc - x1;
      for (let f = 2; f <= nf; f++) {
        const y = gf + (f - 2) * 3.0;
        for (let j = 0; j < 3; j++) C.win(k, x1 + (fw * (j + 0.5)) / 3, y + 1.5, 1.3, 1.4);
        k.box(x1, xc, y - 0.08, y + 0.04, -0.08, 0, '#b48650', NC);
      }
      // 圓弧：每層一圈深色窗帶（實景是三扇拱窗）
      for (let f = 2; f <= nf; f++) {
        const y = gf + (f - 2) * 3.0;
        k.cyl(xc, r, r + 0.03, y + 0.85, y + 2.15, '#3e4a55', { seg: 20 });
        k.cyl(xc, r, r + 0.06, y - 0.08, y + 0.04, '#b48650', { seg: 20 });
      }
      // 協同街那面：每層四扇窗（貼在斜牆外面的薄板）
      const slab = (s0, s1, y0, y1, hex, o = 0.04) => {
        const zA = r + (D - r) * s0,
          zB = r + (D - r) * s1,
          xA = xa(zA) + nx * o,
          xB = xa(zB) + nx * o;
        C.paintGeo(k.slab(xA, zA + nz * o, xB, zB + nz * o, 0.06, y0, y1, C.VC, NC), hex);
      };
      for (let f = 2; f <= nf; f++) {
        const y = gf + (f - 2) * 3.0;
        for (let j = 0; j < 4; j++)
          slab(0.08 + j * 0.23, 0.2 + j * 0.23, y + 0.85, y + 2.15, '#3e4a55');
        slab(0, 1, y - 0.08, y + 0.04, '#b48650', 0.07);
      }
      // 協同街那面的紅色直立招牌（字看不清）
      for (const t of [0.15, 0.55]) slab(t, t + 0.06, gf + 0.6, gf + 5.6, '#c8282a', 0.35);
      // 一樓：正面紅白招牌帶（字看不清）、騎樓深色店面；圓弧一圈紅色招牌帶；協同街那面騎樓（白、紫色柱子）
      k.box(x1 + 0.1, xc, gf - 0.85, gf - 0.03, -0.3, 0, '#c8282a', NC);
      k.box(x1 + 0.5, xc - 0.5, gf - 0.7, gf - 0.18, -0.32, -0.3, '#f4f2ee', NC);
      k.plane(C.openTex, fw - 0.4, gf - 0.9, x1 + fw / 2, (gf - 0.9) / 2, -0.03, FRONT, {
        emissive: 0.3,
      });
      k.cyl(xc, r, r + 0.02, 0, gf - 0.9, '#3a3632', { seg: 20 });
      k.cyl(xc, r, r + 0.3, gf - 0.85, gf - 0.03, '#c8282a', { seg: 20 });
      slab(0, 1, gf - 0.85, gf - 0.03, '#c8282a', 0.15);
      slab(0.02, 0.98, 0, gf - 0.9, '#3a3632', 0.05);
      for (let j = 0; j < 5; j++)
        slab(0.05 + j * 0.22, 0.09 + j * 0.22, 0, gf - 0.85, j % 2 ? '#7a4a9a' : '#f0eee8', 0.2);
      // 綠白柱子（正面騎樓柱）
      for (const x of [x1 + 0.2, x1 + fw * 0.5])
        for (let y = 0; y < gf - 0.9; y += 0.5)
          k.box(x, x + 0.5, y, y + 0.5, -0.5, 0, (y / 0.5) % 2 ? '#f0eee8' : '#2f8a4a');
      // 黃色布旗「全新二手交流站」×2
      const flag = paint('全\n新\n二\n手\n交\n流\n站', '#f2d23a', '#c8282a', null, 0.6, 2.2, 96);
      for (const x of [x1 + fw * 0.25, x1 + fw * 0.75]) {
        k.plane(flag, 0.6, 2.2, x, 1.45, -1.05, FRONT, { emissive: 0.2, double: true });
        k.box(x + 0.3, x + 0.34, 0, 2.6, -1.07, -1.03, '#d8d8d4', NC);
      }
      apron(C, k, x1, xc);
    }

    // ---- 6 樓褐色面磚兩戶一樓的黑色瓦片雨遮（s 101.5～113） ----
    {
      const k = seg(C, 101.5, 113),
        W = k.W;
      k.box(0, W, 2.7, 2.78, -1.1, 0, '#3a3c3e', NC);
      for (let z = -1.05; z < 0; z += 0.22) k.box(0, W, 2.78, 2.86, z, z + 0.14, '#2e3032', NC);
      k.box(0, W, 2.82, 2.95, -1.15, -1.05, '#2e3032', NC);
    }
    // ---- 35 號的兩層綠色圓弧鐵皮雨遮 ----
    {
      const k = seg(C, 121, 127),
        W = k.W;
      for (const [y, out] of [
        [3.0, 1.0],
        [5.3, 0.7],
      ]) {
        const g = new THREE.CylinderGeometry(out, out, W - 0.2, 10, 1, true, 0, Math.PI);
        g.rotateZ(Math.PI / 2);
        g.scale(1, 0.45, 1);
        g.translate(W / 2, y, 0);
        k._part(C.VC, C.paintGeo(g, '#4f8a6a'));
        k.box(0.1, W - 0.1, y - 0.05, y + 0.02, -out, 0, '#9aa0a0', NC);
      }
    }
    // ---- 至德堂：灰色洗石子圍牆（白色寶瓶欄杆窗）、前院樹、二樓匾額 ----
    {
      const k = seg(C, 135.5, 151),
        W = k.W,
        g0 = k.sx(148.6),
        g1 = k.sx(146.8),
        // 下段實牆、上段壓頂，中間每隔一段開一個寶瓶欄杆窗（窗與窗之間是實牆）
        wall = (x0, x1) => {
          k.box(x0, x1, 0, 0.85, 0.05, 0.3, '#9a9a94');
          k.box(x0, x1, 1.4, 1.75, 0.05, 0.3, '#9a9a94', NC);
          k.box(x0 - 0.03, x1 + 0.03, 1.75, 1.85, 0.0, 0.35, '#8a8a84', NC);
          k.wallRect(x0, x1, 0.05, 0.3, 0.85, 1.75);
          let x = x0;
          for (; x + 2.6 < x1; x += 3.2) {
            k.box(x, x + 1, 0.85, 1.4, 0.05, 0.3, '#9a9a94', NC);
            for (let b = x + 1.12; b < x + 2.5; b += 0.2)
              k.cyl(b, 0.18, 0.055, 0.85, 1.4, '#f0eee8', { seg: 6 });
            k.box(x + 2.6, Math.min(x + 3.2, x1), 0.85, 1.4, 0.05, 0.3, '#9a9a94', NC);
          }
          if (x < x1) k.box(x, x1, 0.85, 1.4, 0.05, 0.3, '#9a9a94', NC);
        };
      apron(C, k, 0, W);
      wall(0, g1);
      wall(g0, W);
      // 鐵門（樓梯口那段）
      k.box(g1, g0, 0, 1.9, 0.12, 0.2, '#3a3c3e', NC);
      // 前院樹
      for (const s of [138, 142.5]) {
        const x = k.sx(s);
        k.cyl(x, 1.6, 0.1, 0, 2.4, '#6a5238', { seg: 6 });
        const g = new THREE.SphereGeometry(1.2, 8, 6);
        g.scale(1, 0.9, 1);
        g.translate(x, 3.0, 1.6);
        k._part(C.VC, C.paintGeo(g, '#55823c'));
      }
      // 二樓陽台上的匾額「至德堂」
      k.plane(
        paint('至德堂', '#2a2420', '#e8c868', null, 1.8, 0.6, 96),
        1.8,
        0.6,
        k.sx(142),
        5.6,
        3.04,
        FRONT
      );
    }

    // ---- 冷卻水塔與白色鐵皮倉庫（s 151～173.5，牆就貼著人行道） ----
    {
      const k = sink(seg(C, 151, 173.5)),
        W = k.W,
        ST = '#dedfdc',
        x0 = k.sx(160); // 前段（橘色收邊的兩層鐵皮屋）到 160，之後是一長段鐵皮牆
      apron(C, k, 0, W);
      // 前段：兩層高的鐵皮屋，正面藍色鐵捲門與小鐵窗
      k.box(x0, k.sx(156.5), 0, 6.2, 0.2, 14, ST);
      k.box(x0 - 0.05, k.sx(156.5) + 0.05, 6.2, 6.4, 0.1, 14, '#c86a2a', NC);
      k.plane(C.shutterTex('#2f5f9a'), 2.2, 2.6, k.sx(158.6), 1.3, 0.17, FRONT);
      k.box(k.sx(158.6) - 0.6, k.sx(158.6) + 0.6, 3.6, 4.6, 0.12, 0.2, '#4a5056', NC);
      // 冷卻水塔：生鏽鐵架上的白色圓筒
      {
        const cx = k.sx(154.6),
          cz = 1.6;
        for (const [a, b] of [
          [-1.1, -1.1],
          [1.1, -1.1],
          [-1.1, 1.1],
          [1.1, 1.1],
        ])
          k.box(cx + a - 0.06, cx + a + 0.06, 0, 2.6, cz + b - 0.06, cz + b + 0.06, '#8a6a4a');
        k.box(cx - 1.25, cx + 1.25, 2.5, 2.65, cz - 1.25, cz + 1.25, '#8a6a4a', NC);
        k.cyl(cx, cz, 1.0, 2.65, 3.3, '#c8cac6', { seg: 14, r1: 0.9 });
        k.cyl(cx, cz, 1.0, 3.3, 4.7, '#e4e5e2', { seg: 14 });
        k.cyl(cx, cz, 0.85, 4.7, 5.2, '#d8d9d6', { seg: 14, r1: 0.6 });
        // 前面的鐵皮圍板
        k.box(cx - 1.3, cx + 1.3, 0, 1.9, 0.05, 0.15, '#cfd0cc');
      }
      // 水塔與前段之間的低矮鐵皮屋
      k.box(k.sx(156.5), k.sx(156.5) + 1.3, 0, 3.4, 0.6, 12, ST, NC);
      // 後段：一長段白色波浪鐵皮牆（只有一個小鐵窗），後面是低矮的鐵皮廠房
      k.box(0, x0, 0, 3.9, 0.05, 0.25, ST);
      for (let x = 0.4; x < x0; x += 0.6) k.box(x, x + 0.08, 0.2, 3.8, -0.01, 0.05, '#cbccc8', NC);
      k.box(0, x0, 3.9, 4.05, 0, 0.3, '#b8b0a0', NC);
      k.box(0, x0, 0, 0.5, -0.02, 0.05, '#8a8a84', NC);
      k.box(x0 * 0.45, x0 * 0.45 + 0.9, 2.2, 2.9, -0.03, 0.05, '#4a5056', NC);
      // 廠房在 s 168.5 以南只剩那道牆（後面是中山東路那排的街屋，xzb/SegZ2.js）
      const xb = k.sx(168.5);
      k.box(xb, x0, 0, 4.6, 0.6, 14, '#e2e2de', NC);
      k.box(xb - 0.1, x0 + 0.1, 4.6, 4.75, 0.4, 14.2, '#a8aaa8', NC);
      k.box(0.2, xb, 0, 3.9, 0.6, 5, '#e2e2de', NC);
    }
  },

  footprints(F) {
    return [
      F(R, 33.5, 49.4, -1, SE, 5.6, 1.5), // 中原天廈前庭
      F(R, 74, 85, -1, SE, 12, 1.5), // 協同街口的轉角樓
      F(R, 151, 168.5, -1, SE, 14, 1.5), // 冷卻水塔與鐵皮倉庫
      F(R, 168.5, 173.5, -1, SE, 5, 1.5), // 倉庫南端到中山東路口那段鐵皮牆
    ];
  },
};
