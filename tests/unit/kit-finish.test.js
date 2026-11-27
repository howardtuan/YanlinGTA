// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Interiors, Kit, MATS, ROWT, T, TEX, YHT, finishRow, sg } from '../../src/world/Kit.js';
import {
  configureGpuMem,
  flushShared,
  releaseAtlasSources,
  resetGpuMem,
} from '../../src/graphics/GpuMemLifecycle.js';
import { TIERS } from '../../src/core/PerfProfile.js';

const fakeContext = () => {
  const ctx = {
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    roundRect: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  };
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
  return { ctx, spy };
};

const profile = (tier) => ({ ...TIERS[tier], flags: { texScale: null } });
const fakeRenderer = () => ({ initTexture: vi.fn() });

afterEach(() => {
  for (const k in TEX) delete TEX[k];
  for (const k in MATS) delete MATS[k];
  resetGpuMem();
  vi.restoreAllMocks();
});

describe('Kit.js 圖集寬度收斂、跨區共用貼圖快取與立即釋放', () => {
  it('小數量門牌圖集寬度收斂至實際最小 2 的次方並保持正確 UV', () => {
    fakeContext();
    const renderer = fakeRenderer();
    configureGpuMem(profile('desktop-dgpu'), renderer);
    const scene = new THREE.Scene();

    // 2 張 256x64 門牌 -> 單張含 padding 288px，合計 576px -> 收斂為 1024 x 128（非寫死 2048）
    const I1 = new Interiors(scene);
    const k1 = new Kit(I1, 0, 0, 0);
    k1.plane(T.sign('101', '#1f3b73', '#fff', 'r101', 256, 64), 0.9, 0.22, 1, 2, 0);
    k1.plane(T.sign('102', '#1f3b73', '#fff', 'r102', 256, 64), 0.9, 0.22, 3, 2, 0);
    k1.finish(scene);
    const p1 = k1.group.children.find((o) => o.name === 'kit:planes');
    expect(p1).toBeTruthy();
    const tex1 = p1.material.map;
    expect(tex1.userData.gpuW).toBe(1024);
    expect(tex1.userData.gpuH).toBe(128);
    expect([tex1.image.width, tex1.image.height]).toEqual([1, 1]);
    // 兩張 256px 寬貼圖對齊 16px + 16px 邊距，U 座標應落在 [16/1024, 272/1024] 與 [304/1024, 560/1024]
    const uv1 = p1.geometry.attributes.uv;
    const uVals = new Set(
      Array.from({ length: uv1.count }, (_, i) => Number(uv1.getX(i).toFixed(6)))
    );
    expect(uVals).toEqual(
      new Set([16 / 1024, 272 / 1024, 304 / 1024, 560 / 1024].map((v) => Number(v.toFixed(6))))
    );

    // 2 張更小 64x32 門牌 -> 單張含 padding 96px，合計 192px -> 收斂為 256 x 64
    const I2 = new Interiors(scene);
    const k2 = new Kit(I2, 0, 0, 0);
    k2.plane(T.sign('A', '#000', '#fff', 'tinyA', 64, 32), 0.4, 0.2, 1, 2, 0);
    k2.plane(T.sign('B', '#000', '#fff', 'tinyB', 64, 32), 0.4, 0.2, 2, 2, 0);
    k2.finish(scene);
    const p2 = k2.group.children.find((o) => o.name === 'kit:planes');
    expect(p2.material.map.userData.gpuW).toBe(256);
    expect(p2.material.map.userData.gpuH).toBe(64);
  });

  it('跨區共用貼圖（YHT / ROWT）在 buildZones 期間保留不重繪，單店一次性 sg() 中途釋放', () => {
    const { spy } = fakeContext();
    configureGpuMem(profile('mobile-lite'), fakeRenderer());
    const scene = new THREE.Scene();
    const I = new Interiors(scene);

    // 第 1 條街：使用跨街共用貼圖 + 單店招牌
    const k1 = new Kit(I, 0, 0, 0);
    const win1 = YHT.win();
    const alWin1 = ROWT.alWin();
    const shutter1 = ROWT.shutter();
    const shop1 = ROWT.shop('street1_0', '#f4e7cf', '#8a6a44', 300);
    const oneOff1 = sg('oneOffShop1', 128, 64, (g) => g.fillRect(0, 0, 128, 64));
    k1.plane(win1, 1.5, 1.1, 1, 2, 0);
    k1.plane(alWin1, 1.5, 1.1, 3, 2, 0);
    k1.plane(shutter1, 2, 2, 5, 1, 0);
    k1.plane(shop1, 3, 2, 8, 1, 0);
    k1.plane(oneOff1, 2, 0.5, 8, 3, 0);
    finishRow(scene, [k1]);

    // 分區結束（keepReusable: true）：一次性招牌釋放並移出快取，跨街共用貼圖仍完整保留
    const releasedMid = releaseAtlasSources(scene, TEX, { minBatch: 1, keepReusable: true });
    expect(releasedMid).toBe(1);
    expect(oneOff1.image.width).toBe(1);
    expect(TEX.oneOffShop1).toBeUndefined();
    expect(win1.image.width).toBeGreaterThan(1);
    expect(alWin1.image.width).toBeGreaterThan(1);
    expect(shutter1.image.width).toBeGreaterThan(1);
    expect(shop1.image.width).toBeGreaterThan(1);

    // 第 2 條街：複用相同跨街貼圖與同配色的 ROWT.shop（不同 key 前綴），應 0 次重繪
    const ctxCallsBefore = spy.mock.calls.length;
    const k2 = new Kit(I, 20, 0, 0);
    const win2 = YHT.win();
    const alWin2 = ROWT.alWin();
    const shutter2 = ROWT.shutter();
    const shop2 = ROWT.shop('street2_0', '#f4e7cf', '#8a6a44', 300);
    const oneOff2 = sg('oneOffShop2', 128, 64, (g) => g.fillRect(0, 0, 128, 64));
    expect(win2).toBe(win1);
    expect(alWin2).toBe(alWin1);
    expect(shutter2).toBe(shutter1);
    expect(shop2).toBe(shop1);
    k2.plane(win2, 1.5, 1.1, 1, 2, 0);
    k2.plane(alWin2, 1.5, 1.1, 3, 2, 0);
    k2.plane(shutter2, 2, 2, 5, 1, 0);
    k2.plane(shop2, 3, 2, 8, 1, 0);
    k2.plane(oneOff2, 2, 0.5, 8, 3, 0);
    finishRow(scene, [k2]);
    // 第 2 條街只建立 1 張 oneOff2 + 1 張新街屋圖集畫布，共用貼圖 0 重繪
    expect(spy.mock.calls.length - ctxCallsBefore).toBe(2);

    // buildInteriors 結束（keepReusable: false）：未獨立留存於場景的跨街貼圖一併釋放
    const releasedFinal = releaseAtlasSources(scene, TEX);
    expect(releasedFinal).toBe(5);
    expect([win1.image.width, alWin1.image.width, shutter1.image.width, shop1.image.width]).toEqual(
      [1, 1, 1, 1]
    );
    expect(oneOff2.image.width).toBe(1);
  });

  it('packAtlas 在迴圈內建妥單張圖集即當場 uploadAndRelease，避免多張大畫布同時駐留', () => {
    fakeContext();
    const liveSheetCanvases = [];
    const createdSheets = [];
    const renderer = {
      initTexture: vi.fn((tex) => {
        createdSheets.push(tex);
        // 當下之前已經上傳的圖集畫布必須已被縮為 1x1
        for (const prev of createdSheets.slice(0, -1)) {
          expect([prev.image.width, prev.image.height]).toEqual([1, 1]);
        }
        liveSheetCanvases.push(tex.image.width * tex.image.height);
      }),
    };
    // desktop-igpu: atlasMaxH = 2048 -> 超過 2 張 1024x1024 會拆成多張 sheet
    configureGpuMem(profile('desktop-igpu'), renderer);
    const scene = new THREE.Scene();
    const I = new Interiors(scene);
    const k = new Kit(I, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      k.plane(
        sg(`big_${i}`, 1024, 1024, (g) => g.fillRect(0, 0, 1024, 1024)),
        4,
        4,
        i * 5,
        2,
        0
      );
    }
    finishRow(scene, [k]);
    expect(createdSheets.length).toBeGreaterThan(1);
    expect(liveSheetCanvases.every((px) => px > 1)).toBe(true);
    for (const shTex of createdSheets)
      expect([shTex.image.width, shTex.image.height]).toEqual([1, 1]);
  });

  it('保留 T.screenOwn 動態標記，不進圖集且不被 releaseAtlasSources / flushShared 釋放', () => {
    fakeContext();
    configureGpuMem(profile('mobile-lite'), fakeRenderer());
    const scene = new THREE.Scene();
    const I = new Interiors(scene);
    const k = new Kit(I, 0, 0, 0);
    const scr = T.screenOwn();
    expect(scr.userData.dynamic).toBe(true);
    const scrMesh = k.plane(scr, 0.64, 0.34, 1, 1, 0);
    k.plane(T.sign('A', '#111', '#fff', 'sA', 128, 64), 1, 0.5, 2, 1, 0);
    k.plane(T.sign('B', '#222', '#fff', 'sB', 128, 64), 1, 0.5, 4, 1, 0);
    k.finish(scene);

    expect(k.group.children).toContain(scrMesh);
    expect(releaseAtlasSources(scene, TEX)).toBe(2);
    flushShared(scene);
    expect(scr.image.width).toBe(128); // mobile-lite 0.5x of 256 -> kept alive
    expect(scr.userData.canvasReleased).toBeUndefined();
  });
});
