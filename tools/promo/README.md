# 宣傳片錄製與剪輯工具（`tools/promo/`）

線上 Wiki 首頁播放的 100 秒宣傳片（v3）（`wiki/media/promo.mp4` 與封面 `wiki/media/promo-poster.jpg`），以及歸檔於 `docs/promo-archive/promo/` 的無配樂母帶（`yanlin-promo-100s-v3-nobgm.mp4`），都是用這裡的工具做的：畫面全部是遊戲本身實際跑出來的，用 GPU Chrome 以**固定時間步逐格錄製**（不掉幀、可重現），再用 [Remotion](https://www.remotion.dev/) 剪輯、上字幕與配樂。不進遊戲執行期，只有 `wiki/media/` 會隨 Wiki 靜態站輸出至 `dist/wiki/media/`。

## 檔案

| 檔案 | 作用 |
| --- | --- |
| `rec.mjs` | 錄影 daemon：送出 `dist/`、開 GPU Chrome（1920×1080，`--mobile` 為 844×390 觸控手機），在 `http://127.0.0.1:7788` 接指令：`/eval` 執行頁面 JS、`/shot` 截一張、`/rec` 逐格錄 N 格（可 `clip=` 只截某區、`rate=` 放慢 CSS 動畫）、`/quit`。重用 `tools/e2e/` 的 `cdp.mjs`、`serve.mjs`。 |
| `rec-init.js` | 遊戲程式載入前注入：虛擬時鐘（每格固定 1/30 秒，手動步進）、固定亂數種子、畫質 high、關閉配樂。 |
| `director.js` | 頁面內的導演工具 `window.__D`：藏 HUD、設時間、瞬移、貼地相機路徑（Catmull-Rom）、用虛擬搖桿真的騎車沿路走、點擊提示圈、打字、捲動、等待真實執行結果。 |
| `boot.sh` | 啟動 daemon → 標題畫面 → 開始遊戲 → 自由探索並載入 `director.js`。 |
| `shots-a.sh` / `shots-b.sh` / `shots-c.sh` | 分段錄製：A 校園第一人稱、B 手機 APP 與直升機空投、C 電腦教室與六個電腦程式、收場。可只錄某幾段，例如 `tools/promo/shots-a.sh "gate tower"`。 |
| `sheet.sh` | 抽每段首／中／尾格拼成縮圖表，檢查用。 |
| `video/` | Remotion 剪輯工程：時間軸在 `src/Promo.tsx`，手機／電腦六宮格、標題卡、片尾在 `src/scenes.tsx`；配樂只用遊戲自己的情境曲（`scene-day/timed/night/ending`），音效也取自 `assets/sfx/`。 |

## 重做一次

```bash
npm ci && npm run build          # 錄影用的是建置後的 dist/
tools/promo/boot.sh              # 等到印出 "free"
tools/promo/shots-a.sh           # 依序錄 A、B、C（輸出在 tools/promo/out/clips/，已 gitignore）
tools/promo/shots-b.sh
tools/promo/shots-c.sh warm      # 先預熱 Pyodide / sql.js，之後的批改一兩格內就有結果
tools/promo/shots-c.sh
curl -s http://127.0.0.1:7788/quit
tools/promo/boot.sh --mobile     # 手機版畫面另開一次
tools/promo/shots-b.sh mobile    # d13_mobile

# 影格序列轉成 mp4，放進 Remotion 的 public/clips/（已 gitignore）
mkdir -p tools/promo/video/public/clips
for d in tools/promo/out/clips/*/; do
  ffmpeg -y -framerate 30 -i "$d/f%05d.jpg" -c:v libx264 -crf 15 -pix_fmt yuv420p "tools/promo/video/public/clips/$(basename $d).mp4"
done

cd tools/promo/video && npm ci
npm run render         # out/yanlin-promo.mp4（配樂版）
npm run render:nobgm   # out/yanlin-promo-nobgm.mp4（只有音效）
```

交付檔另外以 `-crf 23` 壓縮並把響度標準化到約 -16 LUFS（`ffmpeg -af loudnorm=I=-16:TP=-1.5:LRA=11`）。

## v3：2 分鐘版（`YanlinPromo3`）

分鏡與設計 spec 在 [`storyboard-v3.md`](storyboard-v3.md)。錄影改用 bash 腳本，JS 經由 stdin 傳給 daemon（Windows 的命令列參數會把中文弄亂）：

```bash
node tools/promo/rec.mjs &                  # 等 out/rec.log 印出 recorder ready，再照 boot.sh 進入自由探索
tools/promo/shots_v3.sh campus              # campus / area / phone / pc / zz / end，或單支名稱，例如 "t_train z_film"
tools/promo/shots_v3.sh "pc_setup c_sql"    # 電腦段先跑 pc_setup（預熱 Pyodide / sql.js）
```

- 錄影時電腦桌布一律是遊戲預設的藍色漸層（`director.js` 的 `#promoWall`），不會拍到自訂桌布。
- 吱吱支線（`z_*`）要照順序錄：加好友 → 邀約 → 來電 → 影片 → 殘廢澡 → 排球 T。
- Wiki 畫面最後錄：把 daemon 的頁面導到 `/wiki/`，錄首頁捲動 `w_home`，各頁截圖放 `video/public/stills/`。
- 手機版 `d13_mobile` 要用 `rec.mjs --mobile` 另開一次。
- 渲染：`cd tools/promo/video && npm run render3`（配樂版）、`npm run render3:nobgm`（只有音效）。

## 注意

- 專案放在 iCloud 同步的「桌面」時，macOS 可能把檔案卸載成雲端佔位檔，Remotion 打包會讀到空的 `package.json` 而失敗；請把 repo 放在不受 iCloud 同步的資料夾。
- 遊戲本身的地名浮動標籤會在收場鏡頭關掉（`label.material.visible = false`），只影響錄影，不改遊戲。
