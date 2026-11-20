// 新中北路障礙賽 — street race around the outside of the CYCU main campus.
// Sign up at the door of 力行大樓 (the 力行 male dorm on 新中北路), ride your own JET SL against 7 rivals,
// 2 laps, you start 6th of 8. Normal traffic and pedestrians stay on the roads, and the organisers put
// cones and water barriers on the course.
//
// The course is built from the real road graph (world.driveNodes): A* between anchor points around the
// campus, penalising anything that cuts through campus, then smoothed and sampled every 2 m with a
// corner-speed profile. Rivals ride kinematically along it (progress s + lateral offset), choose a free
// lane when something is ahead and brake when nothing is free.
import * as THREE from 'three';
import { Vehicle } from './vehicles.js';
import { createCharacter, randomStudent } from './character.js';
import { makeLabel, mulberry32 } from './map.js';
import { surfaceAt } from './terrain.js';
import { pointInPoly } from './collision.js';
import { dual } from './prompts.js';

const LAPS = 2, PLAYER_SLOT = 5; // 0-based grid slot -> you start 6th of 8
const DS = 2;                    // course sample spacing (m)
const RIVALS = [ // grid order (slot 5 is you)
  { name: '電機系 阿凱', color: '#e53935', skill: 0.97, top: 21.6 },
  { name: '機械系 胖虎', color: '#fb8c00', skill: 0.95, top: 21.2 },
  { name: '化工系 小米', color: '#8e24aa', skill: 0.96, top: 21.0 },
  { name: '企管系 Leo', color: '#1e88e5', skill: 0.93, top: 20.8 },
  { name: '土木系 大頭', color: '#43a047', skill: 0.92, top: 20.6 },
  null,
  { name: '應數系 阿宅', color: '#6d4c41', skill: 0.90, top: 20.2 },
  { name: '外送哥 阿德', color: '#00897b', skill: 0.94, top: 21.4 },
];
const REWARD = [[40, 1000], [25, 600], [15, 300], [8, 0], [8, 0], [3, 0], [3, 0], [3, 0]]; // votes, NT$ by place
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// ---------------- course ----------------
function buildCourse(world, data, startNear) {
  const N = world.driveNodes, poly = (data.campus && (data.campus[1] || data.campus['1'])) || null;
  const near = (x, z) => { let b = null, bd = 1e9; for (const n of N) { if (!n.adj.some(e => e.drive)) continue; const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; b = n; } } return b; };
  const astar = (s, t) => {
    const g = new Map([[s, 0]]), prev = new Map(), open = [s], h = n => Math.hypot(n.x - t.x, n.z - t.z);
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (g.get(open[i]) + h(open[i]) < g.get(open[bi]) + h(open[bi])) bi = i;
      const c = open.splice(bi, 1)[0]; if (c === t) break;
      for (const e of c.adj) {
        if (!e.drive) continue;
        const L = Math.hypot(e.to.x - c.x, e.to.z - c.z), mx = (c.x + e.to.x) / 2, mz = (c.z + e.to.z) / 2;
        const pen = (poly && pointInPoly(mx, mz, poly) ? 40 : 1) * (e.road.type === 'service' ? 1.15 : 1) * (e.road.name ? 1 : 3);
        const ng = g.get(c) + L * pen;
        if (ng < (g.get(e.to) ?? 1e18)) { g.set(e.to, ng); prev.set(e.to, [c, e]); if (!open.includes(e.to)) open.push(e.to); }
      }
    }
    const path = []; let c = t;
    while (c !== s) { const p = prev.get(c); if (!p) return null; path.unshift([c, p[1]]); c = p[0]; }
    return path;
  };
  // 力行大樓 on 新中北路 -> 中北路 -> 大仁街 -> 環中東路 -> back onto 新中北路
  const A = [near(startNear.x, startNear.z), near(-90, 250), near(120, 300), near(290, 200), near(71, -101)];
  let nodes = [], widths = [];
  for (let i = 0; i < A.length; i++) {
    const p = astar(A[i], A[(i + 1) % A.length]); if (!p) return null;
    for (const [n, e] of p) { nodes.push(n); widths.push(e.w || 7); }
  }
  nodes.unshift(nodes.pop()); widths.unshift(widths.pop());
  // drop out-and-back spikes (A -> B -> A)
  for (let ch = true; ch;) {
    ch = false;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[(i - 1 + nodes.length) % nodes.length], c = nodes[(i + 1) % nodes.length];
      if (a === c) { nodes.splice(i, 1); widths.splice(i, 1); const j = i % nodes.length; nodes.splice(j, 1); widths.splice(j, 1); ch = true; break; }
    }
  }
  // Chaikin smoothing (closed), carrying road width
  let P = nodes.map((n, i) => [n.x, n.z, widths[i]]);
  for (let it = 0; it < 2; it++) {
    const Q = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, a[2]], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, a[2]]);
    }
    P = Q;
  }
  // resample every DS metres
  const X = [], Z = [], Wd = [];
  let carry = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t = carry;
    while (t < L) { const k = t / L; X.push(a[0] + (b[0] - a[0]) * k); Z.push(a[1] + (b[1] - a[1]) * k); Wd.push(Math.max(5, a[2])); t += DS; }
    carry = t - L;
  }
  const n = X.length, len = n * DS;
  const ang = new Float32Array(n), V = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; ang[i] = Math.atan2(X[j] - X[i], Z[j] - Z[i]); }
  // corner speed: heading change over ±10 m -> radius -> sqrt(a_lat * R)
  for (let i = 0; i < n; i++) {
    const d = Math.abs(angDiff(ang[(i + 5) % n], ang[(i - 5 + n) % n]));
    const R = d > 1e-3 ? 20 / d : 1e4;
    V[i] = Math.min(23, Math.sqrt(7.5 * R));
  }
  for (let pass = 0; pass < 2; pass++) for (let i = n - 1; i >= 0; i--) V[i] = Math.min(V[i], Math.sqrt(V[(i + 1) % n] ** 2 + 2 * 9 * DS));
  return { X, Z, W: Wd, ang, V, n, len };
}

// shared looks for the course furniture
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 16; const g = cv.getContext('2d');
  for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); }
  const chk = new THREE.CanvasTexture(cv); chk.colorSpace = THREE.SRGBColorSpace; chk.magFilter = THREE.NearestFilter;
  const ban = document.createElement('canvas'); ban.width = 1024; ban.height = 160; const b = ban.getContext('2d');
  const gr = b.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, '#d81b60'); gr.addColorStop(1, '#ff8f00');
  b.fillStyle = gr; b.fillRect(0, 0, 1024, 160); b.fillStyle = '#fff'; b.font = '900 78px "Microsoft JhengHei","Noto Sans TC",sans-serif';
  b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('🏁 新中北路障礙賽  START / FINISH', 512, 84);
  const banner = new THREE.CanvasTexture(ban); banner.colorSpace = THREE.SRGBColorSpace;
  MATS = {
    chk: new THREE.MeshBasicMaterial({ map: chk, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    banner: new THREE.MeshBasicMaterial({ map: banner, side: THREE.DoubleSide }),
    post: new THREE.MeshLambertMaterial({ color: '#e8e8e8' }),
    cone: new THREE.MeshLambertMaterial({ color: '#ff6d00' }),
    white: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    black: new THREE.MeshLambertMaterial({ color: '#222' }),
    red: new THREE.MeshLambertMaterial({ color: '#e53935' }),
    ring: new THREE.MeshBasicMaterial({ color: '#ff4fa3', transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }),
    coneG: new THREE.ConeGeometry(0.24, 0.72, 12), bandG: new THREE.CylinderGeometry(0.135, 0.165, 0.12, 12), baseG: new THREE.BoxGeometry(0.5, 0.06, 0.5),
    barG: new THREE.BoxGeometry(1, 0.8, 0.55),
  };
  return MATS;
}

export class Race {
  constructor(game) {
    this.g = game; this.state = 'idle'; this.rivals = []; this.obst = []; this.wins = 0; this.runs = 0;
    const w = game.world, dorm = w.named['力行大樓'];
    this.dorm = dorm ? { x: dorm.x, z: dorm.z } : { x: -160, z: -164 };
    try { this.C = buildCourse(w, game.data, this.dorm); } catch (e) { console.warn('race course', e); this.C = null; }
    if (!this.C) return;
    const C = this.C;
    // start line: the course point nearest the dorm
    let bi = 0, bd = 1e9;
    for (let i = 0; i < C.n; i++) { const d = Math.hypot(C.X[i] - this.dorm.x, C.Z[i] - this.dorm.z); if (d < bd) { bd = d; bi = i; } }
    this.s0 = bi * DS;
    // sign-up point: on the dorm side of the road, just off the carriageway
    const sx = C.X[bi], sz = C.Z[bi], dx = this.dorm.x - sx, dz = this.dorm.z - sz, dl = Math.hypot(dx, dz) || 1;
    let off = C.W[bi] / 2 + 3.2, px = sx + dx / dl * off, pz = sz + dz / dl * off;
    for (let k = 0; k < 12 && !w.isFree(px, pz, 0.6); k++) { off += 1; px = sx + dx / dl * off; pz = sz + dz / dl * off; }
    this.door = { x: px, z: pz };
    this._buildGantry();
    // sign-up action (on foot)
    game.interiors.actions.push({
      x: px, z: pz, r: 3.6, y: 0,
      label: () => '按 <kbd>E</kbd> 報名「🏁 新中北路障礙賽」（騎自己的 JET SL・2 圈・8 人）',
      cond: () => this.state === 'idle',
      fn: (g) => this.signup(),
    });
    this._ui();
  }
  get active() { return this.state !== 'idle'; }
  get racing() { return this.state === 'count' || this.state === 'race'; }
  // player can't move during the countdown or while the results are up
  get locked() { return this.state === 'count' || this.state === 'results'; }

  // ---------- course helpers ----------
  _at(s) {
    const C = this.C; s = ((s % C.len) + C.len) % C.len;
    const f = s / DS, i = Math.floor(f) % C.n, j = (i + 1) % C.n, k = f - Math.floor(f);
    const x = C.X[i] + (C.X[j] - C.X[i]) * k, z = C.Z[i] + (C.Z[j] - C.Z[i]) * k;
    const a = C.ang[i] + angDiff(C.ang[j], C.ang[i]) * k;
    return { x, z, a, tx: Math.sin(a), tz: Math.cos(a), rx: -Math.cos(a), rz: Math.sin(a), w: C.W[i], v: C.V[i], i };
  }
  // nearest course point to (x,z), searching ±win samples around index hint
  _project(x, z, hint, win = 30) {
    const C = this.C; let bi = hint, bd = 1e9;
    for (let k = -win; k <= win; k++) {
      const i = ((hint + k) % C.n + C.n) % C.n, d = (C.X[i] - x) ** 2 + (C.Z[i] - z) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    const p = this._at(bi * DS);
    return { i: bi, s: bi * DS, d: Math.sqrt(bd), lat: (x - p.x) * p.rx + (z - p.z) * p.rz };
  }

  // ---------- scenery ----------
  _buildGantry() {
    const M = mats(), p = this._at(this.s0), g = new THREE.Group(), w = p.w + 3;
    const y0 = surfaceAt(p.x, p.z);
    // group local +z = direction of travel, local x = across the road
    const line = new THREE.Mesh(new THREE.PlaneGeometry(p.w, 1.6).rotateX(-Math.PI / 2), M.chk);
    line.position.set(0, 0.06, 0); g.add(line);
    for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 0.35), M.post); post.position.set(sd * w / 2, 2.6, 0); g.add(post); }
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 160 / 1024), M.banner); ban.position.set(0, 5.0, 0); ban.rotation.y = Math.PI; g.add(ban); // readable for riders arriving at the line
    g.position.set(p.x, y0, p.z); g.rotation.y = p.a;
    this.g.scene.add(g); this.gantry = g;
    // sign-up spot: pink ring + floating sign
    const d = this.door, ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.75, 40).rotateX(-Math.PI / 2), M.ring);
    ring.position.set(d.x, surfaceAt(d.x, d.z) + 0.06, d.z); this.g.scene.add(ring); this.signRing = ring;
    const lab = makeLabel('🏁 新中北路障礙賽 報名處', { height: 0.55, color: '#ff8cc6' });
    lab.position.set(d.x, surfaceAt(d.x, d.z) + 2.6, d.z); this.g.scene.add(lab); this.signLabel = lab;
  }
  _placeObstacles() {
    const M = mats(), C = this.C, rnd = mulberry32(8800 + this.runs * 31);
    this.obst = [];
    const add = (s, lat, kind) => {
      const p = this._at(s), x = p.x + p.rx * lat, z = p.z + p.rz * lat, y = surfaceAt(x, z);
      const grp = new THREE.Group();
      if (kind === 'cone') {
        const c = new THREE.Mesh(M.coneG, M.cone); c.position.y = 0.39; const b = new THREE.Mesh(M.bandG, M.white); b.position.y = 0.42; const base = new THREE.Mesh(M.baseG, M.black); base.position.y = 0.03;
        grp.add(c, b, base);
      } else {
        for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(M.barG, k ? M.white : M.red); m.position.set(k ? 0.5 : -0.5, 0.4, 0); grp.add(m); }
      }
      grp.position.set(x, y, z); grp.rotation.y = p.a + (kind === 'cone' ? 0 : Math.PI / 2); // barriers lie across the lane
      this.g.scene.add(grp);
      this.obst.push({ s: ((s % C.len) + C.len) % C.len, lat, kind, x, z, r: kind === 'cone' ? 0.35 : 1.05, mesh: grp, alive: true, vy: 0, spin: 0, fly: 0 });
    };
    // first obstacle well after the start, then every 70-140 m; leave the last 60 m before the line clear
    for (let s = this.s0 + 140; s < this.s0 + C.len - 60; s += 70 + rnd() * 70) {
      const p = this._at(s), half = p.w / 2 - 0.8, side = rnd() < 0.5 ? -1 : 1, t = rnd();
      // always leave at least ~3.5 m of road open; lanes too narrow for that get nothing
      if (p.w < 6.5 || this._at(s + 14).w < 6.5) continue;
      if (t < 0.45) { // row of cones closing one side (at most ~40% of the width)
        const n = clamp(Math.floor(p.w * 0.4 / 0.9) + 1, 2, 4);
        for (let k = 0; k < n; k++) add(s + k * 0.4, side * (half - k * 0.9), 'cone');
      } else if (t < 0.75) { // water barrier on one side
        add(s, side * (half - 0.9), 'barrier');
        add(s + 3, side * (half - 0.6), 'cone');
      } else { // chicane: barrier left, barrier right 14 m later
        add(s, side * (half - 0.9), 'barrier');
        add(s + 14, -side * (half - 0.9), 'barrier');
        s += 14;
      }
    }
  }

  // ---------- flow ----------
  signup() {
    const g = this.g;
    if (!g.myScooter) { g.hud.toast('找不到你的 JET SL…', 'bad'); return; }
    g.dialog([
      ['報名處 學長', '歡迎來到新中北路障礙賽！騎自己的車繞中原大學外圍 2 圈，8 台車一起比。'],
      ['報名處 學長', '路線：新中北路 → 中北路 → 大仁街 → 環中東路，再繞回這裡。小地圖上的粉紅線就是賽道。'],
      ['報名處 學長', '路上照常有車有行人，我們還擺了三角錐跟水馬，撞到會減速。你從第 6 個起跑，加油！'],
      ['彥霖', '資管要贏，比賽也要贏 ✌'],
    ], () => this.start());
  }
  start() {
    const g = this.g, pl = g.player, C = this.C, my = g.myScooter;
    this.runs++;
    this._placeObstacles();
    // grid: 2 per row behind the line
    const slot = k => { const row = Math.floor(k / 2), side = k % 2 ? 1 : -1; const prog = -(4 + row * 5.5); const p = this._at(this.s0 + prog); return { prog, lat: side * Math.min(1.6, p.w / 2 - 1), p }; };
    // rivals
    this.rivals = [];
    const rnd = mulberry32(4242 + this.runs);
    RIVALS.forEach((R, k) => {
      if (!R) return;
      const v = new Vehicle('scooter', rnd);
      const ch = createCharacter({ ...randomStudent(rnd), shirt: R.color, face: false });
      ch.root.position.copy(v.seat); v.mesh.add(ch.root); ch.update(0.1, { mode: 'ride' }); ch.setDetail(false);
      const lab = makeLabel(R.name, { height: 0.34, color: R.color }); lab.position.set(0, 2.05, 0); v.mesh.add(lab);
      g.scene.add(v.mesh);
      const sl = slot(k);
      const r = { ...R, v, ch, lab, prog: sl.prog, lat: sl.lat, latT: sl.lat, pref: (rnd() - 0.5) * 2.4, speed: 0, done: false, time: 0, stuck: 0, ghost: 0 };
      v.racer = r; v.speed = 0;
      this._placeRival(r, 0);
      this.rivals.push(r);
    });
    // you, on your JET SL in slot 6
    if (pl.vehicle && pl.vehicle !== my) pl.exit(g.scene, g.world.collision);
    const ps = slot(PLAYER_SLOT), pp = ps.p;
    my.place(pp.x + pp.rx * ps.lat, pp.z + pp.rz * ps.lat, pp.a); my.mesh.visible = true;
    if (!pl.vehicle) { pl.enter(my); g.audio.mount(); }
    if (my.hint) { my.mesh.remove(my.hint); my.hint = null; }
    g.rig.yaw = pp.a; g.rig.pitch = 0.18;
    g.hud.setTip('🏁 障礙賽', dual('<kbd>W</kbd> 油門 <kbd>S</kbd> 煞車 <kbd>A</kbd><kbd>D</kbd> 轉向 <kbd>Space</kbd> 甩尾<br>跟著小地圖的粉紅線，撞到三角錐・水馬・車子都會減速',
      '{RT} 油門 {LT} 煞車 {L} 轉向 {RB} 甩尾<br>跟著小地圖的粉紅線，撞到三角錐・水馬・車子都會減速'));
    this.pl = { prog: ps.prog, idx: Math.round((((this.s0 + ps.prog) % C.len) + C.len) % C.len / DS) % C.n, done: false, time: 0, off: 0, wrong: 0, notOn: 0 };
    this.t = 0; this.count = 3.6; this.state = 'count'; this._lastBeep = 4;
    g.hud.route = []; for (let s = 0; s < C.len; s += 8) { const p = this._at(s); g.hud.route.push([p.x, p.z]); }
    this.el.hud.classList.remove('hidden');
  }
  _finishPlayer() {
    const g = this.g;
    this.pl.done = true;
    const place = this._standings().indexOf('you') + 1; this.pl.place = place;
    const [votes, money] = REWARD[place - 1].map(v => this.runs > 1 && place > 1 ? Math.ceil(v / 2) : v);
    g.hud.bigToast(place === 1 ? '🏆 冠軍！' : `第 ${place} 名`, `完賽時間 ${fmt(this.pl.time)}`, 3000);
    if (place === 1) { g.audio.fanfare(); this.wins++; } else if (place <= 3) g.audio.checkpoint(); else g.audio.vote();
    g.addVotes(votes, `障礙賽第 ${place} 名 +${votes} 票`);
    if (money) g.earn(money, `新中北路障礙賽 第 ${place} 名獎金`);
    this.reward = { votes, money };
    this.state = 'finish'; this.finT = 2.6;
  }
  _showResults() {
    const g = this.g, list = this._standings();
    const rows = list.map((r, i) => {
      if (r === 'you') return `<tr class="me"><td>${i + 1}</td><td>彥霖（你）</td><td>${fmt(this.pl.time)}</td></tr>`;
      return `<tr><td>${i + 1}</td><td><i style="background:${r.color}"></i>${r.name}</td><td>${r.done ? fmt(r.time) : '未完賽'}</td></tr>`;
    }).join('');
    const rw = this.reward;
    this.el.res.innerHTML = `<h2>🏁 新中北路障礙賽 · 成績</h2><table>${rows}</table>
      <p class="rr-reward">獎勵：<b>+${rw.votes} 票</b>${rw.money ? `　<b>NT$${rw.money}</b>` : ''}</p>
      <div class="rr-btns"><button id="rrAgain">${dual('<kbd>R</kbd>', '{Y}')} 再比一次</button><button id="rrOk" class="go">${dual('<kbd>Enter</kbd>', '{A}')} 繼續</button></div>`;
    this.el.res.classList.remove('hidden');
    $('rrOk').onclick = () => this.close(false);
    $('rrAgain').onclick = () => this.close(true);
    document.exitPointerLock?.();
    this.state = 'results';
  }
  close(again) {
    this._cleanup();
    if (again) { this.start(); return; }
    if (!this.g.input.touch) this.g.input.canvas.requestPointerLock?.();
  }
  _cleanup() {
    const g = this.g;
    for (const r of this.rivals) g.scene.remove(r.v.mesh);
    for (const o of this.obst) g.scene.remove(o.mesh);
    this.rivals = []; this.obst = []; g.hud.route = null;
    this.el.hud.classList.add('hidden'); this.el.res.classList.add('hidden'); this.el.count.classList.add('hidden'); this.el.warn.classList.add('hidden');
    this.state = 'idle';
  }
  abandon(msg) {
    this.g.hud.bigToast('比賽中止', msg, 2600); this.g.audio.bad(); this._cleanup();
  }
  // everyone sorted: finished by time, then by progress
  _standings() {
    const all = [...this.rivals.map(r => ({ r, prog: r.prog, done: r.done, time: r.time })), { r: 'you', prog: this.pl.prog, done: this.pl.done, time: this.pl.time }];
    all.sort((a, b) => (a.done && b.done) ? a.time - b.time : a.done ? -1 : b.done ? 1 : b.prog - a.prog);
    return all.map(a => a.r);
  }

  // ---------- per frame ----------
  vehicles() { return this.rivals.map(r => r.v); }
  markers() {
    const m = [];
    if (this.state === 'idle' && this.C) m.push({ x: this.door.x, z: this.door.z, icon: '🏁', color: '#ff8cc6' });
    if (this.racing || this.state === 'finish') {
      const order = this._standings();
      for (const r of this.rivals) m.push({ x: r.v.pos.x, z: r.v.pos.z, icon: String(order.indexOf(r) + 1), color: r.color });
    }
    return m;
  }
  update(dt) {
    if (!this.C) return;
    const g = this.g, inp = g.input;
    if (this.signRing) { this.signRing.visible = this.signLabel.visible = this.state === 'idle'; this.signRing.material.opacity = 0.55 + Math.sin(g.time * 4) * 0.2; }
    if (this.state === 'idle') return;
    if (this.state === 'results') {
      if (inp.hit('Enter', 'NumpadEnter', 'KeyE', 'Space')) { inp.pressed.clear(); this.close(false); }
      else if (inp.hit('KeyR')) { inp.pressed.clear(); this.close(true); }
      return;
    }
    const pl = g.player, my = g.myScooter, C = this.C;
    // countdown
    if (this.state === 'count') {
      this.count -= dt;
      const n = Math.ceil(this.count - 0.6);
      if (n !== this._lastBeep && n >= 0) { this._lastBeep = n; if (n > 0) g.audio.tone(660, 0.18, 'square', 0.12); else g.audio.tone(1320, 0.45, 'square', 0.14); }
      this.el.count.classList.remove('hidden');
      this.el.count.textContent = n > 0 ? String(n) : 'GO!';
      this.el.count.classList.toggle('go', n <= 0);
      if (this.count <= 0.6) { this.state = 'race'; g.hud.toast('🏁 出發！', 'good', 1200); }
      for (const r of this.rivals) this._placeRival(r, dt);
      this._hud();
      return;
    }
    if (this.el.count.textContent === 'GO!' && (this._goT = (this._goT || 0) + dt) > 0.9) { this.el.count.classList.add('hidden'); this._goT = 0; this.el.count.textContent = ''; }
    this.t += dt;
    // ---- you ----
    const P = this.pl;
    if (!P.done) {
      P.time += dt;
      const wp = pl.worldPos(), pr = this._project(wp.x, wp.z, P.idx, 30);
      let warn = '';
      if (pr.d < 22) {
        let dlt = pr.s - P.idx * DS; if (dlt > C.len / 2) dlt -= C.len; if (dlt < -C.len / 2) dlt += C.len;
        P.prog += dlt; P.idx = pr.i; P.off = 0;
      } else { P.off += dt; warn = '⚠ 偏離賽道！回到粉紅線上'; }
      // riding the wrong way
      const v = pl.vehicle;
      if (v && Math.abs(v.speed) > 4) { const a = this._at(P.idx * DS); const dot = Math.sin(v.heading) * a.tx + Math.cos(v.heading) * a.tz; P.wrong = dot * Math.sign(v.speed) < -0.3 ? P.wrong + dt : 0; } else P.wrong = Math.max(0, P.wrong - dt);
      if (P.wrong > 1.2) warn = '⛔ 逆向了！迴轉！';
      if (v !== my) { P.notOn += dt; warn = `🛵 騎回你的 JET SL！（${Math.max(0, Math.ceil(20 - P.notOn))} 秒內）`; if (P.notOn > 20) { this.abandon('離開機車太久，視同棄權'); return; } } else P.notOn = 0;
      // marshal tows you back if you are lost for a while
      if (P.off > 5 && v === my) {
        const a = this._at(P.idx * DS); my.place(a.x, a.z, a.a); P.off = 0; g.hud.toast('工作人員把你拉回賽道 🚩', 'bad', 1800);
      }
      this.el.warn.textContent = warn; this.el.warn.classList.toggle('hidden', !warn);
      if (v === my) this._hitObstacles(my, true);
      if (P.prog >= LAPS * C.len) this._finishPlayer();
    }
    // ---- rivals ----
    for (const r of this.rivals) this._rival(r, dt);
    if (this.state === 'finish') { this.finT -= dt; if (this.finT <= 0) this._showResults(); }
    // flying cones
    for (const o of this.obst) if (!o.alive && o.fly > 0) {
      o.fly -= dt; o.vy -= 18 * dt; o.mesh.position.x += o.vx * dt; o.mesh.position.z += o.vz * dt; o.mesh.position.y = Math.max(surfaceAt(o.mesh.position.x, o.mesh.position.z), o.mesh.position.y + o.vy * dt);
      o.mesh.rotation.x += o.spin * dt;
    }
    this._hud();
  }
  // knock cones away / bounce off barriers
  _hitObstacles(v, isPlayer) {
    const g = this.g;
    for (const o of this.obst) {
      if (!o.alive) continue;
      const dx = v.pos.x - o.x, dz = v.pos.z - o.z, rr = v.radius + o.r;
      if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
      // barriers are 2 m long across the lane: check against the segment, cones as points
      let d, nx, nz;
      if (o.kind === 'barrier') {
        const a = this._at(o.s), ax = a.rx, az = a.rz; const t = clamp(dx * ax + dz * az, -1, 1);
        const cx = dx - ax * t, cz = dz - az * t; d = Math.hypot(cx, cz); nx = cx / (d || 1); nz = cz / (d || 1);
        if (d < v.radius + 0.3) {
          const push = v.radius + 0.3 - d; v.pos.x += nx * push; v.pos.z += nz * push;
          const imp = Math.abs(v.speed);
          v.speed *= isPlayer ? 0.35 : 0.5;
          if (isPlayer && imp > 3) { g.audio.bump(imp / 3); g.rig.cur.y += Math.min(0.3, imp * 0.02); if (!this._bt || g.time - this._bt > 0.6) { g.hud.toast('撞到水馬！', 'bad', 900); this._bt = g.time; } }
          if (v.racer) v.racer.speed = v.speed;
        }
      } else {
        d = Math.hypot(dx, dz);
        if (d < rr) {
          o.alive = false; o.fly = 1.6; const sp = Math.max(4, Math.abs(v.speed));
          const [fx, fz] = v.forward(); o.vx = fx * sp * 0.8 + (Math.random() - 0.5) * 3; o.vz = fz * sp * 0.8 + (Math.random() - 0.5) * 3; o.vy = 4 + Math.random() * 2; o.spin = 8 + Math.random() * 6;
          v.speed *= 0.78; if (v.racer) v.racer.speed = v.speed;
          if (isPlayer) g.audio.noise?.(0.12, 600, 0.9, 0.18);
        }
      }
    }
  }
  _placeRival(r, dt) {
    const a = this._at(this.s0 + r.prog);
    const half = Math.max(1, a.w / 2 - 0.8); r.lat = clamp(r.lat, -half, half);
    const v = r.v, x = a.x + a.rx * r.lat, z = a.z + a.rz * r.lat;
    const latV = dt > 0 ? (r.lat - (r._pl ?? r.lat)) / dt : 0; r._pl = r.lat;
    const h = a.a - Math.atan2(latV, Math.max(3, r.speed));
    const turn = dt > 0 ? angDiff(h, v.heading) / dt : 0;
    v.pos.set(x, 0, z); v.heading = h; v.moveAng = h; v.speed = r.speed;
    v.steer = clamp(turn * 0.6, -1, 1);
    v.sync(dt);
    const dPl = Math.hypot(x - this.g.player.worldPos().x, z - this.g.player.worldPos().z);
    v.mesh.visible = dPl < 260; r.lab.visible = dPl < 70;
    if (dPl < 60) r.ch.update(dt, { mode: 'ride' });
  }
  _rival(r, dt) {
    const g = this.g, C = this.C, wp = g.player.worldPos();
    const a = this._at(this.s0 + r.prog), half = Math.max(1, a.w / 2 - 0.8);
    // target speed: corner profile ahead, rival skill, mild rubber band toward the player
    let vlim = 23; for (let k = 0; k <= 12; k += 3) vlim = Math.min(vlim, this._at(this.s0 + r.prog + k * DS).v);
    let target = Math.min(r.top, vlim * r.skill + 1.2);
    const gap = r.prog - this.pl.prog;
    if (!this.pl.done) { if (gap > 120) target *= 0.94; else if (gap < -150) target *= 1.05; }
    if (r.done) target = 7;
    // obstacles ahead, in the course frame
    const objs = [], rx = a.x + a.rx * r.lat, rz = a.z + a.rz * r.lat;
    const consider = (ox, oz, rad, vel) => {
      const dx = ox - rx, dz = oz - rz; if (dx * dx + dz * dz > 34 * 34) return;
      const ahead = dx * a.tx + dz * a.tz; if (ahead < -1.5 || ahead > 30) return;
      objs.push({ ahead, lat: r.lat + dx * a.rx + dz * a.rz, rad, vel });
    };
    if (r.ghost <= 0) {
      for (const t of g.traffic.vehicles()) consider(t.pos.x, t.pos.z, t.radius, t.speed * (Math.sin(t.heading) * a.tx + Math.cos(t.heading) * a.tz));
      for (const p of g.peds.active()) consider(p.pos.x, p.pos.z, 0.45, 0);
      for (const o of this.rivals) if (o !== r) consider(o.v.pos.x, o.v.pos.z, o.v.radius, o.speed);
      const pv = g.player.vehicle; consider(wp.x, wp.z, pv ? pv.radius : 0.5, pv ? pv.speed : 0);
      for (const v of g.vehicles) if (v !== pv && Math.abs(v.pos.x - rx) < 34 && Math.abs(v.pos.z - rz) < 34) consider(v.pos.x, v.pos.z, v.radius, 0);
    }
    for (const o of this.obst) {
      if (!o.alive || r.ghost > 0) continue; // a rival that was stuck just plows through
      let ds = o.s - (((this.s0 + r.prog) % C.len) + C.len) % C.len; if (ds < -C.len / 2) ds += C.len; if (ds > C.len / 2) ds -= C.len;
      if (ds > -1.5 && ds < 30) objs.push({ ahead: ds, lat: o.lat, rad: o.kind === 'barrier' ? 1.15 : o.r, vel: 0 });
    }
    const block = lc => { let best = null; for (const o of objs) if (Math.abs(o.lat - lc) < o.rad + 0.75 + 0.35 && (!best || o.ahead < best.ahead)) best = o; return best; };
    const cur = block(r.latT);
    if (cur && cur.ahead < 24) {
      // find the free-est lane; prefer staying close
      let bestL = r.latT, bestD = cur.ahead;
      for (let lc = -half; lc <= half + 1e-3; lc += 0.7) {
        const b = block(lc), d = b ? b.ahead : 40, score = d - Math.abs(lc - r.lat) * 0.6;
        if (score > bestD - Math.abs(bestL - r.lat) * 0.6 + 1.5) { bestD = d; bestL = lc; }
      }
      r.latT = bestL;
    } else if (!cur) r.latT += clamp(clamp(r.pref, -half, half) - r.latT, -0.6 * dt, 0.6 * dt);
    r.latT = clamp(r.latT, -half, half);
    const now = block(r.lat);
    if (now && now.ahead < 16) target = Math.min(target, Math.max(0, now.vel) + Math.max(0, now.ahead - 2.5) * 1.3);
    r.speed += clamp(target - r.speed, -11 * dt, 6.5 * dt);
    r.lat += clamp(r.latT - r.lat, -3.2 * dt, 3.2 * dt);
    // unstick: stopped for a while -> squeeze through
    if (r.ghost > 0) r.ghost -= dt;
    if (this.state === 'race' && r.speed < 1 && !r.done) { r.stuck += dt; if (r.stuck > 1.5) { r.ghost = 1.5; r.stuck = 0; } } else r.stuck = 0; // e.g. a parked car filling a 5 m lane
    if (this.state === 'race' || this.state === 'finish') r.prog += r.speed * dt;
    if (!r.done) r.time += dt;
    if (!r.done && r.prog >= LAPS * C.len) r.done = true;
    this._placeRival(r, dt);
    // contacts: traffic, pedestrians, you, cones / barriers
    const v = r.v;
    for (const t of g.traffic.vehicles()) {
      const d = Math.hypot(t.pos.x - v.pos.x, t.pos.z - v.pos.z);
      if (d < t.radius + v.radius) { r.speed *= 0.5; t.ai.stunned = 1.5; }
    }
    if (r.speed > 3) for (const p of g.peds.active()) {
      if (Math.hypot(p.pos.x - v.pos.x, p.pos.z - v.pos.z) < v.radius + 0.45) { const [fx, fz] = v.forward(); if (g.peds.knock(p, fx, fz)) r.speed *= 0.6; }
    }
    const pv = g.player.vehicle;
    if (pv && Math.hypot(pv.pos.x - v.pos.x, pv.pos.z - v.pos.z) < pv.radius + v.radius) { r.speed *= 0.85; const side = (pv.pos.x - v.pos.x) * a.rx + (pv.pos.z - v.pos.z) * a.rz; r.lat -= Math.sign(side || 1) * 0.4; r.latT = r.lat; }
    this._hitObstacles(v, false);
  }
  _hud() {
    const C = this.C, P = this.pl, order = this._standings(), me = order.indexOf('you') + 1;
    const lap = clamp(Math.floor(Math.max(0, P.prog) / C.len) + 1, 1, LAPS);
    this.el.pos.innerHTML = `<b>${me}</b><small>/ ${order.length}</small>`;
    this.el.lap.textContent = P.done ? '完賽' : `第 ${lap} / ${LAPS} 圈`;
    this.el.time.textContent = fmt(P.time || 0);
    this.el.list.innerHTML = order.map((r, i) => r === 'you' ? `<li class="me">${i + 1}. 彥霖</li>` : `<li>${i + 1}. <i style="background:${r.color}"></i>${r.name}</li>`).join('');
    if (lap !== this._lap) { if (this._lap && lap === LAPS && !P.done) { this.g.hud.bigToast('最後一圈！', 'FINAL LAP', 1800); this.g.audio.checkpoint(); } this._lap = lap; }
  }
  _ui() {
    const hud = $('hud');
    const mk = (id, cls, html = '') => { const e = document.createElement('div'); e.id = id; e.className = cls; e.innerHTML = html; hud.appendChild(e); return e; };
    const box = mk('raceHud', 'hidden', '<div class="rh-title">🏁 新中北路障礙賽</div><div class="rh-row"><div class="rh-pos"></div><div><div class="rh-lap"></div><div class="rh-time"></div></div></div><ol class="rh-list"></ol>');
    this.el = {
      hud: box, pos: box.querySelector('.rh-pos'), lap: box.querySelector('.rh-lap'), time: box.querySelector('.rh-time'), list: box.querySelector('.rh-list'),
      count: mk('raceCount', 'hidden'), warn: mk('raceWarn', 'hidden'), res: mk('raceResult', 'hidden'),
    };
  }
}
