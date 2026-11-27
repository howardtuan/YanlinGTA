// 體育園區網球場（體育館西北、縱貫線南側）：學校公告共四面，排成錯開的兩塊。
//  北塊兩面、南塊兩面，都是南北向；北塊西邊是一塊綠色練習場，北塊北緣有一間小管理室。
//  OSM way 492479181（L 形 pitch，sport=tennis）；場地、鋪面、管理室、休息棚照 NLSC 2024 正射圖量：
//  外圍紅色、球場藍灰色、練習場綠色。圍網高度、燈桿位置與數量、裁判椅是推測（正射圖只看得到東側一支燈桿）。
//  標線照標準雙打場（23.77 × 10.97 m，單打邊線 8.23 m，發球線離網 6.40 m），網柱在雙打邊線外 0.914 m。
// 鋪面和線畫在 src/world/MapBuilder.js 的 areas 圖層（和 src/world/Court.js 同一層），圍網、球網、燈桿、棚子在這裡蓋。
import * as THREE from 'three';
import { H } from './Terrain.js';
import { markShared, scaledCanvas } from '../graphics/GpuMemLifecycle.js';

// local frame: origin at the north-west court's centre, u along the courts (south +), v across (east +)
export const O = [-44.6, -316.4],
  D = [-0.026, 0.9997];
export const tennisP = (u, v) => [O[0] + D[0] * u + D[1] * v, O[1] + D[1] * u - D[0] * v];
// court centres (u, v): north block two, south block two
export const TENNIS = [
  [0, 0],
  [0, 14.85],
  [35.9, -22.35],
  [35.9, -7.25],
];
export const HL = 23.77 / 2,
  HW = 10.97 / 2,
  SW = 8.23 / 2,
  SV = 6.4,
  NP = HW + 0.914; // half length, half width (doubles), singles half width, service line, net post
// blocks (u0, u1, v0, v1)
const NB = [-16.6, 17.6, -10.2, 25.4],
  SB = [17.6, 52.4, -32, -1],
  PR = [1.5, 17.6, -32, -10.2], // practice area
  HUT = [-23.4, -17.2, 3, 13.4];
const rectP = ([u0, u1, v0, v1]) => [
  tennisP(u0, v0),
  tennisP(u0, v1),
  tennisP(u1, v1),
  tennisP(u1, v0),
];
const AT = [-18.4, -332.2]; // a vertex of the OSM pitch
export const isTennis = (a) =>
  a.kind === 'pitch' && a.pts.some(([x, z]) => Math.hypot(x - AT[0], z - AT[1]) < 0.5);

// trees and shrubs inside the fence and on the hut (src/world/zones/Zones.js treeHide)
export const tennisTreeHide = () => [
  [
    [-17, -10.6],
    [-17, 25.8],
    [18, 25.8],
    [18, -0.6],
    [52.8, -0.6],
    [52.8, -32.4],
    [1.1, -32.4],
    [1.1, -10.6],
  ].map(([u, v]) => tennisP(u, v)),
  rectP([HUT[0] - 0.6, HUT[1] + 0.6, HUT[2] - 0.6, HUT[3] + 0.6]),
];

// the paint (src/world/MapBuilder.js): grey where the OSM outline runs past the fence, red blocks, green practice area,
// blue-grey courts, white lines
const GREY = [0.3, 0.29, 0.27],
  RED = [0.3, 0.075, 0.065],
  GREEN = [0.14, 0.22, 0.12],
  BLUE = [0.085, 0.115, 0.17],
  WHITE = [0.86, 0.87, 0.84]; // linear rgb
export function paintTennis(areas, geo) {
  for (const a of areas) geo.flatPoly(a.pts, 0.02, GREY);
  geo.flatPoly(rectP(NB), 0.022, RED);
  geo.flatPoly(rectP(SB), 0.022, RED);
  geo.flatPoly(rectP(PR), 0.022, GREEN);
  for (const [cu, cv] of TENNIS) {
    const P = (u, v) => tennisP(cu + u, cv + v),
      line = (a, b) => geo.strip(P(...a), P(...b), 0.07, 0.03, WHITE);
    geo.flatPoly(rectP([cu - HL - 0.6, cu + HL + 0.6, cv - HW - 0.4, cv + HW + 0.4]), 0.025, BLUE);
    for (const u of [-HL, HL]) line([u, -HW], [u, HW]); // baselines
    for (const v of [-HW, HW, -SW, SW]) line([-HL, v], [HL, v]); // sidelines
    for (const u of [-SV, SV]) line([u, -SW], [u, SW]); // service lines
    line([-SV, 0], [SV, 0]); // centre service line
    for (const s of [-1, 1]) line([s * HL, 0], [s * (HL - 0.1), 0]); // centre marks
  }
}

// chain link: a diamond mesh in green-coated wire, cut out with alphaTest
function meshTex(rep) {
  const { cv, g: c } = scaledCanvas(64, 64);
  if (c) {
    c.strokeStyle = '#2f4a37';
    c.lineWidth = 2.5;
    c.beginPath();
    for (let i = -4; i <= 4; i++) {
      c.moveTo(i * 16, 0);
      c.lineTo(i * 16 + 64, 64);
      c.moveTo(i * 16 + 64, 0);
      c.lineTo(i * 16, 64);
    }
    c.stroke();
  }
  markShared(cv);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(...rep);
  t.anisotropy = 4;
  return t;
}

// vertical quads in world space: a, b on the ground, ya / yb the bottom and top heights at each end
function quadGeo(list) {
  const p = [],
    n = [],
    uv = [];
  for (const q of list) {
    const { a, b, ya, yb, u0 = 0, u1 = 1, v0 = 0, v1 = 1 } = q;
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = Math.hypot(dx, dz),
      nx = -dz / l,
      nz = dx / l;
    const A0 = [a[0], ya[0], a[1]],
      A1 = [a[0], ya[1], a[1]],
      B0 = [b[0], yb[0], b[1]],
      B1 = [b[0], yb[1], b[1]];
    for (const [v, t, s] of [
      [A0, u0, v0],
      [B0, u1, v0],
      [B1, u1, v1],
      [A0, u0, v0],
      [B1, u1, v1],
      [A1, u0, v1],
    ]) {
      p.push(...v);
      n.push(nx, 0, nz);
      uv.push(t, s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

const FH = 4, // perimeter fence height
  IH = 3, // fences between the blocks
  CELL = 0.3; // one texture tile of chain link (m): four diamonds across, 7.5 cm each
// fence lines (u, v) → (u, v), gates as [s0, s1] along the line from its start, height
const FENCES = [
  [[-16.6, -10.2], [-16.6, 25.4], [[25.4, 27.2]], FH], // north, gate east of the hut
  [[-16.6, 25.4], [17.6, 25.4], [], FH], // east of the north block
  [[17.6, 25.4], [17.6, -1], [[1.6, 3.4]], FH], // south of the north block, gate at its east end
  [[17.6, -1], [52.4, -1], [], FH], // east of the south block
  [[52.4, -1], [52.4, -32], [[12.9, 14.7]], FH], // south, gate between the two courts
  [[52.4, -32], [1.5, -32], [], FH], // west
  [[1.5, -32], [1.5, -10.2], [], FH], // north of the practice area
  [[1.5, -10.2], [-16.6, -10.2], [], FH], // west of the north block
  [[1.5, -10.2], [17.6, -10.2], [[7.5, 9.3]], IH], // north block | practice area
  [[17.6, -1], [17.6, -32], [[19.5, 21.3]], IH], // north block, practice area | south block
];
const GATE_H = 2.3;

export function buildTennis(I, scene, Kit, regMat) {
  const g = H; // ground (the flat layers follow it)
  const POST = regMat(
      'tennisPost',
      new THREE.MeshStandardMaterial({ color: '#2c4434', roughness: 0.6, metalness: 0.3 })
    ),
    STEEL = regMat(
      'tennisSteel',
      new THREE.MeshStandardMaterial({ color: '#8d9399', roughness: 0.5, metalness: 0.4 })
    ),
    WHITE = regMat(
      'tennisWhite',
      new THREE.MeshStandardMaterial({ color: '#eceee9', roughness: 0.7 })
    ),
    WALL = regMat(
      'tennisHutWall',
      new THREE.MeshStandardMaterial({ color: '#d8ccb2', roughness: 0.9 })
    ),
    ROOF = regMat(
      'tennisHutRoof',
      new THREE.MeshStandardMaterial({ color: '#7d6b58', roughness: 0.8 })
    ),
    DOOR = regMat(
      'tennisDoor',
      new THREE.MeshStandardMaterial({ color: '#5d6a73', roughness: 0.6 })
    ),
    WOOD = regMat(
      'tennisWood',
      new THREE.MeshStandardMaterial({ color: '#9a6f45', roughness: 0.85 })
    ),
    GLASS = regMat(
      'tennisWin',
      new THREE.MeshStandardMaterial({ color: '#3f4f5c', roughness: 0.2, metalness: 0.3 })
    );
  const lamp = new THREE.MeshStandardMaterial({
    color: '#dfe3e6',
    emissive: '#fff3d6',
    emissiveIntensity: 0,
    roughness: 0.4,
  });
  lamp.userData.glow = 1;
  const LAMP = regMat('tennisLamp', lamp);
  I.updaters.push((dt, gm) => {
    lamp.emissiveIntensity = (gm.night || 0) * 2.6;
  });

  // one Kit in the court frame (local x = v, z = u); dy lifts a part onto the ground where it stands
  const k = new Kit(I, O[0], O[1], Math.atan2(-D[0], D[1]), 1),
    dy = (u, v) => g(...tennisP(u, v)) - k.base;

  // ---- fences: chain link panels (own mesh), posts and rails (Kit), a collision line per stretch
  const panels = [],
    hiPanels = [];
  for (const [a, b, gates, fh] of FENCES) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      at = (s) => [a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L];
    const cuts = [0];
    for (const [s0, s1] of gates) cuts.push(s0, s1);
    cuts.push(L);
    for (let i = 0; i < cuts.length; i += 2) {
      const s0 = cuts[i],
        s1 = cuts[i + 1],
        n = Math.max(1, Math.ceil((s1 - s0) / 3));
      for (let j = 0; j < n; j++) {
        const sa = s0 + ((s1 - s0) * j) / n,
          sb = s0 + ((s1 - s0) * (j + 1)) / n,
          pa = at(sa),
          pb = at(sb),
          A = tennisP(...pa),
          B = tennisP(...pb),
          ga = g(...A),
          gb = g(...B);
        panels.push({
          a: A,
          b: B,
          ya: [ga + 0.04, ga + fh],
          yb: [gb + 0.04, gb + fh],
          u0: sa / CELL,
          u1: sb / CELL,
          v0: 0,
          v1: fh / CELL,
        });
        // top and bottom rails
        const [mu, mv] = at((sa + sb) / 2),
          y = dy(mu, mv),
          r = 0.03;
        for (const ry of [fh - 0.03, 0.08]) {
          if (pa[0] === pb[0])
            k.box(
              Math.min(pa[1], pb[1]),
              Math.max(pa[1], pb[1]),
              y + ry - r,
              y + ry + r,
              mu - r,
              mu + r,
              POST,
              { col: false }
            );
          else
            k.box(
              mv - r,
              mv + r,
              y + ry - r,
              y + ry + r,
              Math.min(pa[0], pb[0]),
              Math.max(pa[0], pb[0]),
              POST,
              {
                col: false,
              }
            );
        }
      }
      for (let j = 0; j <= n; j++) {
        const [pu, pv] = at(s0 + ((s1 - s0) * j) / n),
          y = dy(pu, pv),
          r = j === 0 || j === n ? 0.05 : 0.035;
        k.box(pv - r, pv + r, y - 0.5, y + fh + 0.05, pu - r, pu + r, POST, { col: false });
      }
      const A = tennisP(...at(s0)),
        B = tennisP(...at(s1));
      I.addWall(A[0], A[1], B[0], B[1], -1, fh);
    }
    // over each gate: a header bar and chain link up to the top
    for (const [s0, s1] of gates) {
      const pa = at(s0),
        pb = at(s1),
        A = tennisP(...pa),
        B = tennisP(...pb),
        ga = g(...A),
        gb = g(...B);
      hiPanels.push({
        a: A,
        b: B,
        ya: [ga + GATE_H, ga + fh],
        yb: [gb + GATE_H, gb + fh],
        u0: s0 / CELL,
        u1: s1 / CELL,
        v0: GATE_H / CELL,
        v1: fh / CELL,
      });
      const [mu, mv] = at((s0 + s1) / 2),
        y = dy(mu, mv),
        r = 0.04;
      for (const ry of [GATE_H, fh - 0.03])
        if (pa[0] === pb[0])
          k.box(
            Math.min(pa[1], pb[1]),
            Math.max(pa[1], pb[1]),
            y + ry - r,
            y + ry + r,
            mu - r,
            mu + r,
            POST,
            {
              col: false,
            }
          );
        else
          k.box(
            mv - r,
            mv + r,
            y + ry - r,
            y + ry + r,
            Math.min(pa[0], pb[0]),
            Math.max(pa[0], pb[0]),
            POST,
            {
              col: false,
            }
          );
      I.addWall(A[0], A[1], B[0], B[1], GATE_H, fh);
    }
  }
  const link = new THREE.MeshStandardMaterial({
    map: meshTex(),
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.7,
    metalness: 0.2,
  });
  for (const list of [panels, hiPanels]) {
    const m = new THREE.Mesh(quadGeo(list), link);
    m.name = 'tennis:fence';
    m.matrixAutoUpdate = false;
    m.receiveShadow = true;
    scene.add(m);
  }

  // ---- nets: posts (Kit), the net and its white tape (own mesh, sagging to 0.914 m in the middle)
  const nets = [],
    tapes = [];
  for (const [cu, cv] of TENNIS) {
    const y0 = g(...tennisP(cu, cv)),
      yb = y0 - k.base;
    for (const s of [-1, 1]) {
      k.box(cv + s * NP - 0.05, cv + s * NP + 0.05, yb - 0.3, yb + 1.1, cu - 0.05, cu + 0.05, POST);
      const a = tennisP(cu, cv + s * (NP - 0.05)),
        b = tennisP(cu, cv);
      nets.push({
        a,
        b,
        ya: [y0 + 0.05, y0 + 1.03],
        yb: [y0 + 0.05, y0 + 0.874],
        u0: 0,
        u1: (NP / 0.12) | 0,
        v0: 0,
        v1: 8,
      });
      tapes.push({ a, b, ya: [y0 + 1.0, y0 + 1.07], yb: [y0 + 0.844, y0 + 0.914] });
    }
    k.box(cv - 0.025, cv + 0.025, yb, yb + 0.914, cu - 0.012, cu + 0.012, WHITE, { col: false }); // centre strap
    const a = tennisP(cu, cv - NP),
      b = tennisP(cu, cv + NP);
    I.addWall(a[0], a[1], b[0], b[1], -1, 1);
  }
  const netMat = new THREE.MeshStandardMaterial({
    map: (() => {
      const { cv, g: c } = scaledCanvas(32, 32);
      if (c) {
        c.strokeStyle = '#1c1c1c';
        c.lineWidth = 3;
        c.strokeRect(0, 0, 32, 32);
      }
      markShared(cv);
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    })(),
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  for (const [list, mat] of [
    [nets, netMat],
    [
      tapes,
      new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.8, side: THREE.DoubleSide }),
    ],
  ]) {
    const m = new THREE.Mesh(quadGeo(list), mat);
    m.name = 'tennis:net';
    m.matrixAutoUpdate = false;
    scene.add(m);
  }

  // ---- umpire chairs beside the west net post of each court
  for (const [cu, cv] of TENNIS) {
    const v = cv - NP - 0.9,
      u = cu,
      y = dy(u, v);
    for (const [a, b] of [
      [-0.35, -0.35],
      [-0.35, 0.35],
      [0.35, -0.35],
      [0.35, 0.35],
    ])
      k.box(v + a - 0.03, v + a + 0.03, y, y + 1.6, u + b - 0.03, u + b + 0.03, WHITE, {
        col: false,
      });
    for (const ry of [0.45, 0.9, 1.3])
      k.box(v - 0.38, v - 0.3, y + ry, y + ry + 0.04, u - 0.35, u + 0.35, WHITE, { col: false });
    k.box(v - 0.38, v + 0.38, y + 1.6, y + 1.66, u - 0.38, u + 0.38, WOOD, { col: false });
    k.box(v - 0.4, v - 0.34, y + 1.66, y + 2.2, u - 0.38, u + 0.38, WOOD, { col: false });
    k.box(v + 0.36, v + 0.42, y + 1.0, y + 1.04, u - 0.38, u + 0.38, WHITE, { col: false }); // foot rest
    k.wallRect(v - 0.4, v + 0.4, u - 0.4, u + 0.4, y, y + 2.2);
  }

  // ---- long benches under a white canopy along the west fences (NLSC 2024: 7.6 m and 4 m roofs)
  for (const [u0, u1, v0] of [
    [-5.5, 2.1, -9.9],
    [33.6, 37.6, -31.7],
  ]) {
    const v1 = v0 + 1.4,
      y = dy((u0 + u1) / 2, v0 + 0.7);
    for (const u of [u0 + 0.1, u1 - 0.1])
      for (const v of [v0 + 0.1, v1 - 0.1])
        k.box(v - 0.04, v + 0.04, y - 0.2, y + 2.4, u - 0.04, u + 0.04, STEEL);
    k.box(v0 - 0.1, v1 + 0.1, y + 2.4, y + 2.5, u0 - 0.15, u1 + 0.15, WHITE, { col: false });
    k.box(v0 + 0.45, v0 + 0.85, y + 0.42, y + 0.47, u0 + 0.3, u1 - 0.3, WOOD, { col: false });
    k.box(v0 + 0.3, v0 + 0.35, y + 0.6, y + 0.95, u0 + 0.3, u1 - 0.3, WOOD, { col: false });
    for (let u = u0 + 0.5; u < u1 - 0.3; u += 1.6)
      k.box(v0 + 0.5, v0 + 0.8, y, y + 0.42, u - 0.04, u + 0.04, STEEL, { col: false });
    k.wallRect(v0 + 0.3, v0 + 0.85, u0 + 0.3, u1 - 0.3, y, y + 0.5);
  }

  // ---- floodlights: three poles down each long side of both blocks, two lamps each, aimed at the courts
  const poles = [];
  for (const u of [-11, 0, 11]) poles.push([u, NB[2] - 0.35, 1], [u, NB[3] + 0.35, -1]);
  for (const u of [25, 36, 47]) poles.push([u, SB[2] - 0.35, 1], [u, SB[3] + 0.35, -1]);
  for (const [u, v, s] of poles) {
    const y = dy(u, v),
      PH = 10;
    k.box(v - 0.11, v + 0.11, y - 0.5, y + PH, u - 0.11, u + 0.11, STEEL);
    k.box(v - 0.06, v + 0.06, y + PH - 0.3, y + PH - 0.18, u - 1.1, u + 1.1, STEEL, { col: false });
    for (const du of [-0.8, 0.8]) {
      const vv = v + s * 0.25;
      k.box(vv - 0.2, vv + 0.2, y + PH - 0.6, y + PH - 0.05, u + du - 0.35, u + du + 0.35, STEEL, {
        col: false,
      });
      k.box(
        vv + s * 0.2 - 0.02,
        vv + s * 0.2 + 0.02,
        y + PH - 0.55,
        y + PH - 0.1,
        u + du - 0.3,
        u + du + 0.3,
        LAMP,
        {
          col: false,
        }
      );
    }
  }

  // ---- the little management hut on the north edge (NLSC 2024: grey roofs under the trees), door to the courts
  {
    const [u0, u1, v0, v1] = HUT,
      y = dy((u0 + u1) / 2, (v0 + v1) / 2),
      top = y + 2.8;
    k.box(v0, v1, y - 0.3, top, u0, u1, WALL);
    k.box(v1, v1 + 0.04, y, y + 2.1, u0 + 2.4, u0 + 3.4, DOOR, { col: false }); // door on the east side, by the gate
    for (const v of [v0 + 4.5, v0 + 7.5])
      k.box(v, v + 1.6, y + 1.0, y + 2.0, u1, u1 + 0.04, GLASS, { col: false });
    // a low gable over the long side (ridge along v)
    const m = (u0 + u1) / 2,
      over = 0.4;
    for (const [a, b] of [
      [u0 - over, m],
      [m, u1 + over],
    ]) {
      const ya = a < m ? top - 0.1 : top + 0.9,
        yb = a < m ? top + 0.9 : top - 0.1,
        L = Math.hypot(b - a, yb - ya);
      const geo = new THREE.BoxGeometry(v1 - v0 + 2 * over, 0.12, L);
      geo.rotateX(-Math.atan2(yb - ya, b - a));
      geo.translate((v0 + v1) / 2, (ya + yb) / 2, (a + b) / 2);
      k._part(ROOF, geo);
    }
    // gable ends (both windings, so they show from either side)
    const p = [];
    for (const v of [v0, v1])
      p.push(v, top, u0, v, top + 0.95, m, v, top, u1, v, top, u0, v, top, u1, v, top + 0.95, m);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(new Float32Array((p.length / 3) * 2), 2)
    );
    geo.setIndex([...Array(p.length / 3).keys()]); // indexed like the boxes it is merged with
    geo.computeVertexNormals();
    k._part(WALL, geo);
  }
  k.finish(scene);

  // ---- at night the floodlights light both blocks: a warm additive wash over each, like the street lamps' pools
  {
    const p = [],
      quad = (u0, u1, v0, v1, n) => {
        // n × n cells so it follows the ground
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            const c = (a, b) => {
              const u = u0 + ((u1 - u0) * a) / n,
                v = v0 + ((v1 - v0) * b) / n,
                [x, z] = tennisP(u, v);
              return [x, g(x, z) + 0.08, z];
            };
            p.push(...c(i, j), ...c(i, j + 1), ...c(i + 1, j + 1));
            p.push(...c(i, j), ...c(i + 1, j + 1), ...c(i + 1, j));
          }
      };
    quad(NB[0], NB[1], NB[2], NB[3], 6);
    quad(SB[0], SB[1], SB[2], SB[3], 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const wash = new THREE.MeshBasicMaterial({
      color: '#fff1d2',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, wash);
    m.name = 'tennis:lightWash';
    m.matrixAutoUpdate = false;
    m.renderOrder = 2;
    m.visible = false;
    scene.add(m);
    I.updaters.push((dt, gm) => {
      const n = gm.night || 0;
      wash.opacity = n * 0.32;
      m.visible = n > 0.05;
    });
  }
}
