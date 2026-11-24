# Phase 0 規格書：Mac Web Inspector 基準量測與極簡實驗旗標 (`phase-0-baseline-and-flags.md`)

## 一、 階段目的與精簡原則（Why）
開發團隊具備 **Mac ＋ iPhone 17 Pro Max（USB 連接 Safari Web Inspector）**，因此**不需要在遊戲程式碼內重造肥大的自製除錯畫面**：
- ❌ **不做**螢幕頂端自製 Crash Banner DOM
- ❌ **不做** `HTMLCanvasElement.prototype.getContext` 全域猴子補丁（Monkey Patch）與手寫像素估算
- ❌ **不改動**載入畫面 UI 與 `#loadText`

本階段專注兩件事：**建立 Mac Safari Web Inspector 的標準量測基準 SOP**，以及在程式碼中加入極精簡（總計 `< 40` 行）的**URL 實驗參數解析器**與 **`?perf` 記憶體行**，供後續 A/B 對照與第三方 `WKWebView`（LINE/IG）無接線驗收使用。

---

## 二、 Mac Safari Web Inspector 標準基準量測 SOP

每次優化前後，皆於 Mac 執行 `npm run dev`（或連個人 Fork Pages），將 iPhone 17 Pro Max 透過 USB 連接 Mac，開啟 **Mac Safari → 開發 (Develop) → iPhone → 該網頁** 進行以下 4 項標準採樣並回填 [agent-handoff-log.md](../agent-handoff-log.md)：

1. **Graphics → Canvases**：
   - 記錄載入完成進入標題頁時（或崩潰前最後一刻）的存活 `<canvas>` 總數量、最大單張尺寸（應會看到 `2048×4096` 與多張 `1024×1024`）以及 WebKit 回報的總 Canvas 記憶體。
2. **Timelines → Memory**：
   - 開啟錄製後重新整理頁面，記錄 `Page` / `Layers` / `Images` / `JavaScript` 各分類峰值 MB 與 Jetsam 重整發生的臨界水位。
3. **Timelines → JavaScript & Events**：
   - 錄製 `Game.init()` 火焰圖，拆解並記錄 `buildWorld`、`buildInteriors`、`Textures`、`buildPhysicsWorld`、`compileAsync` 各自真實 CPU 耗時（ms）。
4. **Console**：
   - 檢查是否出現 `"Total canvas memory use exceeds the maximum limit"`、`WebGL: CONTEXT_LOST_WEBGL` 或任何未捕捉錯誤。

---

## 三、 極簡程式碼規格（總改動 < 40 行）

| 檔案 | 變更性質 | 說明 |
| :--- | :--- | :--- |
| `src/core/PerfProfile.js` | **新增** | 純函式解析裝置等級與 URL 實驗參數，產出 `StreamingProfile`（供 Phase 1～3 共用）。 |
| [src/core/GameLoop.js](../../src/core/GameLoop.js#L228-L231) | **微調** | 在既有 `?perf` 浮層文字末尾補上一行 `renderer.info.memory` 數據，方便在無法掛載 Web Inspector 的 LINE / IG `WKWebView` 內快速對照 GPU 物件數。 |

### 1. `src/core/PerfProfile.js` 規格
輸出 `resolveRuntimeProfile(settings)`，支援透過 URL 覆寫參數在 iPhone Safari 一鍵切換做對照測試：
- `?tier=mobile-lite | desktop-igpu | desktop-dgpu`（未指定時：觸控裝置預設 `mobile-lite`；桌面依 GPU 名稱區分 `desktop-igpu` / `desktop-dgpu`）
- `?texscale=0.25 | 0.5 | 0.75 | 1`（控制 Phase 1 程序貼圖與圖集倍率）
- `?stream=0 | 1`（Phase 2 全局動態串流功能開關）

### 2. `?perf` 浮層擴充一行 GPU Memory
在 [src/core/GameLoop.js](../../src/core/GameLoop.js#L230) 既有 `el.textContent` 最後補上：
```js
\n紋理 ${r.info.memory.textures}  幾何 ${r.info.memory.geometries}
```
（待 Phase 2 加入 `WorldStreamer` 後再補上 `串流 ${active}/${total}`）。不帶 `?perf` 開啟遊戲時 0 額外執行成本。

---

## 四、 PR 切分與驗收標準

- **建議分支**：`chore/perf-flags-and-metrics`
- **驗收清單**：
  1. `npm run ci` 全綠通過（確認 [import-graph.test.js](../../tests/unit/import-graph.test.js) 與 [dom-ids.test.js](../../tests/unit/dom-ids.test.js) 無違規）。
  2. Mac Safari Web Inspector 成功對現況（未優化基線）錄得第一份真實數據（Canvas 數、記憶體峰值、失敗點 Console 訊息），並寫入 [agent-handoff-log.md](../agent-handoff-log.md)。

---

## 五、 Phase 0 實機基準數據紀錄（2026-11-24）

- **量測分支 / Commit**：`chore/perf-flags-and-metrics` (`9daa340`)
- **測試網址**：Mac 本機 `http://localhost:5173/?perf`；iPhone 區網 `http://172.20.10.2:5173/?perf`

### 1. iPhone 17 Pro Max（iOS Safari）
- **載入結果**：❌ **失敗（穩定重整循環，無法開啟）**
- **現象**：持續卡在載入頁面的 **「載入地圖資料 2%」**，停滯一段時間後觸發 WebKit 頁面自動重整，始終無法進入標題頁或顯示 `?perf`。
- **Web Inspector 狀態**：因 iPhone 無法掛載 Mac Safari Web Inspector 遠端偵錯且於 2% 即觸發重整循環，Console / Canvases / Timelines Memory / Call Trees 均標記為未取得。
- **關鍵線索（對齊 `Game.js#L124-L311`）**：`setLoad(0.02, '載入地圖資料')` 到下一個 `setLoad(0.08, '搭建中原大學')` 之間包含 `cycu.json` / `terrain.json` 下載解析、`initKernels()`、`physics.init()`（Rapier WASM 3.08 MB）、`zonesFix/Add/Terrain`、`WebGLRenderer` 與 `PostFX` 初始化；Phase 1 需同步排查此區間記憶體與同步阻塞熱點，以及後續 `buildWorld` / `Textures` 的 Canvas 釋放。

### 2. MacBook Pro Apple M1 Pro（`desktop-igpu` 對照組）
- **環境**：macOS `27.2.1` (Build `26B131`)｜GPU：`Apple, ANGLE Metal Renderer: Apple M1 Pro`｜畫質：`medium`｜WASM：`開`｜Console 全程無錯誤。

| 場景階段 | FPS / Frame Time | Draw Calls | 三角形 | 物理碰撞體 | 紋理 (`textures`) | 幾何 (`geometries`) | 檔位 (`tier`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **標題頁（載入 100% 穩定）** | `65 fps` / `15.3 ms` | `1,763`（峰值 `1,774`） | `4,590k`（峰值 `4,638k`） | `0 剛體 2,557 碰撞體` | `432`（峰值 `434`） | `1,963`（峰值 `1,976`） | `desktop-igpu` |
| **進校園初期（開場對話開啟中）** | `60 fps` / `16.6 ms` | `1,744` | `4,287k` | `1 剛體 2,558 碰撞體` | `653` | `2,724` | `desktop-igpu` |
| **進校園自由漫遊（懷恩樓前靜止）** | `50 fps` / `20.0 ms` | `1,729` | `4,240k` | `2 剛體 2,559 碰撞體` | `659` | `2,747` | `desktop-igpu` |
