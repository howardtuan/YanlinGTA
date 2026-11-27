// 249巷（SegQ1）與 249巷11弄（SegQ2）共用的小工具：斜角轉角樓的多邊形量體、立面窗、鐵窗、樹、鐵絲網圍籬。
// 兩條巷子斜交約 30°，轉角那棟的兩面各貼著一條巷子，用一般的長方形街屋格子會有一角伸到路上，所以轉角樓照兩條立面線的交點做成多邊形。
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const NC = { col: false };

// 對著街的 Kit（C.kit 的原點在 s0 那端的立面線；side -1 的 +x 朝 s 變小），W 是寬度、sx(s) 是 s 換成 x
export const seg = (C, ref, side, s0, s1, set) => {
  const k = C.kit(ref, s0, s1, side, set);
  k.W = s1 - s0;
  delete k.w;
  k.sx = (s) => (side > 0 ? s - s0 : s1 - s);
  return k;
};

// 世界座標多邊形 pts 的直立量體（-0.8 到 top，地面有坡也不會露縫），屋頂一片灰色平板，每條邊加碰撞牆。
// ExtrudeGeometry 沒有 index，finishRow 合併時會和有 index 的方塊衝突，先 mergeVertices 補上 index
export function polyBlock(C, k, pts, top, hex, roofHex = '#9a9a94') {
  const L = pts.map(([x, z]) => k.l(x, z));
  const prism = (y0, y1, col) => {
    const sh = new C.THREE.Shape(L.map(([x, z]) => new C.THREE.Vector2(x, -z)));
    let g = new C.THREE.ExtrudeGeometry(sh, {
      depth: y1 - y0,
      bevelEnabled: false,
      curveSegments: 1,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    g = mergeVertices(g);
    g.computeVertexNormals();
    k._part(C.VC, C.paintGeo(g, col));
  };
  prism(-0.8, top, hex);
  prism(top, top + 0.15, roofHex);
  for (let i = 0; i < L.length; i++) {
    const [x0, z0] = L[i],
      [x1, z1] = L[(i + 1) % L.length];
    k.wallLine(x0, z0, x1, z1, -0.8, top);
  }
  return L;
}

// 一層一排窗（grille 鐵窗或鋁窗），x0～x1 之間平均放 n 扇
export const winRow = (C, k, x0, x1, y, n, ww = 1.3, h = 1.25, grille = true) => {
  const step = (x1 - x0) / n;
  for (let j = 0; j < n; j++) C.win(k, x0 + step * (j + 0.5), y, ww, h, grille);
};

// 凸出牆面的白色鐵窗籠（老公寓常見）：外框＋直條
export const cage = (C, k, x0, x1, y0, y1, out = 0.45, hex = '#e8e8e2') => {
  k.box(x0, x1, y0, y0 + 0.06, -out, 0, hex, NC);
  k.box(x0, x1, y1 - 0.06, y1, -out, 0, hex, NC);
  for (let x = x0; x <= x1 + 0.01; x += 0.16)
    k.box(x, x + 0.025, y0, y1, -out, -out + 0.03, hex, NC);
};

// 一棵樹：樹幹（有碰撞）＋幾團樹冠
export const tree = (C, k, x, z, h, r, cols = ['#3f7a3a', '#4b8a3e']) => {
  k.cyl(x, z, 0.22, -0.3, h, '#5e4630', { seg: 6, col: true });
  for (const [dx, dy, dz, q] of [
    [0, h + 0.4, 0, 1],
    [-r * 0.7, h - 0.5, r * 0.3, 0.75],
    [r * 0.7, h - 0.3, -r * 0.2, 0.8],
  ]) {
    const g = new C.THREE.SphereGeometry(r * q, 8, 6);
    g.scale(1, 0.8, 1);
    g.translate(x + dx, dy, z + dz);
    k._part(C.VC, C.paintGeo(g, cols[(dx > 0) | 0]));
  }
};

// 草叢、灌木（低的扁球）
export const bush = (C, k, x, z, r, hex = '#4f7a3a') => {
  const g = new C.THREE.SphereGeometry(r, 7, 5);
  g.scale(1, 0.6, 1);
  g.translate(x, r * 0.35, z);
  k._part(C.VC, C.paintGeo(g, hex));
};

// 沿立面線的鐵絲網圍籬（灰色鐵管柱、上下橫桿，菱形鐵絲網半透明貼圖），x0～x1、離立面 z、高 h；整段有碰撞
export const meshFence = (C, k, x0, x1, z, h = 1.8) => {
  const net = C.sg('q249net', 128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(120,128,130,0.95)';
    g.lineWidth = 2;
    for (let i = -128; i < 256; i += 16) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 128, 128);
      g.moveTo(i + 128, 0);
      g.lineTo(i, 128);
      g.stroke();
    }
  });
  const n = Math.max(1, Math.round((x1 - x0) / 2.5)),
    step = (x1 - x0) / n;
  for (let j = 0; j <= n; j++) k.cyl(x0 + j * step, z, 0.04, -0.2, h, '#8a8d8f', { seg: 6 });
  for (let j = 0; j < n; j++)
    k.plane(net, step - 0.08, h - 0.25, x0 + (j + 0.5) * step, 0.15 + (h - 0.25) / 2, z, C.FRONT, {
      transparent: true,
      double: true,
    });
  k.box(x0, x1, h - 0.05, h, z - 0.03, z + 0.03, '#8a8d8f', NC);
  k.box(x0, x1, 0.12, 0.17, z - 0.03, z + 0.03, '#8a8d8f', NC);
  k.wallLine(x0, z, x1, z, 0, h);
};
