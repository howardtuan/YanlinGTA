# YanlinGTA 開發規範與協作原則 (AGENT.md)

本文件為「中原順起來 · 資管要贏 票投彥霖 (YanlinGTA)」專案的**唯一共同指導原則（Single Source of Truth）**，適用於所有人類開發者與 AI Agent。詳細技術手冊與遊戲設計見 [docs/README.md](docs/README.md)。

> [!NOTE]
> **🚧 過渡期公告：底層記憶體、全局動態載入與渲染效能重構進行中**
> 目前專案正同步進行長週期的「手機端記憶體止血、全局動態載入與內顯效能最佳化」重構計畫（所有進度與規格獨立收錄於根目錄 [perf-refactor/README.md](perf-refactor/README.md)）。
> - **一般內容與功能開發者／AI Agent 請忽略該目錄**：新增 NPC、支線劇情、單棟建築或小遊戲請完全維持既有寫法照常交付，重構組會確保底層 API 向後相容。
> - **僅在下列情況才需閱讀 [perf-refactor/README.md](perf-refactor/README.md)**：(1) 你正在接手執行該效能重構階段任務；或 (2) 你的修改涉及 `src/core/`、`src/graphics/`、`src/physics/PhysWorld.js`、`src/world/Kit.js`、`src/world/MapBuilder.js`、`src/world/zones/Zones.js` 等底層管線。

---

## 一、 核心開發原則與最佳實踐

本規範只守住關鍵底線，不限制實作創意與解題思路；在此框架下請自由採用最適合當下需求的工程最佳實踐：

1. **先讀文件再動工（Context First）**
   - 著手設計或修改前，優先查閱 `docs/guide/`（尤其是 [architecture.md](docs/guide/architecture.md) 與 [game-design.md](docs/guide/game-design.md)），完整理解專案架構、程式由來與團隊特有的遊戲設計與彩蛋，避免憑空猜測。
2. **尊重既有設計，有疑慮先討論（Respect Existing Design）**
   - 既有遊戲玩法、劇情對白、彩蛋、角色與系統機制皆為團隊共識成果，**嚴禁未經討論擅自移除或覆寫**。
   - 若認為先前設計有疑慮、不合理或值得重構，**必須先提出想法並與使用者討論確認**，取得同意後方可修改。
3. **功能與文件同步（Doc-as-Code）**
   - 每次新增功能、系統、彩蛋或調整重要架構，**必須同步更新 `docs/guide/` 對應文件**，讓未來的開發者與 Agent 能快速理解設計脈絡。
4. **架構與工程底線**
   - **單向無環分層**：維持 `src/` 七大領域分層（`core` / `physics` / `graphics` / `world` / `entities` / `systems` / `ui`），不新增循環匯入或跨層反向依賴（由 `tests/unit/import-graph.test.js` 自動把關）。
   - **最小必要改動**：聚焦任務本身，不順手重構或異動與任務無關的檔案；程式碼格式統一由 Prettier 與 ESLint 把關（Push 前跑 `npm run ci`）。
   - **誠實回報**：不猜測測試或指令結果；若有環境限制導致無法驗證，請如實說明。
   - **個人暫時檔不上 Git**：個人任務清單、草稿、工作記憶檔等暫時性檔案不納入版本控制，由各開發者依習慣於本機自行管理。

---

## 二、 檔案與資產邊界 (`docs/` vs `assets/`)

| 目錄 | 定位 | 說明 |
| :--- | :--- | :--- |
| `assets/`、`data/` | **遊戲執行期資產** | 遊戲實際運行會載入的貼圖、音效、音樂、資料檔（會打包進 `dist/`）。 |
| `docs/guide/` | **程式與遊戲設計文檔** | 架構、開發指南、遊戲設計與內部梗、系統手冊等；新增功能時同步維護。 |
| `docs/references/` | **建模原材與圖資備份** | 建模參考素材、圖資來源、平面圖等**僅供保存與備份**，不進入遊戲執行期。 |
| `docs/media/` | **README 與宣傳媒體** | README 或對外宣傳用影片、截圖與視覺資產，不進入遊戲執行期。 |

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

- **Headless Chrome Smoke Test（CI 雲端固定配置優先，本機選配）**：
  - `npm run ci` 維持純 Node 快速檢查、不綁定個人硬體；PR CI 的 `Verify` job 固定使用 `ubuntu-24.04` + SwiftShader + `960x540` + `low`（`timeout-minutes: 5`）自動執行 `npm run test:smoke`（[tools/e2e/smoke.mjs](tools/e2e/smoke.mjs)，掛載於 `/YanlinGTA/`），驗證「過初始讀取條進主畫面 (`title`) → 點擊開始過進場讀取條進入遊玩 (`play`)」且 0 執行期錯誤，並將**運行硬體與確定性效能摘要**寫入 GitHub Actions Job Summary（不設效能上限門檻）與上傳截圖／JSON artifact。
  - **效能基線以 CI 雲端固定配置為優先依據**：凡 PR 涉及 `src/core/`、`src/graphics/`、`src/world/`、`src/physics/`、`data/`、`assets/`、`vite.config.js` 或任何影響載入／記憶體／渲染之改動，**必須依 [.github/pull_request_template.md](.github/pull_request_template.md) 填寫固定結構化的「效能與運行環境紀錄」表格**（優先取用 CI `Verify` Job Summary，本機 `npm run test:smoke` / `npm run profile:*` 僅作為輔助或真實 GPU FPS 補充）；無論數據來源為何，**禁止只貼效能數字而不附完整運行硬體表**（執行來源、OS、CPU 型號×核心數、RAM、瀏覽器版本、WebGL Renderer、視窗與畫質）。

若改動涉及特定子系統的進階驗證（如 WASM 精度測試、E2E 劇本測試、室內平面圖產圖等），請依改動性質視需要補跑，完整指令清冊見 [docs/guide/developer-guide.md](docs/guide/developer-guide.md)。

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
| **`docs/` 文件與目錄** | 小寫 `kebab-case` | `game-design.md`、`developer-guide.md` |
| **`tests/` 測試檔名** | `<topic>.test.js` | `import-graph.test.js`、`data-consistency.test.js` |
| **程式碼識別字** | 英文（camelCase 變數/函式、PascalCase 類別、UPPER_SNAKE 常數） | `applySave()`、`MissionSystem`、`SERVICE_TAG` |
| **文案與註解語言** | 文件、UI 文案與遊戲設計／劇情註解用**繁體中文**；底層通用演算法可使用**英文** | — |

---

## 五、 文件導覽

- 📑 文件總索引：[docs/README.md](docs/README.md)
- 🏛️ 系統架構手冊：[docs/guide/architecture.md](docs/guide/architecture.md)
- 🎮 遊戲設計與內部梗：[docs/guide/game-design.md](docs/guide/game-design.md)
- 💻 開發者與貢獻指南：[docs/guide/developer-guide.md](docs/guide/developer-guide.md)
- 🧑‍🤝‍🧑 NPC 創作指南：[docs/guide/npc-creation-guide.md](docs/guide/npc-creation-guide.md)
- 🚢 部署與 CI/CD 手冊：[docs/guide/deployment.md](docs/guide/deployment.md)
