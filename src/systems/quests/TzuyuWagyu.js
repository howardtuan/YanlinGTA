// 支線「幫 Winter 帶和牛」：
//   1. 跟 Tzuyu（兔瓦斯的成員、霍華德的女朋友，src/entities/npcs/Howard.js）加好友後，她私訊你：
//      她過幾天要回韓國，彥霖的女朋友 aespo Winter 超愛戈登肉鋪的和牛，問你要不要買一份讓她帶回首爾。
//   2. 到戈登肉鋪（src/entities/npcs/Gordon.js）的和牛區買和牛（M9 菲力、A5 沙朗、和牛漢堡排任一樣都可以）。
//   3. 晚餐後（18:30–22:30）Tzuyu 跟霍華德在校園散步時，走到她旁邊按 E 把和牛交給她。
//   4. 遊戲時間一小時後，Winter 在聊天室傳訊息謝謝你（她收到了），aespo 成員幫你應援 +5 票。
// 進度存在 src/systems/SaveSystem.js 的 tzuyuQuest。
const WAGYU = ['m9', 'a5', 'patty']; // 戈登肉鋪和牛區的品項 id（src/entities/npcs/Gordon.js GD_ZONES.wagyu）
const THANKS_AFTER = 60; // game minutes from handing it over to Winter's message

export class TzuyuWagyu {
  constructor(game) {
    this.g = game;
    // stage: none → asked (she asked you) → bought (wagyu in hand) → given (she has it) → done (Winter said thanks)
    this.state = { stage: 'none', base: 0, givenAt: null };
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
  }
  // how many wagyu items you have ever bought at 戈登肉鋪
  _wagyu() {
    const b = this.g.gordon?.bought || {};
    return WAGYU.reduce((s, id) => s + (b[id] || 0), 0);
  }
  _chat(id) {
    return this.g.phone?.chats.find((st) => st.c.id === id);
  }
  // messages arrive one by one in a chat (with a notice when you aren't looking at it)
  _say(id, lines) {
    const st = this._chat(id);
    if (!st || st.busy) return false;
    this.g.phone._deliver(
      st,
      lines.map((text) => ({ who: id, text })),
      0,
      400
    );
    return true;
  }
  // ready to be handed over to her on the walk
  get ready() {
    return this.state.stage === 'bought';
  }
  update() {
    const g = this.g,
      S = this.state;
    if (S.stage === 'none') {
      if (!g.friends?.added.has('tzuyu')) return;
      const ok = this._say('tzuyu', [
        '彥霖～我是 Tzuyu 😊',
        '我過幾天要回韓國了，Winter 一直跟我說她好想吃戈登肉鋪的和牛 🥩',
        '你可以幫她買一份嗎？我幫你帶回首爾給她！',
        '晚餐後我跟霍華德會在學校散步，買好再拿給我就好 💕',
      ]);
      if (!ok) return;
      S.stage = 'asked';
      S.base = this._wagyu();
      g._saveT = 9.5;
      g.hud.toast('🥩 支線：幫 Winter 帶和牛 —— 到戈登肉鋪的和牛區買和牛', 'good', 3400);
      return;
    }
    if (S.stage === 'asked' && this._wagyu() > S.base) {
      S.stage = 'bought';
      g._saveT = 9.5;
      g.hud.toast(
        '🥩 和牛買好了！晚上 6 點半到 10 點半，Tzuyu 跟霍華德在校園散步時拿給她',
        'good',
        3600
      );
      this._say('tzuyu', [
        '收到！和牛買好了嗎 😆',
        '晚上散步的時候拿給我，我會好好冰著帶回去的 ❄️',
      ]);
      return;
    }
    if (S.stage === 'given' && g.clock - S.givenAt >= THANKS_AFTER) {
      if (
        !this._say('winter', [
          '彥霖！！Tzuyu 把和牛帶給我了 🥩💙',
          '是戈登肉鋪的耶，我最喜歡他們家的和牛了',
          '成員們都說你好貼心，大家都要幫你應援 🗳️',
          '等我回台灣，我們一起去吃 💙',
        ])
      )
        return;
      S.stage = 'done';
      g._saveT = 9.5;
      g.addVotes(5, 'Winter 收到和牛，aespo 成員幫你應援 +5 票');
    }
  }
  // on the walk: you hand her the wagyu (src/entities/npcs/Howard.js)
  give() {
    const g = this.g,
      S = this.state;
    if (S.stage !== 'bought') return false;
    S.stage = 'given';
    S.givenAt = g.clock;
    g._saveT = 9.5;
    g.dialog([
      ['彥霖', 'Tzuyu！這是戈登肉鋪的和牛，麻煩妳幫我帶給 Winter 🥩'],
      ['Tzuyu', '哇～真的買了！Winter 一定會超開心 😆'],
      ['Tzuyu', '我會用保冷袋裝好，一下飛機就拿給她 ❄️'],
      ['霍華德', '彥霖你也太貼心，我壓力好大 😂'],
    ]);
    g.hud.toast('🥩 和牛交給 Tzuyu 了，她會帶回首爾給 Winter', 'good', 2800);
    return true;
  }
}
