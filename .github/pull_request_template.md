## 變更內容與設計說明 (What & Why)

<!-- 自由說明這次新增、修改或修復了什麼，以及背後的設計考量 -->

## 文件與設計確認 (Docs & Design)

- [ ] 本次變更未擅自移除既有設計或彩蛋（若有設計改動已與使用者討論確認）
- [ ] （若新增功能、系統或特殊遊戲設計）已同步更新 `docs/guide/` 對應文件

## 驗證方式與自動合併 (Verification)

<!-- 簡述本次執行了哪些驗證（例如本機測試、畫面確認、進階檢查工具等） -->

- [ ] 已在本機執行 `npm run ci` 且全數通過（Format Check + ESLint + Vitest + Vite Build + `check:dist`）
- [ ] 分支內無多餘 WIP commit，並已啟用 Auto-merge（`gh pr merge --auto --merge`）
