// Shared building kit for the hand-built places (js/interiors.js and the area files listed in js/zones.js):
// canvas textures, materials, the Interiors collision world (walls, walkable surfaces, zones, E-key actions),
// Kit (a local-frame builder for one building) and finishRow (Kit.finish for a whole row of shop houses),
// plus the 中北路 / 大仁街 shop-row textures and facade helpers. Moved out of js/interiors.js unchanged.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { freezeStatic } from './freeze.js';
import { pointInPoly, closestOnSeg } from './collision.js';
import { H } from './terrain.js';

// ---------------- textures ----------------
export const TEX = {};
export function ctex(key, w, h, draw, repeat = true) {
  if (TEX[key]) return TEX[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (TEX[key] = t);
}
export const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
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
export const MATS = {};
export function M(key) {
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

// register a ready-made material under a key (js/arena.js builds with Kit from outside this module)
export function regMat(key, m) { if (!MATS[key]) MATS[key] = m; return key; }

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
export class Kit {
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
    m.position.set(x, y, z); m.rotation.y = rotY; m.userData.kitPlane = { tex, o }; this.group.add(m); return m;
  }
  finish(scene, shadow = true) {
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(geo, M(mat));
      mesh.castShadow = shadow && mat !== 'glass'; mesh.receiveShadow = false;
      mesh.matrixAutoUpdate = false; // merged at the group's origin, never moves
      this.group.add(mesh);
    }
    // the building stands still (its other parts, a sliding door say, keep their own matrixAutoUpdate)
    this.group.updateMatrix(); this.group.matrixAutoUpdate = false;
    scene.add(this.group);
  }
}

// ---------------------------------------------------------------------------------------------
// finishRow: Kit.finish for a whole row of buildings that nobody walks into (the 中北路 / 大仁街 shop
// rows). It looks exactly the same, but draws in far fewer pieces:
//  - the plain parts of every building are merged per material across the row (one mesh per colour for
//    the whole row instead of one per colour per building);
//  - the textured planes (signs, shop windows, shutters ...) are baked into the row's world frame and
//    their canvases packed into a texture atlas, one mesh per kind of plane (transparent / glow / sides).
// Planes whose texture is tiled or alpha-tested after k.plane() (the 麥食堂 wire mesh) stay as they were,
// and so does anything else a builder put into k.group (prisms, extra meshes).
// ---------------------------------------------------------------------------------------------
// Each image sits on a 16-pixel grid with 16 px of its own edge colour around it, and the sheet is a power
// of two high: every mipmap level of the sheet then lines up with the image's own, so small text far away
// stays as sharp as it was on its own texture (odd offsets shift and soften it).
const ATLAS_W = 2048, ATLAS_MAX_H = 4096, ATLAS_GAP = 16;
const alignUp = v => Math.ceil(v / ATLAS_GAP) * ATLAS_GAP;
function atlasable(m) {
  const kp = m.userData.kitPlane; if (!kp || !m.visible || m.children.length) return false;
  const mat = m.material, t = kp.tex;
  return mat.map === t && mat.alphaTest === 0 && t.repeat.x === 1 && t.repeat.y === 1 && t.offset.x === 0 && t.offset.y === 0 && t.rotation === 0
    && t.image && t.image.width <= ATLAS_W && t.image.height <= ATLAS_MAX_H;
}
// pack images (unique) into one or more sheets; returns Map image -> { sheet, x, y, w, h }
function packAtlas(images) {
  const list = [...images].sort((a, b) => b.height - a.height || b.width - a.width);
  const sheets = [], at = new Map();
  let sheet = null, x = 0, y = 0, rowH = 0;
  const newSheet = () => { sheet = { items: [], h: 0 }; sheets.push(sheet); x = 0; y = 0; rowH = 0; };
  newSheet();
  for (const img of list) {
    const w = alignUp(img.width) + ATLAS_GAP * 2, h = alignUp(img.height) + ATLAS_GAP * 2; // slot: gap, image, gap
    if (x + w > ATLAS_W) { x = 0; y += rowH; rowH = 0; }
    if (y + h > ATLAS_MAX_H) newSheet();
    const ix = x + ATLAS_GAP, iy = y + ATLAS_GAP;
    sheet.items.push({ img, x: ix, y: iy }); at.set(img, { sheet, x: ix, y: iy, w: img.width, h: img.height });
    x += w; rowH = Math.max(rowH, h); sheet.h = Math.max(sheet.h, y + rowH);
  }
  for (const sh of sheets) {
    const cv = document.createElement('canvas'); cv.width = ATLAS_W; cv.height = 2 ** Math.ceil(Math.log2(Math.max(16, sh.h)));
    const g = cv.getContext('2d'), P = ATLAS_GAP;
    for (const { img, x: X, y: Y } of sh.items) {
      const w = img.width, h = img.height;
      g.drawImage(img, X, Y);
      // repeat the edge pixels into the gap so mipmaps do not pull in the neighbours
      g.drawImage(img, 0, 0, w, 1, X, Y - P, w, P); g.drawImage(img, 0, h - 1, w, 1, X, Y + h, w, P);
      g.drawImage(img, 0, 0, 1, h, X - P, Y, P, h); g.drawImage(img, w - 1, 0, 1, h, X + w, Y, P, h);
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    sh.tex = t; sh.H = cv.height;
  }
  return at;
}
// a MeshStandardMaterial that is nothing but a colour (no textures, opaque, no glow, default render
// state): its key without the colour, or null. The colour then goes into vertex colours (finishRow).
const BASE_COMPILE = THREE.Material.prototype.onBeforeCompile;
function plainKey(m) {
  if (!m || m.type !== 'MeshStandardMaterial' || m.vertexColors || m.transparent || m.opacity !== 1 || m.alphaTest !== 0 || !m.visible) return null;
  if (m.map || m.normalMap || m.roughnessMap || m.metalnessMap || m.emissiveMap || m.aoMap || m.alphaMap || m.bumpMap || m.displacementMap || m.lightMap || m.envMap) return null;
  if (m.emissiveIntensity !== 0 && m.emissive.getHex() !== 0) return null;
  if (!m.depthWrite || !m.depthTest || m.polygonOffset || !m.colorWrite || m.blending !== THREE.NormalBlending || !m.toneMapped || !m.fog || m.flatShading || m.wireframe || m.shadowSide !== null) return null;
  if (m.onBeforeCompile !== BASE_COMPILE || m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) return null;
  return [m.roughness, m.metalness, m.envMapIntensity, m.side].join('|');
}
const PAINTED = new Map(); // shared by every row: one material per kind of surface
function paintedMat(pk, src) {
  let m = PAINTED.get(pk);
  if (!m) PAINTED.set(pk, m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: src.roughness, metalness: src.metalness, envMapIntensity: src.envMapIntensity, side: src.side }));
  return m;
}
export function finishRow(scene, kits, shadow = true) {
  const parts = new Map(); // material key -> geometries in world space
  const planes = [];       // { mesh, matrix }
  for (const k of kits) {
    k.group.updateMatrix();
    for (const [mat, list] of k.parts) {
      const g = mergeGeometries(list, false); g.applyMatrix4(k.group.matrix);
      if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g);
    }
    k.parts.clear();
    for (const m of [...k.group.children]) {
      if (!atlasable(m)) continue;
      m.updateMatrix(); planes.push({ mesh: m, matrix: new THREE.Matrix4().multiplyMatrices(k.group.matrix, m.matrix) });
      k.group.remove(m);
    }
  }
  const out = new THREE.Group(); out.name = 'shopRow';
  // plain colours (most of a row: one material per paint colour) go into one mesh per kind of surface,
  // the colour carried by the vertices; everything else keeps its own material
  const painted = new Map(); // plain key -> geometries with a colour attribute
  for (const [mat, list] of parts) {
    const geo = mergeGeometries(list, false), mt = M(mat), pk = plainKey(mt);
    if (pk && mat !== 'glass') {
      const n = geo.attributes.position.count, c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { c[i * 3] = mt.color.r; c[i * 3 + 1] = mt.color.g; c[i * 3 + 2] = mt.color.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
      if (!painted.has(pk)) painted.set(pk, { src: mt, geos: [] }); painted.get(pk).geos.push(geo);
      continue;
    }
    const mesh = new THREE.Mesh(geo, mt);
    mesh.castShadow = shadow && mat !== 'glass'; mesh.receiveShadow = false; mesh.name = 'row:' + mat;
    out.add(mesh);
  }
  for (const [pk, { src, geos }] of painted) {
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), paintedMat(pk, src));
    mesh.castShadow = shadow; mesh.receiveShadow = false; mesh.name = 'row:painted';
    out.add(mesh);
  }
  // planes: group by everything about the material except the texture
  const at = packAtlas(new Set(planes.map(p => p.mesh.material.map.image)));
  const groups = new Map();
  for (const p of planes) {
    const m = p.mesh.material, A = at.get(m.map.image);
    const key = [A.sheet.tex.uuid, m.transparent, m.emissiveIntensity, m.side, m.depthWrite, m.roughness].join('|');
    if (!groups.has(key)) groups.set(key, { src: m, sheet: A.sheet, geos: [] });
    const g = p.mesh.geometry.clone(); g.applyMatrix4(p.matrix);
    const uv = g.attributes.uv, W = ATLAS_W, H = A.sheet.H;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (A.x + uv.getX(i) * A.w) / W, 1 - (A.y + (1 - uv.getY(i)) * A.h) / H);
    groups.get(key).geos.push(g);
    p.mesh.geometry.dispose(); m.dispose();
  }
  for (const { src, sheet, geos } of groups.values()) {
    const mat = src.clone(); mat.map = sheet.tex; if (src.emissiveMap) mat.emissiveMap = sheet.tex;
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat); mesh.name = 'row:planes';
    out.add(mesh);
  }
  scene.add(out);
  for (const k of kits) if (k.group.children.length) scene.add(k.group);
  // a row never moves (that is what finishRow is for): matrices once, not every frame
  freezeStatic(out); for (const k of kits) if (k.group.parent) freezeStatic(k.group);
  return out;
}


// ---------------- shared by several builders ----------------
// small seeded generator (麥當勞 tiles, 街屋 signs ...)
export const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

// textures of 孫師傅 / 彥霖家 (js/interiors.js buildYanlinHome); the 中北路 / 大仁街 shop rows reuse the facade mosaic
export const YHT = {
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

// ---------------- 中北路 / 大仁街 shop rows: sign textures and facade helpers ----------------
export const sg = (key, w, h, draw) => ctex(key, w, h, draw, false);
export const ROWT = {
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
export function rowTools() {
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
