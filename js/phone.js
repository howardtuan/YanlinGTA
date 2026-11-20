// i-Piyan：遊戲裡的手機（仿 iPhone 介面，蘋果換成水蜜桃）。按 E（附近沒有其他互動時）開關。
// App：訊息（兩種回覆擇一，Tab 傳送）、相機、照片、Peach Pay 錢包、地圖、音樂、選情、天氣、麥當勞、設定。
import { CONTACTS } from './chats.js';

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
];
const DOCK = ['messages', 'camera', 'wallet', 'settings'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

export class Phone {
  constructor(game) {
    this.g = game; this.open = false; this.app = null; this.booted = false; this.sel = 0; this.homeSel = 0;
    this.photos = [];
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
    if (id === 'settings') {
      const c = this._frame('設定', `<div class="ph-prof"><span>彥</span><div><b>彥霖</b><small>Peach ID、iCloud+、媒體與購買項目</small></div></div>
        <div class="ph-sec">一般</div>
        <button class="ph-row" id="phAbout"><span>關於本機</span><b>›</b></button>
        <div class="ph-row"><span>Wi-Fi</span><b>CYCU-WiFi</b></div>
        <div class="ph-row"><span>藍牙</span><b>開啟</b></div>
        <div class="ph-row"><span>電池</span><b>87%</b></div>`);
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
      <div class="ph-chathead"><span class="ph-av" style="background:${C.color}">${C.avatar}</span><b>${esc(C.name)}</b><small>${esc(C.sub)}</small></div><span>📹</span></div>
      <div class="ph-thread"></div><div class="ph-compose"></div></div>`;
    c.querySelector('.ph-back').onclick = () => this.openApp('messages');
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
  _renderCompose() {
    const st = this.cur; if (!st) return;
    const box = this.view.querySelector('.ph-compose');
    const R = st.c.script[st.round];
    if (!R) { box.innerHTML = '<div class="ph-done">目前沒有新的話題了</div>'; return; }
    box.innerHTML = `<div class="ph-choices">${R.choices.map((ch, i) => `<button class="ph-choice ${i === st.choice ? 'on' : ''}" data-i="${i}"><kbd>${i + 1}</kbd>${esc(ch.t)}</button>`).join('')}</div>
      <div class="ph-input"><span>${esc(R.choices[st.choice].t)}</span><button class="ph-send" ${st.busy ? 'disabled' : ''}>↑</button></div>
      <div class="ph-tabhint"><kbd>↑</kbd><kbd>↓</kbd> 或 <kbd>1</kbd><kbd>2</kbd> 選擇　<kbd>Tab</kbd> 傳送</div>`;
    box.querySelectorAll('.ph-choice').forEach(b => b.onclick = () => this._pick(+b.dataset.i));
    box.querySelector('.ph-send').onclick = () => this._send();
  }
  _pick(i) { if (!this.cur || this.cur.busy) return; this.cur.choice = i; this._renderCompose(); }
  _send() {
    const st = this.cur; if (!st || st.busy) return;
    const R = st.c.script[st.round]; if (!R) return;
    const ch = R.choices[st.choice], g = this.g;
    st.busy = true; st.read = false;
    st.msgs.push({ who: 'me', text: ch.t, time: hhmm(g.clock) });
    st.round++; st.choice = 0;
    g.audio.blip?.();
    this._renderThread(); this._renderCompose();
    // replies arrive one by one with a typing indicator; they land even if you leave the chat
    const replies = ch.r.map(r => Array.isArray(r) ? { who: r[0], text: r[1] } : { who: st.c.id, text: r });
    let delay = 650;
    setTimeout(() => { st.read = true; if (this.cur === st) this._renderThread(); }, 350);
    replies.forEach((rp, k) => {
      setTimeout(() => { st.msgs.push({ typing: true }); if (this.cur === st) this._renderThread(); }, delay);
      delay += 700 + Math.min(1600, rp.text.length * 45);
      setTimeout(() => {
        const ti = st.msgs.findIndex(m => m.typing); if (ti >= 0) st.msgs.splice(ti, 1);
        st.msgs.push({ ...rp, time: hhmm(g.clock) });
        if (this.cur === st && this.open) this._renderThread(); else { st.unread++; if (!this.open) g.hud.toast(`📱 ${st.c.group ? rp.who : st.c.name}：${rp.text}`, 'good', 2200); }
        g.audio.pickup?.();
        if (k === replies.length - 1) {
          st.busy = false;
          if (this.cur === st) this._renderCompose();
          if (ch.v) g.addVotes(ch.v, `${st.c.group ? '競選小組' : st.c.name}幫你拉票 +${ch.v} 票`);
        }
      }, delay);
      delay += 250;
    });
  }
}
