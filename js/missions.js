// Campaign story for 彥霖 (Yanlin) (第34屆資管系會長候選人).
// All story text lives here — edit freely.
import { makeMissionNpc } from './npc.js';

export const SPEECH = [
  ['彥霖', '各位同學晚安！我是第34屆資訊管理學系系學會會長候選人 —— 彥霖！'],
  ['彥霖', '我的承諾很簡單：讓系學會更透明、活動更好玩、資源更貼近大家的需要。'],
  ['彥霖', '不管是課業、實習還是系上活動，有問題就來找我，我一定第一個騎車衝過去！'],
  ['彥霖', '資管要贏，票投彥霖！✌'],
];

const MANAGER = { skin: '#f0d2b8', shirt: '#ffd23f', shorts: '#1d3557', pants: true, hair: '#1a1410', hairStyle: 'pony', glasses: false, shoes: '#222', face: true };
const SENIOR = { skin: '#e2b994', shirt: '#2f6bff', shorts: '#333', pants: true, hair: '#111', hairStyle: 'short', glasses: true, shoes: '#f5f5f2', face: true, bag: '#222' };

export class Missions {
  constructor(game) {
    this.g = game; this.idx = -1; this.step = null; this.timer = null; this.markers = [];
    this.rewarded = new Set(); // checkpoint rewards already given (survives mission retries)
    this.free = false; this.done = false;
    const w = game.world;
    const ap = (name) => {
      const it = w.named[name]; if (!it) return null;
      const p = w.nearestRoadPoint(it.x, it.z);
      return { x: p.x, z: p.z, name };
    };
    this.P = {
      im: ap('資訊管理學系'), lib: ap('張靜愚紀念圖書館'), sac: ap('學生活動中心'), village: ap('全人教育村'),
      ee: ap('電學大樓'), dorm: ap('良善樓'), tower: ap('鐘塔') || { x: -16, z: 110, name: '鐘塔' }, history: ap('校史館'),
      gym: ap('中原大學體育館'), mgmt: ap('管理大樓'), science: ap('科學館'),
      market: { x: w.nightMarket.x, z: w.nightMarket.z, name: '中原夜市' },
    };
    const nm = w.nearestRoadPoint(w.nightMarket.x, w.nightMarket.z, true); if (nm) this.P.market = { x: nm.x, z: nm.z, name: '中原夜市' };
  }
  get active() { return this.step; }
  // story NPCs always stand at their own fixed spots: 小安 at the start point inside the old gate,
  // 阿哲 in front of the 資管系館. Called by the steps and when a saved game is resumed at step idx.
  spawnNpcs(idx) {
    const g = this.g, s = g.startPos, P = this.P;
    if (!this.manager) {
      this.manager = makeMissionNpc(g.scene, MANAGER, '競選總幹事 小安', s.x + 1.6, s.z + 1.2, s.h + Math.PI);
      g.npcs.push(this.manager);
    }
    if (idx >= 1 && !this.senior) {
      this.senior = makeMissionNpc(g.scene, SENIOR, '資管系學長 阿哲', P.im.x + 2, P.im.z + 1.5, 0);
      g.npcs.push(this.senior);
    }
  }
  start(free = false) {
    this.free = free;
    if (free) { this.g.hud.setObjective('自由探索', '收集校園裡的 <b>34 張金色選票</b>，對同學按 <kbd>滑鼠左鍵</kbd> 發傳單拉票！'); return; }
    this.next();
  }
  // Where you are inside the current mission, for the save: whether its opening talk is over, which
  // objective (goto / checkpoint run) you are on, checkpoints already reached, the flyer count it started at.
  progress() {
    const s = this.step;
    return { talked: !!this.talked, sub: Math.max(0, this.sub - 1), hits: s && s.type === 'cps' ? s.list.map(c => c.hit) : null, base: s && s.type === 'votes' ? s.base : null };
  }
  // Resume a saved game exactly there: the talk that was already done is skipped, earlier objectives are
  // passed through silently (no toasts or fanfare), checkpoints keep their hits. Nobody is teleported.
  resumeAt(idx, prog) {
    this.idx = idx - 1; this.resume = prog || null;
    const g = this.g, bt = g.hud.bigToast, ff = g.audio.fanfare, ob = g.audio.objective;
    g.hud.bigToast = () => {}; g.audio.fanfare = () => {}; g.audio.objective = () => {};
    try { this.next(); } finally { g.hud.bigToast = bt; g.audio.fanfare = ff; g.audio.objective = ob; }
    if (prog && this.step && this.step.type === 'votes' && prog.base != null) this.step.base = prog.base;
    this.resume = null;
  }
  next() {
    this.idx++; this.talked = false; this.sub = 0;
    this.g._saveT = 9.5; // save half a second into the new step
    this.markers = []; this.timer = null; this.g.hud.setTimer(null); this.g.setBeam(null);
    const fn = this.steps[this.idx];
    if (fn) { this.g.audio.objective(); fn.call(this); } else this.step = null;
  }
  // ----- helpers -----
  // true the first time a key is seen, so retrying a failed mission doesn't pay out (or build boards) twice
  once(key) { if (this.rewarded.has(key)) return false; this.rewarded.add(key); return true; }
  talk(lines, cb) {
    if (this.resume?.talked) { this.talked = true; cb(); return; } // already heard it before the save
    this.g.dialog(lines, () => { this.talked = true; cb(); });
  }
  goto(target, title, text, onArrive, radius = 7) {
    const i = this.sub++;
    if (this.resume && i < this.resume.sub) { onArrive(); return; } // reached before the save
    this.step = { type: 'goto', target, radius, onArrive };
    this.markers = [{ x: target.x, z: target.z, big: true, icon: '★' }];
    this.g.setBeam(target, radius);
    this.g.hud.setObjective(title, text);
  }
  checkpoints(list, title, textFn, seconds, ordered, onCp, onDone, onFail, radius = 7) {
    const i = this.sub++;
    if (this.resume && i < this.resume.sub) { onDone(); return; } // finished before the save
    const hits = this.resume && i === this.resume.sub ? this.resume.hits : null;
    this.step = { type: 'cps', list: list.map((p, k) => ({ ...p, hit: !!(hits && hits[k]) })), ordered, onCp, onDone, onFail, radius, textFn, title };
    this.timer = seconds;
    this._refreshCps();
  }
  _refreshCps() {
    const s = this.step;
    const left = s.list.filter(p => !p.hit);
    const show = s.ordered ? left.slice(0, 1) : left;
    this.markers = show.map((p, i) => ({ x: p.x, z: p.z, big: true, icon: s.ordered ? String(s.list.indexOf(p) + 1) : '📄' }));
    this.g.setBeam(show[0] || null, s.radius, show.slice(1));
    this.g.hud.setObjective(s.title, s.textFn(s.list.length - left.length, s.list.length, left));
  }
  fail(reason, retry) {
    this.step = null; this.timer = null; this.g.hud.setTimer(null); this.g.setBeam(null); this.markers = [];
    this.g.hud.bigToast('任務失敗', reason);
    this.g.audio.fail();
    this.g.after(() => { this.idx--; this.next(); }, 2600);
  }
  update(dt) {
    const s = this.step; if (!s || this.g.hud.inDialog) return;
    const p = this.g.player.worldPos();
    if (this.timer !== null) {
      const sec = Math.ceil(this.timer); this.timer -= dt; this.g.hud.setTimer(this.timer);
      if (this.timer > 0 && this.timer <= 10 && Math.ceil(this.timer) !== sec) this.g.audio.tick(this.timer <= 5);
      if (this.timer <= 0) { const f = s.onFail; this.timer = null; f ? f() : this.fail('時間到了！'); return; }
    }
    if (s.type === 'goto') {
      if (Math.hypot(p.x - s.target.x, p.z - s.target.z) < s.radius) { this.step = null; this.g.setBeam(null); this.markers = []; this.g.audio.checkpoint(); s.onArrive(); }
    } else if (s.type === 'cps') {
      for (const c of s.list) {
        if (c.hit) continue;
        if (s.ordered && c !== s.list.find(q => !q.hit)) continue;
        if (Math.hypot(p.x - c.x, p.z - c.z) < s.radius) {
          c.hit = true; this.g.audio.checkpoint(); s.onCp && s.onCp(c);
          if (s.list.every(q => q.hit)) { this.step = null; this.timer = null; this.g.hud.setTimer(null); this.g.setBeam(null); this.markers = []; s.onDone(); return; }
          this._refreshCps();
        }
      }
    } else if (s.type === 'votes') {
      // only flyers handed out count (not golden ballots, guardhouse, etc.)
      const got = (this.g.flyerVotes || 0) - s.base;
      if (got !== s.shown) { s.shown = got; this.g.hud.setObjective(s.title, `對路上的同學按 <kbd>滑鼠左鍵</kbd> 發傳單拉票：<b>${Math.min(got, s.need)} / ${s.need}</b> 票`); }
      if (got >= s.need) { this.step = null; this.g.audio.checkpoint(); s.onDone(); }
    }
  }
}

// ---------------- story ----------------
Missions.prototype.steps = [
  // 0 — intro at the old gate
  function () {
    const g = this.g, P = this.P;
    this.spawnNpcs(0);
    g.hud.setObjective('序章 · 投票前一天', '和 小安 對話');
    this.talk([
      ['小安', '早安彥霖！明天就是 <第34屆資管系會長> 投票日了，今天是最後衝刺，從早上拉票到晚上的政見發表會！'],
      ['彥霖', '放心，我準備好了 ✌'],
      ['小安', '大家一早就在資訊管理學系館集合等你。系館在二一鐘塔的東邊，跟著地圖上的黃色★走！'],
      ['小安', '小提示：按 [[M|View]] 打開大地圖；路邊的機車走過去按 [[F|B]] 就能騎。'],
    ], () => {
      g.player.setPose('peace', 1.5);
      this.goto(P.im, '序章 · 投票前一天', '前往 <b>資訊管理學系館</b>', () => this.next(), 9);
    });
  },
  // 1 — flyers to bulletin boards (timed, any order)
  function () {
    const g = this.g, P = this.P;
    this.spawnNpcs(1);
    g.bringMyScooter(P.im.x, P.im.z);
    this.talk([
      ['阿哲', '早安！主角終於來了！傳單一早剛印好，還熱熱的。'],
      ['阿哲', '幫我把傳單送到 5 個公布欄：圖書館、學生活動中心、全人教育村、電學大樓、良善樓宿舍。'],
      ['阿哲', '限時 3 分鐘！你的 JET SL 我幫你牽到系館前面了，騎它比較快 🛵'],
    ], () => {
      const cps = [P.lib, P.sac, P.village, P.ee, P.dorm].filter(Boolean);
      this.checkpoints(cps, '任務一 · 傳單大作戰', (n, t, left) => `把傳單送到公布欄：<b>${n}/${t}</b>　（${left.map(l => l.name).join('、')}）`, 180, false,
        (c) => { if (this.once('m1:' + this.step.list.indexOf(c))) g.addVotes(3, `${c.name} 公布欄 +3 票`); },
        () => { g.hud.bigToast('任務完成！', '傳單全部貼好了'); g.audio.fanfare(); this.g.after(() => this.goto(P.im, '任務一 · 傳單大作戰', '回到 <b>資訊管理學系館</b> 回報', () => this.next(), 9), 1200); });
    });
  },
  // 2 — breakfast run (the breakfast shops on the 中原夜市 street)
  function () {
    const g = this.g, P = this.P;
    this.talk([
      ['阿哲', '太神啦！不過大家一大早就來幫忙，到現在都還沒吃早餐…'],
      ['小安', '彥霖，可以幫大家去中原夜市那條街的早餐店買蛋餅跟豆漿嗎？'],
      ['阿哲', '蛋餅冷掉就不好吃了，2 分鐘內來回！'],
    ], () => {
      this.timer = 120;
      this.goto(P.market, '任務二 · 早餐補給', '騎去 <b>中原夜市</b> 那條街買蛋餅和豆漿', () => {
        g.hud.toast('🥞 蛋餅 ×6、🥛 豆漿 ×6 買到了！', 'good', 2500);
        this.timer = Math.max(this.timer, 60);
        this.goto(P.im, '任務二 · 早餐補給', '趁熱把早餐送回 <b>資訊管理學系館</b>', () => {
          this.timer = null; g.hud.setTimer(null);
          g.addVotes(5, '幹部士氣大增 +5 票');
          g.hud.bigToast('任務完成！', '蛋餅還是熱的 🥞'); g.audio.fanfare();
          this.g.after(() => this.next(), 1500);
        }, 9);
      }, 12);
      this.step.onFail = null;
    });
  },
  // 3 — street canvassing
  function () {
    const g = this.g;
    this.talk([
      ['阿哲', '吃飽了，該去拉票啦！'],
      ['小安', '去路上找同學聊聊，對他們按 [[滑鼠左鍵|X]]（手機按 📄）遞傳單。目標再拿 15 票！'],
      ['小安', '騎車小心，撞到同學會掉票喔 😅'],
    ], () => {
      this.step = { type: 'votes', base: g.flyerVotes || 0, need: 15, title: '任務三 · 掃街拉票', onDone: () => { g.hud.bigToast('任務完成！', '大家都認識彥霖了'); g.audio.fanfare(); this.g.after(() => this.next(), 1500); } };
    });
  },
  // 4 — banner race (ordered)
  function () {
    const g = this.g, P = this.P;
    this.talk([
      ['小安', '糟了！剛剛有人把我們的布條拆掉了！'],
      ['小安', '依照順序騎去 6 個地點把布條掛回去，限時 120 秒！'],
      ['彥霖', '交給我，衝了 🛵💨'],
    ], () => {
      const cps = [P.tower, P.history, P.lib, P.gym, P.village, P.mgmt].filter(Boolean);
      this.checkpoints(cps, '任務四 · 布條保衛戰', (n, t, left) => `依序掛回布條：<b>${n}/${t}</b>　下一站：${left[0] ? left[0].name : ''}`, 120, true,
        (c) => { if (this.once('m4:' + this.step.list.indexOf(c))) { g.addVotes(2, `布條掛好了 +2 票`); g.world.addBoard(c.x + 3, c.z + 3, Math.random() * 6.28, 0.7); } },
        () => { g.hud.bigToast('任務完成！', '布條全部掛回去了'); g.audio.fanfare(); this.g.after(() => this.next(), 1500); });
    });
  },
  // 5 — platform speech at the Student Activity Center
  function () {
    const g = this.g, P = this.P;
    this.talk([
      ['小安', '忙了一整天，晚上 7 點的政見發表會要開始了！'],
      ['小安', '大家都在 學生活動中心 等你，快過去！'],
    ], () => {
      this.goto(P.sac, '終章 · 政見發表會', '前往 <b>學生活動中心</b> 參加政見發表會', () => {
        g.startSpeech(P.sac, () => this.next());
      }, 9);
    });
  },
  // 6 — ending
  function () {
    this.done = true; this.g.showEnding();
  },
];
