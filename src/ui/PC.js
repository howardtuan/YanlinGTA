// 彥霖's old desktop computer (2F of 孫師傅牛肉拉麵). A small desktop with windows you can drag:
// 瀏覽器 (a real browser: pages load in an iframe; sites that forbid being embedded can be opened in a
// new tab instead), 記事本 (kept in the save), 小畫家 (save the drawing to the phone's photos),
// 小算盤, 踩地雷, 競選後台 (live campaign numbers), 資管學堂 (Python / MySQL lessons you run and get graded) and 終端機. Esc or the power button leaves the desk.
// The easter-egg video is hidden in the terminal: typing PYL plays it. It is deliberately not listed anywhere.
// The terminal's `case` command is the detective console (js/detective.js, SQL); 🕵️ 案件檔案 lists the cases and your clues.
// The desktop fills the whole screen; windows can be maximized (▢ or double-click the title bar).
// The same desktop runs on 彥霖's old computer and on the 資管系館 computer-lab PCs (open(title)).
import { stockUI } from './phone/StockUI.js';
import { newsUI } from './phone/NewsUI.js';
import { learnUI } from '../systems/minigames/Learn.js';
const $ = (id) => document.getElementById(id);
const _esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const BOOKMARKS = [
  ['📘', '中原大學 - 維基百科', 'https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%8E%9F%E5%A4%A7%E5%AD%B8'],
  ['🗺️', '中原大學地圖', 'https://www.openstreetmap.org/export/embed.html?bbox=121.2330%2C24.9520%2C121.2500%2C24.9640&layer=mapnik'],
  ['📍', 'Google 地圖', 'https://maps.google.com/maps?q=%E4%B8%AD%E5%8E%9F%E5%A4%A7%E5%AD%B8&hl=zh-TW&z=16&output=embed'],
  ['🍜', '牛肉麵 - 維基百科', 'https://zh.wikipedia.org/wiki/%E7%89%9B%E8%82%89%E9%BA%B5'],
  ['🌐', '中原大學官網', 'https://www.cycu.edu.tw/'],
];
const APPS = [
  ['browser', '🌐', '瀏覽器'], ['notes', '📝', '記事本'], ['paint', '🎨', '小畫家'],
  ['calc', '🧮', '小算盤'], ['mines', '💣', '踩地雷'], ['stats', '📊', '競選後台'], ['stock', '📈', '靈感股'], ['news', '📰', 'PYtoday'], ['learn', '🎓', '資管學堂'], ['case', '🕵️', '案件檔案'], ['term', '💻', '終端機'],
];
// where some windows open on the (full-screen) desktop: [left, top, width, height]; others cascade
const LAYOUT = { term: ['0px', '0px', '60%', 'calc(100% - 42px)'], case: ['60%', '0px', '40%', 'calc(100% - 42px)'] };
const MAXED = new Set(['learn']); // opened maximized
const DEFAULT_NOTES = '競選待辦：\n- 掃街拉票，發完傳單\n- 去麥當勞打工賺零用錢\n- 新中北路障礙賽要拿第一\n- 記得月底前繳房租！\n';

export class PC {
  constructor(game) {
    this.g = game; this.isOpen = false; this.notes = DEFAULT_NOTES; this.z = 10; this.wins = {};
    const el = this.el = document.createElement('div');
    el.id = 'pc'; el.className = 'pc hidden';
    el.innerHTML = `<div class="pc-monitor"><div class="pc-screen" id="pcScreen">
      <div class="pc-icons">${APPS.map(([id, ic, n]) => `<button class="pc-icon" data-app="${id}"><span>${ic}</span><small>${n}</small></button>`).join('')}</div>
      <div class="pc-wall">資管要贏　票投彥霖</div>
      <div id="pcWins"></div>
      <div class="pc-task"><button class="pc-start" id="pcStart">🪟 彥霖的電腦</button><div class="pc-tabs" id="pcTabs"></div><span class="pc-clock" id="pcClock"></span><button class="pc-power" id="pcPower" title="離開電腦（Esc）">⏻</button></div>
      <div class="pc-menu hidden" id="pcMenu">${APPS.map(([id, ic, n]) => `<button data-app="${id}">${ic} ${n}</button>`).join('')}<hr><button id="pcLeave">⏻ 離開電腦</button></div>
    </div></div>`;
    document.body.appendChild(el);
    for (const b of el.querySelectorAll('[data-app]')) b.onclick = () => { $('pcMenu').classList.add('hidden'); this.launch(b.dataset.app); };
    $('pcStart').onclick = () => $('pcMenu').classList.toggle('hidden');
    $('pcPower').onclick = () => this.close();
    $('pcLeave').onclick = () => this.close();
    addEventListener('keydown', (e) => { if (this.isOpen && e.code === 'Escape') { e.preventDefault(); this.close(); } });
  }
  open(title = '彥霖的電腦') {
    if (this.isOpen) return;
    $('pcStart').textContent = `🪟 ${  title}`;
    this.isOpen = true; this.el.classList.remove('hidden');
    this.g.input.enabled = false; this.g.input.releaseAll(); document.exitPointerLock?.();
    this.g.audio.blip?.();
    this._tick = setInterval(() => this._clock(), 1000); this._clock();
    if (!Object.keys(this.wins).length) this.launch('browser');
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; this.el.classList.add('hidden'); clearInterval(this._tick);
    this._closeWin('browser'); // a video playing in the browser would keep going otherwise
    this.g.input.enabled = true; this.g._saveT = 9.5;
    if (!this.g.input.touch) this.g.lockPointer();
  }
  _clock() { const c = Math.floor(this.g.clock) % 1440; $('pcClock').textContent = `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`; }

  // ---------------- windows ----------------
  launch(id) {
    if (this.wins[id]) { this._focus(id); return; }
    const app = APPS.find(a => a[0] === id); if (!app) return;
    const n = Object.keys(this.wins).length;
    const w = document.createElement('div'); w.className = `pc-win pc-${  id}`;
    w.style.left = `${196 + n * 26  }px`; w.style.top = `${16 + n * 22  }px`;
    w.innerHTML = `<div class="pc-bar"><span>${app[1]} ${app[2]}</span><span class="pc-btns"><button class="pc-max" title="放到最大 / 還原（也可以雙擊標題列）">▢</button><button class="pc-close" title="關閉">✕</button></span></div><div class="pc-body"></div>`;
    const lay = LAYOUT[id]; if (lay) Object.assign(w.style, { left: lay[0], top: lay[1], width: lay[2], height: lay[3] }); // terminal on the left, case files on the right
    if (MAXED.has(id)) w.classList.add('max');
    $('pcWins').appendChild(w);
    const tab = document.createElement('button'); tab.textContent = `${app[1]} ${app[2]}`; tab.onclick = () => this._focus(id); $('pcTabs').appendChild(tab);
    this.wins[id] = { w, tab };
    w.querySelector('.pc-close').onclick = () => this._closeWin(id);
    const max = () => w.classList.toggle('max');
    w.querySelector('.pc-max').onclick = max; w.querySelector('.pc-bar').addEventListener('dblclick', (e) => { if (!e.target.closest('button')) max(); });
    w.addEventListener('mousedown', () => this._focus(id));
    this._drag(w, w.querySelector('.pc-bar'));
    this[`_${  id}`](w.querySelector('.pc-body'));
    this._focus(id);
  }
  _closeWin(id) {
    const o = this.wins[id]; if (!o) return;
    o.cleanup?.(); o.w.remove(); o.tab.remove(); delete this.wins[id];
  }
  _focus(id) {
    for (const [k, o] of Object.entries(this.wins)) o.tab.classList.toggle('on', k === id);
    const o = this.wins[id]; if (o) o.w.style.zIndex = ++this.z;
  }
  _drag(w, bar) {
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const sx = e.clientX - w.offsetLeft, sy = e.clientY - w.offsetTop, scr = $('pcScreen');
      const mv = (ev) => {
        w.style.left = `${Math.max(-w.offsetWidth + 80, Math.min(scr.clientWidth - 80, ev.clientX - sx))  }px`;
        w.style.top = `${Math.max(0, Math.min(scr.clientHeight - 60, ev.clientY - sy))  }px`;
      };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
  }

  // ---------------- 瀏覽器 ----------------
  _browser(body) {
    body.innerHTML = `<div class="br-tool">
        <button data-b="back" title="上一頁">←</button><button data-b="fwd" title="下一頁">→</button><button data-b="reload" title="重新整理">⟳</button><button data-b="home" title="首頁">⌂</button>
        <input class="br-url" spellcheck="false" placeholder="輸入網址或搜尋（維基百科）">
        <button data-b="go">前往</button><button data-b="ext" title="在新分頁開啟（不能嵌入的網站用這個）">↗</button>
      </div>
      <div class="br-marks">${BOOKMARKS.map(([i, n, u], k) => `<button data-m="${k}">${i} ${n}</button>`).join('')}</div>
      <div class="br-view"><div class="br-home"></div><iframe class="br-frame hidden" referrerpolicy="no-referrer" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
      <div class="br-note">提示：Google 搜尋、Facebook、Instagram 等網站不允許被嵌在別的網頁裡，會顯示空白或「拒絕連線」，按 ↗ 用新分頁開啟。</div>`;
    const url = body.querySelector('.br-url'), frame = body.querySelector('.br-frame'), home = body.querySelector('.br-home');
    const hist = [], st = { i: -1 };
    const show = (u, push = true) => {
      if (!u) { frame.classList.add('hidden'); frame.src = 'about:blank'; home.classList.remove('hidden'); url.value = ''; return; }
      home.classList.add('hidden'); frame.classList.remove('hidden'); frame.src = u; url.value = decodeURI(u);
      if (push) { hist.splice(st.i + 1); hist.push(u); st.i = hist.length - 1; }
    };
    const go = (t) => {
      t = t.trim(); if (!t) return show(null);
      if (/^https?:\/\//i.test(t)) return show(t);
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return show(`https://${  t}`);
      show(`https://zh.wikipedia.org/w/index.php?search=${  encodeURIComponent(t)}`);
    };
    home.innerHTML = `<div class="br-logo">彥霖<b>搜尋</b></div>
      <form class="br-search"><input placeholder="搜尋維基百科，或輸入網址"><button>搜尋</button></form>
      <div class="br-tiles">${BOOKMARKS.map(([i, n], k) => `<button data-m="${k}"><span>${i}</span>${n}</button>`).join('')}</div>`;
    home.querySelector('form').onsubmit = (e) => { e.preventDefault(); go(home.querySelector('form input').value); };
    for (const b of body.querySelectorAll('[data-m]')) b.onclick = () => show(BOOKMARKS[+b.dataset.m][2]);
    url.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(url.value); });
    body.querySelector('[data-b=go]').onclick = () => go(url.value);
    body.querySelector('[data-b=home]').onclick = () => show(null);
    body.querySelector('[data-b=reload]').onclick = () => { if (hist[st.i]) frame.src = hist[st.i]; };
    body.querySelector('[data-b=back]').onclick = () => { if (st.i > 0) show(hist[--st.i], false); else show(null); };
    body.querySelector('[data-b=fwd]').onclick = () => { if (st.i < hist.length - 1) show(hist[++st.i], false); };
    body.querySelector('[data-b=ext]').onclick = () => { const u = hist[st.i]; if (u && !frame.classList.contains('hidden')) window.open(u, '_blank', 'noopener'); };
    this.wins.browser.cleanup = () => { frame.src = 'about:blank'; }; // stop videos when the window closes
  }

  // ---------------- 記事本 ----------------
  _notes(body) {
    body.innerHTML = `<textarea class="nt-area" spellcheck="false"></textarea><div class="nt-foot">自動儲存 · <span class="nt-n"></span> 字</div>`;
    const ta = body.querySelector('textarea'), n = body.querySelector('.nt-n');
    ta.value = this.notes; n.textContent = ta.value.length;
    ta.addEventListener('input', () => { this.notes = ta.value; n.textContent = ta.value.length; this.g._saveT = 8; });
    setTimeout(() => ta.focus(), 30);
  }

  // ---------------- 小畫家 ----------------
  _paint(body) {
    const cols = ['#111111', '#ffffff', '#e8323c', '#ff9f0a', '#ffd23f', '#3fae49', '#2f7fd8', '#8e44ad', '#d8aeab', '#8a5a3a'];
    body.innerHTML = `<div class="pt-tool">${cols.map(c => `<button class="pt-c" data-c="${c}" style="background:${c}"></button>`).join('')}
      <select class="pt-size"><option value="3">細</option><option value="7" selected>中</option><option value="16">粗</option></select>
      <button class="pt-clear">清除</button><button class="pt-save">📷 存到手機相簿</button></div>
      <canvas class="pt-cv" width="560" height="320"></canvas>`;
    const cv = body.querySelector('canvas'), g = cv.getContext('2d'); let col = '#111111', down = false, lx = 0, ly = 0;
    const clear = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#e8323c'; g.font = '900 22px "Noto Sans TC",sans-serif'; g.fillText('資管要贏 票投彥霖', 14, 34); };
    clear();
    const sel = (b) => { for (const x of body.querySelectorAll('.pt-c')) x.classList.toggle('on', x === b); col = b.dataset.c; };
    for (const b of body.querySelectorAll('.pt-c')) b.onclick = () => sel(b);
    sel(body.querySelector('.pt-c'));
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointerdown', (e) => { down = true; [lx, ly] = pos(e); cv.setPointerCapture(e.pointerId); draw(e); });
    cv.addEventListener('pointermove', (e) => { if (down) draw(e); });
    cv.addEventListener('pointerup', () => { down = false; });
    const draw = (e) => { const [x, y] = pos(e); g.strokeStyle = col; g.lineWidth = +body.querySelector('.pt-size').value; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke(); lx = x; ly = y; };
    body.querySelector('.pt-clear').onclick = clear;
    body.querySelector('.pt-save').onclick = () => {
      const ph = this.g.phone; if (ph?.photos) { ph.photos.unshift(cv.toDataURL('image/jpeg', 0.85)); this.g.hud.toast('📷 畫好的圖存到手機相簿了', 'good', 2000); }
    };
  }

  // ---------------- 小算盤 ----------------
  _calc(body) {
    const keys = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    body.innerHTML = `<div class="ca-disp"><small></small><b>0</b></div><div class="ca-keys">${keys.map(k => `<button class="${/[÷×−+=]/.test(k) ? 'op' : ''}">${k}</button>`).join('')}</div>`;
    const big = body.querySelector('.ca-disp b'), small = body.querySelector('.ca-disp small');
    let cur = '0', acc = null, op = null, fresh = false;
    const num = (s) => parseFloat(s) || 0;
    const fmt = (v) => (Number.isFinite(v) ? String(+v.toPrecision(12)) : '錯誤');
    const apply = () => { if (op === null || acc === null) return num(cur); const b = num(cur); return op === '+' ? acc + b : op === '−' ? acc - b : op === '×' ? acc * b : b === 0 ? NaN : acc / b; };
    const render = () => { big.textContent = cur; small.textContent = acc !== null && op ? `${fmt(acc)} ${op}` : ''; };
    for (const b of body.querySelectorAll('button')) b.onclick = () => {
      const k = b.textContent;
      if (/^[0-9]$/.test(k)) { cur = fresh || cur === '0' ? k : cur + k; fresh = false; }
      else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.'; }
      else if (k === 'C') { cur = '0'; acc = null; op = null; }
      else if (k === '⌫') cur = cur.length > 1 ? cur.slice(0, -1) : '0';
      else if (k === '±') cur = fmt(-num(cur));
      else if (k === '%') cur = fmt(num(cur) / 100);
      else if (k === '=') { cur = fmt(apply()); acc = null; op = null; fresh = true; }
      else { acc = op ? apply() : num(cur); op = k; fresh = true; cur = fmt(acc); }
      render();
    };
  }

  // ---------------- 踩地雷 ----------------
  _mines(body) {
    const N = 9, MINES = 10;
    body.innerHTML = `<div class="mn-top"><span class="mn-left"></span><button class="mn-face">🙂</button><span class="mn-t">左鍵翻開・右鍵插旗</span></div><div class="mn-grid"></div>`;
    const grid = body.querySelector('.mn-grid'), face = body.querySelector('.mn-face'), left = body.querySelector('.mn-left');
    let cells, over, opened, flags, first;
    const nb = (i) => { const x = i % N, y = Math.floor(i / N), out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const a = x + dx, b = y + dy; if (a >= 0 && a < N && b >= 0 && b < N) out.push(b * N + a); } return out; };
    const reset = () => {
      cells = Array.from({ length: N * N }, () => ({ mine: false, open: false, flag: false, n: 0 })); over = false; opened = 0; flags = 0; first = true; face.textContent = '🙂';
      grid.innerHTML = cells.map((_, i) => `<button data-i="${i}"></button>`).join(''); left.textContent = `💣 ${MINES}`;
      for (const b of grid.children) { b.onclick = () => click(+b.dataset.i); b.oncontextmenu = (e) => { e.preventDefault(); flag(+b.dataset.i); }; }
    };
    const lay = (safe) => {
      let k = 0; while (k < MINES) { const i = Math.floor(Math.random() * N * N); if (i === safe || nb(safe).includes(i) || cells[i].mine) continue; cells[i].mine = true; k++; }
      cells.forEach((c, i) => { c.n = nb(i).filter(j => cells[j].mine).length; });
    };
    const paint = (i) => {
      const c = cells[i], b = grid.children[i];
      b.className = c.open ? `op${  c.mine ? ' boom' : ''  } n${  c.n}` : c.flag ? 'fl' : '';
      b.textContent = c.open ? (c.mine ? '💣' : c.n || '') : c.flag ? '🚩' : '';
    };
    const reveal = (i) => {
      const st = [i];
      while (st.length) { const j = st.pop(), c = cells[j]; if (c.open || c.flag) continue; c.open = true; opened++; paint(j); if (!c.n && !c.mine) st.push(...nb(j)); }
    };
    const click = (i) => {
      if (over || cells[i].flag) return;
      if (first) { lay(i); first = false; }
      if (cells[i].mine) { over = true; face.textContent = '😵'; cells.forEach((c, j) => { if (c.mine) { c.open = true; paint(j); } }); return; }
      reveal(i);
      if (opened === N * N - MINES) { over = true; face.textContent = '😎'; this.g.hud.toast('💣 踩地雷過關！', 'good', 2000); }
    };
    const flag = (i) => { if (over || cells[i].open) return; cells[i].flag = !cells[i].flag; flags += cells[i].flag ? 1 : -1; left.textContent = `💣 ${MINES - flags}`; paint(i); };
    face.onclick = reset; reset();
  }

  // ---------------- 終端機 ----------------
  // ---------------- PYtoday (wide layout: headlines on the left, the article on the right) ----------------
  _news(body) {
    const ui = newsUI(body, this.g, { wide: true });
    const t = setInterval(() => ui.refresh(), 1000);
    this.wins.news.cleanup = () => clearInterval(t);
  }
  // ---------------- 資管學堂: online Python / MySQL course (js/learn.js) ----------------
  _learn(body) { learnUI(body, this.g); }
  // ---------------- 靈感股 (wide layout: list on the left, chart and orders on the right) ----------------
  _stock(body) {
    const ui = stockUI(body, this.g.market, { wide: true });
    const t = setInterval(() => ui.refresh(), 1000);
    this.wins.stock.cleanup = () => clearInterval(t);
  }
  _term(body) {
    const PROMPT = 'C:\\Users\\yanlin>';
    body.innerHTML = `<div class="tm-out"></div><label class="tm-line"><span class="tm-ps"></span><input class="tm-in" spellcheck="false" autocomplete="off"></label>`;
    const out = body.querySelector('.tm-out'), inp = body.querySelector('.tm-in'), ps = body.querySelector('.tm-ps');
    const scroll = () => { body.scrollTop = body.scrollHeight; };
    const print = (t = '', cls) => { const d = document.createElement('div'); d.textContent = t; if (cls) d.className = cls; out.appendChild(d); scroll(); };
    const html = (h) => { const d = document.createElement('div'); d.innerHTML = h; out.appendChild(d); scroll(); };
    let mode = null; // 'case' while the detective console (js/detective.js) is on
    const prompt = (p) => { ps.textContent = p; };
    const io = { print, html, prompt, clear: () => { out.innerHTML = ''; } };
    prompt(PROMPT);
    print('YanlinOS [版本 34.0.2026]'); print('(c) 中原大學資訊管理學系。著作權所有，並保留一切權利。'); print('');
    const hist = []; let hi = 0;
    const g = this.g, hhmm = () => { const c = Math.floor(g.clock) % 1440; return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`; };
    const enterCase = async (id) => {
      if (await g.detective?.enter(io, id)) mode = 'case';
      inp.focus();
    };
    const run = async (raw) => {
      if (mode === 'case') {
        print(ps.textContent + raw, 'tm-echo');
        const c0 = raw.trim().toLowerCase();
        if (c0 === 'exit' || c0 === 'quit') { mode = null; prompt(PROMPT); print('已離開偵探模式。', 'tm-dim'); print(''); return; }
        if (c0 === 'cls' || c0 === 'clear') { out.innerHTML = ''; return; }
        await g.detective.run(raw, io);
        return;
      }
      const cmd = raw.trim(), [c0, ...args] = cmd.split(/\s+/), c = (c0 || '').toLowerCase();
      print(PROMPT + raw);
      if (!cmd) return;
      if (cmd.toUpperCase() === 'PYL') { this.close(); g.openVideo(); return; }
      if (c === 'case' || c === 'cases' || c === '查案') { await enterCase(args[0]); return; }
      if (c === 'help' || c === '?') ['可用的命令：', '  case      偵探模式：用 SQL 查案', '  help      顯示這份說明', '  dir / ls  列出檔案', '  cls       清除畫面', '  date      顯示日期', '  time      顯示時間', '  whoami    目前使用者', '  echo      顯示文字', '  ver       系統版本', '  ipconfig  網路設定', '  exit      關閉終端機'].forEach(l => print(l));
      else if (c === 'dir' || c === 'ls') [' C:\\Users\\yanlin 的目錄', '', '2026/11/18  23:41    <DIR>          Desktop', '2026/11/19  02:13         1,204,551 競選政見_final.docx', '2026/11/19  02:47        48,220,113 傳單_final_v3_真的最後.psd', '2026/11/12  21:05           388,002 資料庫系統作業.sql', '2026/11/02  16:30         2,931,887 期中報告.pdf', '2026/11/21  09:12         6,481,920 校園紀錄_備份.db', '               5 個檔案      59,226,473 位元組', '', '（輸入 case 用 SQL 打開「校園紀錄_備份.db」查案）'].forEach(l => print(l));
      else if (c === 'cls' || c === 'clear') out.innerHTML = '';
      else if (c === 'date') print(`目前的日期: ${  new Date().toLocaleDateString('zh-TW')}`);
      else if (c === 'time') print(`目前的時間: ${  hhmm()}`);
      else if (c === 'whoami') print('cycu-im\\yanlin');
      else if (c === 'echo') print(args.join(' '));
      else if (c === 'ver') print('YanlinOS [版本 34.0.2026]');
      else if (c === 'ipconfig') ['乙太網路卡 乙太網路:', '   IPv4 位址 . . . . . . . . . : 192.168.34.34', '   子網路遮罩 . . . . . . . . . : 255.255.255.0', '   預設閘道 . . . . . . . . . . : 192.168.34.1'].forEach(l => print(l));
      else if (c === 'exit') this._closeWin('term');
      else print(`'${c0}' 不是內部或外部命令、可執行的程式或批次檔。（輸入 help 看指令，輸入 case 開始查案）`);
      print('');
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const v = inp.value; inp.value = ''; if (v.trim()) { hist.push(v); hi = hist.length; } run(v); }
      else if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, hi - 1); inp.value = hist[hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown' && hist.length) { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; e.preventDefault(); }
    });
    body.addEventListener('mouseup', () => { if (!getSelection().toString()) inp.focus(); });
    setTimeout(() => inp.focus(), 30);
    this.wins.term.enterCase = enterCase;
    this.wins.term.caseMode = () => mode === 'case'; // S.U.N.D.A.Y gives the case's hints while this is on (js/sunday.js)
    if (this._pendingCase !== undefined) { const id = this._pendingCase; this._pendingCase = undefined; enterCase(id); }
  }

  // ---------------- 案件檔案: the cases you can investigate, their briefs and your clue notes (js/detective.js) ----------------
  _case(body) {
    const g = this.g, D = g.detective;
    let key = '', sel = null;
    const render = () => {
      const list = D ? D.available() : [];
      const k = JSON.stringify([list.map(c => c.id), sel, D?.state]); if (k === key) return; key = k;
      if (!list.length) { body.innerHTML = '<div class="cf-empty">🕵️ 目前沒有需要調查的案件。<br><small>跟著主線任務走，案件就會出現在這裡。</small></div>'; return; }
      const c = list.find(x => x.id === sel) || list.find(x => !D.solved(x.id)) || list[0]; sel = c.id;
      const st = D.st(c.id), got = c.clues.filter(x => st.clues.includes(x.id));
      body.innerHTML = `<div class="cf"><div class="cf-list">${list.map(x => `<button data-c="${x.id}" class="${x === c ? 'on' : ''}"><span>${x.icon}</span><b>${x.title}</b><small>${D.solved(x.id) ? '✅ 已破案' : x.main ? '主線' : '支線'}</small></button>`).join('')}</div>
        <div class="cf-main"><h3>${c.icon} ${c.title}</h3><p class="cf-brief">${c.brief.replace(/\n/g, '<br>')}</p>
        <h4>📋 資料表</h4><div class="cf-tables">${Object.entries(c.tables).map(([t, d]) => `<div><code>${t}</code><small>${d}</small></div>`).join('')}</div>
        <h4>📝 線索筆記（${got.length} / ${c.clues.length}）</h4><div class="cf-notes">${got.length ? got.map(x => `<div>・${x.text}</div>`).join('') : '<div class="cf-dim">還沒有線索：到終端機用 SQL 查查看，查到的重點會自動記在這裡。</div>'}</div>
        ${D.solved(c.id) ? `<div class="cf-win">✅ 已破案：${c.solved}</div>` : ''}
        <button class="cf-go">💻 在終端機${D.solved(c.id) ? '重看' : '開始調查'}這個案件</button>
        <p class="cf-dim">在終端機輸入 <code>help</code> 看指令；卡住了輸入 <code>hint</code>；找到犯人後輸入 <code>accuse 名字</code>。不熟 SQL 的話，可以先到 🎓 資管學堂上「MySQL 入門」。</p></div></div>`;
      body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { sel = b.dataset.c; render(); });
      body.querySelector('.cf-go').onclick = () => this.investigate(c.id);
    };
    render();
    const t = setInterval(render, 1000);
    this.wins.case.cleanup = () => clearInterval(t);
  }
  // open the terminal (next to the case files) in detective mode on case id
  investigate(id) {
    const t = this.wins.term;
    if (t?.enterCase) { this._focus('term'); t.enterCase(id); return; }
    this._pendingCase = id; this.launch('term');
  }

  // ---------------- 競選後台 ----------------
  _stats(body) {
    const g = this.g, M = g.missions;
    const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
    const t = Math.floor(g.playTime);
    body.innerHTML = `<div class="st-head">第34屆 資管系會長 · 競選後台</div><div class="st-grid">
      ${row('目前得票', `${g.votes  } 票`)}${row('金色選票', `${g.ballotsTaken  } / 34`)}
      ${row('零用錢', `NT$ ${  g.money}`)}${row('主線進度', M.done ? '已完成 🎉' : `第 ${Math.max(0, M.idx) + 1} / ${M.steps.length} 段`)}
      ${row('麥當勞值班', `${g.job.shifts} 班 · 賺 NT$ ${g.job.earned}`)}${row('側門門禁', `${g.gate.shifts} 班`)}
      ${row('新中北路障礙賽', `${g.race.runs} 場 · 冠軍 ${g.race.wins} 次`)}${row('遊玩時間', `${Math.floor(t / 60)} 分 ${t % 60} 秒`)}
    </div><div class="st-foot">💾 進度會自動存在這台瀏覽器裡</div>`;
  }
}
