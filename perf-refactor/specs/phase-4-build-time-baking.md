# Phase 4 規格書：建置期貼圖烘焙管線（長期進階最佳化） (`phase-4-build-time-baking.md`)

## 一、 階段目的（Why）
Phase 0～3 完成後，專案已具備可觀測性、安全 Canvas 生命週期、空間分塊與平面合批（內顯 60 FPS）以及真拆包空間動態載入。
本階段屬於**進階長期最佳化**：目前 [src/graphics/Textures.js](../../src/graphics/Textures.js) 與 [src/world/Kit.js](../../src/world/Kit.js) 在每次冷啟動或動態掛載街屋時，仍須於客戶端執行 FBM 噪聲運算（就算有 Rust WASM 加速）與 2D Canvas 繪製；且未壓縮 RGBA 紋理在 VRAM 的佔用是 GPU 原生壓縮紋理的 4～6 倍。

Phase 4 透過**建置期離線烘焙（Build-time Texture Baking）**，把固定不變的程序化紋理預先輸出為 `.webp` 與 **`.ktx2`（Basis Universal UASTC / ETC1S GPU 原生壓縮格式）**，將冷啟動紋理生成時間再壓縮 85% 以上並大幅降低 VRAM 佔用與動態掛載卡頓。

---

## 二、 變更範圍（Scope & Touchpoints）

| 檔案 | 變更性質 | 說明 |
| :--- | :--- | :--- |
| `tools/bake_textures.mjs` | **新增** | 在 Headless Chromium 或 Node Canvas + `toktx` / `sharp` 環境執行，將 `Textures.js` 固定紋理與各店面固定 Atlas 預烘成靜態檔案。 |
| `assets/baked/` | **新增目錄** | 存放烘焙後的 `.webp` / `.ktx2` 貼圖與 `manifest.json` 索引（依 [vite.config.js](../../vite.config.js#L125-L156) 的 `staticAssetsPlugin` 自動複製進 `dist/`，並以相對路徑載入相容 GitHub Pages `/YanlinGTA/` 子路徑）。 |
| [src/graphics/Textures.js](../../src/graphics/Textures.js) & [Kit.js](../../src/world/Kit.js) | **修改** | 生產環境優先載入 `assets/baked/`（依 `manifest.json` 與 `GpuMemLifecycle` 的共用快取鍵對齊，上傳 GPU 後立即清空 `mipmaps` CPU 陣列）；保留原本即時運算函式作為 `npm run dev` 或檔案缺失／雜湊異動時的 100% Fallback。 |
| `vendor/`（視需求） | **新增** | 引入 Three.js `KTX2Loader` 與 Basis Universal Transcoder（`basis_transcoder.js` / `.wasm`），維持全離線靜態部署相容（不依賴外部 CDN）。 |

---

## 三、 詳細技術規格（Technical Spec）

### 1. 烘焙策略分級
1. **Tier A：基礎地面與建築 PBR Atlas（優先）**
   - 包含 `asphalt`、`paving`、`sidewalk`、`grass`、`ground`、`roof`、`corrugated`、`concrete`、`bark`、`leaf`、`frond` 以及 `facade()` / `facadeParam()` 的 Color / Normal / RoughnessMetalness / Emissive 四組貼圖。
   - **Color / Emissive**：烘焙為 Basis ETC1S `.ktx2`（體積小、載入快）或高壓縮 `.webp`。
   - **Normal / Roughness-Metalness**：使用 **UASTC `.ktx2`（線性空間 `NoColorSpace`）** 避免壓縮塊狀失真。
   - **實證效益與 GPU 上傳回收**：參照同類 Three.js 城市產物實測，單組角色模型貼圖採 **ETC1S + UASTC `.ktx2` 僅佔 `6.25 MB` VRAM**，相較於解壓成未壓縮 RGBA 的 `.webp`（`32.86 MB`）**節省 `5.3× ～ 7.9×` 顯存**；執行期透過 `KTX2Loader` 上傳 GPU 後應比照 Phase 1 立即將 `CompressedTexture.mipmaps[i].data` 換為 0-byte 空陣列，避免 CPU 端殘留轉碼緩衝。
2. **Tier B：店面與外圍街屋靜態 Atlas（選配）**
   - 將 Phase 2/3 產出的各條街屋 `finishRow()` 圖集預先烘焙並輸出 UV 映射表 JSON，執行期直接透過相對路徑 `fetch` 單張壓縮圖集，徹底消除手機騎車高速進入街區時的 2D Canvas 繪圖負擔。

### 2. 開發體驗零退步原則（Dev Fallback）
- 團隊日常在 `npm run dev` 修改街屋招牌文字或顏色時，不應每次都重跑烘焙腳本才能看到效果。
- **規則**：
  - 開發模式或偵測到 `?nobake=1` 時，維持即時 Canvas 生成（仍走 Phase 1 `GpuMemLifecycle` 安全釋放）。
  - `manifest.json` 記錄原始檔案內容雜湊（Content Hash），當某支街屋檔案被隊友改過而雜湊不符時，自動退回即時生成並於 Console 提醒；Release 建置時再統一更新烘焙資產。

---

## 四、 驗收標準

1. 離線環境與 GitHub Pages 子路徑（`/YanlinGTA/`）下 `KTX2Loader` Transcoder 與 `assets/baked/` 可正常透過相對路徑載入（不依賴外部 CDN）。
2. `npm run ci` 全綠通過（包含 `tools/check_dist.mjs` 檢查）。
3. 實測啟用烘焙貼圖前後：
   - 啟動期 JS/WASM 紋理生成耗時下降 **> 85%**。
   - WebGL 紋理總 VRAM 佔用下降 **> 60%**，手機長距離騎車動態掛載街屋時幾乎無微卡頓（Zero-hitch）。
