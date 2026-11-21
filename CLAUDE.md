# YanlinGTA 給 Claude 的專案規則

## 在 Mac 上測試要靜音

在 Mac 本機開遊戲測試（瀏覽器預覽、page eval、截圖檢查等）時不要發出聲音：遊戲一載入就先靜音，再做其他事。

```js
await window.game.audio.ctx.suspend();
document.querySelectorAll('audio,video').forEach(e => { e.muted = true; e.pause(); });
```

在家中 GPU 機器上跑的通關機器人不受這條限制。
