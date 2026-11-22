// Campaign story for 彥霖 (Yanlin) (第34屆資管系會長候選人).
// All story text lives here — edit freely.
import { makeMissionNpc } from './npc.js';
import { NAME_ALIAS } from './zone_a.js';

export const SPEECH = [
  ['彥霖', '各位同學晚安！我是第34屆資訊管理學系系學會會長候選人 —— 彥霖！'],
  ['彥霖', '我的承諾很簡單：讓系學會更透明、活動更好玩、資源更貼近大家的需要。'],
  ['彥霖', '不管是課業、實習還是系上活動，有問題就來找我，我一定第一個騎車衝過去！'],
  ['彥霖', '資管要贏，票投彥霖！✌'],
];

// 小安 (MANAGER) and 阿哲 (SENIOR) are exported for tools/npc-dashboard
export const MANAGER = { skin: '#f0d2b8', shirt: '#ffd23f', shorts: '#1d3557', pants: true, hair: '#1a1410', hairStyle: 'pony', glasses: false, shoes: '#222', face: true };
export const SENIOR = { skin: '#e2b994', shirt: '#2f6bff', shorts: '#333', pants: true, hair: '#111', hairStyle: 'short', glasses: true, shoes: '#f5f5f2', face: true, bag: '#222' };

export class Missions {
  constructor(game) {
    this.g = game; this.idx = -1; this.step = null; this.timer = null; this.markers = [];
    this.rewarded = new Set(); // checkpoint rewards already given (survives mission retries)
    this.free = false; this.done = false;
    const w = game.world;
    const ap = (name) => {
      const it = w.named[name] || w.named[NAME_ALIAS[name]]; if (!it) return null; // 校史館＝行政大樓（含校史館），新舊名都認
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
  // Where you are inside the current mission, for the save: whether its opening talk is over and which
  // section (小節: goto / checkpoint run / until / flyer count) you are on. Only finished sections are kept —
  // checkpoints reached or votes counted inside the unfinished one are not, so it starts over from scratch.
  progress() {
    if (this.exited) return { talked: true, sub: this.exited.sub, hits: null, base: null, at: this.exited.at };
    return { talked: !!this.talked, sub: Math.max(0, this.sub - 1), hits: null, base: null, at: this._sectionAt || null };
  }
  // where the section you are starting began: the player's spot then (or, resuming a save, the spot saved with it) —
  // a paused section's start ring (▶) waits there
  _mark() {
    const a = this.resume?.at, p = this.g.player.worldPos();
    this._sectionAt = a ? { x: a.x, z: a.z } : { x: p.x, z: p.z };
  }
  // you are standing in the paused section's start ring (the phone's 任務 app can carry on from there)
  get inRing() { const a = this.exited?.at; if (!a) return false; const p = this.g.player.worldPos(); return Math.hypot(p.x - a.x, p.z - a.z) < 6; }
  // ---- leaving a section (時間到 / 暫停選單「退出目前任務」) and coming back to it ----
  // the section's progress is dropped; ▶ 繼續任務 (pause menu) starts that same section again
  get canExit() { return !!this.step && !this.exited && !this.g.hud.inDialog && this.idx >= 1 && this.idx <= 5; }
  exit(reason = '') {
    if (!this.step) return false;
    const title = this._title || '任務', p = this.g.player.worldPos(), at = this._sectionAt || { x: p.x, z: p.z };
    this.exited = { idx: this.idx, sub: Math.max(0, this.sub - 1), title, at };
    this.step = null; this.timer = null; this.g.hud.setTimer(null); this.hideHome = false;
    // the start ring: a light column and a ▶ on the map where the section began; no objective banner while paused
    this.markers = [{ x: at.x, z: at.z, big: true, icon: '▶' }]; this.g.setBeam(at, 5);
    this.g.hud.setObjective(null, null);
    if (reason) { this.g.hud.bigToast('任務暫停', reason); this.g.audio.fail(); }
    this.g._saveT = 9.5;
    return true;
  }
  resumeSection() {
    const ex = this.exited; if (!ex) return false;
    this.exited = null; this.markers = []; this.g.setBeam(null);
    this.resumeAt(ex.idx, { talked: true, sub: ex.sub, at: ex.at });
    this.g.hud.bigToast('繼續任務', ex.title);
    return true;
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
    this.idx++; this.talked = false; this.sub = 0; this.exited = null;
    this.g._saveT = 9.5; // save half a second into the new step
    this.markers = []; this.timer = null; this.g.hud.setTimer(null); this.g.setBeam(null); this.hideHome = false;
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
    this.step = { type: 'goto', target, radius, onArrive }; this._title = title; this._mark();
    this.markers = [{ x: target.x, z: target.z, big: true, icon: '★' }];
    this.g.setBeam(target, radius);
    this.g.hud.setObjective(title, text);
  }
  // an objective that is done when test() turns true (checked every frame); opt: markers, beam target, tick(t, step)
  until(title, text, test, onDone, opt = {}) {
    const i = this.sub++;
    if (this.resume && i < this.resume.sub) { onDone(); return; } // reached before the save
    this.step = { type: 'until', test, onDone, t: 0, opt }; this._title = title; this._mark();
    this.markers = opt.markers || [];
    this.g.setBeam(opt.beam || null, opt.radius || 7);
    this.g.hud.setObjective(title, text);
  }
  checkpoints(list, title, textFn, seconds, ordered, onCp, onDone, onFail, radius = 7) {
    const i = this.sub++;
    if (this.resume && i < this.resume.sub) { onDone(); return; } // finished before the save
    const hits = this.resume && i === this.resume.sub ? this.resume.hits : null;
    this.step = { type: 'cps', list: list.map((p, k) => ({ ...p, hit: !!(hits && hits[k]) })), ordered, onCp, onDone, onFail, radius, textFn, title }; this._title = title; this._mark();
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
    this.exit(`${reason}這一小節先退出，進度沒有保存。回到 ▶ 任務起點，用手機「任務」App 繼續`);
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
    } else if (s.type === 'until') {
      s.t += dt; s.opt.tick?.(s.t, s);
      if (s.test()) { this.step = null; this.markers = []; this.g.setBeam(null); this.g.audio.checkpoint(); s.onDone(); }
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
      this._title = '任務三 · 掃街拉票'; this.sub++; this._mark();
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
  // 5 — 布條失竊案: who tore the banners down? Find 彥霖's old room (中北路, above 孫師傅牛肉拉麵) from a clue,
  // then crack the case with SQL on its computer (terminal `case`, js/detective.js), then the confrontation.
  function () {
    const g = this.g, D = g.detective;
    this.talk([
      ['小安', '布條是掛回去了，可是到底是誰拆的？這樣下去明天投票前還會出事。'],
      ['阿哲', '系學會以前辦活動對帳，存過一份「校園紀錄」備份：路口監視器的車牌、門禁刷卡、超商發票都有。'],
      ['阿哲', '那份備份只在彥霖以前那台舊電腦裡，就放在你以前住的地方。'],
      ['小安', '你以前住哪？我只記得是在 <中北路> 上，樓下是一間 <牛肉拉麵店>。'],
      ['彥霖', '……自己住過的地方我當然記得（應該吧）。我回去用電腦查！'],
    ], () => {
      const yh = g.interiors.yh, d = yh ? yh.door : [g.player.pos.x, g.player.pos.z];
      const inside = () => !g.player.vehicle && g.interiors.zoneAt(g.player.pos.x, g.player.pos.z, g.player.y)?.name === '彥霖以前住的地方';
      // a search area on the map (not centred on the house), the exact ★ only after a while
      const area = { x: d[0] + 38, z: d[1] - 30, area: 95, color: 'rgba(255,143,177,.22)', stroke: '#ff8fb1' };
      this.hideHome = true;
      this.until('任務五 · 布條失竊案', '回到 <b>彥霖以前住的地方</b>：在 <b>中北路</b> 上，樓下是一間 <b>牛肉拉麵店</b>（地圖上粉紅色的範圍）', inside, () => {
        this.hideHome = false;
        g.hud.toast('🏠 回到以前住的地方了，電腦在書桌上', 'good', 2600);
        this.until('任務五 · 布條失竊案', '坐到書桌前按 <kbd>E</kbd> 使用電腦，打開 <b>終端機</b> 輸入 <code>case</code>，用 SQL 找出拆布條的人', () => D.solved('banner') && !g.pc.isOpen, () => {
          this.talk([
            ['彥霖', '小安，我查到了！是資管系二年級的 小明。'],
            ['彥霖', '他中午先去全家買了美工刀跟大垃圾袋，騎著 MKZ-893 繞校園一圈，把 6 條布條一條一條割下來，最後還發文說「任務完成」。'],
            ['小安', '……我馬上去系館找他。'],
            ['小明', '對不起……我只是想幫小華學姊，一時衝動就做了。布條都收在系館的櫃子裡，沒有弄壞。'],
            ['小華', '小明，要贏也要贏得光明正大。彥霖，真的很抱歉，我會陪他把事情處理好。'],
            ['彥霖', '沒關係，明天我們就公平地比一場吧 ✌'],
            ['小安', '真相大白！大家都在討論你怎麼用資料庫破案的，風向整個站到我們這邊了！'],
          ], () => {
            if (this.once('m5:solved')) g.addVotes(8, '真相大白 +8 票');
            g.hud.bigToast('任務完成！', '布條失竊案 破案 🕵️'); g.audio.fanfare();
            g.hud.toast('🕵️ 電腦的「案件檔案」解鎖了兩個支線小案子', 'good', 3200);
            this.g.after(() => this.next(), 1500);
          });
        });
      }, {
        markers: [{ x: area.x, z: area.z, area: area.area, color: area.color, stroke: area.stroke, icon: '?' }],
        // after 2.5 minutes 小安 texts the exact place
        tick: (t, step) => {
          if (step.hinted || t < 150) return; step.hinted = true;
          this.markers = [{ x: d[0], z: d[1], big: true, icon: '★' }]; this.g.setBeam({ x: d[0], z: d[1] }, 6); this.hideHome = false;
          g.hud.toast('📱 小安：「是 孫師傅牛肉拉麵 樓上啦！我幫你標在地圖上了」', 'good', 3600);
        },
      });
    });
  },
  // 6 — platform speech at the Student Activity Center
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
  // 7 — ending
  function () {
    this.done = true; this.g.showEnding();
  },
];
