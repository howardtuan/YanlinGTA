// 🏆 隱藏成就 screens, shared by the phone app (compact) and the desktop computers (wide: list on the left, the story on
// the right). Entries and unlock state: src/systems/Secrets.js (game.secrets). A finished side quest opens it with
// reveal: a full-screen "隱藏成就解鎖" card first, then that entry's real photos / video / story.
import { SECRETS } from '../../systems/Secrets.js';

const esc = (t) =>
  String(t).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
const dayLabel = (clock) => (clock == null ? '' : `遊戲第 ${Math.floor(clock / 1440) + 1} 天解鎖`);

// root: element to fill; game: game.secrets; opts.wide: desktop layout; opts.reveal: id to unlock with the animation
export function secretsUI(root, game, { wide = false, reveal = null } = {}) {
  const book = game.secrets;
  let cur = null;
  const card = (s) =>
    s.open
      ? `<button class="sc-card${s.id === cur ? ' on' : ''}" data-s="${s.id}">
          <img src="${s.cover}" alt="" loading="lazy"><span class="sc-shade"></span>
          ${book.seen.has(s.id) ? '' : '<i class="sc-new">NEW</i>'}
          <span class="sc-cap"><small>${s.icon} ${esc(s.tag)}・真實事件改編</small><b>${esc(s.title)}</b><em>${esc(s.real)}</em></span></button>`
      : `<div class="sc-card sc-lock"><span class="sc-q">？</span>
          <span class="sc-cap"><small>🔒 尚未解鎖</small><b>？？？</b><em>${esc(s.hint)}</em></span></div>`;
  const list = () => {
    const all = book.list();
    return `<div class="sc-head"><div class="sc-logo">🏆 隱藏成就</div><div class="sc-prog"><b>${book.count}</b> / ${all.length}<small>已解鎖</small></div></div>
      <p class="sc-intro">有些支線是真實事件改編。破完支線，就能在這裡看到當年的真實照片和故事。</p>
      <div class="sc-list">${all.map(card).join('')}
        <div class="sc-card sc-lock sc-more"><span class="sc-q">⋯</span><span class="sc-cap"><small>敬請期待</small><b>更多真實故事</b><em>其他支線的真實版本陸續解鎖中</em></span></div></div>`;
  };
  const detail = (s) => `<article class="sc-art">
      <div class="sc-hero"><img src="${s.cover}" alt=""><span class="sc-shade"></span>
        <div class="sc-hcap"><span class="sc-badge">🏆 隱藏成就・真實事件改編</span><h2>${esc(s.title)}</h2><p>${esc(s.real)}</p><small>${dayLabel(s.at)}</small></div></div>
      <dl class="sc-facts">${s.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="sc-story">${s.story.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <div class="sc-media">${s.media
        .map((m, k) =>
          m.type === 'video'
            ? `<figure class="sc-vid"><video src="${m.src}" poster="${m.poster || ''}" controls playsinline preload="metadata"></video><figcaption>🎥 ${esc(m.cap)}</figcaption></figure>`
            : `<figure><button class="sc-ph" data-k="${k}"><img src="${m.src}" alt="" loading="lazy"></button><figcaption>${esc(m.cap)}</figcaption></figure>`
        )
        .join('')}</div>
      ${s.vs ? `<div class="sc-vs">${s.vs.map(([k, v]) => `<div><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join('')}</div>` : ''}
      <p class="sc-foot">照片中的人臉已打馬賽克。</p></article>`;

  // overlays (unlock card, photo viewer) cover the whole app screen / window, not the scrolled content
  const layer = () => root.closest('.ph-appview, .pc-body') || root;
  const stopVideos = () => root.querySelectorAll('video').forEach((v) => v.pause());
  const lightbox = (s, k) => {
    const imgs = s.media.filter((m) => m.type === 'img');
    let i = imgs.indexOf(s.media[k]);
    const box = document.createElement('div');
    box.className = 'sc-lb';
    const draw = () => {
      box.innerHTML = `<img src="${imgs[i].src}" alt=""><p>${esc(imgs[i].cap)}</p><button class="sc-lb-x">✕</button>
        ${imgs.length > 1 ? '<button class="sc-lb-p">‹</button><button class="sc-lb-n">›</button>' : ''}`;
      box.querySelector('.sc-lb-x').onclick = (e) => {
        e.stopPropagation();
        box.remove();
      };
      const step = (d) => (e) => {
        e.stopPropagation();
        i = (i + d + imgs.length) % imgs.length;
        draw();
      };
      if (imgs.length > 1) {
        box.querySelector('.sc-lb-p').onclick = step(-1);
        box.querySelector('.sc-lb-n').onclick = step(1);
      }
    };
    box.onclick = () => box.remove();
    draw();
    layer().appendChild(box);
  };
  const bind = () => {
    for (const b of root.querySelectorAll('[data-s]')) b.onclick = () => open(b.dataset.s);
    const s = SECRETS.find((x) => x.id === cur);
    if (s)
      for (const b of root.querySelectorAll('.sc-ph')) b.onclick = () => lightbox(s, +b.dataset.k);
    const bk = root.querySelector('.sc-back');
    if (bk) bk.onclick = () => open(null);
  };
  const render = () => {
    stopVideos();
    const s = cur && book.list().find((x) => x.id === cur && x.open);
    if (wide) {
      root.innerHTML = `<div class="sc wide"><div class="sc-side">${list()}</div><div class="sc-main">${
        s ? detail(s) : '<div class="sc-empty">🏆<p>從左邊選一個已解鎖的隱藏成就</p></div>'
      }</div></div>`;
    } else {
      root.innerHTML = `<div class="sc">${s ? `<button class="sc-back">‹ 全部成就</button>${detail(s)}` : list()}</div>`;
    }
    bind();
    if (!wide) root.closest('.ph-content')?.scrollTo?.(0, 0);
  };
  const open = (id) => {
    cur = id;
    if (id) book.read(id);
    render();
  };
  // the unlock card: rays, a trophy, the title; a tap (or 5 s) opens the story
  const playReveal = (id) => {
    const s = SECRETS.find((x) => x.id === id);
    if (!s) return open(null);
    open(id);
    const ov = document.createElement('div');
    ov.className = 'sc-reveal';
    ov.innerHTML = `<div class="sc-rays"></div>${Array.from({ length: 18 }, (_, k) => `<i class="sc-cf" style="--k:${k}"></i>`).join('')}
      <div class="sc-rv-in"><div class="sc-trophy">🏆</div><small>隱藏成就解鎖</small><h3>${esc(s.title)}</h3>
      <p>這條支線改編自真實事件<br><b>${esc(s.real)}</b></p><span class="sc-tap">點一下看真實故事 ›</span></div>`;
    layer().appendChild(ov);
    game.audio?.fanfare?.();
    const done = () => {
      if (!ov.isConnected) return;
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 420);
    };
    ov.onclick = done;
    setTimeout(done, 5000);
  };
  if (reveal) playReveal(reveal);
  else render();
  return { render, open, reveal: playReveal, stop: stopVideos };
}
