import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { installVisibleMatrices } from '../../src/graphics/VisibleMatrices.js';

const wx = (o) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).x;

describe('world matrices only for visible subtrees', () => {
  it('skips hidden subtrees and catches them up when they show again', () => {
    const scene = installVisibleMatrices(new THREE.Scene());
    const parent = new THREE.Group(),
      hidden = new THREE.Group(),
      leaf = new THREE.Object3D();
    leaf.position.x = 1;
    hidden.add(leaf);
    parent.add(hidden);
    scene.add(parent);
    hidden.visible = false;
    parent.position.x = 10;
    scene.updateMatrixWorld();
    expect(wx(parent)).toBe(10);
    expect(wx(leaf)).toBe(0); // not computed while hidden
    // the parent moves while the subtree is hidden, then it shows: it must be right on that frame
    parent.position.x = 20;
    scene.updateMatrixWorld();
    hidden.visible = true;
    scene.updateMatrixWorld();
    expect(wx(leaf)).toBe(21);
  });

  it('a frozen object (matrixAutoUpdate false) hidden from the start is placed when it first shows', () => {
    const scene = installVisibleMatrices(new THREE.Scene());
    const g = new THREE.Group();
    g.position.x = 5;
    g.updateMatrix();
    g.matrixAutoUpdate = false;
    g.visible = false;
    scene.add(g);
    scene.updateMatrixWorld();
    g.visible = true;
    scene.updateMatrixWorld();
    expect(wx(g)).toBe(5);
  });

  it('the explicit three.js paths still update hidden objects', () => {
    const scene = installVisibleMatrices(new THREE.Scene());
    const g = new THREE.Group();
    g.position.x = 3;
    g.visible = false;
    scene.add(g);
    expect(g.getWorldPosition(new THREE.Vector3()).x).toBe(3);
  });

  it('keeps a skinned mesh bound to its bones as its owner moves (character bodies)', () => {
    const scene = installVisibleMatrices(new THREE.Scene());
    const root = new THREE.Group(),
      bone = new THREE.Bone();
    root.add(bone);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    g.setAttribute(
      'skinIndex',
      new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4)
    );
    g.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4)
    );
    const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
    root.add(mesh);
    scene.add(root);
    scene.updateMatrixWorld();
    mesh.bind(new THREE.Skeleton([bone]), mesh.matrixWorld);
    root.position.set(7, 0, 3);
    scene.updateMatrixWorld();
    // AttachedBindMode: bindMatrixInverse follows the mesh's world matrix
    const expect3 = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    expect(mesh.bindMatrixInverse.equals(expect3)).toBe(true);
    expect(new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld).x).toBe(7);
  });
});
