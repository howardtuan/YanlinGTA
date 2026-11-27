import { describe, it, expect } from 'vitest';
import { loadWorld, encroachments, centroid } from '../../tools/street_corner_check.mjs';

// 建物不得侵入車道（tools/street_corner_check.mjs 同一套計算）：
// 照 src/core/Game.js 的順序重建遊戲實際會畫的建物（扣掉 drop／hide、套上 fix），加上各街屋檔立面線往後的佔地，
// 跟 data/cycu.json 的車道（中心線＋路寬）比。允許 1 m 的誤差（騎樓柱、雨遮、正射量測誤差）。
// 離地圖邊界 30 m 內的不算：那裡的巷道只剩一小段，常常直接停在 OSM 建物裡。
const TOL = 1.0;
const EDGE = 30;
// 已知、刻意不修的（理由寫清楚）
const ALLOW = {
  // 中山東路一段223巷129弄口那排連棟（OSM）西端伸進巷道 1.3 m。縮回去會讓兩條牆短於 2.5 m、不再算店面牆，
  // world.shopWalls 少兩面，全圖停放機車就重排（實測雜湊會變）
  w1351728547: 1.5,
};

describe('建物不得侵入車道', () => {
  it(`離地圖邊界 ${EDGE} m 以外，沒有建物侵入車道超過 ${TOL} m`, async () => {
    const world = await loadWorld();
    const B = world.data.bounds;
    const bad = encroachments(world)
      .filter((h) => h.intoRoad > (ALLOW[h.b.id] ?? TOL))
      .filter((h) => {
        const [x, z] = centroid(h.b.pts);
        return x > B.minX + EDGE && x < B.maxX - EDGE && z > B.minZ + EDGE && z < B.maxZ - EDGE;
      })
      .map((h) => `${h.b.file} ${h.b.id} ${h.b.name} → ${h.road} 侵入 ${h.intoRoad} m`);
    expect(
      bad,
      '照正射把建物縮回建築線（OSM／填充樓見 src/world/buildings/RoadClearance.js）'
    ).toEqual([]);
  }, 60000);

  it('實踐路口麻豆子那兩棟 OSM 建物已縮回新中北路南側路緣', async () => {
    const world = await loadWorld();
    const hits = encroachments(world).filter(
      (h) => ['w1559051239', 'w588110022'].includes(h.b.id) && h.road === '新中北路'
    );
    for (const h of hits) expect(h.intoRoad).toBeLessThan(0.3);
  }, 60000);
});
