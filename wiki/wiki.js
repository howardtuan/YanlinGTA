// YanlinGTA Wiki 的小互動（沒有 JavaScript 時內容照樣全部看得到）

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

// 右上角背景顏色：自動（跟系統）／亮色／暗色。<head> 裡的小程式在畫面出來前就先套用，避免閃一下
(() => {
  const KEY = 'yanlinWiki.theme';
  const btns = [...document.querySelectorAll('[data-theme-set]')];
  let cur = 'auto';
  try {
    cur = localStorage.getItem(KEY) || 'auto';
  } catch (e) {}
  const set = (t) => {
    cur = t;
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try {
      if (t === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch (e) {}
    for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.themeSet === t));
  };
  for (const b of btns) b.addEventListener('click', () => set(b.dataset.themeSet));
  set(['light', 'dark'].includes(cur) ? cur : 'auto');
})();

// 分享這一頁：打開小視窗顯示連結；複製到剪貼簿；手機有系統分享時多一顆「更多…」
(() => {
  const btn = document.querySelector('.share-btn');
  const pop = document.getElementById('share-pop');
  if (!btn || !pop) return;
  const input = pop.querySelector('.share-url');
  const copy = pop.querySelector('.share-copy');
  const native = pop.querySelector('.share-native');
  const open = (on) => {
    pop.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on) input.select();
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    open(pop.hidden);
  });
  document.addEventListener('click', (e) => {
    if (!pop.hidden && !pop.contains(e.target)) open(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') open(false);
  });
  copy.addEventListener('click', async () => {
    const url = copy.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      input.select();
      document.execCommand?.('copy');
    }
    copy.textContent = '已複製 ✓';
    setTimeout(() => (copy.textContent = '複製'), 1800);
  });
  if (navigator.share) {
    native.hidden = false;
    native.addEventListener('click', () => {
      const { url, title, text } = native.dataset;
      navigator.share({ url, title, text }).catch(() => {});
    });
  }
})();

// 最新消息列表：每篇的「複製文章連結」
for (const b of document.querySelectorAll('.copy-link')) {
  b.addEventListener('click', async () => {
    const label = b.textContent;
    try {
      await navigator.clipboard.writeText(b.dataset.url);
    } catch (e) {
      const t = Object.assign(document.createElement('textarea'), { value: b.dataset.url });
      document.body.append(t);
      t.select();
      document.execCommand?.('copy');
      t.remove();
    }
    b.textContent = '已複製 ✓';
    setTimeout(() => (b.textContent = label), 1800);
  });
}

// 舊網址（Wiki 還是單頁時）的 #characters、#npc-zz、#q-m1 … 轉到對應的頁面
(() => {
  if (document.body.dataset.page !== 'home' || !location.hash) return;
  const h = decodeURIComponent(location.hash.slice(1));
  const pages = [
    'news',
    'controls',
    'characters',
    'main-quests',
    'side-quests',
    'cases',
    'shops',
    'team',
  ];
  const sub = {
    'controls-map': 'controls',
    'controls-desktop': 'controls',
    'controls-mobile': 'controls',
  };
  let to = '';
  if (pages.includes(h)) to = `${h}/`;
  else if (sub[h]) to = `${sub[h]}/#${h}`;
  else if (h.startsWith('npc-')) to = `characters/#${h}`;
  else if (h.startsWith('shop-')) to = `shops/#${h}`;
  else if (h.startsWith('post-')) to = `news/#${h}`;
  else if (/^q-(m\d|case-)/.test(h))
    to = `${h.startsWith('q-case-') ? 'cases' : 'main-quests'}/#${h}`;
  else if (h.startsWith('q-')) to = `side-quests/#${h}`;
  if (to) location.replace(to);
})();

// 角色頁：分類篩選與搜尋
(() => {
  const cards = [...document.querySelectorAll('.char')];
  const buttons = [...document.querySelectorAll('.filter')];
  const search = document.querySelector('.search');
  if (!cards.length || !search) return;
  const sections = [...document.querySelectorAll('.char-group')];
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
    for (const s of sections) s.hidden = !s.querySelector('.char:not([hidden])');
    if (empty) empty.hidden = shown > 0;
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

  // 從任務卡點角色名字過來時，角色可能被篩掉了：先清掉篩選再捲過去
  const reveal = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (!el?.classList.contains('char')) return;
    if (el.hidden) {
      search.value = '';
      buttons[0]?.click();
      el.scrollIntoView();
    }
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  };
  addEventListener('hashchange', reveal);
  reveal();
})();

// 左側目錄：手機版的抽屜開關
(() => {
  const side = document.getElementById('sidebar');
  const toggle = document.querySelector('.nav-toggle');
  const scrim = document.querySelector('.scrim');
  if (!side || !toggle || !scrim) return;
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
})();

// 右側「本頁內容」：跟著捲動標出目前讀到的段落
(() => {
  const links = [...document.querySelectorAll('.toc a[data-spy]')];
  const targets = links.map((a) => document.getElementById(a.dataset.spy)).filter(Boolean);
  if (!targets.length) return;
  const spy = () => {
    const y = scrollY + innerHeight * 0.25;
    let cur = targets[0];
    for (const t of targets) if (t.getBoundingClientRect().top + scrollY <= y) cur = t;
    for (const a of links) a.classList.toggle('active', a.dataset.spy === cur?.id);
  };
  addEventListener('scroll', spy, { passive: true });
  spy();
})();
