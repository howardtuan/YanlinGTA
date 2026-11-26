// 中原噴水池東北側的弧形花台：一道低矮的清水泥弧牆，牆腳一條藍色小磁磚帶，牆外側是一圈灌木，再外面是草坪。
// 依據：Google 街景（影像 2017-09，全景 I6ZC-j05NBQbdD5X1Kzp_A，觀看點約 24.9575268,121.240689，噴水池東北側，朝 60 度）：
//   弧牆從懷恩樓拱廊前（北偏東）繞過噴水池廣場東北緣到東南東，對著噴水池那面是牆、背面是灌木；牆高約 0.5～0.6 m。
//   tools/overrides.json landmarks「中原噴水池」note 記的「北東側約 10 m 的弧形低花台」就是它（當時被樹擋住沒量到）。
// 半徑取廣場淺色石帶外緣（plaza 9.5＋band 1，與噴水池同心），弧段照街景朝向估 a −80°～+20°（x = cos a、z = sin a）。
// 碰撞：牆一段一條線（照 MapBuilder 西北側白牆的做法）。不用共用亂數。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H } from '../Terrain.js';

const PL = { r: 10.6, a0: -80, a1: 20, h: 0.55, t: 0.3, bed: 1.6, seg: 1.0 };

export function buildFountainPlanter(I, scene, data, collision) {
  const fp = (data.areas || []).find((a) => a.name === '中原噴水池');
  if (!fp) return;
  const cx = fp.pts.reduce((s, p) => s + p[0], 0) / fp.pts.length,
    cz = fp.pts.reduce((s, p) => s + p[1], 0) / fp.pts.length;
  const A0 = (PL.a0 * Math.PI) / 180,
    A1 = (PL.a1 * Math.PI) / 180;
  const n = Math.max(6, Math.round((PL.r * (A1 - A0)) / PL.seg));
  const wall = [],
    tile = [],
    hedge = [];
  const at = (a, r) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  for (let k = 0; k < n; k++) {
    const a = A0 + ((k + 0.5) / n) * (A1 - A0),
      len = (PL.r * (A1 - A0)) / n + 0.04;
    const [x, z] = at(a, PL.r + PL.t / 2),
      g = H(x, z);
    const w = new THREE.BoxGeometry(len, PL.h + 0.2, PL.t);
    w.rotateY(-a + Math.PI / 2);
    w.translate(x, g + (PL.h - 0.2) / 2, z);
    wall.push(w);
    // 牆腳的藍色磁磚帶（朝噴水池那面）
    const [tx, tz] = at(a, PL.r - 0.01);
    const tb = new THREE.BoxGeometry(len, 0.07, 0.02);
    tb.rotateY(-a + Math.PI / 2);
    tb.translate(tx, g + 0.1, tz);
    tile.push(tb);
    // 牆後灌木：每段一團，高低交錯
    const [hx, hz] = at(a, PL.r + PL.t + PL.bed / 2),
      s = 0.85 + 0.2 * Math.sin(k * 2.3);
    const b = new THREE.IcosahedronGeometry(0.8, 1);
    b.scale(len * 0.75, 0.75 * s, PL.bed * 0.55);
    b.rotateY(-a + Math.PI / 2);
    b.translate(hx, H(hx, hz) + 0.45 * s, hz);
    hedge.push(b.toNonIndexed());
  }
  // 兩端圓頭
  for (const a of [A0, A1]) {
    const [x, z] = at(a, PL.r + PL.t / 2),
      c = new THREE.CylinderGeometry(PL.t / 2, PL.t / 2, PL.h + 0.2, 10);
    c.translate(x, H(x, z) + (PL.h - 0.2) / 2, z);
    wall.push(c);
  }
  const strip = (arr) =>
    arr.map((x) => {
      const y = x.index ? x.toNonIndexed() : x;
      for (const k of Object.keys(y.attributes))
        if (!['position', 'normal', 'uv'].includes(k)) y.deleteAttribute(k);
      return y;
    });
  const g = new THREE.Group();
  g.name = 'fountainPlanter';
  for (const [geos, m] of [
    [wall, new THREE.MeshStandardMaterial({ color: '#c9c7c0', roughness: 0.85 })],
    [tile, new THREE.MeshStandardMaterial({ color: '#3d6a9e', roughness: 0.4 })],
    [
      hedge,
      new THREE.MeshStandardMaterial({ color: '#3f6030', roughness: 0.95, flatShading: true }),
    ],
  ]) {
    const mesh = new THREE.Mesh(mergeGeometries(strip(geos)), m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  scene.add(g);
  if (collision)
    for (let k = 0; k < n; k++) {
      const [ax, az] = at(A0 + (k / n) * (A1 - A0), PL.r + PL.t / 2),
        [bx, bz] = at(A0 + ((k + 1) / n) * (A1 - A0), PL.r + PL.t / 2);
      collision.addSegment(ax, az, bx, bz);
    }
}
