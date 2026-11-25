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
- **實機與量化數據變化**（`profile_scene.mjs` / Mac Web Inspector / iPhone `?diag=1` & `?perf`）：
  - 載入結果：...
  - Memory / Canvases / Texture / Draw Calls / Tris / FPS：...
- **新發現的技術細節或踩雷**：
  - （同步補進 `pitfalls-and-memory.md`）
- **下一棒確切待辦（Next Actionable Step）**：
  1. ...
```

---

### Session #006｜2026-11-25｜負責階段：Phase 0 合併收尾（接手 hank1224）
- **工作分支 / PR**：`chore/merge-perf-phase0`（把 `chore/perf-flags-and-metrics`，含 `docs/revise-perf-refactor-plan`，合併回 `main` @ #161）
- **本輪已完成**：
  1. **以本規劃為準，拿掉 #156 的內容**（`?boottrace` 開機追蹤、`nextFrame` 調整、`Kit.configureTextures` / `releaseAtlasSources` 手機畫布縮放與釋放、保留區格子索引、林口體育館座椅剔除）：#156 改過的 16 個檔案回到 #155 合併時的內容。對應工作改由 Phase 0 `BootDiag` / `stage()`、Phase 1A 畫布生命週期、Phase 1B `Arena.js` 剔除處理。#157、#159、#160、#161（麻將）未受影響。
  2. **合併本分支**：分支建在 #153 之前，#153 已用 `src/core/PerfHud.js`（設定 → 效能顯示，四段式）取代 `GameLoop.perfOverlay()`。衝突處理保留 `PerfHud`、不帶回舊浮層；`[SAFE]` 標記改掛在 `PerfHud` 開發者層級的「檔位」後面；`?perf` 會直接開 `PerfHud` 的開發者層級。其餘 25 個檔案與分支一字不差。
  3. **`nextFrame()` 改為 `requestAnimationFrame(() => setTimeout(r, 0))`**：原本只等 rAF，`stage()` 寫好的文字仍要等下一段同步建置跑完才畫得出來（見 [pitfalls-and-memory.md](pitfalls-and-memory.md) 踩雷 #2 補充）。
- **實機與量化數據變化**（`npm run profile:mobile`，Apple M1 本機 Chrome，SwiftShader 軟體渲染，`mobile-lite` / `low`，3 次取中位數；幀時間僅供相對比較）：

  | 記憶體 / 啟動 | 值 |
  | :--- | :--- |
  | Canvas | **1748.43 MB**（3133 個，DOM 內 3） |
  | 貼圖估算（GPU，含 mip） | 1640.24 MB（763 張） |
  | JS heap | 437.64 MB |
  | 啟動到標題 | 70694 ms（範圍 68401–73859，軟體渲染） |
  | 載入資源 | 32 個 / 11683 KB |

  | 機位 | Calls | Tris | Tex | Geo |
  | :--- | ---: | ---: | ---: | ---: |
  | title-orbit | 700 | 2018k | 240 | 766 |
  | 鐘塔 | 399 | 1905k | 414 | 1202 |
  | 張靜愚紀念圖書館 | 262 | 1574k | 469 | 1403 |
  | 學生活動中心 | 418 | 1739k | 486 | 1441 |
  | 中原大學體育館 | 209 | 1532k | 488 | 1441 |
  | 真知教學大樓 | 348 | 1698k | 534 | 1687 |

  - 最大宗 canvas：`2048x4096 × 28 = 896 MB`（街屋圖集）、`2048x2048 × 5 = 80 MB`、`256x192 × 334 = 62.63 MB`、`512x512 × 45 = 45 MB`、`1024x192 × 43 = 32.25 MB`。
  - 距離 Phase 1 門禁（`peakBackingStoreMB <= 220`）約差 8 倍。
- **新發現的技術細節或踩雷**：
  - `nextFrame()` 只等 rAF 不會讓畫面先繪製（已補進踩雷 #2）。
  - `applySafeMode()` 設的 `texScale <= 0.375` 與 `atlasMaxW/H = 1024` 目前**沒有任何貼圖程式讀取**，安全模式實際只有「`auto` 畫質鎖 `low`」，而手機本來就是 `low`。Phase 1A 必須把 `Kit.js` / `Textures.js` 接上這兩個值，安全模式才有實際效果。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 從最新 `main` 切出 `fix/ios-canvas-lifecycle`，依 [Phase 1 規格書](specs/phase-1-ios-memory-rescue.md) 實作 Phase 1A；第一優先是 28 張 `2048x4096` 街屋圖集（896 MB）與 `texScale` / `atlasMaxW/H` 接線，每步以 `npm run profile:mobile -- --assert-ios-budget` 對照本筆基線。
  2. Phase 1B（`fix/ios-lazy-noncore-assets`）補回 `Arena.js` 座椅 `frustumCulled`（人在校園時每幀多畫 4 km 外約 46 萬三角形，M1 GPU 約 4 ms）。

---

### Session #005｜2026-11-25｜負責階段：吸收《臺北狂飆》實證優化 ＋ 免插線手機驗證與 Phase 0 自癒落實
- **工作分支 / PR**：`chore/perf-flags-and-metrics`（已合併 `docs/revise-perf-refactor-plan`）
- **本輪已完成**：
  1. 逐項比對《臺北狂飆》（Three.js `r186`）與 `YanlinGTA`（`Three.js r160`）實際原始碼，完成技術篩選並回寫 `perf-refactor/`：
     - **納入**：`BootDiag` 玩家端無感自動降階 `safeMode`（Phase 0）；靜態幾何 `onUploadCallback` 清空 CPU `TypedArray` + `ImageBitmap.close()` + `WebGLRenderer({ alpha: false, stencil: false })` + 條件式 `gcNudge`（Phase 1）；`low` 切換 `MeshLambertMaterial` 跳過法線/RM 貼圖 + `opaqueSort` + 30Hz 隔幀陰影 + 零相依 `PostFX` 瘦身（Phase 2）；`r160` 相容分帶 `texSubImage2D` + `pinPrograms()` + 分批 `dispose` + `MessageChannel` 幀預算（Phase 3）；KTX2 上傳後清空 `mipmaps`（Phase 4）。
     - **拒絕**：`slimShadowMaps`（`r160` 用四通道 `RGBADepthPacking`，改單通道必壞陰影）、2D `uLampMap` 重寫、`pmndrs/postprocessing` 套件、替換 Rapier 物理與原生 `TilePool` 私有魔改。
  2. 確立**三層免插線手機自動化驗證架構**（Tier 1 `npm run profile:mobile -- --assert-ios-budget`；Tier 2 Mac Playwright `webkit` / `xcrun simctl` Simulator；Tier 3 里程碑無線真機 LINE/IG 驗收）。
  3. 實作 Phase 0 新規格：`BootDiag.js` 玩家端自動降階 `safeMode`（連死 2 次或 `webglcontextlost` 自動鎖 `low` + `texScale <= 0.375`、穩玩 180 秒自動恢復）、`PerfProfile.js` `?safemode=`、`GameLoop.js` `[SAFE]` 標記與健康計時，以及 `tools/profile_scene.mjs` 支援 `--mobile`、`peakBackingStoreMB` / `liveBackingStoreMB`、`--markdown`、`--assert-ios-budget`（同步於 `package.json` 新增 `profile:mobile`）。
  4. **更正本機環境紀錄**：確認 Linux 本機已安裝 Google Chrome（`/usr/bin/google-chrome-stable -> /opt/google/chrome/google-chrome`），前次 `ENOENT` 係因受限終端沙盒未掛載 `/opt/google/chrome/` 所致，於本機一般終端機即可直接執行 `npm run profile:scene -- --play` 或 `npm run profile:mobile`。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 於一般本機終端機執行 `npm run profile:mobile` 取得修正後第一份自動化手機模擬基線表格並補入本紀錄（或 `phase-0-baseline-and-flags.md`），隨即合併 `chore/perf-flags-and-metrics` 回 `main`。
  2. 從最新 `main` 切出 `fix/ios-canvas-lifecycle` 展開 **[Phase 1 規格書](specs/phase-1-ios-memory-rescue.md)**。

---

### Session #003｜2026-11-25｜負責階段：規劃體檢、目標定錨與技術規格全面修正
- **工作分支 / PR**：`docs/revise-perf-refactor-plan`（接續檢視 PR #147 合入後之 `perf-refactor/` 與未合併分支 `chore/perf-flags-and-metrics`）
- **本輪已完成**：
  1. **交叉比對全專案 155,393 行原始碼（`src/world/` 佔 102,379 行）**，揪出並修正原規劃的 10 項模糊空間、事實錯誤與致命技術破洞：
     - **明確雙端分級 KPI**：手機端定錨為 iOS Safari & LINE/IG `WKWebView` `<= 5s` 進場、連續漫遊騎車 `>= 10m` 零閃退、`WKWebView >= 30 FPS` / Safari `45–60 FPS`；電腦無獨顯拆為「Apple M 系列 / Iris Xe / 780M 在 1080p 穩 55–60 FPS」與「舊款 UHD 620 等級自動 `low` 穩 `>= 45 FPS`」。
     - **釐清單一職責**：`GameLoop.js` (`QPROF`) 維持畫質唯一真相；移除 `PerfProfile.js` 重複且衝突的 `shadowSize` / `maxDpr` / `postFx`。
     - **修正程式碼事實誤判**：確認手機預設早就是 `low`（`MapBuilder` 已用 `texPx = 64`、`PostFX` 已關閉），真正主因是全專案 **86 處 `createElement('canvas')`**（含 20+ 私有 helper、4 支頂層立即執行 `ctex`、中間畫布 `hc`/`dc`）與 `Game.js` 在 `setLoad(0.08)` 之前才讓幀導致畫面永遠假停在 `2%`。
     - **防破圖／防假拆包／防穿牆修正**：設計四角色兩階段 Canvas 釋放協定（保護 `finishRow`、`ROWT`/`YHT` 共用與 `T.screen` 非同步圖）；將原 Phase 2 與 Phase 3 對調，先做低衝突渲染分塊與 `Kit.finish()` 平面合批（砍掉 1,258 個散裝平面 Draw Calls），再做輕重物理拆檔真 Code-Splitting ＋ `PhysWorld` 動態 Rapier 碰撞體（保護 `Walker.js` 與 `tools/floorplan`）。
  2. 完成重寫 `perf-refactor/` 全部 10 份檔案，並將 `phase-2` / `phase-3` 規格對調命名（`phase-2-render-and-igpu-opt.md`、`phase-3-global-dynamic-streaming.md`）。
- **實機與量化數據變化**：
  - 本輪為規格修正（無執行期程式改動），沿用 2026-11-24 M1 Pro 實測基線（懷恩樓前 `50 fps` / `1,729` calls / `4,240k` tris / `659` tex / `2,747` geo）與 iPhone 17 Pro Max 失敗基線，靜態盤點補入 `86` 處 `createElement('canvas')` 與 `1,258` 處 `k.plane()` 數據。
- **新發現的技術細節或踩雷**：
  - 全部 8 項新技術紅線已系統性寫入 [pitfalls-and-memory.md](pitfalls-and-memory.md)。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 依修正後規格更新 `chore/perf-flags-and-metrics`（重構 `PerfProfile.js`、實作 `BootDiag.js`、`Game.js` 階段讓幀與檢查點、`tools/profile_scene.mjs` 並補齊單元測試）。
  2. 合入 Phase 0 後於 iPhone 17 Pro Max 跑 `?perf&diag=1` 鎖定精準崩潰階段，隨即進入 **[Phase 1 規格書](specs/phase-1-ios-memory-rescue.md)**。

---

### Session #002｜2026-11-24｜負責階段：Phase 0 實作（旗標解析與記憶體遙測）
- **工作分支 / PR**：`chore/perf-flags-and-metrics`（PR 待按 Session #003 新規格對齊更新）
- **本輪已完成**：
  1. 完成規劃分支合併：`docs/perf-refactor-plan` 已透過 PR #147 合併至上游 `howardtuan/YanlinGTA` (`main` `7a00e81`)。
  2. 新增初版 `src/core/PerfProfile.js`、`GameLoop.js` `?perf` 記憶體行與 `tests/unit/perf-profile.test.js`。
- **實機與量化數據變化**（2026-11-24 實測，`chore/perf-flags-and-metrics` `9daa340`）：
  - **iPhone 17 Pro Max（iOS Safari）**：❌ 載入失敗，畫面停在「載入地圖資料 2%」後觸發頁面自動重整循環（Web Inspector 未能掛載；後於 Session #003 發現因 `Game.js` 未在 `setLoad(0.08)` 後讓幀，無法區分停在 2% 還是卡在 `buildWorld`）。
  - **MacBook Pro Apple M1 Pro（`desktop-igpu` 對照組，`medium` 畫質、WASM 開）**：
    - 標題頁：`65 fps` (`15.3 ms`)｜Draw Calls `1,763`（峰值 `1,774`）｜Triangles `4,590k`（峰值 `4,638k`）｜Textures `432`｜Geometries `1,963`｜物理 `0 剛體 2,557 碰撞體`
    - 進校園（懷恩樓前靜止）：`50 fps` (`20.0 ms`)｜Draw Calls `1,729`｜Triangles `4,240k`｜Textures `659`｜Geometries `2,747`｜物理 `2 剛體 2,559 碰撞體`

---

### Session #001｜2026-11-24｜負責階段：架構診斷與初版規劃書確立
- **工作分支 / PR**：`docs/perf-refactor-plan`（已透過 PR #147 合併至 `main`）
- **本輪已完成**：
  1. 確立保留 Vite + Three.js + 雙 WASM 單一程式碼庫、排除 UI/UX 與主線第五章改動。
  2. 建立 `perf-refactor/` 目錄與 `AGENT.md` 過渡期公告。
