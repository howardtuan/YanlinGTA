// 一鍵通關 (src/systems/AutoSolve.js): every SQL case's script really cracks its case when it is fed, line by line,
// to the detective console (src/systems/minigames/Detective.js) on a real SQL engine (sql.js, the same one the game
// loads from the CDN); the Two Sum script types a valid O(N) solution; the replay mode leaves the save alone.
import { describe, it, expect, vi } from 'vitest';
import initSqlJs from 'sql.js';

vi.mock('../../src/systems/minigames/Learn.js', () => ({
  sqlEngine: () => initSqlJs(),
  runPython: async () => ({ out: '' }),
}));

const { Detective, CASES } = await import('../../src/systems/minigames/Detective.js');
const { SCRIPTS, TWO_SUM_SOLUTION, AutoSolve } = await import('../../src/systems/AutoSolve.js');
const { TWO_SUM_STARTER } = await import('../../src/systems/quests/HowardTwoSum.js');

function fakeGame() {
  const g = {
    _saveT: 0,
    money: 0,
    missions: { done: true },
    jianyu: { state: { met: true } },
    audio: {},
    earn(n) {
      g.money += n;
    },
  };
  return g;
}
const io = () => {
  const out = [];
  return { out, print: (t) => out.push(t), html: (h) => out.push(h), prompt() {}, clear() {} };
};
async function play(D, id, opts) {
  const o = io();
  expect(await D.enter(o, id, opts)).toBe(true);
  for (const s of SCRIPTS[id].steps) {
    const before = o.out.length;
    await D.run(s.input, o);
    const said = o.out.slice(before).join('\n');
    expect(said, `${id}: ${s.input}`).not.toMatch(/❌/);
  }
  return o;
}

describe('一鍵通關 scripts', () => {
  it('has a script for every detective case, ending with accusing the culprit', () => {
    for (const [id, c] of Object.entries(CASES)) {
      const S = SCRIPTS[id];
      expect(S, id).toBeTruthy();
      expect(S.kind).toBe('sql');
      expect(S.steps.at(-1).input).toBe(`accuse ${c.culprit}`);
      for (const s of S.steps) expect(s.say.length).toBeGreaterThan(0);
    }
  });

  for (const id of Object.keys(CASES))
    it(`cracks ${id} by running its script in the real console`, async () => {
      const g = fakeGame(),
        D = new Detective(g);
      await play(D, id);
      expect(D.solved(id)).toBe(true);
      for (const need of CASES[id].need) expect(D.st(id).clues).toContain(need);
      expect(g.money).toBe(CASES[id].reward || 0);
    });

  it('replays a solved case without touching the save or paying again', async () => {
    const g = fakeGame(),
      D = new Detective(g);
    await play(D, 'fries');
    const saved = JSON.stringify(D.toJSON()),
      money = g.money;
    await play(D, 'fries', { practice: true });
    expect(D.practice.st.solved).toBe(true);
    expect(g.money).toBe(money);
    D.leave();
    expect(D.practice).toBe(null);
    expect(JSON.stringify(D.toJSON())).toBe(saved);
  });

  it('types the O(N) Two Sum answer on top of the starter code', () => {
    expect(TWO_SUM_SOLUTION.startsWith(TWO_SUM_STARTER.trimEnd())).toBe(true);
    expect(TWO_SUM_SOLUTION).toMatch(/seen = \{\}/);
    expect(TWO_SUM_SOLUTION).not.toMatch(/sort|\.index\(|in nums/);
    // only one loop: no nested for/while
    expect(TWO_SUM_SOLUTION.match(/\b(for|while)\b/g)).toHaveLength(1);
    expect(SCRIPTS.twosum.steps.at(-1).act).toBe('submit');
  });

  it('asks about one-click clearing once per task, and the answer survives a save', () => {
    const g = fakeGame(),
      A = new AutoSolve(g);
    expect(A.ask('banner')).toBe(true);
    expect(A.ask('banner')).toBe(false);
    expect(A.ask('nope')).toBe(false);
    A.used('banner');
    const B = new AutoSolve(g);
    B.load(JSON.parse(JSON.stringify(A.toJSON())));
    expect(B.ask('banner')).toBe(false);
    expect(B.state.auto).toEqual(['banner']);
    B.load(null);
    expect(B.state).toEqual({ asked: [], auto: [] });
  });
});
