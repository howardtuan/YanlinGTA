// Physics: the Rapier engine (Rust compiled to WebAssembly, vendor/rapier, see tools/vendor_rapier.mjs).
//
// One Physics instance (game.physics) owns the Rapier world. It steps at a fixed 60 Hz whatever the frame
// rate (an accumulator, at most MAX_SUB steps per frame), so handling feels the same on slow and fast
// machines and the story bot's fixed time step replays exactly. `alpha` (0..1) is how far the frame is
// between the last two physics steps, for smoothing what is drawn.
//
// FOR EVERYONE ADDING THINGS: you do not need to know Rapier.
// - Something solid that never moves (wall, pillar, kiosk): keep adding it to the game's own collision
//   (collision.addPolygon / addSegment / addCircle) while the map is built, as before. js/physworld.js turns
//   everything in it into physics colliders once, right after buildInteriors (main.js), so it blocks both.
//   Added later than that (at run time)? Also call physics.addStaticBox / addStaticCylinder.
// - Something that can be knocked over (cone, bin): physics.addProp (P2).
// Every collider gets a collision group (G below) that decides what it collides with.
//
// Debug: ?physdebug in the URL draws every collider as lines; ?nophysics turns the engine off.
import * as THREE from 'three';

// collision groups: membership bits; FILTER[group] = what that group collides with
export const G = { WORLD: 1, VEHICLE: 2, PROP: 4, CHAR: 8, RAGDOLL: 16, SENSOR: 32 };
const FILTER = {
  [G.WORLD]: G.VEHICLE | G.PROP | G.CHAR | G.RAGDOLL,
  [G.VEHICLE]: G.WORLD | G.VEHICLE | G.PROP | G.CHAR | G.RAGDOLL,
  [G.PROP]: G.WORLD | G.VEHICLE | G.PROP | G.CHAR | G.RAGDOLL,
  [G.CHAR]: G.WORLD | G.VEHICLE | G.PROP,
  [G.RAGDOLL]: G.WORLD | G.VEHICLE | G.PROP,
  [G.SENSOR]: G.VEHICLE | G.CHAR,
};
// Rapier interaction groups: (memberships << 16) | filter
export const groups = (g) => ((g & 0xffff) << 16) | (FILTER[g] & 0xffff);

export const STEP = 1 / 60;
const MAX_SUB = 4; // a frame slower than 15 fps drops the rest instead of spiralling

export class Physics {
  constructor() {
    this.R = null; this.world = null; this.events = null;
    this.acc = 0; this.alpha = 0; this.steps = 0;
    this.after = []; // callbacks run after every physics step: fn(STEP)
    this.debug = null;
  }
  get ready() { return !!this.world; }
  // loads the engine; false (and the game runs without it) when WebAssembly is unavailable or ?nophysics
  async init() {
    try {
      if (typeof WebAssembly !== 'object' || /[?&]nophysics\b/.test(location.search)) return false;
      const R = await import('../vendor/rapier/rapier.mjs');
      await R.init();
      this.R = R;
      this.world = new R.World({ x: 0, y: -9.81, z: 0 });
      this.world.timestep = STEP;
      this.events = new R.EventQueue(true);
      return true;
    } catch (e) {
      console.warn('物理引擎（Rapier）載入失敗，遊戲改用原本的碰撞', e);
      this.world = null;
      return false;
    }
  }
  // fixed solids added after the world was built (world y; yaw in radians about +y). Return the collider
  // (null without physics), so it can be removed again with physics.world.removeCollider(c, false)
  addStaticBox(x, y, z, hx, hy, hz, yaw = 0) {
    if (!this.world) return null;
    const s = Math.sin(yaw / 2), c = Math.cos(yaw / 2);
    return this.world.createCollider(this.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z)
      .setRotation({ x: 0, y: s, z: 0, w: c }).setCollisionGroups(groups(G.WORLD)).setFriction(0.9));
  }
  // y = the bottom, h = height
  addStaticCylinder(x, y, z, r, h) {
    if (!this.world) return null;
    return this.world.createCollider(this.R.ColliderDesc.cylinder(h / 2, r).setTranslation(x, y + h / 2, z)
      .setCollisionGroups(groups(G.WORLD)).setFriction(0.9));
  }
  // advance by the frame's dt in fixed steps
  update(dt) {
    if (!this.world) return;
    this.acc += Math.min(dt, MAX_SUB * STEP);
    let n = 0;
    while (this.acc >= STEP && n < MAX_SUB) {
      this.world.step(this.events);
      this.acc -= STEP; n++; this.steps++;
      for (const f of this.after) f(STEP);
    }
    if (n === MAX_SUB) this.acc = Math.min(this.acc, STEP);
    this.alpha = this.acc / STEP;
    if (this.debug) this._drawDebug();
  }

  // ---------- debug view (?physdebug) ----------
  enableDebug(scene) {
    if (!this.world || this.debug) return;
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: true, transparent: true, opacity: 0.85 });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false; lines.renderOrder = 999;
    scene.add(lines);
    this.debug = { lines, t: 0 };
  }
  _drawDebug() {
    const D = this.debug;
    if ((D.t = (D.t + 1) % 6)) return; // every 6th call: the full buffer is rebuilt each time
    const buf = this.world.debugRender();
    const g = D.lines.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(buf.vertices, 3));
    g.setAttribute('color', new THREE.BufferAttribute(buf.colors, 4));
    g.computeBoundingSphere();
  }
}
