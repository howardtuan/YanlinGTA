# 優化踩雷記憶庫 (`pitfalls-and-memory.md`)

> [!CAUTION]
> 本文件收錄在靜態剖析與專案設計核對中已確認的**致命技術地雷與架構紅線**。所有接手本計畫的 AI Agent 與開發者在改動對應檔案前，**必須先核對本清單**，嚴禁重蹈覆轍。

---

## 踩雷 #1：iOS WebKit `<canvas>` 總記憶體硬上限與 `CanvasTexture` 釋放陷阱

### 現象與根因
- **實機症狀**：連配備 12GB RAM 的 **iPhone 17 Pro Max** 在開啟專案時依然直接打不開（iOS Safari / IG / LINE `WKWebView` 白畫面、閃退重整或提示網頁發生問題）。
- **真正元兇**：iOS WebKit 對單一頁面中所有未釋放的 HTML `<canvas>` 2D 像素緩衝區設有**系統級總記憶體硬上限（約 256 MB ～ 384 MB）**，且一旦某個 `<canvas>` 曾經呼叫過 `getContext('2d')`，即使 JS 變數早已丟棄不再引用，WebKit 內部仍會緊抓 Backing Store 不放直到達上限；達上限後 `getContext('2d')` 會直接回傳 `null`，進而引發 `TypeError` 斷鏈或被 Jetsam 強制殺行程。
- **本專案的爆炸點**：
  1. `src/world/` 共有 **769 處** `sg()` / `ctex()` / `canvasTex()` / `tex()` 呼叫（全專案含角色與 UI 超過 **850 張 `<canvas>`**），且 [Kit.js](../src/world/Kit.js#L13-L24) 的 `ctex()` 把每張貼圖永久緩存在全域 `TEX[key]` 字典中。
  2. [Kit.js](../src/world/Kit.js#L713-L769) 的 `finishRow()` / `packAtlas()` 把整條街道的店招畫進多張 **`2048 × 4096` 超大圖集 `<canvas>`**（單張未壓縮 2D Buffer 就佔 33.5 MB，上傳 WebGL 含 Mipmap 再佔 ~45 MB），但打包後既沒有 `dispose()` 原始子貼圖，也沒有縮回任何 `<canvas>` 的尺寸。
  3. [Textures.js](../src/graphics/Textures.js#L382-L997) 的 `facade()` 與 `facadeParam()` 在啟動時同步生成多組 `1024 × 1024`（或更高）的四通道貼圖（Color + Emissive + RM + Normal）。

### ❌ 錯誤修法（千萬不要這樣寫）
```js
// ❌ 致命錯誤：Three.js 建構 CanvasTexture 時並未同步上傳到 GPU！
const tex = new THREE.CanvasTexture(cv);
cv.width = 1;
cv.height = 1; // 等到第一幀 renderer.render() 上傳紋理時，GPU 讀到的是 1x1 透明黑塊！
```

### ✅ 正確解法
1. **必須先強制同步上傳 GPU 再歸零 `<canvas>`**：呼叫 `renderer.initTexture(tex)`（或等待 `tex.onUpdate` 觸發一次之後），確認 WebGL `gl.texImage2D` 已經把像素拷貝進 VRAM，再執行：
   ```js
   cv.width = 1;
   cv.height = 1;
   cv.getContext('2d')?.clearRect(0, 0, 1, 1);
   ```
   > 實作後可用 **Mac Safari Web Inspector → Graphics → Canvases** 直接逐張確認每個 Canvas 尺寸是否都已歸零至 `1×1`（4 Bytes）。
2. **離屏 `finishRow()` Atlas 的雙重回收**：`packAtlas()` 在將子貼圖畫入圖集 Canvas 並上傳 `sheet.tex` 後，若該子 `CanvasTexture` 僅供一次性圖集打包使用，應立即呼叫 `subTex.dispose()` 並將子 `<canvas>` 與圖集 `<canvas>` 一併縮回 `1×1`。
3. **保護 `getContext('2d') === null`**：任何工具函式（如 `ctex`、`canvasTex`）在極端記憶體壓力下取得 `null` 時，必須安全退回共用 `1×1` 預設貼圖而非直接呼叫 `g.fillRect()` 拋出例外。
4. **注意 `webglcontextlost`**：一旦釋放了 2D `<canvas>`，如果遇到背景切回造成 WebGL Context Lost，原本留在 `<canvas>` 上的像素已經沒了；因此對應生成器必須保留輕量重繪閉包或靜態資源 URL，確保 Context Restored 時可重新生成。

---

## 踩雷 #2：NPC 與系統在 `Game.init()` 對 `game.interiors.*` 錨點的強耦合

### 現象與根因
在 [Game.js](../src/core/Game.js#L516-L539) 初始化各種劇情 NPC 與小遊戲時，大量模組會在建構期或第一幀 `update()` 直接讀取 `game.interiors` 下的座標、房號與床位 Spec：
- `Jianyu.js`、`Hank.js`、`Zz.js`、`DevNPC.js`（`Houshe`、`Richard`、`Howard`）、`PinHan.js`、`Ruizhe.js` → 讀取 `game.interiors.lixing.rooms[276..281]`、`lixing.k`、`lixing.B`
- `Mingshan.js`、`Hank.js`、`McShift.js`、`McKitchen.js` → 讀取 `game.interiors.mcd`（含 `kitchen`、`k`、`staff`、`entry`）
- `Garry.js` → 讀取 `game.interiors.garry` 與 `game.interiors.club.F3`
- `Zz.js`、`Gordon.js`、`TeaShop.js` → 讀取 `game.interiors.tea`、`game.interiors.gordon`
- `MissionSystem.js` → 讀取 `game.interiors.yh?.door`

### ❌ 錯誤修法
把整個 `buildLixing()` / `buildMcD()` / `buildGarryHome()` 延遲到玩家走近才執行，導致啟動時 `game.interiors.lixing === undefined`，所有 NPC 建構當場 Crash。

### ✅ 正確解法（錨點與幾何分離鐵律）
- 每個建築模組拆分為：
  1. **輕量同步 `spec / anchors`（< 50 KB 純數字座標）**：在啟動時立即建立並掛載於 `game.interiors.lixing`、`mcd`、`yh`、`garry`、`club`、`tea`、`gordon` 上（供所有 NPC、任務系統、小地圖尋路隨時讀取）。
  2. **重量級非同步 `mount(ctx)`**：只有 **3D `Mesh` 群組、貼圖圖集、室內家具裝飾與進門 E 鍵動作** 才由 `WorldStreamer` 依據玩家距離動態載入與卸載。

---

## 踩雷 #3：`Zones.js` 與 `MapBuilder.js` 的決定性共用亂數流（PRNG）

### 現象與根因
如 [Zones.js](../src/world/zones/Zones.js#L18-L19) 註解明確警告：`ZONES` 陣列的執行順序與內部亂數抽取次數，與全校樹種、灌木、路燈、冷氣位置共用決定性亂數流。
- 前置資料 Hooks（`drop`, `fix`, `add`, `look`, `footprints`, `terrain`, `trees`, `vegHide`, `treeHide`, `ownSign`）在 `buildWorld()` 之前依序執行。

### ✅ 鐵律
1. **前置資料 Hooks 絕不可動態跳過或打亂順序**：它們僅操作純 JS 座標陣列與 JSON 欄位（總記憶體 < 1 MB、耗時 < 3 ms），**必須維持原本 `ZONES` 陣列順序於啟動時同步執行完畢**。
2. **動態載入只針對「幾何與貼圖生成階段」（`build()` / `mount()`）**：只有 `MapBuilder` 已經生成基底世界之後的 3D 模型組裝與街屋 `finishRow()` 才做動態載入／卸載，就不會破壞任何種子與樹/路燈位置。
3. 若在 `MapBuilder.js` 內部進行幾何空間分塊（Phase 3），必須將「建物屬性與亂數抽樣」和「寫入各 Tile `BufferGeometry`」拆開，維持原本的迴圈抽樣順序，確保視覺外觀 100% 一致。

---

## 踩雷 #4：三大自動化單元測試門禁（CI Gatekeepers）

每次修改必須通過以下三個極為嚴格的結構測試（`npm test`）：
1. **[tests/unit/import-graph.test.js](../tests/unit/import-graph.test.js)**：
   - 嚴格執行 7 層單向無環檢查：
     - `physics` / `graphics` 不可依賴 `systems` / `ui`
     - `core` 不可依賴 `systems` / `ui`（僅 `core/Game.js`、`core/GameLoop.js`、`core/MenuManager.js` 在 `WIRING` 白名單內）
     - **`world` 嚴禁依賴 `entities`**
     - `systems` 不可依賴 `ui`
   - **開發約束**：新增在 `src/world/` 的 `WorldStreamer.js` **絕對不可以 `import` `src/entities/Player.js`**！玩家位置與速度必須由 `Game.js` / `GameLoop.js` 以純數值 `{ x, y, z, vx, vz }` 傳入 `world.update(...)`。
2. **[tests/unit/data-consistency.test.js](../tests/unit/data-consistency.test.js)**：
   - 直接載入 `ZONES` 驗證每個 Zone 有唯一非空 `name`，且已知 Hook 名稱型別必須為 `function`。為 `ZONES` 擴充 `bounds`、`stream` 等欄位時不要影響既有 Hook 簽名。
3. **[tests/unit/dom-ids.test.js](../tests/unit/dom-ids.test.js)**：
   - 以正則掃描 `src/` 中所有 `getElementById('x')` 與 `$('x')`，要求 `'x'` 必須存在於 `index.html` 或 `src/` 中的 `id="x"` / `.id = 'x'` 定義內。

---

## 踩雷 #5：已定位的 GPU 效能黑洞清單（Phase 1 & Phase 3 必清對象）

| 檔案位置 | 問題寫法 | 造成的實機危害 | 處置階段 |
| :--- | :--- | :--- | :--- |
| [Arena.js](../src/world/buildings/Arena.js#L725) & [#L820](../src/world/buildings/Arena.js#L820) | `A1.frustumCulled = A2.frustumCulled = false`、`sticks.frustumCulled = false` | 林口體育館遠在 `(3000, -3000)`，卻迫使 GPU 每幀白白渲染數千張看台座椅與螢光棒 | Phase 1 / Phase 2 |
| [FirstPerson.js](../src/entities/FirstPerson.js#L34) & [#L41](../src/entities/FirstPerson.js#L41) | 建構期即配置 `WebGLRenderTarget(480, 160)` 並開啟 `renderer.localClippingEnabled = true` | 無論玩家是否切第一人稱開車，全場景所有 PBR Shader 都被迫編譯並計算 Clipping Planes | Phase 1 |
| [MapBuilder.js](../src/world/MapBuilder.js#L740-L805) | `cutMask()` 在地面與鋪面 Fragment Shader 注入數十條 `discard` 條件 | 關閉 Intel/AMD 內顯與 Apple TBDR GPU 的硬體 Early-Z 最佳化，造成嚴重 Fill-rate 卡頓 | Phase 3 |
| [AudioSystem.js](../src/systems/AudioSystem.js#L57-L59) | 建構時 `new window.Audio('assets/music/yanlin-opera.m4a')` 並設 `preload = 'auto'` | 啟動階段立即搶佔頻寬與行動裝置音訊解碼緩衝區（3.0 MB） | Phase 1 |
| [GameLoop.js](../src/core/GameLoop.js#L48-L53) & [#L112-L137](../src/core/GameLoop.js#L112-L137) | Apple M1/M2 等級列為 `strong` 預設 `medium`（2048 陰影 + MSAA + Bloom）；`autoQuality` 須卡頓 14 秒才降頻 | 無風扇筆電或高解析內顯剛進遊戲就先卡 14 秒且無法及時關閉 PostFX | Phase 3 |
| [PostFX.js](../src/graphics/PostFX.js#L56-L69) | `HalfFloatType` + MSAA 2x/4x + `UnrealBloomPass` + `OutputPass` + `GradeShader` | 對行動端與低規內顯頻寬極度沉重 | Phase 1 / Phase 3 |

---

## 踩雷 #6：Web Worker / CDN 外部資源與線下建置環境限制

- `src/systems/minigames/Learn.js` 的 Pyodide 與 `sql.js` 預設從外部 CDN 載入且只在使用者打開電腦桌面「資管學堂」／「終端機 `case`」時才觸發，手機端第一層漏斗**不要**在背景預載這兩者，以免白白消耗手機數十 MB 記憶體。
- 若在無網路 Sandbox 執行 `npm run ci` 需注意本機是否有 `node_modules/`；如無則應回報實際狀態並依環境條件驗證。
