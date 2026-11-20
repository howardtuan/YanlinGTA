<p align="center"><img src="assets/loading.jpg" alt="中原順起來 · 資管要贏 票投彥霖" width="100%"></p>

# 中原順起來 · 資管要贏 票投彥霖

第34屆 中原大學資訊管理學系 系學會會長候選人 **彥霖（Yanlin）** 的競選宣傳網頁遊戲。

開放世界 3D 中原大學（地圖依 OpenStreetMap 真實資料搭建），玩法類似《臺北狂飆》：騎著粉白色 **SYM JET SL** 穿梭校園、中原夜市，走進資管系館上樓進教室、到活動中心的麥當勞點餐、坐進警衛室值班，一路幫彥霖拉票！電腦與手機瀏覽器都能玩，免安裝。

---

## 🚀 本機啟動

這是**純靜態網站**，沒有 build 步驟，但因為使用 ES Modules，**不能直接雙擊 `index.html` 開啟**，一定要透過本機伺服器。以下任選一種：

### 方法 1：Python（Windows / macOS / Linux 大多已內建）
```powershell
cd YanlinGTA
python -m http.server 5173
```
瀏覽器打開 👉 http://localhost:5173

> macOS / Linux 若沒有 `python`，改用 `python3 -m http.server 5173`。

### 方法 2：Node.js
```powershell
cd YanlinGTA
npx serve -l 5173 .
```
瀏覽器打開 👉 http://localhost:5173

### 方法 3：Docker 🐳
需要先安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

**用 docker compose（最簡單）**
```powershell
cd YanlinGTA
docker compose up -d --build
```
瀏覽器打開 👉 http://localhost:8080

停止：
```powershell
docker compose down
```

**或只用 docker 指令**
```powershell
docker build -t cycu-shun-qi-lai .
```
```powershell
docker run -d --name cycu-shun-qi-lai -p 8080:80 cycu-shun-qi-lai
```
瀏覽器打開 👉 http://localhost:8080 ；停止並移除：`docker rm -f cycu-shun-qi-lai`

（映像檔使用 `nginx:alpine` 提供靜態檔案，設定在 `docker/nginx.conf`。）

### 方法 4：部署到網路
整個資料夾直接丟到 GitHub Pages / Vercel / Netlify / Cloudflare Pages 即可，不需要任何設定。
GitHub Pages：Repo → Settings → Pages → Source 選 `main` 分支根目錄。

---

## 🎮 玩法

| 模式 | 內容 |
|---|---|
| **開始遊戲（故事模式）** | 序章 → 傳單大作戰（限時送 5 個公布欄）→ 中原夜市宵夜補給 → 掃街拉票 → 布條保衛戰（依序計時賽）→ 學生活動中心政見發表會 → 當選結局 |
| **自由探索** | 收集 34 張金色選票、對同學發傳單拉票、到處亂逛 |

### 可以進去的地方
- **資訊管理學系館**：依照真實外觀還原（灰色菱形花紋走廊欄杆、紅色飾條、綠色牆裙、紅門、左側紅框玻璃電梯、右側米色磁磚樓梯間）。可以走樓梯或搭電梯上 1F～3F、進每一間教室。
- **電腦教室（101、301）**：每台電腦都能按 `E` 使用，會跳出影片播放器。
- **麥當勞（活動中心東側）**：走進去在櫃檯按 `E` 點餐。
- **正門警衛室（中北路）、側門警衛室（A6 校門）**：走進去按 `E` 坐下值班，旁邊的柵欄會在騎車靠近時自動升起。

### 操作
| 動作 | 鍵盤滑鼠 |
|---|---|
| 移動 / 視角 | `W` `A` `S` `D` / 滑鼠（點畫面鎖定游標） |
| 衝刺 / 跳 | `Shift` / `Space` |
| 互動（電梯、點餐、坐下、電腦、對話） | `E` |
| 上下車 | `F` |
| 發傳單拉票 | 滑鼠左鍵 |
| 比 ✌ | `G` |
| 喇叭 / 甩尾 | `H` / `Space`（駕駛中） |
| 地圖 | `M` |
| **設定 / 暫停** | `Esc` |

手機：左下搖桿移動、右側拖曳轉視角、右下按鈕操作（⚙ 為設定）。

### 🖥 畫面與畫質
- **光影**：物理大氣天空（日出、正午、夕陽、夜晚隨遊戲時間變化）、飄動的雲、星空與月亮；天空即時反映在玻璃窗與車身上（環境反射）；柔和陰影、遠景霧氣、Bloom 光暈與電影調色。
- **材質**：柏油、連鎖磚、人行道、草地、跑道、水面都是程序生成的 PBR 材質（含法線與粗糙度），並貼合真實地形起伏。
- **校園**：依實景照片替校舍套用不同外牆（懷恩樓／工學館棕褐面磚、科學館磚紅＋白色樓層帶、土木館斑點洗石子…），加上樓層線、牆腳陰影、頂樓冷氣；正門黑色石牆校名＋斜立不鏽鋼柱；資管系館前與大草坪四周的雨豆樹、大王椰子、黑松與灌木（會隨風搖曳），大草坪中央保持空曠。
- **街景**：一樓店面鐵捲門與浪板遮雨棚、廟宇屋頂、夜市條紋棚、燈籠與小吃招牌。
- **夜晚**：窗戶燈光、路燈光束與真實照明、招牌與夜市燈籠發光。

按 `Esc` →「畫質」可切換 **自動 / 低 / 中 / 高**（自動＝電腦高、手機低，設定會記住）。天空、陰影、後製與路燈照明會立即切換；抗鋸齒、補建街區後排與人車數量在重新整理後套用。

### 🎵 音樂設定
按 `Esc`（或標題畫面「設定 / 音樂」）可以：
- 選擇背景音樂：**彥霖歌劇**（預設，無限循環播放）／**預設音樂**（遊戲內建合成音樂）／關閉
- 調整**音樂音量**、**音效音量**、滑鼠靈敏度
- 畫質（自動／高／低）與**補建街區**開關（OSM 沒資料的空白街區是否補上程式生成的示意建物，重新整理後套用）

設定會記在瀏覽器裡，下次打開還在。

---

## 🖼 載入畫面
開啟網頁與按下「開始遊戲」後，會顯示主視覺 `assets/loading.jpg` 與約 5 秒的讀取條（建立地形中、蓋資管系館…）。
要換圖：把新圖片存成 `assets/loading.jpg` 即可。

---

## 📁 專案結構
| 路徑 | 內容 |
|---|---|
| `index.html`, `css/style.css` | 頁面、HUD、選單 |
| `js/main.js` | 遊戲主程式（迴圈、選單、設定、互動） |
| `js/missions.js` | **所有劇情台詞與政見文字（要改文案改這裡）** |
| `js/interiors.js` | 可進入的建築：資管系館、麥當勞、警衛室（樓層、樓梯、電梯、互動） |
| `js/player.js` | 主角彥霖的造型 `YANLIN_LOOK`、操作、鏡頭 |
| `js/character.js` | 3D 角色模型與動作（走、跑、騎車、坐、✌） |
| `js/vehicles.js` | 機車（含 SYM JET SL）/ 汽車模型與物理 |
| `js/npc.js` | 車流、路人、任務 NPC |
| `js/map.js` | 由地圖資料生成建築（依校舍套用不同外牆）、道路與標線、路燈、夜市、鐘塔、正門校名牆、舊校門、噴水池 |
| `js/sky.js` | 天空（大氣散射＋雲＋星空月亮）、太陽／環境光、霧、陰影、環境反射 |
| `js/post.js` | 後製特效（Bloom、調色、暗角）與畫質切換 |
| `js/textures.js` | 程序生成 PBR 材質：柏油、連鎖磚、草地、各式外牆、屋頂、樹葉… |
| `js/vegetation.js` | 雨豆樹、圓冠樹、黑松、大王椰子、灌木（含風吹搖曳） |
| `js/terrain.js` | 地形高度查詢（`H(x,z)`）與橋面；遊戲邏輯的高度都是「離地高度」，只有畫面位置加上地形 |
| `js/hud.js` / `js/audio.js` / `js/input.js` | 小地圖與大地圖 / 音效與音樂 / 鍵盤滑鼠觸控 |
| `data/cycu.json` | 處理過的地圖資料 |
| `data/terrain.json` | 10 m 地形格網（由內政部 DTM 產生，相對高程 135 m） |
| `assets/music/yanlin-opera.m4a` | 彥霖歌劇 |
| `tools/build_map.py` | 由 `tools/osm_raw.json`（OSM 原始資料）重新產生 `data/cycu.json`：`python tools/build_map.py` |
| `tools/block_survey.json` | OSM 沒有資料的空白街區用途調查（目視判斷的文字紀錄）與補建規劃，`build_map.py` 依它補上示意建物與地面 |
| `tools/build_terrain.py` | 由內政部 20m DTM（分幅_桃園市DEM，圖幅 96224020）產生 `data/terrain.json`；原始 zip 放 `tools/.cache/`（不進 repo），下載網址寫在檔案開頭 |
| `Dockerfile`, `docker-compose.yml`, `docker/nginx.conf` | Docker 部署 |

## 授權與來源
- 地圖資料 © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors，ODbL 授權。
- 地形資料：內政部 20m 網格數值地形模型（DTM），依[政府資料開放授權條款第1版](https://data.gov.tw/license)使用。`data/terrain.json` 是由它取樣、平滑並把可進入的建物周圍壓平後的衍生資料。
- **補建街區**：OSM 在本區約 46% 的面積沒有任何建築或圖徵。這些街區的用途（透天、店面街、廠房、田地、樹林、工地…）是用眼睛看 Google 街景與衛星圖判斷後記成文字（`tools/block_survey.json`），再由 `tools/build_map.py` 用固定亂數種子**程式生成**街屋、廠房、地面與鐵皮圍籬。它們只是示意，**不是真實建物輪廓**，位置、數量與高度都不精確；沒有下載、儲存或描繪任何影像。資料裡標 `synthetic: 1`，可在設定選單「🏘 補建街區」關閉（重新整理後套用）。
- 部分建築外觀（樓層、外牆色、屋頂造型）參考 Google 街景目視判斷，僅用眼睛觀看比對，未下載、未儲存也未使用其影像；所有材質都是程式生成。各筆依據見 `tools/overrides.json` 的 `source`。
- [Three.js](https://threejs.org/)（MIT）位於 `vendor/`（後製模組在 `vendor/jsm/`）。
- 這是學生競選宣傳用的非商業同人作品；遊戲中出現的店家、品牌名稱屬於各自的權利人。
