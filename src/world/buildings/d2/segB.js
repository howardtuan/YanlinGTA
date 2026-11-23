// 大仁二街 B 段：東南側 s 48～78（大仁二街40巷口 → 大仁街口正對面），照 2025-05 Google 街景與國土測繪 2024 正射建模。
// 由東北往西南：38 號（丼心丼）→ 36 號（粉紅小方磚 4 樓＋綠色圓弧雨棚車庫＋一層樓高的側廊）→ 臨街小空地 → 22 號（深灰石材 2 樓，原 22 BurgeR 茶餐館）。
// 每一格都只用外殼當一樓（nf: 1），樓上、招牌、雨棚全部在 custom 裡照實景畫；區域座標 x=0 在西南端（s 大的那一端），從路上看過去左邊是 x 大的那一邊。
// 36 號一樓是往裡凹的車庫，所以外殼設在離路中心 7.4 m，車庫、磚牆、雨棚畫在外殼前面（z < 0，都在這一格的保留範圍內）。
// 22 號做到 s 80（超出 B 段範圍 2 m）：C 段的戶外樓梯從 s 80.2 開始貼著它的西南側牆，C 段沒有做這一棟。
// 22 號的平面是八角形：東北角（朝小空地）與西南角（朝大仁街口，掛白色大看板、下面是米白鐵捲門）都是 45° 切角，所以拆成 側翼／正面／西南切角 三格。
const NC = { col: false };
const TL = { col: false, tile: [0.6, 0.6] };
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const rnd = (seed) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

// ---- 幾何小工具 ----
const vc = (T, g, hex) => {
  // 自己做的幾何補上頂點色，才能放進 d2VC 材質
  const c = new T.THREE.Color(hex),
    n = g.attributes.position.count,
    a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new T.THREE.BufferAttribute(a, 3));
  return g;
};
const barrelX = (k, T, x0, x1, yc, zc, r, sy, hex) => {
  // 沿立面方向的半圓筒（綠色圓弧雨棚）
  const g = new T.THREE.CylinderGeometry(r, r, x1 - x0, 10, 1, false, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  g.scale(1, sy, 1);
  g.translate((x0 + x1) / 2, yc, zc);
  k._part('d2VC', vc(T, g, hex));
};
const barrelZ = (k, T, z0, z1, xc, yc, r, sy, hex) => {
  // 往屋內方向的半圓筒（側廊的頂）
  const g = new T.THREE.CylinderGeometry(r, r, z1 - z0, 10, 1, false, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  g.scale(1, sy, 1);
  g.translate(xc, yc, (z0 + z1) / 2);
  k._part('d2VC', vc(T, g, hex));
};
const tilt = (m, a) => {
  m.rotation.order = 'YXZ';
  m.rotation.x = a;
  return m;
}; // 斜雨棚：a < 0 是上緣往屋內倒

// ---- 貼圖 ----
const bowl = (g, cx, cy, r) => {
  // 招牌上的丼飯照片：黑碗、白飯、配料與蛋黃
  g.fillStyle = '#1a1614';
  g.beginPath();
  g.arc(cx, cy, r, 0, 7);
  g.fill();
  g.fillStyle = '#f1e7cf';
  g.beginPath();
  g.arc(cx, cy, r * 0.82, 0, 7);
  g.fill();
  g.fillStyle = '#b9772e';
  g.beginPath();
  g.ellipse(cx - r * 0.1, cy + r * 0.12, r * 0.6, r * 0.42, 0.3, 0, 7);
  g.fill();
  g.fillStyle = '#f0b429';
  g.beginPath();
  g.arc(cx + r * 0.22, cy - r * 0.2, r * 0.22, 0, 7);
  g.fill();
  g.fillStyle = '#6f9a3a';
  g.beginPath();
  g.arc(cx - r * 0.4, cy - r * 0.32, r * 0.12, 0, 7);
  g.fill();
};
const signMain = (T) =>
  T.sg('d2B_donSign', 1536, 288, (g, W, H) => {
    // 丼心丼橫招：左 2/3 黑底、右 1/3 紅底
    const bx = W * 0.665;
    g.fillStyle = '#141414';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#d8362c';
    g.fillRect(bx, 0, W - bx, H);
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 3; // 下緣一排日式波浪紋
    for (let x = 0; x < bx; x += 36)
      for (const r of [16, 9]) {
        g.beginPath();
        g.arc(x + 18, H + 2, r, Math.PI, 0);
        g.stroke();
      }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = font(H * 0.6);
    const cw = H * 0.6,
      x0 = W * 0.025;
    [
      ['丼', '#f4f1ea'],
      ['心', '#e23a2e'],
      ['丼', '#f4f1ea'],
    ].forEach(([t, c], i) => {
      g.fillStyle = c;
      g.fillText(t, x0 + cw * (i + 0.5), H * 0.45);
    });
    g.fillStyle = '#e23a2e';
    g.fillRect(W * 0.492, H * 0.13, W * 0.056, H * 0.17); // 小字後面那一筆紅色刷痕
    g.fillStyle = '#f4f1ea';
    g.font = font(H * 0.15, 700);
    g.fillText('動心做丼　讓你心動', W * 0.52, H * 0.22, W * 0.26);
    g.font = font(H * 0.22, 700);
    g.fillText('どんぶりもの', W * 0.52, H * 0.5, W * 0.26);
    g.fillStyle = '#f2d43a';
    g.font = font(H * 0.095, 700);
    g.fillText('點餐▸熱湯、冷飲、冰淇淋 免費享用', W * 0.52, H * 0.74, W * 0.27);
    const rx = bx + (W - bx) * 0.29,
      rw = (W - bx) * 0.53;
    g.fillStyle = '#f7dc3c';
    g.font = font(H * 0.2);
    g.fillText('丼飯/咖哩/特餐', rx, H * 0.2, rw);
    g.fillStyle = '#ffffff';
    g.font = font(H * 0.18, 700);
    g.fillText('【中原店】', rx, H * 0.47, rw);
    g.font = font(H * 0.27);
    g.fillText('03-4665899', rx, H * 0.77, rw);
    bowl(g, W - H * 0.42, H * 0.45, H * 0.36); // 右端的丼飯照片
  });
const signEnd = (T) =>
  T.sg('d2B_donEnd', 160, 304, (g, W, H) => {
    // 橫招西南端折回牆面的那一面：紅底、丼飯照片、黃字
    g.fillStyle = '#d8362c';
    g.fillRect(0, 0, W, H);
    bowl(g, W / 2, H * 0.22, W * 0.36);
    g.fillStyle = '#f7dc3c';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = font(H * 0.15);
    ['丼飯', '咖哩', '特餐'].forEach((t, i) =>
      g.fillText(t, W / 2, H * (0.5 + i * 0.165), W * 0.9)
    );
  });
const signCorner = (T) =>
  T.sg('d2B_donCorner', 384, 400, (g, W, H) => {
    // 38 號轉角的黑底燈箱
    g.fillStyle = '#141414';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#e23a2e';
    g.fillRect(W * 0.2, H * 0.045, W * 0.6, H * 0.07);
    g.fillStyle = '#f4f1ea';
    g.font = font(H * 0.055, 700);
    g.fillText('動心做丼　讓你心動', W / 2, H * 0.08);
    g.font = font(H * 0.25);
    const cw = W * 0.3;
    [
      ['丼', '#f4f1ea'],
      ['心', '#e23a2e'],
      ['丼', '#f4f1ea'],
    ].forEach(([t, c], i) => {
      g.fillStyle = c;
      g.fillText(t, W / 2 + (i - 1) * cw, H * 0.28);
    });
    g.fillStyle = '#f4f1ea';
    g.font = font(H * 0.07, 700);
    g.fillText('どんぶりもの', W / 2, H * 0.47);
    g.fillStyle = '#f2d43a';
    g.font = font(H * 0.105);
    g.fillText('丼飯/咖哩/特餐', W / 2, H * 0.6);
    g.fillStyle = '#f4f1ea';
    g.font = font(H * 0.08, 700);
    g.fillText('【中原店】', W / 2, H * 0.73);
    g.font = font(H * 0.125);
    g.fillText('03-4665899', W / 2, H * 0.875);
  });
const graffiti = (T) =>
  T.sg('d2B_graffiti', 512, 272, (g, W, H) => {
    // 2025-05 拉下來的鐵捲門，滿版氣泡字塗鴉（不寫字）
    g.fillStyle = '#5d6f9a';
    g.fillRect(0, 0, W, H);
    const r = rnd(38),
      cols = ['#3b6fd0', '#9a86d8', '#e89ab8', '#e8dfc4', '#8fb2e8', '#b9a8ea', '#8fae7a'];
    for (let i = 0; i < 26; i++) {
      const x = r() * W,
        y = H * 0.2 + r() * H * 0.8,
        rx = 26 + r() * 46,
        ry = 22 + r() * 36;
      g.fillStyle = cols[i % cols.length];
      g.strokeStyle = '#17171c';
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(x, y, rx, ry, r() * 3, 0, 7);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath();
      g.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.22, ry * 0.14, 0, 0, 7);
      g.fill();
    }
    g.fillStyle = '#e06a8a';
    g.fillRect(0, 0, W * 0.12, H * 0.5);
    for (let y = 0; y < H; y += 8) {
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(0, y, W, 2);
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.fillRect(0, y + 6, W, 2);
    }
  });
const door38 = (T) =>
  T.sg('d2B_door38', 128, 320, (g, W, H) => {
    // 不鏽鋼框＋綠色壓花玻璃門，上面紅白門牌 38
    g.fillStyle = '#b9bcc0';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#5f8f7c';
    g.fillRect(14, 30, W - 28, 120);
    g.fillRect(14, 170, W - 28, 136);
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (let y = 34; y < 300; y += 9) g.fillRect(14, y, W - 28, 2);
    g.fillStyle = '#b9bcc0';
    g.fillRect(0, 150, W, 20);
    g.fillStyle = '#ffffff';
    g.fillRect(22, 36, 44, 30);
    g.fillStyle = '#c8201c';
    g.fillRect(22, 36, 44, 9);
    g.font = font(20);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('38', 44, 57);
    g.fillStyle = '#8d9196';
    g.fillRect(100, 150, 8, 40);
  });
const baluster = (T) =>
  T.sg('d2B_balu', 512, 128, (g, W, H) => {
    // 白色圓弧鑄鐵花格欄杆
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#f1f0ec';
    g.fillRect(0, 0, W, 12);
    g.fillRect(0, H - 12, W, 12);
    g.strokeStyle = '#f1f0ec';
    g.lineWidth = 6;
    for (let x = 0; x < W; x += 32) {
      g.fillRect(x, 0, 5, H);
      g.beginPath();
      g.ellipse(x + 18, H / 2, 10, H / 2 - 16, 0, 0, 7);
      g.stroke();
    }
  });
const gable = (T) =>
  T.sg('d2B_gable', 256, 112, (g, W, H) => {
    // 3 樓上緣紅色筒瓦的小山牆
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#b5553c';
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(W / 2, 0);
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    g.fillStyle = '#e4dccb';
    g.beginPath();
    g.moveTo(40, H);
    g.lineTo(W / 2, 26);
    g.lineTo(W - 40, H);
    g.closePath();
    g.fill();
    g.strokeStyle = '#8f3f2c';
    g.lineWidth = 3;
    for (let i = 1; i < 8; i++) {
      g.beginPath();
      g.moveTo(W / 2 - i * 16, i * 14);
      g.lineTo(W / 2 - i * 16 - 12, i * 14 + 10);
      g.moveTo(W / 2 + i * 16, i * 14);
      g.lineTo(W / 2 + i * 16 + 12, i * 14 + 10);
      g.stroke();
    }
  });
const whiteBars = (T) =>
  T.sg('d2B_wbars', 128, 192, (g, W, H) => {
    // 白色直條鐵窗
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#f3f3ef';
    for (let x = 2; x < W; x += 14) g.fillRect(x, 0, 4, H);
    for (const y of [0, H * 0.33, H * 0.66, H - 6]) g.fillRect(0, y, W, 6);
  });
const fanWin = (T) =>
  T.sg('d2B_fanWin', 256, 208, (g, W, H) => {
    // 36 號 3 樓凸窗：上緣扇形放射狀白色鐵窗
    g.clearRect(0, 0, W, H);
    const ay = 84;
    const shape = () => {
      g.beginPath();
      g.moveTo(4, H - 4);
      g.lineTo(4, ay);
      g.ellipse(W / 2, ay, W / 2 - 4, ay - 6, 0, Math.PI, 0);
      g.lineTo(W - 4, H - 4);
      g.closePath();
    };
    g.fillStyle = '#5d6b76';
    shape();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.15)';
    g.fillRect(10, ay, 90, H - ay - 8);
    g.strokeStyle = '#f3f3ef';
    g.lineWidth = 6;
    shape();
    g.stroke();
    g.lineWidth = 4;
    for (let i = 1; i < 12; i++) {
      const a = Math.PI + (i * Math.PI) / 12;
      g.beginPath();
      g.moveTo(W / 2, ay);
      g.lineTo(W / 2 + Math.cos(a) * (W / 2 - 6), ay + Math.sin(a) * (ay - 8));
      g.stroke();
    }
    g.beginPath();
    g.moveTo(4, ay);
    g.lineTo(W - 4, ay);
    g.stroke();
    for (let x = 16; x < W - 6; x += 15) {
      g.beginPath();
      g.moveTo(x, ay);
      g.lineTo(x, H - 4);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(4, (ay + H) / 2);
    g.lineTo(W - 4, (ay + H) / 2);
    g.stroke();
  });
const tealGlass = (T) =>
  T.sg('d2B_teal', 256, 160, (g, W, H) => {
    // 22 號樓上的藍綠色玻璃／褪色貼圖
    g.fillStyle = '#d9dcd8';
    g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#a9cfc9');
    gr.addColorStop(1, '#7fb3b0');
    g.fillStyle = gr;
    g.fillRect(6, 6, W - 12, H - 12);
    const r = rnd(22);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = ['rgba(120,190,200,.55)', 'rgba(225,235,230,.6)', 'rgba(90,160,170,.45)'][
        i % 3
      ];
      g.fillRect(8 + r() * (W - 60), 8 + r() * (H - 50), 14 + r() * 40, 8 + r() * 30);
    }
    g.fillStyle = '#d9dcd8';
    g.fillRect(W / 2 - 2, 0, 4, H);
  });
const frenchDoor = (T) =>
  T.sg('d2B_french', 192, 240, (g, W, H) => {
    // 白框落地門窗
    g.fillStyle = '#f0efe9';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#56666f';
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 3; j++) g.fillRect(10 + i * 91, 10 + j * 76, 81, 68);
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.fillRect(10, 10, 40, H - 20);
  });
const darkShop = (T) =>
  T.sg('d2B_shop22', 512, 256, (g, W, H) => {
    // 歇業沒開燈的玻璃店面，裡面是螢光黃綠色的鐵椅
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#3c4a50');
    gr.addColorStop(1, '#232a2d');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(200,220,225,.16)';
    g.fillRect(0, 0, W, H * 0.3);
    for (let i = 0; i < 6; i++) {
      const x = 36 + i * 82 + (i % 2) * 12;
      g.fillStyle = '#93ad2f';
      g.fillRect(x, H * 0.58, 24, 26);
      g.fillRect(x - 2, H * 0.72, 28, 6);
      g.fillStyle = '#5f7020';
      g.fillRect(x, H * 0.75, 2, H * 0.17);
      g.fillRect(x + 22, H * 0.75, 2, H * 0.17);
    }
    g.fillStyle = '#4a4038';
    for (let i = 0; i < 3; i++) g.fillRect(70 + i * 160, H * 0.66, 60, 6);
    g.fillStyle = '#1b1c1e';
    for (const x of [0, W * 0.33, W * 0.66, W - 6]) g.fillRect(x, 0, 6, H);
    g.fillRect(0, 0, W, 6);
  });
const menuBoard = (T) =>
  T.sg('d2B_menu22', 192, 256, (g, W, H) => {
    // 橘紅色菜單看板：一格一格的漢堡照片（字太小不放）
    g.fillStyle = '#d2552c';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 4; j++) {
        const x = 14 + i * 58,
          y = 30 + j * 55;
        g.fillStyle = '#f0d9b0';
        g.fillRect(x, y, 48, 44);
        g.fillStyle = '#b9772e';
        g.beginPath();
        g.ellipse(x + 24, y + 18, 18, 9, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = '#5d3a22';
        g.fillRect(x + 7, y + 20, 34, 6);
        g.fillStyle = '#6f9a3a';
        g.fillRect(x + 6, y + 26, 36, 3);
        g.fillStyle = '#c98a3c';
        g.fillRect(x + 7, y + 29, 34, 7);
      }
  });
const chef = (g, cx, cy, s, a = 1) => {
  // 22 BurgeR 的卡通廚師線稿
  g.save();
  g.globalAlpha = a;
  g.strokeStyle = '#1c1c1c';
  g.fillStyle = '#ffffff';
  g.lineWidth = Math.max(2, s * 0.06);
  g.beginPath();
  g.arc(cx, cy, s * 0.5, 0, 7);
  g.fill();
  g.stroke();
  for (const dx of [-0.34, 0, 0.34]) {
    g.beginPath();
    g.arc(cx + dx * s, cy - s * 0.62, s * 0.26, 0, 7);
    g.fill();
    g.stroke();
  }
  g.fillRect(cx - s * 0.42, cy - s * 0.62, s * 0.84, s * 0.26);
  g.fillStyle = '#1c1c1c';
  for (const dx of [-0.18, 0.18]) {
    g.beginPath();
    g.arc(cx + dx * s, cy - s * 0.05, s * 0.05, 0, 7);
    g.fill();
  }
  g.fillStyle = '#f2a0b4';
  for (const dx of [-0.3, 0.3]) {
    g.beginPath();
    g.arc(cx + dx * s, cy + s * 0.12, s * 0.08, 0, 7);
    g.fill();
  }
  g.beginPath();
  g.arc(cx, cy + s * 0.1, s * 0.16, 0.2, Math.PI - 0.2);
  g.stroke();
  g.restore();
};
const logo22 = (g, cx, cy, s, col, a = 1) => {
  // 「22 BurgeR」＋右上角「茶餐館」
  g.save();
  g.globalAlpha = a;
  g.fillStyle = col;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `italic 900 ${s}px Arial,sans-serif`;
  g.fillText('22', cx - s * 1.7, cy);
  g.font = `900 ${s * 0.6}px Arial,sans-serif`;
  g.fillText('BurgeR', cx + s * 0.25, cy + s * 0.14);
  g.font = font(s * 0.25, 700);
  g.fillText('茶餐館', cx + s * 0.95, cy - s * 0.4);
  g.restore();
};
const sign22 = (T) =>
  T.sg('d2B_sign22', 512, 512, (g, W, H) => {
    // 22 號的黑框方形側招（白底黑字）
    g.fillStyle = '#f6f5f1';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#161616';
    g.lineWidth = 14;
    g.strokeRect(7, 7, W - 14, H - 14);
    logo22(g, W * 0.53, H * 0.165, H * 0.2, '#161616');
    g.fillStyle = '#161616';
    g.fillRect(W * 0.1, H * 0.3, W * 0.8, H * 0.075);
    g.fillRect(W * 0.16, H * 0.395, W * 0.68, H * 0.06);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = `900 ${H * 0.052}px Arial,sans-serif`;
    g.fillText('COMPOUND RESTAURANT', W / 2, H * 0.34);
    g.font = font(H * 0.042, 700);
    g.fillText('美式漢堡/輕食炸物/薯條', W / 2, H * 0.427);
    g.fillStyle = '#161616';
    g.fillText('果汁/茶飲/咖啡', W / 2, H * 0.5);
    g.setLineDash([8, 8]);
    g.strokeStyle = '#161616';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(W / 2, H * 0.75, H * 0.2, 0, 7);
    g.stroke();
    g.setLineDash([]);
    chef(g, W / 2, H * 0.78, H * 0.2);
    g.fillStyle = '#c8201c';
    g.beginPath();
    g.arc(W * 0.26, H * 0.8, H * 0.035, 0, 7);
    g.fill();
  });
const mold = (g, W, H, seed, n) => {
  // 帆布雨棚的剝落與發霉
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W,
      y = r() * H,
      a = 0.08 + r() * 0.22;
    g.fillStyle = r() < 0.5 ? `rgba(70,72,62,${a})` : `rgba(250,250,246,${a + 0.2})`;
    g.beginPath();
    g.ellipse(x, y, 20 + r() * 80, 8 + r() * 26, r() * 0.5, 0, 7);
    g.fill();
  }
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(60,60,52,.3)');
  gr.addColorStop(0.3, 'rgba(60,60,52,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
};
const bokeh = (g, W, H, seed, n) => {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,${(150 + r() * 80) | 0},${(190 + r() * 60) | 0},${0.1 + r() * 0.16})`;
    g.beginPath();
    g.arc(r() * W, r() * H, 6 + r() * H * 0.12, 0, 7);
    g.fill();
  }
};
const signYe = (T) =>
  T.sg('d2B_yemeili', 384, 128, (g, W, H) => {
    // 方形側招下面的桃紅色小燈箱（2025-05 拉近讀得出「夜美麗」）
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#d93a72');
    gr.addColorStop(1, '#b3204f');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    bokeh(g, W, H, 71, 16);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = font(H * 0.6);
    g.lineWidth = 6;
    g.strokeStyle = '#a0102c';
    g.strokeText('夜美麗', W * 0.4, H * 0.52, W * 0.68);
    g.fillStyle = '#fff1c4';
    g.fillText('夜美麗', W * 0.4, H * 0.52, W * 0.68);
  });
const signYeBig = (T) =>
  T.sg('d2B_yemeiliBig', 768, 448, (g, W, H) => {
    // 西南側牆上的桃紅色大招牌「夜越美麗 餐館」（2024-08）
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#8a1650');
    gr.addColorStop(1, '#4a0c3a');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    bokeh(g, W, H, 73, 40);
    g.strokeStyle = '#e8d9a0';
    g.lineWidth = 3;
    g.strokeRect(5, 5, W - 10, H - 10);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f6e7b0';
    for (const [t, x, y, s] of [
      ['夜', 0.13, 0.4, 0.36],
      ['越', 0.32, 0.36, 0.24],
      ['美', 0.51, 0.44, 0.36],
      ['麗', 0.72, 0.5, 0.36],
    ]) {
      g.font = font(H * s, 700);
      g.fillText(t, W * x, H * y);
    }
    g.fillStyle = '#d8e04a';
    g.font = font(H * 0.2);
    g.fillText('餐館', W * 0.84, H * 0.82);
  });
const complexTex = (T) =>
  T.sg('d2B_complex', 416, 64, (g, W, H) => {
    // 白看板下面褪色的米色舊橫牌（浮雕字還讀得出來）
    g.fillStyle = '#d8cfb6';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a89f86';
    g.lineWidth = 4;
    g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = 'rgba(128,118,96,.7)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 ${H * 0.5}px Arial,sans-serif`;
    g.fillText('COMPLEX  RESTAURANT', W / 2, H * 0.54, W * 0.9);
  });
const awningSW = (T) =>
  T.sg('d2B_awn22s', 640, 304, (g, W, H) => {
    // 西南切角那一段雨棚：褪色的卡通廚師＋22 BurgeR 茶餐館，鏽水痕
    g.fillStyle = '#e3ded0';
    g.fillRect(0, 0, W, H);
    logo22(g, W * 0.42, H * 0.46, H * 0.3, '#6a6a62', 0.5);
    chef(g, W * 0.78, H * 0.56, H * 0.34, 0.45);
    for (const x of [0.08, 0.3, 0.93]) {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(150,92,44,.5)');
      gr.addColorStop(1, 'rgba(150,92,44,0)');
      g.fillStyle = gr;
      g.fillRect(W * x, 0, W * 0.025, H * 0.85);
    }
    mold(g, W, H, 233, 26);
  });
const awning22 = (T) =>
  T.sg('d2B_awn22', 1536, 304, (g, W, H) => {
    // 22 號正面的米白帆布雨棚：中段 logo 褪成淡灰，右端灰字還讀得出來
    g.fillStyle = '#e3ded0';
    g.fillRect(0, 0, W, H);
    logo22(g, W * 0.36, H * 0.5, H * 0.34, '#77776f', 0.3);
    chef(g, W * 0.12, H * 0.56, H * 0.34, 0.25);
    g.fillStyle = 'rgba(88,88,82,.85)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = font(H * 0.17, 700);
    g.fillText('美式漢堡/輕食炸物/茶飲', W * 0.77, H * 0.42);
    g.font = `900 ${H * 0.13}px Arial,sans-serif`;
    g.fillText('COMPOUND RESTAURANT', W * 0.77, H * 0.66);
    mold(g, W, H, 221, 60);
  });
const awningCorner = (T) =>
  T.sg('d2B_awn22c', 448, 304, (g, W, H) => {
    // 切角那一段雨棚：卡通廚師＋22 BurgeR 茶餐館 還很完整
    g.fillStyle = '#e3ded0';
    g.fillRect(0, 0, W, H);
    chef(g, W * 0.17, H * 0.55, H * 0.36, 0.85);
    logo22(g, W * 0.62, H * 0.4, H * 0.26, '#3a3a36', 0.85);
    g.fillStyle = 'rgba(58,58,54,.8)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 ${H * 0.085}px Arial,sans-serif`;
    g.fillText('COMPOUND RESTAURANT', W * 0.62, H * 0.68);
    mold(g, W, H, 229, 14);
  });

const sidePlane = (k, tex, wz, h, x, y, zc, sd, o) =>
  k.plane(tex, wz, h, x, y, zc, (sd * Math.PI) / 2, o); // 側牆上的窗／招牌：sd +1 朝 x 大的那邊
const pot = (k, x, z, h, rr = 0.3) => {
  // 盆栽：陶盆＋兩層葉叢
  const c = ['#4c7d3a', '#3f6f35', '#5a8a42'][Math.round(x * 7 + z * 3 + 40) % 3];
  k.cyl(x, z, 0.17, 0.05, 0.36, '#b0603c', { seg: 8, r1: 0.22 });
  k.cyl(x, z, 0.04, 0.36, 0.36 + h * 0.5, '#5d4630', { seg: 5 });
  k.cyl(x, z, rr * 0.75, 0.36 + h * 0.3, 0.36 + h * 0.7, c, { seg: 7, r1: rr });
  k.cyl(x, z, rr, 0.36 + h * 0.7, 0.36 + h, c, { seg: 7, r1: rr * 0.55 });
};

// ---- 38 號：米白小方磚 3 樓，一樓丼心丼（s 50.3～56.6）----
const custom38 = (k, T) => {
  const { w, d, gf } = T,
    WH = T.wallMat('#e4e0d4'),
    F2 = gf + 3.1,
    F3 = F2 + 3.1,
    SX = 2.3; // SX：西南半邊（2025 改成灰色石材）的寬度
  // 一樓：黑色店面框、拉下來的塗鴉鐵捲門、西南端的 38 號門
  k.box(0, w, 0, gf, -0.25, 0, '#1f1f1f', NC);
  k.plane(graffiti(T), 4.85, 2.55, 3.65, 1.3, -0.27, T.FRONT);
  k.box(1.15, 6.15, 2.58, 2.86, -0.34, -0.25, '#2b2b2d', NC);
  k.box(0.06, 1.14, 0, 2.5, -0.3, -0.25, '#b9bcc0', NC);
  k.plane(door38(T), 0.9, 2.36, 0.6, 1.22, -0.31, T.FRONT);
  k.box(w - 0.32, w, 0, gf, -0.3, 0, '#2a2a2c', NC); // 轉角柱
  k.box(w - 0.26, w - 0.06, 1.3, 1.75, -0.32, -0.3, '#c8201c', NC); // 柱上的紅色小公告
  // 灰白鐵皮平頂雨棚＋日光燈、監視器
  k.box(-0.05, w + 0.05, 3.0, 3.12, -0.92, 0, '#cfcfcf', NC);
  for (const x of [1.6, 4.3]) k.box(x, x + 1.2, 2.94, 3.0, -0.6, -0.52, '#f4f4f0', NC);
  k.box(3.2, 3.32, 2.8, 3.0, -0.5, -0.4, '#f0f0ec', NC);
  // 橫招（整個面寬，掛在雨棚前緣上方）與 3 支黑色投射燈
  k.box(0, w, 3.12, 4.3, -0.92, -0.72, '#141414', NC);
  k.plane(signMain(T), w, 1.18, w / 2, 3.71, -0.93, T.FRONT, { emissive: 0.35 });
  k.box(-0.02, 0.02, 3.12, 4.3, -0.92, -0.3, '#d8362c', NC); // 橫招西南端折回牆面的那一面（朝 36 號）
  sidePlane(k, signEnd(T), 0.62, 1.18, -0.025, 3.71, -0.61, -1, { emissive: 0.35 });
  for (const x of [1.5, 3.3, 5.1]) {
    k.box(x, x + 0.04, 4.3, 4.72, -0.94, -0.9, '#1c1c1e', NC);
    k.box(x - 0.1, x + 0.14, 4.68, 4.82, -1.1, -0.9, '#1c1c1e', NC);
  }
  // 2 樓：東北半邊炭灰色＋一扇白框鋁窗；轉角留米白小方磚
  k.box(0, w, gf, F2, 0, d, WH, TL);
  k.box(-0.02, w + 0.02, F2, F2 + 0.08, -0.04, d, '#b9b6ae', NC);
  k.box(SX, w - 0.4, gf, F2, -0.06, 0, 'wall#5c6066', TL);
  k.plane(T.ROWT.alWin(), 1.7, 1.3, 4.1, gf + 1.75, -0.08, T.FRONT);
  k.box(3.2, 5.0, gf + 2.42, gf + 2.5, -0.1, -0.06, '#f0f0ec', NC);
  // 西南半邊：往外凸一點的淺灰石材箱體，黑色收邊，到 3 樓頂，頂上黑色欄杆小陽台
  k.box(0, SX, gf, F3, -0.3, 2.0, 'wall#a6a8a8', TL);
  k.box(-0.02, SX + 0.04, F3 - 0.1, F3 + 0.05, -0.34, 0, '#1c1c1e', NC);
  k.box(SX, SX + 0.06, gf, F3, -0.34, 0, '#1c1c1e', NC);
  k.box(-0.02, 0.04, gf, F3, -0.34, -0.28, '#1c1c1e', NC);
  k.plane(T.ROWT.alWin(), 1.0, 1.0, SX / 2, gf + 1.8, -0.32, T.FRONT);
  k.box(0, SX, F3 + 0.95, F3 + 1.0, -0.32, -0.27, '#1c1c1e', NC);
  for (let x = 0.02; x < SX; x += 0.28)
    k.box(x, x + 0.03, F3, F3 + 0.95, -0.31, -0.28, '#1c1c1e', NC);
  // 2 樓頂的白色花格欄杆露台（東北半邊），3 樓退縮 2 m
  k.plane(baluster(T), w - SX, 0.95, (w + SX) / 2, F2 + 0.55, -0.03, T.FRONT, {
    transparent: true,
    double: true,
  });
  sidePlane(k, baluster(T), 2.0, 0.95, w - 0.03, F2 + 0.55, 1.0, 1, {
    transparent: true,
    double: true,
  });
  k.box(SX, w, F2 + 1.0, F2 + 1.08, -0.08, 0.02, '#f1f0ec', NC);
  k.box(0, w, F2, F3, 2.0, d, WH, TL);
  k.plane(T.ROWT.alWin(), 2.4, 1.5, 4.4, F2 + 1.35, 1.97, T.FRONT);
  k.box(SX, w + 0.1, F3 - 0.55, F3 - 0.35, 1.3, 2.0, '#b5553c', NC); // 紅色筒瓦簷
  for (const x of [3.3, 5.3])
    k.plane(gable(T), 1.9, 0.85, x, F3 + 0.05, 1.3, T.FRONT, { transparent: true, double: true });
  k.cyl(w - 0.6, 0.6, 0.22, F2 + 0.08, F2 + 0.45, '#b0603c', { seg: 8 });
  k.cyl(w - 0.6, 0.6, 0.5, F2 + 0.45, F2 + 1.5, '#4c7d3a', { seg: 6, r1: 0.1 }); // 露台上的棕櫚盆栽
  // 屋頂：3 樓上面架高的灰白鐵皮斜頂，西南半邊後面再一層有鋁窗的鐵皮加蓋
  k.box(-0.02, w + 0.02, F3, F3 + 0.08, 2.0, d, '#b9b6ae', NC);
  k.box(SX - 0.1, w + 0.15, F3 + 1.25, F3 + 1.35, 0.9, d, T.MR.roof, NC);
  for (const [x, z] of [
    [SX + 0.1, 2.1],
    [w - 0.2, 2.1],
    [SX + 0.1, d - 0.3],
    [w - 0.2, d - 0.3],
  ])
    k.box(x, x + 0.08, F3, F3 + 1.25, z, z + 0.08, '#8d9196', NC);
  k.box(0, SX + 0.4, F3, F3 + 2.3, 2.6, d, '#d9d0b4', NC);
  k.box(SX - 0.05, SX + 0.4, F3, F3 + 2.3, 2.58, 2.6, '#a8432f', NC);
  k.plane(T.ROWT.alWin(), 2.0, 1.1, SX / 2 + 0.2, F3 + 1.3, 2.57, T.FRONT);
  k.box(-0.1, SX + 0.5, F3 + 2.3, F3 + 2.4, 2.3, d + 0.0, T.MR.roof, NC);
  // 轉角 2 樓垂直於路的黑底燈箱（朝東北、西南兩面）
  k.box(w - 0.24, w - 0.08, 4.45, 5.65, -1.15, 0, '#141414', NC);
  for (const sd of [-1, 1])
    sidePlane(k, signCorner(T), 1.12, 1.16, w - 0.16 + sd * 0.09, 5.05, -0.58, sd, {
      emissive: 0.35,
    });
  // 40 巷那一面（東北側牆）：灰色洗石子腰帶、後段另一戶的白色鐵捲門、2 樓突出的白色鐵籠窗、上下疊的冷氣、3 樓藍綠色雨遮
  const X = w + 0.03;
  k.box(w, w + 0.04, gf - 0.3, gf + 0.05, 0, d, '#a9a79f', NC);
  sidePlane(k, T.shutterTex('#e6e4dc'), 3.6, 2.7, X, 1.35, 5.4, 1);
  k.box(w, w + 0.12, 2.7, 2.95, 3.5, 7.3, '#dedcd4', NC);
  sidePlane(k, T.ROWT.alWin(), 1.5, 1.4, X, gf + 1.55, 2.6, 1);
  for (const y of [gf + 0.75, gf + 2.3]) k.box(w, w + 0.5, y, y + 0.05, 1.75, 3.45, '#e9e9e4', NC);
  for (let z = 1.75; z <= 3.46; z += 0.17)
    k.box(w + 0.47, w + 0.5, gf + 0.8, gf + 2.3, z, z + 0.025, '#e9e9e4', NC);
  for (const z of [1.75, 3.42])
    for (let x = 0.1; x < 0.5; x += 0.17)
      k.box(w + x, w + x + 0.025, gf + 0.8, gf + 2.3, z, z + 0.025, '#e9e9e4', NC);
  for (const y of [gf + 0.35, gf + 1.15]) {
    k.box(w, w + 0.38, y, y + 0.55, 3.9, 4.7, T.MR.ac, NC);
    k.box(w + 0.38, w + 0.39, y + 0.07, y + 0.48, 3.98, 4.5, '#9a9a94', NC);
  }
  sidePlane(k, T.YHT.win(), 1.2, 1.2, X, gf + 1.6, 6.8, 1);
  k.box(w, w + 0.85, F2 + 2.35, F2 + 2.42, 2.2, 7.5, '#5aa8a0', NC);
  sidePlane(k, T.ROWT.alWin(), 2.2, 1.3, X, F2 + 1.4, 4.0, 1);
  sidePlane(k, T.YHT.win(), 1.2, 1.2, X, F2 + 1.4, 7.2, 1);
  for (const f of [gf, F2])
    for (const x of [1.6, 4.6]) k.plane(T.YHT.win(), 1.5, 1.1, x, f + 1.5, d + 0.03, 0); // 後牆
};

// ---- 36 號：粉紅小方磚 4 樓＋車庫＋側廊（s 56.6～63.9）----
const custom36 = (k, T) => {
  const { w, d, gf } = T,
    PK = T.wallMat('#c98f89'),
    BR = T.wallMat('#b46a55'),
    FL = T.wallMat('#e6cdb9');
  const Z = -3.2,
    ZU = -2.0,
    CX = 1.6,
    F2 = gf + 3.0,
    F3 = F2 + 3.0,
    F4 = F3 + 3.0; // Z：一樓磚牆與雨棚前緣；ZU：樓上的牆面；CX：側廊與主體的分界
  const cx = (CX + w) / 2,
    GR = '#5e9a7c';
  // 車庫：淺膚色磁磚的裡牆、橘紅地磚、裡面的門窗、跟側廊之間的隔牆
  k.box(0, w, 0, gf, -0.25, 0, FL, TL);
  k.box(CX, w, 0.05, 0.08, Z, 0, '#c9825c', NC);
  k.box(CX, CX + 0.12, 0, gf, Z + 0.2, 0, FL, { tile: [0.6, 0.6] });
  k.plane(T.YHT.win(), 2.6, 1.6, 3.9, 1.75, -0.27, T.FRONT);
  k.box(5.75, 6.75, 0, 2.3, -0.28, -0.25, '#b9bcc0', NC);
  k.plane(T.bars, 0.8, 2.1, 6.25, 1.1, -0.29, T.FRONT, { transparent: true });
  k.box(5.3, 5.6, 1.3, 2.0, -0.27, -0.25, '#c8201c', NC);
  // 樓上的量體（比雨棚前緣退後 1.2 m），4 樓再退縮成陽台
  k.box(CX, w, gf - 0.3, F3, ZU, d, PK, TL);
  k.box(CX, w, F3, F4, -0.8, d, PK, TL);
  // 臨街：磚紅色實牆（側廊的正面）、東北端的磚柱與不鏽鋼格柵門
  k.box(0, CX + 0.12, 0, 2.95, Z, Z + 0.2, BR, { tile: [0.6, 0.6] });
  k.box(w - 0.14, w, 0, 2.95, Z, Z + 0.2, BR, { tile: [0.6, 0.6] });
  k.box(w - 1.14, w - 1.08, 0, 2.3, Z, Z + 0.06, '#b9bcc0', NC);
  k.box(w - 1.14, w - 0.14, 2.24, 2.3, Z, Z + 0.06, '#b9bcc0', NC);
  for (let x = w - 1.02; x < w - 0.16; x += 0.11)
    k.box(x, x + 0.025, 0.05, 2.24, Z + 0.02, Z + 0.045, '#b9bcc0', NC);
  for (const y of [0.05, 1.1])
    k.box(w - 1.08, w - 0.14, y, y + 0.05, Z + 0.01, Z + 0.05, '#b9bcc0', NC);
  // 綠色圓弧雨棚：車庫到磚牆一整條，白色鋁框肋，前緣不鏽鋼天溝
  k.box(0, w, 2.9, 2.95, Z - 0.05, ZU, '#eceae4', NC);
  barrelX(k, T, 0, w, 2.95, (Z + ZU) / 2 - 0.02, 0.64, 0.9, GR);
  for (let x = 0.02; x <= w; x += (w - 0.1) / 6)
    barrelX(k, T, x, x + 0.06, 2.95, (Z + ZU) / 2 - 0.02, 0.66, 0.9, '#eceae4');
  k.box(-0.04, w + 0.04, 2.86, 2.97, Z - 0.14, Z - 0.04, '#c5c8ca', NC);
  // 側廊：一層樓高，頂上同款的綠色圓弧雨棚；外側是垂直於路的墨綠色採光板圍籬（下面 1 m 米色小方磚矮牆）
  barrelZ(k, T, ZU, d, CX / 2, gf + 0.1, CX / 2, 0.55, GR);
  k.box(-0.05, 0.07, 0, 1.0, Z + 0.2, 0.7, T.wallMat('#d9cfb8'), TL);
  k.box(-0.04, 0.06, 1.0, 2.9, Z + 0.2, 0.7, '#2f5a47', NC);
  for (let z = Z + 0.2; z <= 0.7; z += 0.78)
    k.box(-0.06, 0.08, 1.0, 2.9, z, z + 0.05, '#1f4233', NC);
  k.box(-0.06, 0.08, 1.9, 1.95, Z + 0.2, 0.7, '#1f4233', NC);
  k.wallLine(0, Z + 0.2, 0, 0, 0, 2.9);
  // 磚牆上：黃底紅字「套房出租」、紅色春聯紙、門牌 36、3 個黑色電表箱；牆前地上的墨綠色電箱
  k.plane(
    T.paint('套房出租\n0937-803532', '#f4d21f', '#c8201c', null, 0.9, 0.5),
    0.9,
    0.5,
    1.12,
    1.95,
    Z - 0.02,
    T.FRONT
  );
  k.box(0.28, 0.68, 1.3, 2.05, Z - 0.02, Z, '#c8201c', NC);
  k.plane(
    T.paint('36', '#ffffff', '#c8201c', null, 0.3, 0.18),
    0.3,
    0.18,
    1.42,
    2.52,
    Z - 0.02,
    T.FRONT
  );
  for (const x of [0.2, 0.55, 0.9]) {
    k.box(x, x + 0.28, 2.3, 2.72, Z - 0.16, Z, '#222224', NC);
    k.cyl(x + 0.14, Z - 0.17, 0.09, 2.42, 2.6, '#c9ccce', { seg: 8 });
  }
  k.box(0.45, 1.3, 0, 0.85, Z - 0.62, Z - 0.1, '#2f5d4a');
  // 2 樓：一扇大窗（白色直條鐵窗）＋左邊小氣窗
  k.plane(T.ROWT.alWin(), 2.3, 1.75, cx, gf + 1.45, ZU - 0.02, T.FRONT);
  k.plane(whiteBars(T), 2.4, 1.85, cx, gf + 1.45, ZU - 0.08, T.FRONT, {
    transparent: true,
    double: true,
  });
  k.box(6.2, 6.8, gf + 2.0, gf + 2.3, ZU - 0.03, ZU, '#8a6a64', NC);
  // 3 樓：整層往外凸 0.6 m 的台座，中間扇形鐵窗凸窗，左右各一個白色直條鐵籠窗
  k.box(CX + 0.25, w - 0.25, F2 - 0.4, F2 + 0.75, ZU - 0.6, ZU, PK, TL);
  k.box(3.05, 5.85, F2 + 0.75, F3 - 0.15, ZU - 0.6, ZU, PK, TL);
  k.plane(fanWin(T), 2.5, 2.0, cx, F2 + 1.8, ZU - 0.62, T.FRONT, { transparent: true });
  for (const x of [2.42, 6.48]) {
    k.plane(T.ROWT.alWin(), 1.0, 1.7, x, F2 + 1.65, ZU - 0.02, T.FRONT);
    k.plane(whiteBars(T), 1.1, 1.95, x, F2 + 1.72, ZU - 0.5, T.FRONT, {
      transparent: true,
      double: true,
    });
    for (const sd of [-1, 1])
      sidePlane(k, whiteBars(T), 0.5, 1.95, x + sd * 0.55, F2 + 1.72, ZU - 0.25, sd, {
        transparent: true,
        double: true,
      });
    k.box(x - 0.55, x + 0.55, F2 + 2.7, F2 + 2.76, ZU - 0.6, ZU, GR, NC);
  }
  // 4 樓：黑色欄杆陽台，後面整排鋁窗；灰色鐵皮平頂，東北邊再高出一截
  k.plane(T.bars, w - CX, 1.0, cx, F3 + 0.5, ZU + 0.03, T.FRONT, {
    transparent: true,
    double: true,
  });
  k.box(CX, w, F3 + 0.98, F3 + 1.04, ZU, ZU + 0.06, '#1c1c1e', NC);
  for (const x of [2.6, 4.45, 6.3]) k.plane(T.ROWT.alWin(), 1.7, 1.6, x, F3 + 1.5, -0.82, T.FRONT);
  k.box(CX - 0.15, w + 0.1, F4, F4 + 0.1, ZU - 0.25, d, T.MR.roof, NC);
  for (const x of [CX + 0.05, w - 0.13])
    k.box(x, x + 0.08, F3, F4, ZU + 0.02, ZU + 0.1, '#8d9196', NC);
  k.box(4.6, w, F4 + 0.1, F4 + 1.3, 1.0, d - 0.4, '#aeb2b5', NC);
  k.box(4.4, w + 0.1, F4 + 1.3, F4 + 1.4, 0.7, d, T.MR.roof, NC);
  // 西南側牆（朝側院）：淺灰藍色油漆牆，小窗＋綠色小雨遮，2 樓高度一整排白色冷氣室外機
  k.box(CX - 0.06, CX, gf + 0.1, F3, ZU, d, '#c9ccd3', NC);
  k.box(CX - 0.06, CX, F3, F4, -0.8, d, '#c9ccd3', NC);
  for (const y of [gf, F2, F3])
    for (const z of [0.6, 3.6]) {
      sidePlane(k, T.YHT.win(), 0.95, 1.05, CX - 0.08, y + 1.75, z, -1);
      k.box(CX - 0.5, CX - 0.06, y + 2.35, y + 2.41, z - 0.6, z + 0.6, GR, NC);
    }
  for (let i = 0; i < 6; i++) {
    const z = -1.7 + i * 1.12;
    k.box(CX - 0.46, CX - 0.06, gf + 0.25, gf + 0.8, z, z + 0.8, T.MR.ac, NC);
    k.box(CX - 0.47, CX - 0.46, gf + 0.32, gf + 0.73, z + 0.08, z + 0.6, '#9a9a94', NC);
  }
  // 車庫裡的白色休旅車與腳踏車（2025-05）
  k.box(2.5, 6.4, 0.38, 1.05, -2.5, -0.85, '#f2f2f0');
  k.box(3.0, 5.5, 1.05, 1.6, -2.42, -0.93, '#1f2a33', NC);
  k.box(3.05, 5.45, 1.6, 1.66, -2.4, -0.95, '#f2f2f0', NC);
  for (const x of [2.9, 5.4])
    for (const z of [-2.52, -1.03]) k.box(x, x + 0.68, 0.06, 0.74, z, z + 0.2, '#1c1c1e', NC);
  k.box(6.55, 6.6, 0.3, 0.95, -2.3, -0.9, '#3a3a40', NC);
  for (const z of [-2.3, -1.25]) k.box(6.53, 6.62, 0.06, 0.66, z, z + 0.35, '#1c1c1e', NC);
  for (const x of [2.6, 5.2]) k.plane(T.YHT.win(), 1.5, 1.1, x + 1, F2 + 1.5, d + 0.03, 0);
};

// ---- 臨街小空地＋22 號的東北切角與內凹的側翼（s 63.9～69.5）----
const custom22yard = (k, T) => {
  const { w, d, gf } = T,
    DK = 'wall#63656a',
    ZF = -3.0,
    TOP = 9.0; // ZF：22 號正面的立面線
  k.box(0, w, 0, gf, -0.25, 0, DK, TL);
  k.box(0, w, gf, TOP, 0, d, DK, TL);
  k.box(-0.02, w + 0.02, TOP, TOP + 0.12, -0.04, d, '#8f9092', NC);
  // 朝空地的內凹牆面：一樓白框落地門窗，二樓一大片藍綠色玻璃，牆上一條灰色風管
  k.plane(frenchDoor(T), 1.9, 2.4, 3.3, 1.2, -0.27, T.FRONT);
  k.box(1.6, 5.2, gf + 0.5, gf + 3.0, -0.06, 0, 'wall#cbccc1', TL);
  k.plane(tealGlass(T), 3.2, 2.0, 3.4, gf + 1.75, -0.08, T.FRONT);
  k.box(-0.02, w, 7.05, 7.3, -0.16, 0, DK, NC);
  k.box(4.75, 4.93, 0.3, 4.4, -0.2, -0.02, '#9a9d9f', NC);
  // 45° 切角：從 22 號正面的東北角斜切到側翼，二樓大方窗（淺綠玻璃），一樓深色門洞
  for (let i = 0; i < 7; i++) k.box(i * 0.2, i * 0.2 + 0.2, 0, TOP, ZF + (i + 1) * 0.2, 0, DK, NC);
  vc(T, k.slab(0, ZF, 1.4, ZF + 1.4, 0.1, 0, TOP, 'd2VC'), '#4a4b4f');
  k.wallLine(1.4, ZF + 1.4, 1.4, 0, 0, TOP);
  const q = Math.SQRT1_2,
    CA = (3 * Math.PI) / 4,
    cp = (o) => [0.7 + q * o, ZF + 0.7 - q * o];
  {
    const [x, z] = cp(0.07);
    k.plane(tealGlass(T), 1.4, 1.6, x, 5.6, z, CA);
    k.plane(
      T.sg('d2B_dark', 16, 16, (g) => {
        g.fillStyle = '#131416';
        g.fillRect(0, 0, 16, 16);
      }),
      1.2,
      2.5,
      x,
      1.25,
      z,
      CA
    );
  }
  vc(T, k.slab(0, ZF - 0.07, 1.47, ZF + 1.4, 0.2, 7.05, 7.3, 'd2VC', NC), '#45464a');
  {
    const [x, z] = cp(0.07 + 0.625);
    tilt(k.plane(awningCorner(T), 2.5, 1.7, x, 3.62, z, CA, { double: true }), -0.827);
  }
  // 空地：琥珀色圓球庭園燈、一整片盆栽灌木、垂直停放的 3 台機車
  k.cyl(5.0, -3.9, 0.05, 0, 3.2, '#1c1c1e', { seg: 6 });
  k.cyl(5.0, -3.9, 0.12, 3.15, 3.25, '#1c1c1e', { seg: 8 });
  k.cyl(5.0, -3.9, 0.14, 3.25, 3.36, '#f0c468', { seg: 10, r1: 0.24 });
  k.cyl(5.0, -3.9, 0.24, 3.36, 3.54, '#f0c468', { seg: 10 });
  k.cyl(5.0, -3.9, 0.24, 3.54, 3.66, '#f0c468', { seg: 10, r1: 0.13 });
  for (const [x, z, h] of [
    [5.3, -3.2, 0.9],
    [5.25, -2.5, 1.3],
    [5.3, -1.7, 0.8],
    [5.2, -0.9, 1.5],
    [4.4, -0.6, 1.0],
    [2.2, -0.6, 0.9],
    [1.7, -1.1, 1.4],
    [4.5, -3.6, 0.7],
    [1.75, -2.2, 1.2],
    [1.3, -3.3, 1.6],
    [0.6, -3.7, 1.2],
    [1.9, -3.6, 0.8],
    [1.0, -4.1, 0.7],
  ])
    pot(k, x, z, h * 0.8, 0.26 + h * 0.1);
  ['#2a2a30', '#c9c9c4', '#2f6db3'].forEach((c, i) => T.bike(k, 2.6 + i * 0.8, -4.7, 1, c));
};

// ---- 22 號（原 22 BurgeR 茶餐館）正面：深灰色石材 2 樓（s 69.5～77.4）；西南端的切角另外一格 ----
const custom22 = (k, T) => {
  const { w, d, gf } = T,
    DK = 'wall#63656a',
    LG = 'wall#cbccc1',
    TOP = 9.0,
    PB = 7.2,
    O = w - 8.5; // PB：女兒牆帶的下緣；O：一樓各段的基準（跟著東北端走）
  // 一樓：石柱＋直立式冷氣、玻璃店面（下面 0.6 m 石材矮牆）、橘紅色菜單看板、木板圍片、掛方形側招的石柱
  k.box(0, w, 0, gf, -0.25, 0, DK, TL);
  k.plane(darkShop(T), 4.3, 2.3, O + 5.65, 1.75, -0.27, T.FRONT);
  k.box(O + 3.45, O + 7.85, 2.9, 2.98, -0.3, -0.25, '#1b1c1e', NC);
  k.box(O + 7.95, O + 8.4, 0.1, 1.75, -0.75, -0.3, T.MR.ac, NC);
  for (const y of [0.25, 1.0]) k.box(O + 8.0, O + 8.35, y, y + 0.6, -0.77, -0.75, '#8f9290', NC);
  k.plane(menuBoard(T), 1.15, 1.6, O + 2.9, 1.9, -0.27, T.FRONT);
  k.box(O + 1.5, O + 2.3, 0, 2.45, -0.31, -0.25, '#9a6b3f', NC);
  for (let x = O + 1.5; x < O + 2.3; x += 0.16)
    k.box(x, x + 0.02, 0, 2.45, -0.32, -0.31, '#6f4a28', NC);
  k.box(0, w, 0, 0.18, -0.6, -0.25, '#8a8b8c', NC); // 門口的石階
  pot(k, 0.9, -0.95, 1.5, 0.42);
  pot(k, 1.7, -1.05, 1.2, 0.36); // 菜單板前面的一叢盆栽
  // 樓上：2 樓淺灰石材（橫向分割縫）、兩端深色花崗石柱、女兒牆帶與往外凸的簷帶
  k.box(0, w, gf, TOP, 0, d, DK, TL);
  k.box(0.9, w - 0.9, gf + 0.4, PB, -0.06, 0, LG, TL);
  for (const y of [4.75, 5.35, 5.95, 6.55])
    k.box(0.9, w - 0.9, y, y + 0.03, -0.065, -0.06, '#6f706a', NC);
  k.box(-0.02, w + 0.07, PB - 0.15, PB + 0.1, -0.2, 0, DK, NC);
  k.box(-0.02, w + 0.04, PB + 0.1, PB + 0.2, -0.12, 0, DK, NC);
  for (let x = 0.9; x < w; x += 1.15) k.box(x, x + 0.03, PB + 0.2, TOP, -0.012, 0, '#2f3033', NC);
  k.box(0, w, 8.1, 8.13, -0.012, 0, '#2f3033', NC);
  for (const x of [0, w - 0.9])
    for (const y of [1.2, 2.4, 3.6, 4.8, 6.0])
      k.box(x, x + 0.9, y, y + 0.03, y < gf ? -0.262 : -0.012, y < gf ? -0.25 : 0, '#2f3033', NC);
  // 2 樓正面中間的橫長窗（玻璃上褪色的藍綠色貼圖）與窗下兩支黑色投射燈
  k.plane(tealGlass(T), 4.5, 1.8, O + 5.25, 5.85, -0.08, T.FRONT);
  for (const x of [O + 4.3, O + 6.2]) {
    k.box(x, x + 0.04, 4.55, 4.6, -0.55, -0.06, '#1c1c1e', NC);
    k.box(x - 0.12, x + 0.16, 4.5, 4.62, -0.7, -0.5, '#1c1c1e', NC);
  }
  // 西南端石柱上：垂直於路的黑框方形燈箱（白底黑字，兩面）與正下方的桃紅色小燈箱「夜美麗」
  const sx = 0.45;
  k.box(sx - 0.08, sx + 0.08, 5.35, 7.25, -2.0, -0.06, '#161616', NC);
  for (const sd of [-1, 1])
    sidePlane(k, sign22(T), 1.86, 1.86, sx + sd * 0.09, 6.3, -1.03, sd, { emissive: 0.3 });
  k.box(sx - 0.1, sx + 0.1, 4.55, 5.15, -1.7, -0.06, '#f3f1ec', NC);
  k.box(sx - 0.11, sx + 0.11, 4.6, 5.1, -1.65, -0.11, '#d6336c', NC);
  for (const sd of [-1, 1])
    sidePlane(k, signYe(T), 1.54, 0.5, sx + sd * 0.115, 4.85, -0.88, sd, { emissive: 0.3 });
  // 米白色帆布斜雨棚（發霉剝落，字還在）＋前緣垂片
  tilt(k.plane(awning22(T), w, 1.7, w / 2, 3.625, -0.875, T.FRONT, { double: true }), -0.827);
  k.box(0, w, 2.9, 3.07, -1.52, -1.48, '#d6d0c0', NC);
  k.box(0, w, 4.15, 4.25, -0.3, -0.06, '#cfc9b8', NC);
  // 屋頂：女兒牆上的不鏽鋼欄杆、淺綠色玻璃採光罩
  k.box(-0.02, w + 0.02, TOP, TOP + 0.1, -0.04, d, '#8f9092', NC);
  k.box(0, w, TOP + 0.55, TOP + 0.6, 0.02, 0.07, '#c5c8ca', NC);
  for (let x = 0.05; x < w; x += 1.2)
    k.box(x, x + 0.04, TOP + 0.1, TOP + 0.55, 0.02, 0.07, '#c5c8ca', NC);
  for (const [x0, x1, z0, z1] of [
    [0.4, 3.2, 1.5, 4.5],
    [4.0, w - 0.7, 1.2, 6.5],
  ]) {
    k.box(x0, x1, TOP + 0.1, TOP + 0.9, z0, z1, '#a9d8bf', NC);
    k.box(x0 - 0.1, x1 + 0.1, TOP + 0.9, TOP + 1.0, z0 - 0.1, z1 + 0.1, '#bfe4cf', NC);
  }
  // 門前一整排垂直停放的機車
  ['#2a2a30', '#c9c9c4', '#2a2a30', '#b02a2a', '#c9c9c4', '#2f6db3', '#3f7a4c'].forEach((c, i) =>
    T.bike(k, 2.3 + i * 0.86, -1.98, 1, c)
  );
  for (const x of [1.4, 4.0, 6.5])
    for (const f of [0.6, gf + 1]) k.plane(T.YHT.win(), 1.5, 1.1, x, f + 1.2, d + 0.03, 0);
};

// ---- 22 號的西南切角（s 77.4～80）：45° 斜面朝大仁街口，一樓米白鐵捲門，上面是褪色舊橫牌與空白的白色大看板；西南側牆掛「夜越美麗 餐館」----
// 外殼退到切角的最裡面（離路中心 7.6 m），前面的三角形用階梯狀的方塊填實、外面貼一片斜牆。
const custom22sw = (k, T) => {
  const { w, d, gf } = T,
    DK = 'wall#63656a',
    LG = 'wall#cbccc1',
    TOP = 9.0,
    PB = 7.2,
    q = Math.SQRT1_2,
    CA = (-3 * Math.PI) / 4,
    L = w * Math.SQRT2;
  const cp = (t, o) => [w / 2 + (t - o) * q, -w / 2 - (t + o) * q]; // 斜面上的點：t 沿斜面（+ 朝正面那一端）、o 往外
  const sl = (t0, t1, o, th, y0, y1, hex, col) => {
    const a = cp(t0, o),
      b = cp(t1, o);
    return vc(T, k.slab(a[0], a[1], b[0], b[1], th, y0, y1, 'd2VC', col ? {} : NC), hex);
  };
  k.box(0, w, gf, TOP, 0, d, DK, TL);
  for (let i = 1; i * 0.2 < w - 0.01; i++)
    k.box(i * 0.2, Math.min(w, i * 0.2 + 0.2), 0, TOP, -i * 0.2, 0, DK, NC);
  sl(-L / 2, L / 2, 0, 0.1, 0, TOP, '#4a4b4f', true);
  k.box(-0.16, 0.42, 0, TOP, -0.42, 0.02, DK, NC); // 切角兩端的石柱
  k.box(w - 0.3, w + 0.02, 0, TOP, -w - 0.26, -w + 0.3, DK, NC);
  sl(-L / 2, L / 2, 0.1, 0.2, PB - 0.15, PB + 0.1, '#45464a');
  // 一樓：米白色鐵捲門；雨棚跟著轉過切角（褪色的 logo）
  {
    const [x, z] = cp(-0.25, 0.06);
    k.plane(T.shutterTex('#d9d4c4'), 2.25, 2.8, x, 1.4, z, CA);
  }
  sl(-1.45, 0.95, 0.1, 0.1, 2.8, 3.02, '#bdb8a8');
  {
    const [x, z] = cp(0.15, 0.07 + 0.625);
    tilt(k.plane(awningSW(T), L + 0.3, 1.7, x, 3.625, z, CA, { double: true }), -0.827);
  }
  sl(-L / 2, L / 2 + 0.45, 1.3, 0.04, 2.9, 3.07, '#d6d0c0');
  sl(-L / 2, L / 2, 0.1, 0.1, 4.15, 4.25, '#cfc9b8');
  // 樓上：褪色的米色舊橫牌、空白的白色大看板（蓋過簷帶）
  {
    const [x, z] = cp(-0.2, 0.17);
    k.plane(complexTex(T), 2.7, 0.42, x, 4.5, z, CA);
  }
  sl(-L / 2 + 0.12, L / 2 - 0.12, 0.26, 0.08, 4.8, 7.7, '#eeeeea');
  sl(-L / 2 + 0.12, L / 2 - 0.12, 0.27, 0.1, 4.75, 4.8, '#8d9196');
  // 屋頂欄杆、轉角路邊的紅色消防栓
  k.box(-0.02, w + 0.02, TOP, TOP + 0.1, -0.04, d, '#8f9092', NC);
  sl(-L / 2, L / 2, -0.1, 0.05, TOP + 0.55, TOP + 0.6, '#c5c8ca');
  k.box(0.02, 0.07, TOP + 0.55, TOP + 0.6, 0, d, '#c5c8ca', NC);
  k.cyl(1.2, -4.2, 0.11, 0, 0.62, '#c8201c', { seg: 8 });
  k.cyl(1.2, -4.2, 0.14, 0.62, 0.72, '#c8201c', { seg: 8, r1: 0.05 });
  k.box(1.05, 1.35, 0.38, 0.5, -4.25, -4.15, '#c8201c', NC);
  // 西南側牆（朝石階與廣場，2024-08）：淺灰石材的內凹牆面、桃紅色大招牌、下面一台直立式冷氣
  k.box(-0.04, 0, 4.1, 6.9, 0.7, 4.7, LG, TL);
  k.box(-0.14, -0.04, 4.4, 6.2, 1.0, 4.0, '#3a0a22', NC);
  sidePlane(k, signYeBig(T), 3.0, 1.8, -0.15, 5.3, 2.5, -1, { emissive: 0.3 });
  k.box(-0.42, -0.04, 2.7, 4.15, 0.95, 1.85, T.MR.ac, NC);
  for (const y of [2.82, 3.5]) k.box(-0.43, -0.42, y, y + 0.55, 1.1, 1.7, '#8f9290', NC);
  for (const f of [0.6, gf + 1]) k.plane(T.YHT.win(), 1.5, 1.1, 1.3, f + 1.2, d + 0.03, 0);
};

const BASE = { nf: 1, ground: 'shutter', door: 0, noband: true, bikes: -1 };
export default {
  ownSign: ['丼心丼', '22burger茶餐館'],
  drop: ['f1565', 'f1566', 'f1567', 'f1568'],
  lots: [
    [
      50.3,
      56.6,
      -1,
      { ...BASE, set: 4.2, d: 9, gf: 3.4, wall: '#e4e0d4', sh: '#3a3a3c', custom: custom38 },
    ],
    [56.6, 63.9, -1, { ...BASE, set: 7.4, d: 6.3, gf: 3.3, wall: '#e6cdb9', custom: custom36 }],
    [
      63.9,
      69.5,
      -1,
      { ...BASE, set: 8, d: 6, gf: 3.8, wall: '#45464a', roofCol: 'gray', custom: custom22yard },
    ],
    [
      69.5,
      77.4,
      -1,
      { ...BASE, set: 5, d: 9, gf: 3.8, wall: '#45464a', roofCol: 'gray', custom: custom22 },
    ],
    [
      77.4,
      80,
      -1,
      { ...BASE, set: 7.6, d: 6.4, gf: 3.8, wall: '#45464a', roofCol: 'gray', custom: custom22sw },
    ],
  ],
};
