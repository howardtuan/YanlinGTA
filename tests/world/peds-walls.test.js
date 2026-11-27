// #302：路人沿人行道路徑走（離道路中心固定的距離），走路時完全不做碰撞，路徑貼到街屋立面或牆就直接走進去
// （遊戲裡 3 分鐘取樣：在建物內 41 次、離牆不到 0.15 m 104 次）。現在路徑點被擋住時往馬路那側找空位，走路也會被牆推出。
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Peds } from '../../src/entities/NPC.js';
import { CollisionWorld } from '../../src/physics/Collision.js';

// a street along +x (centre line z = 0, 8 m wide), its pavement path 4.5～5.2 m off the centre on the +z side,
// and a shop front reaching out to z = 4.6 between x = 10 and x = 20
function setup() {
  const C = new CollisionWorld({ minX: -100, maxX: 100, minZ: -100, maxZ: 100 });
  C.addPolygon(
    [
      [10, 4.6],
      [20, 4.6],
      [20, 15],
      [10, 15],
    ],
    8
  );
  const peds = Object.create(Peds.prototype);
  peds.coll = C;
  peds.list = [];
  const p = {
    from: { x: 0, z: 0 },
    to: { x: 40, z: 0 },
    len: 40,
    d: 0,
    side: 1, // the +z side of the way
    offK: 0.5,
    dodge: 0,
    edge: { road: { drive: true }, w: 8 },
    pos: new THREE.Vector3(),
    heading: 0,
    ghost: false,
    corner: null,
    state: 'walk',
    ch: { root: { position: { y: 0 } } },
  };
  return { C, peds, p };
}

describe('Peds keep out of shop fronts', () => {
  it('a blocked path point moves towards the road until it is clear', () => {
    const { C, peds, p } = setup();
    p.d = 15;
    const [, z0] = peds._target(p, 0);
    expect(C.insideAny(15, z0)).toBe(true); // the path itself runs through the shop
    const [x, z] = peds._clearTarget(p);
    expect(x).toBeCloseTo(15);
    expect(C.insideAny(x, z)).toBe(false);
    expect(C.blocked(x, z, 0.3)).toBe(false);
    expect(Math.abs(z)).toBeLessThan(4.6);
    p.d = 30; // past it: back on the path
    expect(peds._clearTarget(p)).toEqual(peds._target(p, 0));
  });
  it('walking past the shop never stands inside it', () => {
    const { C, peds, p } = setup();
    peds._place(p, 0);
    for (let d = 0; d < 35; d += 0.05) {
      p.d = d;
      peds._place(p, 1 / 30, 1.5);
      expect(C.insideAny(p.pos.x, p.pos.z)).toBe(false);
    }
    expect(p.pos.x).toBeGreaterThan(30);
  });
});
