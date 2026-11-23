## 變更摘要 (Summary)

<!-- 簡述這張 PR 做了什麼、為什麼做 -->

## 變更分級與規格 (Tier & Spec)

- [ ] **Tier 1（內容 / 局部調整）**：單一路段街景、單棟外觀補完、自訂 NPC 設定、純文案或局部修補
- [ ] **Tier 2（架構 / 系統 / 物理 / 主線）**：跨層修改、新系統、物理/渲染/存檔/任務狀態機（需先於 `task/` 確認規格）
- 關聯規格或追蹤文件（若有）：`task/...`

## 領域專屬檢查 (Domain Checklist，僅勾選本次有改動的項目)

- [ ] **世界與街景 (`src/world/`)**：確認碰撞、地形與道路不相衝突；若有完成項目已同步更新 `task/campus-pending.md`
- [ ] **建築室內 (`Interiors` / `buildings/`)**：已執行 `node tools/floorplan/make.mjs` 重新產生並檢視 `docs/floorplans/` SVG
- [ ] **NPC 與資料 (`data/npcs.json` / `entities/npcs/`)**：自訂 NPC 經 `tools/npc-dashboard` 編輯；劇情 NPC 遵守 `src/` 分層規範
- [ ] **UI / DOM (`src/ui/` / `index.html`)**：DOM ID 對應正確，無遺留無效事件綁定
- [ ] **WASM 貼圖核心 (`tools/wasm-kernels/` / `Textures.js`)**：已執行 `npm run test:wasm` 驗證 `0 mismatched`

## 品質門檻 (Verification)

- [ ] 已在本機執行 `npm run ci` 且全數通過（Format Check + ESLint + Vitest + Vite Build + `check:dist`）
- [ ] （若改動主線任務、導航、物理或碰撞）已跑過 `npm run test:e2e` 確認可正常通關或已說明原因
- [ ] 所有 Review 討論串已處理並確認無多餘 WIP commit
