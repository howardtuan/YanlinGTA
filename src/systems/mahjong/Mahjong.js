// 力行宿舍 277 寢的迷你麻將桌（桌子在 src/world/buildings/Lixing.js 的 rooms[277].mahjong）：台式麻將 16 張，底 30、一台 10。
// 整天都能打，只要錢包 > 0（錢可以輸到負的，但 0 或負的時候不能開打）。按 E 揪人：只找我們力行的 7 個人 ——
//   先找醒著、在寢室的（直接走過來），再打電話叫在外面的回來（打工、顧店、約會、兜風都會來），最後去敲門叫醒在睡覺的；
//   湊滿 3 家就等他們到（看 g.clock；按 E 可以快轉），人到齊按 E 開打。
// 打牌時畫面換到自己的小場景（src/systems/mahjong/MahjongScene.js，有自己的燈，主場景燈數不變）；
// 上桌的人在各自的程式裡看 has(id)／hold()：作息先停下、人坐在桌邊（src/entities/npcs/*.js），定位與「你在哪？」都說在 277 打麻將。
// 散場後他們照當下時間的作息回去（該睡的回床、該上班的回店裡）。輸贏用 g.earn／g.pay 記帳；戰績存檔（src/systems/SaveSystem.js 的 mahjong）。
import { MahjongEngine } from './Engine.js';
import { makeAI } from './AI.js';
import { MahjongScene } from './MahjongScene.js';
import { surfaceAt } from '../../world/Terrain.js';
import {
  STAKES,
  rollDice,
  diceSum,
  countSeat,
  cutWall,
  drawWinds,
  seatsFromWinds,
} from './Rules.js';

// 力行的 7 個人：找人的順序（同一種狀態裡）＝ 離 277 近的寢室先；style 是打牌個性（src/systems/mahjong/AI.js）
export const ROSTER = [
  { id: 'zz', name: '吱吱', room: 276, style: { attack: 0.75, defense: 0.3 } },
  { id: 'houshe', name: '侯舌', room: 276, style: { attack: 0.5, defense: 0.5 } },
  { id: 'jianyu', name: '劍玉', room: 278, style: { attack: 0.35, defense: 0.7 } },
  { id: 'hank', name: '漢克', room: 279, style: { attack: 0.5, defense: 0.4 } },
  { id: 'gd', name: '女拳大帝', room: 279, style: { attack: 0.85, defense: 0.2 } },
  { id: 'howard', name: '霍華德', room: 279, style: { attack: 0.45, defense: 0.6 } },
  { id: 'richard', name: '理查', room: 280, style: { attack: 0.4, defense: 0.65 } },
];
const NAME = Object.fromEntries(ROSTER.map((r) => [r.id, r.name]));
const DEV_DORM = new Set(['code', 'game', 'dorm']);

// 'dorm' 醒著在寢室、'out' 醒著在外面、'sleep' 在睡覺、null 這個人不在遊戲裡
export function statusOf(g, id) {
  if (id === 'zz') {
    const Z = g.zz;
    if (!Z) return null;
    return Z.mode === 'sleep' ? 'sleep' : Z.mode === 'room' || Z.mode === 'bath' ? 'dorm' : 'out';
  }
  if (id === 'gd') {
    const G = g.gordon;
    if (!G?.dormCh) return null;
    return G.night && !g.zz?.gdOut ? (G.asleep ? 'sleep' : 'dorm') : 'out';
  }
  if (id === 'hank') {
    const H = g.hank;
    if (!H?.dorm) return null;
    return H.mode === 'dorm' ? (H.asleep ? 'sleep' : 'dorm') : 'out';
  }
  if (id === 'jianyu') {
    const J = g.jianyu;
    if (!J?.ch) return null;
    return J.mode === 'sleep' ? 'sleep' : J.mode === 'game' ? 'dorm' : 'out';
  }
  const D = g[id];
  if (!D?.ch) return null;
  return D.mode === 'sleep' ? 'sleep' : DEV_DORM.has(D.mode) ? 'dorm' : 'out';
}

// who comes: awake in the dorm first, then the ones out (phoned), then the sleepers (woken up); 3 of them
const RANK = { dorm: 0, out: 1, sleep: 2 };
export function pickPlayers(g, n = 3) {
  return ROSTER.map((r, i) => ({ ...r, i, st: statusOf(g, r.id) }))
    .filter((r) => r.st)
    .sort((a, b) => RANK[a.st] - RANK[b.st] || a.i - b.i)
    .slice(0, n);
}
// game minutes until they sit down
export const DELAY = { dorm: 1.5, sleep: 4, out: 10 };
const CALL = {
  dorm: (n, r) => `🀄 ${n}從 ${r} 寢走過來了`,
  out: (n) => `📞 打給${n}：「蛤？好啦好啦，10 分鐘到 🏃」`,
  sleep: (n) => `🚪 敲門叫醒${n}：「幹嘛啦……好啦，打幾圈 😪」`,
};

export class DormMahjong {
  constructor(game) {
    this.g = game;
    this.state = null; // null | 'gather' | 'play'
    this.party = [];
    this.stats = { hands: 0, wins: 0, self: 0, net: 0, best: 0, stake: 0 }; // stake: the 底／台 picked last time (STAKES index)
    const L = game.interiors.lixing,
      M = L?.rooms?.[277]?.mahjong;
    if (!M) {
      console.warn('[mahjong] 力行 277 寢的麻將桌找不到');
      return;
    }
    const { k, B, W } = L;
    const world = (lx, lz, ly) => {
      const [x, z] = W(lx, lz);
      return { x, z, y: B + ly };
    };
    this.table = world(M.table[0], M.table[1], M.y);
    this.seatsW = M.seats.map((s) => ({ ...world(s.x, s.z, M.y), h: k.heading(s.face) }));
    const T = this.table,
      ay = T.y - surfaceAt(T.x, T.z);
    game.interiors.actions.push({
      x: T.x,
      z: T.z,
      y: ay,
      r: 1.35,
      cond: () => this.state !== 'play',
      label: () => this.label(),
      fn: () => this.press(),
    });
  }
  toJSON() {
    return this.stats;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.stats, d);
  }

  // ---------------- who is at the table ----------------
  has(id) {
    return !!this.state && this.party.some((p) => p.id === id);
  }
  get playing() {
    return this.state === 'play';
  }
  arrived(p) {
    return this.g.clock >= p.arrive;
  }
  // an NPC's update hands its figure over while it is in the game: true = don't run your own day
  hold(id, ch, dt, pos) {
    const p = this.party.find((q) => q.id === id);
    if (!this.state || !p) return false;
    p.ch = ch;
    if (this.state === 'play' && this.scene?.active) {
      this.scene.place(p.seat, ch, dt);
      if (pos) pos.set(this.table.x, this.table.y, this.table.z);
      return true;
    }
    if (ch.root.parent !== this.g.scene) this.g.scene.add(ch.root);
    const S = this.seatsW[p.seat],
      pl = this.g.player.pos;
    if (pos) pos.set(S.x, S.y, S.z);
    ch.root.visible = this.arrived(p) && Math.hypot(pl.x - S.x, pl.z - S.z) < 60;
    if (!ch.root.visible) return true;
    ch.root.position.set(S.x, S.y, S.z);
    ch.root.rotation.y = S.h;
    ch.setDetail?.(Math.hypot(pl.x - S.x, pl.z - S.z) < 20);
    ch.update(dt, { speed: 0, mode: 'sit', pose: 'type' });
    return true;
  }
  // 定位／你在哪？
  where(id) {
    const p = this.party.find((q) => q.id === id);
    if (!this.state || !p) return null;
    const pos = { x: this.table.x, z: this.table.z };
    if (this.state === 'play')
      return {
        pos,
        status: '在力行宿舍 277 寢打麻將 🀄',
        reply: ['在 277 打麻將 🀄', '手氣不錯，晚點再說'],
      };
    return this.arrived(p)
      ? { pos, status: '在力行宿舍 277 寢等開打 🀄', reply: ['在 277 等你開打啦 🀄', '快點啦'] }
      : {
          pos: null,
          status: '正在回力行宿舍 277 寢打麻將的路上 🏃',
          reply: ['在路上了啦 🏃', '馬上到 277'],
        };
  }

  // ---------------- the table ----------------
  label() {
    const g = this.g;
    if (this.state === 'gather') {
      const wait = this.party.filter((p) => !this.arrived(p));
      if (!wait.length) return '人到齊了！按 <kbd>E</kbd> 開打 🀄';
      const mins = Math.ceil(Math.max(...wait.map((p) => p.arrive)) - g.clock);
      return `等 ${wait.map((p) => p.name).join('、')} 過來（約 ${mins} 分鐘）・按 <kbd>E</kbd> 快轉`;
    }
    if (g.money <= 0)
      return `💸 錢包見底了（NT$ ${g.money.toLocaleString('en-US')}），先去賺點錢才能上桌`;
    return `按 <kbd>E</kbd> 揪人打麻將 🀄（開打前選底／台）`;
  }
  press() {
    const g = this.g;
    if (this.state === 'gather') {
      if (this.party.every((p) => this.arrived(p))) return this.start();
      const t = Math.max(...this.party.map((p) => p.arrive));
      g.clock = Math.max(g.clock, t);
      g.hud.toast('⏩ 等了一下……人到齊了！按 E 開打', 'good', 2200);
      return;
    }
    if (g.money <= 0) {
      g.hud.toast('💸 錢已經輸光了（0 或負的），不能開打', 'bad', 2400);
      return;
    }
    this.gather();
  }
  gather() {
    const g = this.g,
      picks = pickPlayers(g, 3);
    if (picks.length < 3) {
      g.hud.toast('😢 三缺一：湊不到人', 'bad', 2400);
      return;
    }
    this.party = picks.map((r, i) => ({
      id: r.id,
      name: r.name,
      seat: i + 1,
      style: r.style,
      st: r.st,
      arrive: g.clock + DELAY[r.st],
    }));
    this.state = 'gather';
    this._told = new Set();
    picks.forEach((r, i) =>
      setTimeout(() => g.hud.toast(CALL[r.st](r.name, r.room), 'good', 2600), i * 900)
    );
  }
  // nobody is waiting any more: everyone goes back to what their day says
  release() {
    for (const p of this.party)
      if (p.ch && p.ch.root.parent !== this.g.scene) this.g.scene.add(p.ch.root);
    this.party = [];
    this.state = null;
  }

  // every frame (src/core/Game.js): people arriving, or you walked off
  update(_dt) {
    const g = this.g;
    if (this.state === 'gather') {
      for (const p of this.party)
        if (this.arrived(p) && !this._told.has(p.id)) {
          this._told.add(p.id);
          if (p.st !== 'dorm') g.hud.toast(`🀄 ${p.name}到 277 了`, 'good', 1800);
        }
      const pl = g.player.pos,
        T = this.table;
      if (Math.hypot(pl.x - T.x, pl.z - T.z) > 45 || g.player.vehicle) {
        g.hud.toast('🀄 你跑掉了，大家各自回去了', 'bad', 2400);
        this.release();
      }
    }
  }
  // at the table: the scene has the keys
  play(dt, inp) {
    this.scene?.update(dt, inp);
  }
  render(renderer) {
    this.scene?.render(renderer);
  }

  // ---------------- a session: hand after hand until you leave (or 北風北 is over, or you are broke) ----------------
  start() {
    const g = this.g;
    this.state = 'play';
    this.sess = { dealer: 0, streak: 0, passes: 0, hands: 0, net: 0 };
    this._seatAIs();
    document.exitPointerLock?.();
    this.scene ||= new MahjongScene(g, this);
    this.scene.open(this.seatNames());
    // first the stakes (底／台), then the first hand
    this.scene.chooseStake(this.stats.stake || 0, (i) => {
      const [base, perTai] = STAKES[i] || STAKES[0];
      this.stats.stake = i;
      Object.assign(this.sess, { base, perTai });
      this.seatDraw();
    });
  }
  // 抓位 (draw the four winds, sit by them) → whoever drew 東 throws the dice for the first dealer → the first hand
  seatDraw(rng = Math.random) {
    const winds = drawWinds(rng),
      seats = seatsFromWinds(winds),
      east = seats[winds.indexOf(0)],
      dice = rollDice(rng);
    this.sess.dealer = countSeat(east, diceSum(dice));
    this.scene.seatDraw(
      winds,
      () => {
        for (const p of this.party) p.seat = seats[p.seat];
        this._seatAIs();
        return this.seatNames();
      },
      () => this.scene.roll(east, dice, 'dealer', () => this.deal())
    );
  }
  _seatAIs() {
    this.ais = [null];
    for (const p of this.party) this.ais[p.seat] = makeAI(p.style);
  }
  seatNames() {
    const n = ['彥霖'];
    for (const p of this.party) n[p.seat] = p.name;
    return n;
  }
  get round() {
    return Math.floor(this.sess.passes / 4) % 4;
  }
  // every hand: the dealer throws the dice for where the wall is broken open (開門)
  deal() {
    const s = this.sess,
      dice = rollDice();
    this.engine = new MahjongEngine({
      cut: cutWall(s.dealer, diceSum(dice)),
      dealer: s.dealer,
      streak: s.streak,
      round: this.round,
      base: s.base,
      perTai: s.perTai,
      ai: (e, seat, kind, o) => this.ais[seat](e, seat, kind, o),
    });
    this.scene.startHand(this.engine);
    this.scene.roll(s.dealer, dice, 'cut');
  }
  // the scene calls this when a hand is over: pay up, move the dealer on
  handOver(r) {
    const g = this.g,
      s = this.sess,
      d = r.deltas[0];
    if (d > 0) g.earn(d, '277 麻將');
    else if (d < 0) g.pay(-d, '277 麻將');
    s.hands++;
    s.net += d;
    const st = this.stats;
    st.hands++;
    st.net += d;
    if (r.winner === 0) {
      st.wins++;
      if (r.self) st.self++;
      st.best = Math.max(st.best, r.tai);
    }
    if (r.dealerStays) s.streak++;
    else {
      s.dealer = (s.dealer + 1) % 4;
      s.streak = 0;
      s.passes++;
    }
    return { over: s.passes >= 16, broke: g.money <= 0 };
  }
  next() {
    if (this.sess.passes >= 16 || this.g.money <= 0) return this.leave();
    this.deal();
  }
  // raid: left with Esc in the middle of a hand —「舍監來查寢了，快躲起來，這把不算」
  leave(raid = false) {
    const g = this.g,
      s = this.sess;
    this.scene.close();
    const names = this.party.map((p) => p.name).join('、');
    this.release();
    g.resume?.();
    const net = s?.net || 0;
    if (raid) {
      g.audio?.mjKnock?.();
      g.dialog([
        ['舍監', '（叩叩叩）查寢！277 開門！'],
        ['彥霖', '🚨 舍監來查寢了！快躲起來——這把不算！'],
      ]);
    }
    g.hud.toast(
      `🀄 散場！打了 ${s?.hands || 0} 局，${net ? `${net > 0 ? '贏' : '輸'} NT$ ${Math.abs(net).toLocaleString('en-US')}` : '不輸不贏'}・${names}各自回去了`,
      net >= 0 ? 'good' : 'bad',
      3600
    );
  }
}

export { NAME as MAHJONG_NAMES };
