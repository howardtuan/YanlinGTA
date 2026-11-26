// 二一鐘（OSM 鐘塔，塔本體在 src/world/MapBuilder.js）腳下的矮平台：大草坪北緣，塔立在平台北緣偏東。
// 依據：
//  - 國土測繪中心 2024 正射：塔南側一塊米色鋪面，長約 16 m、寬約 3.5 m，長邊往東微微偏南（約 6.5°），塔在北緣、離東端約 5.5 m。
//  - Google 地圖「鐘塔」相片：離草地約 30 幾公分的平台，灰色小石材鋪面、邊緣一圈收邊，
//    平台西側擺一個深褐色長方塊坐凳（約 2.4×1.1 m、高約 0.45 m）；夜景平台邊緣底下有一圈燈帶（這裡不做燈）。
// 塔在遊戲裡的位置照 OSM（比正射偏東約 2.7 m），平台以塔為準擺，相對位置照正射。
// 平台只加可以走上去的地面（I.addSurface），不加碰撞牆：0.35 m 走得上去，也不會影響旁邊看板的空地判斷（world.isFree）。
// 不用共用亂數。
import * as THREE from 'three';
import { H } from '../Terrain.js';
import { canvasTexture } from '../../graphics/GpuMemLifecycle.js';

const BP = { L: 16, W: 3.5, ang: (6.5 * Math.PI) / 180, tu: 2.5, tv: -0.9, h: 0.35 };
// 坐凳：平台中心往西 3.5 m（塔的西側）
const BENCH = { u: -3.5, v: 0.2, L: 2.4, W: 1.1, h: 0.45 };

function frame(data) {
  const t = (data.pois || []).find((p) => p.name === '鐘塔');
  if (!t) return null;
  const U = [Math.cos(BP.ang), Math.sin(BP.ang)],
    V = [-U[1], U[0]]; // V 朝南
  // 塔在平台局部座標 (tu, tv)：中心 = 塔 − tu·U − tv·V
  const cx = t.x - BP.tu * U[0] - BP.tv * V[0],
    cz = t.z - BP.tu * U[1] - BP.tv * V[1];
  const P = (u, v) => [cx + U[0] * u + V[0] * v, cz + U[1] * u + V[1] * v];
  return { cx, cz, P };
}
const quad = (P, L, W, u = 0, v = 0) => [
  P(u - L / 2, v - W / 2),
  P(u + L / 2, v - W / 2),
  P(u + L / 2, v + W / 2),
  P(u - L / 2, v + W / 2),
];

// 平台範圍內原本的樹、灌木只藏不重抽
export function bellPlatformHide(data) {
  const f = frame(data);
  return f ? [quad(f.P, BP.L + 1.2, BP.W + 1.2)] : [];
}

// 灰色小石材（約 0.3 m 一塊）
const stoneTex = () =>
  canvasTexture(256, 256, (g, W, Hh) => {
    g.fillStyle = '#a9a6a0';
    g.fillRect(0, 0, W, Hh);
    let s = 7;
    const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const n = 8,
      c = W / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const k = 150 + Math.floor(r() * 40);
        g.fillStyle = `rgb(${k},${k - 3},${k - 8})`;
        g.fillRect(i * c + 1, j * c + 1, c - 2, c - 2);
      }
  });

export function buildBellPlatform(I, scene, data) {
  const f = frame(data);
  if (!f) return;
  const pts = quad(f.P, BP.L, BP.W);
  let lo = Infinity,
    hi = -Infinity;
  for (let u = -BP.L / 2; u <= BP.L / 2 + 0.01; u += 2)
    for (let v = -BP.W / 2; v <= BP.W / 2 + 0.01; v += 1.75) {
      const [x, z] = f.P(u, v),
        y = H(x, z);
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  const top = hi + BP.h;
  const g = new THREE.Group();
  g.name = 'bellPlatform';
  g.position.set(f.cx, 0, f.cz);
  g.rotation.y = -BP.ang;
  const tex = stoneTex();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(BP.L / 2.4, BP.W / 2.4);
  const edge = new THREE.MeshStandardMaterial({ color: '#8f8c86', roughness: 0.9 }),
    deck = new THREE.MeshStandardMaterial({ map: tex, color: '#a39f98', roughness: 0.85 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(BP.L, top - lo + 0.3, BP.W), [
    edge,
    edge,
    deck,
    edge,
    edge,
    edge,
  ]);
  slab.position.y = (top + lo - 0.3) / 2;
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(BENCH.L, BENCH.h, BENCH.W),
    new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 0.7, metalness: 0.2 })
  );
  bench.position.set(BENCH.u, top + BENCH.h / 2, BENCH.v);
  for (const m of [slab, bench]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  scene.add(g);
  I.addSurface(pts, (x, z) => top - H(x, z));
  I.addSurface(quad(f.P, BENCH.L, BENCH.W, BENCH.u, BENCH.v), (x, z) => top + BENCH.h - H(x, z));
}
