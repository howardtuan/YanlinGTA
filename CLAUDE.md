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
