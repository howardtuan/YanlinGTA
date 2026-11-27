import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs from 'sql.js';
import { PY, SQ, AG, SEED, SCHEMA } from '../../src/systems/minigames/LearnCourses.js';

describe('LearnCourses (src/systems/minigames/LearnCourses.js)', () => {
  let SQL;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  it('has unique IDs and complete chapter metadata across PY, SQ, and AG', () => {
    const all = [...PY, ...SQ, ...AG];
    const ids = all.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PY.length).toBeGreaterThan(0);
    expect(SQ.length).toBeGreaterThan(0);
    expect(AG.length).toBeGreaterThan(0);

    for (const c of all) {
      expect(typeof c.id).toBe('string');
      expect(c.t.length).toBeGreaterThan(0);
      expect(c.intro.length).toBeGreaterThan(0);
      expect(Array.isArray(c.ex) && c.ex.length).toBeGreaterThan(0);
      expect(Array.isArray(c.pit) && c.pit.length).toBeGreaterThan(0);
      expect(Array.isArray(c.sum) && c.sum.length).toBeGreaterThan(0);
      expect(c.task.length).toBeGreaterThan(0);
      expect(c.ans.length).toBeGreaterThan(0);
    }
  });

  it('seeds the practice database and matches every table documented in SCHEMA', () => {
    const db = new SQL.Database();
    db.run(SEED);
    const tables = db
      .exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .flatMap((r) => r.values.map((v) => v[0]));
    for (const [name] of SCHEMA) {
      expect(tables).toContain(name);
    }
    db.close();
  });

  it('executes every SQ chapter reference answer cleanly on a fresh SEED database', () => {
    for (const ch of SQ) {
      const db = new SQL.Database();
      db.run(SEED);
      const res = ch.check ? (db.run(ch.ans), db.exec(ch.check)) : db.exec(ch.ans);
      expect(res.length, `SQ chapter ${ch.id} returned no result set`).toBeGreaterThan(0);
      expect(res[0].values.length, `SQ chapter ${ch.id} returned 0 rows`).toBeGreaterThan(0);
      db.close();
    }
  });
});
