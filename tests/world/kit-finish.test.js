// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Interiors, Kit, regMat, cullFurniture, FURNITURE_FAR } from '../../src/world/Kit.js';
import { installOpaqueSort } from '../../src/graphics/RenderSort.js';

// Kit.finish batching, furniture culling, and opaque shader-program sort
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
const kit = () => {
  const scene = new THREE.Scene(),
    I = new Interiors(scene);
  return { scene, I, k: new Kit(I, 0, 0, 0) };
};
const meshes = (g) => g.children.filter((o) => o.isMesh);
const canvasTex = () => {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 32;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

describe('Kit.finish merges plain colours and static planes (same pixels, fewer draws)', () => {
  it('merges plain-coloured parts into one vertex-coloured mesh, keeps glass / glowing / textured ones apart', () => {
    const { scene, k } = kit();
    const red = regMat('t_red', std({ color: '#cc2222' })),
      blue = regMat('t_blue', std({ color: '#2244cc' })),
      glow = std({ color: '#ffffff', emissive: '#ffd49a', emissiveIntensity: 0 }); // lit at night later
    glow.userData.glow = 1;
    regMat('t_glow', glow);
    const tex = regMat('t_tex', std({ map: canvasTex() }));
    k.box(0, 1, 0, 1, 0, 1, red, { col: false });
    k.box(2, 3, 0, 1, 0, 1, blue, { col: false });
    k.box(4, 5, 0, 1, 0, 1, 't_glow', { col: false });
    k.box(6, 7, 0, 1, 0, 1, tex, { col: false });
    k.finish(scene);
    const ms = meshes(k.group);
    const painted = ms.filter((m) => m.name === 'kit:painted');
    expect(painted).toHaveLength(1);
    const c = painted[0].geometry.attributes.color;
    const cols = new Set();
    for (let i = 0; i < c.count; i++)
      cols.add([c.getX(i), c.getY(i), c.getZ(i)].map((v) => v.toFixed(4)).join());
    expect(cols).toEqual(
      new Set([
        [new THREE.Color('#cc2222').r, new THREE.Color('#cc2222').g, new THREE.Color('#cc2222').b]
          .map((v) => v.toFixed(4))
          .join(),
        [new THREE.Color('#2244cc').r, new THREE.Color('#2244cc').g, new THREE.Color('#2244cc').b]
          .map((v) => v.toFixed(4))
          .join(),
      ])
    );
    // the glowing and the textured part keep their own material
    expect(ms.some((m) => m.material === glow)).toBe(true);
    expect(ms.some((m) => m.name === 'kit:t_tex')).toBe(true);
    expect(ms).toHaveLength(3);
  });

  it('packs static opaque planes into one atlas mesh, leaves dynamic and see-through ones alone', () => {
    const { scene, k } = kit();
    k.plane(canvasTex(), 1, 0.5, 0, 1, 0);
    k.plane(canvasTex(), 1, 0.5, 2, 1, 0, Math.PI / 2);
    const dyn = k.plane(canvasTex(), 1, 0.5, 4, 1, 0);
    dyn.userData.dynamic = true;
    const glassy = k.plane(canvasTex(), 1, 0.5, 6, 1, 0, 0, { transparent: true });
    k.finish(scene);
    const planes = k.group.children.filter((o) => o.name === 'kit:planes');
    expect(planes).toHaveLength(1);
    expect(planes[0].geometry.attributes.position.count).toBe(8); // two quads
    expect(k.group.children).toContain(dyn);
    expect(k.group.children).toContain(glassy);
  });
});

describe('Kit.furniture and cullFurniture (furniture hidden from > 45 m)', () => {
  it('merges furniture into its own group and hides it from far away', () => {
    const { scene, I, k } = kit();
    const wall = regMat('t_wall', std({ color: '#dddddd' })),
      wood = regMat('t_wood', std({ color: '#8a5a2b' }));
    k.box(0, 10, 0, 3, 0, 0.2, wall, { col: false });
    k.furniture(() => k.box(4, 5, 0, 0.75, 4, 5, wood, { col: false }));
    k.finish(scene);
    expect(I.furniture).toHaveLength(1);
    const fg = I.furniture[0];
    expect(fg.parent).toBe(k.group);
    expect(meshes(fg)).toHaveLength(1);
    expect(meshes(k.group)).toHaveLength(1); // the wall alone
    scene.updateMatrixWorld(true);
    const cull = cullFurniture(I),
      camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 1.6, 4.5 + FURNITURE_FAR + 10);
    cull(1, { camera });
    expect(fg.visible).toBe(false);
    camera.position.set(5, 1.6, 4.5 + FURNITURE_FAR - 10);
    cull(1, { camera });
    expect(fg.visible).toBe(true);
  });
});

describe('installOpaqueSort (opaque draws grouped by shader program)', () => {
  it('keeps groupOrder / renderOrder first, then program, material, distance', () => {
    let sort = null;
    const progs = new Map();
    const renderer = {
      properties: { get: (m) => ({ currentProgram: progs.get(m) }) },
      info: { render: { frame: 1 } },
      setOpaqueSort: (f) => (sort = f),
    };
    installOpaqueSort(renderer);
    const mA = new THREE.MeshStandardMaterial(),
      mB = new THREE.MeshStandardMaterial(),
      mC = new THREE.MeshStandardMaterial();
    progs.set(mA, { id: 2 });
    progs.set(mB, { id: 1 });
    progs.set(mC, { id: 2 });
    const item = (id, material, z, renderOrder = 0) => ({
      id,
      material,
      z,
      renderOrder,
      groupOrder: 0,
    });
    const list = [
      item(1, mA, 5),
      item(2, mB, 9),
      item(3, mC, 1),
      item(4, mA, 1),
      item(5, mB, 1, -1),
    ];
    list.sort(sort);
    expect(list.map((i) => i.id)).toEqual([5, 2, 4, 1, 3]);
  });
});
