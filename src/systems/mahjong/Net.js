// 多人麻將網路協議與視角旋轉（純邏輯，不碰 DOM 與 WebRTC，tests/unit/mahjong-p2p.test.js 可完整測試）：
// - 房主跑權威 MahjongEngine，每次狀態更新時針對每個客端座位旋轉（讓客端永遠坐在本地座位 0）
// - 過濾他家暗手牌與牌牆順序：把未公開的牌用剩餘未見牌組填入（維持 144 張守恆，MahjongScene 的 3D 牌池不會缺牌，客端也絕不洩漏真實暗牌）
// - RemoteMahjongEngine 提供與 MahjongEngine 相容的唯讀介面，讓 MahjongScene 幾乎零改動即可完整渲染多人對局
import { KINDS, FLOWER0, meldTiles } from './Rules.js';

export const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(rng = Math.random) {
  let out = '';
  for (let i = 0; i < 4; i++) out += ROOM_CHARS[Math.floor(rng() * ROOM_CHARS.length)];
  return out;
}

export function normalizeRoomCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

export const rotateSeat = (s, mySeat) => (s - mySeat + 4) % 4;
export const unrotateSeat = (ls, mySeat) => (ls + mySeat) % 4;

// 建立所有 144 張牌的計數表，扣掉客端已可見的牌後，回傳剩下的「未知牌池」用來填充他家蓋著的手牌與牌牆
function unseenPoolFor(engine, visibleSeat, reveal) {
  const rem = new Array(FLOWER0 + 8).fill(0);
  for (let k = 0; k < KINDS; k++) rem[k] = 4;
  for (let k = FLOWER0; k < FLOWER0 + 8; k++) rem[k] = 1;
  const take = (k) => {
    if (k >= 0 && k < rem.length && rem[k] > 0) rem[k]--;
  };
  for (let s = 0; s < 4; s++) {
    const P = engine.players[s];
    if (reveal || s === visibleSeat) for (const k of P.hand) take(k);
    for (const m of P.melds) for (const k of meldTiles(m)) take(k);
    for (const k of P.flowers) take(k);
    for (const k of P.discards) take(k);
  }
  const pool = [];
  for (let k = 0; k < rem.length; k++) for (let i = 0; i < rem[k]; i++) pool.push(k);
  return pool;
}

export function serializeStateFor(engine, mySeat, opts = {}) {
  const spectate = !!opts.spectate;
  const revealAll = !!(spectate && opts.revealAll);
  const rot = (s) => (s == null ? null : rotateSeat(s, mySeat));
  const reveal = engine.phase === 'end' || revealAll;
  const visibleSeat = spectate ? -1 : mySeat;
  const pool = unseenPoolFor(engine, visibleSeat, reveal);
  let pi = 0;
  const takeDummy = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(pool[pi++] ?? 0);
    return out;
  };

  const players = [0, 1, 2, 3].map((ls) => {
    const hs = unrotateSeat(ls, mySeat);
    const P = engine.players[hs];
    return {
      hand: reveal || hs === visibleSeat ? [...P.hand] : takeDummy(P.hand.length),
      melds: P.melds.map((m) => ({
        type: m.type,
        t: m.t,
        closed: !!m.closed,
        added: !!m.added,
        take: m.take,
        from: rot(m.from),
      })),
      flowers: [...P.flowers],
      discards: [...P.discards],
      draws: P.draws,
    };
  });

  const wall = takeDummy(engine.wall.length);
  const p = !spectate && engine.pendingFor ? engine.pendingFor(mySeat) : null;
  const pending = p ? { seat: 0, kind: p.kind, options: p.options } : null;
  const waitingSeat = engine.pending ? rot(engine.pending.seat) : null;

  let result = null;
  if (engine.result) {
    const r = engine.result;
    const deltas = [0, 1, 2, 3].map((ls) => r.deltas[unrotateSeat(ls, mySeat)]);
    result = {
      ...r,
      winner: rot(r.winner),
      from: rot(r.from),
      deltas,
    };
  }

  return {
    dealer: rot(engine.dealer),
    streak: engine.streak,
    round: engine.round,
    base: engine.base,
    perTai: engine.perTai,
    turn: rot(engine.turn),
    phase: engine.phase,
    justDrew: engine.justDrew,
    drawn: reveal || (!spectate && engine.turn === mySeat) ? engine.drawn : null,
    last: engine.last
      ? { t: engine.last.t, from: rot(engine.last.from), rob: !!engine.last.rob }
      : null,
    cut: { seat: rot(engine.cut.seat), stacks: engine.cut.stacks },
    headTaken: engine.headTaken,
    tailTaken: engine.tailTaken,
    live: engine.live,
    players,
    wall,
    pending,
    waitingSeat,
    tenpai: (!spectate || revealAll) && engine.tenpai ? engine.tenpai(mySeat) : [],
    spectate,
    revealAll,
    result,
    // 房主計時的限時決定（src/systems/mahjong/TurnTimer.js）：誰在等、等什麼、還剩幾毫秒
    timers: (opts.timers || []).map((d) => ({ seat: rot(d.seat), kind: d.kind, left: d.left })),
    // 這份快照是以房主的哪個座位當本地座位 0 轉的（觀戰者繞桌走時，鏡頭與旁觀者的位置要跟著換算）
    frame: mySeat,
  };
}

export function rotateEventsFor(events, mySeat, opts = {}) {
  const spectate = !!opts.spectate;
  const revealAll = !!(spectate && opts.revealAll);
  const rot = (s) => (s == null ? null : rotateSeat(s, mySeat));
  return (events || []).map((ev) => {
    const out = { ...ev };
    if ('seat' in out) out.seat = rot(out.seat);
    if ('from' in out) out.from = rot(out.from);
    if ('winner' in out) out.winner = rot(out.winner);
    if (out.type === 'draw' && !revealAll && (spectate || ev.seat !== mySeat)) out.t = -1;
    if (out.deltas) out.deltas = [0, 1, 2, 3].map((ls) => ev.deltas[unrotateSeat(ls, mySeat)]);
    return out;
  });
}

// 客端用來餵給 MahjongScene 的代理引擎：所有座位都已經由房主旋轉成客端在座位 0
export class RemoteMahjongEngine {
  constructor(onDecide) {
    this.onDecide = onDecide;
    this.players = [0, 1, 2, 3].map(() => ({
      hand: [],
      melds: [],
      flowers: [],
      discards: [],
      draws: 0,
    }));
    this.wall = [];
    this.events = [];
    this.pending = null;
    this.waitingSeat = null;
    this.phase = 'deal';
    this.dealer = 0;
    this.streak = 0;
    this.round = 0;
    this.base = 30;
    this.perTai = 10;
    this.turn = 0;
    this.justDrew = false;
    this.drawn = null;
    this.last = null;
    this.cut = { seat: 0, stacks: 0 };
    this.headTaken = 0;
    this.tailTaken = 0;
    this.live = 0;
    this.result = null;
    this._tenpai = [];
    this.spectate = false;
    this.revealAll = false;
    this.timers = [];
    this.frame = 0;
    this.isRemote = true;
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
  step() {
    return false;
  }
  tenpai(s) {
    return s === 0 ? this._tenpai : [];
  }
  decide(a) {
    if (this.spectate || !this.pending || this.pending.seat !== 0) return false;
    this.pending = null;
    this.onDecide?.(a);
    return true;
  }
  applySnapshot(snap, events = []) {
    this.dealer = snap.dealer;
    this.streak = snap.streak;
    this.round = snap.round;
    this.base = snap.base;
    this.perTai = snap.perTai;
    this.turn = snap.turn;
    this.phase = snap.phase;
    this.justDrew = snap.justDrew;
    this.drawn = snap.drawn;
    this.last = snap.last;
    this.cut = snap.cut;
    this.headTaken = snap.headTaken;
    this.tailTaken = snap.tailTaken;
    this.live = snap.live;
    this.players = snap.players;
    this.wall = snap.wall;
    this.pending = snap.pending;
    this.waitingSeat = snap.waitingSeat;
    this._tenpai = snap.tenpai || [];
    this.spectate = !!snap.spectate;
    this.revealAll = !!snap.revealAll;
    this.result = snap.result;
    this.frame = snap.frame ?? 0;
    // 房主送來的是剩餘毫秒，換成本機時鐘的到期時刻（畫面倒數用）
    const now = Date.now();
    this.timers = (snap.timers || []).map((d) => ({
      seat: d.seat,
      kind: d.kind,
      until: now + (d.left || 0),
    }));
    this.events.length = 0;
    for (const ev of events) this.emit(ev);
  }
}
