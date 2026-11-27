# YanlinGTA 文件總索引 (`docs/`)

`docs/` 是**面向 AI Agent 與開發者的嚴謹單一事實來源（SSOT）**，嚴格切分為四區，與遊戲執行期資產（`assets/`、`data/`）及玩家百科（`wiki/`）區隔，且**絕不進入 `dist/`**。

```text
docs/
├── specs/          # 1. 六大領域系統規格（遊戲變更必須同 PR 同步更新）
├── dev/            # 2. 開發測試與部署維運手冊
├── references/     # 3. 建模參考原材與室內平面圖備份
└── promo-archive/  # 4. 對外宣傳母帶與社群素材歸檔（Agent 勿讀）
```

> [!IMPORTANT]
> **鐵律**：每次更動遊戲內容，同一個 PR 必須同步更新 `docs/specs/` 對應規格檔。`wiki/` 由使用者維護，Agent 不當作規格撰寫（細則見 [AGENT.md](../AGENT.md)）。

---

## 1. 系統規格 (`specs/`)

| 檔案 | 涵蓋範圍 |
| :--- | :--- |
| [architecture.md](specs/architecture.md) | 7 層架構、GameLoop、PerfProfile／BootDiag 自癒、GPU 記憶體生命週期、雙 WASM、存檔 |
| [world-and-entities.md](specs/world-and-entities.md) | 地圖分塊與挖洞、Kit 室內契約、火車平交道、機車車型與街道剛體、節慶與校園機關 |
| [missions-and-quests.md](specs/missions-and-quests.md) | 全息 AI、主線 M1–M6、5 大支線、SQL 偵探與一鍵通關 |
| [gameplay-and-ui.md](specs/gameplay-and-ui.md) | 互動／觸控契約、手機全 App、無人機與拍照、電腦與終端機、277 麻將、打工店家、衣櫃 |
| [npcs-and-characters.md](specs/npcs-and-characters.md) | NPC 綱要、3D 造型與球衣殼層、勞大三態、全角色排程、義務役日曆 |
| [easter-eggs-and-secrets.md](specs/easter-eggs-and-secrets.md) | 🔒 機密：PYL 密技、肘擊、隱藏特調、鬧鐘、零錢、版權隱私紅線（不上 Wiki） |

### Agent 任務導向路由表

| 修改的 `src/` 子系統 | 先讀 | 改完同步更新 |
| :--- | :--- | :--- |
| `core/`、`graphics/`、`physics/`、`SaveSystem` | architecture | architecture |
| `world/`、`Trains`、`ScooterVariants`、`Season` | world-and-entities | world-and-entities |
| `MissionSystem`、`quests/`、`Detective`、`AutoSolve` | missions-and-quests、easter-eggs | missions-and-quests |
| `ui/`（手機、PC、拍照）、`Drone`、`mahjong/`、`minigames/` | gameplay-and-ui、easter-eggs | gameplay-and-ui |
| `entities/npcs/`、`Pilot`、`Character`、`Jersey`、`data/npcs.json` | npcs-and-characters、easter-eggs | npcs-and-characters（彩蛋同步 easter-eggs） |

## 2. 開發維運手冊 (`dev/`)

- [developer-guide.md](dev/developer-guide.md)：環境、npm 指令、URL 除錯參數全表、測試金字塔、NPC 儀表板、GitHub Flow。
- [deployment.md](dev/deployment.md)：GitHub Pages、Wiki／SEO 管線、Docker、Nginx、CI/CD。

## 3. 建模原材與圖資備份 (`references/`)

僅供保存，不進入執行期：[references/README.md](references/README.md)、[floorplans/README.md](references/floorplans/README.md)。

## 4. 宣傳母帶歸檔 (`promo-archive/`)

見 [promo-archive/README.md](promo-archive/README.md)。線上 Wiki 現行宣傳片位於 `wiki/media/`。
