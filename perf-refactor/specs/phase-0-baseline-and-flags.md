# Phase 0 規格書：可觀測基準、啟動檢查點與實驗旗標 (`phase-0-baseline-and-flags.md`)

## 一、 階段目的（Why）
原版 Phase 0 假設「完全依賴 Mac USB Safari Web Inspector 即可抓出 iPhone 崩潰點，不需動到載入畫面與診斷紀錄」。但 2026-11-24 實機測試直接推翻此假設：iPhone 17 Pro Max 持續卡在「載入地圖資料 · 2%」並觸發頁面自動重整循環，**導致 Web Inspector 根本無法掛載，所有指標空白**；同時也揭露 [Game.js](../../src/core/Game.js#L308-L337) 存在 `await nextFrame()` 放在 `setLoad(0.08)` 之前的時序 Bug，造成整個 8,286 行 `buildWorld()` 阻塞期間畫面永遠凍結在 `2%`。

因此本階段聚焦於建立**「無盲區、跨平台（Linux / Mac / iPhone WebView）」的可觀測基準**：
1. 修復 `Game.js` 載入階段的讓幀順序（先更新 DOM ＋ 檢查點，再 `await nextFrame()`）。
2. 加入極輕量、可由 `?diag=1` / `?diag=halt` 開啟的啟動檢查點麵包屑 `BootDiag.js`（連死兩次自動暫停重載循環，不依賴 USB 就能看清崩潰階段）。
3. 建立單一職責的 `PerfProfile.js`（不重複定義 `QPROF` 視覺畫質欄位）。
4. 擴充 `?perf` 記憶體行，並提供開發機可用的 Headless CDP 自動剖析腳本 `tools/profile_scene.mjs`。

---

## 二、 程式碼規格

| 檔案 | 變更性質 | 說明 |
| :--- | :--- | :--- |
| `src/core/PerfProfile.js` | **新增** | 純函式硬體分級偵測與 URL 實驗參數解析（`?tier=` / `?texscale=` / `?stream=` / `?diag=`），**不重複定義 `QPROF` 的 `shadowSize`、`maxDpr`、`postFx`**。 |
| `src/core/BootDiag.js` | **新增** | `localStorage['yanlinGTA.bootDiag.v1']` 啟動檢查點記錄器；在 `?diag=1` 或 `?diag=halt` 下顯示前次崩潰階段與耗時，並具備防無限重整斷路器。 |
| [src/core/Game.js](../../src/core/Game.js) | **修改** | 統一使用 `stage(key, pct, label)`（先 `setLoad` ＋ `bootDiag.checkpoint` 再 `await nextFrame()`），細分 `fetch-and-wasm (2%)` → `renderer-and-sky (5%)` → `build-world (8%)` → `build-interiors (78%)` → `build-physics (79%)` → `spawn-entities (82%)` → `init-npcs (95%)` → `compile-shaders (98%)` → `complete (100%)`。 |
| [src/core/GameLoop.js](../../src/core/GameLoop.js#L228-L234) | **修改** | 在既有 `?perf` 浮層補上 `紋理 ${mem.textures}  幾何 ${mem.geometries}  檔位 ${tier}`，不帶 `?perf` 零開銷。 |
| `tools/profile_scene.mjs` | **新增** | 複用 [tools/e2e/serve.mjs](../../tools/e2e/serve.mjs) 與 [tools/e2e/cdp.mjs](../../tools/e2e/cdp.mjs) 的零相依 Headless CDP 剖析腳本，統計存活 `<canvas>` 數與總 MB、`textures`、`geometries`、`calls`/`triangles` 與 `BootDiag` 各階段耗時。 |

### 1. `src/core/PerfProfile.js` 規格（單一職責）
輸出 `resolveRuntimeProfile(settings, env)`：
- `TIERS` 僅定義與材質/圖集/串流預算相關之設定：
  - `mobile-lite`：`{ tier: 'mobile-lite', texScale: 0.5, atlasMaxW: 1024, atlasMaxH: 2048, streaming: 'mobile' }`（向下相容 `?tier=mobile-ios` 別名）
  - `desktop-igpu`：`{ tier: 'desktop-igpu', texScale: 0.75, atlasMaxW: 2048, atlasMaxH: 2048, streaming: 'balanced' }`
  - `desktop-dgpu`：`{ tier: 'desktop-dgpu', texScale: 1, atlasMaxW: 2048, atlasMaxH: 4096, streaming: 'high' }`
- `STREAMING_PROFILES`（`off` / `mobile` / `balanced` / `high`）：含 `streetEnter` / `streetExit` / `interiorEnter` / `interiorExit` / `maxActiveChunks` / `physTileRadius`。
- URL 覆寫旗標：
  - `?tier=mobile-lite | desktop-igpu | desktop-dgpu`
  - `?texscale=0.25 .. 2`
  - `?stream=0 | 1 | off | mobile | balanced | high`
  - `?diag` / `?diag=1` / `?diag=halt` / `?diag=0`

### 2. `src/core/BootDiag.js` 規格（不觸犯 `dom-ids.test.js` 與 `import-graph.test.js`）
- 嚴禁引入 `systems/` 或 `ui/` 模組；嚴禁使用 `document.getElementById()` 或 `$()` 查詢新 ID（需建立浮層時直接用 `doc.createElement('div')` 掛載於 `doc.body`）。
- 每次 `begin()` 若發現前次 `current.completed === false`，將其升格為 `lastCrash` 並累加 `crashCount`：
  - 當 `diagMode === 'halt'` 且有 `lastCrash`，或 `diagMode === 'on'` 且 `crashCount >= 2` 時，`begin()` 顯示包含前次崩潰階段與各階段耗時的診斷浮層並暫停執行，直到點擊 `[▶ 繼續單次載入]` 才放行，徹底打破 iOS Safari / `WKWebView` 的重整死循環。

---

## 三、 標準量測 SOP（自動化 + 實機雙軌）

1. **本機 Headless CDP 量測（任何有 Chrome/Chromium 的 Linux / Mac 機器）**：
   ```bash
   npm run build
   node tools/profile_scene.mjs --play
   ```
   輸出標題頁與進場後的 `<canvas>` 總數、未歸零畫布 MB、`textures`、`geometries`、`calls`/`triangles` 與各啟動階段耗時。
2. **iPhone 17 Pro Max 區網 / Fork Pages ＋ `?diag=1`**：
   - 開啟 `http://<LAN-IP>:5173/?perf&diag=1`（或個人 Fork GitHub Pages）。
   - 若仍觸發 WebKit 重整，重載兩次後會自動停在診斷浮層，顯示確切卡死階段（例如是否死在 `build-world` 而非 `fetch-and-wasm`），並可接上 Mac Safari Web Inspector 讀取 **Graphics → Canvases** 與 **Timelines → Memory**。

---

## 四、 PR 切分與驗收標準

- **工作分支**：`chore/perf-flags-and-metrics`
- **驗收清單**：
  1. `npm run ci` 全綠（含 `perf-profile.test.js`、`boot-diag.test.js`、`import-graph.test.js`、`dom-ids.test.js`）。
  2. `Game.js` 載入進度條可逐階段繪出 `2% → 5% → 8% → 78% → 79% → 82% → 95% → 98% → 100%`。
  3. 回填最新實測數據至 [agent-handoff-log.md](../agent-handoff-log.md)。

---

## 五、 Phase 0 實機基準數據紀錄（2026-11-24 初版基線）

- **量測條件**：`chore/perf-flags-and-metrics` (`9daa340`，尚未套用 `stage()` 讓幀修復與 `BootDiag` 檢查點）
- **測試網址**：Mac 本機 `http://localhost:5173/?perf`；iPhone 區網 `http://172.20.10.2:5173/?perf`

### 1. iPhone 17 Pro Max（iOS Safari）
- **載入結果**：❌ **失敗（穩定重整循環，無法開啟）**
- **現象**：畫面停在「載入地圖資料 · 2%」後觸發 WebKit 自動重整循環，未能掛載 Web Inspector。
- **補充診斷**：經核對 `Game.js#L308-L337` 確認原版在 `setLoad(0.08, '搭建中原大學')` 與 `buildWorld()` 之間未曾讓幀，因此「停在 2%」實際上涵蓋了 `fetch/WASM`、`WebGLRenderer/SkySystem` 直到整段 `buildWorld()` 同步建置區間；合入新版 `BootDiag` + `stage()` 修復後，Phase 1 開工時可於 10 秒內精準鎖定真正的死因階段。

### 2. MacBook Pro Apple M1 Pro（`desktop-igpu` 對照組）
- **環境**：macOS `27.2.1`｜GPU：`Apple, ANGLE Metal Renderer: Apple M1 Pro`｜畫質：`medium`｜WASM：`開`｜Console 全程無錯誤。

| 場景階段 | FPS / Frame Time | Draw Calls (多 Pass 累計) | 三角形 | 物理碰撞體 | 紋理 (`textures`) | 幾何 (`geometries`) | 檔位 (`tier`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **標題頁（載入 100% 穩定）** | `65 fps` / `15.3 ms` | `1,763`（峰值 `1,774`） | `4,590k`（峰值 `4,638k`） | `0 剛體 2,557 碰撞體` | `432`（峰值 `434`） | `1,963`（峰值 `1,976`） | `desktop-igpu` |
| **進校園初期（開場對話開啟中）** | `60 fps` / `16.6 ms` | `1,744` | `4,287k` | `1 剛體 2,558 碰撞體` | `653` | `2,724` | `desktop-igpu` |
| **進校園自由漫遊（懷恩樓前靜止）** | `50 fps` / `20.0 ms` | `1,729` | `4,240k` | `2 剛體 2,559 碰撞體` | `659` | `2,747` | `desktop-igpu` |
