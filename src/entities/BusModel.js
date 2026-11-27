// 市區公車（低地板）：src/systems/Buses.js 照實際路線開的公車外觀。
// 車長 11.6 m、寬 2.5 m、高 3.1 m（車頂冷氣 3.35 m）；本地座標 +z 往前、+x 是車的左邊（右邊 -x 是上下車那側，台灣靠右行駛）。
// - 塗裝：上半白、下半一個主色、窗下一條飾帶（每條路線一組配色，src/systems/BusRoutes.js livery），不放任何客運公司的商標或名稱
// - LED 看板：車頭（路線號碼＋終點）、右側前門後面的車窗裡（路線號碼＋終點）、車尾（路線號碼），琥珀色點陣字；
//   換路線時 setSign() 重畫同一張畫布。看板標成會動的零件，遠處簡化模型（src/entities/Vehicles.js lod）照樣畫它們
// - 車門：右側前門、中門各兩片外推式車門，open01() 0 關 1 開（src/systems/Buses.js 到站時開門）
import * as THREE from 'three';
import { scaledCanvas } from '../graphics/GpuMemLifecycle.js';

const MC = {};
const mat = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }));
};
const GB = {};
const boxGeo = (w, h, d) => {
  const k = `${w}|${h}|${d}`;
  return GB[k] || (GB[k] = new THREE.BoxGeometry(w, h, d));
};
function box(g, w, h, d, m, x, y, z) {
  const o = new THREE.Mesh(boxGeo(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = w * h * d > 0.05;
  g.add(o);
  return o;
}

export const BUS = {
  L: 11.6,
  W: 2.5,
  H: 3.1,
  front: 5.8, // 車頭在 +z
  axleF: 3.25,
  axleR: -2.75,
  doorF: 4.6, // 前門中心（z）
  doorM: 0.1, // 中門中心
  doorW: 1.2,
};

// 琥珀色點陣 LED：先用字型畫，再蓋一層點格（看起來是一顆一顆的燈）
function drawLed(g, w, h, route, dest) {
  g.fillStyle = '#0b0b0c';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffae1a';
  g.textBaseline = 'middle';
  const num = String(route || '');
  let x = 10;
  if (num) {
    const fs = h * 0.86;
    g.font = `900 ${fs}px system-ui, sans-serif`;
    const nw = Math.min(g.measureText(num).width, dest ? w * 0.34 : w - 20);
    g.textAlign = 'left';
    if (dest) g.fillText(num, x, h * 0.54, nw);
    else {
      g.textAlign = 'center';
      g.fillText(num, w / 2, h * 0.54, w - 20);
    }
    x += nw + 16;
  }
  if (dest) {
    let fs = h * 0.62;
    g.font = `800 ${fs}px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
    while (g.measureText(dest).width > w - x - 8 && fs > h * 0.3) {
      fs -= 2;
      g.font = `800 ${fs}px "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
    }
    g.textAlign = 'center';
    g.fillText(dest, (x + w - 6) / 2, h * 0.54);
  }
  // 點格：每 4 px 一顆燈，燈與燈之間是黑線
  g.fillStyle = 'rgba(11,11,12,0.78)';
  for (let i = 0; i < w; i += 4) g.fillRect(i, 0, 1, h);
  for (let j = 0; j < h; j += 4) g.fillRect(0, j, w, 1);
}
function ledPanel(w, h, cw, ch) {
  const { cv, g } = scaledCanvas(cw, ch);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({
    color: '#000000',
    emissive: '#ffffff',
    emissiveMap: t,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.userData.dynamic = true; // 遠處也照樣畫（不被烤進遠處的單色模型）
  mesh.castShadow = false;
  return {
    mesh,
    draw(route, dest) {
      if (!g) return;
      drawLed(g, cw, ch, route, dest);
      t.needsUpdate = true;
    },
  };
}

// livery: { upper, lower, stripe }；route / dest：看板文字
export function buildCityBus(livery = {}, route = '', dest = '') {
  const L = livery,
    g = new THREE.Group();
  const upper = mat(L.upper || '#f2f2ee', { roughness: 0.35, metalness: 0.25 }),
    lower = mat(L.lower || '#1f7a5a', { roughness: 0.35, metalness: 0.25 }),
    stripe = mat(L.stripe || '#f2b134', { roughness: 0.4 }),
    glass = mat('#1b2730', { roughness: 0.08, metalness: 0.55 }),
    black = mat('#1c1d20', { roughness: 0.8 }),
    grey = mat('#8c9197', { roughness: 0.6, metalness: 0.3 }),
    rubber = mat('#151515', { roughness: 0.95 });
  const { W, front: F } = BUS,
    hw = W / 2,
    R = -5.8; // 車尾
  const len = F - R,
    zc = (F + R) / 2;
  // 車身：低地板，裙板 0.3 m 起
  box(g, W, 0.78, len, lower, 0, 0.3 + 0.39, zc); // 下半（主色）
  box(g, W + 0.01, 0.12, len - 0.1, stripe, 0, 1.08 + 0.06, zc); // 飾帶
  box(g, W - 0.04, 1.3, len - 0.2, glass, 0, 1.2 + 0.65, zc); // 車窗帶（內縮一點，柱子蓋在外面）
  box(g, W, 0.6, len, upper, 0, 2.5 + 0.3, zc); // 上半
  box(g, W - 0.1, 0.06, len - 0.2, upper, 0, 3.12, zc); // 車頂
  // 窗柱：兩側，避開車門
  const doorAt = (z) => Math.abs(z - BUS.doorF) < 0.75 || Math.abs(z - BUS.doorM) < 0.75;
  for (let z = R + 0.35; z <= F - 0.5; z += 1.42)
    for (const s of [1, -1]) {
      if (s < 0 && doorAt(z)) continue;
      box(g, 0.05, 1.3, 0.14, upper, s * (hw - 0.0), 1.85, z);
    }
  // 左側車窗下緣、右側（車門那側）車門以外的部分也一樣，所以兩側都有下緣條
  for (const s of [1, -1]) box(g, 0.04, 0.06, len - 0.2, black, s * hw, 1.2, zc);
  // 輪拱（黑色半框）＋車輪
  const wheels = [];
  const wg = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 16).rotateZ(Math.PI / 2),
    hg = new THREE.CylinderGeometry(0.28, 0.28, 0.33, 10).rotateZ(Math.PI / 2);
  for (const z of [BUS.axleF, BUS.axleR])
    for (const s of [1, -1]) {
      box(g, 0.04, 0.62, 1.32, black, s * (hw + 0.005), 0.6, z);
      const w = new THREE.Mesh(wg, rubber);
      w.position.set(s * (hw - 0.22), 0.5, z);
      w.castShadow = true;
      w.add(new THREE.Mesh(hg, grey));
      g.add(w);
      wheels.push(w);
    }
  // 車頭：大片擋風玻璃、黑框、保險桿、頭燈、LED 看板、兔耳後照鏡
  box(g, W - 0.1, 1.62, 0.05, glass, 0, 0.95 + 0.81, F + 0.01);
  box(g, W, 0.12, 0.06, black, 0, 2.6, F + 0.01);
  box(g, W, 0.36, 0.08, black, 0, 0.42, F + 0.03); // 保險桿
  const hl = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#fff4d6',
    emissiveIntensity: 1,
  });
  for (const s of [1, -1]) {
    box(g, 0.42, 0.16, 0.04, hl, s * 0.88, 0.78, F + 0.04);
    box(g, 0.24, 0.04, 0.04, black, s * (hw + 0.1), 2.6, F - 0.05); // 後照鏡支架（從車頂角往外再往前）
    box(g, 0.04, 0.04, 0.42, black, s * (hw + 0.2), 2.6, F + 0.14);
    box(g, 0.05, 0.3, 0.16, black, s * (hw + 0.2), 2.42, F + 0.33); // 鏡面
  }
  const fSign = ledPanel(2.0, 0.3, 512, 80);
  fSign.mesh.position.set(0, 2.82, F + 0.02);
  g.add(fSign.mesh);
  // 車尾：小後窗、尾燈、引擎散熱格柵、路線號碼看板
  box(g, W - 0.6, 0.55, 0.04, glass, 0, 2.3, R - 0.01);
  box(g, W, 0.34, 0.08, black, 0, 0.42, R - 0.03);
  box(g, 1.6, 0.5, 0.03, black, 0, 0.95, R - 0.02);
  const tl = new THREE.MeshStandardMaterial({
    color: '#700',
    emissive: '#ff1a1a',
    emissiveIntensity: 0.7,
  });
  for (const s of [1, -1]) box(g, 0.14, 0.5, 0.04, tl, s * 1.08, 0.95, R - 0.03);
  const rSign = ledPanel(0.7, 0.3, 160, 64);
  rSign.mesh.position.set(0, 2.82, R - 0.02);
  rSign.mesh.rotation.y = Math.PI;
  g.add(rSign.mesh);
  // 右側（-x）車窗裡的看板：前門後面
  const sSign = ledPanel(1.5, 0.3, 400, 80);
  sSign.mesh.position.set(-hw - 0.01, 2.2, BUS.doorF - 1.55);
  sSign.mesh.rotation.y = -Math.PI / 2;
  g.add(sSign.mesh);
  // 車頂冷氣
  box(g, 1.7, 0.24, 2.6, mat('#d9dbdc', { roughness: 0.6 }), 0, 3.27, 0.8);
  // 車門：右側（-x），每個門兩片，玻璃＋框
  const doors = [];
  const dw = BUS.doorW / 2;
  for (const zc0 of [BUS.doorF, BUS.doorM]) {
    box(g, 0.03, 2.2, BUS.doorW + 0.12, black, -hw + 0.02, 0.3 + 1.1, zc0); // 門洞（開門時看到的內側）
    for (const k of [-1, 1]) {
      const leaf = new THREE.Group();
      box(leaf, 0.05, 2.1, dw - 0.02, glass, 0, 0, 0);
      box(leaf, 0.06, 2.12, 0.06, grey, 0, 0, (k * (dw - 0.04)) / 2); // 門框（銀灰色，開門時看得出門片滑開）
      box(leaf, 0.06, 2.12, 0.06, grey, 0, 0, (-k * (dw - 0.04)) / 2);
      box(leaf, 0.06, 0.06, dw, grey, 0, 0.5, 0);
      const z0 = zc0 + (k * dw) / 2;
      leaf.position.set(-hw - 0.01, 0.32 + 1.05, z0);
      leaf.userData.dynamic = true;
      leaf.userData.z0 = z0;
      leaf.userData.k = k;
      g.add(leaf);
      doors.push(leaf);
    }
  }
  g.userData.wheels = wheels;
  g.userData.doors = doors;
  const bus = g.userData;
  bus.setSign = (r, d) => {
    fSign.draw(r, d);
    sSign.draw(r, d);
    rSign.draw(r, '');
  };
  // 0 關、1 開：外推（往外 0.14 m）再往兩側滑開
  bus.open01 = (t) => {
    const a = Math.min(1, t * 2.2),
      b = Math.max(0, Math.min(1, (t - 0.25) / 0.75));
    for (const d of doors) {
      d.position.x = -hw - 0.01 - 0.14 * a;
      d.position.z = d.userData.z0 + d.userData.k * dw * 0.82 * b;
    }
  };
  bus.setSign(route, dest);
  return g;
}
