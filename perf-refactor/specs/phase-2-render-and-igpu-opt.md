# Phase 2 規格書：渲染空間分塊、去 `discard` 與 `Kit.finish` 平面合批 (`phase-2-render-and-igpu-opt.md`)

## 一、 階段目的（Why）
將原本排在後段的渲染優化提前為 Phase 2。理由很直接：Phase 0 在 Apple M1 Pro 實測顯示主場景即高達 **`1,729` Draw Calls、`424 萬` 三角形、`50 fps` (`20.0 ms`)**，而這些瓶頸完全可以在**不拆動內容組街區檔案、零 Merge Conflict 風險**的前提下，透過純渲染管線改造一次解決，讓：
- **新世代內顯 / Apple M 系列（1080p）**穩定跑上 **`55–60 FPS`**；
- **舊款入門文書內顯（Intel UHD 等，`low` 檔位）**穩定 **`>= 45 FPS`**；
- **iPhone 手機端**同步大幅降低 GPU 頂點、Fill-rate 與 Draw Call 負擔，向 `45–60 FPS` 邁進。

---

## 二、 變更範圍（Scope & Touchpoints）

| 檔案 | 變更性質 | 具體改造內容 |
| :--- | :--- | :--- |
| [src/world/MapBuilder.js](../../src/world/MapBuilder.js) | **修改** | 1) `Geo` 改為 `120m × 120m` `ChunkedGeo` 空間分塊輸出（恢復視錐體與陰影剔除）；2) CPU 預切地形與鋪面洞口，徹底移除 `cutMask()` Fragment Shader `discard`（恢復硬體 Early-Z）；3) `synthetic` 校外補建樓獨立遠距群組。 |
| [src/world/Kit.js](../../src/world/Kit.js) | **修改** | **強化 `Kit.finish()`**：為全專案 26 處呼叫 `Kit.finish()` 的建物補上靜態 `k.plane()` 打包進 Atlas ＋ 純色材質頂點色合批（比照 `finishRow()` 消除數百個散裝門牌/海報 Draw Calls）。 |
| [src/world/Interiors.js](../../src/world/Interiors.js) & 室內建築 | **修改** | 區分「結構外殼／樓板」與「高密度室內家具（桌椅、床組、電腦螢幕）」子群組，玩家在建築外且距離 `> 45m` 時自動設 `visible = false`。 |
| [src/ui/HUD.js](../../src/ui/HUD.js#L137-L269) | **修改** | 小地圖 `drawMinimap()` 改為位移 `> 0.35m`、轉角 `> 0.02 rad` 或 `> 50ms`（20Hz）節流重繪，省下每幀全圖 `drawImage` 縮放開銷。 |
| [src/core/GameLoop.js](../../src/core/GameLoop.js#L20-L152) & [PostFX.js](../../src/graphics/PostFX.js) | **修改** | 重校 `guessGpu()`（區分 M 系列/新內顯 vs 舊款 UHD 文書機）與縮短 `autoQuality()` 反應至 `3s + 3s`；支援「無 MSAA 輕量後製」或 `desktop-igpu` 預設關閉重型 `HalfFloat` MSAA + `UnrealBloomPass`。 |

---

## 三、 詳細技術規格（Technical Spec）

### 1. `MapBuilder.js` `120m × 120m` `ChunkedGeo` 空間分塊（大砍 60%+ 三角形）
現況中 `MapBuilder.js` 把全地圖 1.8 km 範圍的道路與 3,279 棟建物合併成極少數巨型 Mesh，導致視錐體剔除與 Shadow Map 剔除完全失效：
- **實作 `ChunkedGeo(chunkSize = 120, ...)`**：
  - 維持與現有 `Geo` 完全相同的 `tri()`、`quad()`、`fpoly()`、`flatPoly()`、`strip()`、`box()` 呼叫介面。
  - **PRNG 不變性保證（關鍵）**：`MapBuilder` 的亂數抽樣發生在建物／道路迴圈計算屬性階段；`ChunkedGeo` 只在最後寫入三角形頂點時，依三角形質心 `(cx, cz)` 分桶至 `(Math.floor(cx / 120), Math.floor(cz / 120))` 的子 `Geo`。因此視覺外觀與抽樣結果 **100% 不變**。
  - 每個非空網格產出獨立 `THREE.Mesh` 並呼叫 `computeBoundingSphere()` + `freezeStatic()`。畫面外與背後 **70%～80%** 的建築三角形與陰影投射將直接被視錐體剔除丟棄。
- **`synthetic` 遠區建築獨立群組**：`data/cycu.json` 中標記 `synthetic: true` 且位於校外遠端（或 `lod: true`）之建物歸入可依視距開關的 `outerChunks`，配合 `P.far` 做距離剔除。

### 2. CPU 地形切洞取代 `cutMask()` Shader `discard`（恢復硬體 Early-Z）
現況 [MapBuilder.js](../../src/world/MapBuilder.js#L787-L805) 透過 `cutMask()` 將地下道 `LV_CUT`、下沉坑洞 `pitRects()` 與水池 `sinkPlan()` 轉為數十條 GLSL `if (...) discard;` 注入地面與鋪面材質，迫使 Apple TBDR 與 Intel/AMD GPU 停用硬體 Early-Z 深度測試：
- **解法**：比照 [PhysWorld.js](../../src/physics/PhysWorld.js#L134-L199) 已經實作並驗證過的切洞演算法：
  1. 在 `groundGeometry()` 建立格點時，對 `LV_CUT` 與 `sinkPlan()` 影響到的 10m 網格單元細分為 1m 子網格，直接跳過落入洞口內的子三角形；
  2. 對鋪面與草地 `drape` 幾何在 `Geo` 層過濾落入切洞區的多邊形三角形；
  3. **徹底移除 `cutMask()` 動態 Shader 注入**（連帶消除大量 `onBeforeCompile` 著色器編譯卡頓）。

### 3. `Kit.finish()` 靜態平面圖集化＋純色頂點合批（真正大幅砍掉 Draw Calls）
- 26 處呼叫 `Kit.finish()` 的建物（資管系館、力行、學活、麥當勞、ZoneA～H 等）包含數百張獨立 `k.plane()` 門牌、窗戶與海報，是目前 M1 Pro 高達 **1,729 Draw Calls** 的主因之一。
- **解法**：
  - 將 `finishRow()` 已驗證成功的兩大合批技術下放共享給 `Kit.finish()`：
    1. **純色材質合併**：不帶貼圖、不透明、無發光的靜態部件（`plainKey(mat)`），寫入頂點色屬性後合併為單一 `row:painted` Mesh；
    2. **靜態 `k.plane()` 打包進 Atlas**：凡符合 `atlasable(m)`（未改動 UV repeat/offset、無動態更新標記且無子物件）的平面，打包進該建築（或共享區）的紋理圖集並合併為少數幾個 Mesh（按透明/發光/雙面分組），並透過 Phase 1 `GpuMemLifecycle` 釋放原始畫布。
  - **保護例外**：明確設有 `m.userData.dynamic === true`（例如 `T.screen()` 待壁紙更新或可動部件）或 `k.group` 內含動畫群組（例如資管系館電梯 `cab`、警衛室柵欄）維持獨立 Mesh，功能 100% 不受影響。

### 4. 室內家具距離剔除與小地圖節流
- **室內家具子群組（`Kit.furnitureGroup` 或建築群組分離）**：將 `IM`（101/301 電腦教室百台螢幕桌椅）、`Sac`（培英廳 425 張座椅）、`Lixing`（寢室床組書桌）等高密度小物件拆入 `furnitureGroup`，當玩家在該建築外圍且距離 `> 45m` 時設 `visible = false`（近距離或進門瞬間秒開）。
- **小地圖節流（`HUD.js`）**：僅在玩家座標變化 `> 0.35m`、相機偏航 `> 0.02 rad`、或距上次繪製 `> 50ms` 時重繪 `minimap`。

### 5. 材質降階 (`MeshLambertMaterial`)、渲染排序、隔幀陰影與零相依 `PostFX` 瘦身
- **`low` / `xlow` 畫質切換 `MeshLambertMaterial` ＋ 跳過法線/RM 紋理**：
  - 在 `low` / `xlow`（包含手機預設與舊款 Intel UHD 文書機）下，[MapBuilder.js](../../src/world/MapBuilder.js) 的建築外牆與地面材質改用 **`MeshLambertMaterial`**（已確認 `Three.js r160` 之 `MeshLambertMaterial` 原生相容 `emissiveMap` 與 `facadeParam` 的 `#include <color_fragment>` 著色器注入），並且**直接跳過 `normalFromHeight()` 與 `rm`（粗糙/金屬度）貼圖生成**，同時省下片元著色運算、起動 CPU 耗時與 50% 建築貼圖 VRAM。
- **自訂 `opaqueSort`（依 `program.id` 排序）＋ 30Hz 隔幀陰影**：
  - 透過 `renderer.setOpaqueSort(...)` 優先依 `material` 編譯後 Program ID 排序再由前到後繪製，顯著降低 WebGL Shader Program 切換次數。
  - 在中低階 GPU 或負載較高時啟用 `shadowMap.autoUpdate = false` 並每 2 幀更新一次陰影（對建築與太陽緩慢移動幾乎無感，直接減半 Shadow Pass 開銷）。**（注意：`Three.js r160` 採 `RGBADepthPacking` 四通道，嚴禁套用單通道 `slimShadowMaps`！）**
- **`guessGpu()`、`lampLights` 與零相依 `PostFX.js` 瘦身**：
  - `desktop-igpu` 下將 `MapBuilder` 夜間池化 `PointLight` 由 `4` 盞調降至 `0` 或 `2` 盞；
  - 保留單一 runtime 相依性（不引入 `pmndrs/postprocessing`），直接改造 [PostFX.js](../../src/graphics/PostFX.js) 為**動態 `import()` 延遲載入**（`low` 連 1 條指令都不載入），並在 `medium` 設 `samples: 0`（關閉高頻寬 MSAA Resolve）、將 `UnrealBloomPass` 尺寸降至 `1/4` 解析度（`w/4, h/4`）、合併 `OutputPass` 與 `GradeShader`。
  - 縮短 `autoQuality()` 暖機至 `3000ms`、取樣視窗至 `3000ms`（開局 6 秒內自動降階）。

---

## 四、 PR 切分與驗收標準

- **PR #5 (`refactor/mapbuilder-chunking`)**：`MapBuilder.js` `ChunkedGeo(120)` 空間分塊 ＋ CPU 預切洞移除 `cutMask()` `discard`（嚴格驗證 PRNG 樹/燈位置不變、地下道與噴水池洞口與 `PhysWorld` 100% 密合）。
- **PR #6 (`refactor/kit-plane-batch-and-igpu`)**：`Kit.finish()` 平面圖集與純色合批、室內家具距離顯隱、`HUD.js` 小地圖節流、`guessGpu()` / `autoQuality()` / `PostFX.js` 重校。

### 驗收標準
1. `npm run ci` 全綠，`tools/e2e/story-bot.mjs` 完整跑通，且截圖目視檢查地下道、噴水池、資管系館、中北路與力行宿舍零破洞、無消失招牌。
2. `node tools/profile_scene.mjs --play` ＋實機 `?perf` 驗證：
   - 懷恩樓前主場景單幀三角形數較 Phase 0 基線（`4,240k`）**下降 `60%` 以上**，Draw Calls 顯著下降；
   - **Apple M 系列 / 新世代內顯（1080p）穩跑 `55–60 FPS`**；
   - **舊款 Intel UHD 等文書內顯（`low`）穩跑 `>= 45 FPS`**；
   - **iPhone 17 Pro Max Safari 目標 `45–60 FPS`（LINE / IG `WKWebView` `>= 30 FPS`）**。
