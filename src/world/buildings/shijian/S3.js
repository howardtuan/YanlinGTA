// 實踐路街屋資料：S 段 s 330～450，兩側。格式見 src/world/buildings/StreetShijian.js 檔頭。
// 照 Google 街景 2026-05 與國土測繪 2024 正射建模。這一段是夜市主街：三和一街口、實踐路58巷、52巷、弘揚路／大仁二街口。
// 區域座標提醒：站在街上面對立面時，x = 0 在右手邊、x = w 在左手邊（兩側都一樣）；z < 0 是立面前方（往街上），z > 0 往屋後。
import { sevenDaren2Face, adiDaren2Face } from '../d2/corners.js';
import { shrinkFont } from '../../../graphics/FitText.js';

const H = Math.PI / 2;
// ---- 這一段共用的小構件（都在各格的 extra 裡呼叫；c 是 StreetShijian.js 傳進來的 ctx）----
// 斜的帆布棚／鐵皮簷：從 (zA, yA) 到 (zB, yB) 的一片薄板
const slab = (k, c, x0, x1, zA, yA, zB, yB, hex, th = 0.06) => {
  const L = Math.hypot(zB - zA, yB - yA),
    g = new c.THREE.BoxGeometry(x1 - x0, th, L);
  g.rotateX(-Math.atan2(yB - yA, zB - zA));
  g.translate((x0 + x1) / 2, (yA + yB) / 2, (zA + zB) / 2);
  k._part(c.VC, c.paintGeo(g, hex));
};
// 凸出立面的雙面側招（板子垂直立面）
const hang = (k, c, tex, wd, ht, x, y, out, o = {}) => {
  for (const sd of [-1, 1])
    k.plane(tex, wd, ht, x + sd * 0.04, y, -out, sd * H, { emissive: 0.3, ...o });
  if (!o.transparent)
    k.box(x - 0.035, x + 0.035, y - ht / 2, y + ht / 2, -out - wd / 2, -out + wd / 2, '#3a3a3c', {
      col: false,
    });
  k.box(x - 0.03, x + 0.03, y + ht / 2 - 0.06, y + ht / 2, -out + wd / 2 - 0.05, 0, '#2b2b2b', {
    col: false,
  });
};
// V 字形的雙片斜招（尖端朝街、兩片各朝一個方向，順著街走或正對立面都看得到字）
const vsign = (k, c, tex, wd, ht, x, y) => {
  const a = 0.87,
    dx = (Math.cos(a) * wd) / 2,
    dz = (Math.sin(a) * wd) / 2,
    zA = -(2 * dz + 0.06);
  for (const sd of [-1, 1])
    k.plane(tex, wd, ht, x + sd * dx, y, zA + dz, Math.PI - sd * a, { emissive: 0.3 });
  k.box(x - 0.03, x + 0.03, y + ht / 2 - 0.06, y + ht / 2, zA, 0, '#6f7478', { col: false });
  k.box(x - 0.03, x + 0.03, y - ht / 2, y - ht / 2 + 0.06, zA, 0, '#6f7478', { col: false });
};
// 貼在立面上的看板
const flat = (k, c, tex, wd, ht, x, y, z = -0.07, em = 0.3) =>
  k.plane(tex, wd, ht, x, y, z, c.FRONT, { emissive: em });
// 圓形招牌貼圖：外圈 ring、底 bg、一行字加小字
const disc = (c, text, bg, ring, fg, sub) =>
  c.sg(`sj3D_${text}|${bg}|${ring}|${fg}|${sub || ''}`, 256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = ring;
    g.beginPath();
    g.arc(128, 128, 126, 0, 7);
    g.fill();
    g.fillStyle = bg;
    g.beginPath();
    g.arc(128, 128, 110, 0, 7);
    g.fill();
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    shrinkFont(g, text, 190, 84, 14, (sz) => c.font(sz));
    g.fillText(text, 128, sub ? 112 : 130);
    if (sub) {
      shrinkFont(g, sub, 160, 30, 10, (sz) => c.font(sz, 700));
      g.fillText(sub, 128, 172);
    }
  });
// 比共用招牌帶（0.8 m）更高的大橫招：那一格要加 noband
const bigSign = (k, c, text, bg, fg, sub, hgt = 1.25, style) => {
  k.box(0.05, c.w - 0.05, c.gf - 0.95, c.gf - 0.95 + hgt, -0.3, 0, bg, { col: false });
  flat(
    k,
    c,
    c.paint(text, bg, fg, sub, c.w - 0.2, hgt - 0.06, 128, style),
    c.w - 0.2,
    hgt - 0.06,
    c.w / 2,
    c.gf - 0.95 + hgt / 2,
    -0.31,
    0.35
  );
};
// 7-ELEVEN 招牌帶：白底、橘綠紅三條色帶，中間一個 7 標誌
const sevenBand = (c, wm) => {
  const W = Math.min(1536, Math.ceil((wm * 96) / 16) * 16);
  return c.sg(`sj3Seven${W}`, W, 96, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, 96);
    for (const [y, col] of [
      [20, '#f58220'],
      [40, '#008a4b'],
      [60, '#e31b23'],
    ]) {
      g.fillStyle = col;
      g.fillRect(0, y, W, 16);
    }
    g.fillStyle = '#ffffff';
    g.fillRect(W / 2 - 60, 0, 120, 96);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f58220';
    g.font = c.font(64);
    g.fillText('7', W / 2, 38);
    g.fillStyle = '#008a4b';
    g.font = c.font(20);
    g.fillText('ELEVEN', W / 2, 78);
  });
};
const sevenLogo = (c) =>
  c.sg('sj3SevenLogo', 192, 192, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 192, 192);
    g.strokeStyle = '#008a4b';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 182, 182);
    g.fillStyle = '#f58220';
    g.fillRect(14, 14, 164, 52);
    g.fillStyle = '#e31b23';
    g.fillRect(14, 66, 164, 20);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#e31b23';
    g.font = c.font(110);
    g.fillText('7', 96, 96);
    g.fillStyle = '#008a4b';
    g.font = c.font(30);
    g.fillText('ELEVEN', 96, 160);
  });
// 樓上某一層的鐵籠／黑鐵欄杆
const cage = (k, w, y, hex, out = 0.75) => {
  k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -out, 0, hex, { col: false });
  k.box(0.3, w - 0.3, y + 2.5, y + 2.58, -out, 0, hex, { col: false });
  for (let x = 0.3; x <= w - 0.29; x += 0.2)
    k.box(x, x + 0.03, y + 0.15, y + 2.5, -out, -out + 0.03, hex, { col: false });
};
const rail = (k, w, y, hex = '#2b2b2b', out = 0.9) => {
  k.box(0.1, w - 0.1, y, y + 0.1, -out, 0, hex, { col: false });
  for (const yy of [0.5, 0.85, 1.2])
    k.box(0.1, w - 0.1, y + yy, y + yy + 0.04, -out, -out + 0.04, hex, { col: false });
  for (const x of [0.1, w - 0.14])
    k.box(x, x + 0.04, y, y + 1.2, -out, -out + 0.04, hex, { col: false });
};
// 樓板線的橫帶
const bands = (k, c, hex, th = 0.22, out = 0.05) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0, c.w, y - th / 2, y + th / 2, -out, 0, hex, { col: false });
  }
};
// 水泥框凸窗（from 樓起每層 n 個）
const bays = (k, c, hex, from = 3, n = Math.max(1, Math.round(c.w / 3.4))) => {
  for (let f = from - 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    for (let j = 0; j < n; j++) {
      const cx = (c.w * (j + 0.5)) / n,
        bw = Math.min(2.4, c.w / n - 0.7);
      k.box(cx - bw / 2, cx + bw / 2, y + 0.55, y + 2.55, -0.55, 0, `wall${hex}`, { col: false });
      k.box(cx - bw / 2 - 0.05, cx + bw / 2 + 0.05, y + 2.55, y + 2.63, -0.6, 0, '#b9b6ae', {
        col: false,
      });
      k.plane(c.ROWT.alWin(), bw - 0.3, 1.35, cx, y + 1.65, -0.57, c.FRONT);
    }
  }
};
// 臨街矮屋後面退縮的主屋：從 z0 到 d，nf 層（含一樓），正面開窗
const backHouse = (k, c, z0, nf, hex, o = {}) => {
  const x0 = o.x0 ?? 0,
    x1 = o.x1 ?? c.w,
    top = 3.3 + (nf - 1) * 3.0,
    wl = c.wallMat(hex);
  k.box(x0, x1, c.top - 0.2, top, z0, c.d, wl, { tile: [0.6, 0.6] });
  k.box(x0 - 0.02, x1 + 0.02, top, top + 0.12, z0 - 0.04, c.d, o.cap || '#9a9892', { col: false });
  const n = Math.max(1, Math.round((x1 - x0) / 3.6));
  for (let f = 1; f < nf; f++) {
    const y = 3.3 + (f - 1) * 3.0;
    for (let j = 0; j < n; j++) {
      const cx = x0 + ((x1 - x0) * (j + 0.5)) / n;
      if (o.bay && o.bay(f, j)) {
        k.box(cx - 1.0, cx + 1.0, y + 0.6, y + 2.4, z0 - 0.5, z0, '#bdb8ae', { col: false });
        k.plane(c.ROWT.alWin(), 1.6, 1.3, cx, y + 1.55, z0 - 0.52, c.FRONT);
      } else
        k.plane(o.arch ? c.YHT.win() : c.ROWT.alWin(), 1.6, 1.3, cx, y + 1.6, z0 - 0.03, c.FRONT);
    }
    for (const [x, rot] of [
      [x0 - 0.03, -H],
      [x1 + 0.03, H],
    ])
      k.plane(c.YHT.win(), 1.2, 1.1, x, y + 1.5, (z0 + c.d) / 2, rot);
    for (let j = 0; j < n; j++)
      k.plane(c.YHT.win(), 1.5, 1.1, x0 + ((x1 - x0) * (j + 0.5)) / n, y + 1.5, c.d + 0.03, 0);
  }
  if (o.redRoof) {
    k.box(x0 - 0.5, x1 + 0.5, top + 0.12, top + 0.3, z0 - 0.6, c.d + 0.3, '#a8452f', {
      col: false,
    });
    k.box(x0 + 0.6, x1 - 0.6, top + 0.3, top + 0.75, z0 + 0.6, c.d - 0.8, '#b85a3c', {
      col: false,
    });
  }
  return top;
};
// 樹：樹幹加三團樹冠
const tree = (k, c, x, z, h, s) => {
  k.cyl(x, z, 0.24, 0, h, '#6a4a30', { seg: 6, col: true });
  for (const [dx, dy, dz, q, hex] of [
    [0, h + 0.8, 0, 1, '#3f7a3a'],
    [-1.3, h - 0.6, 0.5, 0.8, '#4b8a3e'],
    [1.4, h - 0.2, -0.3, 0.85, '#3a6f36'],
  ]) {
    const g = new c.THREE.SphereGeometry(s * q, 7, 5);
    g.translate(x + dx, dy, z + dz);
    k._part(c.VC, c.paintGeo(g, hex));
  }
};
// 2 樓上面退縮的 3 樓加蓋（白牆橫拉窗＋灰鐵皮斜頂）：品冠～吳家紅茶冰那棟
const setback3 = (k, c) => {
  k.box(0, c.w, c.top + 0.12, c.top + 2.7, 2.0, c.d, 'wall#eeeeea', { col: false });
  k.plane(c.ROWT.alWin(), c.w - 1.0, 1.2, c.w / 2, c.top + 1.5, 1.97, c.FRONT);
  slab(k, c, -0.05, c.w + 0.05, 1.5, c.top + 2.75, c.d + 0.2, c.top + 3.5, '#8f9290', 0.08);
  k.box(0.5, c.w - 0.5, c.gf + 0.75, c.gf + 2.25, -0.05, 0, '#eef0ee', { col: false }); // 2 樓窗子整片貼白色遮光板
  for (let x = 0.5; x <= c.w - 0.49; x += (c.w - 1.0) / Math.max(1, Math.round((c.w - 1) / 1.8)))
    k.box(x - 0.04, x + 0.04, c.gf + 0.75, c.gf + 2.25, -0.07, 0, '#7f8a8c', { col: false });
};
// 7 樓凸窗公寓：2 樓花台、3 樓以上凸窗
const aptR8 = (k, c) => {
  k.box(0.2, c.w - 0.2, c.gf + 0.1, c.gf + 0.75, -0.6, 0, 'wall#cfd0cc', { col: false });
  k.box(0.3, c.w - 0.3, c.gf + 0.75, c.gf + 0.95, -0.5, -0.1, '#4f8a48', { col: false });
  bays(k, c, '#cfd0cc', 3);
};
// 白磁磚公寓陽台橫帶上下緣的藍色磁磚收邊（甘泉魚麵那棟）
const blueTrim = (k, c) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    for (const yy of [0, 0.82])
      k.box(0.3, c.w - 0.3, y + yy, y + yy + 0.08, -0.82, -0.7, '#3f5f9e', { col: false });
  }
};

const L1 = { nf: 2, wall: '#a8c6c8', awn: '#8b8a86', bal: 'plain', d: 10, roof: 'x' };
const R3 = { nf: 5, wall: '#dedcd6', bal: 'grille', d: 14, roof: 'shack' };
const R4 = { nf: 5, wall: '#e0ded8', bal: 'open', d: 14 };
const R6 = { nf: 3, wall: '#d8d6d0', bal: 'plain', d: 12, awn: '#b0aea8', roof: 'x' };
const R8 = { nf: 7, wall: '#cfd0cc', bal: 'grille', d: 16, noband: true };
const LB = { wall: '#7a5a48', bal: 'grille', d: 13, set: 7.0 };
// 趙喜妹那棟：2 樓綠白鐵籠（種盆栽）、4 樓是紅柱子的鐵皮露台加蓋
const r6top = (k, c) => {
  cage(k, c.w, c.gf, '#b8c8b0');
  k.box(0.5, c.w - 0.5, c.gf + 0.15, c.gf + 0.6, -0.6, -0.15, '#4f8a48', { col: false });
  for (const x of [0.15, c.w - 0.3])
    k.box(x, x + 0.15, c.top + 0.12, c.top + 2.5, 0.1, 0.25, '#b03a30', { col: false });
  k.box(0, c.w, c.top + 0.12, c.top + 2.5, 3.0, c.d, 'wall#d8d6d0', { col: false });
  slab(k, c, -0.1, c.w + 0.1, -0.3, c.top + 2.5, c.d, c.top + 2.9, '#8f9290', 0.08);
  k.box(0, c.w, c.top + 0.12, c.top + 1.0, 0, 0.1, 'wall#d8d6d0', { col: false });
};

export default {
  ownSign: [
    '吳家紅茶冰',
    '佐奇屋',
    '玩具e哥',
    '甘泉魚麵',
    '中原麵疙瘩',
    '趙喜妹',
    '六品閣 麵食館',
    '八哥重慶酸辣粉',
  ],
  drop: ['f1593'],
  fences: [],
  lots: [
    // ================= 左側（-1，東北側）=================
    // 3 樓藍綠馬賽克磚樓：品冠平價火鍋、岑林綠豆沙、買5送1 看板＋吳家紅茶冰（3 樓退縮，灰鐵皮斜頂）
    [
      'S',
      330,
      334.7,
      -1,
      {
        ...L1,
        ground: 'shutter',
        sign: ['品冠 平價火鍋', '#f2d21f', '#cf2019'],
        extra: (k, c) => {
          setback3(k, c);
          k.box(c.w - 1.0, c.w - 0.2, 0.2, c.gf - 1.1, -0.08, 0, '#b8242b', { col: false });
        },
      },
    ],
    [
      'S',
      334.7,
      338.3,
      -1,
      {
        ...L1,
        ground: 'shop',
        door: 0,
        sign: ['岑林 綠豆沙', '#ffffff', '#6f9a3c'],
        extra: (k, c) => {
          setback3(k, c);
          hang(
            k,
            c,
            disc(c, '岑林', '#ffffff', '#e0553a', '#6f9a3c'),
            0.75,
            0.75,
            0.04,
            c.gf + 0.2,
            0.8,
            { transparent: true }
          ); // 八角形燈箱側招（掛在橫招那一排）
        },
      },
    ],
    [
      'S',
      338.3,
      344.2,
      -1,
      {
        ...L1,
        ground: 'stall',
        door: 0,
        noband: true,
        extra: (k, c) => {
          setback3(k, c);
          // 兩塊並排橫招：左塊深藍底促銷看板（不是店名）、右塊淺藍底深藍字「吳家紅茶冰」
          k.box(0.05, c.w - 0.05, c.gf - 0.85, c.gf - 0.03, -0.28, 0, '#dfeaf6', { col: false });
          flat(
            k,
            c,
            c.paint('吳家紅茶冰', '#dfeaf6', '#1f3a7a', '0977-026777', 3.1, 0.8),
            3.1,
            0.8,
            1.65,
            c.gf - 0.44,
            -0.29,
            0.35
          );
          flat(
            k,
            c,
            c.paint('來店購買・買5送1', '#2f4f8c', '#ffffff', null, 2.6, 0.8),
            2.6,
            0.8,
            4.55,
            c.gf - 0.44,
            -0.29,
            0.35
          );
          k.plane(c.shutterTex('#9a9a98'), 2.5, 1.3, 4.5, c.gf - 1.65, -0.62, c.FRONT); // 左半鐵捲門半開的備料區
          hang(
            k,
            c,
            disc(c, '吳家', '#2f6fc0', '#ffffff', '#ffffff', '紅茶冰'),
            0.9,
            0.9,
            0.12,
            c.gf - 0.3,
            0.85,
            { transparent: true }
          ); // 圓形藍色側招（58巷口，掛在橫招那一排）
          k.box(0.2, 0.9, 0, 2.2, -0.07, 0, '#e8a0b0', { col: false }); // 最右邊的粉紅色門
        },
      },
    ],
    // （344.2～350.5 實踐路58巷）
    // 佐奇屋（襪子拖鞋攤）：臨街 1 樓開放攤位（兩層灰褐帆布棚），後面退縮 4 樓米灰磁磚主屋；58 巷口立一塊白底深藍字直立燈箱
    [
      'S',
      350.5,
      362,
      -1,
      {
        nf: 1,
        gf: 3.2,
        d: 12,
        wall: '#cfc6b6',
        ground: 'open',
        door: 0,
        noband: true,
        roofCol: '#7d7873',
        extra: (k, c) => {
          backHouse(k, c, 4.0, 4, '#cfc6b6', { bay: (f, j) => f === 2 && j === 2 });
          slab(k, c, -0.1, c.w + 0.1, -1.3, 3.0, 3.4, 5.3, '#807b75'); // 上層很斜的大片帆布（從 2 樓露台下緣斜到街邊）
          slab(k, c, -0.1, c.w + 0.1, -2.0, 2.25, 0, 2.95, '#77726d'); // 下層帆布
          k.box(0.2, c.w - 0.2, 3.3, 4.3, 3.8, 4.0, c.wallMat('#cfc6b6'), { col: false }); // 2 樓露台女兒牆
          for (let x = 1; x < c.w - 1; x += 2.6)
            k.box(x, x + 1.2, 5.3, 5.9, 3.4, 3.9, '#4f8a48', { col: false }); // 露台盆栽
          const cols = [
            '#c8343a',
            '#2f6db3',
            '#e8e4da',
            '#3a3a40',
            '#d8b02a',
            '#8a5a9a',
            '#3f7a4c',
          ];
          for (let j = 0, x = 0.5; x < c.w - 0.9; x += 0.55, j++)
            for (let rr = 0; rr < 3; rr++)
              k.box(
                x,
                x + 0.4,
                0.5 + rr * 0.6,
                0.95 + rr * 0.6,
                -0.16,
                -0.06,
                cols[(j * 3 + rr * 2) % 7],
                { col: false }
              ); // 掛滿商品的鐵網架
          k.box(c.w - 0.3, c.w - 0.18, 0, 6.0, -0.36, -0.24, '#8d9196', { col: false }); // 58 巷口的招牌桿
          hang(
            k,
            c,
            c.ROWT.vert('sj3佐奇屋', '#ffffff', '#2b3a7a', '佐奇屋'),
            1.0,
            2.7,
            c.w - 0.24,
            4.55,
            0.85
          ); // 白底深藍字直立燈箱「佐奇屋」
        },
      },
    ],
    // 3 樓灰白方塊磁磚樓：a. flower（鐵捲門、米色圓弧棚、圓形側招）、璐恩店鋪（墨綠木框玻璃店面、粉紅大橫招）
    [
      'S',
      362,
      369.2,
      -1,
      {
        nf: 3,
        wall: '#e2e2dc',
        ground: 'shutter',
        bal: 'plain',
        d: 11,
        noband: true,
        awn: '#d9c7b0',
        roof: 'x',
        extra: (k, c) => {
          hang(
            k,
            c,
            disc(c, 'a. flower', '#ffffff', '#ffffff', '#222222'),
            1.1,
            1.1,
            c.w - 1.7,
            c.gf + 0.7,
            0.75,
            { transparent: true }
          );
          c.ac(k, c.w - 0.95, c.gf - 0.4);
          c.ac(k, c.w - 0.95, c.gf + 0.5); // 窄縫牆上的兩台冷氣室外機
          k.box(c.w - 0.95, c.w - 0.15, 0, 1.85, -0.75, -0.05, '#e8a020', { col: false });
          k.box(c.w - 0.88, c.w - 0.22, 0.7, 1.7, -0.77, -0.75, '#f6efdc', { col: false }); // 窄縫裡的黃橘色販賣機
          k.box(2.6, 3.3, 0.6, 2.2, -0.08, 0, '#e6d9bf', { col: false }); // 米色直式海報板
        },
      },
    ],
    [
      'S',
      369.2,
      375.6,
      -1,
      {
        nf: 3,
        wall: '#e2e2dc',
        low: '#4d7a66',
        ground: 'shop',
        bal: 'plain',
        d: 11,
        awn: '#3f6b58',
        roof: 'x',
        door: 0,
        noband: true,
        extra: (k, c) => {
          const sw = c.w - 0.3;
          k.box(0.1, c.w - 0.1, c.gf - 0.95, c.gf + 0.2, -0.3, 0, '#e85fa0', { col: false });
          flat(
            k,
            c,
            c.paint('Juhen 璐恩店鋪', '#e85fa0', '#ffffff', '女裝 童裝 飾品 包包 配件', sw, 1.05),
            sw,
            1.05,
            c.w / 2,
            c.gf - 0.38,
            -0.31,
            0.35
          );
          k.box(-2.9, 0, 0, 1.5, 0.3, 0.5, 'wall#d8d6cf'); // 52巷口住家的矮磁磚圍牆（375.6～378.5）
        },
      },
    ],
    // （378.5～382 實踐路52巷）
    // 有圍牆的獨棟住家（382～399.5）：臨街白色直條磁磚圍牆、牆內大樹，退縮的 4 樓白磁磚紅瓦屋
    [
      'S',
      384.5,
      397,
      -1,
      {
        nf: 4,
        wall: '#e4e2dc',
        ground: 'gate',
        bal: 'arch',
        d: 9,
        set: 11.5,
        noband: true,
        roof: 'x',
        bikes: 1,
        extra: (k, c) => {
          k.box(-2.5, c.w + 2.5, 0, 2.0, -5.5, -5.3, 'wall#d8d6cf');
          k.box(-2.55, c.w + 2.55, 2.0, 2.08, -5.55, -5.25, '#c9c5ba', { col: false });
          k.box(-2.5, -2.3, 0, 2.0, -5.3, 0, 'wall#d8d6cf');
          k.box(c.w + 2.3, c.w + 2.5, 0, 2.0, -5.3, 0, 'wall#d8d6cf');
          k.box(-2.3, 0.2, 2.1, 2.3, -5.9, -4.6, '#a8452f', { col: false });
          k.box(-1.9, -0.4, 0.1, 2.0, -5.52, -5.5, '#1c1c1e', { col: false }); // 側門的紅瓦小屋頂與黑鐵柵門
          k.box(-2.3, 0.4, 0, 5.6, -5.2, -1.2, c.wallMat('#e4e2dc'));
          k.plane(c.YHT.win(), 1.5, 1.1, -0.95, 4.0, -5.23, c.FRONT); // 側門旁的 2 樓紅瓦小附屬屋
          slab(k, c, -2.6, 0.7, -5.6, 5.5, -3.2, 6.3, '#a8452f', 0.1);
          slab(k, c, -2.6, 0.7, -3.2, 6.3, -0.8, 5.5, '#a8452f', 0.1);
          slab(k, c, -2.3, 0.4, -6.1, 2.5, -5.2, 3.0, '#b85a3c', 0.08);
          k.box(1.2, 2.1, 0, 1.5, -6.3, -5.6, '#3f7ab8', { col: false }); // 彩繪成藍色的變電箱
          k.box(-0.6, c.w + 0.6, c.top + 0.12, c.top + 0.3, -0.7, c.d + 0.3, '#a8452f', {
            col: false,
          });
          k.box(0.8, c.w - 0.8, c.top + 0.3, c.top + 0.8, 0.8, c.d - 0.8, '#b85a3c', {
            col: false,
          }); // 紅瓦屋簷
          tree(k, c, 2.5, -3.2, 7.5, 2.2);
          tree(k, c, 6.5, -2.8, 8.5, 2.5);
          tree(k, c, 10.5, -3.4, 7.0, 2.1);
          tree(k, c, 13.2, -3.0, 6.5, 1.9);
        },
      },
    ],
    // 永祿小吃：深褐木板牆的鐵皮矮屋（凸出，set 5.2），後面是同一戶的 4 樓白磁磚紅瓦屋；屋簷舊看板看不清楚不放字
    [
      'S',
      399.5,
      406.5,
      -1,
      {
        nf: 1,
        gf: 3.0,
        d: 14.5,
        set: 5.2,
        wall: '#8a7256',
        ground: 'open',
        door: 0,
        noband: true,
        roofCol: '#8f9290',
        bikes: 1,
        extra: (k, c) => {
          backHouse(k, c, 6.5, 4, '#efede8', {
            redRoof: true,
            arch: true,
            bay: (f, j) => f === 2 && j !== 1,
          });
          adiDaren2Face(k, c); // 後棟面大仁二街那一面：阿迪早點、1 號大門（src/world/buildings/d2/corners.js）
          slab(k, c, -0.2, c.w + 0.2, -1.3, 2.55, 0.2, 3.0, '#8f9290'); // 鏽鐵皮浪板屋簷
          k.box(0.3, c.w - 0.3, 3.0, 3.55, -0.25, -0.15, '#d9dcd8', { col: false }); // 屋簷上褪色的舊看板
          k.box(0.25, 4.3, 0, 2.5, -0.1, 0, '#8a7256', { col: false }); // 右半木板牆
          flat(
            k,
            c,
            c.paint('永祿', '#f4f2ea', '#222222', null, 2.3, 1.3),
            2.3,
            1.3,
            1.7,
            1.6,
            -0.12,
            0.15
          ); // 白底黑字大布條
          flat(
            k,
            c,
            c.paint('永祿小吃', '#f4f2ea', '#c8242b', null, 1.3, 1.0),
            1.3,
            1.0,
            3.6,
            1.7,
            -0.12,
            0.15
          ); // 白底紅字小招牌
          k.box(4.9, 6.8, 0, 0.95, -1.3, -0.4, '#b9bcc0', { col: false });
          k.box(4.9, 6.8, 0.95, 1.9, -1.3, -0.4, '#cfe0e0', { col: false });
          k.box(4.85, 6.85, 1.9, 2.0, -1.35, -0.35, '#8d9196', { col: false }); // 不鏽鋼攤車
          k.box(0.4, 2.2, 0.75, 0.8, -1.1, -0.4, '#8d9196', { col: false }); // 擺鍋盆的鐵桌
        },
      },
    ],
    // （406.5～416.5 大仁二街）
    // 7-ELEVEN：4 樓咖啡色磁磚轉角樓，招牌帶包過轉角
    [
      'S',
      417.2,
      426.2,
      -1,
      {
        nf: 4,
        wall: '#8a6a55',
        ground: 'shop',
        bal: 'plain',
        d: 14,
        set: 7.0,
        door: 0,
        noband: true,
        extra: (k, c) => {
          bands(k, c, '#d9d2c4');
          k.box(0.05, c.w, c.gf - 0.95, c.gf - 0.03, -0.28, 0, '#ffffff', { col: false });
          flat(k, c, sevenBand(c, c.w), c.w - 0.1, 0.9, c.w / 2, c.gf - 0.49, -0.29, 0.35);
          sevenDaren2Face(k, c); // 面大仁二街那一面（src/world/buildings/d2/corners.js）
          hang(k, c, sevenLogo(c), 1.5, 1.5, c.w - 0.1, c.gf + c.fh + 1.6, 1.0); // 轉角 3 樓的直立招牌
          k.box(1.0, c.w - 1.0, c.top + 0.12, c.top + 2.2, 3, 11, '#6f7478', { col: false }); // 屋頂鐵架
        },
      },
    ],
    // 歐亞諾烘焙坊：4 樓灰色樓，2 樓整面大帆布，3 樓黑鐵欄杆陽台
    [
      'S',
      426.2,
      431,
      -1,
      {
        nf: 4,
        wall: '#9c9a96',
        ground: 'shop',
        bal: 'plain',
        d: 13,
        set: 7.0,
        awn: '#8d8a86',
        noband: true,
        roof: 'x',
        extra: (k, c) => {
          const tex = c.sg('sj3Bakery', 576, 416, (g) => {
            g.fillStyle = '#efe6d3';
            g.fillRect(0, 0, 576, 416);
            g.fillStyle = '#c99a5a';
            for (const [x, y, r] of [
              [80, 330, 60],
              [200, 350, 52],
              [330, 335, 58],
              [470, 345, 62],
              [520, 90, 44],
              [60, 96, 40],
            ]) {
              g.beginPath();
              g.ellipse(x, y, r, r * 0.6, 0, 0, 7);
              g.fill();
            }
            g.fillStyle = '#6a4a3c';
            g.beginPath();
            g.ellipse(288, 200, 240, 78, 0, 0, 7);
            g.fill();
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillStyle = '#ffffff';
            g.font = c.font(64);
            g.fillText('歐亞諾烘焙坊', 288, 190);
            g.font = c.font(22, 700);
            g.fillText('ouyannuo bakery', 288, 244);
            g.fillStyle = '#1c1c1e';
            g.font = c.font(40);
            g.fillText('造型藝術蛋糕', 288, 60);
            g.font = c.font(30, 700);
            g.fillText('訂購專線：(03) 466-0991', 288, 382);
          });
          k.box(0.12, c.w - 0.12, c.gf - 0.95, c.gf + 2.85, -0.5, 0, '#efe6d3', { col: false });
          flat(k, c, tex, c.w - 0.3, 3.7, c.w / 2, c.gf + 0.93, -0.51, 0.2);
          rail(k, c.w, c.gf + c.fh);
        },
      },
    ],
    // 王家永和豆漿：4 樓咖啡色磁磚，兩間鐵捲門，紅白條紋舊雨棚，凸出的雙面側招
    [
      'S',
      431,
      436.6,
      -1,
      {
        ...LB,
        nf: 4,
        wall: '#7f5f4c',
        ground: 'shutter',
        noband: true,
        awn: ['#d8686c', '#f2ece6'],
        extra: (k, c) => {
          bigSign(k, c, '王家 永和豆漿', '#ffffff', '#c8242b', '早點 宵夜', 1.2);
          hang(
            k,
            c,
            c.paint('王家\n永和豆漿', '#ffffff', '#c8242b', null, 2.0, 1.6),
            2.0,
            1.6,
            c.w - 0.2,
            c.gf + c.fh + 1.0,
            1.2
          );
          k.box(c.w - 1.5, c.w - 1.2, 0.3, 2.3, -0.06, 0, '#c8242b', { col: false }); // 門邊紅底直條「早點宵夜」（字太小不寫）
        },
      },
    ],
    // 六品閣（紅底白框黑字）、蕭大立筒仔米糕（暗紅底金字）、八哥重慶酸辣粉（白底深藍字，灰細磚窄樓；跨過 s 450，這裡蓋到 450）
    [
      'S',
      436.6,
      441,
      -1,
      {
        ...LB,
        nf: 5,
        ground: 'shop',
        noband: true,
        awn: ['#d8262c', '#f6f2ee'],
        extra: (k, c) => {
          bigSign(k, c, '六品閣', '#d8262c', '#141414', '麵食館', 1.3, 'frame');
          hang(
            k,
            c,
            c.paint('六品閣', '#d8262c', '#141414', null, 1.8, 1.0, 128, 'frame'),
            1.8,
            1.0,
            0.2,
            c.gf + 1.6,
            1.1
          );
        },
      },
    ],
    [
      'S',
      441,
      446.3,
      -1,
      {
        ...LB,
        nf: 5,
        ground: 'open',
        sign: ['筒仔米糕 蕭大立 排骨酥麵', '#7a1f24', '#f0d27a', '台中・清水　03-4656789'],
        awn: ['#d8262c', '#f6f2ee'],
      },
    ],
    [
      'S',
      446.3,
      450,
      -1,
      {
        ...LB,
        nf: 5,
        wall: '#8f8f92',
        ground: 'open',
        bal: 'plain',
        door: 0,
        sign: ['八哥', '#ffffff', '#2b2f55', '重慶酸辣粉 BAGE Sour & Spicy Noodle'],
        awn: '#7d7873',
        extra: (k, c) => {
          for (let f = 1; f < c.nf; f++) rail(k, c.w, c.gf + (f - 1) * c.fh, '#2b2b2b', 0.6);
        },
      },
    ],

    // ================= 右側（+1，西南側）=================
    // 5 樓白磁磚公寓的轉角：熊熊家族（跨 s 330，這裡只有後半，不放字）、玩具e哥（黃招牌帶包到三和一街那面，2 樓轉角是「小野塔羅」大看板）
    [
      'S',
      330,
      332.3,
      1,
      {
        nf: 5,
        wall: '#e6e4de',
        ground: 'open',
        bal: 'open',
        d: 14,
        door: 0,
        awn: ['#e8c84a', '#f6f2e6'],
      },
    ],
    [
      'S',
      332.3,
      335,
      1,
      {
        nf: 5,
        wall: '#e6e4de',
        ground: 'shop',
        bal: 'open',
        d: 14,
        door: 0,
        sign: ['TOYeGO・玩具e哥', '#f1e04a', '#141414', '中壢中原店'],
        awn: '#e6dcc4',
        extra: (k, c) => {
          k.box(c.w, c.w + 0.28, c.gf - 0.85, c.gf - 0.03, 0, 8.4, '#f1e04a', { col: false });
          k.plane(
            c.paint('TOYeGO・玩具e哥', '#f1e04a', '#141414', null, 8.2, 0.8),
            8.2,
            0.8,
            c.w + 0.29,
            c.gf - 0.44,
            4.2,
            H,
            { emissive: 0.35 }
          );
          k.plane(c.YHT.win(), 7.6, c.gf - 1.2, c.w + 0.03, (c.gf - 1.0) / 2, 4.2, H, {
            emissive: 0.3,
          });
          const bw = 4.4,
            a = 0.2; // 轉角斜掛的大看板
          k.plane(
            c.paint('小野塔羅', '#3a3f9a', '#d8e84a', '各式西洋神祕學占卜　請上二樓', bw, 2.0),
            bw,
            2.0,
            c.w + a - 0.6,
            c.gf + 1.25,
            -a - 0.6,
            Math.PI * 0.75,
            { emissive: 0.25, double: true }
          );
          k.plane(
            c.paint('本區招租', '#ffffff', '#2f4f9a', null, 2.4, 0.9),
            2.4,
            0.9,
            c.w + 0.05,
            c.gf + c.fh + 1.6,
            1.6,
            H,
            { emissive: 0.1 }
          );
        },
      },
    ],
    // （336.5～346.5 三和一街）
    // 甘泉魚麵：5 樓白色小口磚圓弧轉角樓，陽台橫帶有藍色磁磚收邊，一樓整面深褐紅帆布棚，2～4 樓紅底白字直立側招
    [
      'S',
      346.5,
      360.8,
      1,
      {
        nf: 5,
        wall: '#e3e1da',
        ground: 'shop',
        bal: 'open',
        d: 14,
        noband: true,
        roof: 'x',
        extra: (k, c) => {
          blueTrim(k, c);
          slab(k, c, -0.3, c.w - 1.9, -1.6, c.gf - 1.15, 0, c.gf - 0.25, '#6e4a45'); // 深褐紅色斜帆布棚，包到轉角
          k.box(-1.5, 0, c.gf - 1.1, c.gf - 1.0, -1.6, 9, '#6e4a45', { col: false });
          k.box(c.w - 1.85, c.w - 0.15, c.gf - 1.0, c.gf - 0.8, -0.9, 0, '#3f7a4c', { col: false }); // 樓梯口的小綠雨棚
          k.box(0.3, c.w - 1.2, 0, 0.6, -0.09, 0, '#e8e4d8', { col: false }); // 玻璃下緣米白矮牆
          hang(
            k,
            c,
            c.ROWT.vert('sj3甘泉魚麵', '#c8242b', '#ffffff', '甘泉魚麵'),
            1.1,
            5.0,
            9.0,
            c.gf + 3.4,
            0.95
          );
          k.box(4, 9, c.top + 0.12, c.top + 0.7, 4, 11, '#4f8a48', { col: false }); // 屋頂花園
        },
      },
    ],
    // BOBO CHICKEN／中原麵疙瘩／布條店（沒有店名）：5 樓偏灰白磁磚，2 樓整面白鐵窗，屋頂鐵皮加蓋
    [
      'S',
      360.8,
      365.8,
      1,
      {
        ...R3,
        ground: 'shutter',
        noband: true,
        sign2: ['BOBO CHICKEN', '#ffffff', '#c0392b'],
        banner: ['今晚吃炸 快樂升級', '#c8242b', '#ffffff'],
      },
    ],
    [
      'S',
      365.8,
      369.4,
      1,
      {
        ...R3,
        ground: 'open',
        noband: true,
        awn: '#e8e6e0',
        door: 0,
        extra: (k, c) => {
          k.box(0.1, c.w - 0.1, c.gf - 0.85, c.gf - 0.1, -0.1, 0, '#b89a6a', { col: false }); // 原本橫招位置的原木色空板
          flat(
            k,
            c,
            c.paint('中原麵疙瘩', '#f2d21f', '#cf2019', null, 1.8, 0.45),
            1.8,
            0.45,
            c.w / 2,
            c.gf - 1.45,
            -1.2,
            0.25
          ); // 門楣下掛的黃底紅字小招牌
          vsign(
            k,
            c,
            c.paint('麵疙瘩', '#d8343a', '#ffffff', '中原專賣店', 2.0, 0.95),
            2.0,
            0.95,
            1.35,
            c.gf + 0.95
          ); // 2 樓的紅底白字斜招
          vsign(
            k,
            c,
            c.paint('嵐香\n商行', '#f4f2ea', '#8a1f24', 'LAN SHIANG & Co., Ltd.', 1.3, 1.6),
            1.3,
            1.6,
            1.35,
            c.gf + 2.6
          ); // 再上面的白色燈箱斜招
        },
      },
    ],
    [
      'S',
      369.4,
      373.4,
      1,
      {
        ...R3,
        ground: 'shutter',
        sh: '#2f3f6a',
        awn: '#9a9892',
        extra: (k, c) => {
          k.box(0.6, c.w - 1.4, c.gf - 1.75, c.gf - 1.3, -0.26, -0.24, '#f4f2ea', { col: false });
        },
      },
    ], // 白底手寫促銷布條，沒有店名
    // RE:ALIVE 科技重生維修室、蘇記一沏食小所：5 樓白磁磚，磁磚矮牆陽台
    [
      'S',
      373.4,
      377,
      1,
      {
        ...R4,
        ground: 'shop',
        door: 0,
        sign: ['RE:ALIVE', '#1f2226', '#ffffff', '科技重生維修室'],
        awn: '#f2f0ea',
        extra: (k, c) => {
          hang(
            k,
            c,
            c.paint('RE:ALIVE', '#1f2226', '#ffffff', '手機快速維修站', 1.5, 1.8),
            1.5,
            1.8,
            c.w - 0.25,
            c.gf + 1.8,
            1.0
          ); // 2～3 樓的黑底凸出側招
        },
      },
    ],
    [
      'S',
      377,
      381.6,
      1,
      {
        ...R4,
        ground: 'shop',
        sign: ['蘇記 一沏食小所', '#ffffff', '#141414', 'Brew & Bite Studio'],
        awn: ['#2f6db3', '#f6f6f2'],
        banner: ['蘇記 試營運限時活動!!', '#c8242b', '#ffffff'],
      },
    ],
    // hellobobo：6 樓深藍灰磁磚窄樓，每層凸盒陽台，一樓上方整片深灰帆布招牌
    [
      'S',
      381.6,
      386.5,
      1,
      {
        nf: 6,
        wall: '#3a4460',
        ground: 'shutter',
        sh: '#5a6478',
        bal: 'open',
        d: 14,
        door: 0,
        sign: ['hellobobo', '#3a3a3e', '#ffffff'],
        banner: ['平價童裝 團購取貨店', '#ffffff', '#c8242b'],
        extra: (k, c) => {
          hang(
            k,
            c,
            c.paint('hellobobo', '#ffffff', '#3a3a3e', null, 1.4, 1.4),
            1.4,
            1.4,
            c.w - 0.3,
            c.gf + 1.2,
            1.0
          );
        },
      },
    ],
    // Luna Nails、趙喜妹：4 樓白磁磚舊屋，灰色水泥平雨庇，2 樓綠白鐵籠，4 樓鐵皮露台加蓋
    [
      'S',
      386.5,
      389.2,
      1,
      { ...R6, ground: 'shop', door: 0, sign: ['Luna Nails', '#ffffff', '#4a4a4a'], extra: r6top },
    ],
    [
      'S',
      389.2,
      392.9,
      1,
      {
        ...R6,
        ground: 'open',
        door: 0,
        noband: true,
        extra: (k, c) => {
          r6top(k, c);
          k.plane(
            disc(c, '趙喜妹', '#ffffff', '#e8794a', '#4a2a1a', '叫你來吃麵'),
            1.7,
            1.7,
            c.w - 1.0,
            c.gf - 0.25,
            -0.9,
            c.FRONT,
            { transparent: true, emissive: 0.3 }
          ); // 貼在 1、2 樓之間的大圓形招牌
          k.box(c.w - 1.3, c.w - 0.5, 0, 1.8, -1.6, -1.5, '#f2ead8', { col: false }); // 門口的大菜單燈箱
        },
      },
    ],
    // 弘揚路口圓弧轉角樓：5 樓白色小口磚，一樓整圈淺綠鐵皮雨庇，關著的深色玻璃店；轉角下是墨綠帆布攤位（側招與攤位都看不到店名）
    [
      'S',
      392.9,
      403.6,
      1,
      {
        nf: 5,
        wall: '#e2e0da',
        ground: 'gate',
        bal: 'open',
        d: 14,
        door: 0,
        awn: '#9fb8a0',
        extra: (k, c) => {
          k.box(c.w, c.w + 1.25, c.gf - 1.05, c.gf - 0.97, -1.25, 10, '#9fb8a0', { col: false });
          k.box(0.17, 0.23, c.gf + 0.6, c.gf + 3.8, -1.0, -0.2, '#f4f2ea', { col: false });
          for (const yy of [0.6, 3.72])
            k.box(0.16, 0.24, c.gf + yy, c.gf + yy + 0.08, -1.0, -0.2, '#c8242b', { col: false }); // 右緣白底紅框直立側招（字看不清楚，不放字）
          k.box(c.w - 2.8, c.w - 0.2, 0, 2.1, -1.5, -0.2, '#2f4a3a'); // 轉角的墨綠帆布攤位（擋人）
          for (let j = 0; j < 8; j++)
            k.box(
              c.w - 3.0 + j * 0.4,
              c.w - 2.6 + j * 0.4,
              2.25,
              2.33,
              -2.2,
              -0.1,
              j % 2 ? '#f2f2ee' : '#3f8a5a',
              { col: false }
            ); // 綠白條紋棚
        },
      },
    ],
    // （404～421.5 弘揚路）
    // 7 樓灰白馬賽克磚凸窗公寓：轉角紅框店（店名看不清楚）、洪立自助洗衣、快速照相（樓梯口）、麵享享
    [
      'S',
      421.5,
      427.5,
      1,
      {
        ...R8,
        ground: 'shop',
        door: 0,
        extra: (k, c) => {
          aptR8(k, c);
          k.box(0.05, c.w - 0.05, c.gf - 0.85, c.gf - 0.35, -0.1, 0, '#c8343a', { col: false }); // 紅色門楣與漆紅的柱腳
          for (const x of [0, c.w / 2 - 0.2, c.w - 0.4])
            k.box(x, x + 0.4, 0, 1.0, -0.1, 0, '#c8343a', { col: false });
          k.box(-0.1, 0, c.gf - 0.85, c.gf - 0.35, 0, 8, '#c8343a', { col: false });
        },
      },
    ],
    [
      'S',
      427.5,
      431,
      1,
      {
        ...R8,
        ground: 'shutter',
        sh: '#6a7688',
        door: 0,
        extra: (k, c) => {
          aptR8(k, c);
          hang(
            k,
            c,
            c.paint('洪立\n自助洗衣', '#ffffff', '#d8452a', null, 1.8, 1.3),
            1.8,
            1.3,
            0.25,
            c.gf + 0.9,
            1.1
          ); // 2 樓花台前凸出的燈箱側招
        },
      },
    ],
    [
      'S',
      431,
      433,
      1,
      {
        ...R8,
        ground: 'gate',
        door: 0,
        extra: (k, c) => {
          aptR8(k, c);
          const tex = c.sg('sj3Kuaisu', 240, 208, (g) => {
            // 上半白底紅字「快速」、下半綠底白字「照相」
            g.fillStyle = '#ffffff';
            g.fillRect(0, 0, 240, 208);
            g.fillStyle = '#2e8b57';
            g.fillRect(0, 104, 240, 104);
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.font = c.font(84);
            g.fillStyle = '#d8262c';
            g.fillText('快速', 120, 54);
            g.fillStyle = '#ffffff';
            g.fillText('照相', 120, 158);
          });
          hang(k, c, tex, 1.5, 1.3, c.w / 2, c.gf + 0.9, 0.95);
        },
      },
    ],
    [
      'S',
      433,
      442.5,
      1,
      {
        ...R8,
        ground: 'shop',
        door: 0,
        bikes: 5,
        extra: (k, c) => {
          aptR8(k, c);
          bigSign(k, c, '麵享享', '#d93a2e', '#ffffff', 'MIANXIANGXIANG　牛肉麵／豚骨拉麵', 1.3);
          hang(
            k,
            c,
            c.ROWT.vert('sj3麵享享', '#d93a2e', '#ffffff', '麵享享'),
            0.9,
            2.7,
            c.w - 0.2,
            c.gf + 1.9,
            0.8
          ); // 左端 2 樓的紅底白字直立側招
          k.box(c.w / 2 - 0.15, c.w / 2 + 0.15, 0, c.gf - 0.9, -0.12, 0, '#1c1c1e', { col: false }); // 中間掛菜單板的黑柱
        },
      },
    ],
    // （442.5～447 後排公寓的車道出入口；447 以後交給 S4）
  ],
};
