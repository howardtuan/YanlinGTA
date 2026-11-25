// 體育園區的戶外籃球場、排球場。
//  東側（操場東邊、聖火台後面）：學校公告的「體育園區籃排球場」，三座全場＋南端半場、東邊三座排球場，2024 年起加蓋太陽能光電頂棚。
//    OSM way 492479183；場地照 NLSC 2019 正射圖（蓋頂棚前）量，頂棚輪廓照 2024 正射圖；柱子位置和高度是推測。勞大來這裡打球（src/entities/Pilot.js）。
//  西側（體育館北側、操場西邊）：OSM way 492479182，照 2024 正射圖：兩座並排全場、一座籃框朝西的半場、一座朝南的半場、最南一座全場
//    （東半被樹遮住，寬度是推測）、東南角兩座排球場。
// 鋪面和線畫在 src/world/MapBuilder.js 的 areas 圖層（原本是草地），籃架、球網、頂棚在這裡蓋。
import * as THREE from 'three';
import { terrainGrid, surfaceAt } from './Terrain.js';
import { scaledCanvas } from '../graphics/GpuMemLifecycle.js';

// east side: local frame with its origin at the middle court's centre, u along the courts (south +), v across (east +)
const E = { o: [191.14, -371.82], d: [0.2234, 0.9747] },
  EW = (u, v) => [E.o[0] + E.d[0] * u + E.d[1] * v, E.o[1] + E.d[1] * u - E.d[0] * v];
const WD = [0.195, 0.981];
// c: centre, d: along, L × W (baseline to baseline, sideline to sideline); half: only the +u end (c is on the half-way line)
export const COURTS = [
  { c: EW(0, 0), d: E.d, L: 28, W: 14.6 }, // 勞大's court: the middle one
  { c: EW(-29.4, 0), d: E.d, L: 28, W: 14.6 },
  { c: EW(29.4, 0), d: E.d, L: 28, W: 14.6 },
  { c: EW(54, 0), d: [-E.d[0], -E.d[1]], L: 18.4, W: 14.6, half: true },
  { c: [7.9, -367.3], d: WD, L: 28, W: 14.6 },
  { c: [25, -372.5], d: WD, L: 27.4, W: 14 },
  { c: [-0.3, -351.8], d: [-1, 0], L: 29.4, W: 14.2, half: true },
  { c: [-7.2, -344.6], d: [0, 1], L: 21, W: 14.8, half: true },
  { c: [-7.6, -317.6], d: [0, 1], L: 29, W: 13.6 },
];
export const VBALL = [
  // 9 × 18 m volleyball courts
  { c: EW(-37.4, 15), d: E.d },
  { c: EW(-15.4, 15), d: E.d },
  { c: EW(6.6, 15), d: E.d },
  { c: [19.5, -340.2], d: [0.22, 0.975] },
  { c: [31.1, -342.8], d: [0.22, 0.975] },
];
// red surrounds that reach past the two OSM pitches
const RED_E = [
  [-46, -9.8],
  [-46, 22.6],
  [20, 22.6],
  [20, 9.2],
  [54, 9.2],
  [54, -9.8],
].map(([u, v]) => EW(u, v));
const RED_W = [
  [1.6, -347.9],
  [36.8, -355.2],
  [40.4, -334],
  [17, -322.8],
  [11.8, -334.4],
  [1.7, -343.5],
];
export const ROOF = [
  [-47, -10.6],
  [-47, 24],
  [20.4, 24],
  [20.4, 9.6],
  [53.4, 9.6],
  [53.4, -10.6],
]; // (u, v), NLSC 2024
export const RIM = 3.05,
  RIM_R = 0.23,
  RIM_IN = 1.575; // rim height, radius, its centre in from the baseline
// point on a court: u along (south +), v across (east +), from the centre
export function courtP(C, u, v) {
  const [a, b] = C.d;
  return [C.c[0] + a * u + b * v, C.c[1] + b * u - a * v];
}
// the rims of a court: { x, z, y (world height), s (which end) }
export function courtRims(C) {
  return (C.half ? [1] : [-1, 1]).map((s) => {
    const [x, z] = courtP(C, s * (C.L / 2 - RIM_IN), 0);
    return { x, z, y: surfaceAt(x, z) + RIM, s };
  });
}
const AT = [
  [1.6, -347.7],
  [190.1, -418.5],
]; // one vertex of each OSM pitch
export const isCourt = (a) =>
  a.kind === 'pitch' &&
  a.pts.some(([x, z]) => AT.some((q) => Math.hypot(x - q[0], z - q[1]) < 0.5));
// trees and shrubs the survey doesn't have (src/world/zones/Zones.js): under the roof, on the west volleyball courts
export const courtTreeHide = () => [
  [
    [-50, -13],
    [-50, 27],
    [23, 27],
    [23, 12.6],
    [56, 12.6],
    [56, -13],
  ].map(([u, v]) => EW(u, v)),
  RED_W,
];
// the east courts are level (the 20 m terrain model is not): terrain nodes under the roof go to one gently sloping plane
export function courtTerrain() {
  const G = terrainGrid();
  if (!G) return;
  for (let j = 0; j < G.nz; j++)
    for (let i = 0; i < G.nx; i++) {
      const x = G.minX + i * G.step - E.o[0],
        z = G.minZ + j * G.step - E.o[1],
        u = x * E.d[0] + z * E.d[1],
        v = x * E.d[1] - z * E.d[0];
      if (u > -50 && v > -13 && (u < 23 ? v < 26 : u < 50 && v < 13))
        G.h[j * G.nx + i] = -4.2 + Math.max(0, u - 20) * 0.02;
    }
}

// the paint (src/world/MapBuilder.js): red all over, green courts, red keys and centre circles, white lines
const RED = [0.27, 0.075, 0.07],
  GREEN = [0.15, 0.215, 0.105],
  WHITE = [0.86, 0.87, 0.84]; // linear rgb
export function paintCourts(areas, geo) {
  for (const a of areas) geo.flatPoly(a.pts, 0.02, RED);
  geo.flatPoly(RED_E, 0.02, RED);
  geo.flatPoly(RED_W, 0.02, RED);
  const arc = (C, u, v, r, a0, a1, n, w, col) => {
    for (let i = 0; i < n; i++) {
      const q = (t) => {
        const a = a0 + (a1 - a0) * t;
        return courtP(C, u + Math.cos(a) * r, v + Math.sin(a) * r);
      };
      geo.strip(q(i / n), q((i + 1) / n), w, 0.03, col);
    }
  };
  for (const C of COURTS) {
    const P = (u, v) => courtP(C, u, v),
      l = C.L / 2,
      w = C.W / 2,
      line = (a, b) => geo.strip(P(...a), P(...b), 0.06, 0.03, WHITE),
      u0 = C.half ? 0 : -l;
    const rect = (u0, u1, v0, v1, col) =>
      geo.flatPoly([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], 0.025, col);
    rect(u0, l, -w, w, GREEN);
    if (!C.half) {
      const ring = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ring.push(P(Math.cos(a) * 1.8, Math.sin(a) * 1.8));
      }
      geo.flatPoly(ring, 0.026, RED);
    }
    for (const s of C.half ? [1] : [-1, 1]) {
      const b = s * l,
        k = s * (l - 5.8);
      rect(Math.min(b, k), Math.max(b, k), -2.45, 2.45, RED);
      for (const v of [-2.45, 2.45]) line([b, v], [k, v]);
      line([k, -2.45], [k, 2.45]);
      const back = s < 0 ? 0 : Math.PI,
        half = Math.PI / 2; // arcs open toward the middle of the court
      arc(C, k, 0, 1.8, back - half, back + half, 12, 0.06, WHITE); // free-throw circle
      const r3 = Math.min(6.75, w - 0.5),
        ru = s * (l - RIM_IN); // three-point line
      arc(C, ru, 0, r3, back - half, back + half, 24, 0.06, WHITE);
      for (const v of [-r3, r3]) line([b, v], [ru, v]);
    }
    line([0, -w], [0, w]);
    if (!C.half) arc(C, 0, 0, 1.8, 0, Math.PI * 2, 24, 0.06, WHITE);
    for (const u of C.half ? [l] : [-l, l]) line([u, -w], [u, w]);
    for (const v of [-w, w]) line([u0, v], [l, v]);
  }
  for (const C of VBALL) {
    const P = (u, v) => courtP(C, u, v),
      line = (a, b) => geo.strip(P(...a), P(...b), 0.06, 0.03, WHITE);
    geo.flatPoly([P(-9, -4.5), P(9, -4.5), P(9, 4.5), P(-9, 4.5)], 0.025, GREEN);
    for (const u of [-9, -3, 0, 3, 9]) line([u, -4.5], [u, 4.5]);
    for (const v of [-4.5, 4.5]) line([-9, v], [9, v]);
  }
}

// volleyball posts and nets, the solar roof over the east courts
function buildNets(I, scene) {
  const post = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.045, 0.05, 2.9, 10),
      new THREE.MeshStandardMaterial({ color: '#2c3f63', roughness: 0.6 }),
      VBALL.length * 2
    ),
    m4 = new THREE.Matrix4();
  const t = (() => {
    const { cv, g: c } = scaledCanvas(64, 64); // tier's texture scale (src/graphics/GpuMemLifecycle.js)
    c.strokeStyle = '#222';
    c.lineWidth = 5;
    c.strokeRect(0, 0, 64, 64);
    const q = new THREE.CanvasTexture(cv);
    q.wrapS = q.wrapT = THREE.RepeatWrapping;
    q.repeat.set(70, 7);
    return q;
  })();
  const net = new THREE.MeshStandardMaterial({
      map: t,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }),
    tape = new THREE.MeshStandardMaterial({ color: '#f0f0ec', roughness: 0.8 });
  VBALL.forEach((C, i) => {
    const [mx, mz] = C.c,
      y = surfaceAt(mx, mz),
      g = new THREE.Group();
    g.position.set(mx, y, mz);
    g.rotation.y = Math.atan2(C.d[0], C.d[1]); // +z along the court
    const n = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 1), net);
    n.position.y = 1.9;
    g.add(n);
    const b = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.06, 0.02), tape);
    b.position.y = 2.4;
    g.add(b);
    scene.add(g);
    g.updateMatrixWorld(true);
    [-5, 5].forEach((v, k) => {
      const [x, z] = courtP(C, 0, v);
      post.setMatrixAt(i * 2 + k, m4.makeTranslation(x, y + 1.1, z));
      I.addWall(x - 0.06, z, x + 0.06, z, -1, 2.6);
      I.addWall(x, z - 0.06, x, z + 0.06, -1, 2.6);
    });
    const a = courtP(C, 0, -4.9),
      e = courtP(C, 0, 4.9);
    I.addWall(a[0], a[1], e[0], e[1], -1, 2.4);
  });
  post.castShadow = true;
  post.computeBoundingSphere();
  scene.add(post);
}
const COLS = (() => {
  // column positions (u, v)
  const out = [];
  for (let u = -46; u <= 20; u += 11) for (const v of [-10, 9.2, 23.4]) out.push([u, v]);
  for (const u of [31, 42, 53]) for (const v of [-10, 9.2]) out.push([u, v]);
  return out;
})();
export const COLUMNS = COLS.map(([u, v]) => EW(u, v));
function buildRoof(I, scene, Kit, regMat) {
  const k = new Kit(I, E.o[0], E.o[1], Math.atan2(-E.d[0], E.d[1]), 1); // local x = v, z = u
  const pv = (() => {
    const { cv, g: c } = scaledCanvas(256, 256);
    c.fillStyle = '#1b2a4a';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(150,170,205,.35)';
    c.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 256);
      c.moveTo(0, i);
      c.lineTo(256, i);
      c.stroke();
    }
    c.strokeStyle = '#aab4c2';
    c.lineWidth = 7;
    c.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  })();
  const PV = regMat(
      'courtPV',
      new THREE.MeshStandardMaterial({ map: pv, roughness: 0.35, metalness: 0.3 })
    ),
    ST = regMat(
      'courtSteel',
      new THREE.MeshStandardMaterial({ color: '#c3c9cf', roughness: 0.55, metalness: 0.35 })
    ),
    UN = regMat(
      'courtUnder',
      new THREE.MeshStandardMaterial({
        color: '#b9c0c6',
        roughness: 0.8,
        emissive: '#b9c0c6',
        emissiveIntensity: 0.12,
      })
    );
  const EAVE = 8,
    RISE = 0.9,
    slab = (x0, x1, y0, y1, z0, z1) => {
      // a sloping sheet from (x0, y0) to (x1, y1), panels on top, metal deck underneath
      const L = Math.hypot(x1 - x0, y1 - y0),
        a = Math.atan2(y1 - y0, x1 - x0);
      for (const [m, h, dy] of [
        [PV, 0.06, 0.1],
        [UN, 0.04, 0.02],
      ]) {
        const g = new THREE.BoxGeometry(L, h, z1 - z0);
        if (m === PV) {
          const uv = g.attributes.uv;
          for (let i = 8; i < 12; i++)
            uv.setXY(i, (uv.getX(i) * L) / 4, (uv.getY(i) * (z1 - z0)) / 4);
        }
        g.rotateZ(a);
        g.translate((x0 + x1) / 2, (y0 + y1) / 2 + dy, (z0 + z1) / 2);
        k._part(m, g);
      }
    };
  // two long gables side by side (basketball, volleyball); the basketball one runs on to the south end
  const spans = [
    [-10.6, 9.4, -47, 53.4],
    [9.4, 24, -47, 20.4],
  ];
  for (const [x0, x1, z0, z1] of spans) {
    const m = (x0 + x1) / 2;
    slab(x0, m, EAVE, EAVE + RISE, z0, z1);
    slab(m, x1, EAVE + RISE, EAVE, z0, z1);
  }
  for (const [u, v] of COLS) {
    k.box(v - 0.16, v + 0.16, -1, EAVE, u - 0.16, u + 0.16, ST);
    k.box(v - 0.32, v + 0.32, -1, 0.35, u - 0.32, u + 0.32, UN, { col: false });
  }
  for (const [x0, x1, z0, z1] of spans) {
    const m = (x0 + x1) / 2;
    for (let z = -46; z <= z1; z += 11) {
      // a truss over every row of columns: bottom chord, posts, rafters
      k.box(x0, x1, EAVE - 0.75, EAVE - 0.6, z - 0.06, z + 0.06, ST, { col: false });
      for (const [a, b, ya, yb] of [
        [x0, m, EAVE, EAVE + RISE],
        [m, x1, EAVE + RISE, EAVE],
      ]) {
        const g = new THREE.BoxGeometry(Math.hypot(b - a, yb - ya), 0.16, 0.12);
        g.rotateZ(Math.atan2(yb - ya, b - a));
        g.translate((a + b) / 2, (ya + yb) / 2 - 0.1, z);
        k._part(ST, g);
      } // top chord
      for (let x = x0 + 1.6; x < x1 - 0.8; x += 2.1) {
        const y = EAVE + RISE * (1 - Math.abs(x - m) / (m - x0));
        k.box(x - 0.04, x + 0.04, EAVE - 0.6, y, z - 0.04, z + 0.04, ST, { col: false });
      }
    }
    for (const x of [x0 + 0.1, m, x1 - 0.1])
      k.box(
        x - 0.08,
        x + 0.08,
        (x === m ? EAVE + RISE : EAVE) - 0.2,
        x === m ? EAVE + RISE : EAVE,
        z0,
        z1,
        ST,
        { col: false }
      );
  }
  k.finish(scene);
}

// the hoops: a padded post behind each baseline, an arm, a white backboard, an orange rim and a net
export function buildCourts(I, scene, Kit, regMat) {
  buildNets(I, scene);
  buildRoof(I, scene, Kit, regMat);
  const parts = { dark: [], board: [], rim: [], net: [] };
  // local: the rim's centre at (0, 0, 0) on the ground, +z toward the baseline (out of the court)
  const add = (key, g, x, y, z, rx = 0) => {
    if (rx) g.rotateX(rx);
    g.translate(x, y, z);
    parts[key].push(g);
  };
  const PZ = RIM_IN + 0.75; // post
  add('dark', new THREE.BoxGeometry(0.2, 3.9, 0.2), 0, 1.35, PZ); // runs 0.6 m into the ground (the court slopes)
  add('dark', new THREE.BoxGeometry(0.12, 0.12, PZ - 0.42), 0, 3.25, (PZ + 0.42) / 2);
  add('dark', new THREE.BoxGeometry(0.08, 0.08, 1.3), 0, 2.85, PZ - 0.55, 0.5);
  for (const [x, y, w, h] of [
    [0, 2.92, 1.8, 0.05],
    [0, 3.93, 1.8, 0.05],
    [-0.88, 3.42, 0.05, 1.05],
    [0.88, 3.42, 0.05, 1.05],
  ])
    add('dark', new THREE.BoxGeometry(w, h, 0.06), x, y, 0.4);
  add('board', new THREE.BoxGeometry(1.78, 1.02, 0.04), 0, 3.425, 0.4);
  for (const [x, y, w, h] of [
    [0, RIM + 0.12, 0.59, 0.05],
    [0, RIM + 0.52, 0.59, 0.05],
    [-0.27, RIM + 0.32, 0.05, 0.45],
    [0.27, RIM + 0.32, 0.05, 0.45],
  ])
    add('rim', new THREE.BoxGeometry(w, h, 0.01), x, y, 0.376); // the square
  add('rim', new THREE.TorusGeometry(RIM_R, 0.012, 6, 24), 0, RIM, 0, Math.PI / 2);
  add('rim', new THREE.BoxGeometry(0.12, 0.03, 0.18), 0, RIM - 0.005, 0.31);
  {
    const g = new THREE.CylinderGeometry(RIM_R, RIM_R * 0.62, 0.42, 14, 3, true);
    g.translate(0, RIM - 0.22, 0);
    parts.net.push(g);
  }
  const netTex = (() => {
    const { cv, g: c } = scaledCanvas(128, 128);
    c.strokeStyle = '#fff';
    c.lineWidth = 5;
    for (let i = -4; i < 8; i++) {
      c.beginPath();
      c.moveTo(i * 32, 0);
      c.lineTo(i * 32 + 128, 128);
      c.moveTo(i * 32 + 128, 0);
      c.lineTo(i * 32, 128);
      c.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
  })();
  const mats = {
    dark: new THREE.MeshStandardMaterial({ color: '#2c3f63', roughness: 0.6 }),
    board: new THREE.MeshStandardMaterial({ color: '#eef0f0', roughness: 0.5 }),
    rim: new THREE.MeshStandardMaterial({ color: '#d9531e', roughness: 0.5 }),
    net: new THREE.MeshStandardMaterial({
      map: netTex,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }),
  };
  const merge = (list) => {
    // plain merge of indexed geometries with the same attributes
    const p = [],
      n = [],
      u = [],
      ix = [];
    let o = 0;
    for (const g of list) {
      p.push(...g.attributes.position.array);
      n.push(...g.attributes.normal.array);
      u.push(...g.attributes.uv.array);
      for (const i of g.index.array) ix.push(i + o);
      o += g.attributes.position.count;
      g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.setIndex(ix);
    return g;
  };
  const rims = COURTS.flatMap((C) =>
      courtRims(C).map((r) => ({ ...r, h: Math.atan2(C.d[0] * r.s, C.d[1] * r.s) }))
    ),
    m4 = new THREE.Matrix4();
  for (const key of Object.keys(parts)) {
    const im = new THREE.InstancedMesh(merge(parts[key]), mats[key], rims.length);
    rims.forEach((r, i) =>
      im.setMatrixAt(i, m4.makeRotationY(r.h).setPosition(r.x, r.y - RIM, r.z))
    );
    im.castShadow = key === 'dark' || key === 'board';
    im.receiveShadow = true;
    im.computeBoundingSphere();
    im.matrixAutoUpdate = false;
    scene.add(im);
  }
  for (const r of rims) {
    // you can't walk through the posts
    const s = Math.sin(r.h),
      c = Math.cos(r.h),
      w = (x, z) => [r.x + x * c + z * s, r.z - x * s + z * c],
      q = [w(-0.12, PZ - 0.12), w(0.12, PZ - 0.12), w(0.12, PZ + 0.12), w(-0.12, PZ + 0.12)];
    q.forEach((a, i) => {
      const b = q[(i + 1) % 4];
      I.addWall(a[0], a[1], b[0], b[1], -0.5, 3);
    });
  }
}
