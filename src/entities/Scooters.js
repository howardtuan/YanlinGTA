// Generic Taiwanese commuter scooter for traffic and parked bikes: a rounder body built from mirrored
// section lofts (closed solids, no see-through shells), lathe tyres seated on black alloy rims, wave
// disc, CVT case, muffler, handlebar with grips and mirrors. Geometry is built once and shared by every
// instance; only the paint material changes per colour. (The hero's SYM JET SL lives in src/entities/Vehicles.js.)
// Vehicle-space axes: +z forward, +y up, +x = rider's left.
import * as THREE from 'three';
import {
  loft,
  tube,
  spring,
  roundedBox,
  slab,
  Parts,
  normalizeGeo,
  vec as V,
} from '../world/Modeling.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- textures
const TEX = {};
const cached = (k, f) => TEX[k] || (TEX[k] = f());
function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// height canvases are only drawn once and read back: keep them on the CPU (no GPU readback, which stalls for seconds
// under software rendering)
const HEIGHT_CTX = { willReadFrequently: true };
function heightToNormal(cv, strength = 2) {
  const w = cv.width,
    h = cv.height,
    src = cv.getContext('2d').getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const g = out.getContext('2d'),
    img = g.createImageData(w, h),
    d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength,
        dy = (H(x, y + 1) - H(x, y - 1)) * strength,
        l = Math.hypot(dx, dy, 1),
        i = (y * w + x) * 4;
      d[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      d[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      d[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const rng = (s) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function seatTex() {
  return cached('seat', () => {
    const S = 256,
      r = rng(5);
    const hc = document.createElement('canvas');
    hc.width = hc.height = S;
    const h = hc.getContext('2d', HEIGHT_CTX);
    h.fillStyle = '#808080';
    h.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) {
      const v = 100 + r() * 60;
      h.fillStyle = `rgb(${v},${v},${v})`;
      h.beginPath();
      h.arc(r() * S, r() * S, 0.6 + r() * 1.6, 0, 7);
      h.fill();
    }
    // diagonal quilting (carbon-look insert like the real seat)
    h.strokeStyle = '#555';
    h.lineWidth = 2;
    for (let k = -S; k < S * 2; k += 32) {
      h.beginPath();
      h.moveTo(k, 0);
      h.lineTo(k + S, S);
      h.stroke();
    }
    const map = canvasTex(
      S,
      S,
      (g) => {
        g.fillStyle = '#1b1b1d';
        g.fillRect(0, 0, S, S);
        g.globalAlpha = 0.18;
        g.drawImage(hc, 0, 0);
      },
      { repeat: true }
    );
    return { map, normalMap: heightToNormal(hc, 3) };
  });
}
function tireTex() {
  return cached('tire', () => {
    const W = 512,
      H = 128;
    const hc = document.createElement('canvas');
    hc.width = W;
    hc.height = H;
    const h = hc.getContext('2d', HEIGHT_CTX);
    h.fillStyle = '#909090';
    h.fillRect(0, 0, W, H);
    // v runs across the tread (lathe profile), u around the tyre: sport-tyre grooves on the shoulders
    h.strokeStyle = '#2a2a2a';
    h.lineWidth = 5;
    for (let x = 0; x < W; x += 32) {
      h.beginPath();
      h.moveTo(x, H * 0.18);
      h.lineTo(x + 26, H * 0.42);
      h.stroke();
      h.beginPath();
      h.moveTo(x + 16, H * 0.82);
      h.lineTo(x + 42, H * 0.58);
      h.stroke();
    }
    // sidewall lettering ridges
    h.fillStyle = '#a8a8a8';
    h.font = '900 16px sans-serif';
    for (let x = 0; x < W; x += 256) {
      h.fillText('MAXXIS  110/70-12', x + 20, 12);
      h.fillText('MAXXIS  110/70-12', x + 20, H - 2);
    }
    const map = canvasTex(
      W,
      H,
      (g) => {
        g.fillStyle = '#161617';
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 0.25;
        g.drawImage(hc, 0, 0);
      },
      { repeat: true }
    );
    return { map, normalMap: heightToNormal(hc, 4) };
  });
}
function floorMatTex() {
  return cached('floormat', () => {
    const S = 128;
    const hc = document.createElement('canvas');
    hc.width = hc.height = S;
    const h = hc.getContext('2d', HEIGHT_CTX);
    h.fillStyle = '#9a9a9a';
    h.fillRect(0, 0, S, S);
    h.fillStyle = '#3a3a3a';
    for (let y = 0; y < S; y += 16) h.fillRect(0, y, S, 6);
    const map = canvasTex(
      S,
      S,
      (g) => {
        g.fillStyle = '#1d1e20';
        g.fillRect(0, 0, S, S);
        g.fillStyle = '#26272a';
        for (let y = 0; y < S; y += 16) g.fillRect(0, y + 6, S, 10);
      },
      { repeat: true }
    );
    return { map, normalMap: heightToNormal(hc, 3) };
  });
}
function plasticTex() {
  // fine grain on matte black plastics
  return cached('plastic', () => {
    const S = 128,
      r = rng(9);
    const hc = document.createElement('canvas');
    hc.width = hc.height = S;
    const h = hc.getContext('2d', HEIGHT_CTX);
    h.fillStyle = '#808080';
    h.fillRect(0, 0, S, S);
    for (let i = 0; i < 3000; i++) {
      const v = 110 + r() * 40;
      h.fillStyle = `rgb(${v},${v},${v})`;
      h.fillRect(r() * S, r() * S, 1.5, 1.5);
    }
    return heightToNormal(hc, 1.2);
  });
}
function plateTex(text) {
  return canvasTex(256, 128, (g, W, H) => {
    g.fillStyle = '#f4f4f0';
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 10);
    g.fill();
    g.strokeStyle = '#1a1a1a';
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = '#111';
    g.font = '900 64px "Arial Narrow", system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2 + 6);
  });
}

// ---------------------------------------------------------------- materials (shared)
const MATS = {};
function mats() {
  if (MATS.ready) return MATS;
  const tr = tireTex(),
    st = seatTex(),
    fm = floorMatTex(),
    pl = plasticTex();
  const P = (o) =>
    new THREE.MeshPhysicalMaterial({
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      ...o,
    });
  Object.assign(MATS, {
    ready: true,
    blackGloss: P({ color: '#0e0f11', roughness: 0.25, clearcoatRoughness: 0.08 }),
    blackMatte: new THREE.MeshStandardMaterial({
      color: '#1a1b1e',
      roughness: 0.72,
      normalMap: pl,
      normalScale: new THREE.Vector2(0.4, 0.4),
    }),
    grey: new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.55, metalness: 0.35 }),
    seat: new THREE.MeshStandardMaterial({
      map: st.map,
      normalMap: st.normalMap,
      roughness: 0.55,
      color: '#ffffff',
    }),
    piping: new THREE.MeshStandardMaterial({ color: '#6b6d72', roughness: 0.5 }),
    floor: new THREE.MeshStandardMaterial({
      map: fm.map,
      normalMap: fm.normalMap,
      roughness: 0.85,
    }),
    tire: new THREE.MeshStandardMaterial({
      map: tr.map,
      normalMap: tr.normalMap,
      roughness: 0.88,
      color: '#ffffff',
    }),
    rim: P({ color: '#09090a', roughness: 0.3, metalness: 0.15, clearcoatRoughness: 0.12 }),
    rimLip: new THREE.MeshStandardMaterial({ color: '#d7dbe0', roughness: 0.18, metalness: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e8ebee', roughness: 0.12, metalness: 1 }),
    alu: new THREE.MeshStandardMaterial({ color: '#b9bec4', roughness: 0.3, metalness: 1 }),
    disc: new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.35, metalness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d4a326', roughness: 0.3, metalness: 0.9 }),
    exhaust: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.4, metalness: 0.8 }),
    led: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#eef6ff',
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
    lensDark: new THREE.MeshPhysicalMaterial({
      color: '#0d1014',
      roughness: 0.05,
      metalness: 0.2,
      clearcoat: 1,
    }),
    tail: new THREE.MeshStandardMaterial({
      color: '#7a0710',
      emissive: '#ff1530',
      emissiveIntensity: 1.1,
      roughness: 0.15,
    }),
    amber: new THREE.MeshStandardMaterial({
      color: '#ff9a1a',
      emissive: '#ff8a00',
      emissiveIntensity: 0.25,
      roughness: 0.2,
    }),
    mirror: new THREE.MeshStandardMaterial({ color: '#c8d2dc', roughness: 0.02, metalness: 1 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#141415', roughness: 0.9 }),
    spring: new THREE.MeshStandardMaterial({ color: '#1d1e21', roughness: 0.35, metalness: 0.6 }),
  });
  return MATS;
}

// turn a surface inside out (reverse winding + normals), e.g. for the inner wall of an open cylinder
function flipFaces(g) {
  if (g.index) {
    const a = g.index.array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
  } else
    for (const k in g.attributes) {
      // swap the 2nd and 3rd vertex of every triangle
      const at = g.attributes[k],
        s = at.itemSize,
        arr = at.array;
      for (let i = 0; i < at.count; i += 3)
        for (let c = 0; c < s; c++) {
          const a = (i + 1) * s + c,
            b = (i + 2) * s + c,
            t = arr[a];
          arr[a] = arr[b];
          arr[b] = t;
        }
    }
  const n = g.attributes.normal;
  if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

// Fender / hugger: a closed cross-section swept around the wheel axle. The sections stay radial to the
// tyre, so the panel keeps its thickness where the arc gets steep (vertical slices fold over there).
//  half: right half of the section as [x, r] (r = distance from the axle), from the outer centre line
//        round the +x edge to the inner centre line. th0..th1: arc in radians, 0 = straight up, + = forward.
function arcFender(cy, cz, th0, th1, half, n = 18) {
  const loop = [
      ...half,
      ...half
        .slice(1, -1)
        .reverse()
        .map(([x, r]) => [-x, r]),
    ],
    L = loop.length;
  const at = (i, [x, r]) => {
    const th = th0 + ((th1 - th0) * i) / n;
    return V(x, cy + Math.cos(th) * r, cz + Math.sin(th) * r);
  };
  const cen = loop.reduce((a, [x, r]) => [a[0] + x / L, a[1] + r / L], [0, 0]);
  const geos = [];
  for (let j = 0; j < L; j++) {
    // one strip per profile edge: smooth along the arc, creased across the section
    const e0 = loop[j],
      e1 = loop[(j + 1) % L],
      pos = [],
      uv = [],
      idx = [];
    for (let i = 0; i <= n; i++)
      for (const e of [e0, e1]) {
        const v = at(i, e);
        pos.push(v.x, v.y, v.z);
        uv.push(i / n, e === e0 ? 0 : 1);
      }
    for (let i = 0; i < n; i++) {
      const a = i * 2,
        b = a + 1,
        c = a + 2,
        d = a + 3;
      // orient away from the section centroid
      const pa = at(i, e0),
        pb = at(i, e1),
        pc = at(i + 1, e0),
        mid = at(i + 0.5, [(e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2]);
      const nrm = V().subVectors(pb, pa).cross(V().subVectors(pc, pa)),
        out = V().subVectors(mid, at(i + 0.5, cen));
      if (nrm.dot(out) >= 0) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    geos.push(normalizeGeo(g));
  }
  // end caps
  const tris = THREE.ShapeUtils.triangulateShape(
    loop.map(([x, r]) => new THREE.Vector2(x, r)),
    []
  );
  for (const [i, sgn] of [
    [0, -1],
    [n, 1],
  ]) {
    const th = th0 + ((th1 - th0) * i) / n,
      tang = V(0, -Math.sin(th), Math.cos(th)).multiplyScalar(sgn),
      pos = [];
    for (const t of tris) {
      const [a, b, c] = t.map((k) => at(i, loop[k]));
      const tri =
        V().subVectors(b, a).cross(V().subVectors(c, a)).dot(tang) >= 0 ? [a, b, c] : [a, c, b];
      for (const p of tri) pos.push(p.x, p.y, p.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    geos.push(normalizeGeo(g));
  }
  return mergeGeometries(geos);
}

// ---------------------------------------------------------------- shared parts
// wheel: lathe tyre (rounded section, tread texture), black 5 Y-spoke alloy rim with machined lip, hub, wave disc
function buildWheelParts(o) {
  const P = new Parts();
  const R = o.R,
    rimR = o.rimR,
    W = o.W,
    lo = !!o.lo;
  // tyre profile (in (radius, axial) space), lathe around y then turned to the x axle
  const prof = [];
  const sec = R - rimR;
  const PS = lo ? 8 : 16;
  // bead seated on the rim (no gap between rim and sidewall to look into the hollow tyre)
  prof.push(new THREE.Vector2(rimR + 0.002, -W * 0.4));
  for (let i = 0; i <= PS; i++) {
    const a = -Math.PI / 2 + (i / PS) * Math.PI; // -90..90 deg across the section
    const bulge = Math.cos(a);
    prof.push(
      new THREE.Vector2(
        rimR + sec * (0.55 + 0.45 * bulge) + (Math.abs(a) > 1.35 ? -0.008 : 0),
        Math.sin(a) * W * 0.5 * (0.9 + 0.1 * bulge)
      )
    );
  }
  prof.push(new THREE.Vector2(rimR + 0.002, W * 0.4));
  const tyre = new THREE.LatheGeometry(prof, lo ? 24 : 48);
  tyre.rotateZ(Math.PI / 2);
  P.add('tire', tyre);
  // rim barrel + lips
  const barrel = new THREE.CylinderGeometry(rimR, rimR, W * 0.78, lo ? 20 : 40, 1, true);
  barrel.rotateZ(Math.PI / 2);
  P.add('rim', barrel);
  // inside of the barrel (seen between the spokes)
  const inner = new THREE.CylinderGeometry(
    rimR - 0.004,
    rimR - 0.004,
    W * 0.78,
    lo ? 20 : 40,
    1,
    true
  );
  inner.rotateZ(Math.PI / 2);
  P.add('rim', flipFaces(inner));
  for (const s of [-1, 1]) {
    const lip = new THREE.TorusGeometry(rimR + 0.004, 0.006, lo ? 4 : 6, lo ? 24 : 48);
    lip.rotateY(Math.PI / 2);
    lip.translate(s * W * 0.39, 0, 0);
    P.add('rimLip', lip);
  }
  // spokes: 5 Y-spokes
  const hubR = 0.045;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spokeShape = [
      [-0.011, hubR - 0.005],
      [0.011, hubR - 0.005],
      [0.012, rimR * 0.62],
      [0.034, rimR + 0.002],
      [0.02, rimR + 0.002],
      [0, rimR * 0.72],
      [-0.02, rimR + 0.002],
      [-0.034, rimR + 0.002],
      [-0.012, rimR * 0.62],
    ];
    const g = slab(spokeShape, 0.022, lo ? 0 : 0.004);
    g.rotateY(Math.PI / 2);
    g.rotateX(a);
    P.add('rim', g);
  }
  const hub = new THREE.CylinderGeometry(hubR, hubR, W * 0.7, 20);
  hub.rotateZ(Math.PI / 2);
  P.add('rim', hub);
  const cap = new THREE.CylinderGeometry(0.018, 0.018, W * 0.76, 12);
  cap.rotateZ(Math.PI / 2);
  P.add('chrome', cap);
  // brake disc with wave outline and holes
  if (o.disc) {
    const dr = o.disc.r,
      n = 14,
      outline = [];
    for (let i = 0; i < n * 6; i++) {
      const a = (i / (n * 6)) * Math.PI * 2,
        w = 1 - 0.035 * (0.5 + 0.5 * Math.cos(a * n));
      outline.push([Math.cos(a) * dr * w, Math.sin(a) * dr * w]);
    }
    const holes = [];
    if (!lo)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.13,
          rr = dr * 0.8;
        const h = [];
        for (let k = 0; k < 8; k++) {
          const b = (k / 8) * Math.PI * 2;
          h.push([Math.cos(a) * rr + Math.cos(b) * 0.007, Math.sin(a) * rr + Math.sin(b) * 0.007]);
        }
        holes.push(h.reverse());
      }
    const inner = [];
    for (let k = 0; k < 24; k++) {
      const b = (-k / 24) * Math.PI * 2;
      inner.push([Math.cos(b) * dr * 0.62, Math.sin(b) * dr * 0.62]);
    }
    const d = slab(outline, 0.005, lo ? 0 : 0.0008, [...holes, inner]);
    d.rotateY(Math.PI / 2);
    d.translate(o.disc.x, 0, 0);
    P.add('disc', d);
    // carrier
    const car = slab(
      (() => {
        const p = [];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          for (let k = -2; k <= 2; k++) {
            const b = a + k * 0.12,
              rr = k === -2 || k === 2 ? dr * 0.45 : dr * 0.66;
            p.push([Math.cos(b) * rr, Math.sin(b) * rr]);
          }
        }
        return p;
      })(),
      0.008,
      0.001
    );
    car.rotateY(Math.PI / 2);
    car.translate(o.disc.x * 0.9, 0, 0);
    P.add('rim', car);
  }
  return P;
}
function buildWheel(o) {
  const grp = buildWheelParts(o).build(mats());
  grp.userData.shadow = true;
  grp.traverse((m) => {
    if (m.isMesh) m.userData.shadow = true;
  });
  return grp;
}

// handlebar assembly with grips, levers, switchgear, bar ends; returns into the given Parts
function handlebar(P, y, z, half, opts = {}) {
  const lo = !!opts.lo;
  const bar = tube(
    [
      V(-half + 0.04, y, z),
      V(-half * 0.5, y + 0.012, z - 0.01),
      V(0, y + 0.02, z - 0.012),
      V(half * 0.5, y + 0.012, z - 0.01),
      V(half - 0.04, y, z),
    ],
    0.011,
    8
  );
  P.add('chrome', bar);
  for (const s of [-1, 1]) {
    const gx = s * half;
    // grip with ribs (lathe)
    const GN = lo ? 4 : 20;
    const prof = [];
    for (let i = 0; i <= GN; i++) {
      const t = i / GN;
      prof.push(
        new THREE.Vector2(
          0.0165 + (!lo && i % 2 ? 0.0012 : 0) + (t > 0.85 ? 0.003 : 0),
          -0.06 + t * 0.12
        )
      );
    }
    const grip = new THREE.LatheGeometry(prof, lo ? 8 : 14);
    grip.rotateZ(Math.PI / 2);
    grip.translate(gx, y, z);
    P.add('rubber', grip);
    const end = new THREE.SphereGeometry(0.019, 12, 8);
    end.scale(0.6, 1, 1);
    end.translate(gx + s * 0.064, y, z);
    P.add('chrome', end);
    // switch housing
    const sw = roundedBox(0.045, 0.04, 0.05, 0.012);
    sw.translate(gx - s * 0.085, y + 0.004, z);
    P.add(opts.dark || 'blackMatte', sw);
    // lever (curved slab in front of the grip)
    const lv = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      lv.push(
        V(
          gx - s * (0.075 - t * 0.14),
          y - 0.005 - Math.sin(t * Math.PI) * 0.006,
          z + 0.055 + t * 0.012
        )
      );
    }
    P.add('alu', tube(lv, 0.0055, 6));
    P.add('alu', roundedBox(0.03, 0.025, 0.03, 0.006).translate(gx - s * 0.078, y, z + 0.035));
  }
}

function mirrors(P, x, y, z, h) {
  for (const s of [-1, 1]) {
    P.add(
      'blackMatte',
      tube(
        [
          V(s * x, y, z),
          V(s * (x + 0.03), y + h * 0.45, z - 0.01),
          V(s * (x + 0.055), y + h, z - 0.02),
        ],
        0.007,
        6
      )
    );
    const outline = [
      [-0.085, -0.03],
      [0.07, -0.04],
      [0.09, 0.0],
      [0.075, 0.038],
      [-0.06, 0.035],
      [-0.09, 0.0],
    ];
    const housing = slab(outline, 0.038, 0.008);
    housing.rotateY(s * 0.15);
    housing.translate(s * (x + 0.09), y + h + 0.03, z - 0.02);
    P.add('blackGloss', housing);
    const glass = slab(
      outline.map(([a, b]) => [a * 0.88, b * 0.8]),
      0.004,
      0.0005
    );
    glass.rotateY(s * 0.15);
    glass.translate(s * (x + 0.09), y + h + 0.03, z - 0.041);
    P.add('mirror', glass);
  }
}

// ---------------------------------------------------------------- generic commuter scooter (shared geometry)
let GENERIC = null;
function genericGeometry() {
  if (GENERIC) return GENERIC;
  const P = new Parts();
  const FA = { y: 0.205, z: 0.62 },
    RA = { y: 0.21, z: -0.62 };
  // rounded rear body
  const rear = [
    {
      z: -0.93,
      p: [
        [0, 0.76],
        [0.06, 0.755],
        [0.085, 0.72],
        [0.08, 0.66],
        [0.05, 0.62],
        [0, 0.615],
      ],
    },
    {
      z: -0.8,
      p: [
        [0, 0.77],
        [0.12, 0.765],
        [0.155, 0.71],
        [0.15, 0.6],
        [0.1, 0.54],
        [0, 0.535],
      ],
    },
    {
      z: -0.5,
      p: [
        [0, 0.745],
        [0.15, 0.74],
        [0.185, 0.67],
        [0.175, 0.52],
        [0.12, 0.44],
        [0, 0.435],
      ],
    },
    {
      z: -0.2,
      p: [
        [0, 0.72],
        [0.15, 0.715],
        [0.185, 0.645],
        [0.172, 0.46],
        [0.125, 0.37],
        [0, 0.365],
      ],
    },
    {
      z: 0.0,
      p: [
        [0, 0.7],
        [0.135, 0.695],
        [0.165, 0.625],
        [0.155, 0.46],
        [0.12, 0.37],
        [0, 0.365],
      ],
    },
  ];
  P.add('paint', loft(rear, { seg: 2, smooth: 1, to: 3, capRear: true, uv: 'plain' }));
  P.add('dark', loft(rear, { seg: 2, smooth: 1, from: 3, capFront: true, uv: 'plain' }));
  const floor = [-0.12, 0.33].map((z) => ({
    z,
    p: [
      [0, 0.36],
      [0.16, 0.36],
      [0.18, 0.34],
      [0.18, 0.28],
      [0.14, 0.235],
      [0, 0.23],
    ],
  }));
  P.add('floor', loft(floor, { seg: 2, crease: [1, 2, 3, 4], to: 1, uv: 'plain', uvScale: 6 }));
  P.add('paint', loft(floor, { seg: 2, crease: [1, 2, 3, 4], from: 1, to: 3, uv: 'plain' }));
  P.add('dark', loft(floor, { seg: 2, crease: [3, 4], from: 3, uv: 'plain' }));
  P.add(
    'dark',
    loft(floor, { seg: 2, crease: [1, 2, 3, 4], capFront: true, capRear: true, capsOnly: true })
  );
  // round front shield
  const apron = [
    {
      z: 0.27,
      p: [
        [0, 0.97],
        [0.12, 0.96],
        [0.21, 0.86],
        [0.235, 0.66],
        [0.21, 0.42],
        [0.12, 0.34],
        [0, 0.34],
      ],
    },
    {
      z: 0.45,
      p: [
        [0, 0.95],
        [0.12, 0.935],
        [0.215, 0.83],
        [0.24, 0.66],
        [0.21, 0.47],
        [0.11, 0.44],
        [0, 0.44],
      ],
    },
    {
      z: 0.6,
      p: [
        [0, 0.89],
        [0.1, 0.875],
        [0.18, 0.79],
        [0.2, 0.66],
        [0.17, 0.53],
        [0.09, 0.515],
        [0, 0.515],
      ],
    },
    {
      z: 0.68,
      p: [
        [0, 0.82],
        [0.06, 0.81],
        [0.11, 0.76],
        [0.12, 0.66],
        [0.1, 0.57],
        [0.05, 0.56],
        [0, 0.56],
      ],
    },
  ];
  P.add('paint', loft(apron, { seg: 2, smooth: 1, to: 4, capFront: true, uv: 'plain' }));
  P.add('dark', loft(apron, { seg: 2, smooth: 1, from: 4, uv: 'plain' }));
  P.add(
    'paint',
    arcFender(
      FA.y,
      FA.z,
      -0.75,
      1.0,
      [
        [0, 0.25],
        [0.05, 0.246],
        [0.065, 0.22],
        [0.05, 0.205],
        [0, 0.215],
      ],
      12
    )
  );
  // closed back of the shield + moulded inner panel (no see-through shell)
  P.add('dark', loft(apron, { seg: 2, smooth: 1, capRear: true, capsOnly: true, uv: 'plain' }));
  {
    const back = apron[0].p,
      cz = apron[0].z;
    const outline = [
      ...back,
      ...back
        .slice(1, -1)
        .reverse()
        .map(([x, y]) => [-x, y]),
    ].map(([x, y]) => [x * 0.9, 0.655 + (y - 0.655) * 0.93]);
    const ls = slab(outline, 0.016, 0.006);
    ls.translate(0, 0, cz - 0.004);
    P.add('dark', ls);
  }
  // handlebar cover with round headlight
  const hc = [
    {
      z: 0.22,
      p: [
        [0, 1.03],
        [0.08, 1.03],
        [0.17, 1.0],
        [0.2, 0.97],
        [0.16, 0.935],
        [0.06, 0.925],
        [0, 0.925],
      ],
    },
    {
      z: 0.4,
      p: [
        [0, 1.07],
        [0.1, 1.065],
        [0.2, 1.02],
        [0.23, 0.98],
        [0.18, 0.94],
        [0.07, 0.925],
        [0, 0.925],
      ],
    },
    {
      z: 0.52,
      p: [
        [0, 1.03],
        [0.07, 1.025],
        [0.13, 1.0],
        [0.145, 0.975],
        [0.11, 0.945],
        [0.05, 0.94],
        [0, 0.94],
      ],
    },
  ];
  P.add(
    'paint',
    loft(hc, { seg: 2, smooth: 1, to: 3, capFront: true, capRear: true, uv: 'plain' })
  );
  P.add('dark', loft(hc, { seg: 2, smooth: 1, from: 3, uv: 'plain' }));
  const hl = new THREE.SphereGeometry(0.055, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  hl.rotateX(Math.PI / 2);
  hl.scale(1.3, 0.75, 0.5);
  hl.translate(0, 0.995, 0.515);
  P.add('led', hl);
  handlebar(P, 1.0, 0.36, 0.3, { dark: 'dark', lo: true });
  mirrors(P, 0.22, 1.03, 0.38, 0.16);
  // seat
  const s = (z, top, w, base) => ({
    z,
    p: [
      [0, top],
      [w * 0.3, top - 0.004],
      [w * 0.47, top - 0.025],
      [w * 0.5, top - 0.055],
      [w * 0.5, base + 0.012],
      [w * 0.44, base],
      [0, base],
    ],
  });
  const seat = [
    s(-0.86, 0.8, 0.16, 0.77),
    s(-0.7, 0.83, 0.26, 0.76),
    s(-0.4, 0.8, 0.29, 0.735),
    s(-0.15, 0.786, 0.29, 0.712),
    s(0.02, 0.755, 0.2, 0.7),
  ];
  P.add(
    'seat',
    loft(seat, { seg: 3, smooth: 2, uv: 'plain', uvScale: 5, capFront: true, capRear: true })
  );
  // rack, tail light, fork, engine, muffler, shock, stand
  P.add(
    'chrome',
    tube(
      [
        V(0.12, 0.78, -0.62),
        V(0.11, 0.8, -0.85),
        V(0, 0.81, -0.93),
        V(-0.11, 0.8, -0.85),
        V(-0.12, 0.78, -0.62),
      ],
      0.011,
      8
    )
  );
  const tl = roundedBox(0.16, 0.05, 0.02, 0.01);
  tl.translate(0, 0.7, -0.935);
  P.add('tail', tl);
  const fork = (t) => V(0, 0.86 - 0.655 * t, 0.33 + 0.29 * t);
  for (const x of [-0.065, 0.065]) {
    P.add(
      'dark',
      tube(
        [fork(0.3), fork(0.6)].map((p) => p.setX(x)),
        0.022,
        10
      )
    );
    P.add(
      'alu',
      tube(
        [fork(0.58), fork(1.03)].map((p) => p.setX(x)),
        0.026,
        10
      )
    );
  }
  const cvt = [
    {
      z: -0.7,
      p: [
        [0.06, 0.28],
        [0.12, 0.28],
        [0.135, 0.21],
        [0.12, 0.15],
        [0.06, 0.15],
      ],
    },
    {
      z: -0.4,
      p: [
        [0.06, 0.37],
        [0.13, 0.37],
        [0.155, 0.26],
        [0.13, 0.16],
        [0.06, 0.16],
      ],
    },
    {
      z: -0.08,
      p: [
        [0.06, 0.38],
        [0.11, 0.38],
        [0.13, 0.28],
        [0.11, 0.19],
        [0.06, 0.19],
      ],
    },
  ];
  for (const q of cvt) q.p.push(q.p[0]);
  P.add(
    'dark',
    loft(cvt, { seg: 2, smooth: 1, mirror: false, capFront: true, capRear: true, uv: 'plain' })
  );
  const eng = roundedBox(0.18, 0.18, 0.28, 0.04);
  eng.translate(-0.01, 0.27, -0.14);
  P.add('grey', eng);
  P.add(
    'exhaust',
    tube([V(-0.02, 0.18, 0.0), V(-0.08, 0.15, -0.15), V(-0.15, 0.22, -0.32)], 0.017, 8)
  );
  const muff = new THREE.CylinderGeometry(0.05, 0.055, 0.36, 16);
  muff.rotateX(Math.PI / 2 - 0.2);
  muff.translate(-0.17, 0.3, -0.55);
  P.add('exhaust', muff);
  const guard = roundedBox(0.012, 0.07, 0.24, 0.006);
  guard.rotateX(-0.2);
  guard.translate(-0.225, 0.31, -0.55);
  P.add('chrome', guard);
  P.add('spring', spring(V(0.15, 0.34, -0.6), V(0.15, 0.62, -0.47), 0.028, 0.006, 5));
  P.add('dark', tube([V(0.15, 0.31, -0.62), V(0.15, 0.65, -0.46)], 0.012, 8));
  P.add('dark', tube([V(0.13, 0.2, -0.02), V(0.2, 0.07, -0.12), V(0.22, 0.02, -0.16)], 0.01, 6));
  const plateB = roundedBox(0.2, 0.11, 0.006, 0.008);
  plateB.rotateX(-0.15);
  plateB.translate(0, 0.52, -0.98);
  P.add('dark', plateB);
  GENERIC = {
    parts: P,
    wheel: () =>
      buildWheel({ R: 0.205, rimR: 0.128, W: 0.09, disc: { r: 0.1, x: 0.045 }, lo: true }),
    FA,
    RA,
  };
  return GENERIC;
}
const GENERIC_MATS = {};
export function buildScooter(color) {
  const G = genericGeometry(),
    M = mats();
  const key = color;
  if (!GENERIC_MATS[key]) {
    const c = new THREE.Color(color);
    const hsl = {};
    c.getHSL(hsl);
    GENERIC_MATS[key] = {
      paint: new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.32,
        metalness: hsl.s < 0.15 ? 0.25 : 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
      dark: M.blackMatte,
      floor: M.floor,
      seat: M.seat,
      chrome: M.chrome,
      alu: M.alu,
      grey: M.grey,
      exhaust: M.exhaust,
      spring: M.spring,
      led: M.led,
      tail: M.tail,
      rubber: M.rubber,
      blackMatte: M.blackMatte,
      blackGloss: M.blackGloss,
      mirror: M.mirror,
    };
  }
  // geometry is built once and shared: each instance just references it
  if (!G.meshes)
    G.meshes = G.parts
      .build(GENERIC_MATS[key])
      .children.map((m) => ({ key: m.name, geo: m.geometry }));
  const g = new THREE.Group();
  for (const { key: k, geo } of G.meshes) {
    const m = new THREE.Mesh(geo, GENERIC_MATS[key][k]);
    m.castShadow = true;
    m.userData.shadow = true;
    g.add(m);
  }
  if (!G.wheelProto) G.wheelProto = G.wheel();
  const wheels = [G.FA, G.RA].map((a) => {
    const w = G.wheelProto.clone();
    w.position.set(0, a.y, a.z);
    g.add(w);
    return w;
  });
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.19, 0.095),
    new THREE.MeshStandardMaterial({ map: genericPlate(), roughness: 0.4 })
  );
  plate.position.set(0, 0.52, -0.985);
  plate.rotation.set(-0.15, Math.PI, 0);
  g.add(plate);
  g.userData.wheels = wheels;
  g.userData.rider = {
    grips: [
      [0.3, 1.0, 0.36],
      [-0.3, 1.0, 0.36],
    ],
    feet: [
      [0.12, 0.365, 0.13],
      [-0.12, 0.365, 0.13],
    ],
  };
  return g;
}
let GP = null;
const genericPlate = () => GP || (GP = plateTex('MAN-34'));

// Shared geometry + materials for ParkedScooters InstancedMesh (exact same 3D model as buildScooter,
// zero DOM/canvas usage so it also works cleanly in headless unit tests).
const PARKED_TRIM_COLORS = {
  dark: '#1a1b1e',
  floor: '#1d1e20',
  seat: '#1b1b1d',
  chrome: '#e8ebee',
  alu: '#b9bec4',
  grey: '#3a3d42',
  exhaust: '#2a2c30',
  spring: '#1d1e21',
  led: '#eef6ff',
  tail: '#d01828',
  rubber: '#141415',
  blackMatte: '#1a1b1e',
  blackGloss: '#0e0f11',
  mirror: '#c8d2dc',
  tire: '#18181a',
  rim: '#0e0e10',
  rimLip: '#d7dbe0',
  disc: '#c9ccd0',
  plate: '#f4f4f0',
};
function paintNonIndexed(src, hex) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const attr of Object.keys(g.attributes)) {
    if (attr !== 'position' && attr !== 'normal') g.deleteAttribute(attr);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color(hex);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
let PARKED_SCOOTER_ASSETS = null;
export function getParkedScooterAssets() {
  if (PARKED_SCOOTER_ASSETS) return PARKED_SCOOTER_ASSETS;
  const G = genericGeometry();
  const paintGeo = G.parts.geometry('paint');
  const trimList = [];
  for (const [key, list] of G.parts.map) {
    if (key === 'paint') continue;
    const hex = PARKED_TRIM_COLORS[key] || '#1a1b1e';
    for (const geo of list) trimList.push(paintNonIndexed(geo, hex));
  }
  const wheelParts = buildWheelParts({
    R: 0.205,
    rimR: 0.128,
    W: 0.09,
    disc: { r: 0.1, x: 0.045 },
    lo: true,
  });
  for (const ax of [G.FA, G.RA]) {
    for (const [key, list] of wheelParts.map) {
      const hex = PARKED_TRIM_COLORS[key] || '#18181a';
      for (const geo of list) {
        const g = paintNonIndexed(geo, hex);
        g.translate(0, ax.y, ax.z);
        trimList.push(g);
      }
    }
  }
  const plateGeo = new THREE.PlaneGeometry(0.19, 0.095);
  plateGeo.rotateY(Math.PI);
  plateGeo.rotateX(-0.15);
  plateGeo.translate(0, 0.52, -0.985);
  trimList.push(paintNonIndexed(plateGeo, PARKED_TRIM_COLORS.plate));

  PARKED_SCOOTER_ASSETS = {
    paintGeo,
    trimGeo: mergeGeometries(trimList),
    paintMat: new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.32,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    trimMat: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.52,
      metalness: 0.22,
    }),
  };
  return PARKED_SCOOTER_ASSETS;
}
