import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { ParkedScooters } from '../../src/core/ParkedScooters.js';

function makeMockGame(opts = {}) {
  const scene = new THREE.Scene();
  const geo = new THREE.BoxGeometry(0.6, 0.9, 1.5);
  const knocks = [];
  const addedVehicles = [];
  const game = {
    scene,
    world: {
      motoGeo: geo,
      motoSpots: opts.motoSpots || [
        [10, 10, 0, '#b8282a', 0.07, 0],
        [10.2, 10.1, 0, '#2c5aa0', -0.07, 0], // within 0.55m -> deduplicated
        [11.0, 10, 0, '#2c5aa0', -0.07, 0],
      ],
    },
    interiors: {
      scooters: opts.streetScooters || [[20, 20, Math.PI / 2, '#e8e8e4']],
    },
    vehicles: opts.vehicles || [],
    traffic: { vehicles: () => [] },
    race: { vehicles: () => [] },
    player: {
      pos: new THREE.Vector3(0, 0, 0),
      vehicle: null,
      worldPos() {
        return this.pos;
      },
    },
    audio: {
      physImpact: vi.fn(),
      bump: vi.fn(),
    },
    physics: {
      ready: opts.physicsReady ?? true,
      dropMover: vi.fn(),
      knock: vi.fn((mesh, shape, mass, vel, spin, onMove, onRest, key) => {
        const rec = { mesh, shape, mass, vel, spin, onMove, onRest, key };
        knocks.push(rec);
        return rec;
      }),
    },
    vehicleSpawner: {
      addVehicle: vi.fn((kind, x, z, yaw, _rnd, opt) => {
        const v = {
          kind,
          pos: new THREE.Vector3(x, 0, z),
          heading: yaw,
          color: opt?.color,
          mesh: new THREE.Group(),
        };
        game.vehicles.push(v);
        addedVehicles.push(v);
        return v;
      }),
    },
  };
  return { game, knocks, addedVehicles };
}

describe('ParkedScooters (Option B: instanced render + collision + domino knock + claim)', () => {
  it('merges Furniture + street scooters into one InstancedMesh and deduplicates overlaps', () => {
    const { game } = makeMockGame();
    const ps = new ParkedScooters(game);
    expect(ps.slots.length).toBe(3); // 2 deduplicated motoSpots + 1 street scooter
    expect(ps.im).toBeInstanceOf(THREE.InstancedMesh);
    expect(ps.im.count).toBe(3);
  });

  it('pushes walking player out of static parked scooters', () => {
    const { game } = makeMockGame({
      motoSpots: [[10, 10, 0, '#b8282a', 0.07, 0]],
      streetScooters: [],
    });
    const ps = new ParkedScooters(game);
    const pos = { x: 10.2, y: 0, z: 10 };
    const hit = ps.resolveFoot(pos, 0.35);
    expect(hit).toBe(true);
    expect(pos.x).toBeGreaterThanOrEqual(10.68);
  });

  it('knocks parked scooters into dynamic Rapier bodies, chains domino hits, and bakes fallen pose back into InstancedMesh', () => {
    const { game, knocks } = makeMockGame({
      motoSpots: [
        [10, 10, 0, '#b8282a', 0.07, 0],
        [10.8, 10, 0, '#2c5aa0', -0.07, 0],
      ],
      streetScooters: [],
    });
    const ps = new ParkedScooters(game);
    const s0 = ps.slots[0];
    const s1 = ps.slots[1];

    expect(ps.knockSlot(s0, 6, 0, 6)).toBe(true);
    expect(s0.state).toBe('flying');
    expect(knocks.length).toBe(1);
    expect(game.audio.physImpact).toHaveBeenCalledWith('bike_scrape', expect.any(Number), 10, 10);

    // Simulate s0 flying into s1 -> triggers domino chain knock
    knocks[0].onMove({ x: 10.6, y: 0.2, z: 10 }, new THREE.Quaternion());
    ps.update(0.016);
    expect(s1.state).toBe('flying');
    expect(knocks.length).toBe(2);

    // When s0 comes to rest, temporary mesh is removed and slot becomes 'fallen'
    const restPos = new THREE.Vector3(12.5, 0.15, 10.4);
    const restQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, 1.4));
    knocks[0].onRest(restPos, restQuat);
    expect(s0.state).toBe('fallen');
    expect(s0.x).toBeCloseTo(12.5, 3);
    expect(game.scene.children.includes(knocks[0].mesh)).toBe(false);
  });

  it('allows claiming a nearby static or fallen scooter as a real drivable Vehicle (Option B)', () => {
    const { game, addedVehicles } = makeMockGame({
      motoSpots: [[10, 10, 1.2, '#b8282a', 0.07, 0]],
      streetScooters: [],
    });
    const ps = new ParkedScooters(game);
    const found = ps.nearestSpot(10.5, 10.5, 0, 3.2);
    expect(found).not.toBeNull();
    expect(found.spot.color).toBe('#b8282a');

    const veh = ps.claimAsVehicle(found.spot);
    expect(veh).not.toBeNull();
    expect(veh.color).toBe('#b8282a');
    expect(addedVehicles.length).toBe(1);
    expect(found.spot.state).toBe('taken');
    expect(ps.nearestSpot(10.5, 10.5, 0, 3.2)).toBeNull();
  });
});
