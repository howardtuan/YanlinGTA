// 全息 AI 圓圈：S.U.N.D.A.Y（金）、M.O.N.D.A.Y（青）、W.E.D.N.E.S.D.A.Y（紫）三個 AI 的樣子 ——
// 一圈一圈會轉的光弧、刻度、資料方塊、閃爍光點，中間一道漩渦和亮核（像全息投影的科技感圓圈）。
// 2D 版（HoloRingView）：HUD 右下角的 S.U.N.D.A.Y、對話框裡 AI 說話時的頭像，用 <canvas> 每格重畫。
// 3D 版（src/entities/HoloAI.js）：用這裡的 holoTexture() 畫好的幾層靜態貼圖，疊成會各自旋轉的立體圓圈放在地圖上。
// 同一個 AI 的圓圈結構（光弧位置、長度、轉速）由 seed 決定，每次看都一樣。

export const HOLO_AI = {
  'S.U.N.D.A.Y': {
    id: 'sunday',
    core: '#fff4c8',
    main: '#ffb22e',
    deep: '#ff6a00',
    seed: 7,
    title: '主線提示 AI',
  },
  'M.O.N.D.A.Y': {
    id: 'monday',
    core: '#dcfbff',
    main: '#2fd6ff',
    deep: '#1e5bff',
    seed: 21,
    title: '競選總幹事 AI',
  },
  'W.E.D.N.E.S.D.A.Y': {
    id: 'wednesday',
    core: '#ffe3fb',
    main: '#e45cff',
    deep: '#7a2bff',
    seed: 34,
    title: '資管系館駐點 AI',
  },
};
export const holoOf = (name) => HOLO_AI[name] || null;

const TAU = Math.PI * 2;
const rngOf = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// the ring's fixed structure for a seed (radii are fractions of the ring's radius R)
const layouts = new Map();
export function holoLayout(seed) {
  if (layouts.has(seed)) return layouts.get(seed);
  const r = rngOf(seed * 7919 + 13);
  const arcs = [];
  const BANDS = 17;
  for (let b = 0; b < BANDS; b++) {
    const rad = 0.14 + 0.86 * (b / (BANDS - 1));
    const n = 2 + Math.floor(r() * 4);
    const spin = (r() - 0.5) * 1.4 * (b % 2 ? 1 : -1) * (1.25 - rad * 0.7);
    for (let i = 0; i < n; i++)
      arcs.push({
        rad: rad + (r() - 0.5) * 0.035,
        a0: r() * TAU,
        len: 0.25 + r() * (rad > 0.8 ? 2.6 : 1.7),
        w: r() < 0.22 ? 3 + r() * 6 : 0.7 + r() * 1.8,
        alpha: 0.35 + r() * 0.6,
        spin,
        dash: r() < 0.35 ? [2 + r() * 7, 2 + r() * 9] : null,
        tone: r(),
        ph: r() * TAU,
      });
  }
  const blocks = [];
  for (let i = 0; i < 140; i++)
    blocks.push({
      rad: 0.28 + r() * 0.7,
      a: r() * TAU,
      l: 0.015 + r() * 0.07,
      h: 0.006 + r() * 0.022,
      spin: (r() - 0.5) * 0.7,
      alpha: 0.3 + r() * 0.6,
      ph: r() * TAU,
      tone: r(),
    });
  const sparks = [];
  for (let i = 0; i < 110; i++)
    sparks.push({
      rad: 0.12 + r() * 0.98,
      a: r() * TAU,
      s: 0.5 + r() * 1.9,
      ph: r() * TAU,
      sp: 1 + r() * 4,
      spin: (r() - 0.5) * 0.5,
    });
  const L = { arcs, blocks, sparks };
  layouts.set(seed, L);
  return L;
}

const toneOf = (pal, t) => (t < 0.16 ? pal.core : t < 0.72 ? pal.main : pal.deep);
const inBand = (rad, o) => rad >= (o.min ?? 0) && rad <= (o.max ?? 2);

// Draws one frame of the ring centred on a square canvas of S px. t = seconds (animation time).
// o filters what is drawn: { min, max } radius band, and halo / ticks / blocks / sparks / swirl / core on or off.
export function drawHolo(ctx, S, t, pal, o = {}) {
  const L = holoLayout(pal.seed);
  const R = S * 0.45,
    k = S / 256; // line widths are designed at 256 px
  const all = o.all !== false;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // soft glow disc behind everything
  if (o.halo ?? all) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.08);
    g.addColorStop(0, rgba(pal.main, 0.22));
    g.addColorStop(0.35, rgba(pal.deep, 0.1));
    g.addColorStop(0.8, rgba(pal.main, 0.07));
    g.addColorStop(1, rgba(pal.main, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.08, 0, TAU);
    ctx.fill();
  }
  // the arcs
  for (const a of L.arcs) {
    if (!inBand(a.rad, o)) continue;
    const s = a.a0 + a.spin * t;
    ctx.globalAlpha = a.alpha * (0.72 + 0.28 * Math.sin(t * 1.7 + a.ph));
    ctx.strokeStyle = toneOf(pal, a.tone);
    ctx.lineWidth = a.w * k;
    ctx.setLineDash(a.dash ? a.dash.map((d) => d * k) : []);
    ctx.beginPath();
    ctx.arc(0, 0, a.rad * R, s, s + a.len);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // the outer tick ring (rotating slowly), every 6th tick longer
  if ((o.ticks ?? all) && inBand(1, o)) {
    const rot = -t * 0.08;
    ctx.strokeStyle = pal.main;
    ctx.lineWidth = 1.1 * k;
    for (let i = 0; i < 120; i++) {
      const a = rot + (i / 120) * TAU,
        long = i % 6 === 0;
      ctx.globalAlpha = long ? 0.85 : 0.45;
      const r0 = R * 1.02,
        r1 = R * (long ? 1.1 : 1.06);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  // data blocks: little tangent rectangles that blink
  if (o.blocks ?? all)
    for (const b of L.blocks) {
      if (!inBand(b.rad, o)) continue;
      const on = Math.sin(t * 2.3 + b.ph);
      if (on < -0.4) continue;
      ctx.globalAlpha = b.alpha * (0.5 + 0.5 * on);
      ctx.fillStyle = toneOf(pal, b.tone);
      const a = b.a + b.spin * t;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(b.rad * R, -(b.l * R) / 2, b.h * R, b.l * R);
      ctx.restore();
    }
  // the swirl in the middle (two spiral arms)
  if (o.swirl ?? all) {
    ctx.strokeStyle = pal.core;
    for (let arm = 0; arm < 2; arm++) {
      ctx.globalAlpha = arm ? 0.45 : 0.8;
      ctx.lineWidth = (arm ? 2 : 3.4) * k;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const f = i / 48,
          a = t * 0.9 + arm * Math.PI + f * 4.2,
          rr = R * (0.07 + f * 0.46);
        const x = Math.cos(a) * rr,
          y = Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  // the bright core
  if (o.core ?? all) {
    const p = 0.85 + 0.15 * Math.sin(t * 3.1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.2);
    g.addColorStop(0, rgba(pal.core, 0.95 * p));
    g.addColorStop(0.45, rgba(pal.main, 0.45 * p));
    g.addColorStop(1, rgba(pal.main, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 2 * k;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.1, t * 2, t * 2 + 4.6);
    ctx.stroke();
  }
  // twinkling sparks
  if (o.sparks ?? all)
    for (const s of L.sparks) {
      if (!inBand(s.rad, o)) continue;
      const tw = Math.sin(t * s.sp + s.ph);
      if (tw < 0) continue;
      const a = s.a + s.spin * t;
      ctx.globalAlpha = tw;
      ctx.fillStyle = tw > 0.8 ? pal.core : pal.main;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s.rad * R, Math.sin(a) * s.rad * R, s.s * k, 0, TAU);
      ctx.fill();
    }
  ctx.restore();
}

// a still image of (part of) the ring for the 3D version: one canvas per palette + filter, shared
const texCache = new Map();
export function holoCanvas(pal, o = {}, size = 512, t = 3.7) {
  const key = `${pal.seed}|${JSON.stringify(o)}|${size}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawHolo(c.getContext('2d'), size, t, pal, o);
  texCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- 2D animated view
// One shared requestAnimationFrame loop (~30 fps) redraws every view that is on screen.
const views = new Set();
let raf = 0,
  lastDraw = 0;
const tick = (now) => {
  raf = views.size ? requestAnimationFrame(tick) : 0;
  if (now - lastDraw < 33) return;
  lastDraw = now;
  for (const v of views) v._frame(now / 1000);
};

export class HoloRingView {
  constructor(name, px = 96) {
    this.px = px;
    const c = (this.canvas = document.createElement('canvas'));
    c.width = c.height = 1;
    c.className = 'holo-ring';
    c.setAttribute('aria-hidden', 'true');
    this.ctx = c.getContext('2d');
    this.set(name);
    views.add(this);
    if (!raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick);
  }
  set(name) {
    this.pal = holoOf(name) || HOLO_AI['S.U.N.D.A.Y'];
    this.canvas.dataset.ai = this.pal.id;
  }
  _frame(t) {
    const c = this.canvas;
    if (!c.isConnected || !c.getClientRects().length) return; // hidden: skip the drawing
    const S = Math.round(this.px * Math.min(2, window.devicePixelRatio || 1));
    if (c.width !== S) c.width = c.height = S;
    drawHolo(this.ctx, S, t, this.pal);
  }
  dispose() {
    views.delete(this);
  }
}
