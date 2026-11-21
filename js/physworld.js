// Static physics world (P1): builds Rapier colliders from the same data the game's own collision and ground
// heights use, so physics objects stand, drive and stop where the rest of the game expects them.
//   terrain      -> one triangle mesh, split exactly like terrain.js H() (same heights everywhere); cells an
//                   open road cut (LV_CUT) passes through are refined to 1 m and the cut is left open
//   decks / cut floors / boxes (terrain.js deck stations, 2.5 m each) -> thin sloped boxes
//                   (low bridges also get a flat disc at each station end: surfaceAt's round caps)
//   pads -> flat triangle meshes, stairs / ramps -> sloped boxes (smooth slope, like levelY)
//   building outlines, free-standing walls, interior walls -> 0.2 m walls (height band where one is set)
//   tree trunks / poles -> cylinders
//   interior floors (interiors.surfaces) -> triangle meshes
//   a safety floor under the whole map
// Everything is fixed (never moves), in collision group G.WORLD. Walls, trunks and deck slabs are merged per
// 100 m tile into compound colliders (see TILE).
import * as THREE from 'three';
import { terrainGrid, H, surfaceAt, deckList, levelList, LV_CUT } from './terrain.js';
import { G, groups } from './physics.js';

export const WALL_T = 0.1; // half thickness of a wall (m; js/walker.js stops that much earlier)
const DECK_T = 0.15;  // half thickness of a deck / stair slab
const FREE_WALL_H = 4; // free-standing walls without a height band: from the ground up this far
const TRUNK_H = 6;
const WALL_LO = -100, WALL_HI = 400; // world y range walls are clipped to (the map is about -15 .. +60 m)
// Walls, trunks and deck slabs are grouped per TILE x TILE m square and kind into one compound collider each
// (a few hundred instead of ~25 000): Rapier's per-step cost grows with the number of colliders in the world
// (25 000 separate ones: ~1.5-4 ms every step even with nothing moving; compounds: ~0.05 ms).
const TILE = 100;

export function buildPhysicsWorld(physics, collision, interiors) {
  const R = physics.R, world = physics.world;
  if (!world) return null;
  const t0 = performance.now();
  const stats = { terrainTris: 0, decks: 0, levels: 0, walls: 0, trunks: 0, floors: 0 };
  // collider handles by kind (debugging / tools; physics.tags.walls.has(collider.handle))
  const tags = physics.tags = { walls: new Set(), trunks: new Set(), ground: new Set() };
  const WG = groups(G.WORLD);
  const fixed = (desc) => world.createCollider(desc.setCollisionGroups(WG).setFriction(0.9));
  const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), ID = { x: 0, y: 0, z: 0, w: 1 };
  // shapes collected per tile and kind, built as compounds at the end (see TILE)
  const batch = new Map();
  const put = (kind, shape, x, y, z, rot) => {
    const tx = Math.floor(x / TILE), tz = Math.floor(z / TILE), k = `${kind}|${tx}|${tz}`;
    let b = batch.get(k);
    if (!b) batch.set(k, b = { kind, cx: (tx + 0.5) * TILE, cz: (tz + 0.5) * TILE, shapes: [], pos: [], rot: [] });
    b.shapes.push(shape); b.pos.push({ x: x - b.cx, y, z: z - b.cz }); b.rot.push(rot ? { x: rot.x, y: rot.y, z: rot.z, w: rot.w } : ID);
  };
  // a box from a to b (x,z) on top of a slope ya -> yb, half width hw, top surface on the slope
  const slab = (ax, az, ya, bx, bz, yb, hw, ht) => {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    if (len < 1e-3) return;
    const pitch = Math.atan2(yb - ya, len);
    e.set(-pitch, Math.atan2(dx, dz), 0); q.setFromEuler(e);
    // the centre sits ht below the slope's mid point, measured along the slab's own up axis
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const cx = (ax + bx) / 2 - up.x * ht, cy = (ya + yb) / 2 - up.y * ht, cz = (az + bz) / 2 - up.z * ht;
    put('deck', new R.Cuboid(hw, ht, Math.hypot(len, yb - ya) / 2), cx, cy, cz, q);
  };
  const wall = (ax, az, bx, bz, y0, y1, own = false) => {
    // open-ended bands (y0 = -1e9 'everything below') clamped: Rapier keeps positions in 32-bit floats, so a
    // box centred at -5e8 would have its top tens of metres off
    y0 = Math.max(y0, WALL_LO); y1 = Math.min(y1, WALL_HI);
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    if (len < 1e-3 || !(y1 > y0)) return;
    e.set(0, Math.atan2(dx, dz), 0); q.setFromEuler(e);
    const hy = (y1 - y0) / 2, hz = len / 2 + WALL_T, x = (ax + bx) / 2, y = (y0 + y1) / 2, z = (az + bz) / 2;
    // own: a collider of its own (the map's edge: a 1.8 km wall would make one tile's compound huge)
    if (own) tags.walls.add(fixed(R.ColliderDesc.cuboid(WALL_T, hy, hz).setTranslation(x, y, z).setRotation(q)).handle);
    else put('wall', new R.Cuboid(WALL_T, hy, hz), x, y, z, q);
    stats.walls++;
  };
  const trimesh = (verts, idx) => { if (idx.length) fixed(R.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(idx))); };

  // ---------- terrain ----------
  const T = terrainGrid();
  const cuts = deckList().filter(s => s.lv === LV_CUT);
  // open-cut test, the same 'beside its stations' rule surfaceAt uses
  const inCut = (x, z) => {
    for (const s of cuts) {
      const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz || 1;
      const t = ((x - s.ax) * dx + (z - s.az) * dz) / l2;
      if (t < 0 || t > 1) continue;
      const qx = s.ax + dx * t - x, qz = s.az + dz * t - z;
      if (qx * qx + qz * qz <= s.r * s.r) return true;
    }
    return false;
  };
  if (T) {
    const { minX, minZ, step, nx, nz, h } = T;
    const verts = [], idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) verts.push(minX + i * step, h[j * nx + i], minZ + j * step);
    // cells touched by an open cut (with a margin of the cut's half width)
    const cutCell = new Set();
    for (const s of cuts) {
      const x0 = Math.floor((Math.min(s.ax, s.bx) - s.r - minX) / step), x1 = Math.floor((Math.max(s.ax, s.bx) + s.r - minX) / step);
      const z0 = Math.floor((Math.min(s.az, s.bz) - s.r - minZ) / step), z1 = Math.floor((Math.max(s.az, s.bz) + s.r - minZ) / step);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) cutCell.add(j * nx + i);
    }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const k = j * nx + i;
      if (cutCell.has(k)) continue;
      // H(): u >= v -> (h00, h10, h11), else (h00, h01, h11); wound counter-clockwise seen from above
      idx.push(k, k + nx + 1, k + 1, k, k + nx, k + nx + 1);
    }
    // refined cells around the cuts: 1 m sub-grid on H(), sub-triangles inside the cut left out
    const SUB = Math.max(1, Math.round(step));
    for (const k of cutCell) {
      const i = k % nx, j = (k / nx) | 0;
      if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) continue;
      const x0 = minX + i * step, z0 = minZ + j * step, d = step / SUB, base = verts.length / 3;
      for (let b = 0; b <= SUB; b++) for (let a = 0; a <= SUB; a++) { const x = x0 + a * d, z = z0 + b * d; verts.push(x, H(x, z), z); }
      for (let b = 0; b < SUB; b++) for (let a = 0; a < SUB; a++) {
        const p = base + b * (SUB + 1) + a, cx = x0 + (a + 0.5) * d, cz = z0 + (b + 0.5) * d;
        // the 1 m sub-cells follow the 10 m cell's diagonal so heights stay those of H()
        if (inCut(cx + d / 4, cz - d / 4) === false) idx.push(p, p + SUB + 2, p + 1);
        if (inCut(cx - d / 4, cz + d / 4) === false) idx.push(p, p + SUB + 1, p + SUB + 2);
      }
    }
    stats.terrainTris = idx.length / 3;
    // FIX_INTERNAL_EDGES: contacts across the shared edges use the neighbouring triangles, so something sliding
    // over the ground (a knocked cone, later wheels) does not catch on the seams between triangles
    tags.ground.add(fixed(R.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(idx), R.TriMeshFlags.FIX_INTERNAL_EDGES)).handle);
    let lo = Infinity; for (let n = 0; n < h.length; n++) if (h[n] < lo) lo = h[n];
    // safety floor: anything that slips through ends up here instead of falling forever. A thin box over the
    // whole grid (plus a margin), top at lo - 30 (the JS ColliderDesc has no halfspace() in Rapier 0.21)
    const hx = (nx - 1) * step / 2 + 200, hz = (nz - 1) * step / 2 + 200;
    fixed(R.ColliderDesc.cuboid(hx, 1, hz).setTranslation(minX + (nx - 1) * step / 2, lo - 31, minZ + (nz - 1) * step / 2));
  }

  // ---------- decks, cut floors, boxes, low bridges ----------
  for (const s of deckList()) { slab(s.ax, s.az, s.ya, s.bx, s.bz, s.yb, s.r, DECK_T); stats.decks++; }
  // low bridges (lv 0): surfaceAt treats each station as a capsule (round ends), so a flat disc at every
  // station end, once per joint. Grade levels (lv > 0) only count beside their stations: no caps there
  const caps = new Set();
  for (const s of deckList()) {
    if (s.lv) continue;
    for (const [x, z, y] of [[s.ax, s.az, s.ya], [s.bx, s.bz, s.yb]]) {
      const k = `${x.toFixed(2)},${z.toFixed(2)},${y.toFixed(2)},${s.r}`;
      if (caps.has(k)) continue; caps.add(k);
      put('deck', new R.Cylinder(DECK_T, s.r), x, y - DECK_T, z);
    }
  }
  stats.caps = caps.size;

  // ---------- pads, stairs, ramps ----------
  for (const L of levelList()) {
    if (L.kind === 'pad') {
      const tris = THREE.ShapeUtils.triangulateShape(L.pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
      const verts = [], idx = [];
      for (const [x, z] of L.pts) verts.push(x, L.y, z);
      for (const t of tris) idx.push(t[0], t[2], t[1], t[0], t[1], t[2]); // both windings: walkable from above whatever the outline's direction
      trimesh(verts, idx);
    } else {
      // levelY: ramps are straight; stairs run half a riser above the nosings, so the slope reaches the
      // top half a riser early and stays flat from there (two slabs)
      const d1 = L.n > 0 ? L.len * (1 - 0.5 / L.n) : L.len;
      const y0 = L.n > 0 ? L.y0 + (L.y1 - L.y0) * 0.5 / L.n : L.y0;
      const px = (d) => [L.ax + L.ux * d, L.az + L.uz * d];
      const [mx, mz] = px(d1), [bx, bz] = px(L.len);
      slab(L.ax, L.az, y0, mx, mz, L.y1, L.hw, DECK_T);
      if (L.len - d1 > 1e-3) slab(mx, mz, L.y1, bx, bz, L.y1, L.hw, DECK_T);
    }
    stats.levels++;
  }

  // ---------- walls ----------
  const C = collision;
  const polySeg = new Map(); // segment index -> polygon roof height
  for (const p of C.polys) for (let i = 0; i < p.pts.length; i++) polySeg.set(p.s0 + i, p.top);
  C.segs.forEach((s, si) => {
    const [ax, az, bx, bz, y0, y1] = s;
    // from 1 m below the lowest level at either end or the middle (an open cut / box floor below the ground)
    const lo = (x, z) => Math.min(H(x, z), surfaceAt(x, z, -1e9));
    const g = Math.min(lo(ax, az), lo(bx, bz), lo((ax + bx) / 2, (az + bz) / 2)) - 1;
    if (y0 !== undefined) return wall(ax, az, bx, bz, y0, y1);
    const top = polySeg.get(si);
    wall(ax, az, bx, bz, g, top !== undefined && Number.isFinite(top) ? Math.max(top, g + 3) : Math.max(H(ax, az), H(bx, bz)) + FREE_WALL_H);
  });
  for (const [x, z, r] of C.circles) {
    if (!(r > 0) || x > 1e8) continue; // removed trees
    const g = H(x, z) - 1;
    put('trunk', new R.Cylinder(TRUNK_H / 2 + 0.5, r), x, g + TRUNK_H / 2 + 0.5, z);
    stats.trunks++;
  }
  // the map's edge (CollisionWorld.resolve keeps bodies inside these bounds)
  const b = C.b;
  if (b) {
    const lo = -60, hi = 200;
    wall(b.minX, b.minZ, b.maxX, b.minZ, lo, hi, true); wall(b.maxX, b.minZ, b.maxX, b.maxZ, lo, hi, true);
    wall(b.maxX, b.maxZ, b.minX, b.maxZ, lo, hi, true); wall(b.minX, b.maxZ, b.minX, b.minZ, lo, hi, true);
  }
  // interiors: wall bands and floor heights are above the local ground (the terrain is flattened under
  // these buildings by tools/build_terrain.py), outdoor wall bands above are world heights
  if (interiors) {
    for (const w of interiors.walls) { const g = H((w[0] + w[2]) / 2, (w[1] + w[3]) / 2); wall(w[0], w[1], w[2], w[3], g + w[4], g + w[5]); }
    for (const s of interiors.surfaces) {
      const tris = THREE.ShapeUtils.triangulateShape(s.pts.map(([x, z]) => new THREE.Vector2(x, z)), []);
      const verts = [], idx = [];
      for (const [x, z] of s.pts) verts.push(x, H(x, z) + s.h(x, z), z);
      for (const t of tris) idx.push(t[0], t[2], t[1], t[0], t[1], t[2]);
      trimesh(verts, idx); stats.floors++;
    }
  }
  // the compounds (tags: a wall / trunk compound's handle is in tags.walls / tags.trunks)
  for (const b of batch.values()) {
    const c = fixed(R.ColliderDesc.compound(b.shapes, b.pos, b.rot).setTranslation(b.cx, 0, b.cz));
    if (b.kind === 'wall') tags.walls.add(c.handle); else if (b.kind === 'trunk') tags.trunks.add(c.handle);
  }
  stats.compounds = batch.size;
  stats.ms = Math.round(performance.now() - t0);
  stats.colliders = world.colliders.len();
  return stats;
}
