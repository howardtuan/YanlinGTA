// 可以在校園裡認識、聊完再決定要不要加好友的同學。
// 加了好友：i-Piyan「訊息」多一個聊天室（src/ui/phone/Chats.js 的 FRIEND_CONTACTS），Peachgram 看得到他的貼文與限時動態。
// 好友名單會存檔（src/systems/SaveSystem.js 的 friends）。
import { makeMissionNpc } from '../../entities/NPC.js';
import { HANK_LOOK } from '../../entities/npcs/Hank.js';
import { MINGSHAN_LOOK } from '../../entities/npcs/Mingshan.js';
import { YEEMING_LOOK } from '../../entities/npcs/Yeeming.js';
import { JIANYU_LOOK } from '../../entities/npcs/Jianyu.js';
import { GD_LOOK, ZZ_LOOK } from '../../entities/npcs/FriendLooks.js';
import { FRIEND_CONTACTS } from './Chats.js';
import { FRIEND_POSTS } from './Feeds.js';

export { GD_LOOK, ZZ_LOOK };

export const FRIENDS = {
  zz: {
    name: '排球少年 吱吱', short: '吱吱', look: ZZ_LOOK,
    // 體育館南牆西段的入口雨遮（src/world/MapBuilder.js entrance_canopy）旁、體育館與游泳池之間的走道，面向走道西口
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
    // 在正門外的茶學苑打工時（src/systems/minigames/TeaShop.js）說的話
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
  // 戈登肉鋪店長 女拳大帝：火爆、愛健身、打 LOL 很在意輸贏、超愛麥當勞。站在櫃台後面（src/world/Interiors.js 的
  // buildGordon 給位置）；跟他說話、結帳都在櫃台（src/entities/npcs/Gordon.js），結完帳還不是好友的話他會問要不要互加。
  // 漢克（src/entities/npcs/Hank.js）：資管系同學、女拳大帝的室友。晚上在麥當勞內場炸薯條，其他時間騎 ZMAX 兜風或背吉他散步；
  // 他會動，沒有固定位置（spot 回傳 null），說話由 src/entities/npcs/Hank.js 觸發：散步時（先彈吉他）用 intro，在內場用 work。
  // YeeMing（src/entities/npcs/Yeeming.js）：物理系、羊明衫的男朋友，正在當兵（迷彩軍服、鋼盔）。spot 為 null：人由 src/entities/npcs/Yeeming.js 放，
  // 聊天由 src/entities/npcs/Yeeming.js 呼叫 talk('yeeming', 'walk' | 'volley')；跟他們聊天彥霖每次都會問「要不要打麻將？」
  yeeming: {
    name: 'YeeMing', short: 'YeeMing', look: YEEMING_LOOK, spot: () => null,
    intro: [
      ['YeeMing', '嗨彥霖！我是 YeeMing，物理系的，跟你同屆 🪖'],
      ['彥霖', '你怎麼穿迷彩？……對了，要不要打麻將？'],
      ['YeeMing', '哈哈哈我在當兵啦，今天放假。麻將等我下次休假，三缺一一定揪你 🀄'],
      ['YeeMing', '選會長我挺你！物理系那邊我幫你拉票。加個好友吧～'],
    ],
    again: [['彥霖', '要不要打麻將？'], ['YeeMing', '等我休假啦哈哈。要不要先互加好友？']],
    yes: [['YeeMing', '加到了！休假的時候約打排球，或……打麻將 🀄😆']],
    no: [['YeeMing', '好喔～放假的時候常在學校，想加再找我']],
    chat: [
      [['彥霖', '要不要打麻將？'], ['YeeMing', '收假前一晚可以！先說好不能放水 🀄']],
      [['彥霖', '要不要打麻將？'], ['YeeMing', '你每次都問這個欸哈哈哈，好啦休假就打']],
      [['YeeMing', '當兵每天五點半起床，回學校反而覺得好輕鬆 😂']],
      [['YeeMing', '投票那天我剛好休假，一定回來投你一票 🗳️']],
    ],
    walk: {
      intro: [
        ['羊明衫', '彥霖～這是我男朋友 YeeMing 😊'],
        ['YeeMing', '嗨！我物理系的，跟你同屆。常聽明衫說你選會長超拚的，加油！'],
        ['彥霖', '你們好閃……對了，你們要不要打麻將？'],
        ['YeeMing', '麻將！？我現在在當兵，今天剛好放假出來陪她，下次休假一定打 🀄'],
        ['羊明衫', '我們是宿營的時候認識的，他還為了我把菸戒了 😌'],
        ['YeeMing', '戒菸比當兵還難好嗎……對了，我們加個好友吧！物理系的票我幫你拉。'],
      ],
      again: [['彥霖', '所以……要不要打麻將？'], ['YeeMing', '哈哈哈休假再說！先互加好友？']],
      chat: [
        [['彥霖', '要不要打麻將？'], ['羊明衫', '他會輸到脫褲子啦 😂'], ['YeeMing', '……我最近有在練好嗎']],
        [['彥霖', '要不要打麻將？'], ['YeeMing', '收假前一晚可以！明衫負責算台 🀄']],
        [['彥霖', '要不要打麻將？'], ['羊明衫', '先說好，我們只是在散步，不要拐他去打牌 😤']],
      ],
    },
    volley: {
      intro: [
        ['YeeMing', '欸彥霖！來打排球嗎？明衫在忙，我先來練一下。'],
        ['彥霖', '你排球打得不錯欸……對了，要不要打麻將？'],
        ['YeeMing', '哈哈哈哈怎麼又是麻將，等我休假！吱吱常跟我在這邊打球，下次一起來。'],
        ['YeeMing', '我們加個好友吧，選會長我挺你 🏐'],
      ],
      chat: [
        [['彥霖', '要不要打麻將？'], ['YeeMing', '先陪我墊球 100 下再說 🏐']],
        [['YeeMing', '吱吱等等也會來，三個人可以練傳球']],
        [['彥霖', '要不要打麻將？'], ['YeeMing', '你這個人……好啦休假晚上 🀄']],
      ],
    },
  },
  // 羊明衫（src/entities/npcs/Mingshan.js）：資管系的內捲王、舞蹈專家（想進 K-POP 女團），晚上是麥當勞的值班經理（外場櫃台）；
  // spot 為 null：人由 src/entities/npcs/Mingshan.js 放，聊天由 src/entities/npcs/Mingshan.js 呼叫 talk('mingshan', 'dance' | 'work')。
  mingshan: {
    name: '羊明衫', short: '羊明衫', look: MINGSHAN_LOOK, spot: () => null,
    intro: [
      ['羊明衫', '彥霖！你也來系館喔～我在練宿營的舞 💃'],
      ['彥霖', '跳得超好！你是不是有在學舞？'],
      ['羊明衫', '從小學到現在啦，以後想去韓國當練習生，進女團 ✨'],
      ['彥霖', '然後你還是我們班第一名……你到底有什麼不會的？'],
      ['羊明衫', '哈哈哈沒有啦，只是比較早開始讀而已。期末考範圍我整理好筆記了，要的話傳給你。'],
      ['羊明衫', '牠是我養的橘貓，練舞的時候都會跟著我。牠很挑嘴，只吃戈登肉鋪的肉 😂 摸頭倒是可以！'],
      ['羊明衫', '我們好像還沒互加？加一下吧，選舉要幫忙拍宣傳舞蹈影片也可以找我 🎬'],
    ],
    again: [['羊明衫', '要互加嗎？期末筆記跟宿營的舞步影片都可以傳你 💃']],
    yes: [['羊明衫', '加到了！晚上我在活動中心麥當勞當值班經理，來的話薯條幫你多裝一點（小聲）🍟']],
    no: [['羊明衫', '好喔～想加再跟我說，白天我都在系館前面練舞。']],
    chat: [
      [['羊明衫', '宿營的舞還差最後一段 8 拍，今天一定要練起來 💪']],
      [['羊明衫', '資料庫的作業我寫完了，卡住可以問我喔']],
      [['羊明衫', '橘貓今天又偷吃我的早餐 😾']],
      [['羊明衫', '彥霖加油！班上的票我幫你拉 🗳️']],
      [['羊明衫', '最近在練 NewJeans 的舞，等選完我們跳一支慶功舞！']],
    ],
    dance: {
      chat: [
        [['羊明衫', '（一邊數拍子）五、六、七、八——欸彥霖！'], ['羊明衫', '這段 8 拍是宿營的開場，看起來帥嗎？']],
        [['羊明衫', '跳舞跟讀書一樣，每天練一點就會進步 😆']],
        [['羊明衫', '橘貓在旁邊當評審，跳錯牠會打哈欠 🐱']],
      ],
    },
    work: {
      intro: [
        ['羊明衫', '歡迎光臨麥當勞～欸，彥霖！'],
        ['羊明衫', '我是今晚的值班經理，漢克在裡面顧薯條爐。要點什麼嗎？'],
        ['彥霖', '你白天練舞、晚上上班，還是全班第一……'],
        ['羊明衫', '時間排好就做得完啦～對了，我們互加一下好友吧！'],
      ],
      again: [['羊明衫', '今天要大麥克還是麥香雞？順便……要互加嗎？']],
      chat: [
        [['羊明衫', '歡迎光臨～今天薯條剛炸好，漢克炸的喔 🍟']],
        [['羊明衫', '值班經理要顧整間店，忙完再回去讀書～']],
        [['羊明衫', '晚上客人比較多，漢克在後面炸到手痠 😂']],
      ],
    },
  },
  hank: {
    name: '漢克', short: '漢克', look: HANK_LOOK, noTalk: true, spot: () => null,
    intro: [
      ['彥霖', '好好聽！這是什麼團的歌？'],
      ['漢克', '一個獨立樂團，下個月在 live house 有演出，我超想去 🎧'],
      ['漢克', '彥霖，選舉跑得怎樣？我們系上都在聊你。'],
      ['彥霖', '還在拚！你那個專題系統拿第一名真的超強。'],
      ['漢克', '運氣好啦哈哈。對了，我室友女拳大帝說你有去他那邊買肉？'],
      ['漢克', '同系這麼久，好像還沒互加耶。有程式問題、想聽團、想半夜騎車上山看夜景都可以找我 🏍️'],
    ],
    again: [['漢克', '再彈一段給你聽 🎸'], ['漢克', '所以……要不要互加？']],
    yes: [['漢克', '讚！晚點傳我最近在聽的歌單給你，還有今晚的夜景照 🌃']],
    no: [['漢克', 'OK 啊，想加再跟我說。晚上 6 點到 10 點我都在活動中心麥當勞。']],
    chat: [
      [['漢克', '今晚騎 ZMAX 去五指山看夜景，要不要一起？']],
      [['漢克', '專題那套系統我放上 GitHub 了，有空幫我看 code 😆']],
      [['漢克', '女拳大帝昨晚又在客廳打 LOL 大吼，我耳機開最大聲還是聽得到']],
      [['漢克', '週末 live house 有演出，要不要一起去聽團？']],
      [['漢克', '剛幫 ZMAX 換新輪胎，過彎超穩 🏍️']],
    ],
    work: {
      intro: [
        ['漢克', '欸，彥霖？你怎麼跑進內場了 😂'],
        ['漢克', '我晚上都在這邊顧薯條爐到 10 點，外場是值班經理羊明衫。下班再騎車去看夜景。'],
        ['漢克', '對了，我們同系這麼久好像還沒互加？加一下吧，有程式問題也可以問我。'],
      ],
      again: [['漢克', '薯條剛起鍋，要不要偷吃一根？開玩笑的～要互加好友嗎？']],
      chat: [
        [['漢克', '薯條爐 3 分鐘一鍋，嗶嗶聲聽到都快變成背景音樂了 🍟']],
        [['漢克', '晚上客人好多，羊明衫在外場一直喊單，我下班要去騎車放鬆一下 🏍️']],
        [['漢克', '偷偷說，小芸也說會投給你 🤫']],
      ],
    },
  },
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
  // 黃蓋瑞：古箏社幹部，住彥霖隔壁（同一層不同戶）。會在跑道跑步、在活動中心的古箏社教室、在房間，
  // 角色和行程在 src/entities/npcs/Garry.js（spot 為 null：這裡不放固定的人，聊天由 src/entities/npcs/Garry.js 呼叫 talk('garry', 地點)）
  // 劍玉（src/entities/npcs/Jianyu.js）：基隆航海王、資管三甲班代。住力行 278，白天在資管系館停車場顧他的超跑，晚上在寢室打特戰英豪；
  // spot 為 null：人由 src/entities/npcs/Jianyu.js 放，聊天由 src/entities/npcs/Jianyu.js 呼叫 talk('jianyu', 'car' | 'room')。第一次見面他會拜託你查班費失竊案。
  jianyu: {
    name: '基隆航海王 劍玉', short: '劍玉', look: JIANYU_LOOK, spot: () => null,
    intro: [
      ['劍玉', '欸彥霖，你怎麼跑來 278？我這局剛打完 🎧'],
      ['彥霖', '班代大人！又在打積分喔？'],
      ['劍玉', '特戰英豪，剛上鑽石 II。不過我今天其實有點煩……'],
      ['劍玉', '我放在桌上的信封不見了，裡面是三甲的班費 2000。'],
      ['劍玉', '錢我自己補是沒差，但那是全班的錢，我想知道是誰拿的。你資管的，幫我查查看？'],
      ['劍玉', '我的電競筆電就在桌上，宿舍自治會把 278 的刷卡紀錄匯出來了，你直接用。'],
      ['劍玉', '對了，我們好像還沒互加？加了的話，我停在系館的車借你開 🏎️'],
    ],
    again: [['劍玉', '要互加嗎？加了的話，系館那邊的車借你開 🏎️']],
    yes: [['劍玉', '加到了！系館停車場的法拉利跟保時捷你想開就開，鑰匙都在車上。藍寶堅尼那台我比較寶貝……之後再說 😅']],
    no: [['劍玉', '好喔，想開車的時候再來找我']],
    chat: [
      [['劍玉', '今晚要不要雙排？我帶你上分 🎯']],
      [['劍玉', '班費的事謝了，三甲那邊我會幫你拉票']],
      [['劍玉', '車子開完記得停回系館就好，油我會加 😂']],
      [['劍玉', '週末要回基隆，廟口的天婦羅要不要幫你帶？']],
    ],
    car: { // 資管系館停車場
      intro: [
        ['劍玉', '彥霖！來看車喔？這三台都是我的。學校裡其他跑車……是我借給朋友開的啦 😂'],
        ['彥霖', '基隆航海王果然名不虛傳……'],
        ['劍玉', '別這樣叫我啦。對了，有件事想拜託你——'],
        ['劍玉', '我放在宿舍桌上的 2000 塊班費不見了。力行 278，進門右手邊第一個床位就是我的。'],
        ['劍玉', '你資管的，幫我查查看？我的電競筆電在桌上，宿舍的刷卡紀錄都匯出來了。'],
        ['劍玉', '我們還沒互加吧？加了的話，這邊的車你隨便開。'],
      ],
      chat: [
        [['劍玉', '今天開保時捷來，太陽太大，法拉利的皮椅會燙']],
        [['劍玉', '想開哪台自己挑，記得停回來就好']],
        [['劍玉', '晚上 5 點以後我就回 278 打積分了']],
      ],
    },
  },
  garry: {
    name: '古箏社 黃蓋瑞', short: '黃蓋瑞', spot: () => null,
    intro: [
      ['黃蓋瑞', '欸彥霖！你也住這附近對吧，我就住你隔壁啊'],
      ['彥霖', '蓋瑞！原來牆壁另一邊是你，難怪半夜都聽到古箏的聲音'],
      ['黃蓋瑞', '哈哈那是我在練期末成發的曲子啦，吵到你喔？'],
      ['彥霖', '不會啦，聽了蠻好睡的'],
      ['黃蓋瑞', '我古箏社幹部，社團那邊我幫你拉票。欸，我們好像還沒互加？'],
    ],
    again: [['黃蓋瑞', '想好了嗎？要不要互加？鄰居耶']],
    yes: [['黃蓋瑞', '加到了！有空來活動中心的古箏社教室聽我們練團，早上也可以一起去操場跑步 🏃']],
    no: [['黃蓋瑞', '好喔，反正我就住隔壁，想加隨時敲門 🚪']],
    chat: [
      [['黃蓋瑞', '今天又跑了 5 公里，跑完腳好軟']],
      [['黃蓋瑞', '古箏社期末成發快到了，來聽喔 🎶']],
      [['黃蓋瑞', '早上的鬧鐘大家都說很吵……但不吵我起不來']],
      [['黃蓋瑞', '社團那邊大家都說要投你，放心 🗳️']],
    ],
    run: { // on the track
      intro: [
        ['黃蓋瑞', '（喘）……彥霖？你也來跑步喔'],
        ['彥霖', '蓋瑞！我是來拉票的啦，你每天都跑嗎？'],
        ['黃蓋瑞', '早上跑一次、傍晚跑一次，彈古箏要坐很久，不跑腰會痠'],
        ['黃蓋瑞', '我就住你隔壁欸，古箏社幹部，社團那邊我幫你拉票。我們好像還沒互加？'],
      ],
      chat: [
        [['黃蓋瑞', '（喘）第……第八圈了，再兩圈就收工']],
        [['黃蓋瑞', '要一起跑嗎？配速 5 分半，不會太快啦']],
        [['黃蓋瑞', '跑完要去吃早餐，蛋餅加起司 🍳']],
      ],
    },
    club: { // 古箏社教室 in 學生活動中心 (src/world/buildings/ClubRoom.js)
      intro: [
        ['黃蓋瑞', '歡迎來古箏社教室～欸，彥霖！'],
        ['彥霖', '蓋瑞！原來你是古箏社的'],
        ['黃蓋瑞', '對啊我是幹部，在幫社團準備期末成發，零基礎也可以來學喔 🎶'],
        ['黃蓋瑞', '我就住你隔壁啦，社團那邊我幫你拉票。我們好像還沒互加？'],
      ],
      chat: [
        [['黃蓋瑞', '這首是〈高山流水〉，練了一整個學期']],
        [['黃蓋瑞', '指甲要用膠布貼，彈久了手指會痛 😂']],
        [['黃蓋瑞', '期末成發在活動中心，記得來喔，社員都說要投你']],
        [['黃蓋瑞', '琴盒要直著放，不然面板會變形……幹部就是要顧這些 😮‍💨']],
        [['黃蓋瑞', '要不要試彈一下？我教你 do re mi 的位置']],
      ],
    },
    room: { // at home next door
      intro: [
        ['黃蓋瑞', '欸？彥霖，你怎麼跑來了，門沒鎖喔？'],
        ['彥霖', '哈哈路過，想說來看看鄰居'],
        ['黃蓋瑞', '隨便坐，沙發是 IKEA 的，很好坐'],
        ['黃蓋瑞', '對了，我們還沒互加吧？古箏社那邊我幫你拉票'],
      ],
      chat: [
        [['黃蓋瑞', '桌上那個吐司是小夜燈啦，晚上很可愛']],
        [['黃蓋瑞', '那排專輯是我的寶貝，手燈也是，不准亂動 😤']],
        [['黃蓋瑞', '明天早上的鬧鐘……你聽了就知道 ⏰']],
      ],
    },
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
        cond: () => n.ch.root.visible, // at work (src/systems/minigames/TeaShop.js) he isn't here
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
