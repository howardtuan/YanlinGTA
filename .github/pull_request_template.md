## 變更內容與設計說明 (What & Why)

<!-- 說明這次新增、修改或修復了什麼，以及背後的設計考量 -->

## 文件與設計確認 (Docs & Design)

- [ ] 本次變更未擅自移除既有設計或彩蛋（若有設計改動已與使用者討論確認）
- [ ] （若新增功能、系統或特殊遊戲設計）已同步更新 `docs/guide/` 對應文件

## 驗證方式與自動合併 (Verification)

- [ ] 已在本機執行 `npm run ci` 且全數通過（Format Check + ESLint + Vitest + Vite Build + `check:dist`）
- [ ] PR CI `Verify` 的 Headless Chrome Smoke Test 通過（過讀取條進 `title` → 點開始進入 `play`，0 執行期錯誤）
- [ ] 分支內無多餘 WIP commit
- [ ] 已啟用 Auto-merge（`gh pr merge --auto --merge`）

## 效能與運行環境紀錄 (Performance & Hardware)

<!-- 必填條件：改動涉及 src/core/、src/graphics/、src/world/、src/physics/、data/、assets/、vite.config.js 或任何影響載入／記憶體／渲染之變更時必填；其餘改動請勾選下方第一項略過。 -->

- [ ] 本次未涉及載入／記憶體／渲染改動（略過下表）
- [ ] **（優先）** 數據來源為 GitHub Actions `Verify` Job Summary（統一固定 `ubuntu-24.04` + SwiftShader + `960x540` + `low`）
- [ ] 數據來源為本機實測（僅作輔助或真實 GPU FPS 補充，已完整填寫下方硬體表）

### 運行環境與硬體（附效能數據時必填，缺一不可）

| 項目 | 數值 |
| :--- | :--- |
| 執行來源 | `GitHub Actions (Verify / ubuntu-24.04)` *(優先)* / `Local` |
| 作業系統 (OS) | <!-- 例：Linux 6.8 (linux/x64) / Darwin 24.x (darwin/arm64) --> |
| CPU（型號 × 核心數） | <!-- 例：AMD EPYC 7763 × 4 / Apple M3 × 8 --> |
| 記憶體 (RAM) | <!-- 例：16 GB --> |
| 瀏覽器版本 | <!-- 例：Chrome/131.0.0.0 --> |
| WebGL Renderer | <!-- 例：ANGLE (SwiftShader) / ANGLE (Apple M3, Metal) --> |
| 視窗與畫質 | <!-- 例：960x540 · low --> |

### 效能指標（可直接貼上 `smoke.mjs` 輸出表格；若為效能改動請填 `Before → After`）

| 指標 | 數值 | 單位 |
| :--- | ---: | :--- |
| Draw Calls | `-` | calls |
| Triangles | `-` | k |
| Geometries / Renderer Textures | `-` / `-` | 個 |
| Canvas 記憶體（GC 後） | `-` | MB |
| GPU 貼圖估算（含 mip） | `-` | MB |
| JS Heap / DOM Nodes | `-` / `-` | MB / 個 |
| 載入資源數 / Transfer | `-` / `-` | 個 / KB |
| 啟動至主畫面 (`title`) *(參考)* | `-` | ms |
| 點擊開始至進入遊玩 (`play`) *(參考)* | `-` | ms |
