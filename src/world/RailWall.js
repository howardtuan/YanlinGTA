// 體育園區北緣的鐵路邊圍牆：網球場西北角起，沿縱貫線南側經過網球場、西側籃排球場北邊，到鐵路涵洞前。
//  原本這條線畫的是大牛欄分渠的明溝（tools/water.json 這段改成 covered，不再畫）；使用者實地記憶在球場打球看不到火車，
//  所以是一道實心水泥牆，不是圍網。位置照 NLSC 2024 正射：牆藏在球場北側樹帶裡、鐵道碴石外緣以南約 6 m（就是原本溝的中心線）。
//  高度：鐵道比球場低 0.5～1 m，車頂離軌面 4.0 m（src/entities/TrainModel.js ROOF），從西側排球場（眼高 1.6 m）看過去
//  牆要約 3.5 m 才擋得住車廂，取 3.5 m。灰色清水模、頂上一條壓頂、球場側每 3.6 m 一根壁柱；顏色、壁柱是推測
//  （街景到不了樹帶裡，正射只看得到樹冠）。
import * as THREE from 'three';
import { H } from './Terrain.js';
import { concreteTex } from '../graphics/Textures.js';

// 牆的中心線（遊戲座標 x, z），西南 → 東北
export const RAIL_WALL = [
  [-75, -322.9],
  [-68.7, -330.4],
  [23.4, -409.0],
  [28.1, -417.7],
];
const WH = 3.5, // 牆高（離地）
  T = 0.22, // 牆厚
  CAP = 0.12, // 壓頂厚
  PIER = 3.6, // 壁柱間距
  SEG = 4; // 每段最長幾 m（跟著地形高低一段一段走）

// 沿線兩側 0.8 m 內的樹、灌木藏起來，免得樹幹穿牆（src/world/MapBuilder.js opts.treeHide）
export const railWallTreeHide = () =>
  RAIL_WALL.slice(1).map((b, i) => {
    const a = RAIL_WALL[i],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      ux = (b[0] - a[0]) / L,
      uz = (b[1] - a[1]) / L,
      r = 0.8;
    return [
      [a[0] - ux * r - uz * r, a[1] - uz * r + ux * r],
      [b[0] + ux * r - uz * r, b[1] + uz * r + ux * r],
      [b[0] + ux * r + uz * r, b[1] + uz * r - ux * r],
      [a[0] - ux * r + uz * r, a[1] - uz * r - ux * r],
    ];
  });

export function buildRailWall(I, scene, Kit, regMat) {
  const tex = concreteTex();
  const WALL = regMat(
      'railWall',
      new THREE.MeshStandardMaterial({
        color: '#a9a69c',
        map: tex.map,
        normalMap: tex.normalMap,
        roughness: 0.92,
      })
    ),
    TOP = regMat(
      'railWallCap',
      new THREE.MeshStandardMaterial({ color: '#8c8a83', map: tex.map, roughness: 0.9 })
    );
  for (let i = 0; i < RAIL_WALL.length - 1; i++) {
    const a = RAIL_WALL[i],
      b = RAIL_WALL[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      // local x along the wall, local z across it (+z = the courts' side, south-east)
      k = new Kit(I, a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]), 1),
      n = Math.max(1, Math.ceil(L / SEG));
    // a little overlap at the bends so no gap opens on the outside corner
    const x0 = i === 0 ? 0 : -T / 2,
      x1 = i === RAIL_WALL.length - 2 ? L : L + T / 2;
    for (let j = 0; j < n; j++) {
      const sa = x0 + ((x1 - x0) * j) / n,
        sb = x0 + ((x1 - x0) * (j + 1)) / n,
        ga = H(...k.w(sa, 0)) - k.base,
        gb = H(...k.w(sb, 0)) - k.base,
        top = Math.max(ga, gb) + WH;
      k.box(sa, sb, Math.min(ga, gb) - 0.4, top - CAP, -T / 2, T / 2, WALL, {
        col: false,
        tile: [3, 3],
      });
      k.box(sa, sb, top - CAP, top, -T / 2 - 0.05, T / 2 + 0.05, TOP, { col: false });
      // collision per piece: src/physics/PhysWorld.js puts a wall line at the ground under its middle,
      // so a 90 m line on a 2 m slope would leave its low end open underneath
      const A = k.w(sa, 0),
        B = k.w(sb, 0);
      I.addWall(A[0], A[1], B[0], B[1], -1, WH);
    }
    // pilasters on the courts' side
    const np = Math.max(1, Math.round(L / PIER));
    for (let j = i === 0 ? 0 : 1; j <= np; j++) {
      const s = (L * j) / np,
        g = H(...k.w(s, 0)) - k.base;
      k.box(s - 0.16, s + 0.16, g - 0.4, g + WH - CAP, T / 2, T / 2 + 0.14, WALL, {
        col: false,
        tile: [3, 3],
      });
    }
    k.finish(scene);
  }
}
