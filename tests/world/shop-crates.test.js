// @vitest-environment happy-dom
// #302：街屋門口的小箱子（貨箱、紙箱、冰桶、門口立牌）原本畫進整排街屋、沒有碰撞，人和車都直接穿過去。
// 現在 finishRow 把它們收成 interiors.crates，遊戲裡變成可以撞飛的物理道具（像三角錐）。
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { Interiors, Kit, finishRow, regMat } from '../../src/world/Kit.js';
import { spawnWorldCrates } from '../../src/world/WorldProps.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
regMat('t_crate', std({ color: '#3f7a4c' }));
const NC = { col: false };

function row(build) {
  const scene = new THREE.Scene(),
    I = new Interiors(scene),
    k = new Kit(I, 10, 20, Math.PI / 2);
  build(k);
  return { scene, I, k };
}

describe('shop-front crates', () => {
  it('finishRow turns a loose box in front of the facade into a crate, in world space', () => {
    const { scene, I, k } = row((k) => {
      k.box(0.4, 1.0, 0, 0.9, -0.5, -0.05, 't_crate', NC); // crates by the door
    });
    finishRow(scene, [k]);
    expect(I.crates).toHaveLength(1);
    const c = I.crates[0];
    expect(c.w).toBeCloseTo(0.6);
    expect(c.h).toBeCloseTo(0.9);
    expect(c.d).toBeCloseTo(0.45);
    expect(c.color).toBe('#3f7a4c');
    // local (0.7, -0.275) turned by -90° about the origin (10, 20)
    const p = k.w(0.7, -0.275);
    expect(c.x).toBeCloseTo(p[0]);
    expect(c.z).toBeCloseTo(p[1]);
    // no longer drawn into the row
    let tris = 0;
    scene.traverse((o) => {
      if (o.isMesh) tris += o.geometry.attributes.position.count;
    });
    expect(tris).toBe(0);
  });

  it('keeps walls, big counters, raised parts, boxes behind the front and collidable boxes in the row', () => {
    const { scene, I, k } = row((k) => {
      k.box(0.3, 4.7, 0, 0.95, -0.55, -0.05, 't_crate', NC); // a stall counter (too wide)
      k.box(0.4, 1.0, 1.2, 2.0, -0.5, -0.05, 't_crate', NC); // hanging off the wall
      k.box(0.4, 1.0, 0, 0.9, 1, 2, 't_crate', NC); // inside the shop
      k.box(0.4, 1.0, 0, 0.9, -0.5, -0.05, 't_crate'); // has collision
      k.box(0.4, 1.0, 0, 0.9, -0.5, -0.05, 't_crate', { col: false, loose: false }); // opted out
      k.box(2.0, 2.7, 0, 1.2, -0.15, -0.05, 't_crate', NC); // a sign board: too thin to stand
      k.box(3.0, 3.34, 0, 1.2, -0.3, -0.05, 't_crate', NC); // a pilaster stub: too tall for its width
    });
    finishRow(scene, [k]);
    expect(I.crates).toHaveLength(0);
  });

  it('a box with something on top (a stool base under its seat) stays in the row', () => {
    const { scene, I, k } = row((k) => {
      k.box(0.4, 0.8, 0, 0.42, -0.6, -0.2, 't_crate', NC); // base
      k.box(0.35, 0.85, 0.42, 0.5, -0.65, -0.15, 't_crate', NC); // seat on it
      k.box(2.0, 2.5, 0, 0.5, -0.6, -0.2, 't_crate', NC); // a crate on its own
      k.box(4.0, 5.0, 0, 0.5, -0.7, -0.02, 't_crate', NC); // a plinth ...
      k.box(4.2, 4.8, 0, 4.0, -0.6, -0.1, 't_crate'); // ... with its pillar standing in it
    });
    finishRow(scene, [k]);
    expect(I.crates).toHaveLength(1);
    expect(I.crates[0].w).toBeCloseTo(0.5);
  });

  it('a building finished on its own (Kit.finish) keeps its boxes', () => {
    const scene = new THREE.Scene(),
      I = new Interiors(scene),
      k = new Kit(I, 0, 0, 0);
    k.box(0.4, 1.0, 0, 0.9, -0.5, -0.05, 't_crate', NC);
    k.finish(scene);
    expect(I.crates).toHaveLength(0);
    expect(k.group.children.some((m) => m.isMesh)).toBe(true);
  });

  it('spawns them as one instanced mesh with a physics prop each', () => {
    const scene = new THREE.Scene(),
      added = [];
    const physics = {
      ready: true,
      addProp: vi.fn((obj, opt) => {
        const rec = { obj, opt };
        added.push(rec);
        return rec;
      }),
    };
    const crates = [
      { x: 1, y: 0, z: 2, yaw: 0.3, w: 0.6, h: 0.9, d: 0.45, color: '#3f7a4c' },
      { x: 5, y: 0, z: 2, yaw: 0, w: 0.5, h: 0.5, d: 0.5, color: '#ffffff' },
    ];
    const r = spawnWorldCrates(scene, physics, crates);
    expect(scene.children).toHaveLength(1);
    expect(r.mesh.isInstancedMesh).toBe(true);
    expect(r.mesh.count).toBe(2);
    expect(added).toHaveLength(2);
    expect(added[0].opt).toMatchObject({ shape: 'box', hx: 0.3, hy: 0.45, hz: 0.225, y: 0.45 });
    expect(r.props.every((p) => p.crate)).toBe(true);
    // physics moving one writes its instance
    const m = new THREE.Matrix4();
    added[1].obj.position.set(7, 0, 3);
    added[1].obj.updateMatrix();
    r.mesh.getMatrixAt(1, m);
    expect(new THREE.Vector3().setFromMatrixPosition(m).x).toBeCloseTo(7);
  });
});
