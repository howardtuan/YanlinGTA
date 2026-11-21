// 可以在校園裡認識、聊完再決定要不要加好友的同學。
// 加了好友：i-Piyan「訊息」多一個聊天室（js/chats.js 的 FRIEND_CONTACTS），Peachgram 看得到他的貼文與限時動態。
// 好友名單會存檔（save.js 的 friends）。
import { makeMissionNpc } from './npc.js';
import { FRIEND_CONTACTS } from './chats.js';
import { FRIEND_POSTS } from './feeds.js';

// 排球少年 吱吱：資管系體保生，跟彥霖同屆。站在體育館南側入口（橘色雨遮）前面。
// like the photo: 平頭, black leather biker jacket over a black tee, dark trousers, thick straight brows, serious mouth
const GD_LOOK = { skin: '#ecc8a8', shirt: '#242424', jacket: '#121212', shorts: '#1d1e24', pants: true, hair: '#34302c', hairStyle: 'buzz', brows: 'thick', mouth: 'flat', jaw: 1.02, chin: 0.75, build: 1.04, glasses: false, shoes: '#141414', face: true };
const ZZ_LOOK = { skin: '#f0cfb0', shirt: '#7a1f2c', shorts: '#161616', pants: false, hair: '#b8502a', hairStyle: 'short', glasses: false, shoes: '#1d1d1d', sock: '#f2f2f2', face: true };

export const FRIENDS = {
  zz: {
    name: '排球少年 吱吱', short: '吱吱', look: ZZ_LOOK,
    // 體育館南牆西段的入口雨遮（map.js entrance_canopy）旁、體育館與游泳池之間的走道，面向走道西口
    spot: { x: -39.5, z: -182.2, h: -Math.PI / 2 },
    intro: [
      ['吱吱', '欸！彥霖！你怎麼跑來體育館？'],
      ['彥霖', '來拉票啊～你剛練完球？'],
      ['吱吱', '對啊，剛練完攻擊，今天跳發超順 🏐'],
      ['彥霖', '體保生就是不一樣。等等還要去健身房？'],
      ['吱吱', '當然，今天練腿 🦵 練完回宿舍打排位，晚上缺一個要不要？'],
      ['彥霖', '選舉忙完一定陪你打！'],
      ['吱吱', '好啦，同屆的挺你，系排那邊我幫你拉票。欸，我們好像還沒互加耶？'],
    ],
    again: [
      ['吱吱', '又是你！想好了嗎？要不要互加？'],
    ],
    yes: [['吱吱', '加到了！有空來體育館找我打球，晚上排位也揪你 🎮']],
    no: [['吱吱', '好喔，想加再來找我，我常在體育館這邊練球。']],
    chat: [ // after you are friends: a random line each time you talk
      [['吱吱', '今天練跳發 100 顆，肩膀在燒 🔥']],
      [['吱吱', '腿日剛結束，走路有點抖哈哈']],
      [['吱吱', '系排的都說要投你啦，放心 🗳️']],
      [['吱吱', '晚上 10 點排位，記得上線 🎮']],
      [['吱吱', '體保生也是要交報告的……救我']],
    ],
    // 在正門外的茶學苑打工時（js/teashop.js）說的話
    shop: {
      intro: [
        ['吱吱', '歡迎光臨茶學苑～欸？彥霖！'],
        ['彥霖', '吱吱？你在這裡打工喔！'],
        ['吱吱', '對啊，練完球來搖飲料，順便練手臂 💪'],
        ['彥霖', '體保生還要打工，也太猛'],
        ['吱吱', '同屆的挺你，系排那邊我幫你拉票。欸，我們好像還沒互加耶？'],
      ],
      again: [['吱吱', '又是你！想好了嗎？要不要互加？']],
      chat: [
        [['吱吱', '搖雪克杯也是重訓，今天搖了兩百杯 🔥']],
        [['吱吱', '剛剛好幾個客人說要投你，我有幫你講好話'], ['彥霖', '感謝吱吱 🙏']],
        [['吱吱', '偷偷推薦你冬瓜檸檬，練完球喝超爽']],
        [['吱吱', '下班要去健身房，練完回宿舍打排位 🎮']],
        [['吱吱', '店長說我搖的最均勻，跟我的托球一樣穩 🏐']],
      ],
    },
  },
  // 戈登肉鋪店長 女拳大帝：火爆、愛健身、打 LOL 很在意輸贏、超愛麥當勞。站在櫃台後面（js/interiors.js 的
  // buildGordon 給位置）；跟他說話、結帳都在櫃台（js/gordon.js），結完帳還不是好友的話他會問要不要互加。
  gd: {
    name: '戈登肉鋪店長 女拳大帝', short: '女拳大帝', look: GD_LOOK, noTalk: true,
    spot: (g) => g.interiors.gordon?.keeper,
    offer: [
      ['女拳大帝', '欸，等一下。你是那個在選系會長的彥霖吧？'],
      ['女拳大帝', '我 LOL 鑽石，健身也沒在輸。最近缺一個打積分的……'],
      ['女拳大帝', '加個好友啦，先說好：輸了不准怪我，掛機我就封鎖你 😤'],
    ],
    yes: [['女拳大帝', '好！今晚 10 點上線，遲到一分鐘請我吃麥當勞 🍔🎮']],
    no: [['女拳大帝', '嘖，不加就算了。下次來買肉再問你一次！']],
    chat: [],
  },
};

export class Friends {
  constructor(game) {
    this.g = game; this.added = new Set(); this.npcs = {};
    for (const [id, f] of Object.entries(FRIENDS)) {
      const sp = typeof f.spot === 'function' ? f.spot(game) : f.spot; if (!sp) continue;
      const n = makeMissionNpc(game.scene, f.look, f.name, sp.x, sp.z, sp.h);
      if (sp.y != null) n.ch.root.position.y = sp.y; // indoors: stands on the shop floor
      game.npcs.push(n); this.npcs[id] = n;
      if (f.noTalk) continue; // someone else (a shop counter) handles talking to them
      game.interiors.actions.push({
        x: sp.x, z: sp.z, r: 2.8, y: 0, anyY: true,
        label: () => `按 <kbd>E</kbd> 和${f.name}聊天`,
        cond: () => n.ch.root.visible, // at work (js/teashop.js) he isn't here
        fn: (g) => this.talk(id),
      });
    }
  }
  // at: where you meet him ('shop' = 茶學苑, see FRIENDS[id].shop); cb runs when the talk is over
  talk(id, at, cb) {
    const f = FRIENDS[id], g = this.g, s = (at && f[at]) || f;
    if (this.added.has(id)) { const c = s.chat || f.chat; g.dialog(c[Math.floor(Math.random() * c.length)], cb); return; }
    g.dialog(this._met?.[id] ? (s.again || f.again) : (s.intro || f.intro), () => { (this._met ||= {})[id] = true; this._ask(id, cb); });
  }
  // a shop asks after you pay: nothing if you are friends already
  offer(id) {
    const f = FRIENDS[id]; if (!f || this.added.has(id)) return;
    this.g.dialog(f.offer || f.intro, () => this._ask(id));
  }
  // after the talk: add as friend (messages + Peachgram) or not
  _ask(id, cb) {
    const f = FRIENDS[id], g = this.g;
    document.exitPointerLock?.();
    g.modal(`要加 ${f.short} 好友嗎？`, `<p style="margin:0 0 12px;line-height:1.7">加入後 ${f.short} 會出現在 i-Piyan 的 <b>訊息</b>，Peachgram 也看得到他的 <b>貼文</b> 和 <b>限時動態</b>。</p>
      <div class="modal-btns"><button class="menu-btn primary" id="frYes"><span>🤝 加好友</span><small>訊息＋Peachgram</small></button>
      <button class="menu-btn" id="frNo"><span>下次再說</span><small>NOT NOW</small></button></div>`);
    const done = (yes) => {
      removeEventListener('keydown', key, true);
      g.closeModal(); g.resume();
      if (yes) this.add(id);
      g.dialog(yes ? f.yes : f.no, cb);
    };
    // Enter / 1 = 加好友, Esc / 2 = 下次再說 (kept away from the game so Esc doesn't also pause)
    const key = (e) => {
      if (!g._modalOpen) { removeEventListener('keydown', key, true); return; } // closed with ✕
      const y = e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Digit1', n = e.code === 'Escape' || e.code === 'Digit2'; if (!y && !n) return; e.preventDefault(); e.stopPropagation(); done(y); };
    addEventListener('keydown', key, true);
    document.getElementById('frYes').onclick = () => done(true);
    document.getElementById('frNo').onclick = () => done(false);
  }
  // silent: restoring a save (no toast, no new posts at the current time)
  add(id, silent = false) {
    if (this.added.has(id) || !FRIENDS[id]) return;
    this.added.add(id);
    const g = this.g, ph = g.phone, c = FRIEND_CONTACTS[id];
    ph.friends.add(id);
    if (c) ph.chats.push({ c, round: 0, choice: 0, msgs: c.history.map(h => Array.isArray(h) ? { who: h[0], text: h[1], time: h[2] } : { day: h.day }), unread: silent ? 0 : c.unread || 0, busy: false, lastAt: silent ? undefined : g.clock });
    for (const [i, p] of (FRIEND_POSTS[id] || []).entries()) ph.feed.push({ ...p, id: `fr-${id}-${i}`, at: g.clock - p.ago });
    const n = this.npcs[id]; if (n) n.mark.visible = false;
    if (!silent) { g.hud.toast(`🤝 已和 ${FRIENDS[id].short} 互加好友（訊息・Peachgram）`, 'good', 2600); g.audio.pickup?.(); }
  }
  toJSON() { return [...this.added]; }
  load(list) { for (const id of list || []) this.add(id, true); }
}
