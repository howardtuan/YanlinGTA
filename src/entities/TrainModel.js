// 縱貫線列車的 3D 模型（src/entities/Trains.js 用）：每節車廂一個 mesh、每種塗裝一份材質（一張 1024×768 貼圖集）。
//
// 本地座標：+z 往前、x 橫向（+x 右側）、y 往上，原點在兩條鋼軌中間的軌面上（車輪踩在 x = ±0.75 的鋼軌上，
// 與 src/world/MapBuilder.js 畫的鋼軌一致）。
// 車身：圓弧車頂、側面微彎的斷面沿車長擠出；駕駛室：同一個斷面往前漸縮（平面上圓角、擋風玻璃往後斜）；
// 底下兩組轉向架（輪子、軸箱、彈簧、側樑）、車底機器箱；車頂冷氣機、電聯車的單臂集電弓；車廂之間的貫通道。
//
// 貼圖集（每種塗裝一張，另一張同排版的自發光圖：夜裡的車窗、LED 看板、頭燈、尾燈）：
//   y   0–256  中間車側面（橫向 = 車長、縱向 = 車底 Y_BOT 到屋簷 Y_EAVE）
//   y 256–512  駕駛室車側面
//   y 512–768  x 0–256 車頭正面、256–512 貫通道端、512–768 車頂、768–1024 色票（4×4 格，零件用單色）
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CAR_L = 19.6; // 車廂長
export const HALF_W = 1.45; // 車身半寬（台鐵車寬約 2.9 m）
export const ROOF = 4.0; // 車頂（含冷氣機）離軌面
export const RAIL_X = 0.75; // 鋼軌離軌道中心
const HL = CAR_L / 2;
const Y_BOT = 1.0; // 車底
const Y_EAVE = 3.45; // 屋簷（側面貼圖的上緣）
const Y_KINK = 1.9; // 駕駛室正面：這高度以上擋風玻璃往後斜
const TW = 1024,
  TH = 768;

// 車身斷面（右半邊，由下往上到車頂中央）
const RIGHT = [
  [1.36, 1.0],
  [1.43, 1.18],
  [1.45, 1.6],
  [1.45, Y_KINK],
  [1.45, 2.6],
  [1.44, 3.1],
  [1.41, Y_EAVE],
  [1.3, 3.63],
  [1.08, 3.75],
  [0.76, 3.82],
  [0.39, 3.855],
  [0, 3.865],
];
// 整圈（從 +z 看逆時針）：右側由下往上、車頂、左側由上往下，最後一段是車底
const RING = [
  ...RIGHT,
  ...RIGHT.slice(0, -1)
    .reverse()
    .map(([x, y]) => [-x, y]),
];

// ---------- 塗裝 ----------
// nose：駕駛室長、slope：擋風玻璃每升高 1 m 往後幾 m、taper：車頭最前端縮窄的比例、drop：車頂往車頭降低多少
// doors：中間車的車門位置（z）、cabDoors：駕駛室車、doorW：門寬、win：窗寬、band：窗帶（null：沒有）
export const LOOK = {
  // 區間車（EMU900 風格）：不鏽鋼車身、深色窗帶、黃藍腰帶、黃色車頭與黃色門框
  local: {
    body: '#e3e7ea',
    band: '#1c2229',
    stripes: [
      ['#f2b705', 1.74, 1.88],
      ['#1f4fa0', 1.63, 1.71],
    ],
    doorFrame: '#f2b705',
    doorLeaf: '#cdd2d6',
    doors: [-6.3, 0, 6.3],
    cabDoors: [-6.3, -0.6, 4.6],
    doorW: 1.3,
    win: 1.5,
    face: '#f4c20d',
    faceLow: '#22262b',
    faceBand: '#22262b',
    sign: '區間',
    nose: 1.15,
    slope: 0.34,
    taper: 0.1,
    drop: 0.1,
    panto: 'mid',
  },
  // 自強號（EMU3000 風格）：白車身、黑窗帶、橘色線條、長流線型車頭
  express: {
    body: '#f1f2f0',
    band: '#1e2226',
    stripes: [['#e8641f', 1.8, 1.9]],
    doorFrame: '#3a3f45',
    doorLeaf: '#e9ebea',
    doors: [-8.4, 8.4],
    cabDoors: [-8.4],
    doorW: 0.95,
    win: 1.05,
    face: '#f1f2f0',
    faceLow: '#1e2226',
    faceBand: '#e8641f',
    sign: '自強',
    nose: 3.1,
    slope: 1.05,
    taper: 0.42,
    drop: 0.32,
    panto: 'mid',
  },
  // 莒光號：橘色客車、米色窗下線、平頭機車頭（機車有集電弓）
  chukuang: {
    body: '#d9622b',
    band: null,
    stripes: [['#f1e3c2', 1.78, 1.92]],
    doorFrame: '#5a2a14',
    doorLeaf: '#d9622b',
    doors: [-8.5, 8.5],
    cabDoors: [-8.5],
    doorW: 0.85,
    win: 1.15,
    face: '#d9622b',
    faceLow: '#2a1e18',
    faceBand: '#f1e3c2',
    sign: '莒光',
    nose: 0.55,
    slope: 0.12,
    taper: 0.05,
    drop: 0.04,
    panto: 'cab',
  },
};

// 色票（貼圖集右下 4×4 格）
const SW = {
  under: 0,
  wheel: 1,
  rubber: 2,
  roof: 3,
  ac: 4,
  panto: 5,
  headOn: 6,
  headOff: 7,
  tailOn: 8,
  tailOff: 9,
  plow: 10,
  face: 11,
  body: 12,
  steel: 13,
  insul: 14,
  glass: 15,
};
const swUV = (i) => [(768 + (i % 4) * 64 + 32) / TW, 1 - (512 + Math.floor(i / 4) * 64 + 32) / TH];

// ---------- 貼圖 ----------
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawAtlas(L) {
  const cv = document.createElement('canvas'),
    em = document.createElement('canvas');
  cv.width = em.width = TW;
  cv.height = em.height = TH;
  const g = cv.getContext('2d'),
    e = em.getContext('2d');
  e.fillStyle = '#000';
  e.fillRect(0, 0, TW, TH);
  const zc = HL - L.nose;
  // ---- 側面 ----
  const side = (row, cab) => {
    const X = (z) => ((z + HL) / CAR_L) * TW,
      Y = (y) => row + ((Y_EAVE - y) / (Y_EAVE - Y_BOT)) * 256;
    const R = (z0, z1, y0, y1) => [X(z0), Y(y1), X(z1) - X(z0), Y(y0) - Y(y1)];
    g.fillStyle = L.body;
    g.fillRect(0, row, TW, 256);
    // 不鏽鋼的細直紋
    g.globalAlpha = 0.05;
    g.fillStyle = '#000';
    for (let x = 0; x < TW; x += 6) g.fillRect(x, row, 1, 256);
    g.globalAlpha = 1;
    if (L.band) {
      g.fillStyle = L.band;
      g.fillRect(...R(-HL, HL, 1.97, 3.02));
    }
    for (const [c, y0, y1] of L.stripes) {
      g.fillStyle = c;
      g.fillRect(...R(-HL, HL, y0, y1));
    }
    // 屋簷的雨水槽、車底的裙邊
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(...R(-HL, HL, 3.36, 3.4));
    g.fillStyle = '#2a2d31';
    g.fillRect(...R(-HL, HL, Y_BOT, 1.1));
    const doors = cab ? L.cabDoors : L.doors;
    const zEnd = cab ? zc - 2.0 : HL; // 客室範圍
    // 窗：門與門之間平均排
    const glass = (z0, z1, y0, y1, lit = 1) => {
      const [x, y, w, h] = R(z0, z1, y0, y1);
      g.fillStyle = '#5b636b';
      rr(g, x - 2, y - 2, w + 4, h + 4, 5);
      g.fill();
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, '#46525e');
      gr.addColorStop(0.45, '#26303a');
      gr.addColorStop(1, '#1b2229');
      g.fillStyle = gr;
      rr(g, x, y, w, h, 4);
      g.fill();
      // 天空的反光
      g.fillStyle = 'rgba(200,220,235,0.12)';
      g.beginPath();
      g.moveTo(x + w * 0.15, y);
      g.lineTo(x + w * 0.45, y);
      g.lineTo(x + w * 0.2, y + h);
      g.lineTo(x - w * 0.1 > x ? x : x, y + h);
      g.closePath();
      g.fill();
      e.fillStyle = lit ? '#e6d2a6' : '#000';
      rr(e, x, y, w, h, 4);
      e.fill();
    };
    const half = L.doorW / 2 + 0.12;
    const gaps = [];
    let z = -HL + 0.55;
    for (const d of [...doors].sort((a, b) => a - b)) {
      gaps.push([z, d - half - 0.25]);
      z = d + half + 0.25;
    }
    gaps.push([z, zEnd - 0.55]);
    for (const [a, b] of gaps) {
      const n = Math.max(0, Math.round((b - a + 0.2) / (L.win + 0.2)));
      if (!n) continue;
      const w = (b - a - (n - 1) * 0.2) / n;
      for (let i = 0; i < n; i++) {
        const z0 = a + i * (w + 0.2);
        glass(z0, z0 + w, 2.05, 2.95);
      }
    }
    // 車門：門框、兩扇門、門上的窗、中間的縫
    for (const d of doors) {
      const h = L.doorW / 2;
      g.fillStyle = L.doorFrame;
      g.fillRect(...R(d - h - 0.1, d + h + 0.1, 1.08, 3.14));
      g.fillStyle = L.doorLeaf;
      g.fillRect(...R(d - h, d + h, 1.1, 3.06));
      glass(d - h + 0.1, d - 0.06, 2.1, 2.92);
      glass(d + 0.06, d + h - 0.1, 2.1, 2.92);
      g.fillStyle = '#3c4146';
      g.fillRect(...R(d - 0.012, d + 0.012, 1.1, 3.06));
    }
    // 側面的 LED 看板（第一個門旁）
    {
      const d = doors[Math.floor(doors.length / 2)] ?? 0,
        z0 = d + L.doorW / 2 + 0.35;
      const [x, y, w, h] = R(z0, z0 + 0.95, 3.1, 3.3);
      g.fillStyle = '#0c0d0e';
      g.fillRect(x, y, w, h);
      for (const c of [g, e]) {
        c.fillStyle = '#ff9a1a';
        c.font = `bold ${Math.round(h * 0.8)}px sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(`${L.sign} 中壢`, x + w / 2, y + h / 2 + 1);
      }
    }
    if (cab) {
      // 乘務員門、駕駛室側窗，最前面一段漆成車頭的顏色
      g.fillStyle = L.doorFrame;
      g.fillRect(...R(zc - 1.75, zc - 1.0, 1.15, 3.1));
      g.fillStyle = L.doorLeaf;
      g.fillRect(...R(zc - 1.7, zc - 1.05, 1.17, 3.06));
      glass(zc - 1.62, zc - 1.13, 2.15, 2.92, 0);
      g.fillStyle = L.face;
      g.fillRect(...R(zc - 0.85, HL, 1.1, Y_EAVE));
      g.fillStyle = L.faceLow;
      g.fillRect(...R(zc - 0.85, HL, 1.1, 1.3));
      glass(zc - 0.75, zc - 0.08, 2.05, 2.98, 0);
    }
  };
  side(0, false);
  side(256, true);
  // ---- 車頭正面（x：-HALF_W…HALF_W，y：0.9…3.95）----
  const FX = (x) => (0.5 + (0.5 * x) / HALF_W) * 256,
    FY = (y) => 512 + ((3.95 - y) / 3.05) * 256;
  g.fillStyle = L.face;
  g.fillRect(0, 512, 256, 256);
  g.fillStyle = '#8e9398';
  g.fillRect(0, 512, 256, FY(3.62) - 512);
  g.fillStyle = L.faceLow;
  g.fillRect(0, FY(1.3), 256, FY(0.9) - FY(1.3));
  g.fillStyle = L.faceBand;
  rr(g, FX(-1.3), FY(1.82), FX(1.3) - FX(-1.3), FY(1.36) - FY(1.82), 6);
  g.fill();
  {
    // 擋風玻璃（頂端有 LED 看板）
    const x = FX(-1.2),
      y = FY(3.4),
      w = FX(1.2) - x,
      h = FY(2.0) - y;
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#2c3742');
    gr.addColorStop(0.5, '#141a20');
    gr.addColorStop(1, '#0d1115');
    g.fillStyle = '#0a0c0e';
    rr(g, x - 3, y - 3, w + 6, h + 6, 12);
    g.fill();
    g.fillStyle = gr;
    rr(g, x, y, w, h, 10);
    g.fill();
    g.fillStyle = 'rgba(210,225,240,0.10)';
    g.fillRect(x + w * 0.1, y + 4, w * 0.25, h - 8);
    const sy = FY(3.32),
      sh = FY(3.12) - sy;
    for (const c of [g, e]) {
      c.fillStyle = '#ff9a1a';
      c.font = `bold ${Math.round(sh * 0.85)}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`${L.sign}  中壢`, 128, sy + sh / 2 + 1);
    }
    // 雨刷
    g.strokeStyle = '#050607';
    g.lineWidth = 2;
    for (const sx of [-0.55, 0.45]) {
      g.beginPath();
      g.moveTo(FX(sx), FY(2.05));
      g.lineTo(FX(sx + 0.35), FY(2.6));
      g.stroke();
    }
  }
  // ---- 貫通道端 ----
  g.fillStyle = L.body;
  g.fillRect(256, 512, 256, 256);
  g.fillStyle = '#8e9398';
  g.fillRect(256, 512, 256, FY(3.5) - 512);
  g.fillStyle = '#2a2d31';
  g.fillRect(256, FY(1.1), 256, FY(0.9) - FY(1.1));
  g.fillStyle = '#34383d';
  g.fillRect(256 + FX(-0.6), FY(3.2), FX(0.6) - FX(-0.6), FY(1.1) - FY(3.2));
  // ---- 車頂 ----
  g.fillStyle = '#8e9398';
  g.fillRect(512, 512, 256, 256);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 512; x < 768; x += 13) g.fillRect(x, 512, 2, 256);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(512, 512 + 100, 256, 56); // 中央走道
  // ---- 色票 ----
  const swatch = [
    ['#2b2e32', '#000'], // under
    ['#55585b', '#000'], // wheel
    ['#1d1f21', '#000'], // rubber
    ['#8e9398', '#000'], // roof
    ['#b6bbbf', '#000'], // ac
    ['#33373c', '#000'], // panto
    ['#fffdf2', '#ffffff'], // headOn
    ['#c9cbc6', '#000'], // headOff
    ['#ff3020', '#ff2010'], // tailOn
    ['#5a1410', '#000'], // tailOff
    ['#34383d', '#000'], // plow
    [L.face, '#000'], // face
    [L.body, '#000'], // body
    ['#6a6e72', '#000'], // steel
    ['#d8d0bc', '#000'], // insul
    ['#11161b', '#000'], // glass
  ];
  swatch.forEach(([c, ec], i) => {
    const x = 768 + (i % 4) * 64,
      y = 512 + Math.floor(i / 4) * 64;
    g.fillStyle = c;
    g.fillRect(x, y, 64, 64);
    e.fillStyle = ec;
    e.fillRect(x, y, 64, 64);
  });
  const t = (c) => {
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 4;
    return tx;
  };
  return { map: t(cv), em: t(em) };
}

export function carMaterial(look) {
  const t = drawAtlas(LOOK[look]);
  return new THREE.MeshStandardMaterial({
    map: t.map,
    emissiveMap: t.em,
    emissive: '#ffffff',
    emissiveIntensity: 0.06,
    roughness: 0.42,
    metalness: 0.3,
  });
}

// ---------- 幾何 ----------
class Builder {
  constructor() {
    this.P = [];
    this.N = [];
    this.U = [];
    this.parts = [];
  }
  // 三角形 a b c（逆時針為正面）；n：各頂點法線（省略：用面法線）
  tri(a, b, c, ua, ub, uc, na, nb, nc) {
    if (!na) {
      const n = new THREE.Vector3()
        .subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
        .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a)))
        .normalize();
      na = nb = nc = [n.x, n.y, n.z];
    }
    this.P.push(...a, ...b, ...c);
    this.N.push(...na, ...nb, ...nc);
    this.U.push(...ua, ...ub, ...uc);
  }
  quad(a, b, c, d, ua, ub, uc, ud, na, nb, nc, nd) {
    this.tri(a, b, c, ua, ub, uc, na, nb, nc);
    this.tri(a, c, d, ua, uc, ud, na, nc, nd);
  }
  // three.js 的基本形狀：套上矩陣，整個貼同一格色票
  add(geo, m, sw) {
    const gg = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(m);
    const uv = swUV(sw),
      n = gg.attributes.position.count;
    const u = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      u[i * 2] = uv[0];
      u[i * 2 + 1] = uv[1];
    }
    gg.setAttribute('uv', new THREE.BufferAttribute(u, 2));
    for (const k of Object.keys(gg.attributes))
      if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k);
    this.parts.push(gg);
  }
  box(x, y, z, sx, sy, sz, sw, ry = 0) {
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    this.add(new THREE.BoxGeometry(sx, sy, sz), m, sw);
  }
  // 圓柱：axis 'x' | 'y' | 'z'
  cyl(x, y, z, r, len, axis, sw, seg = 10) {
    const m = new THREE.Matrix4();
    if (axis === 'x') m.makeRotationZ(Math.PI / 2);
    else if (axis === 'z') m.makeRotationX(Math.PI / 2);
    m.setPosition(x, y, z);
    this.add(new THREE.CylinderGeometry(r, r, len, seg), m, sw);
  }
  // 細桿：從 a 到 b、截面 t×t
  beam(a, b, t, sw) {
    const A = new THREE.Vector3(...a),
      B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const m = new THREE.Matrix4().lookAt(A, B, new THREE.Vector3(1, 0, 0));
    m.setPosition(A.clone().add(B).multiplyScalar(0.5));
    this.add(new THREE.BoxGeometry(t, t, len), m, sw);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2));
    const all = mergeGeometries([g, ...this.parts]);
    for (const p of this.parts) p.dispose();
    g.dispose();
    all.computeBoundingSphere();
    all.computeBoundingBox();
    return all;
  }
}

// 斷面每一段屬於哪一類：側面、車頂、車底
const segClass = (a, b) =>
  a[1] === Y_BOT && b[1] === Y_BOT
    ? 'under'
    : Math.max(a[1], b[1]) <= Y_EAVE + 1e-6
      ? 'side'
      : 'roof';
// 2D 段法線（往外）
const segN = (a, b) => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = Math.hypot(dx, dy) || 1;
  return [dy / l, -dx / l];
};

// 貼圖座標
const sideUV = (row, z, y) => [
  (z + HL) / CAR_L,
  1 - (row + ((Y_EAVE - y) / (Y_EAVE - Y_BOT)) * 256) / TH,
];
const roofUV = (z, x) => [
  (512 + ((z + HL) / CAR_L) * 256) / TW,
  1 - (512 + (0.5 + (0.5 * x) / HALF_W) * 256) / TH,
];
const faceUV = (x, y, end = false) => [
  ((end ? 256 : 0) + (0.5 + (0.5 * x) / HALF_W) * 256) / TW,
  1 - (512 + ((3.95 - Math.max(0.9, Math.min(3.95, y))) / 3.05) * 256) / TH,
];

// 車身：斷面從 z0 擠出到 z1（row：側面貼圖用哪一排）
function extrude(B, z0, z1, row) {
  const n = RING.length;
  for (let i = 0; i < n; i++) {
    const a = RING[i],
      b = RING[(i + 1) % n],
      cls = segClass(a, b);
    const ns = segN(a, b);
    // 同一類的相鄰段平均法線（車身圓滑），不同類之間保留稜線
    // 鄰段 (p → q) 與這段同類時，頂點法線取兩段的平均
    const vn = (p, q) => {
      if (segClass(p, q) !== cls) return ns;
      const s = segN(p, q),
        k = [ns[0] + s[0], ns[1] + s[1]],
        l = Math.hypot(...k) || 1;
      return [k[0] / l, k[1] / l];
    };
    const na = vn(RING[(i - 1 + n) % n], a),
      nb = vn(b, RING[(i + 2) % n]);
    const N3 = (v) => [v[0], v[1], 0];
    const uv = (p, z) =>
      cls === 'side' ? sideUV(row, z, p[1]) : cls === 'roof' ? roofUV(z, p[0]) : swUV(SW.under);
    B.quad(
      [a[0], a[1], z0],
      [b[0], b[1], z0],
      [b[0], b[1], z1],
      [a[0], a[1], z1],
      uv(a, z0),
      uv(b, z0),
      uv(b, z1),
      uv(a, z1),
      N3(na),
      N3(nb),
      N3(nb),
      N3(na)
    );
  }
}

// 車廂一端的平面（貫通道端），s：+1 朝前、-1 朝後
function endCap(B, z, s) {
  const m = RIGHT.length;
  for (let i = 0; i < m - 1; i++) {
    const [x0, y0] = RIGHT[i],
      [x1, y1] = RIGHT[i + 1];
    const Lp = [-x0, y0, z],
      Rp = [x0, y0, z],
      R1 = [x1, y1, z],
      L1 = [-x1, y1, z];
    const u = (p) => faceUV(p[0] * s, p[1], true);
    if (s > 0) B.quad(Lp, Rp, R1, L1, u(Lp), u(Rp), u(R1), u(L1));
    else B.quad(Rp, Lp, L1, R1, u(Rp), u(Lp), u(L1), u(R1));
  }
}

// 駕駛室：斷面往前漸縮成車頭，前端在 z = HL
function cabNose(B, L) {
  const zc = HL - L.nose,
    J = 6;
  const tf = (p, t) => {
    const [x, y] = p;
    const sx = 1 - L.taper * t * t * t;
    const k = Math.min(1, Math.max(0, (y - 2.8) / 1.07));
    return [
      x * sx,
      y - L.drop * t * t * k,
      zc + L.nose * t - L.slope * Math.max(0, y - Y_KINK) * t,
    ];
  };
  const n = RING.length;
  const G = [];
  for (let j = 0; j <= J; j++) G.push(RING.map((p) => tf(p, j / J)));
  // 平滑法線：累加相鄰面的法線（車底那段不算）
  const acc = G.map((r) => r.map(() => new THREE.Vector3()));
  const V = (p) => new THREE.Vector3(...p);
  const faceN = (a, b, c) =>
    V(b)
      .sub(V(a))
      .cross(V(c).sub(V(a)));
  for (let j = 0; j < J; j++)
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      if (segClass(RING[i], RING[i2]) === 'under') continue;
      const f = faceN(G[j][i], G[j][i2], G[j + 1][i2]).add(
        faceN(G[j][i], G[j + 1][i2], G[j + 1][i])
      );
      for (const [jj, ii] of [
        [j, i],
        [j, i2],
        [j + 1, i],
        [j + 1, i2],
      ])
        acc[jj][ii].add(f);
    }
  const nn = (j, i) => {
    const v = acc[j][i].clone().normalize();
    return [v.x, v.y, v.z];
  };
  for (let j = 0; j < J; j++)
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      const a = G[j][i],
        b = G[j][i2],
        c = G[j + 1][i2],
        d = G[j + 1][i];
      if (segClass(RING[i], RING[i2]) === 'under') {
        const u = swUV(SW.under);
        B.quad(a, b, c, d, u, u, u, u);
        continue;
      }
      const u = (k) => faceUV(RING[k][0], RING[k][1]);
      B.quad(
        a,
        b,
        c,
        d,
        u(i),
        u(i2),
        u(i2),
        u(i),
        nn(j, i),
        nn(j, i2),
        nn(j + 1, i2),
        nn(j + 1, i)
      );
    }
  // 正面
  const front = RIGHT.map((p) => tf(p, 1));
  for (let i = 0; i < RIGHT.length - 1; i++) {
    const R0 = front[i],
      R1 = front[i + 1];
    const L0 = [-R0[0], R0[1], R0[2]],
      L1 = [-R1[0], R1[1], R1[2]];
    const o0 = RIGHT[i],
      o1 = RIGHT[i + 1];
    B.quad(
      L0,
      R0,
      R1,
      L1,
      faceUV(-o0[0], o0[1]),
      faceUV(o0[0], o0[1]),
      faceUV(o1[0], o1[1]),
      faceUV(-o1[0], o1[1])
    );
  }
  return { front: HALF_W * (1 - L.taper) };
}

// 轉向架（中心 z0）
function bogie(B, z0) {
  for (const dz of [-1.05, 1.05]) {
    for (const sx of [-1, 1]) {
      B.cyl(sx * RAIL_X, 0.43, z0 + dz, 0.43, 0.12, 'x', SW.wheel, 16);
      B.cyl(sx * (RAIL_X - 0.08), 0.43, z0 + dz, 0.47, 0.03, 'x', SW.under, 16); // 輪緣
      B.box(sx * 1.0, 0.43, z0 + dz, 0.22, 0.24, 0.32, SW.under); // 軸箱
      B.cyl(sx * 1.0, 0.66, z0 + dz, 0.09, 0.22, 'y', SW.steel, 6); // 彈簧
    }
    B.cyl(0, 0.43, z0 + dz, 0.07, 2.0, 'x', SW.steel, 6); // 車軸
  }
  for (const sx of [-1, 1]) B.box(sx * 1.0, 0.82, z0, 0.18, 0.22, 2.9, SW.under); // 側樑
  B.box(0, 0.72, z0, 2.0, 0.2, 0.55, SW.under); // 橫樑
  B.box(0, 0.93, z0, 2.3, 0.12, 0.7, SW.steel); // 枕樑
  B.box(0, 0.55, z0 + 0.5, 0.8, 0.35, 0.5, SW.under); // 馬達／齒輪箱
}

function underfloor(B) {
  for (const [z0, z1, y0, hx] of [
    [-5.0, -2.7, 0.52, 1.12],
    [-2.4, -0.5, 0.62, 0.92],
    [-0.2, 2.6, 0.5, 1.16],
    [2.9, 5.0, 0.64, 1.02],
  ])
    B.box(0, (y0 + Y_BOT) / 2, (z0 + z1) / 2, hx * 2, Y_BOT - y0, z1 - z0, SW.under);
  B.cyl(0.55, 0.78, 0, 0.16, 3.8, 'z', SW.steel, 8); // 風缸
}

function acUnit(B, z) {
  B.box(0, 3.93, z, 1.75, 0.3, 2.6, SW.ac);
  B.box(0, 4.1, z, 1.4, 0.06, 2.2, SW.roof);
  for (const s of [-1, 1]) B.cyl(s * 0.45, 4.13, z, 0.28, 0.04, 'y', SW.rubber, 10); // 風扇
}

function pantograph(B, z0) {
  B.box(0, 3.98, z0, 1.1, 0.07, 1.4, SW.panto); // 底座
  for (const sx of [-0.45, 0.45])
    for (const sz of [-0.55, 0.55]) B.cyl(sx, 3.92, z0 + sz, 0.06, 0.14, 'y', SW.insul, 6); // 礙子
  const base = [0, 4.02, z0 - 0.55],
    knee = [0, 4.62, z0 + 0.75],
    head = [0, 5.25, z0 - 0.1];
  for (const sx of [-0.12, 0.12])
    B.beam([sx, base[1], base[2]], [sx, knee[1], knee[2]], 0.06, SW.panto);
  B.beam(knee, head, 0.05, SW.panto);
  B.beam([0, 4.05, z0 - 0.3], [0, 4.5, z0 + 0.45], 0.03, SW.panto); // 平衡桿
  B.box(0, head[1] + 0.03, head[2], 1.6, 0.05, 0.22, SW.steel); // 弓頭
  for (const s of [-1, 1])
    B.beam([s * 0.8, head[1] + 0.03, head[2]], [s * 0.98, head[1] - 0.12, head[2]], 0.04, SW.panto);
}

// kind：'head' 車頭（頭燈亮）、'tail' 車尾（尾燈亮；擺的時候整節轉 180°）、'mid' 中間車、'midP' 有集電弓的中間車
export function carGeometry(look, kind) {
  const L = LOOK[look],
    B = new Builder();
  const cab = kind === 'head' || kind === 'tail';
  const zc = cab ? HL - L.nose : HL;
  extrude(B, -HL, zc, cab ? 256 : 0);
  // 車底面（擠出那圈的最後一段已經是車底）；兩端
  endCap(B, -HL, -1);
  B.box(0, 2.15, -HL - 0.125, 1.25, 2.1, 0.25, SW.rubber); // 貫通道（往後）
  if (cab) {
    const { front } = cabNose(B, L);
    // 頭燈、尾燈（車頭／車尾兩種只差在哪一組亮）
    const hx = front * 0.6,
      tx = front * 0.84;
    for (const s of [-1, 1]) {
      B.cyl(s * hx, 1.58, HL + 0.02, 0.13, 0.08, 'z', kind === 'head' ? SW.headOn : SW.headOff, 14);
      B.cyl(s * tx, 1.58, HL + 0.02, 0.08, 0.06, 'z', kind === 'tail' ? SW.tailOn : SW.tailOff, 10);
    }
    // 排障器（V 字形兩片）與車鉤
    const pw = Math.min(1.3, front + 0.05),
      a = 0.35;
    for (const s of [-1, 1])
      B.box(
        s * (pw / 2) * Math.cos(a),
        0.6,
        HL + 0.1 - (pw / 2) * Math.sin(a),
        pw,
        0.72,
        0.08,
        SW.plow,
        s * a
      );
    B.box(0, 0.98, HL - 0.25, front * 2 - 0.1, 0.12, 0.6, SW.under);
    B.box(0, 0.88, HL + 0.15, 0.2, 0.2, 0.6, SW.steel);
    B.box(0, 0.88, HL + 0.48, 0.32, 0.26, 0.14, SW.steel);
  } else {
    endCap(B, HL, 1);
    B.box(0, 2.15, HL + 0.125, 1.25, 2.1, 0.25, SW.rubber);
  }
  bogie(B, -6.9);
  bogie(B, 6.9);
  underfloor(B);
  // 車頂：冷氣機、集電弓
  const panto = (kind === 'midP' && L.panto === 'mid') || (cab && L.panto === 'cab');
  if (cab) {
    acUnit(B, -5.4);
    if (panto) pantograph(B, 1.6);
    else acUnit(B, 1.8);
  } else {
    acUnit(B, 4.6);
    if (panto) pantograph(B, -4.6);
    else acUnit(B, -4.6);
  }
  return B.geometry();
}
