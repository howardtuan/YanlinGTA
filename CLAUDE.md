# YanlinGTA 給 Claude 的專案規則

## 在 Mac 上測試要靜音

在 Mac 本機開遊戲測試（瀏覽器預覽、page eval、截圖檢查等）時完全不能發出聲音。頁面一載入、**按「開始遊戲」之前**，就先執行下面這段把聲音鎖死，之後再做其他事；重新整理頁面後要再執行一次。

```js
const AC = window.AudioContext || window.webkitAudioContext;
AC.prototype.resume = function () { return Promise.resolve(); };          // 音訊永遠不會被打開
const play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return play.call(this).catch(() => {}); };
document.querySelectorAll('audio,video').forEach(e => { e.muted = true; e.pause(); });
// 進遊戲後再保險一次
try { window.game?.audio?.ctx?.suspend(); if (window.game?.audio?.master) window.game.audio.master.gain.value = 0; } catch (e) {}
```

在家中 GPU 機器上跑的通關機器人不受這條限制。

## 無頭 Chrome 不要開在 Mac 上

街景擷取、Google Maps 查資料、遊戲截圖這類需要無頭 Chrome 的工作，一律把 Chrome 開在家裡的 oldpc（RTX 4070 Ti）或 olddesk（GTX 1060），不要在筆電上 `spawn('/Applications/Google Chrome.app/...')`。

```js
import { launchRemoteChrome } from '/Users/richard/Workspace/scripts/remote-chrome.mjs';
const chrome = await launchRemoteChrome({ port, args: ['--lang=zh-TW', '--window-size=1280,720'] });
// 照舊連 http://127.0.0.1:${port}（SSH 通道接回 Mac），其他程式碼不用改
try { /* ... */ } finally { chrome.kill(); }
```

- 不指定主機時依權重自動分配，預設 oldpc:olddesk = 4:1（實測同時開 8 支，oldpc 整批 10 秒、olddesk 47 秒）。會把 Mac 上所有 session 開著的通道一起算進去，所以多個 session 同時跑也會照比例分，不用自己分工。要改比例設 `REMOTE_CHROME_WEIGHTS=oldpc:4,olddesk:1`（設 0 就不用那台），要指定單台就傳 `host: 'oldpc'` 或設 `REMOTE_CHROME_HOST`。
- 一次要開很多支時，直接同時呼叫 `launchRemoteChrome()` 就好，不用自己挑主機。olddesk 同時開超過 2～3 支會明顯變慢，自己切批次時，每批交給 olddesk 的量大約是 oldpc 的四分之一。
- 每支開好後工具會實際測一次 WebGL，拿不到顯示卡就自動重開；區網連不上會自動改走 Tailscale。
- 預設用遠端的顯示卡跑 WebGL；Mac 專用的 `--use-angle=swiftshader` 這類參數會自動拿掉。
- 不是 node 的工具可以用命令列：`node ~/Workspace/scripts/remote-chrome.mjs <port> [--host oldpc]`，印出 `READY` 後就能連，結束時 kill 掉這支程式。
- **跑完一定要關**：腳本結束前呼叫 `chrome.kill()`，背景跑的批次工作做完也要確認收掉。ssh 一斷，遠端 2 秒內會自己清乾淨。交出結果前先用 `pgrep -fl 'remote-chrome-tunnel|Google Chrome.*headless'` 確認自己沒有留下通道或 Mac 本機的無頭 Chrome。
- 兩台都連不上時，先問使用者，不要自己改回在 Mac 上跑。
