// 茶學苑 Tea Arts（正門外中北路）：走到櫃台前按 E 點飲料（選品項、甜度、冰塊）。
// 排球少年 吱吱 有時候在這裡打工（ZZ_SHIFTS 排班）：他在店裡的時候，體育館門口就看不到他，
// 可以在點單畫面跟他聊天（還沒加好友的話，聊完一樣可以選要不要加）。店面建模在 interiors.js buildTeaShop。
import { createCharacter } from './character.js';
import { makeLabel } from './map.js';
import { FRIENDS } from './friends.js';
import { TEA_BOARD } from './street_tea.js';

const EMOJI = { 珍珠奶茶: '🧋', 茉莉綠茶: '🍵', 四季春青茶: '🍵', 冬瓜檸檬: '🍋', 蜂蜜檸檬綠: '🍯', 鮮奶紅茶: '🥛' };
export const TEA_MENU = TEA_BOARD.map(([name, price]) => ({ name, price, emoji: EMOJI[name] || '🥤' }));
// 隱藏款: not on the menu board; only on the order sheet while 吱吱 is working (he makes it for you), easter-egg talk only
export const TEA_SECRET = { name: '隱藏款彥霖特調', price: 60, emoji: '🤫', secret: true };
const SUGAR = ['正常糖', '少糖', '半糖', '微糖', '無糖'];
const ICE = ['正常冰', '少冰', '微冰', '去冰', '溫'];

// 吱吱's shifts [from, to) in minutes of the day on a 4-day rota (game day 0 = the first day); null = day off
const ZZ_SHIFTS = [[15 * 60, 21 * 60], null, [18 * 60, 22 * 60], [12 * 60, 17 * 60]];
export function zzOnShift(clock) {
  const day = Math.floor(clock / 1440), m = clock - day * 1440, s = ZZ_SHIFTS[((day % 4) + 4) % 4];
  return !!s && m >= s[0] && m < s[1];
}
// what he says when he takes your order (s = 「珍珠奶茶 半糖少冰」)
const ZZ_TAKE = [
  (s) => `${s}，收到！看我搖 🏐`,
  (s) => `${s}～我搖雪克杯跟跳發一樣有力 💪`,
  (s) => `${s}，這杯算你同屆價……開玩笑的啦哈哈`,
  (s) => `${s}！我們店長說我搖的最均勻`,
];
const CLERK_LOOK = { skin: '#f3d9c4', shirt: '#1f3d2b', shorts: '#1b1b1d', pants: true, hair: '#2b1d14', hairStyle: 'pony', face: true, shoes: '#222' };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class TeaShop {
  constructor(game) {
    this.g = game; const s = this.spec = game.interiors.tea;
    this.on = false; this.voted = false; this.t = 0;
    const put = (ch, p) => { ch.root.position.set(p.at[0], s.base, p.at[1]); ch.root.rotation.y = p.h; ch.home = p.h; game.scene.add(ch.root); return ch; };
    this.clerk = put(createCharacter(CLERK_LOOK), s.clerk);
    const zz = this.zz = put(createCharacter(FRIENDS.zz.look), s.zz);
    const tag = makeLabel('吱吱（打工中）', { height: 0.26, color: '#ffd23f' }); tag.position.set(0, 2.1, 0); zz.root.add(tag);
    this.mark = makeLabel('!', { height: 0.45, color: '#111', bg: '#ffd23f' }); this.mark.position.set(0, 2.7, 0); zz.root.add(this.mark);
    zz.root.visible = false;
    for (const c of [this.clerk, zz]) { c.workT = 1 + Math.random() * 2; c.reach = 0; }
    game.interiors.actions.push({
      x: s.counter[0], z: s.counter[1], r: 2.0, y: 0, anyY: true,
      label: () => this.on ? '按 <kbd>E</kbd> 點飲料・和吱吱聊天（茶學苑）' : '按 <kbd>E</kbd> 點飲料（茶學苑）',
      fn: () => this.open(),
    });
    game.interiors.updaters.push((dt) => this.update(dt));
  }
  update(dt) {
    const g = this.g, on = zzOnShift(g.clock);
    if (on !== this.on) {
      this.on = on; this.zz.root.visible = on;
      const gym = g.friends?.npcs.zz; if (gym) gym.ch.root.visible = !on; // he can't be at the 體育館 and the shop at once
    }
    this.mark.visible = !g.friends?.added.has('zz');
    if (on) this.mark.position.y = 2.7 + Math.sin(g.time * 3) * 0.08;
    const p = g.player.pos, [cx, cz] = this.spec.counter;
    if ((p.x - cx) ** 2 + (p.z - cz) ** 2 > 60 * 60) return; // nobody is watching
    const pw = g.player.worldPos();
    for (const c of on ? [this.clerk, this.zz] : [this.clerk]) {
      // shake / hand over now and then; while you talk to them, turn to you
      if ((c.workT -= dt) <= 0) { c.workT = 1.8 + Math.random() * 2.8; c.reach = 0.8; c.turn = (Math.random() - 0.5) * 0.8; }
      c.reach -= dt;
      const r = c.root, want = c === this.facing ? Math.atan2(pw.x - r.position.x, pw.z - r.position.z) : c.home + (c.reach > 0 ? c.turn : 0);
      r.rotation.y += angDiff(want, r.rotation.y) * Math.min(1, dt * 5);
      c.setDetail?.((p.x - cx) ** 2 + (p.z - cz) ** 2 < 35 * 35);
      c.update(dt, { speed: 0, pose: c.reach > 0 && c !== this.facing ? 'give' : null });
    }
  }
  // the order sheet: drinks (1–6), sweetness and ice, and a chat with 吱吱 when he is working
  open() {
    const g = this.g, zz = this.on, menu = zz ? [...TEA_MENU, TEA_SECRET] : TEA_MENU; let sugar = 2, ice = 1;
    document.exitPointerLock?.();
    this.facing = zz ? this.zz : this.clerk;
    const chips = (arr, sel, id) => `<div class="ts-chips" id="${id}">${arr.map((t, i) => `<button class="ts-chip${i === sel ? ' on' : ''}" data-i="${i}">${t}</button>`).join('')}</div>`;
    g.modal('🧋 茶學苑 Tea Arts', `<p class="ts-hi">${zz ? '吱吱在櫃台後面搖飲料，看到你揮了揮手：「欸！彥霖！要喝什麼？」<br><small>他壓低聲音：「我在班才有隱藏款喔 🤫」</small>' : '店員：「歡迎光臨茶學苑～請問要喝什麼？」'}</p>
      <div class="ts-menu">${menu.map((d, i) => `<button class="menu-btn ts-drink${d.secret ? ' ts-secret' : ''}" data-d="${i}"${g.money < d.price ? ' data-poor="1"' : ''}><span>${i + 1}. ${d.emoji} ${d.name}</span><small>NT$ ${d.price}</small></button>`).join('')}</div>
      <div class="ts-lbl">甜度</div>${chips(SUGAR, sugar, 'tsSugar')}
      <div class="ts-lbl">冰塊</div>${chips(ICE, ice, 'tsIce')}
      <div class="modal-btns" style="margin-top:12px">${zz ? '<button class="menu-btn primary" id="tsChat"><span>💬 和吱吱聊天</span><small>C</small></button>' : ''}
      <button class="menu-btn" id="tsBye"><span>先不用了</span><small>ESC</small></button></div>`, `零用錢 NT$ ${g.money}`);
    const body = document.getElementById('modalBody');
    const pick = (id, set) => body.querySelectorAll(`#${id} .ts-chip`).forEach(b => b.onclick = () => {
      set(+b.dataset.i); body.querySelectorAll(`#${id} .ts-chip`).forEach(o => o.classList.toggle('on', o === b));
    });
    pick('tsSugar', (i) => sugar = i); pick('tsIce', (i) => ice = i);
    const done = (then) => { removeEventListener('keydown', key, true); g.closeModal(); g.resume(); if (then) then(); else this.facing = null; };
    // 1–6 = drink, C = chat, Esc = leave (kept away from the game so Esc doesn't also pause)
    const key = (e) => {
      if (!g._modalOpen) { removeEventListener('keydown', key, true); this.facing = null; return; } // closed with ✕
      const n = /^Digit([1-9])$/.exec(e.code)?.[1];
      if (n && menu[n - 1]) { e.preventDefault(); e.stopPropagation(); done(() => this.order(menu[n - 1], sugar, ice)); }
      else if (e.code === 'KeyC' && zz) { e.preventDefault(); e.stopPropagation(); done(() => this.chat()); }
      else if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); }
    };
    addEventListener('keydown', key, true);
    body.querySelectorAll('.ts-drink').forEach(b => b.onclick = () => done(() => this.order(menu[+b.dataset.d], sugar, ice)));
    if (zz) document.getElementById('tsChat').onclick = () => done(() => this.chat());
    document.getElementById('tsBye').onclick = () => done();
  }
  chat() {
    this.facing = this.zz;
    this.g.friends.talk('zz', 'shop', () => { this.facing = null; });
  }
  order(d, sugar, ice) {
    const g = this.g, zz = this.on, who = zz ? '吱吱' : '店員';
    const spec = `${d.name} ${SUGAR[sugar]}${ICE[ice]}`, end = () => { this.facing = null; };
    if (g.money < d.price) {
      g.dialog([[who, `${d.name}一杯 ${d.price} 元喔～`], ['彥霖', `（翻錢包）……只剩 ${g.money} 元 😅`],
        zz ? ['吱吱', '哈哈 下次再請你啦！缺錢可以去活動中心麥當勞打工，我們店暫時不缺人 🤣'] : ['店員', '沒關係～下次再來喔！']], end);
      return;
    }
    g.spend(d.price, `茶學苑 ${d.name}`);
    const take = ZZ_TAKE[Math.floor(Math.random() * ZZ_TAKE.length)];
    const lines = d.secret
      ? [['彥霖', '吱吱，聽說你們有隱藏款？'], ['吱吱', '噓——小聲點 🤫 這個只有我在班的時候做'],
        ['吱吱', '隱藏款彥霖特調：四季春打底、加檸檬跟一點蜂蜜，最後撒上……資管要贏的決心'],
        ['彥霖', '最後那個是什麼啦 😂'], ['吱吱', `${SUGAR[sugar]}${ICE[ice]}，好了！喝了就知道，保證跟你一樣順 ✌`]]
      : zz
      ? [['彥霖', `一杯${spec}！`], ['吱吱', take(spec)], ['吱吱', this.voted ? '好了～小心拿，選舉加油！' : '好了～杯套我幫你寫了「票投彥霖」，拿去 ✌']]
      : [['彥霖', `一杯${spec}，謝謝`], ['店員', `好的，${spec}，請稍等～`], ['店員', '久等了，小心拿喔！']];
    g.dialog(lines, () => {
      end();
      g.hud.toast(d.secret ? '🤫 隱藏款彥霖特調 get！吱吱說別告訴別人' : `${d.emoji} ${spec} get！體力回復`, 'good', 2400); g.audio.pickup?.();
      if (d.secret) return; // the 隱藏款 is just for the talk: no boost, no votes
      g.player.boost = 30;
      if (zz && !this.voted) { this.voted = true; g.addVotes(2, '吱吱的杯套拉票 +2 票'); }
    });
  }
}
