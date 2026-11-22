// 偵探模式：在電腦的終端機輸入 `case`，用 SQL 查「校園紀錄」破案（SQL 引擎與資管學堂共用 sql.js，js/learn.js）。
// 主線（js/missions.js 任務五）是「布條失竊案」；破了之後解鎖兩個支線小案子。案件、人物、資料全部是遊戲裡虛構的。
// 每個案子：brief 簡報、seed 資料庫、tables 欄位說明、clues 線索（查詢結果裡出現某些內容時自動記到筆記）、
// need 指認時一定要先找到的線索、culprit 犯人、alibi 指錯人時的說明、hints 分段提示、reward 獎勵。
// 終端機指令：help tables schema brief notes hint accuse cases open reset exit；其他輸入都當成 SQL 執行。
// 進度（找到的線索、用過的提示、破了哪些案子）跟著遊戲存檔（save.js 的 detective）。
import { sqlEngine } from './Learn.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// does any cell of any result set satisfy f(value, row, columns)
const cells = (res, f) => res.some(r => r.values.some(row => row.some(v => f(v, row, r.columns))));
const rowHas = (res, f) => res.some(r => r.values.some(row => f(row, r.columns)));

export const CASES = {
  // ---------------------------------------------------------------- 主線：布條失竊案
  banner: {
    id: 'banner', main: true, icon: '🚩', title: '布條失竊案',
    brief: `今天早上彥霖在校園 6 個地點掛好的競選布條，中午過後一條接一條被割了下來。
系學會的舊電腦裡留著一份「校園紀錄」備份：路口監視器的車牌辨識、各棟大樓的門禁刷卡、校園超商的發票，還有大家的公開貼文。
用 SQL 查出是誰幹的，再輸入 accuse 名字 指認犯人。`,
    tables: {
      banners: 'id, place 地點, hung_at 掛上時間, removed_at 被拆時間',
      cctv: 'id, camera 監視器位置, time 時間, plate 車牌（看不清楚的字是 ?）, vehicle 車種',
      students: 'id, name 姓名, dept 系, grade 年級, club 社團, plate 登記的機車車牌',
      purchases: 'id, store 店, time 時間, student_id 學生, item 品項, price 價格',
      access_log: 'id, student_id 學生, place 大樓, time 時間, action 進／出',
      posts: 'id, student_id 學生, time 時間, content 貼文內容',
    },
    seed: `
CREATE TABLE banners (id INT PRIMARY KEY, place VARCHAR(20), hung_at VARCHAR(5), removed_at VARCHAR(5));
INSERT INTO banners VALUES (1,'鐘塔','07:40','13:05'),(2,'校史館','07:45','13:12'),(3,'圖書館','07:52','13:20'),
 (4,'體育館','08:00','13:28'),(5,'全人教育村','08:06','13:35'),(6,'管理大樓','08:15','13:41');
CREATE TABLE cctv (id INT PRIMARY KEY, camera VARCHAR(20), time VARCHAR(5), plate VARCHAR(10), vehicle VARCHAR(4));
INSERT INTO cctv VALUES (1,'正門','07:32','KTV-551','機車'),(2,'鐘塔','07:41','YLN-034','機車'),(3,'校史館','07:46','YLN-034','機車'),
 (4,'圖書館','07:53','YLN-034','機車'),(5,'體育館','08:01','YLN-034','機車'),(6,'全人教育村','08:07','YLN-034','機車'),
 (7,'管理大樓','08:16','YLN-034','機車'),(8,'中北路口','11:58','RTA-207','機車'),(9,'正門','12:20','BGE-660','機車'),
 (10,'中北路口','12:36','MKZ-8?3','機車'),(11,'鐘塔','13:03','MKZ-8?3','機車'),(12,'鐘塔','13:04','HNK-155','機車'),
 (13,'校史館','13:10','MKZ-8?3','機車'),(14,'圖書館','13:18','MKZ-8?3','機車'),(15,'圖書館','13:19','RTA-207','機車'),
 (16,'體育館','13:26','MKZ-8?3','機車'),(17,'體育館','13:27','QRS-410','汽車'),(18,'全人教育村','13:33','MKZ-8?3','機車'),
 (19,'管理大樓','13:39','MKZ-8?3','機車'),(20,'正門','13:47','MKZ-8?3','機車'),(21,'中北路口','14:05','BGE-660','機車');
CREATE TABLE students (id INT PRIMARY KEY, name VARCHAR(10), dept VARCHAR(10), grade INT, club VARCHAR(20), plate VARCHAR(10));
INSERT INTO students VALUES (1,'彥霖','資管',3,'系學會','YLN-034'),(2,'小安','資管',3,'系學會',NULL),(3,'阿哲','資管',4,'系學會','AZE-224'),
 (4,'吱吱','企管',2,'排球社',NULL),(5,'漢克','資管',3,'熱音社','HNK-155'),(6,'黃蓋瑞','資管',3,'古箏社','GRY-778'),
 (21,'小強','企管',3,'熱舞社','MKZ-813'),(22,'小傑','電機',2,'吉他社','MKZ-853'),(23,'小明','資管',2,'辯論社','MKZ-893'),
 (24,'小華','資管',3,'系學會','HUA-301'),(25,'小宇','化工',1,'攝影社','MKZ-820'),(26,'小芳','會計',2,'熱舞社','RTA-207'),
 (27,'小剛','機械',4,'登山社','BGE-660'),(28,'小婷','心理',1,'吉他社','KTV-551');
CREATE TABLE purchases (id INT PRIMARY KEY, store VARCHAR(10), time VARCHAR(5), student_id INT, item VARCHAR(10), price INT);
INSERT INTO purchases VALUES (1,'全家 中原店','07:10',1,'御飯糰',35),(2,'全家 中原店','12:05',26,'礦泉水',20),(3,'全家 中原店','12:31',22,'可樂',30),
 (4,'全家 中原店','12:38',23,'美工刀',39),(5,'全家 中原店','12:38',23,'大垃圾袋',45),(6,'7-11 中北店','12:44',21,'美工刀',35),
 (7,'7-11 中北店','12:44',21,'彩色膠帶',59),(8,'全家 中原店','12:50',5,'大亨堡',55),(9,'7-11 中北店','13:52',25,'底片',120),
 (10,'全家 中原店','14:20',27,'能量飲',45);
CREATE TABLE access_log (id INT PRIMARY KEY, student_id INT, place VARCHAR(10), time VARCHAR(5), action VARCHAR(2));
INSERT INTO access_log VALUES (1,24,'資管系館','09:00','進'),(2,25,'圖書館','10:00','進'),(3,25,'圖書館','11:30','出'),
 (4,23,'資管系館','12:10','出'),(5,22,'活動中心','12:55','進'),(6,21,'圖書館','12:58','進'),(7,26,'圖書館','13:25','進'),
 (8,23,'資管系館','14:02','進'),(9,21,'圖書館','14:12','出'),(10,22,'活動中心','14:30','出'),(11,5,'活動中心','16:55','進');
CREATE TABLE posts (id INT PRIMARY KEY, student_id INT, time VARCHAR(5), content VARCHAR(60));
INSERT INTO posts VALUES (1,1,'07:30','今天最後衝刺！布條掛起來 ✌'),(2,24,'12:00','明天就投票了，謝謝大家這陣子的支持 🙏'),
 (3,22,'13:15','吉他社練團中，新歌超難'),(4,21,'13:30','圖書館三樓冷氣好強，期中報告寫不完 😭'),(5,26,'13:40','圖書館找不到位子…'),
 (6,23,'13:50','任務完成 😎 明天投票看好戲，幫小華學姊衝一波！'),(7,25,'13:55','拍到一台機車在校園裡繞來繞去，好可疑 📷');`,
    clues: [
      { id: 'time', text: '布條在 13:05～13:41 之間被拆，順序是鐘塔 → 校史館 → 圖書館 → 體育館 → 全人教育村 → 管理大樓。', test: (sql, res) => /banners/.test(sql) && cells(res, v => v === '13:41' || v === '13:05') },
      { id: 'plate', text: '每條布條被拆前幾分鐘，那個地點的監視器都拍到同一台機車：車牌 MKZ-8?3（中間一碼看不清楚）。', test: (sql, res) => cells(res, v => v === 'MKZ-8?3') },
      { id: 'suspects', text: '車牌符合 MKZ-8?3 的學生有三個：小強（MKZ-813）、小傑（MKZ-853）、小明（MKZ-893）。', test: (sql, res) => ['MKZ-813', 'MKZ-853', 'MKZ-893'].filter(p => cells(res, v => v === p)).length >= 2 || ['小強', '小傑', '小明'].filter(p => cells(res, v => v === p)).length >= 2 && /like|plate/.test(sql) },
      { id: 'cutter', text: '案發前，小明（12:38 全家）和小強（12:44 7-11）都買了美工刀；小傑只買了可樂。', test: (sql, res) => cells(res, v => v === '美工刀') && rowHas(res, row => row.includes('美工刀') && (row.includes(23) || row.includes('小明'))) },
      { id: 'alibi', text: '小強 12:58 刷卡進圖書館、14:12 才出來，布條被拆的時候他都在館內 —— 他有不在場證明。', test: (sql, res) => /access_log/.test(sql) && rowHas(res, row => row.includes('圖書館') && (row.includes(21) || row.includes('小強'))) },
      { id: 'post', text: '小明 13:50 發文：「任務完成 😎 明天投票看好戲，幫小華學姊衝一波！」', test: (sql, res) => cells(res, v => typeof v === 'string' && v.includes('任務完成')) },
    ],
    need: ['plate', 'suspects', 'cutter', 'alibi'],
    culprit: '小明',
    alibi: {
      小強: '門禁紀錄顯示他 12:58 進圖書館、14:12 才出來，布條被拆的時候他都在館內。',
      小傑: '他案發前只買了可樂，而且 12:55～14:30 都在活動中心練團（access_log）。',
      小宇: '他的車牌是 MKZ-820，最後一碼不是 3，和監視器拍到的 MKZ-8?3 對不上。',
      小華: '她的車牌是 HUA-301，監視器整個中午都沒有拍到她的車。',
    },
    hints: [
      '先看案發經過：<code>SELECT * FROM banners;</code> 布條是幾點、在哪裡被拆的？',
      '去 <code>cctv</code> 找 13:00～13:45 在那幾個地點出現的車：<code>WHERE time BETWEEN \'13:00\' AND \'13:45\'</code>，有一個車牌一直出現。',
      '車牌中間有一碼看不清楚。在 <code>students</code> 裡用 LIKE 比對，底線 <code>_</code> 代表「剛好一個字」：<code>WHERE plate LIKE \'MKZ-8_3\'</code>',
      '三個嫌犯裡，誰在案發前買了「美工刀」？查 <code>purchases</code>。剩兩個人的時候，用 <code>access_log</code> 看誰有不在場證明。',
      '把門禁紀錄和學生接起來看：<code>SELECT s.name, a.place, a.time, a.action FROM access_log a JOIN students s ON a.student_id = s.id WHERE s.plate LIKE \'MKZ-8_3\';</code>',
    ],
    solved: '小明中午先去全家買了美工刀和大垃圾袋，騎著 MKZ-893 繞校園一圈，把 6 條布條一條一條割下來；13:50 還發文說「任務完成」。',
  },
  // ---------------------------------------------------------------- 支線：麥當勞薯條失蹤案
  fries: {
    id: 'fries', icon: '🍟', title: '麥當勞薯條失蹤案', reward: 300,
    brief: `學活 B1 麥當勞這三天的薯條庫存一直對不起來：炸出來的份數，比賣掉的多了一大截。
店長調出了炸台紀錄、各時段的銷售和員工名單，請你找出是誰在偷吃薯條。
（提示：同一個時段「炸了幾份」減掉「賣了幾份」，就是不見的份數。）`,
    tables: {
      fry_log: 'id, day 日期, block 時段, staff 炸台人員, portions 炸了幾份',
      sales: 'id, day 日期, block 時段, fries_sold 賣掉幾份',
      staff: 'name 姓名, role 職位, note 備註',
    },
    seed: `
CREATE TABLE fry_log (id INT PRIMARY KEY, day VARCHAR(5), block VARCHAR(5), staff VARCHAR(10), portions INT);
INSERT INTO fry_log VALUES (1,'11/18','11-15','小芸',20),(2,'11/18','15-19','小胖',20),(3,'11/18','19-23','漢克',20),
 (4,'11/19','11-15','小芸',20),(5,'11/19','15-19','小胖',30),(6,'11/19','19-23','漢克',20),
 (7,'11/20','11-15','小志',20),(8,'11/20','15-19','小胖',30),(9,'11/20','19-23','漢克',20);
CREATE TABLE sales (id INT PRIMARY KEY, day VARCHAR(5), block VARCHAR(5), fries_sold INT);
INSERT INTO sales VALUES (1,'11/18','11-15',20),(2,'11/18','15-19',20),(3,'11/18','19-23',19),
 (4,'11/19','11-15',20),(5,'11/19','15-19',18),(6,'11/19','19-23',20),
 (7,'11/20','11-15',19),(8,'11/20','15-19',17),(9,'11/20','19-23',20);
CREATE TABLE staff (name VARCHAR(10) PRIMARY KEY, role VARCHAR(10), note VARCHAR(30));
INSERT INTO staff VALUES ('小芸','組長','早班'),('小胖','兼職','下午班，最近常說肚子餓'),('小志','兼職','週三代班'),('漢克','兼職','晚班，下班後騎 ZMAX 去看夜景');`,
    clues: [
      { id: 'gap', text: '11/19 和 11/20 的 15-19 時段，炸的份數比賣掉的多了 12、13 份；其他時段最多差 1 份。', test: (sql, res) => rowHas(res, row => row.includes('15-19') && (row.includes(12) || row.includes(13))) },
      { id: 'who', text: '那兩個時段的炸台都是小胖，三天下來不見的薯條加起來 25 份。', test: (sql, res) => rowHas(res, row => row.includes('小胖') && row.includes(25)) },
    ],
    need: ['gap', 'who'],
    culprit: '小胖',
    alibi: {
      漢克: '漢克晚班炸的薯條幾乎都賣掉了（最多只差 1 份），不是他。',
      小芸: '小芸早班炸多少就賣多少，帳是對的。',
      小志: '小志只代了 11/20 早上一班，那個時段只差 1 份。',
    },
    hints: [
      '先把兩張表放在一起看：<code>SELECT * FROM fry_log;</code>、<code>SELECT * FROM sales;</code> 它們都有 day 和 block。',
      '用 JOIN 把同一天、同一時段接起來：<code>... FROM fry_log f JOIN sales s ON f.day = s.day AND f.block = s.block</code>，再算 <code>f.portions - s.fries_sold</code>。',
      '最後用 <code>GROUP BY f.staff</code> 加總每個人負責時段不見的份數：<code>SUM(f.portions - s.fries_sold)</code>。',
    ],
    solved: '小胖下午班多炸了薯條，趁沒人注意自己吃掉，三天吃了 25 份。店長罰他把炸台擦到發亮。',
  },
  // ---------------------------------------------------------------- 支線：圖書館占位之謎
  seat: {
    id: 'seat', icon: '📚', title: '圖書館占位之謎', reward: 300,
    brief: `期中考週，圖書館的座位每天一開放就被預約光，但到了現場卻一堆空位。
館員懷疑有人用好幾個帳號一直預約、卻從來不報到。
查出是誰在占位，用 accuse 名字 指認他。`,
    tables: {
      reservations: 'id, account 帳號, seat 座位, day 日期, checked_in 有沒有報到（1 有、0 沒有）',
      accounts: 'account 帳號, owner 帳號主人, dept 系',
    },
    seed: `
CREATE TABLE accounts (account VARCHAR(5) PRIMARY KEY, owner VARCHAR(10), dept VARCHAR(10));
INSERT INTO accounts VALUES ('a01','小芳','會計'),('a02','小翔','土木'),('a03','小強','企管'),('a04','小婷','心理'),('a05','小宇','化工'),('a06','黃蓋瑞','資管'),('a07','小翔','土木');
CREATE TABLE reservations (id INT PRIMARY KEY, account VARCHAR(5), seat VARCHAR(5), day VARCHAR(5), checked_in INT);
INSERT INTO reservations VALUES (1,'a01','3F-12','11/18',1),(2,'a02','3F-01','11/18',0),(3,'a07','3F-02','11/18',0),
 (4,'a03','3F-20','11/18',1),(5,'a02','3F-01','11/19',0),(6,'a07','3F-02','11/19',0),(7,'a04','2F-08','11/19',1),
 (8,'a01','3F-12','11/19',1),(9,'a05','2F-11','11/19',0),(10,'a02','3F-01','11/20',0),(11,'a07','3F-02','11/20',0),
 (12,'a06','3F-30','11/20',1),(13,'a01','3F-12','11/20',1),(14,'a05','2F-11','11/20',1);`,
    clues: [
      { id: 'noshow', text: '帳號 a02 和 a07 每天都預約 3F-01、3F-02，三天下來一次都沒有報到。', test: (sql, res) => rowHas(res, row => (row.includes('a02') || row.includes('a07')) && row.includes(0)) || rowHas(res, row => (row.includes('a02') || row.includes('a07')) && row.includes(3)) },
      { id: 'owner', text: 'a02 和 a07 都是小翔的帳號，他總共占了 6 次位子卻沒報到。', test: (sql, res) => rowHas(res, row => row.includes('小翔') && row.includes(6)) },
    ],
    need: ['noshow', 'owner'],
    culprit: '小翔',
    alibi: {
      小宇: '小宇只有一次沒報到（11/19），隔天就乖乖去坐了。',
      小芳: '小芳每天都預約，但每次都有報到。',
    },
    hints: [
      '先找出沒報到的預約：<code>SELECT * FROM reservations WHERE checked_in = 0;</code>',
      '用 JOIN 把帳號換成主人：<code>... FROM reservations r JOIN accounts a ON r.account = a.account</code>',
      '依「主人」分組數沒報到的次數：<code>GROUP BY a.owner</code> 搭配 <code>COUNT(*)</code>，一個人可能有好幾個帳號。',
    ],
    solved: '小翔開了兩個帳號，每天一早把 3F 靠窗的位子預約起來「保留」，自己卻在宿舍睡覺。他的帳號被停權一週。',
  },
  // ---------------------------------------------------------------- 支線：劍玉的班費失竊案（js/jianyu.js：跟劍玉說過話才會出現）
  jianyu: {
    id: 'jianyu', icon: '💰', title: '劍玉的班費失竊案', unlock: (g) => !!g.jianyu?.state.met,
    brief: `劍玉把裝著「三甲班費 2000」的信封放在力行宿舍 278 寢的書桌上，下午回來就不見了。
寢室門是刷卡進出的，宿舍自治會把當天的紀錄匯出來了：寢室門禁、室友名單、附近超商的發票，還有寢室群組的對話。
查出是誰拿走的，再輸入 accuse 名字 指認。`,
    tables: {
      room_log: 'id, time 時間, name 刷卡的人, action 進／出（278 寢的門）',
      roommates: 'bed 床位, name 姓名, class 班級, note 備註',
      purchases: 'id, time 時間, store 店, buyer 買的人, item 品項, price 金額, pay 付款方式',
      group_chat: 'id, time 時間, who 誰, msg 訊息（278 寢群組）',
    },
    seed: `
CREATE TABLE roommates (bed INT PRIMARY KEY, name VARCHAR(10), class VARCHAR(10), note VARCHAR(30));
INSERT INTO roommates VALUES (1,'小偉','資管三甲','下舖，早八常遲到'),(2,'小宏','資管三甲','上舖，熱音社'),(3,'劍玉','資管三甲','進門右手邊的高架床，班代'),
 (4,'小澤','資管三甲','下舖，最近很常課金'),(5,'小志','資管三乙','上舖，系籃'),(6,'小誠','資管三乙','高架床，籃球校隊');
CREATE TABLE room_log (id INT PRIMARY KEY, time VARCHAR(5), name VARCHAR(10), action VARCHAR(2));
INSERT INTO room_log VALUES (1,'08:05','小偉','出'),(2,'09:40','小志','出'),(3,'12:30','劍玉','進'),(4,'13:10','劍玉','出'),
 (5,'13:40','小宏','進'),(6,'14:05','小宏','出'),(7,'14:20','小澤','進'),(8,'14:26','小澤','出'),(9,'15:50','小誠','進'),
 (10,'16:30','小誠','出'),(11,'17:30','劍玉','進'),(12,'18:10','小偉','進'),(13,'21:40','小志','進');
CREATE TABLE purchases (id INT PRIMARY KEY, time VARCHAR(5), store VARCHAR(12), buyer VARCHAR(10), item VARCHAR(12), price INT, pay VARCHAR(6));
INSERT INTO purchases VALUES (1,'12:10','7-11 中原店','劍玉','御飯糰',39,'信用卡'),(2,'13:55','全家 力行店','小宏','泡麵',45,'悠遊卡'),
 (3,'14:41','7-11 中原店','小澤','遊戲點數卡',2000,'現金'),(4,'16:45','全家 力行店','小誠','運動飲料',35,'現金'),(5,'18:20','全家 力行店','小偉','微波便當',89,'悠遊卡');
CREATE TABLE group_chat (id INT PRIMARY KEY, time VARCHAR(5), who VARCHAR(10), msg VARCHAR(40));
INSERT INTO group_chat VALUES (1,'17:35','劍玉','誰有看到我桌上的信封？裡面是班費 2000'),(2,'17:38','小宏','我 2 點就出門練團了，沒注意欸'),
 (3,'17:40','小澤','沒看到欸，我今天一整天都在圖書館'),(4,'17:41','小誠','我 4 點回來拿球衣，桌上好像就已經沒東西了'),(5,'17:45','小偉','我早八出門到現在還沒回去');`,
    clues: [
      { id: 'window', text: '劍玉 13:10 出門、17:30 回來：班費是在這段時間不見的。', test: (sql, res) => /room_log/.test(sql) && rowHas(res, row => row.includes('劍玉') && (row.includes('13:10') || row.includes('17:30'))) },
      { id: 'visitors', text: '13:10～17:30 進過 278 的有三個人：小宏（13:40–14:05）、小澤（14:20–14:26，只待 6 分鐘）、小誠（15:50–16:30）。', test: (sql, res) => /room_log/.test(sql) && ['小宏', '小澤', '小誠'].filter(n => cells(res, v => v === n)).length >= 2 },
      { id: 'cash', text: '小澤 14:41 在 7-11 用現金買了 2000 元的遊戲點數卡 —— 離開寢室才 15 分鐘。', test: (sql, res) => rowHas(res, row => row.includes('遊戲點數卡') || (row.includes('小澤') && row.includes(2000))) },
      { id: 'lie', text: '小澤在群組說「我今天一整天都在圖書館」，可是 14:20 他刷卡進了 278 —— 他說謊。', test: (sql, res) => cells(res, v => typeof v === 'string' && v.includes('一整天都在圖書館')) },
      { id: 'gone', text: '小誠 15:50 回來時，桌上就已經沒東西了：錢在他回來之前就不見了。', test: (sql, res) => cells(res, v => typeof v === 'string' && v.includes('桌上好像就已經沒東西')) },
    ],
    need: ['visitors', 'cash', 'lie'],
    culprit: '小澤',
    alibi: {
      小宏: '小宏 13:40～14:05 在寢室，但他只用悠遊卡買了 45 元的泡麵，群組裡說的也跟刷卡紀錄對得上。',
      小誠: '小誠 15:50 才回來，而且他回來的時候桌上已經沒東西了 —— 錢在那之前就不見了。',
      小偉: '小偉早上 8 點出門、傍晚 6 點才回來，整個下午都不在寢室。',
      小志: '小志早上 9 點多出門，晚上 9 點多才回來，下午不在寢室。',
      劍玉: '劍玉是苦主啦……',
    },
    hints: [
      '先看 278 的刷卡紀錄：<code>SELECT * FROM room_log;</code> 劍玉幾點出門、幾點回來？',
      '那段時間誰進過寢室？<code>WHERE time BETWEEN \'13:10\' AND \'17:30\'</code>',
      '拿了 2000 塊的人，可能很快就把錢花掉：查 <code>purchases</code>，看誰用<b>現金</b>買了很貴的東西。',
      '最後對一下大家在群組怎麼說：<code>SELECT * FROM group_chat;</code> 有人說的話跟刷卡紀錄對不上。',
    ],
    solved: '小澤 14:20 刷卡進 278，看到劍玉桌上的信封就拿走了，14:41 在 7-11 用現金買了 2000 元的遊戲點數卡，還在群組說自己一整天都在圖書館。回去跟劍玉說吧！',
  },
};

const SQL_ERR = [
  [/no such table: (\S+)/, (m) => `找不到資料表「${m[1]}」。輸入 tables 看有哪些表。`],
  [/no such column: (\S+)/, (m) => `找不到欄位「${m[1]}」。輸入 schema 表名 看欄位名稱。`],
  [/near "(.+?)": syntax error/, (m) => `語法錯誤：在「${m[1]}」附近。檢查拼字、逗號和引號。`],
  [/incomplete input/, () => '指令還沒寫完：是不是少了右括號或右引號？'],
  [/ambiguous column name: (\S+)/, (m) => `欄位「${m[1]}」在好幾張表都有，請寫成 表名.${m[1]}（例如 s.${m[1]}）。`],
];
const zhErr = (e) => { for (const [re, f] of SQL_ERR) { const m = e.match(re); if (m) return f(m); } return e; };

export class Detective {
  constructor(game) { this.g = game; this.state = {}; this.cur = null; this.db = null; }
  toJSON() { return this.state; }
  load(d) { this.state = d && typeof d === 'object' ? d : {}; }
  st(id) { return (this.state[id] ||= { clues: [], hints: 0, solved: false, tries: 0 }); }
  solved(id) { return !!this.state[id]?.solved; }
  // the main case opens with mission 5 (or any time after the story); the side cases once it is solved
  available() {
    const M = this.g.missions, story = M && (M.done || M.free || M.idx >= 5);
    return Object.values(CASES).filter(c => c.unlock ? c.unlock(this.g) || this.solved(c.id) : c.main ? story || this.solved(c.id) : this.solved('banner'));
  }
  // ---------------- terminal ----------------
  // io: { print(text, cls), html(html), prompt(p), clear() } from the terminal window (js/pc.js)
  async enter(io, id) {
    this.io = io;
    const list = this.available();
    if (!list.length) { io.print('目前沒有需要調查的案件。', 'tm-dim'); return false; }
    const c = CASES[id] || list.find(x => !this.solved(x.id)) || list[0];
    io.print('🕵️ 偵探模式啟動中…', 'tm-dim');
    try { await this._open(c); } catch (e) { io.print('❌ SQL 引擎載入失敗，需要網路連線（第一次會從 CDN 下載）。', 'tm-red'); return false; }
    return true;
  }
  async _open(c) {
    const S = await sqlEngine();
    this.db?.close(); this.db = new S.Database(); this.db.exec(c.seed); this.cur = c;
    const io = this.io;
    io.html(`<div class="dt-head">${c.icon} 案件：${esc(c.title)}${this.solved(c.id) ? '　<span class="dt-ok">已破案</span>' : ''}</div>`);
    io.html(`<div class="dt-brief">${esc(c.brief).replace(/\n/g, '<br>')}</div>`);
    io.print(`輸入 help 看指令。直接輸入 SQL（例如 SELECT * FROM ${  Object.keys(c.tables)[0]  };）就會執行。`, 'tm-dim');
    io.prompt('sql> ');
  }
  async run(raw, io) {
    this.io = io;
    const c = this.cur, line = raw.trim(); if (!line) return;
    const [w0, ...rest] = line.split(/\s+/), cmd = w0.toLowerCase(), arg = rest.join(' ').replace(/;$/, '').trim();
    const st = this.st(c.id);
    if (cmd === 'help' || cmd === '?') {
      io.html(`<div class="dt-help">
<b>tables</b>　列出資料表　　<b>schema 表名</b>　看欄位　　<b>brief</b>　案件簡報　　<b>notes</b>　線索筆記<br>
<b>hint</b>　拿一個提示　　<b>accuse 名字</b>　指認犯人　　<b>cases</b>　所有案件　　<b>open 案件代號</b>　換案件<br>
<b>reset</b>　資料庫還原　　<b>cls</b>　清除畫面　　<b>exit</b>　離開偵探模式<br>
其他輸入都會當成 SQL 執行，例如：<code>SELECT name, plate FROM students WHERE dept = '資管';</code><br>
不熟 SQL？桌面上的 🎓 資管學堂有「MySQL 入門」可以先練習。</div>`);
    } else if (cmd === 'tables') {
      io.html(`<div class="dt-help">${Object.entries(c.tables).map(([t, d]) => `<b>${t}</b>　<span class="tm-dim">${esc(d)}</span>`).join('<br>')}</div>`);
    } else if (cmd === 'schema' || cmd === 'desc' || cmd === 'describe') {
      const t = arg.toLowerCase(); if (!c.tables[t]) { io.print(`沒有「${arg}」這張表。輸入 tables 看有哪些。`, 'tm-red'); return; }
      this._sql(`SELECT name AS 欄位, type AS 型別 FROM pragma_table_info('${t}');`, io, true);
    } else if (cmd === 'brief') {
      io.html(`<div class="dt-brief">${esc(c.brief).replace(/\n/g, '<br>')}</div>`);
    } else if (cmd === 'notes') {
      const got = c.clues.filter(k => st.clues.includes(k.id));
      io.html(`<div class="dt-help"><b>📝 線索筆記（${got.length} / ${c.clues.length}）</b><br>${got.length ? got.map(k => `・${  esc(k.text)}`).join('<br>') : '<span class="tm-dim">還沒有線索。試著查查看各張表吧。</span>'}</div>`);
    } else if (cmd === 'hint' || cmd === '提示') {
      const h = c.hints[Math.min(st.hints, c.hints.length - 1)];
      st.hints = Math.min(c.hints.length, st.hints + 1); this.g._saveT = 9.5;
      io.html(`<div class="dt-hint">💡 提示 ${Math.min(st.hints, c.hints.length)} / ${c.hints.length}：${h}</div>`);
    } else if (cmd === 'accuse' || cmd === '指認' || cmd === '破案') {
      this._accuse(arg, io);
    } else if (cmd === 'cases') {
      io.html(`<div class="dt-help">${this.available().map(x => `${x.icon} <b>${x.id}</b>　${esc(x.title)}　${this.solved(x.id) ? '<span class="dt-ok">已破案</span>' : x === c ? '<span class="tm-dim">調查中</span>' : ''}`).join('<br>')}<br><span class="tm-dim">輸入 open 案件代號 切換，例如 open ${this.available().slice(-1)[0].id}</span></div>`);
    } else if (cmd === 'open') {
      const n = CASES[arg.toLowerCase()]; if (!n || !this.available().includes(n)) { io.print('沒有這個案件，或還沒解鎖。輸入 cases 看清單。', 'tm-red'); return; }
      await this._open(n);
    } else if (cmd === 'reset') {
      await this._open(c); io.print('資料庫已還原成原本的紀錄。', 'tm-dim');
    } else {
      this._sql(line, io);
    }
  }
  _sql(sql, io, quiet) {
    let res;
    try { res = this.db.exec(sql); } catch (e) { io.print(`❌ ${  zhErr(String(e.message || e))}`, 'tm-red'); return; }
    if (!res.length) { io.print(`完成，影響了 ${this.db.getRowsModified()} 筆資料。`, 'tm-dim'); return; }
    for (const r of res) io.html(table(r));
    if (quiet) return;
    // clues found by this query
    const c = this.cur, st = this.st(c.id), low = sql.toLowerCase();
    for (const k of c.clues) {
      if (st.clues.includes(k.id)) continue;
      let hit = false; try { hit = k.test(low, res); } catch (e) { hit = false; }
      if (hit) { st.clues.push(k.id); this.g._saveT = 9.5; io.html(`<div class="dt-clue">📝 新線索：${esc(k.text)}</div>`); this.g.audio?.pop?.(); }
    }
  }
  _accuse(name, io) {
    const c = this.cur, st = this.st(c.id); name = name.replace(/['"「」]/g, '').trim();
    if (!name) { io.print('用法：accuse 名字（例如 accuse 王小明）', 'tm-dim'); return; }
    if (st.solved) { io.print(`這個案子已經破了：犯人是 ${c.culprit}。`, 'tm-dim'); return; }
    st.tries++;
    if (name !== c.culprit) {
      const why = c.alibi[name];
      io.html(`<div class="dt-bad">🙅 指認失敗：${why ? esc(why) : `目前的證據指不到「${esc(name)}」。確定名字打對了嗎？（可以查人名的那張表）`}</div>`);
      this.g.audio?.fail?.(); return;
    }
    const miss = c.need.filter(id => !st.clues.includes(id));
    if (miss.length) {
      io.html(`<div class="dt-bad">🤔 你的直覺很準，但證據還不夠，這樣說不動別人。還缺：<br>${miss.map(id => `・${  esc(MISSING[c.id]?.[id] || '再多查一些資料')}`).join('<br>')}</div>`);
      return;
    }
    st.solved = true; this.g._saveT = 9.5;
    io.html(`<div class="dt-win">✅ 破案！犯人就是 <b>${esc(c.culprit)}</b>。<br>${esc(c.solved)}</div>`);
    if (c.reward) { this.g.earn(c.reward, `${c.title} 破案獎金`); io.print(`💰 破案獎金 NT$ ${c.reward}`, 'tm-ok'); }
    io.print(c.main ? '按 Esc 關掉電腦，回去告訴小安吧！' : '輸入 cases 看看還有沒有其他案子。', 'tm-dim');
    this.g.audio?.fanfare?.();
  }
}
// what each missing clue asks you to look for (shown when you name the culprit too early)
const MISSING = {
  banner: { plate: '監視器拍到的那台可疑機車（cctv）', suspects: '車牌符合的學生是誰（students，LIKE）', cutter: '案發前誰買了美工刀（purchases）', alibi: '另一個嫌犯的不在場證明（access_log）' },
  fries: { gap: '哪個時段炸的和賣的差最多（JOIN fry_log 和 sales）', who: '那些時段是誰在炸台，總共差幾份（GROUP BY staff）' },
  seat: { noshow: '哪些帳號預約了卻沒報到（checked_in = 0）', owner: '那些帳號的主人是誰、總共幾次（JOIN accounts，GROUP BY owner）' },
  jianyu: { visitors: '劍玉不在的時候誰進過寢室（room_log）', cash: '誰很快就花了一大筆現金（purchases）', lie: '誰在群組說的話跟刷卡紀錄對不上（group_chat）' },
};
function table(r) {
  const n = r.values.length, rows = r.values.slice(0, 60);
  return `<div class="dt-tbl"><table><tr>${r.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${rows.map(row => `<tr>${row.map(v => `<td>${v === null ? '<i>NULL</i>' : esc(v)}</td>`).join('')}</tr>`).join('')}</table></div><div class="tm-dim">${n} 筆${n > 60 ? '（只顯示前 60 筆）' : ''}</div>`;
}
