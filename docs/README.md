# YanlinGTA 文件總索引 (`docs/`)

本目錄集中管理專案的所有技術文件、遊戲設計說明、建模參考原材與宣傳媒體，嚴格切分為三大分類，與遊戲執行期資產（`assets/`、`data/`）清楚區隔：

```text
docs/
├── guide/        # 1. 程式文檔與遊戲設計（每次新增功能／彩蛋必同步更新）
├── references/   # 2. 建模原材料、圖資來源與平面圖備份（非遊戲 runtime 資產）
└── media/        # 3. README 與宣傳用影片／視覺資產（不打包進 dist/）
```

---

## 1. 程式文檔與遊戲設計 (`docs/guide/`)

所有工程架構、開發操作與遊戲特色設計（含團隊內部梗與彩蛋由來）統一收錄於此。**開發者與 Agent 每次新增功能、系統或特殊設計時，皆須同步更新對應文件**：

- **[系統架構手冊 (architecture.md)](guide/architecture.md)**：7 大分層結構、單向無環依賴規則、GameLoop 固定步長與雙 WASM 運算子系統。
- **[遊戲設計與內部梗手冊 (game-design.md)](guide/game-design.md)**：世界觀、主線任務、特色小遊戲、NPC 設定與各項「離奇但刻意設計」的團隊梗與彩蛋，動工前必讀以避免誤修。
- **[開發者與貢獻指南 (developer-guide.md)](guide/developer-guide.md)**：本機環境建置、npm 指令清冊、測試金字塔與 GitHub Flow 操作步驟。
- **[NPC 創作與自訂指南 (npc-creation-guide.md)](guide/npc-creation-guide.md)**：雙軌 NPC 架構、`tools/npc-dashboard` 視覺化工具與 `data/npcs.json` 格式規格。
- **[部署與運維手冊 (deployment.md)](guide/deployment.md)**：GitHub Pages 自動發布、Docker 多階段建置、Nginx 配置與 CI/CD 管線。

---

## 2. 建模原材料與圖資備份 (`docs/references/`)

> ⚠️ **資產邊界提醒**：實際遊戲運行會讀取的貼圖、音效、音樂與地圖資料請放在專案根目錄的 `assets/` 與 `data/`。本資料夾**僅供保存與備份**建模參考圖資、建築平面圖與人物參考原材，不會被 Vite 打包進 `dist/`。

- **[參考原材目錄說明 (references/README.md)](references/README.md)**
- **[建築室內平面圖 (references/floorplans/README.md)](references/floorplans/README.md)**：由 `tools/floorplan/make.mjs` 依據建模程式切出的建築室內 SVG 平面圖（力行宿舍、學生活動中心 B1 等）；學生活動中心一到四樓放的是使用者給的修改版參考圖，模型照它蓋。

---

## 3. README 與宣傳媒體 (`docs/media/`)

存放 `README.md` 展示或對外宣傳使用之影片、截圖、海報等媒體檔案，與遊戲執行期資產隔離：

- `docs/media/promo/`：遊戲展示影片（`yanlin-demo-30s.mp4`、`yanlin-promo-53s.mp4` 等）。

---

> 專案最高開發原則、GitHub Flow 規則與命名規範，請參閱根目錄 [AGENT.md](../AGENT.md)。
