// S.U.N.D.A.Y（名字前面有一個 AI 小圖示）：主線任務進行時，畫面右下角的小助手。
// 她的樣子是一個會轉的金色全息圓圈（src/graphics/HoloRing.js；M.O.N.D.A.Y、W.E.D.N.E.S.D.A.Y 是同一套，顏色不同）。按 J（或點她）打開提示，再按一次（或再點她）收起來；
// 泡泡裡的「‹ 上一則」「下一則 ›」切換提示（打開時也可以按 , 和 . 鍵）。
// 提示全部是寫好的（不是 AI），依「第幾個任務、任務裡的第幾個目標、對話看完了沒」切換；換到新階段時頭上會冒出「!」。
// 只在主線進行中出現；自由探索、結局、用手機／大地圖、打工、站崗、比賽時都會收起來。
// 用電腦時她搬到電腦畫面的右下角：終端機在偵探模式（SQL 查案）時給那個案件的提示（含支線案件），
// 沒在查案時給主線提示，或提醒還有案件沒破；電腦裡只能用滑鼠點她（J 會打進終端機）。

import { HoloRingView } from '../../graphics/HoloRing.js';

// hints for mission idx (src/systems/MissionSystem.js), given the mission state; each returns a list shown one by one
const HINTS = [
  // 0 序章
  (M) =>
    !M.talked
      ? ['先跟 <b>M.O.N.D.A.Y</b> 把話說完（按 <kbd>E</kbd> 或 <kbd>Enter</kbd> 繼續）。']
      : [
          '資訊管理學系館在 <b>二一鐘塔的東邊</b>，跟著地圖上的黃色 <b>★</b> 走就對了。',
          '按 <kbd>M</kbd> 打開大地圖，可以看到 ★ 在哪裡；點地圖還能插導航旗。',
          '路邊的機車走過去按 <kbd>F</kbd> 就能騎，比走路快很多喔 🛵',
        ],
  // 1 傳單大作戰
  (M) =>
    !M.talked
      ? ['W.E.D.N.E.S.D.A.Y 在交代任務，先聽它說完。']
      : M.sub > 1
        ? ['傳單都送完了！回到 <b>資訊管理學系館</b> 跟 W.E.D.N.E.S.D.A.Y 回報。']
        : [
            '5 個公布欄 <b>不用照順序</b>，地圖上的 📄 就是還沒送的公布欄。',
            '只有 3 分鐘，騎你的 <b>JAT SM</b>（W.E.D.N.E.S.D.A.Y 幫你調度到系館前面了）。',
            '先跑離你最近的那個，再一路往下一個最近的清掉，最省時間。',
            '時間到也沒關係，任務會重新開始；已經拿過的票不會被扣回去。',
          ],
  // 2 食字路口
  (M) =>
    !M.talked
      ? ['大家還沒吃東西，先聽 M.O.N.D.A.Y 說完。']
      : M.sub > 1
        ? ['點心買到了！趁熱送回 <b>資訊管理學系館</b>，冷掉就不好吃了 🍡']
        : [
            '採買點在 <b>夜市的十字路口</b>，路口畫著一大塊 <b>黃色網狀線</b>；導航已經自動設好，跟著路線或 ★ 騎過去。',
            '限時 2 分鐘來回。買到點心的時候，剩下的時間至少會補到 60 秒。',
            '騎快一點沒關係，但撞到路人會掉票，轉彎記得減速。',
          ],
  // 3 掃街拉票
  (M) =>
    !M.talked
      ? ['M.O.N.D.A.Y 在說明怎麼拉票，先聽它說完。']
      : [
          '走到同學旁邊按 <kbd>滑鼠左鍵</kbd>（手機按 📄）遞傳單，目標再拿 <b>15 票</b>。',
          '人多的地方比較好拉票：學生活動中心、圖書館前、校門口附近。',
          '騎車撞到同學會掉票，下車用走的發傳單比較穩。',
        ],
  // 4 布條保衛戰
  (M) =>
    !M.talked
      ? ['布條被拆了！先聽 M.O.N.D.A.Y 說要怎麼辦。']
      : [
          '這次 <b>要照順序</b>：地圖上的數字就是順序，下一站會有光柱。',
          '只有 120 秒，一定要騎車。到了光柱裡面就算掛好了。',
          '失敗也沒關係，會從頭再來，已經掛好拿到的票不會重複給。',
        ],
  // 5 布條失竊案
  (M, g) => {
    if (!M.talked) return ['大家在討論是誰拆的布條，先把對話看完。'];
    if (M.sub <= 1)
      return [
        '線索是：在 <b>中北路</b> 上，樓下是一間 <b>牛肉拉麵店</b>。在地圖上粉紅色的範圍裡找。',
        '注意看店家的招牌，找一間 <b>紅色招牌的牛肉拉麵店</b>，從旁邊的樓梯上二樓。',
        '真的找不到也別急，過一下子 M.O.N.D.A.Y 會定位出來標給你。',
      ];
    if (g.detective?.solved('banner'))
      return ['已經破案了！按 <kbd>Esc</kbd> 關掉電腦，回去跟 M.O.N.D.A.Y 說。'];
    return [
      '上到二樓，坐到書桌前按 <kbd>E</kbd> 使用電腦，打開 <b>終端機</b> 輸入 <code>case</code>。',
      '不知道從哪裡下手？先看桌面上的 <b>🕵️ 案件檔案</b>，或在終端機輸入 <code>hint</code>。',
      '查案的順序可以是：布條被拆的時間 → 監視器拍到的車 → 車牌對到哪些學生 → 誰買了美工刀 → 誰有不在場證明。',
      '證據找齊了再 <code>accuse 名字</code>；不熟 SQL 的話，桌面上的 🎓 資管學堂有 MySQL 入門。',
    ];
  },
  // 6 宿舍拉票
  (M) =>
    !M.talked
      ? ['M.O.N.D.A.Y 和 W.E.D.N.E.S.D.A.Y 在說明要去哪裡拉票，先聽它們說完。']
      : [
          '<b>力行宿舍</b>（男生宿舍）在新中北路旁，從一樓大門進去，上到 <b>二樓</b>。',
          '276～281 在二樓南邊的走廊，地圖上的 🚪 就是還沒拜訪的寢室門口，<b>不用照順序</b>。',
          '走到門口按 <kbd>E</kbd> 打招呼，每間一次；拜訪過的寢室就算中途暫停也會記得。',
        ],
  // 7 政見發表會
  (M) =>
    !M.talked
      ? ['發表會要開始了，先聽 M.O.N.D.A.Y 說。']
      : ['前往 <b>學生活動中心</b>，跟著地圖上的 ★ 走。', '到了之後演講會自動開始，好好表現 ✌'],
];

// the little AI chip in front of the name: a sparkle and "AI"
const AI_ICON = `<span class="sd-ai" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M8 1.5l1.6 4.3 4.4 1.7-4.4 1.7L8 13.5 6.4 9.2 2 7.5l4.4-1.7z" fill="#fff"/><path d="M13 1l.6 1.5L15 3l-1.4.5L13 5l-.6-1.5L11 3l1.4-.5z" fill="#fff" opacity=".85"/></svg>AI</span>`;
const NAME = 'S.U.N.D.A.Y';

export class Sunday {
  constructor(game) {
    this.g = game;
    this.key = '';
    this.i = 0;
    this.open = false;
    this.fresh = false;
    const el = (this.el = document.createElement('div'));
    el.id = 'sunday';
    el.className = 'hidden';
    el.innerHTML = `<div class="sd-bubble hidden"><div class="sd-head">${AI_ICON}<b>${NAME}</b><span class="sd-n"></span></div>
      <div class="sd-text"></div><div class="sd-foot"><button class="sd-prev">‹ 上一則</button><span class="sd-key"><kbd>,</kbd> <kbd>.</kbd> 切換・<kbd>J</kbd> 收起</span><button class="sd-next">下一則 ›</button></div></div>
      <button class="sd-btn" title="${NAME} 小助手：按 J 打開／收起提示"><span class="sd-ring"></span><span class="sd-bang">!</span><span class="sd-tag">${AI_ICON}${NAME} <kbd>J</kbd></span></button>`;
    this.ring = new HoloRingView(NAME, 104);
    el.querySelector('.sd-ring').appendChild(this.ring.canvas);
    document.getElementById('hud').appendChild(el);
    // the clicks must not reach the game (pointer lock / hand out a flyer)
    for (const ev of ['pointerdown', 'mousedown', 'touchstart'])
      el.addEventListener(ev, (e) => e.stopPropagation());
    el.querySelector('.sd-btn').onclick = (e) => {
      e.stopPropagation();
      this.toggle();
    };
    el.querySelector('.sd-next').onclick = (e) => {
      e.stopPropagation();
      this.step(1);
    };
    el.querySelector('.sd-prev').onclick = (e) => {
      e.stopPropagation();
      this.step(-1);
    };
  }
  // the hints for where the story is right now (empty when Sunday has nothing to say)
  hints() {
    const M = this.g.missions;
    if (!M || M.done || M.free || M.idx < 0) return [];
    if (M.exited)
      return [
        '任務先暫停了，這一小節的進度沒有保存。',
        '回到地圖上 <b>▶</b> 的任務起點（這一小節開始的地方），打開手機的 <b>任務</b> App 按「▶ 繼續任務」，會從這一小節重新開始（計時也重來）。',
      ];
    const f = HINTS[M.idx];
    return f ? f(M, this.g) : [];
  }
  // on the PC: the open case's hints (SQL detective mode), else the story's, else a nudge to the unsolved cases
  pcHints() {
    const g = this.g,
      D = g.detective,
      t = g.pc?.wins?.term;
    const c = t?.caseMode?.() ? D?.cur : null;
    if (c) {
      if (D.solved(c.id))
        return [
          c.id === 'jianyu'
            ? '破案了！按 <kbd>Esc</kbd> 關掉電腦，回去 278 跟劍玉說一聲。'
            : c.id === 'banner'
              ? '已經破案了！按 <kbd>Esc</kbd> 關掉電腦，回去跟 M.O.N.D.A.Y 說。'
              : '這個案子破了！輸入 <code>cases</code> 看看還有沒有別的案子。',
        ];
      return [
        '不知道從哪開始？輸入 <code>tables</code> 看有哪些資料表、<code>schema 表名</code> 看欄位，<code>notes</code> 看已經找到的線索。',
        ...(c.hints || []),
        '證據找齊了再輸入 <code>accuse 名字</code> 指認；卡住了也可以輸入 <code>hint</code>。',
        '不會 SQL 也沒關係：按終端機右上角的 <b>🎬 一鍵通關</b>，我一步一步播給你看，順便教你每一行在做什麼。',
      ];
    }
    const story = this.hints();
    if (story.length) return story;
    const open = D?.available?.().filter((x) => !D.solved(x.id)) || [];
    if (open.length)
      return [
        `還有案件沒破：${open.map((x) => `${x.icon} ${x.title}`).join('、')}。打開 <b>終端機</b> 輸入 <code>case</code> 進入偵探模式。`,
        '桌面上的 <b>🕵️ 案件檔案</b> 可以先看案情簡報和資料表。',
      ];
    return [];
  }
  get stage() {
    const M = this.g.missions,
      ex = M.exited ? 'x' : '',
      pc = this.g.pc?.isOpen,
      c = pc && this.g.pc.wins?.term?.caseMode?.() ? this.g.detective?.cur : null;
    return `${ex}${M.idx}:${M.sub}:${M.talked ? 1 : 0}:${this.g.detective?.solved('banner') ? 1 : 0}:${pc ? 'pc' : ''}:${c ? c.id + (this.g.detective.solved(c.id) ? '!' : '') : ''}`;
  }
  // J / the avatar: one button opens and closes the bubble
  list() {
    return this.g.pc?.isOpen ? this.pcHints() : this.hints();
  }
  toggle() {
    const list = this.list();
    if (!list.length) return;
    this.open = !this.open;
    this.fresh = false;
    this.render(list);
    this.g.audio?.blip?.();
  }
  press() {
    this.toggle();
  }
  // ‹ / › (and the , . keys while open): previous / next hint, wrapping round
  step(d) {
    const list = this.list();
    if (!list.length || !this.open) return;
    this.i = (((this.i + d) % list.length) + list.length) % list.length;
    this.render(list);
    this.g.audio?.blip?.();
  }
  close() {
    this.open = false;
    this.render(this.list());
  }
  render(list) {
    const el = this.el,
      b = el.querySelector('.sd-bubble');
    b.classList.toggle('hidden', !this.open || !list.length);
    el.querySelector('.sd-bang').classList.toggle('hidden', !this.fresh);
    if (!this.open || !list.length) return;
    const i = this.i % list.length;
    el.querySelector('.sd-text').innerHTML = list[i];
    el.querySelector('.sd-n').textContent = `提示 ${i + 1} / ${list.length}`;
    el.querySelector('.sd-foot').classList.toggle('hidden', list.length < 2);
  }
  // every frame (src/core/Game.js): show / hide, new stage -> back to hint 1 with a "!", J key
  update(inp) {
    const g = this.g;
    const pc = !!g.pc?.isOpen;
    // where she sits: on the PC screen while the computer is open, otherwise in the HUD
    const host = pc ? g.pc.el : document.getElementById('hud');
    if (host && this.el.parentNode !== host) host.appendChild(this.el);
    if (pc) {
      const list = g.state === 'play' ? this.pcHints() : [];
      this.el.classList.toggle('hidden', !list.length);
      if (!list.length) return;
      const k = this.stage;
      if (k !== this.key) {
        this.key = k;
        this.i = 0;
        this.open = false;
        this.fresh = true;
        this.render(list);
      } else if (this.open && this._n !== list.length) this.render(list);
      this._n = list.length;
      return; // (no J here: it would be typed into the terminal; click her instead)
    }
    const busy =
      g.state !== 'play' ||
      g.hud.inDialog ||
      g.hud.bigOpen ||
      g.phone?.open ||
      g.videoOpen ||
      g.job?.active ||
      g.gate?.active ||
      g.race?.active ||
      g.wardrobe?.isOpen ||
      g.airdrop?.cinema ||
      g.drone?.active ||
      g.mingshan?.cinema ||
      g.speechOn ||
      g._sleeping;
    const list = busy ? [] : this.hints();
    const show = list.length > 0;
    this.el.classList.toggle('hidden', !show);
    if (!show) return;
    const k = this.stage;
    if (k !== this.key) {
      this.key = k;
      this.i = 0;
      this.open = false;
      this.fresh = true;
      this.render(list);
    }
    if (inp?.hit('KeyJ')) this.toggle();
    if (this.open && inp?.hit('Comma')) this.step(-1);
    if (this.open && inp?.hit('Period')) this.step(1);
  }
}
