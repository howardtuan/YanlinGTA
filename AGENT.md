# YanlinGTA 開發規範與協作憲法 (AGENT.md — Single Source of Truth)

本文件為「中原順起來 · 資管要贏 票投彥霖 (YanlinGTA)」專案開發流程、協作紀律、架構規範與品質門檻的**單一真實來源（SSOT）**。所有人類開發者與 AI Agent（Antigravity、Claude Code 等）均須嚴格遵守。

> 環境建置教學與指令詳解請參閱 [docs/developer-guide.md](docs/developer-guide.md)；系統分層架構詳見 [docs/architecture.md](docs/architecture.md)。

---

## 一、 核心原則 (Core Principles)

1. **專案定位**：
   - 3D 開放世界校園網頁冒險遊戲（Three.js + Rapier 3D WASM + Rust WASM 貼圖核心），由多組團隊與 AI Session 共同維護，並持續部署至 GitHub Pages。
2. **零功能破壞原則 (Zero Regression)**：
   - 嚴格維持既有遊戲性、劇情對白、角色模型、物理數值與彩蛋機制不變。
   - 任何效能最佳化、重構或新內容擴充，均不得破壞 Three.js 渲染穩定性與 Rapier 物理世界。
3. **SSOT 原則**：
   - 流程與規範以本文件為準；`docs/` 文件不得定義與本文件衝突之規則。

---

## 二、 變更分級與先討論原則 (Change Tiers & `task/`)

為避免繁瑣流程卡住日常內容迭代，同時守住核心架構品質，所有開發採**兩級制**：

| 分級 | 適用範圍 | 動工前規範 |
| :--- | :--- | :--- |
| **Tier 1：內容／局部變更** | 單一路段街景、單棟建築外觀補完、`data/npcs.json` 自訂 NPC、純文案或局部明確修補 | 免撰寫新規格書；直接依「第五節 領域 SOP」開分支實作、自檢並發 PR（完成校內待做項須更新 [task/campus-pending.md](task/campus-pending.md)）。 |
| **Tier 2：架構／系統／核心變更** | 跨模組重構、物理/渲染/存檔/任務狀態機調整、新小遊戲或新系統、WASM 核心與工具鏈規範變更 | **先討論後動工**：須先對齊方案，並在 `task/` 依 [task/TEMPLATE.md](task/TEMPLATE.md) 建立規格與驗收標準（AC）經確認後方可實作。 |

- **`task/` 生命週期**：活躍規格集中於 `task/`；結案時須於文件頂部標註 `狀態：已結案（YYYY-MM-DD）`。跨系統踩坑紀錄沉澱至 [task/MEMORY.md](task/MEMORY.md)。

---

## 三、 GitHub Flow 與協作規範 (對齊上游 Repository Rulesets)

本專案全面採用 **GitHub Flow**，並已於上游主倉庫啟用 `protect-main-github-flow` 與 `enforce-branch-naming` 兩條 Rulesets 硬性把關：

### 1. 主幹與雙倉同步規則
- **唯一權威主幹 `main`**：禁止任何人或 Agent 直接在 `main` 上進行開發 commit 或 `git push origin main`。
- **乾淨同步**：本機 `main` 僅用於接收遠端更新（建議 `git fetch && git merge --ff-only`），嚴禁在 `main` 留下未合併的實驗改動。
- **Fork 協作**：若使用個人 Fork 開發，請保持 Fork 的 `main` 與上游 `main` 單向 fast-forward 同步，並一律透過功能分支向上游發起 Pull Request。

### 2. 分支命名白名單 (`enforce-branch-naming`)
所有工作分支必須以短生命週期（Short-lived，建議 1～3 天內合流即刪）建立於最新 `main` 之上，且**必須**符合下列前綴之一（未符合者將於 `git push` 時直接被 GitHub 拒絕）：

- `feat/<scope>-<topic>`：新功能、街景路段、建築室內、NPC 角色
- `fix/<scope>-<topic>`：Bug 修復
- `hotfix/<scope>-<topic>`：線上緊急修復
- `refactor/<scope>-<topic>`：無功能破壞的架構重構或效能最佳化
- `docs/<scope>-<topic>`：文件、規範與 `task/` 規格整理
- `chore/<scope>-<topic>`：CI/CD、設定檔、工具腳本、相依套件與測試補強

> **注意**：禁用不在白名單內的前綴（如 `perf/*`、`test/*`、`claude/*`、`wip/*`）；效能優化請使用 `refactor/*` 或 `feat/*`，補測試請使用 `chore/*` 或併入對應功能分支。

### 3. Worktree 多線並行守則
- 建議於 repo 外部建立平行 Worktree 目錄（例如 `../YanlinGTA-wt/<branch-name>`）。
- **一個 Worktree = 一個分支 = 一個明確責任範圍**（例如單一分區、單一路段或單一系統），避免多線同時改動 `MapBuilder.js`、`Zones.js` 或 `Game.js` 導致衝突。
- PR 合併後立即移除對應 Worktree 與刪除已合併分支。

### 4. PR 合併與 Code Review 紀律 (`protect-main-github-flow`)
- **鎖定 Merge 策略**：主幹僅允許 **Create a merge commit**（禁用 Squash 與 Rebase Merge）。因此**送出 PR 前請在分支內維持乾淨、有意義的 Commit**，避免將大量 `wip`、`fix typo` 帶入 `main` 歷史。
- **CI Status Checks 必過**：必須通過 [ci.yml](.github/workflows/ci.yml) 的全部 4 項檢查（`Code Quality`、`Unit & Integration Tests`、`Production Build`、`Docker Build Verification`）。
- **Review 節奏**：必須取得指定人數的 Approve、將所有 Review 討論串標記為 **Resolved** 才可合併；且**任何新的 Push 都會自動作廢既有 Approve**。請先在本機跑完 `npm run ci` 再請求 Review，收到修改建議後亦集中改完再一次 Push。
- 發起 PR 時須完整填寫 [.github/pull_request_template.md](.github/pull_request_template.md)。

### 5. Commit Message 規範（雙語 Conventional Commits）
所有 Commit 訊息必須遵守 `<type>(<scope>): <簡述>` 格式（禁止無前綴提交）：

- **`<type>`**：`feat` | `fix` | `refactor` | `perf` | `docs` | `test` | `chore` | `style`
- **`<scope>`**：對應分層或領域，如 `core`, `physics`, `graphics`, `world`, `entities`, `systems`, `ui`, `npc`, `e2e`, `ci`, `docs`, `build`, `task`
- **語言**：`<type>(<scope>): ` 前綴須使用英文；`<簡述>` 可使用**繁體中文**（校園地景、劇情、NPC 推薦使用）或英文。
  - 範例：`feat(world): 補齊恩慈樓北翼東端實景量體`、`fix(save): handle corrupted localStorage gracefully`

---

## 四、 架構分層與依賴守則 (`src/`)

所有前端遊戲邏輯統一收納於 `src/` 的 7 大領域分層，嚴禁在專案根目錄散落業務腳本：

```
src/
├── core/       # 引擎調度層：Game, GameLoop, MenuManager, VehicleSpawner, Input, Controls, KeyHints
├── physics/    # 物理運算層：PhysWorld, Physics, VehPhysics, Ragdoll, Collision
├── graphics/   # 渲染與圖形層：ShadowFix, Textures, SkySystem, PostFX, wasm/
├── world/      # 世界與建築生成：MapBuilder, Terrain, Interiors, Kit, zones/, buildings/
├── entities/   # 實體與角色控制：Player, FirstPerson, Character, BodyMesh, Vehicles, Scooters, Drone, NPC, npcs/
├── systems/    # 遊戲業務系統：MissionSystem, SaveSystem, AudioSystem, StockMarket, Navigation, minigames/
├── ui/         # 使用者介面層：HUD, PC, Prompts, Wardrobe, Jersey, PhotoMode, phone/
└── styles/     # 樣式表：style.css
```

### 依賴拓撲硬性規則（由 `tests/unit/import-graph.test.js` 自動把關）
1. **單向無環**：`src/` 內不得出現新的循環匯入（目前基準為 0 組）。
2. **禁止反向依賴**：
   - `core/`、`physics/`、`graphics/` 不得依賴 `systems/` 或 `ui/`（`core/Game.js`、`core/GameLoop.js`、`core/MenuManager.js` 作為頂層裝配例外）。
   - `world/` 不得依賴 `entities/`（僅存 `world/Interiors.js -> entities/Character.js` 一處已知例外，只許移除、不許新增）。
   - `systems/` 不得依賴 `ui/`。
3. **UI 被動渲染**：`ui/` 僅監聽與渲染遊戲狀態，業務決策保留於 `systems/` 或 `core/`。

---

## 五、 四大領域開發 SOP 與驗收對照

改動特定領域時，除基本 `npm run ci` 外，須同步執行對應檢查：

| 領域 | 觸發條件 | 開發規範與必做驗證 |
| :--- | :--- | :--- |
| **1. 世界與街景** | 修改 `src/world/zones/`、`buildings/`、`MapBuilder.js`、`Terrain.js` | • 新分區／街屋註冊於 [src/world/zones/Zones.js](src/world/zones/Zones.js)，**嚴禁隨意更動既有 `ZONES` 陣列順序**（影響共用 LCG 亂數與植栽位置）。<br>• 確認建物碰撞、地形高低與道路不相衝突。<br>• 完成校內未完項目時，同步更新 [task/campus-pending.md](task/campus-pending.md) 並寫進 commit 訊息。 |
| **2. 建築室內** | 修改 `Interiors.js` 或含可進入室內之建築（如 `Lixing.js`、`Sac.js`、`SacB1.js`） | • 牆線走 `Interiors.addWall`、地板與樓梯走 `Interiors.addSurface`。<br>• 改動完成後執行 `node tools/floorplan/make.mjs` 重新產生並檢視 [docs/floorplans/](docs/floorplans/README.md) SVG 確認無穿牆或隔間錯誤。 |
| **3. NPC 與資料** | 新增或調整 NPC、[data/npcs.json](data/npcs.json)、`src/entities/npcs/` | • 通用定點 NPC（`kind: "custom"`）請透過 `tools/npc-dashboard`（`http://localhost:5173/tools/npc-dashboard/`）視覺化編輯與存檔。<br>• 專屬劇情 NPC（`kind: "builtin"`）須於 `data/npcs.json` 登記設定與 `sources`，且遵守 `src/` 分層規範。<br>• 須通過 `tests/unit/data-consistency.test.js` 資料結構檢查。 |
| **4. 核心、UI、WASM 與主線** | 修改 `index.html`、`ui/`、`Textures.js`、`wasm-kernels/`、`MissionSystem.js`、`physics/` | • 改動 DOM ID 須通過 `tests/unit/dom-ids.test.js`。<br>• 改動貼圖噪聲或法線計算核心，必跑 `npm run test:wasm` 確保 `0 mismatched`。<br>• 影響主線任務、導航、碰撞或物理手感之變更，交付前須在具顯示環境執行 `npm run test:e2e` 確認可正常通關。 |

---

## 六、 程式碼風格、語言規範與品質門檻

### 1. 語言區分
- **文件、規格書與遊戲內介面文案**：使用**繁體中文**。
- **識別字命名**（變數、函式、類別）：使用**英文**；核心模組與重要業務檔建議補上簡潔英文檔名慣例（`PascalCase.js` 對應類別/業務模組，`snake_case` 對應 `tools/` 腳本）。
- **程式碼註解**：**通用底層邏輯、引擎演算法與 API 介面使用英文註解；涉及到中原大學校園地景、典故、劇情與任務邏輯可使用繁體中文註解**。

### 2. 語法與工具邊界
- 採用標準 ES Module（`import` / `export`），嚴禁使用 `var`；優先使用 `const` 與全等比較（`===` / `!==`）；未使用參數須加底線前綴（`_e`）。
- **ESLint（`npm run lint` / `npm run lint:fix`）**：涵蓋 `src/`、`tests/` 與 `tools/`，維持 **0 errors** 門檻（已配置略過中文字串與註解內的全形空白 `\u3000`）。
- **Prettier（`npm run format:check` / `npm run format`）**：依 [.prettierignore](.prettierignore) 刻意排除 `src/`（保留既有代碼與 `git blame` 歷史）、`tools/`、`docs/`、`*.md` 等，僅對納入範圍之設定與測試檔執行格式檢查；`src/` 風格一致性由 ESLint 把關。
- CSS 樣式集中於 [src/styles/style.css](src/styles/style.css)，避免於 HTML 撰寫 inline style。

### 3. 本地交付必跑指令 (`Node.js >= 22`)
Push 或請求 PR Review 前，必須在本機執行並確認全數通過：

```bash
npm run ci
# 等同依序執行：format:check -> lint -> test -> build -> check:dist
```

其他常用指令：`npm run dev`（本機 5173 開發）、`npm run lint:fix`、`npm run test:wasm`、`npm run test:e2e`、`node tools/floorplan/make.mjs`、`docker compose up --build`。

---

## 七、 實戰避坑與記憶沉澱

修改底層物理、渲染預編、存檔遷移或環境設定前，務必先查閱 [task/MEMORY.md](task/MEMORY.md)。
