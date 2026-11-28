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
  {
    // 不是支線：12 月 21:00–23:00 經過力行宿舍看到天井的場面就解鎖（src/entities/XmasPudding.js）
    id: 'pudding',
    title: '聖誕節宿舍布丁事件',
    real: '2021 年聖誕節，力行男宿天井的布丁大戰',
    icon: '🍮',
    tag: '彩蛋・力行男宿',
    hint: '12 月的晚上 9 點到 11 點，男宿天井好像特別熱鬧……',
    cover: `${DIR}pudding/crowd.jpg`,
    facts: [
      ['時間', '2021 年 12 月・晚上'],
      ['地點', '力行宿舍天井（一樓空地）'],
      ['人物', '一大群戴聖誕帽的住宿生'],
      ['災情', '279 寢門口一攤碎掉的布丁'],
    ],
    story: [
      '2021 年 12 月，大一上學期的聖誕節。力行男宿一樓的天井擠滿了人，大家戴著聖誕老人帽，在涼亭和野餐桌旁邊發糖果、發點心。',
      '本來是很溫馨的交換禮物活動，不知道誰開了第一槍——發點心變成丟點心，最後連布丁都飛起來了。拍影片的人在旁邊大喊：「怎麼變丟布丁了啦！」',
      '其中幾顆布丁一路飛上二樓，正好砸在 279 寢門口。活動結束後，門口地上留下一攤碎掉的布丁，焦糖和蛋黃色的碎塊黏在磨石子地上。',
    ],
    vs: [
      [
        '遊戲',
        '12 月每晚 21:00–23:00，天井一群戴聖誕帽的人發糖果，有人把布丁往二樓丟，砸在 279 寢門口。',
      ],
      ['真實', '2021 年聖誕節的宿舍活動，發點心發到最後變成布丁大戰，279 門口真的被砸了一地。'],
    ],
    media: [
      {
        type: 'img',
        src: `${DIR}pudding/crowd.jpg`,
        cap: '天井擠滿戴聖誕帽的人，影片字幕：「怎麼變丟布丁了啦」',
      },
      {
        type: 'img',
        src: `${DIR}pudding/splat.jpg`,
        cap: '事後的 279 門口：地上一攤碎掉的布丁',
      },
    ],
  },
  {
    // 不是支線：11、12 月有時候漢克在力行 2F 浴廁拿蓮蓬頭刷牙，跟他說完話解鎖（src/entities/npcs/Hank.js brushTalk）
    id: 'coldwater',
    title: '冬天沒有熱水的男宿',
    real: '想用蓮蓬頭的熱水刷牙，結果連蓮蓬頭都是冷的',
    icon: '🥶',
    tag: '彩蛋・漢克',
    hint: '冬天的早上或睡前，男宿浴廁好像有人蹲在地上……',
    cover: `${DIR}coldwater/brush.jpg`,
    facts: [
      ['時間', '冬天（11～12 月）'],
      ['地點', '力行宿舍浴廁・淋浴間'],
      ['人物', '漢克'],
      ['水溫', '洗手台：冷　蓮蓬頭：也是冷'],
    ],
    story: [
      '力行男宿的洗手台只有冷水。冬天一到，早上刷牙冰到牙齒發酸，漢克想到一個妙招：淋浴間的蓮蓬頭有熱水，蹲在地上拿蓮蓬頭來刷牙就好了。',
      '他把蓮蓬頭拿下來、轉到熱水那一邊，蹲在淋浴間裡等熱水……等了很久，水還是冰的。原來冬天連淋浴間都沒有熱水。',
      '最後他還是只能用冷水刷牙。室友在旁邊拍下這一幕，字幕寫著：「好好笑 還想用熱水刷牙啊」。',
    ],
    vs: [
      [
        '遊戲',
        '11、12 月有些早上或睡前，漢克蹲在力行 2 樓浴廁拿著蓮蓬頭刷牙，跟你抱怨男宿冬天沒熱水。',
      ],
      ['真實', '冬天洗手台沒熱水，想改用淋浴間的蓮蓬頭，結果蓮蓬頭也沒熱水，只好用冷水刷牙。'],
    ],
    media: [
      {
        type: 'img',
        src: `${DIR}coldwater/brush.jpg`,
        cap: '蹲在淋浴間拿著蓮蓬頭刷牙。字幕：「好好笑 還想用熱水刷牙啊」',
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
