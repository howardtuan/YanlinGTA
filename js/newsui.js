// PYtoday screens, shared by the i-Piyan app (compact: list, tap for the article) and the desktop computers (wide:
// list on the left, article on the right). Articles come from js/news.js; the reading state is game.news (NewsDesk).
import { publishedNews } from './news.js';
import { dayDate, fmtP } from './stocks.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const UP = '#e8323c', DOWN = '#1f9d55';

// reading state + "new article" notices; saved (save.js: news)
export class NewsDesk {
  constructor(game) { this.g = game; this.seen = new Set(); this._last = null; }
  list() { return publishedNews(this.g.clock); }
  get unread() { return this.list().filter(a => !this.seen.has(a.id)).length; }
  read(id) { if (!this.seen.has(id)) { this.seen.add(id); this.g._saveT = 9.5; } }
  // called every frame: a toast when an article comes out while you play
  tick() {
    const c = this.g.clock;
    if (this._last == null || c < this._last) { this._last = c; return; }
    if (Math.floor(c) === Math.floor(this._last)) return;
    const fresh = this.list().filter(a => a.at > this._last && a.at <= c);
    this._last = c;
    for (const a of fresh.reverse()) {
      this.g.hud.toast(`📰 PYtoday｜${a.title}`, 'good', 3200);
      this.g.audio.notify?.(0.5);
    }
  }
  toJSON() { return { seen: [...this.seen].slice(-200) }; }
  load(d) { if (d?.seen) this.seen = new Set(d.seen); }
}

const when = (a, clock) => {
  const dd = Math.floor(clock / 1440) - a.d, t = hhmm(a.at - a.d * 1440);
  return dd === 0 ? `今天 ${t}` : dd === 1 ? `昨天 ${t}` : `${dayDate(a.d)} ${t}`;
};
const thumb = (a, big) => a.img ? `<img class="nw-img${big ? ' big' : ''}" src="${a.img}" alt="">`
  : `<div class="nw-tile${big ? ' big' : ''}" style="background:linear-gradient(135deg,${a.color},#111)"><span>${a.emoji}</span>${a.stock ? `<b>${esc(a.stock.code)}</b>` : ''}</div>`;

// root: element to fill; game: for the clock, the market and game.news; opts.wide: desktop layout
export function newsUI(root, game, { wide = false } = {}) {
  const desk = game.news, M = game.market;
  let cur = null, listY = 0;
  const stockBox = (a) => {
    if (!a.stock || !M) return '';
    const s = M.by.get(a.stock.code); if (!s) return '';
    const q = M.quote(s), c = q.pct > 0 ? UP : q.pct < 0 ? DOWN : '#888';
    return `<div class="nw-stock"><small>相關個股・靈感股</small><div><b>${esc(s.name)}</b> <span>${esc(s.code)}</span></div>
      <div class="nw-q" style="color:${c}"><b>${fmtP(q.p)}</b> ${q.pct > 0 ? '▲' : q.pct < 0 ? '▼' : ''}${Math.abs(q.pct).toFixed(2)}%</div>
      <small>${a.stock.pct > 0 ? '利多消息' : '利空消息'}・新聞會影響股價（盤前發佈影響開盤，盤中發佈從發佈時間起反應，收盤後影響下一個交易日）</small></div>`;
  };
  const article = (a) => `<article class="nw-art">${thumb(a, true)}
      <div class="nw-meta"><i style="background:${a.color}">${esc(a.cat)}</i><span>${when(a, game.clock)}</span><span>PYtoday 記者</span></div>
      <h2>${esc(a.title)}</h2>${a.lead ? `<p class="nw-lead">${esc(a.lead)}</p>` : ''}
      ${a.body.map(p => `<p>${esc(p)}</p>`).join('')}${stockBox(a)}
      <p class="nw-foot">※ 本則為遊戲內虛構新聞</p></article>`;
  const listHTML = (items) => items.length ? items.map(a => `<button class="nw-row${cur === a.id ? ' on' : ''}" data-id="${a.id}">
      ${thumb(a, false)}<span class="nw-rt"><span class="nw-meta"><i style="background:${a.color}">${esc(a.cat)}</i><span>${when(a, game.clock)}</span>${desk.seen.has(a.id) ? '' : '<em>NEW</em>'}</span>
      <b>${esc(a.title)}</b></span></button>`).join('') : '<div class="nw-empty">今天還沒有新聞，早上 07:30 會有第一則。</div>';
  const head = () => `<div class="nw-head"><span class="nw-logo">PY<b>today</b></span><span>${dayDate(Math.floor(game.clock / 1440))}・${hhmm(game.clock % 1440)}</span></div>`;
  function render() {
    const items = desk.list();
    if (wide) {
      if (!cur && items[0]) cur = items[0].id;
      const a = items.find(x => x.id === cur);
      if (a) desk.read(a.id);
      root.innerHTML = `<div class="nw nw-wide">${head()}<div class="nw-cols"><div class="nw-list">${listHTML(items)}</div><div class="nw-main">${a ? article(a) : ''}</div></div></div>`;
    } else if (cur) {
      const a = items.find(x => x.id === cur);
      if (!a) { cur = null; return render(); }
      desk.read(a.id);
      root.innerHTML = `<div class="nw">${head()}<button class="nw-back">‹ 新聞列表</button>${article(a)}</div>`;
      root.querySelector('.nw-back').onclick = () => { cur = null; render(); const l = root.closest('.ph-content'); if (l) l.scrollTop = listY; };
      const sc = root.closest('.ph-content'); if (sc) sc.scrollTop = 0;
    } else {
      root.innerHTML = `<div class="nw">${head()}<div class="nw-list">${listHTML(items)}</div></div>`;
    }
    root.querySelectorAll('.nw-row').forEach(b => b.onclick = () => {
      const sc = root.closest('.ph-content'); if (sc && !wide) listY = sc.scrollTop;
      cur = b.dataset.id; render();
      if (wide) root.querySelector('.nw-main')?.scrollTo(0, 0);
    });
  }
  // re-render only when something visible changed (new article, the minute on the header)
  let key = '';
  function refresh() {
    const k = desk.list().length + '|' + Math.floor(game.clock) + '|' + cur;
    if (k === key) return; key = k;
    const keepList = root.querySelector('.nw-list')?.scrollTop || 0, keepMain = root.querySelector('.nw-main')?.scrollTop || 0;
    const sc = root.closest('.ph-content'), keepPh = sc?.scrollTop || 0;
    render();
    const l = root.querySelector('.nw-list'), m = root.querySelector('.nw-main'); if (l) l.scrollTop = keepList; if (m) m.scrollTop = keepMain; if (sc) sc.scrollTop = keepPh;
  }
  render(); key = desk.list().length + '|' + Math.floor(game.clock) + '|' + cur;
  return { refresh, render, open: (id) => { cur = id; render(); } };
}
