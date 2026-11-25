# YanlinGTA 底層效能與全局動態載入重構指揮部 (`perf-refactor/`)

> [!IMPORTANT]
> **這個資料夾是什麼？**
> 本目錄為 YanlinGTA 長週期底層效能重構任務的**專屬工程規格書、踩雷記憶庫與跨 Session Agent 交接紀錄**，專門用來協調「手機端 iOS 記憶體止血、渲染空間分塊與合批、全局空間動態載入（Global Spatial Streaming）」多階段底層改造。
>
> - **與 `docs/guide/` 的邊界**：`docs/guide/` 記錄「目前已上線、已驗證的系統事實」；本目錄 `perf-refactor/` 記錄「跨階段底層演進藍圖、當前重構進度、尚未完全切換的過渡期相容方案」。請一般功能開發者與對應 Agent 勿將本目錄的設計藍圖誤認為既有實作。
> - **退場與歸檔條件**：當 Phase 0 ～ Phase 3（或 Phase 4）全數合入 `main` 並通過實機驗收後，將最終定案的架構同步回寫至 [docs/guide/architecture.md](../docs/guide/architecture.md)，並把本目錄歸檔或移除，同時拿掉 [AGENT.md](../AGENT.md) 開頭的過渡期公告。

---

## 一、 產品雙層漏斗定位、明確 KPI 與重構邊界

本重構嚴格聚焦於**遊戲底層引擎管線（啟動可觀測性、Canvas 與紋理生命週期、空間網格分塊與平面合批、Shader 去 `discard`、真拆包空間動態載入）**，讓同一個 Three.js + Vite 單一程式碼庫同時達成以下**可量化驗收指標**，且**不更換 3D 引擎框架**（保留 15.5 萬行純 JS 程序化校園資產護城河與雙 WASM 加速管線）：

### 1. 第一層漏斗：手機瀏覽器（iOS Safari ＆ LINE / IG 內建 `WKWebView`）
- **核心目標**：解除 iOS WebKit 單頁 `<canvas>` 2D Backing Store 硬上限（~256–384 MB）與全量同步建置尖峰，讓手機能順利進場並體驗校園漫遊、騎車、拍照與主線劇情。
- **明確驗收標準**：
  - **冷啟動進場**：`<= 5 秒` 穩定進入標題頁（不卡死、不觸發 WebKit 自動重整循環）。
  - **長時穩定性**：於校園與中原夜市間連續漫遊、騎乘機車穿梭 **`>= 10 分鐘` 零閃退、零頁面重整**（以記憶體配額更嚴格的 LINE / IG `WKWebView` 為最終過關基準）。
  - **幀率目標**：`WKWebView` 穩定 **`>= 30 FPS`**；獨立 iOS Safari 目標 **`45–60 FPS`**。

### 2. 第二層漏斗：電腦瀏覽器（無獨立顯示卡筆電 / Apple M 系列 / Intel & AMD 內顯）
- **核心目標**：在 `1080p` 視野下（`DPR <= 1.0`），透過 `MapBuilder` 120m 網格分塊、`Kit.finish()` 靜態平面圖集合批、移除地面 Shader `discard` 恢復硬體 Early-Z、室內家具距離剔除與畫質重校，依內顯算力分級達標：
  - **新世代內顯 / 統一記憶體（Apple M1–M4 / Intel Iris Xe & Arc iGPU / AMD Radeon 780M & 680M）**：預設 `medium`（或無重型 MSAA 後製之調校 `medium`）穩定 **`55–60 FPS`**。
  - **舊款入門文書內顯（Intel UHD 620 / 630、Vega 8、GeForce MX 等）**：自動降階為 `low` 穩定 **`>= 45 FPS`**（徹底告別 15–20 FPS 幻燈片）。

> [!WARNING]
> **明確排除範圍（Out of Scope）**
> 1. **所有 UI/UX 與功能介面改動**：本重構目標為改動遊戲底層確保順暢度。**不新增**校園導覽捷徑、**不做**拍貼相框與分享介面、**不做**電腦版導流預告卡與存檔繼承碼、**不重排**手機直橫式 HUD 版面（僅 `?perf` 與 `?diag` 除錯參數可顯示開發者遙測文字）。
> 2. **主線第五章劇情與任務邏輯**：團隊後續將直接修改主線第五章（[src/systems/MissionSystem.js](../src/systems/MissionSystem.js)「布條失竊案」）為手機能玩的形式，**本重構計畫嚴禁修改主線劇情或第五章任務狀態機**。

---

## 二、 即時進度儀表板（Progress Dashboard）

| 階段 | 任務名稱 | 目前狀態 | 預定分支前綴 | 核心交付物 | 關鍵驗收指標 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **規劃** | 架構體檢、可行性評估與規格修正 | ✅ 規格修正完成 | `docs/perf-refactor-plan`、`docs/revise-perf-refactor-plan` | 本目錄 10 份檔案與 `AGENT.md` 公告（修正目標模糊、順序與技術破洞） | `npm run ci` 與連結檢查全過 |
| **Phase 0** | 可觀測基準、載入檢查點與實驗旗標 | 🔄 實作就緒（含自動降階與手機模擬門禁） | `chore/perf-flags-and-metrics` | `PerfProfile.js`、`BootDiag.js`（含自動降階 `safeMode`）、`Game.js` 讓幀修復、`?perf`、`tools/profile_scene.mjs`（含 `--mobile` 與預算門禁） | 消除「假卡 2%」盲區、免插線 `--mobile --assert-ios-budget` 自動抄表、崩潰自動進安全模式 |
| **Phase 1** | iOS 記憶體止血與資源生命週期修復 | ⏳ 待動工 | `fix/ios-canvas-lifecycle`、`fix/ios-lazy-noncore-assets` | `GpuMemLifecycle.js`（Canvas 兩階段釋放 + 靜態幾何 `onUploadCallback` 清空 CPU 陣列 + `ImageBitmap.close()`）、WebGL 輕量初始化、條件式 Apple `gcNudge`、延遲載入 | iPhone Safari / LINE / IG `<= 5s` 進場且連玩 `>= 10m` 不閃退；`peak <= 220 MB`、`live <= 24 MB` |
| **Phase 2** | 渲染空間分塊、去 `discard` 與 `Kit.finish` 平面合批 | ⏳ 待動工 | `refactor/mapbuilder-chunking`、`refactor/kit-plane-batch-and-igpu` | `MapBuilder` 120m 分塊＋CPU 切洞、`Kit.finish()` 平面合批、`low` 切 `MeshLambertMaterial`（跳過法線/RM）、`opaqueSort`、30Hz 隔幀陰影、零相依 `PostFX` 瘦身 | 主場景三角形降 **60%+**、Draw Calls 顯著下降、M 系列 / Iris Xe 穩 **55–60 FPS**、UHD `>= 45 FPS` |
| **Phase 3** | 真拆包全局空間動態載入與動態物理碰撞 | ⏳ 待動工 | `refactor/world-streamer-*` | 輕重檔案物理分離、分步驟 `WorldStreamer`（`MessageChannel` 幀預算 + `r160` 分帶 `texSubImage2D` 3ms 上傳 + `pinPrograms()` + 分批 `dispose`）、`PhysWorld` 動態 Chunk 碰撞 | 外圍街屋/體育館/室內真正拆出 async chunks、進屋不穿牆、`tools/floorplan` 相容 |
| **Phase 4** | 建置期貼圖烘焙管線（長期進階） | ⏳ 待動工 | `feat/build-time-texture-baking` | `tools/bake_textures.mjs` 預烘 `.webp` / `.ktx2`（ETC1S + UASTC 實證省 5.3×–7.9× VRAM，上傳後清空 `mipmaps` CPU 陣列，保留 `dev` Fallback） | 冷啟動紋理生成耗時降 **> 85%**、VRAM 降 **> 60%** |

---

## 三、 給不同角色的閱讀路徑（Reading Guide）

### 1. 如果你是「接手執行本重構計畫」的開發者或 AI Agent
請務必**嚴格按照以下順序**閱讀，避免重複踩雷或破壞隊友進度：
1. [README.md](README.md)（本文件）— 確認目前進度到哪一個 Phase、雙端明確 KPI 與排除範圍。
2. [agent-handoff-log.md](agent-handoff-log.md) — 讀取最新一筆交接紀錄，確認上一棒已合入的 PR、實機／Headless 測試數字與當前第一順位的待辦項目。
3. [pitfalls-and-memory.md](pitfalls-and-memory.md) — 必讀！記錄全專案 86 處 Canvas、`finishRow` 依賴、`QPROF` 單一真相、Vite 真拆包、Rapier `Walker.js` 碰撞標籤與 `tools/floorplan` 相容紅線。
4. [git-and-transition-plan.md](git-and-transition-plan.md) — 確認與內容組並行的短生命週期 PR 切分、Linux/Mac 雙環境測試與遠端部署驗證 SOP。
5. [baseline-environments.md](baseline-environments.md) — 量測環境登記與模板；**只能拿同環境的基線做比較**，新機器先填表並建立自己的基線。
6. 對應目標階段的 `specs/phase-X-*.md`（先讀 [specs/00-master-architecture.md](specs/00-master-architecture.md)）。
7. 實作完成發 PR 前，**必須更新 [agent-handoff-log.md](agent-handoff-log.md) 與本表的狀態欄位**。

### 2. 如果你是「開發新 NPC／建築／支線／小遊戲」的內容組開發者或 AI Agent
- **日常開發完全不需要閱讀 `specs/`**！請照舊遵循 [AGENT.md](../AGENT.md) 與 [docs/README.md](../docs/README.md)。
- 僅當你的改動需要修改 `src/core/Game.js`、`src/core/GameLoop.js`、`src/graphics/Textures.js`、`src/physics/PhysWorld.js`、`src/world/Kit.js`、`src/world/MapBuilder.js` 或 `src/world/zones/Zones.js` 的公共介面時，請先快速確認 [git-and-transition-plan.md](git-and-transition-plan.md) 中的相容性約定，避免雙方互改同一介面產生衝突。

---

## 四、 目錄結構總覽

```text
perf-refactor/
├── README.md                               # 本指揮部總覽、明確分級 KPI 與即時進度表
├── git-and-transition-plan.md              # 過渡期並行協作、10 PR 切分與 Linux/Mac/iPhone 驗證 SOP
├── pitfalls-and-memory.md                  # 專案實測與靜態剖析踩雷記憶庫（防破圖、防穿牆、防假拆包）
├── agent-handoff-log.md                    # 跨 Session / 跨階段 Agent 標準交接日誌
└── specs/
    ├── 00-master-architecture.md           # L0 總綱：單一畫質職責、三層世界模型與雙端 KPIs
    ├── phase-0-baseline-and-flags.md       # Phase 0：BootDiag 檢查點、PerfProfile 與自動化/實機基準
    ├── phase-1-ios-memory-rescue.md        # Phase 1：全專案 Canvas 兩階段安全釋放、惰性化與啟動止血
    ├── phase-2-render-and-igpu-opt.md      # Phase 2：120m 分塊、去 discard、Kit 平面合批與內顯 60 FPS
    ├── phase-3-global-dynamic-streaming.md # Phase 3：輕重檔案真拆包、WorldStreamer 與動態 Rapier 碰撞
    └── phase-4-build-time-baking.md        # Phase 4：建置期 .webp / .ktx2 壓縮紋理烘焙管線
```
