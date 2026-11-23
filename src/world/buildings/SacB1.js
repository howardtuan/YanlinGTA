// 學生活動中心 B1 西半（使用者給的 B1 平面圖）：北邊樓梯廳（圓形旋轉梯，往上走到一樓、再到二樓為止，樓上的室內在 src/world/buildings/Sac.js）、南邊用餐區（學餐的座位），
// 用餐區西南角往南凸出到廣場底下的學餐攤販（上面還是廣場，src/world/zones/ZoneG.js 放了一塊甲板），
// 入口在攤販東邊、麥當勞玻璃房西邊（從下沉區的西段樓梯下來），往東直接通到麥當勞的點餐大廳（src/world/Interiors.js buildMcD）。
// 地板是 src/world/zones/ZoneG.js 的坑（PIT.west / PIT.stall），天花在坑底上 2.8 m（= 學活外牆的牆腳），把學活空心的內部擋住。
// 學活的碰撞輪廓在 src/world/zones/ZoneG.js 換成挖掉這塊的版本（蓋完地圖之後才換，共用亂數不變）。
// Local frame: origin at (-152, -114), x east, z south (Kit angle 0).
import * as THREE from 'three';
import { H, Hgrid } from '../Terrain.js';
import { FORE, STAIR2F } from '../zones/ZoneG.js';

export const SAC_B1 = { ox: -152, oz: -114, W: 16, D: 19.58, stallW: 9.3, stallD: 24.5, H: 2.8 }; // stallD stays 5 cm inside PIT.stall: a wall on the pit edge would count from the plaza (H() there)

function tex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const signTex = (text, bg, fg, w = 512, h = 128, px = 64) =>
  tex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = `900 ${px}px "Noto Sans TC","PingFang TC",sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 3);
  });

export function buildSacB1(I, scene, Kit, regMat, collision = null) {
  const S = SAC_B1,
    W = S.W,
    D = S.D,
    SW = S.stallW,
    SD = S.stallD,
    Hc = S.H;
  const k = new Kit(I, S.ox, S.oz, 0);
  k.base = H(S.ox + 2, S.oz + 2);
  k.group.position.y = k.base; // the pit floor (the origin is on the pit's edge)
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
    if (lift) {
      m.emissive.set(o.color || '#ffffff');
      if (o.map) m.emissiveMap = o.map;
      m.emissiveIntensity = lift;
    }
    return m;
  };
  const terrazzo = tex(256, 256, (g) => {
    let s = 11;
    const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    g.fillStyle = '#c9c4ba';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = (150 + r() * 80) | 0;
      g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
    }
    g.fillStyle = 'rgba(90,85,80,.35)';
    g.fillRect(0, 0, 256, 2);
    g.fillRect(0, 0, 2, 256);
  });
  terrazzo.wrapS = terrazzo.wrapT = THREE.RepeatWrapping;
  const wood = tex(128, 128, (g) => {
    g.fillStyle = '#b48a5a';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 4) {
      g.fillStyle = `rgba(90,60,30,${0.08 + (y % 12) / 80})`;
      g.fillRect(0, y, 128, 1);
    }
  });
  const MO = {
    floor: std({ map: terrazzo, roughness: 0.55 }, 0.22),
    wall: std({ color: '#efece4' }, 0.32),
    ceil: std({ color: '#f4f3ef' }, 0.42),
    light: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#fff6e2',
      emissiveIntensity: 1.1,
    }),
    desk: std({ map: wood, roughness: 0.5 }, 0.15),
    steel: std({ color: '#9aa0a6', metalness: 0.6, roughness: 0.35 }, 0.1),
    chair: std({ color: '#2f5d8a', roughness: 0.6 }, 0.12),
    table: std({ color: '#f1efe9', roughness: 0.4 }, 0.22),
    bin: std({ color: '#3f7d4e', roughness: 0.6 }, 0.12),
    stair: std({ color: '#d8d3c8', roughness: 0.6 }, 0.2),
    rail: std({ color: '#3a3d40', metalness: 0.6, roughness: 0.4 }),
    counter: std({ color: '#d9d6cf', roughness: 0.4 }, 0.2),
    stallBack: std({ color: '#d7cbb5' }, 0.25),
    stove: std({ color: '#b6bbc0', metalness: 0.5, roughness: 0.35 }, 0.1),
    dark: std({ color: '#2a2b2d', roughness: 0.6 }),
    shaft: new THREE.MeshStandardMaterial({
      color: '#e9e6de',
      emissive: '#e9e6de',
      emissiveIntensity: 0.3,
      roughness: 1,
      side: THREE.BackSide,
    }),
  };
  const MT = Object.fromEntries(Object.entries(MO).map(([n, m]) => [n, regMat(`sb1${n}`, m)]));
  const nc = { col: false };
  // the stalls are under the plaza (H() there is the pit floor but people stand on the deck above), so their walls go in
  // the world collision with a world-height band (pit floor .. +h) instead of I.walls (heights relative to the ground)
  const cw = (x0, x1, z0, z1, y1) => {
    if (!collision) return;
    const p = k.rect(x0, x1, z0, z1);
    for (let i = 0; i < 4; i++) {
      const a = p[i],
        b = p[(i + 1) % 4];
      collision.addSegment(a[0], a[1], b[0], b[1], k.base - 0.1, k.base + y1);
    }
  };
  const cbox = (x0, x1, y0, y1, z0, z1, mat) => {
    k.box(x0, x1, y0, y1, z0, z1, mat, nc);
    cw(x0, x1, z0, z1, y1);
  };

  // ---------------- shell ----------------
  k.box(0, W, -0.3, 0.1, 0, D, MT.floor, { ...nc, tile: [2.4, 2.4] });
  k.box(0, SW, -0.3, 0.02, D, SD, MT.floor, { ...nc, tile: [2.4, 2.4] }); // people stand on the pit floor (no surface: it would lift the plaza above too)
  // floor at the pit floor + 0.1, level with the 麥當勞 (its edges lie on the pit's edge, where H() is the plaza)
  const surf = (x0, x1, z0, z1) =>
    I.addSurface(k.rect(x0, x1, z0, z1), (x, z) => k.base + 0.1 - H(x, z));
  surf(0, W, 0, D + 0.05);
  k.box(0, 0.3, 0, Hc, 0, D, MT.wall); // west wall (dining area)
  cbox(0, 0.3, 0, Hc, D, SD, MT.wall); // west wall (stalls)
  k.box(0, W, 0, Hc, 0, 0.3, MT.wall); // north wall (stair hall)
  cbox(0.3, SW, 0, Hc, SD - 0.3, SD, MT.wall); // the stalls' back wall (under the plaza)
  // ceiling 2.8 m up (the 活動中心's outer wall starts there), a square hole over the spiral stair
  const SX = 6,
    SZ = 5,
    SR = 1.7,
    hx0 = SX - SR - 0.2,
    hx1 = SX + SR + 0.2,
    hz0 = SZ - SR - 0.2,
    hz1 = SZ + SR + 0.2;
  for (const [x0, x1, z0, z1] of [
    [0, W, 0, hz0],
    [0, W, hz1, D + 0.35],
    [0, hx0, hz0, hz1],
    [hx1, W, hz0, hz1],
    [0, SW, D + 0.35, SD],
  ])
    k.box(x0, x1, Hc, Hc + 0.12, z0, z1, MT.ceil, { ...nc, tile: [0.6, 0.6] });
  // the well over the stair, up to the 1F floor (src/world/buildings/Sac.js), and a beam over the entrance
  k.box(hx0, hx1, Hc, Hgrid(-153, -86) + FORE.rise - k.base - 0.02, hz0, hz1, MT.shaft, nc);
  k.box(SW, W, Hc - 0.35, Hc + 0.4, D - 0.1, D + 0.35, MT.wall, nc);
  // the sign on that beam (street view 2017): a blue 影印部 board; 麥當勞 is inside to the right
  const gate = tex(1024, 112, (g, w, h) => {
    g.fillStyle = '#2b5fae';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.font = '900 72px "Noto Sans TC","PingFang TC",sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillText('影印部', 30, h / 2 + 3);
    g.font = '700 34px "Noto Sans TC","PingFang TC",sans-serif';
    g.fillText('影印 · 輸出 · 裝訂 · 文具', 290, h / 2 + 5);
  });
  k.plane(gate, 5.2, 0.57, (SW + W) / 2, Hc + 0.02, D + 0.36, 0, { emissive: 0.45 });
  // downlights / light strips
  for (let x = 2; x < W - 0.5; x += 3)
    for (let z = 1.5; z < D; z += 3) {
      if (Math.abs(x - SX) < 2.6 && Math.abs(z - SZ) < 2.6) continue;
      k.box(x - 0.6, x + 0.6, Hc - 0.02, Hc, z - 0.12, z + 0.12, MT.light, nc);
    }
  for (let x = 1.6; x < SW - 0.5; x += 2.6)
    k.box(x - 0.5, x + 0.5, Hc - 0.02, Hc, 21.0, 21.24, MT.light, nc);

  // ---------------- stair hall: round spiral stair, walkable up to 1F (src/world/buildings/Sac.js builds the floor and the rail round the well) ----------------
  // 18 wedges of 30 degrees, one and a half turns anticlockwise (seen from above, x east / z south): in from the south at B1,
  // out to the north at 1F. Each wedge is a walkable surface; the drum (chords at the rail), the newel and two radial stops
  // (under the flight at the bottom, past the last step at the top) are collision lines with height bands.
  const TOP1F = (SAC_B1.f1 = Hgrid(-153, -86) + FORE.rise - k.base),
    NS = 18,
    A0 = Math.PI / 2,
    DA = Math.PI / 6,
    rise = (TOP1F - 0.1) / NS;
  const pol = (a, r) => [SX + Math.cos(a) * r, SZ + Math.sin(a) * r];
  const TOP2F = Hgrid(STAIR2F.x, STAIR2F.zTop - 1) + STAIR2F.rise - k.base; // the stair goes on up to 2F and ends there (src/world/buildings/Sac.js builds the floor round it)
  k.cyl(SX, SZ, 0.12, 0, TOP2F + 1.0, MT.rail, { seg: 12 });
  k.wallRect(SX - 0.2, SX + 0.2, SZ - 0.2, SZ + 0.2, 0, TOP2F + 1.2);
  for (let i = 0; i < NS; i++) {
    const a1 = A0 + i * DA,
      a2 = a1 + DA,
      y = 0.1 + (i + 1) * rise,
      ro = i === NS - 1 ? 2.3 : SR;
    const g = new THREE.CylinderGeometry(SR, SR, 0.07, 5, 1, false, Math.PI / 2 - a2, DA);
    g.translate(SX, y - 0.035, SZ);
    k._part(MT.stair, g);
    I.addSurface(
      [
        pol(a1, 0.15),
        pol(a1, ro),
        pol((a1 + a2) / 2, ro / Math.cos(DA / 2)),
        pol(a2, ro),
        pol(a2, 0.15),
      ].map(([x, z]) => k.w(x, z)),
      y
    );
    // baluster and a piece of handrail at the outer end of every tread
    const [px, pz] = pol(a1, SR - 0.05),
      [qx, qz] = pol(a2, SR - 0.05);
    k._part(MT.rail, new THREE.CylinderGeometry(0.02, 0.02, 0.95, 6).translate(px, y + 0.47, pz));
    const hr = new THREE.BoxGeometry(Math.hypot(qx - px, qz - pz) + 0.04, 0.05, 0.05);
    hr.rotateZ(Math.atan2(rise, Math.hypot(qx - px, qz - pz)));
    hr.rotateY(-Math.atan2(qz - pz, qx - px));
    hr.translate((px + qx) / 2, y + 0.95 + rise / 2, (pz + qz) / 2);
    k._part(MT.rail, hr);
  }
  // the drum: 12 chords; open at the bottom where you walk in (30..90 degrees) and at the top where you walk out (240..300)
  for (let j = 0; j < 12; j++) {
    const a1 = j * DA,
      [x0, z0] = pol(a1, SR),
      [x1, z1] = pol(a1 + DA, SR);
    if (j === 1 || j === 2) k.wallLine(x0, z0, x1, z1, 2.3, TOP2F + 1.1);
    else if (j === 8 || j === 9) {
      k.wallLine(x0, z0, x1, z1, 0, TOP1F - 0.5);
      k.wallLine(x0, z0, x1, z1, TOP1F + 2.3, TOP2F + 1.1);
    } else if (j === 5 || j === 6)
      k.wallLine(x0, z0, x1, z1, 0, TOP2F - 0.5); // 2F: out to the west, into the 中庭
    else k.wallLine(x0, z0, x1, z1, 0, TOP2F + 1.1);
  }
  {
    const [x0, z0] = pol(Math.PI / 6, 0.15),
      [x1, z1] = pol(Math.PI / 6, SR);
    k.wallLine(x0, z0, x1, z1, 0, 2.2);
  } // no way under the flight
  {
    // the top landing is two wedges wide (240..300 degrees); no way past it
    const a1 = Math.PI * 1.5,
      a2 = a1 + DA,
      g = new THREE.CylinderGeometry(SR, SR, 0.07, 5, 1, false, Math.PI / 2 - a2, DA);
    g.translate(SX, TOP1F - 0.035, SZ);
    k._part(MT.stair, g);
    I.addSurface(
      [
        pol(a1, 0.15),
        pol(a1, 2.3),
        pol((a1 + a2) / 2, 2.3 / Math.cos(DA / 2)),
        pol(a2, 2.3),
        pol(a2, 0.15),
      ].map(([x, z]) => k.w(x, z)),
      TOP1F
    );
  }
  {
    // 1F -> 2F: 16 narrower wedges (15 degrees) from 300 degrees on round to 180, the top landing 150..210 degrees faces west
    const N2 = 16,
      D2 = Math.PI / 12,
      B0 = (Math.PI * 5) / 3,
      r2 = (TOP2F - TOP1F) / N2;
    const wedge = (a1, a2, y, ro) => {
      const g = new THREE.CylinderGeometry(SR, SR, 0.07, 4, 1, false, Math.PI / 2 - a2, a2 - a1);
      g.translate(SX, y - 0.035, SZ);
      k._part(MT.stair, g);
      I.addSurface(
        [
          pol(a1, 0.15),
          pol(a1, ro),
          pol((a1 + a2) / 2, ro / Math.cos((a2 - a1) / 2)),
          pol(a2, ro),
          pol(a2, 0.15),
        ].map(([x, z]) => k.w(x, z)),
        y
      );
    };
    for (let j = 0; j < N2; j++) {
      const a1 = B0 + j * D2,
        y = TOP1F + (j + 1) * r2;
      wedge(a1, a1 + D2, y, j === N2 - 1 ? 2.3 : SR);
      const [px, pz] = pol(a1, SR - 0.05),
        [qx, qz] = pol(a1 + D2, SR - 0.05);
      k._part(MT.rail, new THREE.CylinderGeometry(0.02, 0.02, 0.95, 6).translate(px, y + 0.47, pz));
      const hr = new THREE.BoxGeometry(Math.hypot(qx - px, qz - pz) + 0.04, 0.05, 0.05);
      hr.rotateZ(Math.atan2(r2, Math.hypot(qx - px, qz - pz)));
      hr.rotateY(-Math.atan2(qz - pz, qx - px));
      hr.translate((px + qx) / 2, y + 0.95 + r2 / 2, (pz + qz) / 2);
      k._part(MT.rail, hr);
    }
    wedge(Math.PI, (Math.PI * 7) / 6, TOP2F, 2.3);
    const [x0, z0] = pol((Math.PI * 7) / 6, 0.15),
      [x1, z1] = pol((Math.PI * 7) / 6, 2.3);
    k.wallLine(x0, z0, x1, z1, TOP2F - 0.5, TOP2F + 1.1); // the stair ends at 2F
  }
  k.plane(
    signTex('樓梯 往 1F ↑', '#2d3b4a', '#ffffff', 512, 96, 52),
    1.6,
    0.3,
    SX + 1.6,
    2.45,
    SZ + SR + 0.25,
    0,
    { emissive: 0.5 }
  );

  // ---------------- 用餐區（學餐的座位）: four-seat tables in rows, tray return / water / recycling along the west wall ----------------
  // (the walk from the entrance to the 麥當勞 opening, x 11.5..16, stays clear: the 值班 customers come in there)
  const chair = (x, z, face) => {
    k.box(x - 0.22, x + 0.22, 0.44, 0.48, z - 0.21, z + 0.21, MT.chair, nc);
    const bz = z + face * 0.2;
    k.box(x - 0.22, x + 0.22, 0.48, 0.9, bz - 0.02, bz + 0.02, MT.chair, nc);
    for (const [dx, dz] of [
      [-0.18, -0.17],
      [0.18, -0.17],
      [-0.18, 0.17],
      [0.18, 0.17],
    ])
      k._part(
        MT.steel,
        new THREE.CylinderGeometry(0.012, 0.012, 0.44, 5).translate(x + dx, 0.22, z + dz)
      );
  };
  for (const z of [10.2, 12.6, 15.0, 17.4])
    for (const x of [2.6, 4.8, 7.0, 9.2]) {
      k.box(x - 0.6, x + 0.6, 0.71, 0.75, z - 0.36, z + 0.36, MT.table, nc);
      k.wallRect(x - 0.6, x + 0.6, z - 0.36, z + 0.36, 0, 0.75);
      k._part(MT.steel, new THREE.CylinderGeometry(0.04, 0.04, 0.71, 8).translate(x, 0.355, z));
      k.box(x - 0.25, x + 0.25, 0, 0.03, z - 0.2, z + 0.2, MT.steel, nc); // pedestal
      for (const dx of [-0.3, 0.3]) {
        chair(x + dx, z - 0.62, -1);
        chair(x + dx, z + 0.62, 1);
      }
    }
  // west wall: 餐具回收台 (steel counter with a shelf over it), two water dispensers, recycling bins
  k.box(0.3, 0.95, 0, 0.9, 8.8, 11.6, MT.stove);
  k.box(0.3, 0.7, 1.35, 1.39, 8.8, 11.6, MT.steel, nc);
  k.plane(
    signTex('餐具回收', '#3a3d40', '#ffffff', 512, 128, 72),
    1.6,
    0.4,
    0.31,
    1.85,
    10.2,
    Math.PI / 2,
    { emissive: 0.45 }
  );
  for (const z0 of [12.6, 13.3]) {
    k.box(0.3, 0.75, 0, 1.25, z0, z0 + 0.5, MT.counter);
    k.box(0.75, 0.78, 0.85, 1.05, z0 + 0.1, z0 + 0.4, MT.dark, nc);
  }
  k.plane(
    signTex('飲水機', '#1f5f8b', '#ffffff', 512, 128, 72),
    1.2,
    0.3,
    0.31,
    1.7,
    13.2,
    Math.PI / 2,
    { emissive: 0.45 }
  );
  for (const [z0, m] of [
    [15.4, MT.bin],
    [16.1, MT.chair],
    [16.8, MT.dark],
  ])
    k.box(0.3, 0.8, 0, 0.85, z0, z0 + 0.55, m);
  k.plane(
    signTex('資源回收', '#3f7d4e', '#ffffff', 512, 128, 72),
    1.6,
    0.36,
    0.31,
    1.45,
    16.4,
    Math.PI / 2,
    { emissive: 0.45 }
  );
  k.plane(signTex('用 餐 區', '#c8641e', '#ffffff', 512, 128, 72), 1.8, 0.45, 6.0, 2.45, 8.2, 0, {
    emissive: 0.45,
  });
  k.box(5.0, 7.0, 2.2, 2.7, 8.14, 8.17, MT.dark, nc);

  // ---------------- 學餐 stalls under the plaza: three counters facing north, menu boards above ----------------
  const stalls = [
    ['自助餐', '#c0392b'],
    ['麵 飯 館', '#d68910'],
    ['飲料・點心', '#1e8449'],
  ];
  const sw = (SW - 0.3) / stalls.length;
  stalls.forEach(([name, col], i) => {
    const x0 = 0.3 + i * sw,
      x1 = x0 + sw,
      cx = (x0 + x1) / 2;
    cbox(x0 + 0.15, x1 - 0.15, 0, 1.05, 22.2, 22.8, MT.counter); // counter (blocks)
    k.box(x0 + 0.1, x1 - 0.1, 1.05, 1.1, 22.15, 22.85, MT.steel, nc);
    k.box(x0 + 0.3, x1 - 0.3, 1.1, 1.3, 22.35, 22.75, MT.light, nc); // lit food tray / display
    cbox(x0 + 0.2, x1 - 0.2, 0, 0.95, 23.5, 24.2, MT.stove); // stoves / fridges at the back
    cbox(x0 + 0.02, x0 + 0.12, 0, Hc, 22.2, SD - 0.3, MT.stallBack); // partitions between the stalls
    k.box(x0 + 0.2, x1 - 0.2, 2.15, 2.65, 21.9, 22.0, MT.dark, nc); // header board
    k.plane(signTex(name, col, '#ffffff', 512, 128, 76), sw - 0.5, 0.42, cx, 2.4, 21.89, Math.PI, {
      emissive: 0.6,
    });
    k.plane(
      signTex('今日菜單', '#fbf7ee', '#333333', 512, 128, 60),
      sw - 0.8,
      0.5,
      cx,
      1.9,
      SD - 0.31,
      Math.PI,
      { emissive: 0.35 }
    );
  });
  cbox(SW - 0.12, SW, 0, Hc, D, SD - 0.3, MT.stallBack); // east wall, along the 下沉區's west retaining wall

  k.finish(scene);
  I.zones.push({
    name: '學生活動中心 B1 用餐區',
    pts: k.rect(0, W, 0, D),
    y0: 0,
    y1: Hc,
    ceil: () => Hc - 0.3,
  });
  I.zones.push({
    name: '學生活動中心 B1 學餐',
    pts: k.rect(0, SW, D, SD),
    y0: 0,
    y1: Hc,
    ceil: () => Hc - 0.3,
  });
  return { k };
}
