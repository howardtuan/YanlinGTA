// Runs the game's own building code in node, with the real Interiors (collision walls, walkable surfaces) and the real Kit,
// so the plan is drawn from exactly what the game builds. Nothing is rendered: canvases are stand-ins that only remember
// the text written on them (door numbers, signs), which is how the labels on doors are read back.
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
register('./hooks.mjs', import.meta.url);

// ---------------- stand-in DOM ----------------
function fakeCanvas() {
  const cv = { width: 300, height: 150, style: {}, texts: [], isFakeCanvas: true, toDataURL: () => '', addEventListener() {}, removeEventListener() {} };
  const state = { tx: 0, ty: 0, sx: 1, sy: 1 }, stack = [], props = { canvas: cv, font: '10px sans-serif' };
  const grad = { addColorStop() {} };
  const fns = {
    fillText: (t, x, y) => cv.texts.push({ text: String(t), x: state.tx + x * state.sx, y: state.ty + y * state.sy }),
    strokeText: () => {},
    measureText: (t) => ({ width: [...String(t)].reduce((s, ch) => s + (ch.charCodeAt(0) > 255 ? 1 : 0.56), 0) * (parseFloat((props.font.match(/(\d+(?:\.\d+)?)px/) || [0, 10])[1])), actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    save: () => stack.push({ ...state }), restore: () => Object.assign(state, stack.pop() || {}),
    translate: (x, y) => { state.tx += x * state.sx; state.ty += y * state.sy; }, scale: (x, y) => { state.sx *= x; state.sy *= y; },
    setTransform: () => { state.tx = state.ty = 0; state.sx = state.sy = 1; }, resetTransform: () => { state.tx = state.ty = 0; state.sx = state.sy = 1; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad, createPattern: () => ({}),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
    getLineDash: () => [], isPointInPath: () => false,
  };
  const ctx = new Proxy(props, { get: (o, p) => (p in fns ? fns[p] : p in o ? o[p] : (typeof p === 'string' ? () => {} : undefined)), set: (o, p, v) => { o[p] = v; return true; } });
  cv.getContext = () => ctx;
  return cv;
}
function fakeElement(tag) {
  const el = { tagName: String(tag).toUpperCase(), style: {}, dataset: {}, children: [], classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { this.children.push(c); return c; }, removeChild() {}, remove() {}, setAttribute() {}, getAttribute: () => null, addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 }) };
  return el;
}
function installDom() {
  const def = (k, v) => { if (!(k in globalThis)) Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true }); };
  const doc = { createElement: (t) => (String(t).toLowerCase() === 'canvas' ? fakeCanvas() : fakeElement(t)), createElementNS: (ns, t) => (String(t).toLowerCase() === 'canvas' ? fakeCanvas() : fakeElement(t)),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, body: fakeElement('body'), head: fakeElement('head'), documentElement: fakeElement('html') };
  def('document', doc); def('window', globalThis); def('self', globalThis);
  def('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
  def('requestAnimationFrame', () => 0); def('cancelAnimationFrame', () => {});
  def('addEventListener', () => {}); def('removeEventListener', () => {});
  def('innerWidth', 1280); def('innerHeight', 720); def('devicePixelRatio', 1);
  def('location', { href: 'http://localhost/', search: '', hash: '', hostname: 'localhost' });
  def('Image', class { set src(v) {} addEventListener() {} });
  def('Audio', class { play() { return Promise.resolve(); } pause() {} addEventListener() {} });
}

// one string out of what was written inside a pixel rectangle of a canvas (signs write a whole line, doors one character at a time)
function textIn(cv, x0, y0, x1, y1) {
  const t = cv.texts.filter(v => v.x >= x0 - 0.5 && v.x <= x1 + 0.5 && v.y >= y0 - 0.5 && v.y <= y1 + 0.5 && v.text.trim());
  if (!t.length) return '';
  const lines = [];
  for (const v of [...t].sort((a, b) => a.y - b.y || a.x - b.x)) { const l = lines.find(q => Math.abs(q.y - v.y) < 2); if (l) l.items.push(v); else lines.push({ y: v.y, items: [v] }); }
  const single = lines.every(l => l.items.length === 1 && [...l.items[0].text].length === 1) && lines.length > 1; // a column of single characters
  return lines.map(l => l.items.sort((a, b) => a.x - b.x).map(v => v.text).join('')).join(single ? '' : ' ');
}

export async function makeEnv() {
  installDom();
  const game = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
  const THREE = await game('vendor/three.module.js');
  const terrain = await game('js/terrain.js');
  const kit = await game('js/kit.js');
  const data = JSON.parse(readFileSync(path.join(ROOT, 'data/cycu.json'), 'utf8'));
  try { terrain.loadTerrain(JSON.parse(readFileSync(path.join(ROOT, 'data/terrain.json'), 'utf8'))); } catch { /* flat world */ }
  const I = new kit.Interiors(null), scene = new THREE.Scene(); I.scene = scene;
  const kits = [], texts = [];

  // the real Kit, plus a note of every textured plane it is asked for (signs) and every textured quad added by hand (door leaves)
  class RecKit extends kit.Kit {
    constructor(...a) { super(...a); kits.push(this); }
    plane(tex, w, h, x, y, z, rotY = 0, o = {}) {
      const cv = tex?.image;
      if (cv?.isFakeCanvas) { const text = textIn(cv, 0, 0, cv.width, cv.height); if (text) texts.push({ kit: this, text, x, y, z, w, h, nx: Math.sin(rotY), nz: Math.cos(rotY), via: 'plane' }); }
      return super.plane(tex, w, h, x, y, z, rotY, o);
    }
    _part(mat, g) {
      try {
        const m = typeof mat === 'string' ? kit.MATS[mat] : mat, cv = m?.map?.image, pos = g?.attributes?.position, uv = g?.attributes?.uv, nor = g?.attributes?.normal;
        if (cv?.isFakeCanvas && cv.texts.length && pos && uv && pos.count === 4) {
          let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
          for (let i = 0; i < 4; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); const p = [pos.getX(i), pos.getY(i), pos.getZ(i)]; for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); } }
          const flip = m.map.flipY !== false, py = (v) => (flip ? 1 - v : v) * cv.height;
          const text = textIn(cv, u0 * cv.width, Math.min(py(v0), py(v1)), u1 * cv.width, Math.max(py(v0), py(v1)));
          if (text) texts.push({ kit: this, text, x: (lo[0] + hi[0]) / 2, y: (lo[1] + hi[1]) / 2, z: (lo[2] + hi[2]) / 2, w: Math.hypot(hi[0] - lo[0], hi[2] - lo[2]), h: hi[1] - lo[1], nx: nor ? nor.getX(0) : 0, nz: nor ? nor.getZ(0) : 1, via: 'part' });
        }
      } catch { /* labels are a bonus: never break the build */ }
      return super._part(mat, g);
    }
  }
  // a stand-in for js/collision.js's world: the building outlines, so builders that swap an outline for wall lines find theirs
  const collision = { polys: [], segs: [], reserved: [], extra: null };
  for (const b of data.buildings || []) { if (!Array.isArray(b.pts)) continue; collision.polys.push({ pts: b.pts, s0: collision.segs.length, top: b.h || 0 }); for (let i = 0; i < b.pts.length; i++) collision.segs.push([0, 0, 0, 0, 0, 0]); }
  return { ROOT, THREE, game, data, terrain, H: terrain.H, I, scene, collision, Kit: RecKit, RealKit: kit.Kit, regMat: kit.regMat, kits, texts };
}
