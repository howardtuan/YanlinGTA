# YanlinGTA 底層效能與全局動態載入重構指揮部 (`perf-refactor/`)

> [!IMPORTANT]
> **這個資料夾是什麼？**
> 本目錄為 YanlinGTA 長週期底層效能重構任務的**專屬工程規格書、踩雷記憶庫與跨 Session Agent 交接紀錄**，專門用來協調「手機端 iOS 記憶體止血、全局空間動態載入（Global Spatial Streaming）、電腦無獨顯 60 FPS 最佳化」多階段底層改造。
>
> - **與 `docs/guide/` 的邊界**：`docs/guide/` 記錄「目前已上線、已驗證的系統事實」；本目錄 `perf-refactor/` 記錄「跨階段底層演進藍圖、當前重構進度、尚未完全切換的過渡期相容方案」。請一般功能開發者與對應 Agent 勿將本目錄的設計藍圖誤認為既有實作。
> - **退場與歸檔條件**：當 Phase 0 ～ Phase 3（或 Phase 4）全數合入 `main` 並通過實機驗收後，將最終定案的架構同步回寫至 [docs/guide/architecture.md](../docs/guide/architecture.md)，並把本目錄歸檔或移除，同時拿掉 [AGENT.md](../AGENT.md) 開頭的過渡期公告。

---

## 一、 產品雙層漏斗定位與重構邊界

本重構嚴格聚焦於**遊戲底層引擎管線（記憶體生命週期、全局空間動態載入、空間網格分塊、Shader 與 GPU 剔除最佳化）**，讓同一個 Three.js + Vite 單一程式碼庫同時達成以下目標，且**不更換 3D 引擎框架**（保留 15.4 萬行純 JS 程序化校園資產護城河與雙 WASM 加速管線）：

1. **第一層漏斗：手機瀏覽器（IG 限動 / Threads / LINE 內建 `WKWebView` & iOS Safari）**
   - **目標**：解決連 12GB RAM 的 iPhone 17 Pro Max 都因 WebKit `<canvas>` 2D 緩衝區硬上限（~384 MB）與全量資源載入而無法開啟的問題，讓手機端順暢開啟並遊玩校園漫遊、騎車、拍照與主線劇情。
2. **第二層漏斗：電腦瀏覽器（含無獨立顯示卡筆電 / Apple M 系列無風扇筆電 / Intel & AMD 內顯）**
   - **目標**：透過全局空間動態載入、基地圖 120m 網格分塊（恢復 Frustum Culling）、移除地板 Shader `discard` 恢復硬體 Early-Z、以及室內外距離剔除，讓無獨顯設備也能穩定跑在 55～60 FPS，順暢遊玩電腦桌面、麻將、打工與彩蛋。

> [!WARNING]
> **明確排除範圍（Out of Scope）**
> 1. **所有 UI/UX 與功能介面改動**：本重構目標為改動遊戲底層確保順暢度。**不新增**校園導覽捷徑、**不做**拍貼相框與分享介面、**不做**電腦版導流預告卡與存檔繼承碼、**不重排**手機直橫式 HUD 版面。
> 2. **主線第五章劇情與任務邏輯**：團隊後續將直接修改主線第五章（`src/systems/MissionSystem.js`「布條失竊案」）為手機能玩的形式，**本重構計畫嚴禁修改主線劇情或第五章任務狀態機**。

---

## 二、 即時進度儀表板（Progress Dashboard）

| 階段 | 任務名稱 | 目前狀態 | 預定分支前綴 | 核心交付物 | 關鍵驗收指標 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **規劃** | 架構體檢、可行性評估與規格確立 | ✅ 規格完成 | `docs/perf-refactor-plan` | 本目錄 10 份檔案與 `AGENT.md` 公告 | `npm run ci` 與連結檢查全過 |
| **Phase 0** | 基準量測（Mac Web Inspector）與極簡實驗旗標 | ⏳ 待動工 | `chore/perf-flags-and-metrics` | `PerfProfile.js`、`?perf` 補 `renderer.info.memory`、Web Inspector 基準數據 | 取得 iPhone 17 Pro Max 實機 Memory/Canvases/Flame Chart 基準 |
| **Phase 1** | iOS 記憶體止血與資源生命週期修復 | ⏳ 待動工 | `fix/ios-canvas-lifecycle` | `renderer.initTexture` 後 `1×1` 釋放 Canvas、圖集降維、延遲載入音訊/後照鏡 | iPhone 17 Pro Max Safari / LINE / IG 成功載入不閃退 |
| **Phase 2** | 全局空間動態載入（Global Streaming） | ⏳ 待動工 | `refactor/world-streaming-*` | 錨點分離、`ScopedChunkContext`、`WorldStreamer`、Rapier Tile 動態掛載 | 啟動僅載入骨架與玩家周邊，外圍街屋/室內/體育館動態進出 |
| **Phase 3** | 渲染分塊與電腦無獨顯 60 FPS 優化 | ⏳ 待動工 | `refactor/render-igpu-*` | `MapBuilder` 120m 空間分塊、移除地板 `discard`、室內外剔除、GPU 檔位重校 | 內顯設備三角形/Draw Call 降 60%+，主場景穩 55–60 FPS |
| **Phase 4** | 建置期貼圖烘焙管線（長期進階） | ⏳ 待動工 | `feat/build-time-texture-baking` | `tools/bake_textures.mjs` 預烘 `.webp` / `.ktx2`（保留 `dev` 即時 Fallback） | 冷啟動不再現場繪製數百張 Canvas，啟動 < 2 秒 |

---

## 三、 給不同角色的閱讀路徑（Reading Guide）

### 1. 如果你是「接手執行本重構計畫」的開發者或 AI Agent
請務必**嚴格按照以下順序**閱讀，避免重複踩雷或破壞隊友進度：
1. [README.md](README.md)（本文件）— 確認目前進度到哪一個 Phase 與排除範圍。
2. [agent-handoff-log.md](agent-handoff-log.md) — 讀取最新一筆交接紀錄，確認上一棒已合入的 PR、實機測試數字與當前第一順位的待辦項目。
3. [pitfalls-and-memory.md](pitfalls-and-memory.md) — 必讀！記錄 iOS WebKit Canvas 陷阱、NPC 錨點強耦合、決定性 PRNG 順序與測試門禁。
4. [git-and-transition-plan.md](git-and-transition-plan.md) — 確認雙遠端（上游 `howardtuan/YanlinGTA` ＋ 個人 Fork 預覽部署）、Mac 區網聯調與短生命週期 PR 切分規則。
5. 對應目標階段的 `specs/phase-X-*.md`（先讀 [specs/00-master-architecture.md](specs/00-master-architecture.md)）。
6. 實作完成發 PR 前，**必須更新 [agent-handoff-log.md](agent-handoff-log.md) 與本表的狀態欄位**。

### 2. 如果你是「開發新 NPC／建築／支線／小遊戲」的內容組開發者或 AI Agent
- **日常開發完全不需要閱讀 `specs/`**！請照舊遵循 [AGENT.md](../AGENT.md) 與 [docs/README.md](../docs/README.md)。
- 僅當你的改動需要修改 `src/core/Game.js`、`src/core/GameLoop.js`、`src/graphics/Textures.js`、`src/physics/PhysWorld.js`、`src/world/Kit.js`、`src/world/MapBuilder.js` 或 `src/world/zones/Zones.js` 的公共介面時，請先快速確認 [git-and-transition-plan.md](git-and-transition-plan.md) 中的相容性約定，避免雙方互改同一介面產生衝突。

---

## 四、 目錄結構總覽

```text
perf-refactor/
├── README.md                               # 本指揮部總覽、邊界定義與即時進度表
├── git-and-transition-plan.md              # 過渡期多人協作、Git 分支策略與 Mac/iPhone 實機聯調 SOP
├── pitfalls-and-memory.md                  # 專案實測與靜態分析踩雷記憶庫（防重複犯錯）
├── agent-handoff-log.md                    # 跨 Session / 跨階段 Agent 標準交接日誌
└── specs/
    ├── 00-master-architecture.md           # L0 總綱：全局動態載入可行性評估、三層世界模型與 KPIs
    ├── phase-0-baseline-and-flags.md       # Phase 0：Mac Safari Web Inspector 基準量測 SOP 與極簡實驗旗標
    ├── phase-1-ios-memory-rescue.md        # Phase 1：iOS WebKit Canvas 釋放、圖集降維與延遲配置
    ├── phase-2-global-dynamic-streaming.md # Phase 2：錨點解耦、WorldStreamer 與 Rapier 空間串流
    ├── phase-3-render-and-igpu-opt.md      # Phase 3：120m 網格分塊、去 discard、室內剔除與內顯優化
    └── phase-4-build-time-baking.md        # Phase 4：建置期 .webp / .ktx2 壓縮紋理烘焙管線
```
