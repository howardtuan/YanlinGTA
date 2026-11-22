// Small procedural-modelling toolkit used for the hero scooter and the characters:
// mirrored section lofts with hard creases (body panels), swept tubes (limbs, rails, cables),
// lathes, rounded boxes and a "parts" collector that merges everything per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Catmull-Rom on numbers
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// Ensure a plain non-indexed geometry with position/normal/uv (+ optional color) so everything can be merged.
export function normalizeGeo(g, color) {
  const out = g.index ? g.toNonIndexed() : g;
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  for (const k of Object.keys(out.attributes)) if (!['position', 'normal', 'uv', 'color', 'skinIndex', 'skinWeight'].includes(k)) out.deleteAttribute(k);
  if (color) {
    const c = new THREE.Color(color), n = out.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    out.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Mirrored section loft.
//  sections: [{ z, p: [[x, y], ...] }] sorted by z (rear -> front). p is the RIGHT half of the
//            cross-section, from the top centre line around the +x side to the bottom centre line.
//            All sections need the same number of points.
//  opts.seg     rows inserted between sections (Catmull-Rom along z)
//  opts.crease  profile indices that are hard edges (normals split there)
//  opts.smooth  subdivisions per profile span for rounded (non-creased) sections
//  opts.uv      'livery' -> u: right side uses [0,.5] (front on the left of the image), left side [.5,1]
//                           (front on the right), v: 0 bottom .. 1 top — text reads correctly on both sides
//               'plain'  -> world-ish tiling (z, arc length) * opts.uvScale
//  opts.from/to profile index range to emit (lets one loft be split into differently-painted panels)
//  opts.capFront / capRear close the ends
// ---------------------------------------------------------------------------------------------
export function loft(sections, opts = {}) {
  const seg = opts.seg ?? 4, smooth = opts.smooth ?? 1, crease = new Set(opts.crease || []);
  const nP = sections[0].p.length;
  // 1) subdivide each profile (respecting creases)
  const prof = sections.map((s) => {
    const out = []; const ci = [];
    for (let i = 0; i < nP - 1; i++) {
      const a = s.p[Math.max(0, i - 1)], b = s.p[i], c = s.p[i + 1], d = s.p[Math.min(nP - 1, i + 2)];
      const hard = crease.has(i) || crease.has(i + 1);
      const n = smooth;
      for (let k = 0; k < n; k++) {
        const t = k / n;
        if (hard || n === 1) out.push([b[0] + (c[0] - b[0]) * t, b[1] + (c[1] - b[1]) * t]);
        else out.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t)]);
        if (k === 0) ci.push(out.length - 1);
      }
    }
    out.push(s.p[nP - 1]); ci.push(out.length - 1);
    return { z: s.z, p: out, ci };
  });
  const nC = prof[0].p.length, colOf = prof[0].ci; // column index of each original profile point
  const creaseCols = new Set([...crease].map(i => colOf[i]));
  // 2) rows along z (Catmull-Rom)
  const rows = [];
  for (let s = 0; s < prof.length - 1; s++) {
    const A = prof[Math.max(0, s - 1)], Bp = prof[s], C = prof[s + 1], D = prof[Math.min(prof.length - 1, s + 2)];
    const n = s === prof.length - 2 ? seg + 1 : seg;
    for (let k = 0; k < n; k++) {
      const t = k / seg;
      const z = cr(A.z, Bp.z, C.z, D.z, t);
      const p = Bp.p.map((_, j) => [cr(A.p[j][0], Bp.p[j][0], C.p[j][0], D.p[j][0], t), cr(A.p[j][1], Bp.p[j][1], C.p[j][1], D.p[j][1], t)]);
      rows.push({ z, p });
    }
  }
  const z0 = rows[0].z, z1 = rows[rows.length - 1].z, zl = (z1 - z0) || 1;
  // arc length per row for v
  const arcs = rows.map(r => { const a = [0]; for (let j = 1; j < nC; j++) a.push(a[j - 1] + Math.hypot(r.p[j][0] - r.p[j - 1][0], r.p[j][1] - r.p[j - 1][1])); return a; });
  const from = opts.from != null ? colOf[opts.from] : 0, to = opts.to != null ? colOf[opts.to] : nC - 1;
  // 3) split into strips at crease columns and build each side
  const cuts = [from]; for (let j = from + 1; j < to; j++) if (creaseCols.has(j)) cuts.push(j); cuts.push(to);
  const geos = [];
  const uvMode = opts.uv || 'livery', us = opts.uvScale || 1;
  for (const side of opts.capsOnly ? [] : opts.mirror === false ? [1] : [1, -1]) {
    for (let ci = 0; ci < cuts.length - 1; ci++) {
      const j0 = cuts[ci], j1 = cuts[ci + 1], w = j1 - j0 + 1;
      const pos = [], uv = [], idx = [];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r], arcT = arcs[r][nC - 1] || 1;
        for (let j = j0; j <= j1; j++) {
          pos.push(row.p[j][0] * side, row.p[j][1], row.z);
          const t = (row.z - z0) / zl, v = 1 - arcs[r][j] / arcT;
          if (uvMode === 'livery') uv.push(side > 0 ? 0.5 * (1 - t) : 0.5 + 0.5 * t, v);
          else uv.push(row.z * us * side, arcs[r][j] * us);
        }
      }
      for (let r = 0; r < rows.length - 1; r++) for (let j = 0; j < w - 1; j++) {
        const a = r * w + j, b = (r + 1) * w + j, c = r * w + j + 1, d = (r + 1) * w + j + 1;
        if (side > 0) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, c, d, b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      // the two mirrored halves meet on x = 0: keep normals symmetric there so the centre line is seamless
      if (!opts.ridge) {
        const P = g.attributes.position, N = g.attributes.normal;
        for (let i = 0; i < P.count; i++) if (Math.abs(P.getX(i)) < 1e-5) { const nx = 0, ny = N.getY(i), nz = N.getZ(i), l = Math.hypot(ny, nz) || 1; N.setXYZ(i, nx, ny / l, nz / l); }
      }
      geos.push(normalizeGeo(g));
    }
  }
  // caps
  for (const [on, row, dir] of [[opts.capRear, rows[0], -1], [opts.capFront, rows[rows.length - 1], 1]]) {
    if (!on) continue;
    const full = opts.mirror === false ? row.p.map(p => [p[0], p[1]]) : [...row.p.map(p => [p[0], p[1]]), ...row.p.slice(1, -1).reverse().map(p => [-p[0], p[1]])];
    const contour = full.map(p => new THREE.Vector2(p[0], p[1]));
    let tris; try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { continue; }
    const pos = [];
    for (const t of tris) {
      const pts = t.map(i => full[i]);
      const a = V(pts[0][0], pts[0][1], row.z), b = V(pts[1][0], pts[1][1], row.z), c = V(pts[2][0], pts[2][1], row.z);
      const n = V().subVectors(b, a).cross(V().subVectors(c, a));
      const tri = n.z * dir >= 0 ? [a, b, c] : [a, c, b];
      for (const p of tri) pos.push(p.x, p.y, p.z);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    geos.push(normalizeGeo(g));
  }
  return mergeGeometries(geos);
}

// ---------------------------------------------------------------------------------------------
// Swept tube with per-ring radii/shape: rings = [{ c: Vector3, r: number | [rx, rz], tw?: twist }]
// Frames are parallel-transported along the path; ends optionally capped (hemispherical).
// ---------------------------------------------------------------------------------------------
export function sweep(rings, opts = {}) {
  const radial = opts.radial ?? 12, up0 = opts.up || V(0, 0, 1);
  const n = rings.length;
  const T = rings.map((r, i) => V().subVectors(rings[Math.min(n - 1, i + 1)].c, rings[Math.max(0, i - 1)].c).normalize());
  // parallel transport frame
  let N = V().crossVectors(T[0], up0); if (N.lengthSq() < 1e-6) N = V().crossVectors(T[0], V(1, 0, 0)); N.normalize();
  const frames = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) { const q = new THREE.Quaternion().setFromUnitVectors(T[i - 1], T[i]); N.applyQuaternion(q).normalize(); }
    const Bv = V().crossVectors(T[i], N).normalize();
    frames.push([N.clone(), Bv]);
  }
  const pos = [], uv = [], idx = [], ringIdx = [];
  const W = radial + 1;
  for (let i = 0; i < n; i++) {
    const rg = rings[i], [Nn, Bb] = frames[i];
    const rx = Array.isArray(rg.r) ? rg.r[0] : rg.r, rz = Array.isArray(rg.r) ? rg.r[1] : rg.r;
    for (let k = 0; k <= radial; k++) {
      const a = k / radial * Math.PI * 2 + (rg.tw || 0);
      const s = rg.shape ? rg.shape(a) : 1;
      const p = rg.c.clone().addScaledVector(Nn, Math.cos(a) * rx * s).addScaledVector(Bb, Math.sin(a) * rz * s);
      pos.push(p.x, p.y, p.z); uv.push(k / radial, i / (n - 1)); ringIdx.push(i);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const a = i * W + k, b = (i + 1) * W + k, c = i * W + k + 1, d = (i + 1) * W + k + 1;
    idx.push(a, c, b, c, d, b);
  }
  // caps: fan to a point slightly beyond the end ring
  for (const [on, i, dir] of [[opts.capStart, 0, -1], [opts.capEnd, n - 1, 1]]) {
    if (!on) continue;
    const rg = rings[i], tip = rg.c.clone().addScaledVector(T[i], dir * (on === true ? 0 : on));
    const ti = pos.length / 3; pos.push(tip.x, tip.y, tip.z); uv.push(0.5, dir > 0 ? 1 : 0); ringIdx.push(i);
    for (let k = 0; k < radial; k++) { const a = i * W + k, c = i * W + k + 1; if (dir > 0) idx.push(a, c, ti); else idx.push(a, ti, c); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  g.userData.ringIdx = ringIdx;
  return g;
}

// simple tube through points with constant radius (cables, rails, springs)
export function tube(points, r, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const g = new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), r, radial, closed);
  if (closed) return g;
  // rounded end caps, so an open tube end never shows its (culled) inside
  const caps = [0, 1].map(t => { const p = curve.getPoint(t); return new THREE.SphereGeometry(r, radial, Math.max(3, radial >> 1)).translate(p.x, p.y, p.z); });
  return mergeGeometries([g, ...caps]);
}

// coil spring between two points
export function spring(a, b, coilR, wireR, turns = 8) {
  const d = V().subVectors(b, a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const pts = [];
  for (let i = 0; i <= turns * 16; i++) { const t = i / (turns * 16), ang = t * turns * Math.PI * 2; pts.push(V(Math.cos(ang) * coilR, t * L, Math.sin(ang) * coilR).applyQuaternion(q).add(a)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, wireR, 6, false);
}

// rounded box via a bevelled extrusion; centred on the origin
export function roundedBox(w, h, d, r = 0.02, seg = 3) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
  s.moveTo(x, y); s.lineTo(x + ww, y); s.lineTo(x + ww, y + hh); s.lineTo(x, y + hh); s.lineTo(x, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: seg });
  g.translate(0, 0, -(d - 2 * r) / 2);
  return g;
}

// extrude a 2D outline (array of [x,y]) to thickness t along +z, centred
export function slab(outline, t, bevel = 0.004, holes = []) {
  const s = new THREE.Shape(outline.map(p => new THREE.Vector2(p[0], p[1])));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, t - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -(t - 2 * bevel) / 2);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Parts collector: add(materialKey, geometry, matrix?) ... build(materials) -> Group (1 mesh per material)
// ---------------------------------------------------------------------------------------------
export class Parts {
  constructor() { this.map = new Map(); }
  add(key, geo, m) {
    const g = normalizeGeo(geo.clone ? geo.clone() : geo);
    if (m) g.applyMatrix4(m);
    if (!this.map.has(key)) this.map.set(key, []);
    this.map.get(key).push(g);
    return this;
  }
  // convenience transform: position, euler rotation, scale
  at(key, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
    return this.add(key, geo, m);
  }
  geometry(key) { const l = this.map.get(key); return l && l.length ? mergeGeometries(l) : null; }
  build(materials, opts = {}) {
    const g = new THREE.Group();
    for (const [key, list] of this.map) {
      const mat = materials[key]; if (!mat) { console.warn('no material', key); continue; }
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.castShadow = opts.shadow !== false; mesh.receiveShadow = !!opts.receive;
      mesh.name = key; g.add(mesh);
    }
    return g;
  }
}

// mirror helper: returns a clone of geometry mirrored in x (winding fixed)
export function mirrorX(geo) {
  const g = normalizeGeo(geo.clone());
  g.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    for (const a of [p, n, u]) { if (!a) continue; const s = a.itemSize; for (let k = 0; k < s; k++) { const t = a.array[(i + 1) * s + k]; a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k]; a.array[(i + 2) * s + k] = t; } }
  }
  if (g.attributes.color) { const c = g.attributes.color; for (let i = 0; i < c.count; i += 3) for (let k = 0; k < 3; k++) { const t = c.array[(i + 1) * 3 + k]; c.array[(i + 1) * 3 + k] = c.array[(i + 2) * 3 + k]; c.array[(i + 2) * 3 + k] = t; } }
  return g;
}

export const vec = V;
