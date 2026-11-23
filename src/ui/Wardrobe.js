// Wardrobe in 彥霖's old room: the pine doors swing open and you pick a top and a bottom.
// The look is applied right away (player.setLook) and kept in the save.
const TOPS = [
  ['黑色素 T', '#121212', '預設'],
  ['白色素 T', '#f4f4f0'],
  ['資管系服', '#4a5131', '深綠', 'im'],
  ['霧藍 T', '#6b7f99'],
  ['海軍藍 T', '#2f3e5c'],
  ['卡其襯衫', '#d8c9a8'],
  ['灰色帽 T', '#5b5d63'],
  ['森林綠 T', '#2f5d46'],
  ['系學會幹部T', '#1d2340', 'Polo', 'polo'], // 深藍 polo，左胸白色獅子（34TH、CYIMSA）
  // 資管系服：深綠短袖，左胸幾何線條獅子頭，背後 Information Management 程式碼印花（Since.1988）
  ['排球 T', '#c8102e', '吱吱送的', 'volley', 'volleyTee'], // 胸前 CYCU VOLLEYBALL、背後「中原排球」7 號；幫吱吱洗完 10 次殘廢澡才有（src/systems/quests/ZzInjury.js）
];
// [名稱, 顏色, 標籤, 款式, 解鎖條件]：有解鎖條件的上衣要拿到才會出現在衣櫃
const owned = (g, key) => !key || (key === 'volleyTee' && !!g.zzQuest?.state.tee);
const BOTTOMS = [
  ['白色短褲', '#f3f2ec', false, '預設'],
  ['卡其短褲', '#c9b48a', false],
  ['黑色短褲', '#202022', false],
  ['牛仔長褲', '#3d5a80', true],
  ['黑色長褲', '#1c1c1e', true],
  ['灰色運動褲', '#7c7f86', true],
];
const $ = (id) => document.getElementById(id);

export class Wardrobe {
  constructor(game) {
    this.g = game;
    this.isOpen = false;
    const el = (this.el = document.createElement('div'));
    el.id = 'wardrobe';
    el.className = 'wd hidden';
    el.innerHTML = `<div class="wd-card">
      <div class="wd-head"><b>👕 衣櫃</b><small>WARDROBE</small><button class="wd-x" title="關閉">✕</button></div>
      <div class="wd-sec">上衣</div><div class="wd-grid" id="wdTops"></div>
      <div class="wd-sec">褲子</div><div class="wd-grid" id="wdBottoms"></div>
      <div class="wd-foot"><span>點一下就會換上，按 <kbd>Esc</kbd> 或「穿好了」關上衣櫃</span><button class="menu-btn primary wd-ok"><span>穿好了</span><small>DONE</small></button></div>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('.wd-x').onclick = () => this.close();
    el.querySelector('.wd-ok').onclick = () => this.close();
    addEventListener('keydown', (e) => {
      if (this.isOpen && (e.code === 'Escape' || e.code === 'Enter')) {
        e.preventDefault();
        this.close();
      }
    });
  }
  _look() {
    const l = this.g.player.look || {};
    return {
      shirt: l.shirt || TOPS[0][1],
      shorts: l.shorts || BOTTOMS[0][1],
      pants: !!l.pants,
      top: l.top || null,
    };
  }
  _render() {
    const L = this._look();
    const item = (name, col, on, tag, data) =>
      `<button class="wd-item${on ? ' on' : ''}" ${data}><i style="background:${col}"></i><span>${name}</span>${tag ? `<small>${tag}</small>` : ''}</button>`;
    $('wdTops').innerHTML = TOPS.filter((t) => owned(this.g, t[4]))
      .map(([n, c, t, top]) =>
        item(
          n,
          c,
          c === L.shirt && (top || null) === L.top,
          t,
          `data-shirt="${c}" data-top="${top || ''}"`
        )
      )
      .join('');
    $('wdBottoms').innerHTML = BOTTOMS.map(([n, c, p, t]) =>
      item(
        n,
        c,
        c === L.shorts && p === L.pants,
        t || (p ? '長褲' : '短褲'),
        `data-bottom="${c}" data-pants="${p ? 1 : 0}"`
      )
    ).join('');
    for (const b of this.el.querySelectorAll('[data-shirt]'))
      b.onclick = () => this._wear({ shirt: b.dataset.shirt, top: b.dataset.top || null });
    for (const b of this.el.querySelectorAll('[data-bottom]'))
      b.onclick = () => this._wear({ shorts: b.dataset.bottom, pants: b.dataset.pants === '1' });
  }
  _wear(part) {
    const look = { ...this._look(), ...part };
    this.g.player.setLook(look);
    this.g.audio.pop?.();
    this._render();
  }
  open() {
    if (this.isOpen || this.g.player.vehicle) return;
    this.isOpen = true;
    this.g.interiors.yh?.setWardrobe(true);
    this.g.input.enabled = false;
    this.g.input.releaseAll();
    document.exitPointerLock?.();
    this._render();
    this.el.classList.remove('hidden');
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.g.interiors.yh?.setWardrobe(false);
    this.el.classList.add('hidden');
    this.g.input.enabled = true;
    this.g._saveT = 9.5;
    this.g.hud.toast('換好衣服了 ✌', 'good', 1600);
    if (!this.g.input.touch) this.g.lockPointer();
  }
}
