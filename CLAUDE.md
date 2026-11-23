# CLAUDE.md

本專案的工程規範、GitHub Flow 協作規則、架構分層與驗收門檻統一由 [AGENT.md](AGENT.md)（Single Source of Truth）定義。動工前請先完整閱讀 `AGENT.md`。

## 快速摘要（必守紅線）

1. **GitHub Flow 與分支白名單**：
   - **嚴禁**直接在 `main` 提交或推送；所有工作一律從最新 `main` 切出短生命週期分支（或外部 Worktree）。
   - 分支前綴僅允許：`feat/*`、`fix/*`、`hotfix/*`、`chore/*`、`refactor/*`、`docs/*`（**禁止**使用 `claude/*`、`perf/*`、`test/*` 等未列在白名單的前綴，push 會被 GitHub 拒絕）。
   - Commit Message 遵守 `<type>(<scope>): <繁體中文或英文簡述>`。
   - 上游僅允許 **Merge Commit** 且新 Push 會作廢既有 Approve，請在本地整理乾淨並通過驗證後再送 Review。
2. **Tier 1 vs Tier 2**：
   - 單一路段街景、單棟外觀、自訂 NPC 等 **Tier 1** 變更可直接依 `AGENT.md` 第五節領域 SOP 進行。
   - 跨層架構、物理/渲染/存檔/任務狀態機等 **Tier 2** 變更，須先討論並依 [task/TEMPLATE.md](task/TEMPLATE.md) 建立規格與驗收標準（AC）確認後再動工。
3. **本地交付門檻**：
   - Push 前必跑 `npm run ci`（`format:check` + `lint` + `test` + `build` + `check:dist`）。
   - 若環境或測試有阻礙，請明確回報實際未執行項目，禁止猜測結果。
4. **實戰記憶**：
   - 涉及著色器預編、WASM 精度、存檔相容、`Zones.js` 順序或開發環境邊界時，先看 [task/MEMORY.md](task/MEMORY.md)。
