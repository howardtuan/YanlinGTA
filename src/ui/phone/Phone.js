// i-Piyan：遊戲裡的手機（仿 iPhone 介面，蘋果換成水蜜桃）。按 E（附近沒有其他互動時）開關。
// App：訊息（兩種回覆擇一，Tab 傳送）、相機、照片、Peach Pay 錢包、地圖、音樂、選情、天氣、麥當勞、設定。
import { stockUI } from './StockUI.js';
import { newsUI } from './NewsUI.js';
import { locateUI } from '../../world/Locate.js';
import { RIDE_PLACES } from '../../systems/minigames/PinHanRide.js';
import { CONTACTS } from './Chats.js';
import { Nano } from './Nano.js';
import { insultsLaoda } from '../../systems/LaodaInsult.js';
import { dual } from '../Prompts.js';
import { PEOPLE, FEED, STORY_SETS, STORY_TIMES, FRIEND_ONLY, PCARD } from './Feeds.js';
import { START, slotAt, nextIndex, gramPost, pcardPost, postsUpTo } from './FeedGen.js';
import { loadPhotos, savePhotos, MAX_PHOTOS } from '../../systems/PhotoStore.js';

const PEACH = (fill = '#fff') => `<svg viewBox="0 0 64 64" class="peach-logo" aria-hidden="true">
  <path d="M32 19c-3-3-8-5-13-4C10 17 5 25 6 35c1 13 12 23 26 23s25-10 26-23c1-10-4-18-13-20-5-1-10 1-13 4z" fill="${fill}"/>
  <path d="M32 20c3 9 3 24-3 37" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M33 17c1-7 8-12 17-11-1 8-8 12-17 11z" fill="${fill}"/>
  <path d="M31 18c-1-4-1-7 1-10" fill="none" stroke="${fill}" stroke-width="2.4" stroke-linecap="round"/></svg>`;

const APPS = [
  { id: 'messages', name: '訊息', icon: '💬', bg: 'linear-gradient(#6af07e,#20c23f)' },
  // first on the home screen's first page
  {
    id: 'garage',
    name: '呼叫載具',
    icon: '🚁',
    bg: 'linear-gradient(#ffd23f,#ff9f0a)',
    noArt: true,
  },
  { id: 'missions', name: '任務', icon: '📋', bg: 'linear-gradient(#7aa7ff,#2f6bff)', noArt: true },
  { id: 'stock', name: '靈感股', icon: '📈', bg: 'linear-gradient(#ff6b6b,#c81e2a)', noArt: true },
  { id: 'news', name: 'PYtoday', icon: '📰', bg: 'linear-gradient(#ff3b3b,#1a1a1a)', noArt: true },
  { id: 'locate', name: '定位', icon: '📍', bg: 'linear-gradient(#5ac8fa,#007aff)', noArt: true }, // friends on a map (src/world/Locate.js)
  // 漢堡車: 品漢堡 drives you somewhere once a day; installed when you have got him a car (src/systems/minigames/PinHanRide.js)
  {
    id: 'burger',
    name: '漢堡車',
    icon: '🍔',
    bg: 'linear-gradient(#ffd27a,#e8892b)',
    noArt: true,
    need: (g) => g.pinhanRide?.installed,
  },
  { id: 'drone', name: '無人機', icon: '🛸', bg: 'linear-gradient(#3a4256,#0d111a)', noArt: true }, // connects to 彥霖's drone (src/entities/Drone.js)
  { id: 'tix', name: '皮元系統', icon: '🎫', bg: 'linear-gradient(#ff4fa3,#7b5bff)', noArt: true }, // 演唱會 (src/systems/minigames/Concert.js)
  { id: 'camera', name: '相機', icon: '📷', bg: 'linear-gradient(#d9d9de,#9a9aa2)' },
  { id: 'photos', name: '照片', icon: '🌸', bg: 'linear-gradient(#fff,#f0f0f0)' },
  { id: 'wallet', name: 'Peach Pay', icon: '💳', bg: 'linear-gradient(#ffb38a,#ff6f61)' },
  { id: 'map', name: '地圖', icon: '🗺️', bg: 'linear-gradient(#bfe9a8,#6cc070)' },
  { id: 'music', name: '音樂', icon: '🎵', bg: 'linear-gradient(#ff6b8b,#fa2d55)' },
  { id: 'votes', name: '選情', icon: '🗳️', bg: 'linear-gradient(#ffe27a,#ffbf1f)' },
  { id: 'weather', name: '天氣', icon: '⛅', bg: 'linear-gradient(#5fb4ff,#2a6fe0)' },
  { id: 'mcd', name: '麥當勞', icon: '🍟', bg: 'linear-gradient(#e7313b,#c8102e)' },
  { id: 'settings', name: '設定', icon: '⚙️', bg: 'linear-gradient(#a7acb4,#6c7179)' },
  {
    id: 'gram',
    name: 'Peachgram',
    icon: '📸',
    bg: 'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf)',
  },
  { id: 'shop', name: '桃寶購物', icon: '🛍️', bg: 'linear-gradient(#ff9a3c,#ff5b1f)' },
  { id: 'pcard', name: 'Pcard', icon: '🗨️', bg: 'linear-gradient(#3fa9f5,#006aa6)' },
  {
    id: 'notes',
    name: '備忘錄',
    icon: '📝',
    bg: 'linear-gradient(#fff 0 22%,#ffd60a 22% 26%,#fff 26%)',
  },
  { id: 'calendar', name: '行事曆', icon: '📅', bg: 'linear-gradient(#fff,#f2f2f2)' },
  { id: 'calc', name: '計算機', icon: '🧮', bg: 'linear-gradient(#3a3a3c,#1c1c1e)' },
  { id: 'clock', name: '時鐘', icon: '⏰', bg: 'linear-gradient(#2c2c2e,#000)' },
];
const CAPTIONS = [
  '資管要贏！票投彥霖 🗳️',
  '今天也在中原努力拉票中 🛵',
  '謝謝每一位支持我的同學 🙏',
  '系烤升級，說到做到 🔥',
];
// 桃寶購物：effects are applied by the phone (votes / sprint boost / just fun)
const SHOP = [
  {
    id: 'energy',
    name: '能量飲料',
    icon: '🥤',
    price: 45,
    desc: '衝刺速度 +30%，持續 60 秒',
    boost: 60,
  },
  {
    id: 'boba',
    name: '珍珠奶茶 全糖',
    icon: '🧋',
    price: 60,
    desc: '衝刺速度 +30%，持續 90 秒',
    boost: 90,
  },
  {
    id: 'flyer',
    name: '加印傳單 500 張',
    icon: '📄',
    price: 200,
    desc: '交給競選團隊發，+3 票（最多 3 次）',
    votes: 3,
    max: 3,
  },
  {
    id: 'chicken',
    name: '雞排請全組',
    icon: '🍗',
    price: 300,
    desc: '競選小組士氣大增，+4 票',
    votes: 4,
    max: 1,
  },
  {
    id: 'tee',
    name: '競選 T 恤',
    icon: '👕',
    price: 350,
    desc: '「資管要贏」系服，穿出去 +5 票',
    votes: 5,
    max: 1,
  },
  {
    id: 'mega',
    name: '擴音大聲公',
    icon: '📣',
    price: 480,
    desc: '政見全校都聽得到，+8 票',
    votes: 8,
    max: 1,
  },
  {
    id: 'case',
    name: '水蜜桃手機殼',
    icon: '🍑',
    price: 199,
    desc: 'i-Piyan 15 Pro 專用，粉嫩可愛',
    max: 1,
  },
  {
    id: 'helmet',
    name: 'JAT SM 安全帽',
    icon: '⛑️',
    price: 890,
    desc: '極地白配色，騎車安全第一',
    max: 1,
  },
];
const NOTES = [
  {
    t: '三大政見',
    d: '今天',
    b: '1. 系學會透明：帳目每月公開\n2. 課程回饋：每學期收集意見給系辦\n3. 系烤升級：更多肉、更多人、更多歡樂',
  },
  {
    t: '政見發表會講稿',
    d: '昨天',
    b: '大家好，我是資管系第34屆系學會會長候選人彥霖。\n資管要贏，票投彥霖！\n（記得不要超過五分鐘）',
  },
  {
    t: '待辦',
    d: '週一',
    b: '☑ 登記參選\n☑ 印傳單 500 張\n☐ 撿齊 34 張金色選票\n☐ 麥當勞排班\n☐ 機車換機油',
  },
];
const CAL = {
  3: '期中考週',
  12: '系學會登記',
  18: '政見發表會',
  20: '拉票衝刺',
  25: '投票日 🗳️',
  28: '系烤',
};
// home-screen icon artwork (assets/phone/<id>.webp, generated with Qwen-Image); preloaded so the emoji doesn't flash first
const ICON_DIR = 'assets/phone/';
const ICON_ART = new Set(APPS.filter((a) => !a.noArt).map((a) => a.id));
const ICON_FAIL = new Set();
for (const id of ICON_ART) {
  const im = new Image();
  im.onerror = () => ICON_FAIL.add(id);
  im.src = `${ICON_DIR}${id}.webp`;
}
const DOCK = ['messages', 'camera', 'wallet', 'settings'];
const PAGE1 = 8;
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
// a promise that gives up after ms (the on-device AI can stall)
// last-resort fallback for an AI reply; src/ui/phone/Nano.js gives up earlier itself (session 40 s + prompt 25 s)
const REPLY_LIMIT = 70000;
const withTimeout = (p, ms) =>
  Promise.race([
    p,
    new Promise((_, no) => {
      setTimeout(() => no(new Error('timeout')), ms);
    }),
  ]);
const hhmm = (m) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// What a chat message you send counts as (Phone._send): a picked option, or your own words (typed: AI chats only).
// Typed words that are exactly an option's (with the AI on, picking an option only puts its words in the typing box)
// are that option: a scripted one keeps its written reply, votes and moves the script on, and an `always` option
// with ask() still acts (吱吱's 回絕 starts the 武嶺 quest's call, src/systems/quests/ZzInjury.js). Otherwise an
// `always` option whose `match` fits answers them, else they go to the AI. null: nothing to send.
export function pickSent(opts, always, typed, choice) {
  if (!typed) return opts?.[choice] || null; // (choice may be the typing box: nothing to send)
  const same = (opts || []).find((o) => !o.ai && (o.r || o.ask) && o.t.trim() === typed.trim());
  if (same) return same;
  const m = (always || []).find((a) => a.match?.test(typed));
  return m ? { ...m, t: typed } : { t: typed, ai: true, typed: true };
}

export class Phone {
  constructor(game) {
    this.g = game;
    this.open = false;
    this.app = null;
    this.booted = false;
    this.sel = 0;
    this.homeSel = 0;
    this.photos = [];
    // photos are kept in IndexedDB (src/systems/PhotoStore.js); ones taken before the load finishes stay in front
    loadPhotos().then((saved) => {
      this.photos = [...this.photos, ...saved].slice(0, MAX_PHOTOS);
      if (this.open && this.app === 'photos') this._photos();
    });
    this.likes = new Set();
    this.myPosts = [];
    this.bought = {};
    this.orders = [];
    this.calcExpr = '';
    // social feeds: timestamps are game-clock minutes; posts come on a fixed schedule (src/ui/phone/FeedGen.js, tick)
    this.syncFeeds();
    this.storySeen = new Set(); // ids of stories already watched ('名字|日|0或1')
    this.friends = new Set(); // friend ids (src/ui/phone/Friends.js): their chats and Peachgram show up
    this.fresh = { gram: 0, pcard: 0 };
    this.page = 0;
    Nano.init();
    Nano.listeners.add(() => {
      if (!this.open) return;
      if (this.cur && !this.cur.busy) this._renderCompose();
      else if (this.app === 'settings' && !this.cur) {
        const r = this.view.querySelector('#phAI small');
        if (r) r.textContent = Nano.label();
      }
    });
    // chat state: rounds advance as you reply; history becomes the live thread
    this.chats = CONTACTS.map((c) => ({
      c,
      round: 0,
      choice: 0,
      msgs: c.history.map((h) =>
        Array.isArray(h) ? { who: h[0], text: h[1], time: h[2] } : { day: h.day }
      ),
      unread: c.unread || 0,
      busy: false,
    }));
    this.cur = null;
    const el = (this.el = document.createElement('div'));
    el.id = 'phone';
    el.className = 'hidden';
    el.innerHTML = `<div class="ph-body"><div class="ph-screen">
      <div class="ph-status"><span class="ph-time">17:30</span><span class="ph-island"></span><span class="ph-icons">▂▄▆ <b>5G</b> <i class="ph-batt"><i></i></i></span></div>
      <div class="ph-view"></div>
      <div class="ph-boot hidden">${PEACH()}</div>
    </div><button class="ph-homebtn" title="Home 鍵（回主畫面）" aria-label="Home"><i></i></button><div class="ph-btn ph-btn-a"></div><div class="ph-btn ph-btn-b"></div><div class="ph-btn ph-btn-c"></div></div>
    <div class="ph-hint"><kbd>E</kbd> 收起手機 · <kbd>Esc</kbd> 返回</div>`;
    document.getElementById('app').appendChild(el);
    this.view = el.querySelector('.ph-view');
    // Home key: in an app -> home screen; on page 2 -> page 1; on page 1 -> put the phone away
    el.querySelector('.ph-homebtn').onclick = () => {
      this.g.audio.tap?.();
      if (this.story) this._storyClose();
      if (this.app) this.home();
      else if (this.page > 0) this._setPage(0);
      else this.close();
    };
    addEventListener('resize', () => this._scale());
  }
  get unreadTotal() {
    return this.chats.reduce((s, c) => s + c.unread, 0);
  }
  toggle() {
    this.open ? this.close() : this.show();
  }
  show() {
    this.open = true;
    this.el.classList.remove('hidden');
    this._scale();
    this.g.audio.phone?.(true, !this.booted);
    if (!this.booted) {
      this.booted = true;
      const b = this.el.querySelector('.ph-boot');
      b.classList.remove('hidden');
      setTimeout(() => b.classList.add('hidden'), 900);
    }
    // pick up where you left off: the app (and chat) that was on screen when the phone went away
    const last = this._last;
    this._last = null;
    if (this.call) {
      this._callView();
      return;
    }
    if (last && last.app && last.app !== 'map') {
      this.openApp(last.app);
      if (last.cur && last.app === 'messages') this.openChat(last.cur);
    } else this.home();
  }
  close() {
    if (this.call && !this._ending) this._callEnd(this.call.state === 'ring'); // put away while it rings = declined; mid-call = hung up
    if (this.open) this.g.audio.phone?.(false);
    if (this.story) this._storyClose();
    this._last = this.app ? { app: this.app, cur: this.cur } : null;
    this.open = false;
    this.el.classList.add('hidden');
    this.app = null;
    this.cur = null;
    this._frameKey = null;
  }
  _scale() {
    const s = Math.min(1, (innerHeight - 30) / 660, (innerWidth - 20) / 330);
    this.el.style.setProperty('--ps', s.toFixed(3));
  }
  // keyboard while open; returns nothing, the game freezes the player meanwhile
  update(dt, inp) {
    this.el.querySelector('.ph-time').textContent = hhmm(this.g.clock);
    if (this.call) return this._callKeys(inp);
    if (inp.hit('KeyE')) {
      this.close();
      return 'closed';
    }
    if (this.story) {
      if (inp.hit('Escape', 'Backspace')) {
        this._storyClose();
        return null;
      }
      if (inp.hit('ArrowRight', 'Space', 'Enter')) this._storyGo(1);
      if (inp.hit('ArrowLeft')) this._storyGo(-1);
      if (inp.hit('KeyE')) {
        this._storyClose();
        this.close();
        return 'closed';
      }
      return null;
    }
    if (inp.hit('Escape', 'Backspace')) {
      if (this.cur) this.openApp('messages');
      else if (this.app) this.home();
      else this.close();
      return this.open ? null : 'closed';
    }
    if (this.cur) {
      const st = this.cur;
      // with the AI on, the typing box is one more item after the options (index = number of options)
      const nOpt = (this._options(st)?.length || 0) + (this._typing(st) ? 1 : 0) || 2;
      for (let k = 0; k < 4; k++) if (inp.hit(`Digit${k + 1}`, `Numpad${k + 1}`)) this._pick(k);
      if (inp.hit('ArrowUp', 'ArrowLeft')) this._pick(Math.max(0, st.choice - 1));
      if (inp.hit('ArrowDown', 'ArrowRight')) this._pick(Math.min(nOpt - 1, st.choice + 1));
      if (inp.hit('Tab', 'Enter')) {
        if (this._typing(st) && st.choice >= (this._options(st)?.length || 0)) this._focusType();
        else this._send();
      }
    } else if (!this.app) {
      // grid then dock share one selection order
      if (inp.hit('ArrowRight')) this._homeSel(this.homeSel + 1);
      if (inp.hit('ArrowLeft')) this._homeSel(this.homeSel - 1);
      if (inp.hit('ArrowDown')) this._homeSel(this.homeSel + 4);
      if (inp.hit('ArrowUp')) this._homeSel(this.homeSel - 4);
      if (inp.hit('Enter', 'Space')) this.openApp(this._order[this.homeSel]);
    } else if ((this.app === 'gram' || this.app === 'pcard') && inp.hit('KeyR')) {
      this._refresh();
    } else if (this.app === 'messages') {
      if (inp.hit('ArrowDown')) this._listSel(this.sel + 1);
      if (inp.hit('ArrowUp')) this._listSel(this.sel - 1);
      if (inp.hit('Enter', 'Tab')) this.openChat(this.chats[this.sel]);
    }
    return null;
  }

  // ---------------- home screen ----------------
  home() {
    this.app = null;
    this.cur = null;
    this._frameKey = null;
    const shown = APPS.filter((a) => !a.need || a.need(this.g)), // apps you have to install first
      grid = shown.filter((a) => !DOCK.includes(a.id)),
      dock = DOCK.map((id) => APPS.find((a) => a.id === id));
    const pages = [grid.slice(0, PAGE1), grid.slice(PAGE1)];
    this._pageStart = [0, PAGE1, grid.length];
    this._order = [...grid, ...dock].map((a) => a.id);
    const badgeN = (id) =>
      id === 'messages'
        ? this.unreadTotal
        : id === 'gram'
          ? this.fresh.gram
          : id === 'pcard'
            ? this.fresh.pcard
            : id === 'news'
              ? this.g.news?.unread || 0
              : 0;
    const icon = (a) => {
      const n = badgeN(a.id),
        badge = n ? `<b class="ph-badge">${n}</b>` : '';
      // generated artwork covers the emoji + gradient; if the image fails it removes itself and the emoji shows
      const art =
        ICON_ART.has(a.id) && !ICON_FAIL.has(a.id)
          ? `<img class="ph-ico-img" src="${ICON_DIR}${a.id}.webp" alt="" draggable="false" onerror="this.remove()">`
          : '';
      return `<button class="ph-app" data-app="${a.id}"><span class="ph-ico" style="background:${a.bg}">${a.icon}${art}${badge}</span><span class="ph-lbl">${a.name}</span></button>`;
    };
    const night = this.g.night > 0.5,
      last = this.feed[0];
    this.view.innerHTML = `<div class="ph-home ${night ? 'night' : ''}">
      <div class="ph-pages"><div class="ph-track">
        <div class="ph-page"><div class="ph-widget"><div class="ph-w-time">${hhmm(this.g.clock)}</div><div class="ph-w-sub">${this._dateStr()} · 中壢 ${this._temp()}°</div>
          <div class="ph-w-row">🗳 ${this.g.votes} 票　💰 NT$ ${this.g.money}</div></div>
          <div class="ph-grid">${pages[0].map(icon).join('')}</div></div>
        <div class="ph-page"><div class="ph-grid">${pages[1].map(icon).join('')}</div>
          ${last ? `<button class="ph-wgram" data-app="gram"><img src="${last.img}" alt=""><span><small>Peachgram · ${esc(last.who)}</small>${esc(last.cap)}</span></button>` : ''}</div>
      </div></div>
      <div class="ph-dots">${pages.map((_, k) => `<i data-p="${k}"></i>`).join('')}</div>
      <div class="ph-dock">${dock.map((a) => icon(a).replace(/<span class="ph-lbl">.*?<\/span>/, '')).join('')}</div></div>`;
    for (const b of this.view.querySelectorAll('[data-app]'))
      b.onclick = () => {
        if (!this._dragged) this.openApp(b.dataset.app);
      };
    for (const d of this.view.querySelectorAll('.ph-dots i'))
      d.onclick = () => this._setPage(+d.dataset.p);
    this._swipe(this.view.querySelector('.ph-pages'), pages.length);
    this._setPage(this.page, true);
    this._homeSel(Math.min(this.homeSel, this._order.length - 1), false);
  }
  // drag / swipe / trackpad sideways scroll between home pages
  _swipe(el, n) {
    const track = el.querySelector('.ph-track');
    let x0 = null,
      dx = 0,
      id = null;
    el.onpointerdown = (e) => {
      x0 = e.clientX;
      dx = 0;
      id = e.pointerId;
      this._dragged = false;
      track.style.transition = 'none';
    };
    el.onpointermove = (e) => {
      if (x0 === null || e.pointerId !== id) return;
      dx = (e.clientX - x0) / (parseFloat(getComputedStyle(this.el).getPropertyValue('--ps')) || 1);
      if (Math.abs(dx) > 6 && !this._dragged) {
        this._dragged = true;
        try {
          el.setPointerCapture(id);
        } catch (er) {}
      }
      if (this._dragged) {
        const edge = (this.page === 0 && dx > 0) || (this.page === n - 1 && dx < 0) ? 0.3 : 1;
        track.style.transform = `translateX(calc(${-this.page * 100}% + ${dx * edge}px))`;
      }
    };
    const end = () => {
      if (x0 === null) return;
      x0 = null;
      track.style.transition = '';
      if (this._dragged && Math.abs(dx) > 45) this._setPage(this.page + (dx < 0 ? 1 : -1));
      else this._setPage(this.page);
      setTimeout(() => {
        this._dragged = false;
      }, 0); // the click after a drag must not open an app
    };
    el.onpointerup = end;
    el.onpointercancel = end;
    let wheelT = 0;
    el.onwheel = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.6 && !e.shiftKey) return;
      const now = performance.now();
      if (now - wheelT < 450) return;
      wheelT = now;
      this._setPage(this.page + ((e.deltaX || e.deltaY) > 0 ? 1 : -1));
    };
  }
  // fromSel: called by _homeSel (the keyboard selection already sits on this page)
  _setPage(p, instant, fromSel = false) {
    const n = this._pageStart.length - 1;
    this.page = Math.max(0, Math.min(n - 1, p));
    // swiping / dots / Home key: the keyboard selection moves to the page you are on, so a redraw of the home
    // screen (which re-applies the selection) can't flip you back to the other page
    const st = this._pageStart;
    if (
      !fromSel &&
      this.homeSel < st[st.length - 1] &&
      (this.homeSel < st[this.page] || this.homeSel >= st[this.page + 1])
    ) {
      this.homeSel = st[this.page];
      this.view
        .querySelectorAll('.ph-app')
        .forEach((b, k) => b.classList.toggle('sel', k === this.homeSel));
    }
    const track = this.view.querySelector('.ph-track');
    if (!track) return;
    if (instant) track.style.transition = 'none';
    track.style.transform = `translateX(${-this.page * 100}%)`;
    if (instant) {
      void track.offsetWidth;
      track.style.transition = '';
    }
    this.view
      .querySelectorAll('.ph-dots i')
      .forEach((d, k) => d.classList.toggle('on', k === this.page));
  }
  _homeSel(i, follow = true) {
    this.homeSel = Math.max(0, Math.min(this._order.length - 1, i));
    this.view
      .querySelectorAll('.ph-app')
      .forEach((b, k) => b.classList.toggle('sel', k === this.homeSel));
    // keyboard selection on a grid icon flips to its page (dock icons stay on the current page)
    const st = this._pageStart;
    if (follow && this.homeSel < st[st.length - 1]) {
      const pg = this.homeSel < st[1] ? 0 : 1;
      if (pg !== this.page) this._setPage(pg, false, true);
    }
  }
  _dateStr() {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`;
  }
  _temp() {
    return Math.round(
      this.g.night > 0.5 ? 19 : 24 + Math.sin(((this.g.clock % 1440) / 1440) * Math.PI) * 3
    );
  }
  // ---------------- 🛸 無人機 (src/entities/Drone.js) ----------------
  // the app only shows the drone; the take-off waits for the button (and the phone never comes back with the drone
  // already flying: putting the phone away from here forgets this app)
  _drone() {
    const g = this.g,
      D = g.drone,
      busy = D.active,
      pl = g.player;
    const why = busy ? '飛行中' : pl.vehicle ? '先下車才能起飛' : '已配對 · 電量 100%';
    const c = this._frame(
      '無人機',
      `<div class="ph-garage">
        <div class="ph-gcard"><span>🛸</span><div><b>彥霖的無人機</b><small>${why}</small></div></div>
        <button class="ph-gbtn ph-dbtn" ${busy || pl.vehicle ? 'disabled' : ''}>🥽 戴上 VR 眼鏡・連線並起飛</button>
        <div class="ph-note">無人機會從你頭上起飛，用第一人稱視角自由飛行，最高時速 100 km/h。<br>W A S D 移動、滑鼠轉向、Space 上升、Shift／C 下降、F 結束飛行。</div>
      </div>`
    );
    c.querySelector('.ph-dbtn').onclick = () => {
      const err = D.start();
      if (err) {
        g.hud.toast(err, 'bad', 2400);
        return;
      }
      this.app = null;
      this._last = null;
      if (this.open) {
        this.close();
        this._last = null;
      }
      g.lockPointer?.();
      g.hud.toast('🛸 正在連線到無人機……', 'good', 1800);
    };
  }
  // ---------------- 呼叫載具 ----------------
  // your JAT SM, and after 霍華德's Two Sum (src/systems/quests/HowardTwoSum.js) his black 忍 400 too
  _garage() {
    const g = this.g,
      p = g.player.worldPos(),
      busy = g.airdrop?.busy,
      H = g.howard;
    const card = (key, v, icon, name, sub) => {
      const riding = g.player.vehicle === v,
        d = v ? Math.round(Math.hypot(v.pos.x - p.x, v.pos.z - p.z)) : 0,
        out = key === 'ninja' && H?.mode === 'ride';
      const st = riding
        ? '騎乘中'
        : busy && g.airdrop.run?.v === v
          ? '空投中…'
          : out
            ? '霍華德騎出去兜風了'
            : v?.away
              ? '停在力行宿舍大門前'
              : `距離你 ${d} 公尺`;
      return `<div class="ph-gcard"><span>${icon}</span><div><b>${name}</b><small>${sub} · ${st}</small></div></div>
        <button class="ph-gbtn" data-k="${key}" ${riding || busy || out ? 'disabled' : ''}>🚁 直升機空投到我旁邊</button>`;
    };
    const ninja = g.howardQuest?.done && H?.bike;
    const c = this._frame(
      '呼叫載具',
      `<div class="ph-garage">
        ${card('jet', g.myScooter, '🛵', '我的 JAT SM', '粉白配色')}
        ${ninja ? card('ninja', H.bike, '🏍️', '霍華德的忍 400', '黑色仿賽・借你騎') : ''}
        <div class="ph-note">彥霖航空直升機會把車吊過來，放在你旁邊的路上。免費，大約 15 秒送達。${ninja ? '' : '<br>🔒 解出霍華德的 Two Sum，他的忍 400 也能空投。'}</div>
      </div>`
    );
    for (const b of c.querySelectorAll('.ph-gbtn'))
      b.onclick = () => {
        const err = g.airdrop.call(b.dataset.k);
        if (err) {
          g.hud.toast(err, 'bad', 2400);
          return;
        }
        g.audio.notify?.();
        g.hud.toast('🚁 彥霖航空直升機起飛了，抬頭看！', 'good', 2600);
        this.close();
        this._last = null;
        g.lockPointer();
      };
  }
  // ---------------- 任務 ----------------
  _missions() {
    const g = this.g,
      M = g.missions;
    const LIST = [
      ['序章 · 投票前一天', '一早和總幹事 AI M.O.N.D.A.Y 會合，前往資訊管理學系館'],
      ['任務一 · 傳單大作戰', '3 分鐘內把傳單送到 5 個公布欄'],
      ['任務二 · 食字路口', '去夜市的十字路口（黃色網狀線）幫競選小組採買點心'],
      ['任務三 · 掃街拉票', '對路上的同學發傳單，拉到 15 票'],
      ['任務四 · 布條保衛戰', '依序把競選布條掛好，限時完成'],
      ['任務五 · 布條失竊案', '回到以前住的地方，用電腦的 SQL 查出拆布條的人'],
      ['任務六 · 宿舍拉票', '到力行宿舍二樓 276～281，每間寢室門口拉一次票'],
      ['終章 · 政見發表會', '到學生活動中心發表政見'],
    ];
    const cur = M.done ? LIST.length : Math.max(0, M.idx);
    const obj = document.getElementById('objText')?.innerText || '';
    const rows = LIST.map(([t, d], i) => {
      const st = i < cur ? 'done' : i === cur ? 'now' : 'todo';
      const paused = st === 'now' && M.exited;
      return `<div class="ph-mrow ${st}"><i>${st === 'done' ? '✅' : paused ? '⏸' : st === 'now' ? '▶' : '🔒'}</i><div><b>${esc(t)}${paused ? '（已暫停）' : ''}</b><small>${paused ? '這一小節的進度沒有保存。回到地圖上 ▶ 的任務起點，按下面的「▶ 繼續任務」從這一小節重新開始。' : esc(st === 'now' && obj ? obj : d)}</small></div></div>`;
    }).join('');
    // pause / carry on (the start ring: you have to stand in it to carry on; from anywhere else the button takes you there)
    const ex = M.exited,
      here = M.inRing;
    const ctl = ex
      ? here
        ? '<button class="ph-gbtn ph-mgo">▶ 繼續任務</button>'
        : '<button class="ph-gbtn ph-mring">🧭 導航到任務起點</button><div class="ph-note">走到任務起點後再打開這裡按「▶ 繼續任務」。</div>'
      : M.canExit
        ? '<button class="ph-gbtn ph-mquit" style="background:#8e8e93">⏹ 退出目前任務</button><div class="ph-note">退出後這一小節的進度不會保存，之後回到任務起點再繼續。</div>'
        : '';
    const tgt = ex ? null : this._missionTarget();
    const c = this._frame(
      '任務',
      `<div class="ph-mhead"><small>主線進度</small><b>${Math.min(cur, LIST.length)} / ${LIST.length}</b>
        <div class="ph-mbar"><i style="width:${(Math.min(cur, LIST.length) / LIST.length) * 100}%"></i></div>${M.done ? '<span>🎉 已當選！繼續自由玩吧</span>' : ''}</div>
      ${tgt ? '<button class="ph-gbtn ph-mnav">🧭 導航到目前目標</button>' : ''}${ctl}
      <div class="ph-msec">主線任務</div>${rows}
      <div class="ph-msec">支線與收集</div>
      <div class="ph-row"><span>🗳 金色選票</span><b>${g.ballotsTaken} / 34</b></div>
      <div class="ph-row"><span>🍟 麥當勞值班</span><b>${g.job.shifts ? `${g.job.shifts} 班` : '未開始'}</b></div>
      <div class="ph-row"><span>🚧 新中北路側門門禁</span><b>${g.gate.shifts ? `${g.gate.shifts} 班` : '未開始'}</b></div>
      <div class="ph-row"><span>🏁 新中北路障礙賽</span><b>${g.race.runs ? `${g.race.runs} 場 · 冠軍 ${g.race.wins} 次` : '未參加'}</b></div>`
    );
    const nb = c.querySelector('.ph-mnav');
    if (nb)
      nb.onclick = () => {
        g.nav.set(tgt.x, tgt.z);
        g.hud.toast('🧭 已設定導航到任務目標', 'good', 2000);
        this.close();
        g.lockPointer();
      };
    const go = c.querySelector('.ph-mgo');
    if (go)
      go.onclick = () => {
        this.close();
        g.lockPointer();
        M.resumeSection();
      };
    const rg = c.querySelector('.ph-mring');
    if (rg)
      rg.onclick = () => {
        const a = M.exited.at;
        g.nav.set(a.x, a.z);
        g.hud.toast('🧭 已設定導航到任務起點', 'good', 2200);
        this.close();
        g.lockPointer();
      };
    const qt = c.querySelector('.ph-mquit');
    if (qt)
      qt.onclick = () => {
        M.exit();
        this._missions();
        g.hud.toast('⏹ 已退出任務，回到 ▶ 任務起點再從這裡繼續', 'good', 2800);
      };
  }
  // ---------------- 漢堡車 (src/systems/minigames/PinHanRide.js) ----------------
  _burger() {
    const g = this.g,
      R = g.pinhanRide,
      used = R.usedToday;
    const rows = RIDE_PLACES.filter((p) => !p.shown || p.shown(g))
      .map(
        (p) =>
          `<button class="ph-gbtn ph-hb" data-k="${p.key}" ${used ? 'disabled' : ''}>${p.icon} ${esc(p.name)}</button>`
      )
      .join('');
    const c = this._frame(
      '漢堡車',
      `<div class="ph-garage">
        <div class="ph-gcard"><span>🍔</span><div><b>品漢堡 專屬司機</b><small>${used ? '今天的免費搭乘用過了，明天再來' : '每天免費一次・選目的地，他馬上開過來'}</small></div></div>
        ${rows}
        <div class="ph-note">他會開到你旁邊，你坐副駕，他親自送你到目的地。要在戶外、路邊叫車。</div>
      </div>`
    );
    for (const b of c.querySelectorAll('.ph-hb'))
      b.onclick = () => {
        const err = R.call(b.dataset.k);
        if (err) {
          g.hud.toast(err, 'bad', 2600);
          return;
        }
        g.audio.notify?.();
        this.close();
        this._last = null;
        g.lockPointer();
      };
  }
  // ---------------- 定位 (friends' locations) ----------------
  _locate() {
    const c = this._frame('定位', '<div class="lc-host"></div>', { cls: 'ph-locate' });
    this._lc = locateUI(c.querySelector('.lc-host'), this.g);
    this._lc.render();
    this._lcT = 0;
  }
  // ---------------- PYtoday (news) ----------------
  _news() {
    const c = this._frame('PYtoday', '<div class="nw-host"></div>', { cls: 'ph-news' });
    this._nw = newsUI(c.querySelector('.nw-host'), this.g, { wide: false });
  }
  // ---------------- 靈感股 ----------------
  _stock() {
    const c = this._frame('靈感股', '<div class="sk-host"></div>', { cls: 'ph-stock' });
    this._sk = stockUI(c.querySelector('.sk-host'), this.g.market, { wide: false });
    this._skT = 0;
  }
  _missionTarget() {
    const s = this.g.missions.step;
    if (!s) return null;
    if (s.type === 'goto') return s.target;
    if (s.type === 'cps') {
      const left = s.list.filter((c) => !c.hit);
      return left.length ? left[0] : null;
    }
    if (s.type === 'until') return s.opt?.nav || null;
    return null;
  }
  _frame(title, body, opt = {}) {
    // slide in only when we land on a different page; re-rendering the same page (likes, buy, keypad, tabs) stays put
    const key = `${this.app}|${title}`,
      still = key === this._frameKey;
    this._frameKey = key;
    this.view.innerHTML = `<div class="ph-appview ${opt.cls || ''} ${still ? 'still' : ''}"><div class="ph-nav">${opt.back ? `<button class="ph-back">‹ ${esc(opt.back)}</button>` : '<span class="ph-back"></span>'}<b>${esc(title)}</b><span>${opt.right || ''}</span></div><div class="ph-content">${body}</div></div>`;
    const bk = this.view.querySelector('button.ph-back');
    if (bk) bk.onclick = () => (opt.onBack ? opt.onBack() : this.home());
    return this.view.querySelector('.ph-content');
  }
  openApp(id) {
    this.app = id;
    this.cur = null;
    this.g.audio.tap?.();
    const g = this.g;
    if (id === 'messages') return this._messages();
    if (id === 'garage') return this._garage();
    if (id === 'missions') return this._missions();
    if (id === 'stock') return this._stock();
    if (id === 'news') return this._news();
    if (id === 'locate') return this._locate();
    if (id === 'burger') return this._burger();
    if (id === 'drone') return this._drone();
    if (id === 'tix') return g.concerts.app(this);
    if (id === 'map') {
      this.close();
      this._last = null;
      g.openMap('phone');
      return;
    } // closing the map brings back the home screen
    if (id === 'camera') return this._camera();
    if (id === 'photos') return this._photos();
    if (id === 'wallet') {
      const rows =
        g.ledger
          .slice()
          .reverse()
          .map(
            (l) =>
              `<div class="ph-row"><span>${esc(l.what)}<small>${hhmm(l.at)}</small></span><b class="${l.n >= 0 ? 'plus' : 'minus'}">${l.n >= 0 ? '+' : '−'}NT$ ${Math.abs(l.n)}</b></div>`
          )
          .join('') || '<div class="ph-empty">還沒有交易紀錄</div>';
      this._frame(
        'Peach Pay',
        `<div class="ph-card">${PEACH('#fff')}<div><small>Peach Pay · 彥霖</small><b>NT$ ${g.money}</b></div><span>**** 0803</span></div>
        <div class="ph-sec">交易紀錄</div>${rows}`
      );
      return;
    }
    if (id === 'music') {
      const cur = g.settings.music;
      const opt = (v, t, s) =>
        `<button class="ph-row ph-pick ${cur === v ? 'on' : ''}" data-m="${v}"><span>${t}<small>${s}</small></span><b>${cur === v ? '▶' : ''}</b></button>`;
      const c = this._frame(
        '音樂',
        `<div class="ph-album">🎭</div><div class="ph-sec">播放清單</div>
        ${opt('scene', '情境配樂', '依場景自動換曲')}${opt('opera', '彥霖歌劇', '彥霖 · 競選主題曲')}${opt('off', '靜音', '關閉背景音樂')}`
      );
      for (const b of c.querySelectorAll('[data-m]'))
        b.onclick = () => {
          g.setMusic(b.dataset.m);
          this.openApp('music');
        };
      return;
    }
    if (id === 'votes') {
      const obj = document.getElementById('objText')?.innerText || '自由探索';
      this._frame(
        '選情',
        `<div class="ph-big"><small>目前得票</small><b>${g.votes}</b><span>票</span></div>
        <div class="ph-row"><span>金色選票</span><b>${g.ballotsTaken} / 34</b></div>
        <div class="ph-row"><span>發傳單成功</span><b>${g.flyerVotes || 0} 人</b></div>
        <div class="ph-row"><span>🚧 支線：新中北路側門門禁<small>坐進活動中心旁的側門警衛室，別讓怪人進來</small></span><b>${g.gate?.shifts ? `完成 ${g.gate.shifts} 班` : '未開始'}</b></div>
        <div class="ph-row"><span>目前任務</span><b class="ph-wrap">${esc(obj)}</b></div>
        <div class="ph-note">資管要贏，票投彥霖！🗳</div>`
      );
      return;
    }
    if (id === 'weather') {
      const t = this._temp(),
        n = g.night > 0.5;
      const hours = [0, 1, 2, 3, 4, 5]
        .map((k) => {
          const m = g.clock + k * 60,
            h = Math.floor(m / 60) % 24,
            nn = h < 6 || h >= 18;
          return `<div><small>${k ? `${h}時` : '現在'}</small><span>${nn ? '🌙' : k % 3 === 2 ? '⛅' : '☀️'}</span><b>${nn ? 19 + (k % 2) : 24 + (k % 3)}°</b></div>`;
        })
        .join('');
      this._frame(
        '天氣',
        `<div class="ph-weather ${n ? 'night' : ''}"><small>中壢區</small><b>${t}°</b><span>${n ? '晴朗夜空' : '多雲時晴'}</span><small>最高 27° 最低 18°</small></div>
        <div class="ph-hours">${hours}</div><div class="ph-note">降雨機率 10%，適合騎 JAT SM 去拉票 🛵</div>`,
        { cls: 'ph-blue' }
      );
      return;
    }
    if (id === 'mcd') {
      const j = g.job;
      this._frame(
        '麥當勞',
        `<div class="ph-mcd">🍟<b>麥當勞 中原店</b><small>學生活動中心東側</small></div>
        <div class="ph-sec">我的打工</div>
        <div class="ph-row"><span>時薪</span><b>NT$ 196</b></div>
        <div class="ph-row"><span>已完成班數</span><b>${j.shifts} 班</b></div>
        <div class="ph-row"><span>打工總收入</span><b>NT$ ${j.earned}</b></div>
        <div class="ph-row"><span>最佳單班</span><b>NT$ ${j.best}</b></div>
        <div class="ph-note">走進麥當勞，從櫃檯側邊繞到後面的<b>員工入口</b>：打卡鐘旁按 <kbd>E</kbd> 上櫃台，走到內場煎台前按 <kbd>E</kbd> 上內場。</div>
        <div class="ph-sec">菜單</div>
        <div class="ph-row"><span>大麥克套餐</span><b>NT$ 155</b></div>`,
        { cls: 'ph-red' }
      );
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
      const c = this._frame(
        '設定',
        `<div class="ph-prof"><span>彥</span><div><b>彥霖</b><small>Peach ID、iCloud+、媒體與購買項目</small></div></div>
        <div class="ph-sec">一般</div>
        <button class="ph-row" id="phAbout"><span>關於本機</span><b>›</b></button>
        <div class="ph-row"><span>Wi-Fi</span><b>CYCU-WiFi</b></div>
        <div class="ph-row"><span>藍牙</span><b>開啟</b></div>
        <div class="ph-row"><span>電池</span><b>87%</b></div>
        <div class="ph-sec">Peach Intelligence</div>
        <button class="ph-row" id="phAI"><span>AI 聊天（Gemini Nano）<small>${esc(Nano.label())}</small></span><b>${Nano.state === 'downloadable' ? '下載' : Nano.on ? '✨' : ''}</b></button>
        <div class="ph-note">在 Google Chrome 裡，訊息 App 會改用 Chrome 內建、在你電腦上執行的 Gemini Nano 產生回覆，可以無限聊下去；其他瀏覽器則使用預先寫好的對話。</div>`
      );
      c.querySelector('#phAI').onclick = () => {
        if (Nano.state === 'downloadable') Nano.download();
        setTimeout(() => this.app === 'settings' && this.openApp('settings'), 300);
      };
      c.querySelector('#phAbout').onclick = () =>
        this._frame(
          '關於本機',
          `<div class="ph-about">${PEACH('#1c1c1e')}<b>i-Piyan 15 Pro</b><small>PeachOS 18.3</small></div>
        <div class="ph-row"><span>名稱</span><b>彥霖的 i-Piyan</b></div>
        <div class="ph-row"><span>型號名稱</span><b>i-Piyan 15 Pro</b></div>
        <div class="ph-row"><span>軟體版本</span><b>PeachOS 18.3</b></div>
        <div class="ph-row"><span>容量</span><b>256 GB</b></div>
        <div class="ph-row"><span>序號</span><b>PYL0803YL34</b></div>
        <div class="ph-row"><span>製造商</span><b>Peach Inc. 🍑</b></div>`,
          { back: '設定', onBack: () => this.openApp('settings') }
        );
      return;
    }
  }
  // ---------------- Peachgram (social) ----------------
  _ago(at) {
    const m = Math.max(0, Math.round(this.g.clock - at));
    return m < 2
      ? '剛剛'
      : m < 60
        ? `${m} 分鐘`
        : m < 1440
          ? `${Math.floor(m / 60)} 小時`
          : m < 2880
            ? '昨天'
            : `${Math.floor(m / 1440)} 天`;
  }
  _person(who) {
    return PEOPLE[who] || { av: who[0], color: '#c7c7cc' };
  }
  // someone only friends can see (吱吱) and not added yet
  _hidden(who) {
    const id = FRIEND_ONLY[who];
    return !!id && !this.friends.has(id);
  }
  // stories up right now, grouped per person (oldest first inside a group); people with unseen ones first.
  // Everyone posts twice a day at their own times (STORY_TIMES); a story stays up for 24 game hours.
  _storyList() {
    const now = this.g.clock,
      day = Math.floor(now / 1440),
      out = [];
    for (const who of Object.keys(STORY_SETS)) {
      if (this._hidden(who)) continue;
      const set = STORY_SETS[who],
        times = STORY_TIMES[who] || [9 * 60, 20 * 60],
        items = [];
      for (const d of [day - 1, day])
        for (let k = 0; k < 2; k++) {
          const at = d * 1440 + times[k];
          if (at > now || now - at >= 1440) continue;
          const n = set.length,
            st = set[(((d * 2 + k) % n) + n) % n];
          items.push({ ...st, who, at, id: `${who}|${d}|${k}` });
        }
      if (!items.length) continue;
      items.sort((a, b) => a.at - b.at);
      for (const it of items) it.seen = this.storySeen.has(it.id);
      out.push({ who, items, seen: items.every((it) => it.seen), at: items[items.length - 1].at });
    }
    return out.sort((a, b) => a.seen - b.seen || b.at - a.at);
  }
  _gram(tab = 'feed') {
    const g = this.g;
    this.fresh.gram = 0;
    this._gramTab = tab;
    const post = (p) => {
      const k = p.id,
        liked = this.likes.has(k),
        likes = p.likes + (liked ? 1 : 0),
        P = p.mine ? { av: '彥', color: '#ffd23f' } : this._person(p.who);
      return `<div class="pg-post"><div class="pg-head"><span class="ph-av" style="background:${P.color}">${P.av}</span><b>${esc(p.who)}</b><small>${this._ago(p.at)}</small></div>
        <div class="pg-img" data-k="${k}"><img src="${p.img}" alt="" loading="lazy"></div>
        <div class="pg-bar"><button class="pg-like ${liked ? 'on' : ''}" data-k="${k}">${liked ? '❤️' : '🤍'}</button><span>💬</span><span>📤</span></div>
        <div class="pg-cap"><b>${likes} 個讚</b><br><b>${esc(p.who)}</b> ${esc(p.cap)}</div></div>`;
    };
    const mine = this.myPosts.map((p, i) => ({
      who: 'yanlin_im34',
      mine: true,
      img: p.photo,
      cap: p.cap,
      likes: p.likes,
      at: p.at,
      id: `m${i}`,
    }));
    const all = [...mine, ...this.feed.filter((p) => !this._hidden(p.who))].sort(
      (a, b) => b.at - a.at
    );
    let body;
    if (tab === 'feed') {
      this._stories = this._storyList();
      body = `<div class="pg-stories">${this._stories
        .map((x, i) => {
          const P = this._person(x.who);
          return `<button class="pg-story ${x.seen ? 'seen' : ''}" data-s="${i}"><span class="ph-av" style="background:${P.color}">${P.av}</span><small>${esc(x.who)}</small></button>`;
        })
        .join('')}</div>
      ${all.map(post).join('')}`;
    } else {
      const ph = this.photos[0];
      body = `<div class="pg-prof"><span class="ph-av" style="background:#ffd23f">彥</span><div><b>yanlin_im34</b><small>資管系第34屆系學會會長候選人 🗳️<br>資管要贏・票投彥霖</small></div></div>
        <div class="pg-stats"><div><b>${this.myPosts.length}</b>貼文</div><div><b>${1034 + this.myPosts.length * 57}</b>粉絲</div><div><b>298</b>追蹤中</div></div>
        <div class="ph-sec">發新貼文</div>
        ${
          ph
            ? `<div class="pg-new"><img src="${ph}"><div>${CAPTIONS.map((c, i) => `<button class="ph-choice" data-c="${i}">${esc(c)}</button>`).join('')}</div></div>`
            : '<div class="ph-note">先用 <b>相機</b> App 拍一張照片，才能發文。</div>'
        }
        <div class="pg-grid">${this.myPosts.map((p) => `<img src="${p.photo}">`).join('')}</div>`;
    }
    const c = this._frame(
      'Peachgram',
      `<div class="pg-tabs"><button class="${tab === 'feed' ? 'on' : ''}" data-t="feed">🏠 動態</button><button class="${tab === 'me' ? 'on' : ''}" data-t="me">👤 我的</button></div>${body}`,
      { right: '<button class="ph-refresh" title="重新整理（R）">⟳</button>', cls: 'ph-gram' }
    );
    this._bindRefresh(c);
    c.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => this._gram(b.dataset.t)));
    this._swipeRow(c.querySelector('.pg-stories'));
    c.querySelectorAll('.pg-story').forEach(
      (b) =>
        (b.onclick = () => {
          if (!this._dragged) this._storyOpen(+b.dataset.s);
        })
    );
    const like = (k) => {
      this.likes.has(k) ? this.likes.delete(k) : this.likes.add(k);
      g.audio.pop?.();
      this._rerender(() => this._gram(tab));
    };
    c.querySelectorAll('.pg-like').forEach((b) => (b.onclick = () => like(b.dataset.k)));
    c.querySelectorAll('.pg-img').forEach(
      (b) =>
        (b.ondblclick = () => {
          if (!this.likes.has(b.dataset.k)) like(b.dataset.k);
        })
    );
    c.querySelectorAll('[data-c]').forEach(
      (b) =>
        (b.onclick = () => {
          const n = this.myPosts.length;
          this.myPosts.unshift({
            photo: this.photos[0],
            cap: CAPTIONS[+b.dataset.c],
            likes: 40 + Math.floor(Math.random() * 120),
            at: g.clock,
          });
          g.audio.pickup?.();
          if (n < 3) g.addVotes(2, `Peachgram 貼文爆紅 +2 票`);
          else g.hud.toast('貼文發佈成功 📸', 'good', 1500);
          this._gram('feed');
        })
    );
  }
  // re-render the current page and keep the scroll position
  _rerender(fn) {
    const y = this.view.querySelector('.ph-content')?.scrollTop || 0;
    fn();
    const c = this.view.querySelector('.ph-content');
    if (c) c.scrollTop = y;
  }
  // ---- story viewer: tap right / left half (or ← →), auto-advances every 5 s, Esc closes ----
  _storyOpen(i) {
    const groups = this._stories || this._storyList();
    if (!groups[i]) return;
    // start at this person's first unseen story
    const k = Math.max(
      0,
      groups[i].items.findIndex((it) => !it.seen)
    );
    this.story = { groups, gi: i, k };
    const ov = document.createElement('div');
    ov.className = 'st-view';
    this.view.appendChild(ov);
    this._storyShow();
  }
  _storyShow() {
    const S = this.story;
    if (!S) return;
    const grp = S.groups[S.gi],
      x = grp.items[S.k],
      P = this._person(x.who);
    x.seen = true;
    this.storySeen.add(x.id);
    grp.seen = grp.items.every((it) => it.seen);
    const ov = this.view.querySelector('.st-view');
    if (!ov) return;
    const bg = x.img
      ? `<img src="${x.img}" alt="">`
      : `<div class="st-bg" style="background:${x.bg}"></div>`;
    const txt = `<div class="st-txt ${x.img ? 'on-img' : ''}">${x.s ? `<span class="st-stk">${x.s}</span>` : ''}${esc(x.t || '').replace(/\n/g, '<br>')}</div>`;
    ov.innerHTML = `${bg}${txt}<div class="st-bars">${grp.items.map((_, k) => `<i class="${k < S.k ? 'done' : k === S.k ? 'run' : ''}"><b></b></i>`).join('')}</div>
      <div class="st-head"><span class="ph-av" style="background:${P.color}">${P.av}</span><b>${esc(x.who)}</b><small>${this._ago(x.at)}</small><button class="st-x">✕</button></div>
      <div class="st-tap st-l"></div><div class="st-tap st-r"></div>
      <div class="st-reply">傳送訊息給 ${esc(x.who)}…　❤️</div>`;
    ov.querySelector('.st-x').onclick = (e) => {
      e.stopPropagation();
      this._storyClose();
    };
    ov.querySelector('.st-l').onclick = () => this._storyGo(-1);
    ov.querySelector('.st-r').onclick = () => this._storyGo(1);
    clearTimeout(this._stT);
    this._stT = setTimeout(() => this._storyGo(1), 5000);
  }
  _storyGo(d) {
    const S = this.story;
    if (!S) return;
    S.k += d;
    if (S.k < 0) {
      if (S.gi > 0) {
        S.gi--;
        S.k = S.groups[S.gi].items.length - 1;
      } else S.k = 0;
    } else if (S.k >= S.groups[S.gi].items.length) {
      S.gi++;
      S.k = 0;
      if (S.gi >= S.groups.length) {
        this._storyClose();
        return;
      }
    }
    this._storyShow();
  }
  _storyClose() {
    clearTimeout(this._stT);
    this.story = null;
    this.view.querySelector('.st-view')?.remove();
    if (this.app === 'gram') this._rerender(() => this._gram(this._gramTab || 'feed'));
  }
  // story bubbles slide sideways: finger swipe (native), mouse drag, or the mouse wheel; the row keeps its
  // position when the feed re-renders. A drag doesn't count as a tap on a bubble.
  _swipeRow(row) {
    if (!row) return;
    row.scrollLeft = this._storyX || 0;
    row.addEventListener(
      'scroll',
      () => {
        this._storyX = row.scrollLeft;
      },
      { passive: true }
    );
    row.addEventListener(
      'wheel',
      (e) => {
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const max = row.scrollWidth - row.clientWidth;
        if (max <= 0 || (d < 0 && row.scrollLeft <= 0) || (d > 0 && row.scrollLeft >= max - 1))
          return;
        e.preventDefault();
        e.stopPropagation();
        row.scrollLeft += d;
      },
      { passive: false }
    );
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        this._sw = { row, x0: e.clientX, s0: row.scrollLeft };
        this._dragged = false;
      }
    });
    if (this._swInit) return; // the window listeners are shared by every render of the row
    this._swInit = true;
    addEventListener('pointermove', (e) => {
      const w = this._sw;
      if (!w) return;
      const dx = e.clientX - w.x0;
      if (Math.abs(dx) > 5) {
        this._dragged = true;
        w.row.classList.add('drag');
      }
      w.row.scrollLeft = w.s0 - dx;
    });
    addEventListener('pointerup', () => {
      const w = this._sw;
      if (!w) return;
      this._sw = null;
      w.row.classList.remove('drag');
      setTimeout(() => {
        this._dragged = false;
      }, 0);
    });
  }
  // ---- 重新整理 (Peachgram / Pcard): ⟳ button, R, or pull down at the top of the list ----
  _bindRefresh(c) {
    this.view.querySelector('.ph-refresh')?.addEventListener('click', () => this._refresh());
    let y0 = null,
      wheel = 0;
    c.addEventListener(
      'touchstart',
      (e) => {
        y0 = c.scrollTop <= 0 ? e.touches[0].clientY : null;
      },
      { passive: true }
    );
    c.addEventListener(
      'touchmove',
      (e) => {
        if (y0 != null && e.touches[0].clientY - y0 > 70) {
          y0 = null;
          this._refresh();
        }
      },
      { passive: true }
    );
    c.addEventListener(
      'wheel',
      (e) => {
        if (c.scrollTop > 0 || e.deltaY >= 0) {
          wheel = 0;
          return;
        }
        if ((wheel -= e.deltaY) > 160) {
          wheel = 0;
          this._refresh();
        }
      },
      { passive: true }
    );
  }
  // shows a spinner, then the list again: stories that came up since, and (at most every 10 game minutes)
  // one brand-new post / article right away instead of waiting for the next 30-minute tick
  _refresh() {
    const app = this.app,
      c = this.view.querySelector('.ph-content');
    if (!c || this._refreshing || (app !== 'gram' && app !== 'pcard')) return;
    this._refreshing = true;
    this.g.audio.tap?.();
    c.scrollTop = 0;
    const sp = document.createElement('div');
    sp.className = 'ph-pull';
    sp.innerHTML = '<i></i>重新整理中…';
    c.prepend(sp);
    setTimeout(() => {
      this._refreshing = false;
      if (!this.open || this.app !== app) return;
      const g = this.g,
        fresh = g.clock - (this._pulledAt ?? -1e9) >= 10;
      if (fresh) {
        this._pulledAt = g.clock;
        this._pull[app === 'gram' ? 'g' : 'p'] = true;
      } // tick() publishes and re-renders next frame
      if (app === 'gram') this._gram(this._gramTab || 'feed');
      else this._pcard();
      if (!fresh) g.hud.toast('已經是最新的內容了', 'good', 1300);
    }, 700);
  }
  // ---- new Peachgram / Pcard posts on their schedule (src/ui/phone/FeedGen.js; runs even with the phone in the pocket) ----
  tick() {
    const g = this.g;
    if (this.call?.state === 'ring') {
      // ringtone, and a missed call after 25 s
      const n = performance.now();
      if (n - (this._ringT || 0) > 1300) {
        this._ringT = n;
        g.audio.notify?.();
      }
      if (n - this.call.at > 25000) this._callEnd(true);
    }
    // 靈感股 prices move while the app is on screen
    if (this.open && this.app === 'stock' && this._sk) {
      const n = performance.now();
      if (n - (this._skT || 0) > 1000) {
        this._skT = n;
        this._sk.refresh();
      }
    }
    if (this.open && this.app === 'news' && this._nw) this._nw.refresh(); // new articles show up while it's open
    if (this.open && this.app === 'locate' && this._lc) {
      const n = performance.now();
      if (n - (this._lcT || 0) > 1000) {
        this._lcT = n;
        this._lc.refresh();
      }
    } // friends move
    for (const k of ['g', 'p']) {
      const items = [];
      while (slotAt(k, this.next[k]) <= g.clock)
        items.push((k === 'g' ? gramPost : pcardPost)(this.next[k]++));
      // pulled to refresh: the next scheduled post comes out now (a friends-only one doesn't count, take the one after)
      if (this._pull[k]) {
        this._pull[k] = false;
        for (let t = 0; t < 6 && !items.some((p) => !this._hidden(p.who)); t++)
          items.push({ ...(k === 'g' ? gramPost : pcardPost)(this.next[k]++), at: g.clock });
      }
      if (items.length) this._publish(k, items.slice(-12));
    }
  }
  // the opening posts (Feeds.js FEED / PCARD, just before the game starts) + the scheduled ones up to the game clock.
  // Called again by src/systems/SaveSystem.js after the clock is loaded.
  syncFeeds() {
    const c = this.g.clock;
    this.feed = [
      ...postsUpTo('g', c),
      ...FEED.map((p, i) => ({ ...p, id: `f${i}`, at: START - p.ago })),
    ].slice(0, 40);
    this.pcard = [
      ...postsUpTo('p', c),
      ...PCARD.map((p, i) => ({ ...p, id: `c${i}`, at: START - p.ago })),
    ].slice(0, 40);
    this.next = { g: nextIndex('g', c), p: nextIndex('p', c) };
    this._pull = {};
  }
  _publish(k, items) {
    const g = this.g,
      gram = k === 'g',
      list = gram ? this.feed : this.pcard,
      last = items.filter((p) => !this._hidden(p.who)).pop();
    const done = () => {
      for (const p of list.slice(0, 6))
        if (gram) p.likes += 1 + Math.floor(Math.random() * 12);
        else p.n += Math.floor(Math.random() * 6);
      list.unshift(...items.reverse());
      list.sort((a, b) => b.at - a.at);
      list.length = Math.min(list.length, 40);
      if (!last) return;
      const viewing = this.open && !this.story && !this.cur,
        n = items.filter((p) => !this._hidden(p.who)).length;
      if (!(viewing && this.app === (gram ? 'gram' : 'pcard')))
        this.fresh[gram ? 'gram' : 'pcard'] += n;
      g.hud.toast(
        gram ? `📸 Peachgram｜${last.who} 發了新貼文` : `🗨️ Pcard 新文章：${last.t}`,
        'good',
        2200
      );
      if (viewing && gram && this.app === 'gram' && this._gramTab === 'feed')
        this._rerender(() => this._gram('feed'));
      else if (viewing && !gram && this.app === 'pcard') this._rerender(() => this._pcard());
      else if (this.open && !this.app) this.home();
    };
    // Chrome + Gemini Nano: let the model rewrite the newest one (falls back to the scheduled text)
    if (!last || !Nano.on) {
      done();
      return;
    }
    const req = gram
      ? Nano.write(last.who, PEOPLE[last.who] ? last.cap : '', { t: last.cap, b: '', c: [] })
      : Nano.write('同學', '', last);
    req
      .then((r) => {
        if (gram) {
          if (r.cap) last.cap = r.cap;
        } else if (r.t)
          Object.assign(last, { t: r.t, b: r.b || last.b, c: r.c?.length ? r.c : last.c });
      })
      .catch(() => {})
      .finally(done);
  }
  // ---------------- 桃寶購物 (shopping) ----------------
  _shop(tab = 'store') {
    const g = this.g;
    let body;
    if (tab === 'store')
      body = `<div class="sh-banner">🍑 校園特賣 · Peach Pay 付款</div><div class="sh-grid">${SHOP.map(
        (it) => {
          const n = this.bought[it.id] || 0,
            sold = it.max && n >= it.max;
          return `<div class="sh-item"><div class="sh-pic">${it.icon}</div><b>${esc(it.name)}</b><small>${esc(it.desc)}</small>
        <div class="sh-buy"><span>NT$ ${it.price}</span><button data-id="${it.id}" ${sold ? 'disabled' : ''}>${sold ? '已購買' : '購買'}</button></div></div>`;
        }
      ).join('')}</div>`;
    else
      body = this.orders.length
        ? this.orders
            .slice()
            .reverse()
            .map(
              (o) =>
                `<div class="ph-row"><span>${o.icon} ${esc(o.name)}<small>${hhmm(o.at)} · ${esc(o.status)}</small></span><b class="minus">−NT$ ${o.price}</b></div>`
            )
            .join('')
        : '<div class="ph-empty">還沒有訂單</div>';
    const c = this._frame(
      '桃寶購物',
      `<div class="pg-tabs"><button class="${tab === 'store' ? 'on' : ''}" data-t="store">🛍️ 商品</button><button class="${tab === 'orders' ? 'on' : ''}" data-t="orders">📦 我的訂單</button></div>
      <div class="sh-wallet">💳 Peach Pay 餘額 <b>NT$ ${g.money}</b></div>${body}`,
      { cls: 'ph-shop' }
    );
    c.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => this._shop(b.dataset.t)));
    c.querySelectorAll('[data-id]').forEach(
      (b) =>
        (b.onclick = () => {
          const it = SHOP.find((x) => x.id === b.dataset.id);
          if (!g.spend(it.price, `桃寶：${it.name}`)) {
            g.audio.bad?.();
            g.hud.toast('餘額不足！去麥當勞打工賺錢吧 🍟', 'bad', 2000);
            return;
          }
          this.bought[it.id] = (this.bought[it.id] || 0) + 1;
          this.orders.push({
            ...it,
            at: g.clock,
            status: it.boost ? '已取貨・喝掉了' : '超商取貨・已送達',
          });
          if (it.boost) {
            g.player.boost = Math.max(g.player.boost || 0, it.boost);
            g.hud.toast(`${it.icon} ${it.name}：衝刺加速 ${it.boost} 秒！`, 'good', 2000);
          }
          if (it.votes) g.addVotes(it.votes, `${it.icon} ${it.name} +${it.votes} 票`);
          else if (!it.boost) g.hud.toast(`${it.icon} ${it.name} 已送達！`, 'good', 1800);
          const y = c.scrollTop;
          this._shop('store');
          this.view.querySelector('.ph-content').scrollTop = y;
        })
    );
  }
  // ---------------- Pcard (anonymous campus forum) ----------------
  _pcard() {
    this.fresh.pcard = 0;
    const list = this.pcard;
    const c = this._frame(
      '中原大學 Pcard',
      `<div class="pc-board">🏫 中原大學板 · 最新</div>${list.map((p, i) => `<button class="pc-post" data-i="${i}"><b>${esc(p.t)}</b><small>${esc(p.b)}</small><span>❤️ ${p.n}　💬 ${p.c.length}　· ${this._ago(p.at)}</span></button>`).join('')}`,
      { right: '<button class="ph-refresh" title="重新整理（R）">⟳</button>', cls: 'ph-pcard' }
    );
    this._bindRefresh(c);
    c.querySelectorAll('.pc-post').forEach(
      (b) =>
        (b.onclick = () => {
          const p = list[+b.dataset.i];
          this._frame(
            '文章',
            `<div class="pc-full"><small>匿名 · 中原大學 · ${this._ago(p.at)}</small><b>${esc(p.t)}</b><p>${esc(p.b)}</p><span>❤️ ${p.n}</span></div>
        <div class="ph-sec">留言 ${p.c.length}</div>${p.c.map((x) => `<div class="pc-cmt">${esc(x)}</div>`).join('')}`,
            { back: 'Pcard', onBack: () => this.openApp('pcard'), cls: 'ph-pcard' }
          );
        })
    );
  }
  _notes() {
    const c = this._frame(
      '備忘錄',
      NOTES.map(
        (n, i) =>
          `<button class="ph-row" data-i="${i}"><span>${esc(n.t)}<small>${n.d} · ${esc(n.b.split('\n')[0])}</small></span><b>›</b></button>`
      ).join(''),
      { cls: 'ph-notes' }
    );
    c.querySelectorAll('[data-i]').forEach(
      (b) =>
        (b.onclick = () => {
          const n = NOTES[+b.dataset.i];
          this._frame(n.t, `<div class="nt-body">${esc(n.b).replace(/\n/g, '<br>')}</div>`, {
            back: '備忘錄',
            onBack: () => this.openApp('notes'),
            cls: 'ph-notes',
          });
        })
    );
  }
  _calendar() {
    const d = new Date(),
      y = d.getFullYear(),
      m = d.getMonth(),
      first = new Date(y, m, 1).getDay(),
      days = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<i></i>';
    for (let k = 1; k <= days; k++)
      cells += `<i class="${k === d.getDate() ? 'today' : ''} ${CAL[k] ? 'ev' : ''}">${k}</i>`;
    const evs = Object.entries(CAL)
      .map(
        ([k, t]) =>
          `<div class="ph-row"><span>${m + 1}月${k}日<small>${esc(t)}</small></span><b>${+k === 25 ? '🗳️' : ''}</b></div>`
      )
      .join('');
    this._frame(
      '行事曆',
      `<div class="cal-h">${y} 年 ${m + 1} 月</div><div class="cal-g"><b>日</b><b>一</b><b>二</b><b>三</b><b>四</b><b>五</b><b>六</b>${cells}</div><div class="ph-sec">活動</div>${evs}`
    );
  }
  _calc() {
    const keys = [
      'C',
      '±',
      '%',
      '÷',
      '7',
      '8',
      '9',
      '×',
      '4',
      '5',
      '6',
      '−',
      '1',
      '2',
      '3',
      '+',
      '0',
      '.',
      '⌫',
      '=',
    ];
    const cls = (k) => ('÷×−+='.includes(k) ? 'op' : ['C', '±', '%', '⌫'].includes(k) ? 'fn' : '');
    const c = this._frame(
      '計算機',
      `<div class="ca-out">${esc(this.calcExpr || '0')}</div><div class="ca-keys">${keys.map((k) => `<button class="${cls(k)}" data-k="${k}">${k}</button>`).join('')}</div>`,
      { cls: 'ph-dark' }
    );
    c.querySelectorAll('[data-k]').forEach(
      (b) =>
        (b.onclick = () => {
          const k = b.dataset.k;
          let e = this.calcExpr === '錯誤' ? '' : this.calcExpr;
          if (k === 'C') e = '';
          else if (k === '⌫') e = e.slice(0, -1);
          else if (k === '=') {
            const js = e
              .replace(/×/g, '*')
              .replace(/÷/g, '/')
              .replace(/−/g, '-')
              .replace(/%/g, '/100');
            if (/^[\d.+\-*/() ]+$/.test(js)) {
              try {
                const r = Function(`"use strict";return (${js})`)();
                e = Number.isFinite(r) ? String(+r.toFixed(8)) : '錯誤';
              } catch (er) {
                e = '錯誤';
              }
            }
          } else if (k === '±') e = e.startsWith('-') ? e.slice(1) : `-${e}`;
          else e += k;
          this.calcExpr = e.slice(0, 18);
          this.g.audio.blip?.();
          this._calc();
        })
    );
  }
  _clock() {
    const g = this.g,
      real = new Date(),
      rm = real.getHours() * 60 + real.getMinutes();
    const zones = [
      ['中壢（遊戲時間）', hhmm(g.clock)],
      ['台北（現實時間）', hhmm(rm)],
      ['東京', hhmm(rm + 60)],
      ['倫敦', hhmm(rm + 1440 - 480)],
    ];
    const c = this._frame(
      '時鐘',
      zones.map(([n, t]) => `<div class="ck-row"><small>${n}</small><b>${t}</b></div>`).join(''),
      { cls: 'ph-dark' }
    );
    clearTimeout(this._ckT);
    this._ckT = setTimeout(() => {
      if (this.open && this.app === 'clock') this._clock();
    }, 1000);
    return c;
  }
  // the camera app hands over to the handheld photo mode (src/ui/PhotoMode.js); the old screen below is the fallback
  _camera() {
    if (this.g.photo && this.g.state === 'play') {
      this.g.photo.enter();
      return;
    }
    const c = this._frame(
      '相機',
      `<div class="ph-cam"><div class="ph-vf">${this.photos[0] ? `<img src="${this.photos[0]}">` : '<span>按下快門拍下眼前的畫面</span>'}</div>
      <div class="ph-cam-bar"><button class="ph-thumb">${this.photos[0] ? `<img src="${this.photos[0]}">` : ''}</button><button class="ph-shutter"></button><span></span></div></div>`,
      { cls: 'ph-dark' }
    );
    c.querySelector('.ph-shutter').onclick = () =>
      this.g.capture((url) => {
        this.addPhoto(url);
        this.g.audio.shutter?.();
        this.el.classList.add('flash');
        setTimeout(() => this.el.classList.remove('flash'), 180);
        if (this.app === 'camera') this._camera();
      });
    c.querySelector('.ph-thumb').onclick = () => this.openApp('photos');
  }
  addPhoto(url) {
    this.photos.unshift(url);
    if (this.photos.length > MAX_PHOTOS) this.photos.length = MAX_PHOTOS;
    savePhotos(this.photos);
  }
  _photos() {
    const imgs = `${this.photos.map((u) => `<img src="${u}">`).join('')}<img src="assets/loading.jpg" onerror="this.remove()">`;
    const c = this._frame(
      '照片',
      `<div class="ph-photos">${imgs}</div>${this.photos.length ? '' : '<div class="ph-note">用相機 App 拍照，照片會出現在這裡。</div>'}`
    );
    for (const im of c.querySelectorAll('.ph-photos img'))
      im.onclick = () =>
        this._frame('照片', `<img class="ph-full" src="${im.src}">`, {
          back: '照片',
          onBack: () => this.openApp('photos'),
          cls: 'ph-dark',
        });
  }

  // ---------------- incoming call (src/systems/quests/ZzInjury.js) ----------------
  // opts: { id, name, avatar, color, lines: [[who, text], ...] (voice messages after you answer), onDecline(), onEnd() }
  // The phone comes out by itself and rings; 接聽 shows the voice messages one by one, then 掛斷. Declined, put away
  // or not answered within 25 s: onDecline. Hung up (also halfway through): onEnd.
  ring(opts) {
    if (this.call) return;
    this.call = { ...opts, state: 'ring', at: performance.now(), shown: 0 };
    if (!this.open) this.g.openPhone();
    else this._callView();
    this.g.audio.notify?.();
    this._ringT = performance.now();
  }
  _callView() {
    const c = this.call;
    if (!c) return;
    this.app = 'call';
    this.cur = null;
    this._frameKey = null;
    const ring = c.state === 'ring',
      done = c.state === 'talk' && c.shown >= c.lines.length;
    const lines = c.lines
      .slice(0, c.shown)
      .map(
        ([who, text]) =>
          `<div class="ph-vm ${who === 'me' ? 'me' : ''}"><span class="ph-vmw"><i>▶</i>${'<b></b>'.repeat(9)}<small>0:0${2 + (text.length % 7)}</small></span><p>${esc(text)}</p></div>`
      )
      .join('');
    this.view.innerHTML = `<div class="ph-call${ring ? ' ring' : ''}"><div class="ph-callhead"><span class="ph-av ph-callav" style="background:${c.color}">${c.avatar}</span>
      <b>${esc(c.name)}</b><small>${ring ? '來電中…' : done ? '語音訊息播完了，可以掛斷' : '通話中・語音訊息'}</small></div>
      ${ring ? '' : `<div class="ph-vms">${lines}${!done ? '<div class="ph-vm"><span class="ph-typing"><i></i><i></i><i></i></span></div>' : ''}</div>`}
      <div class="ph-callbtns">${
        ring
          ? '<button class="ph-cb no" data-c="no"><i>✆</i><small>拒絕 <kbd>2</kbd></small></button><button class="ph-cb yes" data-c="yes"><i>✆</i><small>接聽 <kbd>1</kbd></small></button>'
          : `<button class="ph-cb no" data-c="end" ${done ? '' : 'disabled'}><i>✆</i><small>掛斷 <kbd>1</kbd></small></button>`
      }</div></div>`;
    this.view.querySelectorAll('[data-c]').forEach(
      (b) =>
        (b.onclick = () => {
          const k = b.dataset.c;
          if (k === 'yes') this._callAnswer();
          else if (k === 'no') this._callEnd(true);
          else this._callEnd(false);
        })
    );
    const v = this.view.querySelector('.ph-vms');
    if (v) v.scrollTop = v.scrollHeight;
  }
  _callAnswer() {
    const c = this.call;
    if (!c || c.state !== 'ring') return;
    c.state = 'talk';
    this.g.audio.pickup?.();
    this._callView();
    const next = () => {
      if (this.call !== c || c.shown >= c.lines.length) return;
      c.shown++;
      this.g.audio.pop?.();
      if (this.open) this._callView();
      if (c.shown < c.lines.length)
        setTimeout(next, 900 + Math.min(1600, c.lines[c.shown - 1][1].length * 45));
    };
    setTimeout(next, 700);
  }
  _callKeys(inp) {
    const c = this.call,
      done = c.state === 'talk' && c.shown >= c.lines.length;
    if (c.state === 'ring') {
      if (inp.hit('Digit1', 'Numpad1', 'Enter', 'Space')) this._callAnswer();
      else if (inp.hit('Digit2', 'Numpad2', 'Escape', 'Backspace', 'KeyE')) {
        this._callEnd(true);
        return this.open ? null : 'closed';
      }
    } else if (done && inp.hit('Digit1', 'Numpad1', 'Enter', 'Space', 'Escape', 'KeyE')) {
      this._callEnd(false);
      return this.open ? null : 'closed';
    }
    return null;
  }
  _callEnd(declined) {
    const c = this.call;
    if (!c) return;
    this.call = null;
    this._ending = true;
    if (this.open) this.close();
    this._ending = false;
    this._last = null;
    if (declined) {
      this.g.hud.toast(`📵 未接來電：${c.name}`, 'bad', 2400);
      c.onDecline?.();
    } else c.onEnd?.();
  }

  // ---------------- messages ----------------
  // game minute of a chat's newest message: stamped when a message arrives (st.lastAt, saved); chats that only have
  // their scripted history are placed by its last day separator and HH:MM, all before the game's first minute (the
  // scripts were written for an evening start), so anything sent or received in play is always newer
  _lastAt(st) {
    if (st.lastAt != null) return st.lastAt;
    let day = -4,
      t = 0;
    for (const m of st.msgs) {
      if (m.day) {
        day = m.day === '今天' ? -1 : m.day === '昨天' ? -2 : -3;
        t = 0;
      } else if (m.time) {
        const [h, mm] = m.time.split(':').map(Number);
        t = h * 60 + mm;
      }
    }
    return day * 1440 + t;
  }
  // the chat list is on screen: redraw it so a conversation with a new message moves to the top
  _relist() {
    if (this.open && this.app === 'messages' && !this.cur) this._rerender(() => this._messages());
  }
  _messages() {
    this.cur = null;
    // pinned chats (彥霖's girlfriend) first, then newest conversation first (stable, so ties keep their order);
    // the keyboard selection stays on the same chat
    const selSt = this.chats[this.sel];
    this.chats = this.chats
      .map((st, k) => ({ st, k, p: st.c.pinned ? 1 : 0, t: this._lastAt(st) }))
      .sort((a, b) => b.p - a.p || b.t - a.t || a.k - b.k)
      .map((x) => x.st);
    if (selSt) this.sel = this.chats.indexOf(selSt);
    const rows = this.chats
      .map((st, i) => {
        const last = [...st.msgs].reverse().find((m) => m.text);
        const who =
          last && st.c.group && last.who !== 'me'
            ? `${last.who}：`
            : last && last.who === 'me'
              ? '你：'
              : '';
        return `<button class="ph-chatrow${st.c.pinned ? ' pinned' : ''}" data-i="${i}"><span class="ph-av" style="background:${st.c.color}">${st.c.avatar}${st.c.pinned ? '<i class="ph-pin" title="置頂"></i>' : ''}</span>
        <span class="ph-cr-main"><b>${esc(st.c.name)}</b><small>${esc(who + (last ? last.text : ''))}</small></span>
        <span class="ph-cr-side"><small>${last?.time || ''}</small>${st.unread ? `<i>${st.unread}</i>` : ''}</span></button>`;
      })
      .join('');
    // 好友: everyone you can message one-on-one (吱吱 joins once you add him at the 體育館)
    const tab = this._msgTab || 'chats';
    const friends = this.chats.map((st, i) => ({ st, i })).filter((x) => !x.st.c.group);
    const frRows = friends
      .map(
        ({
          st,
          i,
        }) => `<button class="ph-frrow" data-i="${i}"><span class="ph-av" style="background:${st.c.color}">${st.c.avatar}</span>
        <span class="ph-cr-main"><b>${esc(st.c.name)}</b><small>${esc(st.c.sub || '')}</small></span><span class="ph-fr-go">💬</span></button>`
      )
      .join('');
    const tabs = `<div class="pg-tabs ph-msgtabs"><button class="${tab === 'chats' ? 'on' : ''}" data-mt="chats">💬 聊天</button><button class="${tab === 'friends' ? 'on' : ''}" data-mt="friends">👥 好友 ${friends.length}</button></div>`;
    const c = this._frame(
      '訊息',
      tab === 'chats'
        ? `${tabs}<div class="ph-search">🔍 搜尋</div>${rows}`
        : `${tabs}<div class="ph-sec">好友 ${friends.length} 位</div>${frRows}<div class="ph-note">在校園裡和同學聊天，就有機會加他們好友 🤝</div>`,
      { right: '✎' }
    );
    c.querySelectorAll('[data-mt]').forEach(
      (b) =>
        (b.onclick = () => {
          this._msgTab = b.dataset.mt;
          this._messages();
        })
    );
    c.querySelectorAll('.ph-chatrow, .ph-frrow').forEach(
      (b) => (b.onclick = () => this.openChat(this.chats[+b.dataset.i]))
    );
    if (tab === 'chats') this._listSel(this.sel);
  }
  _listSel(i) {
    this.sel = Math.max(0, Math.min(this.chats.length - 1, i));
    this.view
      .querySelectorAll('.ph-chatrow')
      .forEach((b, k) => b.classList.toggle('sel', k === this.sel));
    this.view.querySelector('.ph-chatrow.sel')?.scrollIntoView({ block: 'nearest' });
  }
  openChat(st) {
    this.app = 'messages';
    this.cur = st;
    st.unread = 0;
    this.sel = this.chats.indexOf(st);
    const c = this.view;
    const C = st.c;
    this._frameKey = `chat|${st.c.id}`;
    if (Nano.on) Nano.sessionFor(st).catch(() => {}); // warm up: the first session after Chrome starts takes ~20 s
    c.innerHTML = `<div class="ph-appview ph-chat"><div class="ph-nav ph-chatnav"><button class="ph-back">‹</button>
      <div class="ph-chathead"><span class="ph-av" style="background:${C.color}">${C.avatar}</span><b>${esc(C.name)}</b><small>${esc(C.sub)}</small><i class="ph-ai"></i></div><span>📹</span></div>
      <div class="ph-thread"></div><div class="ph-compose"></div></div>`;
    c.querySelector('.ph-back').onclick = () => this.openApp('messages');
    if (Nano.state === 'downloadable') Nano.download(); // the key press / tap that opened the chat counts as the user gesture
    this._renderThread();
    this._renderCompose();
  }
  _bubble(m, st) {
    if (m.day) return `<div class="ph-day">${esc(m.day)}</div>`;
    if (m.typing)
      return `<div class="ph-msg them"><span class="ph-typing"><i></i><i></i><i></i></span></div>`;
    const me = m.who === 'me',
      name = st.c.group && !me ? `<small class="ph-from">${esc(m.who)}</small>` : '';
    if (m.video)
      return `<div class="ph-msg ${me ? 'me' : 'them'}">${name}<button class="ph-video" data-video="${esc(m.video)}"><i>▶</i><b>${esc(m.text.replace(/^\[影片\]\s*/, ''))}</b><small>點一下播放</small></button>${m.time ? `<small class="ph-t">${m.time}</small>` : ''}</div>`;
    const file = /^\[(檔案|圖片)\]/.test(m.text);
    return `<div class="ph-msg ${me ? 'me' : 'them'}">${name}<span class="${file ? 'file' : ''}">${esc(m.text)}</span>${m.time ? `<small class="ph-t">${m.time}</small>` : ''}</div>`;
  }
  _renderThread() {
    const st = this.cur;
    if (!st) return;
    const t = this.view.querySelector('.ph-thread');
    t.innerHTML =
      st.msgs.map((m) => this._bubble(m, st)).join('') +
      (st.read ? '<div class="ph-read">已讀</div>' : '');
    t.querySelectorAll('.ph-video').forEach(
      (b) =>
        (b.onclick = () => {
          this.g.audio.tap?.();
          this.g.zzQuest?.playVideo(b.dataset.video);
        })
    );
    t.scrollTop = t.scrollHeight;
  }
  // options for the next message: scripted rounds first; after those, Gemini Nano (Chrome) suggests two more forever
  // A contact's `always` options (勞大's 你在哪？) are offered on every turn, after the others.
  // While a quest line is waiting for your answer (an `always` option with lock, e.g. 吱吱's 武嶺 invite) it is the only
  // thing you can send: no other topics, no 你在哪？, no AI options or typing box.
  _options(st) {
    const L = this._locked(st);
    if (L) return L;
    const R = st.c.script[st.round],
      A = this._always(st);
    const base = R
      ? R.choices
      : Nano.on && st.aiOpts?.length
        ? st.aiOpts.map((t) => ({ t, ai: true }))
        : [];
    return base.length || A.length ? [...base, ...A] : null;
  }
  // a contact's `always` options; one with when(game) is offered only while that holds (吱吱's quest lines, src/systems/quests/ZzInjury.js)
  _always(st) {
    return (st.c.always || []).filter((a) => !a.when || a.when(this.g));
  }
  // the quest options that lock the chat right now (see _options), or null
  _locked(st) {
    const L = this._always(st).filter((a) => a.lock);
    return L.length ? L : null;
  }
  _renderCompose() {
    const st = this.cur;
    if (!st) return;
    const box = this.view.querySelector('.ph-compose');
    const tag = this.view.querySelector('.ph-ai');
    if (tag) {
      tag.textContent = Nano.on
        ? '✨ Gemini Nano'
        : Nano.state === 'downloading'
          ? `⬇ AI ${Math.round(Nano.progress * 100)}%`
          : '';
    }
    // scripted topics used up: the AI opens a new one (also when only `always` options like 你在哪？ are left)
    if (
      Nano.on &&
      !this._locked(st) &&
      !st.c.script[st.round] &&
      !st.aiOpts?.length &&
      !st.busy &&
      !st.optsPending
    )
      this._aiOpener(st);
    // with the on-device AI you can also type your own message; keep what you typed across re-renders
    const old = box.querySelector('.ph-type'),
      typed = old ? old.value : '',
      hadFocus = !!old && document.activeElement === old;
    // the typing box (AI on) is selectable like an option (blue when chosen); ↑ sends what is in the box. Clicking an
    // option puts its words in the box, so you send it (or change it first) from there.
    const typeRow = (ph, on) =>
      `<div class="ph-input ph-typerow ${on ? 'on' : ''}"><input class="ph-type" maxlength="80" autocomplete="off" spellcheck="false" placeholder="${esc(ph)}"><button class="ph-send" ${st.busy && !this._thinking(st) ? 'disabled' : ''}>↑</button></div>`;
    // AI paused after it stopped answering (src/ui/phone/Nano.js _stall): the box stays, greyed out, saying why
    const pausedRow = Nano.stalled
      ? '<div class="ph-input ph-typerow ph-typeoff"><input class="ph-type" disabled placeholder="AI 暫時沒回應，先用上面的選項聊"></div>'
      : '';
    const opts = this._options(st);
    if (!opts) {
      if (Nano.on) {
        box.innerHTML = `<div class="ph-done">✨ Gemini Nano 正在想新話題…</div>${typeRow('自己輸入訊息…', true)}`;
        this._bindType(box, typed, hadFocus);
      } else
        box.innerHTML = `<div class="ph-done">目前沒有新的話題了${Nano.state === 'downloading' ? '<br><small>AI 模型下載完成後就能無限聊天</small>' : ''}</div>`;
      return;
    }
    const free = this._typing(st); // the typing box (AI on, chat not locked by a quest line)
    st.choice = Math.min(st.choice, opts.length - (free ? 0 : 1));
    box.innerHTML = `<div class="ph-choices">${opts.map((ch, i) => `<button class="ph-choice ${i === st.choice ? 'on' : ''}" data-i="${i}"><kbd>${i + 1}</kbd>${esc(ch.t)}</button>`).join('')}</div>
      ${free ? typeRow('自己輸入，或點選項帶入…', st.choice === opts.length) : `<div class="ph-input"><span>${esc(opts[st.choice].t)}</span><button class="ph-send" ${st.busy && !this._thinking(st) ? 'disabled' : ''}>↑</button></div>${pausedRow}`}
      <div class="ph-tabhint">${dual('<kbd>↑</kbd><kbd>↓</kbd> 或 <kbd>1</kbd><kbd>2</kbd> 選擇　<kbd>Tab</kbd> 傳送', '{Up}{Down} 選擇　{A} 傳送')}${free ? (Nano.on ? '　· ✨ AI 無限對話・點選項帶入輸入框' : '　· 也可以自己打字・點選項帶入輸入框') : ''}</div>`;
    // AI on: a click puts the option's words in the typing box; keyboard / pad still pick and send options directly
    box
      .querySelectorAll('.ph-choice')
      .forEach(
        (b) =>
          (b.onclick = () =>
            free ? this._fillType(opts[+b.dataset.i].t) : this._pick(+b.dataset.i))
      );
    if (!free) box.querySelector('.ph-send').onclick = () => this._send();
    this._bindType(box, typed, hadFocus);
    const t = this.view.querySelector('.ph-thread');
    if (t) t.scrollTop = t.scrollHeight; // compose height changed
  }
  // the free-typing box (Nano on): Enter sends what you typed (not while an IME is still composing), Esc leaves the box;
  // other keys stay in the box instead of reaching the game
  _bindType(box, typed, focus) {
    const el = box.querySelector('.ph-type');
    if (!el || el.disabled) return;
    el.value = typed || '';
    // empty the box before sending: _send re-renders the compose area, which carries over whatever is still in the box
    const go = () => {
      const t = el.value.trim();
      if (!this.cur || !t) {
        this._focusType();
        return;
      } // ↑ sends only what is in the box
      el.value = '';
      if (this._send(t) === false) {
        const now = this.view.querySelector('.ph-type');
        if (now) now.value = t;
      }
    };
    // focusing the box makes it the chosen item (blue), without re-rendering (that would drop the focus)
    el.onfocus = () => this._selBox();
    el.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        go();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        el.blur();
      }
    };
    el.onkeyup = (e) => e.stopPropagation();
    box.querySelector('.ph-typerow .ph-send').onclick = go;
    if (focus) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      this._selBox();
    }
  }
  _selBox() {
    const st = this.cur,
      box = this.view.querySelector('.ph-compose');
    if (!st || !box) return;
    st.choice = this._options(st)?.length || 0;
    box.querySelectorAll('.ph-choice.on').forEach((b) => b.classList.remove('on'));
    box.querySelector('.ph-typerow')?.classList.add('on');
  }
  // still waiting for the AI (not yet typing its answer): you can still pick and send (see _send)
  _thinking(st) {
    return !!st.busy && st.aiWait != null && st.aiWait === st.tok;
  }
  // the typing box is on (AI on, or a contact you can always type to like 勞大; chat not locked by a quest line)
  _typing(st) {
    return !!st && (Nano.on || !!st.c.typing) && !this._locked(st);
  }
  _focusType() {
    const el = this.view.querySelector('.ph-type');
    if (el && !el.disabled) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      this._selBox();
    }
  }
  // put an option's words in the typing box (and select it) so you can send or edit them
  _fillType(text) {
    const st = this.cur;
    if (!st) return;
    st.choice = this._options(st)?.length || 0;
    this._renderCompose();
    const el = this.view.querySelector('.ph-type');
    if (!el) return;
    el.value = text;
    this._focusType();
  }
  _pick(i) {
    const st = this.cur;
    if (!st || (st.busy && !this._thinking(st))) return;
    const o = this._options(st);
    if (!o) return;
    const n = o.length + (this._typing(st) ? 1 : 0);
    st.choice = Math.min(i, n - 1);
    const el = this.view.querySelector('.ph-type');
    if (el && document.activeElement === el) el.blur(); // keys go back to picking
    this._renderCompose();
    if (this._typing(st) && st.choice === o.length) this._focusType();
  }
  // typed = your own words (AI chats only); an `always` option with a `match` that fits them is answered by it instead
  // returns false when nothing was sent (the typed text then stays in the box)
  _send(typed) {
    const st = this.cur;
    if (!st) return false;
    const think = this._thinking(st);
    if (st.busy && !think) return false;
    const opts = this._options(st);
    if (!opts && !typed) return false;
    const g = this.g;
    const lock = this._locked(st);
    const ch = pickSent(opts, lock || this._always(st), typed, st.choice);
    if (!ch || (lock && !ch.lock)) return false; // locked: only the quest line goes out
    // the AI is still thinking (a reply or a new topic it opens): you don't have to wait, sending anything drops the
    // answer it was working on (the on-device model can take long or stall)
    if (think) {
      st.tok++;
      st.aiAbort?.abort();
      st.busy = false;
      st.pending = null;
      st.msgs = st.msgs.filter((m) => !m.typing);
    }
    // its options for you were still being written: drop them (and free the model for this message)
    if (st.optsPending) {
      st.optsPending = false;
      st.aiAbort?.abort();
    }
    st.busy = true;
    st.read = false;
    st.msgs.push({ who: 'me', text: ch.t, time: hhmm(g.clock) });
    st.lastAt = g.clock;
    // a contact with `laugh` (勞大) always ends his answer with that line when you laughed
    st._laughNext = st.c.laugh && /哈哈|笑死|XD|lol|LOL|😂|🤣/.test(ch.t) ? st.c.laugh : null;
    // 彩蛋：罵勞大（src/systems/LaodaInsult.js）—— 在他的聊天室罵他，或在別人的聊天室提到他罵：他衝過來肘擊你
    // （src/entities/Pilot.js provoke）。他的聊天室：先回你幾句（Chats.js insulted），回完就出發
    const W = g.airdrop?.walker,
      toHim = st.c.id === 'laoda';
    if (W && insultsLaoda(ch.t, toHim)) {
      if (toHim) {
        st.choice = 0;
        st.aiOpts = null;
        g.audio.send?.();
        this._renderThread();
        this._renderCompose();
        setTimeout(() => {
          st.read = true;
          if (this.cur === st) this._renderThread();
        }, 350);
        const r = st.c.insulted?.(g) || ['Man……'];
        this._deliver(
          st,
          r.map((text) => ({ who: st.c.id, text })),
          0,
          650,
          () => W.provoke()
        );
        return;
      }
      W.provoke();
      g.hud.toast('📱 這句話好像傳到勞大那邊了……他正在過來', 'bad', 2800);
    }
    if (ch.ask) {
      // an `always` option: its reply is worked out from the game right now, then it may act (e.g. set a route)
      st.choice = 0;
      g.audio.send?.();
      this._renderThread();
      this._renderCompose();
      setTimeout(() => {
        st.read = true;
        if (this.cur === st) this._renderThread();
      }, 350);
      const out = ch.ask(g);
      this._deliver(
        st,
        out.r.map((x) =>
          typeof x === 'string' ? { who: st.c.id, text: x } : { who: st.c.id, ...x }
        ),
        0,
        650,
        out.then
      ); // an object: a video message (吱吱)
      return;
    }
    if (!ch.ai) st.round++;
    st.choice = 0;
    st.aiOpts = null;
    g.audio.send?.();
    this._renderThread();
    this._renderCompose();
    setTimeout(() => {
      st.read = true;
      if (this.cur === st) this._renderThread();
    }, 350);
    const scripted = ch.r
      ? ch.r.map((r) => (Array.isArray(r) ? { who: r[0], text: r[1] } : { who: st.c.id, text: r }))
      : null;
    // votes: scripted choices carry their own; AI small talk gives +1 every 3 messages, up to 3 per contact
    let v = ch.v || 0;
    if (ch.ai && Nano.on) {
      // (only with the AI: typing to 勞大 without it earns nothing)
      st.aiSent = (st.aiSent || 0) + 1;
      if (st.aiSent % 3 === 0 && (st.aiVotes || 0) < 3) {
        st.aiVotes = (st.aiVotes || 0) + 1;
        v = 1;
      }
    }
    const fallback = scripted || [
      { who: st.c.group ? (st.members || [st.c.name])[0] : st.c.id, text: this._filler(st) },
    ];
    // scripted options always get their written reply (no AI); the AI only answers your own words and its own topics
    if (Nano.on && !scripted) {
      // typing indicator while the on-device model thinks
      setTimeout(() => {
        if (st.busy && !st.msgs.some((m) => m.typing)) {
          st.msgs.push({ typing: true });
          if (this.cur === st) this._renderThread();
        }
      }, 600);
      // what arrives if the game is reloaded while the model is still thinking (saved with the chat)
      st.pending = { replies: fallback, v };
      const tok = (st.tok = st.aiWait = (st.tok || 0) + 1),
        mine = () => st.tok === tok && st.busy;
      if (this.cur === st) this._renderCompose(); // 你在哪？ stays usable while it thinks
      // the on-device model can stall: after REPLY_LIMIT the normal reply comes instead, so the chat never hangs
      st.aiAbort = new AbortController();
      withTimeout(Nano.reply(st, ch.t, st.aiAbort.signal, this._early(st, tok, v)), REPLY_LIMIT)
        .then((out) => {
          if (out.early) return this._lateOpts(st, tok, out.options);
          if (!mine()) return;
          st.tok++;
          st.aiOpts = out.options?.length === 2 ? out.options : null;
          this._deliver(
            st,
            out.replies?.length ? out.replies : fallback,
            v,
            150,
            null,
            !!out.replies?.length
          );
        })
        .catch(() => {
          if (st.optsPending && st.tok === tok) return this._lateOpts(st, tok, null);
          if (!mine()) return;
          st.tok++;
          // the AI failed or timed out: stock reply plus stock topics, so it doesn't start another (maybe just as slow) AI round
          st.aiOpts = ['最近在忙什麼？', '有空幫我宣傳一下嗎 🙏'];
          this._deliver(st, fallback, v, 300);
        });
    } else this._deliver(st, fallback, v, 650);
  }
  // a stock reply (no AI); a contact may have its own (勞大's 「Man」)
  _filler(st) {
    const f = st?.c.filler || [
      '哈哈好啊',
      '收到 👍',
      '真的假的 😂',
      '好喔～',
      '有道理欸',
      '晚點再聊！',
    ];
    return f[Math.floor(Math.random() * f.length)];
  }
  // AI asks first when the scripted topics have run out
  _aiOpener(st) {
    st.busy = true;
    const tok = (st.tok = st.aiWait = (st.tok || 0) + 1),
      mine = () => st.tok === tok && st.busy;
    st.aiAbort = new AbortController();
    withTimeout(Nano.reply(st, null, st.aiAbort.signal, this._early(st, tok, 0)), REPLY_LIMIT)
      .then((out) => {
        if (out.early) return this._lateOpts(st, tok, out.options);
        if (!mine()) return;
        st.tok++;
        st.aiOpts =
          out.options?.length === 2 ? out.options : ['最近在忙什麼？', '要不要一起吃宵夜？'];
        this._deliver(st, out.replies || [], 0, 150, null, true);
      })
      .catch(() => {
        if (st.optsPending && st.tok === tok) return this._lateOpts(st, tok, null);
        if (!mine()) return;
        st.tok++;
        st.aiOpts = ['最近在忙什麼？', '有空幫我宣傳一下嗎 🙏'];
        st.busy = false;
        if (this.cur === st) this._renderCompose();
      });
  }
  // the AI's replies are out before it has written your two options (src/ui/phone/Nano.js onReplies): show them right away; the
  // options follow (_lateOpts). Meanwhile it no longer counts as thinking, and no new topic is started.
  _early(st, tok, v) {
    return (rs) => {
      if (st.tok !== tok || !st.busy) return;
      st.aiWait = null;
      st.optsPending = true;
      st.msgs = st.msgs.filter((m) => !m.typing);
      this._deliver(st, rs, v, 100, null, true);
    };
  }
  _lateOpts(st, tok, opts) {
    if (st.tok !== tok) return; // you have sent something since
    st.optsPending = false;
    st.aiOpts = opts?.length === 2 ? opts : ['最近在忙什麼？', '有空幫我宣傳一下嗎 🙏'];
    if (this.cur === st && !st.busy) this._renderCompose();
  }
  // replies arrive one by one with a typing indicator; they land even if you leave the chat or put the phone away
  // (timers keep running). st.pending holds what is still to come, so a reload in between resumes it (resumePending).
  // quick: the AI's replies (it already took its time), shown with a short typing pause
  _deliver(st, replies, v, delay, then, quick) {
    const g = this.g;
    // 勞大's 「孩子們，這並不好笑」: the AI tends to sprinkle it everywhere; it comes once, at the end, only when you laughed
    const L = st.c.laugh;
    if (L && quick)
      replies = replies
        .map((r) => ({
          ...r,
          text: r.text
            .split(L)
            .join('')
            .replace(/^[\s，,。!！]+|[\s，,。!！]+$/gu, '')
            .trim(),
        }))
        .filter((r) => r.text);
    if (st._laughNext) {
      st._laughNext = null;
      replies = [...replies.filter((r) => r.text.trim() !== L), { who: st.c.id, text: L }];
    }
    st.busy = true;
    st.pending = { replies: replies.slice(), v };
    const dropTyping = () => {
      const ti = st.msgs.findIndex((m) => m.typing);
      if (ti >= 0) st.msgs.splice(ti, 1);
    };
    replies.forEach((rp, k) => {
      setTimeout(() => {
        dropTyping();
        st.msgs.push({ typing: true });
        if (this.cur === st) this._renderThread();
      }, delay);
      delay += quick
        ? 250 + Math.min(500, rp.text.length * 12)
        : 600 + Math.min(1500, rp.text.length * 40);
      setTimeout(() => {
        dropTyping();
        st.msgs.push({ ...rp, time: hhmm(g.clock) });
        st.lastAt = g.clock;
        if (st.pending) st.pending.replies.shift();
        // not looking at this chat (phone away, another app or another chat): unread badge, sound and a notice
        if (this.cur === st && this.open) this._renderThread();
        else {
          st.unread++;
          g.audio.notify?.();
          this._relist();
          g.hud.toast(`📱 ${st.c.group ? rp.who : st.c.name}：${rp.text}`, 'good', 2600);
        }
        g.audio.pickup?.();
        if (k === replies.length - 1) {
          st.busy = false;
          st.pending = null;
          if (this.cur === st) this._renderCompose();
          if (v) g.addVotes(v, `${st.c.group ? '競選小組' : st.c.name}幫你拉票 +${v} 票`);
          then?.();
        }
      }, delay);
      delay += 250;
    });
    if (!replies.length) {
      dropTyping();
      st.busy = false;
      st.pending = null;
      if (this.cur === st) {
        this._renderThread();
        this._renderCompose();
      }
    }
  }
  // after loading a save: drop leftover typing bubbles and deliver replies that were still on their way
  resumePending() {
    for (const st of this.chats) {
      st.msgs = st.msgs.filter((m) => !m.typing);
      st.busy = false;
      const p = st.pending;
      st.pending = null;
      if (p?.replies?.length) this._deliver(st, p.replies, p.v || 0, 2500);
    }
  }
}
