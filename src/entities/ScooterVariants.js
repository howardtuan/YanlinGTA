// Roadside parked scooter body types (ParkedScooters, src/core/ParkedScooters.js): the streets of 中壢 are
// not one model in ten colours, so each parked slot gets one of seven common Taiwanese silhouettes plus
// optional accessories, picked from a hash of its position (no shared rnd() draws, the map stays the same):
//   0 一般 125cc 速克達   the existing generic commuter (src/entities/Scooters.js), unchanged
//   1 運動速克達          sharp twin-LED front cowl, stepped seat, upswept muffler
//   2 小綿羊 50～100cc    short, narrow, small wheels, flat seat, rear rack
//   3 復古圓燈速克達      round chrome headlight on the bars, bulbous side cowls, brown seat, chrome rack
//   4 電動機車            slim flat body, long flat seat, LED strips, rear hub motor, no muffler
//   5 大羊／重型速克達    wide body, smoked windshield, backrest seat, centre tunnel, wide tyres
//   6 檔車                fuel tank ahead of the seat, exposed engine & frame, big thin wheels, long exhaust
// Accessories (bit flags): 1 後箱, 2 / 4 外送箱 (two colours), 8 / 16 安全帽掛在把手 (light / dark).
// Generic shapes only: no real brand marks or names.
//
// Rendering: every type is ONE merged, non-indexed geometry (paint + trim + wheels + all its accessories) with
// per-vertex colour, `paintMask` (colour slot: 0 keeps the vertex colour, 1 / 2 / 3 = the instance's main /
// secondary / accent paint) and `accBit` (0 = always drawn, else
// the bits an instance must carry: accessory, pair member). One InstancedMesh per (chunk, type group) draws them with one material; the
// per-instance `iAcc` bitmask collapses the vertices of accessories that slot does not carry. The same parts
// are rebuilt as ordinary meshes (shared geometry + cached materials) when a slot is knocked over (debris)
// or ridden away (Vehicle, src/entities/Vehicles.js), so mounting never swaps the look.
// Vehicle-space axes: +z forward, +y up, +x = rider's left; ground at y = 0. Every type keeps the commuter's
// footprint (z about -1.0..0.95, the parked capsule in ParkedScooters), seat top ~0.82 and bars ~(y 1.0, z 0.36)
// so the rider pose and the collision shapes stay aligned.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getParkedScooterAssets } from './Scooters.js';

export const SCOOTER_TYPES = 7;
export const TYPE_NAMES = [
  '機車',
  '運動速克達',
  '小綿羊',
  '復古速克達',
  '電動機車',
  '大羊速克達',
  '檔車',
];
// share of roadside parked scooters per type (stock on the street: mostly 125cc scooters, ~8% electric of new
// sales and more of the fleet from 2019-2022, ~1.6% big manual bikes but plenty of old 野狼-class bikes)
const TYPE_WEIGHTS = [0.3, 0.2, 0.1, 0.12, 0.14, 0.07, 0.07];
const PALETTES = [
  [
    '#e8e8e4',
    '#2a2a2c',
    '#b8bcc0',
    '#b8282a',
    '#2c5aa0',
    '#6b6e70',
    '#d8b440',
    '#3a3f48',
    '#f2f0ea',
    '#8a1c1c',
  ],
  ['#1c1c1e', '#3a3c40', '#e9e9e6', '#b01c22', '#1f4fa8', '#9aa0a6', '#e0a800', '#2f8f9d'],
  ['#f2f0ea', '#f3c6cf', '#a9d3e6', '#e9dfc7', '#c7302e', '#9fc8a0', '#2a2a2c', '#d9d9d4'],
  ['#a8d5c2', '#efe4cc', '#9cc3e0', '#c0392b', '#f4f1ea', '#9aa985', '#e8c868', '#5c6b7a'],
  ['#f0f0ee', '#8c9096', '#2a2c30', '#a9c8de', '#b8282a', '#e6c94a', '#5e7a63'],
  ['#2a2b2e', '#55595f', '#e6e6e2', '#1d2e4a', '#a9adb2', '#5a1f22'],
  ['#b01c1c', '#1c1c1e', '#1c3a6e', '#2f5a3a', '#e8e8e4', '#7a5a2a'],
];
export const ACC_TOPBOX = 1,
  ACC_DELIVERY_A = 2,
  ACC_DELIVERY_B = 4,
  ACC_HELMET_L = 8,
  ACC_HELMET_D = 16;

// deterministic 0..1 from a position (decimetres) and a salt
function spotHash(x, z, salt) {
  let h = Math.imul((Math.round(x * 10) | 0) ^ 0x2c1b3c6d, 0x85ebca6b);
  h ^= Math.imul((Math.round(z * 10) | 0) + salt * 7919, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Liveries: about a third of bikes are one colour, a third two-tone (secondary panels: front shield / fender /
// lower side panel / side cover, depending on the type) and a third three-colour (plus accent stripes and
// graphics). Secondary colours lean on black / white / grey plus each type's usual second colours.
const NEUTRALS = ['#1c1c1e', '#f0f0ec', '#8a8e93'];
const SECONDS = [
  ['#b8282a', '#2c5aa0'],
  ['#b01c22', '#1f4fa8', '#e0a800', '#2f8f9d'],
  ['#f3c6cf', '#a9d3e6', '#e9dfc7'],
  ['#efe4cc', '#f4f1ea', '#5a3a26'],
  ['#a9c8de', '#2b2d31'],
  ['#55595f', '#1d2e4a'],
  ['#c9a23a', '#b01c1c'],
];
const ACCENTS = [
  '#e8202a',
  '#1f4fa8',
  '#f2c200',
  '#2fb5c8',
  '#f07a1a',
  '#ffffff',
  '#7ac943',
  '#c9a23a',
  '#d6246e',
  '#1c1c1e',
];
// a colour from list by hash u that is not one of `not` (falls back to the first list entry that differs)
function pickOther(list, u, not) {
  const start = Math.floor(u * list.length);
  for (let i = 0; i < list.length; i++) {
    const c = list[(start + i) % list.length];
    if (!not.includes(c.toLowerCase())) return c;
  }
  return list[start];
}
// [main, secondary, accent] for a slot: equal entries collapse a two- or three-colour scheme back to fewer colours
// (hand-placed bikes keep their builder's main colour, e.g. a black / grey / white shed, and get the same mix of
// secondary and accent colours as everything else)
export function pickLivery(x, z, type, main) {
  const m = main.toLowerCase(),
    u = spotHash(x, z, 8);
  if (u < 0.34) return [main, main, main];
  const c2 = pickOther([...NEUTRALS, ...SECONDS[type]], spotHash(x, z, 9), [m]);
  if (u < 0.67) return [main, c2, c2];
  return [main, c2, pickOther(ACCENTS, spotHash(x, z, 10), [m, c2.toLowerCase()])];
}

// { type, acc, color, colors } for a parked slot at (x, z); keepColor: a hand-placed bike keeps its builder's
// main colour
export function pickScooterVariant(x, z, color, keepColor = false) {
  let u = spotHash(x, z, 1),
    type = 0;
  for (let i = 0; i < TYPE_WEIGHTS.length; i++) {
    if (u < TYPE_WEIGHTS[i]) {
      type = i;
      break;
    }
    u -= TYPE_WEIGHTS[i];
  }
  let acc = 0;
  if ((type === 0 || type === 1 || type === 4) && spotHash(x, z, 2) < 0.09)
    acc |= spotHash(x, z, 3) < 0.5 ? ACC_DELIVERY_A : ACC_DELIVERY_B;
  else if (spotHash(x, z, 4) < (type === 6 ? 0.05 : type === 3 ? 0.1 : 0.18)) acc |= ACC_TOPBOX;
  if (spotHash(x, z, 5) < 0.12) acc |= spotHash(x, z, 6) < 0.5 ? ACC_HELMET_L : ACC_HELMET_D;
  const pal = PALETTES[type];
  const c = keepColor && color ? color : pal[Math.floor(spotHash(x, z, 7) * pal.length)];
  return { type, acc, color: c, colors: pickLivery(x, z, type, c) };
}

// ------------------------------------------------------------------ geometry helpers
// every piece ends up non-indexed with only position + normal (mergeable with the generic commuter's parts)
function clean(g) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const a of Object.keys(n.attributes))
    if (a !== 'position' && a !== 'normal') n.deleteAttribute(a);
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
}
const box = (w, h, d, x, y, z, rx = 0, ry = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  return clean(g.translate(x, y, z));
};
// cylinder along an axis ('x' | 'y' | 'z'), optionally tilted about x afterwards
const cyl = (r0, r1, len, seg, x, y, z, axis = 'y', rx = 0) => {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  else if (axis === 'z') g.rotateX(Math.PI / 2);
  if (rx) g.rotateX(rx);
  return clean(g.translate(x, y, z));
};
const ell = (rx, ry, rz, x, y, z, ws = 10, hs = 7) =>
  clean(new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz).translate(x, y, z));
// side profile [[z, y], ...] extruded across x (width centred on x0), small bevel rounds the edges
function side(pts, width, x0 = 0, bevel = 0) {
  const sh = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  sh.closePath();
  const depth = Math.max(0.005, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(sh, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 4,
  });
  // shape x -> vehicle z, extrusion (0..depth along +z) -> vehicle x
  g.rotateY(-Math.PI / 2);
  g.translate(x0 + depth / 2, 0, 0);
  return clean(g);
}
const mirrorX = (g) => {
  const m = g.clone().scale(-1, 1, 1);
  // restore the winding after the mirror
  const p = m.attributes.position.array,
    n = m.attributes.normal.array;
  for (const a of [p, n])
    for (let j = 0; j < a.length; j += 9)
      for (let c = 0; c < 3; c++) {
        const t = a[j + 3 + c];
        a[j + 3 + c] = a[j + 6 + c];
        a[j + 6 + c] = t;
      }
  return m;
};

// wheel parts centred on the axle (origin), tyre / rim / hub colours
function wheelParts(R, W, rim = '#24262b', hub = '#c8cdd2', spokes = false) {
  const out = [
    [cyl(R, R, W, 12, 0, 0, 0, 'x'), '#18181a'],
    [cyl(R * 0.62, R * 0.62, W + 0.004, 10, 0, 0, 0, 'x'), rim],
    [cyl(R * 0.2, R * 0.2, W + 0.01, 6, 0, 0, 0, 'x'), hub],
  ];
  if (spokes)
    for (let i = 0; i < 4; i++) {
      const s = new THREE.BoxGeometry(0.008, R * 1.2, 0.012).rotateX((i * Math.PI) / 4);
      out.push([clean(s), '#b9bec4']);
    }
  return out;
}

// ------------------------------------------------------------------ the types
// Each builder fills: paint [geo], trim [[geo, hex]], wheels {R, W, front z, rear z, parts}, rack {y, z}
// (top of the rear rack / tail, where a box sits), hook [x, y, z] (where a helmet hangs), grips / feet.
function handlebarParts(T, y, z, half, mirrorY, mirrorX0 = 0.21, chrome = false) {
  T.push([cyl(0.015, 0.015, half * 2, 6, 0, y, z, 'x'), chrome ? '#c8cdd2' : '#151517']);
  for (const s of [-1, 1]) {
    T.push([box(0.04, 0.04, 0.1, s * (half - 0.04), y, z, 0, Math.PI / 2), '#202022']);
    T.push([box(0.012, mirrorY - y, 0.012, s * mirrorX0, (y + mirrorY) / 2, z + 0.02), '#1a1b1e']);
  }
}
function mirrorsFlat(T, y, z, x0 = 0.24) {
  for (const s of [-1, 1]) T.push([box(0.1, 0.065, 0.025, s * x0, y, z + 0.02), '#1a1b1e']);
}
function mirrorsRound(T, y, z, x0 = 0.24, hex = '#c8cdd2') {
  for (const s of [-1, 1]) T.push([cyl(0.045, 0.045, 0.02, 10, s * x0, y, z + 0.02, 'z'), hex]);
}
function forks(T, top, bottom, x = 0.065, hex = '#b9bec4', r = 0.018) {
  const dz = top[0] - bottom[0],
    dy = top[1] - bottom[1],
    len = Math.hypot(dz, dy),
    rx = Math.atan2(dz, dy);
  for (const s of [-1, 1])
    T.push([
      cyl(r, r, len, 6, s * x, (top[1] + bottom[1]) / 2, (top[0] + bottom[0]) / 2, 'y', rx),
      hex,
    ]);
}
const plate = (T, y, z) => {
  T.push([box(0.2, 0.1, 0.012, 0, y, z, -0.15), '#f4f4f0']);
  T.push([box(0.21, 0.11, 0.01, 0, y, z + 0.008, -0.15), '#1a1b1e']);
};

const BUILD = [
  null, // 0: the generic commuter, from src/entities/Scooters.js getParkedScooterAssets
  // 1 運動速克達
  (P, T, P2, P3) => {
    P.push(
      side(
        [
          [-1.0, 0.7],
          [-0.92, 0.79],
          [-0.55, 0.8],
          [-0.15, 0.745],
          [0.02, 0.64],
          [0.04, 0.42],
          [-0.25, 0.36],
          [-0.6, 0.42],
          [-0.9, 0.55],
        ],
        0.3,
        0,
        0.015
      )
    );
    P.push(
      side(
        [
          [0.16, 0.34],
          [0.22, 0.8],
          [0.3, 1.0],
          [0.46, 1.08],
          [0.6, 1.0],
          [0.68, 0.84],
          [0.6, 0.62],
          [0.46, 0.5],
          [0.4, 0.34],
        ],
        0.42,
        0,
        0.02
      )
    );
    P2.push(
      side(
        [
          [0.5, 0.44],
          [0.64, 0.47],
          [0.84, 0.41],
          [0.82, 0.38],
          [0.64, 0.43],
          [0.5, 0.41],
        ],
        0.14
      )
    );
    P2.push(box(0.3, 0.08, 0.13, 0, 1.03, 0.4));
    T.push([box(0.34, 0.08, 0.36, 0, 0.32, 0.1), '#1d1e20']);
    T.push([box(0.31, 0.09, 0.66, 0, 0.4, -0.34), '#1a1b1e']);
    T.push([
      side(
        [
          [-0.88, 0.8],
          [-0.6, 0.868],
          [-0.48, 0.852],
          [-0.4, 0.83],
          [-0.05, 0.825],
          [0.02, 0.78],
          [-0.88, 0.76],
        ],
        0.29
      ),
      '#151517',
    ]);
    // dark side stripes, twin LED headlights, sharp taillight
    // two-tone side panels, slanted accent stripes
    T.push([box(0.3, 0.045, 0.03, 0, 0.965, 0.662, -0.5), '#eef6ff']);
    T.push([box(0.16, 0.035, 0.03, 0, 0.88, 0.68, -0.3), '#eef6ff']);
    T.push([box(0.22, 0.05, 0.04, 0, 0.75, -0.995, 0.4), '#d01828']);
    T.push([box(0.26, 0.025, 0.22, 0, 0.82, -0.84), '#2a2c30']);
    handlebarParts(T, 1.0, 0.36, 0.31, 1.17);
    mirrorsFlat(T, 1.18, 0.36);
    forks(T, [0.5, 0.72], [0.64, 0.215]);
    T.push([box(0.09, 0.18, 0.56, 0.11, 0.27, -0.38), '#1a1b1e']);
    T.push([cyl(0.05, 0.055, 0.42, 8, -0.17, 0.36, -0.62, 'z', 0.45), '#2a2c30']);
    T.push([cyl(0.035, 0.035, 0.06, 8, -0.17, 0.45, -0.81, 'z', 0.45), '#c8cdd2']);
    plate(T, 0.55, -0.99);
    P2.push(box(0.336, 0.1, 0.44, 0, 0.47, -0.32, -0.2));
    P2.push(box(0.466, 0.16, 0.18, 0, 0.68, 0.5, 0.35));
    P3.push(box(0.342, 0.03, 0.5, 0, 0.64, -0.5, -0.16));
    P3.push(box(0.342, 0.018, 0.36, 0, 0.59, -0.42, -0.16));
    P3.push(box(0.47, 0.025, 0.2, 0, 0.9, 0.5, -0.5));
    return {
      wheels: { R: 0.215, W: 0.1, f: 0.64, r: -0.64, parts: wheelParts(0.215, 0.1, '#1c1c1e') },
      rack: { y: 0.832, z: -0.84 },
      hook: [0.3, 0.86, 0.36],
    };
  },
  // 2 小綿羊
  (P, T, P2, P3) => {
    P.push(
      side(
        [
          [-0.86, 0.68],
          [-0.8, 0.76],
          [-0.45, 0.77],
          [-0.12, 0.72],
          [0.0, 0.62],
          [0.0, 0.4],
          [-0.3, 0.34],
          [-0.65, 0.4],
          [-0.84, 0.56],
        ],
        0.26,
        0,
        0.02
      )
    );
    P2.push(
      side(
        [
          [0.18, 0.3],
          [0.24, 0.8],
          [0.3, 0.93],
          [0.42, 0.97],
          [0.48, 0.86],
          [0.46, 0.6],
          [0.4, 0.3],
        ],
        0.36,
        0,
        0.03
      )
    );
    P2.push(
      side(
        [
          [0.42, 0.38],
          [0.55, 0.41],
          [0.7, 0.36],
          [0.68, 0.33],
          [0.55, 0.37],
          [0.44, 0.35],
        ],
        0.12
      )
    );
    P2.push(box(0.3, 0.1, 0.14, 0, 0.99, 0.36));
    T.push([box(0.3, 0.06, 0.22, 0, 0.28, 0.09), '#2a2a2c']);
    T.push([
      side(
        [
          [-0.76, 0.8],
          [-0.05, 0.805],
          [0.0, 0.775],
          [0.0, 0.74],
          [-0.76, 0.74],
          [-0.8, 0.775],
        ],
        0.25
      ),
      '#1b1b1d',
    ]);
    T.push([box(0.14, 0.06, 0.03, 0, 0.99, 0.435), '#eef6ff']);
    T.push([box(0.14, 0.05, 0.03, 0, 0.66, -0.86), '#d01828']);
    T.push([box(0.22, 0.02, 0.2, 0, 0.78, -0.72), '#9aa0a6']);
    handlebarParts(T, 0.98, 0.34, 0.28, 1.13, 0.19);
    mirrorsRound(T, 1.14, 0.34, 0.2, '#1a1b1e');
    forks(T, [0.42, 0.62], [0.55, 0.18], 0.055);
    T.push([box(0.08, 0.15, 0.48, 0.1, 0.24, -0.34), '#1a1b1e']);
    T.push([cyl(0.04, 0.045, 0.3, 8, -0.14, 0.25, -0.5, 'z', 0.1), '#2a2c30']);
    plate(T, 0.5, -0.87);
    P3.push(box(0.306, 0.016, 0.62, 0, 0.66, -0.42, -0.06));
    P3.push(box(0.426, 0.02, 0.22, 0, 0.7, 0.33));
    return {
      wheels: { R: 0.18, W: 0.08, f: 0.55, r: -0.55, parts: wheelParts(0.18, 0.08, '#9aa0a6') },
      rack: { y: 0.79, z: -0.72 },
      hook: [0.27, 0.84, 0.34],
    };
  },
  // 3 復古圓燈速克達
  (P, T, P2, P3) => {
    P.push(
      side(
        [
          [-0.92, 0.66],
          [-0.85, 0.74],
          [-0.4, 0.745],
          [-0.1, 0.66],
          [0.0, 0.52],
          [0.0, 0.32],
          [-0.4, 0.3],
          [-0.8, 0.42],
        ],
        0.24,
        0,
        0.02
      )
    );
    const cowl = ell(0.16, 0.2, 0.36, 0.11, 0.5, -0.5);
    P.push(cowl, mirrorX(cowl));
    P.push(
      side(
        [
          [0.16, 0.28],
          [0.2, 0.86],
          [0.3, 0.96],
          [0.37, 0.9],
          [0.33, 0.3],
        ],
        0.44,
        0,
        0.03
      )
    );
    P2.push(
      side(
        [
          [0.44, 0.36],
          [0.52, 0.46],
          [0.7, 0.475],
          [0.84, 0.38],
          [0.8, 0.36],
          [0.7, 0.43],
          [0.52, 0.42],
          [0.48, 0.34],
        ],
        0.17,
        0,
        0.02
      )
    );
    P2.push(cyl(0.06, 0.06, 0.34, 10, 0, 1.0, 0.39, 'x'));
    // round chrome headlight, two-tone brown seat, chrome rack & round taillight
    T.push([cyl(0.078, 0.078, 0.05, 14, 0, 1.03, 0.47, 'z'), '#c8cdd2']);
    T.push([cyl(0.064, 0.064, 0.056, 14, 0, 1.03, 0.472, 'z'), '#f4f0d8']);
    T.push([
      side(
        [
          [-0.82, 0.79],
          [-0.7, 0.83],
          [-0.1, 0.83],
          [0.0, 0.79],
          [0.0, 0.74],
          [-0.82, 0.74],
        ],
        0.26
      ),
      '#5a3a26',
    ]);
    T.push([box(0.265, 0.018, 0.7, 0, 0.755, -0.42), '#e8e2d4']);
    T.push([box(0.36, 0.06, 0.26, 0, 0.3, 0.06), '#2a2a2c']);
    for (const x of [-0.1, 0, 0.1]) T.push([box(0.02, 0.01, 0.24, x, 0.335, 0.06), '#8a8d92']);
    T.push([box(0.24, 0.02, 0.24, 0, 0.8, -0.86), '#c8cdd2']);
    T.push([cyl(0.045, 0.045, 0.03, 10, 0, 0.7, -0.93, 'z'), '#d01828']);
    T.push([cyl(0.054, 0.054, 0.02, 10, 0, 0.7, -0.92, 'z'), '#c8cdd2']);
    handlebarParts(T, 1.0, 0.38, 0.3, 1.16, 0.22, true);
    mirrorsRound(T, 1.17, 0.38, 0.23);
    forks(T, [0.4, 0.6], [0.6, 0.2], 0.0, '#2a2a2c', 0.03);
    T.push([box(0.12, 0.12, 0.26, -0.14, 0.24, -0.5), '#2a2c30']);
    plate(T, 0.5, -0.92);
    P3.push(box(0.51, 0.022, 0.34, 0, 0.6, -0.5));
    P3.push(box(0.48, 0.03, 0.03, 0, 0.72, 0.39));
    return {
      wheels: {
        R: 0.2,
        W: 0.09,
        f: 0.6,
        r: -0.6,
        parts: wheelParts(0.2, 0.09, '#d8dadc', '#c8cdd2'),
      },
      rack: { y: 0.81, z: -0.86 },
      hook: [0.29, 0.87, 0.38],
    };
  },
  // 4 電動機車 (flat panels, no muffler)
  (P, T, P2, P3) => {
    P.push(
      side(
        [
          [-0.98, 0.74],
          [-0.9, 0.79],
          [-0.3, 0.78],
          [0.02, 0.72],
          [0.06, 0.6],
          [-0.05, 0.56],
          [-0.6, 0.6],
          [-0.95, 0.66],
        ],
        0.26,
        0,
        0.012
      )
    );
    P2.push(
      side(
        [
          [0.18, 0.32],
          [0.24, 0.9],
          [0.36, 1.02],
          [0.5, 1.0],
          [0.56, 0.84],
          [0.44, 0.5],
          [0.36, 0.32],
        ],
        0.3,
        0,
        0.012
      )
    );
    P2.push(
      side(
        [
          [0.5, 0.44],
          [0.64, 0.47],
          [0.84, 0.41],
          [0.82, 0.38],
          [0.64, 0.43],
          [0.5, 0.41],
        ],
        0.12
      )
    );
    T.push([
      side(
        [
          [-0.7, 0.6],
          [-0.05, 0.56],
          [0.02, 0.36],
          [-0.3, 0.32],
          [-0.62, 0.4],
        ],
        0.24
      ),
      '#2b2d31',
    ]);
    T.push([
      side(
        [
          [-0.92, 0.8],
          [-0.05, 0.812],
          [0.02, 0.78],
          [0.02, 0.75],
          [-0.92, 0.76],
        ],
        0.27
      ),
      '#1b1b1d',
    ]);
    T.push([box(0.32, 0.06, 0.34, 0, 0.3, 0.15), '#1d1e20']);
    // front LED ring + vertical strip, full-width tail strip, hub motor & swing arm
    T.push([box(0.22, 0.025, 0.03, 0, 0.96, 0.535, -0.35), '#eef6ff']);
    T.push([box(0.03, 0.2, 0.03, 0, 0.82, 0.545, -0.35), '#eef6ff']);
    T.push([box(0.26, 0.025, 0.03, 0, 0.745, -0.985), '#e0182a']);
    T.push([cyl(0.12, 0.12, 0.1, 12, -0.04, 0.21, -0.64, 'x'), '#55595f']);
    T.push([box(0.05, 0.07, 0.6, -0.1, 0.24, -0.36), '#3a3d42']);
    T.push([box(0.22, 0.02, 0.22, 0, 0.79, -0.84), '#2a2c30']);
    handlebarParts(T, 1.0, 0.36, 0.3, 1.16);
    mirrorsFlat(T, 1.17, 0.36);
    forks(T, [0.44, 0.7], [0.64, 0.21]);
    plate(T, 0.55, -0.98);
    P2.push(box(0.29, 0.07, 0.72, 0, 0.66, -0.5));
    P3.push(box(0.292, 0.014, 0.82, 0, 0.71, -0.45));
    return {
      wheels: { R: 0.21, W: 0.1, f: 0.64, r: -0.64, parts: wheelParts(0.21, 0.1, '#2a2c30') },
      rack: { y: 0.8, z: -0.84 },
      hook: [0.29, 0.86, 0.36],
    };
  },
  // 5 大羊／重型速克達
  (P, T, P2, P3) => {
    P.push(
      side(
        [
          [-1.02, 0.76],
          [-0.95, 0.86],
          [-0.55, 0.88],
          [-0.15, 0.8],
          [0.02, 0.66],
          [0.02, 0.42],
          [-0.3, 0.38],
          [-0.7, 0.46],
          [-0.98, 0.6],
        ],
        0.36,
        0,
        0.02
      )
    );
    P.push(
      side(
        [
          [0.14, 0.34],
          [0.18, 0.8],
          [0.3, 1.04],
          [0.5, 1.1],
          [0.7, 1.0],
          [0.8, 0.82],
          [0.7, 0.58],
          [0.52, 0.48],
          [0.42, 0.34],
        ],
        0.52,
        0,
        0.03
      )
    );
    P2.push(
      side(
        [
          [-0.02, 0.4],
          [0.18, 0.4],
          [0.18, 0.56],
          [-0.02, 0.64],
        ],
        0.2
      )
    );
    P2.push(
      side(
        [
          [0.56, 0.48],
          [0.7, 0.51],
          [0.9, 0.44],
          [0.88, 0.41],
          [0.7, 0.47],
          [0.56, 0.45],
        ],
        0.16
      )
    );
    T.push([
      side(
        [
          [-0.88, 0.92],
          [-0.8, 0.98],
          [-0.72, 0.98],
          [-0.62, 0.885],
          [-0.35, 0.86],
          [-0.25, 0.83],
          [0.0, 0.825],
          [0.04, 0.77],
          [-0.88, 0.8],
        ],
        0.36
      ),
      '#151517',
    ]);
    T.push([box(0.46, 0.4, 0.012, 0, 1.3, 0.6, -0.45), '#3d4550']);
    for (const s of [-1, 1]) {
      T.push([box(0.12, 0.05, 0.03, s * 0.12, 0.9, 0.79, -0.4, s * 0.3), '#eef6ff']);
      T.push([box(0.12, 0.05, 0.36, s * 0.17, 0.33, 0.1), '#1d1e20']);
    }
    T.push([box(0.3, 0.05, 0.04, 0, 0.82, -1.02, 0.3), '#d01828']);
    T.push([box(0.12, 0.2, 0.6, 0.13, 0.3, -0.38), '#1a1b1e']);
    T.push([cyl(0.06, 0.065, 0.46, 8, -0.2, 0.33, -0.62, 'z', 0.25), '#2a2c30']);
    T.push([cyl(0.045, 0.045, 0.05, 8, -0.2, 0.39, -0.85, 'z', 0.25), '#c8cdd2']);
    T.push([box(0.3, 0.025, 0.2, 0, 0.88, -0.9), '#2a2c30']);
    handlebarParts(T, 1.0, 0.36, 0.32, 1.08);
    for (const s of [-1, 1]) {
      T.push([box(0.012, 0.14, 0.012, s * 0.3, 1.13, 0.56), '#1a1b1e']);
      T.push([box(0.11, 0.07, 0.025, s * 0.32, 1.22, 0.56), '#1a1b1e']);
    }
    forks(T, [0.55, 0.72], [0.68, 0.235], 0.075);
    plate(T, 0.58, -1.02);
    P2.push(box(0.586, 0.14, 0.24, 0, 0.58, 0.55, 0.3));
    P3.push(box(0.406, 0.03, 0.62, 0, 0.66, -0.5, -0.12));
    P3.push(box(0.586, 0.025, 0.3, 0, 0.9, 0.6, -0.3));
    return {
      wheels: { R: 0.235, W: 0.13, f: 0.68, r: -0.66, parts: wheelParts(0.235, 0.13, '#3a3c40') },
      rack: { y: 0.893, z: -0.9 },
      hook: [0.32, 0.86, 0.36],
    };
  },
  // 6 檔車 (tank ahead of the seat, exposed engine & frame)
  (P, T, P2, P3) => {
    P.push(
      side(
        [
          [-0.05, 0.8],
          [0.05, 0.93],
          [0.4, 0.95],
          [0.48, 0.87],
          [0.42, 0.76],
          [0.0, 0.74],
        ],
        0.26,
        0,
        0.03
      )
    );
    P2.push(box(0.22, 0.16, 0.22, 0, 0.62, -0.22));
    P2.push(
      side(
        [
          [-0.92, 0.6],
          [-0.8, 0.7],
          [-0.45, 0.745],
          [-0.45, 0.7],
          [-0.8, 0.66],
          [-0.94, 0.52],
        ],
        0.14
      )
    );
    P2.push(
      side(
        [
          [0.48, 0.52],
          [0.66, 0.56],
          [0.86, 0.48],
          [0.84, 0.45],
          [0.66, 0.52],
          [0.48, 0.49],
        ],
        0.11
      )
    );
    // frame, engine, seat, shocks, swing arm, long chrome exhaust, round headlight, rack
    T.push([box(0.05, 0.05, 0.64, 0, 0.8, 0.16, -0.26), '#1a1a1c']);
    T.push([box(0.05, 0.6, 0.05, 0, 0.6, 0.34, 0.5), '#1a1a1c']);
    T.push([box(0.24, 0.24, 0.32, 0, 0.42, 0.0), '#6b6e72']);
    T.push([box(0.2, 0.22, 0.14, 0, 0.56, 0.2, -0.4), '#8a8d92']);
    T.push([box(0.1, 0.16, 0.2, 0.13, 0.4, 0.0), '#55585c']);
    T.push([
      side(
        [
          [-0.72, 0.82],
          [-0.65, 0.86],
          [-0.08, 0.86],
          [0.0, 0.82],
          [0.0, 0.76],
          [-0.72, 0.76],
        ],
        0.26
      ),
      '#151517',
    ]);
    for (const s of [-1, 1]) {
      T.push([cyl(0.02, 0.02, 0.38, 6, s * 0.12, 0.5, -0.56, 'y', 0.35), '#c8cdd2']);
      T.push([box(0.035, 0.04, 0.6, s * 0.1, 0.32, -0.36, 0.08), '#1a1a1c']);
      T.push([cyl(0.015, 0.015, 0.1, 6, s * 0.17, 0.32, -0.05, 'x'), '#2a2a2c']);
    }
    T.push([cyl(0.04, 0.04, 0.9, 8, -0.15, 0.3, -0.42, 'z', 0.06), '#c8cdd2']);
    T.push([cyl(0.05, 0.05, 0.12, 8, -0.15, 0.33, -0.9, 'z', 0.06), '#9aa0a6']);
    T.push([box(0.02, 0.06, 0.5, 0.12, 0.33, -0.36), '#1a1a1c']);
    T.push([ell(0.09, 0.09, 0.08, 0, 0.96, 0.6), '#1a1a1c']);
    T.push([cyl(0.086, 0.086, 0.03, 14, 0, 0.96, 0.66, 'z'), '#c8cdd2']);
    T.push([cyl(0.072, 0.072, 0.034, 14, 0, 0.96, 0.664, 'z'), '#f4f0d8']);
    T.push([box(0.1, 0.06, 0.06, 0, 0.72, -0.92), '#d01828']);
    T.push([box(0.26, 0.02, 0.3, 0, 0.8, -0.75), '#c8cdd2']);
    handlebarParts(T, 1.02, 0.4, 0.35, 1.18, 0.24, true);
    mirrorsRound(T, 1.19, 0.4, 0.25);
    forks(T, [0.5, 0.96], [0.66, 0.29], 0.08, '#c8cdd2', 0.022);
    plate(T, 0.56, -0.95);
    P3.push(box(0.326, 0.03, 0.4, 0, 0.86, 0.22));
    P3.push(box(0.326, 0.015, 0.36, 0, 0.82, 0.22));
    return {
      wheels: {
        R: 0.29,
        W: 0.08,
        f: 0.66,
        r: -0.66,
        parts: wheelParts(0.29, 0.08, '#b9bec4', '#c8cdd2', true),
      },
      rack: { y: 0.81, z: -0.75 },
      hook: [0.36, 0.88, 0.4],
    };
  },
];

// accessories at the type's anchors: [geo, hex, bit]
function accessoryParts(rack, hook) {
  const A = [];
  const { y, z } = rack;
  // 後箱
  A.push([box(0.4, 0.27, 0.36, 0, y + 0.145, z - 0.04), '#2a2c30', ACC_TOPBOX]);
  A.push([box(0.41, 0.04, 0.37, 0, y + 0.28, z - 0.04), '#1e2023', ACC_TOPBOX]);
  A.push([box(0.22, 0.035, 0.01, 0, y + 0.17, z - 0.225), '#c0182a', ACC_TOPBOX]);
  // 外送箱: big insulated box with a reflective band, two colours
  for (const [bit, hex, lid] of [
    [ACC_DELIVERY_A, '#d6246e', '#a81a55'],
    [ACC_DELIVERY_B, '#1f9a55', '#167440'],
  ]) {
    A.push([box(0.46, 0.42, 0.44, 0, y + 0.235, z - 0.06), hex, bit]);
    A.push([box(0.47, 0.05, 0.45, 0, y + 0.47, z - 0.06), lid, bit]);
    A.push([box(0.47, 0.035, 0.45, 0, y + 0.33, z - 0.06), '#d8dce0', bit]);
    A.push([box(0.3, 0.03, 0.3, 0, y + 0.015, z - 0.04), '#2a2c30', bit]);
  }
  // 安全帽 hanging by its strap under the left grip
  const [hx, hy, hz] = hook;
  for (const [bit, hex] of [
    [ACC_HELMET_L, '#ecebe6'],
    [ACC_HELMET_D, '#26282c'],
  ]) {
    const shell = new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)
      .scale(1, 0.95, 1.15)
      .rotateX(0.35)
      .translate(hx + 0.04, hy - 0.14, hz - 0.02);
    A.push([clean(shell), hex, bit]);
    A.push([
      clean(
        new THREE.CircleGeometry(0.128, 8)
          .rotateX(Math.PI / 2)
          .scale(1, 1, 1.15)
          .rotateX(0.35)
          .translate(hx + 0.04, hy - 0.14, hz - 0.02)
      ),
      '#1a1a1a',
      bit,
    ]);
    A.push([box(0.012, 0.12, 0.012, hx + 0.02, hy - 0.06, hz), '#1a1a1a', bit]);
  }
  return A;
}

// ------------------------------------------------------------------ per-type part sets (built once)
const TYPES = [];
function typeParts(type) {
  if (TYPES[type]) return TYPES[type];
  let def;
  if (type === 0) {
    const a = getParkedScooterAssets();
    // generic commuter: its painted loft + the lean trim (wheels included) as one vertex-coloured piece
    // plus a secondary lower side panel and an accent stripe over its loft
    def = {
      paint: [
        [clean(a.paintGeo.clone()), 1],
        [box(0.376, 0.07, 0.42, 0, 0.5, -0.36), 2],
        [box(0.378, 0.022, 0.5, 0, 0.62, -0.45, -0.1), 3],
      ],
      trim: [[a.trimGeo, null]],
      wheels: null,
      rack: { y: 0.812, z: -0.82 },
      hook: [0.3, 0.86, 0.36],
    };
  } else {
    const P = [],
      T = [],
      P2 = [],
      P3 = [];
    def = { trim: T, ...BUILD[type](P, T, P2, P3) };
    // paint pieces with their colour slot: 1 main, 2 secondary, 3 accent
    def.paint = [...P.map((g) => [g, 1]), ...P2.map((g) => [g, 2]), ...P3.map((g) => [g, 3])];
  }
  def.acc = accessoryParts(def.rack, def.hook);
  TYPES[type] = def;
  return def;
}

function colorize(g, hex, paintMask, accBit) {
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3),
    pm = new Float32Array(n).fill(paintMask),
    ab = new Float32Array(n).fill(accBit);
  if (hex) {
    const c = new THREE.Color(hex);
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
  } else if (g.attributes.color) col.set(g.attributes.color.array);
  else col.fill(1);
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', g.attributes.position);
  o.setAttribute('normal', g.attributes.normal);
  o.setAttribute('color', new THREE.BufferAttribute(col, 3));
  o.setAttribute('paintMask', new THREE.BufferAttribute(pm, 1));
  o.setAttribute('accBit', new THREE.BufferAttribute(ab, 1));
  return o;
}

// ------------------------------------------------------------------ instanced (parked) assets
let INST_MAT = null;
function instancedMaterial() {
  if (INST_MAT) return INST_MAT;
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.45,
    metalness: 0.15,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float paintMask;\nattribute float accBit;\nattribute float iAcc;\nattribute vec3 iColor2;\nattribute vec3 iColor3;'
      )
      .replace(
        '#include <color_vertex>',
        `#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	// paintMask is the colour slot: 0 keeps the vertex colour, 1 main (instanceColor), 2 secondary, 3 accent
	vec3 pc = paintMask < 1.5 ? instanceColor.xyz : ( paintMask < 2.5 ? iColor2 : iColor3 );
	vColor.xyz *= mix( vec3( 1.0 ), pc, step( 0.5, paintMask ) );
#endif`
      )
      .replace(
        '#include <begin_vertex>',
        // a vertex is drawn only when the instance carries every bit of its mask (accessory, group member)
        '#include <begin_vertex>\n{ int vm = int( accBit + 0.5 ); if ( vm != 0 && ( vm & int( iAcc + 0.5 ) ) != vm ) transformed = vec3( 0.0 ); }'
      );
  };
  m.customProgramCacheKey = () => 'parked-scooter-variants';
  INST_MAT = m;
  return m;
}

// Instanced mesh groups: the common types get a mesh of their own; the less common ones share one mesh in pairs
// (each member's vertices carry a member bit, so an instance only draws its own type) to keep the number of
// meshes per chunk at five instead of seven.
const GROUPS = [[0], [1], [4], [2, 3], [5, 6]];
const MEMBER_BITS = [32, 64];
const GROUP_OF = [],
  MEMBER_OF = [];
GROUPS.forEach((g, gi) =>
  g.forEach((t, mi) => {
    GROUP_OF[t] = gi;
    MEMBER_OF[t] = g.length > 1 ? MEMBER_BITS[mi] : 0;
  })
);
// which instanced mesh a slot of this type goes in, and the iAcc mask for it (accessories | member bit)
export const instancedGroupOf = (type) => GROUP_OF[type];
export const instanceMask = (type, acc) => acc | MEMBER_OF[type];

const INST_GEO = [];
// one merged geometry per group for the InstancedMesh (needs `iAcc`, `iColor2`, `iColor3` InstancedBufferAttributes
// per mesh; the main colour is the instanceColor)
export function getVariantInstancedAssets(group) {
  if (INST_GEO[group]) return INST_GEO[group];
  const list = [];
  for (const type of GROUPS[group]) {
    const d = typeParts(type),
      mb = MEMBER_OF[type];
    for (const [g, slot] of d.paint) list.push(colorize(g, '#ffffff', slot, mb));
    for (const [g, hex] of d.trim) list.push(colorize(g, hex, 0, mb));
    if (d.wheels)
      for (const z of [d.wheels.f, d.wheels.r])
        for (const [g, hex] of d.wheels.parts)
          list.push(colorize(g.clone().translate(0, d.wheels.R, z), hex, 0, mb));
    for (const [g, hex, bit] of d.acc) list.push(colorize(g, hex, 0, bit | mb));
  }
  const geo = mergeGeometries(list);
  geo.computeBoundingSphere();
  INST_GEO[group] = { geo, mat: instancedMaterial() };
  return INST_GEO[group];
}

// ------------------------------------------------------------------ ordinary meshes (debris / ridden)
const MESH_GEO = [];
function meshGeometry(type) {
  if (MESH_GEO[type]) return MESH_GEO[type];
  const d = typeParts(type);
  const byHex = new Map();
  for (const [g, hex] of d.trim) {
    if (!byHex.has(hex)) byHex.set(hex, []);
    byHex.get(hex).push(g);
  }
  const accBy = new Map();
  for (const [g, hex, bit] of d.acc) {
    const k = `${bit}|${hex}`;
    if (!accBy.has(k)) accBy.set(k, { bit, hex, list: [] });
    accBy.get(k).list.push(g);
  }
  let wheel = null;
  if (d.wheels) {
    const wb = new Map();
    for (const [g, hex] of d.wheels.parts) {
      if (!wb.has(hex)) wb.set(hex, []);
      wb.get(hex).push(g);
    }
    wheel = [...wb].map(([hex, l]) => ({ hex, geo: mergeGeometries(l) }));
  }
  MESH_GEO[type] = {
    paint: [1, 2, 3]
      .map((slot) => ({ slot, list: d.paint.filter((p) => p[1] === slot).map((p) => p[0]) }))
      .filter((p) => p.list.length)
      .map(({ slot, list }) => ({ slot, geo: mergeGeometries(list) })),
    trim: [...byHex].map(([hex, l]) => ({ hex, geo: hex ? mergeGeometries(l) : l[0] })),
    acc: [...accBy.values()].map(({ bit, hex, list }) => ({
      bit,
      hex,
      geo: mergeGeometries(list),
    })),
    wheel,
  };
  return MESH_GEO[type];
}
const MATS = new Map();
function mat(key, make) {
  let m = MATS.get(key);
  if (!m) MATS.set(key, (m = make()));
  return m;
}
const trimMat = (hex) =>
  mat(`t${hex}`, () =>
    hex
      ? new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.2 })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.2 })
  );
const paintMat = (hex) =>
  mat(
    `p${hex}`,
    () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.32, metalness: 0.15 })
  );

const asColors = (c) => (Array.isArray(c) ? c : [c, c, c]);
// the painted parts in their livery colours ([main, secondary, accent] or one colour); skipMain: only the
// secondary / accent overlays (the generic commuter's detailed drivable model already has its main body)
export function addScooterLivery(group, type, colors, skipMain = false) {
  const c = asColors(colors);
  for (const p of meshGeometry(type).paint) {
    if (skipMain && p.slot === 1) continue;
    const m = new THREE.Mesh(p.geo, paintMat(c[p.slot - 1]));
    m.castShadow = true;
    group.add(m);
  }
  return group;
}

// only the accessories of a slot, for the generic commuter (its drivable model is the detailed one)
export function addScooterAccessories(group, type, acc) {
  if (!acc) return group;
  for (const a of meshGeometry(type).acc) {
    if (!(acc & a.bit)) continue;
    const m = new THREE.Mesh(a.geo, trimMat(a.hex));
    m.castShadow = true;
    group.add(m);
  }
  return group;
}

// the whole bike as ordinary meshes: wheels are their own nodes at the axles (userData.wheels) so a ridden
// bike turns them, rider anchors in userData.rider
export function buildScooterVariant(type, colors, acc = 0) {
  const G = meshGeometry(type),
    d = typeParts(type);
  const g = new THREE.Group();
  const add = (geo, m) => {
    const o = new THREE.Mesh(geo, m);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  addScooterLivery(g, type, colors);
  for (const t of G.trim) add(t.geo, trimMat(t.hex));
  addScooterAccessories(g, type, acc);
  const wheels = [];
  if (G.wheel) {
    for (const z of [d.wheels.f, d.wheels.r]) {
      const w = new THREE.Group();
      for (const p of G.wheel) w.add(new THREE.Mesh(p.geo, trimMat(p.hex)));
      w.children.forEach((c) => (c.castShadow = true));
      w.position.set(0, d.wheels.R, z);
      g.add(w);
      wheels.push(w);
    }
  }
  g.userData.wheels = wheels;
  const [, , hz] = d.hook;
  g.userData.rider = {
    grips: [
      [0.3, 1.0, hz],
      [-0.3, 1.0, hz],
    ],
    feet: [
      [0.12, 0.365, 0.13],
      [-0.12, 0.365, 0.13],
    ],
  };
  return g;
}
