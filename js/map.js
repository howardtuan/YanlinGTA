import * as THREE from 'three';
import { CollisionWorld, SegGrid, pointInPoly } from './collision.js';
import { groundTex, facadeTex, shopTex, roofTex, corrugatedTex, concreteTex } from './textures.js';
import { plantVegetation } from './vegetation.js';

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
  constructor(uvScale = 8, alpha = false) { this.p = []; this.n = []; this.c = []; this.uv = []; this.s = uvScale; this.alpha = alpha; }
  tri(a, b, c, col, nrm, uva, uvb, uvc) {
    // a,b,c: [x,y,z]; nrm: desired facing; fix winding
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (!uva) { const s = this.s; uva = [a[0] / s, a[2] / s]; uvb = [b[0] / s, b[2] / s]; uvc = [c[0] / s, c[2] / s]; }
    let ca = col, cb = col, cc = col;
    if (this.alpha && col.a) { ca = col.a; cb = col.b; cc = col.c; }
    if (cx * nrm[0] + cy * nrm[1] + cz * nrm[2] < 0) { [b, c] = [c, b]; [uvb, uvc] = [uvc, uvb]; [cb, cc] = [cc, cb]; }
    this.p.push(...a, ...b, ...c);
    this.n.push(...nrm, ...nrm, ...nrm);
    this.c.push(...ca, ...cb, ...cc);
    this.uv.push(...uva, ...uvb, ...uvc);
  }
  quad(a, b, c, d, col, nrm, uvs) {
    this.tri(a, b, c, col, nrm, uvs && uvs[0], uvs && uvs[1], uvs && uvs[2]);
    this.tri(a, c, d, col, nrm, uvs && uvs[0], uvs && uvs[2], uvs && uvs[3]);
  }
  flatPoly(pts, y, col) {
    if (pts.length < 3) return;
    const contour = pts.map(p => new THREE.Vector2(p[0], p[1]));
    let tris;
    try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { return; }
    for (const t of tris) {
      const A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
      this.tri([A[0], y, A[1]], [B[0], y, B[1]], [C[0], y, C[1]], col, [0, 1, 0]);
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
  // axis-aligned-in-local-frame box: centre (x,z), yaw angle, size (w along dir, d across), y0..y1
  box(x, z, ang, w, d, y0, y1, col, uvS = 3) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (lx, lz) => [x + lx * c - lz * s, z + lx * s + lz * c];
    const pts = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    for (let i = 0; i < 4; i++) {
      const A = pts[i], B = pts[(i + 1) % 4]; const ex = B[0] - A[0], ez = B[1] - A[1], l = Math.hypot(ex, ez);
      const n = [ez / l, 0, -ex / l];
      const mx = (A[0] + B[0]) / 2 - x, mz = (A[1] + B[1]) / 2 - z; if (mx * n[0] + mz * n[2] < 0) { n[0] *= -1; n[2] *= -1; }
      this.quad([A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], col, n, [[0, y0 / uvS], [l / uvS, y0 / uvS], [l / uvS, y1 / uvS], [0, y1 / uvS]]);
    }
    this.quad([pts[0][0], y1, pts[0][1]], [pts[1][0], y1, pts[1][1]], [pts[2][0], y1, pts[2][1]], [pts[3][0], y1, pts[3][1]], col, [0, 1, 0]);
  }
  get empty() { return this.p.length === 0; }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, this.alpha ? 4 : 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  }
}

const col = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const mulCol = (c, k) => c.map(v => v * k);

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

// soft vertical gradient used for the street-lamp light cones
function coneTexture() {
  return canvasTex(8, 128, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.25, 'rgba(255,200,130,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = '#000'; g.fillRect(0, 0, 8, 128); g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
  }, false);
}

// Shop signboards with the real shop names (POIs) around campus — packed into atlases.
function signAtlas(names, rnd) {
  const CW = 512, CH = 96, COLS = 4, ROWS = 21, PER = COLS * ROWS;
  const atlases = [];
  const palette = [['#c8102e', '#ffffff'], ['#0a7d3b', '#ffffff'], ['#ffd23f', '#a3001b'], ['#1a4fb4', '#ffffff'], ['#ff7a00', '#ffffff'], ['#222222', '#ffd23f'], ['#ffffff', '#c8102e'], ['#6b2bd1', '#ffffff'], ['#00838f', '#ffffff'], ['#f5efe0', '#3b2a1a'], ['#8b0000', '#ffe9a8'], ['#e91e63', '#ffffff']];
  const uvs = [];
  for (let a = 0; a * PER < names.length; a++) {
    const cv = document.createElement('canvas'); cv.width = CW * COLS; cv.height = CH * ROWS;
    const g = cv.getContext('2d');
    for (let i = 0; i < PER && a * PER + i < names.length; i++) {
      const name = names[a * PER + i], x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
      const [bg, fg] = palette[Math.floor(rnd() * palette.length)];
      const gr = g.createLinearGradient(0, y, 0, y + CH); gr.addColorStop(0, bg); gr.addColorStop(1, bg);
      g.fillStyle = gr; g.fillRect(x, y, CW, CH);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, CW, 6);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + CH - 5, CW, 5);
      g.strokeStyle = fg; g.globalAlpha = 0.6; g.lineWidth = 3; g.strokeRect(x + 6, y + 8, CW - 12, CH - 16); g.globalAlpha = 1;
      let fs = 64; g.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
      const w = g.measureText(name).width; if (w > CW - 40) { fs = Math.floor(fs * (CW - 40) / w); g.font = `900 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`; }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, x + CW / 2, y + CH / 2 + 3);
      uvs.push({ atlas: a, u0: x / cv.width, u1: (x + CW) / cv.width, v0: 1 - (y + CH) / cv.height, v1: 1 - y / cv.height });
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    atlases.push(t);
  }
  return { atlases, uvs, aspect: CW / CH };
}

// big low-frequency variation so tiled ground textures don't look tiled
function addMacro(m, scale, amt) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.macroMap = { value: groundTex.macro() };
    sh.vertexShader = 'varying vec2 vMacroW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMacroW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D macroMap; varying vec2 vMacroW;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float mac = texture2D(macroMap, vMacroW * ${scale.toFixed(5)}).r;
      float mac2 = texture2D(macroMap, vMacroW * ${(scale * 6.1).toFixed(5)} + 0.37).r;
      diffuseColor.rgb *= mix(${(1 - amt).toFixed(3)}, ${(1 + amt * 0.6).toFixed(3)}, mac) * mix(0.9, 1.07, mac2);`);
  };
  m.customProgramCacheKey = () => 'macro' + scale + '_' + amt;
}

// ---------- world ----------
const ROAD_LAYER = { footway: 0, path: 0, cycleway: 0, steps: 0, pedestrian: 0, track: 0, service: 1, living_street: 2, residential: 2, unclassified: 3, tertiary: 4, secondary: 5, primary: 6 };
// facade style per campus building, from reference photos (懷恩樓 brown brick arcades, 科學館 terracotta + white bands,
// 土木館 speckled granite, 工學館 grey-brown tiles ...); unknown ones get a deterministic pick
const STYLE_BY_NAME = {
  '懷恩樓': 'tan', '工學館': 'tan', '科學館': 'red', '土木館': 'granite', '理學大樓': 'red', '化學館': 'tan', '管理大樓': 'white',
  '自強商學大樓': 'white', '商設館': 'white', '智信樓': 'brick', '莊敬大樓': 'white', '建築館': 'granite', '祐生建築中心': 'granite',
  '張靜愚紀念圖書館': 'granite', '學生活動中心': 'tan', '全人教育村': 'brick', '電學大樓': 'tan', '力行大樓': 'red', '篤信大樓': 'white',
  '信實樓': 'brick', '恩慈樓': 'brick', '良善樓': 'brick', '喜樂樓': 'brick', '陸華樓': 'white', '維澈樓': 'white', '校史館': 'tan',
  '生物科技館': 'white', '真知教學大樓': 'white', '設計學院': 'granite', '室設系館': 'white', '景觀系館': 'tan', '恩惠堂': 'white', '恩惠堂副堂': 'white',
  '中原大學體育館': 'white', '中原大學室內游泳池': 'white', '薄膜中心': 'white', '熱誠樓A棟': 'brick', '熱誠樓B C棟': 'brick', '林森館': 'tan', '望樓': 'tan',
  '月老宮': 'temple', '桃園白沙屯天上聖母': 'temple', '普忠里福德祠': 'temple', '盧氏宗祠': 'temple',
};
const STYLE_PICK = ['tan', 'red', 'white', 'granite', 'brick'];
const strHash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0; return Math.abs(h); };

export function buildWorld(scene, data, onProgress = () => { }, opts = {}) {
  const B = data.bounds;
  const rnd = mulberry32(20240034);   // gameplay-relevant sequence (stalls, trees) — call order kept as before
  const rnd2 = mulberry32(777034);    // purely visual extras
  const quality = opts.quality || 'high';
  const world = { data, bounds: B, labels: [], animated: [], named: {} };
  const collision = new CollisionWorld(B, 16);
  const roadGrid = new SegGrid(20);
  world.collision = collision; world.roadGrid = roadGrid;
  collision.reserved = opts.reserved || [];
  // collision changes from the visual upgrade (new poles / feature trees in, lawn trees out) are applied only
  // after main.js has spawned parked vehicles, so every spawn position matches the original game exactly
  const deferred = [], ghosts = [], deferredPolys = [];
  world.commitDeferredCollision = () => {
    for (const i of ghosts) { const c = collision.circles[i]; c[0] = 1e9; c[1] = 1e9; }
    for (const [x, z, r] of deferred) collision.addCircle(x, z, r);
    for (const p of deferredPolys) collision.addPolygon(p);
    ghosts.length = 0; deferred.length = 0; deferredPolys.length = 0;
  };

  const campusRing = data.campus.length ? data.campus.reduce((a, b) => (a.length > b.length ? a : b)) : [];
  world.inCampus = (x, z) => data.campus.some(r => pointInPoly(x, z, r));
  const inReserved = (x, z) => collision.reserved.some(p => pointInPoly(x, z, p));

  // ground layers draw in order without depth writes (no z-fighting)
  let layerOrder = -100;
  const gmat = (tex, o = {}) => {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true, depthWrite: false, map: tex.map || null, normalMap: tex.normalMap || null, roughnessMap: tex.roughnessMap || null,
      roughness: o.roughness ?? 0.95, metalness: 0, envMapIntensity: o.env ?? 0.55, color: o.color || '#ffffff',
    });
    if (tex.normalMap) m.normalScale.set(o.ns ?? 1, o.ns ?? 1);
    if (o.macro !== false) addMacro(m, o.macroScale ?? 0.011, o.macroAmt ?? 0.2);
    return m;
  };
  const addFlat = (geo, mat) => {
    if (geo.empty) return null;
    const m = geo.mesh(mat); m.receiveShadow = true; m.renderOrder = layerOrder++; scene.add(m); return m;
  };
  const T = groundTex;

  // base ground
  {
    const W = B.maxX - B.minX + 2000, H = B.maxZ - B.minZ + 2000;
    const g = new THREE.PlaneGeometry(W, H);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / 10, uv.getY(i) * H / 10);
    const mat = gmat(T.ground(), { macroAmt: 0.28 }); mat.vertexColors = false; mat.depthWrite = true;
    const m = new THREE.Mesh(g, mat);
    m.position.set((B.minX + B.maxX) / 2, 0, (B.minZ + B.maxZ) / 2);
    m.receiveShadow = true; m.renderOrder = layerOrder++;
    scene.add(m);
    world.groundMesh = m;
  }
  // campus paving (interlocking pavers)
  {
    const g = new Geo(4);
    for (const r of data.campus) g.flatPoly(r, 0.01, col('#f2efe8'));
    addFlat(g, gmat(T.paving(), { macroAmt: 0.22 }));
  }
  // areas
  const waterPolys = [];
  const greenPolys = [];
  const noTreePolys = [];
  {
    const grass = new Geo(6), track = new Geo(4), park = new Geo(4), concrete = new Geo(4), dirt = new Geo(6), water = new Geo(14), asph = new Geo(8);
    for (const a of data.areas) {
      const k = a.kind;
      if (k === 'park') { grass.flatPoly(a.pts, 0.02, col('#e6efd6')); greenPolys.push(a.pts); }
      else if (k === 'grass') { grass.flatPoly(a.pts, 0.02, a.name === '中原大學大草坪' ? col('#f4fff0') : col('#ffffff')); greenPolys.push(a.pts); }
      else if (k === 'pitch') { grass.flatPoly(a.pts, 0.02, col('#e0ffd8')); noTreePolys.push(a.pts); }
      else if (k === 'track') { track.flatPoly(a.pts, 0.02, col('#ffffff')); noTreePolys.push(a.pts); }
      else if (k === 'water') { water.flatPoly(a.pts, 0.02, col('#ffffff')); waterPolys.push(a.pts); }
      else if (k === 'parking') { asph.flatPoly(a.pts, 0.02, col('#f0f0f0')); noTreePolys.push(a.pts); }
      else if (k === 'construction') dirt.flatPoly(a.pts, 0.02, col('#ffffff'));
      else if (k === 'school' || k === 'commercial') concrete.flatPoly(a.pts, 0.02, col('#e8e4dc'));
      else if (k === 'industrial') concrete.flatPoly(a.pts, 0.02, col('#c9c6c0'));
      if (a.name === '中原大學大草坪') noTreePolys.push(a.pts);
    }
    // waterways
    for (const w of data.waterways) for (let i = 0; i < w.pts.length - 1; i++) { water.strip(w.pts[i], w.pts[i + 1], w.w, 0.02, col('#ffffff')); water.disc(w.pts[i][0], w.pts[i][1], w.w / 2, 0.02, col('#ffffff')); }
    addFlat(concrete, gmat(T.paving(), { macroAmt: 0.25 }));
    addFlat(dirt, gmat(T.dirt(), { macroAmt: 0.3 }));
    addFlat(asph, gmat(T.asphalt(), { roughness: 1 }));
    addFlat(grass, gmat(T.grass(), { macroAmt: 0.3, macroScale: 0.015, env: 0.4 }));
    addFlat(track, gmat(T.track(), { macroAmt: 0.1 }));
    // water: dark, glossy, reflects the sky; ripples scroll
    const wn = T.waterNormal(), wn2 = wn.clone(); wn2.needsUpdate = true;
    const wmat = new THREE.MeshStandardMaterial({ color: '#2f4c52', roughness: 0.06, metalness: 0.15, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.3, depthWrite: false, vertexColors: true });
    addFlat(water, wmat);
    world.animated.push((t) => { wn.offset.set(t * 0.012, t * 0.008); });
  }
  world.waterPolys = waterPolys;
  onProgress(0.25);

  // rail
  {
    const g = new Geo(4);
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) { g.strip(r.pts[i], r.pts[i + 1], 4.5, 0.03, col('#b8a898')); g.disc(r.pts[i][0], r.pts[i][1], 2.25, 0.03, col('#b8a898')); }
    addFlat(g, gmat(T.dirt(), { macro: false }));
    const g2 = new Geo();
    for (const r of data.rail) for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      for (const s of [-0.75, 0.75]) g2.strip([a[0] + nx * s, a[1] + nz * s], [b[0] + nx * s, b[1] + nz * s], 0.12, 0.04, col('#c9c9c9'));
    }
    addFlat(g2, new THREE.MeshStandardMaterial({ vertexColors: true, depthWrite: false, metalness: 0.8, roughness: 0.35 }));
  }

  // roads, by layer
  const layers = [...Array(7)].map(() => new Geo(8));
  const footCampus = new Geo(4), footTown = new Geo(3);
  const marks = new Geo(4);
  const asphTint = (r) => r.type === 'service' ? col('#f4f2ee') : r.type === 'primary' ? col('#d8d8d8') : col('#e4e4e4');
  for (const r of data.roads) {
    const L = ROAD_LAYER[r.type] ?? 1;
    const campus = L === 0 && world.inCampus(r.pts[0][0], r.pts[0][1]);
    const g = L === 0 ? (campus ? footCampus : footTown) : layers[L];
    const c = L === 0 ? (campus ? col('#fff6e6') : col('#ffffff')) : asphTint(r);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      g.strip(a, b, r.w, 0.03, c);
      roadGrid.add(a[0], a[1], b[0], b[1], r.w, r);
      if (r.type === 'primary' || r.type === 'secondary' || r.type === 'tertiary') {
        const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = 2; s < l - 3; s += 9) {
          const t0 = s / l, t1 = (s + 3.5) / l;
          marks.strip([a[0] + dx * t0, a[1] + dz * t0], [a[0] + dx * t1, a[1] + dz * t1], 0.22, 0.04, r.type === 'primary' ? col('#e9c64a') : col('#ededed'));
        }
      }
    }
    for (const p of r.pts) g.disc(p[0], p[1], r.w / 2, 0.03, c, L === 0 ? 6 : 10);
  }
  addFlat(footTown, gmat(T.sidewalk(), { macroAmt: 0.2 }));
  addFlat(footCampus, gmat(T.paving(), { macroAmt: 0.2 }));
  const asphMat = gmat(T.asphalt(), { roughness: 1, env: 0.7, macroAmt: 0.24 });
  for (let i = 1; i < layers.length; i++) addFlat(layers[i], asphMat);
  onProgress(0.32);

  // ---------- curbs + painted edge lines (purely visual) ----------
  const curb = new Geo(2);
  {
    const sameSeg = (s, r, a, b) => s[5] === r && s[0] === a[0] && s[1] === a[1] && s[2] === b[0] && s[3] === b[1];
    for (const r of data.roads) {
      const L = ROAD_LAYER[r.type] ?? 1;
      if (!r.drive || L < 1 || r.w < 5 || (r.type === 'service' && !r.name)) continue;
      const town = !world.inCampus(r.pts[0][0], r.pts[0][1]);
      const lineCol = r.type === 'primary' || r.type === 'secondary' ? col('#ececec') : town ? col('#c8352b') : col('#e2b93b');
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 1.5) continue;
        const ux = dx / l, uz = dz / l, nx = -uz, nz = ux;
        for (const side of [1, -1]) {
          const off = r.w / 2;
          let run0 = -1, last = -1;
          const flush = () => {
            if (run0 < 0 || last - run0 < 0.8) { run0 = -1; return; }
            const P = (t, o) => [a[0] + ux * t + nx * side * o, a[1] + uz * t + nz * side * o];
            const p0 = P(run0, off), p1 = P(last, off), q0 = P(run0, off + 0.2), q1 = P(last, off + 0.2);
            const fn = [-nx * side, 0, -nz * side];
            curb.quad([p0[0], 0.0, p0[1]], [p1[0], 0.0, p1[1]], [p1[0], 0.12, p1[1]], [p0[0], 0.12, p0[1]], col('#8f8c86'), fn, [[run0 / 2, 0], [last / 2, 0], [last / 2, 0.06], [run0 / 2, 0.06]]);
            curb.quad([p0[0], 0.12, p0[1]], [p1[0], 0.12, p1[1]], [q1[0], 0.12, q1[1]], [q0[0], 0.12, q0[1]], col('#a9a69f'), [0, 1, 0]);
            const e0 = P(run0, off - 0.32), e1 = P(last, off - 0.32);
            marks.strip(e0, e1, 0.13, 0.045, lineCol);
            run0 = -1;
          };
          for (let t = 0; t <= l; t += 0.8) {
            const px = a[0] + ux * t + nx * side * (off + 0.15), pz = a[1] + uz * t + nz * side * (off + 0.15);
            const other = roadGrid.nearest(px, pz, s => s[5].drive && !sameSeg(s, r, a, b));
            const ok = other.d > 0.35 && !inReserved(px, pz);
            if (ok) { if (run0 < 0) run0 = t; last = t; } else flush();
          }
          flush();
        }
      }
    }
  }
  {
    const m = curb.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: concreteTex().map, roughness: 0.9 }));
    m.receiveShadow = true; m.castShadow = false; scene.add(m);
  }
  onProgress(0.36);

  // ---------- buildings ----------
  const STYLES = ['tan', 'red', 'granite', 'white', 'brick', 'commercial', 'town', 'temple'];
  const wallMat = {}; const wallGeo = {};
  const makeWallMat = (t, o = {}) => new THREE.MeshStandardMaterial({
    map: t.map, emissiveMap: t.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, vertexColors: true,
    normalMap: t.normalMap, roughnessMap: t.rm, metalnessMap: t.rm, roughness: 1, metalness: 1, envMapIntensity: o.env ?? 1,
  });
  for (const s of STYLES) { wallMat[s] = makeWallMat(facadeTex(s)); wallGeo[s] = new Geo(); }
  const shopMat = makeWallMat(shopTex()); const shopGeo = new Geo();
  world.windowMats = Object.values(wallMat);
  world.shopMat = shopMat;
  const roofGeo = new Geo(10);
  const ledgeGeo = new Geo(2);
  const aoGeo = new Geo(8, true);
  const shedGeo = new Geo(3);
  const temples = [];
  const PAL = {
    campus: ['#d8cfc0', '#c9a48b', '#b8705a', '#e9e4da', '#c4b5a0', '#a86d5d'],
    dorm: ['#e2d4bd', '#cdb79c', '#d9c9b5'],
    town: ['#d6d2c8', '#bfb8aa', '#e0d6c2', '#a8a8a0', '#cfc4b4', '#b9b0a6', '#d9cdbd', '#c7cfd3', '#e6dccb', '#b7a99a'],
    commercial: ['#9fa6ad', '#c0c4c8', '#b0b6a8'],
    church: ['#f0ece2', '#e9e2d0'],
    small: ['#dddddd'],
  };
  const tanks = []; const signs = [];
  const townEdges = []; // for shop signboards
  world.buildings = data.buildings;
  data.buildings.forEach((b, bi) => {
    const pts = b.pts; const h = b.h;
    if (b.skip) {
      if (b.name) world.named[b.name] = { x: pts.reduce((s, p) => s + p[0], 0) / pts.length, z: pts.reduce((s, p) => s + p[1], 0) / pts.length, h: b.labelH || h, b };
      return;
    }
    const pal = PAL[b.kind] || PAL.town;
    const tint0 = col(pal[Math.floor(rnd() * pal.length)]);
    const style = b.kind === 'campus' || b.kind === 'church' ? (STYLE_BY_NAME[b.name] || STYLE_PICK[strHash(b.name || String(bi)) % STYLE_PICK.length])
      : b.kind === 'dorm' ? (bi % 2 ? 'brick' : 'white') : b.kind === 'commercial' ? 'commercial' : 'town';
    // textured styles carry their own colour; keep a subtle per-building variation
    const tint = style === 'town' ? tint0.map(v => Math.min(1.08, v * 1.08)) : style === 'commercial' ? tint0.map(v => 0.75 + v * 0.3) : mulCol([1, 1, 1], 0.9 + rnd2() * 0.14);
    const g = wallGeo[style];
    const bay = style === 'town' ? 3.0 : 3.6, flo = 3.3;
    let acc = Math.floor(rnd() * 8) * bay;
    const vOff = Math.floor(rnd() * 8) / 8;
    const shopH = 3.4;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
      if (l < 0.05) continue;
      const n = [dz / l, 0, -dx / l]; // outward for CCW (x,z)
      const u0 = acc / (bay * 8), u1 = (acc + l) / (bay * 8); acc += l;
      const v1 = h / (flo * 8) + vOff;
      // town walls facing a street get a ground-floor shopfront + awning
      const mx = (a[0] + c[0]) / 2 + n[0] * 3, mz = (a[1] + c[1]) / 2 + n[2] * 3;
      const street = style === 'town' && h > 5.5 && l > 2.5 && roadGrid.nearest(mx, mz, s => s[5].drive).d < 3.5;
      if (street) {
        shopGeo.quad([a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], shopH, c[1]], [a[0], shopH, a[1]], tint.map(v => 0.92 + v * 0.08), n, [[u0 * (bay * 8) / 24, 0], [u1 * (bay * 8) / 24, 0], [u1 * (bay * 8) / 24, 1], [u0 * (bay * 8) / 24, 1]]);
        const vs = shopH / (flo * 8) + vOff;
        g.quad([a[0], shopH, a[1]], [c[0], shopH, c[1]], [c[0], h, c[1]], [a[0], h, a[1]], tint, n, [[u0, vs], [u1, vs], [u1, v1], [u0, v1]]);
        // slanted metal awning over the shopfront
        const o = 1.25, y0 = shopH - 0.05, y1 = shopH - 0.45;
        const A0 = [a[0], y0, a[1]], C0 = [c[0], y0, c[1]], A1 = [a[0] + n[0] * o, y1, a[1] + n[2] * o], C1 = [c[0] + n[0] * o, y1, c[1] + n[2] * o];
        const ac = col(['#6d7a86', '#8a8f94', '#3f6f9f', '#a8a39a', '#4f7a5a'][Math.floor(rnd2() * 5)]);
        shedGeo.quad(A0, C0, C1, A1, ac, [n[0] * 0.3, 0.95, n[2] * 0.3], [[0, 0], [l / 3, 0], [l / 3, 0.4], [0, 0.4]]);
        shedGeo.quad(A0, C0, C1, A1, mulCol(ac, 0.6), [-n[0] * 0.3, -0.95, -n[2] * 0.3], [[0, 0], [l / 3, 0], [l / 3, 0.4], [0, 0.4]]);
        townEdges.push({ a, c, n, l, h, bi });
      } else {
        g.quad([a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], h, c[1]], [a[0], h, a[1]], tint, n,
          [[u0, vOff], [u1, vOff], [u1, v1], [u0, v1]]);
        if (style === 'town' && l > 2.5) townEdges.push({ a, c, n, l, h, bi, back: true });
      }
      // horizontal floor ledges give campus blocks real depth and shadow lines
      if ((style === 'tan' || style === 'red' || style === 'white') && h > 6) {
        for (let fy = flo; fy < h - 1; fy += flo) {
          const o = style === 'white' ? 0.22 : 0.32, t0 = fy - 0.1, t1 = fy + 0.12;
          const A = [a[0] + n[0] * o, a[1] + n[2] * o], C = [c[0] + n[0] * o, c[1] + n[2] * o];
          const lc = style === 'red' ? col('#e6e1d6') : style === 'white' ? col('#e9e7e2') : col('#a69684');
          ledgeGeo.quad([a[0], t1, a[1]], [c[0], t1, c[1]], [C[0], t1, C[1]], [A[0], t1, A[1]], lc, [0, 1, 0]);
          ledgeGeo.quad([A[0], t0, A[1]], [C[0], t0, C[1]], [C[0], t1, C[1]], [A[0], t1, A[1]], lc, n, [[0, 0], [l / 2, 0], [l / 2, 0.1], [0, 0.1]]);
          ledgeGeo.quad([a[0], t0, a[1]], [c[0], t0, c[1]], [C[0], t0, C[1]], [A[0], t0, A[1]], mulCol(lc, 0.7), [0, -1, 0]);
        }
      }
      // soft contact shadow on the ground along the wall
      {
        const o = 1.7, A = [a[0] + n[0] * o, 0.05, a[1] + n[2] * o], C = [c[0] + n[0] * o, 0.05, c[1] + n[2] * o];
        const dark = [0, 0, 0, 0.42], clear = [0, 0, 0, 0];
        aoGeo.tri([a[0], 0.05, a[1]], [c[0], 0.05, c[1]], C, { a: dark, b: dark, c: clear }, [0, 1, 0]);
        aoGeo.tri([a[0], 0.05, a[1]], C, A, { a: dark, b: clear, c: clear }, [0, 1, 0]);
      }
      if (b.kind === 'town' && l > 4 && rnd() < 0.22 && signs.length < 260) {
        signs.push({ x: (a[0] + c[0]) / 2 + n[0] * 0.7, z: (a[1] + c[1]) / 2 + n[2] * 0.7, y: Math.min(h - 2, 4 + rnd() * 3), rot: Math.atan2(dx, dz) });
      }
    }
    const rc = style === 'town' ? tint.map(v => v * 0.82) : tint.map(v => v * 0.9);
    roofGeo.flatPoly(pts, h, rc);
    // parapet
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
      const n = [dz / l, 0, -dx / l];
      const pc = style === 'town' ? tint.map(v => v * 0.95) : style === 'red' ? col('#e3ddd2') : style === 'tan' ? col('#a39380') : style === 'brick' ? col('#9a5442') : col('#d9d6cf');
      roofGeo.quad([a[0], h, a[1]], [c[0], h, c[1]], [c[0], h + 0.7, c[1]], [a[0], h + 0.7, a[1]], pc, n, [[0, 0], [l / 10, 0], [l / 10, 0.07], [0, 0.07]]);
      roofGeo.quad([a[0], h + 0.7, a[1]], [c[0], h + 0.7, c[1]], [c[0] - n[0] * 0.25, h + 0.7, c[1] - n[2] * 0.25], [a[0] - n[0] * 0.25, h + 0.7, a[1] - n[2] * 0.25], pc.map(v => v * 1.05), [0, 1, 0]);
      roofGeo.quad([a[0] - n[0] * 0.25, h, a[1] - n[2] * 0.25], [c[0] - n[0] * 0.25, h, c[1] - n[2] * 0.25], [c[0] - n[0] * 0.25, h + 0.7, c[1] - n[2] * 0.25], [a[0] - n[0] * 0.25, h + 0.7, a[1] - n[2] * 0.25], pc.map(v => v * 0.8), [-n[0], 0, -n[2]], [[0, 0], [l / 10, 0], [l / 10, 0.07], [0, 0.07]]);
    }
    if (b.kind === 'town' && rnd() < 0.55) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (pointInPoly(cx, cz, pts)) tanks.push([cx + (rnd() - .5), h, cz + (rnd() - .5)]);
    }
    // rooftop 鐵皮屋 sheds / stair housings on town blocks (visual only)
    if (style === 'town' && h > 6) {
      let best = 0, ang = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; const l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > best) { best = l; ang = Math.atan2(c[1] - a[1], c[0] - a[0]); } }
      const ca = Math.cos(ang), sa = Math.sin(ang);
      let u0 = 1e9, u1 = -1e9, w0 = 1e9, w1 = -1e9;
      for (const [x, z] of pts) { const u = x * ca + z * sa, w = -x * sa + z * ca; u0 = Math.min(u0, u); u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
      const r2 = rnd2();
      const kind = r2 < 0.32 ? 'shed' : r2 < 0.6 ? 'stair' : null;
      if (kind) {
        const fw = kind === 'shed' ? 0.62 : 0, uu = (u0 + u1) / 2, ww = (w0 + w1) / 2;
        const W = kind === 'shed' ? (u1 - u0) * fw : Math.min(3, (u1 - u0) * 0.4), D = kind === 'shed' ? (w1 - w0) * fw : Math.min(3, (w1 - w0) * 0.4);
        const cx = uu * ca - ww * sa, cz = uu * sa + ww * ca;
        const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]].map(([lx, lz]) => [cx + lx * ca - lz * sa, cz + lx * sa + lz * ca]);
        if (W > 2 && D > 2 && corners.every(p => pointInPoly(p[0], p[1], pts))) {
          if (kind === 'shed') shedGeo.box(cx, cz, ang, W, D, h, h + 2.5, col(['#4f7fae', '#8d9399', '#a0a6aa', '#6d8fa8', '#b0794f'][Math.floor(rnd2() * 5)]));
          else roofGeo.box(cx, cz, ang, W, D, h, h + 2.6, tint.map(v => v * 0.92), 3);
        }
      }
    }
    if (style === 'temple') temples.push({ pts, h });
    collision.addPolygon(pts);
    if (b.name) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      world.named[b.name] = { x: cx, z: cz, h, b };
    }
  });
  for (const s of STYLES) {
    if (wallGeo[s].empty) continue;
    const m = wallGeo[s].mesh(wallMat[s]); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }
  if (!shopGeo.empty) { const m = shopGeo.mesh(shopMat); m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  {
    const rt = roofTex();
    const roofMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: rt.map, normalMap: rt.normalMap, roughness: 0.92 });
    addMacro(roofMat, 0.05, 0.3);
    const m = roofGeo.mesh(roofMat); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    // rooftop clutter: AC condensers in rows, vent stacks
    const acGeo = new Geo(1);
    data.buildings.forEach((b) => {
      if (b.skip || b.h < 6) return;
      const pts = b.pts; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const area = (x1 - x0) * (z1 - z0), n = Math.min(14, Math.floor(area / (b.kind === 'town' ? 120 : 90)));
      for (let k = 0; k < n; k++) {
        const x = x0 + 1.5 + rnd2() * (x1 - x0 - 3), z = z0 + 1.5 + rnd2() * (z1 - z0 - 3);
        if (!pointInPoly(x, z, pts) || !pointInPoly(x + 1.2, z + 1.2, pts) || !pointInPoly(x - 1.2, z - 1.2, pts)) continue;
        const vent = rnd2() < 0.25;
        if (vent) acGeo.box(x, z, rnd2() * 3, 0.5, 0.5, b.h, b.h + 1.1, col('#8f9497'));
        else { acGeo.box(x, z, 0, 1.0, 0.7, b.h, b.h + 0.75, col('#e4e3de')); acGeo.box(x + 1.15, z, 0, 1.0, 0.7, b.h, b.h + 0.75, col('#dedcd6')); }
      }
    });
    if (!acGeo.empty) { const am = acGeo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 })); am.castShadow = true; scene.add(am); }
    const lm = ledgeGeo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: concreteTex().map, roughness: 0.85 })); lm.castShadow = true; lm.receiveShadow = true; scene.add(lm);
    const ct = corrugatedTex();
    const sm = shedGeo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, map: ct.map, normalMap: ct.normalMap, roughness: 0.55, metalness: 0.55, side: THREE.DoubleSide })); sm.castShadow = true; sm.receiveShadow = true; scene.add(sm);
    const am = aoGeo.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    am.renderOrder = -5; am.userData.noAO = true; scene.add(am);
  }
  // temple roofs: hipped orange-tile roof with up-swept ridge ends
  if (temples.length) {
    const tg = new Geo(2);
    for (const { pts, h } of temples) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const o = 0.8, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rh = Math.min(3.2, (x1 - x0) * 0.3 + 1), y = h + 0.7;
      const E = [[x0 - o, z0 - o], [x1 + o, z0 - o], [x1 + o, z1 + o], [x0 - o, z1 + o]];
      const rl = Math.max(0.5, ((x1 - x0) - (z1 - z0)) / 2);
      const R0 = [cx - rl, y + rh, cz], R1 = [cx + rl, y + rh, cz];
      const orange = col('#d9632b'), green = col('#2f7a52');
      tg.quad([E[0][0], y, E[0][1]], [E[1][0], y, E[1][1]], R1, R0, orange, [0, 0.7, -0.7]);
      tg.quad([E[3][0], y, E[3][1]], [E[2][0], y, E[2][1]], R1, R0, orange, [0, 0.7, 0.7]);
      tg.tri([E[0][0], y, E[0][1]], [E[3][0], y, E[3][1]], R0, green, [-0.7, 0.7, 0]);
      tg.tri([E[1][0], y, E[1][1]], [E[2][0], y, E[2][1]], R1, green, [0.7, 0.7, 0]);
      // ridge with swallowtail ends
      tg.box(cx, cz, 0, rl * 2 + 1.6, 0.35, y + rh - 0.05, y + rh + 0.35, col('#b23a1f'), 1);
      for (const sx of [-1, 1]) tg.box(cx + sx * (rl + 0.9), cz, 0, 0.5, 0.3, y + rh + 0.2, y + rh + 1.0, col('#c8431f'), 1);
    }
    const m = tg.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide })); m.castShadow = true; scene.add(m);
  }
  // rooftop water tanks (very Taiwan)
  if (tanks.length) {
    const tg = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12); tg.translate(0, 1.6, 0);
    const legs = new THREE.BoxGeometry(1.4, 0.8, 1.4); legs.translate(0, 0.4, 0);
    const im = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: '#d9d4c3', roughness: 0.35, metalness: 0.6 }), tanks.length);
    const im2 = new THREE.InstancedMesh(legs, new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.7, metalness: 0.4 }), tanks.length);
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
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.2, roughness: 0.4 });
      world.signMats.push(mat);
      const im = new THREE.InstancedMesh(geo, mat, per[wi].length);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
      per[wi].forEach((s, i) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot + Math.PI / 2); P.set(s.x, s.y + 1.3, s.z); M.compose(P, Q, S); im.setMatrixAt(i, M); });
      im.castShadow = true;
      scene.add(im);
    });
  }
  // horizontal shop signboards carrying the real shop names around campus
  {
    const skip = new Set(Object.keys(world.named));
    const cand = data.pois.filter(p => p.name && !skip.has(p.name) && !world.inCampus(p.x, p.z) && p.name.length <= 14 && !/停車場|公園|里辦公處|集會所|校門|水準點|國小|重劃區|預定地|工程|建案|社區|廣場|大道|簡易庭|i郵箱|宗祠|宮|聖母|祠|廟/.test(p.name));
    const placed = [], items = [];
    for (const p of cand) {
      let best = null, bd = 16;
      for (const e of townEdges) {
        if (e.back) continue;
        const ex = e.c[0] - e.a[0], ez = e.c[1] - e.a[1], l2 = ex * ex + ez * ez;
        let t = ((p.x - e.a[0]) * ex + (p.z - e.a[1]) * ez) / l2; t = Math.max(0, Math.min(1, t));
        const qx = e.a[0] + ex * t, qz = e.a[1] + ez * t, d = Math.hypot(qx - p.x, qz - p.z);
        if (d < bd) { bd = d; best = { e, t }; }
      }
      if (!best) continue;
      const { e } = best; const w = Math.min(4.6, e.l - 0.5); if (w < 1.6) continue;
      const half = w / 2 / e.l; const t = Math.max(half, Math.min(1 - half, best.t));
      const cx = e.a[0] + (e.c[0] - e.a[0]) * t, cz = e.a[1] + (e.c[1] - e.a[1]) * t;
      let y = 4.1;
      while (placed.some(q => Math.hypot(q.x - cx, q.z - cz) < (q.w + w) / 2 + 0.2 && Math.abs(q.y - y) < 1.1)) y += 1.25;
      if (y > e.h - 0.8) continue;
      placed.push({ x: cx, z: cz, y, w });
      // sign's own right-hand direction as seen by someone facing the wall, so text never reads mirrored
      items.push({ name: p.name, x: cx, z: cz, y, w, n: e.n, ex: e.n[2], ez: -e.n[0] });
    }
    if (items.length) {
      const { atlases, uvs, aspect } = signAtlas(items.map(i => i.name), rnd2);
      const geos = atlases.map(() => new Geo());
      const frame = new Geo();
      items.forEach((it, i) => {
        const uv = uvs[i], g = geos[uv.atlas], hh = it.w / aspect * 1.25;
        const o = 0.2, x0 = it.x - it.ex * it.w / 2 + it.n[0] * o, z0 = it.z - it.ez * it.w / 2 + it.n[2] * o, x1 = it.x + it.ex * it.w / 2 + it.n[0] * o, z1 = it.z + it.ez * it.w / 2 + it.n[2] * o;
        g.quad([x0, it.y - hh / 2, z0], [x1, it.y - hh / 2, z1], [x1, it.y + hh / 2, z1], [x0, it.y + hh / 2, z0], [1, 1, 1], it.n, [[uv.u0, uv.v0], [uv.u1, uv.v0], [uv.u1, uv.v1], [uv.u0, uv.v1]]);
        const ang = Math.atan2(it.ez, it.ex);
        frame.box(it.x + it.n[0] * 0.1, it.z + it.n[2] * 0.1, ang, it.w + 0.12, 0.18, it.y - hh / 2 - 0.06, it.y + hh / 2 + 0.06, col('#3a3c40'));
      });
      world.boardMats = [];
      atlases.forEach((t, i) => {
        const mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.12, roughness: 0.45 });
        world.boardMats.push(mat);
        const m = geos[i].mesh(mat); m.castShadow = false; scene.add(m);
      });
      const fm = frame.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 })); fm.castShadow = true; scene.add(fm);
    }
    world.shopSignCount = items.length;
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
  world.isFree = (x, z, r = 1) => !collision.blocked(x, z, r) && !waterPolys.some(p => pointInPoly(x, z, p));

  // zebra crossings + stop lines at real intersections (visual only)
  const signalSpots = [];
  {
    const seen = new Set();
    const MAJOR = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified']);
    for (const n of nodes.values()) {
      const drv = n.adj.filter(e => e.drive || (e.road.drive && !e.fwd));
      const uniq = [...new Map(drv.map(e => [e.to.id, e])).values()];
      if (uniq.length < 3) continue;
      const wmax = Math.max(...uniq.map(e => e.w));
      let major = 0;
      for (const e of uniq) {
        if (!MAJOR.has(e.road.type) || e.w < 6) continue;
        major++;
        const key = n.id + '>' + e.to.id; if (seen.has(key)) continue; seen.add(key);
        const dx = e.to.x - n.x, dz = e.to.z - n.z, l = Math.hypot(dx, dz);
        const d0 = wmax / 2 + 1.2; if (l < d0 + 6) continue;
        const ux = dx / l, uz = dz / l, px = -uz, pz = ux;
        const cx = n.x + ux * (d0 + 1.6), cz = n.z + uz * (d0 + 1.6);
        for (let o = -e.w / 2 + 0.55; o <= e.w / 2 - 0.5; o += 0.95) {
          const sx = cx + px * o, sz = cz + pz * o;
          marks.strip([sx - ux * 1.5, sz - uz * 1.5], [sx + ux * 1.5, sz + uz * 1.5], 0.5, 0.045, col('#f0f0ec'));
        }
        const lx = n.x + ux * (d0 + 3.8), lz = n.z + uz * (d0 + 3.8);
        marks.strip([lx - px * e.w / 2 * 0.95, lz - pz * e.w / 2 * 0.95], [lx + px * e.w / 2 * 0.95, lz + pz * e.w / 2 * 0.95], 0.35, 0.045, col('#f0f0ec'));
      }
      if (major >= 3 && wmax >= 7) signalSpots.push({ x: n.x, z: n.z, w: wmax, dirs: uniq.map(e => Math.atan2(e.to.x - n.x, e.to.z - n.z)) });
    }
  }
  {
    const mm = addFlat(marks, new THREE.MeshStandardMaterial({ vertexColors: true, depthWrite: false, roughness: 0.65, envMapIntensity: 0.6 }));
    if (mm) mm.userData.noAO = true;
  }

  // ---------- landmarks ----------
  const poi = name => data.pois.find(p => p.name === name);
  const standard = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  // 鐘塔 — CYCU's bell tower: tall white board-formed concrete fins around a bronze bell, cross on top
  const ct = poi('鐘塔');
  if (ct) {
    const g = new THREE.Group();
    const conc = concreteTex();
    const white = new THREE.MeshStandardMaterial({ color: '#f3f1ec', map: conc.map, normalMap: conc.normalMap, roughness: 0.85 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.35, 32), standard('#b9b5ad', { roughness: 0.9 })); plinth.position.y = 0.17; g.add(plinth);
    const fins = [[0, -1.05, 1.4, 0.42, 18.6], [1.05, 0, 0.42, 1.25, 16.4], [0, 1.05, 1.1, 0.42, 17.4], [-1.05, 0, 0.42, 1.0, 15.2]];
    for (const [x, z, w, d, hgt] of fins) {
      const geo = new THREE.BoxGeometry(w, hgt, d, 1, 8, 1);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 - (p.getY(i) + hgt / 2) / hgt * 0.22; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (0.9 + k * 0.1)); }
      geo.computeVertexNormals();
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * hgt / 4);
      const m = new THREE.Mesh(geo, white); m.position.set(x, hgt / 2 + 0.35, z); g.add(m);
    }
    // bell between the fins
    const bell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.9], [0.18, 0.88], [0.32, 0.6], [0.36, 0.2], [0.5, 0], [0.48, -0.04], [0, -0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 16), standard('#6b4a2a', { metalness: 0.85, roughness: 0.35 }));
    bell.position.y = 12.6; g.add(bell);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.18), white); beam.position.y = 13.6; g.add(beam);
    // cross
    const steel = standard('#d8d8d2', { metalness: 0.6, roughness: 0.4 });
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.6, 0.22), steel); cv.position.y = 18.95 + 2.3; g.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.22), steel); ch.position.y = 22.2; g.add(ch);
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
    const conc = concreteTex();
    const stone = new THREE.MeshStandardMaterial({ color: '#d8cfbd', map: conc.map, normalMap: conc.normalMap, roughness: 0.85 });
    for (const s of [-4.2, 4.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, 5.5, 1.3), stone); p.position.set(s, 2.75, 0); g.add(p); collision.addCircle(og.x + Math.cos(dir) * s, og.z - Math.sin(dir) * s, 0.9); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(10.4, 1.4, 1.5), stone); top.position.y = 6.1; g.add(top);
    const lt = labelTexture('中原大學', { size: 60, bg: '#7a2b1f', color: '#ffe9a8' });
    for (const s of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), new THREE.MeshStandardMaterial({ map: lt.tex, roughness: 0.5 })); pl.position.set(0, 6.1, 0.76 * s); if (s < 0) pl.rotation.y = Math.PI; g.add(pl); }
    g.position.set(og.x, 0, og.z); g.rotation.y = dir + Math.PI / 2;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
  }
  // 正門 校名牆: black granite wall with the CYCU emblem + a slanted stainless obelisk (from photos of the main gate)
  if (opts.mainGate) {
    const G = opts.mainGate, street = data.roads.filter(r => r.name === '中北路');
    const distStreet = (x, z) => { let d = 1e9; for (const r of street) for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t)); d = Math.min(d, Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)); } return d; };
    // wall runs parallel to the nearest stretch of 中北路
    let sp = 0, spd = 1e9;
    for (const r of street) for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; const d = Math.hypot((a[0] + b[0]) / 2 - G.x, (a[1] + b[1]) / 2 - G.z); if (d < spd) { spd = d; sp = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
    const ca = Math.cos(sp), sa = Math.sin(sp), W = 7, D = 1.3;
    let best = null, bs = 1e9;
    for (let r = 7; r <= 24; r += 1) for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2, x = G.x + Math.cos(a) * r, z = G.z + Math.sin(a) * r;
      const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2], [0, 0], [W / 2 + 1.5, 0]].map(([lx, lz]) => [x + lx * ca - lz * sa, z + lx * sa + lz * ca]);
      if (corners.some(([cx, cz]) => roadGrid.nearest(cx, cz).d < 1.2 || collision.blocked(cx, cz, 1.0) || inReserved(cx, cz))) continue;
      const ds = distStreet(x, z); if (ds > 22) continue;
      const score = Math.abs(ds - 9) + Math.abs(r - 11) * 0.5;
      if (score < bs) { bs = score; best = { x, z }; }
    }
    if (best) {
      const g = new THREE.Group();
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 224; const c = cv.getContext('2d');
      const gr = c.createLinearGradient(0, 0, 0, 224); gr.addColorStop(0, '#2a2c30'); gr.addColorStop(1, '#141518'); c.fillStyle = gr; c.fillRect(0, 0, 1024, 224);
      for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; c.fillRect(Math.random() * 1024, Math.random() * 224, 2, 2); }
      // emblem: navy disc, white laurel, red shield with white cross
      c.save(); c.translate(130, 112);
      c.fillStyle = '#1d2f63'; c.beginPath(); c.arc(0, 0, 84, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 5;
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + s * (0.35 + k * 0.33); c.beginPath(); c.ellipse(Math.cos(a) * 56, Math.sin(a) * 56, 13, 6, a + s * 0.6, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#d23a2c'; c.beginPath(); c.moveTo(-26, -30); c.lineTo(26, -30); c.lineTo(26, 6); c.quadraticCurveTo(26, 32, 0, 40); c.quadraticCurveTo(-26, 32, -26, 6); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-5, -30, 10, 68); c.fillRect(-26, -6, 52, 10);
      c.restore();
      c.fillStyle = '#f2f2ee'; c.font = '900 108px "Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif'; c.textBaseline = 'middle'; c.fillText('中原大學', 250, 92);
      c.font = '600 34px system-ui,sans-serif'; c.fillStyle = '#d9d9d4'; c.fillText('Chung Yuan Christian University', 254, 178);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      const granite = new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 0.22, metalness: 0.1 });
      const face = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.25, metalness: 0.05 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(W, 1.7, D), [granite, granite, granite, granite, face, face]); wall.position.y = 0.85; g.add(wall);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.08, D + 0.2), standard('#2e3034', { roughness: 0.3 })); cap.position.y = 1.74; g.add(cap);
      const conc = concreteTex();
      const obel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 13, 0.75), new THREE.MeshStandardMaterial({ color: '#b9bcbf', metalness: 0.85, roughness: 0.32, map: conc.map }));
      obel.geometry.translate(0, 6.5, 0); obel.position.set(W / 2 + 1.5, 0, 0); obel.rotation.z = -0.16; g.add(obel);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), standard('#c9a64a', { metalness: 0.9, roughness: 0.3 })); band.position.set(0, 9.2, 0); obel.add(band);
      g.position.set(best.x, 0, best.z); g.rotation.y = -sp; // local +x along the street; both faces carry the name
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
      g.updateMatrixWorld(true);
      const P = (lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(g.matrixWorld); return [v.x, v.z]; };
      deferredPolys.push([P(-W / 2, -D / 2), P(W / 2, -D / 2), P(W / 2, D / 2), P(-W / 2, D / 2)]);
      const ob = P(W / 2 + 1.5, 0); deferred.push([ob[0], ob[1], 0.6]);
      world.gateSign = { x: best.x, z: best.z };
    }
  }
  // 科學館 rooftop observatory dome
  {
    const sci = world.named['科學館'];
    if (sci && sci.b) {
      const pts = sci.b.pts; let bx = pts[0], bd = -1;
      for (const p of pts) { const d = Math.hypot(p[0] - sci.x, p[1] - sci.z); if (d > bd) { bd = d; bx = p; } }
      const dx = sci.x + (bx[0] - sci.x) * 0.55, dz = sci.z + (bx[1] - sci.z) * 0.55;
      if (pointInPoly(dx, dz, pts)) {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 3.4, 24), standard('#a6553f', { roughness: 0.85 })); base.position.y = 1.7; g.add(base);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(3.3, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), standard('#d9dcdf', { metalness: 0.75, roughness: 0.28 })); dome.position.y = 3.4; g.add(dome);
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 6.7), standard('#7c8186', { metalness: 0.6 })); slit.position.y = 3.4 + 0.05; slit.rotation.x = 0; g.add(slit);
        g.position.set(dx, sci.h, dz); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
      }
    }
  }
  // Fountain 中原噴水池
  const fp = data.areas.find(a => a.name === '中原噴水池');
  if (fp) {
    const cx = fp.pts.reduce((s, p) => s + p[0], 0) / fp.pts.length, cz = fp.pts.reduce((s, p) => s + p[1], 0) / fp.pts.length;
    const N = 260; const pos = new Float32Array(N * 3); const seeds = [];
    for (let i = 0; i < N; i++) seeds.push([rnd() * Math.PI * 2, 0.6 + rnd() * 0.8, rnd()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#e4f2ff', size: 0.13, transparent: true, opacity: 0.75 }));
    pts.frustumCulled = false; scene.add(pts);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.2, 24), new THREE.MeshStandardMaterial({ color: '#cfc9bc', map: concreteTex().map, roughness: 0.8 })); basin.position.set(cx, 0.6, cz); basin.castShadow = true; scene.add(basin);
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
    const frameM = standard('#2a2c30', { metalness: 0.6, roughness: 0.45 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(6 * s, 3 * s, 0.15), [frameM, frameM, frameM, frameM, boardMat, boardMat]);
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
  world.nightMarket = { x: -200, z: 280 };
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
    // canopies glow from the bulbs underneath at night
    const stripe = canvasTex(64, 8, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d8d8d8'; g.fillRect(i * 8, 0, 8, 8); } });
    stripe.repeat.set(2, 1);
    const topMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65, map: stripe });
    const glowU = { value: 0 };
    topMat.onBeforeCompile = (sh) => { sh.uniforms.uGlow = glowU; sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * uGlow;'); };
    topMat.customProgramCacheKey = () => 'stallTop';
    const top = new THREE.InstancedMesh(stallTop, topMat, spots.length);
    world.stallGlow = glowU;
    const steel = canvasTex(64, 64, (g) => { g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y++) { g.fillStyle = `rgba(${y % 3 ? 255 : 0},${y % 3 ? 255 : 0},${y % 3 ? 255 : 0},0.06)`; g.fillRect(0, y, 64, 1); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 64, 4); });
    const body = new THREE.InstancedMesh(stallBody, new THREE.MeshStandardMaterial({ color: '#8d9399', map: steel, roughness: 0.38, metalness: 0.65, emissive: '#ffcf8a', emissiveIntensity: 0 }), spots.length);
    // food signboards along the canopy edge, facing the street
    const FOODS = ['雞排', '珍珠奶茶', '臭豆腐', '蚵仔煎', '大腸包小腸', '鹹酥雞', '烤玉米', '地瓜球', '章魚燒', '滷味', '雞蛋糕', '甘蔗汁', '炭烤香腸', '胡椒餅', '蔥抓餅', '綠豆沙'];
    const foodAtlas = canvasTex(512, 1024, (g) => {
      const bgs = ['#c8102e', '#ffd23f', '#0a7d3b', '#1a4fb4', '#ff7a00', '#7b1fa2', '#222', '#e91e63'];
      FOODS.forEach((f, i) => { const y = i * 64; g.fillStyle = bgs[i % bgs.length]; g.fillRect(0, y, 512, 64); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(0, y, 512, 4);
        g.fillStyle = bgs[i % bgs.length] === '#ffd23f' ? '#a3001b' : '#fff'; g.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f, 256, y + 34); });
    }, false);
    const signG = new THREE.PlaneGeometry(2.6, 0.42);
    const signMat = new THREE.MeshStandardMaterial({ map: foodAtlas, emissiveMap: foodAtlas, emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.5 });
    signMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
        #ifdef USE_INSTANCING
          float fi = floor(mod(abs(instanceMatrix[3].x * 3.7 + instanceMatrix[3].z * 1.3), 16.0));
          vMapUv = vec2(vMapUv.x, (vMapUv.y + 15.0 - fi) / 16.0);
          vEmissiveMapUv = vMapUv;
        #endif`);
    };
    signMat.customProgramCacheKey = () => 'foodSign';
    const signM = new THREE.InstancedMesh(signG, signMat, spots.length);
    world.foodSignMat = signMat;
    const backG = new THREE.BoxGeometry(2.9, 2.2, 0.06); backG.translate(0, 1.4, -1.25);
    const back = new THREE.InstancedMesh(backG, new THREE.MeshStandardMaterial({ color: '#5b4a3a', roughness: 0.9 }), spots.length);
    const lanternG = new THREE.LatheGeometry([[0.0, -0.3], [0.1, -0.3], [0.1, -0.26], [0.2, -0.18], [0.24, 0], [0.2, 0.18], [0.1, 0.26], [0.1, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
    const lantern = new THREE.InstancedMesh(lanternG, new THREE.MeshStandardMaterial({ color: '#e8261c', emissive: '#ff3a1a', emissiveIntensity: 0.4, roughness: 0.55 }), spots.length * 2);
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
      // fascia sign on the street-side edge of the canopy
      const Qs = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(onx, onz));
      P.set(x + onx * 1.53, 2.45, z + onz * 1.53); M.compose(P, Qs, S); signM.setMatrixAt(i, M);
      // back panel faces the road: stall local -z points away from the street side
      const Qb = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(-onx, -onz));
      P.set(x, 0, z); M.compose(P, Qb, S); back.setMatrixAt(i, M);
      const ox = Math.cos(r) * 1.3, oz = -Math.sin(r) * 1.3;
      const SL = new THREE.Vector3(0.8, 0.8, 0.8);
      P.set(x + ox, 2.15, z + oz); M.compose(P, Q, SL); lantern.setMatrixAt(i * 2, M);
      P.set(x - ox, 2.15, z - oz); M.compose(P, Q, SL); lantern.setMatrixAt(i * 2 + 1, M);
      collision.addCircle(x, z, 1.1);
    });
    top.castShadow = true; body.castShadow = true; back.castShadow = true;
    signM.castShadow = false;
    scene.add(top, body, lantern, back, signM);
    world.lanternMat = lantern.material;
    world.marketSpots = spots;
  }
  onProgress(0.7);

  // ---------- street lamps ----------
  const lampSpots = [];
  {
    const spots = lampSpots;
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
    const pole = new THREE.CylinderGeometry(0.09, 0.13, 7, 8); pole.translate(0, 3.5, 0);
    const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6); arm.rotateX(Math.PI / 2 - 0.12); arm.translate(0, 6.95, 0.8);
    const head = new THREE.BoxGeometry(0.34, 0.12, 0.7); head.translate(0, 6.98, 1.55);
    const lens = new THREE.BoxGeometry(0.26, 0.03, 0.56); lens.translate(0, 6.905, 1.55);
    const poleMat = standard('#5d646b', { metalness: 0.6, roughness: 0.45 });
    const poleM = new THREE.InstancedMesh(pole, poleMat, spots.length);
    const armM = new THREE.InstancedMesh(arm, poleMat, spots.length);
    const headM = new THREE.InstancedMesh(head, standard('#4a4f55', { metalness: 0.5, roughness: 0.4 }), spots.length);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#d8d8d0', emissive: '#ffd9a0', emissiveIntensity: 0 });
    const lensM = new THREE.InstancedMesh(lens, lampMat, spots.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, r], i) => { Q.setFromAxisAngle(Y, r); P.set(x, 0, z); M.compose(P, Q, S); poleM.setMatrixAt(i, M); armM.setMatrixAt(i, M); headM.setMatrixAt(i, M); lensM.setMatrixAt(i, M); collision.addCircle(x, z, 0.2); });
    poleM.castShadow = true; armM.castShadow = true; headM.castShadow = true;
    scene.add(poleM, armM, headM, lensM);
    world.lampMat = lampMat;
    // light pools on the ground (cheap fake lighting at night)
    const pool = new THREE.CircleGeometry(5, 24); pool.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const poolM = new THREE.InstancedMesh(pool, poolMat, spots.length);
    spots.forEach(([x, z, r], i) => { M.makeTranslation(x + Math.sin(r) * 1.5, 0.06, z + Math.cos(r) * 1.5); poolM.setMatrixAt(i, M); });
    poolM.renderOrder = layerOrder++;
    scene.add(poolM);
    world.poolMat = poolMat;
    // soft volumetric light cones under each lamp head
    const cone = new THREE.CylinderGeometry(0.25, 2.6, 6.8, 20, 1, true); cone.translate(0, 3.45, 0);
    const coneMat = new THREE.MeshBasicMaterial({ map: coneTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
    const coneM = new THREE.InstancedMesh(cone, coneMat, spots.length);
    spots.forEach(([x, z, r], i) => { M.makeTranslation(x + Math.sin(r) * 1.55, 0, z + Math.cos(r) * 1.55); coneM.setMatrixAt(i, M); });
    coneM.renderOrder = 5; scene.add(coneM);
    world.coneMat = coneMat;
  }

  // ---------- traffic signals (flashing amber, like most small Taiwanese crossings) ----------
  {
    const spots = signalSpots.slice(0, 60);
    if (spots.length) {
      const g = new Geo(2), lights = new Geo(2);
      for (const s of spots) {
        const a = s.dirs[0] + Math.PI / 4, d = s.w / 2 + 1.8;
        const x = s.x + Math.sin(a) * d, z = s.z + Math.cos(a) * d;
        if (collision.blocked(x, z, 0.4) || roadGrid.nearest(x, z, q => q[5].drive).d < 0.3) continue;
        g.box(x, z, 0, 0.22, 0.22, 0, 5.4, col('#3c4045'));
        const ux = -Math.sin(a), uz = -Math.cos(a), L = Math.min(4, s.w / 2);
        const hx = x + ux * L, hz = z + uz * L;
        g.box((x + hx) / 2, (z + hz) / 2, Math.atan2(uz, ux), L, 0.14, 5.25, 5.4, col('#3c4045'));
        g.box(hx, hz, Math.atan2(uz, ux), 1.3, 0.38, 4.75, 5.2, col('#24272b'));
        lights.box(hx + uz * 0.2, hz - ux * 0.2, Math.atan2(uz, ux), 0.26, 0.05, 4.85, 5.1, col('#ffb000'));
        lights.box(hx - uz * 0.2, hz + ux * 0.2, Math.atan2(uz, ux), 0.26, 0.05, 4.85, 5.1, col('#ffb000'));
      }
      if (!g.empty) {
        const m = g.mesh(standard('#ffffff', { vertexColors: true, metalness: 0.5, roughness: 0.5 })); m.castShadow = true; scene.add(m);
        const lm = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffb000', emissiveIntensity: 1.5 });
        scene.add(lights.mesh(lm));
        world.animated.push((t) => { lm.emissiveIntensity = (Math.sin(t * 5) > 0 ? 3.2 : 0.05); });
      }
    }
  }

  // ---------- trees ----------
  {
    const spots = [];
    const tryTree = (x, z, s, ctx) => {
      if (x < B.minX + 3 || x > B.maxX - 3 || z < B.minZ + 3 || z > B.maxZ - 3) return;
      if (roadGrid.nearest(x, z).d < 1.0) return;
      if (collision.blocked(x, z, 2.2)) return;
      if (waterPolys.some(p => pointInPoly(x, z, p))) return;
      // keep the big lawn, pitches & car parks open like the real campus; a placeholder circle keeps every
      // later placement (and the parked-vehicle spawns in main.js) identical, then it is removed after spawning
      if (noTreePolys.some(p => pointInPoly(x, z, p))) { ghosts.push(collision.circles.length); collision.addCircle(x, z, 0.35); return; }
      // species picked with the visual-only generator so the layout (and collisions) stay identical
      const r = rnd2(), campus = world.inCampus(x, z);
      let kind, sc;
      if (ctx === 'green' || ctx === 'campus') kind = r < 0.3 ? 'rain' : r < 0.66 ? 'round' : r < 0.84 ? 'pine' : 'palm';
      else kind = campus ? (r < 0.35 ? 'palm' : r < 0.6 ? 'rain' : 'round') : (r < 0.18 ? 'palm' : 'round');
      if (kind === 'rain' && collision.blocked(x, z, 5.5)) kind = 'round';
      if (kind === 'round' && collision.blocked(x, z, 3.2)) kind = r < 0.5 ? 'palm' : 'pine';
      sc = kind === 'rain' ? 0.6 + (s - 0.8) * 0.45 : kind === 'round' ? 0.72 + (s - 0.8) * 0.5 : kind === 'pine' ? 0.72 + (s - 0.8) * 0.35 : 0.85 + (s - 0.8) * 0.3;
      spots.push({ x, z, s: sc, kind });
      collision.addCircle(x, z, 0.35);
    };
    const polyBox = (pts) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } return [a, b, c, d]; };
    for (const p of greenPolys) {
      const [x0, z0, x1, z1] = polyBox(p);
      const n = Math.min(400, Math.floor((x1 - x0) * (z1 - z0) / 140));
      for (let i = 0; i < n; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (pointInPoly(x, z, p)) tryTree(x, z, 0.8 + rnd() * 0.7, 'green'); }
    }
    for (const ring of data.campus) {
      const [x0, z0, x1, z1] = polyBox(ring);
      for (let i = 0; i < 1100; i++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (pointInPoly(x, z, ring)) tryTree(x, z, 0.8 + rnd() * 0.8, 'campus'); }
    }
    // roadside trees on named campus-ish roads
    for (const r of data.roads) {
      if (!(r.type === 'footway' || r.type === 'tertiary' || r.type === 'secondary')) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = 4; s < l; s += 11) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l; const nx = -dz / l, nz = dx / l;
          for (const side of [-1, 1]) if (rnd() < 0.6) tryTree(x + nx * side * (r.w / 2 + 2.2), z + nz * side * (r.w / 2 + 2.2), 0.8 + rnd() * 0.5, 'road');
        }
      }
    }
    // a ring of big rain trees around the edge of the 大草坪, like the real lawn
    for (const a of data.areas) {
      if (a.name !== '中原大學大草坪') continue;
      const pts = a.pts, cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % pts.length]; const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        for (let s = 6; s < l - 4; s += 15) {
          const x0 = p0[0] + (p1[0] - p0[0]) * s / l, z0 = p0[1] + (p1[1] - p0[1]) * s / l;
          const d = Math.hypot(cx - x0, cz - z0) || 1, x = x0 + (cx - x0) / d * 5, z = z0 + (cz - z0) / d * 5;
          if (!pointInPoly(x, z, pts) || roadGrid.nearest(x, z).d < 1.5 || collision.blocked(x, z, 4)) continue;
          spots.push({ x, z, s: 0.75 + rnd2() * 0.25, kind: 'rain' }); deferred.push([x, z, 0.35]);
        }
      }
    }
    // hand-placed feature trees (e.g. the big banyans & palms in front of 資管系館), still collision-checked
    for (const t of opts.featureTrees || []) {
      if (roadGrid.nearest(t.x, t.z).d < 1.0 || collision.blocked(t.x, t.z, 1.2)) continue;
      spots.push({ x: t.x, z: t.z, s: t.s, kind: t.kind }); deferred.push([t.x, t.z, 0.35]);
    }
    // clipped shrubs along campus building walls (visual only, no collision)
    for (const b of data.buildings) {
      if (b.skip || !(b.kind === 'campus' || b.kind === 'dorm')) continue;
      const pts = b.pts;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], c = pts[(i + 1) % pts.length]; const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 4) continue;
        const nx = dz / l, nz = -dx / l;
        for (let s = 1.5; s < l - 1.5; s += 2.1) {
          if (rnd2() < 0.45) continue;
          const x = a[0] + dx * s / l + nx * 1.1, z = a[1] + dz * s / l + nz * 1.1;
          if (roadGrid.nearest(x, z).d < 0.4 || collision.blocked(x, z, 0.5) || inReserved(x, z)) continue;
          spots.push({ x, z, s: 0.8 + rnd2() * 0.5, kind: 'shrub' });
        }
      }
    }
    world.vegetation = plantVegetation(scene, spots, quality);
    world.treeCount = spots.filter(s => s.kind !== 'shrub').length;
  }
  onProgress(0.85);

  // ---------- utility poles + overhead wires (台灣街景的電線桿) ----------
  {
    const poles = [], wires = [];
    for (const r of data.roads) {
      const L = ROAD_LAYER[r.type] ?? 1;
      if (!r.drive || L < 1 || (r.type === 'service' && !r.name) || r.type === 'primary') continue;
      if (world.inCampus(r.pts[0][0], r.pts[0][1]) && world.inCampus(r.pts[r.pts.length - 1][0], r.pts[r.pts.length - 1][1])) continue;
      const side = strHash((r.name || '') + r.pts[0][0]) % 2 ? 1 : -1;
      let acc = 0, prev = null;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        for (let s = (36 - acc % 36); s < l; s += 36) {
          const x = a[0] + dx * s / l, z = a[1] + dz * s / l, nx = -dz / l * side, nz = dx / l * side;
          const px = x + nx * (r.w / 2 + 0.55), pz = z + nz * (r.w / 2 + 0.55);
          const ok = !world.inCampus(px, pz) && !collision.blocked(px, pz, 0.45) && roadGrid.nearest(px, pz, q => q[5].drive && q[5] !== r).d > 0.4 && !inReserved(px, pz)
            && !lampSpots.some(q => Math.hypot(q[0] - px, q[1] - pz) < 2.5);
          if (ok) {
            const p = { x: px, z: pz, ang: Math.atan2(dx, dz), tr: rnd2() < 0.25 };
            poles.push(p);
            deferred.push([px, pz, 0.2]);
            if (prev && Math.hypot(prev.x - px, prev.z - pz) < 48) wires.push([prev, p]);
            prev = p;
          } else prev = null;
        }
        acc += l;
      }
    }
    if (poles.length) {
      const conc = concreteTex();
      const pg = new THREE.CylinderGeometry(0.11, 0.17, 10, 8); pg.translate(0, 5, 0);
      const arm1 = new THREE.BoxGeometry(1.9, 0.1, 0.1); arm1.translate(0, 9.3, 0);
      const arm2 = new THREE.BoxGeometry(1.2, 0.08, 0.08); arm2.translate(0, 7.9, 0);
      const tr = new THREE.CylinderGeometry(0.32, 0.32, 0.9, 10); tr.translate(0.42, 8.4, 0.2);
      const poleMat = new THREE.MeshStandardMaterial({ color: '#b9b7b0', map: conc.map, roughness: 0.9 });
      const armMat = standard('#3d4146', { metalness: 0.6, roughness: 0.5 });
      const trMat = standard('#7d8a8f', { metalness: 0.5, roughness: 0.5 });
      const pm = new THREE.InstancedMesh(pg, poleMat, poles.length), a1 = new THREE.InstancedMesh(arm1, armMat, poles.length), a2 = new THREE.InstancedMesh(arm2, armMat, poles.length);
      const trs = poles.filter(p => p.tr), tm = new THREE.InstancedMesh(tr, trMat, Math.max(1, trs.length));
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
      let ti = 0;
      poles.forEach((p, i) => { Q.setFromAxisAngle(Y, p.ang + Math.PI / 2); P.set(p.x, 0, p.z); M.compose(P, Q, S); pm.setMatrixAt(i, M); a1.setMatrixAt(i, M); a2.setMatrixAt(i, M); if (p.tr) tm.setMatrixAt(ti++, M); });
      tm.count = ti;
      for (const m of [pm, a1, a2, tm]) { m.castShadow = true; m.computeBoundingSphere(); scene.add(m); }
      // sagging wires
      const wp = [];
      const offs = [[-0.85, 9.38], [0, 9.38], [0.85, 9.38], [-0.5, 7.96], [0.5, 7.96]];
      for (const [p, q] of wires) {
        const pa = p.ang + Math.PI / 2, qa = q.ang + Math.PI / 2;
        for (const [ox, oy] of offs) {
          const ax = p.x + Math.cos(pa) * ox, az = p.z - Math.sin(pa) * ox, bx = q.x + Math.cos(qa) * ox, bz = q.z - Math.sin(qa) * ox;
          const sag = 0.55 + Math.hypot(bx - ax, bz - az) * 0.012;
          let lx = ax, ly = oy, lz = az;
          for (let k = 1; k <= 8; k++) {
            const t = k / 8, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = oy - sag * 4 * t * (1 - t);
            wp.push(lx, ly, lz, x, y, z); lx = x; ly = y; lz = z;
          }
        }
      }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
      const wl = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#16181b' }));
      scene.add(wl);
    }
    world.poleCount = poles.length;
  }

  // ---------- night lights: a small pool of real point lights that follow the nearest street lamps ----------
  {
    const n = quality === 'high' ? 8 : quality === 'medium' ? 4 : 0;
    const lights = [];
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight('#ffcf94', 0, 24, 2); l.position.set(0, -100, 0); scene.add(l); lights.push(l); }
    const heads = lampSpots.map(([x, z, r]) => ({ x: x + Math.sin(r) * 1.55, z: z + Math.cos(r) * 1.55 }));
    let tick = 0, enabled = true;
    world.lampLights = { update(dt, night, p) {
      if (!lights.length) return;
      tick -= dt;
      if (tick <= 0 && p) {
        tick = 0.3;
        const near = heads.map(h => [h, (h.x - p.x) ** 2 + (h.z - p.z) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, lights.length);
        near.forEach(([h], i) => lights[i].position.set(h.x, 6.6, h.z));
      }
      for (const l of lights) l.intensity = enabled ? night * 32 : 0;
    }, setEnabled(on) { enabled = on; } };
  }

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

  let lastT = 0;
  world.setQuality = (q) => { world.lampLights?.setEnabled(q !== 'low'); };
  if (quality === 'low') world.lampLights.setEnabled(false);
  world.update = (t, night, clockMin, playerPos) => {
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    for (const f of world.animated) f(t);
    for (const m of world.windowMats) m.emissiveIntensity = night * 1.1;
    if (world.shopMat) world.shopMat.emissiveIntensity = night * 0.85;
    if (world.lampMat) world.lampMat.emissiveIntensity = night * 3.2;
    if (world.poolMat) world.poolMat.opacity = night * 0.1;
    if (world.coneMat) world.coneMat.opacity = night * 0.05;
    if (world.marketGlow) world.marketGlow.opacity = night * 0.05;
    if (world.stallBodyMat) world.stallBodyMat.emissiveIntensity = night * 0.08;
    if (world.foodSignMat) world.foodSignMat.emissiveIntensity = 0.15 + night * 0.7;
    if (world.stallGlow) world.stallGlow.value = 0.04 + night * 0.22;
    if (world.lanternMat) world.lanternMat.emissiveIntensity = 0.3 + night * 1.4;
    if (world.signMats) for (const m of world.signMats) m.emissiveIntensity = 0.15 + night * 0.75;
    if (world.boardMats) for (const m of world.boardMats) m.emissiveIntensity = 0.1 + night * 0.7;
    world.vegetation?.update(t, playerPos);
    world.lampLights?.update(dt, night, playerPos);
    if (playerPos) for (const l of world.labels) {
      const d = Math.hypot(l.position.x - playerPos.x, l.position.z - playerPos.z);
      l.visible = d < 230;
    }
  };
  return world;
}
