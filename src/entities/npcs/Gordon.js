// 戈登肉鋪：校史館前草坪上的高級肉鋪，建築在 src/world/Interiors.js（buildGordon）。
// 在冷凍櫃前按 E 挑肉放進購物籃，到櫃台按 E 找店長「女拳大帝」用 Peach Pay 結帳；
// 結完帳如果還不是好友，他會問要不要互加（src/ui/phone/Friends.js，訊息＋Peachgram）。
// 購物籃與買過的東西會存檔（src/systems/SaveSystem.js 的 gordon）。
// 營業時間 08:00–23:00（src/world/buildings/GordonShop.js 拉鐵門、關燈）；其他時間店長女拳大帝在力行宿舍 279 寢：00:00–06:00 睡在 4 號床（高架床），
// 其他時間在 4 號床下的書桌打 LOL。
// 在宿舍找他：沒跟他買過東西又不是好友的話，他只會叫你別吵。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { GD_LOOK } from './FriendLooks.js';

export const GD_ZONES = {
  hotpot: { name: '火鍋區', items: [
    { id: 'beefPlate', name: '牛五花火鍋片', w: '300g', price: 260, icon: '🥩' },
    { id: 'porkPlate', name: '梅花豬火鍋片', w: '300g', price: 180, icon: '🥓' },
    { id: 'rib', name: '霜降牛肋條', w: '500g', price: 320, icon: '🍖' },
    { id: 'tongue', name: '安格斯牛舌片', w: '200g', price: 390, icon: '👅' },
  ] },
  bbq: { name: '燒烤區', items: [
    { id: 'shortRib', name: '美國 Choice 牛小排', w: '300g', price: 450, icon: '🥩' },
    { id: 'porkChop', name: '戰斧豬排', w: '2 片', price: 360, icon: '🍖' },
    { id: 'lamb', name: '法式羊排', w: '4 支', price: 480, icon: '🍖' },
    { id: 'sausage', name: '德式香腸', w: '5 條', price: 150, icon: '🌭' },
  ] },
  steak: { name: '牛排區', items: [
    { id: 'ribeye', name: '美國 Prime 肋眼牛排', w: '350g', price: 680, icon: '🥩' },
    { id: 'strip', name: '紐約客牛排', w: '300g', price: 520, icon: '🥩' },
    { id: 'filet', name: '菲力牛排', w: '200g', price: 620, icon: '🥩' },
    { id: 'tomahawk', name: '戰斧牛排', w: '1.2kg', price: 1880, icon: '🪓' },
  ] },
  wagyu: { name: '和牛區', items: [
    { id: 'm9', name: '澳洲和牛 M9 菲力', w: '200g', price: 1280, icon: '🐂' },
    { id: 'a5', name: '日本 A5 和牛沙朗', w: '150g', price: 1580, icon: '🇯🇵' },
    { id: 'patty', name: '和牛漢堡排', w: '2 片', price: 260, icon: '🍔' },
  ] },
  sea: { name: '海鮮區', items: [
    { id: 'salmon', name: '挪威鮭魚菲力', w: '250g', price: 290, icon: '🐟' },
    { id: 'prawn', name: '大明蝦', w: '8 隻', price: 350, icon: '🦐' },
    { id: 'scallop', name: '北海道干貝', w: '6 顆', price: 420, icon: '🐚' },
  ] },
};
const ITEM = {}; for (const z of Object.values(GD_ZONES)) for (const it of z.items) ITEM[it.id] = it;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEEPER = '女拳大帝';
// 店長的個性：火爆、愛健身、打 LOL 很在意輸贏、超愛麥當勞
const IDLE = [
  [[KEEPER, '要買就快點挑，我等等還要排位！🔥']],
  [[KEEPER, '昨天 LOL 被隊友坑到輸三場，今天別惹我。'], [KEEPER, '……肉要什麼自己去冷凍櫃看！']],
  [[KEEPER, '剛練完腿來顧店，站著都在抖。'], [KEEPER, '牛排區的肋眼今天油花超漂亮，不買是你的損失。']],
  [[KEEPER, '中午又吃麥當勞，大麥克配薯條才是人生 🍔'], [KEEPER, '你要買肉就去冷凍櫃挑，挑好拿來櫃台。']],
  [[KEEPER, '輸贏很重要好嗎！打遊戲輸、做生意也不能輸。'], [KEEPER, '和牛區那兩塊是今天最好的，看你識不識貨。']],
];
const PAID = [
  [[KEEPER, '結好了！發票放袋子裡。'], [KEEPER, '回去馬上冰起來，聽到沒！🔥']],
  [[KEEPER, '眼光不錯嘛，這塊煎五分熟就好，煎過頭我會生氣。']],
  [[KEEPER, '謝啦！賺到錢今晚去吃麥當勞慶祝 🍟']],
];
const BROKE = [[KEEPER, '錢不夠還敢來結帳？😤'], [KEEPER, '去麥當勞打工賺夠了再來！順便幫我帶一份大麥克。']];

export class Gordon {
  constructor(game) {
    this.g = game; this.basket = {}; this.bought = {}; this.spent = 0;
    const S = game.interiors.gordon; if (!S) return;
    this.S = S;
    const A = game.interiors.actions;
    for (const f of S.freezers) A.push({ x: f.x, z: f.z, r: f.r, y: 0, anyY: true, cond: () => !S.closed,
      label: () => `按 <kbd>E</kbd> 看${GD_ZONES[f.zone].name}的冷凍櫃`, fn: () => this.browse(f.zone) });
    if (S.front) A.push({ x: S.front.x, z: S.front.z, r: 2.2, y: 0, cond: () => S.closed, label: () => '戈登肉鋪已打烊（營業時間 08:00–23:00）',
      fn: (g) => g.hud.toast('🥩 戈登肉鋪已打烊，店長回宿舍打 LOL 了，早上 8 點再來吧', 'good', 2400) });
    this._dorm(game);
    A.push({ x: S.counter.x, z: S.counter.z, r: 1.7, y: 0, anyY: true, cond: () => !S.closed,
      label: () => this.count ? `按 <kbd>E</kbd> 跟${KEEPER}結帳（${this.count} 件・NT$ ${this.total}）` : `按 <kbd>E</kbd> 和店長${KEEPER}說話`,
      fn: () => (this.count ? this.checkout() : this.g.dialog(IDLE[Math.floor(Math.random() * IDLE.length)])) });
  }
  get count() { return Object.values(this.basket).reduce((s, n) => s + n, 0); }
  get total() { return Object.entries(this.basket).reduce((s, [id, n]) => s + (ITEM[id]?.price || 0) * n, 0); }
  // ---- modal helpers: the game keeps running behind (player frozen while it's up), Esc closes it ----
  _open(title, html, sub) {
    const g = this.g;
    document.exitPointerLock?.();
    g.modal(title, html, sub);
    if (!this._key) {
      this._key = (e) => {
        if (!g._modalOpen || !this._ui) return;
        if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this._close(); return; }
        const n = /^(Digit|Numpad)([1-9])$/.exec(e.code); if (n) { e.preventDefault(); e.stopPropagation(); this._ui.digit?.(+n[2] - 1); }
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); this._ui.enter?.(); }
      };
      addEventListener('keydown', this._key, true);
    }
  }
  _close() { this._ui = null; this.g.closeModal(); this.g.resume(); }
  _foot() {
    return `<div class="gd-foot"><span>🧺 購物籃 <b>${this.count}</b> 件・<b>NT$ ${this.total}</b></span><span>💳 Peach Pay <b>NT$ ${this.g.money}</b></span></div>`;
  }
  // a freezer: add items to the basket (click, or keys 1-9)
  browse(zone) {
    const Z = GD_ZONES[zone], g = this.g;
    const add = (i) => { const it = Z.items[i]; if (!it) return; this.basket[it.id] = (this.basket[it.id] || 0) + 1; g.audio.pop?.(); render(); };
    const render = () => {
      const rows = Z.items.map((it, i) => `<div class="gd-row"><span class="gd-ic">${it.icon}</span><span class="gd-nm"><b>${esc(it.name)}</b><small>${esc(it.w)}${this.basket[it.id] ? `・籃子裡 ${this.basket[it.id]}` : ''}</small></span>
        <span class="gd-pr">NT$ ${it.price}</span><button class="gd-add" data-i="${i}"><kbd>${i + 1}</kbd> 放進籃子</button></div>`).join('');
      this._open(`🥩 ${Z.name}`, `<div class="gd-shop">${rows}${this._foot()}<div class="gd-hint">挑好了拿到最裡面的櫃台，找店長${KEEPER}結帳。</div>
        <div class="modal-btns"><button class="menu-btn primary" id="gdDone"><span>✔ 好了</span><small>Enter / Esc</small></button></div></div>`, 'GORDON MEAT SHOP');
      document.querySelectorAll('.gd-add').forEach(b => b.onclick = () => add(+b.dataset.i));
      document.getElementById('gdDone').onclick = () => this._close();
    };
    this._ui = { digit: add, enter: () => this._close() };
    render();
  }
  // the counter: review the basket, pay with Peach Pay
  checkout() {
    const g = this.g;
    const render = () => {
      if (!this.count) { this._close(); g.dialog([[KEEPER, '籃子都空了是在結什麼帳啦！']]); return; }
      const ids = Object.keys(this.basket).filter(id => this.basket[id] > 0);
      const rows = ids.map(id => { const it = ITEM[id], n = this.basket[id]; return `<div class="gd-row"><span class="gd-ic">${it.icon}</span><span class="gd-nm"><b>${esc(it.name)}</b><small>${esc(it.w)}・NT$ ${it.price} × ${n}</small></span>
        <span class="gd-pr">NT$ ${it.price * n}</span><button class="gd-rm" data-id="${id}">－ 拿掉一個</button></div>`; }).join('');
      const short = g.money < this.total;
      this._open(`🧾 結帳・店長 ${KEEPER}`, `<div class="gd-shop">${rows}<div class="gd-total">合計 <b>NT$ ${this.total}</b></div>${this._foot()}
        ${short ? '<div class="gd-hint bad">餘額不夠，先拿掉一些，或去麥當勞打工賺錢 🍟</div>' : ''}
        <div class="modal-btns"><button class="menu-btn primary" id="gdPay"><span>💳 用 Peach Pay 付款</span><small>Enter</small></button>
        <button class="menu-btn" id="gdBack"><span>再逛逛</span><small>Esc</small></button></div></div>`, 'CHECKOUT');
      document.querySelectorAll('.gd-rm').forEach(b => b.onclick = () => { const id = b.dataset.id; if (--this.basket[id] <= 0) delete this.basket[id]; g.audio.tap?.(); render(); });
      document.getElementById('gdPay').onclick = () => this._pay();
      document.getElementById('gdBack').onclick = () => this._close();
    };
    this._ui = { enter: () => this._pay() };
    render();
  }
  _pay() {
    const g = this.g, total = this.total, ids = Object.keys(this.basket);
    if (!ids.length) return;
    const what = ids.map(id => ITEM[id].name).slice(0, 2).join('、') + (ids.length > 2 ? ` 等 ${this.count} 件` : '');
    if (!g.spend(total, `戈登肉鋪：${what}`)) { this._close(); g.audio.bad?.(); g.dialog(BROKE); return; }
    for (const id of ids) this.bought[id] = (this.bought[id] || 0) + this.basket[id];
    this.spent += total; this.basket = {};
    this._close();
    g.hud.toast(`🥩 戈登肉鋪 付款成功 −NT$ ${total}`, 'good', 2200);
    // thanks, then (if you're not friends yet) the add-friend question
    g.dialog(PAID[Math.floor(Math.random() * PAID.length)], () => g.friends?.offer('gd'));
  }
  // ---- 23:00–08:00: 女拳大帝 in 力行 279 at the desk under bed 6, playing LOL ----
  get night() { return !!this.S?.closed; }
  get asleep() { const m = ((this.g.clock % 1440) + 1440) % 1440; return this.night && m < 6 * 60; } // 00:00–06:00 on his bed
  get boughtAny() { return Object.values(this.bought).some(n => n > 0); }
  _dorm(game) {
    const L = game.interiors.lixing, R = L?.rooms?.[279]; if (!R) return;
    const { k, B, W } = L, bed = R.beds[4];
    const desk = R.desks.filter(d => d.bed === 4).sort((a, b) => Math.hypot(a.x - bed.x, a.z - bed.z) - Math.hypot(b.x - bed.x, b.z - bed.z))[0];
    if (!desk) return;
    const world = (lx, lz, ly) => { const [x, z] = W(lx, lz); return { x, z, y: B + ly }; };
    const seat = { ...world(desk.chair.x, desk.chair.z, R.y), h: k.heading(desk.face) }, D = world(desk.x, desk.z, R.y + 0.76);
    const bedAt = { ...world(bed.x, bed.z, bed.y + 0.12), h: k.heading(0) };
    const ch = this.dormCh = createCharacter(GD_LOOK);
    const tag = makeLabel('🎮 女拳大帝', { height: 0.24, size: 40, color: '#ff6b6b' }); tag.position.set(0, 1.75, 0); ch.root.add(tag);
    ch.root.position.set(seat.x, seat.y, seat.z); ch.root.rotation.y = seat.h; ch.root.visible = false; game.scene.add(ch.root);
    // his gaming laptop, the screen glowing blue and gold
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; const x = cv.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, '#0a1a2f'); gr.addColorStop(1, '#0d3b4f'); x.fillStyle = gr; x.fillRect(0, 0, 256, 160);
    x.fillStyle = '#c8aa6e'; x.font = '900 28px sans-serif'; x.textAlign = 'center'; x.fillText('積分對戰', 128, 66); x.fillStyle = '#e8f1ff'; x.font = '700 18px sans-serif'; x.fillText('鑽石 I ◆ 連敗中 😤', 128, 100);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.25), new THREE.MeshStandardMaterial({ color: '#1b1c20', roughness: 0.4, metalness: 0.4 }));
    const hinge = new THREE.Group(), lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.23, 0.012), base.material), scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.21), new THREE.MeshBasicMaterial({ map: tex }));
    lid.position.y = 0.115; scr.position.set(0, 0.115, 0.007); hinge.add(lid, scr); hinge.rotation.x = -0.25;
    const lap = new THREE.Group(); lap.add(base); hinge.position.set(0, 0.01, -0.11); lap.add(hinge);
    lap.position.set(D.x, D.y + 0.01, D.z); lap.rotation.y = k.heading(desk.face + Math.PI); game.scene.add(lap);
    this.dorm = { seat, ch, lap, bed: bedAt };
    game.interiors.actions.push({ x: seat.x, z: seat.z, y: R.y + B - surfaceAt(seat.x, seat.z), r: 1.6, cond: () => this.night,
      label: () => this.asleep ? '按 <kbd>E</kbd> 看看 4 號床上的女拳大帝（睡著了）' : '按 <kbd>E</kbd> 和打 LOL 的女拳大帝說話', fn: () => this.dormTalk() });
    game.interiors.updaters.push((dt, gm) => {
      const on = this.night, p = gm.player.pos, near = Math.hypot(p.x - seat.x, p.z - seat.z) < 60;
      ch.root.visible = on && near;
      const sl = this.asleep, at = sl ? bedAt : seat;
      ch.root.position.set(at.x, at.y, at.z); ch.root.rotation.y = at.h;
      if (ch.root.visible) ch.update(dt, { speed: 0, mode: sl ? 'down' : 'sit', pose: !sl && Math.sin(gm.time * 0.6) > 0.85 ? 'talk' : null });
    });
  }
  // not a customer and not a friend: he won't even look up
  dormTalk() {
    const g = this.g;
    if (this.asleep) { g.dialog([[KEEPER, '（呼……呼……）'], ['彥霖', '（女拳大帝在 4 號床上睡得很熟，手還握著滑鼠的姿勢……）']]); return; }
    if (!g.friends?.added.has('gd') && !this.boughtAny) { g.dialog([[KEEPER, '在打遊戲，別吵 😤']]); return; }
    if (!g.friends?.added.has('gd')) { g.friends?.offer('gd'); return; }
    const L = [
      [[KEEPER, '（耳機大吼）中路不要再送了啦！！'], [KEEPER, '……彥霖？你怎麼在這。等我這場打完 🎮']],
      [[KEEPER, '鑽石 I 卡三天了，今晚一定要上大師 🔥']],
      [[KEEPER, '漢克又在對面彈吉他，我耳機開到最大了'], [KEEPER, '要排嗎？輸了你請麥當勞。']],
      [[KEEPER, '店早上 8 點才開，肉要買明天來。現在別跟我講話，我在團戰 😤']],
    ];
    g.dialog(L[Math.floor(Math.random() * L.length)]);
  }
  toJSON() { return { basket: this.basket, bought: this.bought, spent: this.spent }; }
  load(d) { if (!d) return; this.basket = d.basket || {}; this.bought = d.bought || {}; this.spent = d.spent || 0; }
}
