// 支線「幫 Yulu 送無糖茶給吱吱」：
//   1. 跟 Yulu（商設系、吱吱的女朋友，src/entities/npcs/Yulu.js）加好友後，她私訊你：
//      吱吱最近一直想喝茶學苑的無糖茶，可是她進不去男生宿舍，請你幫忙買一杯送去力行 276。
//   2. 到茶學苑（src/systems/minigames/TeaShop.js）點任何一杯、甜度選「無糖」。
//   3. 走到力行宿舍 276 寢吱吱的書桌旁，按 E 把茶交給他（他在寢室、醒著的時候；src/entities/npcs/Zz.js talk）。
//   4. Yulu 傳訊息謝謝你，給你 NT$200 小費。
// 進度存在 src/systems/SaveSystem.js 的 yuluQuest。
const TIP = 200;

export class YuluTea {
  constructor(game) {
    this.g = game;
    // stage: none → asked (she asked you) → bought (unsweetened tea in hand) → done (吱吱 has it, you got the tip)
    this.state = { stage: 'none', drink: '' };
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
  }
  _say(id, lines) {
    const st = this.g.phone?.chats.find((c) => c.c.id === id);
    if (!st || st.busy) return false;
    this.g.phone._deliver(
      st,
      lines.map((text) => ({ who: id, text })),
      0,
      400
    );
    return true;
  }
  // the tea for 吱吱 is in your hand: talking to him hands it over (src/entities/npcs/Zz.js)
  get ready() {
    return this.state.stage === 'bought';
  }
  update() {
    const g = this.g,
      S = this.state;
    if (S.stage !== 'none' || !g.friends?.added.has('yulu')) return;
    const ok = this._say('yulu', [
      '彥霖～我是 Yulu 😊',
      '吱吱最近一直說想喝茶學苑的無糖茶（他說練球要控制糖分）',
      '可是我進不去男生宿舍 😢',
      '你可以幫我買一杯無糖的，送去力行 276 給他嗎？我會給你小費的！',
    ]);
    if (!ok) return;
    S.stage = 'asked';
    g._saveT = 9.5;
    g.hud.toast('🧋 支線：幫 Yulu 送無糖茶給吱吱 —— 到茶學苑點一杯「無糖」', 'good', 3400);
  }
  // after an order at 茶學苑 (src/systems/minigames/TeaShop.js order)
  onTea(name, sugar) {
    const g = this.g,
      S = this.state;
    if (S.stage !== 'asked') return;
    if (sugar !== '無糖') {
      g.hud.toast('🧋 Yulu 說吱吱要「無糖」的喔，這杯你自己喝吧', 'good', 2600);
      return;
    }
    S.stage = 'bought';
    S.drink = name;
    g._saveT = 9.5;
    g.hud.toast(`🧋 ${name} 無糖 買好了！送去力行宿舍 276 寢給吱吱`, 'good', 3200);
    this._say('yulu', ['買到了嗎？謝謝你 🙏', '吱吱晚上 10 點以後都在 276 打遊戲，拿給他就好～']);
  }
  // in 276: you hand it to 吱吱
  give() {
    const g = this.g,
      S = this.state;
    if (S.stage !== 'bought') return false;
    S.stage = 'done';
    g._saveT = 9.5;
    const drink = S.drink || '茶';
    g.dialog(
      [
        ['彥霖', `吱吱，Yulu 叫我拿來的，${drink}無糖！`],
        ['吱吱', '欸！？她怎麼知道我想喝這個 😆'],
        ['吱吱', '無糖的才不會胖，練球要控制一下……謝啦兄弟 🏐'],
        ['彥霖', '要謝去謝你女朋友啦'],
      ],
      () => {
        g.earn(TIP, 'Yulu 的小費（幫忙送茶給吱吱）');
        g.hud.toast(`💰 Yulu 給你 NT$${TIP} 小費`, 'good', 2800);
        this._say('yulu', [
          '吱吱說收到了！他超開心 😆',
          `小費 ${TIP} 元轉給你了，謝謝你跑一趟 🙏`,
          '選會長加油！商設的同學我都幫你拉票了 🗳️',
        ]);
      }
    );
    return true;
  }
}
