// 一鍵通關：要打指令或程式碼的任務（主線布條案、三個 SQL 支線案、霍華德的 Two Sum），都可以改成自動通關。
// 給不是資訊背景、或用手機不好打字的玩家：第一次進入這些任務時會先問一次要不要自動通關，
// 選了「我自己來」之後反悔，也可以隨時按畫面上的「🎬 一鍵通關」。
// 自動通關是一段 21:9 的教學動畫（src/ui/AutoSolveUI.js）：一行一行把指令打出來、真的執行，
// 旁邊的字幕卡說明這一行在做什麼、每個關鍵字的意思；可以按「下一步」慢慢看，也可以自動播放。
//  - SQL 案件：每一行都丟進偵探模式真正的終端機引擎（src/systems/minigames/Detective.js run），
//    線索、指認、破案獎金和存檔全部照原本的流程走，所以主線判斷（D.solved('banner')）不用改。
//  - Two Sum：把答案一行一行打進編輯器，最後按原本的「提交」，由 Pyodide 真的批改（src/systems/quests/HowardTwoSum.js）；
//    Python 載入失敗（沒網路）時直接判定通過，不讓玩家卡住。
// 破案之後可以「🔁 再破一次」（手動或自動）：用練習模式的暫時進度，不會動到存檔、也不會再拿一次獎金。
// 這個檔案只有資料（每個任務的步驟）和「問過了沒」的存檔狀態；畫面在 src/ui/AutoSolveUI.js。

// step: { input: 要打的那一行, say: 這一行在做什麼（HTML）, parts?: [[關鍵字, 意思], ...] }
// Two Sum 的 step 另外有 code（打進編輯器的那一行，含縮排）或 act（'run' 執行範例／'submit' 提交）
export const SCRIPTS = {
  banner: {
    kind: 'sql',
    title: '🚩 布條失竊案',
    intro:
      '我們要用 <b>SQL</b>（查資料庫的語言）一步一步翻監視器、學生名單、發票和門禁紀錄，找出割布條的人。<br>會用到：<code>SELECT</code> 查資料、<code>WHERE</code> 篩選、<code>LIKE</code> 模糊比對、<code>JOIN</code> 把兩張表接起來。',
    steps: [
      {
        input: 'tables',
        say: '先看看這份「校園紀錄」裡有哪些<b>資料表</b>。資料表就像 Excel 的工作表：一列是一筆紀錄，一欄是一種資料。',
        parts: [['tables', '偵探模式的指令：列出所有資料表和它們的欄位']],
      },
      {
        input: 'SELECT * FROM banners;',
        say: '先搞清楚案發經過：布條是幾點、在哪裡被拆的。6 條布條在 <b>13:05～13:41</b> 之間一條一條被割掉。',
        parts: [
          ['SELECT', '「我要查資料」'],
          ['*', '所有欄位都要'],
          ['FROM banners', '從 banners（布條）這張表'],
          [';', '一句 SQL 的結尾'],
        ],
      },
      {
        input: "SELECT camera, time, plate FROM cctv WHERE time BETWEEN '13:00' AND '13:45';",
        say: '去翻<b>監視器</b>：只看案發那段時間。每個布條被拆的地點，幾分鐘前都拍到同一台機車 <b>MKZ-8?3</b>（中間一碼看不清楚）。',
        parts: [
          ['camera, time, plate', '只拿這三個欄位：哪支監視器、幾點、車牌'],
          ['WHERE', '加上條件，只留下符合的資料'],
          ["BETWEEN '13:00' AND '13:45'", '時間在 13:00 到 13:45 之間'],
        ],
      },
      {
        input: "SELECT name, dept, plate FROM students WHERE plate LIKE 'MKZ-8_3';",
        say: '車牌少一碼，用 <code>LIKE</code> 模糊比對找車主：符合的學生有三個 —— <b>小強、小傑、小明</b>。',
        parts: [
          ['FROM students', '從學生名單找（裡面有登記的機車車牌）'],
          ['LIKE', '「長得像」：可以用萬用字元比對'],
          ["'MKZ-8_3'", '底線 _ 代表「剛好一個任意字」，所以 MKZ-813、MKZ-853、MKZ-893 都符合'],
        ],
      },
      {
        input:
          "SELECT s.name, p.store, p.time, p.item FROM purchases p JOIN students s ON p.student_id = s.id WHERE p.item = '美工刀';",
        say: '割布條需要刀子。查<b>發票</b>裡誰在案發前買了美工刀：<b>小明</b>（12:38）和<b>小強</b>（12:44），小傑沒有。',
        parts: [
          ['purchases p', '發票表，取個短名字叫 p'],
          ['JOIN students s', '把學生表（短名 s）接進來，才看得到名字'],
          ['ON p.student_id = s.id', '接的規則：發票上的學生編號 = 學生的編號'],
          ["WHERE p.item = '美工刀'", '只看買美工刀的發票'],
        ],
      },
      {
        input:
          "SELECT s.name, a.place, a.time, a.action FROM access_log a JOIN students s ON a.student_id = s.id WHERE s.plate LIKE 'MKZ-8_3';",
        say: '剩兩個人，查<b>門禁刷卡</b>看誰有不在場證明：小強 12:58 進圖書館、14:12 才出來，布條被拆時他都在館內。所以不是他。',
        parts: [
          ['access_log a', '門禁紀錄表，短名 a'],
          ['JOIN students s ON …', '一樣接上學生表，把編號換成名字'],
          ["WHERE s.plate LIKE 'MKZ-8_3'", '只看三個嫌犯的進出'],
        ],
      },
      {
        input:
          "SELECT s.name, p.time, p.content FROM posts p JOIN students s ON p.student_id = s.id WHERE p.content LIKE '%任務%';",
        say: '最後補一刀：看公開貼文。小明 13:50 發文「<b>任務完成 😎</b>」，時間剛好在最後一條布條被拆之後。',
        parts: [
          ['FROM posts p', '貼文表'],
          [
            "LIKE '%任務%'",
            '百分比 % 代表「任意長度的任意字」，所以這是「內容裡有『任務』兩個字」',
          ],
        ],
      },
      {
        input: 'accuse 小明',
        say: '證據齊了：車牌對得上、案發前買了美工刀、沒有不在場證明、還發文炫耀。指認犯人！',
        parts: [['accuse 名字', '偵探模式的指令：指認犯人（證據不夠會被打回票）']],
      },
    ],
  },
  fries: {
    kind: 'sql',
    title: '🍟 麥當勞薯條失蹤案',
    intro:
      '薯條「炸了幾份」和「賣了幾份」對不起來。我們要把兩張表接起來相減，再依員工加總，看誰負責的時段薯條不見最多。<br>會用到：<code>JOIN</code>、算式、<code>GROUP BY</code> 分組加總。',
    steps: [
      {
        input: 'SELECT * FROM fry_log;',
        say: '先看<b>炸台紀錄</b>：每天分三個時段，誰在炸、炸了幾份。',
        parts: [['SELECT * FROM fry_log', '把炸台紀錄整張表列出來']],
      },
      {
        input: 'SELECT * FROM sales;',
        say: '再看<b>銷售</b>：同樣的日期和時段，賣掉幾份。兩張表都有 <code>day</code> 和 <code>block</code>，可以對起來。',
        parts: [['SELECT * FROM sales', '把銷售整張表列出來']],
      },
      {
        input:
          'SELECT f.day, f.block, f.staff, f.portions - s.fries_sold AS 不見的份數 FROM fry_log f JOIN sales s ON f.day = s.day AND f.block = s.block;',
        say: '把同一天、同一時段接起來，<b>炸的減掉賣的</b>：11/19 和 11/20 的 15-19 時段各少了 12、13 份，其他時段最多差 1 份。',
        parts: [
          ['JOIN … ON f.day = s.day AND f.block = s.block', '日期和時段都一樣的兩筆才接在一起'],
          ['f.portions - s.fries_sold', 'SQL 可以直接算數：炸了幾份 − 賣了幾份'],
          ['AS 不見的份數', '幫算出來的欄位取名字'],
        ],
      },
      {
        input:
          'SELECT f.staff, SUM(f.portions - s.fries_sold) AS 不見的份數 FROM fry_log f JOIN sales s ON f.day = s.day AND f.block = s.block GROUP BY f.staff ORDER BY 不見的份數 DESC;',
        say: '依「炸台人員」分組加總：<b>小胖</b>負責的時段三天加起來少了 <b>25 份</b>，其他人幾乎都對得上。',
        parts: [
          ['GROUP BY f.staff', '同一個人的資料歸成一組'],
          ['SUM(…)', '把每一組的數字加起來'],
          ['ORDER BY … DESC', '由大到小排序（DESC 是遞減）'],
        ],
      },
      {
        input: 'accuse 小胖',
        say: '兩個關鍵時段都是小胖在炸，數字也對得上。指認！',
        parts: [['accuse 小胖', '指認犯人']],
      },
    ],
  },
  seat: {
    kind: 'sql',
    title: '📚 圖書館占位之謎',
    intro:
      '有人預約了座位卻不來。先找出沒報到的預約，再把帳號換成「帳號主人」，依人數一數誰最誇張（一個人可能有好幾個帳號）。<br>會用到：<code>WHERE</code>、<code>JOIN</code>、<code>GROUP BY</code> + <code>COUNT</code>。',
    steps: [
      {
        input: 'SELECT * FROM reservations WHERE checked_in = 0;',
        say: '只看<b>沒報到</b>的預約：a02 和 a07 每天都預約 3F-01、3F-02，卻一次都沒來。',
        parts: [
          ['FROM reservations', '座位預約表'],
          ['WHERE checked_in = 0', 'checked_in 是 0 代表沒報到'],
        ],
      },
      {
        input:
          'SELECT a.owner, COUNT(*) AS 沒報到次數 FROM reservations r JOIN accounts a ON r.account = a.account WHERE r.checked_in = 0 GROUP BY a.owner ORDER BY 沒報到次數 DESC;',
        say: '把帳號換成主人再分組數次數：a02 和 a07 <b>都是小翔的帳號</b>，他總共占了 <b>6 次</b>位子沒報到。',
        parts: [
          ['JOIN accounts a ON r.account = a.account', '接上帳號表，看帳號是誰的'],
          ['GROUP BY a.owner', '依帳號主人分組'],
          ['COUNT(*)', '數每一組有幾筆'],
        ],
      },
      {
        input: 'accuse 小翔',
        say: '一個人開兩個帳號天天占位，就是他。指認！',
        parts: [['accuse 小翔', '指認犯人']],
      },
    ],
  },
  jianyu: {
    kind: 'sql',
    title: '💰 劍玉的班費失竊案',
    intro:
      '班費在寢室裡不見了。先從刷卡紀錄找出案發時間和進過寢室的人，再看誰很快花了一大筆現金，最後抓出說謊的人。<br>會用到：<code>WHERE</code>、<code>BETWEEN</code>、<code>ORDER BY</code>。',
    steps: [
      {
        input: "SELECT * FROM room_log WHERE name = '劍玉';",
        say: '先看劍玉自己的刷卡：<b>13:10 出門、17:30 回來</b>，錢就是在這段時間不見的。',
        parts: [
          ['FROM room_log', '278 寢室門的刷卡紀錄'],
          ["WHERE name = '劍玉'", '只看劍玉的；文字要用單引號包起來'],
        ],
      },
      {
        input: "SELECT * FROM room_log WHERE time BETWEEN '13:10' AND '17:30';",
        say: '那段時間誰進過寢室？<b>小宏、小澤、小誠</b>三個人。小澤只待了 6 分鐘，有點可疑。',
        parts: [["BETWEEN '13:10' AND '17:30'", '時間在劍玉出門和回來之間']],
      },
      {
        input:
          "SELECT time, store, buyer, item, price FROM purchases WHERE pay = '現金' ORDER BY price DESC;",
        say: '拿走 2000 塊的人可能很快就花掉：<b>小澤 14:41 用現金買了 2000 元的遊戲點數卡</b>，離開寢室才 15 分鐘。',
        parts: [
          ["WHERE pay = '現金'", '只看用現金付的'],
          ['ORDER BY price DESC', '金額由大到小排，最貴的在最上面'],
        ],
      },
      {
        input: 'SELECT * FROM group_chat;',
        say: '對一下群組的說法：小澤說「我今天一整天都在圖書館」，可是 14:20 他刷卡進了 278 —— <b>他說謊</b>。',
        parts: [['FROM group_chat', '寢室群組的對話']],
      },
      {
        input: 'accuse 小澤',
        say: '進過寢室、馬上花掉 2000 現金、還說謊。指認！',
        parts: [['accuse 小澤', '指認犯人']],
      },
    ],
  },
  twosum: {
    kind: 'code',
    title: '🧩 霍華德的 Two Sum',
    intro:
      '題目：在 <code>nums</code> 裡找兩個數字，加起來等於 <code>target</code>，回傳它們的位置。<br>霍華德要 <b>O(N)</b>：只能把陣列從頭到尾<b>走一次</b>。訣竅是用一本「筆記本」（字典 dict）記住看過的數字和位置。',
    steps: [
      {
        input: 'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:',
        say: '這兩行是題目給好的「外殼」（LeetCode 的格式）：一個叫 <code>Solution</code> 的類別，裡面的 <code>twoSum</code> 函式收到 <code>nums</code> 和 <code>target</code>。我們從下一行開始寫。',
        parts: [
          ['class Solution:', '定義一個類別（LeetCode 規定的格式）'],
          ['def twoSum(…)', '定義函式；nums 是數字清單、target 是目標'],
          ['-> List[int]', '說明它會回傳一個整數清單（兩個索引）'],
        ],
      },
      {
        code: '        seen = {}',
        say: '準備一本空的筆記本 <code>seen</code>：之後記「看過的數字 → 它在第幾個位置」。',
        parts: [
          ['seen', '變數名稱，意思是「看過的」'],
          ['{}', '空的字典（dict）：用「鍵」查「值」，查一次幾乎不花時間'],
        ],
      },
      {
        code: '        for i, x in enumerate(nums):',
        say: '從頭到尾走一次 <code>nums</code>：每一輪拿到位置 <code>i</code> 和數字 <code>x</code>。',
        parts: [
          ['for … in …:', '迴圈：清單裡的每一個都做一次'],
          ['enumerate(nums)', '同時給「第幾個」和「數字本身」'],
          ['i, x', 'i 是位置（從 0 開始），x 是數字'],
        ],
      },
      {
        code: '            need = target - x',
        say: '要湊到 <code>target</code>，還差多少？例如 target 是 9、現在是 2，就還需要 7。',
        parts: [['need = target - x', '算出「另一半」應該是多少']],
      },
      {
        code: '            if need in seen:',
        say: '翻筆記本：<b>之前看過這個「另一半」嗎？</b>字典的 <code>in</code> 查找是 O(1)，不用再掃一次清單。',
        parts: [
          ['if …:', '如果條件成立，才做下面縮排的那行'],
          ['need in seen', '筆記本裡有沒有 need 這個數字'],
        ],
      },
      {
        code: '                return [seen[need], i]',
        say: '有！答案就是「另一半的位置」和「現在的位置」，直接回傳。',
        parts: [
          ['return', '把結果交出去，函式結束'],
          ['seen[need]', '從筆記本查出另一半在第幾個'],
        ],
      },
      {
        code: '            seen[x] = i',
        say: '沒有的話，把現在這個數字和位置記進筆記本，繼續看下一個。注意這行跟 <code>if</code> 對齊：每一輪都會做。',
        parts: [['seen[x] = i', '在筆記本寫下「數字 x 在第 i 個」']],
      },
      {
        act: 'run',
        input: '▶ 執行範例',
        say: '先跑題目的三個範例，確認答案都對（第一次要下載 Python，大約 10 秒）。',
      },
      {
        act: 'submit',
        input: '提交',
        say: '提交！會跑完整測資，還會量時間確認真的是 O(N)。',
      },
    ],
  },
};

// the final code the Two Sum script types (the starter plus every `code` line): also used by the tests
export const TWO_SUM_SOLUTION = `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n${SCRIPTS.twosum.steps
  .filter((s) => s.code)
  .map((s) => s.code)
  .join('\n')}\n`;

// which tasks the player was already asked about (the "自動通關嗎？" pop-up shows once per task) and which they
// cleared with the one-click button (only for the record: rewards are the same either way). Saved in the game save.
export class AutoSolve {
  constructor(game) {
    this.g = game;
    this.state = { asked: [], auto: [] };
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    this.state = {
      asked: Array.isArray(d?.asked) ? d.asked : [],
      auto: Array.isArray(d?.auto) ? d.auto : [],
    };
  }
  // true the first time only: the caller shows the pop-up
  ask(id) {
    if (!SCRIPTS[id] || this.state.asked.includes(id)) return false;
    this.state.asked.push(id);
    this.g._saveT = 9.5;
    return true;
  }
  used(id) {
    if (!this.state.auto.includes(id)) this.state.auto.push(id);
    this.g._saveT = 9.5;
  }
}
