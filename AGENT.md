# YanlinGTA 開發規範與 Agent 作業指南 (Agent Development Guidelines)

本文件定義「中原順起來 · 資管要贏 票投彥霖 (YanlinGTA)」專案的長期統一開發規範、架構分層準則、品質門檻與協作流程。所有參與專案開發與維護的 AI Agent 及開發者均須嚴格遵守。

---

## 一、 專案核心原則與承諾

1. **專案定位**：
   - 3D 開放世界校園網頁冒險遊戲（採用 Three.js + Rapier 3D WASM 物理引擎 + Rust 程序化貼圖核心）。
   - 專案由 `howardtuan/YanlinGTA` fork 而來，所有變更最終將以 Pull Request 形式合併回源專案。
2. **零功能破壞原則 (Zero Regression)**：
   - 嚴格維持既有遊戲性、對白劇情、角色模型、物理數值與彩蛋機制不變。
   - 任何效能最佳化、模組重構或新功能擴充，均不得破壞 Three.js 渲染管線與 Rapier 物理世界的數值穩定性。
3. **先討論後動工原則 (Discussion Before Execution)**：
   - 除非接獲明確的開工指令，否則不可自行開始重大開發或實作工作。
   - 任何架構調整或新功能，須先仔細討論具體方案，並在 `task/` 目錄撰寫完整的規格規劃與驗收標準（Acceptance Criteria, AC）經確認後方可執行。

---

## 二、 開發環境與標準工作流 (Workflow & Toolchain)

專案使用現代化前端工程管線，所有相依套件均由 NPM 管理，建置管線由 Vite 驅動。

### 1. 常用命令清單

| 指令 | 目的與說明 |
| :--- | :--- |
| `npm run dev` | 啟動本機開發伺服器（預設埠號 5173，支援 HMR 與 WASM） |
| `npm run lint` | 執行 ESLint 靜態代碼檢查 |
| `npm run lint -- --fix` | 自動修復符合 ESLint 規範的格式與代碼問題 |
| `npm run format:check` | 檢查代碼是否符合 Prettier 排版規範 |
| `npm run format` | 執行 Prettier 自動排版 |
| `npm test` | 執行 Vitest 單元測試與整合測試套件 |
| `npm run test:wasm` | 執行 Rust WASM 噪聲與法線計算之逐位元（bit-for-bit）一致性檢驗 |
| `npm run test:e2e` | 執行無頭 E2E Story Bot 故事通關驗證 |
| `npm run build` | 執行 Vite 生產環境打包（產物輸出至 `dist/`，含資源 Content Hash） |
| `npm run preview` | 本機預覽生產環境打包產物 |
| `npm run ci` | **本地交付前完整驗證門檻**（格式檢查 + Lint + 測試 + Vite 打包） |
| `docker compose up --build` | 啟動 Docker 容器化生產環境驗證（Nginx） |

### 2. 交付驗收標準
- 在向遠端推送代碼前，必須在本機執行 `npm run ci`，確保 **Zero Errors / All Tests Passed**。
- GitHub Actions CI 工作流（代碼品質、單元測試、生產打包、Docker 驗證）必須維持 **全數綠燈**。

---

## 三、 架構分層與目錄職責規範 (`src/`)

程式碼嚴格依循 7 大領域分層架構，所有前端業務邏輯均收納於 `src/` 目錄內，**嚴禁在專案根目錄散落業務腳本或隨意新建資料夾**。

```
src/
├── core/               # 引擎調度層：主循環 (GameLoop)、選單與對話 (MenuManager)、載具調度 (VehicleSpawner)、輸入 (Input)
├── physics/            # 物理運算層：Rapier 3D 世界封裝 (PhysWorld, Physics)、車輛底盤物理 (VehPhysics)、布娃娃 (Ragdoll)、碰撞 (Collision)
├── graphics/           # 渲染與圖形層：Three.js 著色器修復 (ShadowFix)、日夜天空 (SkySystem)、後製處理 (PostFX)、程序貼圖與 WASM 橋接
├── world/              # 世界與建築生成：校園拼裝 (MapBuilder)、地形高程 (Terrain)、室內場景 (Interiors)、分區細節 (zones/)
├── entities/           # 實體與角色控制：玩家與相機 (Player)、角色網格 (Character)、車輛 (Vehicles)、無人機 (Drone)、NPC 與行人 AI
├── systems/            # 遊戲業務系統：任務狀態機 (MissionSystem)、存讀檔 (SaveSystem)、Web Audio 音效 (AudioSystem)、股市 (StockMarket)、小遊戲
├── ui/                 # 使用者介面層：HUD、小地圖、手機系統 (Phone)、提示系統 (Prompts)、PC 介面
└── styles/             # 樣式表：遊戲全域 CSS 樣式 (style.css)
```

### 依賴流向守則 (Dependency Rules)：
1. **單向流向**：低層級核心（`core/`, `physics/`, `graphics/`）不得依賴高層級業務與介面（`systems/`, `ui/`）。
2. **世界與實體分離**：`world/` 專注於靜態場景構建與碰撞拓撲，動態活動角色一律由 `entities/` 實例化。
3. **介面被動渲染**：`ui/` 主要監聽並反映遊戲狀態，業務邏輯決策保留於 `systems/` 或 `core/`。

---

## 四、 程式碼風格與命名規範 (Coding Standards)

1. **語言區分**：
   - **專案文檔與規格書**：一律使用**繁體中文（繁體中文）**撰寫。
   - **程式碼註解與 Git Commit**：程式碼內部註解、變數、類別、函式命名一律使用**英文**；Git Commit 訊息遵守 Conventional Commits 格式。
   - **遊戲介面文案**：遊戲內對話、標題、HUD、提示文字使用繁體中文。
2. **語法規範**：
   - 採用標準 ES Module（`import` / `export`）。
   - 宣告變數一律使用 `const` 或 `let`，**嚴格禁止使用 `var`**。
   - 條件判斷一律使用全等運算子（`===` 與 `!==`），禁止隱式型別轉換。
   - 物件字面量優先使用屬性縮寫（`object-shorthand`）。
   - 未使用的參數或變數一律加上底線前綴（如 `_e`, `_opt`），否則 ESLint 將報錯。
3. **樣式規範**：
   - 所有 CSS 樣式集中於 `src/styles/style.css`。
   - HTML 結構維持語意化，避免直接撰寫 inline style。

---

## 五、 Git 協作與提交規範

1. **分支策略**：
   - 主重構/特性分支為 `refactor`，所有提交均在此分支進行驗證。
   - 避免直接推送到未經測試的遠端分支。
2. **Commit Message 格式**：
   遵守 Conventional Commits 規範：
   - `feat(...)`: 新功能實作
   - `fix(...)`: 修復缺陷或異常
   - `refactor(...)`: 程式架構重構（無功能變更）
   - `test(...)`: 新增或調整測試案例
   - `docs(...)`: 文件或註解新增修改
   - `chore(...)`: 工具、設定或相依套件調整

---

## 六、 避坑手冊與記憶沉澱 (Lessons Learned)

在進行底層系統修改或環境操作時，務必參照 [task/MEMORY.md](file:///home/hank/Desktop/YanlinGTA/task/MEMORY.md) 的實戰踩坑紀錄：
1. **沙盒環境邊界**：網路操作（`git push`, `npm install`）與直接修改 `.git` 須於提權環境執行；其餘測試、建置、代碼編輯一律於沙盒內執行。
2. **WASM 逐位元精度保證**：修改貼圖核心時，必須執行 `npm run test:wasm` 確保 67 組 FBM 與 502 張 Normal Maps 達到 `0 mismatched`。
3. **全形空格與 ESLint**：宣傳標語含有中文字元全形空白（`\u3000`），ESLint 已配置略過字串與註解內的特殊空白，切勿誤刪配置。
4. **Rapier 物理世界生命週期**：場景重置或載具生成時， stand-in movers 必須先被 drop，避免剛體重疊穿透。
