// 麥當勞內場值班 — the kitchen side of the part-time job (mcshift.js is the counter side and owns this:
// g.job.startKitchen()). Orders from the registers come up on the KVS screen; 彥霖 runs the cooking line:
// clamshell grill (beef patties), chicken fryer and fries fryer. A station beeps when its food is done —
// lift it in time (too early = raw, too late = burnt, both go to waste). Cooked food goes into the UHC
// holding cabinet, and Enter sends out the oldest order the cabinet can fill. Pays the same hourly wage plus
// a speed bonus; fast orders win over the counter crew (votes, sharing the counter shift's cap).
// The grill platen, fry baskets, patties and the KVS screen are real meshes at anchors from buildMcKitchen.
import * as THREE from 'three';
import { mulberry32 } from './map.js';
import { dressCrew } from './mcuniform.js';
import { dual } from './prompts.js';

// station key as shown to the player: 1 / 2 / 3 on keyboard, D-pad on a gamepad (input.js job layout)
const KEY = (g, def) => g.hud.keyLabel(String(def.key), ['Up', 'Right', 'Down', 'Left', 'X', 'Y'][def.key - 1]);
const STATIONS = [
  { k: 'beef', key: 1, name: '煎台', what: '牛肉餅', icon: '🥩', time: 6.5, yield: 2 },
  { k: 'chick', key: 2, name: '炸雞爐', what: '炸雞', icon: '🍗', time: 7.5, yield: 2 },
  { k: 'fries', key: 3, name: '薯條爐', what: '薯條', icon: '🍟', time: 5.5, yield: 2 },
];
const ST = Object.fromEntries(STATIONS.map(s => [s.k, s]));
const READY = 0.92, BURN = 1.3, MAXP = 1.5; // fraction of the cook time: lift between READY and BURN; at MAXP it burns by itself
const CAP = 4; // UHC slots per item
const DISHES = [
  { k: 'bigmac', name: '大麥克', icon: '🍔', need: { beef: 2 } },
  { k: 'chicken', name: '麥香雞', icon: '🥪', need: { chick: 1 } },
  { k: 'nugget', name: '麥克雞塊', icon: '🍗', need: { chick: 1 } },
  { k: 'fries', name: '薯條', icon: '🍟', need: { fries: 1 } },
];
const DISH = Object.fromEntries(DISHES.map(d => [d.k, d]));
const SHIFT_TICKETS = 6, MAX_WAIT = 3;
const RAW = ['還沒熟…只好丟掉 😣', '中間還是生的，報廢！', '太早起鍋了，重來！'];
const BURNT = ['焦掉了…丟掉重來 💨', '黑掉了啦！報廢！', '這個不能給客人吃…'];
const PRAISE = ['櫃台：「出餐好快！」', '小芸：「內場今天好順喔～」', '店長：「這速度可以喔！」'];
const BOSS_END = [
  [6, '店長：「內場有你，尖峰時段都不怕了！」'],
  [4, '店長：「手腳很俐落，下次排你煎台。」'],
  [1, '店長：「肉餅要聽到嗶聲再起鍋喔。」'],
  [0, '店長：「……今天的單都被櫃台退光了。」'],
];
// cooking colours: raw -> done (p = 1) -> burnt (p >= BURN)
const COL = {
  beef: ['#c96d74', '#5b3423', '#1b1411'],
  chick: ['#ead39f', '#c98a3c', '#3c2410'],
  fries: ['#f1e2a6', '#e9b443', '#6b4419'],
};
const _c = new THREE.Color();
function cookColor(k, p, out) {
  const [a, b, c] = COL[k];
  if (p <= 1) return out.set(a).lerp(_c.set(b), Math.max(0, p));
  return out.set(b).lerp(_c.set(c), Math.min(1, (p - 1) / (BURN - 1)));
}

export class McKitchen {
  constructor(game, shift) {
    this.g = game; this.shift = shift;
    this.mcd = game.interiors.mcd; this.k = this.mcd.k; this.a = this.mcd.kitchen;
    this.state = 'off'; // 'off' | 'shift' | 'summary'
    this.rnd = mulberry32(((Date.now() >> 3) & 0xffff) ^ 0x6b17);
    this.st = Object.fromEntries(STATIONS.map(s => [s.k, { on: false, t: 0, beeped: false, show: 0, lastP: 0 }]));
    this.stock = { beef: 0, chick: 0, fries: 0 };
    this.tickets = [];
    this._camPos = new THREE.Vector3(); this._camFrom = new THREE.Vector3(); this._look = new THREE.Vector3(); this._lookFrom = new THREE.Vector3();
    this._buildProps();
    this._buildUI();
    this._drawKVS();
  }
  get active() { return this.state !== 'off'; }
  wpos(lx, lz, y = 0) { const [x, z] = this.k.w(lx, lz); return new THREE.Vector3(x, this.k.base + y, z); }
  pick(a) { return a[Math.floor(this.rnd() * a.length)]; }

  // ------------------------------------------------------------------ meshes on the line
  _buildProps() {
    const a = this.a, scene = this.g.scene;
    const steel = new THREE.MeshStandardMaterial({ color: '#d3d7dc', metalness: 0.5, roughness: 0.3, emissive: '#ffe4c4', emissiveIntensity: 0.12 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1f2023', roughness: 0.5 });
    const wire = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.85 });
    // clamshell platen of the second grill: pivots on its hinge, upright when open
    const g = a.grill, hinge = new THREE.Group();
    hinge.position.copy(this.wpos(g.hinge[0], g.hinge[1], g.hingeY));
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.63, g.len - 0.1), steel); slab.position.set(0.035, 0.315, 0);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.54, g.len - 0.2), dark); face.position.set(0.073, 0.31, 0);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, g.len - 0.4, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#dfe2e6', metalness: 0.9, roughness: 0.2 }));
    handle.position.set(0.1, 0.6, 0);
    hinge.add(slab, face, handle); hinge.traverse(o => { o.castShadow = true; });
    scene.add(hinge); this.platen = hinge; this.platenA = 0;
    // beef patties (hidden until cooking)
    this.pattyMat = new THREE.MeshStandardMaterial({ color: COL.beef[0], roughness: 0.75 });
    const pg = new THREE.CylinderGeometry(0.055, 0.055, 0.014, 16);
    this.patties = g.patties.map(([x, z]) => { const m = new THREE.Mesh(pg, this.pattyMat); m.position.copy(this.wpos(x, z, g.top + 0.007)); m.visible = false; scene.add(m); return m; });
    // fry baskets (two per fryer) with their load; hang tilted over the oil when idle
    const basketGeo = (() => {
      const w = 0.4, d = 0.36, h = 0.15, t = 0.006, parts = [];
      parts.push(new THREE.BoxGeometry(w, t, d).translate(0, -h / 2, 0));
      for (const s of [-1, 1]) { parts.push(new THREE.BoxGeometry(w, h, t).translate(0, 0, s * d / 2)); parts.push(new THREE.BoxGeometry(t, h, d).translate(s * w / 2, 0, 0)); }
      return parts;
    })();
    const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8).rotateZ(Math.PI / 2).translate(0.36, 0.06, 0);
    const loadGeo = { fries: [], chick: [] };
    const r = mulberry32(77);
    for (let i = 0; i < 26; i++) loadGeo.fries.push(new THREE.BoxGeometry(0.014, 0.014, 0.12).rotateY(r() * Math.PI).rotateX((r() - 0.5) * 0.6).translate((r() - 0.5) * 0.32, -0.04 + r() * 0.06, (r() - 0.5) * 0.26));
    for (let i = 0; i < 9; i++) loadGeo.chick.push(new THREE.DodecahedronGeometry(0.04, 0).scale(1.2, 0.7, 1).rotateY(r() * 3).translate((r() - 0.5) * 0.28, -0.04 + r() * 0.04, (r() - 0.5) * 0.22));
    this.baskets = {};
    for (const k of ['chick', 'fries']) {
      const mat = new THREE.MeshStandardMaterial({ color: COL[k][0], roughness: 0.6 });
      const load = new THREE.Mesh(mergeList(loadGeo[k]), mat); load.visible = false;
      this.baskets[k] = { mat, list: a.fryers[k].map(([x, z]) => {
        const grp = new THREE.Group();
        for (const pgm of basketGeo) grp.add(new THREE.Mesh(pgm, wire));
        grp.add(new THREE.Mesh(handleGeo, dark));
        const l = load.clone(); grp.add(l);
        grp.position.copy(this.wpos(x, z, 0)); grp.userData = { base: this.wpos(x, z, 0), load: l };
        scene.add(grp); return grp;
      }), y: 0 };
    }
    // KVS screen hung under the hood: shows the live orders during the shift
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    this.kvsCtx = cv.getContext('2d'); this.kvsTex = new THREE.CanvasTexture(cv); this.kvsTex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Group();
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.66), dark); scr.add(bezel);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshStandardMaterial({ map: this.kvsTex, emissive: '#ffffff', emissiveMap: this.kvsTex, emissiveIntensity: 0.9 }));
    pane.rotation.y = Math.PI / 2; pane.position.x = 0.026; scr.add(pane);
    const [kx, ky, kz] = a.kvs; scr.position.copy(this.wpos(kx, kz, ky)); scr.rotation.y = this.k.heading(0);
    scene.add(scr);
    // smoke puffs for burnt food
    this.puffs = [];
    const pm = new THREE.SpriteMaterial({ color: '#8a8a8a', transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(pm.clone()); s.visible = false; scene.add(s); this.puffs.push({ s, t: 0 }); }
    this._setBaskets(0);
  }
  _stationPos(k) {
    if (k === 'beef') { const p = this.a.grill.patties; return this.wpos((p[0][0] + p[3][0]) / 2, (p[0][1] + p[3][1]) / 2, 1.0); }
    const l = this.a.fryers[k]; return this.wpos((l[0][0] + l[1][0]) / 2, (l[0][1] + l[1][1]) / 2, 1.0);
  }
  _setBaskets(dt) {
    for (const k of ['chick', 'fries']) {
      const b = this.baskets[k], s = this.st[k];
      const target = s.on ? 1 : 0;
      b.y += (target - b.y) * (dt ? Math.min(1, dt * 6) : 1);
      for (const grp of b.list) {
        const base = grp.userData.base;
        // idle: hung up on the rack, tipped back; cooking: dropped into the oil
        grp.position.set(base.x, base.y + THREE.MathUtils.lerp(1.12, this.a.fryers.oil - 0.02, b.y), base.z);
        grp.rotation.z = THREE.MathUtils.lerp(0.5, 0, b.y);
        grp.userData.load.visible = s.on || s.show > 0;
      }
      if (s.on || s.show > 0) cookColor(k, s.on ? s.t / ST[k].time : s.lastP, b.mat.color);
    }
  }
  _puff(k) {
    const p = this._stationPos(k);
    for (let i = 0; i < 5; i++) {
      const f = this.puffs.find(o => o.t <= 0); if (!f) break;
      f.t = 1.6 + i * 0.15; f.s.visible = true; f.s.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y - 0.05, p.z + (Math.random() - 0.5) * 0.3); f.v = 0.35 + Math.random() * 0.3;
    }
  }

  // ------------------------------------------------------------------ shift flow
  start() {
    if (this.active || this.shift.active) return;
    const g = this.g, pl = g.player;
    this.state = 'shift'; this.mcd.busy = true;
    this.done = 0; this.missed = 0; this.wasted = 0; this.spawned = 0; this.spawnT = 0.8; this.bonus = 0; this.shiftVotes = 0; this.no = 100 + Math.floor(this.rnd() * 40);
    this.tickets = []; this.stock = { beef: 0, chick: 0, fries: 0 };
    for (const s of Object.values(this.st)) Object.assign(s, { on: false, t: 0, beeped: false, show: 0 });
    const [px, pz] = this.k.w(...this.a.player);
    pl.pos.x = px; pl.pos.z = pz; pl.vel.set(0, 0); pl.heading = this.k.heading(-Math.PI / 2); pl.ch.root.rotation.y = pl.heading;
    this._undress = dressCrew(pl.ch, { name: '彥霖' });
    this._camT = 0; this._camFrom.copy(g.camera.position);
    g.camera.getWorldDirection(this._lookFrom).multiplyScalar(5).add(g.camera.position);
    document.exitPointerLock?.();
    g.audio.setEngine(false, 0);
    g.hud.bigToast('內場上工！', '麥當勞 中原店 · 煎台＋炸爐', 1800);
    g._tipMode = 'mckitchen';
    g.hud.setTip('🍔 麥當勞內場', dual('<kbd>1</kbd> 煎台 · <kbd>2</kbd> 炸雞 · <kbd>3</kbd> 薯條（按一次下鍋，嗶聲後再按起鍋）<br><kbd>Enter</kbd> 出餐 · <kbd>E</kbd>／<kbd>Esc</kbd> 下班',
      '{Up} 煎台 · {Right} 炸雞 · {Down} 薯條（按一次下鍋，嗶聲後再按起鍋）<br>{A} 出餐 · {Menu} 下班'));
    this.ui.root.classList.remove('hidden'); this.ui.summary.classList.add('hidden'); this.ui.pos.classList.remove('hidden');
    this._renderTickets(); this._renderStock(); this._renderStats(); this._drawKVS();
  }
  finish(early) {
    if (this.state !== 'shift') return;
    const g = this.g;
    this.state = 'summary';
    for (const s of Object.values(this.st)) { if (s.on) { s.on = false; s.show = 0; } }
    let perfect = 0;
    if (!early && this.done === SHIFT_TICKETS && this.missed === 0) perfect = this._grant(2, '內場零退餐！同事們都說要投你 +2 票');
    const handled = this.done + this.missed, full = !early;
    const wage = full ? this.shift.wage : Math.round(this.shift.wage * handled / SHIFT_TICKETS), pay = wage + this.bonus;
    if (pay > 0) { g.earn(pay, `麥當勞內場（${this.done} 張單）`); g.clock += full ? 60 : 10 * handled; }
    this.shift.book(pay, full);
    const line = BOSS_END.find(([n]) => this.done >= n)[1];
    this.ui.summary.innerHTML = `<div class="mc-sum-card">
      <div class="mc-sum-kicker">麥當勞 中原店 · 內場結算</div>
      <div class="mc-sum-title">${early ? '提早下班' : '下班囉！'}</div>
      <div class="mc-sum-grid">
        <div><b>${this.done}</b><span>張單出餐</span></div>
        <div><b>${this.wasted}</b><span>份報廢</span></div>
        <div><b>${this.missed}</b><span>張單退餐</span></div>
        <div class="v"><b>+${this.shiftVotes}</b><span>票</span></div>
      </div>
      <div class="mc-sum-pay">${pay > 0 ? `時薪 NT$ ${wage} ＋ 出餐獎金 NT$ ${this.bonus} ＝ <b>NT$ ${pay}</b>` : '這班沒有收入'}</div>
      <div class="mc-sum-boss">${line}${perfect ? '<br>零退餐加碼 +' + perfect + ' 票！' : ''}</div>
      <button class="menu-btn primary" id="mkDone"><span>👋 回到校園</span><small>ENTER</small></button>
    </div>`;
    this.ui.summary.querySelector('#mkDone').onclick = () => this.close();
    this.ui.pos.classList.add('hidden'); this.ui.summary.classList.remove('hidden');
    if (this.done >= 4) g.audio.fanfare();
    this._drawKVS();
  }
  close() {
    if (this.state !== 'summary') return;
    const g = this.g;
    this.state = 'off'; this.mcd.busy = false;
    this.ui.root.classList.add('hidden');
    this._undress?.(); this._undress = null;
    this.tickets = []; this._drawKVS();
    g.rig.yaw = g.player.heading; g.rig.pitch = 0.3;
    if (!g.input.touch && g.state === 'play') {
      try { const r = g.renderer.domElement.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* clicking the view does it */ }
    }
  }
  _grant(n, msg) {
    const got = this.shift.grantShared(n, msg);
    this.shiftVotes += got; return got;
  }

  // ------------------------------------------------------------------ cooking
  press(k) {
    if (this.state !== 'shift') return;
    const s = this.st[k], def = ST[k], g = this.g;
    this._face = k;
    if (!s.on) {
      if (this.stock[k] + def.yield > CAP) { g.hud.toast(`保溫櫃的${def.what}滿了，先出餐吧`, 'bad', 1400); return; }
      Object.assign(s, { on: true, t: 0, beeped: false, show: 0 });
      g.audio.blip(); g.player.setPose('give', 0.6);
    } else {
      const p = s.t / def.time;
      s.on = false; s.lastP = p; s.show = 0.7; g.player.setPose('give', 0.6);
      if (p < READY) { this.wasted++; g.hud.toast(`${def.icon} ${this.pick(RAW)}`, 'bad', 1600); g.audio.bad(); }
      else if (p > BURN) { this.wasted++; g.hud.toast(`${def.icon} ${this.pick(BURNT)}`, 'bad', 1600); g.audio.bad(); this._puff(k); }
      else { this.stock[k] = Math.min(CAP, this.stock[k] + def.yield); g.hud.toast(`✔ ${def.what} ×${def.yield} 放進保溫櫃`, 'good', 1100); g.audio.pickup(); }
      this._renderStock(); this._renderTickets(); this._renderStats();
    }
  }
  _canMake(t) {
    const need = { beef: 0, chick: 0, fries: 0 };
    for (const [d, n] of t.items) for (const [k, m] of Object.entries(DISH[d].need)) need[k] += m * n;
    const miss = Object.entries(need).filter(([k, n]) => this.stock[k] < n).map(([k, n]) => [k, n - this.stock[k]]);
    return { need, miss };
  }
  serve(t) {
    if (this.state !== 'shift') return;
    const g = this.g;
    if (!this.tickets.length) { g.hud.toast('還沒有單進來', 'bad', 1100); return; }
    t = t || this.tickets.find(o => !this._canMake(o).miss.length);
    if (!t) {
      const { miss } = this._canMake(this.tickets[0]);
      g.hud.toast(`#${this.tickets[0].no} 還缺：${miss.map(([k, n]) => `${ST[k].what}×${n}`).join('、')}`, 'bad', 1600); g.audio.bad(); return;
    }
    const { need, miss } = this._canMake(t);
    if (miss.length) { g.hud.toast(`#${t.no} 還缺：${miss.map(([k, n]) => `${ST[k].what}×${n}`).join('、')}`, 'bad', 1600); g.audio.bad(); return; }
    for (const [k, n] of Object.entries(need)) this.stock[k] -= n;
    this.tickets.splice(this.tickets.indexOf(t), 1);
    this.done++;
    const left = t.left / t.max, b = 6 + Math.round(left * 20);
    this.bonus += b;
    g.hud.toast(`🛎️ #${t.no} 出餐！獎金 +NT$ ${b}`, 'good', 1300); g.audio.pickup();
    if (left > 0.5) this._grant(1, `${this.pick(PRAISE)} +1 票`);
    g.player.setPose('give', 0.8); this._face = 'pass';
    this._renderTickets(); this._renderStock(); this._renderStats(); this._drawKVS();
  }
  _spawnTicket() {
    const i = this.spawned++;
    const lines = Math.min(3, 1 + Math.floor(this.rnd() * (1.5 + i * 0.3)));
    const pool = [...DISHES], items = new Map();
    for (let n = 0; n < lines; n++) { const d = pool.splice(Math.floor(this.rnd() * pool.length), 1)[0]; items.set(d.k, d.k === 'fries' && this.rnd() < 0.4 ? 2 : 1); }
    const units = [...items.values()].reduce((a, b) => a + b, 0);
    const max = 26 + units * 9;
    this.tickets.push({ no: ++this.no, items, max, left: max });
    this.g.audio.tone?.(988, 0.08, 'square', 0.05); this.g.audio.tone?.(1319, 0.1, 'square', 0.05, 0.09);
    this._renderTickets(); this._drawKVS();
  }

  // ------------------------------------------------------------------ per frame
  update(dt, inp = this.g.input) {
    const g = this.g;
    if (this.state === 'shift') {
      for (const s of STATIONS) if (inp.hit('Digit' + s.key, 'Numpad' + s.key)) this.press(s.k);
      if (inp.hit('Enter', 'NumpadEnter', 'Space')) this.serve();
      if (inp.hit('KeyE', 'Escape')) { inp.pressed.delete('KeyE'); inp.pressed.delete('Escape'); this.finish(true); }
      // keep 彥霖 at the line, turned toward what he is working on
      const pl = g.player, [px, pz] = this.k.w(...this.a.player);
      pl.pos.x = px; pl.pos.z = pz; pl.vel.set(0, 0);
      let want = this.k.heading(-Math.PI / 2);
      if (this._face && this._face !== 'pass') { const sp = this._stationPos(this._face); want = Math.atan2(sp.x - px, sp.z - pz); }
      else if (this._face === 'pass') want = this.k.heading(Math.PI / 2);
      pl.heading += Math.atan2(Math.sin(want - pl.heading), Math.cos(want - pl.heading)) * Math.min(1, dt * 8);
      // cooking
      for (const def of STATIONS) {
        const s = this.st[def.k];
        if (!s.on) continue;
        s.t += dt; const p = s.t / def.time;
        if (p >= 1 && !s.beeped) { s.beeped = true; for (let i = 0; i < 3; i++) g.audio.tone?.(1760, 0.07, 'square', 0.05, i * 0.12); g.hud.toast(`${def.icon} ${def.name}好了！按 ${KEY(g, def)} 起鍋`, 'good', 1000); }
        if (p >= MAXP) { s.on = false; s.lastP = p; s.show = 0.7; this.wasted++; g.hud.toast(`${def.icon} ${def.what}${this.pick(BURNT)}`, 'bad', 1600); g.audio.bad(); this._puff(def.k); this._renderStats(); }
      }
      // tickets
      this.spawnT -= dt;
      if (this.spawned < SHIFT_TICKETS && this.tickets.length < MAX_WAIT && this.spawnT <= 0) { this._spawnTicket(); this.spawnT = 9 + this.rnd() * 5; }
      for (const t of [...this.tickets]) {
        t.left -= dt;
        if (t.left <= 0) {
          this.missed++; this.tickets.splice(this.tickets.indexOf(t), 1);
          g.hud.toast(`櫃台：「#${t.no} 客人等不及，退餐了！」`, 'bad', 2000); g.audio.bad();
          this._renderTickets(); this._renderStats(); this._drawKVS();
        }
      }
      if (this.spawned >= SHIFT_TICKETS && !this.tickets.length) this.finish(false);
      this._renderBars();
      if ((this._kvsT = (this._kvsT || 0) - dt) <= 0) { this._kvsT = 0.5; this._drawKVS(); }
    } else if (this.state === 'summary') {
      if (inp.hit('Enter', 'NumpadEnter', 'Space', 'KeyE', 'Escape')) { inp.pressed.delete('KeyE'); inp.pressed.delete('Escape'); this.close(); }
    }
    // the line's meshes: platen, patties, baskets, smoke
    const bs = this.st.beef, bp = bs.on ? bs.t / ST.beef.time : bs.lastP;
    this.platenA += ((bs.on ? 1 : 0) - this.platenA) * Math.min(1, dt * 5);
    this.platen.rotation.z = -this.platenA * Math.PI / 2 * 0.98;
    for (const m of this.patties) m.visible = bs.on || bs.show > 0;
    if (bs.on || bs.show > 0) cookColor('beef', bp, this.pattyMat.color);
    for (const s of Object.values(this.st)) if (s.show > 0) s.show -= dt;
    this._setBaskets(dt);
    for (const f of this.puffs) {
      if (f.t <= 0) continue;
      f.t -= dt; f.s.position.y += f.v * dt; const a = Math.min(1, f.t / 1.6);
      f.s.material.opacity = 0.55 * a; f.s.scale.setScalar(0.25 + (1 - a) * 0.5);
      if (f.t <= 0) f.s.visible = false;
    }
  }
  // over-the-shoulder shot of the cooking line
  camera(cam, dt) {
    this._camT = Math.min(1, (this._camT || 0) + dt / 0.7);
    const e = this._camT * this._camT * (3 - 2 * this._camT);
    const [cx, cy, cz] = this.a.cam, [lx, ly, lz] = this.a.look;
    this._camPos.copy(this.wpos(cx, cz, cy)); this._look.copy(this.wpos(lx, lz, ly));
    cam.position.lerpVectors(this._camFrom, this._camPos, e);
    this._lookFrom.lerp(this._look, e);
    cam.lookAt(e >= 1 ? this._look : this._lookFrom);
  }

  // ------------------------------------------------------------------ KVS screen (3D)
  _drawKVS() {
    const g = this.kvsCtx, w = 512, h = 256;
    g.fillStyle = '#0b0c10'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, 30);
    g.fillStyle = '#9fb3d9'; g.font = '700 20px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle';
    const list = this.state === 'off' ? [{ no: 131, items: new Map([['bigmac', 1], ['fries', 1]]), left: 30, max: 40 }, { no: 132, items: new Map([['nugget', 1]]), left: 20, max: 30 }] : this.tickets;
    g.fillText(`KVS 內場　${this.state === 'shift' ? '值班中 · ' + this.tickets.length + ' 單' : '待命'}`, 10, 16);
    if (!list.length) { g.fillStyle = '#5a6b8a'; g.font = '700 26px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText(this.state === 'summary' ? '收班 · 辛苦了' : '等待訂單…', w / 2, h / 2 + 10); g.textAlign = 'left'; }
    const cw = (w - 12) / 3;
    list.slice(0, 3).forEach((t, i) => {
      const x = 6 + i * cw, f = t.left / t.max, col = f > 0.5 ? '#3ad07a' : f > 0.25 ? '#ffc72c' : '#ff5a4a';
      g.fillStyle = '#20232b'; g.fillRect(x + 3, 38, cw - 6, h - 44);
      g.fillStyle = col; g.fillRect(x + 3, 38, cw - 6, 30);
      g.fillStyle = '#111'; g.font = '900 22px Arial,sans-serif'; g.fillText('#' + t.no, x + 10, 54);
      g.font = '700 16px monospace'; g.fillText(`${Math.max(0, Math.ceil(t.left))}s`, x + cw - 52, 54);
      g.fillStyle = '#f2f2f2'; g.font = '800 21px "Noto Sans TC",sans-serif';
      [...t.items].forEach(([d, n], j) => g.fillText(`${DISH[d].name} ×${n}`, x + 10, 90 + j * 32));
      g.fillStyle = col; g.fillRect(x + 3, h - 12, (cw - 6) * Math.max(0, f), 6);
    });
    this.kvsTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ UI
  _buildUI() {
    const root = document.createElement('div'); root.id = 'mcKitchen'; root.className = 'hidden';
    root.innerHTML = `<div class="mc-pos mk-pos">
      <div class="mc-head">
        <span class="mc-brand"><i>M</i>麥當勞 中原店 · 內場值班中（時薪 NT$${this.shift.wage}）</span>
        <span class="mc-stats" id="mkStats"></span>
        <button id="mkQuit">下班 <kbd>E</kbd></button>
      </div>
      <div class="mk-body">
        <div class="mk-kvs"><div class="mc-label">出餐單 KVS</div><div class="mk-tickets" id="mkTickets"></div></div>
        <div class="mk-stations">${STATIONS.map(s => `<button class="mk-st" data-k="${s.k}"><kbd>${s.key}</kbd><em>${s.icon}</em><b>${s.name}</b><span class="mk-bar"><i class="z"></i><i class="p"></i></span><small class="mk-state"></small></button>`).join('')}</div>
        <div class="mk-uhc"><div class="mc-label">保溫櫃 UHC</div><div class="mk-stock" id="mkStock"></div>
          <div class="mc-acts"><button id="mkServe" class="go">出餐 <kbd>Enter</kbd></button></div></div>
      </div>
    </div>
    <div class="mc-summary hidden" id="mkSummary"></div>`;
    document.body.appendChild(root);
    const q = (s) => root.querySelector(s);
    this.ui = { root, pos: q('.mc-pos'), summary: q('#mkSummary'), tickets: q('#mkTickets'), stock: q('#mkStock'), stats: q('#mkStats'), st: {} };
    for (const b of root.querySelectorAll('.mk-st')) {
      this.ui.st[b.dataset.k] = { b, p: b.querySelector('.p'), state: b.querySelector('.mk-state') };
      b.querySelector('.z').style.cssText = `left:${READY / MAXP * 100}%;width:${(BURN - READY) / MAXP * 100}%`;
      b.onclick = () => this.press(b.dataset.k);
    }
    q('#mkServe').onclick = () => this.serve();
    q('#mkQuit').onclick = () => this.finish(true);
    this.ui.tickets.onclick = (e) => { const c = e.target.closest('[data-no]'); if (c) this.serve(this.tickets.find(t => t.no === +c.dataset.no)); };
    root.addEventListener('mousedown', e => e.stopPropagation());
  }
  _renderTickets() {
    if (!this.tickets.length) { this.ui.tickets.innerHTML = `<span class="mc-empty">${this.spawned >= SHIFT_TICKETS ? '最後一張單出完了！' : '等待櫃台下單…'}</span>`; this._tkEls = []; return; }
    this.ui.tickets.innerHTML = this.tickets.map(t => {
      const ok = !this._canMake(t).miss.length;
      return `<div class="mk-tk${ok ? ' ok' : ''}" data-no="${t.no}"><div class="mk-tk-h"><b>#${t.no}</b>${ok ? '<span>可出餐 ✔</span>' : ''}</div>
        <ul>${[...t.items].map(([d, n]) => `<li><em>${DISH[d].icon}</em>${DISH[d].name}<b>×${n}</b></li>`).join('')}</ul><div class="mc-pat"><i></i></div></div>`;
    }).join('');
    this._tkEls = [...this.ui.tickets.querySelectorAll('.mc-pat i')];
  }
  _renderStock() {
    this.ui.stock.innerHTML = STATIONS.map(s => `<div class="mk-row"><em>${s.icon}</em>${s.what}<span>${'<i class="on"></i>'.repeat(this.stock[s.k])}${'<i></i>'.repeat(CAP - this.stock[s.k])}</span></div>`).join('');
  }
  _renderBars() {
    for (const def of STATIONS) {
      const s = this.st[def.k], u = this.ui.st[def.k], p = s.on ? s.t / def.time : 0;
      u.p.style.width = Math.min(100, p / MAXP * 100).toFixed(1) + '%';
      const txt = !s.on ? `空的 · 按 ${KEY(this.g, def)} 下鍋` : p < READY ? `${def.name === '煎台' ? '煎' : '炸'}中… ${Math.round(p * 100)}%` : p <= BURN ? `好了！按 ${KEY(this.g, def)} 起鍋` : '要焦了！！';
      if (u.state.textContent !== txt) u.state.textContent = txt;
      u.b.classList.toggle('ready', s.on && p >= READY && p <= BURN);
      u.b.classList.toggle('burn', s.on && p > BURN);
      u.b.classList.toggle('on', s.on);
    }
    (this._tkEls || []).forEach((el, i) => { const t = this.tickets[i]; if (!t) return; const f = t.left / t.max; el.style.width = (f * 100).toFixed(1) + '%'; el.classList.toggle('low', f < 0.3); });
  }
  _renderStats() {
    this.ui.stats.innerHTML = `出餐 <b>${this.done || 0}</b>/${SHIFT_TICKETS}　報廢 <b>${this.wasted || 0}</b>　退餐 <b>${this.missed || 0}</b>　獎金 <b class="v">NT$${this.bonus || 0}</b>　拉票 <b class="v">+${this.shiftVotes || 0}</b>`;
  }
}

function mergeList(list) {
  // tiny local merge (positions/normals only) so a basket load is one mesh
  const flat = list.map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of flat) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of flat) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.array.length; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}
