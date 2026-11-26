// 園塘南側的林木島：從西側堤岸往東伸進水裡的密林半島（tools/water.json 園塘的水面輪廓已把它挖掉）。
// 依據：國土測繪中心 2024 正射，長約 58 m、寬約 10 m，北岸約 z 579、南岸 z 590～594、東端尖角約 (654, 585.5)，整條被樹冠蓋滿。
// 島兩側各有 2.5 m 的土坡下到水面（sinkPlan），樹只種在中線上；遊戲照常檢查碰撞，坡上的會被藏起來。不用共用亂數。
import * as THREE from 'three';
import { H } from '../Terrain.js';
const ISLAND_TREES = [
  [601, 584.5, 'rain', 0.75],
  [609, 584.2, 'round', 0.85],
  [616, 584.0, 'rain', 0.8],
  [623, 584.5, 'round', 0.9],
  [630, 586.0, 'rain', 0.78],
  [637, 585.8, 'round', 0.85],
  [644, 585.5, 'round', 0.75],
];

export const yuantangIslandTrees = () => ISLAND_TREES.map(([x, z, kind, s]) => ({ x, z, kind, s }));

// 園塘中央偏東的小草島：國土測繪中心 2024 正射約 (647.5, 562.7)，直徑約 4 m，偏黃的草叢，西北角一叢深色灌木。
// 在下沉水面範圍內，樹（featureTrees）會被藏起來，所以小島和灌木直接用網格擺：土丘頂比水面高約 0.4 m。
// 不加碰撞（四周是水、岸頂本來就有碰撞線）。不用共用亂數。

const ISLET = { x: 647.5, z: 562.7, r: 2.0 };

export function buildYuantangIslet(I, scene, data) {
  const a = (data.areas || []).find((q) => q.name === '園塘' && q.sink);
  if (!a) return;
  const { x, z, r } = ISLET,
    water = H(x, z) - a.sink.drop;
  const g = new THREE.Group();
  g.name = 'yuantangIslet';
  g.position.set(x, water, z);
  // 土丘：水下 0.3 m 到水上 0.4 m，邊緣稍不規則
  const mound = new THREE.CylinderGeometry(r * 0.8, r * 1.1, 0.7, 14, 1);
  const p = mound.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ang = Math.atan2(p.getZ(i), p.getX(i)),
      k = 1 + 0.08 * Math.sin(ang * 3 + 0.7) + 0.05 * Math.sin(ang * 5);
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  mound.computeVertexNormals();
  const m = new THREE.Mesh(
    mound,
    new THREE.MeshStandardMaterial({ color: '#5e5c3c', roughness: 1 })
  );
  m.position.y = 0.05;
  g.add(m);
  // 草叢：幾簇淡黃綠的尖錐；西北角一叢深色灌木
  const grass = new THREE.MeshStandardMaterial({ color: '#77744a', roughness: 1 }),
    tuft = new THREE.ConeGeometry(0.45, 0.6, 5);
  const tufts = [
    [0.4, 0.5],
    [-0.3, 0.9],
    [0.9, -0.2],
    [0.2, -0.6],
    [-0.8, 0.1],
    [1.1, 0.6],
    [-0.2, -1.1],
    [0.6, 1.2],
  ];
  for (const [u, v] of tufts) {
    const t = new THREE.Mesh(tuft, grass);
    t.position.set(u, 0.6, v);
    g.add(t);
  }
  const bush = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 1),
    new THREE.MeshStandardMaterial({ color: '#3f5232', roughness: 0.95, flatShading: true })
  );
  bush.scale.set(1, 0.85, 1);
  bush.position.set(-0.9, 1.05, -0.8);
  g.add(bush);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(g);
}
