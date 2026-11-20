// Enterable buildings: 資管系館 (multi-floor, classrooms, stairs, elevator), 麥當勞 (in 活動中心), 警衛室.
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
  screen: () => ctex('screen', 128, 128, (g) => {
    g.fillStyle = '#16233a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#e62117'; g.beginPath(); g.roundRect(34, 40, 60, 42, 10); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(56, 50); g.lineTo(76, 61); g.lineTo(56, 72); g.closePath(); g.fill();
    g.fillStyle = '#ffd23f'; g.font = font(14); g.textAlign = 'center'; g.fillText('點我看影片', 64, 104);
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
  constructor(I, ox, oz, ang) {
    this.I = I; this.ox = ox; this.oz = oz; this.c = Math.cos(ang); this.s = Math.sin(ang); this.ang = ang;
    this.parts = new Map();
    // render base = terrain at the (flattened) building origin
    this.base = H(ox, oz);
    this.group = new THREE.Group(); this.group.position.set(ox, this.base, oz); this.group.rotation.y = -ang;
  }
  w(lx, lz) { return [this.ox + lx * this.c - lz * this.s, this.oz + lx * this.s + lz * this.c]; }
  l(x, z) { const dx = x - this.ox, dz = z - this.oz; return [dx * this.c + dz * this.s, -dx * this.s + dz * this.c]; }
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
    if (o.surface) this.I.addSurface(this.rect(x0, x1, z0, z1), y1);
    return g;
  }
  wallRect(x0, x1, z0, z1, y0, y1) {
    const p = this.rect(x0, x1, z0, z1);
    for (let i = 0; i < 4; i++) { const a = p[i], b = p[(i + 1) % 4]; this.I.addWall(a[0], a[1], b[0], b[1], y0, y1); }
  }
  wallLine(x0, z0, x1, z1, y0, y1) { const a = this.w(x0, z0), b = this.w(x1, z1); this.I.addWall(a[0], a[1], b[0], b[1], y0, y1); }
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
          I.actions.push({ x: cp[0], z: cp[1], r: 0.75, y: y0, label: () => '按 <kbd>E</kbd> 使用電腦', fn: (g) => g.openVideo() });
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
      liftTarget = next * FH; g.audio.blip(); g.hud.toast(`電梯 → ${next + 1}F`, 'good', 1200);
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
// 警衛室 (main gate on 中北路 + side gate A6): enterable, sit and stand guard
// =====================================================================
function buildGuardhouse(I, scene, x, z, ang, name, gateOpt = null) {
  const k = new Kit(I, x, z, ang);
  const W = 3.4, D = 2.8, H = 2.8;
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
  // boom barrier next to the house
  const arm = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), M('gray')); post.position.set(0, 0.55, 0);
  const barCv = ctex('bar', 128, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : '#d0151f'; g.fillRect(i * 16, 0, 16, 16); } }, true);
  const barMat = new THREE.MeshStandardMaterial({ map: barCv }); barCv.repeat.set(3, 1);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 0.1), barMat); bar.position.set(2.5, 0, 0);
  const hinge = new THREE.Group(); hinge.position.set(0, 1.0, 0); hinge.add(bar);
  arm.add(post, hinge);
  let hingeLX = W + 0.8, hingeLZ = D + 0.8;
  if (gateOpt) {
    // local z < 0 is the road (booth front faces it); the boom swings across the whole lane
    const off = gateOpt.off, rw = gateOpt.roadW, L = rw + 1.9;
    hingeLX = W + 0.7; hingeLZ = -0.55;
    // same striped boom, just longer and turned to point across the lane (Rz lifts it, then Ry swings it to -z)
    bar.geometry = new THREE.BoxGeometry(L, 0.1, 0.1); bar.position.set(L / 2, 0, 0); hinge.rotation.y = Math.PI / 2;
    // gate posts either side of the road + arched sign
    const gx = W + 2.2, zNear = -0.25, zFar = -(off + rw / 2 + 0.6);
    k.box(gx - 0.35, gx + 0.35, 0, 4.6, zNear - 0.7, zNear, 'white'); k.box(gx - 0.35, gx + 0.35, 0, 4.6, zFar, zFar + 0.7, 'white');
    k.box(gx - 0.4, gx + 0.4, 4.6, 4.75, zNear - 0.75, zNear + 0.05, 'gray', { col: false }); k.box(gx - 0.4, gx + 0.4, 4.6, 4.75, zFar - 0.05, zFar + 0.75, 'gray', { col: false });
    k.box(gx - 0.25, gx + 0.25, 4.0, 4.7, zFar + 0.35, zNear - 0.35, 'gray', { col: false });
    const sg = T.sign('中原大學 A6 側門', '#1f3b73', '#ffffff', 'gateA6', 512, 96, 54), span = zNear - zFar - 0.9;
    k.plane(sg, span, 0.62, gx + 0.26, 4.35, (zNear + zFar) / 2, Math.PI / 2);
    k.plane(sg, span, 0.62, gx - 0.26, 4.35, (zNear + zFar) / 2, -Math.PI / 2);
  }
  arm.position.set(hingeLX, 0, hingeLZ); k.group.add(arm);
  k.finish(scene);
  I.zones.push({ name, pts: k.rect(0, W, 0, D), y0: 0, y1: H, ceil: () => H - 0.3 });
  const seat = k.w(1.72, 1.38);
  let duty = 0, dutyVotes = 0;
  I.actions.push({
    x: seat[0], z: seat[1], r: 1.1, y: 0,
    label: (g) => g.player.seat ? '按 <kbd>E</kbd> 起身' : gateOpt ? '按 <kbd>E</kbd> 坐下值班：🚧 門禁任務「別讓怪人進來」' : '按 <kbd>E</kbd> 坐下值班',
    fn: (g) => {
      if (g.player.seat) { g.player.standUp(); g.hud.toast('下班囉', 'good', 1000); return; }
      if (gateOpt && g.gate) { g.player.sitAt(seat[0], seat[1], k.heading(Math.PI)); g.gate.start(gate); return; }
      g.player.sitAt(seat[0], seat[1], k.heading(Math.PI)); // face the desk/window (-z local)
      g.hud.toast('👮 值班中…同學經過會跟你打招呼', 'good', 2200);
    },
  });
  const hingeWorld = k.w(hingeLX, hingeLZ);
  const gate = gateOpt ? (I.gates = I.gates || {})[name] = { k, W, D, off: gateOpt.off, roadW: gateOpt.roadW, barX: hingeLX, seat, forceOpen: false, name } : null;
  I.updaters.push((dt, g) => {
    // barrier opens when the player drives up (or the guard lets a visitor through)
    const p = g.player.worldPos();
    const near = (Math.hypot(p.x - hingeWorld[0], p.z - hingeWorld[1]) < 10 && g.player.vehicle) || gate?.forceOpen;
    hinge.rotation.z += ((near ? 1.4 : 0) - hinge.rotation.z) * Math.min(1, dt * 4);
    if (gate) return; // the side gate's seat runs the gate-check mission instead of idle duty votes
    if (g.player.seat && Math.hypot(g.player.seat.x - seat[0], g.player.seat.z - seat[1]) < 0.1) {
      duty += dt;
      if (duty > 10 && dutyVotes < 8) { duty = 0; dutyVotes++; g.addVotes(1, ['同學：警衛彥霖辛苦了！ +1 票', '同學：怎麼是候選人在值班 XD +1 票', '教官：年輕人很認真喔 +1 票'][dutyVotes % 3]); }
    }
  });
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
  // main gate: replace OSM 警衛室 (中北路 正門); side gate: A6 校門
  const out = [{ x: -201.2, z: 79.6, ang: Math.atan2(78.1 - 79.7, -195.6 + 200.0), name: '正門警衛室' }];
  const a6 = data.pois.find(p => p.name === 'A6校門') || { x: 128.4, z: -14.5 };
  const r = nearestRoadDir(data, a6.x, a6.z);
  const nx = -Math.sin(r.ang), nz = Math.cos(r.ang), off = r.w / 2 + 2.2;
  out.push({ x: a6.x + nx * off, z: a6.z + nz * off, ang: r.ang, name: '側門警衛室', gate: { off, roadW: r.w }, sideCandidate: [a6.x - nx * (off + 3.4), a6.z - nz * (off + 3.4)] });
  return out;
};
export function guardFootprint(s) {
  const c = Math.cos(s.ang), sn = Math.sin(s.ang); const w = (x, z) => [s.x + x * c - z * sn, s.z + x * sn + z * c];
  return [w(-0.6, -0.6), w(5, -0.6), w(5, 3.8), w(-0.6, 3.8)];
}

export function buildInteriors(scene, data, collision) {
  const I = new Interiors(scene);
  const im = buildIM(I, scene);
  const mcd = buildMcD(I, scene);
  for (const s of GUARD_SPECS(data)) buildGuardhouse(I, scene, s.x, s.z, s.ang, s.name, s.gate || null);
  collision.extra = I;
  I.im = im; I.mcd = mcd;
  return I;
}
