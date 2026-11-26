// 中原埤塘生態公園（牛稠埤）北岸的公園建物：一層樓高的清水模量體，西段是玻璃面的景觀餐廳，
// 中段是往南（水岸步道）斜下來的草坡屋頂，東段是階梯看台，屋頂北緣一條木棧迴廊，
// 從東端接一條架高的弧形坡道往東南下到步道（園區解說牌叫「框景迴廊」）。
// 依據：
//  - 國土測繪中心 2024 正射（24.95708, 121.24567 一帶）：量體約 x 286～335、z 89～106（同 OSM w1113209000 輪廓），
//    屋頂北緣一條約 2.4 m 寬的灰色帶從西端沿北牆往東，過東端後彎向東南、落在約 (352.5, 113.5)；
//    屋頂中段一塊三角形草地，東側是一排橫向的看台。
//  - Google 地圖「中原埤塘生態公園」相片：草坡從步道斜上屋頂、旁邊一排深色木看台加中央扶手；
//    架高弧形坡道是木地板加深灰直條欄杆，底下方形清水模柱；從南岸看是一層樓高、低矮的水平量體。
//  - 園區解說牌（同一組相片）：入口廣場、框景迴廊、景觀餐廳、多功能空間入口、水岸休憩平台。
// 原本 OSM 這棟被當成 4 層 13.8 m 的街屋：資料不動、只藏起來（niuchouParkLook），碰撞照用它原本的輪廓（同一塊量體），
// 只把攝影機遮擋用的屋頂高度改成這裡的屋頂；坡道底下淨高不到 2.2 m 的那段兩側和端點加碰撞。不用共用亂數。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { H } from '../Terrain.js';
import { canvasTexture } from '../../graphics/GpuMemLifecycle.js';

const HIDE_ID = 'w1113209000';
// OSM 輪廓：西北、東北、東南、西南
const FP = [
  [286.6, 92.5],
  [333.8, 89.1],
  [334.7, 102.5],
  [287.6, 105.9],
];
const HR = 4.2; // 屋頂高（離地）
// 沿長向（u，從西端量）的分段：餐廳｜草坡｜看台｜東端樓梯間
const SEG = { lawn: 20, seats: 33, core: 43 };
const BAND = 2.4; // 北緣迴廊寬
// 弧形坡道：二次貝茲（起點＝東端迴廊中線外推、控制點、終點）
const RAMP = { c: [345.5, 91.0], end: [352.5, 113.5], w: 2.4, n: 28 };

// 原本的 OSM 方樓：資料原封不動（drop 會讓全圖共用亂數位移，實測遠處約 20 個實例換位），
// 照 src/world/buildings/StreetXinzhongbei.js xzLook 的做法只叫 src/world/MapBuilder.js 不畫牆和屋頂
export function niuchouParkLook(b) {
  if (b.id !== HIDE_ID) return;
  if (!b.look) b.facade = 'glass';
  b.look = {
    ...(b.look || {}),
    wall: { base: 'smooth', colour: '#d9d9d6' },
    open: { bare: true },
    roof: { ac: false, extras: false },
  };
  b.noShop = true;
}

function frame() {
  const [A, B, , D] = FP;
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]),
    W = Math.hypot(D[0] - A[0], D[1] - A[1]);
  const U = [(B[0] - A[0]) / L, (B[1] - A[1]) / L],
    V = [(D[0] - A[0]) / W, (D[1] - A[1]) / W];
  const P = (u, v) => [A[0] + U[0] * u + V[0] * v, A[1] + U[1] * u + V[1] * v];
  return { L, W, U, V, P };
}

// 平面四邊形（a,b,c,d 逆時針看上方）→ 兩個三角形
function quad(out, a, b, c, d) {
  out.push(...a, ...b, ...c, ...a, ...c, ...d);
}
function geoOf(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  g.computeVertexNormals();
  const n = arr.length / 3,
    uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv[i * 2] = arr[i * 3] * 0.5 + arr[i * 3 + 2] * 0.5;
    uv[i * 2 + 1] = arr[i * 3 + 1] * 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
// 斜放的長方體（局部 u,v 範圍、y0..y1），用 BoxGeometry 轉到世界
function box(f, u0, u1, v0, v1, y0, y1) {
  const g = new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0);
  const [cx, cz] = f.P((u0 + u1) / 2, (v0 + v1) / 2);
  g.rotateY(-Math.atan2(f.U[1], f.U[0]));
  g.translate(cx, (y0 + y1) / 2, cz);
  return g;
}

export function buildNiuchouPark(I, scene, data, collision) {
  const f = frame();
  const base = Math.min(...FP.map((p) => H(p[0], p[1]))),
    top = base + HR;
  const ang = -Math.atan2(f.U[1], f.U[0]);
  const conc = [],
    glassG = [],
    lawn = [],
    wood = [],
    rail = [],
    bar = [];

  // 餐廳：清水模框＋南面深色玻璃（玻璃退 0.6 m，上方留簷）
  conc.push(box(f, 0, SEG.lawn, 0, f.W - 0.6, base, top));
  conc.push(box(f, 0, SEG.lawn, f.W - 0.6, f.W, top - 0.5, top)); // 簷
  for (let u = 0; u <= SEG.lawn; u += SEG.lawn / 5)
    conc.push(box(f, u - 0.2, u + 0.2, f.W - 0.6, f.W - 0.2, base, top - 0.5));
  glassG.push(box(f, 0.2, SEG.lawn - 0.2, f.W - 0.62, f.W - 0.58, base, top - 0.5));
  // 北緣：整條迴廊下的量體
  conc.push(box(f, SEG.lawn, f.L, 0, BAND + 1.2, base, top));
  // 東端樓梯間
  conc.push(box(f, SEG.core, f.L, BAND + 1.2, f.W, base, top));

  // 草坡：從北側屋頂高度斜下到南緣（離地 0.3 m），兩側清水模矮牆
  {
    const v0 = BAND + 1.2,
      tri = [],
      side = [];
    const p = (u, v, y) => {
      const [x, z] = f.P(u, v);
      return [x, y, z];
    };
    const yS = base + 0.3;
    quad(
      tri,
      p(SEG.lawn, v0, top),
      p(SEG.lawn, f.W, yS),
      p(SEG.seats, f.W, yS),
      p(SEG.seats, v0, top)
    );
    lawn.push(geoOf(tri));
    // 西側擋牆（餐廳東牆的延伸，直接用量體）＋草坡底下封起來的側面
    for (const u of [SEG.lawn, SEG.seats]) {
      quad(side, p(u, v0, base), p(u, f.W, base), p(u, f.W, yS), p(u, v0, top));
      quad(side, p(u, v0, top), p(u, f.W, yS), p(u, f.W, base), p(u, v0, base));
    }
    quad(
      side,
      p(SEG.lawn, f.W, base),
      p(SEG.seats, f.W, base),
      p(SEG.seats, f.W, yS),
      p(SEG.lawn, f.W, yS)
    );
    conc.push(geoOf(side));
  }

  // 階梯看台：8 階從屋頂下到步道，深色木踏面，中間一道直跑樓梯和扶手
  {
    const v0 = BAND + 1.2,
      n = 8,
      dv = (f.W - v0) / n,
      dy = HR / n;
    for (let k = 0; k < n; k++) {
      const vA = v0 + k * dv,
        y1 = top - k * dy;
      conc.push(box(f, SEG.seats, SEG.core, vA, vA + dv, base, y1 - 0.06));
      wood.push(box(f, SEG.seats + 0.05, SEG.core - 0.05, vA, vA + dv, y1 - 0.06, y1));
    }
    const um = (SEG.seats + SEG.core) / 2;
    for (const du of [-0.9, 0.9]) {
      // 扶手：斜桿＋立柱
      const [ax, az] = f.P(um + du, v0),
        [bx, bz] = f.P(um + du, f.W);
      const len = Math.hypot(bx - ax, bz - az, HR);
      const g = new THREE.CylinderGeometry(0.03, 0.03, len, 6);
      g.rotateX(Math.PI / 2);
      g.lookAt(new THREE.Vector3(bx - ax, -HR, bz - az));
      g.translate((ax + bx) / 2, top - HR / 2 + 0.9, (az + bz) / 2);
      bar.push(g);
    }
  }

  // 屋頂北緣迴廊：木地板＋兩側深灰直條欄杆（用實心板代表）
  wood.push(box(f, 0, f.L, 0, BAND, top, top + 0.08));
  rail.push(box(f, 0, f.L, -0.05, 0.05, top, top + 1.1));
  rail.push(box(f, 0, SEG.lawn, BAND - 0.05, BAND + 0.05, top, top + 1.1));
  rail.push(box(f, SEG.lawn, f.L, BAND + 1.15, BAND + 1.25, top, top + 1.1));
  rail.push(box(f, -0.05, 0.05, 0, BAND, top, top + 1.1));

  // 弧形坡道：從東端迴廊往東南下到步道
  const S = f.P(f.L, BAND / 2),
    E = RAMP.end,
    C = RAMP.c;
  const bez = (t) => [
    (1 - t) ** 2 * S[0] + 2 * (1 - t) * t * C[0] + t * t * E[0],
    (1 - t) ** 2 * S[1] + 2 * (1 - t) * t * C[1] + t * t * E[1],
  ];
  const yEnd = H(E[0], E[1]) + 0.05;
  const pts = [];
  for (let i = 0; i <= RAMP.n; i++) {
    const t = i / RAMP.n,
      [x, z] = bez(t);
    pts.push({ x, z, y: top + (yEnd - top) * t });
  }
  const deck = [],
    under = [],
    parL = [],
    edges = { l: [], r: [] };
  for (let i = 0; i <= RAMP.n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(RAMP.n, i + 1)];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      l = Math.hypot(dx, dz);
    const nx = -dz / l,
      nz = dx / l,
      q = pts[i];
    edges.l.push([q.x + (nx * RAMP.w) / 2, q.z + (nz * RAMP.w) / 2, q.y]);
    edges.r.push([q.x - (nx * RAMP.w) / 2, q.z - (nz * RAMP.w) / 2, q.y]);
  }
  for (let i = 0; i < RAMP.n; i++) {
    const [l0, l1, r0, r1] = [edges.l[i], edges.l[i + 1], edges.r[i], edges.r[i + 1]];
    const v = (e, dy = 0) => [e[0], e[2] + dy, e[1]];
    quad(deck, v(r0, 0.08), v(r1, 0.08), v(l1, 0.08), v(l0, 0.08));
    quad(under, v(l0, -0.45), v(l1, -0.45), v(r1, -0.45), v(r0, -0.45));
    for (const [e0, e1, s] of [
      [l0, l1, 1],
      [r0, r1, -1],
    ]) {
      // 欄杆板（雙面）＋板底側面
      const a0 = v(e0, 0.08),
        a1 = v(e1, 0.08),
        b0 = v(e0, 1.18),
        b1 = v(e1, 1.18);
      quad(parL, a0, a1, b1, b0);
      quad(parL, a1, a0, b0, b1);
      const c0 = v(e0, -0.45),
        c1 = v(e1, -0.45);
      if (s > 0) quad(under, c0, c1, a1, a0);
      else quad(under, c1, c0, a0, a1);
    }
  }
  wood.push(geoOf(deck));
  conc.push(geoOf(under));
  rail.push(geoOf(parL));
  // 方柱：底下淨高超過 1 m 的地方每 4 段一根
  for (let i = 2; i < RAMP.n; i += 4) {
    const q = pts[i],
      g0 = H(q.x, q.z),
      h = q.y - 0.45 - g0;
    if (h < 1) continue;
    const g = new THREE.BoxGeometry(0.6, h, 0.6);
    g.rotateY(ang);
    g.translate(q.x, g0 + h / 2, q.z);
    conc.push(g);
    collision?.addCircle(q.x, q.z, 0.45);
  }

  // 深灰直條欄杆：16 根／張、張寬 2 m（uv 照世界座標，見下面合併時重算）
  const slats = canvasTexture(128, 16, (c, W, Hh) => {
    c.clearRect(0, 0, W, Hh);
    c.fillStyle = '#ffffff';
    for (let k = 0; k < 16; k++) c.fillRect(k * 8, 0, 3, Hh);
  });
  const mats = {
    conc: new THREE.MeshStandardMaterial({ color: '#9f998d', roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({
      color: '#3a4146',
      roughness: 0.12,
      metalness: 0.5,
    }),
    lawn: new THREE.MeshStandardMaterial({ color: '#5a7238', roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: '#5a4b3c', roughness: 0.85 }),
    rail: new THREE.MeshStandardMaterial({
      color: '#44484d',
      map: slats,
      alphaTest: 0.5,
      roughness: 0.6,
      metalness: 0.4,
      side: THREE.DoubleSide,
    }),
    bar: new THREE.MeshStandardMaterial({ color: '#3b3f44', roughness: 0.5, metalness: 0.5 }),
  };
  const g = new THREE.Group();
  g.name = 'niuchouPark';
  for (const [geos, m] of [
    [conc, mats.conc],
    [glassG, mats.glass],
    [lawn, mats.lawn],
    [wood, mats.wood],
    [rail, mats.rail],
    [bar, mats.bar],
  ]) {
    const merged = mergeGeometries(
      geos
        .map((x) => (x.index ? x.toNonIndexed() : x))
        .map((x) => {
          for (const k of Object.keys(x.attributes))
            if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k);
          return x;
        })
    );
    if (m === mats.rail) {
      // 欄杆 uv：橫向沿 x＋z（每 2 m 一張），縱向用高度
      const P = merged.attributes.position,
        uv = merged.attributes.uv;
      for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + P.getZ(i)) * 0.5, P.getY(i) * 0.5);
    }
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  scene.add(g);

  // 碰撞：量體用 OSM 原本的輪廓（MapBuilder 已加）；坡道底下淨高不到 2.2 m 的那段兩側＋端點
  if (collision) {
    const b = (data.buildings || []).find((q) => q.id === HIDE_ID);
    const Q = b && collision.polys?.find((q) => q.pts === b.pts);
    if (Q) Q.top = top;
    for (let i = 0; i < RAMP.n; i++) {
      const q = pts[i];
      if (q.y - 0.45 - H(q.x, q.z) > 2.2) continue;
      for (const e of [edges.l, edges.r])
        collision.addSegment(e[i][0], e[i][1], e[i + 1][0], e[i + 1][1]);
    }
    const [l, r] = [edges.l[RAMP.n], edges.r[RAMP.n]];
    collision.addSegment(l[0], l[1], r[0], r[1]);
  }
}
