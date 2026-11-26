// 路口越界修正：OSM 建物、填充樓蓋到車道上的，照國土測繪 2024 正射縮回建築線或拿掉（tools/street_corner_check.mjs 找出來的）。
// 自建街屋（新中北路 Seg*.js、StreetXxx.js）越界的直接改各自的檔案，這裡只處理 data/cycu.json 的建物。
// 共用亂數不能動：
//   - OSM 建物只把凸到車道上的頂點推回路緣（頂點數不變，各邊長短跟原本一樣在 4 m 門檻的同一邊），b.acPts 留住原輪廓，
//     src/world/MapBuilder.js 屋頂冷氣照原輪廓抽 rnd2（照 src/world/zones/ZoneA.js 的做法）
//   - 有店面牆的填充樓不能 drop（world.shopWalls 牆數一變，全圖停放機車就重排），照 StreetXinzhongbei.js xzLook 的做法 hide：
//     資料留著、不畫牆和屋頂，碰撞在 buildRoadClearance 收成一個點；原本 noShop 的填充樓直接 drop
// 這個檔案不 import src/world/Interiors.js；src/world/zones/Zones.js import RC_ST、rcFix、rcLook、buildRoadClearance。

// 新輪廓（遊戲座標 x 東、z 南）。原輪廓在 data/cycu.json
const CLIP = {
  // 實踐路口東南角（麻豆子健康湯鍋、芸熙美甲那棟 5 樓）：OSM 北緣凸進新中北路車道 3.3 m；正射上屋頂北緣就在南側路緣
  w1559051239: [
    [-331.9, -68.6],
    [-343.0, -62.8],
    [-353.1, -79.7],
    [-349.36, -82.0],
    [-341.2, -86.33],
  ],
  // 實踐路口東側（松屋町、KABO 那排；西邊的唐老鴨牛排館由 xzb/SegX9.js 蓋）：同上，西北角凸進新中北路車道 2.6 m
  w588110022: [
    [-341.2, -86.33],
    [-332.76, -90.97],
    [-332.46, -91.13],
    [-329.0, -92.8],
    [-319.0, -75.2],
    [-331.9, -68.6],
  ],
};
// 有店面牆、整棟蓋在車道上的填充樓（正射上是柏油路面）：hide
const HIDE = new Set([
  'f2_625', // 忠義路西側，整棟在車道上（侵入 5.8 m）
]);

export const RC_ST = {
  // 原本 noShop、整棟蓋在車道上的填充樓：drop
  drop: [
    'f2_612', // 忠義路東側，整棟在車道與人行道上（侵入 4.3 m）
  ],
};
export function rcFix(b) {
  const P = CLIP[b.id];
  if (!P) return;
  b.acPts = b.pts;
  b.pts = P.map((p) => p.slice());
}
export function rcLook(b) {
  if (!HIDE.has(b.id)) return;
  if (b.noShop && !b.look) b.facade = 'glass';
  b.look = {
    ...(b.look || {}),
    wall: { base: 'smooth', colour: '#d9d9d6' },
    open: { bare: true },
    roof: { ac: false, extras: false },
  };
  b.noShop = true;
}
// hide 的建物：碰撞輪廓收成一個點（照 StreetXinzhongbei.js xzUncollide）
export function buildRoadClearance(I, scene, data, collision) {
  if (!data || !collision || !collision.polys) return;
  for (const b of data.buildings) {
    if (!HIDE.has(b.id)) continue;
    const pi = collision.polys.findIndex((q) => q.pts === b.pts);
    if (pi < 0) {
      console.warn(`[road-clearance] 找不到 ${b.id} 的碰撞輪廓`);
      continue;
    }
    const Q = collision.polys[pi],
      n = b.pts.length,
      c0 = b.pts[0];
    Q.pts = b.pts.map(() => [c0[0], c0[1]]);
    Q.top = -Infinity;
    for (let k = 0; k < n; k++)
      collision.segs[Q.s0 + k] = [c0[0], c0[1], c0[0], c0[1], 1e8, 1e8 + 1];
  }
}
