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
  rollDice,
  diceSum,
  countSeat,
  drawWinds,
  seatsFromWinds,
  cutWall,
  stackAt,
} from '../../src/systems/mahjong/Rules.js';
import { MahjongEngine } from '../../src/systems/mahjong/Engine.js';
import {
  makeAI,
  SKILL_MIN,
  SKILL_MAX,
  SKILL_DEFAULT,
  skillTier,
  effectiveSkill,
  adjustSkill,
} from '../../src/systems/mahjong/AI.js';

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

describe('擲骰：抓位、定莊、開門', () => {
  it('3 dice, 3–18', () => {
    for (let i = 0; i < 200; i++) {
      const d = rollDice();
      expect(d.length).toBe(3);
      expect(d.every((v) => v >= 1 && v <= 6)).toBe(true);
      expect(diceSum(d)).toBeGreaterThanOrEqual(3);
      expect(diceSum(d)).toBeLessThanOrEqual(18);
    }
  });
  it('counting from the thrower round to the right: 5 9 13 17 自己、2 6 10 14 18 下家…', () => {
    const rel = (sum) => (countSeat(2, sum) - 2 + 4) % 4; // thrower at seat 2
    for (const n of [5, 9, 13, 17]) expect(rel(n)).toBe(0);
    for (const n of [2, 6, 10, 14, 18]) expect(rel(n)).toBe(1);
    for (const n of [3, 7, 11, 15]) expect(rel(n)).toBe(2);
    for (const n of [4, 8, 12, 16]) expect(rel(n)).toBe(3);
    expect(countSeat(0, 6)).toBe(1); // 彥霖 throws 6: his 下家 (seat 1, on his right)
  });
  it('抓位: everyone draws one wind; you stay put, the rest sit 東南西北 round to the right', () => {
    const w = drawWinds();
    expect([...w].sort()).toEqual([0, 1, 2, 3]);
    // you drew 西 (2): 北 sits on your right, 東 across, 南 on your left
    const seats = seatsFromWinds([2, 0, 3, 1]);
    expect(seats).toEqual([0, 2, 1, 3]);
    expect(seats[1]).toBe(2); // whoever drew 東 is across the table
    for (let i = 0; i < 20; i++) {
      const W = drawWinds();
      const S = seatsFromWinds(W);
      expect(S[0]).toBe(0);
      expect([...S].sort()).toEqual([0, 1, 2, 3]);
      // round to the right, the winds go on 東南西北
      for (let s = 0; s < 4; s++) expect((W[S.indexOf((S[s] + 1) % 4)] - W[s] + 4) % 4).toBe(1);
    }
  });
  it('開門: count that many stacks from the right of that wall, draw from the next one, clockwise', () => {
    const cut = cutWall(0, 5); // 彥霖 deals and throws 5: his own wall
    expect(cut).toEqual({ seat: 0, stacks: 5 });
    expect(stackAt(cut, 0)).toEqual({ seat: 0, si: 12 }); // 5 stacks counted from his right (17…13)
    expect(stackAt(cut, 12)).toEqual({ seat: 0, si: 0 }); // drawing goes to his left
    expect(stackAt(cut, 13)).toEqual({ seat: 3, si: 17 }); // then on to 上家's wall, from its right end
    expect(stackAt(cut, 71)).toEqual({ seat: 0, si: 13 }); // 牌尾: the counted stacks, last one next to the cut
    // seat 1 throws 18: seat 2's wall (its 下家), all 18 counted, so drawing starts at seat 2's 上家 = seat 1
    expect(stackAt(cutWall(1, 18), 0)).toEqual({ seat: 1, si: 17 });
    // every stack exactly once
    const all = new Set();
    for (let st = 0; st < 72; st++) {
      const { seat, si } = stackAt(cutWall(3, 11), st);
      all.add(`${seat}:${si}`);
    }
    expect(all.size).toBe(72);
  });
  it('the engine keeps where the wall was opened (the dealer’s own wall when nobody threw)', () => {
    expect(new MahjongEngine({ dealer: 2 }).cut).toEqual({ seat: 2, stacks: 0 });
    const c = cutWall(2, 9);
    expect(new MahjongEngine({ dealer: 2, cut: c }).cut).toBe(c);
  });
});

describe('骰子動畫（Dice.js）', () => {
  it('lands with the thrown value on top, whatever way it is turned', async () => {
    const { restingQuat, topValue } = await import('../../src/systems/mahjong/Dice.js');
    for (let v = 1; v <= 6; v++)
      for (const yaw of [0, 1, 2.5, 4]) expect(topValue(restingQuat(v, yaw))).toBe(v);
  });
});

describe('槓與花的台灣規矩', () => {
  // a table where only seat 1 has tiles; every other seat passes, seat 1 kongs when it can
  const table = (tail) => {
    const e = new MahjongEngine({
      human: [false, false, false, false],
      ai: (_e, _s, kind, o) =>
        kind === 'claim'
          ? o.find((x) => x.type === 'kong') || { type: 'pass' }
          : { type: 'discard' },
    });
    e.wall = [...new Array(29).fill(K('9m')), K(tail)];
    e.players[1].hand = T('555m123p456p789p11s23s');
    return e;
  };
  it('no kong on 上家’s discard (a pon is fine)', () => {
    const e = table('4s');
    e.last = { t: K('5m'), from: 0 }; // seat 0 is seat 1's 上家
    expect(e.claimOptions(1).map((o) => o.type)).toEqual(['pon']);
    e.last = { t: K('5m'), from: 3 };
    expect(e.claimOptions(1).map((o) => o.type)).toEqual(['pon', 'kong']);
  });
  it('明槓: the replacement tile can’t win (just discard); 暗槓 can (槓上開花)', () => {
    const e = table('4s');
    e.last = { t: K('5m'), from: 3 };
    e.phase = 'claim';
    e.answers = null;
    e.step(); // seat 1 kongs
    expect(e.players[1].melds[0]).toMatchObject({ type: 'kong', t: K('5m') });
    e.step(); // draws 4s from the back: would finish the hand
    expect(e.drawn).toBe(K('4s'));
    expect(e.turnOptions(1)).toMatchObject({ tsumo: false, kongs: [] });
    e.step(); // so it discards
    expect(e.phase).not.toBe('end');

    const c = table('4s');
    c.players[1].hand = T('5555m123p456p789p11s23s');
    c.turn = 1;
    c.justDrew = true;
    c.phase = 'turn';
    c._act(1, { type: 'kong', t: K('5m') }); // 暗槓
    c.step();
    expect(c.turnOptions(1).tsumo).toBe(true);
    expect(c.afterKong).toBe(true);
  });
  it('大明槓 then a flower: still no win on the tile after the flower', () => {
    const e = table('4s');
    e.wall.push(34); // the back of the wall: a flower first, then the 4s
    e.last = { t: K('5m'), from: 3 };
    e.phase = 'claim';
    e.answers = null;
    e.step();
    e.step();
    expect(e.players[1].flowers).toEqual([34]);
    expect(e.drawn).toBe(K('4s'));
    expect(e.turnOptions(1).tsumo).toBe(false);
  });
  it('加槓 (your own 4th tile on a pon): the replacement may win, 槓上開花', () => {
    const e = table('4s');
    e.players[1].hand = T('5m123p456p789p11s23s');
    e.players[1].melds = [{ type: 'pung', t: K('5m'), from: 3 }];
    e.turn = 1;
    e.justDrew = true;
    e.phase = 'turn';
    e._act(1, { type: 'kong', t: K('5m') }); // 加槓: nobody can rob it
    e.step(); // nobody robs
    e.step(); // draws 4s from the back
    expect(e.drawn).toBe(K('4s'));
    expect(e.turnOptions(1).tsumo).toBe(true);
    e._act(1, { type: 'tsumo' });
    expect(e.result.items.map(([n]) => n)).toContain('槓上開花');
  });
  it('七搶一: 7 flowers, somebody else draws the 8th — the 7 win off them, 8 台', () => {
    const e = new MahjongEngine({ human: [false, false, false, false], dealer: 3 });
    e.players[0].flowers = [34, 35, 36, 37, 38, 39, 40];
    e.wall = [41, ...new Array(30).fill(K('9m'))];
    e.turn = 2;
    e.phase = 'draw';
    e.step();
    expect(e.result).toMatchObject({ winner: 0, from: 2, tai: 8, items: [['七搶一', 8]] });
    expect(e.result.deltas[2]).toBe(-(30 + 10 * 8));
  });
  it('八仙過海: all 8 flowers is a win straight away (self-drawn)', () => {
    const e = new MahjongEngine({ human: [false, false, false, false], dealer: 2 });
    e.players[2].flowers = [34, 35, 36, 37, 38, 39, 40];
    e.wall = [41, ...new Array(30).fill(K('9m'))];
    e.turn = 2;
    e.phase = 'draw';
    e.step();
    expect(e.result).toMatchObject({ winner: 2, from: null, self: true, flower: '八仙過海' });
  });
  it('半求人: every set called, then self-drawn', () => {
    const melds = [
      { type: 'pung', t: K('1m') },
      { type: 'chow', t: K('2p') },
      { type: 'chow', t: K('5p') },
      { type: 'pung', t: K('9s') },
      { type: 'chow', t: K('1s') },
    ];
    const s = scoreHand({
      concealed: T('44s'),
      melds,
      flowers: [],
      win: K('4s'),
      self: true,
      seat: 1,
      round: 0,
    });
    expect(s.items.map(([n]) => n)).toContain('半求人');
    const q = scoreHand({
      concealed: T('44s'),
      melds,
      flowers: [],
      win: K('4s'),
      self: false,
      seat: 1,
      round: 0,
    });
    expect(q.items.map(([n]) => n)).toContain('全求人');
  });
});

describe('聽牌提示（engine.tenpai）', () => {
  it('what you wait on, and how many of each are still out there', () => {
    const e = new MahjongEngine({ human: [true, false, false, false] });
    e.players[0].hand = T('123m456m789m123p45s99s');
    e.players[1].discards = T('33s');
    expect(e.tenpai(0)).toEqual([
      { t: K('3s'), left: 2 },
      { t: K('6s'), left: 4 },
    ]);
    // your turn, just drew: still the hand from before the draw
    e.players[0].hand.push(K('1z'));
    e.turn = 0;
    e.justDrew = true;
    e.phase = 'turn';
    e.drawn = K('1z');
    expect(e.tenpai(0).map((w) => w.t)).toEqual([K('3s'), K('6s')]);
    // one tile too many (just called a pon, about to discard): nothing shown
    e.justDrew = false;
    expect(e.tenpai(0)).toEqual([]);
    // not ready yet
    e.players[0].hand = T('123m456m789m123p47s99s');
    expect(e.tenpai(0)).toEqual([]);
  });
});

describe('動態 AI 強度（AI.js）', () => {
  it('連贏上升、連輸下降、流局熱度回落，且不超出上下限', () => {
    let s = SKILL_DEFAULT,
      h = 0;
    for (let i = 1; i <= 12; i++) {
      ({ skill: s, heat: h } = adjustSkill(s, h, {
        winner: 0,
        from: 1,
        tai: 3,
        delta: 100,
        winStreak: i,
      }));
    }
    expect(s).toBe(SKILL_MAX);
    expect(h).toBeGreaterThan(0);
    expect(skillTier(effectiveSkill(s, { stake: 2, heat: h })).id).toBe(3);

    // 連輸後雙向往下降到最低檔
    for (let i = 1; i <= 15; i++) {
      ({ skill: s, heat: h } = adjustSkill(s, h, {
        winner: 2,
        from: 0,
        tai: 3,
        delta: -100,
        loseStreak: i,
      }));
    }
    expect(s).toBe(SKILL_MIN);
    expect(h).toBeLessThan(0);
    expect(skillTier(effectiveSkill(s, { stake: 0, heat: h })).id).toBe(0);

    // 流局不改長期實力、只讓當桌熱度回落
    const before = s;
    const after = adjustSkill(s, h, { draw: true, delta: 0 });
    expect(after.skill).toBe(before);
    expect(Math.abs(after.heat)).toBeLessThan(Math.abs(h));
  });

  it('高強度會讀對手副露染手並避開該花色，也會防搶槓不亂加槓', () => {
    const proAI = makeAI({ attack: 0.5, defense: 0.9, skill: 0.95 });
    const e = new MahjongEngine({ rng: () => 0.1, human: [false, false, false, false] });
    // 對手（seat 0）亮了 2 組萬子且棄牌都是條／筒 → 明顯染萬子
    e.players[0].melds = [
      { type: 'chow', t: K('1m') },
      { type: 'pung', t: K('7m') },
    ];
    e.players[0].discards = T('1p9p3s8s');
    // seat 1 手牌雜亂（>= 2 向聽），同時有 5m（萬子中張）與 5s（條子中張）
    e.players[1].hand = T('5m5s2p6p8p1s4s7s1z2z3z4z5z6z7z9p2m');
    const act = proAI(e, 1, 'turn', { tsumo: false, kongs: [], discard: true });
    // 不該優先丟染手花色萬子（會選對手打過的 1p/9p/3s/8s 或他門）
    expect([K('5m'), K('2m')]).not.toContain(act.t);

    // 防搶槓：對手亮了 3 組副露時，高強度不隨便加槓；低強度會直接加槓
    const e2 = new MahjongEngine({ rng: () => 0.1, human: [false, false, false, false] });
    e2.players[0].melds = [
      { type: 'chow', t: K('1m') },
      { type: 'chow', t: K('4m') },
      { type: 'pung', t: K('7m') },
    ];
    e2.players[1].melds = [{ type: 'pung', t: K('2p') }];
    e2.players[1].hand = T('2p123s456s789s55p88p');
    const opts = { tsumo: false, kongs: [{ t: K('2p'), kind: 'added' }], discard: true };
    const lowAI = makeAI({ attack: 0.5, defense: 0.5, skill: 0.2 });
    expect(lowAI(e2, 1, 'turn', opts).type).toBe('kong');
    expect(proAI(e2, 1, 'turn', opts).type).toBe('discard');
  });

  it('高強度 AI（0.95）與低強度 AI（0.15）對打 50 局，高強度淨勝且牌張守恆', () => {
    const pro = makeAI({ attack: 0.5, defense: 0.65, skill: 0.95 });
    const casual = makeAI({ attack: 0.5, defense: 0.5, skill: 0.15 });
    let proNet = 0,
      proWins = 0,
      casualWins = 0;
    for (let seed = 101; seed <= 150; seed++) {
      const e = new MahjongEngine({
        rng: seeded(seed),
        human: [false, false, false, false],
        dealer: seed % 4,
        // seat 0, 2 用高強度；seat 1, 3 用低強度
        ai: (eng, seat, kind, o) => (seat % 2 === 0 ? pro : casual)(eng, seat, kind, o),
      });
      let guard = 0;
      while (e.step()) if (++guard > 2000) throw new Error('hand never ended');
      proNet += e.result.deltas[0] + e.result.deltas[2];
      if (!e.result.draw) {
        if (e.result.winner % 2 === 0) proWins++;
        else casualWins++;
      }
    }
    expect(proNet).toBeGreaterThan(0);
    expect(proWins).toBeGreaterThanOrEqual(casualWins);
  }, 20000);
});
