# YanlinGTA 開發規範與協作原則 (AGENT.md)

本文件為「中原順起來 · 資管要贏 票投彥霖 (YanlinGTA)」專案的**唯一共同指導原則（Single Source of Truth）**，適用於所有人類開發者與 AI Agent。詳細系統規格（`docs/specs/`）與開發維運手冊（`docs/dev/`）見 [docs/README.md](docs/README.md)。

> [!NOTE]
> **🚧 過渡期公告：底層記憶體、全局動態載入與渲染效能重構進行中**
> 目前專案正同步進行長週期的「手機端記憶體止血、全局動態載入與內顯效能最佳化」重構計畫（所有進度與規格獨立收錄於根目錄 [perf-refactor/README.md](perf-refactor/README.md)）。
> - **一般內容與功能開發者／AI Agent 請忽略該目錄**：新增 NPC、支線劇情、單棟建築或小遊戲請完全維持既有寫法照常交付，重構組會確保底層 API 向後相容。
> - **僅在下列情況才需閱讀 [perf-refactor/README.md](perf-refactor/README.md)**：(1) 你正在接手執行該效能重構階段任務；或 (2) 你的修改涉及 `src/core/`、`src/graphics/`、`src/physics/PhysWorld.js`、`src/world/Kit.js`、`src/world/MapBuilder.js`、`src/world/zones/Zones.js` 等底層管線。

---

## 一、 核心開發原則與最佳實踐

本規範只守住關鍵底線，不限制實作創意與解題思路；在此框架下請自由採用最適合當下需求的工程最佳實踐：

1. **動工前按領域查閱規格（Context First）**
   - 修改前依 [docs/README.md](docs/README.md) 路由表閱讀對應的 `docs/specs/*.md`。涉及角色、對話、終端機或場景互動時，務必先讀 [easter-eggs-and-secrets.md](docs/specs/easter-eggs-and-secrets.md) 確認刻意設計與版權諧音紅線，嚴禁誤當 Bug 移除。
2. **尊重既有設計，有疑慮先討論（Respect Existing Design）**
   - 既有玩法、劇情對白、彩蛋、角色與系統機制皆為團隊共識，**嚴禁未經討論擅自移除或覆寫**；有疑慮須先與使用者討論，取得同意後方可修改。
3. **遊戲內容異動強制同步 `docs/specs/`（SSOT 鐵律）**
   - 凡新增、調整或修復任何遊戲機制、任務、NPC、建築互動、UI 功能或彩蛋密技，**必須在同一個 PR 內同步更新 `docs/specs/` 對應規格文件**，確保規格與程式碼對齊。
   - **`wiki/` 由使用者主導維護，Agent 不主動改寫文案**：`wiki/` 是面向玩家的趣味百科，非系統規格來源；除非使用者明確指示，Agent 開發遊戲功能時不更動 `wiki/` 內容。唯一技術配合：新增 NPC 時因 `tests/unit/wiki.test.js` 要求 `data/npcs.json` 每個 id 皆登錄於 `wiki/people.json`，Agent 僅補 `"<id>": { "wiki": false }`。
   - **機密防暴雷**：`easter-eggs-and-secrets.md` 所列隱藏密技、勞大機制與惡搞彩蛋**嚴禁寫入 `wiki/` 或 `llms.txt`**（單元測試把關）。
4. **架構與工程底線**
   - **單向無環分層**：維持 `src/` 七大領域分層（`core` / `physics` / `graphics` / `world` / `entities` / `systems` / `ui`），不新增循環匯入或跨層反向依賴（由 `tests/unit/import-graph.test.js` 自動把關）。
   - **最小必要改動**：聚焦任務本身，不順手重構或異動與任務無關的檔案；程式碼格式統一由 Prettier 與 ESLint 把關（Push 前跑 `npm run ci`）。
   - **誠實回報**：不猜測測試或指令結果；若有環境限制導致無法驗證，請如實說明。
   - **個人暫時檔不上 Git**：個人任務清單、草稿、工作記憶檔等暫時性檔案不納入版本控制，由各開發者依習慣於本機自行管理。

---

## 二、 檔案與資產邊界

| 目錄 | 定位 | 說明 |
| :--- | :--- | :--- |
| `assets/`、`data/` | **遊戲執行期資產** | 遊戲實際運行會載入的貼圖、音效、音樂、資料檔（會打包進 `dist/`）。 |
| `docs/specs/`、`docs/dev/` | **單一事實來源與開發維運手冊** | `specs/` 為 6 份領域系統規格（隨遊戲變更強制同步）；`dev/` 為開發測試與部署手冊。絕不進入 `dist/`。 |
| `wiki/`（含 `wiki/media/`） | **玩家趣味百科** | 使用者維護的靜態網站與線上宣傳片，建置輸出至 `dist/wiki/`。 |
| `docs/references/` | **建模原材與圖資備份** | 建模參考素材、平面圖，僅供保存，不進入執行期。 |
| `docs/promo-archive/` | **宣傳母帶與社群素材歸檔** | 不進 `dist/`，Agent 日常勿讀。 |

---

## 三、 GitHub Flow 與上游 Remote 規則

本專案採用 **GitHub Flow**，上游主倉庫（`upstream`: `howardtuan/YanlinGTA`）設有硬性 Rulesets 把關：

### 1. 上游保護與分支白名單
- **禁止直接 commit 或 push 到 `main`**：本機 `main` 僅用於單向 fast-forward 同步上游最新進度（`git fetch && git merge --ff-only`）。
- **分支命名白名單**：除受保護主幹 `main` 外，所有工作分支**必須**符合以下前綴（不符合者 `git push` 會直接被 GitHub 拒絕）：
  - `feat/*`：新功能或新遊戲內容
  - `fix/*`：Bug 修復
  - `hotfix/*`：線上緊急修復
  - `refactor/*`：無功能破壞的重構或效能最佳化
  - `docs/*`：文件與規範更新
  - `chore/*`：CI/CD、設定檔、工具腳本、相依套件與測試補強
- **短生命週期**：所有分支從最新 `main` 切出，合併後即刪除。

### 2. Push 前本機自驗 CI 與 Headless Smoke / 效能紀錄規範
追求流程自動化並避免將失敗的 PR 留給使用者善後，**Push 前必須先在本機跑完 CI 並確認全綠**：

```bash
npm run ci
# 等同依序執行：format:check -> lint -> test -> build -> check:dist
```

- **CI 進場煙霧測試與本機真 GPU 效能紀錄分流（iPhone 優先，支援 Mac M 系列與 Linux）**：
  - **雲端 CI 僅作功能守門**：`npm run ci` 維持純 Node 快速檢查；PR CI 的 `Verify` job（`ubuntu-24.04` + SwiftShader 軟體渲染）自動執行 `npm run test:smoke`（[tools/e2e/smoke.mjs](tools/e2e/smoke.mjs)，掛載於 `/YanlinGTA/`），僅驗證「過初始讀取條進主畫面 (`title`) → 點擊開始過進場讀取條進入遊玩 (`play`)」且 0 執行期錯誤（雲端無硬體 GPU，SwiftShader 軟體幀率不具參考力，不作為效能優化依據）。
  - **效能紀錄由開發者 Agent 自主判定並於本機真 GPU 自動執行**：目前最佳化第一優先為 **iPhone 瀏覽器**，其次為電腦瀏覽器。每次開 PR 時，**由該開發者的 Agent 依變更內容判斷是否需要補跑效能實測**：
    - **應執行效能實測**：凡改動涉及地圖／建築／室內（`src/world/`）、實體／行人／車流／火車（`src/entities/`）、渲染／材質／貼圖／記憶體（`src/graphics/`）、核心迴圈與串流（`src/core/`）、物理碰撞（`src/physics/`），或執行期資產與打包設定（`assets/`、`data/`、`vite.config.js`）。
    - **可略過效能實測**：僅修改文件（`docs/`）、Wiki（`wiki/`）、單元測試（`tests/`）、CI 設定、純劇情對白文字或純 2D DOM 介面等不影響 3D 場景／記憶體之變更（於 PR 模板勾選「與效能無關」即可）。
  - **免手動抄表全自動流程**：判定需測效能時，Agent 於 `npm run ci`（已產出最新 `dist/`）通過後直接執行：
    ```bash
    npm run bench:iphone -- --no-build
    # 若已建立 PR，亦可一鍵將剛跑完的結果與輕量標記自動寫入該 PR 內文：
    npm run perf:attach -- <PR編號>
    ```
    > **沙盒權限提醒**：若 AI Agent 預設在受限沙盒內執行指令，執行 `npm run bench:iphone` 時**必須申請宿主機執行權限（跳脫沙盒）**，才能存取本機 Chrome 與真實硬體 GPU（Mac Apple Metal / Linux Vulkan·EGL 獨顯或內顯），避免退回軟體渲染。腳本會自動以 iPhone 模擬環境（`430x932@3x`、`tier=mobile-lite`）跑完遊戲內 99 秒三段 Benchmark 並連同**完整宿主機硬體資訊**與 `<!-- yanlin-perf:v1 -->` 輕量標記輸出至 `tools/e2e/out/bench/pr-perf-section.md`，嚴禁手填數字而省略硬體環境表。
  - **按需對比原則（平時不自動做對比）**：開 PR 時僅記錄當次真實數據，不做前後對比輸出；**僅當使用者主動要求檢視歷史演進或比對特定 PR／修改前後差異時**，Agent 才執行 `npm run perf:history` 或 `npm run perf:compare`（自動從 GitHub Merged PRs 增量同步至本機輕量單檔 `tools/.cache/perf-history.jsonl`，自動區分跨機通用的 iPhone 記憶體／Draw Calls／三角形與同款 GPU 的 FPS／耗時）。

若改動涉及特定子系統的進階驗證（如 WASM 精度測試、E2E 劇本測試、室內平面圖產圖等），請依改動性質視需要補跑，完整指令清冊見 [docs/dev/developer-guide.md](docs/dev/developer-guide.md)。

### 3. PR 策略與全自動合併 (Auto-merge)
- **僅允許 Merge Commit**：上游鎖定 **Create a merge commit**（禁用 Squash / Rebase）。送出 PR 前請在分支內整理好乾淨、有意義的 Commit，避免把雜亂的 `wip` 歷史帶入 `main`。
- **CI 必過才可合併**：須通過 [ci.yml](.github/workflows/ci.yml) 全部 2 項平行檢查（`Verify` 含 Headless Chrome Smoke Test、`Docker Build Verification`）。
- **PR 內文須遵循模板並立即啟用 Auto-merge**：建立 PR 時須依 [.github/pull_request_template.md](.github/pull_request_template.md) 完整勾選驗證項（含獨立的 Auto-merge 確認項）與效能／硬體紀錄；上游已開放 Auto-merge（`Required approvals = 0`），建立 PR 後**務必立即設定自動合併**，讓 CI 全綠後直接合併，不需使用者手動同意：

```bash
gh pr create --repo howardtuan/YanlinGTA --base main --head <owner>:<branch> --title "<type>(<scope>): <簡述>" --body-file <pr-body.md>
gh pr merge <PR編號或URL> --repo howardtuan/YanlinGTA --auto --merge
```

> 因為主幹鎖定 Merge Commit，CLI 務必加上 `--merge` 參數。

---

## 四、 專案命名規範

| 項目 | 規範 | 範例 |
| :--- | :--- | :--- |
| **Branch** | `<白名單前綴>/<topic>`（全小寫 kebab-case） | `feat/new-minigame`、`fix/save-fallback`、`docs/update-guide` |
| **Commit Message** | `<type>(<scope>): <繁體中文或英文簡述>`（Conventional Commits） | `feat(systems): 新增小遊戲計分機制`、`fix(save): handle corrupt data` |
| **`src/` 模組檔名** | `PascalCase.js`（核心類別與業務模組） | `GameLoop.js`、`MissionSystem.js`、`VehPhysics.js` |
| **`tools/` 腳本檔名** | `snake_case`（開發與檢核腳本） | `check_wasm.mjs`、`build_map.py` |
| **`docs/` 文件與目錄** | 小寫 `kebab-case` | `developer-guide.md`、`missions-and-quests.md` |
| **`tests/` 測試檔名** | `<topic>.test.js` | `import-graph.test.js`、`data-consistency.test.js` |
| **程式碼識別字** | 英文（camelCase 變數/函式、PascalCase 類別、UPPER_SNAKE 常數） | `applySave()`、`MissionSystem`、`SERVICE_TAG` |
| **文案與註解語言** | 文件、UI 文案與遊戲設計／劇情註解用**繁體中文**；底層通用演算法可使用**英文** | — |

---

## 五、 文件導覽

- 📑 文件總索引：[docs/README.md](docs/README.md)
- 🧭 路由總表：[docs/README.md](docs/README.md)
- 🏛️ [architecture.md](docs/specs/architecture.md)・🌍 [world-and-entities.md](docs/specs/world-and-entities.md)・📜 [missions-and-quests.md](docs/specs/missions-and-quests.md)
- 🎮 [gameplay-and-ui.md](docs/specs/gameplay-and-ui.md)・🧑‍🤝‍🧑 [npcs-and-characters.md](docs/specs/npcs-and-characters.md)・🔒 [easter-eggs-and-secrets.md](docs/specs/easter-eggs-and-secrets.md)
- 💻 [developer-guide.md](docs/dev/developer-guide.md)・🚢 [deployment.md](docs/dev/deployment.md)
