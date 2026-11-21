// 可以在校園裡認識、聊完再決定要不要加好友的同學。
// 加了好友：i-Piyan「訊息」多一個聊天室（js/chats.js 的 FRIEND_CONTACTS），Peachgram 看得到他的貼文與限時動態。
// 好友名單會存檔（save.js 的 friends）。
import { makeMissionNpc } from './npc.js';
import { FRIEND_CONTACTS } from './chats.js';
import { FRIEND_POSTS } from './feeds.js';

// 排球少年 吱吱：資管系體保生，跟彥霖同屆。站在體育館南側入口（橘色雨遮）前面。
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
  },
};

export class Friends {
  constructor(game) {
    this.g = game; this.added = new Set(); this.npcs = {};
    for (const [id, f] of Object.entries(FRIENDS)) {
      const n = makeMissionNpc(game.scene, f.look, f.name, f.spot.x, f.spot.z, f.spot.h);
      game.npcs.push(n); this.npcs[id] = n;
      game.interiors.actions.push({
        x: f.spot.x, z: f.spot.z, r: 2.8, y: 0, anyY: true,
        label: () => `按 <kbd>E</kbd> 和${f.name}聊天`,
        fn: (g) => this.talk(id),
      });
    }
  }
  talk(id) {
    const f = FRIENDS[id], g = this.g;
    if (this.added.has(id)) { g.dialog(f.chat[Math.floor(Math.random() * f.chat.length)]); return; }
    g.dialog(this._met?.[id] ? f.again : f.intro, () => { (this._met ||= {})[id] = true; this._ask(id); });
  }
  // after the talk: add as friend (messages + Peachgram) or not
  _ask(id) {
    const f = FRIENDS[id], g = this.g;
    document.exitPointerLock?.();
    g.modal(`要加 ${f.short} 好友嗎？`, `<p style="margin:0 0 12px;line-height:1.7">加入後 ${f.short} 會出現在 i-Piyan 的 <b>訊息</b>，Peachgram 也看得到他的 <b>貼文</b> 和 <b>限時動態</b>。</p>
      <div class="modal-btns"><button class="menu-btn primary" id="frYes"><span>🤝 加好友</span><small>訊息＋Peachgram</small></button>
      <button class="menu-btn" id="frNo"><span>下次再說</span><small>NOT NOW</small></button></div>`);
    const done = (yes) => {
      removeEventListener('keydown', key, true);
      g.closeModal(); g.resume();
      if (yes) this.add(id);
      g.dialog(yes ? f.yes : f.no);
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
    if (c) ph.chats.push({ c, round: 0, choice: 0, msgs: c.history.map(h => Array.isArray(h) ? { who: h[0], text: h[1], time: h[2] } : { day: h.day }), unread: silent ? 0 : c.unread || 0, busy: false });
    for (const [i, p] of (FRIEND_POSTS[id] || []).entries()) ph.feed.push({ ...p, id: `fr-${id}-${i}`, at: g.clock - p.ago });
    const n = this.npcs[id]; if (n) n.mark.visible = false;
    if (!silent) { g.hud.toast(`🤝 已和 ${FRIENDS[id].short} 互加好友（訊息・Peachgram）`, 'good', 2600); g.audio.pickup?.(); }
  }
  toJSON() { return [...this.added]; }
  load(list) { for (const id of list || []) this.add(id, true); }
}
