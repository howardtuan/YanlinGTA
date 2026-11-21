import * as THREE from 'three';
import { surfaceAt } from './terrain.js';
import { buildScooter as buildCommuter } from './scooters.js';

const MC = {};
const m = (c, o = {}) => { const k = c + JSON.stringify(o); return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o })); };
const box = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.castShadow = true; return o; };
const GW = {};
function wheel(r, w, x, y, z) {
  const k = r + '_' + w;
  const g = GW[k] || (GW[k] = new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2));
  const o = new THREE.Mesh(g, m('#1a1a1a', { roughness: 0.9 })); o.position.set(x, y, z); o.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.01, 10).rotateZ(Math.PI / 2), m('#9aa0a6', { metalness: 0.7, roughness: 0.3 }));
  o.add(hub);
  return o;
}

function plateTex(text, bg = '#fff', fg = '#111') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 256, 96); g.fillStyle = fg;
  // shrink the font until the whole number fits (e.g. PYL0803)
  let fs = 64; g.font = `900 ${fs}px system-ui`; while (g.measureText(text).width > 232 && fs > 20) { fs -= 2; g.font = `900 ${fs}px system-ui`; }
  g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 248, 88);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildScooter(color) {
  const g = new THREE.Group();
  const body = m(color, { roughness: 0.35, metalness: 0.2 });
  const dark = m('#222', { roughness: 0.7 });
  const wheels = [wheel(0.27, 0.12, 0, 0.27, 0.62), wheel(0.27, 0.13, 0, 0.27, -0.6)];
  g.add(...wheels);
  g.add(box(0.36, 0.1, 0.8, dark, 0, 0.32, 0.05)); // floorboard
  const rear = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.5, 4, 10).rotateX(Math.PI / 2), body);
  rear.scale.set(1, 0.9, 1); rear.position.set(0, 0.55, -0.42); rear.castShadow = true; g.add(rear);
  g.add(box(0.3, 0.1, 0.62, m('#151515', { roughness: 0.9 }), 0, 0.75, -0.36)); // seat
  const shield = box(0.44, 0.75, 0.14, body, 0, 0.72, 0.5); shield.rotation.x = -0.25; g.add(shield);
  const stem = box(0.08, 0.5, 0.08, dark, 0, 1.0, 0.56); stem.rotation.x = -0.25; g.add(stem);
  g.add(box(0.62, 0.05, 0.05, dark, 0, 1.22, 0.5)); // handlebar
  g.add(box(0.26, 0.14, 0.12, body, 0, 1.2, 0.56)); // headset
  const hl = box(0.16, 0.08, 0.04, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6d0', emissiveIntensity: 1 }), 0, 1.2, 0.63); g.add(hl);
  g.add(box(0.2, 0.06, 0.04, new THREE.MeshStandardMaterial({ color: '#900', emissive: '#ff2020', emissiveIntensity: 0.6 }), 0, 0.62, -0.92));
  const fender = box(0.18, 0.06, 0.4, body, 0, 0.56, 0.66); g.add(fender);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.09), new THREE.MeshBasicMaterial({ map: plateTex('MAN-34') }));
  plate.position.set(0, 0.48, -0.93); plate.rotation.y = Math.PI; g.add(plate);
  g.userData.wheels = wheels;
  return g;
}


// SYM JET SL 125 (極地白): white / dark-grey angular bodywork with red pinstripes, black split-spoke
// wheels, petal front disc, red-stitched black seat, pink rear hugger. Modelled from side and 3/4
// reference photos; profiles below are in metres (z forward, y up, ground 0), scaled 1.08 to the
// game's rider. Right side of the bike is -x (exhaust), left side +x (air box, front disc).
function sideShape(pts) { const sh = new THREE.Shape(); pts.forEach(([z, y], i) => i ? sh.lineTo(-z, y) : sh.moveTo(-z, y)); sh.closePath(); return sh; }
// extrude a side profile [[z,y]..] across x (centred); taper(z,y) scales x so panels narrow / flare
function panel(pts, width, mat, { taper = null, bevel = 0.02, x = 0 } = {}) {
  const g = new THREE.ExtrudeGeometry(sideShape(pts), { depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateY(Math.PI / 2); g.translate(-width / 2, 0, 0);
  if (taper) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * taper(p.getZ(i), p.getY(i)));
    g.computeVertexNormals();
  }
  const o = new THREE.Mesh(g, mat); o.position.x = x; o.castShadow = true; return o;
}
function decalTex(draw, w = 256, h = 96) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const PM = {};
const paint = (c, o = {}) => { const k = c + JSON.stringify(o); return PM[k] || (PM[k] = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, ...o })); };
// tube between two points
function tube(a, b, r, mat, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg); g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z);
  const o = new THREE.Mesh(g, mat); o.castShadow = true; return o;
}
// coil spring along a -> b
function spring(a, b, r, turns, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const pts = []; for (let i = 0; i <= turns * 12; i++) { const t = i / (turns * 12), an = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(an) * r, t * len, Math.sin(an) * r)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 12, r * 0.18, 5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z);
  return new THREE.Mesh(g, mat);
}
// 12" wheel: rounded tyre, black rim, five split spokes, optional petal disc (left side); axis = x
function jetWheel(R, w, disc) {
  const g = new THREE.Group();
  const prof = []; const ri = R * 0.66;
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI; prof.push(new THREE.Vector2(ri + (R - ri) * (0.55 + 0.45 * Math.cos(a)) + (i === 0 || i === 10 ? 0 : 0), Math.sin(a) * w / 2)); }
  prof[0].x = ri; prof[10].x = ri;
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(prof, 28).rotateZ(Math.PI / 2), m('#141414', { roughness: 0.92 }));
  g.add(tyre);
  const rimM = m('#121214', { roughness: 0.35, metalness: 0.4 }), edgeM = m('#c9ccd0', { roughness: 0.25, metalness: 0.9 });
  // rim barrel is an open cylinder: render both sides so its inside shows between the spokes (no see-through wheel)
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, w * 0.8, 28, 1, true).rotateZ(Math.PI / 2), m('#121214', { roughness: 0.35, metalness: 0.4, side: THREE.DoubleSide })));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(ri - 0.006, 0.006, 6, 28).rotateY(Math.PI / 2), edgeM);
  for (const s of [-1, 1]) { const l = lip.clone(); l.position.x = s * w * 0.38; g.add(l); }
  for (let k = 0; k < 5; k++) for (const o of [-0.09, 0.09]) {
    const a = k / 5 * Math.PI * 2 + o, sp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, ri * 0.92, 0.022), rimM);
    sp.geometry.translate(0, ri * 0.46, 0); sp.rotation.x = a; g.add(sp);
  }
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.2, R * 0.2, w * 0.9, 14).rotateZ(Math.PI / 2), m('#2a2b2e', { metalness: 0.6, roughness: 0.4 })));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.07, R * 0.07, w * 1.15, 10).rotateZ(Math.PI / 2), edgeM));
  if (disc) {
    // wave (petal) rotor with drilled slots
    const sh = new THREE.Shape(), N = 48, rO = R * 0.52;
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = rO * (1 - 0.06 * (0.5 + 0.5 * Math.cos(a * 12))); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    const hole = new THREE.Path(); hole.absarc(0, 0, rO * 0.62, 0, Math.PI * 2, true); sh.holes.push(hole);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, h = new THREE.Path(); h.absellipse(Math.cos(a) * rO * 0.8, Math.sin(a) * rO * 0.8, rO * 0.07, rO * 0.035, 0, Math.PI * 2, true, a + 0.6); sh.holes.push(h); }
    const dg = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false, curveSegments: 4 }).rotateY(Math.PI / 2);
    const d = new THREE.Mesh(dg, m('#d6d8db', { metalness: 0.95, roughness: 0.22 })); d.position.x = w * 0.5 + 0.012; g.add(d);
    // floating-rotor carrier
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3, c = new THREE.Mesh(new THREE.BoxGeometry(0.01, rO * 0.36, 0.03), m('#222', { metalness: 0.5 })); c.geometry.translate(0, rO * 0.44, 0); c.rotation.x = a; c.position.x = w * 0.5 + 0.01; g.add(c); }
  }
  return g;
}
export function buildJetSL() {
  const root = new THREE.Group(), g = new THREE.Group(); g.scale.setScalar(1.08); root.add(g);
  const white = paint('#f3f3f1'), grey = paint('#3a3d42', { roughness: 0.45, clearcoat: 0.6 }), satin = m('#1e2023', { roughness: 0.55, metalness: 0.15 });
  const black = m('#0f1012', { roughness: 0.4, metalness: 0.1 }), red = paint('#d4143c'), pink = paint('#ff2d7a', { roughness: 0.35 });
  const chrome = m('#d4d7da', { metalness: 0.95, roughness: 0.2 });
  const R = 0.235, ZF = 0.64, ZR = -0.62;
  const wheels = [jetWheel(R, 0.11, true), jetWheel(R, 0.13, false)];
  wheels[0].position.set(0, R, ZF); wheels[1].position.set(0, R, ZR); g.add(...wheels);

  // ---- front fork, brake caliper, fender ----
  for (const s of [-1, 1]) {
    g.add(tube([0.075 * s, 0.62, 0.53], [0.075 * s, R, ZF - 0.01], 0.022, black));
    g.add(tube([0.075 * s, 0.42, 0.585], [0.075 * s, R - 0.02, ZF + 0.005], 0.03, satin));
    g.add(spring([0.075 * s, 0.44, 0.58], [0.075 * s, 0.6, 0.535], 0.034, 7, black));
  }
  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.045), m('#b8902c', { metalness: 0.7, roughness: 0.35 }));
  cal.position.set(0.085, R + 0.1, ZF - 0.13); cal.rotation.x = 0.6; g.add(cal);
  // beak-like black front fender over the tyre
  g.add(panel([[0.87, 0.42], [0.8, 0.47], [0.62, 0.5], [0.46, 0.47], [0.4, 0.42], [0.5, 0.44], [0.66, 0.45], [0.8, 0.41]], 0.13, black, { bevel: 0.015, taper: z => 1.05 - Math.max(0, z - 0.6) * 1.6 }));

  // ---- front: faceted white "fangs", black face with angled headlights, dark hood ----
  // vertices are for the left (+x) side and mirrored; non-indexed triangles give crisp creases
  const facet = (V, T, mat, s) => {
    const p = [];
    for (const t of T) {
      const tri = s > 0 ? t : [t[0], t[2], t[1]];
      for (const k of tri) { const v = V[k]; p.push(v[0] * s, v[1], v[2]); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.computeVertexNormals();
    const o = new THREE.Mesh(geo, mat); o.castShadow = true; return o;
  };
  const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const white2 = white.clone(); white2.side = THREE.DoubleSide;
  const red2 = red.clone(); red2.side = THREE.DoubleSide;
  const black2 = black.clone(); black2.side = THREE.DoubleSide;
  const grey2 = grey.clone(); grey2.side = THREE.DoubleSide;
  // fang points (x, y, z)
  // side outline follows the reference photo: the white is wide only up top (nose to cowl); below the
  // headlights / turn signals it narrows into a blade running down to the floor, with black underneath
  const F = {
    T0: [0.19, 0.985, 0.2], C0: [0.215, 0.9, 0.26], T1: [0.16, 0.825, 0.63], C1: [0.232, 0.76, 0.5],
    F1: [0.105, 0.68, 0.7], F2: [0.07, 0.585, 0.665], L1: [0.2, 0.575, 0.55], M: [0.245, 0.64, 0.4],
    Bf: [0.205, 0.45, 0.4], B2f: [0.19, 0.3, 0.31], B2r: [0.19, 0.3, 0.255], Rb: [0.2, 0.45, 0.25], R1: [0.2, 0.62, 0.2],
    T1i: [0.13, 0.825, 0.6], F1i: [0.075, 0.68, 0.665], F2i: [0.05, 0.585, 0.64],
  };
  const FK = Object.keys(F), FV = FK.map(k => F[k]), fi = k => FK.indexOf(k);
  const FT = [
    ['T0', 'T1', 'C1'], ['T0', 'C1', 'C0'],                 // top face (carries the red stripe)
    ['C0', 'C1', 'M'], ['C0', 'M', 'R1'],                   // upper side
    ['C1', 'T1', 'F1'], ['C1', 'F1', 'M'],                  // front shoulder
    ['F1', 'F2', 'L1'], ['F1', 'L1', 'M'],                  // front lower (turn signal)
    ['M', 'L1', 'Bf'], ['M', 'Bf', 'Rb'], ['R1', 'M', 'Rb'], // blade, upper
    ['Rb', 'Bf', 'B2f'], ['Rb', 'B2f', 'B2r'],              // blade down to the floor
    ['T1', 'T1i', 'F1i'], ['T1', 'F1i', 'F1'], ['F1', 'F1i', 'F2i'], ['F1', 'F2i', 'F2'], // return into the face
  ].map(t => t.map(fi));
  const H0 = [0, 0.885, 0.6], H1 = [0, 1.045, 0.22];
  g.add(panel([[0.67, 0.59], [0.55, 0.578], [0.4, 0.452], [0.33, 0.36], [0.36, 0.33], [0.46, 0.4], [0.6, 0.47], [0.68, 0.53]], 0.3, satin,
    { taper: (z, y) => 0.55 + Math.max(0, y - 0.35) * 1.6 - Math.max(0, z - 0.58) * 1.5 }));
  for (const s of [-1, 1]) {
    g.add(facet(FV, FT, white2, s));
    // red pinstripe along the top crease, turning down the face edge
    const stripe = (a, b, c, d, w0, w1) => {
      const P = [lerp3(a, c, w0), lerp3(b, d, w0), lerp3(b, d, w1), lerp3(a, c, w1)].map(v => [v[0] + 0.004, v[1] + 0.003, v[2]]);
      return facet(P, [[0, 1, 2], [0, 2, 3]], red2, s);
    };
    g.add(stripe(F.T0, F.T1, F.C0, F.C1, 0.3, 0.52));
    g.add(stripe(F.T1, F.F1, F.C1, F.M, 0.06, 0.16));
    g.add(stripe(F.F1, F.F2, F.L1, F.L1, 0.05, 0.15));
    // dark hood between the fang tops, with a raised centre ridge
    const hood = { A: [0.17, 0.865, 0.615], B: [0.185, 0.985, 0.21], C: [0.045, 0.9, 0.6], D: [0.05, 1.035, 0.22], E: H0, G: H1 };
    const HK = Object.keys(hood), hi = k => HK.indexOf(k);
    g.add(facet(HK.map(k => hood[k]), [['A', 'B', 'D'], ['A', 'D', 'C'], ['C', 'D', 'G'], ['C', 'G', 'E']].map(t => t.map(hi)), grey2, s));
    // face: black panel between the fangs, slightly convex down the centre line
    const face = { T: [0.13, 0.865, 0.605], M: [0.075, 0.68, 0.675], Bm: [0.04, 0.55, 0.665], CT: [0, 0.885, 0.6], CM: [0, 0.7, 0.705], CB: [0, 0.5, 0.67] };
    const QK = Object.keys(face), qi = k => QK.indexOf(k);
    g.add(facet(QK.map(k => face[k]), [['CT', 'T', 'M'], ['CT', 'M', 'CM'], ['CM', 'M', 'Bm'], ['CM', 'Bm', 'CB']].map(t => t.map(qi)), black2, s));
  }
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 20), chrome); badge.position.set(0, 0.988, 0.37); badge.rotation.x = 0.4; g.add(badge);
  const lens = new THREE.MeshStandardMaterial({ color: '#f4f8ff', emissive: '#e8f4ff', emissiveIntensity: 1.6, roughness: 0.1 });
  const amber = new THREE.MeshStandardMaterial({ color: '#ff9a1a', emissive: '#ff7a00', emissiveIntensity: 0.35, roughness: 0.2 });
  const amberDS = amber.clone(); amberDS.side = THREE.DoubleSide;
  for (const s of [-1, 1]) {
    // headlight unit, set into the slanted face like the real JET SL: an eye-shaped recess pointing
    // up to the outside, dark chrome reflector, small projector, an L-shaped LED light guide along the
    // top and outer edge, and a clear outer cover. Built in face-plane coordinates (u out, v up).
    {
      const E = [[0.016, -0.03], [0.07, -0.018], [0.124, 0.042], [0.116, 0.05], [0.024, 0.008]];
      const eye = (k = 0) => { const sh = new THREE.Shape(); E.forEach(([u, v], n) => { const cu = 0.068, cv = 0.004; const q = [cu + (u - cu) * (1 + k), cv + (v - cv) * (1 + k)]; n ? sh.lineTo(...q) : sh.moveTo(...q); }); sh.closePath(); return sh; };
      const unit = new THREE.Group();
      // recess (gloss black) with a thin dark-chrome rim
      const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(eye(0.12), { depth: 0.006, bevelEnabled: false }), m('#3a3d42', { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }));
      rim.position.z = -0.004; unit.add(rim);
      const refl = new THREE.Mesh(new THREE.ShapeGeometry(eye(0)), m('#55595f', { metalness: 1, roughness: 0.18, side: THREE.DoubleSide }));
      refl.position.z = 0.003; unit.add(refl);
      // projector: small bowl + bluish lens in the inner half of the eye
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.017, 0.012, 20).rotateX(Math.PI / 2), m('#8a9097', { metalness: 1, roughness: 0.15 }));
      bowl.position.set(0.05, -0.004, 0.008); unit.add(bowl);
      const pl = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2),
        new THREE.MeshPhysicalMaterial({ color: '#7d8fa6', emissive: '#cfe0ff', emissiveIntensity: 0.12, roughness: 0.02, metalness: 0.3, clearcoat: 1 }));
      pl.position.set(0.05, -0.004, 0.013); unit.add(pl);
      // L-shaped LED light guide: along the top edge, then down the outer tip
      const guide = (a, b) => {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(l, 0.0055, 0.006), lens);
        bar.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.011); bar.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]); unit.add(bar);
      };
      guide([0.03, 0.004], [0.112, 0.042]); guide([0.114, 0.036], [0.078, -0.01]);
      // clear cover
      const cover = new THREE.Mesh(new THREE.ExtrudeGeometry(eye(0.04), { depth: 0.004, bevelEnabled: false }),
        new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.03, transmission: 0.9, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide }));
      cover.position.z = 0.016; unit.add(cover);
      // sit flush on the face: it slopes back ~27 deg and curves back away from the centre line
      unit.position.set(0, 0.79, 0.655); unit.rotation.order = 'XZY'; unit.rotation.set(-0.5, 0.28 * s, -0.04 * s);
      unit.scale.set(1.3 * s, 1.3, 1.3);
      g.add(unit);
    }
    // amber turn signal: a long pointed wedge lying flat on the fang's lower front facet (F1-F2-L1),
    // tip towards the face; points are taken on that facet and lifted 4 mm along its normal
    {
      const sub = (a, b) => a.map((v, i) => v - b[i]);
      const e1 = sub(F.F2, F.L1), e2 = sub(F.F1, F.L1);
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const nl = Math.hypot(...n), out = n[0] / nl > 0 ? 1 : -1;
      const Q = (a, b, h) => F.L1.map((v, i) => v + a * e1[i] + b * e2[i] + n[i] / nl * out * h);
      const W = [[0.1, 0.06], [0.62, 0.1], [0.55, 0.22], [0.12, 0.3]];
      const pts = [...W.map(([a, b]) => Q(a, b, 0.004)), ...W.map(([a, b]) => Q(a, b, 0.012))];
      g.add(facet(pts, [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]], amberDS, s));
    }
    // amber reflector on the fork leg
    const rf = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.022), amber); rf.position.set(0.106 * s, 0.4, 0.6); g.add(rf);
  }

  // ---- handlebar cowl (pointed visor, small smoked screen), bars, mirrors ----
  g.add(panel([[0.36, 1.06], [0.24, 1.15], [0.12, 1.13], [0.12, 1.06], [0.25, 1.01], [0.34, 1.02]], 0.34, grey, { taper: (z) => 0.8 + (0.36 - z) * 0.9 }));
  {
    const V = { tip: [0, 1.055, 0.48], L: [0.15, 1.08, 0.33], Lb: [0.13, 1.03, 0.34], top: [0, 1.16, 0.32], bot: [0, 1.0, 0.36] };
    const K = Object.keys(V), k = n => K.indexOf(n);
    for (const s of [-1, 1]) g.add(facet(K.map(n => V[n]), [['tip', 'L', 'top'], ['tip', 'Lb', 'L'], ['tip', 'bot', 'Lb']].map(t => t.map(k)), grey2, s));
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.006), new THREE.MeshPhysicalMaterial({ color: '#2a2f36', roughness: 0.05, transparent: true, opacity: 0.7, metalness: 0.3 }));
    scr.position.set(0, 1.19, 0.28); scr.rotation.x = -0.75; g.add(scr);
    for (const s of [-1, 1]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.008), chrome); tr.position.set(0.075 * s, 1.07, 0.42); tr.rotation.y = 0.75 * s; g.add(tr); }
  }
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.01), lens); led.position.set(0, 1.04, 0.44); g.add(led);
  g.add(tube([-0.37, 1.1, 0.13], [0.37, 1.1, 0.13], 0.012, chrome));
  for (const s of [-1, 1]) {
    g.add(tube([0.27 * s, 1.1, 0.13], [0.39 * s, 1.1, 0.13], 0.02, black));
    const lever = tube([0.2 * s, 1.11, 0.16], [0.36 * s, 1.1, 0.2], 0.007, chrome); g.add(lever);
    g.add(tube([0.2 * s, 1.12, 0.18], [0.27 * s, 1.36, 0.14], 0.009, black));
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.095, 0.03), black); mir.position.set(0.29 * s, 1.39, 0.13); mir.rotation.order = 'YXZ'; mir.rotation.set(0.15, -0.75 * s, 0.3 * s); g.add(mir);
  }

  // ---- inner leg shield, floor with red mat ----
  g.add(panel([[0.2, 0.98], [0.12, 0.97], [0.16, 0.4], [0.26, 0.3], [0.27, 0.42]], 0.38, satin));
  g.add(panel([[0.27, 0.36], [-0.12, 0.36], [-0.12, 0.27], [0.26, 0.27]], 0.34, black, { bevel: 0.012 }));
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.006, 0.36), m('#a8172a', { roughness: 0.85 })); mat.position.set(0, 0.383, 0.07); g.add(mat);

  // ---- mid body: dark grey under the seat with vents + silver step trim ----
  const mid = (z, y) => 0.9 + Math.max(0, y - 0.5) * 0.4;
  g.add(panel([[-0.02, 0.36], [-0.04, 0.72], [-0.36, 0.79], [-0.52, 0.66], [-0.46, 0.5], [-0.3, 0.42], [-0.14, 0.33]], 0.34, grey, { taper: mid }));
  g.add(panel([[-0.12, 0.36], [-0.13, 0.31], [-0.5, 0.36], [-0.62, 0.42], [-0.6, 0.47], [-0.45, 0.42]], 0.3, black));
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.11), black); v.position.set(0.178 * s, 0.5 + k * 0.024, -0.24 - k * 0.012); v.rotation.x = 0.25; g.add(v); }
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.15), chrome); trim.position.set(0.172 * s, 0.6, -0.4); trim.rotation.x = 0.35; g.add(trim);
  }

  // ---- rear: white side panels with red stripe, sharp tail, LED tail light ----
  const tail = (z) => 0.62 + Math.max(0, Math.min(1, (z + 0.88) / 0.5)) * 0.42;
  g.add(panel([[-0.3, 0.63], [-0.52, 0.8], [-0.86, 0.9], [-0.9, 0.86], [-0.84, 0.73], [-0.62, 0.62], [-0.46, 0.58]], 0.36, white, { taper: tail }));
  g.add(panel([[-0.44, 0.6], [-0.64, 0.64], [-0.84, 0.75], [-0.835, 0.72], [-0.64, 0.618], [-0.45, 0.585]], 0.375, red, { taper: tail, bevel: 0.012 }));
  g.add(panel([[-0.33, 0.68], [-0.5, 0.79], [-0.52, 0.775], [-0.35, 0.665]], 0.375, red, { taper: tail, bevel: 0.012 }));
  // black lower tail + rear grab handle
  g.add(panel([[-0.6, 0.62], [-0.86, 0.73], [-0.88, 0.66], [-0.66, 0.55]], 0.26, satin, { taper: tail }));
  g.add(panel([[-0.66, 0.905], [-0.84, 0.935], [-0.86, 0.915], [-0.68, 0.89]], 0.3, black, { taper: tail, bevel: 0.012 }));
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: '#c01020', emissive: '#ff1a1a', emissiveIntensity: 0.9, roughness: 0.15 }));
  tl.position.set(0, 0.84, -0.905); tl.rotation.x = 0.5; g.add(tl);
  const tlc = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 0.6, roughness: 0.05, transparent: true, opacity: 0.35 }));
  tlc.position.copy(tl.position); tlc.rotation.x = 0.5; g.add(tlc);
  for (const s of [-1, 1]) { const ti = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: '#ffb066', emissive: '#ff8a1a', emissiveIntensity: 0.25 })); ti.position.set(0.1 * s, 0.795, -0.9); g.add(ti); }

  // ---- seat: black with red piping ----
  const seatT = (z) => 0.92 - Math.max(0, -z - 0.5) * 0.35;
  g.add(panel([[0.06, 0.72], [0.0, 0.79], [-0.3, 0.8], [-0.5, 0.84], [-0.78, 0.92], [-0.8, 0.88], [-0.56, 0.8], [-0.06, 0.7]], 0.31, m('#151517', { roughness: 0.75 }), { taper: seatT, bevel: 0.035 }));
  g.add(panel([[0.05, 0.75], [-0.3, 0.765], [-0.5, 0.805], [-0.78, 0.885], [-0.78, 0.875], [-0.5, 0.795], [-0.3, 0.755], [0.05, 0.74]], 0.374, m('#b0182e', { roughness: 0.6 }), { taper: seatT, bevel: 0.004 }));

  // ---- engine, air box (left), exhaust (right), shock, stand ----
  g.add(panel([[-0.36, 0.5], [-0.75, 0.52], [-0.78, 0.36], [-0.5, 0.26], [-0.34, 0.3]], 0.2, satin, { x: 0.05 }));
  const ab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.32), black); ab.position.set(0.15, 0.42, -0.6); ab.rotation.x = -0.08; g.add(ab);
  g.add(spring([0.15, 0.36, -0.7], [0.15, 0.62, -0.74], 0.032, 8, m('#111', { metalness: 0.4 })));
  const muf = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.42, 14).rotateX(Math.PI / 2), black); muf.position.set(-0.16, 0.36, -0.72); muf.rotation.x = -0.15; g.add(muf);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10).rotateX(Math.PI / 2), chrome); tip.position.set(-0.16, 0.39, -0.94); g.add(tip);
  // exhaust header and the folded centre stand under the engine
  g.add(tube([-0.06, 0.22, -0.3], [-0.16, 0.3, -0.52], 0.02, satin));
  for (const s of [-1, 1]) g.add(tube([0.08 * s, 0.2, -0.34], [0.08 * s, 0.15, -0.56], 0.013, black));
  g.add(tube([-0.08, 0.15, -0.56], [0.08, 0.15, -0.56], 0.012, black));

  // ---- pink rear hugger + plate bracket ----
  g.add(panel([[-0.74, 0.45], [-0.82, 0.42], [-0.88, 0.32], [-0.87, 0.18], [-0.84, 0.2], [-0.84, 0.31], [-0.79, 0.39], [-0.72, 0.42]], 0.14, pink, { bevel: 0.012 }));
  g.add(panel([[-0.82, 0.66], [-0.92, 0.57], [-0.99, 0.48], [-0.97, 0.45], [-0.9, 0.52], [-0.8, 0.6]], 0.12, black, { bevel: 0.01 }));
  // licence plate PYL0803 at the end of the bracket, behind everything else so nothing hides it
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshStandardMaterial({ map: plateTex('PYL0803'), roughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  plate.position.set(0, 0.52, -1.025); plate.rotation.set(0, Math.PI, 0); g.add(plate);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.012), black); pb.position.set(0, 0.52, -1.012); g.add(pb);
  g.add(tube([0, 0.5, -0.97], [0, 0.52, -1.006], 0.012, black));

  // ---- decals: JET SL on the tail panels, JET on the cowl, SYM on the fangs ----
  const jet = decalTex((c, w, h) => {
    c.font = 'italic 900 70px "Arial Black",system-ui'; c.fillStyle = '#111'; c.textBaseline = 'middle'; c.fillText('JET', 8, 46);
    c.font = 'italic 900 34px system-ui'; c.fillStyle = '#d4143c'; c.fillText('SL', 158, 34);
    c.fillStyle = '#d4143c'; c.font = 'italic 700 14px system-ui'; c.fillText('LIQUID COOLED', 10, 84);
  });
  // halftone speed-dots + red "200%" style graphic on the lower white blade
  const dots = decalTex((c, w, h) => {
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const r = 3.2 * (1 - x / w) * (0.5 + y / h * 0.6); if (r > 0.4) { c.fillStyle = '#7d8288'; c.beginPath(); c.arc(x + 4, y + 4, r, 0, 7); c.fill(); } }
    c.font = 'italic 900 52px "Arial Black",system-ui'; c.fillStyle = '#d4143c'; c.textBaseline = 'middle'; c.fillText('200%', 70, h - 50);
  }, 256, 256);
  const dm = t => new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.1), dm(jet)); d.position.set(0.18 * s, 0.77, -0.7); d.rotation.order = 'YXZ'; d.rotation.set(0, s * (Math.PI / 2 + 0.12), 0.28 * s); g.add(d);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.09), dm(dots)); e.position.set(0.206 * s, 0.37, 0.29); e.rotation.order = 'YXZ'; e.rotation.set(0, s * (Math.PI / 2 - 0.1), 0.9 * s); g.add(e);
  }
  root.userData.wheels = wheels;
  return root;
}

export function buildCar(color, taxi = false) {
  const g = new THREE.Group();
  const body = m(color, { roughness: 0.3, metalness: 0.4 });
  const glass = m('#24323f', { roughness: 0.1, metalness: 0.6 });
  g.add(box(1.8, 0.62, 4.3, body, 0, 0.62, 0));
  const cab = box(1.62, 0.56, 2.2, glass, 0, 1.2, -0.25); g.add(cab);
  g.add(box(1.66, 0.08, 2.0, body, 0, 1.5, -0.3)); // roof
  for (const s of [-1, 1]) g.add(box(0.08, 0.5, 0.08, body, 0.78 * s, 1.2, 0.84));
  const wheels = [];
  for (const [x, z] of [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]]) { const w = wheel(0.34, 0.24, x, 0.34, z); wheels.push(w); g.add(w); }
  const hlm = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d6', emissiveIntensity: 1 });
  const tlm = new THREE.MeshStandardMaterial({ color: '#700', emissive: '#ff1a1a', emissiveIntensity: 0.7 });
  for (const s of [-1, 1]) { g.add(box(0.36, 0.14, 0.05, hlm, 0.62 * s, 0.75, 2.16)); g.add(box(0.36, 0.14, 0.05, tlm, 0.62 * s, 0.78, -2.16)); }
  g.add(box(1.7, 0.16, 0.12, m('#222'), 0, 0.42, 2.15));
  g.add(box(1.7, 0.16, 0.12, m('#222'), 0, 0.42, -2.15));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.17), new THREE.MeshBasicMaterial({ map: plateTex(taxi ? 'TDA-034' : 'CYU-34' + Math.floor(Math.random() * 10)) }));
  plate.position.set(0, 0.55, -2.22); plate.rotation.y = Math.PI; g.add(plate);
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshStandardMaterial({ map: plateTex('TAXI', '#ffe066', '#111'), emissive: '#ffe066', emissiveIntensity: 0.3 }));
    sign.position.set(0, 1.66, -0.3); g.add(sign);
  }
  g.userData.wheels = wheels;
  return g;
}

const SCOOTER_COLORS = ['#e8e8e8', '#c1121f', '#1d3557', '#ffb703', '#2a9d8f', '#111111', '#8ecae6', '#f28482', '#7b8a8b'];
const CAR_COLORS = ['#f0f0f0', '#222222', '#9aa3ab', '#b5121b', '#1e3a8a', '#6b7280', '#d1d5db', '#14532d'];

let VID = 0;
export class Vehicle {
  constructor(kind, rnd = Math.random, opt = {}) {
    this.id = VID++;
    this.kind = kind;
    const pick = a => a[Math.floor(rnd() * a.length)];
    if (kind === 'scooter') {
      this.mesh = opt.jet ? buildJetSL() : buildCommuter(pick(SCOOTER_COLORS)); // traffic / parked: detailed commuter (scooters.js)
      Object.assign(this, { wb: 1.25, radius: 0.75, maxSpeed: opt.jet ? 22 : 19, accel: opt.jet ? 10.5 : 9, brake: 18, turn: 2.6, grip: 9, seat: opt.jet ? new THREE.Vector3(0, 0.08, -0.3) : new THREE.Vector3(0, 0.09, -0.29), exitSide: 1.0, label: opt.jet ? '我的 SYM JET SL' : '機車', jet: !!opt.jet });
    } else {
      const taxi = kind === 'taxi';
      this.mesh = buildCar(taxi ? '#ffd000' : pick(CAR_COLORS), taxi);
      Object.assign(this, { wb: 2.7, radius: 1.35, maxSpeed: 30, accel: 8, brake: 16, turn: 1.7, grip: 6, seat: new THREE.Vector3(0.38, 0.12, -0.2), exitSide: 2.0, label: taxi ? '計程車' : '汽車' });
    }
    this.pos = new THREE.Vector3();
    this.heading = 0; this.moveAng = 0; this.speed = 0; this.steer = 0; this.lean = 0; this.pitch = 0;
    this.mesh.rotation.order = 'YXZ'; // yaw, then pitch, then lean
    this.driver = null; // 'player' | 'ai' | null
    this.ai = null; this.bumpCooldown = 0; this.wheelRot = 0;
    this.mesh.traverse(o => { if (o.isMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.castShadow = o.userData.shadow ?? (o.geometry.boundingSphere.radius > 0.4); } });
  }
  place(x, z, h) { this.pos.set(x, 0, z); this.heading = this.moveAng = h; this.speed = 0; this.hf = this.hb = undefined; this.sync(); }
  forward() { return [Math.sin(this.heading), Math.cos(this.heading)]; }
  sync(dt = 0) {
    // pos stays on the 2D plane (y = 0); the mesh sits on the ground under both
    // wheels and pitches with it (visual only, handling is unchanged)
    const fx = Math.sin(this.heading) * this.wb / 2, fz = Math.cos(this.heading) * this.wb / 2;
    // each wheel stays on the level it was on (viaduct deck / street below it, js/terrain.js)
    const hf = this.hf = surfaceAt(this.pos.x + fx, this.pos.z + fz, this.hf), hb = this.hb = surfaceAt(this.pos.x - fx, this.pos.z - fz, this.hb);
    const pt = -Math.atan2(hf - hb, this.wb);
    this.pitch = dt > 0 ? this.pitch + (pt - this.pitch) * Math.min(1, dt * 10) : pt;
    this.mesh.position.set(this.pos.x, (hf + hb) / 2, this.pos.z);
    this.mesh.rotation.set(this.pitch, this.heading, 0);
    if (this.kind === 'scooter') {
      const targetLean = -this.steer * Math.min(1, Math.abs(this.speed) / 10) * 0.35;
      this.lean += (targetLean - this.lean) * Math.min(1, dt * 6);
      this.mesh.rotation.z = this.lean;
    }
    this.wheelRot += this.speed * dt / 0.3;
    for (const w of this.mesh.userData.wheels) w.rotation.x = this.wheelRot;
  }
  // player driving physics. inp: {throttle(-1..1), steer(-1..1), handbrake}
  drive(dt, inp, collision, others, onBump) {
    const thr = inp.throttle, hb = inp.handbrake;
    if (thr > 0) this.speed += (this.speed < 0 ? this.brake : this.accel * (1 - Math.max(0, this.speed) / this.maxSpeed * 0.6)) * thr * dt;
    else if (thr < 0) {
      if (this.speed > 0.5) this.speed -= this.brake * dt;
      else this.speed = Math.max(-6, this.speed - this.accel * 0.6 * dt);
    } else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), (1.5 + Math.abs(this.speed) * 0.08) * dt);
    if (hb) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 7 * dt);
    this.speed = Math.max(-6, Math.min(this.maxSpeed, this.speed));
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 8);
    const sp = Math.abs(this.speed);
    const f = Math.min(1, sp / 4) * (1 - 0.45 * Math.min(1, sp / this.maxSpeed));
    const turnRate = this.steer * this.turn * f * (hb ? 1.7 : 1);
    this.heading += turnRate * dt * Math.sign(this.speed || 1);
    // drift: movement direction lags heading
    let d = this.heading - this.moveAng; d = Math.atan2(Math.sin(d), Math.cos(d));
    const grip = hb ? 1.6 : this.grip;
    this.moveAng += d * Math.min(1, grip * dt);
    this.drifting = hb && sp > 6 && Math.abs(d) > 0.2;
    const dx = Math.sin(this.moveAng) * this.speed * dt, dz = Math.cos(this.moveAng) * this.speed * dt;
    // substeps against tunnelling
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (this.radius * 0.5)));
    let hitN = null;
    for (let i = 0; i < steps; i++) {
      this.pos.x += dx / steps; this.pos.z += dz / steps;
      const r = collision.resolve(this.pos, this.radius, 0, this.mesh.position.y);
      if (r.hit) hitN = r;
    }
    this.bumpCooldown -= dt;
    if (hitN) {
      const fx = Math.sin(this.moveAng), fz = Math.cos(this.moveAng);
      const impact = -(fx * hitN.nx + fz * hitN.nz) * this.speed;
      if (impact > 2) { this.speed *= 0.35; if (this.bumpCooldown <= 0) { onBump && onBump(impact); this.bumpCooldown = 0.4; } }
      else this.speed *= 0.97;
    }
    // vehicle-vehicle
    for (const o of others) {
      if (o === this) continue;
      const ddx = this.pos.x - o.pos.x, ddz = this.pos.z - o.pos.z, rr = this.radius + o.radius;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const dd = Math.sqrt(d2), push = rr - dd;
        this.pos.x += ddx / dd * push * 0.7; this.pos.z += ddz / dd * push * 0.7;
        o.pos.x -= ddx / dd * push * 0.3; o.pos.z -= ddz / dd * push * 0.3;
        if (!o.ai) collision.resolve(o.pos, o.radius, 0, o.mesh.position.y); // parked cars / your scooter: don't shove them into walls (AI cars snap back to their lane)
        o.sync();
        if (Math.abs(this.speed) > 3 && this.bumpCooldown <= 0) { onBump && onBump(Math.abs(this.speed)); this.bumpCooldown = 0.5; }
        this.speed *= 0.6;
        if (o.ai) o.ai.stunned = 2;
      }
    }
    this.sync(dt);
  }
}
