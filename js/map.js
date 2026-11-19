import * as THREE from 'three';
import { CollisionWorld, SegGrid, pointInPoly } from './collision.js';

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- geometry accumulator ----------
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; }
  tri(a, b, c, col, nrm, uva, uvb, uvc) {
    // a,b,c: [x,y,z]; nrm: desired facing; fix winding
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * nrm[0] + cy * nrm[1] + cz * nrm[2] < 0) { [b, c] = [c, b]; [uvb, uvc] = [uvc, uvb]; }
    this.p.push(...a, ...b, ...c);
    this.n.push(...nrm, ...nrm, ...nrm);
    this.c.push(...col, ...col, ...col);
    this.uv.push(...(uva || [0, 0]), ...(uvb || [0, 0]), ...(uvc || [0, 0]));
  }
  quad(a, b, c, d, col, nrm, uvs) {
    this.tri(a, b, c, col, nrm, uvs && uvs[0], uvs && uvs[1], uvs && uvs[2]);
    this.tri(a, c, d, col, nrm, uvs && uvs[0], uvs && uvs[2], uvs && uvs[3]);
  }
  flatPoly(pts, y, col, holes) {
    if (pts.length < 3) return;
    const v2 = r => r.map(p => new THREE.Vector2(p[0], p[1]));
    const hs = (holes || []).filter(h => h.length > 2);
    const all = hs.length ? pts.concat(...hs) : pts;
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(v2(pts), hs.map(v2)); } catch (e) { return; }
    for (const t of tris) {
      const A = all[t[0]], B = all[t[1]], C = all[t[2]];
      this.tri([A[0], y, A[1]], [B[0], y, B[1]], [C[0], y, C[1]], col, [0, 1, 0], [A[0] / 8, A[1] / 8], [B[0] / 8, B[1] / 8], [C[0] / 8, C[1] / 8]);
    }
  }
  disc(x, z, r, y, col, seg = 8) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      this.tri([x, y, z], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], col, [0, 1, 0]);
    }
  }
  strip(a, b, w, y, col) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    if (l < 0.01) return;
    const nx = -dz / l * w / 2, nz = dx / l * w / 2;
    this.quad([a[0] + nx, y, a[1] + nz], [b[0] + nx, y, b[1] + nz], [b[0] - nx, y, b[1] - nz], [a[0] - nx, y, a[1] - nz], col, [0, 1, 0]);
  }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  }
}

const col = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const inArea = (x, z, p) => pointInPoly(x, z, p) && !(p.holes && p.holes.some(h => pointInPoly(x, z, h)));

// ---------- textures ----------
function canvasTex(w, h, draw, repeat = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

// facade base patterns for OSM building:material; drawn light grey so the
// per-building vertex tint still sets the colour
const FACADE = {
  brick(g, x, y, S) {
    g.fillStyle = '#f4f4f4'; g.fillRect(x, y, S, S); g.fillStyle = 'rgba(0,0,0,0.16)';
    for (let k = 0, r = 0; k < S; k += 5, r++) { g.fillRect(x, y + k, S, 1); for (let j = (r % 2) * 6; j < S; j += 12) g.fillRect(x + j, y + k, 1, 5); }
  },
  tiles(g, x, y, S) {
    g.fillStyle = '#f6f6f6'; g.fillRect(x, y, S, S); g.fillStyle = 'rgba(0,0,0,0.1)';
    for (let k = 0, r = 0; k < S; k += 4, r++) { g.fillRect(x, y + k, S, 1); for (let j = (r % 2) * 8; j < S; j += 16) g.fillRect(x + j, y + k, 1, 4); }
  },
  concrete(g, x, y, S, rnd) {
    g.fillStyle = '#f0f0f0'; g.fillRect(x, y, S, S);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.05})`; g.fillRect(x + rnd() * S, y + rnd() * S, 1.5, 1.5); }
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, y + S / 2, S, 1); g.fillRect(x + S / 2, y, 1, S);
  },
  stone(g, x, y, S, rnd) {
    for (let k = 0, r = 0; k < S; k += 10, r++) for (let j = -(r % 2) * 8; j < S; j += 16) {
      const v = 225 + Math.floor(rnd() * 25); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + Math.max(0, j), y + k, 16, 10);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let k = 0, r = 0; k < S; k += 10, r++) { g.fillRect(x, y + k, S, 1); for (let j = (r % 2) * 8; j < S; j += 16) g.fillRect(x + j, y + k, 1, 10); }
  },
  plaster(g, x, y, S, rnd) {
    g.fillStyle = '#fafafa'; g.fillRect(x, y, S, S);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.04})`; g.fillRect(x + rnd() * S, y + rnd() * S, 3, 2); }
  },
  wood(g, x, y, S, rnd) {
    for (let j = 0; j < S; j += 6) { const v = 220 + Math.floor(rnd() * 30); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + j, y, 6, S); }
    g.fillStyle = 'rgba(0,0,0,0.2)'; for (let j = 0; j < S; j += 6) g.fillRect(x + j, y, 1, S);
  },
  metal(g, x, y, S) {
    for (let j = 0; j < S; j += 4) { g.fillStyle = '#f2f2f2'; g.fillRect(x + j, y, 2, S); g.fillStyle = '#d4d4d4'; g.fillRect(x + j + 2, y, 2, S); }
  },
};
// OSM building:material values -> facade pattern
const MAT_KEY = {
  brick: 'brick', concrete: 'concrete', cement_block: 'concrete', reinforced_concrete: 'concrete',
  glass: 'glass', mirror: 'glass', metal: 'metal', steel: 'metal', aluminium: 'metal', metal_plates: 'metal',
  stone: 'stone', sandstone: 'stone', limestone: 'stone', granite: 'stone', marble: 'stone',
  plaster: 'plaster', wood: 'wood', timber_framing: 'wood', bamboo: 'wood', tile: 'tiles', tiles: 'tiles', ceramic: 'tiles',
};

function windowTextures(style, seed, mat) {
  const rnd = mulberry32(seed);
  const N = 8, S = 64;
  const lit = [];
  for (let i = 0; i < N * N; i++) lit.push(rnd() < 0.38 ? (rnd() < 0.7 ? '#ffd58a' : '#cfe6ff') : null);
  const ac = [];
  for (let i = 0; i < N * N; i++) ac.push(rnd() < 0.3);
  const map = canvasTex(N * S, N * S, (g) => {
    for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
      const x = ix * S, y = iy * S;
      if (mat === 'glass') {
        // curtain wall: one big pane per bay with mullions and a spandrel band
        g.fillStyle = '#ffffff'; g.fillRect(x, y, S, S);
        g.fillStyle = '#5d6f7f'; g.fillRect(x + 2, y + 2, S - 4, S - 14);
        g.fillStyle = 'rgba(220,235,250,0.35)'; g.fillRect(x + 4, y + 4, (S - 8) / 2, S - 18);
        g.fillStyle = '#c8ccd0'; g.fillRect(x + S / 2 - 1, y + 2, 2, S - 14);
        continue;
      }
      if (FACADE[mat]) FACADE[mat](g, x, y, S, rnd);
      else {
        g.fillStyle = '#ffffff'; g.fillRect(x, y, S, S);
        // subtle tile lines
        g.fillStyle = 'rgba(0,0,0,0.05)';
        for (let k = 0; k < S; k += 8) g.fillRect(x, y + k, S, 1);
      }
      if (style === 'campus') {
        g.fillStyle = '#2d3b4c'; g.fillRect(x + 6, y + 14, S - 12, S - 26);
        g.fillStyle = 'rgba(160,190,220,0.35)'; g.fillRect(x + 8, y + 16, (S - 16) / 2, S - 30);
        g.fillStyle = '#d0ccc4'; g.fillRect(x + S / 2 - 1, y + 14, 2, S - 26);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + S - 10, S, 3);
      } else {
        g.fillStyle = '#34404a'; g.fillRect(x + 12, y + 16, S - 24, S - 30);
        g.fillStyle = 'rgba(150,180,200,0.3)'; g.fillRect(x + 14, y + 18, 12, S - 34);
        // iron grille
        g.fillStyle = 'rgba(40,40,40,0.55)';
        for (let k = x + 14; k < x + S - 12; k += 6) g.fillRect(k, y + 14, 1.5, S - 26);
        if (ac[iy * N + ix]) { g.fillStyle = '#e8e8e2'; g.fillRect(x + S - 22, y + S - 22, 16, 11); g.fillStyle = '#999'; g.fillRect(x + S - 20, y + S - 20, 12, 7); }
      }
    }
  });
  const emi = canvasTex(N * S, N * S, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, N * S, N * S);
    for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
      const l = lit[iy * N + ix]; if (!l) continue;
      g.fillStyle = l;
      if (mat === 'glass') g.fillRect(ix * S + 2, iy * S + 2, S - 4, S - 14);
      else if (style === 'campus') g.fillRect(ix * S + 6, iy * S + 14, S - 12, S - 26);
      else g.fillRect(ix * S + 12, iy * S + 16, S - 24, S - 30);
    }
  });
  return { map, emi };
}

export function labelTexture(text, opt = {}) {
  const fs = opt.size || 44, pad = 14;
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d');
  g.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2 + (opt.icon ? fs : 0);
  cv.width = w; cv.height = fs + pad * 2;
  g.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
  g.fillStyle = opt.bg || 'rgba(12,14,26,0.78)';
  const r = 12; g.beginPath(); g.roundRect(0, 0, cv.width, cv.height, r); g.fill();
  if (opt.border) { g.strokeStyle = opt.border; g.lineWidth = 4; g.stroke(); }
  g.fillStyle = opt.color || '#fff'; g.textBaseline = 'middle';
  g.fillText((opt.icon || '') + text, pad, cv.height / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: cv.width / cv.height };
}

export function makeLabel(text, opt = {}) {
  const { tex, aspect } = labelTexture(text, opt);
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: opt.depthTest ?? true, transparent: true, fog: false });
  const s = new THREE.Sprite(m);
  const h = opt.height || 3;
  s.scale.set(h * aspect, h, 1);
  s.renderOrder = 10;
  return s;
}

function signTexture(word, bg, fg) {
  return canvasTex(64, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 64, 256);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 56, 248);
    g.fillStyle = fg; g.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...word];
    const step = 236 / chars.length;
    chars.forEach((ch, i) => g.fillText(ch, 32, 12 + step * (i + 0.5)));
  }, false);
}

export function bannerTexture() {
  return canvasTex(1024, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 1024, 512);
    gr.addColorStop(0, '#1d3fd1'); gr.addColorStop(1, '#0b1a66');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 486, 1024, 26);
    g.beginPath(); g.arc(150, 256, 115, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0b1a66'; g.font = '900 130px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('34', 150, 262);
    g.textAlign = 'left'; g.fillStyle = '#fff';
    g.font = '800 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText('第34屆 資管系學會會長候選人', 300, 92);
    g.fillStyle = '#ffffff'; g.font = '900 150px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.fillText('資管要贏', 292, 236);
    g.fillStyle = '#ffd23f';
    g.fillText('票投彥霖', 292, 400);
  }, false);
}

function clockFaceTexture() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#7a3b2a'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#f6f1e2'; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#222';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 92 - 4, 128 - Math.cos(a) * 92 - 4, 8, 8); }
  }, false);
}

// ---------- world ----------
const AREA_COL = {
  park: '#55803f', grass: '#62924a', pitch: '#4f9446', track: '#b5553f', water: '#3a78a8',
  parking: '#5d6066', construction: '#8e7a5c', school: '#a3a08f', commercial: '#8b8a84',
  industrial: '#7d7b74', residential: null,
};
const ROAD_LAYER = { footway: 0, path: 0, cycleway: 0, steps: 0, pedestrian: 0, track: 0, service: 1, living_street: 2, residential: 2, unclassified: 3, tertiary: 4, secondary: 5, primary: 6 };

export function buildWorld(scene, data, onProgress = () => { }, opts = {}) {
  const B = data.bounds;
  const rnd = mulberry32(20240034);
  const world = { data, bounds: B, labels: [], animated: [], named: {} };
  const collision = new CollisionWorld(B, 16);
  const roadGrid = new SegGrid(20);
  world.collision = collision; world.roadGrid = roadGrid;
  collision.reserved = opts.reserved || [];

  const campusRing = data.campus.length ? data.campus.reduce((a, b) => (a.length > b.length ? a : b)) : [];
  world.inCampus = (x, z) => data.campus.some(r => pointInPoly(x, z, r));

  // ground layers draw in order without depth writes (no z-fighting)
  let layerOrder = -100;
  const flatMat = () => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, depthWrite: false });
    return m;
  };
  const addFlat = (geo, mat) => {
    const m = geo.mesh(mat || flatMat()); m.receiveShadow = true; m.renderOrder = layerOrder++; scene.add(m); return m;
  };

  // base ground
  {
    const g = new THREE.PlaneGeometry(B.maxX - B.minX + 2000, B.maxZ - B.minZ + 2000);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: '#6f716a' }));
    m.position.set((B.minX + B.maxX) / 2, 0, (B.minZ + B.maxZ) / 2);
    m.receiveShadow = true; m.renderOrder = layerOrder++;
    scene.add(m);
    world.groundMesh = m;
  }
  // campus paving
  {
    const g = new Geo();
    for (const r of data.campus) g.flatPoly(r, 0.01, col('#a8a395'));
    addFlat(g);
  }
  // areas
  const waterPolys = [];
  const greenPolys = [];
  const sportPolys = []; // no trees on pitches / tracks
  {
    const g = new Geo();
    for (const a of data.areas) {
      const c = AREA_COL[a.kind]; if (!c) continue;
      g.flatPoly(a.pts, 0.02, col(c), a.holes);
      // holes ride along on the ring array so inArea() can skip them
      const ring = a.holes ? Object.assign(a.pts.slice(), { holes: a.holes }) : a.pts;
      if (a.kind === 'water') waterPolys.push(ring);
      if (a.kind === 'park' || a.kind === 'grass') greenPolys.push(ring);
      if (a.kind === 'pitch' || a.kind === 'track') sportPolys.push(a.pts);
    }
    // waterways
    for (const w of data.waterways) for (let i = 0; i < w.pts.length - 1; i++) { g.strip(w.pts[i], w.pts[i + 1], w.w, 0.02, col('#3a78a8')); g.disc(w.pts[i][0], w.pts[i][1], w.w / 2, 0.02, col('#3a78a8')); }
    addFlat(g);
  }
  world.waterPolys = waterPolys;
  onProgress(0.25);

  // rail
  {
    const g = new Geo();
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) { g.strip(r.pts[i], r.pts[i + 1], 4.5, 0.03, col('#6b5d50')); g.disc(r.pts[i][0], r.pts[i][1], 2.25, 0.03, col('#6b5d50')); }
    addFlat(g);
    const g2 = new Geo();
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      for (const s of [-0.75, 0.75]) g2.strip([a[0] + nx * s, a[1] + nz * s], [b[0] + nx * s, b[1] + nz * s], 0.12, 0.04, col('#c9c9c9'));
    }
    addFlat(g2);
  }

  // roads, by layer
  const layers = [...Array(7)].map(() => new Geo());
  const marks = new Geo();
  const roadCol = (r) => {
    if (ROAD_LAYER[r.type] === 0) {
      return world.inCampus(r.pts[0][0], r.pts[0][1]) ? col('#c7bda7') : col('#9c978b');
    }
    return col(r.type === 'service' ? '#4a4c52' : '#3b3d43');
  };
  for (const r of data.roads) {
    const L = ROAD_LAYER[r.type] ?? 1;
    const g = layers[L]; const c = roadCol(r);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      g.strip(a, b, r.w, 0.03, c);
      roadGrid.add(a[0], a[1], b[0], b[1], r.w, r);
      if (r.type === 'primary' || r.type === 'secondary' || r.type === 'tertiary') {
        const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = 2; s < l - 3; s += 9) {
          const t0 = s / l, t1 = (s + 3.5) / l;
          marks.strip([a[0] + dx * t0, a[1] + dz * t0], [a[0] + dx * t1, a[1] + dz * t1], 0.22, 0.04, r.type === 'primary' ? col('#e9c64a') : col('#e8e8e8'));
        }
      }
    }
    for (const p of r.pts) g.disc(p[0], p[1], r.w / 2, 0.03, c, L === 0 ? 6 : 10);
  }
  for (const g of layers) addFlat(g);
  addFlat(marks);
  onProgress(0.4);

  // ---------- buildings ----------
  // one wall mesh per facade (window style + OSM material); material variants
  // are only built when some building actually carries the tag
  const wallMat = {}; const wallGeo = {};
  const wallFor = (style, mat) => {
    const k = mat ? style + ':' + mat : style;
    if (!wallGeo[k]) {
      const t = windowTextures(style, (style === 'campus' ? 7 : 11) + (mat ? mat.length * 101 : 0), mat);
      wallMat[k] = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, vertexColors: true, roughness: mat === 'glass' || mat === 'metal' ? 0.4 : 0.85, metalness: mat === 'metal' ? 0.3 : 0.0 });
      wallGeo[k] = new Geo();
    }
    return wallGeo[k];
  };
  wallFor('campus'); wallFor('town');
  const roofGeo = new Geo();
  const PAL = {
    campus: ['#d8cfc0', '#c9a48b', '#b8705a', '#e9e4da', '#c4b5a0', '#a86d5d'],
    dorm: ['#e2d4bd', '#cdb79c', '#d9c9b5'],
    town: ['#d6d2c8', '#bfb8aa', '#e0d6c2', '#a8a8a0', '#cfc4b4', '#b9b0a6', '#d9cdbd', '#c7cfd3', '#e6dccb', '#b7a99a'],
    commercial: ['#9fa6ad', '#c0c4c8', '#b0b6a8'],
    church: ['#f0ece2', '#e9e2d0'],
    small: ['#dddddd'],
  };
  // OSM building:colour / building:material (rare in this area) override the palette
  const MAT_COL = { brick: '#a65a43', concrete: '#bdbab3', glass: '#9fb4c2', metal: '#9aa0a6', stone: '#c9c1b2', wood: '#9a7650', plaster: '#e3dccd', tiles: '#cdb9a4' };
  const NAMED_COL = { white: '#eeeeea', grey: '#a8a8a4', gray: '#a8a8a4', red: '#a85848', brown: '#8a6a50', beige: '#e0d2b4', yellow: '#e2cf8a', blue: '#8fa6bf', black: '#444444' };
  const ROOF_MAT_COL = { roof_tiles: '#9a4a3a', tile: '#9a4a3a', tiles: '#9a4a3a', metal: '#7d8a94', metal_sheet: '#7d8a94', concrete: '#9a9890', asphalt: '#5a5a5a', glass: '#8aa4b4', grass: '#5d7d44', slate: '#5a6068', wood: '#7a5a3c' };
  const hexOrNamed = v => {
    const c = (v || '').trim().toLowerCase();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(c)) return c;
    return NAMED_COL[c] || null;
  };
  const matKey = b => MAT_KEY[(b.material || '').trim().toLowerCase()] || null;
  const osmCol = b => hexOrNamed(b.colour) || MAT_COL[matKey(b)] || null;
  const osmRoofCol = b => hexOrNamed(b.roofColour) || ROOF_MAT_COL[(b.roofMaterial || '').trim().toLowerCase()] || null;
  // pitched roofs from OSM roof:shape; returns false for flat / unsupported
  const triN = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    if (n[1] < 0) n = n.map(v => -v);
    const l = Math.hypot(...n) || 1; return n.map(v => v / l);
  };
  const rtri = (a, b, c, cl) => roofGeo.tri(a, b, c, cl, triN(a, b, c));
  const pitchedRoof = (b, pts, h, rc, wc) => {
    const shape = (b.roof || '').trim().toLowerCase();
    if (!shape || shape === 'flat' || b.holes) return false;
    // footprint frame along the longest edge
    let li = 0, ll = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > ll) { ll = l; li = i; } }
    const a0 = pts[li], a1 = pts[(li + 1) % pts.length];
    const ux = (a1[0] - a0[0]) / ll, uz = (a1[1] - a0[1]) / ll;
    let v0 = 1e9, v1 = -1e9;
    for (const p of pts) { const v = (p[0] - a0[0]) * -uz + (p[1] - a0[1]) * ux; v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const rise = b.roofH || Math.min(6, Math.max(1.2, (v1 - v0) * 0.3));
    const P = (p, y) => [p[0], y, p[1]];
    if (pts.length === 4 && (shape === 'gabled' || shape === 'skillion')) {
      const [p0, p1, p2, p3] = [0, 1, 2, 3].map(k => pts[(li + k) % 4]);
      if (shape === 'gabled') {
        const m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], m2 = [(p3[0] + p0[0]) / 2, (p3[1] + p0[1]) / 2];
        rtri(P(p0, h), P(p1, h), P(m1, h + rise), rc); rtri(P(p0, h), P(m1, h + rise), P(m2, h + rise), rc);
        rtri(P(p2, h), P(p3, h), P(m2, h + rise), rc); rtri(P(p2, h), P(m2, h + rise), P(m1, h + rise), rc);
        // gable ends
        roofGeo.tri(P(p1, h), P(p2, h), P(m1, h + rise), wc, [p2[1] - p1[1], 0, p1[0] - p2[0]].map(v => v / (Math.hypot(p2[1] - p1[1], p1[0] - p2[0]) || 1)));
        roofGeo.tri(P(p3, h), P(p0, h), P(m2, h + rise), wc, [p0[1] - p3[1], 0, p3[0] - p0[0]].map(v => v / (Math.hypot(p0[1] - p3[1], p3[0] - p0[0]) || 1)));
      } else {
        rtri(P(p0, h), P(p1, h), P(p2, h + rise), rc); rtri(P(p0, h), P(p2, h + rise), P(p3, h + rise), rc);
        const wn = (a, c) => { const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [(c[1] - a[1]) / l, 0, -(c[0] - a[0]) / l]; };
        roofGeo.tri(P(p1, h), P(p2, h), P(p2, h + rise), wc, wn(p1, p2));
        roofGeo.tri(P(p3, h), P(p0, h), P(p3, h + rise), wc, wn(p3, p0));
        roofGeo.quad(P(p2, h), P(p3, h), P(p3, h + rise), P(p2, h + rise), wc, wn(p2, p3));
      }
      return true;
    }
    // hipped / pyramidal / dome / other pitched shapes: fan to an apex
    if (shape === 'skillion') return false;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (!pointInPoly(cx, cz, pts)) return false;
    for (let i = 0; i < pts.length; i++) rtri(P(pts[i], h), P(pts[(i + 1) % pts.length], h), [cx, h + rise, cz], rc);
    return true;
  };
  const tanks = []; const signs = [];
  world.buildings = data.buildings;
  data.buildings.forEach((b, bi) => {
    const pts = b.pts; const h = b.h;
    if (b.skip) {
      if (b.name) world.named[b.name] = { x: pts.reduce((s, p) => s + p[0], 0) / pts.length, z: pts.reduce((s, p) => s + p[1], 0) / pts.length, h: b.labelH || h, b };
      return;
    }
    const pal = PAL[b.kind] || PAL.town;
    const pick = pal[Math.floor(rnd() * pal.length)];
    const tint = col(osmCol(b) || pick);
    const style = (b.kind === 'campus' || b.kind === 'dorm' || b.kind === 'commercial' || b.kind === 'church') ? 'campus' : 'town';
    const g = wallFor(style, matKey(b));
    // outer ring is CCW, courtyard rings CW, so the same normal faces outwards
    const rings = b.holes ? [pts, ...b.holes] : [pts];
    const bay = style === 'campus' ? 3.6 : 3.0;
    // whole window rows per storey so the top floor isn't cut in half
    const floors = b.floors || Math.max(1, Math.round((h - 0.6) / 3.3));
    let acc = Math.floor(rnd() * 8) * bay;
    const vOff = Math.floor(rnd() * 8) / 8;
    for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
      if (l < 0.05) continue;
      const n = [dz / l, 0, -dx / l]; // outward for CCW (x,z)
      const u0 = acc / (bay * 8), u1 = (acc + l) / (bay * 8); acc += l;
      const v1 = floors / 8 + vOff;
      g.quad([a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], h, c[1]], [a[0], h, a[1]], tint, n,
        [[u0, vOff], [u1, vOff], [u1, v1], [u0, v1]]);
      if (ring === pts && b.kind === 'town' && l > 4 && rnd() < 0.22 && signs.length < 260) {
        signs.push({ x: (a[0] + c[0]) / 2 + n[0] * 0.7, z: (a[1] + c[1]) / 2 + n[2] * 0.7, y: Math.min(h - 2, 4 + rnd() * 3), rot: Math.atan2(dx, dz) });
      }
    }
    const rc = osmRoofCol(b) ? col(osmRoofCol(b)) : tint.map(v => v * 0.62);
    const pitched = pitchedRoof(b, pts, h, rc, tint.map(v => v * 0.85));
    if (!pitched) roofGeo.flatPoly(pts, h, rc, b.holes);
    // parapet
    if (!pitched) for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
      const n = [dz / l, 0, -dx / l];
      roofGeo.quad([a[0], h, a[1]], [c[0], h, c[1]], [c[0], h + 0.6, c[1]], [a[0], h + 0.6, a[1]], tint.map(v => v * 0.85), n);
      roofGeo.quad([a[0], h + 0.6, a[1]], [c[0], h + 0.6, c[1]], [c[0] - n[0] * 0.25, h + 0.6, c[1] - n[2] * 0.25], [a[0] - n[0] * 0.25, h + 0.6, a[1] - n[2] * 0.25], tint.map(v => v * 0.9), [0, 1, 0]);
    }
    if (b.kind === 'town' && rnd() < 0.55 && !pitched) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (pointInPoly(cx, cz, pts)) tanks.push([cx + (rnd() - .5), h, cz + (rnd() - .5)]);
    }
    collision.addPolygon(pts);
    if (b.name) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      world.named[b.name] = { x: cx, z: cz, h, b };
    }
  });
  for (const k in wallGeo) {
    const m = wallGeo[k].mesh(wallMat[k]); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }
  world.windowMats = Object.values(wallMat);
  {
    const m = roofGeo.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }
  // rooftop water tanks (very Taiwan)
  if (tanks.length) {
    const tg = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10); tg.translate(0, 1.6, 0);
    const legs = new THREE.BoxGeometry(1.4, 0.8, 1.4); legs.translate(0, 0.4, 0);
    const im = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: '#d9d4c3' }), tanks.length);
    const im2 = new THREE.InstancedMesh(legs, new THREE.MeshLambertMaterial({ color: '#555' }), tanks.length);
    const M = new THREE.Matrix4();
    tanks.forEach((t, i) => { M.makeTranslation(t[0], t[1] + 0.6, t[2]); im.setMatrixAt(i, M); im2.setMatrixAt(i, M); });
    im.castShadow = true; scene.add(im, im2);
  }
  // vertical shop signs
  {
    const words = [['小吃', '#c8102e', '#fff'], ['飲料', '#0a7d3b', '#fff'], ['早餐', '#ffd23f', '#c8102e'], ['便當', '#ff7a00', '#fff'], ['藥局', '#1a5fd1', '#fff'], ['機車行', '#222', '#ffd23f'], ['影印', '#6b2bd1', '#fff'], ['牛肉麵', '#a3001b', '#ffe9a8'], ['租屋', '#008891', '#fff'], ['滷味', '#5c2a00', '#ffd23f']];
    const geo = new THREE.BoxGeometry(0.22, 2.6, 0.9);
    const per = words.map(() => []);
    signs.forEach((s, i) => per[i % words.length].push(s));
    world.signMats = [];
    words.forEach((w, wi) => {
      if (!per[wi].length) return;
      const tex = signTexture(w[0], w[1], w[2]);
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.2, roughness: 0.6 });
      world.signMats.push(mat);
      const im = new THREE.InstancedMesh(geo, mat, per[wi].length);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
      per[wi].forEach((s, i) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot + Math.PI / 2); P.set(s.x, s.y + 1.3, s.z); M.compose(P, Q, S); im.setMatrixAt(i, M); });
      scene.add(im);
    });
  }
  onProgress(0.6);

  // ---------- road graph ----------
  const nodes = new Map();
  const getNode = (id, p) => { let n = nodes.get(id); if (!n) { n = { id, x: p[0], z: p[1], adj: [] }; nodes.set(id, n); } return n; };
  const inB = p => p[0] > B.minX + 5 && p[0] < B.maxX - 5 && p[1] > B.minZ + 5 && p[1] < B.maxZ - 5;
  for (const r of data.roads) {
    if (!r.nodes || r.nodes.length !== r.pts.length) continue;
    const drive = !!r.drive && !(r.type === 'service' && !r.name);
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (!inB(r.pts[i]) || !inB(r.pts[i + 1])) continue;
      const a = getNode(r.nodes[i], r.pts[i]), b = getNode(r.nodes[i + 1], r.pts[i + 1]);
      if (a === b) continue;
      a.adj.push({ to: b, w: r.w, drive, road: r, fwd: true });
      if (!r.oneway) b.adj.push({ to: a, w: r.w, drive, road: r, fwd: false });
      else b.adj.push({ to: a, w: r.w, drive: false, road: r, fwd: false });
    }
  }
  world.graph = nodes;
  world.driveNodes = [...nodes.values()].filter(n => n.adj.some(e => e.drive));
  world.walkNodes = [...nodes.values()].filter(n => n.adj.length);

  world.nearestRoadPoint = (x, z, driveOnly = false) => {
    let best = null, bd = 1e9;
    for (const r of data.roads) {
      if (driveOnly && !r.drive) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
        let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
        const qx = a[0] + dx * t, qz = a[1] + dz * t, d = Math.hypot(qx - x, qz - z);
        if (d < bd) { bd = d; best = { x: qx, z: qz, dir: Math.atan2(dx, dz), road: r }; }
      }
    }
    return best;
  };
  world.isFree = (x, z, r = 1) => !collision.blocked(x, z, r) && !waterPolys.some(p => inArea(x, z, p));

  // ---------- landmarks ----------
  const poi = name => data.pois.find(p => p.name === name);
  const standard = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  // Clock tower 二一鐘
  const ct = poi('鐘塔');
  if (ct) {
    const g = new THREE.Group();
    const brick = standard('#a4553f'), white = standard('#efe9dc');
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1, 4.4), white); base.position.y = 0.5;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 16, 3.2), brick); shaft.position.y = 9;
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 3.6), white); band.position.y = 13;
    const head = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.8, 3.8), white); head.position.y = 18.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 4, 4), standard('#5b2b22')); roof.position.y = 22.8; roof.rotation.y = Math.PI / 4;
    g.add(base, shaft, band, head, roof);
    const face = new THREE.MeshStandardMaterial({ map: clockFaceTexture(), roughness: 0.5, emissive: '#fff1c8', emissiveIntensity: 0 });
    world.clockFaceMat = face;
    const hands = [];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), face);
      const a = i * Math.PI / 2;
      f.position.set(Math.sin(a) * 1.92, 18.9, Math.cos(a) * 1.92); f.rotation.y = a; g.add(f);
      const hg = new THREE.Group(); hg.position.copy(f.position).multiplyScalar(1.005); hg.position.y = 18.9; hg.rotation.y = a;
      const hh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.03), standard('#111')); hh.geometry.translate(0, 0.42, 0.03);
      const mh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.03), standard('#111')); mh.geometry.translate(0, 0.62, 0.04);
      const hp = new THREE.Group(); hp.add(hh); const mp = new THREE.Group(); mp.add(mh);
      hg.add(hp, mp); g.add(hg); hands.push([hp, mp]);
    }
    world.clockHands = hands;
    g.position.set(ct.x, 0, ct.z);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    collision.addCircle(ct.x, ct.z, 2.6);
    world.named['鐘塔'] = { x: ct.x, z: ct.z, h: 25 };
  }
  // Old gate 舊校門
  const og = poi('舊校門');
  if (og) {
    const near = world.nearestRoadPoint(og.x, og.z);
    const dir = near ? near.dir : 0;
    const g = new THREE.Group();
    const stone = standard('#cfc6b4');
    for (const s of [-4.2, 4.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, 5.5, 1.3), stone); p.position.set(s, 2.75, 0); g.add(p); collision.addCircle(og.x + Math.cos(dir) * s, og.z - Math.sin(dir) * s, 0.9); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(10.4, 1.4, 1.5), stone); top.position.y = 6.1; g.add(top);
    const lt = labelTexture('中原大學', { size: 60, bg: '#7a2b1f', color: '#ffe9a8' });
    for (const s of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), new THREE.MeshBasicMaterial({ map: lt.tex })); pl.position.set(0, 6.1, 0.76 * s); if (s < 0) pl.rotation.y = Math.PI; g.add(pl); }
    g.position.set(og.x, 0, og.z); g.rotation.y = dir + Math.PI / 2;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
  }
  // Fountain 中原噴水池
  const fp = data.areas.find(a => a.name === '中原噴水池');
  if (fp) {
    const cx = fp.pts.reduce((s, p) => s + p[0], 0) / fp.pts.length, cz = fp.pts.reduce((s, p) => s + p[1], 0) / fp.pts.length;
    const N = 260; const pos = new Float32Array(N * 3); const seeds = [];
    for (let i = 0; i < N; i++) seeds.push([rnd() * Math.PI * 2, 0.6 + rnd() * 0.8, rnd()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#cfe8ff', size: 0.13, transparent: true, opacity: 0.7 }));
    pts.frustumCulled = false; scene.add(pts);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.2, 16), standard('#bbb3a2')); basin.position.set(cx, 0.6, cz); scene.add(basin);
    world.animated.push((t) => {
      for (let i = 0; i < N; i++) {
        const [a, sp, ph] = seeds[i]; const k = (t * 0.6 + ph) % 1;
        const r = k * 2.6 * sp; pos[i * 3] = cx + Math.cos(a) * r; pos[i * 3 + 2] = cz + Math.sin(a) * r;
        pos[i * 3 + 1] = 1.2 + 4.5 * k * (1 - k) * 4 * sp - 0.3;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  // Campaign billboards
  const bTex = bannerTexture();
  const boardMat = new THREE.MeshStandardMaterial({ map: bTex, emissiveMap: bTex, emissive: '#fff', emissiveIntensity: 0.15, roughness: 0.6 });
  const addBoard = (x, z, rot, s = 1) => {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(6 * s, 3 * s, 0.15), [standard('#222'), standard('#222'), standard('#222'), standard('#222'), boardMat, boardMat]);
    board.position.y = 2.2 * s + 1.5 * s;
    for (const sx of [-2.6 * s, 2.6 * s]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4 * s + 1.5 * s), standard('#333', { metalness: 0.6 })); p.position.set(sx, (2.4 * s + 1.5 * s) / 2, 0); g.add(p); }
    g.add(board); g.position.set(x, 0, z); g.rotation.y = rot;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    collision.addCircle(x + Math.cos(rot) * 2.6 * s, z - Math.sin(rot) * 2.6 * s, 0.3);
    collision.addCircle(x - Math.cos(rot) * 2.6 * s, z + Math.sin(rot) * 2.6 * s, 0.3);
  };
  world.addBoard = addBoard;

  // Night market stalls 中原夜市
  // centre of OSM relation 13287977 (中原夜市), see tools/build_map.py
  world.nightMarket = data.nightMarket ? { x: data.nightMarket.x, z: data.nightMarket.z } : { x: -200, z: 280 };
  {
    const nm = world.nightMarket;
    const stallTop = new THREE.BoxGeometry(3.0, 0.3, 2.6);
    const stallBody = new THREE.BoxGeometry(2.5, 1.0, 1.8);
    const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#d62828', '#ffffff', '#1d3557'];
    const spots = [];
    for (const r of data.roads) {
      if (!r.drive) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = 2; s < l; s += 3.4) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l;
          if (Math.hypot(x - nm.x, z - nm.z) > 85) continue;
          for (const side of [1, -1]) {
            const nx = -dz / l * side, nz = dx / l * side;
            const px = x + nx * (r.w / 2 + 1.5), pz = z + nz * (r.w / 2 + 1.5);
            if (rnd() < 0.8 && !collision.blocked(px, pz, 1.5) && !spots.some(q => Math.hypot(q[0] - px, q[1] - pz) < 3)) spots.push([px, pz, Math.atan2(dx, dz), nx, nz]);
          }
        }
      }
    }
    // unlit canopies so the market glows at night
    const top = new THREE.InstancedMesh(stallTop, new THREE.MeshBasicMaterial({ color: '#ffffff' }), spots.length);
    const body = new THREE.InstancedMesh(stallBody, new THREE.MeshStandardMaterial({ color: '#a7a9ac', roughness: 0.4, metalness: 0.5, emissive: '#ffcf8a', emissiveIntensity: 0 }), spots.length);
    const backG = new THREE.BoxGeometry(2.9, 2.2, 0.06); backG.translate(0, 1.4, -1.25);
    const back = new THREE.InstancedMesh(backG, new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.9 }), spots.length);
    const lantern = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff3b2f' }), spots.length * 2);
    world.stallBodyMat = body.material;
    // warm glow on the street
    const glow = new THREE.Mesh(new THREE.CircleGeometry(80, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(nm.x, 0.07, nm.z); glow.renderOrder = layerOrder++; scene.add(glow);
    world.marketGlow = glow.material;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r, onx, onz], i) => {
      Q.setFromAxisAngle(Y, r);
      P.set(x, 2.5, z); M.compose(P, Q, S); top.setMatrixAt(i, M); top.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      P.set(x, 0.5, z); M.compose(P, Q, S); body.setMatrixAt(i, M);
      // back panel faces the road: stall local -z points away from the street side
      const Qb = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(-onx, -onz));
      P.set(x, 0, z); M.compose(P, Qb, S); back.setMatrixAt(i, M);
      const ox = Math.cos(r) * 1.3, oz = -Math.sin(r) * 1.3;
      P.set(x + ox, 2.15, z + oz); M.compose(P, Q, S); lantern.setMatrixAt(i * 2, M);
      P.set(x - ox, 2.15, z - oz); M.compose(P, Q, S); lantern.setMatrixAt(i * 2 + 1, M);
      collision.addCircle(x, z, 1.1);
    });
    top.castShadow = true; body.castShadow = true; back.castShadow = true;
    scene.add(top, body, lantern, back);
    world.lanternMat = lantern.material;
  }
  onProgress(0.7);

  // ---------- street lamps ----------
  {
    const spots = [];
    for (const r of data.roads) {
      if (!r.drive || !r.name || r.type === 'service') continue;
      let acc = 0;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = (30 - acc % 30); s < l; s += 30) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l;
          const nx = -dz / l, nz = dx / l, side = spots.length % 2 ? 1 : -1;
          const px = x + nx * side * (r.w / 2 + 0.6), pz = z + nz * side * (r.w / 2 + 0.6);
          if (!collision.blocked(px, pz, 0.5)) spots.push([px, pz, Math.atan2(-nx * side, -nz * side)]);
        }
        acc += l;
      }
    }
    const pole = new THREE.CylinderGeometry(0.09, 0.12, 7, 6); pole.translate(0, 3.5, 0);
    const arm = new THREE.BoxGeometry(0.1, 0.1, 1.6); arm.translate(0, 7, 0.8);
    const head = new THREE.BoxGeometry(0.35, 0.15, 0.6); head.translate(0, 6.9, 1.5);
    const poleM = new THREE.InstancedMesh(pole, standard('#4a4f55', { metalness: 0.5 }), spots.length);
    const armM = new THREE.InstancedMesh(arm, standard('#4a4f55'), spots.length);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#333', emissive: '#ffd9a0', emissiveIntensity: 0 });
    const headM = new THREE.InstancedMesh(head, lampMat, spots.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r], i) => { Q.setFromAxisAngle(Y, r); P.set(x, 0, z); M.compose(P, Q, S); poleM.setMatrixAt(i, M); armM.setMatrixAt(i, M); headM.setMatrixAt(i, M); collision.addCircle(x, z, 0.2); });
    poleM.castShadow = true;
    scene.add(poleM, armM, headM);
    world.lampMat = lampMat;
    // light pools on the ground (cheap fake lighting at night)
    const pool = new THREE.CircleGeometry(5, 16); pool.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const poolM = new THREE.InstancedMesh(pool, poolMat, spots.length);
    spots.forEach(([x, z, r], i) => { M.makeTranslation(x + Math.sin(r) * 1.5, 0.06, z + Math.cos(r) * 1.5); poolM.setMatrixAt(i, M); });
    poolM.renderOrder = layerOrder++;
    scene.add(poolM);
    world.poolMat = poolMat;
  }

  // ---------- trees ----------
  {
    const spots = [];
    const tryTree = (x, z, s) => {
      if (x < B.minX + 3 || x > B.maxX - 3 || z < B.minZ + 3 || z > B.maxZ - 3) return;
      if (roadGrid.nearest(x, z).d < 1.0) return;
      if (collision.blocked(x, z, 2.2)) return;
      if (waterPolys.some(p => inArea(x, z, p))) return;
      if (sportPolys.some(p => pointInPoly(x, z, p))) return;
      spots.push([x, z, s]);
      collision.addCircle(x, z, 0.35);
    };
    const polyBox = (pts) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } return [a, b, c, d]; };
    for (const p of greenPolys) {
      const [x0, z0, x1, z1] = polyBox(p);
      const n = Math.min(400, Math.floor((x1 - x0) * (z1 - z0) / 140));
      for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (inArea(x, z, p)) tryTree(x, z, 0.8 + rnd() * 0.7); }
    }
    for (const ring of data.campus) {
      const [x0, z0, x1, z1] = polyBox(ring);
      for (let i = 0; i < 1100; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (pointInPoly(x, z, ring)) tryTree(x, z, 0.8 + rnd() * 0.8); }
    }
    // roadside trees on named campus-ish roads
    for (const r of data.roads) {
      if (!(r.type === 'footway' || r.type === 'tertiary' || r.type === 'secondary')) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = 4; s < l; s += 11) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l; const nx = -dz / l, nz = dx / l;
          for (const side of [-1, 1]) if (rnd() < 0.6) tryTree(x + nx * side * (r.w / 2 + 2.2), z + nz * side * (r.w / 2 + 2.2), 0.8 + rnd() * 0.5);
        }
      }
    }
    const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 3, 6); trunkG.translate(0, 1.5, 0);
    const crownG = new THREE.IcosahedronGeometry(2.2, 0); crownG.translate(0, 4.4, 0);
    const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: '#5a4030' }), spots.length);
    const crown = new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), spots.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const greens = ['#3f6b2f', '#4c7a35', '#2f5a2a', '#5a8a3a', '#3b6e3e', '#6b8f3a'];
    spots.forEach(([x, z, s], i) => {
      Q.setFromAxisAngle(Y, rnd() * 6.28); S.set(s, s * (0.9 + rnd() * 0.4), s); P.set(x, 0, z); M.compose(P, Q, S);
      trunk.setMatrixAt(i, M); crown.setMatrixAt(i, M); crown.setColorAt(i, new THREE.Color(greens[Math.floor(rnd() * greens.length)]));
    });
    crown.castShadow = true; trunk.castShadow = true; crown.receiveShadow = true;
    scene.add(trunk, crown);
    world.treeCount = spots.length;
  }
  onProgress(0.85);

  // ---------- labels ----------
  const labelNames = Object.keys(world.named).filter(n => {
    const b = world.named[n].b; return !b || ['campus', 'dorm', 'church'].includes(b.kind) || n === '大潤發';
  });
  const seenLbl = new Set();
  for (const n of labelNames) {
    if (seenLbl.has(n)) continue; seenLbl.add(n);
    const it = world.named[n];
    const s = makeLabel(n, { height: n === '資訊管理學系' ? 4.2 : 2.6, color: n === '資訊管理學系' ? '#ffd23f' : '#fff', border: n === '資訊管理學系' ? '#ffd23f' : null });
    s.position.set(it.x, it.h + 4, it.z);
    scene.add(s); world.labels.push(s);
  }
  for (const n of ['中原大學大草坪', '中原噴水池', '中原埤塘生態公園', '普忠公園']) {
    const p = poi(n); if (!p) continue;
    const s = makeLabel(n, { height: 2.2, color: '#c9f5b0' }); s.position.set(p.x, 5, p.z); scene.add(s); world.labels.push(s);
  }
  {
    const s = makeLabel('中原夜市', { height: 4, color: '#ffd23f', bg: 'rgba(160,20,20,0.85)', icon: '🏮' });
    s.position.set(world.nightMarket.x, 9, world.nightMarket.z); scene.add(s); world.labels.push(s);
  }
  onProgress(0.95);

  world.update = (t, night, clockMin, playerPos) => {
    for (const f of world.animated) f(t);
    for (const m of world.windowMats) m.emissiveIntensity = night * 1.1;
    if (world.lampMat) world.lampMat.emissiveIntensity = night * 3;
    if (world.poolMat) world.poolMat.opacity = night * 0.22;
    if (world.marketGlow) world.marketGlow.opacity = night * 0.12;
    if (world.stallBodyMat) world.stallBodyMat.emissiveIntensity = night * 0.18;
    if (world.signMats) for (const m of world.signMats) m.emissiveIntensity = 0.15 + night * 0.9;
    if (world.clockFaceMat) world.clockFaceMat.emissiveIntensity = night * 0.6;
    if (world.clockHands) {
      const h = (clockMin / 60) % 12, mm = clockMin % 60;
      for (const [hp, mp] of world.clockHands) { hp.rotation.z = -h / 12 * Math.PI * 2; mp.rotation.z = -mm / 60 * Math.PI * 2; }
    }
    if (playerPos) for (const l of world.labels) {
      const d = Math.hypot(l.position.x - playerPos.x, l.position.z - playerPos.z);
      l.visible = d < 230;
    }
  };
  return world;
}
