// 中原大學體育園區的操場（實英運動場）：400 m 藍色 PU 跑道、劃線、內場足球場線，和四座看台。
// 依據：
//  - 國土測繪中心 2024 正射（NLSC PHOTO2 z20）：跑道是藍色 PU、8 道，兩端半圓區也是藍色（田賽區），中間一塊長方形草地；
//    疊標準 400 m 跑道（彎道半徑 36.5 m、直道 84.39 m、道寬 1.22 m）量出中心 (108.5, -364)、長軸偏北往東 12.3°，
//    內外緣與正射吻合到 0.5 m 內。西側直道往北延伸成 100 m 直道（西北角那塊方形藍地），終點線在西側直道南端；
//    東側直道外一條約 5 m 寬的藍色助跑道，南段有沙坑（跳遠）。草地約 103 × 70 m，足球場線照 100 × 64 m 畫在草地中間。
//  - 看台（正射量位置與長度，高度、階數照 Google 街景 2017 與地圖相片 2023）：
//    東側：露天的紅色階梯看台，沿東側直道約 90 m，中間後方是藍色的聖火台。
//    西側由北到南：北側小看台（約 32 m）、五跨懸臂頂棚的主看台（司令台，約 32 m）、南側小看台（約 36 m）；
//    兩座小看台是 2023 相片裡的橘色座椅、藍色走道、灰色側牆、紅褐色鋼頂棚；主看台是混凝土五跨頂棚，前面是司令台。
//    主看台和北側小看台之間有一座掛「中原大學」藍色招牌的塔。
//  - 跑道、草地和線畫在 src/world/MapBuilder.js 的 areas 圖層（paintStadium），看台、球門、塔、聖火台在這裡蓋（buildStadium）。
//    看台每一階都有 addSurface（玩家走得上去，一階 0.4 m 左右），側牆和後牆有碰撞，座位區按 E 坐下。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H } from './Terrain.js';
import { canvasTexture } from '../graphics/GpuMemLifecycle.js';

// ---------------- 座標：u 沿長軸（往南 +），v 橫向（往東 +），原點在跑道中心 ----------------
const C0 = [108.5, -364],
  ANG = (12.3 * Math.PI) / 180,
  UX = Math.sin(ANG),
  UZ = Math.cos(ANG);
export const stadiumP = (u, v) => [C0[0] + u * UX + v * UZ, C0[1] + u * UZ - v * UX];
const toLocal = (x, z) => {
  const dx = x - C0[0],
    dz = z - C0[1];
  return [dx * UX + dz * UZ, dx * UZ - dz * UX];
};

// 跑道：彎道內緣半徑、半直道長、道寬、道數
export const TRACK = { R: 36.5, HL: 84.39 / 2, LW: 1.22, N: 8 };
const ROUT = TRACK.R + TRACK.N * TRACK.LW + 0.3; // 外緣（第 8 道外再 0.3 m 收邊）
const EXT_N = -61, // 西側直道往北延伸（100 m 起跑在 -57.8）
  EXT_S = 55; // 終點後的緩衝區
const GRASS = { u0: -52.3, u1: 50.3, hv: 34.8 }; // 草地（兩端角落剛好碰到彎道內緣）
const FB = { u: -1, hl: 50, hw: 32 }; // 足球場：中心、半長、半寬
const JUMP = {
  u0: -46,
  u1: 38,
  v0: ROUT - 0.3,
  v1: 51.6,
  pit: [28.5, 36, 47.6, 50.6],
  board: 25.5,
};

const OSM_TRACK = [69, -445], // OSM 跑道外框（中原大學體育園區）的一個頂點
  OSM_PITCH = [66.2, -415.6]; // OSM 內場草地的一個頂點
const near = (a, q) => a.pts.some(([x, z]) => Math.hypot(x - q[0], z - q[1]) < 0.5);
export const isStadiumTrack = (a) => a.kind === 'track' && near(a, OSM_TRACK);
export const isStadiumPitch = (a) => a.kind === 'pitch' && near(a, OSM_PITCH);

// 跑道形（內緣往外 r）：南彎道由西往東，北彎道由東往西
function oval(r, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (Math.PI * i) / n;
    out.push(stadiumP(TRACK.HL + r * Math.sin(t), -r * Math.cos(t)));
  }
  for (let i = 0; i <= n; i++) {
    const t = (Math.PI * i) / n;
    out.push(stadiumP(-TRACK.HL - r * Math.sin(t), r * Math.cos(t)));
  }
  return out;
}
const rect = (u0, u1, v0, v1) => [
  stadiumP(u0, v0),
  stadiumP(u1, v0),
  stadiumP(u1, v1),
  stadiumP(u0, v1),
];

// ---------------- 地面：藍色跑道、草地、白線（src/world/MapBuilder.js 的 areas 圖層） ----------------
// geos: { blue（藍色 PU 貼圖）, grass（草地貼圖）, lines（頂點色） }，col: '#hex' -> 線性 rgb
export function paintStadium(geos, col) {
  const { blue, grass, lines } = geos;
  const T = col('#ffffff'),
    WHITE = col('#eef0ee'),
    SAND = col('#c9b28a');
  const G = rect(GRASS.u0, GRASS.u1, -GRASS.hv, GRASS.hv);
  // 跑道＋兩端田賽區（草地挖空）、延伸直道、東側助跑道
  blue.flatPoly(oval(ROUT), 0.025, T, [G.slice().reverse()]);
  blue.flatPoly(rect(EXT_N, -TRACK.HL + 1, -ROUT, -TRACK.R + 0.5), 0.025, T);
  blue.flatPoly(rect(TRACK.HL - 1, EXT_S, -ROUT, -TRACK.R + 0.5), 0.025, T);
  blue.flatPoly(rect(JUMP.u0, JUMP.u1, JUMP.v0, JUMP.v1), 0.025, T);
  grass.flatPoly(G, 0.02, col('#e0ffd8'));

  const Y = 0.03;
  // 長線切成 3 m 一段：一條長條貼地時只在兩端取地形高，中間會沉到地形底下（看起來變虛線）
  const seg = (a, b, w = 0.1, c = WHITE) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let i = 0; i < n; i++) {
      const p = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      lines.strip(p(i / n), p((i + 1) / n), w, Y, c);
    }
  };
  const L = (u0, v0, u1, v1, w) => seg(stadiumP(u0, v0), stadiumP(u1, v1), w);
  const { R, HL, LW, N } = TRACK;
  // 分道線（k = 0 是內緣線）：沿跑道一圈，西側直道再往北、往南延伸
  for (let k = 0; k <= N; k++) {
    const ring = oval(R + k * LW, 48);
    for (let i = 0; i < ring.length; i++) seg(ring[i], ring[(i + 1) % ring.length]);
    L(EXT_N, -(R + k * LW), -HL, -(R + k * LW));
    L(HL, -(R + k * LW), EXT_S, -(R + k * LW));
  }
  // 終點線（西側直道南端）、100 m 起跑線
  const vIn = -R,
    vOut = -(R + N * LW);
  L(HL, vIn, HL, vOut, 0.1);
  L(HL - 100, vIn, HL - 100, vOut, 0.08);
  // 彎道前伸的起跑錯位：第 k 道的跑線（離內側分道線 0.2 m，第 1 道離內緣 0.3 m）比第 1 道多跑的距離，往前移到彎道上
  const r1 = R + 0.3,
    rk = (k) => (k === 1 ? r1 : R + (k - 1) * LW + 0.2);
  // south: 南彎道（終點後，400 m／800 m 起跑），north: 北彎道（200 m 起跑）；phi 從彎道起點量
  const radial = (south, k, dist) => {
    const phi = dist / rk(k),
      s = Math.sin(phi),
      c = Math.cos(phi);
    const q = (r) => (south ? stadiumP(HL + r * s, -r * c) : stadiumP(-HL - r * s, r * c));
    seg(q(R + (k - 1) * LW), q(R + k * LW), 0.08);
  };
  for (let k = 2; k <= N; k++) {
    radial(true, k, 2 * Math.PI * (rk(k) - r1)); // 400 m
    radial(true, k, Math.PI * (rk(k) - r1)); // 800 m（跑完第一個彎道後切入）
    radial(false, k, Math.PI * (rk(k) - r1)); // 200 m
  }
  L(-HL, R, -HL, R + N * LW, 0.08); // 200 m 第 1 道起跑（東側直道北端）
  // 800 m 切入線：東側直道南端（跑完南彎道）的一條弧線，畫成跨過各道的直線
  L(HL, R, HL, R + N * LW, 0.05);

  // 東側助跑道：兩條助跑道的邊線、起跳板、沙坑
  const [p0, p1, q0, q1] = JUMP.pit;
  for (const v of [JUMP.v0 + 0.3, (JUMP.v0 + JUMP.v1) / 2, JUMP.v1 - 0.1])
    L(JUMP.u0, v, p0, v, 0.05);
  L(JUMP.board, JUMP.v0 + 0.3, JUMP.board, JUMP.v1 - 0.1, 0.2);
  lines.flatPoly(rect(p0, p1, q0, q1), Y, SAND);

  // ---------------- 足球場 ----------------
  const W = 0.12,
    u0 = FB.u - FB.hl,
    u1 = FB.u + FB.hl,
    hw = FB.hw;
  const arc = (cu, cv, r, a0, a1, n) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n,
        b = a0 + ((a1 - a0) * (i + 1)) / n;
      L(cu + Math.cos(a) * r, cv + Math.sin(a) * r, cu + Math.cos(b) * r, cv + Math.sin(b) * r, W);
    }
  };
  L(u0, -hw, u1, -hw, W);
  L(u0, hw, u1, hw, W);
  L(u0, -hw, u0, hw, W);
  L(u1, -hw, u1, hw, W);
  L(FB.u, -hw, FB.u, hw, W); // 中線
  arc(FB.u, 0, 9.15, 0, Math.PI * 2, 32); // 中圈
  lines.disc(...stadiumP(FB.u, 0), 0.15, Y, WHITE, 10);
  for (const s of [-1, 1]) {
    const g = s < 0 ? u0 : u1; // 球門線
    // 罰球區 16.5 × 40.32、球門區 5.5 × 18.32、罰球點 11 m、罰球弧（罰球區外那段）、角球弧
    for (const [d, h] of [
      [16.5, 20.16],
      [5.5, 9.16],
    ]) {
      L(g, -h, g - s * d, -h, W);
      L(g - s * d, -h, g - s * d, h, W);
      L(g - s * d, h, g, h, W);
    }
    const pu = g - s * 11;
    lines.disc(...stadiumP(pu, 0), 0.12, Y, WHITE, 10);
    const t = Math.acos(5.5 / 9.15);
    if (s > 0) arc(pu, 0, 9.15, Math.PI - t, Math.PI + t, 12);
    else arc(pu, 0, 9.15, -t, t, 12);
    for (const v of [-hw, hw]) {
      const mid = Math.atan2(-Math.sign(v), -s); // 角球弧朝場內
      arc(g, v, 1, mid - Math.PI / 4, mid + Math.PI / 4, 4);
    }
  }
}

// ---------------- 看台 ----------------
// steps: 從前緣往後的一階一階 [深度, 頂高（離地，看台基準高）, 種類]；種類 'seat' 是座位排（可坐、畫座椅），'step' 是地板／走道
// aisles: 走道（沿 u 的範圍）在每一排切成兩個半階
const COL = {
  conc: '#a9a59d',
  paint: '#a9463f', // 東看台：整片漆成紅色（2024 正射）；立面深一點
  paintTop: '#cf675c', // 踏面
  seat: '#df5f2c', // 橘色座椅（2023 相片）
  aisle: '#2f62b0', // 藍色走道
  roofTop: '#575a5e',
  roofUnder: '#8a3d2c', // 紅褐色鋼頂棚
  mainRoof: '#9e9a91', // 主看台混凝土頂棚
  rail: '#7b8086',
};
const rows = (front, n, d, r, back, y0) => {
  const out = [...front];
  let y = out.length ? out[out.length - 1][1] : y0;
  for (let k = 0; k < n; k++) out.push([d, (y += r), 'seat']);
  out.push([back, y, 'step']);
  return out;
};
const STANDS = [
  {
    // 東看台：露天、8 排，整片紅色，中間後面是聖火台
    name: '東看台',
    u0: -43.5,
    u1: 46.5,
    vF: 55.8,
    s: 1,
    steps: rows([[0.5, 0.4, 'step']], 8, 0.85, 0.4, 1.2),
    aisles: [-30, -15, -1.6, 15, 30],
    paint: true,
  },
  {
    // 西北小看台：5 排橘色座椅、紅褐色鋼頂棚
    name: '西北看台',
    u0: -62,
    u1: -30,
    vF: -50.6,
    s: -1,
    steps: rows([[0.8, 0.45, 'step']], 5, 0.9, 0.42, 1.0),
    aisles: [-61, -46, -31],
    roof: { back: 4.6, front: 5.1 },
  },
  {
    name: '西南看台',
    u0: 27.6,
    u1: 64,
    vF: -50.6,
    s: -1,
    steps: rows([[0.8, 0.45, 'step']], 5, 0.9, 0.42, 1.0),
    aisles: [28.6, 45.8, 63],
    roof: { back: 4.6, front: 5.1 },
  },
  {
    // 主看台（司令台）：前面三階上到司令台平台，後面 8 排，混凝土五跨懸臂頂棚
    name: '主看台',
    u0: -17,
    u1: 15,
    vF: -52.6,
    s: -1,
    steps: rows(
      [
        [0.6, 0.35, 'step'],
        [0.6, 0.7, 'step'],
        [1.7, 1.0, 'step'],
      ],
      8,
      0.9,
      0.45,
      1.2
    ),
    aisles: [-16, -1, 14],
    main: true,
  },
];
const AW = 1.4; // 走道寬

// 斜面方塊：u0..u1 × v（vA 在 yA、vB 在 yB），厚 th
function slab(u0, u1, vA, vB, yA, yB, th) {
  const c = [];
  for (const [v, y] of [
    [vA, yA],
    [vB, yB],
  ])
    for (const u of [u0, u1]) {
      const [x, z] = stadiumP(u, v);
      c.push([x, y, z], [x, y - th, z]);
    }
  // c: 0 a0top 1 a0bot 2 a1top 3 a1bot 4 b0top 5 b0bot 6 b1top 7 b1bot
  const f = [
    [0, 2, 6, 4],
    [1, 5, 7, 3],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 1, 3, 2],
    [4, 6, 7, 5],
  ];
  // 每個面的繞向朝外（法線和「中心 → 面中心」同向），單面材質才看得到
  const M = [0, 1, 2].map((i) => c.reduce((t, q) => t + q[i], 0) / 8);
  const pos = [];
  for (const q of f) {
    const [a, , cc] = q;
    let [, b, , d] = q;
    const A = c[a],
      e1 = [0, 1, 2].map((i) => c[b][i] - A[i]),
      e2 = [0, 1, 2].map((i) => c[cc][i] - A[i]),
      n = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ],
      F = [0, 1, 2].map((i) => (c[a][i] + c[b][i] + c[cc][i] + c[d][i]) / 4 - M[i]);
    if (n[0] * F[0] + n[1] * F[1] + n[2] * F[2] < 0) [b, d] = [d, b];
    pos.push(...c[a], ...c[b], ...c[cc], ...c[a], ...c[cc], ...c[d]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2)
  );
  g.computeVertexNormals();
  return g;
}

export function stadiumTreeHide() {
  const out = [oval(ROUT + 1.5), rect(EXT_N - 1, -TRACK.HL, -ROUT - 1, -TRACK.R)];
  out.push(
    rect(TRACK.HL, EXT_S + 1, -ROUT - 1, -TRACK.R),
    rect(JUMP.u0, JUMP.u1, JUMP.v0, JUMP.v1 + 1)
  );
  for (const S of STANDS) {
    const D = S.steps.reduce((a, s) => a + s[0], 0);
    out.push(rect(S.u0 - 1.5, S.u1 + 1.5, S.vF + S.s * -1, S.vF + S.s * (D + 1.5)));
  }
  out.push(rect(-22.5, -17, -60, -54)); // 塔
  out.push(rect(-4.5, 1.5, 63.5, 70)); // 聖火台
  return out;
}

export function buildStadium(I, scene, data, collision) {
  const parts = {};
  const mats = {};
  const mat = (hex, o = {}) =>
    mats[hex + (o.key || '')] ||
    (mats[hex + (o.key || '')] = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.85,
      ...o.m,
    }));
  const put = (m, g) => {
    (parts[m.uuid] || (parts[m.uuid] = { m, g: [] })).g.push(g.index ? g.toNonIndexed() : g);
  };
  // 局部座標方塊：u0..u1 × v0..v1 × y0..y1（世界高度）
  const box = (m, u0, u1, v0, v1, y0, y1) => {
    const g = new THREE.BoxGeometry(Math.abs(v1 - v0), y1 - y0, Math.abs(u1 - u0));
    g.rotateY(ANG);
    const [x, z] = stadiumP((u0 + u1) / 2, (v0 + v1) / 2);
    g.translate(x, (y0 + y1) / 2, z);
    put(m, g);
  };
  const cyl = (m, u, v, r, y0, y1, seg = 8) => {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg);
    const [x, z] = stadiumP(u, v);
    g.translate(x, (y0 + y1) / 2, z);
    put(m, g);
  };
  const conc = mat(COL.conc),
    rail = mat(COL.rail, { m: { metalness: 0.5, roughness: 0.5 } });
  const Hmax = (pts) => Math.max(...pts.map(([x, z]) => H(x, z)));
  const Hmin = (pts) => Math.min(...pts.map(([x, z]) => H(x, z)));
  const sample = (u0, u1, v0, v1) => {
    const p = [];
    for (let i = 0; i <= 6; i++)
      for (let j = 0; j <= 2; j++)
        p.push(stadiumP(u0 + ((u1 - u0) * i) / 6, v0 + ((v1 - v0) * j) / 2));
    return p;
  };
  // 牆（I.addWall 的高度是離地，src/world/Kit.js Interiors.resolve）：世界高度 yTop 換成牆中點的離地高
  const wall = (ua, va, ub, vb, yTop, yBot = null) => {
    const [ax, az] = stadiumP(ua, va),
      [bx, bz] = stadiumP(ub, vb),
      g = H((ax + bx) / 2, (az + bz) / 2);
    I.addWall(ax, az, bx, bz, yBot === null ? -1 : yBot - g, yTop - g);
  };
  const surf = (u0, u1, v0, v1, y) => I.addSurface(rect(u0, u1, v0, v1), (x, z) => y - H(x, z));

  for (const S of STANDS) {
    const s = S.s,
      D = S.steps.reduce((a, q) => a + q[0], 0),
      vAt = (off) => S.vF + s * off;
    const foot = sample(S.u0, S.u1, S.vF, vAt(D));
    // 基準高：前緣的地面最高處（前緣第一階離地才不會超過 0.6 m 踏不上去），方塊往下埋到整塊最低的地面
    const base = Hmax(sample(S.u0, S.u1, S.vF, S.vF)),
      low = Hmin(foot) - 0.3;
    const stepM = S.paint ? mat(COL.paint) : conc,
      seatM = mat(S.paint ? COL.paintTop : COL.seat),
      aisleM = S.paint ? conc : mat(COL.aisle);
    // u 方向切段：座位段、走道段
    const cuts = [];
    let u = S.u0;
    for (const a of S.aisles) {
      const a0 = Math.max(S.u0, a - AW / 2),
        a1 = Math.min(S.u1, a + AW / 2);
      if (a0 > u) cuts.push([u, a0, false]);
      cuts.push([a0, a1, true]);
      u = a1;
    }
    if (u < S.u1) cuts.push([u, S.u1, false]);
    let off = 0,
      prevY = 0;
    const seatRows = [];
    for (const [d, y, kind] of S.steps) {
      const va = vAt(off),
        vb = vAt(off + d),
        top = base + y;
      for (const [ua, ub, isAisle] of cuts) {
        if (isAisle && kind === 'seat') {
          // 走道：一排切成兩個半階
          const vm = vAt(off + d / 2),
            yh = base + (prevY + y) / 2;
          box(aisleM, ua, ub, va, vm, low, yh);
          box(aisleM, ua, ub, vm, vb, low, top);
          surf(ua, ub, va, vm, yh);
          surf(ua, ub, vm, vb, top);
          continue;
        }
        box(stepM, ua, ub, va, vb, low, top - (kind === 'seat' || S.paint ? 0.06 : 0));
        if (kind === 'seat')
          box(seatM, ua + 0.02, ub - 0.02, va, vAt(off + Math.min(0.5, d)), top - 0.06, top);
        if (S.paint)
          box(seatM, ua, ub, vAt(off + (kind === 'seat' ? 0.5 : 0)), vb, top - 0.06, top);
        surf(ua, ub, va, vb, top);
      }
      if (kind === 'seat') seatRows.push({ off, d, y, top });
      // 兩端側牆：比這一階高 0.9 m 的灰色擋牆（離地不到 0.6 m 的前緣不擋，從旁邊也能踏上來）
      for (const ue of [S.u0, S.u1]) {
        const t = ue === S.u0 ? -0.25 : 0.25;
        box(
          conc,
          Math.min(ue, ue + t),
          Math.max(ue, ue + t),
          va,
          vb,
          low,
          top + (y > 0.6 ? 0.9 : 0)
        );
        if (y > 0.6) wall(ue + t / 2, va, ue + t / 2, vb, top + 0.9);
      }
      off += d;
      prevY = y;
    }
    // 後牆＋欄杆
    const vBack = vAt(D),
      topY = base + S.steps[S.steps.length - 1][1];
    box(conc, S.u0 - 0.25, S.u1 + 0.25, vBack, vAt(D + 0.25), low, topY + 0.2);
    box(rail, S.u0, S.u1, vAt(D + 0.1), vAt(D + 0.15), topY + 1.05, topY + 1.1);
    for (let uu = S.u0 + 0.2; uu <= S.u1; uu += 1.8)
      cyl(rail, uu, vAt(D + 0.12), 0.03, topY + 0.2, topY + 1.1, 5);
    wall(S.u0 - 0.25, vAt(D + 0.12), S.u1 + 0.25, vAt(D + 0.12), topY + 1.1);
    // 給車、路人的碰撞（只擋腳在地面的人；看台上的人由上面的 I.addWall 擋）
    if (collision) {
      const seg = (ua, va, ub, vb) => {
        const [ax, az] = stadiumP(ua, va),
          [bx, bz] = stadiumP(ub, vb),
          g = H((ax + bx) / 2, (az + bz) / 2);
        collision.addSegment(ax, az, bx, bz, g - 3, g + 0.3);
      };
      seg(S.u0 - 0.25, vAt(D + 0.25), S.u1 + 0.25, vAt(D + 0.25));
      seg(S.u0 - 0.25, vAt(1.5), S.u0 - 0.25, vAt(D + 0.25));
      seg(S.u1 + 0.25, vAt(1.5), S.u1 + 0.25, vAt(D + 0.25));
    }

    // 頂棚
    if (S.roof) {
      const vb0 = vAt(D + 0.85),
        vf0 = vAt(-0.4),
        yb = base + S.roof.back,
        yf = base + S.roof.front;
      put(mat(COL.roofTop), slab(S.u0 - 0.4, S.u1 + 0.4, vb0, vf0, yb + 0.12, yf + 0.12, 0.1));
      put(
        mat(COL.roofUnder, { m: { side: THREE.DoubleSide } }),
        slab(S.u0 - 0.4, S.u1 + 0.4, vb0, vf0, yb + 0.02, yf + 0.02, 0.03)
      );
      box(mat(COL.roofUnder), S.u0 - 0.4, S.u1 + 0.4, vAt(-0.45), vAt(-0.35), yf - 0.3, yf + 0.14); // 前緣封板
      const n = Math.round((S.u1 - S.u0) / 6.5);
      for (let i = 0; i <= n; i++) {
        const uu = S.u0 + ((S.u1 - S.u0) * i) / n;
        cyl(mat(COL.roofUnder), uu, vAt(D + 0.6), 0.13, low, yb, 8);
        // 斜撐：柱頂往前拉到頂棚中段
        const [ax, az] = stadiumP(uu, vAt(D + 0.6)),
          [bx, bz] = stadiumP(uu, vAt(D * 0.35));
        const ya = yb - 1.4,
          yB = yb + (yf - yb) * 0.6;
        const dir = new THREE.Vector3(bx - ax, yB - ya, bz - az),
          len = dir.length(),
          g2 = new THREE.CylinderGeometry(0.07, 0.07, len, 6);
        g2.translate(0, len / 2, 0);
        g2.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
        );
        g2.translate(ax, ya, az);
        put(mat(COL.roofUnder), g2);
        collision?.addCircle(ax, az, 0.2);
      }
    }
    if (S.main) {
      // 主看台：五跨混凝土懸臂頂棚（前高後低），每跨之間一根柱子和一道上翻的大梁
      const yb = base + 7.0,
        yf = base + 8.3,
        vb0 = vAt(D + 0.5),
        vf0 = vAt(-1.2),
        bays = 5,
        bw = (S.u1 - S.u0 + 1) / bays,
        mr = mat(COL.mainRoof);
      for (let i = 0; i < bays; i++) {
        const ua = S.u0 - 0.5 + i * bw;
        put(mr, slab(ua + 0.08, ua + bw - 0.08, vb0, vf0, yb + 0.25, yf + 0.25, 0.25));
      }
      for (let i = 0; i <= bays; i++) {
        const uu = S.u0 - 0.5 + i * bw;
        box(mr, uu - 0.25, uu + 0.25, vAt(D + 0.1), vAt(D + 0.8), low, yb + 0.25);
        put(mr, slab(uu - 0.22, uu + 0.22, vb0, vf0, yb + 1.0, yf + 0.55, 0.75));
        collision?.addCircle(...stadiumP(uu, vAt(D + 0.45)), 0.45);
      }
      // 司令台正面中間的藍色校名板
      box(mat('#1f4f9c'), -4, 2, vAt(0.68), vAt(0.72), base + 0.15, base + 0.9);
    }

    // 坐下：站在座位區按 E，坐在腳下那排的後一排（腳踩前一排），面向跑道
    const seatOff0 = seatRows[0]?.off ?? 0;
    const seatPoly = rect(
      S.u0 + 0.3,
      S.u1 - 0.3,
      vAt(seatOff0),
      vAt(seatOff0 + seatRows.length * seatRows[0].d)
    );
    const face = Math.atan2(-s * UZ, s * UX); // 朝 -s·v（跑道那邊）
    I.actions.push({
      poly: seatPoly,
      anyY: true,
      y: 0,
      label: (g) => (g.player.seat ? '按 <kbd>E</kbd> 起身' : `按 <kbd>E</kbd> 坐下（${S.name}）`),
      fn: (g) => {
        const p = g.player;
        if (p.seat) {
          p.standUp();
          return;
        }
        const [pu, pv] = toLocal(p.pos.x, p.pos.z);
        const o = (pv - S.vF) * s;
        let k = Math.floor((o - seatOff0) / seatRows[0].d);
        k = Math.max(1, Math.min(seatRows.length - 1, k));
        const uu = Math.max(S.u0 + 0.4, Math.min(S.u1 - 0.4, pu));
        const [x, z] = stadiumP(uu, vAt(seatRows[k].off + 0.24));
        const feet = base + seatRows[k - 1].y;
        p.sitAt(x, z, face, { dy: feet - H(x, z) - p.y });
      },
    });
  }

  // ---------------- 聖火台：東看台後面中間，藍色方台＋金屬火盆 ----------------
  {
    const [cx, cz] = stadiumP(-1.6, 66.5),
      g0 = H(cx, cz);
    box(mat('#2f62b0'), -3.4, 0.2, 64.7, 68.3, g0 - 0.3, g0 + 4.3);
    const bowl = new THREE.CylinderGeometry(1.0, 0.45, 0.8, 16);
    bowl.translate(cx, g0 + 4.7, cz);
    put(mat('#3a3c40', { m: { metalness: 0.7, roughness: 0.4 } }), bowl);
    for (const [ua, va, ub, vb] of [
      [-3.4, 64.7, 0.2, 64.7],
      [0.2, 64.7, 0.2, 68.3],
      [0.2, 68.3, -3.4, 68.3],
      [-3.4, 68.3, -3.4, 64.7],
    ])
      wall(ua, va, ub, vb, g0 + 4.3);
    collision?.addCircle(cx, cz, 2.2);
  }

  // ---------------- 校名塔：主看台北邊，四柱鋼架＋直式藍色「中原大學」招牌 ----------------
  {
    const tu = -19.6,
      tv = -57,
      [cx, cz] = stadiumP(tu, tv),
      g0 = H(cx, cz),
      h = 18,
      tm = mat('#8c4a3a', { m: { metalness: 0.4, roughness: 0.6 } });
    for (const du of [-1.1, 1.1])
      for (const dv of [-1.1, 1.1])
        box(tm, tu + du - 0.15, tu + du + 0.15, tv + dv - 0.15, tv + dv + 0.15, g0 - 0.2, g0 + h);
    for (let y = 3; y <= h; y += 3) {
      box(tm, tu - 1.25, tu + 1.25, tv - 1.2, tv - 1.0, g0 + y - 0.12, g0 + y);
      box(tm, tu - 1.25, tu + 1.25, tv + 1.0, tv + 1.2, g0 + y - 0.12, g0 + y);
      box(tm, tu - 1.2, tu - 1.0, tv - 1.25, tv + 1.25, g0 + y - 0.12, g0 + y);
      box(tm, tu + 1.0, tu + 1.2, tv - 1.25, tv + 1.25, g0 + y - 0.12, g0 + y);
    }
    const sign = canvasTexture(
      64,
      256,
      (c, W, Hh) => {
        c.fillStyle = '#1d4f9e';
        c.fillRect(0, 0, W, Hh);
        c.fillStyle = '#ffffff';
        c.font = '900 46px "Noto Sans TC","Microsoft JhengHei",sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        [...'中原大學'].forEach((ch, i) => c.fillText(ch, W / 2, 34 + i * 62));
      },
      false
    );
    // 招牌朝跑道（+v），兩面都有
    for (const side of [1, -1]) {
      const g = new THREE.PlaneGeometry(1.8, 6.4);
      g.rotateY(ANG + (side > 0 ? Math.PI / 2 : -Math.PI / 2));
      const [x, z] = stadiumP(tu, tv + side * 1.32);
      g.translate(x, g0 + 13, z);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }));
      m.castShadow = true;
      scene.add(m);
    }
    box(mat('#1d4f9e'), tu - 0.9, tu + 0.9, tv - 1.3, tv + 1.3, g0 + 9.75, g0 + 9.8);
    for (const du of [-1.1, 1.1])
      for (const dv of [-1.1, 1.1]) collision?.addCircle(...stadiumP(tu + du, tv + dv), 0.3);
  }

  // ---------------- 足球門（7.32 × 2.44 m，白色） ----------------
  {
    const wm = mat('#f2f2ee'),
      r = 0.06;
    for (const sgn of [-1, 1]) {
      const gu = FB.u + sgn * FB.hl,
        [gx, gz] = stadiumP(gu, 0),
        g0 = H(gx, gz);
      for (const v of [-3.66, 3.66]) {
        cyl(wm, gu, v, r, g0, g0 + 2.44, 8);
        cyl(wm, gu + sgn * 2, v, 0.03, g0, g0 + 1.0, 5);
        collision?.addCircle(...stadiumP(gu, v), 0.1);
      }
      box(wm, gu - r, gu + r, -3.66, 3.66, g0 + 2.38, g0 + 2.5);
      box(wm, gu + sgn * 2 - 0.03, gu + sgn * 2 + 0.03, -3.66, 3.66, g0, g0 + 0.05);
    }
  }

  const grp = new THREE.Group();
  grp.name = 'stadium';
  for (const { m, g } of Object.values(parts)) {
    const merged = mergeGeometries(g);
    for (const x of g) x.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    grp.add(mesh);
  }
  scene.add(grp);
}
