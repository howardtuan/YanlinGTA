# Agent 跨階段交接紀錄 (`agent-handoff-log.md`)

> [!NOTE]
> **交接規範（每次任務結束必寫）**
> 凡執行本重構計畫任一階段或子任務的 Agent／開發者，在發送 PR 前（或工作結束中斷時），都必須在本文件**最上方（最新一筆在最前）**新增一筆標準格式交接紀錄，確保下一位接手的 Agent 能無痛承接上下文，不重複踩雷。

---

## 交接紀錄範本（複製使用）

```markdown
### Session #XXX｜YYYY-MM-DD｜負責階段：Phase X
- **工作分支 / PR**：`refactor/...`（PR #... / 個人 Fork 測試網址：...）
- **本輪已完成**：
  - ...
- **實機與量化數據變化**（Mac Safari Web Inspector / iPhone LINE/IG / `?perf`）：
  - 載入結果：...
  - Memory / Canvases / Texture / Draw Calls / Tris / FPS：...
- **新發現的技術細節或踩雷**：
  - （同步補進 `pitfalls-and-memory.md`）
- **下一棒確切待辦（Next Actionable Step）**：
  1. ...
```

---

### Session #002｜2026-11-24｜負責階段：Phase 0 實作（旗標解析與記憶體遙測）
- **工作分支 / PR**：`chore/perf-flags-and-metrics`（基於合併 PR #147 後之 `main` `7a00e81` 建立，目前本地已提交待量測補數據）
- **本輪已完成**：
  1. 完成規劃分支合併：`docs/perf-refactor-plan` 已透過 PR #147 合併至上游 `howardtuan/YanlinGTA` (`main`)，並已清理本地舊分支與同步最新 `main`。
  2. 新增 [`src/core/PerfProfile.js`](../src/core/PerfProfile.js)：實作 `TIERS`、`STREAMING_PROFILES`、`detectTier()` 與 `resolveRuntimeProfile()`，支援 `?tier=`、`?texscale=`、`?stream=` 實驗參數解析（預設不啟用串流，確保既有行為零改變，且於 GPU 探測後主動呼叫 `WEBGL_lose_context`）。
  3. 修改 [`src/core/Game.js`](../src/core/Game.js)：於 `init()` 掛載 `this.perfProfile = resolveRuntimeProfile(this.settings)`。
  4. 修改 [`src/core/GameLoop.js`](../src/core/GameLoop.js)：於 `?perf` HUD 新增 `紋理 {textures}  幾何 {geometries}  檔位 {tier}` 遙測列。
  5. 新增單元測試 [`tests/unit/perf-profile.test.js`](../tests/unit/perf-profile.test.js) 並更新狀態看板；本地 `npm run format && npm run ci` 全數通過。
- **實機與量化數據變化**（Mac Safari Web Inspector / iPhone LINE/IG / `?perf`）：
  - 載入結果：尚未接上實體 iPhone 17 Pro Max 錄製，待實機補齊：
  - Memory / Canvases / Texture / Draw Calls / Tris / FPS：_（待開發者以 Mac USB Safari Web Inspector 連線 iPhone 17 Pro Max 補填基準表）_
- **新發現的技術細節或踩雷**：
  - 上游 `main` 在規劃合併期間新增了 Mahjong 音效與 `Kit.js` 等內容，`Game.js` 亦小幅調整；Phase 0 因僅於 `loadSettings()` 後掛載 `this.perfProfile`，完全零衝突並存。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 以 Mac `npm run dev` + iPhone 17 Pro Max USB Safari Web Inspector 量測現況（記錄啟動後/進校園/全地圖的 Memory、Canvases、Textures/Geometries 與 `Game.init()` Flame Chart）並回填至 `specs/phase-0-baseline-and-flags.md` / 本文件，或將 `chore/perf-flags-and-metrics` 開 PR 合併。
  2. 隨即切入 **[Phase 1 規格書](specs/phase-1-ios-memory-rescue.md)**（`refactor/phase1-ios-memory-rescue`），處理 GPU 上傳後釋放 2D Canvas、圖集降維與延遲載入。

---

### Session #001｜2026-11-24｜負責階段：架構診斷、可行性評估與規劃書確立
- **工作分支 / PR**：`docs/perf-refactor-plan`（待審核與合入上游 `howardtuan/YanlinGTA`）
- **本輪已完成**：
  1. 完成全專案 15.4 萬行原始碼與資產體檢（`src/world/` 佔 10.2 萬行，啟動期全量同步建立 3,279 棟建物與 769 處 Canvas 呼叫）。
  2. 釐清雙端根因：
     - **iPhone 17 Pro Max 打不開**：非單純硬體 RAM 不足，而是撞上 iOS WebKit 單頁 `<canvas>` 2D 緩衝區硬上限（~384 MB）與 `finishRow()` 2048×4096 圖集雙重駐留，加上啟動同步塞入全量室內與 4.2 km 外林口體育館。
     - **電腦無獨顯卡頓**：非框架（Three.js）問題，而是過度合併為跨公里巨型 Mesh 導致 Frustum Culling 失效、林口體育館 `frustumCulled = false`、地板 `cutMask()` 使用 `discard` 破壞 Early-Z，以及內顯預設開啟 `PostFX` + 軟陰影。
  3. 確立純底層最佳化範圍（Phase 0 ～ Phase 4）：
     - **保留 Vite + Three.js + 雙 WASM 單一程式碼庫**，採**「全局空間動態載入（`WorldStreamer` + 120m 網格分塊）」**搭配雙端 `StreamingProfile` 控制視距與資源上限。
     - **排除所有 UI/UX 介面改動**與**主線第五章劇情改動**。
     - 因實機環境**具備 Mac + iPhone 17 Pro Max USB Safari Web Inspector**，精簡 Phase 0 僅保留 Web Inspector 基準 SOP、極簡實驗旗標（`PerfProfile.js`）與 `?perf` 的 `renderer.info.memory` 輸出。
  4. 建立根目錄獨立指揮部 `perf-refactor/`（共 10 份檔案），並於 `AGENT.md` 頂部加上不干擾內容組的過渡期公告。
- **目前環境與重要限制（下一棒必看）**：
  - **測試設備與工具**：具備 **Mac ＋ iPhone 17 Pro Max**，日常可用 Mac `npm run dev` + USB Safari Web Inspector 精確抓 Memory / Canvases / Flame Chart；階段驗收用個人 Fork GitHub Pages 在 LINE / IG `WKWebView` 實測。
  - **本機狀態**：目前 Sandbox 無網路與 `node_modules/`，若本機無 `node_modules` 需先在有依賴的環境執行 `npm ci && npm run ci`。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 待本分支 `docs/perf-refactor-plan` 合入上游 `main` 後，將 iPhone 17 Pro Max 透過 USB 接上 Mac Safari Web Inspector，依 **[Phase 0 規格書](specs/phase-0-baseline-and-flags.md)** 實測記錄現況的 Memory 峰值、Canvases 總數/MB 與 `Game.init()` Flame Chart 基準數據，並完成 `chore/perf-flags-and-metrics` 小 PR。
  2. 接著進入 **[Phase 1 規格書](specs/phase-1-ios-memory-rescue.md)** 實作 GPU 上傳後釋放 Canvas、圖集降維與延遲載入，先在 iPhone 17 Pro Max Safari / LINE / IG 打通秒開不閃退。
