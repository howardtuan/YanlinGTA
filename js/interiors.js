// Enterable buildings: 資管系館 (multi-floor, classrooms, stairs, elevator), 麥當勞 (in 活動中心), 警衛室.
// Provides height-aware walls, walkable surfaces (floors/stairs) and E-key actions.
// All y values here are relative to the building's ground; tools/build_terrain.py
// flattens the terrain around each footprint so that ground is one constant height.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { pointInPoly, closestOnSeg } from './collision.js';
import { createCharacter } from './character.js';
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
  mcFloor: () => ctex('mcfloor', 128, 128, (g) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#7a2a22' : '#e9e2d4'; g.fillRect(x * 32, y * 32, 32, 32); }
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
  mcMenu: () => ctex('mcmenu', 1024, 256, (g) => {
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, 1024, 256);
    const items = [['大麥克套餐', '$155'], ['麥香雞套餐', '$125'], ['麥克雞塊 6塊', '$69'], ['薯條 大', '$65'], ['可樂 中', '$38'], ['冰炫風', '$59']];
    items.forEach(([n, p], i) => {
      const x = 20 + (i % 3) * 335, y = 20 + Math.floor(i / 3) * 118;
      g.fillStyle = '#c8102e'; g.fillRect(x, y, 320, 100);
      g.fillStyle = '#ffc72c'; g.beginPath(); g.arc(x + 50, y + 50, 34, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = font(32); g.fillText(n, x + 96, y + 46); g.fillStyle = '#ffc72c'; g.font = font(30, 800); g.fillText(p, x + 96, y + 84);
    });
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
    mcFloor: () => std({ map: T.mcFloor(), roughness: 0.5 }),
    door: () => std({ color: '#b0353c' }),
    glass: () => new THREE.MeshStandardMaterial({ color: '#9fd3e6', transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.3, depthWrite: false }),
    metal: () => std({ color: '#8d9196', metalness: 0.7, roughness: 0.35 }),
    desk: () => std({ color: '#cfa774' }),
    chairBlue: () => std({ color: '#3f6fb5' }),
    dark: () => std({ color: '#2b2b2b' }),
    light: () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff8e6', emissiveIntensity: 0.9 }),
    board: () => std({ map: T.board(), roughness: 0.9 }),
    solar: () => std({ color: '#1d2f5a', metalness: 0.6, roughness: 0.3 }),
    mcRed: () => std({ color: '#c8102e' }),
    mcYellow: () => std({ color: '#ffc72c' }),
    mcWood: () => std({ color: '#8b5a35' }),
    steel: () => std({ color: '#c9ccd0', metalness: 0.8, roughness: 0.25 }),
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
function buildMcD(I, scene) {
  const S = MCD_SPEC; const k = new Kit(I, S.x0, S.z0, 0);
  const W = S.x1 - S.x0, D = S.z1 - S.z0, H = S.H;
  k.box(0, W, 0, 0.1, 0, D, 'mcFloor', { col: false, surface: true, tile: [1.2, 1.2] });
  // walls: west solid (kitchen), north & south walls, east glass front with door
  k.box(0, 0.3, 0, H, 0, D, 'white');
  k.box(0, W, 0, H, 0, 0.3, 'white');
  k.box(0, W, 0, H, D - 0.3, D, 'winWall', { tile: [3.2, H] });
  k.box(W - 0.15, W, 0, 1.0, 0, D, 'mcRed', { col: false });
  k.box(W - 0.15, W, 0, H, 0, 7.5, 'glass'); k.box(W - 0.15, W, 0, H, 12.5, D, 'glass');
  k.box(W - 0.15, W, 2.6, H, 7.5, 12.5, 'glass', { col: false });
  for (const z of [0, 7.5, 12.5, D]) k.box(W - 0.25, W + 0.05, 0, H, z - 0.12, z + 0.12, 'mcRed', { col: false });
  // facade band + upper floors of 活動中心
  k.box(-0.05, W + 0.4, H, H + 1.2, -0.05, D + 0.05, 'mcRed', { col: false });
  k.plane(T.mcLogo(), 6, 3, W + 0.42, H + 0.6, D / 2, Math.PI / 2, { emissive: 0.4 });
  k.box(0, W, H + 1.2, S.top, 0, D, 'sac', { col: false });
  k.box(0, W, H - 0.1, H, 0, D, 'white', { col: false }); // ceiling
  // counter, menu, kitchen
  k.box(3.2, 4.2, 0, 1.1, 3, 17, 'mcRed'); k.box(3.1, 4.3, 1.1, 1.18, 3, 17, 'steel', { col: false });
  for (const z of [6, 10, 14]) k.box(3.4, 3.8, 1.18, 1.5, z, z + 0.5, 'dark', { col: false });
  k.plane(T.mcMenu(), 12, 3, 0.32, 3.0, 10, Math.PI / 2, { emissive: 0.6 });
  k.box(0.3, 2.2, 0, 1.0, 2, 18, 'steel', { col: false });
  for (let lx = 6; lx < W - 1; lx += 4) for (let lz = 3; lz < D - 1; lz += 5) k.box(lx, lx + 1.2, H - 0.32, H - 0.28, lz, lz + 0.6, 'light', { col: false });
  // tables with red/yellow seats
  for (let tx = 8; tx < W - 3; tx += 4) for (let tz = 3; tz < D - 2; tz += 4) {
    k.box(tx, tx + 1.2, 0.72, 0.78, tz, tz + 1.2, 'mcWood', { col: false });
    k.box(tx + 0.5, tx + 0.7, 0, 0.72, tz + 0.5, tz + 0.7, 'metal', { col: false });
    k.wallRect(tx, tx + 1.2, tz, tz + 1.2, 0, 0.78);
    for (const [cx, cz, c] of [[tx - 0.6, tz + 0.4, 'mcYellow'], [tx + 1.4, tz + 0.4, 'mcRed']]) k.box(cx, cx + 0.4, 0.4, 0.46, cz, cz + 0.4, c, { col: false });
  }
  // pole sign outside
  k.box(W + 4, W + 4.3, 0, 7, D + 1, D + 1.3, 'metal', { col: false });
  k.wallRect(W + 4, W + 4.3, D + 1, D + 1.3, 0, 7);
  const pole = k.plane(T.mcLogo(), 3.2, 1.6, W + 4.15, 7.6, D + 1.15, Math.PI / 2, { emissive: 0.5, double: true });
  k.finish(scene);
  I.zones.push({ name: '麥當勞 中原店', pts: k.rect(0, W, 0, D), y0: 0, y1: H, ceil: () => H - 0.4 });
  // staff
  const staff = createCharacter({ skin: '#efd0b5', shirt: '#c8102e', shorts: '#222', pants: true, hair: '#1a1410', hairStyle: 'pony', face: true, shoes: '#222' });
  const sp = k.w(2.4, 10); staff.root.position.set(sp[0], k.base, sp[1]); staff.root.rotation.y = k.heading(Math.PI / 2);
  scene.add(staff.root);
  I.updaters.push((dt) => staff.update(dt, { speed: 0 }));
  let ordered = false;
  const cp = k.w(5.0, 10);
  I.actions.push({
    x: cp[0], z: cp[1], r: 2.6, y: 0, label: () => '按 <kbd>E</kbd> 點餐',
    fn: (g) => {
      // 大麥克套餐 NT$155 (menu board price): earn more by working the counter (staff entrance behind it)
      if (g.money < 155) {
        g.dialog([['麥當勞店員', '歡迎光臨！大麥克套餐一份 155 元～'], ['彥霖', '（翻錢包）……只剩 ' + g.money + ' 元 😅'],
          ['麥當勞店員', '我們有在徵打工喔！從櫃檯旁邊繞到後面的員工入口，按 E 就能上班。']]);
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
  // part-time job: staff entrance behind the counter (walk round its north end), work spot next to the
  // crew member, customers step up on the other side of the counter (see mcjob.js)
  const se = k.w(2.4, 18.4);
  I.mcJob = { work: k.w(2.4, 7.2), workH: k.heading(Math.PI / 2), cust: k.w(5.3, 7.2), custH: k.heading(-Math.PI / 2), base: k.base };
  I.actions.push({
    x: se[0], z: se[1], r: 1.5, y: 0, label: () => '按 <kbd>E</kbd> 上班打工（時薪 NT$196）',
    fn: (g) => g.job.start(),
  });
  k.plane(T.mcStaff(), 1.4, 0.45, 0.33, 2.4, 18.4, Math.PI / 2, { emissive: 0.5 });
  return { entrance: k.w(W + 3, 10) };
}

// =====================================================================
// 警衛室 (main gate on 中北路 + side gate A6): enterable, sit and stand guard
// =====================================================================
function buildGuardhouse(I, scene, x, z, ang, name) {
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
  arm.add(post, hinge); arm.position.set(W + 0.8, 0, D + 0.8); k.group.add(arm);
  k.finish(scene);
  I.zones.push({ name, pts: k.rect(0, W, 0, D), y0: 0, y1: H, ceil: () => H - 0.3 });
  const seat = k.w(1.72, 1.38);
  let duty = 0, dutyVotes = 0;
  I.actions.push({
    x: seat[0], z: seat[1], r: 1.1, y: 0,
    label: (g) => g.player.seat ? '按 <kbd>E</kbd> 起身' : '按 <kbd>E</kbd> 坐下值班',
    fn: (g) => {
      if (g.player.seat) { g.player.standUp(); g.hud.toast('下班囉', 'good', 1000); return; }
      g.player.sitAt(seat[0], seat[1], k.heading(Math.PI)); // face the desk/window (-z local)
      g.hud.toast('👮 值班中…同學經過會跟你打招呼', 'good', 2200);
    },
  });
  const hingeWorld = k.w(W + 0.8, D + 0.8);
  I.updaters.push((dt, g) => {
    // barrier opens when a vehicle is near
    const p = g.player.worldPos();
    const near = Math.hypot(p.x - hingeWorld[0], p.z - hingeWorld[1]) < 10 && g.player.vehicle;
    hinge.rotation.z += ((near ? 1.4 : 0) - hinge.rotation.z) * Math.min(1, dt * 4);
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
  out.push({ x: a6.x + nx * off, z: a6.z + nz * off, ang: r.ang, name: '側門警衛室', sideCandidate: [a6.x - nx * (off + 3.4), a6.z - nz * (off + 3.4)] });
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
  for (const s of GUARD_SPECS(data)) buildGuardhouse(I, scene, s.x, s.z, s.ang, s.name);
  collision.extra = I;
  I.im = im; I.mcd = mcd;
  return I;
}
