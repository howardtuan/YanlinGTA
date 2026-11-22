# 中原順起來（YanlinGTA）— 給 Claude 的專案守則

## 新增／設計 NPC：一定先打開 NPC 儀表板

只要有人請你**新增、設計、修改遊戲裡的 NPC（人物）**，第一步就是把開發用的 NPC 儀表板打開給對方看：

1. 用 `preview_start` 啟動 `yanlin-gta`（`.claude/launch.json`，跑的是 `python -I tools/devserver.py 5173`），
   再把瀏覽器導到 **http://localhost:5173/tools/npc-dashboard/**。沒有 Browser pane 的環境就請對方自己開這個網址。
2. 儀表板上可以看到所有 NPC 的全身樣子和人物設定（`data/npcs.json`）。新 NPC 用「＋ 新增 NPC」建立：
   - 外觀可以用**文字描述**（膚色、髮型髮色、眼鏡、上衣／外套／褲子／鞋子顏色、長褲短褲、體型高矮…）、
     **照片**（自動取色＋點照片修正）或兩者一起；細節在「細部調整」或「JSON」分頁改。
   - 對方給你照片時，你可以自己看圖，把判斷出來的外觀寫成 `createCharacter()` 參數（見 `js/character.js` 開頭的說明）
     貼進「JSON」分頁，或直接寫進 `data/npcs.json`。
   - 名字用「小明、小華、阿凱」這類名字，不要用像真人的全名。
3. 存檔會寫入 `data/npcs.json`。`kind: "custom"` 而且 `enabled` 不是 false 的 NPC，**不用改程式**就會出現在遊戲裡
   （`js/customnpcs.js`：站在 `place` 那個地點，按 E 聊天，輪流說 `talks`）。
4. 需要特別行為（作息、店鋪、加好友、手機聊天、限時動態…）的 NPC 要另外寫程式，做法參考 `js/hank.js`、`js/garry.js`、
   `js/friends.js`；做完把他在 `data/npcs.json` 改成 `kind: "builtin"`，並在 `tools/npc-dashboard/app.js` 的 `BUILTIN`
   加上畫出他的函式，儀表板才會顯示得跟遊戲一模一樣。

儀表板只存在於開發環境：`tools/` 不會被 Dockerfile 部署；存檔 API（`/__dev/...`）只有 `tools/devserver.py` 有，而且只接受本機請求。
照片只留在本機 `tools/npc-dashboard/photos/`（已加進 .gitignore），不要提交。
