// 外觀網格 vs 碰撞 全圖比對（node tools/collision_mesh_check.mjs [選項]）
//
// 在遊戲頁面裡（?keepgeo：靜態幾何保留 CPU 副本，src/graphics/GpuMemLifecycle.js）把整張地圖的牆面和碰撞對一次：
//   1. 看得到卻穿得過：離地 0.4～1.5 m（玩家身體那一段）整段貫穿、水平長 ≥ 1 m 的近垂直三角形，投影到 0.25 m 格子；
//      格子離所有碰撞（建物輪廓、獨立牆、樹幹、室內／街屋的帶高度牆）都超過 0.4 m、也不在建物輪廓裡 → 玩家中心站得到、
//      身體會陷進那面牆。相鄰格子串成一群，列出位置、大小、是哪個網格。
//   2. 看不到卻被擋住：碰撞線（建物輪廓邊、獨立牆、帶高度牆）沿線 0.75 m 內完全沒有任何網格、連續 ≥ 2 m 的段落。
// 位置會對到 data/cycu.json 的建物與各街區 footprints（tools/street_corner_check.mjs loadWorld），報告寫是哪個檔。
// 實例化的道具（停放機車、灌木、路邊家具）、地面、隱藏中的室內家具另外算（--props 才列）。
//
// 選項：
//   --cdp=<port>       接到已經開好的 Chrome（例如 ~/Workspace/scripts/remote-chrome.mjs 開在別台的無頭 Chrome）
//   --url=<url>        遊戲網址（預設自己用 tools/e2e/serve.mjs 送 dist/，要先 npm run build）
//   --serve-host=<ip>  自己送 dist/ 時聽哪個位址、網址用哪個主機名（Chrome 在別台時用區網／Tailscale IP）
//   --chrome=<path>    本機 Chrome（沒給 --cdp 時用）
//   --min=<格數>       少於這麼多格（每格 0.0625 m²）的群不列，預設 8
//   --props            連實例化道具也算進「看得到卻穿得過」
//   --low              改抓腰部以下的量體（離地 0.45～0.7 m 都有東西、水平 ≥ 0.3 m：箱子、貨架、冰櫃）
//   --out=<檔>         Markdown 報告（預設印到終端機）
//   --json=<檔>        原始結果
//   遠景剪影（skyline）、地面、會動的車與人不算。
// 只讀、不改任何檔案。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP, launchChrome, defaultChromePath } from './e2e/cdp.mjs';
import { startServer } from './e2e/serve.mjs';
import { loadWorld, inPoly, nearPoi } from './street_corner_check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

// ---------------- 在頁面裡跑的部分 ----------------
// 回傳 { fwd: [群], inv: [段] }；opts: { props, min }
export function pageScan(opts) {
  const g = window.game,
    w = g.world,
    C = w.collision,
    X = C.extra,
    P = g.physics,
    R = P.R;
  const CS = 0.25,
    B = C.b,
    NX = Math.ceil((B.maxX - B.minX) / CS),
    NZ = Math.ceil((B.maxZ - B.minZ) / CS);
  const LO = 0.4,
    HI = 1.5,
    REACH = 0.4;
  const own = new Int32Array(NX * NZ).fill(-1); // 牆面三角形（第 1 項）
  const ownY = new Float32Array(NX * NZ); // 那面牆站的樓層高度（世界 y）
  const any = new Uint8Array(NX * NZ); // 任何高度、任何網格（第 2 項）
  // 地面：所有固定、不是牆和樹幹的 Rapier 碰撞體（地形、平台、樓梯、橋面、室內樓板），每 1 m 一條往下的射線，
  // 收集每一層的高度（學生活動中心、宿舍這種多層室內：三角形用它腳下那一層當地面，查牆也用那一層的高度）
  const GX = Math.ceil(B.maxX - B.minX) + 1,
    GZ = Math.ceil(B.maxZ - B.minZ) + 1;
  const fl = new Array(GX * GZ),
    terr = new Float32Array(GX * GZ).fill(NaN);
  const isG = (c) => !P.tags.walls.has(c.handle) && !P.tags.trunks.has(c.handle) && !c.parent();
  const isT = (c) => P.tags.ground.has(c.handle);
  const ray = new R.Ray({ x: 0, y: 400, z: 0 }, { x: 0, y: -1, z: 0 });
  const cellOf = (x, z) => {
    const i = Math.round(x - B.minX),
      j = Math.round(z - B.minZ);
    return i < 0 || j < 0 || i >= GX || j >= GZ ? -1 : j * GX + i;
  };
  const floors = (x, z) => {
    const k = cellOf(x, z);
    if (k < 0) return [0];
    let v = fl[k];
    if (!v) {
      ray.origin = { x: B.minX + (k % GX), y: 400, z: B.minZ + ((k / GX) | 0) };
      v = [];
      P.world.intersectionsWithRay(
        ray,
        800,
        true,
        (h) => {
          v.push(400 - h.timeOfImpact);
          return true;
        },
        undefined,
        undefined,
        undefined,
        undefined,
        isG
      );
      v.sort((a, b) => b - a);
      if (!v.length) v.push(0);
      fl[k] = v;
    }
    return v;
  };
  const terrain = (x, z) => {
    const k = cellOf(x, z);
    if (k < 0) return 0;
    let v = terr[k];
    if (Number.isNaN(v)) {
      ray.origin = { x: B.minX + (k % GX), y: 400, z: B.minZ + ((k / GX) | 0) };
      const h = P.world.castRay(ray, 800, true, undefined, undefined, undefined, undefined, isT);
      v = terr[k] = h ? 400 - h.timeOfImpact : 0;
    }
    return v;
  };
  // the floor a piece standing at y0 stands on: the highest one at most 0.45 m above its foot; a foot sunk into
  // the ground (walls go 0.5～1 m below it) takes the floor nearest to it (not the safety floor 30 m down)
  const ground = (x, z, y0) => {
    const v = floors(x, z);
    let near = v[0];
    for (const f of v) {
      if (f <= y0 + 0.45 && f >= y0 - 2) return f;
      if (Math.abs(f - y0) < Math.abs(near - y0)) near = f;
    }
    return near;
  };
  // 會動的東西不算
  const skip = new Set();
  const addRoot = (o) => {
    if (o && o.isObject3D) skip.add(o);
  };
  const scanArr = (a) => {
    if (!a) return;
    for (const v of Array.isArray(a) ? a : Object.values(a)) {
      if (!v || typeof v !== 'object') continue;
      addRoot(v.mesh);
      addRoot(v.ch?.root);
      addRoot(v.root);
      addRoot(v.group);
    }
  };
  scanArr(g.vehicles);
  scanArr(g.traffic?.agents);
  scanArr(g.peds?.list);
  scanArr(g.npcs);
  scanArr(g.customNpcs);
  addRoot(g.player?.ch?.root);
  addRoot(g.drone?.mesh);
  if (w.groundMesh) skip.add(w.groundMesh);
  addRoot(g.skyline); // 跟著相機走的遠景剪影（MapBuilder.js buildSkyline）
  const meshes = [],
    names = [];
  const pathOf = (o) => {
    const p = [];
    for (let q = o; q && q !== g.scene; q = q.parent) if (q.name) p.push(q.name);
    return p.reverse().join('/');
  };
  // every node, hidden ones too (the scene's own updateMatrixWorld skips hidden subtrees: src/graphics/VisibleMatrices.js)
  for (const c of g.scene.children) c.updateMatrixWorld(true);
  let noCpu = 0;
  g.scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    for (let q = o; q; q = q.parent) if (skip.has(q)) return;
    const pa = o.geometry?.attributes?.position;
    if (!pa) return;
    if (!pa.array.length) {
      noCpu++;
      return;
    }
    meshes.push(o);
  });
  let curY = 0; // floor of the triangle being marked (ownY)
  const mark = (arr, x, z, id) => {
    const i = Math.floor((x - B.minX) / CS),
      j = Math.floor((z - B.minZ) / CS);
    if (i >= 0 && j >= 0 && i < NX && j < NZ) {
      arr[j * NX + i] = id;
      if (arr === own) ownY[j * NX + i] = curY;
    }
  };
  const line = (arr, ax, az, bx, bz, id) => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (CS * 0.5)));
    for (let s = 0; s <= n; s++) mark(arr, ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n, id);
  };
  const clipY = (poly, y, above) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const ia = above ? a.y >= y : a.y <= y,
        ib = above ? b.y >= y : b.y <= y;
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = (y - a.y) / (b.y - a.y);
        out.push({ x: a.x + (b.x - a.x) * t, y, z: a.z + (b.z - a.z) * t });
      }
    }
    return out;
  };
  let used = 0;
  const tri = (A, Bv, Cv, id, inst) => {
    const ylo = Math.min(A.y, Bv.y, Cv.y),
      yhi = Math.max(A.y, Bv.y, Cv.y);
    const cx = (A.x + Bv.x + Cv.x) / 3,
      cz = (A.z + Bv.z + Cv.z) / 3;
    const g0 = ground(cx, cz, ylo);
    curY = g0;
    if (yhi < g0 + LO || ylo > g0 + HI) return;
    // 第 2 項：任何高度帶內的網格都算「看得到」
    line(any, A.x, A.z, Bv.x, Bv.z, 1);
    line(any, Bv.x, Bv.z, Cv.x, Cv.z, 1);
    line(any, Cv.x, Cv.z, A.x, A.z, 1);
    if (inst && !opts.props) return;
    const ux = Bv.x - A.x,
      uy = Bv.y - A.y,
      uz = Bv.z - A.z,
      vx = Cv.x - A.x,
      vy = Cv.y - A.y,
      vz = Cv.z - A.z;
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx,
      nl = Math.hypot(nx, ny, nz);
    if (!(nl > 1e-9) || Math.abs(ny) / nl > 0.5) return; // 地板、桌面、屋頂
    // 沒有整段擋住身體（矮花台、窗台以上的招牌）；--low：腰部以下的量體（箱子、貨架、冰櫃，離地 0.45～0.7 m 都有東西）
    if (opts.low ? ylo > g0 + 0.45 || yhi < g0 + 0.7 : ylo > g0 + LO || yhi < g0 + HI) return;
    const hl = Math.max(
      Math.hypot(A.x - Bv.x, A.z - Bv.z),
      Math.hypot(A.x - Cv.x, A.z - Cv.z),
      Math.hypot(Bv.x - Cv.x, Bv.z - Cv.z)
    );
    if (hl < (opts.low ? 0.3 : 1)) return; // 竹子、欄杆立柱、燈桿
    let p = clipY([{ ...A }, { ...Bv }, { ...Cv }], g0 + LO, true);
    if (p.length < 3) return;
    p = clipY(p, g0 + HI, false);
    if (p.length < 3) return;
    used++;
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length];
      line(own, a.x, a.z, b.x, b.z, id);
    }
  };
  const V = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ],
    E = { x: 0, y: 0, z: 0 },
    IM = new Float32Array(16),
    MM = new Float32Array(16);
  const ap = (m, e, o) => {
    o.x = m[0] * e.x + m[4] * e.y + m[8] * e.z + m[12];
    o.y = m[1] * e.x + m[5] * e.y + m[9] * e.z + m[13];
    o.z = m[2] * e.x + m[6] * e.y + m[10] * e.z + m[14];
  };
  const mul = (a, b, o) => {
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
        o[i * 4 + j] = s;
      }
  };
  let tris = 0;
  meshes.forEach((o, id) => {
    const gm = o.geometry,
      pa = gm.attributes.position,
      idx = gm.index;
    const n = idx ? idx.count : pa.count,
      cnt = o.isInstancedMesh ? o.count : 1;
    for (let k = 0; k < cnt; k++) {
      let m = o.matrixWorld.elements;
      if (o.isInstancedMesh) {
        const ia = o.instanceMatrix.array;
        for (let t = 0; t < 16; t++) IM[t] = ia[k * 16 + t];
        mul(o.matrixWorld.elements, IM, MM);
        m = MM;
      }
      for (let t = 0; t + 2 < n; t += 3) {
        for (let s = 0; s < 3; s++) {
          const vi = idx ? idx.getX(t + s) : t + s;
          E.x = pa.getX(vi);
          E.y = pa.getY(vi);
          E.z = pa.getZ(vi);
          ap(m, E, V[s]);
        }
        tris++;
        tri(V[0], V[1], V[2], id, o.isInstancedMesh);
      }
    }
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    names[id] =
      `${pathOf(o) || o.type}${o.isInstancedMesh ? '[inst]' : ''} ${mat?.color ? `#${mat.color.getHexString()}` : ''}`.trim();
  });
  // ---- 1. 看得到卻穿得過 ----
  const saveRes = C.reserved;
  C.reserved = null; // 保留範圍不是碰撞（resolve 不看它）
  // fy: the floor (world y) the wall stands on; the game's wall bands are world heights (CollisionWorld) or heights
  // above the local terrain (Interiors), so an upper floor is checked against its own walls
  const free = (x, z, fy = terrain(x, z)) => {
    const yr = Math.max(0, fy - terrain(x, z));
    return (
      !C.insideAny(x, z) && !C.blocked(x, z, REACH, yr, fy) && !(X && X.blocked(x, z, REACH, yr))
    );
  };
  // 走得到的地方：從出生點用同一套碰撞（半徑 0.3 m）往外填，0.5 m 一格；圍起來進不去的地方（擋土牆後的地坪、
  // 封死的量體內部）不報。高度不管（樓梯、平台當平地），所以偏寬鬆
  const RS = 0.5,
    RX = Math.ceil((B.maxX - B.minX) / RS),
    RZ = Math.ceil((B.maxZ - B.minZ) / RS);
  const reach = new Uint8Array(RX * RZ); // 0 未看、1 走得到、2 擋住
  {
    const open = (i, j) => {
      const x = B.minX + (i + 0.5) * RS,
        z = B.minZ + (j + 0.5) * RS;
      return !C.insideAny(x, z) && !C.blocked(x, z, 0.3, 0, 0);
    };
    const sp = g.startPos || g.player?.pos || { x: 0, z: 0 };
    const si = Math.floor((sp.x - B.minX) / RS),
      sj = Math.floor((sp.z - B.minZ) / RS);
    const q = new Int32Array(RX * RZ);
    let qh = 0,
      qt = 0;
    if (open(si, sj)) {
      reach[sj * RX + si] = 1;
      q[qt++] = sj * RX + si;
    }
    while (qh < qt) {
      const k = q[qh++],
        i = k % RX,
        j = (k / RX) | 0;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const ii = i + di,
          jj = j + dj;
        if (ii < 1 || jj < 1 || ii >= RX - 1 || jj >= RZ - 1) continue;
        const kk = jj * RX + ii;
        if (reach[kk]) continue;
        if (open(ii, jj)) {
          reach[kk] = 1;
          q[qt++] = kk;
        } else reach[kk] = 2;
      }
    }
  }
  const reachable = (x, z) => {
    const i = Math.floor((x - B.minX) / RS),
      j = Math.floor((z - B.minZ) / RS);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ii = i + di,
          jj = j + dj;
        if (ii >= 0 && jj >= 0 && ii < RX && jj < RZ && reach[jj * RX + ii] === 1) return true;
      }
    return false;
  };
  const bad = new Uint8Array(NX * NZ);
  let unreach = 0;
  for (let k = 0; k < own.length; k++) {
    if (own[k] < 0) continue;
    const x = B.minX + ((k % NX) + 0.5) * CS,
      z = B.minZ + (((k / NX) | 0) + 0.5) * CS;
    if (!free(x, z, ownY[k])) continue;
    if (reachable(x, z)) bad[k] = 1;
    else unreach++;
  }
  C.reserved = saveRes;
  const seen = new Uint8Array(NX * NZ),
    fwd = [];
  for (let k = 0; k < bad.length; k++) {
    if (!bad[k] || seen[k]) continue;
    const st = [k];
    seen[k] = 1;
    let n = 0,
      sx = 0,
      sz = 0,
      x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9;
    const ids = new Map(),
      cells = [];
    while (st.length) {
      const q = st.pop(),
        i = q % NX,
        j = (q / NX) | 0;
      const x = B.minX + (i + 0.5) * CS,
        z = B.minZ + (j + 0.5) * CS;
      n++;
      sx += x;
      sz += z;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
      if (cells.length < 400) cells.push([+x.toFixed(2), +z.toFixed(2)]);
      ids.set(own[q], (ids.get(own[q]) || 0) + 1);
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = i + di,
            jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue;
          const kk = jj * NX + ii;
          if (bad[kk] && !seen[kk]) {
            seen[kk] = 1;
            st.push(kk);
          }
        }
    }
    if (n < opts.min) continue;
    fwd.push({
      n,
      x: +(sx / n).toFixed(1),
      z: +(sz / n).toFixed(1),
      box: [x0, z0, x1, z1].map((v) => +v.toFixed(2)),
      meshes: [...ids.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, c]) => `${names[id]} ×${c}`),
      cells,
    });
  }
  fwd.sort((a, b) => b.n - a.n);
  // ---- 2. 看不到卻被擋住 ----
  const seeAt = (x, z, r) => {
    const i0 = Math.max(0, Math.floor((x - r - B.minX) / CS)),
      i1 = Math.min(NX - 1, Math.floor((x + r - B.minX) / CS));
    const j0 = Math.max(0, Math.floor((z - r - B.minZ) / CS)),
      j1 = Math.min(NZ - 1, Math.floor((z + r - B.minZ) / CS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (any[j * NX + i]) return true;
    return false;
  };
  const inBounds = (x, z) => x > B.minX + 2 && x < B.maxX - 2 && z > B.minZ + 2 && z < B.maxZ - 2;
  const segPoly = new Map();
  C.polys.forEach((p, pi) => {
    for (let i = 0; i < p.pts.length; i++) segPoly.set(p.s0 + i, pi);
  });
  const inv = [];
  const runAlong = (ax, az, bx, bz, what) => {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 2) return;
    const n = Math.ceil(L / 0.5);
    let run = 0,
      r0 = 0;
    const flush = (k) => {
      const len = (run * L) / n;
      if (len >= 2) {
        const t0 = r0 / n,
          t1 = k / n;
        inv.push({
          what,
          len: +len.toFixed(1),
          a: [+(ax + (bx - ax) * t0).toFixed(1), +(az + (bz - az) * t0).toFixed(1)],
          b: [+(ax + (bx - ax) * t1).toFixed(1), +(az + (bz - az) * t1).toFixed(1)],
        });
      }
      run = 0;
    };
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n,
        z = az + ((bz - az) * k) / n;
      if (inBounds(x, z) && !seeAt(x, z, 0.75)) {
        if (!run) r0 = k;
        run++;
      } else flush(k);
    }
    flush(n);
  };
  // free-standing walls along a pond / stream (world.waterPolys): the banks keep you out of the water on purpose
  const water = w.waterPolys || [];
  const nearWater = (x, z) =>
    water.some((P) => {
      let c = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, zi] = P[i],
          [xj, zj] = P[j];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
        const dx = xi - xj,
          dz = zi - zj,
          l2 = dx * dx + dz * dz || 1,
          t = Math.max(0, Math.min(1, ((x - xj) * dx + (z - zj) * dz) / l2));
        if (Math.hypot(xj + dx * t - x, zj + dz * t - z) < 3) return true;
      }
      return c;
    });
  // ... and the copes along the sunken streams and ditches (MapBuilder sinkColl: world.inSink on one side)
  const sunk = (x, z, ax, az, bx, bz) => {
    if (!w.inSink) return false;
    const l = Math.hypot(bx - ax, bz - az) || 1,
      nx = (bz - az) / l,
      nz = -(bx - ax) / l;
    return !!(w.inSink(x + nx * 1.2, z + nz * 1.2) || w.inSink(x - nx * 1.2, z - nz * 1.2));
  };
  let banks = 0;
  C.segs.forEach((s, si) => {
    const pi = segPoly.get(si),
      mx = (s[0] + s[2]) / 2,
      mz = (s[1] + s[3]) / 2;
    if (
      pi === undefined &&
      s.length <= 4 &&
      (nearWater(mx, mz) || sunk(mx, mz, s[0], s[1], s[2], s[3]))
    ) {
      banks += Math.hypot(s[2] - s[0], s[3] - s[1]);
      return;
    }
    const what =
      pi !== undefined
        ? `建物輪廓 #${pi}`
        : s.length > 4
          ? `帶高度牆 #${si}（y ${(+s[4]).toFixed(1)}～${(+s[5]).toFixed(1)}）`
          : `獨立牆 #${si}`;
    runAlong(s[0], s[1], s[2], s[3], what);
  });
  if (X)
    X.walls.forEach((wl, wi) => {
      if (!(wl[4] < 1.6 && wl[5] > 0.35)) return; // 身體碰不到的高度
      runAlong(wl[0], wl[1], wl[2], wl[3], `室內／街屋牆 #${wi}（離地 ${wl[4]}～${wl[5]}）`);
    });
  inv.sort((a, b) => b.len - a.len);
  return {
    stats: {
      meshes: meshes.length,
      tris,
      wallTris: used,
      noCpu,
      unreach,
      reachCells: reach.reduce((a, v) => a + (v === 1), 0),
      fwdCells: fwd.reduce((a, c) => a + c.n, 0),
      invLen: Math.round(inv.reduce((a, c) => a + c.len, 0)),
      banks: Math.round(banks),
    },
    fwd,
    inv,
  };
}

// ---------------- 主程式 ----------------
function parseArgs(argv) {
  const o = { min: 8, props: false };
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    o[m[1]] = m[2] === undefined ? true : m[2];
  }
  o.min = +o.min || 8;
  return o;
}

async function attach(port) {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return CDP.connect(page.webSocketDebuggerUrl);
    } catch {}
    await sleep(200);
  }
  throw new Error(`連不上 127.0.0.1:${port} 的 Chrome`);
}

// 地點 → 是哪棟、哪個檔
function attributor(W) {
  const dist = (x, z, P) => {
    if (inPoly(x, z, P)) return 0;
    let best = Infinity;
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        b = P[(i + 1) % P.length],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
      best = Math.min(best, Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z));
    }
    return best;
  };
  return (pts) => {
    const hits = new Map();
    for (const [x, z] of pts) {
      let best = null,
        bd = 3;
      for (const b of W.blds) {
        const [x0, z0, x1, z1] = b.box;
        if (x < x0 - 3 || x > x1 + 3 || z < z0 - 3 || z > z1 + 3) continue;
        const d = dist(x, z, b.pts);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      if (best) hits.set(best, (hits.get(best) || 0) + 1);
    }
    const top = [...hits.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0].id}${top[0].name ? ` ${top[0].name}` : ''}（${top[0].file}）` : '';
  };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  let srv = null,
    chrome = null,
    port = o.cdp ? +o.cdp : 0,
    url = o.url;
  try {
    if (!url) {
      const dist = path.join(ROOT, 'dist');
      if (!fs.existsSync(path.join(dist, 'index.html')))
        throw new Error('找不到 dist/：先 npm run build，或用 --url 指定遊戲網址');
      const host = o['serve-host'] || '127.0.0.1';
      srv = await startServer({
        root: dist,
        port: 0,
        host: host === '127.0.0.1' ? host : '0.0.0.0',
      });
      url = `http://${host}:${new URL(srv.url).port}/`;
    }
    if (!port) {
      chrome = await launchChrome({
        chrome: o.chrome || defaultChromePath(),
        width: 960,
        height: 540,
      });
      port = chrome.port;
    }
    const page = await attach(port);
    const u = new URL(url);
    u.searchParams.set('keepgeo', '');
    // the fresh tab is about:blank, which has no localStorage: open the game's origin first, then set the settings
    await page.send('Page.navigate', { url: `${u.origin}/favicon.ico` });
    await sleep(500);
    await page.eval(
      `localStorage.setItem('cycu-shun-settings-v2', JSON.stringify({ quality: 'low', music: 'off' })); 1`
    );
    await page.send('Page.navigate', { url: u.toString().replace('keepgeo=', 'keepgeo') });
    const t0 = Date.now();
    for (;;) {
      await sleep(1000);
      const s = await page.eval(`window.game && window.game.state`).catch(() => null);
      if (s === 'title') break;
      if (Date.now() - t0 > 600e3) throw new Error('10 分鐘內沒有進到標題畫面');
    }
    console.error(`標題畫面：${((Date.now() - t0) / 1000).toFixed(0)} 秒，開始比對`);
    const res = await page.eval(
      `(${pageScan.toString()})(${JSON.stringify({ min: o.min, props: !!o.props, low: !!o.low })})`,
      {
        timeoutMs: 900e3,
      }
    );
    page.close();
    if (res.stats.noCpu > 100)
      console.error(
        `注意：${res.stats.noCpu} 個網格沒有 CPU 副本（遊戲版本沒有 ?keepgeo？），結果會不完整`
      );
    const W = await loadWorld();
    const who = attributor(W);
    for (const c of res.fwd) c.who = who(c.cells);
    for (const c of res.inv)
      c.who = who([c.a, c.b, [(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2]]);
    const poi = (x, z) => nearPoi(W.data, x, z, 40)?.name || '';
    const L = [];
    L.push(`# 外觀網格 vs 碰撞 比對報告`, '');
    L.push(
      `網格 ${res.stats.meshes} 個、三角形 ${res.stats.tris}，牆面三角形 ${res.stats.wallTris}；走得到的地 ${((res.stats.reachCells * 0.25) / 1e4).toFixed(1)} 公頃（走不到的 ${res.stats.unreach} 格不報）。`,
      `看得到卻穿得過：${res.fwd.length} 群（共 ${(res.stats.fwdCells * 0.0625).toFixed(0)} m²）；看不到卻被擋住：${res.inv.length} 段（共 ${res.stats.invLen} m）。`,
      ''
    );
    L.push(`## 1. 看得到卻穿得過（玩家中心站得到、身體會陷進牆）`, '');
    L.push(
      `| 格數 | 中心 (x, z) | 範圍 寬×深 | 附近地標 | 建物／檔案 | 網格 |`,
      `|---:|---|---|---|---|---|`
    );
    for (const c of res.fwd)
      L.push(
        `| ${c.n} | ${c.x}, ${c.z} | ${(c.box[2] - c.box[0] + 0.25).toFixed(1)}×${(c.box[3] - c.box[1] + 0.25).toFixed(1)} | ${poi(c.x, c.z)} | ${c.who} | ${c.meshes.join('；')} |`
      );
    L.push(
      '',
      `## 2. 看不到卻被擋住（碰撞線 0.75 m 內沒有任何網格）`,
      '',
      `埤塘、溪邊與排水溝兩岸的獨立牆（共 ${res.stats.banks} m）是刻意擋人走進水裡、掉進溝裡的，不列。`,
      ''
    );
    L.push(`| 長度 m | 從 | 到 | 種類 | 附近地標 | 建物／檔案 |`, `|---:|---|---|---|---|---|`);
    for (const c of res.inv)
      L.push(
        `| ${c.len} | ${c.a.join(', ')} | ${c.b.join(', ')} | ${c.what} | ${poi((c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2)} | ${c.who} |`
      );
    const md = `${L.join('\n')}\n`;
    if (o.out) fs.writeFileSync(o.out, md);
    else process.stdout.write(md);
    if (o.json) fs.writeFileSync(o.json, JSON.stringify(res));
    console.error(
      `完成：看得到卻穿得過 ${res.fwd.length} 群，看不到卻被擋住 ${res.inv.length} 段${o.out ? `，報告 ${o.out}` : ''}`
    );
  } finally {
    if (chrome) await chrome.kill();
    if (srv) await srv.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
