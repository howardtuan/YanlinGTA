// =====================================================================
// 節慶佈置（月份見 src/world/Season.js）
//  - 12 月：大聖誕樹，在正門噴水池（中原噴水池）東側的草坪上，從校門口往內看在噴水池右邊。
//    約 16 m 高：七層樹冠、彩球、會閃的燈串、頂上的金星、底下紅色樹裙和禮物；晚上燈串和星星會發光（PostFX bloom）。
//    src/world/zones/Zones.js 的「節慶：聖誕樹」那一列在 12 月才蓋，樹範圍內原本的樹只藏不重抽（treeHide）。
//  - 1、2 月（過年）：街上店面（world.shopWalls，每棟挑最長那面）掛一對紅燈籠；校內建築（campus／dorm）
//    朝最近道路的那面牆貼春聯、橫批，兩側掛燈籠；燈籠晚上會亮。src/core/Game.js 在 interiors 蓋完後呼叫。
//    春聯：上聯「票投彥霖納百福」、下聯「資管要贏慶豐年」、橫批「春滿中原」。
// 不用共用亂數（自己的 mulberry 種子），不影響樹、灌木、機車的位置。
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surfaceAt } from './Terrain.js';
import { isChristmas } from './Season.js';
import { canvasTexture } from '../graphics/GpuMemLifecycle.js';

const seeded = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const tint = (geo, c) => {
  const col = new THREE.Color(c),
    n = geo.attributes.position.count,
    a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.toArray(a, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
};

// ---------------- 12 月：聖誕樹 ----------------
// 噴水池中心往東 18.5 m、往南 5 m：草坪（data/cycu.json grass）西緣內側，樹裙外緣離噴水池廣場的淺色石帶還有 2 m
const XT = { dx: 18.5, dz: 5, R: 5.2, tiers: 7 };
function xmasSpot(data) {
  const fp = data.areas.find((a) => a.name === '中原噴水池');
  if (!fp) return null;
  const n = fp.pts.length,
    cx = fp.pts.reduce((s, p) => s + p[0], 0) / n,
    cz = fp.pts.reduce((s, p) => s + p[1], 0) / n;
  return { x: cx + XT.dx, z: cz + XT.dz };
}
export function xmasTreeHide(data) {
  if (!isChristmas()) return [];
  const s = xmasSpot(data);
  if (!s) return [];
  const r = XT.R + 1.8;
  return [
    [
      [s.x - r, s.z - r],
      [s.x + r, s.z - r],
      [s.x + r, s.z + r],
      [s.x - r, s.z + r],
    ],
  ];
}

export function buildChristmasTree(I, scene, data, collision) {
  if (!isChristmas()) return;
  const s = xmasSpot(data);
  if (!s) return;
  const rnd = seeded(1225),
    y0 = surfaceAt(s.x, s.z),
    g = new THREE.Group();
  g.position.set(s.x, y0, s.z);
  g.name = 'xmasTree';
  scene.add(g);

  // trunk, the red skirt with a gold band
  const parts = [
    tint(new THREE.CylinderGeometry(0.55, 0.7, 2.2, 12).translate(0, 1.1, 0), '#5a3a22'),
    tint(new THREE.CylinderGeometry(2.3, 2.6, 0.9, 32).translate(0, 0.45, 0), '#b3121f'),
    tint(new THREE.CylinderGeometry(2.62, 2.62, 0.14, 32).translate(0, 0.62, 0), '#d8a92c'),
  ];
  // gifts round the skirt (box + two ribbons)
  const GC = [
    '#c81d25',
    '#1d6fc8',
    '#f2f2f2',
    '#2c9c4a',
    '#e8b10c',
    '#8b3fc4',
    '#e46a1d',
    '#1db7c8',
  ];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.3,
      r = 3.1 + rnd() * 0.6,
      w = 0.55 + rnd() * 0.45,
      h = 0.45 + rnd() * 0.45,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      rot = rnd() * Math.PI,
      rib = GC[(i + 4) % GC.length] === GC[i % GC.length] ? '#ffffff' : '#f5d04a';
    const box = (bw, bh, bd, c) =>
      tint(new THREE.BoxGeometry(bw, bh, bd).rotateY(rot).translate(x, h / 2, z), c);
    parts.push(
      box(w, h, w, GC[i % GC.length]),
      box(w + 0.02, h + 0.02, 0.1, rib),
      box(0.1, h + 0.02, w + 0.02, rib)
    );
  }
  const base = new THREE.Mesh(
    mergeGeometries(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })
  );
  base.castShadow = base.receiveShadow = true;
  g.add(base);

  // seven drooping tiers of dark green
  const tierR = (i) => XT.R * (1 - i / (XT.tiers + 0.6)),
    tierY = (i) => 1.5 + i * 1.85,
    TH = 3.2;
  const tiers = [];
  for (let i = 0; i < XT.tiers; i++) {
    const c = new THREE.ConeGeometry(tierR(i), TH, 32, 3);
    const p = c.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k),
        y = p.getY(k),
        z = p.getZ(k),
        rr = Math.hypot(x, z);
      if (rr < 0.01) continue;
      const a = Math.atan2(z, x),
        lo = (TH / 2 - y) / TH; // 0 at the tip, 1 at the rim
      const wave = 1 + Math.sin(a * 9 + i) * 0.06 * lo;
      p.setXYZ(k, x * wave, y - lo * lo * 0.35 * (1 + Math.sin(a * 9 + i)), z * wave);
    }
    c.computeVertexNormals();
    tiers.push(c.translate(0, tierY(i) + TH / 2, 0));
  }
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#1d5530',
    roughness: 0.85,
    emissive: '#0c3318',
    emissiveIntensity: 0,
  });
  const crown = new THREE.Mesh(mergeGeometries(tiers), leafMat);
  crown.castShadow = crown.receiveShadow = true;
  g.add(crown);
  // a point on tier i's surface: f = 0 at its tip .. 1 at its rim, pushed out by o
  const onTier = (i, a, f, o) => {
    const r = tierR(i) * f + o,
      y = tierY(i) + TH - TH * f - 0.12;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };

  // baubles
  const OC = ['#d4142a', '#e7b416', '#c9ccd4', '#1f5fd6', '#d4142a', '#e7b416'];
  const ballN = 150,
    balls = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.6 }),
      ballN
    );
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    one = new THREE.Vector3(1, 1, 1),
    v = new THREE.Vector3(),
    cc = new THREE.Color();
  for (let k = 0; k < ballN; k++) {
    const i = Math.min(XT.tiers - 1, Math.floor(Math.pow(rnd(), 1.4) * XT.tiers)),
      [x, y, z] = onTier(i, rnd() * Math.PI * 2, 0.45 + rnd() * 0.5, 0.12);
    const sc = 0.8 + rnd() * 0.6;
    balls.setMatrixAt(k, m4.compose(v.set(x, y, z), q, one.clone().multiplyScalar(sc)));
    balls.setColorAt(k, cc.set(OC[k % OC.length]));
  }
  balls.castShadow = true;
  g.add(balls);

  // fairy lights: rows round each tier, twinkling (colour per instance, scaled by the night)
  const LC = ['#fff2c4', '#fff2c4', '#ffd36b', '#ff4a4a', '#5fd0ff', '#7dff8a'];
  const lightPos = [];
  for (let i = 0; i < XT.tiers; i++)
    for (const f of [0.5, 0.75, 0.97]) {
      const n = Math.round(tierR(i) * f * 9);
      for (let k = 0; k < n; k++)
        lightPos.push(onTier(i, ((k + rnd() * 0.5) / n) * Math.PI * 2 + i * 0.7, f, 0.08));
    }
  const LN = lightPos.length,
    lights = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.075, 0),
      new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      LN
    );
  const lBase = [],
    lPh = [];
  lightPos.forEach(([x, y, z], k) => {
    lights.setMatrixAt(k, m4.makeTranslation(x, y, z));
    lBase.push(new THREE.Color(LC[Math.floor(rnd() * LC.length)]));
    lPh.push(rnd() * Math.PI * 2);
    lights.setColorAt(k, lBase[k]);
  });
  g.add(lights);

  // gold star on top
  const sh = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + (k / 10) * Math.PI * 2,
      r = k % 2 ? 0.48 : 1.15;
    if (k) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starMat = new THREE.MeshBasicMaterial({ color: '#ffd23f' });
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(sh, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 1,
    }).translate(0, 0, -0.11),
    starMat
  );
  const topY = tierY(XT.tiers - 1) + TH;
  star.position.set(0, topY + 0.95, 0);
  g.add(star);

  // the skirt and the lowest branches: walk round it, not through it
  collision.addCircle(s.x, s.z, XT.R * 0.82);
  I.updaters.push((dt, gm) => {
    const night = gm?.night || 0,
      t = (gm?.time || 0) * 1;
    // a little dusk / night glow on the branches so the tree reads in the dark
    leafMat.emissiveIntensity = night * 0.35;
    star.rotation.y = t * 0.5;
    starMat.color.set('#ffd23f').multiplyScalar(1 + night * 2.2);
    const k0 = 0.55 + night * 2.4;
    for (let k = 0; k < LN; k++) {
      // three chase groups plus a per-bulb sparkle
      const tw =
        0.55 + 0.45 * Math.max(Math.sin(t * 2.2 + (k % 3) * 2.1), Math.sin(t * 7 + lPh[k]) * 0.6);
      lights.setColorAt(k, cc.copy(lBase[k]).multiplyScalar(k0 * tw));
    }
    lights.instanceColor.needsUpdate = true;
  });
}

// ---------------- 1、2 月：過年燈籠、春聯 ----------------
function lanternGeo() {
  return mergeGeometries([
    tint(new THREE.SphereGeometry(0.3, 12, 8).scale(1, 0.82, 1), '#d3101c'),
    tint(new THREE.CylinderGeometry(0.13, 0.16, 0.08, 10).translate(0, 0.26, 0), '#e2b23a'),
    tint(new THREE.CylinderGeometry(0.16, 0.13, 0.08, 10).translate(0, -0.26, 0), '#e2b23a'),
    tint(new THREE.CylinderGeometry(0.03, 0.07, 0.28, 6).translate(0, -0.44, 0), '#e33b2b'),
    tint(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 4).translate(0, 0.6, 0), '#2a2420'),
  ]);
}
// couplet / 橫批 texture: red paper, gold rim, black brush characters
const PAPER_TEX = new Map();
function redPaper(text, vertical) {
  const key = `${vertical ? 'v' : 'h'}:${text}`;
  if (PAPER_TEX.has(key)) return PAPER_TEX.get(key);
  const W = vertical ? 128 : 512,
    Hh = vertical ? 512 : 128;
  const tex = canvasTexture(
    W,
    Hh,
    (c) => {
      c.fillStyle = '#c8101e';
      c.fillRect(0, 0, W, Hh);
      c.strokeStyle = '#e8b84a';
      c.lineWidth = 6;
      c.strokeRect(7, 7, W - 14, Hh - 14);
      c.fillStyle = '#1a0d08';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const chars = [...text];
      if (vertical) {
        const step = (Hh - 30) / chars.length;
        c.font = `900 ${Math.floor(step * 0.86)}px "Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif`;
        chars.forEach((ch, i) => c.fillText(ch, W / 2, 15 + step * (i + 0.5)));
      } else {
        const step = (W - 40) / chars.length;
        c.font = `900 ${Math.floor(Math.min(step, Hh) * 0.72)}px "Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif`;
        chars.forEach((ch, i) => c.fillText(ch, 20 + step * (i + 0.5), Hh / 2 + 2));
      }
    },
    false
  );
  PAPER_TEX.set(key, tex);
  return tex;
}

// world: src/world/MapBuilder.js world (shopWalls, named, nearestRoadPoint); opts.max: lantern cap (low quality)
export function buildNewYearDecor(scene, world, opts = {}) {
  const lanterns = [],
    papers = { up: [], down: [], top: [] };
  const shopL = [];
  // shops: one pair under the awning of each building's longest street-facing shop wall
  const best = new Map();
  for (const w of world.shopWalls || []) {
    const l = Math.hypot(w.c[0] - w.a[0], w.c[1] - w.a[1]);
    if (l < 3) continue;
    const b = best.get(w.bi);
    if (!b || l > b.l) best.set(w.bi, { w, l });
  }
  for (const { w, l } of best.values()) {
    const ux = (w.c[0] - w.a[0]) / l,
      uz = (w.c[1] - w.a[1]) / l,
      nx = w.n[0],
      nz = w.n[2];
    const ss = l >= 6 ? [l * 0.3, l * 0.7] : [l / 2 - 1, l / 2 + 1];
    for (const s of ss)
      shopL.push([w.a[0] + ux * s + nx * 0.75, w.base + 2.7, w.a[1] + uz * s + nz * 0.75]);
  }
  // campus buildings: couplets, 橫批 and two lanterns on the wall nearest a road
  for (const it of Object.values(world.named)) {
    const b = it.b;
    if (!b || !b.pts || !['campus', 'dorm'].includes(b.kind)) continue;
    const r = world.nearestRoadPoint?.(it.x, it.z);
    if (!r) continue;
    const P = b.pts;
    let bestE = null;
    for (let k = 0; k < P.length; k++) {
      const a = P[k],
        c = P[(k + 1) % P.length],
        l = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (l < 6) continue;
      const mx = (a[0] + c[0]) / 2,
        mz = (a[1] + c[1]) / 2,
        d = Math.hypot(mx - r.x, mz - r.z);
      if (!bestE || d < bestE.d) bestE = { a, c, l, mx, mz, d };
    }
    if (!bestE) continue;
    const { a, c, l, mx, mz } = bestE,
      ux = (c[0] - a[0]) / l,
      uz = (c[1] - a[1]) / l;
    // outward normal: away from the building centre
    let nx = uz,
      nz = -ux;
    if ((mx - it.x) * nx + (mz - it.z) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const y = it.base ?? surfaceAt(mx, mz),
      ang = Math.atan2(nx, nz),
      // the viewer faces -n: their right is (nz, -nx); 上聯 goes on the right
      rx = nz,
      rz = -nx,
      at = (s, out) => [mx + rx * s + nx * out, mz + rz * s + nz * out];
    const [ux1, uz1] = at(1.45, 0.07),
      [dx1, dz1] = at(-1.45, 0.07),
      [tx, tz] = at(0, 0.07);
    papers.up.push([ux1, y + 1.55, uz1, ang]);
    papers.down.push([dx1, y + 1.55, dz1, ang]);
    papers.top.push([tx, y + 2.95, tz, ang]);
    for (const sd of [2.4, -2.4]) {
      const [lx, lz] = at(sd, 0.6);
      lanterns.push([lx, y + 2.9, lz]);
    }
  }
  // campus lanterns first; under a cap (low quality) the shops nearest campus keep theirs
  shopL.sort((a, b) => Math.hypot(a[0], a[2] - 60) - Math.hypot(b[0], b[2] - 60));
  lanterns.push(...shopL);
  const max = opts.max ?? Infinity;
  if (lanterns.length > max) lanterns.length = max;

  const lMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    emissive: '#ff3216',
    emissiveIntensity: 0.1,
  });
  const lm = new THREE.InstancedMesh(lanternGeo(), lMat, Math.max(1, lanterns.length));
  lm.count = lanterns.length;
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1),
    up = new THREE.Vector3(0, 1, 0);
  const sway = [];
  lanterns.forEach(([x, y, z], k) => {
    lm.setMatrixAt(k, m4.makeTranslation(x, y, z));
    sway.push(k * 1.7);
  });
  lm.frustumCulled = false;
  lm.castShadow = false;
  scene.add(lm);

  const papersMeshes = [];
  for (const [key, text, vert, w, h] of [
    ['up', '票投彥霖納百福', true, 0.5, 2.0],
    ['down', '資管要贏慶豐年', true, 0.5, 2.0],
    ['top', '春滿中原', false, 2.3, 0.56],
  ]) {
    const list = papers[key];
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: redPaper(text, vert), roughness: 0.8 }),
      list.length
    );
    list.forEach(([x, y, z, ang], k) =>
      mesh.setMatrixAt(k, m4.compose(v.set(x, y, z), q.setFromAxisAngle(up, ang), one))
    );
    mesh.frustumCulled = false;
    scene.add(mesh);
    papersMeshes.push(mesh);
  }

  // night glow; a gentle sway on the lanterns near the player
  let acc = 0;
  return (dt, g) => {
    const night = g?.night || 0;
    lMat.emissiveIntensity = 0.1 + night * 1.5;
    acc += dt;
    if (acc < 0.05 || !g?.player) return;
    const t = g.time || 0,
      px = g.player.pos.x,
      pz = g.player.pos.z;
    acc = 0;
    let dirty = false;
    lanterns.forEach(([x, y, z], k) => {
      if (Math.abs(x - px) > 60 || Math.abs(z - pz) > 60) return;
      const a = Math.sin(t * 1.3 + sway[k]) * 0.06;
      q.setFromAxisAngle(v.set(1, 0, 0.4).normalize(), a);
      lm.setMatrixAt(k, m4.compose(v.set(x, y, z), q, one));
      dirty = true;
    });
    if (dirty) lm.instanceMatrix.needsUpdate = true;
  };
}
