import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { ParkedScooters } from '../../src/core/ParkedScooters.js';
import { VehicleSpawner } from '../../src/core/VehicleSpawner.js';
import { Vehicle } from '../../src/entities/Vehicles.js';
import {
  pickScooterVariant,
  getVariantInstancedAssets,
  instancedGroupOf,
  buildScooterVariant,
  SCOOTER_TYPES,
} from '../../src/entities/ScooterVariants.js';
import {
  solveVehicleImpact,
  solvePersonImpact,
  solvePersonPersonImpact,
  solveRiderEjection,
  sampleAnthropometry,
  RESTITUTION,
  GRAVITY,
} from '../../src/physics/ImpactPhysics.js';

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
      cars: opts.streetCars || [],
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
      knock: vi.fn((mesh, shape, mass, vel, spin, onMove, onRest, key, opt) => {
        const q = mesh.quaternion;
        const body = {
          lv: { ...vel },
          aw: spin ? { ...spin } : { x: 0, y: 0, z: 0 },
          q: { x: q.x, y: q.y, z: q.z, w: q.w },
          rotation() {
            return this.q;
          },
          linvel() {
            return this.lv;
          },
          angvel() {
            return this.aw;
          },
          setLinvel(v) {
            this.lv = { ...v };
          },
          setAngvel(w) {
            this.aw = { ...w };
          },
        };
        const rec = { mesh, shape, mass, vel, spin, onMove, onRest, key, opt, body };
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
          variant: opt?.variant,
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
  it('merges Furniture + street scooters into per-type InstancedMeshes and deduplicates overlaps', () => {
    const { game } = makeMockGame();
    const ps = new ParkedScooters(game);
    expect(ps.slots.length).toBe(3); // 2 deduplicated motoSpots + 1 street scooter
    expect(ps.im).toBeInstanceOf(THREE.InstancedMesh);
    const ims = new Set(ps.scooterSlots.map((s) => s.chunk.paintIm));
    expect([...ims].reduce((n, im) => n + im.count, 0)).toBe(3);
    // each mesh holds one body-type group, each slot sits at its own index
    for (const s of ps.scooterSlots) {
      expect(s.chunk.paintIm.userData.group).toBe(instancedGroupOf(s.type));
      expect(s.chunk.paintIm.geometry.attributes.iAcc.count).toBe(s.chunk.paintIm.count);
    }
  });

  it('picks body types, accessories and colours from the slot position only (no shared rnd draws)', () => {
    const a = pickScooterVariant(123.4, -56.7, '#b8282a');
    expect(pickScooterVariant(123.4, -56.7, '#2c5aa0')).toEqual(a); // the Furniture colour draw does not matter
    const counts = new Array(SCOOTER_TYPES).fill(0);
    let delivery = 0,
      helmets = 0;
    for (let i = 0; i < 4000; i++) {
      const v = pickScooterVariant((i % 80) * 0.8, Math.floor(i / 80) * 2.3, '#e8e8e4');
      counts[v.type]++;
      if (v.acc & 6) delivery++;
      if (v.acc & 24) helmets++;
      expect(v.color).toMatch(/^#[0-9a-f]{6}$/);
    }
    // every type shows up; the plain commuter is the most common, big manual bikes / maxi scooters are rare
    expect(counts.every((c) => c > 100)).toBe(true);
    expect(counts[0]).toBe(Math.max(...counts));
    expect(counts[0] / 4000).toBeGreaterThan(0.24);
    expect(counts[6] / 4000).toBeLessThan(0.11);
    expect(delivery / 4000).toBeGreaterThan(0.02);
    expect(delivery / 4000).toBeLessThan(0.1);
    expect(helmets / 4000).toBeGreaterThan(0.08);
    // hand-placed bikes keep their builder's colour
    expect(pickScooterVariant(5, 5, '#123456', true).color).toBe('#123456');
  });

  it('paints bikes in one, two or three colours ([main, secondary, accent])', () => {
    const n = [0, 0, 0, 0];
    for (let i = 0; i < 3000; i++) {
      const v = pickScooterVariant((i % 60) * 0.8, Math.floor(i / 60) * 2.3, '#e8e8e4');
      expect(v.colors[0]).toBe(v.color);
      n[new Set(v.colors.map((c) => c.toLowerCase())).size]++;
    }
    for (const k of [1, 2, 3]) expect(n[k] / 3000).toBeGreaterThan(0.2);
    // every type has secondary and accent pieces; the instanced shader picks the colour by slot
    for (let gi = 0; gi < 5; gi++) {
      const pm = getVariantInstancedAssets(gi).geo.attributes.paintMask.array;
      for (const slot of [1, 2, 3]) expect(pm.includes(slot)).toBe(true);
    }
    const g = buildScooterVariant(1, ['#ff0000', '#00ff00', '#0000ff'], 0);
    const cols = new Set();
    g.traverse((o) => o.isMesh && cols.add(o.material.color.getHexString()));
    for (const c of ['ff0000', '00ff00', '0000ff']) expect(cols.has(c)).toBe(true);
  });

  it('keeps every body type inside the parked footprint, standing on its two wheels', () => {
    for (let t = 1; t < SCOOTER_TYPES; t++) {
      const g = buildScooterVariant(t, '#888888', 2); // with a delivery box (a hanging helmet sticks out sideways)
      g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g);
      expect(box.min.z).toBeGreaterThan(-1.25); // a delivery box overhangs the tail, as on real bikes
      expect(box.max.z).toBeLessThan(1.0);
      expect(box.max.x - box.min.x).toBeLessThan(0.8);
      expect(box.min.y).toBeGreaterThan(-0.02);
      expect(box.min.y).toBeLessThan(0.02); // wheels touch the ground
      expect(g.userData.wheels.length).toBe(2);
    }
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
    // indexed at its collision box centre (0.44 m up the body = beside the origin when lying on its side),
    // drawn from the body origin
    expect(s0.x + s0.ox).toBeCloseTo(12.5, 3);
    expect(s0.z + s0.oz).toBeCloseTo(10.4, 3);
    expect(Math.hypot(s0.ox, s0.oz)).toBeCloseTo(0.44 * Math.sin(1.4), 2);
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
    expect(found.spot.color).toBe(pickScooterVariant(10, 10, '#b8282a').color);

    const veh = ps.claimAsVehicle(found.spot);
    expect(veh).not.toBeNull();
    expect(veh.color).toBe(found.spot.color);
    // the ridden bike keeps the parked body type and accessories
    expect(veh.variant).toEqual({
      type: found.spot.type,
      acc: found.spot.acc,
      colors: found.spot.colors,
    });
    expect(addedVehicles.length).toBe(1);
    expect(found.spot.state).toBe('taken');
    expect(ps.nearestSpot(10.5, 10.5, 0, 3.2)).toBeNull();
  });

  it('prevents slow player vehicles (< 0.35 m/s) from clipping through static parked scooters', () => {
    const { game } = makeMockGame({
      motoSpots: [[10, 10, 0, '#b8282a', 0.07, 0]],
      streetScooters: [],
    });
    const ps = new ParkedScooters(game);
    const v = {
      kind: 'scooter',
      pos: new THREE.Vector3(9.5, 0, 10),
      heading: 0,
      speed: 0.1,
      hl: 0.9,
      hw: 0.35,
      mesh: { position: { y: 0 } },
      forward: () => [0, 1],
    };
    game.player.vehicle = v;
    ps.update(0.016);
    expect(v.pos.x).toBeLessThan(9.5);
    expect(ps.slots[0].state).toBe('static');
  });

  it('uses drivable scooter paint+trim meshes from start and handles parked cars (collision, knock, claim)', () => {
    const { game, addedVehicles } = makeMockGame({
      motoSpots: [[10, 10, 0, '#b8282a', 0.07, 0]],
      streetScooters: [],
      streetCars: [[30, 30, Math.PI, '#3f6fb0']],
    });
    const ps = new ParkedScooters(game);
    // Scooters render with real Scooters.js paint + trim InstancedMeshes
    expect(ps.scooterPaintIm).toBeInstanceOf(THREE.InstancedMesh);
    expect(ps.scooterTrimIm).toBeNull(); // paint + trim share one draw (paintMask vertex attribute)
    // Cars render with real Vehicles.js buildCar paint + trim InstancedMeshes
    expect(ps.carPaintIm).toBeInstanceOf(THREE.InstancedMesh);
    expect(ps.carTrimIm).toBeInstanceOf(THREE.InstancedMesh);
    expect(ps.carSlots.length).toBe(1);

    // Walking player is pushed out of parked car
    const pos = { x: 30.4, y: 0, z: 30 };
    expect(ps.resolveFoot(pos, 0.35)).toBe(true);
    expect(pos.x).toBeGreaterThanOrEqual(31.2);

    // Light scooter bumping a heavy parked car bounces off instead of clipping
    const sc = {
      kind: 'scooter',
      pos: new THREE.Vector3(28.8, 0, 30),
      heading: Math.PI / 2,
      speed: 2.5,
      hl: 0.9,
      hw: 0.35,
      mesh: { position: { y: 0 } },
      forward: () => [1, 0],
    };
    game.player.vehicle = sc;
    ps.update(0.016);
    expect(sc.pos.x).toBeLessThan(28.8);
    expect(ps.carSlots[0].state).toBe('static');

    // Pressing F nearby claims the parked car as a real drivable 'car' keeping exact color
    const nearCar = ps.nearestSpot(31.8, 30, 0, 3.2);
    expect(nearCar).not.toBeNull();
    expect(nearCar.spot.kind).toBe('car');
    const carVeh = ps.claimAsVehicle(nearCar.spot);
    expect(carVeh.kind).toBe('car');
    expect(carVeh.color).toBe('#3f6fb0');
    expect(addedVehicles.at(-1)).toBe(carVeh);
  });

  it('keeps parked scooter & car geometry lean (< 1200 tris) and frustum-culled per spatial chunk for mobile GPU safety', () => {
    const { game } = makeMockGame({
      motoSpots: [
        [10, 10, 0, '#b8282a', 0.07, 0],
        [300, 300, 0, '#2c5aa0', -0.07, 0],
      ],
      streetScooters: [],
      streetCars: [[20, 20, Math.PI, '#3f6fb0']],
    });
    game.quality = 'low';
    const ps = new ParkedScooters(game);
    const triCount = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
    // one geometry per body-type group (common types alone, rare ones in pairs), accessories included
    for (let gi = 0; gi < 5; gi++) {
      const tris = triCount(getVariantInstancedAssets(gi).geo);
      expect(tris).toBeLessThan(gi < 3 ? 1400 : 2600);
    }
    const carTris = triCount(ps.carAssets.paintGeo) + triCount(ps.carAssets.trimGeo);
    expect(carTris).toBeLessThan(600);
    // Distant 120m chunk is frustum-culled & hidden when far from player on mobile/low quality
    expect(ps.chunks.every((c) => c.paintIm.frustumCulled && c.paintIm.boundingSphere)).toBe(true);
    ps.update(0.016);
    const farChunk = ps.scooterSlots.find((s) => s.x === 300).chunk;
    const nearChunk = ps.scooterSlots.find((s) => s.x === 10).chunk;
    expect(nearChunk.paintIm.visible).toBe(true);
    expect(farChunk.paintIm.visible).toBe(false);
  });

  it('forwards both scooter() and car() on StreetPuzhong sub() Kit proxy', () => {
    const puzhongPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../src/world/buildings/StreetPuzhong.js'
    );
    const src = fs.readFileSync(puzhongPath, 'utf8');
    expect(src).toMatch(/scooter:\s*\([^)]*\)\s*=>\s*q\.scooter\(/);
    expect(src).toMatch(/car:\s*\([^)]*\)\s*=>\s*q\.car\(/);
  });

  it('catches bumper-to-bumper capsule hits, swept high-speed frames, fallen scooters, and Rapier movers', () => {
    const { game, knocks } = makeMockGame({
      motoSpots: [[10, 10, 0, '#b8282a', 0.07, 0]],
      streetScooters: [],
      streetCars: [[25, 25, 0, '#3f6fb0']],
    });
    const ps = new ParkedScooters(game);

    // 1. High-speed frame that would tunnel past the scooter center is caught by swept segSeg
    const fastCar = {
      kind: 'car',
      pos: new THREE.Vector3(10, 0, 14.5), // jumped past z=10 in one 30fps frame at 24 m/s? Check midpoint z=11.5!
      heading: 0,
      speed: 30,
      hl: 2.2,
      hw: 0.92,
      mesh: { position: { y: 0 } },
      forward: () => [0, 1],
    };
    game.player.vehicle = fastCar;
    ps.update(0.2); // midpoint at z = 14.5 - 3.0 = 11.5 -> bumper overlaps scooter nose at z = 10.78!
    expect(knocks.length).toBe(1);
    expect(ps.scooterSlots[0].state).toBe('flying');

    // 2. Once fallen, scooter still blocks walking player AND can be knocked again repeatedly!
    knocks[0].onRest(new THREE.Vector3(10, 0.14, 12), new THREE.Quaternion());
    expect(ps.scooterSlots[0].state).toBe('fallen');
    const walkPos = { x: 10.1, y: 0, z: 12 };
    expect(ps.resolveFoot(walkPos, 0.35)).toBe(true);
    fastCar.pos.set(10, 0, 12);
    ps.update(0.016);
    expect(knocks.length).toBe(2);
    expect(ps.scooterSlots[0].state).toBe('flying');

    // 3. appendMovers feeds parked cars & scooters (at all speeds) into Rapier movers with parkedSlot/onHit
    const movers = [];
    ps.appendMovers(movers, 24, 24, {
      body: {},
      speed: 12,
      mesh: { position: { y: 0 } },
    });
    expect(movers.length).toBe(1);
    expect(movers[0].key.hw).toBeUndefined();
    expect(movers[0].key.parkedSlot).toBe(ps.carSlots[0]);
    expect(typeof movers[0].key.onHit).toBe('function');
    expect(movers[0].hl).toBeGreaterThan(2);
  });

  it('enforces realistic mass & grounded physics: no launching cars with scooters, symmetrical scooter crashes, zero air-launch', () => {
    const { game, knocks } = makeMockGame({
      motoSpots: [
        [10, 10, 0, '#b8282a', 0.07, 0],
        [20, 10, 0, '#2c5aa0', -0.07, 0],
      ],
      streetScooters: [],
      streetCars: [
        [30, 30, 0, '#3f6fb0'],
        [50, 30, 0, '#d0d0d0'],
      ],
    });
    const ps = new ParkedScooters(game);
    const onBump = vi.fn();

    // 1. High-speed scooter (15 m/s) slamming a 1,250 kg parked car: car does NOT move, rider crashes!
    const playerScooter = {
      kind: 'scooter',
      speed: 15,
      bumpCooldown: 0,
      crash: null,
    };
    ps.onChassisHit(ps.carSlots[0], playerScooter, { impact: 15, sp: 15, nx: -1, nz: 0 }, onBump);
    expect(ps.carSlots[0].state).toBe('static');
    expect(knocks.length).toBe(0);
    // rigid barrier: the approach is taken and e of it comes back (slight rebound, not a stop dead in mid-air)
    expect(playerScooter.speed).toBeCloseTo(-RESTITUTION * 15, 5);
    expect(playerScooter.crash).not.toBeNull();

    // 2. Car (15 m/s) ramming a 1,250 kg parked car: obeys J = (1+e)*mu*vRel - J_hold, slides flat on 4 wheels (vy=0, roll=0)
    const playerCar = {
      kind: 'car',
      speed: 15,
      bumpCooldown: 0,
      crash: null,
    };
    ps.onChassisHit(ps.carSlots[1], playerCar, { impact: 15, sp: 15, nx: -1, nz: 0 }, onBump);
    expect(ps.carSlots[1].state).toBe('flying');
    expect(knocks.length).toBe(1);
    const carSol = solveVehicleImpact({ kind1: 'car', kind2: 'car', vRel: 15 });
    expect(knocks[0].vel.y).toBe(0);
    expect(Math.hypot(knocks[0].vel.x, knocks[0].vel.z)).toBeCloseTo(carSol.dv2, 2);
    expect(knocks[0].spin.x).toBe(0);
    expect(knocks[0].spin.z).toBe(0);
    expect(knocks[0].opt.friction).toBeCloseTo(0.8, 2);
    expect(playerCar.speed).toBeCloseTo(15 * carSol.kf, 2);

    // 3. Scooter (5 m/s) hitting parked scooter: exact Newtonian dv2 & dv1, rolls sideways, grounded (vy=0)
    const medScooter = {
      kind: 'scooter',
      speed: 5,
      bumpCooldown: 0,
      crash: null,
    };
    ps.onChassisHit(ps.scooterSlots[0], medScooter, { impact: 5, sp: 5, nx: -1, nz: 0 }, onBump);
    expect(ps.scooterSlots[0].state).toBe('flying');
    expect(knocks.length).toBe(2);
    const medSol = solveVehicleImpact({ kind1: 'scooter', kind2: 'scooter', vRel: 5 });
    expect(knocks[1].vel.y).toBe(0);
    expect(Math.hypot(knocks[1].vel.x, knocks[1].vel.z)).toBeCloseTo(medSol.dv2, 2);
    expect(Math.hypot(knocks[1].spin.x, knocks[1].spin.z)).toBeCloseTo(medSol.rollSpeed, 2);
    expect(knocks[1].opt.friction).toBeCloseTo(0.55, 2);
    expect(medScooter.speed).toBeCloseTo(5 * medSol.kf, 2);
    expect(medScooter.crash).toBeNull();

    // 4. Scooter (12 m/s) head-on into parked scooter: shock deceleration >= A_EJECT -> player crashes symmetrically!
    const fastScooter = {
      kind: 'scooter',
      speed: 12,
      bumpCooldown: 0,
      crash: null,
    };
    ps.onChassisHit(ps.scooterSlots[1], fastScooter, { impact: 12, sp: 12, nx: -1, nz: 0 }, onBump);
    expect(ps.scooterSlots[1].state).toBe('flying');
    expect(knocks.length).toBe(3);
    const fastSol = solveVehicleImpact({ kind1: 'scooter', kind2: 'scooter', vRel: 12 });
    expect(knocks[2].vel.y).toBe(0);
    expect(Math.hypot(knocks[2].vel.x, knocks[2].vel.z)).toBeCloseTo(fastSol.dv2, 2);
    expect(fastScooter.crash).not.toBeNull();

    // 5. Verify Newton's 3rd Law & exact momentum/energy conservation across free, parked, and domino collisions
    const sym = solveVehicleImpact({
      kind1: 'scooter',
      rider1: true,
      kind2: 'scooter',
      rider2: true,
      parked2: false,
      vRel: 10,
    });
    const expectedJ = (1 + RESTITUTION) * ((180 * 180) / 360) * 10;
    expect(sym.impulse).toBeCloseTo(expectedJ, 4);
    expect(sym.dv1).toBeCloseTo(sym.dv2, 4); // equal mass -> equal delta-V
    expect(sym.force).toBeCloseTo(expectedJ / 0.12, 2);
    expect(GRAVITY).toBeCloseTo(9.81, 2);

    // Exact momentum conservation with external static friction impulse: m1*v1' + m2*v2' == m1*v1 - J_hold
    const parked = solveVehicleImpact({
      kind1: 'scooter',
      rider1: false,
      kind2: 'scooter',
      rider2: false,
      parked2: true,
      vRel: 5,
    });
    const pBefore = parked.m1 * 5;
    const pAfter = parked.m1 * (5 - parked.dv1) + parked.m2 * parked.dv2;
    expect(pAfter).toBeCloseTo(pBefore - parked.holdImpulse, 5);
    // Kinetic energy never increases (inelastic + friction)
    const keBefore = 0.5 * parked.m1 * 25;
    const keAfter = 0.5 * parked.m1 * (5 - parked.dv1) ** 2 + 0.5 * parked.m2 * parked.dv2 ** 2;
    expect(keAfter).toBeLessThan(keBefore);

    // Rigid static-hold case (scooter vs 1,250 kg parked car at 10 m/s): exact rigid-body impulse J = (1+e)*m1*v
    const rigid = solveVehicleImpact({
      kind1: 'scooter',
      rider1: true,
      kind2: 'car',
      rider2: false,
      parked2: true,
      vRel: 10,
    });
    expect(rigid.moves).toBe(false);
    expect(rigid.dv2).toBe(0);
    expect(rigid.impulse).toBeCloseTo((1 + RESTITUTION) * rigid.m1 * 10, 4);
    expect(rigid.ejectRider1).toBe(true);
  });

  it('slides player scooter on throwOff and triggers rear-end crash when stationary player is hit by fast AI', () => {
    const { game, knocks } = makeMockGame();
    game.audio = {
      ...game.audio,
      engineStop: vi.fn(),
      setEngine: vi.fn(),
      skid: vi.fn(),
    };
    game.hud = { setSpeed: vi.fn(), toast: vi.fn() };
    game.headlight = { intensity: 1 };
    game.world.collision = {};
    game.player.exit = vi.fn();
    game.player.throwOff = vi.fn();
    const spawner = new VehicleSpawner(game);

    // 1. Stationary player scooter rear-ended by fast AI car (12 m/s closing)
    const v = Object.assign(Object.create(Vehicle.prototype), {
      id: 1,
      kind: 'scooter',
      speed: 0,
      heading: 0,
      moveAng: 0,
      bumpCooldown: 0,
      crash: null,
      pos: new THREE.Vector3(0, 0, 0),
      mesh: new THREE.Group(),
      sync: vi.fn(),
      resolveBody: vi.fn(),
    });
    const aiCar = { kind: 'car', ai: { stunned: 0 }, speed: 12, forward: () => [0, 1] };
    v._hitVehicle(aiCar, null, 11.5, 0, 1, 0, vi.fn(), 0, 11.5);
    expect(v.crash).not.toBeNull();
    expect(v.crash.pushed).toBe(true);
    expect(aiCar.ai.stunned).toBe(2);

    // 2. throwOff launches BOTH rider AND the player's own scooter forward along impact normal
    spawner.throwOff(v);
    expect(knocks.length).toBe(1);
    expect(knocks[0].vel.z).toBeGreaterThan(2.0);
    expect(game.player.throwOff).toHaveBeenCalled();
    const [rvx, rvz] = game.player.throwOff.mock.calls[0];
    expect(Math.hypot(rvx, rvz)).toBeGreaterThan(3.5);
    expect(game.hud.toast).toHaveBeenCalledWith(expect.stringContaining('被撞飛了'), 'bad', 2600);

    // 3. Head-on crash while riding forward (+Z) into obstacle (normal -Z): rider flies FORWARD (+Z), NOT backward!
    game.player.throwOff.mockClear();
    v.knocked = false;
    v.fallen = false;
    v.heading = 0; // forward = (0, +1)
    v.crash = { impact: 12, speed: 12, nx: 0, nz: -1, pushed: false };
    spawner.throwOff(v);
    const [fwdX, fwdZ, fwdY] = game.player.throwOff.mock.calls[0];
    expect(fwdZ).toBeGreaterThan(7.0); // pure forward inertia over the handlebars!
    expect(Math.abs(fwdX)).toBeLessThan(0.5);
    expect(fwdY).toBeGreaterThan(2.5);
  });

  it('applies Newtonian impulse-momentum to vehicle-vs-person and person-vs-person collisions', () => {
    // Car (1320 kg) vs 70 kg person at 10 m/s: car barely slows (kf > 0.9), total launch speed strictly equals dvTotal (energy conserving)
    const carHit = solvePersonImpact({ vehicleKind: 'car', riderOnVehicle: true, vRel: 10 });
    expect(carHit.knockDown).toBe(true);
    expect(carHit.kf).toBeGreaterThan(0.93);
    expect(Math.hypot(carHit.dvPerson, carHit.vyPerson)).toBeCloseTo(carHit.dvTotal, 4);

    // Heavier person (90 kg) vs lighter person (48 kg): heavier person slows scooter more and launches slightly slower
    const lightHit = solvePersonImpact({
      vehicleKind: 'scooter',
      riderOnVehicle: true,
      personMass: 48,
      personHeight: 1.56,
      vRel: 8,
    });
    const heavyHit = solvePersonImpact({
      vehicleKind: 'scooter',
      riderOnVehicle: true,
      personMass: 90,
      personHeight: 1.84,
      vRel: 8,
    });
    expect(heavyHit.dvVehicle).toBeGreaterThan(lightHit.dvVehicle);
    expect(lightHit.dvTotal).toBeGreaterThan(heavyHit.dvTotal);

    // High-speed scooter (17 m/s = 61 km/h) hitting a 70 kg person: shock >= 4.3 G -> scooter rider crashes too
    const scFast = solvePersonImpact({ vehicleKind: 'scooter', riderOnVehicle: true, vRel: 17 });
    expect(scFast.knockDown).toBe(true);
    expect(scFast.ejectRider1).toBe(true);

    // Person vs person with unequal masses (85 kg running into 50 kg): exact momentum transfer
    const asym = solvePersonPersonImpact(6.0, 85, 50);
    expect(asym.dv2Total).toBeGreaterThan(asym.dv1);
    expect(Math.hypot(asym.dv2, asym.vy2)).toBeCloseTo(asym.dv2Total, 4);

    // Rider ejection strictly scales with speed minus handlebar grip impulse (no arbitrary floor)
    const ejSlow = solveRiderEjection({
      speed: 8,
      impact: 8,
      nx: 0,
      nz: -1,
      fx: 0,
      fz: 1,
      pushed: false,
      riderMass: 70,
    });
    const ejFast = solveRiderEjection({
      speed: 14,
      impact: 14,
      nx: 0,
      nz: -1,
      fx: 0,
      fz: 1,
      pushed: false,
      riderMass: 70,
    });
    expect(ejFast.vz).toBeGreaterThan(ejSlow.vz);
    expect(ejSlow.vy).toBeGreaterThan(1.5);
  });

  it('samples realistic gender-based normal distributions for NPC height & weight and prevents peds clipping or ignoring knocked scooters', () => {
    // 1. Statistical check of Box-Muller normal distributions (500 male, 500 female)
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = (arr, m) => Math.sqrt(arr.reduce((a, x) => a + (x - m) ** 2, 0) / arr.length);
    const mh = [],
      mw = [],
      fh = [],
      fw = [];
    for (let i = 1; i <= 500; i++) {
      const u1 = ((i * 2654435761) >>> 0) / 4294967296;
      const u2 = (((i + 500) * 2246822519) >>> 0) / 4294967296;
      const m = sampleAnthropometry(false, u1, u2);
      const f = sampleAnthropometry(true, u1, u2);
      mh.push(m.height);
      mw.push(m.weight);
      fh.push(f.height);
      fw.push(f.weight);
      expect(m.height).toBeGreaterThanOrEqual(1.55);
      expect(m.height).toBeLessThanOrEqual(1.95);
      expect(f.height).toBeGreaterThanOrEqual(1.45);
      expect(f.height).toBeLessThanOrEqual(1.8);
    }
    const mhm = mean(mh),
      fhm = mean(fh),
      mwm = mean(mw),
      fwm = mean(fw);
    expect(mhm).toBeGreaterThan(1.7);
    expect(mhm).toBeLessThan(1.77);
    expect(fhm).toBeGreaterThan(1.57);
    expect(fhm).toBeLessThan(1.64);
    expect(sd(mh, mhm)).toBeGreaterThan(0.04);
    expect(mwm).toBeGreaterThan(64);
    expect(mwm).toBeLessThan(75);
    expect(fwm).toBeGreaterThan(49);
    expect(fwm).toBeLessThan(59);
    expect(mhm).toBeGreaterThan(fhm + 0.08);
    expect(mwm).toBeGreaterThan(fwm + 10);

    // 2. Pedestrians are pushed out of parked scooters AND knocked down by sliding knocked scooters
    const { game, knocks } = makeMockGame({
      motoSpots: [[10, 10, 0, '#b8282a', 0.07, 0]],
      streetScooters: [],
    });
    const ped1 = {
      pos: new THREE.Vector3(10.1, 0, 10),
      y: 0,
      state: 'walk',
      rag: null,
      ch: { root: { position: new THREE.Vector3() }, weight: 55, height: 1.62 },
    };
    const ped2 = {
      pos: new THREE.Vector3(13.0, 0, 10),
      y: 0,
      state: 'walk',
      rag: null,
      ch: { root: { position: new THREE.Vector3() }, weight: 62, height: 1.68 },
    };
    const knockedPeds = [];
    game.peds = {
      active: () => [ped1, ped2],
      knock: vi.fn((p, dx, dz, sp, opt) => {
        p.state = 'fly';
        knockedPeds.push({ p, dx, dz, sp, opt });
        return true;
      }),
    };
    game.audio.hitPed = vi.fn();
    const ps = new ParkedScooters(game);
    ps.update(0.016);
    // ped1 was walking inside parked scooter -> pushed outside scooter capsule!
    expect(ped1.pos.x).toBeGreaterThanOrEqual(10.68);

    // Now knock the parked scooter into ped2 at 6 m/s -> ped2 gets knocked down with Newtonian impulse!
    ps.knockSlot(ps.scooterSlots[0], 6, 0, 6);
    knocks[0].onMove({ x: 12.4, y: 0.1, z: 10 }, new THREE.Quaternion(), { x: 6, y: 0, z: 0 });
    ps.update(0.016);
    expect(knockedPeds.length).toBe(1);
    expect(knockedPeds[0].p).toBe(ped2);
    expect(knockedPeds[0].opt.dv).toBeGreaterThan(2.5);
    expect(game.audio.hitPed).toHaveBeenCalled();
  });
});

describe('domino chain physics (contact geometry, rigid-body impulse, no free energy)', () => {
  const tipQ = (roll) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, roll, 'YXZ'));

  it('a light hit gives the physical roll rate, no 3.4 rad/s floor', () => {
    const sol = solveVehicleImpact({
      kind1: 'scooter',
      rider1: false,
      kind2: 'scooter',
      rider2: false,
      parked2: true,
      vRel: 2,
    });
    expect(sol.moves).toBe(true);
    expect(sol.rollSpeed).toBeGreaterThan(0);
    expect(sol.rollSpeed).toBeLessThan(3.4);
    expect(sol.rollSpeed).toBeCloseTo((sol.netImpulse * 0.52) / 38.4, 9);
  });

  it('a neighbour 0.8 m away is not knocked until the falling scooter really reaches it', () => {
    const { game, knocks } = makeMockGame({
      motoSpots: [
        [10, 10, 0, '#b8282a', 0, 0],
        [10.8, 10, 0, '#2c5aa0', 0, 0],
      ],
      streetScooters: [],
    });
    const ps = new ParkedScooters(game);
    const [s0, s1] = ps.slots;
    expect(ps.knockSlot(s0, 0.6, 0, 0.6)).toBe(true);
    const k = knocks[0];
    // tipping toward +x at the rate gravity gives it by ~0.7 rad: ½Iω² = m g hCm (cos 0.26 - cos 0.7) -> ω ≈ 2.4
    k.body.aw = { x: 0, y: 0, z: -2.4 };
    // just knocked: leaning ~17°, its box still 0.67 m from the neighbour's centre
    k.body.q = tipQ(-0.3);
    ps.update(0.016);
    expect(s1.state).toBe('static');
    // fallen further (0.7 rad): its box reaches the neighbour
    k.body.q = tipQ(-0.7);
    ps.update(0.016);
    expect(s1.state).toBe('flying');
  });

  it('the knock is a rigid-body impulse: e of the closing speed comes back, no energy is created', () => {
    const { game, knocks } = makeMockGame({
      motoSpots: [
        [10, 10, 0, '#b8282a', 0, 0],
        [10.8, 10, 0, '#2c5aa0', 0, 0],
      ],
      streetScooters: [],
    });
    const ps = new ParkedScooters(game);
    const [s0, s1] = ps.slots;
    ps.knockSlot(s0, 0.85, 0, 0.85);
    const b = knocks[0].body;
    const q = tipQ(-0.7);
    b.q = q;
    b.lv = { x: 0.85, y: 0, z: 0 };
    b.aw = { x: 0, y: 0, z: -4 }; // its top swings into the neighbour much faster than its base slides
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const ry = up.y * 0.44; // box centre (centre of mass) to its top, vertical part
    const vc = () => b.lv.x - b.aw.z * ry; // contact point velocity along n = +x
    const ke = () => 0.5 * 110 * b.lv.x ** 2 + 0.5 * 38.4 * b.aw.z ** 2;
    const vRel = vc(),
      ke0 = ke();
    ps.update(0.016);
    expect(s1.state).toBe('flying');
    const dv2 = knocks[1].vel.x;
    const hold = 0.5 * 110 * 9.81 * 0.12; // the neighbour's stand (muStatic m g dt)
    // Newton's restitution law at the contact: separation = e * approach (less what the stand held)
    expect(vc() - dv2).toBeCloseTo(-0.12 * vRel + hold / 110, 6);
    // energy: what both have after never exceeds what the falling one had
    expect(ke() + 0.5 * 110 * dv2 ** 2).toBeLessThan(ke0);
  });

  it('a thrown car reaches a scooter beside it (capsules, not a 1.05 m centre distance)', () => {
    const { game, knocks } = makeMockGame({
      motoSpots: [[32.5, 30, 0, '#b8282a', 0, 0]],
      streetScooters: [],
      streetCars: [[30, 30, 0, '#3f6fb0']],
    });
    const ps = new ParkedScooters(game);
    const car = ps.carSlots[0];
    const sc = ps.slots.find((s) => s.kind === 'scooter');
    expect(ps.knockSlot(car, 5, 0, 5)).toBe(true);
    // the car slid 1.4 m: centres 1.1 m apart (a 1.05 m centre-distance rule missed it), its side touching
    knocks[0].onMove({ x: 31.4, y: 0, z: 30 }, new THREE.Quaternion());
    ps.update(0.016);
    expect(sc.state).toBe('flying');
  });
});

describe('AI traffic hitting a parked vehicle', () => {
  it('loses its momentum share and brakes (stunned) instead of shoving the debris on with its stand-in', () => {
    const { game, knocks } = makeMockGame({
      motoSpots: [],
      streetScooters: [],
      streetCars: [[30, 30, 0, '#3f6fb0']],
    });
    const ps = new ParkedScooters(game);
    // an AI car driving +z at 10 m/s, its nose just into the parked car's tail
    const ai = {
      kind: 'car',
      speed: 10,
      pos: new THREE.Vector3(30, 0, 30 - 2.15 - 1.9),
      heading: 0,
      hl: 2.15,
      hw: 0.9,
      ai: { stunned: 0 },
      mesh: { position: { y: 0 } },
      forward: () => [0, 1],
    };
    ps._checkVehicle(ai, false, 0.016);
    const sol = solveVehicleImpact({
      kind1: 'car',
      rider1: true,
      kind2: 'car',
      rider2: false,
      parked2: true,
      vRel: 10,
    });
    expect(knocks.length).toBe(1);
    expect(ai.speed).toBeCloseTo(10 - sol.dv1, 5);
    expect(ai.ai.stunned).toBe(2);
  });
});

describe('domino contacts every physics step (#302)', () => {
  it('registers a step hook that moves each flying scooter to its body and checks its neighbours', () => {
    const { game } = makeMockGame();
    game.physics.after = [];
    const ps = new ParkedScooters(game);
    expect(game.physics.after).toHaveLength(1);
    const body = {
      translation: () => ({ x: 3, y: 0.4, z: 4 }),
      rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
      linvel: () => ({ x: 0, y: 0, z: 0 }),
      angvel: () => ({ x: 0, y: 0, z: 0 }),
    };
    const rec = { slot: { kind: 'scooter', hw: 0.34 }, body, x: 0, y: 0, z: 0, vx: 0, vz: 0 };
    ps.activeKnocks.add(rec);
    const seen = [];
    ps._dominoFrom = (r) => seen.push([r.x, r.y, r.z]);
    game.physics.after[0](1 / 60, 0, 2); // the first of two steps in a 30 fps frame
    expect(seen).toEqual([[3, 0.4, 4]]);
    // and the frame update no longer runs it a second time
    ps._dominoFrom = () => {
      throw new Error('per-frame domino check');
    };
    expect(() => ps.update(1 / 30)).not.toThrow();
  });
});
