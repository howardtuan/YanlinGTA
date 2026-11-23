// 台式麻將一局的流程（純邏輯）：洗牌、配牌、補花、摸牌、打牌、吃碰槓、胡（放槍／自摸／搶槓）、流局（牌牆剩 16 張）。
// 4 家座位 0–3，0 是彥霖；dealer 是莊家，門風 = (座位 − 莊家)；step() 一次推進一步，事件放在 events 給畫面播動畫
// （src/systems/mahjong/MahjongScene.js）；輪到真人決定時 step() 回 false、pending 是可以選的動作，用 decide() 回答。
// 電腦的決定由 ai(engine, seat, kind, options) 給（src/systems/mahjong/AI.js）。
import {
  makeWall,
  isFlower,
  counts,
  isWin,
  waits,
  scoreHand,
  settle,
  sortTiles,
  meldTiles,
} from './Rules.js';

export const RESERVE = 16; // 留 16 張不摸（海底）

export class MahjongEngine {
  // opt: { rng, dealer, streak, round, human: [true,false,false,false], ai(engine, seat, kind, options), wall }
  constructor(opt = {}) {
    this.rng = opt.rng || Math.random;
    this.dealer = opt.dealer ?? 0;
    this.streak = opt.streak ?? 0;
    this.round = opt.round ?? 0;
    this.human = opt.human || [true, false, false, false];
    this.ai = opt.ai;
    this.wall = opt.wall ? [...opt.wall] : makeWall(this.rng);
    this.players = [0, 1, 2, 3].map(() => ({
      hand: [],
      melds: [],
      flowers: [],
      discards: [],
      draws: 0,
    }));
    this.events = [];
    this.pending = null;
    this.phase = 'deal';
    this.turn = this.dealer;
    this.result = null;
    this.calls = 0; // 有沒有人吃碰槓過（天胡／地胡／人胡要沒有）
    this.discardsMade = 0;
  }
  seatWind(s) {
    return (s - this.dealer + 4) % 4;
  }
  sets(s) {
    return 5 - this.players[s].melds.length;
  }
  emit(e) {
    this.events.push(e);
  }
  get live() {
    return this.wall.length - RESERVE;
  }

  // one tile into a hand; flowers are laid out and replaced from the back of the wall
  _take(s, tail) {
    const P = this.players[s];
    let t = tail ? this.wall.pop() : this.wall.shift();
    while (isFlower(t)) {
      P.flowers.push(t);
      this.emit({ type: 'flower', seat: s, t });
      t = this.wall.pop();
    }
    P.hand.push(t);
    return t;
  }

  start() {
    for (let i = 0; i < 4; i++)
      for (let k = 0; k < 4; k++) {
        const s = (this.dealer + k) % 4;
        for (let j = 0; j < 4; j++) this.players[s].hand.push(this.wall.shift());
      }
    for (let k = 0; k < 4; k++) {
      const s = (this.dealer + k) % 4,
        P = this.players[s];
      let f;
      while ((f = P.hand.findIndex(isFlower)) >= 0) {
        const t = P.hand.splice(f, 1)[0];
        P.flowers.push(t);
        this.emit({ type: 'flower', seat: s, t });
        P.hand.push(this.wall.pop());
      }
      P.hand = sortTiles(P.hand);
    }
    this.emit({ type: 'deal' });
    this.phase = 'draw';
    this.turn = this.dealer;
    this.tail = false;
  }

  // advance one step; false = waiting for the human (pending) or the hand is over
  step() {
    if (this.phase === 'end' || this.pending) return false;
    if (this.phase === 'deal') return (this.start(), true);
    if (this.phase === 'draw') return (this._draw(), true);
    if (this.phase === 'turn') return this._turn();
    if (this.phase === 'claim' || this.phase === 'robkong') return this._claim();
    return false;
  }

  _draw() {
    if (this.live <= 0) return this._exhaust();
    const s = this.turn,
      P = this.players[s];
    const t = this._take(s, this.tail);
    P.draws++;
    this.drawn = t;
    this.afterKong = this.tail;
    this.tail = false;
    this.justDrew = true;
    this.emit({ type: 'draw', seat: s, t });
    this.phase = 'turn';
  }

  turnOptions(s) {
    const P = this.players[s];
    const c = counts(P.hand);
    const o = { tsumo: false, kongs: [], discard: true };
    if (this.justDrew) {
      o.tsumo = isWin(c, this.sets(s));
      if (this.live > 0) {
        for (let k = 0; k < 34; k++) if (c[k] === 4) o.kongs.push({ t: k, kind: 'closed' });
        for (const m of P.melds)
          if (m.type === 'pung' && c[m.t]) o.kongs.push({ t: m.t, kind: 'added' });
      }
    }
    return o;
  }

  _turn() {
    const s = this.turn;
    const o = this.turnOptions(s);
    if (this.human[s]) {
      this.pending = { seat: s, kind: 'turn', options: o };
      return false;
    }
    this._act(s, this.ai(this, s, 'turn', o));
    return true;
  }

  // the human's answer to pending
  decide(a) {
    const p = this.pending;
    if (!p) return false;
    if (p.kind === 'turn') {
      if (a.type === 'tsumo' && !p.options.tsumo) return false;
      if (a.type === 'kong' && !p.options.kongs.some((k) => k.t === a.t)) return false;
      if (a.type === 'discard' && !this.players[p.seat].hand.includes(a.t)) return false;
      this.pending = null;
      this._act(p.seat, a);
    } else {
      if (
        a.type !== 'pass' &&
        !p.options.some((o) => o.type === a.type && (a.t == null || o.t === a.t))
      )
        return false;
      this.pending = null;
      this.answers[p.seat] =
        a.type === 'pass'
          ? { type: 'pass' }
          : p.options.find((o) => o.type === a.type && (a.t == null || o.t === a.t));
    }
    return true;
  }

  _act(s, a) {
    const P = this.players[s];
    if (!a || a.type === 'discard') {
      let t = a?.t;
      if (t == null || !P.hand.includes(t)) t = P.hand[P.hand.length - 1];
      P.hand.splice(P.hand.indexOf(t), 1);
      P.hand = sortTiles(P.hand);
      P.discards.push(t);
      this.discardsMade++;
      this.justDrew = false;
      this.last = { t, from: s };
      this.emit({ type: 'discard', seat: s, t });
      this.phase = 'claim';
      this.answers = null;
      return;
    }
    if (a.type === 'tsumo') return this._win(s, null, this.drawn);
    if (a.type === 'kong') {
      const c = counts(P.hand);
      if (c[a.t] === 4) {
        P.hand = P.hand.filter((x) => x !== a.t);
        P.melds.push({ type: 'kong', t: a.t, closed: true });
        this.emit({ type: 'kong', seat: s, t: a.t, closed: true });
        this.tail = true;
        this.phase = 'draw';
        return;
      }
      const m = P.melds.find((x) => x.type === 'pung' && x.t === a.t);
      P.hand.splice(P.hand.indexOf(a.t), 1);
      m.type = 'kong';
      m.added = true;
      this.emit({ type: 'kong', seat: s, t: a.t, added: true });
      // 搶槓：別人可以胡這張
      this.last = { t: a.t, from: s, rob: true };
      this.phase = 'robkong';
      this.answers = null;
    }
  }

  // what each of the other seats may do with the last discard (or a tile added to a kong)
  claimOptions(s) {
    const { t, from, rob } = this.last;
    if (s === from) return [];
    const P = this.players[s];
    const c = counts(P.hand);
    const o = [];
    c[t]++;
    if (isWin(c, this.sets(s))) o.push({ type: 'hu', t });
    c[t]--;
    if (rob) return o;
    if (this.live > 0) {
      if (c[t] >= 2) o.push({ type: 'pon', t });
      if (c[t] >= 3) o.push({ type: 'kong', t });
      if ((from + 1) % 4 === s && t < 27) {
        const n = t % 9;
        for (const a of [t - 2, t - 1, t])
          if (a >= t - n && a + 2 <= t - n + 8 && [a, a + 1, a + 2].every((x) => x === t || c[x]))
            o.push({ type: 'chi', t: a });
      }
    }
    return o;
  }

  _claim() {
    if (!this.answers) {
      this.answers = {};
      this.claimOpts = {};
      for (let s = 0; s < 4; s++) {
        const o = this.claimOptions(s);
        if (o.length) this.claimOpts[s] = o;
        else this.answers[s] = { type: 'pass' };
      }
      for (const s in this.claimOpts)
        if (!this.human[s])
          this.answers[s] = this.ai(this, +s, 'claim', this.claimOpts[s]) || { type: 'pass' };
    }
    for (const s in this.claimOpts)
      if (!this.answers[s]) {
        this.pending = { seat: +s, kind: 'claim', options: this.claimOpts[s] };
        return false;
      }
    const { t, from, rob } = this.last;
    const order = [1, 2, 3].map((i) => (from + i) % 4);
    const pick = (type) => order.find((s) => this.answers[s]?.type === type);
    const hu = pick('hu');
    if (hu != null) return (this._win(hu, from, t, rob), true);
    if (rob) {
      // nobody robbed the kong: the one who added it draws from the back
      this.turn = from;
      this.tail = true;
      this.phase = 'draw';
      return true;
    }
    const big = order.find((s) => ['pon', 'kong'].includes(this.answers[s]?.type));
    const ch = pick('chi');
    const who = big ?? ch;
    if (who == null) {
      this.turn = (from + 1) % 4;
      this.phase = 'draw';
      return true;
    }
    const a = this.answers[who],
      P = this.players[who];
    this.players[from].discards.pop();
    this.calls++;
    let meld;
    if (a.type === 'chi') {
      for (const x of [a.t, a.t + 1, a.t + 2]) if (x !== t) P.hand.splice(P.hand.indexOf(x), 1);
      meld = { type: 'chow', t: a.t, take: t };
    } else {
      const n = a.type === 'kong' ? 3 : 2;
      for (let i = 0; i < n; i++) P.hand.splice(P.hand.indexOf(t), 1);
      meld = { type: a.type === 'kong' ? 'kong' : 'pung', t };
    }
    meld.from = from;
    P.melds.push(meld);
    this.emit({ type: a.type, seat: who, t, from, meld });
    this.turn = who;
    if (a.type === 'kong') {
      this.tail = true;
      this.phase = 'draw';
    } else {
      this.justDrew = false;
      this.phase = 'turn';
    }
    return true;
  }

  _win(s, from, t, rob = false) {
    const P = this.players[s];
    const self = from == null;
    const concealed = self ? [...P.hand] : [...P.hand, t];
    let first = null;
    if (!this.calls) {
      if (self && s === this.dealer && P.draws === 1 && this.discardsMade === 0) first = 'heaven';
      else if (self && s !== this.dealer && P.draws === 1) first = 'earth';
      else if (!self && s !== this.dealer && P.draws === 0) first = 'human';
    }
    const sc = scoreHand({
      concealed,
      melds: P.melds.map((m) => ({ type: m.type, t: m.t, closed: !!m.closed })),
      flowers: P.flowers,
      win: t,
      self,
      seat: this.seatWind(s),
      round: this.round,
      last: this.live <= 0,
      afterKong: self && this.afterKong,
      robKong: rob,
      first,
    });
    if (!self) {
      if (rob) {
        const m = this.players[from].melds.find((x) => x.added && x.t === t);
        if (m) ((m.type = 'pung'), (m.added = false));
      } else this.players[from].discards.pop();
      P.hand.push(t);
      P.hand = sortTiles(P.hand);
    }
    const deltas = settle({
      winner: s,
      from: self ? null : from,
      tai: sc.tai,
      dealer: this.dealer,
      streak: this.streak,
    });
    const dealerStays = s === this.dealer;
    this.result = {
      winner: s,
      from: self ? null : from,
      self,
      t,
      tai: sc.tai,
      items: sc.items,
      deltas,
      dealerStays,
    };
    this.emit({ type: 'win', ...this.result });
    this.phase = 'end';
  }

  _exhaust() {
    this.result = { draw: true, deltas: [0, 0, 0, 0], dealerStays: true };
    this.emit({ type: 'exhaust' });
    this.phase = 'end';
  }

  // what seat s can see: its own hand plus everything on the table (for the computer players)
  visible(s) {
    const c = counts(this.players[s].hand);
    for (const P of this.players) {
      for (const t of P.discards) c[t]++;
      for (const m of P.melds)
        if (!(m.closed && P !== this.players[s])) for (const x of meldTiles(m)) c[x]++;
    }
    return c;
  }
  // kinds seat s is waiting on (for the 聽牌 hint)
  waiting(s) {
    return waits(counts(this.players[s].hand), this.sets(s));
  }
}
