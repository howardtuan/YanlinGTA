// Enterable buildings: 資管系館 (multi-floor, classrooms, stairs, elevator), 麥當勞 (in 活動中心), 警衛室,
// 孫師傅牛肉拉麵 with 彥霖's old room upstairs. The shared kit (textures, materials, Interiors, Kit, finishRow) is in
// js/kit.js; the other hand-built areas (茶學苑那排、大仁街、戈登肉鋪、校內各區) are listed in js/zones.js.
// Provides height-aware walls, walkable surfaces (floors/stairs) and E-key actions.
// All y values here are relative to the building's ground; tools/build_terrain.py
// flattens the terrain around each footprint so that ground is one constant height.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pointInPoly, closestOnSeg } from '../physics/Collision.js';
import { createCharacter } from '../entities/Character.js';
import { dressCrew, CREW_SHIRT } from '../systems/minigames/McUniform.js';
import { H, Hgrid } from './Terrain.js';
const Hterrain = H; // buildMcD shadows H with the store height
import { ctex, font, T, MATS, M, regMat, Interiors, Kit, finishRow, lcg, YHT } from './Kit.js';
import { buildGarryHome } from './buildings/GarryHome.js';
import { buildClubCorner } from './buildings/ClubRoom.js';
import { buildZones } from './zones/Zones.js';
// the kit moved to js/kit.js; these stay importable from here for the modules that already do
export { T, regMat, Interiors, Kit, finishRow };

// =====================================================================
// 資訊管理學系館 — modelled after the real building photo:
// 3 floors, open front corridors with grey diamond-pattern parapets + red trim,
// green dado + red doors on the ground floor, glass lift tower with red frame (left),
// beige-tile stair tower with vertical 「資訊管理學系」 (right), roof band with diamonds.
// =====================================================================
// NOTE: tools/build_terrain.py flattens the terrain under this footprint from a
// copy of these numbers; after changing them, sync it and rerun the script.
export const IM_SPEC = { ox: 79.9, oz: 92.6, ang: Math.atan2(16.9, 49.3), L: 46, D: 12.5, FH: 3.8, NF: 3 };
export function imFootprint() {
  const { ox, oz, ang, L, D } = IM_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(-5, -0.5), w(L + 6.5, -0.5), w(L + 6.5, D + 4), w(-5, D + 4)];
}
function buildIM(I, scene) {
  const { ox, oz, ang, L, D, FH, NF } = IM_SPEC;
  const k = new Kit(I, ox, oz, ang);
  const CZ = 9.5, NR = 4, RW = L / NR, TOP = FH * NF;
  const rooms = [];
  for (let f = 0; f < NF; f++) {
    const y0 = f * FH;
    // floor slab
    if (f === 0) k.box(0, L, 0, 0.12, 0, D, 'floor', { col: false, surface: true, tile: [2, 2] });
    else k.box(0, L, y0 - 0.25, y0, 0, D + 0.3, 'floor', { col: false, surface: true, tile: [2, 2] });
    // back wall (windows)
    k.box(0, L, y0, y0 + FH, 0, 0.25, 'winWall', { tile: [3.2, FH] });
    // end walls of classroom zone
    k.box(0, 0.25, y0, y0 + FH, 0.25, CZ, 'white');
    k.box(L - 0.25, L, y0, y0 + FH, 0.25, CZ, 'white');
    for (let i = 1; i < NR; i++) k.box(i * RW - 0.1, i * RW + 0.1, y0, y0 + FH, 0.25, CZ - 0.25, 'wallIn');
    for (let i = 0; i < NR; i++) {
      const rx = i * RW;
      // front wall with door
      k.box(rx, rx + 1.2, y0, y0 + FH, CZ - 0.25, CZ, 'winWall', { tile: [3.2, FH] });
      k.box(rx + 2.3, rx + RW, y0, y0 + FH, CZ - 0.25, CZ, 'winWall', { tile: [3.2, FH] });
      k.box(rx + 1.2, rx + 2.3, y0 + 2.3, y0 + FH, CZ - 0.25, CZ, 'white', { col: false });
      k.box(rx + 2.3, rx + 2.36, y0 + 0.02, y0 + 2.28, CZ, CZ + 1.0, 'door', { col: false }); // open door leaf
      // room number
      const no = `${f + 1}0${i + 1}`;
      k.plane(T.sign(`資管系 ${no}`, '#1f3b73', '#ffffff', `room${  no}`, 256, 64, 34), 0.9, 0.22, rx + 1.75, y0 + 2.55, CZ + 0.02);
      // blackboard + teacher desk (students face -x)
      k.box(rx + 0.3, rx + 0.36, y0 + 0.95, y0 + 2.25, 2.0, 7.8, 'board', { col: false });
      k.box(rx + 1.0, rx + 1.7, y0, y0 + 0.9, 3.8, 5.8, 'desk');
      // desks and chairs (rooms 101 and 301 are computer labs)
      const lab = i === 0 && (f === 0 || f === 2);
      if (lab) k.plane(T.sign('電腦教室', '#c0202b', '#ffffff', `lab${  no}`, 256, 64, 40), 0.9, 0.22, rx + 1.75, y0 + 2.85, CZ + 0.02);
      for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 4; iz++) {
        const dx = rx + 3.2 + ix * 1.6, dz = 1.4 + iz * 2.0;
        if (lab) {
          k.box(dx + 0.06, dx + 0.1, y0 + 0.8, y0 + 1.2, dz + 0.25, dz + 0.85, 'screen', { col: false });
          k.box(dx + 0.02, dx + 0.06, y0 + 0.78, y0 + 1.22, dz + 0.23, dz + 0.87, 'dark', { col: false });
          k.box(dx + 0.0, dx + 0.2, y0 + 0.76, y0 + 0.8, dz + 0.45, dz + 0.65, 'dark', { col: false });
          k.box(dx + 0.25, dx + 0.42, y0 + 0.76, y0 + 0.78, dz + 0.3, dz + 0.8, 'dark', { col: false });
          const cp = k.w(dx + 0.9, dz + 0.55);
          I.actions.push({ x: cp[0], z: cp[1], r: 0.75, y: y0, label: () => '按 <kbd>E</kbd> 使用電腦', fn: (g) => g.pc.open(`資管系 ${no} 電腦教室`) }); // desktop; the old easter-egg video is its 🎬 app
        }
        k.box(dx, dx + 0.55, y0 + 0.72, y0 + 0.76, dz, dz + 1.1, 'desk', { col: false });
        k.box(dx + 0.02, dx + 0.53, y0, y0 + 0.72, dz + 0.04, dz + 0.1, 'metal', { col: false });
        k.box(dx + 0.02, dx + 0.53, y0, y0 + 0.72, dz + 1.0, dz + 1.06, 'metal', { col: false });
        k.wallRect(dx, dx + 0.55, dz, dz + 1.1, y0, y0 + 0.76);
        // chair behind desk
        k.box(dx + 0.7, dx + 1.1, y0 + 0.42, y0 + 0.47, dz + 0.35, dz + 0.75, 'chairBlue', { col: false });
        k.box(dx + 1.06, dx + 1.1, y0 + 0.47, y0 + 0.95, dz + 0.35, dz + 0.75, 'chairBlue', { col: false });
        k.box(dx + 0.85, dx + 0.95, y0, y0 + 0.42, dz + 0.5, dz + 0.6, 'metal', { col: false });
      }
      // ceiling lights
      for (let lx = 0; lx < 3; lx++) k.box(rx + 2.5 + lx * 3, rx + 3.7 + lx * 3, y0 + FH - 0.3, y0 + FH - 0.26, 3, 6.5, 'light', { col: false });
      rooms.push({ x: rx + RW / 2, y: y0, f, i });
    }
    // corridor lights
    for (let lx = 2; lx < L; lx += 6) k.box(lx, lx + 0.8, y0 + FH - 0.3, y0 + FH - 0.26, 10.6, 11.4, 'light', { col: false });
    // ground floor: green dado on corridor-facing wall
    if (f === 0) k.box(0, L, 0, 1.0, CZ, CZ + 0.05, 'green', { col: false });
    else {
      // balcony parapet (grey + white diamonds), red trim, metal rail
      k.box(0, L, y0, y0 + 1.05, D - 0.25, D, 'diamond', { tile: [1.6, 1.05] });
      k.box(0, L, y0 + 1.05, y0 + 1.15, D - 0.3, D + 0.06, 'red', { col: false });
      k.box(0, L, y0 + 1.55, y0 + 1.6, D - 0.2, D - 0.12, 'metal', { col: false });
      for (let x = 0.5; x < L; x += 2) k.box(x, x + 0.04, y0 + 1.15, y0 + 1.55, D - 0.2, D - 0.15, 'metal', { col: false });
      k.wallLine(0, D - 0.1, L, D - 0.1, y0, y0 + 1.6);
      // beam band under each slab
      k.box(0, L, y0 - 0.85, y0 - 0.25, D, D + 0.3, 'diamond', { col: false, tile: [1.6, 0.6] });
    }
  }
  // pillars along the corridor front
  for (let x = 0; x <= L + 0.01; x += L / 8) k.box(x - 0.22, x + 0.22, 0, TOP, D - 0.45, D - 0.01, 'white');
  // roof slab, roof band with diamonds, solar panels
  k.box(-0.2, L + 0.2, TOP - 0.25, TOP, -0.2, D + 0.35, 'gray', { col: false });
  k.box(-0.2, L + 0.2, TOP, TOP + 1.5, D, D + 0.35, 'diamond', { col: false, tile: [1.6, 1.5] });
  k.box(-0.2, L + 0.2, TOP, TOP + 0.6, -0.2, 0.1, 'gray', { col: false });
  for (let x = 2; x < L - 3; x += 3.2) { k.box(x, x + 2.8, TOP + 0.4, TOP + 0.5, 2, 8.5, 'solar', { col: false }); }
  // campaign banner on the 2F parapet (like the red banner in the photo)
  k.plane(T.banner(), 9, 1.4, L / 2 - 2, FH + 0.55, D + 0.08);

  // ---- glass lift tower (left) with red frame ----
  const ex0 = -4.5, ez0 = 7, ez1 = D, eh = TOP + 1.2;
  k.box(ex0, ex0 + 0.12, 0, eh, ez0, ez1, 'glass');
  k.box(ex0, 0, 0, eh, ez0, ez0 + 0.12, 'glass');
  k.box(ex0, 0, 0, eh, ez1 - 0.12, ez1, 'glass');
  for (const [x, z] of [[ex0, ez0], [ex0, ez1], [0, ez0], [0, ez1]]) k.box(x - 0.15, x + 0.15, 0, eh, z - 0.15, z + 0.15, 'red', { col: false });
  k.box(ex0 - 0.2, 0.2, eh - 0.6, eh, ez0 - 0.2, ez1 + 0.2, 'red', { col: false });
  for (let f = 1; f <= NF; f++) k.box(ex0, 0, f * FH - 0.12, f * FH, ez0, ez1, 'red', { col: false });
  const cab = new THREE.Group(); // moving lift cab
  const cabMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 4.6), M('metal')); cabMesh.position.set(-2.25, 0.08, 9.75); cab.add(cabMesh);
  k.group.add(cab);
  for (let f = 0; f < NF; f++) k.box(ex0 + 0.12, 0, f * FH - 0.1, f * FH + 0.1, ez0 + 0.12, ez1 - 0.12, 'metal', { col: false, surface: true });
  // ---- beige stair tower (right) ----
  const sx = L, sw = 6, sh = TOP + 2;
  k.box(sx + sw - 0.25, sx + sw, 0, sh, 0, D, 'beige', { tile: [1.5, 1.5] });
  k.box(sx, sx + sw, 0, sh, 0, 0.25, 'beige', { tile: [1.5, 1.5] });
  k.box(sx, sx + sw, 0, sh, D - 0.25, D, 'beige', { tile: [1.5, 1.5] });
  k.box(sx, sx + 0.25, TOP, sh, 0, D, 'beige', { col: false, tile: [1.5, 1.5] });
  k.box(sx - 0.2, sx + sw + 0.2, sh, sh + 0.2, -0.2, D + 0.2, 'gray', { col: false });
  k.plane(T.verticalText('資訊管理學系', 'im'), 1.1, 6.6, sx + 3, 7.0, D + 0.03, 0, { transparent: true });
  const half = FH / 2;
  for (let f = 0; f < NF; f++) {
    const y0 = f * FH;
    // landing to the corridor
    k.box(sx + 0.25, sx + sw - 0.25, f === 0 ? 0 : y0 - 0.2, f === 0 ? 0.12 : y0, 11, D - 0.25, 'floor', { col: false, surface: true, tile: [2, 2] });
    if (f < NF - 1) {
      // flight A (x: sx+0.25..sx+2.9) up toward -z, then landing, then flight B back toward +z
      const A0 = sx + 0.25, A1 = sx + 2.9, B0 = sx + 3.1, B1 = sx + sw - 0.25;
      for (let j = 0; j < 12; j++) {
        const z1 = 11 - j * 0.5, z0 = z1 - 0.5, h = y0 + (j + 1) * half / 12;
        k.box(A0, A1, h - 0.35, h, z0, z1, 'floor', { col: false });
        const hb = y0 + half + (j + 1) * half / 12, zb0 = 5 + j * 0.5;
        k.box(B0, B1, hb - 0.35, hb, zb0, zb0 + 0.5, 'floor', { col: false });
      }
      I.addSurface(k.rect(A0, A1, 5, 11), (x, z) => { const lz = k.l(x, z)[1]; return y0 + Math.max(0, Math.min(1, (11 - lz) / 6)) * half; });
      I.addSurface(k.rect(B0, B1, 5, 11), (x, z) => { const lz = k.l(x, z)[1]; return y0 + half + Math.max(0, Math.min(1, (lz - 5) / 6)) * half; });
      k.box(A0, B1, y0 + half - 0.2, y0 + half, 0.25, 5, 'floor', { col: false, surface: true, tile: [2, 2] });
      k.box(A1, B0, y0, y0 + FH, 5, 11, 'beige', { tile: [1.5, 1.5] }); // centre wall
      // handrails
      k.box(A0, A0 + 0.05, y0 + 0.9, y0 + half + 0.95, 5, 11, 'metal', { col: false });
      if (f === 0) k.wallLine(B0, 10.9, B1, 10.9, 0, 1.5); // no walking under flight B on the ground floor
    } else {
      // top floor: railing across the stair well (flight A side)
      k.box(sx + 0.25, sx + 2.9, y0, y0 + 1.1, 10.95, 11.05, 'metal');
    }
  }
  k.finish(scene);
  // interior zone (camera + location name)
  I.zones.push({ name: '資訊管理學系館', pts: k.rect(-4.5, L + sw, 0, D), y0: 0, y1: TOP, ceil: (y) => Math.floor((y + 0.3) / FH) * FH + FH - 0.35, floorOf: (y) => Math.min(NF, Math.floor((y + 0.3) / FH) + 1) });
  // lift: E cycles floors
  let liftTarget = null, liftY = 0;
  I.actions.push({
    poly: k.rect(ex0 + 0.2, -0.2, ez0 + 0.2, ez1 - 0.2), y: 0, anyY: true,
    label: () => '按 <kbd>E</kbd> 搭電梯（1F → 2F → 3F）',
    fn: (g) => {
      const p = g.player; const cur = Math.round(p.y / FH); const next = (cur + 1) % NF;
      liftTarget = next * FH; g.audio.lift(); g.hud.toast(`電梯 → ${next + 1}F`, 'good', 1200);
      { const dy = liftTarget + 0.12 - p.y; p.y += dy; p.pos.y += dy; p.vy = 0; } // the feet go along (js/player.js compares the two)
    },
  });
  I.updaters.push((dt, g) => { const t = liftTarget ?? 0; liftY += (t - liftY) * Math.min(1, dt * 3); cab.position.y = liftY; });
  return { k, rooms, frontPoint: k.w(L / 2, D + 4), classroom: (f, i) => k.w(i * RW + RW / 2, 5), FH };
}

// =====================================================================
// 麥當勞 inside the east end of 學生活動中心
// =====================================================================
// NOTE: tools/build_terrain.py flattens the terrain under this footprint from a
// copy of these numbers; after changing them, sync it and rerun the script.
export const MCD_SPEC = { x0: -136, x1: -112, z0: -114, z1: -94, H: 4.6, top: 14 };
// the store is turned 180° (Kit origin at the SE corner, js/zone_g.js B1 plan): its lobby opens westwards (shop-local
// x = W, z MCD_OPEN) onto the B1 學餐用餐區 under the 活動中心 (js/sac_b1.js), the rest of that side is a wall to the stair hall
export const MCD_OPEN = [3.9, 9.6];
export function sacTrimmedPts() {
  // SE corner: 麥當勞 (buildMcD); NW corner: js/clubroom.js (CLUB 14 x 10.4 m: closed, 古箏社教室 on 3F)
  return [[-181, -128.55], [-163.2, -128.4], [-112, -129.9], [-112, -114], [-136, -114], [-136, -94.4], [-144.4, -94.4], [-195.2, -94.5], [-195.05, -118.2], [-181, -118.2]];
}
// Look of the real store (photos of 中原大學麥當勞): dark grey 60 cm floor tiles, white grid ceiling with
// square downlights, white counter on a black plinth under a dropped soffit with digital menu boards,
// charcoal banquette under a black & white mural, oak tables with bentwood chairs, a long stainless
// communal table under white drum pendants, a striped accent wall, oak panels, yellow trash cabinets,
// dark fascia with white "McDonald's". All textures are drawn here (no photos are used).
function archPath(g, x, y, w, h, lw) {
  // golden-arches style double hump, drawn as two thick parabolic strokes
  g.lineWidth = lw; g.lineCap = 'butt'; g.beginPath();
  const b = y + h, hw = w / 4;
  g.moveTo(x + lw / 2, b); g.bezierCurveTo(x + lw / 2, y - h * 0.15, x + hw * 2 - lw * 0.1, y - h * 0.15, x + hw * 2, b * 0.55 + y * 0.45);
  g.bezierCurveTo(x + hw * 2 + lw * 0.1, y - h * 0.15, x + w - lw / 2, y - h * 0.15, x + w - lw / 2, b);
  g.stroke();
}
function foodIcon(g, kind, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (kind === 'burger') {
    g.fillStyle = '#e0a04a'; g.beginPath(); g.ellipse(0, -10, 34, 20, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#f2e6c8'; for (let i = 0; i < 7; i++) g.fillRect(-24 + i * 8, -22 + (i % 2) * 4, 3, 2);
    g.fillStyle = '#5fae3a'; g.fillRect(-36, -10, 72, 5); g.fillStyle = '#ffcc33'; g.fillRect(-34, -5, 68, 4);
    g.fillStyle = '#6a3518'; g.beginPath(); g.roundRect(-35, -1, 70, 10, 4); g.fill();
    g.fillStyle = '#d99640'; g.beginPath(); g.roundRect(-33, 9, 66, 11, 6); g.fill();
  } else if (kind === 'fries') {
    g.fillStyle = '#f7c948'; for (let i = 0; i < 8; i++) g.fillRect(-20 + i * 5.2, -34 + (i * 7) % 10, 4, 30);
    g.fillStyle = '#db0007'; g.beginPath(); g.moveTo(-24, -10); g.quadraticCurveTo(0, -18, 24, -10); g.lineTo(18, 22); g.lineTo(-18, 22); g.closePath(); g.fill();
    g.strokeStyle = '#ffc72c'; g.lineWidth = 3; archPath(g, -9, -4, 18, 10, 3);
  } else if (kind === 'drink') {
    g.fillStyle = '#f4f4f2'; g.beginPath(); g.moveTo(-17, -24); g.lineTo(17, -24); g.lineTo(13, 24); g.lineTo(-13, 24); g.closePath(); g.fill();
    g.fillStyle = '#db0007'; g.fillRect(-15, -4, 30, 12); g.fillStyle = '#ddd'; g.fillRect(-19, -29, 38, 5); g.fillStyle = '#ffbc0d'; g.fillRect(4, -44, 3, 16);
  } else if (kind === 'nugget') {
    g.fillStyle = '#db0007'; g.fillRect(-26, -2, 52, 22);
    g.fillStyle = '#d99a52'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(-18 + i * 9, -6 + (i % 2) * 3, 8, 6, i * 0.5, 0, 7); g.fill(); }
  } else if (kind === 'cone') {
    g.fillStyle = '#d6a05a'; g.beginPath(); g.moveTo(-11, 0); g.lineTo(11, 0); g.lineTo(0, 30); g.closePath(); g.fill();
    g.fillStyle = '#fbf7ec'; g.beginPath(); g.arc(0, -6, 13, 0, 7); g.fill(); g.beginPath(); g.arc(0, -18, 8, 0, 7); g.fill();
  } else if (kind === 'chicken') {
    g.fillStyle = '#c9772e'; g.beginPath(); g.ellipse(0, 0, 30, 20, -0.3, 0, 7); g.fill();
    g.fillStyle = '#e3a356'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-18 + (i % 5) * 9, -6 + Math.floor(i / 5) * 10, 4, 0, 7); g.fill(); }
  }
  g.restore();
}
const MCT = {
  floor: () => ctex('mcTile', 256, 256, (g) => {
    const r = lcg(7);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const v = 116 + Math.floor(r() * 14); g.fillStyle = `rgb(${v + 6},${v + 3},${v})`; g.fillRect(i * 128, j * 128, 128, 128);
      for (let n = 0; n < 700; n++) { const q = Math.floor(v + (r() - 0.5) * 30); g.fillStyle = `rgba(${q + 5},${q + 2},${q},0.35)`; g.fillRect(i * 128 + r() * 128, j * 128 + r() * 128, 1.5, 1.5); }
    }
    g.fillStyle = 'rgba(78,74,70,0.9)'; for (const k of [0, 128]) { g.fillRect(k, 0, 2, 256); g.fillRect(0, k, 256, 2); }
  }),
  lobby: () => ctex('mcLobby', 256, 256, (g) => {
    // the corridor floor in the photo: big beige tiles framed by terracotta bands, laid on the diagonal
    const r = lcg(5); g.fillStyle = '#d9c39a'; g.fillRect(0, 0, 256, 256);
    for (let n = 0; n < 900; n++) { const q = 200 + Math.floor((r() - 0.5) * 30); g.fillStyle = `rgba(${q},${q - 22},${q - 60},0.3)`; g.fillRect(r() * 256, r() * 256, 2, 2); }
    g.save(); g.translate(128, 128); g.rotate(Math.PI / 4); g.strokeStyle = 'rgba(140,110,70,0.5)'; g.lineWidth = 2;
    for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 45, -200); g.lineTo(i * 45, 200); g.stroke(); g.beginPath(); g.moveTo(-200, i * 45); g.lineTo(200, i * 45); g.stroke(); }
    g.restore();
    g.fillStyle = '#a4553a'; g.fillRect(0, 0, 256, 18); g.fillRect(0, 0, 18, 256);
    g.fillStyle = 'rgba(70,35,20,0.6)'; for (let i = 0; i < 256; i += 18) { g.fillRect(i, 0, 1.5, 18); g.fillRect(0, i, 18, 1.5); }
  }),
  quarry: () => ctex('mcQuarry', 128, 128, (g) => {
    const r = lcg(9);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const v = Math.floor(r() * 14); g.fillStyle = `rgb(${150 + v},${70 + v},${50 + v})`; g.fillRect(i * 64, j * 64, 64, 64); }
    g.fillStyle = '#5c3a2c'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 2); g.fillRect(0, 0, 2, 128); g.fillRect(64, 0, 2, 128);
  }),
  ceil: () => ctex('mcCeil', 128, 128, (g) => {
    const r = lcg(3); g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, 128, 128);
    for (let n = 0; n < 900; n++) { g.fillStyle = `rgba(150,148,140,${0.08 + r() * 0.12})`; g.fillRect(r() * 128, r() * 128, 1.3, 1.3); }
    g.fillStyle = '#c9c7c1'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128);
  }),
  oak: () => ctex('mcOak', 256, 256, (g) => {
    const r = lcg(11);
    for (let p = 0; p < 4; p++) {
      const base = [164, 124, 86].map(c => c + Math.floor((r() - 0.5) * 18)); g.fillStyle = `rgb(${base})`; g.fillRect(p * 64, 0, 64, 256);
      for (let n = 0; n < 26; n++) { const x = p * 64 + r() * 64, d = (r() - 0.5) * 30; g.strokeStyle = `rgba(${90 + d},${62 + d},${40 + d},${0.25 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 1.4; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 8, 90, x + (r() - 0.5) * 8, 170, x + (r() - 0.5) * 6, 256); g.stroke(); }
      g.fillStyle = 'rgba(60,40,26,0.55)'; g.fillRect(p * 64, 0, 1.5, 256);
    }
  }),
  blackTile: () => ctex('mcBlackTile', 64, 64, (g) => { g.fillStyle = '#1c1d20'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a3c40'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(4, 4, 20, 56); }),
  stripes: () => ctex('mcStripes', 1024, 64, (g) => {
    const cols = ['#ffbc0d', '#f3f1ec', '#3a3c40', '#db0007', '#f3f1ec', '#ffbc0d', '#c9c9c9', '#f28c28', '#3a3c40', '#f3f1ec', '#db0007', '#ffbc0d', '#f3f1ec', '#3a3c40', '#f28c28', '#ffbc0d', '#f3f1ec', '#c9c9c9', '#db0007', '#3a3c40'];
    const w = [70, 38, 22, 40, 60, 30, 46, 52, 18, 64, 26, 58, 40, 24, 48, 66, 34, 50, 36, 28];
    const tot = w.reduce((a, b) => a + b, 0); let x = 0;
    cols.forEach((c, i) => { const ww = w[i] / tot * 1024; g.fillStyle = c; g.fillRect(x, 0, ww + 1, 64); x += ww; });
  }, false),
  mural: () => ctex('mcMural', 2048, 430, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#202124'); gr.addColorStop(0.55, '#2c2d31'); gr.addColorStop(1, '#3d3e42'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = lcg(21), words = ['中原', '資管', '順起來', '彥霖', '薯條', '大麥克', '下課了', '宵夜', '期中考', '社團', 'MUSIC', 'PLAY', 'LOVE', '夜市', '同學', '週末'];
    g.fillStyle = 'rgba(240,240,236,0.75)'; g.font = '700 15px "Noto Sans TC",sans-serif';
    for (let c = 0; c < 70; c++) { const x = 20 + c * 29 + r() * 8; let y = r() * 60; while (y < h) { g.fillText(words[Math.floor(r() * words.length)], x, y); y += 22 + r() * 30; } }
    // big headphones (white line art) over a soft spotlight
    const cx = 1300, cy = 250, sp = g.createRadialGradient(cx, cy, 20, cx, cy, 420); sp.addColorStop(0, 'rgba(255,255,255,0.18)'); sp.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sp; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f3f2ee'; g.lineWidth = 26; g.beginPath(); g.arc(cx, cy + 60, 210, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.arc(cx, cy + 60, 240, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    for (const s of [-1, 1]) {
      g.fillStyle = '#121214'; g.beginPath(); g.ellipse(cx + s * 205, cy + 120, 62, 92, s * 0.12, 0, 7); g.fill();
      g.strokeStyle = '#f3f2ee'; g.lineWidth = 10; g.stroke();
      g.fillStyle = '#db0007'; g.beginPath(); g.ellipse(cx + s * 205, cy + 120, 30, 50, s * 0.12, 0, 7); g.fill();
    }
    g.fillStyle = '#ffbc0d'; g.fillRect(140, h - 70, 520, 8);
    g.fillStyle = '#f3f2ee'; g.font = '900 64px "Noto Sans TC",sans-serif'; g.fillText('一起・好時光', 140, h - 100);
  }, false),
  menu: (i) => ctex(`mcMenu${  i}`, 512, 288, (g, w, h) => {
    const sets = [
      ['超值全餐', [['burger', '大麥克', '$155'], ['fries', '薯條', '$65'], ['drink', '可樂', '$38']]],
      ['雞肉系列', [['chicken', '麥香雞', '$125'], ['nugget', '雞塊 6塊', '$69'], ['drink', '雪碧', '$38']]],
      ['今日推薦', [['burger', '雙層牛肉堡', '$145'], ['fries', '大薯', '$65'], ['cone', '蛋捲冰淇淋', '$15']]],
      ['點心', [['nugget', '麥克雞塊', '$69'], ['fries', '中薯', '$55'], ['chicken', '麥脆雞', '$75']]],
      ['甜點飲料', [['cone', '冰炫風', '$59'], ['drink', '紅茶', '$33'], ['cone', '聖代', '$45']]],
      ['學生套餐', [['burger', '吉事堡', '$99'], ['drink', '可樂', '$38'], ['fries', '小薯', '$45']]],
    ];
    const [title, items] = sets[i % sets.length];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#103a7a'); gr.addColorStop(1, '#071a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#db0007'; g.fillRect(0, 0, w, 52); g.fillStyle = '#ffbc0d'; g.fillRect(0, 52, w, 5);
    g.fillStyle = '#ffffff'; g.font = '900 34px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle'; g.fillText(title, 18, 28);
    g.strokeStyle = '#ffbc0d'; archPath(g, w - 74, 12, 56, 30, 8);
    items.forEach(([icon, name, price], k) => {
      const x = 16 + k * 166, y = 70;
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.roundRect(x, y, 152, 204, 12); g.fill();
      foodIcon(g, icon, x + 76, y + 70, 1.35);
      g.fillStyle = '#ffffff'; g.font = '800 24px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText(name, x + 76, y + 148);
      g.fillStyle = '#ffbc0d'; g.font = '900 30px Arial,sans-serif'; g.fillText(price, x + 76, y + 182); g.textAlign = 'left';
    });
  }, false),
  pos: () => ctex('mcPos', 128, 80, (g) => {
    g.fillStyle = '#0d2238'; g.fillRect(0, 0, 128, 80);
    const cs = ['#db0007', '#ffbc0d', '#2e7d32', '#1565c0', '#f28c28', '#6d4c41'];
    for (let i = 0; i < 12; i++) { g.fillStyle = cs[i % cs.length]; g.fillRect(6 + (i % 4) * 30, 8 + Math.floor(i / 4) * 22, 26, 18); }
  }, false),
  fascia: () => ctex('mcFascia', 1024, 144, (g, w, h) => {
    g.fillStyle = '#2f3134'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffbc0d'; archPath(g, 40, 22, 150, 96, 22);
    g.fillStyle = '#ffffff'; g.font = '900 96px "Arial Black","Helvetica Neue",Arial,sans-serif'; g.textBaseline = 'middle'; g.fillText("McDonald's", 230, 78);
  }, false),
  arches: (col) => ctex(`mcArch${  col}`, 256, 224, (g) => { g.clearRect(0, 0, 256, 224); g.strokeStyle = col; archPath(g, 14, 18, 228, 196, 40); }, false),
  bin: (label, icon, key) => ctex(`mcBin${  key}`, 256, 120, (g) => {
    g.fillStyle = '#ffbc0d'; g.fillRect(0, 0, 256, 120);
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(14, 22, 228, 76, 8); g.fill();
    g.fillStyle = '#2f3134'; g.fillRect(24, 32, 56, 56); g.fillStyle = '#ffffff'; g.font = '700 38px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 52, 62);
    g.fillStyle = '#2f3134'; g.font = '900 34px "Noto Sans TC",sans-serif'; g.fillText(label, 162, 62);
  }, false),
  toss: () => ctex('mcToss', 512, 244, (g, w, h) => {
    g.fillStyle = '#ffbc0d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    // stick figure tossing a cup into a basket (white line drawing, like the panel in the store)
    g.beginPath(); g.arc(330, 58, 22, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(330, 80); g.lineTo(326, 160); g.moveTo(326, 160); g.lineTo(306, 226); g.moveTo(326, 160); g.lineTo(348, 226);
    g.moveTo(328, 104); g.lineTo(286, 76); g.lineTo(256, 62); g.moveTo(328, 104); g.lineTo(366, 132); g.stroke();
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(312 + i * 5, 36); g.lineTo(306 + i * 7, 14 - (i % 3) * 4); g.stroke(); }
    g.beginPath(); g.moveTo(246, 64); g.quadraticCurveTo(200, 30, 156, 96); g.setLineDash([10, 12]); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(110, 120); g.lineTo(200, 120); g.lineTo(188, 214); g.lineTo(122, 214); g.closePath(); g.stroke();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(128 + i * 18, 124); g.lineTo(132 + i * 16, 210); g.stroke(); }
  }, false),
  column: () => ctex('mcColumn', 64, 512, (g) => { const c = ['#f28c28', '#db0007', '#3a3c40', '#db0007', '#f3f1ec']; const ww = [22, 18, 6, 10, 8]; let x = 0; c.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(x, 0, ww[i] + 1, 512); x += ww[i]; }); }, false),
  kids: () => ctex('mcKids', 256, 384, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a7de1'); gr.addColorStop(1, '#0f4fa8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#db0007'; g.beginPath(); g.moveTo(48, 150); g.lineTo(208, 150); g.lineTo(196, 300); g.lineTo(60, 300); g.closePath(); g.fill();
    g.strokeStyle = '#ffbc0d'; g.lineWidth = 12; g.beginPath(); g.arc(98, 150, 34, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(158, 150, 34, Math.PI, 0); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(104, 222, 10, 0, 7); g.arc(152, 222, 10, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(128, 246, 30, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '900 40px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('開心樂園餐', 128, 70);
    g.fillStyle = '#ffbc0d'; g.font = '800 26px "Noto Sans TC",sans-serif'; g.fillText('玩具 · 好好玩', 128, 352);
  }, false),
  // ---- 內場 (kitchen + back corridor, photo 內場.jpg) ----
  galv: () => ctex('mcGalv', 256, 256, (g, w, h) => {
    // galvanised walk-in panel: mottled spangle, faint vertical brushing, seam at the panel edge
    const r = lcg(31); g.fillStyle = '#d4d7da'; g.fillRect(0, 0, w, h);
    for (let n = 0; n < 160; n++) {
      const x = r() * w, y = r() * h, s = 8 + r() * 26, v = 205 + Math.floor((r() - 0.5) * 22);
      g.fillStyle = `rgba(${v},${v + 2},${v + 4},0.35)`; g.beginPath(); g.moveTo(x, y);
      for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI * 2 + r(); g.lineTo(x + Math.cos(a) * s * (0.5 + r() * 0.5), y + Math.sin(a) * s * (0.5 + r() * 0.5)); }
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h);
    g.fillStyle = '#7d8186'; g.fillRect(0, 0, 3, h); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(3, 0, 2, h);
  }),
  whiteTile: () => ctex('mcWhiteTile', 128, 128, (g) => {
    const r = lcg(13); g.fillStyle = '#c3c8c6'; g.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = 238 + Math.floor(r() * 10); g.fillStyle = `rgb(${v},${v + 1},${v - 1})`; g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(i * 32 + 3, j * 32 + 3, 10, 2); }
  }),
  katlas: () => ctex('mcKAtlas', 1024, 1024, (g) => { for (const [name, [x, y, w, h]] of Object.entries(KR)) { g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, h); g.clip(); KDRAW[name](g, w, h); g.restore(); } }, false),
};
// Kitchen decal atlas: every small picture of the kitchen (control panels, screens, labels, box prints, the
// grill and oil surfaces…) lives in this one 1024² canvas and is put on flat quads (atlasUV), which are merged
// into two meshes (lit + glowing) — the way taipei-rush.app dresses its shop interiors, so the whole kitchen
// costs a handful of draw calls however many details it has.
const KR = {
  grill: [0, 0, 256, 128], oil: [256, 0, 128, 128], uhc: [384, 0, 256, 128], kvs: [640, 0, 256, 160], fryPanel: [896, 0, 128, 64], hot: [896, 64, 128, 48],
  drink: [0, 160, 256, 128], fire: [256, 160, 128, 128], net: [384, 160, 64, 96], cold: [448, 160, 128, 48], freeze: [448, 208, 128, 48], syrupA: [576, 160, 192, 128], syrupB: [768, 160, 192, 128],
  drain: [0, 320, 128, 128], louver: [128, 320, 128, 128], sop: [256, 320, 128, 160], fries: [384, 320, 128, 96], toaster: [512, 320, 128, 96], board: [640, 320, 256, 160], bag: [896, 320, 64, 96], carton: [960, 320, 64, 64],
  staffRoom: [0, 480, 256, 64], backDoor: [0, 544, 256, 64], caution: [256, 480, 128, 160], coffee: [384, 480, 128, 96], icecream: [512, 480, 128, 128], wrap: [640, 480, 128, 64], kvs2: [768, 480, 256, 160],
};
const KF = (px, w = 900) => `${w} ${px}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
function kvsDraw(g, w, h, orders) {
  g.fillStyle = '#0b0c10'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, 18); g.fillStyle = '#9fb3d9'; g.font = KF(12, 700); g.fillText(`KVS 內場出餐  ●  ${  orders.length  } 單`, 6, 13);
  const cw = (w - 8) / orders.length;
  orders.forEach(([no, col, lines], i) => {
    const x = 4 + i * cw; g.fillStyle = '#20232b'; g.fillRect(x + 2, 22, cw - 4, h - 26);
    g.fillStyle = col; g.fillRect(x + 2, 22, cw - 4, 18); g.fillStyle = '#111'; g.font = KF(13); g.fillText(`#${  no}`, x + 6, 36);
    g.fillStyle = '#f2f2f2'; g.font = KF(12, 700); lines.forEach((l, j) => g.fillText(l, x + 6, 56 + j * 18));
  });
}
const KDRAW = {
  grill: (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a2b2e'); gr.addColorStop(0.5, '#3a3b3f'); gr.addColorStop(1, '#232427'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = lcg(41); g.strokeStyle = 'rgba(200,200,205,0.08)'; for (let i = 0; i < 40; i++) { g.lineWidth = 1 + r() * 2; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 6); g.stroke(); }
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(70,40,20,${0.15 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 16, 4 + r() * 10, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = '#141416'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  },
  oil: (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.4, h * 0.4, 4, w / 2, h / 2, w * 0.7); gr.addColorStop(0, '#f0c25a'); gr.addColorStop(1, '#a8701c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = lcg(43); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,236,170,${0.2 + r() * 0.4})`; g.lineWidth = 1; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); g.stroke(); }
    g.strokeStyle = 'rgba(90,55,15,0.28)'; g.lineWidth = 5; for (let x = 22; x < w; x += 28) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h - 6); g.stroke(); } // heating coils seen through the oil
  },
  uhc: (g, w, h) => {
    g.fillStyle = '#5d6268'; g.fillRect(0, 0, w, h);
    const lbl = ['10:1', '4:1', '雞', '雞塊', '辣雞', '早餐'];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
      const x = 6 + i * 125, y = 6 + j * 40;
      g.fillStyle = '#131416'; g.fillRect(x, y + 12, 118, 24); g.fillStyle = '#b9bec4'; g.fillRect(x, y + 32, 118, 4);
      g.fillStyle = '#1a0f05'; g.fillRect(x, y, 118, 12);
      g.fillStyle = '#ff8a1c'; g.font = '700 11px monospace'; g.fillText(lbl[j * 2 + i], x + 4, y + 10); g.fillText(`${(j * 7 + i * 5) % 18 + 2}:0${(i + j) % 6}`, x + 80, y + 10);
    }
  },
  kvs: (g, w, h) => kvsDraw(g, w, h, [['118', '#3ad07a', ['大麥克 ×1', '薯條(大) ×1', '可樂 ×1']], ['119', '#ffc72c', ['麥香雞 ×2', '雞塊 6塊 ×1']], ['120', '#ff6b5a', ['薯條(中) ×2', '冰炫風 ×1']]]),
  kvs2: (g, w, h) => kvsDraw(g, w, h, [['121', '#3ad07a', ['雙層牛肉 ×1', '薯條(小) ×1']], ['122', '#3ad07a', ['大麥克 ×2', '可樂 ×2', '蘋果派 ×1']]]),
  fryPanel: (g, w, h) => {
    g.fillStyle = '#18191b'; g.fillRect(0, 0, w, h);
    for (const x of [6, 68]) { g.fillStyle = '#2a0606'; g.fillRect(x, 8, 54, 22); g.fillStyle = '#ff3b2b'; g.font = '700 18px monospace'; g.fillText(x < 50 ? '3:10' : '2:45', x + 4, 26); }
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 4 === 3 ? '#3ad07a' : '#5b5e63'; g.beginPath(); g.arc(12 + i * 15, 46, 5, 0, 7); g.fill(); }
  },
  hot: (g, w, h) => { g.fillStyle = '#ffcc00'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = KF(24); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚠ 高溫注意', w / 2, h / 2 + 1); },
  drink: (g, w, h) => {
    g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, w, h);
    const d = [['可樂', '#c8102e'], ['零卡可樂', '#1b1b1b'], ['雪碧', '#1f8a3a'], ['柳橙', '#f28c28'], ['紅茶', '#7a3b1c'], ['冰水', '#2d7fd0']];
    d.forEach(([t, c], i) => { const x = 4 + i * 42; g.fillStyle = c; g.fillRect(x, 10, 38, 64); g.fillStyle = '#fff'; g.font = KF(t.length > 2 ? 10 : 14); g.textAlign = 'center'; g.fillText(t, x + 19, 48); });
    g.textAlign = 'left'; g.fillStyle = '#2b2c2f'; g.fillRect(0, 86, w, 42);
  },
  fire: (g, w, h) => {
    g.fillStyle = '#efe9d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#8b8574'; g.fillRect(0, 0, w, 6);
    g.fillStyle = '#2b2b2b'; g.fillRect(36, 16, 74, 92);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { g.fillStyle = (i + j) % 3 ? '#c8202a' : '#3ad07a'; g.fillRect(44 + i * 34, 22 + j * 21, 24, 14); }
    g.fillStyle = '#c8202a'; g.font = KF(11); g.fillText('火警受信總機', 30, 122);
    g.fillStyle = '#9b9584'; for (let i = 0; i < 5; i++) g.fillRect(8, 30 + i * 8, 20, 3);
  },
  net: (g, w, h) => { g.fillStyle = '#ecece8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c9c4'; g.fillRect(4, 4, w - 8, h - 8); g.fillStyle = '#3ad07a'; g.beginPath(); g.arc(w / 2, h - 18, 5, 0, 7); g.fill(); },
  cold: (g, w, h) => { g.fillStyle = '#ffd200'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.fillRect(0, 0, 10, h); g.fillStyle = '#111'; g.font = KF(28); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('冷藏庫', w / 2 + 5, h / 2 + 1); },
  freeze: (g, w, h) => { g.fillStyle = '#ffd200'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d5bbf'; g.fillRect(0, 0, 10, h); g.fillStyle = '#111'; g.font = KF(28); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('冷凍庫', w / 2 + 5, h / 2 + 1); },
  syrupA: (g, w, h) => syrupBox(g, w, h, '可樂 汽水糖漿袋 20L', '#c8102e', '0504114'),
  syrupB: (g, w, h) => syrupBox(g, w, h, '檸檬紅茶 糖漿袋 20L', '#3d8b3d', '0504262'),
  drain: (g, w, h) => {
    g.fillStyle = '#e8ece9'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa29e';
    for (let j = 0; j < 9; j++) for (let i = 0; i < 6; i++) { g.beginPath(); g.roundRect(8 + i * 19, 6 + j * 13, 14, 7, 3); g.fill(); }
    g.strokeStyle = '#43b26a'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
  },
  louver: (g, w, h) => { g.fillStyle = '#b8bcc1'; g.fillRect(0, 0, w, h); for (let y = 10; y < h - 8; y += 12) { g.fillStyle = '#4c5056'; g.fillRect(8, y, w - 16, 6); g.fillStyle = '#e4e7ea'; g.fillRect(8, y + 6, w - 16, 2); } },
  sop: (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d5bbf'; g.fillRect(0, 0, w, 30); g.fillStyle = '#fff'; g.font = KF(17); g.fillText('洗手 SOP', 22, 22);
    for (let i = 0; i < 6; i++) { const x = 8 + (i % 2) * 58, y = 38 + Math.floor(i / 2) * 40; g.fillStyle = '#e3eefb'; g.fillRect(x, y, 54, 34); g.fillStyle = '#1d5bbf'; g.font = KF(12); g.fillText(String(i + 1), x + 4, y + 14); g.fillStyle = '#f0c8a8'; g.beginPath(); g.ellipse(x + 32, y + 20, 12, 8, 0.3, 0, 7); g.fill(); }
  },
  fries: (g, w, h) => {
    g.fillStyle = '#5e5f63'; g.fillRect(0, 0, w, h); const r = lcg(47);
    for (let i = 0; i < 260; i++) { g.save(); g.translate(8 + r() * (w - 16), 8 + r() * (h - 16)); g.rotate(r() * Math.PI); const v = Math.floor(r() * 40); g.fillStyle = `rgb(${225 + v / 3},${170 + v},${60 + v / 2})`; g.fillRect(-12, -2.5, 24, 5); g.restore(); }
  },
  toaster: (g, w, h) => { g.fillStyle = '#26282c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a1a'; g.fillRect(10, 14, w - 20, 6); g.fillStyle = '#ffb35a'; g.font = '700 16px monospace'; g.fillText('BUN 0:17', 14, 50); g.fillStyle = '#3ad07a'; g.beginPath(); g.arc(w - 18, 74, 6, 0, 7); g.fill(); },
  board: (g, w, h) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a7abb0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#c8102e'; g.font = KF(20); g.fillText('今日備料 / 尖峰', 14, 30);
    g.fillStyle = '#1d4fa8'; g.font = KF(15, 700); ['牛肉餅 3 箱　雞腿排 2 箱', '薯條 8 包　麵包 12 盤', '★ 油溫 168°C 記得量', '★ 嗶聲響了就起鍋！'].forEach((t, i) => g.fillText(t, 16, 58 + i * 24));
  },
  bag: (g, w, h) => { g.fillStyle = '#c49a62'; g.fillRect(0, 0, w, h); g.fillStyle = '#a77f4b'; g.fillRect(0, 0, w, 10); g.strokeStyle = '#ffbc0d'; archPath(g, 12, 36, 40, 26, 7); },
  carton: (g, w, h) => { g.fillStyle = '#db0007'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffbc0d'; archPath(g, 14, 18, 36, 26, 6); },
  staffRoom: (g, w, h) => { g.fillStyle = '#2f3134'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = KF(26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('員工休息室 STAFF', w / 2, h / 2 + 2); },
  backDoor: (g, w, h) => { g.fillStyle = '#1e5a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = KF(26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('後門・收貨 隨手關門', w / 2, h / 2 + 2); },
  caution: (g, w, h) => {
    g.fillStyle = '#ffd200'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w - 14, 86); g.lineTo(14, 86); g.closePath(); g.fill();
    g.fillStyle = '#ffd200'; g.beginPath(); g.moveTo(w / 2, 28); g.lineTo(w - 26, 78); g.lineTo(26, 78); g.closePath(); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2 + 4, 44, 5, 0, 7); g.fill(); g.fillRect(w / 2 - 10, 52, 22, 5); g.fillRect(w / 2 - 14, 66, 30, 4);
    g.font = KF(24); g.textAlign = 'center'; g.fillText('小心地滑', w / 2, 124);
  },
  coffee: (g, w, h) => { g.fillStyle = '#16171a'; g.fillRect(0, 0, w, h); g.fillStyle = '#0e2a4a'; g.fillRect(12, 10, w - 24, 40); g.fillStyle = '#7fc4ff'; g.font = KF(14); g.fillText('美式  拿鐵', 22, 36); for (let i = 0; i < 4; i++) { g.fillStyle = '#3a3c40'; g.beginPath(); g.arc(22 + i * 28, 72, 9, 0, 7); g.fill(); } },
  icecream: (g, w, h) => {
    g.fillStyle = '#cfd3d7'; g.fillRect(0, 0, w, h); g.fillStyle = '#26282c'; g.fillRect(14, 12, w - 28, 30); g.fillStyle = '#7dff9a'; g.font = '700 14px monospace'; g.fillText('READY  -4°C', 20, 32);
    g.fillStyle = '#9aa0a6'; for (let i = 0; i < 3; i++) g.fillRect(20 + i * 34, 60, 22, 46); g.fillStyle = '#c8102e'; g.font = KF(14); g.fillText('冰淇淋', 40, 122);
  },
  wrap: (g, w, h) => { const c = ['#ffbc0d', '#2b6cb0', '#db0007', '#ffbc0d']; c.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(i * 32, 0, 30, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(i * 32 + 4, 6, 22, 4); }); },
};
function syrupBox(g, w, h, title, col, code) {
  g.fillStyle = '#c69c6d'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(90,60,30,0.15)'; for (let i = 0; i < 30; i++) g.fillRect(0, i * 4.3, w, 1);
  g.fillStyle = col; g.fillRect(10, 12, 26, 26); g.fillStyle = '#fff'; g.font = KF(18); g.fillText('糖', 14, 32);
  g.fillStyle = '#1b1b1b'; g.font = KF(15); g.fillText(title, 42, 32); g.font = '700 18px Arial'; g.fillText(code, w - 82, 64);
  g.strokeStyle = '#3b3b3b'; g.lineWidth = 2; for (let i = 0; i < 3; i++) g.strokeRect(14 + i * 34, 52, 28, 28);
  g.fillStyle = '#f4f2ea'; g.fillRect(w * 0.62, 0, 12, h); g.fillRect(0, h * 0.78, w, 10); // white strapping bands
}
// map a PlaneGeometry onto one atlas region (1 px inset against bleeding)
function atlasUV(geo, name) {
  const [x, y, w, h] = KR[name], A = 1024, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + 1 + uv.getX(i) * (w - 2)) / A, 1 - (y + 1 + (1 - uv.getY(i)) * (h - 2)) / A);
  return geo;
}
function mcdMaterials() {
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  // the store is lit by warm 3000 K downlights; the scene's lights are the (cool) sky, so each surface gets a
  // small warm emissive lift (following its texture) — brighter and warmer without adding real lights
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set(o.map ? '#ffe4c4' : new THREE.Color(o.color || '#ffffff').lerp(new THREE.Color('#ffd9a8'), 0.25)); m.emissiveMap = o.map || null; m.emissiveIntensity = lift; }
    return m;
  };
  return {
    floor: def('mcdFloor', () => std({ map: MCT.floor(), roughness: 0.42, metalness: 0.05 }, 0.22)),
    lobby: def('mcdLobby', () => std({ map: MCT.lobby(), roughness: 0.35 }, 0.2)),
    quarry: def('mcdQuarry', () => std({ map: MCT.quarry(), roughness: 0.6 }, 0.15)),
    cove: def('mcdCove', () => new THREE.MeshStandardMaterial({ color: '#fff2d6', emissive: '#ffe7b8', emissiveIntensity: 0.55 })),
    ceil: def('mcdCeil', () => std({ map: MCT.ceil(), roughness: 0.95 }, 0.42)),
    wall: def('mcdWall', () => std({ color: '#f4f2ec', roughness: 0.8 }, 0.3)),
    oak: def('mcdOak', () => std({ map: MCT.oak(), roughness: 0.6 }, 0.2)),
    oakTop: def('mcdOakTop', () => std({ color: '#c9a072', roughness: 0.45 }, 0.15)),
    blackTile: def('mcdBlackTile', () => std({ map: MCT.blackTile(), roughness: 0.3 })),
    counter: def('mcdCounter', () => std({ color: '#f6f5f1', roughness: 0.35 }, 0.3)),
    top: def('mcdTop', () => std({ color: '#e2e0da', roughness: 0.25 }, 0.18)),
    black: def('mcdBlack', () => std({ color: '#161719', roughness: 0.45 })),
    bench: def('mcdBench', () => std({ color: '#4a4b50', roughness: 0.95 }, 0.06)),
    walnut: def('mcdWalnut', () => std({ color: '#6a4630', roughness: 0.45, side: THREE.DoubleSide }, 0.1)),
    yellow: def('mcdYellow', () => std({ color: '#ffbc0d', roughness: 0.35 }, 0.22)),
    frame: def('mcdFrame', () => std({ color: '#3a3c40', roughness: 0.5, metalness: 0.3 })),
    pillar: def('mcdPillar', () => std({ color: '#45474b', roughness: 0.6 }, 0.05)),
    fasciaBox: def('mcdFasciaBox', () => std({ color: '#2f3134', roughness: 0.6 })),
    vent: def('mcdVent', () => std({ color: '#e2e0da', roughness: 0.6 }, 0.25)),
    warm: def('mcdWarm', () => new THREE.MeshStandardMaterial({ color: '#ffb35a', emissive: '#ff9a3c', emissiveIntensity: 0.9 })),
    fryer: def('mcdFryer', () => std({ color: '#5b5f64', metalness: 0.7, roughness: 0.35 })),
    tray: def('mcdTray', () => std({ color: '#a6362c', roughness: 0.5 })),
    lamp: def('mcdLamp', () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff1d6', emissiveIntensity: 1.2, roughness: 0.6 })),
    // 內場
    kSteel: def('mcdKSteel', () => std({ color: '#d3d7dc', metalness: 0.5, roughness: 0.3 }, 0.14)),
    kSteelDk: def('mcdKSteelDk', () => std({ color: '#9aa0a7', metalness: 0.55, roughness: 0.36 }, 0.08)),
    kBlack: def('mcdKBlack', () => std({ color: '#1f2023', roughness: 0.5, metalness: 0.2 })),
    galv: def('mcdGalv', () => std({ map: MCT.galv(), metalness: 0.25, roughness: 0.5 }, 0.2)),
    whiteTile: def('mcdWhiteTile', () => std({ map: MCT.whiteTile(), roughness: 0.3 }, 0.28)),
    wallGrey: def('mcdWallGrey', () => std({ color: '#c3c2bd', roughness: 0.8 }, 0.22)),
    wainscot: def('mcdWainscot', () => std({ color: '#5b4c45', roughness: 0.6 }, 0.06)),
    blackMetal: def('mcdBlackMetal', () => std({ color: '#161719', roughness: 0.5, metalness: 0.4 })),
    cardboard: def('mcdCardboard', () => std({ color: '#c49a68', roughness: 0.9 }, 0.16)),
    blue: def('mcdBlue', () => std({ color: '#2f86d6', roughness: 0.35 }, 0.16)),
    redBin: def('mcdRedBin', () => std({ color: '#d0242c', roughness: 0.45 }, 0.16)),
    bun: def('mcdBun', () => std({ color: '#d9a25a', roughness: 0.7 }, 0.16)),
    cup: def('mcdCup', () => std({ color: '#f4f3ef', roughness: 0.5 }, 0.25)),
    kdecal: def('mcdKDecal', () => std({ map: MCT.katlas(), roughness: 0.55 }, 0.14)),
    kglow: def('mcdKGlow', () => { const t = MCT.katlas(); return new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.4 }); }),
  };
}
function buildMcD(I, scene) {
  const S = MCD_SPEC; const k = new Kit(I, S.x1, S.z1, Math.PI); // turned 180°: shop x/z run west/north from the SE corner
  // the store is in the 活動中心's B1 (js/zone_g.js digs the pit: the shop and the sunken stage in front of it,
  // js/terrain.js addPit), so the render base is the pit floor inside the shop, not the street at its corner;
  // every height below stays relative to it (walls, floors, zones and actions follow H() there)
  const street = Hgrid(S.x0, S.z0); // (the corner is in the B1 用餐區's pit since that was dug)
  k.base = Hterrain(S.x0 + 2, S.z0 + 2); k.group.position.y = k.base;
  const up = street - k.base; // street level above the shop floor (0 if there is no pit)
  const W = S.x1 - S.x0, D = S.z1 - S.z0, H = S.H;
  const MT = mcdMaterials(); // textures / materials of the real store (see MCT above)
  const put = (mat, g) => { if (!k.parts.has(mat)) k.parts.set(mat, []); k.parts.get(mat).push(g); };
  // Layout like the real store: you walk in facing the counter (front lobby on the corridor's beige /
  // terracotta tiles, kitchen behind the counter, golden-arches pillar at its right end), and the long
  // dining room opens on the counter's LEFT. The numbers below are written in a "design frame" whose z
  // is mirrored into the shop (mz): design z 0..10.25 = dining = the north part of the shop.
  // (the shop frame is turned 180°, so shop x W is the world west side and shop z D the world north side)
  //   lobby   x 16.2..W   design z 10.4..D = shop z 0..9.6 (SW of the store): open westwards onto the B1 學餐用餐區
  //           at shop z MCD_OPEN (queue rails), the rest of that side is a wall to the stair hall
  //   counter x 15.2..16.2 design z 11.4..18.6 (customers on the lobby side), kitchen x 9.5..15.2 behind it
  //   dining  x 0.3..W    design z 0.3..10.25 = shop z 9.75..20, the north half (mural + banquette on the outer wall)
  //   x 0.3..9.3 / design z 10.4..D is back of house (closed); the south wall (shop z 0) is solid
  const DZ = 10.25, KX = 9.5, CX0 = 15.2, CX1 = 16.2, CZ0 = 11.4, CZ1 = 18.6, [OZ0, OZ1] = MCD_OPEN, OZM = (OZ0 + OZ1) / 2, OH = 2.8;
  const mz = (z) => D - z; // design frame -> shop (mirror in z; planes are turned, not mirrored, so text still reads)
  const km = {
    box: (x0, x1, y0, y1, z0, z1, mat, o) => k.box(x0, x1, y0, y1, mz(z1), mz(z0), mat, o),
    wallRect: (x0, x1, z0, z1, y0, y1) => k.wallRect(x0, x1, mz(z1), mz(z0), y0, y1),
    plane: (tex, w, h, x, y, z, rotY = 0, o = {}) => k.plane(tex, w, h, x, y, mz(z), Math.PI - rotY, o),
  };
  // ---- shell ----
  km.box(0, W, 0, 0.1, 0, D, MT.floor, { col: false, tile: [1.2, 1.2] });
  // floor surface at k.base + 0.1 everywhere (the shop's edge 5 cm lies outside the pit, where H() is the street)
  I.addSurface(k.rect(0, W, 0, D), (x, z) => k.base + 0.1 - Hterrain(x, z));
  km.box(CX0 - 0.2, W, 0.1, 0.104, DZ + 0.15, D, MT.lobby, { col: false, tile: [2.4, 2.4] }); // corridor tiles up to the counter
  km.box(KX, CX0 + 1.0, 0.1, 0.106, DZ + 0.15, D, MT.quarry, { col: false, tile: [0.3, 0.3] }); // red 15 cm quarry tiles behind it
  km.box(0, 0.3, 0, H, 0, D, 'white');
  k.box(0, W, 0, H, 0, 0.3, 'white');
  k.box(0, W, 0, H, D - 0.3, D, 'white'); // north wall (behind the dining room's banquette)
  km.box(0.3, CX1, 0, H, DZ, DZ + 0.15, MT.wall);                 // dining / kitchen partition
  km.box(KX - 0.2, KX, 0, H, 11.55, D - 0.3, MT.wall);           // kitchen back wall (back of house beyond)
  km.box(KX - 0.2, KX, 2.25, H, DZ + 0.15, 11.55, MT.wall, { col: false }); // …with the doorway to the back corridor
  km.box(KX, CX1, 0, H - 0.1, D - 0.34, D - 0.3, MT.wall, { col: false }); // kitchen side of the north wall
  km.box(CX1, W - 0.15, 2.7, H, DZ, DZ + 0.15, MT.wall, { col: false }); // header over the dining opening
  // west side: the lobby opens onto the B1 學餐用餐區 (shop z OZ0..OZ1, queue rails along it south of the walk-in
  // gap), the dining room's end is a wall to the stair hall; a header hides the 活動中心's outer wall above
  k.box(W - 0.3, W, 0, H, OZ1, D, 'white');
  k.box(W - 0.3, W, OH, H, 0.3, OZ1, MT.wall, { col: false });
  for (const z of [0.3, OZ1]) k.box(W - 0.34, W + 0.04, 0, OH, z - 0.08, z + 0.08, MT.frame, { col: false });
  k.box(W - 0.34, W + 0.04, OH - 0.1, OH, 0.3, OZ1, MT.frame, { col: false });
  // queue rails (stanchions with a black belt): along the opening south of the walk-in gap, then back along the queue
  { const RX = W - 0.35, rails = [[RX, 0.5, RX, OZ0], [17.6, OZ0, RX, OZ0]];
    for (const [ax, az, bx, bz] of rails) {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.2));
      for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; put('chrome', new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8).translate(x, 0.475, z)); put('chrome', new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16).translate(x, 0.015, z)); }
      put(MT.black, new THREE.BoxGeometry(Math.abs(bx - ax) + 0.02, 0.06, Math.abs(bz - az) + 0.02).translate((ax + bx) / 2, 0.88, (az + bz) / 2));
      k.wallLine(ax, az, bx, bz, 0, 1.0);
    } }
  // east side on 中北路's corner: the low window strip above the street (glass outside the shop's east wall)
  k.box(-0.15, 0, Math.max(0, up - 0.3), H, 0, D, 'glass', { col: false });
  for (const z of [0, 5.2, 9.75, 12.6, 16.6, D]) k.box(-0.19, 0.02, Math.max(0, up - 0.3), H, z - 0.08, z + 0.08, MT.frame, { col: false });
  // ---- outside: dark fascia band (the "McDonald's" board and the curved glass front are js/zone_g.js) ----
  km.box(-0.4, W + 0.05, H, H + 1.2, -0.05, D + 0.05, MT.fasciaBox, { col: false }); // (sticks out on the street side, east)
  // the 活動中心 above, up to its roof (S.top is above the street)
  km.box(0, W, H + 1.2, S.top + up, 0, D, 'sac', { col: false });
  // ---- ceiling: white 60 cm grid; square downlights over the dining room, troffers over lobby and kitchen ----
  km.box(0, W, H - 0.1, H, 0, D, MT.ceil, { col: false, tile: [0.6, 0.6] });
  for (let x = 1.5; x < W - 0.5; x += 1.8) for (let z = 1.4; z < DZ - 0.4; z += 1.8) {
    if (Math.abs(z - 5.1) < 1.0 && x > 4.6 && x < 15.4) continue; // the pendants' cove
    km.box(x - 0.09, x + 0.09, H - 0.115, H - 0.1, z - 0.09, z + 0.09, 'light', { col: false });
  }
  km.box(4.4, 15.6, H - 0.35, H - 0.1, 3.7, 6.5, MT.wall, { col: false }); // cove frame over the communal table
  km.box(4.6, 15.4, H - 0.36, H - 0.35, 3.9, 6.3, MT.cove, { col: false });
  for (const [x, z] of [[18.6, 12.6], [21.6, 12.6], [18.6, 17.4], [21.6, 17.4], [11.0, 12.6], [11.0, 17.4]]) km.box(x - 0.6, x + 0.6, H - 0.115, H - 0.1, z - 0.3, z + 0.3, 'light', { col: false });
  for (const [x, z] of [[6.0, 1.6], [12.6, 8.8], [20.4, 6.6], [18.0, 15.0]]) km.box(x - 0.3, x + 0.3, H - 0.112, H - 0.1, z - 0.3, z + 0.3, MT.vent, { col: false });
  // dropped soffit over the counter with its own downlights, menu boards hanging under it
  km.box(13.6, 17.2, 3.35, H - 0.1, CZ0 - 0.4, CZ1 + 0.4, MT.wall, { col: false });
  for (let z = CZ0 + 0.2; z < CZ1; z += 1.2) km.box(16.55, 16.75, 3.335, 3.35, z - 0.1, z + 0.1, 'light', { col: false });
  for (let i = 0; i < 6; i++) {
    const z = CZ0 + 0.45 + i * 1.26;
    km.box(14.92, 15.0, 2.62, 3.3, z - 0.56, z + 0.56, MT.black, { col: false });
    km.plane(MCT.menu(i), 1.06, 0.6, 15.005, 2.96, z, Math.PI / 2, { emissive: 0.9 });
    km.box(14.94, 14.97, 3.3, 3.35, z - 0.02, z + 0.02, 'steel', { col: false });
  }
  // ---- counter: white body on a black plinth, pale top, grey M, POS terminals (customers on the east side) ----
  km.box(CX0 + 0.1, CX1 - 0.1, 0, 0.16, CZ0, CZ1, MT.black, { col: false });
  km.box(CX0, CX1, 0.16, 1.05, CZ0, CZ1, MT.counter);
  km.box(CX0 - 0.1, CX1 + 0.1, 1.05, 1.1, CZ0, CZ1, MT.top, { col: false });
  for (const z of [12.9, 17.1]) km.plane(MCT.arches('#8f9296'), 0.42, 0.36, CX1 + 0.005, 0.66, z, Math.PI / 2);
  for (const z of [12.6, 15.0, 17.4]) {
    km.box(15.62, 15.68, 1.1, 1.24, z - 0.04, z + 0.04, MT.black, { col: false });
    km.box(15.56, 15.62, 1.2, 1.46, z - 0.19, z + 0.19, MT.black, { col: false });
    km.plane(MCT.pos(), 0.34, 0.22, 15.555, 1.33, z, -Math.PI / 2, { emissive: 0.85 });
    km.plane(MCT.pos(), 0.16, 0.1, 15.625, 1.36, z, Math.PI / 2, { emissive: 0.85 });
  }
  // dark grey pillar with the golden arches at the counter's left end (as in the photo)
  km.box(CX1, CX1 + 0.8, 0, H - 0.1, CZ1 + 0.1, D - 0.3, MT.pillar);
  km.plane(MCT.arches('#ffbc0d'), 0.66, 0.58, CX1 + 0.805, 2.5, (CZ1 + 0.1 + D - 0.3) / 2, Math.PI / 2, { emissive: 0.9, transparent: true });
  km.box(CX1 + 0.8, W - 0.15, 0, H - 0.1, D - 0.34, D - 0.3, MT.oak, { col: false, tile: [1.2, H] });
  // ---- 內場: kitchen line + back corridor (buildMcKitchen) ----
  const kitchen = buildMcKitchen({ I, k, km, mz, put, MT, H, KX, DZ, D });
  // ---- dining room (design frame, mirrored into the north part of the shop). Looking in from the lobby:
  //      banquette under the mural on the left (outer wall), striped wall at the far end, four-seat tables and
  //      the Happy Meal column on the right (partition), yellow trash cabinets in the left foreground ----
  km.box(0.3, CX1, 0, H - 0.1, DZ - 0.04, DZ, MT.oak, { col: false, tile: [1.2, H] }); // partition, dining side
  km.plane(MCT.mural(), 12.4, 2.6, 9.5, 2.55, 0.32);
  km.box(15.7, W - 0.3, 0, H - 0.1, 0.3, 0.34, MT.oak, { col: false, tile: [1.2, H] });
  km.box(0.3, 3.3, 0, H - 0.1, 0.3, 0.34, MT.oak, { col: false, tile: [1.2, H] });
  km.box(3.0, 16.2, 0, 0.42, 0.34, 1.0, MT.oak, { col: false, tile: [1.2, 0.42] });
  km.box(3.0, 16.2, 0.42, 0.62, 0.34, 1.0, MT.bench, { col: false });
  km.box(3.0, 16.2, 0.62, 1.15, 0.34, 0.52, MT.bench, { col: false });
  km.wallRect(3.0, 16.2, 0.3, 1.0, 0, 1.15);
  km.plane(MCT.stripes(), DZ - 0.3, H - 0.1, 0.32, (H - 0.1) / 2, (DZ + 0.3) / 2, Math.PI / 2);
  // ---- furniture (merged per material) ----
  const place = (list, a, x, z) => list.map(g => g.clone().rotateY(Math.PI - a).translate(x, 0, mz(z)));
  const chairParts = (bar) => {
    const sy = bar ? 0.66 : 0.46, wood = [], metal = [];
    wood.push(new THREE.BoxGeometry(0.42, 0.03, 0.4).translate(0, sy, 0.02));
    wood.push(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10, 1, true, Math.PI - 0.5, 1.0).translate(0, sy + 0.36, 0.22));
    for (const [x, z] of [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.19], [0.18, 0.19]]) metal.push(new THREE.CylinderGeometry(0.011, 0.011, sy, 6).translate(x, sy / 2, z));
    for (const x of [-0.17, 0.17]) metal.push(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6).translate(x, sy + 0.21, -0.18));
    if (bar) for (const [w, d, x, z] of [[0.38, 0.02, 0, 0.19], [0.38, 0.02, 0, -0.16], [0.02, 0.35, 0.18, 0.015], [0.02, 0.35, -0.18, 0.015]]) metal.push(new THREE.BoxGeometry(w, 0.02, d).translate(x, 0.28, z));
    return { wood, metal };
  };
  const stoolParts = () => {
    const seat = [new THREE.BoxGeometry(0.36, 0.06, 0.34).translate(0, 0.72, 0)], metal = [];
    for (const [x, z] of [[-0.15, -0.14], [0.15, -0.14], [-0.15, 0.14], [0.15, 0.14]]) metal.push(new THREE.CylinderGeometry(0.011, 0.011, 0.69, 6).translate(x, 0.345, z));
    for (const [w, d, x, z] of [[0.32, 0.02, 0, 0.14], [0.32, 0.02, 0, -0.14], [0.02, 0.3, 0.15, 0], [0.02, 0.3, -0.15, 0]]) metal.push(new THREE.BoxGeometry(w, 0.02, d).translate(x, 0.26, z));
    return { seat, metal };
  };
  const BAR = chairParts(true), LOW = chairParts(false), STOOL = stoolParts();
  const chair = (P, a, x, z) => { for (const g of place(P.wood, a, x, z)) put(MT.walnut, g); for (const g of place(P.metal, a, x, z)) put('chrome', g); };
  const pedestal = (x, z, top, r = 0.2) => { put('chrome', new THREE.CylinderGeometry(0.035, 0.035, top, 10).translate(x, top / 2, mz(z))); put('chrome', new THREE.CylinderGeometry(r, r * 1.08, 0.025, 20).translate(x, 0.0125, mz(z))); };
  // oak high tables along the banquette, bentwood bar chairs opposite
  for (let i = 0; i < 7; i++) {
    const x = 4.0 + i * 1.7;
    km.box(x - 0.55, x + 0.55, 0.98, 1.02, 1.2, 1.9, MT.oakTop, { col: false }); km.wallRect(x - 0.55, x + 0.55, 1.2, 1.9, 0, 1.02);
    pedestal(x, 1.55, 0.98, 0.22);
    chair(BAR, Math.PI, x, 2.4);
  }
  // long stainless communal table under the drum pendants, black stools both sides
  km.box(5.0, 15.0, 0.98, 1.03, 4.65, 5.55, 'steel', { col: false }); km.wallRect(5.0, 15.0, 4.65, 5.55, 0, 1.03);
  for (const x of [6.0, 10.0, 14.0]) pedestal(x, 5.1, 0.98, 0.3);
  for (let i = 0; i < 11; i++) {
    const x = 5.55 + i * 0.87;
    for (const [z, a] of [[4.05, 0], [6.15, Math.PI]]) { for (const g of place(STOOL.seat, a, x, z)) put(MT.black, g); for (const g of place(STOOL.metal, a, x, z)) put('chrome', g); }
  }
  for (const x of [6.8, 10.0, 13.2]) {
    put(MT.lamp, new THREE.CylinderGeometry(0.46, 0.46, 0.52, 28).translate(x, 2.85, mz(5.1)));
    put('chrome', new THREE.CylinderGeometry(0.004, 0.004, H - 0.36 - 3.11, 4).translate(x, (H - 0.36 + 3.11) / 2, mz(5.1)));
  }
  // four-seat tables along the partition (the right-hand side as you look in)
  for (let i = 0; i < 5; i++) {
    const x = 3.5 + i * 2.7, z = 8.4;
    km.box(x - 0.4, x + 0.4, 0.72, 0.76, z - 0.4, z + 0.4, MT.oakTop, { col: false }); km.wallRect(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, 0.76);
    pedestal(x, z, 0.72, 0.24);
    chair(LOW, 0, x, z - 0.66); chair(LOW, Math.PI, x, z + 0.66);
  }
  // Happy Meal screen on an orange / red stripe column + yellow display box (partition, near the opening)
  km.plane(MCT.column(), 0.5, H - 0.1, 15.75, (H - 0.1) / 2, DZ - 0.045, Math.PI);
  km.box(15.4, 16.1, 1.55, 2.6, DZ - 0.17, DZ - 0.05, MT.black, { col: false });
  km.plane(MCT.kids(), 0.62, 0.95, 15.75, 2.075, DZ - 0.175, Math.PI, { emissive: 0.8 });
  km.box(15.35, 16.15, 0.9, 1.35, DZ - 0.36, DZ - 0.04, MT.yellow, { col: false });
  // oak pillar with a poster between the two dining openings (seen from the lobby)
  km.box(19.8, 20.6, 0, H - 0.1, DZ - 0.25, DZ + 0.4, MT.oak, { tile: [1.2, H] });
  km.plane(MCT.kids(), 0.5, 0.78, 20.605, 1.65, DZ + 0.075, Math.PI / 2, { emissive: 0.7 });
  // yellow trash / tray-return cabinets with the stick-figure panel (dining room, by the entrance)
  km.box(19.6, 22.0, 0, 1.12, 0.34, 0.95, MT.yellow); km.box(19.6, 22.0, 1.12, 1.5, 0.34, 0.6, MT.black, { col: false });
  km.box(19.6, 22.0, 1.5, 2.65, 0.34, 0.95, MT.yellow, { col: false });
  km.plane(MCT.bin('一般垃圾', '🗑', 'binA'), 0.9, 0.42, 21.4, 0.86, 0.955); km.plane(MCT.bin('資源回收', '♻', 'binB'), 0.9, 0.42, 20.2, 0.86, 0.955);
  km.plane(MCT.toss(), 2.2, 1.05, 20.8, 2.07, 0.955);
  // pole sign outside
  // (it stands on the street east of the pit: drawn from street level, its wall band is above the ground there)
  // (shop frame turned 180°: x -4 / z -1 is the street corner east of the pit, SE of the store)
  k.box(-4.3, -4, up, up + 7, -1.3, -1, 'metal', { col: false });
  k.wallRect(-4.3, -4, -1.3, -1, 0, 7);
  k.plane(T.mcLogo(), 3.2, 1.6, -4.15, up + 7.6, -1.15, -Math.PI / 2, { emissive: 0.5, double: true });
  k.finish(scene);
  I.zones.push({ name: '麥當勞 中原店', pts: k.rect(0, W, 0, D), y0: 0, y1: H, ceil: () => H - 0.4 });
  // crew in the real store's uniform (mcuniform.js): the counter girl at the middle register, and two in the
  // kitchen with hairnets — one on the first grill, one at the assembly island. They go through the motions
  // (reach / turn) while the player is close enough to see them.
  const staff = createCharacter({ skin: '#efd0b5', shirt: CREW_SHIRT, shorts: '#1b1b1d', pants: true, hair: '#1a1410', hairStyle: 'pony', face: true, shoes: '#222' });
  dressCrew(staff, { name: '小芸' });
  const sp = k.w(14.6, mz(15.0)); staff.root.position.set(sp[0], k.base, sp[1]); staff.root.rotation.y = k.heading(Math.PI / 2);
  staff.home = staff.root.position.clone(); staff.homeRot = staff.root.rotation.y; // the 值班 moves her to the fryers and back
  scene.add(staff.root);
  const crew = [
    [{ skin: '#d9ad88', hair: '#111', hairStyle: 'short' }, '阿凱', kitchen.crewGrill],
    [{ skin: '#f3d9c4', hair: '#2b1d14', hairStyle: 'pony' }, '佳穎', kitchen.crewAssembly],
  ].map(([look, name, [x, z]]) => {
    const c = createCharacter({ ...look, shirt: CREW_SHIRT, shorts: '#1b1b1d', pants: true, face: true, shoes: '#111' });
    dressCrew(c, { name, hairnet: true });
    const p = k.w(x, z); c.root.position.set(p[0], k.base, p[1]); c.root.rotation.y = k.heading(-Math.PI / 2);
    c.homeRot = c.root.rotation.y; c.workT = 1 + Math.random() * 2; c.reach = 0;
    scene.add(c.root); return c;
  });
  const mid = k.w(12, mz(15));
  I.updaters.push((dt, game) => {
    const pp = game?.player?.pos;
    if (pp && (pp.x - mid[0]) ** 2 + (pp.z - mid[1]) ** 2 > 70 * 70) return; // nobody is watching
    staff.update(dt, { speed: 0 });
    for (const c of crew) {
      if ((c.workT -= dt) <= 0) { c.workT = 1.6 + Math.random() * 2.6; c.reach = 0.7; c.turn = (Math.random() - 0.5) * 0.7; }
      c.reach -= dt;
      c.root.rotation.y += (c.homeRot + (c.reach > 0 ? c.turn : 0) - c.root.rotation.y) * Math.min(1, dt * 4);
      c.update(dt, { speed: 0, pose: c.reach > 0 ? 'give' : null });
    }
  });
  let ordered = false;
  const cp = k.w(17.0, mz(15.0));
  I.actions.push({
    x: cp[0], z: cp[1], r: 2.6, y: 0, label: () => '按 <kbd>E</kbd> 點餐', cond: () => !(I.mcd && (I.mcd.busy || I.mcd.closed)),
    fn: (g) => {
      // 大麥克套餐 NT$155 (menu board price): earn more by working the counter (staff entrance behind it)
      if (g.money < 155) {
        g.dialog([['麥當勞店員', '歡迎光臨！大麥克套餐一份 155 元～'], ['彥霖', `（翻錢包）……只剩 ${  g.money  } 元 😅`],
          ['麥當勞店員', '我們有在徵打工喔！從櫃檯旁邊繞到後面的員工入口，按 [[E|A]] 就能上班。']]);
        return;
      }
      g.spend(155, '麥當勞 大麥克套餐');
      g.dialog([
        ['麥當勞店員', '歡迎光臨麥當勞！請問要點什麼？'],
        ['彥霖', '一份大麥克套餐，飲料換可樂 🍔'],
        ['麥當勞店員', ordered ? '又來啦～選舉加油喔！' : '好的！欸你是那個資管系的候選人嗎？我室友是資管的，叫她投你！'],
      ], () => {
        g.hud.toast('🍔 大麥克套餐 get！體力回復', 'good', 2000); g.audio.pickup();
        if (!ordered) { ordered = true; g.addVotes(2, '店員的室友 +2 票'); }
        g.player.boost = 30;
      });
    },
  });
  // part-time job (值班, see mcshift.js): staff entrance through the gap at the counter's dining end, time
  // clock on the partition just inside; you work the middle register, the queue forms across the counter
  const se = k.w(14.4, mz(11.0));
  I.actions.push({
    x: se[0], z: se[1], r: 1.3, y: 0, cond: () => !(I.mcd && (I.mcd.busy || I.mcd.closed)),
    label: () => '按 <kbd>E</kbd> 打卡上班：櫃台點餐（時薪 NT$196）',
    fn: (g) => g.job.start(),
  });
  // …or work the kitchen line (mckitchen.js): punch in at the second grill
  const kp = k.w(...kitchen.player);
  I.actions.push({
    x: kp[0], z: kp[1], r: 1.1, y: 0, cond: () => !(I.mcd && (I.mcd.busy || I.mcd.closed)),
    label: () => '按 <kbd>E</kbd> 上內場：煎台＋炸爐（時薪 NT$196）',
    fn: (g) => g.job.startKitchen(),
  });
  const bulk = new THREE.Mesh(new THREE.BoxGeometry(1.0, H - 2.5, 1.0), M(MT.wall)); bulk.position.set(15.7, (H + 2.5) / 2, mz(10.9)); k.group.add(bulk); // header over the gap
  km.plane(T.mcStaff(), 0.96, 0.31, 16.21, 2.3, 10.9, Math.PI / 2, { emissive: 0.5 });
  const clockBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.1), M('dark')); clockBox.position.set(13.3, 1.45, mz(10.45)); k.group.add(clockBox);
  km.plane(T.sign('打卡鐘', '#ffc72c', '#1b1b1b', 'mcclock', 256, 128, 54), 0.46, 0.23, 13.3, 1.62, 10.505, 0);
  km.plane(T.sign('打工值班（櫃台／內場）→ 員工入口在櫃台左側', '#c8102e', '#ffffff', 'mcstaffway2', 1024, 128, 46), 1.0, 0.125, 16.205, 0.86, 12.0, Math.PI / 2, { emissive: 0.25 });
  // ---- opening hours 05:00–23:00: outside them the lights go down, a roller shutter closes the door, the crew go
  //      home and ordering / shifts are off. If you are inside when it shuts, the shutter lets you out.
  const OPEN0 = 5 * 60, OPEN1 = 23 * 60;
  const shutterMat = new THREE.MeshStandardMaterial({ map: ctex('mcShutter', 64, 128, (g, w, h) => { g.fillStyle = '#9aa0a6'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = '#7c8288'; g.fillRect(0, y, w, 2); g.fillStyle = '#b5bac0'; g.fillRect(0, y + 2, w, 1); } }), metalness: 0.5, roughness: 0.5 });
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.06, OH, OZ1 - 0.3 + 0.2), shutterMat); // the whole west opening
  shutter.position.set(W + 0.12, OH / 2, (0.3 + OZ1) / 2); shutter.visible = false; k.group.add(shutter);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: T.sign('本店已打烊・營業時間 05:00–23:00', '#1b1b1b', '#ffc72c', 'mcClosed', 1024, 256, 64) }));
  sign.position.set(W + 0.16, 1.55, OZM); sign.rotation.y = Math.PI / 2; sign.visible = false; k.group.add(sign);
  const wi = I.walls.length; k.wallLine(W + 0.1, 0.3, W + 0.1, OZ1, 0, OH); const shutWall = I.walls[wi], wallY = [shutWall[4], shutWall[5]];
  shutWall[4] = shutWall[5] = -100; // open: the wall is out of the way
  // the shop's own lit materials (signs, menu boards, panels, downlights) get their own copies so only they dim
  const lit = new Map();
  k.group.traverse(o => { if (!o.isMesh || !o.material || Array.isArray(o.material) || o === shutter || o === sign) return; const m = o.material; if (!(m.emissiveIntensity > 0) || !m.emissive || m.emissive.getHex() === 0) return; if (!lit.has(m)) { const c = m.clone(); lit.set(m, { c, base: m.emissiveIntensity }); } o.material = lit.get(m).c; });
  const inShop = k.rect(0, W, 0, D);
  const mcdState = { closed: false };
  const setClosed = (on) => {
    mcdState.closed = on; shutter.visible = sign.visible = on;
    for (const { c, base } of lit.values()) c.emissiveIntensity = on ? base * 0.06 : base;
    for (const c of [staff, ...crew]) c.root.visible = !on;
  };
  I.updaters.push((dt, game) => {
    const m = ((game.clock % 1440) + 1440) % 1440, closed = m < OPEN0 || m >= OPEN1;
    if (closed !== mcdState.closed && !(I.mcd && I.mcd.busy)) setClosed(closed); // a shift already under way finishes first
    const p = game.player.pos, inside = pointInPoly(p.x, p.z, inShop);
    shutWall[4] = mcdState.closed && !inside ? wallY[0] : -100; shutWall[5] = mcdState.closed && !inside ? wallY[1] : -99;
  });
  I.actions.push({ ...(() => { const e = k.w(W + 1.2, OZM); return { x: e[0], z: e[1] }; })(), r: 2.2, y: 0, cond: () => mcdState.closed,
    label: () => '麥當勞已打烊（營業時間 05:00–23:00）', fn: (g) => g.hud.toast('🍟 麥當勞已打烊，早上 5 點再來吧', 'good', 2000) });
  // 漢克 (js/hank.js) works the register at the dining end, 18:00–22:00
  const hankSpot = { at: k.w(14.6, mz(12.6)), y: k.base, h: k.heading(Math.PI / 2), talk: k.w(17.0, mz(12.6)) };
  // entry: shop-local spot in the 學餐用餐區 where the 值班's customers come in from / go back to (js/mcshift.js)
  const out = { entrance: k.w(W + 3, OZM), door: MCD_OPEN, entry: [W + 2.5, 7.8], k, W, D, staff, crew, kitchen, busy: false, hankSpot };
  Object.defineProperty(out, 'closed', { get: () => mcdState.closed });
  return out;
}

// =====================================================================
// 麥當勞 內場 — the kitchen behind the counter and the back corridor, in buildMcD's design frame (km / mz).
// Laid out like a real McDonald's line, so it reads from the lobby over the counter:
//   front pass   x 13.15–13.8: drink tower, coffee machine, heat-lamp pass with bags and trays, KVS order
//                screens, ice-cream machine (all facing the register aisle x 13.8–15.2)
//   island       x 11.45–12.3: UHC holding cabinet + assembly rail (condiments, wrap papers)
//   cooking line x 9.5–10.4 on the black-tiled back wall under a stainless hood: 2 clamshell grills, bun
//                toaster, chicken fryer, fries fryer, fry dump under a heat lamp, hand sink
//   back corridor x 0.3–9.3, z 10.4–12.0 through a door in the back wall, after the photo 內場.jpg:
//                galvanised walk-in freezer / cooler with yellow labels, louvred steel doors, fire-alarm panel,
//                black shelf of syrup boxes with the delivery bag, water filter with blue hoses, red pedal bin,
//                white wall tiles, terracotta quarry floor, LED ceiling panels
// Small details are atlas pictures (KR) on quads merged into two meshes. Returns shop-local anchors for the
// crew and for the kitchen job (mckitchen.js), which animates the grill platen, baskets and food itself.
// =====================================================================
function buildMcKitchen({ I, k, km, mz, put, MT, H, KX, DZ, D }) {
  const box = (x0, x1, y0, y1, z0, z1, mat) => km.box(x0, x1, y0, y1, z0, z1, mat, { col: false });
  const solid = (x0, x1, z0, z1, y1 = 1.3) => km.wallRect(x0, x1, z0, z1, 0, y1);
  const cyl = (mat, rt, rb, h, x, y, z, seg = 12) => put(mat, new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, mz(z)));
  const barZ = (mat, r, len, x, y, z) => put(mat, new THREE.CylinderGeometry(r, r, len, 8).rotateX(Math.PI / 2).translate(x, y, mz(z)));
  const quad = (name, w, h, x, y, z, rotY, glow = false) => put(glow ? MT.kglow : MT.kdecal, atlasUV(new THREE.PlaneGeometry(w, h), name).rotateY(Math.PI - rotY).translate(x, y, mz(z)));
  // lying on a top surface: wz along z, dx along x
  const quadUp = (name, wz, dx, x, y, z, glow = false) => put(glow ? MT.kglow : MT.kdecal, atlasUV(new THREE.PlaneGeometry(wz, dx), name).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).translate(x, y, mz(z)));
  const E = KX + 0.9; // front edge of the cooking line

  // ---------------- cooking line ----------------
  km.box(KX, KX + 0.02, 0.9, 2.08, 11.75, D - 0.35, MT.blackTile, { col: false, tile: [0.3, 0.3] }); // tiled splash
  solid(KX, E + 0.05, 11.8, D - 0.3);
  const cabinet = (z0, z1, top = 0.84) => {
    box(KX, E, 0.1, top, z0, z1, MT.kSteel); box(KX, E - 0.06, 0, 0.1, z0, z1, MT.kBlack); // body + recessed kick
    box(E, E + 0.006, 0.18, top - 0.08, z0 + 0.05, z1 - 0.05, MT.kSteelDk);                   // door panel
  };
  const grill = (z0, z1, raised) => {
    const m = (z0 + z1) / 2;
    cabinet(z0, z1);
    box(KX, E + 0.04, 0.84, 0.9, z0, z1, MT.kBlack);                 // griddle plate
    quadUp('grill', z1 - z0 - 0.08, 0.7, KX + 0.47, 0.902, m);
    box(E, E + 0.07, 0.8, 0.88, z0 + 0.02, z1 - 0.02, MT.kSteel);     // grease trough at the front
    box(KX, KX + 0.1, 0.9, 1.15, z0, z1, MT.kSteel);                  // hinge housing
    quad('hot', 0.24, 0.09, E + 0.009, 0.7, z0 + 0.24, Math.PI / 2);
    for (let i = 0; i < 3; i++) put('chrome', new THREE.CylinderGeometry(0.02, 0.02, 0.025, 10).rotateZ(Math.PI / 2).translate(E + 0.018, 0.7, mz(m + 0.08 + i * 0.16)));
    if (raised) { // clamshell platen standing open
      box(KX + 0.1, KX + 0.17, 0.95, 1.58, z0 + 0.05, z1 - 0.05, MT.kSteel);
      box(KX + 0.17, KX + 0.175, 1.0, 1.54, z0 + 0.1, z1 - 0.1, MT.kBlack);
      barZ('chrome', 0.012, z1 - z0 - 0.3, KX + 0.21, 1.52, m);
    }
  };
  grill(11.9, 13.3, true); grill(13.4, 14.8, false); // the second grill's platen belongs to mckitchen.js
  // vertical bun toaster + a tray of buns
  cabinet(14.9, 15.5, 0.88); box(KX, E + 0.02, 0.88, 0.92, 14.9, 15.5, MT.kSteel);
  box(KX + 0.04, KX + 0.5, 0.92, 1.62, 14.95, 15.45, MT.kSteelDk);
  quad('toaster', 0.42, 0.3, KX + 0.502, 1.36, 15.2, Math.PI / 2, true);
  box(KX + 0.55, E - 0.02, 0.92, 0.95, 14.95, 15.45, MT.tray);
  for (let i = 0; i < 6; i++) put(MT.bun, new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(KX + 0.62 + (i % 2) * 0.13, 0.95, mz(15.03 + Math.floor(i / 2) * 0.16)));
  // fryers: two vats each, control tower at the back, basket hanger
  const fryer = (z0, z1) => {
    const m = (z0 + z1) / 2, x0 = KX + 0.22, x1 = E - 0.08;
    cabinet(z0, z1, 0.8);
    box(KX, x0, 0.8, 1.34, z0, z1, MT.kSteel);
    quad('fryPanel', 0.5, 0.25, x0 + 0.002, 1.14, m, Math.PI / 2, true);
    box(x1, E, 0.8, 0.9, z0, z1, MT.kSteel);
    for (const zz of [z0, m - 0.02, z1 - 0.04]) box(x0, x1, 0.8, 0.9, zz, zz + 0.04, MT.kSteel);
    for (const [a, b] of [[z0 + 0.04, m - 0.02], [m + 0.02, z1 - 0.04]]) quadUp('oil', b - a, x1 - x0, (x0 + x1) / 2, 0.85, (a + b) / 2);
    barZ('chrome', 0.01, z1 - z0 - 0.1, KX + 0.18, 1.38, m);
    quad('hot', 0.24, 0.09, E + 0.009, 0.62, z0 + 0.24, Math.PI / 2);
  };
  fryer(15.6, 16.8); fryer(16.9, 18.1);
  // fry dump station under a heat lamp, with red fry cartons
  cabinet(18.2, 19.0, 0.86);
  box(KX + 0.06, E - 0.04, 0.86, 0.9, 18.25, 18.95, MT.kSteelDk);
  quadUp('fries', 0.66, 0.6, KX + 0.45, 0.902, 18.6);
  box(KX, KX + 0.06, 0.9, 1.56, 18.2, 19.0, MT.kSteel);
  box(KX, E, 1.56, 1.62, 18.2, 19.0, MT.kSteel); box(KX + 0.12, E - 0.12, 1.55, 1.56, 18.3, 18.9, MT.warm);
  for (let i = 0; i < 3; i++) { box(E - 0.13, E - 0.02, 0.9, 1.02, 18.3 + i * 0.2, 18.42 + i * 0.2, '#db0007'); quad('carton', 0.1, 0.1, E - 0.018, 0.96, 18.36 + i * 0.2, Math.PI / 2); }
  // hand sink + SOP poster at the end of the line
  box(KX, KX + 0.4, 0.3, 0.78, 19.15, 19.55, MT.kSteel); box(KX, KX + 0.5, 0.78, 0.9, 19.1, 19.6, MT.kSteel);
  box(KX + 0.05, KX + 0.45, 0.9, 0.902, 19.15, 19.55, MT.kSteelDk);
  cyl('chrome', 0.012, 0.012, 0.26, KX + 0.07, 1.03, 19.35); put('chrome', new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8).rotateZ(Math.PI / 2).translate(KX + 0.15, 1.15, mz(19.35)));
  quad('sop', 0.32, 0.4, KX + 0.025, 1.45, 19.35, Math.PI / 2);
  // stainless hood over the line with lamps and filters, duct to the ceiling
  box(KX, E + 0.35, 2.08, 2.7, 11.8, 18.3, MT.kSteel);
  box(KX + 0.02, E + 0.3, 2.04, 2.08, 11.85, 18.25, MT.kSteelDk);
  for (const z of [12.6, 14.1, 16.2, 17.5]) box(E - 0.05, E + 0.25, 2.035, 2.04, z - 0.28, z + 0.28, 'light');
  box(KX, KX + 0.7, 2.7, H - 0.1, 14.6, 15.6, MT.kSteel);

  // ---------------- assembly island with the UHC ----------------
  const IX0 = 11.45, IX1 = 12.3;
  box(IX0, IX1, 0.1, 0.88, 12.4, 17.6, MT.kSteel); box(IX0 + 0.06, IX1 - 0.06, 0, 0.1, 12.45, 17.55, MT.kBlack);
  box(IX0 - 0.02, IX1 + 0.02, 0.88, 0.92, 12.38, 17.62, MT.kSteel);
  for (const x of [IX0 - 0.006, IX1]) box(x, x + 0.006, 0.18, 0.78, 12.5, 17.5, MT.kSteelDk);
  solid(IX0, IX1, 12.4, 17.6);
  box(IX0 + 0.06, IX1 - 0.06, 0.92, 1.66, 12.9, 15.2, MT.kSteelDk);
  box(IX0 + 0.04, IX1 - 0.04, 1.66, 1.7, 12.88, 15.22, MT.kSteel);
  quad('uhc', 2.2, 0.68, IX0 + 0.055, 1.29, 14.05, -Math.PI / 2); quad('uhc', 2.2, 0.68, IX1 - 0.055, 1.29, 14.05, Math.PI / 2);
  box(IX0 + 0.28, IX0 + 0.58, 0.92, 1.0, 15.5, 17.4, MT.kSteel); // condiment rail
  ['#7fb24a', '#f1eee4', '#3f6b2a', '#ffcc33', '#e9d8b4', '#c0392b'].forEach((c, i) => box(IX0 + 0.31, IX0 + 0.55, 1.0, 1.005, 15.55 + i * 0.3, 15.8 + i * 0.3, c));
  quadUp('wrap', 0.5, 0.2, IX1 - 0.13, 0.925, 16.0);
  for (let i = 0; i < 4; i++) box(IX0 + 0.06, IX0 + 0.2, 0.92, 0.98, 15.6 + i * 0.4, 15.74 + i * 0.4, i % 2 ? '#2b6cb0' : '#f2c230');

  // ---------------- front pass (behind the registers) ----------------
  const PX0 = 13.15, PX1 = 13.8;
  box(PX0, PX1, 0.1, 0.9, 11.7, 18.6, MT.kSteel); box(PX0 + 0.06, PX1 - 0.06, 0, 0.1, 11.75, 18.55, MT.kBlack);
  box(PX1, PX1 + 0.006, 0.18, 0.8, 11.8, 18.5, MT.kSteelDk);
  box(PX0 - 0.02, PX1 + 0.02, 0.9, 0.94, 11.68, 18.62, MT.kSteel);
  solid(PX0, PX1, 11.7, 18.6);
  // drink tower: six taps, drip tray, cup stacks on top
  box(PX0 + 0.05, PX1 - 0.05, 0.94, 1.78, 11.8, 13.1, MT.kSteel);
  quad('drink', 1.2, 0.6, PX1 - 0.045, 1.48, 12.45, Math.PI / 2);
  for (let i = 0; i < 6; i++) cyl('chrome', 0.014, 0.01, 0.07, PX1 - 0.09, 1.22, 11.95 + i * 0.2, 8);
  box(PX1 - 0.25, PX1 - 0.02, 0.94, 0.97, 11.85, 13.05, MT.kBlack);
  for (let i = 0; i < 3; i++) cyl(MT.cup, 0.045, 0.035, 0.3, PX0 + 0.2, 1.93, 11.98 + i * 0.2, 14);
  // coffee machine
  box(PX0 + 0.05, PX1 - 0.08, 0.94, 1.6, 13.2, 13.72, MT.kBlack);
  quad('coffee', 0.44, 0.33, PX1 - 0.078, 1.32, 13.46, Math.PI / 2, true);
  // heat-lamp pass: bags, trays and wrapped burgers waiting to go out
  box(PX0, PX1, 1.52, 1.57, 13.85, 16.8, MT.kSteel);
  for (const z of [13.85, 16.75]) box(PX0, PX0 + 0.05, 0.94, 1.52, z, z + 0.05, MT.kSteel);
  box(PX0 + 0.1, PX1 - 0.1, 1.515, 1.52, 13.95, 16.7, MT.warm);
  for (let i = 0; i < 3; i++) { const z = 14.05 + i * 0.45; box(PX0 + 0.2, PX0 + 0.42, 0.94, 1.24, z, z + 0.14, MT.cardboard); quad('bag', 0.14, 0.21, PX0 + 0.422, 1.1, z + 0.07, Math.PI / 2); }
  for (const z of [15.5, 16.1]) {
    box(PX0 + 0.12, PX1 - 0.06, 0.94, 0.955, z, z + 0.45, MT.tray);
    box(PX0 + 0.2, PX0 + 0.32, 0.955, 1.01, z + 0.06, z + 0.18, '#f2c230'); box(PX0 + 0.4, PX0 + 0.5, 0.955, 1.07, z + 0.22, z + 0.32, '#db0007');
  }
  // KVS order screens hanging over the pass
  for (const [z, n] of [[14.45, 'kvs'], [16.1, 'kvs2']]) {
    box(PX0 + 0.26, PX0 + 0.32, 1.76, 2.2, z - 0.36, z + 0.36, MT.kBlack);
    quad(n, 0.66, 0.41, PX0 + 0.322, 1.98, z, Math.PI / 2, true);
    for (const dz of [-0.25, 0.25]) cyl('chrome', 0.008, 0.008, H - 0.1 - 2.2, PX0 + 0.29, (H - 0.1 + 2.2) / 2, z + dz, 6);
  }
  // ice-cream machine, cups and lids, tray stack
  box(PX0 + 0.05, PX1 - 0.05, 0.94, 1.8, 16.95, 17.65, MT.kSteel);
  quad('icecream', 0.6, 0.6, PX1 - 0.045, 1.4, 17.3, Math.PI / 2);
  for (let i = 0; i < 4; i++) cyl(MT.cup, 0.045, 0.035, 0.32, PX0 + 0.25 + (i % 2) * 0.14, 1.1, 17.9 + Math.floor(i / 2) * 0.2, 14);
  for (let n = 0; n < 5; n++) box(PX0 + 0.1, PX1 - 0.1, 0.94 + n * 0.02, 0.955 + n * 0.02, 18.2, 18.55, MT.tray);
  // whiteboard of the day's prep on the partition, steel frame round the back door
  quad('board', 1.1, 0.69, 11.6, 1.75, DZ + 0.155, 0);
  box(KX - 0.22, KX + 0.02, 0, 2.28, 11.5, 11.58, MT.kSteel); box(KX - 0.22, KX + 0.02, 2.2, 2.28, DZ + 0.15, 11.58, MT.kSteel);

  // ---------------- back corridor (photo 內場.jpg) ----------------
  const NZ = DZ + 0.15, CZ = 12.0, BX = KX - 0.2; // corridor z NZ..CZ, x 0.3..BX
  km.box(0.3, KX, 0.1, 0.106, NZ, CZ, MT.quarry, { col: false, tile: [0.3, 0.3] });
  km.box(0.3, BX, 2.75, 2.8, NZ, CZ + 0.12, MT.ceil, { col: false, tile: [0.6, 0.6] });
  for (const x of [1.6, 4.6, 7.6]) box(x - 0.6, x + 0.6, 2.735, 2.75, 10.9, 11.5, 'light');
  box(3.0, 3.6, 2.74, 2.75, 11.05, 11.35, MT.vent);
  km.box(0.3, BX, 0, 2.8, CZ, CZ + 0.12, MT.wallGrey); // walk-in side (collides)
  // louvred stainless door to the crew room
  box(0.75, 1.75, 0, 2.15, CZ - 0.035, CZ, MT.kSteel);
  quad('louver', 0.7, 0.42, 1.25, 1.78, CZ - 0.037, Math.PI);
  box(0.9, 1.6, 0.98, 1.02, CZ - 0.08, CZ - 0.035, 'chrome');
  box(0.7, 1.8, 2.15, 2.22, CZ - 0.045, CZ, MT.kSteel); for (const x of [0.7, 1.75]) box(x, x + 0.05, 0, 2.15, CZ - 0.045, CZ, MT.kSteel);
  quad('staffRoom', 0.84, 0.21, 1.25, 2.42, CZ - 0.005, Math.PI);
  // grey wall with a dark wainscot, fire-alarm panel and network boxes
  box(1.8, 3.0, 0, 1.05, CZ - 0.02, CZ, MT.wainscot);
  box(2.12, 2.6, 1.2, 1.78, CZ - 0.1, CZ, '#efe9d8'); quad('fire', 0.46, 0.56, 2.36, 1.49, CZ - 0.102, Math.PI);
  box(2.15, 2.55, 2.0, 2.5, CZ - 0.09, CZ, '#e8e8e4'); quad('net', 0.26, 0.4, 2.35, 2.25, CZ - 0.092, Math.PI);
  box(2.62, 2.85, 2.1, 2.4, CZ - 0.06, CZ, '#f4f4f0');
  // walk-in freezer + cooler: galvanised panels, white bump rails, two doors with yellow labels and thermometers
  km.box(3.0, BX, 0, 2.75, CZ - 0.08, CZ, MT.galv, { col: false, tile: [1.2, 2.75] });
  for (const y of [0.42, 0.92]) box(3.0, BX - 0.05, y, y + 0.06, CZ - 0.13, CZ - 0.08, MT.cup);
  for (const [x0, lbl] of [[3.7, 'freeze'], [6.3, 'cold']]) {
    box(x0, x0 + 0.95, 0.04, 2.05, CZ - 0.15, CZ - 0.08, MT.galv);
    box(x0 + 0.78, x0 + 0.84, 1.0, 1.25, CZ - 0.21, CZ - 0.15, 'chrome');
    for (const y of [0.35, 1.7]) box(x0 - 0.03, x0 + 0.06, y, y + 0.14, CZ - 0.18, CZ - 0.08, MT.kSteelDk);
    quad(lbl, 0.32, 0.12, x0 + 0.47, 1.62, CZ - 0.152, Math.PI);
    box(x0 + 0.3, x0 + 0.62, 1.82, 1.98, CZ - 0.17, CZ - 0.15, MT.kBlack); quad('fryPanel', 0.3, 0.15, x0 + 0.46, 1.9, CZ - 0.172, Math.PI, true);
  }
  cyl('#141414', 0.03, 0.03, 1.8, 8.05, 0.9, CZ - 0.2, 8); // black hose down the cooler wall
  box(8.35, 8.8, 0, 0.72, CZ - 0.48, CZ - 0.1, MT.redBin); box(8.33, 8.82, 0.72, 0.78, CZ - 0.5, CZ - 0.09, '#a8141c');
  solid(8.35, 8.8, CZ - 0.5, CZ, 0.8);
  // partition side: white tiles, water filter with blue hoses, drain mat
  km.box(0.3, BX, 0, 2.0, NZ, NZ + 0.015, MT.whiteTile, { col: false, tile: [0.6, 0.6] });
  for (const x of [0.75, 1.0]) cyl(MT.cup, 0.055, 0.055, 0.5, x, 1.55, NZ + 0.09, 14);
  put(MT.blue, new THREE.CylinderGeometry(0.13, 0.13, 0.34, 18).rotateZ(Math.PI / 2).translate(0.88, 2.25, mz(NZ + 0.16)));
  for (const x of [0.62, 1.13, 1.2]) cyl(MT.blue, 0.012, 0.012, 2.1, x, 1.05, NZ + 0.05, 6);
  quadUp('drain', 0.55, 0.9, 1.0, 0.112, NZ + 0.4);
  // black shelf with bag-in-box syrup and the delivery bag; wire shelf with stock
  const shelf = (x0, x1, mat, levels) => {
    for (const x of [x0, x1 - 0.03]) for (const z of [NZ + 0.02, NZ + 0.5]) box(x, x + 0.03, 0, 1.8, z, z + 0.03, mat);
    for (const y of levels) box(x0, x1, y, y + 0.025, NZ + 0.02, NZ + 0.53, mat);
    solid(x0, x1, NZ, NZ + 0.55, 1.8);
  };
  shelf(1.6, 2.6, MT.blackMetal, [0.12, 0.62, 1.78]);
  for (const [x, y, n] of [[1.63, 0.145, 'syrupA'], [2.1, 0.145, 'syrupB'], [1.63, 0.645, 'syrupA']]) { box(x, x + 0.45, y, y + 0.34, NZ + 0.08, NZ + 0.48, MT.cardboard); quad(n, 0.45, 0.3, x + 0.225, y + 0.17, NZ + 0.482, 0); }
  box(1.62, 2.58, 1.805, 2.25, NZ + 0.05, NZ + 0.52, '#1c1d20');
  shelf(3.3, 4.5, 'chrome', [0.15, 0.7, 1.25, 1.78]);
  for (const [x, y] of [[3.35, 0.175], [3.9, 0.175], [3.35, 0.725], [3.95, 1.275]]) box(x, x + 0.5, y, y + 0.3, NZ + 0.07, NZ + 0.47, MT.cardboard);
  // yellow 小心地滑 A-frame in the middle of the corridor
  const zc = mz(NZ + 0.95);
  for (const s of [-1, 1]) {
    put(MT.yellow, new THREE.BoxGeometry(0.32, 0.62, 0.014).translate(0, 0.31, 0).rotateX(-0.16 * s).translate(5.4, 0.106, zc + 0.1 * s));
    put(MT.kdecal, atlasUV(new THREE.PlaneGeometry(0.28, 0.35), 'caution').rotateY(s > 0 ? 0 : Math.PI).translate(0, 0.38, 0.009 * s).rotateX(-0.16 * s).translate(5.4, 0.106, zc + 0.1 * s));
  }
  // end wall: white tiles and the steel back door (deliveries)
  km.box(0.3, 0.315, 0, 2.0, NZ, CZ, MT.whiteTile, { col: false, tile: [0.6, 0.6] });
  box(0.3, 0.34, 0, 2.15, 10.55, 11.55, MT.kSteel);
  quad('louver', 0.7, 0.42, 0.342, 1.78, 11.05, Math.PI / 2);
  box(0.34, 0.38, 0.98, 1.02, 10.7, 11.4, 'chrome');
  quad('backDoor', 0.84, 0.21, 0.32, 2.42, 11.05, Math.PI / 2);
  // low ceiling in the corridor: keep the follow camera under it (zones are matched first come, first served)
  I.zones.push({ name: '麥當勞 中原店', pts: k.rect(0.3, KX, mz(CZ), mz(NZ)), y0: 0, y1: 2.8, ceil: () => 2.5 });

  const at = (x, z) => [x, mz(z)];
  return {
    grill: { hinge: at(KX + 0.13, 14.1), hingeY: 0.95, len: 1.3, patties: [[KX + 0.32, 13.78], [KX + 0.6, 13.78], [KX + 0.32, 14.42], [KX + 0.6, 14.42]].map(([x, z]) => at(x, z)), top: 0.902 },
    fryers: { chick: [15.91, 16.49].map(z => at(KX + 0.52, z)), fries: [17.21, 17.79].map(z => at(KX + 0.52, z)), oil: 0.85 },
    kvs: [E + 0.37, 1.84, mz(14.45)],
    player: at(E + 0.5, 15.55),
    cam: [E + 2.3, 2.5, mz(16.0)], look: [KX + 0.35, 0.95, mz(15.5)],
    crewGrill: at(E + 0.5, 12.6), crewAssembly: at(12.72, 16.4), fryStaff: at(E + 0.5, 17.5),
  };
}

// =====================================================================
// 警衛室 (main gate on 中北路, side gate on 新中北路 by the activity centre): enterable, sit and stand guard; the side gate runs the 門禁 quest
// (the main gate's booth is the glass kiosk of buildMainKiosk below: kiosk = MAIN_GATE)
// =====================================================================
function buildGuardhouse(I, scene, x, z, ang, name, gateOpt = null, lanes = null, kiosk = null) {
  const k = new Kit(I, x, z, ang);
  const W = 3.4, D = 2.8, H = 2.8;
  const booth = kiosk ? buildMainKiosk(k) : { seat: [1.72, 1.38], face: Math.PI, y0: 0, y1: H, pts: [[0, 0], [W, 0], [W, D], [0, D]] };
  if (!kiosk) {
    k.box(0, W, 0, 0.1, 0, D, 'floor', { col: false, surface: true });
    // lower walls
    k.box(0, W, 0, 1.0, 0, 0.12, 'white'); k.box(0, 0.12, 0, 1.0, 0, D, 'white'); k.box(W - 0.12, W, 0, 1.0, 0, D, 'white');
    k.box(1.2, W, 0, 1.0, D - 0.12, D, 'white'); k.box(0, 0.25, 0, 1.0, D - 0.12, D, 'white');
    // glass band + door opening (front, x 0.25..1.2)
    k.box(0, W, 1.0, 2.3, 0, 0.08, 'glass'); k.box(0, 0.08, 1.0, 2.3, 0, D, 'glass'); k.box(W - 0.08, W, 1.0, 2.3, 0, D, 'glass');
    k.box(1.2, W, 1.0, 2.3, D - 0.08, D, 'glass'); k.box(0, 0.25, 1.0, 2.3, D - 0.08, D, 'glass');
    k.box(0, W, 2.3, H, 0, 0.12, 'white', { col: false }); k.box(0, 0.12, 2.3, H, 0, D, 'white', { col: false }); k.box(W - 0.12, W, 2.3, H, 0, D, 'white', { col: false });
    k.box(0, W, 2.3, H, D - 0.12, D, 'white', { col: false });
    k.box(-0.5, W + 0.5, H, H + 0.22, -0.5, D + 0.5, 'gray', { col: false });
    for (const [px, pz] of [[0, 0], [W, 0], [0, D], [W, D]]) k.box(px - 0.06, px + 0.06, 0, H, pz - 0.06, pz + 0.06, 'metal', { col: false });
    k.plane(T.sign('警衛室', '#1f3b73', '#ffffff', 'guard', 256, 96, 60), 1.5, 0.55, W / 2, H - 0.25, D + 0.02);
    // desk with monitor & phone, chair
    k.box(0.15, W - 0.15, 0.75, 0.8, 0.15, 0.75, 'desk'); k.wallRect(0.15, W - 0.15, 0.15, 0.75, 0, 0.8);
    k.box(1.4, 2.0, 0.8, 1.2, 0.25, 0.3, 'dark', { col: false });
    k.plane(T.cctv(), 0.56, 0.36, 1.7, 1.0, 0.31, 0, { emissive: 0.8 });
    k.box(2.4, 2.65, 0.8, 0.86, 0.3, 0.5, 'dark', { col: false });
    k.box(1.5, 1.95, 0.45, 0.5, 1.15, 1.6, 'dark', { col: false }); k.box(1.5, 1.95, 0.5, 1.0, 1.58, 1.62, 'dark', { col: false });
    k.box(1.68, 1.77, 0, 0.45, 1.33, 1.42, 'metal', { col: false });
  }
  // boom barriers. Each one pivots on a post next to the booth and points straight across its lane
  // (local -z or +z: the booth's x axis runs along the road). Rz lifts the bar, Ry turns it across.
  const barCv = ctex('bar', 128, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : '#d0151f'; g.fillRect(i * 16, 0, 16, 16); } }, true);
  const barMat = new THREE.MeshStandardMaterial({ map: barCv }); barCv.repeat.set(3, 1);
  const hinges = [];
  const boom = (lx, lz, dir, L, o = {}) => {
    const arm = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.0, 0.34), M(o.post || 'gray')); post.position.set(0, 0.5, 0);
    if (o.post) { const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.38), M('#f4f2ec')); cap.position.y = 1.03; arm.add(cap); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, 0.1), barMat); bar.position.set(L / 2, 0, 0);
    const hinge = new THREE.Group(); hinge.position.set(0, 1.0, 0); hinge.add(bar); hinge.rotation.y = dir < 0 ? Math.PI / 2 : -Math.PI / 2;
    // warning signs hanging under the bar, readable from both sides (正門: 減速慢行, 20)
    (o.signs || []).forEach((t, i) => {
      // 正門 2022: yellow cloth banners (~1.1 x 0.45 m) hung under the middle of the arm
      const round = t === '20', banner = t.length > 4 || t.includes('|'), sw = round ? 0.42 : banner ? Math.min(1.15, L * 0.5) : 0.7, sh = round ? 0.42 : banner ? 0.46 : 0.26;
      const g = mergeGeometries([0, Math.PI].map(side => new THREE.PlaneGeometry(sw, sh).rotateY(side).translate(0, 0, side ? -0.056 : 0.056)), false);
      const m = new THREE.Mesh(g, gateSignMat(t)); m.position.set(banner ? L * 0.52 : L * (0.45 + i * 0.22), -0.05 - sh / 2, 0); hinge.add(m);
    });
    arm.add(post, hinge); arm.position.set(lx, 0, lz); k.group.add(arm);
    hinges.push({ hinge, at: k.w(lx, lz + dir * L / 2) });
  };
  const hingeLX = W + 0.7;
  if (gateOpt) {
    // side gates: local z < 0 is the road (booth front faces it); one boom across the whole lane
    const off = gateOpt.off, rw = gateOpt.roadW;
    boom(hingeLX, -0.55, -1, rw + 1.9);
    // gate posts either side of the road + arched sign
    const gx = W + 2.2, zNear = -0.25, zFar = -(off + rw / 2 + 0.6);
    k.box(gx - 0.35, gx + 0.35, 0, 4.6, zNear - 0.7, zNear, 'white'); k.box(gx - 0.35, gx + 0.35, 0, 4.6, zFar, zFar + 0.7, 'white');
    k.box(gx - 0.4, gx + 0.4, 4.6, 4.75, zNear - 0.75, zNear + 0.05, 'gray', { col: false }); k.box(gx - 0.4, gx + 0.4, 4.6, 4.75, zFar - 0.05, zFar + 0.75, 'gray', { col: false });
    k.box(gx - 0.25, gx + 0.25, 4.0, 4.7, zFar + 0.35, zNear - 0.35, 'gray', { col: false });
    const label = gateOpt.sign || '中原大學 側門';
    const sg = T.sign(label, '#1f3b73', '#ffffff', `gate${  label}`, 512, 96, 54), span = zNear - zFar - 0.9;
    k.plane(sg, span, 0.62, gx + 0.26, 4.35, (zNear + zFar) / 2, Math.PI / 2);
    k.plane(sg, span, 0.62, gx - 0.26, 4.35, (zNear + zFar) / 2, -Math.PI / 2);
  } else if (lanes) {
    // main gate: the booth sits on the island between the in and out lanes -> one boom across each
    for (const ln of lanes) boom(ln.x ?? (ln.dir < 0 ? W + 0.5 : -0.5), ln.from, ln.dir, ln.len, ln);
  } else boom(W + 0.8, D + 0.8, 1, 5);
  k.finish(scene);
  I.zones.push({ name, pts: booth.pts.map(([px, pz]) => k.w(px, pz)), y0: booth.y0, y1: booth.y1, ceil: () => booth.y1 - 0.3 });
  const seat = k.w(...booth.seat);
  let duty = 0, dutyVotes = 0;
  I.actions.push({
    x: seat[0], z: seat[1], r: 1.1, y: booth.y0,
    label: (g) => g.player.seat ? '按 <kbd>E</kbd> 起身' : gateOpt?.quest ? '按 <kbd>E</kbd> 坐下值班：🚧 新中北路側門門禁「別讓怪人進來」' : '按 <kbd>E</kbd> 坐下值班',
    fn: (g) => {
      if (g.player.seat) { g.player.standUp(); g.hud.toast('下班囉', 'good', 1000); return; }
      if (gate && g.gate) { g.player.sitAt(seat[0], seat[1], k.heading(Math.PI)); g.gate.start(gate); return; }
      g.player.sitAt(seat[0], seat[1], k.heading(booth.face)); // face the desk/window (-z local; the kiosk: -x)
      g.hud.toast('👮 值班中…同學經過會跟你打招呼', 'good', 2200);
    },
  });
  const gate = gateOpt?.quest ? (I.gates = I.gates || {})[name] = { k, W, D, off: gateOpt.off, roadW: gateOpt.roadW, barX: hingeLX, seat, forceOpen: false, name } : null;
  I.updaters.push((dt, g) => {
    // a barrier opens when the player drives up to it (or the guard lets a visitor through)
    const p = g.player.worldPos();
    for (const h of hinges) {
      const near = (Math.hypot(p.x - h.at[0], p.z - h.at[1]) < 10 && g.player.vehicle) || gate?.forceOpen;
      h.hinge.rotation.z += ((near ? 1.4 : 0) - h.hinge.rotation.z) * Math.min(1, dt * 4);
      if (near !== (h.hinge.userData.up ?? near)) g.audio.barrier(near, h.at[0], h.at[1]); h.hinge.userData.up = near;
    }
    if (gate) return; // the side gate's seat runs the gate-check mission instead of idle duty votes
    if (g.player.seat && Math.hypot(g.player.seat.x - seat[0], g.player.seat.z - seat[1]) < 0.1) {
      duty += dt;
      if (duty > 10 && dutyVotes < 8) { duty = 0; dutyVotes++; g.addVotes(1, ['同學：警衛彥霖辛苦了！ +1 票', '同學：怎麼是候選人在值班 XD +1 票', '教官：年輕人很認真喔 +1 票'][dutyVotes % 3]); }
    }
  });
}

// =====================================================================
// 孫師傅牛肉拉麵 (中北路 52 號) and 彥霖以前住的地方 on its 2F. Replaces the 補建街區 town house
// f899 that the shop sign used to hang on. 1F: noodle shop behind glass (not enterable) and, on its
// right, the small side door to a straight stair. At the top of the stair the room door is on the
// right; the room is modelled on the user's photo, seen from that door: wardrobe on the left wall,
// bed with the mattress standing against the back wall, window AC, pink floral curtains over the
// street window with a black table under it, and the bathroom on the near right.
// The terrain is NOT flattened here (the town row around it keeps its slope); floors are levelled
// by giving the walkable surfaces the building's base height minus the local ground (see surf()).
// =====================================================================
// k: the whole house is built 1.35x (roomier rooms, stair and corridor); W is in local units (5.8 m wide),
// D in metres (the depth of the plot stays 16 m). It takes the first 1.5 m of the town house next door (f900, trimmed in main.js).
export const YH_SPEC = { id: 'f899', next: 'f900', ox: -566.8, oz: 221.9, ang: Math.atan2(-1.6, 4.0), W: 4.31, D: 16.03, k: 1.35, NF: 4 };
export function yhFootprint() {
  const { ox, oz, ang, W, D, k } = YH_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(0, -1.2), w(W * k, -1.2), w(W * k, D), w(0, D)]; // + the pavement in front of the doors
}
// the house's outline on the ground (for the maps)
export function yhOutline() {
  const { ox, oz, ang, W, D, k } = YH_SPEC; const c = Math.cos(ang), s = Math.sin(ang);
  const w = (x, z) => [ox + x * c - z * s, oz + x * s + z * c];
  return [w(0, 0), w(W * k, 0), w(W * k, D), w(0, D)];
}
function buildYanlinHome(I, scene) {
  const S = YH_SPEC, K = S.k, W = S.W, D = S.D / K, FH = 3.42, F = FH, top = FH * S.NF; // local units (x K = metres)
  const k = new Kit(I, S.ox, S.oz, S.ang, K), base = k.base;
  const def = (key, f) => { if (!MATS[key]) MATS[key] = f(); return key; };
  // indoor surfaces get a small emissive lift (the fluorescent tube), like the McDonald's materials
  const std = (o, lift = 0) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.5, ...o });
    if (lift) { m.emissive.set('#fffaf0'); m.emissiveMap = o.map || null; if (!o.map) m.emissive.set(o.color); m.emissiveIntensity = lift; }
    return m;
  };
  const MT = {
    plaster: def('yhPlaster', () => std({ color: '#efede6' }, 0.28)),
    facade: def('yhFacade', () => std({ map: YHT.facade() })),
    tile: def('yhTile', () => std({ map: YHT.tile(), roughness: 0.35 }, 0.2)),
    ceil: def('yhCeil', () => std({ map: YHT.ceil(), roughness: 0.95 }, 0.55)),
    pine: def('yhPine', () => std({ map: YHT.pine(), roughness: 0.55 })),
    dark: def('yhDarkWood', () => std({ map: YHT.pine(), color: '#6e4426', roughness: 0.5 }, 0.08)),
    bath: def('yhBath', () => std({ map: YHT.bath(), roughness: 0.3 })),
    black: def('yhBlack', () => std({ color: '#1d1d20', roughness: 0.45 })),
    alu: def('yhAlu', () => std({ color: '#b7babd', metalness: 0.6, roughness: 0.4 })),
    maroon: def('yhMaroon', () => std({ color: '#6b1f2a', roughness: 0.8 })),
    stair: def('yhStair', () => std({ color: '#a19f98', roughness: 0.7 })),
    ac: def('yhAC', () => std({ color: '#e6e2d6', roughness: 0.6 })),
    door: def('yhDoor', () => std({ color: '#8a5a3a', roughness: 0.6 })),
    ironDoor: def('yhIronDoor', () => std({ color: '#6f7c78', metalness: 0.35, roughness: 0.55 })),
    porcelain: def('yhPorcelain', () => std({ color: '#f7f7f4', roughness: 0.2 })),
    shopRed: def('yhShopRed', () => std({ color: '#a3141d', roughness: 0.6 })),
  };
  const off = base - H(...k.w(W / 2, 3)); // the ground under the room sits this far below the building base
  // walkable surface, levelled to the building base (heights here are relative to the local ground)
  const surf = (x0, x1, z0, z1, hf) => I.addSurface(k.rect(x0, x1, z0, z1), (x, z) => { const [lx, lz] = k.l(x, z); return base + hf(lx, lz) * K - H(x, z); });
  const SX0 = 2.92, SX1 = W - 0.2;           // stair strip (right of the shop): 1F hallway, then the stair (1.6 m wide)
  const PX0 = 2.75;                           // shop / hallway partition
  const SZ0 = 5.6, SZ1 = 9.3, NS = 14;        // straight flight at the back, 14 risers up to 2F
  const LZ1 = 10.4;                           // end of the 2F landing
  const GZ0 = 9.42, GZ1 = 10.28;              // doorway in the right wall at the landing -> 黃蓋瑞's flat (js/garryhome.js)
  const CX0 = 1.75;                           // 2F corridor: lx CX0..SX0, from the landing back to the room (1.6 m wide)
  const RZ1 = 4.4;                            // 彥霖's room: full width lx 0.2..SX1, lz 0.2..RZ1
  const DX0 = 3.2, DX1 = 4.05;                // room door, bottom-right corner (bottom wall)
  const BX0 = 2.85, BZ1 = 2.6;                // bathroom: lx BX0..SX1, lz 0.2..BZ1 (top-right corner)
  const TX0 = 2.4, TX1 = 2.83, TZ0 = 0.45, TZ1 = 2.25; // desk against the bathroom wall
  const WX0w = 1.62, WX1w = 2.33;             // street window (pink curtains) between the bed and the desk
  const CH = F + 2.88;                        // room's dropped ceiling

  // ---------------- shell ----------------
  k.box(0, 0.2, -0.6, top, 0, D, MT.facade, { tile: [0.6, 0.6] });
  // right wall: a doorway at the 2F landing into 黃蓋瑞's flat next door (js/garryhome.js), same floor, other unit
  k.box(W - 0.2, W, -0.6, top, 0, GZ0, MT.facade, { tile: [0.6, 0.6] }); k.box(W - 0.2, W, -0.6, top, GZ1, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(W - 0.2, W, -0.6, F, GZ0, GZ1, MT.facade); k.box(W - 0.2, W, F + 1.62, top, GZ0, GZ1, MT.facade);
  k.box(0.2, W - 0.2, -0.6, top, D - 0.2, D, MT.facade, { tile: [0.6, 0.6] });
  k.box(0, W, top - 0.2, top, 0, D, 'gray', { col: false });
  k.box(0, W, top, top + 0.9, -0.05, 0.15, MT.facade, { col: false, tile: [0.6, 0.6] }); // parapet
  k.box(0.3, W - 0.3, top, top + 2.5, 7, D - 0.3, '#7f8b95', { col: false });          // 頂樓加蓋 sheet-metal room
  k.box(0.6, 1.8, top, top + 1.1, 2.0, 3.2, 'steel', { col: false });                   // water tank
  // front: 1F shop glass + pier + stair door; 2F street window of the room; 3F-5F solid
  k.box(0.2, PX0, -0.6, 0.0, 0, 0.2, MT.facade, { col: false });
  k.box(0.2, PX0, 0.0, 2.75, 0.06, 0.12, 'glass');
  for (const x of [0.25, 1.05, 1.85, 2.7]) k.box(x - 0.04, x + 0.04, 0, 2.75, 0.04, 0.14, MT.alu, { col: false });
  k.box(0.2, PX0, 2.72, 2.8, 0.04, 0.14, MT.alu, { col: false });
  k.box(0.2, PX0, 2.8, F, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  k.box(PX0, SX0 + 0.03, -0.6, F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(SX0 + 0.03, SX1, 2.15, F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(0.2, WX0w, F, 2 * F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX0w, WX1w, F - 0.2, F + 0.95, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX0w, WX1w, F + 2.2, 2 * F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX1w, SX1, F, 2 * F, 0, 0.2, MT.facade, { tile: [0.6, 0.6] });
  k.box(WX0w, WX1w, F + 0.95, F + 2.2, 0.08, 0.11, 'glass');
  k.box(WX0w - 0.05, WX1w + 0.05, F + 0.9, F + 0.95, -0.06, 0.2, MT.alu, { col: false });             // sill
  k.box(0.2, SX1, 2 * F, top - 0.2, 0, 0.2, MT.facade, { col: false, tile: [0.6, 0.6] });
  // outside details: shop sign over the glass, window grilles, outdoor AC units
  k.box(0.05, W - 0.05, 2.78, 3.62, -0.2, 0, MT.shopRed, { col: false });
  k.plane(T.sign('孫師傅 招牌牛肉拉麵', '#a3141d', '#fff4d0', 'yhShop', 1024, 192, 112), W - 0.2, 0.8, W / 2, 3.2, -0.205, Math.PI, { emissive: 0.35 });
  k.plane(T.sign('營業中', '#2a2a2a', '#ffcf3a', 'yhOpen', 256, 96, 56), 0.6, 0.22, 1.5, 2.3, -0.01, Math.PI, { emissive: 0.6 });
  k.plane(YHT.win(), 0.55, 0.45, 3.5, F + 1.75, -0.01, Math.PI);                         // bathroom window
  for (let f = 2; f < S.NF; f++) {
    const y = f * F;
    k.plane(YHT.win(), 2.4, 1.4, 1.5, y + 1.55, -0.01, Math.PI);
    k.plane(YHT.win(), 0.7, 1.0, 3.6, y + 1.6, -0.01, Math.PI);
    k.box(1.3, 1.7, y + 0.85, y + 0.9, -0.3, 0, MT.alu, { col: false });
    if (f < 4) k.box(2.85, 3.55, y + 0.35, y + 0.9, -0.4, -0.02, MT.ac, { col: false });
  }

  // ---------------- 1F: noodle shop (seen through the glass) ----------------
  k.box(0.2, SX1, -0.3, 0.06, 0.2, D - 0.2, MT.tile, { col: false, tile: [0.6, 0.6] });
  surf(0.2, SX1, -0.05, 6.0, () => 0.06);
  k.box(PX0, SX0, 0, F, 0.2, 6.0, MT.plaster);                    // shop | hallway
  k.box(0.2, PX0, 0, F, 6.0, 6.15, MT.plaster);                   // shop back wall (kitchen beyond)
  k.box(0.2, PX0, F - 0.25, F - 0.2, 0.2, 6.0, 'white', { col: false });
  k.box(0.9, 2.3, F - 0.3, F - 0.25, 2.6, 2.75, 'light', { col: false });
  k.plane(YHT.menu(), 1.6, 0.8, 1.4, 2.1, 5.99, Math.PI, { emissive: 0.4 });
  k.box(0.3, PX0 - 0.05, 0, 0.95, 4.7, 5.4, 'steel');          // counter with the soup pots
  for (const [x, r] of [[0.75, 0.22], [1.35, 0.2], [2.4, 0.16]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, 0.42, 18), M('chrome')); pot.position.set(x, 1.16, 5.05); k.group.add(pot);
  }
  for (const z of [1.5, 3.2]) {
    k.box(0.55, 1.35, 0.72, 0.76, z - 0.4, z + 0.4, 'steel', { col: false });
    k.box(0.9, 1.0, 0, 0.72, z - 0.05, z + 0.05, MT.alu, { col: false });
    for (const [sx, sz] of [[0.35, z], [1.55, z], [0.95, z - 0.62], [0.95, z + 0.62]]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.45, 14), M('red')); st.position.set(sx, 0.225, sz); k.group.add(st);
    }
  }

  // ---------------- side door, 1F hallway, stair at the back ----------------
  // The side door opens on a hallway along the right of the shop; the straight stair starts at the
  // back of it so the whole width of the 2F front can be 彥霖's room. Upstairs a corridor runs back
  // toward the street to the room door in the room's bottom-right corner (as in the user's floor plan).
  const leaf = new THREE.Group(); leaf.position.set(SX1 - 0.03, 0, 0.13); k.group.add(leaf);
  const LW = SX1 - SX0 - 0.08; // door leaf width
  const lm = new THREE.Mesh(new THREE.BoxGeometry(LW, 2.1, 0.05), M(MT.ironDoor)); lm.position.set(-LW / 2, 1.05, 0); leaf.add(lm);
  const hdl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.08), M('chrome')); hdl.position.set(-LW + 0.1, 1.0, 0); leaf.add(hdl);
  k.box(SX0 + 0.03, SX1, 2.1, 2.15, -0.02, 0.2, MT.alu, { col: false });
  k.plane(T.sign('2F', '#f2f0ea', '#333333', 'yh2F', 128, 64, 40), 0.22, 0.11, SX0 - 0.09, 1.55, -0.01, Math.PI);
  k.box(PX0, SX0, 0, F, 6.0, SZ1, MT.plaster);                                                    // shop / stair partition, back part
  k.box(SX0, SX1, 0, 2 * F, LZ1, LZ1 + 0.15, MT.plaster);                                          // end wall behind the landing
  const run = (SZ1 - SZ0) / NS;
  for (let j = 0; j < NS; j++) k.box(SX0, SX1, (j + 1) * F / NS - 0.45, (j + 1) * F / NS, SZ0 + j * run, SZ0 + (j + 1) * run, MT.stair, { col: false });
  surf(SX0, SX1, SZ0, SZ1, (lx, lz) => Math.max(0, Math.min(1, (lz - SZ0) / (SZ1 - SZ0))) * F);
  k.box(SX0 + 0.02, SX0 + 0.06, 0.9, F + 0.95, SZ0, SZ1, MT.alu, { col: false });                 // handrail
  for (const z of [1.2, 3.6]) k.box(3.45, 3.75, F - 0.26, F - 0.2, z, z + 0.3, 'light', { col: false });
  // 2F: landing, corridor back toward the street, small lobby in front of the room door
  k.box(SX0, SX1, F - 0.2, F, SZ1, LZ1, MT.tile, { col: false, tile: [0.6, 0.6] });              // landing
  surf(SX0, SX1, SZ1, LZ1, () => F);
  k.box(CX0, SX0, F - 0.2, F, SZ0, LZ1, MT.tile, { col: false, tile: [0.6, 0.6] });              // corridor
  surf(CX0, SX0, SZ0, LZ1, () => F);
  k.box(CX0, SX1, F - 0.2, F, RZ1 + 0.15, SZ0, MT.tile, { col: false, tile: [0.6, 0.6] });       // lobby
  surf(CX0, SX1, RZ1 + 0.15, SZ0, () => F);
  k.box(CX0 - 0.05, CX0, F, 2 * F, RZ1 + 0.15, LZ1, MT.plaster);                                // corridor, left wall
  k.box(SX0 - 0.07, SX0, F, 2 * F, SZ0, SZ1, MT.plaster);                                       // corridor | stair well
  k.box(SX0, SX1, F, 2 * F, SZ0, SZ0 + 0.05, MT.plaster);                                        // lobby | stair well
  k.box(CX0 - 0.05, SX0, F, 2 * F, LZ1, LZ1 + 0.15, MT.plaster);
  k.box(CX0, SX1, 2 * F - 0.2, 2 * F, RZ1, LZ1, 'white', { col: false });
  for (const z of [5.0, 7.6, 9.8]) k.box(CX0 + 0.35, CX0 + 0.65, 2 * F - 0.26, 2 * F - 0.2, z, z + 0.3, 'light', { col: false });

  // ---------------- 2F: 彥霖's old room (user's floor plan) ----------------
  // top (street) wall: double bed on the left, pink curtains, the desk (chair on its left, you face the
  // bathroom side); bathroom in the top-right corner with its door at its bottom-left; bottom wall: dark
  // wood double wardrobe on the left, room door in the bottom-right corner.
  const DOOR_TEX = ctex('yhGreenDoor', 128, 256, (g) => {
    g.fillStyle = '#1f4634'; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, 128, 6);
    g.strokeStyle = '#d4a93a'; g.lineWidth = 5; g.strokeRect(28, 52, 72, 150); g.lineWidth = 2; g.strokeRect(36, 60, 56, 134);
  }, false);
  k.box(0.2, SX1, F - 0.2, F, 0.2, RZ1 + 0.15, MT.tile, { col: false, tile: [0.6, 0.6] });
  surf(0.2, SX1, 0.2, RZ1 + 0.15, () => F);
  // bottom wall with the door opening at its right end
  k.box(0.2, DX0, F, 2 * F, RZ1, RZ1 + 0.15, MT.plaster);
  k.box(DX1, SX1, F, 2 * F, RZ1, RZ1 + 0.15, MT.plaster);
  k.box(DX0, DX1, F + 2.1, 2 * F, RZ1, RZ1 + 0.15, MT.plaster, { col: false });
  k.box(DX0 - 0.05, DX1 + 0.03, F + 2.06, F + 2.12, RZ1 - 0.03, RZ1 + 0.18, MT.door, { col: false });
  // dark green door with a gold panel frame, hinged in the corner; swings out onto the landing when you come near
  const rdoor = new THREE.Group(); rdoor.position.set(DX1 + 0.02, F, RZ1 + 0.075); k.group.add(rdoor);
  const dmat = new THREE.MeshStandardMaterial({ map: DOOR_TEX, roughness: 0.55, emissive: '#ffffff', emissiveMap: DOOR_TEX, emissiveIntensity: 0.15 });
  const edge = M('#173a2a');
  const rdm = new THREE.Mesh(new THREE.BoxGeometry(DX1 - DX0 + 0.02, 2.06, 0.05), [edge, edge, edge, edge, dmat, dmat]);
  rdm.position.set(-(DX1 - DX0 + 0.02) / 2, 1.03, 0); rdoor.add(rdm);
  for (const sz of [0.045, -0.045]) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M('#d4a93a')); kn.position.set(-(DX1 - DX0) + 0.1, 1.0, sz); rdoor.add(kn); }
  k.plane(T.sign('彥霖', '#f4efe2', '#1f4634', 'yhPlate', 192, 80, 46), 0.22, 0.09, DX0 - 0.25, F + 1.6, RZ1 + 0.155, 0);
  // ceiling: black-grid lay-in panels, two fluorescent tubes
  k.box(0.2, SX1, CH, CH + 0.04, 0.2, RZ1, MT.ceil, { col: false, tile: [0.6, 0.6] });
  k.box(0.2, SX1, CH + 0.04, 2 * F, 0.2, RZ1, 'white', { col: false });
  for (const [x0, z] of [[0.6, 1.4], [0.6, 3.1]]) {
    k.box(x0, x0 + 1.3, CH - 0.06, CH, z, z + 0.2, MT.alu, { col: false });
    k.box(x0 + 0.05, x0 + 1.25, CH - 0.1, CH - 0.06, z + 0.05, z + 0.15, 'light', { col: false });
  }
  k.box(0.2, 0.22, F + 0.3, F + 0.4, 3.0, 3.1, 'white', { col: false });       // socket
  const dk = (x0, x1, z0, z1, y1) => k.wallRect(x0, x1, z0, z1, F - 0.2, F + y1);
  // street window between the bed and the desk, pink curtains drawn
  for (const [x0, x1] of [[WX0w - 0.08, (WX0w + WX1w) / 2 + 0.03], [(WX0w + WX1w) / 2 - 0.03, WX1w + 0.08]]) k.plane(YHT.curtain(), x1 - x0, 1.45, (x0 + x1) / 2, F + 1.55, 0.3, 0, { double: true });
  k.plane(YHT.valance(), WX1w - WX0w + 0.2, 0.3, (WX0w + WX1w) / 2, F + 2.2, 0.34, 0, { transparent: true, double: true });
  k.box(WX0w - 0.12, WX1w + 0.12, F + 2.3, F + 2.33, 0.26, 0.29, MT.alu, { col: false });
  // window AC on the left wall over the head of the bed
  k.box(0.2, 0.46, F + 1.95, F + 2.4, 0.7, 1.4, MT.ac, { col: false });
  k.box(0.46, 0.47, F + 2.0, F + 2.2, 0.75, 1.35, 'gray', { col: false });
  // double bed in the top-left corner: pine frame, headboard on the street wall, two pillows, pink quilt
  const BDX = 1.55, BDZ = 2.3;
  k.box(0.22, BDX, F, F + 0.38, 0.3, BDZ, MT.pine, { col: false });
  k.box(0.22, BDX, F, F + 0.85, 0.22, 0.3, MT.pine, { col: false });
  dk(0.22, BDX, 0.22, BDZ, 0.9);
  k.box(0.26, BDX - 0.04, F + 0.38, F + 0.56, 0.32, BDZ - 0.03, MT.maroon, { col: false });
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(BDX - 0.3, BDZ - 0.37), new THREE.MeshStandardMaterial({ map: YHT.mattress(), roughness: 0.85 }));
  mt.rotation.x = -Math.PI / 2; mt.position.set((0.26 + BDX - 0.04) / 2, F + 0.561, (0.32 + BDZ - 0.03) / 2); k.group.add(mt);
  for (const [x0, x1] of [[0.32, 0.86], [0.92, 1.46]]) k.box(x0, x1, F + 0.56, F + 0.72, 0.38, 0.72, 'white', { col: false }); // pillows
  k.box(0.24, BDX - 0.02, F + 0.56, F + 0.68, 0.95, BDZ - 0.01, '#f2b8c6', { col: false });     // pink quilt
  k.box(0.24, BDX - 0.02, F + 0.2, F + 0.68, BDZ - 0.01, BDZ + 0.01, '#f2b8c6', { col: false });
  // computer desk on the street-side wall of the bathroom, long side along it: monitor, black tower, keyboard, mouse
  k.box(TX0, TX1, F + 0.72, F + 0.76, TZ0, TZ1, MT.black, { col: false });
  for (const [x, z] of [[TX0 + 0.04, TZ0 + 0.04], [TX1 - 0.04, TZ0 + 0.04], [TX0 + 0.04, TZ1 - 0.04], [TX1 - 0.04, TZ1 - 0.04]]) k.box(x - 0.025, x + 0.025, F, F + 0.72, z - 0.025, z + 0.025, MT.black, { col: false });
  dk(TX0, TX1, TZ0, TZ1, 0.9);
  k.box(TX1 - 0.13, TX1 - 0.07, F + 0.76, F + 0.79, 1.2, 1.5, MT.black, { col: false });        // monitor foot
  k.box(TX1 - 0.11, TX1 - 0.08, F + 0.79, F + 0.95, 1.32, 1.38, MT.black, { col: false });
  k.box(TX1 - 0.15, TX1 - 0.11, F + 0.92, F + 1.3, 1.01, 1.69, MT.black, { col: false });        // bezel
  k.plane(T.screen(), 0.64, 0.34, TX1 - 0.155, F + 1.11, 1.35, -Math.PI / 2, { emissive: 0.9 });
  k.box(TX0 + 0.05, TX1 - 0.03, F + 0.76, F + 1.2, 1.88, 2.08, MT.black, { col: false });        // tower
  k.box(TX0 + 0.049, TX0 + 0.05, F + 1.1, F + 1.12, 1.93, 2.03, '#3ad07a', { col: false });    // power LED
  k.box(TX0 + 0.03, TX0 + 0.18, F + 0.76, F + 0.78, 1.12, 1.58, '#2a2a2e', { col: false });     // keyboard
  k.box(TX0 + 0.05, TX0 + 0.16, F + 0.78, F + 0.785, 1.15, 1.55, '#45454a', { col: false });
  k.box(TX0 + 0.05, TX0 + 0.12, F + 0.76, F + 0.79, 1.68, 1.75, '#2a2a2e', { col: false });     // mouse
  k.box(TX0 + 0.05, TX0 + 0.23, F + 0.761, F + 0.764, 0.55, 0.73, 'white', { col: false });     // note from the landlord
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.22, 16), M('glass')); jug.position.set(TX1 - 0.12, F + 0.87, 0.6); k.group.add(jug);
  // desk chair (black, chrome legs) on the left of the desk; it doesn't block the way
  { const cx = 1.98, cz = 1.35;
    k.box(cx - 0.21, cx + 0.21, F + 0.44, F + 0.48, cz - 0.21, cz + 0.21, MT.black, { col: false });
    k.box(cx - 0.205, cx - 0.175, F + 0.6, F + 0.92, cz - 0.21, cz + 0.21, MT.black, { col: false });
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) k.box(cx + lx - 0.012, cx + lx + 0.012, F, F + (lx < 0 ? 0.92 : 0.44), cz + lz - 0.012, cz + lz + 0.012, 'chrome', { col: false }); }
  // dark wood double-door wardrobe along the bottom wall, left part; doors open while you change
  const WX0 = 0.22, WX1 = 2.2, WD0 = RZ1 - 0.6;
  k.box(WX0, WX0 + 0.03, F, F + 2.05, WD0, RZ1, MT.dark, { col: false });
  k.box(WX1 - 0.03, WX1, F, F + 2.05, WD0, RZ1, MT.dark, { col: false });
  k.box(WX0, WX1, F, F + 2.05, RZ1 - 0.04, RZ1, '#2e1e12', { col: false });
  k.box(WX0, WX1, F + 2.0, F + 2.05, WD0, RZ1, MT.dark, { col: false });
  k.box(WX0 - 0.03, WX1 + 0.03, F + 2.05, F + 2.12, WD0 - 0.04, RZ1, MT.dark, { col: false });
  k.box(WX0, WX1, F, F + 0.25, WD0, RZ1, MT.dark, { col: false });
  k.box(WX0 + 0.05, WX1 - 0.05, F + 1.75, F + 1.77, WD0 + 0.25, WD0 + 0.27, 'chrome', { col: false }); // rail
  ['#121212', '#f4f4f0', '#b3121f', '#6b7f99', '#2f3e5c', '#d8c9a8', '#5b5d63', '#2f5d46', '#3d5a80', '#c9b48a'].forEach((c, i) => {
    const x = WX0 + 0.2 + i * (WX1 - WX0 - 0.4) / 9;
    k.box(x - 0.05, x + 0.05, F + 0.95, F + 1.74, WD0 + 0.08, RZ1 - 0.08, c, { col: false });
  });
  dk(WX0, WX1, WD0, RZ1, 2.0);
  const wDoors = [], half = (WX1 - WX0) / 2;
  for (const [hx, dir] of [[WX0, 1], [WX1, -1]]) {
    const hg = new THREE.Group(); hg.position.set(hx, F + 0.25, WD0); k.group.add(hg);
    const lf = new THREE.Mesh(new THREE.BoxGeometry(half - 0.005, 1.78, 0.03), M(MT.dark)); lf.position.set(dir * half / 2, 0.89, -0.015); hg.add(lf);
    const pn = new THREE.Mesh(new THREE.BoxGeometry(half - 0.2, 1.4, 0.01), M('#4a2f1b')); pn.position.set(dir * half / 2, 0.92, -0.035); hg.add(pn);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), M(MT.alu)); kb.position.set(dir * (half - 0.07), 0.8, -0.05); hg.add(kb);
    wDoors.push({ hg, dir });
  }
  let wOpen = 0, wTarget = 0;
  // bathroom in the top-right corner, door at its bottom-left: tiles, shower, toilet, basin + mirror
  k.box(BX0, BX0 + 0.08, F, CH, 0.2, BZ1, MT.plaster);
  k.box(BX0, BX0 + 0.1, F, CH, BZ1 - 0.08, BZ1, MT.plaster);
  k.box(BX0 + 1.0, SX1, F, CH, BZ1 - 0.08, BZ1, MT.plaster);
  k.box(BX0 + 0.1, BX0 + 1.0, F + 2.05, CH, BZ1 - 0.08, BZ1, MT.plaster, { col: false });
  const tl = (x0, x1, z0, z1) => k.box(x0, x1, F, F + 2.4, z0, z1, MT.bath, { col: false, tile: [0.6, 0.6] });
  tl(BX0 + 0.08, BX0 + 0.09, 0.21, BZ1 - 0.08); tl(BX0 + 0.08, SX1, 0.2, 0.21);
  tl(BX0 + 0.08, SX1, BZ1 - 0.09, BZ1 - 0.08); tl(SX1 - 0.01, SX1, 0.21, BZ1 - 0.08);
  k.box(BX0 + 0.08, SX1, F, F + 0.02, 0.21, BZ1 - 0.08, MT.bath, { col: false, tile: [0.3, 0.3] });
  k.box(BX0, SX1, F + 2.4, F + 2.44, 0.2, BZ1, 'white', { col: false });
  k.box(3.3, 3.6, F + 2.34, F + 2.4, 1.2, 1.5, 'light', { col: false });
  k.box(3.35, SX1 - 0.02, F, F + 0.05, 0.22, 1.05, MT.porcelain, { col: false });             // shower tray
  k.box(3.34, 3.36, F + 0.05, F + 2.0, 0.6, 1.05, 'glass', { col: false });                   // glass screen
  k.box(SX1 - 0.06, SX1 - 0.02, F + 1.85, F + 1.95, 0.55, 0.65, 'chrome', { col: false });    // shower head
  k.box(SX1 - 0.04, SX1 - 0.02, F + 0.9, F + 1.85, 0.58, 0.62, 'chrome', { col: false });
  k.box(3.62, 3.98, F, F + 0.4, 1.5, 1.86, MT.porcelain, { col: false });                    // toilet, back to the right wall
  k.box(3.6, 3.98, F + 0.4, F + 0.44, 1.48, 1.88, MT.porcelain, { col: false });
  k.box(3.92, SX1 - 0.01, F + 0.44, F + 0.8, 1.5, 1.86, MT.porcelain, { col: false });
  dk(3.6, SX1, 1.46, 1.9, 0.5);
  k.box(BX0 + 0.08, BX0 + 0.5, F + 0.78, F + 0.86, 1.15, 1.6, MT.porcelain, { col: false }); // basin
  k.box(BX0 + 0.18, BX0 + 0.28, F, F + 0.78, 1.33, 1.43, MT.porcelain, { col: false });
  k.box(BX0 + 0.09, BX0 + 0.1, F + 1.1, F + 1.65, 1.15, 1.6, 'glass', { col: false });        // mirror
  // (no bathroom door: just the opening)

  // plaster skins over the inside faces of the (mosaic-tiled) shell walls
  const skin = (x0, x1, y0, y1, z0, z1) => k.box(x0, x1, y0, y1, z0, z1, MT.plaster, { col: false });
  skin(0.2, 0.21, 0, F - 0.25, 0.2, 6.0);                                    // shop, left wall
  skin(SX1 - 0.01, SX1, 0, F - 0.2, 0.2, SZ0);                               // 1F hallway, right wall
  skin(SX1 - 0.01, SX1, 0, 2 * F - 0.2, SZ0, GZ0); skin(SX1 - 0.01, SX1, 0, F, GZ0, GZ1); skin(SX1 - 0.01, SX1, F + 1.62, 2 * F - 0.2, GZ0, GZ1);
  skin(SX1 - 0.01, SX1, 0, 2 * F - 0.2, GZ1, LZ1);                           // stair well, right wall (doorway to 黃蓋瑞's)
  k.box(SX1 - 0.03, SX1, F + 1.62, F + 1.68, GZ0 - 0.04, GZ1 + 0.04, MT.door, { col: false });
  k.plane(T.sign('黃宅 2F', '#f4efe2', '#2a4a7a', 'garryPlate', 192, 80, 40), 0.26, 0.1, SX1 - 0.035, F + 1.45, GZ0 - 0.2, -Math.PI / 2);
  skin(SX1 - 0.01, SX1, F, 2 * F - 0.2, RZ1 + 0.15, SZ0);                    // lobby, right wall
  skin(SX0, SX1, 2.15, F - 0.2, 0.2, 0.21);                                  // 1F hallway, front wall
  skin(0.2, 0.21, F, CH, 0.21, RZ1);                                         // room: left wall
  skin(SX1 - 0.01, SX1, F, CH, BZ1, RZ1);                                    // room: right wall below the bathroom
  skin(0.21, WX0w, F, CH, 0.2, 0.21); skin(WX1w, BX0, F, CH, 0.2, 0.21);     // room: street wall around the window
  skin(WX0w, WX1w, F, F + 0.95, 0.2, 0.21); skin(WX0w, WX1w, F + 2.2, CH, 0.2, 0.21);

  k.finish(scene);
  // zones (camera ceiling + location name) and the E actions
  I.zones.push({ name: '孫師傅牛肉拉麵 樓梯間', pts: k.rect(SX0, SX1, 0.2, SZ0), y0: 0, y1: (F - 0.4) * K, ceil: () => (F - 0.3) * K + off });
  I.zones.push({ name: '孫師傅牛肉拉麵 樓梯間', pts: k.rect(SX0, SX1, SZ0, LZ1), y0: 0, y1: (2 * F - 0.4) * K, ceil: () => (2 * F - 0.45) * K + off });
  I.zones.push({ name: '孫師傅牛肉拉麵 二樓', pts: k.rect(CX0, SX1, RZ1, LZ1), y0: (F - 0.3) * K, y1: (2 * F - 0.4) * K, ceil: () => (2 * F - 0.45) * K + off });
  I.zones.push({ name: '彥霖以前住的地方', pts: k.rect(0.2, SX1, 0.2, RZ1), y0: (F - 0.3) * K, y1: (2 * F - 0.4) * K, ceil: () => (CH - 0.1) * K + off });
  const at = (lx, lz) => { const p = k.w(lx, lz); return { x: p[0], z: p[1], y: F * K + base - H(p[0], p[1]) }; };
  const memories = ['🛏️ 以前每天早上都是被樓下牛肉麵的香味叫醒的', '🛏️ 期末趕報告趕到天亮，就是倒在這張床上補眠', '🛏️ 窗外就是中北路，半夜還聽得到機車聲'];
  let mi = 0;
  I.actions.push({ ...at(0.95, 2.75), r: 0.6,
    label: (g) => g.canSleep() ? '按 <kbd>E</kbd> 睡覺（睡到隔天早上 6:00）' : '按 <kbd>E</kbd> 在床上躺一下（晚上 9 點後才能睡覺）',
    fn: (g) => { if (g.canSleep()) { g.sleep(); return; } g.hud.toast(memories[mi++ % memories.length], 'good', 2800); g.audio.blip(); } });
  I.actions.push({ ...at(1.98, 1.35), r: 0.5, label: () => '按 <kbd>E</kbd> 使用電腦', fn: (g) => g.pc?.open() });
  I.actions.push({ ...at(2.05, 0.62), r: 0.35, label: () => '按 <kbd>E</kbd> 看桌上的紙', fn: (g) => g.hud.toast('📄 紙條：「房租月底前交喔！——房東」', 'good', 2800) });
  I.actions.push({ ...at((WX0 + WX1) / 2, WD0 - 0.45), r: 0.65, label: () => '按 <kbd>E</kbd> 打開衣櫃換衣服', fn: (g) => g.wardrobe?.open() });
  I.actions.push({ ...at(3.5, 1.4), r: 0.5, label: () => '按 <kbd>E</kbd> 洗把臉', fn: (g) => { g.hud.toast('💧 洗把臉，清醒多了', 'good', 1800); g.audio.blip(); } });
  // the street door and the room door swing open when you walk up; the wardrobe opens while you change
  const doorAt = k.w((SX0 + SX1) / 2, 0.1), roomDoorAt = k.w((DX0 + DX1) / 2, RZ1 + 0.075);
  I.updaters.push((dt, g) => {
    const p = g.player.worldPos(), foot = !g.player.vehicle;
    const near = foot && Math.hypot(p.x - doorAt[0], p.z - doorAt[1]) < 2.6;
    leaf.rotation.y += ((near ? Math.PI / 2 : 0) - leaf.rotation.y) * Math.min(1, dt * 5);
    const nr = foot && g.player.y > (F - 1) * K && Math.hypot(p.x - roomDoorAt[0], p.z - roomDoorAt[1]) < 1.9;
    rdoor.rotation.y += ((nr ? Math.PI / 2 : 0) - rdoor.rotation.y) * Math.min(1, dt * 5); // opens out onto the landing
    wOpen += (wTarget - wOpen) * Math.min(1, dt * 5);
    for (const d of wDoors) d.hg.rotation.y = d.dir * wOpen * 1.9;
  });
  return { k, door: doorAt, room: k.w(2, 2.5), setWardrobe: (o) => { wTarget = o ? 1 : 0; } };
}

// =====================================================================
// 正門 (中北路): 警衛亭 on the island between the two one-way lanes; enterable, sit and stand guard
// (GUARD_SPECS[0] -> buildGuardhouse with kiosk = MAIN_GATE).
// Google 街景 2017-09 / 2022-08 / 2024-08: a ~3 x 3 m kiosk, rounded front of dark glass toward
// 中北路 over a white-grey dado, an overhanging roof slab with a green roof, on a low kerbed island;
// a clipped-hedge planter with a card reader on the island nose, a CCTV lamp post, a boom across
// each lane at the OSM barrier=lift_gate nodes, yellow-and-white bollards along the exit lane, and the
// name wall's kerbed lawn (js/map.js draws the wall and the spire from MAIN_GATE.wall / spire).
// =====================================================================
// NOTE: tools/build_terrain.py flattens the terrain under the island and the lawn from a copy of
// these numbers; after changing them, sync it and rerun the script.
export const MAIN_GATE = {
  // kiosk centre; local +x runs ENE along the island (mean heading of the two lanes), +z toward the entry lane
  x: -201.2, z: 82.25, ang: Math.atan2(-2.25, 5.2), name: '正門警衛室',
  // OSM node where 中北路 ends at the gate; both one-way lanes start / end there (js/map.js paves them)
  streetNode: 286745347,
  // island outline (local, ~8 m long), >= 5 cm inside both 4.2 m lanes
  island: [[-4.9, 0], [-4, -0.8], [-3, -1.55], [-2.4, -2], [-1.8, -2.05], [2.6, -2.05], [3.1, -1.8], [3.35, -1.2], [3.35, 1.2], [3.1, 1.8],
    [2.6, 2.1], [-2, 2.05], [-2.5, 2], [-3, 1.65], [-4, 0.8]],
  // buildGuardhouse lanes: one boom per lane on the OSM barrier=lift_gate nodes, exit lane (-200.7,77.3)
  // and entry lane (-197.1,85.2). x / from: post (local; the exit lane's on the island, the entry lane's on
  // the far kerb), dir: arm toward -z / +z, len: arm length; yellow housings and warning signs on the arms
  // Google 街景 2022-08 (200 中北路): the entry lane is closed by two arms meeting in the middle, the one
  // from the kiosk side with a yellow 「來賓車道」 banner and a 20 roundel, the one from the far kerb with
  // 「教職員車道」; pale salmon housings with white tops (2018: the same, a deeper salmon)
  lanes: [
    { x: 2.42, from: -1.88, dir: -1, len: 4.6, post: '#ebb49c', signs: ['減速慢行'] },
    { x: 2.6, from: 1.86, dir: 1, len: 2.3, post: '#ebb49c', signs: ['來賓車道|20'] },
    { x: 2.59, from: 6.75, dir: -1, len: 2.45, post: '#ebb49c', signs: ['教職員車道'] },
  ],
  // bollards along the far edge of the exit lane (local), ~(-206.6,77.2) to (-199.6,74.4)
  bollards: [-2.9, -1.96, -1.02, -0.08, 0.86, 1.8, 2.74, 3.68, 4.62].map(x => [x, x < 2.71 ? -6.79 : -6.77 + (x - 2.71) * 0.12]),
  // world: black granite 校名牆 (axis ESE, faces SSW toward 中北路) on a kerbed lawn (wall-local
  // polygon), twisted stainless spire just off its west end
  wall: { x: -205.2, z: 73.0, ang: 0.35, W: 6, H: 2.9, D: 1.5, lawn: [[-5, -1.4], [3.6, -1.4], [3.6, 1.2], [-5, 2.4]] },
  spire: { x: -209.2, z: 73.0, h: 12.2 },
  // world: forecourt pavers between the grate, the exit lane's outer edge and the lawn (the lanes and the
  // end of 中北路 are paved by js/map.js); ±3 m, Google 衛星圖 / 街景 2024-08 heading 30-40
  forecourt: [[-216, 80], [-213.4, 71.6], [-209.6, 70.9], [-202, 74.9], [-201.56, 75.38], [-206.46, 77.58], [-207.39, 78.41], [-210.99, 84.31], [-212.68, 84.8]],
};
const gateFrame = (s) => { const c = Math.cos(s.ang), sn = Math.sin(s.ang); return (x, z) => [s.x + x * c - z * sn, s.z + x * sn + z * c]; };
// reserved footprints (js/main.js): trees, furniture and spawns keep off the island and the lawn
export function mainGateFootprint() { const w = gateFrame(MAIN_GATE); return MAIN_GATE.island.map(([x, z]) => w(x, z)); }
export function mainGateLawn() { const w = gateFrame(MAIN_GATE.wall); return MAIN_GATE.wall.lawn.map(([x, z]) => w(x, z)); }
// keep-clear spots for street furniture: boom posts and arms, bollards
export function mainGateKeep() {
  const w = gateFrame(MAIN_GATE), out = [];
  for (const ln of MAIN_GATE.lanes) {
    const [px, pz] = w(ln.x, ln.from), [mx, mz] = w(ln.x, ln.from + ln.dir * ln.len / 2);
    out.push({ x: px, z: pz, r: 1.5 }, { x: mx, z: mz, r: ln.len / 2 + 1 });
  }
  for (const [x, z] of MAIN_GATE.bollards) { const [bx, bz] = w(x, z); out.push({ x: bx, z: bz, r: 0.8 }); }
  return out;
}

const GATE_SIGN_MATS = {};
const gateSignMat = (t) => GATE_SIGN_MATS[t] ||= new THREE.MeshStandardMaterial({ map: gateSign(t), roughness: 0.6, transparent: t === '20' });
function gateSign(text) {
  const round20 = (g, cx, cy, r) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d0151f'; g.lineWidth = r * 0.22; g.beginPath(); g.arc(cx, cy, r * 0.87, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#111'; g.font = font(r * 0.94); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('20', cx, cy + r * 0.07);
  };
  if (text === '20') return ctex('gate20', 128, 128, (g) => round20(g, 64, 64, 62), false);
  if (text.length > 4 || text.includes('|')) {
    // cloth banner: yellow, red text, a sagging top hem and grommets; '|20' adds the speed roundel at its right end
    const [t, extra] = text.split('|');
    return ctex(`gateBn${  text}`, 512, 208, (g) => {
      g.fillStyle = '#f2d24a'; g.fillRect(0, 0, 512, 208);
      const sh = g.createLinearGradient(0, 0, 0, 208); sh.addColorStop(0, 'rgba(120,90,0,0.18)'); sh.addColorStop(0.25, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(120,90,0,0.12)');
      g.fillStyle = sh; g.fillRect(0, 0, 512, 208);
      g.fillStyle = 'rgba(150,110,0,0.25)'; for (const x of [130, 260, 390]) g.fillRect(x, 0, 3, 208); // creases
      g.fillStyle = '#e8c23a'; g.fillRect(0, 0, 512, 12);
      g.fillStyle = '#9a9a92'; for (const x of [14, 498]) { g.beginPath(); g.arc(x, 14, 6, 0, 7); g.fill(); }
      g.fillStyle = '#d0151f'; g.font = font(extra ? 70 : 80); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(t, extra ? 205 : 256, 112);
      if (extra) round20(g, 438, 104, 56);
    }, false);
  }
  return T.sign(text, '#ffd23f', '#d0151f', `gate${  text}`, 256, 96, 62);
}

// the 正門 kiosk on its island (buildGuardhouse adds the lane booms, the seat action and duty votes);
// k is the kiosk frame (MAIN_GATE). Returns the seat (local), the way the guard faces, the room outline.
function buildMainKiosk(k) {
  const G = MAIN_GATE;
  const ISL = 0.15, Y0 = ISL + 0.1, DADO = ISL + 0.7, TOP = ISL + 2.75;
  // island (walkable) + clipped-hedge planter on its nose
  k.prism(G.island, -0.3, ISL, '#a8a59d', { surface: true, shadow: false });
  const planter = [[-4.45, 0], [-4.25, -0.35], [-3.6, -0.72], [-2.8, -1.12], [-2.1, -1.45], [-1.95, -1.3], [-1.95, 1.3], [-2.1, 1.45], [-2.8, 1.12], [-3.6, 0.72], [-4.25, 0.35]];
  k.prism(planter, ISL, ISL + 0.2, '#a9a69e', { shadow: false });
  k.prism(planter, ISL + 0.2, ISL + 1.0, '#7a9c45', { bevel: 0.12, inset: 0.08 }); // clipped yellow-green hedge (街景 2022-08)
  planter.forEach((p, i) => k.wallLine(...p, ...planter[(i + 1) % planter.length], 0, ISL + 1.0));
  // card reader at the planter's exit-lane corner
  k.box(-2.75, -2.35, ISL, ISL + 0.12, -1.7, -1.3, '#e8e8e4');
  k.box(-2.69, -2.41, ISL + 0.12, ISL + 1.3, -1.64, -1.36, '#f2f2ee');
  k.box(-2.76, -2.7, ISL + 0.9, ISL + 1.15, -1.6, -1.4, 'dark', { col: false });

  // kiosk: half-round front (-x) toward 中北路, straight back with the door (+x) toward the campus
  const R = 1.45, CX = -0.15, BX = 1.6, DOOR = 0.45;
  const plan = (o) => {
    const p = [[BX + o, R + o]];
    for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + i / 8 * Math.PI; p.push([CX + Math.cos(a) * (R + o), Math.sin(a) * (R + o)]); }
    p.push([BX + o, -R - o]); return p;
  };
  k.prism(plan(0), ISL, Y0, 'floor', { surface: true, shadow: false });
  const wl = plan(-0.06);
  const wallRun = (a, b) => {
    k.slab(...a, ...b, 0.12, ISL, DADO, '#dcdad3');
    k.slab(...a, ...b, 0.14, DADO - 0.04, DADO, 'metal', { col: false }); // sill
    k.slab(...a, ...b, 0.03, DADO, TOP, 'tint');
  };
  for (let i = 0; i < wl.length - 1; i++) wallRun(wl[i], wl[i + 1]);
  const bx = BX - 0.06, bz = R - 0.06;
  wallRun([bx, -bz], [bx, -DOOR]); wallRun([bx, DOOR], [bx, bz]);
  k.slab(bx, -DOOR, bx, DOOR, 0.12, ISL + 2.25, TOP, 'metal', { col: false }); // over the door
  for (const [x, z] of [...wl, [bx, -DOOR], [bx, DOOR]]) k.box(x - 0.035, x + 0.035, ISL, TOP, z - 0.035, z + 0.035, 'metal', { col: false });
  // roof slab with a green roof
  k.prism(plan(0.3), TOP, TOP + 0.22, '#e4e2dc');
  k.prism(plan(0.18), TOP + 0.22, TOP + 0.36, '#7c7a4c', { bevel: 0.05 }); // the roof grass has dried to a straw olive (2022-08)
  {
    // low shrub tufts of a few sizes and tones (no shared RNG: fixed per tuft)
    const tufts = [[-1.2, 0.3], [-0.6, -0.8], [-0.3, 0.9], [0.5, -0.2], [0.9, 0.95], [1.2, -1.0], [-1.0, -0.4], [0.2, 0.5], [-1.45, -0.95], [1.35, 0.25], [-0.2, -1.2], [0.75, -0.75]];
    const tone = ['#7f7d4f', '#8a8a5a', '#6f7445'];
    for (let t = 0; t < 3; t++) {
      const geo = mergeGeometries(tufts.filter((_, i) => i % 3 === t).map(([x, z], i) => new THREE.IcosahedronGeometry(0.22 + ((i + t) % 4) * 0.05, 1).scale(1.1 + (i % 2) * 0.25, 0.42 + t * 0.06, 0.9).rotateY(i + t).translate(x, TOP + 0.38, z)), false);
      const m = new THREE.Mesh(geo, M(tone[t])); m.castShadow = true; k.group.add(m);
    }
  }
  k.box(0.2, 1.0, TOP - 0.04, TOP, -0.25, 0.25, 'light', { col: false });
  // black box floodlights under the roof slab on both flanks, aimed down at the lanes (街景 2018-11)
  for (const sd of [-1, 1]) {
    const zr = (a, b) => [Math.min(sd * a, sd * b), Math.max(sd * a, sd * b)];
    k.box(0.9, 1.25, TOP - 0.42, TOP - 0.18, ...zr(R + 0.02, R + 0.2), 'dark', { col: false });
    k.box(0.98, 1.17, TOP - 0.18, TOP, ...zr(R + 0.06, R + 0.1), 'dark', { col: false });
  }
  // lit at night: the tinted glass glows warm from the ceiling light (as the real kiosk does)
  const tint = M('tint');
  k.I.updaters.push((dt, g) => { tint.emissiveIntensity = (g.night || 0) * 0.32; });
  k.plane(T.sign('警衛室', '#1f3b73', '#ffffff', 'guard', 256, 96, 60), 0.9, 0.34, BX + 0.03, ISL + 2.5, 0, Math.PI / 2);
  // desk under the front window with CCTV monitor and phone; the guard faces 中北路
  k.box(-1.05, -0.45, Y0 + 0.72, Y0 + 0.77, -0.85, 0.85, 'desk', { col: false });
  k.box(-1.05, -0.45, Y0, Y0 + 0.72, -0.85, -0.8, 'metal', { col: false }); k.box(-1.05, -0.45, Y0, Y0 + 0.72, 0.8, 0.85, 'metal', { col: false });
  k.wallRect(-1.05, -0.45, -0.85, 0.85, Y0, Y0 + 0.77);
  k.box(-0.95, -0.9, Y0 + 0.77, Y0 + 1.17, -0.32, 0.32, 'dark', { col: false });
  k.plane(T.cctv(), 0.56, 0.36, -0.885, Y0 + 0.97, 0, Math.PI / 2, { emissive: 0.8 });
  k.box(-0.8, -0.6, Y0 + 0.77, Y0 + 0.83, 0.45, 0.7, 'dark', { col: false });
  k.box(-0.18, 0.24, Y0 + 0.45, Y0 + 0.5, -0.22, 0.22, 'dark', { col: false }); k.box(0.22, 0.26, Y0 + 0.5, Y0 + 1.0, -0.22, 0.22, 'dark', { col: false });
  k.cyl(0.03, 0, 0.04, Y0, Y0 + 0.45, 'metal');
  // CCTV lamp post on the exit-lane side, two thin masts behind the kiosk
  k.cyl(-0.75, -1.75, 0.1, ISL, ISL + 8.5, '#dcdcd6', { r1: 0.07, col: true });
  for (const [a, h] of [[0.6, 4.6], [2.6, 4.9], [-1.6, 5.2]]) k.slab(-0.75, -1.75, -0.75 + Math.cos(a) * 0.35, -1.75 + Math.sin(a) * 0.35, 0.16, ISL + h, ISL + h + 0.18, 'dark', { col: false });
  k.box(-0.8, 0.3, ISL + 8.4, ISL + 8.5, -1.8, -1.7, '#dcdcd6', { col: false });
  k.box(0.0, 0.5, ISL + 8.3, ISL + 8.42, -1.85, -1.65, 'light', { col: false });
  for (const z of [-1.0, 1.0]) k.cyl(2.6, z, 0.04, ISL, ISL + 7, '#d9d9d4', { col: true });
  // bollards: white with a yellow head
  for (const [x, z] of G.bollards) { k.cyl(x, z, 0.09, -0.2, 0.75, '#f0f0ec', { col: true }); k.cyl(x, z, 0.095, 0.75, 0.92, '#f2c230'); }
  // the name wall's lawn: grey kerb, grass on top (walkable)
  const lawn = mainGateLawn().map(([x, z]) => k.l(x, z));
  k.prism(lawn, -0.3, 0.13, '#a9a69e', { shadow: false });
  k.prism(lawn, 0.13, 0.16, '#5f8a3e', { inset: 0.14, shadow: false, surface: true });
  return { seat: [0.05, 0], face: -Math.PI / 2, y0: Y0, y1: TOP, pts: plan(0) }; // face the desk and the front window (-x local)
}

// ---------------- entry point ----------------
export function nearestRoadDir(data, x, z) {
  let best = null, bd = 1e9;
  for (const r of data.roads) if (r.drive) for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1]; const q = closestOnSeg(x, z, a[0], a[1], b[0], b[1]);
    const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; best = { x: q[0], z: q[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]), w: r.w }; }
  }
  return best;
}
// NOTE: tools/build_terrain.py flattens the terrain under this footprint from a
// copy of these numbers; after changing them, sync it and rerun the script.
export const GUARD_SPECS = (data) => {
  // only two guardhouses: the main gate (replaces the OSM 警衛室 on 中北路) and the 新中北路 side gate
  // 正門: glass kiosk on the island between the two one-way lanes of 中北路, one boom per lane (MAIN_GATE)
  const out = [{ ...MAIN_GATE, main: true }];
  // 新中北路 side entrance by the student activity centre / McDonald's: 全人大道, booth on the east side
  // (the McDonald's building is on the west), gate across the road just inside campus
  const q = nearestRoadDir(data, -91.4, -117);
  if (q) {
    const qang = -Math.sin(q.ang) < 0 ? q.ang + Math.PI : q.ang; // booth side (left normal) must point east
    const qnx = -Math.sin(qang), qnz = Math.cos(qang), qoff = q.w / 2 + 2.2;
    out.push({ x: q.x + qnx * qoff, z: q.z + qnz * qoff, ang: qang, name: '活動中心側門警衛室', gate: { off: qoff, roadW: q.w, sign: '中原大學 新中北路側門', quest: true } });
  }
  return out;
};
export function guardFootprint(s) {
  if (s.main) return mainGateFootprint();
  const c = Math.cos(s.ang), sn = Math.sin(s.ang); const w = (x, z) => [s.x + x * c - z * sn, s.z + x * sn + z * c];
  return [w(-0.6, -0.6), w(5, -0.6), w(5, 3.8), w(-0.6, 3.8)];
}

export function buildInteriors(scene, data, collision) {
  const I = new Interiors(scene);
  const im = buildIM(I, scene);
  const mcd = buildMcD(I, scene);
  I.yh = buildYanlinHome(I, scene);
  I.garry = buildGarryHome(I, scene, Kit, regMat, YH_SPEC); // 黃蓋瑞家: next door to 彥霖's, same floor (js/garryhome.js)
  buildClubCorner(I, scene, Kit); // outside of 活動中心's NW corner; the 3F 古箏社教室 in it (I.club) is built with js/sac.js
  buildZones(I, scene, data, collision); // 周邊街道與校內各區自建的部分，順序見 js/zones.js
  for (const s of GUARD_SPECS(data)) buildGuardhouse(I, scene, s.x, s.z, s.ang, s.name, s.gate || null, s.lanes || null, s.main ? s : null);
  collision.extra = I;
  I.im = im; I.mcd = mcd;
  return I;
}
