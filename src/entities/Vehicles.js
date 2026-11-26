import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { buildScooter as buildCommuter } from './Scooters.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scaledCanvas, markShared } from '../graphics/GpuMemLifecycle.js';

const MC = {};
const m = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }));
};
const box = (w, h, d, mat, x, y, z) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
};
const GW = {};
function wheel(r, w, x, y, z) {
  const k = `${r}_${w}`;
  const g = GW[k] || (GW[k] = new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2));
  const o = new THREE.Mesh(g, m('#1a1a1a', { roughness: 0.9 }));
  o.position.set(x, y, z);
  o.castShadow = true;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.01, 10).rotateZ(Math.PI / 2),
    m('#9aa0a6', { metalness: 0.7, roughness: 0.3 })
  );
  o.add(hub);
  return o;
}

function plateTex(text, bg = '#fff', fg = '#111') {
  // stored at the tier's texture scale, drawn in 256 x 96 units; static, so released once on the GPU
  // (src/graphics/GpuMemLifecycle.js flushShared)
  const { cv, g } = scaledCanvas(256, 96);
  markShared(cv);
  if (!g) return new THREE.CanvasTexture(cv);
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = fg;
  // shrink the font until the whole number fits (e.g. PYL0803)
  let fs = 64;
  g.font = `900 ${fs}px system-ui`;
  while (g.measureText(text).width > 232 && fs > 20) {
    fs -= 2;
    g.font = `900 ${fs}px system-ui`;
  }
  g.strokeStyle = fg;
  g.lineWidth = 4;
  g.strokeRect(4, 4, 248, 88);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildScooter(color) {
  const g = new THREE.Group();
  const body = m(color, { roughness: 0.35, metalness: 0.2 });
  const dark = m('#222', { roughness: 0.7 });
  const wheels = [wheel(0.27, 0.12, 0, 0.27, 0.62), wheel(0.27, 0.13, 0, 0.27, -0.6)];
  g.add(...wheels);
  g.add(box(0.36, 0.1, 0.8, dark, 0, 0.32, 0.05)); // floorboard
  const rear = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.21, 0.5, 4, 10).rotateX(Math.PI / 2),
    body
  );
  rear.scale.set(1, 0.9, 1);
  rear.position.set(0, 0.55, -0.42);
  rear.castShadow = true;
  g.add(rear);
  g.add(box(0.3, 0.1, 0.62, m('#151515', { roughness: 0.9 }), 0, 0.75, -0.36)); // seat
  const shield = box(0.44, 0.75, 0.14, body, 0, 0.72, 0.5);
  shield.rotation.x = -0.25;
  g.add(shield);
  const stem = box(0.08, 0.5, 0.08, dark, 0, 1.0, 0.56);
  stem.rotation.x = -0.25;
  g.add(stem);
  g.add(box(0.62, 0.05, 0.05, dark, 0, 1.22, 0.5)); // handlebar
  g.add(box(0.26, 0.14, 0.12, body, 0, 1.2, 0.56)); // headset
  const hl = box(
    0.16,
    0.08,
    0.04,
    new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6d0', emissiveIntensity: 1 }),
    0,
    1.2,
    0.63
  );
  g.add(hl);
  g.add(
    box(
      0.2,
      0.06,
      0.04,
      new THREE.MeshStandardMaterial({
        color: '#900',
        emissive: '#ff2020',
        emissiveIntensity: 0.6,
      }),
      0,
      0.62,
      -0.92
    )
  );
  const fender = box(0.18, 0.06, 0.4, body, 0, 0.56, 0.66);
  g.add(fender);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.09),
    new THREE.MeshBasicMaterial({ map: plateTex('MAN-34') })
  );
  plate.position.set(0, 0.48, -0.93);
  plate.rotation.y = Math.PI;
  g.add(plate);
  g.userData.wheels = wheels;
  return g;
}

// SYM JET SL 125 (極地白): white / dark-grey angular bodywork with red pinstripes, black split-spoke
// wheels, petal front disc, red-stitched black seat, pink rear hugger. Modelled from side and 3/4
// reference photos; profiles below are in metres (z forward, y up, ground 0), scaled 1.08 to the
// game's rider. Right side of the bike is -x (exhaust), left side +x (air box, front disc).
function sideShape(pts) {
  const sh = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? sh.lineTo(-z, y) : sh.moveTo(-z, y)));
  sh.closePath();
  return sh;
}
// extrude a side profile [[z,y]..] across x (centred); taper(z,y) scales x so panels narrow / flare
function panel(pts, width, mat, { taper = null, bevel = 0.02, x = 0 } = {}) {
  const g = new THREE.ExtrudeGeometry(sideShape(pts), {
    depth: width,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.rotateY(Math.PI / 2);
  g.translate(-width / 2, 0, 0);
  if (taper) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * taper(p.getZ(i), p.getY(i)));
    g.computeVertexNormals();
  }
  const o = new THREE.Mesh(g, mat);
  o.position.x = x;
  o.castShadow = true;
  return o;
}
function decalTex(draw, w = 256, h = 96) {
  // stored at the tier's texture scale, drawn in w x h units; static (GpuMemLifecycle.flushShared)
  const { cv, g } = scaledCanvas(w, h);
  markShared(cv);
  if (g) {
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const PM = {};
const paint = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  return (
    PM[k] ||
    (PM[k] = new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      ...o,
    }))
  );
};
// tube between two points
function tube(a, b, r, mat, seg = 8) {
  const A = new THREE.Vector3(...a),
    B = new THREE.Vector3(...b),
    d = B.clone().sub(A),
    len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  );
  g.translate(A.x, A.y, A.z);
  const o = new THREE.Mesh(g, mat);
  o.castShadow = true;
  return o;
}
// coil spring along a -> b
function spring(a, b, r, turns, mat) {
  const A = new THREE.Vector3(...a),
    B = new THREE.Vector3(...b),
    d = B.clone().sub(A),
    len = d.length();
  const pts = [];
  for (let i = 0; i <= turns * 12; i++) {
    const t = i / (turns * 12),
      an = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(an) * r, t * len, Math.sin(an) * r));
  }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 12, r * 0.18, 5);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  );
  g.translate(A.x, A.y, A.z);
  return new THREE.Mesh(g, mat);
}
// 12" wheel: rounded tyre, black rim, five split spokes, optional petal disc (left side); axis = x
function jetWheel(R, w, disc) {
  const g = new THREE.Group();
  const prof = [];
  const ri = R * 0.66;
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI;
    prof.push(
      new THREE.Vector2(
        ri + (R - ri) * (0.55 + 0.45 * Math.cos(a)) + (i === 0 || i === 10 ? 0 : 0),
        (Math.sin(a) * w) / 2
      )
    );
  }
  prof[0].x = ri;
  prof[10].x = ri;
  const tyre = new THREE.Mesh(
    new THREE.LatheGeometry(prof, 28).rotateZ(Math.PI / 2),
    m('#141414', { roughness: 0.92 })
  );
  g.add(tyre);
  const rimM = m('#121214', { roughness: 0.35, metalness: 0.4 }),
    edgeM = m('#c9ccd0', { roughness: 0.25, metalness: 0.9 });
  // rim barrel is an open cylinder: render both sides so its inside shows between the spokes (no see-through wheel)
  g.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(ri, ri, w * 0.8, 28, 1, true).rotateZ(Math.PI / 2),
      m('#121214', { roughness: 0.35, metalness: 0.4, side: THREE.DoubleSide })
    )
  );
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(ri - 0.006, 0.006, 6, 28).rotateY(Math.PI / 2),
    edgeM
  );
  for (const s of [-1, 1]) {
    const l = lip.clone();
    l.position.x = s * w * 0.38;
    g.add(l);
  }
  for (let k = 0; k < 5; k++)
    for (const o of [-0.09, 0.09]) {
      const a = (k / 5) * Math.PI * 2 + o,
        sp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, ri * 0.92, 0.022), rimM);
      sp.geometry.translate(0, ri * 0.46, 0);
      sp.rotation.x = a;
      g.add(sp);
    }
  g.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.2, R * 0.2, w * 0.9, 14).rotateZ(Math.PI / 2),
      m('#2a2b2e', { metalness: 0.6, roughness: 0.4 })
    )
  );
  g.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.07, R * 0.07, w * 1.15, 10).rotateZ(Math.PI / 2),
      edgeM
    )
  );
  if (disc) {
    // wave (petal) rotor with drilled slots
    const sh = new THREE.Shape(),
      N = 48,
      rO = R * 0.52;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2,
        r = rO * (1 - 0.06 * (0.5 + 0.5 * Math.cos(a * 12)));
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      i ? sh.lineTo(x, y) : sh.moveTo(x, y);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, rO * 0.62, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2,
        h = new THREE.Path();
      h.absellipse(
        Math.cos(a) * rO * 0.8,
        Math.sin(a) * rO * 0.8,
        rO * 0.07,
        rO * 0.035,
        0,
        Math.PI * 2,
        true,
        a + 0.6
      );
      sh.holes.push(h);
    }
    const dg = new THREE.ExtrudeGeometry(sh, {
      depth: 0.006,
      bevelEnabled: false,
      curveSegments: 4,
    }).rotateY(Math.PI / 2);
    const d = new THREE.Mesh(dg, m('#d6d8db', { metalness: 0.95, roughness: 0.22 }));
    d.position.x = w * 0.5 + 0.012;
    g.add(d);
    // floating-rotor carrier
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3,
        c = new THREE.Mesh(
          new THREE.BoxGeometry(0.01, rO * 0.36, 0.03),
          m('#222', { metalness: 0.5 })
        );
      c.geometry.translate(0, rO * 0.44, 0);
      c.rotation.x = a;
      c.position.x = w * 0.5 + 0.01;
      g.add(c);
    }
  }
  return g;
}
export function buildJetSL() {
  const root = new THREE.Group(),
    g = new THREE.Group();
  g.scale.setScalar(1.08);
  root.add(g);
  const white = paint('#f3f3f1'),
    grey = paint('#3a3d42', { roughness: 0.45, clearcoat: 0.6 }),
    satin = m('#1e2023', { roughness: 0.55, metalness: 0.15 });
  const black = m('#0f1012', { roughness: 0.4, metalness: 0.1 }),
    red = paint('#d4143c'),
    pink = paint('#ff2d7a', { roughness: 0.35 });
  const chrome = m('#d4d7da', { metalness: 0.95, roughness: 0.2 });
  const R = 0.235,
    ZF = 0.64,
    ZR = -0.62;
  const wheels = [jetWheel(R, 0.11, true), jetWheel(R, 0.13, false)];
  wheels[0].position.set(0, R, ZF);
  wheels[1].position.set(0, R, ZR);
  g.add(...wheels);

  // ---- front fork, brake caliper, fender ----
  for (const s of [-1, 1]) {
    g.add(tube([0.075 * s, 0.62, 0.53], [0.075 * s, R, ZF - 0.01], 0.022, black));
    g.add(tube([0.075 * s, 0.42, 0.585], [0.075 * s, R - 0.02, ZF + 0.005], 0.03, satin));
    g.add(spring([0.075 * s, 0.44, 0.58], [0.075 * s, 0.6, 0.535], 0.034, 7, black));
  }
  const cal = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.07, 0.045),
    m('#b8902c', { metalness: 0.7, roughness: 0.35 })
  );
  cal.position.set(0.085, R + 0.1, ZF - 0.13);
  cal.rotation.x = 0.6;
  g.add(cal);
  // beak-like black front fender over the tyre
  g.add(
    panel(
      [
        [0.87, 0.42],
        [0.8, 0.47],
        [0.62, 0.5],
        [0.46, 0.47],
        [0.4, 0.42],
        [0.5, 0.44],
        [0.66, 0.45],
        [0.8, 0.41],
      ],
      0.13,
      black,
      { bevel: 0.015, taper: (z) => 1.05 - Math.max(0, z - 0.6) * 1.6 }
    )
  );

  // ---- front: faceted white "fangs", black face with angled headlights, dark hood ----
  // vertices are for the left (+x) side and mirrored; non-indexed triangles give crisp creases
  const facet = (V, T, mat, s) => {
    const p = [];
    for (const t of T) {
      const tri = s > 0 ? t : [t[0], t[2], t[1]];
      for (const k of tri) {
        const v = V[k];
        p.push(v[0] * s, v[1], v[2]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.computeVertexNormals();
    const o = new THREE.Mesh(geo, mat);
    o.castShadow = true;
    return o;
  };
  const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const white2 = white.clone();
  white2.side = THREE.DoubleSide;
  const red2 = red.clone();
  red2.side = THREE.DoubleSide;
  const black2 = black.clone();
  black2.side = THREE.DoubleSide;
  const grey2 = grey.clone();
  grey2.side = THREE.DoubleSide;
  // fang points (x, y, z)
  // side outline follows the reference photo: the white is wide only up top (nose to cowl); below the
  // headlights / turn signals it narrows into a blade running down to the floor, with black underneath
  const F = {
    T0: [0.19, 0.985, 0.2],
    C0: [0.215, 0.9, 0.26],
    T1: [0.16, 0.825, 0.63],
    C1: [0.232, 0.76, 0.5],
    F1: [0.105, 0.68, 0.7],
    F2: [0.07, 0.585, 0.665],
    L1: [0.2, 0.575, 0.55],
    M: [0.245, 0.64, 0.4],
    Bf: [0.205, 0.45, 0.4],
    B2f: [0.19, 0.3, 0.31],
    B2r: [0.19, 0.3, 0.255],
    Rb: [0.2, 0.45, 0.25],
    R1: [0.2, 0.62, 0.2],
    T1i: [0.13, 0.825, 0.6],
    F1i: [0.075, 0.68, 0.665],
    F2i: [0.05, 0.585, 0.64],
  };
  const FK = Object.keys(F),
    FV = FK.map((k) => F[k]),
    fi = (k) => FK.indexOf(k);
  const FT = [
    ['T0', 'T1', 'C1'],
    ['T0', 'C1', 'C0'], // top face (carries the red stripe)
    ['C0', 'C1', 'M'],
    ['C0', 'M', 'R1'], // upper side
    ['C1', 'T1', 'F1'],
    ['C1', 'F1', 'M'], // front shoulder
    ['F1', 'F2', 'L1'],
    ['F1', 'L1', 'M'], // front lower (turn signal)
    ['M', 'L1', 'Bf'],
    ['M', 'Bf', 'Rb'],
    ['R1', 'M', 'Rb'], // blade, upper
    ['Rb', 'Bf', 'B2f'],
    ['Rb', 'B2f', 'B2r'], // blade down to the floor
    ['T1', 'T1i', 'F1i'],
    ['T1', 'F1i', 'F1'],
    ['F1', 'F1i', 'F2i'],
    ['F1', 'F2i', 'F2'], // return into the face
  ].map((t) => t.map(fi));
  const H0 = [0, 0.885, 0.6],
    H1 = [0, 1.045, 0.22];
  g.add(
    panel(
      [
        [0.67, 0.59],
        [0.55, 0.578],
        [0.4, 0.452],
        [0.33, 0.36],
        [0.36, 0.33],
        [0.46, 0.4],
        [0.6, 0.47],
        [0.68, 0.53],
      ],
      0.3,
      satin,
      { taper: (z, y) => 0.55 + Math.max(0, y - 0.35) * 1.6 - Math.max(0, z - 0.58) * 1.5 }
    )
  );
  for (const s of [-1, 1]) {
    g.add(facet(FV, FT, white2, s));
    // red pinstripe along the top crease, turning down the face edge
    const stripe = (a, b, c, d, w0, w1) => {
      const P = [lerp3(a, c, w0), lerp3(b, d, w0), lerp3(b, d, w1), lerp3(a, c, w1)].map((v) => [
        v[0] + 0.004,
        v[1] + 0.003,
        v[2],
      ]);
      return facet(
        P,
        [
          [0, 1, 2],
          [0, 2, 3],
        ],
        red2,
        s
      );
    };
    g.add(stripe(F.T0, F.T1, F.C0, F.C1, 0.3, 0.52));
    g.add(stripe(F.T1, F.F1, F.C1, F.M, 0.06, 0.16));
    g.add(stripe(F.F1, F.F2, F.L1, F.L1, 0.05, 0.15));
    // dark hood between the fang tops, with a raised centre ridge
    const hood = {
      A: [0.17, 0.865, 0.615],
      B: [0.185, 0.985, 0.21],
      C: [0.045, 0.9, 0.6],
      D: [0.05, 1.035, 0.22],
      E: H0,
      G: H1,
    };
    const HK = Object.keys(hood),
      hi = (k) => HK.indexOf(k);
    g.add(
      facet(
        HK.map((k) => hood[k]),
        [
          ['A', 'B', 'D'],
          ['A', 'D', 'C'],
          ['C', 'D', 'G'],
          ['C', 'G', 'E'],
        ].map((t) => t.map(hi)),
        grey2,
        s
      )
    );
    // face: black panel between the fangs, slightly convex down the centre line
    const face = {
      T: [0.13, 0.865, 0.605],
      M: [0.075, 0.68, 0.675],
      Bm: [0.04, 0.55, 0.665],
      CT: [0, 0.885, 0.6],
      CM: [0, 0.7, 0.705],
      CB: [0, 0.5, 0.67],
    };
    const QK = Object.keys(face),
      qi = (k) => QK.indexOf(k);
    g.add(
      facet(
        QK.map((k) => face[k]),
        [
          ['CT', 'T', 'M'],
          ['CT', 'M', 'CM'],
          ['CM', 'M', 'Bm'],
          ['CM', 'Bm', 'CB'],
        ].map((t) => t.map(qi)),
        black2,
        s
      )
    );
  }
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 20), chrome);
  badge.position.set(0, 0.988, 0.37);
  badge.rotation.x = 0.4;
  g.add(badge);
  const lens = new THREE.MeshStandardMaterial({
    color: '#f4f8ff',
    emissive: '#e8f4ff',
    emissiveIntensity: 1.6,
    roughness: 0.1,
  });
  const amber = new THREE.MeshStandardMaterial({
    color: '#ff9a1a',
    emissive: '#ff7a00',
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  const amberDS = amber.clone();
  amberDS.side = THREE.DoubleSide;
  for (const s of [-1, 1]) {
    // headlight unit, set into the slanted face like the real JET SL: an eye-shaped recess pointing
    // up to the outside, dark chrome reflector, small projector, an L-shaped LED light guide along the
    // top and outer edge, and a clear outer cover. Built in face-plane coordinates (u out, v up).
    {
      const E = [
        [0.016, -0.03],
        [0.07, -0.018],
        [0.124, 0.042],
        [0.116, 0.05],
        [0.024, 0.008],
      ];
      const eye = (k = 0) => {
        const sh = new THREE.Shape();
        E.forEach(([u, v], n) => {
          const cu = 0.068,
            cv = 0.004;
          const q = [cu + (u - cu) * (1 + k), cv + (v - cv) * (1 + k)];
          n ? sh.lineTo(...q) : sh.moveTo(...q);
        });
        sh.closePath();
        return sh;
      };
      const unit = new THREE.Group();
      // recess (gloss black) with a thin dark-chrome rim
      const rim = new THREE.Mesh(
        new THREE.ExtrudeGeometry(eye(0.12), { depth: 0.006, bevelEnabled: false }),
        m('#3a3d42', { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide })
      );
      rim.position.z = -0.004;
      unit.add(rim);
      const refl = new THREE.Mesh(
        new THREE.ShapeGeometry(eye(0)),
        m('#55595f', { metalness: 1, roughness: 0.18, side: THREE.DoubleSide })
      );
      refl.position.z = 0.003;
      unit.add(refl);
      // projector: small bowl + bluish lens in the inner half of the eye
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.017, 0.012, 20).rotateX(Math.PI / 2),
        m('#8a9097', { metalness: 1, roughness: 0.15 })
      );
      bowl.position.set(0.05, -0.004, 0.008);
      unit.add(bowl);
      const pl = new THREE.Mesh(
        new THREE.SphereGeometry(0.0135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(
          Math.PI / 2
        ),
        new THREE.MeshPhysicalMaterial({
          color: '#7d8fa6',
          emissive: '#cfe0ff',
          emissiveIntensity: 0.12,
          roughness: 0.02,
          metalness: 0.3,
          clearcoat: 1,
        })
      );
      pl.position.set(0.05, -0.004, 0.013);
      unit.add(pl);
      // L-shaped LED light guide: along the top edge, then down the outer tip
      const guide = (a, b) => {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(l, 0.0055, 0.006), lens);
        bar.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.011);
        bar.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
        unit.add(bar);
      };
      guide([0.03, 0.004], [0.112, 0.042]);
      guide([0.114, 0.036], [0.078, -0.01]);
      // clear cover
      const cover = new THREE.Mesh(
        new THREE.ExtrudeGeometry(eye(0.04), { depth: 0.004, bevelEnabled: false }),
        // plain transparency, not transmission: a transmissive material makes three.js render the whole scene
        // a second time every frame while any scooter is on screen (measured ~7 ms), for a few square cm of lens
        new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          roughness: 0.03,
          transparent: true,
          opacity: 0.22,
          clearcoat: 1,
          side: THREE.DoubleSide,
        })
      );
      cover.position.z = 0.016;
      unit.add(cover);
      // sit flush on the face: it slopes back ~27 deg and curves back away from the centre line
      unit.position.set(0, 0.79, 0.655);
      unit.rotation.order = 'XZY';
      unit.rotation.set(-0.5, 0.28 * s, -0.04 * s);
      unit.scale.set(1.3 * s, 1.3, 1.3);
      g.add(unit);
    }
    // amber turn signal: a long pointed wedge lying flat on the fang's lower front facet (F1-F2-L1),
    // tip towards the face; points are taken on that facet and lifted 4 mm along its normal
    {
      const sub = (a, b) => a.map((v, i) => v - b[i]);
      const e1 = sub(F.F2, F.L1),
        e2 = sub(F.F1, F.L1);
      const n = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ];
      const nl = Math.hypot(...n),
        out = n[0] / nl > 0 ? 1 : -1;
      const Q = (a, b, h) => F.L1.map((v, i) => v + a * e1[i] + b * e2[i] + (n[i] / nl) * out * h);
      const W = [
        [0.1, 0.06],
        [0.62, 0.1],
        [0.55, 0.22],
        [0.12, 0.3],
      ];
      const pts = [...W.map(([a, b]) => Q(a, b, 0.004)), ...W.map(([a, b]) => Q(a, b, 0.012))];
      g.add(
        facet(
          pts,
          [
            [0, 1, 2],
            [0, 2, 3],
            [4, 6, 5],
            [4, 7, 6],
            [0, 4, 5],
            [0, 5, 1],
            [1, 5, 6],
            [1, 6, 2],
            [2, 6, 7],
            [2, 7, 3],
            [3, 7, 4],
            [3, 4, 0],
          ],
          amberDS,
          s
        )
      );
    }
    // amber reflector on the fork leg
    const rf = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.022), amber);
    rf.position.set(0.106 * s, 0.4, 0.6);
    g.add(rf);
  }

  // ---- handlebar cowl (pointed visor, small smoked screen), bars, mirrors ----
  g.add(
    panel(
      [
        [0.36, 1.06],
        [0.24, 1.15],
        [0.12, 1.13],
        [0.12, 1.06],
        [0.25, 1.01],
        [0.34, 1.02],
      ],
      0.34,
      grey,
      { taper: (z) => 0.8 + (0.36 - z) * 0.9 }
    )
  );
  {
    const V = {
      tip: [0, 1.055, 0.48],
      L: [0.15, 1.08, 0.33],
      Lb: [0.13, 1.03, 0.34],
      top: [0, 1.16, 0.32],
      bot: [0, 1.0, 0.36],
    };
    const K = Object.keys(V),
      k = (n) => K.indexOf(n);
    for (const s of [-1, 1])
      g.add(
        facet(
          K.map((n) => V[n]),
          [
            ['tip', 'L', 'top'],
            ['tip', 'Lb', 'L'],
            ['tip', 'bot', 'Lb'],
          ].map((t) => t.map(k)),
          grey2,
          s
        )
      );
    const scr = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.12, 0.006),
      new THREE.MeshPhysicalMaterial({
        color: '#2a2f36',
        roughness: 0.05,
        transparent: true,
        opacity: 0.7,
        metalness: 0.3,
      })
    );
    scr.position.set(0, 1.19, 0.28);
    scr.rotation.x = -0.75;
    g.add(scr);
    for (const s of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.008), chrome);
      tr.position.set(0.075 * s, 1.07, 0.42);
      tr.rotation.y = 0.75 * s;
      g.add(tr);
    }
  }
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.01), lens);
  led.position.set(0, 1.04, 0.44);
  g.add(led);
  g.add(tube([-0.37, 1.1, 0.13], [0.37, 1.1, 0.13], 0.012, chrome));
  for (const s of [-1, 1]) {
    g.add(tube([0.27 * s, 1.1, 0.13], [0.39 * s, 1.1, 0.13], 0.02, black));
    const lever = tube([0.2 * s, 1.11, 0.16], [0.36 * s, 1.1, 0.2], 0.007, chrome);
    g.add(lever);
    g.add(tube([0.2 * s, 1.12, 0.18], [0.27 * s, 1.36, 0.14], 0.009, black));
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.095, 0.03), black);
    mir.position.set(0.29 * s, 1.39, 0.13);
    mir.rotation.order = 'YXZ';
    mir.rotation.set(0.15, -0.75 * s, 0.3 * s);
    g.add(mir);
  }

  // ---- inner leg shield, floor with red mat ----
  g.add(
    panel(
      [
        [0.2, 0.98],
        [0.12, 0.97],
        [0.16, 0.4],
        [0.26, 0.3],
        [0.27, 0.42],
      ],
      0.38,
      satin
    )
  );
  g.add(
    panel(
      [
        [0.27, 0.36],
        [-0.12, 0.36],
        [-0.12, 0.27],
        [0.26, 0.27],
      ],
      0.34,
      black,
      { bevel: 0.012 }
    )
  );
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.006, 0.36),
    m('#a8172a', { roughness: 0.85 })
  );
  mat.position.set(0, 0.383, 0.07);
  g.add(mat);

  // ---- mid body: dark grey under the seat with vents + silver step trim ----
  const mid = (z, y) => 0.9 + Math.max(0, y - 0.5) * 0.4;
  g.add(
    panel(
      [
        [-0.02, 0.36],
        [-0.04, 0.72],
        [-0.36, 0.79],
        [-0.52, 0.66],
        [-0.46, 0.5],
        [-0.3, 0.42],
        [-0.14, 0.33],
      ],
      0.34,
      grey,
      { taper: mid }
    )
  );
  g.add(
    panel(
      [
        [-0.12, 0.36],
        [-0.13, 0.31],
        [-0.5, 0.36],
        [-0.62, 0.42],
        [-0.6, 0.47],
        [-0.45, 0.42],
      ],
      0.3,
      black
    )
  );
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.11), black);
      v.position.set(0.178 * s, 0.5 + k * 0.024, -0.24 - k * 0.012);
      v.rotation.x = 0.25;
      g.add(v);
    }
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.15), chrome);
    trim.position.set(0.172 * s, 0.6, -0.4);
    trim.rotation.x = 0.35;
    g.add(trim);
  }

  // ---- rear: white side panels with red stripe, sharp tail, LED tail light ----
  const tail = (z) => 0.62 + Math.max(0, Math.min(1, (z + 0.88) / 0.5)) * 0.42;
  g.add(
    panel(
      [
        [-0.3, 0.63],
        [-0.52, 0.8],
        [-0.86, 0.9],
        [-0.9, 0.86],
        [-0.84, 0.73],
        [-0.62, 0.62],
        [-0.46, 0.58],
      ],
      0.36,
      white,
      { taper: tail }
    )
  );
  g.add(
    panel(
      [
        [-0.44, 0.6],
        [-0.64, 0.64],
        [-0.84, 0.75],
        [-0.835, 0.72],
        [-0.64, 0.618],
        [-0.45, 0.585],
      ],
      0.375,
      red,
      { taper: tail, bevel: 0.012 }
    )
  );
  g.add(
    panel(
      [
        [-0.33, 0.68],
        [-0.5, 0.79],
        [-0.52, 0.775],
        [-0.35, 0.665],
      ],
      0.375,
      red,
      { taper: tail, bevel: 0.012 }
    )
  );
  // black lower tail + rear grab handle
  g.add(
    panel(
      [
        [-0.6, 0.62],
        [-0.86, 0.73],
        [-0.88, 0.66],
        [-0.66, 0.55],
      ],
      0.26,
      satin,
      { taper: tail }
    )
  );
  g.add(
    panel(
      [
        [-0.66, 0.905],
        [-0.84, 0.935],
        [-0.86, 0.915],
        [-0.68, 0.89],
      ],
      0.3,
      black,
      { taper: tail, bevel: 0.012 }
    )
  );
  const tl = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.05, 0.05),
    new THREE.MeshStandardMaterial({
      color: '#c01020',
      emissive: '#ff1a1a',
      emissiveIntensity: 0.9,
      roughness: 0.15,
    })
  );
  tl.position.set(0, 0.84, -0.905);
  tl.rotation.x = 0.5;
  g.add(tl);
  const tlc = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.06),
    new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.05,
      transparent: true,
      opacity: 0.35,
    })
  ); // no transmission (see the headlight cover)
  tlc.position.copy(tl.position);
  tlc.rotation.x = 0.5;
  g.add(tlc);
  for (const s of [-1, 1]) {
    const ti = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.03, 0.04),
      new THREE.MeshStandardMaterial({
        color: '#ffb066',
        emissive: '#ff8a1a',
        emissiveIntensity: 0.25,
      })
    );
    ti.position.set(0.1 * s, 0.795, -0.9);
    g.add(ti);
  }

  // ---- seat: black with red piping ----
  const seatT = (z) => 0.92 - Math.max(0, -z - 0.5) * 0.35;
  g.add(
    panel(
      [
        [0.06, 0.72],
        [0.0, 0.79],
        [-0.3, 0.8],
        [-0.5, 0.84],
        [-0.78, 0.92],
        [-0.8, 0.88],
        [-0.56, 0.8],
        [-0.06, 0.7],
      ],
      0.31,
      m('#151517', { roughness: 0.75 }),
      { taper: seatT, bevel: 0.035 }
    )
  );
  g.add(
    panel(
      [
        [0.05, 0.75],
        [-0.3, 0.765],
        [-0.5, 0.805],
        [-0.78, 0.885],
        [-0.78, 0.875],
        [-0.5, 0.795],
        [-0.3, 0.755],
        [0.05, 0.74],
      ],
      0.374,
      m('#b0182e', { roughness: 0.6 }),
      { taper: seatT, bevel: 0.004 }
    )
  );

  // ---- engine, air box (left), exhaust (right), shock, stand ----
  g.add(
    panel(
      [
        [-0.36, 0.5],
        [-0.75, 0.52],
        [-0.78, 0.36],
        [-0.5, 0.26],
        [-0.34, 0.3],
      ],
      0.2,
      satin,
      { x: 0.05 }
    )
  );
  const ab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.32), black);
  ab.position.set(0.15, 0.42, -0.6);
  ab.rotation.x = -0.08;
  g.add(ab);
  g.add(spring([0.15, 0.36, -0.7], [0.15, 0.62, -0.74], 0.032, 8, m('#111', { metalness: 0.4 })));
  const muf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.075, 0.42, 14).rotateX(Math.PI / 2),
    black
  );
  muf.position.set(-0.16, 0.36, -0.72);
  muf.rotation.x = -0.15;
  g.add(muf);
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10).rotateX(Math.PI / 2),
    chrome
  );
  tip.position.set(-0.16, 0.39, -0.94);
  g.add(tip);
  // exhaust header and the folded centre stand under the engine
  g.add(tube([-0.06, 0.22, -0.3], [-0.16, 0.3, -0.52], 0.02, satin));
  for (const s of [-1, 1])
    g.add(tube([0.08 * s, 0.2, -0.34], [0.08 * s, 0.15, -0.56], 0.013, black));
  g.add(tube([-0.08, 0.15, -0.56], [0.08, 0.15, -0.56], 0.012, black));

  // ---- pink rear hugger + plate bracket ----
  g.add(
    panel(
      [
        [-0.74, 0.45],
        [-0.82, 0.42],
        [-0.88, 0.32],
        [-0.87, 0.18],
        [-0.84, 0.2],
        [-0.84, 0.31],
        [-0.79, 0.39],
        [-0.72, 0.42],
      ],
      0.14,
      pink,
      { bevel: 0.012 }
    )
  );
  g.add(
    panel(
      [
        [-0.82, 0.66],
        [-0.92, 0.57],
        [-0.99, 0.48],
        [-0.97, 0.45],
        [-0.9, 0.52],
        [-0.8, 0.6],
      ],
      0.12,
      black,
      { bevel: 0.01 }
    )
  );
  // licence plate PYL0803 at the end of the bracket, behind everything else so nothing hides it
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.13),
    new THREE.MeshStandardMaterial({
      map: plateTex('PYL0803'),
      roughness: 0.4,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  plate.position.set(0, 0.52, -1.025);
  plate.rotation.set(0, Math.PI, 0);
  g.add(plate);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.012), black);
  pb.position.set(0, 0.52, -1.012);
  g.add(pb);
  g.add(tube([0, 0.5, -0.97], [0, 0.52, -1.006], 0.012, black));

  // ---- decals: JET SL on the tail panels, JET on the cowl, SYM on the fangs ----
  const jet = decalTex((c, w, h) => {
    c.font = 'italic 900 70px "Arial Black",system-ui';
    c.fillStyle = '#111';
    c.textBaseline = 'middle';
    c.fillText('JET', 8, 46);
    c.font = 'italic 900 34px system-ui';
    c.fillStyle = '#d4143c';
    c.fillText('SL', 158, 34);
    c.fillStyle = '#d4143c';
    c.font = 'italic 700 14px system-ui';
    c.fillText('LIQUID COOLED', 10, 84);
  });
  // halftone speed-dots + red "200%" style graphic on the lower white blade
  const dots = decalTex(
    (c, w, h) => {
      for (let y = 0; y < h; y += 8)
        for (let x = 0; x < w; x += 8) {
          const r = 3.2 * (1 - x / w) * (0.5 + (y / h) * 0.6);
          if (r > 0.4) {
            c.fillStyle = '#7d8288';
            c.beginPath();
            c.arc(x + 4, y + 4, r, 0, 7);
            c.fill();
          }
        }
      c.font = 'italic 900 52px "Arial Black",system-ui';
      c.fillStyle = '#d4143c';
      c.textBaseline = 'middle';
      c.fillText('200%', 70, h - 50);
    },
    256,
    256
  );
  const dm = (t) =>
    new THREE.MeshStandardMaterial({
      map: t,
      transparent: true,
      roughness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.1), dm(jet));
    d.position.set(0.18 * s, 0.77, -0.7);
    d.rotation.order = 'YXZ';
    d.rotation.set(0, s * (Math.PI / 2 + 0.12), 0.28 * s);
    g.add(d);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.09), dm(dots));
    e.position.set(0.206 * s, 0.37, 0.29);
    e.rotation.order = 'YXZ';
    e.rotation.set(0, s * (Math.PI / 2 - 0.1), 0.9 * s);
    g.add(e);
  }
  root.userData.wheels = wheels;
  return root;
}

export function buildCar(color, taxi = false) {
  const g = new THREE.Group();
  const body = m(color, { roughness: 0.3, metalness: 0.4 });
  const glass = m('#24323f', { roughness: 0.1, metalness: 0.6 });
  g.add(box(1.8, 0.62, 4.3, body, 0, 0.62, 0));
  const cab = box(1.62, 0.56, 2.2, glass, 0, 1.2, -0.25);
  g.add(cab);
  g.add(box(1.66, 0.08, 2.0, body, 0, 1.5, -0.3)); // roof
  for (const s of [-1, 1]) g.add(box(0.08, 0.5, 0.08, body, 0.78 * s, 1.2, 0.84));
  const wheels = [];
  for (const [x, z] of [
    [-0.82, 1.35],
    [0.82, 1.35],
    [-0.82, -1.35],
    [0.82, -1.35],
  ]) {
    const w = wheel(0.34, 0.24, x, 0.34, z);
    wheels.push(w);
    g.add(w);
  }
  const hlm = new THREE.MeshStandardMaterial({
    color: '#fff',
    emissive: '#fff4d6',
    emissiveIntensity: 1,
  });
  const tlm = new THREE.MeshStandardMaterial({
    color: '#700',
    emissive: '#ff1a1a',
    emissiveIntensity: 0.7,
  });
  for (const s of [-1, 1]) {
    g.add(box(0.36, 0.14, 0.05, hlm, 0.62 * s, 0.75, 2.16));
    g.add(box(0.36, 0.14, 0.05, tlm, 0.62 * s, 0.78, -2.16));
  }
  g.add(box(1.7, 0.16, 0.12, m('#222'), 0, 0.42, 2.15));
  g.add(box(1.7, 0.16, 0.12, m('#222'), 0, 0.42, -2.15));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.17),
    new THREE.MeshBasicMaterial({
      map: plateTex(taxi ? 'TDA-034' : `CYU-34${Math.floor(Math.random() * 10)}`),
    })
  );
  plate.position.set(0, 0.55, -2.22);
  plate.rotation.y = Math.PI;
  g.add(plate);
  if (taxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.3),
      new THREE.MeshStandardMaterial({
        map: plateTex('TAXI', '#ffe066', '#111'),
        emissive: '#ffe066',
        emissiveIntensity: 0.3,
      })
    );
    sign.position.set(0, 1.66, -0.3);
    g.add(sign);
  }
  g.userData.wheels = wheels;
  return g;
}

let PARKED_CAR_ASSETS = null;
export function getParkedCarAssets() {
  if (PARKED_CAR_ASSETS) return PARKED_CAR_ASSETS;
  const paintParts = [];
  const trimParts = [];
  const prepGeo = (src, hex) => {
    const g = src.index ? src.toNonIndexed() : src.clone();
    for (const attr of Object.keys(g.attributes)) {
      if (attr !== 'position' && attr !== 'normal') g.deleteAttribute(attr);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (hex) {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      const c = new THREE.Color(hex);
      for (let i = 0; i < n; i++) {
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    return g;
  };
  const addBox = (arr, w, h, d, x, y, z, hex) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    arr.push(prepGeo(g, hex));
  };
  // Painted bodywork (exact same coordinates as buildCar)
  addBox(paintParts, 1.8, 0.62, 4.3, 0, 0.62, 0, null);
  addBox(paintParts, 1.66, 0.08, 2.0, 0, 1.5, -0.3, null);
  for (const s of [-1, 1]) addBox(paintParts, 0.08, 0.5, 0.08, 0.78 * s, 1.2, 0.84, null);
  // Trim: glass, wheels, hubs, lights, bumpers, rear plate
  addBox(trimParts, 1.62, 0.56, 2.2, 0, 1.2, -0.25, '#24323f');
  for (const [x, z] of [
    [-0.82, 1.35],
    [0.82, 1.35],
    [-0.82, -1.35],
    [0.82, -1.35],
  ]) {
    const tire = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).rotateZ(Math.PI / 2);
    tire.translate(x, 0.34, z);
    trimParts.push(prepGeo(tire, '#1a1a1a'));
    const hub = new THREE.CylinderGeometry(0.17, 0.17, 0.25, 6).rotateZ(Math.PI / 2);
    hub.translate(x, 0.34, z);
    trimParts.push(prepGeo(hub, '#9aa0a6'));
  }
  for (const s of [-1, 1]) {
    addBox(trimParts, 0.36, 0.14, 0.05, 0.62 * s, 0.75, 2.16, '#fff4d6');
    addBox(trimParts, 0.36, 0.14, 0.05, 0.62 * s, 0.78, -2.16, '#d81a1a');
  }
  addBox(trimParts, 1.7, 0.16, 0.12, 0, 0.42, 2.15, '#222222');
  addBox(trimParts, 1.7, 0.16, 0.12, 0, 0.42, -2.15, '#222222');
  const plate = new THREE.PlaneGeometry(0.5, 0.17);
  plate.rotateY(Math.PI);
  plate.translate(0, 0.55, -2.22);
  trimParts.push(prepGeo(plate, '#f4f4f0'));

  PARKED_CAR_ASSETS = {
    paintGeo: mergeGeometries(paintParts),
    trimGeo: mergeGeometries(trimParts),
    paintMat: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0.4,
    }),
    trimMat: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.45,
      metalness: 0.3,
    }),
  };
  return PARKED_CAR_ASSETS;
}

// =====================================================================
// 偶爾出現在車流裡的超跑與重機（src/entities/NPC.js Traffic 抽到才會有）。外型參考：
//   超跑 — ferrari：中置引擎、圓潤的長車頭、短車尾、圓形雙尾燈；lambo：銳利的楔形車身、超低車頭、
//          側面大進氣口、Y 字尾燈；porsche：911 的圓燈、隆起的前葉子板、斜背車頂、整條橫向尾燈和小鴨尾。
//   重機 — sport（仿賽，Kawasaki Ninja／Honda CBR 那種全整流罩、低把手、上翹座墊）；naked（街車，
//          Z／CB 那種外露引擎、肌肉感油箱、平把）；retro（復古，Z900RS／CB1100 那種圓燈、淚滴油箱、長平座墊）。
// 沒有任何廠牌標誌，只有外型。車身是側面輪廓往兩側擠出（panel），輪拱從輪廓下緣挖出來。
// =====================================================================
export const SUPERCARS = {
  ferrari: { name: '法拉利', colors: ['#c8102e', '#ffd100', '#111214'] },
  lambo: { name: '藍寶堅尼', colors: ['#7cd400', '#ff6a00', '#ffcc00', '#5b2a86'] },
  porsche: { name: '保時捷', colors: ['#c7c9cc', '#f2f2f0', '#1e3a8a', '#d11a2a'] },
};
export const BIKES = {
  sport: { name: '重機（仿賽）', colors: ['#5ec400', '#d71920', '#1c3f94'] },
  naked: { name: '重機（街車）', colors: ['#5ec400', '#111214', '#b8bcc2'] },
  retro: { name: '重機（復古）', colors: ['#5b2c1a', '#1d2b4f', '#111214'] },
  ninja: { name: '重機（忍 400）', colors: ['#0b0c0e'] }, // 霍華德's (src/entities/npcs/Howard.js), not in the traffic
};
// side profile with wheel arches cut out of the lower edge. top: [[z, y]] from the nose to the tail;
// wheels: [[zc, yc, R]] front first; yb: underbody height; z ends taken from top[0] / top[last]
function archProfile(top, wheels, yb) {
  const pts = [],
    nose = top[0][0],
    tail = top[top.length - 1][0];
  pts.push([nose, yb]);
  for (const [zc, yc, R] of wheels)
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI;
      pts.push([zc + R * Math.cos(a), Math.max(yb, yc + R * Math.sin(a))]);
    }
  pts.push([tail, yb]);
  for (let i = top.length - 1; i >= 0; i--) pts.push(top[i]);
  return pts;
}
export function buildSupercar(style, color) {
  const g = new THREE.Group(),
    body = paint(color),
    glass = m('#141c24', { roughness: 0.06, metalness: 0.75 });
  const dark = m('#16171a', { roughness: 0.6 }),
    carbon = m('#202226', { roughness: 0.35, metalness: 0.3 });
  const hlm = new THREE.MeshStandardMaterial({
    color: '#fff',
    emissive: '#fff4d6',
    emissiveIntensity: 1.1,
  });
  const tlm = new THREE.MeshStandardMaterial({
    color: '#700',
    emissive: '#ff1a1a',
    emissiveIntensity: 0.9,
  });
  const W = 1.96,
    ZF = 1.32,
    ZR = -1.34,
    RF = 0.33,
    RR = 0.355,
    AR = 0.06; // arch clearance
  const S = {
    ferrari: {
      yb: 0.2,
      top: [
        [2.28, 0.36],
        [2.24, 0.52],
        [1.9, 0.66],
        [1.3, 0.75],
        [0.7, 0.8],
        [0.0, 0.86],
        [-0.9, 0.9],
        [-1.7, 0.95],
        [-2.15, 0.92],
        [-2.26, 0.75],
        [-2.28, 0.42],
      ],
      glass: [
        [0.78, 0.79],
        [0.05, 1.15],
        [-0.55, 1.17],
        [-1.45, 0.96],
        [-1.45, 0.86],
      ],
      gw: 1.52,
    },
    lambo: {
      yb: 0.18,
      top: [
        [2.34, 0.32],
        [2.3, 0.44],
        [1.6, 0.6],
        [0.9, 0.72],
        [0.0, 0.8],
        [-0.9, 0.86],
        [-1.8, 0.92],
        [-2.24, 0.9],
        [-2.3, 0.6],
        [-2.32, 0.36],
      ],
      glass: [
        [0.95, 0.71],
        [0.02, 1.12],
        [-0.68, 1.12],
        [-1.85, 0.94],
        [-1.85, 0.86],
      ],
      gw: 1.46,
    },
    porsche: {
      yb: 0.2,
      top: [
        [2.2, 0.42],
        [2.17, 0.6],
        [1.85, 0.72],
        [1.4, 0.78],
        [0.75, 0.8],
        [0.0, 0.84],
        [-1.0, 0.86],
        [-1.75, 0.86],
        [-2.12, 0.8],
        [-2.2, 0.6],
        [-2.2, 0.4],
      ],
      glass: [
        [0.8, 0.8],
        [0.18, 1.24],
        [-0.45, 1.28],
        [-1.3, 1.08],
        [-1.95, 0.86],
        [-1.95, 0.8],
      ],
      gw: 1.5,
    },
  }[style];
  const lower = panel(
    archProfile(
      S.top,
      [
        [ZF, RF, RF + AR],
        [ZR, RR, RR + AR],
      ],
      S.yb
    ),
    W,
    body,
    { bevel: 0.07, taper: (z, y) => (y > 0.62 ? 1 - (y - 0.62) * 0.55 : 1) }
  );
  g.add(lower);
  const gh = panel(S.glass, S.gw, glass, {
    bevel: 0.03,
    taper: (z, y) => 1 - Math.max(0, y - 0.86) * 0.7,
  });
  g.add(gh);
  // wheels: big, staggered (wider at the back), dark rims
  const wheels = [];
  for (const [x, z, r, w] of [
    [-0.84, ZF, RF, 0.27],
    [0.84, ZF, RF, 0.27],
    [-0.82, ZR, RR, 0.33],
    [0.82, ZR, RR, 0.33],
  ]) {
    const wh = wheel(r, w, x, r, z);
    wheels.push(wh);
    g.add(wh);
  }
  // lights, grilles, intakes per style
  if (style === 'ferrari') {
    for (const s of [-1, 1]) {
      const hl = box(0.42, 0.06, 0.2, hlm, 0.6 * s, 0.74, 1.98);
      hl.rotation.x = 0.5;
      hl.rotation.y = -0.25 * s;
      g.add(hl);
      for (const dx of [0.5, 0.76]) {
        const t = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16).rotateX(Math.PI / 2),
          tlm
        );
        t.position.set(dx * s, 0.8, -2.36);
        g.add(t);
      }
      g.add(box(0.05, 0.22, 0.6, dark, 0.985 * s, 0.6, -0.75)); // side intake
    }
    g.add(box(1.2, 0.16, 0.1, dark, 0, 0.36, 2.35)); // front grille
    g.add(box(1.5, 0.14, 0.12, dark, 0, 0.36, -2.35)); // diffuser
    for (const s of [-1, 1])
      g.add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12).rotateX(Math.PI / 2),
          m('#9aa0a6', { metalness: 0.9, roughness: 0.25 })
        )
          .translateX(0.28 * s)
          .translateY(0.34)
          .translateZ(-2.38)
      );
  } else if (style === 'lambo') {
    for (const s of [-1, 1]) {
      const hl = box(0.5, 0.05, 0.16, hlm, 0.6 * s, 0.55, 2.12);
      hl.rotation.x = 0.35;
      hl.rotation.y = -0.3 * s;
      g.add(hl);
      // Y-shaped tail lights: two bars meeting
      const a = box(0.34, 0.04, 0.03, tlm, 0.62 * s, 0.8, -2.4);
      a.rotation.z = 0.45 * s;
      g.add(a);
      const b = box(0.34, 0.04, 0.03, tlm, 0.62 * s, 0.72, -2.4);
      b.rotation.z = -0.45 * s;
      g.add(b);
      // big angular side intake behind the doors
      const sh = new THREE.Shape([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.8, 0.0),
        new THREE.Vector2(0.55, 0.36),
        new THREE.Vector2(0.2, 0.36),
      ]);
      const ig = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }).rotateY(
        Math.PI / 2
      );
      const intake = new THREE.Mesh(ig, dark);
      intake.position.set(0.97 * s - 0.02, 0.42, -0.35);
      g.add(intake);
    }
    g.add(box(1.7, 0.12, 0.1, dark, 0, 0.3, 2.4)); // splitter
    g.add(box(1.4, 0.2, 0.1, dark, 0, 0.42, -2.39));
    const wing = box(1.6, 0.03, 0.28, carbon, 0, 1.02, -2.05);
    g.add(wing);
    for (const s of [-1, 1]) g.add(box(0.03, 0.12, 0.18, carbon, 0.6 * s, 0.96, -2.05));
    g.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6).rotateX(Math.PI / 2),
        m('#9aa0a6', { metalness: 0.9, roughness: 0.25 })
      )
        .translateY(0.5)
        .translateZ(-2.42)
    );
  } else {
    // 911: round headlamps on the front wings, full-width light bar, small ducktail
    for (const s of [-1, 1]) {
      const hl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20).rotateX(Math.PI / 2 - 0.35),
        hlm
      );
      hl.position.set(0.66 * s, 0.78, 1.96);
      g.add(hl);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.015, 6, 20),
        m('#9aa0a6', { metalness: 0.8, roughness: 0.3 })
      );
      ring.rotation.x = -0.35;
      ring.position.set(0.66 * s, 0.78, 1.99);
      g.add(ring);
      g.add(box(0.05, 0.12, 0.35, dark, 0.985 * s, 0.4, 1.7));
    }
    g.add(box(1.72, 0.05, 0.04, tlm, 0, 0.76, -2.28)); // light bar
    g.add(box(1.5, 0.12, 0.08, dark, 0, 0.38, 2.28));
    const duck = box(1.3, 0.03, 0.22, body, 0, 0.88, -1.98);
    duck.rotation.x = -0.2;
    g.add(duck);
    for (const s of [-1, 1])
      g.add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12).rotateX(Math.PI / 2),
          m('#9aa0a6', { metalness: 0.9, roughness: 0.25 })
        )
          .translateX(0.35 * s)
          .translateY(0.3)
          .translateZ(-2.3)
      );
  }
  for (const s of [-1, 1]) {
    const mir = box(0.16, 0.08, 0.12, body, 0.86 * s, 0.98, 0.55);
    g.add(mir);
  }
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.17),
    new THREE.MeshBasicMaterial({ map: plateTex(`RCA-${100 + Math.floor(Math.random() * 900)}`) })
  );
  plate.position.set(0, 0.55, S.top[S.top.length - 1][0] - 0.085);
  plate.rotation.y = Math.PI;
  g.add(plate);
  g.userData.wheels = wheels;
  return g;
}
// 霍華德的忍 400（src/entities/npcs/Howard.js）：照使用者給的照片做的 400cc 仿賽，沒有廠牌標誌和字樣。
// 亮黑色車殼、側邊消光灰的大片導流板配一道銀色飾條和白色細線、銳利的雙燈和高擋風鏡、照後鏡、上翹的尖尾和兩段式座墊、
// 黑色鋼管車架與搖臂、黑色引擎配銀色外蓋、右側短排氣管（黑色管身＋銀色防燙蓋）、前後碟盤、輪框一圈紅色細邊、
// 尾巴下面垂著的牌照架和方向燈。+z 朝前、+x 是左邊，跟 buildBike 一樣的尺寸（軸距 1.46 m）。
function buildNinja() {
  const g = new THREE.Group(),
    gloss = paint('#0b0c0e'),
    matte = m('#2a2c31', { roughness: 0.75, metalness: 0.15 }),
    silver = m('#c3c7cc', { metalness: 0.9, roughness: 0.28 }),
    dark = m('#151619', { roughness: 0.6 }),
    white = m('#f1f1ee', { roughness: 0.4 }),
    red = m('#c8102e', { roughness: 0.45 });
  const hlm = new THREE.MeshStandardMaterial({
    color: '#fff',
    emissive: '#f4f8ff',
    emissiveIntensity: 1.2,
  });
  const tlm = new THREE.MeshStandardMaterial({
    color: '#700',
    emissive: '#ff1a1a',
    emissiveIntensity: 0.9,
  });
  const ZF = 0.74,
    ZR = -0.72,
    RF = 0.31,
    RR = 0.32;
  const wheels = [wheel(RF, 0.12, 0, RF, ZF), wheel(RR, 0.17, 0, RR, ZR)];
  g.add(...wheels);
  // a thin red line round each rim, and the brake discs (they turn with the wheels)
  for (const [w, r, wd] of [
    [wheels[0], RF, 0.12],
    [wheels[1], RR, 0.17],
  ]) {
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.007, 6, 36), red);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = s * (wd / 2 + 0.004);
      w.add(ring);
    }
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.008, 24).rotateZ(Math.PI / 2),
      silver
    );
    disc.position.x = -(wd / 2 + 0.02);
    w.add(disc);
  }
  // front: black fork legs, a gloss mudguard over the tyre
  const head = [0, 0.93, 0.5];
  for (const s of [-1, 1])
    g.add(tube([0.085 * s, head[1], head[2] + 0.02], [0.085 * s, RF, ZF], 0.03, dark));
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(RF + 0.04, RF + 0.04, 0.13, 18, 1, true, -0.35, 1.5).rotateZ(
      Math.PI / 2
    ),
    gloss
  );
  guard.position.set(0, RF, ZF);
  g.add(guard);
  // black steel trellis frame and swingarm
  for (const s of [-1, 1]) {
    g.add(tube([0.07 * s, head[1] - 0.02, head[2]], [0.15 * s, 0.62, -0.16], 0.022, dark));
    g.add(tube([0.07 * s, head[1] - 0.12, head[2] - 0.02], [0.15 * s, 0.42, -0.14], 0.02, dark));
    g.add(tube([0.13 * s, 0.46, -0.18], [0.1 * s, RR, ZR], 0.03, dark)); // swingarm
  }
  // engine: black block, silver side covers
  g.add(box(0.3, 0.32, 0.42, dark, 0, 0.44, 0.06));
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.02, 18).rotateZ(Math.PI / 2),
      silver
    );
    c.position.set(0.16 * s, 0.4, 0.0);
    g.add(c);
  }
  // fairing: the nose and the upper sides, narrowing to the front
  g.add(
    panel(
      [
        [0.99, 0.8],
        [0.97, 0.9],
        [0.84, 1.02],
        [0.62, 1.1],
        [0.44, 1.05],
        [0.3, 0.92],
        [0.16, 0.7],
        [0.26, 0.5],
        [0.5, 0.52],
        [0.68, 0.64],
        [0.88, 0.68],
      ],
      0.42,
      gloss,
      { bevel: 0.035, taper: (z) => 1 - 0.68 * Math.min(1, Math.max(0, (z - 0.45) / 0.55)) } // narrows to a pointed nose
    )
  );
  // the matte grey side panels under the tank, with a silver trim strip and a thin white line
  for (const s of [-1, 1]) {
    g.add(
      panel(
        [
          [0.44, 0.86],
          [0.2, 0.95],
          [-0.03, 0.83],
          [0.0, 0.56],
          [0.3, 0.5],
          [0.46, 0.62],
        ],
        0.03,
        matte,
        { x: 0.215 * s, bevel: 0.01 }
      )
    );
    g.add(
      panel(
        [
          [0.38, 0.75],
          [0.16, 0.8],
          [-0.01, 0.71],
          [0.02, 0.66],
          [0.17, 0.74],
          [0.36, 0.7],
        ],
        0.012,
        silver,
        { x: 0.236 * s, bevel: 0.004 }
      )
    );
    g.add(
      panel(
        [
          [0.42, 0.62],
          [0.1, 0.665],
          [0.1, 0.645],
          [0.42, 0.6],
        ],
        0.01,
        white,
        { x: 0.238 * s, bevel: 0.002 }
      )
    );
  }
  // belly pan under the engine
  g.add(
    panel(
      [
        [0.3, 0.46],
        [0.04, 0.3],
        [-0.22, 0.33],
        [-0.12, 0.48],
      ],
      0.3,
      gloss,
      { bevel: 0.02 }
    )
  );
  // tank
  g.add(
    panel(
      [
        [0.44, 0.95],
        [0.32, 1.07],
        [0.0, 1.07],
        [-0.16, 0.94],
        [0.1, 0.86],
        [0.3, 0.88],
      ],
      0.38,
      gloss,
      { bevel: 0.04, taper: (z, y) => (y > 1.0 ? 0.86 : 1) }
    )
  );
  // two-step seat: the rider's, then the higher pillion
  g.add(
    panel(
      [
        [-0.12, 0.92],
        [-0.17, 0.975],
        [-0.48, 0.995],
        [-0.5, 0.93],
        [-0.15, 0.88],
      ],
      0.27,
      dark,
      { bevel: 0.025 }
    )
  );
  g.add(
    panel(
      [
        [-0.51, 0.99],
        [-0.54, 1.045],
        [-0.78, 1.1],
        [-0.8, 1.04],
        [-0.53, 0.97],
      ],
      0.2,
      dark,
      { bevel: 0.02 }
    )
  );
  // the sharp, upswept tail, a white line along it, the tail light at its tip
  g.add(
    panel(
      [
        [-0.15, 0.86],
        [-0.5, 0.93],
        [-0.82, 1.04],
        [-1.03, 1.15],
        [-1.0, 1.06],
        [-0.72, 0.9],
        [-0.42, 0.78],
        [-0.2, 0.76],
      ],
      0.25,
      gloss,
      { bevel: 0.03, taper: (z) => (z < -0.75 ? 0.55 : 1) }
    )
  );
  for (const s of [-1, 1])
    g.add(
      panel(
        [
          [-0.55, 0.955],
          [-0.92, 1.1],
          [-0.92, 1.085],
          [-0.55, 0.94],
        ],
        0.008,
        white,
        { x: 0.13 * s, bevel: 0.002 }
      )
    );
  g.add(box(0.12, 0.035, 0.03, tlm, 0, 1.11, -1.04));
  // the number-plate hanger under the tail, with the plate and two small indicators
  g.add(tube([0, 0.86, -0.92], [0, 0.66, -1.08], 0.02, dark));
  for (const s of [-1, 1]) {
    g.add(
      box(
        0.05,
        0.025,
        0.03,
        m('#ffb347', { emissive: '#ff8a00', emissiveIntensity: 0.3 }),
        0.07 * s,
        0.7,
        -1.07
      )
    );
  }
  // twin headlights like the photo's: each a sharp unit swept back and up towards the outside, set on the slanted
  // face of the nose — a black housing, a clear lens over it, a bright LED projector at the inner end and a daytime
  // running strip along its upper edge; a black ram-air slot between them under the screen
  const lens = m('#dfeaf5', { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 }),
    hous = m('#060607', { roughness: 0.25, metalness: 0.4 }),
    drl = new THREE.MeshStandardMaterial({
      color: '#fff',
      emissive: '#e8f2ff',
      emissiveIntensity: 1.6,
    });
  const flat = (pts, depth, mat, bevel = 0.003) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
    });
    return new THREE.Mesh(geo, mat);
  };
  // one light in its own frame (x: outwards, y: up, z: out of the nose), from the inner end to the swept tip
  const LIGHT = [
    [0.0, 0.0],
    [0.14, 0.022],
    [0.215, 0.07],
    [0.2, 0.08],
    [0.09, 0.052],
    [0.0, 0.028],
  ];
  for (const s of [-1, 1]) {
    const u = new THREE.Group();
    const H = flat(
      LIGHT.map(([x, y]) => [x * 1.08 - 0.006, y * 1.25 - 0.008]),
      0.012,
      hous
    );
    H.position.z = -0.01;
    const L = flat(LIGHT, 0.006, lens, 0.002);
    L.position.z = 0.006;
    const led = box(0.05, 0.014, 0.008, hlm, 0.045, 0.014, 0.006); // the projector, a slim bar at the inner end
    led.rotation.z = 0.12;
    const led2 = box(0.04, 0.012, 0.008, hlm, 0.11, 0.03, 0.006);
    led2.rotation.z = 0.3;
    const strip = tube([0.01, 0.03, 0.01], [0.09, 0.054, 0.01], 0.004, drl, 6); // DRL along the top edge
    const strip2 = tube([0.09, 0.054, 0.01], [0.2, 0.079, 0.01], 0.004, drl, 6);
    u.add(H, L, led, led2, strip, strip2);
    if (s < 0) u.scale.x = -1; // mirrored for the right-hand light
    u.position.set(0.035 * s, 0.82, 1.065); // from the point of the nose back along its side
    u.rotation.order = 'YXZ';
    u.rotation.y = 0.95 * s;
    u.rotation.x = -0.2;
    g.add(u);
  }
  const ram = flat(
    [
      [-0.03, 0.0],
      [0.03, 0.0],
      [0.022, 0.045],
      [-0.022, 0.045],
    ],
    0.01,
    hous
  );
  ram.position.set(0, 0.78, 1.035);
  ram.rotation.x = -0.18;
  g.add(ram);
  for (const s of [-1, 1]) {
    g.add(tube([0.17 * s, 1.04, 0.7], [0.3 * s, 1.16, 0.64], 0.01, dark));
    const mir = box(0.13, 0.06, 0.02, dark, 0.31 * s, 1.17, 0.64);
    mir.rotation.y = 0.2 * s;
    g.add(mir);
    g.add(box(0.2, 0.03, 0.03, dark, 0.15 * s, 0.98, 0.5));
  }
  g.add(
    panel(
      [
        [0.82, 1.02],
        [0.64, 1.25],
        [0.57, 1.21],
        [0.62, 1.07],
      ],
      0.3,
      m('#2a3a4a', { transparent: true, opacity: 0.55, roughness: 0.05 }),
      { bevel: 0.008 }
    )
  );
  // exhaust on the right: a short black can with a silver heat shield, tilted up
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.07, 0.44, 16).rotateX(Math.PI / 2 - 0.22),
    m('#1b1c1f', { metalness: 0.6, roughness: 0.35 })
  );
  can.position.set(-0.17, 0.46, -0.5);
  g.add(can);
  const shield = box(0.02, 0.1, 0.28, silver, -0.25, 0.47, -0.42);
  shield.rotation.x = 0.22;
  g.add(shield);
  g.add(
    tube(
      [-0.1, 0.32, 0.18],
      [-0.17, 0.4, -0.3],
      0.03,
      m('#3a3c40', { metalness: 0.7, roughness: 0.35 })
    )
  );
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.09),
    new THREE.MeshBasicMaterial({ map: plateTex('NJ-400') })
  );
  plate.position.set(0, 0.68, -1.09);
  plate.rotation.y = Math.PI;
  g.add(plate);
  g.userData.wheels = wheels;
  return g;
}

export function buildBike(style, color) {
  if (style === 'ninja') return buildNinja(); // 霍華德's own bike
  const g = new THREE.Group(),
    body = paint(color),
    dark = m('#18191c', { roughness: 0.6 });
  const metal = m('#a7acb2', { metalness: 0.85, roughness: 0.3 }),
    chrome = m('#dfe3e8', { metalness: 1, roughness: 0.12 });
  const hlm = new THREE.MeshStandardMaterial({
    color: '#fff',
    emissive: '#fff4d6',
    emissiveIntensity: 1.1,
  });
  const tlm = new THREE.MeshStandardMaterial({
    color: '#700',
    emissive: '#ff1a1a',
    emissiveIntensity: 0.9,
  });
  const ZF = 0.74,
    ZR = -0.72,
    RF = 0.31,
    RR = 0.32;
  const wheels = [wheel(RF, 0.13, 0, RF, ZF), wheel(RR, 0.18, 0, RR, ZR)];
  g.add(...wheels);
  // fork, frame, swingarm, engine
  const head = [0, style === 'retro' ? 1.0 : 0.92, 0.5];
  for (const s of [-1, 1])
    g.add(
      tube(
        [0.085 * s, head[1], head[2] + 0.02],
        [0.085 * s, RF, ZF],
        0.028,
        style === 'retro' ? chrome : m('#c9a227', { metalness: 0.7, roughness: 0.3 })
      )
    );
  g.add(tube(head, [0, 0.52, -0.22], 0.04, dark));
  for (const s of [-1, 1]) g.add(tube([0.12 * s, 0.48, -0.2], [0.1 * s, RR, ZR], 0.03, metal));
  g.add(box(0.3, 0.34, 0.44, m('#2a2c30', { metalness: 0.5, roughness: 0.4 }), 0, 0.46, 0.04)); // engine
  if (style !== 'sport')
    for (let i = 0; i < 5; i++) g.add(box(0.36, 0.015, 0.3, metal, 0, 0.52 + i * 0.05, 0.12)); // cylinder fins
  // tank, seat, tail
  if (style === 'sport') {
    // full fairing from the nose back under the tank, a tinted screen, upswept tail
    // (the lower edge steps up over the front wheel so the tyre shows)
    g.add(
      panel(
        [
          [0.86, 0.66],
          [0.9, 0.8],
          [0.76, 0.98],
          [0.52, 1.04],
          [0.3, 0.92],
          [0.08, 0.6],
          [0.15, 0.36],
          [0.4, 0.38],
          [0.56, 0.66],
        ],
        0.44,
        body,
        { bevel: 0.035, taper: (z) => (z > 0.6 ? 0.7 : 1) }
      )
    );
    const scr = panel(
      [
        [0.82, 0.98],
        [0.62, 1.15],
        [0.55, 1.05],
      ],
      0.3,
      m('#203040', { transparent: true, opacity: 0.6, roughness: 0.05 }),
      { bevel: 0.01 }
    );
    g.add(scr);
    g.add(
      panel(
        [
          [0.42, 0.92],
          [0.3, 1.02],
          [-0.05, 1.0],
          [-0.15, 0.86],
          [0.2, 0.78],
        ],
        0.36,
        body,
        { bevel: 0.04 }
      )
    ); // tank
    g.add(
      panel(
        [
          [-0.15, 0.86],
          [-0.15, 0.92],
          [-0.55, 0.98],
          [-0.95, 1.12],
          [-1.0, 1.06],
          [-0.6, 0.82],
        ],
        0.24,
        body,
        { bevel: 0.03 }
      )
    ); // tail
    g.add(box(0.24, 0.05, 0.32, dark, 0, 0.93, -0.35)); // seat
    for (const s of [-1, 1]) g.add(box(0.2, 0.03, 0.03, dark, 0.16 * s, 0.98, 0.5)); // clip-ons
    g.add(box(0.26, 0.06, 0.04, hlm, 0, 0.82, 0.97));
    g.add(box(0.18, 0.04, 0.03, tlm, 0, 1.08, -0.99));
    g.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.05, 0.36, 12).rotateX(Math.PI / 2 - 0.25),
        m('#3a3c40', { metalness: 0.7, roughness: 0.35 })
      )
        .translateX(-0.16)
        .translateY(0.42)
        .translateZ(-0.55)
    );
  } else if (style === 'naked') {
    g.add(
      panel(
        [
          [0.48, 0.86],
          [0.35, 1.02],
          [0.0, 1.03],
          [-0.18, 0.9],
          [0.1, 0.76],
          [0.42, 0.74],
        ],
        0.4,
        body,
        { bevel: 0.05, taper: (z, y) => (y > 0.95 ? 0.85 : 1) }
      )
    ); // muscular tank
    for (const s of [-1, 1])
      g.add(
        panel(
          [
            [0.55, 0.62],
            [0.5, 0.86],
            [0.25, 0.78],
            [0.3, 0.55],
          ],
          0.03,
          body,
          { x: 0.2 * s, bevel: 0.01 }
        )
      ); // radiator shrouds
    g.add(box(0.26, 0.07, 0.42, dark, 0, 0.93, -0.38)); // seat
    g.add(
      panel(
        [
          [-0.55, 0.9],
          [-0.6, 0.98],
          [-0.95, 1.04],
          [-0.95, 0.98],
          [-0.6, 0.86],
        ],
        0.2,
        body,
        { bevel: 0.02 }
      )
    ); // short tail
    g.add(box(0.72, 0.03, 0.03, dark, 0, 1.08, 0.42)); // flat wide bar
    const hl = box(0.2, 0.14, 0.1, dark, 0, 0.98, 0.66);
    hl.rotation.x = -0.3;
    g.add(hl);
    g.add(box(0.16, 0.08, 0.02, hlm, 0, 0.98, 0.72));
    g.add(box(0.14, 0.04, 0.03, tlm, 0, 1.0, -0.96));
    g.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.055, 0.34, 6).rotateX(Math.PI / 2 - 0.3),
        m('#2a2c30', { metalness: 0.7, roughness: 0.35 })
      )
        .translateX(-0.18)
        .translateY(0.48)
        .translateZ(-0.5)
    );
  } else {
    // retro: teardrop tank, long flat bench, round chrome headlamp, upright bar, twin shocks, long chrome pipe
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), body);
    tank.scale.set(0.95, 0.62, 1.55);
    tank.position.set(0, 0.98, 0.18);
    g.add(tank);
    g.add(box(0.27, 0.08, 0.66, m('#2a1a12', { roughness: 0.8 }), 0, 0.93, -0.45)); // bench
    g.add(box(0.27, 0.02, 0.66, chrome, 0, 0.89, -0.45));
    const hl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.12, 20).rotateX(Math.PI / 2),
      chrome
    );
    hl.position.set(0, 1.0, 0.68);
    g.add(hl);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.088, 20), hlm);
    lens.position.set(0, 1.0, 0.745);
    g.add(lens);
    g.add(tube([-0.34, 1.12, 0.38], [0.34, 1.12, 0.38], 0.016, chrome));
    for (const s of [-1, 1]) {
      g.add(tube([0.24 * s, 1.12, 0.38], [0.12 * s, 1.0, 0.5], 0.016, chrome));
      g.add(tube([0.14 * s, 0.9, -0.62], [0.12 * s, RR + 0.04, ZR + 0.05], 0.022, chrome));
    }
    g.add(tube([-0.16, 0.36, 0.25], [-0.17, 0.34, -0.95], 0.04, chrome)); // long pipe
    const fender = new THREE.Mesh(
      new THREE.CylinderGeometry(RR + 0.05, RR + 0.05, 0.18, 16, 1, true, -0.2, 1.6).rotateZ(
        Math.PI / 2
      ),
      body
    );
    fender.position.set(0, RR, ZR);
    g.add(fender);
    g.add(box(0.12, 0.05, 0.03, tlm, 0, 0.9, -0.82));
  }
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.09),
    new THREE.MeshBasicMaterial({ map: plateTex(`HVY-${10 + Math.floor(Math.random() * 90)}`) })
  );
  plate.position.set(0, 0.7, -1.0);
  plate.rotation.y = Math.PI;
  g.add(plate);
  g.userData.wheels = wheels;
  return g;
}

// 漢克的 ZMAX：155cc 大型白牌速克達（使用者附圖：亮黑車身、霧黑下車身、高風鏡、尖銳的雙 LED 頭燈、
// 平底踏板、雙段式座墊、後扶手、金色後避震、13 吋五爪黑框輪圈、側邊 ZMAX 字樣）。z 向前、y 向上，單位公尺。
export function buildZmax(color = '#0e0f11') {
  const g = new THREE.Group();
  const gloss = paint(color),
    matte = m('#1d1e21', { roughness: 0.75 }),
    seatM = m('#232427', { roughness: 0.9 });
  const _metal = m('#8f959c', { metalness: 0.8, roughness: 0.3 }),
    gold = m('#c9a227', { metalness: 0.8, roughness: 0.3 });
  const hlm = new THREE.MeshStandardMaterial({
    color: '#fff',
    emissive: '#eef6ff',
    emissiveIntensity: 1.2,
  });
  const tlm = new THREE.MeshStandardMaterial({
    color: '#700',
    emissive: '#ff1a1a',
    emissiveIntensity: 0.9,
  });
  const ZF = 0.68,
    ZR = -0.66,
    R = 0.29;
  const wheels = [wheel(R, 0.13, 0, R, ZF), wheel(R, 0.15, 0, R, ZR)];
  g.add(...wheels);
  // front: tall gloss-black cowl, tinted screen, V-shaped twin LED lamp, fender, fork
  g.add(
    panel(
      [
        [0.98, 0.62],
        [1.02, 0.86],
        [0.9, 1.15],
        [0.66, 1.3],
        [0.5, 1.18],
        [0.42, 0.62],
        [0.55, 0.42],
        [0.8, 0.5],
      ],
      0.42,
      gloss,
      { bevel: 0.03, taper: (z) => 1 - Math.max(0, z - 0.6) * 1.2 }
    )
  );
  g.add(
    panel(
      [
        [0.66, 1.3],
        [0.56, 1.66],
        [0.46, 1.64],
        [0.52, 1.24],
      ],
      0.36,
      m('#1a2129', { transparent: true, opacity: 0.72, roughness: 0.05 }),
      { bevel: 0.01 }
    )
  );
  for (const s of [-1, 1]) {
    const l = box(0.14, 0.028, 0.03, hlm, 0.07 * s, 0.96, 1.04);
    l.rotation.z = 0.28 * s;
    g.add(l);
  }
  g.add(box(0.2, 0.05, 0.03, matte, 0, 0.88, 1.04)); // dark lamp housing below the LED strips
  g.add(
    panel(
      [
        [0.96, 0.5],
        [0.92, 0.6],
        [0.55, 0.62],
        [0.45, 0.52],
      ],
      0.17,
      matte,
      { bevel: 0.015 }
    )
  ); // front fender
  for (const s of [-1, 1]) g.add(tube([0.075 * s, 0.85, 0.6], [0.075 * s, R, ZF], 0.025, matte));
  // floorboard and the matte-black lower body with the step-through
  g.add(box(0.44, 0.06, 0.62, matte, 0, 0.39, 0.14));
  g.add(
    panel(
      [
        [0.5, 0.4],
        [0.45, 0.3],
        [-0.2, 0.26],
        [-0.25, 0.42],
      ],
      0.48,
      matte,
      { bevel: 0.02 }
    )
  );
  // rear body: gloss upper panels, matte lower, ZMAX lettering on both sides
  g.add(
    panel(
      [
        [0.12, 0.45],
        [0.06, 0.76],
        [-0.3, 0.86],
        [-0.92, 0.98],
        [-1.04, 0.92],
        [-0.94, 0.62],
        [-0.5, 0.44],
      ],
      0.5,
      gloss,
      { bevel: 0.03, taper: (z, y) => (y > 0.88 ? 0.85 : 1) }
    )
  );
  g.add(
    panel(
      [
        [0.1, 0.42],
        [-0.5, 0.4],
        [-0.9, 0.6],
        [-0.8, 0.66],
        [-0.4, 0.56],
        [0.08, 0.6],
      ],
      0.52,
      matte,
      { bevel: 0.02 }
    )
  );
  const badge = decalTex(
    (c, w, h) => {
      c.fillStyle = '#e8e8e8';
      c.font = 'italic 900 64px Arial,sans-serif';
      c.textBaseline = 'middle';
      c.fillText('ZMAX', 20, h / 2);
    },
    256,
    96
  );
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.075),
      new THREE.MeshBasicMaterial({ map: badge, transparent: true, depthWrite: false })
    );
    b.position.set(0.28 * s, 0.82, -0.62);
    b.rotation.y = (s * Math.PI) / 2;
    g.add(b);
  }
  // two-level seat (rider low in front, pillion step behind) and the rear grab rail
  g.add(
    panel(
      [
        [0.16, 0.83],
        [0.08, 0.94],
        [-0.32, 0.92],
        [-0.42, 1.0],
        [-0.84, 1.04],
        [-0.88, 0.98],
        [-0.42, 0.88],
        [0.16, 0.8],
      ],
      0.36,
      seatM,
      { bevel: 0.03 }
    )
  );
  for (const s of [-1, 1]) g.add(tube([0.2 * s, 1.0, -0.62], [0.2 * s, 1.03, -1.02], 0.018, matte));
  g.add(tube([-0.2, 1.03, -1.02], [0.2, 1.03, -1.02], 0.018, matte));
  // handlebar with bar ends, mirrors on stalks
  g.add(tube([-0.36, 1.2, 0.44], [0.36, 1.2, 0.44], 0.016, matte));
  for (const s of [-1, 1]) {
    g.add(tube([0.27 * s, 1.2, 0.44], [0.31 * s, 1.42, 0.42], 0.01, matte));
    const mir = box(0.13, 0.065, 0.02, matte, 0.34 * s, 1.44, 0.42);
    mir.rotation.z = -0.15 * s;
    g.add(mir);
  }
  // engine / CVT case on the right (-x), exhaust, gold shocks, hugger with the plate, tail lamp
  g.add(
    box(0.16, 0.24, 0.62, m('#2a2c30', { metalness: 0.45, roughness: 0.45 }), -0.17, 0.36, -0.42)
  );
  g.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, 0.42, 12).rotateX(Math.PI / 2 - 0.25),
      matte
    )
      .translateX(-0.2)
      .translateY(0.42)
      .translateZ(-0.86)
  );
  for (const s of [-1, 1])
    g.add(tube([0.13 * s, 0.38, -0.62], [0.13 * s, 0.72, -0.78], 0.025, gold));
  g.add(box(0.06, 0.18, 0.2, matte, 0, 0.66, -1.06));
  g.add(box(0.18, 0.05, 0.05, tlm, 0, 0.9, -1.06));
  for (const s of [-1, 1])
    g.add(
      box(
        0.05,
        0.03,
        0.03,
        m('#ffb000', { emissive: '#ff9000', emissiveIntensity: 0.5 }),
        0.15 * s,
        0.86,
        -1.04
      )
    );
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.09),
    new THREE.MeshBasicMaterial({ map: plateTex('HNK-155') })
  );
  plate.position.set(0, 0.62, -1.17);
  plate.rotation.y = Math.PI;
  g.add(plate);
  g.userData.wheels = wheels;
  return g;
}

// Yamaha BW'S（使用者附圖）：方正直立的車頭面板、高平把手、平底踏板、長平座墊、後扶手、12 吋越野胎。z 向前、y 向上，單位公尺。
//  'gd'：女拳大帝的新款 BW'S —— 夜幕灰（深灰藍消光側板、霧黑外殼），黑色面罩裡左右並排兩顆圓燈，黑框輪圈、塊狀越野胎；
//  'zz'：吱吱的舊款 BW'S —— 白色車殼、紅色車頭上蓋、上小下大兩顆燈、紅色輪框與紅色後避震、黑座墊、管狀後扶手。
export function buildBws(style = 'gd') {
  const g = new THREE.Group(),
    gd = style === 'gd';
  const body = gd ? m('#3a4253', { roughness: 0.62, metalness: 0.25 }) : paint('#f1f1ee');
  const matte = m('#1b1c1f', { roughness: 0.82 }),
    seatM = m('#1e1f22', { roughness: 0.92 });
  const accent = gd ? m('#2a2d33', { roughness: 0.7 }) : paint('#cf1f2b');
  const rimM = gd ? m('#16171a', { roughness: 0.5, metalness: 0.4 }) : paint('#c8202c');
  const shockM = gd ? m('#2b2d31', { metalness: 0.6, roughness: 0.35 }) : paint('#d0202c');
  const hlm = new THREE.MeshStandardMaterial({
    color: '#fff',
    emissive: '#fff4d8',
    emissiveIntensity: 1.1,
  });
  const tlm = new THREE.MeshStandardMaterial({
    color: '#700',
    emissive: '#ff1a1a',
    emissiveIntensity: 0.9,
  });
  const ZF = 0.66,
    ZR = -0.6,
    R = 0.27;
  // fat knobby tyres: the tyre, a ring of tread blocks and the rim / hub in the bike's colour
  const knobby = (z, w) => {
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, w, 16).rotateZ(Math.PI / 2),
      m('#141414', { roughness: 0.95 })
    );
    t.position.set(0, R, z);
    t.castShadow = true;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2,
        b = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.02, 0.035, 0.05),
          m('#101010', { roughness: 1 })
        );
      b.position.set(0, Math.sin(a) * (R - 0.005), Math.cos(a) * (R - 0.005));
      b.rotation.x = -a;
      t.add(b);
    }
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.6, R * 0.6, w + 0.012, 14).rotateZ(Math.PI / 2),
      rimM
    );
    t.add(rim);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.2, R * 0.2, w + 0.03, 10).rotateZ(Math.PI / 2),
      m('#9aa0a6', { metalness: 0.7, roughness: 0.3 })
    );
    t.add(hub);
    return t;
  };
  const wheels = [knobby(ZF, 0.15), knobby(ZR, 0.17)];
  g.add(...wheels);
  // front: tall upright shield (in the body colour), dark mask with the lamps, high front fender, fork
  g.add(
    panel(
      [
        [0.9, 0.55],
        [0.94, 1.12],
        [0.82, 1.2],
        [0.6, 1.18],
        [0.52, 0.62],
        [0.62, 0.45],
      ],
      0.5,
      body,
      { bevel: 0.03 }
    )
  );
  g.add(
    panel(
      [
        [0.95, 0.78],
        [0.97, 1.1],
        [0.92, 1.12],
        [0.9, 0.78],
      ],
      0.42,
      matte,
      { bevel: 0.01 }
    )
  ); // the mask round the lamps
  if (gd) {
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.04, 18).rotateX(Math.PI / 2),
        hlm
      );
      l.position.set(0.085 * s, 0.98, 0.98);
      g.add(l);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.012, 6, 18),
        m('#8a8f96', { metalness: 0.7, roughness: 0.3 })
      );
      ring.position.set(0.085 * s, 0.98, 0.995);
      g.add(ring);
    }
  } else {
    const big = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.04, 18).rotateX(Math.PI / 2),
      hlm
    );
    big.position.set(0.05, 0.9, 0.98);
    g.add(big);
    const small = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16).rotateX(Math.PI / 2),
      hlm
    );
    small.position.set(-0.03, 1.05, 0.97);
    g.add(small);
  }
  g.add(
    panel(
      [
        [0.62, 1.18],
        [0.86, 1.22],
        [0.94, 1.12],
        [0.6, 1.12],
      ],
      0.48,
      accent,
      { bevel: 0.02 }
    )
  ); // top cover (red on 吱吱's)
  g.add(
    panel(
      [
        [0.98, 0.56],
        [0.92, 0.66],
        [0.52, 0.66],
        [0.46, 0.56],
      ],
      0.22,
      gd ? matte : body,
      { bevel: 0.015 }
    )
  ); // high front fender
  for (const s of [-1, 1]) g.add(tube([0.09 * s, 0.86, 0.58], [0.09 * s, R, ZF], 0.026, matte));
  // floorboard, black lower body, side panels in the body colour, BW'S lettering
  g.add(box(0.42, 0.06, 0.6, matte, 0, 0.38, 0.14));
  g.add(
    panel(
      [
        [0.5, 0.4],
        [0.44, 0.28],
        [-0.2, 0.26],
        [-0.26, 0.42],
      ],
      0.46,
      matte,
      { bevel: 0.02 }
    )
  );
  g.add(
    panel(
      [
        [0.12, 0.44],
        [0.06, 0.74],
        [-0.4, 0.84],
        [-0.86, 0.9],
        [-0.96, 0.84],
        [-0.86, 0.58],
        [-0.4, 0.44],
      ],
      0.46,
      body,
      { bevel: 0.03 }
    )
  );
  g.add(
    panel(
      [
        [0.1, 0.42],
        [-0.5, 0.4],
        [-0.86, 0.56],
        [-0.76, 0.62],
        [-0.4, 0.52],
        [0.08, 0.58],
      ],
      0.48,
      matte,
      { bevel: 0.02 }
    )
  );
  const badge = decalTex(
    (c, w, h) => {
      c.fillStyle = gd ? '#d9dde3' : '#cf1f2b';
      c.font = 'italic 900 66px Arial,sans-serif';
      c.textBaseline = 'middle';
      c.fillText("BW'S", 24, h / 2);
    },
    256,
    96
  );
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.075),
      new THREE.MeshBasicMaterial({ map: badge, transparent: true, depthWrite: false })
    );
    b.position.set(0.245 * s, 0.7, -0.5);
    b.rotation.y = (s * Math.PI) / 2;
    g.add(b);
  }
  // long flat seat and the rear grab rail (a bent tube on 吱吱's, a flat rack on the new one)
  g.add(
    panel(
      [
        [0.14, 0.86],
        [0.08, 0.95],
        [-0.86, 0.97],
        [-0.9, 0.9],
        [0.14, 0.82],
      ],
      0.34,
      seatM,
      { bevel: 0.035 }
    )
  );
  if (gd) {
    g.add(box(0.34, 0.03, 0.34, matte, 0, 0.96, -0.98));
    for (const s of [-1, 1])
      g.add(tube([0.16 * s, 0.9, -0.78], [0.16 * s, 0.96, -1.12], 0.016, matte));
  } else {
    for (const s of [-1, 1])
      g.add(tube([0.19 * s, 0.86, -0.4], [0.19 * s, 1.0, -0.98], 0.016, matte));
    g.add(tube([-0.19, 1.0, -0.98], [0.19, 1.0, -0.98], 0.016, matte));
  }
  // tall flat handlebar on a riser, round mirrors, the speedo pod
  g.add(tube([0, 1.12, 0.6], [0, 1.24, 0.55], 0.03, matte));
  g.add(tube([-0.36, 1.25, 0.52], [0.36, 1.25, 0.52], 0.017, matte));
  g.add(box(0.16, 0.08, 0.1, matte, 0, 1.3, 0.58));
  for (const s of [-1, 1]) {
    g.add(tube([0.26 * s, 1.25, 0.52], [0.3 * s, 1.5, 0.5], 0.009, matte));
    const mir = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14).rotateX(Math.PI / 2),
      matte
    );
    mir.position.set(0.31 * s, 1.53, 0.5);
    g.add(mir);
    g.add(
      box(
        0.04,
        0.03,
        0.03,
        m('#ffb000', { emissive: '#ff9000', emissiveIntensity: 0.5 }),
        0.17 * s,
        1.0,
        0.95
      )
    );
  }
  // engine / CVT case on the right (-x), exhaust, rear shocks (red on 吱吱's), hugger with the plate, tail lamp
  g.add(
    box(0.16, 0.24, 0.6, m('#2a2c30', { metalness: 0.45, roughness: 0.45 }), -0.17, 0.36, -0.42)
  );
  g.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, 0.42, 12).rotateX(Math.PI / 2 - 0.25),
      matte
    )
      .translateX(-0.21)
      .translateY(0.42)
      .translateZ(-0.82)
  );
  for (const s of [-1, 1])
    g.add(tube([0.13 * s, 0.36, -0.6], [0.13 * s, 0.72, -0.74], 0.024, shockM));
  g.add(box(0.06, 0.18, 0.2, matte, 0, 0.62, -1.02));
  g.add(box(0.16, 0.05, 0.05, tlm, 0, 0.84, -1.0));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.09),
    new THREE.MeshBasicMaterial({ map: plateTex(gd ? 'GDN-125' : 'ZZW-168') })
  );
  plate.position.set(0, 0.58, -1.13);
  plate.rotation.y = Math.PI;
  g.add(plate);
  g.userData.wheels = wheels;
  return g;
}

const SCOOTER_COLORS = [
  '#e8e8e8',
  '#c1121f',
  '#1d3557',
  '#ffb703',
  '#2a9d8f',
  '#111111',
  '#8ecae6',
  '#f28482',
  '#7b8a8b',
];
const CAR_COLORS = [
  '#f0f0f0',
  '#222222',
  '#9aa3ab',
  '#b5121b',
  '#1e3a8a',
  '#6b7280',
  '#d1d5db',
  '#14532d',
];

let VID = 0;
// two things more than this far apart in height are on different levels (the underpass and
// the street over it, a viaduct deck and the road under it): they never touch or hit each other
export const SAME_LEVEL = 2.5;
export const sameLevel = (ya, yb) => Math.abs(ya - yb) < SAME_LEVEL;

// Vehicle body for contacts: a capsule along the heading (centre segment +-(hl - hw), radius hw)
// fitted to the mesh (scooter 0.8 x 1.8 m, car 1.9 x 4.4 m). v.radius stays the bounding circle
// the AI look-ahead uses. bodySeg: [ax, az, bx, bz] of the centre segment.
export function bodySeg(v) {
  const f = v.hl - v.hw,
    fx = Math.sin(v.heading) * f,
    fz = Math.cos(v.heading) * f;
  return [v.pos.x + fx, v.pos.z + fz, v.pos.x - fx, v.pos.z - fz];
}
const closestOn = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax,
    dz = bz - az,
    l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return [ax + dx * t, az + dz * t];
};
// gap between point (x,z) and the body surface (< 0: inside), and the body point nearest it
export function bodyGap(v, x, z) {
  const s = bodySeg(v),
    q = closestOn(x, z, ...s);
  return { gap: Math.hypot(x - q[0], z - q[1]) - v.hw, qx: q[0], qz: q[1] };
}
// closest points of two segments (a0-a1, b0-b1): [pa, pb]
function segSeg(a, b) {
  let best = null,
    bd = Infinity;
  const tryP = (pa, pb) => {
    const d = (pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = [pa, pb];
    }
  };
  tryP([a[0], a[1]], closestOn(a[0], a[1], ...b));
  tryP([a[2], a[3]], closestOn(a[2], a[3], ...b));
  tryP(closestOn(b[0], b[1], ...a), [b[0], b[1]]);
  tryP(closestOn(b[2], b[3], ...a), [b[2], b[3]]);
  // crossing segments
  const dx = a[2] - a[0],
    dz = a[3] - a[1],
    ex = b[2] - b[0],
    ez = b[3] - b[1],
    cr = dx * ez - dz * ex;
  if (Math.abs(cr) > 1e-9) {
    const t = ((b[0] - a[0]) * ez - (b[1] - a[1]) * ex) / cr,
      u = ((b[0] - a[0]) * dz - (b[1] - a[1]) * dx) / cr;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const p = [a[0] + dx * t, a[1] + dz * t];
      tryP(p, p);
    }
  }
  return best;
}
// crash thresholds (m/s of speed into the obstacle): above STOP the vehicle stops dead,
// above THROW a scooter rider is thrown off (src/core/VehicleSpawner.js)
export const CRASH_STOP = 4,
  CRASH_THROW = 7.5;
// Minimum normal closing speed (m/s) before consulting Newtonian impulse/static-friction solver (ImpactPhysics.js)
export const KNOCK_MIN = 0.85;

// ---------- far LOD: one merged, vertex-coloured mesh per vehicle beyond ~30 m ----------
// A parked commuter scooter is ~26 meshes (draw calls, x2 with shadows); 150+ vehicles stand around the map.
// Up close the original parts are drawn unchanged; far away they are hidden and one baked copy is drawn instead.
//
// RULES FOR ADDING VEHICLES / PARTS (multi-developer safety):
// - A builder just returns a Group of meshes, as now; the far copy is made automatically.
// - A part that moves or toggles on its own after construction (door, indicator, handlebar ...) must be marked
//   `part.userData.dynamic = true`, or be stored in the root's userData (`g.userData.door = door`), which marks
//   it automatically. Dynamic parts keep updating their matrix, are left out of the far copy and stay drawn.
// - Wheels (root.userData.wheels) are the exception: they turn in sync() and are baked into the far copy.
// - Forgot to mark one? lodCheck() notices within ~0.5 s that an unmarked part moved / toggled, makes it update
//   normally again, turns the far copy off for that vehicle and logs a warning — nothing silently breaks.
// - Children added to v.mesh after construction (riders, labels) are never touched.
const LOD_FAR = 32,
  LOD_NEAR = 28; // m from the camera, with hysteresis
const LOD_TINY = 0.045; // parts smaller than this (bounding radius, m) are left out of the far copy
const farMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.55,
  metalness: 0.1,
});
const FAR_GEO = new Map(); // shape + colour signature -> geometry, shared by every identical model + colour
const _wm = new THREE.Matrix4();
// content key of a geometry (many builders make a fresh BoxGeometry per vehicle, so the uuid never repeats)
const GKEY = new WeakMap();
function geoKey(g) {
  let k = GKEY.get(g);
  if (k) return k;
  let h = 2166136261 >>> 0;
  const mix = (arr) => {
    const u = new Uint32Array(arr.buffer, arr.byteOffset, (arr.byteLength / 4) | 0);
    for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619) >>> 0;
  };
  mix(g.attributes.position.array);
  if (g.index)
    mix(
      g.index.array instanceof Uint16Array
        ? new Uint32Array(Uint32Array.from(g.index.array))
        : g.index.array
    );
  k = `${h.toString(36)}:${g.attributes.position.count}`;
  GKEY.set(g, k);
  return k;
}
function partColour(mat) {
  if (mat.emissive && mat.emissiveIntensity > 0.5 && mat.emissive.getHex()) return mat.emissive; // lamps
  return mat.map ? DARK : mat.color; // textured parts (plates, decals): a neutral dark tone
}
const DARK = new THREE.Color('#1c1c1e');
// Shape and colour are cached separately: identical models share one position/normal buffer (also on the GPU)
// and each colour variant only adds a small Uint8 colour attribute (9 scooter colours ~ 1 shape + 9 x 0.1 MB).
const FAR_SHAPE = new Map(); // shape signature -> { position, normal, counts, sphere }
function farGeometry(root, parts) {
  const inv = _wm.copy(root.matrixWorld).invert();
  const rel = parts.map((o) => new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
  let shapeSig = '',
    colSig = '';
  for (let i = 0; i < parts.length; i++) {
    shapeSig += `${geoKey(parts[i].geometry) + rel[i].elements.map((v) => v.toFixed(3)).join(',')};`;
    colSig += partColour(parts[i].material).getHexString();
  }
  const key = `${shapeSig}|${colSig}`;
  if (FAR_GEO.has(key)) return FAR_GEO.get(key);
  let shape = FAR_SHAPE.get(shapeSig);
  if (!shape) {
    const geos = [];
    for (let i = 0; i < parts.length; i++) {
      const src = parts[i].geometry,
        m = rel[i];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', src.attributes.position.clone());
      if (src.attributes.normal) g.setAttribute('normal', src.attributes.normal.clone());
      if (src.index) g.setIndex(src.index.clone());
      const n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.normal) n.computeVertexNormals();
      n.applyMatrix4(m);
      if (m.determinant() < 0) {
        // mirrored part: restore the triangle winding (front faces)
        for (const k of ['position', 'normal']) {
          const a = n.attributes[k].array;
          for (let j = 0; j < a.length; j += 9)
            for (let c = 0; c < 3; c++) {
              const t = a[j + 3 + c];
              a[j + 3 + c] = a[j + 6 + c];
              a[j + 6 + c] = t;
            }
        }
      }
      geos.push(n);
    }
    const merged = geos.length ? mergeGeometries(geos) : null;
    if (!merged) {
      FAR_GEO.set(key, null);
      return null;
    }
    merged.computeBoundingSphere();
    shape = {
      position: merged.attributes.position,
      normal: merged.attributes.normal,
      counts: geos.map((g) => g.attributes.position.count),
      sphere: merged.boundingSphere,
    };
    FAR_SHAPE.set(shapeSig, shape);
  }
  const col = new Uint8Array(shape.position.count * 3);
  let o = 0;
  for (let i = 0; i < parts.length; i++) {
    const c = partColour(parts[i].material),
      r = Math.round(c.r * 255),
      g = Math.round(c.g * 255),
      b = Math.round(c.b * 255);
    for (let j = 0; j < shape.counts[i]; j++, o += 3) {
      col[o] = r;
      col[o + 1] = g;
      col[o + 2] = b;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', shape.position);
  geo.setAttribute('normal', shape.normal);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  geo.boundingSphere = shape.sphere.clone();
  FAR_GEO.set(key, geo);
  return geo;
}
let lodWarned = 0;
const snap = (o) => ({
  p: o.position.clone(),
  q: o.quaternion.clone(),
  s: o.scale.clone(),
  v: o.visible,
});
const moved = (o, s) =>
  !o.position.equals(s.p) || !o.quaternion.equals(s.q) || !o.scale.equals(s.s);

export class Vehicle {
  static knock = null; // see KNOCK_MIN
  // Vehicle.onRide(v, on): set by src/core/Game.js; src/entities/Player.js calls it when the player gets on (true) / off (false).
  // With physics it gives the ridden vehicle a dynamic body (src/physics/VehPhysics.js Chassis, this.body) and takes it
  // away again. While this.body exists the body moves the vehicle: drive() is not called, pos / heading /
  // speed are written back from the body every frame, and code that changes speed or pos (a pedestrian hit,
  // race barriers) keeps working: the body picks those changes up (Chassis.latch).
  static onRide = null;
  static knockTraffic = null; // (o, by, nx, nz, closing speed): src/core/VehicleSpawner.js throws a traffic vehicle hit hard (physics)
  constructor(kind, rnd = Math.random, opt = {}) {
    this.id = VID++;
    this.kind = kind;
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    if (kind === 'scooter' && opt.model === 'zmax') {
      // 漢克的 ZMAX (src/entities/npcs/Hank.js): a 155cc maxi-scooter, a bit quicker and longer than a commuter
      this.mesh = buildZmax();
      this.model = 'zmax';
      Object.assign(this, {
        wb: 1.34,
        radius: 0.8,
        hl: 1.05,
        hw: 0.38,
        maxSpeed: 25,
        accel: 11,
        brake: 18,
        turn: 2.5,
        grip: 9,
        seat: new THREE.Vector3(0, 0.1, -0.3),
        exitSide: 1.0,
        label: '漢克的 ZMAX',
      });
    } else if (kind === 'scooter' && (opt.model === 'bws_gd' || opt.model === 'bws_zz')) {
      // 女拳大帝／吱吱的 BW'S (src/entities/npcs/Zz.js)
      const gd = opt.model === 'bws_gd';
      this.mesh = buildBws(gd ? 'gd' : 'zz');
      this.model = opt.model;
      Object.assign(this, {
        wb: 1.26,
        radius: 0.76,
        hl: 0.95,
        hw: 0.37,
        maxSpeed: 21,
        accel: 10,
        brake: 18,
        turn: 2.6,
        grip: 9,
        seat: new THREE.Vector3(0, 0.08, -0.32),
        exitSide: 1.0,
        label: gd ? "女拳大帝的 BW'S" : "吱吱的 BW'S",
      });
    } else if (kind === 'scooter' && BIKES[opt.model]) {
      // 重機 (big bike): handled like a scooter, faster, longer, the rider sits higher
      const B = BIKES[opt.model];
      this.mesh = buildBike(opt.model, opt.color || pick(B.colors)); // opt.color: someone's own bike (霍華德's black one)
      this.model = opt.model;
      Object.assign(this, {
        wb: 1.46,
        radius: 0.85,
        hl: 1.02,
        hw: 0.4,
        maxSpeed: 36,
        accel: 14,
        brake: 20,
        turn: 2.3,
        grip: 9.5,
        seat: new THREE.Vector3(0, 0.2, -0.32),
        exitSide: 1.1,
        label: B.name,
      });
    } else if (kind === 'scooter') {
      this.mesh = opt.jet ? buildJetSL() : buildCommuter(opt.color || pick(SCOOTER_COLORS)); // traffic / parked: detailed commuter (src/entities/Scooters.js)
      Object.assign(this, {
        wb: 1.25,
        radius: 0.75,
        hl: 0.92,
        hw: 0.36,
        maxSpeed: opt.jet ? 22 : 19,
        accel: opt.jet ? 10.5 : 9,
        brake: 18,
        turn: 2.6,
        grip: 9,
        seat: opt.jet ? new THREE.Vector3(0, 0.08, -0.3) : new THREE.Vector3(0, 0.09, -0.29),
        exitSide: 1.0,
        label: opt.jet ? '我的 SYM JET SL' : '機車',
        jet: !!opt.jet,
      });
    } else if (SUPERCARS[opt.model]) {
      // 超跑: a car, much quicker, a little wider and lower
      const C = SUPERCARS[opt.model];
      this.mesh = buildSupercar(opt.model, opt.color || pick(C.colors));
      this.model = opt.model; // opt.color: 劍玉's own cars (src/entities/npcs/Jianyu.js)
      Object.assign(this, {
        wb: 2.66,
        radius: 1.38,
        hl: 2.28,
        hw: 0.98,
        maxSpeed: 46,
        accel: 15,
        brake: 22,
        turn: 1.8,
        grip: 7.5,
        seat: new THREE.Vector3(0.38, 0.0, -0.35),
        exitSide: 2.0,
        label: `超跑・${C.name}`,
      });
    } else {
      const taxi = kind === 'taxi';
      this.mesh = buildCar(taxi ? '#ffd000' : opt.color || pick(CAR_COLORS), taxi);
      Object.assign(this, {
        wb: 2.7,
        radius: 1.35,
        hl: 2.2,
        hw: 0.92,
        maxSpeed: 30,
        accel: 8,
        brake: 16,
        turn: 1.7,
        grip: 6,
        seat: new THREE.Vector3(0.38, 0.12, -0.2),
        exitSide: 2.0,
        label: taxi ? '計程車' : '汽車',
      });
    }
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.moveAng = 0;
    this.speed = 0;
    this.steer = 0;
    this.lean = 0;
    this.pitch = 0;
    this.mesh.rotation.order = 'YXZ'; // yaw, then pitch, then lean
    this.driver = null; // 'player' | 'ai' | null
    this.ai = null;
    this.bumpCooldown = 0;
    this.wheelRot = 0;
    this.mesh.traverse((o) => {
      if (o.isMesh) {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        o.castShadow = o.userData.shadow ?? o.geometry.boundingSphere.radius > 0.4;
      }
    });
    this._lodInit();
    // static parts never move inside the vehicle and the body / wheels only move in sync(), so three.js need
    // not recompose dozens of part matrices per vehicle every frame (100+ parked vehicles): matrices are
    // refreshed in sync() (and src/systems/minigames/Airdrop.js) instead. Dynamic parts, riders and labels added later stay automatic.
    this.mesh.traverse((o) => {
      if (this._dyn.has(o)) return;
      o.updateMatrix();
      o.matrixAutoUpdate = false;
    });
  }
  // see the far LOD rules above the class
  _lodInit() {
    const root = this.mesh,
      wheels = new Set(root.userData.wheels || []);
    // dynamic: marked parts and parts the builder kept a reference to (other than the wheels), with their subtrees
    const dyn = (this._dyn = new Set());
    const refs = new Set();
    for (const [k, v] of Object.entries(root.userData))
      if (k !== 'wheels') for (const o of [v].flat()) if (o && o.isObject3D) refs.add(o);
    root.traverse((o) => {
      if (o !== root && (o.userData.dynamic || refs.has(o) || (o.parent && dyn.has(o.parent))))
        dyn.add(o);
    });
    root.updateMatrixWorld(true);
    const near = [],
      bake = [];
    root.traverse((o) => {
      if (!o.isMesh || dyn.has(o) || !o.visible) return;
      near.push(o);
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
      if (!Array.isArray(o.material) && !o.material.transparent && r >= LOD_TINY) bake.push(o);
    });
    const geo = near.length > 2 ? farGeometry(root, bake) : null;
    if (!geo) {
      this._lod = null;
      return;
    }
    const far = new THREE.Mesh(geo, farMat);
    far.castShadow = true;
    far.visible = false;
    far.userData.lodFar = true;
    root.add(far);
    // change detection: every drawn part except the wheel nodes themselves (they turn in sync())
    this._lod = {
      near,
      far,
      isFar: false,
      snaps: new Map(near.map((o) => [o, snap(o)])),
      skip: wheels,
    };
  }
  // dist: camera distance (m); called a few times a second for every vehicle (src/core/GameLoop.js vehicleLod)
  lod(dist) {
    const L = this._lod;
    if (!L) return;
    if (!L.isFar) this.lodCheck();
    if (!this._lod) return;
    const far = L.isFar ? dist > LOD_NEAR : dist > LOD_FAR;
    if (far === L.isFar) return;
    L.isFar = far;
    L.far.visible = far;
    for (const o of L.near) o.visible = far ? false : L.snaps.get(o).v;
  }
  // an unmarked part changed after construction: let it update normally and drop the far copy for this vehicle
  lodCheck() {
    const L = this._lod;
    if (!L) return;
    for (const o of L.near) {
      const s = L.snaps.get(o);
      if (o.visible === s.v && (L.skip.has(o) || !moved(o, s))) continue;
      if (lodWarned++ < 5)
        console.warn(
          `[vehicles] 「${this.label}」的零件 ${o.name || o.geometry?.type || ''} 在建好之後被移動或切換顯示，但沒有標記成會動的零件。已自動改回逐格更新，並關閉這台車的遠處簡化模型。請在建模時設定 part.userData.dynamic = true（src/entities/Vehicles.js 檔頭有說明）。`
        );
      // back to the plain behaviour for the whole vehicle: every part updates its own matrix, no far copy
      this.mesh.remove(L.far);
      this._lod = null;
      this.mesh.traverse((c) => {
        if (c !== this.mesh) c.matrixAutoUpdate = true;
      });
      return;
    }
  }
  get lodFar() {
    return !!this._lod?.isFar;
  }
  place(x, z, h) {
    this.pos.set(x, 0, z);
    this.heading = this.moveAng = h;
    this.speed = 0;
    this.hf = this.hb = undefined;
    this.up = 0;
    if (this.body) this.body.teleport(x, z, h);
    else this.sync();
  }
  forward() {
    return [Math.sin(this.heading), Math.cos(this.heading)];
  }
  sync(dt = 0) {
    if (this.knocked) return; // thrown by physics (Vehicle.knock): the physics body places the mesh
    // pos stays on the 2D plane (y = 0); the mesh sits on the ground under both
    // wheels and pitches with it (visual only, handling is unchanged)
    const fx = (Math.sin(this.heading) * this.wb) / 2,
      fz = (Math.cos(this.heading) * this.wb) / 2;
    // each wheel stays on the level it was on (viaduct deck / street below it, src/world/Terrain.js)
    const hf = (this.hf = surfaceAt(this.pos.x + fx, this.pos.z + fz, this.hf)),
      hb = (this.hb = surfaceAt(this.pos.x - fx, this.pos.z - fz, this.hb));
    const up = this.up || 0; // parked on an interior floor above the ground (src/entities/Player.js exit)
    this._pose(dt, hf + up, hb + up, (hf + hb) / 2 + up);
  }
  // the mesh from pos / heading / steer / speed and the ground under the front and back wheel (y: height of
  // the mesh origin, normally (hf + hb) / 2): pitch with the ground, scooter lean, wheels
  _pose(dt, hf, hb, y) {
    const pt = -Math.atan2(hf - hb, this.wb);
    this.pitch = dt > 0 ? this.pitch + (pt - this.pitch) * Math.min(1, dt * 10) : pt;
    this.mesh.position.set(this.pos.x, y, this.pos.z);
    this.mesh.rotation.set(this.pitch, this.heading, 0);
    if (this.fallen)
      this.mesh.rotation.z = 1.32; // dropped after a crash, lying on its side until ridden again
    else if (this.kind === 'scooter') {
      const targetLean = -this.steer * Math.min(1, Math.abs(this.speed) / 10) * 0.35;
      this.lean += (targetLean - this.lean) * Math.min(1, dt * 6);
      this.mesh.rotation.z = this.lean;
    }
    this.wheelRot += (this.speed * dt) / 0.3;
    for (const w of this.mesh.userData.wheels) {
      w.rotation.x = this.wheelRot;
      w.updateMatrix();
    }
    this.mesh.updateMatrix(); // matrixAutoUpdate is off (constructor)
  }
  // push the body (a row of circles along the capsule, radius hw) out of walls, trees, buildings
  resolveBody(collision) {
    const f = this.hl - this.hw,
      n = Math.max(1, Math.ceil((2 * f) / (this.hw * 1.2)));
    const sx = Math.sin(this.heading),
      sz = Math.cos(this.heading);
    let hit = false,
      nx = 0,
      nz = 0;
    for (let it = 0; it < 2; it++)
      for (let k = 0; k <= n; k++) {
        const o = -f + (2 * f * k) / n,
          c = { x: this.pos.x + sx * o, z: this.pos.z + sz * o },
          cx = c.x,
          cz = c.z;
        const r = collision.resolve(c, this.hw, 0, this.mesh.position.y);
        if (r.hit) {
          hit = true;
          nx += r.nx;
          nz += r.nz;
          this.pos.x += c.x - cx;
          this.pos.z += c.z - cz;
        }
      }
    const l = Math.hypot(nx, nz) || 1;
    return { hit, nx: nx / l, nz: nz / l };
  }
  // player driving physics. inp: {throttle(-1..1), steer(-1..1), handbrake}
  drive(dt, inp, collision, others, onBump) {
    this._intent(dt, inp);
    const dx = Math.sin(this.moveAng) * this.speed * dt,
      dz = Math.cos(this.moveAng) * this.speed * dt;
    // substeps against tunnelling
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (this.hw * 0.5)));
    let hitN = null;
    const v0 = this.speed;
    for (let i = 0; i < steps; i++) {
      this.pos.x += dx / steps;
      this.pos.z += dz / steps;
      const r = this.resolveBody(collision);
      if (r.hit) hitN = r;
    }
    this.bumpCooldown -= dt;
    this.crash = null;
    if (hitN) {
      const fx = Math.sin(this.moveAng),
        fz = Math.cos(this.moveAng);
      this.hitWall(-(fx * hitN.nx + fz * hitN.nz) * v0, hitN.nx, hitN.nz, v0, onBump);
    }
    // vehicle-vehicle
    for (const o of others) {
      if (o === this || !sameLevel(this.mesh.position.y, o.mesh.position.y)) continue;
      if (
        Math.abs(this.pos.x - o.pos.x) > this.hl + o.hl ||
        Math.abs(this.pos.z - o.pos.z) > this.hl + o.hl
      )
        continue;
      // body against body (capsules), pushed apart along the line between the nearest points
      const [pa, pb] = segSeg(bodySeg(this), bodySeg(o));
      let ddx = pa[0] - pb[0],
        ddz = pa[1] - pb[1],
        dd = Math.hypot(ddx, ddz);
      const rr = this.hw + o.hw;
      if (dd < rr) {
        if (dd < 1e-4) {
          ddx = this.pos.x - o.pos.x;
          ddz = this.pos.z - o.pos.z;
          dd = Math.hypot(ddx, ddz) || 1;
        }
        const nx = ddx / dd,
          nz = ddz / dd,
          push = rr - Math.min(dd, rr);
        const fx = Math.sin(this.moveAng),
          fz = Math.cos(this.moveAng),
          impact = -(fx * nx + fz * nz) * v0;
        const kf = this._knockKf(o, nx, nz, impact);
        if (kf !== null) {
          this.pos.x += nx * push;
          this.pos.z += nz * push;
        } else {
          this.pos.x += nx * push * 0.7;
          this.pos.z += nz * push * 0.7;
          o.pos.x -= nx * push * 0.3;
          o.pos.z -= nz * push * 0.3;
          if (!o.ai || o.ai.wreck > 0) o.resolveBody(collision); // parked cars / your scooter / a wreck: don't shove them into walls (AI cars snap back to their lane)
          o.sync();
        }
        // closing speed against o's own motion (whether traffic is thrown): impact + o's velocity toward you
        const [ofx, ofz] = o.forward();
        this._hitVehicle(
          o,
          kf,
          impact,
          nx,
          nz,
          v0,
          onBump,
          Math.abs(this.speed),
          impact + (ofx * nx + ofz * nz) * (o.speed || 0)
        );
      }
    }
    this.sync(dt);
  }
  // speed, steering, heading and drift from the input (the arcade handling; with a physics body the body is
  // driven toward this, src/physics/VehPhysics.js)
  _intent(dt, inp) {
    const thr = inp.throttle,
      hb = inp.handbrake;
    if (thr > 0)
      this.speed +=
        (this.speed < 0
          ? this.brake
          : this.accel * (1 - (Math.max(0, this.speed) / this.maxSpeed) * 0.6)) *
        thr *
        dt;
    else if (thr < 0) {
      if (this.speed > 0.5) this.speed -= this.brake * dt;
      else this.speed = Math.max(-6, this.speed - this.accel * 0.6 * dt);
    } else
      this.speed -=
        Math.sign(this.speed) *
        Math.min(Math.abs(this.speed), (1.5 + Math.abs(this.speed) * 0.08) * dt);
    if (hb) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 7 * dt);
    this.speed = Math.max(-6, Math.min(this.maxSpeed, this.speed));
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 8);
    const sp = Math.abs(this.speed);
    const f = Math.min(1, sp / 4) * (1 - 0.45 * Math.min(1, sp / this.maxSpeed));
    const turnRate = this.steer * this.turn * f * (hb ? 1.7 : 1);
    this.heading += turnRate * dt * Math.sign(this.speed || 1);
    // drift: movement direction lags heading
    let d = this.heading - this.moveAng;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const grip = hb ? 1.6 : this.grip;
    this.moveAng += d * Math.min(1, grip * dt);
    this.drifting = hb && sp > 6 && Math.abs(d) > 0.2;
  }
  // hit a wall / tree / building at impact m/s into it (n: away from it, v0: speed before): stop dead, slow
  // down or scrape along; bumps and the scooter crash (rider thrown off, src/core/VehicleSpawner.js)
  hitWall(impact, nx, nz, v0, onBump) {
    if (impact > CRASH_STOP)
      this.speed = 0; // head into a wall / tree: dead stop
    else if (impact > 2) this.speed *= 0.35;
    else this.speed *= 0.97;
    if (impact > 2 && this.bumpCooldown <= 0) {
      onBump && onBump(impact);
      this.bumpCooldown = 0.4;
    }
    if (impact > CRASH_THROW) this.crash = { impact, speed: Math.abs(v0), nx, nz };
  }
  // hitting vehicle o: a parked one hit hard is thrown by physics (src/core/VehicleSpawner.js knockVehicle), one already flying
  // only pushes you back. Returns kf (your speed is multiplied by it, momentum) or null (the usual push)
  _knockKf(o, nx, nz, impact) {
    const parked = !o.ai && !o.driver && !o.racer && !o.knocked;
    if (o.knocked) return 0.85;
    if (parked && impact > KNOCK_MIN && Vehicle.knock)
      return Vehicle.knock(o, this, nx, nz, impact) || null;
    return null;
  }
  // your speed, bump and crash after hitting vehicle o (kf from _knockKf); traffic gets stunned, or thrown
  // when hit hard (Vehicle.knockTraffic, src/core/Game.js). bs: your speed for the bump, rel: the closing speed of
  // the two (impact counts your own motion only). pre: your velocity before the hit { vx, vz, ang }.
  // When the solver gives your Δv (dv1, src/physics/ImpactPhysics.js: J / m1 along the contact normal n, which
  // points from o toward you) the velocity after the hit is pre + n * dv1: hitting slower traffic from behind
  // takes dv1 off your speed, being rear-ended adds it, a T-bone shoves you sideways by dv1 (Newton's 3rd law,
  // masses from VEHICLE_PHYS). Without dv1 (o did not move: a parked car held by its handbrake) o is a barrier.
  _hitVehicle(o, kf, impact, nx, nz, v0, onBump, bs, rel, pre = null) {
    const hitSpd = Math.max(bs, impact);
    if (hitSpd > 2.0 && this.bumpCooldown <= 0) {
      onBump && onBump(hitSpd);
      this.bumpCooldown = 0.45;
    }
    const ang = pre?.ang ?? this.moveAng,
      pvx = pre ? pre.vx : Math.sin(ang) * v0,
      pvz = pre ? pre.vz : Math.cos(ang) * v0;
    // your own motion into o: small next to the closing speed when it is o that ran into you
    const ownIn = -(pvx * nx + pvz * nz);
    const pushed = ownIn < Math.max(rel ?? impact, impact) * 0.5;
    let eject = false,
      dv1 = null;
    if (o.ai) {
      o.ai.stunned = 2;
      const res = Vehicle.knockTraffic?.(o, this, nx, nz, rel ?? impact);
      if (res && typeof res === 'object') {
        if (typeof res.kf === 'number') kf = res.kf;
        if (typeof res.dv1 === 'number') dv1 = res.dv1;
        if (res.eject) eject = true;
      } else if (typeof res === 'number') kf = res;
    }
    if (kf && typeof kf === 'object') {
      if (kf.eject) eject = true;
      if (typeof kf.dv1 === 'number') dv1 = kf.dv1;
      kf = kf.kf ?? null;
    }
    if (dv1 !== null) {
      const vx = pvx + nx * dv1,
        vz = pvz + nz * dv1;
      this.speed = vx * Math.sin(ang) + vz * Math.cos(ang);
      if (this.body) this._hitVel = { x: vx, z: vz, ang };
    } else if (kf !== null) this.speed = Math.abs(v0) > 0.01 ? v0 * kf : this.speed * kf;
    else if (!pushed) this.speed = impact > CRASH_STOP ? 0 : this.speed * 0.6;
    const hard = dv1 !== null ? dv1 > 0.45 * impact : kf === null || kf < 0.55;
    if (!this.crash && (eject || (impact > CRASH_THROW && hard)))
      this.crash = { impact, speed: Math.abs(v0), nx, nz, pushed, dv1: dv1 ?? undefined };
  }
}
