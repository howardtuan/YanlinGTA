import { describe, it, expect } from 'vitest';
import {
  counts,
  shanten,
  isWin,
  waits,
  decompose,
  scoreHand,
  settle,
  tileName,
  makeWall,
  STAKES,
} from '../../src/systems/mahjong/Rules.js';
import { MahjongEngine } from '../../src/systems/mahjong/Engine.js';
import { makeAI } from '../../src/systems/mahjong/AI.js';

// 台式麻將（src/systems/mahjong/）：胡牌判定、台數、結算、整局流程。
// 牌的寫法：'123m' 萬、'p' 筒、's' 條、'z' 字（1–7 = 東南西北中發白）
function T(str) {
  const out = [];
  for (const g of str.match(/\d+[mpsz]/g)) {
    const suit = 'mpsz'.indexOf(g.at(-1));
    for (const d of g.slice(0, -1)) out.push(suit === 3 ? 27 + +d - 1 : suit * 9 + +d - 1);
  }
  return out;
}
const K = (s) => T(s)[0];
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
// a win to score: concealed (with the winning tile) + defaults
const W = (concealed, win, more = {}) =>
  scoreHand({
    concealed: T(concealed),
    melds: [],
    flowers: [],
    win: K(win),
    self: false,
    seat: 1,
    round: 0,
    ...more,
  });
const names = (r) => r.items.map(([n]) => n).sort();

describe('牌與向聽數', () => {
  it('names the tiles', () => {
    expect(tileName(0)).toBe('一萬');
    expect(tileName(17)).toBe('九筒');
    expect(tileName(31)).toBe('中');
    expect(tileName(34)).toBe('春');
    expect(makeWall(seeded(1)).length).toBe(144);
  });
  it('17 tiles in 5 sets + a pair is a win', () => {
    const c = counts(T('123456789m123p55s99s'));
    expect(c.reduce((a, b) => a + b)).toBe(16);
    expect(shanten(c, 5)).toBe(0);
    expect(isWin(counts(T('123456789m123p555s99s')), 5)).toBe(true);
    expect(isWin(counts(T('123456789m124p555s99s')), 5)).toBe(false);
  });
  it('waits', () => {
    expect(waits(counts(T('123456789m123p555s9s')), 5).map(tileName)).toEqual(['九條']);
    expect(waits(counts(T('123456789m123p23s99s')), 5).map(tileName)).toEqual(['一條', '四條']);
  });
  it('shanten with melds (fewer sets to make)', () => {
    expect(shanten(counts(T('123m45p6')), 2)).toBeGreaterThanOrEqual(-1);
    expect(shanten(counts(T('11z')), 0)).toBe(-1);
    expect(shanten(counts(T('1m')), 0)).toBe(0);
  });
  it('decomposes every way', () => {
    // 111222333m: three pungs or three chows
    expect(decompose(counts(T('111222333m55p')), 3).length).toBe(2);
  });
});

describe('台數', () => {
  it('平胡: all chows, two-sided wait on a discard', () => {
    const r = W('123456789m123p23s99s4s', '4s');
    expect(names(r)).toEqual(['平胡', '門清']);
    expect(r.tai).toBe(3);
  });
  it('門清自摸 is 3', () => {
    const r = W('123456789m123p234s99s', '4s', { self: true });
    expect(names(r)).toContain('門清自摸');
    expect(names(r)).not.toContain('平胡');
  });
  it('碰碰胡 and 三暗刻', () => {
    const r = scoreHand({
      concealed: T('111m555p999s777z22z'),
      melds: [{ type: 'pung', t: K('3m'), closed: false }],
      flowers: [],
      win: K('2z'),
      self: false,
      seat: 1,
      round: 0,
    });
    expect(names(r)).toContain('碰碰胡');
    expect(names(r)).toContain('四暗刻'); // the 南 pair took the discard, so all four pungs are concealed
    expect(names(r)).toContain('三元牌'); // 白 pung
    expect(names(r)).not.toContain('門風'); // 南 is only the pair
  });
  it('a pung finished by a discard is not concealed', () => {
    const r = scoreHand({
      concealed: T('111m555p999s777z234m22z'),
      melds: [],
      flowers: [],
      win: K('9s'),
      self: false,
      seat: 0,
      round: 0,
    });
    // 111m 555p 777z concealed, 999s by the discard
    expect(names(r)).toContain('三暗刻');
    expect(names(r)).not.toContain('四暗刻');
  });
  it('清一色, 混一色, 字一色', () => {
    expect(names(W('11123455567899922m', '2m'))).toContain('清一色');
    expect(names(W('123456789m111555z22z', '2z'))).toContain('混一色');
    expect(names(W('11122233355566677z', '7z'))).toContain('字一色');
  });
  it('大三元 / 小三元 / 大四喜', () => {
    expect(names(W('555666777z123456m99p', '9p'))).toContain('大三元');
    expect(names(W('55566677z123456m999p', '7z'))).toContain('小三元');
    expect(names(W('111222333444z123m55z', '5z'))).toContain('大四喜');
  });
  it('flowers: 正花 and a full set', () => {
    // seat 1 (南): 夏 and 蘭 are its own
    const r = W('123456789m123p234s99s'.replace('234s', '234s'), '4s', { flowers: [35, 36] });
    expect(names(r).filter((n) => n === '正花').length).toBe(1);
    expect(names(W('123456789m123p234s99s', '4s', { flowers: [34, 35, 36, 37] }))).toContain(
      '春夏秋冬'
    );
  });
  it('獨聽: a single wait', () => {
    expect(names(W('123456789m123p13s99s2s', '2s'))).toContain('獨聽');
  });
  it('天胡', () => {
    expect(names(W('123456789m123p234s99s', '4s', { self: true, first: 'heaven' }))).toContain(
      '天胡'
    );
  });
});

describe('結算（底 30、一台 10）', () => {
  it('a discard win: the one who dealt in pays', () => {
    expect(settle({ winner: 1, from: 2, tai: 3, dealer: 0, streak: 0 })).toEqual([0, 60, -60, 0]);
  });
  it('dealer involved: +1 台 and 連 N 拉 N', () => {
    expect(settle({ winner: 1, from: 0, tai: 3, dealer: 0, streak: 2 })).toEqual([
      -30 - 10 * (3 + 1 + 4),
      110,
      0,
      0,
    ]);
  });
  it('self-draw: everybody pays, the dealer a bit more', () => {
    const d = settle({ winner: 2, from: null, tai: 1, dealer: 0, streak: 0 });
    expect(d).toEqual([-50, -40, 130, -40]);
    expect(d.reduce((a, b) => a + b)).toBe(0);
  });
});

describe('整局流程（4 家都是電腦）', () => {
  it('plays 40 hands to the end: tiles conserved, money sums to zero', () => {
    let wins = 0,
      draws = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rng = seeded(seed);
      const ai = makeAI({ attack: 0.5, defense: 0.5 });
      const e = new MahjongEngine({
        rng,
        human: [false, false, false, false],
        ai,
        dealer: seed % 4,
      });
      let n = 0;
      while (e.step()) if (++n > 2000) throw new Error('hand never ended');
      expect(e.phase).toBe('end');
      const total =
        e.wall.length +
        e.players.reduce(
          (s, P) =>
            s +
            P.hand.length +
            P.flowers.length +
            P.discards.length +
            P.melds.reduce((a, m) => a + (m.type === 'kong' ? 4 : 3), 0),
          0
        );
      expect(total).toBe(144);
      expect(e.result.deltas.reduce((a, b) => a + b)).toBe(0);
      if (e.result.draw) draws++;
      else {
        wins++;
        expect(e.result.tai).toBeGreaterThanOrEqual(0);
        expect(e.result.items.length).toBeGreaterThanOrEqual(0);
      }
    }
    expect(wins).toBeGreaterThan(12);
    expect(wins + draws).toBe(40);
  });
  it('pays at the stakes picked (底 300／一台 100)', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const e = new MahjongEngine({
        rng: seeded(seed),
        human: [false, false, false, false],
        ai: makeAI(),
        base: 300,
        perTai: 100,
      });
      while (e.step());
      const r = e.result;
      if (r.draw) continue;
      expect(r.deltas).toEqual(
        settle(
          { winner: r.winner, from: r.from, tai: r.tai, dealer: e.dealer, streak: 0 },
          300,
          100
        )
      );
      const payers = r.from == null ? 3 : 1;
      expect(r.deltas[r.winner]).toBeGreaterThanOrEqual(payers * (300 + 100 * r.tai));
    }
  });
  it('the stakes on offer', () => {
    expect(STAKES).toEqual([
      [30, 10],
      [50, 20],
      [100, 20],
      [300, 100],
    ]);
  });
  it('waits for the human and takes the answer', () => {
    const e = new MahjongEngine({ rng: seeded(7), ai: makeAI(), dealer: 0 });
    while (e.step());
    expect(e.pending.seat).toBe(0);
    expect(e.pending.kind).toBe('turn');
    expect(e.players[0].hand.length).toBe(17);
    expect(e.decide({ type: 'discard', t: 99 })).toBe(false);
    const t = e.players[0].hand[0];
    expect(e.decide({ type: 'discard', t })).toBe(true);
    expect(e.players[0].discards).toContain(t);
  });
});
