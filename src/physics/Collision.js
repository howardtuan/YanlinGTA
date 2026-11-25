// 2D (x/z) collision world: building footprints (polygons) + circles (tree trunks, poles).
export function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0],
      zi = pts[i][1],
      xj = pts[j][0],
      zj = pts[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi) inside = !inside;
  }
  return inside;
}

export function closestOnSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return [ax + dx * t, az + dz * t, t];
}

export class CollisionWorld {
  constructor(bounds, cell = 16) {
    this.b = bounds;
    this.cell = cell;
    this.grid = new Map();
    this.segs = []; // [ax,az,bx,bz]
    this.polys = []; // {pts,minx,minz,maxx,maxz}
    this.circles = []; // [x,z,r]
    this.stampS = [];
    this.stampP = [];
    this.stampC = [];
    this.stamp = 1;
    this.muted = null;
  }
  _key(ix, iz) {
    return ix * 73856 + iz;
  }
  _cell(ix, iz) {
    const k = this._key(ix, iz);
    let c = this.grid.get(k);
    if (!c) {
      c = { s: [], p: [], c: [] };
      this.grid.set(k, c);
    }
    return c;
  }
  _each(minx, minz, maxx, maxz, fn) {
    const cs = this.cell;
    const x0 = Math.floor(minx / cs),
      x1 = Math.floor(maxx / cs);
    const z0 = Math.floor(minz / cs),
      z1 = Math.floor(maxz / cs);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) fn(ix, iz);
  }
  // top: render height of the roof (world y), used by the camera occlusion test
  addPolygon(pts, top = Infinity) {
    let minx = 1e9,
      minz = 1e9,
      maxx = -1e9,
      maxz = -1e9;
    for (const [x, z] of pts) {
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      minz = Math.min(minz, z);
      maxz = Math.max(maxz, z);
    }
    const pi = this.polys.length;
    this.polys.push({ pts, minx, minz, maxx, maxz, top, s0: this.segs.length });
    this.stampP.push(0);
    this._each(minx, minz, maxx, maxz, (ix, iz) => this._cell(ix, iz).p.push(pi));
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length];
      const si = this.segs.length;
      this.segs.push([a[0], a[1], b[0], b[1]]);
      this.stampS.push(0);
      this._each(
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[0], b[0]),
        Math.max(a[1], b[1]),
        (ix, iz) => this._cell(ix, iz).s.push(si)
      );
    }
    return pi;
  }
  // move polygon pi's outline to pts (same vertex count, inside its old bounds, so the grid
  // cells it was filed under still cover it)
  insetPolygon(pi, pts) {
    const p = this.polys[pi];
    p.pts = pts;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length];
      this.segs[p.s0 + i] = [a[0], a[1], b[0], b[1]];
    }
  }
  // free-standing wall (OSM barrier); blocks like a building edge.
  // y0..y1 (optional, world y): resolve() only blocks bodies whose feet are in
  // that band (a viaduct parapet, the walls of a box under a railway);
  // blocked() counts it unless given a ya outside the band
  addSegment(ax, az, bx, bz, y0, y1) {
    const si = this.segs.length;
    this.segs.push(y0 === undefined ? [ax, az, bx, bz] : [ax, az, bx, bz, y0, y1]);
    this.stampS.push(0);
    this._each(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), (ix, iz) =>
      this._cell(ix, iz).s.push(si)
    );
  }
  addCircle(x, z, r) {
    const ci = this.circles.length;
    this.circles.push([x, z, r]);
    this.stampC.push(0);
    this._each(x - r, z - r, x + r, z + r, (ix, iz) => this._cell(ix, iz).c.push(ci));
  }
  // drop a circle added earlier at exactly (x,z) (a tree removed after placement)
  removeCircleAt(x, z) {
    const ci = this.circles.findIndex((c) => c[0] === x && c[1] === z);
    if (ci >= 0) this.circles[ci] = [1e9, 1e9, 0];
  }
  // highest roof over (x,z), or -Infinity outside every building
  topAt(x, z) {
    const c = this.grid.get(this._key(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    let t = -Infinity;
    if (c)
      for (const pi of c.p) {
        const p = this.polys[pi];
        if (
          p.top > t &&
          x >= p.minx &&
          x <= p.maxx &&
          z >= p.minz &&
          z <= p.maxz &&
          pointInPoly(x, z, p.pts)
        )
          t = p.top;
      }
    return t;
  }
  insideAny(x, z) {
    const c = this.grid.get(this._key(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (!c) return false;
    for (const pi of c.p) {
      const p = this.polys[pi];
      if (x >= p.minx && x <= p.maxx && z >= p.minz && z <= p.maxz && pointInPoly(x, z, p.pts))
        return true;
    }
    return false;
  }
  // ya (optional): world y of the feet, skips height-banded segments that are not at that height.
  // this.muted = [i0, i1): segments blocked() skips for now (src/world/MapBuilder.js lays the trees out as without them)
  blocked(x, z, r, y = 0, ya) {
    if (this.extra && this.extra.blocked(x, z, r, y)) return true;
    if (this.reserved && !this.noReserved && this.reserved.some((p) => pointInPoly(x, z, p)))
      return true;
    if (this.insideAny(x, z)) return true;
    let hit = false;
    const st = ++this.stamp;
    this._each(x - r, z - r, x + r, z + r, (ix, iz) => {
      const c = this.grid.get(this._key(ix, iz));
      if (!c || hit) return;
      for (const si of c.s) {
        if (this.stampS[si] === st) continue;
        this.stampS[si] = st;
        if (this.muted && si >= this.muted[0] && si < this.muted[1]) continue;
        const s = this.segs[si];
        if (ya !== undefined && s.length > 4 && !(ya >= s[4] && ya <= s[5])) continue;
        const q = closestOnSeg(x, z, s[0], s[1], s[2], s[3]);
        if ((q[0] - x) ** 2 + (q[1] - z) ** 2 < r * r) {
          hit = true;
          return;
        }
      }
      for (const ci of c.c) {
        const k = this.circles[ci];
        if ((k[0] - x) ** 2 + (k[1] - z) ** 2 < (k[2] + r) ** 2) {
          hit = true;
          return;
        }
      }
    });
    return hit;
  }
  // Pushes pos {x,z} out of obstacles. Returns {hit,nx,nz} (nx,nz = accumulated push normal)
  // ya: world y of the feet, for height-banded segments (vehicles and walkers keep pos.y = 0 and pass it)
  resolve(pos, r, y = 0, ya = pos.y) {
    let hit = false,
      nx = 0,
      nz = 0;
    if (this.extra) {
      const e = this.extra.resolve(pos, r, y);
      if (e.hit) {
        hit = true;
        nx += e.nx;
        nz += e.nz;
      }
    }
    const b = this.b;
    if (pos.x < b.minX + r) {
      pos.x = b.minX + r;
      hit = true;
      nx += 1;
    }
    if (pos.x > b.maxX - r) {
      pos.x = b.maxX - r;
      hit = true;
      nx -= 1;
    }
    if (pos.z < b.minZ + r) {
      pos.z = b.minZ + r;
      hit = true;
      nz += 1;
    }
    if (pos.z > b.maxZ - r) {
      pos.z = b.maxZ - r;
      hit = true;
      nz -= 1;
    }
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      // inside a polygon (tunneling) -> eject to nearest edge
      const cc = this.grid.get(
        this._key(Math.floor(pos.x / this.cell), Math.floor(pos.z / this.cell))
      );
      if (cc)
        for (const pi of cc.p) {
          const p = this.polys[pi];
          if (pos.x < p.minx || pos.x > p.maxx || pos.z < p.minz || pos.z > p.maxz) continue;
          if (!pointInPoly(pos.x, pos.z, p.pts)) continue;
          let best = 1e9,
            bq = null;
          for (let i = 0; i < p.pts.length; i++) {
            const a = p.pts[i],
              c2 = p.pts[(i + 1) % p.pts.length];
            const q = closestOnSeg(pos.x, pos.z, a[0], a[1], c2[0], c2[1]);
            const d = (q[0] - pos.x) ** 2 + (q[1] - pos.z) ** 2;
            if (d < best) {
              best = d;
              bq = q;
            }
          }
          const d = Math.sqrt(best) || 1e-6;
          const ux = (bq[0] - pos.x) / d,
            uz = (bq[1] - pos.z) / d;
          pos.x = bq[0] + ux * r;
          pos.z = bq[1] + uz * r;
          nx += ux;
          nz += uz;
          hit = moved = true;
        }
      const st = ++this.stamp;
      this._each(pos.x - r, pos.z - r, pos.x + r, pos.z + r, (ix, iz) => {
        const c = this.grid.get(this._key(ix, iz));
        if (!c) return;
        for (const si of c.s) {
          if (this.stampS[si] === st) continue;
          this.stampS[si] = st;
          const s = this.segs[si];
          if (s.length > 4 && !(ya >= s[4] && ya <= s[5])) continue;
          const q = closestOnSeg(pos.x, pos.z, s[0], s[1], s[2], s[3]);
          const dx = pos.x - q[0],
            dz = pos.z - q[1];
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r && d2 > 1e-10) {
            const d = Math.sqrt(d2);
            pos.x = q[0] + (dx / d) * r;
            pos.z = q[1] + (dz / d) * r;
            nx += dx / d;
            nz += dz / d;
            hit = moved = true;
          }
        }
        for (const ci of c.c) {
          if (this.stampC[ci] === st) continue;
          this.stampC[ci] = st;
          const k = this.circles[ci];
          const dx = pos.x - k[0],
            dz = pos.z - k[1];
          const rr = r + k[2];
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-10) {
            const d = Math.sqrt(d2);
            pos.x = k[0] + (dx / d) * rr;
            pos.z = k[1] + (dz / d) * rr;
            nx += dx / d;
            nz += dz / d;
            hit = moved = true;
          }
        }
      });
      if (!moved) break;
    }
    const l = Math.hypot(nx, nz) || 1;
    return { hit, nx: nx / l, nz: nz / l };
  }
}

// Spatial grid of road segments for "distance to road" queries
export class SegGrid {
  constructor(cell = 20) {
    this.cell = cell;
    this.grid = new Map();
    this.segs = [];
  }
  add(ax, az, bx, bz, w, data) {
    const si = this.segs.length;
    this.segs.push([ax, az, bx, bz, w, data]);
    const cs = this.cell,
      pad = w;
    for (
      let ix = Math.floor((Math.min(ax, bx) - pad) / cs);
      ix <= Math.floor((Math.max(ax, bx) + pad) / cs);
      ix++
    )
      for (
        let iz = Math.floor((Math.min(az, bz) - pad) / cs);
        iz <= Math.floor((Math.max(az, bz) + pad) / cs);
        iz++
      ) {
        const k = ix * 73856 + iz;
        let c = this.grid.get(k);
        if (!c) this.grid.set(k, (c = []));
        c.push(si);
      }
  }
  // returns {d (distance minus half-width), seg, q}
  nearest(x, z, filter) {
    const c = this.grid.get(Math.floor(x / this.cell) * 73856 + Math.floor(z / this.cell));
    let best = { d: 1e9, seg: null, q: null };
    if (!c) return best;
    for (const si of c) {
      const s = this.segs[si];
      if (filter && !filter(s)) continue;
      const q = closestOnSeg(x, z, s[0], s[1], s[2], s[3]);
      const d = Math.hypot(q[0] - x, q[1] - z) - s[4] / 2;
      if (d < best.d) best = { d, seg: s, q };
    }
    return best;
  }
}
