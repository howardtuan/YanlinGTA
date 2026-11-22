狀態：階段 1～3 已完成；階段 4 第 1 項（three 拆檔）已完成，第 2 項量測後決定不做，理由見該節（2026-11-23）。

## 為什麼要做

PR #79 把程式搬到 `src/` 並改用 Vite 之後，陸續冒出四個「檢查全綠但其實壞掉」的問題：

| 壞掉的東西 | 原因 | 現有檢查為什麼沒抓到 |
| --- | --- | --- |
| 暫停選單的 ✕ 關不掉 | DOM id 寫錯（`mClose` 對 `modalClose`） | 沒有任何測試會碰介面 |
| GitHub Pages 進不去 | Pages 設定沒跟著改 | CI 只驗建置，不驗線上 |
| 通關機器人、`launch.json` | 還在直接送原始碼 | `tools/` 不在 lint 範圍，e2e 只能手動觸發 |
| NPC 後台 | 14 個匯入還指向舊的 `js/` | 同上（還沒修，見階段 2） |

目標是讓這一類錯在 CI 就擋下來，再處理結構和載入速度。

## 量測結果

- **格式檢查**：`.prettierignore` 排除了 `src/`、`tools/`、`index.html`、`*.md`。把 `src/` 納入的話 98 個檔案全部不合格（等於整個重排）。
- **Lint**：`src/` 零錯誤。`tools/` 被排除；納入的話 74 個錯誤，其中 66 個是 `no-undef`（多半是瀏覽器／Node 全域變數沒設定）。
- **測試**：6 個檔、32 個測試、536 行，對 98 個檔、約 4 萬行程式。都是純邏輯（存檔、碰撞、股市、導航、任務、WASM），沒有介面或載入流程。
- **循環匯入**：三組。
  - `Interiors` → `Zones` → `GateExtras` → `Interiors`（`GateExtras` 要 `Kit`、`regMat`、`MAIN_GATE`）
  - `StockMarket` ↔ `News`（`StockMarket` 要 `newsEffects`；`News` 要 `STOCKS` 等常數）
  - `Garry` ↔ `ClubMembers`（互相要 `playPose`、`garryPlan`）
- **分層規則**（AGENT.md 第三節）：`systems/` 匯入 `ui/` 有 5 處（`Prompts` 3 處、`News`、`Friends`）；`world/` 匯入 `entities/` 有 2 處。`core/Game.js` 匯入 `systems/`、`ui/` 共 20 多處，這是進入點，視為例外。
- **打包**：主程式單檔 2.27 MB（gzip 824 KB）。其中 three 約 670 KB；原始碼以 `world/` 最大（1.45 MB），其次 `systems/`、`entities/` 各約 435 KB。只有 Rapier 是動態載入。

## 階段 1：補安全網

風險最低，全部是新增檢查，不改遊戲程式。

1. **介面接線測試**（新增 `tests/unit/dom-ids.test.js`）
   - 掃 `src/` 裡所有 `getElementById('…')`、`$('…')` 的字串，每個都要在 `index.html` 有對應的 `id`，或在 `src/` 裡動態建立。
   - 驗收：目前 92 個全部對得上；故意把 `modalClose` 改回 `mClose` 測試會失敗。
2. **匯入結構測試**（新增 `tests/unit/import-graph.test.js`）
   - 解析 `src/` 的靜態匯入，檢查循環數量不超過基準（現在 3 組），分層違規不超過基準清單。
   - 驗收：新增第 4 組循環或新的違規時測試失敗；階段 3 每拆掉一組就把基準往下調。
3. **Lint 納入 `tools/`**
   - `eslint.config.js` 為 `tools/` 加一組設定（Node 全域變數；`bot-page.js`、`npc-dashboard/` 用瀏覽器全域變數），把 74 個錯誤清到 0。
   - 驗收：`npm run lint` 涵蓋 `tools/` 且零錯誤；通關機器人在 oldpc 再跑一次仍然 PASS。
4. **建置後冒煙檢查**（加進 `ci.yml` 的 build job）
   - 建置完確認 `dist/index.html` 引用的每個檔案都存在，且沒有殘留 `/src/` 開頭的路徑。
   - 驗收：把 `index.html` 的進入點路徑改錯，CI 會紅。

## 階段 2：修好還壞著的工具

1. **NPC 後台**（`tools/npc-dashboard/app.js`）：14 個匯入改指向 `src/` 的新位置，拿掉 `index.html` 裡指向 `vendor/` 的 importmap（交給 Vite 解析）。
   - 驗收：`npm run dev` 後開 `/tools/npc-dashboard/`，角色預覽畫得出來、存檔寫得進 `data/npcs.json`、console 沒有錯誤。
2. **過期的註解與文件**：`tools/*.py`、`tools/*.json` 裡的 `js/map.js` 等舊路徑改成新路徑；`docs/deployment.md` 說 e2e「支援排程觸發」，實際只有手動，改成一致。
   - 驗收：`grep -rn "js/[a-z_]*\.js" tools docs` 沒有指向不存在的檔案。

## 階段 3：結構

會動到模組的載入順序，每一項做完都要跑通關機器人，並用碰撞快照確認地圖沒變。

1. **拆 `Interiors` ↔ `Zones` ↔ `GateExtras`**：把 `Kit`、`regMat`、`MAIN_GATE` 這些被共用的東西移到不依賴 `Zones` 的檔案（`Kit` 已經有 `world/Kit.js`，要確認 `Interiors` 匯出的是不是同一個）。
2. **拆 `StockMarket` ↔ `News`**：新聞對股價的影響（`newsEffects`）屬於業務邏輯，移到 `systems/`；`ui/phone/News.js` 只留畫面。順便消掉一處 `systems/` → `ui/` 的違規。
3. **拆 `Garry` ↔ `ClubMembers`**：`playPose` 移到共用檔，或 `garryPlan` 改成由呼叫端傳入。
4. **`systems/` → `ui/Prompts` 三處**：小遊戲直接呼叫提示介面。改成由 `core/` 注入，或把 `Prompts` 認定為共用層並寫進 AGENT.md。這一項要先決定規則再動手。
   - 驗收（1～4 共通）：匯入結構測試的基準降到 0 組循環；通關機器人 PASS；碰撞快照的樹、灌木、碰撞圓、車輛位置與改動前相同。

## 階段 4：載入速度

1. **three 與 Rapier 拆成獨立檔**（`build.rollupOptions.output.manualChunks`）：遊戲程式更新時，玩家不用重新下載沒變的 three。零行為風險。
   - 驗收：建置產出多一個 vendor 檔；遊戲程式只改一行時 vendor 檔的檔名雜湊不變。
2. **進標題畫面後才需要的東西延後載入**：小遊戲（13 個檔）、手機 App、電腦介面改成動態 `import()`。要改 `Game.js` 的靜態匯入，風險中等。
   - 驗收：標題畫面出現前下載的 JS 量明顯下降（先量基準再定目標）；通關機器人 PASS；每個小遊戲手動進去一次沒有錯誤。
3. 第 2 項做之前先量：用 oldpc 的 Chrome 記錄「開始載入到標題畫面」的時間與下載量，當作基準。

### 階段 4 的量測結果與決定（2026-11-23）

各層打包後的大小（minify／gzip）：three 689／177 KB、world 三塊合計 810／313 KB、entities 222／84 KB、小遊戲 214／103 KB、手機 App 110／57 KB、core 71／29 KB、其餘合計 164／71 KB。另外首次載入還要 `data/cycu.json`（gzip 257 KB）和 Rapier 的 wasm（2.9 MB）。

- **第 1 項已做**：three 拆成獨立檔，主程式從 2,271 KB 降到 1,595 KB。改一行遊戲程式重建，three 的檔名雜湊不變。oldpc 通關機器人在 `bf4264f` PASS（打到結局、退回 0 次、沒有頁面錯誤），這一趟也涵蓋階段 3 第 4 項的 `5dc7fdb`。
- **第 2 項不做**：小遊戲加手機 App 全部延後也只省 gzip 約 160 KB，不到首次下載量的一成；載入時間的大宗是建世界（oldpc 軟體繪圖實測 13～22 秒），不是下載。而且 13 個小遊戲都在 `Game.js` 初始化時同步建立、會往場景裡擺東西（茶店的角色、演唱會舞台等），`Zones.js` 也直接匯入 `Weiche`，改成延後載入會動到場景建立順序與存檔還原，違反「零功能破壞」的風險遠大於好處。
- 真的要縮短載入時間，該看的是建世界那十幾秒，那是另一個題目。

## 需要先決定的事

1. **`src/` 要不要整個照 Prettier 重排？**
   - 重排：格式檢查名副其實，但 98 個檔全部改動，`git blame` 會斷，所有進行中的分支和 fork 都會衝突，要挑一個沒人在改的時間點一次做完，而且應該先問過 howardtuan。
   - 不重排：把 `src/` 留在 `.prettierignore`，在文件裡老實寫「格式檢查不含 `src/`」，靠 ESLint 把關。
   - 建議：先不重排，等階段 1～3 做完、和 howardtuan 講好再說。
2. ~~`Prompts` 算不算共用層？~~ 已決定：不放寬規則，把被跨層使用的東西搬到它該在的層（`dual` 到 `core/KeyHints.js`、戈登肉鋪建物到 `world/buildings/`、兩位好友的外觀到 `entities/npcs/FriendLooks.js`）。剩下 `world/Interiors.js` 匯入 `entities/Character.js` 一處，列為已知例外。
3. **e2e 要不要排程每天跑？** GitHub 的機器只有軟體繪圖，一趟約 20 分鐘；oldpc 上跑只要 5 分鐘，但要自己掛排程。

## 建議順序

階段 1 → 階段 2 → 階段 3 → 階段 4。階段 1、2 各自是一兩個小 PR，不影響玩法；階段 3、4 每項一個 PR，都要跑通關機器人。
