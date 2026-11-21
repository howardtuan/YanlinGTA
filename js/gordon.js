// 戈登肉鋪：正門對面（大仁街）的高級肉鋪，建築在 js/interiors.js（buildGordon）。
// 在冷凍櫃前按 E 挑肉放進購物籃，到櫃台按 E 找店長「女拳大帝」用 Peach Pay 結帳；
// 結完帳如果還不是好友，他會問要不要互加（js/friends.js，訊息＋Peachgram）。
// 購物籃與買過的東西會存檔（save.js 的 gordon）。

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
    for (const f of S.freezers) A.push({ x: f.x, z: f.z, r: f.r, y: 0, anyY: true,
      label: () => `按 <kbd>E</kbd> 看${GD_ZONES[f.zone].name}的冷凍櫃`, fn: () => this.browse(f.zone) });
    A.push({ x: S.counter.x, z: S.counter.z, r: 1.7, y: 0, anyY: true,
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
  toJSON() { return { basket: this.basket, bought: this.bought, spent: this.spent }; }
  load(d) { if (!d) return; this.basket = d.basket || {}; this.bought = d.bought || {}; this.spent = d.spent || 0; }
}
