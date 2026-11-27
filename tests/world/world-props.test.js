import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { spawnWorldCones } from '../../src/world/WorldProps.js';

describe('WorldProps — dynamic world traffic cones', () => {
  it('spawns shared-geometry cone meshes, deduplicates overlapping points, and attaches cone physics props', () => {
    const scene = new THREE.Scene();
    const added = [];
    const physics = {
      ready: true,
      addProp: vi.fn((grp, opt) => {
        const rec = { grp, opt };
        added.push(rec);
        return rec;
      }),
    };

    const cones = spawnWorldCones(scene, physics, [
      [-200.6, 90.2],
      [-200.62, 90.21], // duplicate within 0.2m -> skipped
      [-193.6, 92.4],
      [Number.NaN, 10], // invalid -> skipped
    ]);

    expect(cones.length).toBe(2);
    expect(scene.children.length).toBe(2);
    expect(physics.addProp).toHaveBeenCalledTimes(2);
    expect(added[0].opt.sound).toBe('cone');
    expect(added[0].opt.parts).toHaveLength(2);
    // Geometry & materials are shared across all cones
    expect(cones[0].grp.children[1].geometry).toBe(cones[1].grp.children[1].geometry);
    expect(cones[0].grp.children[1].material).toBe(cones[1].grp.children[1].material);
  });

  it('still places visual cones gracefully when physics is disabled', () => {
    const scene = new THREE.Scene();
    const cones = spawnWorldCones(scene, { ready: false }, [[-190.4, 93.2]]);
    expect(cones.length).toBe(1);
    expect(cones[0].prop).toBeNull();
    expect(scene.children.length).toBe(1);
  });
});
