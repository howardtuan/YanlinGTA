// 新中北路 s 40～150 兩側（環中東路口往西；Google 街景 2026-05，s 40～100 只有 2009-09 的街景，改用國土測繪 2024 正射、Google 衛星與 2026-05 遠望交叉確認）。
//   這段不是連續街屋：
//   北側（+1，靠校園）由東到西：水泥空地＋立柱看板架、後排粉紅色 2 樓房子 → 汎迪爾幼稚園（前庭停車格、石門柱＋黑鐵欄杆圍牆、綠色大門、瓦頂警衛室、
//     半圓花台、城堡式 3 樓主建築＋兩座八角塔樓）→ 藤蔓綠籬圍起來的雜木空地 → 3 樓透天兩戶（一樓內凹騎樓）→ 藍色捲門小車庫 →
//     淺綠浪板圍籬＋綠色鐵皮車棚（後面是 OSM 建物 w493402609，不動）→ 車道＋不鏽鋼伸縮門 → 紅磚矮牆＋2 棵南洋杉（接 SegX2.js 的巷口）
//   南側（-1）由東到西：整排樹＋爬滿藤蔓的圍籬（後排是 Mr.May 的圓形建築與暗紅屋頂的灰色舊廠房）、綠色指示牌門架 → 2 道藍色捲門的鐵皮車庫 →
//     內凹的深色鐵皮牆＋灰鐵門、盆栽棚（東側暗紅浪板）→ 3 樓白色馬賽克磚透天 2 開間（東開間是「奉粥」）→ 窄巷 → 淺灰藍色透天 → 不鏽鋼伸縮門＋退縮的水泥車庫 → 白色水泥板圍牆
//   看不清的招牌一律不放字（立柱看板、幼稚園的藍色橫式招牌與暗紅橫匾、南側 s≈147.5 的直式招牌）。
//   遊戲裡 w493402609 的輪廓從離中心線 9.7 m 就開始（實景的房子退到約 15 m，前面是車棚），所以車棚縮成貼在它前面的淺棚、小車庫只做到 9.6 m。
const R = 'X';
const FNT = (px) => `900 ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
// 開一個 Kit：k.sx(s) 把沿線距離換成區域 x（南側的 +x 朝 s 變小的方向），k.zo(off) 把離中心線距離換成區域 z
// C.kit 把格寬存在 k.w，會蓋掉 Kit 自己的 w()（區域→世界座標，有碰撞的 box 要用），所以這裡把寬度搬到 k.W、還原 k.w
const seg = (C, side, s0, s1, set) => {
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
// 闊葉大樹：樹幹＋幾團樹冠（h 樹高、cr 樹冠半徑）
const tree = (C, k, x, z, h, cr, r) => {
  k.cyl(x, z, 0.28, -0.5, h - cr, '#5e4630', { seg: 6, r1: 0.18, col: true });
  const G = ['#3f7a3a', '#4b8a3e', '#356b34'];
  ball(C, k, x, h - cr * 0.85, z, cr * 0.8, G[0], 0.75);
  for (let j = 0; j < 4; j++) {
    const a = j * 1.57 + r() * 0.8,
      q = 0.55 + r() * 0.15;
    ball(
      C,
      k,
      x + Math.cos(a) * cr * 0.5,
      h - cr * (0.95 + r() * 0.3),
      z + Math.sin(a) * cr * 0.5,
      cr * q,
      G[1 + (j % 2)],
      0.72
    );
  }
};
// 南洋杉：尖錐形
const conifer = (C, k, x, z, h, rad) => {
  k.cyl(x, z, 0.22, -0.5, h * 0.3, '#5e4630', { seg: 6 });
  k.cyl(x, z, rad, h * 0.22, h * 0.62, '#2f5a36', { seg: 8, r1: rad * 0.55 });
  k.cyl(x, z, rad * 0.62, h * 0.55, h, '#356b3c', { seg: 8, r1: 0.05 });
};
// 一輛車（len 車長、wid 車寬；turn 為真時車頭朝區域 z，否則順著區域 x）
const car = (k, x, z, len, wid, hgt, body, roof, turn) => {
  const B = (a0, a1, y0, y1, b0, b1, m, o) =>
    turn
      ? k.box(x + b0, x + b1, y0, y1, z + a0, z + a1, m, o)
      : k.box(x + a0, x + a1, y0, y1, z + b0, z + b1, m, o);
  B(0, len, 0.3, hgt * 0.55, 0, wid, body);
  B(len * 0.08, len * 0.92, hgt * 0.55, hgt * 0.92, 0.06, wid - 0.06, '#27323a', { col: false });
  B(len * 0.06, len * 0.94, hgt * 0.92, hgt, 0.02, wid - 0.02, roof || body, { col: false });
  for (const a of [len * 0.2, len * 0.8])
    for (const b of [-0.02, wid - 0.2])
      B(a - 0.32, a + 0.32, 0, 0.64, b, b + 0.22, '#1c1c1e', { col: false });
};
// 一片一片平面組成的實體（斜屋頂用）：F 是多邊形陣列（每個點 [x, y, z]），法線自動朝外（背對 ctr）
const faces = (C, k, F, hex, ctr) => {
  const pos = [],
    nor = [],
    uv = [],
    idx = [];
  for (let f of F) {
    const [a, b, c] = f;
    let n = [
      (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
    ];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((v) => v / l);
    if (n[0] * (a[0] - ctr[0]) + n[1] * (a[1] - ctr[1]) + n[2] * (a[2] - ctr[2]) < 0) {
      f = [...f].reverse();
      n = n.map((v) => -v);
    }
    const base = pos.length / 3;
    for (const p of f) {
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      uv.push(0, 0);
    }
    for (let i = 1; i < f.length - 1; i++) idx.push(base, base + i, base + i + 1);
  }
  const g = new C.THREE.BufferGeometry();
  g.setAttribute('position', new C.THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new C.THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new C.THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 梯形台（四坡屋頂、曼薩爾屋頂）：底 [x0,x1,z0,z1] 在 y0、頂 [X0,X1,Z0,Z1] 在 y1
const frus = (C, k, [x0, x1, z0, z1], y0, [X0, X1, Z0, Z1], y1, hex) =>
  faces(
    C,
    k,
    [
      [
        [x0, y0, z0],
        [x1, y0, z0],
        [X1, y1, Z0],
        [X0, y1, Z0],
      ],
      [
        [x1, y0, z0],
        [x1, y0, z1],
        [X1, y1, Z1],
        [X1, y1, Z0],
      ],
      [
        [x1, y0, z1],
        [x0, y0, z1],
        [X0, y1, Z1],
        [X1, y1, Z1],
      ],
      [
        [x0, y0, z1],
        [x0, y0, z0],
        [X0, y1, Z0],
        [X0, y1, Z1],
      ],
      [
        [X0, y1, Z0],
        [X1, y1, Z0],
        [X1, y1, Z1],
        [X0, y1, Z1],
      ],
    ],
    hex,
    [(x0 + x1) / 2, y0 - 0.5, (z0 + z1) / 2]
  );
// 八角柱（有一面正對街道），r1 是頂端半徑
const oct = (C, k, x, z, r, y0, y1, hex, r1) => {
  const g = new C.THREE.CylinderGeometry(r1 ?? r, r, y1 - y0, 8, 1, false, Math.PI / 8);
  g.translate(x, (y0 + y1) / 2, z);
  k._part(C.VC, C.paintGeo(g, hex));
};

export default {
  // 南側 16 棟填充樓：f2_156～160、f2_168～171 實景是樹與圍籬，f2_161～167 由 S2～S7 取代
  drop: [
    'f2_156',
    'f2_157',
    'f2_158',
    'f2_159',
    'f2_160',
    'f2_161',
    'f2_162',
    'f2_163',
    'f2_164',
    'f2_165',
    'f2_166',
    'f2_167',
    'f2_168',
    'f2_169',
    'f2_170',
    'f2_171',
  ],
  ownSign: [],
  lots: [
    // ---- 北側 ----
    // N4 3 樓透天兩戶：本體退到騎樓內側（離中心線 9.7），二三樓出挑到 7.2 的部分與騎樓柱在 custom
    [
      R,
      113.3,
      118.9,
      1,
      {
        nf: 3,
        wall: '#e6dcc6',
        low: '#d9b9a8',
        ground: 'gate',
        sh: '#b9bcc0',
        bal: 'plain',
        d: 18.3,
        set: 9.7,
        noband: 1,
        roof: 'tank',
        bikes: 2,
      },
    ],
    [
      R,
      118.9,
      124.5,
      1,
      {
        nf: 3,
        wall: '#e6dcc6',
        low: '#d9b9a8',
        ground: 'gate',
        sh: '#b9bcc0',
        bal: 'plain',
        d: 18.3,
        set: 9.7,
        noband: 1,
        roof: 'none',
        bikes: 2,
      },
    ],
    // N5 單層小車庫：藍色鐵捲門（暗紅封簷在 custom）
    [
      R,
      124.5,
      128.3,
      1,
      {
        nf: 1,
        gf: 3.0,
        wall: '#d8d4cc',
        ground: 'shutter',
        sh: '#3a86a8',
        door: 0,
        d: 3.3,
        set: 6.3,
        noband: 1,
        roofCol: '#8f9d8a',
      },
    ],
    // ---- 南側 ----
    // S2 單層鐵皮車庫，2 道藍色鐵捲門（審查：從 C、D 兩點正對量到捲門只到 s≈115.3，再往西是內凹的鐵門，原本做到 116.5 太寬）
    [
      R,
      107.4,
      111.35,
      -1,
      {
        nf: 1,
        gf: 3.1,
        wall: '#c9cdc8',
        ground: 'shutter',
        sh: '#35608c',
        door: 0,
        d: 9,
        set: 6.5,
        noband: 1,
        roofCol: '#a9b8a4',
      },
    ],
    [
      R,
      111.35,
      115.3,
      -1,
      {
        nf: 1,
        gf: 3.1,
        wall: '#c9cdc8',
        ground: 'shutter',
        sh: '#35608c',
        door: 0,
        d: 9,
        set: 6.5,
        noband: 1,
        roofCol: '#a9b8a4',
      },
    ],
    // S4 3 樓白色馬賽克磚透天，2 個開間（審查：街景正對只有兩個開間、總寬約 10.5 m，西邊與 S5 之間隔一條約 1.5 m 的窄巷；原本做成 3 開間 12 m）：
    //   東開間「奉粥」（綠雨遮；橘底藍字直式招牌掛在東牆角，在 custom）、西開間是內凹門廊（不鏽鋼門＋鐵窗、停機車）
    [
      R,
      121,
      125.9,
      -1,
      {
        nf: 3,
        wall: 'mosaic',
        ground: 'shop',
        awn: '#5aa07e',
        bal: 'open',
        d: 14,
        set: 7.0,
        noband: 1,
        roof: 'none',
        door: 0,
      },
    ],
    [
      R,
      125.9,
      131.5,
      -1,
      {
        nf: 3,
        wall: 'mosaic',
        ground: 'gate',
        sh: '#b9bcc0',
        bal: 'open',
        d: 14,
        set: 7.0,
        noband: 1,
        roof: 'none',
        bikes: 1,
      },
    ],
    // S5 淺灰藍色透天：一樓朝路是白色實牆、二樓柱列陽台；三樓前半是屋頂平台、後半是房間，上面蓋紅柱平頂棚（都在 custom）
    [
      R,
      133,
      139.5,
      -1,
      {
        nf: 2,
        wall: '#c9cfd8',
        ground: 'shutter',
        sh: '#ecebe6',
        bal: 'open',
        d: 12,
        set: 7.0,
        noband: 1,
        roof: 'none',
        door: 0,
      },
    ],
  ],
  custom(C) {
    const { MR, FRONT, lcg, sg, bars, THREE } = C,
      r = lcg(7703);
    const alWin = C.ROWT.alWin(),
      gWin = C.YHT.win();
    // ---------- 貼圖 ----------
    const gateTex = sg('xzb3Gate', 128, 128, (g) => {
      // 綠色鐵柵門
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = '#3f8a5a';
      for (let x = 2; x < 128; x += 12) g.fillRect(x, 0, 4, 128);
      g.fillRect(0, 2, 128, 8);
      g.fillRect(0, 60, 128, 6);
      g.fillRect(0, 116, 128, 10);
      g.fillRect(60, 0, 8, 128);
    });
    const photoTex = sg('xzb3Photo', 512, 144, (g) => {
      // 掛在欄杆上的大型團體照帆布（只畫成一排排人影，沒有字）
      const q = lcg(53);
      g.fillStyle = '#f4f2ea';
      g.fillRect(0, 0, 512, 144);
      g.fillStyle = '#9fc4dc';
      g.fillRect(6, 6, 500, 60);
      g.fillStyle = '#7fae6a';
      g.fillRect(6, 66, 500, 72);
      const cs = ['#e8d23a', '#d8456a', '#3b6fc4', '#f4f4f0', '#e0622a', '#4b8a3e'];
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 26; i++) {
          const x = 16 + i * 19 + (row % 2) * 9,
            y = 44 + row * 26;
          g.fillStyle = cs[(q() * 6) | 0];
          g.fillRect(x - 6, y + 6, 13, 22);
          g.fillStyle = '#e8c4a0';
          g.beginPath();
          g.arc(x, y, 6, 0, 7);
          g.fill();
          g.fillStyle = '#2a2622';
          g.beginPath();
          g.arc(x, y - 2, 6, Math.PI, 0);
          g.fill();
        }
    });
    const accTex = sg('xzb3Acc', 128, 64, (g) => {
      // 不鏽鋼伸縮門
      g.clearRect(0, 0, 128, 64);
      g.strokeStyle = '#c9ccd0';
      g.lineWidth = 2.5;
      for (let x = 0; x < 128; x += 16) {
        g.beginPath();
        g.moveTo(x, 8);
        g.lineTo(x + 16, 60);
        g.moveTo(x + 16, 8);
        g.lineTo(x, 60);
        g.stroke();
      }
      g.fillStyle = '#d8dadc';
      for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 4, 64);
      g.fillRect(0, 4, 128, 4);
    });
    const arrow = (g, x, y, dir, L = 30) => {
      // 白色箭頭：dir 0 上、1 左、2 右
      g.save();
      g.translate(x, y);
      g.rotate([0, -Math.PI / 2, Math.PI / 2][dir]);
      g.beginPath();
      g.moveTo(0, -L);
      g.lineTo(L * 0.6, -L * 0.2);
      g.lineTo(L * 0.22, -L * 0.2);
      g.lineTo(L * 0.22, L);
      g.lineTo(-L * 0.22, L);
      g.lineTo(-L * 0.22, -L * 0.2);
      g.lineTo(-L * 0.6, -L * 0.2);
      g.closePath();
      g.fill();
      g.restore();
    };
    const dirSign = sg('xzb3DirB', 512, 320, (g) => {
      // 綠底白字指示牌（2026-05 清楚讀到）：↑ 桃48 八德 Bade／← 內壢 Neili／平鎮 Pingzhen →
      g.fillStyle = '#1f8a5a';
      g.fillRect(0, 0, 512, 320);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 6;
      g.beginPath();
      g.roundRect(8, 8, 496, 304, 18);
      g.stroke();
      g.fillStyle = '#ffffff';
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      arrow(g, 56, 66, 0);
      g.beginPath();
      g.roundRect(104, 38, 104, 56, 10);
      g.fill();
      g.fillStyle = '#111111';
      g.font = FNT(36);
      g.fillText('桃48', 114, 68);
      g.fillStyle = '#ffffff';
      g.font = FNT(60);
      g.fillText('八德', 228, 68);
      g.font = FNT(32);
      g.fillText('Bade', 372, 74);
      arrow(g, 56, 162, 1);
      g.font = FNT(60);
      g.fillText('內壢', 110, 164);
      g.font = FNT(32);
      g.fillText('Neili', 254, 170);
      g.font = FNT(60);
      g.fillText('平鎮', 110, 256);
      g.font = FNT(32);
      g.fillText('Pingzhen', 254, 262);
      arrow(g, 456, 254, 2);
    });
    const warnTex = sg('xzb3Warn', 128, 128, (g) => {
      // 紅框三角形彎道警告標誌
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = '#d8282f';
      g.beginPath();
      g.moveTo(64, 6);
      g.lineTo(124, 116);
      g.lineTo(4, 116);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(64, 30);
      g.lineTo(104, 104);
      g.lineTo(24, 104);
      g.closePath();
      g.fill();
      g.strokeStyle = '#111111';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(74, 98);
      g.quadraticCurveTo(74, 70, 56, 62);
      g.stroke();
      g.fillStyle = '#111111';
      g.beginPath();
      g.moveTo(46, 58);
      g.lineTo(62, 52);
      g.lineTo(58, 70);
      g.closePath();
      g.fill();
    });
    // 側牆上的窗（面向區域 -x 或 +x）
    const sideWin = (k, x, y, z, dir, w = 1.0, h = 1.0, tex = gWin) =>
      k.plane(tex, w, h, x, y, z, (dir * Math.PI) / 2);
    // 水泥電桿（底部黃黑斜紋）
    const pole = (k, x, z, h = 9.5) => {
      k.cyl(x, z, 0.16, 0, h, '#a3a19b', { seg: 8, r1: 0.11, col: true });
      for (let i = 0; i < 4; i++)
        k.cyl(x, z, 0.175, 0.2 + i * 0.3, 0.5 + i * 0.3, i % 2 ? '#1c1c1e' : '#e8c21e', { seg: 8 });
    };
    // 爬滿藤蔓的綠籬／圍籬：一段一個 Kit，頂端加幾團葉子
    const hedge = (side, s0, s1, off, h, th, hex, base) => {
      const n = Math.max(1, Math.round((s1 - s0) / 6.5)),
        b = (s1 - s0) / n;
      for (let j = 0; j < n; j++) {
        const k = seg(C, side, s0 + j * b, s0 + (j + 1) * b, off);
        if (base) k.box(0, b, -0.5, 0.3, 0, th, '#a3a19b');
        k.box(0, b, base ? 0.3 : -0.3, h, 0.02, th - 0.02, hex);
        for (let x = 0.4; x < b; x += 0.9)
          ball(
            C,
            k,
            x + r() * 0.3,
            h - 0.05 + r() * 0.15,
            th / 2 + (r() - 0.5) * 0.2,
            0.38 + r() * 0.18,
            r() < 0.5 ? '#3f7a3a' : '#356b34',
            0.7
          );
      }
    };

    // ================= 北側 =================
    {
      // N1 [40,56] 水泥空地（餐廳停車空地，沒有圍牆）：矮緣石、一棵樹、最東邊的立柱看板架（2026 的字看不清，不放字）
      const k = seg(C, 1, 40, 56, 4.8);
      k.box(0, k.W, -0.3, 0.04, 0, 14.4, '#b3b0a8', { col: false });
      k.box(0, k.W, 0.04, 0.16, 4.1, 4.3, '#9a9892', { col: false });
      tree(C, k, k.sx(43), k.zo(14.5), 6, 2.1, r);
      const x = k.sx(40.7),
        z = k.zo(6.2);
      k.cyl(x, z, 0.14, 0, 6.5, '#3a3a3c', { seg: 8 });
      k.box(x - 0.08, x + 0.08, 4.9, 6.4, z - 0.9, z + 0.9, '#232325', { col: false });
      // s≈48 另一面立在兩根鐵柱上的看板（2026-05 遠望是食物照片，沒有可讀的字，只做素面）
      const bx = k.sx(48),
        bz = k.zo(7.6);
      for (const dz of [-1.2, 1.2]) k.cyl(bx, bz + dz, 0.07, 0, 5.3, '#8a8d90', { seg: 6 });
      k.box(bx - 0.06, bx + 0.06, 3.2, 5.3, bz - 1.35, bz + 1.35, '#6a4a32', { col: false });
      k.box(bx - 0.07, bx + 0.07, 3.35, 5.15, bz - 1.2, bz + 1.2, '#8a5f3c', { col: false });
    }
    {
      // N1 後排：粉紅色磁磚 2 樓房子（一樓灰藍、二樓粉紅，平屋頂有樓梯間與不鏽鋼水塔；朝南的正面被樹擋住，店招看不清不放）
      const k = seg(C, 1, 41, 53, 21),
        w = k.W,
        D = 12;
      k.box(0, w, -0.5, 3.4, 0, D, 'wall#a4aeb8', { tile: [0.6, 0.6] });
      k.box(0, w, 3.4, 7.0, 0, D, 'wall#e6b4ae', { tile: [0.6, 0.6] });
      k.box(-0.05, w + 0.05, 3.3, 3.45, -0.05, D + 0.05, '#c9c5ba', { col: false });
      k.box(-0.05, w + 0.05, 7.0, 7.5, -0.05, 0.15, 'wall#e6b4ae', { col: false });
      k.box(-0.05, 0.15, 7.0, 7.5, 0, D, 'wall#e6b4ae', { col: false });
      k.box(w - 0.15, w + 0.05, 7.0, 7.5, 0, D, 'wall#e6b4ae', { col: false });
      k.box(0, w, 7.0, 7.5, D - 0.15, D + 0.05, 'wall#e6b4ae', { col: false });
      k.box(7, 10, 7.0, 9.4, 6, 9.5, 'wall#e6b4ae', { col: false });
      k.box(6.9, 10.1, 9.4, 9.5, 5.9, 9.6, '#c9c5ba', { col: false });
      k.cyl(3.2, 7.5, 0.65, 7.6, 9.0, '#cfd2d4', { seg: 12 });
      for (const [dx, dz] of [
        [-0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
        [0.5, -0.5],
      ])
        k.box(
          3.2 + dx - 0.04,
          3.2 + dx + 0.04,
          7.0,
          7.6,
          7.5 + dz - 0.04,
          7.5 + dz + 0.04,
          '#8a8d90',
          { col: false }
        );
      for (const z of [2.5, 6, 9.5]) sideWin(k, -0.03, 5.3, z, -1, 1.1, 1.1, alWin); // 東面二樓 3 扇小窗
      k.box(-0.5, 0, 4.2, 4.7, 3.7, 4.5, MR.ac, { col: false });
      for (const x of [2.2, 6, 9.8]) k.plane(alWin, 1.8, 1.3, x, 5.3, -0.03, FRONT);
      k.plane(alWin, 2.4, 1.6, 2.6, 1.7, -0.03, FRONT);
      k.plane(alWin, 2.4, 1.6, 9.2, 1.7, -0.03, FRONT);
      k.box(5.2, 6.8, 0, 2.4, -0.05, 0, '#55585c', { col: false });
    }
    {
      // N2 [56,85] 汎迪爾幼稚園的前庭與圍牆（圍牆線離中心線 10 m）：停車格、瓦頂警衛室、綠色大門、石門柱＋黑鐵欄杆、綠籬、廣場、半圓花台
      const k = seg(C, 1, 56, 85, 10),
        w = k.W;
      k.box(0, w, -0.3, 0.04, -5.2, 0, '#b9b6ae', { col: false }); // 前庭水泥地
      for (let j = 0; j <= 9; j++) {
        const x = k.sx(59.5 + j * 2.6);
        k.box(x - 0.05, x + 0.05, 0.04, 0.05, -5.0, -0.3, '#f0f0ec', { col: false });
      }
      for (let j = 0; j < 7; j++)
        C.bike(k, k.sx(77.2) + j * 0.85, -2.3 - (j % 2) * 0.15, 1, C.bikeCols[j % 6]); // 2026-05 前庭西段靠圍牆停了一排機車
      k.box(0, w, -0.3, 0.05, 0, 16, '#cfc6b0', { col: false }); // 圍牆內的鋪面廣場
      // 警衛室 [56.7,61.6]、離中心線 9.3～13.5：米色磁磚牆、深灰日式瓦四坡屋頂、朝路一扇窗、牆上紅色直幅布條（字看不清）
      k.box(0.7, 5.6, -0.5, 2.7, -0.7, 3.5, 'wall#efe2c6', { tile: [0.6, 0.6] });
      k.plane(alWin, 1.6, 1.1, 3.4, 1.65, -0.72, FRONT);
      k.box(1.0, 1.4, 0.7, 2.4, -0.74, -0.7, '#c8202a', { col: false });
      frus(C, k, [0.3, 6.0, -1.1, 3.9], 2.7, [2.3, 4.0, 1.4, 1.4], 4.3, '#4a4d55');
      // 大門 [62,66]：兩根較粗的石門柱＋綠色鐵柵雙開門
      const post = (x, wd, h) => {
        k.box(x, x + wd, -0.5, h, 0, wd, '#9a8a7a');
        k.box(x - 0.05, x + wd + 0.05, h, h + 0.1, -0.05, wd + 0.05, '#857667', { col: false });
        ball(C, k, x + wd / 2, h + 0.32, wd / 2, 0.22, '#f4f4ee');
      };
      post(5.6, 0.8, 2.5);
      post(9.6, 0.8, 2.5);
      k.plane(gateTex, 3.2, 1.8, 8.0, 0.9, 0.4, FRONT, { transparent: true, double: true });
      k.wallRect(6.4, 9.6, 0.35, 0.45, 0, 1.8);
      // 圍牆：石門柱（0.6 見方、2.3 高、柱頂白色圓球燈）＋0.4 高矮牆＋黑鐵欄杆＋後面修剪整齊的綠籬
      const P = [10.4, 14.5, 20, 24.5, w - 0.6];
      for (const x of P.slice(1)) post(x, 0.6, 2.3);
      for (let j = 0; j < P.length - 1; j++) {
        const a = P[j] + (j ? 0.6 : 0),
          b = P[j + 1];
        k.box(a, b, -0.5, 0.4, 0.15, 0.45, '#9a8a7a');
        k.plane(bars, b - a, 1.4, (a + b) / 2, 1.1, 0.3, FRONT, {
          transparent: true,
          double: true,
        });
        k.wallRect(a, b, 0.25, 0.35, 0, 1.8);
        k.box(a, b, 0, 1.0, 0.75, 1.45, '#3f7a3a', { col: false });
        if (j === 1)
          k.plane(photoTex, b - a - 0.3, 1.3, (a + b) / 2, 1.1, 0.27, FRONT); // s 70～76 那格整面掛團體照帆布
        else
          for (let i = 0; i < 2; i++)
            k.box(
              a + (b - a) * (0.3 + i * 0.4) - 0.3,
              a + (b - a) * (0.3 + i * 0.4) + 0.3,
              0.8,
              1.4,
              0.24,
              0.28,
              ['#f2c230', '#e0568a', '#3b9fd8', '#6fae5a'][(j + i) % 4],
              { col: false }
            ); // 欄杆上的卡通圖案牌
      }
      // 半圓形花台（弧邊朝北）：s 66～82、離中心線 11.3～17.3
      const half = (rx, rz, y0, y1, hex) => {
        const g = new THREE.CylinderGeometry(1, 1, y1 - y0, 20, 1, false, -Math.PI / 2, Math.PI);
        g.scale(rx, 1, rz);
        g.translate(k.sx(74), (y0 + y1) / 2, 1.3);
        k._part(C.VC, C.paintGeo(g, hex));
      };
      half(8, 6, 0, 0.45, '#b9a58a');
      half(7.6, 5.6, 0.45, 0.5, '#8a5a40');
      k.box(k.sx(66), k.sx(82), 0, 0.45, 1.2, 1.32, '#b9a58a', { col: false });
      for (const [s, z] of [
        [76, 5.2],
        [79.5, 3.2],
      ])
        tree(C, k, k.sx(s), z, 3.6, 1.2, r);
      conifer(C, k, k.sx(72.5), 5.6, 8.5, 1.3);
      conifer(C, k, k.sx(67.6), 4.2, 8, 1.2); // 入口前左右各一棵高高的龍柏（2009 街景；2024 正射花台裡仍有幾棵樹）
      tree(C, k, k.sx(58.6), k.zo(17.5), 9.5, 3.4, r); // 警衛室後面的大樹
    }
    {
      // N2 主建築（s 57.5～84.5、離中心線 26～40；正射量到屋頂 s 55～82，但 2009 街景裡圍牆門柱都對得上、主建築卻偏西約 5 m，判斷是正射的屋頂偏移，取中間值往西移 2.5 m；正射的屋頂外框從 23 m 起，但 3 樓屋頂在正射裡往南偏 2～3 m，2009 街景量到立面約 26～27 m）：歐式城堡風 3 樓，米黃色外牆、深灰曼薩爾屋頂（屋頂現在鋪滿太陽能板）、兩端八角塔樓、中央門廊與三樓大拱窗
      const k = seg(C, 1, 57.5, 84.5, 25.2),
        w = k.W,
        D = 15,
        Z = 0.8,
        H = 10.5,
        WALL = 'wall#e6d09c',
        CR = '#f2ecdc';
      k.box(0, w, -0.5, H, Z, D, WALL, { tile: [0.6, 0.6] });
      for (const y of [3.5, 7.0, H])
        k.box(-0.1, w + 0.1, y - 0.12, y + 0.12, Z - 0.15, D + 0.1, CR, { col: false });
      frus(
        C,
        k,
        [-0.3, w + 0.3, Z - 0.3, D + 0.3],
        H + 0.12,
        [1.6, w - 1.6, Z + 1.6, D - 1.6],
        H + 2.7,
        '#6a6e78'
      );
      k.box(1.8, w - 1.8, H + 2.7, H + 2.85, Z + 1.8, D - 1.8, '#1c2636', { col: false });
      for (let x = 3; x < w - 3; x += 1.7)
        k.box(x, x + 0.05, H + 2.85, H + 2.87, Z + 1.8, D - 1.8, '#3d4d66', { col: false });
      for (const cx of [2.4, w - 2.4]) {
        // 八角塔樓：比主體高一點、尖頂（2009 街景看塔頂只比屋脊高一些）
        oct(C, k, cx, Z + 0.4, 2.8, -0.5, H + 1.0, '#e6d09c');
        k.wallRect(cx - 2.6, cx + 2.6, Z - 2.2, Z + 3, 0, H);
        oct(C, k, cx, Z + 0.4, 3.0, H + 0.9, H + 1.2, CR);
        oct(C, k, cx, Z + 0.4, 3.0, H + 1.2, H + 4.0, '#6a6e78', 0.05);
        for (const y of [1.9, 5.3, 8.8])
          k.plane(alWin, 1.3, 1.7, cx, y, Z + 0.4 - 2.8 * 0.924 - 0.03, FRONT);
        for (const y of [3.5, 7.0]) oct(C, k, cx, Z + 0.4, 2.9, y - 0.1, y + 0.1, CR);
      }
      for (const [x0, x1] of [
        [5.8, 10.2],
        [w - 10.2, w - 5.8],
      ]) {
        // 兩翼：每層 2 扇白框窗，二三樓淺陽台與白色欄杆
        for (const y of [0, 3.5, 7.0])
          for (const x of [x0 + 1.0, x1 - 1.0])
            k.plane(alWin, 1.5, 1.7, x, y + 1.85, Z - 0.03, FRONT);
        for (const y of [3.5, 7.0]) {
          k.box(x0 - 0.2, x1 + 0.2, y, y + 0.12, Z - 0.7, Z, CR, { col: false });
          k.box(x0 - 0.2, x1 + 0.2, y + 0.12, y + 0.95, Z - 0.7, Z - 0.62, '#f4f2ea', {
            col: false,
          });
        }
        const dx = (x0 + x1) / 2;
        k.box(dx - 0.8, dx + 0.8, H + 0.3, H + 1.7, Z - 0.1, Z + 1.3, CR, { col: false });
        k.plane(alWin, 1.1, 1.0, dx, H + 1.0, Z - 0.12, FRONT); // 老虎窗
        frus(
          C,
          k,
          [dx - 1.0, dx + 1.0, Z - 0.25, Z + 1.4],
          H + 1.7,
          [dx, dx, Z - 0.25, Z + 1.4],
          H + 2.4,
          '#6a6e78'
        );
      }
      const cx = w / 2; // 中央：門廊（暗紅橫匾，字看不清）、二樓窗、三樓大拱窗、山牆
      k.box(cx - 3.2, cx + 3.2, 3.3, 3.75, Z - 2.2, Z, CR, { col: false });
      for (const x of [cx - 3.0, cx - 1.2, cx + 0.8, cx + 2.6])
        k.cyl(x + 0.2, Z - 1.9, 0.22, 0, 3.3, CR, { seg: 10 });
      k.box(cx - 2.6, cx + 2.6, 2.75, 3.25, Z - 2.26, Z - 2.2, '#8a3a34', { col: false });
      k.plane(alWin, 3.0, 2.5, cx, 1.3, Z - 0.03, FRONT);
      k.plane(alWin, 3.2, 1.8, cx, 5.4, Z - 0.03, FRONT);
      k.plane(C.archWin, 4.4, 2.6, cx, 8.6, Z - 0.03, FRONT);
      k.box(cx - 3.2, cx + 3.2, H, H + 1.6, Z - 0.12, Z + 2.2, WALL, { col: false });
      frus(
        C,
        k,
        [cx - 3.5, cx + 3.5, Z - 0.3, Z + 2.4],
        H + 1.6,
        [cx, cx, Z - 0.3, Z + 2.4],
        H + 3.4,
        '#6a6e78'
      );
      for (let f = 0; f < 3; f++) {
        for (const z of [4, 8, 12, 15]) {
          sideWin(k, -0.03, f * 3.5 + 1.9, z, -1, 1.4, 1.5, alWin);
          sideWin(k, w + 0.03, f * 3.5 + 1.9, z, 1, 1.4, 1.5, alWin);
        }
        for (let x = 3; x < w - 2; x += 3.5)
          k.plane(alWin, 1.5, 1.6, x, f * 3.5 + 1.9, D + 0.03, 0);
      }
    }
    {
      // 幼稚園西南角路邊的藍底橫式布條（2026-05 新增，掛得不高、在綠籬東端外側，兩行字看不清，不放字）
      const k = seg(C, 1, 84.6, 87.6, 5.3);
      k.box(0, 3, 0.9, 1.9, 0, 0.06, '#2a62c4', { col: false });
      k.box(0.08, 2.92, 0.97, 1.83, -0.01, 0, '#3a74d8', { col: false });
      for (const x of [0.15, 2.8])
        k.box(x, x + 0.06, 0, 0.9, 0.01, 0.07, '#8a8d90', { col: false });
    }
    // N3 [85,113] 藤蔓綠籬圍起來的雜木空地：沿路一整道綠籬（離中心線 5.5），裡面是雜木，沒有建物
    hedge(1, 88.4, 106.1, 5.5, 1.7, 0.8, '#3f6a2c');
    hedge(1, 106.1, 111.8, 5.5, 1.7, 0.8, '#3f6a2c');
    [
      [90, 10, 7, 3],
      [92.5, 15.5, 8, 3.4],
      [96.5, 11.5, 10, 5],
      [100.5, 17.5, 8, 3.2],
      [104, 10, 6.5, 2.6],
      [107.5, 12.5, 7, 2.8],
      [110.3, 9.6, 6, 2.3],
      [87.5, 14.5, 7, 3],
    ].forEach(([s, off, h, cr]) => {
      const k = seg(C, 1, s - 1, s + 1, off);
      tree(C, k, 1, 0, h, cr, r);
    });
    {
      // N4 [113.3,124.5] 3 樓透天兩戶：二三樓出挑在騎樓上（米白小口磚、深灰壁柱與橫帶、每戶一大一小兩扇窗），粉膚色磁磚騎樓柱，東西側牆白色粉刷
      const k = seg(C, 1, 113.3, 124.5, 7.2),
        w = k.W,
        top = 9.3,
        D = 20.8;
      k.box(0, w, 3.3, top, 0, 2.5, 'wall#f2e9d6', { col: false, tile: [0.6, 0.6] });
      k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, 2.5, '#b9b6ae', { col: false });
      k.box(0, w, top + 0.12, top + 0.9, 0, 0.15, 'wall#f2e9d6', { col: false });
      for (const x of [0, w / 2 - 0.25, w - 0.5])
        k.box(x, x + 0.5, -0.5, 3.3, 0, 0.5, 'wall#e3c6b6', { tile: [0.3, 0.3] }); // 騎樓柱：兩端＋中間分戶線（2026-05 街景每戶中間沒有柱子）
      k.box(0, w, 2.9, 3.3, 0, 0.3, 'wall#e3c6b6', { col: false, tile: [0.3, 0.3] });
      for (const x of [0, w / 2 - 0.1, w - 0.2])
        k.box(x, x + 0.2, 3.3, top + 0.9, -0.08, 0, '#85888c', { col: false });
      k.box(0, w, 6.24, 6.38, -0.06, 0, '#85888c', { col: false });
      k.box(0, w, 3.3, 3.42, -0.06, 0, '#85888c', { col: false });
      for (const y of [3.3, 6.3])
        for (const u of [0, 1]) {
          const x0 = (u * w) / 2;
          k.plane(gWin, 2.6, 1.5, x0 + 2.0, y + 1.65, -0.03, FRONT);
          k.plane(alWin, 1.0, 1.1, x0 + 4.4, y + 1.8, -0.03, FRONT);
        }
      k.box(-0.07, 0, 0, top, 0.5, D, '#eeeae0', { col: false });
      k.box(w, w + 0.07, 0, top, 0.5, D, '#eeeae0', { col: false });
      for (let f = 0; f < 3; f++)
        for (const z of [4, 8.5, 13, 17.5]) {
          sideWin(k, -0.09, f * 3 + 2.1, z, -1, 0.9, 1.0);
          if (f) sideWin(k, w + 0.09, f * 3 + 2.1, z, 1, 0.9, 1.0);
        }
      for (const [y, z] of [
        [4.0, 6],
        [7.0, 10.5],
        [7.0, 15],
      ])
        k.box(-0.5, -0.07, y, y + 0.5, z, z + 0.8, MR.ac, { col: false });
    }
    {
      // N5 車庫捲門上方的暗紅色鐵皮封簷
      const k = seg(C, 1, 124.5, 128.3, 6.3);
      k.box(-0.05, k.W + 0.05, 2.6, 3.05, -0.16, 0, '#a8443a', { col: false });
    }
    {
      // N6 [128.3,138.5] 淺綠色浪板圍籬（約 1.5 m）＋綠色鐵皮車棚（貼在 w493402609 前面），圍籬西端信箱與水泥墩
      const k = seg(C, 1, 128.3, 138.5, 6.5),
        w = k.W;
      k.box(0, w, -0.3, 1.5, 0, 0.06, '#a4d4bc');
      for (let x = 0.1; x < w; x += 0.3)
        k.box(x, x + 0.05, 0, 1.5, -0.02, 0, '#92c4ac', { col: false });
      k.box(0, w, 1.5, 1.56, -0.03, 0.09, '#84b49c', { col: false });
      k.box(w - 0.6, w, 0, 0.6, -0.5, -0.02, '#a3a19b');
      k.box(w - 0.5, w - 0.15, 0.6, 0.95, -0.4, -0.1, '#b8322c', { col: false });
      k.box(0.5, 8.9, 2.6, 2.7, 0.3, 3.15, '#4f9a78', { col: false });
      k.box(0.5, 8.9, 2.45, 2.6, 0.3, 0.38, '#3f8a68', { col: false });
      for (const x of [0.6, 4.7, 8.75]) k.cyl(x, 0.45, 0.05, 0, 2.6, '#8a8d90', { seg: 6 });
      car(k, 1.2, 0.9, 4.3, 1.75, 1.5, '#c9c9c4', null, false);
      k.box(0, w, -0.3, 0.04, 0.06, 3.15, '#b3b0a8', { col: false });
    }
    {
      // N7 [138.5,142.3] 沿 w493402609 西牆進去的柏油車道，路口一道不鏽鋼伸縮門
      const k = seg(C, 1, 138.5, 142.3, 7.0),
        w = k.W;
      k.box(0.9, w, -0.3, 0.035, -2.2, 20, '#5b5b5e', { col: false });
      k.plane(accTex, 3.2, 1.3, 2.3, 0.65, 0.1, FRONT, { transparent: true, double: true });
      k.wallRect(0.7, 3.9, 0.05, 0.15, 0, 1.3);
      k.box(0.5, 0.75, 0, 1.4, 0, 0.3, '#c9ccd0');
      for (const x of [1.5, 3.1]) k.box(x, x + 0.08, 0, 0.12, 0.02, 0.2, '#55585c', { col: false });
    }
    {
      // N8 [142.3,150] 紅磚矮牆（磚柱每 3.4 m 一根，西半段牆上一小段黑鐵欄杆）＋2 棵高大的南洋杉
      const k = seg(C, 1, 142.3, 149.6, 7.0),
        w = k.W;
      k.box(0, w, -0.5, 0.9, 0.08, 0.32, '#9a5a48');
      for (const x of [0, 3.4, w - 0.5]) {
        k.box(x, x + 0.5, -0.5, 1.3, 0, 0.5, '#9a5a48');
        k.box(x - 0.04, x + 0.54, 1.3, 1.38, -0.04, 0.54, '#c9c5ba', { col: false });
      }
      k.plane(bars, w - 4.4, 0.4, (3.9 + w - 0.5) / 2, 1.1, 0.2, FRONT, {
        transparent: true,
        double: true,
      });
      conifer(C, k, k.sx(144.8), k.zo(10.5), 16, 1.9);
      conifer(C, k, k.sx(147.4), k.zo(12), 12, 1.5);
    }
    {
      // s≈144.5 路邊的水泥電桿＋紅框三角形彎道警告標誌（牌面朝東，給往西的車看）
      const k = seg(C, 1, 144, 145, 5.0);
      pole(k, 0.5, 0);
      k.plane(warnTex, 0.9, 0.9, 0.32, 2.7, 0.25, -Math.PI / 2, { transparent: true });
      k.box(0.33, 0.36, 2.3, 3.1, -0.15, 0.65, '#8a8d90', { col: false });
    }

    {
      const k = seg(C, 1, 112, 113, 5.3);
      pole(k, 0.5, 0, 8.5);
      k.box(0.46, 0.54, 7.9, 7.98, -1.6, 0, '#8a8d90', { col: false });
      k.box(0.3, 0.7, 7.82, 7.92, -1.9, -1.4, '#d8d8d0', { col: false });
    } // s≈112.5 掛路燈的水泥電桿

    // ================= 南側 =================
    for (const s0 of [106.4, 116.3]) {
      // 南側路邊 2 支有變壓器的水泥電桿
      const k = seg(C, -1, s0 - 0.5, s0 + 0.5, 5.3);
      pole(k, 0.5, 0, 10.5);
      k.cyl(0.5, 0.45, 0.33, 6.6, 7.6, '#7f858a', { seg: 10 });
      k.box(-0.4, 1.4, 9.4, 9.5, -0.05, 0.05, '#8a8d90', { col: false });
      k.box(-0.2, 1.2, 8.6, 8.7, -0.05, 0.05, '#8a8d90', { col: false });
    }
    // S1 [40,107] 矮水泥基座＋爬滿藤蔓的圍籬（約 1.8 m，離中心線 5.8），後面一整排樹，沒有臨路建物
    hedge(-1, 41, 66.1, 5.8, 1.8, 0.45, '#3f6a2c', true);
    hedge(-1, 66.1, 106.1, 5.8, 1.8, 0.45, '#3f6a2c', true);
    hedge(-1, 106.1, 107.4, 5.8, 1.8, 0.45, '#3f6a2c', true);
    [
      [45, 9.5, 8, 3.2],
      [51, 12, 10, 4],
      [57, 9.5, 9, 3.6],
      [60, 15.5, 11, 4.2],
      [64.5, 9.2, 9, 3.4],
      [71, 9.6, 10, 4],
      [78.6, 10, 9, 3.6],
      [84.5, 18, 9, 3.6],
      [86, 10, 11, 4.4],
      [90.5, 16.5, 10, 4],
      [93.5, 9.8, 9, 3.8],
      [97.5, 18, 10, 4],
      [100, 10.5, 12, 4.5],
      [104.6, 9.6, 8, 3.2],
    ].forEach(([s, off, h, cr]) => {
      const k = seg(C, -1, s - 1, s + 1, off);
      tree(C, k, 1, 0, h, cr, r);
    });
    {
      // s≈78 綠色指示牌：立在路邊的高桿上（牌面中心約 7.2 m 高、在路肩上方，不伸到車道），牌面朝西（給往東的車看）
      const k = seg(C, -1, 77, 79, 5.0);
      k.cyl(1, 0.2, 0.17, 0, 8.4, '#8a8d90', { seg: 8 });
      for (const y of [6.3, 8.1])
        k.box(0.93, 1.07, y, y + 0.1, -0.5, 2.5, '#8a8d90', { col: false });
      k.box(0.96, 1.04, 6.15, 8.25, -0.5, 2.5, '#6f7275', { col: false });
      k.plane(dirSign, 3.0, 2.1, 0.95, 7.2, 1.0, -Math.PI / 2, { emissive: 0.25 });
    }
    {
      // S1 後排：Mr.May 的圓形建築（s 62～70、離中心線 14～23，深褐色直條木板外牆、白色圓頂；入口朝環中東路，從新中北路這側看不到招牌）
      const k = seg(C, -1, 61.5, 70.5, 14),
        x = k.W / 2,
        z = 4.6;
      k.cyl(x, z, 4.4, -0.5, 6.0, '#5a4032', { seg: 20, col: true });
      k.cyl(x, z, 4.5, 5.6, 6.1, '#e8e6e0', { seg: 20 });
      ball(C, k, x, 6.1, z, 4.2, '#f0eee8', 0.3);
      for (let a = 0; a < 20; a++) {
        const t = (a / 20) * Math.PI * 2;
        k.cyl(x + Math.cos(t) * 4.36, z + Math.sin(t) * 4.36, 0.09, 0, 5.6, '#4a3226', { seg: 4 });
      }
    }
    {
      // S1 後排：2～3 層灰色水泥舊廠房（s 72.6～82.3、離中心線 14～35），朝北成排的毛玻璃窗、暗紅色鐵皮屋頂
      const k = seg(C, -1, 72.6, 82.3, 14),
        w = k.W,
        D = 21,
        H = 8.4;
      k.box(0, w, -0.5, H, 0, D, 'wall#b4b3ad', { tile: [0.6, 0.6] });
      for (const y of [2.0, 5.2])
        for (let x = 1.3; x < w - 0.6; x += 2.4) k.plane(alWin, 2.0, 1.5, x, y + 0.6, -0.03, FRONT);
      for (const y of [2.0, 5.2])
        for (const z of [4, 9, 14, 18.5]) {
          sideWin(k, -0.03, y + 0.6, z, -1, 2.0, 1.5, alWin);
          sideWin(k, w + 0.03, y + 0.6, z, 1, 2.0, 1.5, alWin);
        }
      frus(
        C,
        k,
        [-0.4, w + 0.4, -0.4, D + 0.4],
        H,
        [w / 2, w / 2, -0.4, D + 0.4],
        H + 1.9,
        '#b0453c'
      );
    }
    {
      // S2 捲門上方的深藍色鐵皮封簷、屋頂 2 台冷氣室外機
      const k = seg(C, -1, 107.4, 115.3, 6.5),
        w = k.W;
      k.box(-0.05, w + 0.05, 2.5, 3.1, -0.14, 0, '#2f4f7a', { col: false });
      for (const x of [1.8, 5.4]) {
        k.box(x, x + 0.9, 3.15, 3.8, 1.0, 1.45, MR.ac, { col: false });
        k.box(x + 0.08, x + 0.82, 3.22, 3.72, 0.98, 1.0, '#9a9a94', { col: false });
      }
    }
    {
      // S3 [115.3,121] 東邊 [115.3,118.4]：車庫屋頂延伸下來的內凹處，深色鐵皮牆＋一扇灰色鐵門（審查：正對看是深色不是暗紅）；
      //   西邊 [118.4,121]：小鐵皮棚（深灰浪板屋頂），底下鐵架與一堆盆栽，前面放交通錐；棚子朝東的側牆才是暗紅色浪板（從東邊看得到）
      const k = seg(C, -1, 115.3, 121, 6.5),
        w = k.W;
      k.box(2.66, w, -0.5, 2.95, 2.4, 2.55, '#4c4846');
      for (let x = 2.8; x < w; x += 0.3)
        k.box(x, x + 0.04, 0, 2.95, 2.37, 2.4, '#3e3a38', { col: false });
      k.box(3.5, 4.4, 0, 2.2, 2.32, 2.37, '#8a8d90', { col: false });
      k.box(2.66, w + 0.05, 2.95, 3.05, -0.2, 4.0, '#6f7275', { col: false });
      k.box(2.66, w + 0.05, 2.75, 2.95, -0.2, -0.12, '#55585c', { col: false });
      k.box(2.66, w, -0.3, 0.04, -1.0, 2.4, '#b3b0a8', { col: false });
      k.box(2.56, 2.66, -0.5, 2.4, -0.3, 3.9, '#8a3a34');
      for (let z = -0.2; z < 3.9; z += 0.3)
        k.box(2.66, 2.69, 0, 2.4, z, z + 0.04, '#7a322c', { col: false });
      k.box(-0.1, 2.7, 2.4, 2.48, -0.4, 4.0, '#55585c', { col: false });
      for (const [x, z] of [
        [0.05, -0.3],
        [2.5, -0.3],
        [0.05, 3.9],
        [2.5, 3.9],
      ])
        k.cyl(x, z, 0.04, 0, 2.4, '#8a8d90', { seg: 6 });
      k.box(0, 2.6, -0.5, 2.4, 3.9, 4.0, '#9a9a96');
      for (const y of [0.45, 1.1]) {
        k.box(0.2, 2.4, y, y + 0.05, 0.8, 1.6, '#6f7275', { col: false });
        for (let x = 0.4; x < 2.4; x += 0.5) {
          k.box(x - 0.13, x + 0.13, y + 0.05, y + 0.25, 1.05, 1.35, '#9a5a48', { col: false });
          ball(C, k, x, y + 0.45, 1.2, 0.22, r() < 0.5 ? '#4b8a3e' : '#3f7a3a');
        }
      }
      for (const x of [0.2, 0.2 + 2.2])
        for (const y of [0, 1.1])
          k.box(x - 0.03, x + 0.03, y, y + 0.5, 0.8, 0.86, '#6f7275', { col: false });
      for (const [x, z] of [
        [0.6, -0.7],
        [1.9, -0.9],
      ])
        k.cone(x, z);
    }
    {
      // S4 [121,131.5] 的細部：樓層間淺褐色橫帶、女兒牆鏤空花磚、屋頂天線；東開間「奉粥」的深藍色橫楣、紅色地磚、東牆角的直式招牌（橘底深藍字，審查拉近確認）與圓形燈箱（卡通圖，沒有字）
      const k = seg(C, -1, 121, 131.5, 7.0),
        w = k.W,
        top = 9.3,
        xe = k.sx(125.9);
      for (const y of [3.3, 6.3])
        k.box(0, w, y - 0.14, y + 0.02, -0.07, 0, '#c8b89c', { col: false });
      k.box(0, w, top + 0.12, top + 0.75, 0, 0.14, 'wall#e4e4e0', { col: false });
      k.plane(bars, 3.0, 0.5, xe / 2, top + 1.0, 0.07, FRONT, { transparent: true, double: true });
      for (const x of [2.8, 7.6]) {
        k.box(x, x + 0.04, top, top + 3.2, 6, 6.04, '#8a8d90', { col: false });
        for (const y of [2.4, 2.8, 3.1])
          k.box(x - 0.6, x + 0.64, top + y, top + y + 0.03, 6, 6.03, '#8a8d90', { col: false });
      }
      k.box(xe + 0.05, w - 0.05, 2.45, 2.95, -0.1, 0, '#22386a', { col: false });
      for (const x of [xe + 0.15, xe + 1.6, w - 1.5, w - 0.2])
        k.box(x - 0.05, x + 0.05, 0, 2.3, -0.09, -0.02, '#3f8a5a', { col: false });
      k.box(xe + 0.15, w - 0.2, 1.95, 2.05, -0.09, -0.02, '#3f8a5a', { col: false }); // 綠框玻璃門窗
      for (const x of [0, xe, w])
        k.box(Math.max(0, x - 0.08), Math.min(w, x + 0.08), 3.3, top + 0.75, -0.84, 0, '#a6a9ac', {
          col: false,
        }); // 開間之間的灰色壁柱
      k.box(xe, w, 0.05, 0.07, -2.6, 0, '#a8553f', { col: false });
      const vt = C.ROWT.vert('xzb3ZhouB', '#f08a1c', '#27348f', '奉粥');
      for (const sd of [-1, 1]) {
        k.plane(vt, 0.7, 1.4, w - 0.2 + sd * 0.05, 3.95, -1.25, (sd * Math.PI) / 2, {
          emissive: 0.3,
        });
        k.plane(
          C.roundSign(' ', '#f0c070', '#8a8d90'),
          0.8,
          0.8,
          w - 0.2 + sd * 0.05,
          5.1,
          -1.25,
          (sd * Math.PI) / 2,
          { transparent: true, emissive: 0.3 }
        );
      }
      k.box(w - 0.24, w - 0.16, 3.25, 4.65, -1.6, -0.9, '#d8741a', { col: false });
      for (const y of [3.4, 4.5, 5.1])
        k.box(w - 0.23, w - 0.17, y, y + 0.05, -0.9, 0, '#55585c', { col: false });
    }
    {
      // S4 與 S5 之間的窄巷 [131.5,133]：水泥地（S5 的入口在巷子裡）
      const k = seg(C, -1, 131.5, 133, 7.0);
      k.box(0, k.W, -0.3, 0.04, -2.2, 12, '#b3b0a8', { col: false });
    }
    {
      // S5 [133,139.5] 的細部：一樓朝路整面白色實牆（只有一扇小鐵窗與落水管）、二樓陽台前 4 根灰藍色方柱；三樓前半是開放的屋頂平台、後半是房間，整層上面是紅色鋼柱撐起的平頂
      const k = seg(C, -1, 133, 139.5, 7.0),
        w = k.W,
        t2 = 6.3,
        top = 9.3;
      k.box(0.02, w - 0.02, 0, 3.25, -0.27, 0, '#ecebe6', { col: false });
      k.plane(gWin, 1.0, 0.9, w * 0.62, 1.9, -0.29, FRONT);
      k.box(1.2, 1.3, 0, 3.25, -0.35, -0.27, '#b9bcc0', { col: false });
      for (let j = 0; j < 4; j++) {
        const x = 0.25 + (j * (w - 0.8)) / 3;
        k.box(x, x + 0.3, 3.3, t2, -0.82, -0.52, '#c9cfd8', { col: false });
      }
      k.box(0, w, t2 - 0.1, t2 + 0.12, -0.85, 0, '#b9c0ca', { col: false });
      k.box(0, w, t2 + 0.12, t2 + 1.1, -0.85, -0.7, 'wall#d4dae2', { col: false });
      for (const x of [0, w - 0.15])
        k.box(x, x + 0.15, t2 + 0.12, t2 + 1.1, -0.7, 5.5, 'wall#d4dae2', { col: false });
      k.box(0, w, t2 + 0.12, top, 5.5, 12, 'wall#d4dae2', { col: false });
      k.plane(alWin, 2.2, 1.5, w / 2, t2 + 1.7, 5.47, FRONT);
      for (const x of [0.1, w - 0.25])
        k.box(x, x + 0.15, t2 + 1.1, top, -0.8, -0.65, '#b0342c', { col: false });
      k.box(-0.15, w + 0.15, top, top + 0.18, -1.0, 12.1, '#8f9d98', { col: false });
      k.box(w - 0.95, w - 0.15, 4.0, 4.5, -0.45, 0, MR.ac, { col: false });
      for (const [y, z] of [
        [4.1, 2.2],
        [4.1, 5.0],
      ])
        k.box(w, w + 0.45, y, y + 0.5, z, z + 0.8, MR.ac, { col: false }); // 朝巷子的東牆掛 2 台冷氣
    }
    {
      // S6 [139.5,144.5] 沿路不鏽鋼伸縮門，門後水泥空地，底端一間 1 層灰色水泥平頂車庫（2 道灰色鐵捲門）
      const k = seg(C, -1, 139.5, 144.5, 6.5),
        w = k.W;
      k.box(0, w, -0.3, 0.04, -1.7, 5.5, '#b3b0a8', { col: false });
      k.plane(accTex, 4.4, 1.3, w / 2, 0.65, 0.1, FRONT, { transparent: true, double: true });
      k.wallRect(0.3, w - 0.3, 0.05, 0.15, 0, 1.3);
      k.box(w - 0.3, w - 0.05, 0, 1.4, 0, 0.3, '#c9ccd0');
      k.box(0, w, -0.5, 3.0, 5.5, 11.5, 'wall#8f8e88', { tile: [0.6, 0.6] });
      k.box(-0.1, w + 0.1, 3.0, 3.15, 5.3, 11.6, '#8f8d88', { col: false });
      for (const x of [1.3, 3.7]) k.plane(C.shutterTex('#5a5d60'), 2.1, 2.4, x, 1.2, 5.47, FRONT);
    }
    {
      // S7 [144.5,148] 白色預鑄水泥板圍牆（約 1.7 m，東端牆柱漆紅白斜紋），牆後幾棵樹
      const k = seg(C, -1, 144.5, 148, 6.5),
        w = k.W;
      k.box(0, w - 0.2, -0.5, 1.7, 0.02, 0.14, '#e4e4e0');
      for (let x = 0; x < w - 0.3; x += 1.1)
        k.box(x, x + 0.14, 0, 1.75, 0, 0.16, '#d4d4d0', { col: false });
      for (let i = 0; i < 6; i++)
        k.box(w - 0.22, w, i * 0.3, (i + 1) * 0.3, -0.02, 0.2, i % 2 ? '#f4f4f0' : '#c8202a', {
          col: !i,
        });
      tree(C, k, k.sx(146.6), k.zo(9.5), 6, 2.2, r);
      const p = seg(C, -1, 145.5, 146.5, 5.5);
      pole(p, 0.5, 0); // 水泥電桿＋2 支喇叭
      for (const sd of [-1, 1])
        p.cyl(0.5 + sd * 0.35, 0, 0.2, 6.2, 6.6, '#c9c9c4', { seg: 8, r1: 0.08 });
      const q = seg(C, -1, 147, 148, 5.7);
      q.cyl(0.5, 0, 0.05, 0, 4.9, '#8a8d90', { seg: 6 });
      q.box(0.46, 0.54, 3.5, 4.8, -0.05, 0.6, '#22305a', { col: false });
      q.box(0.46, 0.54, 3.22, 3.5, -0.05, 0.6, '#1c1c1e', { col: false });
      q.box(0.455, 0.545, 3.3, 3.42, 0.1, 0.45, '#e8c21e', { col: false });
      q.box(0.46, 0.54, 2.3, 3.2, -0.05, 0.6, '#e07a1e', { col: false }); // 鐵柱直式招牌：上段深藍、中間黃色箭頭、下段橘色（審查拉近看仍讀不出完整的字，不放字）
    }
    {
      const k = seg(C, -1, 148, 150, 10.5);
      tree(C, k, 1, 0, 7, 2.6, r);
    }
  },
  footprints(F) {
    return [
      F(R, 40, 56, 1, 4.8, 14.4), // N1 水泥空地
      F(R, 41, 53, 1, 21, 12.1, 0.2), // N1 後排粉紅房子
      F(R, 56, 66.1, 1, 4.8, 21.2), // N2 幼稚園前庭、圍牆、廣場（照道路轉折分兩段）
      F(R, 66.1, 85, 1, 4.8, 21.2),
      F(R, 57.5, 84.5, 1, 25.2, 15.2, 2.4), // N2 主建築
      F(R, 84.6, 87.6, 1, 5.3, 0.2, 0.1), // 藍色橫式招牌
      F(R, 88.4, 106.1, 1, 5.5, 0.9, 0.1), // N3 綠籬
      F(R, 106.1, 113.2, 1, 5.3, 1.1, 0.2),
      F(R, 113.3, 124.5, 1, 7.2, 2.5), // N4 出挑的騎樓
      F(R, 128.3, 138.5, 1, 6.5, 3.15, 0.5), // N6 圍籬與車棚
      F(R, 139.4, 142.3, 1, 7.0, 20, 2.2), // N7 車道
      F(R, 142.3, 149.6, 1, 7.0, 4.6, 0.1), // N8 磚牆與南洋杉
      F(R, 41, 66.1, -1, 5.8, 0.5, 0.1), // S1 圍籬
      F(R, 66.1, 106.1, -1, 5.8, 0.5, 0.1),
      F(R, 106.1, 107.4, -1, 5.8, 0.5, 0.1),
      F(R, 61.5, 70.5, -1, 14, 9.2), // Mr.May 圓形建築
      F(R, 72.6, 82.3, -1, 14, 21.2, 0.4), // 舊廠房
      F(R, 115.3, 121, -1, 6.5, 4.0, 1.0), // S3 鐵門與盆栽棚
      F(R, 131.5, 133, -1, 7.0, 12, 2.2), // S4 與 S5 之間的窄巷
      F(R, 139.5, 144.5, -1, 6.5, 11.6, 1.7), // S6 伸縮門、空地、車庫
      F(R, 144.5, 148, -1, 6.5, 0.2, 0.1), // S7 圍牆
    ];
  },
};
