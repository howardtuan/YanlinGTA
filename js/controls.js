// 操作說明 (controls help): three tabs — keyboard & mouse / gamepad / touch.
// Each tab has a diagram (key map, controller with call-outs, phone layout) and a list per situation.
// Pad glyphs come from prompts.js so the labels match the connected controller (Xbox / PS / Switch).
// The modal is skipped by the prompts MutationObserver, so the <kbd>s here are never re-translated.

// ---------------- keyboard ----------------
// category: m = 移動 / 駕駛, a = 動作, v = 車上, u = 介面; [label, top-left key, function, in-vehicle function, width]
const KB_ROWS = [
  [['Esc', 'u', '暫停'], ['gap', 0.5], ['1', 'u', '選項 1', '餐點'], ['2', 'u', '選項 2', '餐點'], ['3', 'u', '', '餐點'], ['4', 'u', '', '餐點'], ['5', 'u', '', '餐點'], ['6', 'u', '', '餐點'], ['7'], ['8'], ['9'], ['0'], ['⌫', 'u', '拿掉餐點', '', 1.5]],
  [['Tab', 'u', '傳送訊息', '', 1.5], ['Q'], ['W', 'm', '前進', '油門'], ['E', 'a', '互動', '手機'], ['R', 'u', '再賽一場'], ['T'], ['Y'], ['U'], ['I'], ['O'], ['P'], ['gap', 1.5]],
  [['gap', 0.25], ['Caps', '', '', '', 1.5], ['A', 'm', '左', '轉向'], ['S', 'm', '後退', '煞車'], ['D', 'm', '右', '轉向'], ['F', 'a', '上下車'], ['G', 'a', '比 ✌'], ['H', 'v', '喇叭'], ['J'], ['K'], ['L'], ['Enter', 'u', '對話 / 出餐', '', 1.5]],
  [['Shift', 'a', '衝刺', '', 2.25], ['Z'], ['X'], ['C'], ['V'], ['B'], ['N'], ['M', 'u', '地圖'], ['gap', 2.25]],
  [['gap', 3], ['Space', 'a', '跳躍', '手煞車甩尾', 6]],
];
const ARROWS = [[['gap', 1], ['↑', 'u', '選擇']], [['←', 'u', '選擇'], ['↓', 'u', '選擇'], ['→', 'u', '選擇']]];
const keyEl = ([t, cat, fn = '', veh = '', w = 1]) => {
  if (t === 'gap') return `<div class="kc-gap" style="--w:${cat}"></div>`;
  return `<div class="kc ${cat ? 'c-' + cat : 'off'}" style="--w:${w}"><b>${t}</b>${fn ? `<span>${fn}</span>` : ''}${veh ? `<i>${veh}</i>` : ''}</div>`;
};
const MOUSE = `<div class="ms-wrap"><div class="ms-cap">移動滑鼠 = 視角</div>
<svg class="ms" viewBox="0 0 120 190" aria-hidden="true">
  <path d="M60 4 C26 4 8 30 8 70 V130 C8 166 30 186 60 186 C90 186 112 166 112 130 V70 C112 30 94 4 60 4Z" fill="#1b1e2a" stroke="#c9ccd6" stroke-width="2.5"/>
  <path d="M58 6 C28 8 10 32 10 70 V82 H58Z" fill="#6b1b22" stroke="#e8323c" stroke-width="2.5"/>
  <path d="M62 6 C92 8 110 32 110 70 V82 H62Z" fill="#20232e" stroke="#4a4e5c" stroke-width="2"/>
  <rect x="54" y="24" width="12" height="30" rx="6" fill="#30343f" stroke="#7d8291" stroke-width="2"/>
  <text x="34" y="66" fill="#fff" font-size="12" font-weight="800" text-anchor="middle">發傳單</text>
  <text x="86" y="66" fill="#6b7080" font-size="11" font-weight="700" text-anchor="middle">—</text>
  <text x="60" y="128" fill="#9ea3b2" font-size="11" font-weight="700" text-anchor="middle">滑鼠</text>
</svg></div>`;
const LEGEND = `<div class="kc-legend"><span class="lg c-m">移動 / 駕駛</span><span class="lg c-a">動作</span><span class="lg c-v">車上</span><span class="lg c-u">介面</span></div>`;
function kbDiagram() {
  const rows = KB_ROWS.map(r => `<div class="kc-row">${r.map(keyEl).join('')}</div>`).join('');
  const arrows = ARROWS.map(r => `<div class="kc-row">${r.map(keyEl).join('')}</div>`).join('');
  return `<div class="kb-diagram"><div class="kb-main">${rows}${LEGEND}</div><div class="kb-arrows">${arrows}</div>${MOUSE}</div>`;
}
const mouseGlyph = (b) => `<svg class="mg" viewBox="0 0 16 22" aria-label="${b === 'L' ? '滑鼠左鍵' : '滑鼠'}"><rect x="1" y="1" width="14" height="20" rx="7" fill="#f4f2ea" stroke="#999"/>${b === 'L' ? '<path d="M8 1.5 A6.5 6.5 0 0 0 1.5 8 V9 H8Z" fill="#e8323c"/>' : ''}<line x1="8" y1="2" x2="8" y2="9" stroke="#999"/></svg>`;
const K = (...ks) => ks.map(k => k === 'ML' ? mouseGlyph('L') : k === 'MM' ? `<span class="ctl-word">滑鼠</span>` : `<kbd>${k}</kbd>`).join('');

// ---------------- gamepad ----------------
function padDiagram(P) {
  const t = (n) => P._glyph(n).text;
  const st = P.style;
  const face = (n, x, y) => {
    const col = st === 'xbox' ? { A: '#3fae49', B: '#e0473c', X: '#2f7fd8', Y: '#e8b923' }[n] : st === 'ps' ? '#1d1f26' : '#3b3d44';
    const tc = st === 'ps' ? { A: '#8fb4ff', B: '#ff6f6f', X: '#ff8fd8', Y: '#3fd6a5' }[n] : n === 'Y' && st === 'xbox' ? '#222' : '#fff';
    return `<circle cx="${x}" cy="${y}" r="14" fill="${col}" stroke="rgba(255,255,255,.35)"/><text x="${x}" y="${y + 5}" fill="${tc}" font-size="${st === 'ps' ? 15 : 14}" font-weight="900" text-anchor="middle">${t(n)}</text>`;
  };
  // call-outs: [button, x, y (anchor on the pad), side, label y, text]
  const L = [['LT', 222, 52, 'l', 40, '煞車・倒車（車上）'], ['LB', 222, 74, 'l', 74, '喇叭'], ['L', 250, 160, 'l', 120, '移動・轉向（按下 L3：衝刺）'],
    ['dpad', 302, 208, 'l', 170, '▲▼◀▶ 對話選項・手機選單'], ['View', 325, 112, 'l', 214, '地圖']];
  const R = [['RT', 478, 52, 'r', 40, '油門（車上）'], ['RB', 478, 74, 'r', 74, '跳躍・甩尾'], ['Y', 448, 112, 'r', 108, '比 ✌'], ['B', 478, 140, 'r', 142, '上車 / 下車'],
    ['A', 448, 168, 'r', 176, '互動・對話・手機'], ['X', 418, 140, 'r', 210, '發傳單拉票'], ['R', 398, 210, 'r', 244, '視角'], ['Menu', 375, 112, 'r', 278, '暫停']];
  const name = (b) => b === 'dpad' ? '十字鍵' : b === 'L' ? 'L' : b === 'R' ? 'R' : t(b);
  const call = ([b, x, y, side, ly, txt]) => {
    const lx = side === 'l' ? 150 : 550, anchor = side === 'l' ? 'end' : 'start', tx = side === 'l' ? lx - 6 : lx + 6;
    return `<polyline points="${x},${y} ${lx},${ly}" fill="none" stroke="#c9ccd6" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>
      <text x="${tx}" y="${ly + 4}" text-anchor="${anchor}" font-size="13" font-weight="800"><tspan fill="#ff5c66">${name(b)}</tspan><tspan fill="#fff"> ${txt}</tspan></text>`;
  };
  return `<svg class="pad-diagram" viewBox="-120 14 940 286" role="img" aria-label="手把按鍵配置">
  <rect x="226" y="34" width="56" height="26" rx="8" fill="#2a2d38" stroke="#c9ccd6" stroke-width="2"/><text x="254" y="52" fill="#fff" font-size="12" font-weight="900" text-anchor="middle">${t('LT')}</text>
  <rect x="418" y="34" width="56" height="26" rx="8" fill="#2a2d38" stroke="#c9ccd6" stroke-width="2"/><text x="446" y="52" fill="#fff" font-size="12" font-weight="900" text-anchor="middle">${t('RT')}</text>
  <rect x="210" y="66" width="80" height="12" rx="6" fill="#2a2d38" stroke="#c9ccd6" stroke-width="1.5"/><rect x="410" y="66" width="80" height="12" rx="6" fill="#2a2d38" stroke="#c9ccd6" stroke-width="1.5"/>
  <path d="M232 78 H468 C520 78 548 110 560 170 C574 236 566 286 528 286 C498 286 482 252 458 228 H242 C218 252 202 286 172 286 C134 286 126 236 140 170 C152 110 180 78 232 78Z" fill="#1b1e2a" stroke="#c9ccd6" stroke-width="2.5"/>
  ${[...L, ...R].map(call).join('')}
  <circle cx="250" cy="160" r="26" fill="#11131b" stroke="#c9ccd6" stroke-width="2"/><circle cx="250" cy="160" r="15" fill="#2a2d38" stroke="#7d8291"/><text x="250" y="165" fill="#fff" font-size="13" font-weight="900" text-anchor="middle">L</text>
  <circle cx="398" cy="210" r="26" fill="#11131b" stroke="#c9ccd6" stroke-width="2"/><circle cx="398" cy="210" r="15" fill="#2a2d38" stroke="#7d8291"/><text x="398" y="215" fill="#fff" font-size="13" font-weight="900" text-anchor="middle">R</text>
  <path d="M294 186 h16 v14 h14 v16 h-14 v14 h-16 v-14 h-14 v-16 h14Z" fill="#2a2d38" stroke="#c9ccd6" stroke-width="1.5"/>
  <rect x="312" y="104" width="26" height="14" rx="7" fill="#2a2d38" stroke="#c9ccd6" stroke-width="1.5"/><rect x="362" y="104" width="26" height="14" rx="7" fill="#2a2d38" stroke="#c9ccd6" stroke-width="1.5"/>
  ${face('Y', 448, 112)}${face('X', 418, 140)}${face('B', 478, 140)}${face('A', 448, 168)}
</svg>`;
}
const PB = (P, ...ns) => ns.map(n => {
  if (n === 'L' || n === 'R') return `<span class="ctl-word">${n === 'L' ? '左搖桿' : '右搖桿'}</span>`;
  if (n === 'L3') { const g = P._glyph('LS'); return `<kbd class="${g.cls}">${g.text}</kbd>`; }
  if (n === 'dpad') return `<span class="ctl-word">十字鍵</span>`;
  const g = P._glyph(n); return `<kbd class="${g.cls}">${g.text}</kbd>`;
}).join('');

// ---------------- touch ----------------
const TOUCH = `<div class="touch-diagram">
  <div class="td-phone">
    <div class="td-drag">右半邊拖曳 = 視角<br><small>點一下畫面也能繼續對話</small></div>
    <div class="td-joy"><div class="td-knob"></div><span>虛擬搖桿：移動・轉向</span></div>
    <div class="td-btns">
      ${[['F', '上下車'], ['E', '互動'], ['📄', '發傳單', 1], ['⤒', '跳/甩尾'], ['»', '衝刺'], ['🗺', '地圖'], ['📯', '喇叭'], ['⚙', '設定']].map(([i, l, a]) => `<div class="td-b${a ? ' accent' : ''}">${i}<small>${l}</small></div>`).join('')}
    </div>
  </div>
  <p class="td-hint">建議把手機橫放；左下角拖曳搖桿移動，往上推就是騎車的油門。</p>
</div>`;

// ---------------- lists ----------------
const row = (label, keys) => `<div><span>${label}</span><span class="ctl-keys">${keys}</span></div>`;
const sec = (zh, en, rows) => `<div class="ctrl-sec"><b>${zh}</b> ${en}</div><div class="ctrl-grid">${rows.join('')}</div>`;
function lists(dev, P) {
  if (dev === 'kb') return [
    sec('步行', 'ON FOOT', [row('移動', K('W', 'A', 'S', 'D')), row('視角', K('MM')), row('衝刺', K('Shift')), row('跳躍', K('Space')), row('發傳單拉票', K('ML')), row('比 ✌', K('G')), row('互動・對話', K('E')), row('📱 i-Piyan 手機（附近沒有互動時）', K('E'))]),
    sec('駕駛 · 機車與汽車', 'DRIVING · SCOOTERS & CARS', [row('上車 / 下車', K('F')), row('油門', K('W')), row('煞車 / 倒車', K('S')), row('轉向', K('A', 'D')), row('手煞車（甩尾）', K('Space')), row('喇叭', K('H'))]),
    sec('手機與打工', 'PHONE & JOBS', [row('訊息：選擇回覆', K('↑', '↓') + ' / ' + K('1', '2')), row('訊息：傳送', K('Tab')), row('手機：返回 / 收起', K('Esc') + ' / ' + K('E')),
      row('麥當勞：放餐點 / 出餐', K('1') + '～' + K('6') + ' / ' + K('Enter')), row('麥當勞：拿掉最後一樣 / 下班', K('⌫') + ' / ' + K('E')), row('側門門禁：放行 / 擋下', K('1') + ' / ' + K('2'))]),
    sec('介面', 'MENUS', [row('對話：下一句', K('E') + K('Enter') + K('ML')), row('地圖', K('M')), row('暫停・設定', K('Esc')), row('障礙賽結果：再賽一場', K('R'))]),
  ].join('');
  if (dev === 'pad') return [
    sec('步行', 'ON FOOT', [row('移動', PB(P, 'L')), row('視角', PB(P, 'R')), row('衝刺', PB(P, 'L3')), row('跳躍', PB(P, 'RB')), row('發傳單拉票', PB(P, 'X')), row('比 ✌', PB(P, 'Y')), row('互動・對話', PB(P, 'A')), row('📱 i-Piyan 手機（附近沒有互動時）', PB(P, 'A'))]),
    sec('駕駛 · 機車與汽車', 'DRIVING · SCOOTERS & CARS', [row('上車 / 下車', PB(P, 'B')), row('油門', PB(P, 'RT')), row('煞車 / 倒車', PB(P, 'LT')), row('轉向（只轉向，不加油）', PB(P, 'L')), row('手煞車（甩尾）', PB(P, 'RB')), row('喇叭', PB(P, 'LB'))]),
    sec('手機與打工', 'PHONE & JOBS', [row('手機：選擇 / 開啟', PB(P, 'dpad') + ' / ' + PB(P, 'A')), row('手機：傳送 / 返回 / 收起', PB(P, 'X') + ' / ' + PB(P, 'B') + ' / ' + PB(P, 'Y')),
      row('麥當勞：餐點 1–6', PB(P, 'dpad') + PB(P, 'X', 'Y')), row('麥當勞：出餐 / 拿掉 / 下班', PB(P, 'A') + ' / ' + PB(P, 'B') + ' / ' + PB(P, 'Menu')), row('側門門禁：放行 / 擋下', PB(P, 'A') + ' / ' + PB(P, 'B'))]),
    sec('介面', 'MENUS', [row('對話：下一句', PB(P, 'A')), row('地圖', PB(P, 'View')), row('暫停・設定', PB(P, 'Menu')), row('障礙賽結果：繼續 / 再賽一場', PB(P, 'A') + ' / ' + PB(P, 'X'))]),
  ].join('') + `<p class="ctl-note">支援 Xbox、PlayStation、Switch Pro 手把：插上或藍牙連線後按任一鍵，畫面上的按鍵提示就會換成手把按鈕；碰一下鍵盤或滑鼠就換回來。</p>`;
  return [
    sec('步行', 'ON FOOT', [row('移動', '<span class="ctl-word">左下虛擬搖桿</span>'), row('視角', '<span class="ctl-word">右半邊拖曳</span>'), row('衝刺', '<span class="ctl-word">»</span>'), row('跳躍', '<span class="ctl-word">⤒</span>'), row('發傳單拉票', '<span class="ctl-word">📄</span>'), row('互動・手機', '<span class="ctl-word">E</span>')]),
    sec('駕駛', 'DRIVING', [row('上車 / 下車', '<span class="ctl-word">F</span>'), row('油門 / 煞車', '<span class="ctl-word">搖桿往上 / 往下</span>'), row('轉向', '<span class="ctl-word">搖桿左右</span>'), row('甩尾', '<span class="ctl-word">⤒</span>'), row('喇叭', '<span class="ctl-word">📯</span>')]),
    sec('介面', 'MENUS', [row('對話：下一句', '<span class="ctl-word">點一下畫面</span>'), row('地圖', '<span class="ctl-word">🗺</span>'), row('暫停・設定', '<span class="ctl-word">⚙</span>')]),
  ].join('');
}

export function controlsHTML(game) {
  const dev = game.prompts?.pad ? 'pad' : game.input?.touch ? 'touch' : 'kb';
  const tab = (d, t) => `<button class="ctl-tab${d === dev ? ' on' : ''}" data-tab="${d}">${t}</button>`;
  const pane = (d, html) => `<div class="ctl-pane${d === dev ? '' : ' hidden'}" data-pane="${d}">${html}</div>`;
  const P = game.prompts;
  return `<div class="ctl">
  <div class="ctl-tabs">${tab('kb', '鍵盤滑鼠')}${tab('pad', '手把')}${tab('touch', '觸控')}</div>
  ${pane('kb', kbDiagram() + lists('kb', P))}
  ${pane('pad', padDiagram(P) + lists('pad', P))}
  ${pane('touch', TOUCH + lists('touch', P))}
</div>`;
}
export function bindControls(root) {
  const tabs = root.querySelectorAll('.ctl-tab');
  for (const b of tabs) b.onclick = () => {
    for (const t of tabs) t.classList.toggle('on', t === b);
    for (const p of root.querySelectorAll('.ctl-pane')) p.classList.toggle('hidden', p.dataset.pane !== b.dataset.tab);
  };
}
