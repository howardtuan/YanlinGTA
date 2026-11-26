// Map waypoint + turn-by-turn route, GTA style: click the big map to drop a pin, the route follows
// the road graph (walking: every street and path; riding / driving: drivable roads, one-way respected),
// shows as a purple line on the minimap and the big map, and as glowing chevrons on the ground ahead
// (settings: 地面導航線). The route is recomputed when you leave it or get on / off a vehicle.
import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';

const COL = '#b06bff';

// binary-heap A* over world.graph nodes ({x, z, adj: [{to, drive}]})
export function astar(s, t, drive) {
  const g = new Map([[s, 0]]),
    prev = new Map(),
    heap = [[Math.hypot(s.x - t.x, s.z - t.z), s]];
  const push = (it) => {
    heap.push(it);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1,
          r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const done = new Set();
  while (heap.length) {
    const [, c] = pop();
    if (done.has(c)) continue;
    done.add(c);
    if (c === t) break;
    for (const e of c.adj) {
      if (drive && !e.drive) continue;
      const ng =
        g.get(c) + Math.hypot(e.to.x - c.x, e.to.z - c.z) * (drive && !e.road.name ? 1.4 : 1);
      if (ng < (g.get(e.to) ?? Infinity)) {
        g.set(e.to, ng);
        prev.set(e.to, c);
        push([ng + Math.hypot(e.to.x - t.x, e.to.z - t.z), e.to]);
      }
    }
  }
  if (!prev.has(t) && s !== t) return null;
  const out = [];
  for (let c = t; c; c = prev.get(c)) {
    out.unshift([c.x, c.z]);
    if (c === s) break;
  }
  return out;
}
const segDist = (px, pz, a, b) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L));
  return Math.hypot(a[0] + dx * t - px, a[1] + dz * t - pz);
};

export class Nav {
  constructor(game) {
    this.g = game;
    this.target = null;
    this.path = null;
    this.mode = null;
    this.t = 0;
    this.rebuildT = 0;
    // ground chevrons
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.beginPath();
    c.moveTo(8, 50);
    c.lineTo(32, 18);
    c.lineTo(56, 50);
    c.lineTo(44, 50);
    c.lineTo(32, 34);
    c.lineTo(20, 50);
    c.closePath();
    c.fill();
    this.tex = new THREE.CanvasTexture(cv);
    this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshBasicMaterial({
      map: this.tex,
      color: COL,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    game.scene.add(this.mesh);
  }
  get groundOn() {
    return this.g.settings.navGround !== 'off';
  }
  set(x, z) {
    this.follow = null;
    this.target = { x, z };
    this.path = null;
    this.mode = null;
    this._route();
    this.g.hud.navRoute = this.path;
    this.g.hud.navTarget = this.target;
    this.g.audio.blip?.();
    this.g._saveT = 9.5;
  }
  clear() {
    this.follow = null;
    this.target = null;
    this.path = null;
    this.g.hud.navRoute = null;
    this.g.hud.navTarget = null;
    this.mesh.visible = false;
    this.g._saveT = 9.5;
  }
  // a target that moves (勞大 strolling the campus): obj.navPos() gives { x, z }, or null once it is gone (then the pin stays
  // where it last was). The route follows it, re-routed quietly whenever it has moved a few metres.
  track(obj) {
    const q = obj.navPos();
    if (!q) return false;
    this.set(q.x, q.z);
    this.follow = obj;
    return true;
  }
  _follow() {
    const q = this.follow.navPos();
    if (!q) {
      this.follow = null;
      return;
    }
    if (Math.hypot(q.x - this.target.x, q.z - this.target.z) > 3) {
      this.target = { x: q.x, z: q.z };
      this._route();
    }
  }
  _route() {
    const g = this.g,
      w = g.world,
      p = g.player.worldPos(),
      drive = !!g.player.vehicle;
    const nodes = drive ? w.driveNodes : w.walkNodes;
    const near = (x, z) => {
      let b = null,
        bd = Infinity;
      for (const n of nodes) {
        const d = (n.x - x) ** 2 + (n.z - z) ** 2;
        if (d < bd) {
          bd = d;
          b = n;
        }
      }
      return b;
    };
    const s = near(p.x, p.z),
      t = near(this.target.x, this.target.z);
    const r = s && t ? astar(s, t, drive) : null;
    this.mode = drive;
    this.path = [[p.x, p.z], ...(r || []), [this.target.x, this.target.z]];
  }
  update(dt) {
    const g = this.g,
      hud = g.hud;
    if (!this.target || g.state !== 'play') {
      if (this.mesh.visible) this.mesh.visible = false;
      return;
    }
    if (this.follow) this._follow();
    const p = g.player.worldPos(),
      drive = !!g.player.vehicle;
    if (Math.hypot(p.x - this.target.x, p.z - this.target.z) < (drive ? 12 : 6)) {
      hud.toast(this.follow?.navArrive || '📍 已抵達標點', 'good', 2200);
      g.audio.checkpoint?.();
      this.clear();
      return;
    }
    // trim what is behind you; re-route when you are off the line or changed between foot and vehicle
    const P = this.path;
    let best = Infinity,
      bi = 0;
    for (let i = 0; i < Math.min(P.length - 1, 40); i++) {
      const d = segDist(p.x, p.z, P[i], P[i + 1]);
      if (d < best) {
        best = d;
        bi = i;
      }
    }
    if (best > (drive ? 22 : 16) || drive !== this.mode) this._route();
    else {
      // the corner you are heading for: skip it once you are next to it, or already past it along the next leg
      // (otherwise a small sideways step snaps the line back to a corner behind you and the arrows point backwards)
      let rest = P.slice(bi + 1);
      while (rest.length > 1) {
        const [n, m] = rest,
          dx = m[0] - n[0],
          dz = m[1] - n[1],
          L = Math.hypot(dx, dz) || 1,
          along = ((p.x - n[0]) * dx + (p.z - n[1]) * dz) / L;
        if (
          Math.hypot(p.x - n[0], p.z - n[1]) < (drive ? 7 : 3.5) ||
          (along > 0 && segDist(p.x, p.z, n, m) < (drive ? 10 : 6))
        )
          rest = rest.slice(1);
        else break;
      }
      this.path = [[p.x, p.z], ...rest];
    }
    hud.navRoute = this.path;
    hud.navTarget = this.target;
    // ground chevrons over the next ~70 m
    this.tex.offset.y -= dt * 1.2;
    this.rebuildT -= dt;
    if (!this.groundOn) {
      this.mesh.visible = false;
      return;
    }
    if (this.rebuildT <= 0) {
      this.rebuildT = 0.2;
      this._ground();
    }
  }
  _ground() {
    const P = this.path,
      pts = [];
    let acc = 0;
    for (let i = 0; i < P.length - 1 && acc < 70; i++) {
      const a = P[i],
        b = P[i + 1],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.01) continue;
      for (let s = i === 0 ? 1.8 : 0; s < L && acc + s < 70; s += 1)
        pts.push([a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L, acc + s]);
      acc += L;
    }
    if (pts.length < 2) {
      this.mesh.visible = false;
      return;
    }
    const pos = [],
      uv = [],
      idx = [],
      hw = this.g.player.vehicle ? 1.4 : 0.8; // half width: wide enough to read from the saddle
    pts.forEach(([x, z, d], i) => {
      const q = pts[Math.min(i + 1, pts.length - 1)],
        o = pts[Math.max(i - 1, 0)];
      let dx = q[0] - o[0],
        dz = q[1] - o[1];
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const nx = -dz * hw,
        nz = dx * hw,
        y0 = surfaceAt(x - nx, z - nz) + 0.07,
        y1 = surfaceAt(x + nx, z + nz) + 0.07;
      pos.push(x - nx, y0, z - nz, x + nx, y1, z + nz);
      uv.push(0, d / (hw * 2.2), 1, d / (hw * 2.2));
      if (i) {
        const k = i * 2;
        idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
    });
    const geo = this.mesh.geometry;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    this.mesh.visible = true;
  }
}
