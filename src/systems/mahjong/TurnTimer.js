// 多人麻將的出牌／吃碰槓胡限時（純邏輯，tests/unit/mahjong-p2p.test.js 測）：
// 只有房主（權威主機，src/systems/mahjong/Mahjong.js）用它替每個「等真人決定」的座位計時，到期替他做預設動作，
// 客端只顯示房主隨快照送來的剩餘時間（src/systems/mahjong/Net.js serializeStateFor 的 timers），不能自己作弊延長。
// 單人模式不限時。
export const TURN_LIMIT_MS = 20000;

// 同一個決定在引擎裡的身分：換了一手（摸牌、吃碰、別人打出新的牌）就是新的決定、重新計時
const turnKey = (e, s) =>
  `turn:${s}:${e.discardsMade}:${e.players[s].draws}:${e.players[s].melds.length}`;
const claimKey = (e, s) =>
  `claim:${s}:${e.discardsMade}:${e.last?.t}:${e.last?.from}:${e.last?.rob ? 1 : 0}`;

// 引擎現在在等哪些真人座位決定：[{ seat, kind: 'turn' | 'claim', key }]
export function humanDecisions(engine) {
  const out = [];
  if (!engine || engine.phase === 'end') return out;
  const human = (s) => !!engine.human?.[s];
  if (engine.phase === 'turn' && engine.pending?.kind === 'turn') {
    const s = engine.pending.seat;
    if (human(s)) out.push({ seat: s, kind: 'turn', key: turnKey(engine, s) });
  } else if (
    (engine.phase === 'claim' || engine.phase === 'robkong') &&
    engine.answers &&
    engine.claimOpts
  ) {
    for (const k of Object.keys(engine.claimOpts)) {
      const s = +k;
      if (!engine.answers[s] && human(s))
        out.push({ seat: s, kind: 'claim', key: claimKey(engine, s) });
    }
  }
  return out;
}

export class TurnTimer {
  constructor({ limit = TURN_LIMIT_MS, now = () => Date.now() } = {}) {
    this.limit = limit;
    this.now = now;
    this.engine = null;
    this.deadlines = new Map(); // key -> { seat, kind, until }
  }
  reset() {
    this.engine = null;
    this.deadlines.clear();
  }
  // 跟引擎目前在等的真人決定對齊：新的開始計時、已經決定掉的拿掉；回傳 [{ seat, kind, until }]
  sync(engine) {
    if (engine !== this.engine) {
      this.engine = engine;
      this.deadlines.clear();
    }
    const now = this.now();
    const live = new Map();
    for (const d of humanDecisions(engine)) {
      live.set(
        d.key,
        this.deadlines.get(d.key) || { seat: d.seat, kind: d.kind, until: now + this.limit }
      );
    }
    this.deadlines = live;
    return [...live.values()];
  }
  // 給快照用：各座位還剩幾毫秒（用剩餘時間而不是時刻，客端時鐘跟房主不準也沒關係）
  left(engine) {
    const now = this.now();
    return this.sync(engine).map((d) => ({
      seat: d.seat,
      kind: d.kind,
      left: Math.max(0, d.until - now),
    }));
  }
  // 時間到的決定
  expired(engine) {
    const now = this.now();
    return this.sync(engine).filter((d) => d.until <= now);
  }
}

// 時間到替他做的動作：回應一律「過」；出牌打剛摸的那張，吃碰後沒摸牌就請 pickDiscard（AI）挑一張
export function timeoutAction(engine, seat, kind, pickDiscard) {
  if (kind === 'claim') return { type: 'pass' };
  const hand = engine.players[seat].hand;
  if (engine.justDrew && engine.turn === seat && hand.includes(engine.drawn))
    return { type: 'discard', t: engine.drawn };
  let t = null;
  try {
    t = pickDiscard?.(engine, seat);
  } catch (_e) {
    t = null;
  }
  return { type: 'discard', t: hand.includes(t) ? t : hand[hand.length - 1] };
}
