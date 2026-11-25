// Performance overlay in the top-left corner (設定 → 📊 效能顯示). Four levels:
//   off    — nothing (default)
//   fps    — just the frame rate, coloured green / yellow / red
//   detail — fps + 1% low, frame time, main-thread load, JS memory, draw calls / triangles
//   dev    — everything: per-part timings (logic / physics / render), loaded GPU resources, crowd sizes,
//            quality, WASM, GPU name, player position and area
// ?perf in the URL forces "dev" for this session without touching the saved setting.
//
// Browsers don't expose real CPU / GPU usage, so "主執行緒" is the share of each frame the game's own JS
// spends working (update + render submission). The text refreshes twice a second; while off nothing is measured.
import { kernelsReady } from '../graphics/wasm/kernels.js';

export const PERF_LEVELS = ['off', 'fps', 'detail', 'dev'];
const WIN = 240; // frame-time history for 1% low / worst frame (~2-4 s)

const fpsColor = (f) => (f >= 50 ? '#7dff9a' : f >= 30 ? '#ffd54f' : '#ff6b6b');

export class PerfHud {
  constructor(game) {
    this.game = game;
    this.level = 'off';
    this.el = null;
    this.hist = new Float32Array(WIN);
    this.hi = 0;
    this.hn = 0;
    this.gpu = null;
    this._reset(performance.now());
  }

  _reset(now) {
    this.acc = { n: 0, frame: 0, work: 0, logic: 0, phys: 0, render: 0, calls: 0, tris: 0 };
    this.t0 = now;
    this.last = 0;
  }

  setLevel(level) {
    if (!PERF_LEVELS.includes(level)) level = 'off';
    if (level === this.level) return;
    this.level = level;
    const r = this.game.renderer;
    if (level === 'off') {
      this.el?.remove();
      this.el = null;
      if (r) r.info.autoReset = true;
      return;
    }
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'perfHud';
      Object.assign(this.el.style, {
        position: 'fixed',
        left: '6px',
        top: '6px',
        zIndex: 99999,
        font: '12px/1.35 ui-monospace,Consolas,monospace',
        color: '#fff',
        background: 'rgba(0,0,0,.62)',
        padding: '3px 7px',
        borderRadius: '4px',
        pointerEvents: 'none',
        whiteSpace: 'pre',
      });
      this.el.textContent = '… fps';
      document.body.appendChild(this.el);
    }
    // the post chain renders several passes per frame: count them all
    if (r) r.info.autoReset = false;
    this._wrapPhysics();
    this.hn = 0;
    this._reset(performance.now());
  }

  // time spent stepping physics (it runs from Game._update or GameLoop.loop, possibly twice a frame)
  _wrapPhysics() {
    const g = this.game;
    if (this._physWrapped || typeof g._stepPhysics !== 'function') return;
    this._physWrapped = true;
    const orig = g._stepPhysics;
    g._stepPhysics = (...a) => {
      if (this.level === 'off') return orig.apply(g, a);
      const t = performance.now();
      try {
        return orig.apply(g, a);
      } finally {
        this.acc.phys += performance.now() - t;
      }
    };
  }

  // GameLoop calls these three around each frame (only while a level is on)
  frameStart(now) {
    this._fs = now;
  }
  renderStart() {
    this._rs = performance.now();
    this.game.renderer?.info.reset();
  }
  frameEnd(now) {
    const end = performance.now(),
      A = this.acc,
      info = this.game.renderer?.info;
    A.n++;
    A.work += end - this._fs;
    A.render += end - (this._rs ?? end);
    A.logic += (this._rs ?? end) - this._fs;
    if (info) {
      A.calls = info.render.calls;
      A.tris = info.render.triangles;
    }
    if (this.last) {
      const ft = now - this.last;
      A.frame += ft;
      this.hist[this.hi] = ft;
      this.hi = (this.hi + 1) % WIN;
      this.hn = Math.min(WIN, this.hn + 1);
    }
    this.last = now;
    if (now - this.t0 >= 500 && A.n > 1) {
      this._draw();
      this._reset(now);
      this.last = now;
    }
  }

  _gpuName() {
    if (this.gpu !== null) return this.gpu;
    let s = '';
    try {
      const gl = this.game.renderer.getContext(),
        d = gl.getExtension('WEBGL_debug_renderer_info');
      s = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '';
    } catch (_e) {}
    this.gpu = s
      .replace(/^ANGLE \((.*)\)$/, '$1')
      .replace(/Direct3D.*$|\(0x[0-9a-f]+\)/gi, '')
      .trim()
      .slice(0, 60);
    return this.gpu;
  }

  _draw() {
    if (!this.el) return;
    const g = this.game,
      A = this.acc,
      frames = A.n - 1,
      ms = A.frame / Math.max(1, frames),
      fps = A.frame > 0 ? (1000 * frames) / A.frame : 0,
      fpsTxt = `<b style="color:${fpsColor(fps)}">${fps.toFixed(0)}</b> fps`;
    if (this.level === 'fps') {
      this.el.innerHTML = fpsTxt;
      return;
    }
    // 1% low: the frame time 99% of recent frames beat
    const h = Array.from(this.hist.subarray(0, this.hn)).sort((a, b) => a - b),
      p99 = h.length ? h[Math.min(h.length - 1, Math.floor(h.length * 0.99))] : ms,
      worst = h.length ? h[h.length - 1] : ms,
      low = 1000 / Math.max(1e-3, p99);
    const load = Math.min(100, (100 * A.work) / Math.max(1e-3, A.frame + ms));
    const pm = performance.memory,
      heap = pm ? `${(pm.usedJSHeapSize / 1048576).toFixed(0)} MB` : '不支援';
    const lines = [
      `${fpsTxt}  1%低 <span style="color:${fpsColor(low)}">${low.toFixed(0)}</span>  ${ms.toFixed(1)} ms（最慢 ${worst.toFixed(0)}）`,
      `主執行緒 ${load.toFixed(0)}%（每幀 ${(A.work / A.n).toFixed(1)} ms）  記憶體 ${heap}`,
      `繪圖呼叫 ${A.calls}  三角形 ${(A.tris / 1000).toFixed(0)}k`,
    ];
    if (this.level === 'dev') {
      const r = g.renderer,
        mem = r?.info.memory,
        ph = g.physics?.world,
        pr = r ? r.getPixelRatio() : 1,
        cv = r?.domElement,
        wp = g.player?.worldPos?.(),
        area = (document.getElementById('locName')?.textContent || '-').replace(/[<&>]/g, ''),
        peds = g.peds?.list?.length ?? 0,
        cars = g.traffic?.agents?.length ?? 0;
      lines.push(
        `邏輯 ${(A.logic / A.n).toFixed(1)}  物理 ${(A.phys / A.n).toFixed(1)}  繪製 ${(A.render / A.n).toFixed(1)} ms`,
        `紋理 ${mem?.textures ?? '-'}  幾何 ${mem?.geometries ?? '-'}  著色器 ${r?.info.programs?.length ?? '-'}`,
        `車流 ${cars}  行人 ${peds}  NPC ${g.npcs?.length ?? 0}  物理 ${ph ? `${ph.bodies.len()} 剛體 ${ph.colliders.len()} 碰撞體` : '關'}`,
        `畫質 ${g.quality}  檔位 ${g.perfProfile?.tier || '-'}${g.perfProfile?.safeMode ? ' [SAFE]' : ''}  WASM ${kernelsReady() ? '開' : '關'}  ${cv ? `${cv.width}×${cv.height}` : ''} @${pr.toFixed(2)}x`,
        wp ? `位置 ${wp.x.toFixed(0)}, ${wp.y.toFixed(1)}, ${wp.z.toFixed(0)}  ${area}` : '',
        this._gpuName()
      );
    }
    this.el.innerHTML = lines.filter(Boolean).join('\n');
  }
}
