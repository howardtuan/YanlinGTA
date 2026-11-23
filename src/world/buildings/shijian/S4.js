// 實踐路街屋資料：S 段 s 450～553（到環中東路）兩側，加上實踐路11巷（L11）。格式見 src/world/buildings/StreetShijian.js 檔頭。
// 照 Google 街景 2026-05（11 巷巷內只有 2022-08）與國土測繪 2024 正射建模。
// 區域座標提醒：站在街上面對立面時，x = 0 在右手邊、x = w 在左手邊（兩側都一樣）；z < 0 是立面前方（往街上），z > 0 往屋後。
// 東北側 s 468.9～483.9 的全聯福利中心，樓房本體是 src/world/buildings/StreetDaren1.js 蓋的（大仁一街那一面）；這裡只在它面實踐路的端牆前面貼一片薄薄的正立面。
// 東北側 s 495.5 以後是鼎藏中原匯的工地：只做圍籬與興建中包著藍色防護網的結構體，不蓋樓房。

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
// 貼在立面上的看板
const flat = (k, c, tex, wd, ht, x, y, z = -0.07, em = 0.3) =>
  k.plane(tex, wd, ht, x, y, z, c.FRONT, { emissive: em });
// 圓形招牌貼圖：外圈 ring、底 bg、一行字加小字
const disc = (c, text, bg, ring, fg, sub) =>
  c.sg(`sj4D_${text}|${bg}|${ring}|${fg}|${sub || ''}`, 256, 256, (g) => {
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
    let p = 84;
    g.font = c.font(p);
    while (g.measureText(text).width > 190 && p > 14) {
      p -= 2;
      g.font = c.font(p);
    }
    g.fillText(text, 128, sub ? 112 : 130);
    if (sub) {
      let q = 30;
      g.font = c.font(q, 700);
      while (g.measureText(sub).width > 160 && q > 10) {
        q -= 2;
        g.font = c.font(q, 700);
      }
      g.fillText(sub, 128, 172);
    }
  });
// 比共用招牌帶（0.8 m）更高的大橫招（貼圖自己給）：那一格要加 noband
const bigBand = (k, c, tex, bg, hgt = 1.3, x0 = 0.05, x1 = c.w - 0.05) => {
  k.box(x0, x1, c.gf - 0.95, c.gf - 0.95 + hgt, -0.3, 0, bg, { col: false });
  flat(k, c, tex, x1 - x0 - 0.1, hgt - 0.06, (x0 + x1) / 2, c.gf - 0.95 + hgt / 2, -0.31, 0.35);
};
// 樓上某一層的黑鐵欄杆（x0～x1）
const rail = (k, x0, x1, y, hex = '#2b2b2b', out = 0.9) => {
  k.box(x0, x1, y, y + 0.1, -out, 0, hex, { col: false });
  for (const yy of [0.5, 0.85, 1.2])
    k.box(x0, x1, y + yy, y + yy + 0.04, -out, -out + 0.04, hex, { col: false });
  for (const x of [x0, x1 - 0.04])
    k.box(x, x + 0.04, y, y + 1.2, -out, -out + 0.04, hex, { col: false });
};
// 樓板線的橫帶
const bands = (k, c, hex, th = 0.22, out = 0.05) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    k.box(0, c.w, y - th / 2, y + th / 2, -out, 0, hex, { col: false });
  }
};
// 把某一層預設的窗蓋掉（那一層自己另外畫）
const blank = (k, c, f, hex) => {
  const y = c.gf + (f - 1) * c.fh;
  k.box(0.12, c.w - 0.12, y + 0.02, y + c.fh - 0.02, -0.07, 0, c.wallMat(hex), { col: false });
};
// 磁磚框凸窗（from 樓起每層 n 個）
const bays = (k, c, hex, from, n) => {
  for (let f = from - 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    for (let j = 0; j < n; j++) {
      const cx = (c.w * (j + 0.5)) / n,
        bw = Math.min(2.6, c.w / n - 0.8);
      k.box(cx - bw / 2, cx + bw / 2, y + 0.45, y + 2.6, -0.55, 0, c.wallMat(hex), { col: false });
      k.box(cx - bw / 2 - 0.05, cx + bw / 2 + 0.05, y + 2.6, y + 2.68, -0.6, 0, '#b9b6ae', {
        col: false,
      });
      k.plane(c.ROWT.alWin(), bw - 0.3, 1.45, cx, y + 1.6, -0.57, c.FRONT);
    }
  }
};
// 半圓拱窗（透明底，框色 hex）
const archTex = (c, hex = '#5a4030') =>
  c.sg(`sj4Arch${hex}`, 256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = hex;
    g.beginPath();
    g.moveTo(2, 126);
    g.arc(128, 126, 126, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillStyle = '#3d474f';
    g.beginPath();
    g.moveTo(16, 120);
    g.arc(128, 120, 110, Math.PI, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = hex;
    g.lineWidth = 6;
    for (const a of [0.25, 0.5, 0.75]) {
      g.beginPath();
      g.moveTo(128, 120);
      g.lineTo(128 + Math.cos(Math.PI * (1 + a)) * 112, 120 + Math.sin(Math.PI * (1 + a)) * 112);
      g.stroke();
    }
    g.beginPath();
    g.arc(128, 120, 44, Math.PI, 0);
    g.stroke();
  });
// 三角山牆加兩片斜瓦（山牆面在立面上，x0～x1，底 y，高 rise）
const gable = (k, c, x0, x1, y, rise, wall, tile, zf = -0.3, zb = 1.4) => {
  const n = 5,
    mid = (x0 + x1) / 2,
    half = (x1 - x0) / 2;
  for (let i = 0; i < n; i++) {
    const hw = half * (1 - (i + 0.5) / n);
    k.box(mid - hw, mid + hw, y + (rise * i) / n, y + (rise * (i + 1)) / n, zf + 0.15, zb, wall, {
      col: false,
    });
  }
  const L = Math.hypot(half, rise) + 0.35,
    a = Math.atan2(rise, half);
  for (const sd of [-1, 1]) {
    const g = new c.THREE.BoxGeometry(L, 0.14, zb - zf + 0.2);
    g.rotateZ(-sd * a);
    g.translate(mid + (sd * half) / 2, y + rise / 2 + 0.12, (zf + zb) / 2);
    k._part(c.VC, c.paintGeo(g, tile));
  }
};
// 外凸的鐵窗籠（x0～x1、y0～y1）
const cageBox = (k, x0, x1, y0, y1, hex, out = 0.6) => {
  for (const y of [y0, y1 - 0.06]) k.box(x0, x1, y, y + 0.06, -out, 0, hex, { col: false });
  for (let x = x0; x <= x1 - 0.02; x += 0.2)
    k.box(x, x + 0.03, y0, y1, -out, -out + 0.03, hex, { col: false });
  for (const x of [x0, x1 - 0.03])
    for (let z = 0.15; z < out; z += 0.2)
      k.box(x, x + 0.03, y0, y1, -z - 0.03, -z, hex, { col: false });
};

// ---- 各棟自己的貼圖與構件 ----
// 上大影印的橫招：白底，「上大」黑字，紅字「影印・裝釘・印刷」與電話
const shandaTex = (c) =>
  c.sg('sj4Shanda', 640, 160, (g) => {
    g.fillStyle = '#f6f6f2';
    g.fillRect(0, 0, 640, 160);
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillStyle = '#141414';
    g.font = c.font(84);
    g.fillText('上大', 14, 62);
    g.font = c.font(18, 700);
    g.fillText('SHAN DA', 44, 124);
    g.fillStyle = '#d42a1f';
    g.font = c.font(52);
    g.fillText('影印・裝釘・印刷', 206, 56);
    g.font = c.font(30, 700);
    g.fillText('TEL:03-4668080', 206, 122);
  });
// ReD Hair Studio 的橫招：白到淡紫漸層，R 紫、e 黃綠、D 藍
const redTex = (c) =>
  c.sg('sj4ReD', 768, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 768, 0);
    gr.addColorStop(0, '#f6f4f8');
    gr.addColorStop(1, '#e2d8ee');
    g.fillStyle = gr;
    g.fillRect(0, 0, 768, 160);
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = c.font(124);
    let x = 40;
    for (const [ch, col] of [
      ['R', '#7a4aa8'],
      ['e', '#a8c83a'],
      ['D', '#2f7fc8'],
    ]) {
      g.fillStyle = col;
      g.fillText(ch, x, 84);
      x += g.measureText(ch).width + 4;
    }
    g.fillStyle = '#3a3a44';
    g.font = 'italic 600 46px Georgia, serif';
    g.fillText('Hair Studio', 400, 54);
    g.font = c.font(46);
    g.fillText('芮德', 580, 114);
  });
// 三媽臭臭鍋的橫招：紅底黃字，右半邊五個黃色圓圈（圈裡的菜色小字不寫）
const sanmaTex = (c) =>
  c.sg('sj4Sanma', 1024, 112, (g) => {
    g.fillStyle = '#c8281e';
    g.fillRect(0, 0, 1024, 112);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f6d83a';
    g.font = c.font(84);
    g.fillText('三媽臭臭鍋', 250, 60);
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(560 + i * 96, 56, 42, 0, 7);
      g.fill();
    }
  });
// 全聯的標誌：白底、紅藍橫條、中間白圓圈
const pxLogo = (c) =>
  c.sg('sj4PxLogo', 256, 192, (g) => {
    g.fillStyle = '#232a9c';
    g.fillRect(0, 0, 256, 192);
    g.fillStyle = '#ffffff';
    g.fillRect(16, 16, 224, 160);
    g.fillStyle = '#e2231a';
    g.fillRect(16, 70, 224, 24);
    g.fillStyle = '#232a9c';
    g.fillRect(16, 100, 224, 24);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(128, 96, 62, 0, 7);
    g.fill();
    g.strokeStyle = '#e2231a';
    g.lineWidth = 10;
    g.beginPath();
    g.arc(128, 96, 50, 0, 7);
    g.stroke();
    g.strokeStyle = '#232a9c';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(128, 62);
    g.lineTo(158, 120);
    g.lineTo(98, 120);
    g.closePath();
    g.stroke();
  });
// 全聯招牌帶尾端的小字「中壢中原店」
const smallTex = (c) =>
  c.sg('sj4PxSmall', 320, 160, (g) => {
    g.fillStyle = '#232a9c';
    g.fillRect(0, 0, 320, 160);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = c.font(40);
    g.fillText('中壢中原店', 150, 96);
  });
// 生命美學的橫招：淡黃底暗紅字，左邊大字、右邊兩行小字
const lifeTex = (c) =>
  c.sg('sj4Life', 1024, 160, (g) => {
    g.fillStyle = '#efe27a';
    g.fillRect(0, 0, 1024, 160);
    g.fillStyle = '#8a1f2a';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = c.font(108);
    g.fillText('生命美學', 24, 84);
    g.font = c.font(52);
    g.fillText('量子經絡養生會館', 500, 48);
    g.font = c.font(40, 700);
    g.fillText('一個身心靈減壓的殿堂', 500, 116);
  });
// SYM 捷鎧車業行的橫招：紅底，左邊白色大字 SYM、中間店名、右邊白圓圈標誌
const symTex = (c) =>
  c.sg('sj4Sym', 1024, 160, (g) => {
    g.fillStyle = '#d81f36';
    g.fillRect(0, 0, 1024, 160);
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = 'italic 900 120px "Arial Black", Arial, sans-serif';
    g.fillText('SYM', 30, 86);
    g.font = c.font(46);
    g.fillText('捷鎧車業行', 500, 82);
    g.beginPath();
    g.arc(930, 80, 62, 0, 7);
    g.fill();
    g.fillStyle = '#d81f36';
    g.textAlign = 'center';
    g.font = 'italic 900 44px Arial, sans-serif';
    g.fillText('SYM', 930, 84);
  });
// SYM 的方形箱型招牌：白底、紅色圓形標誌
const symBox = (c) =>
  c.sg('sj4SymBox', 192, 192, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 192, 192);
    g.fillStyle = '#d81f36';
    g.beginPath();
    g.arc(96, 96, 80, 0, 7);
    g.fill();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = c.font(64);
    g.fillText('SYM', 96, 100);
  });
// 安全帽店橫招右端的藍色賽車騎士圖（只畫色塊，沒有字）
const riderTex = (c) =>
  c.sg('sj4Rider', 256, 144, (g) => {
    const gr = g.createLinearGradient(0, 0, 256, 144);
    gr.addColorStop(0, '#1f5fb0');
    gr.addColorStop(1, '#3fa0d8');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 144);
    g.fillStyle = '#d8d83a';
    g.beginPath();
    g.ellipse(120, 78, 70, 34, -0.35, 0, 7);
    g.fill();
    g.fillStyle = '#f2f2ee';
    g.beginPath();
    g.arc(170, 46, 22, 0, 7);
    g.fill();
    g.fillStyle = '#1c1c1e';
    g.beginPath();
    g.arc(70, 112, 22, 0, 7);
    g.arc(178, 108, 22, 0, 7);
    g.fill();
  });
// 粉紅公寓：每個開間一個外挑陽台（米白樓板加黑色細鐵欄杆）
const balcs = (k, c, n) => {
  for (let f = 1; f < c.nf; f++) {
    const y = c.gf + (f - 1) * c.fh;
    for (let j = 0; j < n; j++) {
      const cx = (c.w * (j + 0.5)) / n,
        bw = c.w / n - 0.9,
        x0 = cx - bw / 2,
        x1 = cx + bw / 2;
      k.box(x0, x1, y - 0.1, y + 0.5, -0.95, 0, '#d8cfc0', { col: false });
      k.box(x0, x1, y + 1.05, y + 1.1, -0.95, -0.9, '#2b2b2b', { col: false });
      for (let x = x0; x <= x1 - 0.02; x += 0.3)
        k.box(x, x + 0.03, y + 0.5, y + 1.05, -0.95, -0.92, '#2b2b2b', { col: false });
      for (const x of [x0, x1 - 0.03])
        k.box(x, x + 0.03, y + 0.5, y + 1.1, -0.95, 0, '#2b2b2b', { col: false });
    }
  }
};
// 粉紅公寓的前庭：米白與磚紅相間的方格地磚（從立面往街上 5.6 m）
const court = (k, c) => {
  k.box(0, c.w, 0.05, 0.065, -5.6, 0, '#e2d8c8', { col: false });
  const t = 0.8;
  for (let i = 0; i * t < c.w - 0.1; i++)
    for (let j = 0; j < 7; j++)
      if ((i + j + Math.round(c.w * 3)) % 2)
        k.box(i * t, Math.min(c.w, (i + 1) * t), 0.065, 0.075, -(j + 1) * t, -j * t, '#b06a58', {
          col: false,
        });
};
const W2 = { nf: 5, wall: '#a85a55', bal: 'plain', d: 14, set: 12, door: 0, roof: 'x' };
// 紅磚二樓店面的女兒牆：兩端階梯形磚柱頭、綠釉瓦壓頂；mid 是中間凸起的一塊磚砌山牆
const parapet = (k, c, mid) => {
  const wl = c.wallMat('#8a3a30');
  k.box(0, c.w, c.top + 0.12, c.top + 0.75, -0.04, 0.25, wl, { col: false });
  k.box(-0.03, c.w + 0.03, c.top + 0.75, c.top + 0.85, -0.1, 0.3, '#3f7a5a', { col: false });
  for (const x of [0, c.w - 0.5]) {
    k.box(x, x + 0.5, c.top + 0.12, c.top + 1.1, -0.06, 0.3, wl, { col: false });
    k.box(x - 0.03, x + 0.53, c.top + 1.1, c.top + 1.2, -0.1, 0.33, '#3f7a5a', { col: false });
  }
  if (mid) {
    k.box(c.w / 2 - 1.1, c.w / 2 + 1.1, c.top + 0.12, c.top + 1.3, -0.06, 0.3, wl, { col: false });
    k.box(c.w / 2 - 0.7, c.w / 2 + 0.7, c.top + 1.3, c.top + 1.6, -0.06, 0.3, wl, { col: false });
  }
};
// 11 巷的連棟透天：2 樓半圓拱窗，3 樓是外凸陽台（磁磚欄杆牆，陽台裡橘紅色天花）或外凸鐵窗籠
// o：wall 外牆色、arch 拱窗數、archCol 拱窗框色、top 'cage'（cage 籠子色）｜'none'｜預設陽台（rail 欄杆色）、gable 山牆紅瓦、setback 4 樓退縮、port 車棚頂的顏色、awn 門口平雨遮色
const rowHouse = (k, c, o = {}) => {
  const hex = o.wall || '#e4e2dc',
    wl = c.wallMat(hex),
    y3 = c.gf + c.fh;
  blank(k, c, 1, hex);
  blank(k, c, 2, hex);
  const n = o.arch || 1;
  for (let j = 0; j < n; j++)
    k.plane(
      archTex(c, o.archCol),
      Math.min(2.3, c.w / n - 0.8),
      1.25,
      (c.w * (j + 0.5)) / n,
      c.gf + 1.25,
      -0.09,
      c.FRONT,
      { transparent: true }
    );
  if (o.top === 'cage') {
    k.plane(c.ROWT.alWin(), c.w - 1.6, 1.4, c.w / 2, y3 + 1.45, -0.09, c.FRONT);
    cageBox(k, 0.6, c.w - 0.6, y3 + 0.5, y3 + 2.4, o.cage || '#e8e8e4');
  } else if (o.top !== 'none') {
    k.box(0.35, c.w - 0.35, y3 + 0.9, y3 + 2.3, -0.09, -0.07, '#3a3f44', { col: false }); // 陽台裡的陰影
    k.box(0.35, c.w - 0.35, y3 + 2.3, y3 + 2.6, -0.1, -0.07, '#c8553a', { col: false }); // 橘紅色的陽台天花
    k.box(0.25, c.w - 0.25, y3 - 0.1, y3 + 0.85, -0.8, 0, wl, { col: false }); // 外凸的磁磚欄杆牆
    k.box(0.25, c.w - 0.25, y3 + 0.85, y3 + 1.05, -0.8, -0.76, o.rail || '#3f7a5a', { col: false });
  }
  if (o.gable) gable(k, c, 0.05, c.w - 0.05, c.top + 0.12, 1.3, wl, '#b5523a');
  if (o.setback) {
    k.box(0.15, c.w - 0.15, c.top + 0.12, c.top + 2.8, 2.2, c.d, wl, { col: false });
    k.plane(c.ROWT.alWin(), c.w - 1.6, 1.2, c.w / 2, c.top + 1.6, 2.17, c.FRONT);
    k.box(0.1, c.w - 0.1, c.top + 2.8, c.top + 2.92, 2.1, c.d, '#9a9892', { col: false });
  }
  if (o.port) {
    k.box(-0.02, c.w + 0.02, 2.5, 2.62, -2.9, 0, o.port, { col: false });
    for (const x of [0.08, c.w - 0.18])
      k.box(x, x + 0.1, 0, 2.5, -2.9, -2.8, '#b9bcbe', { col: false });
  }
  if (o.awn) k.box(0.1, c.w - 0.1, c.gf - 0.95, c.gf - 0.8, -1.0, 0, o.awn, { col: false });
};
const RH = {
  nf: 3,
  wall: '#e4e2dc',
  ground: 'gate',
  bal: 'plain',
  d: 6,
  set: 4.6,
  door: 0,
  noband: true,
  roof: 'x',
};

// 鼎藏中原匯的工地圍籬（這一格的殼就是 0.7 m 高的混凝土護欄底座）：上面 2.2 m 高的白色鋼板，浪板與印刷板交錯，
// s 495.5～505 是透空的鋼架加鐵絲網，頂端一圈往街上斜挑的鍍鋅防護棚（紅色警示燈）；圍籬後面是搭鷹架、包藍色防護網的興建中結構體
const siteFence = (k, c) => {
  const W = c.w,
    y0 = c.top,
    y1 = y0 + 2.2,
    bay = 2.4,
    S1 = 541,
    xm = S1 - 505; // x = 541 − s；x > xm 是透空段
  const corr = c.sg('sj4Corr', 128, 64, (g) => {
    g.fillStyle = '#e4e4e0';
    g.fillRect(0, 0, 128, 64);
    for (let x = 0; x < 128; x += 8) {
      g.fillStyle = 'rgba(0,0,0,.14)';
      g.fillRect(x, 0, 2, 64);
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillRect(x + 4, 0, 2, 64);
    }
  });
  const mesh = c.sg('sj4Mesh', 128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(150,156,160,.85)';
    g.lineWidth = 1;
    for (let i = 0; i <= 128; i += 8) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 128);
      g.moveTo(0, i);
      g.lineTo(128, i);
      g.stroke();
    }
    g.lineWidth = 6;
    g.strokeRect(0, 0, 128, 128);
    g.beginPath();
    g.moveTo(0, 64);
    g.lineTo(128, 64);
    g.stroke();
  });
  const mural = c.sg('sj4Mural', 1024, 272, (g) => {
    // 灰綠色的建築線稿加白字
    const gr = g.createLinearGradient(0, 0, 0, 272);
    gr.addColorStop(0, '#a9aea4');
    gr.addColorStop(1, '#8f9a8c');
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 272);
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 110;
      g.rect(x, 50 + (i % 3) * 22, 74, 110 - (i % 3) * 22);
    }
    g.moveTo(0, 160);
    g.lineTo(1024, 160);
    g.moveTo(0, 176);
    g.quadraticCurveTo(512, 120, 1024, 176);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = c.font(52);
    g.fillText('打造中原新商圈　締創城市永恆新頁', 512, 222);
  });
  k.box(0, xm, y0, y1, 0.06, 0.14, '#e4e4e0'); // 鋼板本體
  for (let x = 0; x < xm - 0.01; x += bay)
    k.plane(corr, bay, y1 - y0, x + bay / 2, (y0 + y1) / 2, 0.05, c.FRONT);
  for (const [sa, sb] of [
    [506.5, 515],
    [517.4, 525.9],
    [530.6, 539.1],
  ])
    k.plane(mural, sb - sa, y1 - y0 - 0.1, S1 - (sa + sb) / 2, (y0 + y1) / 2, 0.03, c.FRONT);
  for (let x = xm; x < W - 0.01; x += bay) {
    // 透空的鋼架與鐵絲網
    const x1 = Math.min(W, x + bay);
    k.plane(mesh, x1 - x, y1 - y0, (x + x1) / 2, (y0 + y1) / 2, 0.1, c.FRONT, {
      transparent: true,
      double: true,
    });
    k.box(x, x1, y1 - 0.06, y1, 0.06, 0.14, '#8d9196', { col: false });
  }
  for (let x = 0; x <= W + 0.01; x += bay)
    k.box(
      Math.min(W - 0.08, x),
      Math.min(W - 0.08, x) + 0.08,
      y0,
      y1 + 0.5,
      0.14,
      0.22,
      '#8d9196',
      { col: false }
    ); // 立柱
  slab(k, c, 0, W, 0.2, y1 + 0.02, -0.55, y1 + 0.34, '#d4d7d9', 0.04); // 往街上斜挑的防護棚
  for (let x = 1.2; x < W; x += 4.8)
    k.box(x - 0.07, x + 0.07, y1 + 0.36, y1 + 0.5, -0.6, -0.48, '#d8262c', { col: false });
  // 興建中的結構體（s 514～540，退在圍籬後面 3.5 m；s 495～512 那一塊是 src/world/buildings/StreetDaren1.js 的空地，不碰）
  const X0 = 1,
    X1 = 27,
    Z0 = 3.6,
    Z1 = 17,
    TH = 15.5;
  k.box(X0 + 0.7, X1 - 0.7, 0, TH, Z0 + 0.7, Z1 - 0.7, '#b9b6ae');
  for (let f = 0; f < 5; f++)
    k.box(X0 + 0.68, X1 - 0.68, f * 3.1 + 0.5, f * 3.1 + 2.7, Z0 + 0.68, Z1 - 0.68, '#77756f', {
      col: false,
    });
  k.box(X0 + 0.5, X1 - 0.5, TH, TH + 0.9, Z0 + 0.5, Z1 - 0.5, '#b08a5a', { col: false }); // 最上層的木模板
  const net = c.sg('sj4Net', 256, 256, (g) => {
    // 藍色防護網加鷹架
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(44,112,190,.64)';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(210,214,218,.55)';
    g.lineWidth = 2;
    for (let i = 0; i < 256; i += 64)
      for (let j = 0; j < 256; j += 64) {
        g.beginPath();
        g.moveTo(i, j);
        g.lineTo(i + 64, j + 64);
        g.moveTo(i + 64, j);
        g.lineTo(i, j + 64);
        g.stroke();
      }
    g.strokeStyle = 'rgba(225,228,230,.8)';
    g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
    g.fillStyle = 'rgba(20,60,130,.35)';
    for (let j = 0; j < 256; j += 64) g.fillRect(0, j + 4, 256, 10);
  });
  const face = (len, f) => {
    const n = Math.max(1, Math.round(len / 6.5)),
      pw = len / n;
    for (let j = 0; j < n; j++)
      for (let r = 0; r < 2; r++) f((j + 0.5) * pw, pw, (TH * (r + 0.5)) / 2);
  };
  face(X1 - X0, (u, pw, y) => {
    k.plane(net, pw, TH / 2, X0 + u, y, Z0, c.FRONT, { transparent: true, double: true });
    k.plane(net, pw, TH / 2, X0 + u, y, Z1, 0, { transparent: true, double: true });
  });
  face(Z1 - Z0, (u, pw, y) => {
    k.plane(net, pw, TH / 2, X0, y, Z0 + u, -H, { transparent: true, double: true });
    k.plane(net, pw, TH / 2, X1, y, Z0 + u, H, { transparent: true, double: true });
  });
  for (const z of [Z0, Z1 - 0.05]) {
    for (const y of [TH + 0.9, TH + 1.8])
      k.box(X0, X1, y, y + 0.05, z, z + 0.05, '#b9bcbe', { col: false });
    for (let x = X0; x <= X1; x += 1.8)
      k.box(x, x + 0.05, TH, TH + 1.8, z, z + 0.05, '#b9bcbe', { col: false });
  }
};

export default {
  ownSign: ['蝦皮店到店', '全聯福利中心', '三媽臭臭鍋', '夢紋創'],
  drop: [
    'f1589',
    'f1590',
    'f1591',
    'f1592',
    'f1292',
    'f1293',
    'f1294',
    'f1295',
    'f1296',
    'f1297',
    'f1298',
    'f1299',
    'f1300',
    'f1301',
    'f1302',
    'f1303',
    'f1304',
    'f1305',
    'f1306',
    'f1307',
    'f1308',
    'f1309',
    'f1310',
    'f1311',
    'f1312',
  ],
  fences: [],
  lots: [
    // ================= 左側（-1，東北側）=================
    // Phở Wild：5 樓灰色小口磚窄樓，騎樓敞開，白底深藍字橫招，右上角圓形側招，3 樓以上黑鐵欄杆小陽台
    [
      'S',
      450,
      454.3,
      -1,
      {
        nf: 5,
        wall: '#8f8f8c',
        ground: 'open',
        bal: 'plain',
        d: 10,
        set: 6.5,
        door: 0,
        bikes: 3,
        roof: 'x',
        sign: ['Phở Wild', '#f4f4f2', '#2b2f6b', '越式生牛肉河粉'],
        extra: (k, c) => {
          for (let f = 2; f < c.nf; f++)
            rail(k, 1.2, c.w - 1.2, c.gf + (f - 1) * c.fh, '#2b2b2b', 0.6);
          hang(
            k,
            c,
            disc(c, 'Phở Wild', '#ffffff', '#2b2f6b', '#2b2f6b'),
            1.5,
            1.5,
            0.3,
            c.gf + 2.2,
            1.1,
            { transparent: true }
          );
          k.box(0.2, 0.95, 0, c.gf - 1.0, -0.12, 0, '#f0efea', { col: false }); // 右側的白色方柱
        },
      },
    ],
    // 上大影印：5 樓咖啡灰磁磚，每層一整排橫窗，灰鐵捲門，白底橫招，3～5 樓左緣藍底白字直立招牌
    [
      'S',
      454.3,
      459.6,
      -1,
      {
        nf: 5,
        wall: '#8a6f5e',
        ground: 'shutter',
        sh: '#9a9c9e',
        bal: 'plain',
        d: 10,
        set: 6.5,
        door: 0,
        bikes: 4,
        noband: true,
        roof: 'x',
        extra: (k, c) => {
          bigBand(k, c, shandaTex(c), '#f6f6f2', 1.35);
          hang(
            k,
            c,
            c.ROWT.vert('sj4上大', '#2a56b0', '#ffffff', '上大專業影印輸出'),
            0.8,
            6.4,
            c.w - 0.2,
            c.gf + c.fh + 3.6,
            0.8
          );
          for (const x of [0.1, c.w - 0.6])
            k.box(x, x + 0.5, 0, c.gf - 1.0, -0.12, 0, '#eeeeea', { col: false }); // 騎樓的白磁磚方柱
        },
      },
    ],
    // 暗紅磁磚樓：左邊是住戶的古銅框玻璃門，右邊 7 m 是蝦皮店到店（橘紅底白字橫招與直立箱型側招）
    [
      'S',
      459.6,
      468.9,
      -1,
      {
        nf: 5,
        wall: '#8c3a36',
        ground: 'shop',
        bal: 'plain',
        d: 10,
        set: 6.5,
        door: 0,
        bikes: 5,
        noband: true,
        roof: 'tank',
        extra: (k, c) => {
          const sw = 6.3;
          k.box(0.35, 0.35 + sw, c.gf - 0.95, c.gf + 0.15, -0.3, 0, '#ee4d2d', { col: false });
          flat(
            k,
            c,
            c.paint('蝦皮店到店', '#ee4d2d', '#ffffff', null, sw - 0.1, 1.0),
            sw - 0.1,
            1.0,
            0.35 + sw / 2,
            c.gf - 0.4,
            -0.31,
            0.35
          );
          hang(
            k,
            c,
            c.ROWT.vert('sj4蝦皮', '#ee4d2d', '#ffffff', '蝦皮店到店'),
            0.8,
            4.0,
            4.4,
            c.gf + 2.9,
            0.8
          );
          k.box(7.0, c.w - 0.12, 0, c.gf - 0.2, -0.08, 0, c.wallMat('#8c3a36'), { col: false }); // 住戶入口那一段是磚牆
          k.box(7.3, 9.0, 0, 2.5, -0.1, 0, '#6a5038', { col: false });
          k.plane(c.YHT.win(), 1.5, 2.3, 8.15, 1.2, -0.11, c.FRONT); // 古銅框玻璃門
          k.box(9.05, 9.55, 0, 2.2, -0.1, 0, '#b9bcbe', { col: false }); // 不鏽鋼樓梯門
          k.box(0.6, 1.0, 0, 1.3, -1.6, -1.5, '#f4f2ee', { col: false });
          k.box(0.62, 0.98, 0.5, 1.25, -1.62, -1.6, '#d8262c', { col: false }); // 門邊的紅白立牌
        },
      },
    ],
    // 全聯福利中心：樓房本體是 src/world/buildings/StreetDaren1.js 的白色大樓，這裡只貼面實踐路的正立面（0.5 m 厚）：
    // 一樓玻璃店面、整條寶藍色招牌帶（PX MART、標誌、全聯福利中心、中壢中原店）、2 樓整排淺綠色玻璃、3 樓以上小窗加綠色遮陽篷
    [
      'S',
      468.9,
      483.9,
      -1,
      {
        nf: 1,
        gf: 3.6,
        d: 0.5,
        set: 5.65,
        wall: '#d9d9d4',
        ground: 'shop',
        door: 0,
        noband: true,
        roofCol: '#232a9c',
        bikes: 6,
        extra: (k, c) => {
          const T = 21.3,
            wl = c.wallMat('#d9d9d4'),
            B = '#232a9c',
            yb = c.gf - 1.15;
          k.box(0, c.w, c.top, T, 0, c.d, wl, { col: false, tile: [0.6, 0.6] });
          k.box(-0.03, c.w + 0.03, T, T + 0.12, -0.05, c.d, '#9a9892', { col: false });
          k.box(-0.3, c.w, yb, c.gf + 0.05, -0.3, 0, B, { col: false });
          k.box(-0.3, 0, yb, c.gf + 0.05, 0, 0.7, B, { col: false }); // 招牌帶，繞到大仁一街那一面
          let bx = c.w; // 四塊貼圖首尾相接鋪滿整條（由左到右）
          for (const [tex, bw] of [
            [c.paint('PX MART', B, '#ffffff', null, 4.6, 1.2), 4.6],
            [pxLogo(c), 1.6],
            [c.paint('全聯福利中心', B, '#ffffff', null, 6.4, 1.2), 6.4],
            [smallTex(c), 2.4],
          ]) {
            flat(k, c, tex, bw, 1.2, bx - bw / 2, yb + 0.6, -0.31, 0.35);
            bx -= bw;
          }
          flat(
            k,
            c,
            c.paint(' ', '#f2d21f', '#f2d21f', null, 5.0, 0.42),
            5.0,
            0.42,
            11.7,
            yb - 0.24,
            -0.12,
            0.3
          ); // 黃色促銷布條（字看不清楚，不寫）
          const y2 = c.gf + 0.45; // 2 樓整排淺綠色玻璃
          k.box(0.4, c.w - 0.4, y2, y2 + 1.9, -0.06, 0, '#9fc9b8', { col: false });
          for (let x = 0.4; x <= c.w - 0.39; x += (c.w - 0.8) / 9)
            k.box(x - 0.04, x + 0.04, y2, y2 + 1.9, -0.09, 0, '#eef0ee', { col: false });
          for (let f = 0; f < 5; f++) {
            // 3 樓以上：小窗加綠色遮陽篷
            const y = 6.3 + f * 3.0;
            for (let j = 0; j < 6; j++) {
              const x = (c.w * (j + 0.5)) / 6;
              k.plane(c.ROWT.alWin(), 1.3, 1.3, x, y + 1.5, -0.03, c.FRONT);
              slab(k, c, x - 0.8, x + 0.8, -0.6, y + 2.15, 0, y + 2.5, '#3aa76a');
            }
          }
          for (let j = 0; j < 7; j++)
            k.box(2.2 + j * 0.28, 2.42 + j * 0.28, 0.3, 1.0, -1.5, -0.6, '#b9bcc0', { col: false }); // 門口的一排購物推車
        },
      },
    ],
    // （487.0～494.6 大仁一街口）
    // 工地圍籬（見上面 siteFence）
    [
      'S',
      495.5,
      541,
      -1,
      {
        nf: 1,
        gf: 0.7,
        d: 0.3,
        set: 5.6,
        wall: 'grime',
        ground: 'shutter',
        door: 0,
        noband: true,
        roofCol: '#a9a7a0',
        bikes: 1,
        extra: siteFence,
      },
    ],

    // ================= 右側（+1，西南側）=================
    // ReD Hair Studio 芮德：6 樓灰白小方磚窄樓，每層兩組凸窗，灰鐵捲門加小鋁門，白到淡紫的橫招，右端圓形側招
    [
      'S',
      447,
      454.4,
      1,
      {
        nf: 6,
        wall: '#cfcfca',
        ground: 'shutter',
        sh: '#8d8f92',
        bal: 'plain',
        d: 12,
        set: 7.0,
        door: 0,
        bikes: 6,
        noband: true,
        roof: 'x',
        extra: (k, c) => {
          for (let f = 1; f < c.nf; f++) blank(k, c, f, '#cfcfca');
          bays(k, c, '#cfcfca', 2, 2);
          bigBand(k, c, redTex(c), '#ece6f2', 1.5);
          hang(
            k,
            c,
            disc(c, 'ReD', '#ffffff', '#d8cfe6', '#7a4aa8'),
            1.0,
            1.0,
            0.25,
            c.gf + 1.0,
            0.8,
            { transparent: true }
          );
          for (const x of [0, c.w - 0.8])
            k.box(x, x + 0.8, 0, c.gf - 0.95, -0.15, 0, '#f0f0ee', { col: false }); // 兩側的白色方柱
          k.box(0.85, 1.9, 0, c.gf - 0.95, -0.06, 0, '#d9d9d6', { col: false });
          k.plane(c.ROWT.alWin(), 0.85, 2.1, 1.38, 1.08, -0.07, c.FRONT); // 鐵捲門右邊的小鋁門
        },
      },
    ],
    // 5 樓粉紅磁磚公寓（整棟退縮，前面是方格地磚前庭）：三媽臭臭鍋（綠框玻璃店面）、煌貿印刷（鐵捲門）、住戶樓梯入口
    [
      'S',
      454.4,
      463.8,
      1,
      {
        ...W2,
        ground: 'shop',
        noband: true,
        extra: (k, c) => {
          balcs(k, c, 3);
          court(k, c);
          for (let x = 0.1; x <= c.w - 0.2; x += (c.w - 0.3) / 5)
            k.box(x, x + 0.12, 0, c.gf - 0.95, -0.1, 0, '#2f8f6a', { col: false }); // 綠色窗框
          k.box(0.1, c.w - 0.1, 0, 0.35, -0.1, 0, '#2f8f6a', { col: false });
          k.box(0.1, c.w - 0.1, c.gf - 1.2, c.gf - 0.95, -0.1, 0, '#2f8f6a', { col: false });
          bigBand(k, c, sanmaTex(c), '#c8281e', 1.0);
          k.box(c.w - 3.2, c.w - 2.0, 0.07, 0.09, -4.5, 0, '#c8343a', { col: false }); // 門口的紅地毯
          for (const x of [1.0, 5.2]) {
            k.box(x, x + 2.0, 0, 0.5, -5.3, -4.5, 'wall#d8cfc0');
            k.box(x + 0.15, x + 1.85, 0.5, 0.95, -5.15, -4.65, '#4f8a48', { col: false });
          } // 磁磚花台
        },
      },
    ],
    [
      'S',
      463.8,
      469.2,
      1,
      {
        ...W2,
        ground: 'shutter',
        sh: '#c4c6c8',
        sign: ['煌貿印刷', '#46a7a0', '#1f2a2a'],
        extra: (k, c) => {
          balcs(k, c, 2);
          court(k, c);
          k.box(4.1, 4.25, 0, 4.4, -7.5, -7.35, '#6f7478', { col: false });
          k.box(4.1, 4.2, 3.5, 4.1, -7.3, -6.3, '#1c1c1e', { col: false }); // 路邊電線桿上的黑底 LED 字幕機（字不寫）
        },
      },
    ],
    [
      'S',
      469.2,
      473.3,
      1,
      {
        ...W2,
        ground: 'gate',
        noband: true,
        extra: (k, c) => {
          balcs(k, c, 1);
          court(k, c);
          k.box(0.3, c.w - 0.3, c.gf - 1.0, c.gf - 0.9, -1.1, 0, '#4a8a5a', { col: false }); // 入口上方的綠色平雨遮
        },
      },
    ],
    // 3 樓白磁磚透天（退縮）：2 樓大拱窗與小拱形鐵窗，3 樓內凹陽台，三角山牆鋪橘紅瓦，屋頂鐵皮加蓋；前面是灰色平頂鐵皮車棚
    [
      'S',
      473.5,
      482.6,
      1,
      {
        nf: 3,
        wall: '#e4e2dc',
        ground: 'gate',
        bal: 'plain',
        d: 9,
        set: 11.7,
        door: 0,
        noband: true,
        roof: 'shack',
        extra: (k, c) => {
          const wl = c.wallMat('#e4e2dc'),
            y3 = c.gf + c.fh;
          blank(k, c, 1, '#e4e2dc');
          blank(k, c, 2, '#e4e2dc');
          k.plane(archTex(c), 2.7, 1.45, c.w * 0.36, c.gf + 1.25, -0.09, c.FRONT, {
            transparent: true,
          });
          k.plane(archTex(c, '#77777a'), 1.0, 1.1, c.w * 0.8, c.gf + 1.3, -0.09, c.FRONT, {
            transparent: true,
          });
          k.box(0.5, c.w - 0.5, y3 + 0.9, y3 + 2.5, -0.09, -0.07, '#3a3f44', { col: false }); // 內凹陽台的陰影
          k.box(0.3, c.w - 0.3, y3 - 0.05, y3 + 0.95, -0.5, 0, wl, { col: false }); // 磁磚欄杆牆
          for (const x of [c.w * 0.36, c.w * 0.64])
            k.box(x - 0.12, x + 0.12, y3 + 0.95, y3 + 2.5, -0.3, -0.05, '#e8e6e0', { col: false });
          gable(k, c, 1.2, c.w - 1.2, c.top + 0.12, 1.6, wl, '#b5523a');
          k.box(-0.2, c.w + 0.2, 2.75, 2.87, -5.2, 0, '#a8a8a4', { col: false }); // 車棚
          for (const x of [0.05, c.w / 2, c.w - 0.15])
            k.box(x, x + 0.1, 0, 2.75, -5.15, -5.05, '#8d9196', { col: false });
          k.box(c.w * 0.5, c.w, 0, 0.45, -5.15, -5.0, 'wall#d8d6cf'); // 矮牆加不鏽鋼欄杆
          k.box(c.w * 0.5, c.w, 1.15, 1.2, -5.1, -5.05, '#c4c7c9', { col: false });
          for (let x = c.w * 0.5; x <= c.w; x += 0.25)
            k.box(x, x + 0.03, 0.45, 1.15, -5.1, -5.07, '#c4c7c9', { col: false });
        },
      },
    ],
    // 3 樓米褐色磚的 11 巷口轉角樓（比隔壁凸出 5 m，露出來的西北山牆包灰色浪板）：整面白色木作店面、半透明採光罩雨棚、4 樓退縮的灰綠鐵皮加蓋。
    // 店名被雨棚擋住看不清楚（POI「食搞玩」跟現場對不上），不放店名；東南角 3 樓高有一塊黃底紅字「套房出租」
    [
      'S',
      482.6,
      491.4,
      1,
      {
        nf: 3,
        wall: '#a8835f',
        ground: 'shop',
        bal: 'plain',
        d: 10,
        set: 6.4,
        door: 0,
        noband: true,
        roof: 'x',
        extra: (k, c) => {
          for (const f of [1, 2]) {
            blank(k, c, f, '#a8835f');
            const y = c.gf + (f - 1) * c.fh;
            for (const x of [c.w * 0.25, c.w * 0.75]) {
              k.box(x - 0.95, x + 0.95, y + 0.85, y + 2.35, -0.1, 0, '#f2f2ee', { col: false });
              k.plane(c.ROWT.alWin(), 1.7, 1.3, x, y + 1.6, -0.11, c.FRONT);
            }
            c.ac(k, c.w * 0.5 - 0.4, y + 0.3);
          }
          bands(k, c, '#b9b3a6', 0.25);
          k.box(0.05, c.w - 0.05, c.gf - 0.95, c.gf - 0.2, -0.1, 0, '#f0efec', { col: false }); // 白色木作門楣與框
          for (const x of [0.05, c.w * 0.42, c.w - 0.45])
            k.box(x, x + 0.4, 0, c.gf - 0.95, -0.1, 0, '#f0efec', { col: false });
          k.box(c.w * 0.42, c.w - 0.05, 0, 0.9, -0.1, 0, '#f0efec', { col: false });
          slab(k, c, -0.1, c.w + 0.1, -1.5, c.gf - 0.8, 0, c.gf - 0.2, '#dcdedf', 0.05);
          k.box(-0.07, 0, 0, c.top, 0, c.d, '#9a9c9a', { col: false });
          k.box(0.3, c.w - 0.3, c.top + 0.12, c.top + 2.4, 3, c.d - 0.3, '#9aa39a', { col: false });
          slab(k, c, 0.1, c.w - 0.1, 2.6, c.top + 2.4, c.d, c.top + 2.8, '#8f9690', 0.08);
          hang(
            k,
            c,
            c.ROWT.vert('sj4套房出租', '#f2d21f', '#c8242b', '套房出租'),
            0.6,
            2.4,
            c.w - 0.15,
            c.gf + c.fh + 1.3,
            0.6
          );
          k.box(0.3, c.w * 0.5, 0.05, 0.2, -1.6, 0, '#5a4636', { col: false }); // 門口的木平台
          k.cyl(0.9, -1.0, 0.22, 0.2, 0.6, '#f2f2ee', { seg: 8 });
          k.cyl(0.9, -1.0, 0.04, 0.6, 1.3, '#6a4a30', { seg: 5 });
          k.box(0.6, 1.2, 1.2, 1.8, -1.3, -0.7, '#3f7a3a', { col: false }); // 琴葉榕盆栽
        },
      },
    ],
    // （491.5～495.6 實踐路11巷口）
    // 生命美學：3 樓白磁磚，淡黃底暗紅字橫招，下面一條紅雨遮；右邊玻璃店面、左邊灰鐵捲門與鐵窗
    [
      'S',
      496.6,
      504.2,
      1,
      {
        nf: 3,
        wall: '#e6e6e2',
        ground: 'shop',
        bal: 'grille',
        d: 9,
        set: 6.0,
        door: 0,
        awn: '#c8323a',
        roof: 'shack',
        noband: true,
        extra: (k, c) => {
          bigBand(k, c, lifeTex(c), '#efe27a', 1.2);
          k.box(c.w - 4.0, c.w - 0.15, 0, c.gf - 1.0, -0.06, 0, c.wallMat('#e6e6e2'), {
            col: false,
          });
          k.plane(
            c.shutterTex('#9a9c9e'),
            2.0,
            c.gf - 1.2,
            c.w - 2.8,
            (c.gf - 1.2) / 2,
            -0.07,
            c.FRONT
          );
          k.plane(c.YHT.win(), 1.2, 1.4, c.w - 0.95, 1.6, -0.07, c.FRONT);
        },
      },
    ],
    // SYM 捷鎧車業行：3 樓淺粉紅磁磚，一樓整面敞開的機車行，紅底白字橫招，左側 2～3 樓凸出的方形箱型招牌，4 樓淺綠灰鐵皮加蓋
    [
      'S',
      504.2,
      511.4,
      1,
      {
        nf: 3,
        wall: '#c9a6a0',
        ground: 'open',
        bal: 'grille',
        d: 12,
        set: 6.0,
        door: 0,
        bikes: 6,
        awn: '#8f9290',
        roof: 'x',
        noband: true,
        extra: (k, c) => {
          bigBand(k, c, symTex(c), '#d81f36', 1.2);
          k.box(0.6, 3.8, c.gf - 1.8, c.gf - 1.25, -0.5, -0.46, '#2f6fc0', { col: false }); // 藍色促銷布條（字不寫）
          hang(k, c, symBox(c), 1.6, 1.6, c.w - 0.15, c.gf + 2.6, 1.0);
          k.box(0.2, c.w - 0.2, c.top + 0.12, c.top + 2.5, 1.0, c.d - 0.5, '#9fb0a0', {
            col: false,
          });
          k.box(0, c.w, c.top + 2.5, c.top + 2.6, 0.6, c.d, '#8f9a90', { col: false });
        },
      },
    ],
    // 生鏽浪板頂的機車棚（SYM 的修車區）
    [
      'S',
      511.4,
      514.6,
      1,
      {
        nf: 1,
        gf: 3.0,
        d: 8,
        set: 6.0,
        wall: '#8a8f8c',
        ground: 'open',
        door: 0,
        noband: true,
        roofCol: '#8a8f8c',
        bikes: 2,
      },
    ],
    // 2 樓紅磚店面：整面米灰色大鐵捲門，2 樓到女兒牆掛黃底紅字大帆布「租 整棟透店」（帆布下半的房仲姓名、照片、電話是個資，不放）
    [
      'S',
      514.6,
      520,
      1,
      {
        nf: 2,
        wall: '#8a3a30',
        ground: 'shutter',
        sh: '#a39a8c',
        bal: 'grille',
        d: 10,
        set: 6.5,
        door: 0,
        noband: true,
        roof: 'x',
        extra: (k, c) => {
          parapet(k, c);
          flat(
            k,
            c,
            c.paint('租\n整棟\n透店', '#f2d21f', '#d8262c', null, 2.8, 3.4, 64),
            2.8,
            3.4,
            c.w * 0.52,
            c.gf + 2.0,
            -0.2,
            0.15
          );
        },
      },
    ],
    // DREAMCATCHER 夢紋創：同一排紅磚樓，一樓到 2 樓窗台包黑色浪板，黑框深色玻璃門窗，女兒牆中間凸起一塊磚砌山牆
    [
      'S',
      520,
      525.2,
      1,
      {
        nf: 2,
        wall: '#8a3a30',
        low: '#2b2b2d',
        ground: 'gate',
        sh: '#2b2b2d',
        bal: 'grille',
        d: 10,
        set: 6.5,
        door: 0,
        roof: 'x',
        sign: ['DREAMCATCHER 夢紋創', '#2b2b2d', '#ffffff', 'tattoo studio'],
        extra: (k, c) => {
          parapet(k, c, true);
          k.box(0, c.w, c.gf, c.gf + 0.9, -0.06, 0, '#2b2b2d', { col: false });
          for (let j = 0; j < 3; j++)
            k.box(
              0.5 + j * 0.5,
              0.9 + j * 0.5,
              0,
              0.9,
              -1.5 - j * 0.1,
              -1.45 - j * 0.1,
              '#f4f2ee',
              { col: false }
            ); // 門邊的白色立牌
        },
      },
    ],
    // 4 樓深紅褐磚的環中東路口轉角樓：泥沙（櫃檯窗口）、安全帽雨衣店（整面玻璃，銀灰橫招繞過轉角；環中東路那面 2～4 樓掛青綠色大看板）
    [
      'S',
      525.2,
      527.4,
      1,
      {
        nf: 4,
        wall: '#7a4636',
        ground: 'stall',
        bal: 'plain',
        d: 10,
        set: 6.5,
        door: 0,
        sign: ['泥沙', '#f2f0e8', '#3a3a3a'],
        awn: '#e6dcc4',
        roof: 'x',
      },
    ],
    [
      'S',
      527.4,
      536.5,
      1,
      {
        nf: 4,
        wall: '#7a4636',
        ground: 'shop',
        bal: 'plain',
        d: 10,
        set: 6.5,
        door: 0,
        noband: true,
        roof: 'tank',
        bikes: 2,
        extra: (k, c) => {
          const hgt = 1.5,
            y = c.gf - 0.95,
            G = '#c4c6c8';
          k.box(0.05, c.w + 0.3, y, y + hgt, -0.3, 0, G, { col: false });
          k.box(c.w, c.w + 0.3, y, y + hgt, 0, 8.2, G, { col: false });
          flat(k, c, riderTex(c), 2.5, hgt - 0.1, 1.4, y + hgt / 2, -0.31, 0.3);
          flat(
            k,
            c,
            c.paint('安全帽 雨衣', G, '#7ac143', null, c.w - 2.9, hgt - 0.1),
            c.w - 2.9,
            hgt - 0.1,
            2.75 + (c.w - 2.9) / 2,
            y + hgt / 2,
            -0.31,
            0.35
          );
          k.plane(
            c.paint('安全帽 雨衣', G, '#7ac143', null, 5.0, hgt - 0.1),
            5.0,
            hgt - 0.1,
            c.w + 0.31,
            y + hgt / 2,
            2.7,
            H,
            { emissive: 0.35 }
          );
          k.plane(riderTex(c), 2.6, hgt - 0.1, c.w + 0.31, y + hgt / 2, 6.7, H, { emissive: 0.3 });
          k.plane(c.YHT.win(), 7.6, c.gf - 1.2, c.w + 0.05, (c.gf - 1.0) / 2, 4.2, H, {
            emissive: 0.3,
          }); // 環中東路那面的玻璃
          k.box(-0.05, c.w + 1.2, y - 0.12, y - 0.02, -1.2, 0, '#eeeeea', { col: false });
          k.box(c.w, c.w + 1.2, y - 0.12, y - 0.02, 0, 8.5, '#eeeeea', { col: false }); // 招牌下的白色平雨遮
          k.plane(
            c.paint('嘉賀廣告', '#2e7f86', '#ffffff', null, 5.6, 4.4, 64),
            5.6,
            4.4,
            c.w + 0.1,
            c.gf + 0.9 + 2.2,
            5.6,
            H,
            { emissive: 0.15 }
          ); // 青綠色大看板（手機號碼不放）
          k.box(c.w / 2 - 0.15, c.w / 2 + 0.15, 0, y, -0.12, 0, '#1c1c1e', { col: false }); // 中間的黑柱
          k.box(1.0, c.w - 3.0, c.top + 0.12, c.top + 2.6, 3, c.d - 1, c.wallMat('#7a4636'), {
            col: false,
          }); // 屋突
          for (let yy = c.gf + 0.3; yy < c.top; yy += 0.4)
            k.box(0.5, 0.95, yy, yy + 0.04, -0.3, -0.26, '#3a3a3c', { col: false }); // 外牆的鐵爬梯
          for (const x of [0.5, 0.92])
            k.box(x, x + 0.03, c.gf + 0.2, c.top, -0.3, -0.26, '#3a3a3c', { col: false });
        },
      },
    ],
    // （536.5 以後是轉角人行道與環中東路）

    // ================= 實踐路11巷（L11，2022-08 街景；兩側都是住家，沒有招牌）=================
    // 西北側（+1）：白磁磚山牆屋（3 樓綠鐵籠）、磚紅色圓弧陽台樓（不鏽鋼拱形車棚）、兩戶白磁磚外凸陽台屋（深咖啡格柵車棚）
    [
      'L11',
      16.4,
      20,
      1,
      { ...RH, extra: (k, c) => rowHouse(k, c, { top: 'cage', cage: '#4f8a5a', gable: true }) },
    ],
    [
      'L11',
      20,
      24.5,
      1,
      {
        ...RH,
        nf: 4,
        wall: '#a8483a',
        ground: 'shutter',
        sh: '#9a9c9e',
        extra: (k, c) => {
          rowHouse(k, c, { wall: '#a8483a', top: 'none', port: '#c4c7c9' });
          blank(k, c, 3, '#a8483a');
          for (const f of [2, 3]) {
            // 3、4 樓外凸的圓弧陽台，白色細欄杆
            const y = c.gf + (f - 1) * c.fh;
            k.box(0.5, c.w - 0.5, y + 0.9, y + 2.5, -0.09, -0.07, '#3a3f44', { col: false });
            k.cyl(c.w / 2, -0.1, 1.5, y - 0.1, y + 0.35, c.wallMat('#a8483a'), { seg: 14 });
            k.cyl(c.w / 2, -0.1, 1.52, y + 0.95, y + 1.02, '#f2f2ee', { seg: 14 });
            for (let a = -1.3; a <= 1.31; a += 0.26)
              k.box(
                c.w / 2 + Math.sin(a) * 1.5 - 0.015,
                c.w / 2 + Math.sin(a) * 1.5 + 0.015,
                y + 0.35,
                y + 0.95,
                -0.1 - Math.cos(a) * 1.5 - 0.015,
                -0.1 - Math.cos(a) * 1.5 + 0.015,
                '#f2f2ee',
                { col: false }
              );
          }
        },
      },
    ],
    [
      'L11',
      24.5,
      29,
      1,
      { ...RH, extra: (k, c) => rowHouse(k, c, { setback: true, port: '#4a3a30' }) },
    ],
    [
      'L11',
      29,
      33.5,
      1,
      { ...RH, extra: (k, c) => rowHouse(k, c, { arch: 2, setback: true, port: '#4a3a30' }) },
    ],
    // 東南側（-1）：咖啡色格柵車庫＋2 樓菱形網欄杆陽台、白鐵籠屋、兩戶外凸陽台屋（門口平雨遮）
    [
      'L11',
      15.5,
      20,
      -1,
      {
        ...RH,
        ground: 'shutter',
        sh: '#6a4a36',
        extra: (k, c) => {
          rail(k, 0.2, c.w - 0.2, c.gf, '#b9bcbe', 0.8);
        },
      },
    ],
    [
      'L11',
      20,
      24.5,
      -1,
      {
        ...RH,
        extra: (k, c) =>
          rowHouse(k, c, { top: 'cage', archCol: '#6a6a6a', awn: '#a8a8a4', setback: true }),
      },
    ],
    [
      'L11',
      24.5,
      29,
      -1,
      {
        ...RH,
        extra: (k, c) =>
          rowHouse(k, c, { archCol: '#6a6a6a', awn: '#a8a8a4', rail: '#e4e2dc', setback: true }),
      },
    ],
    [
      'L11',
      29,
      33.5,
      -1,
      {
        ...RH,
        extra: (k, c) =>
          rowHouse(k, c, { archCol: '#7a5a3a', awn: '#eeeeea', rail: '#e4e2dc', setback: true }),
      },
    ],
  ],
};
