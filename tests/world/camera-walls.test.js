// #302 第三人稱相機：背貼著牆時相機原本最少離玩家 0.8 m，牆比這更近就被放進建物裡（遊戲裡量 720 次幾乎每次都在牆內）。
// 現在拉到牆前 0.35 m、需要時升到頭上往下看，往後撞牆時也不再慢半拍。
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../../src/entities/Player.js';
import { CollisionWorld } from '../../src/physics/Collision.js';

function world() {
  const C = new CollisionWorld({ minX: -100, maxX: 100, minZ: -100, maxZ: 100 });
  C.addPolygon(
    [
      [-10, 1],
      [10, 1],
      [10, 20],
      [-10, 20],
    ],
    12
  ); // a building whose south wall is the line z = 1
  return C;
}
const player = (x, z) => {
  const root = new THREE.Object3D();
  return {
    vehicle: null,
    y: 0,
    pos: new THREE.Vector3(x, 0, z),
    ch: { root },
    worldPos() {
      return this.pos;
    },
  };
};
const run = (rig, p, C, n = 40) => {
  for (let i = 0; i < n; i++) rig.update(1 / 60, { mdx: 0, mdy: 0 }, p, C, 1, null);
};

describe('CameraRig keeps out of buildings', () => {
  it('back to a wall: the camera stays in front of it, over your head', () => {
    const C = world(),
      cam = new THREE.PerspectiveCamera(62, 1.7, 0.2, 100);
    for (const pitch of [0.05, 0.32, 0.7]) {
      const rig = new CameraRig(cam),
        p = player(0, 0.6); // 0.4 m from the wall, facing away from it (-z)
      rig.yaw = Math.PI;
      rig.pitch = pitch;
      run(rig, p, C);
      const c = cam.position;
      expect(C.insideAny(c.x, c.z) && c.y < 12).toBe(false);
      expect(1 - c.z).toBeGreaterThan(0.3);
      expect(c.y).toBeGreaterThan(1.55); // risen over the head
      expect(p.ch.root.visible).toBe(false); // the body would fill the view
    }
  });
  it('backing up into a wall: no frames from inside it', () => {
    const C = world(),
      cam = new THREE.PerspectiveCamera(62, 1.7, 0.2, 100),
      rig = new CameraRig(cam),
      p = player(0, -6);
    rig.yaw = Math.PI;
    run(rig, p, C);
    for (let z = -6; z <= 0.6; z += 0.15) {
      p.pos.z = z;
      run(rig, p, C, 1);
      const c = cam.position;
      expect(C.insideAny(c.x, c.z) && c.y < 12).toBe(false);
    }
  });
  it('in the open it keeps its distance and shows you', () => {
    const C = world(),
      cam = new THREE.PerspectiveCamera(62, 1.7, 0.2, 100),
      rig = new CameraRig(cam),
      p = player(0, -30);
    rig.yaw = Math.PI;
    run(rig, p, C, 120);
    expect(Math.hypot(cam.position.x, cam.position.z + 30)).toBeGreaterThan(3.5);
    expect(p.ch.root.visible).toBe(true);
  });
});
