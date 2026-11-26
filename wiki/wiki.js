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
  reveal();
})();
