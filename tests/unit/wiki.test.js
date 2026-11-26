import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PAGES,
  buildWiki,
  loadWikiData,
  pageFile,
  renderPages,
  renderWiki,
} from '../../wiki/build.mjs';

const npcs = JSON.parse(fs.readFileSync('data/npcs.json', 'utf-8')).npcs;
const { people, extras = [] } = JSON.parse(fs.readFileSync('wiki/people.json', 'utf-8'));
const quests = JSON.parse(fs.readFileSync('wiki/quests.json', 'utf-8')).quests;
const shops = JSON.parse(fs.readFileSync('wiki/shops.json', 'utf-8')).shops;
const onWiki = npcs.filter((n) => people[n.id].wiki !== false);

describe('wiki', () => {
  it('每個 NPC 都有 Wiki 分類，Wiki 也沒有多出不存在的角色', () => {
    const ids = npcs.map((n) => n.id).sort();
    expect(Object.keys(people).sort()).toEqual(ids);
  });

  it('只在 Wiki 的角色（extras）id 不重複、不跟遊戲 NPC 撞名，而且是虛構角色、不放社群連結', () => {
    const ids = new Set(npcs.map((n) => n.id));
    for (const e of extras) {
      expect(ids.has(e.id), e.id).toBe(false);
      ids.add(e.id);
      expect(e.group, e.id).toBe('fiction');
      expect(e.social, e.id).toBe(false);
    }
    const html = renderWiki(loadWikiData());
    for (const e of extras) expect(html).toContain(`id="npc-${e.id}"`);
    expect(html).toContain('id="npc-tzuyu"');
  });

  it('任務與店家裡列的角色都在 Wiki 上、任務 id 不重複', () => {
    const ids = new Set(onWiki.map((n) => n.id));
    for (const q of [...quests, ...shops])
      for (const id of q.npcs) expect(ids.has(id), `${q.id}: ${id}`).toBe(true);
    expect(new Set(quests.map((q) => q.id)).size).toBe(quests.length);
  });

  it('社群連結只接受 https 網址', () => {
    for (const [id, p] of Object.entries(people)) {
      for (const k of ['linkedin', 'github']) {
        if (p[k]) expect(p[k], `${id}.${k}`).toMatch(/^https:\/\//);
      }
    }
    for (const s of shops) if (s.url) expect(s.url, s.id).toMatch(/^https:\/\//);
    // 只放 LinkedIn 與 GitHub，不放 Instagram
    for (const [id, p] of Object.entries(people)) expect(p, id).not.toHaveProperty('ig');
    expect(renderWiki(loadWikiData())).not.toContain('Instagram');
  });

  it('頁面列出角色、任務與合作店家，開發者有標示', () => {
    const html = renderWiki(loadWikiData());
    for (const n of npcs)
      if (people[n.id].wiki === false) expect(html).not.toContain(`id="npc-${n.id}"`);
      else expect(html).toContain(`id="npc-${n.id}"`);
    for (const q of quests) expect(html).toContain(`id="q-${q.id}"`);
    for (const s of shops) expect(html).toContain(`id="shop-${s.id}"`);
    expect(html.match(/🛠 本遊戲開發者/g)?.length).toBe(
      Object.values(people).filter((p) => p.group === 'dev').length
    );
  });

  it('最新消息：id 不重複、日期格式對、照片存在，頁面依新到舊列出', () => {
    const { posts } = JSON.parse(fs.readFileSync('wiki/news.json', 'utf-8'));
    expect(posts.length).toBeGreaterThan(0);
    expect(new Set(posts.map((n) => n.id)).size).toBe(posts.length);
    for (const n of posts) {
      expect(n.id).toMatch(/^[a-z0-9-]+$/);
      expect(n.date, n.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(n.body.length, n.id).toBeGreaterThan(0);
      if (n.image) {
        expect(fs.existsSync(`wiki/news/${n.image}`), n.image).toBe(true);
        expect(n.alt, n.id).toBeTruthy();
      }
    }
    const html = renderPages(loadWikiData())[pageFile('news')];
    const order = [...html.matchAll(/<article class="post" id="post-([^"]+)"/g)].map((m) => m[1]);
    const sorted = posts.toSorted((a, b) => b.date.localeCompare(a.date)).map((n) => n.id);
    expect(order).toEqual(sorted);
  });

  it('AI 夥伴都有頭貼（wiki/img/<id>_av.jpg）', () => {
    for (const c of loadWikiData().chars.filter((c) => c.group === 'ai'))
      expect(c.avatar, c.id).toBeTruthy();
  });

  it('首頁放宣傳片；找不到影片時退回封面圖', () => {
    const data = loadWikiData();
    expect(renderWiki(data)).toContain('media/promo.mp4');
    const noVideo = renderWiki(data, { promo: false });
    expect(noVideo).not.toContain('<video');
    expect(noVideo).toContain('img/cover.jpg');
  });

  it('每一頁的「本頁內容」都對得到頁面上的段落；操作教學有截圖', () => {
    const pages = renderPages(loadWikiData());
    for (const p of PAGES) {
      const html = pages[pageFile(p.slug)];
      expect(html, p.slug).toBeTruthy();
      const toc = [...html.matchAll(/data-spy="([^"]+)"/g)].map((m) => m[1]);
      for (const id of toc) expect(html, `${p.slug}#${id}`).toContain(`id="${id}"`);
    }
    for (const f of ['desktop-title', 'desktop-play', 'mobile-play']) {
      expect(pages[pageFile('controls')]).toContain(`shots/${f}.jpg`);
      expect(fs.existsSync(`wiki/shots/${f}.jpg`), f).toBe(true);
    }
  });

  it('build 產出每一頁，站內連結和錨點都找得到', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-'));
    try {
      buildWiki({ outDir: out });
      for (const f of [
        ...PAGES.map((p) => pageFile(p.slug)),
        'style.css',
        'wiki.js',
        'game-controls.css',
        'img/cover.jpg',
        'img/wiki-icon-192.png',
        'img/wiki-icon-512.png',
        'img/wiki-apple-touch-icon.png',
        'img/wiki-favicon.ico',
        'manifest.webmanifest',
        'media/promo.mp4',
        'shots/desktop-play.jpg',
        'shots/mobile-play.jpg',
        'media/promo-poster.jpg',
        'news/2026-11-it-team-dinner-v2.jpg',
      ])
        expect(fs.existsSync(path.join(out, f)), f).toBe(true);

      const idsOf = (file) =>
        new Set([...fs.readFileSync(file, 'utf-8').matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
      for (const p of PAGES) {
        const file = path.join(out, pageFile(p.slug));
        const html = fs.readFileSync(file, 'utf-8');
        for (const [, url] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
          if (/^(https?:|mailto:|data:)/.test(url)) continue;
          const [pathPart, hash] = url.split('#');
          const clean = pathPart.split('?')[0];
          let target = clean ? path.resolve(path.dirname(file), clean) : file;
          if (!target.startsWith(path.resolve(out))) continue; // ../ 回到遊戲首頁
          if (clean.endsWith('/')) target = path.join(target, 'index.html');
          expect(fs.existsSync(target), `${pageFile(p.slug)} → ${url}`).toBe(true);
          if (hash) expect(idsOf(target).has(hash), `${pageFile(p.slug)} → ${url}`).toBe(true);
        }
      }
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});
