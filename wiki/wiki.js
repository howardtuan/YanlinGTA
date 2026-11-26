// 操作說明的分頁（跟遊戲 src/core/Controls.js 的 bindControls 一樣）：放在最前面、自己一塊，後面的程式出錯也不影響
for (const root of document.querySelectorAll('.game-ctl')) {
  const tabs = root.querySelectorAll('.ctl-tab');
  for (const b of tabs) {
    b.type = 'button';
    b.addEventListener('click', () => {
      for (const t of tabs) t.classList.toggle('on', t === b);
      for (const p of root.querySelectorAll('.ctl-pane'))
        p.classList.toggle('hidden', p.dataset.pane !== b.dataset.tab);
    });
  }
}

// Wiki 角色篩選與搜尋（沒有 JavaScript 時全部角色照樣顯示）
(() => {
  const cards = [...document.querySelectorAll('.char')];
  const buttons = [...document.querySelectorAll('.filter')];
  const search = document.querySelector('.search');
  const empty = document.querySelector('.empty');
  let group = 'all';

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const c of cards) {
      const ok =
        (group === 'all' || c.dataset.group === group) && (!q || c.dataset.search.includes(q));
      c.hidden = !ok;
      if (ok) shown++;
    }
    empty.hidden = shown > 0;
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      group = b.dataset.f;
      for (const o of buttons) {
        o.classList.toggle('on', o === b);
        o.setAttribute('aria-pressed', String(o === b));
      }
      apply();
    });
  }
  search.addEventListener('input', apply);

  // 從任務卡點角色名字跳過來時，角色可能被篩掉了：先清掉篩選再捲過去
  const reveal = () => {
    // 沒有 #… 時 location.hash 是空字串；用 id 找，避免奇怪的 hash 讓 querySelector 丟錯
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (!el?.classList.contains('char')) return;
    if (el.hidden) {
      search.value = '';
      buttons[0].click();
      el.scrollIntoView();
    }
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  };
  window.addEventListener('hashchange', reveal);

  // 左側目錄：手機版的抽屜開關
  const side = document.getElementById('sidebar');
  const toggle = document.querySelector('.nav-toggle');
  const scrim = document.querySelector('.scrim');
  const openSide = (on) => {
    side.classList.toggle('open', on);
    toggle.setAttribute('aria-expanded', String(on));
    scrim.hidden = !on;
  };
  toggle.addEventListener('click', () => openSide(!side.classList.contains('open')));
  scrim.addEventListener('click', () => openSide(false));
  side.addEventListener('click', (e) => {
    if (e.target.closest('a')) openSide(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') openSide(false);
  });

  // 目錄跟著捲動標出目前讀到的段落
  const links = [...side.querySelectorAll('a[data-spy]')];
  const targets = links.map((a) => document.getElementById(a.dataset.spy)).filter(Boolean);
  const spy = () => {
    const y = scrollY + innerHeight * 0.25;
    let cur = targets[0];
    for (const t of targets) if (t.getBoundingClientRect().top + scrollY <= y) cur = t;
    for (const a of links) a.classList.toggle('active', a.dataset.spy === cur?.id);
  };
  addEventListener('scroll', spy, { passive: true });
  spy();
  reveal();
})();
