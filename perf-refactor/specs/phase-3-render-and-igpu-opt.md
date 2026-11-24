# Phase 3 規格書：渲染空間分塊與電腦無獨顯 60 FPS 優化 (`phase-3-render-and-igpu-opt.md`)

## 一、 階段目的（Why）
徹底解決**無獨立顯示卡電腦（Intel UHD / Iris Xe、AMD 內顯、Apple M 系列無風扇筆電）**與中階手機的渲染卡頓問題。核心理念是把 GPU 每幀必須處理的頂點數、Draw Calls、像素覆蓋率（Fill-rate）與無效陰影降到最低，同時消除 CPU 主執行緒的固定浪費。

---

## 二、 變更範圍（Scope & Touchpoints）

| 檔案 | 變更內容 | 預期效益 |
| :--- | :--- | :--- |
| [src/world/MapBuilder.js](../../src/world/MapBuilder.js) | **修改** | 1) 建物/道路/鋪面改為 `120m × 120m` 空間分塊輸出；2) 移除地板材質 `cutMask()` 的 `discard` Shader；3) 遠端補建樓低模化與遠距剔除。 |
| [src/world/Interiors.js](../../src/world/Interiors.js) & 各室內建築 | **修改** | 補齊「室內家具層」距離顯隱開關（戶外遠距時隱藏教室桌椅、寢室床組等高密度小物件）。 |
| [src/ui/HUD.js](../../src/ui/HUD.js#L137-L269) | **修改** | 小地圖 `drawMinimap()` 改為位移/轉角變化或 20Hz 節流繪製，減少每幀 2D Canvas `drawImage` 整圖縮放開銷。 |
| [src/core/GameLoop.js](../../src/core/GameLoop.js#L29-L152) | **修改** | 重校 `guessGpu()`（針對高 DPR 無風扇內顯保守設為 `low` 或關閉 `PostFX`）與縮短 `autoQuality()` 反應時間。 |
| [src/graphics/PostFX.js](../../src/graphics/PostFX.js) | **修改** | 提供「無 MSAA 輕量後製」選項或僅在 `high` 啟用 `HalfFloat` MSAA + `UnrealBloomPass`。 |

---

## 三、 詳細技術規格（Technical Spec）

### 1. `MapBuilder.js` 基地地圖 `120m × 120m` 空間分塊（恢復 Frustum Culling）
目前 `MapBuilder.js` 使用單一 `Geo` 累加器把全地圖 1.8 公里範圍的道路與 3,200+ 棟建築合併成少數幾個超級 Mesh，導致視錐體剔除（Frustum Culling）與陰影圖剔除完全失效：
- **實作 `ChunkedGeo(chunkSize = 120, ...)`**：
  - 維持與現有 `Geo` 完全相同的 `tri()`, `quad()`, `fpoly()`, `flatPoly()`, `strip()`, `box()` API。
  - 在寫入三角形時，依照三角形質心 `(cx, cz)` 分派至對應網格 `(Math.floor(cx / 120), Math.floor(cz / 120))` 的子緩衝區。
  - **PRNG 不變性保證（關鍵）**：`MapBuilder` 的亂數抽樣發生在建物/道路迴圈計算屬性階段；`ChunkedGeo` 只在最後幾何頂點收集階段按座標分桶，因此**抽樣結果 100% 與原本相同**。
  - 最終每個非空網格產生獨立 `THREE.Mesh` 并呼叫 `computeBoundingSphere()` + `freezeStatic()`。雖然 Draw Calls 會由 ~15 個合理上升至視錐內的 ~40–80 個（對現代 WebGL 極為輕鬆），但**畫面外與背後 70%～80% 的建築與陰影三角形將被 GPU 視錐體剔除直接丟棄**。
- **補建樓遠距切換（LOD）**：`data/cycu.json` 中標記 `synthetic: true` 且位於校外遠區的建物，額外歸入獨立的 `outerBuildings` 群組，在 `mobile-lite` 與 `desktop-igpu` 下依 `P.far` 縮短可視距離。

### 2. 移除地板 `cutMask()` Fragment Shader `discard`（恢復硬體 Early-Z）
目前 [MapBuilder.js](../../src/world/MapBuilder.js#L787-L805) 透過 `cutMask()` 注入數十條 `if (...) discard;` 進地面與鋪面的 Fragment Shader，用來挖空地下道與水池區域。在 WebGL 中，一旦 Shader 含有 `discard`，GPU 驅動程式會被迫停用 Early-Z 深度測試，導致所有被建築物遮擋的地板像素仍須完整跑完 PBR 光照運算：
- **解法**：比照 [PhysWorld.js](../../src/physics/PhysWorld.js#L159-L199) 已經實作的切洞邏輯，在 CPU 建置 `groundGeometry()` 與該區域鋪面多邊形時，直接跳過落入 `LV_CUT` 與 `sinkPlan` 區內的三角形（僅對與切洞邊界相交的 10m 網格單元做一次 1m 細分挖空），並徹底移除 `cutMask()` 動態 Shader 注入。
- 額外紅利：不再觸發動態 `onBeforeCompile` 變體編譯，減少手機與內顯載入卡頓。

### 3. 室內細部群組與小地圖節流
- **室內家具獨立群組**：在 `IM`（資管系館 101/301 幾十台電腦螢幕與桌椅）、`Sac`（培英廳 425 張椅子）、`Lixing`（276～281 寢床組）中，將「結構外殼／地板」與「高密度室內家具」分開；當玩家不在該建築周邊或室外距離 > 45m 時將室內家具 `visible = false`（比 Phase 2 整塊卸載更細一級的每幀渲染遮擋）。
- **小地圖繪製節流（`HUD.js`）**：目前 `drawMinimap()` 每幀都對整張超大 `mapCanvas` 執行 `rotate + scale + drawImage`。改為「玩家位置移動 > 0.35m 或視角旋轉 > 0.02 rad 或經過 > 50ms」才重繪小地圖 Canvas，估計可節省每幀 1.5～3 ms 主執行緒時間。

### 4. `guessGpu()`、`PostFX` 與 `autoQuality()` 重校準
- **精準識別內顯與無風扇筆電**：
  - 現況 `guessGpu()` 把 `apple m1/m2/...` 與部分中階核顯歸為 `strong`，預設跑 `medium`（開啟 `2048` 軟陰影 ＋ `HalfFloat` MSAA 2x `EffectComposer` ＋ `UnrealBloomPass` ＋ 4 盞 `PointLight`）。
  - 修正方案：區分 `desktop-igpu`（無獨顯與高分屏內顯，預設關閉 `PostFX` 後製與動態 `PointLight`，並將 `pr` 封頂於 `1.0`，陰影降為 `1024` 非軟陰影或預設 `low`）與 `desktop-dgpu`（真正獨顯如 RTX/GTX/RX）。
- **加速 `autoQuality()` 反應**：將暖機時間由 `8000ms` 縮短為 `3000ms`、統計視窗由 `6000ms` 縮短為 `3000ms`（卡頓 6 秒內即自動降階，不再讓使用者忍受 14 秒幻燈片）。
- **低品質植被**：確認 `low` / `xlow` 時樹葉使用 `MeshLambertMaterial` 且關閉 `alphaToCoverage`（避免在部分驅動造成 MSAA 降速）。

---

## 四、 PR 切分與驗收標準

- **PR #8 (`refactor/mapbuilder-chunking`)**：`ChunkedGeo` 120m 分塊 ＋ 移除 `cutMask()` `discard`（需確認視覺與 `PhysWorld` 洞口位置完全吻合，無破洞或閃爍）。
- **PR #9 (`refactor/igpu-culling-and-quality`)**：室內家具顯隱開關、`HUD` 小地圖節流、`guessGpu()` / `autoQuality()` 重校準。

### 驗收標準
1. `npm run ci` 全綠，`story-bot.mjs` 完整通關且截圖目視檢查地下道、噴水池、大草坪、資管系館外觀零破圖。
2. 開啟 `?perf` 觀察單幀三角形數與 Draw Calls：
   - 相比 Phase 0 基準，主場景單幀三角形數下降 **60% 以上**。
   - iPhone 17 Pro Max 與無獨顯環境穩定維持目標幀率（手機穩 30–60 FPS 不發燙降頻、電腦內顯目標 55–60 FPS）。
