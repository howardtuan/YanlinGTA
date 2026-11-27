// 中壢區普仁市民活動中心（日新路右側 s 54～66，廣源快餐那棟灰色七樓和全家中間；只做外觀，不能進入）。
// 照 Google 街景（2026-05）與國土測繪 2024 正射建模：紅磚四樓，中間一跨往上多一層、頂上是白邊三角山牆的塔樓；
// 白色小口磚的柱子從地面通到頂，一樓是騎樓（玻璃大門、紅磚牆、輪椅坡道），二樓下緣掛一條彩色 LED 跑馬燈，
// 塔樓二樓的磚牆上釘著「中壢區普仁市民活動中心」小字；兩側翼三、四樓是紅磚矮牆的陽台，四樓頂有一圈紅瓦斜簷；
// 人行道上一排紅磚花台。
//
// OSM 有這棟（w1039910328），但輪廓比實景往中山東路偏約 7 m、還歪了一點。OSM 建物不能 drop、不能改輪廓
// （OSM 建物用全圖共用亂數，動到它全圖的樹會重抽），所以照 src/world/buildings/StreetDaren2.js 柏德廣場大樓的做法：
// pcLook 叫 src/world/MapBuilder.js 不畫牆和屋頂（look.open.bare，亂數照抽），buildPurenCenter 最後把它的碰撞輪廓收成一個點，
// 再在實景的位置自己蓋。
// 這個檔案不 import src/world/Interiors.js；src/world/zones/Zones.js import 這裡的 pcLook、pcFootprints、buildPurenCenter。
import { rxLotFrame } from './StreetRixin.js';
import { paveGround } from './GroundDrape.js';

const HIDE = new Set(['w1039910328']);
// 日新路右側（side +1），s 從中山東路口量；區域座標 x=0 在 s 54 那端（站在街上面對它時的右手邊）
const LOT = ['R', 54, 66, 1, { d: 15 }];
const W = 12,
  D = 15,
  GF = 3.6, // 一樓（騎樓）高
  FH = 3.2, // 二到四樓每層
  TOP = GF + 3 * FH, // 四樓頂 13.2（OSM 寫 13.8 m）
  TT = TOP + 3.0, // 塔樓多出來那層的頂
  ARC = 2.2; // 騎樓深度
// 立面分三跨：右翼 x 0～2.5、塔樓 2.5～7.9、左翼 7.9～12（左翼靠全家）
const RW = 2.5,
  LW = 7.9;
const COLS = [
  [0, 0.45],
  [RW, RW + 0.5],
  [LW - 0.5, LW],
  [W - 0.45, W],
];

export function pcLook(b) {
  if (HIDE.has(b.id)) {
    b.look = {
      ...(b.look || {}),
      wall: { base: 'smooth', colour: '#9a4a36' },
      open: { bare: true },
      roof: { ac: false, extras: false },
    };
    b.noShop = true;
  }
}
function uncollide(data, collision) {
  if (!data || !collision || !collision.polys) return;
  for (const b of data.buildings) {
    if (!HIDE.has(b.id)) continue;
    const pi = collision.polys.findIndex((q) => q.pts === b.pts);
    if (pi < 0) {
      console.warn(`[puren] 找不到 ${b.id} 的碰撞輪廓`);
      continue;
    }
    const Q = collision.polys[pi],
      n = b.pts.length,
      c0 = b.pts[0];
    Q.pts = b.pts.map(() => [c0[0], c0[1]]);
    Q.top = -Infinity;
    for (let k = 0; k < n; k++)
      collision.segs[Q.s0 + k] = [c0[0], c0[1], c0[0], c0[1], 1e8, 1e8 + 1];
  }
}
export function pcFootprints() {
  const { ox, oz, ang, apron } = rxLotFrame(LOT),
    c = Math.cos(ang),
    s = Math.sin(ang),
    p = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [[p(-0.1, -apron - 0.2), p(W + 0.1, -apron - 0.2), p(W + 0.1, D), p(-0.1, D)]];
}

// 有索引的幾何（position、normal、uv），才能跟 k.box 的方塊合併成同一個網格（ExtrudeGeometry 沒有索引，合併會失敗）
function meshOf(THREE, quads, tris) {
  const P = [],
    N = [],
    U = [],
    I = [];
  const nrm = (a, b, c) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const L = Math.hypot(...n) || 1;
    return n.map((q) => q / L);
  };
  for (const q of quads) {
    const o = P.length / 3,
      n = nrm(q[0], q[1], q[2]);
    for (const v of q) {
      P.push(...v);
      N.push(...n);
    }
    U.push(0, 0, 1, 0, 1, 1, 0, 1);
    I.push(o, o + 1, o + 2, o, o + 2, o + 3, o, o + 2, o + 1, o, o + 3, o + 2); // 兩面都畫
  }
  for (const t of tris) {
    const o = P.length / 3,
      n = nrm(t[0], t[1], t[2]);
    for (const v of t) {
      P.push(...v);
      N.push(...n);
    }
    U.push(0, 0, 1, 0, 0.5, 1);
    I.push(o, o + 1, o + 2, o, o + 2, o + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  return g;
}

export function buildPurenCenter(I, scene, X, data, collision) {
  const { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, MATS } = X;
  const { MR, FRONT, ac } = rowTools();
  const HP = Math.PI / 2;
  const def = (key, f) => {
    if (!MATS[key]) MATS[key] = f();
    return key;
  };
  const std = (o) =>
    new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
  const BRICK = MR.brick,
    TILE = def('pcTile', () => std({ map: YHT.facade(), color: '#f4f3ef', roughness: 0.55 })), // 白色小口磚
    RTILE = def('pcRoofTile', () => std({ color: '#8e3f2c', roughness: 0.8 })), // 紅瓦
    TRIM = def('pcTrim', () => std({ color: '#f1efe8', roughness: 0.6 })),
    ORANGE = def('pcRail', () => std({ color: '#e0702c', roughness: 0.6 })),
    FLOOR = def('pcFloor', () => std({ color: '#b9b6ae', roughness: 0.9 }));
  const font = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;

  // 二樓下緣的 LED 跑馬燈（黑底彩字；實景字會捲動，這裡停在一個畫面）
  const ledTex = sg('pcLed', 1024, 96, (g) => {
    g.fillStyle = '#101012';
    g.fillRect(0, 0, 1024, 96);
    g.textBaseline = 'middle';
    g.font = font(64);
    let x = 40;
    for (const [t, col] of [
      ['普仁里', '#ff5a3c'],
      ['祝您', '#4fd0ff'],
      ['金馬迎春', '#ffd23a'],
    ]) {
      g.fillStyle = col;
      g.fillText(t, x, 50);
      x += g.measureText(t).width + 56;
    }
    g.fillStyle = 'rgba(0,0,0,.35)'; // LED 點陣的縫
    for (let i = 0; i < 1024; i += 4) g.fillRect(i, 0, 1, 96);
    for (let j = 0; j < 96; j += 4) g.fillRect(0, j, 1024, 1);
  });
  // 塔樓二樓磚牆上的金屬字
  const nameTex = sg('pcName', 1024, 96, (g) => {
    g.clearRect(0, 0, 1024, 96);
    g.fillStyle = '#d8d2c0';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = font(70, 700);
    g.fillText('中 壢 區 普 仁 市 民 活 動 中 心', 512, 50);
  });
  // 塔樓頂層的拱窗（白框、上半圓）
  const archTex = sg('pcArch', 128, 192, (g) => {
    g.clearRect(0, 0, 128, 192);
    g.fillStyle = '#f1efe8';
    g.beginPath();
    g.moveTo(4, 188);
    g.lineTo(4, 64);
    g.arc(64, 64, 60, Math.PI, 0);
    g.lineTo(124, 188);
    g.closePath();
    g.fill();
    g.fillStyle = '#5d6b76';
    g.beginPath();
    g.moveTo(14, 180);
    g.lineTo(14, 64);
    g.arc(64, 64, 50, Math.PI, 0);
    g.lineTo(114, 180);
    g.closePath();
    g.fill();
    g.fillStyle = '#f1efe8';
    g.fillRect(61, 14, 6, 170);
    g.fillRect(14, 96, 100, 5);
  });
  // 一樓玻璃大門後面亮著的大廳
  const lobbyTex = sg('pcLobby', 256, 128, (g) => {
    g.fillStyle = '#d9d2c4';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#8a7a66';
    g.fillRect(0, 100, 256, 28);
    for (const [x, c] of [
      [30, '#c0392b'],
      [70, '#2e86c1'],
      [170, '#f1c40f'],
      [205, '#27ae60'],
    ]) {
      g.fillStyle = c;
      g.fillRect(x, 40, 26, 40); // 布告欄上的海報
    }
    g.strokeStyle = '#3a3a3a';
    g.lineWidth = 5;
    for (const x of [2, 64, 128, 192, 254]) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 128);
      g.stroke();
    }
  });

  const { ox, oz, ang, apron } = rxLotFrame(LOT);
  const k = new Kit(I, ox, oz, ang);

  // ---- 量體 ----
  // 一樓：騎樓後面的牆（z = ARC 往裡），二樓以上整塊
  k.box(0, W, -0.8, GF, ARC, D, BRICK, { tile: [0.6, 0.6] });
  k.box(0, W, GF, TOP, 0, D, BRICK, { tile: [0.6, 0.6], col: false });
  k.box(-0.02, W + 0.02, TOP, TOP + 0.12, -0.04, D, 'gray', { col: false }); // 屋頂
  for (const [a, b, c, d] of [
    [-0.02, W + 0.02, -0.04, 0.2],
    [-0.02, W + 0.02, D - 0.2, D],
    [-0.02, 0.2, 0, D],
    [W - 0.2, W + 0.02, 0, D],
  ])
    k.box(a, b, TOP, TOP + 0.9, c, d, TRIM, { col: false }); // 女兒牆
  k.box(0.1, W - 0.1, GF - 0.25, GF, 0, ARC, FLOOR, { col: false }); // 騎樓天花
  k.box(-0.01, W + 0.01, -0.5, 0.18, 0, ARC, FLOOR, { col: false, surface: true }); // 騎樓地坪（比人行道高一階）
  paveGround(k, -0.01, W + 0.01, -0.5, 0.05, -apron, 0, MR.concrete); // 人行道
  // 塔樓：中間一跨往上多一層，頂上白邊三角山牆
  const TD = 7; // 塔樓那一層往裡的深度
  k.box(RW, LW, TOP, TT, 0, TD, BRICK, { tile: [0.6, 0.6], col: false });
  k.box(RW - 0.1, LW + 0.1, TT, TT + 0.25, -0.2, TD + 0.1, TRIM, { col: false }); // 簷口
  const GH = 1.6, // 山牆高
    g0 = RW - 0.15,
    g1 = LW + 0.15,
    gm = (g0 + g1) / 2,
    y0 = TT + 0.25;
  k._part(
    TRIM,
    meshOf(
      THREE,
      [],
      [
        [
          [g0, y0, -0.25],
          [g1, y0, -0.25],
          [gm, y0 + GH, -0.25],
        ],
      ]
    )
  );
  k._part(
    BRICK,
    meshOf(
      THREE,
      [],
      [
        [
          [g0 + 0.35, y0 + 0.08, -0.27],
          [g1 - 0.35, y0 + 0.08, -0.27],
          [gm, y0 + GH - 0.3, -0.27],
        ],
      ]
    )
  );
  for (const [a, b] of [
    [g0, gm],
    [g1, gm],
  ])
    // 兩片紅瓦斜屋頂往裡延伸
    k._part(
      RTILE,
      meshOf(
        THREE,
        [
          [
            [a, y0, -0.3],
            [b, y0 + GH + 0.05, -0.3],
            [b, y0 + GH + 0.05, TD + 0.2],
            [a, y0, TD + 0.2],
          ],
        ],
        []
      )
    );

  // ---- 白色小口磚柱（地面通到四樓頂；塔樓兩根通到塔頂；騎樓裡要擋人，所以留碰撞） ----
  for (const [x0, x1] of COLS) {
    const tower = x0 === RW || x1 === LW;
    k.box(x0, x1, -0.8, tower ? TT : TOP, -0.18, x0 === 0 || x1 === W ? D : 0.3, TILE, {
      tile: [0.6, 0.6],
    });
  }

  // ---- 塔樓立面 ----
  const tc = (RW + LW) / 2;
  for (let f = 1; f <= 3; f++) {
    const y = GF + (f - 1) * FH;
    if (f === 1) {
      // 二樓：LED 下面是磚牆，上面釘名字
      k.plane(nameTex, 4.4, 0.42, tc + 0.2, y + 2.05, -0.03, FRONT, { transparent: true });
    } else {
      k.box(tc - 1.35, tc + 1.35, y + 0.65, y + 2.55, -0.08, 0, TRIM, { col: false }); // 白框
      k.plane(ROWT.alWin(), 2.4, 1.7, tc, y + 1.6, -0.09, FRONT);
      k.box(tc - 1.45, tc + 1.45, y + 0.55, y + 0.65, -0.25, 0, TRIM, { col: false }); // 窗台
    }
    for (const x of [RW + 0.75, LW - 0.75])
      k.plane(ROWT.alWin(), 0.45, 1.5, x, y + 1.6, -0.02, FRONT);
  }
  k.plane(archTex, 1.6, 2.4, tc, TOP + 1.45, -0.03, FRONT, { transparent: true });
  for (const x of [RW + 0.85, LW - 0.85])
    k.plane(ROWT.alWin(), 0.45, 1.2, x, TOP + 1.3, -0.02, FRONT);

  // ---- 兩側翼：二樓窗、三四樓紅磚矮牆陽台、四樓頂紅瓦斜簷 ----
  for (const [a, b] of [
    [0.45, RW],
    [LW, W - 0.45],
  ]) {
    const w = b - a,
      m = (a + b) / 2;
    k.plane(YHT.win(), w * 0.7, 1.4, m, GF + 1.55, -0.02, FRONT); // 二樓鐵窗
    for (let f = 2; f <= 3; f++) {
      const y = GF + (f - 1) * FH;
      k.plane(ROWT.alWin(), w * 0.75, 1.6, m, y + 1.7, -0.02, FRONT); // 陽台後面的落地窗
      k.box(a, b, y - 0.1, y + 0.1, -0.95, 0, TRIM, { col: false }); // 樓板
      k.box(a, b, y + 0.1, y + 1.0, -0.95, -0.8, BRICK, { col: false, tile: [0.6, 0.6] });
      k.box(a - 0.02, b + 0.02, y + 1.0, y + 1.08, -1.0, -0.72, TRIM, { col: false }); // 白色壓頂
    }
    const eave = new THREE.BoxGeometry(w + 0.1, 0.1, 1.3);
    eave.rotateX(-0.45);
    eave.translate(m, TOP - 0.3, -0.55);
    k._part(RTILE, eave);
  }
  // 右翼頂樓一台冷氣（街景看得到）
  ac(k, 0.9, GF + FH * 2 + 0.2, -0.5);

  // ---- 一樓騎樓 ----
  // 塔樓那跨：玻璃大門（亮著的大廳）＋黑框
  k.plane(lobbyTex, 4.0, 2.6, tc, 1.3, ARC - 0.03, FRONT, { emissive: 0.5 });
  k.box(tc - 2.05, tc + 2.05, 2.6, 2.7, ARC - 0.1, ARC, MR.black, { col: false });
  for (const x of [tc - 2.05, tc - 0.03, tc + 1.99])
    k.box(x, x + 0.06, 0, 2.6, ARC - 0.1, ARC, MR.black, { col: false });
  // 兩翼一樓：紅磚牆上的鐵窗；右翼一扇紅色鐵門
  k.plane(YHT.win(), 1.5, 1.2, (LW + W) / 2, 1.7, ARC - 0.02, FRONT);
  k.plane(YHT.win(), 1.3, 1.2, (LW + W) / 2 + 1.6, 1.7, ARC - 0.02, FRONT);
  k.box(0.7, 1.7, 0, 2.2, ARC - 0.06, ARC, '#b8432f', { col: false });
  // 輪椅坡道的橘色扶手
  k.box(tc + 0.6, tc + 0.66, 0, 0.9, -apron + 0.25, -0.15, ORANGE, { col: false });
  k.box(tc - 0.66, tc - 0.6, 0, 0.9, -apron + 0.25, -0.15, ORANGE, { col: false });
  k.box(tc - 0.66, tc + 0.66, 0.85, 0.92, -apron + 0.25, -apron + 0.31, ORANGE, { col: false });
  // LED 跑馬燈
  k.box(0.8, 9.2, GF + 0.1, GF + 1.0, -0.3, 0, MR.black, { col: false });
  k.plane(ledTex, 8.2, 0.8, 5.0, GF + 0.55, -0.31, FRONT, { emissive: 0.9 });
  // 人行道上的紅磚花台
  for (const [a, b] of [
    [0.4, 2.3],
    [LW + 0.2, W - 0.3],
  ]) {
    k.box(a, b, 0, 0.55, -apron + 0.05, -apron + 0.55, BRICK, { tile: [0.6, 0.6] });
    for (let x = a + 0.35; x < b - 0.2; x += 0.7) {
      const g = new THREE.SphereGeometry(0.32, 6, 4);
      g.translate(x, 0.75, -apron + 0.3);
      k._part(MR.plant, g);
    }
  }
  // 側面（靠全家那面、靠灰色七樓那面）與後面的窗
  for (let f = 1; f <= 3; f++) {
    const y = GF + (f - 1) * FH + 1.6;
    for (const z of [4, 9, 13]) {
      k.plane(ROWT.alWin(), 1.2, 1.1, W + 0.03, y, z, HP);
      k.plane(ROWT.alWin(), 1.2, 1.1, -0.03, y, z, -HP);
    }
    for (const x of [2, 6, 10]) k.plane(YHT.win(), 1.4, 1.1, x, y, D + 0.03, 0);
  }
  // 頂樓水塔
  k.cyl(W - 2.5, D - 3, 0.7, TOP + 0.12, TOP + 1.6, MR.white, { seg: 12 });

  finishRow(scene, [k]);
  uncollide(data, collision);
}
