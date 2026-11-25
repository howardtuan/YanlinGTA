# Phase 1 規格書：iOS 記憶體止血與全專案 Canvas 生命週期修復 (`phase-1-ios-memory-rescue.md`)

## 一、 階段目的（Why）
以**最小風險、100% 向後相容既有內容建模 API** 的方式，徹底解除 iOS Safari 與 LINE / IG `WKWebView` 的 WebKit 單頁 `<canvas>` 2D Backing Store 硬上限（~256–384 MB）與啟動期記憶體尖峰，讓 **iPhone 17 Pro Max 達到 `<= 5 秒` 穩定進場、連續漫遊騎車 `>= 10 分鐘` 零閃退重整**，同時清理電腦版啟動期不必要的 GPU 資源浪費。

> [!IMPORTANT]
> **先修正認知前提（與程式碼對齊）**：
> `GameLoop` 對觸控裝置早已預設 `quality = 'low'`、`MapBuilder` 早已套用 `texPx = 64`、`PostFX` 在 `low` 早已不建立 `EffectComposer`。因此手機崩潰的真正關鍵在**全專案 86 處 `<canvas>` 未釋放、20+ 個私有畫布 Helper 繞過管線、模組頂層 `import` 立即建畫布、中間讀回畫布 `hc`/`dc` 殘留、以及 `2048×4096` 街屋圖集**。

---

## 二、 變更範圍（Scope & Touchpoints）

| 檔案 / 模組群組 | 變更性質 | 具體改造內容 |
| :--- | :--- | :--- |
| `src/graphics/CanvasLifecycle.js` | **新增** | 統一 Canvas 建立、角色分級追蹤（`immediate-scratch` / `atlas-source` / `shared` / `async-image`）、安全 `getContext('2d') === null` 備援、以及經 `renderer.initTexture()` 驗證後的 `1×1` 釋放管線。 |
| [src/graphics/Textures.js](../../src/graphics/Textures.js) | **修改** | 1) 立即釋放 `hc`、`dc` 等中間計算畫布；2) 依 `perfProfile.texScale` 動態縮放地面與建築紋理尺寸；3) 納入 `CanvasLifecycle` 批次上傳後釋放 `col`/`em`/`rm`/`nm` 原畫布。 |
| [src/world/Kit.js](../../src/world/Kit.js) | **修改** | `ctex()` / `sg()` 支援 `texScale`、`redraw` 重繪工廠與兩階段釋放；`finishRow()` / `packAtlas()` 支援 `atlasMaxW × atlasMaxH` 上限，並於圖集上傳 GPU 後才回收一次性子貼圖與圖集畫布（不誤殺跨街共用 `ROWT`/`YHT`）。 |
| **模組頂層 `ctex()` 惰性化（4 支）** | **修改** | [Dorms.js](../../src/world/buildings/Dorms.js)、[Weiche.js](../../src/systems/minigames/Weiche.js)、[StreetDaren.js](../../src/world/buildings/StreetDaren.js)、`src/world/buildings/d2/corners.js` 移入函式內惰性建立（消除 `import` 階段提前爆記憶體與吃不到 `texScale` 的問題）。 |
| **私有 Canvas Helper 收斂（20+ 支）** | **修改** | `ZoneA`～`ZoneH`、`Lixing`、`Sac`、`SacB1`、`Arena`、`ClubRoom`、`Dorms`、`GarryHome`、`GateExtras`、`GordonShop`、`Weiche`、`Court`、`Furniture`、`MapBuilder` 的私有 `ctex`/`canvasTex`/`tex` 統一改接共用生命週期工具。 |
| [src/ui/HUD.js](../../src/ui/HUD.js#L24-L130) | **修改** | 手機端 `_prerender()` 縮小 `mapCanvas` 採樣倍率（`scale: 1.3 -> 0.65`），省下 75% 全圖底圖 2D 緩衝區。 |
| [src/core/Game.js](../../src/core/Game.js#L283) & [SkySystem.js](../../src/graphics/SkySystem.js#L143) | **修改** | 建構期即依 `lowQ` 決定是否啟用 `shadowMap.enabled` 與 `sun.castShadow`，避免手機先配置高解析 ShadowMap 再於 `_applyQuality()` 丟棄。 |
| [src/systems/AudioSystem.js](../../src/systems/AudioSystem.js#L78-L80) | **修改** | 移除建構子立即建立 `yanlin-opera.m4a` `preload = 'auto'`，改於玩家按下開始且 `settings.music === 'opera'` 時才載入。 |
| [src/entities/FirstPerson.js](../../src/entities/FirstPerson.js#L34-L42) | **修改** | 延遲建立後照鏡 `WebGLRenderTarget(480, 160)` 至首次切第一人稱；`localClippingEnabled` 僅於坐進汽車第一人稱時開啟。 |
| [src/world/buildings/Arena.js](../../src/world/buildings/Arena.js#L725-L820) | **修改** | 修正 `A1` / `A2` / `sticks` 的 `frustumCulled = true`；預設設定 `shell.visible = false`（僅演唱會期間由 `Concert.js` 開啟）。 |

---

## 三、 詳細技術規格（Technical Spec）

### 1. 四種角色的兩階段安全釋放協定（`CanvasLifecycle.js`）
依循 [pitfalls-and-memory.md](../pitfalls-and-memory.md) 踩雷 #1，嚴禁在 `new THREE.CanvasTexture(cv)` 當下就縮 `1×1`，必須依畫布角色區分生命週期：

1. **`immediate-scratch`（計算用中間畫布）**：
   - 如 `Textures.js` 中 `paving()`、`sidewalk()`、`facade()`、`facadeParam()`、`shopTex()` 的高度場畫布 `hc` 與髒污暫存畫布 `dc`。
   - 讀完 `heightFromCanvas(hc)` 或 `g.drawImage(dc, ...)` 後立刻呼叫 `releaseCanvas(cv)`：
     ```js
     export function releaseCanvas(cv) {
       if (!cv) return;
       cv.width = 1;
       cv.height = 1;
       cv.getContext('2d')?.clearRect(0, 0, 1, 1);
     }
     ```
2. **`atlas-source`（專供 `finishRow()` 圖集打包的店面一次性貼圖）**：
   - 街屋建立期保留原始 `<canvas>` 讓 `packAtlas()` 可正常執行 `g.drawImage(img, X, Y)`。
   - 待圖集 `sheet.tex` 透過 `renderer.initTexture(sheet.tex)` 同步上傳 VRAM 後：
     - 立即呼叫 `releaseCanvas(sheetCanvas)` 釋放圖集本身的大畫布；
     - 僅對「未被非圖集 Mesh 引用、且非跨區共用鍵」的店面子貼圖執行 `subTex.dispose()` ＋ `releaseCanvas(subCanvas)`。
3. **`shared`（`TEX[key]` / `Textures.js` `CACHE` 共用貼圖）**：
   - 建立時向 `CanvasLifecycle` 註冊 `{ tex, canvas, redraw }`。
   - 在 `buildWorld()` 與 `buildInteriors()` 收尾階段（此時 `this.renderer` 已存在）統一執行 `CanvasLifecycle.flushShared(renderer)`：逐張 `renderer.initTexture(tex)` 後呼叫 `releaseCanvas(canvas)`。
   - **重繪保險**：若後續 `webglcontextlost` 恢復或 Phase 3 動態區塊重新 `mount()` 需要重新上傳 / 取用畫布，透過 `redraw()` 閉包按需重繪後再釋放。
4. **`async-image`（如 `Kit.js` `T.screen()` 非同步載入 `wallpaper.jpg`）**：
   - 標記 `asyncPending = true` 暫緩釋放；待 `im.onload` 繪製壁紙、設 `needsUpdate = true` 並上傳 GPU 後才執行 `releaseCanvas(cv)`。
5. **Fallback 防禦**：
   - 任何建立畫布取得 `ctx === null` 時，不執行繪圖指令，改回傳共用 `1×1` 純色 `THREE.DataTexture`（不拋 `TypeError`）。

### 2. 手機端圖集與程序貼圖縮放（對齊 `PerfProfile.texScale`）
- 啟動階段透過 `CanvasLifecycle.configure(this.perfProfile)` 注入 `{ texScale, atlasMaxW, atlasMaxH }`：
  - `mobile-lite`（`texScale = 0.5`）：`finishRow()` `ATLAS_W` 由 `2048` 降至 `1024`、`ATLAS_MAX_H` 由 `4096` 降至 `2048`，將傳入子圖按 `texScale` 等比縮小繪入（`packAtlas` 與 UV 計算按實際圖集寬高與子圖邏輯比例計算，版面與文字位置 100% 不跑版）；`Textures.js` 的 `groundTex` 貼圖由 `512` 降為 `256`。
  - 原本模組頂層立即執行的 `Dorms.js`、`Weiche.js` 等畫布改為在首次被建置函式呼叫時才建立，確保一定吃得到 `perfProfile.texScale`。

---

## 四、 PR 切分與驗收標準

拆為兩個低衝突小 PR：
- **PR #3 (`fix/ios-canvas-lifecycle`)**：`CanvasLifecycle.js`、4 支模組頂層 `ctex` 惰性化、20+ 支私有 Canvas Helper 收斂、`Kit.js` / `Textures.js` / `MapBuilder.js` / `HUD.js` 兩階段釋放與 `texScale` 降維。
- **PR #4 (`fix/ios-lazy-noncore-assets`)**：`Game.js`/`SkySystem.js` 陰影延後配置、`AudioSystem.js`、`FirstPerson.js`、`Arena.js` 延遲載入與剔除修正。

### 驗收標準
1. `npm run ci` 全綠，電腦版與 `story-bot.mjs` 畫面、招牌文字、螢幕壁紙皆正常（無黑塊招牌）。
2. 本機 `node tools/profile_scene.mjs --play` 驗證：進場穩定後存活的非 `1×1` 離屏 `<canvas>` 記憶體 **`< 16 MB`**（目標核心建置畫布全部歸零至 `1×1`）。
3. **iPhone 17 Pro Max（iOS Safari ＋ 個人 Fork GitHub Pages 的 LINE / IG `WKWebView`）** 實測：
   - **`<= 5 秒` 穩定進場**；
   - 騎車從正門 → 夜市 → 環中東路 → 校園**連續遊玩 `>= 10 分鐘` 零閃退、零重整**；
   - Mac USB Safari Web Inspector **Graphics → Canvases** 確認無任何 `2048×4096` 殘留大圖，並將實測數字回填至 [agent-handoff-log.md](../agent-handoff-log.md)。
