// 牛稠埤（中原埤塘生態公園）北岸的親水棧道：沿北岸擋土牆、架在水面上的木平台，底下一排混凝土柱。
// 依據：
//  - 國土測繪中心 2024 正射（24.95705, 121.2456 一帶）：北岸步道下緣、水面北緣一條深色長帶，長約 44 m、寬約 5 m，
//    西端約遊戲 x 282、東端約 x 326。
//  - Google 地圖「中原埤塘生態公園」相片：北岸是灰褐木板平台架在水面上，外緣一道欄杆（夜景是打藍燈的玻璃欄杆），
//    從南岸看過去平台底下約 9 根方柱立在水裡，平台面比上方步道低一截。
// 平台面高度相片看不出確切數字，取步道下 1.1 m（水面上約 2.1 m）；平台怎麼下去（相片裡的階梯看台）位置不確定，這次不做，
// 北岸牆頂的碰撞線照舊，所以平台只看得到、走不下去，不加碰撞也不加地面。
// 平台沿遊戲裡北岸擋土牆（牛稠埤水面輪廓的北緣，OSM 線略往東北偏）擺。不用共用亂數。
import * as THREE from 'three';
import { H } from '../Terrain.js';
import { canvasTexture } from '../../graphics/GpuMemLifecycle.js';

// s：沿北岸從西端點量的距離；v：離牆往南（水面）的距離
const DK = { s0: 28.5, s1: 72.5, v0: 0.05, v1: 4.8, below: 1.1, slab: 0.35, cols: 9, col: 0.5 };

function frame(data) {
  const a = (data.areas || []).find((q) => q.name === '牛稠埤' && q.sink);
  if (!a) return null;
  const ring = a.sink.wet || a.pts;
  // 北緣：輪廓最後一點（東端）到第一點（西端）那一段
  const A = ring[0],
    B = ring[ring.length - 1];
  const l = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const U = [(B[0] - A[0]) / l, (B[1] - A[1]) / l],
    V = [-U[1], U[0]]; // V 朝南
  const P = (s, v) => [A[0] + U[0] * s + V[0] * v, A[1] + U[1] * s + V[1] * v];
  return { A, U, P, ang: Math.atan2(U[1], U[0]), drop: a.sink.drop };
}

// 灰褐木板，順著平台長向
const plankTex = () =>
  canvasTexture(256, 256, (g, W, Hh) => {
    g.fillStyle = '#5d5346';
    g.fillRect(0, 0, W, Hh);
    let s = 11;
    const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const n = 16,
      c = Hh / n;
    for (let j = 0; j < n; j++) {
      const k = 128 + Math.floor(r() * 30);
      g.fillStyle = `rgb(${k},${k - 10},${k - 24})`;
      g.fillRect(0, j * c + 1, W, c - 2);
    }
  });

export function buildNiuchouDeck(I, scene, data) {
  const f = frame(data);
  if (!f) return;
  const L = DK.s1 - DK.s0,
    W = DK.v1 - DK.v0,
    [cx, cz] = f.P((DK.s0 + DK.s1) / 2, (DK.v0 + DK.v1) / 2);
  const ground = H(cx, cz),
    top = ground - DK.below,
    water = ground - f.drop;
  const g = new THREE.Group();
  g.name = 'niuchouDeck';
  g.position.set(cx, 0, cz);
  g.rotation.y = -f.ang;
  const tex = plankTex();
  tex.repeat.set(L / 4, W / 2.4);
  const conc = new THREE.MeshStandardMaterial({ color: '#b3aea3', roughness: 0.9 }),
    deck = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(L, DK.slab, W), [
    conc,
    conc,
    deck,
    conc,
    conc,
    conc,
  ]);
  slab.position.y = top - DK.slab / 2;
  g.add(slab);
  // 柱子：沿外緣一排，從水底到平台底
  const ch = top - DK.slab - (water - 0.6),
    colGeo = new THREE.BoxGeometry(DK.col, ch, DK.col);
  for (let k = 0; k < DK.cols; k++) {
    const u = -L / 2 + 1.5 + ((L - 3) * k) / (DK.cols - 1);
    const c = new THREE.Mesh(colGeo, conc);
    c.position.set(u, water - 0.6 + ch / 2, W / 2 - 0.8);
    g.add(c);
  }
  // 外緣玻璃欄杆＋深灰扶手、兩端短欄杆
  const glass = new THREE.MeshStandardMaterial({
      color: '#bcd6dc',
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      depthWrite: false,
    }),
    metal = new THREE.MeshStandardMaterial({ color: '#3d4044', roughness: 0.5, metalness: 0.5 });
  const rail = (len, x, z, rotY) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(len, 1.0, 0.03), glass);
    p.position.set(x, top + 0.55, z);
    p.rotation.y = rotY;
    const h = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.08), metal);
    h.position.set(x, top + 1.08, z);
    h.rotation.y = rotY;
    g.add(p, h);
  };
  rail(L, 0, W / 2 - 0.05, 0);
  rail(W - 0.1, -L / 2 + 0.05, 0, Math.PI / 2);
  rail(W - 0.1, L / 2 - 0.05, 0, Math.PI / 2);
  g.traverse((m) => {
    if (m.isMesh && m.material !== glass) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  scene.add(g);
}
