import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { PAGES, SITE, faqs, loadWikiData, pageUrl, renderPages } from '../../wiki/build.mjs';
import { llmsTxt, robotsTxt, siteUrls, sitemapXml } from '../../wiki/seo.mjs';

const data = loadWikiData();
const ldBlocks = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1])
  );

describe('seo', () => {
  it('sitemap 收錄遊戲首頁、每一頁 Wiki 與每篇文章，網址都是完整 https 且不重複', () => {
    const urls = siteUrls(data).map((u) => u.loc);
    expect(urls).toContain(`${SITE}/`);
    for (const p of PAGES) expect(urls).toContain(pageUrl(p.slug));
    expect(urls.length).toBe(1 + PAGES.length + data.news.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u.startsWith(`${SITE}/`)).toBe(true);
    const xml = sitemapXml(data);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml.match(/<url>/g).length).toBe(urls.length);
  });

  it('robots.txt 全站開放並指向 sitemap', () => {
    expect(robotsTxt()).toContain('Allow: /');
    expect(robotsTxt()).not.toMatch(/Disallow: \/\s/);
    expect(robotsTxt()).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it('llms.txt 有遊戲網址、常見問題與所有任務', () => {
    const txt = llmsTxt(data);
    expect(txt.startsWith('# ')).toBe(true);
    expect(txt).toContain(`${SITE}/`);
    for (const [q] of faqs(data)) expect(txt).toContain(q);
    for (const q of data.quests) expect(txt).toContain(q.trigger);
  });

  it('每頁 Wiki 都有合法的 JSON-LD；首頁有 FAQPage 而且問題在頁面上看得到，文章是 NewsArticle', () => {
    const pages = renderPages(data, { promo: false });
    for (const [file, html] of Object.entries(pages)) {
      const blocks = ldBlocks(html);
      expect(blocks.length, file).toBe(1);
      expect(blocks[0]['@context']).toBe('https://schema.org');
    }
    const home = pages['index.html'];
    const faq = ldBlocks(home)[0]['@graph'].find((g) => g['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBe(faqs(data).length);
    for (const q of faq.mainEntity) expect(home).toContain(`<summary>${q.name}</summary>`);
    for (const n of data.news) {
      const g = ldBlocks(pages[`news/${n.id}/index.html`])[0]['@graph'];
      const art = g.find((x) => x['@type'] === 'NewsArticle');
      expect(art.headline).toBe(n.title);
      expect(art.datePublished).toBe(n.date);
      expect(g.find((x) => x['@type'] === 'BreadcrumbList').itemListElement.length).toBe(3);
    }
  });

  it('遊戲首頁 index.html 的 JSON-LD 是合法 JSON 且宣告 VideoGame', () => {
    const html = fs.readFileSync('index.html', 'utf-8');
    const types = ldBlocks(html)[0]['@graph'].map((g) => g['@type']);
    expect(types).toEqual(expect.arrayContaining(['WebSite', 'VideoGame']));
  });
});
