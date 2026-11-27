// Campaign story for 彥霖 (Yanlin) (第34屆資管系會長候選人).
// All story text lives here — edit freely.
import { makeHoloNpc } from '../entities/HoloAI.js';
import { NAME_ALIAS } from '../world/zones/ZoneA.js';
import { surfaceAt } from '../world/Terrain.js';

export const SPEECH = [
  ['彥霖', '各位同學晚安！我是第34屆資訊管理學系系學會會長候選人 —— 彥霖！'],
  ['彥霖', '我的承諾很簡單：讓系學會更透明、活動更好玩、資源更貼近大家的需要。'],
  ['彥霖', '不管是課業、實習還是系上活動，有問題就來找我，我一定第一個騎車衝過去！'],
  ['彥霖', '資管要贏，票投彥霖！✌'],
];

// The two story AIs that give the missions (they replaced the old 小安 / 阿哲 NPCs). Both are holographic
// rings standing on the map (src/entities/HoloAI.js); exported for tools/npc-dashboard and the tests.
export const MONDAY = 'M.O.N.D.A.Y'; // 舊正門起點，帶整條主線（青色）
export const WEDNESDAY = 'W.E.D.N.E.S.D.A.Y'; // 資管系館前駐點（紫色）

// 任務六「宿舍拉票」：力行宿舍（男生宿舍）二樓能進去的六間寢室，每間門口按 E 拉一次票（src/world/buildings/Lixing.js OPEN_ROOMS）。
// 每間門口一句寢室同學的回應；拜訪過的寢室記在 rewarded（m6:寢號），所以存檔、暫停重來都不會重拜、重複給票。
export const DORM_ROOMS = [276, 277, 278, 279, 280, 281];
export const DORM_LINES = {
  276: [
    ['彥霖', '276 的各位，自己寢室也要拜一下票啦 ✌'],
    ['276 寢同學', '室友選會長當然投！你的 3 號床我們幫你顧著 😆'],
  ],
  277: [
    ['彥霖', '打擾了～我是資管系會長候選人彥霖！'],
    ['277 寢同學', '（麻將桌旁抬頭）喔喔候選人！這圈打完就去投，碰！'],
  ],
  278: [
    ['彥霖', '278 晚安！明天投票記得投彥霖！'],
    ['278 寢同學', '我們整間都資管的啦，早就決定投你了 💪'],
  ],
  279: [
    ['彥霖', '哈囉 279，耽誤你們一分鐘！'],
    ['279 寢同學', '（吉他聲停下）候選人親自來敲門欸，好啦這票給你 🎸'],
  ],
  280: [
    ['彥霖', '280 的同學好，我是彥霖，請多多支持！'],
    ['280 寢同學', '程式卡住的時候系學會能開讀書會嗎？可以的話我就投你 💻'],
    ['彥霖', '這個好，記下來了！'],
  ],
  281: [
    ['彥霖', '281 晚安，最後一間了！拜託明天投彥霖 🙏'],
    ['281 寢同學', '第一次有候選人走到宿舍來耶，衝著這點就投你！'],
  ],
};
export const DORM_NOTE = '以後可以多去宿舍走走，認識其他同學 🏠';

export class Missions {
  constructor(game) {
    this.g = game;
    this.idx = -1;
    this.step = null;
    this.timer = null;
    this.markers = [];
    this.rewarded = new Set(); // checkpoint rewards already given (survives mission retries)
    this.free = false;
    this.done = false;
    this.homeFound = false; // the player has been to 彥霖以前住的地方 (saved): only then is 🏠 on the map
    const w = game.world;
    const ap = (name) => {
      const it = w.named[name] || w.named[NAME_ALIAS[name]];
      if (!it) return null; // 校史館＝行政大樓（含校史館），新舊名都認
      const p = w.nearestRoadPoint(it.x, it.z);
      return { x: p.x, z: p.z, name };
    };
    this.P = {
      im: ap('資訊管理學系'),
      lib: ap('張靜愚紀念圖書館'),
      sac: ap('學生活動中心'),
      village: ap('全人教育村'),
      dorm: ap('良善樓'),
      tower: ap('鐘塔') || { x: -16, z: 110, name: '鐘塔' },
      history: ap('校史館'),
      gym: ap('中原大學體育館'),
      mgmt: ap('管理大樓'),
      science: ap('科學館'),
      market: { x: w.nightMarket.x, z: w.nightMarket.z, name: '中原夜市' },
    };
    const nm = w.nearestRoadPoint(w.nightMarket.x, w.nightMarket.z, true);
    if (nm) this.P.market = { x: nm.x, z: nm.z, name: '中原夜市' };
    // 任務一的 5 個公布欄：地形改版後「建築最近的道路點」會跑偏（電學大樓、良善樓疊在同一條路上），改成手選的固定座標。
    // 全人教育村在 (-80,-80) 西邊的全人大道東側路邊；體育館取代原本的電學大樓；良善樓維持原本自動算出的點。
    const fixed = (x, z, name) => ({ x, z, name });
    this.P.flyers = [
      fixed(-180, 8, '張靜愚紀念圖書館'),
      fixed(-160, -80, '學生活動中心'),
      fixed(-89.5, -80, '全人教育村'),
      this.P.gym,
      this.P.dorm,
    ].filter(Boolean);
  }
  get active() {
    return this.step;
  }
  // 彥霖以前住的地方 is known once you have found it yourself, or the story is past 任務五 (save-safe for old saves).
  // Until then it is not on the map (🏠) nor in 品漢堡's ride list (src/systems/minigames/PinHanRide.js)
  get homeKnown() {
    return this.homeFound || this.done || this.idx > 5;
  }
  // 🏠 彥霖的家 on the map: only when known, and never during 任務五's search
  get showHome() {
    return !this.hideHome && this.homeKnown;
  }
  // called when you walk into 彥霖以前住的地方 (Game checks the zone you stand in); 任務五 then skips its search
  discoverHome() {
    if (this.homeFound) return;
    this.homeFound = true;
    this.g._saveT = 9.5;
    if (!this.hideHome && !this.done && this.idx <= 5)
      this.g.hud.toast('🏠 發現彥霖以前住的地方！已標在地圖上', 'good', 3000);
  }
  // the story AIs always float at their own fixed spots: M.O.N.D.A.Y at the start point inside the old gate,
  // W.E.D.N.E.S.D.A.Y in front of the 資管系館. Called by the steps and when a saved game is resumed at step idx.
  spawnNpcs(idx) {
    const g = this.g,
      s = g.startPos,
      P = this.P;
    if (!this.manager) {
      this.manager = makeHoloNpc(g.scene, MONDAY, s.x + 1.6, s.z + 1.2, s.h + Math.PI);
      g.npcs.push(this.manager);
      this._talkable(this.manager, MONDAY);
    }
    if (idx >= 1 && !this.senior) {
      this.senior = makeHoloNpc(g.scene, WEDNESDAY, P.im.x + 2, P.im.z + 1.5, 0);
      g.npcs.push(this.senior);
      this._talkable(this.senior, WEDNESDAY);
    }
  }
  // the AIs between their story scenes: E reminds you what to do now (or that the mission is paused), and cheers
  // you on once the story is over.
  _talkable(npc, who) {
    const g = this.g,
      p = npc.ch.root.position;
    g.interiors.actions.push({
      x: p.x,
      z: p.z,
      r: 2.4,
      y: 0,
      anyY: true,
      cond: () => npc.ch.root.visible && !g.hud.inDialog,
      label: () => `按 <kbd>E</kbd> 呼叫 ${who}`,
      fn: () => this.chat(who),
    });
  }
  chat(who) {
    const g = this.g,
      obj = (document.getElementById('objText')?.innerText || '').trim();
    let lines;
    if (this.done || this.free)
      lines =
        who === MONDAY
          ? [
              [
                MONDAY,
                '主線任務全部完成。辛苦了，會長 ✌ 接下來是自由時間，去收集金色選票、到處逛逛吧。',
              ],
              [MONDAY, '提醒：發傳單一樣能加票，選票是越多越好 🗳️'],
            ]
          : [
              [WEDNESDAY, '系館駐點回報：一切正常。系學會的交接資料我已經整理好了 😆'],
              [WEDNESDAY, '偵測到活動中心的麥當勞在缺人，想打工可以過去 🍟'],
            ];
    else if (this.exited)
      lines = [
        [who, `「${this.exited.title}」先暫停了，沒關係！`],
        [who, '準備好了就回到地圖上的 ▶ 任務起點，打開手機的「任務」App 按「▶ 繼續任務」。'],
      ];
    else if (this.step && obj)
      lines = [
        [who, who === MONDAY ? '目前的任務目標：' : '系館駐點提示，現在要：'],
        [who, obj],
        [who, '不知道怎麼走就按 M 看大地圖，或打開手機「任務」App 導航 🧭'],
      ];
    else
      lines = [[who, who === MONDAY ? '我在這裡待命，有事隨時呼叫我。' : '系館這邊交給我監控 💪']];
    g.dialog(lines);
  }
  start(free = false) {
    this.free = free;
    if (free) {
      this.g.hud.setObjective(
        '自由探索',
        '收集校園裡的 <b>34 張金色選票</b>，對同學按 <kbd>滑鼠左鍵</kbd> 發傳單拉票！'
      );
      return;
    }
    this.next();
  }
  // Where you are inside the current mission, for the save: whether its opening talk is over and which
  // section (小節: goto / checkpoint run / until / flyer count) you are on. Only finished sections are kept —
  // checkpoints reached or votes counted inside the unfinished one are not, so it starts over from scratch.
  progress() {
    if (this.exited)
      return { talked: true, sub: this.exited.sub, hits: null, base: null, at: this.exited.at };
    return {
      talked: !!this.talked,
      sub: Math.max(0, this.sub - 1),
      hits: null,
      base: null,
      at: this._sectionAt || null,
    };
  }
  // where the section you are starting begins — a paused section's start marker (▶) waits there. A fixed spot per
  // mission / section (not where you happened to stand, nor a spot from an older save): the campaign HQ at the
  // 資管系館 for the story missions, the 中原夜市 street for the breakfast run's way back, your old place for the
  // case's computer part
  _startOf(idx, sub) {
    const P = this.P,
      im = P.im,
      yh = this.g.interiors.yh?.door;
    if (idx === 0) {
      const s = this.g.startPos;
      return s ? { x: s.x, z: s.z } : im;
    }
    if (idx === 2 && sub >= 1) return P.market || im;
    if (idx === 5 && sub >= 1 && yh) return { x: yh[0], z: yh[1] };
    if (idx === 6) return this._dormGate() || im;
    return im;
  }
  _mark() {
    const p = this.g.player.worldPos(),
      q = this._startOf(this.idx, Math.max(0, this.sub - 1));
    this._sectionAt = q ? { x: q.x, z: q.z } : { x: p.x, z: p.z };
  }
  // you are standing in the paused section's start ring (the phone's 任務 app can carry on from there)
  get inRing() {
    const a = this.exited?.at;
    if (!a) return false;
    const p = this.g.player.worldPos();
    return Math.hypot(p.x - a.x, p.z - a.z) < 6;
  }
  // ---- leaving a section (時間到 / 暫停選單「退出目前任務」) and coming back to it ----
  // the section's progress is dropped; ▶ 繼續任務 (pause menu) starts that same section again
  get canExit() {
    return !!this.step && !this.exited && !this.g.hud.inDialog && this.idx >= 1 && this.idx <= 6;
  }
  exit(reason = '') {
    if (!this.step) return false;
    const title = this._title || '任務',
      sub = Math.max(0, this.sub - 1),
      at = this._startOf(this.idx, sub) || this._sectionAt;
    this.exited = { idx: this.idx, sub, title, at };
    this.step = null;
    this.timer = null;
    this.g.hud.setTimer(null);
    this.hideHome = false;
    // the start ring: a light column and a ▶ on the map where the section began; no objective banner while paused
    this.markers = [{ x: at.x, z: at.z, big: true, icon: '▶' }];
    this.g.setBeam(at, 5);
    this.g.hud.setObjective(null, null);
    if (reason) {
      this.g.hud.bigToast('任務暫停', reason);
      this.g.audio.fail();
    }
    this.g._saveT = 9.5;
    return true;
  }
  resumeSection() {
    const ex = this.exited;
    if (!ex) return false;
    this.exited = null;
    this.markers = [];
    this.g.setBeam(null);
    this.resumeAt(ex.idx, { talked: true, sub: ex.sub, at: ex.at });
    this.g.hud.bigToast('繼續任務', ex.title);
    return true;
  }
  // Resume a saved game exactly there: the talk that was already done is skipped, earlier objectives are
  // passed through silently (no toasts or fanfare), checkpoints keep their hits. Nobody is teleported.
  resumeAt(idx, prog) {
    this.idx = idx - 1;
    this.resume = prog || null;
    const g = this.g,
      bt = g.hud.bigToast,
      ff = g.audio.fanfare,
      ob = g.audio.objective;
    g.hud.bigToast = () => {};
    g.audio.fanfare = () => {};
    g.audio.objective = () => {};
    try {
      this.next();
    } finally {
      g.hud.bigToast = bt;
      g.audio.fanfare = ff;
      g.audio.objective = ob;
    }
    if (prog && this.step && this.step.type === 'votes' && prog.base != null)
      this.step.base = prog.base;
    this.resume = null;
  }
  next() {
    this.idx++;
    this.talked = false;
    this.sub = 0;
    this.exited = null;
    this.g._saveT = 9.5; // save half a second into the new step
    this.markers = [];
    this.timer = null;
    this.g.hud.setTimer(null);
    this.g.setBeam(null);
    this.hideHome = false;
    const fn = this.steps[this.idx];
    if (fn) {
      this.g.audio.objective();
      fn.call(this);
    } else this.step = null;
  }
  // ----- helpers -----
  // true the first time a key is seen, so retrying a failed mission doesn't pay out (or build boards) twice
  once(key) {
    if (this.rewarded.has(key)) return false;
    this.rewarded.add(key);
    return true;
  }
  talk(lines, cb) {
    if (this.resume?.talked) {
      this.talked = true;
      cb();
      return;
    } // already heard it before the save
    this.g.dialog(lines, () => {
      this.talked = true;
      cb();
    });
  }
  goto(target, title, text, onArrive, radius = 7) {
    const i = this.sub++;
    if (this.resume && i < this.resume.sub) {
      onArrive();
      return;
    } // reached before the save
    this.step = { type: 'goto', target, radius, onArrive };
    this._title = title;
    this._mark();
    this.markers = [{ x: target.x, z: target.z, big: true, icon: '★' }];
    this.g.setBeam(target, radius);
    this.g.hud.setObjective(title, text);
  }
  // an objective that is done when test() turns true (checked every frame); opt: markers, beam target, tick(t, step)
  until(title, text, test, onDone, opt = {}) {
    const i = this.sub++;
    if (this.resume && i < this.resume.sub) {
      onDone();
      return;
    } // reached before the save
    this.step = { type: 'until', test, onDone, t: 0, opt };
    this._title = title;
    this._mark();
    this.markers = opt.markers || [];
    this.g.setBeam(opt.beam || null, opt.radius || 7);
    this.g.hud.setObjective(title, text);
  }
  checkpoints(list, title, textFn, seconds, ordered, onCp, onDone, onFail, radius = 7) {
    const i = this.sub++;
    if (this.resume && i < this.resume.sub) {
      onDone();
      return;
    } // finished before the save
    const hits = this.resume && i === this.resume.sub ? this.resume.hits : null;
    this.step = {
      type: 'cps',
      list: list.map((p, k) => ({ ...p, hit: !!(hits && hits[k]) })),
      ordered,
      onCp,
      onDone,
      onFail,
      radius,
      textFn,
      title,
    };
    this._title = title;
    this._mark();
    this.timer = seconds;
    this._refreshCps();
  }
  _refreshCps() {
    const s = this.step;
    const left = s.list.filter((p) => !p.hit);
    const show = s.ordered ? left.slice(0, 1) : left;
    this.markers = show.map((p, i) => ({
      x: p.x,
      z: p.z,
      big: true,
      icon: s.ordered ? String(s.list.indexOf(p) + 1) : '📄',
    }));
    this.g.setBeam(show[0] || null, s.radius, show.slice(1));
    this.g.hud.setObjective(s.title, s.textFn(s.list.length - left.length, s.list.length, left));
  }
  // ---- 任務六 · 宿舍拉票：力行 276～281 的門口 ----
  // the forecourt by 力行's 1F 大門 (where the paused mission's ▶ waits and the phone's 🧭 points to)
  _dormGate() {
    const L = this.g.interiors?.lixing;
    if (!L?.park || !L.W) return null;
    const [x, z] = L.W(L.park.x, L.park.z);
    return { x, z };
  }
  // the six doorsteps on the 2F gallery, just outside each door (world x / z / y); one E action each, added once
  dormDoors() {
    if (this._dormDoors) return this._dormDoors;
    const g = this.g,
      L = g.interiors?.lixing;
    if (!L?.rooms || !L.W) return [];
    this._dormDoors = DORM_ROOMS.map((no) => {
      const R = L.rooms[no];
      if (!R?.door) return null;
      const [x, z] = L.W(R.door[0], R.door[1] - 1.5);
      return { no, x, z, y: L.B + R.y, name: `${no} 寢` };
    }).filter(Boolean);
    for (const d of this._dormDoors)
      g.interiors.actions.push({
        x: d.x,
        z: d.z,
        r: 1.5,
        y: d.y - surfaceAt(d.x, d.z),
        cond: () => this.step?.dorm && !this.dormVisited(d.no) && !g.hud.inDialog,
        label: () => `按 <kbd>E</kbd> 在 ${d.no} 寢門口拉票`,
        fn: () => this.canvassDorm(d.no),
      });
    return this._dormDoors;
  }
  dormVisited(no) {
    return this.rewarded.has(`m6:${no}`);
  }
  get dormLeft() {
    return this.dormDoors().filter((d) => !this.dormVisited(d.no));
  }
  // knock on one door: a line from the room, +2 votes, then the objective / markers follow
  canvassDorm(no) {
    const g = this.g;
    if (!this.step?.dorm || this.dormVisited(no)) return;
    g.dialog(DORM_LINES[no] || [['彥霖', `${no} 寢晚安，明天記得投彥霖！`]], () => {
      if (!this.once(`m6:${no}`)) return;
      g.addVotes(2, `力行 ${no} 寢 +2 票`);
      g.audio.checkpoint?.();
      this._dormRefresh();
    });
  }
  _dormRefresh() {
    const s = this.step;
    if (!s?.dorm) return;
    const all = this.dormDoors(),
      left = this.dormLeft;
    this.markers = left.map((d) => ({ x: d.x, z: d.z, big: true, icon: '🚪' }));
    this.g.setBeam(left[0] || null, 1.5, left.slice(1));
    this.g.hud.setObjective(
      s.title,
      `到力行宿舍（男生宿舍）二樓，在每間寢室門口按 <kbd>E</kbd> 拉票：<b>${all.length - left.length} / ${all.length}</b>${left.length ? `　（還沒拜訪：${left.map((d) => d.no).join('、')}）` : ''}`
    );
  }
  fail(reason, retry) {
    this.exit(`${reason}這一小節先退出，進度沒有保存。回到 ▶ 任務起點，用手機「任務」App 繼續`);
  }
  update(dt) {
    const s = this.step;
    if (!s || this.g.hud.inDialog) return;
    const p = this.g.player.worldPos();
    if (this.timer !== null) {
      const sec = Math.ceil(this.timer);
      this.timer -= dt;
      this.g.hud.setTimer(this.timer);
      if (this.timer > 0 && this.timer <= 10 && Math.ceil(this.timer) !== sec)
        this.g.audio.tick(this.timer <= 5);
      if (this.timer <= 0) {
        const f = s.onFail;
        this.timer = null;
        f ? f() : this.fail('時間到了！');
        return;
      }
    }
    if (s.type === 'goto') {
      if (Math.hypot(p.x - s.target.x, p.z - s.target.z) < s.radius) {
        this.step = null;
        this.g.setBeam(null);
        this.markers = [];
        this.g.audio.checkpoint();
        s.onArrive();
      }
    } else if (s.type === 'cps') {
      for (const c of s.list) {
        if (c.hit) continue;
        if (s.ordered && c !== s.list.find((q) => !q.hit)) continue;
        if (Math.hypot(p.x - c.x, p.z - c.z) < s.radius) {
          c.hit = true;
          this.g.audio.checkpoint();
          s.onCp && s.onCp(c);
          if (s.list.every((q) => q.hit)) {
            this.step = null;
            this.timer = null;
            this.g.hud.setTimer(null);
            this.g.setBeam(null);
            this.markers = [];
            s.onDone();
            return;
          }
          this._refreshCps();
        }
      }
    } else if (s.type === 'until') {
      s.t += dt;
      s.opt.tick?.(s.t, s);
      if (s.test()) {
        this.step = null;
        this.markers = [];
        this.g.setBeam(null);
        this.g.audio.checkpoint();
        s.onDone();
      }
    } else if (s.type === 'votes') {
      // only flyers handed out count (not golden ballots, guardhouse, etc.)
      const got = (this.g.flyerVotes || 0) - s.base;
      if (got !== s.shown) {
        s.shown = got;
        this.g.hud.setObjective(
          s.title,
          `對路上的同學按 <kbd>滑鼠左鍵</kbd> 發傳單拉票：<b>${Math.min(got, s.need)} / ${s.need}</b> 票`
        );
      }
      if (got >= s.need) {
        this.step = null;
        this.g.audio.checkpoint();
        s.onDone();
      }
    }
  }
}

// ---------------- story ----------------
Missions.prototype.steps = [
  // 0 — intro at the old gate
  function () {
    const g = this.g,
      P = this.P;
    this.spawnNpcs(0);
    g.hud.setObjective('序章 · 投票前一天', '和 <b>M.O.N.D.A.Y</b> 對話');
    this.talk(
      [
        [
          MONDAY,
          '早安，彥霖。我是你的競選總幹事 AI —— M.O.N.D.A.Y。明天就是 <第34屆資管系會長> 投票日，今天是最後衝刺：從早上拉票到晚上的政見發表會。',
        ],
        ['彥霖', '放心，我準備好了 ✌'],
        [
          MONDAY,
          '競選團隊一早就在資訊管理學系館集合。系館在二一鐘塔的東邊，路線已標在地圖上的黃色★。',
        ],
        [MONDAY, '操作提示：按 [[M|View]] 打開大地圖；路邊的機車走過去按 [[F|B]] 就能騎。'],
      ],
      () => {
        g.player.setPose('peace', 1.5);
        this.goto(P.im, '序章 · 投票前一天', '前往 <b>資訊管理學系館</b>', () => this.next(), 9);
      }
    );
  },
  // 1 — flyers to bulletin boards (timed, any order)
  function () {
    const g = this.g,
      P = this.P;
    this.spawnNpcs(1);
    g.bringMyScooter(P.im.x, P.im.z);
    this.talk(
      [
        [
          WEDNESDAY,
          '偵測到候選人抵達。我是系館駐點 AI —— W.E.D.N.E.S.D.A.Y。傳單一早剛印好，還熱熱的。',
        ],
        [
          WEDNESDAY,
          '任務：把傳單送到 5 個公布欄 —— 圖書館、學生活動中心、全人教育村、體育館、良善樓宿舍。',
        ],
        [WEDNESDAY, '限時 3 分鐘！你的 JET SL 我已經遠端調度到系館前面了，騎它比較快 🛵'],
      ],
      () => {
        const cps = P.flyers;
        this.checkpoints(
          cps,
          '任務一 · 傳單大作戰',
          (n, t, left) =>
            `把傳單送到公布欄：<b>${n}/${t}</b>　（${left.map((l) => l.name).join('、')}）`,
          180,
          false,
          (c) => {
            if (this.once(`m1:${this.step.list.indexOf(c)}`))
              g.addVotes(3, `${c.name} 公布欄 +3 票`);
          },
          () => {
            g.hud.bigToast('任務完成！', '傳單全部貼好了');
            g.audio.fanfare();
            this.g.after(
              () =>
                this.goto(
                  P.im,
                  '任務一 · 傳單大作戰',
                  '回到 <b>資訊管理學系館</b> 回報',
                  () => this.next(),
                  9
                ),
              1200
            );
          }
        );
      }
    );
  },
  // 2 — breakfast run (the breakfast shops on the 中原夜市 street)
  function () {
    const g = this.g,
      P = this.P;
    this.talk(
      [
        [WEDNESDAY, '傳單全數送達，效率超出預期！不過團隊成員一大早就來幫忙，到現在都還沒吃早餐…'],
        [MONDAY, '彥霖，請幫大家去中原夜市那條街的早餐店買蛋餅跟豆漿。'],
        [WEDNESDAY, '根據計算，蛋餅 2 分鐘後就會冷掉。限時 2 分鐘來回！'],
      ],
      () => {
        this.timer = 120;
        this.goto(
          P.market,
          '任務二 · 早餐補給',
          '騎去 <b>中原夜市</b> 那條街買蛋餅和豆漿',
          () => {
            g.hud.toast('🥞 蛋餅 ×6、🥛 豆漿 ×6 買到了！', 'good', 2500);
            this.timer = Math.max(this.timer, 60);
            this.goto(
              P.im,
              '任務二 · 早餐補給',
              '趁熱把早餐送回 <b>資訊管理學系館</b>',
              () => {
                this.timer = null;
                g.hud.setTimer(null);
                g.addVotes(5, '幹部士氣大增 +5 票');
                g.hud.bigToast('任務完成！', '蛋餅還是熱的 🥞');
                g.audio.fanfare();
                this.g.after(() => this.next(), 1500);
              },
              9
            );
          },
          12
        );
        this.step.onFail = null;
      }
    );
  },
  // 3 — street canvassing
  function () {
    const g = this.g;
    this.talk(
      [
        [WEDNESDAY, '團隊能量已補滿，該去拉票了！'],
        [
          MONDAY,
          '去路上找同學聊聊，對他們按 [[滑鼠左鍵|X]]（手機按 📄）遞傳單。目標：再拿 15 票！',
        ],
        [MONDAY, '安全提醒：騎車撞到同學會掉票 😅'],
      ],
      () => {
        this._title = '任務三 · 掃街拉票';
        this.sub++;
        this._mark();
        this.step = {
          type: 'votes',
          base: g.flyerVotes || 0,
          need: 15,
          title: '任務三 · 掃街拉票',
          onDone: () => {
            g.hud.bigToast('任務完成！', '大家都認識彥霖了');
            g.audio.fanfare();
            this.g.after(() => this.next(), 1500);
          },
        };
      }
    );
  },
  // 4 — banner race (ordered)
  function () {
    const g = this.g,
      P = this.P;
    this.talk(
      [
        [MONDAY, '警報！校園各處的競選布條訊號中斷 —— 有人把我們的布條拆掉了！'],
        [MONDAY, '依照順序騎去 6 個地點把布條掛回去，限時 120 秒！'],
        ['彥霖', '交給我，衝了 🛵💨'],
      ],
      () => {
        const cps = [P.tower, P.history, P.lib, P.gym, P.village, P.mgmt].filter(Boolean);
        this.checkpoints(
          cps,
          '任務四 · 布條保衛戰',
          (n, t, left) => `依序掛回布條：<b>${n}/${t}</b>　下一站：${left[0] ? left[0].name : ''}`,
          120,
          true,
          (c) => {
            if (this.once(`m4:${this.step.list.indexOf(c)}`)) {
              g.addVotes(2, `布條掛好了 +2 票`);
              g.world.addBoard(c.x + 3, c.z + 3, Math.random() * 6.28, 0.7);
            }
          },
          () => {
            g.hud.bigToast('任務完成！', '布條全部掛回去了');
            g.audio.fanfare();
            this.g.after(() => this.next(), 1500);
          }
        );
      }
    );
  },
  // 5 — 布條失竊案: who tore the banners down? Find 彥霖's old room (中北路, above 孫師傅牛肉拉麵) from a clue,
  // then crack the case with SQL on its computer (terminal `case`, src/systems/minigames/Detective.js), then the confrontation.
  function () {
    const g = this.g,
      D = g.detective;
    this.talk(
      [
        [MONDAY, '布條已全部恢復。但到底是誰拆的？不查清楚，明天投票前還會出事。'],
        [
          WEDNESDAY,
          '系學會以前辦活動對帳，存過一份「校園紀錄」備份：路口監視器的車牌、門禁刷卡、超商發票都有。',
        ],
        [
          WEDNESDAY,
          '那份備份是離線的，只在彥霖以前那台舊電腦裡，就放在你以前住的地方。我連不進去。',
        ],
        [MONDAY, '我的資料庫只剩部分紀錄：在 <中北路> 上，樓下是一間 <牛肉拉麵店>。'],
        ['彥霖', '……自己住過的地方我當然記得（應該吧）。我回去用電腦查！'],
      ],
      () => {
        const yh = g.interiors.yh,
          d = yh ? yh.door : [g.player.pos.x, g.player.pos.z];
        const inside = () =>
          !g.player.vehicle &&
          g.interiors.zoneAt(g.player.pos.x, g.player.pos.z, g.player.y)?.name ===
            '彥霖以前住的地方';
        // the computer part: sit at the desk and solve the case in the terminal
        const useComputer = (opt = {}) =>
          this.until(
            '任務五 · 布條失竊案',
            '坐到書桌前按 <kbd>E</kbd> 使用電腦，打開 <b>終端機</b> 輸入 <code>case</code>，用 SQL 找出拆布條的人',
            () => D.solved('banner') && !g.pc.isOpen,
            () => {
              this.talk(
                [
                  ['彥霖', 'M.O.N.D.A.Y，我查到了！是資管系二年級的 小明。'],
                  [
                    '彥霖',
                    '他中午先去全家買了美工刀跟大垃圾袋，騎著 MKZ-893 繞校園一圈，把 6 條布條一條一條割下來，最後還發文說「任務完成」。',
                  ],
                  [MONDAY, '……已通知 W.E.D.N.E.S.D.A.Y，請他在系館把人留下來。'],
                  [
                    '小明',
                    '對不起……我只是想幫小華學姊，一時衝動就做了。布條都收在系館的櫃子裡，沒有弄壞。',
                  ],
                  ['小華', '小明，要贏也要贏得光明正大。彥霖，真的很抱歉，我會陪他把事情處理好。'],
                  ['彥霖', '沒關係，明天我們就公平地比一場吧 ✌'],
                  [
                    MONDAY,
                    '真相大白！社群聲量分析：大家都在討論你怎麼用資料庫破案的，風向整個站到我們這邊了！',
                  ],
                ],
                () => {
                  if (this.once('m5:solved')) g.addVotes(8, '真相大白 +8 票');
                  g.hud.bigToast('任務完成！', '布條失竊案 破案 🕵️');
                  g.audio.fanfare();
                  g.hud.toast('🕵️ 電腦的「案件檔案」解鎖了兩個支線小案子', 'good', 3200);
                  this.g.after(() => this.next(), 1500);
                }
              );
            },
            opt
          );
        // been there before (walked in on your own): no search, straight to the computer
        if (this.homeFound) {
          this.sub++; // the skipped search still counts as a section, so saved sections line up
          this.talk(
            [
              ['彥霖', '等等，中北路那間牛肉拉麵樓上……我前陣子才自己回去過一趟！'],
              [
                MONDAY,
                '確認：你先前已經找到彥霖以前住的地方，地圖上有標 🏠。跳過搜尋，直接回去用電腦。',
              ],
            ],
            () =>
              useComputer({
                markers: [{ x: d[0], z: d[1], big: true, icon: '★' }],
                beam: { x: d[0], z: d[1] },
                radius: 6,
              })
          );
          return;
        }
        // a search area on the map (not centred on the house), the exact ★ only after a while
        const area = {
          x: d[0] + 38,
          z: d[1] - 30,
          area: 95,
          color: 'rgba(255,143,177,.22)',
          stroke: '#ff8fb1',
        };
        this.hideHome = true;
        this.until(
          '任務五 · 布條失竊案',
          '回到 <b>彥霖以前住的地方</b>：在 <b>中北路</b> 上，樓下是一間 <b>牛肉拉麵店</b>（地圖上粉紅色的範圍）',
          inside,
          () => {
            this.hideHome = false;
            this.homeFound = true;
            g.hud.toast('🏠 回到以前住的地方了，電腦在書桌上', 'good', 2600);
            useComputer();
          },
          {
            markers: [
              {
                x: area.x,
                z: area.z,
                area: area.area,
                color: area.color,
                stroke: area.stroke,
                icon: '?',
              },
            ],
            // after 2.5 minutes M.O.N.D.A.Y sends the exact place
            tick: (t, step) => {
              if (step.hinted || t < 150) return;
              step.hinted = true;
              this.markers = [{ x: d[0], z: d[1], big: true, icon: '★' }];
              this.g.setBeam({ x: d[0], z: d[1] }, 6);
              this.hideHome = false;
              g.hud.toast(
                '📡 M.O.N.D.A.Y：「定位完成，是 孫師傅牛肉拉麵 樓上！已標在地圖上」',
                'good',
                3600
              );
            },
          }
        );
      }
    );
  },
  // 6 — 宿舍拉票: knock on the six open rooms of 力行宿舍 (the boys' dorm), 2F 276～281, one E at each door
  // (dormDoors / canvassDorm above). Rooms already visited stay visited (rewarded), so a reload or a pause
  // carries on with the rest. At the end a note: go walk round the dorms more and meet people.
  function () {
    const g = this.g,
      title = '任務六 · 宿舍拉票';
    this.talk(
      [
        [MONDAY, '破案的消息已經傳開了。離晚上的政見發表會還有一點時間，再衝一波！'],
        [
          WEDNESDAY,
          '數據顯示：住宿生的投票率很高，但力行宿舍（男生宿舍）二樓 276～281 這幾間，還沒有人去拜過票。',
        ],
        ['彥霖', '276 就是我自己的寢室欸，從自己家開始拜 ✌'],
        [MONDAY, '到二樓走廊，在每間寢室門口按 [[E|A]] 打聲招呼。六間都拜訪完就完成。'],
      ],
      () => {
        const doors = this.dormDoors(),
          gate = this._dormGate();
        this.until(
          title,
          '到 <b>力行宿舍</b>（男生宿舍）二樓，在 276～281 每間寢室門口按 <kbd>E</kbd> 拉票',
          () => this.dormLeft.length === 0,
          () => {
            if (this.once('m6:done')) g.addVotes(5, '宿舍拉票完成 +5 票');
            g.hud.bigToast('任務完成！', '力行 276～281 都拜訪完了 🚪');
            g.audio.fanfare();
            g.dialog(
              [
                ['彥霖', '六間都拜完了！原來隔壁幾間住了這麼多有趣的人。'],
                [MONDAY, '紀錄：今天在宿舍認識的同學，比過去一整個學期還多。'],
                [MONDAY, `📝 註記：${DORM_NOTE}`],
              ],
              () => {
                g.hud.toast(`📝 ${DORM_NOTE}`, 'good', 4200);
                this.g.after(() => this.next(), 1500);
              }
            );
          },
          {
            markers: doors.map((d) => ({ x: d.x, z: d.z, big: true, icon: '🚪' })),
            beam: doors[0] || null,
            radius: 1.5,
            nav: gate || doors[0] || null,
          }
        );
        if (this.step) {
          this.step.dorm = true;
          this.step.title = title;
          this._dormRefresh();
        }
      }
    );
  },
  // 7 — platform speech at the Student Activity Center
  function () {
    const g = this.g,
      P = this.P;
    this.talk(
      [
        [MONDAY, '忙了一整天，晚上 7 點的政見發表會要開始了！'],
        [MONDAY, '大家都在 學生活動中心 等你，路線已設定，快過去！'],
      ],
      () => {
        this.goto(
          P.sac,
          '終章 · 政見發表會',
          '前往 <b>學生活動中心</b> 參加政見發表會',
          () => {
            g.startSpeech(P.sac, () => this.next());
          },
          9
        );
      }
    );
  },
  // 8 — ending
  function () {
    this.done = true;
    this.g.showEnding();
  },
];
