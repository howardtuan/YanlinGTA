import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { ParkedScooters } from '../../src/core/ParkedScooters.js';
import { VehicleSpawner } from '../../src/core/VehicleSpawner.js';
import { Vehicle } from '../../src/entities/Vehicles.js';
import {
  solveVehicleImpact,
  solvePersonImpact,
  solvePersonPersonImpact,
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
        const rec = { mesh, shape, mass, vel, spin, onMove, onRest, key, opt };
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
    expect(ps.scooterTrimIm).toBeInstanceOf(THREE.InstancedMesh);
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
    const scooterTris = triCount(ps.scooterAssets.paintGeo) + triCount(ps.scooterAssets.trimGeo);
    const carTris = triCount(ps.carAssets.paintGeo) + triCount(ps.carAssets.trimGeo);
    expect(scooterTris).toBeLessThan(1200);
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
    expect(playerScooter.speed).toBe(0);
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

    // 5. Verify Newton's 3rd Law & exact impulse formula directly in ImpactPhysics
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
    expect(Math.hypot(rvx, rvz)).toBeGreaterThan(4.0);
    expect(game.hud.toast).toHaveBeenCalledWith(expect.stringContaining('被撞飛了'), 'bad', 2600);
  });

  it('applies Newtonian impulse-momentum to vehicle-vs-person and person-vs-person collisions', () => {
    // Car (1320 kg) vs 70 kg person at 10 m/s: car barely slows (kf > 0.9), person knocked down cleanly
    const carHit = solvePersonImpact({ vehicleKind: 'car', riderOnVehicle: true, vRel: 10 });
    expect(carHit.knockDown).toBe(true);
    expect(carHit.kf).toBeGreaterThan(0.93);
    expect(carHit.dvPerson).toBeGreaterThan(8.5);
    expect(carHit.vyPerson).toBeLessThanOrEqual(3.4);

    // Scooter (180 kg) vs 70 kg person at 6 m/s: scooter loses ~31% speed, person knocked down, rider stays on
    const scMed = solvePersonImpact({ vehicleKind: 'scooter', riderOnVehicle: true, vRel: 6 });
    expect(scMed.knockDown).toBe(true);
    expect(scMed.kf).toBeCloseTo(0.69, 1);
    expect(scMed.ejectRider1).toBe(false);

    // High-speed scooter (15 m/s = 54 km/h) hitting a 70 kg person: shock >= 3.6 G -> scooter rider crashes too
    const scFast = solvePersonImpact({ vehicleKind: 'scooter', riderOnVehicle: true, vRel: 15 });
    expect(scFast.knockDown).toBe(true);
    expect(scFast.ejectRider1).toBe(true);

    // Person vs person (70 kg vs 70 kg): walking bump (3 m/s) doesn't knock down; full sprint tackle (7.5 m/s) does
    const walkBump = solvePersonPersonImpact(3.0);
    expect(walkBump.knockDown).toBe(false);
    expect(walkBump.dv1).toBeCloseTo((1.08 * 35 * 3) / 70, 3);

    const sprintTackle = solvePersonPersonImpact(7.5);
    expect(sprintTackle.knockDown).toBe(true);
    expect(sprintTackle.dv2).toBeGreaterThan(2.8);
    expect(sprintTackle.vy2).toBeLessThanOrEqual(2.0);
  });
});
