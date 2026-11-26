import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildWiki, loadWikiData, renderWiki } from '../../wiki/build.mjs';

const npcs = JSON.parse(fs.readFileSync('data/npcs.json', 'utf-8')).npcs;
const people = JSON.parse(fs.readFileSync('wiki/people.json', 'utf-8')).people;
const quests = JSON.parse(fs.readFileSync('wiki/quests.json', 'utf-8')).quests;

describe('wiki', () => {
  it('每個 NPC 都有 Wiki 分類，Wiki 也沒有多出不存在的角色', () => {
    const ids = npcs.map((n) => n.id).sort();
    expect(Object.keys(people).sort()).toEqual(ids);
  });

  it('任務裡列的角色都存在、任務 id 不重複', () => {
    const ids = new Set(npcs.map((n) => n.id));
    for (const q of quests)
      for (const id of q.npcs) expect(ids.has(id), `${q.id}: ${id}`).toBe(true);
    expect(new Set(quests.map((q) => q.id)).size).toBe(quests.length);
  });

  it('社群連結只接受 https 網址', () => {
    for (const [id, p] of Object.entries(people)) {
      for (const k of ['ig', 'linkedin']) {
        if (p[k]) expect(p[k], `${id}.${k}`).toMatch(/^https:\/\//);
      }
    }
  });

  it('頁面列出所有角色與任務，開發者有標示', () => {
    const html = renderWiki(loadWikiData());
    for (const n of npcs) expect(html).toContain(`id="npc-${n.id}"`);
    for (const q of quests) expect(html).toContain(`id="q-${q.id}"`);
    expect(html.match(/🛠 本遊戲開發者/g)?.length).toBe(
      Object.values(people).filter((p) => p.group === 'dev').length
    );
  });

  it('build 產出完整的靜態網站', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-'));
    try {
      buildWiki({ outDir: out });
      for (const f of ['index.html', 'style.css', 'wiki.js', 'img/cover.jpg', 'img/icon-192.png'])
        expect(fs.existsSync(path.join(out, f)), f).toBe(true);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});
