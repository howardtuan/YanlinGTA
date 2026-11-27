// @vitest-environment happy-dom
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
  新中北路街屋: [
    [231.13, -383.38], // SegL3 帆布圍籬後修剪過的綠籬
    [210.63, -218.63], // SegL2 藝墅館社區別墅排之間 2 m 高的實心地坪（從後面草地走得進去）
    [-559.38, 364.88], // SegF1 幸福街鐵皮倉庫後面的廠房
    [-548.63, 364.88],
    [-548.13, 350.38], // 水塔旁的低矮鐵皮屋
    [250.13, 33.88], // SegX1 SYM 機車行前的綠籬
    [-644.38, 586.88], // SegF3 至德堂前院的龍柏
    [-527.13, 5.13], // SegX10 碎石空地後面的圍網
    [-624.88, 715.38], // SegF3 SYM 轉角面莒光路的一樓店面
    [-641.13, 631.38], // SegF3 舊透天前院關著的鐵門
    [-642.63, 611.38], // SegF3 147～153 號騎樓的分戶柱
    [-633.13, 697.38], // SegF3 175 號轉角的廣告板（Kit 是直的、路是彎的）
    [128.63, -68.13], // SegX5 君隆牛肉麵貼在 OSM 牆外的店面
    [242.63, -99.38], // SegL1 469 巷西側路邊的灌木
    [-398.88, 252.38], // SegLB1 s≈100 出入口關著的門
    [-492.13, 441.63], // SegZ2 停車場的繳費機立牌
  ],
  實踐路街屋: [
    [66.63, 485.38], // 同一棟面實踐路的那一半（src/world/buildings/shijian/S4.js）
    [-45.38, 405.63], // S3 弘揚路口轉角的墨綠帆布攤位
    [-336.63, -10.88], // N2 門口的菜單看板
    [-270.13, 190.38], // S1 FIFTY% 白色方框的柱子
  ],
  大仁街: [[-204.63, 106.63]], // 帆布蓋著的夾娃娃機
  普忠路街屋: [
    [597.88, -29.13], // 車車澡堂落地看板
    [396.13, -253.38], // 洗車機看板
  ],
  日新路街屋: [
    [-346.63, 385.38], // 帆布蓋著的攤架
    [-365.88, 401.38], // N.S Shopping 門口的貨架
  ],
  // 校內 E 區（祐生）、C 區（工學館）在 node 裡單獨建不出那幾棟，回歸靠 tools/collision_mesh_check.mjs
  'D 區': [[-61.63, 166.63]], // 陸華樓一樓拉下的鐵捲門
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
