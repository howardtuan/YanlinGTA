// i-Piyan：遊戲裡的手機（仿 iPhone 介面，蘋果換成水蜜桃）。按 E（附近沒有其他互動時）開關。
// App：訊息（兩種回覆擇一，Tab 傳送）、相機、照片、Peach Pay 錢包、地圖、音樂、選情、天氣、麥當勞、設定。
import { CONTACTS } from './chats.js';
import { Nano } from './nano.js';
import { PEOPLE, FEED, FEED_POOL, STORIES, STORY_POOL, FEED_IMAGES, PCARD, PCARD_POOL } from './feeds.js';

const PEACH = (fill = '#fff') => `<svg viewBox="0 0 64 64" class="peach-logo" aria-hidden="true">
  <path d="M32 19c-3-3-8-5-13-4C10 17 5 25 6 35c1 13 12 23 26 23s25-10 26-23c1-10-4-18-13-20-5-1-10 1-13 4z" fill="${fill}"/>
  <path d="M32 20c3 9 3 24-3 37" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M33 17c1-7 8-12 17-11-1 8-8 12-17 11z" fill="${fill}"/>
  <path d="M31 18c-1-4-1-7 1-10" fill="none" stroke="${fill}" stroke-width="2.4" stroke-linecap="round"/></svg>`;

const APPS = [
  { id: 'messages', name: '訊息', icon: '💬', bg: 'linear-gradient(#6af07e,#20c23f)' },
  { id: 'camera', name: '相機', icon: '📷', bg: 'linear-gradient(#d9d9de,#9a9aa2)' },
  { id: 'photos', name: '照片', icon: '🌸', bg: 'linear-gradient(#fff,#f0f0f0)' },
  { id: 'wallet', name: 'Peach Pay', icon: '💳', bg: 'linear-gradient(#ffb38a,#ff6f61)' },
  { id: 'map', name: '地圖', icon: '🗺️', bg: 'linear-gradient(#bfe9a8,#6cc070)' },
  { id: 'music', name: '音樂', icon: '🎵', bg: 'linear-gradient(#ff6b8b,#fa2d55)' },
  { id: 'votes', name: '選情', icon: '🗳️', bg: 'linear-gradient(#ffe27a,#ffbf1f)' },
  { id: 'weather', name: '天氣', icon: '⛅', bg: 'linear-gradient(#5fb4ff,#2a6fe0)' },
  { id: 'mcd', name: '麥當勞', icon: '🍟', bg: 'linear-gradient(#e7313b,#c8102e)' },
  { id: 'settings', name: '設定', icon: '⚙️', bg: 'linear-gradient(#a7acb4,#6c7179)' },
  { id: 'gram', name: 'Peachgram', icon: '📸', bg: 'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf)' },
  { id: 'shop', name: '桃寶購物', icon: '🛍️', bg: 'linear-gradient(#ff9a3c,#ff5b1f)' },
  { id: 'pcard', name: 'Pcard', icon: '🗨️', bg: 'linear-gradient(#3fa9f5,#006aa6)' },
  { id: 'notes', name: '備忘錄', icon: '📝', bg: 'linear-gradient(#fff 0 22%,#ffd60a 22% 26%,#fff 26%)' },
  { id: 'calendar', name: '行事曆', icon: '📅', bg: 'linear-gradient(#fff,#f2f2f2)' },
  { id: 'calc', name: '計算機', icon: '🧮', bg: 'linear-gradient(#3a3a3c,#1c1c1e)' },
  { id: 'clock', name: '時鐘', icon: '⏰', bg: 'linear-gradient(#2c2c2e,#000)' },
];
const CAPTIONS = ['資管要贏！票投彥霖 🗳️', '今天也在中原努力拉票中 🛵', '謝謝每一位支持我的同學 🙏', '系烤升級，說到做到 🔥'];
// 桃寶購物：effects are applied by the phone (votes / sprint boost / just fun)
const SHOP = [
  { id: 'energy', name: '能量飲料', icon: '🥤', price: 45, desc: '衝刺速度 +30%，持續 60 秒', boost: 60 },
  { id: 'boba', name: '珍珠奶茶 全糖', icon: '🧋', price: 60, desc: '衝刺速度 +30%，持續 90 秒', boost: 90 },
  { id: 'flyer', name: '加印傳單 500 張', icon: '📄', price: 200, desc: '交給阿凱發，+3 票（最多 3 次）', votes: 3, max: 3 },
  { id: 'chicken', name: '雞排請全組', icon: '🍗', price: 300, desc: '競選小組士氣大增，+4 票', votes: 4, max: 1, team: '雞排！！！會長萬歲 🍗' },
  { id: 'tee', name: '競選 T 恤', icon: '👕', price: 350, desc: '「資管要贏」系服，穿出去 +5 票', votes: 5, max: 1 },
  { id: 'mega', name: '擴音大聲公', icon: '📣', price: 480, desc: '政見全校都聽得到，+8 票', votes: 8, max: 1 },
  { id: 'case', name: '水蜜桃手機殼', icon: '🍑', price: 199, desc: 'i-Piyan 15 Pro 專用，粉嫩可愛', max: 1 },
  { id: 'helmet', name: 'JET SL 安全帽', icon: '⛑️', price: 890, desc: '極地白配色，騎車安全第一', max: 1 },
];
const NOTES = [
  { t: '三大政見', d: '今天', b: '1. 系學會透明：帳目每月公開\n2. 課程回饋：每學期收集意見給系辦\n3. 系烤升級：更多肉、更多人、更多歡樂' },
  { t: '政見發表會講稿', d: '昨天', b: '大家好，我是資管系第34屆系學會會長候選人彥霖。\n資管要贏，票投彥霖！\n（記得不要超過五分鐘——柏宇）' },
  { t: '待辦', d: '週一', b: '☑ 登記參選\n☑ 印傳單 500 張\n☐ 撿齊 34 張金色選票\n☐ 麥當勞排班\n☐ 機車換機油' },
];
const CAL = { 3: '期中考週', 12: '系學會登記', 18: '政見發表會', 20: '拉票衝刺', 25: '投票日 🗳️', 28: '系烤' };
// home-screen icon artwork (assets/phone/<id>.webp, generated with Qwen-Image); preloaded so the emoji doesn't flash first
const ICON_DIR = 'assets/phone/';
const ICON_ART = new Set(APPS.map(a => a.id));
const ICON_FAIL = new Set();
for (const id of ICON_ART) { const im = new Image(); im.onerror = () => ICON_FAIL.add(id); im.src = `${ICON_DIR}${id}.webp`; }
const DOCK = ['messages', 'camera', 'wallet', 'settings'];
const PAGE1 = 8;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

export class Phone {
  constructor(game) {
    this.g = game; this.open = false; this.app = null; this.booted = false; this.sel = 0; this.homeSel = 0;
    this.photos = [];
    this.likes = new Set(); this.myPosts = []; this.bought = {}; this.orders = []; this.calcExpr = '';
    // social feeds: timestamps are game-clock minutes; every 30 game minutes something new is posted (tick)
    const now = game.clock;
    this.feed = FEED.map((p, i) => ({ ...p, id: 'f' + i, at: now - p.ago }));
    this.pcard = PCARD.map((p, i) => ({ ...p, id: 'c' + i, at: now - p.ago }));
    this.stories = STORIES.map((x, i) => ({ ...x, id: 's' + i, at: now - 40 - i * 25, seen: false }));
    this.poolI = { feed: 0, pcard: 0, story: 0 }; this.nextPost = now + 30; this.fresh = { gram: 0, pcard: 0 };
    this.page = 0;
    Nano.init();
    Nano.listeners.add(() => {
      if (!this.open) return;
      if (this.cur && !this.cur.busy) this._renderCompose();
      else if (this.app === 'settings' && !this.cur) { const r = this.view.querySelector('#phAI small'); if (r) r.textContent = Nano.label(); }
    });
    // chat state: rounds advance as you reply; history becomes the live thread
    this.chats = CONTACTS.map(c => ({ c, round: 0, choice: 0, msgs: c.history.map(h => Array.isArray(h) ? { who: h[0], text: h[1], time: h[2] } : { day: h.day }), unread: c.unread || 0, busy: false }));
    this.cur = null;
    const el = this.el = document.createElement('div');
    el.id = 'phone'; el.className = 'hidden';
    el.innerHTML = `<div class="ph-body"><div class="ph-screen">
      <div class="ph-status"><span class="ph-time">17:30</span><span class="ph-island"></span><span class="ph-icons">▂▄▆ <b>5G</b> <i class="ph-batt"><i></i></i></span></div>
      <div class="ph-view"></div>
      <div class="ph-boot hidden">${PEACH()}</div>
      <div class="ph-home-bar" title="主畫面"></div>
    </div><div class="ph-btn ph-btn-a"></div><div class="ph-btn ph-btn-b"></div><div class="ph-btn ph-btn-c"></div></div>
    <div class="ph-hint"><kbd>E</kbd> 收起手機 · <kbd>Esc</kbd> 返回</div>`;
    document.getElementById('app').appendChild(el);
    this.view = el.querySelector('.ph-view');
    el.querySelector('.ph-home-bar').onclick = () => (this.app ? this.home() : this.close());
    addEventListener('resize', () => this._scale());
  }
  get unreadTotal() { return this.chats.reduce((s, c) => s + c.unread, 0); }
  toggle() { this.open ? this.close() : this.show(); }
  show() {
    this.open = true; this.el.classList.remove('hidden'); this._scale();
    this.g.audio.blip?.();
    if (!this.booted) {
      this.booted = true;
      const b = this.el.querySelector('.ph-boot'); b.classList.remove('hidden');
      setTimeout(() => b.classList.add('hidden'), 900);
    }
    this.home();
  }
  close() { if (this.story) this._storyClose(); this.open = false; this.el.classList.add('hidden'); this.app = null; this.cur = null; this._frameKey = null; }
  _scale() { const s = Math.min(1, (innerHeight - 30) / 660, (innerWidth - 20) / 330); this.el.style.setProperty('--ps', s.toFixed(3)); }
  // keyboard while open; returns nothing, the game freezes the player meanwhile
  update(dt, inp) {
    this.el.querySelector('.ph-time').textContent = hhmm(this.g.clock);
    if (inp.hit('KeyE')) { this.close(); return 'closed'; }
    if (this.story) {
      if (inp.hit('Escape', 'Backspace')) { this._storyClose(); return null; }
      if (inp.hit('ArrowRight', 'Space', 'Enter')) this._storyGo(1);
      if (inp.hit('ArrowLeft')) this._storyGo(-1);
      if (inp.hit('KeyE')) { this._storyClose(); this.close(); return 'closed'; }
      return null;
    }
    if (inp.hit('Escape', 'Backspace')) { if (this.cur) this.openApp('messages'); else if (this.app) this.home(); else this.close(); return this.open ? null : 'closed'; }
    if (this.cur) {
      const st = this.cur;
      if (inp.hit('ArrowUp', 'ArrowLeft', 'Digit1', 'Numpad1')) this._pick(inp.hit('Digit1', 'Numpad1') ? 0 : Math.max(0, st.choice - 1));
      if (inp.hit('ArrowDown', 'ArrowRight', 'Digit2', 'Numpad2')) this._pick(inp.hit('Digit2', 'Numpad2') ? 1 : Math.min(1, st.choice + 1));
      if (inp.hit('Tab', 'Enter')) this._send();
    } else if (!this.app) {
      // grid then dock share one selection order
      if (inp.hit('ArrowRight')) this._homeSel(this.homeSel + 1);
      if (inp.hit('ArrowLeft')) this._homeSel(this.homeSel - 1);
      if (inp.hit('ArrowDown')) this._homeSel(this.homeSel + 4);
      if (inp.hit('ArrowUp')) this._homeSel(this.homeSel - 4);
      if (inp.hit('Enter', 'Space')) this.openApp(this._order[this.homeSel]);
    } else if (this.app === 'messages') {
      if (inp.hit('ArrowDown')) this._listSel(this.sel + 1);
      if (inp.hit('ArrowUp')) this._listSel(this.sel - 1);
      if (inp.hit('Enter', 'Tab')) this.openChat(this.chats[this.sel]);
    }
    return null;
  }

  // ---------------- home screen ----------------
  home() {
    this.app = null; this.cur = null; this._frameKey = null;
    const grid = APPS.filter(a => !DOCK.includes(a.id)), dock = DOCK.map(id => APPS.find(a => a.id === id));
    const pages = [grid.slice(0, PAGE1), grid.slice(PAGE1)];
    this._pageStart = [0, PAGE1, grid.length];
    this._order = [...grid, ...dock].map(a => a.id);
    const badgeN = id => id === 'messages' ? this.unreadTotal : id === 'gram' ? this.fresh.gram : id === 'pcard' ? this.fresh.pcard : 0;
    const icon = (a) => {
      const n = badgeN(a.id), badge = n ? `<b class="ph-badge">${n}</b>` : '';
      // generated artwork covers the emoji + gradient; if the image fails it removes itself and the emoji shows
      const art = ICON_ART.has(a.id) && !ICON_FAIL.has(a.id) ? `<img class="ph-ico-img" src="${ICON_DIR}${a.id}.webp" alt="" draggable="false" onerror="this.remove()">` : '';
      return `<button class="ph-app" data-app="${a.id}"><span class="ph-ico" style="background:${a.bg}">${a.icon}${art}${badge}</span><span class="ph-lbl">${a.name}</span></button>`;
    };
    const night = this.g.night > 0.5, last = this.feed[0];
    this.view.innerHTML = `<div class="ph-home ${night ? 'night' : ''}">
      <div class="ph-pages"><div class="ph-track">
        <div class="ph-page"><div class="ph-widget"><div class="ph-w-time">${hhmm(this.g.clock)}</div><div class="ph-w-sub">${this._dateStr()} · 中壢 ${this._temp()}°</div>
          <div class="ph-w-row">🗳 ${this.g.votes} 票　💰 NT$ ${this.g.money}</div></div>
          <div class="ph-grid">${pages[0].map(icon).join('')}</div></div>
        <div class="ph-page"><div class="ph-grid">${pages[1].map(icon).join('')}</div>
          ${last ? `<button class="ph-wgram" data-app="gram"><img src="${last.img}" alt=""><span><small>Peachgram · ${esc(last.who)}</small>${esc(last.cap)}</span></button>` : ''}</div>
      </div></div>
      <div class="ph-dots">${pages.map((_, k) => `<i data-p="${k}"></i>`).join('')}</div>
      <div class="ph-dock">${dock.map(a => icon(a).replace(/<span class="ph-lbl">.*?<\/span>/, '')).join('')}</div></div>`;
    for (const b of this.view.querySelectorAll('[data-app]')) b.onclick = () => { if (!this._dragged) this.openApp(b.dataset.app); };
    for (const d of this.view.querySelectorAll('.ph-dots i')) d.onclick = () => this._setPage(+d.dataset.p);
    this._swipe(this.view.querySelector('.ph-pages'), pages.length);
    this._setPage(this.page, true);
    this._homeSel(Math.min(this.homeSel, this._order.length - 1));
  }
  // drag / swipe / trackpad sideways scroll between home pages
  _swipe(el, n) {
    const track = el.querySelector('.ph-track');
    let x0 = null, dx = 0, id = null;
    el.onpointerdown = e => { x0 = e.clientX; dx = 0; id = e.pointerId; this._dragged = false; track.style.transition = 'none'; };
    el.onpointermove = e => {
      if (x0 === null || e.pointerId !== id) return;
      dx = (e.clientX - x0) / (parseFloat(getComputedStyle(this.el).getPropertyValue('--ps')) || 1);
      if (Math.abs(dx) > 6 && !this._dragged) { this._dragged = true; try { el.setPointerCapture(id); } catch (er) { } }
      if (this._dragged) { const edge = (this.page === 0 && dx > 0) || (this.page === n - 1 && dx < 0) ? 0.3 : 1; track.style.transform = `translateX(calc(${-this.page * 100}% + ${dx * edge}px))`; }
    };
    const end = () => {
      if (x0 === null) return; x0 = null; track.style.transition = '';
      if (this._dragged && Math.abs(dx) > 45) this._setPage(this.page + (dx < 0 ? 1 : -1)); else this._setPage(this.page);
      setTimeout(() => { this._dragged = false; }, 0); // the click after a drag must not open an app
    };
    el.onpointerup = end; el.onpointercancel = end;
    let wheelT = 0;
    el.onwheel = e => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.6 && !e.shiftKey) return;
      const now = performance.now(); if (now - wheelT < 450) return; wheelT = now;
      this._setPage(this.page + ((e.deltaX || e.deltaY) > 0 ? 1 : -1));
    };
  }
  _setPage(p, instant) {
    const n = this._pageStart.length - 1; this.page = Math.max(0, Math.min(n - 1, p));
    const track = this.view.querySelector('.ph-track'); if (!track) return;
    if (instant) track.style.transition = 'none';
    track.style.transform = `translateX(${-this.page * 100}%)`;
    if (instant) { void track.offsetWidth; track.style.transition = ''; }
    this.view.querySelectorAll('.ph-dots i').forEach((d, k) => d.classList.toggle('on', k === this.page));
  }
  _homeSel(i) {
    this.homeSel = Math.max(0, Math.min(this._order.length - 1, i));
    this.view.querySelectorAll('.ph-app').forEach((b, k) => b.classList.toggle('sel', k === this.homeSel));
    // keyboard selection on a grid icon flips to its page (dock icons stay on the current page)
    const st = this._pageStart;
    if (this.homeSel < st[st.length - 1]) { const pg = this.homeSel < st[1] ? 0 : 1; if (pg !== this.page) this._setPage(pg); }
  }
  _dateStr() { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`; }
  _temp() { return Math.round(this.g.night > 0.5 ? 19 : 24 + Math.sin((this.g.clock % 1440) / 1440 * Math.PI) * 3); }
  _frame(title, body, opt = {}) {
    // slide in only when we land on a different page; re-rendering the same page (likes, buy, keypad, tabs) stays put
    const key = this.app + '|' + title, still = key === this._frameKey; this._frameKey = key;
    this.view.innerHTML = `<div class="ph-appview ${opt.cls || ''} ${still ? 'still' : ''}"><div class="ph-nav"><button class="ph-back">‹ ${esc(opt.back || '主畫面')}</button><b>${esc(title)}</b><span>${opt.right || ''}</span></div><div class="ph-content">${body}</div></div>`;
    this.view.querySelector('.ph-back').onclick = () => (opt.onBack ? opt.onBack() : this.home());
    return this.view.querySelector('.ph-content');
  }
  openApp(id) {
    this.app = id; this.cur = null;
    const g = this.g;
    if (id === 'messages') return this._messages();
    if (id === 'map') { this.close(); g.hud.toggleBig(true); return; }
    if (id === 'camera') return this._camera();
    if (id === 'photos') return this._photos();
    if (id === 'wallet') {
      const rows = g.ledger.slice().reverse().map(l => `<div class="ph-row"><span>${esc(l.what)}<small>${hhmm(l.at)}</small></span><b class="${l.n >= 0 ? 'plus' : 'minus'}">${l.n >= 0 ? '+' : '−'}NT$ ${Math.abs(l.n)}</b></div>`).join('') || '<div class="ph-empty">還沒有交易紀錄</div>';
      this._frame('Peach Pay', `<div class="ph-card">${PEACH('#fff')}<div><small>Peach Pay · 彥霖</small><b>NT$ ${g.money}</b></div><span>**** 0803</span></div>
        <div class="ph-sec">交易紀錄</div>${rows}`);
      return;
    }
    if (id === 'music') {
      const cur = g.settings.music;
      const opt = (v, t, s) => `<button class="ph-row ph-pick ${cur === v ? 'on' : ''}" data-m="${v}"><span>${t}<small>${s}</small></span><b>${cur === v ? '▶' : ''}</b></button>`;
      const c = this._frame('音樂', `<div class="ph-album">🎭</div><div class="ph-sec">播放清單</div>
        ${opt('opera', '彥霖歌劇', '彥霖 · 競選主題曲')}${opt('default', '遊戲配樂', '中原順起來 OST')}${opt('off', '靜音', '關閉背景音樂')}`);
      for (const b of c.querySelectorAll('[data-m]')) b.onclick = () => { g.setMusic(b.dataset.m); this.openApp('music'); };
      return;
    }
    if (id === 'votes') {
      const obj = document.getElementById('objText')?.innerText || '自由探索';
      this._frame('選情', `<div class="ph-big"><small>目前得票</small><b>${g.votes}</b><span>票</span></div>
        <div class="ph-row"><span>金色選票</span><b>${g.ballotsTaken} / 34</b></div>
        <div class="ph-row"><span>發傳單成功</span><b>${g.flyerVotes || 0} 人</b></div>
        <div class="ph-row"><span>🚧 支線：A6 側門門禁<small>坐進側門警衛室，別讓怪人進來</small></span><b>${g.gate?.shifts ? `完成 ${g.gate.shifts} 班` : '未開始'}</b></div>
        <div class="ph-row"><span>目前任務</span><b class="ph-wrap">${esc(obj)}</b></div>
        <div class="ph-note">資管要贏，票投彥霖！🗳</div>`);
      return;
    }
    if (id === 'weather') {
      const t = this._temp(), n = g.night > 0.5;
      const hours = [0, 1, 2, 3, 4, 5].map(k => { const m = g.clock + k * 60, h = Math.floor(m / 60) % 24, nn = h < 6 || h >= 18; return `<div><small>${k ? h + '時' : '現在'}</small><span>${nn ? '🌙' : k % 3 === 2 ? '⛅' : '☀️'}</span><b>${nn ? 19 + (k % 2) : 24 + (k % 3)}°</b></div>`; }).join('');
      this._frame('天氣', `<div class="ph-weather ${n ? 'night' : ''}"><small>中壢區</small><b>${t}°</b><span>${n ? '晴朗夜空' : '多雲時晴'}</span><small>最高 27° 最低 18°</small></div>
        <div class="ph-hours">${hours}</div><div class="ph-note">降雨機率 10%，適合騎 JET SL 去拉票 🛵</div>`, { cls: 'ph-blue' });
      return;
    }
    if (id === 'mcd') {
      const j = g.job;
      this._frame('麥當勞', `<div class="ph-mcd">🍟<b>麥當勞 中原店</b><small>學生活動中心東側</small></div>
        <div class="ph-sec">我的打工</div>
        <div class="ph-row"><span>時薪</span><b>NT$ 196</b></div>
        <div class="ph-row"><span>已完成班數</span><b>${j.shifts} 班</b></div>
        <div class="ph-row"><span>打工總收入</span><b>NT$ ${j.earned}</b></div>
        <div class="ph-row"><span>最佳單班</span><b>NT$ ${j.best}</b></div>
        <div class="ph-note">走進麥當勞，從櫃檯側邊繞到後面的<b>員工入口</b>：打卡鐘旁按 <kbd>E</kbd> 上櫃台，走到內場煎台前按 <kbd>E</kbd> 上內場。</div>
        <div class="ph-sec">菜單</div>
        <div class="ph-row"><span>大麥克套餐</span><b>NT$ 155</b></div>`, { cls: 'ph-red' });
      return;
    }
    if (id === 'gram') return this._gram();
    if (id === 'shop') return this._shop();
    if (id === 'pcard') return this._pcard();
    if (id === 'notes') return this._notes();
    if (id === 'calendar') return this._calendar();
    if (id === 'calc') return this._calc();
    if (id === 'clock') return this._clock();
    if (id === 'settings') {
      const c = this._frame('設定', `<div class="ph-prof"><span>彥</span><div><b>彥霖</b><small>Peach ID、iCloud+、媒體與購買項目</small></div></div>
        <div class="ph-sec">一般</div>
        <button class="ph-row" id="phAbout"><span>關於本機</span><b>›</b></button>
        <div class="ph-row"><span>Wi-Fi</span><b>CYCU-WiFi</b></div>
        <div class="ph-row"><span>藍牙</span><b>開啟</b></div>
        <div class="ph-row"><span>電池</span><b>87%</b></div>
        <div class="ph-sec">Peach Intelligence</div>
        <button class="ph-row" id="phAI"><span>AI 聊天（Gemini Nano）<small>${esc(Nano.label())}</small></span><b>${Nano.state === 'downloadable' ? '下載' : Nano.on ? '✨' : ''}</b></button>
        <div class="ph-note">在 Google Chrome 裡，訊息 App 會改用 Chrome 內建、在你電腦上執行的 Gemini Nano 產生回覆，可以無限聊下去；其他瀏覽器則使用預先寫好的對話。</div>`);
      c.querySelector('#phAI').onclick = () => { if (Nano.state === 'downloadable') Nano.download(); setTimeout(() => this.app === 'settings' && this.openApp('settings'), 300); };
      c.querySelector('#phAbout').onclick = () => this._frame('關於本機', `<div class="ph-about">${PEACH('#1c1c1e')}<b>i-Piyan 15 Pro</b><small>PeachOS 18.3</small></div>
        <div class="ph-row"><span>名稱</span><b>彥霖的 i-Piyan</b></div>
        <div class="ph-row"><span>型號名稱</span><b>i-Piyan 15 Pro</b></div>
        <div class="ph-row"><span>軟體版本</span><b>PeachOS 18.3</b></div>
        <div class="ph-row"><span>容量</span><b>256 GB</b></div>
        <div class="ph-row"><span>序號</span><b>PYL0803YL34</b></div>
        <div class="ph-row"><span>製造商</span><b>Peach Inc. 🍑</b></div>`, { back: '設定', onBack: () => this.openApp('settings') });
      return;
    }
  }
  // ---------------- Peachgram (social) ----------------
  _ago(at) {
    const m = Math.max(0, Math.round(this.g.clock - at));
    return m < 2 ? '剛剛' : m < 60 ? `${m} 分鐘` : m < 1440 ? `${Math.floor(m / 60)} 小時` : m < 2880 ? '昨天' : `${Math.floor(m / 1440)} 天`;
  }
  _person(who) { return PEOPLE[who] || { av: who[0], color: '#c7c7cc' }; }
  // newest story per person; unseen first
  _storyList() {
    const by = new Map();
    for (const st of this.stories) { const cur = by.get(st.who); if (!cur || st.at > cur.at) by.set(st.who, st); }
    return [...by.values()].sort((a, b) => (a.seen - b.seen) || (b.at - a.at));
  }
  _gram(tab = 'feed') {
    const g = this.g; this.fresh.gram = 0; this._gramTab = tab;
    const post = (p) => {
      const k = p.id, liked = this.likes.has(k), likes = p.likes + (liked ? 1 : 0), P = p.mine ? { av: '彥', color: '#ffd23f' } : this._person(p.who);
      return `<div class="pg-post"><div class="pg-head"><span class="ph-av" style="background:${P.color}">${P.av}</span><b>${esc(p.who)}</b><small>${this._ago(p.at)}</small></div>
        <div class="pg-img" data-k="${k}"><img src="${p.img}" alt="" loading="lazy"></div>
        <div class="pg-bar"><button class="pg-like ${liked ? 'on' : ''}" data-k="${k}">${liked ? '❤️' : '🤍'}</button><span>💬</span><span>📤</span></div>
        <div class="pg-cap"><b>${likes} 個讚</b><br><b>${esc(p.who)}</b> ${esc(p.cap)}</div></div>`;
    };
    const mine = this.myPosts.map((p, i) => ({ who: 'yanlin_im34', mine: true, img: p.photo, cap: p.cap, likes: p.likes, at: p.at, id: 'm' + i }));
    const all = [...mine, ...this.feed].sort((a, b) => b.at - a.at);
    let body;
    if (tab === 'feed') {
      this._stories = this._storyList();
      body = `<div class="pg-stories">${this._stories.map((x, i) => { const P = this._person(x.who); return `<button class="pg-story ${x.seen ? 'seen' : ''}" data-s="${i}"><span class="ph-av" style="background:${P.color}">${P.av}</span><small>${esc(x.who)}</small></button>`; }).join('')}</div>
      ${all.map(post).join('')}`;
    } else {
      const ph = this.photos[0];
      body = `<div class="pg-prof"><span class="ph-av" style="background:#ffd23f">彥</span><div><b>yanlin_im34</b><small>資管系第34屆系學會會長候選人 🗳️<br>資管要贏・票投彥霖</small></div></div>
        <div class="pg-stats"><div><b>${this.myPosts.length}</b>貼文</div><div><b>${1034 + this.myPosts.length * 57}</b>粉絲</div><div><b>298</b>追蹤中</div></div>
        <div class="ph-sec">發新貼文</div>
        ${ph ? `<div class="pg-new"><img src="${ph}"><div>${CAPTIONS.map((c, i) => `<button class="ph-choice" data-c="${i}">${esc(c)}</button>`).join('')}</div></div>`
          : '<div class="ph-note">先用 <b>相機</b> App 拍一張照片，才能發文。</div>'}
        <div class="pg-grid">${this.myPosts.map(p => `<img src="${p.photo}">`).join('')}</div>`;
    }
    const c = this._frame('Peachgram', `<div class="pg-tabs"><button class="${tab === 'feed' ? 'on' : ''}" data-t="feed">🏠 動態</button><button class="${tab === 'me' ? 'on' : ''}" data-t="me">👤 我的</button></div>${body}`, { cls: 'ph-gram' });
    c.querySelectorAll('[data-t]').forEach(b => b.onclick = () => this._gram(b.dataset.t));
    c.querySelectorAll('.pg-story').forEach(b => b.onclick = () => this._storyOpen(+b.dataset.s));
    const like = k => { this.likes.has(k) ? this.likes.delete(k) : this.likes.add(k); g.audio.pop?.(); this._rerender(() => this._gram(tab)); };
    c.querySelectorAll('.pg-like').forEach(b => b.onclick = () => like(b.dataset.k));
    c.querySelectorAll('.pg-img').forEach(b => b.ondblclick = () => { if (!this.likes.has(b.dataset.k)) like(b.dataset.k); });
    c.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      const n = this.myPosts.length;
      this.myPosts.unshift({ photo: this.photos[0], cap: CAPTIONS[+b.dataset.c], likes: 40 + Math.floor(Math.random() * 120), at: g.clock });
      g.audio.pickup?.();
      if (n < 3) g.addVotes(2, `Peachgram 貼文爆紅 +2 票`); else g.hud.toast('貼文發佈成功 📸', 'good', 1500);
      this._gram('feed');
    });
  }
  // re-render the current page and keep the scroll position
  _rerender(fn) { const y = this.view.querySelector('.ph-content')?.scrollTop || 0; fn(); const c = this.view.querySelector('.ph-content'); if (c) c.scrollTop = y; }
  // ---- story viewer: tap right / left half (or ← →), auto-advances every 5 s, Esc closes ----
  _storyOpen(i) {
    const list = this._stories || this._storyList(); if (!list[i]) return;
    this.story = { list, i };
    const ov = document.createElement('div'); ov.className = 'st-view';
    this.view.appendChild(ov); this._storyShow();
  }
  _storyShow() {
    const S = this.story; if (!S) return;
    const x = S.list[S.i], P = this._person(x.who); x.seen = true;
    const ov = this.view.querySelector('.st-view'); if (!ov) return;
    ov.innerHTML = `<img src="${x.img}" alt=""><div class="st-bars">${S.list.map((_, k) => `<i class="${k < S.i ? 'done' : k === S.i ? 'run' : ''}"><b></b></i>`).join('')}</div>
      <div class="st-head"><span class="ph-av" style="background:${P.color}">${P.av}</span><b>${esc(x.who)}</b><small>${this._ago(x.at)}</small><button class="st-x">✕</button></div>
      <div class="st-tap st-l"></div><div class="st-tap st-r"></div>
      <div class="st-reply">傳送訊息給 ${esc(x.who)}…　❤️</div>`;
    ov.querySelector('.st-x').onclick = e => { e.stopPropagation(); this._storyClose(); };
    ov.querySelector('.st-l').onclick = () => this._storyGo(-1);
    ov.querySelector('.st-r').onclick = () => this._storyGo(1);
    clearTimeout(this._stT); this._stT = setTimeout(() => this._storyGo(1), 5000);
  }
  _storyGo(d) {
    const S = this.story; if (!S) return;
    S.i += d; if (S.i < 0) S.i = 0;
    if (S.i >= S.list.length) { this._storyClose(); return; }
    this._storyShow();
  }
  _storyClose() {
    clearTimeout(this._stT); this.story = null;
    this.view.querySelector('.st-view')?.remove();
    if (this.app === 'gram') this._rerender(() => this._gram(this._gramTab || 'feed'));
  }
  // ---- something new every 30 game minutes (runs even with the phone in the pocket) ----
  tick() {
    const g = this.g;
    if (g.clock < this.nextPost) return;
    this.nextPost += 30;
    for (const p of this.feed.slice(0, 6)) p.likes += 1 + Math.floor(Math.random() * 12);
    for (const p of this.pcard.slice(0, 4)) p.n += Math.floor(Math.random() * 6);
    const fp = { ...FEED_POOL[this.poolI.feed++ % FEED_POOL.length] };
    const cp = { ...PCARD_POOL[this.poolI.pcard++ % PCARD_POOL.length] };
    const publish = () => {
      this.feed.unshift({ ...fp, id: 'f' + (this.feed.length + this.poolI.feed * 100), at: g.clock, likes: 3 + Math.floor(Math.random() * 40) });
      this.pcard.unshift({ ...cp, id: 'c' + (this.pcard.length + this.poolI.pcard * 100), at: g.clock, n: 1 + Math.floor(Math.random() * 15) });
      if (Math.random() < 0.6) { const st = STORY_POOL[this.poolI.story++ % STORY_POOL.length]; this.stories.push({ ...st, id: 's' + this.stories.length, at: g.clock, seen: false }); }
      this.feed.length = Math.min(this.feed.length, 40); this.pcard.length = Math.min(this.pcard.length, 40);
      const viewing = this.open && !this.story && !this.cur;
      if (!(viewing && this.app === 'gram')) this.fresh.gram++;
      if (!(viewing && this.app === 'pcard')) this.fresh.pcard++;
      g.hud.toast(`📸 Peachgram｜${fp.who} 發了新貼文`, 'good', 2200);
      setTimeout(() => g.hud.toast(`🗨️ Pcard 新文章：${cp.t}`, 'good', 2200), 2400);
      if (viewing && this.app === 'gram' && this._gramTab === 'feed') this._rerender(() => this._gram('feed'));
      else if (viewing && this.app === 'pcard') this._rerender(() => this._pcard());
      else if (this.open && !this.app) this.home();
    };
    // Chrome + Gemini Nano: let the model write the new caption and forum post (falls back to the pool text)
    if (Nano.on) {
      Nano.write(fp.who, PEOPLE[fp.who] ? fp.cap : '', cp).then(r => { if (r.cap) fp.cap = r.cap; if (r.t) Object.assign(cp, { t: r.t, b: r.b || cp.b, c: r.c?.length ? r.c : cp.c }); }).catch(() => { }).finally(publish);
    } else publish();
  }
  // ---------------- 桃寶購物 (shopping) ----------------
  _shop(tab = 'store') {
    const g = this.g;
    let body;
    if (tab === 'store') body = `<div class="sh-banner">🍑 校園特賣 · Peach Pay 付款</div><div class="sh-grid">${SHOP.map(it => {
      const n = this.bought[it.id] || 0, sold = it.max && n >= it.max;
      return `<div class="sh-item"><div class="sh-pic">${it.icon}</div><b>${esc(it.name)}</b><small>${esc(it.desc)}</small>
        <div class="sh-buy"><span>NT$ ${it.price}</span><button data-id="${it.id}" ${sold ? 'disabled' : ''}>${sold ? '已購買' : '購買'}</button></div></div>`;
    }).join('')}</div>`;
    else body = this.orders.length ? this.orders.slice().reverse().map(o => `<div class="ph-row"><span>${o.icon} ${esc(o.name)}<small>${hhmm(o.at)} · ${esc(o.status)}</small></span><b class="minus">−NT$ ${o.price}</b></div>`).join('')
      : '<div class="ph-empty">還沒有訂單</div>';
    const c = this._frame('桃寶購物', `<div class="pg-tabs"><button class="${tab === 'store' ? 'on' : ''}" data-t="store">🛍️ 商品</button><button class="${tab === 'orders' ? 'on' : ''}" data-t="orders">📦 我的訂單</button></div>
      <div class="sh-wallet">💳 Peach Pay 餘額 <b>NT$ ${g.money}</b></div>${body}`, { cls: 'ph-shop' });
    c.querySelectorAll('[data-t]').forEach(b => b.onclick = () => this._shop(b.dataset.t));
    c.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
      const it = SHOP.find(x => x.id === b.dataset.id);
      if (!g.spend(it.price, `桃寶：${it.name}`)) { g.audio.bad?.(); g.hud.toast('餘額不足！去麥當勞打工賺錢吧 🍟', 'bad', 2000); return; }
      g.audio.coin?.();
      this.bought[it.id] = (this.bought[it.id] || 0) + 1;
      this.orders.push({ ...it, at: g.clock, status: it.boost ? '已取貨・喝掉了' : '超商取貨・已送達' });
      if (it.boost) { g.player.boost = Math.max(g.player.boost || 0, it.boost); g.hud.toast(`${it.icon} ${it.name}：衝刺加速 ${it.boost} 秒！`, 'good', 2000); }
      if (it.votes) g.addVotes(it.votes, `${it.icon} ${it.name} +${it.votes} 票`);
      else if (!it.boost) g.hud.toast(`${it.icon} ${it.name} 已送達！`, 'good', 1800);
      if (it.team) { const t = this.chats.find(x => x.c.id === 'team'); if (t) { t.msgs.push({ who: '阿凱', text: it.team, time: hhmm(g.clock) }); t.unread++; } }
      const y = c.scrollTop; this._shop('store'); this.view.querySelector('.ph-content').scrollTop = y;
    });
  }
  // ---------------- Pcard (anonymous campus forum) ----------------
  _pcard() {
    this.fresh.pcard = 0;
    const list = this.pcard;
    const c = this._frame('中原大學 Pcard', `<div class="pc-board">🏫 中原大學板 · 最新</div>${list.map((p, i) => `<button class="pc-post" data-i="${i}"><b>${esc(p.t)}</b><small>${esc(p.b)}</small><span>❤️ ${p.n}　💬 ${p.c.length}　· ${this._ago(p.at)}</span></button>`).join('')}`, { cls: 'ph-pcard' });
    c.querySelectorAll('.pc-post').forEach(b => b.onclick = () => {
      const p = list[+b.dataset.i];
      this._frame('文章', `<div class="pc-full"><small>匿名 · 中原大學 · ${this._ago(p.at)}</small><b>${esc(p.t)}</b><p>${esc(p.b)}</p><span>❤️ ${p.n}</span></div>
        <div class="ph-sec">留言 ${p.c.length}</div>${p.c.map(x => `<div class="pc-cmt">${esc(x)}</div>`).join('')}`, { back: 'Pcard', onBack: () => this.openApp('pcard'), cls: 'ph-pcard' });
    });
  }
  _notes() {
    const c = this._frame('備忘錄', NOTES.map((n, i) => `<button class="ph-row" data-i="${i}"><span>${esc(n.t)}<small>${n.d} · ${esc(n.b.split('\n')[0])}</small></span><b>›</b></button>`).join(''), { cls: 'ph-notes' });
    c.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const n = NOTES[+b.dataset.i];
      this._frame(n.t, `<div class="nt-body">${esc(n.b).replace(/\n/g, '<br>')}</div>`, { back: '備忘錄', onBack: () => this.openApp('notes'), cls: 'ph-notes' });
    });
  }
  _calendar() {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<i></i>';
    for (let k = 1; k <= days; k++) cells += `<i class="${k === d.getDate() ? 'today' : ''} ${CAL[k] ? 'ev' : ''}">${k}</i>`;
    const evs = Object.entries(CAL).map(([k, t]) => `<div class="ph-row"><span>${m + 1}月${k}日<small>${esc(t)}</small></span><b>${+k === 25 ? '🗳️' : ''}</b></div>`).join('');
    this._frame('行事曆', `<div class="cal-h">${y} 年 ${m + 1} 月</div><div class="cal-g"><b>日</b><b>一</b><b>二</b><b>三</b><b>四</b><b>五</b><b>六</b>${cells}</div><div class="ph-sec">活動</div>${evs}`);
  }
  _calc() {
    const keys = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
    const cls = k => '÷×−+='.includes(k) ? 'op' : ['C', '±', '%', '⌫'].includes(k) ? 'fn' : '';
    const c = this._frame('計算機', `<div class="ca-out">${esc(this.calcExpr || '0')}</div><div class="ca-keys">${keys.map(k => `<button class="${cls(k)}" data-k="${k}">${k}</button>`).join('')}</div>`, { cls: 'ph-dark' });
    c.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k; let e = this.calcExpr === '錯誤' ? '' : this.calcExpr;
      if (k === 'C') e = '';
      else if (k === '⌫') e = e.slice(0, -1);
      else if (k === '=') {
        const js = e.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/%/g, '/100');
        if (/^[\d.+\-*/() ]+$/.test(js)) { try { const r = Function('"use strict";return (' + js + ')')(); e = Number.isFinite(r) ? String(+r.toFixed(8)) : '錯誤'; } catch (er) { e = '錯誤'; } }
      } else if (k === '±') e = e.startsWith('-') ? e.slice(1) : '-' + e;
      else e += k;
      this.calcExpr = e.slice(0, 18); this.g.audio.blip?.(); this._calc();
    });
  }
  _clock() {
    const g = this.g, real = new Date(), rm = real.getHours() * 60 + real.getMinutes();
    const zones = [['中壢（遊戲時間）', hhmm(g.clock)], ['台北（現實時間）', hhmm(rm)], ['東京', hhmm(rm + 60)], ['倫敦', hhmm(rm + 1440 - 480)]];
    const nextB = (g.ballotList || []).filter(b => b.taken).reduce((m, b) => Math.min(m, b.respawn), Infinity);
    const c = this._frame('時鐘', zones.map(([n, t]) => `<div class="ck-row"><small>${n}</small><b>${t}</b></div>`).join('') +
      `<div class="ph-sec">計時器</div><div class="ck-row"><small>下一張金色選票重生</small><b>${Number.isFinite(nextB) ? `${Math.floor(nextB / 60)}:${String(Math.floor(nextB % 60)).padStart(2, '0')}` : '—'}</b></div>`, { cls: 'ph-dark' });
    clearTimeout(this._ckT); this._ckT = setTimeout(() => { if (this.open && this.app === 'clock') this._clock(); }, 1000);
    return c;
  }
  _camera() {
    const c = this._frame('相機', `<div class="ph-cam"><div class="ph-vf">${this.photos[0] ? `<img src="${this.photos[0]}">` : '<span>按下快門拍下眼前的畫面</span>'}</div>
      <div class="ph-cam-bar"><button class="ph-thumb">${this.photos[0] ? `<img src="${this.photos[0]}">` : ''}</button><button class="ph-shutter"></button><span></span></div></div>`, { cls: 'ph-dark' });
    c.querySelector('.ph-shutter').onclick = () => this.g.capture(url => {
      this.photos.unshift(url); if (this.photos.length > 24) this.photos.pop();
      this.g.audio.blip?.(); this.el.classList.add('flash'); setTimeout(() => this.el.classList.remove('flash'), 180);
      if (this.app === 'camera') this._camera();
    });
    c.querySelector('.ph-thumb').onclick = () => this.openApp('photos');
  }
  _photos() {
    const imgs = this.photos.map(u => `<img src="${u}">`).join('') + '<img src="assets/loading.jpg" onerror="this.remove()">';
    const c = this._frame('照片', `<div class="ph-photos">${imgs}</div>${this.photos.length ? '' : '<div class="ph-note">用相機 App 拍照，照片會出現在這裡。</div>'}`);
    for (const im of c.querySelectorAll('.ph-photos img')) im.onclick = () => this._frame('照片', `<img class="ph-full" src="${im.src}">`, { back: '照片', onBack: () => this.openApp('photos'), cls: 'ph-dark' });
  }

  // ---------------- messages ----------------
  _messages() {
    this.cur = null;
    const rows = this.chats.map((st, i) => {
      const last = [...st.msgs].reverse().find(m => m.text);
      const who = last && st.c.group && last.who !== 'me' ? last.who + '：' : last && last.who === 'me' ? '你：' : '';
      return `<button class="ph-chatrow" data-i="${i}"><span class="ph-av" style="background:${st.c.color}">${st.c.avatar}</span>
        <span class="ph-cr-main"><b>${esc(st.c.name)}</b><small>${esc(who + (last ? last.text : ''))}</small></span>
        <span class="ph-cr-side"><small>${last?.time || ''}</small>${st.unread ? `<i>${st.unread}</i>` : ''}</span></button>`;
    }).join('');
    const c = this._frame('訊息', `<div class="ph-search">🔍 搜尋</div>${rows}`, { right: '✎' });
    c.querySelectorAll('.ph-chatrow').forEach(b => b.onclick = () => this.openChat(this.chats[+b.dataset.i]));
    this._listSel(this.sel);
  }
  _listSel(i) {
    this.sel = Math.max(0, Math.min(this.chats.length - 1, i));
    this.view.querySelectorAll('.ph-chatrow').forEach((b, k) => b.classList.toggle('sel', k === this.sel));
    this.view.querySelector('.ph-chatrow.sel')?.scrollIntoView({ block: 'nearest' });
  }
  openChat(st) {
    this.app = 'messages'; this.cur = st; st.unread = 0; this.sel = this.chats.indexOf(st);
    const c = this.view; const C = st.c;
    this._frameKey = 'chat|' + st.c.id;
    c.innerHTML = `<div class="ph-appview ph-chat"><div class="ph-nav ph-chatnav"><button class="ph-back">‹</button>
      <div class="ph-chathead"><span class="ph-av" style="background:${C.color}">${C.avatar}</span><b>${esc(C.name)}</b><small>${esc(C.sub)}</small><i class="ph-ai"></i></div><span>📹</span></div>
      <div class="ph-thread"></div><div class="ph-compose"></div></div>`;
    c.querySelector('.ph-back').onclick = () => this.openApp('messages');
    if (Nano.state === 'downloadable') Nano.download(); // the key press / tap that opened the chat counts as the user gesture
    this._renderThread(); this._renderCompose();
  }
  _bubble(m, st) {
    if (m.day) return `<div class="ph-day">${esc(m.day)}</div>`;
    if (m.typing) return `<div class="ph-msg them"><span class="ph-typing"><i></i><i></i><i></i></span></div>`;
    const me = m.who === 'me', name = st.c.group && !me ? `<small class="ph-from">${esc(m.who)}</small>` : '';
    const file = /^\[(檔案|圖片)\]/.test(m.text);
    return `<div class="ph-msg ${me ? 'me' : 'them'}">${name}<span class="${file ? 'file' : ''}">${esc(m.text)}</span>${m.time ? `<small class="ph-t">${m.time}</small>` : ''}</div>`;
  }
  _renderThread() {
    const st = this.cur; if (!st) return;
    const t = this.view.querySelector('.ph-thread');
    t.innerHTML = st.msgs.map(m => this._bubble(m, st)).join('') + (st.read ? '<div class="ph-read">已讀</div>' : '');
    t.scrollTop = t.scrollHeight;
  }
  // options for the next message: scripted rounds first; after those, Gemini Nano (Chrome) suggests two more forever
  _options(st) {
    const R = st.c.script[st.round];
    if (R) return R.choices;
    if (Nano.on && st.aiOpts?.length) return st.aiOpts.map(t => ({ t, ai: true }));
    return null;
  }
  _renderCompose() {
    const st = this.cur; if (!st) return;
    const box = this.view.querySelector('.ph-compose');
    const tag = this.view.querySelector('.ph-ai');
    if (tag) { tag.textContent = Nano.on ? '✨ Gemini Nano' : Nano.state === 'downloading' ? `⬇ AI ${Math.round(Nano.progress * 100)}%` : ''; }
    const opts = this._options(st);
    if (!opts) {
      if (Nano.on) {
        box.innerHTML = '<div class="ph-done">✨ Gemini Nano 正在想新話題…</div>';
        if (!st.busy) this._aiOpener(st);
      } else box.innerHTML = `<div class="ph-done">目前沒有新的話題了${Nano.state === 'downloading' ? '<br><small>AI 模型下載完成後就能無限聊天</small>' : ''}</div>`;
      return;
    }
    st.choice = Math.min(st.choice, opts.length - 1);
    box.innerHTML = `<div class="ph-choices">${opts.map((ch, i) => `<button class="ph-choice ${i === st.choice ? 'on' : ''}" data-i="${i}"><kbd>${i + 1}</kbd>${esc(ch.t)}</button>`).join('')}</div>
      <div class="ph-input"><span>${esc(opts[st.choice].t)}</span><button class="ph-send" ${st.busy ? 'disabled' : ''}>↑</button></div>
      <div class="ph-tabhint"><kbd>↑</kbd><kbd>↓</kbd> 或 <kbd>1</kbd><kbd>2</kbd> 選擇　<kbd>Tab</kbd> 傳送${Nano.on ? '　· ✨ AI 無限對話' : ''}</div>`;
    box.querySelectorAll('.ph-choice').forEach(b => b.onclick = () => this._pick(+b.dataset.i));
    box.querySelector('.ph-send').onclick = () => this._send();
    const t = this.view.querySelector('.ph-thread'); if (t) t.scrollTop = t.scrollHeight; // compose height changed
  }
  _pick(i) { if (!this.cur || this.cur.busy) return; const o = this._options(this.cur); if (!o) return; this.cur.choice = Math.min(i, o.length - 1); this._renderCompose(); }
  _send() {
    const st = this.cur; if (!st || st.busy) return;
    const opts = this._options(st); if (!opts) return;
    const ch = opts[st.choice], g = this.g;
    st.busy = true; st.read = false;
    st.msgs.push({ who: 'me', text: ch.t, time: hhmm(g.clock) });
    if (!ch.ai) st.round++;
    st.choice = 0; st.aiOpts = null;
    g.audio.blip?.();
    this._renderThread(); this._renderCompose();
    setTimeout(() => { st.read = true; if (this.cur === st) this._renderThread(); }, 350);
    const scripted = ch.r ? ch.r.map(r => Array.isArray(r) ? { who: r[0], text: r[1] } : { who: st.c.id, text: r }) : null;
    // votes: scripted choices carry their own; AI small talk gives +1 every 3 messages, up to 3 per contact
    let v = ch.v || 0;
    if (ch.ai) { st.aiSent = (st.aiSent || 0) + 1; if (st.aiSent % 3 === 0 && (st.aiVotes || 0) < 3) { st.aiVotes = (st.aiVotes || 0) + 1; v = 1; } }
    if (Nano.on) {
      // typing indicator while the on-device model thinks
      setTimeout(() => { if (st.busy && !st.msgs.some(m => m.typing)) { st.msgs.push({ typing: true }); if (this.cur === st) this._renderThread(); } }, 600);
      Nano.reply(st, ch.t).then(out => {
        st.aiOpts = out.options.length === 2 ? out.options : null;
        this._deliver(st, out.replies, v, 300);
      }).catch(() => {
        this._deliver(st, scripted || [{ who: st.c.group ? (st.members || ['柏宇'])[0] : st.c.id, text: this._filler() }], v, 300);
      });
    } else this._deliver(st, scripted || [{ who: st.c.id, text: this._filler() }], v, 650);
  }
  _filler() { const f = ['哈哈好啊', '收到 👍', '真的假的 😂', '好喔～', '有道理欸', '晚點再聊！']; return f[Math.floor(Math.random() * f.length)]; }
  // AI asks first when the scripted topics have run out
  _aiOpener(st) {
    st.busy = true;
    Nano.reply(st, null).then(out => {
      st.aiOpts = out.options.length === 2 ? out.options : ['最近在忙什麼？', '要不要一起吃宵夜？'];
      this._deliver(st, out.replies, 0, 200);
    }).catch(() => { st.aiOpts = ['最近在忙什麼？', '有空幫我宣傳一下嗎 🙏']; st.busy = false; if (this.cur === st) this._renderCompose(); });
  }
  // replies arrive one by one with a typing indicator; they land even if you leave the chat
  _deliver(st, replies, v, delay) {
    const g = this.g;
    const dropTyping = () => { const ti = st.msgs.findIndex(m => m.typing); if (ti >= 0) st.msgs.splice(ti, 1); };
    replies.forEach((rp, k) => {
      setTimeout(() => { dropTyping(); st.msgs.push({ typing: true }); if (this.cur === st) this._renderThread(); }, delay);
      delay += 600 + Math.min(1500, rp.text.length * 40);
      setTimeout(() => {
        dropTyping();
        st.msgs.push({ ...rp, time: hhmm(g.clock) });
        if (this.cur === st && this.open) this._renderThread(); else { st.unread++; if (!this.open) g.hud.toast(`📱 ${st.c.group ? rp.who : st.c.name}：${rp.text}`, 'good', 2200); }
        g.audio.pickup?.();
        if (k === replies.length - 1) {
          st.busy = false;
          if (this.cur === st) this._renderCompose();
          if (v) g.addVotes(v, `${st.c.group ? '競選小組' : st.c.name}幫你拉票 +${v} 票`);
        }
      }, delay);
      delay += 250;
    });
    if (!replies.length) { dropTyping(); st.busy = false; if (this.cur === st) { this._renderThread(); this._renderCompose(); } }
  }
}
