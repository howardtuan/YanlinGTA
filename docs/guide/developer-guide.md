# YanlinGTA 開發者與貢獻指南 (Developer Guide)

本文件提供「中原順起來 · 資管要贏 票投彥霖 (YanlinGTA)」專案的本機環境建置、日常指令、測試執行、程式碼檢查工具與 GitHub Flow 操作手冊。

> **規範單一真實來源（SSOT）**：所有開發原則、分支命名白名單、PR 自動合併規則與專案命名規範，統一以 [AGENT.md](../../AGENT.md) 為準。

---

## 一、 前置環境與相依性 (Prerequisites)

| 工具 | 建議版本 | 說明 |
| :--- | :--- | :--- |
| **Node.js** | `>= 22.0.0` | 執行 Vite、Vitest、ESLint 與 E2E Story Bot（需 Node 22 內建 `WebSocket`）。 |
| **npm** | `>= 10.0.0` | 套件管理工具（隨 Node.js 一併安裝）。 |
| **Git** | `>= 2.30.0` | 版本控制工具（建議搭配 Worktree 多線開發）。 |
| **現代瀏覽器** | Chrome / Edge / Firefox / Safari (最新版) | 需支援 WebGL 2.0、WebAssembly 與 ES2024。 |
| *(選用)* **Docker** | Docker Desktop / Docker Engine | 用於本機容器化多階段打包驗證。 |

---

## 二、 快速上手：本機安裝與啟動 (Quickstart)

```bash
# 1. 複製專案庫
git clone https://github.com/howardtuan/YanlinGTA.git
cd YanlinGTA

# 2. 安裝所有依賴套件
npm ci

# 3. 啟動 Vite 本機熱更新開發伺服器
npm run dev
```

伺服器啟動後，請以瀏覽器開啟：  
👉 **http://localhost:5173**

---

## 三、 npm 指令清冊 (Scripts Cheat Sheet)

| 指令 | 說明 | 適用情境 |
| :--- | :--- | :--- |
| `npm run dev` | 啟動 Vite 開發伺服器（支援 HMR 熱模組替換）。 | 日常功能開發、視覺微調與 NPC 儀表板。 |
| `npm run build` | 執行 Vite 正式環境打包，產出最佳化代碼至 `dist/`。 | 發布前編譯、CI 建置。 |
| `npm run check:dist` | 檢查 `dist/index.html` 引用路徑與靜態資源完整性。 | 打包後驗證相對路徑（子路徑部署防呆）。 |
| `npm run preview` | 本機啟動 HTTP 伺服器預覽 `dist/` 正式建置產物。 | 驗證打包後行為、確認 Hash 資源。 |
| `npm test` | 執行 Vitest 單元測試與整合測試（單次運行）。 | 提交前快速驗證核心邏輯與靜態守門員。 |
| `npm run test:watch` | 啟動 Vitest 監聽模式（存檔時自動重新跑相關測試）。 | 測試驅動開發 (TDD)。 |
| `npm run test:wasm` | 執行完整 Rust WASM vs 純 JS 雙軌運算逐位元精度與效能比對。 | 貼圖計算、WASM 核心變更後驗收。 |
| `npm run test:e2e` | 執行無頭 E2E Story Bot 故事通關驗證（需本機 Chrome）。 | 改動主線任務、導航、物理或碰撞後驗收。 |
| `npm run lint` | 執行 ESLint 靜態檢查（涵蓋 `src/`、`tests/`、`tools/`，0 error / 0 warning 門禁）。 | 檢查變數宣告、語法錯誤與潛在 Bug。 |
| `npm run lint:fix` | 自動修復 ESLint 可修正之規則問題。 | 批次修正靜態規則提示。 |
| `npm run format` | 使用 Prettier 自動排版受納管檔案。 | 存檔或提交前美化測試與設定檔。 |
| `npm run format:check` | 檢查受納管檔案（`.prettierignore` 以外）是否符合 Prettier 標準。 | CI 靜態品質門禁。 |
| `npm run ci` | 一鍵串聯：`format:check && lint && test && build && check:dist`。 | **Push / 送 PR 前必跑**，模擬 CI 完整門禁。 |
| `node tools/floorplan/make.mjs` | 依建模程式重新產生 [docs/references/floorplans/](../references/floorplans/README.md) 室內 SVG 平面圖。 | 調整可進入室內建築與牆線後同步驗圖。 |
| `node tools/street_corner_check.mjs [--out 報告.md] [--json 結果.json]` | 重建遊戲實際會畫的建物（OSM、填充樓、各街屋檔佔地，扣掉 drop／hide），跟車道、人行道比對：列出侵入車道的建物（哪個檔、侵入幾公尺）、每個路口轉角有沒有建物、兩個檔重複蓋的地方、路口附近的街面空缺。 | 照街景補街屋、改路寬之後檢查路口有沒有越界、漏蓋或重複蓋。 |
| `npm run build && node tools/collision_mesh_check.mjs [--out 報告.md] [--json 結果.json] [--cdp=<port> --url=<網址>]` | 在遊戲頁面裡（`?keepgeo` 保留靜態幾何的 CPU 副本）把全圖網格跟碰撞對一次：「看得到卻穿得過」（離地 0.4～1.5 m 的牆面，玩家中心站得到、身體會陷進去）與「看不到卻被擋住」（碰撞線 0.75 m 內沒有網格），只報從出生點走得到的地方，對到哪個建物、哪個檔。多層室內（學生活動中心、宿舍）每一層各自比對；埤塘、溪邊、排水溝兩岸的空氣牆是刻意的，不列。`--low` 改抓腰部以下沒有碰撞的量體（箱子、貨架）。`--cdp` 接到別台開好的無頭 Chrome（例如家裡的 GPU 機器），`--url` 給那台連得到的網址。 | 補街屋、改立面或碰撞之後，檢查有沒有走得進去的牆、擋人的空氣牆（#302）。 |

---

## 四、 測試金字塔手冊 (Testing Guide)

專案建立了包含「演算法與靜態防護單元測試」、「WASM 雙軌整合測試」與「端對端測試」的多層級防護網：

```mermaid
flowchart TD
    E2E["端對端測試 (E2E Story Bot)<br/>• 瀏覽器真實運行、劇本走查、無頭點擊 (tools/e2e/)"]
    WASM["WASM 雙軌精度驗收 (Integration)<br/>• Rust WASM vs JS fallback 逐像素 0 誤差比對 (tests/integration/wasm.test.js & tools/check_wasm.mjs)"]
    Unit["單元與靜態安全網 (Unit Tests)<br/>• Vitest 驅動：業務邏輯 + 架構分層 + DOM 接線 + 資料一致性 (tests/unit/)"]

    Unit --> WASM
    WASM --> E2E
```

### 1. 單元與靜態安全網 (`tests/unit/`)
- **`collision.test.js`**：測試 2D 多邊形射線檢測、點是否在多邊形內、AABB 碰撞盒判定。
- **`nav.test.js`**：測試 A* 尋路演算法、啟發函數、校園單行道權重計算。
- **`save.test.js`**：測試進度儲存與讀取、垂直高度 `y` 同步、版本遷移與壞資料自癒。
- **`stocks.test.js`**：測試「靈感股」買賣機制、持股均價計算、資產淨值統計。
- **`missions.test.js`**：測試競選任務狀態機與角色預設設定。
- **`service.test.js`**：測試義務役服役日曆與平日軍服／休假切換邏輯。
- **`dom-ids.test.js`**：靜態掃描 `src/` 內 `getElementById` / `$()` 與 `index.html` 及動態建立節點之 ID 對應。
- **`import-graph.test.js`**：靜態解析 `src/` 匯入圖，阻擋循環引用與違反 `AGENT.md` 分層規則的跨層依賴。
- **`benchmark.test.js`**：測試遊戲內效能測試的統計（平均 FPS、1% / 0.1% 低幀、卡頓次數）與瓶頸判斷。
- **`data-consistency.test.js`**：驗證 `data/npcs.json`、`data/cycu.json`、`data/terrain.json` 結構完整與資源路徑有效。
- **`street-encroach.test.js`**：用 `tools/street_corner_check.mjs` 檢查建物不得侵入車道（允許 1 m 誤差，地圖邊緣 30 m 內不算）；OSM 建物與填充樓的修正放在 `src/world/buildings/RoadClearance.js`，自建街屋改各自的檔案。
- **`collision-mesh.test.js`**：`tools/collision_mesh_check.mjs` 抓到、修好的「看得到卻穿得過」位置，在 node 裡建出那幾個街區，檢查玩家站在那一點會碰到牆（#302）。

### 遊戲內效能測試（`src/systems/Benchmark.js`）
- 給玩家用的硬體測試：標題畫面 →「📊 效能測試」，選畫質後鏡頭照固定路線跑約 100 秒（校園街道白天 → 空拍 → 夜間街道，每段前 3 秒暖機不計），跑完顯示平均 FPS、1% / 0.1% 低幀、最低／最高、畫面時間分佈、卡頓次數、主執行緒每幀耗時、繪圖呼叫與三角形，並依「每幀間隔 vs. 遊戲 JS 耗時」判斷瓶頸是 CPU、GPU 還是螢幕更新率；可複製文字或下載 JSON，上一次結果存在 `localStorage`（`cycu-bench-last`）。
- 網址加 `?bench`（或 `?bench=low` 指定畫質）會在載入完自動開跑；跑完 `game.bench.result` 有完整結果，並發出 `window` 的 `benchdone` 事件，方便自動化在不同機器上收數據。
- 跟 `npm run profile:*`（`tools/profile_scene.mjs`，開發用的固定機位量測與基準比對）是兩回事：這個測的是玩家實際看到的整體流暢度。

### 2. WASM 精度整合測試 (`tests/integration/wasm.test.js` & `tools/check_wasm.mjs`)
- `npm test` 會執行快速抽樣整合測試；改動貼圖核心時須另外執行 `npm run test:wasm`，對全部 FBM 噪聲與法線貼圖參數執行完整比對，驗收門檻為 **`0 mismatched`**。

---

## 五、 程式碼風格與工具邊界

1. **ESLint（`eslint.config.js`）**：涵蓋 `src/`、`tests/` 與 `tools/` 腳本。
   - 嚴禁 `var`、強制全等比較 `===` / `!==`（`== null` 除外）、嚴禁未宣告與未使用變數（未使用參數須加底線前綴如 `_e`）。
   - 特別設定允許中文字串與註解內的全形空白（`\u3000`）。
2. **Prettier（`.prettierrc` / `.prettierignore`）**：
   - 納管 `src/`、`tests/`、`tools/`（JS/MJS/CSS/HTML）與專案設定檔，維持統一排版；僅排除建置產物、第三方套件、大型 JSON 圖資與 Markdown 文件。
   - 首次統一重排之純格式 Commit 已登錄於 `.git-blame-ignore-revs`（GitHub 原生支援忽略該 Commit 的 `git blame`）。
3. **檔案命名與註解語言**：
   - 核心類別與業務模組採 `PascalCase.js`（如 `GameLoop.js`）；`tools/` 腳本採 `snake_case`（如 `check_wasm.mjs`）。
   - 通用底層與演算法註解以英文為主；校園地景、典故與任務劇情可使用繁體中文註解（詳見 [AGENT.md](../../AGENT.md)）。

---

## 六、 GitHub Flow 日常操作步驟

上游主倉庫已啟用 `protect-main-github-flow` 與 `enforce-branch-naming` 兩條 Rulesets，禁止直推 `main` 並強制分支前綴規範：

### 1. 開工切分支（禁止直接在 `main` 提交）
```bash
# 先確保 main 與遠端同步（僅用 fast-forward）
git fetch origin
git switch main
git merge --ff-only origin/main

# 切出符合白名單的短生命週期分支（允許前綴：feat / fix / hotfix / chore / refactor / docs）
git switch -c feat/world-zone-f-detail
```
*(若採多線並行 Worktree：`git worktree add ../YanlinGTA-wt/feat-zone-f -b feat/world-zone-f-detail main`)*

### 2. 撰寫 Commit（雙語 Conventional Commits）
```
<type>(<scope>): <簡述>

# 範例：
feat(world): 補齊恩慈樓北翼東端實景量體
fix(save): handle corrupted localStorage gracefully
refactor(core): decouple vehicle spawner from Game.js
docs(guide): align developer workflow with GitHub Flow
chore(ci): add data consistency test suite
```

### 3. 本地驗證、開 PR 與自動合併
1. Push 前務必在本機執行：
   ```bash
   npm run ci
   ```
2. 推送分支並在 GitHub 建立 Pull Request（依 PR Template 勾選對應領域驗證項目）。
3. **啟用 Auto-merge**：上游目前設定為 `Required approvals = 0` 且開啟 **Allow auto-merge**；發完 PR 後請於網頁點擊 **Enable auto-merge**，或執行：
   ```bash
   gh pr merge --auto --merge
   ```
4. 待 **CI Checks 全綠**（`Verify`、`Docker Build Verification`，且所有討論串已標記為 **Resolved**）後，GitHub 會自動以 **Create a merge commit** 合併進 `main`，再刪除已合併分支與清理 Worktree。
