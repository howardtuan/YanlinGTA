// 硬體效能測試（標題畫面 → 📊 效能測試，或網址加 ?bench 自動開始）。
// 像賽車遊戲的 benchmark：鏡頭照固定路線跑一圈，跑完出一份報告。
//   1. 校園街道（白天）：沿道路網（world.graph，A* 同 Navigation.js）在車道高度穿過校園周邊
//   2. 空拍：拉到 150 m 繞校園轉，畫面裡同時有最多東西
//   3. 夜間街道：晚上開路燈、車燈再跑一段
// 每段開頭有幾秒暖機不計分（讓串流載入、著色器編好）。測的是每幀的間隔（fps、1% 低、卡頓）、
// 主執行緒每幀花的時間（遊戲自己的 JS：更新＋送出繪圖），以及繪圖呼叫、三角形數。
// 跑的時候車流、行人照常更新；畫質可以在開始前選，跑完換回原本的。
// 結果放在 game.bench.result，跑完會發出 window 'benchdone' 事件（自動化用），上一次的摘要存在 localStorage。
import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { astar } from './Navigation.js';
import { Q_NAME, QUALITY } from '../core/GameLoop.js';

const LAST_KEY = 'cycu-bench-last';
const WARM = 3; // seconds per segment not counted
const SPEED = 16; // m/s along the street segments (~60 km/h); a long route is only driven as far as its time allows
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[<&>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// route stops (named buildings; missing ones are skipped) — the street segments follow the roads between them
const DAY_STOPS = [
  '真知教學大樓',
  '資訊管理學系',
  '工學館',
  '自強商學大樓',
  '全人教育村',
  '張靜愚紀念圖書館',
  '學生活動中心',
  '中原大學體育館',
];
const NIGHT_STOPS = ['中原大學體育館', '力行大樓', '學生活動中心', '全人教育村', '真知教學大樓'];

export const SEGMENTS = [
  {
    key: 'day',
    name: '校園街道（白天）',
    kind: 'street',
    stops: DAY_STOPS,
    clock: 10 * 60 + 30,
    time: 42,
  },
  { key: 'air', name: '空拍', kind: 'air', clock: 16 * 60 + 40, time: 22 },
  {
    key: 'night',
    name: '夜間街道',
    kind: 'street',
    stops: NIGHT_STOPS,
    clock: 20 * 60 + 10,
    time: 26,
  },
];

// ---------- statistics (pure, unit-tested) ----------
const pct = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;

// frames: { dt: frame interval ms, cpu: main-thread ms, logic: update/physics ms, render: submit ms }
export function frameSummary(dt, cpu = [], logic = [], render = []) {
  const n = dt.length;
  if (!n) return null;
  const s = Float64Array.from(dt).sort();
  const total = dt.reduce((a, b) => a + b, 0);
  const p50 = pct(s, 0.5),
    p95 = pct(s, 0.95),
    p99 = pct(s, 0.99),
    p999 = pct(s, 0.999);
  // a stutter: a frame clearly longer than its neighbours' usual time and long enough to notice
  const lim = Math.max(50, p50 * 2.5);
  let stutters = 0;
  for (const d of dt) if (d > lim) stutters++;
  const cs = Float64Array.from(cpu).sort();
  const cpuAvg = cpu.length ? cpu.reduce((a, b) => a + b, 0) / cpu.length : 0;
  const ls = Float64Array.from(logic).sort();
  const logicAvg = logic.length ? logic.reduce((a, b) => a + b, 0) / logic.length : 0;
  const rs = Float64Array.from(render).sort();
  const renderAvg = render.length ? render.reduce((a, b) => a + b, 0) / render.length : 0;
  return {
    frames: n,
    seconds: total / 1000,
    avgFps: (1000 * n) / total,
    low1: 1000 / Math.max(1e-3, p99),
    low01: 1000 / Math.max(1e-3, p999),
    minFps: 1000 / Math.max(1e-3, s[n - 1]),
    maxFps: 1000 / Math.max(1e-3, s[0]),
    p50,
    p95,
    p99,
    stutters,
    cpuAvg,
    cpuP95: pct(cs, 0.95),
    logicAvg,
    logicP95: pct(ls, 0.95),
    renderAvg,
    renderP95: pct(rs, 0.95),
  };
}

// what holds the frame rate back. Browsers expose no GPU timers here, so it is read off the gap between the frame
// interval and the time the game's own JS needs: a frame much longer than the JS → the GPU (or the compositor);
// frames pinned to a common refresh rate with JS to spare → the screen's refresh rate (vsync).
export function bottleneck(sum) {
  if (!sum) return { key: '-', text: '-' };
  const frame = 1000 / sum.avgFps;
  for (const hz of [30, 60, 75, 90, 100, 120, 144, 165, 240]) {
    if (Math.abs(sum.avgFps - hz) / hz < 0.03 && sum.cpuAvg < frame * 0.75)
      return { key: 'vsync', text: `已達螢幕更新率上限（${hz} Hz），實際效能還有餘裕` };
  }
  if (sum.cpuAvg >= frame * 0.75) return { key: 'cpu', text: 'CPU（主執行緒）' };
  return { key: 'gpu', text: '顯示卡（GPU）' };
}

export function verdict(sum) {
  if (!sum) return '';
  if (sum.avgFps >= 55 && sum.low1 >= 40) return '非常流暢 👍';
  if (sum.avgFps >= 40 && sum.low1 >= 25) return '流暢';
  if (sum.avgFps >= 28) return '可以玩，偶爾會頓';
  return '偏卡，建議調低畫質';
}

function browserName() {
  const ua = navigator.userAgent;
  const m =
    ua.match(/(Edg|OPR|Firefox|SamsungBrowser)\/(\d+)/) ||
    ua.match(/(Chrome|CriOS)\/(\d+)/) ||
    ua.match(/Version\/(\d+).*(Safari)/);
  if (!m) return ua.slice(0, 40);
  if (m[2] === 'Safari') return `Safari ${m[1]}`;
  const map = { Edg: 'Edge', OPR: 'Opera', CriOS: 'Chrome', SamsungBrowser: 'Samsung Internet' };
  return `${map[m[1]] || m[1]} ${m[2]}`;
}

function gpuName(renderer) {
  try {
    const gl = renderer.getContext(),
      d = gl.getExtension('WEBGL_debug_renderer_info');
    const s = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return String(s)
      .replace(/^ANGLE \((.*)\)$/, '$1')
      .replace(/Direct3D.*$|\(0x[0-9a-f]+\)/gi, '')
      .trim()
      .slice(0, 80);
  } catch (_e) {
    return '未知';
  }
}

export class Benchmark {
  constructor(game) {
    this.game = game;
    this.running = false;
    this.result = null;
    this._routes = null;
    this._v = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._lookS = null;
    this._onKey = (e) => {
      if (e.code === 'Escape' && this.running) {
        e.preventDefault();
        this.cancel();
      }
    };
    this._onVis = () => {
      if (document.hidden && this.running) this._tabHidden = true;
    };
  }

  // ---------- route ----------
  _street(stops) {
    const w = this.game.world;
    const nodes = w.driveNodes?.length ? w.driveNodes : w.walkNodes;
    const near = (x, z) => {
      let b = null,
        bd = Infinity;
      for (const n of nodes) {
        const d = (n.x - x) ** 2 + (n.z - z) ** 2;
        if (d < bd) {
          bd = d;
          b = n;
        }
      }
      return b;
    };
    const pts = [];
    let prev = null;
    for (const name of stops) {
      const it = w.named[name];
      if (!it) continue;
      const n = near(it.x, it.z);
      if (!n) continue;
      if (prev && prev !== n) {
        const r = astar(prev, n, true) || astar(prev, n, false);
        if (r) for (const p of r) pts.push(p);
      }
      prev = n;
    }
    // drop near-duplicates, then a smooth curve at road height
    const out = [];
    for (const p of pts) {
      const q = out[out.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 6) out.push(p);
    }
    if (out.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(
      out.map((p) => new THREE.Vector3(p[0], 0, p[1])),
      false,
      'centripetal'
    );
    return { curve, len: curve.getLength() };
  }

  _buildRoutes() {
    if (this._routes) return this._routes;
    const w = this.game.world;
    let cx = 0,
      cz = 0,
      k = 0;
    for (const n of DAY_STOPS) {
      const it = w.named[n];
      if (it) {
        cx += it.x;
        cz += it.z;
        k++;
      }
    }
    const center = k ? { x: cx / k, z: cz / k } : { x: 0, z: 0 };
    this._routes = SEGMENTS.map((s) => (s.kind === 'street' ? this._street(s.stops) : { center }));
    return this._routes;
  }

  // ---------- run ----------
  openDialog() {
    const g = this.game;
    const last = this._last();
    const qb = (v, t) =>
      `<button data-bq="${v}" class="${v === g.quality ? 'on' : ''}">${t}</button>`;
    const total = SEGMENTS.reduce((a, s) => a + s.time + WARM, 0);
    g.menuManager.modal(
      '📊 效能測試',
      `<p>鏡頭會沿固定路線跑一圈：${SEGMENTS.map((s) => s.name).join(' → ')}，約 ${Math.round(total)} 秒，跑完顯示平均 FPS、1% 低幀、卡頓次數與瓶頸判斷。</p>
      <p style="color:#a9adbf;font-size:12px">測試期間請不要切換分頁或視窗；按 Esc 或右上角「取消」可中途停止。</p>
      <div class="set-row"><label>🖼 測試畫質</label><div class="seg" id="benchQ">${QUALITY.map((q) => qb(q, Q_NAME[q].replace(/（.*）/, ''))).join('')}</div></div>
      <div class="set-row"><label></label><small style="color:#a9adbf">跑完會換回原本的畫質。「低／超低」的抗鋸齒與人車數量要重新整理才會套用，這裡只換解析度、陰影、視距與後製。</small></div>
      ${last ? `<p style="color:#a9adbf;font-size:12px">上次結果：平均 ${last.avgFps.toFixed(0)} fps、1% 低 ${last.low1.toFixed(0)}（${esc(Q_NAME[last.quality] || last.quality)}畫質，${esc(last.res)}，${esc(last.date)}）</p>` : ''}
      <div class="modal-btns" style="margin-top:12px"><button class="menu-btn primary" id="benchGo"><span>▶ 開始測試</span><small>RUN BENCHMARK</small></button></div>`,
      'BENCHMARK'
    );
    let pick = g.quality;
    for (const b of document.querySelectorAll('#benchQ button')) {
      b.onclick = () => {
        pick = b.dataset.bq;
        for (const o of document.querySelectorAll('#benchQ button'))
          o.classList.toggle('on', o === b);
      };
    }
    $('benchGo').onclick = () => {
      g.menuManager.closeModal();
      this.start(pick);
    };
  }

  start(quality, opts = {}) {
    const g = this.game;
    if (this.running || g.state !== 'title') return false;
    this._buildRoutes();
    this.prevQ = g.quality;
    if (quality && quality !== g.quality) g.setQuality(quality);
    this.headless = Boolean(opts.headless);
    this.running = true;
    this.seg = 0;
    this.t = 0;
    this._warmFrames = 0;
    this._tabHidden = false;
    this._skipFrame = false;
    this._lookS = null;
    this._prevT = null;
    this.rec = { dt: [], cpu: [], logic: [], render: [], calls: [], tris: [], seg: [] };
    this.heapMax = 0;
    this._last0 = 0;
    this.prevAutoReset = g.renderer.info.autoReset;
    g.renderer.info.autoReset = false; // post-processing renders several passes: count them all
    g.state = 'bench';
    $('title')?.classList.add('hidden');
    this._hud();
    addEventListener('keydown', this._onKey);
    addEventListener('visibilitychange', this._onVis);
    return true;
  }

  _hud() {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'benchHud';
      Object.assign(this.el.style, {
        position: 'fixed',
        left: '50%',
        top: '12px',
        transform: 'translateX(-50%)',
        zIndex: 60,
        font: '600 14px/1.4 system-ui,sans-serif',
        color: '#fff',
        background: 'rgba(10,12,24,.72)',
        padding: '8px 14px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
      });
      this.el.innerHTML = `<div style="flex:1"><div id="benchSeg"></div><div style="height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin-top:5px"><div id="benchBar" style="height:100%;width:0;background:#ffd23f;border-radius:2px"></div></div></div><button id="benchCancel" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:6px;padding:4px 10px;font:inherit;cursor:pointer">取消 Esc</button>`;
      document.body.appendChild(this.el);
      $('benchCancel').onclick = () => this.cancel();
    }
    this.el.style.display = 'flex';
  }

  _progress() {
    const S = SEGMENTS[this.seg];
    if (!S || !this.el) return;
    const total = SEGMENTS.reduce((a, s) => a + s.time + WARM, 0);
    let done = this.t;
    for (let i = 0; i < this.seg; i++) done += SEGMENTS[i].time + WARM;
    const warm = this.t < WARM;
    const txt = `📊 效能測試 · ${S.name}${warm ? '（暖機）' : ''}　${this.seg + 1}/${SEGMENTS.length}`;
    const segEl = $('benchSeg');
    if (segEl.textContent !== txt) segEl.textContent = txt;
    $('benchBar').style.width = `${Math.min(100, (100 * done) / total).toFixed(1)}%`;
  }

  // GameLoop calls this instead of the title camera while state === 'bench'
  update(dt) {
    const g = this.game,
      S = SEGMENTS[this.seg],
      R = this._routes[this.seg];
    // the route runs on wall-clock time (the loop's dt is capped at 50 ms, so a slow machine would take far longer)
    const now = performance.now();
    if (!this.headless && (document.hidden || this._tabHidden)) {
      this._tabHidden = document.hidden;
      this._prevT = now;
      this._skipFrame = true;
      return;
    }
    this.t += Math.min(5, Math.max(0, (now - (this._prevT ?? now - dt * 1000)) / 1000));
    this._prevT = now;
    const cam = g.camera;
    const run = Math.max(0, this.t - WARM) / S.time; // 0..1 through the measured part
    g.clock = S.clock;
    if (S.kind === 'street' && R) {
      const u = Math.min(1, (run * S.time * SPEED) / R.len),
        ahead = Math.min(1, u + 22 / R.len);
      const p = R.curve.getPointAt(u),
        a = R.curve.getPointAt(ahead);
      const gy = surfaceAt(p.x, p.z);
      cam.position.set(p.x, gy + 3.2, p.z); // above parked cars and scooters
      this._v.set(a.x, surfaceAt(a.x, a.z) + 1.8, a.z);
    } else {
      const c = R?.center || { x: 0, z: 0 },
        u = Math.min(1, run),
        ang = -0.6 + u * Math.PI * 0.9,
        rad = 330 - u * 90,
        gy = surfaceAt(c.x, c.z);
      cam.position.set(c.x + Math.sin(ang) * rad, gy + 150 - u * 40, c.z + Math.cos(ang) * rad);
      this._v.set(c.x, gy + 10, c.z);
    }
    // the look target follows smoothly (corners of the road graph would snap the view otherwise)
    if (!this._lookS) this._lookS = this._v.clone();
    else this._lookS.lerp(this._v, 1 - Math.exp(-dt * 4));
    cam.lookAt(this._lookS);
    const pos = this._look.set(cam.position.x, 0, cam.position.z);
    g._titlePos = { x: pos.x, z: pos.z };
    g.traffic?.update(dt, { pos, vehicle: null }, null);
    g.peds?.update(dt, { pos }, g.world.collision);
    this._progress();
    if (this.t >= S.time + WARM && this._warmFrames >= 2) {
      this.seg++;
      this.t = 0;
      this._warmFrames = 0;
      this._lookS = null;
      if (this.seg >= SEGMENTS.length) this.finish();
    }
  }

  // ---------- per-frame measurement (GameLoop) ----------
  frameStart(now) {
    this._fs = now;
    this._rs = null;
  }
  renderStart() {
    this._rs = performance.now();
    this.game.renderer.info.reset();
  }
  frameEnd(now) {
    if (!this.running) return;
    const end = performance.now();
    const ft = this._last0 ? now - this._last0 : 0;
    this._last0 = now;
    if (this._skipFrame) {
      this._skipFrame = false;
      return;
    }
    if (this.t < WARM || this._warmFrames < 2) {
      this._warmFrames++;
      return;
    }
    if (!ft || (!this.headless && ft > 5000)) return; // first frame, or OS sleep
    const info = this.game.renderer.info.render;
    const rs = this._rs ?? end;
    this.rec.dt.push(ft);
    this.rec.cpu.push(end - this._fs);
    this.rec.logic.push(Math.max(0, rs - this._fs));
    this.rec.render.push(Math.max(0, end - rs));
    this.rec.calls.push(info.calls);
    this.rec.tris.push(info.triangles);
    this.rec.seg.push(this.seg);
    const pm = performance.memory;
    if (pm && pm.usedJSHeapSize > this.heapMax) this.heapMax = pm.usedJSHeapSize;
  }

  _stop() {
    const g = this.game;
    this.running = false;
    removeEventListener('keydown', this._onKey);
    removeEventListener('visibilitychange', this._onVis);
    if (this.el) this.el.style.display = 'none';
    g.renderer.info.autoReset = g.perfHud?.level !== 'off' ? false : this.prevAutoReset;
    if (this.prevQ && this.prevQ !== g.quality) g.setQuality(this.prevQ);
    g.state = 'title';
    g.titleT = 0;
    $('title')?.classList.remove('hidden');
  }

  cancel() {
    if (!this.running) return;
    this._stop();
    this.game.hud?.toast?.('已取消效能測試', 'bad', 1800);
  }

  finish() {
    const g = this.game,
      r = g.renderer,
      cv = r.domElement,
      rec = this.rec;
    const quality = g.quality;
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const segs = SEGMENTS.map((s, i) => {
      const idx = [];
      rec.seg.forEach((k, j) => k === i && idx.push(j));
      const pick = (arr) => idx.map((j) => arr[j]);
      return {
        key: s.key,
        name: s.name,
        ...frameSummary(pick(rec.dt), pick(rec.cpu), pick(rec.logic), pick(rec.render)),
        calls: avg(pick(rec.calls)),
        tris: avg(pick(rec.tris)),
      };
    });
    const overall = frameSummary(rec.dt, rec.cpu, rec.logic, rec.render);
    const res = `${cv.width}×${cv.height}`;
    this.result = {
      date: new Date().toLocaleString('zh-TW', { hour12: false }),
      quality,
      tier: g.perfProfile?.tier || null,
      res,
      pixelRatio: r.getPixelRatio(),
      gpu: gpuName(r),
      browser: browserName(),
      cores: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      heapMaxMB: this.heapMax ? Math.round(this.heapMax / 1048576) : null,
      overall,
      bottleneck: bottleneck(overall),
      verdict: verdict(overall),
      segments: segs,
      calls: avg(rec.calls),
      tris: avg(rec.tris),
      frames: { dt: rec.dt.map((x) => +x.toFixed(2)), seg: rec.seg.slice() },
    };
    const prev = this._last();
    this._stop();
    try {
      if (overall)
        localStorage.setItem(
          LAST_KEY,
          JSON.stringify({
            date: this.result.date,
            quality,
            res,
            avgFps: overall.avgFps,
            low1: overall.low1,
          })
        );
    } catch (_e) {}
    this.showResult(prev);
    dispatchEvent(new CustomEvent('benchdone', { detail: this.result }));
  }

  _last() {
    try {
      const v = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
      return v && Number.isFinite(v.avgFps) ? v : null;
    } catch (_e) {
      return null;
    }
  }

  // ---------- report ----------
  text() {
    const R = this.result;
    if (!R?.overall) return '';
    const o = R.overall,
      f = (x, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : '-');
    const lines = [
      `中原順起來 效能測試報告　${R.date}`,
      `畫質 ${Q_NAME[R.quality] || R.quality}｜解析度 ${R.res} @${f(R.pixelRatio, 2)}x｜檔位 ${R.tier || '-'}`,
      `GPU ${R.gpu}｜CPU 執行緒 ${R.cores ?? '-'}｜記憶體 ${R.deviceMemory ? `${R.deviceMemory} GB` : '-'}｜${R.browser}`,
      `平均 ${f(o.avgFps, 1)} fps｜1% 低 ${f(o.low1)}｜0.1% 低 ${f(o.low01)}｜最低 ${f(o.minFps)}｜最高 ${f(o.maxFps)}`,
      `畫面時間 中位 ${f(o.p50, 1)} ms｜p95 ${f(o.p95, 1)} ms｜p99 ${f(o.p99, 1)} ms｜卡頓 ${o.stutters} 次`,
      `主執行緒 平均 ${f(o.cpuAvg, 1)} ms（p95 ${f(o.cpuP95, 1)}）｜瓶頸：${R.bottleneck.text}｜評價：${R.verdict}`,
      `繪圖呼叫 平均 ${f(R.calls)}｜三角形 ${f(R.tris / 1000)}k${R.heapMaxMB ? `｜JS 記憶體峰值 ${R.heapMaxMB} MB` : ''}`,
      '各段：',
      ...R.segments.map(
        (s) =>
          `  ${s.name}：平均 ${f(s.avgFps, 1)} fps、1% 低 ${f(s.low1)}、主執行緒 ${f(s.cpuAvg, 1)} ms、繪圖呼叫 ${f(s.calls)}、三角形 ${f(s.tris / 1000)}k`
      ),
    ];
    return lines.join('\n');
  }

  showResult(prev) {
    const g = this.game,
      R = this.result,
      o = R?.overall;
    if (!o) {
      g.menuManager.modal(
        '📊 效能測試',
        '<p>沒有收集到資料（測試期間分頁可能被切到背景）。</p>',
        'BENCHMARK'
      );
      return;
    }
    const f = (x, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : '-');
    const col = (v) => (v >= 50 ? '#7dff9a' : v >= 30 ? '#ffd54f' : '#ff6b6b');
    const big = (label, v, d = 0) =>
      `<div style="flex:1;min-width:92px;background:rgba(255,255,255,.05);border-radius:6px;padding:8px 10px"><div style="font-size:12px;color:#a9adbf">${label}</div><div style="font-size:26px;font-weight:900;color:${col(v)}">${f(v, d)}</div></div>`;
    const diff =
      prev && Number.isFinite(prev.avgFps)
        ? `<span style="color:${o.avgFps >= prev.avgFps ? '#7dff9a' : '#ff6b6b'}">（上次 ${f(prev.avgFps)} fps，${esc(Q_NAME[prev.quality] || prev.quality)}）</span>`
        : '';
    const row = (s) =>
      `<tr><td>${esc(s.name)}</td><td style="color:${col(s.avgFps)}">${f(s.avgFps, 1)}</td><td>${f(s.low1)}</td><td>${f(s.cpuAvg, 1)} ms</td><td>${f(s.calls)}</td><td>${f(s.tris / 1000)}k</td></tr>`;
    g.menuManager.modal(
      '📊 效能測試結果',
      `<div style="display:flex;gap:8px;flex-wrap:wrap">${big('平均 FPS', o.avgFps, 1)}${big('1% 低', o.low1)}${big('0.1% 低', o.low01)}${big('最低', o.minFps)}</div>
      <p style="margin-top:8px"><b>${esc(R.verdict)}</b>　瓶頸：${esc(R.bottleneck.text)} ${diff}</p>
      <canvas id="benchGraph" width="720" height="150" style="width:100%;height:150px;background:rgba(0,0,0,.25);border-radius:6px;margin-top:6px"></canvas>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px" class="bench-tbl">
        <tr style="color:#a9adbf;text-align:left"><th>段落</th><th>平均 FPS</th><th>1% 低</th><th>主執行緒</th><th>繪圖呼叫</th><th>三角形</th></tr>
        ${R.segments.map(row).join('')}
      </table>
      <p style="font-size:12px;color:#a9adbf;margin-top:8px">畫面時間 中位 ${f(o.p50, 1)} ms、p95 ${f(o.p95, 1)} ms、p99 ${f(o.p99, 1)} ms，卡頓 ${o.stutters} 次｜最高 ${f(o.maxFps)} fps<br>
      畫質 ${esc(Q_NAME[R.quality] || R.quality)}・${esc(R.res)} @${f(R.pixelRatio, 2)}x・${esc(R.gpu)}・CPU ${R.cores ?? '-'} 執行緒${R.deviceMemory ? `・${R.deviceMemory} GB` : ''}・${esc(R.browser)}${R.heapMaxMB ? `・JS 記憶體峰值 ${R.heapMaxMB} MB` : ''}</p>
      <div class="modal-btns" style="flex-direction:row;flex-wrap:wrap;margin-top:10px">
        <button class="menu-btn primary" id="benchAgain" style="flex:1"><span>↻ 再跑一次</span><small>RUN AGAIN</small></button>
        <button class="menu-btn" id="benchCopy" style="flex:1"><span>📋 複製結果</span><small>COPY</small></button>
        <button class="menu-btn" id="benchSave" style="flex:1"><span>💾 下載 JSON</span><small>DOWNLOAD</small></button>
      </div>`,
      'BENCHMARK'
    );
    this._graph($('benchGraph'));
    $('benchAgain').onclick = () => this.openDialog();
    $('benchCopy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(this.text());
        $('benchCopy').querySelector('span').textContent = '✅ 已複製';
      } catch (_e) {
        $('benchCopy').querySelector('span').textContent = '❌ 無法複製';
      }
    };
    $('benchSave').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(this.result, null, 1)], { type: 'application/json' })
      );
      a.download = `yanlingta-bench-${Date.now()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
  }

  // frame-time graph: one column per frame, segment bands, 60 / 30 fps guides
  _graph(cv) {
    const R = this.result;
    if (!cv || !R) return;
    const c = cv.getContext('2d'),
      W = cv.width,
      H = cv.height,
      dt = R.frames.dt,
      seg = R.frames.seg,
      n = dt.length;
    if (!n) return;
    const top = Math.max(50, Math.min(120, pct(Float64Array.from(dt).sort(), 0.995) * 1.15));
    const y = (ms) => H - 14 - (Math.min(ms, top) / top) * (H - 22);
    const bands = ['rgba(255,210,63,.06)', 'rgba(120,180,255,.07)', 'rgba(180,120,255,.08)'];
    let start = 0;
    for (let i = 1; i <= n; i++) {
      if (i === n || seg[i] !== seg[start]) {
        const x0 = (start / n) * W,
          x1 = (i / n) * W;
        c.fillStyle = bands[seg[start] % bands.length];
        c.fillRect(x0, 0, x1 - x0, H);
        c.fillStyle = '#a9adbf';
        c.font = '11px system-ui,sans-serif';
        c.fillText(SEGMENTS[seg[start]]?.name || '', x0 + 4, H - 3);
        start = i;
      }
    }
    for (const [ms, label] of [
      [1000 / 60, '60'],
      [1000 / 30, '30'],
    ]) {
      if (ms > top) continue;
      c.strokeStyle = 'rgba(255,255,255,.18)';
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(0, y(ms));
      c.lineTo(W, y(ms));
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#a9adbf';
      c.fillText(`${label} fps`, W - 40, y(ms) - 3);
    }
    // one line, max per pixel column so single spikes stay visible
    c.strokeStyle = '#ffd23f';
    c.lineWidth = 1.2;
    c.beginPath();
    for (let x = 0; x < W; x++) {
      const a = Math.floor((x / W) * n),
        b = Math.max(a + 1, Math.floor(((x + 1) / W) * n));
      let m = 0;
      for (let i = a; i < b && i < n; i++) m = Math.max(m, dt[i]);
      if (x) c.lineTo(x, y(m));
      else c.moveTo(x, y(m));
    }
    c.stroke();
  }
}
