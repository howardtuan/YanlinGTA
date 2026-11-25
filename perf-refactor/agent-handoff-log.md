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

### Session #003｜2026-11-25｜負責階段：Phase 0 補強 ＋ Phase 1 部分（找出 iPhone 掛掉的位置、載入加速、畫布記憶體）
- **工作分支 / PR**：`fix/mobile-loading-memory`（基於 `main` `588e352`）
- **本輪已完成**：
  1. **開機追蹤 `?boottrace`**：新增 [`src/core/BootTrace.js`](../src/core/BootTrace.js) ＋ `vite.config.js` 的 `bootTracePlugin`。載入每一步（`buildWorld` 內 12 段、每個 zone、物理、NPC、shader 編譯、第一幀、開始遊戲）都用 `sendBeacon` 回報到 Mac 上 `npm run dev` 的終端機，附存活 `<canvas>` 張數與 MB。手機被系統殺掉重整後，終端機仍留著最後一步。用法見 [architecture.md 第四節 4](../docs/guide/architecture.md)。
  2. **載入畫面文字修正**：`Game.init()` 改成先 `setLoad()`，再等畫面真的畫完（`nextFrame` 改成 rAF 後再 `setTimeout`）。
  3. **林口體育館座椅恢復視錐剔除**（`Arena.js`）：校園裡每幀少畫約 46 萬個三角形（GPU 約少 4 ms）。
  4. **保留區判斷改用格子索引**（`Collision.js` 的 `inAnyPoly`，用在 `Furniture.js`、`MapBuilder.js`、`CollisionWorld.blocked`）：`buildWorld` 桌機 4.9 → 1.7 秒，iPhone 那段約 45 秒 → 約 3 秒。答案與 `polys.some(pointInPoly)` 相同，有單元測試，實測 127 萬點 0 不一致，世界 mesh 也逐一比對過。
  5. **畫布記憶體**（`Kit.js` 的 `configureTextures` / `releaseAtlasSources`）：
     - 街屋圖集一畫完就 `renderer.initTexture()` 上傳 GPU，再把畫布縮成 1×1。
     - 每蓋完一個 zone，就把已複製進圖集、場景沒人在用的子畫布縮掉，並從 `TEX` 移除。
     - 手機（`mobile-lite`）的 `ctex` 畫布和圖集用 `texScale` 0.5 倍存放。
     - 畫布高峰：桌機 1.96 → 0.46 GB、手機設定 1.83 → 0.32 GB。
- **實機與量化數據變化**：
  - **「卡在 2%」其實是「慢」**：舊版 `buildWorld` 整段同步執行、畫面不會更新。iPhone 14 Pro 上「路燈＋街道家具」那段要 27 秒、「樹」那段要 17 秒，看起來就像卡住。Phase 0 寫的「2% 對應 `cycu.json`／Rapier／renderer」不成立：那段實測只花 0.3 秒。
  - **iPhone 14 Pro（Safari，`?boottrace`）**：修完速度後約 10 秒建完世界、約 30 秒進到 shader 編譯完成。但仍會被系統殺掉重整，最常見的位置是 **shader 編譯完、畫第一幀時**（5 次中 3 次；第一幀會把全部模型與貼圖一次上傳）；另有 1 次死在 `world: buildings`（JS heap 高峰）。死時畫布只剩約 0.3 GB，**畫布已經不是主因**。（手機回報的 `screen` 是 414×896@3x，跟 14 Pro 的 393×852 對不上，原因不明。）
  - **桌機（headless Chrome，Apple M1 8 GB）**：自動畫質會在約 14 秒後從中降到低。中畫質約 16–20 fps（render CPU 約 34 ms、GPU 約 31 ms）。每幀 1,915 calls／429 萬三角形；陰影 pass 佔 534 calls／145 萬三角形（陰影範圍只有 ±85 m，被 138 個半徑超過 250 m 的巨型 mesh 拖進去）；300 m 外小物件佔 460 個 draw call；bloom 約 10 ms GPU、MSAA 約 5–7 ms。
- **驗證**：`npm run ci` 全綠（142 tests）。用原始版本 `588e352` 對照做了兩輪確定性逐像素比對（固定亂數、逐幀同步、凍結 CSS 動畫），涵蓋 96 個視角（15 條街屋、18 個室內、角色、車輛、演唱會、夜景）加遊玩流程（開車第一／第三人稱、手機 6 個 App、電腦、麻將）。
  - 桌機：113 張中 105 張完全相同，其餘最多 22/255（一張招牌文字邊緣）或 1–7/255。
  - 手機設定：差異只有貼圖變軟（縮小比對無缺件）。
  - 空白貼圖程式檢查：桌機與手機都是 0。
- **新發現的技術細節或踩雷**：
  - 約 20 處動態畫布貼圖之後還會重畫（例：`Sac.js` 門牌、`McKitchen.js` KVS、`Concert.js` 側螢幕、`Kit.js` 的 `TEX.screen`）。所以畫布只釋放「已複製進圖集、場景沒人用」的，不做全域「上傳後縮 1×1」。
  - 街屋／zone／Kit 的畫法都沒有 `Math.random`，被移出 `TEX` 的 key 再被要時重畫，像素完全一樣。但重畫會多建立 three.js 物件，而 three 的 UUID 會用到 `Math.random`。做固定亂數的畫面比對時，要把 UUID 的亂數另外分開，否則後面所有隨機內容都會位移（體育館地板斑點就是這樣）。
  - 圖集畫布縮掉後，WebGL context 還原時畫不回來，所以 `webglcontextrestored` 改成重新整理頁面（離開前自動存檔）。
  - `FirstPerson.js` 的 `WebGLRenderTarget` 第一次用到才配置；`localClippingEnabled` 對沒有 clipping plane 的材質沒有影響。Phase 1 這一項建議刪除。
- **下一棒確切待辦（Next Actionable Step）**：
  1. **iPhone 第一幀被殺**：把 GPU 上傳分散到載入過程（分批 `initTexture`、分批預先渲染幾何），模型上傳後釋放 CPU 端的 attribute 陣列（目前只有麻將用 Raycaster，要確認沒有其他地方讀）。
  2. **`world: buildings` 的 JS heap 高峰**：`MapBuilder` 的 `Geo` 改用成長式 `Float32Array` 累積頂點。
  3. **桌機畫質不變、效能要好（使用者要求）**：巨型 mesh 粗分塊（陰影 pass 受益最大）、遠處次像素小物件剔除、bloom 改省的寫法（逐像素比對確認外觀不變）。

---

### Session #002｜2026-11-24｜負責階段：Phase 0 實作（旗標解析與記憶體遙測）
- **工作分支 / PR**：`chore/perf-flags-and-metrics`（基於合併 PR #147 後之 `main` `7a00e81` 建立，目前本地已提交待量測補數據）
- **本輪已完成**：
  1. 完成規劃分支合併：`docs/perf-refactor-plan` 已透過 PR #147 合併至上游 `howardtuan/YanlinGTA` (`main`)，並已清理本地舊分支與同步最新 `main`。
  2. 新增 [`src/core/PerfProfile.js`](../src/core/PerfProfile.js)：實作 `TIERS`、`STREAMING_PROFILES`、`detectTier()` 與 `resolveRuntimeProfile()`，支援 `?tier=`、`?texscale=`、`?stream=` 實驗參數解析（預設不啟用串流，確保既有行為零改變，且於 GPU 探測後主動呼叫 `WEBGL_lose_context`）。
  3. 修改 [`src/core/Game.js`](../src/core/Game.js)：於 `init()` 掛載 `this.perfProfile = resolveRuntimeProfile(this.settings)`。
  4. 修改 [`src/core/GameLoop.js`](../src/core/GameLoop.js)：於 `?perf` HUD 新增 `紋理 {textures}  幾何 {geometries}  檔位 {tier}` 遙測列。
  5. 新增單元測試 [`tests/unit/perf-profile.test.js`](../tests/unit/perf-profile.test.js) 並更新狀態看板；本地 `npm run format && npm run ci` 全數通過。
- **實機與量化數據變化**（2026-11-24 實測，`chore/perf-flags-and-metrics` `9daa340`）：
  - **iPhone 17 Pro Max（iOS Safari）**：❌ 載入失敗，持續卡在「載入地圖資料 2%」停滯後觸發頁面自動重整循環，無法進入標題頁（Web Inspector 未能掛載，Console/Canvases/Memory/Call Trees 未取得）。
  - **MacBook Pro Apple M1 Pro（`desktop-igpu` 對照組，`medium` 畫質、WASM 開）**：
    - 標題頁：`65 fps` (`15.3 ms`)｜Draw Calls `1,763`（峰值 `1,774`）｜Triangles `4,590k`（峰值 `4,638k`）｜Textures `432`｜Geometries `1,963`｜物理 `0 剛體 2,557 碰撞體`
    - 進校園（懷恩樓前靜止）：`50 fps` (`20.0 ms`)｜Draw Calls `1,729`｜Triangles `4,240k`｜Textures `659`｜Geometries `2,747`｜物理 `2 剛體 2,559 碰撞體`
- **新發現的技術細節或踩雷**：
  - 上游 `main` 在規劃合併期間新增了 Mahjong 音效與 `Kit.js` 等內容，`Game.js` 亦小幅調整；Phase 0 因僅於 `loadSettings()` 後掛載 `this.perfProfile`，完全零衝突並存。
  - M1 Pro 單幀已高達 **1,729 Draw Calls / 424 萬三角形 / 659 張紋理 / 2,747 個幾何體**，連 M1 Pro 在懷恩樓前靜止都掉到 `50 fps`，直接印證 Phase 1（釋放 Canvas 與圖集降維）與 Phase 2/3（空間串流與視錐體分塊剔除）的必要性。
  - iPhone 17 Pro Max 在 **2%（「載入地圖資料」）** 即重整循環，Phase 1 開工時需優先定位 `Game.js#L124-L311`（`cycu.json` + Rapier WASM + `WebGLRenderer`/`PostFX`）與後續貼圖建置的實際崩潰點。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 確認本 PR（`chore/perf-flags-and-metrics`）合併進 `main` 後，從最新 `main` 切出 `refactor/phase1-ios-memory-rescue` 展開 **[Phase 1 規格書](specs/phase-1-ios-memory-rescue.md)**。

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
