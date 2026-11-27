// YanlinGTA Wiki 產生器：讀 data/npcs.json + wiki/people.json + wiki/quests.json + wiki/shops.json，
// 輸出一個不需要 JavaScript 也能看的多頁靜態網站到 dist/wiki/（每個主題一頁），跟遊戲一起部署（yanlin-gta.com/wiki/）。
// npm run build 會自動產生（vite.config.js）；只改 Wiki 時可以單獨跑 npm run wiki:build。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { controlsHTML } from '../src/core/Controls.js';
import { Prompts } from '../src/ui/Prompts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
// Wiki 在遊戲網站的 /wiki/ 底下：用相對路徑回到遊戲，本機預覽和正式站都能用
const GAME_URL = '../';
const REPO_URL = 'https://github.com/howardtuan/YanlinGTA';
// 分享連結與連結預覽（LINE、Facebook、Discord…）要用完整網址，相對路徑抓不到圖
export const SITE = 'https://yanlin-gta.com';
export const pageUrl = (slug) => `${SITE}/wiki/${slug ? `${slug}/` : ''}`;

export const GROUPS = [
  { id: 'main', label: '主角' },
  { id: 'dev', label: '開發者' },
  { id: 'classmate', label: '同學與室友' },
  { id: 'ai', label: 'AI 夥伴' },
  { id: 'fiction', label: '虛構角色' },
];

const QUEST_TYPES = {
  main: { label: '主線', cls: 'main' },
  side: { label: '支線', cls: 'side' },
  case: { label: 'SQL 案件', cls: 'case' },
};

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));

// JPEG 的寬高（連結預覽的 og:image:width/height 用），讀不到就回傳 null
export function jpegSize(file) {
  try {
    const b = fs.readFileSync(file);
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  } catch (e) {}
  return null;
}

// 只接受 http(s) 網址，避免 javascript: 之類的連結被塞進頁面
const safeUrl = (u) => (/^https:\/\/[^\s"<>]+$/i.test(u || '') ? u : '');

export function loadWikiData(root = ROOT) {
  const npcs = readJson(path.join(root, 'data', 'npcs.json')).npcs;
  const { people, extras = [] } = readJson(path.join(root, 'wiki', 'people.json'));
  const quests = readJson(path.join(root, 'wiki', 'quests.json')).quests;
  const shops = readJson(path.join(root, 'wiki', 'shops.json')).shops;
  // 最新消息：依日期由新到舊
  const news = readJson(path.join(root, 'wiki', 'news.json')).posts.toSorted((a, b) =>
    b.date.localeCompare(a.date)
  );
  const avatarDir = path.join(root, 'assets', 'gram');

  // wiki: false 的角色只在遊戲裡，不放上 Wiki
  // extras：只在 Wiki 的角色（例如只出現在手機聊天室的 Winter），欄位跟 data/npcs.json 一樣
  const chars = [...npcs.filter((n) => people[n.id]?.wiki !== false), ...extras].map((n) => {
    const p = people[n.id] || n;
    // 頭貼：真人角色用遊戲裡的 Peachgram 頭貼，AI 用 wiki/img/ 裡畫好的全息圓圈
    const avatarSrc = [
      path.join(avatarDir, `${n.id}_av.jpg`),
      path.join(root, 'wiki', 'img', `${n.id}_av.jpg`),
    ].find((f) => fs.existsSync(f));
    const avatar = avatarSrc ? `img/${n.id}_av.jpg` : '';
    return {
      ...n,
      relations: p.relations ?? n.relations,
      group: p.group || 'classmate',
      social: p.social !== false,
      github: safeUrl(p.github),
      linkedin: safeUrl(p.linkedin),
      devRole: p.devRole || '',
      note: p.note || '',
      avatar,
      avatarSrc,
      quests: quests.filter((q) => q.npcs.includes(n.id)),
    };
  });
  const order = GROUPS.map((g) => g.id);
  chars.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  return { chars, quests, shops, news };
}

// ---------------------------------------------------------------- 頁面
// 技術文件式：每個主題一頁（/wiki/、/wiki/controls/、/wiki/characters/ …），左邊分組編號的目錄、
// 中間標題＋內容、右邊「本頁內容」、底下上一頁／下一頁。版面參考 anything-to-journal 的 docs。
export const PAGES = [
  { slug: '', group: '開始', title: '介紹' },
  { slug: 'news', group: '開始', title: '最新消息' },
  { slug: 'controls', group: '開始', title: '操作教學' },
  { slug: 'characters', group: '角色', title: '角色介紹' },
  { slug: 'main-quests', group: '任務攻略', title: '主線任務', type: 'main' },
  { slug: 'side-quests', group: '任務攻略', title: '支線任務', type: 'side' },
  { slug: 'cases', group: '任務攻略', title: 'SQL 偵探案件', type: 'case' },
  { slug: 'shops', group: '關於', title: '合作店家' },
  { slug: 'team', group: '關於', title: '開發團隊' },
];
const QUEST_PAGE = { main: 'main-quests', side: 'side-quests', case: 'cases' };
const num = (i) => String(i).padStart(2, '0');
// 右上角的背景顏色切換：自動（跟系統）／亮色／暗色，選擇存在 localStorage（yanlinWiki.theme）
const THEME_SWITCH = `<div class="theme-switch" role="group" aria-label="背景顏色">
    <button type="button" data-theme-set="auto" aria-pressed="true" title="自動（跟著系統）" aria-label="自動"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1.8a6.2 6.2 0 0 0 0 12.4Z" fill="currentColor"/></svg></button>
    <button type="button" data-theme-set="light" aria-pressed="false" title="亮色" aria-label="亮色"><svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"/></svg></button>
    <button type="button" data-theme-set="dark" aria-pressed="false" title="暗色" aria-label="暗色"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.6 10.1A6 6 0 0 1 5.9 2.4a6 6 0 1 0 7.7 7.7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
  </div>`;
// 每頁輸出的檔案位置（/wiki/ 底下）
export const pageFile = (slug) => (slug ? `${slug}/index.html` : 'index.html');

// 連到 Wiki 的另一頁（base 是目前這頁回到 /wiki/ 的相對路徑：'' 或 '../'）
const link = (base, slug, hash = '') => `${base}${slug ? `${slug}/` : ''}${hash ? `#${hash}` : ''}`;

function avatarHtml(c, base, size = '') {
  if (c.avatar) {
    return `<img class="av ${size}" src="${base}${c.avatar}" alt="${esc(c.name)} 的遊戲頭像" loading="lazy" width="96" height="96">`;
  }
  const glyph = c.group === 'ai' ? '◎' : [...c.name][0];
  return `<span class="av av-fallback ${size} g-${c.group}" aria-hidden="true">${esc(glyph)}</span>`;
}

function socialHtml(c) {
  if (!c.social) return '';
  // 沒填的連結不顯示；兩個都沒填就整個區塊都不出現
  if (!c.linkedin && !c.github) return '';
  const a = (url, cls, label) =>
    url
      ? `<a class="soc ${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`
      : '';
  return `<div class="socials">${a(c.linkedin, 'li', 'LinkedIn')}${a(c.github, 'gh', 'GitHub')}</div>`;
}

function charCard(c, base) {
  const groupLabel = GROUPS.find((g) => g.id === c.group)?.label || '';
  const facts = [
    ['科系', c.dept],
    ['個性', c.personality],
    ['興趣', (c.interests || []).join('、')],
    ['喜歡', c.likes],
    ['出沒地點', c.where],
    ['人際關係', c.relations],
  ].filter(([, v]) => v);
  const questList = c.quests.length
    ? `<div class="char-quests"><h4>相關任務</h4><ul>${c.quests
        .map(
          (q) =>
            `<li><a href="${link(base, QUEST_PAGE[q.type], `q-${q.id}`)}"><span class="qt ${QUEST_TYPES[q.type].cls}">${QUEST_TYPES[q.type].label}</span>${esc(q.icon)} ${esc(q.title)}</a></li>`
        )
        .join('')}</ul></div>`
    : '';
  return `
<article class="char" id="npc-${esc(c.id)}" data-group="${c.group}" data-search="${esc(
    [c.name, c.title, c.dept, c.personality, ...(c.interests || [])].join(' ').toLowerCase()
  )}">
  <header class="char-head">
    ${avatarHtml(c, base)}
    <div class="char-id">
      <div class="char-tags">${
        c.group === 'dev'
          ? '<span class="tag dev-badge">🛠 本遊戲開發者</span>'
          : `<span class="tag g-${c.group}">${groupLabel}</span>`
      }</div>
      <h3>${esc(c.name)}</h3>
      <p class="char-title">${esc(c.title)}</p>
    </div>
  </header>
  ${c.catchphrase ? `<blockquote class="catch">「${esc(c.catchphrase)}」</blockquote>` : ''}
  ${c.devRole ? `<p class="dev-role"><b>負責開發：</b>${esc(c.devRole)}</p>` : ''}
  ${socialHtml(c)}
  <details>
    <summary>角色檔案</summary>
    <dl>${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${c.background ? `<p class="bg">${esc(c.background)}</p>` : ''}
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
  </details>
  ${questList}
</article>`;
}

const chips = (ids, byId, base) =>
  ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map(
      (c) => `<a class="chip" href="${link(base, 'characters', `npc-${c.id}`)}">${esc(c.name)}</a>`
    )
    .join('');

function questCard(q, byId, base) {
  const t = QUEST_TYPES[q.type];
  const people = chips(q.npcs, byId, base);
  return `
<article class="quest" id="q-${esc(q.id)}">
  <header><span class="qt ${t.cls}">${t.label}</span><h3>${esc(q.icon)} ${esc(q.title)}</h3></header>
  <p class="trigger"><b>觸發：</b>${esc(q.trigger)}</p>
  <ol>${q.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  <p class="reward"><b>獎勵：</b>${esc(q.reward)}</p>
  ${people ? `<div class="chips">${people}</div>` : ''}
</article>`;
}

function shopCard(s, byId, base) {
  const people = chips(s.npcs || [], byId, base);
  const url = safeUrl(s.url);
  return `
<article class="quest shop" id="shop-${esc(s.id)}">
  <header><span class="qt shop">合作店家</span><h3>${esc(s.icon)} ${esc(s.name)}</h3></header>
  <p class="trigger"><b>遊戲裡：</b>${esc(s.where)}</p>
  <ul>${s.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  ${url ? `<p class="reward"><a href="${url}" target="_blank" rel="noopener">店家連結 ↗</a></p>` : ''}
  ${people ? `<div class="chips">${people}</div>` : ''}
</article>`;
}

// 操作教學：直接用遊戲裡「⌨ 操作說明」的同一份 HTML（src/core/Controls.js）和同一份樣式（src/styles/style.css），
// 遊戲改按鍵或改圖，Wiki 重建就跟著變。手把用 Xbox 按鍵標示。
export function gameControlsHtml() {
  const prompts = Object.assign(Object.create(Prompts.prototype), { style: 'xbox', pad: false });
  return controlsHTML({ prompts, input: { touch: false } });
}
// 從遊戲的 style.css 挑出操作說明用到的規則，全部加上 .game-ctl 前綴，只作用在 Wiki 的那一塊深色面板
const CTL_SEL =
  /^(kbd(\.pb[\w.-]*)?|\.ctl(-[\w-]+)?(\.[\w-]+)*( [a-z]+)?|\.ctrl-[\w-]+( [a-z]+)?|\.kc(-[\w-]+)?(\.[\w-]+)*( [a-z]+)?|\.kb-[\w-]+|\.lg(\.c-[mavu])?(::before)?|\.ms(-wrap|-cap)?|\.mg|\.pad-diagram|\.touch-diagram|\.td-[\w-]+(\.[\w-]+)?( [a-z]+)?|\.c-[mavu])$/;
export function gameControlsCss(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const sel = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1).trim();
    i = j;
    if (sel.startsWith('@')) continue; // 遊戲畫面專用的 @media 調整不需要：Wiki 面板自己處理寬度
    const parts = sel.split(',').map((x) => x.trim());
    if (parts.every((x) => CTL_SEL.test(x)))
      out.push(`${parts.map((x) => `.game-ctl ${x}`).join(',\n')} {\n  ${body}\n}`);
  }
  return out.join('\n');
}

const pageNum = (slug) => num(PAGES.findIndex((p) => p.slug === slug));

// 最新消息：首頁卡片用的摘要（第一段，太長就截斷）
const excerpt = (n) => {
  const t = [...(n.body[0] || '')];
  return t.length > 48 ? `${t.slice(0, 48).join('')}…` : t.join('');
};

// 「分享文章」按鈕的 icon（三個點連線的分享符號）
const SHARE_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="12" cy="3.5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12.5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.8 7 10.2 4.5M5.8 9l4.4 2.5" stroke="currentColor" stroke-width="1.5"/></svg>';

// 每篇文章自己一頁（/wiki/news/<id>/），分享時連結預覽才會是這篇的照片與標題
export const postSlug = (n) => `news/${n.id}`;

function postCard(n, base, { full = false } = {}) {
  const url = pageUrl(postSlug(n));
  return `
<article class="post" id="post-${esc(n.id)}">
  <header>
    <time datetime="${esc(n.date)}">${esc(n.date)}</time>
    ${full ? '' : `<h2><a href="${link(base, postSlug(n))}">${esc(n.title)}</a></h2>`}
  </header>
  ${n.image ? `<figure class="post-img"><img src="${base}news/${esc(n.image)}" alt="${esc(n.alt || n.title)}" loading="lazy"></figure>` : ''}
  ${n.body.map((p) => `<p>${esc(p)}</p>`).join('')}
  ${n.tags?.length ? `<p class="post-tags">${n.tags.map((t) => `<span>#${esc(t)}</span>`).join('')}</p>` : ''}
  ${
    full
      ? ''
      : `<p class="post-actions"><a href="${link(base, postSlug(n))}">閱讀全文 →</a><button class="share-post" type="button" data-url="${esc(url)}" data-title="${esc(n.title)}">${SHARE_ICON}<span>分享文章</span></button></p>`
  }
</article>`;
}

const shot = (src, alt, caption) =>
  `<figure class="shot"><img src="${src}" alt="${esc(alt)}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

// 各頁的內容：回傳 { lead, meta, toc: [[id, 標題, 層級]], html }
function pageBody(page, data, base, opts) {
  const { chars, quests, shops, news = [] } = data;
  const byId = new Map(chars.map((c) => [c.id, c]));
  const game = `${base}${GAME_URL}`;

  if (page.slug === '') {
    return {
      lead: 'YanlinGTA = Yanlin <b>G</b>reat <b>T</b>imes <b>A</b>dventure。第 34 屆中原大學資管系系學會會長候選人彥霖的 3D 開放世界競選遊戲。',
      meta: ['免安裝・瀏覽器就能玩', `${chars.length} 位角色`, `${quests.length} 個任務`],
      toc: [
        ['promo', '宣傳片', 2],
        ['about', '這是什麼遊戲', 2],
        ['story', '遊戲概覽', 2],
        ...(news.length ? [['latest', '最新消息', 2]] : []),
        ['start', '從哪裡開始', 2],
      ],
      html: `
<h2 id="promo">宣傳片</h2>
${
  opts.promo
    ? `<figure class="hero-media">
  <video class="hero-img" controls playsinline preload="none" poster="${base}media/promo-poster.jpg" aria-label="YanlinGTA 58 秒宣傳片">
    <source src="${base}media/promo.mp4" type="video/mp4">
    <a href="${base}media/promo.mp4">下載宣傳片</a>
  </video>
  <figcaption>▶ 58 秒宣傳片：第一人稱校園、手機 App、電腦操作全收錄</figcaption>
</figure>`
    : `<img class="hero-img" src="${base}img/cover.jpg" alt="中原順起來 · 資管要贏 票投彥霖 遊戲封面">`
}
<h2 id="about">這是什麼遊戲</h2>
<p>一款在瀏覽器就能玩的 3D 開放世界競選遊戲。騎著粉白色 SYM JET SL 穿梭真實比例的中原大學校園，幫候選人彥霖拉票。遊戲裡的同學、室友和開發者，<b>全部由真人改編</b>。</p>
<div class="callout"><b>屬於我們的大學回憶錄</b><p>這是一群資管系的好朋友，一起動手打造、屬於我們自己的大學回憶錄：宿舍的床位、打工的麥當勞、半夜的麻將桌、彼此的口頭禪和糗事，都被寫進了這座校園。</p></div>
<h2 id="story">遊戲概覽</h2>
<div class="overview-grid">
  <div class="ov"><span class="ov-n">${quests.filter((q) => q.type === 'main').length}</span><span>主線任務</span></div>
  <div class="ov"><span class="ov-n">${quests.filter((q) => q.type !== 'main').length}</span><span>支線與案件</span></div>
  <div class="ov"><span class="ov-n">${chars.length}</span><span>登場角色</span></div>
  <div class="ov"><span class="ov-n">34</span><span>金色選票</span></div>
</div>
<p>投票日就在明天。玩家扮演候選人<b>彥霖</b>，跟著兩個全息 AI 夥伴 M.O.N.D.A.Y 與 W.E.D.N.E.S.D.A.Y 完成競選主線：貼傳單、去「食字路口」採買點心、掃街拉票、搶救布條、用真正的 SQL 查出是誰割了競選布條，再到男生宿舍逐間拉票，最後站上政見發表會。卡關的時候，右下角的金色小助手 S.U.N.D.A.Y 會給提示。</p>
<p>主線之外，校園裡每個角色都有自己的 24 小時作息、宿舍床位、對白和手機社群動態。跟他們聊天加好友，就會觸發各自的支線劇情。另外還有麥當勞打工、新中北路障礙賽、力行 277 寢 3D 台灣麻將（可以跟朋友連線）、資管學堂程式課、靈感股市和直升機空投等玩法。</p>
${
  news.length
    ? `<h2 id="latest">最新消息</h2>
<div class="cards">${news
        .slice(0, 2)
        .map(
          (n) =>
            `<a class="card" href="${link(base, postSlug(n))}"><span class="num">${esc(n.date)}</span><b>${esc(n.title)}</b><span>${esc(excerpt(n))}</span></a>`
        )
        .join('')}</div>
<p><a href="${link(base, 'news')}">看全部消息 →</a></p>`
    : ''
}
<h2 id="start">從哪裡開始</h2>
<div class="cards">
  <a class="card" href="${game}"><span class="num">▶</span><b>開始玩</b><span>免安裝，電腦與手機瀏覽器都能玩</span></a>
  <a class="card" href="${link(base, 'controls')}"><span class="num">${pageNum('controls')}</span><b>操作教學</b><span>鍵盤滑鼠、手把、手機觸控</span></a>
  <a class="card" href="${link(base, 'characters')}"><span class="num">${pageNum('characters')}</span><b>角色介紹</b><span>真人改編的同學、室友與開發者</span></a>
  <a class="card" href="${link(base, 'main-quests')}"><span class="num">${pageNum('main-quests')}</span><b>主線任務</b><span>${quests.filter((q) => q.type === 'main').length} 個競選任務攻略</span></a>
</div>`,
    };
  }

  if (page.post) {
    const n = page.post;
    return {
      lead: esc(excerpt(n)),
      meta: [n.date, ...(n.tags || []).slice(0, 3).map((t) => `#${t}`)],
      toc: [],
      html: `${postCard(n, base, { full: true })}
<p><a href="${link(base, 'news')}">← 回到最新消息</a></p>`,
    };
  }

  if (page.slug === 'news') {
    return {
      lead: '彥霖競選團隊與開發團隊的最新動態、幕後花絮。',
      meta: [`${news.length} 篇文章`, news[0] ? `最近更新 ${news[0].date}` : '尚無文章'],
      toc: news.map((n) => [`post-${n.id}`, n.title, 2]),
      html: `<div class="news-list">${news.map((n) => postCard(n, base)).join('')}</div>`,
    };
  }

  if (page.slug === 'controls') {
    return {
      lead: '電腦（鍵盤滑鼠或手把）和手機都能玩，免安裝、打開網頁就開始。',
      meta: ['鍵盤滑鼠', '手把', '手機觸控'],
      toc: [
        ['controls-map', '按鍵配置', 2],
        ['controls-desktop', '電腦版畫面', 2],
        ['controls-mobile', '手機版畫面', 2],
      ],
      html: `
<h2 id="controls-map">按鍵配置</h2>
<p>這張按鍵圖跟遊戲裡「⌨ 操作說明」一模一樣，遊戲中也可以在標題畫面或暫停選單隨時打開。切換分頁看<b>鍵盤滑鼠</b>、<b>手把</b>（以 Xbox 按鍵標示，也支援 PlayStation、Switch Pro）和<b>觸控</b>的操作。</p>
<div class="game-ctl">${opts.controls}</div>
<h2 id="controls-desktop">電腦版畫面</h2>
<p>先點一下畫面鎖定滑鼠游標，就能用滑鼠轉動視角；按 <kbd>Esc</kbd> 放開游標並暫停。</p>
${shot(`${base}shots/desktop-title.jpg`, '遊戲標題畫面', '標題畫面：<b>▶ 開始遊戲</b>、操作說明、設定 / 音樂、效能測試，還有 <b>📖 彥霖GTA WIKI</b>。')}
${shot(`${base}shots/desktop-play.jpg`, '電腦版遊戲畫面', '電腦版遊戲畫面：左上角是目前可以用的按鍵提示，正上方是目前任務，右上角是時間、得票、金色選票和錢包，左下角是小地圖，下方是對話框。')}
<h2 id="controls-mobile">手機版畫面</h2>
<p>建議把手機<b>橫放</b>。左下角是虛擬搖桿，往上推就是騎車／開車的油門；右下角是動作按鈕。</p>
${shot(`${base}shots/mobile-play.jpg`, '手機版遊戲畫面', '手機版畫面（橫放）：左下角虛擬搖桿，右下角 F 上下車、E 互動、📄 發傳單、⤒ 跳／甩尾、» 衝刺、🗺 地圖、📯 喇叭、⚙ 設定。')}`,
    };
  }

  if (page.slug === 'characters') {
    const counts = Object.fromEntries(
      GROUPS.map((g) => [g.id, chars.filter((c) => c.group === g.id).length])
    );
    const groups = GROUPS.filter((g) => counts[g.id]);
    const filterBtns = [
      `<button class="filter on" type="button" data-f="all" aria-pressed="true">全部 ${chars.length}</button>`,
      ...groups.map(
        (g) =>
          `<button class="filter" type="button" data-f="${g.id}" aria-pressed="false">${g.label} ${counts[g.id]}</button>`
      ),
    ].join('');
    return {
      lead: '遊戲裡的同學、室友和開發者都是以真實人物為原型改編，點社群連結可以認識本人。標示 🛠 的是這個遊戲的開發者。',
      meta: [`${chars.length} 位角色`, ...groups.map((g) => `${g.label} ${counts[g.id]}`)],
      toc: groups.map((g) => [`group-${g.id}`, g.label, 2]),
      html: `
<div class="toolbar">
  <div class="filters" role="group" aria-label="依分類篩選">${filterBtns}</div>
  <input class="search" type="search" placeholder="搜尋角色、科系、興趣…" aria-label="搜尋角色">
</div>
${groups
  .map(
    (g) => `<section class="char-group" id="group-${g.id}" data-group="${g.id}">
  <h2>${g.label}</h2>
  <div class="char-grid">${chars
    .filter((c) => c.group === g.id)
    .map((c) => charCard(c, base))
    .join('')}</div>
</section>`
  )
  .join('\n')}
<p class="empty" hidden>找不到符合的角色。</p>`,
    };
  }

  if (page.type) {
    const list = quests.filter((q) => q.type === page.type);
    const lead = {
      main: '五個競選任務依序推進，主要由 M.O.N.D.A.Y 與 W.E.D.N.E.S.D.A.Y 交代。',
      side: '跟角色加好友後，在手機私訊或當面聊天時觸發。',
      case: '在電腦終端機輸入 <code>case</code> 開啟，要寫真的 SQL 查資料；不會寫程式也可以「🎬 一鍵通關」。',
    }[page.type];
    return {
      lead,
      meta: [
        `${list.length} 個${QUEST_TYPES[page.type].label === '主線' ? '主線任務' : QUEST_TYPES[page.type].label === '支線' ? '支線任務' : '案件'}`,
      ],
      toc: list.map((q) => [`q-${q.id}`, q.title, 2]),
      html: `<div class="quest-list">${list.map((q) => questCard(q, byId, base)).join('')}</div>`,
    };
  }

  if (page.slug === 'shops') {
    return {
      lead: '跟我們合作、被搬進遊戲裡的真實店家，走進去就能逛、能買東西。',
      meta: [`${shops.length} 家合作店家`],
      toc: shops.map((s) => [`shop-${s.id}`, s.name, 2]),
      html: `<div class="quest-list">${shops.map((s) => shopCard(s, byId, base)).join('')}</div>`,
    };
  }

  // team
  const devs = chars.filter((c) => c.group === 'dev');
  return {
    lead: `這 ${devs.length} 位開發者本人也出現在遊戲裡，在校園裡找得到他們。`,
    meta: [`${devs.length} 位開發者`, '原始碼公開'],
    toc: [
      ['devs', '開發者', 2],
      ['source', '原始碼', 2],
    ],
    html: `
<h2 id="devs">開發者</h2>
<div class="team-grid">${devs
      .map(
        (c) => `
  <div class="dev">
    ${avatarHtml(c, base, 'lg')}
    <div>
      <h3><a href="${link(base, 'characters', `npc-${c.id}`)}">${esc(c.name)}</a> <span class="tag dev-badge">🛠 開發者</span></h3>
      <p class="dev-role">${esc(c.devRole)}</p>
      ${socialHtml(c)}
    </div>
  </div>`
      )
      .join('')}</div>
<h2 id="source">原始碼</h2>
<p>遊戲和這個 Wiki 的原始碼都在 GitHub：<a href="${REPO_URL}" target="_blank" rel="noopener">github.com/howardtuan/YanlinGTA</a>。</p>`,
  };
}

function sidebarHtml(current, base) {
  const groups = [...new Set(PAGES.map((p) => p.group))];
  return `<aside class="sidebar" id="sidebar">
  <nav aria-label="Wiki 目錄">
    <div class="side-head"><span class="mono">YanlinGTA Wiki</span><span class="ver">第 34 屆</span></div>
    ${groups
      .map(
        (g) => `<p class="side-group">${esc(g)}</p>
    <ul>${PAGES.map((p, i) => [p, i])
      .filter(([p]) => p.group === g)
      .map(
        ([p, i]) =>
          `<li><a href="${link(base, p.slug)}"${p === current || (current.post && p.slug === 'news') ? ' class="active" aria-current="page"' : ''}><span class="num">${num(i)}</span>${esc(p.title)}</a></li>`
      )
      .join('')}</ul>`
      )
      .join('\n    ')}
    <a class="side-play" href="${base}${GAME_URL}">▶ 開始玩遊戲</a>
    <p class="side-foot"><span class="dot"></span>中原順起來<br>資管要贏 票投彥霖</p>
  </nav>
</aside>`;
}

function renderPage(page, data, opts) {
  // 文章頁（news/<id>）掛在「最新消息」底下：目錄標亮最新消息、頁碼也用它的
  const navPage = page.post ? PAGES.find((p) => p.slug === 'news') : page;
  const i = PAGES.indexOf(navPage);
  const base = page.slug ? '../'.repeat(page.slug.split('/').length) : '';
  const body = pageBody(page, data, base, opts);
  const h1 = page.slug ? page.title : '中原順起來 · 資管要贏 票投彥霖';
  let prev = PAGES[i - 1];
  let next = PAGES[i + 1];
  if (page.post) {
    // 文章頁：上一頁＝較新的文章（沒有就回最新消息），下一頁＝較舊的文章
    const k = data.news.indexOf(page.post);
    const asPage = (n) => n && { slug: postSlug(n), title: n.title, post: n };
    prev = asPage(data.news[k - 1]) || navPage;
    next = asPage(data.news[k + 1]);
  }
  const url = pageUrl(page.slug);
  const title = `${page.slug ? `${page.title} · ` : ''}YanlinGTA Wiki`;
  const desc = body.lead.replace(/<[^>]+>/g, '');
  // 預覽圖：文章用文章照片，操作教學用遊戲畫面截圖，其他頁用遊戲封面
  const [ogImg, ogW, ogH] = page.post?.image
    ? [`news/${page.post.image}`, ...(opts.postSizes?.[page.post.image] || [])]
    : page.slug === 'controls'
      ? ['shots/desktop-play.jpg', 1600, 900]
      : ['img/cover.jpg', 1672, 941];
  const enc = encodeURIComponent;
  const share = `<div class="share">
      <button class="share-btn" type="button" aria-expanded="false" aria-controls="share-pop"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 9.4a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.9.9M9.4 6.6a3 3 0 0 0-4.2 0L2.9 8.9a3 3 0 0 0 4.2 4.2l.9-.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>分享</button>
      <div class="share-pop" id="share-pop" role="dialog" aria-label="分享這一頁" hidden>
        <p class="mono">分享這一頁</p>
        <div class="share-row"><input class="share-url" type="text" readonly value="${esc(url)}" aria-label="分享連結"><button class="share-copy" type="button" data-url="${esc(url)}">複製</button></div>
        <div class="share-to">
          <button class="share-native" type="button" data-url="${esc(url)}" data-title="${esc(title)}" data-text="${esc(desc)}" hidden>更多…</button>
          <a href="https://social-plugins.line.me/lineit/share?url=${enc(url)}" target="_blank" rel="noopener">LINE</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener">Facebook</a>
          <a href="https://twitter.com/intent/tweet?url=${enc(url)}&amp;text=${enc(title)}" target="_blank" rel="noopener">X</a>
        </div>
      </div>
    </div>`;
  const pager = (p, dir) =>
    p
      ? `<a class="pager-${dir}" href="${link(base, p.slug)}"><small>${dir === 'prev' ? (p.post ? '← 較新的文章' : '← 上一頁') : p.post ? '較舊的文章 →' : '下一頁 →'}</small><span>${p.post ? '' : `${num(PAGES.indexOf(p))} `}${esc(p.title)}</span></a>`
      : '<span></span>';
  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.slug ? `${esc(page.title)} · ` : ''}YanlinGTA Wiki · 彥霖 Great Times Adventure</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${page.post ? 'article' : 'website'}">${page.post ? `\n<meta property="article:published_time" content="${esc(page.post.date)}">` : ''}
<meta property="og:site_name" content="YanlinGTA Wiki">
<meta property="og:locale" content="zh_TW">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/wiki/${ogImg}">
${ogW ? `<meta property="og:image:width" content="${ogW}">\n<meta property="og:image:height" content="${ogH}">\n` : ''}<meta property="og:image:alt" content="${esc(page.post ? page.post.alt || page.post.title : '中原順起來 · 資管要贏 票投彥霖')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/wiki/${ogImg}">
<meta name="theme-color" content="#2e105c">
<link rel="icon" href="${base}img/wiki-favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" href="${base}img/wiki-icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="${base}img/wiki-apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="彥霖 Wiki">
<link rel="manifest" href="${base}manifest.webmanifest">
<script>try{const t=localStorage.getItem('yanlinWiki.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="stylesheet" href="${base}style.css">
<link rel="stylesheet" href="${base}game-controls.css">
</head>
<body data-page="${page.post ? 'post' : page.slug || 'home'}">
<a class="skip" href="#content">跳到內容</a>
<header class="top">
  <a class="brand" href="${link(base, '')}"><img src="${base}img/wiki-icon-192.png" alt="" width="28" height="28"> <b class="brand-name">YanlinGTA</b> <span>Wiki</span></a>
  <button class="nav-toggle" type="button" aria-controls="sidebar" aria-expanded="false">☰ 目錄</button>
  <span class="top-gap"></span>
  ${THEME_SWITCH}
  <a class="top-link" href="${REPO_URL}" target="_blank" rel="noopener">GitHub ↗</a>
  <a class="play" href="${base}${GAME_URL}">▶ 開始玩</a>
</header>

<div class="docs">
${sidebarHtml(page, base)}
<main id="content" class="doc">
  <div class="doc-head">
    <nav class="crumbs" aria-label="位置"><a href="${link(base, '')}">WIKI</a><span>/</span>${page.post ? `<a href="${link(base, 'news')}">最新消息</a>` : esc(page.group)}</nav>
    <div class="doc-tools">${share}<span class="doc-num">${num(i)}</span></div>
  </div>
  <h1>${h1}</h1>
  <p class="lead">${body.lead}</p>
  <div class="meta">${body.meta.map((m, k) => `<span>${k === 0 ? '<i class="dot"></i>' : ''}${esc(m)}</span>`).join('')}</div>
  <article class="doc-body">
${body.html}
  </article>
  <nav class="pager" aria-label="上一頁與下一頁">${pager(prev, 'prev')}${pager(next, 'next')}</nav>
</main>
<aside class="toc" aria-label="本頁內容"${body.toc.length ? '' : ' data-empty'}>
  <p class="mono">本頁內容</p>
  <ul>${body.toc.map(([id, t, lv]) => `<li class="lv${lv}"><a href="#${id}" data-spy="${id}">${esc(t)}</a></li>`).join('')}</ul>
  <a class="toc-top" href="#content">↑ 回到最上面</a>
</aside>
</div>
<div class="scrim" hidden></div>

<footer class="foot">
  <p>YanlinGTA Wiki · 除了虛構角色，角色皆由真人改編。</p>
  <p><a href="${base}${GAME_URL}">yanlin-gta.com</a></p>
</footer>
<script src="${base}wiki.js" defer></script>
</body>
</html>
`;
}

// 所有頁面：{ 'index.html': html, 'controls/index.html': html, … }
export function renderPages(data, { promo = true, controls = '', postSizes = {} } = {}) {
  const opts = { promo, controls, postSizes };
  const posts = (data.news || []).map((n) => ({
    slug: postSlug(n),
    group: '開始',
    title: n.title,
    post: n,
  }));
  return Object.fromEntries(
    [...PAGES, ...posts].map((p) => [pageFile(p.slug), renderPage(p, data, opts)])
  );
}
// 測試用：所有頁面接在一起
export const renderWiki = (data, opts) => Object.values(renderPages(data, opts)).join('\n');

export function buildWiki({ root = ROOT, outDir = path.join(root, 'dist', 'wiki') } = {}) {
  const data = loadWikiData(root);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
  // 首頁宣傳片：README 用的同一支（docs/media/promo/），poster 先顯示、按播放才下載。
  // 找不到影片（例如 Docker 建置時 docs/ 被 .dockerignore 排除）就退回封面圖，不讓建置失敗。
  const promoDir = path.join(root, 'docs', 'media', 'promo');
  const promoFiles = [
    ['yanlin-promo-58s-v2.mp4', 'promo.mp4'],
    ['yanlin-promo-58s-v2-poster.jpg', 'promo-poster.jpg'],
  ];
  const promo = promoFiles.every(([src]) => fs.existsSync(path.join(promoDir, src)));
  if (!promo) console.warn('wiki: 找不到宣傳片，首頁改用封面圖');
  // style.css / game-controls.css / wiki.js 的網址加上內容雜湊（?v=…）：GitHub Pages 讓瀏覽器快取約 10 分鐘，
  // 不加的話剛更新時可能拿到新的 index.html 配舊的 wiki.js（例如操作說明分頁點了沒反應）
  const assets = {
    'style.css': fs.readFileSync(path.join(root, 'wiki', 'style.css'), 'utf-8'),
    'game-controls.css': gameControlsCss(
      fs.readFileSync(path.join(root, 'src', 'styles', 'style.css'), 'utf-8')
    ),
    'wiki.js': fs.readFileSync(path.join(root, 'wiki', 'wiki.js'), 'utf-8'),
  };
  const vers = Object.entries(assets).map(([name, text]) => {
    fs.writeFileSync(path.join(outDir, name), text, 'utf-8');
    const v = crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
    return [name, v];
  });
  const postSizes = Object.fromEntries(
    data.news
      .filter((n) => n.image)
      .map((n) => [n.image, jpegSize(path.join(root, 'wiki', 'news', n.image))])
      .filter(([, sz]) => sz)
  );
  const pages = renderPages(data, { promo, controls: gameControlsHtml(), postSizes });
  for (const [file, page] of Object.entries(pages)) {
    let html = page;
    for (const [name, v] of vers)
      for (const pre of ['"', '"../', '"../../'])
        html = html.replaceAll(`${pre}${name}"`, `${pre}${name}?v=${v}"`);
    fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
    fs.writeFileSync(path.join(outDir, file), html, 'utf-8');
  }
  fs.copyFileSync(path.join(root, 'assets', 'loading.jpg'), path.join(outDir, 'img', 'cover.jpg'));
  if (promo) {
    fs.mkdirSync(path.join(outDir, 'media'), { recursive: true });
    for (const [src, dest] of promoFiles) {
      fs.copyFileSync(path.join(promoDir, src), path.join(outDir, 'media', dest));
    }
  }
  // 操作教學的遊戲截圖（wiki/shots/，用 headless Chrome 截的電腦版與手機橫放畫面）
  fs.mkdirSync(path.join(outDir, 'shots'), { recursive: true });
  for (const f of fs.readdirSync(path.join(root, 'wiki', 'shots'))) {
    fs.copyFileSync(path.join(root, 'wiki', 'shots', f), path.join(outDir, 'shots', f));
  }
  // 最新消息的照片（wiki/news/）
  fs.mkdirSync(path.join(outDir, 'news'), { recursive: true });
  for (const n of data.news) {
    if (n.image)
      fs.copyFileSync(path.join(root, 'wiki', 'news', n.image), path.join(outDir, 'news', n.image));
  }
  // Wiki 自己的網頁圖示與「加入主畫面」圖示（wiki/icons/），manifest 放在 /wiki/ 底下，start_url 開回 Wiki
  for (const f of fs.readdirSync(path.join(root, 'wiki', 'icons'))) {
    fs.copyFileSync(path.join(root, 'wiki', 'icons', f), path.join(outDir, 'img', f));
  }
  fs.copyFileSync(
    path.join(root, 'wiki', 'manifest.webmanifest'),
    path.join(outDir, 'manifest.webmanifest')
  );
  for (const c of data.chars) {
    if (c.avatar) fs.copyFileSync(c.avatarSrc, path.join(outDir, c.avatar));
  }
  return {
    outDir,
    pages: Object.keys(pages).length,
    chars: data.chars.length,
    quests: data.quests.length,
    shops: data.shops.length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildWiki();
  console.log(
    `Wiki 已輸出到 ${path.relative(ROOT, r.outDir)}/（${r.pages} 頁、${r.chars} 個角色、${r.quests} 個任務、${r.shops} 家合作店家）`
  );
}
