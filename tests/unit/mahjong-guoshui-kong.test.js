import { describe, it, expect } from 'vitest';
import { MahjongEngine } from '../../src/systems/mahjong/Engine.js';
import { makeAI } from '../../src/systems/mahjong/AI.js';
import { KINDS, FLOWER0, meldTiles } from '../../src/systems/mahjong/Rules.js';
import { serializeStateFor, rotateEventsFor } from '../../src/systems/mahjong/Net.js';
import { timeoutAction } from '../../src/systems/mahjong/TurnTimer.js';
import { meldFaces } from '../../src/systems/mahjong/MahjongScene.js';

// 277 麻將的兩條規矩：過水（Engine.js claimOptions／_claim）、別家暗槓蓋牌（Net.js、MahjongScene.js meldFaces）
// 牌的寫法：'123m' 萬、'p' 筒、's' 條、'z' 字
function T(str) {
  const out = [];
  for (const g of str.match(/\d+[mpsz]/g)) {
    const suit = 'mpsz'.indexOf(g.at(-1));
    for (const d of g.slice(0, -1)) out.push(suit === 3 ? 27 + +d - 1 : suit * 9 + +d - 1);
  }
  return out;
}
const K = (s) => T(s)[0];
const pass = () => ({ type: 'pass' });
const types = (o) => o.map((x) => x.type);
const JUNK = '1z1z2z2z3z3z4z4z5z5z6z6z7z7z1m2m'; // 什麼都不能吃碰胡的一手

// 座位 0 是真人、聽 3s／6s；其他三家是只會「過」、只會打摸到那張的電腦
function table() {
  const e = new MahjongEngine({
    human: [true, false, false, false],
    ai: (_e, _s, kind) => (kind === 'claim' ? pass() : { type: 'discard' }),
  });
  e.wall = new Array(60).fill(K('9m'));
  e.players[0].hand = T('123m456m789m123p45s99s');
  for (const s of [1, 2, 3]) e.players[s].hand = T(JUNK);
  e.phase = 'draw';
  return e;
}
// seat `from` discards t, then the claim round starts
function discard(e, from, t) {
  e.players[from].discards.push(t);
  e.last = { t, from };
  e.phase = 'claim';
  e.answers = null;
  e.claimOpts = null;
  e.step();
}

describe('過水（Engine.js）', () => {
  it('能胡沒胡就過水：之後別人打的能胡的牌只給「過」，胡的回答不收', () => {
    const e = table();
    discard(e, 2, K('3s'));
    expect(types(e.pendingFor(0).options)).toEqual(['hu']);
    expect(e.decideFor(0, pass())).toBe(true);
    e.step();
    expect(e.guoshui[0]).toBe(true);
    expect(e.phase).not.toBe('end');

    // 還沒輪到自己摸牌，下家又打出 6s
    discard(e, 1, K('6s'));
    expect(types(e.pendingFor(0).options)).toEqual(['guoshui']);
    expect(e.decideFor(0, { type: 'hu', t: K('6s') })).toBe(false);
    expect(e.decideFor(0, { type: 'guoshui', t: K('6s') })).toBe(false);
    expect(e.decideFor(0, pass())).toBe(true);
    e.step();
    expect(e.phase).not.toBe('end');
    expect(e.guoshui[0]).toBe(true);
  });

  it('限時 20 秒到被當成「過」也算過水', () => {
    const e = table();
    discard(e, 2, K('6s'));
    expect(e.decideFor(0, timeoutAction(e, 0, 'claim'))).toBe(true);
    e.step();
    expect(e.guoshui[0]).toBe(true);
  });

  it('搶槓能胡沒胡也算過水', () => {
    const e = table();
    e.players[2].melds = [{ type: 'kong', t: K('3s'), from: 1, added: true }];
    e.last = { t: K('3s'), from: 2, rob: true };
    e.phase = 'robkong';
    e.answers = null;
    e.step();
    expect(types(e.pendingFor(0).options)).toEqual(['hu']);
    e.decideFor(0, pass());
    e.step();
    expect(e.guoshui[0]).toBe(true);
  });

  it('過水中自摸照常可以胡', () => {
    const e = table();
    e.guoshui[0] = true;
    e.wall[0] = K('3s');
    e.turn = 0;
    e.step(); // seat 0 draws 3s
    e.step(); // and it's seat 0's call
    expect(e.pendingFor(0)?.options.tsumo).toBe(true);
    expect(e.decideFor(0, { type: 'tsumo' })).toBe(true);
    expect(e.result.winner).toBe(0);
  });

  it('自己摸牌打出一張後解除；吃碰後打的那張不算', () => {
    const e = table();
    e.guoshui[0] = true;
    e.turn = 0;
    e.step(); // draws 9m
    e.step();
    e.decideFor(0, { type: 'discard', t: K('9m') });
    expect(e.guoshui[0]).toBe(false);
    discard(e, 1, K('3s'));
    expect(types(e.pendingFor(0).options)).toEqual(['hu']);

    const p = table();
    p.guoshui[0] = true;
    discard(p, 3, K('9s')); // 碰 9s（不是摸牌）
    expect(p.decideFor(0, { type: 'pon', t: K('9s') })).toBe(true);
    p.step(); // 碰
    p.step(); // 輪到座位 0 打牌
    expect(p.pendingFor(0).kind).toBe('turn');
    p.decideFor(0, { type: 'discard', t: K('1m') });
    expect(p.guoshui[0]).toBe(true);
  });

  it('過水中還是可以碰（只是不能胡）', () => {
    const e = table();
    e.players[0].hand = T('123m456m789m123p33s99s');
    e.guoshui[0] = true;
    discard(e, 2, K('3s'));
    expect(types(e.pendingFor(0).options)).toEqual(['guoshui', 'pon']);
  });

  it('電腦也守過水：引擎不給胡，AI 只能過', () => {
    const ai = (guoshui) => {
      const e = new MahjongEngine({ human: [false, false, false, false], ai: makeAI() });
      e.wall = new Array(60).fill(K('9m'));
      for (let s = 0; s < 4; s++) e.players[s].hand = T(JUNK);
      e.players[2].hand = T('123m456m789m123p45s99s');
      e.guoshui[2] = guoshui;
      discard(e, 1, K('3s'));
      return e;
    };
    expect(ai(false).result?.winner).toBe(2); // 平常 AI 一定胡
    const g = ai(true);
    expect(g.result).toBeNull();
    expect(g.phase).toBe('draw');
  });
});

describe('別家的暗槓蓋牌', () => {
  // 座位 1 暗槓 3s；座位 0 聽 3s／6s
  function kongTable() {
    const e = table();
    e.players[1].hand = T('1z1z2z2z3z3z4z4z5z5z6z6z');
    e.players[1].melds = [{ type: 'kong', t: K('3s'), closed: true }];
    e.wall = e.wall.slice(0, 40);
    return e;
  }
  const count144 = (snap) => {
    const c = new Array(FLOWER0 + 8).fill(0);
    for (const P of snap.players) {
      for (const k of P.hand) c[k]++;
      for (const m of P.melds) for (const k of meldTiles(m)) c[k]++;
      for (const k of P.flowers) c[k]++;
      for (const k of P.discards) c[k]++;
    }
    for (const k of snap.wall) c[k]++;
    return c;
  };

  it('聽牌提示不把別家暗槓算成看得到的牌', () => {
    const e = kongTable();
    expect(e.tenpai(0)).toEqual([
      { t: K('3s'), left: 4 },
      { t: K('6s'), left: 4 },
    ]);
    // 自己的暗槓當然算
    expect(e.visible(1)[K('3s')]).toBe(4);
  });

  it('房主快照：別家暗槓遮掉牌種、自己的照給，牌數守恆', () => {
    const e = kongTable();
    const other = serializeStateFor(e, 0);
    const m = other.players[1].melds[0];
    expect(m).toMatchObject({ type: 'kong', closed: true, hidden: true, t: -1 });
    expect(m.tiles).toHaveLength(4);
    expect(other.tenpai).toEqual([
      { t: K('3s'), left: 4 },
      { t: K('6s'), left: 4 },
    ]);

    const mine = serializeStateFor(e, 1);
    expect(mine.players[0].melds[0]).toMatchObject({ type: 'kong', t: K('3s'), closed: true });
    expect(mine.players[0].melds[0].hidden).toBeUndefined();

    // 觀戰：看牌關著也遮，看牌開著（全攤）才看得到
    expect(serializeStateFor(e, 0, { spectate: true }).players[1].melds[0].hidden).toBe(true);
    const all = serializeStateFor(e, 0, { spectate: true, revealAll: true });
    expect(all.players[1].melds[0]).toMatchObject({ t: K('3s'), closed: true });
  });

  it('真牌局：有人暗槓後，別家的快照 144 張守恆、看不出槓了什麼', () => {
    const e = new MahjongEngine({ rng: () => 0.3, human: [false, false, false, false] });
    e.start();
    // 把座位 2 的 4 張 5p 收成暗槓（從別人手上和牌牆換過來，總數不變）
    const t = K('5p');
    const P = e.players[2];
    for (const Q of [...e.players.map((x) => x.hand), e.wall])
      for (let i = Q.length - 1; i >= 0; i--)
        if (Q[i] === t && Q !== P.hand) {
          const j = P.hand.findIndex((x) => x !== t);
          [Q[i], P.hand[j]] = [P.hand[j], Q[i]];
        }
    P.hand = P.hand.filter((x) => x !== t);
    P.melds.push({ type: 'kong', t, closed: true });
    e.wall.push(P.hand.pop()); // (手牌少一張補回牌牆，牌數不變)
    for (const seat of [0, 1, 3]) {
      const snap = serializeStateFor(e, seat);
      const m = snap.players[(2 - seat + 4) % 4].melds[0];
      expect(m.hidden).toBe(true);
      expect(JSON.stringify(m)).not.toContain(`"t":${t}`);
      const c = count144(snap);
      for (let k = 0; k < KINDS; k++) expect(c[k]).toBe(4);
      for (let k = FLOWER0; k < FLOWER0 + 8; k++) expect(c[k]).toBe(1);
    }
  });

  it('牌局結束（胡牌或流局）攤牌時暗槓翻開', () => {
    const e = kongTable();
    e._exhaust();
    const snap = serializeStateFor(e, 0);
    expect(snap.players[1].melds[0]).toMatchObject({ t: K('3s'), closed: true });
    expect(snap.players[1].melds[0].hidden).toBeUndefined();
  });

  it('別家暗槓的事件不說槓了什麼', () => {
    const ev = [{ type: 'kong', seat: 1, t: K('3s'), closed: true }];
    expect(rotateEventsFor(ev, 0)[0].t).toBe(-1);
    expect(rotateEventsFor(ev, 1)[0].t).toBe(K('3s'));
    expect(rotateEventsFor(ev, 0, { spectate: true })[0].t).toBe(-1);
    expect(rotateEventsFor(ev, 0, { spectate: true, revealAll: true })[0].t).toBe(K('3s'));
    // 明槓照講
    const open = [{ type: 'kong', seat: 1, t: K('3s') }];
    expect(rotateEventsFor(open, 0)[0].t).toBe(K('3s'));
  });

  it('桌上怎麼擺：自己的暗槓兩頭蓋，別家的四張全蓋，攤牌時翻開', () => {
    const e = kongTable();
    const k = e.players[1].melds[0];
    const all = [true, true, true, true];
    expect(meldFaces(e, 0, k).down).toEqual([true, false, false, true]);
    expect(meldFaces(e, 1, k).down).toEqual(all);
    expect(meldFaces({ phase: 'end' }, 1, k).down).toEqual([true, false, false, true]);
    expect(meldFaces({ phase: 'turn', spectate: true }, 0, k).down).toEqual(all);
    const hidden = { type: 'kong', t: -1, closed: true, hidden: true, tiles: [1, 2, 3, 4] };
    expect(meldFaces({ phase: 'turn' }, 2, hidden)).toMatchObject({
      tiles: [1, 2, 3, 4],
      down: all,
    });
    // 碰照樣翻開
    expect(meldFaces(e, 1, { type: 'pung', t: 5 }).down).toEqual([false, false, false]);
  });
});
