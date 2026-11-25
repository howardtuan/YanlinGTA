# 優化踩雷記憶庫 (`pitfalls-and-memory.md`)

> [!CAUTION]
> 本文件收錄在靜態剖析、實機測試與程式碼逐行核對中已確認的**致命技術地雷與架構紅線**。所有接手本計畫的 AI Agent 與開發者在改動對應檔案前，**必須先核對本清單**，嚴禁重蹈覆轍。

---

## 踩雷 #1：全專案 86 處 `<canvas>` 生命週期、私有 Helper 與「無腦立即縮 `1×1`」破圖陷阱

### 現象與程式碼真相
1. **不要誤以為手機是因為沒開 `low` 畫質才崩潰**：
   - [GameLoop.js](../src/core/GameLoop.js#L52) 的 `guessGpu()` 對觸控裝置（`isTouch()`）**早已回傳 `'low'`**；
   - [MapBuilder.js](../src/world/MapBuilder.js#L3780) **早已寫好** `const texPx = quality === 'low' ? 64 : 128;`；
   - [PostFX.js](../src/graphics/PostFX.js#L79) 在 `'low'` 時**早已完全不建立 `EffectComposer` 與 `HalfFloatType` RenderTarget**。
   - **唯一例外**：[Game.js](../src/core/Game.js#L283) 與 [SkySystem.js](../src/graphics/SkySystem.js#L143) 在建構期先設了 `shadowMap.enabled = true` / `sun.castShadow = true`，直到第 335 行 `_applyQuality()` 才關閉（應在 Phase 1 順手修正）。
   - 換句話說，iPhone 17 Pro Max 是在**已經套用 `px = 64`、無 PostFX、DPR `0.8`** 的情況下依然崩潰！真正元兇是全專案大量未回收的 2D `<canvas>` Backing Store 與啟動同步資源尖峰。
2. **漏算的 20+ 個私有 Canvas Helper 與「模組頂層立即建立」陷阱**：
   - 全專案共有 **86 處 `document.createElement('canvas')`**（涵蓋 `src/world/`、`src/graphics/`、`src/entities/`、`src/systems/`、`src/ui/`）。
   - `ZoneA.js`～`ZoneH.js`、`Lixing.js`、`Sac.js`、`SacB1.js`、`Arena.js`、`ClubRoom.js`、`Dorms.js`、`GarryHome.js`、`GateExtras.js`、`GordonShop.js`、`Weiche.js`、`Court.js`、`Furniture.js` 各自複製了一套私有 `ctex()` / `canvasTex()` / `tex()`，完全不經過 [Kit.js](../src/world/Kit.js)。
   - 更致命的是：[Dorms.js](../src/world/buildings/Dorms.js#L160-L540)、[Weiche.js](../src/systems/minigames/Weiche.js#L140-L270)、[StreetDaren.js](../src/world/buildings/StreetDaren.js#L1628) 與 `src/world/buildings/d2/corners.js` 在 **ES Module 頂層（`Game.init()` 與 `PerfProfile` 都還沒執行、`renderer` 還沒建立前）** 就直接執行數十次 `ctex()` / `sg()`（包含 `2048×256` 大圖）。
   - [Textures.js](../src/graphics/Textures.js#L210) 內部還有用於計算高度場與髒污的中間畫布 `hc`、`dc`（在 `paving`、`sidewalk`、`facade`、`facadeParam`、`shopTex`），它們從未進入 `toTex()`，若不顯式歸零就會一路殘留記憶體。

### ❌ 兩大錯誤修法（千萬不要這樣寫）
```js
// ❌ 錯誤 1：在 ctex() / toTex() 當下就縮回 1×1
const tex = new THREE.CanvasTexture(cv);
cv.width = 1; cv.height = 1;
// 後果 A：renderer 還沒上傳 GPU，首幀讀到 1×1 黑塊！
// 後果 B：Kit.finishRow() -> packAtlas() 在整排街屋蓋完後才讀取 m.map.image 畫進大圖集，結果整排店招全變透明黑塊！
// 後果 C：ROWT / YHT 貼圖在 TEX[key] 跨十幾條街共用，T.screen() 還有 wallpaper.jpg 非同步 im.onload，提早縮掉或 dispose 會全部壞掉！
```

### ✅ 正確解法（四種角色分級的兩階段安全生命週期）
所有畫布統一交由 Phase 1 新增的 `CanvasLifecycle` 管理，嚴格區分 4 種角色：
1. **`immediate-scratch`（純計算中間畫布，如 `Textures.js` 的 `hc` / `dc`）**：讀取完 `getImageData()` 或 `drawImage()` 後**當場** `cv.width = 1; cv.height = 1;`。
2. **`atlas-source`（專供 `finishRow()` / `Kit.finish()` 打包進圖集的店面招牌）**：建立時保留原畫布，直到 `packAtlas()` 繪入圖集且圖集完成 `renderer.initTexture(sheet.tex)` 後，才把**子貼圖 `.dispose()` 並將子畫布與圖集畫布雙雙縮回 `1×1`**。
3. **`shared`（`TEX[key]` / `Textures.js` `CACHE[k]` 共用材質）**：保留輕量 `redraw()` 工廠閉包（不佔像素記憶體），在 `buildWorld()` / `buildInteriors()` 結束、且 `renderer` 就緒並執行 `renderer.initTexture(tex)` 上傳 VRAM 後，將 `<canvas>` 縮回 `1×1`；若遇到 `webglcontextlost` 或 Phase 3 動態區塊重新 `mount()` 時缺少畫布，透過 `redraw()` 即時重建並再次釋放。
4. **`async-image`（如 `T.screen()` 需等 `wallpaper.jpg` `im.onload`）**：掛載 `asyncPending` 鎖，等 `im.onload` 繪製並 `initTexture` 完成後才釋放畫布。
5. **保底防護**：若 `cv.getContext('2d')` 在極端記憶體壓力下回傳 `null`，安全回退至共用的 `1×1` `THREE.DataTexture`，不拋出未捕捉例外。

---

## 踩雷 #2：`Game.js` 載入進度條 `await nextFrame()` 順序 Bug 與 iOS 重整循環盲區

### 現象與根因
- 在實機基準測試（2026-11-24）中，iPhone 17 Pro Max 持續卡在 **「載入地圖資料 · 2%」** 後觸發頁面自動重整循環，且因重整過早／無接線，Mac Safari Web Inspector 根本無法掛載。
- 檢視 [Game.js](../src/core/Game.js#L308-L337) 發現真正的時序 Bug：
  - 第 123 行顯示 `setLoad(0.02, '載入地圖資料')` 並做完 `fetch` / `initKernels` / `physics.init`；
  - 第 308 行先執行 `await nextFrame()`，**第 309 行才呼叫 `setLoad(0.08, '搭建中原大學')`**，緊接著第 324 行同步執行 8,286 行的 `buildWorld()` 直到第 337 行才再次 `await nextFrame()`！
  - **後果**：整個 `buildWorld()` 阻塞主執行緒期間，DOM 文字沒有機會重繪，畫面永遠停在 `2%`。只要在 `buildWorld()` 過程撞上 WebKit 記憶體上限被 Jetsam 殺掉，開發者就會誤以為死在 `2%` 的 JSON 下載或 WASM 初始化！

### ✅ 正確解法
1. **先寫 DOM ＋ 檢查點，再 `await nextFrame()`**：封裝 `stage(key, pct, label)`，順序必須是 `setLoad(pct, label)` → `bootDiag.checkpoint(...)` → `await nextFrame()`，確保瀏覽器把最新階段文字畫上螢幕後才執行下一個同步重負載區塊。
2. **輕量持久化崩潰麵包屑（`BootDiag`）**：將最後停留階段寫入 `localStorage`，加上 `?diag=1`（連死 2 次自動暫停）與 `?diag=halt`（遇上次未完成即暫停），讓開發者在無法掛載 Web Inspector 的 iPhone Safari / LINE / IG 內直接看見上一次死在哪個確切階段並保留頁面供掛載除錯。

---

## 踩雷 #3：`QPROF` 與 `PerfProfile` 雙軌畫質衝突

### 現象與根因
- [GameLoop.js](../src/core/GameLoop.js#L20-L58) 已經透過 `QUALITY` / `QPROF` / `guessGpu()` / `autoQuality()` 控制遊戲畫質（包含 `far`、`fog`、`pr`、`shadows`、`view`、`PostFX`），且手機在 `QPROF.low` 的 `pr` 上限是 `0.8`、無陰影。
- 若另在 `PerfProfile` 定義 `shadowSize`、`maxDpr: 1.5` 或 `postFx`，不僅會與使用者選單手動切換的 `game.quality` 打架，一旦讓手機誤用 `maxDpr: 1.5`，渲染像素量更會直接暴增 `(1.5 / 0.8)² ≈ 3.5 倍`。

### ✅ 鐵律：單一職責分離
- **`GameLoop.js` (`QPROF`)** 永遠是渲染畫質（DPR、陰影開關與解析度、視距、霧氣、PostFX）的**唯一真相來源**。
- **`PerfProfile.js`** 嚴格只負責四件事：**硬體等級分類（`tier`）**、**程序貼圖生成縮放（`texScale` / `atlasMaxW` / `atlasMaxH`）**、**空間串流預算（`streaming`）**、以及 **URL 實驗旗標（`?tier=` / `?texscale=` / `?stream=` / `?diag=`）**。

---

## 踩雷 #4：Draw Calls 真正結構（為何 M1 Pro 實測高達 1,729 Calls）

### 現象與根因
- 原規劃誤以為全場景只有「~15 個 Draw Calls」，但 M1 Pro 實測進校園即高達 **`1,729` Draw Calls、`4,240k` 三角形、`2,747` Geometries、`659` Textures**。
- 原因有三：
  1. [GameLoop.js](../src/core/GameLoop.js#L208) 設了 `r.info.autoReset = false`，因此 `?perf` 數字是 **Shadow Map Pass ＋ 主場景 Pass ＋ PostFX 多重 Pass** 的累加總和。
  2. 全專案有 **26 處呼叫 [Kit.finish()](../src/world/Kit.js#L702-L715)**（資管系館、力行、學活、麥當勞、ZoneA～H、宿舍、維澈樓等），且 `src/world/` 共有 **1,258 次 `k.plane()` 呼叫**！`Kit.finish()` 目前只合併 `k.parts`（`box`/`slab`/`cyl`），**完全沒有合併 `k.plane()` 門牌/海報/螢幕，也沒有使用頂點色合批純色材質**。
  3. 周圍車流（26 台）、停放機車汽車、路人（32 名）與劇情 NPC 皆包含多個子部件 Mesh。

### ✅ 鐵律
- `MapBuilder.js` 的 120m 網格分塊主要是透過視錐體剔除**大砍 60%+ 的三角形與陰影頂點**，對 Draw Calls 則是合理微增；
- 真正能讓 Draw Calls 暴降的關鍵在 **Phase 2 為 `Kit.finish()` 補上靜態 `plane` 圖集化＋純色頂點色合批**、**室內家具群組遠距隱藏**、以及 **為無獨顯預設關閉高耗能 Shadow / PostFX Pass**。

---

## 踩雷 #5：NPC 啟動期強耦合 `game.interiors.*` 與 `ZONES` 決定性亂數流

### 1. `game.interiors.*` 強耦合
在 [Game.js](../src/core/Game.js#L516-L542) 初始化劇情 NPC 與小遊戲時，大量模組會在建構期或首幀讀取 `game.interiors` 下的座標與床位 Spec：
- `Jianyu.js`、`Hank.js`、`Zz.js`、`DevNPC.js`、`PinHan.js`、`Ruizhe.js` → `game.interiors.lixing`
- `Mingshan.js`、`Hank.js`、`McShift.js`、`McKitchen.js` → `game.interiors.mcd`
- `Garry.js` → `game.interiors.garry`、`game.interiors.club`
- `Zz.js`、`Gordon.js`、`TeaShop.js` → `game.interiors.tea`、`game.interiors.gordon`
- `MissionSystem.js` → `game.interiors.yh?.door`

**鐵律**：必須拆分為「**常駐純數字 `anchor()`（< 50 KB，啟動即填入 `game.interiors.*`）**」與「**非同步 `mount(ctx)`（僅 3D Mesh、圖集、家具與進門動作）**」。

### 2. `Zones.js` 與 `MapBuilder.js` 的決定性 PRNG
- 如 [Zones.js](../src/world/zones/Zones.js#L18-L19) 註解警告：`ZONES` 陣列順序與前置資料 Hooks（`drop`, `fix`, `add`, `look`, `footprints`, `terrain`, `trees`, `vegHide`, `treeHide`, `ownSign`）影響全校樹種、灌木與冷氣的決定性亂數流。
- **鐵律**：所有前置資料 Hooks 總耗時 < 3 ms，**啟動時必須按原順序同步跑完**；`MapBuilder` 的 `ChunkedGeo` 分塊也只能發生在頂點寫入分桶階段，不得改變建物迴圈抽樣順序。

---

## 踩雷 #6：Vite/Rollup 假拆包陷阱（靜態 `import` 與動態 `import()` 不可共用同一模組）

### ❌ 錯誤寫法
若在 [Zones.js](../src/world/zones/Zones.js) 頂部靜態 `import { HZ_ST, hzFix, hzLook, hzFootprints } from '../buildings/StreetHuanzhong.js'`，同時又在 `stream` 裡寫 `load: () => import('../buildings/StreetHuanzhong.js')`：
- **結果**：在 Rollup / Vite 打包規則下，只要某檔案已被主入口靜態匯入，動態 `import()` **完全不會拆出獨立 JS Chunk**，2.8 MB 主包體積一行都減不下來！

### ✅ 正確解法（輕量規格檔與重型建模檔物理分離）
- 將需要串流的外圍街屋與大型室內拆為兩支檔案：
  1. `StreetXxxSpec.js`（僅含 `drop`、`fix`、`look`、`ownSign`、`footprints`、純數字 `anchor()`，約 1–3 KB）：由 `Zones.js` 靜態匯入。
  2. `StreetXxx.js`（純 3D 幾何建置與圖集貼圖 `mount(ctx)`，數千行）：**主 Bundle 內零靜態 `import`**，只透過 `() => import('../buildings/StreetXxx.js')` 動態載入，確保 `npm run build` 後於 `dist/assets/` 真正產出獨立按需下載的 Chunk 檔案。

---

## 踩雷 #7：Rapier `Walker.js` 穿牆陷阱與 `tools/floorplan/` 工具相容紅線

### 1. `Walker.js` 只認 Rapier `physics.tags.walls`，不走 2D `Interiors.resolve`
- 玩家步行碰撞控制器 [Walker.js](../src/entities/Walker.js#L50-L65) 是用 Rapier 膠囊體掃描 `physics.tags.walls` 與 `physics.tags.trunks`。
- 目前 [PhysWorld.js](../src/physics/PhysWorld.js#L314-L331) 只在啟動時一次性把 `interiors.walls` 與 `surfaces` 烤進物理世界。
- **鐵律**：當 Phase 3 把力行宿舍、學活、資管系館改為動態 `mount()` 時，`PhysWorld` 必須同步提供 `mountChunkPhysics(chunkId, walls, surfaces)` 與 `unmountChunkPhysics(chunkId)`，動態建立／移除 Collider 並維護 `physics.tags.walls` 的 handle 集合，否則玩家走進串流建築會**直接穿牆墜落**！

### 2. `tools/floorplan/` 依賴既有建置函式與檔頭常數
- [tools/floorplan/buildings/lixing.mjs](../tools/floorplan/buildings/lixing.mjs) 與 [tools/floorplan/buildings/sac.mjs](../tools/floorplan/buildings/sac.mjs) 直接匯入呼叫 `buildLixing`、`buildSac`、`Interiors.js` 私有 `buildMcD`，並透過 `readConsts()` 解析該檔案頂部的平面常數（`NX`、`RA`、`SAC_B1` 等）。
- **鐵律**：拆分 `Lixing.js`、`Sac.js`、`Interiors.js` 時必須維持原有函式匯出與檔頭常數定義，並將室內平面圖產圖驗證納入 Phase 3 驗收。

---

## 踩雷 #8：三大自動化單元測試門禁（CI Gatekeepers）

每次修改必須通過 `npm run ci`（`format:check` + `lint --max-warnings=0` + `vitest` + `build` + `check:dist`），特別注意三大結構測試：
1. **[tests/unit/import-graph.test.js](../tests/unit/import-graph.test.js)**：
   - 嚴格執行 7 層單向無環檢查（`core` 除 `Game.js`/`GameLoop.js`/`MenuManager.js` 外不可依賴 `systems`/`ui`；`world` 嚴禁依賴 `entities`；`physics`/`graphics` 不可依賴 `systems`/`ui`）。
   - `WorldStreamer.js` 嚴禁 `import` `Player.js`，玩家座標速度僅能由 `Game.js`/`GameLoop.js` 以純數值傳入。
2. **[tests/unit/data-consistency.test.js](../tests/unit/data-consistency.test.js)**：
   - 驗證 `ZONES` 每個區有唯一非空 `name` 且已知 Hook 必為 `function`。
3. **[tests/unit/dom-ids.test.js](../tests/unit/dom-ids.test.js)**：
   - 掃描 `src/` 中所有 `getElementById('x')` 與 `$('x')`，要求 `'x'` 必須存在於 `index.html` 或 `id="x"` / `.id = 'x'` 定義內。動態除錯浮層（如 `?perf`、`?diag`）請直接用 `document.createElement('div')` 建立並操作變數參考，不要憑空查詢不存在的 DOM ID。
4. **`tools/check_dist.mjs`**：
   - 確保 `dist/index.html` 所有路徑皆為相對路徑（相容 GitHub Pages `/YanlinGTA/` 子路徑）且無未打包的 `src/` 參照。
