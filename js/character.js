import * as THREE from 'three';
import { buildSkinnedBody } from './bodymesh.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

// Body style: one continuous skinned mesh (bodymesh.js) by default; ?legacy in the URL brings back the old
// sphere-and-capsule body for side-by-side comparison.
const SKINNED = !(typeof location !== 'undefined' && /[?&]legacy\b/.test(location.search));
// small deterministic hash -> 0..1, for per-person face / build variation that stays the same every visit
const hash01 = (str, salt) => { let h = 2166136261 ^ salt; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; };

// Shared geometry/material caches
const G = {}; const M = {};
const geo = (k, f) => G[k] || (G[k] = f());
const mat = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  return M[k] || (M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }));
};
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const pivot = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };

function logoTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4f4f0'; g.beginPath(); g.roundRect(4, 8, 56, 48, 8); g.fill();
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(22, 30, 7, 0, 7); g.arc(42, 30, 7, 0, 7); g.fill();
  g.fillStyle = '#f4f4f0'; g.beginPath(); g.arc(24, 29, 2.5, 0, 7); g.arc(44, 29, 2.5, 0, 7); g.fill();
  g.fillStyle = '#1a1a1a'; g.fillRect(20, 42, 24, 4);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 系學會幹部T: the white line-drawn lion on the left chest (user's photo): a lion with a crown, a speech bubble
// saying 34TH and CYIMSA written underneath; white strokes on a transparent canvas
function lionTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d'); g.strokeStyle = g.fillStyle = '#f6f6f2'; g.lineWidth = 6; g.lineCap = g.lineJoin = 'round';
  // mane: a zigzag ring
  g.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 50 : 62; const x = 104 + Math.cos(a) * r, y = 108 + Math.sin(a) * r * 0.95; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  // face, eyes, nose and an open mouth
  g.beginPath(); g.ellipse(104, 112, 36, 32, 0, 0, 7); g.stroke();
  g.beginPath(); g.arc(91, 104, 5, 0, 7); g.arc(117, 104, 5, 0, 7); g.fill();
  g.beginPath(); g.moveTo(98, 118); g.lineTo(110, 118); g.lineTo(104, 124); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(104, 132, 9, 6, 0, 0, 7); g.stroke();
  // little body and legs
  g.beginPath(); g.moveTo(80, 166); g.lineTo(78, 200); g.moveTo(128, 166); g.lineTo(130, 200); g.moveTo(70, 200); g.lineTo(140, 200); g.stroke();
  // crown
  g.beginPath(); g.moveTo(86, 46); g.lineTo(90, 26); g.lineTo(98, 40); g.lineTo(104, 22); g.lineTo(110, 40); g.lineTo(118, 26); g.lineTo(122, 46); g.closePath(); g.stroke();
  // speech bubble: 34TH
  g.beginPath(); g.ellipse(196, 104, 40, 46, 0, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(170, 140); g.lineTo(158, 162); g.lineTo(184, 146); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 34px "Comic Sans MS","Segoe Print",sans-serif'; g.fillText('34', 196, 88);
  g.font = '700 26px "Comic Sans MS","Segoe Print",sans-serif'; g.fillText('TH', 196, 120);
  g.font = '700 30px "Comic Sans MS","Segoe Print",sans-serif'; g.fillText('C Y I M S A', 104, 232);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 資管系服 (deep olive tee, user's photos): front — a white geometric (low-poly line) lion head facing left on the
// left chest; back — "Information Management" with a little Java program and "Since.1988" written down the side
function geoLionTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d'); g.strokeStyle = '#f4f4ee'; g.lineWidth = 6; g.lineJoin = 'round';
  const P = { // points of the head (muzzle on the left) and the mane spikes (right)
    n: [40, 130], m: [62, 150], c: [92, 178], j: [130, 196], e: [92, 112], f: [70, 104], b: [112, 82], t: [150, 64], a: [118, 130],
    k: [150, 150], h: [176, 110], i: [196, 74], l: [204, 136], o: [182, 180], q: [214, 196], r: [232, 110], s: [222, 56], u: [176, 40],
    v: [240, 160], w: [150, 214], x: [120, 226], y: [100, 210],
  };
  const L = (...ks) => { g.beginPath(); ks.forEach((k, i) => (i ? g.lineTo(...P[k]) : g.moveTo(...P[k]))); g.stroke(); };
  L('n', 'f', 'b', 't', 'u', 's', 'i', 'r', 'v', 'l', 'q', 'o', 'w', 'x', 'y', 'c', 'm', 'n');
  L('f', 'e', 'a', 'k', 'j', 'c'); L('e', 'b'); L('a', 'b'); L('b', 'h', 't'); L('h', 'i'); L('h', 'k'); L('h', 'l'); L('l', 'k', 'o');
  L('a', 'm'); L('k', 'w'); L('j', 'y'); L('l', 'i'); L('u', 'h'); L('o', 'l');
  g.fillStyle = '#f4f4ee'; g.beginPath(); g.arc(98, 120, 6, 0, 7); g.fill(); // eye
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function imBackTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 768;
  const g = cv.getContext('2d'), W = '#f2f1ea'; g.fillStyle = W; g.strokeStyle = W; g.lineWidth = 4;
  g.font = '600 66px Georgia,"Times New Roman",serif'; g.fillText('Information Management', 140, 130);
  g.fillRect(60, 150, 450, 4);
  const mono = (s, x, y, size = 36) => { g.font = `700 ${size}px "Courier New",monospace`; g.fillText(s, x, y); };
  mono('package CYCU;', 230, 230, 40); g.fillRect(230, 248, 330, 4);
  mono('public class CYIM', 90, 320); mono('{', 90, 360);
  mono('public static void main(String arg[])', 190, 400); mono('{', 200, 440);
  mono('System.out.print("Information Management");', 250, 480); mono('}', 200, 520); mono('}', 90, 560);
  for (const [x, y, w] of [[60, 410, 110], [60, 490, 170], [170, 530, 190], [220, 500, 640], [560, 410, 90]]) g.fillRect(x, y, w, 3);
  g.fillRect(790, 60, 4, 140); g.fillRect(700, 560, 4, 120); g.fillRect(760, 560, 4, 170);
  g.save(); g.translate(820, 230); g.rotate(Math.PI / 2); g.font = '500 54px Georgia,"Times New Roman",serif'; g.fillText('Since.1988', 0, 0); g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a print that follows the torso's curve: a plane bent round the superellipse cross-section at the given height
// (rx, rz: the cloth's radii there; back = on the back, facing -z; ox: where its centre sits across the body)
function curvedPrint(w, h, rx, rz, back, segs = 18, ox = 0) {
  const g = new THREE.PlaneGeometry(w, h, segs, 1), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), q = Math.min(0.98, Math.abs((x + ox) / rx));
    P.setZ(i, rz * (1 - q ** 2.5) ** 0.4);
  }
  if (back) { g.rotateY(Math.PI); }
  g.computeVertexNormals(); return g;
}

// ---------- hand with individual fingers (hero only) ----------
function buildHand(skin, side) {
  const hand = pivot();
  const palm = mesh(geo('palm', () => { const g = new THREE.BoxGeometry(0.075, 0.08, 0.03); g.translate(0, -0.04, 0); return g; }), skin);
  hand.add(palm);
  const fingers = [];
  const fg = geo('finger', () => { const g = new THREE.CapsuleGeometry(0.0095, 0.045, 3, 6); g.translate(0, -0.03, 0); return g; });
  const xs = [-0.027, -0.009, 0.009, 0.027];
  for (let i = 0; i < 4; i++) {
    const f = pivot(xs[i] * side, -0.08, 0);
    const seg = mesh(fg, skin); seg.scale.y = i === 3 ? 0.8 : i === 0 ? 0.9 : 1; f.add(seg);
    hand.add(f); fingers.push(f);
  }
  const th = pivot(0.04 * side, -0.03, 0.01);
  const tseg = mesh(fg, skin); tseg.scale.set(1.1, 0.8, 1.1); th.add(tseg); th.rotation.z = 0.7 * side; th.rotation.x = 0.5;
  hand.add(th);
  hand.userData = { fingers, thumb: th };
  return hand;
}
function poseHand(hand, pose, side) {
  const { fingers, thumb } = hand.userData;
  // fingers order: pinky-side -> index-side depends on side; index = 3rd/4th
  const idx = side > 0 ? [0, 1, 2, 3] : [3, 2, 1, 0]; // idx[3] = index finger (thumb side)
  const curl = (f, a) => { f.rotation.x = a; };
  hand.rotation.y = 0;
  if (pose === 'peace') {
    hand.rotation.y = -Math.PI / 2 * side; // palm toward the camera
    curl(fingers[idx[3]], 0); curl(fingers[idx[2]], 0);
    fingers[idx[3]].rotation.z = 0.3 * side; fingers[idx[2]].rotation.z = -0.22 * side;
    fingers[idx[3]].scale.set(1.15, 1.25, 1.15); fingers[idx[2]].scale.set(1.15, 1.3, 1.15);
    curl(fingers[idx[1]], 2.4); curl(fingers[idx[0]], 2.4);
    thumb.rotation.x = 1.4;
  } else if (pose === 'grip') {
    for (const f of fingers) { curl(f, 1.9); f.rotation.z = 0; f.scale.set(1, 1, 1); }
    thumb.rotation.x = 1.1;
  } else {
    fingers.forEach((f, i) => { curl(f, 0.35 + i * 0.05); f.rotation.z = 0; f.scale.set(1, 1, 1); });
    thumb.rotation.x = 0.5;
  }
}

// ring of beard round the mouth, projected onto the cheek ellipsoid (centre 0,0.05,0.012; radii 0.1, 0.08, 0.095)
function goateeGeo() {
  const N = 40, yc = 0.031, pos = [], idx = [];
  const onCheek = (x, y, lift) => {
    const q = 1 - (x / 0.1) ** 2 - ((y - 0.05) / 0.08) ** 2;
    return [x, y, 0.012 + 0.095 * Math.sqrt(Math.max(0, q)) + lift];
  };
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), up = sn > 0;
    const taper = up ? 1 : 1 - 0.3 * -sn;                              // the chin part narrows to a point
    const inner = [c * 0.026, yc + sn * (up ? 0.017 : 0.024)];          // mouth opening, a lip's gap all round
    const outer = [c * 0.04 * taper, yc + sn * (up ? 0.025 : 0.053)];   // moustache 8 mm, chin down to y -0.022
    const mid = [(inner[0] + outer[0]) / 2, (inner[1] + outer[1]) / 2];
    pos.push(...onCheek(...inner, 0.0025), ...onCheek(...mid, 0.0042), ...onCheek(...outer, 0.0025));
  }
  for (let i = 0; i < N; i++) {
    const a = i * 3, b = ((i + 1) % N) * 3;
    for (let r = 0; r < 2; r++) idx.push(a + r, a + r + 1, b + r, b + r, a + r + 1, b + r + 1); // facing out (+z)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Head + jaw/cheeks as ONE surface: the old cheek ellipsoid overlapping the head sphere left a seam where the two
// shaded differently (a two-tone band across the lower face). Each vertex of the head ellipsoid is pushed out
// along its ray from the head centre to the cheek ellipsoid with a smooth max (polynomial, h = 6 mm, so the blend
// adds at most 1.5 mm), and normals are averaged across the sphere's UV seam so nothing shows at the back.
// Head ellipsoid: centre (0,0.1,0), radii 0.115 * (0.95, 1.08, 1); cheek: centre (0,0.05,0.012), radii
// (0.1 * jaw, 0.08, 0.095 * (1 + (jaw - 1) / 2)) — the same shapes as before, just merged.
// chin (0..1, opts.chin): tapers the lower face to a narrower, slightly longer and more forward chin.
function faceGeo(jaw, chin = 0) {
  const g = new THREE.SphereGeometry(0.115, 40, 30); g.scale(0.95, 1.08, 1.0); g.translate(0, 0.1, 0);
  const P = g.attributes.position, o = [0, 0.1, 0], c = [0, 0.05, 0.012], R = [0.1 * jaw, 0.08, 0.095 * (1 + (jaw - 1) * 0.5)], h = 0.006;
  for (let i = 0; i < P.count; i++) {
    const v = [P.getX(i) - o[0], P.getY(i) - o[1], P.getZ(i) - o[2]], L = Math.hypot(...v); if (L < 1e-9) continue;
    const d = v.map(x => x / L);
    let A = 0, B = 0, C = -1;
    for (let k = 0; k < 3; k++) { const dk = d[k] / R[k], ok = (o[k] - c[k]) / R[k]; A += dk * dk; B += 2 * ok * dk; C += ok * ok; }
    const t = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A); // o is inside the cheek: the far root
    const m = Math.max(L, t), e = Math.abs(L - t), r = e < h ? m + (h - e) ** 2 / (4 * h) : m;
    let x = o[0] + d[0] * r, y = o[1] + d[1] * r, z = o[2] + d[2] * r;
    if (chin) { // below the cheekbones (y 0.085) the face narrows toward the chin point
      const low = Math.min(1, Math.max(0, (0.085 - y) / 0.085)), k = low ** 1.4;
      x *= 1 - chin * 0.42 * k; y -= chin * 0.012 * low * low; z += chin * 0.008 * k * Math.max(0, d[2]);
    }
    P.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const N = g.attributes.normal, key = (i) => `${P.getX(i).toFixed(5)},${P.getY(i).toFixed(5)},${P.getZ(i).toFixed(5)}`, sum = new Map();
  for (let i = 0; i < P.count; i++) { const k = key(i), a = sum.get(k) || [0, 0, 0]; a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); sum.set(k, a); }
  for (let i = 0; i < P.count; i++) { const a = sum.get(key(i)), l = Math.hypot(...a) || 1; N.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
  return g;
}

// ---------- character ----------
// opts: hero (bool), skin, shirt, shorts, pants(bool), hair, hairStyle ('bowl'|'short'|'long'|'pony'|'buzz'; anything else = bald),
// glasses, shoes, bag; build (override the per-person build), beard ('goatee'); skinned body only: hem (shorts
// length, default -0.3 m below the hip), arm (upper-arm thickness);
// jacket (colour: a leather biker jacket over the shirt: long sleeves, lapels, zip and snaps), brows ('thick'),
// mouth ('flat': a closed, serious mouth instead of the smile), jaw (override the per-person jaw width),
// polo (true: 系學會幹部T — a polo collar, a two-button placket and the lion logo on the left chest),
// imTee (true: 資管系服 — geometric lion on the left chest, the Information Management code print on the back),
// chin (0..1: a narrower, pointier chin)
// The head's parts never move against the head (only the head pivot turns, and the eyelids blink), so they
// are merged into one mesh per material — the small detail parts (hidden at distance) apart from the rest.
// About 15–25 pieces become 5–8: fewer draw calls for every person on screen. skip: parts that must stay
// separate (the eyelids). Only plain materials (no texture) are merged; anything else stays as it is.
const _rel = new THREE.Matrix4(), _inv = new THREE.Matrix4();
function mergeHead(head, skip) {
  head.updateMatrixWorld(true);
  _inv.copy(head.matrixWorld).invert();
  const groups = new Map(), victims = [];
  head.traverse(o => {
    if (!o.isMesh || skip.has(o) || o.material.map || !o.visible) return;
    const key = o.material.uuid + (o.userData.detail ? '|d' : '');
    if (!groups.has(key)) groups.set(key, { mat: o.material, detail: o.userData.detail, list: [] });
    groups.get(key).list.push(o);
  });
  for (const { mat, detail, list } of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map(o => {
      _rel.multiplyMatrices(_inv, o.matrixWorld);
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      return g.applyMatrix4(_rel);
    });
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.userData.detail = detail; m.userData.merged = true; m.castShadow = true;
    head.add(m);
    victims.push(...list);
  }
  for (const o of victims) o.parent.remove(o);
}

export function createCharacter(opts = {}) {
  const hero = !!opts.hero;
  // same roughness as the skinned body's vertex-coloured material, so face, neck and hands read as one skin tone
  const skin = mat(opts.skin || '#e8c3a2', { roughness: 0.82 });
  const shirt = mat(opts.jacket || opts.shirt || '#161616', { roughness: opts.jacket ? 0.4 : 0.95 });
  const shortsM = mat(opts.shorts || '#f1f0ea', { roughness: 0.9 });
  const hairM = mat(opts.hair || '#111111', { roughness: 0.45 });
  const shoeM = mat(opts.shoes || '#f5f5f2', { roughness: 0.6 });
  const soleM = mat('#bdbdb5');
  const sockM = mat('#fafafa');
  const pants = !!opts.pants;
  const sk = opts.skinned ?? SKINNED;
  const female = opts.hairStyle === 'long' || opts.hairStyle === 'pony';
  // face / build sliders (taipei-rush style), derived from the look so every NPC keeps its own face
  const id = [opts.skin, opts.shirt, opts.shorts, opts.hair, opts.hairStyle, opts.shoes, opts.bag].join('|');
  const fv = hero ? { eye: 1, gap: 1, jaw: 1, nose: 1, build: 1.04 } : {
    eye: 0.9 + hash01(id, 1) * 0.24, gap: 0.94 + hash01(id, 2) * 0.12, jaw: 0.92 + hash01(id, 3) * 0.16,
    nose: 0.85 + hash01(id, 4) * 0.35, build: (female ? 0.94 : 0.97) + hash01(id, 5) * 0.12,
  };
  if (opts.build) fv.build = opts.build;
  if (opts.jaw) fv.jaw = opts.jaw;

  const root = new THREE.Group();
  const body = pivot(0, 0, 0); root.add(body); // bobbing container
  const hips = pivot(0, 0.93, 0); body.add(hips);

  // torso (slightly sturdy build)
  const torso = pivot(0, 0, 0); hips.add(torso);
  const torsoG = geo('torso' + hero, () => { const g = new THREE.CapsuleGeometry(0.17, 0.3, 6, 14); g.scale(1.18, 1, 0.78); g.translate(0, 0.27, 0); return g; });
  if (!sk) torso.add(mesh(torsoG, shirt));
  // tee hem
  if (!sk) torso.add(mesh(geo('hem', () => new THREE.CylinderGeometry(0.205, 0.215, 0.07, 16).scale(1, 1, 0.8)), shirt, 0, 0.05, 0));
  if (hero && !opts.polo && !opts.imTee) {
    const patch = new THREE.Mesh(geo('patch', () => new THREE.PlaneGeometry(0.06, 0.06)), new THREE.MeshStandardMaterial({ map: logoTexture(), roughness: 0.8 }));
    patch.position.set(0.075, 0.43, 0.137); patch.rotation.y = 0.12; torso.add(patch);
  }
  // polo shirt (系學會幹部T): folded collar round the neck with two points at the front, a placket with two buttons,
  // the white lion logo on the wearer's left chest (+x); torso-pivot frame = root y - 0.93
  if (opts.polo) {
    const cm = mat(opts.shirt || '#1d2340', { roughness: 0.9 }), bm = mat('#11152a', { roughness: 0.4 }), y0 = -0.93;
    const collar = mesh(geo('poloCollar', () => { const g = new THREE.TorusGeometry(0.074, 0.021, 6, 20, Math.PI * 1.55); g.scale(1, 1, 0.7); g.rotateX(Math.PI / 2); g.rotateY(-2.36); return g; }), cm, 0, 1.535 + y0, -0.006);
    torso.add(collar);
    for (const sx of [-1, 1]) { // collar points lying on the chest
      const tip = mesh(geo('poloTip', () => { const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.058, 0.014), new THREE.Vector2(0.02, -0.06)]); return new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }); }), cm, 0.012 * sx, 1.535 + y0, 0.074);
      tip.scale.x = sx; tip.rotation.x = -0.35; torso.add(tip);
    }
    torso.add(mesh(geo('poloPlacket', () => new THREE.BoxGeometry(0.026, 0.11, 0.005)), cm, 0, 1.455 + y0, 0.116));
    for (const by of [1.48, 1.435]) torso.add(mesh(geo('poloBtn', () => new THREE.SphereGeometry(0.0055, 8, 6)), bm, 0, by + y0, 0.12));
    const logo = new THREE.Mesh(geo('poloLogo', () => new THREE.PlaneGeometry(0.1, 0.1)), new THREE.MeshStandardMaterial({ map: lionTexture(), transparent: true, alphaTest: 0.3, roughness: 0.85 }));
    logo.position.set(0.078, 1.37 + y0, 0.139); logo.rotation.y = 0.14; torso.add(logo);
  }
  // 資管系服: prints sit 4 mm off the cloth, bent round the torso (torsoProfile at y 1.37 front / 1.28 back)
  if (opts.imTee) {
    const y0 = -0.93, bw = fv.build, rx = 0.205 * bw + 0.004, dz = 0.5 + bw / 2;
    const front = new THREE.Mesh(geo('imLion' + bw.toFixed(2), () => curvedPrint(0.105, 0.105, rx, 0.128 * dz + 0.006, false, 6, 0.075)), new THREE.MeshStandardMaterial({ map: geoLionTexture(), transparent: true, alphaTest: 0.3, roughness: 0.85 }));
    front.position.set(0.075, 1.37 + y0, 0.009); torso.add(front);
    const backP = new THREE.Mesh(geo('imBack' + bw.toFixed(2), () => curvedPrint(0.3, 0.225, 0.19 * bw + 0.004, 0.124 * dz + 0.006, true)), new THREE.MeshStandardMaterial({ map: imBackTexture(), transparent: true, alphaTest: 0.3, roughness: 0.85 }));
    backP.position.set(0, 1.28 + y0, -0.009); torso.add(backP);
  }
  // leather biker jacket (opts.jacket colour; the sleeves come from the skinned body): open front over the tee,
  // wide lapels with silver snaps, a stand collar round the back of the neck, a slanted silver zip and pocket zips.
  // Torso-pivot frame: root y - 0.93; the chest surface is about z 0.13-0.14 between y 1.25 and 1.45 (torsoProfile).
  if (opts.jacket) {
    const L = mat(opts.jacket, { roughness: 0.32, metalness: 0.12 }), tee = mat(opts.shirt || '#232323', { roughness: 0.95 });
    const silver = mat('#d9dbde', { metalness: 0.9, roughness: 0.22 }), y0 = -0.93;
    torso.add(mesh(geo('jkTee', () => { const sh = new THREE.Shape([new THREE.Vector2(-0.05, 0.11), new THREE.Vector2(0.05, 0.11), new THREE.Vector2(0.012, -0.12), new THREE.Vector2(-0.012, -0.12)]); return new THREE.ShapeGeometry(sh); }), tee, 0, 1.39 + y0, 0.139));
    for (const s of [-1, 1]) {
      // lapel: from the collar (outer, high) down to the chest (inner, low), leaving the tee showing in a V
      const lap = mesh(geo('jkLapel', () => new THREE.BoxGeometry(0.05, 0.22, 0.012)), L, 0.072 * s, 1.36 + y0, 0.136);
      lap.rotation.set(-0.12, 0.28 * s, -0.32 * s); torso.add(lap);
      torso.add(mesh(geo('jkSnap', () => new THREE.SphereGeometry(0.0068, 8, 6)), silver, 0.098 * s, 1.445 + y0, 0.12));
      torso.add(mesh(geo('jkSnap', () => new THREE.SphereGeometry(0.0068, 8, 6)), silver, 0.05 * s, 1.27 + y0, 0.146));
      const pz = mesh(geo('jkPocket', () => new THREE.BoxGeometry(0.075, 0.005, 0.005)), silver, 0.115 * s, 1.13 + y0, 0.126); pz.rotation.z = 0.55 * s; torso.add(pz);
    }
    const zip = mesh(geo('jkZip', () => new THREE.BoxGeometry(0.0055, 0.25, 0.006)), silver, 0.04, 1.13 + y0, 0.128); zip.rotation.z = -0.12; torso.add(zip);
    const col = mesh(geo('jkCollar', () => { const g = new THREE.TorusGeometry(0.079, 0.017, 6, 18, Math.PI * 1.4); g.rotateX(Math.PI / 2); g.rotateY(-2.513); return g; }), L, 0, 1.54 + y0, -0.004);
    torso.add(col);
  }
  if (opts.bag) {
    const bag = mesh(geo('bag', () => new THREE.BoxGeometry(0.28, 0.34, 0.13)), mat(opts.bag), 0, 0.32, -0.2); torso.add(bag);
  }
  // neck + head
  if (!sk) torso.add(mesh(geo('neck', () => new THREE.CylinderGeometry(0.055, 0.062, 0.1, 10)), skin, 0, 0.62, 0));
  const head = pivot(0, 0.68, 0.005); torso.add(head);
  head.scale.setScalar(hero ? 1.14 : 1.08);
  // head with the jaw/cheeks merged into one smooth surface (faceGeo), per jaw width
  const jk = Math.round(fv.jaw * 100) / 100, ck = Math.round((opts.chin || 0) * 100) / 100;
  head.add(mesh(geo('face' + jk + 'c' + ck, () => faceGeo(jk, ck)), skin));
  // the cheek frame stays (empty) so the goatee can follow the jaw width
  const cheek = new THREE.Group(); cheek.scale.set(jk, 1, 1 + (jk - 1) * 0.5); head.add(cheek);
  for (const s of [-1, 1]) head.add(mesh(geo('ear', () => { const g = new THREE.SphereGeometry(0.026, 8, 8); g.scale(0.5, 1, 0.8); return g; }), skin, 0.108 * s, 0.1, 0));

  // face
  const lids = [];
  if (hero || opts.face !== false) {
    const eyeW = mat('#ffffff', { roughness: 0.3 }), eyeB = mat('#1b120c', { roughness: 0.2 });
    for (const s of [-1, 1]) {
      const ex = 0.038 * s * fv.gap;
      const e = mesh(geo('eyeW', () => { const g = new THREE.SphereGeometry(0.016, 10, 8); g.scale(1.25, 0.75, 0.5); return g; }), eyeW, ex, 0.103, 0.104);
      e.scale.setScalar(fv.eye);
      head.add(e);
      const pu = mesh(geo('pupil', () => { const g = new THREE.SphereGeometry(0.0105, 10, 8); g.scale(1, 1, 0.5); return g; }), eyeB, ex, 0.102, 0.1095); pu.scale.setScalar(fv.eye); head.add(pu);
      // eyelid: skin-coloured cap shown for a moment when the character blinks (animate)
      const lid = mesh(geo('lid', () => { const g = new THREE.SphereGeometry(0.0172, 10, 8); g.scale(1.32, 0.86, 0.62); return g; }), skin, ex, 0.103, 0.1068);
      lid.scale.setScalar(fv.eye); lid.visible = false; lid.castShadow = false; head.add(lid); lids.push(lid);
      // brows (mostly hidden under the bangs, peek out with expressions)
      if (opts.brows === 'thick') { const b = mesh(geo('browThick', () => new THREE.BoxGeometry(0.036, 0.0105, 0.008)), hairM, 0.041 * s, 0.13, 0.111); b.rotation.z = -0.06 * s; head.add(b); }
      else head.add(mesh(geo('brow', () => new THREE.BoxGeometry(0.03, 0.006, 0.006)), hairM, 0.04 * s, 0.137, 0.112));
    }
    const nose = mesh(geo('nose', () => { const g = new THREE.SphereGeometry(0.014, 8, 8); g.scale(1, 0.9, 1); return g; }), skin, 0, 0.07, 0.113); nose.scale.setScalar(fv.nose); head.add(nose);
    if (opts.mouth === 'flat') { // closed, slightly full lips: a serious face
      head.add(mesh(geo('lipU', () => { const g = new THREE.CapsuleGeometry(0.0042, 0.026, 3, 8); g.rotateZ(Math.PI / 2); return g; }), mat('#a8695c'), 0, 0.041, 0.106));
      head.add(mesh(geo('lipL', () => { const g = new THREE.CapsuleGeometry(0.005, 0.022, 3, 8); g.rotateZ(Math.PI / 2); return g; }), mat('#b97a6b'), 0, 0.0335, 0.105));
    } else {
      const mouth = mesh(geo('mouth', () => new THREE.TorusGeometry(0.018, 0.0035, 4, 10, Math.PI)), mat('#8a4a3e'), 0, 0.035, 0.103);
      mouth.rotation.z = Math.PI; head.add(mouth);
    }
  }
  // neat goatee: a moustache joined to a chin beard in a ring round the mouth, laid 3.5 mm over the cheek shell
  // and parented to the cheek so it follows the per-person jaw width
  if (opts.beard === 'goatee') cheek.add(mesh(geo('goatee', goateeGeo), mat(opts.hair || '#141010', { roughness: 0.95 })));
  // hair
  const hs = opts.hairStyle || (hero ? 'bowl' : 'short');
  if (hs === 'buzz') {
    // 平頭 / buzz cut: one thin cap hugging the scalp, the hairline a little higher than 'short'
    // matte, stubbly: no shine, the hairline high on the forehead, lower at the back
    const buzzM = mat(opts.hair || '#111111', { roughness: 1 });
    head.add(mesh(geo('buzzCap', () => { const g = new THREE.SphereGeometry(0.1172, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.36); g.rotateX(-0.22); g.scale(0.96, 1.09, 1.02); g.translate(0, 0.104, -0.003); return g; }), buzzM));
  } else if (hs === 'bowl' || hs === 'short' || hs === 'long' || hs === 'pony' || hs === 'curly') {
    // cap
    // SphereGeometry phi: front (+z) is phi = PI/2, back (-z) is 3PI/2
    head.add(mesh(geo('hairCap', () => { const g = new THREE.SphereGeometry(0.127, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.4); g.scale(1.0, 1.1, 1.04); g.translate(0, 0.108, -0.004); return g; }), hairM));
    if (hs === 'bowl') {
      // full straight bangs (bowl cut) ending just above the glasses — thick and rounded like the photo
      head.add(mesh(geo('bangs', () => { const g = new THREE.SphereGeometry(0.132, 28, 8, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.2, Math.PI * 0.22); g.scale(1.02, 1.12, 1.08); g.translate(0, 0.1, 0); return g; }), hairM));
      // sides down to ear tops
      head.add(mesh(geo('bowlSide', () => { const g = new THREE.SphereGeometry(0.135, 28, 12, Math.PI * 0.84, Math.PI * 1.32, Math.PI * 0.08, Math.PI * 0.42); g.scale(1.05, 1.08, 1.06); g.translate(0, 0.108, -0.004); return g; }), hairM));
      // extra crown volume (mushroom silhouette)
      head.add(mesh(geo('bowlCrown', () => { const g = new THREE.SphereGeometry(0.136, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.32); g.scale(1.04, 1.12, 1.06); g.translate(0, 0.112, -0.006); return g; }), hairM));
      // back down to the nape
      head.add(mesh(geo('bowlBack', () => { const g = new THREE.SphereGeometry(0.128, 24, 10, Math.PI * 1.15, Math.PI * 0.7, Math.PI * 0.35, Math.PI * 0.32); g.scale(1, 1.1, 1.05); g.translate(0, 0.1, -0.006); return g; }), hairM));
      // fringe tips for a cut-hair texture
      for (let i = -4; i <= 4; i++) {
        const a = i * 0.16;
        const tip = mesh(geo('tip', () => { const g = new THREE.ConeGeometry(0.016, 0.034, 5); g.rotateX(Math.PI); return g; }), hairM,
          Math.sin(a) * 0.128, 0.148, Math.cos(a) * 0.128 + 0.004);
        tip.rotation.y = a; tip.rotation.x = -0.25;
        head.add(tip);
      }
    } else if (hs === 'short') {
      head.add(mesh(geo('shortFr', () => { const g = new THREE.SphereGeometry(0.131, 20, 8, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.25, Math.PI * 0.1); g.translate(0, 0.105, 0); return g; }), hairM));
      head.add(mesh(geo('shortBk', () => { const g = new THREE.SphereGeometry(0.129, 20, 8, Math.PI * 0.9, Math.PI * 1.2, Math.PI * 0.25, Math.PI * 0.3); g.translate(0, 0.103, 0); return g; }), hairM));
    } else {
      // CylinderGeometry theta 0 is the front (+z): start at 0.25π so the 1.5π sheet wraps the back and sides and leaves the face open
      head.add(mesh(geo('longBack', () => { const g = new THREE.CylinderGeometry(0.125, 0.11, 0.34, 18, 1, true, Math.PI * 0.25, Math.PI * 1.5); g.translate(0, 0.0, -0.01); return g; }), hairM));
      if (hs !== 'curly') head.add(mesh(geo('longFr', () => { const g = new THREE.SphereGeometry(0.132, 20, 8, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.2, Math.PI * 0.2); g.translate(0, 0.1, 0); return g; }), hairM));
      if (hs === 'pony') head.add(mesh(geo('pony', () => { const g = new THREE.CapsuleGeometry(0.035, 0.16, 4, 8); return g; }), hairM, 0, 0.08, -0.15));
      if (hs === 'curly') {
        // 捲髮長髮 (漢克): the long dark sheet underneath plus one merged mesh of curls over the crown, the sides and the back, falling to the shoulders,
        // leaving the face open; a deterministic scatter so every curly head looks the same
        head.add(mesh(geo('curls', () => {
          const parts = []; let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
          for (let i = 0; i < 420; i++) {
            const th = rnd() * Math.PI * 2, el = -1.05 + rnd() * 2.45; // around the head, from the shoulders to the crown
            const front = Math.cos(th); // +z = face
            if (front > 0.45 && el < 0.9) continue;            // keep the face clear
            if (front > 0.1 && el < 0.15) continue;             // and the cheeks
            const r = 0.133 + rnd() * 0.012, c = Math.cos(el);
            let x = Math.sin(th) * c * r * 0.98, y = 0.1 + Math.sin(el) * r * 1.08, z = Math.cos(th) * c * r;
            if (el < 0) { y -= 0.04 * -el; x *= 1 + 0.25 * -el; z *= 1 + 0.12 * -el; } // fuller as it falls to the shoulders
            if (el < -0.5 && front > -0.2) continue; // below the ears only behind: the hair falls down the back, not over the shoulders' front
            const sg = new THREE.SphereGeometry(0.017 + rnd() * 0.009, 6, 4); sg.translate(x, y, z); parts.push(sg);
          }
          const geom = mergeGeometries(parts.map(gg => gg.toNonIndexed()), false); geom.computeVertexNormals(); return geom;
        }), hairM));
      }
    }
  }
  // glasses (thin round frames, like the photo)
  if (opts.glasses) {
    const fm = mat(opts.glassesColor || '#cfc6b6', { metalness: 0.7, roughness: 0.3 });
    const lensM = new THREE.MeshStandardMaterial({ color: '#dfefff', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2 });
    const g = pivot(0, 0.104, 0.112); head.add(g);
    for (const s of [-1, 1]) {
      g.add(mesh(geo('rim', () => new THREE.TorusGeometry(0.03, 0.0038, 6, 20)), fm, 0.04 * s, 0, 0));
      const lens = new THREE.Mesh(geo('lens', () => new THREE.CircleGeometry(0.029, 16)), lensM); lens.position.set(0.04 * s, 0, 0.001); g.add(lens);
      const temple = mesh(geo('temple', () => { const gg = new THREE.BoxGeometry(0.004, 0.005, 0.12); gg.translate(0, 0, -0.06); return gg; }), fm, 0.071 * s, 0.004, 0);
      temple.rotation.y = -0.07 * s; g.add(temple);
    }
    g.add(mesh(geo('bridge', () => new THREE.BoxGeometry(0.022, 0.004, 0.004)), fm, 0, 0.008, 0));
  }

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = pivot(0.235 * s, 0.5, 0); torso.add(sh);
    if (!sk) sh.add(mesh(geo('shoulder', () => { const g = new THREE.SphereGeometry(0.08, 12, 10); g.scale(1, 0.85, 1); return g; }), shirt));
    const sleeve = mesh(geo('sleeve', () => { const g = new THREE.CylinderGeometry(0.078, 0.072, 0.17, 12); g.translate(0, -0.075, 0); return g; }), shirt);
    if (!sk) sh.add(sleeve);
    sh.rotation.order = 'ZYX'; // twist first, then swing — lets the ✌ pose bend the elbow upward
    if (!sk) sh.add(mesh(geo('uarm', () => { const g = new THREE.CylinderGeometry(0.062, 0.055, 0.16, 12); g.translate(0, -0.2, 0); return g; }), skin));
    const el = pivot(0, -0.26, 0); sh.add(el);
    if (!sk) el.add(mesh(geo('elbow', () => new THREE.SphereGeometry(0.055, 10, 8)), skin));
    if (!sk) el.add(mesh(geo('farm', () => { const g = new THREE.CylinderGeometry(0.054, 0.042, 0.21, 12); g.translate(0, -0.105, 0); return g; }), skin));
    let hand;
    if (hero) { hand = buildHand(skin, s); hand.position.y = -0.215; el.add(hand); poseHand(hand, 'relaxed', s); }
    else if (sk) { // mitten hand: palm + fingers in one, thumb in front (palms face the thighs)
      el.add(mesh(geo('mitt', () => { const g = new THREE.CapsuleGeometry(0.026, 0.055, 4, 10); g.scale(1, 1, 0.6); g.translate(0, -0.262, 0); return g; }), skin));
      el.add(mesh(geo('thumbN', () => { const g = new THREE.CapsuleGeometry(0.0105, 0.03, 3, 6); g.rotateX(-0.45); g.translate(0, -0.238, 0.02); return g; }), skin));
    } else el.add(mesh(geo('fist', () => { const g = new THREE.SphereGeometry(0.042, 8, 8); g.scale(0.9, 1.2, 0.7); g.translate(0, -0.24, 0); return g; }), skin));
    if (hero && s < 0) { // black wristband on right wrist (character's right = -x)
      el.add(mesh(geo('band', () => new THREE.TorusGeometry(0.04, 0.008, 6, 16).rotateX(Math.PI / 2)), mat('#0c0c0c', { roughness: 0.4 }), 0, -0.19, 0));
    }
    sh.rotation.z = 0.06 * s;
    arms.push({ sh, el, hand, s });
  }

  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const hp = pivot(0.1 * s, 0.02, 0); hips.add(hp);
    if (sk) { /* legs are part of the skinned body */ } else if (pants) hp.add(mesh(geo('pantU', () => { const g = new THREE.CylinderGeometry(0.095, 0.078, 0.44, 12); g.translate(0, -0.2, 0); return g; }), shortsM));
    else {
      hp.add(mesh(geo('shortL', () => { const g = new THREE.CylinderGeometry(0.1, 0.108, 0.3, 12); g.translate(0, -0.12, 0); return g; }), shortsM));
      hp.add(mesh(geo('thigh', () => { const g = new THREE.CylinderGeometry(0.075, 0.064, 0.18, 10); g.translate(0, -0.33, 0); return g; }), skin));
    }
    const kn = pivot(0, -0.43, 0); hp.add(kn);
    if (!sk) kn.add(mesh(geo('knee', () => new THREE.SphereGeometry(0.064, 10, 8)), pants ? shortsM : skin));
    if (!sk) kn.add(mesh(geo(pants ? 'pantL' : 'shin', () => { const g = new THREE.CylinderGeometry(pants ? 0.072 : 0.06, pants ? 0.066 : 0.046, 0.38, 10); g.translate(0, -0.2, 0); return g; }), pants ? shortsM : skin));
    if (!sk && !pants) kn.add(mesh(geo('sock', () => { const g = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10); g.translate(0, -0.39, 0); return g; }), sockM));
    const ft = pivot(0, -0.43, 0); kn.add(ft);
    ft.add(mesh(geo('shoe', () => { const g = new THREE.CapsuleGeometry(0.052, 0.13, 4, 10); g.rotateX(Math.PI / 2); g.scale(1.05, 0.85, 1); g.translate(0, -0.035, 0.05); return g; }), shoeM));
    ft.add(mesh(geo('sole', () => { const g = new THREE.BoxGeometry(0.1, 0.022, 0.25); g.translate(0, -0.075, 0.05); return g; }), soleM));
    legs.push({ hp, kn, ft, s });
  }
  let bodyMesh = null;
  if (sk) bodyMesh = buildSkinnedBody({ root, hips, torso, head, arms, legs }, { longSleeve: !!opts.jacket, shirt: opts.jacket || opts.shirt || '#161616', bottom: opts.shorts || '#f1f0ea', skin: opts.skin || '#e8c3a2', pants, female, build: fv.build, hem: opts.hem, arm: opts.arm });
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });

  // small parts (eyes, fingers, glasses, hair tips…) don't cast shadows and can be hidden at distance
  root.traverse(o => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.userData.detail = o.geometry.boundingSphere.radius < 0.04;
  });
  mergeHead(head, new Set(lids));
  const details = [];
  root.traverse(o => { if (o.isMesh && o.userData.detail) { o.castShadow = false; details.push(o); } });
  const ch = { root, body, hips, torso, head, arms, legs, phase: 0, hero, pose: null, poseT: 0, blend: 0, details, detailOn: true, bodyMesh, lids, blinkT: 1 + Math.random() * 4 };
  ch.setDetail = (on) => { if (ch.detailOn === on) return; ch.detailOn = on; for (const d of details) d.visible = on; };
  ch.setHandPose = (pose) => { if (hero) for (const a of arms) poseHand(a.hand, pose, a.s); };
  ch.update = (dt, st) => animate(ch, dt, st);
  // free what belongs to this figure alone (the merged head parts, the skinned body); shared parts stay
  ch.dispose = () => { root.traverse(o => { if (o.isMesh && o.userData.merged) o.geometry.dispose(); }); if (bodyMesh) { bodyMesh.geometry.dispose(); bodyMesh.skeleton?.dispose(); } };
  return ch;
}

const lerp = (a, b, t) => a + (b - a) * t;

// st: {speed, air, mode:'foot'|'ride'|'drive'|'down', pose:'peace'|'cheer'|'wave'|'give'|'phone'|'talk'|'look'|null}
function animate(ch, dt, st) {
  const sp = st.speed || 0;
  // blink every 2–6 s (eyelids show for ~0.13 s)
  if (ch.lids.length) { ch.blinkT -= dt; const shut = ch.blinkT < 0.13 && ch.detailOn; for (const l of ch.lids) l.visible = shut; if (ch.blinkT <= 0) ch.blinkT = 2.2 + Math.random() * 3.6; }
  const k = Math.min(1, dt * 12);
  const [aR, aL] = ch.arms; // s=-1 (right), s=+1 (left)
  const [lR, lL] = ch.legs;
  ch.poseT += dt;
  let t = { hipsY: 0.93, bob: 0, lean: 0, headX: 0, headZ: 0, headY: 0,
    shR: [0, 0, -0.06], shL: [0, 0, 0.06], elR: 0, elL: 0, hpR: 0, hpL: 0, knR: 0, knL: 0, ftR: 0, ftL: 0, torsoY: 0, rootRotX: 0 };
  if (st.mode === 'down') {
    t.rootRotX = -Math.PI / 2 * 0.95; t.hipsY = 0.2;
  } else if (st.mode === 'sit') {
    t.hipsY = 0.5; t.hpR = t.hpL = -1.5; t.knR = t.knL = 1.5;
    t.shR = [-0.7, 0, -0.1]; t.shL = [-0.7, 0, 0.1]; t.elR = t.elL = -0.9;
    t.headX = Math.sin(ch.poseT * 0.5) * 0.08;
  } else if (st.mode === 'ride' || st.mode === 'drive') {
    t.hipsY = st.mode === 'ride' ? 0.78 : 0.55;
    t.hpR = t.hpL = -1.45; t.knR = t.knL = st.mode === 'ride' ? 1.2 : 1.5;
    t.shR = [-1.05, 0, -0.15]; t.shL = [-1.05, 0, 0.15]; t.elR = t.elL = -0.5;
    t.lean = st.mode === 'ride' ? 0.12 : 0;
    ch.setHandPose('grip');
  } else if (st.air) {
    t.hpR = -0.7; t.knR = 1.2; t.hpL = 0.25; t.knL = 0.4;
    t.shR = [-0.4, 0, -0.5]; t.shL = [0.3, 0, 0.5]; t.elR = -0.5; t.elL = -0.4;
  } else if (sp > 0.3) {
    const run = Math.min(1, Math.max(0, (sp - 4) / 4));
    ch.phase += dt * (sp * 1.55 + 2);
    const s = Math.sin(ch.phase), c = Math.cos(ch.phase);
    const amp = lerp(0.55, 0.95, run);
    t.hpR = s * amp; t.hpL = -s * amp;
    t.knR = Math.max(0, -c) * lerp(0.7, 1.5, run) + 0.1; t.knL = Math.max(0, c) * lerp(0.7, 1.5, run) + 0.1;
    t.ftR = -s * 0.2; t.ftL = s * 0.2;
    t.shR = [-s * amp * 0.85, 0, -0.08]; t.shL = [s * amp * 0.85, 0, 0.08];
    t.elR = -0.25 - run * 1.0; t.elL = -0.25 - run * 1.0;
    t.bob = Math.abs(c) * lerp(0.03, 0.07, run);
    t.lean = run * 0.18; t.torsoY = s * 0.08;
    if (!ch.pose) ch.setHandPose(run > 0.5 ? 'grip' : 'relaxed');
  } else {
    // idle breathing
    t.bob = Math.sin(ch.poseT * 2) * 0.006; t.headX = Math.sin(ch.poseT * 0.7) * 0.04;
    t.shR = [0.03, 0, -0.07 - Math.sin(ch.poseT * 2) * 0.01]; t.shL = [0.03, 0, 0.07 + Math.sin(ch.poseT * 2) * 0.01];
    t.elR = t.elL = -0.12;
    if (!ch.pose) ch.setHandPose('relaxed');
  }
  // overlay poses
  if (st.pose === 'peace') {
    // like the photo: right hand ✌ next to the face, head tilted
    t.shR = [0, Math.PI / 2, -1.25]; t.elR = 2.15; t.headZ = -0.16; t.headX = 0.05;
    ch.setHandPose('peace');
  } else if (st.pose === 'cheer') {
    t.shR = [-2.9, 0, -0.3]; t.shL = [-2.9, 0, 0.3]; t.elR = t.elL = -0.2;
    t.bob += Math.abs(Math.sin(ch.poseT * 8)) * 0.12;
    ch.setHandPose('peace');
  } else if (st.pose === 'wave') {
    t.shL = [-2.5, 0, 0.6 + Math.sin(ch.poseT * 9) * 0.3]; t.elL = -0.4;
  } else if (st.pose === 'give') {
    t.shR = [-1.4, 0.3, -0.1]; t.elR = -0.2;
  } else if (st.pose === 'phone') {
    // looking down at a phone held in the right hand (thumb scrolling)
    t.shR = [-0.55, 0.35, -0.25]; t.elR = -1.75; t.shL = [-0.35, -0.3, 0.2]; t.elL = -1.3;
    t.headX = 0.42 + Math.sin(ch.poseT * 1.3) * 0.03;
    ch.setHandPose('grip');
  } else if (st.pose === 'talk') {
    // chatting: one hand gestures, the head nods now and then
    const g = Math.sin(ch.poseT * 2.3) * 0.5 + 0.5;
    t.shR = [-0.5 - g * 0.5, 0.2, -0.2]; t.elR = -0.9 - g * 0.4;
    t.headX = Math.max(0, Math.sin(ch.poseT * 1.7)) * 0.12; t.headZ = Math.sin(ch.poseT * 0.6) * 0.06;
  } else if (st.pose === 'guitar') {
    // playing a guitar held across the body (漢克, js/hank.js): left hand up the neck, right hand strumming over the
    // sound hole, head tipped down toward the strings
    const st2 = Math.sin(ch.poseT * 15);
    t.shR = [-0.45 + st2 * 0.12, 0.45, -0.2]; t.elR = -1.45 + st2 * 0.12;
    t.shL = [-1.05, -0.55, 0.5]; t.elL = -0.55;
    t.headX = 0.22; t.headZ = Math.sin(ch.poseT * 1.3) * 0.08;
    t.bob += Math.abs(Math.sin(ch.poseT * 4)) * 0.01;
  } else if (st.pose === 'look') {
    // looking around (waiting for someone)
    t.headY = Math.sin(ch.poseT * 0.8) * 0.75; t.headX = -0.05;
  }
  ch.pose = st.pose || null;

  ch.hips.position.y = lerp(ch.hips.position.y, t.hipsY, k);
  ch.body.position.y = t.bob;
  ch.root.rotation.x = lerp(ch.root.rotation.x, t.rootRotX, Math.min(1, dt * 6));
  ch.torso.rotation.x = lerp(ch.torso.rotation.x, t.lean, k);
  ch.torso.rotation.y = lerp(ch.torso.rotation.y, t.torsoY, k);
  ch.head.rotation.x = lerp(ch.head.rotation.x, t.headX, k);
  ch.head.rotation.z = lerp(ch.head.rotation.z, t.headZ, k);
  if (st.mode !== 'drive') ch.head.rotation.y = lerp(ch.head.rotation.y, t.headY, Math.min(1, dt * 4)); // (the helicopter pilot turns his own, airdrop.js)
  const setRot = (o, r) => { o.rotation.x = lerp(o.rotation.x, r[0], k); o.rotation.y = lerp(o.rotation.y, r[1], k); o.rotation.z = lerp(o.rotation.z, r[2], k); };
  setRot(aR.sh, t.shR); setRot(aL.sh, t.shL);
  aR.el.rotation.x = lerp(aR.el.rotation.x, t.elR, k); aL.el.rotation.x = lerp(aL.el.rotation.x, t.elL, k);
  lR.hp.rotation.x = lerp(lR.hp.rotation.x, t.hpR, k); lL.hp.rotation.x = lerp(lL.hp.rotation.x, t.hpL, k);
  lR.kn.rotation.x = lerp(lR.kn.rotation.x, t.knR, k); lL.kn.rotation.x = lerp(lL.kn.rotation.x, t.knL, k);
  lR.ft.rotation.x = lerp(lR.ft.rotation.x, t.ftR, k); lL.ft.rotation.x = lerp(lL.ft.rotation.x, t.ftL, k);
}

// Random student look for NPCs
const SHIRTS = ['#e63946', '#457b9d', '#2a9d8f', '#f1faee', '#264653', '#e9c46a', '#8d99ae', '#ffffff', '#6a4c93', '#ff8fab', '#1d3557', '#3a5a40', '#bc6c25', '#adb5bd'];
const BOTTOMS = ['#2b2d42', '#1d3557', '#5c677d', '#e5e5e5', '#a68a64', '#333333', '#4361ee'];
const HAIRS = ['#111', '#1a1410', '#2b1d14', '#3b2a1e', '#6b4a2e'];
const BAGS = ['#222', '#3d405b', '#81b29a', '#e07a5f', '#f2cc8f', null, null];
const SKINS = ['#efd0b5', '#e8c3a2', '#d9ad88', '#c99a74', '#f3d9c4'];
export function randomStudent(rnd) {
  const pick = a => a[Math.floor(rnd() * a.length)];
  const female = rnd() < 0.48;
  return {
    skin: pick(SKINS), shirt: pick(SHIRTS), shorts: pick(BOTTOMS), pants: rnd() < 0.55, hair: pick(HAIRS),
    hairStyle: female ? (rnd() < 0.5 ? 'long' : 'pony') : 'short', glasses: rnd() < 0.35, shoes: pick(['#f5f5f2', '#222', '#c0392b', '#7f8c8d']),
    bag: pick(BAGS), face: true,
  };
}
