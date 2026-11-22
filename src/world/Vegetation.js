// Trees & shrubs modelled on what actually grows on the CYCU campus: huge umbrella-shaped rain trees / banyans,
// round camphor-like street trees, black pines, royal palms (大王椰子) and clipped shrubs.
// Geometry is built once per species and drawn with spatially-chunked InstancedMeshes so frustum
// culling (camera and shadow) only draws nearby chunks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { leafTex, frondTex, barkTex } from '../graphics/Textures.js';

const rng = (seed) => { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const UP = new THREE.Vector3(0, 1, 0);

function setColor(geo, fn) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
// tapered cylinder from a to b
function limb(a, b, r0, r1, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 2, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
// lumpy foliage blob; normals bent away from the canopy centre for soft, tree-like shading
function blob(c, sx, sy, sz, center, r, uvRep = 3) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  const ph = r() * 10;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.16 * Math.sin(x * 3.1 + ph) * Math.cos(z * 2.7 + ph) + 0.1 * Math.sin(y * 4.3 + ph * 2);
    x *= sx * k; y *= sy * k; z *= sz * k;
    p.setXYZ(i, x + c.x, y + c.y, z + c.z);
    const o = new THREE.Vector3(x + c.x - center.x, (y + c.y - center.y) * 1.4, z + c.z - center.z).normalize();
    const bn = new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i));
    o.multiplyScalar(0.65).addScaledVector(bn, 0.35).normalize();
    n.setXYZ(i, o.x, o.y, o.z);
    uv.setXY(i, uv.getX(i) * uvRep, uv.getY(i) * uvRep * 0.6);
  }
  return g;
}
function canopyShade(geo, y0, y1, hue) {
  return setColor(geo, (x, y) => {
    const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    const s = 0.5 + 0.62 * Math.pow(t, 0.8);
    return [s * hue[0], s * hue[1], s * hue[2]];
  });
}

// ---------- species ----------
function rainTree(seed) { // umbrella canopy: short trunk splitting into wide limbs
  const r = rng(seed), trunk = [], crown = [];
  const base = new THREE.Vector3(0, 0, 0), fork = new THREE.Vector3(0, 3.0, 0);
  trunk.push(limb(base, fork, 0.55, 0.42, 8));
  const center = new THREE.Vector3(0, 7.2, 0);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * 0.6, d = 3.4 + r() * 1.2;
    const end = new THREE.Vector3(Math.cos(a) * d, 6.2 + r() * 0.8, Math.sin(a) * d);
    const mid = new THREE.Vector3(Math.cos(a) * d * 0.45, 4.6, Math.sin(a) * d * 0.45);
    trunk.push(limb(fork, mid, 0.36, 0.26), limb(mid, end, 0.26, 0.12));
    crown.push(blob(new THREE.Vector3(end.x * 1.15, 7.4 + r() * 0.6, end.z * 1.15), 3.0 + r(), 1.5 + r() * 0.3, 3.0 + r(), center, r));
  }
  crown.push(blob(new THREE.Vector3(0, 8.2, 0), 3.6, 1.8, 3.6, center, r));
  for (let i = 0; i < 4; i++) { const a = r() * 6.28, d = 2 + r() * 2.5; crown.push(blob(new THREE.Vector3(Math.cos(a) * d, 6.6 + r() * 1.6, Math.sin(a) * d), 2.2, 1.3, 2.2, center, r)); }
  const t = mergeGeometries(trunk.map(g => g.toNonIndexed ? (g.index ? g.toNonIndexed() : g) : g));
  setColor(t, (x, y) => { const k = 0.8 + Math.min(1, y / 6) * 0.25; return [k * 0.95, k * 0.92, k * 0.88]; });
  const c = canopyShade(mergeGeometries(crown), 5.2, 10, [0.92, 1.0, 0.86]);
  return { trunk: t, crown: c, leaf: 'broad', h: 10 };
}
function roundTree(seed) {
  const r = rng(seed), trunk = [], crown = [];
  const top = new THREE.Vector3(r() * 0.3, 4.2, r() * 0.3);
  trunk.push(limb(new THREE.Vector3(), top, 0.24, 0.16, 7));
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(); trunk.push(limb(top, new THREE.Vector3(Math.cos(a) * 1.3, 5.6, Math.sin(a) * 1.3), 0.12, 0.06, 5)); }
  const center = new THREE.Vector3(0, 6.2, 0);
  crown.push(blob(new THREE.Vector3(0, 6.4, 0), 2.6, 2.2, 2.6, center, r));
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + r() * 0.5; crown.push(blob(new THREE.Vector3(Math.cos(a) * 1.7, 5.6 + r() * 1.6, Math.sin(a) * 1.7), 1.7 + r() * 0.4, 1.5, 1.7 + r() * 0.4, center, r)); }
  const t = mergeGeometries(trunk.map(g => g.index ? g.toNonIndexed() : g)); setColor(t, () => [0.9, 0.86, 0.8]);
  return { trunk: t, crown: canopyShade(mergeGeometries(crown), 4, 8.6, [1.0, 1.02, 0.9]), leaf: 'broad', h: 8.6 };
}
function pineTree(seed) { // tall black pine: leaning bare trunk, a few wide irregular foliage clouds near the top
  const r = rng(seed), trunk = [], crown = [];
  const lean = new THREE.Vector3(r() * 1.2 - 0.6, 0, r() * 1.2 - 0.6);
  const top = new THREE.Vector3(lean.x, 11.5, lean.z);
  const mid = new THREE.Vector3(lean.x * 0.45 + 0.2, 6, lean.z * 0.45);
  trunk.push(limb(new THREE.Vector3(), mid, 0.3, 0.22, 7), limb(mid, top, 0.22, 0.07, 6));
  const center = new THREE.Vector3(lean.x, 10, lean.z);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const y = 8.2 + i * 1.05 + r() * 0.4, a = i * 2.3 + r(), d = 1.1 + r() * 0.9 - i * 0.2;
    const base = new THREE.Vector3(lean.x * (y / 11.5), y - 0.6, lean.z * (y / 11.5));
    const p = new THREE.Vector3(base.x + Math.cos(a) * d, y, base.z + Math.sin(a) * d);
    trunk.push(limb(base, p, 0.09, 0.04, 4));
    crown.push(blob(p, 2.0 - i * 0.25 + r() * 0.3, 0.85, 1.7 - i * 0.2 + r() * 0.3, center, r, 2.6));
    crown.push(blob(p.clone().add(new THREE.Vector3(Math.cos(a + 1.6) * 0.9, 0.25, Math.sin(a + 1.6) * 0.9)), 1.2, 0.7, 1.1, center, r, 2.6));
  }
  crown.push(blob(top.clone().add(new THREE.Vector3(0, 0.3, 0)), 1.3, 0.9, 1.3, center, r, 2.6));
  const t = mergeGeometries(trunk.map(g => g.index ? g.toNonIndexed() : g)); setColor(t, () => [0.72, 0.6, 0.55]);
  return { trunk: t, crown: canopyShade(mergeGeometries(crown), 7.5, 13, [0.8, 0.94, 0.82]), leaf: 'needle', h: 13 };
}
function palmTree(seed) { // royal palm: smooth pale trunk, green crownshaft, drooping fronds
  const r = rng(seed);
  const H = 11.5;
  const prof = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(0.24 + 0.08 * Math.sin(t * Math.PI * 0.9) - t * 0.05, t * H)); }
  const trunk = new THREE.LatheGeometry(prof, 8);
  const shaft = new THREE.CylinderGeometry(0.2, 0.25, 1.8, 8, 1, true); shaft.translate(0, H + 0.9, 0);
  const t = mergeGeometries([trunk.index ? trunk.toNonIndexed() : trunk, shaft.index ? shaft.toNonIndexed() : shaft]);
  setColor(t, (x, y) => y > H + 0.05 ? [0.55, 0.78, 0.4] : [1.05, 1.03, 1.0]);
  const fronds = [];
  const n = 12, top = new THREE.Vector3(0, H + 1.8, 0);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * 0.3, L = 4.2 + r() * 0.8, lift = 0.6 + r() * 1.2, W = 1.5;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const seg = 6, pos = [], uv = [], idx = [];
    for (let s = 0; s <= seg; s++) {
      const k = s / seg, droop = lift * Math.sin(k * Math.PI * 0.55) - 2.6 * k * k;
      const c = top.clone().addScaledVector(dir, k * L).add(new THREE.Vector3(0, droop, 0));
      const w = W * 0.5 * (0.35 + 0.65 * Math.sin(Math.min(1, k * 1.1 + 0.05) * Math.PI));
      for (const sd of [-1, 1]) { const q = c.clone().addScaledVector(side, sd * w).add(new THREE.Vector3(0, -Math.abs(sd) * 0.18 * k, 0)); pos.push(q.x, q.y, q.z); uv.push(sd < 0 ? 0 : 1, k); }
      if (s < seg) { const b = s * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    const nn = g.attributes.normal; for (let k = 0; k < nn.count; k++) { const v = new THREE.Vector3(nn.getX(k), Math.abs(nn.getY(k)) + 0.6, nn.getZ(k)).normalize(); nn.setXYZ(k, v.x, v.y, v.z); }
    fronds.push(g.toNonIndexed());
  }
  const crown = setColor(mergeGeometries(fronds), (x, y) => { const s = 0.7 + 0.35 * Math.max(0, Math.min(1, (y - H) / 3)); return [s, s, s * 0.9]; });
  return { trunk: t, crown, leaf: 'frond', h: H + 2.5 };
}
function shrub(seed) {
  const r = rng(seed), crown = [], center = new THREE.Vector3(0, 0.5, 0);
  for (let i = 0; i < 3; i++) crown.push(blob(new THREE.Vector3((r() - 0.5) * 0.8, 0.55, (r() - 0.5) * 0.8), 0.75 + r() * 0.2, 0.6, 0.75 + r() * 0.2, center, r, 1.4));
  return { trunk: null, crown: canopyShade(mergeGeometries(crown), 0, 1.2, [0.85, 1.0, 0.8]), leaf: 'broad', h: 1.2 };
}

// ---------- materials ----------
function leafMaterial(kind, quality, uniforms) {
  const map = kind === 'frond' ? frondTex() : leafTex(kind === 'needle' ? 'needle' : 'broad');
  const alphaTest = kind === 'frond' ? 0.35 : kind === 'needle' ? 0.3 : 0.42;
  // low quality: Lambert lighting (much cheaper per pixel; leaves are most of the overdraw on integrated GPUs)
  const m = quality === 'low'
    ? new THREE.MeshLambertMaterial({ map, vertexColors: true, alphaTest, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ map, vertexColors: true, alphaTest, side: THREE.DoubleSide, roughness: 0.78, metalness: 0, alphaToCoverage: true, envMapIntensity: 0.7 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = `uniform float uTime;\n${  sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = 0.0;
      #ifdef USE_INSTANCING
        ph = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.17;
      #endif
      float sway = max(position.y - 2.0, 0.0) * 0.012;
      transformed.x += sin(uTime * 1.3 + ph + position.y * 0.35) * sway + sin(uTime * 4.1 + position.x * 2.0 + ph) * 0.025;
      transformed.z += cos(uTime * 1.1 + ph * 1.3 + position.x * 0.4) * sway + cos(uTime * 3.7 + position.z * 2.0 + ph) * 0.025;`)}`;
    // a little light bleeding through the leaves when back-lit
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += diffuseColor.rgb * 0.035;`);
  };
  m.customProgramCacheKey = () => `leaf${  kind  }${quality === 'low' ? 'L' : ''}`;
  return m;
}

function chunked(scene, geo, mat, items, size, shadow, recv, out) {
  const map = new Map();
  for (const it of items) { const k = `${Math.floor(it.x / size)  },${  Math.floor(it.z / size)}`; let l = map.get(k); if (!l) map.set(k, l = []); l.push(it); }
  for (const list of map.values()) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    let cx = 0, cz = 0;
    list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c && geo.attributes.color) im.setColorAt(i, it.c); cx += it.x; cz += it.z; });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.castShadow = shadow; im.receiveShadow = recv;
    scene.add(im);
    out.push({ mesh: im, x: cx / list.length, z: cz / list.length });
  }
}

const SPECIES = { rain: rainTree, round: roundTree, pine: pineTree, palm: palmTree, shrub };
const VARIANTS = { rain: 2, round: 2, pine: 1, palm: 1, shrub: 1 };

// spots: [{x, z, s, kind, y?}] (y: ground height under the tree, default 0)
export function plantVegetation(scene, spots, quality) {
  const uniforms = { uTime: { value: 0 } };
  const bark = barkTex();
  const barkMat = quality === 'low' ? new THREE.MeshLambertMaterial({ map: bark.map, vertexColors: true })
    : new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, vertexColors: true, roughness: 0.95 });
  const mats = {};
  const getLeaf = (k) => mats[k] || (mats[k] = leafMaterial(k, quality, uniforms));
  const chunks = [];
  const r = rng(424242);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const hues = {
    rain: ['#ffffff', '#e8f2d8', '#f4ffe6', '#d9e8c4'], round: ['#ffffff', '#eaf5d0', '#d8ecc2', '#f2f7da', '#c8dcb0'],
    pine: ['#ffffff', '#dfe8d8'], palm: ['#ffffff', '#f0f5dc'], shrub: ['#ffffff', '#d8eec4', '#e6f0cc'],
  };
  for (const kind of Object.keys(SPECIES)) {
    const list = spots.filter(s => s.kind === kind); if (!list.length) continue;
    const nv = VARIANTS[kind];
    for (let v = 0; v < nv; v++) {
      const sp = SPECIES[kind](1000 + v * 77 + kind.length * 13);
      const items = [];
      list.forEach((s, i) => {
        if (i % nv !== v) return;
        Q.setFromAxisAngle(UP, r() * Math.PI * 2);
        const sc = s.s; S.set(sc * (0.92 + r() * 0.16), sc * (0.9 + r() * 0.2), sc * (0.92 + r() * 0.16)); P.set(s.x, s.y ?? 0, s.z);
        M.compose(P, Q, S);
        const hl = hues[kind], c = new THREE.Color(hl[Math.floor(r() * hl.length)]);
        // hidden spots (js/map.js: on stairs / astride a retaining wall) still take their
        // draws and their slot in the variant cycle, so every other plant looks the same
        if (s.hide) return;
        items.push({ x: s.x, z: s.z, m: M.clone(), c });
      });
      if (!items.length) continue;
      if (sp.trunk) chunked(scene, sp.trunk, barkMat, items, 180, true, true, chunks);
      chunked(scene, sp.crown, getLeaf(sp.leaf), items, 180, kind !== 'shrub', true, chunks);
    }
  }
  return {
    count: spots.length,
    viewDist: 700, // set by main.js from the quality level (shorter on low)
    update(t, cam) {
      uniforms.uTime.value = t;
      if (!cam) return;
      for (const c of chunks) { const d = Math.hypot(c.x - cam.x, c.z - cam.z); c.mesh.visible = d < this.viewDist; }
    },
  };
}
