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
所有畫布統一交由 Phase 1 新增的 `GpuMemLifecycle` 管理，嚴格區分 4 種角色：
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
   - **`nextFrame()` 不能只等 `requestAnimationFrame`**（2026-11-25 補充）：`await` 一個在 rAF callback 裡 resolve 的 Promise，後續程式會在同一幀的 callback 階段（microtask）就接著跑，**早於該幀的繪製**；緊接的 `buildWorld()` 一跑數秒，畫面仍是上一段的文字。必須寫成 `requestAnimationFrame(() => setTimeout(r, 0))`，等瀏覽器畫完這一幀才繼續。`BootDiag` 的 `localStorage` 檢查點是同步寫入，不受此影響。
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

---

## 踩雷 #9：借鏡《臺北狂飆》實證優化時必守的 `Three.js r160` 差異與四大紅線

經逐行比對 `node_modules/three/build/three.module.js`（`r160`）與 `YanlinGTA` 原始碼，下列從同類型產品逆向分析篩選出的注意事項**嚴禁誤用**：

1. **❌ 絕對禁止在 `Three.js r160` 使用 `slimShadowMaps()`（單通道 `RedFormat` 陰影 FBO）**：
   - 《臺北狂飆》採用 `r186` 的硬體 `DepthTexture`；但 **`Three.js r160` 的 `WebGLShadowMap`（與 [ShadowFix.js](../src/graphics/ShadowFix.js#L13)）是將 32-bit 深度打包進 `RGBADepthPacking` 的 RGBA 四個通道**。若將 `shadow.map` 改為單通道 `RedFormat`，會直接破壞 G/B/A 三個通道導致全場景陰影毀損！
2. **❌ 不要重寫 2D `uLampMap` 環形路燈貼圖**：
   - [MapBuilder.js](../src/world/MapBuilder.js#L7164) 在 `low` 畫質已是 **`0` 盞 `PointLight`**（白天還會隱藏 `coneMesh` / `poolMesh`），`medium` 也只有 `4` 盞不投射陰影的池化點光源。將 `desktop-igpu` 上限調為 `0` 或 `2` 盞即可達到相同效果，無須為了 `uLampMap` 改寫全專案所有建築與人物 Shader。
3. **⚠️ 靜態 `BufferGeometry` 清空 CPU 陣列（`onUploadCallback` → `new Ctor(0)`）必守四條件**：
   - `Three.js r160` 確實支援 `BufferAttribute.prototype.onUploadCallback`，但不可全域套用：
     1. **必須先呼叫 `geo.computeBoundingSphere()` 再釋放**：[ShadowFix.js](../src/graphics/ShadowFix.js#L26) 每秒會掃描一次場景，若 `!g.boundingSphere` 就會重算並讀到長度 `0` 的 `position.array`，導致半徑變成 `0`、整棟建築陰影被剔除！
     2. **只採顯式白名單 `markStaticGeometry(geo)`**：僅限 `MapBuilder`、`Kit.finish()`、`finishRow()` 產出的純靜態建築／地面幾何；嚴禁套用到動態粒子（如 [MapBuilder.js#L6525](../src/world/MapBuilder.js#L6525) 噴水池）或執行期會讀取 `attributes.position.array` 的車輛 LOD 烘培（[Vehicles.js#L2318](../src/entities/Vehicles.js#L2318)）與 `SkinnedMesh`。
     3. **保留 `attr.count` 不變**：只將 `attr.array = new attr.array.constructor(0)`，切勿改動 `attr.count`，且覆寫 `needsUpdate` setter 防止誤將 0-byte 陣列重新上傳。
     4. **搭配 `webglcontextlost` 安全降階重載**：CPU 陣列一旦清空，發生 Context Lost 無法原地復原，必須由 `BootDiag` 標記 `safeMode` 觸發低記憶體重載。
4. **⚠️ `Three.js r160` 無 `tex.source.dataReady`，分帶 `texSubImage2D` 須用 `DataTexture(null, W, H)`**：
   - `tex.source.dataReady` 是在較新版 Three.js 才加入的旗標；在 `r160` 做分帶上傳須改用 `new THREE.DataTexture(null, W, H)` 先呼叫 `renderer.initTexture(tex)` 配置空 VRAM 紋理，再透過 `renderer.properties.get(tex).__webglTexture` 逐幀執行 `gl.texSubImage2D()`，最後一帶才呼叫 `gl.generateMipmap(gl.TEXTURE_2D)`。
   - 若未來有功能需把 Canvas 繪圖移入 Web Worker，**必須包裝 `IdleWorker`（閒置 10 秒自動 `terminate()`）**，且在 Worker 初始化時先以 64×64 畫布測試 CJK 中文字體像素差分（iOS Safari / `WKWebView` 部分版本 Worker 內無中文字體，測不到就退回主執行緒）。

---

## 踩雷 #10：Phase 1A 實作與量測時踩到的五件事（2026-11-25）

1. **畫布放掉後，`profile_scene` 的「貼圖估算」會少算**：舊算法用 `texture.image` 的寬高，畫布上傳後縮成 1×1 就算成 0，但 GPU 上仍是原尺寸。`GpuMemLifecycle.uploadAndRelease()` 現在把上傳時的尺寸記在 `texture.userData.gpuW/gpuH`，`tools/perf/page-hook.js` 優先用它。
2. **自動化量測會讓 BootDiag 進安全模式**：載入到一半就換頁（重新整理、導到下一個網址），BootDiag 會把那次記成「沒跑完」，連兩次後下次啟動自動進安全模式（`texScale` 0.375），量到的數字就不是一般手機設定。量測腳本每次啟動前要清掉 `localStorage['yanlinGTA.bootDiag.v1']`，並加 `?safemode=0`。
3. **同一台機器上還有別的頁面在跑遊戲時，開機時間會被灌水**：無頭 Chrome 用 SwiftShader 軟體算圖，一個停在標題畫面的分頁就會吃滿 CPU，`profile:mobile` 的「啟動到標題」曾因此從 67 秒變成 107 秒。量開機時間前先關掉其他無頭 Chrome。
4. **縮小的畫布不能用 `g.canvas.width` 畫、不能 `getImageData`**：`scaledCanvas()` 讓 context 先縮放，所以 `draw(g, w, h)` 照原尺寸畫就對；用實際像素寬高畫會只畫到四分之一，`getImageData`/`putImageData` 不吃縮放（`Textures.js` 的法線圖因此不走 `scaledCanvas`）。
5. **規格說的「4 支模組頂層立即建畫布」量不到**：以建立當下的載入階段分類，所有畫布都在 `stage()` 開始之後才建立（`Dorms`、`Weiche`、`StreetDaren`、`d2/corners` 都是用到才建），這項不需要改。

---

## 踩雷 #11：Phase 1A 第二部分（共用貼圖釋放、靜態幾何）的四件事（2026-11-25）

1. **進標題那一刻就會同步畫一幀**：`GameLoop.start()` 會立刻跑一次迴圈，鏡頭看得到的靜態網格在這一幀就上傳並丟掉 CPU 陣列（`markStaticGeometry`）。自動化工具若要用網格的頂點算鏡頭位置，必須在基準版（或第一幀之前）算好再沿用。
2. **內顯檔位的圖集高度上限 2048 會多出繪圖呼叫**：`desktop-igpu` 的 `atlasMaxH = 2048`（PerfProfile），同一條街的招牌被拆到更多張圖集。91 個機位合計 `drawElements` 75355 → 78469（約 +4%，每個機位約 +34）。若要省回來，可把內顯的 `atlasMaxH` 改成 3072（存放 1536 寬，仍在 2048 以內）。
3. **量 JS heap 要用精確模式＋強制 GC＋每次新開瀏覽器**：Chrome 預設的 `performance.memory` 是分級的粗略值，多個頁面共用同一個瀏覽器時數字會亂跳（同一個 build 量到 463 與 865 MB）。加 `--enable-precise-memory-info --js-flags=--expose-gc`，量之前 `gc()` 兩次，每個 build 開新的使用者資料夾。
4. **主幹原本就有 49 則 `THREE.Material: parameter 'color' has value of undefined` 警告**：進遊戲後走動就會出現，main 與本分支次數相同，與效能重構無關；查警告時先扣掉這些。

---

## 踩雷 #12：Phase 2 地面挖洞改 CPU 的三件事（2026-11-26）

1. **規格的「1 m 子網格切洞」放在畫面上會破圖**：照 `PhysWorld` 的做法（10 m 格子細分 1 m、子三角形中心在洞裡就丟掉），洞口邊緣變成 1 m 一階的鋸齒；地面被多切掉的地方，岸邊與擋土牆只做到原本的洞口邊線，中間直接看到天空（白色三角缺口），沒切到的地方草地會蓋到欄杆和水面上。貼地圖層的三角形常有幾十公尺大，也不能「整個三角形在洞裡才丟」。**使用者看過截圖後選擇精準切**：`GroundCut.js` 沿洞的每條邊線切開三角形，再依每塊的中心點判斷要不要留，畫面與原本的 `discard` 相同（`desktop-dgpu` low 95 個機位 91 個逐像素相同，其餘 4 張空拍只差 11–46 個像素，都在洞口邊線上）。碰撞地形（`PhysWorld`）維持 1 m 子網格，跟以前一樣。
2. **`profile_scene` 的 JS heap 沒先 GC**：同一個比較裡 main 353.5 MB、本分支 403.4 MB（+14%），但用踩雷 #11 第 3 點的方法（強制 GC 兩次）量是 368 / 368 MB，多出來的只是切洞時的暫存陣列還沒回收。heap 有差異時先用強制 GC 的方式重量再下結論。
3. **在開發伺服器上用腳本 `import('/src/...')` 會多出「Multiple instances of Three.js being imported」警告**：截圖腳本為了取得地形高度、坑洞清單而在頁面裡匯入原始碼模組，同一個分頁之後的遊玩檢查就會出現這則警告；正式 build（`vite preview`）上沒有。查警告時用正式 build，或每次換新的瀏覽器資料夾。

---

## 踩雷 #13：Phase 2 PR #6 的五件事（2026-11-26）

1. **陰影改成隔幀更新後，自己呼叫 `renderer.render()` 的地方要注意 `needsUpdate`**：`shadowMap.autoUpdate = false` 時，那一幀第一個 `render()` 會把 `needsUpdate` 用掉。後照鏡（`FirstPerson.renderMirrors`）在主畫面之前畫，而且畫的時候藏起車艙，會拿走那一幀的陰影更新、陰影裡少了車艙，所以要先存起來、畫完再還原。自動化截圖腳本沒有遊戲迴圈，要自己在每次截圖前設 `needsUpdate = true`，否則會看到別的位置留下的舊陰影（空拍出現大片暗塊）。
2. **`finishRow` 的「純色」判斷不能直接套到 `Kit.finish()`**：ZoneA/B/C/E 的 `glowMats` 白天 `emissiveIntensity` 是 0、晚上才調亮，`plainKey()` 會把它們當純色烘進頂點色，晚上就不亮了。`Kit.finish()` 改用 `strictPlainKey()`（發光顏色必須是黑、沒有 `userData.glow`／`dynamic`）。
3. **`Kit.finish()` 合併平面之後，原本的 mesh 已經不在場景裡**：之後才改它的貼圖、亮度、位置或顯示都不會生效。會改的平面要在建好後設 `mesh.userData.dynamic = true`（例如 `GateExtras` 的 `bd`、`fr`）。全專案搜尋過留下 `k.plane()` 回傳值的地方只有這兩個（`StreetTea` 的鐵網有 `alphaTest`，本來就不合併）；麥當勞、戈登肉鋪打烊時調暗的是 `finish` 之後走訪 `k.group` 找到的發光材質，合併後的 mesh 一樣找得到。
4. **校外遠距群組：距離剔除不能用「直線距離 < 某個比例的可視距離」**：three 的遠平面與 exp2 霧都依「畫面深度」計算，畫面邊緣的物體直線距離比深度遠，用 0.6 × 可視距離剔除時，低畫質空拍會少掉還看得清楚的遠方高樓；中畫質白天 900 m 處的霧也只有約 80%。現在只在「畫面上任何位置都被霧蓋住 97% 以上」才剔除，白天中畫質幾乎不會剔到（約 2 km，比遠平面還遠），黃昏、夜晚與低畫質霧比較濃時才有作用。外圍副本是另一組 mesh，同一格同時有校內與校外建築時會多畫一份，所以只收離校園 250 m 以上的建物（`lod` 也一樣），避免校園附近多出繪圖呼叫。
5. **`MeshLambertMaterial` 不吃 `scene.environment`**：本專案的戶外光有一大部分是天空 PMREM 的環境光，直接換 Lambert 會讓背光面變暗、玻璃全黑。Lambert 的著色器也沒有 `cube_uv_reflection_fragment`，要自己補 `#include` 與 `CUBEUV_TEXEL_WIDTH/HEIGHT/MAX_MIP`（算法同 `WebGLProgram.generateCubeUVSize`），並用共用 uniform 跟上 `SkySystem.bakeEnv()` 每次重烘出來的新貼圖。

