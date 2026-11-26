// =====================================================================
// 正門 (200 中北路) extras: everything around the main gate that the guard kiosk (src/world/Interiors.js
// buildMainKiosk / MAIN_GATE) and the black name wall (src/world/MapBuilder.js) do not draw. Outside only, nothing
// here can be entered.
// Sources: the user's Google 街景 photo (2022-08, 200 中北路, looking east from the 大仁街 mouth), Miller Yu's
// 360 panorama 「中原大學正門」 (2018-11) and the 2017-09 street view of 維澈樓's west front.
//  - the fair-faced concrete name wall (2022: grey, small blue emblem, black 「中原大學」) and, joined to its
//    north end, the black glass campus directory on a low concrete base with an orange post at the end,
//    standing in front of 維澈樓's west terrace and facing the gate;
//  - the 維澈樓 car park entrance: a roofed concrete portal with the grey sign fascia (⚠, no entry,
//    「P 維澈樓停車場」, the emblem, ↑) and a hanging height bar, the ramp dropping away inside;
//  - the blue 「P 停車場 PARKING」 totem with two LED space counters at the 大仁街 mouth, the green kerb
//    railing behind it with a notice board, a utility pole with a yellow-and-black sleeve;
//  - a black lamp post, traffic cones and an arrow sign stand on the forecourt, a cast-iron cover,
//    two rubber speed humps in front of the entry-lane barrier.
// Not readable in any image, so not drawn as text: the building list on the directory (abstract white
// lines instead), the height-limit figure, the LED counters (dim segments only).
// Where the car ramp runs is not certain: the 2022 photo puts its portal just right of and behind the
// grey wall; the terrace and accessible ramp in front of 維澈樓 (tools/overrides.json) and the stair core
// on its south-west side (src/systems/minigames/Weiche.js) leave room only south of the building's west corner, so the portal
// stands there, facing the forecourt, with the ramp running down along the south-west side.
// =====================================================================
import * as THREE from 'three';
import { Kit, regMat } from '../Kit.js';
import { MAIN_GATE } from '../MainGateSpec.js';
import { canvasTexture } from '../../graphics/GpuMemLifecycle.js';

// ---- frames -------------------------------------------------------------------------------------
// 維澈樓 west terrace (tools/overrides.json 「維澈樓西側抬高平台」): o = the building's west corner, u along
// its west face to the north, t across it (t < 0 = the plaza in front)
const TO = [-179.9, 97.4],
  TU = [0.409, -0.9125],
  TT = [0.9125, 0.409];
const tp = (u, t) => [TO[0] + u * TU[0] + t * TT[0], TO[1] + u * TU[1] + t * TT[1]];
// 大仁街 (data/cycu.json) from its junction with 中北路: s along it (ESE), n to its north-east (campus) side
const DO = [-225.2, 90.3],
  DS = [0.8601, 0.5102],
  DN = [0.5102, -0.8601];
const dp = (s, n) => [DO[0] + s * DS[0] + n * DN[0], DO[1] + s * DS[1] + n * DN[1]];
// a Kit whose local -z (the front) faces the unit vector f; local +x is then the viewer's left
const facing = (f) => Math.atan2(f[0], -f[1]);

// ---- placements (world metres) --------------------------------------------------------------------
// name wall + directory: x from the wall's south end (-1.3) to the base's north end (6.3) along the terrace
const SIGN = { o: tp(0, -7.25), ang: facing([-TT[0], -TT[1]]) };
// car park portal: front at 大仁街 s 39.9, 5.0 m wide (n 3.2..8.2), 5.4 m deep; its back keeps clear of the
// reserved footprint of src/systems/minigames/Weiche.js (the stair core stands out 2.8 m from the south-west wall, kept 3.3 m)
const RAMP = { o: dp(39.9, 5.7), ang: facing([-DS[0], -DS[1]]), hw: 2.5, d: 5.4 };
// the way in: over the open setts (no marked lane: 2022 photo from the 中北路 end) from the end of the entry
// lane (-197.1, 85.2, where the barriers stand) south, then bending east inside the 大仁街 kerb railing into the
// portal's 5 m wide mouth; the railing and the planting strip run on unbroken past the portal (2026 photo from
// 大仁街), so there is no way in from the street itself. LANE_PTS is the centre line the checks sample (kept clear).
const lanePt = (t) => {
  const P0 = [-197.1, 85.2],
    P3 = dp(33, 5.7),
    P1 = [P0[0], P0[1] + 8],
    P2 = [P3[0] - 7 * DS[0], P3[1] - 7 * DS[1]],
    u = 1 - t;
  return [0, 1].map(
    (i) => u * u * u * P0[i] + 3 * u * u * t * P1[i] + 3 * u * t * t * P2[i] + t * t * t * P3[i]
  );
};
export const LANE_PTS = (() => {
  const a = [];
  for (let i = 0; i <= 40; i++) a.push(lanePt(i / 40));
  for (let q = 33.5; q <= 39.9; q += 0.5) a.push(dp(q, 5.7));
  return a;
})();
// P totem at the 大仁街 mouth, face toward the end of 中北路 (bearing ~300°)
const PT = { o: [-206.5, 96.7], ang: facing([-0.866, -0.5]) };
const RAIL = { s0: 13.5, s1: 39.8, n: 3.1 };

// slender street trees on the planting strip along 大仁街 between the P totem and the car park (2022 photo); none on the way in to the portal;
// src/core/Game.js adds them to featureTrees (the footprints above keep the random trees off this strip)
export function gateTrees() {
  return [24].map((s, i) => {
    const [x, z] = dp(s, 4.9);
    return { x, z, kind: 'round', s: 0.62 };
  });
}

export function gateExtrasFootprints() {
  const kit = (o, ang) => {
    const c = Math.cos(ang),
      s = Math.sin(ang);
    return (x, z) => [o[0] + x * c - z * s, o[1] + x * s + z * c];
  };
  const ws = kit(SIGN.o, SIGN.ang),
    wr = kit(RAMP.o, RAMP.ang),
    wp = kit(PT.o, PT.ang);
  return [
    [ws(-1.8, -1.0), ws(6.8, -1.0), ws(6.8, 0.6), ws(-1.8, 0.6)],
    [
      wr(-RAMP.hw - 0.4, -0.6),
      wr(RAMP.hw + 0.1, -0.6),
      wr(RAMP.hw + 0.1, RAMP.d + 0.3),
      wr(-RAMP.hw - 0.4, RAMP.d + 0.3),
    ],
    [wp(-0.6, -0.6), wp(0.6, -0.6), wp(0.6, 0.6), wp(-0.6, 0.6)],
    // the way in, inside the kerb railing, in front of the portal (no trees, lamps or signs on it)
    [dp(21, 18.7), dp(21, 12), dp(33, 3.35), dp(40, 3.35), dp(40, 8.7), dp(33, 8.7), dp(27, 20)],
    [
      dp(RAIL.s0, RAIL.n - 0.55),
      dp(RAIL.s1, RAIL.n - 0.55),
      dp(RAIL.s1, RAIL.n + 0.25),
      dp(RAIL.s0, RAIL.n + 0.25),
    ],
    // the open setts between the 大仁街 mouth, the grey wall and the portal (no trees: 2022 photo)
    [
      [-205.5, 89.5],
      [-191, 89.2],
      [-188.6, 93.6],
      [-189.6, 99.0],
      [-191, 102.6],
      [-198.5, 99.8],
      [-205, 96.2],
    ],
  ];
}

// ---- textures / materials -------------------------------------------------------------------------
const TEX = {};
// canvas from src/graphics/GpuMemLifecycle.js (stored at the tier's texture scale); this file keeps its own keys
function tex(key, w, h, draw, repeat = false) {
  return TEX[key] || (TEX[key] = canvasTexture(w, h, draw, repeat));
}
const font = (px, w = 900, fam = '"Noto Sans TC","Microsoft JhengHei",sans-serif') =>
  `${w} ${px}px ${fam}`;
const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
// fair-faced concrete: soft mottling, 0.9 x 0.6 m form panels and their tie holes (texture = 1.8 x 1.2 m)
function concrete(g, w, h, ppm, seed = 5, tone = 186) {
  g.fillStyle = `rgb(${tone},${tone - 2},${tone - 7})`;
  g.fillRect(0, 0, w, h);
  const r = lcg(seed);
  for (let i = 0; i < (w * h) / 90; i++) {
    const v = r();
    g.fillStyle = `rgba(${v < 0.5 ? '90,88,84' : '255,255,250'},${0.03 + r() * 0.05})`;
    g.fillRect(r() * w, r() * h, 2 + r() * 8, 2 + r() * 6);
  }
  const pw = 0.9 * ppm,
    ph = 0.6 * ppm;
  g.fillStyle = 'rgba(80,78,74,0.22)';
  for (let x = pw; x < w; x += pw) g.fillRect(x - 1, 0, 2, h);
  for (let y = ph; y < h; y += ph) g.fillRect(0, y - 1, w, 2);
  g.fillStyle = 'rgba(70,68,64,0.45)';
  for (let x = pw / 4; x < w; x += pw / 2)
    for (let y = ph / 4; y < h; y += ph / 2) {
      g.beginPath();
      g.arc(x, y, Math.max(1.5, ppm * 0.012), 0, 7);
      g.fill();
    }
}
// the CYCU emblem: blue disc with a white rim and laurel, red shield with a white cross
function emblem(g, x, y, r, blue = '#1d4f9a') {
  g.save();
  g.translate(x, y);
  const k = r / 84;
  g.scale(k, k);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(0, 0, 84, 0, 7);
  g.fill();
  g.fillStyle = blue;
  g.beginPath();
  g.arc(0, 0, 76, 0, 7);
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = 6;
  for (const s of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + s * (0.35 + i * 0.33);
      g.beginPath();
      g.ellipse(Math.cos(a) * 52, Math.sin(a) * 52, 12, 6, a + s * 0.6, 0, 7);
      g.stroke();
    }
  g.fillStyle = '#d23a2c';
  g.beginPath();
  g.moveTo(-26, -30);
  g.lineTo(26, -30);
  g.lineTo(26, 6);
  g.quadraticCurveTo(26, 32, 0, 40);
  g.quadraticCurveTo(-26, 32, -26, 6);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff';
  g.fillRect(-5, -30, 10, 68);
  g.fillRect(-26, -6, 52, 10);
  g.restore();
}
const GX = {
  // grey name wall front (3.6 x 2.6 m): emblem at 24 %, 「中原大學」 38-81 %, both at 37 % from the top
  wall: () =>
    tex('gxWall', 720, 520, (g, w, h) => {
      concrete(g, w, h, 200, 11, 172);
      emblem(g, w * 0.245, h * 0.37, 40, '#1f4e9c');
      g.fillStyle = '#1b1b1c';
      g.font = font(76, 900, '"Noto Serif TC","Noto Sans TC",serif');
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      const x0 = w * 0.395,
        x1 = w * 0.8,
        adv = (x1 - x0) / 4;
      for (let i = 0; i < 4; i++) g.fillText('中原大學'[i], x0 + adv * (i + 0.5), h * 0.36);
      g.font = font(15, 600, 'system-ui,sans-serif');
      g.fillStyle = '#2a2a2a';
      const t = 'Chung Yuan Christian University',
        tw = g.measureText(t).width;
      g.save();
      g.translate(x0, h * 0.445);
      g.scale((x1 - x0) / tw, 1);
      g.textAlign = 'left';
      g.fillText(t, 0, 0);
      g.restore();
    }),
  conc: () => tex('gxConc', 360, 240, (g, w, h) => concrete(g, w, h, 200, 3, 176), true),
  concDark: () => tex('gxConcD', 360, 240, (g, w, h) => concrete(g, w, h, 200, 9, 160), true),
  // black glass campus directory (3.2 x 1.9 m): a title bar, columns of building names (abstract lines)
  // either side of a coloured campus map, a "you are here" dot
  board: () =>
    tex('gxBoard', 640, 380, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#1d2126');
      gr.addColorStop(0.5, '#111418');
      gr.addColorStop(1, '#1a1e23');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(24, 22, 150, 9);
      g.fillRect(24, 38, 90, 5);
      const r = lcg(21);
      const col = (x, n) => {
        for (let i = 0; i < n; i++) {
          const y = 62 + i * 15;
          g.fillStyle = 'rgba(255,255,255,0.75)';
          g.fillRect(x, y, 10, 7);
          g.fillRect(x + 16, y, 40 + r() * 50, 6);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          g.fillRect(x + 16, y + 7, 30 + r() * 30, 2);
        }
      };
      col(24, 20);
      col(130, 20);
      col(470, 20);
      col(560, 14);
      // map
      g.fillStyle = '#2e3a33';
      g.fillRect(238, 60, 220, 290);
      g.fillStyle = '#4f8f46';
      g.fillRect(250, 80, 90, 120);
      g.fillRect(360, 220, 80, 110);
      g.fillStyle = '#3d7fc2';
      g.beginPath();
      g.arc(395, 130, 26, 0, 7);
      g.fill();
      g.fillStyle = '#d9d5c8';
      for (let i = 0; i < 14; i++)
        g.fillRect(246 + r() * 190, 70 + r() * 260, 14 + r() * 22, 10 + r() * 16);
      g.strokeStyle = '#c9c3b2';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(248, 340);
      g.lineTo(450, 210);
      g.moveTo(300, 60);
      g.lineTo(300, 350);
      g.stroke();
      g.fillStyle = '#e23b2e';
      g.beginPath();
      g.arc(270, 330, 7, 0, 7);
      g.fill();
      // reflections on the glass
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(w * 0.35, 0);
      g.lineTo(w * 0.5, 0);
      g.lineTo(w * 0.15, h);
      g.fill();
    }),
  post: () =>
    tex('gxPost', 64, 352, (g, w, h) => {
      g.fillStyle = '#e0642a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(w / 2, 20);
      g.lineTo(w / 2 + 9, 36);
      g.lineTo(w / 2 + 2, 36);
      g.lineTo(w / 2 + 2, 52);
      g.lineTo(w / 2 - 2, 52);
      g.lineTo(w / 2 - 2, 36);
      g.lineTo(w / 2 - 9, 36);
      g.closePath();
      g.fill();
      g.fillRect(14, 62, w - 28, 3);
    }),
  // car park fascia (6.0 x 0.46 m)
  fascia: () =>
    tex('gxFascia', 1200, 92, (g, w, h) => {
      g.fillStyle = '#4b4e53';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#2b3446';
      g.fillRect(w * 0.64, 0, w * 0.36, h);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(0, 0, w, 3);
      // ⚠
      g.strokeStyle = '#f4f4f0';
      g.lineWidth = 5;
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(88, 18);
      g.lineTo(118, 72);
      g.lineTo(58, 72);
      g.closePath();
      g.stroke();
      g.fillStyle = '#f4f4f0';
      g.fillRect(85.5, 36, 5, 20);
      g.fillRect(85.5, 61, 5, 5);
      // no entry
      g.fillStyle = '#e02b2b';
      g.beginPath();
      g.arc(262, 46, 27, 0, 7);
      g.fill();
      g.fillStyle = '#fff';
      g.fillRect(244, 41, 36, 10);
      // P + name
      g.strokeStyle = '#f4f4f0';
      g.lineWidth = 4;
      g.strokeRect(340, 18, 44, 56);
      g.fillStyle = '#f4f4f0';
      g.font = font(50, 800, 'system-ui,sans-serif');
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('P', 362, 48);
      g.font = font(36, 700);
      g.textAlign = 'left';
      g.fillText('維澈樓停車場', 400, 40);
      g.fillStyle = 'rgba(244,244,240,0.6)';
      g.fillRect(402, 64, 170, 4);
      emblem(g, w * 0.745, 46, 25, '#3a5fa0');
      // ↑
      g.fillStyle = '#f4f4f0';
      g.beginPath();
      g.moveTo(1092, 14);
      g.lineTo(1116, 42);
      g.lineTo(1100, 42);
      g.lineTo(1100, 78);
      g.lineTo(1084, 78);
      g.lineTo(1084, 42);
      g.lineTo(1068, 42);
      g.closePath();
      g.fill();
    }),
  // dark ramp floor: grooved concrete falling into shadow
  rampFloor: () =>
    tex('gxRampF', 128, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, '#6d6b66');
      gr.addColorStop(0.45, '#3a3936');
      gr.addColorStop(1, '#0d0d0d');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = 4; y < h; y += 10) g.fillRect(0, y, w, 3);
      g.fillStyle = 'rgba(240,200,40,0.55)';
      g.fillRect(w * 0.48, 0, 5, h);
    }),
  // blue P totem front (0.8 x 2.45 m, round top: corners left transparent)
  totem: () =>
    tex('gxTotem', 200, 612, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#1f8fe0';
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, w / 2);
      g.arc(w / 2, w / 2, w / 2, Math.PI, 0);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
      const sh = g.createLinearGradient(0, 0, w, 0);
      sh.addColorStop(0, 'rgba(0,0,0,0.12)');
      sh.addColorStop(0.3, 'rgba(255,255,255,0.08)');
      sh.addColorStop(1, 'rgba(0,0,0,0.1)');
      g.fillStyle = sh;
      g.fill();
      g.fillStyle = '#fff';
      g.font = font(118, 800, 'system-ui,sans-serif');
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('P', w / 2, 96);
      // car pictogram
      g.strokeStyle = '#fff';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(62, 186);
      g.lineTo(74, 166);
      g.lineTo(126, 166);
      g.lineTo(138, 186);
      g.lineTo(144, 186);
      g.lineTo(144, 200);
      g.lineTo(56, 200);
      g.lineTo(56, 186);
      g.closePath();
      g.stroke();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(78, 202, 8, 0, 7);
      g.arc(122, 202, 8, 0, 7);
      g.fill();
      g.font = font(34, 900);
      g.fillText('停車場', w / 2, 248);
      g.font = font(19, 700, 'system-ui,sans-serif');
      g.fillText('PARKING', w / 2, 278);
      // two LED counters: black panels, dim red segments
      for (const y of [320, 400]) {
        g.fillStyle = '#121212';
        g.fillRect(22, y, w - 44, 58);
        for (let d = 0; d < 3; d++) {
          const x = 44 + d * 42;
          g.fillStyle = 'rgba(200,30,30,0.35)';
          g.fillRect(x, y + 10, 24, 4);
          g.fillRect(x, y + 27, 24, 4);
          g.fillRect(x, y + 44, 24, 4);
          g.fillRect(x - 3, y + 12, 4, 16);
          g.fillRect(x + 23, y + 12, 4, 16);
          g.fillRect(x - 3, y + 30, 4, 16);
          g.fillRect(x + 23, y + 30, 4, 16);
        }
      }
    }),
  stripe: () =>
    tex(
      'gxStripe',
      64,
      64,
      (g, w, h) => {
        g.fillStyle = '#f2c230';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#1a1a1a';
        for (let i = -2; i < 4; i++) {
          g.beginPath();
          g.moveTo(i * 32, h);
          g.lineTo(i * 32 + 16, h);
          g.lineTo(i * 32 + 16 + h, 0);
          g.lineTo(i * 32 + h, 0);
          g.closePath();
          g.fill();
        }
      },
      true
    ),
  arrowSign: () =>
    tex('gxArrow', 160, 112, (g, w, h) => {
      g.fillStyle = '#f6f6f2';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#9a9a96';
      g.lineWidth = 6;
      g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#d0151f';
      g.fillRect(24, 22, 112, 10);
      g.beginPath();
      g.moveTo(28, 62);
      g.lineTo(110, 62);
      g.lineTo(110, 48);
      g.lineTo(138, 70);
      g.lineTo(110, 92);
      g.lineTo(110, 78);
      g.lineTo(28, 78);
      g.closePath();
      g.fill();
    }),
};
let MAT = null;
function mats() {
  if (MAT) return MAT;
  const std = (o) =>
    new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.6, ...o });
  const c = (k, o) => regMat(k, std(o));
  MAT = {
    conc: c('gxConcM', { map: GX.conc(), color: '#d6d3cc' }),
    concDark: c('gxConcDM', { map: GX.concDark(), color: '#cfccc6' }),
    inner: c('gxInner', { color: '#3a3936', roughness: 0.95 }),
    black: c('gxBlack', { color: '#0b0b0c', roughness: 1 }),
    green: c('gxGreen', { color: '#3f7f4f', metalness: 0.35, roughness: 0.55 }),
    steel: c('gxSteel', { color: '#5c6066', metalness: 0.6, roughness: 0.4 }),
    lamp: c('gxLampPole', { color: '#222325', metalness: 0.5, roughness: 0.45 }),
    pole: c('gxPole', { color: '#9b9d9c', roughness: 0.7 }),
    blue: c('gxBlue', { color: '#1c84cf', roughness: 0.5 }),
    orange: c('gxOrange', { color: '#f26b1d', roughness: 0.6 }),
    white: c('gxWhite', { color: '#f3f3ef', roughness: 0.4 }),
    rubber: c('gxRubber', { color: '#1d1d1e', roughness: 0.9 }),
    iron: c('gxIron', { color: '#4d443c', metalness: 0.4, roughness: 0.8 }),
    brown: c('gxBoardBack', { color: '#8a7a6a', roughness: 0.8 }),
    stripe: c('gxStripeM', { map: GX.stripe() }),
    signal: regMat(
      'gxSignal',
      new THREE.MeshStandardMaterial({
        color: '#1fd4c4',
        emissive: '#1fd4c4',
        emissiveIntensity: 1.2,
      })
    ),
    glass: regMat(
      'gxGlass',
      new THREE.MeshStandardMaterial({ color: '#15181c', roughness: 0.08, metalness: 0.5 })
    ),
  };
  return MAT;
}

// ---- builders -------------------------------------------------------------------------------------
// the grey name wall, the directory board on its base, the orange end post
function buildNameWall(I, scene) {
  const X = mats(),
    k = new Kit(I, SIGN.o[0], SIGN.o[1], SIGN.ang),
    FRONT = Math.PI;
  // wall: x -1.3..2.3 (viewer's right .. left), 0.5 thick, 2.6 high, on a 0.6 m-deep footing
  k.box(-1.3, 2.3, -0.4, 2.6, -0.25, 0.25, X.conc, { tile: [1.8, 1.2] });
  k.plane(GX.wall(), 3.6, 2.6, 0.5, 1.3, -0.252, FRONT);
  k.box(-1.32, 2.32, 2.6, 2.63, -0.27, 0.27, X.concDark, { col: false }); // thin drip edge
  // directory: concrete base 0.6 m (x 2.3..6.3), the glass panel set back 0.2 m from the wall face
  k.box(2.3, 6.3, -0.4, 0.6, -0.15, 0.25, X.concDark, { tile: [1.8, 1.2] });
  k.box(2.3, 5.5, 0.6, 2.5, -0.02, 0.12, X.steel);
  const bd = k.plane(GX.board(), 3.16, 1.86, 3.9, 1.55, -0.03, FRONT, { emissive: 0.01 });
  bd.userData.dynamic = true; // glows at night (below): keeps its own mesh, not Kit.finish's atlas
  I.updaters.push((dt, g) => {
    bd.material.emissiveIntensity = (g.night || 0) * 0.35;
  });
  k.box(2.3, 5.5, 2.5, 2.56, -0.06, 0.14, X.steel, { col: false });
  k.plane(GX.board(), 3.16, 1.86, 3.9, 1.55, 0.13, 0); // the back is a second board (campus side)
  // orange post at the north end with a white pictogram, 2.2 m
  k.box(5.5, 5.9, 0.6, 2.2, -0.18, 0.16, X.orange);
  k.plane(GX.post(), 0.4, 1.6 * 0.94, 5.7, 1.38, -0.185, FRONT);
  k.finish(scene);
}

// the 維澈樓 car park portal: side walls, roof slab with the sign fascia, a hanging height bar, the ramp
// floor dropping into the dark, a low wall where the ramp turns, a green signal inside
function buildCarPark(I, scene) {
  const X = mats(),
    k = new Kit(I, RAMP.o[0], RAMP.o[1], RAMP.ang),
    FRONT = Math.PI,
    hw = RAMP.hw,
    D = RAMP.d,
    TOPY = 2.75;
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? -hw : hw - 0.3,
      x1 = x0 + 0.3;
    k.box(x0, x1, -0.4, TOPY, 0, D, X.conc, { tile: [1.8, 1.2] });
    // green double railing along the top of the outer wall face
    k.box(x0 - 0.02, x1 + 0.02, TOPY + 0.3, TOPY + 0.35, 0.1, D, X.green, { col: false });
    k.box(x0 - 0.02, x1 + 0.02, TOPY + 0.75, TOPY + 0.8, 0.1, D, X.green, { col: false });
    for (let z = 0.15; z <= D; z += 1.3)
      k.box(
        (x0 + x1) / 2 - 0.03,
        (x0 + x1) / 2 + 0.03,
        TOPY + 0.2,
        TOPY + 0.8,
        z,
        z + 0.06,
        X.green,
        { col: false }
      );
  }
  // inner faces dark (no daylight in there)
  k.box(-hw + 0.3, -hw + 0.32, 0, TOPY, 0.4, D, X.inner, { col: false });
  k.box(hw - 0.32, hw - 0.3, 0, TOPY, 0.4, D, X.inner, { col: false });
  // roof slab with planters on top; fascia sign on its front, a dark soffit below
  k.box(-hw, hw, TOPY, TOPY + 0.22, -0.25, D, X.concDark, { col: false });
  k.box(-hw + 0.3, hw - 0.3, TOPY - 0.02, TOPY, 0.4, D, X.black, { col: false });
  k.box(-hw - 0.05, hw + 0.05, TOPY - 0.46, TOPY + 0.22, -0.31, -0.15, X.steel, { col: false });
  k.plane(GX.fascia(), 2 * hw + 0.1, 0.64, 0, TOPY - 0.12, -0.315, FRONT);
  // height bar on two chains under the fascia
  k.box(-hw + 0.35, hw - 0.35, 2.02, 2.1, -0.05, 0.03, X.steel, { col: false });
  for (const x of [-hw + 0.6, hw - 0.6])
    k.box(x - 0.015, x + 0.015, 2.1, TOPY - 0.46, -0.03, 0.01, X.steel, { col: false });
  // the ramp: lit floor at the mouth, darkening inward; the back closed in black
  const fl = k.plane(GX.rampFloor(), 2 * hw - 0.6, D - 0.3, 0, -0.6, (D - 0.3) / 2, 0);
  fl.rotation.set(-Math.PI / 2, 0, Math.PI); // dark end of the texture at the back
  fl.rotation.x = -Math.PI / 2 + Math.atan2(1.2, D - 0.3); // falls 1.2 m towards the back (y 0 at the mouth)
  fl.position.y = 0.025 - 0.6;
  k.box(-hw + 0.3, hw - 0.3, -0.4, TOPY, D - 0.3, D, X.black);
  // a low centre divider where the ramp turns down (2022 photo): one lane each side stays open
  k.box(-0.2, 0.2, 0, 0.5, 3.0, D - 0.3, X.concDark, { tile: [1.8, 1.2] });
  k.box(-0.22, 0.22, 0.5, 0.53, 2.98, D - 0.28, X.conc, { col: false });
  // ceiling lights inside the mouth
  for (const z of [0.9, 2.6])
    k.box(-0.9, 0.9, TOPY - 0.06, TOPY - 0.02, z - 0.08, z + 0.08, 'light', { col: false });
  // green "go" lamp on the viewer's right wall
  k.box(-hw + 0.32, -hw + 0.42, 1.55, 1.85, 2.3, 2.6, X.black, { col: false });
  k.cyl(-hw + 0.43, 2.45, 0.07, 1.62, 1.78, X.signal);
  k.finish(scene);
}

// blue P totem with its concrete base, the green kerb railing and the notice board behind it,
// the striped utility pole
function buildParkingTotem(I, scene) {
  const X = mats(),
    k = new Kit(I, PT.o[0], PT.o[1], PT.ang),
    FRONT = Math.PI;
  k.box(-0.5, 0.5, -0.4, 0.15, -0.3, 0.3, X.concDark);
  // body: 0.8 wide, 0.35 deep, round top (extruded profile)
  const sh = new THREE.Shape();
  sh.moveTo(-0.4, 0.15);
  sh.lineTo(0.4, 0.15);
  sh.lineTo(0.4, 2.2);
  sh.absarc(0, 2.2, 0.4, 0, Math.PI, false);
  sh.lineTo(-0.4, 0.15);
  const eg = new THREE.ExtrudeGeometry(sh, {
    depth: 0.33,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 1,
    curveSegments: 14,
  });
  eg.translate(0, 0, -0.165);
  const body = new THREE.Mesh(
    eg,
    new THREE.MeshStandardMaterial({ color: '#1c84cf', roughness: 0.5 })
  );
  body.castShadow = true;
  k.group.add(body);
  k.wallRect(-0.4, 0.4, -0.18, 0.18, 0, 2.6);
  const fr = k.plane(GX.totem(), 0.8, 2.45, 0, 0.15 + 2.45 / 2, -0.188, FRONT, {
    transparent: true,
  });
  fr.userData.dynamic = true; // glows at night (below): keeps its own mesh
  fr.material.alphaTest = 0.5;
  fr.material.transparent = false;
  // lit from inside after dark (the counters and the face)
  fr.material.emissive.set('#ffffff');
  fr.material.emissiveMap = fr.material.map;
  I.updaters.push((dt, g) => {
    fr.material.emissiveIntensity = (g.night || 0) * 0.55;
  });
  // the "back" plate the 2022 photo shows standing proud behind the front panel's edge
  k.finish(scene);

  // green railing on a low kerb along 大仁街 (n 3.4), a brown notice board fixed to it
  const a = dp(RAIL.s0, RAIL.n),
    L = RAIL.s1 - RAIL.s0,
    rk = new Kit(I, a[0], a[1], Math.atan2(DS[1], DS[0]));
  rk.box(0, L, -0.3, 0.18, -0.15, 0.15, X.concDark, { tile: [1.8, 1.2] });
  rk.box(0, L, 0.62, 0.67, -0.03, 0.03, X.green, { col: false });
  rk.box(0, L, 1.0, 1.05, -0.03, 0.03, X.green);
  for (let x = 0; x <= L + 0.01; x += 2)
    rk.box(x - 0.03, x + 0.03, 0.18, 1.05, -0.03, 0.03, X.green, { col: false });
  const bx = 19.9 - RAIL.s0;
  rk.box(bx - 0.5, bx + 0.5, 0.55, 1.45, 0.06, 0.1, X.brown);
  for (const x of [bx - 0.42, bx + 0.42])
    rk.box(x - 0.03, x + 0.03, 0.18, 1.45, 0.1, 0.16, X.steel, { col: false });
  // utility pole on the planting strip, yellow-and-black sleeve on its foot
  const px = 24 - RAIL.s0,
    pz = 0.3;
  rk.cyl(px, pz, 0.15, -0.2, 1.3, X.stripe, { r1: 0.15, col: true, seg: 14 });
  rk.cyl(px, pz, 0.13, 1.3, 8.0, X.pole, { r1: 0.1, seg: 12 });
  rk.box(px - 0.04, px + 0.04, 7.2, 7.3, pz - 1.2, pz + 0.04, X.pole, { col: false });
  rk.finish(scene);
}

// forecourt bits: black lamp post, cones, arrow sign stand, cast-iron cover; speed humps on the entry lane
function buildForecourt(I, scene) {
  const X = mats();
  const one = (x, z, ang, fn) => {
    const k = new Kit(I, x, z, ang);
    fn(k);
    k.finish(scene);
  };
  // black lamp post (~6 m) with a short arm and a flat head toward the gate
  one(-193.2, 89.3, Math.atan2(-0.9, -0.4), (k) => {
    k.box(-0.18, 0.18, -0.3, 0.12, -0.18, 0.18, X.lamp, { col: false });
    k.cyl(0, 0, 0.08, 0, 6.0, X.lamp, { r1: 0.06, col: true });
    k.box(-0.02, 0.9, 5.85, 5.95, -0.03, 0.03, X.lamp, { col: false });
    k.box(0.7, 1.25, 5.78, 5.9, -0.13, 0.13, X.lamp, { col: false });
    k.box(0.74, 1.21, 5.77, 5.78, -0.1, 0.1, 'light', { col: false });
  });
  // traffic cones: registered as dynamic physics props (src/world/WorldProps.js)
  for (const [x, z] of [
    [-200.6, 90.2],
    [-193.6, 92.4],
    [-190.4, 93.2],
    [-202.3, 99],
  ])
    I.addCone(x, z);
  // white sign stand with a red arrow (pointing on toward the car park)
  one(-193.4, 95.4, facing([-0.99, -0.1]), (k) => {
    k.box(-0.25, 0.25, 0, 0.05, -0.2, 0.2, X.steel, { col: false });
    k.cyl(0, 0, 0.025, 0.05, 1.2, X.steel);
    k.box(-0.33, 0.33, 1.05, 1.52, -0.03, 0.0, X.white);
    k.plane(GX.arrowSign(), 0.62, 0.44, 0, 1.285, -0.032, Math.PI);
  });
  // cast-iron cover in the setts
  one(-205.5, 91, Math.atan2(0.4, 0.9), (k) =>
    k.box(-0.45, 0.45, 0, 0.035, -0.25, 0.25, X.iron, { col: false })
  );
  // two black rubber speed humps across the entry lane ahead of its barrier (2022 photo), MAIN_GATE frame
  one(MAIN_GATE.x, MAIN_GATE.z, MAIN_GATE.ang, (k) => {
    k.box(0.35, 0.7, -0.02, 0.05, 2.25, 4.15, X.rubber, { col: false });
    k.box(0.85, 1.2, -0.02, 0.05, 4.4, 6.35, X.rubber, { col: false });
  });
}

export function buildGateExtras(I, scene) {
  buildNameWall(I, scene);
  buildCarPark(I, scene);
  buildParkingTotem(I, scene);
  buildForecourt(I, scene);
}
