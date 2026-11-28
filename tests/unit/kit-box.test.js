// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { boxGeometry } from '../../src/world/Kit.js';

// the bits of every float (so -0 and +0, or a last-place rounding difference, count as different)
const bits = (a) => Array.from(new Uint32Array(new Float32Array(a).buffer));
const same = (a, b) => {
  expect(a.index.array.constructor).toBe(b.index.array.constructor);
  expect(Array.from(a.index.array)).toEqual(Array.from(b.index.array));
  expect(Object.keys(a.attributes).sort()).toEqual(Object.keys(b.attributes).sort());
  for (const k of Object.keys(b.attributes)) {
    expect(a.attributes[k].itemSize).toBe(b.attributes[k].itemSize);
    expect(a.attributes[k].normalized).toBe(b.attributes[k].normalized);
    expect(bits(a.attributes[k].array)).toEqual(bits(b.attributes[k].array));
  }
  expect(a.groups).toEqual(b.groups);
};

describe('boxGeometry (#464)', () => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const sizes = [
    [1, 1, 1],
    [0.3, 2.7, 0.05],
    [12.34, 0.1, 7.77],
    [0, 1, 1],
    [1, 0, 0],
    [-0.4, 1.2, 0.6], // x1 < x0 in a builder: a box turned inside out, as THREE builds it
    [1e-7, 3e5, 0.333333],
    ...Array.from({ length: 200 }, () => [rnd() * 20, rnd() * 9, rnd() * 3 + 1e-4]),
  ];
  it('is THREE.BoxGeometry, bit for bit', () => {
    for (const [w, h, d] of sizes) same(boxGeometry(w, h, d), new THREE.BoxGeometry(w, h, d));
  });
  it('stays the same through translate / rotate and the tiled uvs Kit.box writes', () => {
    for (const [w, h, d] of sizes.slice(0, 60)) {
      const a = boxGeometry(w, h, d),
        b = new THREE.BoxGeometry(w, h, d);
      for (const g of [a, b]) {
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 0.7, uv.getY(i) * h * 1.3);
        g.rotateY(0.61);
        g.translate(w * 3.1 - 2, h / 2 + 0.25, -d * 7);
      }
      same(a, b);
    }
  });
});
