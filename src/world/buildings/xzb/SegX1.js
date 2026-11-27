// 新中北路 s 250～370（薄膜中心前到469巷口，含巷口西南轉角面向新中北路的幾間店；Google 街景 2026-05、國土測繪 2024 正射）。
//   北側（+1，靠校園）：校內道路口 → 實英樓（既有，不動）→ 行道樹、公車站 → 薄膜中心車道口與大榕樹 →
//     機車停車場太陽能鋼棚的南端（接 SegL1.js 的棚子，南緣階梯狀）、鋼管欄杆、綠籬 → 469 巷口
//   南側（-1）：碎石停車場的鋼管欄杆 → 深灰浪板小棚 → 青禾貝比幼兒園（深紅欄杆矮牆、遊戲場黑鋼架、南棟、西棟：北面灰瓦披簷與「青禾貝比 幼兒園」招牌帶、東緣屋頂彩繪看板）→
//     水泥前庭、木圍籬、米黃浪板單斜頂小棟（後面是青綠色貨櫃屋）→ 紅頂鐵皮屋與「青禾貝比」立柱招牌 → YY 小吃店（前面加蓋的店面、後面較高的鐵皮屋）、SYM 鐵塔 → SYM 機車行 → 490 巷口綠籬 →
//     西南轉角 2 樓與「撞球」立柱 → 四八六食堂 → 米色鐵捲門店 → 吐司小店 → 初樂 板烤吐司
// 南側的房子全部是正南北向（門面朝正北），與路夾 38～45°，所以不用對著街的 lots，改用「正南北向的 Kit」直接下世界座標（x 東、z 南）；
// 只有 s 353 以西那幾間垂直於路的店用對著街的 Kit（四八六 353.7～359、米色鐵捲門店 ～362.4、吐司店 ～365.8、初樂 ～370.2，照正射的屋頂寬度）。
const R = 'X';
const FNT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
// 參考線上 (s, off) 的世界座標：s<310.2、310.2～350.3、350.3 以西各一段直線（中間的小折角不到 1°）
const pt = (s, off = 0, side = 1) => {
  const [bx, bz, s0, ux, uz] =
    s < 310.2
      ? [313.9, 58.5, 271.1, -0.8834, -0.4686]
      : s < 350.3
        ? [279.4, 40.2, 310.2, -0.7922, -0.6103]
        : [247.6, 15.7, 350.3, -0.7141, -0.7];
  return [bx + ux * (s - s0) - uz * off * side, bz + uz * (s - s0) + ux * off * side];
};
// 機車棚南段三條（x0, x1, 南緣 z），北端接 SegL1.js 的棚子（z 6.5）
const SHED_Z0 = 6.5,
  SHED = [
    [260.2, 266.2, 12.7],
    [266.2, 272.2, 18.2],
    [272.2, 278.2, 23.7],
  ];
const CORNER = [
  [238.7, 20.3],
  [242.5, 23.4],
  [242.5, 34.7],
  [237, 34.7],
  [232.4, 27.1],
]; // 西南轉角樓（五邊形）
const PLAY = [
  [315.3, 66.0],
  [292.5, 55.8],
  [290.6, 55.0],
  [290.6, 79.7],
  [315.3, 79.7],
]; // 幼兒園遊戲場
const COURT = [
  pt(303.2, 5.0, -1),
  pt(310.19, 5.0, -1),
  pt(310.21, 5.0, -1),
  pt(341, 5.0, -1),
  [250.4, 27.0],
  [250.4, 34.6],
  [248.3, 34.6],
  [248.3, 36.9],
  [260.8, 36.9],
  [260.8, 44.9],
  [266.0, 44.9],
  [266.0, 43.7],
  [271.2, 43.7],
  [271.2, 50.7],
  [280.9, 50.7],
]; // 南側水泥前庭
const PAVE = [
  pt(321.5, 7.2),
  pt(342.6, 7.2),
  [260.2, 9.0],
  [260.2, 13.1],
  [266.2, 13.1],
  [266.2, 18.6],
  [272.2, 18.6],
  [272.2, 24.1],
  [278.2, 24.1],
]; // 機車棚與人行道之間的米色鋪面

export default {
  // 北側 f649～f653 壓在實英樓（CampusFix 延伸後）上、f654 是草地與行道樹、f655 在薄膜中心車道口；
  // 南側 f2_807、f2_808 是 SYM 機車行／YY／紅頂鐵皮屋的位置，f1075～f1072 是轉角樓到吐司店
  drop: [
    'f649',
    'f650',
    'f651',
    'f652',
    'f653',
    'f654',
    'f655',
    'f2_807',
    'f2_808',
    'f1075',
    'f1074',
    'f1073',
    'f1072',
  ],
  ownSign: [],
  lots: [],

  custom(C) {
    const {
      THREE,
      VC,
      FRONT,
      lcg,
      sg,
      paint,
      paintGeo,
      bike,
      bikeCols,
      shutterTex,
      openTex,
      ROWT,
      MR,
    } = C;
    const PI = Math.PI,
      NC = { col: false },
      r = lcg(7311);
    const addG = (k, g, hex) => k._part(VC, paintGeo(g, hex));
    // 斜板：沿 z 傾斜（x0..x1 寬，從 (z0,y0) 斜到 (z1,y1)）／沿 x 傾斜
    const slopeZ = (k, x0, x1, z0, y0, z1, y1, th, hex) => {
      const dz = z1 - z0,
        dy = y1 - y0,
        g = new THREE.BoxGeometry(x1 - x0, th, Math.hypot(dz, dy));
      g.rotateX(-Math.atan2(dy, dz));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      return addG(k, g, hex);
    };
    const slopeX = (k, x0, y0, x1, y1, z0, z1, th, hex) => {
      const dx = x1 - x0,
        dy = y1 - y0,
        g = new THREE.BoxGeometry(Math.hypot(dx, dy), th, z1 - z0);
      g.rotateZ(Math.atan2(dy, dx));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      return addG(k, g, hex);
    };
    // 對著街的 Kit（+x 沿立面、+z 離開街道；南側 x=0 在西端）
    const st = (s0, s1, side, set) => {
      const k = C.kit(R, s0, s1, side, set),
        w = k.w;
      delete k.w;
      k.W = w;
      return k;
    };
    // 正南北向的 Kit：先在 (s, off) 開一個 Kit（地面高度取那一點），再把方向轉成世界座標軸；回傳的工具全部吃世界座標
    // 平面的 rotY：朝北 PI、朝東 PI/2、朝西 -PI/2、朝南 0
    const WK = (s, off, side) => {
      const [x, z] = pt(s, off, side),
        k = side > 0 ? C.kit(R, s, s + 1, 1, off) : C.kit(R, s - 1, s, -1, off);
      delete k.w;
      k.ox = x;
      k.oz = z;
      k.ang = 0;
      k.c = 1;
      k.s = 0;
      k.group.position.x = x;
      k.group.position.z = z;
      k.group.rotation.y = 0;
      const q = { k };
      q.B = (x0, x1, y0, y1, z0, z1, mat, o) =>
        k.box(x0 - x, x1 - x, y0, y1, z0 - z, z1 - z, mat, o);
      q.C = (cx, cz, rad, y0, y1, mat, o) => k.cyl(cx - x, cz - z, rad, y0, y1, mat, o);
      q.P = (tex, w, h, px, py, pz, rot, o) => k.plane(tex, w, h, px - x, py, pz - z, rot, o);
      q.S = (x0, z0, x1, z1, th, y0, y1, hex, o) =>
        paintGeo(k.slab(x0 - x, z0 - z, x1 - x, z1 - z, th, y0, y1, VC, o), hex);
      q.line = (x0, z0, x1, z1, y0, y1) => k.wallLine(x0 - x, z0 - z, x1 - x, z1 - z, y0, y1);
      q.prism = (pts, y0, y1, hex, o) =>
        k.prism(
          pts.map(([a, b]) => [a - x, b - z]),
          y0,
          y1,
          hex,
          o
        );
      q.slopeZ = (x0, x1, z0, y0, z1, y1, th, hex) =>
        slopeZ(k, x0 - x, x1 - x, z0 - z, y0, z1 - z, y1, th, hex);
      q.slopeX = (x0, y0, x1, y1, z0, z1, th, hex) =>
        slopeX(k, x0 - x, y0, x1 - x, y1, z0 - z, z1 - z, th, hex);
      q.bike = (bx, bz, rot, col) => bike(k, bx - x, bz - z, rot, col);
      q.blob = (bx, by, bz, rx, ry, rz, hex) => {
        const g = new THREE.SphereGeometry(1, 7, 5);
        g.scale(rx, ry, rz);
        g.translate(bx - x, by, bz - z);
        addG(k, g, hex);
      };
      return q;
    };
    const GREEN = ['#2f5f2c', '#3a6e33', '#2a5528', '#44753a'];
    const tree = (q, x, z, h, rad, tr = 0.22) => {
      q.C(x, z, tr, -1, h, '#5a4634', { seg: 7, col: true });
      for (const [dx, dy, dz, f] of [
        [0, 0.35, 0, 1],
        [-0.6, -0.1, 0.4, 0.75],
        [0.65, 0, -0.35, 0.8],
        [0.1, -0.05, 0.7, 0.7],
        [-0.2, 0, -0.7, 0.7],
      ])
        q.blob(
          x + dx * rad,
          h + dy * rad,
          z + dz * rad,
          rad * f,
          rad * f * 0.62,
          rad * f,
          GREEN[(r() * 4) | 0]
        );
    };
    // 鍍鋅鋼管欄杆（兩道橫桿＋立柱）
    const rail = (q, [x0, z0], [x1, z1], h = 1.05, hex = '#b4b8bb') => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.2));
      for (const y of [h * 0.5, h - 0.06]) q.S(x0, z0, x1, z1, 0.05, y, y + 0.05, hex, NC);
      for (let i = 0; i <= n; i++)
        q.C(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, 0.04, -0.5, h, hex, { seg: 6 });
      q.line(x0, z0, x1, z1, 0, h);
    };
    // 兩面的立牌：垂直於路，從兩個方向都看得到（rot 是其中一面的 rotY）
    const twoFace = (q, tex, w, h, x, y, z, rot, em = 0.3) => {
      for (const d of [0, PI])
        q.P(tex, w, h, x + Math.sin(rot + d) * 0.06, y, z + Math.cos(rot + d) * 0.06, rot + d, {
          emissive: em,
        });
    };

    // ---------- 貼圖 ----------
    const T = {
      corr: (hex, n = 28) =>
        sg(`xzX1corr${hex}${n}`, 512, 32, (g) => {
          // 直紋浪板
          g.fillStyle = hex;
          g.fillRect(0, 0, 512, 32);
          const p = 512 / n;
          for (let i = 0; i < n; i++) {
            g.fillStyle = 'rgba(255,255,255,.16)';
            g.fillRect(i * p, 0, p * 0.3, 32);
            g.fillStyle = 'rgba(0,0,0,.18)';
            g.fillRect(i * p + p * 0.6, 0, p * 0.25, 32);
          }
        }),
      disc: (hex) =>
        sg(`xzX1disc${hex}`, 128, 128, (g) => {
          g.clearRect(0, 0, 128, 128);
          g.fillStyle = hex;
          g.beginPath();
          g.arc(64, 64, 62, 0, 7);
          g.fill();
        }),
      band: () =>
        sg('xzX1band', 256, 256, (g) => {
          // 深色鋁框大窗（3 × 2 格）
          g.fillStyle = '#2e3134';
          g.fillRect(0, 0, 256, 256);
          for (let i = 0; i < 3; i++)
            for (let j = 0; j < 2; j++) {
              const gr = g.createLinearGradient(0, 6 + j * 126, 0, 124 + j * 126);
              gr.addColorStop(0, '#3e4e5e');
              gr.addColorStop(1, '#1f262e');
              g.fillStyle = gr;
              g.fillRect(5 + i * 84, 6 + j * 126, 78, 118);
              g.fillStyle = 'rgba(255,255,255,.08)';
              g.fillRect(9 + i * 84, 10 + j * 126, 20, 110);
            }
        }),
      kgPole: () =>
        sg('xzX1kgPole', 192, 960, (g) => {
          // 立柱招牌：桃園市私立／青禾貝比／幼兒園
          g.fillStyle = '#fbfbf8';
          g.fillRect(0, 0, 192, 960);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#2f6a3c';
          g.font = FNT(32, 700);
          g.fillText('桃園市私立', 96, 42);
          g.fillStyle = '#2f9a4a';
          g.font = FNT(150);
          [...'青禾貝比'].forEach((t, i) => g.fillText(t, 96, 160 + i * 165));
          g.fillStyle = '#f6cf2a';
          g.beginPath();
          g.ellipse(96, 852, 92, 62, 0, 0, 7);
          g.fill();
          g.fillStyle = '#2f8a44';
          g.font = FNT(54);
          g.fillText('幼兒園', 96, 856);
        }),
      kgBanner: () =>
        sg('xzX1kgBanner', 1536, 96, (g) => {
          // 簷口布條
          g.fillStyle = '#fbfbf8';
          g.fillRect(0, 0, 1536, 96);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.font = FNT(62);
          ['品格教育', '生活教育', '遊戲當中', '快樂學習'].forEach((t, i) => {
            g.fillStyle = i % 2 ? '#2aa39a' : '#e85a9a';
            g.fillText(t, 192 + i * 384, 52);
          });
        }),
      mural: () =>
        sg('xzX1mural2', 640, 256, (g) => {
          // 屋頂彩繪看板：粉彩底、拉大提琴的小朋友與綠色音符（沒有字）
          const gr = g.createLinearGradient(0, 0, 640, 256);
          gr.addColorStop(0, '#f8d8e4');
          gr.addColorStop(0.5, '#fbf0c8');
          gr.addColorStop(1, '#dfeecf');
          g.fillStyle = gr;
          g.fillRect(0, 0, 640, 256);
          g.fillStyle = '#f4c8a8';
          g.beginPath();
          g.arc(250, 84, 36, 0, 7);
          g.fill();
          g.fillStyle = '#e8a23a';
          g.beginPath();
          g.arc(250, 70, 37, PI, 0);
          g.fill();
          g.fillStyle = '#e87a9a';
          g.fillRect(218, 120, 64, 86);
          g.fillStyle = '#a8642e';
          g.beginPath();
          g.ellipse(318, 172, 36, 54, 0.25, 0, 7);
          g.fill();
          g.fillRect(298, 62, 10, 84);
          g.strokeStyle = '#5a3a2a';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(250, 152);
          g.lineTo(368, 130);
          g.stroke();
          g.fillStyle = '#7fb85a';
          g.font = FNT(230);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('♪', 520, 130);
          g.fillStyle = '#4fae5a';
          g.font = FNT(60);
          for (const [x, y] of [
            [420, 60],
            [90, 60],
            [150, 200],
            [60, 150],
          ])
            g.fillText('♪', x, y);
        }),
      kgBand: () =>
        sg('xzX1kgBand', 1024, 144, (g) => {
          // 西棟北面披簷下的招牌帶：淺薄荷綠底、綠字
          g.fillStyle = '#dcebd8';
          g.fillRect(0, 0, 1024, 144);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#2f9a4a';
          g.font = FNT(104);
          [...'青禾貝比'].forEach((t, i) => g.fillText(t, 90 + i * 132, 76));
          [...'幼兒園'].forEach((t, i) => g.fillText(t, 640 + i * 132, 76));
        }),
      kgWall: () =>
        sg('xzX1kgWall', 512, 144, (g) => {
          // 招牌帶下面的彩色吉祥物牆（示意，沒有字）
          g.fillStyle = '#f3ead2';
          g.fillRect(0, 0, 512, 144);
          const q = lcg(2931);
          for (let i = 0; i < 9; i++) {
            const x = 30 + i * 56 + q() * 10,
              y = 78 + q() * 20,
              rad = 24 + q() * 12;
            g.fillStyle = ['#e8423a', '#f2c230', '#f08a2a', '#4aa85a', '#3a8ac8', '#e87a9a'][
              (q() * 6) | 0
            ];
            g.beginPath();
            g.arc(x, y, rad, 0, 7);
            g.fill();
            g.fillStyle = '#fbf3e0';
            g.beginPath();
            g.arc(x, y - 4, rad * 0.5, 0, 7);
            g.fill();
          }
        }),
      tf: () =>
        sg('xzX1tf', 256, 256, (g) => {
          // 吐司店的黑色圓招牌（街景拉近讀得到）
          g.clearRect(0, 0, 256, 256);
          g.fillStyle = '#151c2a';
          g.beginPath();
          g.arc(128, 128, 126, 0, 7);
          g.fill();
          g.fillStyle = '#f4f4f0';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.font = FNT(38);
          g.fillText('toast&forest', 128, 104);
          g.fillRect(40, 132, 176, 3);
          g.font = FNT(22, 700);
          g.fillText('土司森林．手作輕食', 128, 160);
          g.font = FNT(17, 700);
          g.fillText('0929-863818', 128, 196);
        }),
      yy: () =>
        sg('xzX1yy', 256, 320, (g) => {
          // YY 小吃店立牌
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#fbfbf8';
          g.fillRect(0, 0, 256, 130);
          g.fillStyle = '#2a4fb0';
          g.font = FNT(112);
          g.fillText('YY', 128, 70);
          g.fillStyle = '#f6d32a';
          g.fillRect(0, 130, 256, 122);
          g.fillStyle = '#d42a2a';
          g.font = FNT(62);
          g.fillText('小吃店', 128, 166);
          g.font = FNT(44);
          g.fillText('美食歡唱', 128, 222);
          g.fillStyle = '#d42a2a';
          g.fillRect(0, 252, 256, 68);
          g.fillStyle = '#ffffff';
          g.font = FNT(36);
          g.fillText('0925-575399', 128, 288);
        }),
      symTop: () =>
        sg('xzX1symTop', 256, 320, (g) => {
          // 鐵塔頂的方形招牌：白底紅圓 SYM，下面紫底 SBC
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#fbfbf8';
          g.fillRect(0, 0, 256, 256);
          g.fillStyle = '#d8232a';
          g.beginPath();
          g.arc(128, 128, 108, 0, 7);
          g.fill();
          g.fillStyle = '#ffffff';
          g.font = `italic ${FNT(78)}`;
          g.fillText('SYM', 128, 132);
          g.fillStyle = '#5b3a9a';
          g.fillRect(0, 256, 256, 64);
          g.fillStyle = '#ffffff';
          g.font = FNT(48);
          g.fillText('SBC', 128, 290);
        }),
      symBand: () =>
        sg('xzX1symBand', 1536, 160, (g) => {
          // 機車行紅色招牌帶
          g.fillStyle = '#d8232a';
          g.fillRect(0, 0, 1536, 160);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#ffffff';
          g.font = `italic ${FNT(132)}`;
          g.fillText('SYM', 300, 86);
          g.font = FNT(50);
          g.fillText('銳智捷車業行', 1060, 50);
          g.font = FNT(44, 700);
          g.fillText('TEL：03-4639865', 1060, 112);
          g.strokeStyle = '#ffffff';
          g.lineWidth = 9;
          g.beginPath();
          g.arc(1440, 80, 58, 0, 7);
          g.stroke();
          g.font = `italic ${FNT(38)}`;
          g.fillText('SYM', 1440, 82);
        }),
      b486: () =>
        sg('xzX1b486', 704, 320, (g) => {
          // 四八六食堂看板：深灰黑底、米黃大字，左邊與下緣是菜色照片
          g.fillStyle = '#2a2a2a';
          g.fillRect(0, 0, 704, 320);
          const q = lcg(486);
          const dish = (x, y, rad) => {
            g.fillStyle = '#f2efe6';
            g.beginPath();
            g.arc(x, y, rad, 0, 7);
            g.fill();
            g.fillStyle = ['#c8762e', '#a8442a', '#d8a83a', '#6a8a3a', '#b85a2a'][(q() * 5) | 0];
            g.beginPath();
            g.arc(x, y, rad * 0.72, 0, 7);
            g.fill();
          };
          for (let i = 0; i < 3; i++) dish(62, 52 + i * 72, 32);
          for (let i = 0; i < 7; i++) dish(176 + i * 76, 276, 28);
          g.fillStyle = '#f0deb0';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.font = FNT(112);
          g.fillText('四八六食堂', 408, 124);
        }),
      lattice: () =>
        sg('xzX1lattice', 256, 128, (g) => {
          // 白色木框格子玻璃門窗
          g.fillStyle = '#f4f3ee';
          g.fillRect(0, 0, 256, 128);
          for (let i = 0; i < 8; i++)
            for (let j = 0; j < 4; j++) {
              g.fillStyle = j === 3 ? '#e4e2da' : '#4a5c66';
              g.fillRect(6 + i * 31, 6 + j * 30, 26, 25);
            }
          g.fillStyle = '#f4f3ee';
          for (const x of [62, 124, 186]) g.fillRect(x, 0, 8, 128);
        }),
      ball: () =>
        sg('xzX1ball', 128, 448, (g) => {
          // 藍底直式招牌：只有 9 號球圖案（字看不清，不放）
          g.fillStyle = '#1f4fa8';
          g.fillRect(0, 0, 128, 448);
          g.fillStyle = '#fbfbf8';
          g.beginPath();
          g.arc(64, 78, 48, 0, 7);
          g.fill();
          g.save();
          g.beginPath();
          g.arc(64, 78, 48, 0, 7);
          g.clip();
          g.fillStyle = '#f2c230';
          g.fillRect(0, 52, 128, 52);
          g.restore();
          g.fillStyle = '#fbfbf8';
          g.beginPath();
          g.arc(64, 78, 20, 0, 7);
          g.fill();
          g.fillStyle = '#1a1a1a';
          g.font = FNT(30);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('9', 64, 80);
        }),
      map: () =>
        sg('xzX1map2', 512, 160, (g) => {
          // 屋頂布條：深灰底、淺色世界地圖圖案，下緣電話
          g.fillStyle = '#2b2d30';
          g.fillRect(0, 0, 512, 160);
          const q = lcg(929);
          g.fillStyle = '#d8d8d4';
          for (const [cx, cy, n] of [
            [90, 50, 9],
            [140, 100, 6],
            [260, 44, 8],
            [280, 96, 7],
            [380, 54, 12],
            [440, 112, 4],
          ])
            for (let i = 0; i < n; i++) {
              g.beginPath();
              g.ellipse(
                cx + (q() - 0.5) * 70,
                cy + (q() - 0.5) * 44,
                10 + q() * 22,
                7 + q() * 14,
                q() * 3,
                0,
                7
              );
              g.fill();
            }
          g.fillStyle = '#1e1e1e';
          g.fillRect(0, 132, 512, 28);
          g.fillStyle = '#f4f4f0';
          g.font = FNT(22, 700);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('0929-863818', 256, 147);
        }),
      chule: () =>
        sg('xzX1chule', 480, 128, (g) => {
          // 初樂 板烤吐司
          g.fillStyle = '#f6f4ee';
          g.fillRect(0, 0, 480, 128);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#1a1a1a';
          g.font = `900 92px "Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif`;
          g.fillText('初樂', 170, 66);
          g.fillStyle = '#e07a2a';
          g.font = FNT(36);
          g.fillText('板烤吐司', 376, 72);
        }),
    };

    // ================= 北側 =================
    {
      // N4、N5：公車站、薄膜中心車道口的擋車柱、大榕樹
      const q = WK(290, 6.5, 1);
      // 行道樹遊戲裡原本就有（沿路的樹），這裡不再重複種
      // 候車亭（深色小屋頂）、長椅、站牌、消防栓、綠色電箱
      q.S(...pt(285.2, 5.9), ...pt(288.0, 5.9), 1.3, 2.4, 2.48, '#3a3d40', NC);
      for (const s of [285.4, 287.8]) q.C(...pt(s, 6.4), 0.05, 0, 2.4, '#3a3d40', { seg: 6 });
      q.S(...pt(285.7, 6.1), ...pt(287.5, 6.1), 0.4, 0.4, 0.46, '#7a5a3a', NC);
      q.C(...pt(291.6, 5.3), 0.04, 0, 2.6, '#c9ccd0', { seg: 6, col: true });
      q.P(T.disc('#2f6db3'), 0.6, 0.6, ...[pt(291.6, 5.3)[0], 2.4, pt(291.6, 5.3)[1]], PI + 0.49, {
        transparent: true,
        double: true,
      });
      q.C(...pt(293.6, 5.2), 0.12, 0, 0.7, '#c8322c', { seg: 8, col: true });
      q.S(...pt(294.8, 6.3), ...pt(295.8, 6.3), 0.5, 0, 1.2, '#4f8f6a');
      for (const s of [303.2, 306, 308.8]) {
        q.C(...pt(s, 5.3), 0.09, 0, 0.9, '#e8742a', { seg: 8, col: true });
        q.C(...pt(s, 5.3), 0.095, 0.5, 0.65, '#f2f2ee', { seg: 8 });
      }
      q.S(...pt(300.6, 5.6), ...pt(301.4, 5.6), 0.08, 0.5, 1.6, '#2f6db3', NC);
      q.C(...pt(301, 5.6), 0.04, 0, 0.5, '#8d9196', { seg: 6 });
      // 大榕樹（紅磚圍邊的樹穴）
      q.C(276.5, 29, 1.7, -0.3, 0.38, '#a8573f', { seg: 12, col: true });
      q.C(276.5, 29, 1.5, 0.3, 0.42, '#5a4a36', { seg: 12 });
      tree(q, 276.5, 29, 8.2, 5.2, 0.5);
    }
    {
      // N6：機車停車場太陽能鋼棚的南端（接 SegL1.js 的棚子）＋人行道內緣的鋼管欄杆、綠籬、米色鋪面、校園地圖石牌
      const q = WK(345.8, 14.9, 1),
        EV = 3.1,
        STEEL = '#9aa0a6',
        EDGE = '#8f9499',
        Z0 = SHED_Z0;
      q.prism(PAVE, -0.3, 0.04, '#d9cdb4', { shadow: false });
      SHED.forEach(([x0, x1, zs], i) => {
        q.B(x0, x1, -1.4, 0.07, Z0, zs + 0.4, '#b9b6ae', NC);
        const a = x0 + (i ? 0.12 : 0),
          b = x1 - 0.12;
        q.B(a, b, EV, EV + 0.1, Z0, zs, EDGE, NC);
        q.B(a + 0.25, b - 0.25, EV + 0.1, EV + 0.16, Z0 + 0.1, zs - 0.3, '#1f2a44', NC);
        for (let z = Z0 + 3.9; z < zs - 1; z += 4)
          q.B(a + 0.25, b - 0.25, EV + 0.1, EV + 0.17, z, z + 0.06, '#55607a', NC);
        q.B(
          (a + b) / 2 - 0.03,
          (a + b) / 2 + 0.03,
          EV + 0.1,
          EV + 0.17,
          Z0 + 0.1,
          zs - 0.3,
          '#55607a',
          NC
        );
        if (i) q.B(x0 - 0.12, x0 + 0.12, EV + 0.02, EV + 0.08, Z0, SHED[i - 1][2], '#e4e4e0', NC);
        q.B(x0, x1, EV - 0.3, EV + 0.14, zs - 0.08, zs + 0.04, EDGE, NC); // 南緣簷口
        q.B(x0 - 0.04, x0 + 0.06, EV - 0.3, EV + 0.14, i ? SHED[i - 1][2] : Z0, zs, EDGE, NC); // 階梯露出來的西緣
        for (let z = Z0 + 0.7; z < zs - 0.9; z += 0.8)
          for (const bx of [x0 + 0.6, x0 + 3.5])
            if (r() < 0.82) q.bike(bx, z, 0, bikeCols[(r() * 6) | 0]);
      });
      q.B(278.14, 278.24, EV - 0.3, EV + 0.14, Z0, 23.7, EDGE, NC);
      for (const [x, zs] of [
        [260.8, 12.7],
        [266.2, 18.2],
        [272.2, 23.7],
        [278.0, 23.7],
      ]) {
        for (let z = Z0 + 1.1; z < zs - 0.6; z += 3.25)
          q.B(x - 0.09, x + 0.09, -0.6, EV, z - 0.09, z + 0.09, STEEL);
        q.B(x - 0.09, x + 0.09, -0.6, EV, zs - 0.45, zs - 0.27, STEEL);
        q.B(x - 0.06, x + 0.06, EV - 0.2, EV, Z0, zs - 0.1, STEEL, NC);
      }
      for (let z = Z0 + 1.1; z < 23.5; z += 3.25)
        q.B(
          z < 12.7 ? 260.8 : z < 18.2 ? 266.2 : 272.2,
          278.0,
          EV - 0.16,
          EV,
          z - 0.05,
          z + 0.05,
          STEEL,
          NC
        );
      rail(q, pt(321.8, 7.1), pt(342.4, 7.1));
      q.S(...pt(329.3, 8.4), ...pt(340, 8.4), 1.3, -0.2, 1.0, '#4c7d3a'); // 綠籬
      q.S(...pt(344.6, 6.6), ...pt(345.8, 6.6), 0.22, 0, 1.6, '#8a8c8e'); // 灰色石材校園地圖牌
      q.S(...pt(344.75, 6.47), ...pt(345.65, 6.47), 0.03, 0.55, 1.45, '#d8d6cc', NC);
    }

    // ================= 南側 =================
    {
      // S1、S2：碎石停車場沿路的鋼管欄杆（中間留車道口）、深灰浪板小棚
      const q = WK(262, 7, -1);
      rail(q, pt(250.3, 5.6, -1), pt(256.5, 5.6, -1));
      rail(q, pt(260.5, 5.6, -1), pt(265.9, 5.6, -1));
      q.B(311.2, 315.0, -0.5, 3.0, 66.7, 78.4, '#3a3d42');
      q.B(311.0, 315.2, 3.0, 3.08, 66.5, 78.6, '#33363a', NC);
      q.P(T.corr('#3a3d42', 20), 3.8, 3.0, 313.1, 1.5, 66.67, PI);
      q.P(T.corr('#3a3d42', 60), 11.7, 3.0, 315.03, 1.5, 72.55, PI / 2);
      q.P(T.disc('#f2f2ee'), 0.7, 0.7, 313.1, 2.2, 66.64, PI, { transparent: true }); // 白色圓形標誌（字看不清）
    }
    {
      // S3、S4：青禾貝比幼兒園（遊戲場、沿路矮牆、黑鋼架、南棟、西棟、屋頂彩繪看板）
      const q = WK(290, 12, -1),
        WH = '#f0eee8',
        RF = '#8f9aa0',
        alWin = ROWT.alWin();
      q.prism(PLAY, -0.3, 0.04, '#5a5d62', { shadow: false });
      for (const [x0, x1, z0, z1, hex] of [
        [296, 312, 68.5, 69.3, '#d8a03a'],
        [296, 312, 76.5, 77.3, '#3a8ac8'],
        [296, 296.8, 68.5, 77.3, '#c84a4a'],
        [311.2, 312, 68.5, 77.3, '#4aa85a'],
      ])
        q.B(x0, x1, 0.04, 0.06, z0, z1, hex, NC); // 地上的彩色跑道圖案
      // 沿路圍牆：水泥矮牆＋深紅金屬板欄杆＋方形水泥柱
      const A = [315.5, 65.6],
        B = [290.5, 54.4],
        WL = Math.hypot(B[0] - A[0], B[1] - A[1]),
        wd = [(B[0] - A[0]) / WL, (B[1] - A[1]) / WL];
      q.S(...A, ...B, 0.2, -0.4, 0.9, '#b5b2aa');
      q.S(...A, ...B, 0.05, 0.9, 1.7, '#7a2a30', NC);
      for (let d = 0; d <= WL + 0.01; d += WL / 9)
        q.S(
          A[0] + wd[0] * (d - 0.16),
          A[1] + wd[1] * (d - 0.16),
          A[0] + wd[0] * (d + 0.16),
          A[1] + wd[1] * (d + 0.16),
          0.32,
          -0.4,
          1.85,
          '#c4c1b8',
          NC
        );
      q.P(
        paint('大家來洗手', '#f08ab0', '#ffffff', null, 3.2, 0.7),
        3.2,
        0.7,
        A[0] + wd[0] * 9 - wd[1] * 0.14,
        1.25,
        A[1] + wd[1] * 9 + wd[0] * 0.14,
        Math.atan2(-wd[1], wd[0]),
        { emissive: 0.1 }
      ); // 粉紅布條（第二行看不清，不放）
      // 遊戲場上方的黑色鋼架
      for (const x of [294.5, 304.4, 314.3]) {
        for (const z of [67.2, 79.0]) q.B(x - 0.1, x + 0.1, 0, 5.5, z - 0.1, z + 0.1, '#1c1c1e');
        q.B(x - 0.07, x + 0.07, 5.36, 5.5, 67.2, 79.0, '#1c1c1e', NC);
      }
      for (const z of [67.2, 71.1, 75.1, 79.0])
        q.B(294.5, 314.3, 5.38, 5.5, z - 0.06, z + 0.06, '#1c1c1e', NC);
      // 藍黃溜滑梯組
      for (const [x, z] of [
        [299.2, 71.4],
        [300.8, 71.4],
        [299.2, 73.0],
        [300.8, 73.0],
      ])
        q.B(x - 0.06, x + 0.06, 0, 2.6, z - 0.06, z + 0.06, '#2f6db3', NC);
      q.B(299.1, 300.9, 1.2, 1.3, 71.3, 73.1, '#2f6db3', NC);
      q.B(299.0, 301.0, 2.6, 2.75, 71.2, 73.2, '#f2c230', NC);
      q.slopeX(300.9, 1.25, 303.4, 0.1, 71.8, 72.6, 0.08, '#f2c230');
      tree(q, 297, 60, 6.5, 4.8, 0.32);
      // 西棟（南北長條，單層白牆、灰藍屋頂）
      q.B(281.6, 290.5, -0.6, 3.4, 52.6, 79.7, WH);
      q.B(283.9, 288.2, 3.4, 3.85, 52.6, 79.7, WH, NC);
      q.slopeX(281.3, 3.4, 286.05, 4.25, 52.3, 79.9, 0.1, RF);
      q.slopeX(286.05, 4.25, 290.8, 3.4, 52.3, 79.9, 0.1, RF);
      // 北面與東面一圈灰瓦披簷（主屋頂從披簷上面露出來）；北面簷口只出挑到 z 51.9，再出去就太靠路
      const TILE = '#62676d';
      q.slopeZ(281.2, 291.2, 51.9, 2.85, 53.5, 3.7, 0.12, TILE);
      q.slopeX(289.7, 3.7, 291.2, 2.85, 51.9, 79.9, 0.12, TILE);
      // 北面：西半是「青禾貝比 幼兒園」招牌帶與吉祥物彩繪牆，西端柱子上直式「青禾貝比」，東半是擺遊具的門廊與灰色柵門
      q.P(T.kgBand(), 5.4, 0.76, 284.75, 2.36, 52.56, PI, { emissive: 0.2 });
      q.P(T.kgWall(), 5.4, 1.5, 284.75, 1.1, 52.56, PI);
      q.B(281.6, 281.98, 0, 2.85, 52.5, 52.6, '#4fa79c', NC);
      q.P(
        paint('青\n禾\n貝\n比', '#eef3d2', '#2f9a4a', null, 0.34, 1.7),
        0.34,
        1.7,
        281.79,
        1.75,
        52.48,
        PI,
        { emissive: 0.15 }
      );
      q.B(287.6, 290.4, 0, 2.75, 52.55, 52.6, '#3a4a55', NC);
      q.B(287.7, 290.3, 0, 1.5, 52.5, 52.55, '#9ba1a6', NC);
      for (const [x, hex] of [
        [288.2, '#2f6db3'],
        [289.0, '#e8423a'],
        [289.8, '#2f6db3'],
      ])
        q.B(x - 0.25, x + 0.25, 1.5, 2.3, 52.5, 52.55, hex, NC);
      for (const z of [57.5, 63.5, 69.5, 75.5]) q.P(alWin, 2.6, 1.3, 290.53, 1.9, z, PI / 2);
      for (const z of [58, 66, 74]) q.P(alWin, 2.2, 1.2, 281.57, 1.9, z, -PI / 2);
      [
        ['#3a8ac8', 55.2],
        ['#4aa85a', 60.4],
        ['#f08a2a', 61.2],
        ['#7a5ac8', 66.4],
        ['#e8423a', 72.3],
        ['#f2c230', 77.6],
      ].forEach(([hex, z], i) =>
        q.B(290.5, 290.56, 2.55 - (i % 2) * 0.3, 2.95 - (i % 2) * 0.3, z, z + 0.6, hex, NC)
      ); // 東牆上的彩色積木裝飾
      q.B(279.7, 281.6, 2.5, 2.6, 54.5, 79.7, '#4f6b58', NC);
      for (const z of [54.7, 62.9, 71.2, 79.5])
        q.B(279.75, 279.87, 0, 2.5, z - 0.06, z + 0.06, '#8a8d90', NC); // 西側的深綠色鐵皮披棚（俯視看得到）
      // 屋頂彩繪看板：沿東緣南北向立在披簷後面，畫面朝東（對著遊戲場），背面是白浪板與鋼架
      q.P(T.mural(), 5.8, 2.3, 290.09, 5.25, 57.9, PI / 2, { emissive: 0.08 });
      q.P(T.corr('#e8e6e0', 24), 5.8, 2.3, 289.95, 5.25, 57.9, -PI / 2);
      q.B(289.98, 290.06, 4.05, 6.45, 54.95, 60.85, '#e8e6e0', NC);
      for (const z of [55.2, 57.9, 60.6]) {
        q.B(289.84, 289.98, 3.5, 6.4, z - 0.06, z + 0.06, '#6a4a3a', NC);
        q.slopeX(288.2, 3.75, 289.9, 5.9, z - 0.05, z + 0.05, 0.1, '#6a4a3a');
      }
      // 南棟（東西長條，簷口布條）
      q.B(281.6, 315.3, -0.6, 3.4, 79.7, 88.5, WH);
      q.B(281.6, 315.3, 3.4, 3.85, 82, 86.2, WH, NC);
      q.slopeZ(281.3, 315.6, 79.4, 3.4, 84.1, 4.25, 0.1, RF);
      q.slopeZ(281.3, 315.6, 84.1, 4.25, 88.8, 3.4, 0.1, RF);
      for (const x of [293.5, 298.5, 308.5, 313]) q.P(alWin, 2.4, 1.3, x, 1.7, 79.67, PI);
      q.B(302.6, 304.4, 0, 2.3, 79.64, 79.7, '#3a4a55', NC);
      [
        ['#e8423a', 295.8],
        ['#f2c230', 296.4],
        ['#3a8ac8', 300.6],
        ['#4aa85a', 301.2],
        ['#e8423a', 306],
        ['#3a8ac8', 306.6],
        ['#f2c230', 310.7],
      ].forEach(([hex, x], i) =>
        q.B(x, x + 0.5, 0.4 + (i % 3) * 0.55, 0.9 + (i % 3) * 0.55, 79.63, 79.7, hex, NC)
      ); // 牆上的彩色積木裝飾
      q.P(T.kgBanner(), 14, 0.875, 303, 2.95, 79.6, PI, { emissive: 0.12 });
    }
    {
      // S5、S6、S7：水泥前庭、木圍籬、米黃單斜頂小棟、青綠貨櫃屋、紅頂鐵皮屋與立柱招牌、YY 小吃店、SYM 鐵塔
      const q = WK(312, 9, -1),
        alWin = ROWT.alWin(),
        ROAD = Math.atan2(0.6103, -0.7922); // ROAD：朝向路面的 rotY
      q.prism(COURT, -0.3, 0.04, '#b4b1a9', { shadow: false });
      // 棕色木板圍籬（高約 1.7 m、水泥柱，擋在米黃小棟東半前面，上面一塊白色告示，字看不清）；往東接一段較矮的淺色木圍籬到幼兒園西棟的西北角
      q.S(275.5, 50.0, 279.6, 50.0, 0.06, 0, 1.7, '#a87a50');
      for (const x of [275.5, 277.55, 279.6])
        q.B(x - 0.13, x + 0.13, 0, 1.85, 49.87, 50.13, '#c4c1b8', NC);
      q.B(278.0, 279.2, 0.75, 1.5, 49.9, 49.96, '#f4f3ee', NC);
      q.S(279.6, 50.0, 281.6, 52.2, 0.06, 0, 1.1, '#c9a070');
      // 米黃浪板小棟（單斜屋頂，東低西高，北面斜簷紅收邊、鐵窗）；它後面是青綠色貨櫃屋（平頂）
      const CR = '#e3dcc4';
      q.B(271.3, 277.8, -0.5, 2.7, 50.7, 55.1, CR);
      q.B(271.3, 274.5, 2.7, 3.68, 50.7, 55.1, CR, NC);
      q.slopeX(271.5, 4.07, 277.6, 2.3, 50.7, 55.1, 1.0, CR); // 山牆上半用斜板填滿
      q.slopeX(271.2, 4.68, 277.95, 2.72, 50.5, 55.3, 0.1, '#4a4d52');
      q.slopeX(271.25, 4.6, 277.9, 2.68, 50.6, 50.7, 0.16, '#a8483c');
      q.P(T.corr(CR, 36), 6.5, 2.7, 274.55, 1.35, 50.67, PI);
      q.P(T.corr(CR, 24), 4.4, 2.7, 277.83, 1.35, 52.9, PI / 2);
      for (const x of [276.5, 274.3])
        q.P(C.bars, 1.3, 1.0, x, 1.65, 50.63, PI, { transparent: true });
      for (const x of [276.5, 274.3]) q.P(alWin, 1.3, 1.0, x, 1.65, 50.65, PI);
      q.B(272.0, 272.9, 0, 2.05, 50.64, 50.7, '#8a8d90', NC);
      q.B(272.5, 273.1, 3.3, 3.8, 50.64, 50.7, '#5a4a44', NC);
      q.B(271.7, 278.9, -0.5, 2.9, 55.1, 61.7, '#3f9c93');
      q.B(271.6, 279.0, 2.9, 3.0, 55.1, 61.8, '#c9cbc8', NC);
      q.P(T.corr('#3f9c93', 8), 1.1, 2.9, 278.35, 1.45, 55.07, PI);
      q.P(T.corr('#3f9c93', 40), 6.6, 2.9, 278.93, 1.45, 58.4, PI / 2);
      for (const z of [57.0, 60.0]) q.P(alWin, 1.2, 1.0, 278.96, 1.7, z, PI / 2);
      // 紅頂鐵皮屋
      q.B(266.0, 271.1, -0.6, 3.5, 43.7, 55.0, '#d9cfae');
      q.B(267.3, 269.8, 3.5, 3.9, 43.7, 55.0, '#d9cfae', NC);
      q.P(T.corr('#d9cfae', 60), 11.3, 3.5, 271.13, 1.75, 49.35, PI / 2);
      q.P(T.corr('#d9cfae', 26), 5.1, 3.5, 268.55, 1.75, 43.67, PI);
      q.slopeX(265.8, 3.5, 268.55, 4.3, 43.5, 55.2, 0.1, '#b5392f');
      q.slopeX(268.55, 4.3, 271.3, 3.5, 43.5, 55.2, 0.1, '#b5392f');
      q.B(271.1, 271.2, 3.32, 3.52, 43.6, 55.1, '#b5392f', NC);
      q.B(266.0, 271.1, 0, 1.0, 43.63, 43.7, '#9a9c9e', NC);
      q.P(shutterTex('#2f5560'), 3.2, 2.7, 268.3, 1.35, 43.6, PI);
      q.slopeZ(265.8, 271.3, 41.9, 2.85, 43.7, 3.3, 0.06, '#8f9499');
      for (const x of [266.0, 271.1]) q.C(x, 42.0, 0.05, 0, 2.85, '#8f9499', { seg: 6 }); // 灰色鐵皮單斜雨庇
      for (const z of [47, 51.5]) q.P(alWin, 1.6, 1.1, 271.15, 2.0, z, PI / 2);
      for (let z = 45.6, i = 0; z < 50.4; z += 0.8, i++)
        q.bike(271.5, z, 0, bikeCols[(i * 5 + 1) % 6]);
      // 「青禾貝比幼兒園」立柱招牌（直式，垂直於路）
      q.C(271.7, 42.9, 0.11, -0.5, 8.0, '#c9ccd0', { seg: 8, col: true });
      twoFace(
        q,
        T.kgPole(),
        0.95,
        4.75,
        271.7 + 0.45 * 0.6103,
        5.5,
        42.9 - 0.45 * 0.7922,
        ROAD + PI / 2
      );
      // YY 小吃店：後面是較高的鐵皮屋（淺綠屋頂、上半米黃浪板紅收邊、北面一塊方形山牆板），前面加蓋一截白牆平頂的店面（藍鐵捲門、紅白條紋雨棚、鳳梨燈籠）
      q.B(261.2, 266.0, -0.6, 4.8, 44.9, 64, '#d9cfae');
      q.B(261.0, 266.2, 4.8, 4.92, 44.6, 64.2, '#b9cbb0', NC);
      q.B(261.1, 266.1, 3.3, 4.9, 44.75, 44.9, '#b5392f', NC);
      q.B(261.3, 265.9, 3.5, 4.7, 44.71, 44.75, '#d9cfae', NC);
      q.P(T.corr('#d9cfae', 90), 19.1, 1.4, 266.03, 4.1, 54.45, PI / 2);
      q.B(266.0, 266.08, 4.65, 4.85, 44.9, 64, '#b5392f', NC);
      q.B(261.2, 266.0, -0.6, 3.0, 39.2, 44.9, '#ecebe6');
      q.B(261.0, 266.2, 3.0, 3.12, 39.0, 44.9, '#9a9c9e', NC);
      q.P(shutterTex('#3a5f9a'), 3.5, 2.6, 263.95, 1.3, 39.15, PI);
      q.B(261.3, 262.1, 0, 2.2, 39.15, 39.2, '#8f9296', NC);
      q.B(266.0, 266.2, 1.3, 2.0, 40.6, 41.0, '#f2f2ee', NC); // 東牆上的熱水器
      for (let x = 261.4, i = 0; x < 265.79; x += 0.4, i++)
        q.B(x, x + 0.4, 2.62, 2.7, 38.1, 39.2, i % 2 ? '#f2f2ee' : '#d42a2a', NC); // 紅白條紋雨棚
      q.B(261.4, 265.8, 2.4, 2.62, 38.08, 38.12, '#d42a2a', NC);
      for (const x of [262.3, 265.2]) {
        q.blob(x, 2.1, 38.25, 0.2, 0.26, 0.2, '#e0566a');
        q.blob(x, 2.4, 38.25, 0.1, 0.1, 0.1, '#3f8a4a');
      } // 鳳梨燈籠
      q.C(263.4, 35.4, 0.07, -0.5, 2.4, '#8d9196', { seg: 6, col: true });
      twoFace(q, T.yy(), 2, 2.5, 263.4, 3.6, 35.4, ROAD + PI / 2); // YY 立牌（垂直於路，立在路邊）
      // SYM 鐵塔（格子鋼塔，頂上方形招牌），立在 YY 店面西端前面
      const TX = 262.3,
        TZ = 37.1;
      for (const [dx, dz] of [
        [-0.5, -0.5],
        [0.5, -0.5],
        [-0.5, 0.5],
        [0.5, 0.5],
      ])
        q.B(
          TX + dx - 0.05,
          TX + dx + 0.05,
          -0.5,
          8.0,
          TZ + dz - 0.05,
          TZ + dz + 0.05,
          '#8d9196',
          NC
        );
      for (let y = 1.2; y < 8.1; y += 1.35) {
        for (const d of [-0.5, 0.5]) {
          q.B(TX - 0.5, TX + 0.5, y, y + 0.05, TZ + d - 0.03, TZ + d + 0.03, '#8d9196', NC);
          q.B(TX + d - 0.03, TX + d + 0.03, y, y + 0.05, TZ - 0.5, TZ + 0.5, '#8d9196', NC);
        }
      }
      q.line(TX - 0.5, TZ - 0.5, TX + 0.5, TZ - 0.5, 0, 3);
      q.line(TX + 0.5, TZ - 0.5, TX + 0.5, TZ + 0.5, 0, 3);
      q.line(TX + 0.5, TZ + 0.5, TX - 0.5, TZ + 0.5, 0, 3);
      q.line(TX - 0.5, TZ + 0.5, TX - 0.5, TZ - 0.5, 0, 3);
      twoFace(q, T.symTop(), 2.2, 2.75, TX, 8.6, TZ, ROAD + PI / 2, 0.4);
      for (const [x, z] of [
        [266.9, 38.6],
        [268.6, 39.8],
      ])
        q.k.I.addCone(x, z); // 橘色三角錐
    }
    {
      // S8、S9：SYM 機車行、前庭的機車、490 巷東側綠籬、電桿與路牌
      const q = WK(332, 12, -1),
        band = T.band();
      q.B(248.3, 260.8, -0.6, 5.2, 36.9, 54, '#cfd0cf');
      q.B(248.1, 261.0, 5.2, 5.3, 37.0, 54.2, '#b9cbb0', NC);
      q.P(T.corr('#b9cbb0', 80), 17.1, 5.2, 248.27, 2.6, 45.45, -PI / 2);
      q.P(T.corr('#b9cbb0', 80), 17.1, 5.2, 260.83, 2.6, 45.45, PI / 2);
      q.P(T.corr('#b9cbb0', 60), 12.5, 0.3, 254.55, 5.06, 36.87, PI); // 側牆是淺綠浪板
      q.B(260.8, 260.87, 0, 3.4, 36.9, 39.2, '#eeeeea', NC);
      q.P(band, 1.4, 1.7, 260.89, 1.75, 38.05, PI / 2); // 東牆靠門面那一截是白牆與深色窗
      q.B(248.3, 260.8, 3.5, 4.95, 36.72, 36.9, '#d8232a', NC);
      q.P(T.symBand(), 12.4, 1.3, 254.55, 4.22, 36.7, PI, { emissive: 0.35 });
      // 一樓：兩根紅柱之間是敞開的展示間，東端是深色玻璃窗，西端是灰牆與小門；招牌帶下面一條白色門楣
      q.P(openTex, 7.3, 3.0, 254.85, 1.5, 36.87, PI, { emissive: 0.3 });
      for (const x of [250.5, 258.5]) {
        q.B(x, x + 0.7, 0, 3.1, 36.76, 36.9, '#d8232a', NC);
        q.P(
          paint('S\nY\nM', '#d8232a', '#ffffff', null, 0.6, 2.2),
          0.6,
          2.2,
          x + 0.35,
          1.8,
          36.74,
          PI,
          { emissive: 0.25 }
        );
      }
      q.B(248.3, 260.8, 3.1, 3.5, 36.8, 36.9, '#eeeeea', NC);
      q.P(band, 1.5, 2.2, 260.0, 1.6, 36.87, PI);
      q.B(249.0, 249.9, 0, 2.1, 36.86, 36.9, '#5a5e62', NC);
      q.B(253.6, 257.0, 2.75, 3.4, 36.74, 36.8, '#2a5fb8', NC);
      q.P(
        paint('6,000元', '#2a5fb8', '#ffffff', null, 2.2, 0.5),
        2.2,
        0.5,
        255.6,
        3.08,
        36.72,
        PI,
        { emissive: 0.15 }
      ); // 藍色促銷橫幅（只有這幾個字看得清）
      q.B(255.6, 256.5, 5.3, 5.9, 44.5, 45.0, '#e4e1d8', NC); // 屋頂的冷氣室外機
      for (let x = 249.6, i = 0; x < 260.4; x += 0.72, i++)
        q.bike(x, 35.0, 1, bikeCols[(i * 5 + 2) % 6]);
      for (let x = 252.4, i = 0; x < 259.6; x += 0.72, i++)
        if (i % 5 !== 3) q.bike(x, 32.6, 1, bikeCols[(i * 3 + 1) % 6]);
      for (const [x, z] of [
        [251.2, 31.8],
        [259.9, 33.6],
      ])
        q.k.I.addCone(x, z);
      // 綠籬花台、電線桿（黃黑斜紋）、「新中北路490巷」路牌
      q.B(248.7, 250.3, -0.3, 0.35, 27.3, 34.3, '#a3a19b');
      q.B(248.85, 250.15, 0.35, 1.7, 27.45, 34.15, '#3f7a3a');
      for (let z = 28, i = 0; z < 34.2; z += 1.5, i++)
        q.blob(249.5 + (i % 2 ? 0.15 : -0.15), 1.75, z, 0.95, 0.6, 1.0, GREEN[i % 4]);
      q.C(251.0, 26.0, 0.16, -0.5, 9, '#a9a7a0', { seg: 8, col: true });
      for (let i = 0; i < 4; i++)
        q.C(251.0, 26.0, 0.165, 0.5 + i * 0.3, 0.65 + i * 0.3, i % 2 ? '#1e1e1e' : '#e8c02a', {
          seg: 8,
        });
      twoFace(
        q,
        paint('新\n中\n北\n路\n490\n巷', '#1f7a4a', '#ffffff', null, 0.36, 1.9),
        0.36,
        1.9,
        251.0,
        3.5,
        26.0 - 0.36,
        PI / 2,
        0.2
      ); // 直式綠底路牌
    }
    {
      // S11：西南轉角 2 樓（五邊形，2 樓一整圈深色帶狀窗）＋「撞球」立柱招牌
      const q = WK(350, 12, -1),
        H2 = 8.0,
        band = T.band(),
        lou = shutterTex('#b9b3a6');
      q.prism(CORNER, -0.6, H2, '#ececea');
      q.prism(CORNER, H2, H2 + 0.25, '#d0d0cc', { inset: -0.12 });
      CORNER.forEach((a, i) => {
        const b = CORNER[(i + 1) % CORNER.length];
        q.line(a[0], a[1], b[0], b[1], 0, H2);
      });
      // 2 樓大片深色窗（3.9～7.0 m，東面 4 組、東北斜面 1 組，組與組之間是白色窗間柱），1 樓靠轉角是米灰色百葉
      for (const z of [24.95, 27.75, 30.55, 33.35]) q.P(band, 2.4, 3.1, 242.54, 5.45, z, PI / 2);
      q.P(lou, 5.2, 2.5, 242.54, 1.45, 26.2, PI / 2);
      const NE = Math.atan2(0.632, -0.775);
      q.P(band, 4.2, 3.1, 240.6 + 0.632 * 0.04, 5.45, 21.85 - 0.775 * 0.04, NE);
      q.P(lou, 4.2, 2.5, 240.6 + 0.632 * 0.04, 1.45, 21.85 - 0.775 * 0.04, NE);
      const NW = Math.atan2(-0.733, -0.68); // 西北面（四八六食堂屋頂上方露出來的 2 樓窗）
      for (const t of [0.27, 0.7])
        q.P(band, 2.6, 3.1, 238.7 - 6.3 * t - 0.733 * 0.04, 5.45, 20.3 + 6.8 * t - 0.68 * 0.04, NW);
      // 立柱：最上面紅底「撞球」，下面藍底直式（只有 9 號球圖案）
      const AL = Math.atan2(-0.7141, -0.7);
      q.C(239.75, 19.2, 0.12, -0.5, 11, '#c9ccd0', { seg: 8, col: true });
      twoFace(
        q,
        paint('撞球', '#d8232a', '#ffffff', null, 1.6, 1.2),
        1.6,
        1.2,
        239.75,
        10.3,
        19.2,
        AL,
        0.35
      );
      twoFace(q, T.ball(), 1.0, 3.5, 239.75, 7.7, 19.2, AL, 0.3);
    }
    {
      // S12：四八六食堂（單層、上面大看板、綠雨棚、白色格子門、木平台與黑欄杆）
      const k = st(353.7, 359, -1, 7.5),
        w = k.W;
      k.box(0, w, -0.6, 3.0, 0, 15, '#e9e6df');
      k.box(-0.08, w + 0.08, 3.0, 3.12, 0, 15.1, '#f2f1ec', NC);
      k.box(0, w, 3.0, 5.5, 0, 0.16, '#2a2a2a', NC);
      k.plane(T.b486(), w - 0.1, 2.4, w / 2, 4.27, -0.02, FRONT, { emissive: 0.3 });
      for (const x of [0.5, w - 0.5]) k.box(x - 0.04, x + 0.04, 3.1, 5.2, 0.16, 1.6, '#4a4d50', NC);
      slopeZ(k, -0.05, w + 0.05, -1.15, 2.5, 0, 3.0, 0.06, '#2f9e7a');
      k.box(-0.05, w + 0.05, 2.3, 2.52, -1.17, -1.13, '#2f9e7a', NC);
      for (let x = 0.1; x < w - 0.2; x += 0.5)
        k.box(x, x + 0.3, 2.22, 2.3, -1.17, -1.13, '#2f9e7a', NC); // 雨棚下緣的波浪邊
      k.plane(T.lattice(), w - 0.4, 2.2, w / 2, 1.3, -0.02, FRONT, { emissive: 0.25 });
      k.box(0.15, w - 0.15, -0.3, 0.2, -1.0, 0, '#8a6a48', NC);
      for (const [x0, x1] of [
        [0.15, 1.9],
        [3.4, w - 0.15],
      ]) {
        k.box(x0, x1, 0.95, 1.0, -1.0, -0.96, '#1e1e1f', NC);
        for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4)
          k.box(x - 0.02, x + 0.02, 0.2, 1.0, -1.0, -0.96, '#1e1e1f', NC);
      }
      for (const x of [0.5, w - 0.6]) {
        k.box(x - 0.2, x + 0.2, 0.2, 0.55, -0.9, -0.5, '#6a5a4a', NC);
        k.box(x - 0.25, x + 0.25, 0.55, 1.1, -0.95, -0.45, '#4c7d3a', NC);
      }
      k.box(0, w, -0.5, 0.04, -2.6, 0, MR.concrete, NC);
      k.cyl(w + 0.3, -1.6, 0.08, -0.5, 4.0, '#5a4634', { seg: 6, col: true }); // 店前與轉角樓之間的小樹
      for (const [dx, dy, rad] of [
        [0, 0, 0.75],
        [0.3, 0.7, 0.6],
        [-0.25, 0.9, 0.55],
      ]) {
        const g = new THREE.SphereGeometry(rad, 7, 5);
        g.translate(w + 0.3 + dx, 4.3 + dy, -1.6);
        addG(k, g, GREEN[(r() * 4) | 0]);
      }
    }
    {
      // S13：米色鐵捲門店（米黃浪板斜屋頂朝街道斜下，沒有招牌）
      const k = st(359, 362.4, -1, 7.6),
        w = k.W;
      k.box(0, w, -0.6, 3.0, 0, 10, '#d6ccb0');
      k.box(0, w, 3.0, 3.5, 1.6, 10, '#d6ccb0', NC);
      k.plane(shutterTex('#c9bfa8'), w - 0.3, 2.7, w / 2, 1.35, -0.02, FRONT);
      slopeZ(k, -0.1, w + 0.1, -0.7, 2.95, 5, 4.1, 0.08, '#d9cfae');
      k.box(-0.1, w + 0.1, 3.5, 3.6, 5, 10.1, '#d9cfae', NC);
      k.plane(T.disc('#8a5a34'), 0.5, 0.5, w - 0.45, 2.2, -0.06, FRONT, { transparent: true }); // 東端的圓形木牌（字看不清）
      k.plane(T.disc('#f4f2ea'), 0.7, 0.7, 0.5, 2.3, -0.06, FRONT, { transparent: true });
      k.plane(T.disc('#8a2a2a'), 0.26, 0.26, 0.5, 2.3, -0.07, FRONT, { transparent: true }); // 西端的白底圓牌（紅字看不清，只點一個紅色色塊）
      k.box(0, w, -0.5, 0.04, -2.7, 0, MR.concrete, NC);
    }
    {
      // S14：吐司小店（開放式吧檯，屋頂深灰底世界地圖布條與黑色圓招牌「toast&forest 土司森林．手作輕食」）
      const k = st(362.4, 365.8, -1, 7.6),
        w = k.W;
      k.box(0, w, -0.6, 2.8, 0, 8, '#eceae4');
      k.box(-0.08, w + 0.08, 2.8, 2.9, -0.3, 8.1, '#d8d6cf', NC);
      k.plane(openTex, w - 0.6, 1.5, w / 2, 1.85, -0.02, FRONT, { emissive: 0.3 });
      k.box(0.3, w - 0.3, 0, 1.05, -0.5, 0, '#f2f1ec', NC);
      k.box(0.25, w - 0.25, 1.05, 1.1, -0.6, 0.02, '#2b2b2b', NC);
      k.plane(T.map(), w - 0.9, 1.3, w / 2 - 0.35, 3.55, 0.1, FRONT, {
        double: true,
        emissive: 0.1,
      });
      for (const x of [0.2, w - 1.0])
        k.box(x - 0.03, x + 0.03, 2.9, 4.2, 0.12, 0.18, '#4a4d50', NC);
      k.box(w - 0.75, w - 0.69, 2.9, 5.0, 0.0, 0.06, '#4a4d50', NC); // 東端的鋼架與黑色圓招牌
      k.plane(T.tf(), 1.6, 1.6, w - 0.75, 4.3, -0.05, FRONT, { transparent: true, emissive: 0.25 });
      k.plane(T.disc('#151c2a'), 1.6, 1.6, w - 0.75, 4.3, -0.03, 0, { transparent: true });
      k.box(0, w, -0.5, 0.04, -2.7, 0, MR.concrete, NC);
    }
    {
      // S15：初樂 板烤吐司（白底招牌、藍灰色鐵捲門）
      const k = st(365.8, 370.2, -1, 7.6),
        w = k.W;
      k.box(0, w, -0.6, 3.3, 0, 9, '#e4e2dc');
      k.box(-0.08, w + 0.08, 3.3, 3.4, 0.02, 9.1, '#b7bcbf', NC);
      k.box(0, w, 2.9, 4.2, -0.2, 0, '#f6f4ee', NC);
      k.plane(T.chule(), w - 0.1, 1.2, w / 2, 3.55, -0.21, FRONT, { emissive: 0.3 });
      k.plane(shutterTex('#3f6f9f'), w - 0.4, 2.7, w / 2, 1.35, -0.02, FRONT);
      for (const x of [w / 2 - 0.6, w / 2 + 0.6])
        k.box(x - 0.05, x + 0.05, 3.4, 7.2, 1.0, 1.1, '#4a4d50', NC); // 招牌後面的空鋼架
      k.box(w / 2 - 0.65, w / 2 + 0.65, 7.1, 7.2, 1.0, 1.1, '#4a4d50', NC);
      k.box(0, w, -0.5, 0.04, -2.7, 0, MR.concrete, NC);
    }
  },

  footprints(F) {
    const rect = (x0, x1, z0, z1) => [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ];
    return [
      [
        [260.2, SHED_Z0],
        [278.2, SHED_Z0],
        [278.2, 24.1],
        [272.2, 24.1],
        [272.2, 18.6],
        [266.2, 18.6],
        [266.2, 13.1],
        [260.2, 13.1],
      ],
      PAVE, // 機車棚南端、米色鋪面
      F(R, 250.3, 265.9, -1, 5.3, 2.6),
      rect(311.0, 315.2, 66.5, 78.6), // 停車場沿路的欄杆、深灰浪板小棚
      PLAY,
      rect(279.7, 291.2, 51.9, 79.9),
      [
        [275.4, 49.85],
        [279.7, 49.85],
        [281.7, 52.1],
        [281.5, 52.3],
        [279.5, 50.15],
        [275.4, 50.15],
      ],
      rect(281.3, 315.6, 79.4, 88.8), // 幼兒園遊戲場、西棟（含披簷與西側披棚）、木圍籬、南棟
      COURT,
      rect(271.0, 279.1, 50.4, 61.9), // 水泥前庭、米黃單斜頂小棟、青綠貨櫃屋
      rect(265.8, 271.3, 43.5, 55.2),
      rect(261.0, 266.2, 38.1, 64.2), // 紅頂鐵皮屋、YY 小吃店（含前面加蓋的店面與雨棚）
      rect(248.1, 261.0, 36.9, 54.2),
      rect(248.7, 250.3, 27.3, 34.3), // SYM 機車行、綠籬花台
      CORNER, // 西南轉角樓
      F(R, 353.7, 359, -1, 7.5, 15, 2.6),
      F(R, 359, 362.4, -1, 7.6, 10, 2.7),
      F(R, 362.4, 365.8, -1, 7.6, 8, 2.7),
      F(R, 365.8, 370.2, -1, 7.6, 9, 2.7),
    ];
  },
};
