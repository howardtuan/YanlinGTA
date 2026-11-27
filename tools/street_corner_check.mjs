// 建物越界／路口轉角檢查（node tools/street_corner_check.mjs [--json out.json] [--min 0.3] [--all]）
//
// 照 src/core/Game.js 的順序重建遊戲裡實際會畫出來的建物：
//   data/cycu.json 的建物（OSM w…、填充樓 f…）扣掉各街區的 drop、套上 fix／add／look（look.open.bare＝hide 掉、不畫），
//   再加上各街區 footprints()（自建街屋、校內自建建物佔的地；新中北路、中山東路、弘揚路逐格換算到立面線，不含門前鋪面）。
// 道路用 data/cycu.json 的 roads（tools/roads.json 已經併進去）：車道寬 w（有 wv 就逐點）、人行道照 MapBuilder 的 walkOf。
// 輸出：
//   1. 侵入車道的建物：哪一棟、哪個檔、侵入幾公尺（離車道邊緣往中心線的深度）
//   2. 侵入人行道（沒碰到車道）的建物
//   3. 每個路口每個轉角：有沒有建物；空著的話，原始資料在那裡有沒有樓（被 drop／hide 掉了 → 多半是漏蓋）
// 只讀資料、不改任何檔案；tests/unit/street-encroach.test.js 用同一套函式把關。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 各街區（src/world/zones/Zones.js 的 name）對應的檔案，報告用
export const ZONE_FILE = {
  '中北路南側：茶學苑那排': 'src/world/buildings/StreetTea.js',
  大仁街: 'src/world/buildings/StreetDaren.js',
  中北路街屋: 'src/world/buildings/StreetZhongbei.js',
  戈登肉鋪: 'src/world/buildings/GordonShop.js',
  正門: 'src/world/buildings/GateExtras.js',
  維澈樓: 'src/world/zones/ZoneD.js',
  'E 區：建築館、祐生、設計學院、望樓、信樓、愛樓': 'src/world/zones/ZoneE.js',
  'G 區': 'src/world/zones/ZoneG.js',
  環中東路街屋: 'src/world/buildings/StreetHuanzhong.js',
  大仁一街街屋: 'src/world/buildings/StreetDaren1.js',
  普忠路街屋: 'src/world/buildings/StreetPuzhong.js',
  大仁五街街屋: 'src/world/buildings/StreetDaren5.js',
  實踐路街屋: 'src/world/buildings/StreetShijian.js',
  大仁二街街屋: 'src/world/buildings/StreetDaren2.js',
  新中北路街屋: 'src/world/buildings/StreetXinzhongbei.js',
  日新路街屋: 'src/world/buildings/StreetRixin.js',
  大仁街補建: 'src/world/buildings/StreetDarenFill.js',
  普仁市民活動中心: 'src/world/buildings/PurenCenter.js',
  夜市街廓補建: 'src/world/buildings/NightMarketFill.js',
};
// 新中北路系列的分段檔，順序要和 StreetXinzhongbei.js 的 SEGS 一樣（lot.seed = 6000 + 索引 * 1000 + j * 7）
export const XZ_SEGS = [
  'SegL1',
  'SegL2',
  'SegX1',
  'SegX2',
  'SegX3',
  'SegX4',
  'SegL3',
  'SegX5',
  'SegX6',
  'SegX7',
  'SegX8',
  'SegX0',
  'SegX9',
  'SegX10',
  'SegX11',
  'SegZ1',
  'SegZ2',
  'SegZ3',
  'SegZ4',
  'SegH1',
  'SegH2',
  'SegD3',
  'SegD4',
  'SegF1',
  'SegF2',
  'SegF3',
  'SegLB1',
  'SegLB2',
  'SegLB3',
  'SegQ1',
  'SegQ2',
];
// 會畫車道的道路種類（service 巷道、停車場通道另外列，footway 不算）
export const MAIN_TYPES = new Set([
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'unclassified',
  'living_street',
]);
const MARKED = { primary: 1, secondary: 1, tertiary: 1 }; // src/world/MapBuilder.js：這幾種預設兩側 2.5 m 人行道

// ---------------- 幾何 ----------------
export const centroid = (P) => {
  let x = 0,
    z = 0;
  for (const p of P) {
    x += p[0];
    z += p[1];
  }
  return [x / P.length, z / P.length];
};
export function inPoly(x, z, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i],
      [xj, zj] = P[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
// 點到線段：回傳 [距離, t]
const segDist = (x, z, a, b) => {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    L2 = dx * dx + dz * dz;
  let t = L2 ? ((x - a[0]) * dx + (z - a[1]) * dz) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return [Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z), t];
};
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const segsHit = (a, b, c, d) => {
  const d1 = cross(c, d, a),
    d2 = cross(c, d, b),
    d3 = cross(a, b, c),
    d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
};
// 多邊形到道路中心線段 a→b 的最近距離（中心線穿過多邊形就是 0）。
// capA／capB：false 時那一端是平頭（道路的端點，常常停在橫向道路的中心，不能用圓頭往外多算）
function polySegDist(P, a, b, capA, capB) {
  let best = Infinity;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 1e-6) return Infinity;
  const ux = (b[0] - a[0]) / L,
    uz = (b[1] - a[1]) / L;
  // 平頭：只看投影落在線段範圍內的部分 → 把多邊形裁到 [0, L] 的帶子裡
  const lo = capA ? -Infinity : 0,
    hi = capB ? Infinity : L;
  const along = (p) => (p[0] - a[0]) * ux + (p[1] - a[1]) * uz;
  let Q = P;
  if (!capA || !capB) {
    const clip = (poly, keep, inter) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i],
          q = poly[(i + 1) % poly.length],
          kp = keep(p),
          kq = keep(q);
        if (kp) out.push(p);
        if (kp !== kq) out.push(inter(p, q));
      }
      return out;
    };
    const cut = (s) => (p, q) => {
      const sp = along(p),
        sq = along(q),
        t = (s - sp) / (sq - sp);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    if (!capA) Q = clip(Q, (p) => along(p) >= lo, cut(lo));
    if (Q.length && !capB) Q = clip(Q, (p) => along(p) <= hi, cut(hi));
    if (Q.length < 3) return Infinity;
  }
  if (inPoly(a[0], a[1], Q) || inPoly(b[0], b[1], Q)) return 0;
  for (let i = 0; i < Q.length; i++) {
    const p = Q[i],
      q = Q[(i + 1) % Q.length];
    if (segsHit(p, q, a, b)) return 0;
    best = Math.min(best, segDist(p[0], p[1], a, b)[0]);
    if (capA || along(a) >= 0) best = Math.min(best, segDist(a[0], a[1], p, q)[0]);
    if (capB) best = Math.min(best, segDist(b[0], b[1], p, q)[0]);
  }
  return best;
}
const bbox = (P, m = 0) => {
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const [x, z] of P) {
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  }
  return [x0 - m, z0 - m, x1 + m, z1 + m];
};
const boxHit = (A, B) => A[0] <= B[2] && B[0] <= A[2] && A[1] <= B[3] && B[1] <= A[3];

// ---------------- 道路 ----------------
const walkOf = (r, nx, nz, sd) => {
  const W = r.marks && r.marks.walk,
    d = W
      ? Math.abs(nz) >= Math.abs(nx)
        ? nz * sd < 0
          ? W.n
          : W.s
        : nx * sd > 0
          ? W.e
          : W.w
      : null;
  return d != null ? d : MARKED[r.type] ? 2.5 : 0;
};
// 每一段車道：{ r, i, a, b, hw（車道半寬）, walk[左, 右]（人行道寬）, capA, capB, box }
export function roadSegments(data, { service = false } = {}) {
  const out = [];
  for (const r of data.roads) {
    if (!r.drive || r.bridge || r.tunnel || (r.layer || 0) > 0) continue;
    if (!MAIN_TYPES.has(r.type) && !(service && r.type === 'service')) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i],
        b = r.pts[i + 1],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l < 0.05) continue;
      const nx = -(b[1] - a[1]) / l,
        nz = (b[0] - a[0]) / l;
      const hw = (r.wv ? Math.min(r.wv[i], r.wv[i + 1]) : r.w || 4) / 2;
      const noWalk = (r.name || '').startsWith('中北路');
      out.push({
        r,
        i,
        a,
        b,
        hw,
        walk: noWalk ? [0, 0] : [walkOf(r, nx, nz, 1), walkOf(r, nx, nz, -1)],
        nx,
        nz,
        capA: i > 0,
        capB: i < r.pts.length - 2,
        box: bbox([a, b], hw + 4),
      });
    }
  }
  return out;
}

// footprints() 第 k 個多邊形是哪一格、建物深度多少（街區名 → k => { d, what, raw }）
async function trimRules() {
  const imp = async (f) => import(pathToFileURL(path.join(ROOT, 'src/world/buildings', f)).href);
  const [ZB, PZ, SJ, RX, D1, D2, D5, HZ] = await Promise.all(
    [
      'StreetZhongbei.js',
      'StreetPuzhong.js',
      'StreetShijian.js',
      'StreetRixin.js',
      'StreetDaren1.js',
      'StreetDaren2.js',
      'StreetDaren5.js',
      'StreetHuanzhong.js',
    ].map(imp)
  );
  const lbl = (L, si) => {
    const sp = L[si] || {},
      s = L.slice(0, si - 1).join(' ');
    const sign = sp.sign || sp.name || sp.own || '';
    return `${s}${sign ? ` ${String(sign).split('\n')[0]}` : ''}`;
  };
  // 圍牆在前、街屋在後（zb、pz、sj、rx）
  const fenced = (ST, si) => (k) => {
    const nf = (ST.fences || []).length;
    if (k < nf) return { d: 1.8, what: `圍牆 ${ST.fences[k].slice(0, si).join(' ')}` };
    const L = ST.lots[k - nf];
    return L && { d: (L[si] && L[si].d) || 10, what: lbl(L, si) };
  };
  const plain = (ST, si) => (k) => {
    const L = ST.lots[k];
    if (!L) return null;
    if (L[si] && (L[si].fp || L[si].fpw)) return { raw: true, what: lbl(L, si) };
    return { d: (L[si] && L[si].d) || 10, what: lbl(L, si) };
  };
  const d5b = D5.D5_ST.blocks.filter((B) => B.kind !== 'decal');
  return {
    中北路街屋: fenced(ZB.ZB_ST, 3),
    普忠路街屋: fenced(PZ.PZ_ST, 3),
    實踐路街屋: fenced(SJ.SJ_ST, 4),
    日新路街屋: fenced(RX.RX_ST, 4),
    大仁一街街屋: plain(D1.D1_ST, 3),
    大仁二街街屋: plain(D2.D2_ST, 3),
    環中東路街屋: plain(HZ.HZ_ST, 4),
    大仁五街街屋: (k) =>
      d5b[k] && { d: d5b[k].d + 0.2, what: `${d5b[k].s0}～${d5b[k].s1} ${d5b[k].side}` },
    大仁街補建: () => ({ d: 14 }),
  };
}

// ---------------- 建物（照 src/core/Game.js 的順序） ----------------
export async function loadWorld() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cycu.json'), 'utf8'));
  const Z = await import(pathToFileURL(path.join(ROOT, 'src/world/zones/Zones.js')).href);
  const XZ = await import(
    pathToFileURL(path.join(ROOT, 'src/world/buildings/StreetXinzhongbei.js')).href
  );
  const raw = data.buildings.map((b) => ({ ...b, pts: b.pts.map((p) => [...p]) }));
  const DROP = new Set(Z.zoneDrops());
  const dropWho = new Map();
  for (const z of Z.ZONES) for (const id of z.drop || []) dropWho.set(id, z.name);
  data.buildings = data.buildings.filter((b) => !DROP.has(b.id));
  Z.zonesFix(data.buildings);
  Z.zonesAdd(data.buildings);
  const hidden = new Set();
  const hideWho = new Map();
  for (const b of data.buildings) {
    for (const z of Z.ZONES) {
      const before = b.look && b.look.open && b.look.open.bare;
      z.look?.(b);
      if (!before && b.look && b.look.open && b.look.open.bare) hideWho.set(b.id, z.name);
    }
    if (b.look && b.look.open && b.look.open.bare) hidden.add(b.id);
  }
  const blds = [];
  for (const b of data.buildings) {
    if (hidden.has(b.id) || b.pts.length < 3) continue;
    blds.push({
      kind: b.synthetic ? 'fill' : 'osm',
      id: b.id,
      name: b.name || '',
      file: b.synthetic ? 'data/cycu.json（填充樓）' : 'data/cycu.json（OSM）',
      pts: b.pts,
    });
  }
  // 自建建物：各街區的 footprints()。街屋檔的每一格是 [p(-0.1,-apron), p(w+0.1,-apron), p(w+0.1,d), p(-0.1,d)]：
  // 前緣是門前鋪面（apron，鋪到路緣、不是房子），所以用「後緣往前 d 公尺」換算回立面線；新中北路系列直接逐格算
  const trim = await trimRules();
  for (const z of Z.ZONES) {
    if (!z.footprints || z.name === '新中北路街屋') continue;
    const fp = z.footprints(data) || [];
    const T = trim[z.name];
    fp.forEach((pts0, k) => {
      if (!pts0 || pts0.length < 3) return;
      let pts = pts0,
        what = '';
      if (T) {
        const r = T(k);
        if (r && pts0.length === 4 && !r.raw) {
          const [, , p2, p3] = pts0,
            p0 = pts0[0],
            L = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]),
            ux = (p3[0] - p0[0]) / L,
            uz = (p3[1] - p0[1]) / L,
            d = Math.min(r.d, L);
          pts = [[p3[0] - ux * d, p3[1] - uz * d], [p2[0] - ux * d, p2[1] - uz * d], p2, p3];
        }
        what = r ? r.what || '' : '';
      }
      blds.push({
        kind: 'zone',
        id: `${z.name}#${k}`,
        name: what,
        file: ZONE_FILE[z.name] || `Zones.js：${z.name}`,
        zone: z.name,
        trimmed: !!T,
        pts,
      });
    });
  }
  for (const L of XZ.XZ_ST.lots) {
    const [ref, s0, s1, side, sp = {}] = L;
    const si = Math.floor((L.seed - 6000) / 1000);
    const { ox, oz, ang, w } = XZ.xzLotFrame(L),
      c = Math.cos(ang),
      s = Math.sin(ang),
      p = (x, zz) => [ox + x * c - zz * s, oz + x * s + zz * c],
      d = sp.d || 10;
    blds.push({
      kind: 'zone',
      id: `${ref} s${s0}～${s1} ${side > 0 ? '+1' : '-1'}`,
      name: sp.sign ? String(sp.sign).split('\n')[0] : '',
      file: `src/world/buildings/xzb/${XZ_SEGS[si]}.js`,
      zone: '新中北路街屋',
      pts: [p(0, 0), p(w, 0), p(w, d), p(0, d)],
    });
  }
  for (const name of XZ_SEGS) {
    const S = (
      await import(pathToFileURL(path.join(ROOT, `src/world/buildings/xzb/${name}.js`)).href)
    ).default;
    if (!S || !S.footprints) continue;
    // custom 的 F(…, front) 往街道多留的 front 是門前鋪面、騎樓、前埕的保留範圍，不是房子：這裡一律從立面線算起
    const quad = (ref, s0, s1, side, set, d) => {
      const { ox, oz, ang, w } = XZ.xzLotFrame([ref, s0, s1, side, { set }]),
        c = Math.cos(ang),
        s = Math.sin(ang),
        p = (x, zz) => [ox + x * c - zz * s, oz + x * s + zz * c];
      return [p(-0.1, 0), p(w + 0.1, 0), p(w + 0.1, d), p(-0.1, d)];
    };
    S.footprints(quad).forEach((pts, k) =>
      blds.push({
        kind: 'zone',
        id: `${name} custom#${k}`,
        name: '',
        file: `src/world/buildings/xzb/${name}.js`,
        zone: '新中北路街屋',
        pts,
      })
    );
  }
  for (const b of blds) b.box = bbox(b.pts);
  const removed = raw
    .filter((b) => DROP.has(b.id) || hidden.has(b.id))
    .map((b) => ({
      id: b.id,
      kind: b.synthetic ? 'fill' : 'osm',
      how: DROP.has(b.id) ? 'drop' : 'hide',
      by: DROP.has(b.id) ? dropWho.get(b.id) : hideWho.get(b.id),
      name: b.name || '',
      pts: b.pts,
      box: bbox(b.pts),
    }));
  return { data, blds, removed, raw };
}

// 最近的 POI 名稱（報告用，方便在地圖上找）
export function nearPoi(data, x, z, r = 25) {
  let best = null,
    bd = r;
  for (const p of data.pois) {
    if (!p.name) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      best = p.name;
    }
  }
  return best;
}

// ---------------- 1. 越界 ----------------
// 每棟建物對每條路：侵入車道的深度 = 車道半寬 − 建物到中心線的距離；人行道同理（半寬＋人行道寬）
export function encroachments(world, { service = false } = {}) {
  const segs = roadSegments(world.data, { service });
  const hits = [];
  for (const B of world.blds) {
    const byRoad = new Map();
    for (const g of segs) {
      if (!boxHit(B.box, g.box)) continue;
      const d = polySegDist(B.pts, g.a, g.b, g.capA, g.capB);
      if (!Number.isFinite(d)) continue;
      // 建物在中心線的哪一側（人行道左右寬度不同）
      const c = centroid(B.pts),
        sd = (c[0] - g.a[0]) * g.nx + (c[1] - g.a[1]) * g.nz >= 0 ? 0 : 1;
      const road = g.hw - d,
        walk = g.hw + g.walk[sd] + 0.1 - d;
      if (walk <= 0 && road <= 0) continue;
      const key = g.r.name || `${g.r.type}@${g.r.nodes?.[0]}`;
      const o = byRoad.get(key) || { road: -Infinity, walk: -Infinity, r: g.r, at: null };
      if (road > o.road) {
        o.road = road;
        o.at = segDist(c[0], c[1], g.a, g.b);
      }
      o.walk = Math.max(o.walk, walk);
      byRoad.set(key, o);
    }
    for (const [key, o] of byRoad)
      hits.push({
        b: B,
        road: key,
        type: o.r.type,
        w: o.r.w,
        intoRoad: Math.max(0, +o.road.toFixed(2)),
        intoWalk: Math.max(0, +o.walk.toFixed(2)),
      });
  }
  return hits.sort((p, q) => q.intoRoad - p.intoRoad || q.intoWalk - p.intoWalk);
}

// ---------------- 2. 路口轉角 ----------------
// 路口：兩條以上主要道路共用的節點。每兩條相鄰的路臂中間是一個轉角（夾角大於 150° 的是直路的一側，不算轉角）。
// 轉角探測區：兩條路的人行道外緣交點，沿角平分線往內 2～14 m 的扇形範圍取樣
export function corners(world) {
  const { data } = world;
  const roads = data.roads.filter(
    (r) => r.drive && MAIN_TYPES.has(r.type) && !r.bridge && !r.tunnel && r.nodes
  );
  const at = new Map();
  for (const r of roads)
    r.nodes.forEach((n, i) => {
      if (!at.has(n)) at.set(n, []);
      at.get(n).push([r, i]);
    });
  const B = data.bounds;
  const out = [];
  for (const [node, uses] of at) {
    const arms = [];
    for (const [r, i] of uses) {
      const p = r.pts[i];
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= r.pts.length) continue;
        // 往外走到 8 m 以上的點，避免短短一小段的方向不準
        let k = j;
        while (
          k > 0 &&
          k < r.pts.length - 1 &&
          Math.hypot(r.pts[k][0] - p[0], r.pts[k][1] - p[1]) < 8
        )
          k += j - i;
        const q = r.pts[k],
          L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (L < 0.5) continue;
        const nx = -(q[1] - p[1]) / L,
          nz = (q[0] - p[0]) / L;
        arms.push({
          r,
          ang: Math.atan2(q[1] - p[1], q[0] - p[0]),
          ux: (q[0] - p[0]) / L,
          uz: (q[1] - p[1]) / L,
          hw: (r.wv ? r.wv[i] : r.w || 4) / 2,
          // 臂的左邊（逆時針那側）人行道寬
          wl: (r.name || '').startsWith('中北路') ? 0 : walkOf(r, nx, nz, 1),
          wr: (r.name || '').startsWith('中北路') ? 0 : walkOf(r, nx, nz, -1),
        });
      }
    }
    const names = new Set(arms.map((a) => a.r.name || a.r.type));
    if (arms.length < 3 || names.size < 2) continue;
    const p = uses[0][0].pts[uses[0][1]];
    if (p[0] < B.minX + 20 || p[0] > B.maxX - 20 || p[1] < B.minZ + 20 || p[1] > B.maxZ - 20)
      continue;
    arms.sort((a, b) => a.ang - b.ang);
    for (let k = 0; k < arms.length; k++) {
      const A = arms[k],
        C = arms[(k + 1) % arms.length];
      let gap = C.ang - A.ang;
      if (gap <= 0) gap += Math.PI * 2;
      if (gap > (150 * Math.PI) / 180 || gap < (20 * Math.PI) / 180) continue;
      // 角平分線方向
      const mid = A.ang + gap / 2,
        bx = Math.cos(mid),
        bz = Math.sin(mid);
      // A 臂的左側（往 C 那邊）是 +法線；C 臂的右側
      const offA = A.hw + A.wl + 0.3,
        offC = C.hw + C.wr + 0.3;
      // 轉角點：離 A 中心線 offA、離 C 中心線 offC 的交點
      const s = Math.sin(gap);
      const t = (offC + offA * Math.cos(gap)) / s; // 沿 A 方向的距離
      const cx = p[0] + A.ux * t - A.uz * offA,
        cz = p[1] + A.uz * t + A.ux * offA;
      // 取樣點：沿角平分線往內 3、6、10 m，各往兩邊散開
      const samples = [];
      for (const dd of [3, 6, 10])
        for (const lat of [-3, 0, 3])
          samples.push([cx + bx * dd - bz * lat, cz + bz * dd + bx * lat]);
      const probe = bbox(samples, 0.5);
      const covers = (b) => boxHit(b.box, probe) && samples.some(([x, z]) => inPoly(x, z, b.pts));
      const present = world.blds.filter(covers);
      const gone = present.length ? [] : world.removed.filter(covers);
      const origHas = present.length
        ? true
        : world.raw.some(
            (b) => boxHit(bbox(b.pts), probe) && samples.some(([x, z]) => inPoly(x, z, b.pts))
          );
      out.push({
        node,
        x: +p[0].toFixed(1),
        z: +p[1].toFixed(1),
        roads: [A.r.name || A.r.type, C.r.name || C.r.type],
        corner: [+cx.toFixed(1), +cz.toFixed(1)],
        dir: Math.round((((Math.atan2(bx, -bz) * 180) / Math.PI + 360) % 360) / 45) % 8,
        present: present.map((b) => `${b.file.replace(/^src\/world\/buildings\//, '')} ${b.id}`),
        gone: gone.map((g) => `${g.id}（${g.how}：${g.by || '?'}）`),
        origHas,
      });
    }
  }
  return out;
}
const DIR = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];

// ---------------- 3. 兩個檔案都蓋（重疊） ----------------
// 不同檔案的建物重疊面積（0.5 m 格點估算），只算有自建建物參與的（OSM 跟填充樓之間的重疊是原始資料的事）
export function overlaps(world, { minArea = 4 } = {}) {
  // 只看街屋檔（校內、夜市的 footprints 本來就是拿來取代同一棟資料建物的）
  const street = (b) => b.kind === 'zone' && (b.trimmed || b.zone === '新中北路街屋');
  const Z = world.blds.filter(street);
  const out = [];
  for (let i = 0; i < Z.length; i++) {
    const A = Z[i];
    for (const B of world.blds) {
      if (B === A || B.file === A.file || !boxHit(A.box, B.box)) continue;
      if (B.kind === 'zone' && !street(B)) continue;
      if (street(B) && world.blds.indexOf(B) < world.blds.indexOf(A)) continue;
      const x0 = Math.max(A.box[0], B.box[0]),
        z0 = Math.max(A.box[1], B.box[1]),
        x1 = Math.min(A.box[2], B.box[2]),
        z1 = Math.min(A.box[3], B.box[3]);
      let n = 0;
      for (let x = x0 + 0.25; x < x1; x += 0.5)
        for (let z = z0 + 0.25; z < z1; z += 0.5)
          if (inPoly(x, z, A.pts) && inPoly(x, z, B.pts)) n++;
      const a = n * 0.25;
      if (a >= minArea) out.push({ a: +a.toFixed(1), A, B });
    }
  }
  return out.sort((p, q) => q.a - p.a);
}

// ---------------- 4. 街面空缺（兩邊都沒蓋） ----------------
// 沿每條有名字的主要道路兩側、人行道外緣往內 1.5／4／7 m 每 1 m 取樣；三個點都沒有建物就算空。
// 落在別條路的車道或人行道上的點不算（路口本身）。連續空 ≥ minRun 公尺、而且離路口 ≤ near 公尺的列出來，
// 同時看原始資料在那裡有沒有樓（有 → 被 drop／hide 了卻沒人補，就是漏蓋）
export function frontGaps(world, { minRun = 4, near = 30 } = {}) {
  const segs = roadSegments(world.data);
  const named = segs.filter((g) => g.r.name);
  const onRoad = (x, z, self) =>
    segs.some((g) => {
      if (g.r === self || x < g.box[0] || x > g.box[2] || z < g.box[1] || z > g.box[3])
        return false;
      const [d] = segDist(x, z, g.a, g.b);
      return d < g.hw + Math.max(g.walk[0], g.walk[1]) + 0.3;
    });
  const nodes = [];
  {
    const use = new Map();
    for (const r of world.data.roads)
      if (r.drive && MAIN_TYPES.has(r.type) && r.nodes)
        r.nodes.forEach((n, i) => {
          if (!use.has(n)) use.set(n, { p: r.pts[i], names: new Set(), k: 0 });
          const u = use.get(n);
          u.names.add(r.name || r.type);
          u.k += i === 0 || i === r.pts.length - 1 ? 1 : 2;
        });
    for (const u of use.values()) if (u.k >= 3 && u.names.size >= 2) nodes.push(u);
  }
  const B = world.data.bounds;
  const covered = (x, z, list) =>
    list.some(
      (b) => x >= b.box[0] && x <= b.box[2] && z >= b.box[1] && z <= b.box[3] && inPoly(x, z, b.pts)
    );
  const out = [];
  for (const g of named) {
    const L = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]),
      ux = (g.b[0] - g.a[0]) / L,
      uz = (g.b[1] - g.a[1]) / L;
    for (const sd of [1, -1]) {
      const base = g.hw + g.walk[sd > 0 ? 0 : 1] + 0.1;
      const near0 = bbox([g.a, g.b], base + 10);
      const list = world.blds.filter((b) => boxHit(b.box, near0));
      const gone = world.removed.filter((b) => boxHit(b.box, near0));
      let run = null;
      const flush = () => {
        if (run && run.len >= minRun) out.push(run);
        run = null;
      };
      for (let t = 0.5; t < L; t += 1) {
        const P = [1.5, 4, 7].map((o) => [
          g.a[0] + ux * t + g.nx * sd * (base + o),
          g.a[1] + uz * t + g.nz * sd * (base + o),
        ]);
        const [mx, mz] = P[1];
        if (mx < B.minX + 15 || mx > B.maxX - 15 || mz < B.minZ + 15 || mz > B.maxZ - 15) {
          flush();
          continue;
        }
        const nd = nodes.reduce(
          (m, u) => Math.min(m, Math.hypot(u.p[0] - mx, u.p[1] - mz)),
          Infinity
        );
        const pts = P.filter(([x, z]) => !onRoad(x, z, g.r));
        if (nd > near || !pts.length || pts.some(([x, z]) => covered(x, z, list))) {
          flush();
          continue;
        }
        const was = gone
          .filter((b) => pts.some(([x, z]) => inPoly(x, z, b.pts)))
          .map((b) => `${b.id}（${b.how}：${b.by || '?'}）`);
        if (!run)
          run = { road: g.r.name, side: sd, a: [mx, mz], b: [mx, mz], len: 0, nd, gone: new Set() };
        run.b = [mx, mz];
        run.len += 1;
        run.nd = Math.min(run.nd, nd);
        for (const w of was) run.gone.add(w);
      }
      flush();
    }
  }
  return out
    .map((r) => ({ ...r, gone: [...r.gone] }))
    .sort((p, q) => q.gone.length - p.gone.length || q.len - p.len);
}

// ---------------- CLI ----------------
async function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : d;
  };
  const min = +opt('--min', 0.3);
  const world = await loadWorld();
  const enc = encroachments(world, { service: args.includes('--service') });
  const cor = corners(world);
  const ll = (x, z) => `${(24.958 - z / 110574).toFixed(6)},${(121.2425 + x / 100917).toFixed(6)}`;
  const lines = [];
  lines.push(`# 建物越界／路口轉角檢查（${new Date().toISOString().slice(0, 10)}）`, '');
  lines.push(
    `建物 ${world.blds.length} 棟（含自建佔地），被 drop／hide 的原始建物 ${world.removed.length} 棟`,
    ''
  );
  lines.push('## 1. 侵入車道（公尺，離車道邊緣往中心線的深度）', '');
  lines.push(
    '| 深度 | 人行道 | 路 | 檔案 | 建物 | 位置 x,z | 緯經度 | 附近 |',
    '|---|---|---|---|---|---|---|---|'
  );
  for (const h of enc.filter((h) => h.intoRoad >= min)) {
    const c = centroid(h.b.pts);
    lines.push(
      `| ${h.intoRoad} | ${h.intoWalk} | ${h.road} | ${h.b.file} | ${h.b.id} ${h.b.name} | ${c[0].toFixed(1)},${c[1].toFixed(1)} | ${ll(...c)} | ${nearPoi(world.data, ...c) || ''} |`
    );
  }
  lines.push('', '## 2. 只侵入人行道（沒碰到車道）', '');
  lines.push('| 人行道 | 路 | 檔案 | 建物 | 位置 x,z | 附近 |', '|---|---|---|---|---|---|');
  for (const h of enc
    .filter((h) => h.intoRoad < min && h.intoWalk >= Math.max(min, 0.5))
    .sort((p, q) => q.intoWalk - p.intoWalk)) {
    const c = centroid(h.b.pts);
    lines.push(
      `| ${h.intoWalk} | ${h.road} | ${h.b.file} | ${h.b.id} ${h.b.name} | ${c[0].toFixed(1)},${c[1].toFixed(1)} | ${nearPoi(world.data, ...c) || ''} |`
    );
  }
  const empty = cor.filter((c) => !c.present.length);
  lines.push('', `## 3. 路口轉角（共 ${cor.length} 個，空著 ${empty.length} 個）`, '');
  lines.push('### 空著、原始資料有樓但被 drop／hide 掉（多半是漏蓋）', '');
  for (const c of empty.filter((c) => c.gone.length))
    lines.push(
      `- ${c.roads.join(' × ')} 路口 (${c.x},${c.z}) ${DIR[c.dir]}角 轉角點 ${c.corner.join(',')}（${ll(...c.corner)}）：${c.gone.join('、')}`
    );
  lines.push('', '### 空著、原始資料也沒樓（看正射確認是不是本來就空地）', '');
  for (const c of empty.filter((c) => !c.gone.length))
    lines.push(
      `- ${c.roads.join(' × ')} 路口 (${c.x},${c.z}) ${DIR[c.dir]}角 轉角點 ${c.corner.join(',')}（${ll(...c.corner)}）`
    );
  const ov = overlaps(world);
  lines.push('', `## 4. 兩個檔案都蓋（重疊 ≥ 4 m²，共 ${ov.length} 處）`, '');
  lines.push(
    '| 面積 m² | 檔案 A | 建物 A | 檔案 B | 建物 B | 位置 x,z | 附近 |',
    '|---|---|---|---|---|---|---|'
  );
  for (const o of ov) {
    const c = centroid(o.A.pts);
    lines.push(
      `| ${o.a} | ${o.A.file} | ${o.A.id} ${o.A.name} | ${o.B.file} | ${o.B.id} ${o.B.name} | ${c[0].toFixed(1)},${c[1].toFixed(1)} | ${nearPoi(world.data, ...c) || ''} |`
    );
  }
  const fg = frontGaps(world);
  lines.push(
    '',
    `## 5. 路口附近的街面空缺（離路口 30 m 內、連續 ≥ 4 m 沒有建物，共 ${fg.length} 段）`,
    ''
  );
  lines.push(
    '| 長 m | 路 | 側 | 起 x,z | 迄 x,z | 緯經度（中點） | 離路口 m | 原始資料被拿掉的樓 |',
    '|---|---|---|---|---|---|---|---|'
  );
  for (const g of fg) {
    const m = [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2];
    lines.push(
      `| ${g.len} | ${g.road} | ${g.side > 0 ? '右' : '左'} | ${g.a.map((v) => v.toFixed(1)).join(',')} | ${g.b.map((v) => v.toFixed(1)).join(',')} | ${ll(...m)} | ${g.nd.toFixed(0)} | ${g.gone.join('、')} |`
    );
  }
  if (args.includes('--all')) {
    lines.push('', '### 有建物的轉角', '');
    for (const c of cor.filter((c) => c.present.length))
      lines.push(
        `- ${c.roads.join(' × ')} (${c.x},${c.z}) ${DIR[c.dir]}角：${c.present.join('、')}`
      );
  }
  const out = opt('--out');
  if (out) fs.writeFileSync(out, `${lines.join('\n')}\n`);
  else console.log(lines.join('\n'));
  const js = opt('--json');
  if (js)
    fs.writeFileSync(
      js,
      JSON.stringify(
        {
          enc: enc.map((h) => ({
            ...h,
            b: { id: h.b.id, file: h.b.file, name: h.b.name, pts: h.b.pts },
          })),
          corners: cor,
        },
        null,
        1
      )
    );
  console.error(
    `車道越界 ≥${min} m：${enc.filter((h) => h.intoRoad >= min).length} 筆；空轉角 ${empty.length}／${cor.length}（被拿掉的 ${empty.filter((c) => c.gone.length).length}）`
  );
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  await main();
