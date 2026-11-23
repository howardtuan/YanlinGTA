# YanlinGTA 實戰踩坑與技術備忘錄 (MEMORY.md)

本文件沉澱開發與重構過程中驗證過的關鍵經驗與防雷紀錄，供後續改動底層系統或除錯時查閱。

---

## 1. 建置與發布邊界
- **子路徑部署與相對路徑**：GitHub Pages 部署於子路徑（例如 `/YanlinGTA/`），因此 `vite.config.js` 設定 `base: './'`，且 `dist/index.html` 不可使用 `/` 開頭的絕對路徑（由 `tools/check_dist.mjs` 自動檢查）。
- **GitHub Pages 發布來源設定**：倉庫 `Settings → Pages → Source` 必須設定為 **GitHub Actions**，若留為 `legacy` 會與 `.github/workflows/deploy.yml` 互相競爭覆蓋線上版本（見 `task/roadmap.md`）。

## 2. 靜態檢查與測試安全網
- **中文字串全形空白 (`\u3000`)**：遊戲對話與宣傳標語含全形空白，ESLint 已於 `eslint.config.js` 的 `no-irregular-whitespace` 設定 `skipStrings` / `skipComments` / `skipTemplates`，切勿移除。
- **Prettier 忽略範圍**：`.prettierignore` 刻意排除 `src/`、`tools/`、`docs/` 與 `*.md`（團隊決定不重排 `src/` 以保留 `git blame` 與避免分支大衝突），`src/` 品質由 ESLint 把關。
- **分層例外控管**：`tests/unit/import-graph.test.js` 強制檢查 `src/` 不可出現循環匯入與新增跨層違規；目前僅存 `world/Interiors.js -> entities/Character.js` 一處已知例外，只可消除不可新增。
- **DOM ID 接線檢查**：`tests/unit/dom-ids.test.js` 靜態比對 `src/` 內 `getElementById` / `$()` 與 `index.html` 及動態生成 HTML，防止像先前 `mClose` 對 `modalClose` 導致按鈕失效的問題。

## 3. 渲染、WASM 與效能
- **WASM 逐位元一致性**：修改 `tools/wasm-kernels/` 或 `src/graphics/Textures.js` 內的 FBM / 法線貼圖演算法時，必須執行 `npm run test:wasm`（`tools/check_wasm.mjs`）驗證與純 JS Fallback 達到 `0 mismatched`。
- **著色器預編與環境貼圖順序**：`src/core/Game.js` 呼叫 `compileAsync` 前必須先呼叫 `gameLoop.updateSky(0)` 烤好 `scene.environment`，否則所有 `MeshStandardMaterial` 會在第一張畫面因開啟 `envMap` 而重新同步編譯著色器導致長秒數卡頓（詳見 `task/roadmap.md`）。
- **軟體繪圖讀回像素 (`willReadFrequently`)**：需要 `getImageData` / `toDataURL` 讀回像素的離屏畫布（如輪胎貼圖、`Textures.js` 高度圖與服飾畫布）應在建立 2D context 時啟用 `{ willReadFrequently: true }`，避免無顯示卡環境（如 CI / SwiftShader）產生數秒卡頓。

## 4. 物理、存檔與世界生成
- **存檔垂直高度同步**：`SaveSystem.applySave()` 還原玩家位置時必須同時設定 `player.y` 與 `player.pos.y`（見 `tests/unit/save.test.js`），否則會發生進遊戲時垂直掉出地板的異常；新增存檔欄位或任務步驟時須留意 `mv` 版本遷移相容性。
- **`ZONES` 註冊順序**：`src/world/zones/Zones.js` 內 `ZONES` 陣列順序直接決定建造與共用 LCG 亂數的消耗順序；新的區應加在最後面，勿隨意對調既有順序，以免改變全圖樹木與街道家具位置。
- **E2E Story Bot 環境差異**：`tools/e2e/story-bot.mjs` 依賴 Node 22 內建 `WebSocket` 與本機 Chrome；目前以手動觸發為主（`e2e.yml` 為 `workflow_dispatch`），不排程每日執行。

## 5. 工具與沙盒環境操作
- **部分開發工具依賴網路或 `.git` 寫入**：如使用受限沙盒環境（如 AI Agent 執行工具），編輯原始碼、測試與建置於沙盒內執行；涉及 `git push`、`git switch`、`npm install` 等網路或 `.git` 操作則於具權限環境執行。
