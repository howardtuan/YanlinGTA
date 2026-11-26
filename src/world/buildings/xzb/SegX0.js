// 新中北路 s 0～40（環中東路口轉角；Google 街景：路口 2024-08、s≈12 2022-08，s 18 以西只有 2009-09；配合國土測繪 2024 正射與 Google 衛星）。
//   s 0～14 在路口裡面（環中東路參考線 HN 在 s≈14 穿過），實際要蓋的是路口西北角與西南角的尖角：
//   北側（+1）西北角：一大片雜草空地（2009 的「北海一番」立柱看板與紅色鋼構停車場拱門都還在，只剩生鏽骨架）：
//     沿新中北路一道紅磚矮緣、空地東緣沿著往北的窄巷一道紅磚矮牆（磚柱加帽）、西緣一道灰色矮牆（正射看得到牆影，2009 是灰色圍牆）；
//     轉角生鏽的鋼構拱門跨在窄巷口（拱上白色布條「本空地500坪…」、左柱掛藍底「P 24 → 15」停車牌）、空地裡一面生鏽雙柱大看板（板面褪成白色、背後鐵架與爬梯）、
//     西柱下段的紅黑「鍋湯滙 貴賓停車場 P」牌；窄巷東邊沿環中東路是「鍋湯滙」1 層黑色鐵皮鍋物店（2024-08：一樓落地窗＋紅色腰帶、平雨遮、黑色直條浪板封簷、
//     屋頂紅色大招牌「P ↑ 免費停車 鍋湯滙」、門口紅色直立牌「24H 鍋湯滙 P」）。
//   南側（-1）西南角的尖角：2024-08／2022-08 是人行道、一棵大樹、電桿，後面是 Mr.May 的停車場（環中東路 D 段 dn1 已經蓋了），這段不另外蓋東西。
//   遊戲裡的填充樓 f346（壓在雜草空地上）與 f345（鍋湯滙的位置）都有店面牆，不能 drop，改用 hide。
//   出租布條上的電話與聯絡人姓名不放（只寫「本空地500坪」）。
import { H } from '../../Terrain.js';

const R = 'X';
const FNT = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
// 開一個對著新中北路的 Kit：k.sx(s) 把沿線距離換成區域 x，k.zo(off) 把離中心線距離換成區域 z（寫法同 SegX3）
const seg = (C, side, s0, s1, set) => {
  const k = C.kit(R, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  k.zo = (off) => off - set;
  return k;
};
// 不沿著新中北路的東西（環中東路旁的店、斜放的看板）：開一個 Kit 再把原點搬到世界座標 (x, z)，
// 立面（區域 -z）朝世界方向 (dx, dz)，區域 +x 是世界方向 (−dz, dx)
const kitAt = (C, x, z, dx, dz) => {
  const k = C.kit(R, 20, 21, 1, 8),
    L = Math.hypot(dx, dz),
    c = -dz / L,
    s = dx / L;
  k.W = 1;
  delete k.w;
  k.ox = x;
  k.oz = z;
  k.c = c;
  k.s = s;
  k.ang = Math.atan2(s, c);
  k.base = H(x, z);
  k.group.position.set(x, k.base, z);
  k.group.rotation.y = -k.ang;
  return k;
};
const ball = (C, k, x, y, z, r, hex, sy = 1, sx = 1) => {
  const g = new C.THREE.SphereGeometry(r, 8, 6);
  g.scale(sx, sy, 1);
  g.translate(x, y, z);
  k._part(C.VC, C.paintGeo(g, hex));
};
// 闊葉樹：樹幹＋幾團樹冠
const tree = (C, k, x, z, h, cr, r) => {
  k.cyl(x, z, 0.24, -0.5, h - cr, '#5e4630', { seg: 6, r1: 0.16, col: true });
  ball(C, k, x, h - cr * 0.85, z, cr * 0.8, '#3f7a3a', 0.75);
  for (let j = 0; j < 4; j++) {
    const a = j * 1.57 + r() * 0.8;
    ball(
      C,
      k,
      x + Math.cos(a) * cr * 0.5,
      h - cr * (0.95 + r() * 0.3),
      z + Math.sin(a) * cr * 0.5,
      cr * (0.55 + r() * 0.15),
      j % 2 ? '#4b8a3e' : '#356b34',
      0.72
    );
  }
};
// 香蕉樹：細幹＋幾片往外垂的大葉
const banana = (C, k, x, z, h, r) => {
  k.cyl(x, z, 0.13, -0.3, h * 0.7, '#7d8a52', { seg: 6, r1: 0.1 });
  for (let j = 0; j < 6; j++) {
    const a = j * 1.05 + r() * 0.5,
      g = new C.THREE.BoxGeometry(1.5, 0.05, 0.45);
    g.translate(0.75, 0, 0);
    g.rotateZ(0.15 + r() * 0.35);
    g.rotateY(a);
    g.translate(x, h * 0.72 + r() * 0.3, z);
    k._part(C.VC, C.paintGeo(g, j % 2 ? '#5f9a46' : '#76a84e'));
  }
};
// 紅磚矮牆：牆身 ~1 m、每 pitch 公尺一根磚柱（加水泥帽），區域座標 (x0,z0)→(x1,z1)
const brickWall = (C, k, x0, z0, x1, z1, pitch = 2.8) => {
  const L = Math.hypot(x1 - x0, z1 - z0),
    n = Math.max(1, Math.round(L / pitch));
  C.paintGeo(k.slab(x0, z0, x1, z1, 0.24, -0.3, 1.0, C.VC), '#9a5a44');
  C.paintGeo(k.slab(x0, z0, x1, z1, 0.3, 1.0, 1.07, C.VC, { col: false }), '#b3aea4');
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      x = x0 + (x1 - x0) * t,
      z = z0 + (z1 - z0) * t;
    k.box(x - 0.22, x + 0.22, -0.3, 1.3, z - 0.22, z + 0.22, '#8f523e', { col: false });
    k.box(x - 0.27, x + 0.27, 1.3, 1.4, z - 0.27, z + 0.27, '#b3aea4', { col: false });
  }
};
// 生鏽的鋼管柱
const RUST = '#8a4a2c',
  RUST2 = '#6e3a24';

export default {
  drop: [],
  // f346 壓在西北角雜草空地上、f345 在鍋湯滙的位置，兩棟都有朝街的店面牆（world.shopWalls），不能 drop
  hide: ['f346', 'f345'],
  ownSign: ['鍋湯滙'],
  lots: [],
  custom(C) {
    const { sg, FRONT, lcg } = C,
      r = lcg(7019);
    // ---------- 貼圖 ----------
    // 鍋湯滙屋頂紅色大招牌：左邊白圈 P、白色往上箭頭、「免費停車」直書框，右邊白色鍋子圖示＋「鍋湯滙」
    const guoSign = sg('xzb0GuoSign', 1024, 128, (g) => {
      g.fillStyle = '#c0242a';
      g.fillRect(0, 0, 1024, 128);
      g.fillStyle = '#e8e4dc';
      g.fillRect(0, 0, 1024, 6);
      g.fillRect(0, 122, 1024, 6);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(70, 64, 50, 0, 7);
      g.fill();
      g.fillStyle = '#c0242a';
      g.font = FNT(72);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('P', 70, 68);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(170, 18);
      g.lineTo(196, 54);
      g.lineTo(180, 54);
      g.lineTo(180, 110);
      g.lineTo(160, 110);
      g.lineTo(160, 54);
      g.lineTo(144, 54);
      g.closePath();
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 4;
      g.strokeRect(222, 14, 74, 100);
      g.font = FNT(40);
      g.fillText('免費', 259, 42);
      g.fillText('停車', 259, 88);
      g.beginPath();
      g.ellipse(700, 70, 38, 22, 0, 0, 7);
      g.stroke();
      g.fillRect(668, 44, 64, 5);
      g.font = FNT(84);
      g.fillText('鍋湯滙', 860, 68);
    });
    // 門口紅色直立牌「24H 鍋湯滙 P」
    const guoVert = sg('xzb0GuoVert', 128, 512, (g) => {
      g.fillStyle = '#c62a2a';
      g.fillRect(0, 0, 128, 512);
      g.fillStyle = '#f2d23a';
      g.font = FNT(46);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('24H', 64, 52);
      g.fillStyle = '#ffffff';
      g.font = FNT(72);
      ['鍋', '湯', '滙'].forEach((t, i) => g.fillText(t, 64, 150 + i * 92));
      g.fillStyle = '#ffffff';
      g.fillRect(18, 410, 92, 84);
      g.fillStyle = '#1f4ea0';
      g.font = FNT(70);
      g.fillText('P', 64, 456);
    });
    // 落地窗：深色玻璃（裡面隱約有燈與桌椅）
    const glassTex = sg('xzb0Glass', 128, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, '#5d6a72');
      gr.addColorStop(0.5, '#2c3338');
      gr.addColorStop(1, '#1c2024');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(255,240,210,.55)';
      g.fillRect(14, 10, 30, 4);
      g.fillRect(80, 10, 30, 4);
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(0, 0, 128, 40);
      // 店裡的暖色燈光與桌椅剪影（晚上 emissive 會把這塊點亮）
      g.fillStyle = 'rgba(255,226,180,.3)';
      g.fillRect(0, 44, 128, 50);
      g.fillStyle = 'rgba(40,30,24,.4)';
      for (const x of [10, 52, 94]) {
        g.fillRect(x, 78, 26, 6);
        g.fillRect(x + 10, 84, 6, 30);
      }
    });
    // 藍底停車牌「P 24 →」，下半白底綠字「15」（細字看不清不放）
    const pSign = sg('xzb0PSign', 128, 192, (g) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 128, 192);
      g.fillStyle = '#2a4fa8';
      g.fillRect(4, 4, 120, 104);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FNT(78);
      g.fillText('P', 46, 52);
      g.font = FNT(26);
      g.fillText('24', 102, 30);
      g.fillRect(70, 78, 40, 6);
      g.beginPath();
      g.moveTo(120, 81);
      g.lineTo(106, 70);
      g.lineTo(106, 92);
      g.closePath();
      g.fill();
      g.fillStyle = '#2f8a3e';
      g.font = FNT(64);
      g.fillText('15', 64, 146);
      g.fillStyle = '#c62a2a';
      g.fillRect(8, 178, 112, 10);
    });
    // 紅黑小牌「鍋湯滙 貴賓停車場 P」
    const vipSign = sg('xzb0Vip', 128, 160, (g) => {
      g.fillStyle = '#b22a24';
      g.fillRect(0, 0, 128, 64);
      g.fillStyle = '#1c1c1e';
      g.fillRect(0, 64, 128, 96);
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FNT(36);
      g.fillText('鍋湯滙', 64, 32);
      g.font = FNT(22);
      g.fillText('貴賓', 34, 92);
      g.fillText('停車場', 34, 128);
      g.fillStyle = '#2a5fb8';
      g.fillRect(70, 78, 50, 64);
      g.fillStyle = '#ffffff';
      g.font = FNT(48);
      g.fillText('P', 95, 112);
    });
    // 拱門上的白色出租布條（電話與聯絡人不放）
    const rentTex = sg('xzb0Rent', 512, 96, (g) => {
      g.fillStyle = '#e8e6e0';
      g.fillRect(0, 0, 512, 96);
      g.fillStyle = '#6a6e74';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = FNT(64);
      g.fillText('本空地500坪', 256, 50);
    });
    // 褪色的大看板：白底、鏽斑、殘留的淡色塊
    const fadedTex = sg('xzb0Faded', 256, 128, (g) => {
      const q = lcg(311);
      g.fillStyle = '#e4e1d8';
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = 'rgba(160,150,130,.35)';
      g.fillRect(20, 30, 120, 50);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${130 + q() * 40},${70 + q() * 20},40,${0.15 + q() * 0.3})`;
        g.fillRect(q() * 256, q() * 128, 4 + q() * 18, 2 + q() * 10);
      }
      for (let x = 0; x < 256; x += 32) {
        g.fillStyle = 'rgba(120,110,95,.35)';
        g.fillRect(x, 0, 2, 128);
      }
    });

    // ================= 北側：西北角雜草空地（s 14.6～38.9） =================
    // 地面、矮緣、雜草都用世界座標換成這個 Kit 的區域座標（k.l）
    const k = seg(C, 1, 14.6, 38.9, 7.3),
      L = (x, z) => k.l(x, z);
    {
      // 雜草地：空地範圍 x 538.2～560.1、z 75～95.4（遊戲人行道後緣 z≈95.4，窄巷西緣 x≈560.2）
      const A = L(538.2, 95.4),
        B = L(560.1, 95.4);
      const x0 = Math.min(A[0], B[0]),
        x1 = Math.max(A[0], B[0]);
      // 空地前緣跟著人行道後緣（遊戲裡在離中心線約 7.3 m），往後 20.4 m
      k.box(x0, x1, -0.3, 0.05, 0.1, 20.4, '#7f9a55', { col: false });
      // 東北角一塊枯黃的草
      k.box(x0, x0 + 8, 0.05, 0.07, 9, 20.4, '#a69a62', { col: false });
      // 沿人行道一道紅磚矮緣（約 0.3 m）
      k.box(x0, x1, -0.3, 0.3, 0.1, 0.35, '#9a5a44');
      // 雜草叢、矮灌木
      for (let i = 0; i < 70; i++) {
        const x = x0 + 0.6 + r() * (x1 - x0 - 1.2),
          z = 0.8 + r() * 19;
        ball(
          C,
          k,
          x,
          0.15,
          z,
          0.45 + r() * 0.6,
          ['#6f9a48', '#5c8a3e', '#86a856', '#9aa35a'][i % 4],
          0.6 + r() * 0.9,
          1.3
        );
      }
      // 樹（正射樹冠位置）：前排靠路的一叢、中間一棵、西北邊一棵小樹
      for (const [wx, wz, h, cr] of [
        [553.6, 94.0, 4.2, 1.9],
        [551.6, 95.2, 3.6, 1.5],
        [546.5, 92.4, 4.0, 1.6],
        [542.4, 81.8, 3.4, 1.3],
      ]) {
        const p = L(wx, wz);
        tree(C, k, p[0], p[1], h, cr, r);
      }
      // 香蕉樹（2022／2024 空地裡一叢一叢）
      for (const [wx, wz] of [
        [549.5, 86.5],
        [551.0, 88.0],
        [556.5, 84.0],
        [544.5, 89.5],
        [552.5, 90.5],
        [547.0, 84.5],
        [557.5, 88.5],
        [541.5, 92.0],
        [554.0, 80.0],
      ]) {
        const p = L(wx, wz);
        banana(C, k, p[0], p[1], 2.6 + r() * 0.8, r);
      }
      // 東緣：沿窄巷西側的紅磚矮牆（磚柱加帽），從人行道後緣往北
      {
        const a = L(560.2, 95.2),
          b = L(560.2, 75.4);
        brickWall(C, k, a[0], a[1], b[0], b[1]);
      }
      // 西緣：灰色水泥矮牆（正射有牆影；2009 街景是灰色圍牆）
      {
        const a = L(538.1, 95.4),
          b = L(538.1, 75.4);
        C.paintGeo(k.slab(a[0], a[1], b[0], b[1], 0.2, -0.3, 1.5, C.VC), '#a9a8a2');
      }
    }
    // 生鏽雙柱大看板（2022-08：板面褪成白色、鏽框；背後鐵架與爬梯；2009 是「北海一番」看板），板面朝路口（東南）
    {
      const b = kitAt(C, 557.5, 92.4, 0.8, 0.6);
      // 兩根粗鋼管柱（往上多伸一截）
      for (const x of [-1.6, 1.6]) {
        b.cyl(x, 0.3, 0.26, -0.3, 10.2, RUST, { seg: 10, col: true });
        b.box(x - 0.4, x + 0.4, -0.3, 0.25, -0.1, 0.7, '#a3a19b');
      }
      // 板面 6.4 × 3.4、底邊 3.4 m；鏽色外框
      b.plane(fadedTex, 6.2, 3.2, 0, 5.1, -0.06, FRONT);
      b.box(-3.2, 3.2, 3.4, 3.55, -0.05, 0.1, RUST2, { col: false });
      b.box(-3.2, 3.2, 6.65, 6.8, -0.05, 0.1, RUST2, { col: false });
      b.box(-3.2, -3.05, 3.4, 6.8, -0.05, 0.1, RUST2, { col: false });
      b.box(3.05, 3.2, 3.4, 6.8, -0.05, 0.1, RUST2, { col: false });
      b.box(-3.2, 3.2, 3.4, 6.8, 0.1, 0.16, '#8f8a80', { col: false });
      // 背後鐵架：橫桿、斜撐、爬梯
      for (const y of [3.6, 5.1, 6.6])
        b.box(-3.1, 3.1, y - 0.05, y + 0.05, 0.6, 0.7, RUST2, { col: false });
      for (const x of [-3.0, 0, 3.0])
        b.box(x - 0.05, x + 0.05, 3.4, 6.8, 0.6, 0.7, RUST2, { col: false });
      b.box(2.2, 2.26, 0.4, 8.6, 1.0, 1.06, RUST2, { col: false });
      b.box(2.74, 2.8, 0.4, 8.6, 1.0, 1.06, RUST2, { col: false });
      for (let y = 0.8; y < 8.6; y += 0.45)
        b.box(2.26, 2.74, y, y + 0.04, 1.0, 1.06, RUST2, { col: false });
      // 柱頂平台
      b.box(-2.2, 2.2, 8.6, 8.7, 0.2, 1.6, RUST2, { col: false });
      b.box(-2.2, 2.2, 8.7, 9.6, 1.55, 1.6, RUST2, { col: false });
    }
    // 窄巷口生鏽的鋼構拱門（2009 是紅色停車場拱門）：兩根粗鋼管柱跨在窄巷口（x 560.6～569.8），拱頂約 8 m，拱上白色布條朝南；
    //   西柱（空地側，從南邊看是左柱）上面掛藍底停車牌、下面掛紅黑「鍋湯滙 貴賓停車場 P」牌，牌面朝東南
    {
      const a = kitAt(C, 565.2, 95.0, 0.13, 0.99),
        hw = 4.6;
      for (const x of [-hw, hw]) {
        a.cyl(x, 0, 0.3, -0.3, 7.4, RUST, { seg: 10, col: true });
        a.box(x - 0.4, x + 0.4, -0.3, 0.3, -0.4, 0.4, '#a3a19b');
      }
      // 拱：兩段斜樑＋中段，下緣再一道細樑
      C.paintGeo(a.slab(-hw, 0, -2.4, 0, 0.36, 7.1, 7.55, C.VC, { col: false }), RUST);
      C.paintGeo(a.slab(2.4, 0, hw, 0, 0.36, 7.1, 7.55, C.VC, { col: false }), RUST);
      {
        const g = new C.THREE.BoxGeometry(2.6, 0.45, 0.36);
        g.translate(0, 8.1, 0);
        a._part(C.VC, C.paintGeo(g, RUST));
      }
      for (const s of [-1, 1]) {
        const g = new C.THREE.BoxGeometry(1.4, 0.42, 0.36);
        g.rotateZ(s * 0.5);
        g.translate(s * 1.85, 7.75, 0);
        a._part(C.VC, C.paintGeo(g, RUST));
      }
      a.box(-hw, hw, 6.2, 6.3, -0.08, 0.08, RUST2, { col: false });
      // 白色出租布條（掛在西半邊，朝南）
      a.plane(rentTex, 4.4, 0.85, 2.3, 6.75, -0.22, FRONT);
      a.plane(pSign, 1.1, 1.65, hw + 0.05, 4.3, -0.36, FRONT + 0.5);
      a.plane(vipSign, 1.2, 1.5, hw + 0.05, 2.2, -0.36, FRONT + 0.5, { emissive: 0.2 });
      for (const y of [1.6, 2.8, 3.6, 5.0])
        a.box(hw - 0.1, hw + 0.5, y, y + 0.06, -0.38, -0.3, '#8a8d90', { col: false });
    }

    // ================= 鍋湯滙（窄巷東邊，沿環中東路北側，2024-08） =================
    // 立面朝環中東路（東南），離 HN 參考線 7.5 m；區域 +x 往西南，原點是東北端的前緣（HN s≈6），長 18 m 到窄巷邊、深 9 m
    {
      const g = kitAt(C, 585.04, 78.15, 0.6211, 0.7838),
        W = 18,
        D = 9;
      // 本體：黑色鐵皮
      g.box(0, W, -0.4, 5.6, 0, D, '#2a2b2e');
      // 一樓落地窗（正面與朝窄巷的西南側面）：黑色窗台、紅色腰帶、深色玻璃
      for (let x = 0.4; x < W - 0.6; x += 2.3) {
        g.plane(glassTex, 2.0, 1.75, x + 1.0, 2.05, -0.03, FRONT, { emissive: 0.9 });
        g.box(x, x + 2.0, 0.55, 1.15, -0.06, 0, '#c8322a', { col: false });
      }
      for (let z = 0.6; z < D - 1; z += 2.3) {
        g.plane(glassTex, 2.0, 1.75, W + 0.03, 2.05, z + 1.0, Math.PI / 2, { emissive: 0.9 });
        g.box(W, W + 0.06, 0.55, 1.15, z, z + 2.0, '#c8322a', { col: false });
      }
      // 窗間黑色鋼柱
      for (let x = 0.3; x <= W; x += 2.3)
        g.box(x, x + 0.12, 0, 3.0, -0.1, 0, '#1c1c1e', { col: false });
      // 平雨遮（灰綠色鐵皮，出挑 1.1 m），西南角往窄巷再伸 1 m
      g.box(-0.1, W + 1.1, 3.0, 3.15, -1.1, 0.2, '#8f9488', { col: false });
      g.box(W, W + 1.1, 3.0, 3.15, 0, D * 0.6, '#8f9488', { col: false });
      g.cyl(W + 0.9, -0.9, 0.06, 0, 3.0, '#5a5d60', { seg: 6 }); // 落水管
      // 封簷：黑色直條浪板（3.2～5.6）
      for (let x = 0.1; x < W; x += 0.5)
        g.box(x, x + 0.2, 3.2, 5.6, -0.12, -0.02, '#3a3b3f', { col: false });
      // 屋頂紅色大招牌（朝路微微後仰）＋背後支架
      g.box(0.2, W - 0.2, 5.6, 7.3, 0.1, 0.3, '#9a1e22', { col: false });
      g.plane(guoSign, W - 0.4, 1.6, W / 2, 6.45, 0.08, FRONT, { emissive: 0.9 });
      for (let x = 1; x < W; x += 3)
        g.box(x, x + 0.08, 5.6, 7.0, 0.3, 1.6, '#5a5d60', { col: false });
      // 門口紅色直立牌（立在店面中段的騎樓下，2024-08 在第 4、5 扇窗前）
      g.box(8.2, 8.8, -0.3, 0.1, -0.9, -0.5, '#a3a19b', { col: false });
      g.plane(guoVert, 0.55, 2.2, 8.5, 1.3, -0.92, FRONT, { emissive: 0.9 });
      g.plane(guoVert, 0.55, 2.2, 8.5, 1.3, -0.48, 0, { emissive: 0.9 });
      // 屋頂冷氣室外機
      for (const x of [3, 6.5, 11]) g.box(x, x + 1.0, 5.6, 6.3, 5, 5.7, '#d8d8d4', { col: false });
    }
  },
  footprints(F) {
    // 鍋湯滙與窄巷口拱門不沿新中北路，直接給世界座標的多邊形（Kit 原點 (585.04, 78.15)，+x (−0.7838, 0.6211)、+z (−0.6211, −0.7838)）
    const g = (x, z) => [585.04 - 0.7838 * x - 0.6211 * z, 78.15 + 0.6211 * x - 0.7838 * z];
    return [
      F(R, 14.6, 38.9, 1, 7.3, 20.4, 0.1), // 西北角雜草空地（含看板、矮牆）
      [g(-0.2, -1.8), g(19.3, -1.8), g(19.3, 9.1), g(-0.2, 9.1)], // 鍋湯滙
      [
        [560.2, 94.4],
        [570.2, 93.6],
        [570.4, 95.8],
        [560.4, 96.6],
      ], // 拱門兩根柱子
    ];
  },
};
