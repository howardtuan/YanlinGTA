// 靈感股 screens, shared by the i-Piyan app (compact) and the desktop computers (wide): market list,
// stock detail with 分時 / 日K charts (MA5, MA20, volume), whole-lot / odd-lot orders, 定期定額,
// holdings and the trade log. Taiwan colours: red = up, green = down.
import { fmtP, OPEN, CLOSE, dayDate, dayLabel } from './stocks.js';

const UP = '#e8323c', DOWN = '#1f9d55', FLAT = '#9aa0ad';
const col = (v) => (v > 0 ? UP : v < 0 ? DOWN : FLAT);
const sign = (v) => (v > 0 ? '▲' : v < 0 ? '▼' : '');
const pct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
const money = (n) => `NT$${Math.round(n).toLocaleString()}`;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// ---------- charts ----------
function prep(cv) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 300, h = cv.clientHeight || 180;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  g.font = '10px system-ui, sans-serif'; g.textBaseline = 'middle';
  return { g, w, h };
}
function drawK(cv, all, n) {
  const { g, w, h } = prep(cv);
  const ma = (k) => all.map((_, i) => (i < k - 1 ? null : all.slice(i - k + 1, i + 1).reduce((s, c) => s + c.c, 0) / k));
  const m5 = ma(5).slice(-n), m20 = ma(20).slice(-n), cs = all.slice(-n);
  if (!cs.length) return;
  const AX = 44, top = 8, ph = h * 0.7 - top, vt = h * 0.76, vh = h * 0.2, pw = w - AX - 4;
  let hi = -Infinity, lo = Infinity;
  for (const c of cs) { hi = Math.max(hi, c.h); lo = Math.min(lo, c.l); }
  for (const v of [...m5, ...m20]) if (v != null) { hi = Math.max(hi, v); lo = Math.min(lo, v); }
  const pad = (hi - lo) * 0.06 || hi * 0.01; hi += pad; lo -= pad;
  const y = (p) => top + (hi - p) / (hi - lo) * ph, step = pw / cs.length, bw = Math.max(1, step * 0.66);
  // grid + price labels
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.fillStyle = '#8b90a0'; g.textAlign = 'left';
  for (let i = 0; i <= 4; i++) { const p = lo + (hi - lo) * i / 4, yy = y(p); g.beginPath(); g.moveTo(0, yy); g.lineTo(pw, yy); g.stroke(); g.fillText(fmtP(p), pw + 4, yy); }
  // volume
  const vmax = Math.max(...cs.map((c) => c.v)) || 1;
  cs.forEach((c, i) => { const x = i * step + step / 2; g.fillStyle = c.c >= c.o ? 'rgba(232,50,60,.45)' : 'rgba(31,157,85,.45)'; const vv = c.v / vmax * vh; g.fillRect(x - bw / 2, vt + vh - vv, bw, vv); });
  // candles
  cs.forEach((c, i) => {
    const x = i * step + step / 2, up = c.c >= c.o; g.strokeStyle = g.fillStyle = up ? UP : DOWN;
    g.beginPath(); g.moveTo(x, y(c.h)); g.lineTo(x, y(c.l)); g.stroke();
    const y0 = y(Math.max(c.o, c.c)), y1 = y(Math.min(c.o, c.c)); g.fillRect(x - bw / 2, y0, bw, Math.max(1, y1 - y0));
  });
  // moving averages
  for (const [arr, c] of [[m5, '#f5a623'], [m20, '#8c7bff']]) {
    g.strokeStyle = c; g.lineWidth = 1.2; g.beginPath(); let on = false;
    arr.forEach((v, i) => { if (v == null) return; const x = i * step + step / 2; on ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); on = true; });
    g.stroke(); g.lineWidth = 1;
  }
  // last price + legend + dates
  const last = cs[cs.length - 1].c, ly = y(last);
  g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(0, ly); g.lineTo(pw, ly); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#f5a623'; g.textAlign = 'left'; g.fillText('MA5', 4, top + 4); g.fillStyle = '#8c7bff'; g.fillText('MA20', 34, top + 4);
  g.fillStyle = '#8b90a0'; g.textAlign = 'center';
  for (const i of [0, Math.floor(cs.length / 2), cs.length - 1]) g.fillText(dayDate(cs[i].d), Math.min(pw - 14, Math.max(14, i * step + step / 2)), h - 5);
}
function drawLine(cv, pts, ref, hiLim, loLim) {
  const { g, w, h } = prep(cv);
  const AX = 44, top = 8, ph = h - top - 18, pw = w - AX - 4;
  let hi = ref, lo = ref;
  for (const p of pts) { hi = Math.max(hi, p.p); lo = Math.min(lo, p.p); }
  const span = Math.max(hi - ref, ref - lo, ref * 0.01) * 1.15; hi = ref + span; lo = ref - span;
  const x = (m) => (m - OPEN) / (CLOSE - OPEN) * pw, y = (p) => top + (hi - p) / (hi - lo) * ph;
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.fillStyle = '#8b90a0'; g.textAlign = 'left';
  for (let i = 0; i <= 4; i++) { const p = lo + (hi - lo) * i / 4, yy = y(p); g.beginPath(); g.moveTo(0, yy); g.lineTo(pw, yy); g.stroke(); g.fillStyle = col(p - ref); g.fillText(fmtP(p), pw + 4, yy); }
  g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(0, y(ref)); g.lineTo(pw, y(ref)); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#8b90a0'; g.textAlign = 'center';
  for (const m of [OPEN, OPEN + 120, CLOSE]) g.fillText(hhmm(m), Math.min(pw - 14, Math.max(14, x(m))), h - 6);
  if (!pts.length) { g.fillStyle = '#8b90a0'; g.fillText('尚未開盤', pw / 2, top + ph / 2); return; }
  const last = pts[pts.length - 1].p, c = col(last - ref);
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(x(p.m), y(p.p)) : g.moveTo(x(p.m), y(p.p))));
  g.strokeStyle = c; g.lineWidth = 1.6; g.stroke(); g.lineWidth = 1;
  g.lineTo(x(pts[pts.length - 1].m), y(ref)); g.lineTo(x(pts[0].m), y(ref)); g.closePath();
  g.fillStyle = last >= ref ? 'rgba(232,50,60,.14)' : 'rgba(31,157,85,.14)'; g.fill();
}

// ---------- UI ----------
export function stockUI(root, M, { wide = false } = {}) {
  const S = { tab: 'quote', sel: wide ? 'PYL' : null, chart: 'k', mode: 'odd', qty: 1, dcaAmt: 1000, dcaFreq: 'day', q: '', msg: '' };
  root.classList.add('sk', wide ? 'sk-wide' : 'sk-compact');
  // typing in the inputs must not reach the game's keys (Backspace = back, E = put the phone away…)
  root.addEventListener('keydown', (e) => e.stopPropagation());
  const g = M.g;

  const headHTML = () => {
    const iq = M.indexQuote(), st = M.session();
    return `<div class="sk-idx"><div><small>靈感加權指數</small><b style="color:${col(iq.ch)}">${iq.p.toFixed(2)}</b>
      <span style="color:${col(iq.ch)}">${sign(iq.ch)} ${Math.abs(iq.ch).toFixed(2)}（${pct(iq.pct)}）</span></div>
      <div class="sk-st"><i class="sk-pill sk-${st.k}">${st.label}</i><small>${dayLabel(M.day)} ${hhmm(M.minute)} · ${iq.regime}</small></div></div>`;
  };
  const rowHTML = (s) => {
    const q = M.quote(s);
    return `<span class="sk-nm"><b>${esc(s.name)}</b><small>${s.code}</small></span><span class="sk-px" style="color:${col(q.ch)}">${fmtP(q.p)}</span><span class="sk-pc" style="background:${col(q.ch)}">${pct(q.pct)}</span>`;
  };
  const listHTML = () => {
    const q = S.q.trim().toLowerCase();
    const rows = M.list.filter((s) => !q || s.code.toLowerCase().includes(q) || s.name.includes(q) || s.ind.includes(q));
    return rows.map((s) => `<button class="sk-row${S.sel === s.code ? ' on' : ''}" data-code="${s.code}" data-row="${s.code}">${rowHTML(s)}</button>`).join('') || '<div class="sk-empty">找不到符合的股票</div>';
  };
  const dqHTML = (s) => {
    const q = M.quote(s), H = M.holdings[s.code];
    const stat = (k, v, c) => `<div><small>${k}</small><b${c ? ` style="color:${c}"` : ''}>${v}</b></div>`;
    return `<div class="sk-big"><b style="color:${col(q.ch)}">${fmtP(q.p)}</b><span style="color:${col(q.ch)}">${sign(q.ch)} ${fmtP(Math.abs(q.ch))}（${pct(q.pct)}）</span></div>
      <div class="sk-stats">${stat('開盤', fmtP(q.o), col(q.o - q.ref))}${stat('最高', fmtP(q.h), col(q.h - q.ref))}${stat('最低', fmtP(q.l), col(q.l - q.ref))}${stat('昨收', fmtP(q.ref))}
      ${stat('漲停', fmtP(q.upLimit), UP)}${stat('跌停', fmtP(q.downLimit), DOWN)}${stat('成交量', `${q.v.toLocaleString()} 張`)}${stat('持有', H ? `${H.sh.toLocaleString()} 股` : '—')}</div>`;
  };
  const estHTML = (s) => {
    const p = M.quote(s).p, sh = S.mode === 'lot' ? S.qty * 1000 : S.qty, amt = Math.round(p * sh), fee = M.fee(amt, S.mode === 'odd');
    return `${sh.toLocaleString()} 股 × ${fmtP(p)} ≈ <b>${money(amt)}</b>　手續費 ${fee}　（零用錢 ${money(g.money)}）`;
  };
  const detailHTML = (code) => {
    const s = M.by.get(code); if (!s) return '';
    const st = M.session();
    return `${wide ? '' : '<button class="sk-back" data-act="back">‹ 行情</button>'}
      <div class="sk-dh"><div><b>${esc(s.name)}</b> <small>${s.code}</small></div><small>${esc(s.full)} · ${esc(s.ind)}</small></div>
      <div data-dq="${code}">${dqHTML(s)}</div>
      <div class="sk-seg"><button data-chart="line" class="${S.chart === 'line' ? 'on' : ''}">分時</button><button data-chart="k" class="${S.chart === 'k' ? 'on' : ''}">日K</button></div>
      <canvas class="sk-cv" data-cv="${code}"></canvas>
      <div class="sk-order">
        <div class="sk-seg"><button data-mode="lot" class="${S.mode === 'lot' ? 'on' : ''}">整股（張）</button><button data-mode="odd" class="${S.mode === 'odd' ? 'on' : ''}">零股（股）</button></div>
        <div class="sk-qty"><button data-act="minus">−</button><input type="number" min="1" max="${S.mode === 'odd' ? 999 : 9999}" value="${S.qty}" data-in="qty"><button data-act="plus">＋</button><span>${S.mode === 'lot' ? '張' : '股'}</span></div>
        <div class="sk-est" data-est="${code}">${estHTML(s)}</div>
        <div class="sk-btns"><button class="sk-buy" data-act="buy" ${st.open ? '' : 'disabled'}>買進</button><button class="sk-sell" data-act="sell" ${st.open ? '' : 'disabled'}>賣出</button></div>
        ${st.open ? '' : `<div class="sk-note">${st.label}：整股 09:00–13:30、盤中零股 09:10–13:30 可以下單</div>`}
        <div class="sk-msg">${esc(S.msg)}</div>
      </div>
      <div class="sk-dca"><b>定期定額</b><small>每次開盤用開盤價買零股</small>
        <div class="sk-dcarow"><span>每次</span><input type="number" min="100" step="100" value="${S.dcaAmt}" data-in="dca"><span>元</span>
          <select data-in="freq"><option value="day"${S.dcaFreq === 'day' ? ' selected' : ''}>每個交易日</option><option value="week"${S.dcaFreq === 'week' ? ' selected' : ''}>每週一</option></select>
          <button data-act="dca">建立</button></div></div>`;
  };
  const holdRows = () => {
    const codes = Object.keys(M.holdings);
    if (!codes.length) return '<div class="sk-empty">還沒有庫存。到「行情」挑一支股票，零股一股也能買。</div>';
    return codes.map((c) => {
      const s = M.by.get(c), H = M.holdings[c], p = M.quote(s).p, mv = p * H.sh, pl = mv - H.cost;
      return `<button class="sk-hrow" data-code="${c}"><span class="sk-nm"><b>${esc(s.name)}</b><small>${c} · ${H.sh.toLocaleString()} 股 · 均價 ${fmtP(H.cost / H.sh)}</small></span>
        <span class="sk-hv"><b>${money(mv)}</b><small style="color:${col(pl)}">${pl >= 0 ? '+' : ''}${Math.round(pl).toLocaleString()}（${pct(pl / H.cost * 100)}）</small></span></button>`;
    }).join('');
  };
  const holdHTML = () => {
    let mv = 0, cost = 0; for (const c in M.holdings) { const H = M.holdings[c]; mv += M.quote(c).p * H.sh; cost += H.cost; }
    const pl = mv - cost;
    return `<div class="sk-sum" data-hsum><div><small>庫存市值</small><b>${money(mv)}</b></div><div><small>未實現損益</small><b style="color:${col(pl)}">${pl >= 0 ? '+' : ''}${Math.round(pl).toLocaleString()}</b></div><div><small>零用錢</small><b>${money(g.money)}</b></div></div>
      <div data-hrows>${holdRows()}</div>`;
  };
  const dcaHTML = () => (M.dca.length ? M.dca.map((p) => { const s = M.by.get(p.code); return `<div class="sk-plan"><span class="sk-nm"><b>${esc(s?.name || p.code)}</b><small>${p.code} · 每次 ${money(p.amount)} · ${p.freq === 'week' ? '每週一' : '每個交易日'}</small></span><button data-del="${p.id}">取消</button></div>`; }).join('')
    : '<div class="sk-empty">還沒有定期定額。打開一支股票，在下面設定每次要買多少錢。</div>');
  const tradesHTML = () => (M.trades.length ? M.trades.map((t) => { const s = M.by.get(t.code); const d = Math.floor(t.at / 1440); return `<div class="sk-trade"><span class="sk-nm"><b>${t.side === 'sell' ? '賣出' : t.side === 'dca' ? '定期定額' : '買進'} ${esc(s?.name || t.code)}</b><small>${dayDate(d)} ${hhmm(t.at - d * 1440)} · ${t.sh.toLocaleString()} 股 @ ${fmtP(t.p)}</small></span><b style="color:${t.total >= 0 ? UP : DOWN}">${t.total >= 0 ? '+' : '−'}${money(Math.abs(t.total))}</b></div>`; }).join('')
    : '<div class="sk-empty">還沒有成交紀錄</div>');

  const render = () => {
    const tabs = [['quote', '行情'], ['hold', '庫存'], ['dca', '定期定額'], ['trades', '成交']];
    const tabsHTML = `<div class="sk-tabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    let body;
    const search = `<input class="sk-search" placeholder="搜尋代號、名稱或產業" value="${esc(S.q)}" data-in="q">`;
    if (S.tab === 'quote') {
      if (wide) body = `<div class="sk-cols"><div class="sk-left">${search}<div class="sk-rows">${listHTML()}</div></div><div class="sk-right">${detailHTML(S.sel || 'PYL')}</div></div>`;
      else body = S.sel ? detailHTML(S.sel) : `${search}<div class="sk-rows">${listHTML()}</div>`;
    } else if (S.tab === 'hold') body = holdHTML();
    else if (S.tab === 'dca') body = dcaHTML();
    else body = tradesHTML();
    root.innerHTML = `<div data-head>${headHTML()}</div>${tabsHTML}<div class="sk-body">${body}</div>`;
    draw();
  };
  const draw = () => {
    const cv = root.querySelector('.sk-cv'); if (!cv) return;
    const s = M.by.get(cv.dataset.cv);
    if (S.chart === 'k') drawK(cv, M.candles(s, (wide ? 80 : 40) + 19), wide ? 80 : 40);
    else { const q = M.quote(s); drawLine(cv, M.intraday(s), M.todayIdx(s) >= 0 && M.started() ? q.ref : q.p, q.upLimit, q.downLimit); }
  };
  // live numbers every second, without rebuilding (inputs keep their focus)
  const refresh = () => {
    if (!root.isConnected) return;
    const h = root.querySelector('[data-head]'); if (h) h.innerHTML = headHTML();
    for (const el of root.querySelectorAll('[data-row]')) el.innerHTML = rowHTML(M.by.get(el.dataset.row));
    for (const el of root.querySelectorAll('[data-dq]')) el.innerHTML = dqHTML(M.by.get(el.dataset.dq));
    for (const el of root.querySelectorAll('[data-est]')) el.innerHTML = estHTML(M.by.get(el.dataset.est));
    const hr = root.querySelector('[data-hrows]'); if (hr) { const sum = root.querySelector('[data-hsum]'); const tmp = document.createElement('div'); tmp.innerHTML = holdHTML(); sum.replaceWith(tmp.firstElementChild); hr.innerHTML = holdRows(); }
    const open = M.session().open; for (const b of root.querySelectorAll('.sk-buy, .sk-sell')) b.disabled = !open;
    draw();
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    const d = b.dataset;
    if (d.tab) { S.tab = d.tab; S.msg = ''; if (!wide && d.tab === 'quote') S.sel = null; render(); return; }
    if (d.code) { S.sel = d.code; S.tab = 'quote'; S.msg = ''; render(); root.scrollTop = 0; return; }
    if (d.chart) { S.chart = d.chart; render(); return; }
    if (d.mode) { S.mode = d.mode; S.qty = 1; render(); return; }
    if (d.del) { M.removeDca(+d.del); render(); return; }
    const code = S.sel || 'PYL';
    if (d.act === 'back') { S.sel = null; render(); return; }
    if (d.act === 'minus' || d.act === 'plus') { S.qty = Math.max(1, Math.min(S.mode === 'odd' ? 999 : 9999, S.qty + (d.act === 'plus' ? 1 : -1))); render(); return; }
    if (d.act === 'buy' || d.act === 'sell') {
      const err = M.order(code, d.act, S.mode, S.qty), s = M.by.get(code);
      S.msg = err || `✅ ${d.act === 'buy' ? '買進' : '賣出'} ${s.name} ${(S.mode === 'lot' ? S.qty * 1000 : S.qty).toLocaleString()} 股成交`;
      if (!err) g.audio?.coin?.(); else g.audio?.bad?.();
      render(); return;
    }
    if (d.act === 'dca') { const err = M.addDca(code, S.dcaAmt, S.dcaFreq); S.msg = err || `✅ 已建立定期定額：每次 ${money(S.dcaAmt)}，${S.dcaFreq === 'week' ? '每週一' : '每個交易日'}開盤買進`; render(); }
  });
  root.addEventListener('input', (e) => {
    const k = e.target.dataset.in; if (!k) return;
    if (k === 'q') { S.q = e.target.value; const rows = root.querySelector('.sk-rows'); if (rows) rows.innerHTML = listHTML(); }
    if (k === 'qty') { S.qty = Math.max(1, Math.min(S.mode === 'odd' ? 999 : 9999, Math.floor(+e.target.value || 1))); const est = root.querySelector('[data-est]'); if (est) est.innerHTML = estHTML(M.by.get(est.dataset.est)); }
    if (k === 'dca') S.dcaAmt = Math.floor(+e.target.value || 0);
  });
  root.addEventListener('change', (e) => { if (e.target.dataset.in === 'freq') S.dcaFreq = e.target.value; });
  render();
  return { refresh, render };
}
