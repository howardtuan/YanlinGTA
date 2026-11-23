// 維澈樓 (OSM w392023424): outside only, nothing here can be entered.
// src/world/MapBuilder.js still draws the 9F slab from the OSM outline (so none of its shared random draws change);
// weicheLook() only swaps its facade look, and buildWeiche() adds everything the outline cannot say:
//  - the timber "box" of 維澈聯合行政服務中心 at the north-west end, lifted on round concrete columns over the
//    plaza, overhanging it by 4.5 m, its front a screen of dense timber fins over dark glass, a solid timber
//    prow at the north corner with a slit window and a triangular cantilevered balcony;
//  - the gold 「維澈聯合行政服務中心 / Administration and Services Center」 letters on its north-east side and
//    the outside stair with green railings climbing from the 2F walkway along that side;
//  - the 2F concrete walkway with green railing along the north-east face, the ground-floor colonnade under
//    the overhanging 5F-9F, the STARBUCKS board, the slanted columns (one wrapped in a steel grille);
//  - the terracotta stair core on the south-west side rising a storey above the roof, the 「維澈樓」 sign
//    on the north-west end wall and the sloped canopy over the top floor.
// Sources: Google 街景 2017-09 (24.95736,121.24076 朝 150°; 全景 nDeuCW6RAPYJknjU3a1b1w 24.9572155,121.2406134
// 朝 110°), 2022-08 (200 中北路 24.957258,121.240508 朝 115°), and a 2024-11 visitor photo of 中原會館 (in this
// building) from the lawn to the east. The south-west and south-east sides were not seen; the box's depth
// along the slab and the stair's slope are estimates.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H, groundY } from '../../world/Terrain.js';

export const WEICHE_ID = 'w392023424';
// OSM outline (data/cycu.json): A, B, C, D, E (west corner), F, G (north corner)
const PTS = [
  [-95.8, 122.5],
  [-96.3, 137.1],
  [-105.9, 133.6],
  [-109.4, 140.9],
  [-182.3, 102.8],
  [-179.9, 97.4],
  [-172.1, 80],
];
// heights above the building base (src/world/MapBuilder.js: 9 storeys of 3.3 m over 30.3 m)
const FL = 3.3,
  TOP = 30.3;
const BOX = { front: -4.5, back: 22, y0: 5.5, y1: 13.4, ne: -0.6, sw: 0.25, cham: 5.0, prow: 1.6 };

// tools/looks.json look for the slab, applied in src/core/Game.js (after the random draws in src/world/MapBuilder.js)
export function weicheLook() {
  return {
    wall: { base: 'smooth', colour: '#c9cccc' },
    // 1F dark glass, 2F-4F lake-green curtain wall, 5F-9F grey aluminium with one ribbon window per floor
    windows: {
      types: ['curtain', 'curtain', 'curtain', 'curtain', 'ribbon'],
      bay: 1.5,
      accent: '#5b6265',
      glass: '#4b6d70',
    },
    // end walls: pale stone with punched windows above the timber box (dark glass under it)
    faces: [
      {
        on: 'short',
        colour: '#ddd8ce',
        accent: '#7a7f82',
        glass: '#62829e',
        windows: { types: ['curtain', 'curtain', 'curtain', 'curtain', 'punched'], bay: 4.2 },
      },
    ],
    // 5F-9F project 1.2 m over the colonnade and the curtain wall below
    topFloor: { floors: 5, setback: -1.2 },
    // the frosted glass band of the top floor
    bands: [
      { colour: '#d7dedd', h: 2.5, depth: 0.08, at: 0.5, from: 8, to: 8 },
      { colour: '#aeb3b4', h: 0.12, depth: 0.15, at: 0, from: 5, to: 8 },
    ],
    parapet: { h: 0.6, colour: '#e6e6e2' },
    roof: { colour: '#c8c6c0' },
  };
}

// local frame: origin at the west corner E, +x along the north-west end wall towards G, +z into the building
function frame(pts) {
  const E = pts[4],
    G = pts[6],
    A = pts[0],
    D = pts[3];
  const L = Math.hypot(G[0] - E[0], G[1] - E[1]),
    ux = (G[0] - E[0]) / L,
    uz = (G[1] - E[1]) / L;
  const loc = ([x, z]) => [(x - E[0]) * ux + (z - E[1]) * uz, (x - E[0]) * -uz + (z - E[1]) * ux];
  const w = (lx, lz) => [E[0] + lx * ux - lz * uz, E[1] + lx * uz + lz * ux];
  const g = loc(G),
    a = loc(A),
    d = loc(D);
  const kNE = (a[0] - g[0]) / (a[1] - g[1]),
    kSW = d[0] / d[1];
  const nNE = [1, -kNE].map((v) => v / Math.hypot(1, kNE)),
    nSW = [-1, kSW].map((v) => v / Math.hypot(1, kSW));
  return {
    E,
    ux,
    uz,
    w,
    loc,
    ang: Math.atan2(uz, ux),
    wNW: g[0],
    // x of the north-east / south-west side at z, moved `off` metres outwards (measured square to the side)
    xNE: (z, off = 0) => g[0] + kNE * z + off / nNE[0],
    xSW: (z, off = 0) => kSW * z + off / nSW[0],
    nNE,
    nSW,
    kNE,
    kSW,
    len: a[1],
  };
}

export function weicheFootprints() {
  const F = frame(PTS);
  const z0 = BOX.front - 1.2,
    z1 = BOX.back;
  // the overhang and its columns, the stair along the north-east side, the stair core on the south-west side
  // (2.8 m out of the wall at z 3..10: the south-west edge keeps 3.3 m out from z = 2 on)
  return [
    [
      F.w(F.xSW(z0, 1.0), z0),
      F.w(F.xNE(z0, 1.0), z0),
      F.w(F.xNE(z1, 1.0), z1),
      F.w(F.xSW(z1, 3.3), z1),
      F.w(F.xSW(2.0, 3.3), 2.0),
    ],
  ];
}

// ---------------- textures / materials (shared, built once) ----------------
const TEX = {};
function ctex(key, w, h, draw, repeat = true) {
  if (TEX[key]) return TEX[key];
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (TEX[key] = t);
}
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
// red-brown timber cladding: vertical boards ~0.16 m wide (one texture repeat = 4 x 4 m)
const woodTex = () =>
  ctex('wcWood', 512, 512, (g, W, Hh) => {
    const r = lcg(77),
      bw = W / 25;
    for (let i = 0; i < 25; i++) {
      const k = 0.86 + r() * 0.22,
        c = [107, 74, 60].map((v) => Math.round(v * k));
      g.fillStyle = `rgb(${c})`;
      g.fillRect(i * bw, 0, bw, Hh);
      for (let j = 0; j < 14; j++) {
        g.fillStyle = `rgba(40,22,16,${0.05 + r() * 0.08})`;
        g.fillRect(i * bw + r() * bw, r() * Hh, 1 + r() * 1.5, 20 + r() * 120);
      }
      g.fillStyle = 'rgba(30,18,14,0.75)';
      g.fillRect(i * bw, 0, 1.6, Hh);
    }
    for (let y = 0; y < Hh; y += Hh / 4) {
      g.fillStyle = 'rgba(25,15,10,0.35)';
      g.fillRect(0, y, W, 1.2);
    } // board butt joints
  });
// fair-faced concrete with form-tie dots
const concTex = () =>
  ctex('wcConc', 256, 256, (g, W, Hh) => {
    const r = lcg(31);
    g.fillStyle = '#b1b0aa';
    g.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,60,55'},${0.03 + r() * 0.05})`;
      g.fillRect(r() * W, r() * Hh, 2 + r() * 8, 2 + r() * 8);
    }
    g.fillStyle = 'rgba(70,70,66,0.35)';
    g.fillRect(0, Hh / 2, W, 1);
    g.fillRect(W / 2, 0, 1, Hh);
    g.fillStyle = 'rgba(60,60,56,0.5)';
    for (const x of [W / 8, (3 * W) / 8, (5 * W) / 8, (7 * W) / 8])
      for (const y of [Hh / 4, (3 * Hh) / 4]) {
        g.beginPath();
        g.arc(x, y, 2.2, 0, 7);
        g.fill();
      }
  });
// glass behind the fins: dark panes, mullions every 1.5 m, a pale spandrel at the bottom of each storey
const finGlassTex = () =>
  ctex('wcFinGlass', 256, 256, (g, W, Hh) => {
    const gr = g.createLinearGradient(0, 0, 0, Hh);
    gr.addColorStop(0, '#3c4a4f');
    gr.addColorStop(1, '#202a2e');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#d8d8d4';
    g.fillRect(0, Hh - 34, W, 34);
    g.fillStyle = '#4b5154';
    g.fillRect(0, 0, 6, Hh);
    g.fillRect(W / 2, 0, 5, Hh);
    g.fillRect(0, Hh - 38, W, 4);
  });
const goldTex = () =>
  ctex(
    'wcGold',
    2048,
    400,
    (g, W) => {
      const line = (text, px, y, fam, wt) => {
        g.font = `${wt} ${px}px ${fam}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = 'rgba(30,18,10,0.55)';
        g.fillText(text, W / 2 + 5, y + 6); // relief shadow
        const gr = g.createLinearGradient(0, y - px / 2, 0, y + px / 2);
        gr.addColorStop(0, '#ecd08e');
        gr.addColorStop(0.5, '#c9a45c');
        gr.addColorStop(1, '#9c7a3c');
        g.fillStyle = gr;
        g.fillText(text, W / 2, y);
      };
      line('維澈聯合行政服務中心', 200, 130, '"Noto Serif TC","Songti TC","PMingLiU",serif', 900);
      line(
        'Administration  and  Services  Center',
        92,
        320,
        '"Times New Roman",Georgia,serif',
        700
      );
    },
    false
  );
const nameTex = () =>
  ctex(
    'wcName',
    1024,
    300,
    (g, W) => {
      g.font = '900 210px "Noto Serif TC","Songti TC","PMingLiU",serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(40,30,15,0.4)';
      g.fillText('維 澈 樓', W / 2 + 6, 156);
      g.fillStyle = '#9a7a3e';
      g.fillText('維 澈 樓', W / 2, 150);
    },
    false
  );
const sbuxTex = () =>
  ctex(
    'wcSbux',
    1024,
    112,
    (g, W, Hh) => {
      g.fillStyle = '#ecebe2';
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#00704a';
      g.font = '800 78px "Helvetica Neue",Arial,sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('S T A R B U C K S', W / 2, Hh / 2 + 3);
    },
    false
  );
// shop glass of the ground floor: dark aluminium frames over a lit interior
const shopTex = () =>
  ctex(
    'wcShop',
    512,
    256,
    (g, W, Hh) => {
      // one 6 m bay of floor-to-ceiling glass in dark aluminium frames (transom at 2.6 m of 3.2), a warm café behind
      const gr = g.createLinearGradient(0, 0, 0, Hh);
      gr.addColorStop(0, '#3e4a4e');
      gr.addColorStop(0.45, '#5a4a3a');
      gr.addColorStop(1, '#2a221c');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = 'rgba(255,214,150,0.55)';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(40 + i * 86, 66, 5, 0, 7);
        g.fill();
      } // pendant lamps
      g.fillStyle = 'rgba(40,30,24,0.9)';
      g.fillRect(20, 170, 150, 50);
      g.fillRect(300, 180, 180, 40); // counter, tables
      g.fillStyle = 'rgba(30,98,64,0.8)';
      g.fillRect(320, 110, 120, 16); // menu board
      const rf = g.createLinearGradient(0, 0, W, Hh);
      rf.addColorStop(0, 'rgba(190,215,225,0.22)');
      rf.addColorStop(0.5, 'rgba(190,215,225,0.04)');
      rf.addColorStop(1, 'rgba(190,215,225,0.18)');
      g.fillStyle = rf;
      g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#1d1e20';
      for (let x = 0; x <= W; x += W / 4) g.fillRect(x - 3, 0, 6, Hh);
      g.fillRect(0, 0, W, 5);
      g.fillRect(0, 48, W, 4);
      g.fillRect(0, Hh - 6, W, 6);
    },
    true
  );

const MATS = {};
function mat(key) {
  if (MATS[key]) return MATS[key];
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const m = {
    wood: () => std({ map: woodTex(), roughness: 0.75 }),
    woodPanel: () => std({ map: woodTex(), color: '#c9b3a8', roughness: 0.7 }),
    fin: () => std({ color: '#4f3328', roughness: 0.7 }),
    finGlass: () => std({ map: finGlassTex(), roughness: 0.15, metalness: 0.5 }),
    conc: () => std({ map: concTex(), color: '#d8d7d2', roughness: 0.95 }),
    concPlain: () => std({ color: '#a9a8a2', roughness: 0.95 }),
    soffit: () => std({ color: '#9c9b95', roughness: 0.95 }),
    rail: () => std({ color: '#2f6b4a', metalness: 0.35, roughness: 0.5 }),
    black: () => std({ color: '#1f1f20', metalness: 0.4, roughness: 0.5 }),
    greenGlass: () =>
      new THREE.MeshStandardMaterial({
        color: '#5f9a7a',
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    core: () => std({ color: '#c8957a', roughness: 0.9 }),
    coreTop: () => std({ color: '#b8b4ac' }),
    stone: () => std({ color: '#ddd8ce', roughness: 0.8 }),
    win: () => std({ color: '#3d5566', roughness: 0.15, metalness: 0.5 }),
    slot: () => std({ color: '#1c2226', roughness: 0.2, metalness: 0.3 }),
    frame: () => std({ color: '#5b6265', metalness: 0.5, roughness: 0.45 }),
    canopy: () => std({ color: '#e6e6e2', roughness: 0.6 }),
    steel: () => std({ color: '#c2c6ca', metalness: 0.8, roughness: 0.3 }),
    board: () => std({ color: '#ecebe2', roughness: 0.6 }),
    lamp: () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#fff4dc',
        emissiveIntensity: 0.8,
      }),
    shop: () =>
      new THREE.MeshStandardMaterial({
        map: shopTex(),
        emissive: '#ffffff',
        emissiveMap: shopTex(),
        emissiveIntensity: 0.25,
        roughness: 0.15,
        metalness: 0.3,
      }),
  }[key];
  return (MATS[key] = m());
}

// ---------------- geometry kit in the local frame (merged per material) ----------------
class Acc {
  constructor() {
    this.parts = new Map();
  }
  add(m, g) {
    if (g.index) g = g.toNonIndexed();
    if (!this.parts.has(m)) this.parts.set(m, []);
    this.parts.get(m).push(g);
    return g;
  }
  // axis-aligned box; tile = [u, v] metres per texture repeat (UVs in metres otherwise unscaled)
  box(m, x0, x1, y0, y1, z0, z1, tile) {
    const W = x1 - x0,
      Hh = y1 - y0,
      D = z1 - z0,
      g = new THREE.BoxGeometry(W, Hh, D);
    if (tile) tileUV(g, W, Hh, D, tile);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return this.add(m, g);
  }
  // box with cross-section w (horizontal) x h from point p to q (3D) — beams, stair flights, slanted columns
  beam(m, p, q, w, h, tile) {
    const P = new THREE.Vector3(...p),
      Q = new THREE.Vector3(...q),
      dir = Q.clone().sub(P),
      len = dir.length();
    const g = new THREE.BoxGeometry(w, h, len);
    if (tile) tileUV(g, w, h, len, tile);
    const z = dir.normalize(),
      x = new THREE.Vector3(0, 1, 0).cross(z);
    if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
    x.normalize();
    const y = z.clone().cross(x);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z));
    g.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    return this.add(m, g);
  }
  // vertical slab of thickness th along (ax,az)-(bx,bz)
  slab(m, ax, az, bx, bz, th, y0, y1, tile) {
    const dx = bx - ax,
      dz = bz - az,
      l = Math.hypot(dx, dz),
      g = new THREE.BoxGeometry(l, y1 - y0, th);
    if (tile) tileUV(g, l, y1 - y0, th, tile);
    g.rotateY(-Math.atan2(dz, dx));
    g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    return this.add(m, g);
  }
  cyl(m, x, z, r, y0, y1, seg = 16) {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg);
    g.translate(x, (y0 + y1) / 2, z);
    return this.add(m, g);
  }
  // flat polygon [[x,z]..] at height y, facing up (or down)
  flat(m, pts, y, down = false, tile = 4) {
    const v = pts.map(([x, z]) => new THREE.Vector2(x, z)),
      tris = THREE.ShapeUtils.triangulateShape(v, []);
    const pos = [],
      uv = [],
      nrm = [];
    for (const t of tris) {
      const o = down ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]];
      for (const i of o) {
        pos.push(pts[i][0], y, pts[i][1]);
        uv.push(pts[i][0] / tile, pts[i][1] / tile);
        nrm.push(0, down ? -1 : 1, 0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // keep the winding facing the normal whatever the polygon's orientation
    const a = new THREE.Vector3(...pos.slice(0, 3)),
      b = new THREE.Vector3(...pos.slice(3, 6)),
      c = new THREE.Vector3(...pos.slice(6, 9));
    if (b.sub(a).cross(c.sub(a)).y * (down ? -1 : 1) < 0) {
      for (let i = 0; i < pos.length; i += 9)
        for (let k = 0; k < 3; k++) {
          const t = pos[i + 3 + k];
          pos[i + 3 + k] = pos[i + 6 + k];
          pos[i + 6 + k] = t;
        }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    }
    return this.add(m, g);
  }
  // vertical wall quad from (ax,az) to (bx,bz), y0..y1, facing to the right of a->b; uv in tile metres
  wall(m, ax, az, bx, bz, y0, y1, tile = 4) {
    const l = Math.hypot(bx - ax, bz - az),
      nx = (bz - az) / l,
      nz = -(bx - ax) / l;
    const pos = [ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az];
    // tile: metres per repeat, or [u metres, 0] = stretch one repeat over the height
    const tu = Array.isArray(tile) ? tile[0] : tile,
      u1 = l / tu,
      v0 = Array.isArray(tile) ? 0 : y0 / tile,
      v1 = Array.isArray(tile) ? 1 : y1 / tile;
    const uv = [0, v0, u1, v0, u1, v1, 0, v0, u1, v1, 0, v1];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(Array(6).fill([nx, 0, nz]).flat(), 3)
    );
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // winding: a, b, b-top must turn counter-clockwise seen from the normal side
    const e1 = [bx - ax, 0, bz - az],
      e2 = [bx - ax, y1 - y0, bz - az],
      cr = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ];
    if (cr[0] * nx + cr[2] * nz < 0) {
      const p = g.attributes.position.array;
      for (const i of [0, 3])
        for (let k = 0; k < 3; k++) {
          const t = p[(i + 1) * 3 + k];
          p[(i + 1) * 3 + k] = p[(i + 2) * 3 + k];
          p[(i + 2) * 3 + k] = t;
        }
      const q = g.attributes.uv.array;
      for (const i of [0, 3])
        for (let k = 0; k < 2; k++) {
          const t = q[(i + 1) * 2 + k];
          q[(i + 1) * 2 + k] = q[(i + 2) * 2 + k];
          q[(i + 2) * 2 + k] = t;
        }
    }
    return this.add(m, g);
  }
  finish(group) {
    for (const [m, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat(m));
      mesh.castShadow = m !== 'greenGlass' && m !== 'lamp';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
function tileUV(g, W, Hh, D, [tu, tv]) {
  const uv = g.attributes.uv,
    dims = [
      [D, Hh],
      [D, Hh],
      [W, D],
      [W, D],
      [W, Hh],
      [W, Hh],
    ];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tu, (uv.getY(i) * dims[f][1]) / tv);
    }
}
// text / sign plane facing local direction (nx, nz)
function sign(group, tex, w, h, x, y, z, nx, nz, emissive = 0.15) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.35,
      metalness: 0.5,
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: emissive,
    })
  );
  m.position.set(x, y, z);
  m.rotation.y = Math.atan2(nx, nz);
  group.add(m);
  return m;
}

// ---------------- the building ----------------
export function buildWeiche(I, scene, data) {
  const b = data.buildings.find((q) => q.id === WEICHE_ID);
  const pts = b ? b.pts : PTS,
    F = frame(pts);
  const base = b && Number.isFinite(b.base) ? b.base : H(F.E[0], F.E[1]);
  const group = new THREE.Group();
  group.position.set(F.E[0], base, F.E[1]);
  group.rotation.y = -F.ang;
  const k = new Acc();
  const wl = (x, z) => F.w(x, z);
  const gy = (x, z) => {
    const p = wl(x, z);
    return groundY(p[0], p[1]) - base;
  }; // ground (incl. the plaza terrace) in local y
  const wallLocal = (ax, az, bx, bz, y0, y1) => {
    const p = wl(ax, az),
      q = wl(bx, bz);
    I.addWall(p[0], p[1], q[0], q[1], y0 + base, y1 + base);
  };
  const colRect = (x, z, r) => {
    const c = [
      [x - r, z - r],
      [x + r, z - r],
      [x + r, z + r],
      [x - r, z + r],
    ];
    for (let i = 0; i < 4; i++) wallLocal(...c[i], ...c[(i + 1) % 4], -2, 6);
    shapes.push({ name: 'column', y0: 0, y1: 6, pts: c.map(([px, pz]) => wl(px, pz)) });
  };
  const nNE = F.nNE,
    _nSW = F.nSW;
  // world-space outlines of the added parts (I.weiche.shapes: overlap checks)
  const shapes = [],
    shape = (name, loc, y0, y1) =>
      shapes.push({ name, y0, y1, pts: loc.map(([x, z]) => wl(x, z)) });
  const xNE = F.xNE,
    xSW = F.xSW;

  // ===== timber box (維澈聯合行政服務中心), 2F-4F over the plaza =====
  const { front: zF, back: zB, y0: Y0, y1: Y1 } = BOX;
  // front: the fin screen, then a solid timber "prow" angling out towards the plaza at the north corner
  // (the big slanted wall at the left of the plaza view), its tip carrying the balcony; then the north-east side
  const xF1 = xNE(zF, BOX.ne) - BOX.cham,
    TIP = [xNE(zF, BOX.ne) - 1.0, zF - BOX.prow];
  const box = [
    [xSW(zF, BOX.sw), zF],
    [xF1, zF],
    TIP,
    [xNE(0, BOX.ne), 0],
    [xNE(zB, BOX.ne), zB],
    [xSW(zB, BOX.sw), zB],
  ];
  const [P0, P1, PT, P2, P3, P4] = box;
  k.wall('finGlass', P0[0], P0[1], P1[0], P1[1], Y0, Y1, 3.0);
  for (const [a, c] of [
    [P1, PT],
    [PT, P2],
    [P2, P3],
    [P3, P4],
    [P4, P0],
  ])
    k.wall('wood', a[0], a[1], c[0], c[1], Y0, Y1 + 0.9);
  k.flat('soffit', box, Y0, true);
  k.flat('concPlain', box, Y1);
  shape('box', box, Y0, Y1 + 1.0);
  // floor spandrels behind the fins (white bands on each slab) and the box's bottom edge
  for (const y of [Y0, Y0 + 2.6, Y0 + 5.2])
    k.slab('board', P0[0], P0[1] - 0.06, P1[0], P1[1] - 0.06, 0.1, y, y + 0.45);
  k.slab('concPlain', P0[0], P0[1] - 0.15, P1[0], P1[1] - 0.15, 0.3, Y0 - 0.35, Y0 + 0.05);
  // dense vertical timber fins over the whole front, running ~1 m above the roof (a picket line seen from the gate)
  for (let x = P0[0] + 0.35; x < P1[0] - 0.2; x += 0.9)
    k.box('fin', x - 0.06, x + 0.06, Y0 - 0.3, Y1 + 1.0, zF - 0.65, zF - 0.02);
  // shorter fins along the roof edge of the prow
  for (const [a, c] of [
    [P1, PT],
    [PT, P2],
  ])
    for (let t = 0.08; t < 1; t += 0.14) {
      const x = a[0] + (c[0] - a[0]) * t,
        z = a[1] + (c[1] - a[1]) * t;
      k.box('fin', x - 0.06, x + 0.06, Y1, Y1 + 1.0, z - 0.06, z + 0.06);
    }
  // roof deck over the overhang: green railing set back behind the fins
  k.box('rail', P0[0] + 0.3, P1[0], Y1 + 1.05, Y1 + 1.12, zF + 0.4, zF + 0.46);
  for (let x = P0[0] + 0.3; x <= P1[0]; x += 1.8)
    k.box('rail', x - 0.03, x + 0.03, Y1, Y1 + 1.1, zF + 0.4, zF + 0.46);
  // the prow: a narrow slanted slot window on its plaza face; the triangular cantilevered balcony at its tip
  // (fair-faced concrete, black steel railing, a green glass side panel)
  {
    const seg = (a, c) => {
      const ex = c[0] - a[0],
        ez = c[1] - a[1],
        l = Math.hypot(ex, ez),
        tx = ex / l,
        tz = ez / l;
      return { l, at: (s, o) => [a[0] + tx * s + tz * o, a[1] + tz * s - tx * o] };
    };
    const f1 = seg(P1, PT),
      s0 = f1.at(f1.l * 0.2, 0.03),
      s1 = f1.at(f1.l * 0.8, 0.03);
    k.beam('slot', [s0[0], Y0 + 1.2, s0[1]], [s1[0], Y1 - 1.6, s1[1]], 0.04, 0.32);
    const f2 = seg(PT, P2),
      yb = 10.3,
      A = f2.at(0.2, 0),
      C = f2.at(Math.min(5.5, f2.l - 0.3), 0),
      T = f2.at(1.2, 1.7);
    k.flat('concPlain', [A, T, C], yb);
    k.flat('concPlain', [A, T, C], yb - 0.35, true);
    for (const [p, q] of [
      [A, T],
      [T, C],
    ]) {
      k.wall('concPlain', p[0], p[1], q[0], q[1], yb - 0.35, yb);
      k.beam('black', [p[0], yb + 1.1, p[1]], [q[0], yb + 1.1, q[1]], 0.05, 0.05);
      k.beam('black', [p[0], yb + 0.55, p[1]], [q[0], yb + 0.55, q[1]], 0.03, 0.03);
      for (let s2 = 0; s2 <= 1.001; s2 += 0.25) {
        const x = p[0] + (q[0] - p[0]) * s2,
          z = p[1] + (q[1] - p[1]) * s2;
        k.box('black', x - 0.025, x + 0.025, yb, yb + 1.1, z - 0.025, z + 0.025);
      }
    }
    k.wall('greenGlass', A[0], A[1], T[0], T[1], yb, yb + 1.05, 2);
    shape('balcony', [A, T, C], yb - 0.35, yb + 1.1);
  }
  // soffit downlights
  for (let x = 3; x < 22; x += 5)
    for (const z of [-3, 2, 8, 14, 19])
      if (x < xNE(z, -1) - (z < 0 ? 3 : 0) && x > xSW(z, -1))
        k.box('lamp', x - 0.15, x + 0.15, Y0 - 0.02, Y0 - 0.005, z - 0.15, z + 0.15);

  // ===== round columns under the overhang, square ones in the recessed glass line =====
  for (const x of [4.0, 11.5, 18.5]) {
    const z = zF + 1.4;
    k.cyl('conc', x, z, 0.55, gy(x, z) - 0.1, Y0, 20);
    colRect(x, z, 0.5);
  }
  for (const x of [2.5, 9.5, 16.5, 23.0]) {
    const z = -0.2,
      y = gy(x, z);
    k.box('conc', x - 0.4, x + 0.4, y - 0.1, Y0, z - 0.4, z + 0.4, [2, 2]);
    colRect(x, z, 0.4);
  }
  // slanted column at the north corner of the box (seen at the left of the plaza view)
  {
    const p = [PT[0] - 0.2, 0, PT[1] + 3.2],
      q = [PT[0] - 0.9, Y0, PT[1] + 0.9];
    p[1] = gy(p[0], p[2]) - 0.1;
    k.beam('conc', p, q, 0.75, 0.75, [2, 2]);
    colRect(p[0], p[2], 0.4);
  }

  // ===== north-east side: colonnade, 2F walkway, STARBUCKS, outside stair, gold letters =====
  const off = (z, o) => [xNE(z, o), z];
  // ground-floor columns on the outer line under the overhanging 5F-9F
  for (let z = zB + 2; z < F.len - 2; z += 7.2) {
    const [x] = off(z, -0.4);
    k.box('conc', x - 0.35, x + 0.35, gy(x, z) - 0.1, 13.2, z - 0.35, z + 0.35, [2, 2]);
    colRect(x, z, 0.35);
  }
  for (let z = 4; z < F.len - 6; z += 7.2) {
    const x = xSW(z, -0.4);
    k.box('conc', x - 0.35, x + 0.35, gy(x, z) - 0.1, 13.2, z - 0.35, z + 0.35, [2, 2]);
    colRect(x, z, 0.35);
  }
  // 2F walkway: fair-faced concrete slab and upstand, green railing (from the stair foot to the south-east end)
  {
    const z0 = zB - 0.6,
      z1 = F.len - 1.0,
      a = off(z0, -1.2),
      c = off(z1, -1.2),
      a2 = off(z0, 0.35),
      c2 = off(z1, 0.35);
    shape('walkway', [a, c, off(z1, 0.47), off(z0, 0.47)], FL - 0.35, FL + 1.3);
    k.flat('concPlain', [a, c, c2, a2], FL + 0.15);
    k.flat('soffit', [a, c, c2, a2], FL - 0.25, true);
    k.slab('conc', a2[0], a2[1], c2[0], c2[1], 0.25, FL - 0.35, FL + 0.55, [3, 3]);
    k.beam('rail', [a2[0], FL + 1.25, a2[1]], [c2[0], FL + 1.25, c2[1]], 0.07, 0.07);
    for (let z = z0; z <= z1; z += 0.15) {
      const [x] = off(z, 0.35);
      k.box('rail', x - 0.012, x + 0.012, FL + 0.55, FL + 1.22, z - 0.012, z + 0.012);
    }
  }
  // the outside stair: from the walkway at the box's south-east end up along the box to its roof level
  {
    const zs = zB - 0.3,
      ze = 7.5,
      ys = FL + 0.15,
      ye = 13.2,
      w = 1.6,
      oc = 0.2; // centre line 0.2 m outside the slab line
    const run = zs - ze,
      slope = (ye - ys) / run;
    const ctr = (z, o = 0) => [xNE(z, oc + o), z];
    const P = (z, o, dy = 0) => {
      const [x] = ctr(z, o);
      return [x, ys + (zs - z) * slope + dy, z];
    };
    k.beam('concPlain', P(zs, 0, -0.25), P(ze, 0, -0.25), w, 0.36); // flight
    // treads
    const n = Math.round((ye - ys) / 0.17);
    for (let i = 0; i < n; i++) {
      const z = zs - ((i + 0.5) * run) / n,
        [x] = ctr(z),
        y = ys + ((i + 1) * (ye - ys)) / n;
      k.box(
        'concPlain',
        x - w / 2 + 0.05,
        x + w / 2 - 0.05,
        y - 0.17,
        y,
        z - run / n / 2,
        z + run / n / 2
      );
    }
    // outer side panel and green railing along the flight; landing at the top running on under the 5F
    k.beam('conc', P(zs, w / 2 - 0.08, 0.1), P(ze, w / 2 - 0.08, 0.1), 0.16, 0.9, [3, 3]);
    for (const o of [w / 2 - 0.08]) {
      k.beam('rail', P(zs, o, 1.15), P(ze, o, 1.15), 0.07, 0.07);
      for (let z = zs; z >= ze; z -= 0.15) {
        const p = P(z, o, 0.55);
        k.box('rail', p[0] - 0.012, p[0] + 0.012, p[1], p[1] + 0.6, z - 0.012, z + 0.012);
      }
    }
    shape(
      'stair',
      [ctr(zs, -w / 2), ctr(zs, w / 2), ctr(-0.3, w / 2), ctr(-0.3, -w / 2)],
      ys - 0.8,
      ye + 1.1
    );
    const L0 = ctr(ze, -w / 2),
      L1 = ctr(-0.3, -w / 2),
      L2 = ctr(-0.3, w / 2),
      L3 = ctr(ze, w / 2);
    k.flat('concPlain', [L0, L1, L2, L3], ye);
    k.flat('soffit', [L0, L1, L2, L3], ye - 0.4, true);
    k.slab('conc', L3[0], L3[1], L2[0], L2[1], 0.16, ye - 0.4, ye + 0.5, [3, 3]);
    k.beam('rail', [L3[0], ye + 1.1, L3[1]], [L2[0], ye + 1.1, L2[1]], 0.07, 0.07);
    for (let z = ze; z >= -0.3; z -= 0.15) {
      const [x] = ctr(z, w / 2 - 0.08);
      k.box('rail', x - 0.012, x + 0.012, ye + 0.5, ye + 1.08, z - 0.012, z + 0.012);
    }
  }
  // gold letters on a framed timber panel standing proud of the box's north-east wall
  {
    const z0 = zB - 1.0,
      z1 = 8.5,
      y0 = 8.4,
      y1 = 12.6,
      a = off(z0, BOX.ne + 0.1),
      c = off(z1, BOX.ne + 0.1);
    k.slab('woodPanel', a[0], a[1], c[0], c[1], 0.2, y0, y1, [4, 4]);
    const m = off((z0 + z1) / 2, BOX.ne + 0.22);
    sign(
      group,
      goldTex(),
      Math.abs(z0 - z1) - 0.4,
      ((Math.abs(z0 - z1) - 0.4) * 400) / 2048,
      m[0],
      (y0 + y1) / 2,
      m[1],
      nNE[0],
      nNE[1],
      0.2
    );
  }
  // STARBUCKS: white board hung under the box edge in front of the shop glass, dark-framed glass behind
  {
    const z0 = 1.0,
      z1 = 8.2,
      a = off(z0, -1.0),
      c = off(z1, -1.0),
      m = off((z0 + z1) / 2, -0.92);
    k.slab('board', a[0], a[1], c[0], c[1], 0.12, 4.3, 5.2);
    k.box('black', m[0] - 0.05, m[0] + 0.05, 5.2, Y0, m[1] - 2, m[1] - 1.9);
    k.box('black', m[0] - 0.05, m[0] + 0.05, 5.2, Y0, m[1] + 1.9, m[1] + 2);
    sign(group, sbuxTex(), Math.abs(z1 - z0) - 0.1, 0.86, m[0], 4.75, m[1], nNE[0], nNE[1], 0.25);
    // the shop's glass front under the box (one texture per 6 m bay)
    const g0 = off(-0.2, -1.12),
      g1 = off(zB - 0.5, -1.12);
    k.wall('shop', g0[0], g0[1], g1[0], g1[1], gy(g0[0], g0[1]), 3.2, [6, 0]);
  }
  // slanted column wrapped in a vertical steel grille, between the shop glass and the board
  {
    const p = [xNE(10.5, -0.5), 0, 10.5],
      q = [xNE(9.0, -0.75), Y0, 9.0];
    p[1] = gy(p[0], p[2]) - 0.1;
    k.beam('conc', p, q, 0.7, 0.7);
    for (let i = -3; i <= 3; i++) {
      const o = i * 0.09;
      k.beam('steel', [p[0] + 0.38, p[1], p[2] + o], [q[0] + 0.38, q[1], q[2] + o], 0.03, 0.06);
    }
    colRect(p[0], p[2], 0.35);
  }

  // ===== terracotta stair core on the south-west side, one storey above the roof =====
  {
    const z0 = 3.0,
      z1 = 10.0,
      x0 = xSW(z0, 2.8),
      x1 = 5.0,
      top = TOP + FL;
    const y0 = Math.min(gy(x0, z0), gy(x0, z1)) - 0.3;
    k.box('core', x0, x1, y0, top, z0, z1);
    shape(
      'core',
      [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ],
      y0,
      top
    );
    // the core is solid from the ground up (it stands 2.8 m out of the south-west wall)
    const cc = [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ];
    for (let i = 0; i < 4; i++) wallLocal(...cc[i], ...cc[(i + 1) % 4], y0, top);
    // above the roof the terracotta block runs on across the end of the slab to about x = 11 m
    // (the 2022-08 view from the gate shows it about half as wide as the end wall, right of the canopy)
    const xp = 11.0;
    k.box('core', x1 - 0.05, xp, TOP - 0.05, top, z0, z1);
    k.box('coreTop', x0 - 0.1, xp + 0.1, top, top + 0.25, z0 - 0.1, z1 + 0.1);
    k.box('frame', x1 - 2.2, x1 - 1.0, top - 1.6, top - 0.6, z0 - 0.06, z0); // vent on top
    for (let f = 0; f < 10; f++) {
      // one small window per storey
      const y = 1.5 + f * FL;
      if (y > top - 1.2) break;
      k.box('win', x0 + 0.8, x0 + 1.8, y, y + 1.0, z0 - 0.05, z0);
      k.box('win', x0 - 0.05, x0, y, y + 1.0, z0 + 3.0, z0 + 4.0);
    }
  }
  // ===== north-west end wall: 「維澈樓」 on a blank stone panel at 8F, the sloped canopy over the top floor =====
  {
    const z = -0.06,
      x0 = 15.8,
      x1 = 23.2;
    k.box('stone', x0, x1, 22.9, 26.3, z - 0.06, 0.02);
    sign(group, nameTex(), 6.0, (6.0 * 300) / 1024, (x0 + x1) / 2, 24.9, z - 0.1, 0, -1, 0.1);
    // sloped canopy slab over the top floor, rising towards the plaza, on two steel struts
    const yA = TOP + 0.8,
      yB = TOP + 2.0,
      zA = 1.5,
      zB2 = -2.2,
      xa = 7.0,
      xb = 21.5;
    const g = new THREE.BoxGeometry(xb - xa, 0.22, Math.hypot(zA - zB2, yB - yA));
    g.rotateX(Math.atan2(yB - yA, zA - zB2));
    g.translate((xa + xb) / 2, (yA + yB) / 2, (zA + zB2) / 2);
    k.add('canopy', g);
    for (const x of [xa + 0.5, xb - 0.5])
      k.beam(
        'frame',
        [x, TOP + 0.6, 0.3],
        [x, yA + ((yB - yA) * (zA + 0.8)) / (zA - zB2), -0.8],
        0.12,
        0.12
      );
  }
  k.finish(group);
  scene.add(group);
  I.weiche = { group, shapes };
  return group;
}
