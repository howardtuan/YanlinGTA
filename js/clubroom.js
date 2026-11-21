// 古箏社教室：學生活動中心一樓西南角（像麥當勞佔東北角一樣，sacTrimmedPts 在這裡挖掉一塊，這裡自己蓋）。
// 門在南面人行道上，門上掛「中原大學 古箏社」。教室裡：前面（北牆）白板和社旗、老師位的古箏，
// 下面三排學生的古箏架和琴凳、譜架，西牆的琴盒櫃和成發海報，日光燈。外牆和樓上照活動中心的窗戶樣式蓋回去。
// 黃蓋瑞（js/garry.js）社團時間在這裡：坐在老師位練琴（有撥弦聲），或在琴盒櫃前整理。
// Local frame: origin at the SW corner of 活動中心 (-195, -128.6), x east, z north.
import * as THREE from 'three';

export const CLUB = { ox: -195, oz: -128.6, W: 14, D: 10.4, H: 4.6, top: 13.8 };
const DX0 = 9.2, DX1 = 10.8; // the door in the south wall

function tex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export function buildClubRoom(I, scene, Kit, regMat) {
  const S = CLUB, W = S.W, D = S.D, H = S.H;
  const k = new Kit(I, S.ox, S.oz, 0);
  const std = (o, lift = 0) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.8, ...o }); if (lift) { m.emissive.set(o.color || '#ffffff'); if (o.map) m.emissiveMap = o.map; m.emissiveIntensity = lift; } return m; };
  const wood = tex(256, 256, (g) => { let s = 5; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; for (let y = 0; y < 256; y += 32) { g.fillStyle = `rgb(${150 + r() * 20 | 0},${104 + r() * 14 | 0},${66 + r() * 10 | 0})`; g.fillRect(0, y, 256, 31); g.fillStyle = 'rgba(60,35,15,.3)'; g.fillRect(0, y + 31, 256, 1); } }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  const MO = { // material objects (meshes built here use these); MT holds the Kit keys for the same materials
    floor: std({ map: wood, roughness: 0.5 }, 0.18), wall: std({ color: '#f3eee2' }, 0.3), ceil: std({ color: '#f7f6f2' }, 0.45),
    rose: std({ color: '#7a4a28', roughness: 0.45 }, 0.12), dark: std({ color: '#2a1a10', roughness: 0.5 }, 0.08),
    white: std({ color: '#fbfbf8', roughness: 0.3 }, 0.25), metal: std({ color: '#b9bec3', metalness: 0.7, roughness: 0.3 }),
    light: new THREE.MeshStandardMaterial({ color: '#fff8ea', emissive: '#fff4dc', emissiveIntensity: 1.1 }),
  };
  const MT = Object.fromEntries(Object.entries(MO).map(([n, m]) => [n, regMat('cz' + n, m)]));
  const nc = { col: false };
  // ---------------- shell: walls with the 活動中心 windows outside, the upper floors over it ----------------
  k.box(0, W, -0.5, 0.1, 0, D, MT.floor, { col: false, tile: [1.2, 1.2] });
  I.addSurface(k.rect(0.2, W - 0.2, 0.2, D - 0.2), 0.1);
  k.box(0, 0.3, 0, H, 0, D, 'winWall', { tile: [3.0, H] });                       // west (outside)
  k.box(0, DX0, 0, H, 0, 0.3, 'winWall', { tile: [3.0, H] }); k.box(DX1, W, 0, H, 0, 0.3, 'winWall', { tile: [3.0, H] }); // south (outside)
  k.box(DX0, DX1, 2.5, H, 0, 0.3, 'sac');
  k.box(W - 0.3, W, 0, H, 0, D, MT.wall); k.box(0, W, 0, H, D - 0.3, D, MT.wall);   // inside walls to the rest of the building
  k.box(0, W, H, S.top, 0, D, 'winWall', { col: false, tile: [3.0, 3.07] });       // upper floors
  k.box(-0.05, W + 0.05, S.top - 0.2, S.top, -0.05, D + 0.05, 'gray', nc);
  // inside faces
  k.box(0.3, 0.32, 0.1, H - 0.2, 0.3, D - 0.3, MT.wall, nc); k.box(0.3, W - 0.3, 0.1, H - 0.2, 0.3, 0.32, MT.wall, nc);
  k.box(0.3, W - 0.3, H - 0.25, H - 0.2, 0.3, D - 0.3, MT.ceil, nc);
  for (const x of [3, 7, 11]) for (const z of [3, 7]) k.box(x - 0.7, x + 0.7, H - 0.28, H - 0.25, z - 0.15, z + 0.15, MT.light, nc);
  // door: glass leaf, frame, sign over it
  k.box(DX0 - 0.08, DX0, 0, 2.5, -0.02, 0.32, MT.dark, nc); k.box(DX1, DX1 + 0.08, 0, 2.5, -0.02, 0.32, MT.dark, nc); k.box(DX0, DX1, 2.42, 2.5, -0.02, 0.32, MT.dark, nc);
  const door = new THREE.Group(); door.position.set(DX0 + 0.02, 0.1, 0.15); k.group.add(door);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(DX1 - DX0 - 0.04, 2.3, 0.04), new THREE.MeshStandardMaterial({ color: '#9fd3e6', transparent: true, opacity: 0.35, roughness: 0.05 })); leaf.position.set((DX1 - DX0) / 2, 1.15, 0); door.add(leaf);
  k.plane(tex(512, 128, (g) => { g.fillStyle = '#5a1620'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#d8b46a'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112); g.fillStyle = '#f4e6c4'; g.font = '900 56px "Noto Serif TC","Noto Sans TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('中原大學 古箏社', 256, 66); }), 2.4, 0.6, (DX0 + DX1) / 2, 3.0, -0.02, Math.PI, { emissive: 0.4 });
  // ---------------- front (north wall): whiteboard, club banner, the teacher's guzheng ----------------
  k.box(4.5, 9.5, 1.0, 2.2, D - 0.33, D - 0.3, MT.white, nc); k.box(4.5, 9.5, 0.95, 1.0, D - 0.42, D - 0.3, MT.metal, nc);
  k.plane(tex(512, 128, (g) => { g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#1f3b8a'; g.font = '700 30px "Noto Sans TC",sans-serif'; g.fillText('期末成發曲目：〈高山流水〉〈漁舟唱晚〉', 16, 44); g.fillStyle = '#b3121f'; g.fillText('週三 19:00 全員練團 ✔', 16, 92); }), 4.9, 1.15, 7, 1.6, D - 0.335, Math.PI);
  k.plane(tex(256, 512, (g) => { g.fillStyle = '#8b1e2b'; g.fillRect(0, 0, 256, 512); g.strokeStyle = '#d8b46a'; g.lineWidth = 8; g.strokeRect(10, 10, 236, 492); g.fillStyle = '#f4e6c4'; g.font = '900 64px "Noto Serif TC","Noto Sans TC",serif'; g.textAlign = 'center'; ['古', '箏', '社'].forEach((t, i) => g.fillText(t, 128, 120 + i * 100)); g.font = '700 28px "Noto Sans TC",sans-serif'; g.fillText('CYCU GUZHENG', 128, 460); }), 1.0, 2.0, 11.2, 2.4, D - 0.335, Math.PI, { emissive: 0.2 });
  // ---------------- guzhengs ----------------
  const zheng = (cx, cz, rot) => { // stand + curved soundboard + bridges + strings, merged into the room meshes
    const grp = new THREE.Group(); grp.position.set(cx, 0.1, cz); grp.rotation.y = rot; k.group.add(grp);
    for (const sx of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.3), MO.dark); l.position.set(sx, 0.3, 0); grp.add(l); }
    // soundboard: a long, gently arched rosewood box (top bowed up), dark head and tail blocks
    const body = new THREE.Mesh((() => { const g = new THREE.BoxGeometry(1.62, 0.08, 0.36, 16, 1, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + 0.03 * Math.cos(p.getZ(i) / 0.18 * Math.PI / 2)); g.computeVertexNormals(); return g; })(), MO.rose);
    body.position.y = 0.62; grp.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.37), MO.dark); head.position.set(0.79, 0.64, 0); grp.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.37), MO.dark); tail.position.set(-0.8, 0.635, 0); grp.add(tail);
    const sm = new THREE.MeshBasicMaterial({ color: '#e9e2cf' });
    for (let i = 0; i < 21; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.003, 0.003), sm); s.position.set(0, 0.695, -0.15 + i * 0.015); grp.add(s); const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.012), sm); b.position.set(-0.1 + Math.sin(i * 1.7) * 0.35, 0.68, -0.15 + i * 0.015); grp.add(b); }
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.45, 12), MO.dark); stool.position.set(0, 0.225, -0.6); grp.add(stool);
    k.wallRect(cx - 0.82, cx + 0.82, cz - 0.25, cz + 0.25, 0, 0.8);
    return grp;
  };
  // teacher's guzheng at the front, facing the class (player of it sits on its north side, facing south)
  zheng(7, D - 1.6, Math.PI);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) zheng(2.6 + c * 3.4, 2.0 + r * 2.1, 0);
  // music stands
  for (let c = 0; c < 3; c++) { const x = 2.6 + c * 3.4; k.box(x - 0.02, x + 0.02, 0.1, 1.2, 1.25 + 2.1 * 2 + 0.3, 1.25 + 2.1 * 2 + 0.34, MT.metal, nc); }
  // west wall: cabinet with guzheng cases, a poster
  k.box(0.32, 0.9, 0.1, 2.2, 4.0, 9.6, MT.rose); k.box(0.9, 0.92, 0.15, 2.15, 4.05, 9.55, MT.dark, nc);
  for (let i = 0; i < 4; i++) k.box(1.0, 1.25, 0.1, 1.75, 4.3 + i * 0.45, 4.6 + i * 0.45, ['#2a2a2e', '#1d3b6a', '#2a2a2e', '#5a1620'][i], nc); // cases leaning on it
  k.plane(tex(256, 360, (g) => { const gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#1f3b5c'); gr.addColorStop(1, '#8b1e2b'); g.fillStyle = gr; g.fillRect(0, 0, 256, 360); g.fillStyle = '#f4e6c4'; g.font = '900 40px "Noto Serif TC",serif'; g.textAlign = 'center'; g.fillText('古箏社', 128, 80); g.fillText('期末成發', 128, 130); g.font = '700 24px "Noto Sans TC",sans-serif'; g.fillText('學生活動中心', 128, 250); g.fillText('入場免費', 128, 290); }), 0.7, 1.0, 0.33, 1.8, 2.8, Math.PI / 2);
  k.finish(scene);
  I.zones.push({ name: '古箏社教室', pts: k.rect(0.3, W - 0.3, 0.3, D - 0.3), y0: -0.5, y1: H, ceil: () => H - 0.4 });
  // the door slides open when you come near
  const doorAt = k.w((DX0 + DX1) / 2, 0.15);
  I.updaters.push((dt, g) => { const p = g.player.worldPos(), near = !g.player.vehicle && Math.hypot(p.x - doorAt[0], p.z - doorAt[1]) < 2.4; leaf.position.x += ((near ? -(DX1 - DX0) + 0.15 : (DX1 - DX0) / 2) - leaf.position.x) * Math.min(1, dt * 6); });
  const at = (x, z, h = 0) => { const q = k.w(x, z); return { x: q[0], z: q[1], h }; };
  return {
    k,
    play: at(7, D - 1.6 + 0.6, Math.PI),   // on the teacher's stool, facing the class
    tidy: at(1.4, 6.4, -Math.PI / 2),      // at the cabinet with the cases
    door: at((DX0 + DX1) / 2, -1.0),
  };
}

// the classroom's outline (js/main.js keeps trees and street furniture off it)
export function clubFootprint() { const { ox, oz, W, D } = CLUB; return [[ox - 0.5, oz - 0.5], [ox + W, oz - 0.5], [ox + W, oz + D], [ox - 0.5, oz + D]]; }
