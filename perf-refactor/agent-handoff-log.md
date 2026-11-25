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

### Session #005｜2026-11-25｜負責階段：吸收《臺北狂飆》實證架構分析 ＋ 確立免插線手機自動化驗證方案
- **工作分支 / PR**：`docs/revise-perf-refactor-plan`
- **本輪已完成**：
  1. 逐項比對《臺北狂飆》（Three.js `r186`）與 `YanlinGTA`（`Three.js r160`）實際原始碼，完成技術篩選並回寫 `perf-refactor/`：
     - **納入**：`BootDiag` 玩家端無感自動降階 `safeMode`（Phase 0）；靜態幾何 `onUploadCallback` 清空 CPU `TypedArray` + `ImageBitmap.close()` + `WebGLRenderer({ alpha: false, stencil: false })` + 條件式 `gcNudge`（Phase 1）；`low` 切換 `MeshLambertMaterial` 跳過法線/RM 貼圖 + `opaqueSort` + 30Hz 隔幀陰影 + 零相依 `PostFX` 瘦身（Phase 2）；`r160` 相容分帶 `texSubImage2D` + `pinPrograms()` + 分批 `dispose` + `MessageChannel` 幀預算（Phase 3）；KTX2 上傳後清空 `mipmaps`（Phase 4）。
     - **拒絕**：`slimShadowMaps`（`r160` 用四通道 `RGBADepthPacking`，改單通道必壞陰影）、2D `uLampMap` 重寫、`pmndrs/postprocessing` 套件、替換 Rapier 物理與原生 `TilePool` 私有魔改。
  2. 確立**三層免插線手機自動化驗證架構**（Tier 1 `npm run profile:mobile -- --assert-ios-budget` 量測 `peakBackingStoreMB`/`liveBackingStoreMB` ＋ `--markdown` 自動抄表；Tier 2 Mac Playwright `webkit` / `xcrun simctl` Simulator；Tier 3 里程碑無線真機 LINE/IG 驗收）。
  3. **更正本機環境紀錄**：確認 Linux 本機已安裝 Google Chrome（`/usr/bin/google-chrome-stable -> /opt/google/chrome/google-chrome`），前次 `ENOENT` 係因受限終端沙盒未掛載 `/opt/google/chrome/` 所致，於本機一般終端機即可直接執行 `npm run profile:scene -- --play`。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 將本輪規劃同步合入 `chore/perf-flags-and-metrics`，實作 `BootDiag` `safeMode` 自動降階與 `profile_scene.mjs` `--mobile` / `peakBackingStoreMB` / `--markdown` / `--assert-ios-budget`。
  2. 於一般本機終端機執行 `npm run profile:mobile` 取得修正後第一份自動化手機模擬基線數據。

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
