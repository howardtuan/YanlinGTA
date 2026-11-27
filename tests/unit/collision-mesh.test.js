// #302 外觀網格 vs 碰撞：tools/collision_mesh_check.mjs 在遊戲裡抓到「看得到卻穿得過」的位置，修好後這些點要被擋住。
// 這裡在 node 裡建出那幾個街區（只建街屋，不建整張地圖），看玩家在那一點（身體半徑 0.38 m、腳在地面）會不會碰到牆。
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { Interiors } from '../../src/world/Kit.js';
import { CollisionWorld } from '../../src/physics/Collision.js';
import { ZONES } from '../../src/world/zones/Zones.js';

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/cycu.json'), 'utf8'));

// 各處抓到的點（世界座標 x, z）：修之前離任何碰撞都超過 0.4 m，玩家中心站得到、身體陷進看得到的牆
const SPOTS = {
  大仁一街街屋: [[75.63, 436.63]], // 鼎藏中原匯工地：包藍網的結構體（碰撞原本內縮 0.7 m）
  實踐路街屋: [[66.63, 485.38]], // 同一棟面實踐路的那一半（src/world/buildings/shijian/S4.js）
  環中東路街屋: [
    [455.38, 207.13], // 森林川家具立面板（貼在 OSM 牆外 0.55 m）
    [438.63, 221.38],
    [387.38, 260.88], // 響叮噹五金
    [373.38, 271.63],
    [32.38, 546.38], // I 段立面板
    [-17.38, 584.88],
    [61.88, 528.38], // 夾子園騎樓裡的夾娃娃機
    [71.63, 520.63],
  ],
  新中北路街屋: [[231.13, -383.38]], // SegL3 帆布圍籬後修剪過的綠籬
};

function buildZone(name) {
  const scene = new THREE.Scene(),
    I = new Interiors(scene),
    collision = new CollisionWorld({ minX: -820, maxX: 1000, minZ: -900, maxZ: 740 });
  const z = ZONES.find((zz) => zz.name === name);
  z.build(I, scene, data, collision);
  return { I, collision };
}

describe('#302 街屋：看得到的牆要擋人', () => {
  const built = {};
  beforeAll(() => {
    for (const name of Object.keys(SPOTS)) built[name] = buildZone(name);
  }, 120e3);
  for (const [name, pts] of Object.entries(SPOTS))
    it(`${name}：掃描抓到的點現在都碰得到牆`, () => {
      const { I, collision } = built[name];
      const free = pts.filter(
        ([x, z]) =>
          !I.blocked(x, z, 0.4, 0) && !collision.blocked(x, z, 0.4) && !collision.insideAny(x, z)
      );
      expect(free).toEqual([]);
    });
});
