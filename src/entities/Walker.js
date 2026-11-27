// Walking against walls with Rapier's character controller (P5).
//
// On foot, the player's sideways movement is checked against the physics walls (buildings, fences,
// interior walls, tree trunks, the map's edge: physics.tags.walls / trunks) instead of the game's own
// collision (CollisionWorld.resolve): a capsule is swept along the move and
// slides along what it hits, so a fast frame can never step through a thin wall. Physics walls are boxes
// WALL_T thick on each side of the game's wall line (src/physics/PhysWorld.js) and the controller keeps SKIN off them,
// so the capsule is that much thinner: you stop where the game's collision stopped you, and doorways stay
// as wide as before (tree trunks are exact cylinders: you get about 0.1 m closer to those).
// Heights stay the game's: terrain, decks, stairs and interior floors (surfaceAt, interiors.groundAt) and
// jumping (src/entities/Player.js). So the capsule covers 0.35 to 1.6 m above the feet, the same band the game's
// interior walls use, and floors are never in its way.
// The capsule itself is a query shape only (no body, collides with nothing): cones and barriers are still
// pushed by your physics stand-in (src/core/Game.js _physMovers), vehicles still push you out of their bodies.
// Without physics (or ?oldwalk) src/entities/Player.js uses CollisionWorld.resolve as before.
import { G } from '../physics/Physics.js';
import { WALL_T } from '../physics/PhysWorld.js';

export const RADIUS = 0.38; // as src/entities/Player.js without a walker (against a wall line)
const SKIN = 0.02; // the controller's gap to what it touches (m)
const CR = RADIUS - WALL_T - SKIN; // capsule radius
const LOW = 0.35,
  HIGH = 1.6; // the band above the feet that walls block
const HALF = (HIGH - LOW) / 2 - CR; // capsule half height without its caps
const CY = LOW + CR + HALF; // capsule centre above the feet

export class Walker {
  static attach(P) {
    if (!P?.ready) return null;
    try {
      return new Walker(P);
    } catch (e) {
      console.warn('[walker] 角色控制器建立失敗，走路改用原本的碰撞', e);
      return null;
    }
  }
  constructor(P) {
    const R = P.R,
      W = P.world;
    this.P = P;
    this.ctrl = W.createCharacterController(SKIN);
    this.ctrl.setUp({ x: 0, y: 1, z: 0 });
    this.ctrl.setSlideEnabled(true);
    this.ctrl.disableAutostep?.();
    this.ctrl.disableSnapToGround?.();
    // the only dynamic bodies it can touch are the shop-front crates (below): it shoves them with your weight
    this.ctrl.setApplyImpulsesToDynamicBodies(true);
    this.ctrl.setCharacterMass?.(70);
    this.col = W.createCollider(
      R.ColliderDesc.capsule(HALF, CR).setCollisionGroups(0).setTranslation(0, -1000, 0)
    );
    const tags = P.tags || {};
    // walls, trunks, and the loose crates in front of the shop rows (src/world/WorldProps.js spawnWorldCrates): you
    // push one ahead of you and stop at one that is jammed against a wall, instead of walking into it (#302).
    // Cones and barriers stay out: your physics stand-in kicks those (src/core/Game.js _physMovers)
    this.isWall = (c) =>
      !!(tags.walls?.has(c.handle) || tags.trunks?.has(c.handle) || P.ownerOf(c)?.key?.crate);
    this.groups = ((G.CHAR & 0xffff) << 16) | ((G.WORLD | G.PROP) & 0xffff);
    this.out = { x: 0, y: 0, z: 0 };
  }
  // move pos (the feet; pos.y is their height) by (mx, mz), sliding along walls: pos.x / pos.z are updated
  move(pos, mx, mz) {
    this.col.setTranslation({ x: pos.x, y: pos.y + CY, z: pos.z });
    this.ctrl.computeColliderMovement(
      this.col,
      { x: mx, y: 0, z: mz },
      undefined,
      this.groups,
      this.isWall
    );
    const m = this.ctrl.computedMovement(this.out);
    if (Number.isFinite(m.x) && Number.isFinite(m.z)) {
      pos.x += m.x;
      pos.z += m.z;
    }
  }
  // whether the capsule at pos would stand inside a wall (tests, the story bot's teleports)
  blocked(pos) {
    this.col.setTranslation({ x: pos.x, y: pos.y + CY, z: pos.z });
    let hit = false;
    this.P.world.intersectionsWithShape(
      this.col.translation(),
      this.col.rotation(),
      this.col.shape,
      (c) => {
        if (this.isWall(c)) {
          hit = true;
          return false;
        }
        return true;
      },
      undefined,
      this.groups
    );
    return hit;
  }
}
