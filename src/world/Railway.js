// 縱貫線（內壢—中壢）的鐵道設施：平交道（平交道板、露出的鐵軌、柵欄桿、警示燈號、停止線）與鐵道兩側的圍籬。
// 鐵軌本身（道碴帶與鋼軌）照舊由 src/world/MapBuilder.js 畫；火車與班表在 src/entities/Trains.js。
//
// 資料：data/cycu.json rail 的兩條軌道。rail[0] 由東北（內壢）往西南（中壢）、rail[1] 反過來；台鐵靠左行駛，
// 南下（往中壢）走東南側那條（rail[1]），北上走西北側（rail[0]）。
// 平交道：可行車的平面道路（不是地下道、高架）同時穿過兩條軌道的地方。實景（NLSC 2024 正射）三處都是窄巷平交道：
// 新中北路 249 巷、普忠路 211 巷、西邊一條無名巷（-513, -50），兩側各一支橫跨整條路的柵欄桿。
import * as THREE from 'three';
import { groundY } from './Terrain.js';

// 遊戲座標 x 東、z 南
const GAUGE = 0.75; // 鋼軌離軌道中心（與 MapBuilder 畫的鋼軌一致）
const PANEL = 1.25; // 平交道板離軌道中心的半寬
const GATE_D = 3.0; // 柵欄桿離最近一條軌道中心的垂直距離
const STOP_D = 4.8; // 停止線
const FENCE_D = 2.7; // 圍籬離外側軌道中心
const FENCE_H = 1.8;
const DOWN_T = 4.5; // 柵欄桿放下要幾秒
const UP_T = 3.5;

// 折線的累積長度與取點
export function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  // s 超出兩端時沿端點那段延伸
  const at = (s) => {
    let i = 0;
    if (s >= len) i = pts.length - 2;
    else if (s > 0) {
      let lo = 0,
        hi = pts.length - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (cum[m] <= s) lo = m;
        else hi = m;
      }
      i = lo;
    }
    const a = pts[i],
      b = pts[i + 1],
      L = cum[i + 1] - cum[i] || 1,
      dx = (b[0] - a[0]) / L,
      dz = (b[1] - a[1]) / L,
      t = s - cum[i];
    return { x: a[0] + dx * t, z: a[1] + dz * t, dx, dz };
  };
  // 最近點的 s 與距離
  const project = (x, z) => {
    let best = { d: Infinity, s: 0 };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        b = pts[i + 1],
        ex = b[0] - a[0],
        ez = b[1] - a[1],
        l2 = ex * ex + ez * ez || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
      const d = Math.hypot(a[0] + ex * t - x, a[1] + ez * t - z);
      if (d < best.d) best = { d, s: cum[i] + t * Math.sqrt(l2) };
    }
    return best;
  };
  return { pts, cum, len, at, project };
}

const segX = (a, b, c, d) => {
  const rx = b[0] - a[0],
    rz = b[1] - a[1],
    sx = d[0] - c[0],
    sz = d[1] - c[1],
    den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den,
    u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  return t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6
    ? [a[0] + t * rx, a[1] + t * rz]
    : null;
};

// 兩條軌道與它們之間的平交道（roads 裡可行車、在地面上、同時穿過兩條軌道的路段）
export function findCrossings(data) {
  const B = data.bounds,
    tracks = data.rail.map((r) => polyline(r.pts)),
    out = [];
  for (const r of data.roads) {
    if (!r.drive || r.tunnel || r.bridge || r.layer) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i],
        b = r.pts[i + 1];
      const hits = tracks.map((tk) => {
        for (let j = 0; j < tk.pts.length - 1; j++) {
          const p = segX(a, b, tk.pts[j], tk.pts[j + 1]);
          if (p) return p;
        }
        return null;
      });
      // 路段端點剛好停在其中一條軌道上（OSM 平交道節點）：接著的那段路也要算
      if (hits.some((h) => !h)) {
        const n = r.pts[i + 2];
        if (!n || hits.every((h) => !h)) continue;
        for (let k = 0; k < tracks.length; k++)
          if (!hits[k]) {
            const tk = tracks[k];
            for (let j = 0; j < tk.pts.length - 1 && !hits[k]; j++)
              hits[k] = segX(b, n, tk.pts[j], tk.pts[j + 1]);
          }
        if (hits.some((h) => !h)) continue;
      }
      const x = (hits[0][0] + hits[1][0]) / 2,
        z = (hits[0][1] + hits[1][1]) / 2;
      if (x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ) continue;
      if (out.some((c) => Math.hypot(c.x - x, c.z - z) < 10)) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      out.push({
        x,
        z,
        rx: (b[0] - a[0]) / L, // 道路方向
        rz: (b[1] - a[1]) / L,
        w: r.w,
        name: r.name || '無名巷',
        s: tracks.map((tk) => tk.project(x, z).s), // 在各軌道上的位置
      });
    }
  }
  return { tracks, crossings: out };
}

// ---------- 小工具：合併幾何 ----------
class Geo {
  // up：只放平躺的面（平交道板、標線），朝下的自動翻正（兩條軌道方向相反，算出來的繞向會反）
  constructor(up = false) {
    this.up = up;
    this.p = [];
    this.n = [];
    this.c = [];
    this.uv = [];
  }
  quad(a, b, c, d, col, uv = [0, 0, 1, 0, 1, 1, 0, 1]) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1],
      ny = e1[2] * e2[0] - e1[0] * e2[2],
      nz = e1[0] * e2[1] - e1[1] * e2[0];
    if (this.up && ny < 0)
      return this.quad(a, d, c, b, col, [uv[0], uv[1], uv[6], uv[7], uv[4], uv[5], uv[2], uv[3]]);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    const V = [a, b, c, a, c, d],
      U = [0, 1, 2, 0, 2, 3];
    for (let k = 0; k < 6; k++) {
      this.p.push(...V[k]);
      this.n.push(nx, ny, nz);
      this.c.push(col.r, col.g, col.b);
      this.uv.push(uv[U[k] * 2], uv[U[k] * 2 + 1]);
    }
  }
  // 斜放的長方體：中心 (x, y, z)，半寬 hx（沿 (cos, sin) 的垂直方向）、半高 hy、半長 hz（沿 (ux, uz)）
  box(x, y, z, hx, hy, hz, ux, uz, col, bottom = false) {
    const px = -uz,
      pz = ux;
    const P = (i, j, k) => [
      x + px * hx * i + ux * hz * k,
      y + hy * j,
      z + pz * hx * i + uz * hz * k,
    ];
    const f = [
      [P(1, -1, -1), P(1, -1, 1), P(1, 1, 1), P(1, 1, -1)],
      [P(-1, -1, 1), P(-1, -1, -1), P(-1, 1, -1), P(-1, 1, 1)],
      [P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)],
      [P(-1, -1, -1), P(-1, -1, 1), P(1, -1, 1), P(1, -1, -1)],
      [P(1, -1, 1), P(-1, -1, 1), P(-1, 1, 1), P(1, 1, 1)],
      [P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1)],
    ];
    for (let i = 0; i < 6; i++) if (i !== 3 || bottom) this.quad(...f[i], col);
  }
  mesh(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    return m;
  }
}
const col = (h) => new THREE.Color(h);

function canvasTex(w, h, draw, { repeat = false } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 鐵道圍籬：綠色菱形鐵絲網
const meshTex = () =>
  canvasTex(
    64,
    64,
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(46,104,70,1)';
      g.lineWidth = 3;
      g.beginPath();
      for (let k = -2; k <= 2; k++) {
        g.moveTo(k * 32, 0);
        g.lineTo(k * 32 + 64, 64);
        g.moveTo(k * 32 + 64, 0);
        g.lineTo(k * 32, 64);
      }
      g.stroke();
    },
    { repeat: true }
  );
// 柵欄桿：黃黑相間斜紋
const boomTex = () =>
  canvasTex(256, 16, (g, w, h) => {
    g.fillStyle = '#f2c21b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#141414';
    for (let x = -16; x < w + 16; x += 32) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 16, 0);
      g.lineTo(x + 32, 0);
      g.lineTo(x + 16, h);
      g.fill();
    }
  });

export function buildRailway(scene, world, data, { low = false } = {}) {
  const { tracks, crossings } = findCrossings(data);
  const coll = world.collision;
  const group = new THREE.Group();
  group.name = 'railway';
  scene.add(group);
  const Y = (x, z) => groundY(x, z);
  // 軌道法向（指向另一條軌道的那側為內側）
  const sideOf = (k, s) => {
    const p = tracks[k].at(s),
      o = tracks[1 - k].project(p.x, p.z),
      q = tracks[1 - k].at(o.s);
    const nx = -p.dz,
      nz = p.dx;
    return Math.sign((q.x - p.x) * nx + (q.z - p.z) * nz) || 1; // +1：另一條軌道在 n 那側
  };

  // ---------- 平交道 ----------
  const flat = new Geo(true),
    steel = new Geo(true),
    paint = new Geo(true);
  const RUBBER = col('#55585c'),
    GROOVE = col('#1b1c1e'),
    RAIL = col('#b9bcbf'),
    WHITE = col('#f2f2ee');
  const lampMats = [];
  for (let i = 0; i < crossings.length * 2; i++)
    lampMats.push(
      new THREE.MeshStandardMaterial({
        color: '#3a0606',
        emissive: '#ff2a12',
        emissiveIntensity: 0,
        roughness: 0.3,
      })
    );
  const parts = new Geo(); // 燈桿、機箱、號誌背板（靜態）
  const boomMat = new THREE.MeshStandardMaterial({ map: boomTex(), roughness: 0.6 });
  const boomGeo = new THREE.BoxGeometry(1, 0.11, 0.11).translate(0.5, 0, 0);
  for (const c of crossings) {
    const hw = c.w / 2,
      mx = -c.rz, // 道路法向
      mz = c.rx;
    c.sides = [];
    c.booms = [];
    c.phase = 0; // 0 升起 … 1 放下
    c.warn = false;
    c.t = 0;
    // 各軌道的平交道板與露出的鋼軌
    let dMax = 0;
    for (let k = 0; k < 2; k++) {
      const p = tracks[k].at(c.s[k]),
        tx = p.dx,
        tz = p.dz,
        nx = -tz,
        nz = tx;
      const cosR = Math.abs(c.rx * nx + c.rz * nz) || 1, // 道路與軌道法向夾角
        cosT = Math.abs(tx * mx + tz * mz) || 1;
      const al = (hw + 0.6) / cosT; // 沿軌道方向的長度（一半）
      const be = PANEL / cosR; // 沿道路方向
      const y = Y(p.x, p.z) + 0.09;
      const C = (a, b) => [p.x + tx * a + c.rx * b, y, p.z + tz * a + c.rz * b];
      flat.quad(C(-al, -be), C(al, -be), C(al, be), C(-al, be), RUBBER);
      // 輪緣槽與鋼軌：沿軌道方向，偏離軌道中心 ±GAUGE
      for (const g of [-GAUGE, GAUGE]) {
        const ox = nx * g,
          oz = nz * g;
        const R = (a, w, h) => [p.x + ox + tx * a + nx * w, y + h, p.z + oz + tz * a + nz * w];
        const a0 = -al - 0.3,
          a1 = al + 0.3;
        paint.quad(
          R(a0, -0.12, 0.004),
          R(a1, -0.12, 0.004),
          R(a1, -0.04, 0.004),
          R(a0, -0.04, 0.004),
          GROOVE
        );
        steel.quad(
          R(a0, -0.04, 0.012),
          R(a1, -0.04, 0.012),
          R(a1, 0.04, 0.012),
          R(a0, 0.04, 0.012),
          RAIL
        );
      }
      dMax = Math.max(dMax, Math.abs((p.x - c.x) * c.rx + (p.z - c.z) * c.rz));
    }
    // 兩側：柵欄桿、警示燈、停止線
    const trackDist = (x, z) => Math.min(...tracks.map((tk) => tk.project(x, z).d));
    for (const sd of [-1, 1]) {
      // 沿道路往外找：離最近軌道中心垂直 GATE_D、STOP_D 的位置
      const along = (D) => {
        let a = dMax;
        while (a < 40 && trackDist(c.x + c.rx * sd * a, c.z + c.rz * sd * a) < D) a += 0.1;
        return a;
      };
      const ag = along(GATE_D),
        as = along(STOP_D);
      // 從這側開進來的車往 -sd 方向開；駕駛右手邊 = (−d.z, d.x)
      const dx = -c.rx * sd,
        dz = -c.rz * sd,
        rx = -dz,
        rz = dx;
      const gx = c.x + c.rx * sd * ag,
        gz = c.z + c.rz * sd * ag;
      // 柵欄機在路右側路邊
      const px = gx + rx * (hw + 0.45),
        pz = gz + rz * (hw + 0.45),
        py = Y(px, pz);
      parts.box(px, py + 0.5, pz, 0.24, 0.5, 0.22, dx, dz, col('#f0c020'));
      parts.box(px, py + 1.02, pz, 0.12, 0.03, 0.12, dx, dz, col('#2a2a2a'));
      // 柵欄桿：從右側柵欄機橫過整條路，轉軸沿行車方向
      const pivot = new THREE.Group();
      pivot.position.set(px, py + 0.82, pz);
      pivot.rotation.order = 'YZX';
      pivot.rotation.y = Math.atan2(rz, -rx); // 本地 +x 指向路的左側（−右）
      const boom = new THREE.Mesh(boomGeo, boomMat);
      boom.scale.set(c.w + 0.45, 1, 1);
      boom.castShadow = !low;
      pivot.add(boom);
      group.add(pivot);
      c.booms.push(pivot);
      // 警示燈桿：柵欄機後面一點（離軌道較遠）
      const lx = px + dx * -0.9 + rx * 0.35,
        lz = pz + dz * -0.9 + rz * 0.35,
        ly = Y(lx, lz);
      for (let k = 0; k < 7; k++)
        parts.box(
          lx,
          ly + 0.2 + k * 0.4,
          lz,
          0.055,
          0.2,
          0.055,
          dx,
          dz,
          col(k % 2 ? '#141414' : '#f2c21b')
        );
      parts.box(lx, ly + 3.0, lz, 0.06, 0.2, 0.06, dx, dz, col('#141414'));
      // 打叉的平交道標誌（黃底黑邊兩片斜板）面向來車
      for (const sg of [-1, 1]) {
        const a = (Math.PI / 4) * sg,
          ca = Math.cos(a),
          sa = Math.sin(a);
        // 長軸 u、短軸 v（都在面向來車的直立平面上）
        const u = [rx * ca, sa, rz * ca],
          v = [-rx * sa, ca, -rz * sa];
        const L = 0.62,
          Wd = 0.11;
        const Q = (s2, t, off) => [
          lx + u[0] * s2 + v[0] * t - dx * off,
          ly + 3.15 + u[1] * s2 + v[1] * t,
          lz + u[2] * s2 + v[2] * t - dz * off,
        ];
        parts.quad(
          Q(-L, -Wd, 0.08),
          Q(L, -Wd, 0.08),
          Q(L, Wd, 0.08),
          Q(-L, Wd, 0.08),
          col('#141414')
        );
        const e = 0.035;
        parts.quad(
          Q(-L + e, -Wd + e, 0.09 + sg * 0.002),
          Q(L - e, -Wd + e, 0.09 + sg * 0.002),
          Q(L - e, Wd - e, 0.09 + sg * 0.002),
          Q(-L + e, Wd - e, 0.09 + sg * 0.002),
          col('#f2c21b')
        );
        parts.quad(
          Q(L, -Wd, 0.06),
          Q(-L, -Wd, 0.06),
          Q(-L, Wd, 0.06),
          Q(L, Wd, 0.06),
          col('#9a9a9a')
        );
      }
      // 號誌：黑色背板＋左右兩盞紅燈，面向來車
      const by = ly + 2.45;
      parts.box(lx - dx * 0.06, by, lz - dz * 0.06, 0.55, 0.2, 0.02, dx, dz, col('#111111'));
      parts.box(lx - dx * 0.04, by + 0.2, lz - dz * 0.04, 0.05, 0.05, 0.08, dx, dz, col('#111111'));
      for (const sg of [-1, 1]) {
        const m = lampMats[crossings.indexOf(c) * 2 + (sg > 0 ? 1 : 0)];
        const lamp = new THREE.Mesh(LAMP_GEO, m);
        lamp.position.set(lx - dx * 0.09 + rx * 0.33 * sg, by, lz - dz * 0.09 + rz * 0.33 * sg);
        lamp.lookAt(lamp.position.x - dx, by, lamp.position.z - dz);
        lamp.matrixAutoUpdate = false;
        lamp.updateMatrix();
        group.add(lamp);
        // 遮光罩
        parts.box(
          lamp.position.x - dx * 0.08,
          by + 0.15,
          lamp.position.z - dz * 0.08,
          0.15,
          0.015,
          0.1,
          dx,
          dz,
          col('#111111')
        );
      }
      // 停止線：整條路寬
      const sx = c.x + c.rx * sd * as,
        sz = c.z + c.rz * sd * as,
        sy = Y(sx, sz) + 0.075;
      const S = (b, a) => [sx + mx * b + c.rx * a, sy, sz + mz * b + c.rz * a];
      paint.quad(S(-hw + 0.2, -0.2), S(hw - 0.2, -0.2), S(hw - 0.2, 0.2), S(-hw + 0.2, 0.2), WHITE);
      c.sides.push({
        x: sx, // 停止線中點
        z: sz,
        y: sy,
        inX: dx, // 往平交道的方向
        inZ: dz,
        hw,
        boomX: px,
        boomZ: pz,
      });
    }
    c.lx = c.x;
    c.lz = c.z;
  }
  const surf = (opt) =>
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      ...opt,
    });
  // 路面之後才畫（MapBuilder 的路面、道碴帶 renderOrder 依序遞增），接收陰影
  [
    flat.mesh(surf({})),
    paint.mesh(surf({ polygonOffsetFactor: -6, polygonOffsetUnits: -6 })),
    steel.mesh(
      surf({ metalness: 0.8, roughness: 0.35, polygonOffsetFactor: -8, polygonOffsetUnits: -8 })
    ),
  ].forEach((m, i) => {
    m.receiveShadow = true;
    m.renderOrder = 100000 + i;
    group.add(m);
  });
  const pm = parts.mesh(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide })
  );
  pm.castShadow = !low;
  group.add(pm);

  // ---------- 鐵道兩側圍籬 ----------
  // 每條軌道的外側（離另一條軌道那側）FENCE_D 處；路面（平面道路）與建築範圍裡斷開，平交道自然留出開口
  const atGrade = data.roads.filter((r) => !r.tunnel && !r.bridge && !r.layer);
  const onRoad = (x, z) => {
    for (const r of atGrade)
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i],
          b = r.pts[i + 1],
          ex = b[0] - a[0],
          ez = b[1] - a[1],
          l2 = ex * ex + ez * ez;
        if (!l2) continue;
        if (Math.abs(x - a[0]) > 60 + Math.abs(ex) && Math.abs(z - a[1]) > 60 + Math.abs(ez))
          continue;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
        if (Math.hypot(a[0] + ex * t - x, a[1] + ez * t - z) < r.w / 2 + 0.9) return true;
      }
    return false;
  };
  const B = data.bounds,
    inB = (x, z) => x > B.minX + 2 && x < B.maxX - 2 && z > B.minZ + 2 && z < B.maxZ - 2;
  const fenceG = new Geo(),
    postG = new Geo(),
    POST = col('#3c6e50'),
    MESH = col('#ffffff');
  const STEP = 2.5;
  let fenceLen = 0;
  for (let k = 0; k < 2; k++) {
    const tk = tracks[k];
    let run = []; // 連續的一段圍籬點
    const flush = () => {
      if (run.length >= 2) {
        for (let i = 0; i < run.length - 1; i++) {
          const a = run[i],
            b = run[i + 1];
          const l = Math.hypot(b[0] - a[0], b[2] - a[2]);
          fenceG.quad(
            [a[0], a[1] + 0.1, a[2]],
            [b[0], b[1] + 0.1, b[2]],
            [b[0], b[1] + FENCE_H, b[2]],
            [a[0], a[1] + FENCE_H, a[2]],
            MESH,
            [0, 0, l / 0.5, 0, l / 0.5, (FENCE_H - 0.1) / 0.5, 0, (FENCE_H - 0.1) / 0.5]
          );
          // 上緣橫桿
          const ux = (b[0] - a[0]) / l,
            uz = (b[2] - a[2]) / l;
          postG.box(
            (a[0] + b[0]) / 2,
            (a[1] + b[1]) / 2 + FENCE_H,
            (a[2] + b[2]) / 2,
            0.025,
            0.025,
            l / 2,
            ux,
            uz,
            POST
          );
          coll.addSegment(a[0], a[2], b[0], b[2]);
          fenceLen += l;
        }
        for (const p of run)
          postG.box(p[0], p[1] + FENCE_H / 2, p[2], 0.04, FENCE_H / 2, 0.04, 1, 0, POST);
      }
      run = [];
    };
    for (let s = 0; s <= tk.len; s += STEP) {
      const p = tk.at(s),
        sg = -sideOf(k, s),
        x = p.x - p.dz * FENCE_D * sg,
        z = p.z + p.dx * FENCE_D * sg;
      if (!inB(x, z) || onRoad(x, z) || coll.insideAny(x, z)) {
        flush();
        continue;
      }
      run.push([x, Y(x, z), z]);
    }
    flush();
  }
  const fm = fenceG.mesh(
    new THREE.MeshStandardMaterial({
      map: meshTex(),
      vertexColors: true,
      alphaTest: 0.4,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.2,
    })
  );
  fm.receiveShadow = true;
  group.add(fm);
  const fp = postG.mesh(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 })
  );
  fp.castShadow = !low;
  group.add(fp);

  // ---------- 動態 ----------
  // warn(i, on)：火車接近／還沒離開（src/entities/Trains.js 每幀設定）
  const railway = {
    tracks,
    crossings,
    bounds: data.bounds,
    fenceLen,
    group,
    // 給 NPC 車流的「停止線」：關著時從這側開進來的車停在線前（src/entities/NPC.js Traffic）
    gates: crossings.flatMap((c) =>
      c.sides.map((s) => ({
        gate: true,
        crossing: c,
        pos: { x: s.x, z: s.z },
        radius: s.hw,
        mesh: { position: { y: s.y } },
        inX: s.inX,
        inZ: s.inZ,
        closed: () => c.warn || c.phase > 0.05,
      }))
    ),
    update(dt) {
      for (let i = 0; i < crossings.length; i++) {
        const c = crossings[i];
        c.t = c.warn ? c.t + dt : 0;
        // 響鈴 1.5 秒後開始放下，火車離開後升起
        const tgt = c.warn && c.t > 1.5 ? 1 : 0;
        if (tgt > c.phase) c.phase = Math.min(1, c.phase + dt / DOWN_T);
        else if (tgt < c.phase) c.phase = Math.max(0, c.phase - dt / UP_T);
        const e = 1 - c.phase;
        const ang = (Math.PI / 2 - 0.05) * (e * e * (3 - 2 * e)); // 升起時幾乎垂直
        for (const b of c.booms) b.rotation.z = ang;
        // 紅燈左右交替閃（每秒約 50 次……台鐵規定每分鐘 45～55 次）
        const on = c.warn || c.phase > 0.02;
        const ph = Math.floor(c.t * 1.8) % 2;
        lampMats[i * 2].emissiveIntensity = on && ph === 0 ? 3.2 : 0;
        lampMats[i * 2 + 1].emissiveIntensity = on && ph === 1 ? 3.2 : 0;
      }
    },
  };
  railway.update(0);
  return railway;
}

const LAMP_GEO = new THREE.CircleGeometry(0.14, 20);
