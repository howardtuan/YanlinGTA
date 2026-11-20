// 麥當勞打工：從櫃檯後的員工入口按 E 上班。客人點餐後，用數字鍵 1～6（或點按鈕）把餐點放上托盤；
// 托盤跟點單一樣就出餐。一班 6 位客人，底薪＝時薪 NT$196，另加每單小費（越快越多）。
import { createCharacter, randomStudent } from './character.js';
import { mulberry32 } from './map.js';

export const WAGE = 196;
const MENU = [
  { name: '大麥克', icon: '🍔' }, { name: '麥克雞塊', icon: '🍗' }, { name: '薯條', icon: '🍟' },
  { name: '可樂', icon: '🥤' }, { name: '蘋果派', icon: '🥧' }, { name: '冰炫風', icon: '🍦' },
];
const LINES = ['我要', '麻煩給我', '嗨～我要點', '外帶，', '內用，我要', '同學你好，我要'];
const SHIFT = 6;

export class McJob {
  constructor(game) {
    this.g = game; this.active = false;
    this.shifts = 0; this.earned = 0; this.best = 0;
    this.rnd = mulberry32(8031);
    const el = this.el = document.createElement('div');
    el.id = 'mcjob'; el.className = 'hidden';
    el.innerHTML = `<div class="mj-head"><b>🍟 麥當勞 中原店・值班中</b><span class="mj-prog"></span></div>
      <div class="mj-ticket"><div class="mj-say"></div><div class="mj-items"></div><div class="mj-timer"><i></i></div></div>
      <div class="mj-tray"><small>托盤</small><div class="mj-trayitems"></div></div>
      <div class="mj-btns">${MENU.map((m, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd><span>${m.icon}</span>${m.name}</button>`).join('')}</div>
      <div class="mj-foot"><span>本班收入 <b class="mj-earn">NT$ 0</b></span><span><kbd>Backspace</kbd> 清空托盤　<kbd>E</kbd> 下班</span></div>`;
    document.getElementById('app').appendChild(el);
    el.querySelectorAll('.mj-btns button').forEach(b => b.onclick = () => this.add(+b.dataset.i));
  }
  start() {
    const g = this.g, spot = g.interiors.mcJob; if (!spot || this.active) return;
    this.served = 0; this.tips = 0; this.mistakes = 0;
    g.player.place(spot.work[0], spot.work[1], spot.workH); g.player.vel?.set(0, 0);
    this.active = true;
    g.rig.yaw = spot.workH; g.rig.pitch = 0.25;
    document.exitPointerLock?.();
    this.el.classList.remove('hidden');
    g.hud.toast('🍟 開始值班！看點單按 1～6 出餐', 'good', 2400);
    this._next();
  }
  _next() {
    const r = this.rnd, g = this.g, spot = g.interiors.mcJob;
    // 2-4 items, up to 3 kinds
    const want = new Map(), kinds = 1 + Math.floor(r() * 3);
    let total = 0;
    while (want.size < kinds) want.set(Math.floor(r() * MENU.length), 0);
    for (const k of want.keys()) { want.set(k, 1); total++; }
    while (total < 2 + Math.floor(r() * 3)) { const ks = [...want.keys()]; const k = ks[Math.floor(r() * ks.length)]; want.set(k, want.get(k) + 1); total++; }
    this.order = { want, total, t: 0, limit: 9 + total * 3.2, no: 100 + Math.floor(r() * 900) };
    this.tray = new Map();
    // a customer steps up to the counter
    if (this.cust) g.scene.remove(this.cust.root);
    const ch = this.cust = createCharacter(randomStudent(r));
    ch.root.position.set(spot.cust[0], spot.base, spot.cust[1]); ch.root.rotation.y = spot.custH; g.scene.add(ch.root);
    const say = LINES[Math.floor(r() * LINES.length)] + [...want].map(([k, n]) => `${n > 1 ? n + ' 個' : ''}${MENU[k].name}`).join('、');
    this.el.querySelector('.mj-say').innerHTML = `<small>點單 #${this.order.no}</small>「${say}」`;
    this._render();
  }
  _render() {
    const o = this.order;
    this.el.querySelector('.mj-items').innerHTML = [...o.want].map(([k, n]) => {
      const have = this.tray.get(k) || 0;
      return `<span class="${have >= n ? 'ok' : ''}">${MENU[k].icon} ${MENU[k].name} <b>${have}/${n}</b></span>`;
    }).join('');
    const items = []; for (const [k, n] of this.tray) for (let i = 0; i < n; i++) items.push(MENU[k].icon);
    this.el.querySelector('.mj-trayitems').innerHTML = items.join(' ') || '<small>（空）</small>';
    this.el.querySelector('.mj-prog').textContent = `客人 ${this.served + 1} / ${SHIFT}`;
    this.el.querySelector('.mj-earn').textContent = `NT$ ${this.tips}`;
  }
  add(i) {
    if (!this.active || !this.order) return;
    const o = this.order, need = o.want.get(i) || 0, have = this.tray.get(i) || 0, g = this.g;
    if (have >= need) {
      // not on the order (or already enough): the customer frowns, small deduction
      this.mistakes++; this.tips = Math.max(0, this.tips - 5);
      g.audio.bad?.(); g.hud.toast(`❌ 客人沒點${have ? '那麼多' : ''}${MENU[i].name}！`, 'bad', 1100);
      this._flash('bad'); this._render(); return;
    }
    this.tray.set(i, have + 1); g.audio.blip?.();
    const done = [...o.want].every(([k, n]) => (this.tray.get(k) || 0) >= n);
    this._render();
    if (done) {
      const left = Math.max(0, 1 - o.t / o.limit), tip = 10 + Math.round(left * 30);
      this.tips += tip; this.served++;
      g.audio.pickup?.(); g.hud.toast(`✅ 出餐！小費 +NT$ ${tip}${left > 0.6 ? '（超快！）' : ''}`, 'good', 1400);
      this._flash('good');
      if (this.served >= SHIFT) this.stop(true); else this._next();
    }
  }
  _flash(k) { this.el.classList.remove('good', 'bad'); void this.el.offsetWidth; this.el.classList.add(k); }
  update(dt, inp) {
    if (!this.active || !this.order) return;
    for (let i = 0; i < MENU.length; i++) if (inp.hit('Digit' + (i + 1), 'Numpad' + (i + 1))) this.add(i);
    if (!this.active) return; // the last order of the shift was just served
    if (inp.hit('Backspace')) { this.tray = new Map(); this._render(); }
    if (inp.hit('KeyE', 'Escape')) { this.stop(false); return; }
    const o = this.order;
    o.t += dt;
    this.el.querySelector('.mj-timer i').style.width = `${Math.max(0, 1 - o.t / o.limit) * 100}%`;
    this.el.querySelector('.mj-timer').classList.toggle('late', o.t / o.limit > 0.75);
    if (o.t > o.limit) {
      this.g.audio.bad?.(); this.g.hud.toast('⌛ 等太久，客人走掉了…', 'bad', 1500);
      this.served++;
      if (this.served >= SHIFT) this.stop(true); else this._next();
    }
  }
  stop(full) {
    if (!this.active) return;
    const g = this.g;
    this.active = false; this.el.classList.add('hidden');
    if (this.cust) { g.scene.remove(this.cust.root); this.cust = null; }
    // full shift: one hour's wage + tips; leaving early: tips plus the wage for the customers served
    const wage = full ? WAGE : Math.round(WAGE * this.served / SHIFT);
    const pay = wage + this.tips;
    if (pay > 0) {
      g.earn(pay, `麥當勞打工（${this.served} 位客人）`);
      this.shifts += full ? 1 : 0; this.earned += pay; this.best = Math.max(this.best, pay);
      g.clock += full ? 60 : 10 * this.served;
      g.hud.bigToast(full ? '下班！🍟' : '提早下班', `時薪 NT$ ${wage} ＋ 小費 NT$ ${this.tips} ＝ NT$ ${pay}`, 3200);
    } else g.hud.toast('今天先不上班了', 'good', 1400);
    if (!g.input.touch) g.lockPointer();
  }
}
