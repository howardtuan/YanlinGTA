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
  // 建築館（校內）：OSM 東南尖角伸出屋頂，壓進環中東路708巷轉彎處 2.3 m（距巷中心線 0.2 m）。
  // 正射上屋頂南緣在巷子轉彎前就收掉：尖角沿南牆往西縮 3.1 m，離巷中心線 3 m（巷寬 5 m）。
  // 只動這一點，src/world/zones/ZoneE.js archParts 認的第 8、11、13 點不變，南段圓弧高牆照新輪廓切
  w392023416: [
    [98.5, 222.6],
    [105.6, 225.4],
    [101.5, 235.6],
    [110.4, 239.1],
    [108.1, 245],
    [100.6, 242.1],
    [98.4, 247.7],
    [100, 249.6],
    [95, 262.2],
    [100.2, 264.3],
    [88.7, 284.8],
    [71.3, 277.9],
    [78.9, 258.8],
    [84.2, 260.9],
    [88.8, 249.3],
    [81.1, 246.3],
    [84.2, 238.5],
    [91.1, 241.2],
  ],
  // 杭州路113巷北側那排（OSM 一整塊 w1551041562）：南緣畫在巷道中心線上（侵入 2.4 m），正射上屋簷在柏油北側約 2.5 m。
  // 南緣兩點沿短邊往北推：西端 1.9 m、東端 2.6 m（巷道不平行，東端貼得比較近）
  w1551041562: [
    [-799.5, 751.1],
    [-807, 735.2],
    [-730.7, 699.4],
    [-723.4, 714.6],
  ],
  // 振興街南側 w1153472233（灰色鐵皮屋頂）：東北緣壓進振興街 1.2 m，正射上屋頂邊就在路緣；東北兩點往西南推 1.1 m
  // （西北短邊 5.3 m 要留在 4 m 門檻以上，不能推更多）
  w1153472233: [
    [-20.1, 533.2],
    [-8.6, 546.1],
    [-12.6, 549.1],
    [-23.4, 535.8],
  ],
};
// 有店面牆、整棟蓋在車道上的填充樓（正射上是柏油路面）：hide
const HIDE = new Set([
  'f2_625', // 忠義路西側，整棟在車道上（侵入 5.8 m）
  'f2_756', // 民享街：照正射把巷道往西北移 6.5 m（tools/roads.json shift）之後，整棟壓在新路面上（侵入 3 m、中心線穿過 5.2 m）
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
