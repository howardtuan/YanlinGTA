// 衣櫃：彥霖舊家（松木雙門衣櫃，換衣服時門會打開）和力行 276 寢自己書桌旁的衣櫥（src/entities/npcs/Zz.js）都能打開。
// 可以整套換（套裝：麥當勞制服、彥霖航空機長／空服員；同學穿搭：借吱吱、理查、女拳大帝…的衣服），
// 也可以只換上衣、褲子或戴頂帽子；換單件會脫下套裝。
// 點一下就換上（src/systems/Outfits.js wearLook），造型存在存檔裡，多人麻將時別人也看得到（src/systems/mahjong/P2P.js）。
// 服裝清單在 src/systems/OutfitData.js。
import {
  TOPS,
  BOTTOMS,
  HATS,
  SETS,
  normalizeLook,
  pickItem,
  canWear,
} from '../systems/OutfitData.js';
import { wearLook } from '../systems/Outfits.js';

// 有解鎖條件的上衣要拿到才會出現在衣櫃
const owned = (g, key) => !key || (key === 'volleyTee' && !!g.zzQuest?.state.tee);
const $ = (id) => document.getElementById(id);
// 套裝、帽子的色塊：兩種顏色斜切（上衣色／褲子色），帽子用帽子本身的顏色
const SWATCH = {
  mc: 'linear-gradient(135deg,#6a6d72 55%,#ffbc0d 55%)',
  pilot: 'linear-gradient(135deg,#f4f5f7 50%,#1b2233 50%)',
  cabin: 'linear-gradient(135deg,#1f4d3a 60%,#e07b39 60%)',
};

export class Wardrobe {
  constructor(game) {
    this.g = game;
    this.isOpen = false;
    const el = (this.el = document.createElement('div'));
    el.id = 'wardrobe';
    el.className = 'wd hidden';
    el.innerHTML = `<div class="wd-card">
      <div class="wd-head"><b>👕 衣櫃</b><small>WARDROBE</small><button class="wd-x" title="關閉">✕</button></div>
      <div class="wd-sec">套裝 <small>整套換上</small></div><div class="wd-grid" id="wdSets"></div>
      <div class="wd-sec">同學穿搭 <small>加了好友就能借衣服整套換上</small></div><div class="wd-grid" id="wdFriends"></div>
      <div class="wd-sec">上衣</div><div class="wd-grid" id="wdTops"></div>
      <div class="wd-sec">褲子</div><div class="wd-grid" id="wdBottoms"></div>
      <div class="wd-sec">帽子</div><div class="wd-grid" id="wdHats"></div>
      <div class="wd-foot"><span>點一下就會換上；換單件會脫下套裝。按 <kbd>Esc</kbd> 或「穿好了」關上衣櫃</span><button class="menu-btn primary wd-ok"><span>穿好了</span><small>DONE</small></button></div>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('.wd-x').onclick = () => this.close();
    el.querySelector('.wd-ok').onclick = () => this.close();
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      const k = b.dataset.k,
        i = +b.dataset.i;
      const item =
        k === 'set'
          ? SETS[i] || null
          : k === 'top'
            ? TOPS[i]
            : k === 'bottom'
              ? BOTTOMS[i]
              : HATS[i] || null;
      if (k !== 'set' && k !== 'hat' && !item) return;
      if (k === 'set' && !canWear(item, this.g.friends?.added)) {
        // 同學穿搭：還沒加他好友
        this.g.hud.toast(`🔒 先跟${item.name}聊天、加好友，才能借${item.name}的衣服`, 'bad', 2400);
        return;
      }
      this._wear(pickItem(this._look(), k, item));
    });
    addEventListener('keydown', (e) => {
      if (this.isOpen && (e.code === 'Escape' || e.code === 'Enter')) {
        e.preventDefault();
        this.close();
      }
    });
  }
  _look() {
    return normalizeLook(this.g.player.look);
  }
  _render() {
    const L = this._look();
    const item = (k, i, name, bg, on, tag) =>
      `<button class="wd-item${on ? ' on' : ''}" data-k="${k}" data-i="${i}"><i style="background:${bg}"></i><span>${name}</span>${tag ? `<small>${tag}</small>` : ''}</button>`;
    const sw = (x) => SWATCH[x.id] || `linear-gradient(135deg,${x.shirt} 55%,${x.shorts} 55%)`;
    const sets = (friend) =>
      SETS.map((x, i) =>
        !!x.group !== friend
          ? ''
          : canWear(x, this.g.friends?.added)
            ? item('set', i, x.name, sw(x), L.set === x.id, x.tag)
            : item('set', i, x.name, '#2a2e40', false, '🔒 加好友').replace(
                'class="wd-item',
                'class="wd-item locked'
              )
      ).join('');
    $('wdSets').innerHTML = sets(false) + item('set', -1, '不穿套裝', '#2a2e40', !L.set, '單件');
    $('wdFriends').innerHTML = sets(true);
    // 穿著套裝時，單件的「已選」仍標出來：脫下套裝後會回到這些
    $('wdTops').innerHTML = TOPS.map((t, i) =>
      owned(this.g, t.unlock)
        ? item(
            'top',
            i,
            t.name,
            t.shirt,
            t.shirt === L.shirt && (t.top || null) === L.top && !!t.long === L.long,
            t.tag
          )
        : ''
    ).join('');
    $('wdBottoms').innerHTML = BOTTOMS.map((b, i) =>
      item(
        'bottom',
        i,
        b.name,
        b.shorts,
        b.shorts === L.shorts && b.pants === L.pants,
        b.tag || (b.pants ? '長褲' : '短褲')
      )
    ).join('');
    $('wdHats').innerHTML =
      item('hat', -1, '不戴帽子', '#2a2e40', !L.hat, '') +
      HATS.map((h, i) => item('hat', i, h.name, h.color, L.hat === h.id, '')).join('');
    this.el.querySelector('.wd-card').classList.toggle('wd-set-on', !!L.set);
  }
  _wear(look) {
    wearLook(this.g.player, look);
    this.g.audio.pop?.();
    this._render();
  }
  // at: 'dorm' = 力行 276 (the home wardrobe's doors stay shut)
  open(at = 'home') {
    if (this.isOpen || this.g.player.vehicle) return;
    this.isOpen = true;
    this.at = at;
    if (at === 'home') this.g.interiors.yh?.setWardrobe(true);
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
