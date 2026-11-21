// 林口體育館（國立體育大學綜合體育館）演唱會配置。不在中原附近的地圖上，所以蓋在地圖外很遠的地方（ARENA.ox / oz），
// 只能搭演唱會接駁車進出（js/concert.js）。
// 依網友實拍與演唱會座位圖：圓角長方形的碗形看台，舞台在一端，看台三面圍住場地、兩側一路延伸到舞台旁；
// 下層綠色座椅，前緣是暗紅色矮牆加橘色欄杆；中間一圈白色走道立面；上層深藍色座椅；白色屋頂與桁架。
// 演唱會時場內一樓全是站區，用金屬欄杆隔成 A／B／C 幾塊，中間留走道；主舞台中間有延伸台接到場中央的方形小舞台。
// 主舞台：中央 LED 大螢幕（concert.js 把 YouTube 疊在上面）、左右兩面側螢幕、上方一排白燈和藍燈的燈架、兩側吊掛喇叭陣列。
// Local frame (metres): origin at the centre of the floor, +z toward the stage, y up from the floor.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export const ARENA = { ox: 3000, oz: -3000, FX: 24, FZ: 34, R: 10, ROOF: 26 };
const { FX, FZ, R: CR } = ARENA;
const STAGE_Z = 24;                     // front edge of the main stage; the floor runs from -FZ to here
const RISE = 0.3, RUN = 0.85;           // every step is low enough to walk up (interior walls block from 0.35 m)
const LOW = { n: 12, y0: 1.4, d0: 0 };  // lower ring: green seats, row 0 level with the floor parapet
const CONC = { d0: LOW.n * RUN, w: 2.6, y: 6.2 };            // white walkway between the rings
const UP = { n: 14, y0: CONC.y + RISE, d0: CONC.d0 + CONC.w }; // upper ring: navy seats
const OUTER = UP.d0 + UP.n * RUN;       // outer wall of the bowl (offset from the floor edge)
const BACK = FZ + 8;                    // back wall behind the stage

// ticket zones (js/concert.js sells them): floor standing blocks, then the two seat rings
export const ARENA_ZONES = [
  { name: '搖滾站區 A', price: 6880, seats: 1200, kind: 'floor', z0: 8, z1: 19 },
  { name: '搖滾站區 B', price: 5880, seats: 1500, kind: 'floor', z0: -12, z1: 4 },
  { name: '搖滾站區 C', price: 4880, seats: 1800, kind: 'floor', z0: -31, z1: -15 },
  { name: '下層看台 黃橙區', price: 3880, seats: 3000, kind: 'ring', ring: 'low', row: 5, side: true },
  { name: '下層看台 藍區', price: 2880, seats: 2500, kind: 'ring', ring: 'low', row: 7, side: false },
  { name: '上層看台', price: 1880, seats: 4500, kind: 'ring', ring: 'up', row: 6, side: false },
];

// ---- the bowl's outline at offset d from the floor edge: an open U from the stage end on +x, round the
// back, to the stage end on -x. Fixed piece counts so every offset has the same topology (ribbons between rows).
const P_SIDE = 36, P_ARC = 10, P_BACK = 18;
function ring(d, zEnd = FZ) {
  const pts = [], sx = FX + d, cx = FX - CR, cz = -FZ + CR, r = CR + d;
  for (let i = 0; i < P_SIDE; i++) pts.push([sx, zEnd + (cz - zEnd) * i / P_SIDE]);
  for (let i = 0; i < P_ARC; i++) { const a = -Math.PI / 2 * i / P_ARC; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  for (let i = 0; i < P_BACK; i++) pts.push([cx - 2 * cx * i / P_BACK, -FZ - d]);
  for (let i = 0; i <= P_ARC; i++) { const a = -Math.PI / 2 - Math.PI / 2 * i / P_ARC; pts.push([-cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  for (let i = 1; i <= P_SIDE; i++) pts.push([-sx, cz + (zEnd - cz) * i / P_SIDE]);
  return pts;
}
const NPTS = ring(0).length;
// quads between two outlines (a at ya, b at yb); keep(i) can skip pieces (stair aisles)
function ribbon(a, ya, b, yb, keep = null) {
  const pos = [];
  for (let i = 0; i < a.length - 1; i++) {
    if (keep && !keep(i)) continue;
    const p = [[a[i][0], ya, a[i][1]], [a[i + 1][0], ya, a[i + 1][1]], [b[i + 1][0], yb, b[i + 1][1]], [b[i][0], yb, b[i][1]]];
    pos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
const aisle = (i) => i % 7 !== 3;
// like ribbon(), with u running along the length (metres / uLen) and v from 0 (a) to 1 (b): LED bands, textured faces
function ribbonUV(a, ya, b, yb, uLen) {
  const pos = [], uv = []; let u = 0;
  for (let i = 0; i < a.length - 1; i++) {
    const l = Math.hypot(a[i + 1][0] - a[i][0], a[i + 1][1] - a[i][1]) / uLen;
    pos.push(a[i][0], ya, a[i][1], a[i + 1][0], ya, a[i + 1][1], b[i + 1][0], yb, b[i + 1][1], a[i][0], ya, a[i][1], b[i + 1][0], yb, b[i + 1][1], b[i][0], yb, b[i][1]);
    uv.push(u, 0, u + l, 0, u + l, 1, u, 0, u + l, 1, u, 1); u += l;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
}
// boxes, spheres and ribbons merge together: same layout for all (non-indexed, position + normal only)
function norm(g, uv = false) { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(uv && k === 'uv')) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
// keeps UVs when every piece has them (textured materials), drops them otherwise
const mergeAll = (list) => { const uv = list.every(g => g.attributes.uv); return mergeGeometries(list.map(g => norm(g, uv)), false); }; // a concrete stair every 7th piece (the seats split into wedges)

function tex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// Kit / regMat come from js/interiors.js (passed in to keep the modules acyclic)
export function buildArena(I, scene, Kit, regMat) {
  const A = ARENA;
  const k = new Kit(I, A.ox, A.oz, 0);
  const lit = (color, e = 0.25, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: color, emissiveIntensity: e, side: THREE.DoubleSide, ...o });
  const MT = {
    floor: lit('#1b1d22', 0.35), concrete: lit('#6f7276', 0.22), green: lit('#2f8a4c', 0.3), navy: lit('#26365f', 0.35),
    maroon: lit('#6b2a2c', 0.3), white: lit('#e6e6e1', 0.28), orange: lit('#d9792b', 0.45, { metalness: 0.3 }),
    wall: lit('#2a2c33', 0.2), roof: lit('#d8d9d6', 0.12), truss: lit('#9aa0a8', 0.2, { metalness: 0.6 }),
    stage: lit('#0d0e12', 0.1, { roughness: 0.35 }), barricade: lit('#c4c8cc', 0.35, { metalness: 0.6, roughness: 0.35 }),
    black: lit('#111114', 0.1), screenOff: new THREE.MeshStandardMaterial({ color: '#05060a', emissive: '#0c1020', emissiveIntensity: 1 }),
    exit: new THREE.MeshStandardMaterial({ color: '#1b9e4b', emissive: '#22d066', emissiveIntensity: 1.3 }),
    yellow: lit('#e8c21a', 0.5), rail: lit('#b9bec4', 0.3, { metalness: 0.7, roughness: 0.3 }), frame: lit('#2a2d33', 0.15, { metalness: 0.5 }),
    console: lit('#16171b', 0.12), cyan: new THREE.MeshBasicMaterial({ color: '#7fe3ff', toneMapped: false }),
  };
  // black floor covering in 1.2 m tiles
  MT.floor.map = tex(256, 256, (g) => { g.fillStyle = '#26282e'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#15161a'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 256); g.fillStyle = 'rgba(255,255,255,.025)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); });
  MT.floor.map.wrapS = MT.floor.map.wrapT = THREE.RepeatWrapping; MT.floor.map.repeat.set(60, 60); MT.floor.color.set('#ffffff'); MT.floor.emissive.set('#1b1d22');
  const shell = new THREE.Group(); shell.position.set(A.ox, k.base, A.oz); scene.add(shell);
  const geos = new Map(); const add = (mat, g) => { if (!geos.has(mat)) geos.set(mat, []); geos.get(mat).push(g); };
  const boxG = (x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
  const box = (mat, x0, x1, y0, y1, z0, z1, col = false) => { add(mat, boxG(x0, x1, y0, y1, z0, z1)); if (col) k.wallRect(x0, x1, z0, z1, y0, y1); };
  const rodG = (mat, a, b, r) => {
    const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = v.length(), g = new THREE.CylinderGeometry(r, r, L, 6);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize())); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); add(mat, g);
  };
  // bike-rack barricade (top / bottom rails, vertical bars, splayed feet) from (x0,z0) to (x1,z1)
  const rack = (x0, z0, x1, z1, H = 1.1, col = true) => {
    const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L;
    rodG(MT.barricade, [x0, H, z0], [x1, H, z1], 0.022); rodG(MT.barricade, [x0, 0.12, z0], [x1, 0.12, z1], 0.018);
    for (let t = 0; t <= L; t += 0.14) rodG(MT.barricade, [x0 + ux * t, 0.12, z0 + uz * t], [x0 + ux * t, H, z0 + uz * t], 0.009);
    for (let t = 0; t <= L + 0.01; t += 2.2) { const x = x0 + ux * t, z = z0 + uz * t; rodG(MT.barricade, [x - uz * 0.35, 0, z + ux * 0.35], [x + uz * 0.35, 0, z - ux * 0.35], 0.02); }
    if (col) k.wallLine(x0, z0, x1, z1, 0, H);
  };
  const wallPath = (pts, y0, y1) => { for (let i = 0; i < pts.length - 1; i++) k.wallLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], y0, y1); };
  // walkable treads: one surface per chunk of pieces (fewer polygons for groundAt)
  const treads = (d, y) => {
    const a = ring(d), b = ring(d + RUN);
    for (let i = 0; i < NPTS - 1; i += 6) {
      const j = Math.min(NPTS - 1, i + 6), poly = [...a.slice(i, j + 1), ...b.slice(i, j + 1).reverse()].map(([x, z]) => k.w(x, z));
      I.addSurface(poly, y);
    }
  };

  // ---------------- floor, roof, outer walls ----------------
  const ow = OUTER + 1;
  box(MT.floor, -FX - ow, FX + ow, -0.4, 0, -FZ - ow, BACK + 1);
  box(MT.roof, -FX - ow, FX + ow, A.ROOF, A.ROOF + 0.6, -FZ - ow, BACK + 1);
  for (let x = -FX - 20; x <= FX + 20; x += 8) box(MT.truss, x - 0.25, x + 0.25, A.ROOF - 2.4, A.ROOF, -FZ - OUTER, BACK);           // roof trusses
  box(MT.truss, -FX - OUTER, FX + OUTER, A.ROOF - 2.4, A.ROOF - 2.0, -0.3, 0.3);
  add(MT.wall, ribbon(ring(OUTER, BACK), UP.y0 + UP.n * RISE, ring(OUTER, BACK), A.ROOF));
  add(MT.wall, ribbon(ring(OUTER, BACK), 0, ring(OUTER, BACK), UP.y0 + UP.n * RISE));
  wallPath(ring(OUTER, BACK), 0, A.ROOF);
  box(MT.wall, -FX - OUTER, FX + OUTER, 0, A.ROOF, BACK, BACK + 1, true);
  // the skylight band of the white roof, faintly lit
  box(new THREE.MeshBasicMaterial({ color: '#3a4458' }), -FX - 6, FX + 6, A.ROOF - 0.05, A.ROOF, -FZ, FZ - 4);

  // ---------------- lower ring: maroon parapet with an orange rail, green seats ----------------
  const p0 = ring(0);
  add(MT.maroon, ribbon(p0, 0, p0, LOW.y0));
  wallPath(p0, 0, LOW.y0);
  add(MT.orange, ribbon(ring(0.05), LOW.y0 + 0.95, ring(0.05), LOW.y0 + 1.0));
  for (let i = 0; i < 20; i++) { const [x, z] = p0[Math.floor(i * (NPTS - 1) / 19)]; box(MT.orange, x - 0.03, x + 0.03, LOW.y0, LOW.y0 + 1, z - 0.03, z + 0.03); }
  const seats = []; // [x, y, z, heading, ring]
  const rows = (R0, mat) => {
    for (let r = 0; r < R0.n; r++) {
      const d = R0.d0 + r * RUN, y = R0.y0 + r * RISE, a = ring(d), b = ring(d + RUN);
      add(MT.concrete, ribbon(a, y, b, y));                                    // tread
      if (r) add(MT.concrete, ribbon(a, y - RISE, a, y));                      // riser
      // individual seats along the row (instanced below), stair aisles every 7th piece
      const sp = ring(d + RUN * 0.55);
      for (let i = 0; i < sp.length - 1; i++) {
        const [ax, az] = sp[i], [bx, bz] = sp[i + 1], L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;
        if (!aisle(i)) { // aisle: yellow nosing on the step edge, handrail post every other row
          add(MT.yellow, ribbon([a[i], a[i + 1]], y + 0.005, [ring(d + 0.06)[i], ring(d + 0.06)[i + 1]], y + 0.005));
          if (r % 2 === 0) { const mx = (ax + bx) / 2, mz = (az + bz) / 2; box(MT.rail, mx - 0.025, mx + 0.025, y, y + 0.9, mz - 0.025, mz + 0.025); }
          continue;
        }
        const n = Math.max(1, Math.floor(L / 0.52));
        for (let j = 0; j < n; j++) { const t = (j + 0.5) / n; seats.push([ax + (bx - ax) * t, y, az + (bz - az) * t, Math.atan2(nx, nz), mat === MT.green ? 0 : 1]); }
      }
      treads(d, y);
    }
  };
  rows(LOW, MT.green);
  // white walkway band between the rings: tall white face (you can't climb from the lower ring), walkway, white parapet
  const pc = ring(CONC.d0);
  add(MT.white, ribbon(pc, LOW.y0 + (LOW.n - 1) * RISE, pc, CONC.y + 1.1));
  wallPath(pc, 0, CONC.y);
  add(MT.concrete, ribbon(pc, CONC.y, ring(CONC.d0 + CONC.w), CONC.y));
  treads(CONC.d0, CONC.y); treads(CONC.d0 + RUN, CONC.y); treads(CONC.d0 + 2 * RUN, CONC.y);
  add(MT.orange, ribbon(ring(CONC.d0 + 0.05), CONC.y + 1.1, ring(CONC.d0 + 0.05), CONC.y + 1.16));
  rows(UP, MT.navy);
  for (const R0 of [LOW, UP]) { // handrails down the middle of every stair aisle
    for (let i = 0; i < NPTS - 1; i++) {
      if (aisle(i)) continue;
      const pt = (r) => { const q = ring(R0.d0 + r * RUN + RUN * 0.55); return [(q[i][0] + q[i + 1][0]) / 2, R0.y0 + r * RISE + 0.9, (q[i][1] + q[i + 1][1]) / 2]; };
      for (let r = 0; r < R0.n - 2; r += 2) { const a = pt(r), b = pt(r + 2); rodG(MT.rail, a, b, 0.022); }
    }
  }
  // section plates: 黃 (west side), 藍 (back), 橙 (east side); lower ring on the maroon wall, upper on the white band
  const wedges = []; for (let i = 0; i < NPTS - 1; i++) if (!aisle(i)) wedges.push(i);
  const atlas = document.createElement('canvas'); atlas.width = 1024; atlas.height = 512; const ag = atlas.getContext('2d'); let cell = 0;
  const signGeos = [];
  const sign = (text, colr, d, y, i0, i1, w = 1.1, h = 0.42) => {
    const p = ring(d), mi = Math.floor((i0 + i1) / 2), [ax, az] = p[mi], [bx, bz] = p[mi + 1], L = Math.hypot(bx - ax, bz - az);
    const cx = cell % 8, cy = Math.floor(cell / 8); if (cy >= 8) return; cell++;
    ag.fillStyle = colr; ag.fillRect(cx * 128 + 4, cy * 64 + 6, 120, 52); ag.fillStyle = '#fff'; ag.font = '900 34px "Noto Sans TC",sans-serif'; ag.textAlign = 'center'; ag.textBaseline = 'middle'; ag.fillText(text, cx * 128 + 64, cy * 64 + 33);
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, (cx * 128 + 4 + uv.getX(j) * 120) / 1024, 1 - (cy * 64 + 6 + (1 - uv.getY(j)) * 52) / 512);
    g.rotateY(Math.atan2((bz - az) / L, -(bx - ax) / L)); g.translate((ax + bx) / 2 - (bz - az) / L * 0.02, y, (az + bz) / 2 + (bx - ax) / L * 0.02); signGeos.push(g);
  };
  const SEC = (i) => { const j = i < P_SIDE ? 0 : i < P_SIDE + 2 * P_ARC + P_BACK ? 1 : 2; return [['橙', '#e07b24'], ['藍', '#2f62c9'], ['黃', '#d8a915']][j]; };
  for (let w = 0; w < wedges.length - 1; w++) {
    const i0 = wedges[w] + 1, i1 = wedges[w + 1], [nm, colr] = SEC(i0), no = 1 + (w % 4), ab = 'AB'[Math.floor(w / 4) % 2];
    sign(`${nm}${no}${ab}`, colr, -0.01, LOW.y0 * 0.55, i0, i1);
    sign(`${nm}${no + 1}${ab}`, colr, CONC.d0 - 0.01, CONC.y + 0.62, i0, i1, 0.9, 0.34);
  }
  const signTex = new THREE.CanvasTexture(atlas); signTex.colorSpace = THREE.SRGBColorSpace;
  if (signGeos.length) shell.add(new THREE.Mesh(mergeGeometries(signGeos), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false, side: THREE.DoubleSide })));
  // LED ribbon board along the front of the upper ring (concert.js scrolls it)
  const ribbonTex = tex(1024, 64, (g) => { g.fillStyle = '#05060a'; g.fillRect(0, 0, 1024, 64); });
  ribbonTex.wrapS = THREE.RepeatWrapping;
  const ledRibbon = new THREE.Mesh(ribbonUV(ring(CONC.d0 - 0.03), CONC.y + 0.86, ring(CONC.d0 - 0.03), CONC.y + 1.32, 16), new THREE.MeshBasicMaterial({ map: ribbonTex, toneMapped: false, side: THREE.DoubleSide }));
  shell.add(ledRibbon);
  // white band with a strip of high windows above the upper seats (as in the photos), catwalk and lighting rig under the roof
  add(MT.white, ribbon(ring(OUTER - 0.05, BACK), A.ROOF - 6, ring(OUTER - 0.05, BACK), A.ROOF - 2.4));
  add(new THREE.MeshBasicMaterial({ color: '#2c3446' }), ribbon(ring(OUTER - 0.08, BACK), A.ROOF - 5.2, ring(OUTER - 0.08, BACK), A.ROOF - 4.0, (i) => i % 2 === 0));
  for (const z of [-20, -4, 12]) { box(MT.truss, -FX - 4, FX + 4, 19.6, 20.2, z - 0.3, z + 0.3); box(MT.frame, -FX - 4, FX + 4, 19.4, 19.5, z - 0.6, z + 0.6); }
  const heads = []; for (const z of [-20, -4, 12]) for (let x = -FX - 2; x <= FX + 2; x += 4) heads.push([x, z]);
  for (const [x, z] of heads) { box(MT.frame, x - 0.22, x + 0.22, 19.0, 19.55, z - 0.22, z + 0.22); box(MT.frame, x - 0.15, x + 0.15, 18.6, 19.0, z - 0.15, z + 0.15); }
  // the rings end beside the stage: closed ends
  for (const s of [1, -1]) {
    box(MT.wall, s > 0 ? FX : -FX - OUTER, s > 0 ? FX + OUTER : -FX, 0, A.ROOF, FZ, FZ + 0.6, false);
    k.wallLine(s * FX, FZ, s * (FX + OUTER), FZ, 0, A.ROOF);
  }
  // a few vomitory doors with green EXIT lights at the back
  const exits = [];
  for (const [x, z, y] of [[-14, -FZ - 0.05, 0], [14, -FZ - 0.05, 0], [0, -FZ - OUTER + 0.1, UP.y0 + UP.n * RISE]]) {
    box(MT.black, x - 1.4, x + 1.4, y, y + 2.4, z - 0.1, z + 0.02);
    box(MT.exit, x - 0.6, x + 0.6, y + 2.5, y + 2.85, z - 0.12, z + 0.04);
    exits.push({ ...xz(k, x, z + (z > -FZ - 1 ? 1.4 : 1.6)), y });
  }

  // ---------------- main stage, runway, small square stage ----------------
  box(MT.stage, -FX, FX, 0, 1.8, STAGE_Z, BACK, true);
  box(MT.stage, -2.5, 2.5, 0, 1.4, 6, STAGE_Z, true);
  box(MT.stage, -5.5, 5.5, 0, 1.4, -5, 6, true);
  for (const [x0, x1, z0, z1] of [[-FX, FX, STAGE_Z - 0.04, STAGE_Z], [-2.55, -2.5, 6, STAGE_Z], [2.5, 2.55, 6, STAGE_Z], [-5.55, 5.55, -5.05, -5]])
    box(new THREE.MeshBasicMaterial({ color: '#7fe3ff' }), x0, x1, z0 === STAGE_Z - 0.04 ? 1.72 : 1.32, z0 === STAGE_Z - 0.04 ? 1.8 : 1.4, z0, z1); // LED edge strips
  const ledFloor = new THREE.Mesh(new THREE.PlaneGeometry(2 * FX - 2, BACK - STAGE_Z - 2), new THREE.MeshBasicMaterial({ map: tex(512, 256, (g) => {
    g.fillStyle = '#05060b'; g.fillRect(0, 0, 512, 256); for (let x = 0; x < 512; x += 16) for (let y = 0; y < 256; y += 16) { g.fillStyle = `rgba(80,120,255,${0.05 + ((x * 7 + y * 3) % 50) / 600})`; g.fillRect(x + 1, y + 1, 14, 14); }
  }), toneMapped: false }));
  ledFloor.rotation.x = -Math.PI / 2; ledFloor.position.set(0, 1.81, (STAGE_Z + BACK) / 2 - 0.5); shell.add(ledFloor);
  for (const sx of [-1, 1]) { // stairs up to the stage at the outer front corners, corner towers
    for (let i = 0; i < 6; i++) box(MT.frame, sx * (FX - 3.6) - 0.9, sx * (FX - 3.6) + 0.9, 0, 0.3 * (i + 1), STAGE_Z - 1.8 + i * 0.3, STAGE_Z - 1.5 + i * 0.3);
    const tx = sx * (FX - 0.8);
    for (const dx of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) box(MT.truss, tx + dx - 0.05, tx + dx + 0.05, 1.8, 17.2, STAGE_Z + 0.5 + dz - 0.05, STAGE_Z + 0.5 + dz + 0.05);
    for (let y = 3; y < 17; y += 1.2) box(MT.truss, tx - 0.55, tx + 0.55, y, y + 0.05, STAGE_Z - 0.05, STAGE_Z + 1.05);
    for (let y = 4; y < 16; y += 2.4) box(MT.cyan, tx - 0.3, tx + 0.3, y, y + 0.25, STAGE_Z - 0.06, STAGE_Z - 0.02);
  }
  // LED walls: centre (YouTube goes over it) + two side screens
  const SW = 22, SH = SW * 9 / 16, SY = 3.6, SZ = BACK - 1.2;
  box(MT.black, -SW / 2 - 0.5, SW / 2 + 0.5, SY - 0.5, SY + SH + 0.5, SZ, SZ + 0.4);
  box(MT.screenOff, -SW / 2, SW / 2, SY, SY + SH, SZ - 0.02, SZ);
  // TL, TR, BL, BR as seen from the floor: facing the stage (+z) your left hand is +x
  const screen = [[SW / 2, SY + SH], [-SW / 2, SY + SH], [SW / 2, SY], [-SW / 2, SY]]
    .map(([x, y]) => { const [wx, wz] = k.w(x, SZ - 0.03); return new THREE.Vector3(wx, k.base + y, wz); });
  for (const s of [1, -1]) box(MT.black, s * 17 - 5, s * 17 + 5, 5.6, 11.8, BACK - 3, BACK - 2.7);
  // truss with a row of white and blue lamps, line-array speakers hanging either side
  box(MT.truss, -21, 21, 17.2, 17.8, STAGE_Z + 3, STAGE_Z + 3.6);
  for (const s of [1, -1]) {
    box(MT.truss, s * 21 - 0.3, s * 21 + 0.3, 1.8, 17.8, STAGE_Z + 3, STAGE_Z + 3.6);
    for (let i = 0; i < 9; i++) box(MT.black, s * 22.5 - 0.6, s * 22.5 + 0.6, 9 + i * 0.75, 9.68 + i * 0.75, STAGE_Z + 1.2 - i * 0.04, STAGE_Z + 2.2);
    box(MT.truss, s * 22.5 - 0.05, s * 22.5 + 0.05, 15.8, A.ROOF - 2.4, STAGE_Z + 1.7, STAGE_Z + 1.8);
  }
  const lampG = new THREE.SphereGeometry(0.22, 10, 8), lamps = [];
  for (let i = 0; i < 26; i++) { const g = lampG.clone(); g.translate(-20 + i * 1.6, 16.95, STAGE_Z + 3.0); lamps.push(g); }
  const lampMesh = new THREE.Mesh(mergeGeometries(lamps), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); shell.add(lampMesh);
  const blues = [];
  for (let i = 0; i < 13; i++) { const g = lampG.clone(); g.translate(-19.2 + i * 3.2, 17.9 + 0.12, STAGE_Z + 3.3); blues.push(g); }
  const blueMesh = new THREE.Mesh(mergeGeometries(blues), new THREE.MeshBasicMaterial({ color: '#3d6bff', toneMapped: false })); shell.add(blueMesh);

  // ---------------- floor standing blocks (搖滾站區) behind metal barricades ----------------
  const blocks = [
    [-FX + 2, -3.5, 8, 19], [3.5, FX - 2, 8, 19],       // A: either side of the runway
    [-FX + 2, -7, -12, 4], [7, FX - 2, -12, 4],         // B: either side of the small stage
    [-FX + 2, -1, -31, -15], [1, FX - 2, -31, -15],     // C: the back half, split by the centre aisle
  ];
  for (const [x0, x1, z0, z1] of blocks) {
    const gap = 1.6, m = (x0 + x1) / 2; // entrance gap at the back of each block
    rack(x0, z1, x1, z1); rack(x0, z0, x0, z1); rack(x1, z0, x1, z1);
    rack(x0, z0, m - gap / 2, z0); rack(m + gap / 2, z0, x1, z0);
  }
  // pit barricade in front of the stage: solid crowd barrier with a step for security
  box(MT.frame, -FX + 1, FX - 1, 0, 1.2, STAGE_Z - 2.3, STAGE_Z - 2.15, true); box(MT.frame, -FX + 1, FX - 1, 0, 0.08, STAGE_Z - 2.15, STAGE_Z - 1.4);
  box(MT.rail, -FX + 1, FX - 1, 1.2, 1.26, STAGE_Z - 2.35, STAGE_Z - 2.1);
  // FOH: sound / lighting control platform between the C blocks and the small stage
  box(MT.frame, -4.5, 4.5, 0, 0.5, -14, -9.6, true); box(MT.console, -3.6, 3.6, 0.5, 1.45, -12.4, -11.5);
  box(MT.cyan, -3.4, -0.4, 1.46, 1.47, -12.3, -11.6); box(new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false }), 0.4, 3.4, 1.46, 1.47, -12.3, -11.6);
  box(MT.frame, -4.5, 4.5, 3.1, 3.2, -14.2, -9.4); for (const x of [-4.4, 4.4]) for (const z of [-14.1, -9.5]) box(MT.rail, x - 0.04, x + 0.04, 0.5, 3.1, z - 0.04, z + 0.04);
  rack(-5, -14.6, 5, -14.6); rack(-5, -9, 5, -9); rack(-5, -14.6, -5, -9); rack(5, -14.6, 5, -9);

  for (const [mat, list] of geos) { const m = new THREE.Mesh(mergeAll(list), mat); m.receiveShadow = false; m.castShadow = false; shell.add(m); }
  { // seats: a moulded shell (pan + curved back) on a dark frame, coloured per ring
    const pan = new THREE.BoxGeometry(0.44, 0.05, 0.4); pan.translate(0, 0.42, 0.02);
    const back = new THREE.CylinderGeometry(0.5, 0.5, 0.44, 10, 1, true, -0.42, 0.84); back.scale(0.5, 1, 0.22); back.translate(0, 0.66, -0.06);
    const shellG = mergeGeometries([norm(pan), norm(back)]);
    const frameG = mergeGeometries([norm(boxG(-0.02, 0.02, 0, 0.42, -0.04, 0.0)), norm(boxG(-0.2, 0.2, 0.36, 0.4, -0.02, 0.02))]);
    const seatMat = new THREE.MeshStandardMaterial({ roughness: 0.55, emissive: '#ffffff', emissiveIntensity: 0.12, side: THREE.DoubleSide });
    const A1 = new THREE.InstancedMesh(shellG, seatMat, seats.length), A2 = new THREE.InstancedMesh(frameG, MT.frame, seats.length);
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
    seats.forEach(([x, y, z, h, rg], i) => {
      M4.compose(P.set(x, y, z), Q.setFromAxisAngle(Y, h), S); A1.setMatrixAt(i, M4); A2.setMatrixAt(i, M4);
      A1.setColorAt(i, C.set(rg ? '#26365f' : '#2f8a4c').offsetHSL(0, 0, ((i * 7919) % 11 - 5) / 200));
    });
    A1.frustumCulled = A2.frustumCulled = false; shell.add(A1, A2);
  }
  I.zones.push({ name: '林口體育館', pts: [k.w(-FX - OUTER, -FZ - OUTER), k.w(FX + OUTER, -FZ - OUTER), k.w(FX + OUTER, BACK), k.w(-FX - OUTER, BACK)], y0: 0, y1: A.ROOF, ceil: () => A.ROOF - 1 });

  // ---------------- side screens, beams, crowd (concert.js animates them) ----------------
  const fx = new THREE.Group(); fx.position.copy(shell.position); scene.add(fx);
  const sideTex = tex(512, 288, (g) => { g.fillStyle = '#05060a'; g.fillRect(0, 0, 512, 288); });
  const sideMat = new THREE.MeshBasicMaterial({ map: sideTex, toneMapped: false });
  for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.4), sideMat); m.position.set(s * 17, 8.7, BACK - 3.05); m.rotation.y = Math.PI; fx.add(m); }
  const beams = [];
  const coneGeo = new THREE.ConeGeometry(1.6, 18, 18, 1, true); coneGeo.translate(0, -9, 0);
  for (let i = 0; i < 10; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const c = new THREE.Mesh(coneGeo, mat); c.position.set(-19 + i * 38 / 9, 17.2, STAGE_Z + 3.3); fx.add(c); beams.push(c);
  }
  // crowd: standing in the floor blocks, on their feet in front of the seats in the rings
  const spots = []; let s = 11; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (const [x0, x1, z0, z1] of blocks) for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.78) for (let z = z0 + 0.5; z < z1 - 0.3; z += 0.78) if (rnd() < 0.86) spots.push([x + (rnd() - 0.5) * 0.3, 0, z + (rnd() - 0.5) * 0.3]);
  for (const R0 of [LOW, UP]) for (let r = 0; r < R0.n; r++) {
    const pts = ring(R0.d0 + r * RUN + RUN * 0.45), y = R0.y0 + r * RISE;
    for (let i = 0; i < pts.length - 1; i++) {
      if (!aisle(i)) continue;
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.75));
      for (let j = 0; j < n; j++) if (rnd() < 0.62) { const t = (j + 0.5) / n; spots.push([ax + (bx - ax) * t, y, az + (bz - az) * t]); }
    }
  }
  // the audience is a sea of lightsticks in the dark (you watch in first person)
  const stickMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  // lightsticks bob on the GPU: y += |sin(t * speed + id * 0.37)| * amp (uniforms set by concert.js)
  const U = { uT: { value: 0 }, uAmp: { value: 0.05 }, uSpd: { value: 2 } };
  stickMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uT, uAmp, uSpd;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  float ph = uT * uSpd + float(gl_InstanceID) * 0.37;\n  transformed.y += abs(sin(ph)) * uAmp; transformed.x += sin(ph * 0.5) * uAmp * 0.6;');
  };
  const sticks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), stickMat, spots.length);
  const M4 = new THREE.Matrix4(), C = new THREE.Color();
  spots.forEach(([x, y, z], i) => { M4.makeTranslation(x, y + 1.7 + ((i * 37) % 10) / 40, z); sticks.setMatrixAt(i, M4); sticks.setColorAt(i, C.set('#ffffff')); });
  sticks.frustumCulled = false; fx.add(sticks);
  fx.visible = false;

  // where each ticket zone puts you (world x, z and the height above the floor), facing the stage
  const zoneSpot = (zi, r = Math.random()) => {
    const z = ARENA_ZONES[zi];
    if (z.kind === 'floor') {
      const bl = blocks.filter(([, , z0, z1]) => z0 >= z.z0 - 1 && z1 <= z.z1 + 1)[r < 0.5 ? 0 : 1];
      return { ...xz(k, bl[0] + 1 + (bl[1] - bl[0] - 2) * ((r * 2) % 1), bl[2] + 1 + (bl[3] - bl[2] - 2) * 0.5), y: 0 };
    }
    const R0 = z.ring === 'low' ? LOW : UP, pts = ring(R0.d0 + z.row * RUN + RUN * 0.45);
    // side: on a side straight near the stage; else on the back straight
    const i = z.side ? (r < 0.5 ? 6 + Math.floor(r * 2 * 14) : NPTS - 7 - Math.floor((r - 0.5) * 2 * 14)) : P_SIDE + P_ARC + 2 + Math.floor(r * (P_BACK - 4));
    const [x, zz] = pts[i];
    return { ...xz(k, x, zz), y: R0.y0 + z.row * RISE };
  };
  const plaza = buildPlaza(I, scene, k);
  return { k, base: k.base, fx, beams, sticks, spots, ribbonTex, sideTex, screen, zoneSpot, stage: xz(k, 0, STAGE_Z + 6), exits, lamps: lampMesh, U, plaza };
}
const xz = (k, x, z) => { const [wx, wz] = k.w(x, z); return { x: wx, z: wz }; };

// =====================================================================
// 外場：體育館外觀與廣場，依實景照片（街景、空拍、演唱會當天的新聞照）：
// - 接近正圓的圓筒形建築：米白色基座（入口是深色門洞），上面一圈白色鋸齒狀（W 字）柱子撐著米白色的粗環梁，
//   柱子後面是淺灰藍色的格子玻璃帷幕；屋頂是淺黃綠色的淺圓頂，有放射狀的分格線。
// - 基座外一圈紅磚鋪面，再外面是道路（白色標線、斑馬線）、雙臂路燈、草地和修剪的樹籬、圓形水池和旗桿。
// - 演唱會當天：建築底部圍一圈深色巡演大布條，入口前一台 LED 螢幕車，排隊欄杆和人潮，旁邊一排流動廁所；
//   往接駁車站的路上是白色快搭帳篷的攤販。
// =====================================================================
export const PLAZA = { cx: 0, cz: -8, R: 71, baseH: 2.4, colH: 17.5, beamH: 4.2, gateZ: -81, busZ: -150 };
export const STALLS = [
  { id: 'stick', name: '應援手燈', color: '#ff4fa3', x: -15, z: -110 },
  { id: 'card', name: '小卡・手幅', color: '#7b5bff', x: -15, z: -122 },
  { id: 'food', name: '雞排・珍奶', color: '#ff9f1a', x: -15, z: -134 },
  { id: 'sausage', name: '烤香腸', color: '#d0352b', x: 15, z: -110 },
  { id: 'towel', name: '應援毛巾', color: '#1aa3c4', x: 15, z: -122 },
  { id: 'free', name: '粉絲應援發放', color: '#3fae49', x: 15, z: -134 },
];
function buildPlaza(I, scene, k) {
  const P = PLAZA, g0 = new THREE.Group(); g0.position.set(ARENA.ox, k.base, ARENA.oz); scene.add(g0);
  const geos = new Map(); const add = (mat, g) => { if (!geos.has(mat)) geos.set(mat, []); geos.get(mat).push(g); };
  const lit = (color, e = 0.08, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, emissive: color, emissiveIntensity: e, ...o });
  const mapMat = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, ...o });
  const rep = (t, u, v) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(u, v); return t; };
  const MT = {
    asphalt: mapMat(rep(tex(256, 256, (g) => { g.fillStyle = '#4a4c50'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1500; i++) { const v = 60 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } }), 300, 300), { color: '#ffffff' }),
    brick: mapMat(rep(tex(256, 256, (g) => { g.fillStyle = '#8f4436'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x < 256; x += 32) { g.fillStyle = `rgb(${150 + Math.random() * 30 | 0},${66 + Math.random() * 18 | 0},${52 + Math.random() * 12 | 0})`; g.fillRect(x + 1, y + 1, 30, 14); } }), 1, 1)),
    plinth: lit('#e9e3d3', 0.12), white: lit('#f3f1ea', 0.14), beam: lit('#ece7da', 0.14),
    glass: mapMat(rep(tex(256, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#a9bccb'); gr.addColorStop(1, '#7f95a8'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, 90, 256); g.strokeStyle = '#dfe4e8'; g.lineWidth = 6; for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } for (let y = 0; y <= 256; y += 85) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    }), 1, 1), { metalness: 0.15, roughness: 0.3, emissive: '#8a9db0', emissiveIntensity: 0.55 }),
    dome: mapMat(tex(1024, 256, (g) => { g.fillStyle = '#b9d38c'; g.fillRect(0, 0, 1024, 256); g.fillStyle = 'rgba(70,90,60,.35)'; for (let x = 0; x < 1024; x += 1024 / 24) g.fillRect(x, 0, 3, 256); for (const y of [70, 150]) g.fillRect(0, y, 1024, 3); g.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < 1024; x += 1024 / 48) g.fillRect(x, 0, 1, 256); }), { roughness: 0.6, emissive: '#3a4a2a', emissiveIntensity: 0.25 }),
    steel: lit('#c4c8cc', 0.15, { metalness: 0.6, roughness: 0.35 }), dark: lit('#1a1b1f', 0.05), grass: lit('#5b8a42', 0.06), hedge: lit('#3f6f32', 0.08),
    curb: lit('#d9d8d2', 0.1), trunk: lit('#5a4330', 0.05), leaf: lit('#3e6b34', 0.08), bus: lit('#f4f4f2', 0.12), tent: lit('#fbfbf8', 0.2),
    water: new THREE.MeshStandardMaterial({ color: '#4d7a8f', metalness: 0.6, roughness: 0.15, emissive: '#1c3340', emissiveIntensity: 0.4 }),
    paint: new THREE.MeshBasicMaterial({ color: '#eeeeea' }), toiletB: lit('#2a6fc9', 0.15), toiletW: lit('#f2f2f2', 0.15),
  };
  const boxG = (x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
  const box = (mat, x0, x1, y0, y1, z0, z1, col = false) => { add(mat, boxG(x0, x1, y0, y1, z0, z1)); if (col) k.wallRect(x0, x1, z0, z1, y0, y1); };
  const rod = (mat, a, b, r, seg = 6) => {
    const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = v.length(), g = new THREE.CylinderGeometry(r, r, L, seg);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize())); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); add(mat, g);
  };
  const strut = (mat, a, b, w, d) => { // a box beam from a to b (w across the facade, d in depth)
    const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = v.length(), g = new THREE.BoxGeometry(w, L, d);
    const up = v.clone().normalize(), out = new THREE.Vector3((a[0] + b[0]) / 2 - P.cx, 0, (a[2] + b[2]) / 2 - P.cz).normalize(), side = new THREE.Vector3().crossVectors(up, out).normalize(), fwd = new THREE.Vector3().crossVectors(side, up);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(side, up, fwd)); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); add(mat, g);
  };
  const circ = (r, n = 96, th0 = 0, th1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => { const t = th0 + (th1 - th0) * i / n; return [P.cx + Math.cos(t) * r, P.cz + Math.sin(t) * r]; });
  const flat = (mat, r0, r1, y, n = 96) => { const g = new THREE.RingGeometry(r0, r1, n, 1); g.rotateX(-Math.PI / 2); g.translate(P.cx, y, P.cz); add(mat, g); };
  const R = P.R, B = P.baseH, CT = B + P.colH, BT = CT + P.beamH;

  // ---------------- ground: asphalt, red-brick ring, curb, lawn ring with hedges, roads with markings ----------------
  box(MT.asphalt, -900, 900, -0.5, -0.03, -900, 900);
  flat(MT.brick, R - 1, R + 13, 0.0);
  MT.brick.map.repeat.set(1, 1); { const g = geos.get(MT.brick).at(-1), uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 3, pos.getZ(i) / 3); }
  add(MT.curb, ribbon(circ(R + 13), 0, circ(R + 13), 0.18)); flat(MT.curb, R + 13, R + 13.4, 0.18);
  flat(MT.grass, R + 13.4, R + 21, 0.05);
  add(MT.hedge, ribbon(circ(R + 16.5, 96, 0.2, Math.PI - 0.2), 0, circ(R + 16.5, 96, 0.2, Math.PI - 0.2), 0.9)); // a clipped hedge on the north side
  for (const t of [Math.PI * 1.08, Math.PI * 1.92]) { const [x, z] = [P.cx + Math.cos(t) * (R + 17), P.cz + Math.sin(t) * (R + 17)]; box(MT.hedge, x - 6, x + 6, 0, 0.9, z - 0.8, z + 0.8); }
  // a road round the outside with a dashed centre line, and a crosswalk at the south approach
  for (let i = 0; i < 96; i += 2) { const p = circ(R + 27, 96); add(MT.paint, ribbon([p[i], p[i + 1]], 0.01, [p[i], p[i + 1]].map(([x, z]) => [x + (x - P.cx) / (R + 27) * 0.15, z + (z - P.cz) / (R + 27) * 0.15]), 0.01)); }
  for (const r of [R + 21.2, R + 33]) add(MT.paint, ribbon(circ(r), 0.01, circ(r + 0.15), 0.01));
  for (let x = -9; x <= 9; x += 1.4) box(MT.paint, x - 0.35, x + 0.35, 0, 0.012, P.cz - R - 33, P.cz - R - 21.5);
  // ---------------- the building ----------------
  add(MT.plinth, ribbon(circ(R + 0.8), 0, circ(R + 0.8), B));
  add(MT.plinth, ribbon(circ(R + 0.8), B, circ(R - 1.6), B));
  const N = 40;
  const glassG = (() => { const p = circ(R - 1.6, N * 2), pos = [], uv = []; for (let i = 0; i < p.length - 1; i++) { const [a, b] = [p[i], p[i + 1]]; pos.push(a[0], B, a[1], b[0], B, b[1], b[0], CT, b[1], a[0], B, a[1], b[0], CT, b[1], a[0], CT, a[1]); const u0 = i * 1.5, u1 = u0 + 1.5; uv.push(u0, 0, u1, 0, u1, 4, u0, 0, u1, 4, u0, 4); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; })();
  add(MT.glass, glassG);
  for (let i = 0; i < N; i++) { // the W: each leg runs from the plinth up to the beam, alternating
    const t0 = i / N * Math.PI * 2, t1 = (i + 1) / N * Math.PI * 2, rr = R + 0.2;
    const lo = [P.cx + Math.cos(t0) * rr, B, P.cz + Math.sin(t0) * rr], hi = [P.cx + Math.cos((t0 + t1) / 2) * rr, CT, P.cz + Math.sin((t0 + t1) / 2) * rr], lo2 = [P.cx + Math.cos(t1) * rr, B, P.cz + Math.sin(t1) * rr];
    strut(MT.white, lo, hi, 1.1, 1.3); strut(MT.white, hi, lo2, 1.1, 1.3);
  }
  add(MT.beam, ribbon(circ(R + 1.2), CT, circ(R + 1.2), BT)); add(MT.beam, ribbon(circ(R + 1.2), BT, circ(R - 2), BT)); add(MT.beam, ribbon(circ(R + 1.2), CT, circ(R - 1.6), CT));
  add(MT.dark, ribbon(circ(R + 1.22), CT + 0.35, circ(R + 1.22), CT + 0.5)); // shadow line under the fascia lip
  const cap = 0.42, dome = new THREE.SphereGeometry(1, 96, 12, 0, Math.PI * 2, 0, cap);
  dome.translate(0, -Math.cos(cap), 0); dome.scale((R - 1.8) / Math.sin(cap), 9 / (1 - Math.cos(cap)), (R - 1.8) / Math.sin(cap)); dome.translate(P.cx, BT, P.cz);
  add(MT.dome, dome);
  for (let i = 0; i < N; i++) k.wallLine(...circ(R + 0.9, N)[i], ...circ(R + 0.9, N)[i + 1], 0, 30); // you only get in through the ticket check
  // entrances: dark recesses in the plinth (south one is the concert entrance)
  for (const t of [Math.PI * 0.5, Math.PI * 1.5, Math.PI, 0, Math.PI * 1.25, Math.PI * 1.75]) {
    const [x, z] = [P.cx + Math.cos(t) * (R + 0.85), P.cz + Math.sin(t) * (R + 0.85)], g = new THREE.BoxGeometry(t === Math.PI * 1.5 ? 16 : 6, 2.2, 0.1);
    g.rotateY(-t + Math.PI / 2); g.translate(x, 1.1, z); add(MT.dark, g);
  }
  // building name plaques on the south face, above the entrance
  const nameTex = tex(1024, 96, (g) => { g.clearRect(0, 0, 1024, 96); [...'國立體育大學綜合體育館'].forEach((ch, i) => { g.fillStyle = '#f7f5ee'; g.fillRect(i * 93 + 4, 4, 86, 88); g.fillStyle = '#3b3b3b'; g.font = '900 64px "Noto Serif TC","Noto Sans TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, i * 93 + 47, 52); }); });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.06), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, toneMapped: false }));
  plaque.position.set(P.cx, B + 9, P.cz - R - 1.5); plaque.rotation.y = Math.PI; g0.add(plaque);
  // ---------------- concert day ----------------
  const gz = P.gateZ;
  // tour banner wrapped round the plinth on the south side (concert.js paints it for the group)
  const bandP = circ(R + 0.95, 40, Math.PI * 1.22, Math.PI * 1.78).reverse();
  const banner = new THREE.Mesh(ribbonUV(bandP, B + 0.2, bandP, B + 3.6, Math.PI * 0.56 * (R + 0.95)), new THREE.MeshBasicMaterial({ color: '#111', toneMapped: false, side: THREE.DoubleSide }));
  g0.add(banner);
  // LED screen truck in front of the entrance
  box(MT.dark, 16, 18.4, 0.5, 3.1, gz - 16, gz - 8, true); box(MT.dark, 16.3, 18.1, 0, 0.6, gz - 15, gz - 9);
  const truck = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.4), new THREE.MeshBasicMaterial({ color: '#111', toneMapped: false }));
  truck.position.set(17.2, 5.2, gz - 12); truck.rotation.y = Math.PI; g0.add(truck); box(MT.dark, 14.3, 20.1, 3.4, 7, gz - 12.2, gz - 12.05);
  // ticket-check lanes, tent, bag-check tables, queue fences
  const lanes = [-7.5, -2.5, 2.5, 7.5];
  for (const x of lanes) rod(MT.steel, [x - 2.5, 1.05, gz - 14], [x - 2.5, 1.05, gz - 2], 0.03);
  rod(MT.steel, [10, 1.05, gz - 14], [10, 1.05, gz - 2], 0.03);
  for (const x of [-10, -5, 0, 5, 10]) for (let z = gz - 14; z <= gz - 2; z += 2.4) rod(MT.steel, [x, 0, z], [x, 1.05, z], 0.025);
  for (let j = 0; j < 4; j++) { const x0 = -10 + j * 5; box(MT.dark, x0 + 0.6, x0 + 4.4, 0, 0.85, gz - 4.8, gz - 4.0, true); }
  box(MT.tent, -11, 11, 3.0, 3.15, gz - 7, gz - 2); for (const x of [-11, 11]) for (const z of [gz - 7, gz - 2]) rod(MT.steel, [x, 0, z], [x, 3, z], 0.06);
  // the queue: a serpentine of stanchion fences (enter at the south-west, snake up to the lanes)
  const fence = (x0, z0, x1, z1) => { rod(MT.steel, [x0, 1.05, z0], [x1, 1.05, z1], 0.03); const L = Math.hypot(x1 - x0, z1 - z0); for (let t = 0; t <= L + 0.01; t += 2.5) rod(MT.steel, [x0 + (x1 - x0) * t / L, 0, z0 + (z1 - z0) * t / L], [x0 + (x1 - x0) * t / L, 1.05, z0 + (z1 - z0) * t / L], 0.025); k.wallLine(x0, z0, x1, z1, 0, 1.1); };
  for (let r = 0; r < 3; r++) { const z = gz - 17 - r * 2.6; if (r % 2) fence(-20, z, 17.5, z); else fence(-17.5, z, 20, z); }
  fence(-20, gz - 22.2, -20, gz - 14); fence(20, gz - 22.2, 20, gz - 14); fence(-20, gz - 14, -10, gz - 14); fence(10, gz - 14, 20, gz - 14);
  for (const x of [-10, -5, 0, 5, 10]) k.wallLine(x, gz - 14, x, gz - 2, 0, 1.1); // lane rails
  k.wallLine(-24, gz - 14, -20, gz - 14, 0, 1.1); k.wallLine(20, gz - 14, 24, gz - 14, 0, 1.1);
  // a row of portable toilets (blue / white) off to the west
  for (let i = 0; i < 8; i++) { const x = -44 - i * 1.4, z = gz - 22; box(i % 2 ? MT.toiletW : MT.toiletB, x - 0.6, x + 0.6, 0, 2.3, z - 0.6, z + 0.6, true); box(MT.toiletW, x - 0.65, x + 0.65, 2.3, 2.42, z - 0.65, z + 0.65); }
  // stalls: white pop-up tents with a coloured valance and sign, a table with goods
  for (const st of STALLS) {
    const { x, z } = st, s = x < 0 ? 1 : -1;
    box(MT.tent, x - 1.6, x + 1.6, 2.45, 2.55, z - 1.6, z + 1.6);
    const roof = new THREE.ConeGeometry(2.3, 0.7, 4, 1, true); roof.rotateY(Math.PI / 4); roof.translate(x, 2.9, z); add(MT.tent, roof);
    box(lit(st.color, 0.3), x - 1.62, x + 1.62, 2.2, 2.45, z - 1.62, z - 1.58); box(lit(st.color, 0.3), x - 1.62, x + 1.62, 2.2, 2.45, z + 1.58, z + 1.62);
    box(lit(st.color, 0.3), x + s * 1.6 - 0.02, x + s * 1.6 + 0.02, 2.2, 2.45, z - 1.62, z + 1.62);
    for (const dx of [-1.55, 1.55]) for (const dz of [-1.55, 1.55]) rod(MT.steel, [x + dx, 0, z + dz], [x + dx, 2.5, z + dz], 0.035);
    box(MT.white, x + s * 1.0 - 0.4, x + s * 1.0 + 0.4, 0, 0.8, z - 1.4, z + 1.4, true);
    box(lit('#2a2b30', 0.1), x + s * 1.0 - 0.42, x + s * 1.0 + 0.42, 0.78, 0.82, z - 1.42, z + 1.42);
    for (let i = 0; i < 5; i++) box(lit(['#ff4fa3', '#ffd23f', '#7fe3ff', '#9b7bff', '#ff9f1a'][(i + 5 + Math.round(st.z)) % 5], 0.35), x + s * 1.0 - 0.25, x + s * 1.0 + 0.25, 0.82, 0.9 + (i % 3) * 0.07, z - 1.2 + i * 0.55, z - 0.85 + i * 0.55);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshBasicMaterial({ map: tex(512, 112, (g) => {
      g.fillStyle = st.color; g.fillRect(0, 0, 512, 112); g.fillStyle = '#fff'; g.font = '900 64px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(st.name, 256, 60);
    }), toneMapped: false }));
    sign.position.set(x + s * 1.63, 2.0, z); sign.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g0.add(sign);
    st.counter = xz(k, x + s * 2.3, z); st.seller = { ...xz(k, x - s * 0.1, z), h: s > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  // shuttle stop: shelter, sign, a white coach
  const bz = P.busZ;
  box(MT.steel, 6, 14, 2.8, 2.95, bz - 1.5, bz + 1.5); for (const x of [6.2, 13.8]) rod(MT.steel, [x, 0, bz - 1.3], [x, 2.8, bz - 1.3], 0.07);
  box(MT.glass, 6, 14, 0.2, 2.4, bz - 1.45, bz - 1.35);
  box(MT.bus, 16, 18.6, 0.4, 3.4, bz - 6, bz + 6, true); box(new THREE.MeshStandardMaterial({ color: '#2d3a48', metalness: 0.5, roughness: 0.2 }), 15.98, 18.62, 1.6, 2.7, bz - 5.6, bz + 5.2); box(MT.dark, 16.2, 18.4, 0, 0.5, bz - 4.5, bz + 4.5);
  const busSign = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.7), new THREE.MeshBasicMaterial({ map: tex(512, 40, (g) => { g.fillStyle = '#ff4fa3'; g.fillRect(0, 0, 512, 40); g.fillStyle = '#fff'; g.font = '900 30px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('演唱會接駁車 林口體育館 ⇄ 中原大學', 256, 31); }), toneMapped: false }));
  busSign.position.set(15.97, 3.0, bz); busSign.rotation.y = -Math.PI / 2; g0.add(busSign);
  // round fountain pool and flagpoles to the east (as in the aerial photo), double-arm street lamps and trees round the ring road
  const pool = [P.cx + R + 42, P.cz - 30];
  { const g = new THREE.CylinderGeometry(9, 9, 0.6, 48); g.translate(pool[0], 0.3, pool[1]); add(MT.curb, g); const w = new THREE.CircleGeometry(8.4, 48); w.rotateX(-Math.PI / 2); w.translate(pool[0], 0.55, pool[1]); add(MT.water, w); }
  for (let i = 0; i < 3; i++) { const x = P.cx + R + 30, z = P.cz - 52 + i * 3; rod(MT.steel, [x, 0, z], [x, 12, z], 0.08); box(lit(['#e8323c', '#ffffff', '#2f6bff'][i], 0.3), x, x + 0.02, 10.4, 11.8, z, z + 2.0); }
  for (let i = 0; i < 24; i++) {
    const t = i / 24 * Math.PI * 2 + 0.06, [x, z] = [P.cx + Math.cos(t) * (R + 22.5), P.cz + Math.sin(t) * (R + 22.5)], [ox, oz] = [Math.cos(t), Math.sin(t)];
    rod(MT.steel, [x, 0, z], [x, 10, z], 0.11);
    for (const sd of [-1, 1]) { const ex = x + -oz * sd * 2.2, ez = z + ox * sd * 2.2; rod(MT.steel, [x, 9.6, z], [ex, 10.2, ez], 0.06); box(new THREE.MeshBasicMaterial({ color: '#fff3d0' }), ex - 0.35, ex + 0.35, 9.95, 10.1, ez - 0.2, ez + 0.2); }
    if (i % 2) { const [tx, tz] = [P.cx + Math.cos(t + 0.13) * (R + 18), P.cz + Math.sin(t + 0.13) * (R + 18)]; rod(MT.trunk, [tx, 0, tz], [tx, 2.8, tz], 0.2); const c = new THREE.SphereGeometry(2.3, 10, 8); c.scale(1, 0.9, 1); c.translate(tx, 4.1, tz); add(MT.leaf, c); }
  }
  for (const [mat, list] of geos) { const m = new THREE.Mesh(mergeAll(list), mat); m.castShadow = false; m.receiveShadow = true; g0.add(m); }
  I.zones.push({ name: '林口體育館 外場', pts: [k.w(-160, -260), k.w(160, -260), k.w(160, 120), k.w(-160, 120)], y0: -5, y1: 4, outdoor: true, ceil: () => 999 }); // outdoors (a zone only so the helicopter can't come here)
  // where people stand in the queue and mill about (concert.js puts characters there)
  const ppl = []; let s = 21; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let r = 0; r < 3; r++) for (let x = -19; x < 19; x += 1.6) if (rnd() < 0.7) ppl.push([x + rnd() * 0.5, gz - 18.3 - r * 2.6, 0]);
  for (const x of lanes) for (let z = gz - 13; z < gz - 6; z += 1.4) if (rnd() < 0.8) ppl.push([x + (rnd() - 0.5) * 0.6, z, 0]);
  for (let gI = 0; gI < 12; gI++) { const cx = (rnd() - 0.5) * 70, cz = gz - 30 - rnd() * 60; if (Math.abs(cx) < 4 || Math.abs(Math.abs(cx) - 15) < 4.5) continue; for (let j = 0; j < 2 + (rnd() * 2 | 0); j++) ppl.push([cx + (rnd() - 0.5) * 2, cz + (rnd() - 0.5) * 2, rnd() * 6.28]); }
  g0.visible = false;
  return {
    group: g0, banner, truck, stalls: STALLS,
    people: ppl.slice(0, 64).map(([x, z, h]) => ({ ...xz(k, x, z), h })), // concert.js puts characters here
    bus: xz(k, 9, bz + 3), arrive: { ...xz(k, 4, bz + 6), h: 0 }, // h 0 = facing +z, toward the arena
    gate: xz(k, 2.5, gz - 7), staff: [-7.5, 7.5].map(x => ({ ...xz(k, x, gz - 3.6), h: Math.PI })),
    out: { ...xz(k, 0, gz - 10), h: Math.PI },
    walk: [[-7, gz - 26], [7, gz - 26], [7, bz + 10], [-7, bz + 10]].map(([x, z]) => xz(k, x, z)),
  };
}
