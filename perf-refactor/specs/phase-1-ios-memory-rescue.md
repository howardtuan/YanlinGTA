# Phase 1 規格書：iOS 記憶體止血與資源生命週期修復 (`phase-1-ios-memory-rescue.md`)

## 一、 階段目的（Why）
以**最小風險、100% 向後相容現有內容建模程式碼**的方式，立即解除 iOS Safari 與 LINE / IG `WKWebView` 的 WebKit 單頁 `<canvas>` 2D 緩衝區硬上限（~384 MB）與啟動記憶體尖峰，讓 **iPhone 17 Pro Max 先成功穩定打開遊戲、能騎車逛校園**，同時幫電腦版清理掉幾個顯而易見的白白耗費 GPU 的錯誤設定。

---

## 二、 變更範圍（Scope & Touchpoints）

| 檔案 | 變更內容 | 預期效益 |
| :--- | :--- | :--- |
| `src/graphics/CanvasPool.js` | **新增** | 提供安全繪製與 GPU 同步上傳後釋放 2D Backing Store 的統一工具（含 `Context2D === null` 保底）。 |
| [src/world/Kit.js](../../src/world/Kit.js) | **修改** | `ctex()` 支援解析度倍率與上傳後釋放；`finishRow()` / `packAtlas()` 打包後回收子貼圖與原始畫布 + 縮放圖集上限。 |
| [src/graphics/Textures.js](../../src/graphics/Textures.js) | **修改** | `toTex()` 與 `facade()` / `facadeParam()` 依 `texScale` 降維（手機 `0.5x`），並在 GPU 上傳後釋放所有 `canvas()` 緩衝區。 |
| [src/world/MapBuilder.js](../../src/world/MapBuilder.js) | **修改** | `canvasTex()` 與招牌貼圖統一接入安全釋放管線。 |
| [src/ui/HUD.js](../../src/ui/HUD.js#L37-L130) | **修改** | `_prerender()` 手機端縮小 `mapCanvas` 採樣倍率（例如 `scale: 1.3 -> 0.65`），省下 75% 全圖底圖 Canvas 記憶體。 |
| [src/systems/AudioSystem.js](../../src/systems/AudioSystem.js#L57-L59) | **修改** | 取消建構期立即預載 `yanlin-opera.m4a`（3.0 MB），改於使用者點擊開始遊戲 (`init()`) 後才依設定載入。 |
| [src/entities/FirstPerson.js](../../src/entities/FirstPerson.js#L34-L42) | **修改** | 延遲建立後照鏡 `WebGLRenderTarget(480, 160)` 至真正切換第一人稱座艙時；`localClippingEnabled` 僅在進入汽車第一人稱時開啟、下車或切回第三人稱立即關閉。 |
| [src/world/buildings/Arena.js](../../src/world/buildings/Arena.js#L725-L820) | **修改** | 修正 `A1.frustumCulled` / `A2.frustumCulled` / `sticks.frustumCulled` 為 `true`；且非演唱會期間預設隱藏林口體育館 `shell.visible = false`（搭接駁車時由 `Concert.js` 開啟）。 |

---

## 三、 詳細技術規格（Technical Spec）

### 1. 正確釋放 `<canvas>` 2D Backing Store（絕對不可跳過 GPU 上傳）
依循 [pitfalls-and-memory.md](../pitfalls-and-memory.md) 踩雷 #1，實作 `commitAndReleaseCanvas(renderer, tex, cv)`：
1. 若呼叫時已經有可用的 `renderer`（如 `Game.js` 已建立 `this.renderer`）：
   - 立即呼叫 `renderer.initTexture(tex)` 強制 Three.js 同步執行 `gl.texImage2D` 把像素上傳至 VRAM。
   - 若因部分測試環境或尚無 renderer 而延後上傳，則掛載 `tex.onUpdate` 回呼（或於 `compileAsync` / 首幀繪製完成統一掃描 `releaseQueue`）才做釋放。
2. 確認上傳後執行 WebKit 官方認可的緩衝區回收序列：
   ```js
   cv.width = 1;
   cv.height = 1;
   cv.getContext('2d')?.clearRect(0, 0, 1, 1);
   ```
3. **保護 `Context2D === null`**：所有 Canvas 建立包裝函式若取得 `ctx === null`，不得直接執行繪圖指令拋錯，應回傳共用的 `1×1` 純色備援 `THREE.DataTexture`，並印出 `console.warn`（可直接於 Mac Safari Web Inspector Console 查看）。

### 2. 修復 `Kit.js` 的 `finishRow()` / `packAtlas()` 雙重記憶體問題
現況中，每條街屋建立數十張 `CanvasTexture` 存進全域 `TEX` 快取，接著 `finishRow()` 又把這幾十張畫進 `2048 × 4096` 的大圖集裡（造成一份店招佔兩份 Canvas 記憶體＋兩份 GPU 紋理記憶體）：
- **規則 1**：在 `packAtlas()` 內，記錄哪些 `ctex` / `sg` 貼圖已經完整被拷貝進 Atlas `sheet` 且沒有被外部（非 `atlasable` 物件）引用。
- **規則 2**：Atlas `sheet.tex` 完成 GPU 上傳後：
  - 將圖集 `<canvas>` 本身縮回 `1×1`。
  - 呼叫不再被獨立使用的原始子 `CanvasTexture.dispose()` 並將子 `<canvas>` 縮回 `1×1`，且從 `TEX` 快取移除其對大 Canvas 的強引用（或將 `TEX[key]` 改為記錄「已被 Atlas 收編」或按需重繪閉包）。
- **規則 3（手機端尺寸上限）**：當 `profile.texScale <= 0.5` 時：
  - `ATLAS_W` 由 `2048` 降至 `1024`，`ATLAS_MAX_H` 由 `4096` 降至 `2048`，將傳入的單張圖標按 `texScale` 等比縮小繪入（因為實際計算 UV 時仍以 `A.w / W` 比例計算，不會跑版）。
  - `Textures.js` 的 `facade()` / `facadeParam()` 在手機端強制 `px = 64`（單張圖集 VRAM 降為 1/4），地面貼圖 `S = 512` 降為 `256`。

### 3. 關閉啟動期不必要的全域開銷
- `Arena.js`：修正 `frustumCulled = true`，在 `buildArena` 結尾設定 `shell.visible = false`，並由 `Concert.js` 在進入演唱會場時開啟、離開場館時關閉。
- `FirstPerson.js`：建構子不立即建立 `WebGLRenderTarget`，改在首次 `renderMirrors()` 需要時懶初始化；`localClippingEnabled` 預設 `false`，僅在 `_car()` 啟用車體剖切期間設為 `true`，離開座艙時恢復 `false`。
- `AudioSystem.js`：移除建構函式中的 `this.opera = new window.Audio(...)` 立即 `preload = 'auto'`，改於玩家按下開始遊戲且確定 `settings.music === 'opera'` 時才載入播放。

---

## 四、 PR 切分與驗收標準

建議拆為兩個獨立、低衝突的小 PR：
- **PR #3 (`fix/ios-canvas-lifecycle`)**：`CanvasPool.js`、`Kit.js`、`Textures.js`、`MapBuilder.js`、`HUD.js` 的 Canvas 釋放與 `texScale` 降維。
- **PR #4 (`fix/ios-lazy-noncore-assets`)**：`AudioSystem.js`、`FirstPerson.js`、`Arena.js` 的延遲配置與剔除修正。

### 驗收標準
1. `npm run ci` 全部通過；電腦版視覺與行為無異常（`tests/` 與 `tools/e2e/story-bot.mjs` 相容）。
2. 在 **Mac ＋ iPhone 17 Pro Max USB Safari Web Inspector** 實測：
   - **Graphics → Canvases**：所有離屏繪製用 Canvas 在上傳 GPU 後皆縮至 `1×1`（4 Bytes），不再保留 `2048×4096` 或數百張活躍大圖。
   - **Timelines → Memory**：成功通過載入畫面進入標題頁與遊戲世界，Canvas / Images 記憶體峰值顯著下降。
3. 推上個人 Fork GitHub Pages，在 **iPhone 17 Pro Max** 的 **LINE / IG 內建瀏覽器（`WKWebView`）** 開啟 `?perf`：
   - 穩定進入校園且可騎車漫遊，**不再白屏或閃退**。
   - 將實測數據（Memory 峰值、Canvases、Tex/Geo、FPS）回填至 [agent-handoff-log.md](../agent-handoff-log.md)。
