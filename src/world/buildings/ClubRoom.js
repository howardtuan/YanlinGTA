// 古箏社教室：學生活動中心 3 樓西北角（使用者指正在 3 樓），從主走廊西端的門進去（src/world/buildings/Sac.js 在走廊北牆留門、外牆挖門洞）。
// 教室裡：前面（北牆）白板和社旗、老師位的古箏，對面三排社員的古箏架和琴凳、譜架，西牆的琴盒櫃和成發海報。
// 社團時間黃蓋瑞（src/entities/npcs/Garry.js）和社員（src/entities/npcs/ClubMembers.js）在這裡，沒有人的時候沒有聲音。
// 同一角的其他樓層不能進去（輪廓在 sacTrimmedPts 挖掉，外牆在這裡照活動中心的窗戶樣式蓋）。
// Local frame: origin at the NW corner of 活動中心 (-195, -128.6), x east, z SOUTH (as everywhere in the game).
import * as THREE from 'three';
import { H as Hg } from '../Terrain.js';

export const CLUB = { ox: -195, oz: -128.6, W: 14, D: 10.4, H: 4.6, top: 13.8 };
export const CLUB_DOOR = [-188.4, -187.3];  // 3F door in the corridor's north wall (world x)

function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function materials(regMat, pre) {
  const std = (o, lift = 0) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.8, ...o }); if (lift) { m.emissive.set(o.color || '#ffffff'); if (o.map) m.emissiveMap = o.map; m.emissiveIntensity = lift; } return m; };
  const wood = tex(256, 256, (g) => { let s = 5; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; for (let y = 0; y < 256; y += 32) { g.fillStyle = `rgb(${150 + r() * 20 | 0},${104 + r() * 14 | 0},${66 + r() * 10 | 0})`; g.fillRect(0, y, 256, 31); g.fillStyle = 'rgba(60,35,15,.3)'; g.fillRect(0, y + 31, 256, 1); } }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  const grid = tex(128, 128, (g) => { g.fillStyle = '#eeece5'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#c9c6bd'; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128); }); grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
  const MO = { // material objects (meshes built here use these); MT holds the Kit keys for the same materials
    floor: std({ map: wood, roughness: 0.5 }, 0.18), wall: std({ color: '#ece5d6' }, 0.16), ceil: std({ map: grid }, 0.3),
    rose: std({ color: '#7a4a28', roughness: 0.45 }, 0.12), dark: std({ color: '#2a1a10', roughness: 0.5 }, 0.08),
    white: std({ color: '#fbfbf8', roughness: 0.3 }, 0.25), metal: std({ color: '#b9bec3', metalness: 0.7, roughness: 0.3 }),
    rug: std({ color: '#6e1f2a', roughness: 0.95 }, 0.15), rug2: std({ color: '#b98a4a', roughness: 0.95 }, 0.12), paper: std({ color: '#f6f3ea' }, 0.3), brass: std({ color: '#c9a24a', metalness: 0.6, roughness: 0.35 }, 0.15), leaf: std({ color: '#3f7a3c', roughness: 0.9 }, 0.12),
    light: new THREE.MeshStandardMaterial({ color: '#fff8ea', emissive: '#fff4dc', emissiveIntensity: 1.1 }),
  };
  const MT = Object.fromEntries(Object.entries(MO).map(([n, m]) => [n, regMat(`cz${  n}`, m)]));
  return { MO, MT };
}

// ---------------- the corner's outside: walls with the 活動中心 windows on every floor (1F is closed; 3F is hollow: the 古箏社教室) ----------------
export function buildClubCorner(I, scene, Kit) {
  const { W, D, H, top } = CLUB, k = new Kit(I, CLUB.ox, CLUB.oz, 0);
  for (const [y0, y1, t] of [[-0.5, H, H], [H, top, 3.07]]) { k.box(0, W, y0, y1, 0, 0.3, 'winWall', { col: false, tile: [3.0, t] }); k.box(0, 0.3, y0, y1, 0, D, 'winWall', { col: false, tile: [3.0, t] }); }
  k.wallLine(0, 0, W, 0, -1, top); k.wallLine(0, 0, 0, D, -1, top); k.wallLine(W, 0, W, D, -1, H); k.wallLine(0, D, W, D, -1, H);
  k.box(-0.05, W + 0.05, top - 0.2, top, -0.05, D + 0.05, 'gray', { col: false });
  k.finish(scene);
}

// ---------------- 3F: 古箏社教室 (called by src/world/buildings/Sac.js: F3 = 3F's world height, c = its ceiling) ----------------
export function buildClub3F(I, scene, Kit, regMat, { F3, c, sf }) {
  const W = CLUB.W, D = CLUB.D, Y = F3 - 0.1, H = c - Y, ZB = 0.45, XW = 0.45, XE = W - 0.05, ZS = D - 0.05;
  const k = new Kit(I, CLUB.ox, CLUB.oz, 0), { MO, MT } = materials(regMat, 'cz'), nc = { col: false };
  k.base = Y; k.group.position.y = Y; // local y 0.1 = the 3F floor
  // I.addWall's heights count from the ground under each wall's midpoint
  k.wallLine = (x0, z0, x1, z1, y0, y1) => { const a = k.w(x0, z0), b = k.w(x1, z1), g = Y - Hg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); I.addWall(a[0], a[1], b[0], b[1], y0 + g, y1 + g); };
  k.wallRect = (x0, x1, z0, z1, y0, y1) => { k.wallLine(x0, z0, x1, z0, y0, y1); k.wallLine(x1, z0, x1, z1, y0, y1); k.wallLine(x1, z1, x0, z1, y0, y1); k.wallLine(x0, z1, x0, z0, y0, y1); };
  // shell: floor, ceiling, inside faces of the four walls (south: the doorway)
  const d0 = CLUB_DOOR[0] - CLUB.ox, d1 = CLUB_DOOR[1] - CLUB.ox, CZ = -117.4 - CLUB.oz; // CZ: the corridor's north wall line
  k.box(0.3, W, -0.15, 0.1, 0.3, D, MT.floor, { col: false, tile: [1.2, 1.2] });
  sf(CLUB.ox + 0.3, CLUB.ox + W, CLUB.oz + 0.3, CLUB.oz + D + 0.1, F3); sf(CLUB_DOOR[0] - 0.05, CLUB_DOOR[1] + 0.05, CLUB.oz + D - 0.3, -117.4 + 0.2, F3);
  k.box(0.3, W, H - 0.05, H, 0.3, D, MT.ceil, { col: false, tile: [0.6, 0.6] });
  k.box(0.3, XW, 0.1, H, 0.3, D, MT.wall, nc); k.box(0.3, W, 0.1, H, 0.3, ZB, MT.wall, nc); k.box(XE, W + 0.02, 0.1, H, 0.3, D, MT.wall, nc);
  k.box(0.3, d0, 0.1, H, ZS, D + 0.05, MT.wall, nc); k.box(d1, W, 0.1, H, ZS, D + 0.05, MT.wall, nc); k.box(d0, d1, 2.4, H, ZS, D + 0.05, MT.wall, nc);
  k.wallLine(XW, 0.3, XW, D, 0, H); k.wallLine(0.3, ZB, W, ZB, 0, H); k.wallLine(XE, 0.3, XE, D, 0, H); k.wallLine(0.3, ZS, d0, ZS, 0, H); k.wallLine(d1, ZS, W, ZS, 0, H); k.wallLine(d0, ZS, d1, ZS, 2.4, H);
  // the short passage to the corridor
  for (const [a, b] of [[d0 - 0.12, d0], [d1, d1 + 0.12]]) k.box(a, b, 0.1, 2.5, D, CZ - 0.02, MT.wall);
  k.box(d0 - 0.12, d1 + 0.12, 2.4, 2.5, D, CZ - 0.02, MT.wall, nc); k.box(d0 - 0.12, d1 + 0.12, -0.15, 0.098, D, CZ, MT.floor, { col: false, tile: [1.2, 1.2] });
  for (const [a, b] of [[d0 - 0.02, d0 + 0.05], [d1 - 0.05, d1 + 0.02]]) k.box(a, b, 0.1, 2.4, ZS - 0.03, D + 0.06, MT.dark, nc); k.box(d0 - 0.02, d1 + 0.02, 2.33, 2.42, ZS - 0.03, D + 0.06, MT.dark, nc);
  const win = (x, z, r) => { const g = new THREE.PlaneGeometry(2.0, 1.3); g.rotateY(r); g.translate(x, 1.75, z); k._part('sac_window', g); };
  for (const x of [2.1, 12.6]) win(x, ZB + 0.012, 0); for (const z of [2.2, 5.0]) win(XW + 0.012, z, Math.PI / 2);
  for (const x of [3, 7, 11]) for (const z of [3, 7.4]) k.box(x - 0.7, x + 0.7, H - 0.1, H - 0.05, z - 0.15, z + 0.15, MT.light, nc);
  // sign on the corridor wall
  k.plane(tex(512, 128, (g) => { g.fillStyle = '#5a1620'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#d8b46a'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112); g.fillStyle = '#f4e6c4'; g.font = '900 56px "Noto Serif TC","Noto Sans TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('中原大學 古箏社', 256, 66); }), 1.8, 0.45, d1 + 1.4, 1.75, CZ + 0.03, 0, { emissive: 0.4 });
  // ---------------- front (north wall): whiteboard, club banner, the teacher's guzheng ----------------
  k.box(4.5, 9.5, 1.0, 2.2, ZB, ZB + 0.03, MT.white, nc); k.box(4.5, 9.5, 0.95, 1.0, ZB, ZB + 0.12, MT.metal, nc);
  k.plane(tex(512, 128, (g) => { g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#1f3b8a'; g.font = '700 25px "Noto Sans TC",sans-serif'; g.fillText('期末成發曲目：〈高山流水〉〈漁舟唱晚〉', 16, 44); g.fillStyle = '#b3121f'; g.fillText('週三 19:00 全員練團 ✔', 16, 92); }), 4.9, 1.15, 7, 1.6, ZB + 0.035, 0);
  k.plane(tex(256, 512, (g) => { g.fillStyle = '#8b1e2b'; g.fillRect(0, 0, 256, 512); g.strokeStyle = '#d8b46a'; g.lineWidth = 8; g.strokeRect(10, 10, 236, 492); g.fillStyle = '#f4e6c4'; g.font = '900 64px "Noto Serif TC","Noto Sans TC",serif'; g.textAlign = 'center'; ['古', '箏', '社'].forEach((t, i) => g.fillText(t, 128, 120 + i * 100)); g.font = '700 28px "Noto Sans TC",sans-serif'; g.fillText('CYCU GUZHENG', 128, 470, 220); }), 0.8, 1.6, 11.3, 1.75, ZB + 0.035, 0, { emissive: 0.2 });
  // ---------------- guzhengs: every one is the same set of merged geometries (one instanced mesh per material) ----------------
  const Z = { body: [], dark: [], gold: [], string: [], ivory: [], cloth: [], cushion: [] };
  { // one guzheng on its stand, its player on the local -z side facing +z (the head on the player's right, -x)
    const add = (key, g, x, y, z, rx = 0, ry = 0, rz = 0) => { if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); Z[key].push(g); };
    const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const TOP = 0.655, arch = (x, z) => 0.026 * Math.cos(z / 0.17 * 1.35) + 0.018 * (1 - (x / 0.78) ** 2); // the soundboard: bowed across and a little lengthways
    const top = (x, z) => TOP + arch(x, z);
    { const g = new THREE.BoxGeometry(1.5, 0.085, 0.34, 24, 1, 10), q = g.attributes.position; for (let i = 0; i < q.count; i++) if (q.getY(i) > 0) q.setY(i, q.getY(i) + arch(q.getX(i), q.getZ(i))); g.computeVertexNormals(); add('body', g, 0, TOP - 0.0425, 0); }
    add('dark', bx(0.11, 0.12, 0.36), -0.8, TOP - 0.03, 0); add('dark', bx(0.1, 0.05, 0.36), -0.885, TOP - 0.075, 0, 0, 0, 0.5); // head, dropping away
    add('dark', bx(0.1, 0.1, 0.35), 0.79, TOP - 0.03, 0); add('dark', bx(0.12, 0.045, 0.35), 0.88, TOP - 0.07, 0, 0, 0, -0.55); // tail, curving down
    for (const x of [-0.72, 0.7]) add('ivory', bx(0.018, 0.035, 0.33), x, TOP + 0.03, 0);                       // the two nut bars
    for (const z of [-0.172, 0.172]) { add('gold', bx(1.44, 0.012, 0.004), 0, TOP - 0.015, z); for (const x of [-0.45, 0, 0.45]) add('gold', bx(0.16, 0.03, 0.004), x, TOP - 0.05, z); } // inlaid sides
    add('gold', bx(0.05, 0.006, 0.2), -0.8, TOP + 0.032, 0);
    for (let n = 0; n < 21; n++) { // strings, and their bridges in the slanting wild-goose line
      const z = -0.15 + n * 0.015, bxp = -0.5 + n / 20 * 0.92 + 0.05 * Math.sin(n / 20 * Math.PI), y0 = TOP + 0.047, yb = top(bxp, z) + 0.052;
      for (const [xa, ya, xb, yb2] of [[-0.72, y0, bxp, yb], [bxp, yb, 0.7, y0]]) { const L = Math.hypot(xb - xa, yb2 - ya); add('string', bx(L, 0.0028, 0.0028), (xa + xb) / 2, (ya + yb2) / 2, z, 0, 0, Math.atan2(yb2 - ya, xb - xa)); }
      add('ivory', new THREE.ConeGeometry(0.013, 0.05, 4), bxp, top(bxp, z) + 0.026, z);
    }
    for (const x of [-0.56, 0.56]) { // folding X stands
      for (const a of [-0.42, 0.42]) add('dark', bx(0.035, 0.64, 0.035), x, 0.29, 0, a); add('dark', bx(0.035, 0.03, 0.34), x, 0.555, 0); add('dark', bx(0.035, 0.03, 0.34), x, 0.02, 0);
    }
    add('dark', bx(1.12, 0.03, 0.03), 0, 0.29, 0);
    // padded bench
    add('dark', bx(0.5, 0.03, 0.3), 0, 0.4, -0.56); add('cushion', bx(0.5, 0.06, 0.3), 0, 0.445, -0.56); for (const x of [-0.22, 0.22]) for (const z of [-0.68, -0.44]) add('dark', bx(0.035, 0.4, 0.035), x, 0.2, z);
    // the velvet cover over an instrument nobody is using
    { const g = new THREE.BoxGeometry(1.86, 0.09, 0.44, 12, 1, 6), q = g.attributes.position; for (let i = 0; i < q.count; i++) if (q.getY(i) > 0) q.setY(i, q.getY(i) + arch(q.getX(i), q.getZ(i))); g.computeVertexNormals(); add('cloth', g, 0, TOP + 0.035, 0); add('cloth', bx(1.8, 0.16, 0.012), 0, TOP - 0.06, -0.222); add('cloth', bx(1.8, 0.16, 0.012), 0, TOP - 0.06, 0.222); }
  }
  const merge = (list) => { const P = [], N = [], U = [], X = []; let o = 0; for (const g of list) { P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); U.push(...g.attributes.uv.array); for (const i of g.index.array) X.push(i + o); o += g.attributes.position.count; g.dispose(); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(X); return g; };
  const wood2 = tex(256, 64, (g) => { g.fillStyle = '#7d4522'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${40 + i % 5 * 12},${18 + i % 4 * 6},8,.28)`; g.beginPath(); const y = i * 0.95; g.moveTo(0, y); g.bezierCurveTo(80, y + (i % 7) - 3, 170, y - (i % 5) + 2, 256, y); g.stroke(); } });
  const ZM = { body: new THREE.MeshStandardMaterial({ map: wood2, roughness: 0.35, emissive: '#7d4522', emissiveIntensity: 0.12 }), dark: MO.dark, gold: new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.5, roughness: 0.4, emissive: '#6b5220', emissiveIntensity: 0.25 }),
    string: new THREE.MeshBasicMaterial({ color: '#dcd6c4' }), ivory: new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.5, emissive: '#efe6cf', emissiveIntensity: 0.15 }), cloth: new THREE.MeshStandardMaterial({ color: '#7a1626', roughness: 0.95, emissive: '#7a1626', emissiveIntensity: 0.18 }), cushion: new THREE.MeshStandardMaterial({ color: '#5e1a22', roughness: 0.9, emissive: '#5e1a22', emissiveIntensity: 0.15 }) };
  const spots = [[7, 2.1, 0, 0.14]], seats = []; // [x, z, rot, lift]; the teacher's on the platform, its player on the north side facing the class
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) { const x = 3.2 + q * 3.6, z = 4.5 + r * 1.85; spots.push([x, z, Math.PI, 0]); seats.push([x, z + 0.56]); }
  const USED = new Set([0, 2, 4].map(n => n + 1)); USED.add(0); // the others have their covers on
  const inst = (key, list) => { const im = new THREE.InstancedMesh(merge(Z[key]), ZM[key], list.length), m4 = new THREE.Matrix4(); list.forEach(([x, z, a, l], i) => im.setMatrixAt(i, m4.makeRotationY(a).setPosition(x, 0.1 + l, z))); im.computeBoundingSphere(); im.receiveShadow = false; k.group.add(im); };
  for (const key of ['body', 'dark', 'gold', 'cushion']) inst(key, spots);
  for (const key of ['string', 'ivory']) inst(key, spots.filter((_, i) => USED.has(i)));
  inst('cloth', spots.filter((_, i) => !USED.has(i)));
  for (const [x, z] of spots) k.wallRect(x - 0.92, x + 0.92, z - 0.2, z + 0.2, 0, 0.95);

  // ---------------- the front: a low platform with a rug, score stands, speakers, scrolls ----------------
  k.box(4.6, 9.4, 0.1, 0.24, ZB, 3.1, MT.rose, nc); sf(CLUB.ox + 4.6, CLUB.ox + 9.4, CLUB.oz + ZB, CLUB.oz + 3.1, F3 + 0.14);
  k.box(5.4, 8.6, 0.24, 0.246, 0.9, 2.9, MT.rug, nc); k.box(5.55, 8.45, 0.246, 0.25, 1.05, 2.75, MT.rug2, nc);
  const stand = (x, z, d = 1) => { k.box(x - 0.012, x + 0.012, 0.12, 1.12, z - 0.012, z + 0.012, MT.metal, nc); for (const a of [-0.18, 0.18]) k.box(x + Math.min(0, a), x + Math.max(0, a), 0.1, 0.13, z - 0.02, z + 0.02, MT.metal, nc); k.box(x - 0.2, x + 0.2, 1.08, 1.36, z - 0.012 * d, z + 0.012, MT.dark, nc); k.box(x - 0.15, x + 0.15, 1.12, 1.34, z + 0.013 * d, z + 0.02 * d, MT.paper, nc); };
  for (const [x, z] of seats) stand(x + 1.15, z - 1.0);                     // one by every instrument, turned to its player
  for (const x of [0.75, 13.35]) { k.box(x - 0.18, x + 0.18, 0.1, 1.05, 0.6, 0.95, MT.dark); k.box(x - 0.13, x + 0.13, 0.65, 0.92, 0.95, 0.97, MT.metal, nc); } // speakers in the corners
  const scroll = (text, sub, x, y, z, rot, w = 0.55, h = 1.5) => k.plane(tex(256, 700, (g) => { g.fillStyle = '#b89a63'; g.fillRect(0, 0, 256, 700); g.fillStyle = '#f7f1e0'; g.fillRect(16, 46, 224, 608); g.fillStyle = '#5b3a1e'; g.fillRect(0, 0, 256, 22); g.fillRect(0, 678, 256, 22); g.fillStyle = '#1a1512'; g.font = '900 108px "Noto Serif TC","Kaiti TC",serif'; g.textAlign = 'center'; [...text].forEach((t, n) => g.fillText(t, 128, 165 + n * 135)); g.fillStyle = '#b3121f'; g.fillRect(186, 596, 40, 40); g.fillStyle = '#fff'; g.font = '700 16px serif'; g.fillText(sub, 206, 622); }), w, h, x, y, z, rot, { emissive: 0.2 });
  scroll('高山流水', '古箏', 3.7, 1.75, ZB + 0.03, 0); scroll('漁舟唱晚', '中原', 10.3, 1.75, ZB + 0.03, 0);
  k.plane(tex(512, 220, (g) => { g.fillStyle = '#3d2a17'; g.fillRect(0, 0, 512, 220); g.fillStyle = '#6a4a26'; g.fillRect(10, 10, 492, 200); g.fillStyle = '#f0dfb2'; g.font = '900 110px "Noto Serif TC","Kaiti TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('弦歌不輟', 256, 112); }), 1.9, 0.6, 7, 2.6, ZB + 0.03, 0, { emissive: 0.25 }); // plaque over the board

  // ---------------- west wall: wall rack with the instrument cases, glazed cabinet, poster, calendar ----------------
  k.box(XW, 1.0, 0.1, 0.22, 6.2, 9.9, MT.rose); k.box(XW, 1.0, 2.12, 2.2, 6.2, 9.9, MT.rose, nc);
  for (let i = 0; i <= 5; i++) k.box(XW, 1.0, 0.22, 2.12, 6.2 + i * 0.73, 6.24 + i * 0.73, MT.rose, nc);
  k.wallRect(XW, 1.02, 6.2, 9.9, 0, 2.2);
  ['#2a2a2e', '#1d3b6a', '#5a1620', '#2a2a2e', '#24503a'].forEach((c, i) => { k.box(0.52, 0.86, 0.24, 2.0, 6.42 + i * 0.73, 6.78 + i * 0.73, c, nc); k.box(0.86, 0.88, 1.0, 1.2, 6.55 + i * 0.73, 6.65 + i * 0.73, MT.metal, nc); });
  k.plane(tex(256, 360, (g) => { const gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#1f3b5c'); gr.addColorStop(1, '#8b1e2b'); g.fillStyle = gr; g.fillRect(0, 0, 256, 360); g.fillStyle = '#f4e6c4'; g.font = '900 40px "Noto Serif TC",serif'; g.textAlign = 'center'; g.fillText('古箏社', 128, 80); g.fillText('期末成發', 128, 130); g.font = '700 24px "Noto Sans TC",sans-serif'; g.fillText('學生活動中心', 128, 250); g.fillText('入場免費', 128, 290); }), 0.7, 1.0, XW + 0.02, 1.75, 3.6, Math.PI / 2);
  // east wall: photo wall, certificates, a cabinet with scores and trophies
  k.box(XE - 0.42, XE, 0.1, 1.0, 1.4, 4.6, MT.rose); k.box(XE - 0.44, XE - 0.42, 0.15, 0.95, 2.98, 3.02, MT.dark, nc); k.box(XE - 0.45, XE + 0, 1.0, 1.04, 1.36, 4.64, MT.dark, nc);
  [[1.7, 0.3], [2.1, 0.24], [2.5, 0.36]].forEach(([z, h]) => { k.box(XE - 0.27, XE - 0.15, 1.04, 1.1, z - 0.06, z + 0.06, MT.dark, nc); k.box(XE - 0.24, XE - 0.18, 1.1, 1.1 + h, z - 0.03, z + 0.03, MT.brass, nc); k.box(XE - 0.27, XE - 0.15, 1.1 + h * 0.6, 1.1 + h, z - 0.07, z + 0.07, MT.brass, nc); });
  for (let i = 0; i < 14; i++) k.box(XE - 0.3, XE - 0.1, 1.04, 1.3 + (i * 7 % 5) * 0.012, 3.2 + i * 0.075, 3.26 + i * 0.075, ['#7a1626', '#1d3b6a', '#c9b98a', '#24503a', '#efe9da'][i % 5], nc); // scores
  const photo = (n) => tex(256, 180, (g) => { g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, 256, 180); g.fillStyle = ['#5a2b30', '#2e4058', '#3d4a36', '#6b5138'][n % 4]; g.fillRect(12, 12, 232, 156); for (let i = 0; i < 7; i++) { const x = 36 + i * 31, y = 78 + (i % 2) * 14; g.fillStyle = ['#efd0b2', '#e2b893'][i % 2]; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = ['#8b1e2b', '#f1e7d8', '#24503a'][(i + n) % 3]; g.fillRect(x - 11, y + 9, 22, 44); } g.fillStyle = '#7d4522'; g.fillRect(28, 136, 200, 12); });
  for (let i = 0; i < 6; i++) k.plane(photo(i), 0.52, 0.37, XE - 0.012, 2.1 - Math.floor(i / 3) * 0.5, 1.8 + (i % 3) * 0.66, -Math.PI / 2, { emissive: 0.2 });
  k.plane(tex(512, 360, (g) => { g.fillStyle = '#25313b'; g.fillRect(0, 0, 512, 360); g.fillStyle = '#e8e2d0'; g.font = '900 34px "Noto Sans TC",sans-serif'; g.fillText('古箏社 出席與分部', 24, 52); g.font = '700 25px "Noto Sans TC",sans-serif'; ['第一聲部　小琪', '第二聲部　小萱', '低音　　　阿宇', '指導　　　蓋瑞（幹部）'].forEach((t, n) => { g.fillStyle = n % 2 ? '#cfe0c8' : '#f2d9a8'; g.fillText(t, 28, 106 + n * 48); }); }), 1.5, 1.05, XE - 0.012, 1.65, 6.4, -Math.PI / 2, { emissive: 0.2 }); // blackboard
  k.box(XE - 0.3, XE, 2.15, 2.55, 7.9, 9.1, MT.white, nc); k.box(XE - 0.31, XE - 0.3, 2.18, 2.24, 7.98, 9.02, MT.metal, nc);                // air conditioner
  // tables by the door: sign-in, tape and picks, tuners, water; shoe shelf; stacked stools; a plant
  k.box(9.6, 11.2, 0.8, 0.84, 9.5, 10.15, MT.rose, nc); for (const x of [9.66, 11.14]) for (const z of [9.56, 10.09]) k.box(x - 0.025, x + 0.025, 0.1, 0.8, z - 0.025, z + 0.025, MT.dark, nc); k.wallRect(9.6, 11.2, 9.5, 10.15, 0, 0.9);
  k.box(9.75, 10.05, 0.84, 0.86, 9.65, 9.9, MT.paper, nc); k.box(10.2, 10.5, 0.84, 0.9, 9.62, 9.82, '#c9ced4', nc); k.box(10.24, 10.46, 0.9, 0.905, 9.66, 9.78, '#f0d9a0', nc); for (const x of [10.65, 10.78, 10.91]) k.box(x - 0.03, x + 0.03, 0.84, 1.04, 9.68, 9.74, '#8fb7c9', nc); k.box(10.7, 10.8, 0.84, 0.87, 9.92, 10.0, MT.dark, nc);
  k.box(4.2, 5.6, 0.1, 0.5, 9.75, 10.2, MT.rose); for (let i = 0; i < 4; i++) k.box(4.3 + i * 0.33, 4.52 + i * 0.33, 0.5, 0.58, 9.82, 10.1, ['#f2f2f2', '#2a2a2c', '#c9d2d8', '#b03a2e'][i], nc);
  for (let i = 0; i < 4; i++) k.box(12.4, 12.75, 0.1 + i * 0.2, 0.16 + i * 0.2, 9.5, 9.85, MT.rose, nc); k.wallRect(12.4, 12.75, 9.5, 9.85, 0, 1);
  k.cyl(13.4, 9.85, 0.2, 0.1, 0.5, MT.dark, { r1: 0.24, col: true }); for (let i = 0; i < 9; i++) { const a = i * 0.7, g = new THREE.ConeGeometry(0.09, 0.9, 5); g.rotateZ(0.35); g.rotateY(a); g.translate(13.4 - Math.cos(a) * 0.14, 0.95, 9.85 + Math.sin(a) * 0.14); k._part(MT.leaf, g); }
  k.plane(tex(160, 160, (g) => { g.fillStyle = '#f7f5ee'; g.beginPath(); g.arc(80, 80, 76, 0, 7); g.fill(); g.strokeStyle = '#2a1a10'; g.lineWidth = 7; g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(80, 80); g.lineTo(80, 36); g.moveTo(80, 80); g.lineTo(112, 96); g.stroke(); }), 0.36, 0.36, 5, 2.5, ZS - 0.02, Math.PI, { transparent: true, emissive: 0.2 }); // clock over the door side
  k.finish(scene);
  const X0 = CLUB.ox, Z0 = CLUB.oz, g0 = Hg(X0 + W / 2, Z0 + D / 2);
  I.zones.push({ name: '古箏社教室', pts: [[X0 + 0.3, Z0 + 0.3], [X0 + W, Z0 + 0.3], [X0 + W, -117.4], [X0 + 0.3, -117.4]], y0: F3 - g0 - 0.4, y1: c - g0, ceil: () => c - g0 - 0.15, floorOf: () => 3 });
  const at = (x, z, h = 0) => { const q = k.w(x, z); return { x: q[0], z: q[1], h }; };
  return {
    k, F3,
    play: at(7, 1.54, 0),                   // on the teacher's stool, facing the class (south)
    tidy: at(1.6, 7.4, -Math.PI / 2),      // at the cabinet with the cases
    seats: seats.map(([x, z]) => at(x, z, Math.PI)), // members, facing the front (north)
    stand: [at(12.6, 3.2, Math.PI / 2), at(11.8, 9.2, -0.6)],  // by the banner; just inside the door
    door: at((d0 + d1) / 2, CZ + 1.0), inside: (x, z) => x > X0 && x < X0 + W && z > Z0 && z < Z0 + D + 0.3,
  };
}

// the classroom's outline (src/core/Game.js keeps trees and street furniture off it)
export function clubFootprint() { const { ox, oz, W, D } = CLUB; return [[ox - 0.5, oz - 0.5], [ox + W, oz - 0.5], [ox + W, oz + D], [ox - 0.5, oz + D]]; }
