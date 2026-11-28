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
});
