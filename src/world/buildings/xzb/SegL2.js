// 新中北路469巷 s 150～345（照 Google 街景 2026-05、國土測繪 2024 正射建模）
// 這段兩側都不是連棟街屋：
//   東側（+1）由南到北：菜園浪板圍籬、空心磚牆、「粗粗大舍」淺藍橫拉門與碎石空地、黃綠鐵皮倉庫、紅磚門柱車道、
//                       米灰 3 樓透天（臨路車庫）、白磁磚 2 樓透天、菱形網圍籬草地、「餃皮料理工坊」木造餐廳
//   西側（-1）由南到北：雜木土坡、暗紅直條圍籬與灰色平頂房、獨棟 4 樓別墅、大學藝墅館社區（亂石擋土牆＋5 排別墅山牆）、
//                       社區大門門廊、矮牆、整片竹林與鋼管圍籬、「中原大學」石牌與木圍籬
// 全部用 custom 蓋；座標一律用（s, off）＝（沿參考線 'L' 的里程, 離道路中心線的距離）。
const REF = 'L';
// 別墅群：每排山牆端的 s 範圍（對著路的那一面）與往西第二段往北偏多少
const VILLAS = [
  [196, 207, 3],
  [211.5, 221.5, 3],
  [226, 236, 3],
  [241.5, 251, 3],
  [254, 264, 1.5],
];
const VSET = 9; // 別墅山牆離道路中心線
const platform = (s) => Math.min(2.6, Math.max(1.6, 1.6 + (s - 192) / 63)); // 擋土牆（社區地坪）比路面高多少：南端 1.6、北端 2.6

export default {
  // f634（標 15 樓）實景是空心磚牆與樹；f631～f633（各標 12 樓）實景是鐵皮倉庫後半、透天主屋、菜園與小屋；f775～f781 實景是竹林與校名石牌
  drop: ['f634', 'f633', 'f632', 'f631', 'f775', 'f776', 'f777', 'f778', 'f779', 'f780', 'f781'],
  ownSign: [],
  lots: [],

  custom(C) {
    const {
      THREE,
      MR,
      VC,
      lcg,
      sg,
      paint,
      paintGeo,
      bars,
      bike,
      ROWT,
      YHT,
      litWin,
      shutterTex,
      ac,
    } = C;
    const PI = Math.PI,
      TILE = { tile: [0.6, 0.6] },
      NC = { col: false };
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
    const blob = (q, s, off, y, rs, ry, ro, hex) => {
      const g = new THREE.SphereGeometry(1, 7, 5);
      g.scale(rs, ry, ro);
      g.translate(q.X(s), y, q.Z(off));
      q.k._part(VC, paintGeo(g, hex));
    };
    const GREEN = ['#3f7a3a', '#4b8a3e', '#356b34', '#5a8f45'];
    const tree = (q, s, off, h, r, rnd, cols = GREEN, y0 = -1.5) => {
      q.C(s, off, 0.1 + r * 0.05, y0, h, '#6a4a30', { seg: 6 });
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
    // 雙斜屋頂：屋脊垂直道路（山牆對著街），sa～sb 是山牆寬、oa～ob 是屋脊長
    const gableRoof = (q, sa, sb, oa, ob, yE, yR, hex, ov = 0.4) => {
      const x0 = Math.min(q.X(sa), q.X(sb)),
        x1 = Math.max(q.X(sa), q.X(sb)),
        z0 = q.Z(oa),
        z1 = q.Z(ob);
      const half = (x1 - x0) / 2,
        a = Math.atan2(yR - yE, half),
        L = Math.hypot(half, yR - yE) + ov;
      for (const sd of [-1, 1]) {
        const g = new THREE.BoxGeometry(L, 0.1, z1 - z0 + 2 * ov);
        g.rotateZ(-sd * a);
        g.translate(
          (sd < 0 ? x0 : x1) - sd * Math.cos(a) * (L / 2 - ov),
          yE + Math.sin(a) * (L / 2 - ov) + 0.05,
          (z0 + z1) / 2
        );
        q.k._part(VC, paintGeo(g, hex));
      }
    };
    // 山牆上面那塊三角形（對著街或背街）
    const tri = (q, sa, sb, y0, h, off, th, hex) => {
      const x0 = Math.min(q.X(sa), q.X(sb)),
        x1 = Math.max(q.X(sa), q.X(sb)),
        g = new THREE.CylinderGeometry(1, 1, th, 3);
      g.rotateX(-PI / 2);
      g.scale((x1 - x0) / 2 / 0.866, h / 1.5, 1);
      g.translate((x0 + x1) / 2, y0 + h / 3, q.Z(off));
      q.k._part(VC, paintGeo(g, hex));
    };
    const car = (q, s, off, alongS, hex) => {
      // 停著的車 → 交給統一停放車輛系統
      const [ds, dz] = alongS ? [4.2, 1.75] : [1.75, 4.2];
      q.k.car((q.X(s) + q.X(s + ds)) / 2, q.Z(off + dz / 2), alongS ? Math.PI / 2 : Math.PI, hex);
    };
    const pole = (q, s, off, h = 9, lampTo = 0) => {
      // 水泥電桿；lampTo 不是 0 就加一支往路中伸的路燈
      q.C(s, off, 0.15, -1.5, h, '#a9a79f', { seg: 8, col: true });
      if (lampTo) {
        q.B(
          s - 0.05,
          s + 0.05,
          h - 0.5,
          h - 0.4,
          Math.min(off, lampTo),
          Math.max(off, lampTo),
          '#8d9196',
          NC
        );
        q.B(s - 0.15, s + 0.15, h - 0.62, h - 0.5, lampTo - 0.3, lampTo + 0.3, '#e8e6dc', NC);
      }
    };
    // ---- 貼圖 ----
    const T = {
      corr: (hex, n) =>
        sg(`xzL2corr${hex}${n}`, 512, 32, (g) => {
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
      rubble: () =>
        sg('xzL2rubble', 512, 192, (g) => {
          // 亂石砌擋土牆：灰褐石片、水泥深勾縫
          g.fillStyle = '#5d564b';
          g.fillRect(0, 0, 512, 192);
          const r = lcg(77);
          for (let y = 0; y < 192; y += 24)
            for (let x = -20 + ((y / 24) % 2) * 14; x < 512; x += 26 + r() * 12) {
              const w = 20 + r() * 14,
                h = 17 + r() * 5,
                j = () => (r() - 0.5) * 6,
                v = 118 + r() * 42;
              g.fillStyle = `rgb(${(v + 8) | 0},${v | 0},${(v - 22) | 0})`;
              g.beginPath();
              g.moveTo(x + j(), y + 3 + j() / 2);
              g.lineTo(x + w + j(), y + 3 + j() / 2);
              g.lineTo(x + w + j(), y + h + j() / 2);
              g.lineTo(x + w / 2, y + h + 4 + j() / 2);
              g.lineTo(x + j(), y + h + j() / 2);
              g.closePath();
              g.fill();
            }
        }),
      block: () =>
        sg('xzL2block', 384, 96, (g) => {
          // 鏤空水泥空心磚牆
          g.fillStyle = '#9d9b94';
          g.fillRect(0, 0, 384, 96);
          g.fillStyle = '#4a4b47';
          for (let y = 6; y < 70; y += 22)
            for (let x = 6; x < 384; x += 24) {
              g.fillRect(x, y, 7, 14);
              g.fillRect(x + 10, y, 7, 14);
            }
          g.fillStyle = 'rgba(0,0,0,.12)';
          g.fillRect(0, 72, 384, 3);
        }),
      mesh: () =>
        sg('xzL2mesh', 256, 128, (g) => {
          // 鍍鋅鋼管框＋菱形網
          g.clearRect(0, 0, 256, 128);
          g.strokeStyle = 'rgba(169,172,168,.75)';
          g.lineWidth = 1.2;
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
          g.fillStyle = '#a9aca8';
          g.fillRect(0, 0, 256, 5);
          g.fillRect(0, 123, 256, 5);
          for (const x of [0, 126, 251]) g.fillRect(x, 0, 5, 128);
          g.lineWidth = 3;
          g.strokeStyle = '#a9aca8';
          g.beginPath();
          g.moveTo(4, 124);
          g.lineTo(60, 4);
          g.stroke(); // 斜撐
        }),
      pipe: () =>
        sg('xzL2pipe', 256, 96, (g) => {
          // 舊鍍鋅鋼管圍籬：兩道橫管＋鐵絲網
          g.clearRect(0, 0, 256, 96);
          g.strokeStyle = 'rgba(143,143,136,.6)';
          g.lineWidth = 1;
          for (let x = 0; x < 256; x += 8) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, 96);
            g.stroke();
          }
          for (let y = 0; y < 96; y += 8) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(256, y);
            g.stroke();
          }
          g.fillStyle = '#8f8f88';
          g.fillRect(0, 2, 256, 6);
          g.fillRect(0, 46, 256, 5);
          for (const x of [0, 125, 250]) g.fillRect(x, 0, 6, 96);
        }),
      siding: () =>
        sg('xzL2siding', 256, 128, (g) => {
          // 橫向木紋雨淋板
          g.fillStyle = '#a9825a';
          g.fillRect(0, 0, 256, 128);
          const r = lcg(31);
          for (let y = 0; y < 128; y += 8) {
            g.fillStyle = `rgba(${r() < 0.5 ? '255,235,200' : '70,40,20'},${0.05 + r() * 0.1})`;
            g.fillRect(0, y, 256, 7);
            g.fillStyle = 'rgba(50,28,12,.45)';
            g.fillRect(0, y + 7, 256, 1.5);
          }
        }),
      slat: (hex) =>
        sg(`xzL2slat${hex}`, 256, 64, (g) => {
          // 直條板圍籬
          g.fillStyle = hex;
          g.fillRect(0, 0, 256, 64);
          for (let x = 0; x < 256; x += 8) {
            g.fillStyle = 'rgba(0,0,0,.35)';
            g.fillRect(x, 0, 1.5, 64);
            g.fillStyle = 'rgba(255,255,255,.08)';
            g.fillRect(x + 2, 0, 2, 64);
          }
        }),
      bay: () =>
        sg('xzL2bay', 192, 128, (g) => {
          // 別墅八角凸窗：深綠框、綠玻璃
          g.fillStyle = '#3d5850';
          g.fillRect(0, 0, 192, 128);
          g.fillStyle = '#7fa79a';
          for (let i = 0; i < 3; i++) {
            g.fillRect(8 + i * 61, 10, 53, 34);
            g.fillRect(8 + i * 61, 50, 53, 68);
          }
          g.fillStyle = 'rgba(255,255,255,.22)';
          for (let i = 0; i < 3; i++) g.fillRect(12 + i * 61, 54, 16, 60);
        }),
      hiWin: () =>
        sg('xzL2hiWin', 256, 64, (g) => {
          // 餐廳的白框高窗帶（6 格一組）
          g.fillStyle = '#f1efe8';
          g.fillRect(0, 0, 256, 64);
          for (let i = 0; i < 6; i++) {
            g.fillStyle = '#5f6f78';
            g.fillRect(6 + i * 42, 8, 34, 48);
            g.fillStyle = 'rgba(255,255,255,.25)';
            g.fillRect(9 + i * 42, 11, 10, 42);
          }
        }),
      dark: () =>
        sg('xzL2dark', 128, 64, (g) => {
          // 深色大玻璃
          const gr = g.createLinearGradient(0, 0, 0, 64);
          gr.addColorStop(0, '#3a444c');
          gr.addColorStop(1, '#1e2428');
          g.fillStyle = gr;
          g.fillRect(0, 0, 128, 64);
          g.fillStyle = '#2a2420';
          for (const x of [0, 62, 124]) g.fillRect(x, 0, 4, 64);
          g.fillStyle = 'rgba(255,255,255,.12)';
          g.fillRect(8, 4, 20, 56);
        }),
      vwin: () =>
        sg('xzL2vwin', 64, 96, (g) => {
          // 別墅的小窗：深綠框、深色玻璃
          g.fillStyle = '#3d5850';
          g.fillRect(0, 0, 64, 96);
          g.fillStyle = '#2f3f44';
          g.fillRect(6, 6, 23, 84);
          g.fillRect(35, 6, 23, 84);
          g.fillStyle = 'rgba(190,220,210,.22)';
          g.fillRect(8, 8, 8, 80);
        }),
      noPark: () =>
        sg('xzL2noPark', 64, 64, (g) => {
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
      grWin = YHT.win(),
      vWin = T.vwin();
    const roundSign = (q, s, off) => {
      q.C(s, off, 0.04, -1, 2.5, '#8d9196', { seg: 6 });
      for (const f of ['n', 's'])
        q.P(T.noPark(), 0.6, 0.6, s + (f === 'n' ? 0.05 : -0.05), 2.2, off, f, {
          transparent: true,
        });
    };

    // =====================================================================================
    // 東側
    // =====================================================================================
    // ---- E1 s150–172：菜園的鍍鋅浪板圍籬（一片一片歪斜）、後面雜木大樹與一畦一畦的菜圃 ----
    {
      const r = lcg(1501),
        cols = ['#c4c7c2', '#b9bcb8', '#cfd1cc', '#a9aca6', '#b6c2b0', '#c4c7c2', '#9a948a'];
      for (let s = 150; s < 171.9; s += 5.5) {
        const q = open(1, s, s + 5.5, 5.0);
        for (let x = 0; x < 5.45; x += 1.1) {
          const h = 1.45 + r() * 0.3,
            z = r() * 0.1;
          q.k.box(x, x + 1.07, -0.8, h, z, z + 0.05, cols[(r() * cols.length) | 0], NC);
        }
        q.line(s, 5.0, s + 5.5, 5.0, 0, 1.6);
      }
      const q = open(1, 150, 172, 5.0);
      tree(q, 153.5, 8.6, 6.5, 3.0, r);
      tree(q, 161, 9.5, 7.2, 3.3, r);
      tree(q, 168.5, 8.2, 6.0, 2.8, r);
      roundSign(q, 160, 4.75);
      for (const [o0, o1] of [
        [21, 30],
        [30, 40],
      ]) {
        // 菜圃（東西向的畦，往東地勢略降所以分兩段）
        const b = open(1, 150, 170, o0);
        for (let s = 150.6, i = 0; s < 169; s += 2.3, i++) {
          b.B(s, s + 1.6, -1.2, 0.14, o0 + 0.3, o1 - 0.3, '#6b4a35', NC);
          b.B(s + 0.2, s + 1.4, 0.14, 0.34, o0 + 0.6, o1 - 0.6, i % 3 ? '#5f8f3f' : '#7da852', NC);
        }
      }
    }
    // ---- E2 s172–197.6：鏤空空心磚矮牆，上面長滿灌木，牆後大樹、雞蛋花；s≈178 一根水泥電桿 ----
    {
      const r = lcg(1502);
      for (let s = 172; s < 195.9; s += 6) {
        const q = open(1, s, s + 6, 5.0);
        q.B(s, s + 6, -0.8, 1.3, 5.0, 5.2, '#9d9b94');
        q.P(T.block(), 6, 1.3, s + 3, 0.65, 4.98);
        q.B(s + 0.1, s + 5.9, 1.3, 1.75 + r() * 0.3, 5.0, 5.9, '#42753a', NC);
        for (let i = 0; i < 3; i++)
          blob(
            q,
            s + 1 + i * 2 + r(),
            5.5 + r() * 0.4,
            1.8 + r() * 0.3,
            1.1,
            0.6,
            0.7,
            GREEN[(r() * 4) | 0]
          );
      }
      const e = open(1, 196, 197.6, 5.0);
      e.B(196, 197.6, -0.8, 1.3, 5.0, 5.2, '#9d9b94');
      e.P(T.block(), 1.6, 1.3, 196.8, 0.65, 4.98);
      e.B(196.1, 197.5, 1.3, 1.9, 5.0, 5.8, '#42753a', NC);
      const q = open(1, 172, 196, 5.0);
      tree(q, 176, 9, 6.8, 3.0, r);
      tree(q, 183.5, 8.2, 3.8, 1.6, r, ['#6a9a4a', '#7aa855']);
      tree(q, 191, 9.2, 6.2, 2.7, r);
      pole(q, 178, 4.75);
      const t2 = open(1, 193, 203, 8); // 「粗粗大舍」空地南緣的一叢大樹（正射 s196–203、離路 6–20）
      tree(t2, 196.2, 8.8, 7.0, 3.0, r);
      tree(t2, 199.4, 12.5, 7.6, 3.2, r);
      tree(t2, 197.6, 17.5, 6.6, 3.0, r);
      const y = open(1, 188, 196, 15); // 牆後的黃色鐵皮小屋（正射 s188–196、離路 15–19）
      y.B(188, 196, -1.5, 4.6, 15, 19, '#d9c66a');
      y.B(187.8, 196.2, 4.6, 4.7, 14.8, 19.2, '#d8c860', NC);
      y.P(alWin, 1.4, 1.1, 192, 3.2, 14.97);
      const w = open(1, 181, 188, 15); // 白屋頂小屋
      w.B(181, 188, -1.5, 2.9, 15, 21, '#cfcdc4');
      w.B(180.8, 188.2, 2.9, 3.0, 14.8, 21.2, '#eeeeea', NC);
    }
    // ---- E3 s197.6–217.3：「粗粗大舍」淺藍門柱與橫拉鐵門（門上紅漆小字）、水泥磚矮牆、碎石停車空地；
    //      空地後面（照正射）：2 樓紅磚屋（屋頂鐵皮架）、紅色鐵皮屋與前面的棚子、灰色鐵皮屋、白色小屋 ----
    {
      const q = open(1, 197.6, 209, 5.0);
      q.B(197.6, 199, -0.8, 1.95, 5.0, 5.35, '#a9c7dc');
      q.B(198.05, 198.5, 0.85, 1.6, 4.97, 5.0, '#d98f8f', NC); // 門柱與紅春聯（字看不清，不寫）
      q.B(199, 209, -0.8, 1.45, 5.05, 5.15, '#a9c7dc');
      q.P(bars, 10, 0.4, 204, 1.65, 5.1, 'st', { transparent: true, double: true });
      q.P(
        paint('粗 粗 大 舍', '#a9c7dc', '#b0483a', null, 2.4, 0.42),
        2.4,
        0.42,
        202.6,
        1.08,
        5.03
      );
      const q2 = open(1, 209, 217.3, 5.0);
      q2.B(209, 217.3, -0.8, 1.35, 5.0, 5.22, '#8f8f8a');
      for (const [a, b] of [
        [199, 205],
        [205, 211],
        [211, 217.3],
      ]) {
        const g = open(1, a, b, 5.3);
        g.B(a, b, -1.2, 0.03, 5.3, 23.2, '#b5b0a4', NC);
      } // 碎石地
      const cs = open(1, 202, 210, 18); // 停在紅磚屋旁的車（車頭朝路）
      car(cs, 202.3, 18, false, '#c9ccd0');
      car(cs, 204.8, 18, false, '#b9bcc0');
      car(cs, 207.3, 18, false, '#f0f0ec');
      car(open(1, 211, 216, 8.4), 211.2, 8.4, true, '#2a2d33');
      const h = open(1, 210, 217.5, 16.5),
        BRK = '#b06a58'; // 2 樓紅磚屋，屋頂有鐵皮架
      h.B(210, 217.5, -1.8, 6.4, 16.5, 27, BRK);
      h.B(209.9, 217.6, 6.4, 6.9, 16.4, 27.1, '#a05c4c', NC);
      for (const s of [210.2, 217.3])
        for (const o of [16.7, 26.8]) h.C(s, o, 0.06, 6.4, 8.6, '#8d9196', { seg: 6 });
      h.B(209.8, 217.7, 8.6, 8.72, 16.3, 27.2, '#7d8286', NC);
      for (const s of [212, 215.6]) for (const yy of [1.7, 4.7]) h.P(grWin, 1.6, 1.2, s, yy, 16.47);
      for (const yy of [1.7, 4.7])
        for (const o of [19.5, 24]) h.P(grWin, 1.5, 1.2, 209.97, yy, o, 's');
      h.B(210, 217.5, 2.9, 3.0, 14.6, 16.5, '#7a6a5c', NC);
      for (const s of [210.2, 217.3]) h.C(s, 14.7, 0.05, -1.5, 2.9, '#8d9196', { seg: 6 });
      const t = open(1, 201.6, 210.8, 30); // 紅色鐵皮屋（1 層）
      t.B(201.6, 210.8, -1.8, 4.0, 30, 38, '#b23a36');
      t.B(201.4, 211, 4.0, 4.14, 29.8, 38.2, '#d8453c', NC);
      t.P(T.corr('#b23a36', 40), 9.2, 4.0, 206.2, 2.0, 29.97);
      t.B(203.5, 209, 2.7, 2.8, 23.4, 30, '#7a5a48', NC);
      for (const s of [203.7, 208.8]) t.C(s, 23.6, 0.05, -1.5, 2.7, '#8d9196', { seg: 6 }); // 前面的褐色鐵皮棚
      const g2 = open(1, 191, 202, 28); // 灰色鐵皮屋
      g2.B(191, 202, -1.8, 3.6, 28, 39, '#b9b9b4');
      g2.B(190.8, 202.2, 3.6, 3.72, 27.8, 39.2, '#9a9c9c', NC);
      g2.P(alWin, 1.6, 1.2, 196.5, 1.9, 27.97);
      const w2 = open(1, 196, 200.5, 20.7); // 白色小屋
      w2.B(196, 200.5, -1.5, 3.0, 20.7, 26.2, '#dcdad2');
      w2.B(195.8, 200.7, 3.0, 3.1, 20.5, 26.4, '#eeeeea', NC);
    }
    // ---- E4 s217.3–237：黃綠色鐵皮倉庫（山牆對著路、簷高 6.5、屋脊 8.2，本體離路 8 m、往東 34 m），
    //      臨路面一道灰色鐵皮雨遮（下面停機車），南側是裝卸貨的鐵皮棚與一叢電桿；沒有招牌 ----
    {
      const WALL = '#c2bf8c',
        q = open(1, 222, 236, 8.0);
      q.B(222, 236, -2, 6.5, 8.0, 42, WALL);
      q.P(T.corr(WALL, 50), 14, 7.1, 229, 2.95, 7.97);
      for (const [s, f] of [
        [221.97, 's'],
        [236.03, 'n'],
      ])
        q.P(T.corr(WALL, 120), 34, 7.1, s, 2.95, 25, f);
      tri(q, 222, 236, 6.5, 1.7, 8.06, 0.12, WALL);
      tri(q, 222, 236, 6.5, 1.7, 41.94, 0.12, WALL);
      gableRoof(q, 222, 236, 8.0, 42, 6.5, 8.2, '#b9cfae', 0.3);
      for (const o of [11, 15, 19, 23, 27]) q.P(T.dark(), 2.6, 1.0, 221.94, 4.4, o, 's'); // 南面上排的窗
      q.B(224, 236, 4.6, 4.72, 4.9, 8.0, '#6f7275', NC); // 臨路面的鐵皮雨遮
      for (const s of [224.3, 230, 235.7])
        q.B(s - 0.04, s + 0.04, 4.5, 4.6, 4.95, 8.0, '#8d9196', NC);
      bike(q.k, q.X(227), -1.0, 0, '#2a2a30');
      bike(q.k, q.X(231.5), -1.0, 0, '#b02a2a');
      q.B(236, 237.2, -1.5, 2.6, 9.0, 9.2, '#e4e2dc');
      q.B(236.3, 237.0, 0, 2.0, 8.96, 9.0, '#c9c9c4', NC); // 倉庫北邊的白牆小門
      const c = open(1, 217.3, 222, 5.2); // 南側的鐵皮棚
      c.B(217.3, 222, -1.2, 0.03, 5.2, 14.2, '#a3a19b', NC);
      c.B(217.3, 222, 4.5, 4.62, 5.2, 14.2, '#6a5a4c', NC);
      for (const o of [5.4, 9.7, 14]) c.C(217.5, o, 0.07, -1.5, 4.5, '#8d9196', { seg: 6 });
      pole(c, 217.9, 4.75, 9.5);
      pole(c, 218.8, 4.75, 9);
      c.B(217.6, 218.3, 6.0, 6.9, 4.45, 5.0, '#8a8d90', NC); // 電桿與變壓器
    }
    // ---- E5 s236–243.5：往內退的紅磚門柱（柱頂白色圓球燈）＋黑色雙開鐵門，門前水泥車道；紅磚牆斜接回人行道邊 ----
    {
      const q = open(1, 236, 243.5, 5.0),
        BR = MR.brick;
      q.B(236, 243.5, -1.5, 0.03, 5.0, 9.7, '#a3a19b', NC);
      for (const s of [237.2, 241.6]) {
        q.B(s, s + 0.5, -1, 2.2, 9.4, 9.9, BR, TILE);
        q.B(s - 0.05, s + 0.55, 2.2, 2.3, 9.35, 9.95, '#d8d4cc', NC);
        blob(q, s + 0.25, 9.65, 2.52, 0.22, 0.22, 0.22, '#f4f2ea');
      }
      q.P(bars, 3.9, 1.9, 239.65, 0.95, 9.65, 'st', { transparent: true, double: true });
      q.line(237.7, 9.65, 241.6, 9.65, 0, 1.9);
      q.k.slab(q.X(242.1), q.Z(9.65), q.X(243.5), q.Z(5.12), 0.24, -1, 1.8, BR);
    }
    // ---- E6 s243.5–263：紅磚圍牆（每 2.7 m 一根磚柱）、臨路 1 層車庫（米色粉光牆、下半紅磚、灰鐵捲門、灰鐵皮平頂），3 樓米白透天在後面離路 14 m ----
    {
      const q = open(1, 243.5, 252, 5.0),
        BR = MR.brick;
      q.B(243.5, 252, -1, 1.8, 5.0, 5.24, BR, TILE);
      for (const s of [243.5, 246.2, 248.9, 251.6]) {
        q.B(s, s + 0.4, -1, 2.0, 4.94, 5.3, BR, TILE);
        q.B(s - 0.04, s + 0.44, 2.0, 2.08, 4.9, 5.34, '#d8d4cc', NC);
      }
      const g = open(1, 252, 263, 5.0); // 車庫
      g.B(252, 263, -1.5, 3.6, 5.0, 14, '#d8d0c2');
      g.B(252, 255.25, -1, 1.6, 4.94, 5.0, BR, { ...TILE, col: false });
      g.B(259.75, 263, -1, 1.6, 4.94, 5.0, BR, { ...TILE, col: false });
      g.P(shutterTex('#9a9a96'), 4.5, 2.9, 257.5, 1.25, 4.97);
      g.B(255.25, 259.75, 2.7, 2.95, 4.85, 5.0, '#7a7e80', NC);
      for (let y = 3.02; y < 3.4; y += 0.12)
        g.B(255.4, 259.6, y, y + 0.06, 4.93, 5.0, '#6a6a66', NC);
      g.B(251.8, 263.2, 3.6, 3.72, 4.7, 14.2, MR.roof, NC);
      const h = open(1, 247.5, 262, 14),
        WALL = '#d8d2c4'; // 主屋
      h.B(247.5, 262, -2, 10, 14, 37, WALL);
      h.B(247.4, 262.1, 10, 10.7, 13.9, 37.1, '#c9c2b2', NC);
      h.B(247.7, 261.8, 10.5, 10.72, 14.2, 36.8, '#8f8f8a', NC);
      h.B(254, 259, 10.7, 13.2, 22, 27, WALL, NC);
      h.B(253.8, 259.2, 13.2, 13.35, 21.8, 27.2, '#b9b6ae', NC);
      for (const f of [1, 2])
        for (const s of [250, 254.75, 259.5])
          h.P(
            f === 2 && s === 250 ? litWin(false) : alWin,
            2.2,
            1.5,
            s,
            3.3 * f + 1.7,
            13.97,
            'st',
            f === 2 && s === 250 ? { emissive: 0.5 } : undefined
          );
      h.B(248.5, 261, 3.2, 3.32, 12.9, 14, '#c9c2b2', NC);
      h.P(bars, 12.5, 1.0, 254.75, 3.82, 12.92, 'st', { transparent: true, double: true }); // 2 樓陽台黑鐵欄杆
      for (const f of [0, 1, 2])
        for (const o of [19, 30]) {
          h.P(alWin, 1.8, 1.4, 247.47, 3.3 * f + 1.7, o, 's');
          h.P(alWin, 1.8, 1.4, 262.03, 3.3 * f + 1.7, o, 'n');
        }
    }
    // ---- E7 s263–278.5：白磁磚 2 樓透天（紅瓦女兒牆），退縮約 11 m；路邊方塊綠籬、一棵大樹、碎石前院停車；沒有招牌 ----
    {
      const r = lcg(1507),
        q = open(1, 263, 276, 5.0),
        A = 266.5,
        B = 275;
      q.B(263.6, 270, -0.8, 1.0, 5.0, 7.0, '#3f7a3a');
      q.B(270.6, 271.4, -0.5, 0.5, 5.2, 5.8, '#a0523a', NC);
      blob(q, 271, 5.5, 0.9, 0.5, 0.5, 0.5, '#4b8a3e');
      tree(q, 263.2, 8.2, 6.8, 3.0, r);
      q.B(263, 276, -1.5, 0.03, 7.0, 11, '#b5b0a4', NC);
      car(q, 271.5, 7.6, true, '#8a8d92');
      const h = open(1, A, B, 11),
        WALL = '#f0eee6';
      h.B(A, B, -2, 7.0, 11, 21, WALL);
      for (const [o0, o1] of [
        [10.8, 11.1],
        [20.9, 21.2],
      ])
        h.B(A - 0.2, B + 0.2, 7.0, 7.6, o0, o1, '#b5533f', NC);
      for (const [s0, s1] of [
        [A - 0.2, A + 0.1],
        [B - 0.1, B + 0.2],
      ])
        h.B(s0, s1, 7.0, 7.6, 10.8, 21.2, '#b5533f', NC);
      h.B(A + 0.4, B - 0.4, 3.3, 3.42, 10, 11, '#e6e4dc', NC);
      h.B(A + 0.4, B - 0.4, 3.42, 4.35, 10, 10.12, '#e6e4dc', NC); // 2 樓外推陽台白磁磚欄板
      for (const s of [268.6, 272.9]) h.P(alWin, 2.2, 1.5, s, 5.2, 10.97);
      ac(h.k, h.X(270.4), 4.5, -0.45);
      h.P(grWin, 2.0, 1.4, 268.3, 1.6, 10.97);
      h.B(270.3, 271.6, 0, 2.2, 10.92, 11, '#4a3a30', NC); // 深色大門
      for (let s = 272, i = 0; s < 274.9; s += 0.5, i++)
        h.B(s, s + 0.5, 2.62, 2.7, 9.8, 11, i % 2 ? '#f2f2ee' : '#3f8a5a', NC); // 綠白條紋雨遮
      for (const f of [0, 1])
        for (const o of [14, 18]) {
          h.P(alWin, 1.6, 1.3, A - 0.03, 3.3 * f + 1.7, o, 's');
          h.P(alWin, 1.6, 1.3, B + 0.03, 3.3 * f + 1.7, o, 'n');
        }
      const c = open(1, 275, 278.5, 11); // 北側灰色鐵皮平頂車棚
      c.B(275.1, 278.5, 2.7, 2.8, 11, 17, MR.roof, NC);
      for (const o of [11.2, 16.8]) c.C(278.3, o, 0.06, -1.5, 2.7, '#8d9196', { seg: 6 });
    }
    // 菱形網圍籬（每 2.8 m 一根柱、有斜撐，網上爬藤）
    const meshFence = (s0, s1, r, vine = 0.5) => {
      const n = Math.max(1, Math.round((s1 - s0) / 5.6)),
        w = (s1 - s0) / n;
      for (let i = 0; i < n; i++) {
        const a = s0 + i * w,
          q = open(1, a, a + w, 5.0);
        q.P(T.mesh(), w, 1.8, a + w / 2, 0.85, 5.0, 'st', { transparent: true, double: true });
        for (const s of [a, a + w / 2]) q.C(s + 0.03, 5.0, 0.035, -1, 1.8, '#a9aca8', { seg: 6 });
        q.line(a, 5.0, a + w, 5.0, 0, 1.8);
        for (let j = 0; j < 3; j++)
          if (r() < vine) {
            const s = a + r() * (w - 1.2);
            q.B(s, s + 0.8 + r() * 0.8, 0, 0.8 + r() * 0.9, 4.95, 5.07, GREEN[(r() * 4) | 0], NC);
          }
      }
    };
    // ---- E8 s276–314：一叢大樹，然後整段菱形網圍籬＋大草地＋沿圍籬的小樹；s≈283 水泥電桿掛兩個廣播喇叭、s≈290 香蕉樹 ----
    {
      const r = lcg(1508),
        q = open(1, 276, 295, 5.0),
        q2 = open(1, 295, 314, 5.0);
      tree(q, 277.2, 6.8, 6.5, 2.6, r);
      tree(q, 279.4, 8.5, 5.5, 2.2, r);
      meshFence(280, 314, r);
      for (const [s, h] of [
        [284.5, 3.4],
        [291.5, 4.2],
      ])
        tree(q, s, 7.5, h, 1.3, r, ['#5a8f45', '#6a9a4a']);
      for (const [s, h] of [
        [298.5, 3.2],
        [305, 4.4],
        [311, 3.6],
      ])
        tree(q2, s, 7.6, h, 1.3, r, ['#5a8f45', '#6a9a4a']);
      pole(q, 283, 4.75);
      for (const d of [-0.3, 0.3])
        q.B(283 + d - 0.15, 283 + d + 0.15, 6.2, 6.6, 4.4, 4.75, '#c9c9c4', NC);
      q.C(290, 9, 0.12, -1, 2.6, '#7a8a4a', { seg: 6 });
      for (const [ds, dz] of [
        [0.9, 0],
        [-0.9, 0.2],
        [0, 0.9],
        [0.2, -0.9],
      ])
        blob(q, 290 + ds, 9 + dz, 3.0, 0.9, 0.35, 0.9, '#6fa04a');
    }
    // ---- E9 s314–317：圍籬開口與路邊立柱招牌（紅色鋼管腳、黑底白字直式「餃皮」，下方小字「料理工坊」）；英文小字看不清，不寫 ----
    {
      const q = open(1, 314, 317, 5.0);
      q.B(314.2, 316.8, -1.5, 0.03, 5.0, 6.0, '#b5b0a4', NC);
      for (const o of [6.15, 6.95]) q.C(315.6, o, 0.05, -1, 3.3, '#c0392b', { seg: 6 });
      q.B(315.54, 315.66, 0.95, 3.3, 6.1, 7.0, '#151515', NC);
      for (const f of ['n', 's'])
        q.P(
          paint('餃\n皮', '#151515', '#ffffff', '料理工坊', 0.86, 2.3),
          0.86,
          2.3,
          315.6 + (f === 'n' ? 0.07 : -0.07),
          2.12,
          6.55,
          f,
          { emissive: 0.35 }
        );
    }
    // ---- E10 s315–334：「餃皮料理工坊」木造餐廳（橫木板牆、紅鋼板斜屋頂；南段 1 樓、中間 2 樓有內凹陽台、北端 1 樓小屋），前面菱形網圍籬 ----
    {
      const r = lcg(1510),
        q = open(1, 315, 325.5, 6.0),
        WOOD = '#a9825a',
        RED = '#b0483a';
      meshFence(317, 334, r, 0.75);
      q.B(315, 325.5, -2, 3.0, 6.0, 28, WOOD);
      q.P(T.siding(), 10.5, 3.0, 320.25, 1.5, 5.97);
      q.P(T.siding(), 22, 3.0, 314.97, 1.5, 17, 's');
      q.P(T.dark(), 8.4, 1.25, 320.2, 1.45, 5.94, 'st', { emissive: 0.25 });
      for (const s of [318.1, 322.4])
        q.P(T.hiWin(), 4.0, 0.6, s, 2.5, 5.94, 'st', { emissive: 0.3 });
      tri(q, 315, 325.5, 3.0, 2.0, 6.06, 0.12, WOOD);
      tri(q, 315, 325.5, 3.0, 2.0, 27.94, 0.12, WOOD);
      gableRoof(q, 315, 325.5, 6.0, 28, 3.0, 5.0, RED, 0.5);
      const n = open(1, 325.5, 330.5, 6.0); // 中間 2 樓
      n.B(325.5, 330.5, -2, 6.3, 6.0, 26, WOOD);
      n.P(T.siding(), 5, 6.3, 328, 3.15, 5.97);
      n.P(T.siding(), 20, 3.3, 330.53, 4.65, 16, 'n');
      n.P(T.siding(), 20, 3.3, 325.47, 4.65, 16, 's');
      n.B(326.3, 327.5, 0, 2.2, 5.93, 6.0, '#3a2f28', NC);
      n.B(325.6, 328.2, 2.35, 2.43, 5.3, 6.0, RED, NC); // 1 樓門與紅色小雨遮
      n.B(325.8, 328.3, 3.5, 5.7, 5.93, 6.0, '#3a2f28', NC);
      n.B(325.8, 328.3, 3.5, 4.4, 5.86, 5.93, '#8a6a44', NC); // 2 樓內凹陽台與木欄杆
      n.P(litWin(false), 1.3, 1.1, 329.4, 4.9, 5.94, 'st', { emissive: 0.5 });
      tri(n, 325.5, 330.5, 6.3, 1.1, 6.06, 0.12, WOOD);
      tri(n, 325.5, 330.5, 6.3, 1.1, 25.94, 0.12, WOOD);
      gableRoof(n, 325.5, 330.5, 6.0, 26, 6.3, 7.4, RED, 0.45);
      const l = open(1, 330.5, 334, 6.0); // 北端 1 樓小屋
      l.B(330.5, 334, -2, 3.0, 6.0, 20, WOOD);
      l.P(T.siding(), 3.5, 3.0, 332.25, 1.5, 5.97);
      l.P(T.siding(), 14, 3.0, 334.03, 1.5, 13, 'n');
      l.B(330.4, 334.3, 3.0, 3.14, 5.6, 20.3, RED, NC);
      for (const s of [334.7, 335.3, 335.9]) {
        pole(l, s, 5.0, 9.5);
        l.C(s, 5.0, 0.17, 0.3, 1.6, '#d8b02a', { seg: 8 });
      } // 牆角 3 根電桿（黃黑警示）
    }

    // =====================================================================================
    // 西側
    // =====================================================================================
    // ---- W1 s150–164：雜木土坡（沒有圍牆、沒有建物），s≈163 水泥電桿＋路燈 ----
    {
      const r = lcg(1601),
        q = open(-1, 150, 164, 4.8);
      tree(q, 152, 8.5, 7.5, 3.2, r);
      tree(q, 157.5, 9.8, 8.5, 3.4, r);
      tree(q, 161.5, 7.6, 6.5, 2.8, r);
      for (let s = 150.5; s < 164; s += 2.2)
        blob(q, s, 5.6 + r() * 0.8, 0.8 + r() * 0.5, 1.3, 0.9, 0.9, GREEN[(r() * 4) | 0]);
      pole(q, 161.3, 4.7, 8.5, 2.6);
    }
    // ---- W2 s162.5–176.5：水泥矮基座上暗紅色直條板圍籬、黑色帆布棚，後面灰色平頂 2 樓（只露出上半）----
    {
      for (const s of [162.5, 169.5]) {
        const q = open(-1, s, s + 7, 4.8);
        q.B(s, s + 7, -1, 0.5, 4.8, 5.0, '#8c8c86');
        q.B(s, s + 7, 0.5, 1.6, 4.86, 4.94, '#7a3f3c', NC);
        q.P(T.slat('#7a3f3c'), 7, 1.1, s + 3.5, 1.05, 4.85);
        q.line(s, 4.9, s + 7, 4.9, 0, 1.6);
      }
      const q = open(-1, 162.5, 176.5, 4.8);
      q.B(167, 173, 2.3, 2.38, 6, 9.5, '#1c1c1e', NC);
      for (const s of [167.1, 172.9])
        for (const o of [6.1, 9.4]) q.C(s, o, 0.04, -1, 2.3, '#8d9196', { seg: 6 });
      for (const [s, o] of [
        [163.5, 5.4],
        [164.7, 5.6],
      ])
        blob(q, s, o, 1.2, 0.9, 0.9, 0.5, '#42753a');
      const h = open(-1, 162, 172, 14);
      h.B(162, 172, -2, 5.8, 14, 26, '#8a8882');
      h.B(161.9, 172.1, 5.8, 6.25, 13.9, 26.1, '#7d7b76', NC);
      h.B(162.2, 171.8, 6.05, 6.27, 14.2, 25.8, '#6d6c68', NC);
      for (const f of [0, 1])
        for (const s of [164.5, 169.5]) h.P(alWin, 1.8, 1.2, s, 2.9 * f + 1.6, 13.97);
      for (const f of [0, 1])
        for (const o of [17, 23]) h.P(alWin, 1.6, 1.2, 172.03, 2.9 * f + 1.6, o, 'n');
    }
    // ---- W3 s176.5–192：褪色的淺綠塑膠浪板圍籬、爬滿藤蔓的洗石子矮牆；獨棟 4 樓別墅（窄高的灰米色石材樓、深綠框小窗、屋頂綠玻璃屋）退在後面 ----
    {
      const r = lcg(1603),
        q = open(-1, 176.5, 180, 4.8);
      for (let s = 176.5, i = 0; s < 179.9; s += 0.7, i++)
        q.B(s, s + 0.68, -0.8, 1.5, 4.8, 4.86, i % 3 ? '#c9cfae' : '#b4c4a0', NC);
      q.line(176.5, 4.8, 180, 4.8, 0, 1.5);
      const v = open(-1, 180, 192, 4.8);
      v.B(180, 192, -1, 1.8, 4.8, 5.1, '#a9a79c');
      for (let s = 180.4; s < 192; s += 1.25)
        blob(
          v,
          s,
          5.0 + r() * 0.5,
          1.5 + r() * 1.3,
          1.1,
          1.0 + r() * 0.7,
          0.75,
          GREEN[(r() * 4) | 0]
        ); // 蓋住整面牆的藤蔓
      tree(v, 183, 7.6, 3.6, 1.8, r);
      tree(v, 190, 7.8, 4.2, 2.0, r);
      const p = open(-1, 181, 190, 10.5),
        WALL = '#b3aa9a',
        BAND = '#c9c1b2'; // 前面較低的一段（露台）
      p.B(181, 190, -2, 3.6, 10.5, 13, WALL);
      p.B(180.9, 190.1, 3.6, 4.5, 10.4, 10.55, BAND, NC);
      p.P(vWin, 1.2, 1.4, 185.5, 1.9, 10.47);
      const h = open(-1, 182.5, 188.5, 13);
      h.B(182.5, 188.5, -2, 12.8, 13, 20.5, WALL);
      for (let f = 1; f <= 4; f++)
        h.B(182.44, 188.56, 3.2 * f - 0.14, 3.2 * f + 0.14, 12.92, 20.58, BAND, NC);
      for (let f = 0; f < 4; f++) {
        for (const s of [184, 187])
          h.P(
            f === 1 && s > 185 ? litWin(false) : vWin,
            1.0,
            1.5,
            s,
            3.2 * f + 1.7,
            12.97,
            'st',
            f === 1 && s > 185 ? { emissive: 0.5 } : undefined
          );
        for (const o of [15, 18.5]) {
          h.P(vWin, 1.0, 1.4, 188.53, 3.2 * f + 1.7, o, 'n');
          h.P(vWin, 1.0, 1.4, 182.47, 3.2 * f + 1.7, o, 's');
        }
      }
      ac(h.k, h.X(185.9), 3.5, -0.45);
      ac(h.k, h.X(185.9), 6.7, -0.45);
      h.B(182.2, 188.8, 12.94, 13.2, 12.7, 20.8, '#6a655c', NC);
      h.B(183.2, 187.8, 13.2, 15.0, 13.6, 18, '#7fb5a5', NC);
      h.B(183.0, 188, 15.0, 15.12, 13.4, 18.2, '#4a6a60', NC);
    }
    // ---- W4 s192–264：「大學藝墅館社區」連續亂石砌擋土牆（南端高 1.6、北端 2.6）＋牆頂鐵欄杆與綠籬，牆後 5 排 4 樓別墅的山牆端 ----
    {
      const r = lcg(1604);
      for (let s = 192; s < 263.9; s += 6) {
        const q = open(-1, s, s + 6, 4.8),
          hw = platform(s + 3);
        q.B(s, s + 6, -1.5, hw, 4.8, 5.3, '#a39a85');
        q.P(T.rubble(), 6, hw + 0.5, s + 3, (hw - 0.5) / 2, 4.78);
        q.B(s, s + 6, -1.5, hw - 0.04, 5.3, VSET + 0.05, '#7f8a62', NC); // 牆後的地坪
        q.B(s, s + 6, hw, hw + 0.08, 4.78, 5.34, '#8f8877', NC);
        q.P(bars, 6, 1.0, s + 3, hw + 0.55, 4.9, 'st', { transparent: true, double: true });
        q.B(s + 0.1, s + 5.9, hw - 0.04, hw + 0.7 + r() * 0.25, 5.5, 6.6, '#3f6f38', NC);
        if (r() < 0.6)
          tree(q, s + 1.5 + r() * 3, 7.4, hw + 2.6 + r() * 1.2, 1.2, r, GREEN, hw - 0.2);
      }
      const e0 = open(-1, 190, 192, 4.8),
        e1 = open(-1, 264, 264.3, 4.8); // 地坪南北兩端的收邊牆
      e0.B(191.7, 192, -1.5, 1.6, 5.3, 31, '#a39a85');
      e1.B(264, 264.3, -1.5, 2.6, 4.8, 31, '#a39a85');
      VILLAS.forEach(([a, b, sh], i) => {
        const q = open(-1, a, b, VSET),
          P = platform((a + b) / 2),
          m = (a + b) / 2,
          WALL = '#b5a898',
          BEIGE = '#d2cabb',
          FR = '#3d5850',
          top3 = P + 9.6,
          top = P + 12.6;
        q.B(a, b, -2, top3, VSET, 20, WALL, TILE); // 1～3 樓（山牆端那一戶）
        q.B(a + sh, b + sh, -2, top, 20, 31, WALL, TILE); // 往西第二戶（整排往西略偏北）
        q.B(a + 0.4, b - 0.4, top3, top, VSET + 2.6, 20, WALL, { ...TILE, col: false }); // 4 樓退縮成露台
        q.B(a, b, top3, top3 + 0.95, VSET, VSET + 0.15, BEIGE, NC);
        for (let f = 0; f <= 3; f++)
          q.B(
            a - 0.06,
            b + 0.06,
            P + 3.2 * f - 0.16,
            P + 3.2 * f + 0.16,
            VSET - 0.07,
            20.06,
            BEIGE,
            NC
          ); // 米色石材腰帶
        q.B(a - 0.03, b + 0.03, -2, P + 0.9, VSET - 0.04, 20.03, BEIGE, NC);
        // 屋頂：深褐斜瓦簷口＋綠玻璃採光屋
        q.B(a - 0.3, b + 0.3, top, top + 0.28, VSET + 2.2, 20.4, '#5a4a42', NC);
        q.B(a + sh - 0.3, b + sh + 0.3, top, top + 0.28, 19.8, 31.3, '#5a4a42', NC);
        q.B(m - 2.2, m + 2.2, top + 0.28, top + 2.3, 13.5, 18.5, '#7fb5a5', NC);
        q.B(m - 2.4, m + 2.4, top + 2.3, top + 2.42, 13.3, 18.7, '#4a6a60', NC);
        q.B(m + sh - 2.2, m + sh + 2.2, top + 0.28, top + 2.0, 23, 28, '#7fb5a5', NC);
        // 1～3 樓八角凸窗（深綠框、綠玻璃）
        q.B(m - 1.5, m + 1.5, P + 0.5, top3 - 0.3, VSET - 0.8, VSET, FR, NC);
        for (const sd of [-1, 1])
          q.k.slab(
            q.X(m + sd * 1.5),
            q.Z(VSET - 0.8),
            q.X(m + sd * 2.3),
            q.Z(VSET),
            0.1,
            P + 0.5,
            top3 - 0.3,
            FR,
            NC
          );
        q.B(m - 2.35, m + 2.35, top3 - 0.3, top3 - 0.18, VSET - 0.9, VSET, '#5a4a42', NC);
        for (let f = 0; f < 3; f++) {
          const lit = (i + f) % 4 === 1;
          q.P(
            lit ? litWin(false) : T.bay(),
            2.9,
            2.1,
            m,
            P + 3.2 * f + 1.75,
            VSET - 0.82,
            'st',
            lit ? { emissive: 0.5 } : undefined
          );
          for (const sd of [-1, 1])
            q.P(vWin, 1.0, 1.5, m + sd * 3.7, P + 3.2 * f + 1.75, VSET - 0.03);
        }
        for (const sd of [-1, 1]) q.P(vWin, 1.4, 1.5, m + sd * 2.2, top3 + 1.75, VSET + 2.57);
        for (let f = 0; f < 3; f++)
          for (const o of [12.5, 16.5]) {
            q.P(vWin, 1.1, 1.5, b + 0.03, P + 3.2 * f + 1.75, o, 'n');
            q.P(vWin, 1.1, 1.5, a - 0.03, P + 3.2 * f + 1.75, o, 's');
          }
        // 排與排之間的後院／巷道地坪
        const nb = VILLAS[i + 1];
        if (nb) {
          const g = open(-1, b, nb[0], VSET);
          g.B(b, nb[0], -2, platform((b + nb[0]) / 2) - 0.04, VSET, 31, '#8f8f88', NC);
        }
      });
      const g0 = open(-1, 192, 196, VSET);
      g0.B(192, 196, -2, 1.56, VSET, 31, '#8f8f88', NC);
    }
    // ---- W5 s264–274：社區大門：兩根貼米色石片的方柱頂一片平頂水泥板，裡面是車道；柱邊黑色鐵柵。沒有看到社區名稱字樣 ----
    {
      const q = open(-1, 264, 274, 5.0);
      for (const s of [265, 272]) q.B(s, s + 1, -1.5, 2.7, 5.0, 6.0, '#c9c2b4');
      q.B(264.5, 273.5, 2.7, 3.2, 4.6, 7.8, '#b8b2a6', NC);
      q.B(266, 272, -1.5, 0.03, 4.8, 14, '#8f8f8a', NC);
      q.P(bars, 0.7, 1.8, 264.65, 0.9, 5.5, 'st', { transparent: true, double: true });
      q.P(bars, 1.0, 1.8, 273.5, 0.9, 5.5, 'st', { transparent: true, double: true });
    }
    // ---- W6 s274–283：水泥矮牆＋深色鐵欄杆，牆內大樹，後面一棟灰米色 3 樓（幾乎被樹擋住）；s≈281 路燈桿 ----
    {
      const r = lcg(1606),
        q = open(-1, 274, 283, 4.8);
      q.B(274, 283, -1, 0.8, 4.8, 5.0, '#9a9890');
      q.P(bars, 9, 1.0, 278.5, 1.3, 4.9, 'st', { transparent: true, double: true });
      q.line(274, 4.9, 283, 4.9, 0, 1.8);
      tree(q, 275.3, 6.8, 6.0, 2.4, r);
      tree(q, 278, 8.4, 7.6, 3.0, r);
      tree(q, 281.2, 7.2, 7.2, 2.8, r);
      pole(q, 281.6, 4.7, 8.5, 2.6);
      const h = open(-1, 274.5, 280.5, 10.5);
      h.B(274.5, 280.5, -2, 9.6, 10.5, 16.5, '#b5ada0');
      h.B(274.4, 280.6, 9.6, 10.1, 10.4, 16.6, '#a39c90', NC);
      for (let f = 0; f < 3; f++) h.P(alWin, 2.0, 1.4, 277.5, 3.2 * f + 1.7, 10.47);
    }
    // ---- W7 s283–333：水泥矮基座上舊鍍鋅鋼管圍籬，後面密密一整片竹叢與雜木，沒有任何建物；s≈322 禁止停車圓牌、s≈333 凸面鏡 ----
    {
      const r = lcg(1607),
        BAM = ['#5f7f3a', '#6b8c40', '#557535', '#7a9a48'];
      for (let s = 283; s < 332.9; s += 5) {
        const q = open(-1, s, s + 5, 4.8);
        q.B(s, s + 5, -1, 0.3, 4.8, 4.98, '#8c8c86');
        q.P(T.pipe(), 5, 1.2, s + 2.5, 0.9, 4.88, 'st', { transparent: true, double: true });
        q.line(s, 4.88, s + 5, 4.88, 0, 1.5);
        for (let x = 0.4; x < 5; x += 1.4)
          blob(
            q,
            s + x + r() * 0.6,
            6.0 + r() * 0.8,
            1.2 + r() * 0.9,
            1.1,
            1.3,
            0.9,
            BAM[(r() * 4) | 0]
          ); // 圍籬後的雜木
        for (let j = 0; j < 5; j++) {
          // 竹叢：幾根細竹稈＋往上散開下垂的葉團
          const cs = s + 0.4 + r() * 4.2,
            co = 6.4 + (j % 3) * 4.6 + r() * 3.2,
            h = 9.5 + r() * 4;
          for (let c = 0; c < 4; c++)
            q.C(
              cs + (r() - 0.5) * 0.9,
              co + (r() - 0.5) * 0.9,
              0.05,
              -1.5,
              h * (0.8 + r() * 0.2),
              '#8aa05a',
              { seg: 5 }
            );
          for (let c = 0; c < 4; c++)
            blob(
              q,
              cs + (r() - 0.5) * 2.2,
              co + (r() - 0.5) * 2.2,
              h * (0.55 + c * 0.14),
              1.5 + r() * 0.7,
              1.9 + r() * 0.9,
              1.5 + r() * 0.7,
              BAM[(r() * 4) | 0]
            );
        }
      }
      const q = open(-1, 318, 334, 4.8);
      roundSign(q, 322, 4.6);
      q.C(333.2, 4.6, 0.04, -1, 2.7, '#d8b02a', { seg: 6 });
      blob(q, 333.2, 4.52, 2.6, 0.38, 0.38, 0.06, '#e07a2a');
      blob(q, 333.2, 4.47, 2.6, 0.3, 0.3, 0.04, '#c9d2d8');
    }
    // ---- W8 s333–345：運動場角落的「中原大學」深灰石牌、褐色直條木圍籬、不鏽鋼機車擋與幾台機車；石牌下方小字看不清，不寫 ----
    {
      const q = open(-1, 334, 341.4, 5.8);
      q.B(336.2, 337.8, -1, 1.8, 6.0, 6.25, '#55585a');
      q.P(paint('中原大學', '#55585a', '#ffffff', null, 1.4, 0.42), 1.4, 0.42, 337, 1.3, 5.98);
      q.B(338, 341.4, -1, 1.6, 5.8, 5.9, '#9a6a4a');
      q.P(T.slat('#9a6a4a'), 3.4, 1.6, 339.7, 0.8, 5.78);
      for (const s of [338.3, 340.1]) {
        for (const d of [0, 0.9]) q.C(s + d, 4.6, 0.03, -0.5, 0.85, '#c9ccd0', { seg: 6 });
        q.B(s - 0.03, s + 0.93, 0.82, 0.88, 4.57, 4.63, '#c9ccd0', NC);
      }
      [334.6, 335.5, 336.6, 337.7, 339.3].forEach((s, i) =>
        bike(q.k, q.X(s), -1.75, 1, C.bikeCols[(i * 2 + 1) % 6])
      );
    }
  },

  // custom 佔的地：只圈真的蓋了東西的地方（樹林、草地、竹林不圈）
  footprints(F) {
    const E = (s0, s1, set, d) => F(REF, s0, s1, 1, set, d),
      W = (s0, s1, set, d) => F(REF, s0, s1, -1, set, d);
    return [
      E(150, 197.6, 4.8, 0.6),
      E(150, 170, 21, 19),
      E(188, 196, 15, 4),
      E(181, 188, 15, 6), // 圍籬、菜圃、牆後小屋
      E(197.6, 217.3, 4.8, 18.6),
      E(210, 217.5, 14.5, 12.5),
      E(201.6, 210.8, 23.4, 14.6),
      E(191, 202, 28, 11),
      E(196, 200.5, 20.7, 5.5), // 粗粗大舍的門與碎石空地、紅磚屋、紅鐵皮屋、灰鐵皮屋、白色小屋
      E(217.3, 222, 4.8, 9.6),
      E(222, 237.2, 4.8, 37.5), // 裝卸棚、鐵皮倉庫與雨遮
      E(236, 243.5, 4.8, 5.2),
      E(243.5, 263, 4.8, 32.5), // 車道、紅磚圍牆、車庫、3 樓透天
      E(263, 276, 4.8, 6.4),
      E(266.5, 278.5, 10, 11.2), // 綠籬與前院、白磁磚透天與車棚
      E(276, 334, 4.8, 0.7), // 菱形網圍籬
      E(314, 334.4, 5.5, 22.8), // 餃皮料理工坊
      W(162.5, 176.5, 4.6, 5.2),
      W(162, 172, 14, 12), // 暗紅圍籬、灰色平頂房
      W(176.5, 192, 4.6, 0.8),
      W(181, 190, 10.5, 10.2), // 浪板圍籬與藤蔓牆、獨棟別墅
      W(192, 267.5, 4.6, 26.8), // 擋土牆與別墅群
      W(264, 274, 4.6, 9.6),
      W(274, 283, 4.6, 12.2), // 社區大門、矮牆與後面 3 樓
      W(283, 333, 4.6, 0.7), // 鋼管圍籬
      W(334, 341.4, 4.2, 2.2), // 校名石牌、木圍籬、機車位
    ];
  },
};
