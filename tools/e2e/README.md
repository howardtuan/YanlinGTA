# 劇情機器人（Story Bot）

位於 `tools/e2e/` 的網頁遊戲自動化端對端測試工具，用真實玩法跑完故事模式並產出報告。

- 零 npm 相依套件
- 環境需求：Node.js 22 以上（使用內建 `WebSocket`）、Google Chrome

## 檔案結構

- `story-bot.mjs`：主程式，負責啟動伺服器、用 Chrome DevTools Protocol（CDP）開啟 Chrome、按下「開始遊戲」、收集結果並寫出報告。
- `serve.mjs`：極小的靜態檔案伺服器，也可單獨使用：`node tools/e2e/serve.mjs --root=<repo> --port=5173`。
- `cdp.mjs`：負責啟動 Chrome 與建立 CDP 連線。
- `page-init.js`：在遊戲程式載入前注入頁面，負責固定時間步、只在需要時繪圖、固定亂數種子，以及寫入畫質設定。
- `bot-page.js`：在頁面裡實際操作遊戲的機器人。
- `out/`：報告與截圖輸出資料夾（已被 `.gitignore` 忽略）。

## 執行方式

### macOS

先 `cd` 到 repo 目錄、裝好相依套件（`npm ci`）後執行。機器人會先跑 `npm run build`，再把建置出來的 `dist/` 當網站送給 Chrome（改用 Vite 之後，原始碼沒打包就不能直接在瀏覽器裡跑）；已經建置過、想省時間可以加 `--no-build`。

```bash
# 預設（SwiftShader 軟體算圖）
node tools/e2e/story-bot.mjs

# 使用 Mac 的 GPU
node tools/e2e/story-bot.mjs --gpu

# 測試其他 worktree
node tools/e2e/story-bot.mjs --root=../YanlinGTA-wt/a-main-gate
```

### Windows（PowerShell）

```powershell
cd <YanlinGTA 資料夾>
node tools\e2e\story-bot.mjs

# GPU 不能用時改用軟體算圖
node tools\e2e\story-bot.mjs --swiftshader
```

PowerShell 視窗若顯示亂碼，先執行 `[Console]::OutputEncoding = [Text.Encoding]::UTF8`（`report.json` 一律是 UTF-8，不受影響）。

透過 SSH 執行時，Chrome 會跑在非互動工作階段，GPU 時有時無（實測在一台 RTX 4070 Ti 的 Windows 電腦上，有時拿得到 GPU，有時 WebGL 建不起來或 GPU 行程當掉、context 掉了）。所以 Windows 預設的流程是：先用 GPU，載入到標題畫面後檢查 WebGL；context 掉了、載入時出現 WebGL 錯誤，或 Chrome 自己退回 SwiftShader，就重開 GPU 再試一次，還是不行就改用 SwiftShader（並套用 SwiftShader 的預設值）。每次嘗試記在 `report.json` 的 `gpuAttempts`，失敗那次的錯誤也記在那裡，不算進本次結果。明確指定 `--gpu` 時只會重試 GPU，不會退回 SwiftShader。實際用到的算圖裝置看 `renderer` 欄位（含 `SwiftShader` 字樣就是軟體算圖）。

Chrome 會以 `--headless=new`、暫時的 `--user-data-dir` 與 `--remote-debugging-port=0` 啟動，執行結束後自動刪除暫存資料夾。

### 結束代碼

- `0`：到達結局、沒有使用任何 fallback、沒有頁面例外或 console 錯誤。
- `1`：不符合上述任一條件。

## 指令選項

| 選項 | 說明 |
| --- | --- |
| `--root=<dir>` | 要測的 repo，預設是目前的 repo，可指到其他 worktree（那個資料夾要先 `npm ci`）。有 `vite.config.js` 就先建置再送 `dist/`，沒有（改用 Vite 之前的版本）就直接送整個資料夾。 |
| `--no-build` | 不重新建置，直接送現有的 `dist/`。 |
| `--chrome=<path>` | Chrome 執行檔路徑，也可用環境變數 `CHROME` 指定。預設 macOS 為 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`；Windows 為 `C:\Program Files\Google\Chrome\Application\chrome.exe`。 |
| `--gpu` / `--swiftshader` | 切換算圖模式。預設 macOS 用 `swiftshader`（`--use-angle=swiftshader --enable-unsafe-swiftshader`）；Windows 用 GPU（`--use-angle=d3d11 --ignore-gpu-blocklist`），GPU 不能用時自動重試一次再退回 SwiftShader（見上方說明）。macOS 加 `--gpu` 會用 Metal（`--use-angle=metal`），速度快很多，適合開發時反覆跑。 |
| `--width=960` `--height=540` | 瀏覽器視窗寬度與高度。 |
| `--fixed-dt=0.0333` | 固定時間步長（秒）。 |
| `--steps-per-frame` | 每個真實動畫幀跑幾個遊戲幀（預設 `swiftshader` 為 `4`，`gpu` 為 `1`）。 |
| `--render-every` | 每幾個遊戲幀畫一次畫面，`0` 表示只在截圖時畫（預設 `swiftshader` 為 `0`，`gpu` 為 `1`）。 |
| `--quality=low\|medium\|high\|auto` | 遊戲畫質設定（預設 `swiftshader` 為 `low`，`gpu` 為 `auto`）。 |
| `--seed=1` | `Math.random` 的種子，`0` 表示不固定。 |
| `--timeout=60` | 真實時間上限（分鐘）。 |
| `--stall=30` | 某一段沒有進展的遊戲時間上限（秒），超過就用備援瞬移。 |
| `--route=auto\|roads\|offroad` | 路線策略。`roads`：只走道路圖（路口可在路面範圍內切彎）；`offroad`：在空地（草地、廣場）上抄直線；`auto`（預設）：限時任務計時中才抄空地，其餘照道路走。 |
| `--out=<dir>` | 輸出資料夾，預設為 `tools/e2e/out`。 |
| `--headful` | 顯示瀏覽器視窗。 |
| `--no-shots` | 不截圖。 |
| `--strict` | 已知無害的 Chrome 記錄錯誤也算失敗。 |
| `--debug` | 每次回報都印出控制器狀態。 |
| `--help` | 顯示說明。 |

## 測試範圍與故事步驟

| 步驟 | 名稱 | 內容與時限 |
| --- | --- | --- |
| `0` | 序章 | 走到資管系館 |
| `1` | 任務一 傳單大作戰 | 5 個公布欄（不限順序），限時 180 秒，之後回系館回報 |
| `2` | 任務二 食字路口 | 夜市十字路口（實踐路黃色網狀線，導航自動設好）來回，限時 120 秒（買到後剩不到 60 秒會補到 60 秒） |
| `3` | 任務三 掃街拉票 | 發傳單拿 15 票，不限時 |
| `4` | 任務四 布條保衛戰 | 依序到 6 個地點，限時 120 秒 |
| `5` | 任務五 布條失竊案 | 騎到中北路的孫師傅牛肉拉麵，走側門、樓梯上二樓進彥霖以前的房間，坐到書桌前按 E 用電腦；在終端機輸入 `case`，用 SQL 查出線索後 `accuse 小明`，關電腦，再走出來 |
| `6` | 任務六 宿舍拉票 | 力行宿舍二樓 276～281 門口各按一次 E（bot 還不會上二樓，直接觸發門口動作並記成 fallback） |
| `7` | 終章 政見發表會 | 到學生活動中心，接著進入結局 |

支線（麥當勞打工、新中北路側門門禁、手機）不在測試範圍內；機器人遇到打工或手機畫面跳出來時，會按 `E` 離開。

## 運作原理

### 操作與輸入

機器人用真正的玩法跑完故事模式：走路或騎機車沿道路到每個目標、按 `E` 推進對話、按 `F` 上下車、在時限內完成限時任務、發傳單（滑鼠左鍵）給路人，一路到結局畫面。所有輸入只透過遊戲的 `Input` 物件（`window.game.input`）送出，包含按住的按鍵、單次按鍵，以及觸控搖桿的類比通道 `input.joy`（和手機搖桿相同），每一幀在 `Input.endFrame()` 之後執行一次，不會直接設定位置或速度。

### 導航與避障

- 道路尋路：在 `window.game.world` 的道路圖（graph）上做 A*。騎機車優先走車道，人行道與反向單行道會加成本；走路時所有道路都可以走。
- 繞障與拉直：撞到靜態障礙物的路段會改用 0.7 公尺格子 A* 繞過，接著再做「拉直」，只在不撞東西且仍在道路範圍內時才抄近路。
- 控制與脫困：用 pure pursuit 控制方向盤，依前方彎度減速，遇到行人與車輛時從旁邊閃過；卡住超過 1.5 秒就倒車並反向打方向。
- 任務目標：從 `game.missions` 讀取（`goto` 目標、checkpoint 清單、拉票數）。任務一的 5 個公布欄不限順序，機器人會用實際路徑長度算出最短順序；依序的檢查點會把下一站的路徑接在後面，提前為下一個彎減速。
- 抄捷徑（`--route`）：限時任務計時中，預設改用 2 公尺格子在空地上規劃直線路徑（稍微偏好道路），再拉直。只走道路時任務四的 6 站總長約 1.7 公里，120 秒內要平均 14 m/s 以上，實測做不到；抄空地後約 1 公里。
- 目標能不能進入：每個目標會先在周圍 120 公尺的格子上做洪水填充（從外圍空地出發，用機車或人物的碰撞半徑），確認有沒有一點能走進任務判定的圓圈。進不去的目標會先騎到最近的可到達點，再用備援瞬移跳進圓圈，等遊戲算到之後再跳回可到達的地面；兩次都會記成 fallback，並在主控台印出 `objective ... cannot be entered`。

### 固定時間步與繪圖頻率

`page-init.js` 會覆寫 `requestAnimationFrame` 與 `performance.now`，把每一幀的遊戲時間固定為 `--fixed-dt`（預設 `0.0333` 秒），讓執行結果和 Chrome 畫得多快無關。限時任務的計時以及報告裡的時間，全都是遊戲時間。

`--steps-per-frame=N` 設定每個真實動畫幀跑 `N` 個遊戲幀；`--render-every=N` 設定每 `N` 個遊戲幀才畫一次，`0` 表示只在截圖時畫。遊戲邏輯不會讀取畫面，所以不畫圖只影響看到的東西，不影響玩法。SwiftShader（軟體算圖）畫一幀需要好幾秒，因此軟體模式預設只在截圖時畫圖、每幀跑 4 個遊戲幀。

### 備援機制（Fallback）

某一段超過 30 秒遊戲時間（可用 `--stall` 調整）沒有進展、同一個限時任務失敗 2 次，或目標經洪水填充確認根本進不去，機器人會「瞬間移動」到前方路徑或目標點。畫面與報告裡都會明確標示為 `FALLBACK_TELEPORT`，這一步會算失敗，但仍會繼續跑完後面的步驟。

## 輸出與報告

### 主控台摘要與截圖

- 主控台摘要表：印出每一步的步驟、`PASS`/`FAIL`、遊戲秒數、限時任務實際用時／時限、移動距離、fallback 次數、錯誤數、`fps`、繪圖 `fps`。
- 截圖：`out/step-00.jpg` 到 `out/step-05.jpg` 是每一步完成時的畫面，`out/step-99-ending.jpg` 是結局畫面（也就是終章完成的畫面）。
- 主控台的 `drawing` 行與 `report.json` 的 `renderStats`：整趟實際畫了幾幀、每幀平均幾毫秒。SwiftShader 預設只在截圖時畫圖，所以只有少數幾幀，每幀可能要好幾秒。

### `out/report.json` 欄位說明

頂層欄位：

- `renderer`：WebGL `UNMASKED_RENDERER`，以及 `vendor`/`version`。
- `chrome`、`git`（`branch`/`sha`）、`config`、`loadSec`：瀏覽器資訊、git 版本、執行設定與載入秒數。
- `renderStats`：`framesDrawn`、`gameFrames`、`avgRenderMs`、`renderFps`。
- `mode`、`gpuAttempts`：最後採用的算圖模式，以及每次嘗試的模式、renderer、成功與否和原因。
- `webglContextLost`：WebGL context 掉了（例如 GPU 被其他程式占滿），這時畫面不會更新、`consoleErrors` 會有 three.js 的 shader 錯誤，但遊戲邏輯照跑。
- `steps[]`：每一步的詳細資料（欄位見下方）。
- `ending`、`endingVotes`、`playTimeSec`：結局、結局票數與遊戲總時間。
- `fallbacks`、`pageErrors`、`consoleErrors`、`networkErrors`、`botErrors`：備援紀錄與各類錯誤。
- `ignoredErrors`：已知無害的錯誤（例如 `src/ui/phone/Nano.js` 先用 `zh` 探測 Gemini Nano 被 Chrome 記成錯誤）。
- `events`、`screenshots`、`verdict`、`exitCode`：所有事件時間軸、截圖清單、整體判定與結束代碼。

`steps[]` 單一步驟欄位：

- `idx`、`name`、`objective`：步驟編號、名稱與目標。
- `startGameSec`、`endGameSec`、`durationGameSec`：開始、結束與花費的遊戲秒數。
- `limitSec`、`timedGameSec`、`timerLeftSec`：任務時限、最後一次嘗試從計時開始到完成的遊戲秒數、剩餘秒數。
- `attempts`：每次計時嘗試的 `start`、`end`、`left`、`failed`。
- `pass`、`missionFails`、`fallbacks`：是否通過、限時失敗次數、每次瞬移的原因與起點、終點。
- `distanceM`、`legs`、`votes`：移動距離、每一段的目標／模式／路徑長度、票數。
- `pageErrors`、`frames`、`realSec`、`fps`、`gameSpeed`、`renders`、`renderFps`：該步頁面錯誤、遊戲幀數、真實秒數、每真實秒跑幾個遊戲幀（`fps`）、遊戲秒／真實秒（`gameSpeed`）、繪圖次數、實際畫圖時每秒幾幀（`renderFps`）。

### 重現性

固定時間步加上固定亂數種子（`--seed`），同一份程式碼、同樣選項跑兩次，每一步的遊戲時間會一樣或非常接近；換機器或換 GPU／SwiftShader 也只會有小差異（行人與車流的位置會影響閃避路線）。

## 目前已知的遊戲問題（機器人會回報）

- 任務四最後一站「管理大樓」的檢查點 (117.4, 59.0) 落在管理大樓的建築碰撞裡面（`src/systems/MissionSystem.js` 用 `world.nearestRoadPoint()` 取最近道路點，取到一條穿過建築的 tunnel service 道路），能走到的最近點離它約 12 公尺，大於判定半徑 7 公尺。正常玩法無法完成任務四，所以機器人在這裡會印出 `objective 管理大樓 ... cannot be entered` 並用兩次備援瞬移（跳進去、跳回來），任務四記為 FAIL，結束代碼為 1。修好之後同一個指令應該就會全部 PASS。

## 怎麼看失敗

1. 先看 `verdict` 與每一步的 `pass`，確認哪一步失敗。
2. `fallbacks` 有內容，代表那一步沒能用正常玩法完成。
3. `missionFails` 有記錄，代表限時任務逾時而被遊戲重來。
4. 看 `events` 時間軸：`reverse`、`replan`、`sidestep` 次數多的地方，通常就是卡住的位置。
5. 搭配對應步驟的截圖一起檢查。
