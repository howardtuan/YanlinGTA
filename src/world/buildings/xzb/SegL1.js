// 新中北路469巷 s 0～150（新中北路巷口往北，東側緊鄰校園；照 Google 街景 2026-05、國土測繪 2024 正射建模）
// 這段幾乎沒有街屋：
//   東側（+1）由南到北：中原大學機車停車棚（s 12～93，鋼構平頂、屋頂鋪滿太陽能板，s 23～26.3「機車入口」、s 71.8～75 出口「禁止進入」）、
//                       台電配電箱平台（s 88～92，在棚子北端的缺角裡）、矮浪板圍籬與後面的菜園、樹林（s 92～150）
//   西側（-1）由南到北：巷口露天停車場的黑欄杆（s 12～24）、木格柵與橘磚小屋（s 29～33）、灰浪板圍牆與大樹（s 33～41.6，牆後 3 座水塔）、
//                       灰綠鐵皮棚（s 41.6～55.8）、棚子後面斜放的灰藍 4 樓透天（東角在 s 54.1、離中心線 9.1）與它臨路的一樓白鐵捲門車庫、門柱門牆（s 57.5～64）、
//                       「海耶」餐酒館（s 64～78）、水泥車道（s 80～85.5，裡面斜放的一樓鐵皮店與 4 樓公寓）、雜草空地與樹林（s 85.5～150）
// 巷口 s<12（參考線斜的那一小段）與面向新中北路的房子歸 SegX1.js；機車棚繞過巷口沿新中北路往東南的那一段也歸 SegX1.js。
// custom 的座標一律用（s, off）＝（沿參考線 'L' 的里程, 離道路中心線的距離）；機車棚另外用自己的座標（見 SHED）。
const REF = 'L';
// 機車棚：正射量到的棚子是正南北向略偏（往北每 80 m 往東偏 1 m），與道路中心線不平行（南端離中心線 4.8、北端 7.6），
// 所以用自己的座標：原點在西南角簷口 (260.2, 6.5)，+x 往北（沿棚子），+z 往東（往校園裡）
const SHED = { x: 260.2, z: 6.5, t: 0.0122, len: [74, 78, 81, 81], d: 24, eave: 3.1 };
const shedPt = (xl, zl) => [
  SHED.x + xl * Math.sin(SHED.t) + zl * Math.cos(SHED.t),
  SHED.z - xl * Math.cos(SHED.t) + zl * Math.sin(SHED.t),
];

export default {
  // 東側 f643～f648（各標 5 樓）與後排 f671～f674（4～5 樓，壓在棚子東半）實景是機車棚；f635～f642、後排 f686、f670 實景是矮圍籬後的菜園與樹林
  // 西側 f768 是露天停車場、f767～f764 是鐵皮圍牆與鐵皮棚、f763 是透天與海耶的位置，後排 f769、f770 是鐵皮屋頂與空地
  drop: [
    'f643',
    'f644',
    'f645',
    'f646',
    'f647',
    'f648',
    'f635',
    'f636',
    'f637',
    'f638',
    'f639',
    'f640',
    'f641',
    'f642',
    'f686',
    'f670',
    'f671',
    'f672',
    'f673',
    'f674',
    'f768',
    'f767',
    'f766',
    'f765',
    'f764',
    'f763',
    'f769',
    'f770',
  ],
  ownSign: [],
  // 這段沒有正對巷子的街屋：灰藍 4 樓透天是斜的而且退在後面（街景三個拍攝點交會＋2024 正射屋頂），臨路只有它的一樓車庫，全部在 custom
  lots: [],

  custom(C) {
    const { THREE, VC, lcg, sg, paintGeo, bike, bikeCols, ROWT, YHT, shutterTex, bars } = C;
    const PI = Math.PI,
      NC = { col: false },
      TILE = { tile: [0.6, 0.6] };
    const fnt = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    // 開一個 Kit，回傳用（s, off）座標下指令的工具
    const open = (side, s0, s1, set) => {
      const k = C.kit(REF, s0, s1, side, set);
      if (typeof k.w !== 'function') delete k.w; // C.kit 把寬度寫進 k.w 會蓋掉 Kit.w()（box 的碰撞要用），拿掉讓原型方法回來
      const X = (s) => (side > 0 ? s - s0 : s1 - s),
        Z = (o) => o - set;
      const ROT = { st: PI, bk: 0, n: side > 0 ? PI / 2 : -PI / 2, s: side > 0 ? -PI / 2 : PI / 2 };
      const q = { k, side, s0, s1, set, X, Z };
      q.B = (sa, sb, y0, y1, oa, ob, mat, o) => {
        const a = X(sa),
          b = X(sb);
        return k.box(Math.min(a, b), Math.max(a, b), y0, y1, oa - set, ob - set, mat, o);
      };
      q.P = (tex, w, h, s, y, off, face = 'st', o) =>
        k.plane(tex, w, h, X(s), y, off - set, ROT[face], o); // face：st 對街、bk 背街、n 朝北、s 朝南
      q.C = (s, off, r, y0, y1, mat, o) => k.cyl(X(s), off - set, r, y0, y1, mat, o);
      q.line = (sa, oa, sb, ob, y0, y1) => k.wallLine(X(sa), oa - set, X(sb), ob - set, y0, y1);
      return q;
    };
    // ---- 幾何小工具 ----
    const blobK = (k, x, y, z, rx, ry, rz, hex) => {
      const g = new THREE.SphereGeometry(1, 7, 5);
      g.scale(rx, ry, rz);
      g.translate(x, y, z);
      k._part(VC, paintGeo(g, hex));
    };
    const blob = (q, s, off, y, rs, ry, ro, hex) =>
      blobK(q.k, q.X(s), y, q.Z(off), rs, ry, ro, hex);
    const GREEN = ['#3f7a3a', '#4b8a3e', '#356b34', '#5a8f45'];
    const tree = (q, s, off, h, r, rnd, cols = GREEN) => {
      q.C(s, off, 0.12 + r * 0.05, -1.5, h, '#6a4a30', { seg: 6, col: true });
      for (const [ds, dy, dz, f] of [
        [0, 0.5, 0, 1],
        [-0.7, -0.5, 0.35, 0.8],
        [0.75, -0.3, -0.3, 0.85],
      ])
        blob(
          q,
          s + ds * r,
          off + dz * r,
          h + dy * r,
          r * f,
          r * f * 0.8,
          r * f,
          cols[(rnd() * cols.length) | 0]
        );
    };
    // 雨豆樹：樹幹粗、樹冠又寬又扁，伸到路面上方
    const rainTree = (q, s, off, rnd, lean = 0) => {
      // lean：樹冠整個往南（負）或往北偏幾公尺
      q.C(s, off, 0.36, -1.5, 3.2, '#5a4634', { seg: 8, col: true, r1: 0.28 });
      q.C(s, off, 0.28, 3.2, 5.6, '#5a4634', { seg: 8, r1: 0.12 });
      for (const [ds, dy, dz, f] of [
        [0, 1.2, 0.5, 1],
        [-2.9, 0.1, 1.2, 0.75],
        [3.0, 0.3, 0.8, 0.8],
        [0.3, 0.2, -2.6, 0.72],
        [0.2, 0.2, 3.6, 0.7],
      ])
        blob(
          q,
          s + ds + lean,
          off + dz,
          6.4 + dy,
          4.2 * f,
          2.2 * f,
          4.2 * f,
          GREEN[(rnd() * 4) | 0]
        );
    };
    const palm = (q, s, off, h) => {
      q.C(s, off, 0.16, -1.5, h, '#8a7a62', { seg: 6 });
      for (let i = 0; i < 6; i++) {
        const a = (i * PI) / 3;
        blob(
          q,
          s + Math.cos(a) * 1.3,
          off + Math.sin(a) * 1.3,
          h - 0.25,
          0.45 + 1.05 * Math.abs(Math.cos(a)),
          0.22,
          0.45 + 1.05 * Math.abs(Math.sin(a)),
          '#4c8440'
        );
      }
      blob(q, s, off, h + 0.3, 0.9, 0.7, 0.9, '#5a9248');
    };
    // 斜頂／斜底的方塊：x0、x1 兩端各有自己的底高與頂高（蝴蝶屋頂與屋頂下的牆）
    const wedge = (k, x0, x1, z0, z1, yb0, yb1, yt0, yt1, hex) => {
      const g = new THREE.BoxGeometry(x1 - x0, 1, z1 - z0),
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const lo = p.getX(i) < 0;
        p.setY(i, p.getY(i) > 0 ? (lo ? yt0 : yt1) : lo ? yb0 : yb1);
      }
      g.computeVertexNormals();
      g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      k._part(VC, paintGeo(g, hex));
    };
    const carK = (k, x, z, alongX, hex) => {
      // 停著的車（方盒）
      const [dx, dz] = alongX ? [4.2, 1.75] : [1.75, 4.2];
      k.box(x, x + dx, 0.28, 0.9, z, z + dz, hex);
      if (alongX) k.box(x + 0.9, x + 3.2, 0.9, 1.42, z + 0.12, z + dz - 0.12, '#27303a', NC);
      else k.box(x + 0.12, x + dx - 0.12, 0.9, 1.42, z + 0.9, z + 3.2, '#27303a', NC);
      for (const [a, b] of [
        [0.12, 0.12],
        [0.88, 0.12],
        [0.12, 0.88],
        [0.88, 0.88],
      ])
        k.box(
          x + dx * a - 0.3,
          x + dx * a + 0.3,
          -0.1,
          0.55,
          z + dz * b - 0.3,
          z + dz * b + 0.3,
          '#1c1c1e',
          NC
        );
    };
    const pole = (q, s, off, h = 9, stripe = '#d8b02a') => {
      // 水泥電桿，底部斜紋警示帶
      q.C(s, off, 0.15, -1.5, h, '#a9a79f', { seg: 8, col: true });
      for (let i = 0; i < 4; i++)
        q.C(s, off, 0.16, 0.3 + i * 0.3, 0.45 + i * 0.3, i % 2 ? '#1c1c1e' : stripe, { seg: 8 });
      q.B(s - 0.9, s + 0.9, h - 0.9, h - 0.8, off - 0.05, off + 0.05, '#8a8d90', NC);
    };
    // ---- 貼圖 ----
    const T = {
      corr: (hex, n) =>
        sg(`xzL1corr${hex}${n}`, 512, 32, (g) => {
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
      mesh: () =>
        sg('xzL1mesh', 256, 128, (g) => {
          // 綠色鋼管框＋菱形網
          g.clearRect(0, 0, 256, 128);
          g.strokeStyle = 'rgba(79,143,106,.8)';
          g.lineWidth = 1.3;
          for (let i = -128; i < 256; i += 10) {
            g.beginPath();
            g.moveTo(i, 0);
            g.lineTo(i + 128, 128);
            g.stroke();
            g.beginPath();
            g.moveTo(i + 128, 0);
            g.lineTo(i, 128);
            g.stroke();
          }
          g.fillStyle = '#4f8f6a';
          g.fillRect(0, 0, 256, 5);
          g.fillRect(0, 123, 256, 5);
          for (const x of [0, 126, 251]) g.fillRect(x, 0, 5, 128);
        }),
      rail: (hex) =>
        sg(`xzL1rail${hex}`, 256, 64, (g) => {
          // 鋼管護欄：上下兩道橫桿＋立柱
          g.clearRect(0, 0, 256, 64);
          g.fillStyle = hex;
          g.fillRect(0, 2, 256, 6);
          g.fillRect(0, 30, 256, 6);
          for (const x of [0, 125, 250]) g.fillRect(x, 0, 6, 64);
        }),
      // 機車棚簷下的白底橫牌：兩端各一個紅色圖案（arrow 箭頭／stop 禁止進入），中間黑字、下面英文小字
      board: (text, sub, kind) =>
        sg(`xzL1board${text}`, 512, 128, (g) => {
          g.fillStyle = '#f4f4f0';
          g.fillRect(0, 0, 512, 128);
          g.strokeStyle = '#8f9499';
          g.lineWidth = 4;
          g.strokeRect(2, 2, 508, 124);
          for (const [cx, dir] of [
            [52, -1],
            [460, 1],
          ]) {
            g.fillStyle = '#d8232a';
            if (kind === 'stop') {
              g.beginPath();
              g.arc(cx, 58, 34, 0, 7);
              g.fill();
              g.fillStyle = '#ffffff';
              g.fillRect(cx - 24, 51, 48, 14);
            } else {
              g.beginPath();
              g.moveTo(cx - 30 * dir, 30);
              g.lineTo(cx + 8 * dir, 30);
              g.lineTo(cx + 8 * dir, 12);
              g.lineTo(cx + 38 * dir, 46);
              g.lineTo(cx + 8 * dir, 80);
              g.lineTo(cx + 8 * dir, 62);
              g.lineTo(cx - 30 * dir, 62);
              g.closePath();
              g.fill();
            }
          }
          g.fillStyle = '#1a1a1a';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.font = fnt(70);
          g.fillText(text, 256, 50);
          g.font = fnt(24, 700);
          g.fillText(sub, 256, 104);
        }),
      glassRail: () =>
        sg('xzL1glassRail', 256, 64, (g) => {
          // 玻璃欄杆：深色框、綠灰玻璃
          g.clearRect(0, 0, 256, 64);
          g.fillStyle = 'rgba(120,150,140,.55)';
          g.fillRect(0, 0, 256, 64);
          g.fillStyle = 'rgba(255,255,255,.18)';
          g.fillRect(10, 6, 40, 52);
          g.fillRect(138, 6, 40, 52);
          g.fillStyle = '#2a302e';
          g.fillRect(0, 0, 256, 5);
          g.fillRect(0, 59, 256, 5);
          for (const x of [0, 126, 251]) g.fillRect(x, 0, 5, 64);
        }),
      dark: () =>
        sg('xzL1dark', 128, 64, (g) => {
          // 黑框落地玻璃
          const gr = g.createLinearGradient(0, 0, 0, 64);
          gr.addColorStop(0, '#4a565e');
          gr.addColorStop(1, '#232a2e');
          g.fillStyle = gr;
          g.fillRect(0, 0, 128, 64);
          g.fillStyle = '#1c1c1e';
          for (const x of [0, 41, 83, 124]) g.fillRect(x, 0, 4, 64);
          g.fillRect(0, 0, 128, 3);
          g.fillRect(0, 61, 128, 3);
          g.fillStyle = 'rgba(255,255,255,.12)';
          g.fillRect(8, 5, 14, 54);
        }),
      shutter2: () =>
        sg('xzL1shutter2', 64, 96, (g) => {
          // 海耶的白色鐵捲門，下面三分之一是灰色
          g.fillStyle = '#f0f0ec';
          g.fillRect(0, 0, 64, 96);
          g.fillStyle = '#9a9c9e';
          g.fillRect(0, 64, 64, 32);
          for (let y = 0; y < 96; y += 6) {
            g.fillStyle = 'rgba(255,255,255,.3)';
            g.fillRect(0, y, 64, 2);
            g.fillStyle = 'rgba(0,0,0,.14)';
            g.fillRect(0, y + 4, 64, 2);
          }
        }),
      stone: () =>
        sg('xzL1stone', 128, 128, (g) => {
          // 文化石：灰色亂石、深勾縫
          g.fillStyle = '#7b7973';
          g.fillRect(0, 0, 128, 128);
          const r = lcg(613);
          for (let y = 0; y < 128; y += 10)
            for (let x = -8 + ((y / 10) % 2) * 9; x < 128; x += 16 + r() * 10) {
              const v = 146 + r() * 44;
              g.fillStyle = `rgb(${v | 0},${(v - 3) | 0},${(v - 10) | 0})`;
              g.fillRect(x + 1, y + 1, 13 + r() * 10, 8);
            }
        }),
      posters: () =>
        sg('xzL1posters', 256, 128, (g) => {
          // 鐵皮棚門上的彩色海報（字看不清，只畫色塊）
          g.clearRect(0, 0, 256, 128);
          const cols = ['#d8b02a', '#c8322c', '#2f6db3', '#e8e6dc', '#3f7a4c'];
          for (let i = 0; i < 5; i++) {
            g.fillStyle = cols[i];
            g.fillRect(10 + i * 49, 20 + (i % 2) * 18, 40, 56);
            g.fillStyle = 'rgba(255,255,255,.55)';
            g.fillRect(15 + i * 49, 28 + (i % 2) * 18, 30, 8);
            g.fillRect(15 + i * 49, 44 + (i % 2) * 18, 22, 5);
          }
        }),
      lattice: () =>
        sg('xzL1lattice', 128, 64, (g) => {
          // 木格柵圍籬（灰色鐵框）
          g.fillStyle = '#7a5a44';
          g.fillRect(0, 0, 128, 64);
          g.strokeStyle = 'rgba(40,24,14,.7)';
          g.lineWidth = 3;
          for (let i = -64; i < 128; i += 12) {
            g.beginPath();
            g.moveTo(i, 0);
            g.lineTo(i + 64, 64);
            g.stroke();
            g.beginPath();
            g.moveTo(i + 64, 0);
            g.lineTo(i, 64);
            g.stroke();
          }
          g.fillStyle = '#8d9196';
          g.fillRect(0, 0, 128, 4);
          g.fillRect(0, 60, 128, 4);
          g.fillRect(0, 0, 4, 64);
          g.fillRect(124, 0, 4, 64);
        }),
      haiye: () =>
        sg('xzL1haiye2', 192, 288, (g) => {
          // 「海耶」立牌：白底黑色書法字，兩個字直排、斜錯開
          g.fillStyle = '#f2f2ee';
          g.fillRect(0, 0, 192, 288);
          g.fillStyle = '#1a1a1a';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.font = '900 104px "Noto Serif TC","Songti TC","PMingLiU",serif';
          g.fillText('海', 78, 88);
          g.fillText('耶', 116, 200);
        }),
      noPark: () =>
        sg('xzL1noPark', 64, 64, (g) => {
          // 禁止停車圓牌（只有圖案，沒有字）
          g.clearRect(0, 0, 64, 64);
          g.fillStyle = '#d8232a';
          g.beginPath();
          g.arc(32, 32, 31, 0, 7);
          g.fill();
          g.fillStyle = '#2456a8';
          g.beginPath();
          g.arc(32, 32, 23, 0, 7);
          g.fill();
          g.strokeStyle = '#d8232a';
          g.lineWidth = 7;
          g.beginPath();
          g.moveTo(15, 15);
          g.lineTo(49, 49);
          g.stroke();
        }),
    };
    const alWin = ROWT.alWin(),
      grWin = YHT.win();
    const noPark = (q, s, off, y = 2.6) => {
      for (const f of ['n', 's'])
        q.P(T.noPark(), 0.6, 0.6, s + (f === 'n' ? 0.17 : -0.17), y, off, f, { transparent: true });
    };

    // =====================================================================================
    // 東側
    // =====================================================================================
    // ---- E1 s12–93：中原大學機車停車棚 ----
    {
      const k = C.kit(REF, 12, 92, 1, 4.8);
      delete k.w;
      // 把 Kit 轉成棚子自己的方向（正射量到的棚子與道路中心線不平行）
      const ang = Math.atan2(-Math.cos(SHED.t), Math.sin(SHED.t));
      k.ox = SHED.x;
      k.oz = SHED.z;
      k.ang = ang;
      k.c = Math.cos(ang);
      k.s = Math.sin(ang);
      k.group.position.x = SHED.x;
      k.group.position.z = SHED.z;
      k.group.rotation.y = -ang;
      const r = lcg(4691),
        EV = SHED.eave,
        STEEL = '#a3a5a4',
        EDGE = '#96989a',
        LEN = SHED.len,
        FULL = LEN[3];
      const lenAt = (z) => LEN[Math.min(3, Math.max(0, Math.floor(z / 6)))];
      const IN = [10.85, 14.1],
        OUT = [59.6, 62.85],
        BAY = 3.25; // 入口、出口各佔一個柱距（棚子座標的 x；s ≈ x + 12.2）
      const lane = (x, m) => (x > IN[0] - m && x < IN[1] + m) || (x > OUT[0] - m && x < OUT[1] + m);
      // 地面往北慢慢低下去（s 40 以南幾乎是平的，s 40～72 降 0.65 m，再往北又緩），整座棚子蓋完後照 DY 把頂點往下移才不會浮空；
      // 跨過轉折點（KN）的長方塊先在轉折點切開，移完才會貼著折線
      const KN = [28, 60],
        DY = (x) =>
          x <= 28 ? 0.03 : x <= 60 ? 0.03 - (0.65 * (x - 28)) / 32 : -0.62 - (0.1 * (x - 60)) / 21,
        kb0 = k.box;
      k.box = (x0, x1, ...rest) => {
        let a = x0,
          g;
        for (const b of [...KN.filter((v) => v > x0 + 0.01 && v < x1 - 0.01), x1]) {
          g = kb0(a, b, ...rest);
          a = b;
        }
        return g;
      };
      // 水泥地坪
      k.box(0, LEN[0], -1.6, 0.1, -0.9, 6, '#b9b6ae', NC);
      k.box(0, LEN[1], -1.6, 0.1, 6, 12, '#b9b6ae', NC);
      k.box(0, FULL, -1.6, 0.1, 12, 24, '#b9b6ae', NC);
      // 棚子與道路之間的柏油帶（北端比南端寬）
      for (const [xa, xb] of [
        [0, KN[0]],
        [KN[0], KN[1]],
        [KN[1], LEN[0]],
      ]) {
        const g = new THREE.BoxGeometry(xb - xa, 0.8, 1),
          p = g.attributes.position,
          ze = (x) => -(1.0 + (2.7 * x) / LEN[0]);
        for (let i = 0; i < p.count; i++)
          p.setZ(i, p.getZ(i) > 0 ? -0.9 : ze(p.getX(i) > 0 ? xb : xa));
        g.translate((xa + xb) / 2, -0.38, 0);
        k._part(VC, paintGeo(g, '#5a5b5e'));
      }
      // （2024 正射沿棚子停了一排車，但 2026-05 街景這裡已經畫紅線、沒有車，所以不放車）
      // 屋頂：4 條南北向長條（鋼板＋太陽能板），條與條之間留白色走道縫；北端階梯狀收尾
      for (let i = 0; i < 4; i++) {
        const z0 = i * 6 + (i ? 0.12 : 0),
          z1 = i * 6 + 6 - (i < 3 ? 0.12 : 0),
          L = LEN[i];
        k.box(0, L, EV, EV + 0.1, z0, z1, EDGE, NC);
        k.box(0.3, L - 0.3, EV + 0.1, EV + 0.16, z0 + 0.25, z1 - 0.25, '#1f2a44', NC);
        for (let x = 4.3; x < L - 1; x += 4)
          k.box(x, x + 0.06, EV + 0.1, EV + 0.17, z0 + 0.25, z1 - 0.25, '#55607a', NC);
        k.box(
          0.3,
          L - 0.3,
          EV + 0.1,
          EV + 0.17,
          (z0 + z1) / 2 - 0.03,
          (z0 + z1) / 2 + 0.03,
          '#55607a',
          NC
        );
        if (i)
          k.box(0, Math.min(L, LEN[i - 1]), EV + 0.02, EV + 0.08, z0 - 0.24, z0, '#e4e4e0', NC);
        k.box(L - 0.08, L, EV - 0.14, EV + 0.14, z0, z1, EDGE, NC); // 北端簷口
      }
      k.box(0, LEN[0], EV - 0.14, EV + 0.14, -0.12, 0.06, EDGE, NC); // 臨路簷口（方形天溝）
      k.box(0, FULL, EV - 0.14, EV + 0.14, 23.96, 24.08, EDGE, NC);
      k.box(0, 0.08, EV - 0.14, EV + 0.14, 0, 24, EDGE, NC);
      // 柱列與梁
      const ROWS = [0.6, 6, 12, 18, 23.5];
      for (const z of ROWS) {
        const L = lenAt(Math.min(z, 23.9));
        for (let x = 1.1; x < L; x += BAY)
          if (!(z < 1 && lane(x, -0.2)))
            k.box(x - 0.09, x + 0.09, -0.8, EV, z - 0.09, z + 0.09, STEEL);
        k.box(0.2, L - 0.2, EV - 0.2, EV, z - 0.06, z + 0.06, STEEL, NC);
      }
      for (let x = 1.1; x < FULL; x += BAY) {
        const zE = x < LEN[0] ? 0.6 : x < LEN[1] ? 6 : 12;
        k.box(x - 0.05, x + 0.05, EV - 0.16, EV, zE, 23.5, STEEL, NC);
      }
      // 鍍鋅鋼管護欄（入口、出口斷開；出口以北改成綠色菱形網圍籬，最北一格是米色板牆）
      const RZ = 0.25,
        FEN = OUT[1],
        BEI = LEN[0] - 2;
      const rail = (x0, x1) => {
        for (const y of [0.5, 0.98])
          k.box(x0, x1, y, y + 0.06, RZ - 0.03, RZ + 0.03, '#a9adb0', NC);
        for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 2.3)))
          k.cyl(x, RZ, 0.04, -0.6, 1.04, '#a9adb0', { seg: 6 });
        k.wallLine(x0, RZ, x1, RZ, 0, 1.1);
      };
      rail(0, IN[0]);
      rail(IN[1], OUT[0]);
      for (let x = FEN; x < BEI - 0.1; x += 3.5) {
        const w = Math.min(3.5, BEI - x);
        k.plane(T.mesh(), w, 2, x + w / 2, 1, RZ, PI, { transparent: true, double: true });
        k.cyl(x, RZ, 0.04, -0.6, 2, '#4f8f6a', { seg: 6 });
      }
      k.box(BEI, LEN[0], -0.6, 2.2, RZ - 0.04, RZ + 0.04, '#e3dcc4', NC);
      k.wallLine(FEN, RZ, LEN[0], RZ, 0, 2);
      for (const [x0, z0, x1, z1] of [
        [LEN[0], RZ, LEN[0], 6],
        [LEN[0], 6, LEN[1], 6],
        [LEN[1], 6, LEN[1], 12],
        [LEN[1], 12, FULL, 12],
        [FULL, 12, FULL, 24],
      ]) {
        const L = Math.hypot(x1 - x0, z1 - z0);
        if (L < 0.5) continue;
        k.plane(T.mesh(), L, 2, (x0 + x1) / 2, 1, (z0 + z1) / 2, x0 === x1 ? PI / 2 : PI, {
          transparent: true,
          double: true,
        });
        k.wallLine(x0, z0, x1, z1, 0, 2);
      }
      k.box(LEN[0] - 0.7, LEN[0] - 0.3, 0, 2.6, 1.2, 1.3, '#c9ccd0', NC); // 靠著板牆的鋁梯
      // 簷下的白底橫牌（原牌的英文小字就拼成 Entntrance，照原樣）
      const board = (x, w, text, sub, kind) => {
        k.box(x - w / 2 - 0.03, x + w / 2 + 0.03, EV - 0.62, EV - 0.14, -0.06, 0.0, '#f4f4f0', NC);
        k.plane(T.board(text, sub, kind), w, 0.42, x, EV - 0.38, -0.07, PI, { emissive: 0.25 });
      };
      const post = (x, z) => {
        k.cyl(x, z, 0.06, 0, 0.9, '#e0a81e', { seg: 6, col: true });
        k.cyl(x, z, 0.065, 0.45, 0.62, '#f2f2ee', { seg: 6 });
      };
      const gate = (x, z, armTo) => {
        // 黃色柵欄機
        k.box(x - 0.18, x + 0.18, 0, 1.05, z - 0.18, z + 0.18, '#e0a81e');
        k.box(x - 0.2, x + 0.2, 1.05, 1.1, z - 0.2, z + 0.2, '#2a2a2c', NC);
        k.box(
          Math.min(x, armTo),
          Math.max(x, armTo),
          0.86,
          0.94,
          z - 0.04,
          z + 0.04,
          '#f0d040',
          NC
        );
        for (let a = Math.min(x, armTo) + 0.5; a < Math.max(x, armTo); a += 0.8)
          k.box(a, a + 0.25, 0.855, 0.945, z - 0.045, z + 0.045, '#c8322c', NC);
      };
      // 「機車入口」：牌子掛在入口那一格的簷下；北側是深灰感應立柱與黃色柵欄機，中間一排黃白防撞桿，南側黃色 U 型護欄
      const im = (IN[0] + IN[1]) / 2;
      board(im, 1.6, '機車入口', 'Entntrance', 'arrow');
      gate(IN[1] - 0.5, 2.6, IN[0] + 0.5);
      k.box(IN[1] - 0.95, IN[1] - 0.65, 0, 1.4, 1.3, 1.6, '#3a3d42');
      k.box(IN[1] - 0.98, IN[1] - 0.62, 1.4, 1.75, 1.28, 1.62, '#e8e6dc', NC);
      for (const z of [0.4, 1.2, 2.0]) post(im + 0.1, z);
      for (const z of [0.7, 1.7]) {
        k.box(IN[0] + 0.3, IN[0] + 1.3, 0.55, 0.6, z, z + 0.05, '#e0a81e', NC);
        for (const x of [IN[0] + 0.3, IN[0] + 1.25])
          k.box(x, x + 0.05, 0, 0.6, z, z + 0.05, '#e0a81e', NC);
      }
      k.cone(IN[0] - 0.3, -0.5);
      k.cone(IN[1] + 0.4, -0.4);
      k.box(8.0, 9.4, 0.25, 1.25, RZ - 0.08, RZ - 0.04, '#5a55b8', NC); // 入口南邊護欄上的藍紫色告示牌（字看不清）
      // 出口：「禁止進入」白牌、一道黃色柵欄機與黃色收費柱
      const om = (OUT[0] + OUT[1]) / 2;
      board(om, 1.6, '禁止進入', 'No Entry', 'stop');
      gate(OUT[1] - 0.45, 2.4, OUT[0] + 0.5);
      k.box(OUT[1] - 0.75, OUT[1] - 0.4, 0, 1.3, 1.2, 1.55, '#e0a81e');
      post(OUT[0] + 0.15, 0.3);
      post(OUT[1] - 0.15, 0.3);
      // 棚裡的機車：一排一排南北向停，車頭朝東西；最靠路的兩排畫完整，裡面的只畫車身與坐墊。實景大多是黑、灰、白色的車
      const BC = [
        '#2a2a30',
        '#3a3a40',
        '#1c1c1e',
        '#55585c',
        '#c9c9c4',
        '#2a2a30',
        '#7a2a2a',
        '#2f4f7a',
        '#e8e8e4',
        '#3a3a40',
      ];
      [1.7, 3.4, 7.6, 9.3, 13.4, 15.1, 19.4, 21.1].forEach((z, j) => {
        const L = lenAt(z + 0.7);
        for (let x = 0.9; x < L - 0.8; x += 0.78) {
          if (lane(x, 0.3) || r() < 0.22) continue;
          const col = BC[(r() * BC.length) | 0];
          if (j < 2) bike(k, x, z, 1, col);
          else {
            k.box(x - 0.14, x + 0.14, 0.2, 0.66, z, z + 1.5, col, NC);
            k.box(x - 0.1, x + 0.1, 0.66, 0.76, z + 0.45, z + 1.0, '#1c1c1e', NC);
          }
        }
      });
      for (const list of k.parts.values())
        for (const g of list) {
          const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + DY(p.getX(i)));
        }
      for (const m of k.group.children) m.position.y += DY(m.position.x);
    }
    // 入口南邊路邊的電桿（底部紅白斜紋，桿上一塊停車資訊牌，字看不清）
    {
      const q = open(1, 12, 18, 4.3);
      pole(q, 13.2, 4.35, 9, '#c8322c');
      q.B(13.0, 13.4, 3.3, 4.3, 4.5, 5.3, '#2a2a2c', NC);
      q.B(12.98, 13.42, 4.3, 4.75, 4.5, 5.3, '#c8322c', NC);
    }
    // 護欄外緣的兩根電桿：s 61（桿上一盞路燈＋廣播喇叭，從 s 58 往東北看就在眼前）、s 76（出口北邊，從 s 58、s 79 兩點交會）
    {
      const q = open(1, 60, 77, 4.3);
      pole(q, 61, 4.4, 9.5);
      q.B(60.95, 61.05, 8.6, 8.7, 3.2, 4.4, '#8a8d90', NC);
      q.B(60.8, 61.2, 8.5, 8.62, 2.8, 3.3, '#d8d8d0', NC);
      q.B(60.8, 61.2, 6.6, 6.95, 4.0, 4.3, '#c9ccd0', NC);
      pole(q, 76, 4.4, 9.5);
    }

    // ---- E2 s86.5–92：棚子北端缺角裡的水泥地、水泥台上三座台電配電箱、紅色消防箱；路邊電桿＋禁止停車圓牌；北邊一道綠網圍籬 ----
    {
      const q = open(1, 86.5, 92, 4.2);
      q.B(86.6, 91.8, -0.8, 0.05, 4.2, 10.4, '#b5b2aa', NC);
      pole(q, 90.7, 4.45);
      noPark(q, 90.7, 4.45);
      q.B(88.1, 91.4, -0.8, 0.4, 8.0, 9.9, '#a3a19b');
      for (const s of [88.3, 89.35, 90.4]) {
        q.B(s, s + 0.9, 0.4, 1.8, 8.5, 9.3, '#8d9196');
        q.B(s + 0.05, s + 0.85, 0.5, 1.7, 8.47, 8.5, '#7d8186', NC);
        q.B(s + 0.43, s + 0.47, 0.5, 1.7, 8.45, 8.48, '#5a5d60', NC);
      }
      q.C(87.45, 8.8, 0.04, 0, 0.9, '#6a6d70', { seg: 6 });
      q.B(87.2, 87.7, 0.9, 1.6, 8.65, 8.95, '#c8322c', NC);
      bike(q.k, q.X(88.4), q.Z(6.9), 0, '#2a2a30');
      q.P(T.mesh(), 3.5, 1.8, 91.8, 0.9, 6.7, 'n', { transparent: true, double: true });
      q.P(T.mesh(), 3.5, 1.8, 91.8, 0.9, 10.2, 'n', { transparent: true, double: true });
      q.line(91.8, 4.95, 91.8, 12, 0, 1.8);
    }

    // ---- E3 s92–150：浪板圍籬（南段下藍上白、北段鍍鋅灰白、下半生鏽、爬藤），後面菜園、果樹、雜木與棕櫚 ----
    {
      const r = lcg(4693),
        OFF = 4.95; // 圍籬離中心線（北端接 L2 的菜園圍籬 5.0）
      for (let n = 0; n < 10; n++) {
        const s = 92 + n * 5.8,
          q = open(1, s, s + 5.8, OFF);
        for (let x = 0; x < 5.75; x += 1.16) {
          const ss = s + x,
            h = 1.45 + r() * 0.15,
            z = r() * 0.06,
            blue = ss < 102,
            rust = ss < 128; // s 128 以北整片是沒生鏽的鍍鋅灰（從 s 150 回頭看）
          q.k.box(
            x,
            x + 1.13,
            -0.8,
            1.0,
            z,
            z + 0.05,
            blue
              ? '#3f73c4'
              : (rust ? ['#9a7a62', '#8a6a52', '#a58a72'] : ['#a9aca8', '#a2a5a0', '#b2b4af'])[
                  (r() * 3) | 0
                ],
            NC
          );
          q.k.box(
            x,
            x + 1.13,
            1.0,
            h,
            z,
            z + 0.05,
            blue ? '#dcdcd6' : ['#b9bcb8', '#b0b3ae', '#c2c4bf'][(r() * 3) | 0],
            NC
          );
          q.k.box(x - 0.03, x + 0.03, -0.8, h + 0.05, z + 0.05, z + 0.11, '#8d9196', NC);
          if (!blue && r() < 0.6)
            blobK(q.k, x + 0.6, h - 0.05, z + 0.1, 0.62, 0.26, 0.22, GREEN[(r() * 4) | 0]);
        }
        q.line(s, OFF, s + 5.8, OFF, 0, 1.5);
      }
      const g = open(1, 96, 126, 6.2); // 菜園：裸土＋一畦一畦的菜、矮果樹
      g.B(96.5, 125.5, -1.2, 0.05, 5.7, 22, '#8a7256', NC);
      for (let s = 97.5, i = 0; s < 124; s += 2.4, i++)
        g.B(s, s + 1.5, 0.05, 0.22, 6.6, 20.5, i % 3 ? '#6f8450' : '#7f8f5a', NC);
      const t = open(1, 96, 150, 6.2);
      for (const [s, o] of [
        [99.5, 12],
        [108, 9.5],
        [113, 17],
        [120.5, 11],
        [103, 19],
      ])
        tree(t, s, o, 2.6 + r(), 1.5 + r() * 0.5, r, ['#6a9a4a', '#7aa855', '#4b8a3e']);
      for (const [s, o, h, rr] of [
        [127, 9, 6.5, 3.2],
        [131.5, 14, 7.5, 3.6],
        [143, 8.2, 3.6, 3.2],
        [148, 9.5, 3.4, 3.0],
        [135, 20, 8, 3.8],
        [124, 24, 7, 3.4],
        [112, 26, 7.5, 3.6],
        [100, 26, 7, 3.4],
      ])
        tree(t, s, o, h, rr, r);
      for (const [s, o, h] of [
        [137, 7.6, 9.5],
        [138.6, 9.4, 10.5],
        [140, 7.4, 8.8],
      ])
        palm(t, s, o, h);
      // s 133 以北圍籬與路面之間是一條水泥人行帶；s 139.5 圍籬邊一根電桿（從 s 150 往南看在三棵棕櫚右邊）
      const w = open(1, 133, 150, 3.9);
      w.B(133, 150, -0.6, 0.04, 3.9, 4.9, '#a3a099', NC);
      pole(w, 139.5, 4.6, 9.5);
    }

    // =====================================================================================
    // 西側
    // =====================================================================================
    // ---- W1 s12–24：巷口轉角露天停車場靠 469 巷這側的黑色鐵欄杆、柏油地與停著的車（轉角弧形防撞桿與面向新中北路的部分歸 X1）----
    {
      const q = open(-1, 12, 24, 5.3);
      q.B(14, 24, -0.8, 0.03, 5.5, 10, '#55565a', NC);
      for (const s of [14.5, 19.5])
        q.P(T.rail('#1c1c1e'), 5, 1.0, s, 0.5, 5.4, 'st', { transparent: true, double: true });
      q.line(12, 5.4, 22, 5.4, 0, 1.05);
      carK(q.k, q.X(16.3), q.Z(6.3), false, '#f0f0ec');
      carK(q.k, q.X(19.4), q.Z(6.2), false, '#e8e8e4');
      carK(q.k, q.X(22.6), q.Z(6.4), false, '#3a3d44');
    }
    // ---- W2 s29–33：綠鐵皮屋（X1）東角前面斜放的木格柵、橘色磁磚小屋（紅框白門、綠帆布），轉角一支禁止停車圓牌 ----
    {
      const q = open(-1, 28, 33.2, 5.5),
        k = q.k;
      q.B(30.3, 33, -0.8, 3.0, 5.5, 7.5, 'wall#c8794e', TILE);
      q.B(30.2, 33.1, 3.0, 3.12, 5.4, 7.6, '#cfd0cc', NC);
      q.B(30.6, 31.7, 0, 2.15, 5.44, 5.5, '#c8322c', NC);
      q.B(30.72, 31.58, 0, 2.03, 5.42, 5.46, '#f0f0ec', NC);
      q.B(31.9, 32.9, 0.1, 2.4, 5.42, 5.5, '#2f9a4a', NC);
      k.plane(
        T.lattice(),
        2.05,
        1.5,
        (q.X(29.7) + q.X(31.2)) / 2,
        0.75,
        (q.Z(6.3) + q.Z(4.9)) / 2,
        PI - 0.752,
        { double: true }
      );
      q.line(29.7, 6.3, 31.2, 4.9, 0, 1.5);
      q.C(33.3, 4.9, 0.04, -0.8, 2.6, '#8d9196', { seg: 6 });
      noPark(q, 33.3, 4.9, 2.3);
    }
    // ---- W3 s33–41.6：灰色直紋浪板圍牆（高 2.4），牆腳幾個舊輪胎；圍牆與鐵皮棚交界 s≈41.8 第一棵大樹；牆後黑色鋼架上 3 座不鏽鋼水塔 ----
    {
      const r = lcg(4695);
      for (const [s0, s1] of [
        [33, 37.3],
        [37.3, 41.6],
      ]) {
        const q = open(-1, s0, s1, 5.4);
        q.B(s0, s1, -0.8, 2.4, 5.4, 5.5, '#b4b5b1');
        q.P(T.corr('#b4b5b1', 40), s1 - s0, 2.4, (s0 + s1) / 2, 1.2, 5.38);
      }
      const q = open(-1, 33, 44, 4.6);
      for (const s of [34.6, 35.5, 37.4]) q.C(s, 5.05, 0.3, 0, 0.22, '#1c1c1e', { seg: 10 });
      rainTree(q, 41.8, 5.1, r);
      const t = open(-1, 39.5, 43.5, 10.5);
      for (const s of [39.6, 43.3])
        for (const o of [10.6, 12.8]) t.B(s, s + 0.12, -0.8, 3.5, o, o + 0.12, '#1c1c1e', NC);
      t.B(39.5, 43.5, 3.5, 3.62, 10.5, 13, '#1c1c1e', NC);
      for (const s of [40.3, 41.5, 42.7]) {
        t.C(s, 11.75, 0.55, 3.62, 5.0, '#c9ccd0', { seg: 12 });
        t.C(s, 11.75, 0.55, 5.0, 5.25, '#c9ccd0', { seg: 12, r1: 0.2 });
      }
    }
    // ---- W4 s41.6–55.8：灰綠色一樓鐵皮棚（鐵窗小窗、貼海報的浪板門、一大叢盆栽、藍色鐵捲門 s 50.6～54、北端再一扇鐵窗小窗）；s≈55.3 第二棵大樹 ----
    //      （從 s 58 正對西南看：藍鐵捲門右邊還有一扇鐵窗，棚子到 s 55.8 才結束；北段後面緊貼著斜放的透天，所以北段比較淺）
    {
      const r = lcg(4696),
        q = open(-1, 41.6, 55.8, 5.5),
        W = '#8f9c7c';
      q.B(41.6, 51, -0.8, 2.7, 5.5, 11.5, W);
      q.B(51, 55.8, -0.8, 2.7, 5.5, 8.9, W);
      q.B(41.4, 51, 2.7, 2.8, 5.2, 11.7, '#b9bcb8', NC);
      q.B(51, 56, 2.7, 2.8, 5.2, 9.1, '#b9bcb8', NC);
      q.P(T.corr(W, 70), 14.2, 2.7, 48.7, 1.35, 5.48);
      q.P(T.corr(W, 30), 6, 2.7, 41.58, 1.35, 8.5, 's');
      q.P(T.corr(W, 17), 3.4, 2.7, 55.82, 1.35, 7.2, 'n');
      q.P(grWin, 1.0, 0.9, 42.9, 1.7, 5.46);
      q.P(grWin, 0.8, 0.9, 54.95, 1.7, 5.46);
      q.B(44.2, 48.2, 0, 2.2, 5.44, 5.5, '#87947a', NC);
      q.P(T.posters(), 3.2, 1.3, 46.2, 1.3, 5.42, 'st', { transparent: true });
      for (const [s, h, o] of [
        [48.9, 1.7, 4.9],
        [49.6, 2.2, 5.0],
        [50.3, 1.8, 4.85],
      ]) {
        q.C(s, o, 0.22, 0, 0.4, '#8a5a3c', { seg: 8 });
        blob(q, s, o, h * 0.55 + 0.3, 0.75, h * 0.5, 0.6, GREEN[(r() * 4) | 0]);
      }
      q.P(shutterTex('#2f5f8f'), 3.4, 2.3, 52.3, 1.15, 5.46);
      q.B(50.5, 54.1, 2.3, 2.52, 5.3, 5.5, '#7a7e80', NC); // 門上的白字看不清，不寫
      const u = open(-1, 52, 58, 4.6);
      rainTree(u, 55.3, 5.0, r, -2.6); // 這棵往南斜，樹冠不會擋到北邊的透天
      for (let i = 0; i < 2; i++)
        bike(u.k, u.X(57.2 - i * 0.9), u.Z(5.0), 1, bikeCols[(i * 2 + 1) % 6]);
    }
    // ---- W5 s53～64：灰藍 4 樓透天與它臨路的一樓車庫 ----
    //      透天不是正對巷子：它跟後面那排老房子一樣斜著蓋，退在鐵皮棚北段與車庫後面。
    //      朝東北那面（寬約 4.7 m）的兩個角用街景三個拍攝點交會：東角（s 54.1, 離 9.1）、北角（s 57.0, 離 12.5），2024 正射的米色屋頂也在同一個位置；
    //      朝東南那面沿著鐵皮棚後面往西南延伸約 13 m。臨路只有一樓：白色鐵捲門車庫（s 58.3～61.9，屋頂是黑欄杆露台）、灰色門柱夾一扇深色鐵門（到 s 64）
    {
      const RA = { transparent: true, double: true };
      const g = open(-1, 55.8, 64.3, 5.75);
      g.B(55.8, 57.5, -0.8, 0.03, 4.6, 12, '#b5b2aa', NC); // 透天門前的水泥地（鐵皮棚與車庫之間）
      g.B(57.5, 58.3, -0.8, 3.6, 5.9, 6.6, '#9a9a98'); // 車庫南端的灰色門柱
      g.B(58.3, 63.9, -0.8, 3.3, 6.0, 11.5, '#d6d6d2');
      g.B(58.1, 64.0, 3.3, 3.42, 5.85, 11.6, '#c9c9c4', NC); // 車庫（平頂）
      g.P(shutterTex('#eeeeea'), 3.6, 2.6, 60.1, 1.3, 5.98);
      g.B(58.3, 61.9, 2.6, 2.86, 5.86, 6.0, '#e4e4e0', NC);
      g.P(T.rail('#1c1c1e'), 5.8, 0.95, 61.05, 3.9, 5.9, 'st', RA);
      g.P(T.rail('#1c1c1e'), 5.6, 0.95, 58.15, 3.9, 8.7, 's', RA); // 屋頂露台的黑欄杆
      g.B(61.9, 62.9, -0.8, 3.1, 5.75, 6.0, 'wall#9a9a98', TILE);
      g.B(63.9, 64.3, -0.8, 3.1, 5.75, 6.2, 'wall#9a9a98', TILE);
      g.B(62.9, 63.9, 2.3, 3.1, 5.8, 6.0, 'wall#9a9a98', TILE);
      g.B(62.9, 63.9, 0, 2.3, 5.86, 5.92, '#2a2c30', NC); // 深色鐵門
      // 斜放的透天本體：區域座標原點在東角，+x 沿朝東南那面往西南、+z 沿朝東北那面往西北
      const t = open(-1, 53.1, 54.1, 9.1),
        kt = t.k,
        TA = 0.72,
        TW = '#727a88',
        FH = 3.2;
      kt.ang += TA;
      kt.c = Math.cos(kt.ang);
      kt.s = Math.sin(kt.ang);
      kt.group.rotation.y = -kt.ang;
      kt.box(0, 7, -0.8, 13, 0, 4.7, TW);
      kt.box(7, 13, -0.8, 9.8, 0, 4.7, TW); // 前半 4 樓、後半 3 樓
      kt.box(-0.12, 7.12, 13, 13.12, -0.12, 4.82, '#a9aaa6', NC);
      kt.box(7, 13.12, 9.8, 9.92, -0.12, 4.82, '#a9aaa6', NC);
      kt.box(-0.06, 0, 0, 2.5, 2.0, 4.4, '#3a3d42', NC); // 一樓深灰百葉門
      for (let f = 1; f < 4; f++) {
        const y = f * FH + 0.1;
        kt.box(-0.04, 0, y + 0.75, y + 2.45, 0.9, 4.1, '#e9e9e6', NC);
        kt.plane(alWin, 2.6, 1.4, -0.06, y + 1.6, 2.5, -PI / 2); // 朝東北：每層一扇白框橫長窗
        if (f < 3) for (const x of [2.5, 6, 10.5]) kt.plane(alWin, 1.1, 1.1, x, y + 1.6, -0.03, PI); // 朝東南：小窗
      }
      kt.box(-1.0, 0, FH, FH + 0.1, 0.5, 4.5, '#2b2b2b', NC);
      kt.plane(bars, 4.0, 1.0, -1.0, FH + 0.6, 2.5, -PI / 2, RA); // 2 樓黑欄杆陽台
      kt.cyl(3.5, 2.4, 0.55, 13.12, 14.4, '#c9ccd0', { seg: 12 });
    }
    // ---- W6 s64–78：「海耶」餐酒館：2 樓現代建築。一樓退在露台下面，兩道白鐵捲門凸出來；整排玻璃欄杆露台；
    //      二樓只蓋南半（s 63.3～71，蝴蝶屋頂往中間斜下去），北半是露天露台 ----
    {
      const q = open(-1, 64, 78, 6.8),
        k = q.k,
        WALL = '#d9d8d3',
        TRIM = '#2e3a36',
        w = 14;
      const xs = (s) => q.X(s); // 區域座標：x 由北往南（x=0 在 s 78、x=14 在 s 64），z 往西（離開街道）
      k.box(xs(71.2), w, -0.8, 3.2, 1.0, 9, WALL);
      k.box(0, xs(71.2), -0.8, 3.2, 3.1, 4.4, WALL); // 一樓（退 1 m）：南半在二樓下面深 8 m，北半只是露台下的淺車棚
      k.box(xs(67.6), xs(64.8), -0.8, 2.95, 0, 1.0, WALL);
      k.plane(T.shutter2(), 2.6, 2.6, (xs(64.8) + xs(67.6)) / 2, 1.3, -0.03, PI); // 南邊凸出來的白鐵捲門
      // 北邊那道白鐵捲門不是正對巷子：它從 s 71.2 的深色柱子斜著往西北退進去（朝東北），所以從 s 69 正對看只剩窄窄一條、從 s 79 回頭看是一整面
      k.box(xs(71.35), xs(71.1), -0.8, 2.95, 0, 1.0, '#3a3d42');
      paintGeo(k.slab(xs(71.2), 0.15, xs(74.2), 3.15, 0.16, -0.8, 2.95, VC), WALL);
      k.plane(
        T.shutter2(),
        3.9,
        2.6,
        (xs(71.2) + xs(74.2)) / 2 - 0.07,
        1.3,
        1.65 - 0.07,
        -PI * 0.75
      );
      k.box(xs(64.8), xs(64), -0.8, 2.95, -0.12, 1.0, '#8d8b86');
      k.plane(T.stone(), 0.8, 2.95, (xs(64.8) + xs(64)) / 2, 1.475, -0.14, PI); // 南端文化石柱
      k.box(0, xs(76.2), -0.8, 2.95, 0, 0.25, WALL); // 北端臨路的一片白牆（s 76.2～78）
      // 露台：樓板、墨綠黑直紋金屬飾帶、下緣木色線、玻璃欄杆
      k.box(-0.2, w + 0.2, 2.95, 3.2, -0.3, 1.0, '#b5b2aa', NC);
      k.box(-0.2, w + 0.2, 3.05, 3.95, -0.36, -0.3, TRIM, NC);
      k.plane(T.corr(TRIM, 80), w + 0.4, 0.9, w / 2, 3.5, -0.37, PI);
      k.box(-0.2, w + 0.2, 2.95, 3.05, -0.36, -0.3, '#c9a070', NC);
      for (const x of [-0.2, w + 0.14]) k.box(x, x + 0.06, 3.05, 3.95, -0.3, 2.6, TRIM, NC);
      for (let x = 0; x < w - 0.1; x += 3.5)
        k.plane(T.glassRail(), 3.5, 1.05, x + 1.75, 4.47, -0.33, PI, {
          transparent: true,
          double: true,
        });
      k.box(w - 1.4, w + 0.2, 3.95, 5.0, -0.37, -0.3, WALL, NC); // 露台最南端一小段是實心白牆，不是玻璃
      // 二樓南半：往後退 2.6 m，蝴蝶屋頂（兩片往 s 67 的谷斜下去）
      const xN = xs(71),
        xv = xs(67),
        xS = xs(63.3),
        yLo = 6.2,
        yHi = 7.2;
      wedge(k, xN, xv, 2.6, 9, 3.2, 3.2, yHi, yLo, WALL);
      wedge(k, xv, xS, 2.6, 9, 3.2, 3.2, yLo, yHi, WALL);
      wedge(k, xN - 0.4, xv, 1.6, 9.5, yHi + 0.03, yLo, yHi + 0.38, yLo + 0.3, TRIM);
      wedge(k, xv, xS + 0.5, 1.6, 9.5, yLo, yHi + 0.05, yLo + 0.3, yHi + 0.4, TRIM);
      k.plane(T.dark(), 3.0, 2.3, (xv + xS) / 2, 4.75, 2.57, PI);
      k.plane(T.dark(), 2.6, 1.9, (xN + xv) / 2, 4.5, 2.57, PI);
      // （前一版在二樓北端旁邊放了一座文化石塔，其實是後面那棟 4 樓公寓的灰色小口磚牆從露台上方露出來：
      //  s 69 正對拉近看是「白色側牆＋灰磚面＋陽台」，從 s 79 回頭看露台後面什麼都沒有，所以拿掉）
      // 蝴蝶屋頂北端過了高點再往北斜下去一小段，底下是內凹的深色入口
      wedge(k, xs(72.7), xN, 2.9, 9, 3.2, 3.2, yLo, yHi, '#3a3d42');
      wedge(k, xs(72.9), xN - 0.4, 1.6, 9.5, yLo, yHi + 0.03, yLo + 0.3, yHi + 0.38, TRIM);
      // 露台下與前庭：機車、盆栽、交通錐
      bike(k, xs(69.8), 0.45, 0, '#2a2a30');
      const r = lcg(4697);
      for (const s of [68.2, 68.9, 73.2, 76.6, 77.3, 74.3]) {
        k.cyl(xs(s), -0.5, 0.2, 0, 0.35, '#8a5a3c', { seg: 8 });
        blobK(k, xs(s), 0.85, -0.5, 0.42, 0.55, 0.42, GREEN[(r() * 4) | 0]);
      }
      k.cone(xs(67.9), -1.2);
      k.cone(xs(72.9), -1.4);
      k.box(0, w, -0.8, 0.03, -2.2, 1.0, '#b5b2aa', NC); // 水泥前庭
      // 唯一的招牌：北端的白色立牌「海耶」（黑色書法字）
      // （直的白板，寬約 1.2 m、高約 1.8 m，兩個字直排、斜錯開：「海」偏左上、「耶」偏右下）
      const p = open(-1, 78.6, 80.2, 6.3),
        sign = T.haiye();
      p.B(78.8, 80, 0, 1.9, 6.3, 6.4, '#f2f2ee');
      p.P(sign, 1.2, 1.8, 79.4, 0.98, 6.28, 'st', { emissive: 0.25 });
      p.P(sign, 1.2, 1.8, 79.4, 0.98, 6.42, 'bk', { emissive: 0.25 });
    }
    // ---- W7 s80.3–85.5：水泥車道（沒有面向巷子的建物），往裡面通到海耶後面的一樓鐵皮店（招牌字看不清，留白）與 4 樓公寓 ----
    {
      const q = open(-1, 77, 85.5, 4.4);
      q.B(80.3, 85.5, -0.8, 0.03, 4.4, 17.6, '#b5b2aa', NC);
      q.B(80.8, 85.5, -0.8, 0.03, 17.6, 23.5, '#b5b2aa', NC);
      q.B(78.2, 80.3, -0.8, 0.03, 6.5, 15.4, '#b5b2aa', NC);
      carK(q.k, q.X(80.1), q.Z(8.5), false, '#3f4a52');
      // 4 樓公寓與貼著它的一樓鐵皮店：這一帶的老房子斜著蓋（街景量到白色側牆與巷子夾約 32°）。公寓東角在（s 78.7, 離 18.6）（s 69、s 79、s 99 三個拍攝點的方位交會後，再用同點同角度的遊戲截圖對畫面位置微調），
      // 朝東北那面是灰色小口磚（每層一個內凹陽台＋一扇窗），再往西北是退 2 m 的側翼（黑欄杆陽台、深色雨遮），朝東南那面整面白牆；
      // 鐵皮店貼在白牆前面，店面與公寓正面同一個平面，藍色鐵捲門緊鄰公寓東角。區域座標轉 32° 後：+x 往西南偏南、+z 往西北偏西
      const a = open(-1, 77.7, 78.7, 18.6),
        ka = a.k,
        APT = 0.56,
        FH = 3.15,
        top = 4 * FH,
        GT = 'wall#8a8a8c',
        RA = { transparent: true, double: true };
      ka.ang += APT;
      ka.c = Math.cos(ka.ang);
      ka.s = Math.sin(ka.ang);
      ka.group.rotation.y = -ka.ang;
      ka.box(0, 9.5, -0.8, top, 0, 5.4, GT, TILE);
      ka.box(0, 9.5, -0.8, top, -0.06, 0, '#e6e6e4', NC);
      ka.box(-0.1, 9.6, top, top + 0.9, -0.1, 0.1, '#e6e6e4', NC);
      ka.box(-0.1, 0.1, top, top + 0.9, 0, 5.5, '#8a8a8c', NC);
      ka.box(2, 9.5, -0.8, top - 0.3, 5.4, 8.9, 'wall#7c7c7f', TILE);
      for (let f = 0; f < 4; f++) {
        const y = f * FH;
        ka.plane(alWin, 1.0, 1.4, -0.03, y + 1.75, 4.5, -PI / 2);
        if (!f) {
          ka.box(-0.05, 0, 0, 2.2, 1.2, 2.2, '#3a3d42', NC);
          continue;
        }
        ka.box(-0.05, 0, y + 0.1, y + 2.6, 0.5, 3.3, '#2a2e33', NC);
        ka.plane(T.glassRail(), 2.8, 1.0, -0.07, y + 0.6, 1.9, -PI / 2, RA);
        ka.box(1.0, 2, y - 0.15, y, 5.5, 8.8, '#6f6d69', NC);
        ka.plane(bars, 3.3, 0.95, 1.02, y + 0.48, 7.15, -PI / 2, RA);
        ka.box(0.9, 2, y + 2.7, y + 2.8, 5.5, 8.8, '#5a4a40', NC);
        ka.plane(alWin, 2.2, 1.5, 1.97, y + 1.5, 7.1, -PI / 2);
      }
      ka.plane(alWin, 2.2, 1.5, 1.97, 1.5, 7.1, -PI / 2);
      ka.cyl(5, 2.4, 0.6, top, top + 1.4, '#c9ccd0', { seg: 12 });
      ka.box(0, 3.8, -0.8, 3.0, -5.5, -0.06, '#c9c8c2');
      ka.box(-0.4, 4.0, 3.0, 3.12, -5.7, -0.06, '#8a6a5a', NC);
      ka.plane(shutterTex('#2f5f8f'), 2.4, 2.3, -0.03, 1.15, -1.5, -PI / 2);
      ka.box(-0.12, 0, 2.35, 2.95, -5.3, -3.0, '#f2f2ee', NC);
      ka.cyl(2.2, -3, 0.5, 3.12, 4.3, '#c9ccd0', { seg: 12 });
      ka.cyl(3.0, -1.4, 0.45, 3.12, 4.0, '#1c1c1e', { seg: 10 });
      ka.cyl(3.0, -4.4, 0.45, 3.12, 4.0, '#1c1c1e', { seg: 10 });
    }
    // ---- W8 s85.5–150：雜草空地與樹林（沒有圍牆、沒有人行道），路邊電桿 ----
    {
      const r = lcg(4698),
        q = open(-1, 85.5, 150, 4.6);
      for (let s = 86.2; s < 101; s += 1.3)
        blob(
          q,
          s,
          5.6 + r() * 4,
          0.7,
          0.9 + r() * 0.5,
          0.9 + r() * 0.7,
          0.9 + r() * 0.5,
          ['#5a8f45', '#6a9a4a', '#4b8a3e'][(r() * 3) | 0]
        );
      for (let s = 99; s < 150; s += 5.2) {
        tree(q, s + r() * 2, 7.6 + r() * 1.6, 5.5 + r() * 2, 3.3 + r() * 0.9, r);
        if (r() < 0.6) blob(q, s + 3, 5.6 + r(), 0.5, 1.1, 0.7, 0.9, '#4b8a3e');
      }
      for (let s = 92, i = 0; s < 150; s += 9, i++)
        tree(q, s + r() * 4, 13 + r() * 4, 6 + r() * 2.5, 3.6 + r(), r);
      // 實景 s 100 以北西側是一整面貼著路邊的密林與藤蔓，看不到後面（從 s 120、s 150 往南看）：路邊補一排灌木與矮樹把空隙填滿
      const r2 = lcg(4699);
      for (let s = 101; s < 150; s += 2.6) {
        blob(
          q,
          s + r2(),
          6.3 + r2() * 0.8,
          1.2 + r2() * 0.5,
          1.7,
          1.5 + r2() * 0.6,
          1.3,
          GREEN[(r2() * 4) | 0]
        );
        if (r2() < 0.55) tree(q, s + 1.3, 10.2 + r2() * 1.5, 5 + r2() * 2.5, 3 + r2() * 0.8, r2);
      }
      pole(q, 93.3, 4.6);
      noPark(q, 93.3, 4.6); // 從 s 99 往西南看，掛禁止停車圓牌的電桿在車道口北邊的雜草裡
      pole(q, 115, 4.6, 9);
      q.B(114.95, 115.05, 8.1, 8.2, 3.4, 4.6, '#8a8d90', NC);
      q.B(114.8, 115.2, 8.0, 8.12, 3.0, 3.5, '#d8d8d0', NC); // 從 s 120 往南看只有這一根（桿上一盞路燈）
      q.C(85.9, 5.2, 0.4, 0.0, 0.8, '#a3a19b', { seg: 10 }); // 車道口露出的水泥涵管
    }
  },

  footprints(F) {
    const E = (s0, s1, set, d) => F(REF, s0, s1, 1, set, d),
      W = (s0, s1, set, d) => F(REF, s0, s1, -1, set, d);
    const L = SHED.len,
      PT = (s, off) => F(REF, s - 0.2, s, -1, off, 0)[0]; // （s, 離中心線）→ 世界座標，給斜放的建物圈地用
    return [
      [
        shedPt(0, -0.9),
        shedPt(L[0], -0.9),
        shedPt(L[0], 6),
        shedPt(L[1], 6),
        shedPt(L[1], 12),
        shedPt(L[3], 12),
        shedPt(L[3], SHED.d + 0.2),
        shedPt(0, SHED.d + 0.2),
      ], // 機車棚
      E(86.5, 92, 4.2, 6.4), // 配電箱平台與水泥地
      E(92, 150, 4.8, 0.5),
      E(96.5, 125.5, 5.7, 16.3), // 圍籬、菜園
      W(14, 24, 5.3, 4.8), // 露天停車場
      W(28.5, 41.6, 4.6, 3.1),
      W(39.3, 43.7, 10.4, 2.8), // 木格柵、橘磚小屋、浪板圍牆；水塔平台
      W(41.4, 51, 5.2, 6.5),
      W(51, 56, 5.2, 3.9), // 灰綠鐵皮棚（北段較淺）
      W(55.8, 64.3, 5.7, 6), // 透天門前的水泥地、車庫、門柱門牆
      [
        [-1.1, -0.15],
        [13.15, -0.15],
        [13.15, 4.85],
        [-1.1, 4.85],
      ].map(([x, z]) => PT(54.1 - 0.752 * x + 0.659 * z, 9.1 + 0.659 * x + 0.752 * z)), // 斜放的透天（cos、sin 0.72）
      W(64, 80.2, 4.6, 11.4), // 海耶
      W(80.3, 85.5, 4.4, 15.2),
      W(80.8, 85.5, 17.6, 5.9),
      W(78.2, 80.3, 6.5, 8.9), // 水泥車道
      [
        [-0.2, -5.7],
        [-0.2, 9.0],
        [9.6, 9.0],
        [9.6, -0.1],
        [4.0, -0.1],
        [4.0, -5.7],
      ].map(([x, z]) => PT(78.7 - 0.847 * x + 0.531 * z, 18.6 + 0.531 * x + 0.847 * z)), // 斜放的公寓與貼著它的鐵皮店（cos、sin 0.56）
    ];
  },
};
