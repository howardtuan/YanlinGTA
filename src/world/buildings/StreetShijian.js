// 實踐路兩側的街屋（照 Google 街景與國土測繪 2024 正射建模，只做外觀，不能進入）。
// 寫法照 src/world/buildings/StreetZhongbei.js，差別是這裡有三條路，所以每一格多一個「路」欄位：[road, s0, s1, side, spec]
//   road：'N' 中北路口往北（夜市那段）、'S' 中北路口往東南（中原國小、夜市主街，到環中東路）、'L11' 實踐路11巷
//   s = 沿那條路從起點量的公尺數；side +1 = 順著 s 增加的方向走的右手邊，-1 = 左手邊
//   spec 的欄位跟 src/world/buildings/StreetZhongbei.js 檔頭寫的一樣（nf、gf、fh、d、wall、low、sign、ground、sh、awn、bal、glass、hood、
//   vert、round、banner、roof、bill、tin、arch、fins、big、sign2、noband、roofCol、door、tower、bikes、set），
//   另外多一個 extra(k, ctx)：這一格獨有的構件直接用 Kit 畫（見下面 lots 迴圈最後）
// 中北路×實踐路口那幾棟在 src/world/buildings/StreetZhongbei.js，這裡不重做。
// 這個檔案不 import src/world/Interiors.js；src/world/zones/Zones.js import 這裡的 SJ_ST.drop、SJ_ST.ownSign 與 sjFootprints()。

import N1 from './shijian/N1.js';
import N2 from './shijian/N2.js';
import S1 from './shijian/S1.js';
import S2 from './shijian/S2.js';
import S3 from './shijian/S3.js';
import S4 from './shijian/S4.js';
import { shrinkFont } from '../../graphics/FitText.js';

// 路中心線（data/cycu.json 的實踐路；N 段反過來從中北路口往北量）
export const SJ_ROADS = {
  N: {
    pts: [
      [-331.5, 130.4],
      [-332.0, 114.2],
      [-332.2, 111.2],
      [-335.8, 64.3],
      [-335.9, 40.0],
      [-334.4, 4.9],
      [-331.2, -20.9],
      [-332.7, -37.2],
      [-336.4, -44.2],
      [-339.3, -48.1],
      [-343.1, -52.9],
      [-346.1, -58.1],
      [-349.2, -63.3],
      [-352.0, -68.6],
      [-355.3, -73.6],
      [-358.2, -82.6],
    ],
    half: 3.5,
    set: 5.0,
  },
  S: {
    pts: [
      [-331.5, 130.4],
      [-335.4, 138.5],
      [-329.2, 144.3],
      [-324.0, 149.1],
      [-304.0, 167.9],
      [-279.8, 189.5],
      [-249.8, 216.0],
      [-223.7, 239.3],
      [-204.9, 255.8],
      [-191.8, 267.6],
      [-171.2, 285.6],
      [-160.1, 295.3],
      [-145.2, 310.4],
      [-136.4, 318.3],
      [-112.7, 337.9],
      [-88.5, 360.5],
      [-59.0, 387.1],
      [-35.6, 408.6],
      [21.2, 460.4],
      [24.3, 463.0],
      [67.5, 500.5],
      [74.0, 507.0],
    ],
    half: 4.0,
    set: 6.0,
  },
  L11: {
    pts: [
      [24.3, 463.0],
      [1.2, 488.5],
    ],
    half: 1.5,
    set: 2.6,
  },
};

// 一段一個資料檔（src/world/buildings/shijian/*.js），各自 export default { lots, drop, ownSign, fences }
const SEGS = [N1, N2, S1, S2, S3, S4];
const ROAD_KEYS = Object.keys(SJ_ROADS);
export const SJ_ST = {
  ownSign: SEGS.flatMap((g) => g.ownSign || []), // 街屋自己掛招牌的店名（跟 data/cycu.json pois 的 name 完全一樣），POI 不再另外掛
  drop: SEGS.flatMap((g) => g.drop || []), // 這些格子蓋掉的通用填充樓 id
  fences: SEGS.flatMap((g) => g.fences || []), // 圍牆 [road, s0, s1, side, spec?]
  lots: SEGS.flatMap((g) => g.lots || []),
};
export function sjAt(road, s) {
  const R = SJ_ROADS[road].pts;
  let acc = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i],
      b = R[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= acc + L || i === R.length - 2) {
      const t = (s - acc) / L;
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        ux: (b[0] - a[0]) / L,
        uz: (b[1] - a[1]) / L,
      };
    }
    acc += L;
  }
}
// 每一格的區域座標：原點在立面線的起點，+x 沿立面（side -1 時朝 s 變小的方向，立面才對著街），+z 離開街道
export function sjLotFrame([road, s0, s1, side, sp]) {
  const Rd = SJ_ROADS[road],
    m = sjAt(road, (s0 + s1) / 2),
    w = s1 - s0,
    nx = -m.uz * side,
    nz = m.ux * side;
  const ax = side > 0 ? m.ux : -m.ux,
    az = side > 0 ? m.uz : -m.uz;
  const set = (sp && sp.set) || Rd.set;
  return {
    ox: m.x + nx * set - (ax * w) / 2,
    oz: m.z + nz * set - (az * w) / 2,
    ang: Math.atan2(az, ax),
    w,
    apron: Math.max(0.6, set - Rd.half),
  };
}
export function sjFootprints() {
  const fp = SJ_ST.fences.map(([road, s0, s1, side, fs]) => {
    const { ox, oz, ang, w, apron } = sjLotFrame([
        road,
        s0,
        s1,
        side,
        { set: (fs && fs.set) || SJ_ROADS[road].set + 0.35 },
      ]),
      c = Math.cos(ang),
      s = Math.sin(ang),
      p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
    return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, 1.8), p(-0.1, 1.8)];
  });
  return fp.concat(
    SJ_ST.lots.map((L) => {
      const { ox, oz, ang, w, apron } = sjLotFrame(L),
        c = Math.cos(ang),
        s = Math.sin(ang),
        d = L[4].d || 10;
      const p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
      return [p(-0.1, -apron - 0.2), p(w + 0.1, -apron - 0.2), p(w + 0.1, d), p(-0.1, d)];
    })
  );
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
const r16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);

export function buildShijianStreet(I, scene, X) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS } = X;
  const { MR, FRONT, shopGlass, ac, win, shell } = rowTools();
  const def = (key, f) => {
    if (!MATS[key]) MATS[key] = f();
    return key;
  };
  const std = (o) =>
    new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  // 單色的方塊（招牌底、雨棚、牆…）全部用頂點顏色畫在同一種材質上，一排房子只剩幾種材質，才不會有上百個 draw call：
  // 'VC' 是素色、'WVC' 是帶磁磚紋的牆；k.box / k.cyl 收到 #hex 或 'wall#hex' 就自動改成這兩種材質加頂點色
  const VC = def('sjVC', () => std({ vertexColors: true })),
    WVC = def('sjWVC', () => std({ map: YHT.facade(), vertexColors: true }));
  const MRW = { grime: MR.grime, brick: MR.brick, mosaic: MR.mosaic };
  const WALLC = {
    tile: '#f0efea',
    beige: '#eadfc6',
    grey: '#c9c8c2',
    pinkGrey: '#e3cfc9',
    stone: '#b9b7af',
    redbrown: '#b07a66',
  };
  // 磁磚貼面在日光下看起來比色票暗，深色與飽和色往白色提亮一點才像街景裡的樣子
  const lift = (hex, k = 0.22) => {
    const n = parseInt(hex.slice(1), 16),
      c = (s) => Math.round(((n >> s) & 255) * (1 - k) + 255 * k);
    return `#${[16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`;
  };
  const wallMat = (w) =>
    MRW[w]
      ? MRW[w]
      : WALLC[w]
        ? `wall${WALLC[w]}`
        : w && w[0] === '#'
          ? `wall${lift(w)}`
          : `wall${WALLC.tile}`;
  const paintGeo = (g, hex) => {
    const c = new THREE.Color(hex),
      n = g.attributes.position.count,
      a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = c.r;
      a[i * 3 + 1] = c.g;
      a[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const vcKit = (k) => {
    const kb = k.box.bind(k),
      kc = k.cyl.bind(k),
      hexOf = (m) =>
        typeof m !== 'string' ? null : m[0] === '#' ? m : m.startsWith('wall#') ? m.slice(4) : null;
    k.box = (x0, x1, y0, y1, z0, z1, mat, o) => {
      const h = hexOf(mat);
      return h
        ? paintGeo(kb(x0, x1, y0, y1, z0, z1, mat[0] === '#' ? VC : WVC, o), h)
        : kb(x0, x1, y0, y1, z0, z1, mat, o);
    };
    k.cyl = (x, z, r, y0, y1, mat, o) => {
      const h = hexOf(mat);
      return h ? paintGeo(kc(x, z, r, y0, y1, VC, o), h) : kc(x, z, r, y0, y1, mat, o);
    };
    return k;
  };
  // ---- textures ----
  // 招牌：一公尺 ppm 像素，字自動縮到放得下；text 可用 \n 分行；sub 小字；style 加上品牌色條
  const paint = (text, bg, fg, sub, wm, hm, ppm = 128, style) => {
    if (wm * ppm > 1536) ppm = 1536 / wm;
    const W = r16(wm * ppm),
      Hh = r16(hm * ppm);
    return sg(`sj_${text}|${bg}|${fg}|${sub || ''}|${W}x${Hh}|${style || ''}`, W, Hh, (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, Hh);
      if (style === 'seven') {
        const hs = Hh / 3;
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, hs * 0.5);
        g.fillStyle = '#f26b21';
        g.fillRect(0, hs * 0.5, W, hs * 0.5);
        g.fillStyle = '#00843d';
        g.fillRect(0, hs, W, hs * 0.5);
        g.fillStyle = '#e2231a';
        g.fillRect(0, hs * 1.5, W, hs * 0.5);
        g.fillStyle = '#ffffff';
        g.fillRect(0, hs * 2, W, hs);
      }
      if (style === 'fam') {
        g.fillStyle = '#00a0e0';
        g.fillRect(0, 0, W, Hh * 0.16);
        g.fillStyle = '#2fb34a';
        g.fillRect(0, Hh * 0.16, W, Hh * 0.1);
      }
      if (style === 'frame') {
        g.strokeStyle = fg;
        g.lineWidth = Math.max(3, Hh * 0.04);
        g.strokeRect(Hh * 0.06, Hh * 0.06, W - Hh * 0.12, Hh * 0.88);
      }
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const lines = String(text).split('\n'),
        n = lines.length,
        avail = (Hh * (sub ? 0.64 : 0.86)) / n;
      const px = Math.min(avail * 0.92, W * 0.5);
      const fit = (t) => {
        const p = shrinkFont(g, t, W * 0.94, px, 10, font);
        return p;
      };
      const cy = sub ? Hh * 0.38 : Hh * 0.5;
      lines.forEach((t, i) => {
        fit(t);
        g.fillText(t, W / 2, cy + (i - (n - 1) / 2) * avail);
      });
      if (sub) {
        shrinkFont(g, sub, W * 0.94, Hh * 0.2, 9, (sz) => font(sz, 700));
        g.fillText(sub, W / 2, Hh * 0.82);
      }
    });
  };
  const roundSign = (text, bg, fg) =>
    sg(`sjR_${text}|${bg}|${fg}`, 128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = bg;
      g.beginPath();
      g.arc(64, 64, 62, 0, 7);
      g.fill();
      g.strokeStyle = fg;
      g.lineWidth = 4;
      g.beginPath();
      g.arc(64, 64, 52, 0, 7);
      g.stroke();
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const t = [...text];
      if (t.length <= 2) {
        g.font = font(t.length === 1 ? 70 : 48);
        g.fillText(text, 64, 66);
      } else if (t.length <= 4) {
        g.font = font(40);
        g.fillText(t.slice(0, 2).join(''), 64, 44);
        g.fillText(t.slice(2).join(''), 64, 88);
      } else {
        shrinkFont(g, text, 100, 34, 12, font);
        g.fillText(text, 64, 66);
      }
    });
  const shutterTex = (hex) =>
    sg(`sjSh${hex}`, 64, 64, (g) => {
      g.fillStyle = hex;
      g.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) {
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(0, y, 64, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, y + 6, 64, 2);
      }
    });
  const openTex = sg('sjOpen', 256, 160, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 160);
    gr.addColorStop(0, '#4a4640');
    gr.addColorStop(0.3, '#2a2724');
    gr.addColorStop(1, '#161513');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = 'rgba(255,248,225,.85)';
    for (let x = 24; x < 256; x += 80) g.fillRect(x, 8, 36, 5);
    const r = lcg(41);
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 34 + r() * 8;
      g.fillStyle = ['#3a3a40', '#6a2a2a', '#2a4a6a', '#5a5a52'][i % 4];
      g.fillRect(x, 96, 20, 44);
      g.fillRect(x - 4, 112, 28, 12);
    }
  });
  const archWin = sg('sjArchWin', 256, 160, (g) => {
    // 三井3C 的白色拱形鐵窗
    g.fillStyle = '#e8e8e4';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#566673';
    g.fillRect(10, 10, 236, 140);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(14, 14, 100, 130);
    g.strokeStyle = '#f2f2ee';
    g.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const x0 = 14 + i * 77,
        x1 = x0 + 70;
      g.beginPath();
      g.moveTo(x0, 148);
      g.lineTo(x0, 70);
      g.arc((x0 + x1) / 2, 70, 35, Math.PI, 0);
      g.lineTo(x1, 148);
      g.stroke();
      g.beginPath();
      g.moveTo((x0 + x1) / 2, 35);
      g.lineTo((x0 + x1) / 2, 148);
      g.stroke();
    }
  });
  const archRow = sg('sjArchRow', 256, 64, (g) => {
    // 粉紅拱形女兒牆
    g.fillStyle = '#d8a0a0';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#efe0d8';
    for (let x = 6; x < 256; x += 32) {
      g.beginPath();
      g.moveTo(x, 58);
      g.lineTo(x, 28);
      g.arc(x + 10, 28, 10, Math.PI, 0);
      g.lineTo(x + 20, 58);
      g.closePath();
      g.fill();
    }
  });
  const bars = sg('sjBars', 64, 64, (g) => {
    // 圍牆黑色鐵欄杆
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = '#1c1c1e';
    for (let x = 4; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
    g.fillRect(0, 2, 64, 4);
    g.fillRect(0, 58, 64, 4);
  });
  const litWin = (gr) =>
    sg(`sjLit${gr ? 1 : 0}`, 256, 160, (g) => {
      // 亮著燈的窗：暖色玻璃、窗簾，鐵窗版加欄杆
      g.fillStyle = '#d4d6d6';
      g.fillRect(0, 0, 256, 160);
      const gl = g.createLinearGradient(0, 8, 0, 152);
      gl.addColorStop(0, '#f6e2a8');
      gl.addColorStop(1, '#e0bd72');
      g.fillStyle = gl;
      g.fillRect(8, 8, 240, 144);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(14, 12, 50, 136);
      g.fillStyle = 'rgba(150,110,80,.45)';
      g.fillRect(8, 8, 70, 144);
      g.fillRect(178, 8, 70, 144);
      g.fillStyle = '#d4d6d6';
      g.fillRect(124, 0, 8, 160);
      if (gr) {
        g.fillStyle = '#3a3a3a';
        for (let x = 22; x < 256; x += 30) g.fillRect(x, 0, 4, 160);
        g.fillRect(0, 76, 256, 4);
      }
    });
  const shopTex = (i) =>
    ROWT.shop(
      `sj${i}`,
      ['#f4e7cf', '#eef2f4', '#f6ead2', '#f1dcb8', '#e8f0e4', '#f8efe0'][i % 6],
      ['#8a6a44', '#7f858c', '#a07a4a', '#6b4a2a', '#6a7a5a', '#8a5a4a'][i % 6],
      300 + i * 3
    );

  const kits = [];
  const bikeCols = ['#2a2a30', '#c9c9c4', '#b02a2a', '#2f6db3', '#3f7a4c', '#d8b02a'];
  const bike = (k, x, z, rot, col) => k.scooter(x, z, rot, col);

  const exposed = (L, lo) =>
    !SJ_ST.lots.some(
      (M) =>
        M !== L &&
        M[0] === L[0] &&
        M[3] === L[3] &&
        (lo ? Math.abs(M[2] - L[1]) < 1.2 : Math.abs(M[1] - L[2]) < 1.2)
    ); // 這一側有沒有鄰居
  SJ_ST.lots.forEach((L, i) => {
    const sp = L[4],
      { ox, oz, ang, w, apron } = sjLotFrame(L),
      r = lcg(
        2000 + Math.round(L[1] * 10) * 7 + ROAD_KEYS.indexOf(L[0]) * 100003 + (L[3] > 0 ? 1 : 0)
      ); // 亂數種子只看這一格自己的位置，別段增減格子不會改到它
    void i;
    const ex0 = L[3] > 0 ? exposed(L, true) : exposed(L, false),
      ex1 = L[3] > 0 ? exposed(L, false) : exposed(L, true);
    const k = vcKit(new Kit(I, ox, oz, ang));
    kits.push(k);
    const win2 = (x, y, ww, h, gr = true) =>
      r() < 0.2
        ? k.plane(litWin(gr), ww, h, x, y, -0.02, FRONT, { emissive: 0.5 })
        : win(k, x, y, ww, h, gr); // 兩成的窗亮著燈
    const nf = sp.nf || 4,
      fh = sp.fh || 3.0,
      gf = sp.gf || (nf === 1 ? 3.2 : 3.3),
      top = gf + (nf - 1) * fh,
      d = sp.d || 10;
    const glassWall = sp.bal === 'glass';
    const wm = glassWall && sp.glass ? sp.glass : wallMat(sp.wall);
    shell(k, w, d, top, wm);
    if (sp.low && !glassWall)
      k.box(-0.01, w + 0.01, 0, gf, -0.05, 0, wallMat(sp.low), { col: false, tile: [0.6, 0.6] });
    for (const x of [0, w - 0.12]) k.box(x, x + 0.12, 0, top, -0.06, 0, '#b9b6ae', { col: false }); // 分戶牆邊
    // ---- 一樓 ----
    if (sp.sign) {
      const [text, bg, fg, sub, style] = sp.sign,
        sw = w - 0.15,
        sh = 0.8;
      k.box(0.05, w - 0.05, gf - 0.85, gf - 0.03, -0.28, 0, bg, { col: false });
      k.plane(
        paint(text, bg, fg, sub, sw, sh, 128, style),
        sw,
        sh,
        w / 2,
        gf - 0.44,
        -0.29,
        FRONT,
        { emissive: 0.35 }
      );
    } else if (!sp.noband)
      k.box(0.05, w - 0.05, gf - 0.85, gf - 0.4, -0.06, 0, '#d8d6cf', { col: false });
    if (sp.awn) {
      const A = Array.isArray(sp.awn) ? sp.awn : [sp.awn],
        n = A.length > 1 ? Math.max(2, Math.round(w / 0.3)) : 1,
        bw = w / n;
      for (let j = 0; j < n; j++)
        k.box(
          -0.05 + j * bw,
          -0.05 + (j + 1) * bw + 0.01,
          gf - 1.05,
          gf - 0.97,
          -1.25,
          0,
          A[j % A.length],
          { col: false }
        );
      k.box(-0.05, w + 0.05, gf - 1.18, gf - 1.05, -1.27, -1.2, A[0], { col: false });
    }
    if (sp.tin) {
      const ty = nf === 1 ? top : sp.sign ? gf + 0.1 : gf - 0.35;
      k.box(-0.1, w + 0.1, ty, ty + 0.08, -1.3, nf === 1 ? d : 0, MR.roof, { col: false });
    }
    const doorW = sp.door === 0 ? 0 : 1.0,
      bodyW = w - doorW;
    if (doorW) k.plane(YHT.win(), doorW - 0.1, 2.2, w - doorW / 2 - 0.1, 1.1, -0.03, FRONT);
    const gh = gf - 1.0;
    const gk = sp.ground || 'shop';
    if (gk === 'shop' || gk === 'stall') {
      shopGlass(k, 0.15, bodyW - 0.2 + (doorW ? 0 : 0.2), 0, gh, shopTex(i));
      if (gk === 'stall') {
        k.box(0.3, bodyW - 0.3, 0, 0.95, -0.55, -0.05, '#c9c9c4', { col: false });
        k.box(0.3, bodyW - 0.3, 0.95, 1.0, -0.6, -0.02, '#8d9196', { col: false });
      }
    } else if (gk === 'open') {
      k.plane(openTex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.03, FRONT, { emissive: 0.3 });
      for (const x of [0.12, bodyW - 0.22])
        k.box(x, x + 0.1, 0, gh, -0.1, 0, '#8a8680', { col: false });
    } else {
      const tex = sp.sh ? shutterTex(sp.sh) : ROWT.shutter();
      k.plane(tex, bodyW - 0.4, gh, bodyW / 2, gh / 2, -0.02, FRONT);
      if (gk === 'gate')
        k.plane(YHT.win(), bodyW - 0.5, gh - 0.4, bodyW / 2, gh / 2 - 0.15, -0.05, FRONT);
      k.box(0.15, bodyW - 0.15, gh - 0.02, gh + 0.2, -0.22, 0, '#7a7e80', { col: false }); // 鐵捲門的罩盒
    }
    if (sp.bikes)
      for (let j = 0; j < sp.bikes; j++) {
        const x = 0.2 + j * ((w - 2.2) / Math.max(1, sp.bikes - 0.5));
        bike(k, x, -0.9 - (j % 2) * 0.35, 0, bikeCols[(i + j) % 6]);
      }
    else if (w > 4 && r() < 0.6) {
      // 騎樓邊停幾台機車
      const n = 1 + ((r() * 3) | 0);
      let x = 0.3 + r() * 1.5;
      for (let j = 0; j < n && x < w - 1.7; j++) {
        const per = r() < 0.4;
        bike(
          k,
          per ? x + 0.3 : x,
          per ? -1.75 : -1.0 - r() * 0.3,
          per ? 1 : 0,
          bikeCols[(i * 3 + j) % 6]
        );
        x += per ? 0.8 : 1.9 + r() * 0.5;
      }
    }
    if (r() < 0.3) k.box(w - 0.38, w - 0.3, 0, top, -0.13, -0.05, '#8a8d90', { col: false }); // 外牆水管
    if ((gk === 'shop' || gk === 'stall') && w > 3.5 && r() < 0.4) {
      const sx = 0.4 + r() * (w - 2);
      k.box(sx, sx + 0.55, 0, 0.95, -1.5, -1.45, '#26282b', { col: false });
      k.box(sx + 0.04, sx + 0.51, 0.55, 0.9, -1.51, -1.49, '#f3efe4', { col: false });
    } // 門口立牌
    if (sp.banner) {
      const [bt, bb, bf] = sp.banner;
      k.plane(
        paint(bt, bb, bf, null, Math.min(w - 0.4, 3.4), 0.5, 96),
        Math.min(w - 0.4, 3.4),
        0.5,
        w / 2,
        gf - 1.5,
        -0.3,
        FRONT,
        { emissive: 0.15 }
      );
    }
    // ---- 樓上 ----
    for (let f = 1; f < nf; f++) {
      const y = gf + (f - 1) * fh,
        ww = w - 1.0;
      if (glassWall) {
        // 玻璃帷幕：一格一格的窗與白色分隔
        k.box(0.05, w - 0.05, y, y + 0.4, -0.08, -0.02, '#e9e9e6', { col: false });
        for (let x = 0.05; x <= w - 0.04; x += 1.4)
          k.box(x, x + 0.07, y, y + fh, -0.1, -0.02, '#e9e9e6', { col: false });
        if (f === 1)
          k.box(0.05, w - 0.05, y + fh - 0.06, y + fh, -0.18, -0.02, '#e9e9e6', { col: false });
        continue;
      }
      const bk = sp.bal || 'grille';
      if (bk === 'cage') {
        win2(w / 2, y + 1.45, ww - 0.4, 1.4, false);
        k.box(0.3, w - 0.3, y + 0.05, y + 0.15, -0.75, 0, 'metal', { col: false });
        k.box(0.3, w - 0.3, y + 2.55, y + 2.62, -0.75, 0, 'metal', { col: false });
        for (let x = 0.3; x <= w - 0.29; x += 0.18)
          k.box(x, x + 0.025, y + 0.15, y + 2.55, -0.75, -0.72, 'metal', { col: false });
      } else if (bk === 'open') {
        k.box(0.3, w - 0.3, y, y + 0.9, -0.8, -0.7, wallMat(sp.wall), { col: false });
        win2(w / 2, y + 1.6, ww, 1.6, false);
      } else if (bk === 'rail') {
        win2(w / 2, y + 1.5, ww, 1.4, false);
        if (f === 1) {
          k.box(0.1, w - 0.1, y, y + 0.1, -1.0, 0, '#2b2b2b', { col: false });
          for (const yy of [0.5, 0.85, 1.2])
            k.box(0.1, w - 0.1, y + yy, y + yy + 0.04, -1.0, -0.96, '#2b2b2b', { col: false });
          for (const x of [0.1, w - 0.14])
            k.box(x, x + 0.04, y, y + 1.2, -1.0, -0.96, '#2b2b2b', { col: false });
        }
      } else if (bk === 'arch') {
        const n = Math.max(1, Math.round(ww / 3.2)),
          cw = ww / n;
        for (let j = 0; j < n; j++)
          k.plane(archWin, cw - 0.2, 1.7, 0.5 + cw * (j + 0.5), y + 1.5, -0.03, FRONT);
      } else if (bk === 'plain') win2(w / 2, y + 1.5, ww, 1.4, false);
      else win2(w / 2, y + 1.5, ww, 1.35);
      if (sp.hood) k.box(0.4, w - 0.4, y + 2.25, y + 2.33, -0.65, 0, sp.hood, { col: false });
      if (sp.fins)
        for (let x = 0.3; x <= w - 0.3; x += 0.55)
          k.box(x, x + 0.1, y + 0.1, y + fh - 0.1, -0.3, 0, sp.fins, { col: false });
      if (r() < 0.65)
        ac(
          k,
          r() < 0.5 ? 0.25 : w - 1.05,
          y + 0.1 + (r() < 0.5 ? 0 : 1.9),
          bk === 'cage' ? -1.2 : -0.45
        );
    }
    if (sp.big) {
      const [bt, bb, bf] = sp.big,
        y0 = gf + ((sp.bigFrom || 2) - 1) * fh,
        bh = top - y0 - 0.1,
        bw = sp.bigW || w - 0.6,
        bx = sp.bigW ? w * (sp.bigAt || 0.5) : w / 2;
      k.plane(paint(bt, bb, bf, null, bw, bh, 40), bw, bh, bx, y0 + bh / 2 + 0.05, -0.06, FRONT, {
        emissive: 0.15,
      });
    }
    if (sp.sign2) {
      const [bt, bb, bf] = sp.sign2;
      k.box(0.1, w - 0.1, gf + 0.3, gf + 1.5, -0.2, -0.06, bb, { col: false });
      k.plane(
        paint(bt, bb, bf, null, w - 0.3, 1.1, 100),
        w - 0.3,
        1.1,
        w / 2,
        gf + 0.9,
        -0.21,
        FRONT,
        { emissive: 0.3 }
      );
    }
    if (sp.vert) {
      const [text, bg, fg] = sp.vert,
        len = 0.6 * text.length + 0.2;
      for (const sd of [-1, 1])
        k.plane(
          ROWT.vert(`sj${text}${bg}`, bg, fg, text),
          0.6,
          len,
          0.25 + sd * 0.04,
          gf + 0.4 + len / 2,
          -0.55,
          (sd * Math.PI) / 2,
          { emissive: 0.3 }
        );
    }
    if (sp.round) {
      const [text, bg, fg] = sp.round;
      for (const sd of [-1, 1])
        k.plane(
          roundSign(text, bg, fg),
          0.85,
          0.85,
          w - 0.3 + sd * 0.03,
          gf + 1.5,
          -0.7,
          (sd * Math.PI) / 2,
          { transparent: true, emissive: 0.3 }
        );
    }
    if (sp.arch) {
      k.box(0, w, top + 0.12, top + 0.95, d - 0.2, d, sp.arch, { col: false });
      k.box(0, 0.12, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false });
      k.box(w - 0.12, w, top + 0.12, top + 0.95, 0, d, sp.arch, { col: false });
      k.box(0, w, top + 0.12, top + 0.95, -0.02, 0.1, sp.arch, { col: false });
      k.plane(archRow, w, 0.8, w / 2, top + 0.53, -0.04, FRONT);
    }
    if (sp.tower) {
      const T = sp.tower,
        back = T.back || 2.5,
        tn = T.nf || 8,
        tw = wallMat(T.wall || '#e9e7e3'),
        th = tn * 3.0;
      k.box(0.3, w - 0.3, top + 0.12, top + 0.12 + th, back, d - 0.5, tw);
      for (let f = 0; f < tn; f++) {
        const y = top + 0.12 + f * 3.0;
        k.box(0.3, w - 0.3, y + 0.05, y + 0.2, back - 1.0, back, T.balc || '#6a6070', {
          col: false,
        });
        win2(w / 2, y + 1.7, w - 1.6, 1.4, false);
        if (r() < 0.5) ac(k, 0.8 + r() * (w - 3), y + 0.3, back - 0.5);
      }
    }
    // 後牆與沒有鄰居的側牆開窗，頂樓隨機加水塔／頂樓加蓋，從高處或巷口看才不會是一整面素牆
    if (nf > 1) {
      for (let f = 0; f < nf; f++) {
        const y = f === 0 ? 0.3 : gf + (f - 1) * fh + 0.3,
          n = w > 7 ? 3 : w > 4 ? 2 : 1;
        for (let j = 0; j < n; j++)
          k.plane(YHT.win(), 1.5, 1.1, (w * (j + 0.5)) / n, y + 1.1, d + 0.03, 0);
        for (const [x, rot, ex] of [
          [-0.03, -Math.PI / 2, ex0],
          [w + 0.03, Math.PI / 2, ex1],
        ])
          if (ex)
            for (const zc of [d * 0.3, d * 0.7]) k.plane(YHT.win(), 1.2, 1.1, x, y + 1.1, zc, rot);
      }
    }
    if (nf > 1 && !sp.roof) {
      const q = r();
      if (q < 0.3)
        k.cyl(w * (0.3 + r() * 0.4), d * 0.7, 0.55, top + 0.12, top + 1.4, '#d8d8d0', { seg: 10 });
      else if (q < 0.55) {
        const hx = w * (0.15 + r() * 0.3),
          hz = d * 0.35;
        k.box(hx, hx + 2.2, top + 0.12, top + 2.6, hz, hz + 2.4, wallMat(sp.wall), { col: false });
        k.box(hx - 0.15, hx + 2.35, top + 2.6, top + 2.72, hz - 0.15, hz + 2.55, MR.roof, {
          col: false,
        });
      } else if (q < 0.7) {
        k.box(0.3, w - 0.3, top + 0.12, top + 2.3, d * 0.45, d - 0.4, '#3a6fb0', { col: false });
        k.box(0.1, w - 0.1, top + 2.3, top + 2.4, d * 0.4, d - 0.2, MR.roof, { col: false });
      }
    }
    if (sp.roof === 'shack') {
      k.box(0.4, w - 0.4, top + 0.12, top + 2.2, 2.0, d - 0.5, MR.roof, { col: false });
      k.box(0.2, w - 0.2, top + 2.2, top + 2.3, 1.4, d, MR.roof, { col: false });
    } else if (sp.roof === 'tank') {
      k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 });
      if (w > 4.5) k.cyl(w / 2 + 1.3, d - 3, 0.5, top + 0.12, top + 1.3, '#cfd2d4', { seg: 10 });
    } else if (sp.roof === 'bill' && sp.bill) {
      // 屋頂鐵架看板
      const [bt, bb, bf, bw0, bh] = sp.bill,
        bw = Math.min(bw0 || w - 0.6, w),
        y0 = top + (nf === 1 ? 0.9 : 0.4);
      k.plane(paint(bt, bb, bf, null, bw, bh, 80), bw, bh, w / 2, y0 + bh / 2, 0.45, FRONT, {
        emissive: 0.35,
        double: true,
      });
      k.box(w / 2 - bw / 2 - 0.04, w / 2 + bw / 2 + 0.04, y0 - 0.06, y0, 0.4, 0.5, '#4a4d50', {
        col: false,
      });
      for (const x of [w / 2 - bw / 2 + 0.2, w / 2 + bw / 2 - 0.25])
        k.box(x, x + 0.06, top, y0 + bh * 0.6, 0.38, 0.5, '#4a4d50', { col: false });
    }
    if (nf === 1) {
      // 一樓鐵皮屋：浪板屋頂往後傾
      k.box(-0.15, w + 0.15, top - 0.12, top, -0.4, d, sp.roofCol || MR.roof, { col: false });
    }
    // 這一格獨有的構件：spec.extra(k, ctx) 直接用 Kit 畫（區域座標：x 沿立面 0～w、y 高度、z<0 是立面前方、z>0 往屋後）
    if (sp.extra)
      sp.extra(k, {
        w,
        d,
        top,
        gf,
        fh,
        nf,
        r,
        paint,
        roundSign,
        shutterTex,
        win,
        win2,
        ac,
        bike,
        wallMat,
        FRONT,
        MR,
        YHT,
        ROWT,
        THREE,
        VC,
        WVC,
        paintGeo,
        sg,
        font,
      });
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
  });

  // ---- 圍牆 [road, s0, s1, side, spec?]：洗石子矮牆、紅磚方柱加黑色花式鐵欄杆、牆內整排大樹（照街景 2026-05 的中原國小圍牆）----
  // spec（都可以不給）：set 牆離路中心線、bay 柱距（預設 4）、shrub 0 不種灌木、tall 牆內是 10 m 以上的大樹、bikes 牆外停一排機車、
  //   mesh 整段改成花台加綠色菱形網圍籬（底下一條藍底彩繪板，沒有紅磚柱）、mural [[s0, s1], …] 這幾段牆外多一道綠網圍籬加彩繪花台、cones [[s0, s1], …] 這幾段牆外不停機車只放交通錐
  const bars2 = sg('sjBars2', 128, 64, (g) => {
    // 黑色花式鐵欄杆：上緣圓弧、中間一個圓形花飾
    g.clearRect(0, 0, 128, 64);
    g.fillStyle = '#1c1c1e';
    g.strokeStyle = '#1c1c1e';
    g.lineWidth = 3;
    for (let x = 3; x < 128; x += 9) {
      const top = 6 + 10 * Math.pow((x - 64) / 64, 2) * 1.6;
      if (Math.abs(x - 64) > 15) g.fillRect(x, top, 2.5, 64 - top);
      else {
        g.fillRect(x, top, 2.5, 14 - top + 6);
        g.fillRect(x, 50, 2.5, 14);
      }
    }
    g.beginPath();
    g.moveTo(0, 22);
    g.quadraticCurveTo(64, -8, 128, 22);
    g.stroke();
    g.fillRect(0, 57, 128, 4);
    g.beginPath();
    g.arc(64, 35, 15, 0, 7);
    g.stroke();
    g.beginPath();
    g.arc(64, 35, 6, 0, 7);
    g.stroke();
    for (let a = 0; a < 6.3; a += Math.PI / 4) {
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 6, 35 + Math.sin(a) * 6);
      g.lineTo(64 + Math.cos(a) * 15, 35 + Math.sin(a) * 15);
      g.stroke();
    }
  });
  const meshTex = sg('sjMesh', 128, 96, (g) => {
    // 綠色菱形網圍籬（一片 2 m），底下藍底彩繪板：綠色山丘、白雲
    g.clearRect(0, 0, 128, 96);
    g.strokeStyle = 'rgba(47,122,82,.9)';
    g.lineWidth = 1.2;
    for (let x = -64; x < 128; x += 8) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 64, 64);
      g.stroke();
      g.beginPath();
      g.moveTo(x + 64, 0);
      g.lineTo(x, 64);
      g.stroke();
    }
    g.fillStyle = '#2f7a52';
    g.fillRect(0, 0, 128, 3);
    g.fillRect(0, 0, 4, 96);
    g.fillRect(124, 0, 4, 96);
    g.fillStyle = '#2f6fc0';
    g.fillRect(0, 64, 128, 32);
    g.fillStyle = '#5fb04a';
    g.beginPath();
    g.moveTo(0, 96);
    g.quadraticCurveTo(30, 62, 64, 96);
    g.quadraticCurveTo(98, 70, 128, 96);
    g.fill();
    g.fillStyle = '#ffffff';
    for (const [x, y] of [
      [26, 74],
      [84, 72],
    ]) {
      g.beginPath();
      g.arc(x, y, 5, 0, 7);
      g.arc(x + 7, y - 2, 6, 0, 7);
      g.arc(x + 14, y, 5, 0, 7);
      g.fill();
    }
  });
  SJ_ST.fences.forEach((F, i) => {
    const [road, s0, s1, side] = F,
      fs = F[4] || {};
    const { ox, oz, ang, w, apron } = sjLotFrame([
        road,
        s0,
        s1,
        side,
        { set: fs.set || SJ_ROADS[road].set + 0.35 },
      ]),
      r = lcg(4000 + Math.round(s0 * 10) * 7 + ROAD_KEYS.indexOf(road) * 100003);
    void i;
    const k = vcKit(new Kit(I, ox, oz, ang));
    kits.push(k);
    const meshRun = (x0, x1, z, y0) => {
      const n = Math.max(1, Math.round((x1 - x0) / 2)),
        bw = (x1 - x0) / n;
      k.wallLine(x0, z, x1, z, -0.4, y0 + 1.55);
      for (let j = 0; j < n; j++)
        k.plane(meshTex, bw, 1.5, x0 + (j + 0.5) * bw, y0 + 0.75, z, FRONT, {
          transparent: true,
          double: true,
        });
      for (let j = 0; j <= n; j++)
        k.box(
          x0 + j * bw - 0.03,
          x0 + j * bw + 0.03,
          y0,
          y0 + 1.55,
          z - 0.03,
          z + 0.03,
          '#2f7a52',
          { col: false }
        );
    };
    if (fs.mesh) {
      k.box(0, w, -0.4, 0.35, 0.1, 1.5, '#c9c5ba'); // 花台
      k.box(0.1, w - 0.1, 0.35, 0.7, 0.5, 1.4, '#3f7a3a', { col: false });
      meshRun(0, w, 0.2, 0.35);
    } else {
      k.box(0, w, -0.4, 0.55, 0.2, fs.shrub === 0 ? 0.5 : 1.3, '#c9c5ba'); // 洗石子矮牆（有灌木時是花台）
      if (fs.shrub !== 0) k.box(0.1, w - 0.1, 0.55, 1.1, 0.35, 1.15, '#3f7a3a', { col: false }); // 灌木
      const n = Math.max(1, Math.round(w / (fs.bay || 4))),
        bay = w / n,
        ph = fs.bay ? 1.9 : 2.0,
        pw = fs.bay ? 0.45 : 0.24;
      k.wallLine(0, 0.3, w, 0.3, -0.4, ph);
      for (let j = 0; j <= n; j++) {
        const x = Math.min(w - pw, Math.max(0, j * bay - pw / 2));
        k.box(x, x + pw, 0.55, ph, 0.1, 0.1 + Math.max(0.3, pw), '#a0523a', { col: false });
        k.box(x - 0.03, x + pw + 0.03, ph, ph + 0.08, 0.07, 0.13 + Math.max(0.3, pw), '#e8e6e0', {
          col: false,
        });
      }
      for (let j = 0; j < n; j++)
        k.plane(
          fs.bay ? bars2 : bars,
          bay - pw - 0.1,
          fs.bay ? 1.15 : 1.0,
          (j + 0.5) * bay,
          fs.bay ? 1.15 : 1.35,
          0.3,
          FRONT,
          { transparent: true, double: true }
        );
    }
    for (const [a, b] of fs.mural || []) {
      // 牆外的綠網圍籬加彩繪花台
      const x0 = side > 0 ? a - s0 : s1 - b,
        x1 = side > 0 ? b - s0 : s1 - a;
      k.box(x0, x1, 0, 0.3, -1.0, -0.4, '#2f6fc0');
      meshRun(x0, x1, -0.95, 0.3);
    }
    const inRange = (R, x, m = 0.6) =>
      (R || []).some(([a, b]) => {
        const s = side > 0 ? s0 + x : s1 - x;
        return s > a - m && s < b + m;
      });
    const cone = (x, z) => k.cone(x, z);
    if (fs.bikes)
      for (
        let x = 0.6 + r() * 1.5;
        x < w - 0.8;
        x += 0.75 + (r() < 0.12 ? 1.2 + r() * 2 : r() * 0.15)
      ) {
        // 牆外垂直停的一排機車，偶爾空一格放交通錐
        if (inRange(fs.cones, x)) {
          if (r() < 0.35) cone(x, -1.6);
          continue;
        } // cones [[s0, s1], …]：這幾段不停車，只放交通錐
        const zf = inRange(fs.mural, x) ? -2.75 : -1.9; // 有綠網圍籬的地方機車停在網子外面
        if (r() < 0.06) {
          cone(x, zf + 1.0);
          continue;
        }
        bike(k, x, zf - r() * 0.2, 1, bikeCols[(r() * 6) | 0]);
      }
    const zt = fs.tall ? 2.2 : 0.85;
    for (let x = 4 + r() * 3; x < w - 3; x += (fs.tall ? 5 : 9) + r() * (fs.tall ? 3.5 : 5)) {
      // 大樹：樹幹加幾團樹冠
      const h = fs.tall ? 7 + r() * 2.5 : 5 + r() * 2.5,
        s = fs.tall ? 2.6 + r() * 0.9 : 1.2 + r() * 0.6;
      k.cyl(x, zt, fs.tall ? 0.32 : 0.22, 0, h, '#6a4a30', { seg: 6, col: true });
      const crowns = fs.tall
        ? [
            [0, h + 1.4, 0, 1],
            [-2.4, h - 0.2, 0.8, 0.8],
            [2.5, h + 0.2, 0.4, 0.85],
            [0.4, h + 0.4, -2.2, 0.8],
            [-0.6, h + 0.2, 2.6, 0.75],
          ]
        : [
            [0, h + 0.6, 0, 1],
            [-1.2, h - 0.6, 0.4, 0.8],
            [1.3, h - 0.3, -0.2, 0.85],
          ];
      for (const [dx, dy, dz, q] of crowns) {
        const g = new THREE.SphereGeometry(s * q, 7, 5);
        g.translate(x + dx, dy, zt + dz);
        k._part(VC, paintGeo(g, r() < 0.5 ? '#3f7a3a' : '#4b8a3e'));
      }
    }
    k.box(-0.01, w + 0.01, -0.5, 0.05, -apron, 0, MR.concrete, { col: false, surface: true });
  });
  finishRow(scene, kits);
}
