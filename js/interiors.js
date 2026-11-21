// Enterable buildings: 資管系館 (multi-floor, classrooms, stairs, elevator), 麥當勞 (in 活動中心), 警衛室,
// 孫師傅牛肉拉麵 with 彥霖's old room upstairs, 戈登肉鋪 (Gordon Meat Shop) across from the main gate.
// Provides height-aware walls, walkable surfaces (floors/stairs) and E-key actions.
// All y values here are relative to the building's ground; tools/build_terrain.py
// flattens the terrain around each footprint so that ground is one constant height.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { pointInPoly, closestOnSeg } from './collision.js';
import { createCharacter } from './character.js';
import { dressCrew, CREW_SHIRT } from './mcuniform.js';
import { H } from './terrain.js';

// ---------------- textures ----------------
const TEX = {};
function ctex(key, w, h, draw, repeat = true) {
  if (TEX[key]) return TEX[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (TEX[key] = t);
}
const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
export const T = {
  diamond: () => ctex('diamond', 128, 64, (g) => {
    g.fillStyle = '#b9b9b4'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 128; i += 6) g.fillRect(i, 0, 1, 64);
    g.fillStyle = '#f4f4f0'; g.beginPath(); g.moveTo(64, 18); g.lineTo(78, 32); g.lineTo(64, 46); g.lineTo(50, 32); g.closePath(); g.fill();
  }),
  windowWall: () => ctex('winwall', 256, 128, (g) => {
    g.fillStyle = '#efede6'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#8fa8b8'; g.fillRect(10, 22, 236, 78);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(14, 26, 60, 70);
    g.fillStyle = '#d8d8d4'; for (let x = 10; x <= 246; x += 59) g.fillRect(x - 2, 22, 5, 78);
    g.fillRect(10, 58, 236, 4); g.fillStyle = '#c9c6bd'; g.fillRect(6, 100, 244, 6);
  }),
  beige: () => ctex('beige', 128, 128, (g) => {
    g.fillStyle = '#e4d9c3'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(120,100,70,0.25)'; g.lineWidth = 2;
    for (let y = 0; y <= 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x <= 128; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
  }),
  floor: () => ctex('floor', 128, 128, (g) => {
    g.fillStyle = '#d9d5ca'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64); g.strokeRect(64, 0, 64, 64); g.strokeRect(0, 64, 64, 64);
  }),
  board: () => ctex('board', 512, 256, (g) => {
    g.fillStyle = '#2d5a3b'; g.fillRect(0, 0, 512, 256); g.strokeStyle = '#8a6a44'; g.lineWidth = 14; g.strokeRect(0, 0, 512, 256);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = font(34, 700);
    g.fillText('資料庫系統  Ch.7 正規化', 30, 60); g.fillText('1NF → 2NF → 3NF → BCNF', 30, 110);
    g.fillStyle = '#ffd23f'; g.fillText('資管要贏 票投彥霖 ✌', 30, 190);
  }, false),
  verticalText: (text, key) => ctex('vt' + key, 96, 96 * text.length, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#4a4036'; g.font = font(78); g.textAlign = 'center'; g.textBaseline = 'middle';
    [...text].forEach((c, i) => g.fillText(c, 48, 48 + i * 96));
  }, false),
  banner: () => ctex('bannerIM', 1024, 160, (g) => {
    g.fillStyle = '#d0151f'; g.fillRect(0, 0, 1024, 160); g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 1024, 10); g.fillRect(0, 150, 1024, 10);
    g.font = font(96); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('資管要贏　票投彥霖', 512, 84);
  }, false),
  sign: (text, bg, fg, key, w = 512, h = 128, size = 72) => ctex('sign' + key, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.font = font(size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4);
  }, false),
  mcStaff: () => ctex('mcstaff', 384, 124, (g) => {
    g.fillStyle = '#c8102e'; g.fillRect(0, 0, 384, 124); g.fillStyle = '#ffbc0d'; g.fillRect(0, 0, 384, 10); g.fillRect(0, 114, 384, 10);
    g.fillStyle = '#fff'; g.font = font(50); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('員工入口 STAFF', 192, 64);
  }),
  mcLogo: () => ctex('mclogo', 512, 256, (g) => {
    g.fillStyle = '#c8102e'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#ffc72c'; g.lineWidth = 30; g.lineCap = 'round';
    g.beginPath(); g.moveTo(70, 210); g.bezierCurveTo(80, 20, 150, 20, 160, 210); g.moveTo(160, 210); g.bezierCurveTo(170, 20, 240, 20, 250, 210); g.stroke();
    g.fillStyle = '#fff'; g.font = font(92); g.textBaseline = 'middle'; g.fillText('麥當勞', 280, 135);
  }, false),
  // monitors show the desktop of js/pc.js (blue wallpaper, icons, taskbar)
  screen: () => ctex('screen', 256, 144, (g) => {
    const gr = g.createRadialGradient(180, 40, 10, 150, 60, 200); gr.addColorStop(0, '#3a7bd5'); gr.addColorStop(0.5, '#1c3f7a'); gr.addColorStop(1, '#0f2147');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 144);
    const ic = ['#4da3ff', '#ffd23f', '#e8323c', '#3fae49', '#9aa3b5', '#b06bff', '#2b2b2b'];
    ic.forEach((c, i) => { const x = 8 + (i % 2) * 22, y = 8 + Math.floor(i / 2) * 22; g.fillStyle = c; g.fillRect(x, y, 14, 12); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x, y + 14, 14, 2); });
    g.fillStyle = 'rgba(255,255,255,.18)'; g.font = font(16); g.textAlign = 'right'; g.fillText('資管要贏　票投彥霖', 246, 118);
    g.fillStyle = 'rgba(18,20,28,.92)'; g.fillRect(0, 128, 256, 16); g.fillStyle = '#2f6bff'; g.fillRect(3, 131, 34, 10);
    g.fillStyle = '#fff'; g.font = font(8, 700); g.fillText('17:40', 250, 139);
    const im = new Image(); // the same wallpaper as the computer desktop (js/pc.js), if the file is there
    im.onload = () => { const s = Math.max(256 / im.width, 128 / im.height), w = im.width * s, h = im.height * s; g.drawImage(im, (256 - w) / 2, (128 - h) / 2, w, h); g.fillStyle = 'rgba(18,20,28,.92)'; g.fillRect(0, 128, 256, 16); g.fillStyle = '#2f6bff'; g.fillRect(3, 131, 34, 10); g.fillStyle = '#fff'; g.fillText('17:40', 250, 139); if (TEX.screen) TEX.screen.needsUpdate = true; };
    im.src = 'assets/pc/wallpaper.jpg';
  }, false),
  cctv: () => ctex('cctv', 256, 160, (g) => {
    g.fillStyle = '#0a1a10'; g.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 4; i++) { const x = (i % 2) * 128, y = Math.floor(i / 2) * 80; g.fillStyle = ['#2b4a3a', '#30483f', '#28403a', '#2f4a40'][i]; g.fillRect(x + 3, y + 3, 122, 74); g.fillStyle = '#9f9'; g.font = '12px monospace'; g.fillText('CAM ' + (i + 1), x + 8, y + 16); }
  }, false),
};

// ---------------- materials ----------------
const MATS = {};
function M(key) {
  if (MATS[key]) return MATS[key];
  // indoor surfaces see little of the open sky, so they take less image-based light
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const m = {
    white: () => std({ color: '#f1efe9' }),
    wallIn: () => std({ color: '#f4f2ea' }),
    gray: () => std({ color: '#a9a9a4' }),
    red: () => std({ color: '#c0202b' }),
    green: () => std({ color: '#55b83a' }),
    diamond: () => std({ map: T.diamond() }),
    winWall: () => std({ map: T.windowWall() }),
    beige: () => std({ map: T.beige() }),
    floor: () => std({ map: T.floor(), roughness: 0.6 }),
    door: () => std({ color: '#b0353c' }),
    glass: () => new THREE.MeshStandardMaterial({ color: '#9fd3e6', transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.3, depthWrite: false }),
    // dark tinted glass (正門警衛亭)
    tint: () => new THREE.MeshStandardMaterial({ color: '#25313a', transparent: true, opacity: 0.78, roughness: 0.06, metalness: 0.3, depthWrite: false, emissive: '#ffe2b0', emissiveIntensity: 0 }),
    metal: () => std({ color: '#8d9196', metalness: 0.7, roughness: 0.35 }),
    desk: () => std({ color: '#cfa774' }),
    chairBlue: () => std({ color: '#3f6fb5' }),
    dark: () => std({ color: '#2b2b2b' }),
    light: () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff8e6', emissiveIntensity: 0.9 }),
    board: () => std({ map: T.board(), roughness: 0.9 }),
    solar: () => std({ color: '#1d2f5a', metalness: 0.6, roughness: 0.3 }),
    steel: () => std({ color: '#c9ccd0', metalness: 0.8, roughness: 0.25 }),
    chrome: () => std({ color: '#dfe2e6', metalness: 0.95, roughness: 0.18 }),
    // matches 學生活動中心 colour in tools/overrides.json
    sac: () => std({ color: '#e3e1db' }),
    screen: () => new THREE.MeshStandardMaterial({ map: T.screen(), emissive: '#ffffff', emissiveMap: T.screen(), emissiveIntensity: 0.9 }),
  }[key];
  return (MATS[key] = m ? m() : std({ color: key }));
}

// ---------------- interior world ----------------
export class Interiors {
  constructor(scene) {
    this.scene = scene; this.cell = 6; this.grid = new Map(); this.walls = [];
    this.surfaces = []; this.zones = []; this.actions = []; this.updaters = []; this.stamp = 0; this.wst = [];
  }
  _key(ix, iz) { return ix * 73856 + iz; }
  addWall(ax, az, bx, bz, y0, y1) {
    const wi = this.walls.length; this.walls.push([ax, az, bx, bz, y0, y1]); this.wst.push(0);
    const c = this.cell;
    for (let ix = Math.floor(Math.min(ax, bx) / c); ix <= Math.floor(Math.max(ax, bx) / c); ix++)
      for (let iz = Math.floor(Math.min(az, bz) / c); iz <= Math.floor(Math.max(az, bz) / c); iz++) {
        const k = this._key(ix, iz); let l = this.grid.get(k); if (!l) this.grid.set(k, l = []); l.push(wi);
      }
  }
  addSurface(pts, h) {
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, z); d = Math.max(d, z); }
    this.surfaces.push({ pts, h: typeof h === 'function' ? h : () => h, minx: a, minz: b, maxx: c, maxz: d });
  }
  groundAt(x, z, y) {
    let g = 0;
    for (const s of this.surfaces) {
      if (x < s.minx || x > s.maxx || z < s.minz || z > s.maxz || !pointInPoly(x, z, s.pts)) continue;
      const h = s.h(x, z); if (h <= y + 0.6 && h > g) g = h;
    }
    return g;
  }
  _near(x, z, r, fn) {
    const st = ++this.stamp, c = this.cell;
    for (let ix = Math.floor((x - r) / c); ix <= Math.floor((x + r) / c); ix++)
      for (let iz = Math.floor((z - r) / c); iz <= Math.floor((z + r) / c); iz++) {
        const l = this.grid.get(this._key(ix, iz)); if (!l) continue;
        for (const wi of l) { if (this.wst[wi] === st) continue; this.wst[wi] = st; fn(this.walls[wi]); }
      }
  }
  resolve(pos, r, y = 0) {
    let hit = false, nx = 0, nz = 0;
    for (let it = 0; it < 2; it++) {
      this._near(pos.x, pos.z, r, (w) => {
        if (!(w[4] < y + 1.6 && w[5] > y + 0.35)) return;
        const q = closestOnSeg(pos.x, pos.z, w[0], w[1], w[2], w[3]);
        const dx = pos.x - q[0], dz = pos.z - q[1], d2 = dx * dx + dz * dz;
        if (d2 < r * r && d2 > 1e-10) { const d = Math.sqrt(d2); pos.x = q[0] + dx / d * r; pos.z = q[1] + dz / d * r; nx += dx / d; nz += dz / d; hit = true; }
      });
    }
    return { hit, nx, nz };
  }
  blocked(x, z, r, y = 0) {
    let b = false;
    this._near(x, z, r, (w) => {
      if (b || !(w[4] < y + 1.6 && w[5] > y + 0.35)) return;
      const q = closestOnSeg(x, z, w[0], w[1], w[2], w[3]);
      if ((q[0] - x) ** 2 + (q[1] - z) ** 2 < r * r) b = true;
    });
    return b || this.zones.some(zn => zn.solid && pointInPoly(x, z, zn.pts));
  }
  // first hit fraction along a 3D segment (walls only); ay/by are world y
  ray(ax, ay, az, bx, by, bz) {
    let best = 1;
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(len / this.cell));
    const seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const l = this.grid.get(this._key(Math.floor(x / this.cell), Math.floor(z / this.cell))); if (!l) continue;
      for (const wi of l) {
        if (seen.has(wi)) continue; seen.add(wi);
        const w = this.walls[wi];
        const d1x = bx - ax, d1z = bz - az, d2x = w[2] - w[0], d2z = w[3] - w[1];
        const den = d1x * d2z - d1z * d2x; if (Math.abs(den) < 1e-9) continue;
        const s = ((w[0] - ax) * d2z - (w[1] - az) * d2x) / den, u = ((w[0] - ax) * d1z - (w[1] - az) * d1x) / den;
        if (s < 0 || s > 1 || u < 0 || u > 1) continue;
        const hy = ay + (by - ay) * s - H(ax + d1x * s, az + d1z * s);
        if (hy >= w[4] && hy <= w[5] && s < best) best = s;
      }
    }
    return best;
  }
  zoneAt(x, z, y) {
    for (const zn of this.zones) if (y >= zn.y0 - 0.5 && y <= zn.y1 && pointInPoly(x, z, zn.pts)) return zn;
    return null;
  }
  actionAt(x, z, y) {
    let best = null, bd = 1e9;
    for (const a of this.actions) {
      if (a.cond && !a.cond()) continue;
      if (!a.anyY && Math.abs(y - a.y) > 1.3) continue;
      const d = a.poly ? (pointInPoly(x, z, a.poly) ? 0 : 1e9) : Math.hypot(x - a.x, z - a.z);
      if (d < (a.poly ? 1 : a.r) && d < bd) { bd = d; best = a; }
    }
    return best;
  }
  update(dt, game) { for (const u of this.updaters) u(dt, game); }
}

// ---------------- local-frame building kit ----------------
class Kit {
  // sc: uniform scale of the whole building (local units * sc = metres); collision walls and surfaces follow it
  constructor(I, ox, oz, ang, sc = 1) {
    this.I = I; this.ox = ox; this.oz = oz; this.c = Math.cos(ang); this.s = Math.sin(ang); this.ang = ang; this.sc = sc;
    this.parts = new Map();
    // render base = terrain at the (flattened) building origin
    this.base = H(ox, oz);
    this.group = new THREE.Group(); this.group.position.set(ox, this.base, oz); this.group.rotation.y = -ang; this.group.scale.setScalar(sc);
  }
  w(lx, lz) { lx *= this.sc; lz *= this.sc; return [this.ox + lx * this.c - lz * this.s, this.oz + lx * this.s + lz * this.c]; }
  l(x, z) { const dx = x - this.ox, dz = z - this.oz; return [(dx * this.c + dz * this.s) / this.sc, (-dx * this.s + dz * this.c) / this.sc]; }
  rect(x0, x1, z0, z1) { return [this.w(x0, z0), this.w(x1, z0), this.w(x1, z1), this.w(x0, z1)]; }
  heading(localAngle = 0) { return localAngle - this.ang; } // three rotation.y for local-forward
  box(x0, x1, y0, y1, z0, z1, mat, o = {}) {
    const W = x1 - x0, H = y1 - y0, D = z1 - z0;
    const g = new THREE.BoxGeometry(W, H, D);
    if (o.tile) {
      const [tu, tv] = o.tile; const uv = g.attributes.uv;
      const dims = [[D, H], [D, H], [W, D], [W, D], [W, H], [W, H]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tu, uv.getY(i) * dims[f][1] / tv); }
    }
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    if (o.col !== false) this.wallRect(x0, x1, z0, z1, y0, y1);
    if (o.surface) this.I.addSurface(this.rect(x0, x1, z0, z1), y1 * this.sc);
    return g;
  }
  wallRect(x0, x1, z0, z1, y0, y1) {
    const p = this.rect(x0, x1, z0, z1);
    for (let i = 0; i < 4; i++) { const a = p[i], b = p[(i + 1) % 4]; this.I.addWall(a[0], a[1], b[0], b[1], y0 * this.sc, y1 * this.sc); }
  }
  wallLine(x0, z0, x1, z1, y0, y1) { const a = this.w(x0, z0), b = this.w(x1, z1); this.I.addWall(a[0], a[1], b[0], b[1], y0 * this.sc, y1 * this.sc); }
  _part(mat, g) { if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(g); return g; }
  // wall slab of thickness th along the segment (x0,z0)-(x1,z1), for walls that are not axis-aligned
  slab(x0, z0, x1, z1, th, y0, y1, mat, o = {}) {
    const dx = x1 - x0, dz = z1 - z0, g = new THREE.BoxGeometry(Math.hypot(dx, dz), y1 - y0, th);
    g.rotateY(-Math.atan2(dz, dx)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (o.col !== false) this.wallLine(x0, z0, x1, z1, y0, y1);
    return this._part(mat, g);
  }
  cyl(x, z, r, y0, y1, mat, o = {}) {
    const g = new THREE.CylinderGeometry(o.r1 ?? r, r, y1 - y0, o.seg || 10); g.translate(x, (y0 + y1) / 2, z);
    if (o.col) this.wallRect(x - r, x + r, z - r, z + r, y0, y1);
    return this._part(mat, g);
  }
  // vertical prism over a local polygon [[x,z]..] (own mesh: ExtrudeGeometry is not indexed);
  // bevel rounds the top / bottom edges, inset pulls the sides in
  prism(pts, y0, y1, mat, o = {}) {
    const b = o.bevel || 0, sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0 - 2 * b, bevelEnabled: b > 0 || !!o.inset, bevelThickness: b, bevelSize: b, bevelOffset: -b - (o.inset || 0), bevelSegments: b > 0 ? 2 : 1, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0 + b, 0);
    const m = new THREE.Mesh(g, M(mat)); m.castShadow = o.shadow !== false; m.receiveShadow = true; this.group.add(m);
    if (o.surface) this.I.addSurface(pts.map(([x, z]) => this.w(x, z)), y1 * this.sc);
    return m;
  }
  plane(tex, w, h, x, y, z, rotY = 0, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: !!o.transparent, roughness: 0.8, emissive: o.emissive ? '#ffffff' : '#000000', emissiveMap: o.emissive ? tex : null, emissiveIntensity: o.emissive || 0, side: o.double ? THREE.DoubleSide : THREE.FrontSide }));
    m.position.set(x, y, z); m.rotation.y = rotY; this.group.add(m); return m;
  }
  finish(scene, shadow = true) {
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(geo, M(mat));
      mesh.castShadow = shadow && mat !== 'glass'; mesh.receiveShadow = false;
      this.group.add(mesh);
    }
    scene.add(this.group);
  }
}

// =====================================================================
// 資訊管理學系館 — modelled after the real building photo:
// 3 floors, open front corridors with grey diamond-pattern parapets + red trim,
// green dado + red doors on the ground floor, glass lift tower with red frame (left),
// beige-tile stair tower with vertical 「資訊管理學系」 (right), roof band with diamonds.
// =====================================================================
// NOTE: tools/build_terrain.py flattens the terrain under this footprint from a
// copy of these numbers; after changing them, sync it and rerun the script.
export const IM_SPEC = { ox: 79.9, oz: 92.6, ang: Math.atan2(16.9, 49.3), L: 46, D: 12.5, FH: 3.8, NF: 3 };
export function imFootprint() {
  const { ox, oz, ang, L, D } = IM_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(-5, -0.5), w(L + 6.5, -0.5), w(L + 6.5, D + 4), w(-5, D + 4)];
}
function buildIM(I, scene) {
  const { ox, oz, ang, L, D, FH, NF } = IM_SPEC;
  const k = new Kit(I, ox, oz, ang);
  const CZ = 9.5, NR = 4, RW = L / NR, TOP = FH * NF;
  const rooms = [];
  for (let f = 0; f < NF; f++) {
    const y0 = f * FH;
    // floor slab
    if (f === 0) k.box(0, L, 0, 0.12, 0, D, 'floor', { col: false, surface: true, tile: [2, 2] });
    else k.box(0, L, y0 - 0.25, y0, 0, D + 0.3, 'floor', { col: false, surface: true, tile: [2, 2] });
    // back wall (windows)
    k.box(0, L, y0, y0 + FH, 0, 0.25, 'winWall', { tile: [3.2, FH] });
    // end walls of classroom zone
    k.box(0, 0.25, y0, y0 + FH, 0.25, CZ, 'white');
    k.box(L - 0.25, L, y0, y0 + FH, 0.25, CZ, 'white');
    for (let i = 1; i < NR; i++) k.box(i * RW - 0.1, i * RW + 0.1, y0, y0 + FH, 0.25, CZ - 0.25, 'wallIn');
    for (let i = 0; i < NR; i++) {
      const rx = i * RW;
      // front wall with door
      k.box(rx, rx + 1.2, y0, y0 + FH, CZ - 0.25, CZ, 'winWall', { tile: [3.2, FH] });
      k.box(rx + 2.3, rx + RW, y0, y0 + FH, CZ - 0.25, CZ, 'winWall', { tile: [3.2, FH] });
      k.box(rx + 1.2, rx + 2.3, y0 + 2.3, y0 + FH, CZ - 0.25, CZ, 'white', { col: false });
      k.box(rx + 2.3, rx + 2.36, y0 + 0.02, y0 + 2.28, CZ, CZ + 1.0, 'door', { col: false }); // open door leaf
      // room number
      const no = `${f + 1}0${i + 1}`;
      k.plane(T.sign(`資管系 ${no}`, '#1f3b73', '#ffffff', 'room' + no, 256, 64, 34), 0.9, 0.22, rx + 1.75, y0 + 2.55, CZ + 0.02);
      // blackboard + teacher desk (students face -x)
      k.box(rx + 0.3, rx + 0.36, y0 + 0.95, y0 + 2.25, 2.0, 7.8, 'board', { col: false });
      k.box(rx + 1.0, rx + 1.7, y0, y0 + 0.9, 3.8, 5.8, 'desk');
      // desks and chairs (rooms 101 and 301 are computer labs)
      const lab = i === 0 && (f === 0 || f === 2);
      if (lab) k.plane(T.sign('電腦教室', '#c0202b', '#ffffff', 'lab' + no, 256, 64, 40), 0.9, 0.22, rx + 1.75, y0 + 2.85, CZ + 0.02);
      for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 4; iz++) {
        const dx = rx + 3.2 + ix * 1.6, dz = 1.4 + iz * 2.0;
        if (lab) {
          k.box(dx + 0.06, dx + 0.1, y0 + 0.8, y0 + 1.2, dz + 0.25, dz + 0.85, 'screen', { col: false });
          k.box(dx + 0.02, dx + 0.06, y0 + 0.78, y0 + 1.22, dz + 0.23, dz + 0.87, 'dark', { col: false });
          k.box(dx + 0.0, dx + 0.2, y0 + 0.76, y0 + 0.8, dz + 0.45, dz + 0.65, 'dark', { col: false });
          k.box(dx + 0.25, dx + 0.42, y0 + 0.76, y0 + 0.78, dz + 0.3, dz + 0.8, 'dark', { col: false });
          const cp = k.w(dx + 0.9, dz + 0.55);
          I.actions.push({ x: cp[0], z: cp[1], r: 0.75, y: y0, label: () => '按 <kbd>E</kbd> 使用電腦', fn: (g) => g.pc.open(`資管系 ${no} 電腦教室`) }); // desktop; the old easter-egg video is its 🎬 app
        }
        k.box(dx, dx + 0.55, y0 + 0.72, y0 + 0.76, dz, dz + 1.1, 'desk', { col: false });
        k.box(dx + 0.02, dx + 0.53, y0, y0 + 0.72, dz + 0.04, dz + 0.1, 'metal', { col: false });
        k.box(dx + 0.02, dx + 0.53, y0, y0 + 0.72, dz + 1.0, dz + 1.06, 'metal', { col: false });
        k.wallRect(dx, dx + 0.55, dz, dz + 1.1, y0, y0 + 0.76);
        // chair behind desk
        k.box(dx + 0.7, dx + 1.1, y0 + 0.42, y0 + 0.47, dz + 0.35, dz + 0.75, 'chairBlue', { col: false });
        k.box(dx + 1.06, dx + 1.1, y0 + 0.47, y0 + 0.95, dz + 0.35, dz + 0.75, 'chairBlue', { col: false });
        k.box(dx + 0.85, dx + 0.95, y0, y0 + 0.42, dz + 0.5, dz + 0.6, 'metal', { col: false });
      }
      // ceiling lights
      for (let lx = 0; lx < 3; lx++) k.box(rx + 2.5 + lx * 3, rx + 3.7 + lx * 3, y0 + FH - 0.3, y0 + FH - 0.26, 3, 6.5, 'light', { col: false });
      rooms.push({ x: rx + RW / 2, y: y0, f, i });
    }
    // corridor lights
    for (let lx = 2; lx < L; lx += 6) k.box(lx, lx + 0.8, y0 + FH - 0.3, y0 + FH - 0.26, 10.6, 11.4, 'light', { col: false });
    // ground floor: green dado on corridor-facing wall
    if (f === 0) k.box(0, L, 0, 1.0, CZ, CZ + 0.05, 'green', { col: false });
    else {
      // balcony parapet (grey + white diamonds), red trim, metal rail
      k.box(0, L, y0, y0 + 1.05, D - 0.25, D, 'diamond', { tile: [1.6, 1.05] });
      k.box(0, L, y0 + 1.05, y0 + 1.15, D - 0.3, D + 0.06, 'red', { col: false });
      k.box(0, L, y0 + 1.55, y0 + 1.6, D - 0.2, D - 0.12, 'metal', { col: false });
      for (let x = 0.5; x < L; x += 2) k.box(x, x + 0.04, y0 + 1.15, y0 + 1.55, D - 0.2, D - 0.15, 'metal', { col: false });
      k.wallLine(0, D - 0.1, L, D - 0.1, y0, y0 + 1.6);
      // beam band under each slab
      k.box(0, L, y0 - 0.85, y0 - 0.25, D, D + 0.3, 'diamond', { col: false, tile: [1.6, 0.6] });
    }
  }
  // pillars along the corridor front
  for (let x = 0; x <= L + 0.01; x += L / 8) k.box(x - 0.22, x + 0.22, 0, TOP, D - 0.45, D - 0.01, 'white');
  // roof slab, roof band with diamonds, solar panels
  k.box(-0.2, L + 0.2, TOP - 0.25, TOP, -0.2, D + 0.35, 'gray', { col: false });
  k.box(-0.2, L + 0.2, TOP, TOP + 1.5, D, D + 0.35, 'diamond', { col: false, tile: [1.6, 1.5] });
  k.box(-0.2, L + 0.2, TOP, TOP + 0.6, -0.2, 0.1, 'gray', { col: false });
  for (let x = 2; x < L - 3; x += 3.2) { const g = k.box(x, x + 2.8, TOP + 0.4, TOP + 0.5, 2, 8.5, 'solar', { col: false }); }
  // campaign banner on the 2F parapet (like the red banner in the photo)
  k.plane(T.banner(), 9, 1.4, L / 2 - 2, FH + 0.55, D + 0.08);

  // ---- glass lift tower (left) with red frame ----
  const ex0 = -4.5, ez0 = 7, ez1 = D, eh = TOP + 1.2;
  k.box(ex0, ex0 + 0.12, 0, eh, ez0, ez1, 'glass');
  k.box(ex0, 0, 0, eh, ez0, ez0 + 0.12, 'glass');
  k.box(ex0, 0, 0, eh, ez1 - 0.12, ez1, 'glass');
  for (const [x, z] of [[ex0, ez0], [ex0, ez1], [0, ez0], [0, ez1]]) k.box(x - 0.15, x + 0.15, 0, eh, z - 0.15, z + 0.15, 'red', { col: false });
  k.box(ex0 - 0.2, 0.2, eh - 0.6, eh, ez0 - 0.2, ez1 + 0.2, 'red', { col: false });
  for (let f = 1; f <= NF; f++) k.box(ex0, 0, f * FH - 0.12, f * FH, ez0, ez1, 'red', { col: false });
  const cab = new THREE.Group(); // moving lift cab
  const cabMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 4.6), M('metal')); cabMesh.position.set(-2.25, 0.08, 9.75); cab.add(cabMesh);
  k.group.add(cab);
  for (let f = 0; f < NF; f++) k.box(ex0 + 0.12, 0, f * FH - 0.1, f * FH + 0.1, ez0 + 0.12, ez1 - 0.12, 'metal', { col: false, surface: true });
  // ---- beige stair tower (right) ----
  const sx = L, sw = 6, sh = TOP + 2;
  k.box(sx + sw - 0.25, sx + sw, 0, sh, 0, D, 'beige', { tile: [1.5, 1.5] });
  k.box(sx, sx + sw, 0, sh, 0, 0.25, 'beige', { tile: [1.5, 1.5] });
  k.box(sx, sx + sw, 0, sh, D - 0.25, D, 'beige', { tile: [1.5, 1.5] });
  k.box(sx, sx + 0.25, TOP, sh, 0, D, 'beige', { col: false, tile: [1.5, 1.5] });
  k.box(sx - 0.2, sx + sw + 0.2, sh, sh + 0.2, -0.2, D + 0.2, 'gray', { col: false });
  k.plane(T.verticalText('資訊管理學系', 'im'), 1.1, 6.6, sx + 3, 7.0, D + 0.03, 0, { transparent: true });
  const half = FH / 2;
  for (let f = 0; f < NF; f++) {
    const y0 = f * FH;
    // landing to the corridor
    k.box(sx + 0.25, sx + sw - 0.25, f === 0 ? 0 : y0 - 0.2, f === 0 ? 0.12 : y0, 11, D - 0.25, 'floor', { col: false, surface: true, tile: [2, 2] });
    if (f < NF - 1) {
      // flight A (x: sx+0.25..sx+2.9) up toward -z, then landing, then flight B back toward +z
      const A0 = sx + 0.25, A1 = sx + 2.9, B0 = sx + 3.1, B1 = sx + sw - 0.25;
      for (let j = 0; j < 12; j++) {
        const z1 = 11 - j * 0.5, z0 = z1 - 0.5, h = y0 + (j + 1) * half / 12;
        k.box(A0, A1, h - 0.35, h, z0, z1, 'floor', { col: false });
        const hb = y0 + half + (j + 1) * half / 12, zb0 = 5 + j * 0.5;
        k.box(B0, B1, hb - 0.35, hb, zb0, zb0 + 0.5, 'floor', { col: false });
      }
      I.addSurface(k.rect(A0, A1, 5, 11), (x, z) => { const lz = k.l(x, z)[1]; return y0 + Math.max(0, Math.min(1, (11 - lz) / 6)) * half; });
      I.addSurface(k.rect(B0, B1, 5, 11), (x, z) => { const lz = k.l(x, z)[1]; return y0 + half + Math.max(0, Math.min(1, (lz - 5) / 6)) * half; });
      k.box(A0, B1, y0 + half - 0.2, y0 + half, 0.25, 5, 'floor', { col: false, surface: true, tile: [2, 2] });
      k.box(A1, B0, y0, y0 + FH, 5, 11, 'beige', { tile: [1.5, 1.5] }); // centre wall
      // handrails
      k.box(A0, A0 + 0.05, y0 + 0.9, y0 + half + 0.95, 5, 11, 'metal', { col: false });
      if (f === 0) k.wallLine(B0, 10.9, B1, 10.9, 0, 1.5); // no walking under flight B on the ground floor
    } else {
      // top floor: railing across the stair well (flight A side)
      k.box(sx + 0.25, sx + 2.9, y0, y0 + 1.1, 10.95, 11.05, 'metal');
    }
  }
  k.finish(scene);
  // interior zone (camera + location name)
  I.zones.push({ name: '資訊管理學系館', pts: k.rect(-4.5, L + sw, 0, D), y0: 0, y1: TOP, ceil: (y) => Math.floor((y + 0.3) / FH) * FH + FH - 0.35, floorOf: (y) => Math.min(NF, Math.floor((y + 0.3) / FH) + 1) });
  // lift: E cycles floors
  let liftTarget = null, liftY = 0;
  I.actions.push({
    poly: k.rect(ex0 + 0.2, -0.2, ez0 + 0.2, ez1 - 0.2), y: 0, anyY: true,
    label: () => '按 <kbd>E</kbd> 搭電梯（1F → 2F → 3F）',
    fn: (g) => {
      const p = g.player; const cur = Math.round(p.y / FH); const next = (cur + 1) % NF;
      liftTarget = next * FH; g.audio.lift(); g.hud.toast(`電梯 → ${next + 1}F`, 'good', 1200);
      p.y = liftTarget + 0.12; p.vy = 0;
    },
  });
  I.updaters.push((dt, g) => { const t = liftTarget ?? 0; liftY += (t - liftY) * Math.min(1, dt * 3); cab.position.y = liftY; });
  return { k, rooms, frontPoint: k.w(L / 2, D + 4), classroom: (f, i) => k.w(i * RW + RW / 2, 5), FH };
}

// =====================================================================
// 麥當勞 inside the east end of 學生活動中心
// =====================================================================
// NOTE: tools/build_terrain.py flattens the terrain under this footprint from a
// copy of these numbers; after changing them, sync it and rerun the script.
export const MCD_SPEC = { x0: -136, x1: -112, z0: -114, z1: -94, H: 4.6, top: 14 };
export function sacTrimmedPts() {
  return [[-194.7, -128.6], [-163.2, -128.4], [-112, -129.9], [-112, -114], [-136, -114], [-136, -94.4], [-144.4, -94.4], [-195.2, -94.5]];
}
// Look of the real store (photos of 中原大學麥當勞): dark grey 60 cm floor tiles, white grid ceiling with
// square downlights, white counter on a black plinth under a dropped soffit with digital menu boards,
// charcoal banquette under a black & white mural, oak tables with bentwood chairs, a long stainless
// communal table under white drum pendants, a striped accent wall, oak panels, yellow trash cabinets,
// dark fascia with white "McDonald's". All textures are drawn here (no photos are used).
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
function archPath(g, x, y, w, h, lw) {
  // golden-arches style double hump, drawn as two thick parabolic strokes
  g.lineWidth = lw; g.lineCap = 'butt'; g.beginPath();
  const b = y + h, hw = w / 4;
  g.moveTo(x + lw / 2, b); g.bezierCurveTo(x + lw / 2, y - h * 0.15, x + hw * 2 - lw * 0.1, y - h * 0.15, x + hw * 2, b * 0.55 + y * 0.45);
  g.bezierCurveTo(x + hw * 2 + lw * 0.1, y - h * 0.15, x + w - lw / 2, y - h * 0.15, x + w - lw / 2, b);
  g.stroke();
}
function foodIcon(g, kind, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (kind === 'burger') {
    g.fillStyle = '#e0a04a'; g.beginPath(); g.ellipse(0, -10, 34, 20, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#f2e6c8'; for (let i = 0; i < 7; i++) g.fillRect(-24 + i * 8, -22 + (i % 2) * 4, 3, 2);
    g.fillStyle = '#5fae3a'; g.fillRect(-36, -10, 72, 5); g.fillStyle = '#ffcc33'; g.fillRect(-34, -5, 68, 4);
    g.fillStyle = '#6a3518'; g.beginPath(); g.roundRect(-35, -1, 70, 10, 4); g.fill();
    g.fillStyle = '#d99640'; g.beginPath(); g.roundRect(-33, 9, 66, 11, 6); g.fill();
  } else if (kind === 'fries') {
    g.fillStyle = '#f7c948'; for (let i = 0; i < 8; i++) g.fillRect(-20 + i * 5.2, -34 + (i * 7) % 10, 4, 30);
    g.fillStyle = '#db0007'; g.beginPath(); g.moveTo(-24, -10); g.quadraticCurveTo(0, -18, 24, -10); g.lineTo(18, 22); g.lineTo(-18, 22); g.closePath(); g.fill();
    g.strokeStyle = '#ffc72c'; g.lineWidth = 3; archPath(g, -9, -4, 18, 10, 3);
  } else if (kind === 'drink') {
    g.fillStyle = '#f4f4f2'; g.beginPath(); g.moveTo(-17, -24); g.lineTo(17, -24); g.lineTo(13, 24); g.lineTo(-13, 24); g.closePath(); g.fill();
    g.fillStyle = '#db0007'; g.fillRect(-15, -4, 30, 12); g.fillStyle = '#ddd'; g.fillRect(-19, -29, 38, 5); g.fillStyle = '#ffbc0d'; g.fillRect(4, -44, 3, 16);
  } else if (kind === 'nugget') {
    g.fillStyle = '#db0007'; g.fillRect(-26, -2, 52, 22);
    g.fillStyle = '#d99a52'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(-18 + i * 9, -6 + (i % 2) * 3, 8, 6, i * 0.5, 0, 7); g.fill(); }
  } else if (kind === 'cone') {
    g.fillStyle = '#d6a05a'; g.beginPath(); g.moveTo(-11, 0); g.lineTo(11, 0); g.lineTo(0, 30); g.closePath(); g.fill();
    g.fillStyle = '#fbf7ec'; g.beginPath(); g.arc(0, -6, 13, 0, 7); g.fill(); g.beginPath(); g.arc(0, -18, 8, 0, 7); g.fill();
  } else if (kind === 'chicken') {
    g.fillStyle = '#c9772e'; g.beginPath(); g.ellipse(0, 0, 30, 20, -0.3, 0, 7); g.fill();
    g.fillStyle = '#e3a356'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-18 + (i % 5) * 9, -6 + Math.floor(i / 5) * 10, 4, 0, 7); g.fill(); }
  }
  g.restore();
}
const MCT = {
  floor: () => ctex('mcTile', 256, 256, (g) => {
    const r = lcg(7);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const v = 116 + Math.floor(r() * 14); g.fillStyle = `rgb(${v + 6},${v + 3},${v})`; g.fillRect(i * 128, j * 128, 128, 128);
      for (let n = 0; n < 700; n++) { const q = Math.floor(v + (r() - 0.5) * 30); g.fillStyle = `rgba(${q + 5},${q + 2},${q},0.35)`; g.fillRect(i * 128 + r() * 128, j * 128 + r() * 128, 1.5, 1.5); }
    }
    g.fillStyle = 'rgba(78,74,70,0.9)'; for (const k of [0, 128]) { g.fillRect(k, 0, 2, 256); g.fillRect(0, k, 256, 2); }
  }),
  lobby: () => ctex('mcLobby', 256, 256, (g) => {
    // the corridor floor in the photo: big beige tiles framed by terracotta bands, laid on the diagonal
    const r = lcg(5); g.fillStyle = '#d9c39a'; g.fillRect(0, 0, 256, 256);
    for (let n = 0; n < 900; n++) { const q = 200 + Math.floor((r() - 0.5) * 30); g.fillStyle = `rgba(${q},${q - 22},${q - 60},0.3)`; g.fillRect(r() * 256, r() * 256, 2, 2); }
    g.save(); g.translate(128, 128); g.rotate(Math.PI / 4); g.strokeStyle = 'rgba(140,110,70,0.5)'; g.lineWidth = 2;
    for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 45, -200); g.lineTo(i * 45, 200); g.stroke(); g.beginPath(); g.moveTo(-200, i * 45); g.lineTo(200, i * 45); g.stroke(); }
    g.restore();
    g.fillStyle = '#a4553a'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 0, 18, 256);
    g.fillStyle = 'rgba(70,35,20,0.6)'; for (let i = 0; i < 256; i += 18) { g.fillRect(i, 0, 1.5, 18); g.fillRect(0, i, 18, 1.5); }
  }),
  quarry: () => ctex('mcQuarry', 128, 128, (g) => {
    const r = lcg(9);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const v = Math.floor(r() * 14); g.fillStyle = `rgb(${150 + v},${70 + v},${50 + v})`; g.fillRect(i * 64, j * 64, 64, 64); }
    g.fillStyle = '#5c3a2c'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 2); g.fillRect(0, 0, 2, 128); g.fillRect(64, 0, 2, 128);
  }),
  ceil: () => ctex('mcCeil', 128, 128, (g) => {
    const r = lcg(3); g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, 128, 128);
    for (let n = 0; n < 900; n++) { g.fillStyle = `rgba(150,148,140,${0.08 + r() * 0.12})`; g.fillRect(r() * 128, r() * 128, 1.3, 1.3); }
    g.fillStyle = '#c9c7c1'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128);
  }),
  oak: () => ctex('mcOak', 256, 256, (g) => {
    const r = lcg(11);
    for (let p = 0; p < 4; p++) {
      const base = [164, 124, 86].map(c => c + Math.floor((r() - 0.5) * 18)); g.fillStyle = `rgb(${base})`; g.fillRect(p * 64, 0, 64, 256);
      for (let n = 0; n < 26; n++) { const x = p * 64 + r() * 64, d = (r() - 0.5) * 30; g.strokeStyle = `rgba(${90 + d},${62 + d},${40 + d},${0.25 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 1.4; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 8, 90, x + (r() - 0.5) * 8, 170, x + (r() - 0.5) * 6, 256); g.stroke(); }
      g.fillStyle = 'rgba(60,40,26,0.55)'; g.fillRect(p * 64, 0, 1.5, 256);
    }
  }),
  blackTile: () => ctex('mcBlackTile', 64, 64, (g) => { g.fillStyle = '#1c1d20'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a3c40'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(4, 4, 20, 56); }),
  stripes: () => ctex('mcStripes', 1024, 64, (g) => {
    const cols = ['#ffbc0d', '#f3f1ec', '#3a3c40', '#db0007', '#f3f1ec', '#ffbc0d', '#c9c9c9', '#f28c28', '#3a3c40', '#f3f1ec', '#db0007', '#ffbc0d', '#f3f1ec', '#3a3c40', '#f28c28', '#ffbc0d', '#f3f1ec', '#c9c9c9', '#db0007', '#3a3c40'];
    const w = [70, 38, 22, 40, 60, 30, 46, 52, 18, 64, 26, 58, 40, 24, 48, 66, 34, 50, 36, 28];
    const tot = w.reduce((a, b) => a + b, 0); let x = 0;
    cols.forEach((c, i) => { const ww = w[i] / tot * 1024; g.fillStyle = c; g.fillRect(x, 0, ww + 1, 64); x += ww; });
  }, false),
  mural: () => ctex('mcMural', 2048, 430, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#202124'); gr.addColorStop(0.55, '#2c2d31'); gr.addColorStop(1, '#3d3e42'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = lcg(21), words = ['中原', '資管', '順起來', '彥霖', '薯條', '大麥克', '下課了', '宵夜', '期中考', '社團', 'MUSIC', 'PLAY', 'LOVE', '夜市', '同學', '週末'];
    g.fillStyle = 'rgba(240,240,236,0.75)'; g.font = '700 15px "Noto Sans TC",sans-serif';
    for (let c = 0; c < 70; c++) { const x = 20 + c * 29 + r() * 8; let y = r() * 60; while (y < h) { g.fillText(words[Math.floor(r() * words.length)], x, y); y += 22 + r() * 30; } }
    // big headphones (white line art) over a soft spotlight
    const cx = 1300, cy = 250, sp = g.createRadialGradient(cx, cy, 20, cx, cy, 420); sp.addColorStop(0, 'rgba(255,255,255,0.18)'); sp.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sp; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f3f2ee'; g.lineWidth = 26; g.beginPath(); g.arc(cx, cy + 60, 210, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.arc(cx, cy + 60, 240, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    for (const s of [-1, 1]) {
      g.fillStyle = '#121214'; g.beginPath(); g.ellipse(cx + s * 205, cy + 120, 62, 92, s * 0.12, 0, 7); g.fill();
      g.strokeStyle = '#f3f2ee'; g.lineWidth = 10; g.stroke();
      g.fillStyle = '#db0007'; g.beginPath(); g.ellipse(cx + s * 205, cy + 120, 30, 50, s * 0.12, 0, 7); g.fill();
    }
    g.fillStyle = '#ffbc0d'; g.fillRect(140, h - 70, 520, 8);
    g.fillStyle = '#f3f2ee'; g.font = '900 64px "Noto Sans TC",sans-serif'; g.fillText('一起・好時光', 140, h - 100);
  }, false),
  menu: (i) => ctex('mcMenu' + i, 512, 288, (g, w, h) => {
    const sets = [
      ['超值全餐', [['burger', '大麥克', '$155'], ['fries', '薯條', '$65'], ['drink', '可樂', '$38']]],
      ['雞肉系列', [['chicken', '麥香雞', '$125'], ['nugget', '雞塊 6塊', '$69'], ['drink', '雪碧', '$38']]],
      ['今日推薦', [['burger', '雙層牛肉堡', '$145'], ['fries', '大薯', '$65'], ['cone', '蛋捲冰淇淋', '$15']]],
      ['點心', [['nugget', '麥克雞塊', '$69'], ['fries', '中薯', '$55'], ['chicken', '麥脆雞', '$75']]],
      ['甜點飲料', [['cone', '冰炫風', '$59'], ['drink', '紅茶', '$33'], ['cone', '聖代', '$45']]],
      ['學生套餐', [['burger', '吉事堡', '$99'], ['drink', '可樂', '$38'], ['fries', '小薯', '$45']]],
    ];
    const [title, items] = sets[i % sets.length];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#103a7a'); gr.addColorStop(1, '#071a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#db0007'; g.fillRect(0, 0, w, 52); g.fillStyle = '#ffbc0d'; g.fillRect(0, 52, w, 5);
    g.fillStyle = '#ffffff'; g.font = '900 34px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle'; g.fillText(title, 18, 28);
    g.strokeStyle = '#ffbc0d'; archPath(g, w - 74, 12, 56, 30, 8);
    items.forEach(([icon, name, price], k) => {
      const x = 16 + k * 166, y = 70;
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.roundRect(x, y, 152, 204, 12); g.fill();
      foodIcon(g, icon, x + 76, y + 70, 1.35);
      g.fillStyle = '#ffffff'; g.font = '800 24px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText(name, x + 76, y + 148);
      g.fillStyle = '#ffbc0d'; g.font = '900 30px Arial,sans-serif'; g.fillText(price, x + 76, y + 182); g.textAlign = 'left';
    });
  }, false),
  pos: () => ctex('mcPos', 128, 80, (g) => {
    g.fillStyle = '#0d2238'; g.fillRect(0, 0, 128, 80);
    const cs = ['#db0007', '#ffbc0d', '#2e7d32', '#1565c0', '#f28c28', '#6d4c41'];
    for (let i = 0; i < 12; i++) { g.fillStyle = cs[i % cs.length]; g.fillRect(6 + (i % 4) * 30, 8 + Math.floor(i / 4) * 22, 26, 18); }
  }, false),
  fascia: () => ctex('mcFascia', 1024, 144, (g, w, h) => {
    g.fillStyle = '#2f3134'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffbc0d'; archPath(g, 40, 22, 150, 96, 22);
    g.fillStyle = '#ffffff'; g.font = '900 96px "Arial Black","Helvetica Neue",Arial,sans-serif'; g.textBaseline = 'middle'; g.fillText("McDonald's", 230, 78);
  }, false),
  arches: (col) => ctex('mcArch' + col, 256, 224, (g) => { g.clearRect(0, 0, 256, 224); g.strokeStyle = col; archPath(g, 14, 18, 228, 196, 40); }, false),
  bin: (label, icon, key) => ctex('mcBin' + key, 256, 120, (g) => {
    g.fillStyle = '#ffbc0d'; g.fillRect(0, 0, 256, 120);
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(14, 22, 228, 76, 8); g.fill();
    g.fillStyle = '#2f3134'; g.fillRect(24, 32, 56, 56); g.fillStyle = '#ffffff'; g.font = '700 38px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 52, 62);
    g.fillStyle = '#2f3134'; g.font = '900 34px "Noto Sans TC",sans-serif'; g.fillText(label, 162, 62);
  }, false),
  toss: () => ctex('mcToss', 512, 244, (g, w, h) => {
    g.fillStyle = '#ffbc0d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    // stick figure tossing a cup into a basket (white line drawing, like the panel in the store)
    g.beginPath(); g.arc(330, 58, 22, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(330, 80); g.lineTo(326, 160); g.moveTo(326, 160); g.lineTo(306, 226); g.moveTo(326, 160); g.lineTo(348, 226);
    g.moveTo(328, 104); g.lineTo(286, 76); g.lineTo(256, 62); g.moveTo(328, 104); g.lineTo(366, 132); g.stroke();
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(312 + i * 5, 36); g.lineTo(306 + i * 7, 14 - (i % 3) * 4); g.stroke(); }
    g.beginPath(); g.moveTo(246, 64); g.quadraticCurveTo(200, 30, 156, 96); g.setLineDash([10, 12]); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(110, 120); g.lineTo(200, 120); g.lineTo(188, 214); g.lineTo(122, 214); g.closePath(); g.stroke();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(128 + i * 18, 124); g.lineTo(132 + i * 16, 210); g.stroke(); }
  }, false),
  column: () => ctex('mcColumn', 64, 512, (g) => { const c = ['#f28c28', '#db0007', '#3a3c40', '#db0007', '#f3f1ec']; const ww = [22, 18, 6, 10, 8]; let x = 0; c.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(x, 0, ww[i] + 1, 512); x += ww[i]; }); }, false),
  kids: () => ctex('mcKids', 256, 384, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a7de1'); gr.addColorStop(1, '#0f4fa8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#db0007'; g.beginPath(); g.moveTo(48, 150); g.lineTo(208, 150); g.lineTo(196, 300); g.lineTo(60, 300); g.closePath(); g.fill();
    g.strokeStyle = '#ffbc0d'; g.lineWidth = 12; g.beginPath(); g.arc(98, 150, 34, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(158, 150, 34, Math.PI, 0); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(104, 222, 10, 0, 7); g.arc(152, 222, 10, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(128, 246, 30, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '900 40px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('開心樂園餐', 128, 70);
    g.fillStyle = '#ffbc0d'; g.font = '800 26px "Noto Sans TC",sans-serif'; g.fillText('玩具 · 好好玩', 128, 352);
  }, false),
  // ---- 內場 (kitchen + back corridor, photo 內場.jpg) ----
  galv: () => ctex('mcGalv', 256, 256, (g, w, h) => {
    // galvanised walk-in panel: mottled spangle, faint vertical brushing, seam at the panel edge
    const r = lcg(31); g.fillStyle = '#d4d7da'; g.fillRect(0, 0, w, h);
    for (let n = 0; n < 160; n++) {
      const x = r() * w, y = r() * h, s = 8 + r() * 26, v = 205 + Math.floor((r() - 0.5) * 22);
      g.fillStyle = `rgba(${v},${v + 2},${v + 4},0.35)`; g.beginPath(); g.moveTo(x, y);
      for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI * 2 + r(); g.lineTo(x + Math.cos(a) * s * (0.5 + r() * 0.5), y + Math.sin(a) * s * (0.5 + r() * 0.5)); }
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h);
    g.fillStyle = '#7d8186'; g.fillRect(0, 0, 3, h); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(3, 0, 2, h);
  }),
  whiteTile: () => ctex('mcWhiteTile', 128, 128, (g) => {
    const r = lcg(13); g.fillStyle = '#c3c8c6'; g.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = 238 + Math.floor(r() * 10); g.fillStyle = `rgb(${v},${v + 1},${v - 1})`; g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(i * 32 + 3, j * 32 + 3, 10, 2); }
  }),
  katlas: () => ctex('mcKAtlas', 1024, 1024, (g) => { for (const [name, [x, y, w, h]] of Object.entries(KR)) { g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, h); g.clip(); KDRAW[name](g, w, h); g.restore(); } }, false),
};
// Kitchen decal atlas: every small picture of the kitchen (control panels, screens, labels, box prints, the
// grill and oil surfaces…) lives in this one 1024² canvas and is put on flat quads (atlasUV), which are merged
// into two meshes (lit + glowing) — the way taipei-rush.app dresses its shop interiors, so the whole kitchen
// costs a handful of draw calls however many details it has.
const KR = {
  grill: [0, 0, 256, 128], oil: [256, 0, 128, 128], uhc: [384, 0, 256, 128], kvs: [640, 0, 256, 160], fryPanel: [896, 0, 128, 64], hot: [896, 64, 128, 48],
  drink: [0, 160, 256, 128], fire: [256, 160, 128, 128], net: [384, 160, 64, 96], cold: [448, 160, 128, 48], freeze: [448, 208, 128, 48], syrupA: [576, 160, 192, 128], syrupB: [768, 160, 192, 128],
  drain: [0, 320, 128, 128], louver: [128, 320, 128, 128], sop: [256, 320, 128, 160], fries: [384, 320, 128, 96], toaster: [512, 320, 128, 96], board: [640, 320, 256, 160], bag: [896, 320, 64, 96], carton: [960, 320, 64, 64],
  staffRoom: [0, 480, 256, 64], backDoor: [0, 544, 256, 64], caution: [256, 480, 128, 160], coffee: [384, 480, 128, 96], icecream: [512, 480, 128, 128], wrap: [640, 480, 128, 64], kvs2: [768, 480, 256, 160],
};
const KF = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
function kvsDraw(g, w, h, orders) {
  g.fillStyle = '#0b0c10'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, 18); g.fillStyle = '#9fb3d9'; g.font = KF(12, 700); g.fillText('KVS 內場出餐  ●  ' + orders.length + ' 單', 6, 13);
  const cw = (w - 8) / orders.length;
  orders.forEach(([no, col, lines], i) => {
    const x = 4 + i * cw; g.fillStyle = '#20232b'; g.fillRect(x + 2, 22, cw - 4, h - 26);
    g.fillStyle = col; g.fillRect(x + 2, 22, cw - 4, 18); g.fillStyle = '#111'; g.font = KF(13); g.fillText('#' + no, x + 6, 36);
    g.fillStyle = '#f2f2f2'; g.font = KF(12, 700); lines.forEach((l, j) => g.fillText(l, x + 6, 56 + j * 18));
  });
}
const KDRAW = {
  grill: (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a2b2e'); gr.addColorStop(0.5, '#3a3b3f'); gr.addColorStop(1, '#232427'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = lcg(41); g.strokeStyle = 'rgba(200,200,205,0.08)'; for (let i = 0; i < 40; i++) { g.lineWidth = 1 + r() * 2; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 6); g.stroke(); }
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(70,40,20,${0.15 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 16, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = '#141416'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  },
  oil: (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.4, h * 0.4, 4, w / 2, h / 2, w * 0.7); gr.addColorStop(0, '#f0c25a'); gr.addColorStop(1, '#a8701c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = lcg(43); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,236,170,${0.2 + r() * 0.4})`; g.lineWidth = 1; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); g.stroke(); }
    g.strokeStyle = 'rgba(90,55,15,0.28)'; g.lineWidth = 5; for (let x = 22; x < w; x += 28) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h - 6); g.stroke(); } // heating coils seen through the oil
  },
  uhc: (g, w, h) => {
    g.fillStyle = '#5d6268'; g.fillRect(0, 0, w, h);
    const lbl = ['10:1', '4:1', '雞', '雞塊', '辣雞', '早餐'];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
      const x = 6 + i * 125, y = 6 + j * 40;
      g.fillStyle = '#131416'; g.fillRect(x, y + 12, 118, 24); g.fillStyle = '#b9bec4'; g.fillRect(x, y + 32, 118, 4);
      g.fillStyle = '#1a0f05'; g.fillRect(x, y, 118, 12);
      g.fillStyle = '#ff8a1c'; g.font = '700 11px monospace'; g.fillText(lbl[j * 2 + i], x + 4, y + 10); g.fillText(`${(j * 7 + i * 5) % 18 + 2}:0${(i + j) % 6}`, x + 80, y + 10);
    }
  },
  kvs: (g, w, h) => kvsDraw(g, w, h, [['118', '#3ad07a', ['大麥克 ×1', '薯條(大) ×1', '可樂 ×1']], ['119', '#ffc72c', ['麥香雞 ×2', '雞塊 6塊 ×1']], ['120', '#ff6b5a', ['薯條(中) ×2', '冰炫風 ×1']]]),
  kvs2: (g, w, h) => kvsDraw(g, w, h, [['121', '#3ad07a', ['雙層牛肉 ×1', '薯條(小) ×1']], ['122', '#3ad07a', ['大麥克 ×2', '可樂 ×2', '蘋果派 ×1']]]),
  fryPanel: (g, w, h) => {
    g.fillStyle = '#18191b'; g.fillRect(0, 0, w, h);
    for (const x of [6, 68]) { g.fillStyle = '#2a0606'; g.fillRect(x, 8, 54, 22); g.fillStyle = '#ff3b2b'; g.font = '700 18px monospace'; g.fillText(x < 50 ? '3:10' : '2:45', x + 4, 26); }
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 4 === 3 ? '#3ad07a' : '#5b5e63'; g.beginPath(); g.arc(12 + i * 15, 46, 5, 0, 7); g.fill(); }
  },
  hot: (g, w, h) => { g.fillStyle = '#ffcc00'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = KF(24); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚠ 高溫注意', w / 2, h / 2 + 1); },
  drink: (g, w, h) => {
    g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, w, h);
    const d = [['可樂', '#c8102e'], ['零卡可樂', '#1b1b1b'], ['雪碧', '#1f8a3a'], ['柳橙', '#f28c28'], ['紅茶', '#7a3b1c'], ['冰水', '#2d7fd0']];
    d.forEach(([t, c], i) => { const x = 4 + i * 42; g.fillStyle = c; g.fillRect(x, 10, 38, 64); g.fillStyle = '#fff'; g.font = KF(t.length > 2 ? 10 : 14); g.textAlign = 'center'; g.fillText(t, x + 19, 48); });
    g.textAlign = 'left'; g.fillStyle = '#2b2c2f'; g.fillRect(0, 86, w, 42);
  },
  fire: (g, w, h) => {
    g.fillStyle = '#efe9d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#8b8574'; g.fillRect(0, 0, w, 6);
    g.fillStyle = '#2b2b2b'; g.fillRect(36, 16, 74, 92);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { g.fillStyle = (i + j) % 3 ? '#c8202a' : '#3ad07a'; g.fillRect(44 + i * 34, 22 + j * 21, 24, 14); }
    g.fillStyle = '#c8202a'; g.font = KF(11); g.fillText('火警受信總機', 30, 122);
    g.fillStyle = '#9b9584'; for (let i = 0; i < 5; i++) g.fillRect(8, 30 + i * 8, 20, 3);
  },
  net: (g, w, h) => { g.fillStyle = '#ecece8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c9c4'; g.fillRect(4, 4, w - 8, h - 8); g.fillStyle = '#3ad07a'; g.beginPath(); g.arc(w / 2, h - 18, 5, 0, 7); g.fill(); },
  cold: (g, w, h) => { g.fillStyle = '#ffd200'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.fillRect(0, 0, 10, h); g.fillStyle = '#111'; g.font = KF(28); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('冷藏庫', w / 2 + 5, h / 2 + 1); },
  freeze: (g, w, h) => { g.fillStyle = '#ffd200'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d5bbf'; g.fillRect(0, 0, 10, h); g.fillStyle = '#111'; g.font = KF(28); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('冷凍庫', w / 2 + 5, h / 2 + 1); },
  syrupA: (g, w, h) => syrupBox(g, w, h, '可樂 汽水糖漿袋 20L', '#c8102e', '0504114'),
  syrupB: (g, w, h) => syrupBox(g, w, h, '檸檬紅茶 糖漿袋 20L', '#3d8b3d', '0504262'),
  drain: (g, w, h) => {
    g.fillStyle = '#e8ece9'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa29e';
    for (let j = 0; j < 9; j++) for (let i = 0; i < 6; i++) { g.beginPath(); g.roundRect(8 + i * 19, 6 + j * 13, 14, 7, 3); g.fill(); }
    g.strokeStyle = '#43b26a'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
  },
  louver: (g, w, h) => { g.fillStyle = '#b8bcc1'; g.fillRect(0, 0, w, h); for (let y = 10; y < h - 8; y += 12) { g.fillStyle = '#4c5056'; g.fillRect(8, y, w - 16, 6); g.fillStyle = '#e4e7ea'; g.fillRect(8, y + 6, w - 16, 2); } },
  sop: (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d5bbf'; g.fillRect(0, 0, w, 30); g.fillStyle = '#fff'; g.font = KF(17); g.fillText('洗手 SOP', 22, 22);
    for (let i = 0; i < 6; i++) { const x = 8 + (i % 2) * 58, y = 38 + Math.floor(i / 2) * 40; g.fillStyle = '#e3eefb'; g.fillRect(x, y, 54, 34); g.fillStyle = '#1d5bbf'; g.font = KF(12); g.fillText(String(i + 1), x + 4, y + 14); g.fillStyle = '#f0c8a8'; g.beginPath(); g.ellipse(x + 32, y + 20, 12, 8, 0.3, 0, 7); g.fill(); }
  },
  fries: (g, w, h) => {
    g.fillStyle = '#5e5f63'; g.fillRect(0, 0, w, h); const r = lcg(47);
    for (let i = 0; i < 260; i++) { g.save(); g.translate(8 + r() * (w - 16), 8 + r() * (h - 16)); g.rotate(r() * Math.PI); const v = Math.floor(r() * 40); g.fillStyle = `rgb(${225 + v / 3},${170 + v},${60 + v / 2})`; g.fillRect(-12, -2.5, 24, 5); g.restore(); }
  },
  toaster: (g, w, h) => { g.fillStyle = '#26282c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a1a'; g.fillRect(10, 14, w - 20, 6); g.fillStyle = '#ffb35a'; g.font = '700 16px monospace'; g.fillText('BUN 0:17', 14, 50); g.fillStyle = '#3ad07a'; g.beginPath(); g.arc(w - 18, 74, 6, 0, 7); g.fill(); },
  board: (g, w, h) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a7abb0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#c8102e'; g.font = KF(20); g.fillText('今日備料 / 尖峰', 14, 30);
    g.fillStyle = '#1d4fa8'; g.font = KF(15, 700); ['牛肉餅 3 箱　雞腿排 2 箱', '薯條 8 包　麵包 12 盤', '★ 油溫 168°C 記得量', '★ 嗶聲響了就起鍋！'].forEach((t, i) => g.fillText(t, 16, 58 + i * 24));
  },
  bag: (g, w, h) => { g.fillStyle = '#c49a62'; g.fillRect(0, 0, w, h); g.fillStyle = '#a77f4b'; g.fillRect(0, 0, w, 10); g.strokeStyle = '#ffbc0d'; archPath(g, 12, 36, 40, 26, 7); },
  carton: (g, w, h) => { g.fillStyle = '#db0007'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffbc0d'; archPath(g, 14, 18, 36, 26, 6); },
  staffRoom: (g, w, h) => { g.fillStyle = '#2f3134'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = KF(26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('員工休息室 STAFF', w / 2, h / 2 + 2); },
  backDoor: (g, w, h) => { g.fillStyle = '#1e5a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = KF(26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('後門・收貨 隨手關門', w / 2, h / 2 + 2); },
  caution: (g, w, h) => {
    g.fillStyle = '#ffd200'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w - 14, 86); g.lineTo(14, 86); g.closePath(); g.fill();
    g.fillStyle = '#ffd200'; g.beginPath(); g.moveTo(w / 2, 28); g.lineTo(w - 26, 78); g.lineTo(26, 78); g.closePath(); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2 + 4, 44, 5, 0, 7); g.fill(); g.fillRect(w / 2 - 10, 52, 22, 5); g.fillRect(w / 2 - 14, 66, 30, 4);
    g.font = KF(24); g.textAlign = 'center'; g.fillText('小心地滑', w / 2, 124);
  },
  coffee: (g, w, h) => { g.fillStyle = '#16171a'; g.fillRect(0, 0, w, h); g.fillStyle = '#0e2a4a'; g.fillRect(12, 10, w - 24, 40); g.fillStyle = '#7fc4ff'; g.font = KF(14); g.fillText('美式  拿鐵', 22, 36); for (let i = 0; i < 4; i++) { g.fillStyle = '#3a3c40'; g.beginPath(); g.arc(22 + i * 28, 72, 9, 0, 7); g.fill(); } },
  icecream: (g, w, h) => {
    g.fillStyle = '#cfd3d7'; g.fillRect(0, 0, w, h); g.fillStyle = '#26282c'; g.fillRect(14, 12, w - 28, 30); g.fillStyle = '#7dff9a'; g.font = '700 14px monospace'; g.fillText('READY  -4°C', 20, 32);
    g.fillStyle = '#9aa0a6'; for (let i = 0; i < 3; i++) g.fillRect(20 + i * 34, 60, 22, 46); g.fillStyle = '#c8102e'; g.font = KF(14); g.fillText('冰淇淋', 40, 122);
  },
  wrap: (g, w, h) => { const c = ['#ffbc0d', '#2b6cb0', '#db0007', '#ffbc0d']; c.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(i * 32, 0, 30, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(i * 32 + 4, 6, 22, 4); }); },
};
function syrupBox(g, w, h, title, col, code) {
  g.fillStyle = '#c69c6d'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(90,60,30,0.15)'; for (let i = 0; i < 30; i++) g.fillRect(0, i * 4.3, w, 1);
  g.fillStyle = col; g.fillRect(10, 12, 26, 26); g.fillStyle = '#fff'; g.font = KF(18); g.fillText('糖', 14, 32);
  g.fillStyle = '#1b1b1b'; g.font = KF(15); g.fillText(title, 42, 32); g.font = '700 18px Arial'; g.fillText(code, w - 82, 64);
  g.strokeStyle = '#3b3b3b'; g.lineWidth = 2; for (let i = 0; i < 3; i++) g.strokeRect(14 + i * 34, 52, 28, 28);
  g.fillStyle = '#f4f2ea'; g.fillRect(w * 0.62, 0, 12, h); g.fillRect(0, h * 0.78, w, 10); // white strapping bands
}
// map a PlaneGeometry onto one atlas region (1 px inset against bleeding)
function atlasUV(geo, name) {
  const [x, y, w, h] = KR[name], A = 1024, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + 1 + uv.getX(i) * (w - 2)) / A, 1 - (y + 1 + (1 - uv.getY(i)) * (h - 2)) / A);
  return geo;
}
function mcdMaterials() {
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  // the store is lit by warm 3000 K downlights; the scene's lights are the (cool) sky, so each surface gets a
  // small warm emissive lift (following its texture) — brighter and warmer without adding real lights
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set(o.map ? '#ffe4c4' : new THREE.Color(o.color || '#ffffff').lerp(new THREE.Color('#ffd9a8'), 0.25)); m.emissiveMap = o.map || null; m.emissiveIntensity = lift; }
    return m;
  };
  return {
    floor: def('mcdFloor', () => std({ map: MCT.floor(), roughness: 0.42, metalness: 0.05 }, 0.22)),
    lobby: def('mcdLobby', () => std({ map: MCT.lobby(), roughness: 0.35 }, 0.2)),
    quarry: def('mcdQuarry', () => std({ map: MCT.quarry(), roughness: 0.6 }, 0.15)),
    cove: def('mcdCove', () => new THREE.MeshStandardMaterial({ color: '#fff2d6', emissive: '#ffe7b8', emissiveIntensity: 0.55 })),
    ceil: def('mcdCeil', () => std({ map: MCT.ceil(), roughness: 0.95 }, 0.42)),
    wall: def('mcdWall', () => std({ color: '#f4f2ec', roughness: 0.8 }, 0.3)),
    oak: def('mcdOak', () => std({ map: MCT.oak(), roughness: 0.6 }, 0.2)),
    oakTop: def('mcdOakTop', () => std({ color: '#c9a072', roughness: 0.45 }, 0.15)),
    blackTile: def('mcdBlackTile', () => std({ map: MCT.blackTile(), roughness: 0.3 })),
    counter: def('mcdCounter', () => std({ color: '#f6f5f1', roughness: 0.35 }, 0.3)),
    top: def('mcdTop', () => std({ color: '#e2e0da', roughness: 0.25 }, 0.18)),
    black: def('mcdBlack', () => std({ color: '#161719', roughness: 0.45 })),
    bench: def('mcdBench', () => std({ color: '#4a4b50', roughness: 0.95 }, 0.06)),
    walnut: def('mcdWalnut', () => std({ color: '#6a4630', roughness: 0.45, side: THREE.DoubleSide }, 0.1)),
    yellow: def('mcdYellow', () => std({ color: '#ffbc0d', roughness: 0.35 }, 0.22)),
    frame: def('mcdFrame', () => std({ color: '#3a3c40', roughness: 0.5, metalness: 0.3 })),
    pillar: def('mcdPillar', () => std({ color: '#45474b', roughness: 0.6 }, 0.05)),
    fasciaBox: def('mcdFasciaBox', () => std({ color: '#2f3134', roughness: 0.6 })),
    vent: def('mcdVent', () => std({ color: '#e2e0da', roughness: 0.6 }, 0.25)),
    warm: def('mcdWarm', () => new THREE.MeshStandardMaterial({ color: '#ffb35a', emissive: '#ff9a3c', emissiveIntensity: 0.9 })),
    fryer: def('mcdFryer', () => std({ color: '#5b5f64', metalness: 0.7, roughness: 0.35 })),
    tray: def('mcdTray', () => std({ color: '#a6362c', roughness: 0.5 })),
    lamp: def('mcdLamp', () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff1d6', emissiveIntensity: 1.2, roughness: 0.6 })),
    // 內場
    kSteel: def('mcdKSteel', () => std({ color: '#d3d7dc', metalness: 0.5, roughness: 0.3 }, 0.14)),
    kSteelDk: def('mcdKSteelDk', () => std({ color: '#9aa0a7', metalness: 0.55, roughness: 0.36 }, 0.08)),
    kBlack: def('mcdKBlack', () => std({ color: '#1f2023', roughness: 0.5, metalness: 0.2 })),
    galv: def('mcdGalv', () => std({ map: MCT.galv(), metalness: 0.25, roughness: 0.5 }, 0.2)),
    whiteTile: def('mcdWhiteTile', () => std({ map: MCT.whiteTile(), roughness: 0.3 }, 0.28)),
    wallGrey: def('mcdWallGrey', () => std({ color: '#c3c2bd', roughness: 0.8 }, 0.22)),
    wainscot: def('mcdWainscot', () => std({ color: '#5b4c45', roughness: 0.6 }, 0.06)),
    blackMetal: def('mcdBlackMetal', () => std({ color: '#161719', roughness: 0.5, metalness: 0.4 })),
    cardboard: def('mcdCardboard', () => std({ color: '#c49a68', roughness: 0.9 }, 0.16)),
    blue: def('mcdBlue', () => std({ color: '#2f86d6', roughness: 0.35 }, 0.16)),
    redBin: def('mcdRedBin', () => std({ color: '#d0242c', roughness: 0.45 }, 0.16)),
    bun: def('mcdBun', () => std({ color: '#d9a25a', roughness: 0.7 }, 0.16)),
    cup: def('mcdCup', () => std({ color: '#f4f3ef', roughness: 0.5 }, 0.25)),
    kdecal: def('mcdKDecal', () => std({ map: MCT.katlas(), roughness: 0.55 }, 0.14)),
    kglow: def('mcdKGlow', () => { const t = MCT.katlas(); return new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.4 }); }),
  };
}
function buildMcD(I, scene) {
  const S = MCD_SPEC; const k = new Kit(I, S.x0, S.z0, 0);
  const W = S.x1 - S.x0, D = S.z1 - S.z0, H = S.H;
  const MT = mcdMaterials(); // textures / materials of the real store (see MCT above)
  const put = (mat, g) => { if (!k.parts.has(mat)) k.parts.set(mat, []); k.parts.get(mat).push(g); };
  // Layout like the real store: you walk in facing the counter (front lobby on the corridor's beige /
  // terracotta tiles, kitchen behind the counter, golden-arches pillar at its right end), and the long
  // dining room opens on the counter's LEFT. The numbers below are written in a "design frame" whose z
  // is mirrored into the shop (mz): design z 0..10.25 = dining = the north part of the shop.
  //   lobby   x 16.2..W   design z 10.4..D   door in the east glass front at design z 12.6..16.6
  //   counter x 15.2..16.2 design z 11.4..18.6 (customers on the east side), kitchen x 9.5..15.2 behind it
  //   dining  x 0.3..W    design z 0.3..10.25 (mural + banquette on the partition, striped wall at the far west end)
  //   x 0.3..9.3 / design z 10.4..D is back of house (closed)
  const DZ = 10.25, KX = 9.5, CX0 = 15.2, CX1 = 16.2, CZ0 = 11.4, CZ1 = 18.6, DOOR0 = 12.6, DOOR1 = 16.6;
  const mz = (z) => D - z; // design frame -> shop (mirror in z; planes are turned, not mirrored, so text still reads)
  const km = {
    box: (x0, x1, y0, y1, z0, z1, mat, o) => k.box(x0, x1, y0, y1, mz(z1), mz(z0), mat, o),
    wallRect: (x0, x1, z0, z1, y0, y1) => k.wallRect(x0, x1, mz(z1), mz(z0), y0, y1),
    plane: (tex, w, h, x, y, z, rotY = 0, o = {}) => k.plane(tex, w, h, x, y, mz(z), Math.PI - rotY, o),
  };
  // ---- shell ----
  km.box(0, W, 0, 0.1, 0, D, MT.floor, { col: false, surface: true, tile: [1.2, 1.2] });
  km.box(CX0 - 0.2, W, 0.1, 0.104, DZ + 0.15, D, MT.lobby, { col: false, tile: [2.4, 2.4] }); // corridor tiles up to the counter
  km.box(KX, CX0 + 1.0, 0.1, 0.106, DZ + 0.15, D, MT.quarry, { col: false, tile: [0.3, 0.3] }); // red 15 cm quarry tiles behind it
  km.box(0, 0.3, 0, H, 0, D, 'white');
  k.box(0, W, 0, H, 0, 0.3, 'white');
  k.box(0, W, 0, H, D - 0.3, D, 'winWall', { tile: [3.2, H] }); // outside face keeps the 活動中心 windows
  km.box(0.3, CX1, 0, H, DZ, DZ + 0.15, MT.wall);                 // dining / kitchen partition
  km.box(KX - 0.2, KX, 0, H, 11.55, D - 0.3, MT.wall);           // kitchen back wall (back of house beyond)
  km.box(KX - 0.2, KX, 2.25, H, DZ + 0.15, 11.55, MT.wall, { col: false }); // …with the doorway to the back corridor
  km.box(KX, CX1, 0, H - 0.1, D - 0.34, D - 0.3, MT.wall, { col: false }); // kitchen side of the north wall
  km.box(CX1, W - 0.15, 2.7, H, DZ, DZ + 0.15, MT.wall, { col: false }); // header over the dining opening
  km.box(W - 0.15, W, 0, 0.35, 0, D, MT.frame, { col: false });
  km.box(W - 0.15, W, 0, H, 0, DOOR0, 'glass'); km.box(W - 0.15, W, 0, H, DOOR1, D, 'glass');
  km.box(W - 0.15, W, 2.6, H, DOOR0, DOOR1, 'glass', { col: false });
  for (const z of [0, 5.2, DZ + 0.1, DOOR0, DOOR1, D]) km.box(W - 0.22, W + 0.04, 0, H, z - 0.08, z + 0.08, MT.frame, { col: false });
  km.box(W - 0.22, W + 0.04, 2.55, 2.65, DOOR0, DOOR1, MT.frame, { col: false }); // door transom
  // ---- outside: dark fascia with white "McDonald's" over the door, dark pillar with the golden arches ----
  km.box(-0.05, W + 0.4, H, H + 1.2, -0.05, D + 0.05, MT.fasciaBox, { col: false });
  km.plane(MCT.fascia(), 7.2, 1.0, W + 0.42, H + 0.6, (DOOR0 + DOOR1) / 2, Math.PI / 2, { emissive: 0.55 });
  km.box(W, W + 0.9, 0, H + 1.2, 0.05, 0.95, MT.pillar);
  km.plane(MCT.arches('#ffbc0d'), 0.8, 0.7, W + 0.91, 3.0, 0.5, Math.PI / 2, { emissive: 0.9, transparent: true });
  km.box(0, W, H + 1.2, S.top, 0, D, 'sac', { col: false });
  // ---- ceiling: white 60 cm grid; square downlights over the dining room, troffers over lobby and kitchen ----
  km.box(0, W, H - 0.1, H, 0, D, MT.ceil, { col: false, tile: [0.6, 0.6] });
  for (let x = 1.5; x < W - 0.5; x += 1.8) for (let z = 1.4; z < DZ - 0.4; z += 1.8) {
    if (Math.abs(z - 5.1) < 1.0 && x > 4.6 && x < 15.4) continue; // the pendants' cove
    km.box(x - 0.09, x + 0.09, H - 0.115, H - 0.1, z - 0.09, z + 0.09, 'light', { col: false });
  }
  km.box(4.4, 15.6, H - 0.35, H - 0.1, 3.7, 6.5, MT.wall, { col: false }); // cove frame over the communal table
  km.box(4.6, 15.4, H - 0.36, H - 0.35, 3.9, 6.3, MT.cove, { col: false });
  for (const [x, z] of [[18.6, 12.6], [21.6, 12.6], [18.6, 17.4], [21.6, 17.4], [11.0, 12.6], [11.0, 17.4]]) km.box(x - 0.6, x + 0.6, H - 0.115, H - 0.1, z - 0.3, z + 0.3, 'light', { col: false });
  for (const [x, z] of [[6.0, 1.6], [12.6, 8.8], [20.4, 6.6], [18.0, 15.0]]) km.box(x - 0.3, x + 0.3, H - 0.112, H - 0.1, z - 0.3, z + 0.3, MT.vent, { col: false });
  // dropped soffit over the counter with its own downlights, menu boards hanging under it
  km.box(13.6, 17.2, 3.35, H - 0.1, CZ0 - 0.4, CZ1 + 0.4, MT.wall, { col: false });
  for (let z = CZ0 + 0.2; z < CZ1; z += 1.2) km.box(16.55, 16.75, 3.335, 3.35, z - 0.1, z + 0.1, 'light', { col: false });
  for (let i = 0; i < 6; i++) {
    const z = CZ0 + 0.45 + i * 1.26;
    km.box(14.92, 15.0, 2.62, 3.3, z - 0.56, z + 0.56, MT.black, { col: false });
    km.plane(MCT.menu(i), 1.06, 0.6, 15.005, 2.96, z, Math.PI / 2, { emissive: 0.9 });
    km.box(14.94, 14.97, 3.3, 3.35, z - 0.02, z + 0.02, 'steel', { col: false });
  }
  // ---- counter: white body on a black plinth, pale top, grey M, POS terminals (customers on the east side) ----
  km.box(CX0 + 0.1, CX1 - 0.1, 0, 0.16, CZ0, CZ1, MT.black, { col: false });
  km.box(CX0, CX1, 0.16, 1.05, CZ0, CZ1, MT.counter);
  km.box(CX0 - 0.1, CX1 + 0.1, 1.05, 1.1, CZ0, CZ1, MT.top, { col: false });
  for (const z of [12.9, 17.1]) km.plane(MCT.arches('#8f9296'), 0.42, 0.36, CX1 + 0.005, 0.66, z, Math.PI / 2);
  for (const z of [12.6, 15.0, 17.4]) {
    km.box(15.62, 15.68, 1.1, 1.24, z - 0.04, z + 0.04, MT.black, { col: false });
    km.box(15.56, 15.62, 1.2, 1.46, z - 0.19, z + 0.19, MT.black, { col: false });
    km.plane(MCT.pos(), 0.34, 0.22, 15.555, 1.33, z, -Math.PI / 2, { emissive: 0.85 });
    km.plane(MCT.pos(), 0.16, 0.1, 15.625, 1.36, z, Math.PI / 2, { emissive: 0.85 });
  }
  // dark grey pillar with the golden arches at the counter's left end (as in the photo)
  km.box(CX1, CX1 + 0.8, 0, H - 0.1, CZ1 + 0.1, D - 0.3, MT.pillar);
  km.plane(MCT.arches('#ffbc0d'), 0.66, 0.58, CX1 + 0.805, 2.5, (CZ1 + 0.1 + D - 0.3) / 2, Math.PI / 2, { emissive: 0.9, transparent: true });
  km.box(CX1 + 0.8, W - 0.15, 0, H - 0.1, D - 0.34, D - 0.3, MT.oak, { col: false, tile: [1.2, H] });
  // ---- 內場: kitchen line + back corridor (buildMcKitchen) ----
  const kitchen = buildMcKitchen({ I, k, km, mz, put, MT, H, KX, DZ, D });
  // ---- dining room (design frame, mirrored into the north part of the shop). Looking in from the lobby:
  //      banquette under the mural on the left (outer wall), striped wall at the far end, four-seat tables and
  //      the Happy Meal column on the right (partition), yellow trash cabinets in the left foreground ----
  km.box(0.3, CX1, 0, H - 0.1, DZ - 0.04, DZ, MT.oak, { col: false, tile: [1.2, H] }); // partition, dining side
  km.plane(MCT.mural(), 12.4, 2.6, 9.5, 2.55, 0.32);
  km.box(15.7, W - 0.15, 0, H - 0.1, 0.3, 0.34, MT.oak, { col: false, tile: [1.2, H] });
  km.box(0.3, 3.3, 0, H - 0.1, 0.3, 0.34, MT.oak, { col: false, tile: [1.2, H] });
  km.box(3.0, 16.2, 0, 0.42, 0.34, 1.0, MT.oak, { col: false, tile: [1.2, 0.42] });
  km.box(3.0, 16.2, 0.42, 0.62, 0.34, 1.0, MT.bench, { col: false });
  km.box(3.0, 16.2, 0.62, 1.15, 0.34, 0.52, MT.bench, { col: false });
  km.wallRect(3.0, 16.2, 0.3, 1.0, 0, 1.15);
  km.plane(MCT.stripes(), DZ - 0.3, H - 0.1, 0.32, (H - 0.1) / 2, (DZ + 0.3) / 2, Math.PI / 2);
  // ---- furniture (merged per material) ----
  const place = (list, a, x, z) => list.map(g => g.clone().rotateY(Math.PI - a).translate(x, 0, mz(z)));
  const chairParts = (bar) => {
    const sy = bar ? 0.66 : 0.46, wood = [], metal = [];
    wood.push(new THREE.BoxGeometry(0.42, 0.03, 0.4).translate(0, sy, 0.02));
    wood.push(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10, 1, true, Math.PI - 0.5, 1.0).translate(0, sy + 0.36, 0.22));
    for (const [x, z] of [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.19], [0.18, 0.19]]) metal.push(new THREE.CylinderGeometry(0.011, 0.011, sy, 6).translate(x, sy / 2, z));
    for (const x of [-0.17, 0.17]) metal.push(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6).translate(x, sy + 0.21, -0.18));
    if (bar) for (const [w, d, x, z] of [[0.38, 0.02, 0, 0.19], [0.38, 0.02, 0, -0.16], [0.02, 0.35, 0.18, 0.015], [0.02, 0.35, -0.18, 0.015]]) metal.push(new THREE.BoxGeometry(w, 0.02, d).translate(x, 0.28, z));
    return { wood, metal };
  };
  const stoolParts = () => {
    const seat = [new THREE.BoxGeometry(0.36, 0.06, 0.34).translate(0, 0.72, 0)], metal = [];
    for (const [x, z] of [[-0.15, -0.14], [0.15, -0.14], [-0.15, 0.14], [0.15, 0.14]]) metal.push(new THREE.CylinderGeometry(0.011, 0.011, 0.69, 6).translate(x, 0.345, z));
    for (const [w, d, x, z] of [[0.32, 0.02, 0, 0.14], [0.32, 0.02, 0, -0.14], [0.02, 0.3, 0.15, 0], [0.02, 0.3, -0.15, 0]]) metal.push(new THREE.BoxGeometry(w, 0.02, d).translate(x, 0.26, z));
    return { seat, metal };
  };
  const BAR = chairParts(true), LOW = chairParts(false), STOOL = stoolParts();
  const chair = (P, a, x, z) => { for (const g of place(P.wood, a, x, z)) put(MT.walnut, g); for (const g of place(P.metal, a, x, z)) put('chrome', g); };
  const pedestal = (x, z, top, r = 0.2) => { put('chrome', new THREE.CylinderGeometry(0.035, 0.035, top, 10).translate(x, top / 2, mz(z))); put('chrome', new THREE.CylinderGeometry(r, r * 1.08, 0.025, 20).translate(x, 0.0125, mz(z))); };
  // oak high tables along the banquette, bentwood bar chairs opposite
  for (let i = 0; i < 7; i++) {
    const x = 4.0 + i * 1.7;
    km.box(x - 0.55, x + 0.55, 0.98, 1.02, 1.2, 1.9, MT.oakTop, { col: false }); km.wallRect(x - 0.55, x + 0.55, 1.2, 1.9, 0, 1.02);
    pedestal(x, 1.55, 0.98, 0.22);
    chair(BAR, Math.PI, x, 2.4);
  }
  // long stainless communal table under the drum pendants, black stools both sides
  km.box(5.0, 15.0, 0.98, 1.03, 4.65, 5.55, 'steel', { col: false }); km.wallRect(5.0, 15.0, 4.65, 5.55, 0, 1.03);
  for (const x of [6.0, 10.0, 14.0]) pedestal(x, 5.1, 0.98, 0.3);
  for (let i = 0; i < 11; i++) {
    const x = 5.55 + i * 0.87;
    for (const [z, a] of [[4.05, 0], [6.15, Math.PI]]) { for (const g of place(STOOL.seat, a, x, z)) put(MT.black, g); for (const g of place(STOOL.metal, a, x, z)) put('chrome', g); }
  }
  for (const x of [6.8, 10.0, 13.2]) {
    put(MT.lamp, new THREE.CylinderGeometry(0.46, 0.46, 0.52, 28).translate(x, 2.85, mz(5.1)));
    put('chrome', new THREE.CylinderGeometry(0.004, 0.004, H - 0.36 - 3.11, 4).translate(x, (H - 0.36 + 3.11) / 2, mz(5.1)));
  }
  // four-seat tables along the partition (the right-hand side as you look in)
  for (let i = 0; i < 5; i++) {
    const x = 3.5 + i * 2.7, z = 8.4;
    km.box(x - 0.4, x + 0.4, 0.72, 0.76, z - 0.4, z + 0.4, MT.oakTop, { col: false }); km.wallRect(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, 0.76);
    pedestal(x, z, 0.72, 0.24);
    chair(LOW, 0, x, z - 0.66); chair(LOW, Math.PI, x, z + 0.66);
  }
  // Happy Meal screen on an orange / red stripe column + yellow display box (partition, near the opening)
  km.plane(MCT.column(), 0.5, H - 0.1, 15.75, (H - 0.1) / 2, DZ - 0.045, Math.PI);
  km.box(15.4, 16.1, 1.55, 2.6, DZ - 0.17, DZ - 0.05, MT.black, { col: false });
  km.plane(MCT.kids(), 0.62, 0.95, 15.75, 2.075, DZ - 0.175, Math.PI, { emissive: 0.8 });
  km.box(15.35, 16.15, 0.9, 1.35, DZ - 0.36, DZ - 0.04, MT.yellow, { col: false });
  // oak pillar with a poster between the two dining openings (seen from the lobby)
  km.box(19.8, 20.6, 0, H - 0.1, DZ - 0.25, DZ + 0.4, MT.oak, { tile: [1.2, H] });
  km.plane(MCT.kids(), 0.5, 0.78, 20.605, 1.65, DZ + 0.075, Math.PI / 2, { emissive: 0.7 });
  // yellow trash / tray-return cabinets with the stick-figure panel (dining room, by the entrance)
  km.box(19.6, 22.0, 0, 1.12, 0.34, 0.95, MT.yellow); km.box(19.6, 22.0, 1.12, 1.5, 0.34, 0.6, MT.black, { col: false });
  km.box(19.6, 22.0, 1.5, 2.65, 0.34, 0.95, MT.yellow, { col: false });
  km.plane(MCT.bin('一般垃圾', '🗑', 'binA'), 0.9, 0.42, 21.4, 0.86, 0.955); km.plane(MCT.bin('資源回收', '♻', 'binB'), 0.9, 0.42, 20.2, 0.86, 0.955);
  km.plane(MCT.toss(), 2.2, 1.05, 20.8, 2.07, 0.955);
  // pole sign outside
  k.box(W + 4, W + 4.3, 0, 7, D + 1, D + 1.3, 'metal', { col: false });
  k.wallRect(W + 4, W + 4.3, D + 1, D + 1.3, 0, 7);
  const pole = k.plane(T.mcLogo(), 3.2, 1.6, W + 4.15, 7.6, D + 1.15, Math.PI / 2, { emissive: 0.5, double: true });
  k.finish(scene);
  I.zones.push({ name: '麥當勞 中原店', pts: k.rect(0, W, 0, D), y0: 0, y1: H, ceil: () => H - 0.4 });
  // crew in the real store's uniform (mcuniform.js): the counter girl at the middle register, and two in the
  // kitchen with hairnets — one on the first grill, one at the assembly island. They go through the motions
  // (reach / turn) while the player is close enough to see them.
  const staff = createCharacter({ skin: '#efd0b5', shirt: CREW_SHIRT, shorts: '#1b1b1d', pants: true, hair: '#1a1410', hairStyle: 'pony', face: true, shoes: '#222' });
  dressCrew(staff, { name: '小芸' });
  const sp = k.w(14.6, mz(15.0)); staff.root.position.set(sp[0], k.base, sp[1]); staff.root.rotation.y = k.heading(Math.PI / 2);
  staff.home = staff.root.position.clone(); staff.homeRot = staff.root.rotation.y; // the 值班 moves her to the fryers and back
  scene.add(staff.root);
  const crew = [
    [{ skin: '#d9ad88', hair: '#111', hairStyle: 'short' }, '阿凱', kitchen.crewGrill],
    [{ skin: '#f3d9c4', hair: '#2b1d14', hairStyle: 'pony' }, '佳穎', kitchen.crewAssembly],
  ].map(([look, name, [x, z]]) => {
    const c = createCharacter({ ...look, shirt: CREW_SHIRT, shorts: '#1b1b1d', pants: true, face: true, shoes: '#111' });
    dressCrew(c, { name, hairnet: true });
    const p = k.w(x, z); c.root.position.set(p[0], k.base, p[1]); c.root.rotation.y = k.heading(-Math.PI / 2);
    c.homeRot = c.root.rotation.y; c.workT = 1 + Math.random() * 2; c.reach = 0;
    scene.add(c.root); return c;
  });
  const mid = k.w(12, mz(15));
  I.updaters.push((dt, game) => {
    const pp = game?.player?.pos;
    if (pp && (pp.x - mid[0]) ** 2 + (pp.z - mid[1]) ** 2 > 70 * 70) return; // nobody is watching
    staff.update(dt, { speed: 0 });
    for (const c of crew) {
      if ((c.workT -= dt) <= 0) { c.workT = 1.6 + Math.random() * 2.6; c.reach = 0.7; c.turn = (Math.random() - 0.5) * 0.7; }
      c.reach -= dt;
      c.root.rotation.y += (c.homeRot + (c.reach > 0 ? c.turn : 0) - c.root.rotation.y) * Math.min(1, dt * 4);
      c.update(dt, { speed: 0, pose: c.reach > 0 ? 'give' : null });
    }
  });
  let ordered = false;
  const cp = k.w(17.0, mz(15.0));
  I.actions.push({
    x: cp[0], z: cp[1], r: 2.6, y: 0, label: () => '按 <kbd>E</kbd> 點餐', cond: () => !(I.mcd && I.mcd.busy),
    fn: (g) => {
      // 大麥克套餐 NT$155 (menu board price): earn more by working the counter (staff entrance behind it)
      if (g.money < 155) {
        g.dialog([['麥當勞店員', '歡迎光臨！大麥克套餐一份 155 元～'], ['彥霖', '（翻錢包）……只剩 ' + g.money + ' 元 😅'],
          ['麥當勞店員', '我們有在徵打工喔！從櫃檯旁邊繞到後面的員工入口，按 [[E|A]] 就能上班。']]);
        return;
      }
      g.spend(155, '麥當勞 大麥克套餐');
      g.dialog([
        ['麥當勞店員', '歡迎光臨麥當勞！請問要點什麼？'],
        ['彥霖', '一份大麥克套餐，飲料換可樂 🍔'],
        ['麥當勞店員', ordered ? '又來啦～選舉加油喔！' : '好的！欸你是那個資管系的候選人嗎？我室友是資管的，叫她投你！'],
      ], () => {
        g.hud.toast('🍔 大麥克套餐 get！體力回復', 'good', 2000); g.audio.pickup();
        if (!ordered) { ordered = true; g.addVotes(2, '店員的室友 +2 票'); }
        g.player.boost = 30;
      });
    },
  });
  // part-time job (值班, see mcshift.js): staff entrance through the gap at the counter's dining end, time
  // clock on the partition just inside; you work the middle register, the queue forms across the counter
  const se = k.w(14.4, mz(11.0));
  I.actions.push({
    x: se[0], z: se[1], r: 1.3, y: 0, cond: () => !(I.mcd && I.mcd.busy),
    label: () => '按 <kbd>E</kbd> 打卡上班：櫃台點餐（時薪 NT$196）',
    fn: (g) => g.job.start(),
  });
  // …or work the kitchen line (mckitchen.js): punch in at the second grill
  const kp = k.w(...kitchen.player);
  I.actions.push({
    x: kp[0], z: kp[1], r: 1.1, y: 0, cond: () => !(I.mcd && I.mcd.busy),
    label: () => '按 <kbd>E</kbd> 上內場：煎台＋炸爐（時薪 NT$196）',
    fn: (g) => g.job.startKitchen(),
  });
  const bulk = new THREE.Mesh(new THREE.BoxGeometry(1.0, H - 2.5, 1.0), M(MT.wall)); bulk.position.set(15.7, (H + 2.5) / 2, mz(10.9)); k.group.add(bulk); // header over the gap
  km.plane(T.mcStaff(), 0.96, 0.31, 16.21, 2.3, 10.9, Math.PI / 2, { emissive: 0.5 });
  const clockBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.1), M('dark')); clockBox.position.set(13.3, 1.45, mz(10.45)); k.group.add(clockBox);
  km.plane(T.sign('打卡鐘', '#ffc72c', '#1b1b1b', 'mcclock', 256, 128, 54), 0.46, 0.23, 13.3, 1.62, 10.505, 0);
  km.plane(T.sign('打工值班（櫃台／內場）→ 員工入口在櫃台左側', '#c8102e', '#ffffff', 'mcstaffway2', 1024, 128, 46), 1.0, 0.125, 16.205, 0.86, 12.0, Math.PI / 2, { emissive: 0.25 });
  return { entrance: k.w(W + 3, mz(14.6)), k, W, D, staff, crew, kitchen, busy: false };
}

// =====================================================================
// 麥當勞 內場 — the kitchen behind the counter and the back corridor, in buildMcD's design frame (km / mz).
// Laid out like a real McDonald's line, so it reads from the lobby over the counter:
//   front pass   x 13.15–13.8: drink tower, coffee machine, heat-lamp pass with bags and trays, KVS order
//                screens, ice-cream machine (all facing the register aisle x 13.8–15.2)
//   island       x 11.45–12.3: UHC holding cabinet + assembly rail (condiments, wrap papers)
//   cooking line x 9.5–10.4 on the black-tiled back wall under a stainless hood: 2 clamshell grills, bun
//                toaster, chicken fryer, fries fryer, fry dump under a heat lamp, hand sink
//   back corridor x 0.3–9.3, z 10.4–12.0 through a door in the back wall, after the photo 內場.jpg:
//                galvanised walk-in freezer / cooler with yellow labels, louvred steel doors, fire-alarm panel,
//                black shelf of syrup boxes with the delivery bag, water filter with blue hoses, red pedal bin,
//                white wall tiles, terracotta quarry floor, LED ceiling panels
// Small details are atlas pictures (KR) on quads merged into two meshes. Returns shop-local anchors for the
// crew and for the kitchen job (mckitchen.js), which animates the grill platen, baskets and food itself.
// =====================================================================
function buildMcKitchen({ I, k, km, mz, put, MT, H, KX, DZ, D }) {
  const box = (x0, x1, y0, y1, z0, z1, mat) => km.box(x0, x1, y0, y1, z0, z1, mat, { col: false });
  const solid = (x0, x1, z0, z1, y1 = 1.3) => km.wallRect(x0, x1, z0, z1, 0, y1);
  const cyl = (mat, rt, rb, h, x, y, z, seg = 12) => put(mat, new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, mz(z)));
  const barZ = (mat, r, len, x, y, z) => put(mat, new THREE.CylinderGeometry(r, r, len, 8).rotateX(Math.PI / 2).translate(x, y, mz(z)));
  const quad = (name, w, h, x, y, z, rotY, glow = false) => put(glow ? MT.kglow : MT.kdecal, atlasUV(new THREE.PlaneGeometry(w, h), name).rotateY(Math.PI - rotY).translate(x, y, mz(z)));
  // lying on a top surface: wz along z, dx along x
  const quadUp = (name, wz, dx, x, y, z, glow = false) => put(glow ? MT.kglow : MT.kdecal, atlasUV(new THREE.PlaneGeometry(wz, dx), name).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(x, y, mz(z)));
  const E = KX + 0.9; // front edge of the cooking line

  // ---------------- cooking line ----------------
  km.box(KX, KX + 0.02, 0.9, 2.08, 11.75, D - 0.35, MT.blackTile, { col: false, tile: [0.3, 0.3] }); // tiled splash
  solid(KX, E + 0.05, 11.8, D - 0.3);
  const cabinet = (z0, z1, top = 0.84) => {
    box(KX, E, 0.1, top, z0, z1, MT.kSteel); box(KX, E - 0.06, 0, 0.1, z0, z1, MT.kBlack); // body + recessed kick
    box(E, E + 0.006, 0.18, top - 0.08, z0 + 0.05, z1 - 0.05, MT.kSteelDk);                   // door panel
  };
  const grill = (z0, z1, raised) => {
    const m = (z0 + z1) / 2;
    cabinet(z0, z1);
    box(KX, E + 0.04, 0.84, 0.9, z0, z1, MT.kBlack);                 // griddle plate
    quadUp('grill', z1 - z0 - 0.08, 0.7, KX + 0.47, 0.902, m);
    box(E, E + 0.07, 0.8, 0.88, z0 + 0.02, z1 - 0.02, MT.kSteel);     // grease trough at the front
    box(KX, KX + 0.1, 0.9, 1.15, z0, z1, MT.kSteel);                  // hinge housing
    quad('hot', 0.24, 0.09, E + 0.009, 0.7, z0 + 0.24, Math.PI / 2);
    for (let i = 0; i < 3; i++) put('chrome', new THREE.CylinderGeometry(0.02, 0.02, 0.025, 10).rotateZ(Math.PI / 2).translate(E + 0.018, 0.7, mz(m + 0.08 + i * 0.16)));
    if (raised) { // clamshell platen standing open
      box(KX + 0.1, KX + 0.17, 0.95, 1.58, z0 + 0.05, z1 - 0.05, MT.kSteel);
      box(KX + 0.17, KX + 0.175, 1.0, 1.54, z0 + 0.1, z1 - 0.1, MT.kBlack);
      barZ('chrome', 0.012, z1 - z0 - 0.3, KX + 0.21, 1.52, m);
    }
  };
  grill(11.9, 13.3, true); grill(13.4, 14.8, false); // the second grill's platen belongs to mckitchen.js
  // vertical bun toaster + a tray of buns
  cabinet(14.9, 15.5, 0.88); box(KX, E + 0.02, 0.88, 0.92, 14.9, 15.5, MT.kSteel);
  box(KX + 0.04, KX + 0.5, 0.92, 1.62, 14.95, 15.45, MT.kSteelDk);
  quad('toaster', 0.42, 0.3, KX + 0.502, 1.36, 15.2, Math.PI / 2, true);
  box(KX + 0.55, E - 0.02, 0.92, 0.95, 14.95, 15.45, MT.tray);
  for (let i = 0; i < 6; i++) put(MT.bun, new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(KX + 0.62 + (i % 2) * 0.13, 0.95, mz(15.03 + Math.floor(i / 2) * 0.16)));
  // fryers: two vats each, control tower at the back, basket hanger
  const fryer = (z0, z1) => {
    const m = (z0 + z1) / 2, x0 = KX + 0.22, x1 = E - 0.08;
    cabinet(z0, z1, 0.8);
    box(KX, x0, 0.8, 1.34, z0, z1, MT.kSteel);
    quad('fryPanel', 0.5, 0.25, x0 + 0.002, 1.14, m, Math.PI / 2, true);
    box(x1, E, 0.8, 0.9, z0, z1, MT.kSteel);
    for (const zz of [z0, m - 0.02, z1 - 0.04]) box(x0, x1, 0.8, 0.9, zz, zz + 0.04, MT.kSteel);
    for (const [a, b] of [[z0 + 0.04, m - 0.02], [m + 0.02, z1 - 0.04]]) quadUp('oil', b - a, x1 - x0, (x0 + x1) / 2, 0.85, (a + b) / 2);
    barZ('chrome', 0.01, z1 - z0 - 0.1, KX + 0.18, 1.38, m);
    quad('hot', 0.24, 0.09, E + 0.009, 0.62, z0 + 0.24, Math.PI / 2);
  };
  fryer(15.6, 16.8); fryer(16.9, 18.1);
  // fry dump station under a heat lamp, with red fry cartons
  cabinet(18.2, 19.0, 0.86);
  box(KX + 0.06, E - 0.04, 0.86, 0.9, 18.25, 18.95, MT.kSteelDk);
  quadUp('fries', 0.66, 0.6, KX + 0.45, 0.902, 18.6);
  box(KX, KX + 0.06, 0.9, 1.56, 18.2, 19.0, MT.kSteel);
  box(KX, E, 1.56, 1.62, 18.2, 19.0, MT.kSteel); box(KX + 0.12, E - 0.12, 1.55, 1.56, 18.3, 18.9, MT.warm);
  for (let i = 0; i < 3; i++) { box(E - 0.13, E - 0.02, 0.9, 1.02, 18.3 + i * 0.2, 18.42 + i * 0.2, '#db0007'); quad('carton', 0.1, 0.1, E - 0.018, 0.96, 18.36 + i * 0.2, Math.PI / 2); }
  // hand sink + SOP poster at the end of the line
  box(KX, KX + 0.4, 0.3, 0.78, 19.15, 19.55, MT.kSteel); box(KX, KX + 0.5, 0.78, 0.9, 19.1, 19.6, MT.kSteel);
  box(KX + 0.05, KX + 0.45, 0.9, 0.902, 19.15, 19.55, MT.kSteelDk);
  cyl('chrome', 0.012, 0.012, 0.26, KX + 0.07, 1.03, 19.35); put('chrome', new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8).rotateZ(Math.PI / 2).translate(KX + 0.15, 1.15, mz(19.35)));
  quad('sop', 0.32, 0.4, KX + 0.025, 1.45, 19.35, Math.PI / 2);
  // stainless hood over the line with lamps and filters, duct to the ceiling
  box(KX, E + 0.35, 2.08, 2.7, 11.8, 18.3, MT.kSteel);
  box(KX + 0.02, E + 0.3, 2.04, 2.08, 11.85, 18.25, MT.kSteelDk);
  for (const z of [12.6, 14.1, 16.2, 17.5]) box(E - 0.05, E + 0.25, 2.035, 2.04, z - 0.28, z + 0.28, 'light');
  box(KX, KX + 0.7, 2.7, H - 0.1, 14.6, 15.6, MT.kSteel);

  // ---------------- assembly island with the UHC ----------------
  const IX0 = 11.45, IX1 = 12.3;
  box(IX0, IX1, 0.1, 0.88, 12.4, 17.6, MT.kSteel); box(IX0 + 0.06, IX1 - 0.06, 0, 0.1, 12.45, 17.55, MT.kBlack);
  box(IX0 - 0.02, IX1 + 0.02, 0.88, 0.92, 12.38, 17.62, MT.kSteel);
  for (const x of [IX0 - 0.006, IX1]) box(x, x + 0.006, 0.18, 0.78, 12.5, 17.5, MT.kSteelDk);
  solid(IX0, IX1, 12.4, 17.6);
  box(IX0 + 0.06, IX1 - 0.06, 0.92, 1.66, 12.9, 15.2, MT.kSteelDk);
  box(IX0 + 0.04, IX1 - 0.04, 1.66, 1.7, 12.88, 15.22, MT.kSteel);
  quad('uhc', 2.2, 0.68, IX0 + 0.055, 1.29, 14.05, -Math.PI / 2); quad('uhc', 2.2, 0.68, IX1 - 0.055, 1.29, 14.05, Math.PI / 2);
  box(IX0 + 0.28, IX0 + 0.58, 0.92, 1.0, 15.5, 17.4, MT.kSteel); // condiment rail
  ['#7fb24a', '#f1eee4', '#3f6b2a', '#ffcc33', '#e9d8b4', '#c0392b'].forEach((c, i) => box(IX0 + 0.31, IX0 + 0.55, 1.0, 1.005, 15.55 + i * 0.3, 15.8 + i * 0.3, c));
  quadUp('wrap', 0.5, 0.2, IX1 - 0.13, 0.925, 16.0);
  for (let i = 0; i < 4; i++) box(IX0 + 0.06, IX0 + 0.2, 0.92, 0.98, 15.6 + i * 0.4, 15.74 + i * 0.4, i % 2 ? '#2b6cb0' : '#f2c230');

  // ---------------- front pass (behind the registers) ----------------
  const PX0 = 13.15, PX1 = 13.8;
  box(PX0, PX1, 0.1, 0.9, 11.7, 18.6, MT.kSteel); box(PX0 + 0.06, PX1 - 0.06, 0, 0.1, 11.75, 18.55, MT.kBlack);
  box(PX1, PX1 + 0.006, 0.18, 0.8, 11.8, 18.5, MT.kSteelDk);
  box(PX0 - 0.02, PX1 + 0.02, 0.9, 0.94, 11.68, 18.62, MT.kSteel);
  solid(PX0, PX1, 11.7, 18.6);
  // drink tower: six taps, drip tray, cup stacks on top
  box(PX0 + 0.05, PX1 - 0.05, 0.94, 1.78, 11.8, 13.1, MT.kSteel);
  quad('drink', 1.2, 0.6, PX1 - 0.045, 1.48, 12.45, Math.PI / 2);
  for (let i = 0; i < 6; i++) cyl('chrome', 0.014, 0.01, 0.07, PX1 - 0.09, 1.22, 11.95 + i * 0.2, 8);
  box(PX1 - 0.25, PX1 - 0.02, 0.94, 0.97, 11.85, 13.05, MT.kBlack);
  for (let i = 0; i < 3; i++) cyl(MT.cup, 0.045, 0.035, 0.3, PX0 + 0.2, 1.93, 11.98 + i * 0.2, 14);
  // coffee machine
  box(PX0 + 0.05, PX1 - 0.08, 0.94, 1.6, 13.2, 13.72, MT.kBlack);
  quad('coffee', 0.44, 0.33, PX1 - 0.078, 1.32, 13.46, Math.PI / 2, true);
  // heat-lamp pass: bags, trays and wrapped burgers waiting to go out
  box(PX0, PX1, 1.52, 1.57, 13.85, 16.8, MT.kSteel);
  for (const z of [13.85, 16.75]) box(PX0, PX0 + 0.05, 0.94, 1.52, z, z + 0.05, MT.kSteel);
  box(PX0 + 0.1, PX1 - 0.1, 1.515, 1.52, 13.95, 16.7, MT.warm);
  for (let i = 0; i < 3; i++) { const z = 14.05 + i * 0.45; box(PX0 + 0.2, PX0 + 0.42, 0.94, 1.24, z, z + 0.14, MT.cardboard); quad('bag', 0.14, 0.21, PX0 + 0.422, 1.1, z + 0.07, Math.PI / 2); }
  for (const z of [15.5, 16.1]) {
    box(PX0 + 0.12, PX1 - 0.06, 0.94, 0.955, z, z + 0.45, MT.tray);
    box(PX0 + 0.2, PX0 + 0.32, 0.955, 1.01, z + 0.06, z + 0.18, '#f2c230'); box(PX0 + 0.4, PX0 + 0.5, 0.955, 1.07, z + 0.22, z + 0.32, '#db0007');
  }
  // KVS order screens hanging over the pass
  for (const [z, n] of [[14.45, 'kvs'], [16.1, 'kvs2']]) {
    box(PX0 + 0.26, PX0 + 0.32, 1.76, 2.2, z - 0.36, z + 0.36, MT.kBlack);
    quad(n, 0.66, 0.41, PX0 + 0.322, 1.98, z, Math.PI / 2, true);
    for (const dz of [-0.25, 0.25]) cyl('chrome', 0.008, 0.008, H - 0.1 - 2.2, PX0 + 0.29, (H - 0.1 + 2.2) / 2, z + dz, 6);
  }
  // ice-cream machine, cups and lids, tray stack
  box(PX0 + 0.05, PX1 - 0.05, 0.94, 1.8, 16.95, 17.65, MT.kSteel);
  quad('icecream', 0.6, 0.6, PX1 - 0.045, 1.4, 17.3, Math.PI / 2);
  for (let i = 0; i < 4; i++) cyl(MT.cup, 0.045, 0.035, 0.32, PX0 + 0.25 + (i % 2) * 0.14, 1.1, 17.9 + Math.floor(i / 2) * 0.2, 14);
  for (let n = 0; n < 5; n++) box(PX0 + 0.1, PX1 - 0.1, 0.94 + n * 0.02, 0.955 + n * 0.02, 18.2, 18.55, MT.tray);
  // whiteboard of the day's prep on the partition, steel frame round the back door
  quad('board', 1.1, 0.69, 11.6, 1.75, DZ + 0.155, 0);
  box(KX - 0.22, KX + 0.02, 0, 2.28, 11.5, 11.58, MT.kSteel); box(KX - 0.22, KX + 0.02, 2.2, 2.28, DZ + 0.15, 11.58, MT.kSteel);

  // ---------------- back corridor (photo 內場.jpg) ----------------
  const NZ = DZ + 0.15, CZ = 12.0, BX = KX - 0.2; // corridor z NZ..CZ, x 0.3..BX
  km.box(0.3, KX, 0.1, 0.106, NZ, CZ, MT.quarry, { col: false, tile: [0.3, 0.3] });
  km.box(0.3, BX, 2.75, 2.8, NZ, CZ + 0.12, MT.ceil, { col: false, tile: [0.6, 0.6] });
  for (const x of [1.6, 4.6, 7.6]) box(x - 0.6, x + 0.6, 2.735, 2.75, 10.9, 11.5, 'light');
  box(3.0, 3.6, 2.74, 2.75, 11.05, 11.35, MT.vent);
  km.box(0.3, BX, 0, 2.8, CZ, CZ + 0.12, MT.wallGrey); // walk-in side (collides)
  // louvred stainless door to the crew room
  box(0.75, 1.75, 0, 2.15, CZ - 0.035, CZ, MT.kSteel);
  quad('louver', 0.7, 0.42, 1.25, 1.78, CZ - 0.037, Math.PI);
  box(0.9, 1.6, 0.98, 1.02, CZ - 0.08, CZ - 0.035, 'chrome');
  box(0.7, 1.8, 2.15, 2.22, CZ - 0.045, CZ, MT.kSteel); for (const x of [0.7, 1.75]) box(x, x + 0.05, 0, 2.15, CZ - 0.045, CZ, MT.kSteel);
  quad('staffRoom', 0.84, 0.21, 1.25, 2.42, CZ - 0.005, Math.PI);
  // grey wall with a dark wainscot, fire-alarm panel and network boxes
  box(1.8, 3.0, 0, 1.05, CZ - 0.02, CZ, MT.wainscot);
  box(2.12, 2.6, 1.2, 1.78, CZ - 0.1, CZ, '#efe9d8'); quad('fire', 0.46, 0.56, 2.36, 1.49, CZ - 0.102, Math.PI);
  box(2.15, 2.55, 2.0, 2.5, CZ - 0.09, CZ, '#e8e8e4'); quad('net', 0.26, 0.4, 2.35, 2.25, CZ - 0.092, Math.PI);
  box(2.62, 2.85, 2.1, 2.4, CZ - 0.06, CZ, '#f4f4f0');
  // walk-in freezer + cooler: galvanised panels, white bump rails, two doors with yellow labels and thermometers
  km.box(3.0, BX, 0, 2.75, CZ - 0.08, CZ, MT.galv, { col: false, tile: [1.2, 2.75] });
  for (const y of [0.42, 0.92]) box(3.0, BX - 0.05, y, y + 0.06, CZ - 0.13, CZ - 0.08, MT.cup);
  for (const [x0, lbl] of [[3.7, 'freeze'], [6.3, 'cold']]) {
    box(x0, x0 + 0.95, 0.04, 2.05, CZ - 0.15, CZ - 0.08, MT.galv);
    box(x0 + 0.78, x0 + 0.84, 1.0, 1.25, CZ - 0.21, CZ - 0.15, 'chrome');
    for (const y of [0.35, 1.7]) box(x0 - 0.03, x0 + 0.06, y, y + 0.14, CZ - 0.18, CZ - 0.08, MT.kSteelDk);
    quad(lbl, 0.32, 0.12, x0 + 0.47, 1.62, CZ - 0.152, Math.PI);
    box(x0 + 0.3, x0 + 0.62, 1.82, 1.98, CZ - 0.17, CZ - 0.15, MT.kBlack); quad('fryPanel', 0.3, 0.15, x0 + 0.46, 1.9, CZ - 0.172, Math.PI, true);
  }
  cyl('#141414', 0.03, 0.03, 1.8, 8.05, 0.9, CZ - 0.2, 8); // black hose down the cooler wall
  box(8.35, 8.8, 0, 0.72, CZ - 0.48, CZ - 0.1, MT.redBin); box(8.33, 8.82, 0.72, 0.78, CZ - 0.5, CZ - 0.09, '#a8141c');
  solid(8.35, 8.8, CZ - 0.5, CZ, 0.8);
  // partition side: white tiles, water filter with blue hoses, drain mat
  km.box(0.3, BX, 0, 2.0, NZ, NZ + 0.015, MT.whiteTile, { col: false, tile: [0.6, 0.6] });
  for (const x of [0.75, 1.0]) cyl(MT.cup, 0.055, 0.055, 0.5, x, 1.55, NZ + 0.09, 14);
  put(MT.blue, new THREE.CylinderGeometry(0.13, 0.13, 0.34, 18).rotateZ(Math.PI / 2).translate(0.88, 2.25, mz(NZ + 0.16)));
  for (const x of [0.62, 1.13, 1.2]) cyl(MT.blue, 0.012, 0.012, 2.1, x, 1.05, NZ + 0.05, 6);
  quadUp('drain', 0.55, 0.9, 1.0, 0.112, NZ + 0.4);
  // black shelf with bag-in-box syrup and the delivery bag; wire shelf with stock
  const shelf = (x0, x1, mat, levels) => {
    for (const x of [x0, x1 - 0.03]) for (const z of [NZ + 0.02, NZ + 0.5]) box(x, x + 0.03, 0, 1.8, z, z + 0.03, mat);
    for (const y of levels) box(x0, x1, y, y + 0.025, NZ + 0.02, NZ + 0.53, mat);
    solid(x0, x1, NZ, NZ + 0.55, 1.8);
  };
  shelf(1.6, 2.6, MT.blackMetal, [0.12, 0.62, 1.78]);
  for (const [x, y, n] of [[1.63, 0.145, 'syrupA'], [2.1, 0.145, 'syrupB'], [1.63, 0.645, 'syrupA']]) { box(x, x + 0.45, y, y + 0.34, NZ + 0.08, NZ + 0.48, MT.cardboard); quad(n, 0.45, 0.3, x + 0.225, y + 0.17, NZ + 0.482, 0); }
  box(1.62, 2.58, 1.805, 2.25, NZ + 0.05, NZ + 0.52, '#1c1d20');
  shelf(3.3, 4.5, 'chrome', [0.15, 0.7, 1.25, 1.78]);
  for (const [x, y] of [[3.35, 0.175], [3.9, 0.175], [3.35, 0.725], [3.95, 1.275]]) box(x, x + 0.5, y, y + 0.3, NZ + 0.07, NZ + 0.47, MT.cardboard);
  // yellow 小心地滑 A-frame in the middle of the corridor
  const zc = mz(NZ + 0.95);
  for (const s of [-1, 1]) {
    put(MT.yellow, new THREE.BoxGeometry(0.32, 0.62, 0.014).translate(0, 0.31, 0).rotateX(-0.16 * s).translate(5.4, 0.106, zc + 0.1 * s));
    put(MT.kdecal, atlasUV(new THREE.PlaneGeometry(0.28, 0.35), 'caution').rotateY(s > 0 ? 0 : Math.PI).translate(0, 0.38, 0.009 * s).rotateX(-0.16 * s).translate(5.4, 0.106, zc + 0.1 * s));
  }
  // end wall: white tiles and the steel back door (deliveries)
  km.box(0.3, 0.315, 0, 2.0, NZ, CZ, MT.whiteTile, { col: false, tile: [0.6, 0.6] });
  box(0.3, 0.34, 0, 2.15, 10.55, 11.55, MT.kSteel);
  quad('louver', 0.7, 0.42, 0.342, 1.78, 11.05, Math.PI / 2);
  box(0.34, 0.38, 0.98, 1.02, 10.7, 11.4, 'chrome');
  quad('backDoor', 0.84, 0.21, 0.32, 2.42, 11.05, Math.PI / 2);
  // low ceiling in the corridor: keep the follow camera under it (zones are matched first come, first served)
  I.zones.push({ name: '麥當勞 中原店', pts: k.rect(0.3, KX, mz(CZ), mz(NZ)), y0: 0, y1: 2.8, ceil: () => 2.5 });

  const at = (x, z) => [x, mz(z)];
  return {
    grill: { hinge: at(KX + 0.13, 14.1), hingeY: 0.95, len: 1.3, patties: [[KX + 0.32, 13.78], [KX + 0.6, 13.78], [KX + 0.32, 14.42], [KX + 0.6, 14.42]].map(([x, z]) => at(x, z)), top: 0.902 },
    fryers: { chick: [15.91, 16.49].map(z => at(KX + 0.52, z)), fries: [17.21, 17.79].map(z => at(KX + 0.52, z)), oil: 0.85 },
    kvs: [E + 0.37, 1.84, mz(14.45)],
    player: at(E + 0.5, 15.55),
    cam: [E + 2.3, 2.5, mz(16.0)], look: [KX + 0.35, 0.95, mz(15.5)],
    crewGrill: at(E + 0.5, 12.6), crewAssembly: at(12.72, 16.4), fryStaff: at(E + 0.5, 17.5),
  };
}

// =====================================================================
// 警衛室 (main gate on 中北路, side gate on 新中北路 by the activity centre): enterable, sit and stand guard; the side gate runs the 門禁 quest
// (the main gate's booth is the glass kiosk of buildMainKiosk below: kiosk = MAIN_GATE)
// =====================================================================
function buildGuardhouse(I, scene, x, z, ang, name, gateOpt = null, lanes = null, kiosk = null) {
  const k = new Kit(I, x, z, ang);
  const W = 3.4, D = 2.8, H = 2.8;
  const booth = kiosk ? buildMainKiosk(k) : { seat: [1.72, 1.38], face: Math.PI, y0: 0, y1: H, pts: [[0, 0], [W, 0], [W, D], [0, D]] };
  if (!kiosk) {
    k.box(0, W, 0, 0.1, 0, D, 'floor', { col: false, surface: true });
    // lower walls
    k.box(0, W, 0, 1.0, 0, 0.12, 'white'); k.box(0, 0.12, 0, 1.0, 0, D, 'white'); k.box(W - 0.12, W, 0, 1.0, 0, D, 'white');
    k.box(1.2, W, 0, 1.0, D - 0.12, D, 'white'); k.box(0, 0.25, 0, 1.0, D - 0.12, D, 'white');
    // glass band + door opening (front, x 0.25..1.2)
    k.box(0, W, 1.0, 2.3, 0, 0.08, 'glass'); k.box(0, 0.08, 1.0, 2.3, 0, D, 'glass'); k.box(W - 0.08, W, 1.0, 2.3, 0, D, 'glass');
    k.box(1.2, W, 1.0, 2.3, D - 0.08, D, 'glass'); k.box(0, 0.25, 1.0, 2.3, D - 0.08, D, 'glass');
    k.box(0, W, 2.3, H, 0, 0.12, 'white', { col: false }); k.box(0, 0.12, 2.3, H, 0, D, 'white', { col: false }); k.box(W - 0.12, W, 2.3, H, 0, D, 'white', { col: false });
    k.box(0, W, 2.3, H, D - 0.12, D, 'white', { col: false });
    k.box(-0.5, W + 0.5, H, H + 0.22, -0.5, D + 0.5, 'gray', { col: false });
    for (const [px, pz] of [[0, 0], [W, 0], [0, D], [W, D]]) k.box(px - 0.06, px + 0.06, 0, H, pz - 0.06, pz + 0.06, 'metal', { col: false });
    k.plane(T.sign('警衛室', '#1f3b73', '#ffffff', 'guard', 256, 96, 60), 1.5, 0.55, W / 2, H - 0.25, D + 0.02);
    // desk with monitor & phone, chair
    k.box(0.15, W - 0.15, 0.75, 0.8, 0.15, 0.75, 'desk'); k.wallRect(0.15, W - 0.15, 0.15, 0.75, 0, 0.8);
    k.box(1.4, 2.0, 0.8, 1.2, 0.25, 0.3, 'dark', { col: false });
    k.plane(T.cctv(), 0.56, 0.36, 1.7, 1.0, 0.31, 0, { emissive: 0.8 });
    k.box(2.4, 2.65, 0.8, 0.86, 0.3, 0.5, 'dark', { col: false });
    k.box(1.5, 1.95, 0.45, 0.5, 1.15, 1.6, 'dark', { col: false }); k.box(1.5, 1.95, 0.5, 1.0, 1.58, 1.62, 'dark', { col: false });
    k.box(1.68, 1.77, 0, 0.45, 1.33, 1.42, 'metal', { col: false });
  }
  // boom barriers. Each one pivots on a post next to the booth and points straight across its lane
  // (local -z or +z: the booth's x axis runs along the road). Rz lifts the bar, Ry turns it across.
  const barCv = ctex('bar', 128, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : '#d0151f'; g.fillRect(i * 16, 0, 16, 16); } }, true);
  const barMat = new THREE.MeshStandardMaterial({ map: barCv }); barCv.repeat.set(3, 1);
  const hinges = [];
  const boom = (lx, lz, dir, L, o = {}) => {
    const arm = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), M(o.post || 'gray')); post.position.set(0, 0.55, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, 0.1), barMat); bar.position.set(L / 2, 0, 0);
    const hinge = new THREE.Group(); hinge.position.set(0, 1.0, 0); hinge.add(bar); hinge.rotation.y = dir < 0 ? Math.PI / 2 : -Math.PI / 2;
    // warning signs hanging under the bar, readable from both sides (正門: 減速慢行, 20)
    (o.signs || []).forEach((t, i) => {
      const round = t === '20', sw = round ? 0.42 : 0.7, sh = round ? 0.42 : 0.26;
      const g = mergeGeometries([0, Math.PI].map(side => new THREE.PlaneGeometry(sw, sh).rotateY(side).translate(0, 0, side ? -0.056 : 0.056)), false);
      const m = new THREE.Mesh(g, gateSignMat(t)); m.position.set(L * (0.45 + i * 0.22), -0.05 - sh / 2, 0); hinge.add(m);
    });
    arm.add(post, hinge); arm.position.set(lx, 0, lz); k.group.add(arm);
    hinges.push({ hinge, at: k.w(lx, lz + dir * L / 2) });
  };
  let hingeLX = W + 0.7;
  if (gateOpt) {
    // side gates: local z < 0 is the road (booth front faces it); one boom across the whole lane
    const off = gateOpt.off, rw = gateOpt.roadW;
    boom(hingeLX, -0.55, -1, rw + 1.9);
    // gate posts either side of the road + arched sign
    const gx = W + 2.2, zNear = -0.25, zFar = -(off + rw / 2 + 0.6);
    k.box(gx - 0.35, gx + 0.35, 0, 4.6, zNear - 0.7, zNear, 'white'); k.box(gx - 0.35, gx + 0.35, 0, 4.6, zFar, zFar + 0.7, 'white');
    k.box(gx - 0.4, gx + 0.4, 4.6, 4.75, zNear - 0.75, zNear + 0.05, 'gray', { col: false }); k.box(gx - 0.4, gx + 0.4, 4.6, 4.75, zFar - 0.05, zFar + 0.75, 'gray', { col: false });
    k.box(gx - 0.25, gx + 0.25, 4.0, 4.7, zFar + 0.35, zNear - 0.35, 'gray', { col: false });
    const label = gateOpt.sign || '中原大學 側門';
    const sg = T.sign(label, '#1f3b73', '#ffffff', 'gate' + label, 512, 96, 54), span = zNear - zFar - 0.9;
    k.plane(sg, span, 0.62, gx + 0.26, 4.35, (zNear + zFar) / 2, Math.PI / 2);
    k.plane(sg, span, 0.62, gx - 0.26, 4.35, (zNear + zFar) / 2, -Math.PI / 2);
  } else if (lanes) {
    // main gate: the booth sits on the island between the in and out lanes -> one boom across each
    for (const ln of lanes) boom(ln.x ?? (ln.dir < 0 ? W + 0.5 : -0.5), ln.from, ln.dir, ln.len, ln);
  } else boom(W + 0.8, D + 0.8, 1, 5);
  k.finish(scene);
  I.zones.push({ name, pts: booth.pts.map(([px, pz]) => k.w(px, pz)), y0: booth.y0, y1: booth.y1, ceil: () => booth.y1 - 0.3 });
  const seat = k.w(...booth.seat);
  let duty = 0, dutyVotes = 0;
  I.actions.push({
    x: seat[0], z: seat[1], r: 1.1, y: booth.y0,
    label: (g) => g.player.seat ? '按 <kbd>E</kbd> 起身' : gateOpt?.quest ? '按 <kbd>E</kbd> 坐下值班：🚧 新中北路側門門禁「別讓怪人進來」' : '按 <kbd>E</kbd> 坐下值班',
    fn: (g) => {
      if (g.player.seat) { g.player.standUp(); g.hud.toast('下班囉', 'good', 1000); return; }
      if (gate && g.gate) { g.player.sitAt(seat[0], seat[1], k.heading(Math.PI)); g.gate.start(gate); return; }
      g.player.sitAt(seat[0], seat[1], k.heading(booth.face)); // face the desk/window (-z local; the kiosk: -x)
      g.hud.toast('👮 值班中…同學經過會跟你打招呼', 'good', 2200);
    },
  });
  const gate = gateOpt?.quest ? (I.gates = I.gates || {})[name] = { k, W, D, off: gateOpt.off, roadW: gateOpt.roadW, barX: hingeLX, seat, forceOpen: false, name } : null;
  I.updaters.push((dt, g) => {
    // a barrier opens when the player drives up to it (or the guard lets a visitor through)
    const p = g.player.worldPos();
    for (const h of hinges) {
      const near = (Math.hypot(p.x - h.at[0], p.z - h.at[1]) < 10 && g.player.vehicle) || gate?.forceOpen;
      h.hinge.rotation.z += ((near ? 1.4 : 0) - h.hinge.rotation.z) * Math.min(1, dt * 4);
      if (near !== (h.hinge.userData.up ?? near)) g.audio.barrier(near, h.at[0], h.at[1]); h.hinge.userData.up = near;
    }
    if (gate) return; // the side gate's seat runs the gate-check mission instead of idle duty votes
    if (g.player.seat && Math.hypot(g.player.seat.x - seat[0], g.player.seat.z - seat[1]) < 0.1) {
      duty += dt;
      if (duty > 10 && dutyVotes < 8) { duty = 0; dutyVotes++; g.addVotes(1, ['同學：警衛彥霖辛苦了！ +1 票', '同學：怎麼是候選人在值班 XD +1 票', '教官：年輕人很認真喔 +1 票'][dutyVotes % 3]); }
    }
  });
}

// =====================================================================
// 孫師傅牛肉拉麵 (中北路 52 號) and 彥霖以前住的地方 on its 2F. Replaces the 補建街區 town house
// f899 that the shop sign used to hang on. 1F: noodle shop behind glass (not enterable) and, on its
// right, the small side door to a straight stair. At the top of the stair the room door is on the
// right; the room is modelled on the user's photo, seen from that door: wardrobe on the left wall,
// bed with the mattress standing against the back wall, window AC, pink floral curtains over the
// street window with a black table under it, and the bathroom on the near right.
// The terrain is NOT flattened here (the town row around it keeps its slope); floors are levelled
// by giving the walkable surfaces the building's base height minus the local ground (see surf()).
// =====================================================================
// k: the whole house is built 1.35x (roomier rooms, stair and corridor); W is in local units (5.8 m wide),
// D in metres (the depth of the plot stays 16 m). It takes the first 1.5 m of the town house next door (f900, trimmed in main.js).
export const YH_SPEC = { id: 'f899', next: 'f900', ox: -566.8, oz: 221.9, ang: Math.atan2(-1.6, 4.0), W: 4.31, D: 16.03, k: 1.35, NF: 4 };
export function yhFootprint() {
  const { ox, oz, ang, W, D, k } = YH_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(0, -1.2), w(W * k, -1.2), w(W * k, D), w(0, D)]; // + the pavement in front of the doors
}
// the house's outline on the ground (for the maps)
export function yhOutline() {
  const { ox, oz, ang, W, D, k } = YH_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(0, 0), w(W * k, 0), w(W * k, D), w(0, D)];
}
const YHT = {
  facade: () => ctex('yhFacade', 128, 128, (g) => { // 2 cm mosaic tiles of a 透天 facade
    g.fillStyle = '#cbc6bc'; g.fillRect(0, 0, 128, 128); const r = lcg(3);
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) { const v = 226 + (r() * 16 | 0); g.fillStyle = `rgb(${v},${v - 2},${v - 8})`; g.fillRect(x + 1, y + 1, 7, 7); }
  }),
  tile: () => ctex('yhTile', 128, 128, (g) => { // 60 cm white floor tiles
    g.fillStyle = '#eceae4'; g.fillRect(0, 0, 128, 128); const r = lcg(7);
    for (let i = 0; i < 240; i++) { g.fillStyle = `rgba(150,150,140,${0.04 + r() * 0.06})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 5, 2 + r() * 5); }
    g.fillStyle = '#c4c2bb'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128);
  }),
  ceil: () => ctex('yhCeil', 128, 128, (g) => { // embossed lay-in panels in a black T-bar grid
    g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2;
    for (let y = 8; y < 128; y += 16) for (let x = 8 + ((y - 8) / 16 % 2) * 8; x < 128; x += 16) { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.stroke(); }
    g.fillStyle = '#232326'; g.fillRect(0, 0, 128, 4); g.fillRect(0, 0, 4, 128);
  }),
  pine: () => ctex('yhPine', 256, 256, (g) => { // knotty pine (wardrobe, bed)
    g.fillStyle = '#d6a15a'; g.fillRect(0, 0, 256, 256); const r = lcg(11);
    for (let i = 0; i < 70; i++) {
      const x = r() * 256; g.strokeStyle = `rgba(${140 + r() * 40 | 0},${78 + r() * 30 | 0},30,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 2;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 30, 85, x + (r() - 0.5) * 30, 170, x + (r() - 0.5) * 20, 256); g.stroke();
    }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(110,60,20,0.55)'; g.beginPath(); g.ellipse(r() * 256, r() * 256, 3 + r() * 4, 6 + r() * 6, 0, 0, 7); g.fill(); }
  }),
  bath: () => ctex('yhBath', 128, 128, (g) => { // 15 cm bathroom tiles
    g.fillStyle = '#b9c4c8'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { g.fillStyle = (x + y) % 64 ? '#e9eef0' : '#dfe8ec'; g.fillRect(x + 1, y + 1, 30, 30); }
  }),
  curtain: () => ctex('yhCurtain', 256, 512, (g) => { // pink curtain with small embroidered flowers
    g.fillStyle = '#d8aeab'; g.fillRect(0, 0, 256, 512);
    for (let x = 0; x < 256; x += 32) {
      const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, 'rgba(255,255,255,0.14)'); gr.addColorStop(0.5, 'rgba(60,0,0,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0.14)');
      g.fillStyle = gr; g.fillRect(x, 0, 32, 512);
    }
    const r = lcg(5);
    for (let i = 0; i < 80; i++) {
      const x = 8 + r() * 240, y = 8 + r() * 490;
      g.strokeStyle = 'rgba(245,240,232,0.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + 6); g.quadraticCurveTo(x + 9, y + 16, x + 2, y + 28); g.stroke();
      g.fillStyle = 'rgba(190,80,98,0.8)'; for (let p = 0; p < 5; p++) { const a = p * 1.2566; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, 7); g.fill(); }
      g.fillStyle = '#f3e3c8'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
    }
    g.fillStyle = '#f5f1ea'; g.fillRect(0, 498, 256, 14); // lace hem
  }, false),
  valance: () => ctex('yhValance', 512, 96, (g) => { // gathered valance with a white lace edge
    g.clearRect(0, 0, 512, 96); g.fillStyle = '#d8aeab'; g.fillRect(0, 0, 512, 46);
    for (let x = 0; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 44); g.quadraticCurveTo(x + 32, 84, x + 64, 44); g.fill(); }
    g.strokeStyle = '#f7f3ec'; g.lineWidth = 6; g.setLineDash([3, 3]);
    for (let x = 0; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 48); g.quadraticCurveTo(x + 32, 90, x + 64, 48); g.stroke(); }
    g.setLineDash([]); g.fillStyle = 'rgba(255,255,255,0.15)'; for (let x = 0; x < 512; x += 16) g.fillRect(x, 0, 6, 50);
  }, false),
  mattress: () => ctex('yhMattress', 256, 320, (g) => { // yellow quilted top with a maroon border
    g.fillStyle = '#6b1f2a'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#e6cd7c'; g.fillRect(14, 14, 228, 292);
    g.save(); g.beginPath(); g.rect(14, 14, 228, 292); g.clip(); g.strokeStyle = 'rgba(150,118,48,0.35)'; g.lineWidth = 2;
    for (let y = -120; y < 330; y += 12) { g.beginPath(); g.moveTo(14, y + 114); g.lineTo(128, y); g.lineTo(242, y + 114); g.stroke(); }
    g.restore(); g.strokeStyle = '#ece4d6'; g.lineWidth = 3; g.strokeRect(14, 14, 228, 292);
  }, false),
  win: () => ctex('yhWin', 256, 160, (g) => { // aluminium sliding window behind an iron grille (鐵窗)
    g.fillStyle = '#c8cbcf'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#5d6f7d'; g.fillRect(10, 10, 236, 140);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(18, 14, 50, 132); g.fillRect(140, 14, 30, 132);
    g.fillStyle = '#c8cbcf'; g.fillRect(124, 0, 8, 160);
    g.fillStyle = 'rgba(48,48,46,0.92)'; for (let x = 16; x < 256; x += 20) g.fillRect(x, 0, 3, 160); g.fillRect(0, 52, 256, 3); g.fillRect(0, 108, 256, 3);
  }, false),
  menu: () => ctex('yhMenu', 512, 256, (g) => {
    g.fillStyle = '#7a1a14'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#f6e7c4'; g.fillRect(10, 10, 492, 236);
    g.fillStyle = '#7a1a14'; g.font = font(30); g.textAlign = 'center'; g.fillText('孫師傅 招牌牛肉拉麵', 256, 48);
    g.font = font(22, 700); g.textAlign = 'left';
    [['紅燒牛肉麵', 160], ['清燉牛肉麵', 160], ['番茄牛肉麵', 170], ['牛肉湯麵', 90], ['酸辣湯餃', 80], ['小菜', 30]].forEach(([n, p], i) => {
      const x = 30 + (i % 2) * 240, y = 98 + Math.floor(i / 2) * 50; g.fillStyle = '#2a1a12'; g.fillText(n, x, y); g.fillStyle = '#b3121f'; g.fillText('$' + p, x + 150, y);
    });
  }, false),
};
function buildYanlinHome(I, scene) {
  const S = YH_SPEC, K = S.k, W = S.W, D = S.D / K, FH = 3.42, F = FH, top = FH * S.NF; // local units (x K = metres)
  const k = new Kit(I, S.ox, S.oz, S.ang, K), base = k.base;
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  // indoor surfaces get a small emissive lift (the fluorescent tube), like the McDonald's materials
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set('#fffaf0'); m.emissiveMap = o.map || null; if (!o.map) m.emissive.set(o.color); m.emissiveIntensity = lift; }
    return m;
  };
  const MT = {
    plaster: def('yhPlaster', () => std({ color: '#efede6' }, 0.28)),
    facade: def('yhFacade', () => std({ map: YHT.facade() })),
    tile: def('yhTile', () => std({ map: YHT.tile(), roughness: 0.35 }, 0.2)),
    ceil: def('yhCeil', () => std({ map: YHT.ceil(), roughness: 0.95 }, 0.55)),
    pine: def('yhPine', () => std({ map: YHT.pine(), roughness: 0.55 })),
    dark: def('yhDarkWood', () => std({ map: YHT.pine(), color: '#6e4426', roughness: 0.5 }, 0.08)),
    bath: def('yhBath', () => std({ map: YHT.bath(), roughness: 0.3 })),
    black: def('yhBlack', () => std({ color: '#1d1d20', roughness: 0.45 })),
    alu: def('yhAlu', () => std({ color: '#b7babd', metalness: 0.6, roughness: 0.4 })),
    maroon: def('yhMaroon', () => std({ color: '#6b1f2a', roughness: 0.8 })),
    stair: def('yhStair', () => std({ color: '#a19f98', roughness: 0.7 })),
    ac: def('yhAC', () => std({ color: '#e6e2d6', roughness: 0.6 })),
    door: def('yhDoor', () => std({ color: '#8a5a3a', roughness: 0.6 })),
    ironDoor: def('yhIronDoor', () => std({ color: '#6f7c78', metalness: 0.35, roughness: 0.55 })),
    porcelain: def('yhPorcelain', () => std({ color: '#f7f7f4', roughness: 0.2 })),
    shopRed: def('yhShopRed', () => std({ color: '#a3141d', roughness: 0.6 })),
  };
  const off = base - H(...k.w(W / 2, 3)); // the ground under the room sits this far below the building base
  // walkable surface, levelled to the building base (heights here are relative to the local ground)
  const surf = (x0, x1, z0, z1, hf) => I.addSurface(k.rect(x0, x1, z0, z1), (x, z) => { const [lx, lz] = k.l(x, z); return base + hf(lx, lz) * K - H(x, z); });
  const SX0 = 2.92, SX1 = W - 0.2;           // stair strip (right of the shop): 1F hallway, then the stair (1.6 m wide)
  const PX0 = 2.75;                           // shop / hallway partition
  const SZ0 = 5.6, SZ1 = 9.3, NS = 14;        // straight flight at the back, 14 risers up to 2F
  const LZ1 = 10.4;                           // end of the 2F landing
  const CX0 = 1.75;                           // 2F corridor: lx CX0..SX0, from the landing back to the room (1.6 m wide)
  const RZ1 = 4.4;                            // 彥霖's room: full width lx 0.2..SX1, lz 0.2..RZ1
  const DX0 = 3.2, DX1 = 4.05;                // room door, bottom-right corner (bottom wall)
  const BX0 = 2.85, BZ1 = 2.6;                // bathroom: lx BX0..SX1, lz 0.2..BZ1 (top-right corner)
  const TX0 = 2.4, TX1 = 2.83, TZ0 = 0.45, TZ1 = 2.25; // desk against the bathroom wall
  const WX0w = 1.62, WX1w = 2.33;             // street window (pink curtains) between the bed and the desk
  const CH = F + 2.88;                        // room's dropped ceiling

  // ---------------- shell ----------------
  k.box(0, 0.2, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(W - 0.2, W, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, -0.6, top, D - 0.2, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0, W, top - 0.2, top, 0, D, 'gray', { col: false });
  k.box(0, W, top, top + 0.9, -0.05, 0.15, MT.facade, { col: false, tile: [0.6, 0.6] }); // parapet
  k.box(0.3, W - 0.3, top, top + 2.5, 7, D - 0.3, '#7f8b95', { col: false });          // 頂樓加蓋 sheet-metal room
  k.box(0.6, 1.8, top, top + 1.1, 2.0, 3.2, 'steel', { col: false });                   // water tank
  // front: 1F shop glass + pier + stair door; 2F street window of the room; 3F-5F solid
  k.box(0.2, PX0, -0.6, 0.0, 0, 0.2, MT.facade, { col: false });
  k.box(0.2, PX0, 0.0, 2.75, 0.06, 0.12, 'glass');
  for (const x of [0.25, 1.05, 1.85, 2.7]) k.box(x - 0.04, x + 0.04, 0, 2.75, 0.04, 0.14, MT.alu, { col: false });
  k.box(0.2, PX0, 2.72, 2.8, 0.04, 0.14, MT.alu, { col: false });
  k.box(0.2, PX0, 2.8, F, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  k.box(PX0, SX0 + 0.03, -0.6, F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(SX0 + 0.03, SX1, 2.15, F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(0.2, WX0w, F, 2 * F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX0w, WX1w, F - 0.2, F + 0.95, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX0w, WX1w, F + 2.2, 2 * F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX1w, SX1, F, 2 * F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX0w, WX1w, F + 0.95, F + 2.2, 0.08, 0.11, 'glass');
  k.box(WX0w - 0.05, WX1w + 0.05, F + 0.9, F + 0.95, -0.06, 0.2, MT.alu, { col: false });             // sill
  k.box(0.2, SX1, 2 * F, top - 0.2, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  // outside details: shop sign over the glass, window grilles, outdoor AC units
  k.box(0.05, W - 0.05, 2.78, 3.62, -0.2, 0, MT.shopRed, { col: false });
  k.plane(T.sign('孫師傅 招牌牛肉拉麵', '#a3141d', '#fff4d0', 'yhShop', 1024, 192, 112), W - 0.2, 0.8, W / 2, 3.2, -0.205, Math.PI, { emissive: 0.35 });
  k.plane(T.sign('營業中', '#2a2a2a', '#ffcf3a', 'yhOpen', 256, 96, 56), 0.6, 0.22, 1.5, 2.3, -0.01, Math.PI, { emissive: 0.6 });
  k.plane(YHT.win(), 0.55, 0.45, 3.5, F + 1.75, -0.01, Math.PI);                         // bathroom window
  for (let f = 2; f < S.NF; f++) {
    const y = f * F;
    k.plane(YHT.win(), 2.4, 1.4, 1.5, y + 1.55, -0.01, Math.PI);
    k.plane(YHT.win(), 0.7, 1.0, 3.6, y + 1.6, -0.01, Math.PI);
    k.box(1.3, 1.7, y + 0.85, y + 0.9, -0.3, 0, MT.alu, { col: false });
    if (f < 4) k.box(2.85, 3.55, y + 0.35, y + 0.9, -0.4, -0.02, MT.ac, { col: false });
  }

  // ---------------- 1F: noodle shop (seen through the glass) ----------------
  k.box(0.2, SX1, -0.3, 0.06, 0.2, D - 0.2, MT.tile, { col: false, tile: [0.6, 0.6] });
  surf(0.2, SX1, -0.05, 6.0, () => 0.06);
  k.box(PX0, SX0, 0, F, 0.2, 6.0, MT.plaster);                    // shop | hallway
  k.box(0.2, PX0, 0, F, 6.0, 6.15, MT.plaster);                   // shop back wall (kitchen beyond)
  k.box(0.2, PX0, F - 0.25, F - 0.2, 0.2, 6.0, 'white', { col: false });
  k.box(0.9, 2.3, F - 0.3, F - 0.25, 2.6, 2.75, 'light', { col: false });
  k.plane(YHT.menu(), 1.6, 0.8, 1.4, 2.1, 5.99, Math.PI, { emissive: 0.4 });
  k.box(0.3, PX0 - 0.05, 0, 0.95, 4.7, 5.4, 'steel');          // counter with the soup pots
  for (const [x, r] of [[0.75, 0.22], [1.35, 0.2], [2.4, 0.16]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, 0.42, 18), M('chrome')); pot.position.set(x, 1.16, 5.05); k.group.add(pot);
  }
  for (const z of [1.5, 3.2]) {
    k.box(0.55, 1.35, 0.72, 0.76, z - 0.4, z + 0.4, 'steel', { col: false });
    k.box(0.9, 1.0, 0, 0.72, z - 0.05, z + 0.05, MT.alu, { col: false });
    for (const [sx, sz] of [[0.35, z], [1.55, z], [0.95, z - 0.62], [0.95, z + 0.62]]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 14), M('red')); st.position.set(sx, 0.225, sz); k.group.add(st);
    }
  }

  // ---------------- side door, 1F hallway, stair at the back ----------------
  // The side door opens on a hallway along the right of the shop; the straight stair starts at the
  // back of it so the whole width of the 2F front can be 彥霖's room. Upstairs a corridor runs back
  // toward the street to the room door in the room's bottom-right corner (as in the user's floor plan).
  const leaf = new THREE.Group(); leaf.position.set(SX1 - 0.03, 0, 0.13); k.group.add(leaf);
  const LW = SX1 - SX0 - 0.08; // door leaf width
  const lm = new THREE.Mesh(new THREE.BoxGeometry(LW, 2.1, 0.05), M(MT.ironDoor)); lm.position.set(-LW / 2, 1.05, 0); leaf.add(lm);
  const hdl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.08), M('chrome')); hdl.position.set(-LW + 0.1, 1.0, 0); leaf.add(hdl);
  k.box(SX0 + 0.03, SX1, 2.1, 2.15, -0.02, 0.2, MT.alu, { col: false });
  k.plane(T.sign('2F', '#f2f0ea', '#333333', 'yh2F', 128, 64, 40), 0.22, 0.11, SX0 - 0.09, 1.55, -0.01, Math.PI);
  k.box(PX0, SX0, 0, F, 6.0, SZ1, MT.plaster);                                                    // shop / stair partition, back part
  k.box(SX0, SX1, 0, 2 * F, LZ1, LZ1 + 0.15, MT.plaster);                                          // end wall behind the landing
  const run = (SZ1 - SZ0) / NS;
  for (let j = 0; j < NS; j++) k.box(SX0, SX1, (j + 1) * F / NS - 0.45, (j + 1) * F / NS, SZ0 + j * run, SZ0 + (j + 1) * run, MT.stair, { col: false });
  surf(SX0, SX1, SZ0, SZ1, (lx, lz) => Math.max(0, Math.min(1, (lz - SZ0) / (SZ1 - SZ0))) * F);
  k.box(SX0 + 0.02, SX0 + 0.06, 0.9, F + 0.95, SZ0, SZ1, MT.alu, { col: false });                 // handrail
  for (const z of [1.2, 3.6]) k.box(3.45, 3.75, F - 0.26, F - 0.2, z, z + 0.3, 'light', { col: false });
  // 2F: landing, corridor back toward the street, small lobby in front of the room door
  k.box(SX0, SX1, F - 0.2, F, SZ1, LZ1, MT.tile, { col: false, tile: [0.6, 0.6] });              // landing
  surf(SX0, SX1, SZ1, LZ1, () => F);
  k.box(CX0, SX0, F - 0.2, F, SZ0, LZ1, MT.tile, { col: false, tile: [0.6, 0.6] });              // corridor
  surf(CX0, SX0, SZ0, LZ1, () => F);
  k.box(CX0, SX1, F - 0.2, F, RZ1 + 0.15, SZ0, MT.tile, { col: false, tile: [0.6, 0.6] });       // lobby
  surf(CX0, SX1, RZ1 + 0.15, SZ0, () => F);
  k.box(CX0 - 0.05, CX0, F, 2 * F, RZ1 + 0.15, LZ1, MT.plaster);                                // corridor, left wall
  k.box(SX0 - 0.07, SX0, F, 2 * F, SZ0, SZ1, MT.plaster);                                       // corridor | stair well
  k.box(SX0, SX1, F, 2 * F, SZ0, SZ0 + 0.05, MT.plaster);                                        // lobby | stair well
  k.box(CX0 - 0.05, SX0, F, 2 * F, LZ1, LZ1 + 0.15, MT.plaster);
  k.box(CX0, SX1, 2 * F - 0.2, 2 * F, RZ1, LZ1, 'white', { col: false });
  for (const z of [5.0, 7.6, 9.8]) k.box(CX0 + 0.35, CX0 + 0.65, 2 * F - 0.26, 2 * F - 0.2, z, z + 0.3, 'light', { col: false });

  // ---------------- 2F: 彥霖's old room (user's floor plan) ----------------
  // top (street) wall: double bed on the left, pink curtains, the desk (chair on its left, you face the
  // bathroom side); bathroom in the top-right corner with its door at its bottom-left; bottom wall: dark
  // wood double wardrobe on the left, room door in the bottom-right corner.
  const DOOR_TEX = ctex('yhGreenDoor', 128, 256, (g) => {
    g.fillStyle = '#1f4634'; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, 128, 6);
    g.strokeStyle = '#d4a93a'; g.lineWidth = 5; g.strokeRect(28, 52, 72, 150); g.lineWidth = 2; g.strokeRect(36, 60, 56, 134);
  }, false);
  k.box(0.2, SX1, F - 0.2, F, 0.2, RZ1 + 0.15, MT.tile, { col: false, tile: [0.6, 0.6] });
  surf(0.2, SX1, 0.2, RZ1 + 0.15, () => F);
  // bottom wall with the door opening at its right end
  k.box(0.2, DX0, F, 2 * F, RZ1, RZ1 + 0.15, MT.plaster);
  k.box(DX1, SX1, F, 2 * F, RZ1, RZ1 + 0.15, MT.plaster);
  k.box(DX0, DX1, F + 2.1, 2 * F, RZ1, RZ1 + 0.15, MT.plaster, { col: false });
  k.box(DX0 - 0.05, DX1 + 0.03, F + 2.06, F + 2.12, RZ1 - 0.03, RZ1 + 0.18, MT.door, { col: false });
  // dark green door with a gold panel frame, hinged in the corner; swings out onto the landing when you come near
  const rdoor = new THREE.Group(); rdoor.position.set(DX1 + 0.02, F, RZ1 + 0.075); k.group.add(rdoor);
  const dmat = new THREE.MeshStandardMaterial({ map: DOOR_TEX, roughness: 0.55, emissive: '#ffffff', emissiveMap: DOOR_TEX, emissiveIntensity: 0.15 });
  const edge = M('#173a2a');
  const rdm = new THREE.Mesh(new THREE.BoxGeometry(DX1 - DX0 + 0.02, 2.06, 0.05), [edge, edge, edge, edge, dmat, dmat]);
  rdm.position.set(-(DX1 - DX0 + 0.02) / 2, 1.03, 0); rdoor.add(rdm);
  for (const sz of [0.045, -0.045]) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M('#d4a93a')); kn.position.set(-(DX1 - DX0) + 0.1, 1.0, sz); rdoor.add(kn); }
  k.plane(T.sign('彥霖', '#f4efe2', '#1f4634', 'yhPlate', 192, 80, 46), 0.22, 0.09, DX0 - 0.25, F + 1.6, RZ1 + 0.155, 0);
  // ceiling: black-grid lay-in panels, two fluorescent tubes
  k.box(0.2, SX1, CH, CH + 0.04, 0.2, RZ1, MT.ceil, { col: false, tile: [0.6, 0.6] });
  k.box(0.2, SX1, CH + 0.04, 2 * F, 0.2, RZ1, 'white', { col: false });
  for (const [x0, z] of [[0.6, 1.4], [0.6, 3.1]]) {
    k.box(x0, x0 + 1.3, CH - 0.06, CH, z, z + 0.2, MT.alu, { col: false });
    k.box(x0 + 0.05, x0 + 1.25, CH - 0.1, CH - 0.06, z + 0.05, z + 0.15, 'light', { col: false });
  }
  k.box(0.2, 0.22, F + 0.3, F + 0.4, 3.0, 3.1, 'white', { col: false });       // socket
  const dk = (x0, x1, z0, z1, y1) => k.wallRect(x0, x1, z0, z1, F - 0.2, F + y1);
  // street window between the bed and the desk, pink curtains drawn
  for (const [x0, x1] of [[WX0w - 0.08, (WX0w + WX1w) / 2 + 0.03], [(WX0w + WX1w) / 2 - 0.03, WX1w + 0.08]]) k.plane(YHT.curtain(), x1 - x0, 1.45, (x0 + x1) / 2, F + 1.55, 0.3, 0, { double: true });
  k.plane(YHT.valance(), WX1w - WX0w + 0.2, 0.3, (WX0w + WX1w) / 2, F + 2.2, 0.34, 0, { transparent: true, double: true });
  k.box(WX0w - 0.12, WX1w + 0.12, F + 2.3, F + 2.33, 0.26, 0.29, MT.alu, { col: false });
  // window AC on the left wall over the head of the bed
  k.box(0.2, 0.46, F + 1.95, F + 2.4, 0.7, 1.4, MT.ac, { col: false });
  k.box(0.46, 0.47, F + 2.0, F + 2.2, 0.75, 1.35, 'gray', { col: false });
  // double bed in the top-left corner: pine frame, headboard on the street wall, two pillows, pink quilt
  const BDX = 1.55, BDZ = 2.3;
  k.box(0.22, BDX, F, F + 0.38, 0.3, BDZ, MT.pine, { col: false });
  k.box(0.22, BDX, F, F + 0.85, 0.22, 0.3, MT.pine, { col: false });
  dk(0.22, BDX, 0.22, BDZ, 0.9);
  k.box(0.26, BDX - 0.04, F + 0.38, F + 0.56, 0.32, BDZ - 0.03, MT.maroon, { col: false });
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(BDX - 0.3, BDZ - 0.37), new THREE.MeshStandardMaterial({ map: YHT.mattress(), roughness: 0.85 }));
  mt.rotation.x = -Math.PI / 2; mt.position.set((0.26 + BDX - 0.04) / 2, F + 0.561, (0.32 + BDZ - 0.03) / 2); k.group.add(mt);
  for (const [x0, x1] of [[0.32, 0.86], [0.92, 1.46]]) k.box(x0, x1, F + 0.56, F + 0.72, 0.38, 0.72, 'white', { col: false }); // pillows
  k.box(0.24, BDX - 0.02, F + 0.56, F + 0.68, 0.95, BDZ - 0.01, '#f2b8c6', { col: false });     // pink quilt
  k.box(0.24, BDX - 0.02, F + 0.2, F + 0.68, BDZ - 0.01, BDZ + 0.01, '#f2b8c6', { col: false });
  // computer desk on the street-side wall of the bathroom, long side along it: monitor, black tower, keyboard, mouse
  k.box(TX0, TX1, F + 0.72, F + 0.76, TZ0, TZ1, MT.black, { col: false });
  for (const [x, z] of [[TX0 + 0.04, TZ0 + 0.04], [TX1 - 0.04, TZ0 + 0.04], [TX0 + 0.04, TZ1 - 0.04], [TX1 - 0.04, TZ1 - 0.04]]) k.box(x - 0.025, x + 0.025, F, F + 0.72, z - 0.025, z + 0.025, MT.black, { col: false });
  dk(TX0, TX1, TZ0, TZ1, 0.9);
  k.box(TX1 - 0.13, TX1 - 0.07, F + 0.76, F + 0.79, 1.2, 1.5, MT.black, { col: false });        // monitor foot
  k.box(TX1 - 0.11, TX1 - 0.08, F + 0.79, F + 0.95, 1.32, 1.38, MT.black, { col: false });
  k.box(TX1 - 0.15, TX1 - 0.11, F + 0.92, F + 1.3, 1.01, 1.69, MT.black, { col: false });        // bezel
  k.plane(T.screen(), 0.64, 0.34, TX1 - 0.155, F + 1.11, 1.35, -Math.PI / 2, { emissive: 0.9 });
  k.box(TX0 + 0.05, TX1 - 0.03, F + 0.76, F + 1.2, 1.88, 2.08, MT.black, { col: false });        // tower
  k.box(TX0 + 0.049, TX0 + 0.05, F + 1.1, F + 1.12, 1.93, 2.03, '#3ad07a', { col: false });    // power LED
  k.box(TX0 + 0.03, TX0 + 0.18, F + 0.76, F + 0.78, 1.12, 1.58, '#2a2a2e', { col: false });     // keyboard
  k.box(TX0 + 0.05, TX0 + 0.16, F + 0.78, F + 0.785, 1.15, 1.55, '#45454a', { col: false });
  k.box(TX0 + 0.05, TX0 + 0.12, F + 0.76, F + 0.79, 1.68, 1.75, '#2a2a2e', { col: false });     // mouse
  k.box(TX0 + 0.05, TX0 + 0.23, F + 0.761, F + 0.764, 0.55, 0.73, 'white', { col: false });     // note from the landlord
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.22, 16), M('glass')); jug.position.set(TX1 - 0.12, F + 0.87, 0.6); k.group.add(jug);
  // desk chair (black, chrome legs) on the left of the desk; it doesn't block the way
  { const cx = 1.98, cz = 1.35;
    k.box(cx - 0.21, cx + 0.21, F + 0.44, F + 0.48, cz - 0.21, cz + 0.21, MT.black, { col: false });
    k.box(cx - 0.205, cx - 0.175, F + 0.6, F + 0.92, cz - 0.21, cz + 0.21, MT.black, { col: false });
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) k.box(cx + lx - 0.012, cx + lx + 0.012, F, F + (lx < 0 ? 0.92 : 0.44), cz + lz - 0.012, cz + lz + 0.012, 'chrome', { col: false }); }
  // dark wood double-door wardrobe along the bottom wall, left part; doors open while you change
  const WX0 = 0.22, WX1 = 2.2, WD0 = RZ1 - 0.6;
  k.box(WX0, WX0 + 0.03, F, F + 2.05, WD0, RZ1, MT.dark, { col: false });
  k.box(WX1 - 0.03, WX1, F, F + 2.05, WD0, RZ1, MT.dark, { col: false });
  k.box(WX0, WX1, F, F + 2.05, RZ1 - 0.04, RZ1, '#2e1e12', { col: false });
  k.box(WX0, WX1, F + 2.0, F + 2.05, WD0, RZ1, MT.dark, { col: false });
  k.box(WX0 - 0.03, WX1 + 0.03, F + 2.05, F + 2.12, WD0 - 0.04, RZ1, MT.dark, { col: false });
  k.box(WX0, WX1, F, F + 0.25, WD0, RZ1, MT.dark, { col: false });
  k.box(WX0 + 0.05, WX1 - 0.05, F + 1.75, F + 1.77, WD0 + 0.25, WD0 + 0.27, 'chrome', { col: false }); // rail
  ['#121212', '#f4f4f0', '#b3121f', '#6b7f99', '#2f3e5c', '#d8c9a8', '#5b5d63', '#2f5d46', '#3d5a80', '#c9b48a'].forEach((c, i) => {
    const x = WX0 + 0.2 + i * (WX1 - WX0 - 0.4) / 9;
    k.box(x - 0.05, x + 0.05, F + 0.95, F + 1.74, WD0 + 0.08, RZ1 - 0.08, c, { col: false });
  });
  dk(WX0, WX1, WD0, RZ1, 2.0);
  const wDoors = [], half = (WX1 - WX0) / 2;
  for (const [hx, dir] of [[WX0, 1], [WX1, -1]]) {
    const hg = new THREE.Group(); hg.position.set(hx, F + 0.25, WD0); k.group.add(hg);
    const lf = new THREE.Mesh(new THREE.BoxGeometry(half - 0.005, 1.78, 0.03), M(MT.dark)); lf.position.set(dir * half / 2, 0.89, -0.015); hg.add(lf);
    const pn = new THREE.Mesh(new THREE.BoxGeometry(half - 0.2, 1.4, 0.01), M('#4a2f1b')); pn.position.set(dir * half / 2, 0.92, -0.035); hg.add(pn);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), M(MT.alu)); kb.position.set(dir * (half - 0.07), 0.8, -0.05); hg.add(kb);
    wDoors.push({ hg, dir });
  }
  let wOpen = 0, wTarget = 0;
  // bathroom in the top-right corner, door at its bottom-left: tiles, shower, toilet, basin + mirror
  k.box(BX0, BX0 + 0.08, F, CH, 0.2, BZ1, MT.plaster);
  k.box(BX0, BX0 + 0.1, F, CH, BZ1 - 0.08, BZ1, MT.plaster);
  k.box(BX0 + 1.0, SX1, F, CH, BZ1 - 0.08, BZ1, MT.plaster);
  k.box(BX0 + 0.1, BX0 + 1.0, F + 2.05, CH, BZ1 - 0.08, BZ1, MT.plaster, { col: false });
  const tl = (x0, x1, z0, z1) => k.box(x0, x1, F, F + 2.4, z0, z1, MT.bath, { col: false, tile: [0.6, 0.6] });
  tl(BX0 + 0.08, BX0 + 0.09, 0.21, BZ1 - 0.08); tl(BX0 + 0.08, SX1, 0.2, 0.21);
  tl(BX0 + 0.08, SX1, BZ1 - 0.09, BZ1 - 0.08); tl(SX1 - 0.01, SX1, 0.21, BZ1 - 0.08);
  k.box(BX0 + 0.08, SX1, F, F + 0.02, 0.21, BZ1 - 0.08, MT.bath, { col: false, tile: [0.3, 0.3] });
  k.box(BX0, SX1, F + 2.4, F + 2.44, 0.2, BZ1, 'white', { col: false });
  k.box(3.3, 3.6, F + 2.34, F + 2.4, 1.2, 1.5, 'light', { col: false });
  k.box(3.35, SX1 - 0.02, F, F + 0.05, 0.22, 1.05, MT.porcelain, { col: false });             // shower tray
  k.box(3.34, 3.36, F + 0.05, F + 2.0, 0.6, 1.05, 'glass', { col: false });                   // glass screen
  k.box(SX1 - 0.06, SX1 - 0.02, F + 1.85, F + 1.95, 0.55, 0.65, 'chrome', { col: false });    // shower head
  k.box(SX1 - 0.04, SX1 - 0.02, F + 0.9, F + 1.85, 0.58, 0.62, 'chrome', { col: false });
  k.box(3.62, 3.98, F, F + 0.4, 1.5, 1.86, MT.porcelain, { col: false });                    // toilet, back to the right wall
  k.box(3.6, 3.98, F + 0.4, F + 0.44, 1.48, 1.88, MT.porcelain, { col: false });
  k.box(3.92, SX1 - 0.01, F + 0.44, F + 0.8, 1.5, 1.86, MT.porcelain, { col: false });
  dk(3.6, SX1, 1.46, 1.9, 0.5);
  k.box(BX0 + 0.08, BX0 + 0.5, F + 0.78, F + 0.86, 1.15, 1.6, MT.porcelain, { col: false }); // basin
  k.box(BX0 + 0.18, BX0 + 0.28, F, F + 0.78, 1.33, 1.43, MT.porcelain, { col: false });
  k.box(BX0 + 0.09, BX0 + 0.1, F + 1.1, F + 1.65, 1.15, 1.6, 'glass', { col: false });        // mirror
  // (no bathroom door: just the opening)

  // plaster skins over the inside faces of the (mosaic-tiled) shell walls
  const skin = (x0, x1, y0, y1, z0, z1) => k.box(x0, x1, y0, y1, z0, z1, MT.plaster, { col: false });
  skin(0.2, 0.21, 0, F - 0.25, 0.2, 6.0);                                    // shop, left wall
  skin(SX1 - 0.01, SX1, 0, F - 0.2, 0.2, SZ0);                               // 1F hallway, right wall
  skin(SX1 - 0.01, SX1, 0, 2 * F - 0.2, SZ0, LZ1);                           // stair well, right wall
  skin(SX1 - 0.01, SX1, F, 2 * F - 0.2, RZ1 + 0.15, SZ0);                    // lobby, right wall
  skin(SX0, SX1, 2.15, F - 0.2, 0.2, 0.21);                                  // 1F hallway, front wall
  skin(0.2, 0.21, F, CH, 0.21, RZ1);                                         // room: left wall
  skin(SX1 - 0.01, SX1, F, CH, BZ1, RZ1);                                    // room: right wall below the bathroom
  skin(0.21, WX0w, F, CH, 0.2, 0.21); skin(WX1w, BX0, F, CH, 0.2, 0.21);     // room: street wall around the window
  skin(WX0w, WX1w, F, F + 0.95, 0.2, 0.21); skin(WX0w, WX1w, F + 2.2, CH, 0.2, 0.21);

  k.finish(scene);
  // zones (camera ceiling + location name) and the E actions
  I.zones.push({ name: '孫師傅牛肉拉麵 樓梯間', pts: k.rect(SX0, SX1, 0.2, SZ0), y0: 0, y1: (F - 0.4) * K, ceil: () => (F - 0.3) * K + off });
  I.zones.push({ name: '孫師傅牛肉拉麵 樓梯間', pts: k.rect(SX0, SX1, SZ0, LZ1), y0: 0, y1: (2 * F - 0.4) * K, ceil: () => (2 * F - 0.45) * K + off });
  I.zones.push({ name: '孫師傅牛肉拉麵 二樓', pts: k.rect(CX0, SX1, RZ1, LZ1), y0: (F - 0.3) * K, y1: (2 * F - 0.4) * K, ceil: () => (2 * F - 0.45) * K + off });
  I.zones.push({ name: '彥霖以前住的地方', pts: k.rect(0.2, SX1, 0.2, RZ1), y0: (F - 0.3) * K, y1: (2 * F - 0.4) * K, ceil: () => (CH - 0.1) * K + off });
  const at = (lx, lz) => { const p = k.w(lx, lz); return { x: p[0], z: p[1], y: F * K + base - H(p[0], p[1]) }; };
  const memories = ['🛏️ 以前每天早上都是被樓下牛肉麵的香味叫醒的', '🛏️ 期末趕報告趕到天亮，就是倒在這張床上補眠', '🛏️ 窗外就是中北路，半夜還聽得到機車聲'];
  let mi = 0;
  I.actions.push({ ...at(0.95, 2.75), r: 0.6,
    label: (g) => g.canSleep() ? '按 <kbd>E</kbd> 睡覺（睡到隔天早上 6:00）' : '按 <kbd>E</kbd> 在床上躺一下（晚上 9 點後才能睡覺）',
    fn: (g) => { if (g.canSleep()) { g.sleep(); return; } g.hud.toast(memories[mi++ % memories.length], 'good', 2800); g.audio.blip(); } });
  I.actions.push({ ...at(1.98, 1.35), r: 0.5, label: () => '按 <kbd>E</kbd> 使用電腦', fn: (g) => g.pc?.open() });
  I.actions.push({ ...at(2.05, 0.62), r: 0.35, label: () => '按 <kbd>E</kbd> 看桌上的紙', fn: (g) => g.hud.toast('📄 紙條：「房租月底前交喔！——房東」', 'good', 2800) });
  I.actions.push({ ...at((WX0 + WX1) / 2, WD0 - 0.45), r: 0.65, label: () => '按 <kbd>E</kbd> 打開衣櫃換衣服', fn: (g) => g.wardrobe?.open() });
  I.actions.push({ ...at(3.5, 1.4), r: 0.5, label: () => '按 <kbd>E</kbd> 洗把臉', fn: (g) => { g.hud.toast('💧 洗把臉，清醒多了', 'good', 1800); g.audio.blip(); } });
  // the street door and the room door swing open when you walk up; the wardrobe opens while you change
  const doorAt = k.w((SX0 + SX1) / 2, 0.1), roomDoorAt = k.w((DX0 + DX1) / 2, RZ1 + 0.075);
  I.updaters.push((dt, g) => {
    const p = g.player.worldPos(), foot = !g.player.vehicle;
    const near = foot && Math.hypot(p.x - doorAt[0], p.z - doorAt[1]) < 2.6;
    leaf.rotation.y += ((near ? Math.PI / 2 : 0) - leaf.rotation.y) * Math.min(1, dt * 5);
    const nr = foot && g.player.y > (F - 1) * K && Math.hypot(p.x - roomDoorAt[0], p.z - roomDoorAt[1]) < 1.9;
    rdoor.rotation.y += ((nr ? Math.PI / 2 : 0) - rdoor.rotation.y) * Math.min(1, dt * 5); // opens out onto the landing
    wOpen += (wTarget - wOpen) * Math.min(1, dt * 5);
    for (const d of wDoors) d.hg.rotation.y = d.dir * wOpen * 1.9;
  });
  return { k, door: doorAt, room: k.w(2, 2.5), setWardrobe: (o) => { wTarget = o ? 1 : 0; } };
}

// =====================================================================
// 茶學苑 Tea Arts 中北店: the drink shop on 中北路 just west of the 正門 (OSM POI at (-245.5, 90.9), south side
// of the street between 中北路193巷 and 早啊早餐店). Modelled on the user's photos: a 3-storey 透天 in light
// grey tile, 2F aluminium windows behind iron grilles with window AC units, a wide yellow sign board with
// white 「茶學苑」, a round yellow blade sign on a white bracket, a thin grey canopy over a yellow order counter
// with an open window and a glass panel with the lit 茶學苑 TEA ARTS logo, the glass door on the right; in
// front a raised wooden deck with dark-wood benches inside a black railing. You order at the counter from
// the deck (the shop itself is not enterable). js/teashop.js puts the staff in (排球少年 吱吱 on his shifts).
// Local frame: +x runs west along 中北路, +z away from the street; the facade is z = 0, the deck z < 0.
// =====================================================================
export const TEA_SPEC = { ox: -243.01, oz: 90.77, ang: Math.atan2(0.354, -0.935), W: 6.0, D: 7.2, NF: 3, FH: 3.7, DECK: 2.0 };
export function teaFootprint() {
  const { ox, oz, ang, W, D, DECK } = TEA_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(-0.3, -DECK - 0.4), w(W + 0.3, -DECK - 0.4), w(W + 0.3, D + 0.3), w(-0.3, D + 0.3)]; // + the deck in front
}
const TEA_YELLOW = '#f2c21b';
const TEAT = {
  sign: () => ctex('teaSign2', 1024, 136, (g) => {
    g.fillStyle = TEA_YELLOW; g.fillRect(0, 0, 1024, 136);
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 124, 1024, 12);
    // slogan in a rounded outline on the left
    g.strokeStyle = '#5a3d12'; g.lineWidth = 3; g.beginPath(); g.roundRect(40, 46, 236, 40, 20); g.stroke();
    g.fillStyle = '#5a3d12'; g.font = font(22, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('做一杯有人情味的茶', 158, 67);
    g.fillStyle = '#ffffff'; g.font = `900 92px "Kaiti TC","STKaiti","BiauKai","DFKai-SB","Noto Serif TC",serif`; g.fillText('茶學苑', 520, 72);
  }, false),
  blade: () => ctex('teaBlade', 256, 256, (g) => { // round blade sign: yellow disc, line-drawn leaf-face logo
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = TEA_YELLOW; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
    g.strokeStyle = '#5a3d12'; g.lineWidth = 5; g.beginPath(); g.ellipse(128, 100, 30, 44, 0, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(128, 62); g.quadraticCurveTo(118, 100, 128, 140); g.stroke();
    g.beginPath(); g.arc(116, 96, 3, 0, 7); g.arc(140, 96, 3, 0, 7); g.fillStyle = '#5a3d12'; g.fill();
    g.font = font(38, 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('茶學苑', 128, 184);
  }, false),
  logo: () => ctex('teaLogo', 512, 384, (g) => { // the lit logo panel behind the glass, left of the order window
    const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#7a4e26'); gr.addColorStop(1, '#4f3016');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
    for (let x = 0; x < 512; x += 32) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 2, 384); }
    g.fillStyle = '#ffcf5a'; g.shadowColor = '#ffb020'; g.shadowBlur = 18;
    g.font = `900 120px "Kaiti TC","STKaiti","BiauKai","Noto Serif TC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('茶學苑', 256, 150);
    g.font = '700 58px Georgia,"Times New Roman",serif'; g.fillText('TEA ARTS', 256, 270);
  }, false),
  menu: () => ctex('teaMenu2', 1024, 384, (g) => {
    g.fillStyle = '#fbf3dc'; g.fillRect(0, 0, 1024, 384); g.fillStyle = TEA_YELLOW; g.fillRect(0, 0, 1024, 84);
    g.fillStyle = '#ffffff'; g.font = font(48); g.textAlign = 'center'; g.fillText('茶學苑 MENU', 512, 60);
    g.font = font(34, 700); g.textAlign = 'left';
    TEA_BOARD.forEach(([n, p], i) => {
      const x = 60 + (i % 2) * 480, y = 150 + Math.floor(i / 2) * 76;
      g.fillStyle = '#4a3214'; g.fillText(n, x, y); g.fillStyle = '#c0392b'; g.textAlign = 'right'; g.fillText('$' + p, x + 400, y); g.textAlign = 'left';
    });
    g.fillStyle = '#8a6a3a'; g.font = font(24, 700); g.textAlign = 'center'; g.fillText('甜度冰塊可調 · 加珍珠 +10', 512, 366);
  }, false),
  poster: () => ctex('teaPoster', 256, 352, (g) => { // purple-cup poster on the white wall by the door
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 352); g.fillStyle = TEA_YELLOW; g.fillRect(0, 0, 256, 56);
    g.fillStyle = '#5a3d12'; g.font = font(34); g.textAlign = 'center'; g.fillText('新品上市', 128, 40);
    g.fillStyle = '#b97fd0'; g.beginPath(); g.moveTo(80, 90); g.lineTo(176, 90); g.lineTo(164, 280); g.lineTo(92, 280); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.font = font(34); g.fillText('茶', 128, 170); g.font = font(22); g.fillText('學苑', 134, 210);
    g.fillStyle = '#4a3214'; g.font = font(30); g.fillText('脆梅冰茶 $35', 128, 326);
  }, false),
  deck: () => ctex('teaDeck', 256, 256, (g) => { // wooden deck boards
    g.fillStyle = '#7a4a26'; g.fillRect(0, 0, 256, 256); const r = lcg(17);
    for (let y = 0; y < 256; y += 32) {
      g.fillStyle = `rgb(${128 + r() * 24 | 0},${78 + r() * 16 | 0},${40 + r() * 10 | 0})`; g.fillRect(0, y + 2, 256, 28);
      for (let i = 0; i < 10; i++) { g.strokeStyle = 'rgba(70,35,10,.25)'; g.lineWidth = 1; g.beginPath(); const yy = y + 4 + r() * 24; g.moveTo(0, yy); g.bezierCurveTo(80, yy + r() * 4, 170, yy - r() * 4, 256, yy); g.stroke(); }
    }
  }),
};
// what the menu board shows (js/teashop.js has the orderable list with the same prices)
export const TEA_BOARD = [['珍珠奶茶', 50], ['茉莉綠茶', 30], ['四季春青茶', 30], ['冬瓜檸檬', 45], ['蜂蜜檸檬綠', 50], ['鮮奶紅茶', 55]];
function buildTeaShop(I, scene) {
  const S = TEA_SPEC, W = S.W, D = S.D, F = S.FH, top = F * S.NF, DK = S.DECK;
  const k = new Kit(I, S.ox, S.oz, S.ang);
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set(o.color || '#ffffff'); m.emissiveMap = o.map || null; m.emissiveIntensity = lift; }
    return m;
  };
  const MT = {
    facade: def('teaFacade2', () => std({ map: YHT.facade(), color: '#dcdcd8' })),
    yellow: def('teaYellow', () => std({ color: TEA_YELLOW, roughness: 0.5 }, 0.12)),
    wood: def('teaWood', () => std({ color: '#c79a68', roughness: 0.55 }, 0.25)),
    darkWood: def('teaDarkWood', () => std({ map: TEAT.deck(), color: '#8a5a36', roughness: 0.6 })),
    deck: def('teaDeckM', () => std({ map: TEAT.deck(), roughness: 0.7 })),
    black: def('teaBlack', () => std({ color: '#1b1b1c', metalness: 0.4, roughness: 0.5 })),
    grey: def('teaGrey', () => std({ color: '#8b9094', metalness: 0.3, roughness: 0.5 })),
    wall: def('teaWall2', () => std({ color: '#f6f4ee' }, 0.2)),
    tile: def('teaTile', () => std({ map: YHT.tile(), roughness: 0.4 }, 0.2)),
    steel: def('teaSteel', () => std({ color: '#c7cbcf', metalness: 0.75, roughness: 0.3 }, 0.08)),
    white: def('teaWhite', () => std({ color: '#f4f4f0', roughness: 0.4 }, 0.2)),
    purple: def('teaPurple', () => std({ color: '#b27ccd', roughness: 0.45 }, 0.1)),
    shutter: def('teaShutter', () => std({ color: '#9aa0a3', metalness: 0.4, roughness: 0.5 })),
    light: def('teaLight', () => new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff3d6', emissiveIntensity: 1.2 })),
  };
  const CH = 2.95;                      // shop ceiling
  const OX0 = 2.2, OX1 = 4.5;           // open order window (above the counter)
  const GX1 = W - 0.2;                  // logo glass from OX1 to here
  const DX0 = 0.55, DX1 = 1.45;         // glass door on the right (as seen from the street)
  const SILL = 1.05, WTOP = 2.5;        // counter sill / window head

  // ---------------- shell ----------------
  k.box(0, 0.2, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(W - 0.2, W, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, -0.6, top, D - 0.2, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0, W, top, top + 0.15, 0, D, 'gray', { col: false });
  k.box(0, W, top, top + 0.9, -0.05, 0.15, MT.facade, { col: false, tile: [0.6, 0.6] });
  k.box(0.6, 1.8, top, top + 1.1, 3.0, 4.2, 'steel', { col: false });
  // inside: warm wood walls, tiled floor, lit ceiling
  k.box(0.2, W - 0.2, -0.6, 0.05, 0, D - 0.2, MT.tile, { col: false, tile: [0.6, 0.6] });
  k.box(0.2, 0.22, 0.05, CH, 0.2, D - 0.2, MT.wood, { col: false });
  k.box(W - 0.22, W - 0.2, 0.05, CH, 0.2, D - 0.2, MT.wood, { col: false });
  k.box(0.2, W - 0.2, 0.05, CH, D - 0.22, D - 0.2, MT.wood, { col: false });
  k.box(0.2, W - 0.2, CH, CH + 0.05, 0.2, D - 0.2, MT.white, { col: false });
  for (const z of [1.8, 4.4]) k.box(1.0, W - 1.0, CH - 0.04, CH, z - 0.15, z + 0.15, MT.light, { col: false });
  for (const x of [OX0 + 0.5, OX1 - 0.5]) { k.cyl(x, 0.9, 0.12, 2.3, 2.45, '#f3e2b8', { r1: 0.04, seg: 12 }); k.box(x - 0.005, x + 0.005, 2.45, CH, 0.895, 0.905, MT.black, { col: false }); } // pendant lamps

  // ---------------- ground-floor front ----------------
  // order counter: yellow below the sill, open window above, glass with the lit logo to its left (street view)
  k.box(OX0, GX1, 0, SILL, 0, 0.25, MT.yellow);
  k.box(OX0 - 0.05, GX1, SILL, SILL + 0.05, -0.32, 0.6, MT.white, { col: false });             // sill / counter top
  k.wallRect(OX0, GX1, -0.32, 0.25, 0, SILL + 0.05);
  k.box(OX1, OX1 + 0.06, SILL, WTOP, 0, 0.12, MT.black, { col: false });                         // window mullion
  k.box(OX1 + 0.06, GX1, SILL + 0.05, WTOP, 0.05, 0.09, 'glass', { col: false });
  k.plane(TEAT.logo(), GX1 - OX1 - 0.2, (GX1 - OX1 - 0.2) * 0.75, (OX1 + GX1) / 2 + 0.03, (SILL + WTOP) / 2 + 0.05, 0.3, Math.PI, { emissive: 0.8 });
  k.box(OX0, GX1, WTOP, 2.62, 0, 0.2, MT.black, { col: false });                                 // window head
  k.box(OX0 - 0.06, OX0, SILL, WTOP, 0, 0.15, MT.black, { col: false });
  // right of the counter: white wall with posters and the glass door (in the photo the shop's side entrance)
  k.box(0.2, DX0, 0, 2.62, 0, 0.2, MT.wall); k.box(DX1, OX0 - 0.06, 0, 2.62, 0, 0.2, MT.wall);
  k.box(DX0, DX1, 2.2, 2.62, 0, 0.2, MT.wall, { col: false });
  k.box(DX0, DX1, 0, 2.2, 0.08, 0.12, 'glass');
  for (const x of [DX0, DX1 - 0.05]) k.box(x, x + 0.05, 0, 2.2, 0.05, 0.15, MT.black, { col: false });
  k.box(DX0 + 0.08, DX0 + 0.12, 0.9, 1.25, 0.0, 0.05, MT.steel, { col: false });                 // door handle
  k.plane(TEAT.poster(), 0.5, 0.69, (DX1 + OX0) / 2, 1.5, -0.01, Math.PI);
  // grey canopy under the sign, then the yellow sign board right across the front
  k.box(-0.05, W + 0.05, 2.62, 2.7, -0.95, 0.05, MT.grey, { col: false });
  k.box(-0.05, W + 0.05, 2.7, 2.78, -0.97, -0.9, MT.grey, { col: false });
  k.box(0.05, W - 0.05, 2.84, 3.6, -0.16, 0, MT.yellow, { col: false });
  k.plane(TEAT.sign(), W - 0.2, (W - 0.2) * 136 / 1024, W / 2, 3.22, -0.165, Math.PI, { emissive: 0.35 });
  // round blade sign on a white bracket, sticking out over the deck at the right-hand end
  k.box(0.32, 0.38, 2.9, 3.62, -0.08, 0, MT.white, { col: false });
  k.box(0.32, 0.38, 3.48, 3.53, -1.15, 0, MT.white, { col: false });
  k.box(0.32, 0.38, 3.0, 3.05, -0.6, 0, MT.white, { col: false });
  for (const sd of [-1, 1]) k.plane(TEAT.blade(), 0.92, 0.92, 0.35 + sd * 0.025, 3.22, -0.85, sd * Math.PI / 2, { transparent: true, emissive: 0.35 });

  // upper floors: light grey tile, aluminium windows behind iron grilles, window AC units
  k.box(0.2, W - 0.2, F, top, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, 3.6, F, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  for (let f = 1; f < S.NF; f++) {
    const y = f * F;
    k.plane(YHT.win(), 1.6, 1.4, W - 1.3, y + 1.55, -0.01, Math.PI);
    k.plane(YHT.win(), 1.6, 1.4, W / 2 - 0.4, y + 1.55, -0.01, Math.PI);
    k.box(W - 2.1, W - 0.5, y + 0.82, y + 2.28, -0.25, -0.2, 'metal', { col: false });           // grille frames
    for (const xx of [W / 2 - 1.2, W / 2 + 0.4]) k.box(xx, xx + 0.04, y + 0.82, y + 2.28, -0.25, -0.02, 'metal', { col: false });
    k.box(0.55, 1.35, y + 1.95, y + 2.45, -0.4, -0.02, '#e6e2d6', { col: false });               // window AC
    k.box(W - 1.75, W - 0.95, y + 0.3, y + 0.8, -0.4, -0.02, '#e6e2d6', { col: false });
  }

  // ---------------- wooden deck in front, black railing, benches ----------------
  k.box(-0.05, W + 0.05, -0.4, 0.14, -DK, 0, MT.deck, { col: false, tile: [1, 1] });
  I.addSurface(k.rect(-0.05, W + 0.05, -DK, 0), (x, z) => Math.max(0.02, k.base + 0.14 - H(x, z))); // level with the rendered boards
  const RY = 0.14, RH = 1.0, RZ = -DK + 0.04, RX0 = 1.7;            // railing along the front from RX0 to the west end, then back to the wall
  k.box(RX0, W, RY + RH - 0.04, RY + RH, RZ - 0.02, RZ + 0.02, MT.black, { col: false });
  k.box(RX0, W, RY + 0.1, RY + 0.13, RZ - 0.015, RZ + 0.015, MT.black, { col: false });
  for (let x = RX0; x <= W + 0.001; x += 0.12) k.box(x - 0.012, x + 0.012, RY + 0.1, RY + RH, RZ - 0.012, RZ + 0.012, MT.black, { col: false });
  k.box(W - 0.04, W, RY + RH - 0.04, RY + RH, RZ, 0, MT.black, { col: false });
  for (let z = RZ; z < 0; z += 0.12) k.box(W - 0.032, W - 0.008, RY + 0.1, RY + RH, z - 0.012, z + 0.012, MT.black, { col: false });
  k.wallLine(RX0, RZ, W, RZ, 0, RY + RH); k.wallLine(W - 0.02, RZ, W - 0.02, 0, 0, RY + RH);
  // two benches against the railing: dark wood tops on black steel frames
  for (const [b0, b1] of [[1.9, 3.7], [4.0, 5.8]]) {
    const z0 = RZ + 0.12, z1 = RZ + 0.5;
    k.box(b0, b1, RY + 0.42, RY + 0.48, z0, z1, MT.darkWood, { col: false });
    for (const x of [b0 + 0.08, b1 - 0.12]) { k.box(x, x + 0.04, RY, RY + 0.42, z0 + 0.04, z0 + 0.08, MT.black, { col: false }); k.box(x, x + 0.04, RY, RY + 0.42, z1 - 0.08, z1 - 0.04, MT.black, { col: false }); }
    k.box(b0 + 0.08, b1 - 0.08, RY + 0.12, RY + 0.15, (z0 + z1) / 2 - 0.02, (z0 + z1) / 2 + 0.02, MT.black, { col: false });
    k.wallRect(b0, b1, z0, z1, 0, RY + 0.48);
  }

  // ---------------- counter inside, back bar ----------------
  // drinks waiting on the sill: the shop's purple cups with sealed lids
  for (const x of [2.5, 2.68, 2.86]) {
    k.cyl(x, -0.1, 0.043, SILL + 0.05, SILL + 0.25, MT.purple, { r1: 0.05, seg: 12 });
    k.cyl(x, -0.1, 0.05, SILL + 0.25, SILL + 0.27, MT.white, { seg: 12 });
  }
  k.box(OX1 - 0.55, OX1 - 0.2, SILL + 0.05, SILL + 0.1, 0.25, 0.5, '#222', { col: false });       // POS
  k.box(OX1 - 0.52, OX1 - 0.23, SILL + 0.1, SILL + 0.34, 0.4, 0.44, '#1a1a1a', { col: false });
  k.plane(T.sign('票投彥霖 ✌', '#ffd23f', '#c41d2a', 'teaVote', 256, 96, 46), 0.46, 0.17, 1.0, 1.45, -0.01, Math.PI); // 吱吱's poster by the door
  const BZ = D - 0.85;
  k.box(0.25, W - 0.25, 0, 0.92, BZ, D - 0.22, MT.steel);
  k.box(0.25, W - 0.25, 0.92, 0.96, BZ - 0.04, D - 0.22, MT.white, { col: false });
  for (const x of [2.4, 2.95, 3.5, 4.05]) {
    k.cyl(x, BZ + 0.32, 0.17, 0.96, 1.5, MT.steel, { seg: 16 });
    k.cyl(x, BZ + 0.32, 0.12, 1.5, 1.56, '#2a2a2a', { seg: 12 });
  }
  k.box(4.55, 5.05, 0.96, 1.5, BZ + 0.1, BZ + 0.55, MT.white, { col: false });                   // cup sealer
  k.box(4.65, 4.95, 1.2, 1.24, BZ + 0.08, BZ + 0.1, '#c41d2a', { col: false });
  k.box(0.9, 1.9, 0.96, 1.08, BZ + 0.1, BZ + 0.55, MT.steel, { col: false });                    // shaker station
  for (const x of [1.1, 1.4, 1.7]) k.cyl(x, BZ + 0.3, 0.05, 1.08, 1.32, MT.steel, { r1: 0.06, seg: 10 });
  k.plane(TEAT.menu(), 3.4, 1.27, 3.3, 2.1, D - 0.225, Math.PI, { emissive: 0.5 });
  k.box(OX0 - 0.1, OX0 - 0.06, 0, 1.0, 0.25, 1.4, MT.wood); // partition between the door lobby and the bar

  k.finish(scene);
  return {
    k, base: k.base,
    counter: k.w((OX0 + OX1) / 2, -0.9),                     // where you stand (on the deck) to order
    clerk: { at: k.w(OX1 - 0.4, 0.95), h: k.heading(Math.PI) }, // the regular clerk at the register
    zz: { at: k.w(OX0 + 0.6, 1.0), h: k.heading(Math.PI) },     // 吱吱 shaking drinks at the window on his shifts
  };
}

// =====================================================================
// 中北路 south side around 茶學苑 (from the user's street-view photos, east -> west):
//   雪糕早午餐 / BRUNCH 活力早午餐 · 大門口 影印 · [中北路193巷] · 麥食堂 (2 floors + roof canopy, a shuttered
//   unit next to 茶學苑) · 茶學苑 · 早啊早餐店 · 新時代眼鏡 · 得正 · 一成專業影印中心 · ZEISS 173/175 風格店
// Same frame as TEA_SPEC (+x runs west along 中北路, +z away from the street, facade z = 0). Each building
// is its own Kit so it sits on its own ground; none is enterable. TEA_ROW lists [x0, x1, depth] per lot.
// =====================================================================
const TEA_ROW = {
  brunch: [-22.4, -17.2, 11], daimen: [-17.2, -13.0, 11], mai: [-7.4, -0.05, 10],
  zaoa: [6.02, 9.3, 10], newera: [9.3, 13.6, 11], dezheng: [13.6, 18.0, 11], yicheng: [18.0, 21.6, 11], zeiss: [21.6, 30.0, 12],
};
// concrete apron (騎樓 strip) in front of the row, out to the kerb of 中北路 (8.5 m wide, tools/roads.json):
// the facades stand 6.3 m from the street's centre line, 5.9-6.1 m at 大門口 / BRUNCH past the bend
const TEA_APRON = { brunch: 1.65, daimen: 1.65 }, teaApron = (lot) => TEA_APRON[lot] ?? 2.05;
export function teaRowFootprints() {
  const { ox, oz, ang } = TEA_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  const r = (x0, x1, d, a) => [w(x0, -a - 0.2), w(x1, -a - 0.2), w(x1, d + 0.3), w(x0, d + 0.3)];
  const R = TEA_ROW; // the 193巷 between 大門口 and 麥食堂 stays clear
  return [r(R.brunch[0] - 0.2, R.daimen[1] + 0.1, 11, teaApron('brunch')), r(R.mai[0] - 0.1, R.mai[1], 10, teaApron('mai')), r(R.zaoa[0], R.zeiss[1] + 0.2, 12, teaApron('zaoa'))];
}
const sg = (key, w, h, draw) => ctex(key, w, h, draw, false);
const ROWT = {
  // lit shop interior seen through the glass: warm back wall, shelves / counter, ceiling lights
  shop: (key, wall, shelf, seed = 1) => sg('row_' + key, 256, 192, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, '#fff7e4'); gr.addColorStop(0.25, wall); gr.addColorStop(1, '#3a3027');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 192); const r = lcg(seed);
    g.fillStyle = 'rgba(255,255,240,.9)'; for (let x = 20; x < 256; x += 60) g.fillRect(x, 6, 34, 5);
    g.fillStyle = shelf; for (let y = 56; y < 150; y += 30) g.fillRect(8, y, 240, 5);
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${r() * 360 | 0},45%,${45 + r() * 30 | 0}%)`; g.fillRect(10 + r() * 230, 40 + (r() * 4 | 0) * 30, 6 + r() * 8, 14); }
    g.fillStyle = 'rgba(30,24,20,.85)'; g.fillRect(0, 150, 256, 42);
  }),
  shutter: () => ctex('rowShutter', 64, 64, (g) => { // rolling shutter ribs
    g.fillStyle = '#a7acae'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) { g.fillStyle = '#c4c8ca'; g.fillRect(0, y, 64, 3); g.fillStyle = '#868b8e'; g.fillRect(0, y + 6, 64, 2); }
  }),
  brick: () => ctex('rowBrick', 128, 128, (g) => { // red-brown facing tiles (一成)
    g.fillStyle = '#6e2a1e'; g.fillRect(0, 0, 128, 128); const r = lcg(23);
    for (let y = 0; y < 128; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 128; x += 16) { g.fillStyle = `rgb(${150 + r() * 30 | 0},${58 + r() * 16 | 0},${40 + r() * 10 | 0})`; g.fillRect(x + 1, y + 1, 14, 6); }
  }),
  grime: () => ctex('rowGrime', 128, 128, (g) => { // weathered grey concrete (早啊)
    g.fillStyle = '#a19f98'; g.fillRect(0, 0, 128, 128); const r = lcg(31);
    for (let i = 0; i < 60; i++) { const x = r() * 128; g.fillStyle = `rgba(60,58,52,${0.05 + r() * 0.12})`; g.fillRect(x, r() * 40, 2 + r() * 6, 30 + r() * 90); }
  }),
  alWin: () => sg('rowAlWin', 256, 128, (g) => { // aluminium sliding window, no grille
    g.fillStyle = '#d4d6d6'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#566673'; g.fillRect(8, 8, 240, 112);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(14, 12, 40, 104); g.fillRect(134, 12, 26, 104);
    g.fillStyle = '#d4d6d6'; g.fillRect(124, 0, 8, 128);
  }),
  mesh: () => ctex('rowMesh', 64, 64, (g) => { // diamond wire mesh (麥食堂 2F balcony)
    g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(225,228,226,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(1, 1); g.moveTo(64, 64); g.lineTo(63, 63); g.stroke();
  }),
  awning: () => ctex('rowAwning', 64, 64, (g) => { for (let x = 0; x < 64; x += 16) { g.fillStyle = '#2f8a5a'; g.fillRect(x, 0, 8, 64); g.fillStyle = '#e9efe6'; g.fillRect(x + 8, 0, 8, 64); } }),
  // ---- signs ----
  mai: () => sg('rowMai', 1024, 192, (g) => {
    g.fillStyle = '#26356b'; g.fillRect(0, 0, 1024, 192);
    g.fillStyle = '#ffffff'; g.font = `900 120px "Kaiti TC","STKaiti","BiauKai","Noto Serif TC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('麥食堂', 470, 92);
    g.fillStyle = '#e83b3b'; g.beginPath(); g.arc(660, 52, 14, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = font(26, 700); g.fillText('韓式炸雞 · 豆腐煲 · 專門店', 470, 166);
  }),
  maiBanner: () => sg('rowMaiBan', 512, 160, (g) => {
    g.fillStyle = '#d9262c'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#ffe14d'; g.font = font(38); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('歡慶麥食堂3/5正式開幕!!', 16, 34); g.fillStyle = '#ffffff'; g.font = font(32); g.fillText('凡2人同行', 16, 84); g.fillText('限時韓式炸雞免費送', 16, 130);
    g.fillStyle = '#ffffff'; g.fillRect(420, 60, 76, 76); g.fillStyle = '#111'; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i * 7 + j * 3) % 4 < 2) g.fillRect(426 + i * 11, 66 + j * 11, 10, 10);
  }),
  vert: (key, bg, fg, text, sub) => sg('rowV_' + key, 128, 128 * text.length + (sub ? 96 : 0), (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font(100); g.textAlign = 'center'; g.textBaseline = 'middle';
    [...text].forEach((ch, i) => g.fillText(ch, 64, 64 + i * 128));
    if (sub) { g.font = font(22, 700); g.fillText(sub, 64, h - 48); }
  }),
  daimen: () => sg('rowDaimen', 1024, 192, (g) => {
    g.fillStyle = '#3a2d9c'; g.fillRect(0, 0, 1024, 192); g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#f7d23a'; g.font = font(120); g.textAlign = 'left'; g.strokeText('大門口', 20, 82); g.fillStyle = '#ffffff'; g.fillText('大門口', 20, 82);
    g.font = font(34, 700); g.fillText('03-456-6577', 40, 166);
    g.font = font(28, 700); const L = ['· 論文 備審 作品集製作', '· 環裝 膠裝 騎馬釘', '· 文件掃描 護貝', '· 合約書製作'], R = ['· 精裝平裝', '· 大圖輸出', '· 傳單印刷'];
    L.forEach((t, i) => g.fillText(t, 420, 34 + i * 42)); R.forEach((t, i) => g.fillText(t, 790, 34 + i * 42));
  }),
  brunch: () => sg('rowBrunch', 1024, 256, (g) => {
    g.fillStyle = '#3f5670'; g.fillRect(0, 0, 1024, 256);
    // left: orange board with the bunny face and 雪糕 早午餐
    g.fillStyle = '#f2f0ea'; g.fillRect(20, 40, 560, 176); g.fillStyle = '#f08a2c'; g.fillRect(30, 50, 540, 156);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(110, 128, 56, 46, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(80, 64, 12, 30, -0.3, 0, 7); g.ellipse(140, 64, 12, 30, 0.3, 0, 7); g.fill();
    g.fillStyle = '#5a3a1c'; g.beginPath(); g.arc(94, 124, 5, 0, 7); g.arc(126, 124, 5, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = font(96); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('雪 糕', 380, 104); g.font = font(44); g.fillText('早 午 餐', 380, 176);
    // right: BRUNCH 活力早午餐 and the branch phone
    g.font = '900 64px Georgia,serif'; g.fillText('BRUNCH', 800, 70); g.font = font(64); g.fillText('活力早午餐', 800, 148);
    g.fillStyle = '#d9262c'; g.fillRect(660, 192, 280, 44); g.fillStyle = '#fff'; g.font = font(26, 700); g.fillText('中原店 03-2830807', 800, 215);
  }),
  zaoa: () => sg('rowZaoa', 768, 192, (g) => {
    g.fillStyle = '#5b4337'; g.fillRect(0, 0, 768, 192); g.strokeStyle = '#e8ddd0'; g.lineWidth = 4; g.strokeRect(10, 10, 748, 172);
    g.fillStyle = '#ffffff'; g.font = font(92); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('早啊 早餐店', 384, 82);
    g.font = '700 26px Georgia,serif'; g.fillText('MORNING BRUNCH', 300, 156); g.font = font(22, 700); g.fillText('☎ 03-438-8138', 610, 156);
  }),
  newera: () => sg('rowNewEra', 512, 768, (g) => { // the billboard over 2F–3F
    const gr = g.createLinearGradient(0, 0, 512, 768); gr.addColorStop(0, '#dfeef7'); gr.addColorStop(1, '#9cc3dc'); g.fillStyle = gr; g.fillRect(0, 0, 512, 768);
    g.fillStyle = '#6c8aa2'; g.font = font(40); g.textAlign = 'left'; g.fillText('創時代視界', 30, 70); g.font = font(26, 700); g.fillText('洞察每一刻的細節', 30, 114);
    // a woman in glasses, drawn with a few shapes
    g.fillStyle = '#2c2420'; g.beginPath(); g.ellipse(250, 430, 120, 150, 0, 0, 7); g.fill();
    g.fillStyle = '#f2d6c4'; g.beginPath(); g.ellipse(250, 450, 86, 112, 0, 0, 7); g.fill();
    g.fillStyle = '#f4f6f8'; g.beginPath(); g.moveTo(140, 760); g.quadraticCurveTo(250, 560, 380, 760); g.fill();
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 5; g.beginPath(); g.ellipse(214, 438, 30, 22, 0, 0, 7); g.ellipse(290, 438, 30, 22, 0, 0, 7); g.stroke();
    g.fillStyle = '#b5534a'; g.beginPath(); g.ellipse(252, 516, 18, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#f2e96a'; g.beginPath(); g.arc(420, 470, 50, 0, 7); g.fill(); g.fillStyle = '#5a5a40'; g.font = font(26); g.textAlign = 'center'; g.fillText('眼界', 420, 462); g.fillText('升級', 420, 494);
    g.fillStyle = '#1a3f9c'; g.fillRect(440, 20, 56, 56); g.fillStyle = '#fff'; g.font = '900 17px Arial'; g.fillText('ZEISS', 468, 54);
  }),
  newSign: () => sg('rowNewSign', 128, 1024, (g) => {
    g.fillStyle = '#a8456f'; g.fillRect(0, 0, 128, 1024); g.fillStyle = '#ffffff'; g.fillRect(10, 10, 108, 90);
    g.fillStyle = '#a8456f'; g.font = '900 46px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NEW', 64, 56);
    g.fillStyle = '#ffffff'; g.font = font(96); [...'新時代眼鏡'].forEach((ch, i) => g.fillText(ch, 60, 180 + i * 140));
    g.font = font(20, 700); g.fillText('無限創意 專業精神', 64, 900); g.fillText('中原店', 64, 960);
  }),
  posters: () => sg('rowPosters', 512, 256, (g) => { // eyewear posters on the ground floor
    g.fillStyle = '#eef0f2'; g.fillRect(0, 0, 512, 256);
    for (const [x, c] of [[8, '#f6d9e2'], [262, '#dfe9f3']]) {
      g.fillStyle = c; g.fillRect(x, 8, 242, 240); g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(x + 90, 130, 60, 78, 0, 0, 7); g.fill();
      g.fillStyle = '#f1d2c0'; g.beginPath(); g.ellipse(x + 92, 140, 44, 58, 0, 0, 7); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.ellipse(x + 74, 132, 16, 12, 0, 0, 7); g.ellipse(x + 112, 132, 16, 12, 0, 0, 7); g.stroke();
      g.fillStyle = '#c23a4a'; g.font = font(30); g.textAlign = 'center'; g.fillText(x < 200 ? '新·鏡界' : '輕盈無感', x + 190, 120);
    }
  }),
  prize: () => sg('rowPrize', 128, 128, (g) => {
    g.clearRect(0, 0, 128, 128); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = '#f07a2a'; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
    g.fillStyle = '#f07a2a'; g.font = 'italic 900 30px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Prize', 64, 66);
  }),
  dezheng: () => sg('rowDezheng', 1024, 192, (g) => {
    g.fillStyle = '#1f5bb8'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = `900 130px "Kaiti TC","STKaiti","BiauKai","Noto Serif TC",serif`; g.fillText('得', 100, 98); g.fillText('正', 924, 98);
    g.font = 'italic 900 70px Georgia,serif'; g.fillText('OOLONG TEA', 512, 74); g.font = '700 44px Georgia,serif'; g.fillText('PROJECT', 512, 140);
  }),
  dzBanner: () => sg('rowDzBan', 512, 96, (g) => {
    g.fillStyle = '#6b1d1d'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#f2c46d'; g.font = font(52); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('陳皮　烏龍', 256, 50);
  }),
  dzBlade: () => sg('rowDzBlade', 128, 128, (g) => {
    g.fillStyle = '#2a6fd6'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffffff';
    for (const v of [44, 76]) { g.fillRect(v - 6, 20, 12, 88); g.fillRect(20, v - 6, 88, 12); }
  }),
  yicheng: () => sg('rowYicheng', 128, 1152, (g) => { // tall white sign with rounded ends, red text
    g.clearRect(0, 0, 128, 1152); g.fillStyle = '#f7f5f0'; g.beginPath(); g.roundRect(4, 4, 120, 1144, 60); g.fill();
    g.strokeStyle = '#c9c4ba'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#222'; g.font = `900 92px "Kaiti TC","STKaiti","BiauKai","Noto Serif TC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('一', 64, 100); g.fillText('成', 64, 200);
    g.fillStyle = '#d0202a'; g.font = font(96); [...'專業影印中心'].forEach((ch, i) => g.fillText(ch, 64, 330 + i * 136));
  }),
  ycBand: () => sg('rowYcBand', 768, 160, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 768, 160); g.fillStyle = '#d0202a'; g.font = font(54); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('一成專業影印中心', 384, 50);
    g.fillStyle = '#2b5fb0'; g.font = font(24, 700); g.fillText('論文 / 講義 / 彩色輸出 / 大圖海報 / 名片', 384, 102);
    g.fillStyle = '#c62828'; g.fillRect(0, 124, 768, 36); g.fillStyle = '#fff'; g.font = font(22, 700); g.fillText('TEL: 03-4667363 · 03-4667381', 384, 142);
  }),
  zeiss: () => sg('rowZeiss', 1024, 512, (g) => { // the big white banner over the 2F slats
    g.fillStyle = '#fbfbfb'; g.fillRect(0, 0, 1024, 512); g.strokeStyle = '#1f4fa8'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(250, 190); g.lineTo(250, 160); g.lineTo(290, 160); g.moveTo(780, 330); g.lineTo(780, 360); g.lineTo(740, 360); g.stroke();
    g.fillStyle = '#222'; g.font = font(62, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('挑戰想像的極限', 512, 262);
    g.fillStyle = '#666'; g.font = '300 56px Georgia,serif'; g.fillText('175', 110, 70); g.font = '300 24px Georgia,serif'; g.fillText('years', 110, 108);
    g.fillStyle = '#1a3f9c'; g.fillRect(900, 200, 90, 90); g.fillStyle = '#fff'; g.font = '900 24px Arial'; g.fillText('ZEISS', 945, 250);
  }),
  zBand: () => sg('rowZBand', 512, 96, (g) => {
    g.fillStyle = '#6f7f8f'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#1a3f9c'; g.fillRect(20, 14, 120, 68); g.fillStyle = '#fff'; g.font = '900 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ZEISS', 80, 50);
    g.font = font(28, 700); g.fillText('蔡司優視力專家', 300, 50);
  }),
  num: (key, text) => sg('rowNum' + key, 256, 64, (g) => {
    g.clearRect(0, 0, 256, 64); g.fillStyle = '#2a2a2a'; g.font = font(44, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34);
  }),
};
// shared by the 中北路 / 大仁街 shop rows: materials and facade helpers (Kit frame: facade z = 0, street at z < 0)
function rowTools() {
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const MR = {
    mosaic: def('rowMosaic', () => std({ map: YHT.facade(), color: '#e4e4e0' })),
    grime: def('rowGrimeM', () => std({ map: ROWT.grime() })),
    brick: def('rowBrickM', () => std({ map: ROWT.brick() })),
    shutter: def('rowShutterM', () => std({ map: ROWT.shutter(), metalness: 0.3, roughness: 0.55 })),
    awning: def('rowAwningM', () => std({ map: ROWT.awning() })),
    rust: def('rowRust', () => std({ color: '#7a4a2c', roughness: 0.9 })),
    roof: def('rowRoof', () => std({ color: '#b7bcbf', metalness: 0.5, roughness: 0.45 })),
    black: def('rowBlack', () => std({ color: '#1e1e1f', metalness: 0.4, roughness: 0.5 })),
    green: def('rowGreen', () => std({ color: '#4f7f60', metalness: 0.3, roughness: 0.6 })),
    ac: def('rowAC', () => std({ color: '#e4e1d8', roughness: 0.6 })),
    white: def('rowWhite', () => std({ color: '#f3f2ee', roughness: 0.6 })),
    concrete: def('rowConcrete', () => std({ color: '#a3a19b', roughness: 0.95 })),
    plant: def('rowPlant', () => std({ color: '#4c7d3a', roughness: 0.9 })),
    blue: def('rowBlue', () => std({ color: '#2f6db3', roughness: 0.7 })),
  };
  const FRONT = Math.PI; // planes facing the street
  const shopGlass = (k, x0, x1, y0, y1, tex, z = -0.02) => { // lit interior + glass + thin black frame
    k.plane(tex, x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, z, FRONT, { emissive: 0.55 });
    k.box(x0, x1, y1, y1 + 0.06, z - 0.05, 0, MR.black, { col: false });
    for (const x of [x0, x1 - 0.05]) k.box(x, x + 0.05, y0, y1, z - 0.05, 0, MR.black, { col: false });
  };
  const ac = (k, x, y, z = -0.42) => { k.box(x, x + 0.8, y, y + 0.5, z, -0.02, MR.ac, { col: false }); k.box(x + 0.05, x + 0.75, y + 0.06, y + 0.44, z - 0.01, z, '#9a9a94', { col: false }); };
  const win = (k, x, y, w, h, grille = true) => k.plane(grille ? YHT.win() : ROWT.alWin(), w, h, x, y, -0.02, FRONT);
  const blade = (k, tex, x, y, size, out) => { for (const sd of [-1, 1]) k.plane(tex, size, size, x + sd * 0.025, y, -out, sd * Math.PI / 2, { transparent: true, emissive: 0.3 }); k.box(x - 0.03, x + 0.03, y + size / 2 - 0.05, y + size / 2, -out - size / 2, 0, MR.black, { col: false }); };
  const shell = (k, w, d, top, mat, tile = [0.6, 0.6]) => {
    k.box(0, w, -0.8, top, 0, d, mat, { tile });
    k.box(-0.02, w + 0.02, top, top + 0.12, -0.04, d, 'gray', { col: false });
  };
  return { MR, FRONT, shopGlass, ac, win, blade, shell };
}
function buildTeaRow(I, scene) {
  const S = TEA_SPEC, c = Math.cos(S.ang), s = Math.sin(S.ang);
  const at = (lot) => { const [x0] = TEA_ROW[lot]; const k = new Kit(I, S.ox + x0 * c, S.oz + x0 * s, S.ang); k.lot = lot; return k; };
  const width = (lot) => TEA_ROW[lot][1] - TEA_ROW[lot][0];
  const { MR, FRONT, shopGlass, ac, win, blade, shell } = rowTools();
  const kits = {};

  // ---------- 雪糕早午餐 / BRUNCH 活力早午餐 (5 floors, white tile, blue-grey sign band, grey rain hood) ----------
  {
    const k = at('brunch'), w = width('brunch'), d = TEA_ROW.brunch[2], F = 3.0, top = 15; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.1, w - 0.1, 2.5, 3.9, -0.3, 0, '#3f5670', { col: false });
    k.plane(ROWT.brunch(), w - 0.3, 1.32, w / 2, 3.2, -0.31, FRONT, { emissive: 0.3 });
    k.box(-0.05, w + 0.05, 4.2, 4.35, -1.0, 0, '#9aa3ab', { col: false });                      // rain hood over the shopfront
    k.box(-0.05, w + 0.05, 4.0, 4.35, -1.05, -0.95, '#3f5670', { col: false });
    k.plane(ROWT.shutter(), w - 0.6, 0.6, w / 2, 2.15, -0.03, FRONT);                            // shutter half up
    shopGlass(k, 0.3, w - 0.3, 0, 1.85, ROWT.shop('brunch', '#e9c98f', '#7a5a3a', 3));
    k.box(0.6, 1.3, 0, 1.2, -0.7, -0.6, '#f08a2c', { col: false });                               // A-frame menu board
    for (let f = 1; f < 5; f++) { const y = f * F + 1.4; win(k, w / 2, y + 0.85, w - 1.0, 1.5, false); k.box(0.3, w - 0.3, y - 0.05, y + 0.05, -0.15, 0, '#8a96a2', { col: false }); }
    ac(k, w - 1.2, 2 * F + 0.4); ac(k, 0.4, 3 * F + 0.4);
    k.cyl(w / 2, d - 2, 0.6, top + 0.12, top + 1.5, '#d8d8d0', { seg: 12 });                    // water tank
  }
  // ---------- 大門口 影印 (4 floors, white tile, purple sign; side wall with AC units faces the 193巷) ----------
  {
    const k = at('daimen'), w = width('daimen'), d = TEA_ROW.daimen[2], F = 3.2, top = 12.8; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.05, w - 0.05, 2.6, 3.6, -0.32, 0, '#3a2d9c', { col: false });
    k.plane(ROWT.daimen(), w - 0.15, 0.94, w / 2, 3.1, -0.33, FRONT, { emissive: 0.35 });
    k.box(0.1, w - 0.1, 2.3, 2.6, -0.08, 0, '#1d4f5c', { col: false });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('daimen', '#eef2f4', '#8b8f94', 5));
    for (const x of [0.5, w - 0.9]) k.plane(ROWT.vert('dm', '#3a2d9c', '#ffffff', '大門口影印'), 0.36, 1.8, x, 1.15, -0.04, FRONT);
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2, y + 1.55, w - 1.0, 1.4, false); k.box(0.2, w - 0.2, y + 0.75, y + 0.82, -0.18, 0, '#cfcfca', { col: false }); }
    ac(k, w - 1.3, F + 0.4); ac(k, 0.4, 2 * F + 2.2);
    for (const [z, y] of [[2.2, 4.3], [4.6, 4.3], [2.2, 7.5], [5.4, 10.7]]) k.box(w, w + 0.42, y, y + 0.52, z, z + 0.8, MR.ac, { col: false }); // on the lane-side wall
  }
  // ---------- 麥食堂 block: 2 floors with a mesh-caged 2F balcony and a rusty canopy roof over the terrace ----------
  {
    const k = at('mai'), w = width('mai'), d = TEA_ROW.mai[2], top = 6.6; kits[k.lot] = k;
    k.box(0, w, -0.8, 3.0, 0, d, MR.white);                                                     // ground floor
    k.box(0, w, 3.0, top, 1.1, d, MR.white);                                                    // 2F set back behind the balcony
    k.box(0, w, 2.9, 3.15, -0.35, 1.1, MR.concrete, { col: false });                             // balcony slab
    k.box(0, w, 3.15, 3.75, -0.35, -0.2, MR.white, { col: false });                              // parapet
    k.box(0, w, 6.3, top, -0.35, 1.1, MR.white, { col: false });                                 // lintel
    const mesh = k.plane(ROWT.mesh(), w - 0.2, 2.55, w / 2, 5.0, -0.3, FRONT, { transparent: true, double: true });
    mesh.material.map.repeat.set((w - 0.2) / 0.3, 2.55 / 0.3); mesh.material.alphaTest = 0.3; mesh.material.needsUpdate = true;
    for (let x = 0; x <= w + 0.01; x += w / 4) k.box(Math.min(x, w - 0.06), Math.min(x, w - 0.06) + 0.06, 3.75, 6.3, -0.33, -0.27, MR.black, { col: false });
    for (const x of [1.0, 3.2, 5.4]) win(k, x + 0.5, 4.8, 1.6, 1.3, false);
    for (const x of [0.4, 2.5, 4.9]) k.box(x, x + 0.5, 3.75, 4.05, -0.3, -0.05, MR.plant, { col: false }); // potted plants on the parapet
    // roof terrace: back room, railing, rusty corrugated canopy on black posts
    k.box(0, w, top, top + 0.15, 0, d, 'gray', { col: false });
    k.box(0.3, w - 0.3, top + 0.15, top + 2.4, 4.0, d - 0.2, MR.white, { col: false });
    k.box(0, w, top + 0.15, top + 1.1, -0.35, -0.3, MR.white, { col: false });
    k.box(-0.3, w + 0.3, 9.05, 9.12, -0.9, d, MR.rust, { col: false });
    k.box(-0.3, w + 0.3, 9.12, 9.2, -0.9, d, MR.roof, { col: false });
    for (const x of [0, w / 2, w - 0.1]) k.box(x, x + 0.1, top, 9.05, -0.3, -0.2, MR.black, { col: false });
    // east unit (x 0..4.2): 麥食堂 — navy sign, red opening banner, glass front, white vertical sign at the east end
    k.box(0.05, 4.2, 2.35, 2.95, -0.25, 0, '#26356b', { col: false });
    k.plane(ROWT.mai(), 4.1, 0.6, 2.13, 2.65, -0.26, FRONT, { emissive: 0.35 });
    k.plane(ROWT.maiBanner(), 1.5, 0.47, 3.35, 1.95, -0.06, FRONT);
    shopGlass(k, 0.2, 4.1, 0, 2.3, ROWT.shop('mai', '#f4dcae', '#6b3b2a', 9), -0.03);
    k.plane(ROWT.vert('mai', '#ffffff', '#c41d2a', '韓式炸雞', '豆腐煲專門店'), 0.42, 1.95, -0.255, 1.7, -0.345, FRONT);
    k.box(-0.47, -0.04, 0.7, 2.7, -0.34, -0.3, MR.white, { col: false });
    k.box(0, 4.3, 0, 0.16, -0.9, 0, MR.concrete, { col: false, surface: true });                 // two steps up to the door
    k.box(0, 4.3, 0.16, 0.32, -0.45, 0, MR.concrete, { col: false, surface: true });
    // west unit (x 4.3..w): closed shutter under a white wall, round signs
    k.plane(ROWT.shutter(), w - 4.6, 2.5, (4.3 + w) / 2, 1.25, -0.02, FRONT);
    k.box(5.25, 5.8, 2.55, 3.05, -0.08, 0, MR.black, { col: false });                              // small black logo board
  }
  // ---------- 早啊早餐店 (narrow 4-floor old concrete house, grilles, AC units, tin shack on the roof) ----------
  {
    const k = at('zaoa'), w = width('zaoa'), d = TEA_ROW.zaoa[2], F = 3.0, top = 12; kits[k.lot] = k;
    shell(k, w, d, top, MR.grime, [3, 3]);
    k.box(0.05, w - 0.05, 2.45, 3.15, -0.25, 0, '#5b4337', { col: false });
    k.plane(ROWT.zaoa(), w - 0.15, 0.62, w / 2, 2.8, -0.26, FRONT, { emissive: 0.3 });
    k.box(0, w, 2.25, 2.35, -0.8, 0, '#6b4a3a', { col: false });                                  // cloth awning
    shopGlass(k, 0.15, w - 0.95, 0, 2.2, ROWT.shop('zaoa', '#f1e2c4', '#8a6d4c', 11));
    k.plane(YHT.win(), 0.7, 2.1, w - 0.5, 1.05, -0.03, FRONT);                                    // iron gate to the stairs
    k.box(0.4, 1.0, 0, 0.9, -0.5, -0.05, '#3f7a4c', { col: false });                              // crates by the door
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2 + 0.3, y + 1.5, 1.9, 1.3); ac(k, 0.15, y + 0.4); }
    k.box(0.4, w - 0.4, F + 0.75, F + 2.3, -0.45, -0.4, 'metal', { col: false });                // 2F grille cage
    k.box(0.2, w - 0.2, top + 0.12, top + 2.2, 1.2, d - 0.5, MR.roof, { col: false });           // rooftop tin shack
    k.box(0, w, top + 2.2, top + 2.3, 0.6, d, MR.roof, { col: false });
  }
  // ---------- 新時代眼鏡 (billboard over 2F-3F, tall pink sign by 早啊, eyewear posters, Prize disc) ----------
  {
    const k = at('newera'), w = width('newera'), d = TEA_ROW.newera[2], F = 3.1, top = 12.4; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.25, w - 0.1, 3.2, 9.4, -0.45, -0.35, MR.black, { col: false });
    k.plane(ROWT.newera(), w - 0.45, 6.0, (0.25 + w - 0.1) / 2, 6.3, -0.46, FRONT, { emissive: 0.3 });
    for (const y of [4.0, 8.6]) k.box(0.25, w - 0.1, y, y + 0.06, -0.35, 0, 'metal', { col: false });
    k.box(-0.05, 0.5, 2.6, 13.6, -0.75, -0.55, '#a8456f', { col: false });                        // the tall pink sign
    k.plane(ROWT.newSign(), 0.5, 10.9, 0.22, 8.1, -0.76, FRONT, { emissive: 0.35 });
    k.box(0.15, 0.3, 2.6, 13.6, -0.55, 0, MR.black, { col: false });
    k.plane(ROWT.posters(), 2.6, 1.3, w - 1.55, 1.55, -0.03, FRONT);
    k.plane(ROWT.shutter(), 1.2, 2.4, 1.15, 1.2, -0.02, FRONT);
    k.box(0.5, w, 2.4, 2.6, -0.1, 0, MR.white, { col: false });
    blade(k, ROWT.prize(), 0.95, 2.3, 0.6, 0.45);
    win(k, w / 2, 3 * F + 1.5, 2.6, 1.3); ac(k, 0.7, 3 * F + 0.3);
  }
  // ---------- 得正 (white tile with red-brown edging, balcony cages, blue sign and blade) ----------
  {
    const k = at('dezheng'), w = width('dezheng'), d = TEA_ROW.dezheng[2], F = 3.2, top = 12.8; kits[k.lot] = k;
    shell(k, w, d, top, MR.mosaic);
    for (const x of [0, w - 0.18]) k.box(x, x + 0.18, 3.0, top, -0.08, 0, '#8a3a2a', { col: false });
    k.box(0.05, w - 0.05, 2.5, 3.4, -0.3, 0, '#1f5bb8', { col: false });
    k.plane(ROWT.dezheng(), w - 0.15, 0.82, w / 2, 2.95, -0.31, FRONT, { emissive: 0.35 });
    k.plane(ROWT.dzBanner(), 2.4, 0.45, w / 2, 2.15, -0.05, FRONT);
    shopGlass(k, 0.2, w - 0.2, 0, 1.9, ROWT.shop('dezheng', '#efe6d2', '#5b4a35', 13));
    k.cyl(w - 0.7, -0.5, 0.2, 0, 0.5, '#5a4a3a', { seg: 10 }); k.cyl(w - 0.7, -0.5, 0.5, 0.5, 1.6, MR.plant, { r1: 0.25, seg: 8 }); // potted 雞蛋花
    for (let f = 1; f < 4; f++) {
      const y = f * F; win(k, w / 2, y + 1.55, w - 1.2, 1.4);
      k.box(0.35, w - 0.35, y + 0.6, y + 0.68, -0.55, 0, 'metal', { col: false });
      for (let x = 0.35; x <= w - 0.34; x += 0.25) k.box(x, x + 0.03, y + 0.68, y + 2.5, -0.55, -0.52, '#dedfdc', { col: false });
      k.box(0.35, w - 0.35, y + 2.5, y + 2.56, -0.55, 0, 'metal', { col: false });
    }
    blade(k, ROWT.dzBlade(), w - 0.35, 5.6, 0.85, 0.75);
  }
  // ---------- 一成專業影印中心 (red brick, green window cages, fire ladder, tall white sign, green awning) ----------
  {
    const k = at('yicheng'), w = width('yicheng'), d = TEA_ROW.yicheng[2], F = 3.1, top = 12.4; kits[k.lot] = k;
    shell(k, w, d, top, MR.brick, [1.5, 1.5]);
    k.plane(ROWT.ycBand(), w - 0.2, 0.62, w / 2, 2.75, -0.04, FRONT, { emissive: 0.25 });
    k.box(-0.05, w + 0.05, 2.3, 2.38, -1.0, 0, MR.awning, { col: false });
    shopGlass(k, 0.2, w - 0.2, 0, 2.25, ROWT.shop('yicheng', '#f3f3ee', '#7d7f84', 17));
    for (const x of [0.6, 2.6]) k.plane(ROWT.vert('yc', '#ffffff', '#d0202a', '數位影印'), 0.3, 1.2, x, 1.2, -0.05, FRONT);
    for (const [x, z, h] of [[2.9, -0.6, 0.9], [3.0, -1.0, 0.6], [0.3, -0.7, 0.45]]) k.box(x - 0.25, x + 0.25, 0, h, z - 0.2, z + 0.2, MR.blue, { col: false }); // boxes of paper
    for (let f = 1; f < 4; f++) {
      const y = f * F; win(k, w / 2 + 0.3, y + 1.5, 2.2, 1.4);
      k.box(w / 2 - 0.85, w / 2 + 1.45, y + 0.75, y + 2.25, -0.45, -0.4, MR.green, { col: false });
    }
    k.plane(ROWT.yicheng(), 0.72, 6.5, 1.45, 7.3, -0.62, FRONT, { transparent: true, emissive: 0.35 });
    k.box(1.42, 1.48, 3.6, 11.0, -0.6, 0, MR.black, { col: false });
    for (const x of [0.12, 0.52]) k.box(x, x + 0.04, 3.0, top + 0.8, -0.95, -0.91, MR.rust, { col: false }); // fire ladder
    for (let y = 3.2; y < top + 0.8; y += 0.35) k.box(0.12, 0.56, y, y + 0.03, -0.94, -0.92, MR.rust, { col: false });
  }
  // ---------- ZEISS 173 / 175 風格店 (white vertical slats over the upper floors, big banner, glass front) ----------
  {
    const k = at('zeiss'), w = width('zeiss'), d = TEA_ROW.zeiss[2], top = 10.8; kits[k.lot] = k;
    shell(k, w, d, top, MR.white);
    for (let x = 0.1; x < w; x += 0.28) k.box(x, x + 0.08, 3.4, top + 0.8, -0.62, -0.5, MR.white, { col: false });
    k.box(0, w, top + 0.8, top + 0.9, -0.65, 0, MR.white, { col: false });
    k.plane(ROWT.zeiss(), 5.6, 2.8, w / 2 + 0.6, 6.2, -0.64, FRONT, { emissive: 0.2 });
    k.box(0.1, 3.6, 2.6, 3.3, -0.66, -0.1, '#6f7f8f', { col: false });
    k.plane(ROWT.zBand(), 3.5, 0.66, 1.85, 2.95, -0.67, FRONT, { emissive: 0.25 });
    k.box(3.6, w, 2.6, 3.3, -0.66, -0.6, MR.white, { col: false });
    for (let x = 3.7; x < w; x += 0.22) k.box(x, x + 0.06, 2.6, 3.3, -0.7, -0.66, MR.white, { col: false });
    shopGlass(k, 0.15, w - 0.15, 0, 2.55, ROWT.shop('zeiss', '#f6efe3', '#3d3a36', 19));
    k.plane(ROWT.num('173', '173'), 1.2, 0.3, w - 1.2, 2.4, -0.06, FRONT);
    k.plane(ROWT.num('175', '風格店 175'), 1.8, 0.3, 2.6, 2.4, -0.06, FRONT);
  }
  // ---------- concrete apron along the shopfronts (the tea shop has its own deck) ----------
  // (the kerbside 1.8 m of it is 中北路's green walkway, js/map.js: the concrete only fills the rest)
  for (const [lot, a] of Object.entries(TEA_ROW)) {
    const k = kits[lot], w = a[1] - a[0], d = teaApron(lot) - 1.8;
    if (d > 0.05) k.box(-0.01, w + 0.01, -0.5, 0.05, -d, 0, MR.concrete, { col: false, surface: true });
  }
  for (const k of Object.values(kits)) k.finish(scene);
}

// =====================================================================
// 戈登肉鋪 Gordon Meat Shop: 正門對面、大仁街上的兩間透天（OSM f1550 + f1551）合成一間 5 樓的店面。
// 1F 照使用者給的店內照片：黑色招牌（金色 Gordon＋牛頭、白字戈登肉鋪、MEAT·SHOP），整面玻璃落地窗與玻璃門；
// 店內是原木條天花板＋軌道投射燈、右手邊一整面直條木格柵後面藏著波浪形的暖光燈條、
// 黑色臥式冷凍櫃（中間兩台並排一島、右牆兩台、左前一台）、直立冷藏展示櫃、
// 最裡面是白色大理石櫃台（Gordon 字樣）、深色木紋背牆、金色酒櫃，左後方是上 2 樓的樓梯（不開放）。
// Local frame: x along the shop front, z into the shop (0 = glass front); u = W - x is measured from the
// RIGHT wall as you walk in (the LED wave wall), so the layout reads like the photos.
// =====================================================================
export const GD_SPEC = { ids: ['f1550', 'f1551'], ox: -187.38, oz: 117.53, ang: Math.atan2(9.36, 2.85), W: 9.78, D: 17.42, NF: 5, FH: 3.42 };
export function gordonOutline() {
  const { ox, oz, ang, W, D } = GD_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(0, 0), w(W, 0), w(W, D), w(0, D)];
}
export function gordonFootprint() { // + the arcade in front of the glass
  const { ox, oz, ang, W, D } = GD_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(0, -1.4), w(W, -1.4), w(W, D), w(0, D)];
}
const GDT = {
  oak: () => ctex('gdOak', 256, 256, (g) => { // pale grey-oak plank floor (photos 2-5)
    g.fillStyle = '#cfc6b8'; g.fillRect(0, 0, 256, 256); const r = lcg(21);
    for (let y = 0; y < 256; y += 32) {
      const v = 196 + (r() * 22 | 0); g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(0, y, 256, 31);
      for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(120,100,80,${0.06 + r() * 0.08})`; g.lineWidth = 1; g.beginPath(); const yy = y + 3 + r() * 26; g.moveTo(0, yy); g.bezierCurveTo(80, yy + (r() - 0.5) * 6, 170, yy + (r() - 0.5) * 6, 256, yy); g.stroke(); }
      g.fillStyle = 'rgba(80,70,60,0.35)'; g.fillRect(0, y + 31, 256, 1); g.fillRect((r() * 256) | 0, y, 1, 31);
    }
  }),
  pine: () => ctex('gdPine', 128, 256, (g) => { // honey pine of the ceiling and the slats
    g.fillStyle = '#d9a866'; g.fillRect(0, 0, 128, 256); const r = lcg(23);
    for (let i = 0; i < 30; i++) { const x = r() * 128; g.strokeStyle = `rgba(${150 + r() * 40 | 0},${90 + r() * 30 | 0},40,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 20, 90, x + (r() - 0.5) * 20, 170, x + (r() - 0.5) * 14, 256); g.stroke(); }
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(120,70,30,0.35)'; g.beginPath(); g.ellipse(r() * 128, r() * 256, 4 + r() * 4, 2 + r() * 3, 0, 0, 7); g.fill(); }
  }),
  // the wall behind the slats: warm wood with the glowing wave of LED strip (photos 3 and 4)
  wave: () => ctex('gdWave', 1024, 256, (g, w, h) => {
    g.fillStyle = '#7a4f2a'; g.fillRect(0, 0, w, h);
    const r = lcg(29); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(90,50,20,${0.05 + r() * 0.08})`; g.fillRect(r() * w, 0, 1 + r() * 3, h); }
    const wave = (yy, amp, ph) => { g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = yy + Math.sin(x / w * Math.PI * 4 + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
    g.strokeStyle = 'rgba(255,190,100,0.3)'; g.lineWidth = 44; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = 'rgba(255,200,110,0.45)'; g.lineWidth = 24; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = 'rgba(255,214,140,0.7)'; g.lineWidth = 10; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = '#fff3cf'; g.lineWidth = 3; wave(h * 0.52, h * 0.16, 0.6);
    g.strokeStyle = 'rgba(255,214,140,0.5)'; g.lineWidth = 8; wave(h * 0.62, h * 0.1, 2.2);
    g.strokeStyle = '#fff3cf'; g.lineWidth = 2; wave(h * 0.62, h * 0.1, 2.2);
  }, false),
  marble: () => ctex('gdMarble', 256, 128, (g, w, h) => { // white marble with grey veins (counter)
    g.fillStyle = '#ecebe7'; g.fillRect(0, 0, w, h); const r = lcg(31);
    for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(110,110,110,${0.15 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.3) * 60; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  }),
  darkWood: () => ctex('gdDarkWood', 256, 256, (g, w, h) => { // glossy dark walnut panels behind the counter
    g.fillStyle = '#4a3324'; g.fillRect(0, 0, w, h); const r = lcg(37);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(${30 + r() * 40 | 0},${18 + r() * 24 | 0},10,${0.25 + r() * 0.3})`; g.fillRect(0, y, w, 1 + (r() * 2 | 0)); }
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
  }),
  blackMarble: () => ctex('gdBlackMarble', 128, 256, (g, w, h) => {
    g.fillStyle = '#1a1b1d'; g.fillRect(0, 0, w, h); const r = lcg(41);
    for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(220,220,220,${0.1 + r() * 0.2})`; g.lineWidth = 0.5 + r(); g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 50; y += r() * 50; g.lineTo(x, y); } g.stroke(); }
  }),
  // shop sign: black glossy box, gold "Gordon" with a bull's head, white 戈登肉鋪 and — MEAT·SHOP —
  fascia: () => ctex('gdFascia', 2048, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a2a2c'); bg.addColorStop(0.5, '#0d0d0f'); bg.addColorStop(1, '#1d1d20'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < w; x += 9) g.fillRect(x, 0, 2, h);
    const gold = g.createLinearGradient(0, 40, 0, 200); gold.addColorStop(0, '#f6dc94'); gold.addColorStop(1, '#b9913f');
    g.fillStyle = gold; g.textBaseline = 'middle'; g.font = '700 118px Georgia,"Times New Roman",serif'; g.fillText('Gordon', 360, 138);
    gdBull(g, 360 + g.measureText('Gordon').width + 6, 66, 1.05, gold); // the bull's head right after the word
    g.fillStyle = '#f4f2ee'; g.font = '900 104px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('戈 登 肉 鋪', 1000, 112);
    g.font = '600 34px Georgia,serif'; g.fillText('M E A T · S H O P', 1080, 196); g.fillRect(1000, 194, 64, 3); g.fillRect(1420, 194, 64, 3);
    g.font = '700 40px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('中原店', 1700, 200);
  }, false),
  // the "Gordon / MEAT·SHOP" on the counter front and the window decal
  logo: (dark) => ctex('gdLogo' + (dark ? 'D' : 'L'), 512, 192, (g, w, h) => {
    g.clearRect(0, 0, w, h); const c = dark ? '#2a2420' : '#f4f2ee';
    g.fillStyle = c; g.textBaseline = 'middle'; g.font = '700 96px Georgia,"Times New Roman",serif'; g.fillText('Gordon', 30, 92);
    gdBull(g, 30 + g.measureText('Gordon').width + 4, 26, 0.85, c);
    g.font = '600 26px Georgia,serif'; g.fillText('— M E A T · S H O P —', 95, 160);
  }, false),
  // the TV in the window: braised beef rib (photo 1, 喜歡充滿油脂熱湯的朋友一定要買 牛肋條)
  tv: () => ctex('gdTV', 512, 288, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#3a1d14'); bg.addColorStop(1, '#120a08'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8402a'; g.beginPath(); g.ellipse(170, 120, 150, 96, 0, 0, 7); g.fill();
    g.fillStyle = '#efe6d8'; g.beginPath(); g.ellipse(170, 112, 126, 76, 0, 0, 7); g.fill();
    const r = lcg(43); for (let i = 0; i < 16; i++) { g.fillStyle = ['#7a2a1a', '#9a3a22', '#5e1d12'][i % 3]; g.save(); g.translate(90 + r() * 160, 70 + r() * 80); g.rotate(r() * 3); g.fillRect(-20, -11, 40, 22); g.restore(); }
    g.fillStyle = '#fff'; g.font = '700 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('喜歡油脂豐富熱湯的朋友', 24, 250);
    g.fillStyle = '#d26bff'; g.font = '900 40px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('牛肋條', 360, 248);
  }, false),
  zone: (t) => ctex('gdZone' + t, 256, 72, (g, w, h) => { // red/black category signs over the freezers
    g.fillStyle = '#141414'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3202a'; g.fillRect(0, 0, 14, h);
    g.fillStyle = '#fff'; g.font = '900 40px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textBaseline = 'middle'; g.fillText(t, 30, h / 2 + 2);
  }, false),
  cut: () => ctex('gdCut', 256, 256, (g, w, h) => { // 代切 board by the door
    g.fillStyle = '#121212'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8c49a'; g.lineWidth = 4; g.beginPath(); g.arc(128, 104, 66, 0, 7); g.stroke();
    g.fillStyle = '#f2efe8'; g.font = '900 78px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('代切', 128, 106);
    g.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('火鍋・燒烤・牛排客製厚度', 128, 212);
  }, false),
  meat: () => ctex('gdMeat', 256, 128, (g, w, h) => { // vacuum packs seen through the freezer glass
    g.fillStyle = '#e9edf1'; g.fillRect(0, 0, w, h); const r = lcg(47);
    for (let y = 4; y < h; y += 30) for (let x = 4; x < w; x += 44) {
      const c = ['#a8323a', '#c4505a', '#8a262e', '#b8434a', '#d9a6a0', '#9aa3ad'][(r() * 6) | 0];
      g.fillStyle = '#1b1b1b'; g.fillRect(x, y, 40, 26); g.fillStyle = c; g.fillRect(x + 3, y + 3, 34, 18);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 3, y + 3, 34, 3); g.fillStyle = '#f3f0e6'; g.fillRect(x + 26, y + 15, 10, 8);
    }
  }),
};
// little gold bull's head (the Gordon logo): horns, ears, a curled forelock
function gdBull(g, x, y, s, fill) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = fill; g.strokeStyle = fill; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(30, 40); g.quadraticCurveTo(-4, 34, 6, 0); g.stroke();
  g.beginPath(); g.moveTo(90, 40); g.quadraticCurveTo(124, 34, 114, 0); g.stroke();
  g.beginPath(); g.moveTo(30, 40); g.quadraticCurveTo(60, 24, 90, 40); g.quadraticCurveTo(96, 80, 74, 108); g.quadraticCurveTo(60, 118, 46, 108); g.quadraticCurveTo(24, 80, 30, 40); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(60, 62, 12, 0, 7); g.fill(); g.fillStyle = fill; g.beginPath(); g.arc(60, 62, 6, 0, 7); g.fill();
  g.restore();
}
function buildGordon(I, scene) {
  const S = GD_SPEC, W = S.W, D = S.D, F = S.FH, top = F * S.NF, CH = 3.25; // shop ceiling (under the slats)
  const k = new Kit(I, S.ox, S.oz, S.ang), base = k.base;
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set('#fff4e0'); m.emissiveMap = o.map || null; if (!o.map) m.emissive.set(o.color); m.emissiveIntensity = lift; }
    return m;
  };
  const MT = {
    oak: def('gdOak', () => std({ map: GDT.oak(), roughness: 0.45 }, 0.3)),
    pine: def('gdPine', () => std({ map: GDT.pine(), roughness: 0.6 }, 0.35)),
    wave: def('gdWave', () => std({ map: GDT.wave(), emissive: '#ffffff', emissiveMap: GDT.wave(), emissiveIntensity: 0.75 })),
    marble: def('gdMarble', () => std({ map: GDT.marble(), roughness: 0.25 }, 0.3)),
    dark: def('gdDark', () => std({ map: GDT.darkWood(), roughness: 0.2, metalness: 0.1 }, 0.12)),
    bmarble: def('gdBMarble', () => std({ map: GDT.blackMarble(), roughness: 0.2 })),
    black: def('gdBlack', () => std({ color: '#26272b', roughness: 0.5 }, 0.05)),
    rim: def('gdRim', () => std({ color: '#b4b6ba', metalness: 0.6, roughness: 0.35 })),
    white: def('gdWhite', () => std({ color: '#f3f2ee' }, 0.35)),
    meat: def('gdMeatM', () => std({ map: GDT.meat(), roughness: 0.4 }, 0.6)),
    led: def('gdLed', () => new THREE.MeshStandardMaterial({ color: '#5a7bff', emissive: '#4f74ff', emissiveIntensity: 1.6 })),
    warm: def('gdWarm', () => new THREE.MeshStandardMaterial({ color: '#fff2d6', emissive: '#ffd89a', emissiveIntensity: 1.3 })),
    gold: def('gdGold', () => std({ color: '#c9a24e', metalness: 0.8, roughness: 0.3 })),
    stair: def('gdStair', () => std({ color: '#8f8e8a', roughness: 0.75 }, 0.15)),
    plaster: def('gdPlaster', () => std({ color: '#ebe8e1' }, 0.3)),
    facade: def('yhFacade', () => std({ map: YHT.facade() })),
    tint: 'tint',
    glass: def('gdGlass', () => new THREE.MeshStandardMaterial({ color: '#eef4f2', transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0.2, depthWrite: false })),
  };
  // u = distance from the right-hand wall as you walk in
  // (local -x is on your right when you face into the shop, so u = x)
  const bx = (u0, u1, y0, y1, z0, z1, mat, o) => k.box(u0, u1, y0, y1, z0, z1, mat, o);
  const X = (u) => u;
  const off = base - H(...k.w(W / 2, 6)); // the floor is levelled to the building base
  const SD = 12.6;                         // shop depth (storeroom and staff stair beyond)

  // ---------------- shell (5-storey town house, upper floors closed) ----------------
  k.box(0, 0.2, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(W - 0.2, W, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, -0.6, top, D - 0.2, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0, W, top - 0.2, top, 0, D, 'gray', { col: false });
  k.box(0, W, top, top + 0.9, -0.05, 0.15, MT.facade, { col: false, tile: [0.6, 0.6] });
  k.box(0.2, W - 0.2, F + 1.2, top - 0.2, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  for (let f = 1; f < S.NF; f++) {
    const y = f * F;
    for (const cx of [W * 0.27, W * 0.73]) { k.plane(YHT.win(), 2.6, 1.45, cx, y + 1.6, -0.01, Math.PI); k.box(cx - 1.4, cx + 1.4, y + 0.78, y + 0.84, -0.25, 0, MT.rim, { col: false }); }
    if (f < 4) k.box(W / 2 - 0.4, W / 2 + 0.4, y + 0.3, y + 0.85, -0.42, -0.02, '#e6e2d6', { col: false });
  }
  // 1F: black marble piers, glass front with a sliding glass door, black sign box over it
  k.box(0, 0.55, -0.6, F + 1.2, -0.08, 0.2, MT.bmarble, { col: false });
  k.box(W - 0.55, W, -0.6, F + 1.2, -0.08, 0.2, MT.bmarble, { col: false });
  k.box(0.55, W - 0.55, -0.6, 0.06, -0.08, 0.2, MT.bmarble, { col: false });
  const DU0 = 2.0, DU1 = 4.0;                                    // door opening (u), right of centre like the photo
  k.box(0.55, DU0, 0.06, CH - 0.05, 0.06, 0.12, MT.glass);      // glass right of the door
  k.box(DU1, W - 0.55, 0.06, CH - 0.05, 0.06, 0.12, MT.glass);  // glass left of the door
  k.box(DU0, DU1, 2.45, CH - 0.05, 0.06, 0.12, MT.glass);       // transom over the door
  for (const x of [0.6, X(DU1), X(DU0), W - 0.6]) k.box(x - 0.025, x + 0.025, 0.06, CH, 0.04, 0.14, MT.black, { col: false });
  k.box(0.55, W - 0.55, CH - 0.05, F + 0.05, 0.0, 0.2, MT.black, { col: false });
  k.box(0.3, W - 0.3, F - 0.1, F + 1.15, -0.42, 0.0, MT.black, { col: false });  // sign box
  k.plane(GDT.fascia(), W - 0.8, 1.15, W / 2, F + 0.52, -0.425, Math.PI, { emissive: 0.55 });
  k.box(0.3, W - 0.3, F - 0.16, F - 0.1, -0.42, 0, MT.warm, { col: false });      // light line under the sign
  // window dressing: Gordon decal on the glass, TV with 牛肋條, 代切 board, a potted tree outside
  k.plane(GDT.logo(true), 1.5, 0.56, X(DU1 + 1.1), 1.65, 0.05, Math.PI, { transparent: true });
  k.box(X(7.6), X(5.0), 0.55, 2.0, 0.35, 0.42, MT.black, { col: false });
  k.plane(GDT.tv(), 2.5, 1.38, X(6.3), 1.28, 0.345, Math.PI, { emissive: 0.85 });
  k.box(X(6.6), X(6.0), 0.06, 0.55, 0.36, 0.42, MT.black, { col: false });
  k.plane(GDT.cut(), 0.8, 0.8, X(1.0), 1.5, 0.15, Math.PI, { emissive: 0.4 });
  // collision: the glass front (door gap open), the side and back walls of the shop
  k.wallRect(0.2, DU0, 0.04, 0.14, 0, CH); k.wallRect(DU1, W - 0.2, 0.04, 0.14, 0, CH);
  // sliding glass door leaves (part on its own mesh so it can move)
  const leaves = [];
  for (const [sgn, x] of [[-1, DU0 + 0.5], [1, DU1 - 0.5]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.38, 0.03), M(MT.glass)); m.position.set(x, 1.25, 0.0); k.group.add(m);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.38, 0.05), M(MT.black)); fr.position.set(sgn * 0.48, 0, 0); m.add(fr);
    leaves.push({ m, x0: x, sgn });
  }
  // arcade floor in front of the glass
  k.box(0, W, -0.6, 0.04, -1.4, 0, MT.bmarble, { col: false, tile: [0.6, 0.6] });

  // ---------------- 1F shop ----------------
  k.box(0.2, W - 0.2, -0.6, 0.06, 0.2, D - 0.2, MT.oak, { col: false, tile: [1.6, 1.6] });
  I.addSurface(k.rect(0.2, W - 0.2, -1.4, SD), (x, z) => base + 0.06 - H(x, z));
  k.box(0.2, W - 0.2, CH + 0.25, CH + 0.3, 0.2, SD, '#3b2a1c', { col: false });      // dark void above the slats
  k.box(0.2, W - 0.2, 0, F, SD, SD + 0.15, MT.dark);                              // back wall (dark wood)
  // pine slats across the ceiling, track lights hanging between them
  for (let z = 0.3; z < SD; z += 0.24) k.box(0.25, W - 0.25, CH, CH + 0.12, z, z + 0.16, MT.pine, { col: false });
  for (const u of [2.3, 5.0, 7.6]) {
    k.box(X(u) - 0.02, X(u) + 0.02, CH - 0.04, CH, 0.6, SD - 0.4, MT.black, { col: false });
    for (let z = 1.2; z < SD - 0.6; z += 2.2) { k.cyl(X(u), z, 0.06, CH - 0.26, CH - 0.04, MT.black); k.cyl(X(u), z, 0.045, CH - 0.28, CH - 0.25, MT.warm); }
  }
  // right wall (u 0): the LED wave behind vertical pine slats
  bx(0.2, 0.22, 0, CH, 0.2, SD, MT.wave, { col: false });
  k.plane(GDT.wave(), SD - 0.6, CH - 0.1, X(0.23), CH / 2, SD / 2, Math.PI / 2, { emissive: 1.0 }); // faces into the shop (+x)
  for (let z = 0.45; z < SD - 0.2; z += 0.2) bx(0.24, 0.34, 0, CH, z, z + 0.06, MT.pine, { col: false });
  k.wallRect(X(0.36), X(0.2), 0.2, SD, 0, CH);
  // left wall (u W): white, the stair at the back behind a pine screen
  bx(W - 0.21, W - 0.2, 0, CH, 0.2, SD, MT.plaster);
  // freezers: black body, grey rim, curved glass lids, meat packs inside, blue LED on the rim
  const freezer = (u0, u1, z0, z1, sign) => {
    bx(u0, u1, 0.06, 0.82, z0, z1, MT.black);
    bx(u0 + 0.05, u1 - 0.05, 0.62, 0.64, z0 + 0.05, z1 - 0.05, MT.meat, { col: false, tile: [0.9, 0.45] });
    bx(u0, u1, 0.82, 0.88, z0, z0 + 0.05, MT.rim, { col: false }); bx(u0, u1, 0.82, 0.88, z1 - 0.05, z1, MT.rim, { col: false });
    bx(u0, u0 + 0.05, 0.82, 0.88, z0, z1, MT.rim, { col: false }); bx(u1 - 0.05, u1, 0.82, 0.88, z0, z1, MT.rim, { col: false });
    bx(u0 + 0.05, u1 - 0.05, 0.9, 0.92, z0 + 0.05, z1 - 0.05, MT.tint, { col: false });
    bx(u0 + 0.06, u0 + 0.08, 0.84, 0.86, z0 + 0.1, z1 - 0.1, MT.led, { col: false });
    for (let z = z0 + 0.7; z < z1 - 0.3; z += 0.7) bx(u0 + 0.05, u1 - 0.05, 0.88, 0.93, z - 0.02, z + 0.02, MT.rim, { col: false });
    if (sign) { bx(u0 + 0.2, u1 - 0.2, 0.93, 1.25, (z0 + z1) / 2 - 0.02, (z0 + z1) / 2 + 0.02, MT.black, { col: false }); k.plane(GDT.zone(sign), 0.66, 0.19, X((u0 + u1) / 2), 1.1, (z0 + z1) / 2 - 0.03, Math.PI, { emissive: 0.6 }); }
  };
  freezer(0.4, 1.35, 1.2, 3.6, '火鍋區'); freezer(0.4, 1.35, 3.75, 6.15, '燒烤區');    // along the wave wall
  freezer(3.6, 4.6, 3.2, 6.4, '牛排區'); freezer(4.7, 5.7, 3.2, 6.4, '和牛區');        // island (photo 5)
  freezer(W - 1.25, W - 0.3, 1.1, 3.1, '海鮮區');                                    // left front
  // upright chilled display case (left, photo 2)
  bx(W - 1.05, W - 0.3, 0.06, 1.9, 3.5, 4.7, MT.black);
  bx(W - 1.06, W - 0.95, 0.4, 1.75, 3.6, 4.6, MT.glass, { col: false });
  bx(W - 0.95, W - 0.4, 0.5, 1.7, 3.6, 4.6, MT.meat, { col: false, tile: [1.0, 0.6] });
  bx(W - 0.95, W - 0.4, 1.78, 1.82, 3.6, 4.6, MT.warm, { col: false });
  // baskets by the door
  bx(DU1 + 0.3, DU1 + 0.9, 0.06, 0.5, 0.6, 1.0, '#7d8794');
  // counter: white marble with the Gordon logo, black top; walnut wall behind with ring pendants
  const CU0 = 3.0, CU1 = 7.0, CZ0 = 9.9, CZ1 = 10.6;
  bx(CU0, CU1, 0.06, 1.0, CZ0, CZ1, MT.marble, { tile: [1.2, 0.8] });
  bx(CU0 - 0.03, CU1 + 0.03, 1.0, 1.06, CZ0 - 0.04, CZ1 + 0.04, MT.black, { col: false });
  k.plane(GDT.logo(true), 1.4, 0.52, X((CU0 + CU1) / 2), 0.58, CZ0 - 0.005, Math.PI, { transparent: true });
  bx(CU1 - 0.7, CU1 - 0.3, 1.06, 1.4, CZ0 + 0.15, CZ0 + 0.45, MT.black, { col: false });        // POS
  bx(CU0 + 0.5, CU0 + 0.9, 1.06, 1.42, CZ0 + 0.2, CZ0 + 0.24, MT.gold, { col: false });         // price card
  bx(CU0 + 0.3, CU1 + 0.6, 0, 1.0, CZ1, CZ1 + 0.02, MT.black, { col: false });
  k.wallRect(X(CU1 + 0.6), X(CU0), CZ0, SD, 0, 1.1);                                              // nobody walks round behind the till
  bx(CU0 - 0.4, CU1 + 0.6, 0.06, CH, SD - 0.05, SD, MT.dark, { col: false });
  for (const [u, r] of [[4.2, 0.32], [5.4, 0.24], [6.3, 0.3]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 32), M(MT.warm)); ring.rotation.x = Math.PI / 2; ring.position.set(X(u), 2.6 + r * 0.3, 11.4); k.group.add(ring);
    k.box(X(u) - 0.005, X(u) + 0.005, 2.6 + r * 0.3, CH, 11.395, 11.405, MT.black, { col: false });
  }
  // gold wine cabinet left of the counter (photos 2, 5)
  const WU0 = CU1 + 0.15, WU1 = CU1 + 1.15, WZ = 11.6;
  bx(WU0, WU1, 0.06, 0.5, WZ, WZ + 0.4, MT.black);
  for (const y of [0.5, 1.1, 1.7, 2.3]) bx(WU0, WU1, y, y + 0.03, WZ, WZ + 0.4, MT.gold, { col: false });
  for (const u of [WU0, (WU0 + WU1) / 2, WU1 - 0.03]) bx(u, u + 0.03, 0.5, 2.33, WZ, WZ + 0.4, MT.gold, { col: false });
  for (let i = 0; i < 8; i++) { const u = WU0 + 0.2 + (i % 3) * 0.3, y = 1.13 + Math.floor(i / 3) * 0.6; k.cyl(X(u), WZ + 0.2, 0.035, y, y + 0.3, i % 3 ? '#3d0f17' : '#1f3d22'); }
  // stair to 2F at the back left (closed: staff only), behind a pine slat screen
  const SU0 = W - 1.55, SU1 = W - 0.22;
  for (let i = 0; i < 12; i++) { const z = 6.6 + i * 0.5; bx(SU0, SU1, 0, 0.18 * (i + 1), z, z + 0.5, MT.stair, { col: false }); }
  k.wallRect(X(SU1), X(SU0 - 0.05), 6.6, SD, 0, CH);
  for (let z = 5.2; z < SD - 0.1; z += 0.16) bx(SU0 - 0.08, SU0 - 0.02, 0, CH, z, z + 0.05, MT.pine, { col: false });
  bx(SU0 - 0.08, SU0 - 0.02, 0, CH, 5.2, 5.25, MT.pine, { col: false });
  // a stool by the stair (photo 2)
  k.cyl(X(SU0 - 0.5), 5.6, 0.18, 0.7, 0.74, MT.pine); k.cyl(X(SU0 - 0.5), 5.6, 0.02, 0.06, 0.7, MT.black);

  k.finish(scene);
  I.zones.push({ name: '戈登肉鋪', pts: k.rect(0.2, W - 0.2, 0.1, SD), y0: -0.5, y1: CH, ceil: () => CH - 0.1 + off });
  // the glass door slides open when you walk up to it
  const doorAt = k.w(X((DU0 + DU1) / 2), 0.1);
  I.updaters.push((dt, g) => {
    const p = g.player.worldPos(), near = !g.player.vehicle && Math.hypot(p.x - doorAt[0], p.z - doorAt[1]) < 2.8;
    // each leaf slides outward over its side's glass (sgn -1: toward x 0)
    for (const l of leaves) { const tx = l.x0 + (near ? l.sgn * 0.95 : 0); l.m.position.x += (tx - l.m.position.x) * Math.min(1, dt * 6); }
  });
  const at = (u, z) => { const p = k.w(X(u), z); return { x: p[0], z: p[1] }; };
  const keeper = { ...at((CU0 + CU1) / 2, 11.15), y: base + 0.06, h: k.heading(Math.PI) };
  return {
    k, door: doorAt, keeper, base,
    counter: { ...at((CU0 + CU1) / 2, CZ0 - 0.7) },
    freezers: [
      { zone: 'hotpot', ...at(0.9, 2.4), r: 1.5 }, { zone: 'bbq', ...at(0.9, 5.0), r: 1.5 },
      { zone: 'steak', ...at(4.1, 4.8), r: 1.6 }, { zone: 'wagyu', ...at(5.2, 4.8), r: 1.6 },
      { zone: 'sea', ...at(W - 0.8, 2.1), r: 1.5 }, { zone: 'sea', ...at(W - 0.7, 4.1), r: 1.2 },
    ],
  };
}

// =====================================================================
// The corner across 中北路 from 大門口, where 大仁街 leaves 中北路 for the main gate (user's street-view photos).
//   along 中北路 (north side, going west from the corner): 幾何光學 GEOMETRIC OPTICS · 經典數位印刷 JINGDIAN ·
//     神威影印社 shen wei · 藍色美而美
//   along 大仁街 (west side, going towards the gate): 天一影印 / 套房出租 / 天一打字行 in the tall corner building ·
//     菁英 elite 英日語 (billboard on the roof) · 麻友趣 自助桌遊24H
//     (mint-green siding, teal window hoods) · 溫州大餛飩 · LAYA BURGER 拉亞漢堡
// Two frames share the corner point P (where the two facade lines meet): frame A runs east along 中北路 (the
// row sits at x < 0), frame B runs up 大仁街 (x > 0); in both z grows away from the street. The corner
// building is a prism filling the wedge between them (it has no shopfront on 中北路). None is enterable.
// =====================================================================
export const DAREN_SPEC = {
  px: -223.66, pz: 96.45,                     // corner of the two facade lines (6.3 m off 中北路, 4.5 m off 大仁街)
  angA: Math.atan2(-0.354, 0.935),            // +x east along 中北路
  angB: Math.atan2(24.5, 41.3),               // +x up 大仁街 towards the gate
  A: { geo: [-6, 0, 10], jd: [-10.2, -6, 10], sw: [-14, -10.2, 10], blue: [-17.8, -14, 10] }, // stop short of the tower behind (f1525)
  B: { elite: [6, 11.5, 9], mahjong: [11.5, 18.5, 9], wonton: [18.5, 22.8, 9], laya: [22.8, 27, 9] }, // 戈登肉鋪 starts past 30
  cornerB: 6, cornerD: 10.9, apronA: 1.6, apronB: 1.8, // apronA: to the kerb of 中北路 (8.5 m, tools/roads.json)
};
const darenFrame = (ang) => { const c = Math.cos(ang), s = Math.sin(ang), { px, pz } = DAREN_SPEC; return (x, z) => [px + x * c - z * s, pz + x * s + z * c]; };
export function darenFootprints() {
  const S = DAREN_SPEC, a = darenFrame(S.angA), b = darenFrame(S.angB);
  return [
    [a(-17.9, -S.apronA - 0.2), a(0.3, -S.apronA - 0.2), b(0, -S.apronB - 0.2), b(27.2, -S.apronB - 0.2), b(27.2, 9.3), b(S.cornerB, S.cornerD), a(-17.9, 10.3)],
  ];
}
const CT = {
  tianyi: () => sg('cnTianyi', 1024, 192, (g) => {
    g.fillStyle = '#25307a'; g.fillRect(0, 0, 1024, 192);
    const papers = [['#c62d4a', 'PAPAGO'], ['#d86a9c', 'PAPAGO'], ['#3f8fc9', 'PAPAGO']];
    papers.forEach(([c, t], i) => { g.fillStyle = c; g.fillRect(24 + i * 128, 26, 112, 140); g.fillStyle = '#fff'; g.font = 'italic 900 22px Georgia,serif'; g.textAlign = 'center'; g.fillText(t, 80 + i * 128, 102); });
    g.fillStyle = '#ffffff'; g.font = font(96); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('天一影印', 470, 80);
    g.font = '700 34px Georgia,serif'; g.fillText('TEL. 03-416-1671', 520, 158);
  }),
  tianyiBand: () => sg('cnTianyiBand', 1024, 96, (g) => {
    g.fillStyle = '#2f6f68'; g.fillRect(0, 0, 1024, 96); g.fillStyle = '#ffffff'; g.font = font(54); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('天一影印廣場', 30, 50); g.font = '900 50px Arial'; g.fillText('TEL:4161671', 560, 50);
  }),
  tianyiShop: () => sg('cnTianyiShop', 512, 256, (g) => { // dark-blue glass with the service list
    g.fillStyle = '#1d2a6b'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#ffffff'; g.font = font(22, 700); g.textAlign = 'left';
    ['· 論文印刷裝訂', '· 彩色輸出', '· 名片 / 海報', '· 講義 / 考古題', '· 掃描 / 護貝'].forEach((t, i) => g.fillText(t, 300, 40 + i * 42));
    g.fillStyle = '#fbe6b8'; g.fillRect(20, 20, 250, 216); g.fillStyle = '#7a5a3a'; for (let y = 60; y < 236; y += 40) g.fillRect(20, y, 250, 4);
  }),
  suite: () => sg('cnSuite', 256, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#1e3f8a'; g.font = font(54); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('套房出租', 128, 52);
    g.fillStyle = '#c41d2a'; g.font = font(22, 700); g.fillText('0932-xxx-xxx', 128, 104);
  }),
  geo: () => sg('cnGeo', 1024, 256, (g) => {
    g.fillStyle = '#26272b'; g.fillRect(0, 0, 1024, 256);
    g.fillStyle = '#e8a3b4'; g.beginPath(); g.moveTo(40, 210); g.lineTo(210, 210); g.lineTo(210, 40); g.closePath(); g.fill();
    g.fillStyle = '#d8ead2'; g.fillRect(150, 120, 120, 110); g.fillStyle = '#a9d1ec'; g.beginPath(); g.arc(300, 120, 64, 0, 7); g.fill();
    g.fillStyle = '#f2f2f2'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = '500 72px "Helvetica Neue",Arial,sans-serif'; g.fillText('GEOMETRIC', 390, 104); const gw = g.measureText('GEOMETRIC ').width;
    g.font = '300 60px "Helvetica Neue",Arial,sans-serif'; g.fillText('OPTICS', Math.min(390 + gw, 1010 - g.measureText('OPTICS').width), 108);
    g.textAlign = 'right'; g.font = font(44, 700); g.fillText('幾 何 光 學', 1000, 204);
  }),
  geoBlade: () => sg('cnGeoBlade', 256, 256, (g) => {
    g.fillStyle = '#26272b'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#e8a3b4'; g.beginPath(); g.moveTo(30, 200); g.lineTo(130, 200); g.lineTo(130, 90); g.closePath(); g.fill();
    g.fillStyle = '#d8ead2'; g.fillRect(100, 140, 70, 64); g.fillStyle = '#a9d1ec'; g.beginPath(); g.arc(180, 130, 40, 0, 7); g.fill();
    g.fillStyle = '#f2f2f2'; g.font = font(26, 700); g.textAlign = 'center'; g.fillText('幾何光學眼鏡所', 128, 46); g.font = '500 22px Arial'; g.fillText('GEOMETRIC OPTICS', 128, 74);
  }),
  siding: () => ctex('cnSiding', 64, 64, (g) => { g.fillStyle = '#d5d6d3'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) { g.fillStyle = '#bfc0bc'; g.fillRect(0, y + 6, 64, 2); } }),
  pink: () => ctex('cnPink', 128, 128, (g) => { // pink mosaic with a white diamond
    g.fillStyle = '#d8a6a0'; g.fillRect(0, 0, 128, 128); const r = lcg(41);
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) { g.fillStyle = `rgb(${214 + r() * 14 | 0},${160 + r() * 14 | 0},${152 + r() * 12 | 0})`; g.fillRect(x + 1, y + 1, 7, 7); }
  }),
  jd: () => sg('cnJd', 1024, 192, (g) => {
    g.fillStyle = '#1f6fd0'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#ffffff'; g.fillRect(780, 0, 244, 192);
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(40, 30, 130, 130, 20); g.fill(); g.fillStyle = '#1f6fd0'; g.font = '900 120px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('J', 105, 100);
    g.fillStyle = '#ffffff'; g.font = '700 70px "Helvetica Neue",Arial'; g.textAlign = 'left'; g.fillText('JINGDIAN', 200, 70); g.font = font(56); g.fillText('經典數位印刷', 200, 145);
    g.fillStyle = '#1f6fd0'; g.font = font(34); g.textAlign = 'center'; g.fillText('桃園中原店', 900, 70); g.font = '700 26px Arial'; g.fillText('TEL (03)456-0318', 900, 130);
  }),
  jdVert: () => sg('cnJdVert', 192, 1024, (g) => {
    g.fillStyle = '#1f6fd0'; g.fillRect(0, 0, 192, 1024); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(10, 10, 172, 1004);
    g.fillStyle = '#ffffff'; g.font = font(112); g.textAlign = 'center'; g.textBaseline = 'middle'; [...'經典數位印刷'].forEach((ch, i) => g.fillText(ch, 96, 90 + i * 132));
    g.font = font(24, 700); g.fillText('桃園中原店', 96, 900); g.fillText('(03)456-0318', 96, 950);
  }),
  sw: () => sg('cnSw', 1024, 192, (g) => {
    g.fillStyle = '#2b3a9c'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#ffffff'; g.font = font(96); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('神威影印社', 30, 80);
    g.fillStyle = '#4fb3ff'; g.font = 'italic 900 70px Arial'; g.fillText('shen wei', 560, 80); g.fillStyle = '#ffffff'; g.font = font(24, 700); g.fillText('論文 · 彩色 · 大圖 · 裝訂', 40, 160);
  }),
  swVert: () => sg('cnSwVert', 192, 1024, (g) => {
    g.fillStyle = '#1e2b86'; g.fillRect(0, 0, 192, 1024); g.fillStyle = '#ffffff'; g.font = font(120); g.textAlign = 'center'; g.textBaseline = 'middle';
    [...'神威影印社'].forEach((ch, i) => g.fillText(ch, 70, 90 + i * 150)); g.save(); g.translate(150, 520); g.rotate(Math.PI / 2); g.fillStyle = '#4fb3ff'; g.font = 'italic 900 72px Arial'; g.fillText('shen wei', 0, 0); g.restore();
    g.font = font(26, 700); g.fillStyle = '#fff'; g.fillText('中原店', 96, 970);
  }),
  mem: () => sg('cnMem', 768, 192, (g) => {
    g.fillStyle = '#2a63b8'; g.fillRect(0, 0, 768, 192); g.fillStyle = '#ffffff'; g.font = font(84); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('藍色美而美', 384, 82);
    g.font = font(30, 700); g.fillText('早午餐 · 漢堡 · 蛋餅', 384, 158);
  }),
  elite: () => sg('cnElite', 1024, 512, (g) => { // the roof billboard
    g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, 1024, 512); g.fillStyle = '#2d3f9a'; g.fillRect(0, 410, 1024, 102);
    g.fillStyle = '#2d3f9a'; g.font = 'italic 900 150px Georgia,serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('elite', 40, 170);
    g.font = '400 34px Georgia,serif'; g.fillText('Language Academy', 60, 270); g.font = font(56); g.fillText('菁英英日語', 60, 350);
    g.fillStyle = '#e9a23b'; g.beginPath(); g.ellipse(760, 230, 120, 150, 0, 0, 7); g.fill(); g.fillStyle = '#f0cfb2'; g.beginPath(); g.ellipse(760, 200, 62, 78, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(760, 150, 70, 46, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#ffffff'; g.font = font(40); g.fillText('英日文會話', 40, 462); g.font = '900 52px Arial'; g.fillText('(03)426-6300', 560, 462);
  }),
  mahjong: () => sg('cnMahjong', 1024, 192, (g) => {
    g.fillStyle = '#f7eef2'; g.fillRect(0, 0, 1024, 192); g.fillStyle = '#e0457b'; g.fillRect(0, 0, 1024, 14); g.fillRect(0, 178, 1024, 14);
    g.fillStyle = '#f3c33b'; g.beginPath(); g.arc(90, 96, 66, 0, 7); g.fill(); g.fillStyle = '#c41d2a'; g.font = font(44); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('麻友', 90, 98);
    g.fillStyle = '#c41d2a'; g.font = font(78); g.textAlign = 'left'; g.fillText('麻友趣', 190, 96); g.fillStyle = '#e0457b'; g.font = font(92); g.fillText('自助桌遊24H', 470, 96);
  }),
  mjBanner: () => sg('cnMjBan', 1024, 128, (g) => {
    g.fillStyle = '#c8202a'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#ffe14d'; g.font = font(44); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('麻友趣音樂桌遊來回嘍～　不限時段　買一送一', 512, 66);
  }),
  mint: () => ctex('cnMint', 64, 64, (g) => { g.fillStyle = '#b9d3c0'; g.fillRect(0, 0, 64, 64); for (let x = 0; x < 64; x += 8) { g.fillStyle = '#a3c0ab'; g.fillRect(x + 6, 0, 2, 64); } }),
  lattice: () => sg('cnLattice', 128, 128, (g) => { g.fillStyle = '#5c6c74'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f2f2ee'; for (let i = 0; i <= 128; i += 16) { g.fillRect(i - 2, 0, 4, 128); g.fillRect(0, i - 2, 128, 4); } }),
  tarp: () => ctex('cnTarp', 64, 64, (g) => { for (let x = 0; x < 64; x += 16) { g.fillStyle = '#4f8fd0'; g.fillRect(x, 0, 8, 64); g.fillStyle = '#eef3f7'; g.fillRect(x + 8, 0, 8, 64); } }),
  wonton: () => sg('cnWonton', 768, 192, (g) => {
    g.fillStyle = '#f6d23a'; g.fillRect(0, 0, 768, 192); g.strokeStyle = '#c41d2a'; g.lineWidth = 6; g.strokeRect(12, 12, 744, 168);
    g.fillStyle = '#c41d2a'; g.font = `900 104px "Kaiti TC","STKaiti","BiauKai","Noto Serif TC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('溫州大餛飩', 384, 92);
    g.font = font(24, 700); g.fillStyle = '#5a3a1c'; g.fillText('餛飩湯 · 乾拌麵 · 炒飯', 384, 162);
  }),
  laya: () => sg('cnLaya', 768, 192, (g) => {
    g.fillStyle = '#c62026'; g.fillRect(0, 0, 768, 192); g.fillStyle = '#f7c531'; g.beginPath(); g.ellipse(120, 96, 92, 70, 0, 0, 7); g.fill();
    g.fillStyle = '#c62026'; g.font = '900 italic 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LAYA', 120, 84); g.font = '900 22px Arial'; g.fillText('BURGER', 120, 126);
    g.fillStyle = '#ffffff'; g.font = font(96); g.fillText('拉亞漢堡', 470, 96);
  }),
  layaVert: () => sg('cnLayaV', 160, 640, (g) => {
    g.fillStyle = '#f7c531'; g.fillRect(0, 0, 160, 640); g.fillStyle = '#c62026'; g.font = '900 italic 56px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...'LAYA'].forEach((ch, i) => g.fillText(ch, 80, 70 + i * 90)); g.font = '900 30px Arial'; g.fillText('BURGER', 80, 450); g.font = font(40); g.fillText('漢堡', 80, 560);
  }),
};
function buildDarenCorner(I, scene) {
  const S = DAREN_SPEC, { MR, FRONT, shopGlass, ac, win, blade, shell } = rowTools();
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const MC = {
    beige: def('cnBeige', () => std({ map: YHT.facade(), color: '#efe2c4' })),
    siding: def('cnSidingM', () => std({ map: CT.siding() })),
    pink: def('cnPinkM', () => std({ map: CT.pink() })),
    mint: def('cnMintM', () => std({ map: CT.mint() })),
    tarp: def('cnTarpM', () => std({ map: CT.tarp(), roughness: 0.7 })),
    teal: def('cnTeal', () => std({ color: '#4aa597', roughness: 0.5 })),
    eliteBlue: def('cnEliteBlue', () => std({ color: '#2457b5', roughness: 0.6 })),
  };
  const fA = darenFrame(S.angA), fB = darenFrame(S.angB);
  const kits = [];
  const kit = (frame, ang, x0) => { const [x, z] = frame(x0, 0); const k = new Kit(I, x, z, ang); kits.push(k); return k; };
  const lot = (side, name) => { const [x0, x1, d] = S[side][name]; return { k: kit(side === 'A' ? fA : fB, side === 'A' ? S.angA : S.angB, x0), w: x1 - x0, d }; };
  // tall sign standing out from the wall (perpendicular to the facade), readable from both directions of the street
  const tallBlade = (k, tex, x, y0, y1, out, gap = 0.15) => {
    for (const sd of [-1, 1]) k.plane(tex, out, y1 - y0, x + sd * 0.04, (y0 + y1) / 2, -gap - out / 2, sd * Math.PI / 2, { emissive: 0.3 });
    k.box(x - 0.035, x + 0.035, y0, y1, -gap - out, -gap, MR.white, { col: false });
    for (const y of [y0 + 0.3, y1 - 0.3]) k.box(x - 0.02, x + 0.02, y, y + 0.05, -gap, 0, MR.black, { col: false });
  };

  // ---------- the corner building: 6 floors of cream tile, fronting 大仁街 only (天一影印 / 套房出租 / 天一打字行);
  // on 中北路 the first shop is 幾何光學, whose east wall meets this building at the corner point P ----------
  {
    const kA = kit(fA, S.angA, 0), kB = kit(fB, S.angB, 0), top = 19.2, F = 3.2, W = S.cornerB, D = S.cornerD;
    const toA = (bx, bz) => { const [x, z] = fB(bx, bz); return kA.l(x, z); };
    const bb = toA(W, D), dA = S.A.geo[2];
    const pts = [[0, 0], toA(W, 0), bb, [bb[0], dA], [0, dA]];
    kA.prism(pts, -0.8, top, MC.beige);
    kA.prism(pts, top, top + 0.15, 'gray', { shadow: false });
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; kA.wallLine(a[0], a[1], b[0], b[1], 0, top); }
    kB.box(0.8, 4.4, top + 0.15, top + 2.4, 3.0, 7.0, MR.roof, { col: false });                    // tin roof shed
    // 大仁街 face (x 0..W): 天一影印 sign over a teal band and the shop; the 套房出租 stair door at the far end
    kB.box(0.05, W - 0.05, 2.55, 3.45, -0.3, 0, '#25307a', { col: false });
    kB.plane(CT.tianyi(), W - 0.15, 0.85, W / 2, 3.0, -0.31, FRONT, { emissive: 0.35 });
    kB.plane(CT.tianyiBand(), 3.6, 0.34, 2.0, 2.36, -0.04, FRONT, { emissive: 0.25 });
    shopGlass(kB, 0.1, 3.9, 0, 2.15, CT.tianyiShop(), -0.03);
    kB.plane(CT.suite(), 0.9, 0.45, W - 1.0, 2.35, -0.05, FRONT);
    kB.box(4.05, W - 0.1, 0, 2.15, -0.06, 0, '#7fae9a', { col: false });                            // tiled stair entrance
    kB.plane(YHT.win(), 0.9, 2.0, W - 1.0, 1.0, -0.07, FRONT);
    kB.plane(T.verticalText('天一打字行', 'tyType'), 0.34, 1.7, 4.2, 1.1, -0.08, FRONT);
    kB.plane(ROWT.vert('suite', '#ffffff', '#c41d2a', '套房招租中'), 0.32, 1.6, W - 0.2, 1.1, -0.08, FRONT);
    for (let f = 1; f < 6; f++) {
      const y = f * F;
      if (f === 1) { kB.box(0.2, W - 0.2, y + 0.4, y + 2.6, -0.06, 0, 'tint', { col: false }); for (let x = 0.2; x <= W - 0.2; x += 1.12) kB.box(x, x + 0.06, y + 0.4, y + 2.6, -0.1, 0, MR.white, { col: false }); }
      else { win(kB, W / 2, y + 1.5, W - 1.4, 1.4, f > 3); kB.box(0.4, W - 0.4, y + 0.72, y + 0.8, -0.2, 0, MR.white, { col: false }); }
      if (f < 4) ac(kB, W - 1.1, y + 0.05);
    }
    // the part of its east wall that rises above 幾何光學, seen from 中北路: AC units
    for (const [z, y] of [[2.5, 13.6], [6.0, 13.6], [4.0, 16.8]]) kA.box(-0.45, -0.02, y, y + 0.52, z, z + 0.8, MR.ac, { col: false });
  }
  // ---------- 幾何光學 GEOMETRIC OPTICS (grey siding with white diamonds, big black sign, blade sign) ----------
  {
    const { k, w, d } = lot('A', 'geo'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MC.siding, [2, 2]);
    k.box(0.05, w - 0.05, 2.45, 3.9, -0.38, 0, '#26272b', { col: false });
    k.plane(CT.geo(), w - 0.15, 1.36, w / 2, 3.17, -0.39, FRONT, { emissive: 0.3 });
    k.box(0, w, 2.3, 2.45, -0.8, 0, '#3a3b3e', { col: false });                                     // thin canopy
    shopGlass(k, 1.3, w - 0.2, 0, 2.25, ROWT.shop('geo', '#fbf8f2', '#b48a5a', 47));
    k.box(1.6, w - 0.5, 0, 0.02, -0.7, -0.1, '#8a2a2a', { col: false });                            // red door mat
    k.plane(YHT.win(), 0.9, 2.2, 0.65, 1.1, -0.03, FRONT);                                          // steel gate to the stairs (west end)
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2 - 0.4, y + 1.5, 1.4, 1.5, false); win(k, w / 2 + 1.6, y + 1.5, 1.2, 1.1, false); }
    for (let i = 0; i < 4; i++) { const x = 0.9 + i * 1.3, y = 3 * F + 2.65; k.box(x - 0.22, x + 0.22, y - 0.22, y + 0.22, -0.06, 0, MR.white, { col: false }); }
    blade(k, CT.geoBlade(), w - 0.25, 5.6, 1.1, 0.9);
  }
  // ---------- 經典數位印刷 JINGDIAN (pink tile, blue sign, tall blue blade sign) ----------
  {
    const { k, w, d } = lot('A', 'jd'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MC.pink, [1.2, 1.2]);
    k.box(0.05, w - 0.05, 2.45, 3.45, -0.32, 0, '#1f6fd0', { col: false });
    k.plane(CT.jd(), w - 0.15, 0.95, w / 2, 2.95, -0.33, FRONT, { emissive: 0.35 });
    k.plane(ROWT.vert('jd24', '#1f6fd0', '#ffffff', '24H'), 0.3, 0.6, w - 0.4, 1.9, -0.05, FRONT);
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('jd', '#f2f4f6', '#8b8f94', 53));
    for (const [x, z, h] of [[1.0, -0.4, 0.5], [1.5, -0.45, 0.35]]) k.box(x - 0.25, x + 0.25, 0, h, z - 0.2, z + 0.2, '#b58b5a', { col: false });
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2, y + 1.5, w - 1.2, 1.3, f === 1); }
    for (let i = 0; i < 3; i++) { const x = 0.8 + i * 1.3, y = 3 * F + 2.65; k.box(x - 0.2, x + 0.2, y - 0.2, y + 0.2, -0.05, 0, MR.white, { col: false }); }
    tallBlade(k, CT.jdVert(), 0.25, 4.2, 10.6, 1.25);
  }
  // ---------- 神威影印社 shen wei (white tile with iron balconies, dark-blue band and tall blade sign) ----------
  {
    const { k, w, d } = lot('A', 'sw'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.05, w - 0.05, 2.45, 3.4, -0.3, 0, '#2b3a9c', { col: false });
    k.plane(CT.sw(), w - 0.15, 0.9, w / 2, 2.92, -0.31, FRONT, { emissive: 0.35 });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('sw', '#eef0f3', '#7d8086', 59));
    for (let f = 1; f < 4; f++) {
      const y = f * F; win(k, w / 2, y + 1.55, w - 1.0, 1.4);
      k.box(0.3, w - 0.3, y + 0.6, y + 0.68, -0.5, 0, 'metal', { col: false });
      for (let x = 0.3; x <= w - 0.29; x += 0.22) k.box(x, x + 0.03, y + 0.68, y + 1.6, -0.5, -0.47, 'metal', { col: false });
    }
    tallBlade(k, CT.swVert(), w - 0.3, 3.9, 11.6, 1.2);
  }
  // ---------- 藍色美而美 (breakfast shop: blue sign, open front with the griddle) ----------
  {
    const { k, w, d } = lot('A', 'blue'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.05, w - 0.05, 2.45, 3.3, -0.3, 0, '#2a63b8', { col: false });
    k.plane(CT.mem(), w - 0.15, 0.8, w / 2, 2.88, -0.31, FRONT, { emissive: 0.35 });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('mem', '#f7ecd2', '#8a6a44', 79));
    k.box(w - 1.9, w - 0.3, 0, 0.95, -0.8, -0.15, 'steel', { col: false });                          // griddle counter
    k.box(w - 1.8, w - 0.4, 0.95, 0.98, -0.75, -0.2, '#2b2b2b', { col: false });
    for (let f = 1; f < 4; f++) { const y = f * F; win(k, w / 2, y + 1.5, w - 1.2, 1.3, f < 3); if (f < 3) ac(k, 0.3, y + 0.2); }
  }
  // ---------- 菁英 elite 英日語 (3 floors, blue awning, AC units, the billboard on the roof) ----------
  {
    const { k, w, d } = lot('B', 'elite'), F = 3.2, top = 9.6;
    shell(k, w, d, top, MR.white);
    k.box(-0.05, w + 0.05, 2.55, 2.75, -1.1, 0, MC.eliteBlue, { col: false });
    k.box(-0.05, w + 0.05, 2.35, 2.75, -1.15, -1.05, MC.eliteBlue, { col: false });
    shopGlass(k, 0.3, w - 0.3, 0, 2.3, ROWT.shop('elite', '#f1dcb8', '#6b4a2a', 61));
    for (let i = 0; i < 4; i++) ac(k, 0.4 + i * 1.3, F + 0.3 + (i % 2) * 0.7);
    win(k, w / 2, F + 1.9, w - 1.2, 0.9); win(k, w / 2, 2 * F + 1.5, w - 1.2, 1.3, false);
    k.box(0.2, w - 0.2, top + 0.12, top + 4.2, 0.6, 0.75, MR.black, { col: false });               // billboard frame on the roof
    k.plane(CT.elite(), w - 0.4, (w - 0.4) / 2, w / 2, top + 0.12 + (w - 0.4) / 4 + 0.6, 0.58, FRONT, { emissive: 0.3 });
    for (const x of [0.5, w - 0.6]) k.box(x, x + 0.1, top, top + 0.75, 0.6, 1.6, MR.black, { col: false });
    for (const x of [0.8, w - 0.9]) k.box(x, x + 0.08, top + 3.4, top + 3.5, -0.4, 0.6, MR.black, { col: false }); // floodlight arms
  }
  // ---------- 麻友趣 自助桌遊24H (mint siding, teal window hoods, lattice windows, tarp-covered machines) ----------
  {
    const { k, w, d } = lot('B', 'mahjong'), F = 3.2, top = 12.8;
    shell(k, w, d, top, MC.mint, [1, 1]);
    k.box(0, 0.4, 3.0, top, -0.06, 0, MR.brick, { col: false });                  // brick strip at the corner
    k.box(0.05, w - 0.05, 2.5, 3.35, -0.6, -0.3, '#f7eef2', { col: false });
    k.plane(CT.mahjong(), w - 0.15, 0.82, w / 2, 2.93, -0.61, FRONT, { emissive: 0.4 });
    k.box(-0.05, w + 0.05, 3.35, 3.45, -1.4, 0, MR.roof, { col: false });                           // tin roof over the arcade
    k.plane(CT.mjBanner(), 4.6, 0.58, w - 2.6, 2.05, -0.05, FRONT);
    shopGlass(k, 0.4, 2.2, 0, 2.3, ROWT.shop('mj', '#e9f0ea', '#4a6a58', 67));
    for (const x of [3.0, 4.4]) k.box(x, x + 1.2, 0, 1.7, -1.1, -0.2, MC.tarp, { col: false });     // claw machines under tarps
    k.box(5.8, 6.8, 0, 1.1, -0.5, -0.1, '#cfd3d6', { col: false });                                 // drinking-water machine
    for (let f = 1; f < 4; f++) {
      const y = f * F;
      for (const x of [w / 2 - 1.6, w / 2 + 1.6]) {
        k.plane(CT.lattice(), 2.2, 1.6, x, y + 1.5, -0.03, FRONT);
        k.box(x - 1.25, x + 1.25, y + 2.4, y + 2.5, -0.7, 0, MC.teal, { col: false });               // window hood
      }
      if (f < 3) { ac(k, 0.6, y + 0.1, -0.55); ac(k, w - 1.6, y + 0.1, -0.55); }
    }
    k.box(1.2, w - 1.2, top + 0.12, top + 2.6, 2.0, d - 0.5, MR.white, { col: false });             // rooftop room with a gable
    k.plane(CT.lattice(), 1.8, 1.4, w / 2, top + 1.4, 1.98, FRONT);
    k.box(0.9, w - 0.9, top + 2.6, top + 2.75, 1.4, d, MR.roof, { col: false });
  }
  // ---------- 溫州大餛飩 (older 3-floor house, yellow sign, steaming counter) ----------
  {
    const { k, w, d } = lot('B', 'wonton'), F = 3.1, top = 9.3;
    shell(k, w, d, top, MR.grime, [3, 3]);
    k.box(0.05, w - 0.05, 2.45, 3.25, -0.3, 0, '#f6d23a', { col: false });
    k.plane(CT.wonton(), w - 0.15, 0.75, w / 2, 2.85, -0.31, FRONT, { emissive: 0.35 });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('wonton', '#f4e7cf', '#8a6a44', 71));
    k.box(0.5, 2.3, 0, 0.95, -0.9, -0.2, 'steel', { col: false });                      // the cooking counter at the front
    for (const x of [0.9, 1.6]) k.cyl(x, -0.55, 0.22, 0.95, 1.3, 'steel', { seg: 12 });
    k.box(0, w, 2.3, 2.4, -1.0, 0, '#c9c9c4', { col: false });
    for (let f = 1; f < 3; f++) { const y = f * F; win(k, w / 2, y + 1.5, w - 1.2, 1.3); ac(k, 0.3, y + 0.2); }
  }
  // ---------- LAYA BURGER 拉亞漢堡 (red sign, yellow vertical blade) ----------
  {
    const { k, w, d } = lot('B', 'laya'), F = 3.1, top = 9.3;
    shell(k, w, d, top, MR.mosaic);
    k.box(0.05, w - 0.05, 2.45, 3.25, -0.3, 0, '#c62026', { col: false });
    k.plane(CT.laya(), w - 0.15, 0.75, w / 2, 2.85, -0.31, FRONT, { emissive: 0.35 });
    shopGlass(k, 0.2, w - 0.2, 0, 2.3, ROWT.shop('laya', '#fbe9c6', '#c62026', 73));
    for (let f = 1; f < 3; f++) { const y = f * F; win(k, w / 2, y + 1.5, w - 1.2, 1.3, false); ac(k, w - 1.2, y + 0.2); }
    tallBlade(k, CT.layaVert(), w - 0.2, 3.4, 7.2, 0.9);
  }
  // ---------- concrete aprons along both streets ----------
  {
    const kA = kits[0], kB = kits[1];
    // the kerbside 1.8 m along 中北路 is its green walkway (js/map.js): concrete only behind it
    if (S.apronA > 1.85) kA.box(-17.8, 0.3, -0.5, 0.05, -(S.apronA - 1.8), 0, MR.concrete, { col: false, surface: true });
    kB.box(-0.3, 27, -0.5, 0.05, -S.apronB, 0, MR.concrete, { col: false, surface: true });
  }
  for (const k of kits) k.finish(scene);
}

// =====================================================================
// 正門 (中北路): 警衛亭 on the island between the two one-way lanes; enterable, sit and stand guard
// (GUARD_SPECS[0] -> buildGuardhouse with kiosk = MAIN_GATE).
// Google 街景 2017-09 / 2022-08 / 2024-08: a ~3 x 3 m kiosk, rounded front of dark glass toward
// 中北路 over a white-grey dado, an overhanging roof slab with a green roof, on a low kerbed island;
// a clipped-hedge planter with a card reader on the island nose, a CCTV lamp post, a boom across
// each lane at the OSM barrier=lift_gate nodes, yellow-and-white bollards along the exit lane, and the
// name wall's kerbed lawn (js/map.js draws the wall and the spire from MAIN_GATE.wall / spire).
// =====================================================================
// NOTE: tools/build_terrain.py flattens the terrain under the island and the lawn from a copy of
// these numbers; after changing them, sync it and rerun the script.
export const MAIN_GATE = {
  // kiosk centre; local +x runs ENE along the island (mean heading of the two lanes), +z toward the entry lane
  x: -201.2, z: 82.25, ang: Math.atan2(-2.25, 5.2), name: '正門警衛室',
  // OSM node where 中北路 ends at the gate; both one-way lanes start / end there (js/map.js paves them)
  streetNode: 286745347,
  // island outline (local, ~8 m long), >= 5 cm inside both 4.2 m lanes
  island: [[-4.9, 0], [-4, -0.8], [-3, -1.55], [-2.4, -2], [-1.8, -2.05], [2.6, -2.05], [3.1, -1.8], [3.35, -1.2], [3.35, 1.2], [3.1, 1.8],
    [2.6, 2.1], [-2, 2.05], [-2.5, 2], [-3, 1.65], [-4, 0.8]],
  // buildGuardhouse lanes: one boom per lane on the OSM barrier=lift_gate nodes, exit lane (-200.7,77.3)
  // and entry lane (-197.1,85.2). x / from: post (local; the exit lane's on the island, the entry lane's on
  // the far kerb), dir: arm toward -z / +z, len: arm length; yellow housings and warning signs on the arms
  lanes: [
    { x: 2.42, from: -1.88, dir: -1, len: 4.6, post: '#e8b922', signs: ['減速慢行'] },
    { x: 2.59, from: 6.75, dir: -1, len: 4.6, post: '#e8b922', signs: ['減速慢行', '20'] },
  ],
  // bollards along the far edge of the exit lane (local), ~(-206.6,77.2) to (-199.6,74.4)
  bollards: [-2.9, -1.96, -1.02, -0.08, 0.86, 1.8, 2.74, 3.68, 4.62].map(x => [x, x < 2.71 ? -6.79 : -6.77 + (x - 2.71) * 0.12]),
  // world: black granite 校名牆 (axis ESE, faces SSW toward 中北路) on a kerbed lawn (wall-local
  // polygon), twisted stainless spire just off its west end
  wall: { x: -205.2, z: 73.0, ang: 0.35, W: 6, H: 2.9, D: 1.5, lawn: [[-5, -1.4], [3.6, -1.4], [3.6, 1.2], [-5, 2.4]] },
  spire: { x: -209.2, z: 73.0, h: 12.2 },
  // world: forecourt pavers between the grate, the exit lane's outer edge and the lawn (the lanes and the
  // end of 中北路 are paved by js/map.js); ±3 m, Google 衛星圖 / 街景 2024-08 heading 30-40
  forecourt: [[-216, 80], [-213.4, 71.6], [-209.6, 70.9], [-202, 74.9], [-201.56, 75.38], [-206.46, 77.58], [-207.39, 78.41], [-210.99, 84.31], [-212.68, 84.8]],
};
const gateFrame = (s) => { const c = Math.cos(s.ang), sn = Math.sin(s.ang); return (x, z) => [s.x + x * c - z * sn, s.z + x * sn + z * c]; };
// reserved footprints (js/main.js): trees, furniture and spawns keep off the island and the lawn
export function mainGateFootprint() { const w = gateFrame(MAIN_GATE); return MAIN_GATE.island.map(([x, z]) => w(x, z)); }
export function mainGateLawn() { const w = gateFrame(MAIN_GATE.wall); return MAIN_GATE.wall.lawn.map(([x, z]) => w(x, z)); }
// keep-clear spots for street furniture: boom posts and arms, bollards
export function mainGateKeep() {
  const w = gateFrame(MAIN_GATE), out = [];
  for (const ln of MAIN_GATE.lanes) {
    const [px, pz] = w(ln.x, ln.from), [mx, mz] = w(ln.x, ln.from + ln.dir * ln.len / 2);
    out.push({ x: px, z: pz, r: 1.5 }, { x: mx, z: mz, r: ln.len / 2 + 1 });
  }
  for (const [x, z] of MAIN_GATE.bollards) { const [bx, bz] = w(x, z); out.push({ x: bx, z: bz, r: 0.8 }); }
  return out;
}

const GATE_SIGN_MATS = {};
const gateSignMat = (t) => GATE_SIGN_MATS[t] ||= new THREE.MeshStandardMaterial({ map: gateSign(t), roughness: 0.6, transparent: t === '20' });
function gateSign(text) {
  if (text === '20') return ctex('gate20', 128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d0151f'; g.lineWidth = 14; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#111'; g.font = font(58); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('20', 64, 68);
  }, false);
  return T.sign(text, '#ffd23f', '#d0151f', 'gate' + text, 256, 96, 62);
}

// the 正門 kiosk on its island (buildGuardhouse adds the lane booms, the seat action and duty votes);
// k is the kiosk frame (MAIN_GATE). Returns the seat (local), the way the guard faces, the room outline.
function buildMainKiosk(k) {
  const G = MAIN_GATE;
  const ISL = 0.15, Y0 = ISL + 0.1, DADO = ISL + 0.7, TOP = ISL + 2.75;
  // island (walkable) + clipped-hedge planter on its nose
  k.prism(G.island, -0.3, ISL, '#a8a59d', { surface: true, shadow: false });
  const planter = [[-4.45, 0], [-4.25, -0.35], [-3.6, -0.72], [-2.8, -1.12], [-2.1, -1.45], [-1.95, -1.3], [-1.95, 1.3], [-2.1, 1.45], [-2.8, 1.12], [-3.6, 0.72], [-4.25, 0.35]];
  k.prism(planter, ISL, ISL + 0.2, '#a9a69e', { shadow: false });
  k.prism(planter, ISL + 0.2, ISL + 1.0, '#3c6a2e', { bevel: 0.12, inset: 0.08 });
  planter.forEach((p, i) => k.wallLine(...p, ...planter[(i + 1) % planter.length], 0, ISL + 1.0));
  // card reader at the planter's exit-lane corner
  k.box(-2.75, -2.35, ISL, ISL + 0.12, -1.7, -1.3, '#e8e8e4');
  k.box(-2.69, -2.41, ISL + 0.12, ISL + 1.3, -1.64, -1.36, '#f2f2ee');
  k.box(-2.76, -2.7, ISL + 0.9, ISL + 1.15, -1.6, -1.4, 'dark', { col: false });

  // kiosk: half-round front (-x) toward 中北路, straight back with the door (+x) toward the campus
  const R = 1.45, CX = -0.15, BX = 1.6, DOOR = 0.45;
  const plan = (o) => {
    const p = [[BX + o, R + o]];
    for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + i / 8 * Math.PI; p.push([CX + Math.cos(a) * (R + o), Math.sin(a) * (R + o)]); }
    p.push([BX + o, -R - o]); return p;
  };
  k.prism(plan(0), ISL, Y0, 'floor', { surface: true, shadow: false });
  const wl = plan(-0.06);
  const wallRun = (a, b) => {
    k.slab(...a, ...b, 0.12, ISL, DADO, '#dcdad3');
    k.slab(...a, ...b, 0.14, DADO - 0.04, DADO, 'metal', { col: false }); // sill
    k.slab(...a, ...b, 0.03, DADO, TOP, 'tint');
  };
  for (let i = 0; i < wl.length - 1; i++) wallRun(wl[i], wl[i + 1]);
  const bx = BX - 0.06, bz = R - 0.06;
  wallRun([bx, -bz], [bx, -DOOR]); wallRun([bx, DOOR], [bx, bz]);
  k.slab(bx, -DOOR, bx, DOOR, 0.12, ISL + 2.25, TOP, 'metal', { col: false }); // over the door
  for (const [x, z] of [...wl, [bx, -DOOR], [bx, DOOR]]) k.box(x - 0.035, x + 0.035, ISL, TOP, z - 0.035, z + 0.035, 'metal', { col: false });
  // roof slab with a green roof
  k.prism(plan(0.3), TOP, TOP + 0.22, '#e4e2dc');
  k.prism(plan(0.18), TOP + 0.22, TOP + 0.36, '#4a6b35', { bevel: 0.05 });
  {
    // low shrub tufts of a few sizes and tones (no shared RNG: fixed per tuft)
    const tufts = [[-1.2, 0.3], [-0.6, -0.8], [-0.3, 0.9], [0.5, -0.2], [0.9, 0.95], [1.2, -1.0], [-1.0, -0.4], [0.2, 0.5], [-1.45, -0.95], [1.35, 0.25], [-0.2, -1.2], [0.75, -0.75]];
    const tone = ['#3f6230', '#4b6d36', '#56733a'];
    for (let t = 0; t < 3; t++) {
      const geo = mergeGeometries(tufts.filter((_, i) => i % 3 === t).map(([x, z], i) => new THREE.IcosahedronGeometry(0.22 + ((i + t) % 4) * 0.05, 1).scale(1.1 + (i % 2) * 0.25, 0.42 + t * 0.06, 0.9).rotateY(i + t).translate(x, TOP + 0.38, z)), false);
      const m = new THREE.Mesh(geo, M(tone[t])); m.castShadow = true; k.group.add(m);
    }
  }
  k.box(0.2, 1.0, TOP - 0.04, TOP, -0.25, 0.25, 'light', { col: false });
  // lit at night: the tinted glass glows warm from the ceiling light (as the real kiosk does)
  const tint = M('tint');
  k.I.updaters.push((dt, g) => { tint.emissiveIntensity = (g.night || 0) * 0.32; });
  k.plane(T.sign('警衛室', '#1f3b73', '#ffffff', 'guard', 256, 96, 60), 0.9, 0.34, BX + 0.03, ISL + 2.5, 0, Math.PI / 2);
  // desk under the front window with CCTV monitor and phone; the guard faces 中北路
  k.box(-1.05, -0.45, Y0 + 0.72, Y0 + 0.77, -0.85, 0.85, 'desk', { col: false });
  k.box(-1.05, -0.45, Y0, Y0 + 0.72, -0.85, -0.8, 'metal', { col: false }); k.box(-1.05, -0.45, Y0, Y0 + 0.72, 0.8, 0.85, 'metal', { col: false });
  k.wallRect(-1.05, -0.45, -0.85, 0.85, Y0, Y0 + 0.77);
  k.box(-0.95, -0.9, Y0 + 0.77, Y0 + 1.17, -0.32, 0.32, 'dark', { col: false });
  k.plane(T.cctv(), 0.56, 0.36, -0.885, Y0 + 0.97, 0, Math.PI / 2, { emissive: 0.8 });
  k.box(-0.8, -0.6, Y0 + 0.77, Y0 + 0.83, 0.45, 0.7, 'dark', { col: false });
  k.box(-0.18, 0.24, Y0 + 0.45, Y0 + 0.5, -0.22, 0.22, 'dark', { col: false }); k.box(0.22, 0.26, Y0 + 0.5, Y0 + 1.0, -0.22, 0.22, 'dark', { col: false });
  k.cyl(0.03, 0, 0.04, Y0, Y0 + 0.45, 'metal');
  // CCTV lamp post on the exit-lane side, two thin masts behind the kiosk
  k.cyl(-0.75, -1.75, 0.1, ISL, ISL + 8.5, '#dcdcd6', { r1: 0.07, col: true });
  for (const [a, h] of [[0.6, 4.6], [2.6, 4.9], [-1.6, 5.2]]) k.slab(-0.75, -1.75, -0.75 + Math.cos(a) * 0.35, -1.75 + Math.sin(a) * 0.35, 0.16, ISL + h, ISL + h + 0.18, 'dark', { col: false });
  k.box(-0.8, 0.3, ISL + 8.4, ISL + 8.5, -1.8, -1.7, '#dcdcd6', { col: false });
  k.box(0.0, 0.5, ISL + 8.3, ISL + 8.42, -1.85, -1.65, 'light', { col: false });
  for (const z of [-1.0, 1.0]) k.cyl(2.6, z, 0.04, ISL, ISL + 7, '#d9d9d4', { col: true });
  // bollards: white with a yellow head
  for (const [x, z] of G.bollards) { k.cyl(x, z, 0.09, -0.2, 0.75, '#f0f0ec', { col: true }); k.cyl(x, z, 0.095, 0.75, 0.92, '#f2c230'); }
  // the name wall's lawn: grey kerb, grass on top (walkable)
  const lawn = mainGateLawn().map(([x, z]) => k.l(x, z));
  k.prism(lawn, -0.3, 0.13, '#a9a69e', { shadow: false });
  k.prism(lawn, 0.13, 0.16, '#5f8a3e', { inset: 0.14, shadow: false, surface: true });
  return { seat: [0.05, 0], face: -Math.PI / 2, y0: Y0, y1: TOP, pts: plan(0) }; // face the desk and the front window (-x local)
}

// ---------------- entry point ----------------
export function nearestRoadDir(data, x, z) {
  let best = null, bd = 1e9;
  for (const r of data.roads) if (r.drive) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1]; const q = closestOnSeg(x, z, a[0], a[1], b[0], b[1]);
    const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; best = { x: q[0], z: q[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]), w: r.w }; }
  }
  return best;
}
// NOTE: tools/build_terrain.py flattens the terrain under this footprint from a
// copy of these numbers; after changing them, sync it and rerun the script.
export const GUARD_SPECS = (data) => {
  // only two guardhouses: the main gate (replaces the OSM 警衛室 on 中北路) and the 新中北路 side gate
  // 正門: glass kiosk on the island between the two one-way lanes of 中北路, one boom per lane (MAIN_GATE)
  const out = [{ ...MAIN_GATE, main: true }];
  // 新中北路 side entrance by the student activity centre / McDonald's: 全人大道, booth on the east side
  // (the McDonald's building is on the west), gate across the road just inside campus
  const q = nearestRoadDir(data, -91.4, -117);
  if (q) {
    const qang = -Math.sin(q.ang) < 0 ? q.ang + Math.PI : q.ang; // booth side (left normal) must point east
    const qnx = -Math.sin(qang), qnz = Math.cos(qang), qoff = q.w / 2 + 2.2;
    out.push({ x: q.x + qnx * qoff, z: q.z + qnz * qoff, ang: qang, name: '活動中心側門警衛室', gate: { off: qoff, roadW: q.w, sign: '中原大學 新中北路側門', quest: true } });
  }
  return out;
};
export function guardFootprint(s) {
  if (s.main) return mainGateFootprint();
  const c = Math.cos(s.ang), sn = Math.sin(s.ang); const w = (x, z) => [s.x + x * c - z * sn, s.z + x * sn + z * c];
  return [w(-0.6, -0.6), w(5, -0.6), w(5, 3.8), w(-0.6, 3.8)];
}

export function buildInteriors(scene, data, collision) {
  const I = new Interiors(scene);
  const im = buildIM(I, scene);
  const mcd = buildMcD(I, scene);
  I.yh = buildYanlinHome(I, scene);
  I.tea = buildTeaShop(I, scene);
  buildTeaRow(I, scene);
  buildDarenCorner(I, scene);
  I.gordon = buildGordon(I, scene);
  for (const s of GUARD_SPECS(data)) buildGuardhouse(I, scene, s.x, s.z, s.ang, s.name, s.gate || null, s.lanes || null, s.main ? s : null);
  collision.extra = I;
  I.im = im; I.mcd = mcd;
  return I;
}
