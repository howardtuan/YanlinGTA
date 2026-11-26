// YanlinGTA Wiki 產生器：讀 data/npcs.json + wiki/people.json + wiki/quests.json + wiki/shops.json，
// 輸出一個不需要 JavaScript 也能看的靜態網站到 dist/wiki/，跟遊戲一起部署（yanlin-gta.com/wiki/）。
// npm run build 會自動產生（vite.config.js）；只改 Wiki 時可以單獨跑 npm run wiki:build。
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

// 只接受 http(s) 網址，避免 javascript: 之類的連結被塞進頁面
const safeUrl = (u) => (/^https:\/\/[^\s"<>]+$/i.test(u || '') ? u : '');

export function loadWikiData(root = ROOT) {
  const npcs = readJson(path.join(root, 'data', 'npcs.json')).npcs;
  const { people, extras = [] } = readJson(path.join(root, 'wiki', 'people.json'));
  const quests = readJson(path.join(root, 'wiki', 'quests.json')).quests;
  const shops = readJson(path.join(root, 'wiki', 'shops.json')).shops;
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
      ig: safeUrl(p.ig),
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
  return { chars, quests, shops };
}

function avatarHtml(c, size = '') {
  if (c.avatar) {
    return `<img class="av ${size}" src="${c.avatar}" alt="${esc(c.name)} 的遊戲頭像" loading="lazy" width="96" height="96">`;
  }
  const glyph = c.group === 'ai' ? '◎' : [...c.name][0];
  return `<span class="av av-fallback ${size} g-${c.group}" aria-hidden="true">${esc(glyph)}</span>`;
}

function socialHtml(c) {
  if (!c.social) return '';
  const link = (url, cls, label) =>
    url
      ? `<a class="soc ${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`
      : `<span class="soc ${cls} todo" title="連結待補">${label}・待補</span>`;
  return `<div class="socials">${link(c.ig, 'ig', 'Instagram')}${link(c.linkedin, 'li', 'LinkedIn')}</div>`;
}

function charCard(c) {
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
            `<li><a href="#q-${q.id}"><span class="qt ${QUEST_TYPES[q.type].cls}">${QUEST_TYPES[q.type].label}</span>${esc(q.icon)} ${esc(q.title)}</a></li>`
        )
        .join('')}</ul></div>`
    : '';
  return `
<article class="char" id="npc-${esc(c.id)}" data-group="${c.group}" data-search="${esc(
    [c.name, c.title, c.dept, c.personality, ...(c.interests || [])].join(' ').toLowerCase()
  )}">
  <header class="char-head">
    ${avatarHtml(c)}
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

function questCard(q, byId) {
  const t = QUEST_TYPES[q.type];
  const people = q.npcs
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((c) => `<a class="chip" href="#npc-${c.id}">${esc(c.name)}</a>`)
    .join('');
  return `
<article class="quest" id="q-${esc(q.id)}">
  <header><span class="qt ${t.cls}">${t.label}</span><h3>${esc(q.icon)} ${esc(q.title)}</h3></header>
  <p class="trigger"><b>觸發：</b>${esc(q.trigger)}</p>
  <ol>${q.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  <p class="reward"><b>獎勵：</b>${esc(q.reward)}</p>
  ${people ? `<div class="chips">${people}</div>` : ''}
</article>`;
}

function shopCard(s, byId) {
  const people = (s.npcs || [])
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((c) => `<a class="chip" href="#npc-${c.id}">${esc(c.name)}</a>`)
    .join('');
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

const shot = (src, alt, caption) =>
  `<figure class="shot"><img src="${src}" alt="${esc(alt)}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

function controlsSection(ctlHtml) {
  return `
<section id="controls" class="block">
  <h2>操作教學</h2>
  <p class="lead">電腦（鍵盤滑鼠或手把）和手機都能玩，免安裝、打開網頁就開始。下面這張按鍵圖跟遊戲裡「⌨ 操作說明」一模一樣，遊戲中也可以在標題畫面或暫停選單隨時打開。</p>
  <h3 id="controls-map">按鍵配置</h3>
  <p>切換分頁看<b>鍵盤滑鼠</b>、<b>手把</b>（以 Xbox 按鍵標示，也支援 PlayStation、Switch Pro）和<b>觸控</b>的操作。</p>
  <div class="game-ctl">${ctlHtml}</div>
  <h3 id="controls-desktop">電腦版畫面</h3>
  <p>先點一下畫面鎖定滑鼠游標，就能用滑鼠轉動視角；按 <kbd>Esc</kbd> 放開游標並暫停。</p>
  ${shot('shots/desktop-title.jpg', '遊戲標題畫面', '標題畫面：<b>▶ 開始遊戲</b>、操作說明、設定 / 音樂、效能測試，還有 <b>📖 彥霖GTA WIKI</b>。')}
  ${shot('shots/desktop-play.jpg', '電腦版遊戲畫面', '電腦版遊戲畫面：左上角是目前可以用的按鍵提示，正上方是目前任務，右上角是時間、得票、金色選票和錢包，左下角是小地圖，下方是對話框。')}
  <h3 id="controls-mobile">手機版畫面</h3>
  <p>建議把手機<b>橫放</b>。左下角是虛擬搖桿，往上推就是騎車／開車的油門；右下角是動作按鈕。</p>
  ${shot('shots/mobile-play.jpg', '手機版遊戲畫面', '手機版畫面（橫放）：左下角虛擬搖桿，右下角 F 上下車、E 互動、📄 發傳單、⤒ 跳／甩尾、» 衝刺、🗺 地圖、📯 喇叭、⚙ 設定。')}
</section>`;
}

export const NAV = [
  ['overview', '遊戲概覽'],
  [
    'controls',
    '操作教學',
    [
      ['controls-map', '按鍵配置'],
      ['controls-desktop', '電腦版畫面'],
      ['controls-mobile', '手機版畫面'],
    ],
  ],
  ['characters', '角色介紹'],
  ['main-quests', '主線任務'],
  ['side-quests', '支線任務'],
  ['cases', 'SQL 偵探案件'],
  ['shops', '合作店家'],
  ['team', '開發團隊'],
];
const sidebar = () => `<aside class="sidebar" id="sidebar">
  <nav aria-label="目錄">
    <p class="side-title">目錄</p>
    <ul>${NAV.map(
      ([id, label, subs]) =>
        `<li><a href="#${id}" data-spy="${id}">${esc(label)}</a>${
          subs
            ? `<ul class="sub">${subs.map(([sid, sl]) => `<li><a href="#${sid}" data-spy="${sid}">${esc(sl)}</a></li>`).join('')}</ul>`
            : ''
        }</li>`
    ).join('')}</ul>
    <a class="side-play" href="${GAME_URL}">▶ 開始玩遊戲</a>
  </nav>
</aside>`;

export function renderWiki({ chars, quests, shops = [] }, { promo = true, controls = '' } = {}) {
  const byId = new Map(chars.map((c) => [c.id, c]));
  const devs = chars.filter((c) => c.group === 'dev');
  const counts = Object.fromEntries(
    GROUPS.map((g) => [g.id, chars.filter((c) => c.group === g.id).length])
  );
  const filterBtns = [
    `<button class="filter on" data-f="all" aria-pressed="true">全部 ${chars.length}</button>`,
    ...GROUPS.filter((g) => counts[g.id]).map(
      (g) =>
        `<button class="filter" data-f="${g.id}" aria-pressed="false">${g.label} ${counts[g.id]}</button>`
    ),
  ].join('');
  const questSection = (type, title, intro) => `
  <section id="${type === 'main' ? 'main-quests' : type === 'side' ? 'side-quests' : 'cases'}" class="block">
    <h2>${title}</h2>
    <p class="lead">${intro}</p>
    <div class="quest-grid">${quests
      .filter((q) => q.type === type)
      .map((q) => questCard(q, byId))
      .join('')}</div>
  </section>`;

  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YanlinGTA Wiki · 彥霖 Great Times Adventure · 中原順起來 資管要贏 票投彥霖</title>
<meta name="description" content="YanlinGTA（Yanlin Great Times Adventure）遊戲百科：角色介紹、主線與支線任務攻略、開發團隊。同學、室友與開發者皆由真人改編。">
<meta property="og:title" content="YanlinGTA Wiki">
<meta property="og:description" content="中原大學 3D 開放世界競選遊戲的角色與任務百科">
<meta property="og:image" content="img/cover.jpg">
<meta name="theme-color" content="#2e105c">
<link rel="icon" href="img/wiki-favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" href="img/wiki-icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="img/wiki-apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="彥霖 Wiki">
<link rel="manifest" href="manifest.webmanifest">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="game-controls.css">
</head>
<body>
<a class="skip" href="#content">跳到內容</a>
<header class="top">
  <a class="brand" href="#top"><img src="img/wiki-icon-192.png" alt="" width="28" height="28"> YanlinGTA <span>Wiki</span></a>
  <button class="nav-toggle" type="button" aria-controls="sidebar" aria-expanded="false">☰ 目錄</button>
  <span class="top-gap"></span>
  <a class="play" href="${GAME_URL}">▶ 開始玩</a>
</header>

<div class="layout">
${sidebar()}
<main id="content">
<section class="hero" id="top">
  ${
    promo
      ? `<figure class="hero-media">
    <video class="hero-img" controls playsinline preload="none" poster="media/promo-poster.jpg" aria-label="YanlinGTA 58 秒宣傳片">
      <source src="media/promo.mp4" type="video/mp4">
      <a href="media/promo.mp4">下載宣傳片</a>
    </video>
    <figcaption>▶ 58 秒宣傳片：第一人稱校園、手機 App、電腦操作全收錄</figcaption>
  </figure>`
      : '<img class="hero-img" src="img/cover.jpg" alt="中原順起來 · 資管要贏 票投彥霖 遊戲封面">'
  }
  <div class="hero-text">
    <p class="kicker">YanlinGTA = Yanlin <b>G</b>reat <b>T</b>imes <b>A</b>dventure · 第 34 屆中原大學資管系 系學會會長選舉</p>
    <h1>中原順起來 · 資管要贏 票投彥霖</h1>
    <p>一款在瀏覽器就能玩的 3D 開放世界競選遊戲。騎著粉白色 SYM JET SL 穿梭真實比例的中原大學校園，幫候選人彥霖拉票。遊戲裡的同學、室友和開發者，<b>全部由真人改編</b>。</p>
    <p class="memoir">這是一群資管系的好朋友，一起動手打造、屬於我們自己的<b>大學回憶錄</b>：宿舍的床位、打工的麥當勞、半夜的麻將桌、彼此的口頭禪和糗事，都被寫進了這座校園。</p>
    <div class="cta"><a class="btn primary" href="${GAME_URL}">▶ 免安裝，直接玩</a><a class="btn" href="#characters">認識角色</a></div>
  </div>
</section>

<section id="overview" class="block">
  <h2>遊戲概覽</h2>
  <p class="gta-name"><b>YanlinGTA</b> 的 GTA，是 <b>Great Times Adventure</b> 的縮寫：彥霖和一群好朋友的大學美好時光大冒險。</p>
  <div class="overview-grid">
    <div class="ov"><span class="ov-n">5</span><span>主線任務</span></div>
    <div class="ov"><span class="ov-n">${quests.filter((q) => q.type !== 'main').length}</span><span>支線與案件</span></div>
    <div class="ov"><span class="ov-n">${chars.length}</span><span>登場角色</span></div>
    <div class="ov"><span class="ov-n">34</span><span>金色選票</span></div>
  </div>
  <div class="prose">
    <p>投票日就在明天。玩家扮演候選人<b>彥霖</b>，跟著兩個全息 AI 夥伴 M.O.N.D.A.Y 與 W.E.D.N.E.S.D.A.Y 完成競選主線：貼傳單、買早餐、掃街拉票、搶救布條，最後用真正的 SQL 查出是誰割了競選布條。卡關的時候，右下角的金色小助手 S.U.N.D.A.Y 會給提示。</p>
    <p>主線之外，校園裡每個角色都有自己的 24 小時作息、宿舍床位、對白和手機社群動態。跟他們聊天加好友，就會觸發各自的支線劇情。另外還有麥當勞打工、新中北路障礙賽、力行 277 寢 3D 台灣麻將（可以跟朋友連線）、資管學堂程式課、靈感股市和直升機空投等玩法。</p>
    <p class="hint">電腦用鍵盤滑鼠或手把、手機用觸控都能玩：<kbd>WASD</kbd> 移動、<kbd>E</kbd> 互動、<kbd>F</kbd> 上下車、<kbd>M</kbd> 大地圖、滑鼠左鍵發傳單、<kbd>G</kbd> 比 ✌。</p>
  </div>
</section>

${controlsSection(controls)}

<section id="characters" class="block">
  <h2>角色介紹</h2>
  <p class="lead">遊戲裡的同學、室友和開發者都是以真實人物為原型改編，點社群連結可以認識本人。標示 🛠 的是這個遊戲的開發者。</p>
  <div class="toolbar">
    <div class="filters" role="group" aria-label="依分類篩選">${filterBtns}</div>
    <input class="search" type="search" placeholder="搜尋角色、科系、興趣…" aria-label="搜尋角色">
  </div>
  <div class="char-grid">${chars.map(charCard).join('')}</div>
  <p class="empty" hidden>找不到符合的角色。</p>
</section>

${questSection('main', '主線任務', '五個競選任務依序推進，主要由 M.O.N.D.A.Y 與 W.E.D.N.E.S.D.A.Y 交代。')}
${questSection('side', '支線任務', '跟角色加好友後，在手機私訊或當面聊天時觸發。')}
${questSection('case', 'SQL 偵探案件', '在電腦終端機輸入 case 開啟，要寫真的 SQL 查資料；不會寫程式也可以「🎬 一鍵通關」。')}

<section id="shops" class="block">
  <h2>合作店家</h2>
  <p class="lead">跟我們合作、被搬進遊戲裡的真實店家，走進去就能逛、能買東西。</p>
  <div class="quest-grid">${shops.map((s) => shopCard(s, byId)).join('')}</div>
</section>

<section id="team" class="block">
  <h2>開發團隊</h2>
  <p class="lead">這 ${devs.length} 位開發者本人也出現在遊戲裡，在校園裡找得到他們。</p>
  <div class="team-grid">${devs
    .map(
      (c) => `
    <div class="dev">
      ${avatarHtml(c, 'lg')}
      <div>
        <h3><a href="#npc-${c.id}">${esc(c.name)}</a> <span class="tag dev-badge">🛠 開發者</span></h3>
        <p class="dev-role">${esc(c.devRole)}</p>
        ${socialHtml(c)}
      </div>
    </div>`
    )
    .join('')}</div>
  <p class="repo">原始碼：<a href="${REPO_URL}" target="_blank" rel="noopener">github.com/howardtuan/YanlinGTA</a></p>
</section>
</main>
</div>
<div class="scrim" hidden></div>

<footer class="foot">
  <p>YanlinGTA Wiki · 除了虛構角色，角色皆由真人改編。</p>
  <p><a href="${GAME_URL}">yanlin-gta.com</a></p>
</footer>
<script src="wiki.js" defer></script>
</body>
</html>
`;
}

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
  fs.writeFileSync(
    path.join(outDir, 'index.html'),
    renderWiki(data, { promo, controls: gameControlsHtml() }),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(outDir, 'game-controls.css'),
    gameControlsCss(fs.readFileSync(path.join(root, 'src', 'styles', 'style.css'), 'utf-8')),
    'utf-8'
  );
  fs.copyFileSync(path.join(root, 'wiki', 'style.css'), path.join(outDir, 'style.css'));
  fs.copyFileSync(path.join(root, 'wiki', 'wiki.js'), path.join(outDir, 'wiki.js'));
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
  return { outDir, chars: data.chars.length, quests: data.quests.length, shops: data.shops.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildWiki();
  console.log(
    `Wiki 已輸出到 ${path.relative(ROOT, r.outDir)}/（${r.chars} 個角色、${r.quests} 個任務、${r.shops} 家合作店家）`
  );
}
