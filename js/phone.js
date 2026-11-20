// i-Piyan：遊戲裡的手機（仿 iPhone 介面，蘋果換成水蜜桃）。按 E（附近沒有其他互動時）開關。
// App：訊息（兩種回覆擇一，Tab 傳送）、相機、照片、Peach Pay 錢包、地圖、音樂、選情、天氣、麥當勞、設定。
import { CONTACTS } from './chats.js';
import { Nano } from './nano.js';

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
// Peachgram feed (all fictional classmates from the chats)
const FEED = [
  { who: '芷瑄', av: '🎨', color: '#ff9f5a', img: '🗳️', bg: 'linear-gradient(135deg,#ffd23f,#ff8a3d)', cap: '海報最終版完成！「資管要贏 票投彥霖」字有放大 💪 #資管34屆 #票投彥霖', likes: 128, time: '2 小時' },
  { who: '柏宇', av: '😎', color: '#9b8cff', img: '📋', bg: 'linear-gradient(135deg,#7f7fff,#43c6ac)', cap: '競選行程排好了，明天中午學餐、活動中心、二一鐘三點發傳單，缺人手私我', likes: 64, time: '3 小時' },
  { who: '小涵', av: '🐰', color: '#ff8fb1', img: '📚', bg: 'linear-gradient(135deg,#ffc3d8,#ff7eb3)', cap: '直屬學長的計概筆記救了我的期中 😭 學長當選！', likes: 211, time: '5 小時' },
  { who: '冠廷', av: '🏀', color: '#ff6b4a', img: '🏀', bg: 'linear-gradient(135deg,#ff9966,#ff5e62)', cap: '系籃練球完的宵夜，會長候選人請客 🍗 #系烤升級', likes: 97, time: '昨天' },
  { who: '阿凱', av: '🔥', color: '#ff5b5b', img: '📄', bg: 'linear-gradient(135deg,#f6d365,#fda085)', cap: '500 張傳單發完了！！手好痠 但值得', likes: 85, time: '昨天' },
  { who: '中原麥當勞', av: '🍟', color: '#ffbc0d', img: '🍔', bg: 'linear-gradient(135deg,#ffbc0d,#db0007)', cap: '期中考週大麥克套餐學生價！看到穿資管系服的店員記得說加油 😉', likes: 342, time: '2 天' },
  { who: '品妍', av: '📚', color: '#58c79b', img: '🌙', bg: 'linear-gradient(135deg,#30cfd0,#330867)', cap: '圖書館閉館前的最後一盞燈 📖 系學會可以爭取延長開放嗎', likes: 56, time: '3 天' },
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
const PCARD = [
  { t: '資管系會長只有一組候選人，投票率會過嗎？', b: '如題，上屆好像差點沒過門檻，大家記得去投票啊', n: 42, c: ['B1 有看到彥霖在活動中心發傳單 很拚', 'B2 系烤升級我投了', 'B3 投票率一定要過啦'] },
  { t: '【心得】中原麥當勞的店員超有效率', b: '下午點餐 30 秒就出餐，戴眼鏡的那位好像是資管的', n: 31, c: ['B1 那是彥霖吧 哈哈', 'B2 他在打工賺競選經費嗎'] },
  { t: '有人看到一台白色 JET SL 車牌 PYL 開頭的嗎', b: '昨天在中原夜市被一台超帥的 JET SL 超車，車主還跟我揮手', n: 18, c: ['B1 PYL0803 彥霖的車啦', 'B2 車主本人好像正在選系會長'] },
  { t: '校園裡的金色選票是什麼活動？', b: '走在路上撿到一張發光的金色選票，兩分鐘後又出現了 = =', n: 77, c: ['B1 我也撿到過', 'B2 據說收集 34 張有驚喜', 'B3 資管要贏！'] },
  { t: '求推薦中原附近宵夜', b: '期中考讀書讀到餓死', n: 25, c: ['B1 夜市雞排', 'B2 麥當勞 24 小時', 'B3 珍奶全糖給它喝下去'] },
];
const NOTES = [
  { t: '三大政見', d: '今天', b: '1. 系學會透明：帳目每月公開\n2. 課程回饋：每學期收集意見給系辦\n3. 系烤升級：更多肉、更多人、更多歡樂' },
  { t: '政見發表會講稿', d: '昨天', b: '大家好，我是資管系第34屆系學會會長候選人彥霖。\n資管要贏，票投彥霖！\n（記得不要超過五分鐘——柏宇）' },
  { t: '待辦', d: '週一', b: '☑ 登記參選\n☑ 印傳單 500 張\n☐ 撿齊 34 張金色選票\n☐ 麥當勞排班\n☐ 機車換機油' },
];
const CAL = { 3: '期中考週', 12: '系學會登記', 18: '政見發表會', 20: '拉票衝刺', 25: '投票日 🗳️', 28: '系烤' };
const DOCK = ['messages', 'camera', 'wallet', 'settings'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

export class Phone {
  constructor(game) {
    this.g = game; this.open = false; this.app = null; this.booted = false; this.sel = 0; this.homeSel = 0;
    this.photos = [];
    this.likes = new Set(); this.myPosts = []; this.bought = {}; this.orders = []; this.calcExpr = '';
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
  close() { this.open = false; this.el.classList.add('hidden'); this.app = null; this.cur = null; }
  _scale() { const s = Math.min(1, (innerHeight - 30) / 660, (innerWidth - 20) / 330); this.el.style.setProperty('--ps', s.toFixed(3)); }
  // keyboard while open; returns nothing, the game freezes the player meanwhile
  update(dt, inp) {
    this.el.querySelector('.ph-time').textContent = hhmm(this.g.clock);
    if (inp.hit('KeyE')) { this.close(); return 'closed'; }
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
    this.app = null; this.cur = null;
    const grid = APPS.filter(a => !DOCK.includes(a.id)), dock = DOCK.map(id => APPS.find(a => a.id === id));
    this._order = [...grid, ...dock].map(a => a.id);
    const icon = (a) => {
      const badge = a.id === 'messages' && this.unreadTotal ? `<b class="ph-badge">${this.unreadTotal}</b>` : '';
      return `<button class="ph-app" data-app="${a.id}"><span class="ph-ico" style="background:${a.bg}">${a.icon}${badge}</span><span class="ph-lbl">${a.name}</span></button>`;
    };
    const day = this.g.night > 0.5;
    this.view.innerHTML = `<div class="ph-home ${day ? 'night' : ''}">
      <div class="ph-widget"><div class="ph-w-time">${hhmm(this.g.clock)}</div><div class="ph-w-sub">${this._dateStr()} · 中壢 ${this._temp()}°</div>
        <div class="ph-w-row">🗳 ${this.g.votes} 票　💰 NT$ ${this.g.money}</div></div>
      <div class="ph-grid">${grid.map(icon).join('')}</div>
      <div class="ph-dots"><i class="on"></i><i></i></div>
      <div class="ph-dock">${dock.map(a => icon(a).replace(/<span class="ph-lbl">.*?<\/span>/, '')).join('')}</div></div>`;
    for (const b of this.view.querySelectorAll('.ph-app')) b.onclick = () => this.openApp(b.dataset.app);
    this._homeSel(Math.min(this.homeSel, this._order.length - 1));
  }
  _homeSel(i) {
    this.homeSel = Math.max(0, Math.min(this._order.length - 1, i));
    this.view.querySelectorAll('.ph-app').forEach((b, k) => b.classList.toggle('sel', k === this.homeSel));
  }
  _dateStr() { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`; }
  _temp() { return Math.round(this.g.night > 0.5 ? 19 : 24 + Math.sin((this.g.clock % 1440) / 1440 * Math.PI) * 3); }
  _frame(title, body, opt = {}) {
    this.view.innerHTML = `<div class="ph-appview ${opt.cls || ''}"><div class="ph-nav"><button class="ph-back">‹ ${esc(opt.back || '主畫面')}</button><b>${esc(title)}</b><span>${opt.right || ''}</span></div><div class="ph-content">${body}</div></div>`;
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
  _gram(tab = 'feed') {
    const g = this.g;
    const post = (p, k) => {
      const liked = this.likes.has(k), likes = p.likes + (liked ? 1 : 0);
      const img = p.photo ? `<img src="${p.photo}">` : `<div class="pg-art" style="background:${p.bg}">${p.img}</div>`;
      return `<div class="pg-post"><div class="pg-head"><span class="ph-av" style="background:${p.color}">${p.av}</span><b>${esc(p.who)}</b><small>${p.time}</small></div>
        <div class="pg-img" data-k="${k}">${img}</div>
        <div class="pg-bar"><button class="pg-like ${liked ? 'on' : ''}" data-k="${k}">${liked ? '❤️' : '🤍'}</button><span>💬</span><span>📤</span></div>
        <div class="pg-cap"><b>${likes} 個讚</b><br><b>${esc(p.who)}</b> ${esc(p.cap)}</div></div>`;
    };
    const mine = this.myPosts.map(p => ({ who: 'yanlin_im34', av: '彥', color: '#ffd23f', photo: p.photo, cap: p.cap, likes: p.likes, time: '剛剛' }));
    let body;
    if (tab === 'feed') body = `<div class="pg-stories">${FEED.slice(0, 6).map(p => `<div><span class="ph-av" style="background:${p.color}">${p.av}</span><small>${esc(p.who)}</small></div>`).join('')}</div>
      ${[...mine.map((p, i) => post(p, 'm' + i)), ...FEED.map((p, i) => post(p, 'f' + i))].join('')}`;
    else {
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
    const like = k => { this.likes.has(k) ? this.likes.delete(k) : this.likes.add(k); g.audio.pop?.(); const y = c.scrollTop; this._gram(tab); this.view.querySelector('.ph-content').scrollTop = y; };
    c.querySelectorAll('.pg-like').forEach(b => b.onclick = () => like(b.dataset.k));
    c.querySelectorAll('.pg-img').forEach(b => b.ondblclick = () => { if (!this.likes.has(b.dataset.k)) like(b.dataset.k); });
    c.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      const n = this.myPosts.length;
      this.myPosts.unshift({ photo: this.photos[0], cap: CAPTIONS[+b.dataset.c], likes: 40 + Math.floor(Math.random() * 120) });
      g.audio.pickup?.();
      if (n < 3) g.addVotes(2, `Peachgram 貼文爆紅 +2 票`); else g.hud.toast('貼文發佈成功 📸', 'good', 1500);
      this._gram('feed');
    });
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
    const c = this._frame('中原大學 Pcard', `<div class="pc-board">🏫 中原大學板 · 熱門</div>${PCARD.map((p, i) => `<button class="pc-post" data-i="${i}"><b>${esc(p.t)}</b><small>${esc(p.b)}</small><span>❤️ ${p.n}　💬 ${p.c.length}</span></button>`).join('')}`, { cls: 'ph-pcard' });
    c.querySelectorAll('.pc-post').forEach(b => b.onclick = () => {
      const p = PCARD[+b.dataset.i];
      this._frame('文章', `<div class="pc-full"><small>匿名 · 中原大學</small><b>${esc(p.t)}</b><p>${esc(p.b)}</p><span>❤️ ${p.n}</span></div>
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
