# [Tier 2 規格] <任務標題>

- **狀態**：草稿 / 討論中 / 進行中 / 已結案（YYYY-MM-DD）
- **對應分支**：`feat/...` 或 `refactor/...`
- **負責人 / 協作組別**：

## 一、 背景與目標

<!-- 說明為什麼要做這項變更、解決什麼痛點、目標為何 -->

## 二、 影響範圍與架構分層

<!-- 列出預計修改的 src/ 分層、資料檔與工具，確認未違反 import-graph 分層規則 -->

- 影響層級：
- 相關檔案：
- 已知風險 / 相依性：

## 三、 實作方案

<!-- 簡述核心設計與替代方案考量 -->

## 四、 驗收標準 (Acceptance Criteria)

- [ ] AC 1：
- [ ] AC 2：
- [ ] 維持 Zero Regression，未破壞既有遊戲性與物理數值

## 五、 驗證計畫

- [ ] `npm run ci`（Format Check + ESLint + Vitest + Vite Build + `check:dist`）
- [ ] （選填）`npm run test:wasm`
- [ ] （選填）`node tools/floorplan/make.mjs`
- [ ] （選填）`npm run test:e2e`（Story Bot）
- [ ] 手動實機測試項目：

## 六、 結案與實測紀錄

<!-- 實作完成後填寫實際量測數據、相關 PR / Commit 與注意事項；若有新踩坑同步沉澱至 task/MEMORY.md -->
