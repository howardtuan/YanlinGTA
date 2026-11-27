// 搜尋引擎（SEO）與 AI 答案引擎（AEO / GEO）用的網站根目錄檔案：sitemap.xml、robots.txt、llms.txt。
// npm run build 時由 vite.config.js 呼叫 buildSeo() 輸出到 dist/ 根目錄；網址清單跟 Wiki 頁面（wiki/build.mjs 的 PAGES
// 與最新消息文章）同步，新增 Wiki 頁面或文章不用另外改這裡。Google Search Console 提交的就是 dist/sitemap.xml。
import fs from 'node:fs';
import path from 'node:path';
import { PAGES, SITE, faqs, loadWikiData, pageUrl, postSlug } from './build.mjs';

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 網站所有可索引的網址：遊戲首頁、Wiki 每一頁、每篇最新消息文章（文章帶 lastmod）
export function siteUrls(data) {
  return [
    { loc: `${SITE}/`, priority: '1.0' },
    ...PAGES.map((p) => ({ loc: pageUrl(p.slug), priority: p.slug ? '0.8' : '0.9' })),
    ...(data.news || []).map((n) => ({
      loc: pageUrl(postSlug(n)),
      lastmod: n.date,
      priority: '0.6',
    })),
  ];
}

export function sitemapXml(data) {
  const rows = siteUrls(data).map(
    (u) =>
      `  <url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${xmlEsc(u.lastmod)}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join('\n')}
</urlset>
`;
}

// 全站開放索引（含 GPTBot、ClaudeBot、PerplexityBot、Google-Extended 等 AI 爬蟲，讓 AI 搜尋能引用遊戲與 Wiki）
export function robotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
}

// llms.txt（https://llmstxt.org/）：給 ChatGPT、Claude、Perplexity 等 AI 讀的純文字網站摘要，回答「這是什麼遊戲」時好引用
export function llmsTxt(data) {
  const { chars = [], quests = [], news = [] } = data;
  const byType = (t) => quests.filter((q) => q.type === t);
  const questLines = (t) =>
    byType(t)
      .map((q) => `- ${q.title.replace(/^[^\p{L}\p{N}]+/u, '')}：${q.trigger}`)
      .join('\n');
  const wikiLines = PAGES.map((p) => `- [${p.title}](${pageUrl(p.slug)})`).join('\n');
  return `# 中原順起來 · 資管要贏 票投彥霖（YanlinGTA）

> YanlinGTA（Yanlin Great Times Adventure）是一款免安裝、用電腦或手機瀏覽器就能玩的 3D 開放世界網頁遊戲，以真實比例重現中原大學（桃園市中壢區）校園與中原夜市周邊。玩家扮演第 34 屆中原大學資訊管理學系系學會會長候選人「彥霖」，騎著 JAT SM 機車穿梭校園，完成競選任務幫自己拉票。遊戲免費，角色由真實的資管系同學、室友與開發者改編。

- 立即遊玩：${SITE}/
- 遊戲百科 Wiki：${pageUrl('')}
- 原始碼：https://github.com/howardtuan/YanlinGTA

## 常見問題

${faqs(data)
  .map(([q, a]) => `### ${q}\n\n${a}`)
  .join('\n\n')}

## 主線任務

${questLines('main')}

## 支線任務

${questLines('side')}

## SQL 偵探案件

${questLines('case')}

## 角色

${chars.map((c) => `- ${c.name}${c.title ? `：${c.title}` : ''}`).join('\n')}
${
  news.length
    ? `
## 最新消息

${news.map((n) => `- ${n.date} [${n.title}](${pageUrl(postSlug(n))})`).join('\n')}
`
    : ''
}
## Wiki 頁面

${wikiLines}
`;
}

export function buildSeo({ root, outDir }) {
  const data = loadWikiData(root);
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml(data), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'robots.txt'), robotsTxt(), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'llms.txt'), llmsTxt(data), 'utf-8');
}
