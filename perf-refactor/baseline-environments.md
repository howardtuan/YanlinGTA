# 基線量測環境登記（Baseline Environments）

效能數字只在**同一種環境**內可以比較。不同機器、瀏覽器、GPU、螢幕刷新率，得到的 FPS、啟動時間甚至 draw calls 都不同，只有 canvas / 貼圖這類記憶體數字跨環境大致一致。

**規則**
1. 基線 JSON 放在 `perf-baselines/`，檔名 `<引擎>-<desktop|mobile>-<環境代號>.json`，例如 `desktop-chrome-gpu-m1pro.json`。
2. 比較只用同環境的基線：`--compare=perf-baselines/<同環境檔>`。環境不同時，工具會印出警告並列出哪些欄位不同。
3. 工具會自動把 OS、CPU、核心數、RAM、Node、瀏覽器版本、GPU 字串、視窗大小寫進 JSON 的 `meta`，**但螢幕刷新率、電源模式、背景負載、GPU 核心數等要由人填在下面的表**。
4. 新加入的協作者：複製下方「模板」填好，附上自己跑出的基線檔，一起開 PR。
5. 量測前請：插電、關閉省電模式、關閉其他吃 GPU 的程式（影片、其他瀏覽器分頁）、螢幕不要睡眠。

> [!NOTE]
> 指標已改版：舊表的 `Peak Canvas MB` / `Live Canvas MB` 現在合併為 `memory.canvasMB`（強制 GC 後仍存活的 canvas 實際記憶體，並以 WeakRef 追蹤，不會因量測本身而洩漏）。Phase 1 的驗收門檻 `peak <= 220 MB`、`live <= 24 MB` 對應為 `canvasMB <= 220`（`--assert-ios-budget --max-canvas-mb=220`）。

## 如何跑

```bash
npm ci && npm run build
npm run profile:webkit-install          # 只需一次：下載 Playwright WebKit
npm run profile:desktop                 # Chrome + 真 GPU（桌機）
npm run profile:safari                  # WebKit + iPhone 視口（最接近 iOS，能全自動）
npm run profile:mobile                  # Chrome + iPhone 視口（軟體渲染，只看記憶體與相對變化）

# 建立 / 更新自己環境的基線
node tools/profile_scene.mjs --gpu --out=perf-baselines/desktop-chrome-gpu-<代號>.json --markdown
# 跟基線比對（退步會 exit 1）
node tools/profile_scene.mjs --gpu --compare=perf-baselines/desktop-chrome-gpu-<代號>.json
```

沒有 Chrome 或 WebKit 的 CI 可加 `--if-available` 直接略過。

## 已登記的環境

### M1Pro-Mac（目前基線）

| 項目 | 內容 |
| :--- | :--- |
| 代號 | `m1pro` |
| 機器 | Apple MacBook（M1 Pro） |
| CPU | Apple M1 Pro，8 核心 |
| GPU | Apple M1 Pro 內建 GPU（ANGLE Metal） |
| RAM | 16 GB |
| OS | macOS 27.2.1（Darwin 27.2.0, arm64） |
| Node / npm | v24.21.0 / 11.19.0 |
| Chrome | 158.0.8127.38 |
| WebKit | Playwright WebKit 27.2（v2388） |
| 螢幕刷新率 / 外接螢幕 | 未記錄（量測時 Chrome 已解除 vsync，WebKit 無法解除，固定 60 Hz） |
| 電源 / 省電模式 | 未記錄（請在下次量測時補上） |
| 基線檔 | `perf-baselines/desktop-chrome-gpu.json`、`perf-baselines/mobile-webkit.json` |
| 量測 commit | `3282a83` + 本次量測工具改版 |

重點數字（3 次中位數）：

| | 桌機 Chrome | iPhone 視口 WebKit |
| :--- | ---: | ---: |
| Canvas | 1836 MB（3137 個） | 1748 MB（3133 個） |
| 貼圖估算 | 1754 MB | 1640 MB |
| 啟動到標題 | 11.6 s | 9.8 s |
| 各機位幀時間 p95 | 10.3 – 14.5 ms | 18 – 20 ms |

## 模板（複製這一段，填完加到上面「已登記的環境」）

```markdown
### <環境名稱，例如 Win11-RTX4060 / ThinkPad-IrisXe / MacBookAir-M2>

| 項目 | 內容 |
| :--- | :--- |
| 代號 | `<小寫無空格，用於檔名>` |
| 機器 | <廠牌 + 型號 + 年份> |
| CPU | <型號>，<核心數 / 執行緒數> |
| GPU | <型號>，<內顯 / 獨顯>，<驅動版本> |
| 顯示記憶體 / 統一記憶體 | <GB> |
| RAM | <GB> |
| OS | <名稱 + 版本（Windows 請附 build 號）> |
| Node / npm | <node -v> / <npm -v> |
| Chrome | <chrome://version 的版本>，後端 <ANGLE: D3D11 / Metal / Vulkan> |
| WebKit | <有裝則填 Playwright WebKit 版本，沒有寫「未安裝」> |
| 螢幕刷新率 / 外接螢幕 | <Hz>，<是否外接> |
| 電源 / 省電模式 | <插電？是否省電模式？> |
| 雙 GPU 筆電 | <是否強制使用獨顯，如何設定；沒有寫「無」> |
| 量測時背景負載 | <是否有其他吃 GPU / CPU 的程式> |
| 基線檔 | `perf-baselines/<檔名>.json` |
| 量測 commit | `<git rev-parse --short HEAD>` |

重點數字（3 次中位數）：

| | 桌機 | 手機視口 |
| :--- | ---: | ---: |
| Canvas | <MB（個數）> | <MB（個數）> |
| 貼圖估算 | <MB> | <MB> |
| 啟動到標題 | <s> | <s> |
| 各機位幀時間 p95 | <ms 範圍> | <ms 範圍> |

備註：<和其他環境不一樣的地方、跑不起來的指令、需要的額外設定>
```
