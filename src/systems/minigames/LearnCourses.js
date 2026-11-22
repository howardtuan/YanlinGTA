// 資管學堂（src/systems/minigames/Learn.js）的課程內容：Python 入門、MySQL 入門各 9 章，AI Agent 入門 10 章。
// 每章：intro 觀念說明 → ex 三個範例（程式碼可以直接試跑，note 逐行解說）→ pit 常見錯誤 → sum 重點整理 → 練習題。
// 練習題欄位：task 題目、start 起始程式、ans 參考解答；Python 用 out 比對輸出（must：程式裡一定要出現的字，
// mustAny 表示出現其中一個就好）；SQL 用 ans 的查詢結果比對（ordered 連順序一起比；check 是改資料的題目執行後拿來比對的查詢）。
// 程式碼用樣板字串寫，所以 Python 字串裡的換行符號要寫成 \\n，也不要用反引號。

export const PY = [
  {
    id: 'py1', t: 'print：讓電腦說話',
    intro: `<p>寫程式就是寫一連串的指令，電腦會<b>從上到下、一行一行</b>照著做。第一個要學的指令是 <code>print()</code>：把括號裡的東西顯示在螢幕上，讓我們看到程式的結果。</p>
<p>Python 裡的資料有不同的<b>型別</b>。最常見的是<b>字串</b>（str，文字）和<b>數字</b>（int 整數、float 小數）。字串一定要用引號包起來，<code>"..."</code> 或 <code>'...'</code> 都可以；數字直接寫，不加引號。</p>
<p>以 <code>#</code> 開頭的是<b>註解</b>，是寫給人看的說明，電腦會直接跳過。</p>`,
    ex: [
      { h: '印出文字和數字', code: `print("Hello, 中原！")
print('資管要贏')
print(2026)
print(3.14)`,
        note: `<ul><li>第 1、2 行：字串用雙引號或單引號都行，印出來時引號不會出現。</li><li>第 3 行：<code>2026</code> 是整數，不用引號。</li><li>第 4 行：<code>3.14</code> 是小數（float）。</li><li>每個 <code>print</code> 印完會自動<b>換行</b>，所以輸出是 4 行。</li></ul>` },
      { h: '一次印好幾個東西', code: `print("今年是", 2026, "年")
print("彥霖", "漢克", "吱吱")
print("A", "B", "C", sep="-")
print("不換行", end="")
print("，接在後面")`,
        note: `<ul><li>用<b>逗號</b>隔開多個東西，print 會在中間自動補一個空格：<code>今年是 2026 年</code>。</li><li><code>sep="-"</code> 把中間的分隔改成 <code>-</code>，輸出 <code>A-B-C</code>。</li><li><code>end=""</code> 把結尾的換行拿掉，所以下一個 print 會接在同一行後面。</li></ul>` },
      { h: '直接算數學', code: `print(1 + 2)
print("1 + 2")
print(7 * 6, 10 / 4)
# 這一行是註解，不會執行
print("算完了")`,
        note: `<ul><li><code>print(1 + 2)</code> 會先算出 3 再印。</li><li><code>print("1 + 2")</code> 有引號，就只是一段文字，原封不動印出。</li><li><code>10 / 4</code> 是 2.5：Python 的 <code>/</code> 一律得到小數。</li><li>第 4 行的註解被跳過，不會有任何輸出。</li></ul>` },
    ],
    pit: [`忘記引號：<code>print(資管要贏)</code> 會出現 <code>NameError</code>，因為 Python 把它當成一個沒定義的名字。`, `用了全形符號：<code>print（"hi"）</code>、<code>“hi”</code> 這種中文輸入法的括號和引號會出現 <code>SyntaxError</code>，程式符號都要用半形（英文）。`, `大小寫寫錯：<code>Print("hi")</code> 不行，Python 分大小寫，要寫 <code>print</code>。`],
    sum: [`<code>print()</code> 把結果顯示出來，一次一行。`, `字串要加引號，數字不用。`, `逗號隔開會自動加空格；<code>sep</code> 改分隔、<code>end</code> 改結尾。`, `<code>#</code> 後面是註解。`],
    task: '印出一行文字：<b>資管要贏</b>',
    start: `# 在下面寫程式，按「▶ 執行並批改」\n`, ans: `print("資管要贏")`, out: '資管要贏',
  },
  {
    id: 'py2', t: '變數與運算',
    intro: `<p><b>變數</b>就像一個貼了名字的盒子，用來存資料。<code>votes = 120</code> 的意思是「把 120 放進名叫 votes 的盒子」—— 這裡的 <code>=</code> 是<b>指定</b>，不是數學的「等於」。</p>
<p>之後只要寫 <code>votes</code>，就會拿出盒子裡的值。盒子裡的東西可以隨時換掉：再寫一次 <code>votes = 200</code>，舊的 120 就被蓋掉了。</p>
<p>變數名稱可以用英文、數字、底線（不能數字開頭），習慣用小寫加底線，例如 <code>total_price</code>。名稱要看得出意思，之後讀程式才不會頭痛。</p>`,
    ex: [
      { h: '建立和使用變數', code: `price = 85
count = 3
total = price * count
print(total)
print("總共", total, "元")`,
        note: `<ul><li>第 1、2 行：建立兩個變數，價錢 85、數量 3。</li><li>第 3 行：先算右邊 <code>price * count</code>（85×3=255），再把結果放進 <code>total</code>。</li><li>第 4、5 行：印出 <code>total</code> 裡的值，不用加引號（加了就變成印「total」這幾個字）。</li></ul>` },
      { h: '各種運算符號', code: `a = 17
b = 5
print(a + b, a - b, a * b)
print(a / b)    # 一般除法，得到小數
print(a // b)   # 整數除法，只取商
print(a % b)    # 取餘數
print(2 ** 10)  # 次方`,
        note: `<ul><li><code>+ - *</code>：加減乘，輸出 <code>22 12 85</code>。</li><li><code>/</code>：17÷5=3.4，結果一定是小數。</li><li><code>//</code>：只取整數的商 3；<code>%</code>：餘數 2。常用來判斷奇偶數（<code>n % 2 == 0</code> 就是偶數）。</li><li><code>**</code>：次方，2 的 10 次方是 1024。</li><li>運算順序跟數學一樣：先次方、再乘除、後加減，可以用括號改順序。</li></ul>` },
      { h: '更新變數的值', code: `votes = 120
votes = votes + 10
print(votes)
votes += 34
print(votes)
votes -= 4
print(votes)`,
        note: `<ul><li>第 2 行：先算右邊 <code>votes + 10</code>（120+10），再放回 <code>votes</code>，變成 130。</li><li><code>votes += 34</code> 是 <code>votes = votes + 34</code> 的簡寫，變成 164。</li><li>同樣有 <code>-=</code>、<code>*=</code>、<code>/=</code>。最後是 160。</li></ul>` },
    ],
    pit: [`把 <code>=</code> 當成「等於」：<code>120 = votes</code> 會錯，指定時變數一定在左邊。`, `還沒建立就使用：直接 <code>print(score)</code> 而前面沒有 <code>score = ...</code>，會出現 <code>NameError</code>。`, `打錯字：<code>vote</code> 和 <code>votes</code> 是兩個不同的變數。`],
    sum: [`<code>變數 = 值</code>：把值存進變數，右邊先算完再存。`, `<code>/</code> 得到小數，<code>//</code> 整數商，<code>%</code> 餘數，<code>**</code> 次方。`, `<code>x += 1</code> 是 <code>x = x + 1</code> 的簡寫。`],
    task: '彥霖原本有 <b>120</b> 票，今天掃街又拿到 <b>34</b> 票。用變數 <code>votes</code> 算出並印出現在的票數。',
    start: `votes = 120\n# 加上 34 票，再印出 votes\n`, ans: `votes = 120\nvotes += 34\nprint(votes)`, out: '154', must: ['votes'],
  },
  {
    id: 'py3', t: '字串與 f-string',
    intro: `<p>字串（str）就是一串文字。字串可以用 <code>+</code> 接起來、用 <code>*</code> 重複；但<b>字串和數字不能直接相加</b>，<code>"票數：" + 120</code> 會出錯，要先用 <code>str(120)</code> 把數字轉成字串。</p>
<p>更方便的方法是 <b>f-string</b>：在引號前面加一個 <code>f</code>，字串裡用大括號 <code>{}</code> 放變數或算式，Python 會自動把值填進去，不用自己轉型。這是現在最常用的寫法。</p>
<p>字串也有很多好用的功能：<code>len()</code> 算長度、<code>[]</code> 取出某個字、<code>.upper()</code> 轉大寫、<code>.replace()</code> 取代文字。</p>`,
    ex: [
      { h: '串接與轉型', code: `name = "彥霖"
n = 34
print("候選人：" + name)
print("第" + str(n) + "屆")
print("加油" * 3)`,
        note: `<ul><li>第 3 行：兩個字串用 <code>+</code> 接起來。</li><li>第 4 行：<code>n</code> 是數字，要先 <code>str(n)</code> 變成字串 "34" 才能接。</li><li>第 5 行：字串乘以 3 就是重複三次：<code>加油加油加油</code>。</li><li>反過來，<code>int("34")</code> 可以把字串轉回數字。</li></ul>` },
      { h: 'f-string 格式化', code: `name = "漢克"
bike = "ZMAX"
cc = 155
print(f"{name} 騎的是 {bike}")
print(f"排氣量 {cc} cc，兩台是 {cc * 2} cc")
avg = 83.756
print(f"平均 {avg:.1f} 分")`,
        note: `<ul><li>引號前的 <code>f</code> 讓 <code>{}</code> 裡的東西被換成變數的值。</li><li>大括號裡也可以放算式：<code>{cc * 2}</code> 會先算出 310。</li><li><code>{avg:.1f}</code> 表示小數點後保留 1 位，輸出 <code>83.8</code>。</li><li>不用 <code>str()</code> 轉型，也不用一堆 <code>+</code>，可讀性好很多。</li></ul>` },
      { h: '字串的常用功能', code: `s = "Python"
print(len(s))        # 長度
print(s[0], s[-1])   # 第一個、最後一個字
print(s[0:3])        # 切片：第 0 到第 2 個字
print(s.upper(), s.lower())
print("中原大學".replace("大學", "University"))`,
        note: `<ul><li><code>len(s)</code>：有幾個字，6。</li><li><code>s[0]</code>：位置從 <b>0</b> 開始算，所以是 P；<code>s[-1]</code> 是倒數第一個 n。</li><li><code>s[0:3]</code> 取位置 0、1、2（不含 3）：<code>Pyt</code>。</li><li><code>.upper()</code>／<code>.lower()</code> 轉大小寫；<code>.replace(舊, 新)</code> 取代文字。</li></ul>` },
    ],
    pit: [`字串和數字直接相加：<code>"第" + 34</code> 會出現 <code>TypeError</code>，用 <code>str()</code> 或 f-string。`, `忘記寫 <code>f</code>：<code>print("{name}")</code> 會原封不動印出 <code>{name}</code>。`, `位置從 0 開始：第一個字是 <code>s[0]</code>，不是 <code>s[1]</code>。`],
    sum: [`字串用 <code>+</code> 串接，數字要先 <code>str()</code>。`, `f-string：<code>f"...{變數}..."</code>，<code>{x:.2f}</code> 控制小數位數。`, `<code>len()</code>、<code>s[i]</code>、<code>s[a:b]</code>、<code>.upper()</code>、<code>.replace()</code>。`],
    task: '用 f-string 印出：<b>第34屆會長候選人：彥霖</b>（34 和 彥霖 要從變數來）',
    start: `n = 34\nname = "彥霖"\n`, ans: `n = 34\nname = "彥霖"\nprint(f"第{n}屆會長候選人：{name}")`, out: '第34屆會長候選人：彥霖', must: ['f"', "f'"], mustAny: true,
  },
  {
    id: 'py4', t: 'if 條件判斷',
    intro: `<p>程式常常要「看情況做事」：營業時間才開門、成績及格才印「及格」。這時用 <code>if</code>：</p>
<p><code>if 條件:</code> 後面一定要有<b>冒號</b>，底下要執行的程式要<b>縮排</b>（習慣用 4 個空格）。Python 是用縮排來判斷「哪幾行屬於這個 if」，縮排錯了程式就會錯。</p>
<p>還有其他情況就接 <code>elif 條件:</code>（else if，否則如果），最後用 <code>else:</code> 處理「上面都不成立」。Python 會<b>從上往下找第一個成立的條件</b>，執行它底下的程式，其他的就跳過。</p>`,
    ex: [
      { h: 'if / else', code: `hour = 23
if hour >= 5 and hour < 23:
    print("麥當勞營業中")
    print("歡迎光臨")
else:
    print("打烊了，明天 5 點見")
print("（這行不管怎樣都會印）")`,
        note: `<ul><li>第 2 行：兩個條件用 <code>and</code> 連起來，<b>都成立</b>才算成立。23 &lt; 23 不成立，所以整個是 False。</li><li>第 3、4 行縮排了，屬於 if；條件不成立，所以兩行都不執行。</li><li>第 6 行屬於 else，會執行。</li><li>第 7 行沒有縮排，已經不在 if/else 裡，一定會執行。</li></ul>` },
      { h: '比較運算子', code: `x = 7
print(x == 7)   # 等於
print(x != 7)   # 不等於
print(x > 10, x <= 7)
print(x > 0 and x < 10)
print(x < 0 or x == 7)
print(not x == 7)`,
        note: `<ul><li>比較的結果是<b>布林值</b>：<code>True</code>（成立）或 <code>False</code>（不成立）。</li><li>判斷相等要用<b>兩個等號</b> <code>==</code>；一個等號是指定。</li><li><code>and</code> 兩邊都要成立；<code>or</code> 只要一邊成立；<code>not</code> 反過來。</li></ul>` },
      { h: 'if / elif / else 多種情況', code: `score = 72
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 60:
    grade = "C"
else:
    grade = "F"
print(f"{score} 分是 {grade}")`,
        note: `<ul><li>Python 由上往下檢查：72 &gt;= 90？不是。72 &gt;= 80？不是。72 &gt;= 60？是 → grade 設成 C，<b>後面的就不再檢查</b>。</li><li>所以順序很重要：如果把 <code>score &gt;= 60</code> 放第一個，90 分也會被判成 C。</li><li>輸出：<code>72 分是 C</code>。</li></ul>` },
    ],
    pit: [`忘記冒號：<code>if score &gt;= 60</code> 後面沒有 <code>:</code> 會 <code>SyntaxError</code>。`, `縮排不一致：同一區塊有的 4 格有的 2 格會 <code>IndentationError</code>。按 Tab 會自動輸入 4 個空格。`, `用 <code>=</code> 判斷相等：<code>if x = 7:</code> 是錯的，要寫 <code>==</code>。`],
    sum: [`<code>if 條件:</code> ＋ 縮排的程式區塊。`, `<code>elif</code> 依序檢查其他情況，<code>else</code> 收尾。`, `比較：<code>== != &gt; &lt; &gt;= &lt;=</code>；組合：<code>and or not</code>。`],
    task: '成績 <code>score = 85</code>：90 分以上印 <b>A</b>，80～89 印 <b>B</b>，60～79 印 <b>C</b>，其他印 <b>F</b>。',
    start: `score = 85\n`, ans: `score = 85\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelif score >= 60:\n    print("C")\nelse:\n    print("F")`, out: 'B', must: ['if', 'elif'],
  },
  {
    id: 'py5', t: 'for 迴圈與 range',
    intro: `<p>要重複做同一件事（發 100 張傳單、印 1 到 10），不用把程式複製 100 次，用<b>迴圈</b>就好。</p>
<p><code>for 變數 in 一串東西:</code> 會把那串東西<b>一個一個拿出來</b>放進變數，每拿一個就執行一次底下縮排的程式。</p>
<p>最常搭配的是 <code>range()</code>，它會產生一串數字：<code>range(5)</code> 是 0~4、<code>range(1, 6)</code> 是 1~5（<b>不含結尾</b>）、<code>range(0, 10, 2)</code> 是 0, 2, 4, 6, 8（每次跳 2）。</p>`,
    ex: [
      { h: '用 range 重複', code: `for i in range(3):
    print("第", i, "次")
print("迴圈結束")`,
        note: `<ul><li><code>range(3)</code> 產生 0, 1, 2，所以迴圈跑 3 次。</li><li>每一次 <code>i</code> 都會換成下一個數字。</li><li>最後一行沒有縮排，等迴圈全部跑完才執行一次。</li></ul>` },
      { h: '累加：算 1 加到 100', code: `total = 0
for n in range(1, 101):
    total += n
print("1 加到 100 =", total)

for n in range(10, 0, -3):
    print(n, end=" ")`,
        note: `<ul><li>先準備一個 <code>total = 0</code>，每一圈把 n 加進去 —— 這種「累加」是迴圈最常見的用法。</li><li><code>range(1, 101)</code> 才會包含 100（結尾不含）。答案是 5050。</li><li><code>range(10, 0, -3)</code> 從 10 往下每次減 3：<code>10 7 4 1</code>。<code>end=" "</code> 讓它們印在同一行。</li></ul>` },
      { h: '迴圈裡加判斷', code: `for n in range(1, 11):
    if n % 2 == 0:
        print(n, "是偶數")
for ch in "中原":
    print("字：", ch)`,
        note: `<ul><li>迴圈裡可以再放 if，注意 if 底下要<b>再縮排一層</b>（8 個空格）。</li><li><code>n % 2 == 0</code>：除以 2 餘數是 0 就是偶數，印出 2、4、6、8、10。</li><li>for 也可以直接走過字串，一次拿一個字。</li></ul>` },
    ],
    pit: [`以為 <code>range(1, 5)</code> 包含 5：它只到 4，要包含 5 就寫 <code>range(1, 6)</code>。`, `累加的變數放在迴圈裡面：<code>total = 0</code> 寫在 for 裡，每圈都會被歸零。`, `迴圈內容忘記縮排，或縮排不一致。`],
    sum: [`<code>for x in 一串東西:</code> 一個一個拿出來做。`, `<code>range(開始, 結束, 間隔)</code>，結束不包含。`, `先設 <code>total = 0</code>，迴圈裡 <code>total += ...</code> 做累加。`],
    task: '用 for 迴圈印出 <b>1 到 5</b>，每個數字一行。',
    start: ``, ans: `for i in range(1, 6):\n    print(i)`, out: '1\n2\n3\n4\n5', must: ['for'],
  },
  {
    id: 'py6', t: 'list 串列',
    intro: `<p>如果有 40 個同學的成績，總不能開 40 個變數。<b>串列（list）</b>可以把很多資料裝在同一個變數裡，用中括號、逗號隔開：<code>scores = [80, 92, 75]</code>。</p>
<p>每個元素都有<b>位置（索引）</b>，從 0 開始：<code>scores[0]</code> 是 80。負數從後面數：<code>scores[-1]</code> 是最後一個。串列是可以改的：可以改某一格、加新的、刪掉。</p>
<p>搭配 for 迴圈就能一次處理全部資料，再加上 <code>len()</code>、<code>sum()</code>、<code>max()</code>、<code>sorted()</code> 這些內建函式，統計資料非常方便。</p>`,
    ex: [
      { h: '建立、讀取、修改', code: `menu = ["大麥克", "薯條", "可樂"]
print(menu)
print(menu[0], menu[-1])
menu[2] = "雪碧"
menu.append("雞塊")
print(menu, len(menu))`,
        note: `<ul><li><code>menu[0]</code> 是第一個「大麥克」，<code>menu[-1]</code> 是最後一個「可樂」。</li><li><code>menu[2] = "雪碧"</code>：把第 3 格換掉。</li><li><code>.append()</code>：加到最後面。現在有 4 個，<code>len(menu)</code> 是 4。</li></ul>` },
      { h: '統計資料', code: `scores = [80, 92, 75, 88, 61]
print("總分", sum(scores))
print("最高", max(scores), "最低", min(scores))
print("平均", sum(scores) / len(scores))
print("排序", sorted(scores))
print("由高到低", sorted(scores, reverse=True))`,
        note: `<ul><li><code>sum()</code> 總和、<code>max()</code>／<code>min()</code> 最大最小。</li><li>平均 = 總和 ÷ 個數，用 <code>len()</code> 算個數：396÷5 = 79.2。</li><li><code>sorted()</code> 回傳排好序的<b>新串列</b>，原本的 scores 不會變；<code>reverse=True</code> 變成由大到小。</li></ul>` },
      { h: '用迴圈處理每一個', code: `scores = [80, 92, 55, 88, 47]
passed = []
for s in scores:
    if s >= 60:
        passed.append(s)
print("及格的：", passed)
print("及格人數：", len(passed))
print(78 in scores, 92 in scores)`,
        note: `<ul><li>準備一個空串列 <code>passed = []</code>，迴圈裡把及格的一個個 append 進去 —— 這是「篩選」的標準寫法。</li><li>結果是 <code>[80, 92, 88]</code>，3 人。</li><li><code>值 in 串列</code> 檢查有沒有在裡面，回傳 True/False。</li></ul>` },
    ],
    pit: [`位置超出範圍：只有 5 個元素卻取 <code>scores[5]</code>，會出現 <code>IndexError</code>（最後一個是 <code>[4]</code>）。`, `以為 <code>sorted()</code> 會改原本的串列：它回傳新的；要直接改原串列用 <code>scores.sort()</code>。`, `空串列算平均：<code>len</code> 是 0 會出現除以零的錯誤。`],
    sum: [`<code>[a, b, c]</code> 建立串列，位置從 0 開始，<code>-1</code> 是最後一個。`, `<code>.append()</code> 加入，<code>len / sum / max / min / sorted</code> 統計。`, `<code>for x in 串列:</code> 處理每一個；空串列 + append 做篩選。`],
    task: '四次小考成績 <code>[80, 92, 75, 88]</code>，算出並印出<b>平均</b>。',
    start: `scores = [80, 92, 75, 88]\n`, ans: `scores = [80, 92, 75, 88]\nprint(sum(scores) / len(scores))`, out: '83.75',
  },
  {
    id: 'py7', t: 'dict 字典',
    intro: `<p>串列用「位置」找資料，但有時候用<b>名字</b>找比較直覺：彥霖幾票？牛排還剩幾份？這時用<b>字典（dict）</b>，存的是一對一對的「<b>鍵 → 值</b>」。</p>
<p>用大括號建立：<code>votes = {"彥霖": 120, "阿哲": 95}</code>，冒號左邊是鍵（key）、右邊是值（value）。用 <code>votes["彥霖"]</code> 取值；指定一個新的鍵就會新增，指定已有的鍵就會更新。</p>
<p>走過字典最常用 <code>for k, v in d.items():</code>，一次拿到鍵和值。</p>`,
    ex: [
      { h: '建立、讀取、新增、更新', code: `stock = {"牛排": 12, "漢堡排": 30}
print(stock["牛排"])
stock["牛排"] -= 2       # 更新
stock["豬排"] = 8        # 新增
print(stock)
print(len(stock), "種肉")
print("雞排" in stock)`,
        note: `<ul><li><code>stock["牛排"]</code> 用鍵取值：12。</li><li>已有的鍵：更新成 10；沒有的鍵「豬排」：新增一筆。</li><li><code>len()</code> 算有幾組；<code>in</code> 檢查<b>鍵</b>在不在字典裡。</li></ul>` },
      { h: '走過整個字典', code: `votes = {"彥霖": 154, "阿哲": 98, "小安": 12}
for name, n in votes.items():
    print(f"{name}：{n} 票")
print("總票數", sum(votes.values()))
print("候選人", list(votes.keys()))`,
        note: `<ul><li><code>.items()</code> 一次給「鍵, 值」，用兩個變數接。</li><li><code>.values()</code> 只拿值，可以直接 <code>sum</code>：264。</li><li><code>.keys()</code> 只拿鍵，用 <code>list()</code> 轉成串列印出來。</li></ul>` },
      { h: '用字典計數', code: `ballots = ["彥霖", "阿哲", "彥霖", "彥霖", "阿哲"]
count = {}
for b in ballots:
    count[b] = count.get(b, 0) + 1
print(count)
winner = max(count, key=count.get)
print("當選：", winner)`,
        note: `<ul><li>計數的經典寫法：<code>count.get(b, 0)</code> 取目前的票數，<b>還沒出現過就當作 0</b>，再加 1。</li><li>結果 <code>{'彥霖': 3, '阿哲': 2}</code>。</li><li><code>max(count, key=count.get)</code>：用「值」來比大小，回傳值最大的那個<b>鍵</b>。</li></ul>` },
    ],
    pit: [`取不存在的鍵：<code>stock["雞排"]</code> 會出現 <code>KeyError</code>，不確定有沒有就用 <code>.get("雞排", 0)</code>。`, `鍵的大小寫和空白要完全一樣，<code>"Python"</code> 和 <code>"python"</code> 是不同的鍵。`, `用位置取值：字典沒有 <code>d[0]</code> 這種用法（除非 0 剛好是鍵）。`],
    sum: [`<code>{鍵: 值}</code>，用 <code>d[鍵]</code> 取值、新增、更新。`, `<code>.get(鍵, 預設)</code> 安全取值，計數超好用。`, `<code>.items() .keys() .values()</code> 走過字典。`],
    task: '開票結果 <code>{"彥霖": 154, "阿哲": 98}</code>，印出<b>得票最多的人的名字</b>。',
    start: `votes = {"彥霖": 154, "阿哲": 98}\n`, ans: `votes = {"彥霖": 154, "阿哲": 98}\nprint(max(votes, key=votes.get))`, out: '彥霖',
  },
  {
    id: 'py8', t: '函式 def',
    intro: `<p>同一段程式要在很多地方用，就把它包成<b>函式</b>。我們一直在用的 <code>print()</code>、<code>len()</code> 就是 Python 內建的函式，現在要自己寫。</p>
<p><code>def 函式名稱(參數):</code> 定義函式，底下縮排是內容。<b>參數</b>是呼叫時傳進來的資料；<code>return</code> 把結果<b>傳回</b>給呼叫的地方。定義完不會自己執行，要寫 <code>函式名稱(...)</code> <b>呼叫</b>它才會跑。</p>
<p>注意 <code>return</code> 和 <code>print</code> 不一樣：print 只是顯示在螢幕上，return 是把值交回去，讓呼叫的人可以存起來、再拿去計算。</p>`,
    ex: [
      { h: '定義與呼叫', code: `def greet(name):
    print(f"嗨，{name}！記得投彥霖一票")

greet("吱吱")
greet("漢克")`,
        note: `<ul><li>第 1~2 行只是「定義」，這時候什麼都不會印。</li><li>第 4 行呼叫 <code>greet("吱吱")</code>：參數 <code>name</code> 變成 "吱吱"，執行函式內容。</li><li>同一個函式可以一直重複呼叫，傳不同的值進去。</li></ul>` },
      { h: 'return 回傳結果', code: `def bmi(kg, m):
    return round(kg / m ** 2, 1)

a = bmi(70, 1.75)
b = bmi(55, 1.6)
print(a, b)
print("差", round(a - b, 1))`,
        note: `<ul><li>兩個參數用逗號隔開，呼叫時照順序傳入。</li><li><code>return</code> 把算好的值交回去，所以可以存進 <code>a</code>、<code>b</code> 再拿去計算。</li><li><code>round(x, 1)</code> 四捨五入到小數 1 位。輸出 <code>22.9 21.5</code> 和 <code>差 1.4</code>。</li><li>執行到 <code>return</code> 函式就結束了，後面的程式不會跑。</li></ul>` },
      { h: '預設參數與回傳布林值', code: `def price(n, each=85):
    return n * each

def is_pass(score, line=60):
    return score >= line

print(price(3))
print(price(3, 120))
print(is_pass(72), is_pass(72, line=80))`,
        note: `<ul><li><code>each=85</code> 是<b>預設值</b>：呼叫時沒給就用 85，給了就用給的。</li><li><code>price(3)</code> 是 255；<code>price(3, 120)</code> 是 360。</li><li>也可以用「參數名=值」指定，例如 <code>line=80</code>，比較好讀。</li><li>函式可以回傳 True/False，拿來放在 if 裡很方便。</li></ul>` },
    ],
    pit: [`只定義沒呼叫：寫了 <code>def</code> 卻沒有 <code>greet(...)</code>，什麼都不會發生。`, `把 <code>print</code> 當 <code>return</code>：函式裡只有 print，呼叫結果會是 <code>None</code>，拿去計算會出錯。`, `參數數量不對：<code>bmi(70)</code> 少傳一個會出現 <code>TypeError</code>。`],
    sum: [`<code>def 名稱(參數):</code> 定義，<code>名稱(值)</code> 呼叫。`, `<code>return</code> 把結果交回去；print 只是顯示。`, `參數可以有預設值：<code>def f(x, y=1):</code>。`],
    task: '寫一個函式 <code>add_votes(v, n)</code> 回傳 v 加 n，然後印出 <code>add_votes(100, 34)</code>。',
    start: `def add_votes(v, n):\n    # 回傳 v 加 n\n    pass\n\nprint(add_votes(100, 34))\n`, ans: `def add_votes(v, n):\n    return v + n\n\nprint(add_votes(100, 34))`, out: '134', must: ['def add_votes', 'return'],
  },
  {
    id: 'py9', t: 'while 迴圈（綜合練習）',
    intro: `<p><code>for</code> 適合「次數已知」的重複；如果是「<b>做到某個條件不成立為止</b>」（存款花完為止、猜對為止），就用 <code>while 條件:</code>。每一圈開始前都會檢查條件，成立才繼續。</p>
<p>⚠️ 迴圈裡一定要讓條件<b>有機會變成不成立</b>，否則會變成<b>無窮迴圈</b>永遠停不下來（這個網站跑超過 10 秒會自動停止）。</p>
<p><code>break</code> 立刻跳出整個迴圈；<code>continue</code> 跳過這一圈剩下的部分，直接進下一圈。這一章也會把前面學的變數、if、list、函式綜合起來用。</p>`,
    ex: [
      { h: '做到條件不成立為止', code: `money = 1000
day = 0
while money >= 150:
    money -= 150    # 每天一碗牛肉麵
    day += 1
print(f"可以吃 {day} 天，剩 {money} 元")`,
        note: `<ul><li>每一圈先檢查 <code>money &gt;= 150</code>，夠錢才吃。</li><li>迴圈裡 money 一直減少，總有一天不成立 → 迴圈結束。</li><li>1000 元可以吃 6 天，剩 100 元。</li></ul>` },
      { h: 'break 與 continue', code: `n = 0
while True:
    n += 1
    if n % 3 == 0:
        continue      # 3 的倍數跳過
    if n > 10:
        break         # 超過 10 就結束
    print(n, end=" ")`,
        note: `<ul><li><code>while True</code> 條件永遠成立，所以一定要靠 <code>break</code> 離開。</li><li>n 是 3 的倍數時 <code>continue</code>：下面的 print 被跳過，直接回到迴圈開頭。</li><li>n 超過 10 時 <code>break</code>：整個迴圈結束。輸出 <code>1 2 4 5 7 8 10</code>。</li></ul>` },
      { h: '綜合：數字拆解', code: `def digit_sum(n):
    total = 0
    while n > 0:
        total += n % 10   # 取個位數
        n //= 10          # 去掉個位數
    return total

print(digit_sum(2026))
print(digit_sum(34))`,
        note: `<ul><li><code>n % 10</code> 拿到個位數，<code>n //= 10</code> 把個位數去掉，重複到 n 變成 0。</li><li>2026 → 加 6、加 2、加 0、加 2 = 10；34 → 7。</li><li>函式 + while + 運算子一起用，就是一個完整的小演算法。</li></ul>` },
    ],
    pit: [`忘記更新條件：<code>while money &gt;= 150:</code> 裡面沒有減 money，就會無窮迴圈。`, `<code>while True</code> 卻沒有 <code>break</code>。`, `邊界差一：用 <code>&gt;</code> 還是 <code>&gt;=</code>，多想一下最後一圈要不要跑。`],
    sum: [`<code>while 條件:</code> 條件成立就一直重複。`, `迴圈裡要讓條件有機會變 False。`, `<code>break</code> 跳出迴圈、<code>continue</code> 跳到下一圈。`],
    task: '印出費氏數列的前 <b>10</b> 個數，<b>放在同一行、用空格隔開</b>：<code>0 1 1 2 3 5 8 13 21 34</code>（每個數是前兩個數的和）',
    start: `a, b = 0, 1\n`, ans: `a, b = 0, 1\nnums = []\nwhile len(nums) < 10:\n    nums.append(a)\n    a, b = b, a + b\nprint(" ".join(str(x) for x in nums))`, out: '0 1 1 2 3 5 8 13 21 34',
  },
];

// the practice database: the same fresh copy before every run
export const SEED = `
CREATE TABLE students (id INT PRIMARY KEY, name VARCHAR(20), dept VARCHAR(20), grade INT, score INT);
INSERT INTO students VALUES (1,'彥霖','資管',3,92),(2,'吱吱','企管',2,78),(3,'漢克','資管',3,88),(4,'小安','會計',1,65),
 (5,'黃蓋瑞','資管',2,81),(6,'阿哲','電機',4,73),(7,'小美','企管',1,95),(8,'大雄','會計',2,58);
CREATE TABLE candidates (id INT PRIMARY KEY, name VARCHAR(20), slogan VARCHAR(40));
INSERT INTO candidates VALUES (1,'彥霖','資管要贏'),(2,'阿哲','改變從今天開始');
CREATE TABLE votes (id INT PRIMARY KEY, student_id INT, candidate_id INT);
INSERT INTO votes VALUES (1,1,1),(2,2,1),(3,3,1),(4,4,2),(5,5,1),(6,6,2),(7,7,1),(8,8,2);`;
export const SCHEMA = [
  ['students', '學生', 'id, name, dept（系）, grade（年級）, score（成績）'],
  ['candidates', '候選人', 'id, name, slogan（口號）'],
  ['votes', '投票紀錄', 'id, student_id（投票的學生）, candidate_id（投給誰）'],
];

export const SQ = [
  {
    id: 'sq1', t: 'SELECT：查詢資料',
    intro: `<p><b>資料庫</b>（database）是有系統地存放資料的地方，MySQL 是最常見的資料庫系統之一。資料存在一張張<b>資料表</b>（table）裡，長得像 Excel：每一<b>列</b>（row）是一筆資料，每一<b>欄</b>（column）是一個欄位。</p>
<p>我們用 <b>SQL</b> 這種語言跟資料庫溝通。最基本的是查詢：<code>SELECT 欄位 FROM 資料表;</code>。<code>*</code> 代表全部欄位；也可以只列出需要的欄位，用逗號隔開。</p>
<p>SQL 的關鍵字大小寫都可以，習慣寫<b>大寫</b>比較好分辨；一句 SQL 可以分好幾行寫，最後用<b>分號 <code>;</code></b> 結束。左邊的「範例資料庫」列出這門課用的三張表。</p>`,
    ex: [
      { h: '查詢整張表', code: `SELECT * FROM students;`,
        note: `<ul><li><code>SELECT *</code>：要全部欄位。</li><li><code>FROM students</code>：從學生資料表。</li><li>結果有 8 筆、5 個欄位（id、name、dept、grade、score）。</li></ul>` },
      { h: '只查需要的欄位', code: `SELECT name, dept
FROM students;`,
        note: `<ul><li>欄位名稱用逗號隔開，結果就只有這兩欄，順序也照你寫的順序。</li><li>實務上盡量不要用 <code>*</code>：只拿需要的欄位比較快，也比較清楚。</li><li>SQL 可以換行寫，讀起來比較清楚，分號才是結尾。</li></ul>` },
      { h: '計算欄位與別名', code: `SELECT name, score, score + 5 AS 加分後
FROM students;

SELECT DISTINCT dept FROM students;`,
        note: `<ul><li>欄位可以直接計算：<code>score + 5</code>。</li><li><code>AS 加分後</code> 幫結果欄位取名字（別名），不然欄名會是 <code>score + 5</code>。</li><li>一次可以執行多句，結果顯示最後一句。<code>DISTINCT</code> 去掉重複：系別只剩 資管、企管、會計、電機 四種。</li></ul>` },
    ],
    pit: [`資料表或欄位名稱打錯：<code>SELECT * FROM student;</code> 少一個 s 會出現 <code>no such table</code>。`, `欄位之間忘記逗號：<code>SELECT name dept</code> 會被當成「name 取別名叫 dept」。`, `用了全形逗號或全形分號。`],
    sum: [`<code>SELECT 欄位 FROM 資料表;</code>，<code>*</code> 是全部欄位。`, `<code>AS</code> 取別名，欄位可以計算。`, `<code>DISTINCT</code> 去除重複。`],
    task: '列出 <code>students</code> 資料表的<b>所有欄位、所有資料</b>。', start: ``, ans: `SELECT * FROM students;`,
  },
  {
    id: 'sq2', t: 'WHERE：篩選條件',
    intro: `<p>通常我們不需要整張表，只要符合條件的資料：資管系的學生、成績 80 分以上的人。這時在 <code>FROM</code> 後面加上 <code>WHERE 條件</code>，只有條件成立的那幾列會留下來。</p>
<p>比較運算子：<code>=</code> 等於（SQL 只用<b>一個</b>等號）、<code>&lt;&gt;</code> 或 <code>!=</code> 不等於、<code>&gt; &lt; &gt;= &lt;=</code>。<b>文字要用單引號</b> <code>'資管'</code> 包起來，數字不用。</p>
<p>多個條件用 <code>AND</code>（都要成立）、<code>OR</code>（一個成立就好）組合；另外還有 <code>BETWEEN</code> 範圍、<code>IN</code> 清單、<code>LIKE</code> 模糊比對。</p>`,
    ex: [
      { h: '基本條件', code: `SELECT name, score
FROM students
WHERE dept = '資管';`,
        note: `<ul><li>只留下 <code>dept</code> 等於「資管」的列：彥霖、漢克、黃蓋瑞。</li><li>WHERE 的位置固定在 FROM 後面。</li><li>條件裡的欄位（dept）不一定要出現在 SELECT 裡。</li></ul>` },
      { h: 'AND / OR 組合條件', code: `SELECT name, dept, grade, score
FROM students
WHERE score >= 80 AND grade <= 2;

SELECT name, dept FROM students
WHERE dept = '會計' OR dept = '電機';`,
        note: `<ul><li>第一句：成績 80 以上<b>而且</b>是 1、2 年級：黃蓋瑞、小美。</li><li>第二句：會計系<b>或</b>電機系的學生（畫面顯示的是最後這句的結果）。</li><li>AND 和 OR 混用時記得加括號，例如 <code>WHERE (dept='會計' OR dept='電機') AND score &gt; 60</code>。</li></ul>` },
      { h: 'BETWEEN、IN、LIKE', code: `SELECT name, score FROM students WHERE score BETWEEN 70 AND 85;
SELECT name, dept FROM students WHERE dept IN ('企管', '電機');
SELECT name FROM students WHERE name LIKE '小%';`,
        note: `<ul><li><code>BETWEEN 70 AND 85</code>：70 到 85 之間（<b>包含</b>兩端）。</li><li><code>IN ('企管','電機')</code>：等於清單裡任何一個，比寫一堆 OR 簡潔。</li><li><code>LIKE '小%'</code>：<code>%</code> 代表任意長度的文字，所以是「小」開頭的名字：小安、小美（畫面顯示最後這句）。<code>_</code> 代表剛好一個字。</li></ul>` },
    ],
    pit: [`文字沒加引號：<code>WHERE dept = 資管</code> 會被當成欄位名稱而出錯。`, `用雙等號：SQL 判斷相等是 <code>=</code>，不是 <code>==</code>。`, `AND / OR 沒加括號，篩出來的結果跟想的不一樣。`],
    sum: [`<code>WHERE 條件</code> 篩選資料列。`, `文字用單引號；<code>=</code> 等於、<code>&lt;&gt;</code> 不等於。`, `<code>AND OR</code>、<code>BETWEEN</code>、<code>IN</code>、<code>LIKE '%'</code>。`],
    task: '找出<b>資管系</b>所有學生的 <code>name</code> 和 <code>score</code>。', start: `SELECT \n`, ans: `SELECT name, score FROM students WHERE dept = '資管';`,
  },
  {
    id: 'sq3', t: 'ORDER BY 與 LIMIT',
    intro: `<p>資料庫回傳的資料<b>沒有保證順序</b>。要排序就加 <code>ORDER BY 欄位</code>：預設由小到大（<code>ASC</code>），加 <code>DESC</code> 變成由大到小。</p>
<p>可以用多個欄位排序：<code>ORDER BY dept, score DESC</code> 表示先依系別排，同一系再依成績由高到低。</p>
<p><code>LIMIT n</code> 只取前 n 筆，常拿來做「前三名」「最新 10 筆」。<code>LIMIT n OFFSET m</code> 先跳過 m 筆再取，分頁就是這樣做的。這幾個子句的順序固定是：<code>SELECT → FROM → WHERE → ORDER BY → LIMIT</code>。</p>`,
    ex: [
      { h: '由大到小', code: `SELECT name, score
FROM students
ORDER BY score DESC;`,
        note: `<ul><li><code>DESC</code>：由大到小，小美 95 排第一、大雄 58 最後。</li><li>拿掉 DESC（或寫 <code>ASC</code>）就是由小到大。</li><li>文字欄位也能排序，依字元編碼的順序。</li></ul>` },
      { h: '多個欄位排序', code: `SELECT name, dept, score
FROM students
ORDER BY dept, score DESC;`,
        note: `<ul><li>先依 <code>dept</code> 排（同系的放在一起）。</li><li>同一個系裡面，再依 <code>score</code> 由高到低。</li><li>每個欄位可以各自指定 ASC / DESC。</li></ul>` },
      { h: 'LIMIT 取前幾筆', code: `SELECT name, score FROM students
WHERE dept = '資管'
ORDER BY score DESC
LIMIT 2;`,
        note: `<ul><li>先 WHERE 篩出資管系 → 再排序 → 最後只取前 2 筆：彥霖 92、漢克 88。</li><li>LIMIT 一定要搭配 ORDER BY，不然「前 2 筆」是哪兩筆沒有保證。</li><li>第 3、4 名可以寫 <code>LIMIT 2 OFFSET 2</code>。</li></ul>` },
    ],
    pit: [`子句順序寫錯：<code>ORDER BY</code> 寫在 <code>WHERE</code> 前面會語法錯誤。`, `忘記 <code>DESC</code>，「最高分」變成最低分。`, `只用 LIMIT 不排序，每次結果可能不一樣。`],
    sum: [`<code>ORDER BY 欄位 [ASC|DESC]</code>，可以多欄位。`, `<code>LIMIT n</code> 取前 n 筆，<code>OFFSET</code> 跳過。`, `順序：SELECT → FROM → WHERE → ORDER BY → LIMIT。`],
    task: '列出<b>成績最高的前 3 名</b>的 <code>name</code> 和 <code>score</code>，由高到低。', start: ``, ans: `SELECT name, score FROM students ORDER BY score DESC LIMIT 3;`, ordered: true,
  },
  {
    id: 'sq4', t: '聚合函數 COUNT／AVG',
    intro: `<p>到目前為止查出來的都是一筆一筆的資料。<b>聚合函數</b>則是把很多筆資料<b>算成一個值</b>，用來做統計：</p>
<p><code>COUNT(*)</code> 算有幾筆、<code>SUM(欄位)</code> 總和、<code>AVG(欄位)</code> 平均、<code>MAX(欄位)</code> 最大、<code>MIN(欄位)</code> 最小。</p>
<p>聚合函數可以搭配 WHERE：先篩選，再對剩下的資料做統計。結果通常會用 <code>AS</code> 取一個好懂的名字。</p>`,
    ex: [
      { h: '基本統計', code: `SELECT COUNT(*) AS 人數,
       SUM(score) AS 總分,
       AVG(score) AS 平均,
       MAX(score) AS 最高,
       MIN(score) AS 最低
FROM students;`,
        note: `<ul><li>8 筆資料被算成<b>一列</b>結果：8 人、總分 630、平均 78.75、最高 95、最低 58。</li><li><code>AS</code> 讓欄位名稱變成中文，報表比較好讀。</li></ul>` },
      { h: '先篩選再統計', code: `SELECT COUNT(*) AS 資管人數, AVG(score) AS 資管平均
FROM students
WHERE dept = '資管';`,
        note: `<ul><li>WHERE 先留下資管系 3 個人，再算人數和平均。</li><li>資管平均 = (92+88+81)/3 = 87。</li></ul>` },
      { h: 'COUNT 的不同寫法、ROUND', code: `SELECT COUNT(*) AS 投票筆數,
       COUNT(DISTINCT candidate_id) AS 候選人數
FROM votes;

SELECT ROUND(AVG(score), 1) AS 平均 FROM students WHERE grade >= 2;`,
        note: `<ul><li><code>COUNT(*)</code> 算全部列數：8；<code>COUNT(DISTINCT 欄位)</code> 算不重複的值有幾種：2 位候選人。</li><li><code>ROUND(值, 1)</code> 四捨五入到小數 1 位：2 年級以上 6 人平均 78.3（畫面顯示最後這句）。</li></ul>` },
    ],
    pit: [`把聚合函數放進 WHERE：<code>WHERE AVG(score) &gt; 80</code> 是錯的，要用 HAVING（第 6 課）。`, `同時選一般欄位和聚合函數：<code>SELECT name, AVG(score)</code> 在 MySQL 嚴格模式會出錯，name 到底是哪一個人說不清楚（要搭配 GROUP BY）。`, `<code>AVG</code> 會忽略 NULL 的資料，有空值時平均可能跟你想的不一樣。`],
    sum: [`<code>COUNT SUM AVG MAX MIN</code> 把多筆算成一個值。`, `WHERE 先篩選，再統計。`, `<code>COUNT(DISTINCT x)</code> 不重複的數量，<code>ROUND()</code> 四捨五入。`],
    task: '算出<b>全部學生的平均成績</b>，欄位取名 <code>avg_score</code>。', start: ``, ans: `SELECT AVG(score) AS avg_score FROM students;`,
  },
  {
    id: 'sq5', t: 'GROUP BY 分組',
    intro: `<p>上一課的聚合函數把<b>整張表</b>算成一個值。如果想要「<b>每個系</b>的平均」「<b>每個年級</b>的人數」，就要先分組：<code>GROUP BY 欄位</code> 會把這個欄位值相同的資料放在同一組，聚合函數就變成<b>每組各算一次</b>。</p>
<p>規則：SELECT 裡除了聚合函數以外的欄位，都要出現在 GROUP BY 裡（每組只有一列，欄位的值才說得清楚）。</p>
<p>完整順序：<code>SELECT → FROM → WHERE → GROUP BY → ORDER BY → LIMIT</code>。WHERE 在分組<b>之前</b>先篩選資料。</p>`,
    ex: [
      { h: '每個系有幾人', code: `SELECT dept, COUNT(*) AS 人數
FROM students
GROUP BY dept;`,
        note: `<ul><li>依 dept 分成 4 組：資管 3、企管 2、會計 2、電機 1。</li><li>每一組變成結果裡的一列。</li></ul>` },
      { h: '每組的平均並排序', code: `SELECT dept, AVG(score) AS 平均, MAX(score) AS 最高
FROM students
GROUP BY dept
ORDER BY 平均 DESC;`,
        note: `<ul><li>每個系各算平均和最高分。</li><li>ORDER BY 可以直接用別名「平均」排序：資管 87 第一、企管 86.5 第二，依平均由高到低排好。</li></ul>` },
      { h: '先 WHERE 再分組；多欄位分組', code: `SELECT grade, COUNT(*) AS 人數
FROM students
WHERE score >= 70
GROUP BY grade;

SELECT dept, grade, COUNT(*) AS 人數
FROM students
GROUP BY dept, grade
ORDER BY dept, grade;`,
        note: `<ul><li>第一句：先篩掉 70 分以下的，再依年級分組計數。</li><li>第二句：用「系＋年級」兩個欄位分組，兩個值都相同才算同一組，例如「資管 3 年級」有 2 人（畫面顯示這句）。</li></ul>` },
    ],
    pit: [`SELECT 了沒有分組的欄位：<code>SELECT name, dept, COUNT(*) ... GROUP BY dept</code>，name 不在 GROUP BY 裡。`, `把 GROUP BY 寫在 WHERE 前面。`, `以為分組後會自動排序：要排序請加 ORDER BY。`],
    sum: [`<code>GROUP BY 欄位</code>：值相同的分一組，聚合函數每組各算一次。`, `SELECT 的一般欄位都要放進 GROUP BY。`, `WHERE 在分組前篩選。`],
    task: '算出<b>每個系各有幾個人</b>：欄位是 <code>dept</code> 和人數。', start: ``, ans: `SELECT dept, COUNT(*) AS 人數 FROM students GROUP BY dept;`,
  },
  {
    id: 'sq6', t: 'HAVING：篩選分組',
    intro: `<p>分組之後，如果想「只看人數 2 人以上的系」「只看平均 80 分以上的系」，條件是<b>聚合的結果</b>，不能用 WHERE —— 因為 WHERE 是在分組<b>之前</b>、一筆一筆檢查的，那時候還沒有平均可以比。</p>
<p>篩選分組要用 <code>HAVING</code>，它寫在 GROUP BY 後面，在分組<b>之後</b>檢查每一組。</p>
<p>一句話記：<b>WHERE 篩「列」、HAVING 篩「組」</b>。兩個也可以一起用。</p>`,
    ex: [
      { h: '只留人數夠多的組', code: `SELECT dept, COUNT(*) AS 人數
FROM students
GROUP BY dept
HAVING COUNT(*) >= 2;`,
        note: `<ul><li>先分組算出每系人數，再用 HAVING 去掉人數少於 2 的組。</li><li>電機系只有 1 人，被篩掉了。</li></ul>` },
      { h: 'WHERE 和 HAVING 一起用', code: `SELECT dept, AVG(score) AS 平均
FROM students
WHERE grade >= 2
GROUP BY dept
HAVING AVG(score) > 75;`,
        note: `<ul><li>執行順序：① WHERE 先去掉 1 年級的人 → ② 依系分組 → ③ 算平均 → ④ HAVING 只留平均 &gt; 75 的系。</li><li>結果：資管 87、企管 78（會計剩大雄 58、電機 73，被篩掉）。</li></ul>` },
      { h: '找出得票超過 3 票的候選人', code: `SELECT candidate_id, COUNT(*) AS 票數
FROM votes
GROUP BY candidate_id
HAVING COUNT(*) > 3;`,
        note: `<ul><li>votes 表依候選人分組計票：1 號 5 票、2 號 3 票。</li><li>HAVING 留下超過 3 票的：只有 1 號。第 9 課學 JOIN 之後就能把號碼換成名字。</li></ul>` },
    ],
    pit: [`在 WHERE 裡用聚合函數：<code>WHERE COUNT(*) &gt;= 2</code> 會出錯。`, `HAVING 寫在 GROUP BY 前面。`, `跟聚合無關的條件也寫在 HAVING：能先用 WHERE 篩掉的就用 WHERE，資料多時快很多。`],
    sum: [`WHERE 篩列（分組前），HAVING 篩組（分組後）。`, `HAVING 可以用聚合函數當條件。`, `順序：WHERE → GROUP BY → HAVING → ORDER BY。`],
    task: '列出<b>平均成績 80 分以上</b>的系：欄位是 <code>dept</code> 和平均成績。', start: ``, ans: `SELECT dept, AVG(score) AS 平均 FROM students GROUP BY dept HAVING AVG(score) >= 80;`,
  },
  {
    id: 'sq7', t: 'INSERT：新增資料',
    intro: `<p>前面都在查資料，這課開始<b>改資料</b>。新增一筆用：</p>
<p><code>INSERT INTO 資料表 (欄位1, 欄位2, ...) VALUES (值1, 值2, ...);</code> —— 欄位和值要<b>一一對應</b>、數量相同。如果每個欄位都照資料表的順序給值，欄位清單可以省略，但寫出來比較清楚、也比較不容易錯。</p>
<p>一次新增多筆：<code>VALUES (...), (...), (...)</code>。主鍵（PRIMARY KEY，這裡是 id）不能重複，否則會出錯。這個網站每次執行都會從原本的資料開始，可以放心練習。</p>`,
    ex: [
      { h: '新增一筆', code: `INSERT INTO candidates (id, name, slogan)
VALUES (3, '小安', '會計也要贏');

SELECT * FROM candidates;`,
        note: `<ul><li>欄位 (id, name, slogan) 對應值 (3, '小安', '會計也要贏')，文字一樣要單引號。</li><li>INSERT 本身沒有查詢結果，所以後面接一句 SELECT 檢查：候選人變成 3 位。</li></ul>` },
      { h: '一次新增多筆、只給部分欄位', code: `INSERT INTO votes (id, student_id, candidate_id)
VALUES (9, 1, 1), (10, 3, 1), (11, 4, 2);

INSERT INTO students (id, name) VALUES (20, '轉學生');

SELECT * FROM students WHERE id = 20;`,
        note: `<ul><li>一個 INSERT 用逗號接多組 VALUES，一次加 3 筆投票。</li><li>只給 id 和 name：其他沒給的欄位會是 <code>NULL</code>（空值，代表「沒有資料」）。</li></ul>` },
      { h: '主鍵重複會失敗', code: `INSERT INTO students (id, name, dept, grade, score)
VALUES (1, '冒牌彥霖', '資管', 1, 100);`,
        note: `<ul><li>id 1 已經是彥霖了，主鍵不能重複，所以會出現錯誤（UNIQUE constraint failed）—— 這個範例就是要讓你看到錯誤長怎樣。</li><li>MySQL 實務上常用 <code>AUTO_INCREMENT</code> 讓 id 自動編號，就不用自己給。</li></ul>` },
    ],
    pit: [`欄位數和值的數量不一樣：<code>INSERT INTO students (id, name) VALUES (9, '阿德', '資管')</code>。`, `文字忘了引號。`, `主鍵重複。`],
    sum: [`<code>INSERT INTO 表 (欄位...) VALUES (值...);</code>`, `多筆用 <code>VALUES (...), (...)</code>。`, `沒給的欄位是 NULL；主鍵不能重複。`],
    task: '新增一位學生：id <b>9</b>、名字 <b>阿德</b>、<b>資管</b>系、<b>1</b> 年級、成績 <b>70</b>。', start: ``, ans: `INSERT INTO students (id, name, dept, grade, score) VALUES (9, '阿德', '資管', 1, 70);`,
    check: `SELECT * FROM students ORDER BY id;`,
  },
  {
    id: 'sq8', t: 'UPDATE 與 DELETE',
    intro: `<p><b>修改</b>資料：<code>UPDATE 資料表 SET 欄位 = 新值 WHERE 條件;</code>，可以一次改多個欄位，用逗號隔開。新值也可以用原本的值來算，例如 <code>score = score + 5</code>。</p>
<p><b>刪除</b>資料：<code>DELETE FROM 資料表 WHERE 條件;</code>。</p>
<p>⚠️ 這兩個指令<b>一定要寫 WHERE</b>！沒寫 WHERE 的 UPDATE 會把<b>整張表每一筆</b>都改掉，DELETE 會把整張表清空，真的 MySQL 裡沒有復原鍵。好習慣是：先用 SELECT 加同樣的 WHERE 看看會影響哪幾筆，確定了再改。</p>`,
    ex: [
      { h: '修改一筆', code: `UPDATE students SET score = 85 WHERE name = '吱吱';

SELECT name, score FROM students WHERE name = '吱吱';`,
        note: `<ul><li>WHERE 找到名字是吱吱的那一筆，把 score 改成 85。</li><li>UPDATE 沒有查詢結果，用 SELECT 確認：78 → 85。</li></ul>` },
      { h: '用原本的值計算、改多個欄位', code: `UPDATE students
SET grade = grade + 1, score = score + 2
WHERE dept = '會計';

SELECT name, dept, grade, score FROM students WHERE dept = '會計';`,
        note: `<ul><li>會計系的每一筆：年級加 1、成績加 2，兩個欄位用逗號隔開。</li><li>WHERE 符合幾筆就改幾筆（這裡 2 筆）。</li></ul>` },
      { h: '刪除資料', code: `SELECT * FROM students WHERE score < 60;

DELETE FROM students WHERE score < 60;

SELECT COUNT(*) AS 剩下人數 FROM students;`,
        note: `<ul><li>第 1 句：刪之前先 SELECT 看看會刪到誰（大雄 58）。</li><li>第 2 句：真的刪除。</li><li>第 3 句：確認剩下 7 人。</li></ul>` },
    ],
    pit: [`UPDATE / DELETE 忘了 WHERE：整張表都被改掉或刪光。`, `WHERE 條件寫太寬：<code>WHERE dept = '資管'</code> 會改到所有資管系的人。`, `SET 多個欄位時用了 AND：<code>SET a = 1 AND b = 2</code> 是錯的，要用逗號。`],
    sum: [`<code>UPDATE 表 SET 欄位 = 值, ... WHERE 條件;</code>`, `<code>DELETE FROM 表 WHERE 條件;</code>`, `一定要寫 WHERE；先 SELECT 確認再動手。`],
    task: '大雄補考後成績改成 <b>68</b>；然後<b>刪除</b>成績低於 <b>70</b> 的學生。（兩句都要寫）', start: ``, ans: `UPDATE students SET score = 68 WHERE name = '大雄';\nDELETE FROM students WHERE score < 70;`,
    check: `SELECT * FROM students ORDER BY id;`,
  },
  {
    id: 'sq9', t: 'JOIN：合併資料表',
    intro: `<p>好的資料庫設計會把資料<b>拆成好幾張表</b>：學生一張、候選人一張、投票紀錄一張。投票紀錄裡只存號碼（<code>student_id</code>、<code>candidate_id</code>），這種指到別張表的欄位叫<b>外鍵</b>。這樣候選人改口號只要改一個地方。</p>
<p>查詢時再用 <code>JOIN</code> 把表接起來：<code>FROM votes JOIN candidates ON votes.candidate_id = candidates.id</code>，ON 後面寫「怎麼對起來」。</p>
<p>欄位名稱在兩張表都有（像 id、name）時要寫成 <code>表名.欄位</code>。表名太長可以取別名：<code>FROM votes v JOIN candidates c</code>，之後寫 <code>c.name</code> 就好。<code>JOIN</code>（INNER JOIN）只留下兩邊對得上的資料；<code>LEFT JOIN</code> 會保留左邊全部的資料。</p>`,
    ex: [
      { h: '把號碼換成名字', code: `SELECT v.id, v.candidate_id, c.name AS 候選人
FROM votes v
JOIN candidates c ON v.candidate_id = c.id;`,
        note: `<ul><li>votes 每一筆都用 candidate_id 去 candidates 找 id 相同的那一列，接在一起。</li><li><code>v</code>、<code>c</code> 是別名；<code>c.name</code> 指 candidates 的 name。</li></ul>` },
      { h: '三張表一起接', code: `SELECT s.name AS 投票人, s.dept AS 系, c.name AS 投給
FROM votes v
JOIN students s ON v.student_id = s.id
JOIN candidates c ON v.candidate_id = c.id
ORDER BY v.id;`,
        note: `<ul><li>可以連續 JOIN：votes 先接 students 拿投票人名字，再接 candidates 拿候選人名字。</li><li>每個 JOIN 都要有自己的 ON 條件。</li></ul>` },
      { h: 'JOIN ＋ GROUP BY 做統計', code: `SELECT s.dept AS 系, c.name AS 候選人, COUNT(*) AS 票數
FROM votes v
JOIN students s ON v.student_id = s.id
JOIN candidates c ON v.candidate_id = c.id
GROUP BY s.dept, c.name
ORDER BY s.dept, 票數 DESC;`,
        note: `<ul><li>接好之後就跟一張表一樣，可以 GROUP BY、ORDER BY。</li><li>結果是「每個系投給每位候選人的票數」，資管系 3 票全投彥霖。</li></ul>` },
    ],
    pit: [`忘記寫 ON：每一筆會跟另一張表每一筆配對（笛卡兒積），結果爆量。`, `欄位名稱模稜兩可：兩張表都有 name，直接寫 <code>name</code> 會出現 ambiguous 錯誤，要寫 <code>c.name</code>。`, `ON 條件對錯欄位：<code>v.student_id = c.id</code> 會把學生號碼當候選人號碼。`],
    sum: [`<code>FROM A JOIN B ON A.外鍵 = B.主鍵</code>。`, `用別名縮短：<code>FROM votes v</code>，欄位寫 <code>v.欄位</code>。`, `可以連續 JOIN，接好後照常 WHERE / GROUP BY / ORDER BY。`],
    task: '開票！算出<b>每位候選人的得票數</b>（候選人名字、票數），<b>票多的排前面</b>。', start: ``,
    ans: `SELECT c.name, COUNT(*) AS 票數\nFROM votes v JOIN candidates c ON v.candidate_id = c.id\nGROUP BY c.name\nORDER BY 票數 DESC;`, ordered: true,
  },
];

// ---------------------------------------------------------------- AI Agent 入門
// 主線：一步步做出「彥霖的競選小幫手」。從最小的感知—決策—行動，到評分選擇、任務規劃、和語言模型溝通、
// 工具箱、思考—行動—觀察循環、記憶、檢索、自我檢查與分工，最後是權限與上線前的測試。
// 範例裡的「模型」都是照規則回應的 Python 函式，用來看清楚代理的運作，不需要 API 金鑰。
export const AG = [
  {
    id: 'ag1', t: '感知、決策、行動：最小的代理',
    intro: `<p>一般的程式是「給輸入 → 算一次 → 給輸出」就結束了。<b>代理</b>（agent）不一樣：它會<b>反覆</b>做三件事 —— <b>感知</b>現在的狀況、<b>決策</b>下一步、<b>行動</b>改變狀況，然後再感知一次，直到目標達成。</p>
<p>其實你在遊戲裡已經看過很多代理：在校園散步的漢克、會閃開機車的路人，都是一直在「看周圍 → 決定 → 移動」。<b>AI 代理</b>只是把「決策」這一格換成語言模型，讓它能理解文字目標、自己想下一步。</p>
<p>這門課會用 Python 一步步做出「彥霖的競選小幫手」。第一章先不碰 AI，用最簡單的規則把「感知、決策、行動、停止條件」這個骨架搭起來 —— 之後每一章都是在這個骨架上加東西。</p>`,
    ex: [
      { h: '一般程式 vs. 代理', code: `# 一般程式：給輸入、算一次、結束
def price_with_tax(p):
    return round(p * 1.05)
print(price_with_tax(100))

# 代理：反覆「感知 → 決策 → 行動」，直到目標達成
temperature = 30
target = 25
while temperature > target:
    action = "開冷氣" if temperature - target >= 3 else "開電扇"
    temperature -= 2 if action == "開冷氣" else 1
    print(f"{action} → 室溫 {temperature} 度")
print("達到目標溫度，停止")`,
        note: `<ul><li>第 2～4 行是一般程式：算完 105 就結束。</li><li>第 7～13 行是代理：每一圈先<b>感知</b>目前溫度（while 的條件）、<b>決策</b>（差 3 度以上開冷氣，不然開電扇）、<b>行動</b>（溫度下降）。</li><li>它會依照狀況改變做法：30→28→26 用冷氣，最後差 1 度改用電扇，到 25 度停止。</li></ul>` },
      { h: '把感知和決策拆成函式', code: `hallway = [3, 0, 5, 0, 2, 4]   # 走廊上每間教室的人數
pos, flyers = 0, 10

def sense():
    return {"位置": pos, "人數": hallway[pos], "傳單": flyers}

def decide(obs):
    if obs["傳單"] == 0:
        return "回去補貨"
    if obs["人數"] > 0:
        return "發傳單"
    return "往前走"

while pos < len(hallway):
    obs = sense()
    act = decide(obs)
    print(obs, "→", act)
    if act == "回去補貨":
        break
    if act == "發傳單":
        n = min(obs["人數"], flyers)
        flyers -= n
        hallway[pos] -= n
    else:
        pos += 1`,
        note: `<ul><li><code>sense()</code> 只負責「看」，把目前狀況整理成一個字典（觀察 observation）。</li><li><code>decide()</code> 只負責「想」：拿觀察結果決定動作，不直接改任何東西。</li><li>迴圈負責「做」：發傳單、往前走。三者分開，之後要把 <code>decide</code> 換成語言模型時，其他部分都不用改。</li><li>手上 10 張傳單在第 5 間教室發完，代理判斷要回去補貨並停止。</li></ul>` },
      { h: '遊戲 NPC 和 AI 代理比一比', code: `parts = [
    ("感知", "看附近有沒有玩家", "讀使用者的訊息、工具查到的結果"),
    ("決策", "寫死的 if 規則", "交給語言模型判斷"),
    ("行動", "走路、說話", "呼叫工具、回覆文字"),
    ("目標", "在校園巡邏", "完成使用者交代的任務"),
]
for name, npc, ai in parts:
    print(f"【{name}】NPC：{npc}｜AI 代理：{ai}")`,
        note: `<ul><li>串列裡每一筆是一個「元組」（tuple），<code>for name, npc, ai in parts</code> 一次拆成三個變數。</li><li>兩者的骨架完全一樣，差別在「決策」的聰明程度，以及能做的「行動」有多少種。</li></ul>` },
    ],
    pit: [`只回答一次的聊天就叫代理：沒有「看結果再決定下一步」的循環就不算。`, `沒有停止條件：目標達不到時會一直跑下去，一定要有上限或停止規則。`, `感知、決策、行動全部寫在一起：之後很難換成語言模型，也很難測試。`],
    sum: [`代理 = 反覆「感知 → 決策 → 行動」，直到目標達成。`, `把 sense／decide／act 分開寫。`, `一定要有停止條件。`],
    task: '電量代理：<code>battery = 35</code>，跑 <b>4</b> 步。每一步電量低於 20 就「充電」（+30），否則「工作」（-10），每步印出 <code>動作 電量</code>，例如 <code>工作 25</code>。',
    start: `battery = 35\n`, ans: `battery = 35\nfor step in range(4):\n    if battery < 20:\n        action = "充電"\n        battery += 30\n    else:\n        action = "工作"\n        battery -= 10\n    print(action, battery)`, out: '工作 25\n工作 15\n充電 45\n工作 35', must: ['for', 'while'], mustAny: true,
  },
  {
    id: 'ag2', t: '目標與評分：讓代理自己挑',
    intro: `<p>代理常常同時有好幾個可以做的事。要讓它「挑對」，最直接的方法是幫每個選項<b>打分數</b>：這個行動對目標有多少幫助、要花多少代價，算出一個數字，再挑最高的。這種分數叫做<b>效用</b>（utility）。</p>
<p>做法有三步：① 先用<b>限制條件</b>刪掉做不到的選項（錢不夠、時間不夠）；② 用<b>權重</b>把好處和代價合成一個分數（權重代表你在乎哪個比較多）；③ 挑分數最高的。</p>
<p>另外還有一個問題：如果永遠只選目前最好的，就永遠不會發現更好的選項。所以有時候要保留一點機率去<b>嘗試新的</b>（探索），其他時候選已知最好的（利用）。語言模型做決定時也在做類似的取捨，只是沒有寫成數字。</p>`,
    ex: [
      { h: '幫每個選項打分數', code: `actions = {
    "去學餐發傳單": {"人數": 80, "時間": 30},
    "去圖書館發傳單": {"人數": 20, "時間": 10},
    "在宿舍門口站崗": {"人數": 50, "時間": 40},
}

def score(a):
    return a["人數"] / a["時間"]     # 每分鐘能接觸幾個人

for name, a in actions.items():
    print(f"{name}：{score(a):.2f}")
best = max(actions, key=lambda n: score(actions[n]))
print("選擇：", best)`,
        note: `<ul><li>分數的定義是「每分鐘能接觸的人數」：學餐 2.67、圖書館 2.00、宿舍 1.25。</li><li><code>max(字典, key=...)</code> 會用 key 算出來的值比大小，回傳分數最高的那個名字。</li><li>只看人數會選學餐、只看時間會選圖書館；把兩者合成一個分數才是你真正想要的。</li></ul>` },
      { h: '先過濾、再加權', code: `options = [
    {"name": "騎車去夜市", "fun": 9, "cost": 300, "minutes": 60},
    {"name": "回宿舍讀書", "fun": 3, "cost": 0, "minutes": 120},
    {"name": "去麥當勞", "fun": 6, "cost": 150, "minutes": 40},
]
budget, free_time = 200, 130
w_fun, w_cost = 1.0, 0.01

ok = [o for o in options if o["cost"] <= budget and o["minutes"] <= free_time]
for o in ok:
    o["score"] = w_fun * o["fun"] - w_cost * o["cost"]
    print(o["name"], round(o["score"], 2))
print("決定：", max(ok, key=lambda o: o["score"])["name"])`,
        note: `<ul><li>第 9 行先用限制條件過濾：夜市最好玩，但 300 元超過預算，直接出局。</li><li>剩下的用權重算分：讀書 3 − 0 = 3；麥當勞 6 − 1.5 = 4.5。</li><li>權重 <code>w_cost</code> 調大，代表你更在意花錢 —— 改改看，決定可能就變了。</li></ul>` },
      { h: '探索與利用', code: `import random
random.seed(8)                         # 固定亂數，每次跑結果都一樣
total = {"大麥克": 0, "雞塊": 0, "薯條": 0}     # 每道菜累積的滿意度
taste = {"大麥克": 7, "雞塊": 9, "薯條": 5}     # 代理一開始不知道的真實喜好

for day in range(1, 11):
    if random.random() < 0.3:                  # 30% 機率嘗試（探索）
        pick = random.choice(list(total))
    else:                                      # 其他時候選目前最好的（利用）
        pick = max(total, key=total.get)
    total[pick] += taste[pick]
print(total)
print("最常點的：", max(total, key=total.get))`,
        note: `<ul><li>代理不知道哪道菜最好吃，只能邊點邊記。</li><li><code>random.random() &lt; 0.3</code>：大約三成的日子隨便點一道（探索），其他日子點目前分數最高的（利用）。</li><li>一開始三道菜都是 0 分，代理先一直點大麥克；靠著偶爾的探索，它吃到雞塊、發現更好吃，之後就改成常點雞塊。</li><li>完全不探索的話，第一天點到什麼就一直點什麼，永遠不知道雞塊更好吃；探索太多又浪費機會。</li></ul>` },
    ],
    pit: [`只看一個指標：只看人數就會一直跑去最擠但最遠的地方。`, `忘了先過濾做不到的選項，結果選了一個超出預算的。`, `權重隨便設、不測試：權重就是你的價值判斷，要用幾個例子檢查結果合不合理。`],
    sum: [`效用分數：把好處和代價合成一個數字。`, `先用限制條件過濾，再加權計分，挑最高的。`, `偶爾探索，才能找到更好的選項。`],
    task: '<code>spots</code> 裡是（人數, 需要的分鐘數），印出「每分鐘人數」最高的地點名稱。',
    start: `spots = {"體育館": (60, 20), "活動中心": (90, 45), "校門口": (40, 10)}\n`, ans: `spots = {"體育館": (60, 20), "活動中心": (90, 45), "校門口": (40, 10)}\nprint(max(spots, key=lambda n: spots[n][0] / spots[n][1]))`, out: '校門口',
  },
  {
    id: 'ag3', t: '任務拆解與規劃',
    intro: `<p>「幫我辦一場造勢晚會」這種目標太大，沒辦法一步做完。代理要先把它<b>拆解</b>成小任務，小任務再拆成更小的，直到每一步都是能直接做的動作。</p>
<p>小任務之間常有<b>先後關係</b>：場地借到了才能佈置、海報做好了才能發。把「誰要等誰」寫清楚，就能排出一個不會卡住的順序。</p>
<p>計畫不會永遠順利：影印機壞了、場地被借走了。好的代理遇到失敗會<b>重新規劃</b>（換一個替代方案），而不是硬做下去或直接放棄。語言模型很擅長寫出計畫清單，但檢查順序和處理失敗，還是要靠程式把關。</p>`,
    ex: [
      { h: '把大目標拆成一棵樹', code: `goal = {
    "辦造勢晚會": {
        "場地": {"借活動中心": {}, "佈置舞台": {}},
        "宣傳": {"做海報": {}, "發限時動態": {}},
        "當天": {"彩排": {}, "上台演講": {}},
    }
}

def show(tree, depth=0):
    for name, sub in tree.items():
        print("  " * depth + "- " + name)
        show(sub, depth + 1)

show(goal)`,
        note: `<ul><li>用「字典裡面再放字典」表示拆解：每一層都是上一層的子任務，空字典代表已經是最小的動作。</li><li><code>show</code> 是<b>遞迴</b>函式：印出自己這一層，再呼叫自己去印下一層，<code>depth</code> 控制縮排。</li></ul>` },
      { h: '排出不會卡住的順序', code: `tasks = {                      # 任務：[要先完成的任務]
    "借活動中心": [],
    "做海報": [],
    "發限時動態": ["做海報"],
    "佈置舞台": ["借活動中心"],
    "彩排": ["佈置舞台"],
    "上台演講": ["彩排", "發限時動態"],
}
done, order = set(), []
while len(order) < len(tasks):
    for t, need in tasks.items():
        if t not in done and all(n in done for n in need):
            order.append(t)
            done.add(t)
            break
for i, t in enumerate(order, 1):
    print(i, t)`,
        note: `<ul><li>每一輪從頭找「還沒做、而且需要的任務都完成了」的第一個任務，把它排進順序。</li><li><code>all(...)</code>：裡面每一個都成立才是 True，用來檢查前置任務是不是都做完了。</li><li>排出來的順序保證每個任務開始前，它需要的東西都已經好了。如果任務互相等待（A 等 B、B 等 A），這個迴圈會停不下來 —— 實際使用時要加檢查。</li></ul>` },
      { h: '失敗時重新規劃', code: `plan = ["訂場地", "印海報", "發海報"]
broken = {"印海報"}                    # 影印機壞了
backup = {"印海報": "改去影印部印"}

step = 0
while step < len(plan):
    task = plan[step]
    if task in broken:
        print("失敗：", task)
        plan[step] = backup[task]       # 改用替代方案
        broken.discard(task)
        print("  重新規劃 →", plan)
        continue
    print("完成：", task)
    step += 1`,
        note: `<ul><li>執行到「印海報」失敗，代理把計畫裡的這一步換成替代方案，然後 <code>continue</code> 回到迴圈開頭重新嘗試同一步。</li><li>其他已完成的步驟不用重做，後面的步驟照原計畫繼續。</li></ul>` },
    ],
    pit: [`計畫太粗（「把晚會辦好」）或太細（每一個小動作都列出來）。`, `忽略先後關係：還沒借到場地就去佈置。`, `失敗了不重新規劃，一直重試同一個壞掉的方法。`],
    sum: [`大目標拆成小任務，直到每一步都能直接做。`, `寫清楚相依關係，排出可行的順序。`, `失敗時換方案、重新規劃。`],
    task: '用範例 2 的方法排出順序，印出 <code>" → ".join(order)</code>。',
    start: `tasks = {"買食材": [], "煮麵": ["買食材"], "洗碗": ["吃麵"], "吃麵": ["煮麵"]}\n`,
    ans: `tasks = {"買食材": [], "煮麵": ["買食材"], "洗碗": ["吃麵"], "吃麵": ["煮麵"]}\ndone, order = set(), []\nwhile len(order) < len(tasks):\n    for t, need in tasks.items():\n        if t not in done and all(n in done for n in need):\n            order.append(t)\n            done.add(t)\n            break\nprint(" → ".join(order))`, out: '買食材 → 煮麵 → 吃麵 → 洗碗',
  },
  {
    id: 'ag4', t: '跟語言模型溝通',
    intro: `<p>要把「決策」交給語言模型，得先學會怎麼跟它講話。大部分語言模型的 API 收的是一串<b>訊息</b>，每則訊息有<b>角色</b>：<code>system</code> 是給模型的工作說明，<code>user</code> 是使用者說的話，<code>assistant</code> 是模型之前的回答。模型看完整串對話，再產生下一句。</p>
<p>代理需要的不是漂亮的句子，而是<b>程式讀得懂的回答</b>。所以通常會要求模型用 JSON 回答，例如 <code>{"intent": "查課表"}</code>。但模型偶爾會在 JSON 前後加廢話、少一個括號，所以程式要能<b>從回答中找出 JSON</b>、讀不懂時<b>告訴模型哪裡錯並請它重答</b>，而且重試要有次數上限。</p>
<p>另一個好習慣：把「指令」和「使用者給的資料」分開，資料只是要處理的內容，不是要照做的命令。</p>`,
    ex: [
      { h: '組出一次請求', code: `def make_request(system, history, user_text):
    msgs = [{"role": "system", "content": system}]
    msgs += history
    msgs.append({"role": "user", "content": user_text})
    return msgs

history = [
    {"role": "user", "content": "明天有什麼課？"},
    {"role": "assistant", "content": "明天早上有資料庫系統。"},
]
req = make_request("你是彥霖的行程助理，回答要簡短。", history, "幾點上課？")
for m in req:
    print(f"{m['role']:>9}: {m['content']}")`,
        note: `<ul><li>system 放在最前面，接著是之前的對話，最後是這次的問題。</li><li>模型本身不會記得上一次聊了什麼，每次請求都要把需要的對話紀錄<b>一起送過去</b>，所以「幾點上課」才知道是在問資料庫系統。</li><li><code>{m['role']:&gt;9}</code> 讓角色名稱靠右對齊 9 格，比較好讀。</li></ul>` },
      { h: '從回答裡找出 JSON', code: `import json, re

replies = [
    '{"intent": "查課表", "day": "明天"}',
    '好的！這是結果：{"intent": "訂餐", "item": "大麥克"} 希望有幫助',
    '我不太確定耶',
]

def parse(reply):
    m = re.search(r"\\{.*\\}", reply, re.S)    # 找出第一個 { 到最後一個 } 的部分
    if not m:
        return None
    try:
        return json.loads(m.group())
    except json.JSONDecodeError:
        return None

for r in replies:
    print(parse(r))`,
        note: `<ul><li>第一個回答很乖，直接就是 JSON；第二個前後多了廢話；第三個根本沒有 JSON。</li><li><code>re.search(r"\\{.*\\}", ...)</code> 用正規表示式抓出大括號包住的那段，<code>re.S</code> 讓 <code>.</code> 也能跨行。</li><li><code>try / except</code>：就算抓出來的不是合法 JSON，程式也不會當掉，而是回傳 <code>None</code> 讓後面處理。</li></ul>` },
      { h: '格式錯了就請它重答', code: `import json

answers = iter(["意圖是查天氣", '{"intent": "查天氣"}'])   # 假模型：第一次亂答，第二次照格式

def fake_llm(messages):
    return next(answers)

messages = [{"role": "user", "content": '只用 JSON 回答，例如 {"intent": "..."}：明天會下雨嗎？'}]
for attempt in range(1, 4):
    reply = fake_llm(messages)
    try:
        data = json.loads(reply)
        print(f"第{attempt}次：成功", data)
        break
    except json.JSONDecodeError:
        print(f"第{attempt}次：格式錯誤，請它重答")
        messages.append({"role": "assistant", "content": reply})
        messages.append({"role": "user", "content": "格式錯了，只能回傳 JSON。"})`,
        note: `<ul><li><code>iter()</code> 和 <code>next()</code> 讓假模型每次被呼叫就吐出下一個預先寫好的回答。</li><li>失敗時把模型的錯誤回答和「哪裡錯了」都加進對話，模型下一次就知道要修正什麼。</li><li><code>range(1, 4)</code> 是最多 3 次的上限，避免永遠重試。</li></ul>` },
    ],
    pit: [`直接 <code>json.loads(模型回答)</code> 不處理例外，模型多講一句話程式就當掉。`, `沒有把對話紀錄送過去，模型「忘記」剛剛在聊什麼。`, `把使用者貼來的內容當成指令照做。`],
    sum: [`訊息有角色：system、user、assistant；每次都要送完整需要的紀錄。`, `要求 JSON，並且自己把 JSON 找出來、檢查。`, `格式錯了就回饋並重試，重試要有上限。`],
    task: '寫 <code>get_intent(reply)</code>：能讀成 JSON 就回傳其中的 <code>intent</code>，讀不懂就回傳 <b>未知</b>。',
    start: `import json\n\ndef get_intent(reply):\n    pass\n\nprint(get_intent('{"intent": "訂餐"}'))\nprint(get_intent('隨便啦'))\n`,
    ans: `import json\n\ndef get_intent(reply):\n    try:\n        return json.loads(reply)["intent"]\n    except (json.JSONDecodeError, KeyError):\n        return "未知"\n\nprint(get_intent('{"intent": "訂餐"}'))\nprint(get_intent('隨便啦'))`, out: '訂餐\n未知', must: ['def get_intent'],
  },
  {
    id: 'ag5', t: '工具箱：把函式變成工具',
    intro: `<p>語言模型自己查不到公車幾分鐘到站、也不能幫你借討論室。<b>工具</b>就是我們寫好、允許代理使用的函式。代理決定「要用哪個工具、參數填什麼」，<b>真正執行的是我們的程式</b>。</p>
<p>要讓代理會用工具，需要一個<b>工具箱</b>：名字對應到函式，加上每個工具的說明（做什麼、要哪些參數），這份說明會一起交給模型看。Python 可以直接從函式的 docstring 和參數自動產生說明，不用手寫兩份。</p>
<p>代理填的參數不一定對：可能少填、填錯名字、數值超出範圍。所以呼叫工具前要先<b>檢查參數</b>，出錯時回傳一段<b>看得懂的錯誤訊息</b>（讓代理能修正），而不是讓整個程式當掉。</p>`,
    ex: [
      { h: '用裝飾器把函式登記進工具箱', code: `TOOLBOX = {}

def tool(fn):
    TOOLBOX[fn.__name__] = fn        # 登記到工具箱
    return fn

@tool
def bus_time(stop):
    """查公車還有幾分鐘到站"""
    return {"中原大學": 4, "中壢車站": 12}.get(stop, "查無此站")

@tool
def lunch_menu():
    """列出今天學餐的菜單"""
    return ["滷肉飯", "雞腿便當", "牛肉麵"]

for name, fn in TOOLBOX.items():
    print(name, "：", fn.__doc__)
print(TOOLBOX["bus_time"]("中原大學"))`,
        note: `<ul><li><code>@tool</code> 是<b>裝飾器</b>：定義函式時會自動呼叫 <code>tool(函式)</code>，把它登記進 <code>TOOLBOX</code>。</li><li>三個雙引號寫在函式第一行的是 <b>docstring</b>，用 <code>fn.__doc__</code> 拿得到，正好當工具說明。</li><li>最後一行示範「用名字找工具再呼叫」，這就是代理使用工具的方式。</li></ul>` },
      { h: '自動產生工具說明', code: `import inspect

def book_room(room, hour, people=1):
    """借圖書館討論室"""
    return f"已借 {room}，{hour} 點，{people} 人"

sig = inspect.signature(book_room)
spec = {
    "name": book_room.__name__,
    "description": book_room.__doc__,
    "params": {n: ("選填" if p.default is not p.empty else "必填")
               for n, p in sig.parameters.items()},
}
print(spec)`,
        note: `<ul><li><code>inspect.signature</code> 讀出函式有哪些參數、有沒有預設值。</li><li>有預設值的（people）是選填，沒有的（room、hour）是必填。這份 <code>spec</code> 就是要給模型看的「工具說明書」。</li><li>改函式時說明會自動跟著變，不會發生程式和說明對不上的情況。</li></ul>` },
      { h: '安全地呼叫工具', code: `import inspect

def book_room(room, hour, people=1):
    if not 8 <= hour <= 21:
        raise ValueError("只能借 8 點到 21 點")
    return f"已借 {room}，{hour} 點，{people} 人"

def safe_call(fn, args):
    try:
        inspect.signature(fn).bind(**args)     # 先檢查參數名稱和數量
    except TypeError as e:
        return f"參數錯誤：{e}"
    try:
        return fn(**args)
    except Exception as e:
        return f"執行失敗：{e}"

print(safe_call(book_room, {"room": "A101", "hour": 14}))
print(safe_call(book_room, {"room": "A101"}))
print(safe_call(book_room, {"room": "A101", "hour": 23}))`,
        note: `<ul><li><code>.bind(**args)</code> 先試著把參數對上函式，少填或多填會丟出 <code>TypeError</code>。</li><li>參數形式對了，執行時還是可能違反規則（23 點不能借），用第二個 <code>try</code> 接住。</li><li>兩種錯誤都變成一句話回傳。代理看到「只能借 8 點到 21 點」，下一步就能改填正確的時間。</li></ul>` },
    ],
    pit: [`讓代理用任何名字呼叫任何函式：只能呼叫工具箱裡登記過的。`, `工具說明寫得太簡略，代理不知道什麼時候該用、參數該填什麼。`, `工具出錯直接讓程式當掉，代理沒有機會修正。`],
    sum: [`工具 = 允許代理使用的函式，執行的是我們的程式。`, `工具箱：名字 → 函式 ＋ 說明（可用 docstring、inspect 自動產生）。`, `呼叫前檢查參數，錯誤回傳成看得懂的訊息。`],
    task: '用 <code>@tool</code> 登記一個工具 <code>add_votes(n)</code>，回傳 <code>100 + n</code>，再用 <code>TOOLBOX["add_votes"](34)</code> 呼叫並印出結果。',
    start: `TOOLBOX = {}\n\ndef tool(fn):\n    TOOLBOX[fn.__name__] = fn\n    return fn\n\n`, ans: `TOOLBOX = {}\n\ndef tool(fn):\n    TOOLBOX[fn.__name__] = fn\n    return fn\n\n@tool\ndef add_votes(n):\n    return 100 + n\n\nprint(TOOLBOX["add_votes"](34))`, out: '134', must: ['@tool'],
  },
  {
    id: 'ag6', t: '思考—行動—觀察循環',
    intro: `<p>把前面的零件組起來，就是 AI 代理的核心循環：模型看著<b>目標</b>和到目前為止的<b>觀察紀錄</b>，決定下一個行動（用哪個工具、參數是什麼）→ 程式執行工具 → 把結果當成新的<b>觀察</b>記下來 → 再問模型。直到模型說「完成」為止。</p>
<p>這份一路累積的紀錄叫做<b>草稿區</b>（scratchpad）：「目標、行動、觀察、行動、觀察……」，每一輪都會整份送給模型，它才知道已經查過什麼。紀錄越長越花錢，也越容易讓模型分心，所以要只留重要的內容。</p>
<p>循環一定要有<b>停止條件</b>：模型說完成、達到最大步數、或者發現它在<b>鬼打牆</b>（一直重複同一個動作）。停下來的時候，要把目前查到的東西交給人，而不是什麼都沒說就結束。</p>`,
    ex: [
      { h: '完整的一次循環', code: `def model(goal, notes):
    # 假模型：依照目前的筆記決定下一步（真的系統由語言模型決定）
    if "天氣" not in notes:
        return ("查天氣", "中壢")
    if "雨" in notes["天氣"] and "雨具" not in notes:
        return ("查雨具", "宿舍")
    return ("完成", None)

def run_tool(name, arg):
    return {"查天氣": "下午有雨", "查雨具": "宿舍有一把傘"}[name]

goal, notes = "下午出門要帶什麼", {}
for step in range(1, 6):
    action, arg = model(goal, notes)
    if action == "完成":
        print(f"[{step}] 完成：帶傘出門（根據 {notes}）")
        break
    obs = run_tool(action, arg)
    notes[action.replace("查", "")] = obs
    print(f"[{step}] 行動：{action}（{arg}）→ 觀察：{obs}")`,
        note: `<ul><li>第 1 步：還不知道天氣 → 查天氣，觀察到「下午有雨」。</li><li>第 2 步：模型看到筆記裡有「雨」→ 決定查雨具。第 3 步：資訊夠了 → 完成，並說明根據。</li><li>每一步模型都是看<b>最新的筆記</b>做決定，所以順序不是事先寫死的：如果天氣是晴天，第 2 步就會直接完成。</li></ul>` },
      { h: '草稿區：每一輪送給模型的內容', code: `pad = []

def log(kind, text):
    pad.append(f"{kind}：{text}")

log("目標", "找到吱吱現在在哪")
log("行動", "查好友定位")
log("觀察", "吱吱在體育館")
log("行動", "查體育館開放時間")
log("觀察", "體育館開到 22:00")

prompt = "\\n".join(pad) + "\\n下一步："
print(prompt)
print("（共", len(prompt), "個字，紀錄越長，每一輪越花錢）")`,
        note: `<ul><li>草稿區就是把目標和每一次的行動、觀察照順序串起來。</li><li><code>"\\n".join(pad)</code> 用換行把每一筆接起來，最後加上「下一步：」請模型接著寫。</li><li>真的系統裡，觀察可能是一整頁網頁 —— 要先摘要或只留相關的部分，不然很快就塞滿。</li></ul>` },
      { h: '偵測鬼打牆', code: `decisions = ["查課表", "查教室", "查課表", "查課表", "查課表"]   # 假模型開始重複
seen = {}
for step, act in enumerate(decisions, 1):
    seen[act] = seen.get(act, 0) + 1
    if seen[act] >= 3:
        print(f"[{step}] 「{act}」已經做了 3 次，判定卡住，停止並回報目前結果")
        break
    print(f"[{step}] {act}")`,
        note: `<ul><li>用字典記每個動作出現幾次；同一個動作第 3 次出現就停下來。</li><li>模型卡住常見的原因：工具一直回傳錯誤、目標寫得不清楚、或觀察沒有加進紀錄。停下來回報，比無止境地花錢好。</li></ul>` },
    ],
    pit: [`工具結果沒有記進紀錄，模型不知道查過了，一直重查。`, `沒有最大步數，也沒有偵測重複。`, `紀錄無限變長，又貴又容易讓模型分心。`],
    sum: [`循環：看目標＋紀錄 → 決定行動 → 執行 → 記下觀察。`, `草稿區每一輪都要送給模型。`, `停止條件：完成、步數上限、偵測到重複。`],
    task: '跑一個最多 5 步的循環：動作是「查價格」就把價格加進 <code>total</code>；動作是「完成」就印出 <code>總共 {total} 元</code> 並結束。',
    start: `script = [("查價格", "大麥克"), ("查價格", "可樂"), ("完成", None)]\nprices = {"大麥克": 75, "可樂": 30}\n\ndef model(step):\n    return script[step]\n\ntotal = 0\n`,
    ans: `script = [("查價格", "大麥克"), ("查價格", "可樂"), ("完成", None)]\nprices = {"大麥克": 75, "可樂": 30}\n\ndef model(step):\n    return script[step]\n\ntotal = 0\nfor step in range(5):\n    action, item = model(step)\n    if action == "完成":\n        print(f"總共 {total} 元")\n        break\n    total += prices[item]`, out: '總共 105 元', must: ['for'],
  },
  {
    id: 'ag7', t: '記憶：工作記憶與長期記憶',
    intro: `<p>代理的記憶分兩種。<b>工作記憶</b>是「最近發生的事」：最近幾句對話、這次任務的進度。它的空間有限，所以只保留最新的幾筆，比較舊的就<b>摘要</b>成重點，或乾脆丟掉。</p>
<p><b>長期記憶</b>是「之後還用得到的事」：使用者的名字、過敏、喜好。它要存在對話以外的地方（檔案、資料庫），需要的時候再<b>找回來</b>。同一件事有了新資訊要<b>更新</b>，而不是存兩份互相矛盾的資料。</p>
<p>記憶也有界線：只記值得記、使用者同意記的事，而且要能刪掉。像密碼、身分證字號這種資料，不該被記下來。</p>`,
    ex: [
      { h: '工作記憶：只留最近幾句', code: `from collections import deque

recent = deque(maxlen=3)          # 只記最近 3 句
for msg in ["我叫彥霖", "我是資管系", "我喜歡吃牛肉麵", "明天要考試", "幫我加油"]:
    recent.append(msg)
    print(list(recent))`,
        note: `<ul><li><code>deque(maxlen=3)</code> 是固定長度的佇列：放第 4 筆時，最舊的一筆會自動被擠出去。</li><li>到最後只剩最新的 3 句 —— 「我叫彥霖」已經被忘記了。下一個範例就是在解決這個問題。</li></ul>` },
      { h: '把舊對話摘要成重點', code: `history = ["我叫彥霖", "今天好熱", "我是資管系三年級", "哈哈哈", "我對花生過敏"]
keys = ["叫", "系", "過敏"]          # 值得留下來的資訊

summary = [m for m in history if any(k in m for k in keys)]
print("原本", len(history), "句 → 摘要", len(summary), "句")
print("摘要：", "；".join(summary))`,
        note: `<ul><li>這裡用關鍵字挑出重要的句子；真的系統通常請語言模型幫忙寫摘要。</li><li>「今天好熱」「哈哈哈」對之後沒有幫助，丟掉可以省下很多空間；名字、系級、過敏這種資訊要留下來。</li></ul>` },
      { h: '長期記憶：存、更新、找回來', code: `memory = []

def remember(fact, tags):
    for m in memory:
        if m["tags"] == tags:          # 同一件事：更新，不要存兩份
            m["fact"] = fact
            return
    memory.append({"fact": fact, "tags": tags})

def recall(question):
    return [m["fact"] for m in memory if any(t in question for t in m["tags"])]

remember("住在宿舍 A 棟", ["住", "宿舍"])
remember("最愛珍珠奶茶", ["飲料", "喝"])
remember("搬到宿舍 B 棟", ["住", "宿舍"])
print(memory)
print(recall("我想喝點什麼"))
print(recall("我住哪裡"))`,
        note: `<ul><li>每筆記憶有內容和標籤（tags），找的時候看問題裡有沒有出現標籤。</li><li>第三次 <code>remember</code> 是同一個主題（住哪），所以把 A 棟<b>更新</b>成 B 棟，不會同時存兩個矛盾的答案。</li><li>真的系統會用「意思相近」來找，而不只是比對關鍵字，下一章會再談。</li></ul>` },
    ],
    pit: [`把整份對話紀錄一直塞給模型，越來越貴、越來越慢。`, `新舊資料互相矛盾：搬家了卻同時記著兩個地址。`, `什麼都記：敏感資料、使用者沒同意的事也存下來。`],
    sum: [`工作記憶：最近的對話，空間有限，舊的摘要或丟掉。`, `長期記憶：存在外部，需要時找回來，同一件事要更新。`, `只記值得記、允許記、能刪掉的事。`],
    task: '用 <code>deque(maxlen=2)</code> 只留最近 2 句，把 <code>msgs</code> 全部放進去後，印出 <code>" / ".join(recent)</code>。',
    start: `from collections import deque\n\nmsgs = ["我叫彥霖", "明天要考試", "幫我加油"]\n`, ans: `from collections import deque\n\nmsgs = ["我叫彥霖", "明天要考試", "幫我加油"]\nrecent = deque(maxlen=2)\nfor m in msgs:\n    recent.append(m)\nprint(" / ".join(recent))`, out: '明天要考試 / 幫我加油', must: ['deque('],
  },
  {
    id: 'ag8', t: '檢索：先找資料再回答',
    intro: `<p>語言模型不知道「中原的圖書館開到幾點」這種在地資訊，硬要它回答就可能編出一個看起來很像真的答案。解法是給代理一疊<b>資料</b>（校規、公告、FAQ），讓它<b>先找出相關的段落，再根據段落回答</b>。</p>
<p>找資料的基本功是<b>索引</b>：先記下每個詞出現在哪幾份文件，查的時候就不用一份一份翻。找到的文件依<b>相關分數</b>排序，只取前幾名交給模型。真的系統還會用「意思相近」來比對，所以「幾點關門」也找得到「開到晚上十點」。</p>
<p>兩個重要原則：回答要<b>標出根據哪一份資料</b>，讓人可以查證；分數太低、找不到相關資料時，要老實說找不到，而不是亂猜。</p>`,
    ex: [
      { h: '建立索引', code: `docs = {
    "D1": "圖書館 平日 開放 到 晚上 十點",
    "D2": "麥當勞 在 活動中心 地下室",
    "D3": "圖書館 三樓 有 討論室 可以 借",
}
index = {}
for doc_id, text in docs.items():
    for word in text.split():
        index.setdefault(word, set()).add(doc_id)

print(sorted(index["圖書館"]))
print(sorted(index["活動中心"]))
print(len(index), "個不同的詞")`,
        note: `<ul><li>這裡的文件已經用空格分好詞（中文真的要用斷詞工具）。</li><li><code>index</code> 是「詞 → 出現在哪些文件」：<code>setdefault</code> 在第一次遇到某個詞時先放一個空集合。</li><li>查「圖書館」就直接得到 D1、D3，不用把每份文件讀一遍。<code>sorted</code> 讓輸出順序固定。</li></ul>` },
      { h: '依相關分數排序', code: `docs = {
    "D1": "圖書館 平日 開放 到 晚上 十點",
    "D2": "麥當勞 在 活動中心 地下室",
    "D3": "圖書館 三樓 有 討論室 可以 借",
}
index = {}
for doc_id, text in docs.items():
    for word in text.split():
        index.setdefault(word, set()).add(doc_id)

def search(query, k=2):
    scores = {}
    for word in query.split():
        for doc_id in index.get(word, ()):
            scores[doc_id] = scores.get(doc_id, 0) + 1
    ranked = sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    return ranked[:k]

print(search("圖書館 討論室"))
print(search("麥當勞 在 哪"))
print(search("體育館"))`,
        note: `<ul><li>分數 = 問題裡有幾個詞出現在這份文件。D3 同時有「圖書館」和「討論室」，2 分排第一。</li><li><code>key=lambda x: (-x[1], x[0])</code>：先依分數由高到低，同分再依編號排。</li><li>查「體育館」什麼都沒找到，回傳空串列 —— 下一個範例要好好處理這種情況。</li></ul>` },
      { h: '附上根據；找不到就說找不到', code: `docs = {"D1": "圖書館 平日 開放 到 晚上 十點", "D3": "圖書館 三樓 有 討論室 可以 借"}
hits_lib = [("D1", 1), ("D3", 1)]
hits_gym = []

def answer(question, hits):
    if not hits:
        return f"「{question}」：資料裡找不到，我不亂猜。"
    cites = "、".join(d for d, _ in hits)
    facts = " / ".join(docs[d] for d, _ in hits)
    return f"「{question}」：{facts}（根據 {cites}）"

print(answer("圖書館的資訊", hits_lib))
print(answer("體育館開到幾點", hits_gym))`,
        note: `<ul><li>有找到資料：把內容交給模型整理成回答，並附上文件編號，使用者可以回去查證。</li><li>沒找到：直接說找不到。這比編一個答案更有用，也更安全。</li><li><code>for d, _ in hits</code>：底線 <code>_</code> 表示「這個值我用不到」。</li></ul>` },
    ],
    pit: [`沒有檢索就讓模型直接回答在地資訊，結果編出錯的答案。`, `找到的段落其實不相關，還是硬拿來回答。`, `回答不附根據，錯了也沒人發現。`],
    sum: [`先檢索、再回答。`, `索引：詞 → 文件；依分數排序取前幾名。`, `回答附上根據；找不到就說找不到。`],
    task: '用範例 1 的方法替 <code>docs</code> 建立索引，印出包含「借」的文件編號（用 <code>sorted</code> 排序後的串列）。',
    start: `docs = {\n    "D1": "圖書館 平日 開放 到 晚上 十點",\n    "D3": "圖書館 三樓 有 討論室 可以 借",\n    "D4": "體育館 可以 借 球",\n}\n`,
    ans: `docs = {\n    "D1": "圖書館 平日 開放 到 晚上 十點",\n    "D3": "圖書館 三樓 有 討論室 可以 借",\n    "D4": "體育館 可以 借 球",\n}\nindex = {}\nfor doc_id, text in docs.items():\n    for word in text.split():\n        index.setdefault(word, set()).add(doc_id)\nprint(sorted(index["借"]))`, out: "['D3', 'D4']",
  },
  {
    id: 'ag9', t: '自我檢查與分工',
    intro: `<p>代理做出來的東西不一定對。比起相信它「應該沒問題」，更可靠的做法是<b>寫檢查</b>：產出 → 用規則或測試檢查 → 不合格就把問題告訴它、請它修正 → 再檢查。檢查越具體（字數、必須包含的內容、程式有沒有通過測試），修正就越有效。</p>
<p>任務複雜時，可以讓不同的代理<b>分工</b>：一個負責想企劃、一個負責執行、一個負責審核，彼此用<b>訊息</b>交接工作。分工的好處是每個角色的說明可以很專注；壞處是交接越多、越容易出錯、也越花錢 —— 一個代理做得好的事，就不要硬拆。</p>
<p>另一個簡單有效的技巧是<b>多問幾次再投票</b>：同一個問題讓模型回答好幾次，取最多次出現的答案，可以減少偶然的錯誤。</p>`,
    ex: [
      { h: '產出 → 檢查 → 修正', code: `drafts = ["彥霖讚", "投彥霖！資管要贏", "第34屆投彥霖！資管要贏，一起讓系上更好"]   # 假的三次產出

def check(text):
    problems = []
    if "34" not in text:
        problems.append("沒提到第34屆")
    if len(text) < 12:
        problems.append("太短")
    return problems

for i, d in enumerate(drafts, 1):
    p = check(d)
    print(f"第{i}版「{d}」→", "通過" if not p else p)
    if not p:
        break`,
        note: `<ul><li><code>check</code> 把要求寫成具體的規則：要提到第 34 屆、至少 12 個字。</li><li>不合格時回傳「哪裡不合格」的清單 —— 這份清單就是要交給模型修正的回饋。</li><li>第 3 版才全部通過，通過就停止，不用再改。</li></ul>` },
      { h: '多個角色用訊息交接', code: `from collections import deque

inbox = deque([("企劃", "想一個活動")])
log = []
while inbox:
    role, task = inbox.popleft()
    if role == "企劃":
        log.append("企劃：提出『系上電競之夜』")
        inbox.append(("執行", "電競之夜"))
    elif role == "執行":
        log.append(f"執行：完成「{task}」的報名表")
        inbox.append(("審核", "報名表"))
    elif role == "審核":
        log.append(f"審核：{task} 沒問題，可以公告")
print("\\n".join(log))`,
        note: `<ul><li><code>inbox</code> 是工作佇列，<code>popleft()</code> 取出最早的一份工作。每個角色做完，把下一份工作交給下一個角色。</li><li>真的系統裡，每個角色可以是一個有自己說明、自己工具的代理；交接的內容要剛好夠用，不要把全部紀錄都傳過去。</li></ul>` },
      { h: '問好幾次，再投票', code: `from collections import Counter

answers = ["8 點", "8 點", "9 點", "8 點", "7 點"]   # 同一個問題問 5 次的答案
top, count = Counter(answers).most_common(1)[0]
print("投票結果：", top, f"（{count}/{len(answers)} 票）")
print("各答案票數：", dict(Counter(answers)))`,
        note: `<ul><li><code>Counter</code> 幫你數每個答案出現幾次，<code>most_common(1)</code> 取最多的那一個。</li><li>模型偶爾會答錯，但很少每次錯得一樣；多數決能把偶然的錯誤濾掉。代價是要多花幾倍的錢。</li></ul>` },
    ],
    pit: [`只問代理「你確定嗎？」當作檢查：要用具體規則或測試來驗。`, `回饋太模糊（「再好一點」），模型不知道要改哪裡。`, `為了酷而拆成一堆代理，交接出錯、成本暴增。`],
    sum: [`產出 → 具體檢查 → 回饋修正 → 再檢查。`, `分工：角色清楚、用訊息交接，能不拆就不拆。`, `多問幾次再投票，可以減少偶然錯誤。`],
    task: '寫 <code>check(text)</code>：同時「包含 彥霖」而且「不超過 10 個字」就回傳 <b>通過</b>，否則回傳 <b>不通過</b>。',
    start: `def check(text):\n    pass\n\nprint(check("投彥霖一票"))\nprint(check("請大家支持我們的候選人"))\n`,
    ans: `def check(text):\n    if "彥霖" in text and len(text) <= 10:\n        return "通過"\n    return "不通過"\n\nprint(check("投彥霖一票"))\nprint(check("請大家支持我們的候選人"))`, out: '通過\n不通過', must: ['def check'],
  },
  {
    id: 'ag10', t: '安全與上線：權限、限制、測試',
    intro: `<p>代理會自己動手，所以要先想好它<b>能做什麼、不能做什麼</b>。把工具分成<b>等級</b>：只讀資料的（查課表）、會改東西的（寫筆記）、有風險的（轉帳、寄信、刪檔）。每個代理只開放它需要的等級；有風險的動作，一定要先讓人確認。</p>
<p>還要設<b>限制</b>：一分鐘內最多呼叫幾次、一天最多花多少錢。被惡意輸入誘導，或程式出了錯在無限重試時，限制能把損害擋下來。</p>
<p>最後是<b>測試</b>：準備一份固定的測試題（包含「應該拒絕」的情況），每次改了說明、換了模型、加了工具，就重跑一次。全部通過才上線，並且留下紀錄，出事時才查得到是哪一步出錯。</p>`,
    ex: [
      { h: '工具權限分級', code: `LEVEL = {"查課表": "讀", "寫筆記": "寫", "轉帳": "危險"}
ALLOWED = {"讀", "寫"}          # 這個代理被允許的等級

def request(tool):
    level = LEVEL.get(tool)
    if level is None:
        return f"{tool}：不認識的工具，拒絕"
    if level not in ALLOWED:
        return f"{tool}：需要「{level}」權限，拒絕"
    return f"{tool}：允許"

for t in ["查課表", "寫筆記", "轉帳", "刪除全部"]:
    print(request(t))`,
        note: `<ul><li>每個工具標上等級；代理只拿到「讀」「寫」兩種權限。</li><li>沒登記的工具（刪除全部）一律拒絕 —— 預設拒絕比預設允許安全得多。</li><li>「轉帳」就算代理想用也用不了：防護靠的是程式，不是靠模型自己乖。</li></ul>` },
      { h: '頻率限制', code: `calls = []

def limited(tool, now):
    recent = [t for t in calls if now - t < 60]     # 最近 60 秒內的呼叫
    if len(recent) >= 3:
        return f"{now} 秒：{tool} 太頻繁，先暫停"
    calls.append(now)
    return f"{now} 秒：{tool} 執行"

for now in [0, 10, 20, 30, 70]:
    print(limited("寄通知", now))`,
        note: `<ul><li>記下每次呼叫的時間，60 秒內已經有 3 次就拒絕。</li><li>第 30 秒被擋下；到了第 70 秒，第 0、10 秒的紀錄已經超過 60 秒，所以又可以執行。</li><li>就算代理因為錯誤一直想寄通知，同學也不會被洗版。</li></ul>` },
      { h: '上線前跑一次測試', code: `def bot(q):
    if "營業" in q:
        return "05:00-23:00"
    if "在哪" in q:
        return "活動中心 B1"
    return "我不知道"

tests = [
    ("麥當勞營業時間", "05:00-23:00"),
    ("麥當勞在哪", "活動中心 B1"),
    ("可以外送嗎", "我不知道"),
]
failed = [q for q, want in tests if bot(q) != want]
print(f"通過 {len(tests) - len(failed)}/{len(tests)}")
print("可以上線" if not failed else f"不能上線，失敗的題目：{failed}")`,
        note: `<ul><li>測試題包含「不知道就說不知道」的情況，這也是要守住的行為。</li><li>用串列生成式挑出答錯的題目；全部通過才印出「可以上線」。</li><li>之後每次修改都重跑同一份測試，就不會改好一個地方、弄壞另一個地方還不知道。</li></ul>` },
    ],
    pit: [`把所有工具都開放給代理「比較方便」。`, `沒有頻率和花費限制，一個錯誤就重試到天亮。`, `沒測試就上線，或測試題只考會成功的情況。`],
    sum: [`工具分級，只開放需要的，預設拒絕。`, `高風險動作要人確認；加上頻率和花費限制。`, `固定測試題，每次修改都重跑，全過才上線。`],
    task: '寫 <code>can_use(tool)</code>：工具在 <code>LEVEL</code> 裡、而且它的等級在 <code>ALLOWED</code> 裡才回傳 <code>True</code>，否則回傳 <code>False</code>。',
    start: `LEVEL = {"查課表": "讀", "寫筆記": "寫", "轉帳": "危險"}\nALLOWED = {"讀", "寫"}\n\ndef can_use(tool):\n    pass\n\nprint(can_use("查課表"))\nprint(can_use("轉帳"))\nprint(can_use("不存在"))\n`,
    ans: `LEVEL = {"查課表": "讀", "寫筆記": "寫", "轉帳": "危險"}\nALLOWED = {"讀", "寫"}\n\ndef can_use(tool):\n    return LEVEL.get(tool) in ALLOWED\n\nprint(can_use("查課表"))\nprint(can_use("轉帳"))\nprint(can_use("不存在"))`, out: 'True\nFalse\nFalse', must: ['def can_use'],
  },
];
