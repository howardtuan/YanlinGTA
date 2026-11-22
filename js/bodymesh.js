// Continuous skinned body (the taipei-rush.app way): torso + neck, both arms and both legs are swept from
// cross-sections into ONE SkinnedMesh. Its bones are the character's existing pivots (hips, torso, head,
// shoulder / elbow, hip / knee / foot), so animate() in character.js drives it unchanged. Skin weights blend
// across the joints — elbows and knees bend like one sleeve, shoulders and hips melt into the torso — so
// there are no ball joints any more. Clothes are vertex colours (shirt with a sleeve hem, trousers or shorts
// with socks); the head, hands and shoes stay rigid parts on their pivots. One draw call per body.
import * as THREE from 'three';

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
const N = 14; // segments around every section

// rings: [{ y, rx, rz, cx, cz, e, w: [[bone, weight], …], col }] in ascending y; caps close both ends
function sweep(rings0, M, out) {
  // sharp clothing edges: where the colour changes, add a ring just below the upper one in the lower colour,
  // shaped like the narrower of the two — so a hem's lip belongs to the outer cloth (sleeve, tee, shorts) and
  // a neckline still slopes in — and the colour switches within half a millimetre instead of smearing
  const rings = [];
  rings0.forEach((r, j) => {
    const p = rings0[j - 1];
    if (p && !p.col.equals(r.col)) rings.push({ ...(p.rx < r.rx ? p : r), y: r.y - 0.0006, col: p.col, w: r.w, cap: undefined });
    rings.push(r);
  });
  const base = out.pos.length / 3, v = new THREE.Vector3();
  const push = (x, y, z, r, sa = 0, ca = 1) => {
    v.set(x, y, z).applyMatrix4(M); out.pos.push(v.x, v.y, v.z);
    out.ref.push(r.col); out.ao.push(r.ao ? r.ao(sa, ca) : 1);
    const w = r.w.slice(0, 4); while (w.length < 4) w.push([0, 0]);
    for (const [b, k] of w) { out.si.push(b); out.sw.push(k); }
  };
  for (const r of rings) {
    const e = r.e || 2, p = (t) => Math.sign(t) * Math.pow(Math.abs(t), 2 / e);
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a); push((r.cx || 0) + r.rx * p(sa), r.y, (r.cz || 0) + r.rz * p(ca), r, sa, ca); }
  }
  for (let j = 0; j + 1 < rings.length; j++) for (let i = 0; i < N; i++) {
    const a = base + j * N + i, b = base + j * N + (i + 1) % N, c = a + N, d = b + N;
    out.idx.push(a, b, c, b, d, c);
  }
  const lo = rings[0], hi = rings[rings.length - 1];
  const cb = out.pos.length / 3; push(lo.cx || 0, lo.y - (lo.cap ?? 0.01), lo.cz || 0, lo);
  for (let i = 0; i < N; i++) out.idx.push(cb, base + (i + 1) % N, base + i);
  const ct = out.pos.length / 3, top = base + (rings.length - 1) * N; push(hi.cx || 0, hi.y + (hi.cap ?? 0.01), hi.cz || 0, hi);
  for (let i = 0; i < N; i++) out.idx.push(ct, top + i, top + (i + 1) % N);
}
// piecewise-linear bone weights along a limb: keys [[y, [[bone, w], …]], …] (descending y)
function wAt(keys, y) {
  if (y >= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [y0, a] = keys[i], [y1, b] = keys[i + 1];
    if (y <= y0 && y >= y1) {
      const t = (y0 - y) / (y0 - y1), m = new Map();
      for (const [bn, k] of a) m.set(bn, (m.get(bn) || 0) + k * (1 - t));
      for (const [bn, k] of b) m.set(bn, (m.get(bn) || 0) + k * t);
      return [...m].filter(([, k]) => k > 1e-4);
    }
  }
  return keys[keys.length - 1][1];
}

// torso cross-sections in the root frame (bind pose): [y, half width, half depth, z offset]; f = 1 for the female build.
// Exported so clothes worn over the body (jersey.js) can follow it; widths scale by build, depths by (0.5 + build / 2).
export const torsoProfile = (f) => [
  [0.83, 0.1, 0.08, 0], [0.88, 0.165 + 0.01 * f, 0.115, 0], [0.925, 0.188 + 0.012 * f, 0.126, -0.004],
  [0.97, 0.19 + 0.012 * f, 0.127, -0.005], [1.06, 0.168 - 0.022 * f, 0.112 - 0.008 * f, 0],
  [1.18, 0.178 - 0.015 * f, 0.12, 0.005], [1.3, 0.195 - 0.018 * f, 0.13 + 0.008 * f, 0.012],
  [1.4, 0.212 - 0.02 * f, 0.125, 0.004], [1.46, 0.212 - 0.02 * f, 0.112, -0.006], [1.5, 0.18 - 0.015 * f, 0.096, -0.01], [1.525, 0.13 - 0.012 * f, 0.084, -0.01],
  [1.548, 0.072, 0.062, -0.002], [1.6, 0.056, 0.054, 0.004], [1.66, 0.05, 0.048, 0.008],
];
// leg radius along the hip-pivot frame: [y, r] ascending (shorts add a loose offset on top)
export const LEG_PROF = [
  [-0.88, 0.04], [-0.83, 0.043], [-0.77, 0.047], [-0.66, 0.06], [-0.56, 0.066], [-0.48, 0.062], [-0.43, 0.064],
  [-0.37, 0.07], [-0.28, 0.08], [-0.15, 0.09], [-0.06, 0.096], [0.0, 0.085], [0.05, 0.06], [0.09, 0.03], // top stays inside the pelvis
];

// ch: the rig from createCharacter; o: { shirt, bottom, skin, sock, pants, female, build, hem (shorts length, e.g. -0.4
//   for knee-length basketball shorts; default -0.3), arm (upper-arm thickness, 1 = default),
//   belly (0..1: a round tummy and fuller hips and thighs, for a chubby build) }
export function buildSkinnedBody(ch, o) {
  const { root, hips, torso, head, arms, legs } = ch;
  root.updateMatrixWorld(true);
  const toRoot = (obj) => obj.matrixWorld.clone().premultiply(root.matrixWorld.clone().invert());
  const bones = [hips, torso, head, arms[0].sh, arms[0].el, arms[1].sh, arms[1].el, legs[0].hp, legs[0].kn, legs[0].ft, legs[1].hp, legs[1].kn, legs[1].ft];
  const B = { hips: 0, torso: 1, head: 2 };
  const C = (c) => new THREE.Color(c);
  const shirt = C(o.shirt), bottom = C(o.bottom), skin = C(o.skin), sock = C(o.sock || '#fafafa');
  const out = { pos: [], ref: [], ao: [], si: [], sw: [], idx: [] };
  const f = o.female ? 1 : 0, bw = o.build || 1; // build: 1 = default, >1 broader
  // baked ambient occlusion (vertex shade): armpits, crotch, inner arms and thighs, backs of the knees
  const bump = (y, c, wd) => Math.exp(-(((y - c) / wd) ** 2));
  const bel = o.belly || 0;
  const tum = (y) => bel * bump(y, 1.12, 0.17); // how much the tummy pushes out at this height (0 away from the waist)

  // ---- torso + neck (root frame) ----
  const prof = torsoProfile(f);
  const tw = [[1.6, [[B.head, 1]]], [1.548, [[B.torso, 0.65], [B.head, 0.35]]], [1.5, [[B.torso, 1]]], [1.1, [[B.torso, 1]]], [0.98, [[B.hips, 1]]]];
  const rings = [];
  for (const [y, rx, rz, cz] of prof) {
    const col = y >= 1.54 ? skin : y >= 0.95 ? shirt : bottom;
    const ao = (sa, ca) => 1 - 0.26 * bump(y, 1.37, 0.07) * Math.abs(sa) ** 6 - 0.16 * bump(y, 0.86, 0.05) * Math.max(0, -ca * 0.5 + 0.5) - (y > 1.548 ? 0.12 * bump(y, 1.56, 0.02) : 0);
    rings.push({ y, rx: (rx + 0.035 * tum(y)) * bw, rz: (rz + 0.06 * tum(y)) * (0.5 + bw / 2), cz: cz + 0.035 * tum(y), e: y < 1.54 ? 2.5 : 2, w: wAt(tw, y), col, ao });
    if (y === 0.925) rings.push({ y: 0.94, rx: (rx + 0.004 + 0.035 * tum(0.94)) * bw, rz: (rz + 0.004 + 0.06 * tum(0.94)) * (0.5 + bw / 2), cz: cz + 0.035 * tum(0.94), e: 2.5, w: wAt(tw, 0.94), col: bottom },
      { y: 0.95, rx: (rx + 0.014 + 0.035 * tum(0.95)) * bw, rz: (rz + 0.012 + 0.06 * tum(0.95)) * (0.5 + bw / 2), cz: cz + 0.035 * tum(0.95), e: 2.5, w: wAt(tw, 0.95), col: shirt }); // tee hem over the waistband
  }
  rings[0].cap = 0.03; rings[rings.length - 1].cap = 0.01;
  sweep(rings, new THREE.Matrix4(), out);

  // ---- arms (shoulder-pivot frame, hanging along -y) ----
  arms.forEach((a, i) => {
    const sh = 3 + i * 2, el = sh + 1;
    const keys = [[0.04, [[B.torso, 0.45], [sh, 0.55]]], [-0.06, [[sh, 1]]], [-0.215, [[sh, 1]]], [-0.26, [[sh, 0.5], [el, 0.5]]], [-0.305, [[el, 1]]]];
    const prof = [ // y, r, sleeve?
      [-0.475, 0.034, 0], [-0.44, 0.04, 0], [-0.37, 0.049, 0], [-0.31, 0.052, 0], [-0.27, 0.051, 0], [-0.225, 0.055, 0],
      [-0.172, 0.058, 0], [-0.168, 0.065, 1], [-0.1, 0.064, 1], [-0.03, 0.065, 1], [0.015, 0.056, 1], [0.045, 0.038, 1], [0.062, 0.016, 1],
    ];
    const side = a.s; // the inner side of the arm faces the torso (-side in x)
    const ak = o.arm || 1;
    const kA = (y) => 1 + (ak - 1) * Math.min(1, Math.max(0.15, (y + 0.48) / 0.26)); // thicker upper arm, wrist nearly as is
    // o.longSleeve (jackets): the sleeve runs down to a cuff at the wrist and sits a little off the arm
    const sleeve = (y, sl) => sl || (o.longSleeve && y > -0.45);
    const r = prof.map(([y, rr, sl]) => ({ y, rx: (rr * kA(y) * (1 - 0.1 * f) + (o.longSleeve && sleeve(y, sl) ? 0.007 : 0)) * bw, rz: rr * kA(y) * (1 - 0.1 * f) + (o.longSleeve && sleeve(y, sl) ? 0.007 : 0), w: wAt(keys, y), col: sleeve(y, sl) ? shirt : skin,
      ao: (sa) => 1 - (0.1 + 0.22 * bump(y, -0.05, 0.07)) * Math.max(0, -side * sa) ** 2 }));
    r[0].cap = 0.012; r[r.length - 1].cap = 0.012;
    sweep(r, toRoot(a.sh), out);
  });
  // ---- legs (hip-pivot frame) ----
  legs.forEach((l, i) => {
    const hp = 7 + i * 3, kn = hp + 1, ft = hp + 2;
    const keys = [[0.06, [[B.hips, 0.5], [hp, 0.5]]], [-0.03, [[hp, 1]]], [-0.37, [[hp, 1]]], [-0.43, [[hp, 0.5], [kn, 0.5]]], [-0.49, [[kn, 1]]], [-0.8, [[kn, 1]]], [-0.86, [[kn, 0.4], [ft, 0.6]]]];
    let rr = LEG_PROF.map(([y, r]) => ({ y, r }));
    const hem = !o.pants && o.hem ? o.hem : null; // longer shorts (basketball): hem rings added below
    if (hem) {
      const base = rr; // ascending y
      const rAt = (y) => { for (let j = 0; j + 1 < base.length; j++) if (y >= base[j].y && y <= base[j + 1].y) return base[j].r + (base[j + 1].r - base[j].r) * (y - base[j].y) / (base[j + 1].y - base[j].y); return base[0].r; };
      rr = base.filter(q => Math.abs(q.y - hem) > 0.012);
      for (const y of [hem - 0.01, hem]) rr.push({ y, r: rAt(y) });
      rr.sort((a, b) => a.y - b.y);
    }
    const pantsCol = (y) => o.pants ? (y > -0.845 ? bottom : sock) : y > (hem ?? -0.3) - (hem ? 0.0005 : 0) ? bottom : y < -0.775 ? sock : skin;
    const ringsL = [];
    for (const { y, r: r0 } of rr) {
      const r = r0 * (1 + 0.22 * bel * Math.min(1, Math.max(0, (y + 0.6) / 0.5))); // belly: fuller thighs
      const loose = y > -0.02 ? 0 : hem ? (y >= hem ? 0.024 : 0) : !o.pants && y > -0.3 ? 0.014 : o.pants ? 0.006 : 0; // shorts / trousers sit a little off the leg
      const side = l.s, ao = (sa, ca) => 1 - 0.13 * Math.max(0, -side * sa) ** 2 * (y > -0.4 ? 1 : 0.4) - 0.16 * Math.max(0, -ca) ** 2 * bump(y, -0.43, 0.06);
      ringsL.push({ y, rx: (r + loose) * (1 + 0.04 * f) * bw, rz: r + loose, w: wAt(keys, y), col: pantsCol(y), ao });
      if (!hem && !o.pants && y === -0.28) ringsL.splice(ringsL.length - 1, 0, { y: -0.29, rx: (r + 0.002) * bw, rz: r + 0.002, w: wAt(keys, -0.29), col: skin }); // shorts hem
    }
    ringsL.sort((a, b) => a.y - b.y);
    ringsL[0].cap = 0.012; ringsL[ringsL.length - 1].cap = 0.02;
    sweep(ringsL, toRoot(l.hp), out);
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(out.ref.length * 3), 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(out.si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(out.sw, 4));
  g.setIndex(out.idx);
  g.computeVertexNormals();
  const col = g.attributes.color; // THREE.Color already holds linear values, as vertex colours expect
  // o.camo (YeeMing's army uniform, js/yeeming.js): the shirt and trousers become woodland camouflage — blotches from
  // a smooth noise of the bind-pose vertex position, in four colours (the vertex colours blend into soft patches)
  const CAMO = o.camo ? ['#56643a', '#3b4528', '#7d6c47', '#2b2b22'].map(c => new THREE.Color(c)) : null;
  const camoAt = (i) => {
    const x = out.pos[i * 3], y = out.pos[i * 3 + 1], z = out.pos[i * 3 + 2];
    const n = Math.sin(x * 21 + Math.sin(y * 13) * 2.1) + Math.sin(y * 17 + Math.sin(z * 19) * 1.7) + Math.sin(z * 23 + x * 9 + 1.3);
    return CAMO[n > 1.0 ? 2 : n > 0.1 ? 0 : n > -0.9 ? 1 : 3];
  };
  const paint = (over) => {
    for (let i = 0; i < col.count; i++) {
      let c = over.get(out.ref[i]) || out.ref[i]; const k = out.ao[i];
      if (CAMO && !over.has(out.ref[i]) && (out.ref[i] === shirt || out.ref[i] === bottom)) c = camoAt(i);
      col.setXYZ(i, c.r * k, c.g * k, c.b * k);
    }
    col.needsUpdate = true;
  };
  paint(new Map());
  const mesh = new THREE.SkinnedMesh(g, MAT);
  mesh.castShadow = true;
  root.add(mesh);
  mesh.bind(new THREE.Skeleton(bones), mesh.matrixWorld);
  // recolour (e.g. a crew shirt): map = { shirt, bottom }; {} restores the original clothes
  mesh.userData.recolor = (map) => {
    const over = new Map();
    if (map.shirt) over.set(shirt, new THREE.Color(map.shirt));
    if (map.bottom) over.set(bottom, new THREE.Color(map.bottom));
    paint(over);
  };
  return mesh;
}
