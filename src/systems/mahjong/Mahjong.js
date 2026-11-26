// 力行宿舍 277 寢的迷你麻將桌（桌子在 src/world/buildings/Lixing.js 的 rooms[277].mahjong）：台式麻將 16 張，底 30、一台 10。
// 整天都能打，只要錢包 > 0（錢可以輸到負的，但 0 或負的時候不能開打）。按 E 揪人：只找我們力行的 7 個人 ——
//   先找醒著、在寢室的（直接走過來），再打電話叫在外面的回來（打工、顧店、約會、兜風都會來），最後去敲門叫醒在睡覺的；
//   湊滿 3 家就等他們到（看 g.clock；按 E 可以快轉），人到齊按 E 開打。
// 打牌時畫面換到自己的小場景（src/systems/mahjong/MahjongScene.js，有自己的燈，主場景燈數不變）；
// 上桌的人在各自的程式裡看 has(id)／hold()：作息先停下、人坐在桌邊（src/entities/npcs/*.js），定位與「你在哪？」都說在 277 打麻將。
// 散場後他們照當下時間的作息回去（該睡的回床、該上班的回店裡）。輸贏用 g.earn／g.pay 記帳；戰績存檔（src/systems/SaveSystem.js 的 mahjong）。
import { MahjongEngine } from './Engine.js';
import { makeAI, SKILL_DEFAULT, effectiveSkill, skillTier, adjustSkill } from './AI.js';
import { MahjongScene } from './MahjongScene.js';
import { RemoteMahjongEngine, normalizeRoomCode } from './Net.js';
import { createHostRoom, joinGuestRoom, normAng } from './P2P.js';
import { TurnTimer, timeoutAction } from './TurnTimer.js';
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

// 動態難度切換時的室友短台詞：連贏讓室友認真起來，連輸時室友放輕鬆陪你打
export const BANTER = {
  up2: {
    zz: '靠，你今天手氣也太順了吧，我坐直認真打了 😤',
    houshe: '不行不行，再讓你贏下去錢包要見底，開始算牌！',
    jianyu: '你這把牌風很兇喔……我也該認真防守了 🧐',
    hank: '欸你太強了吧，先不聊天了，下把認真盯你！',
    gd: '連胡成這樣？好啊，接下來我可不手軟了 😤',
    howard: '數據顯示你勝率偏高，我決定把演算法開認真一點 🤓',
    richard: '靠，一直被你胡，我要開始記你打過的牌了 😤',
  },
  up3: {
    zz: '太扯了吧！全員警戒，這把絕不能再放槍給你 🔥',
    houshe: '再讓你連莊我們要睡公園了，全力盯死你 🔥',
    jianyu: '好，不裝了——278 寢龜王防守模式全開 🔥',
    hank: '今天遇到牌神喔？不行，這把拼全力擋你 🔥',
    gd: '想把我們全桌掃光？門都沒有，全力開幹 🔥',
    howard: '認真模式拉滿，別想再輕鬆摸大牌了 🔥',
    richard: '你開掛喔？好啦我也不划水了，全力盯牌 🔥',
  },
  hot: {
    zz: '你今天到底拜哪間廟，連胡成這樣太離譜了吧 🔥',
    houshe: '我們都全力打了你還能胡，這手氣真的服了 😅',
    jianyu: '防成這樣還給你摸到……你是力行雀聖喔 🔥',
    hank: '救命啊，這桌已經變彥霖提款機了 😭',
    gd: '可惡，全力還擋不住，下一把一定討回來 🔥',
    howard: '這勝率已經超出模型預測了，太扯 🔥',
    richard: '連全力記牌都擋不住你，今天你最大 🙇',
  },
  down1: {
    zz: '呼，總算追回一點，大家可以先喘口氣囉 😅',
    houshe: '好啦緊張感退一點，恢復平常心慢慢打。',
    jianyu: '穩下來了，不用盯那麼死，正常打就好 😌',
    hank: '有止血就好，氣氛放鬆點邊聊邊打吧！',
    gd: '哼，總算輪到我們出氣了，先收一點力。',
    howard: '局勢回到均衡了，切回一般節奏打。',
    richard: '好啦先不那麼緊繃，正常節奏繼續摸。',
  },
  down0: {
    zz: '欸別氣餒啦，大家放輕鬆邊聊天邊打比較好玩 😌',
    houshe: '手氣背的時候最需要放鬆，這幾把輕鬆打就好！',
    jianyu: '剛剛太緊繃了啦，接下來放軟陪你慢慢摸 😌',
    hank: '哈哈別在意，我們也隨便打當作拉賽聊天 🎵',
    gd: '看你臉都綠了，好啦這幾把不盯那麼兇 😌',
    howard: '幫你調回休閒模式，順便聊點別的吧 😂',
    richard: '手氣差難免的啦，大家放輕鬆陪你打幾圈 😌',
  },
  cold: {
    zz: '沒事沒事，運氣隨時會反彈，下把一定讓你胡回來 💪',
    houshe: '都輕鬆打了手氣還是有點背，喝口水換個手氣啦 ☕',
    jianyu: '牌運就是這樣一陣一陣的，等下就輪到你連莊了 😌',
    hank: '別急，越急越難摸，慢慢來一定會胡！',
    gd: '我已經放超鬆了欸，快胡一把振作起來啊 😂',
    howard: '根據大數法則，你下一把應該快轉運了 🍀',
    richard: '幫你集氣啦，這把穩穩摸一定有機會 🍀',
  },
};

export class DormMahjong {
  constructor(game) {
    this.g = game;
    this.state = null; // null | 'gather' | 'play'
    this.party = [];
    this.stats = {
      hands: 0,
      wins: 0,
      self: 0,
      net: 0,
      best: 0,
      stake: 0,
      skill: SKILL_DEFAULT,
    }; // stake: the 底／台 picked last time (STAKES index); skill: 動態 AI 強度 (0.15–1.0)
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
    return `按 <kbd>E</kbd> 上麻將桌 🀄（單人打室友／多人連線）`;
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
    this.openMenu();
  }
  openMenu() {
    const g = this.g;
    this.state = 'play';
    this.mpMode = null;
    document.exitPointerLock?.();
    this.scene ||= new MahjongScene(g, this);
    this.scene.open(['彥霖', '室友', '室友', '室友']);
    this.scene.chooseMode();
  }
  closeMenu() {
    this.mp?.close();
    this.mp = null;
    this.mpMode = null;
    this.scene?.close();
    this.release();
    this.g.resume?.();
  }
  pickMode(mode) {
    if (mode === 'solo') {
      this.closeMenu();
      this.gather();
      return;
    }
    if (mode === 'multi') {
      this.scene?.chooseMulti(this.savedNick(), this.stats.stake || 0);
    }
  }
  savedNick() {
    try {
      return localStorage.getItem('yanlinGTA.mjNick') || '彥霖';
    } catch (_e) {
      return '彥霖';
    }
  }
  saveNick(nick) {
    const n =
      String(nick || '')
        .trim()
        .slice(0, 12) || '彥霖';
    try {
      localStorage.setItem('yanlinGTA.mjNick', n);
    } catch (_e) {
      /* storage blocked */
    }
    return n;
  }
  // 多人：每個座位（自己視角，0 = 自己）的衣櫃造型，真人座位牌桌上畫成穿那套的彥霖（src/systems/mahjong/MahjongScene.js）；
  // null 或舊版房主沒送 looks 時，那個座位照舊是室友模型
  _setLooks(looks) {
    const L = Array.isArray(looks) && looks.length === 4 ? looks : null;
    if (this.sess) this.sess.looks = L;
    if (this.scene) this.scene.looks = L;
  }
  get isMulti() {
    return !!this.sess?.multi || !!this.mpMode;
  }
  get isGuest() {
    return this.mpMode === 'guest';
  }
  async hostRoom(nick, stake = 0, joinRoomFn, opts = {}) {
    const g = this.g;
    const clean = this.saveNick(nick);
    const spectateReveal = opts.spectateReveal !== false;
    this.stats.stake = stake;
    this.mp?.close();
    this.mpMode = 'host';
    this.scene?.showLobby({
      role: 'host',
      connecting: true,
      stake,
      spectateReveal,
      seats: [],
      spectators: [],
    });
    try {
      this.mp = await createHostRoom({
        name: clean,
        look: g.player.look, // 衣櫃造型（src/systems/OutfitData.js），牌桌上別人看到的你
        stake,
        spectateReveal,
        joinRoomFn,
        onLobby: (lobby) => {
          this._lobby = lobby;
          this.scene?.showLobby({ role: 'host', ...lobby });
        },
        onNotice: (msg) => g.hud.toast(msg, 'good', 2400),
        onAction: (seat, act) => this._onRemoteAction(seat, act),
        onPeerLeave: (seat) => this._onGuestDisconnect(seat),
        onSpectatorChange: (info) => this._onHostSpectatorChange(info),
        onReact: (ev) => this.scene?.showReaction?.(ev),
        onSpecPos: (p) => this._onSpecPos(p),
        getTimers: () => this._turnTimersLeft(),
      });
    } catch (e) {
      this.mpMode = null;
      g.hud.toast(`開房失敗：${e?.message || '請稍後再試'}`, 'bad', 3000);
      this.scene?.chooseMulti(clean, stake);
    }
  }
  setHostStake(i) {
    this.stats.stake = i;
    this.mp?.setStake?.(i);
  }
  toggleSpectateReveal() {
    if (this.mpMode !== 'host' || !this.mp) return;
    const next = !this.mp.spectateReveal;
    this.mp.setSpectateReveal?.(next);
    this.g.hud.toast(
      next ? '👀 已開啟「觀賽可看手牌」' : '🙈 已關閉「觀賽可看手牌」（觀賽者只看桌面牌）',
      'good',
      2200
    );
  }
  _onHostSpectatorChange(info) {
    if (this.sess && Array.isArray(info?.spectators)) {
      this.sess.spectators = info.spectators;
    }
    if (this.mpMode !== 'host' || !this.mp || !this.engine) return;
    if (info?.needStatePeerId) {
      this.mp.sendStateToPeer?.(info.needStatePeerId, this.engine);
    } else if (info?.rebroadcast) {
      this.mp.broadcastState(this.engine, []);
    }
  }
  sendReaction(text) {
    if (!this.mp || !this.sess?.multi) return false;
    const now = Date.now();
    if (now - (this._reactAt || 0) < 1000) return false;
    this._reactAt = now;
    return this.mp.sendReact?.(text);
  }
  async joinRoom(code, nick, joinRoomFn, opts = {}) {
    const g = this.g;
    const clean = this.saveNick(nick);
    const roomCode = normalizeRoomCode(code);
    const spectateOnly = !!opts.spectateOnly;
    if (roomCode.length < 4) {
      g.hud.toast('請輸入 4 碼房號', 'bad', 2200);
      return;
    }
    this.mp?.close();
    this.mpMode = 'guest';
    this.scene?.showLobby({
      role: 'guest',
      code: roomCode,
      connecting: true,
      stake: 0,
      seats: [],
      spectators: [],
    });
    try {
      this.mp = await joinGuestRoom({
        code: roomCode,
        name: clean,
        look: g.player.look,
        spectateOnly,
        moneyOk: g.money > 0,
        joinRoomFn,
        onLobby: (lobby) => {
          this._lobby = lobby;
          this.scene?.showLobby({ role: 'guest', ...lobby });
        },
        onStart: (data) => this._startGuestSession(data),
        onState: (snap, events) => this._onGuestState(snap, events),
        onNext: (data) => this._onGuestNext(data),
        onSpectateInfo: (info) => this._onGuestSpectateInfo(info),
        onReact: (ev) => this.scene?.showReaction?.(ev),
        onSpecPos: (p) => this._onSpecPos(p),
        onNotice: (msg) => g.hud.toast(msg, 'good', 2600),
        onEnd: (reason) => this._onGuestEnd(reason),
      });
    } catch (e) {
      this.mpMode = null;
      g.hud.toast(`加入失敗：${e?.message || '請確認房號'}`, 'bad', 3000);
      this.scene?.chooseMulti(clean, this.stats.stake || 0, roomCode);
    }
  }
  setGuestWantSeat(wantSeat) {
    if (!this.mp || this.mpMode !== 'guest') return;
    const ok = this.g.money > 0;
    if (wantSeat && !ok) {
      this.g.hud.toast('💸 錢包見底，目前只能純觀賽', 'bad', 2400);
      return;
    }
    if (this.sess) this.sess.wantSeat = !!wantSeat;
    this.mp.setWantSeat?.(!!wantSeat, ok);
    this.g.hud.toast(
      wantSeat ? '🪑 已排隊：下局若有 AI 空位將自動上桌' : '👀 已切換為純觀賽（不取代 AI）',
      'good',
      2200
    );
  }
  // 觀戰者切換要看哪一家（dir = 1 往下家、-1 往上家；◀ ▶ 按鈕）：直接走到那家背後
  cycleSpectatorView(dir = 1) {
    if (!this.mp || this.mpMode !== 'guest' || !this.sess?.spectating) return;
    const step = dir < 0 ? -1 : 1;
    const nextSeat = ((((this.sess.viewSeat || 0) + step) % 4) + 4) % 4;
    const who = this.sess.names?.[step > 0 ? 1 : 3];
    this.sess.viewSeat = nextSeat;
    this.mp.setViewSeat?.(nextSeat);
    this.sess.myAng = nextSeat * 90;
    this._sendSpecPos(true);
    if (who) this.g.hud.toast(`👀 切到 ${who} 的視角`, 'good', 1200);
  }
  // 觀戰者繞著牌桌走（按住 ← →、拖曳畫面）：deg 正的往下家那邊。站到誰背後就看誰的手牌（最近的那家）
  orbitSpectator(deg) {
    const s = this.sess;
    if (!this.mp || this.mpMode !== 'guest' || !s?.spectating || !deg) return;
    const ang = normAng((s.myAng ?? (s.viewSeat || 0) * 90) + deg);
    s.myAng = ang;
    const seat = Math.round(ang / 90) % 4;
    if (seat !== (s.viewSeat || 0)) {
      s.viewSeat = seat;
      this.mp.setViewSeat?.(seat);
    }
    this._sendSpecPos(false);
  }
  // 位置最多每 0.1 秒送一次給房主（房主轉給全桌）；停下來時一定補送最後的位置（MahjongScene 每幀呼叫 flush）
  _sendSpecPos(now) {
    const t = Date.now();
    if (now || t - (this._specSentAt || 0) >= 100) {
      this._specSentAt = t;
      this._specDirty = false;
      this.mp?.setSpecPos?.(this.sess.myAng);
    } else this._specDirty = true;
  }
  flushSpecPos() {
    if (this._specDirty && Date.now() - (this._specSentAt || 0) >= 100) this._sendSpecPos(true);
  }
  // 別的觀戰者走動了（房主轉來的）：更新名單裡他的角度，牌桌場景會讓他的人慢慢走過去
  _onSpecPos({ id, ang }) {
    const sp = this.sess?.spectators?.find((x) => x.id === id);
    if (sp) sp.ang = ang;
  }
  startMultiHost() {
    if (!this.mp || this.mpMode !== 'host') return;
    const g = this.g;
    const aiPicks = pickPlayers(g, 3);
    const aiPool = aiPicks.length >= 3 ? aiPicks : ROSTER.slice(0, 3);
    const info = this.mp.startGame(aiPool);
    const [base, perTai] = STAKES[this.mp.stake] || STAKES[0];
    this.stats.stake = this.mp.stake;
    // 用寢室室友當作牌桌旁的 3D 模型（名字仍顯示真人玩家暱稱）
    this.party = aiPool.slice(0, 3).map((r, i) => ({
      id: r.id,
      name: info.names[i + 1],
      seat: i + 1,
      style: info.seats[i + 1]?.style || r.style,
      st: 'dorm',
      arrive: g.clock,
    }));
    this.sess = {
      dealer: 0,
      streak: 0,
      passes: 0,
      hands: 0,
      net: 0,
      base,
      perTai,
      heat: 0,
      winStreak: 0,
      loseStreak: 0,
      multi: true,
      human: info.human,
      names: info.names,
      spectators: info.spectators || [],
    };
    this._seatAIs();
    this.scene.names = info.names;
    this._setLooks(info.looks);
    this.scene.lobby = null;
    this.deal();
  }
  _startGuestSession(data) {
    const g = this.g;
    const [base, perTai] = STAKES[data.stake] || STAKES[0];
    const visual = pickPlayers(g, 3);
    const pool = visual.length >= 3 ? visual : ROSTER.slice(0, 3);
    const spectating = data.role === 'spectator';
    this.party = pool.slice(0, 3).map((r, i) => ({
      id: r.id,
      name: data.names[i + 1],
      seat: i + 1,
      style: r.style,
      st: 'dorm',
      arrive: g.clock,
    }));
    this.sess = {
      dealer: 0,
      streak: 0,
      passes: 0,
      hands: 0,
      net: 0,
      base,
      perTai,
      heat: 0,
      winStreak: 0,
      loseStreak: 0,
      multi: true,
      guest: true,
      spectating,
      wantSeat: !!data.wantSeat,
      queuePos: data.queuePos || 0,
      viewSeat: data.viewSeat ?? data.seat ?? 0,
      spectateReveal: data.spectateReveal !== false,
      spectatorCount: data.spectatorCount || 0,
      spectators: data.spectators || [],
      seat: data.seat,
      names: data.names,
      myId: data.you || null,
      myAng: data.ang ?? (data.viewSeat ?? 0) * 90,
    };
    this.engine = new RemoteMahjongEngine((act) => this.mp?.sendAction(act));
    this.scene.names = data.names;
    this._setLooks(data.looks);
    this.scene.lobby = null;
    this.scene.startHand(this.engine);
    if (spectating) {
      g.hud.toast(
        data.wantSeat
          ? '👀 已進入觀賽！等這局結束會自動取代 AI 上桌'
          : '👀 已進入純觀賽模式（不計輸贏）',
        'good',
        3000
      );
    }
  }
  _onGuestSpectateInfo(info) {
    if (!this.sess || this.mpMode !== 'guest') return;
    if (info.spectateReveal != null) this.sess.spectateReveal = !!info.spectateReveal;
    if (info.spectatorCount != null) this.sess.spectatorCount = info.spectatorCount;
    if (Array.isArray(info.spectators)) this.sess.spectators = info.spectators;
    if (info.role === 'spectator') {
      this.sess.spectating = true;
      if (info.you) this.sess.myId = info.you;
      if (this.sess.myAng == null && info.ang != null) this.sess.myAng = info.ang;
      if (info.wantSeat != null) this.sess.wantSeat = !!info.wantSeat;
      if (info.queuePos != null) this.sess.queuePos = info.queuePos;
      if (info.viewSeat != null) this.sess.viewSeat = info.viewSeat;
      if (info.names) {
        this.sess.names = info.names;
        if (this.scene) this.scene.names = info.names;
        this._setLooks(info.looks);
      }
    }
  }
  _onGuestNext(data) {
    const s = this.sess;
    if (!s) return;
    const nextRole = data?.role || (s.spectating ? 'spectator' : 'player');
    if (data?.spectateReveal != null) s.spectateReveal = !!data.spectateReveal;
    if (data?.spectatorCount != null) s.spectatorCount = data.spectatorCount;
    if (Array.isArray(data?.spectators)) s.spectators = data.spectators;
    if (data?.you) s.myId = data.you;
    if (s.myAng == null && data?.ang != null) s.myAng = data.ang;

    if (nextRole === 'player') {
      if (this.g.money <= 0) {
        this.g.hud.toast('💸 錢包見底了，已自動退桌（由 AI 接手你的座位）', 'bad', 3200);
        this.leave(false, { broke: true });
        return;
      }
      const wasSpec = !!s.spectating;
      s.spectating = false;
      s.wantSeat = false;
      s.queuePos = 0;
      if (data?.seat != null) s.seat = data.seat;
      if (data?.names) {
        s.names = data.names;
        if (this.scene) this.scene.names = data.names;
        this._setLooks(data.looks);
      }
      if (wasSpec || data?.promoted) {
        this.g.hud.toast('🀄 輪到你上桌了！已取代 AI 開始本局', 'good', 3000);
      }
    } else {
      s.spectating = true;
      if (data?.wantSeat != null) s.wantSeat = !!data.wantSeat;
      if (data?.queuePos != null) s.queuePos = data.queuePos;
      if (data?.viewSeat != null) s.viewSeat = data.viewSeat;
      if (data?.names) {
        s.names = data.names;
        if (this.scene) this.scene.names = data.names;
        this._setLooks(data.looks);
      }
      this.mp?.sendWalletStatus?.(this.g.money > 0);
    }
    if (this.engine?.isRemote && this.scene) this.scene.startHand(this.engine);
  }
  _onRemoteAction(seat, act) {
    const e = this.engine;
    if (!e || this.mpMode !== 'host') return;
    e.events.length = 0;
    if (!e.decideFor(seat, act)) return;
    const evs = [...e.events];
    this.mp?.broadcastState(e, evs);
    if (this.scene) {
      this.scene.t = Math.max(this.scene.t, 0.15);
      this.scene._layout();
    }
  }
  // ---------------- 多人限時 20 秒（src/systems/mahjong/TurnTimer.js）：房主計時、判定，客端只顯示 ----------------
  get _timed() {
    return !!this.sess?.multi && this.mpMode === 'host' && !!this.engine && !this.engine.isRemote;
  }
  _turnTimersLeft() {
    if (!this._timed) return [];
    this.turnTimer ||= new TurnTimer();
    return this.turnTimer.left(this.engine);
  }
  // 畫面倒數用：[{ seat（本地視角）, kind, until（本機 Date.now() 時刻） }]；單人模式永遠是空的
  turnTimers() {
    if (this.mpMode === 'guest') return this.engine?.timers || [];
    if (!this._timed) return [];
    this.turnTimer ||= new TurnTimer();
    return this.turnTimer.sync(this.engine);
  }
  // 房主每幀（MahjongScene.update）：時間到的人，出牌就打剛摸的那張（或 AI 挑一張），回應就算「過」
  tickTurnTimers() {
    if (!this._timed) return 0;
    this.turnTimer ||= new TurnTimer();
    let n = 0;
    for (const d of this.turnTimer.expired(this.engine)) {
      const e = this.engine;
      const act = timeoutAction(e, d.seat, d.kind, (eng, s) => this._timeoutPick(eng, s));
      e.events.length = 0;
      if (!e.decideFor(d.seat, act)) continue;
      n++;
      this.mp?.broadcastState(e, [...e.events, { type: 'timeout', seat: d.seat, kind: d.kind }]);
      if (d.seat === 0) this._timeoutToast(d.kind);
      if (this.scene) {
        this.scene.t = Math.max(this.scene.t ?? 0, 0.15);
        this.scene._layout?.();
      }
    }
    return n;
  }
  _timeoutPick(e, s) {
    const ai = this.ais?.[s] || makeAI({ attack: 0.5, defense: 0.5, skill: () => this.aiSkill() });
    const a = ai(e, s, 'turn', { tsumo: false, kongs: [], discard: true });
    return a?.type === 'discard' ? a.t : null;
  }
  _timeoutToast(kind) {
    this.g.hud.toast(
      kind === 'claim' ? '⏱ 時間到，這張視為「過」' : '⏱ 時間到，自動幫你打出一張',
      'bad',
      1800
    );
  }
  _onGuestDisconnect(seat) {
    if (!this.sess?.multi || this.mpMode !== 'host') return;
    if (this.sess.human) this.sess.human[seat] = false;
    // AI 接手：那個座位換回室友模型
    if (this.sess.looks) this._setLooks(this.sess.looks.map((l, i) => (i === seat ? null : l)));
    if (!this.ais?.[seat])
      this.ais[seat] = makeAI({ attack: 0.5, defense: 0.5, skill: () => this.aiSkill() });
    const e = this.engine;
    if (e) {
      e.events.length = 0;
      e.handOverToAI(seat);
      this.mp?.broadcastState(e, [...e.events]);
    }
  }
  onHostStep(events) {
    if (this.mpMode === 'host' && this.mp && this.engine) {
      this.mp.broadcastState(this.engine, events);
    }
  }
  _onGuestState(snap, events) {
    if (!this.engine?.isRemote || !this.scene) return;
    if (this.scene.result && snap.phase !== 'end') {
      if (!this.sess?.spectating && this.g.money <= 0) {
        this.g.hud.toast('💸 錢包見底了，已自動退桌（由 AI 接手你的座位）', 'bad', 3200);
        this.leave(false, { broke: true });
        return;
      }
      this.scene.startHand(this.engine);
    }
    this.engine.applySnapshot(snap, events);
    this.scene._layout();
    // 房主擲骰開門：播同一組點數的擲骰動畫（座位已旋轉成本地視角）
    const roll = events.find((ev) => ev.type === 'roll' && Array.isArray(ev.dice));
    // 房主判定你超時：告訴你幫你做了什麼
    const late = events.find((ev) => ev.type === 'timeout' && ev.seat === 0);
    if (late && !this.sess?.spectating) this._timeoutToast(late.kind);
    if (roll) this.scene.roll?.(roll.seat, roll.dice, 'cut', undefined, { auto: true });
    if (snap.phase === 'end' && !this.scene.result) this.scene._showResult();
  }
  _onGuestEnd(reason) {
    if (this.mpMode !== 'guest') return;
    this.g.hud.toast(reason || '房間已結束', 'bad', 3200);
    if (this.sess) this.leave(false);
    else this.closeMenu();
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
    this.sess = {
      dealer: 0,
      streak: 0,
      passes: 0,
      hands: 0,
      net: 0,
      heat: 0,
      winStreak: 0,
      loseStreak: 0,
    };
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
  aiSkill() {
    return effectiveSkill(this.stats.skill, {
      stake: this.stats.stake || 0,
      heat: this.sess?.heat || 0,
    });
  }
  aiTier() {
    return skillTier(this.aiSkill());
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
    const getSkill = () => this.aiSkill();
    for (const p of this.party) this.ais[p.seat] = makeAI({ ...p.style, skill: getSkill });
  }
  _pickBanter(key, dir, preferSeat) {
    if (!this.party.length) return null;
    const pref = preferSeat ? this.party.find((p) => p.seat === preferSeat) : null;
    const who = pref || this.party[Math.floor(Math.random() * this.party.length)];
    const text = BANTER[key]?.[who.id];
    return text ? { id: who.id, name: who.name, text, dir, key } : null;
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
      human: s.multi ? [...s.human] : [true, false, false, false],
      ai: (e, seat, kind, o) => this.ais[seat](e, seat, kind, o),
    });
    this.scene.startHand(this.engine);
    const multiHost = s.multi && this.mpMode === 'host';
    // 多人：點數由房主決定，連同還沒發牌的牌桌一起廣播（roll 事件），客端與觀戰者播同一組擲骰動畫；
    // 房主這邊動畫播完，畫面的 step() 才發牌並廣播，全桌節奏一致
    if (multiHost) this.mp?.broadcastState(this.engine, [{ type: 'roll', seat: s.dealer, dice }]);
    this.scene.roll?.(s.dealer, dice, 'cut', undefined, { auto: !!s.multi });
  }
  // the scene calls this when a hand is over: pay up, move the dealer on, and adapt AI difficulty
  handOver(r) {
    const g = this.g,
      s = this.sess,
      d = r.deltas[0];
    const prevTier = this.aiTier().id;
    const spectating = !!s.spectating;
    if (!spectating) {
      const label = s.multi ? '277 多人麻將' : '277 麻將';
      if (d > 0) g.earn(d, label);
      else if (d < 0) g.pay(-d, label);
      s.hands++;
      s.net += d;
      if (!r.draw && r.winner === 0) {
        s.winStreak = (s.winStreak || 0) + 1;
        s.loseStreak = 0;
      } else if (!r.draw && d < 0) {
        s.loseStreak = (s.loseStreak || 0) + 1;
        s.winStreak = 0;
      }
      const st = this.stats;
      st.hands++;
      st.net += d;
      if (r.winner === 0) {
        st.wins++;
        if (r.self) st.self++;
        st.best = Math.max(st.best, r.tai);
      }
    }
    let banter = null;
    if (!s.multi && !spectating) {
      const st = this.stats;
      const adj = adjustSkill(st.skill, s.heat || 0, {
        winner: r.winner,
        from: r.from,
        self: !!r.self,
        tai: r.tai || 0,
        delta: d,
        draw: !!r.draw,
        winStreak: s.winStreak || 0,
        loseStreak: s.loseStreak || 0,
      });
      st.skill = adj.skill;
      s.heat = adj.heat;
      const tier = this.aiTier();
      if (tier.id > prevTier) {
        const key = tier.id >= 3 ? 'up3' : tier.id === 2 ? 'up2' : null;
        if (key) banter = this._pickBanter(key, 'up', r.from);
      } else if (tier.id < prevTier) {
        const key = tier.id <= 0 ? 'down0' : tier.id === 1 ? 'down1' : null;
        if (key) banter = this._pickBanter(key, 'down', r.winner);
      } else if (tier.id === 3 && s.winStreak >= 3 && s.winStreak % 3 === 0) {
        banter = this._pickBanter('hot', 'up', r.from);
      } else if (tier.id === 0 && s.loseStreak >= 3 && s.loseStreak % 3 === 0) {
        banter = this._pickBanter('cold', 'down', r.winner);
      }
    }
    if (r.dealerStays) s.streak++;
    else {
      s.dealer = (s.dealer + 1) % 4;
      s.streak = 0;
      s.passes++;
    }
    const broke = !spectating && g.money <= 0;
    const canSpectate = !!(
      broke &&
      s.multi &&
      this.mpMode === 'host' &&
      (this.mp?.peerCount || 0) > 0
    );
    return { over: s.passes >= 16, broke, spectating, canSpectate, banter, tier: this.aiTier() };
  }
  _promoteQueuedSpectators() {
    if (this.mpMode !== 'host' || !this.mp || !this.sess) return [];
    const promo = this.mp.promoteSpectators?.();
    if (!promo?.promoted?.length) return [];
    // 若房主自己已轉 AI 代打，維持 human[0] = false；其餘座位採用最新 human 陣列
    const hostSpec = !!this.sess.spectating;
    this.sess.human = promo.human.map((h, i) => (i === 0 && hostSpec ? false : h));
    this.sess.names = promo.names;
    for (const p of this.party) if (promo.names[p.seat]) p.name = promo.names[p.seat];
    if (this.scene) this.scene.names = promo.names;
    this._setLooks(promo.looks);
    const joined = promo.promoted.map((x) => x.name).join('、');
    const msg = `🪑 ${joined} 取代 AI 上桌了！`;
    this.g.hud.toast(msg, 'good', 2800);
    this.mp.broadcastNotice?.(msg);
    return promo.promoted.map((x) => x.peerId);
  }
  // 多人房主破產時轉為觀戰＋AI 代打（讓房內朋友能把這將打完）
  spectateNext() {
    const s = this.sess;
    if (!s?.multi || this.mpMode !== 'host') return;
    if (s.passes >= 16) return this.leave();
    s.spectating = true;
    if (s.human) s.human[0] = false;
    this.ais ||= [null];
    this.ais[0] = makeAI({ attack: 0.5, defense: 0.5, skill: () => this.aiSkill() });
    const msg = `👀 房主 ${s.names?.[0] || '彥霖'} 錢包見底改為觀戰，由 AI 代打！`;
    this.g.hud.toast(msg, 'good', 2800);
    this.mp?.broadcastNotice?.(msg);
    const promoted = this._promoteQueuedSpectators();
    this.mp?.broadcastNext?.(promoted);
    this.deal();
  }
  next() {
    if (this.isGuest) return;
    if (this.sess.passes >= 16 || (!this.sess.spectating && this.g.money <= 0)) return this.leave();
    if (this.mpMode === 'host') {
      const promoted = this._promoteQueuedSpectators();
      this.mp?.broadcastNext(promoted);
    }
    this.deal();
  }
  // raid: left with Esc in the middle of a hand —「舍監來查寢了，快躲起來，這把不算」
  leave(raid = false, opts = {}) {
    const g = this.g,
      s = this.sess,
      wasMulti = !!s?.multi || !!this.mpMode;
    this.mp?.close(this.mpMode === 'guest' ? { broke: !!opts.broke || g.money <= 0 } : undefined);
    this.mp = null;
    this.mpMode = null;
    this.scene?.close();
    const names = (s?.names ? s.names.slice(1) : this.party.map((p) => p.name)).join('、');
    this.release();
    this.sess = null;
    g.resume?.();
    const net = s?.net || 0;
    if (raid && !wasMulti) {
      g.audio?.mjKnock?.();
      g.dialog([
        ['舍監', '（叩叩叩）查寢！277 開門！'],
        ['彥霖', '🚨 舍監來查寢了！快躲起來——這把不算！'],
      ]);
    }
    if (s) {
      g.hud.toast(
        `🀄 散場！打了 ${s.hands || 0} 局，${net ? `${net > 0 ? '贏' : '輸'} NT$ ${Math.abs(net).toLocaleString('en-US')}` : '不輸不贏'}${names ? `・${names}各自回去了` : ''}`,
        net >= 0 ? 'good' : 'bad',
        3600
      );
    }
  }
}

export { NAME as MAHJONG_NAMES };
