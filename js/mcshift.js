// 麥當勞打工值班 — go through the staff entrance behind the counter of the 活動中心 McDonald's, take
// the students' orders, pack each tray and serve it. A shift pays the hourly wage (NT$196, pro rata
// when you leave early) plus a tip per order (faster = more), and every happy customer is worth votes;
// wrong trays and slow service cost you. interiors.js hands over the shop layout (Kit frame, staff NPC);
// main.js keeps the player frozen while `active`, calls update() every frame and camera() after the
// camera rig. shifts / earned / best feed the phone's 麥當勞 app. The kitchen-line position (mckitchen.js,
// startKitchen) runs through here too and shares the wage, those stats and the vote cap.
import * as THREE from 'three';
import { createCharacter, randomStudent } from './character.js';
import { mulberry32, makeLabel } from './map.js';
import { dressCrew } from './mcuniform.js';
import { McKitchen } from './mckitchen.js';
import { dual } from './prompts.js';

// same six items as the menu board above the counter
export const MENU = [
  { k: 'bigmac', name: '大麥克套餐', price: 155, icon: '🍔', unit: '份' },
  { k: 'chicken', name: '麥香雞套餐', price: 125, icon: '🥪', unit: '份' },
  { k: 'nugget', name: '麥克雞塊 6塊', price: 69, icon: '🍗', unit: '盒' },
  { k: 'fries', name: '薯條（大）', price: 65, icon: '🍟', unit: '份' },
  { k: 'coke', name: '可樂（中）', price: 38, icon: '🥤', unit: '杯' },
  { k: 'flurry', name: '冰炫風', price: 59, icon: '🍦', unit: '杯' },
];
const ITEM = Object.fromEntries(MENU.map(m => [m.k, m]));
const NUM = ['', '一', '兩', '三'];
const SHIFT_CUSTOMERS = 6, QUEUE_MAX = 4;
const VOTE_CAP = 24; // votes one player can earn from all shifts together (the guardhouse caps at 8)
const WALK = 1.9;
export const WAGE = 196; // hourly wage, one full shift = one hour

// shop-local layout (see buildMcD): you walk in facing the counter (x 15.2–16.2, z 1.4–8.6, customers on
// its east side), the door is in the east glass front at z 3.4–7.4, the dining room is on its left (north)
const REGISTER = [14.6, 5.0];
const LINE_Z = 5.0, SLOT = (i) => [17.0 + i * 1.15, LINE_Z];
const LEAVE_Z = 6.6; // walk out beside the queue, still inside the door opening

const GREET = ['學長好！', '你好～', '嗨嗨！', '不好意思～', '哈囉！'];
const RECOG = ['欸！你不是那個資管系的候選人彥霖嗎？', '咦，彥霖學長怎麼在這裡打工？', '是競選海報上那個人耶！'];
const THANKS = ['謝謝！好快喔 👍', '讚啦，選舉加油！', '我會投你一票的！', '學長辛苦了～', '太神啦，一次就對！'];
const THANKS_RECOG = ['候選人親自送餐，這票給你了！', '我室友是資管的，我叫她投你！', '資管要贏，票投彥霖！✌'];
const ANGRY = ['等太久了…我去夜市吃好了 😤', '上課要遲到了，不等了！', '算了算了，我去吃便當。'];
const BOSS_END = [
  [5, '店長：「你根本是得來速之光，明天正式排班！」'],
  [3, '店長：「不錯喔，下次動作再快一點。」'],
  [1, '店長：「……你還是專心選舉好了。」'],
  [0, '店長：「客人都跑光了啦！」'],
];

export class McShift {
  constructor(game) {
    this.g = game;
    const mcd = game.interiors.mcd;
    this.mcd = mcd; this.k = mcd.k;
    this.state = 'off'; // 'off' | 'shift' | 'summary'
    this.customers = []; this.totalVotes = 0;
    this.shifts = 0; this.earned = 0; this.best = 0; // completed shifts / total pay / best single shift (phone app)
    this.rnd = mulberry32((Date.now() & 0xffff) ^ 0x5eed); // own stream: never touches the world/NPC randomness
    this._camPos = new THREE.Vector3(); this._camFrom = new THREE.Vector3(); this._look = new THREE.Vector3(); this._lookFrom = new THREE.Vector3();
    this.wage = WAGE;
    this._buildUI();
    this.kitchen = new McKitchen(game, this); // the kitchen-line shift (mckitchen.js) shares wage, stats and vote cap
  }
  get active() { return this.state !== 'off' || this.kitchen.active; }
  startKitchen() { if (!this.active) this.kitchen.start(); }
  // pay / stats shared by both positions (phone app)
  book(pay, full) { if (pay > 0) { this.earned += pay; this.best = Math.max(this.best, pay); } if (full) this.shifts++; }
  // votes from both positions share one cap
  grantShared(n, msg) {
    const left = Math.max(0, VOTE_CAP - this.totalVotes), got = Math.min(n, left);
    if (got > 0) { this.totalVotes += got; this.g.addVotes(got, msg.replace(/\+\d+ 票/, `+${got} 票`)); }
    return got;
  }

  // ------------------------------------------------------------------ helpers (shop-local -> world)
  wpos(lx, lz, y = 0) { const [x, z] = this.k.w(lx, lz); return new THREE.Vector3(x, this.k.base + y, z); }
  pick(a) { return a[Math.floor(this.rnd() * a.length)]; }

  // ------------------------------------------------------------------ shift flow
  start() {
    if (this.active) return;
    const g = this.g, pl = g.player;
    this.state = 'shift'; this.mcd.busy = true;
    this.served = 0; this.missed = 0; this.mistakes = 0; this.spawned = 0; this.spawnT = 0.6; this.shiftVotes = 0; this.tips = 0;
    this.tray = new Map(); this.trayOrder = []; this.front = null;
    // 彥霖 at the register in crew cap; the regular crew member moves over to the fryers
    const [rx, rz] = this.k.w(...REGISTER);
    pl.pos.x = rx; pl.pos.z = rz; pl.heading = this.k.heading(Math.PI / 2); pl.vel.set(0, 0); pl.ch.root.rotation.y = pl.heading;
    this._uniform(true);
    const s = this.mcd.staff;
    s.root.position.copy(this.wpos(...this.mcd.kitchen.fryStaff)); s.root.rotation.y = this.k.heading(-Math.PI / 2); // at the fryers
    // camera eases from wherever it is to the over-the-shoulder shot
    this._camT = 0; this._camFrom.copy(g.camera.position);
    g.camera.getWorldDirection(this._lookFrom).multiplyScalar(5).add(g.camera.position);
    document.exitPointerLock?.();
    g.audio.setEngine(false, 0);
    g.hud.bigToast('打卡上班！', '麥當勞 中原店 · 值班開始', 1800);
    g._tipMode = 'mcshift';
    g.hud.setTip('🍟 麥當勞值班', dual('<kbd>1</kbd>–<kbd>6</kbd> 放餐點 · 點托盤可拿掉<br><kbd>⌫</kbd> 拿掉最後一樣 · <kbd>Enter</kbd> 出餐 · <kbd>E</kbd>／<kbd>Esc</kbd> 下班',
      '{Up}{Right}{Down}{Left}{X}{Y} 放餐點 1–6<br>{B} 拿掉最後一樣 · {A} 出餐 · {Menu} 下班'));
    this.ui.root.classList.remove('hidden'); this.ui.summary.classList.add('hidden'); this.ui.pos.classList.remove('hidden');
    this._renderTicket(); this._renderTray(); this._renderStats();
  }
  // end of shift (all customers handled, or the player clocks out early) -> summary card
  finish(early) {
    if (this.state !== 'shift') return;
    const g = this.g;
    this.state = 'summary';
    for (const c of this.customers) if (c.state !== 'leaving') this._leave(c, early ? null : '😐');
    this.front = null;
    let bonus = 0;
    if (!early && this.served === SHIFT_CUSTOMERS && this.mistakes === 0) bonus = this._grant(3, '完美值班！店長加碼 +3 票');
    // pay: the full hour when the shift ran to the end, otherwise the wage for the customers handled
    const handled = this.served + this.missed, full = !early;
    const wage = full ? WAGE : Math.round(WAGE * handled / SHIFT_CUSTOMERS), pay = wage + this.tips;
    if (pay > 0) {
      g.earn(pay, `麥當勞打工（${this.served} 位客人）`);
      g.clock += full ? 60 : 10 * handled;
    }
    this.book(pay, full);
    const line = BOSS_END.find(([n]) => this.served >= n)[1];
    this.ui.summary.innerHTML = `<div class="mc-sum-card">
      <div class="mc-sum-kicker">麥當勞 中原店 · 值班結算</div>
      <div class="mc-sum-title">${early ? '提早下班' : '下班囉！'}</div>
      <div class="mc-sum-grid">
        <div><b>${this.served}</b><span>位客人</span></div>
        <div><b>${this.mistakes}</b><span>次出錯</span></div>
        <div><b>${this.missed}</b><span>位等到跑掉</span></div>
        <div class="v"><b>+${this.shiftVotes}</b><span>票</span></div>
      </div>
      <div class="mc-sum-pay">${pay > 0 ? `時薪 NT$ ${wage} ＋ 小費 NT$ ${this.tips} ＝ <b>NT$ ${pay}</b>` : '這班沒有收入'}</div>
      <div class="mc-sum-boss">${line}${bonus ? '<br>完美值班加碼 +' + bonus + ' 票！' : ''}${this.totalVotes >= VOTE_CAP ? '<br><small>（店裡的票已經被你拉光了，之後值班只剩薪水跟成就感 😂）</small>' : ''}</div>
      <button class="menu-btn primary" id="mcDone"><span>👋 回到校園</span><small>ENTER</small></button>
    </div>`;
    this.ui.summary.querySelector('#mcDone').onclick = () => this.close();
    this.ui.pos.classList.add('hidden'); this.ui.summary.classList.remove('hidden');
    if (this.served >= 4) g.audio.fanfare();
  }
  close() {
    if (this.state !== 'summary') return;
    const g = this.g;
    this.state = 'off'; this.mcd.busy = false;
    this.ui.root.classList.add('hidden');
    this._uniform(false);
    const s = this.mcd.staff; s.root.position.copy(s.home); s.root.rotation.y = s.homeRot;
    g.rig.yaw = g.player.heading; g.rig.pitch = 0.3;
    if (!g.input.touch && g.state === 'play') { // re-grab the mouse; if the browser refuses, clicking the view does it
      try { const r = g.renderer.domElement.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ }
    }
  }

  // ------------------------------------------------------------------ customers
  _spawn() {
    const i = this.spawned++;
    const look = randomStudent(this.rnd);
    const ch = createCharacter({ ...look, face: true });
    const W = this.mcd.W;
    // the first one is already inside (was reading the menu board); the rest come in through the door
    const c = { ch, slot: this.customers.filter(o => o.state !== 'leaving').length, state: 'walk', lx: i === 0 ? 21.5 : W + 1.2, lz: LINE_Z, path: [], order: new Map(), said: '', recog: this.rnd() < 0.35, label: null, t: 0 };
    // order: later customers order more
    const lines = Math.min(3, 1 + Math.floor(this.rnd() * (1.6 + i * 0.35)));
    const pool = [...MENU]; for (let n = 0; n < lines; n++) { const m = pool.splice(Math.floor(this.rnd() * pool.length), 1)[0]; c.order.set(m.k, this.rnd() < 0.25 ? 2 : 1); }
    const qty = [...c.order.values()].reduce((a, b) => a + b, 0);
    c.max = c.patience = 18 + lines * 5 + qty * 2;
    c.say = this._orderText(c);
    c.path = [SLOT(c.slot)];
    ch.root.position.copy(this.wpos(c.lx, c.lz, 0.1));
    this.g.scene.add(ch.root);
    this.customers.push(c);
  }
  _orderText(c) {
    const parts = [...c.order].map(([k, n]) => `${NUM[n]}${ITEM[k].unit}${ITEM[k].name.replace(/（.*）| 6塊/g, '')}`);
    const body = parts.length > 1 ? parts.slice(0, -1).join('、') + '，還有' + parts[parts.length - 1] : parts[0];
    return `${this.pick(GREET)}我要${body}。`;
  }
  _leave(c, emoji) {
    c.state = 'leaving';
    c.path = [[c.lx, LEAVE_Z], [this.mcd.W + 3, LEAVE_Z]];
    if (emoji) this._say(c, emoji);
    if (this.front === c) this.front = null;
    // everyone behind moves up one place
    const q = this.customers.filter(o => o.state !== 'leaving').sort((a, b) => a.slot - b.slot);
    q.forEach((o, i) => { if (o.slot !== i) { o.slot = i; o.path = [SLOT(i)]; if (o.state === 'order') o.state = 'walk'; } });
  }
  _say(c, text) {
    if (c.label) c.ch.root.remove(c.label);
    c.label = makeLabel(text, { height: 0.26, size: 40 }); c.label.position.set(0, 2.05, 0); c.ch.root.add(c.label);
    c.labelT = 2.6;
  }

  // ------------------------------------------------------------------ tray
  add(k) {
    if (this.state !== 'shift') return;
    this.tray.set(k, (this.tray.get(k) || 0) + 1); this.trayOrder.push(k);
    this.g.audio.blip(); this._renderTray();
  }
  remove(k) {
    const n = this.tray.get(k) || 0; if (!n) return;
    if (n > 1) this.tray.set(k, n - 1); else this.tray.delete(k);
    const i = this.trayOrder.lastIndexOf(k); if (i >= 0) this.trayOrder.splice(i, 1);
    this._renderTray();
  }
  removeLast() { const k = this.trayOrder[this.trayOrder.length - 1]; if (k) this.remove(k); }
  clear() { this.tray.clear(); this.trayOrder = []; this._renderTray(); }
  serve() {
    if (this.state !== 'shift') return;
    const c = this.front, g = this.g;
    if (!c) { g.hud.toast('櫃台前還沒有客人', 'bad', 1200); return; }
    if (!this.tray.size) { g.hud.toast('托盤是空的！', 'bad', 1200); return; }
    const missing = [], extra = [];
    for (const [k, n] of c.order) { const t = this.tray.get(k) || 0; if (t < n) missing.push(k); }
    for (const [k, n] of this.tray) { const o = c.order.get(k) || 0; if (n > o) extra.push(k); }
    if (!missing.length && !extra.length) {
      this.served++;
      const left = c.patience / c.max, fast = left > 0.5, tip = 10 + Math.round(left * 30);
      this.tips += tip;
      const n = 1 + (fast ? 1 : 0) + (c.recog ? 1 : 0);
      const msg = c.recog ? this.pick(THANKS_RECOG) : this.pick(THANKS);
      const got = this._grant(n, `${msg} +${n} 票${fast ? '（出餐快）' : ''}`);
      if (!got) g.hud.toast(msg, 'good', 1800);
      g.hud.toast(`💰 小費 +NT$ ${tip}`, 'good', 1400);
      g.audio.pickup(); g.audio.register();
      g.player.setPose('give', 0.9);
      c.ch.update(0, { speed: 0, pose: 'wave' }); c.wave = 1.2;
      this._leave(c, '😋');
      this.clear(); this._renderTicket(); this._renderStats();
    } else {
      this.mistakes++;
      c.patience = Math.max(1, c.patience - 5);
      const what = missing.length ? `還少了${ITEM[missing[0]].name}` : `我沒有點${ITEM[extra[0]].name}欸`;
      g.hud.toast(`客人：「${what}…」`, 'bad', 2000); g.audio.bad();
      this._say(c, '😕 ？');
      this._renderStats();
    }
  }
  _grant(n, msg) { const got = this.grantShared(n, msg); this.shiftVotes += got; return got; }

  // ------------------------------------------------------------------ per frame
  update(dt, inp = this.g.input) {
    const g = this.g;
    this.kitchen.update(dt, inp); // reads input only while the kitchen shift runs
    if (this.state === 'shift') {
      for (let i = 0; i < MENU.length; i++) if (inp.hit('Digit' + (i + 1), 'Numpad' + (i + 1))) this.add(MENU[i].k);
      if (inp.hit('Backspace')) this.removeLast();
      if (inp.hit('Enter', 'NumpadEnter', 'Space')) this.serve();
      if (inp.hit('KeyE', 'Escape')) { inp.pressed.delete('KeyE'); inp.pressed.delete('Escape'); this.finish(true); }
      // keep 彥霖 at the register facing the customers
      const pl = g.player, [rx, rz] = this.k.w(...REGISTER);
      pl.pos.x = rx; pl.pos.z = rz; pl.vel.set(0, 0); pl.heading = this.k.heading(Math.PI / 2);
      // new customers walk in
      const inLine = this.customers.filter(c => c.state !== 'leaving').length;
      this.spawnT -= dt;
      if (this.spawned < SHIFT_CUSTOMERS && inLine < QUEUE_MAX && this.spawnT <= 0) { this._spawn(); this.spawnT = 5 + this.rnd() * 4; }
      // patience: the one at the counter loses it fastest
      for (const c of this.customers) {
        if (c.state !== 'queue' && c.state !== 'order') continue; // the clock starts once they are in line
        c.patience -= dt * (c === this.front ? 1 : 0.35);
        if (c.patience <= 0) {
          this.missed++;
          const line = this.pick(ANGRY); g.hud.toast(`客人：「${line}」`, 'bad', 2200); g.audio.bad();
          if (c === this.front) this.clear(); // their tray goes to waste; start fresh for the next one
          this._leave(c, '😤');
          this._renderTicket(); this._renderStats();
        }
      }
      if (this.front) this.ui.pat.style.width = Math.max(0, this.front.patience / this.front.max * 100).toFixed(1) + '%';
      this.ui.pat.classList.toggle('low', !!this.front && this.front.patience / this.front.max < 0.3);
      if (this.spawned >= SHIFT_CUSTOMERS && !this.customers.some(c => c.state !== 'leaving')) this.finish(false);
    } else if (this.state === 'summary') {
      if (inp.hit('Enter', 'NumpadEnter', 'Space', 'KeyE', 'Escape')) { inp.pressed.delete('KeyE'); inp.pressed.delete('Escape'); this.close(); }
    }
    // customers walk / queue / leave (keeps running after the shift until the last one is out)
    for (const c of this.customers) {
      let speed = 0;
      if (c.path.length) {
        const [tx, tz] = c.path[0], dx = tx - c.lx, dz = tz - c.lz, d = Math.hypot(dx, dz);
        if (d < 0.05) c.path.shift();
        else { const s = Math.min(d, WALK * dt); c.lx += dx / d * s; c.lz += dz / d * s; speed = WALK; c.ch.root.rotation.y = this.k.heading(Math.atan2(dx, dz)); }
      }
      if (!c.path.length && c.state === 'walk') { c.state = 'queue'; }
      if (c.state === 'queue' || c.state === 'order') c.ch.root.rotation.y = this.k.heading(-Math.PI / 2);
      if (c.state === 'queue' && c.slot === 0 && this.state === 'shift' && !this.front) {
        c.state = 'order'; this.front = c;
        if (c.recog) this._say(c, '😮 彥霖？'); else this._say(c, '🙋');
        this._renderTicket();
      }
      c.ch.root.position.copy(this.wpos(c.lx, c.lz, 0.1));
      c.wave = Math.max(0, (c.wave || 0) - dt);
      c.ch.update(dt, { speed, mode: 'foot', pose: c.wave > 0 ? 'wave' : null });
      if (c.label && (c.labelT -= dt) <= 0) { c.ch.root.remove(c.label); c.label = null; }
    }
    // gone out of the door
    for (const c of this.customers) if (c.state === 'leaving' && !c.path.length) { g.scene.remove(c.ch.root); c.ch.dispose?.(); c.gone = true; }
    if (this.customers.some(c => c.gone)) this.customers = this.customers.filter(c => !c.gone);
  }
  // over-the-shoulder shot from the kitchen: 彥霖 at the register, the queue across the counter
  camera(cam, dt) {
    if (this.kitchen.active) { this.kitchen.camera(cam, dt); return; }
    this._camT = Math.min(1, (this._camT || 0) + dt / 0.7);
    const e = this._camT * this._camT * (3 - 2 * this._camT);
    this._camPos.copy(this.wpos(13.05, 6.6, 2.15));
    this._look.copy(this.wpos(17.55, 4.6, 0.95));
    cam.position.lerpVectors(this._camFrom, this._camPos, e);
    this._lookFrom.lerp(this._look, e);
    cam.lookAt(e >= 1 ? this._look : this._lookFrom);
  }

  // ------------------------------------------------------------------ crew uniform (mcuniform.js)
  _uniform(on) {
    if (on && !this._undress) this._undress = dressCrew(this.g.player.ch, { name: '彥霖' });
    else if (!on && this._undress) { this._undress(); this._undress = null; }
  }

  // ------------------------------------------------------------------ UI
  _buildUI() {
    const root = document.createElement('div'); root.id = 'mcShift'; root.className = 'hidden';
    root.innerHTML = `<div class="mc-pos">
      <div class="mc-head">
        <span class="mc-brand"><i>M</i>麥當勞 中原店 · 打工值班中（時薪 NT$${WAGE}）</span>
        <span class="mc-stats" id="mcStats"></span>
        <button id="mcQuit">下班 <kbd>E</kbd></button>
      </div>
      <div class="mc-body">
        <div class="mc-ticket">
          <div class="mc-label">客人點餐</div>
          <div class="mc-say" id="mcSay"></div>
          <ul class="mc-lines" id="mcLines"></ul>
          <div class="mc-pat"><i id="mcPat"></i></div>
        </div>
        <div class="mc-menu" id="mcMenu">${MENU.map((m, i) => `<button data-k="${m.k}"><kbd>${i + 1}</kbd><em>${m.icon}</em><b>${m.name}</b><small>NT$${m.price}</small></button>`).join('')}</div>
        <div class="mc-tray">
          <div class="mc-label">托盤</div>
          <div class="mc-tray-items" id="mcTray"></div>
          <div class="mc-total" id="mcTotal"></div>
          <div class="mc-acts"><button id="mcClear">清空</button><button id="mcServe" class="go">出餐 <kbd>Enter</kbd></button></div>
        </div>
      </div>
    </div>
    <div class="mc-summary hidden" id="mcSummary"></div>`;
    document.body.appendChild(root);
    const q = (s) => root.querySelector(s);
    this.ui = { root, pos: q('.mc-pos'), summary: q('#mcSummary'), say: q('#mcSay'), lines: q('#mcLines'), pat: q('#mcPat'), tray: q('#mcTray'), total: q('#mcTotal'), stats: q('#mcStats') };
    for (const b of root.querySelectorAll('#mcMenu button')) b.onclick = () => this.add(b.dataset.k);
    q('#mcClear').onclick = () => this.clear();
    q('#mcServe').onclick = () => this.serve();
    q('#mcQuit').onclick = () => this.finish(true);
    this.ui.tray.onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) this.remove(b.dataset.k); };
    // keep clicks on the panel from reaching the game canvas (which would grab the pointer)
    root.addEventListener('mousedown', e => e.stopPropagation());
  }
  _renderTicket() {
    const c = this.front;
    if (!c) {
      this.ui.say.textContent = this.state === 'shift' ? '等待客人走到櫃台…' : '';
      this.ui.lines.innerHTML = ''; this.ui.pat.style.width = '0%'; return;
    }
    this.ui.say.innerHTML = (c.recog ? `<span class="mc-recog">${this.pick(RECOG)}</span>` : '') + `「${c.say}」`;
    this.ui.lines.innerHTML = [...c.order].map(([k, n]) => `<li><em>${ITEM[k].icon}</em>${ITEM[k].name}<b>×${n}</b></li>`).join('');
  }
  _renderTray() {
    const items = [...this.tray];
    this.ui.tray.innerHTML = items.length ? items.map(([k, n]) => `<button data-k="${k}" title="點一下拿掉一個"><em>${ITEM[k].icon}</em>${ITEM[k].name}<b>×${n}</b></button>`).join('') : '<span class="mc-empty">（空的）按 1–6 或點左邊的餐點</span>';
    const total = items.reduce((s, [k, n]) => s + ITEM[k].price * n, 0);
    this.ui.total.textContent = total ? `合計 NT$${total}` : '';
  }
  _renderStats() {
    this.ui.stats.innerHTML = `服務 <b>${this.served}</b>/${SHIFT_CUSTOMERS}　出錯 <b>${this.mistakes}</b>　小費 <b class="v">NT$${this.tips}</b>　拉票 <b class="v">+${this.shiftVotes}</b>`;
  }
}
