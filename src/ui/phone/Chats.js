// i-Piyan 訊息 App 的對話資料（全部寫死）。
// history: 已經發生過的對話；{ day } 是日期分隔線，[who, text, time?]：who = 'me' 或聯絡人（群組用名字）
// script: 依序進行的回合，每回合兩個選項 { t: 我傳的訊息, r: 對方的回覆（字串，或群組用 [名字, 內容]）, v: 得票 }
// 每個聯絡人的回合用完就沒有新話題了（對方已讀）。
import { pilotBall } from '../../entities/Pilot.js';
import { trackFriend } from '../../world/Locate.js';

export const CONTACTS = [
  {
    // 彥霖的女朋友：韓國舞蹈女團 aespo 的成員，遠距離戀愛中（她在首爾）。pinned: 訊息列表永遠置頂，頭貼右下角有藍色圖釘。
    // aespo 週五在林口體育館開唱（src/systems/minigames/Concert.js），搶票用手機的「皮元系統」。
    id: 'winter',
    name: 'aespo Winter',
    sub: '遠距離戀愛中 💙 首爾',
    avatar: '<img class="ph-avimg" src="assets/gram/winter_av.jpg" alt="">',
    color: '#9b7bff',
    unread: 2,
    pinned: true,
    history: [
      { day: '昨天' },
      ['winter', '練舞練到現在才結束 😵‍💫', '23:48'],
      ['me', '辛苦了！記得吃點東西再睡', '23:50'],
      ['winter', '好～你也早點睡', '23:51'],
      ['winter', '選舉加油 💙 我們成員都說要幫你應援', '23:52'],
      { day: '今天' },
      ['winter', '早安 ☀️ 首爾今天好冷', '07:10'],
      ['winter', '你今天又要去發傳單嗎？不要太累喔', '07:11'],
    ],
    script: [
      {
        choices: [
          { t: '早安！今天要打工又要發傳單 💪', r: ['好認真 🥹', '等你當選，我要第一個恭喜你'] },
          { t: '首爾冷就多穿一點，好想妳 🥺', r: ['我也想你 💙', '再撐一下，我們很快就會見面'] },
        ],
      },
      {
        choices: [
          {
            t: '週五林口的演唱會我會去！',
            r: [
              '真的嗎！！',
              '那我在台上會找你的應援燈 💙',
              '票很難搶喔，開賣記得準時打開「皮元系統」',
            ],
          },
          {
            t: '晚上可以視訊嗎？想看看妳',
            r: ['等我練完舞 🙈', '台灣 11 點、首爾 12 點，我打給你'],
          },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！💙', '（我有練過發音喔 😆）'], v: 1 },
          {
            t: '遠距離很辛苦，但有妳真好',
            r: ['我也是', '你在台灣好好選，我在首爾好好跳', '我們都要一起加油 💙'],
          },
        ],
      },
    ],
  },
  {
    // 勞大（彥霖航空的直升機駕駛員，src/entities/Pilot.js）：一開始就是好友。「你在哪？」每一輪都能問，
    // 他會回現在在哪；在校園散步或在籃球場打球的話會設定導航，路線跟著他走（nav.track）。
    // laoda: 預設隱藏，在電腦終端機輸入 mamba 叫他回來才會出現在訊息裡（src/systems/LaodaMode.js、Phone.js syncLaoda）
    id: 'laoda',
    laoda: true,
    name: '勞大',
    sub: '彥霖航空・直升機駕駛員',
    avatar: '<img class="ph-avimg" src="assets/gram/laoda_av.jpg" alt="">',
    color: '#552583',
    unread: 1,
    laugh: '孩子們，這並不好笑', // 你傳的訊息有「哈哈」之類的笑，他的回覆最後一定補這句（src/ui/phone/Phone.js）
    // 他的聊天室在每個瀏覽器都能自己打字（不只 Gemini Nano）；沒有 AI 時，你自己打的話他回這幾句之一
    typing: true,
    filler: ['Man', 'What can I say 🤙', '收到，Man', '好，Mamba 收到 🐍'],
    // 彩蛋：在這裡罵他（src/systems/LaodaInsult.js），他回這幾句，然後衝過來肘擊你（src/entities/Pilot.js provoke）
    insulted: (g) =>
      g.airdrop?.walker?.grudge
        ? ['Man 我已經在路上了', '站好別跑']
        : g.airdrop?.busy
          ? ['Man，我在天上都看到了', '等我降落，馬上過去找你 💢']
          : ['Man……你剛剛說什麼？', '站在那邊不要動', '我現在過去找你 💪'],
    history: [
      { day: '今天' },
      ['laoda', 'Man 我勞大，要空運機車打給我 🚁'],
      ['laoda', '平常沒在飛的時候，我都在校園散步，想找我就問我在哪'],
    ],
    script: [
      {
        choices: [
          {
            t: '你的背號為什麼是 24？',
            r: ['因為以前一天睡8小時，現在一天睡24小時', '孩子們，這並不好笑'],
          },
          { t: '謝啦勞大，機車空運超準時', r: ['Man 這是專業 🏀', '下次一樣打給我'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/, // also when you type it yourself (AI chat)
        ask: (g) => {
          const A = g.airdrop,
            w = A?.walker;
          if (!w) return { r: ['Man 我在忙，等等再說'] };
          if (w.grudge) return { r: ['Man 你不用找我', '我正在過去找你 💢'] }; // you insulted him: he is coming
          if (A.busy) return { r: ['Man 我在天上開直升機啦 🚁', '等我降落再說'] };
          if (!w.on && pilotBall(g.clock)) w.playBall();
          if (w.mode === 'court')
            return {
              r: [
                'Man 我在體育園區籃球場投籃 🏀',
                '操場東邊、聖火台後面有屋頂那座，定位傳給你，過來看我投',
              ],
              then: () => {
                if (g.nav.track(w)) g.hud.toast('🧭 已設定導航到籃球場的勞大', 'good', 2400);
              },
            };
          if (!w.on && !w.appear())
            return { r: ['我在學校散步啊', '你先回校園再問我，我傳定位給你'] }; // you are off campus
          return {
            r: ['Man 我在校園散步', '定位傳給你了，沿著路線走過來找我 📍'],
            then: () => {
              if (g.nav.track(w))
                g.hud.toast('🧭 已設定導航到勞大身邊（路線會跟著他走）', 'good', 2400);
            },
          };
        },
      },
    ],
  },
];

// 加了好友才會出現的聊天室（src/ui/phone/Friends.js）。unread = 加好友當下的未讀數。
export const FRIEND_CONTACTS = {
  zz: {
    id: 'zz',
    name: '排球少年 吱吱',
    sub: '資管系・體保生・同屆',
    avatar: '<img class="ph-avimg" src="assets/gram/zz_av.jpg" alt="">',
    color: '#7a1f2c',
    unread: 2,
    history: [
      { day: '今天' },
      ['zz', '欸 我吱吱啦 加到了 🏐'],
      ['zz', '系排群組我幫你宣傳了，大家都說要去投票'],
    ],
    script: [
      {
        choices: [
          {
            t: '太感謝了！選完請系排喝飲料 🧋',
            r: ['讚啦 我要半糖去冰', '順便幫你揪一場友誼賽 哈哈'],
            v: 1,
          },
          {
            t: '你們系排最近戰績怎樣？',
            r: ['大專盃預賽全勝 💪', '下禮拜打複賽，有空來體育館加油'],
          },
        ],
      },
      {
        choices: [
          { t: '晚上排位算我一個 🎮', r: ['好 10 點上線', '輸了算你的 😏'] },
          {
            t: '健身菜單可以分我嗎？想練一下',
            r: ['可以啊 先從深蹲、臥推、硬舉開始', '每週三練，有空一起去體育館重訓室'],
          },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！🏐🔥'], v: 1 },
          {
            t: '體保生讀書也辛苦了，期中加油',
            r: ['你也是 選舉加油啦會長', '有需要搬東西、喊口號找我，肺活量很夠'],
          },
        ],
      },
    ],
    // 支線「吱吱武嶺跑山受傷」（src/systems/quests/ZzInjury.js）：when() 成立時才會出現的選項；你在哪？一直都在。
    // lock：任務在等你回這一句時，聊天室只剩這個選項（不能開別的話題、不能自己打字），回完才恢復（Phone._options）

    always: [
      {
        t: '選舉快到了要拜票，這次先不去了 🙏',
        match: /不去|不行|沒辦法|沒空|拜票|下次|改天/,
        lock: true,
        when: (g) => g.zzQuest?.state.stage === 'invited',
        ask: (g) => g.zzQuest.decline(),
      },
      {
        t: '你之前受傷還好嗎？',
        match: /受傷|還好嗎|手指/,
        when: (g) => {
          const S = g.zzQuest?.state;
          return S?.stage === 'done' && !S.relapse && S.askDay !== Math.floor(g.clock / 1440);
        },
        ask: (g) => g.zzQuest.review(),
      },
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const Z = g.zz;
          if (!Z?.mode) return { r: ['等我一下'] };
          if (Z.mode === 'sleep')
            return {
              r: ['（已讀不回）'],
              then: () =>
                g.hud.toast(
                  `😴 吱吱在 276 寢的 ${Z.injured ? 3 : 2} 號床睡覺，早上 8 點會起來`,
                  'good',
                  2800
                ),
            };
          const r = {
            bath: ['在力行二樓浴室等你啦 🛁', '快來 侯舌已經到了'],
            shop: ['在茶學苑打工 🧋', '來喝飲料啊'],
            gym: ['在體育館門口 🏐', '定位傳你'],
            walk: ['在跟 Yulu 散步 💕', '晚點再回你'],
            ride: ['跟女拳大帝騎大A兜風中 🛵', '等等回宿舍'],
            room: Z.injured ? ['在 276 養傷 🩹', '手指還在痛'] : ['在 276 打遊戲 🎮', '要來雙排嗎'],
          }[Z.mode] || ['在學校啊'];
          const at = Z.pos();
          return {
            r,
            then: () => {
              if (at && g.nav?.set) {
                g.nav.set(at.x, at.z);
                g.hud.toast('🧭 已設定導航到吱吱那裡', 'good', 2400);
              }
            },
          };
        },
      },
    ],
  },
  gd: {
    id: 'gd',
    name: '女拳大帝',
    sub: '戈登肉鋪店長・LOL 鑽石',
    avatar: '<img class="ph-avimg" src="assets/gram/gd_av.jpg" alt="">',
    color: '#1d1d1f',
    unread: 2,
    history: [{ day: '今天' }, ['gd', '我女拳大帝，加到了。'], ['gd', '晚上 10 點積分，別遲到 😤']],
    script: [
      {
        choices: [
          {
            t: '收到！我玩輔助可以嗎',
            r: ['可以，但你要是亂丟眼我會直接打電話罵你', '贏了請你吃麥當勞 🍔'],
          },
          {
            t: '我剛入坑 LOL，可能會有點菜……',
            r: ['蛤？？？', '……算了，我 carry 你。但輸了全算你的 🔥'],
          },
        ],
      },
      {
        choices: [
          {
            t: '你推薦哪塊牛排？想請競選小組吃',
            r: ['肋眼！油花漂亮，煎五分熟', '來店裡報我的名字……沒有折扣啦，但我會挑最好的給你'],
            v: 1,
          },
          {
            t: '你每天都健身喔？',
            r: ['廢話，一天沒練渾身不對勁 💪', '練完一定要吃麥當勞，大麥克是我的高蛋白（不是）'],
          },
        ],
      },
      {
        choices: [
          {
            t: '系會長選舉也要拜託你了！',
            r: ['包在我身上，店裡客人我一個一個拉票', '輸是不可能的，我不允許 🔥'],
            v: 1,
          },
          {
            t: '昨天那場我們贏了吧？',
            r: ['贏了！！第一次跟你打就連勝，你是福星', '今晚繼續，誰都別想阻止我們上分'],
          },
        ],
      },
    ],
  },
  hank: {
    id: 'hank',
    name: '漢克',
    sub: '資管系同學・ZMAX・吉他',
    avatar: '<img class="ph-avimg" src="assets/gram/hank_av.jpg" alt="">',
    color: '#2b2f3a',
    unread: 2,
    history: [
      { day: '今天' },
      ['hank', '我漢克，加到了 🎸'],
      ['hank', '這是我最近在聽的歌單，通勤騎車聽剛好'],
    ],
    script: [
      {
        choices: [
          {
            t: '歌單收到！今晚看夜景算我一個',
            r: ['好啊 10 點下班後出發', '你騎 JAT SM 跟得上嗎 😏'],
          },
          { t: '你吉他彈多久了？', r: ['高中開始，玩團玩到現在', '有空來我們練團室聽'] },
        ],
      },
      {
        choices: [
          {
            t: '專題系統可以分享給系上用嗎？',
            r: ['可以啊，我開源了', '你當選的話就拿來做系學會的活動報名系統 💻'],
            v: 1,
          },
          {
            t: '你室友女拳大帝是不是很兇',
            r: ['外面兇，在家打輸 LOL 更兇', '但人很好啦，會分肉給我吃 🥩'],
          },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！我們整個專題組都會去投 🗳️'], v: 1 },
          { t: '週末一起去聽團吧', r: ['走！我買票', '演出完再騎車去吃宵夜'] },
        ],
      },
    ],
  },
  // YeeMing（src/entities/npcs/Yeeming.js）：「你在哪？」說他在排球場、跟明衫散步或收假回營；也可以問「要不要打麻將？」
  yeeming: {
    id: 'yeeming',
    name: 'YeeMing',
    sub: '物理系・當兵中・排球',
    avatar: '<img class="ph-avimg" src="assets/gram/yeeming_av.jpg" alt="">',
    color: '#56643a',
    unread: 1,
    history: [{ day: '今天' }, ['yeeming', '彥霖！我 YeeMing，加到了 🪖 選會長加油！']],
    script: [
      {
        choices: [
          { t: '當兵還好嗎', r: ['每天五點半起床 😵', '但伙食比學餐好吃（小聲）'] },
          { t: '物理系的票拜託了', r: ['包在我身上', '班群我已經發了 🗳️'], v: 1 },
        ],
      },
      {
        choices: [
          { t: '你跟明衫怎麼認識的？', r: ['宿營的時候同一小隊', '她跳舞超帥，我就被圈粉了 😂'] },
          { t: '最近有在打排球嗎', r: ['休假都在體育館旁邊打', '侯舌也常來'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const Y = g.yeeming;
          if (!Y?.mode) return { r: ['等我一下'] };
          if (Y.mode === 'off')
            return { r: ['收假回營了 🪖', '晚上沒辦法看手機，明天早上 9 點後回學校'] };
          const r =
            Y.mode === 'walk'
              ? ['跟明衫在校園散步 💑', '定位傳你']
              : ['在體育館旁邊的排球場 🏐', '要來一起打嗎'];
          return {
            r,
            then: () => {
              if (trackFriend(g, 'yeeming'))
                g.hud.toast('🧭 已設定導航到 YeeMing 那邊（路線會跟著他走）', 'good', 2400);
            },
          };
        },
      },
      {
        t: '要不要打麻將？',
        match: /麻將|打牌|三缺一/,
        ask: () => ({ r: ['又是麻將 😂', '休假那天晚上，三缺一揪我 🀄'] }),
      },
    ],
  },
  // 羊明衫（src/entities/npcs/Mingshan.js）：「你在哪？」說她在系館練舞、在麥當勞值班或在讀書，並導航過去
  mingshan: {
    id: 'mingshan',
    name: '羊明衫',
    sub: '資管系・舞蹈・麥當勞值班經理',
    avatar: '<img class="ph-avimg" src="assets/gram/mingshan_av.jpg" alt="">',
    color: '#c2414b',
    unread: 2,
    history: [
      { day: '今天' },
      ['mingshan', '加到了～我是羊明衫 💃'],
      ['mingshan', '這是期末的重點筆記，資料庫跟統計都有，彥霖選舉加油！'],
    ],
    script: [
      {
        choices: [
          { t: '你的筆記救了我一命', r: ['哈哈不客氣', '有不懂的隨時問我 📚'], v: 1 },
          { t: '宿營的舞練得怎樣？', r: ['還差最後一段 8 拍', '練好拍給你看 💃'] },
        ],
      },
      {
        choices: [
          { t: '你真的想進韓國女團？', r: ['真的！', '畢業前想去韓國參加練習生甄選 ✨'] },
          { t: '橘貓叫什麼名字？', r: ['就叫橘貓啊 😂', '牠只吃戈登肉鋪的肉，超難養'] },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！', '我幫你拍一支拉票舞蹈影片 🎬'], v: 1 },
          { t: '值班經理很累吧', r: ['還好啦～', '漢克在內場炸薯條比較累 🍟'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const S = g.mingshan;
          if (!S?.mode) return { r: ['等我一下～'] };
          if (S.mode === 'sleep')
            return {
              r: ['（已讀不回）'],
              then: () =>
                g.hud.toast('😴 羊明衫在睡覺，早上 9 點以後會在系館前面練舞', 'good', 2800),
            };
          if (S.mode === 'library' || S.mode === 'study')
            return {
              r: [
                S.mode === 'library' ? '在圖書館讀書 📚' : '在宿舍讀書 📖',
                '明天早上 9 點我會在系館前面練舞～',
              ],
            };
          const at = S.mode === 'dance' || S.mode === 'walk' ? S.pos : S.worker?.root.position;
          const r =
            S.mode === 'walk'
              ? ['跟 YeeMing 在校園散步 💑', '定位傳你～']
              : S.mode === 'dance'
                ? ['在資管系館前面練舞 💃', '橘貓也在喔，定位傳你']
                : ['在活動中心麥當勞值班 🍟', '來的話我幫你點餐～'];
          return {
            r,
            then: () => {
              if (at && trackFriend(g, 'mingshan'))
                g.hud.toast('🧭 已設定導航到羊明衫那邊（路線會跟著她走）', 'good', 2400);
            },
          };
        },
      },
    ],
  },
  // 劍玉（src/entities/npcs/Jianyu.js）：基隆航海王、資管三甲班代。「你在哪？」會說在系館停車場還是 278，並導航過去；「借車」會告訴你車停在哪
  jianyu: {
    id: 'jianyu',
    name: '基隆航海王 劍玉',
    sub: '資管三甲班代・特戰英豪鑽石',
    avatar: '<img class="ph-avimg" src="assets/gram/jianyu_av.jpg" alt="">',
    color: '#5d6b8a',
    unread: 2,
    history: [
      { day: '今天' },
      ['jianyu', '班代劍玉報到 🫡'],
      ['jianyu', '三甲的群組我幫你宣傳了，明天大家一起去投票'],
    ],
    script: [
      {
        choices: [
          { t: '班代辛苦了！明天拜託大家了', r: ['交給我', '班上我一個一個私訊提醒 📋'], v: 1 },
          { t: '你真的是鑽石喔？', r: ['鑽石 II 啦', '晚上要不要雙排，我帶你 🎯'] },
        ],
      },
      {
        choices: [
          { t: '你哪來那麼多超跑', r: ['家裡的啦 😅', '放著也是放著，大家借去開比較有意義'] },
          {
            t: '基隆航海王是什麼梗',
            r: ['我也不知道誰開始叫的', '可能因為我家在基隆有船吧……（小聲）'],
          },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！三甲全體出動 🗳️'], v: 1 },
          { t: '週末要回基隆嗎', r: ['要啊 廟口見', '天婦羅跟營養三明治幫你帶'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const J = g.jianyu;
          if (!J?.mode) return { r: ['等我一下'] };
          if (J.mode === 'sleep')
            return {
              r: ['（已讀不回）'],
              then: () =>
                g.hud.toast('😴 劍玉在 278 寢的上舖睡覺，下午 5 點以後會醒來打積分', 'good', 2800),
            };
          const r = J.cruising
            ? ['開藍寶堅尼出來兜風 🏎️', '就在附近，綠色那台就是我']
            : J.mode === 'car'
              ? ['在系館停車場顧車 🏎️', '定位傳你了']
              : ['在 278 打積分 🎧', '定位傳你了，進門右手邊第一個就是我'];
          return {
            r,
            then: () => {
              if (trackFriend(g, 'jianyu'))
                g.hud.toast('🧭 已設定導航到劍玉身邊（路線會跟著他走）', 'good', 2400);
            },
          };
        },
      },
      {
        t: '可以借車嗎？',
        match: /借車|開車|跑車|超跑|車子/,
        ask: (g) => {
          const lambo = !!g.jianyu?.state.thanked;
          return {
            r: [
              '停在資管系館西邊的停車場，鑰匙都在車上 🔑',
              lambo
                ? '藍寶堅尼也可以開了，小心一點喔 😂'
                : '法拉利跟保時捷隨你開，藍寶堅尼……等班費的事搞定再說',
            ],
            then: () => {
              const c = g.jianyu?.cars?.[0];
              if (c) {
                g.nav.set(c.pos.x, c.pos.z);
                g.hud.toast('🧭 已導航到劍玉的超跑', 'good', 2400);
              }
            },
          };
        },
      },
    ],
  },
  // 三位開發者（src/entities/npcs/DevNPC.js）：「你在哪？」說他現在在哪、在做什麼（宿舍、鐘塔、排球場、體育館外……），並導航過去
  houshe: {
    id: 'houshe',
    name: '開發者 侯舌',
    sub: '攝影社・系學會攝影長・韓團小卡',
    avatar: '<img class="ph-avimg" src="assets/gram/houshe_av.jpg" alt="">',
    color: '#3a3a40',
    unread: 2,
    history: [
      { day: '今天' },
      ['houshe', '侯舌報到 📷'],
      ['houshe', '你的競選照我修好了，要的話晚上來 276 拿檔案'],
    ],
    script: [
      {
        choices: [
          { t: '照片拍得超好！謝啦', r: ['小事 😎', '系學會攝影長不是當假的'], v: 1 },
          {
            t: '你跟羊明衫真的不合嗎？',
            r: ['哈哈哈那是謠言啦', '我們每次活動都一起拍一起修圖 📷'],
          },
        ],
      },
      {
        choices: [
          { t: '今天又跟哪個學妹約會？', r: ['……只是幫學妹拍照啦 🤫', '不要跟別人說'] },
          {
            t: '小卡收到第幾張了？',
            r: ['IVE、NewJeans、aespa 加起來 300 多張', '夾冊又要買新的了 💳'],
          },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！我的追蹤者都會看到 📢'], v: 1 },
          {
            t: '遊戲裡的店是你做的？',
            r: ['建築物裡面的規劃都是我排的', '麥當勞的櫃台跟內場動線我改了好幾版'],
          },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const H = g.houshe;
          if (!H?.mode) return { r: ['等我一下'] };
          if (H.mode === 'sleep')
            return {
              r: ['（已讀不回）'],
              then: () =>
                g.hud.toast('😴 侯舌在 276 寢的 4 號床睡覺，早上 9 點會起來寫程式', 'good', 2800),
            };
          if (H.mode === 'date') return { r: ['在約會啦 🤫', '晚點再找你'] };
          const r = {
            code: ['在 276 寫遊戲 💻', '定位傳你，進門左手邊第一個'],
            photo: ['在鐘塔幫學長姐拍畢業照 📷', '定位傳你'],
            volley: ['在體育館旁邊打排球 🏐', '來一起打'],
          }[H.mode] || ['在學校'];
          return {
            r,
            then: () => {
              if (trackFriend(g, 'houshe')) g.hud.toast('🧭 已設定導航到侯舌身邊', 'good', 2400);
            },
          };
        },
      },
    ],
  },
  richard: {
    id: 'richard',
    name: '開發者 理查',
    sub: '嘻研社・ARAM・電機所準研究生',
    avatar: '<img class="ph-avimg" src="assets/gram/richard_av.jpg" alt="">',
    color: '#2f4a32',
    unread: 2,
    history: [
      { day: '今天' },
      ['richard', '理查 🧢'],
      ['richard', '程式卡住的同學都可以叫來 280，我幫大家看。順便幫你拉票 🗳️'],
    ],
    script: [
      {
        choices: [
          { t: '大神帶我寫期末專題', r: ['沒問題', '晚上來 280，帶筆電就好 💻'], v: 1 },
          { t: '聽說你推掉大公司的 offer？', r: ['對啊', '想先讀碩班，做研究比較有趣 🔬'] },
        ],
      },
      {
        choices: [
          { t: '今晚 ARAM？', r: ['9 點以後我都在', '隨機英雄，輸了不准怪我 🎮'] },
          { t: '嘻研社成發什麼時候', r: ['下週！', '我有 solo 的段落 🕺'] },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！班上我一個一個提醒'], v: 1 },
          { t: '校園是你蓋的喔？', r: ['地圖跟建物都是我', '力行大樓的窗戶我數過 😂'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const R = g.richard;
          if (!R?.mode) return { r: ['等我一下'] };
          if (R.mode === 'sleep')
            return {
              r: ['（已讀不回）'],
              then: () =>
                g.hud.toast('😴 理查在 280 寢的 2 號床睡覺，早上 10 點會起來', 'good', 2800),
            };
          const r = {
            code: ['在 280 寫地圖 💻', '定位傳你，右手邊最裡面'],
            game: ['在 280 打 ARAM 🎮', '來的話幫我看一下小地圖'],
            dorm: ['在 280 練舞 🕺', '進來小心不要踢到喇叭'],
            battle: ['在系館前面跟羊明衫尬舞 🔥', '快來當評審'],
          }[R.mode] || ['在學校'];
          return {
            r,
            then: () => {
              if (trackFriend(g, 'richard')) g.hud.toast('🧭 已設定導航到理查身邊', 'good', 2400);
            },
          };
        },
      },
    ],
  },
  howard: {
    id: 'howard',
    name: '開發者 霍華德',
    sub: '魔術社・LOL・會計小老師',
    avatar: '<img class="ph-avimg" src="assets/gram/howard_av.jpg" alt="">',
    color: '#c9677f',
    unread: 2,
    history: [
      { day: '今天' },
      ['howard', '霍華德 🌹🃏'],
      ['howard', '手機 App 有 bug 的話直接跟我說，我馬上修'],
    ],
    script: [
      {
        choices: [
          { t: '會計學救我', r: ['借貸平衡就對了 😆', '晚上來 279，我畫 T 字帳給你看'], v: 1 },
          { t: '那朵玫瑰到底怎麼變的', r: ['祕密 🌹', '魔術師不能說的'] },
        ],
      },
      {
        choices: [
          { t: '今晚雙排？', r: ['LOL 還是特戰？', '我都可以 🎮'] },
          { t: '今天有去健身嗎', r: ['吃完晚餐就去', '體育館外面看得到我 💪'] },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！任務我幫你設計好了 😏'], v: 1 },
          { t: 'i-Piyan 是你做的？', r: ['大部分是', '定位跟訊息我改最多版'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const H = g.howard;
          if (!H?.mode) return { r: ['等我一下'] };
          if (H.mode === 'sleep')
            return {
              r: ['（已讀不回）'],
              then: () =>
                g.hud.toast('😴 霍華德在 279 寢的 3 號床睡覺，早上 9 點會起來', 'good', 2800),
            };
          const r = {
            code: ['在 279 寫任務 💻', '定位傳你，右手邊最裡面'],
            game: ['在 279 打遊戲 🎮', '打完這場'],
            dorm: ['在 279 練牌 🃏', '來，我變一個給你看'],
            gym: ['在體育館正門外重訓 💪', '定位傳你'],
            walk: ['跟女朋友在學校散步 💕', '散完就去健身房'],
            ride: ['騎忍 400 在外面兜風 🏍️', '晚點回宿舍'],
          }[H.mode] || ['在學校'];
          if (H.mode === 'walk' || H.mode === 'ride') return { r }; // out with his girlfriend / on his bike: no pin
          return {
            r,
            then: () => {
              if (trackFriend(g, 'howard')) g.hud.toast('🧭 已設定導航到霍華德身邊', 'good', 2400);
            },
          };
        },
      },
    ],
  },
  // Tzuyu（src/entities/npcs/Howard.js）：兔瓦斯成員、霍華德的女朋友，平常在韓國。「你在哪？」：晚餐後在學校跟霍華德散步，不然在首爾
  tzuyu: {
    id: 'tzuyu',
    name: '兔瓦斯 Tzuyu',
    sub: '兔瓦斯・霍華德的女朋友・首爾',
    avatar: '<img class="ph-avimg" src="assets/gram/tzuyu_av.jpg" alt="">',
    color: '#e8a0b4',
    unread: 1,
    history: [{ day: '今天' }, ['tzuyu', '我是 Tzuyu～加到了 😊']],
    script: [
      {
        choices: [
          { t: 'Winter 最近好嗎？', r: ['她很好喔～每天都在練舞', '一休息就在講你的事 💙'] },
          { t: '霍華德對妳好嗎', r: ['很好呀 😊', '就是魔術常常失敗 😂'] },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！兔瓦斯也幫你應援 🗳️'], v: 1 },
          { t: '什麼時候回韓國？', r: ['過幾天就要回去了', '有要帶給 Winter 的東西跟我說～'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) =>
          g.howard?.mode === 'walk'
            ? { r: ['在學校跟霍華德散步 💕', '晚點再聊～'] }
            : { r: ['在首爾 🇰🇷', '晚餐後我會跟霍華德在學校散步，有空來找我們'] },
      },
    ],
  },
  // Yulu（src/entities/npcs/Yulu.js）：商設系、吱吱的女朋友。「你在哪？」：商設館前、跟吱吱散步，或回宿舍了；
  // 加好友後她請你買無糖茶送去男生宿舍給吱吱（src/systems/quests/YuluTea.js 傳訊息）
  yulu: {
    id: 'yulu',
    name: '商設系 Yulu',
    sub: '商業設計系・吱吱的女朋友',
    avatar: '<img class="ph-avimg" src="assets/gram/yulu_av.jpg" alt="">',
    color: '#e3c068',
    unread: 1,
    history: [{ day: '今天' }, ['yulu', '我是 Yulu～加到了 😊']],
    script: [
      {
        choices: [
          { t: '妳跟吱吱怎麼認識的？', r: ['打排球認識的 🏐', '他跳發的時候超帥（不要跟他說）'] },
          { t: '商設的作業很多嗎', r: ['超多 😵', '這週要交兩份作品集'] },
        ],
      },
      {
        choices: [
          { t: '商設的票拜託了！', r: ['包在我身上 🗳️', '我們班群我會發'], v: 1 },
          { t: '下次一起打排球', r: ['好呀！', '叫吱吱教你跳發 🏐'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const Y = g.yulu;
          if (Y?.mode === 'walk') return { r: ['在跟吱吱散步 💕', '晚點再聊～'] };
          if (Y?.mode !== 'ssd') return { r: ['回宿舍了～', '白天我都在商設館前面'] };
          const at = Y.navPos();
          return {
            r: ['在商設館前面 🎨', '等同學一起交作業'],
            then: () => {
              if (at && g.nav?.set) {
                g.nav.set(at.x, at.z);
                g.hud.toast('🧭 已設定導航到 Yulu 那裡', 'good', 2400);
              }
            },
          };
        },
      },
    ],
  },
  // 品漢堡（src/entities/npcs/PinHan.js）：話少的讀書人。「你在哪？」：278 讀書、健身、正門口等車，週末約會或去 IKEA 時不給定位
  pinhan: {
    id: 'pinhan',
    name: '品漢堡',
    sub: '資管・278 寢・讀書人',
    avatar: '<img class="ph-avimg" src="assets/gram/pinhan_av.jpg" alt="">',
    color: '#3b5b8c',
    unread: 1,
    history: [{ day: '今天' }, ['pinhan', '嗯。加到了。']],
    script: [
      {
        choices: [
          { t: '在讀什麼？', r: ['資管所。', '計概。'] },
          { t: '週末去哪了？', r: ['……', '劍玉跟你說的？'] },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['嗯。票投你。'], v: 1 },
          { t: '下次去 IKEA 帶我', r: ['好。', '要買鯊魚嗎？'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const P = g.pinhan;
          if (!P?.mode) return { r: ['嗯？'] };
          if (P.mode === 'sleep') return { r: ['（已讀不回）'] };
          const r = {
            date: ['外面。', '……不要問。'],
            ikea: ['IKEA。', '要帶什麼？'],
            gym: ['體育館。', '練背。'],
            wait: ['正門口。', '車呢？'],
            dorm: ['278。', '讀書。'],
          }[P.mode] || ['學校。'];
          if (P.mode === 'date' || P.mode === 'ikea') return { r };
          return {
            r,
            then: () => {
              if (trackFriend(g, 'pinhan')) g.hud.toast('🧭 已設定導航到品漢堡那裡', 'good', 2400);
            },
          };
        },
      },
    ],
  },
  // 瑞哲（src/entities/npcs/Ruizhe.js）：278 寢的狼尾帥潮，愛 VTuber、愛內卷。打字常把名字打錯（劍玉 → 監獄、品漢堡 → 貧漢堡、
  // 彥霖 → 燕林），再補一句「*正確的名字」。「你在哪？」：寫作業、刷題、雙排、看直播、圖書館；週末去同人場時不給定位
  ruizhe: {
    id: 'ruizhe',
    name: '瑞哲',
    sub: '資管・278 寢・狼尾',
    avatar: '<img class="ph-avimg" src="assets/gram/ruizhe_av.jpg" alt="">',
    color: '#2f2f31',
    unread: 2,
    history: [
      { day: '今天' },
      ['ruizhe', '加到了～我是瑞哲 🐺'],
      ['ruizhe', '有空來 278 找我跟監獄打遊戲'],
      ['ruizhe', '*劍玉 😂 注音一直選錯字'],
    ],
    script: [
      {
        choices: [
          {
            t: '你又把劍玉打成監獄了',
            r: ['他的名字選字第一個就是監獄啊', '不是我的問題，是注音的問題 🙃'],
          },
          { t: '今晚在幹嘛？', r: ['刷題 → 跟監獄雙排 → 看直播', '*劍玉', '行程很滿 📅'] },
        ],
      },
      {
        choices: [
          {
            t: '資管要贏！',
            r: ['燕林衝！！', '*彥霖 我這手機是不是壞了 😭', '278 三票都投你 🗳️'],
            v: 1,
          },
          {
            t: '你都看誰的直播？',
            r: [
              '湊あくわ跟みけにゃこ。！',
              '阿誇打 APEX、咪萪喵唱歌',
              '今晚 11 點半，連結等等傳你 ✨',
            ],
          },
        ],
      },
      {
        choices: [
          { t: '品漢堡在幹嘛？', r: ['貧漢堡在讀書', '*品漢堡', '他好像連我們講話都聽不到'] },
          { t: '作業寫完了嗎？', r: ['當然，出來當天就寫完了', '要我分享思路嗎（不給答案）📚'] },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const R = g.ruizhe;
          if (!R?.mode) return { r: ['？'] };
          if (R.mode === 'sleep') return { r: ['（已讀不回）'] };
          if (R.mode === 'con') return { r: ['台北 同人場', '人超多 🥵 要幫你帶本子嗎'] };
          const r = {
            code: ['278 寫作業', '資結作業今天要寫完 💪'],
            lib: ['圖書館門口', '休息一下等等回去讀'],
            grind: ['278 刷題', '連續 386 天 不能斷 🔥'],
            duo: ['278 跟監獄雙排', '*劍玉'],
            stream: ['278 看直播', '噓 她在唱歌'],
          }[R.mode === 'dorm' ? R.act() : R.mode] || ['278'];
          return {
            r,
            then: () => {
              if (trackFriend(g, 'ruizhe')) g.hud.toast('🧭 已設定導航到瑞哲那裡', 'good', 2400);
            },
          };
        },
      },
    ],
  },
  // 黃蓋瑞（src/entities/npcs/Garry.js）：古箏社幹部，住彥霖隔壁。「你在哪？」每一輪都能問，他會說在跑道、活動中心還是房間，並設定導航跟著他
  garry: {
    id: 'garry',
    name: '古箏社 黃蓋瑞',
    sub: '古箏社幹部・住你隔壁',
    avatar: '<img class="ph-avimg" src="assets/gram/garry_av.jpg" alt="">',
    color: '#21486e',
    unread: 2,
    history: [
      { day: '今天' },
      ['garry', '鄰居好 我蓋瑞 🎶'],
      ['garry', '古箏社的群組我幫你宣傳了，成發那天大家都說要去投票'],
    ],
    script: [
      {
        choices: [
          {
            t: '感謝蓋瑞！成發我一定去聽',
            r: ['好喔 我們練了〈高山流水〉', '來的話坐第一排 我會緊張 😂'],
            v: 1,
          },
          {
            t: '你每天早上都去跑步喔？',
            r: ['對啊 早上跟傍晚各一次', '鬧鐘一響就出門，不然會賴床'],
          },
        ],
      },
      {
        choices: [
          { t: '明天早上一起跑步？', r: ['好啊！6 點體育園區見', '遲到的請早餐 🍳'] },
          { t: '你房間那個吐司燈好可愛', r: ['對吧！網購的，晚上會發光', '開了比較好睡'] },
        ],
      },
      {
        choices: [
          { t: '資管要贏！', r: ['票投彥霖！🎶🔥'], v: 1 },
          {
            t: '你也有在追 K-pop 喔？',
            r: ['那排專輯都是我的', '手燈有兩支，演唱會一起去搶票啊（拓原系統見）'],
          },
        ],
      },
    ],
    always: [
      {
        t: '你在哪？',
        match: /在哪|哪裡|哪邊|位置|定位/,
        ask: (g) => {
          const G = g.garry;
          if (!G?.mode) return { r: ['等我一下 手上在忙'] };
          if (G.mode === 'sleep')
            return {
              r: ['（已讀不回）'],
              then: () => g.hud.toast('😴 蓋瑞在房間睡覺，明天早上 7 點會被鬧鐘叫醒', 'good', 2600),
            };
          const r = {
            run: ['在體育園區跑步 🏃', '定位傳給你，要來一起跑嗎'],
            club: ['在活動中心的古箏社教室練琴 🎶', '定位傳給你了，3 樓走廊最西邊那間'],
            desk: ['在房間啊 就你隔壁', '從你們 2 樓樓梯口那扇門過來'],
          }[G.mode];
          return {
            r,
            then: () => {
              if (g.nav.track(G)) g.hud.toast('🧭 已設定導航到黃蓋瑞身邊', 'good', 2400);
            },
          };
        },
      },
    ],
  },
};

// 在 277 打麻將的人（src/systems/mahjong/Mahjong.js）：「你在哪？」先說在牌桌，不照平常的作息回答
for (const [id, c] of Object.entries(FRIEND_CONTACTS))
  for (const o of c.always || [])
    if (o.t === '你在哪？') {
      const ask = o.ask;
      o.ask = (g) => {
        const mj = g.mahjong?.where(id);
        if (!mj) return ask(g);
        return {
          r: mj.reply,
          then: () => {
            if (mj.pos && g.nav?.set) g.nav.set(mj.pos.x, mj.pos.z);
          },
        };
      };
    }
