// 彥霖航空的直升機駕駛：高大壯碩的光頭黑人大叔，修得整齊的山羊鬍，穿湖人隊紫金球衣和及膝球褲（src/ui/Jersey.js，背號 24），
// 戴著橄欖綠的航空耳機（麥克風桿伸到嘴邊）。他開「呼叫載具」空運機車的那架直升機（src/systems/minigames/Airdrop.js）；
// 沒在飛的時候，會不定時出現在校園某處散步（CampusPilot），有幾天的早上或傍晚會到體育園區的籃球場打球（src/world/Court.js）。
// 他不會同時出現在兩個地方：散步、打球、開直升機是同一個狀態（同一個模型），開直升機時校園和球場都看不到他。
// 勞大預設是藏起來的（src/systems/LaodaMode.js）：這時候開直升機、在校園散步的是「彥霖航空機長」（createCaptain）——
// 白襯衫、深藍長褲、肩章領帶、機長帽，打招呼講的是機長的話，不放勞大的語音、不去打籃球，罵他也不會被肘擊。
// 在電腦終端機輸入 mamba 叫勞大回來，上面這些才會出現。
import * as THREE from 'three';
import { createCharacter } from './Character.js';
import { dressLakers, LAKERS, section, HIPS } from '../ui/Jersey.js';
import { torsoProfile } from './BodyMesh.js';
import { makeLabel } from '../world/MapBuilder.js';
import { surfaceAt } from '../world/Terrain.js';
import { reachArm } from './Armik.js';
import { COURTS, COLUMNS, courtP, courtRims, RIM_R } from '../world/Court.js';
import { insultsLaoda } from '../systems/LaodaInsult.js';
import { laodaOn } from '../systems/LaodaMode.js';

export const PILOT_LOOK = {
  skin: '#6b4531',
  shirt: LAKERS.purple,
  shorts: LAKERS.purple,
  hem: -0.4,
  arm: 1.32,
  build: 1.18,
  hair: '#141010',
  hairStyle: 'bald',
  beard: 'goatee',
  shoes: '#f2f2f0',
  face: true,
};

let M = null;
function mats() {
  if (M) return M;
  M = {
    cup: new THREE.MeshStandardMaterial({ color: '#59683b', roughness: 0.55 }), // olive green ear cups
    black: new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.6 }),
    seal: new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.9 }),
  };
  return M;
}

// the pilot as he is right now: 勞大 once he has been called back at the terminal, otherwise the 彥霖航空 captain
export function createPilot(laoda = laodaOn()) {
  return laoda ? createLaoda() : createCaptain();
}

function createLaoda() {
  const ch = createCharacter(PILOT_LOOK);
  ch.root.scale.set(1.04, 1.06, 1.04); // a head taller than the students, and he still fits the cockpit
  const m = mats();
  const add = (parent, geo, mat, x, y, z) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // ---- aviation headset (head-local: ears at x ±0.108, y 0.1) ----
  const hs = (ch.headset = new THREE.Group());
  ch.head.add(hs); // (taken off to play basketball)
  for (const s of [-1, 1]) {
    const cup = add(
      hs,
      new THREE.CylinderGeometry(0.04, 0.044, 0.042, 18),
      m.cup,
      0.137 * s,
      0.098,
      -0.004
    );
    cup.rotation.z = Math.PI / 2;
    const seal = add(
      hs,
      new THREE.TorusGeometry(0.035, 0.009, 6, 18),
      m.seal,
      0.116 * s,
      0.098,
      -0.004
    );
    seal.rotation.y = Math.PI / 2;
    add(hs, new THREE.BoxGeometry(0.012, 0.03, 0.05), m.black, 0.16 * s, 0.1, -0.004);
  }
  const band = add(
    hs,
    new THREE.TorusGeometry(0.16, 0.0075, 6, 28, Math.PI),
    m.black,
    0,
    0.1,
    -0.004
  );
  band.scale.set(1, 0.84, 1);
  add(hs, new THREE.BoxGeometry(0.06, 0.014, 0.075), m.black, 0, 0.236, -0.004);
  // mic boom from the left cup round to the corner of the mouth (character's left = +x)
  const boom = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.15, 0.08, 0.025),
    new THREE.Vector3(0.138, 0.05, 0.07),
    new THREE.Vector3(0.1, 0.03, 0.108),
    new THREE.Vector3(0.066, 0.027, 0.124),
  ]);
  add(hs, new THREE.TubeGeometry(boom, 14, 0.0036, 5), m.black, 0, 0, 0);
  const mic = add(hs, new THREE.SphereGeometry(0.0115, 10, 8), m.black, 0.056, 0.027, 0.127);
  mic.scale.set(1.35, 1, 1);

  // ---- Lakers jersey over a bare torso and arms (the body's shirt colour becomes skin under it) ----
  if (dressLakers(ch, { build: PILOT_LOOK.build, hem: PILOT_LOOK.hem }))
    ch.bodyMesh.userData.recolor({ shirt: PILOT_LOOK.skin });

  ch.root.traverse((o) => {
    if (o.isMesh && o.geometry.boundingSphere?.radius < 0.04) o.castShadow = false;
  });
  return ch;
}

// ---- 彥霖航空機長 (while 勞大 is hidden): a greying, clean-shaven captain in a short-sleeved white uniform shirt with
// four-bar epaulettes, a navy tie and gold wings, navy trousers, black shoes and a navy peaked cap with a gold badge
export const CAPTAIN_LOOK = {
  skin: '#d9a87f',
  shirt: '#f1f2ee',
  shorts: '#1c2336',
  pants: true,
  arm: 1.08,
  build: 1.06,
  hair: '#5a544e',
  hairStyle: 'short',
  shoes: '#161616',
  sole: '#161616',
  sock: '#1a1d26',
  mouth: 'flat',
  face: true,
};
let CM = null;
function captainMats() {
  if (CM) return CM;
  const m = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  CM = {
    navy: m('#1a2134'),
    tie: m('#141a2c', { roughness: 0.55, side: THREE.DoubleSide }),
    board: m('#111111', { roughness: 0.7 }),
    visor: m('#0c0c0c', { roughness: 0.22, metalness: 0.2, side: THREE.DoubleSide }),
    gold: m('#d6a83c', { roughness: 0.35, metalness: 0.75 }),
    white: m(CAPTAIN_LOOK.shirt, { roughness: 0.9, side: THREE.DoubleSide }),
  };
  return CM;
}
// the front of the chest in the torso's frame (y up from the torso pivot): z of the shirt at height y (root frame), x = 0
const chestZ = (y) => {
  const s = section(torsoProfile(0), y, CAPTAIN_LOOK.build);
  return s.cz + s.rz - 0.004;
};

function createCaptain() {
  const ch = createCharacter(CAPTAIN_LOOK);
  ch.root.scale.set(1.02, 1.04, 1.02);
  const m = captainMats();
  const add = (parent, geo, mat, x, y, z) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const T = ch.torso,
    Y = (y) => y - HIPS; // root height → torso frame

  // ---- shirt collar round the neck, its two points lying on the chest either side of the tie knot ----
  const collar = add(
    T,
    new THREE.TorusGeometry(0.074, 0.019, 6, 20, Math.PI * 1.55),
    m.white,
    0,
    Y(1.537),
    -0.006
  );
  collar.geometry.scale(1, 1, 0.7);
  collar.geometry.rotateX(Math.PI / 2);
  collar.geometry.rotateY(-2.36);
  const tipGeo = new THREE.ExtrudeGeometry(
    new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.056, 0.012),
      new THREE.Vector2(0.018, -0.058),
    ]),
    { depth: 0.005, bevelEnabled: false }
  );
  for (const sx of [-1, 1]) {
    const tip = add(T, tipGeo, m.white, 0.008 * sx, Y(1.536), 0.072);
    tip.scale.x = sx;
    tip.rotation.x = -0.38;
  }

  // ---- tie: a knot under the collar and a blade laid on the shirt down to the belt, widening to a point ----
  const knot = add(
    T,
    new THREE.CylinderGeometry(0.017, 0.011, 0.03, 4),
    m.tie,
    0,
    Y(1.515),
    chestZ(1.515) + 0.006
  );
  knot.rotation.set(-0.3, Math.PI / 4, 0);
  knot.scale.set(1, 1, 0.55);
  {
    const ys = [1.5, 1.44, 1.36, 1.28, 1.21, 1.185],
      half = [0.011, 0.015, 0.019, 0.023, 0.026, 0.026],
      pos = [];
    ys.forEach((y, i) => {
      const z = chestZ(y);
      pos.push(-half[i], Y(y), z, half[i], Y(y), z);
    });
    pos.push(0, Y(1.155), chestZ(1.155)); // the point
    const idx = [];
    for (let i = 0; i + 1 < ys.length; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const n = ys.length * 2;
    idx.push(n - 2, n, n - 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    add(T, g, m.tie, 0, 0, 0);
  }

  // ---- gold wings over the left breast (the character's left = +x) ----
  const wings = new THREE.Group();
  wings.position.set(0.082, Y(1.405), chestZ(1.405) - 0.006);
  wings.rotation.y = 0.32;
  T.add(wings);
  add(wings, new THREE.BoxGeometry(0.064, 0.009, 0.003), m.gold, 0, 0, 0);
  for (const sx of [-1, 1]) {
    const f = add(wings, new THREE.BoxGeometry(0.026, 0.006, 0.003), m.gold, 0.02 * sx, 0.006, 0);
    f.rotation.z = 0.25 * sx;
  }
  add(
    wings,
    new THREE.CylinderGeometry(0.008, 0.008, 0.004, 12),
    m.gold,
    0,
    0.001,
    0.001
  ).rotation.x = Math.PI / 2;

  // ---- epaulettes: black boards along the top of each shoulder, four gold bars at the outer end (captain) ----
  const boardGeo = new THREE.BoxGeometry(0.115, 0.007, 0.05),
    barGeo = new THREE.BoxGeometry(0.0055, 0.002, 0.051);
  for (const s of [-1, 1]) {
    const b = add(T, boardGeo, m.board, 0.158 * s, Y(1.528), -0.004);
    b.rotation.z = -0.4 * s;
    for (let k = 0; k < 4; k++) add(b, barGeo, m.gold, (0.022 + 0.01 * k) * s, 0.0045, 0);
  }

  // ---- peaked cap (head-pivot frame; the short hair's crown reaches y ~0.25): navy band and a flared top, a glossy
  // black visor, a gold cord over the visor and a badge at the front ----
  const cap = (ch.cap = new THREE.Group());
  ch.head.add(cap);
  const band = add(
    cap,
    new THREE.CylinderGeometry(0.143, 0.138, 0.062, 28, 1, true),
    m.navy,
    0,
    0.18,
    -0.004
  );
  band.scale.z = 1.08;
  const top = add(
    cap,
    new THREE.CylinderGeometry(0.168, 0.143, 0.05, 28),
    m.navy,
    0,
    0.234,
    -0.004
  );
  top.scale.z = 1.1;
  top.rotation.x = -0.12; // higher at the front
  const visor = add(
    cap,
    new THREE.CylinderGeometry(0.118, 0.118, 0.01, 24, 1, false, -Math.PI / 2, Math.PI),
    m.visor,
    0,
    0.152,
    0.078
  );
  visor.scale.z = 0.95;
  visor.rotation.x = 0.36;
  const cord = add(
    cap,
    new THREE.CylinderGeometry(0.1445, 0.1445, 0.011, 24, 1, true, -Math.PI / 2.6, Math.PI / 1.3),
    m.gold,
    0,
    0.166,
    -0.004
  );
  cord.scale.z = 1.08;
  const badge = add(cap, new THREE.SphereGeometry(0.018, 12, 8), m.gold, 0, 0.212, 0.152);
  badge.scale.set(1.1, 1, 0.45);
  for (const sx of [-1, 1]) {
    const w = add(cap, new THREE.BoxGeometry(0.03, 0.007, 0.004), m.gold, 0.026 * sx, 0.214, 0.149);
    w.rotation.set(0, 0.2 * sx, 0.18 * sx);
  }
  // (CampusPilot shows / hides ch.headset with 勞大's moods; the captain's cap stays on whatever he does)
  ch.headset = cap;

  ch.root.traverse((o) => {
    if (o.isMesh && o.geometry.boundingSphere?.radius < 0.04) o.castShadow = false;
  });
  return ch;
}

// ---- the pilot on foot: turns up somewhere on campus near you, strolls the footpaths for a few minutes, wanders off,
// and shows up again somewhere else later. Hidden whenever he is flying (Airdrop passes busy = true).
const PILOT_CALL_VOICE = 'assets/sfx/pilot/voice1.mp3';
// played when you call the helicopter (src/systems/minigames/Airdrop.js): 勞大's voice; the captain says nothing
export const pilotCallVoice = () => (laodaOn() ? PILOT_CALL_VOICE : null);
const PILOT_VOICES = [2, 3, 4].map((n) => `assets/sfx/pilot/voice${n}.mp3`); // greeting him on foot: one of these at random
// greeting him also opens a dialog: one of these jokes at random (question, then the punchline after a key press),
// always followed by the same closing line
const PILOT_JOKES = [
  ['Man 你知道我獲得的最後一個獎是什麼獎嗎？', '螺旋槳'],
  ['Man, Do you know what bee doesn’t fly?', 'Ko-bee'],
  ['Man 你知道為什麼我的背號從8號變成24號嗎？', '因為以前一天睡8小時，現在一天睡24小時'],
];
const PILOT_JOKE_END = '孩子們，這並不好笑';
// the 彥霖航空 captain's greetings instead (勞大 hidden, src/systems/LaodaMode.js): one at random, never the same twice running
const CAPTAIN_LINES = [
  [
    ['彥霖', '機長辛苦了！'],
    ['機長', '不辛苦，能飛就是福氣'],
    ['機長', '要空運機車的話，手機打開「呼叫載具」，我隨時待命 🚁'],
  ],
  [
    ['機長', '各位旅客您好，這裡是機長廣播……'],
    ['機長', '啊，不好意思，在地面上也講習慣了 😅'],
  ],
  [
    ['彥霖', '今天適合飛嗎？'],
    ['機長', '天氣晴朗、能見度良好，很適合飛行'],
    ['機長', '也很適合出去掃街拜票，加油 👍'],
  ],
  [
    ['機長', '彥霖航空的口號是「使命必達」'],
    ['機長', '機車吊在纜繩底下，比你自己騎還穩 🛵'],
  ],
];
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---- 彩蛋：罵勞大（src/systems/LaodaInsult.js）—— 手機訊息罵他（src/ui/phone/Phone.js）或打招呼時當面回嘴罵他，
// 他就放下手邊的事衝過來給你一記肘擊（CampusPilot.provoke）：不在附近就從你視線外冒出來跑過來，在開直升機就等降落再來。
// 到你面前拉肘、打中（你被打飛，布娃娃倒地），站著瞪你一下，然後走開。一次罵一次肘擊。
// 騎車騎快一點他打不到你（停下來就被拉下車）；對話框、小遊戲開著的時候他在旁邊等；看手機的話手機一起被打掉。
const RUN = 7.2, // m/s, a bit slower than your sprint: you can get away for a moment, not for good
  REACH = 1.05, // m: close enough to land it (on foot; next to a vehicle add its half width)
  WIND = 0.36, // s: drawing the elbow back
  SWING = 0.9, // s: the swing through and back to standing
  STAND = 2.4, // s: standing over you afterwards
  GRUDGE_MAX = 240; // s: still not there after this (you kept riding off): he gives up
const FRIENDLY = ['Man，有你的 🤙', 'What can I say，說得好', '好，記住了，Mamba 精神 🐍'];
const sm = (k) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
// the elbow's key poses in his own frame (x + = his left, z + = forward): the right palm, the way the right elbow points, the torso twist
const ELBOW = {
  rest: { p: [-0.25, 0.95, 0.06], e: [0, -0.3, -1], tw: 0 },
  cock: { p: [-0.12, 1.42, 0.14], e: [-1, 0.15, -0.45], tw: -0.5 },
  hit: { p: [0.1, 1.4, 0.18], e: [-0.25, 0.1, 1], tw: 0.6 },
};
const GUARD = { p: [0.14, 1.32, 0.26], e: [1, -0.6, 0.2] }; // the left fist up
const _v = new THREE.Vector3(),
  _w = new THREE.Vector3();

// ---- basketball: some mornings (07:00–08:30) and afternoons (15:30–18:00) he shoots hoops on the 體育園區 court
const BALL_LINES = [
  [
    ['彥霖', '勞大，來一球？'],
    ['勞大', 'Man，我先投滿一百顆，晚點再教你後仰'],
  ],
  [
    ['彥霖', '你今天不用飛喔？'],
    ['勞大', '沒人叫空運，當然來球場流流汗'],
    ['勞大', 'What can I say，手感要每天養 🏀'],
  ],
  [
    ['彥霖', '剛剛那顆好準！'],
    ['勞大', '腳步站好、手肘對準籃框，出手以後手腕不要收'],
    ['勞大', '你也去練，選舉跟投籃一樣，出手才有機會'],
  ],
];
export function pilotBall(clock) {
  const day = Math.floor(clock / 1440),
    m = clock - day * 1440,
    r = (k) => {
      const v = Math.sin(day * 41.7 + k * 97.3) * 43758.5453;
      return v - Math.floor(v);
    };
  return (m >= 420 && m < 510 && r(1) < 0.3) || (m >= 930 && m < 1080 && r(2) < 0.5);
}
const G = 9.8,
  BALL_R = 0.12;
// the jump shot, key poses over time (s): [t, knee bend, toes down, lean, ball (x, y, z in his frame, m; x + = his left), left hand share]
//   gather → dip → set point above the forehead → release at the top → follow-through → landing → up again
const SHOT = [
  [0, 0.25, 0, 0.1, 0, 1.06, 0.34, 1],
  [0.3, 0.95, 0, 0.22, -0.05, 1.0, 0.33, 1],
  [0.56, 0.1, 0.5, 0.02, -0.09, 1.72, 0.27, 1],
  [0.78, 0.12, 0.6, -0.04, -0.1, 1.93, 0.36, 1],
  [0.84, 0.15, 0.6, -0.04, -0.1, 1.96, 0.48, 0.55],
  [1.08, 0.3, 0.35, 0, -0.13, 1.94, 0.46, 0.15],
  [1.2, 0.75, 0, 0.12, -0.13, 1.8, 0.48, 0],
  [1.6, 0.05, 0, 0, -0.2, 1.2, 0.35, 0],
];
const T_OFF = 0.52,
  T_LAND = 1.1,
  T_REL = 0.8,
  T_END = 1.5,
  HOP = 0.4; // leaves the floor, lands, lets go, done (s); height (m)
const keyAt = (t) => {
  let i = 0;
  while (i + 2 < SHOT.length && t > SHOT[i + 1][0]) i++;
  const a = SHOT[i],
    b = SHOT[i + 1],
    k = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))),
    e = k * k * (3 - 2 * k);
  return a.map((v, n) => v + (b[n] - v) * e);
};
const V = () => new THREE.Vector3();
// him and the ball on the middle court of the east side: dribble to a spot, shoot (jump shot), rebound, again; now and then the other basket
class BallGame {
  constructor(p) {
    // p: the CampusPilot (its pos, heading, ch, g)
    this.p = p;
    this.C = COURTS[0];
    this.rims = courtRims(this.C);
    this.end = 1;
    this.pos = V();
    this.vel = V();
    this.hold = new THREE.Vector3(0, 1.06, 0.34);
    this.from = V();
    this.a = V();
    this.b = V();
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 128;
    const c = cv.getContext('2d');
    c.fillStyle = '#d2692a';
    c.fillRect(0, 0, 256, 128);
    c.strokeStyle = '#231a14';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(0, 64);
    c.lineTo(256, 64);
    for (const x of [2, 128]) {
      c.moveTo(x, 0);
      c.lineTo(x, 128);
    }
    c.stroke();
    for (const x of [64, 192]) {
      c.beginPath();
      c.ellipse(x, 64, 30, 50, 0, 0, 7);
      c.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 20, 14),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 })
    );
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    p.g.scene.add(this.mesh);
  }
  rim() {
    return this.rims[this.end];
  }
  spot() {
    // somewhere in front of the basket, inside the court, 3–7 m out
    const s = this.rim().s,
      a = (Math.random() - 0.5) * 2.4,
      r = 3 + Math.random() * 3.8,
      u = s * (this.C.L / 2 - 1.6 - Math.cos(a) * r),
      v = Math.sin(a) * r;
    const [x, z] = courtP(this.C, u, Math.max(-6.4, Math.min(6.4, v)));
    return { x, z };
  }
  start(x, z) {
    this.st = 'move';
    this.t = 0;
    this.jump = 0;
    this.bp = 0;
    this.gone = this.air = false;
    this.act = null;
    this.ease = 1;
    this.to = this.spot();
    this.p.pos.x = x;
    this.p.pos.z = z;
    this.hold.set(0, 1.06, 0.34);
    this.pos.set(x, surfaceAt(x, z) + 1, z);
    this.mesh.visible = true;
    this.made = this.shots = 0;
  }
  stop() {
    this.mesh.visible = false;
    this.jump = 0;
  }
  sound(x, z, freq, vol, type = 'bandpass', dur = 0.09) {
    const g = this.p.g,
      q = g.player.worldPos(),
      k = Math.max(0, 1 - Math.hypot(x - q.x, z - q.z) / 32);
    if (k > 0.02) g.audio.noise?.(dur, freq, 1, vol * k * k, 0, type);
  }
  // one step of the rolling / bouncing / flying ball
  free(dt) {
    const b = this.pos,
      v = this.vel;
    v.y -= G * dt;
    b.addScaledVector(v, dt);
    const y = surfaceAt(b.x, b.z, b.y) + BALL_R;
    if (b.y < y && v.y < 0) {
      b.y = y;
      if (v.y < -1.1) {
        this.sound(b.x, b.z, 260, Math.min(0.5, -v.y * 0.08), 'lowpass');
        v.y *= -0.68;
        v.x *= 0.8;
        v.z *= 0.8;
      } else {
        v.y = 0;
        const k = Math.max(0, 1 - dt * 1.2);
        v.x *= k;
        v.z *= k;
      }
    }
  }
  // advance; returns { speed, act } for the character: act 'dribble' | 'hold' | 'shot' | 'pick' | null
  step(dt, busy) {
    // busy: talking to you — he holds the ball and waits
    const p = this.p,
      r = this.rim();
    this.t += dt;
    this.jump = 0;
    const face = (x, z, k = 8) => {
      p.heading += angDiff(Math.atan2(x - p.pos.x, z - p.pos.z), p.heading) * Math.min(1, dt * k);
    };
    const walk = (x, z, speed) => {
      const dx = x - p.pos.x,
        dz = z - p.pos.z,
        d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const s = Math.min(d, speed * dt);
        p.pos.x += (dx / d) * s;
        p.pos.z += (dz / d) * s;
        face(x, z);
      }
      return d;
    };
    if (busy && (this.st === 'move' || this.st === 'set' || this.st === 'hold')) {
      this.st = 'hold';
      this.t = 0;
      return { speed: 0, act: 'hold' };
    }
    if (busy && this.st === 'chase') {
      this.flight(dt);
      return { speed: 0, act: null };
    } // (a shot under way is finished first)
    if (this.st === 'hold') {
      if (this.t > 0.5) {
        this.st = 'move';
        this.t = 0;
      }
      return { speed: 0, act: 'hold' };
    }
    if (this.st === 'move') {
      // dribbling to the spot
      const d = walk(this.to.x, this.to.z, 2.7);
      if (d < 0.3) {
        this.st = 'set';
        this.t = 0;
      }
      return { speed: 2.7, act: 'dribble' };
    }
    if (this.st === 'set') {
      // two dribbles on the spot, squared up to the basket, then the ball comes into both hands
      face(r.x, r.z);
      if (this.t < 1.15) return { speed: 0, act: 'dribble' };
      if (this.t < 1.5) return { speed: 0, act: 'hold' };
      this.st = 'shot';
      this.t = 0;
    }
    if (this.st === 'shot') {
      face(r.x, r.z, 10);
      const k = (this.t - T_OFF) / (T_LAND - T_OFF);
      this.jump = k > 0 && k < 1 ? 4 * HOP * k * (1 - k) : 0;
      if (this.gone) this.flight(dt);
      if (this.t > T_END) {
        this.st = 'chase';
        this.t = 0;
      }
      return { speed: 0, act: 'shot' };
    }
    if (this.st === 'pick') {
      // down to the ball, up with it in both hands
      if (this.t > 0.6) {
        this.st = 'move';
        this.t = 0;
        this.bp = 0;
        this.to = this.spot();
        return { speed: 0, act: 'dribble' };
      }
      return { speed: 0, act: 'pick' };
    }
    // chase: after the ball
    this.flight(dt);
    const b = this.pos,
      gy = surfaceAt(b.x, b.z, b.y),
      d = Math.hypot(b.x - p.pos.x, b.z - p.pos.z);
    if (!this.air && d < 0.62 && b.y - gy < 1.3) {
      this.st = 'pick';
      this.t = 0;
      this.gone = false;
      this.sound(b.x, b.z, 500, 0.15);
      if (++this.shots % 6 === 0) this.end = this.rims.length - 1 - this.end; // the other basket
      return { speed: 0, act: 'pick' };
    }
    if (this.t > 14) {
      this.pos.set(p.pos.x, gy + 1, p.pos.z);
      this.vel.set(0, 0, 0);
      this.air = false;
    } // it rolled away: never out of reach for long
    if (this.air && b.y > gy + 2.2 && d < 3) {
      face(r.x, r.z);
      return { speed: 0, act: null };
    }
    const gap = this.vel.y > 0.5 || b.y - gy > 1.4 ? 0.8 : 0.3; // a bouncing ball: waits beside it
    if (d > gap) walk(b.x + this.vel.x * 0.2, b.z + this.vel.z * 0.2, 3.4);
    else face(b.x, b.z);
    return { speed: d > gap ? 3.4 : 0, act: null };
  }
  shoot() {
    const r = this.rim(),
      b = this.pos,
      T = 0.75 + Math.hypot(r.x - b.x, r.z - b.z) * 0.065;
    this.gone = true;
    this.air = true;
    this.ft = 0;
    this.T = T;
    this.good = Math.random() < 0.72;
    this.mx = this.mz = 0;
    if (!this.good) {
      const a = Math.atan2(-this.C.d[0] * r.s, -this.C.d[1] * r.s) + (Math.random() - 0.5) * 2.4;
      this.mx = Math.sin(a) * RIM_R;
      this.mz = Math.cos(a) * RIM_R;
    } // off the rim
    this.vel.set(
      (r.x + this.mx - b.x) / T,
      (r.y + BALL_R * 0.5 - b.y) / T + (G * T) / 2,
      (r.z + this.mz - b.z) / T
    );
  }
  flight(dt) {
    this.free(dt);
    if (!this.air) return;
    this.ft += dt;
    if (this.ft < this.T) return;
    this.air = false;
    const r = this.rim(),
      b = this.pos,
      v = this.vel;
    b.set(r.x + this.mx, r.y + BALL_R * 0.5, r.z + this.mz);
    if (this.good) {
      v.set(v.x * 0.06, -2.2, v.z * 0.06);
      this.made++;
      this.sound(r.x, r.z, 3200, 0.35, 'highpass', 0.22);
    } // through the net
    else {
      const s = 1.2 + Math.random() * 1.2,
        h = Math.hypot(this.mx, this.mz);
      v.set(
        (this.mx / h) * s - v.x * 0.25,
        1.6 + Math.random() * 1.4,
        (this.mz / h) * s - v.z * 0.25
      );
      this.sound(r.x, r.z, 700, 0.5);
    } // off the iron
  }
  reach(arm, ...q) {
    reachArm(this.p.ch, arm, ...q);
  }
  legs(bend, toes, lean) {
    // both knees the same: the feet stay under him
    const ch = this.p.ch;
    for (const l of ch.legs) {
      l.kn.rotation.x = bend;
      l.hp.rotation.x = -bend / 2 + 0.03 * l.s;
      l.ft.rotation.x = toes ? toes : -bend / 2;
    }
    ch.hips.position.y = 0.93 - 0.86 * (1 - Math.cos(bend / 2));
    ch.body.position.y = 0;
    ch.torso.rotation.set(lean, 0, 0);
  }
  // after ch.update: body, arms and the ball
  pose(dt, act) {
    const ch = this.p.ch,
      [aR, aL] = ch.arms,
      b = this.pos,
      o = this.hold,
      k = Math.min(1, dt * 12);
    const both = (share) => {
      // palms on the ball: the right one behind and under it, the left one on its side
      this.reach(aR, o.x - 0.075, o.y - 0.08, o.z - 0.085, -0.35, -1, -0.1);
      this.reach(
        aL,
        o.x + 0.125 + (1 - share) * 0.1,
        o.y - 0.01 - (1 - share) * 0.35,
        o.z - 0.02 - (1 - share) * 0.05,
        0.5,
        -1,
        -0.1
      );
    };
    const toWorld = () => {
      ch.root.updateMatrixWorld(true);
      b.copy(ch.root.localToWorld(this.a.copy(o)));
      this.vel.set(0, 0, 0);
    };
    if (act !== this.act) {
      // the ball goes on from where it is: no jump between a dribble, two hands and a shot
      ch.root.updateMatrixWorld(true);
      if (act === 'hold' || (act === 'shot' && !this.gone))
        o.copy(ch.root.worldToLocal(this.a.copy(b)));
      else if (act === 'pick') this.from.copy(ch.root.worldToLocal(this.a.copy(b)));
      else if (act === 'dribble') {
        this.bp = 0.5;
        this.ease = 0;
      } // starts at the top of a bounce
      this.act = act;
    }
    if (act === 'shot') {
      const q = keyAt(this.t);
      this.legs(q[1], q[2], q[3]);
      ch.head.rotation.x = -0.22;
      if (this.t < 0.25) o.lerp(this.a.set(q[4], q[5], q[6]), Math.min(1, dt * 18));
      else o.set(q[4], q[5], q[6]);
      ch.root.updateMatrixWorld(true);
      if (!this.gone) {
        toWorld();
        both(q[7]);
        if (this.t >= T_REL) this.shoot();
      } else {
        // the right hand stays up, wrist over; the left one comes down
        const drop = Math.max(0, Math.min(1, (this.t - T_REL) / 0.45));
        this.reach(aR, q[4] - 0.06, q[5] + 0.02, q[6], -0.4, -1, 0.1);
        this.reach(
          aL,
          0.17 + drop * 0.1,
          q[5] - 0.12 - drop * 0.75,
          0.32 - drop * 0.12,
          0.6,
          -1,
          -0.1
        );
      }
    } else if (act === 'pick') {
      const e = Math.min(1, this.t / 0.55),
        low = Math.sin(Math.min(1, e * 1.15) * Math.PI),
        f = this.from,
        up = e < 0.35 ? 0 : (e - 0.35) / 0.65,
        u2 = up * up * (3 - 2 * up);
      const depth = Math.max(0, Math.min(1, (1.0 - f.y) / 0.85));
      this.legs(0.15 + 1.35 * low * depth, 0, 0.12 + 0.75 * low * depth);
      o.set(f.x + (0 - f.x) * u2, f.y + (1.06 - f.y) * u2, f.z + (0.34 - f.z) * u2);
      toWorld();
      both(1);
    } else if (act === 'hold') {
      o.lerp(this.a.set(0, 1.06, 0.34), k);
      this.legs(0.25, 0, 0.08);
      toWorld();
      both(1);
    } else if (act === 'dribble') {
      const was = this.bp;
      this.bp = (this.bp + dt * 1.75) % 1;
      const h = 1 - (2 * this.bp - 1) ** 2,
        stand = this.st === 'set'; // 0 on the floor, 1 at his hand
      if (stand) this.legs(0.45, 0, 0.24);
      else ch.torso.rotation.x = 0.16;
      ch.root.updateMatrixWorld(true);
      const hy = 0.98 + 0.1 * h;
      o.lerp(this.a.set(-0.3, 1.0, 0.36), k);
      this.reach(aR, o.x, hy, o.z - 0.04, -0.5, -0.4, -1);
      ch.root.localToWorld(this.a.set(o.x, hy - BALL_R - 0.03, o.z));
      const gy = surfaceAt(this.a.x, this.a.z, this.p.y + 0.5) + BALL_R;
      this.b.set(this.a.x, gy + Math.max(0, this.a.y - gy) * h, this.a.z);
      this.ease = Math.min(1, this.ease + dt * 4);
      b.lerp(this.b, this.ease < 1 ? Math.min(1, dt * 9 + this.ease ** 3) : 1);
      this.vel.set(0, 0, 0);
      if (was > this.bp) this.sound(b.x, b.z, 240, 0.42, 'lowpass');
    }
    this.mesh.position.copy(b);
    const sp = this.gone ? this.vel.length() : act === 'dribble' ? 2 : 0;
    this.mesh.rotation.x -= sp * dt * 2.5;
    this.mesh.rotation.y = this.p.heading;
  }
}

export class CampusPilot {
  constructor(game) {
    this.g = game;
    this.ch = null;
    this.on = false;
    this.court = null;
    this.mode = null; // 'walk' | 'court'
    this.wait = 25 + Math.random() * 35; // first appearance within the first minute or so
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.y = 0;
    this.lift = 0; // (coming for you) an interior floor's height above the ground under him, src/world/Kit.js groundAt
    this.grudge = null; // you insulted him (provoke): he is on his way to elbow you
    this.laoda = laodaOn(); // 勞大, or the 彥霖航空 captain while 勞大 is hidden (src/systems/LaodaMode.js)
  }
  get name() {
    return this.laoda ? '勞大' : '機長';
  }
  _build() {
    this.laoda = laodaOn();
    const ch = (this.ch = createPilot(this.laoda));
    const tag = makeLabel(this.laoda ? '🚁 勞大' : '🚁 彥霖航空機長', { height: 0.26, size: 40 });
    tag.position.set(0, 2.12, 0);
    ch.root.add(tag);
    ch.root.visible = false;
    this.g.scene.add(ch.root);
    if (!this._act) this._addAction();
  }
  // 勞大 called back / sent off at the terminal (src/systems/LaodaMode.js): drop the model; the next one has the other look
  reset() {
    this.grudge = null;
    this.hide(20 + Math.random() * 20); // (a route following him lets go once he is off: navPos() null)
    this.court = null;
    if (this.ch) this.g.scene.remove(this.ch.root);
    this.ch = null;
    this.laoda = laodaOn();
  }
  _addAction() {
    this._act = true;
    // walk up to him and press E: he stops, turns to you and says one of his lines (a random clip, never the same twice running)
    const pos = this.pos;
    this.g.interiors.actions.push({
      get x() {
        return pos.x;
      },
      get z() {
        return pos.z;
      },
      r: 2.4,
      y: 0,
      anyY: true,
      cond: () => this.on && !this.grudge && this.mode !== 'leave',
      label: () =>
        this.mode === 'court'
          ? '按 <kbd>E</kbd> 和打球的勞大聊聊'
          : `按 <kbd>E</kbd> 和${this.name}打招呼`,
      fn: () => this.greet(),
    });
  }
  async greet() {
    if (!this.laoda) {
      this._captainGreet();
      return;
    }
    let i;
    do i = Math.floor(Math.random() * PILOT_VOICES.length);
    while (PILOT_VOICES.length > 1 && i === this._lastVoice);
    this._lastVoice = i;
    const p = this.g.player.worldPos();
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.pause = Math.max(this.pause, 2.5);
    // the last line of his greeting has a box to say something back to him (src/ui/HUD.js reply): see hear()
    const reply = { send: (text) => this.hear(text) };
    if (this.mode === 'court') {
      // between shots: about basketball
      this.talking = true;
      this._ballLine = ((this._ballLine ?? -1) + 1) % BALL_LINES.length;
      this.g.dialog(
        BALL_LINES[this._ballLine],
        () => {
          this.talking = false;
          this.pause = Math.min(this.pause, 1);
        },
        { reply }
      );
      return;
    }
    let j;
    do j = Math.floor(Math.random() * PILOT_JOKES.length);
    while (PILOT_JOKES.length > 1 && j === this._lastJoke);
    this._lastJoke = j;
    this.talking = true;
    const [q, a] = PILOT_JOKES[j];
    this.g.dialog(
      [
        ['勞大', q],
        ['勞大', a],
        ['勞大', PILOT_JOKE_END],
      ],
      () => {
        this.talking = false;
        this.pause = Math.max(this.pause, 1);
      },
      { reply }
    );
    const len = await this.g.audio.voice(PILOT_VOICES[i], 1, 'pilot');
    if (len && this.on && !this.grudge) this.pause = Math.max(this.pause, len + 0.8);
  }
  // the captain: stops, turns to you and has a word (no voice clip, no box to answer back)
  _captainGreet() {
    const p = this.g.player.worldPos();
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.pause = Math.max(this.pause, 2.5);
    let j;
    do j = Math.floor(Math.random() * CAPTAIN_LINES.length);
    while (CAPTAIN_LINES.length > 1 && j === this._lastJoke);
    this._lastJoke = j;
    this.talking = true;
    this.g.dialog(CAPTAIN_LINES[j], () => {
      this.talking = false;
      this.pause = Math.max(this.pause, 1);
    });
  }
  // what you said back to him face to face (the box at the end of his greeting): insult him and he elbows you
  hear(text) {
    this.talking = true;
    this.pause = Math.max(this.pause, 2);
    if (insultsLaoda(text, true)) {
      this.g.dialog(
        [
          ['勞大', 'Man……你剛剛說什麼？'],
          ['勞大', '你再說一次看看'],
        ],
        () => {
          this.talking = false;
          this.provoke();
        }
      );
      return;
    }
    this.g.dialog(
      [
        ['彥霖', text],
        ['勞大', FRIENDLY[Math.floor(Math.random() * FRIENDLY.length)]],
      ],
      () => {
        this.talking = false;
        this.pause = Math.max(this.pause, 1);
      }
    );
  }
  // you insulted him (a message, src/ui/phone/Phone.js, or to his face): he comes over and elbows you (_revenge).
  // false: already on his way, or he is the captain (勞大 hidden: no elbow)
  provoke() {
    if (this.grudge || !this.laoda) return false;
    this.grudge = { t: 0, st: 'run', k: 0, best: Infinity, stuck: 0 };
    return true;
  }
  // where the route goes when you asked him 你在哪？ on the phone (nav.track); null once he has gone
  get navArrive() {
    return `📍 找到${this.name}了！走到他旁邊按 E 打招呼`;
  }
  navPos() {
    return this.on ? { x: this.pos.x, z: this.pos.z } : null;
  }
  // pick a campus footpath node 30–90 m from the player; false when there is none (you are off campus)
  appear() {
    const w = this.g.world,
      p = this.g.player.worldPos();
    const near = w.walkNodes.filter((n) => {
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      return d > 30 && d < 90 && w.inCampus(n.x, n.z);
    });
    if (!near.length) return false;
    if (!this.ch) this._build();
    const n = near[Math.floor(Math.random() * near.length)];
    this.from = n;
    this.to = this._pick(n, null);
    this.d = 0;
    this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
    this.pos.set(n.x, 0, n.z);
    this.y = surfaceAt(n.x, n.z);
    this.heading = Math.atan2(this.to.x - n.x, this.to.z - n.z);
    this.pause = 0;
    this.life = 150 + Math.random() * 150; // strolls for 2.5–5 minutes
    this.on = true;
    this.mode = 'walk';
    this.ch.root.visible = true;
    this.ch.headset.visible = true;
    return true;
  }
  // at the basketball court for a while. You are there already: he comes dribbling in from a path, out of your sight
  playBall() {
    if (!this.laoda) return false; // basketball is 勞大's (the captain never goes to the court)
    const c = COURTS[0].c,
      p = this.g.player.worldPos();
    let q = null;
    if (Math.hypot(c[0] - p.x, c[1] - p.z) < 75) {
      const w = this.g.world,
        d = this.g.camera.getWorldDirection(new THREE.Vector3());
      const clear = (n) => {
        const L = Math.hypot(c[0] - n.x, c[1] - n.z);
        for (let t = 0; t < L - 3; t += 1.5) {
          const x = n.x + ((c[0] - n.x) * t) / L,
            z = n.z + ((c[1] - n.z) * t) / L;
          if (!w.isFree(x, z, 0.4) || COLUMNS.some((q) => Math.hypot(q[0] - x, q[1] - z) < 1.2))
            return false;
        }
        return true;
      };
      const near = w.walkNodes.filter((n) => {
        const D = Math.hypot(n.x - p.x, n.z - p.z),
          dc = Math.hypot(n.x - c[0], n.z - c[1]);
        return (
          dc > 30 &&
          dc < 130 &&
          D > 35 &&
          w.inCampus(n.x, n.z) &&
          (D > 80 || (n.x - p.x) * d.x + (n.z - p.z) * d.z < 0) &&
          clear(n)
        );
      });
      if (!near.length) {
        this.wait = 6;
        return false;
      }
      q = near[Math.floor(Math.random() * near.length)];
    }
    if (!this.ch) this._build();
    this.court = this.court || new BallGame(this);
    q = q || this.court.spot();
    this.heading = 0;
    this.pause = 0;
    this.face = null;
    this.talking = false;
    this.on = true;
    this.mode = 'court';
    this.ch.headset.visible = false;
    this.pos.set(q.x, 0, q.z);
    this.y = surfaceAt(q.x, q.z);
    this.court.start(q.x, q.z);
    return true;
  }
  hide(wait = 90 + Math.random() * 120) {
    this.on = false;
    this.mode = null;
    this.talking = false;
    this.lift = 0;
    this.wait = wait;
    this.court?.stop();
    if (this.ch) this.ch.root.visible = false;
  }
  _pick(n, from) {
    // next node: stay on campus, don't turn straight back unless it's a dead end
    let opts = n.adj.filter((e) => e.to !== from && this.g.world.inCampus(e.to.x, e.to.z));
    if (!opts.length) opts = n.adj;
    return opts[Math.floor(Math.random() * opts.length)].to;
  }
  update(dt, busy) {
    if (busy) {
      if (this.on) this.hide(40 + Math.random() * 40);
      return;
    } // he's up in the helicopter (insulted meanwhile: he comes once he has landed)
    if (this.grudge) {
      this._revenge(dt);
      return;
    }
    const p = this.g.player.worldPos();
    if (this.mode === 'leave') {
      this._leaving(dt, p);
      return;
    }
    if (!this.on) {
      this.wait -= dt;
      if (this.laoda && pilotBall(this.g.clock)) {
        if (this.wait <= 0) this.playBall();
        return;
      } // a basketball day: there or on his way, not strolling as well
      if (this.wait <= 0 && !this.appear()) this.wait = 15;
      return;
    }
    if (this.mode === 'court') {
      this._playing(dt, p);
      return;
    }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    this.life -= dt;
    if (this.g.nav?.follow === this) this.life = Math.max(this.life, 30); // he waits for you while you are on your way
    const ball = this.laoda && pilotBall(this.g.clock); // time for basketball (勞大 only): off to the court once you can't see him
    if (dPl > 170 || ((this.life <= 0 || ball) && dPl > 60 && this.g.nav?.follow !== this)) {
      this.hide(ball ? 4 : undefined);
      return;
    } // left behind, or done and out of sight
    let speed = 0;
    if (this.talking) this.pause = Math.max(this.pause, 0.5); // stays put, facing you, until the dialog is closed
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6); // turned to you while talking
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.35;
      this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to;
        this.to = this._pick(n, this.from);
        this.from = n;
        this.d = 0;
        this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.3) this.pause = 2 + Math.random() * 4; // stops to look around now and then
      }
      const k = this.d / this.len,
        dx = this.to.x - this.from.x,
        dz = this.to.z - this.from.z,
        off = 0.6;
      const tx = this.from.x + dx * k - (dz / this.len) * off,
        tz = this.from.z + dz * k + (dx / this.len) * off;
      this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 4);
      this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 4);
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 6);
    }
    this._block();
    this.y = surfaceAt(this.pos.x, this.pos.z, this.y + 0.5);
    const r = this.ch.root;
    r.position.set(this.pos.x, this.y, this.pos.z);
    r.rotation.y = this.heading;
    this.ch.setDetail(dPl < 35);
    this.ch.update(dt, { speed, mode: 'foot' });
  }
  _playing(dt, p) {
    const d = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (!pilotBall(this.g.clock) && d > 75 && this.g.nav?.follow !== this) {
      this.hide();
      return;
    } // done for today (never while you watch)
    if (this.talking) this.pause = Math.max(this.pause, 0.5);
    this.pause = Math.max(0, this.pause - dt);
    const a = this.court.step(Math.min(dt, 0.05), this.pause > 0);
    if (this.pause > 0 && this.face != null)
      this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6);
    else this.face = null;
    this._block();
    this.y = surfaceAt(this.pos.x, this.pos.z, this.y + 0.5);
    const r = this.ch.root,
      vis = d < 220;
    r.visible = this.court.mesh.visible = vis;
    r.position.set(this.pos.x, this.y + this.court.jump, this.pos.z);
    r.rotation.y = this.heading;
    if (vis) {
      this.ch.setDetail(d < 35);
      this.ch.update(dt, { speed: a.speed, mode: 'foot' });
    }
    this.court.pose(Math.min(dt, 0.05), a.act);
  }
  // ---- coming for you after an insult (provoke): run up, draw the elbow back, swing, stand over you, walk off ----
  _revenge(dt) {
    const g = this.g,
      P = g.player,
      R = this.grudge,
      p = P.worldPos(),
      v = P.vehicle;
    R.t += dt;
    if (!this.ch) this._build();
    if (!this.on || this.mode !== 'revenge') {
      // drops whatever he was doing; nowhere near (or not out at all): turns up out of your sight and runs over
      const far = !this.on || Math.hypot(this.pos.x - p.x, this.pos.z - p.z) > 60;
      this.court?.stop();
      this.on = true;
      this.mode = 'revenge';
      this.talking = false;
      this.face = null;
      this.pause = 0;
      this.ch.root.visible = true;
      this.ch.headset.visible = true;
      if (far) this._ambush(p, 22);
      else this.lift = 0;
    }
    let dx = p.x - this.pos.x,
      dz = p.z - this.pos.z,
      d = Math.hypot(dx, dz);
    const py = v ? (v.mesh?.position.y ?? this.y) : P.pos.y,
      level = Math.abs(py - this.y) < 1.6,
      reach = REACH + (v ? v.hw || 0.5 : 0),
      fast = !!v && Math.abs(v.speed || 0) > 3,
      // something on screen (a dialog, a minigame…, src/core/Game.js uiBusy) or you are already down: he waits
      free = !g.uiBusy && !P.tumble && !P.rag && !fast;
    let speed = 0;
    if (R.st === 'run') {
      if (d > reach * 0.85) {
        const s = Math.min(d - reach * 0.8, RUN * dt);
        this.pos.x += (dx / d) * s;
        this.pos.z += (dz / d) * s;
        speed = RUN;
        this._collide();
        dx = p.x - this.pos.x;
        dz = p.z - this.pos.z;
        d = Math.hypot(dx, dz);
      }
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 10);
      // getting nowhere (a wall in between, you upstairs, you ran off): turns up closer, out of sight
      if (d < R.best - 0.8) {
        R.best = d;
        R.stuck = 0;
      } else if (!fast && (d > reach * 1.5 || !level)) R.stuck += dt;
      if (!fast && (d > 70 || R.stuck > 5)) {
        this._ambush(p, d > 14 ? 9 : 5);
        R.best = Infinity;
        R.stuck = 0;
      } else if (d <= reach && level && free) {
        R.st = 'wind';
        R.k = 0;
        const i = Math.floor(Math.random() * PILOT_VOICES.length);
        g.audio.voice?.(PILOT_VOICES[i], 1, 'pilot');
      } else if (R.t > GRUDGE_MAX) {
        g.hud.toast('😮‍💨 勞大追累了，這次先放過你', 'good', 2600);
        this._leave();
        return;
      }
    } else if (R.st === 'wind') {
      R.k += dt;
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 14);
      if (!free || d > reach * 1.6) {
        R.st = 'run'; // you got away (or something came up) just in time
        R.k = 0;
      } else if (R.k >= WIND) {
        this._strike();
        R.st = 'swing';
        R.k = 0;
      }
    } else {
      // swing: a short lunge into it, then he stands there
      R.k += dt;
      if (R.k < 0.15) {
        this.pos.x += Math.sin(this.heading) * 1.6 * dt;
        this.pos.z += Math.cos(this.heading) * 1.6 * dt;
        this._collide();
      }
      if (R.k >= SWING + STAND) {
        this._leave();
        return;
      }
    }
    this._block();
    this._ground();
    const r = this.ch.root;
    r.visible = true;
    r.position.set(this.pos.x, this.y, this.pos.z);
    r.rotation.y = this.heading;
    this.ch.setDetail(d < 35);
    this.ch.update(dt, { speed, mode: 'foot' });
    if (R.st === 'wind') this._elbow(ELBOW.rest, ELBOW.cock, sm(R.k / WIND), sm(R.k / 0.2));
    else if (R.st === 'swing') {
      if (R.k < 0.5) this._elbow(ELBOW.cock, ELBOW.hit, sm(R.k / 0.12), 1);
      else if (R.k < SWING) {
        const k = sm((R.k - 0.5) / (SWING - 0.5));
        this._elbow(ELBOW.hit, ELBOW.rest, k, 1 - k);
      }
    }
  }
  // the elbow: his right arm and torso between two key poses (k), the left fist up by guard (0…1). After ch.update
  _elbow(a, b, k, guard) {
    const ch = this.ch,
      [aR, aL] = ch.arms,
      L = (i, key) => a[key][i] + (b[key][i] - a[key][i]) * k;
    ch.torso.rotation.y = a.tw + (b.tw - a.tw) * k;
    ch.root.updateMatrixWorld(true);
    reachArm(ch, aR, L(0, 'p'), L(1, 'p'), L(2, 'p'), L(0, 'e'), L(1, 'e'), L(2, 'e'));
    if (guard > 0) {
      const R0 = ELBOW.rest.p,
        G = GUARD.p;
      reachArm(
        ch,
        aL,
        -R0[0] + (G[0] + R0[0]) * guard,
        R0[1] + (G[1] - R0[1]) * guard,
        R0[2] + (G[2] - R0[2]) * guard,
        GUARD.e[0],
        GUARD.e[1],
        GUARD.e[2]
      );
    }
    ch.setHandPose?.('grip');
  }
  // the elbow lands: off the scooter / up from the bench first, the phone flies, and you go down (a ragdoll, src/entities/Player.js)
  _strike() {
    const g = this.g,
      P = g.player,
      v = P.vehicle;
    if (P.seat) P.standUp();
    if (v) {
      g.audio.engineStop?.(v.kind);
      P.exit(g.scene, g.world.collision, g.interiors);
      g.audio.setEngine?.(false, 0);
      g.hud.setSpeed?.(null);
      if (g.headlight) g.headlight.intensity = 0;
    }
    if (g.phone?.open) g.phone.close();
    // away from him and a little to his left: the elbow swings from his right across
    const q = P.pos,
      fx = q.x - this.pos.x,
      fz = q.z - this.pos.z,
      f = Math.hypot(fx, fz) || 1,
      lx = Math.cos(this.heading),
      lz = -Math.sin(this.heading);
    let nx = fx / f + lx * 0.35,
      nz = fz / f + lz * 0.35;
    const n = Math.hypot(nx, nz) || 1;
    nx /= n;
    nz /= n;
    P.throwOff(nx * 6.5, nz * 6.5, 3.4, 2.2);
    g.audio.hitPed?.();
    g.hud.bigToast?.('💥 被勞大肘擊了！', '勞大：Man，嘴巴放乾淨一點', 2800);
  }
  // done with you: walks off the other way and is gone once out of sight (back another time as usual)
  _leave() {
    const p = this.g.player.worldPos();
    this.grudge = null;
    this.mode = 'leave';
    this.leaveT = 0;
    this.leaveDir = Math.atan2(this.pos.x - p.x, this.pos.z - p.z) + (Math.random() - 0.5) * 0.8;
  }
  _leaving(dt, p) {
    this.leaveT += dt;
    const d = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (d > 45 || this.leaveT > 30) {
      this.hide();
      return;
    }
    this.pos.x += Math.sin(this.leaveDir) * 1.5 * dt;
    this.pos.z += Math.cos(this.leaveDir) * 1.5 * dt;
    this._collide();
    this.heading += angDiff(this.leaveDir, this.heading) * Math.min(1, dt * 5);
    this._block();
    this._ground();
    const r = this.ch.root;
    r.position.set(this.pos.x, this.y, this.pos.z);
    r.rotation.y = this.heading;
    this.ch.setDetail(d < 35);
    this.ch.update(dt, { speed: 1.5, mode: 'foot' });
  }
  // put him somewhere around p, r m off, out of your view (to the side of or behind the camera) with a clear run to you,
  // on your floor; nowhere like that: right behind you
  _ambush(p, r) {
    const g = this.g,
      w = g.world,
      P = g.player,
      floor = P.vehicle ? 0 : P.ground || 0,
      ground = g.interiors?.groundAt ? (x, z) => g.interiors.groundAt(x, z, floor) : () => 0,
      cd = g.camera.getWorldDirection(_w),
      cy = Math.atan2(cd.x, cd.z);
    const clear = (x, z) => {
      const L = Math.hypot(p.x - x, p.z - z);
      for (let t = 1.5; t < L - 1; t += 1.5)
        if (!w.isFree(x + ((p.x - x) * t) / L, z + ((p.z - z) * t) / L, 0.3)) return false;
      return true;
    };
    for (const R of [r, Math.min(r, 9), 5, 3])
      for (const a of [0.5, -0.5, 0.7, -0.7, 1, 0.35, -0.35]) {
        const x = p.x + Math.sin(cy + a * Math.PI) * R,
          z = p.z + Math.cos(cy + a * Math.PI) * R;
        if (!w.isFree(x, z, 0.4) || Math.abs(ground(x, z) - floor) > 0.5 || !clear(x, z)) continue;
        this._put(x, z, floor, p);
        return;
      }
    const h = P.worldHeading?.() ?? P.heading ?? 0;
    this._put(p.x - Math.sin(h) * 1.6, p.z - Math.cos(h) * 1.6, floor, p);
  }
  _put(x, z, floor, p) {
    const P = this.g.player,
      base = P.vehicle ? (P.vehicle.mesh?.position.y ?? 0) : P.pos.y - (P.y || 0);
    this.pos.set(x, 0, z);
    this.lift = this.g.interiors?.groundAt?.(x, z, floor) ?? 0;
    this.y = surfaceAt(x, z, base + 0.5) + this.lift;
    this.heading = Math.atan2(p.x - x, p.z - z);
    this.ch.root.position.set(x, this.y, z);
  }
  // walls push him out (on his floor)
  _collide() {
    const c = this.g.world.collision;
    if (!c) return;
    _v.set(this.pos.x, this.y, this.pos.z);
    c.resolve(_v, 0.36, this.lift);
    this.pos.x = _v.x;
    this.pos.z = _v.z;
  }
  // his feet: the ground, or an interior floor he has walked up onto (stairs, like you, src/entities/Player.js)
  _ground() {
    const surf = surfaceAt(this.pos.x, this.pos.z, this.y - this.lift + 0.5);
    this.lift = this.g.interiors?.groundAt?.(this.pos.x, this.pos.z, this.lift) ?? 0;
    this.y = surf + this.lift;
  }
  _block() {
    // nobody walks through him
    const P = this.g.player;
    if (P.vehicle || P.seat || Math.abs(P.pos.y - this.y) > 1.5) return;
    const q = P.pos,
      dx = q.x - this.pos.x,
      dz = q.z - this.pos.z,
      d = Math.hypot(dx, dz);
    if (d < 0.62 && d > 1e-4) {
      q.x = this.pos.x + (dx / d) * 0.62;
      q.z = this.pos.z + (dz / d) * 0.62;
    }
  }
}
