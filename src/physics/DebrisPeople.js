// DebrisPeople: a knocked vehicle (thrown traffic or parked car, src/core/VehicleSpawner.js throwVehicle; a
// knocked roadside scooter or car, src/core/ParkedScooters.js) sliding into people. Pedestrians and the player
// on foot have no dynamic Rapier body (peds none, the player a kinematic capsule that would stop the debris like
// a wall), so the hit is solved here with the vehicle's real footprint (its collision box in plan, obbGap) and
// Newtonian impulse (solvePersonImpact): the person is knocked down or not, the vehicle loses J / m along n.
import { debrisVsPerson, vehicleSpec } from './ImpactPhysics.js';

const _up = (q, cy) => {
  // q * (0, cy, 0): the box centre's offset from the body origin
  const { x, y, z, w } = q;
  return [2 * (x * y - w * z) * cy, 2 * (y * z + w * x) * cy];
};

/**
 * game: the Game (peds, player, audio, hud); kind: 'scooter' | 'car' | 'taxi'; p: body origin {x, y, z};
 * q: body rotation {x, y, z, w}; lv: linear velocity {x, y, z}; body: the Rapier body (its velocity loses the
 * reaction), or null; hw: its real half width (handlebars) when wider than the collision box. Returns the total
 * Δv taken off the vehicle (x, z), also applied to body when given.
 */
export function knockPeopleWith(game, kind, p, q, lv, body = null, hw = 0) {
  const spd = Math.hypot(lv.x, lv.z);
  if (spd < 1.0) return null;
  const spec = vehicleSpec(kind);
  const [ox, oz] = _up(q, spec.shape.cy ?? spec.shape.hy);
  const cx = p.x + ox,
    cz = p.z + oz;
  // heading of the box: its local +z in the world, flattened
  const fx = 2 * (q.x * q.z + q.w * q.y),
    fz = 1 - 2 * (q.x * q.x + q.y * q.y);
  const yaw = Math.atan2(fx, fz);
  const reach = Math.hypot(Math.max(spec.shape.hx, hw), spec.shape.hz) + 0.6;
  let dvx = 0,
    dvz = 0;
  const take = (hit) => {
    dvx -= hit.nx * hit.sol.dvVehicle;
    dvz -= hit.nz * hit.sol.dvVehicle;
  };

  const peds = game.peds?.active?.() || [];
  for (let i = 0; i < peds.length; i++) {
    const pd = peds[i];
    if (pd.state === 'fly' || pd.state === 'down' || pd.rag) continue;
    if (Math.abs(pd.y - p.y) > 2.0) continue;
    if (Math.abs(pd.pos.x - cx) > reach || Math.abs(pd.pos.z - cz) > reach) continue;
    const walk = pd.state === 'walk' ? pd.speed || 0 : 0;
    const hit = debrisVsPerson({
      kind,
      lv: { x: lv.x + dvx, z: lv.z + dvz },
      cx,
      cz,
      yaw,
      px: pd.pos.x,
      pz: pd.pos.z,
      pvx: Math.sin(pd.heading || 0) * walk,
      pvz: Math.cos(pd.heading || 0) * walk,
      personMass: pd.ch?.weight,
      personHeight: pd.ch?.height,
      hw,
    });
    if (!hit || !hit.sol.knockDown) continue;
    if (
      game.peds.knock(pd, hit.nx, hit.nz, hit.vRel, {
        dv: hit.sol.dvPerson,
        vy: hit.sol.vyPerson,
      })
    ) {
      game.audio?.hitPed?.();
      take(hit);
    }
  }

  // the player on foot: the same footprint, not the kinematic capsule's infinite mass
  const pl = game.player;
  if (
    pl &&
    !pl.vehicle &&
    !pl.rag &&
    !pl.tumble &&
    pl.pos &&
    Math.abs((pl.pos.y ?? 0) - p.y) < 2.0
  ) {
    const hit = debrisVsPerson({
      kind,
      lv: { x: lv.x + dvx, z: lv.z + dvz },
      cx,
      cz,
      yaw,
      px: pl.pos.x,
      pz: pl.pos.z,
      pvx: pl.vel?.x || 0,
      pvz: pl.vel?.y || 0,
      personMass: pl.ch?.weight,
      personHeight: pl.ch?.height,
      hw,
    });
    if (hit?.sol.knockDown) {
      game.audio?.hitPed?.();
      pl.throwOff(hit.nx * hit.sol.dvPerson, hit.nz * hit.sol.dvPerson, hit.sol.vyPerson, 1.8);
      game.hud?.toast?.(`被撞飛的車撞倒了！😵（${Math.round(hit.vRel * 3.6)} km/h）`, 'bad', 2200);
      take(hit);
    }
  }

  if (!dvx && !dvz) return null;
  if (body) {
    const v = body.linvel();
    body.setLinvel({ x: v.x + dvx, y: v.y, z: v.z + dvz }, true);
  }
  return { x: dvx, z: dvz };
}
