// 正門警衛室一帶的量測數字（島、柵欄、校名牆、前庭）。Interiors.js 蓋警衛室、GateExtras.js 蓋周邊、
// MapBuilder.js 畫校名牆都讀這裡；獨立成檔是為了讓 GateExtras.js 不必回頭匯入 Interiors.js。
// NOTE: tools/build_terrain.py flattens the terrain under the island and the lawn from a copy of
// these numbers; after changing them, sync it and rerun the script.
export const MAIN_GATE = {
  // kiosk centre; local +x runs ENE along the island (mean heading of the two lanes), +z toward the entry lane
  x: -201.2, z: 82.25, ang: Math.atan2(-2.25, 5.2), name: '正門警衛室',
  // OSM node where 中北路 ends at the gate; both one-way lanes start / end there (src/world/MapBuilder.js paves them)
  streetNode: 286745347,
  // island outline (local, ~8 m long), >= 5 cm inside both 4.2 m lanes
  island: [[-4.9, 0], [-4, -0.8], [-3, -1.55], [-2.4, -2], [-1.8, -2.05], [2.6, -2.05], [3.1, -1.8], [3.35, -1.2], [3.35, 1.2], [3.1, 1.8],
    [2.6, 2.1], [-2, 2.05], [-2.5, 2], [-3, 1.65], [-4, 0.8]],
  // buildGuardhouse lanes: one boom per lane on the OSM barrier=lift_gate nodes, exit lane (-200.7,77.3)
  // and entry lane (-197.1,85.2). x / from: post (local; the exit lane's on the island, the entry lane's on
  // the far kerb), dir: arm toward -z / +z, len: arm length; yellow housings and warning signs on the arms
  // Google 街景 2022-08 (200 中北路): the entry lane is closed by two arms meeting in the middle, the one
  // from the kiosk side with a yellow 「來賓車道」 banner and a 20 roundel, the one from the far kerb with
  // 「教職員車道」; pale salmon housings with white tops (2018: the same, a deeper salmon)
  lanes: [
    { x: 2.42, from: -1.88, dir: -1, len: 4.6, post: '#ebb49c', signs: ['減速慢行'] },
    { x: 2.6, from: 1.86, dir: 1, len: 2.3, post: '#ebb49c', signs: ['來賓車道|20'] },
    { x: 2.59, from: 6.75, dir: -1, len: 2.45, post: '#ebb49c', signs: ['教職員車道'] },
  ],
  // bollards along the far edge of the exit lane (local), ~(-206.6,77.2) to (-199.6,74.4)
  bollards: [-2.9, -1.96, -1.02, -0.08, 0.86, 1.8, 2.74, 3.68, 4.62].map(x => [x, x < 2.71 ? -6.79 : -6.77 + (x - 2.71) * 0.12]),
  // world: black granite 校名牆 (axis ESE, faces SSW toward 中北路) on a kerbed lawn (wall-local
  // polygon), twisted stainless spire just off its west end
  wall: { x: -205.2, z: 73.0, ang: 0.35, W: 6, H: 2.9, D: 1.5, lawn: [[-5, -1.4], [3.6, -1.4], [3.6, 1.2], [-5, 2.4]] },
  spire: { x: -209.2, z: 73.0, h: 12.2 },
  // world: forecourt pavers between the grate, the exit lane's outer edge and the lawn (the lanes and the
  // end of 中北路 are paved by src/world/MapBuilder.js); ±3 m, Google 衛星圖 / 街景 2024-08 heading 30-40
  forecourt: [[-216, 80], [-213.4, 71.6], [-209.6, 70.9], [-202, 74.9], [-201.56, 75.38], [-206.46, 77.58], [-207.39, 78.41], [-210.99, 84.31], [-212.68, 84.8]],
};
