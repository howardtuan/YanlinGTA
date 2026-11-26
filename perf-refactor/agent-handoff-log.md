# Agent 跨階段交接紀錄 (`agent-handoff-log.md`)

> [!NOTE]
> **交接規範（每次任務結束必寫）**
> 凡執行本重構計畫任一階段或子任務的 Agent／開發者，在發送 PR 前（或工作結束中斷時），都必須在本文件**最上方（最新一筆在最前）**新增一筆標準格式交接紀錄，確保下一位接手的 Agent 能無痛承接上下文，不重複踩雷。

---

## 交接紀錄範本（複製使用）

```markdown
### Session #XXX｜YYYY-MM-DD｜負責階段：Phase X
- **工作分支 / PR**：`refactor/...`（PR #... / 個人 Fork 測試網址：...）
- **本輪已完成**：
  - ...
- **實機與量化數據變化**（`profile_scene.mjs` / Mac Web Inspector / iPhone `?diag=1` & `?perf`）：
  - 載入結果：...
  - Memory / Canvases / Texture / Draw Calls / Tris / FPS：...
- **新發現的技術細節或踩雷**：
  - （同步補進 `pitfalls-and-memory.md`）
- **下一棒確切待辦（Next Actionable Step）**：
  1. ...
```

---

### Session #011｜2026-11-26｜負責階段：Phase 2 PR #5 第二部分（地面挖洞改 CPU，移除 `cutMask()` `discard`）
- **工作分支 / PR**：`refactor/ground-cut-cpu`（規劃表 PR #5 的第二部分）
- **本輪已完成**：
  1. 新增 `src/world/GroundCut.js`：地下道開口（`cutRects`）、下沉水池外圈與水溝（`sinkPlan().cut`：矩形＋轉角圓盤，圓盤用外接 32 邊形）、坑洞（`pitList()` 中 `mask` 為 true 者）。地面網格（`groundGeometry`）與用遮罩材質的貼地圖層（`addFlat()` 遇到 `maskCut()` 標過的材質就呼叫 `Geo.cutHoles()`）在建置時把三角形沿洞的邊線切開，洞裡的部分不產生；所有頂點屬性（位置、法線、顏色、UV）線性內插，地面法線沿用整張網格算好的值，切過的地方光影不變。
  2. 刪除 `cutMask()` 與 `sinkPlan().glsl`（每個地面／鋪面／水面像素原本要跑幾十個 `if (...) discard;`），`Terrain.js` 的 `pitRects()` 已無人使用一併刪除。
  3. **偏離規格**：規格寫「比照 `PhysWorld` 的 1 m 子網格」，實作後截圖給使用者看：水池、水溝、地下道入口邊緣變成 1 m 鋸齒並露出天空（見 `pitfalls-and-memory.md` 踩雷 #12），**使用者決定改成精準切**。碰撞地形不動。
  4. 單元測試 `tests/unit/ground-cut.test.js`（7 項：遠處不動、坑洞精準、斜矩形與凹多邊形面積、圓盤 32 邊形、內插、繞向、大三角形與底下格子切出相同的洞）；把「丟掉洞裡的塊」改壞時其中 4 項會失敗。
- **實機與量化數據變化**：
  - **GPU 時間**（Apple M1、`desktop-igpu`、`medium`，38 個固定畫面，`EXT_disjoint_timer_query_webgl2`，兩個版本輪流跑兩輪抵消發熱）：開工前在 main 上暫時關掉遮罩，平均 21.30 → 20.59 ms（−3.3%，俯瞰 −3～−10%）；實作後 main → 本分支平均 20.58 → 20.16 ms（−2.0%）。單一畫面的雜訊約 ±10%，效益小。
  - **畫面**：`desktop-dgpu`、`low`，95 個固定機位 91 個逐像素相同，4 張空拍只差 11–46 個像素（洞口邊線）；39 個洞口特寫（`medium`）只有洞口邊線 1 像素寬的抗鋸齒差異，開 MSAA 時邊緣更平滑。
  - **開機**：切洞在 M1 上約 62 ms（貼地圖層）＋地面網格建置共 66 ms；手機估計 0.3–0.4 秒。
  - **三角形**：手機標題畫面 1349k → 1353k（+0.3%），繪圖呼叫不變。
  - **記憶體**（強制 GC 後，`mobile-lite`）：JS heap 368 / 368 MB，畫布 21.9 / 21.9 MB；`profile_scene` 沒 GC 的 heap 會差 14%，是暫存還沒回收。
  - **遊玩檢查**（正式 build）：瞬移 8 個地點，貼圖空白 0，警告 49 則與 main 相同。
- **新發現的技術細節或踩雷**：見 `pitfalls-and-memory.md` 踩雷 #12。另外 main 的 `profile:mobile` 畫布現在是 27.52 MB（Phase 1A 結束時 23.14 MB），多出來的是後來新增功能的畫布（例如 AI 全息圈 `HoloRing` 4 張 512×512），與本分支無關。
- **下一棒確切待辦（Next Actionable Step）**：
  1. PR #6（`refactor/kit-plane-batch-and-igpu`）：`Kit.finish()` 平面圖集＋純色合批（把 #191 多出來的繪圖呼叫降回來）、室內家具距離剔除、小地圖節流，以及使用者決定照規格的 5 項畫質相關設定（`medium` 關 MSAA、bloom 1/4、內顯夜間路燈 4 → 0–2、30 Hz 陰影、自動畫質 3 秒＋3 秒）。

---

### Session #010｜2026-11-25｜負責階段：Phase 2 PR #5（`MapBuilder` 120 m 空間分塊）
- **工作分支 / PR**：`refactor/mapbuilder-chunking`（規劃表 PR #5 的第一部分；`cutMask()` `discard` 移除另開 PR）
- **本輪已完成**：
  1. `Geo.mesh()` 依三角形質心分到 120 m × 120 m 的格子，分布超過兩格的 Geo 回傳 `ChunkedMesh`（每格一個子 mesh，`castShadow` / `receiveShadow` / `frustumCulled` / `renderOrder` 轉給每個子 mesh，`renderOrder` 設在子 mesh 上以維持原本的排序；材質用 `chunkMaterial`）。三角形本身與亂數抽樣完全不變。每個子 mesh 都 `markStaticGeometry`。
  2. 容器刻意不暴露 `material`：three.js 的 `compile()` 會把有 `material` 的物件當成要畫的東西，沒有 `geometry` 就拋例外（實測踩到，遊戲停在載入）。唯一讀材質的地方（夜市光暈 `world.marketGlow`）改用 `chunkMaterial`。
- **實機與量化數據變化**（`node tools/profile_scene.mjs --gpu --runs=1`，Apple M1，`medium`，5 個機位平均；繪圖呼叫與三角形是確定值，fps 在無風扇 M1 上同一 build 兩次可差 20%）：

  | 分塊 | 繪圖呼叫 | 三角形 |
  | :--- | ---: | ---: |
  | 不分塊 | 1367 | 3558k |
  | **120 m（規格，採用）** | **2534（+85%）** | **2981k（−16%）** |
  | 240 m | 1884（+38%） | 3028k（−15%） |
  | 360 m | 1664（+22%） | 3091k（−13%） |
  | 只分 ≥ 2 萬三角形的 Geo、120 m | 1712（+25%） | 3188k（−10%） |
  | 只分 ≥ 2 萬三角形的 Geo、240 m | 1505（+10%） | 3225k（−9%） |

  - 規格預估「三角形下降 60% 以上」在目前地圖上不成立（最多 −16%）；120 m 的每幀繪製 CPU 平均 13.1 → 18.8 ms、fps 約 64 → 49。**使用者看過這些數據後決定照規格採用 120 m。** 若之後要省回繪圖呼叫，最好的折衷是「只分 ≥ 2 萬三角形的 Geo、240 m」。
  - 分塊前場景有 227 個半徑 > 120 m 的 mesh（約 109 萬三角形），多數是 `MapBuilder` 橫跨全圖的路網、牆面、鋪面圖層（半徑約 1.2 km）。
  - **畫面**：`desktop-dgpu` 與分支基底逐像素比對 85/95 完全相同，其餘最多 6/255（街景）／個位數到十幾個像素（空拍）：同平面重疊三角形在格子邊界的繪製順序改變。
  - **遊玩檢查**：瞬移 8 個地點後，4452 份靜態幾何（含子 mesh）中 4306 份已上傳並釋放陣列，貼圖空白 0，無例外。
- **新發現的技術細節或踩雷**：容器物件不能有 `material`（見上）；分塊大幅增加繪圖呼叫，Phase 2 的繪圖呼叫目標要靠 PR #6（`Kit.finish()` 合批）補回。
- **下一棒確切待辦（Next Actionable Step）**：
  1. PR #5 第二部分：`cutMask()` `discard` 改 CPU 切洞（地下道、坑洞、下沉水池），洞口與 `PhysWorld` 密合；做之前先給使用者看洞口邊緣的前後截圖（PhysWorld 的做法是 1 m 子網格，邊緣會是 1 m 一階）。
  2. PR #6：`Kit.finish()` 平面圖集＋純色合批、室內家具距離剔除、小地圖節流，以及使用者決定照規格的 5 項畫質相關設定。

---

### Session #009｜2026-11-25｜負責階段：Phase 1A 第二部分（共用貼圖釋放、其餘私有畫布、Textures.js、靜態幾何、gcNudge、內顯 0.75）
- **工作分支 / PR**：`fix/ios-canvas-lifecycle-2`（規劃表 PR #3 的剩餘部分）
- **本輪已完成**：
  1. **每個檔位都照 `PerfProfile.texScale`**：`desktop-dgpu` 1、`desktop-igpu` 0.75（使用者決定照規格，取代 Session #007 的「電腦一律 1 倍」）、`mobile-lite` 0.5、安全模式 0.375；圖集依 `atlasMaxW/H`。
  2. **其餘私有畫布收斂**（規格列的全部）：`SacB1`、`Arena`（`ribbonTex` / `sideTex` 會被 `Concert.js` 以同一個縮放過的 context 重畫，標成 dynamic、不釋放）、`ClubRoom`、`GarryHome`、`GateExtras`、`GordonShop`、`Weiche`、`Court`、`Furniture`（招牌圖集）、`MapBuilder`（`canvasTex`、地名標籤 `labelTexture`、校門牆面）；另外 `Vehicles` 的車牌與車身貼紙（為了達到 24 MB）。
  3. **`Textures.js`**：照原尺寸生成後縮到 `texScale`（花紋以像素畫，直接用小尺寸生成會讓花紋變兩倍大），手機地面 512 → 256；`hc` / `dc` 暫存畫布用完立刻釋放。
  4. **`flushShared(scene)`**（進標題前）：場景裡用到、標記為共用且非 dynamic 的畫布，每個使用它的貼圖物件（含 `ZoneD` / 噴水池的複製貼圖）都 `initTexture` 後釋放；之後若被設 `needsUpdate`，`canvasTexture` 做的會先 `redraw()`，其餘警告。`T.screen()` 等圖片載入才畫上的貼圖用 `markDynamic`。
  5. **`markStaticGeometry`**（`Geo.mesh()`、`Kit.finish()`、`finishRow()`）：照踩雷 #9 四守則，WebGL 上傳後把 CPU 陣列換成空陣列，`count` 保留。
  6. **`gcNudge()`**：Apple WebKit 才執行、5 秒節流，建完世界與進標題前各一次。`ImageBitmap.close()`：專案沒有使用 `ImageBitmap`，不需要。
  7. 單元測試 +3（`flushShared`、`markStaticGeometry`、`gcNudge`），`docs/guide/architecture.md` 補上規則（動態貼圖要標記、世界靜態網格畫過後不能再讀頂點）。
- **實機與量化數據變化**：
  - **進標題時存活的畫布**（三個檔位、強制 GC 後）：`desktop-dgpu` 270.3 → **42.1 MB**、`desktop-igpu` **31.1 MB**、`mobile-lite` 164.2 → **23.2 MB**（規格目標 ≤ 24 MB ✅）；共 702–734 張畫布上傳後釋放，空白貼圖 0。
  - **JS heap**（精確模式、強制 GC、獨立瀏覽器）：進標題 6 秒後 463 → **363 MB**；走訪 8 個地點後 544 → **419 MB（−23%）**，此時 895 份靜態幾何全部已上傳並釋放陣列。
  - **手機模擬**（`profile:mobile`）：Canvas 165.65 → **23.14 MB**、貼圖估算 538.45 → **425.02 MB**、JS heap 436.6 → **351.63 MB**、啟動到標題 66.6 s（軟體渲染浮動範圍內）；`--assert-ios-budget` 通過。每個機位 `Tex`（已上傳 GPU 的貼圖數）從約 430–480 變成約 740–765：`flushShared` 在進標題前一次上傳場景裡所有共用貼圖（原本看到才上傳），換來畫布全部釋放。
  - **電腦畫面**：`desktop-dgpu` 與 main 逐像素比對 **95/95 完全相同**；`mobile-lite` 45/95 相同，其餘是地面／立面／私有貼圖變軟，無缺件。
  - **內顯每幀 GL 呼叫**：`drawElements` 75355 → 78469（+4%），見踩雷 #11 第 2 點。
  - **遊玩檢查**：開始遊戲後瞬移 8 個地點（鐘塔、圖書館、學活、體育館、真知、涼韌、立行、街屋），無例外；主控台的 49 則材質警告 main 也有（踩雷 #11 第 4 點）。
- **新發現的技術細節或踩雷**：踩雷 #11（進標題的同步第一幀、內顯圖集上限的繪圖成本、heap 量法、既有的材質警告）。
- **下一棒確切待辦（Next Actionable Step）**：
  1. Phase 2：`refactor/mapbuilder-chunking`（PR #5）→ `refactor/kit-plane-batch-and-igpu`（PR #6，使用者決定 5 項畫質相關設定也照規格）。
  2. iPhone 實機重測（Tier 3）：進遊戲連續 10 分鐘。
  3. iPhone 的 `build-world` 51 s（保留區判斷）：建議另開小 PR。

---

### Session #008｜2026-11-25｜負責階段：Phase 1B（延後載入非必要資源、剔除修正）
- **工作分支 / PR**：`fix/ios-lazy-noncore-assets`（規劃表的 PR #4）
- **本輪已完成**（`docs/guide/architecture.md`〈畫布貼圖記憶體〉一節的「載入時不做的事」）：
  1. `Game.js`：renderer 加 `alpha: false, stencil: false`（全專案沒有 stencil 使用處；three r160 預設 `stencil = true`）；非開發、非 `?diag` 時 `debug.checkShaderErrors = false`；`shadowMap.enabled = !lowQ`。`SkySystem.js`：太陽 `castShadow` 在 low 時一開始就是 false。畫質升級時 `GameLoop.applyQuality()` 原本就會把兩者打開，行為不變。
  2. `AudioSystem.js`：歌劇背景音樂（3 MB）`preload = 'none'`，第一次播放時才下載；其他程式只用 `play` / `pause` / `volume`，不依賴預先載入。
  3. `FirstPerson.js`：後照鏡 render target 改為第一次用到才建立（getter `rt`）；`localClippingEnabled` 只在 `_clipCar` 切開車艙時打開，`_unhide` 關回。
     - 誠實註記：three.js 的 render target 本來就是第一次 `setRenderTarget` 才配置 GPU 記憶體，所以 render target 延後建立的實際收益很小；`localClippingEnabled` 的收益是每個繪圖呼叫少一次 `clipping.setState`。
  4. `Arena.js`：座椅 `A1` / `A2` 用 instance 矩陣算出的 `boundingSphere` 做剔除（拿掉 `frustumCulled = false`）；螢光棒的 `boundingSphere` 加大 0.5 m（shader 的擺動 `uAmp` 最大 0.24）後也開剔除；場館外殼 `shell` 預設隱藏並放進回傳值，`Concert.js` 搭接駁車去時顯示、回中原時隱藏（體育館只有接駁車能到）。
- **實機與量化數據變化**：
  - **電腦**：低畫質下與 main 逐像素比對 95 個機位（含 4 個體育館機位：強制顯示外殼與螢光棒，從看台看舞台、從外面看場館）**95/95 完全相同**。中畫質這套比對連 main 對 main 都是 0/95（MSAA / 半精度後製本身不確定），不能用來判斷。
  - **每幀 WebGL 呼叫**（91 個校園機位合計，低畫質）：`drawArraysInstanced` 4119 → 3937（每個機位少 2 個，就是兩組座椅，約 46 萬三角形），`useProgram` 29372 → 29180，`bindTexture` 60471 → 60423，`enable` / `disable` 3214 → 3125；`drawElements` 等其餘不變。
  - **手機模擬**（`profile:mobile`）：與 Session #007 相比，每個機位三角形少約 34 萬（title-orbit 2021k → 1678k、鐘塔 1908k → 1560k、張靜愚紀念圖書館 1873k → 1524k、學生活動中心 1769k → 1422k、中原大學體育館 1535k → 1202k）；載入資源 32 個／11703 KB → **31 個／8722 KB**（歌劇音樂不再預載）；Canvas 165.65 MB、貼圖估算 538.45 MB 不變，JS heap 436.6 MB；啟動到標題 70.9 s（軟體渲染，在量測浮動範圍內）。
- **新發現的技術細節或踩雷**：體育館在校園 4.4 km 外，已在相機遠裁切面（1.5–2.6 km）之外，所以只有關掉剔除的物件（座椅）會真的被畫；外殼平常隱藏主要是少一次剔除走訪，收益小。
- **下一棒確切待辦（Next Actionable Step）**：
  1. Phase 1A 剩餘（見 Session #007）。
  2. Phase 2：`refactor/mapbuilder-chunking`（PR #5）、`refactor/kit-plane-batch-and-igpu`（PR #6）。
  3. iPhone 的 `build-world` 51 s（保留區判斷），建議另開小 PR。

---

### Session #007｜2026-11-25｜負責階段：Phase 1A 第一部分（畫布生命週期：圖集、招牌、私有畫布、手機縮圖）
- **工作分支 / PR**：`fix/ios-canvas-lifecycle`（規劃表的 PR #3；Phase 1A 剩下的項目見文末，下一個 PR 接續）
- **本輪已完成**：
  1. **新增 `src/graphics/GpuMemLifecycle.js`**：`configureGpuMem` / `scaledCanvas` / `canvasTexture` / `uploadAndRelease` / `markAtlasSource` / `releaseAtlasSources` / `blankTexture`。
     - 街屋圖集（`finishRow` 的 sheet）：畫完立刻 `renderer.initTexture()`，畫布縮成 1×1。
     - 打包進圖集的小招牌（atlas-source）：每蓋完一個 zone（`buildZones` 的 `afterZone`），把場景裡沒有別的 mesh 直接用到的釋放，並從 `TEX` 移除 key（之後再用同一個 key 會重畫，像素相同）。
     - `Sac` 的門牌／招牌圖集、`Lixing` 的門牌圖集：全部畫完後上傳並釋放。
     - 拿不到 2D context 時回傳共用 1×1 `blankTexture()`，不拋例外。
  2. **接上 `PerfProfile`**：`mobile-lite` 用 `texScale` 0.5，安全模式 0.375，網址 `?texscale=` 照指定值；`atlasMaxW/H` 決定圖集存放倍率與邏輯高度上限。**電腦一律 1 倍**：`desktop-igpu` 的 0.75 刻意不套用（使用者要求筆電畫質不降，電腦記憶體也不是瓶頸），請 Hank 確認。
  3. **私有畫布收斂**：ZoneA/B/C/D/E/G/H、`Dorms` 的私有 `ctex`，`Lixing`、`Sac` 的 `canvasTex` 與圖集，以及 `Kit.ctex`，都改走 `canvasTexture` / `scaledCanvas`。`HUD` 小地圖倍率改為 `1.3 × texScale`（手機 0.65）。
  4. `Game.js`：建好 renderer 後呼叫 `configureGpuMem`；`webglcontextrestored` 時重新整理（已釋放的畫布傳不回 GPU）。
  5. `tools/perf/page-hook.js`：貼圖估算改用 `texture.userData.gpuW/gpuH`（上傳時的尺寸），畫布釋放後不再少算。
  6. 單元測試 `tests/unit/gpu-mem-lifecycle.test.js`（6 個），文件 `docs/guide/architecture.md` 新增〈畫布貼圖記憶體〉一節（含內容組新增貼圖的規則）。
- **實機與量化數據變化**：
  - **手機模擬**（`npm run profile:mobile -- --assert-ios-budget`，Apple M1 本機 Chrome，SwiftShader，`mobile-lite` / `low`，3 次中位數）：

    | 項目 | Session #006 | 本輪 |
    | :--- | ---: | ---: |
    | Canvas（進標題時） | 1748.43 MB（3133 個） | **165.65 MB（800 個）**，門禁通過 |
    | 貼圖估算（GPU，含 mip） | 1640.24 MB | **538.45 MB**（−67%；圖集以半尺寸上傳） |
    | JS heap | 437.64 MB | 441.22 MB（本輪未處理幾何） |
    | 啟動到標題（軟體渲染） | 70.7 s | 64.4 s（63.2–67.2） |

    - 載入過程的 Canvas 最高峰（另以 `createElement` / 寬高 setter 追蹤，未受 GC 影響的上限）：1762 MB → **212 MB**，發生在「蓋資管系館、麥當勞、警衛室」（`buildZones`）。
  - **電腦**（`node tools/profile_scene.mjs --gpu`，Apple M1 Metal，`desktop-igpu` / `medium`，3 次，main 與本分支交替先後跑兩輪）：Canvas 1839.96 → 359.17 MB；貼圖估算 1758.5 → 1754.45 MB（電腦不縮圖，GPU 用量不變）。
    - 幀時間在兩輪間互有高低，同一個 build 同一機位單次就會在 50–76 fps 間跳（無風扇 M1 的溫度），無法用幀時間判斷。改為**包住 `WebGL2RenderingContext` 計算每一幀的 GL 呼叫**：91 個固定機位（13 排街屋招牌特寫、Sac／Lixing 門牌、空拍）在 `low` 與 `medium` 下，`drawElements`、`bindTexture`、`useProgram`、`uniform*` 等每一種呼叫次數都與 main **完全相同（91/91）**，每幀工作量不變。
  - **畫面**：電腦與 main 逐像素比對 87/91 完全相同，其餘最多 6/255；手機只有貼圖變軟，無缺件、無錯位；「畫布已釋放但沒上傳 GPU」的空白貼圖檢查兩種檔位都是 0。
  - **iPhone 14 Pro**（區網正式版建置，`?diag=1`）：**第一次成功進到標題畫面**（之前在畫第一幀時被系統殺掉）。總計 69.9 s：`fetch-and-wasm` 0.6 s、`build-world` **51.3 s**、`build-interiors` 9.9 s、`build-physics` 1.8 s、`spawn-entities` 2.5 s、`init-npcs` 1.5 s、`compile-shaders` 2.4 s。連續遊玩 10 分鐘尚未測。
- **新發現的技術細節或踩雷**：已寫進 [pitfalls-and-memory.md](pitfalls-and-memory.md) 踩雷 #10（貼圖估算少算、自動化量測觸發安全模式、背景頁面灌水開機時間、縮放畫布的畫法限制、「頂層立即建畫布」量不到）。另外：`--assert-ios-budget` 檢查的是進標題時還活著的畫布，不是載入途中的最高峰，最高峰要另外量。
- **下一棒確切待辦（Next Actionable Step）**：
  1. **Phase 1A 剩餘（下一個 PR）**：
     - `Textures.js` 的 `hc` / `dc` 暫存畫布，以及共用貼圖上傳後釋放（規格要求進遊戲後 ≤ 24 MB；目前 `Textures.js` 約 51 MB、`Kit` 共用約 9 MB）。
     - 其餘私有畫布：`MapBuilder` 約 17 MB，以及 `Weiche`、`Vehicles`、`ClubRoom`、`Arena`、`GateExtras`、`Furniture`、NPC 頭像。
     - `markStaticGeometry`（JS heap 約 440–460 MB）與 `gcNudge`。
  2. **Phase 1B**：`fix/ios-lazy-noncore-assets`。
  3. **iPhone 的 `build-world` 51 s**：瓶頸是保留區多邊形判斷（`inAnyPoly` 逐一比對約 1,400 個多邊形）。#156 的格子索引曾在同一支手機把這段從約 50 s 壓到約 10 s，輸出逐棵相同；規劃沒有這項，建議另開小 PR。

---

### Session #006｜2026-11-25｜負責階段：Phase 0 合併收尾（接手 hank1224）
- **工作分支 / PR**：`chore/merge-perf-phase0`（把 `chore/perf-flags-and-metrics`，含 `docs/revise-perf-refactor-plan`，合併回 `main` @ #161）
- **本輪已完成**：
  1. **以本規劃為準，拿掉 #156 的內容**（`?boottrace` 開機追蹤、`nextFrame` 調整、`Kit.configureTextures` / `releaseAtlasSources` 手機畫布縮放與釋放、保留區格子索引、林口體育館座椅剔除）：#156 改過的 16 個檔案回到 #155 合併時的內容。對應工作改由 Phase 0 `BootDiag` / `stage()`、Phase 1A 畫布生命週期、Phase 1B `Arena.js` 剔除處理。#157、#159、#160、#161（麻將）未受影響。
  2. **合併本分支**：分支建在 #153 之前，#153 已用 `src/core/PerfHud.js`（設定 → 效能顯示，四段式）取代 `GameLoop.perfOverlay()`。衝突處理保留 `PerfHud`、不帶回舊浮層；`[SAFE]` 標記改掛在 `PerfHud` 開發者層級的「檔位」後面；`?perf` 會直接開 `PerfHud` 的開發者層級。其餘 25 個檔案與分支一字不差。
  3. **`nextFrame()` 改為 `requestAnimationFrame(() => setTimeout(r, 0))`**：原本只等 rAF，`stage()` 寫好的文字仍要等下一段同步建置跑完才畫得出來（見 [pitfalls-and-memory.md](pitfalls-and-memory.md) 踩雷 #2 補充）。
- **實機與量化數據變化**（`npm run profile:mobile`，Apple M1 本機 Chrome，SwiftShader 軟體渲染，`mobile-lite` / `low`，3 次取中位數；幀時間僅供相對比較）：

  | 記憶體 / 啟動 | 值 |
  | :--- | :--- |
  | Canvas | **1748.43 MB**（3133 個，DOM 內 3） |
  | 貼圖估算（GPU，含 mip） | 1640.24 MB（763 張） |
  | JS heap | 437.64 MB |
  | 啟動到標題 | 70694 ms（範圍 68401–73859，軟體渲染） |
  | 載入資源 | 32 個 / 11683 KB |

  | 機位 | Calls | Tris | Tex | Geo |
  | :--- | ---: | ---: | ---: | ---: |
  | title-orbit | 700 | 2018k | 240 | 766 |
  | 鐘塔 | 399 | 1905k | 414 | 1202 |
  | 張靜愚紀念圖書館 | 262 | 1574k | 469 | 1403 |
  | 學生活動中心 | 418 | 1739k | 486 | 1441 |
  | 中原大學體育館 | 209 | 1532k | 488 | 1441 |
  | 真知教學大樓 | 348 | 1698k | 534 | 1687 |

  - 最大宗 canvas：`2048x4096 × 28 = 896 MB`（街屋圖集）、`2048x2048 × 5 = 80 MB`、`256x192 × 334 = 62.63 MB`、`512x512 × 45 = 45 MB`、`1024x192 × 43 = 32.25 MB`。
  - 距離 Phase 1 門禁（`peakBackingStoreMB <= 220`）約差 8 倍。
- **新發現的技術細節或踩雷**：
  - `nextFrame()` 只等 rAF 不會讓畫面先繪製（已補進踩雷 #2）。
  - `applySafeMode()` 設的 `texScale <= 0.375` 與 `atlasMaxW/H = 1024` 目前**沒有任何貼圖程式讀取**，安全模式實際只有「`auto` 畫質鎖 `low`」，而手機本來就是 `low`。Phase 1A 必須把 `Kit.js` / `Textures.js` 接上這兩個值，安全模式才有實際效果。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 從最新 `main` 切出 `fix/ios-canvas-lifecycle`，依 [Phase 1 規格書](specs/phase-1-ios-memory-rescue.md) 實作 Phase 1A；第一優先是 28 張 `2048x4096` 街屋圖集（896 MB）與 `texScale` / `atlasMaxW/H` 接線，每步以 `npm run profile:mobile -- --assert-ios-budget` 對照本筆基線。
  2. Phase 1B（`fix/ios-lazy-noncore-assets`）補回 `Arena.js` 座椅 `frustumCulled`（人在校園時每幀多畫 4 km 外約 46 萬三角形，M1 GPU 約 4 ms）。

---

### Session #005｜2026-11-25｜負責階段：吸收《臺北狂飆》實證優化 ＋ 免插線手機驗證與 Phase 0 自癒落實
- **工作分支 / PR**：`chore/perf-flags-and-metrics`（已合併 `docs/revise-perf-refactor-plan`）
- **本輪已完成**：
  1. 逐項比對《臺北狂飆》（Three.js `r186`）與 `YanlinGTA`（`Three.js r160`）實際原始碼，完成技術篩選並回寫 `perf-refactor/`：
     - **納入**：`BootDiag` 玩家端無感自動降階 `safeMode`（Phase 0）；靜態幾何 `onUploadCallback` 清空 CPU `TypedArray` + `ImageBitmap.close()` + `WebGLRenderer({ alpha: false, stencil: false })` + 條件式 `gcNudge`（Phase 1）；`low` 切換 `MeshLambertMaterial` 跳過法線/RM 貼圖 + `opaqueSort` + 30Hz 隔幀陰影 + 零相依 `PostFX` 瘦身（Phase 2）；`r160` 相容分帶 `texSubImage2D` + `pinPrograms()` + 分批 `dispose` + `MessageChannel` 幀預算（Phase 3）；KTX2 上傳後清空 `mipmaps`（Phase 4）。
     - **拒絕**：`slimShadowMaps`（`r160` 用四通道 `RGBADepthPacking`，改單通道必壞陰影）、2D `uLampMap` 重寫、`pmndrs/postprocessing` 套件、替換 Rapier 物理與原生 `TilePool` 私有魔改。
  2. 確立**三層免插線手機自動化驗證架構**（Tier 1 `npm run profile:mobile -- --assert-ios-budget`；Tier 2 Mac Playwright `webkit` / `xcrun simctl` Simulator；Tier 3 里程碑無線真機 LINE/IG 驗收）。
  3. 實作 Phase 0 新規格：`BootDiag.js` 玩家端自動降階 `safeMode`（連死 2 次或 `webglcontextlost` 自動鎖 `low` + `texScale <= 0.375`、穩玩 180 秒自動恢復）、`PerfProfile.js` `?safemode=`、`GameLoop.js` `[SAFE]` 標記與健康計時，以及 `tools/profile_scene.mjs` 支援 `--mobile`、`peakBackingStoreMB` / `liveBackingStoreMB`、`--markdown`、`--assert-ios-budget`（同步於 `package.json` 新增 `profile:mobile`）。
  4. **更正本機環境紀錄**：確認 Linux 本機已安裝 Google Chrome（`/usr/bin/google-chrome-stable -> /opt/google/chrome/google-chrome`），前次 `ENOENT` 係因受限終端沙盒未掛載 `/opt/google/chrome/` 所致，於本機一般終端機即可直接執行 `npm run profile:scene -- --play` 或 `npm run profile:mobile`。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 於一般本機終端機執行 `npm run profile:mobile` 取得修正後第一份自動化手機模擬基線表格並補入本紀錄（或 `phase-0-baseline-and-flags.md`），隨即合併 `chore/perf-flags-and-metrics` 回 `main`。
  2. 從最新 `main` 切出 `fix/ios-canvas-lifecycle` 展開 **[Phase 1 規格書](specs/phase-1-ios-memory-rescue.md)**。

---

### Session #003｜2026-11-25｜負責階段：規劃體檢、目標定錨與技術規格全面修正
- **工作分支 / PR**：`docs/revise-perf-refactor-plan`（接續檢視 PR #147 合入後之 `perf-refactor/` 與未合併分支 `chore/perf-flags-and-metrics`）
- **本輪已完成**：
  1. **交叉比對全專案 155,393 行原始碼（`src/world/` 佔 102,379 行）**，揪出並修正原規劃的 10 項模糊空間、事實錯誤與致命技術破洞：
     - **明確雙端分級 KPI**：手機端定錨為 iOS Safari & LINE/IG `WKWebView` `<= 5s` 進場、連續漫遊騎車 `>= 10m` 零閃退、`WKWebView >= 30 FPS` / Safari `45–60 FPS`；電腦無獨顯拆為「Apple M 系列 / Iris Xe / 780M 在 1080p 穩 55–60 FPS」與「舊款 UHD 620 等級自動 `low` 穩 `>= 45 FPS`」。
     - **釐清單一職責**：`GameLoop.js` (`QPROF`) 維持畫質唯一真相；移除 `PerfProfile.js` 重複且衝突的 `shadowSize` / `maxDpr` / `postFx`。
     - **修正程式碼事實誤判**：確認手機預設早就是 `low`（`MapBuilder` 已用 `texPx = 64`、`PostFX` 已關閉），真正主因是全專案 **86 處 `createElement('canvas')`**（含 20+ 私有 helper、4 支頂層立即執行 `ctex`、中間畫布 `hc`/`dc`）與 `Game.js` 在 `setLoad(0.08)` 之前才讓幀導致畫面永遠假停在 `2%`。
     - **防破圖／防假拆包／防穿牆修正**：設計四角色兩階段 Canvas 釋放協定（保護 `finishRow`、`ROWT`/`YHT` 共用與 `T.screen` 非同步圖）；將原 Phase 2 與 Phase 3 對調，先做低衝突渲染分塊與 `Kit.finish()` 平面合批（砍掉 1,258 個散裝平面 Draw Calls），再做輕重物理拆檔真 Code-Splitting ＋ `PhysWorld` 動態 Rapier 碰撞體（保護 `Walker.js` 與 `tools/floorplan`）。
  2. 完成重寫 `perf-refactor/` 全部 10 份檔案，並將 `phase-2` / `phase-3` 規格對調命名（`phase-2-render-and-igpu-opt.md`、`phase-3-global-dynamic-streaming.md`）。
- **實機與量化數據變化**：
  - 本輪為規格修正（無執行期程式改動），沿用 2026-11-24 M1 Pro 實測基線（懷恩樓前 `50 fps` / `1,729` calls / `4,240k` tris / `659` tex / `2,747` geo）與 iPhone 17 Pro Max 失敗基線，靜態盤點補入 `86` 處 `createElement('canvas')` 與 `1,258` 處 `k.plane()` 數據。
- **新發現的技術細節或踩雷**：
  - 全部 8 項新技術紅線已系統性寫入 [pitfalls-and-memory.md](pitfalls-and-memory.md)。
- **下一棒確切待辦（Next Actionable Step）**：
  1. 依修正後規格更新 `chore/perf-flags-and-metrics`（重構 `PerfProfile.js`、實作 `BootDiag.js`、`Game.js` 階段讓幀與檢查點、`tools/profile_scene.mjs` 並補齊單元測試）。
  2. 合入 Phase 0 後於 iPhone 17 Pro Max 跑 `?perf&diag=1` 鎖定精準崩潰階段，隨即進入 **[Phase 1 規格書](specs/phase-1-ios-memory-rescue.md)**。

---

### Session #002｜2026-11-24｜負責階段：Phase 0 實作（旗標解析與記憶體遙測）
- **工作分支 / PR**：`chore/perf-flags-and-metrics`（PR 待按 Session #003 新規格對齊更新）
- **本輪已完成**：
  1. 完成規劃分支合併：`docs/perf-refactor-plan` 已透過 PR #147 合併至上游 `howardtuan/YanlinGTA` (`main` `7a00e81`)。
  2. 新增初版 `src/core/PerfProfile.js`、`GameLoop.js` `?perf` 記憶體行與 `tests/unit/perf-profile.test.js`。
- **實機與量化數據變化**（2026-11-24 實測，`chore/perf-flags-and-metrics` `9daa340`）：
  - **iPhone 17 Pro Max（iOS Safari）**：❌ 載入失敗，畫面停在「載入地圖資料 2%」後觸發頁面自動重整循環（Web Inspector 未能掛載；後於 Session #003 發現因 `Game.js` 未在 `setLoad(0.08)` 後讓幀，無法區分停在 2% 還是卡在 `buildWorld`）。
  - **MacBook Pro Apple M1 Pro（`desktop-igpu` 對照組，`medium` 畫質、WASM 開）**：
    - 標題頁：`65 fps` (`15.3 ms`)｜Draw Calls `1,763`（峰值 `1,774`）｜Triangles `4,590k`（峰值 `4,638k`）｜Textures `432`｜Geometries `1,963`｜物理 `0 剛體 2,557 碰撞體`
    - 進校園（懷恩樓前靜止）：`50 fps` (`20.0 ms`)｜Draw Calls `1,729`｜Triangles `4,240k`｜Textures `659`｜Geometries `2,747`｜物理 `2 剛體 2,559 碰撞體`

---

### Session #001｜2026-11-24｜負責階段：架構診斷與初版規劃書確立
- **工作分支 / PR**：`docs/perf-refactor-plan`（已透過 PR #147 合併至 `main`）
- **本輪已完成**：
  1. 確立保留 Vite + Three.js + 雙 WASM 單一程式碼庫、排除 UI/UX 與主線第五章改動。
  2. 建立 `perf-refactor/` 目錄與 `AGENT.md` 過渡期公告。
