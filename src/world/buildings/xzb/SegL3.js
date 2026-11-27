// 新中北路469巷 s 345～444（巷子北端，接普忠路；照 Google 街景 2026-05、國土測繪 2024 正射建模）
// 這段沒有任何街屋、沒有店家招牌，全部用 custom 蓋：
//   東側（+1，靠校園）由南到北：南車道口柵欄、鋼架棚（舊槽體＋「中原大學 C3」看板）、紅磚矮緣石圍的大樹安全島、
//                             北車道口（柵欄機、分隔矮柱）、「熱誠樓」指示柱與磚基鐵柵、花磚基座綠色菱形網圍籬（淺灰綠鐵板門）、
//                             路口的黃色矮牆與電桿（禁止左轉、路名牌）；後方有污水處理場小屋、果園鐵皮屋、紅磚色大樓（只做量體）
//   西側（-1，體育園區）由南到北：鍍鋅鋼管網圍籬、紅色鋪面上的電箱、褐色橫條板小屋、灰色帆布圍籬與後面的綠籬和榕樹排、
//                             兩根電桿（菱形警告牌、速限 30）、淺綠鐵皮小屋與水塔、紅鐵柱菜園與廢棄小貨卡
// 圍籬後面的「體育園區籃排球場」光電頂棚在 src/world/Court.js，這裡不碰；頂棚東南角離巷子中心只有 5.7 m，圍籬在那裡往路邊收。
// 這段參考線有兩個轉折（s 376.7、397.2），所以不用「一格一個對街的框」，一律先算出世界座標再換回各個 Kit 的區域座標：
//   A(s, off) ＝ 沿參考線 'L' 的里程 s、離道路中心線 off 公尺（正＝東側、負＝西側）的世界座標 [x, z]
const REF = 'L';
const LINE = [
  [247.6, 15.7],
  [255.4, 7.0],
  [254.8, -25.2],
  [253.1, -73.3],
  [239.3, -202.4],
  [224.2, -324.8],
  [223.6, -329.1],
  [224.7, -356.3],
  [233.1, -375.0],
  [269.9, -403.9],
];
const SEGL = LINE.slice(1).map((b, i) => Math.hypot(b[0] - LINE[i][0], b[1] - LINE[i][1]));
const A = (s, off = 0) => {
  let acc = 0;
  for (let i = 0; i < SEGL.length; i++) {
    const l = SEGL[i];
    if (s <= acc + l || i === SEGL.length - 1) {
      const a = LINE[i],
        b = LINE[i + 1],
        ux = (b[0] - a[0]) / l,
        uz = (b[1] - a[1]) / l,
        t = s - acc;
      return [a[0] + ux * t - uz * off, a[1] + uz * t + ux * off];
    }
    acc += l;
  }
  return LINE[0];
};
// 世界座標 → [s, off]（取最近的那一段）
const SO = (x, z) => {
  let best = null,
    acc = 0;
  for (let i = 0; i < SEGL.length; i++) {
    const a = LINE[i],
      b = LINE[i + 1],
      l = SEGL[i],
      ux = (b[0] - a[0]) / l,
      uz = (b[1] - a[1]) / l;
    const t = Math.min(l, Math.max(0, (x - a[0]) * ux + (z - a[1]) * uz)),
      d = Math.hypot(x - a[0] - ux * t, z - a[1] - uz * t);
    if (!best || d < best[0]) best = [d, acc + t, -(x - a[0]) * uz + (z - a[1]) * ux];
    acc += l;
  }
  return [best[1], best[2]];
};
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// a→b 上比例 t 的點，再往行進方向的右手邊（順時針 90°）偏 v 公尺
const side = (a, b, t, v) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    l = Math.hypot(dx, dz) || 1;
  return [a[0] + dx * t - (dz / l) * v, a[1] + dz * t + (dx / l) * v];
};
// 北車道口（遊戲沒有這條路的資料）：中心線從巷子的轉折處往東南走。DW(t, v)＝離巷子中心線 t 公尺、往西南側偏 v 公尺
const DO = A(398.5, 0),
  DD = [0.69, 0.724],
  DP = [-0.724, 0.69],
  DHALF = 3.5;
const DW = (t, v = 0) => [DO[0] + DD[0] * t + DP[0] * v, DO[1] + DD[1] * t + DP[1] * v];
const dwV = (p) => (p[0] - DO[0]) * DP[0] + (p[1] - DO[1]) * DP[1],
  dwT = (p) => (p[0] - DO[0]) * DD[0] + (p[1] - DO[1]) * DD[1];
// 安全島北端尖角：東側緣石（off 4.6）碰到車道口西南緣的地方
const CURB = 4.6,
  ESET = 6.4,
  DCURB = DHALF + 0.4;
let STIP = 380;
while (STIP < 397 && dwV(A(STIP, CURB)) > DCURB) STIP += 0.25;
const TIP = A(STIP, CURB),
  TTIP = dwT(TIP);
// 籃排球場頂棚的輪廓（src/world/Court.js 的 ROOF，(u, v) 座標）：種樹時用來避開
const CE = { o: [191.14, -371.82], d: [0.2234, 0.9747] };
const roofGap = (x, z) => {
  // 離頂棚輪廓多遠（公尺，負的＝在頂棚底下）；頂棚是 L 形：北半塊往東突出到 v 24、南半塊只到 v 9.6
  const dx = x - CE.o[0],
    dz = z - CE.o[1],
    u = dx * CE.d[0] + dz * CE.d[1],
    v = dx * CE.d[1] - dz * CE.d[0];
  if (u < -47 || u > 53.4) return 99;
  const north = u <= 20.4 ? v - 24 : v <= 24 ? u - 20.4 : Math.hypot(u - 20.4, v - 24);
  return u <= 20.4 ? north : Math.min(north, v - 9.6);
};
// 西側鋼管圍籬離中心線的距離：南段 6.5，到頂棚東南角前收到 5.0，再接帆布圍籬的 5.6
const wFence = (s) =>
  s <= 370
    ? 6.5
    : s <= 376.7
      ? 6.5 - (1.5 * (s - 370)) / 6.7
      : s <= 380
        ? 5.0
        : 5.0 + (0.6 * (s - 380)) / 6;
// 安全島東邊的米色長條平房（屋頂鋪滿太陽能板，正射 17×4.5 m，長邊朝東北；Google 地圖標「污水處理場」的設施）
const LONG = { c: [250.6, -344.4], d: [0.85, -0.527], half: 8.5, w: 4.5 };
const longPt = (t, v) => [
  LONG.c[0] + LONG.d[0] * t - LONG.d[1] * v,
  LONG.c[1] + LONG.d[1] * t + LONG.d[0] * v,
];

export default {
  // f701（標 3 樓）實景是灰色帆布圍籬、綠籬與榕樹排；f700（標 1 樓）實景是菜園後面的草地
  drop: ['f701', 'f700'],
  ownSign: [],
  lots: [],

  custom(C) {
    const { THREE, VC, lcg, sg, paint, paintGeo } = C;
    const PI = Math.PI,
      FONT = (px) => `900 ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    // ---- 開 Kit 與幾何小工具（全部吃世界座標）----
    const K = (p) => {
      // 在世界座標 p 開一個 Kit（地面高度取這一點）
      const [s, off] = SO(p[0], p[1]),
        k = C.kit(REF, s - 0.01, s + 0.01, off < 0 ? -1 : 1, Math.max(0.05, Math.abs(off)));
      if (typeof k.w !== 'function') delete k.w; // C.kit 把寬度寫進 k.w 會蓋掉 Kit.w()（碰撞要用），拿掉讓原型方法回來
      return k;
    };
    const L = (k, p) => k.l(p[0], p[1]);
    const part = (k, g, hex) => k._part(VC, paintGeo(g, hex));
    // a→b 一條方塊：厚 th、高 y0～y1；col 預設有碰撞（薄的一條線、厚的圍一圈）
    const slab = (k, a, b, th, y0, y1, hex, col = true) => {
      const [x0, z0] = L(k, a),
        [x1, z1] = L(k, b),
        dx = x1 - x0,
        dz = z1 - z0,
        len = Math.hypot(dx, dz);
      if (len < 0.01) return;
      const g = new THREE.BoxGeometry(len, y1 - y0, th);
      g.rotateY(-Math.atan2(dz, dx));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      part(k, g, hex);
      if (!col) return;
      if (th < 0.5) {
        k.wallLine(x0, z0, x1, z1, y0, y1);
        return;
      }
      const nx = ((-dz / len) * th) / 2,
        nz = ((dx / len) * th) / 2,
        c = [
          [x0 + nx, z0 + nz],
          [x1 + nx, z1 + nz],
          [x1 - nx, z1 - nz],
          [x0 - nx, z0 - nz],
        ];
      c.forEach((q, i) => {
        const r = c[(i + 1) % 4];
        k.wallLine(q[0], q[1], r[0], r[1], y0, y1);
      });
    };
    const cyl = (k, p, r, y0, y1, hex, o) => {
      const [x, z] = L(k, p);
      return k.cyl(x, z, r, y0, y1, hex, o);
    };
    const blob = (k, p, y, rx, ry, rz, hex) => {
      const [x, z] = L(k, p),
        g = new THREE.SphereGeometry(1, 7, 5);
      g.scale(rx, ry, rz);
      g.translate(x, y, z);
      part(k, g, hex);
    };
    // 在 p 立一片面向世界座標 to 的牌子
    const plane = (k, tex, w, h, p, y, to, o) => {
      const [x, z] = L(k, p),
        [tx, tz] = L(k, to);
      return k.plane(tex, w, h, x, y, z, Math.atan2(tx - x, tz - z), o);
    };
    // 沿 a→b 立一片雙面的網／布
    const pane = (k, tex, a, b, y0, y1, o) => {
      const [x0, z0] = L(k, a),
        [x1, z1] = L(k, b);
      return k.plane(
        tex,
        Math.hypot(x1 - x0, z1 - z0),
        y1 - y0,
        (x0 + x1) / 2,
        (y0 + y1) / 2,
        (z0 + z1) / 2,
        -Math.atan2(z1 - z0, x1 - x0),
        { transparent: true, double: true, ...o }
      );
    };
    // 橫躺的圓筒（a→b 是軸）
    const tube = (k, a, b, r, y, hex, seg = 12) => {
      const [x0, z0] = L(k, a),
        [x1, z1] = L(k, b),
        g = new THREE.CylinderGeometry(r, r, Math.hypot(x1 - x0, z1 - z0), seg);
      g.rotateZ(PI / 2);
      g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
      g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      part(k, g, hex);
    };
    const GREEN = ['#3f7a3a', '#4b8a3e', '#356b34', '#5a8f45'],
      BANYAN = ['#33703a', '#3f8040', '#2f6634', '#4a8c44'];
    const tree = (p, h, r, rnd, cols = GREEN, k = K(p)) => {
      cyl(k, p, 0.1 + r * 0.05, -1.5, h, '#6a4a30', { seg: 6 });
      for (const [ds, dy, dz, f] of [
        [0, 0.5, 0, 1],
        [-0.7, -0.5, 0.35, 0.8],
        [0.75, -0.3, -0.3, 0.85],
      ])
        blob(
          k,
          [p[0] + ds * r, p[1] + dz * r],
          h + dy * r,
          r * f,
          r * f * 0.8,
          r * f,
          cols[(rnd() * cols.length) | 0]
        );
    };
    // 大榕樹：粗樹幹與氣根，樹冠從離地兩三公尺一路長到樹頂，幾團連成一片綠牆
    const banyan = (p, h, r, rnd, low = 0.16) => {
      // low＝樹冠底部在樹高的幾成
      const k = K(p),
        cy = (h * (1 + low)) / 2,
        ry = (h * (1 - low)) / 2;
      cyl(k, p, 0.42, -1.5, h * 0.6, '#5a4636', { seg: 7, col: true });
      for (let i = 0; i < 3; i++)
        cyl(
          k,
          [p[0] + (rnd() - 0.5) * 1.2, p[1] + (rnd() - 0.5) * 1.2],
          0.09,
          -1,
          h * 0.4,
          '#6a5442',
          { seg: 5 }
        ); // 氣根
      for (const [ds, dy, dz, f] of [
        [0, 0.12, 0, 1],
        [-0.7, -0.1, 0.3, 0.8],
        [0.68, -0.06, -0.32, 0.82],
        [0.1, -0.14, 0.72, 0.76],
        [-0.18, -0.12, -0.72, 0.76],
      ])
        blob(
          k,
          [p[0] + ds * r, p[1] + dz * r],
          cy + dy * ry,
          r * f,
          ry * (0.8 + f * 0.2),
          r * f,
          BANYAN[(rnd() * 4) | 0]
        );
    };
    const pole = (p, h = 9, lampTo = null, r = 0.15, stripe = false) => {
      // 水泥電桿；lampTo 給世界座標就加一支伸過去的路燈；stripe＝下段黃黑斜紋
      const k = K(p);
      cyl(k, p, r, -1.5, h, '#a9a79f', { seg: 8, col: true });
      if (stripe)
        for (let i = 0; i < 4; i++)
          cyl(k, p, r + 0.012, 0.3 + i * 0.32, 0.62 + i * 0.32, i % 2 ? '#1c1c1e' : '#d8b02a', {
            seg: 8,
          });
      if (lampTo) {
        const e = lerp(
          p,
          lampTo,
          Math.min(1, 2.2 / Math.hypot(lampTo[0] - p[0], lampTo[1] - p[1]))
        );
        slab(k, p, e, 0.08, h - 0.5, h - 0.42, '#8d9196', false);
        slab(k, lerp(p, e, 0.75), e, 0.3, h - 0.62, h - 0.5, '#e8e6dc', false);
      }
      return k;
    };
    const car = (a, b, hex) => {
      // 停著的車：a 車尾、b 車頭 → 交給統一停放車輛系統
      const mid = lerp(a, b, 0.5);
      K(mid).I.addCar(mid[0], mid[1], Math.atan2(b[0] - a[0], b[1] - a[1]), hex);
    };
    // 柵欄機＋紅白柵欄桿（m 機箱位置、e 桿尾）；桿子不加碰撞，車與人照樣能過
    const barrier = (m, e, hex) => {
      const k = K(m);
      slab(
        k,
        side(m, e, 0, 0),
        lerp(m, e, 0.4 / Math.hypot(e[0] - m[0], e[1] - m[1])),
        0.4,
        -0.5,
        1.1,
        hex
      );
      const n = Math.max(2, Math.round(Math.hypot(e[0] - m[0], e[1] - m[1]) / 0.5));
      for (let i = 0; i < n; i++)
        slab(
          k,
          lerp(m, e, i / n),
          lerp(m, e, (i + 1) / n),
          0.07,
          0.92,
          1.02,
          i % 2 ? '#f2f0ea' : '#d2342c',
          false
        );
    };
    // ---- 貼圖 ----
    const T = {
      pipe: () =>
        sg('xzL3pipe', 256, 128, (g) => {
          // 舊鍍鋅鋼管圍籬：頂端與中間兩道橫管、三根立管，後面菱形鐵網
          g.clearRect(0, 0, 256, 128);
          g.strokeStyle = 'rgba(160,163,158,.55)';
          g.lineWidth = 1;
          for (let i = -128; i < 256; i += 9) {
            g.beginPath();
            g.moveTo(i, 0);
            g.lineTo(i + 128, 128);
            g.stroke();
            g.beginPath();
            g.moveTo(i + 128, 0);
            g.lineTo(i, 128);
            g.stroke();
          }
          g.fillStyle = '#9a9c98';
          g.fillRect(0, 0, 256, 7);
          g.fillRect(0, 60, 256, 6);
          g.fillRect(0, 122, 256, 4);
          for (const x of [0, 124, 249]) g.fillRect(x, 0, 7, 128);
        }),
      canvas: () =>
        sg('xzL3canvas2', 256, 128, (g) => {
          // 灰色防塵網布：有水漬與皺褶，下緣透空
          g.clearRect(0, 0, 256, 128);
          g.fillStyle = '#8a8377';
          g.fillRect(0, 0, 256, 116);
          const r = lcg(3071);
          for (let i = 0; i < 26; i++) {
            const x = r() * 256,
              w = 6 + r() * 26;
            g.fillStyle = `rgba(${r() < 0.5 ? '60,60,58' : '200,198,190'},${0.05 + r() * 0.1})`;
            g.fillRect(x, 0, w, 116);
          }
          for (let i = 0; i < 9; i++) {
            g.fillStyle = 'rgba(40,40,38,.16)';
            g.fillRect(0, 8 + i * 12 + r() * 4, 256, 1.5);
          }
          g.fillStyle = 'rgba(60,58,54,.3)';
          g.fillRect(0, 100, 256, 16);
          g.fillStyle = '#9a9c98';
          for (const x of [0, 126, 251]) g.fillRect(x, 0, 5, 128);
          g.fillRect(0, 0, 256, 4);
        }),
      block: () =>
        sg('xzL3block', 256, 64, (g) => {
          // 水泥鏤空花磚基座：一格一朵三葉／圓弧鏤空
          g.fillStyle = '#b9b6ae';
          g.fillRect(0, 0, 256, 64);
          for (let x = 0; x < 256; x += 32) {
            g.fillStyle = '#a5a29a';
            g.fillRect(x, 0, 2, 64);
            g.fillStyle = '#55554f';
            for (const [cx, cy] of [
              [16, 20],
              [9, 34],
              [23, 34],
            ]) {
              g.beginPath();
              g.arc(x + cx, cy + 4, 6.2, 0, 7);
              g.fill();
            }
            g.fillStyle = '#b9b6ae';
            g.beginPath();
            g.arc(x + 16, 34, 3, 0, 7);
            g.fill();
          }
          g.fillStyle = '#c9c6be';
          g.fillRect(0, 0, 256, 7);
          g.fillRect(0, 57, 256, 7);
        }),
      gmesh: () =>
        sg('xzL3gmesh2', 256, 128, (g) => {
          // 深綠塑膠包覆菱形網
          g.clearRect(0, 0, 256, 128);
          g.fillStyle = 'rgba(34,48,46,.5)';
          g.fillRect(0, 0, 256, 128);
          g.strokeStyle = 'rgba(40,62,56,.95)';
          g.lineWidth = 1.8;
          for (let i = -128; i < 256; i += 8) {
            g.beginPath();
            g.moveTo(i, 0);
            g.lineTo(i + 128, 128);
            g.stroke();
            g.beginPath();
            g.moveTo(i + 128, 0);
            g.lineTo(i, 128);
            g.stroke();
          }
          g.fillStyle = '#3f5a50';
          g.fillRect(0, 0, 256, 4);
          g.fillRect(0, 124, 256, 4);
        }),
      shade: () =>
        sg('xzL3shade', 64, 64, (g) => {
          g.clearRect(0, 0, 64, 64);
          g.fillStyle = 'rgba(38,42,43,.9)';
          g.fillRect(0, 0, 64, 64);
          g.fillStyle = 'rgba(0,0,0,.25)';
          for (let y = 0; y < 64; y += 6) g.fillRect(0, y, 64, 1.5);
        }), // 黑色遮陽網
      smesh: () =>
        sg('xzL3smesh', 256, 128, (g) => {
          // 銀色鋼管框鐵網，下半蓋黑色遮陽網
          g.clearRect(0, 0, 256, 128);
          g.strokeStyle = 'rgba(190,194,196,.7)';
          g.lineWidth = 1;
          for (let x = 0; x < 256; x += 8) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, 128);
            g.stroke();
          }
          for (let y = 0; y < 128; y += 8) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(256, y);
            g.stroke();
          }
          g.fillStyle = 'rgba(38,42,43,.88)';
          g.fillRect(0, 62, 256, 66);
          g.fillStyle = '#c4c8ca';
          g.fillRect(0, 0, 256, 6);
          for (const x of [0, 125, 250]) g.fillRect(x, 0, 6, 128);
        }),
      rmesh: () =>
        sg('xzL3rmesh', 256, 128, (g) => {
          // 紅框鐵網圍籬
          g.clearRect(0, 0, 256, 128);
          g.strokeStyle = 'rgba(150,150,146,.6)';
          g.lineWidth = 1;
          for (let x = 0; x < 256; x += 8) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, 128);
            g.stroke();
          }
          for (let y = 0; y < 128; y += 8) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(256, y);
            g.stroke();
          }
          g.fillStyle = '#c0392b';
          g.fillRect(0, 0, 256, 6);
          g.fillRect(0, 122, 256, 6);
          for (const x of [0, 125, 250]) g.fillRect(x, 0, 6, 128);
        }),
      wire: () =>
        sg('xzL3wire', 128, 64, (g) => {
          g.clearRect(0, 0, 128, 64);
          g.fillStyle = 'rgba(120,122,120,.9)';
          for (const y of [6, 24, 42, 58]) g.fillRect(0, y, 128, 1.6);
        }), // 幾道鐵絲
      rust: () =>
        sg('xzL3rust', 64, 64, (g) => {
          g.clearRect(0, 0, 64, 64);
          g.fillStyle = '#5a3a34';
          for (let x = 3; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
          g.fillRect(0, 2, 64, 4);
          g.fillRect(0, 56, 64, 4);
        }), // 鏽褐色直條鐵柵
      slatH: () =>
        sg('xzL3slatH', 128, 256, (g) => {
          // 紅褐色橫條板（0.15 m 一條）
          g.fillStyle = '#8f4f3e';
          g.fillRect(0, 0, 128, 256);
          const r = lcg(3079);
          for (let y = 0; y < 256; y += 12.8) {
            g.fillStyle = `rgba(${r() < 0.5 ? '255,220,200' : '50,20,10'},${0.04 + r() * 0.08})`;
            g.fillRect(0, y, 128, 11);
            g.fillStyle = 'rgba(40,18,10,.5)';
            g.fillRect(0, y + 11, 128, 1.8);
          }
        }),
      corr: (hex, n) =>
        sg(`xzL3corr${hex}${n}`, 512, 32, (g) => {
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
      board: () =>
        sg('xzL3board', 1024, 240, (g) => {
          // 鋼架棚上的看板：左 3/4 深灰底校徽＋「中原大學」，右 1/4 橘底「C3」（英文與小字看不清，不寫）
          g.fillStyle = '#4b4f55';
          g.fillRect(0, 0, 768, 240);
          g.fillStyle = '#d5622b';
          g.fillRect(768, 0, 256, 240);
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(118, 120, 74, 0, 7);
          g.fill();
          g.fillStyle = '#2a5aa0';
          g.beginPath();
          g.arc(118, 120, 62, 0, 7);
          g.fill();
          g.strokeStyle = '#ffffff';
          g.lineWidth = 7;
          g.beginPath();
          g.moveTo(118, 78);
          g.lineTo(118, 162);
          g.moveTo(88, 108);
          g.lineTo(148, 108);
          g.stroke();
          g.fillStyle = '#ffffff';
          g.textBaseline = 'middle';
          g.textAlign = 'left';
          g.font = FONT(118);
          g.fillText('中原大學', 226, 124);
          g.textAlign = 'center';
          g.font = FONT(120);
          g.fillText('C3', 896, 112);
        }),
      heat: () =>
        sg('xzL3heat', 128, 640, (g) => {
          // 「熱誠樓」指示柱：頂端黃底藍箭頭，柱身灰藍底黃字直書（旁邊的白色小字看不清，不寫）
          g.fillStyle = '#6f7885';
          g.fillRect(0, 0, 128, 640);
          g.fillStyle = '#e2b33c';
          g.fillRect(0, 0, 128, 118);
          g.fillStyle = '#2a4f9a';
          g.beginPath();
          g.moveTo(22, 46);
          g.lineTo(70, 46);
          g.lineTo(70, 24);
          g.lineTo(110, 59);
          g.lineTo(70, 94);
          g.lineTo(70, 72);
          g.lineTo(22, 72);
          g.closePath();
          g.fill();
          g.fillStyle = '#e8c04a';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.font = FONT(92);
          ['熱', '誠', '樓'].forEach((ch, i) => g.fillText(ch, 64, 200 + i * 112));
        }),
      diamond: () =>
        sg('xzL3diamond', 128, 128, (g) => {
          // 橘黃色菱形警告牌（黑色人形，沒有字）
          g.clearRect(0, 0, 128, 128);
          g.fillStyle = '#f0a020';
          g.beginPath();
          g.moveTo(64, 2);
          g.lineTo(126, 64);
          g.lineTo(64, 126);
          g.lineTo(2, 64);
          g.closePath();
          g.fill();
          g.strokeStyle = '#1c1c1e';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(64, 10);
          g.lineTo(118, 64);
          g.lineTo(64, 118);
          g.lineTo(10, 64);
          g.closePath();
          g.stroke();
          g.fillStyle = '#1c1c1e';
          g.beginPath();
          g.arc(64, 40, 8, 0, 7);
          g.fill();
          g.fillRect(58, 50, 12, 28);
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(61, 76);
          g.lineTo(52, 100);
          g.moveTo(67, 76);
          g.lineTo(76, 100);
          g.moveTo(58, 56);
          g.lineTo(44, 70);
          g.moveTo(70, 56);
          g.lineTo(84, 70);
          g.stroke();
        }),
      ring: (key, draw) =>
        sg(`xzL3ring${key}`, 128, 128, (g) => {
          // 紅圈白底圓牌，中間圖案自己畫
          g.clearRect(0, 0, 128, 128);
          g.fillStyle = '#d8232a';
          g.beginPath();
          g.arc(64, 64, 62, 0, 7);
          g.fill();
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(64, 64, 48, 0, 7);
          g.fill();
          draw(g);
        }),
      noCar: () =>
        sg('xzL3noCar', 128, 128, (g) => {
          // 紅圈紅斜線、中間黑色汽車（禁止汽車進入）
          g.clearRect(0, 0, 128, 128);
          g.fillStyle = '#d8232a';
          g.beginPath();
          g.arc(64, 64, 62, 0, 7);
          g.fill();
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(64, 64, 48, 0, 7);
          g.fill();
          g.fillStyle = '#1c1c1e';
          g.fillRect(34, 62, 60, 18);
          g.fillRect(44, 48, 40, 16);
          g.beginPath();
          g.arc(46, 82, 8, 0, 7);
          g.arc(82, 82, 8, 0, 7);
          g.fill();
          g.strokeStyle = '#d8232a';
          g.lineWidth = 9;
          g.beginPath();
          g.moveTo(30, 30);
          g.lineTo(98, 98);
          g.stroke();
        }),
      noSmoke: () =>
        sg('xzL3noSmoke', 128, 128, (g) => {
          // 白底紅圈禁菸方牌（只有圖案）
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, 128, 128);
          g.fillStyle = '#2a2a2a';
          g.fillRect(34, 58, 50, 12);
          g.fillStyle = '#b0b0b0';
          g.fillRect(84, 58, 10, 12);
          g.strokeStyle = '#d8232a';
          g.lineWidth = 10;
          g.beginPath();
          g.arc(64, 64, 46, 0, 7);
          g.stroke();
          g.beginPath();
          g.moveTo(31, 31);
          g.lineTo(97, 97);
          g.stroke();
        }),
    };
    const speed30 = T.ring('30', (g) => {
      g.fillStyle = '#1c1c1e';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FONT(60);
      g.fillText('30', 64, 68);
    });
    const noLeft = T.ring('noLeft', (g) => {
      // 禁止左轉：黑色左彎箭頭＋紅斜線
      g.strokeStyle = '#1c1c1e';
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(80, 100);
      g.lineTo(80, 58);
      g.lineTo(46, 58);
      g.stroke();
      g.fillStyle = '#1c1c1e';
      g.beginPath();
      g.moveTo(28, 58);
      g.lineTo(50, 42);
      g.lineTo(50, 74);
      g.closePath();
      g.fill();
      g.strokeStyle = '#d8232a';
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(30, 30);
      g.lineTo(98, 98);
      g.stroke();
    });
    // 立桿上的圓牌／方牌：面向世界座標 to
    const signPost = (p, tex, to, y = 2.3, size = 0.65, h = 2.7, hex = '#8d9196') => {
      const k = K(p);
      cyl(k, p, 0.035, -1, h, hex, { seg: 6 });
      plane(k, tex, size, size, lerp(p, to, 0.06 / Math.hypot(to[0] - p[0], to[1] - p[1])), y, to, {
        transparent: true,
        double: true,
      });
      return k;
    };
    // 貼地的鋪面（s0～s1、off o0～o1）：地面有坡度，切成沿路 3 m、橫向 1.5 m 以內的小塊，各自取自己那一點的地面高
    const ground = (s0, s1, o0, o1, hex, y = 0.045) => {
      const ns = Math.max(1, Math.ceil((s1 - s0) / 3)),
        no = Math.max(1, Math.ceil(Math.abs(o1 - o0) / 1.5)),
        ds = (s1 - s0) / ns,
        dO = (o1 - o0) / no;
      for (let i = 0; i < ns; i++)
        for (let j = 0; j < no; j++) {
          const oc = o0 + dO * (j + 0.5),
            sa = s0 + ds * i,
            k = K(A(sa + ds / 2, oc));
          slab(k, A(sa, oc), A(sa + ds + 0.02, oc), Math.abs(dO) + 0.02, -0.5, y, hex, false);
        }
    };
    // 一串點連成的圍籬：each(k, a, b, i) 畫一片
    const run = (pts, each) => {
      for (let i = 0; i < pts.length - 1; i++) each(K(pts[i]), pts[i], pts[i + 1], i);
    };
    const along = (s0, s1, step, off) => {
      const n = Math.max(1, Math.round((s1 - s0) / step)),
        out = [];
      for (let i = 0; i <= n; i++) {
        const s = s0 + ((s1 - s0) * i) / n;
        out.push(A(s, typeof off === 'function' ? off(s) : off));
      }
      return out;
    };

    // =====================================================================================
    // 東側（靠校園）
    // =====================================================================================
    // ---- E1 南車道口（往校園的岔路，遊戲有這條路）：路口北側米色柵欄機＋橫在車道上的紅白柵欄桿、黃色矮柱、水泥車阻 ----
    {
      const m = [237.5, -326.9],
        e = [237.5, -322.6];
      barrier(m, e, '#d9cdb6');
      const k = K(m);
      slab(k, [236.45, -326.75], [236.75, -326.75], 0.3, -0.5, 0.9, '#d9b12c');
      slab(k, [238.3, -326.9], [239.1, -326.9], 0.3, -0.3, 0.3, '#b9b6ae');
    }
    // ---- E2 s349–355：安全島南端的方管鋼架棚（6 根柱、兩道橫欄杆、深色格柵平頂），架高平台上橫放米白色舊槽體；
    //      面向巷子那一面掛橫式看板「中原大學｜C3」----
    {
      const s0 = 349,
        s1 = 355,
        o0 = 11,
        o1 = 15,
        k = K(A(352, 13)),
        ST = '#3f4245';
      for (const s of [s0 + 0.08, 352, s1 - 0.08])
        for (const o of [o0 + 0.08, o1 - 0.08]) cyl(k, A(s, o), 0.07, -1, 3.7, ST, { seg: 4 });
      for (const y of [0.95, 1.6, 3.52]) {
        for (const o of [o0 + 0.08, o1 - 0.08])
          slab(k, A(s0, o), A(s1, o), 0.06, y, y + 0.07, ST, false);
        for (const s of [s0 + 0.08, s1 - 0.08])
          slab(k, A(s, o0), A(s, o1), 0.06, y, y + 0.07, ST, false);
      }
      slab(k, A(s0 - 0.25, 13), A(s1 + 0.25, 13), o1 - o0 + 0.5, 3.6, 3.72, '#2e2f31', false);
      slab(k, A(s0 + 0.5, 13), A(s1 - 0.5, 13), 2.6, 0.5, 0.66, '#6a6c6e', false); // 架高平台
      for (const s of [s0 + 0.7, 352, s1 - 0.7])
        for (const o of [12, 14]) cyl(k, A(s, o), 0.06, -1, 0.5, '#6a6c6e', { seg: 4 });
      slab(k, A(s0 + 0.8, 13), A(s1 - 0.8, 13), 1.9, 0.66, 2.55, '#cfc8b8', false); // 舊槽體（圓角方槽，有鏽斑）
      for (const o of [12.05, 13.95])
        tube(k, A(s0 + 0.8, o), A(s1 - 0.8, o), 0.12, 2.47, '#cfc8b8', 8);
      for (const [s, y, w] of [
        [350.6, 1.2, 0.5],
        [352.9, 1.9, 0.35],
        [353.6, 0.95, 0.6],
      ])
        slab(k, A(s, 12.03), A(s + w, 12.03), 0.03, y, y + 0.4, '#a8866a', false);
      k.wallLine(...L(k, A(s0 + 0.5, 11.7)), ...L(k, A(s1 - 0.5, 11.7)), 0, 2.6);
      k.wallLine(...L(k, A(s0 + 0.5, 14.3)), ...L(k, A(s1 - 0.5, 14.3)), 0, 2.6);
      slab(k, A(349.85, o0 - 0.02), A(353.15, o0 - 0.02), 0.05, 0.93, 1.72, ST, false); // 看板底框
      plane(k, T.board(), 3.2, 0.75, A(351.5, o0 - 0.06), 1.325, A(351.5, 0), { emissive: 0.25 });
    }
    // ---- E3 s352–尖角：紅磚矮緣石（高 0.45，夾白色／灰色石塊）圍著草地大樹安全島：南端沿南車道口往東彎，北端在北車道口收成尖角再沿車道往東南 ----
    {
      const r = lcg(3103),
        south = [[240.5, -327.0], [232, -327.3], [229.6, -327.7], [228.6, -328.6], A(350.5, CURB)];
      const brick = [...south, ...along(352.5, STIP, 2.4, CURB)],
        nb = brick.length - 1;
      const pts = [...brick, ...[2.2, 4.5, 7, 9.5, 12, 14.5].map((d) => DW(TTIP + d, DCURB))];
      run(pts, (k, a, b, i) => {
        if (i >= nb) {
          slab(k, a, b, 0.3, -0.6, 0.2, '#aeb0a8', false);
          return;
        } // 尖角往車道口裡面是灰色水泥矮緣石
        slab(k, a, b, 0.35, -0.6, 0.45, i % 3 === 1 ? '#8f6457' : '#9a5a4a', false); // 矮緣石不加碰撞，人跨得過去
        if (i % 2 === 0) {
          const t = 0.2 + r() * 0.5,
            w = 0.5 / Math.hypot(b[0] - a[0], b[1] - a[1]);
          slab(
            k,
            lerp(a, b, t),
            lerp(a, b, t + w),
            0.37,
            0.1,
            0.47,
            r() < 0.5 ? '#bdb8ae' : '#9f9c94',
            false
          );
        }
      });
      signPost(A(356, 6.3), T.noSmoke(), A(356, 0), 1.25, 0.5, 1.5); // 草地上的禁菸牌
      {
        const p = A(372, 5.1),
          k = K(p);
        cyl(k, p, 0.03, -1, 1.1, '#8d9196', { seg: 6 });
        slab(k, A(371.75, 5.05), A(372.25, 5.05), 0.03, 0.75, 1.15, '#e2b33c', false);
      } // 黃色警告牌（字看不清，不寫）
      banyan(A(376.5, 9.6), 12.5, 4.8, r, 0.36); // 特別粗的老榕樹
      for (const [s, o] of [
        [361, 14],
        [367.5, 15],
      ]) {
        // 混凝土野餐桌椅
        const k = K(A(s, o));
        slab(k, A(s - 0.8, o), A(s + 0.8, o), 0.8, 0.66, 0.75, '#b9b6ae');
        slab(k, A(s - 0.15, o), A(s + 0.15, o), 0.3, -0.5, 0.66, '#a9a69e', false);
        for (const d of [-0.75, 0.75]) {
          slab(k, A(s - 0.8, o + d), A(s + 0.8, o + d), 0.32, 0.38, 0.45, '#b9b6ae', false);
          slab(k, A(s - 0.5, o + d), A(s + 0.5, o + d), 0.12, -0.5, 0.38, '#a9a69e', false);
        }
      }
      {
        const p = A(STIP - 3, CURB + 1.1),
          to = A(STIP + 14, -1),
          k = signPost(p, T.noCar(), to, 2.2, 0.6); // 尖角的「禁止汽車進入」圓牌（朝北，給從普忠路進來的車看）＋白色附牌（字看不清，不寫）
        plane(
          k,
          sg('xzL3blank', 32, 32, (g) => {
            g.fillStyle = '#f2f0ea';
            g.fillRect(0, 0, 32, 32);
          }),
          0.3,
          0.42,
          lerp(p, to, 0.06 / Math.hypot(to[0] - p[0], to[1] - p[1])),
          1.6,
          to,
          { double: true }
        );
      }
      // 安全島上的喬木（遊戲在這塊 wood 區只種了零星幾棵，照街景補：樹幹細直、樹冠在 5～10 m 高連成一片，蓋到路面上方）
      for (const [s, o, h, rr] of [
        [353.9, 8.0, 8.5, 3.0],
        [357.5, 7.6, 9.5, 3.4],
        [361.5, 7.2, 9, 3.2],
        [366.5, 8.4, 10, 3.6],
        [371, 7, 9, 3.2],
        [381.5, 7.6, 9.5, 3.4],
        [386, 9.5, 8.5, 3.0],
        [358.5, 16.5, 9.5, 3.4],
        [365, 19.5, 10, 3.6],
        [372.5, 14.5, 9.5, 3.4],
        [379.5, 15, 10, 3.6],
        [385, 16.5, 9, 3.2],
        [353, 18.5, 9, 3.2],
      ])
        tree(A(s, o), h, rr, r);
    }
    // ---- E3b 安全島東邊的米色長條平房（只做量體）：平屋頂出簷、屋頂鋪深色太陽能板，面向巷子（西北）這面一排深色門窗 ----
    {
      const H = LONG.half,
        k = K(LONG.c);
      slab(k, longPt(-H, 0), longPt(H, 0), LONG.w, -1.5, 3.0, '#cdbfa6');
      slab(k, longPt(-H - 0.5, 0), longPt(H + 0.5, 0), LONG.w + 1.2, 3.0, 3.2, '#b5b0a6', false);
      slab(k, longPt(-H - 0.3, 0), longPt(H + 0.3, 0), LONG.w + 0.8, 3.2, 3.28, '#2c3440', false);
      for (const t of [-6, -2.2, 1.6, 5.4])
        slab(
          k,
          longPt(t, -LONG.w / 2 - 0.03),
          longPt(t + 1.3, -LONG.w / 2 - 0.03),
          0.06,
          t === 1.6 ? 0 : 1.0,
          2.2,
          '#3a3d40',
          false
        );
    }
    // ---- E4 北車道口（s 390～400，遊戲沒有這條路）：柏油車道、兩線中間一排水泥小緣石、每線一支黃色柵欄機＋紅白柵欄桿 ----
    {
      // 柏油板切成 1 m × 0.93 m 的小塊，四個角離巷子中心線都超過 3.9 m 才鋪（轉彎內側不能蓋到巷子自己的路面）
      for (let t = 3.4; t < 23; t += 1)
        for (const v of [-3.26, -2.33, -1.4, -0.47, 0.47, 1.4, 2.33, 3.26]) {
          if (
            [
              [t, v - 0.47],
              [t, v + 0.47],
              [t + 1, v - 0.47],
              [t + 1, v + 0.47],
            ].some(([tt, vv]) => Math.abs(SO(...DW(tt, vv))[1]) < 3.9)
          )
            continue;
          const k = K(DW(t + 0.5, v));
          slab(k, DW(t, v), DW(t + 1.02, v), 0.95, -0.5, 0.05, '#4b4c50', false);
        }
      for (let t = 5.2; t < 22; t += 1.1)
        cyl(K(DW(t, 0)), DW(t, 0), 0.07, -0.3, 0.55, '#c9bd94', { seg: 6 }); // 兩線中間一排米黃色水泥矮柱（街景看是細柱，不是貼地緣石）
      for (const p of [DW(11, DCURB + 0.5), DW(13.5, -DHALF - 0.6)]) {
        const k = K(p);
        slab(k, [p[0] - 0.15, p[1]], [p[0] + 0.15, p[1]], 0.3, -0.5, 0.6, '#d9b12c');
      } // 車道兩邊各一根黃色矮柱
      pole(DW(12.2, -DHALF - 0.5), 6, DW(12.2, 0), 0.07); // 入口線旁的路燈
      barrier(DW(9.3, -DHALF + 0.1), DW(9.3, -0.35), '#e0a820'); // 入口線（北側）：機箱在小三角草地邊
      barrier(DW(19, DHALF - 0.1), DW(19, 0.35), '#e0a820'); // 出口線（南側）：更裡面
    }
    // ---- E5 s400–407：車道口北側的小三角草地上立「熱誠樓」灰藍指示柱；後面紅磚矮牆基座＋鏽褐色直條鐵柵沿車道往東南 ----
    {
      const p = DW(8.6, -4.7),
        k = K(p),
        to = A(391, 1.5),
        d = Math.hypot(to[0] - p[0], to[1] - p[1]),
        q = side(p, to, 0, 0.3),
        q2 = side(p, to, 0, -0.3);
      slab(k, q, q2, 0.15, -0.8, 3.0, '#6f7885');
      for (const sgn of [1, -1])
        plane(k, T.heat(), 0.6, 3.0, lerp(p, to, (sgn * 0.085) / d), 1.5, lerp(p, to, sgn), {
          emissive: 0.15,
        });
      const c0 = A(407, ESET),
        c1 = DW(11.6, -4.8),
        pts = [c0, lerp(c0, c1, 0.5), c1, ...[14.5, 17.5, 20.5, 23].map((t) => DW(t, -4.8))]; // 轉角斜著切過去，再沿車道北緣
      run(pts, (kk, a, b) => {
        slab(kk, a, b, 0.24, -0.8, 0.8, '#9c5a48');
        slab(
          kk,
          a,
          lerp(a, b, 0.3 / Math.hypot(b[0] - a[0], b[1] - a[1])),
          0.3,
          -0.8,
          2.05,
          '#9c5a48',
          false
        );
        pane(kk, T.rust(), a, b, 0.8, 2.0);
        kk.wallLine(...L(kk, a), ...L(kk, b), 0.8, 2.0);
      });
      const rt = lcg(3105);
      for (const [t, v, h, rr] of [
        [13.5, -8, 7.5, 2.8],
        [17.5, -7.6, 8.5, 3.2],
        [21.5, -8.4, 7.5, 2.8],
        [10, -10.5, 7, 2.6],
      ])
        tree(DW(t, v), h, rr, rt); // 鐵柵後面的樹
    }
    // ---- E6 s407–432：水泥鏤空花磚基座（高 0.7）＋水泥方柱＋深色菱形網圍籬（總高 2.1，網上蓋深色遮陽網）；離路 6 m，
    //      圍籬外是將近 2 m 寬的水泥溝蓋路肩；s 417.8～419.8 一扇淺灰綠鐵板門（單扇，兩側水泥門柱）；圍籬後是果樹 ----
    {
      const SET = ESET,
        panel = (a, b) => {
          const k = K(a);
          slab(k, a, b, 0.18, -0.8, 0.7, '#b9b6ae');
          pane(k, T.block(), side(a, b, 0, 0.1), side(a, b, 1, 0.1), 0, 0.7, {
            transparent: false,
          });
          pane(k, T.block(), side(a, b, 0, -0.1), side(a, b, 1, -0.1), 0, 0.7, {
            transparent: false,
          });
          slab(
            k,
            a,
            lerp(a, b, 0.2 / Math.hypot(b[0] - a[0], b[1] - a[1])),
            0.2,
            -0.8,
            2.12,
            '#c9c6be',
            false
          );
          pane(k, T.gmesh(), a, b, 0.7, 2.1);
          k.wallLine(...L(k, a), ...L(k, b), 0.7, 2.1);
        };
      const p1 = along(407, 417.6, 2.65, SET),
        p2 = along(420.1, 432, 2.4, SET);
      p1.slice(0, -1).forEach((a, i) => panel(a, p1[i + 1]));
      p2.slice(0, -1).forEach((a, i) => panel(a, p2[i + 1]));
      const g = K(A(418.8, SET)); // 鐵板門與水泥門柱
      for (const s of [417.55, 419.8])
        slab(g, A(s, SET), A(s + 0.3, SET), 0.32, -0.8, 2.3, '#c9c6be');
      slab(g, A(417.85, SET), A(419.8, SET), 0.07, 0.05, 2.05, '#a3b08c');
      slab(g, A(419.55, SET - 0.05), A(419.65, SET - 0.05), 0.04, 0.95, 1.1, '#6f7a5c', false);
      ground(406.5, 436, 3.95, SET - 0.1, '#9f9d96'); // 水泥溝蓋路肩
      const rt = lcg(3106); // 果樹（芒果、龍眼之類，街景量樹頂約 5～5.5 m，很密）
      for (const [s, o, h, rr] of [
        [408.3, 9.6, 2.9, 1.9],
        [411.2, 9, 3.3, 2.1],
        [414.2, 9.4, 2.9, 1.9],
        [417.2, 9.8, 3.1, 2],
        [420.2, 9.2, 2.8, 1.8],
        [423.2, 9, 3.2, 2.1],
        [426.2, 9.4, 2.9, 1.9],
        [429.2, 9, 3.1, 2],
        [432, 10.5, 2.9, 1.9],
        [409.8, 13.2, 3.4, 2.2],
        [413, 13.8, 3.2, 2.1],
        [416.2, 14.2, 3.4, 2.2],
        [418.8, 12.6, 3, 2],
        [429.5, 13.5, 3.2, 2.1],
        [432, 15.5, 3.1, 2],
        [427.8, 18.6, 3.4, 2.2],
        [423.3, 19.6, 3.5, 2.2],
        [418.5, 18.8, 3.4, 2.2],
        [413.5, 18.2, 3.3, 2.1],
      ])
        tree(A(s, o), h, rr, rt, rt() < 0.5 ? GREEN : ['#4b8a3e', '#5a8f45', '#3f7a3a']);
    }
    // E6 果園鐵皮屋、E6b 紅磚色大樓由普忠路那邊蓋（src/world/buildings/StreetPuzhong.js），這裡不再重複
    // ---- E7 s432–436：路口轉角的黃漆水泥矮牆（高 0.9）＋銀色鋼管框鐵網（下半蓋黑色遮陽網），轉角沿普忠路往東南；
    //      s≈433 黃黑斜紋水泥電桿掛「禁止左轉」圓牌、白色附牌（字看不清，不寫）、綠底白字直式路名牌、頂端喇叭；旁邊路燈桿與交通錐 ----
    {
      run(
        [A(432, ESET), A(434, ESET), A(436, ESET), A(436, 9), A(436, 12), A(436, 15)],
        (k, a, b) => {
          slab(k, a, b, 0.2, -0.8, 0.9, '#d6b23c');
          pane(k, T.smesh(), a, b, 0.9, 2.1);
          k.wallLine(...L(k, a), ...L(k, b), 0.9, 2.1);
        }
      );
      const p = A(433, 5.2),
        to = A(420, 0),
        k = pole(p, 8.5, null, 0.15, true),
        d = Math.hypot(to[0] - p[0], to[1] - p[1]),
        f = lerp(p, to, 0.2 / d);
      plane(k, noLeft, 0.7, 0.7, f, 2.75, to, { transparent: true, double: true });
      plane(
        k,
        sg('xzL3blank', 32, 32, (g) => {
          g.fillStyle = '#f2f0ea';
          g.fillRect(0, 0, 32, 32);
        }),
        0.45,
        0.3,
        f,
        2.15,
        to,
        { double: true }
      );
      const np = side(p, to, 0, -0.36),
        nameTex = paint('新\n中\n北\n路\n469\n巷', '#1f7a4a', '#ffffff', null, 0.3, 1.6);
      for (const sgn of [1, -1])
        plane(
          k,
          nameTex,
          0.3,
          1.6,
          side(np, lerp(np, to, 1), 0, sgn * 0.02),
          3.9,
          side(np, lerp(np, to, 1), 0, sgn * 5),
          { emissive: 0.15 }
        );
      slab(k, side(p, to, 0, -0.25), side(p, to, 0.4 / d, -0.25), 0.3, 7.6, 7.95, '#c9c9c4', false); // 廣播喇叭
      pole(A(434.6, 5.3), 8, A(434.6, 1.5), 0.09);
      const c = A(431.2, 5.0);
      k.I.addCone(c[0], c[1]);
    }

    // =====================================================================================
    // 西側（體育園區）
    // =====================================================================================
    // ---- W2 s344–386：舊鍍鋅鋼管網圍籬（高 1.25，離路 6.5，到頂棚東南角前往路邊收）；s 383～386 是同款雙開門；
    //      圍籬後一排小喬木（只種到 s 371，再往北是頂棚的角落）；路肩停一台銀灰色休旅車；s≈371 圍籬內電桿＋路燈 ----
    {
      const r = lcg(3201),
        pts = along(344.8, 386, 2.29, (s) => -wFence(s));
      run(pts, (k, a, b, i) => {
        pane(k, T.pipe(), a, b, 0, 1.25);
        k.wallLine(...L(k, a), ...L(k, b), 0, 1.25);
        cyl(k, a, 0.04, -1, i >= pts.length - 3 ? 1.45 : 1.27, '#9a9c98', { seg: 6 });
      });
      cyl(K(pts[pts.length - 1]), pts[pts.length - 1], 0.04, -1, 1.45, '#9a9c98', { seg: 6 });
      for (const [s, h, rr] of [
        [361.5, 6.2, 2.0],
        [366.5, 5.4, 1.8],
        [370.8, 6.6, 2.1],
      ])
        tree(A(s, -8.9), h, rr, r);
      car(A(359.6, -5.3), A(364.2, -5.3), '#b4b8bc', 1.8);
      pole(A(371.3, -7.4), 9, A(371.3, -2));
      // 圍籬腳到路邊實景是草與泥土路肩（遊戲的道路在這裡自帶一條磚鋪面），蓋一層貼地的草色
      ground(345.6, 370, -4.0, -6.4, '#3f6b2c');
      for (let s = 370; s < 386; s += 2) ground(s, s + 2, -4.0, -(wFence(s + 1) - 0.1), '#3f6b2c');
    }
    // ---- W3 s344–350.5：圍籬裡一塊紅磚色鋪面，上面並排 3 個灰色落地式電箱 ----
    {
      const k = K(A(347.3, -10));
      slab(k, A(344.3, -9.9), A(350.3, -9.9), 3.3, -0.5, 0.05, '#a85a45', false);
      for (const s of [345.1, 346.3, 347.5]) {
        slab(k, A(s, -9.9), A(s + 0.9, -9.9), 0.6, -0.3, 1.3, '#a9adb0');
        slab(k, A(s - 0.03, -9.9), A(s + 0.93, -9.9), 0.66, 1.3, 1.34, '#8f9396', false);
        slab(k, A(s + 0.44, -9.58), A(s + 0.46, -9.58), 0.02, 0.1, 1.25, '#7d8286', false);
      }
    }
    // ---- W4 s350.5–358.5：褐色橫條板小屋（1 樓、淺綠平頂略出簷、面路這面沒有門窗），屋角一棵小樹 ----
    {
      const a = A(350.5, -11),
        b = A(358.5, -11),
        k = K(A(354.5, -11)),
        tex = T.slatH();
      slab(k, a, b, 4.0, -1, 3.0, '#8f4f3e');
      pane(k, tex, side(a, b, 0, 2.03), side(a, b, 1, 2.03), 0, 3.0, { transparent: false });
      pane(k, tex, side(a, b, 0, -2.03), side(a, b, 1, -2.03), 0, 3.0, { transparent: false });
      for (const t of [-0.004, 1.004])
        pane(k, tex, side(a, b, t, -2), side(a, b, t, 2), 0, 3.0, { transparent: false });
      slab(k, lerp(a, b, -0.025), lerp(a, b, 1.025), 4.4, 3.0, 3.14, '#b9cfa0', false);
      tree(A(359.6, -9.8), 4.2, 1.5, lcg(3204), ['#5a8f45', '#6a9a4a']);
    }
    // ---- W7 s386–413.8：灰色帆布圍籬（高 1.7，離路 5.6，下緣透空）；轉彎外側 s 397～401.5 是同款雙開門，門前一塊水泥斜坡；
    //      s≈395 圍籬後一根桿子掛兩面並排的橘框凸面鏡，旁邊與 s≈400.5 各一支路燈；圍籬後修剪過的綠籬，再後面一整排高大榕樹（避開頂棚）----
    {
      const r = lcg(3207),
        pts = along(386, 413.8, 2.3, -5.6);
      run(pts, (k, a, b) => {
        pane(k, T.canvas(), a, b, 0, 1.75);
        k.wallLine(...L(k, a), ...L(k, b), 0, 1.75);
        cyl(k, a, 0.035, -1, 1.78, '#9a9c98', { seg: 6 });
      });
      for (const s of [397.1, 399.3, 401.5]) {
        const p = A(s, -5.6);
        cyl(K(p), p, 0.05, -1, 1.9, '#8d9196', { seg: 6 });
      } // 雙開門的門柱與中縫
      ground(386, 410, -4.0, -5.5, '#a8906e'); // 圍籬腳到路邊是沙土路肩（街景 s405 往西南）
      ground(397.3, 401.4, -4.0, -5.5, '#9c978c', 0.06); // 門前的水泥斜坡
      run(
        along(387, 401, 2.4, -7.1),
        (k, a, b) => slab(k, a, b, 1.2, -0.5, 1.85 + r() * 0.2, r() < 0.5 ? '#3f6f38' : '#42753a') // 修剪過的綠籬：擋人（#302）
      );
      {
        // 凸面鏡：立桿＋橫桿，兩面橘框圓鏡並排（一面朝南、一面朝東北）
        const p = A(395, -6.6),
          k = K(p),
          q1 = A(394.55, -6.6),
          q2 = A(395.45, -6.6);
        cyl(k, p, 0.04, -1, 2.75, '#d8b02a', { seg: 6 });
        slab(k, q1, q2, 0.04, 2.42, 2.48, '#d8b02a', false);
        for (const [q0, to] of [
          [q1, A(384, 0)],
          [q2, A(403, 1.5)],
        ]) {
          const d = Math.hypot(to[0] - q0[0], to[1] - q0[1]),
            rot = Math.atan2(L(k, to)[0] - L(k, q0)[0], L(k, to)[1] - L(k, q0)[1]);
          for (const [rr, th, hex, e] of [
            [0.4, 0.05, '#e07a2a', 0.1],
            [0.33, 0.045, '#c9d2d8', 0.135],
          ]) {
            const lp = L(k, lerp(q0, to, e / d)),
              g = new THREE.SphereGeometry(1, 10, 6);
            g.scale(rr, rr, th);
            g.rotateY(rot);
            g.translate(lp[0], 2.45, lp[1]);
            part(k, g, hex);
          }
        }
      }
      pole(A(395.9, -6.6), 7.5, A(395.9, -2), 0.08);
      pole(A(400.6, -6.8), 7.5, A(400.6, -2), 0.08);
      // 榕樹排（照正射的樹冠邊界）：轉彎前緊貼綠籬後面，過了轉彎就往西北退開，到鐵皮小屋與菜園那裡已經離路 25～35 m
      for (const [s, o, h, rr] of [
        [388.5, -10.2, 9, 3.2],
        [392.5, -10.2, 9.5, 3.2],
        [396.5, -11, 9.5, 3.4],
        [400.5, -13.5, 9.5, 4.4],
        [404.5, -16.5, 9, 4.4],
        [408.5, -21, 9, 4.4],
        [412.5, -25.5, 8.5, 4.4],
        [416.5, -29, 8, 4.4],
        [420.5, -31.5, 8, 4.4],
        [424.5, -33, 7.5, 4.4],
        [428.5, -34, 7.5, 4.0],
      ]) {
        const p = A(s, o),
          gap = roofGap(p[0], p[1]);
        if (gap > 2.2) banyan(p, h, Math.min(rr, gap - 0.4), r);
      }
    }
    // ---- W8 s410–415：兩根電桿：s≈410.6 黃黑斜紋水泥桿掛橘黃菱形警告牌＋路燈；s≈414.1 細桿掛「30」速限圓牌、灰色電表箱、白色附牌（字看不清，不寫）----
    {
      const to = A(432, 0);
      {
        const p = A(410.6, -4.9),
          k = pole(p, 9, A(410.6, -1), 0.15, true),
          d = Math.hypot(to[0] - p[0], to[1] - p[1]);
        plane(k, T.diamond(), 0.85, 0.85, lerp(p, to, 0.2 / d), 2.6, to, {
          transparent: true,
          double: true,
        });
        slab(k, side(p, to, 0, -0.3), side(p, to, 0.5 / d, -0.3), 0.4, 6.3, 7.0, '#8a8d90', false);
      }
      {
        const p = A(414.1, -5.2),
          k = pole(p, 7.5, null, 0.09),
          d = Math.hypot(to[0] - p[0], to[1] - p[1]),
          f = lerp(p, to, 0.12 / d);
        plane(k, speed30, 0.65, 0.65, f, 2.6, to, { transparent: true, double: true });
        plane(
          k,
          sg('xzL3blank', 32, 32, (g) => {
            g.fillStyle = '#f2f0ea';
            g.fillRect(0, 0, 32, 32);
          }),
          0.4,
          0.25,
          f,
          2.05,
          to,
          { double: true }
        );
        slab(k, side(p, to, 0, 0.12), side(p, to, 0.3 / d, 0.12), 0.2, 1.3, 1.75, '#9a9ea2', false);
      }
    }
    // ---- W9 s414.3–418.3：淺綠色鐵皮小屋（直紋浪板、平緩屋頂略出簷、面路右側一扇灰色鐵門），屋後架高的不鏽鋼水塔；門前是泥土地 ----
    {
      const a = A(414.3, -9.8),
        b = A(418.3, -9.8),
        k = K(A(416.3, -9.8)),
        WALL = '#a8c098';
      slab(k, a, b, 4.0, -1, 2.7, WALL);
      pane(k, T.corr(WALL, 28), side(a, b, 0, 2.03), side(a, b, 1, 2.03), 0, 2.7, {
        transparent: false,
      });
      pane(k, T.corr(WALL, 28), side(a, b, 0, -2.03), side(a, b, 1, -2.03), 0, 2.7, {
        transparent: false,
      });
      for (const t of [-0.008, 1.008])
        pane(k, T.corr(WALL, 28), side(a, b, t, -2), side(a, b, t, 2), 0, 2.7, {
          transparent: false,
        });
      slab(k, lerp(a, b, -0.06), lerp(a, b, 1.06), 4.5, 2.7, 2.82, '#b4c2aa', false);
      slab(k, A(417.1, -7.74), A(418.0, -7.74), 0.05, 0, 2.0, '#8d9196', false); // 灰色鐵門
      const t = A(415.3, -12.5),
        kt = K(t);
      cyl(kt, t, 0.52, 1.9, 3.4, '#c9ced2', { seg: 12 });
      cyl(kt, t, 0.3, 3.4, 3.52, '#b9bec2', { seg: 10 });
      for (const [dx, dz] of [
        [-0.4, -0.4],
        [0.4, -0.4],
        [-0.4, 0.4],
        [0.4, 0.4],
      ])
        cyl(kt, [t[0] + dx, t[1] + dz], 0.035, -1, 1.9, '#8d9196', { seg: 5 });
    }
    // ---- W10 s418–435：細紅漆鐵柱＋鐵絲圍的菜園（草、菜畦、藍色塑膠桶、輪胎、交通錐），圍籬外停一台廢棄的灰褐色皮卡（引擎蓋披銀灰帆布）；
    //      沿普忠路人行道是紅框鐵網圍籬，轉角一段鍍鋅波形護欄 ----
    {
      const r = lcg(3210);
      run(along(418.6, 434.5, 2.65, -8.6), (k, a, b) => {
        cyl(k, a, 0.03, -1, 1.4, '#c0392b', { seg: 6 });
        pane(k, T.wire(), a, b, 0.15, 1.35);
        k.wallLine(...L(k, a), ...L(k, b), 0, 1.3);
      });
      run(
        [0, 1, 2, 3, 4].map((i) => A(434.5, -(8.6 + i * 2.75))),
        (k, a, b) => {
          pane(k, T.rmesh(), a, b, 0, 1.5);
          k.wallLine(...L(k, a), ...L(k, b), 0, 1.5);
          cyl(k, a, 0.035, -1, 1.52, '#c0392b', { seg: 6 });
        }
      );
      ground(410, 413.8, -4.0, -5.5, '#8c6f58');
      ground(413.8, 418.5, -4.0, -7.7, '#8c6f58');
      ground(418.5, 426, -4.0, -8.5, '#8c6f58');
      ground(426, 434.3, -4.0, -8.5, '#3f6b2c'); // 圍籬外到路邊：南半泥土地、小貨卡周圍是草地
      {
        const a = A(432.9, -6.4),
          b = A(428.2, -6.4),
          k = K(lerp(a, b, 0.5)),
          DG = '#5a564e'; // 廢棄的灰褐色皮卡：車頭朝南（a 車尾、b 車頭），引擎蓋上披著銀灰帆布
        slab(k, a, b, 1.7, 0.32, 0.8, DG);
        slab(k, lerp(a, b, 0.44), lerp(a, b, 0.74), 1.62, 0.8, 1.5, DG, false);
        slab(k, lerp(a, b, 0.46), lerp(a, b, 0.72), 1.66, 1.02, 1.4, '#3a4046', false);
        slab(k, lerp(a, b, 0.02), lerp(a, b, 0.42), 1.7, 0.8, 1.05, '#3f3c37', false);
        slab(k, lerp(a, b, 0.05), lerp(a, b, 0.4), 1.5, 0.8, 1.06, '#2a2826', false);
        slab(k, lerp(a, b, 0.72), lerp(a, b, 1.0), 1.78, 0.8, 0.9, '#b9bcc0', false);
        slab(k, lerp(a, b, 0.99), lerp(a, b, 1.03), 1.5, 0.15, 0.88, '#b9bcc0', false);
        for (const t of [0.18, 0.8])
          for (const v of [-1, 1])
            slab(
              k,
              side(a, b, t - 0.07, v * 0.78),
              side(a, b, t + 0.07, v * 0.78),
              0.2,
              -0.1,
              0.56,
              '#1c1c1e',
              false
            );
      }
      for (const [s0, s1, o] of [
        [423, 428, -11.5],
        [423, 428, -14],
        [429.5, 433.5, -12.5],
        [423.5, 432.5, -17.5],
      ]) {
        // 菜畦
        const k = K(A((s0 + s1) / 2, o));
        slab(k, A(s0, o), A(s1, o), 1.5, -0.6, 0.14, '#6b4a35', false);
        slab(
          k,
          A(s0 + 0.2, o),
          A(s1 - 0.2, o),
          1.1,
          0.14,
          0.3 + r() * 0.12,
          r() < 0.5 ? '#5f8f3f' : '#7da852',
          false
        );
      }
      for (const [s, o] of [
        [422.6, -9.6],
        [423.4, -9.5],
        [424.3, -9.8],
      ]) {
        const p = A(s, o);
        cyl(K(p), p, 0.29, -0.2, 0.9, '#2f6db3', { seg: 10 });
      }
      {
        const p = A(431.3, -9.6),
          k = K(p);
        for (let i = 0; i < 3; i++)
          cyl(k, p, 0.33, i * 0.2, i * 0.2 + 0.18, '#1f1f21', { seg: 10 });
        cyl(k, A(432.2, -9.3), 0.33, 0, 0.18, '#1f1f21', { seg: 10 });
      }
      {
        const c = A(433.4, -7.9),
          k = K(c);
        k.I.addCone(c[0], c[1]);
      }
      {
        const k = K(A(428, -10.2));
        slab(k, A(425.5, -10.2), A(430.5, -10.2), 0.6, -0.4, 0.05, '#b9b6ae', false);
      } // 水泥板小徑
      {
        const a = A(432.6, -4.9),
          b = A(435.9, -6.2),
          k = K(a);
        slab(k, a, b, 0.06, 0.45, 0.75, '#b9bcb8');
        for (const t of [0.04, 0.5, 0.96])
          cyl(k, lerp(a, b, t), 0.05, -0.8, 0.75, '#9a9c98', { seg: 6 });
      } // 波形護欄
    }
  },

  // custom 佔的地：只圈真的蓋了東西的地方（安全島的草地、樹林、果園、榕樹排都不圈，樹留給遊戲種）
  footprints() {
    const band = (s0, s1, o0, o1) => [A(s0, o0), A(s1, o0), A(s1, o1), A(s0, o1)];
    const bandF = (s0, s1, f, d0, d1) => {
      const out = [];
      for (let s = s0; s < s1 - 0.01; s += 4) {
        const e = Math.min(s1, s + 4);
        out.push([A(s, f(s) + d0), A(e, f(e) + d0), A(e, f(e) + d1), A(s, f(s) + d1)]);
      }
      return out;
    };
    return [
      band(348.6, 355.4, 10.5, 15.5), // 鋼架棚
      [
        longPt(-LONG.half - 0.8, -3.2),
        longPt(LONG.half + 0.8, -3.2),
        longPt(LONG.half + 0.8, 3.2),
        longPt(-LONG.half - 0.8, 3.2),
      ], // 米色長條平房
      band(360, 362, 13, 15),
      band(366.5, 368.5, 14, 16), // 野餐桌椅
      [
        DW(TTIP, DCURB + 0.3),
        DW(23.5, DCURB + 0.3),
        DW(23.5, -5.3),
        DW(11.6, -5.3),
        A(406.6, ESET + 0.4),
        A(406.6, 4.0),
        A(399.5, 4.0),
      ], // 北車道口、柵欄機、指示柱、磚基鐵柵
      band(406.6, 432, 4.0, ESET + 0.3),
      band(432, 436.2, 4.0, ESET + 0.3),
      band(435.8, 436.2, ESET, 15.2), // 花磚圍籬與溝蓋路肩、黃矮牆
      ...bandF(344.8, 386, (s) => -wFence(s), -0.3, 0.3), // 鋼管網圍籬
      band(344.2, 350.4, -11.7, -8.1),
      band(350.3, 358.7, -13.3, -8.8), // 電箱鋪面、褐色小屋
      ...bandF(386, 397.2, () => -5.6, -2.2, 0.3),
      ...bandF(397.2, 413.8, () => -5.6, -2.2, 0.3), // 帆布圍籬與綠籬
      band(410, 418.5, -13.3, -4.0), // 電桿、鐵皮小屋、水塔、門前泥土地
      band(418.5, 434.6, -19.8, -4.0), // 菜園、紅土空地、小貨卡
    ];
  },
};
