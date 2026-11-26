// YanlinGTA Wiki 產生器：讀 data/npcs.json + wiki/people.json + wiki/quests.json，
// 輸出一個不需要 JavaScript 也能看的靜態網站到 dist/wiki/，跟遊戲一起部署（yanlin-gta.com/wiki/）。
// npm run build 會自動產生（vite.config.js）；只改 Wiki 時可以單獨跑 npm run wiki:build。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
// Wiki 在遊戲網站的 /wiki/ 底下：用相對路徑回到遊戲，本機預覽和正式站都能用
const GAME_URL = '../';
const REPO_URL = 'https://github.com/howardtuan/YanlinGTA';

export const GROUPS = [
  { id: 'main', label: '主角' },
  { id: 'dev', label: '開發者' },
  { id: 'classmate', label: '同學與室友' },
  { id: 'campus', label: '校園人物' },
  { id: 'ai', label: 'AI 夥伴' },
  { id: 'guest', label: '致敬客串' },
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
  const people = readJson(path.join(root, 'wiki', 'people.json')).people;
  const quests = readJson(path.join(root, 'wiki', 'quests.json')).quests;
  const avatarDir = path.join(root, 'assets', 'gram');

  const chars = npcs.map((n) => {
    const p = people[n.id] || {};
    const avatar = fs.existsSync(path.join(avatarDir, `${n.id}_av.jpg`))
      ? `img/${n.id}_av.jpg`
      : '';
    return {
      ...n,
      group: p.group || 'campus',
      social: p.social !== false,
      ig: safeUrl(p.ig),
      linkedin: safeUrl(p.linkedin),
      devRole: p.devRole || '',
      note: p.note || '',
      avatar,
      quests: quests.filter((q) => q.npcs.includes(n.id)),
    };
  });
  const order = GROUPS.map((g) => g.id);
  chars.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  return { chars, quests };
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

export function renderWiki({ chars, quests }) {
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
<title>YanlinGTA Wiki · 中原順起來 資管要贏 票投彥霖</title>
<meta name="description" content="YanlinGTA 遊戲百科：角色介紹、主線與支線任務攻略、開發團隊。所有角色皆由真人改編。">
<meta property="og:title" content="YanlinGTA Wiki">
<meta property="og:description" content="中原大學 3D 開放世界競選遊戲的角色與任務百科">
<meta property="og:image" content="img/cover.jpg">
<link rel="icon" href="img/icon-192.png">
<link rel="stylesheet" href="style.css">
</head>
<body>
<a class="skip" href="#content">跳到內容</a>
<header class="top">
  <a class="brand" href="#top"><img src="img/icon-192.png" alt="" width="28" height="28"> YanlinGTA <span>Wiki</span></a>
  <nav aria-label="主選單">
    <a href="#overview">概覽</a><a href="#characters">角色</a><a href="#main-quests">主線</a><a href="#side-quests">支線</a><a href="#team">開發團隊</a>
  </nav>
  <a class="play" href="${GAME_URL}">▶ 開始玩</a>
</header>

<main id="content">
<section class="hero" id="top">
  <img class="hero-img" src="img/cover.jpg" alt="中原順起來 · 資管要贏 票投彥霖 遊戲封面">
  <div class="hero-text">
    <p class="kicker">第 34 屆中原大學資管系 系學會會長選舉</p>
    <h1>中原順起來 · 資管要贏 票投彥霖</h1>
    <p>一款在瀏覽器就能玩的 3D 開放世界競選遊戲。騎著粉白色 SYM JET SL 穿梭真實比例的中原大學校園，幫候選人彥霖拉票。遊戲裡的同學、室友和開發者，<b>全部由真人改編</b>。</p>
    <p class="memoir">這是一群資管系的好朋友，一起動手打造、屬於我們自己的<b>大學回憶錄</b>：宿舍的床位、打工的麥當勞、半夜的麻將桌、彼此的口頭禪和糗事，都被寫進了這座校園。</p>
    <div class="cta"><a class="btn primary" href="${GAME_URL}">▶ 免安裝，直接玩</a><a class="btn" href="#characters">認識角色</a></div>
  </div>
</section>

<section id="overview" class="block">
  <h2>遊戲概覽</h2>
  <div class="overview-grid">
    <div class="ov"><span class="ov-n">5</span><span>主線任務</span></div>
    <div class="ov"><span class="ov-n">${quests.filter((q) => q.type !== 'main').length}</span><span>支線與案件</span></div>
    <div class="ov"><span class="ov-n">${chars.length}</span><span>登場角色</span></div>
    <div class="ov"><span class="ov-n">34</span><span>金色選票</span></div>
  </div>
  <div class="prose">
    <p>投票日就在明天。玩家扮演候選人<b>彥霖</b>，跟著兩個全息 AI 夥伴 M.O.N.D.A.Y 與 W.E.D.N.E.S.D.A.Y 完成競選主線：貼傳單、買早餐、掃街拉票、搶救布條，最後用真正的 SQL 查出是誰割了競選布條。</p>
    <p>主線之外，校園裡每個角色都有自己的 24 小時作息、宿舍床位、對白和手機社群動態。跟他們聊天加好友，就會觸發各自的支線劇情。另外還有麥當勞打工、新中北路障礙賽、力行 277 寢 3D 台灣麻將（可以跟朋友連線）、資管學堂程式課、靈感股市和直升機空投等玩法。</p>
    <p class="hint">電腦用鍵盤滑鼠或手把、手機用觸控都能玩：<kbd>WASD</kbd> 移動、<kbd>E</kbd> 互動、<kbd>F</kbd> 上下車、<kbd>M</kbd> 大地圖、滑鼠左鍵發傳單、<kbd>G</kbd> 比 ✌。</p>
  </div>
</section>

<section id="characters" class="block">
  <h2>角色介紹</h2>
  <p class="lead">遊戲裡的角色都是以真實人物為原型改編，點社群連結可以認識本人。標示 🛠 的是這個遊戲的開發者。</p>
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

<footer class="foot">
  <p>YanlinGTA Wiki · 角色皆由真人改編，致敬角色僅取外型特徵、不代表本人。</p>
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
  fs.writeFileSync(path.join(outDir, 'index.html'), renderWiki(data), 'utf-8');
  fs.copyFileSync(path.join(root, 'wiki', 'style.css'), path.join(outDir, 'style.css'));
  fs.copyFileSync(path.join(root, 'wiki', 'wiki.js'), path.join(outDir, 'wiki.js'));
  fs.copyFileSync(path.join(root, 'assets', 'loading.jpg'), path.join(outDir, 'img', 'cover.jpg'));
  fs.copyFileSync(
    path.join(root, 'assets', 'icon', 'icon-192.png'),
    path.join(outDir, 'img', 'icon-192.png')
  );
  for (const c of data.chars) {
    if (c.avatar) {
      fs.copyFileSync(
        path.join(root, 'assets', 'gram', `${c.id}_av.jpg`),
        path.join(outDir, c.avatar)
      );
    }
  }
  return { outDir, chars: data.chars.length, quests: data.quests.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildWiki();
  console.log(
    `Wiki 已輸出到 ${path.relative(ROOT, r.outDir)}/（${r.chars} 個角色、${r.quests} 個任務）`
  );
}
