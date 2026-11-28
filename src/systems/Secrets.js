// 隱藏成就：有些 NPC 支線是真實事件改編。破完那條支線，手機／電腦上的「🏆 隱藏成就」App 會解鎖它的「真實版本」：
// 當年的照片（有人臉的都打過馬賽克）、影片和文字說明。破關當下手機會自己拿出來，播一段解鎖動畫再打開那一篇
// （src/ui/phone/Phone.js revealSecret，畫面在 src/ui/phone/SecretsUI.js，手機和電腦共用）。
// 素材放在 assets/secrets/<id>/。解鎖紀錄存在 src/systems/SaveSystem.js 的 secrets。
// 新增一篇：在 SECRETS 加一筆（when 是舊存檔的保險：已經破完的支線不用重玩也會解鎖），支線破關時呼叫
// game.phone.revealSecret(id)。

const DIR = 'assets/secrets/';

export const SECRETS = [
  {
    id: 'wuling',
    title: '吱吱武嶺跑山受傷',
    real: '大一男宿室友的武嶺跑山車禍',
    icon: '🏔️',
    tag: '支線・吱吱',
    when: (g) => g.zzQuest?.state?.stage === 'done',
    hint: '男宿裡有人很想找你一起上山……',
    cover: `${DIR}wuling/summit.jpg`,
    facts: [
      ['時間', '2021 年 4 月 20 – 21 日'],
      ['地點', '台14甲・武嶺 3275m → 清境'],
      ['人物', '力行男宿的大一室友們'],
      ['傷勢', '手指骨折、手臂跟膝蓋大面積擦傷'],
    ],
    story: [
      '2021 年 4 月，大一下學期。力行男宿的室友們約好騎機車，從中壢一路跑山上武嶺。',
      '4 月 20 日晚上 9 點 44 分，山路上一個彎道，行車紀錄器拍下了下面這段——前面的車一慢下來，後面跟太近，直接摔出去。遊戲裡吱吱傳給你的那支翻車影片，原型就是它。',
      '人沒有大礙，但手指骨折、手臂和膝蓋磨掉一大片。隔天包著紗布、吊著三角巾，還是硬撐著跟大家一起攻頂，在武嶺 3275 公尺的牌子前合照，再一路騎下清境。',
      '回到宿舍，手打著石膏不能碰水——遊戲裡的「殘廢澡」就是這樣來的。',
    ],
    vs: [
      ['遊戲', "跟肉舖老闆騎 BW'S 上武嶺，她急煞、吱吱追撞翻車；彥霖在宿舍幫他洗殘廢澡。"],
      ['真實', '一群大一室友半夜跑山，彎道摔車；隔天傷兵照樣攻頂合照，留下這些照片。'],
    ],
    media: [
      {
        type: 'video',
        src: `${DIR}wuling/crash.mp4`,
        poster: `${DIR}wuling/crash-poster.jpg`,
        cap: '行車紀錄器・2021/04/20 21:44　就是這個彎',
      },
      {
        type: 'img',
        src: `${DIR}wuling/summit.jpg`,
        cap: '隔天還是攻上武嶺 3275m。膝蓋包著紗布的那位就是本人',
      },
      {
        type: 'img',
        src: `${DIR}wuling/scooters.jpg`,
        cap: '清境路邊休息，戴好安全帽準備騎回中壢',
      },
      {
        type: 'img',
        src: `${DIR}wuling/market.jpg`,
        cap: '三角巾吊著手，還是要比個 YA',
      },
    ],
  },
];

// 解鎖狀態：got = { id: 解鎖時的遊戲時間 }，seen = 已經點開看過的 id
export class SecretBook {
  constructor(game) {
    this.g = game;
    this.got = {};
    this.seen = new Set();
  }
  toJSON() {
    return { got: this.got, seen: [...this.seen] };
  }
  load(d) {
    if (!d || typeof d !== 'object') return;
    if (d.got && typeof d.got === 'object') this.got = { ...d.got };
    if (Array.isArray(d.seen)) this.seen = new Set(d.seen);
  }
  isOpen(id) {
    const s = SECRETS.find((x) => x.id === id);
    if (!s) return false;
    if (this.got[id] != null) return true;
    if (s.when?.(this.g)) {
      this.got[id] = this.g.clock ?? 0; // a save from before this app: the quest was already done
      return true;
    }
    return false;
  }
  list() {
    return SECRETS.map((s) => ({ ...s, open: this.isOpen(s.id), at: this.got[s.id] ?? null }));
  }
  get count() {
    return SECRETS.filter((s) => this.isOpen(s.id)).length;
  }
  get unseen() {
    return SECRETS.filter((s) => this.isOpen(s.id) && !this.seen.has(s.id)).length;
  }
  // returns true the first time
  unlock(id) {
    if (this.got[id] != null || !SECRETS.some((s) => s.id === id)) return false;
    this.got[id] = this.g.clock ?? 0;
    this.g._saveT = 9.5;
    return true;
  }
  read(id) {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    this.g._saveT = 9.5;
  }
}
