// 277 麻將的 3D 牌桌：自己一個小場景（寢室的牆、兩邊下舖、迷你麻將桌）和自己的燈，打牌時 src/core/GameLoop.js 改畫這個場景
// （跟 src/systems/quests/WulingFilm.js 一樣，主場景的燈數不變，不會讓材質重新編譯）。
// 144 張牌都是真的 3D 方塊：正面用 canvas 畫的牌面圖集（萬筒條字花），背面綠色、側面一半象牙白一半綠。
// 每一步之後重新排一次每張牌該在的位置（牌牆、手牌、吃碰槓、花、海底），牌自己滑過去，所以摸牌、打牌、吃碰都有動作。
// 上桌的 NPC 是他們本人的角色模型（src/systems/mahjong/Mahjong.js 的 hold() 交過來），坐在桌邊打字姿勢摸牌。
// 鏡頭是彥霖坐在靠門那個位置往桌面看。操作：
//   鍵盤 ←→／A D 選牌、Enter／空白／E 打出；H 胡（自摸）、P 碰、C 吃（多種吃法用 1 2 3）、K 槓、X 過；Esc 連按兩次離開
//   滑鼠：指到的牌會浮起來，點一下打出；觸控：點一下選、再點一次打出；按鈕也可以直接點
//   搖桿：十字鍵選牌、A 打出、Y 胡、X 碰、LB 吃、RB 槓、B 過、Start 離開（src/core/Input.js 的 mahjong 配置）
import * as THREE from 'three';
import {
  tileName,
  isFlower,
  WINDS,
  sortTiles,
  meldTiles,
  STAKES,
  stackAt,
  countSeat,
  diceSum,
  SEAT_REL,
} from './Rules.js';
import { DiceSet } from './Dice.js';
import { normalizeRoomCode } from './Net.js';
import { SPECTATE_REACTS } from './P2P.js';
import { createCharacter, randomStudent } from '../../entities/Character.js';

const SPEC_SPOTS = [
  { x: -0.58, y: -0.1, z: -0.84, mode: 'stand', headY: 1.48 },
  { x: 0.58, y: -0.1, z: -0.84, mode: 'stand', headY: 1.48 },
  { x: -0.86, y: 0, z: -0.54, mode: 'sit', headY: 1.18 },
  { x: 0.86, y: 0, z: -0.54, mode: 'sit', headY: 1.18 },
  { x: -0.32, y: -0.08, z: -1.14, mode: 'stand', headY: 1.5 },
  { x: 0.32, y: -0.08, z: -1.14, mode: 'stand', headY: 1.5 },
];

function specRng(str) {
  let s = 2166136261 >>> 0;
  const key = String(str || 'spec');
  for (let i = 0; i < key.length; i++) {
    s ^= key.charCodeAt(i);
    s = Math.imul(s, 16777619) >>> 0;
  }
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const TW = 0.03, // tile width, height, thickness (m)
  TH = 0.04,
  TD = 0.022,
  Y0 = 0.72, // felt
  HALF = 0.47; // half the table
const DISC = 0.072, // the discards: how far in from the centre each player's block starts (see _layout)
  DROW = 7, // tiles a row
  GAP = 0.003;
const COLS = 8,
  ROWS = 6,
  CW = 128,
  CH = 170;
const BACK_CELL = 42,
  SIDE_CELL = 43;
const FWD = [
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(1, 0, 0),
];
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = FWD.map((f) => f.clone().cross(UP));

// ---------------- the tile faces ----------------
const PIN = {
  1: [[0.5, 0.5]],
  2: [
    [0.5, 0.27],
    [0.5, 0.73],
  ],
  3: [
    [0.25, 0.22],
    [0.5, 0.5],
    [0.75, 0.78],
  ],
  4: [
    [0.3, 0.28],
    [0.7, 0.28],
    [0.3, 0.72],
    [0.7, 0.72],
  ],
  5: [
    [0.28, 0.24],
    [0.72, 0.24],
    [0.5, 0.5],
    [0.28, 0.76],
    [0.72, 0.76],
  ],
  6: [
    [0.3, 0.2],
    [0.7, 0.2],
    [0.3, 0.5],
    [0.7, 0.5],
    [0.3, 0.8],
    [0.7, 0.8],
  ],
  7: [
    [0.22, 0.15],
    [0.5, 0.24],
    [0.78, 0.33],
    [0.3, 0.6],
    [0.7, 0.6],
    [0.3, 0.84],
    [0.7, 0.84],
  ],
  8: [
    [0.3, 0.14],
    [0.7, 0.14],
    [0.3, 0.38],
    [0.7, 0.38],
    [0.3, 0.62],
    [0.7, 0.62],
    [0.3, 0.86],
    [0.7, 0.86],
  ],
  9: [
    [0.2, 0.18],
    [0.5, 0.18],
    [0.8, 0.18],
    [0.2, 0.5],
    [0.5, 0.5],
    [0.8, 0.5],
    [0.2, 0.82],
    [0.5, 0.82],
    [0.8, 0.82],
  ],
};
const PIN_COL = ['#1d5fa8', '#1f8a4c', '#c8272d'];
function drawFace(c, k, x, y) {
  const font = (w, px) => `${w} ${px}px "Noto Serif TC","Songti TC","PMingLiU",serif`;
  c.save();
  c.translate(x, y);
  c.fillStyle = '#f6f1e2';
  c.fillRect(0, 0, CW, CH);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (k === BACK_CELL) {
    c.fillStyle = '#1e7a4a';
    c.fillRect(0, 0, CW, CH);
  } else if (k === SIDE_CELL) {
    c.fillStyle = '#1e7a4a';
    c.fillRect(0, 0, CW * 0.42, CH);
  } else if (isFlower(k)) {
    const f = k - 34;
    c.fillStyle = f < 4 ? '#c8272d' : '#1d5fa8';
    c.font = font(900, 78);
    c.fillText(tileName(k), CW / 2, CH * 0.55);
    c.font = font(700, 30);
    c.fillStyle = '#1f8a4c';
    c.fillText(String((f % 4) + 1), 22, 24);
  } else if (k >= 27) {
    const ch = tileName(k);
    if (k === 33) {
      c.strokeStyle = '#1d5fa8';
      c.lineWidth = 8;
      c.strokeRect(24, 30, CW - 48, CH - 60);
    } else {
      c.fillStyle = k === 31 ? '#c8272d' : k === 32 ? '#1f8a4c' : '#1b1b1b';
      c.font = font(900, 92);
      c.fillText(ch, CW / 2, CH / 2 + 4);
    }
  } else {
    const n = (k % 9) + 1,
      s = Math.floor(k / 9);
    if (s === 0) {
      c.fillStyle = '#1b1b1b';
      c.font = font(900, 64);
      c.fillText('一二三四五六七八九'[n - 1], CW / 2, CH * 0.3);
      c.fillStyle = '#c8272d';
      c.font = font(900, 70);
      c.fillText('萬', CW / 2, CH * 0.72);
    } else if (s === 1) {
      const r = n === 1 ? 40 : n <= 4 ? 22 : n <= 6 ? 18 : 15;
      PIN[n].forEach(([px, py], i) => {
        const cx = 14 + px * (CW - 28),
          cy = 16 + py * (CH - 32);
        c.fillStyle = PIN_COL[(i + n) % 3];
        c.beginPath();
        c.arc(cx, cy, r, 0, 7);
        c.fill();
        c.fillStyle = '#f6f1e2';
        c.beginPath();
        c.arc(cx, cy, r * 0.62, 0, 7);
        c.fill();
        c.fillStyle = PIN_COL[(i + n + 1) % 3];
        c.beginPath();
        c.arc(cx, cy, r * 0.3, 0, 7);
        c.fill();
      });
    } else if (n === 1) {
      // 一條: a little green bird
      c.fillStyle = '#1f8a4c';
      c.beginPath();
      c.ellipse(CW / 2, CH * 0.58, 30, 40, 0, 0, 7);
      c.fill();
      c.beginPath();
      c.arc(CW / 2, CH * 0.3, 18, 0, 7);
      c.fill();
      c.fillStyle = '#c8272d';
      c.beginPath();
      c.moveTo(CW / 2 + 14, CH * 0.3);
      c.lineTo(CW / 2 + 32, CH * 0.33);
      c.lineTo(CW / 2 + 14, CH * 0.36);
      c.fill();
      c.fillRect(CW / 2 - 6, CH * 0.12, 12, 18);
      c.fillStyle = '#1d5fa8';
      c.beginPath();
      c.moveTo(CW / 2 - 26, CH * 0.85);
      c.lineTo(CW / 2, CH * 0.72);
      c.lineTo(CW / 2 + 26, CH * 0.85);
      c.fill();
    } else if (n === 8) {
      // 八條: a "W" on top and an "M" below (outer legs upright), made of 8 sticks drawn just like the other 條 —
      // green, a dark knot at each end, a light line down the middle — a little short of each corner so each reads as one stick
      const shapes = [
        [
          [22, 16],
          [22, 76],
          [64, 34],
          [106, 76],
          [106, 16],
        ],
        [
          [22, 154],
          [22, 94],
          [64, 136],
          [106, 94],
          [106, 154],
        ],
      ];
      for (const pts of shapes)
        for (let i = 0; i + 1 < pts.length; i++) {
          const [x1, y1] = pts[i],
            [x2, y2] = pts[i + 1];
          const L = Math.hypot(x2 - x1, y2 - y1) - 8;
          c.save();
          c.translate((x1 + x2) / 2, (y1 + y2) / 2);
          c.rotate(Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2);
          c.fillStyle = '#1f8a4c';
          c.fillRect(-6, -L / 2, 12, L);
          c.fillStyle = '#155f34';
          c.fillRect(-8, -L / 2, 16, 5); // knots
          c.fillRect(-8, L / 2 - 5, 16, 5);
          c.fillStyle = 'rgba(255,255,255,0.45)';
          c.fillRect(-1, -L / 2 + 7, 2, L - 14); // the light line
          c.restore();
        }
    } else {
      // sticks laid out like the real tiles: 二條 one above the other, 三條 one over two, 四條 2+2, 五條 2+1+2,
      // 六條 3+3, 七條 1+3+3, 九條 3+3+3. Each stick is one short bamboo piece (knots at both ends, no band across
      // the middle, so two sticks never read as four)
      const rows = {
        2: [1, 1],
        3: [1, 2],
        4: [2, 2],
        5: [2, 1, 2],
        6: [3, 3],
        7: [1, 3, 3],
        9: [3, 3, 3],
      }[n];
      const rh = (CH - 30) / rows.length,
        L = Math.min(rh * 0.78, 50);
      rows.forEach((m, ri) => {
        for (let j = 0; j < m; j++) {
          const cx = CW / 2 + (j - (m - 1) / 2) * 32,
            cy = 15 + rh * ri + rh / 2;
          const red = (n === 7 && ri === 0) || (n === 5 && ri === 1) || (n === 9 && j === 1);
          c.fillStyle = red ? '#c8272d' : '#1f8a4c';
          c.fillRect(cx - 6, cy - L / 2, 12, L);
          c.fillStyle = red ? '#8e1a1f' : '#155f34';
          c.fillRect(cx - 8, cy - L / 2, 16, 5); // knots
          c.fillRect(cx - 8, cy + L / 2 - 5, 16, 5);
          c.fillStyle = 'rgba(255,255,255,0.45)';
          c.fillRect(cx - 1, cy - L / 2 + 7, 2, L - 14); // a light line down the stick
        }
      });
    }
  }
  c.restore();
}
function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = COLS * CW;
  cv.height = ROWS * CH;
  const c = cv.getContext('2d');
  for (let k = 0; k < 44; k++) drawFace(c, k, (k % COLS) * CW, Math.floor(k / COLS) * CH);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const cellUV = (k, u, v) => {
  const col = k % COLS,
    row = Math.floor(k / COLS);
  return [(col + u) / COLS, 1 - (row + 1 - v) / ROWS];
};
// a box whose front (+z) shows kind k, back green, sides ivory with the green back layer
function tileGeometry(k) {
  const g = new THREE.BoxGeometry(TW, TH, TD);
  const pos = g.attributes.position,
    nor = g.attributes.normal,
    uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nz = nor.getZ(i);
    let p;
    if (nz > 0.5) p = cellUV(k, pos.getX(i) / TW + 0.5, pos.getY(i) / TH + 0.5);
    else if (nz < -0.5) p = cellUV(BACK_CELL, 0.5, 0.5);
    else p = cellUV(SIDE_CELL, Math.min(0.98, Math.max(0.02, pos.getZ(i) / TD + 0.5)), 0.5);
    uv.setXY(i, p[0], p[1]);
  }
  return g;
}

// ---------------- the room ----------------
function buildSet(atlas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2724');
  scene.add(new THREE.HemisphereLight('#fff5e6', '#3b342c', 1.6));
  const lamp = new THREE.DirectionalLight('#fff1dc', 2.2);
  lamp.position.set(0.4, 3, 0.6);
  scene.add(lamp);
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
  const box = (w, h, d, x, y, z, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    scene.add(b);
    return b;
  };
  // floor, walls (the window behind the far seat), ceiling light
  box(3.4, 0.02, 4.4, 0, -0.01, 0, M('#cfd1cf'));
  box(0.05, 2.8, 4.4, -1.68, 1.4, 0, M('#efede6'));
  box(0.05, 2.8, 4.4, 1.68, 1.4, 0, M('#efede6'));
  box(3.4, 2.8, 0.05, 0, 1.4, -1.6, M('#efede6'));
  box(3.4, 2.8, 0.05, 0, 1.4, 2.2, M('#efede6'));
  box(
    1.9,
    1.15,
    0.02,
    0,
    1.6,
    -1.57,
    M('#9fc3dc', { emissive: '#2a4a66', emissiveIntensity: 0.6 })
  );
  box(1.2, 0.04, 0.12, 0, 2.75, 0, M('#ffffff', { emissive: '#fff6e2', emissiveIntensity: 1.2 }));
  // the two lower bunks the side players sit on (3 號床、6 號床) with the upper bunks above
  const wood = M('#c49a6c'),
    mat = M('#d9dde2'),
    frame = M('#9a9b9c', { metalness: 0.3 });
  for (const s of [-1, 1]) {
    const x = s * 1.18;
    box(0.95, 0.3, 2.0, x, 0.15, -0.2, wood);
    box(0.89, 0.12, 1.9, x, 0.36, -0.2, mat);
    box(0.95, 0.05, 2.0, x, 1.72, -0.2, frame);
    box(0.89, 0.12, 1.9, x, 1.8, -0.2, mat);
    for (const z of [-1.18, 0.78]) box(0.04, 2.15, 0.04, x - s * 0.45, 1.07, z, frame);
  }
  // the table: wooden frame, green felt, steel legs; two orange stools (near / far)
  const felt = M('#2f7a4b', { roughness: 0.95 });
  box(HALF * 2 + 0.04, 0.04, HALF * 2 + 0.04, 0, Y0 - 0.025, 0, M('#e4dfd4'));
  box(HALF * 2 - 0.02, 0.006, HALF * 2 - 0.02, 0, Y0 - 0.003, 0, felt);
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      box(
        0.03,
        Y0 - 0.04,
        0.03,
        a * (HALF - 0.05),
        (Y0 - 0.04) / 2,
        b * (HALF - 0.05),
        M('#b4b8bc', { metalness: 0.7, roughness: 0.3 })
      );
  const orange = M('#e0622f');
  for (const z of [-0.78, 0.78]) {
    box(0.34, 0.03, 0.34, 0, 0.43, z, orange);
    for (const a of [-1, 1])
      for (const b of [-1, 1]) box(0.025, 0.42, 0.025, a * 0.13, 0.21, z + b * 0.13, orange);
  }
  // a marker over the last discard
  const mark = new THREE.Mesh(
    new THREE.ConeGeometry(0.008, 0.02, 10),
    M('#ff3b30', { emissive: '#ff3b30', emissiveIntensity: 0.8 })
  );
  mark.rotation.x = Math.PI;
  scene.add(mark);
  // a green one over the tile you just drew
  const newMark = new THREE.Mesh(
    new THREE.ConeGeometry(0.007, 0.018, 10),
    M('#34c759', { emissive: '#34c759', emissiveIntensity: 0.8 })
  );
  newMark.rotation.x = Math.PI;
  newMark.visible = false;
  scene.add(newMark);
  const tileMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.35 });
  return { scene, mark, newMark, tileMat };
}

// world transform of a slot: seat s, u along the seat's right, d from the centre towards the seat; how: 'stand' | 'up' | 'down' | 'mine'
const _x = new THREE.Vector3(),
  _y = new THREE.Vector3(),
  _z = new THREE.Vector3(),
  _m = new THREE.Matrix4();
function slot(s, u, d, how, lift = 0) {
  const F = FWD[s],
    R = RIGHT[s];
  const p = new THREE.Vector3().addScaledVector(F, -d).addScaledVector(R, u);
  if (how === 'stand') {
    _z.copy(F).negate();
    _y.copy(UP);
    p.y = Y0 + TH / 2 + lift;
  } else if (how === 'mine') {
    const a = 0.42; // leaning back towards you
    _z.copy(F).negate().multiplyScalar(Math.cos(a)).addScaledVector(UP, Math.sin(a));
    _y.copy(UP).multiplyScalar(Math.cos(a)).addScaledVector(F, Math.sin(a));
    p.y = Y0 + TH / 2 + lift;
  } else {
    _z.copy(UP).multiplyScalar(how === 'up' ? 1 : -1);
    _y.copy(F);
    p.y = Y0 + TD / 2 + lift;
  }
  _x.copy(_y).cross(_z);
  const q = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  return { p, q };
}
// stack si (0 = that player's left … 17 = right) of seat ws's wall
const wallSlot = (ws, si, lift = 0) => slot(ws, -0.25 + TW / 2 + si * TW, 0.29, 'down', lift);

export class MahjongScene {
  constructor(game, mj) {
    this.g = game;
    this.mj = mj;
    this.active = false;
    this.set = null;
  }
  _build() {
    const atlas = buildAtlas();
    this.set = buildSet(atlas);
    this.cam = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.05, 30);
    this.geos = [];
    for (let k = 0; k < 42; k++) this.geos[k] = tileGeometry(k);
    this.tiles = [];
    this.pool = [];
    for (let k = 0; k < 42; k++) {
      this.pool[k] = [];
      for (let i = 0; i < (k < 34 ? 4 : 1); i++) {
        const m = new THREE.Mesh(this.geos[k], this.set.tileMat);
        m.userData.k = k;
        m.visible = false;
        this.set.scene.add(m);
        this.pool[k].push(m);
        this.tiles.push(m);
      }
    }
    this.dice = new DiceSet(this.set.scene, Y0);
    this.ray = new THREE.Raycaster();
    this._ui();
  }
  // the overlay: info bar, name tags, the buttons, the hint line, the result panel
  _ui() {
    const el = (this.ui = document.createElement('div'));
    el.id = 'mjUI';
    el.className = 'hidden';
    el.innerHTML = `<div class="mj-top"></div><div class="mj-tags">${'<div class="mj-tag"></div>'.repeat(4)}</div>
      <div class="mj-spec-tags"></div><div class="mj-bubbles"></div>
      <div class="mj-acts"></div><div class="mj-hint"></div><div class="mj-res hidden"></div>
      <div class="mj-pop hidden"><img alt=""><b></b></div><div class="mj-say"></div><div class="mj-wait hidden"></div><div class="mj-timer hidden"></div>
      <div class="mj-side"><div class="mj-info"></div><button class="mj-view" data-a='{"type":"view"}'></button><div class="mj-mp-bar hidden"></div></div>`;
    document.body.appendChild(el);
    this.$ = (s) => el.querySelector(s);
    this.tagEls = [...el.querySelectorAll('.mj-tag')];
    this.pop = { el: el.querySelector('.mj-pop'), until: 0 };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-a]');
      if (!b) return;
      e.stopPropagation();
      this._do(JSON.parse(b.dataset.a));
    });
    const cv = this.g.renderer.domElement;
    this._move = (e) => {
      if (!this.active) return;
      const t = this._pick(e);
      if (t != null && e.pointerType === 'mouse') this.sel = t;
    };
    this._down = (e) => {
      if (!this.active || e.target !== cv) return;
      if (this.intro) return this._introGo(); // a click throws the dice / skips the animation
      const t = this._pick(e);
      if (t == null) return;
      if (e.pointerType === 'mouse' || this.sel === t) this._discard(t);
      else this.sel = t;
    };
    addEventListener('pointermove', this._move);
    addEventListener('pointerdown', this._down);
  }
  // which of your concealed tiles is under the pointer (index into this.mine)
  _pick(e) {
    if (!this.mine?.length) return null;
    const r = this.g.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      ),
      this.cam
    );
    const hit = this.ray.intersectObjects(this.mine.map((x) => x.mesh))[0];
    return hit ? this.mine.findIndex((x) => x.mesh === hit.object) : null;
  }

  open(names) {
    if (!this.set) this._build();
    this.names = names;
    this.active = true;
    this.ui.classList.remove('hidden');
    document.body.classList.add('mahjong');
    this.g.player.frozen = true;
  }
  close() {
    this.active = false;
    this.e = null;
    this.choosing = null;
    this.menu = null;
    this.lobby = null;
    this.intro = null;
    this.dice?.hide();
    this._say('');
    this.ui.classList.add('hidden');
    this.$('.mj-res').classList.add('hidden');
    this.$('.mj-wait').classList.add('hidden');
    this._waitKey = '';
    this.$('.mj-timer').classList.add('hidden');
    this._timerKey = '';
    this.$('.mj-info').innerHTML = this._info = '';
    const mpBar = this.$('.mj-mp-bar');
    if (mpBar) {
      mpBar.classList.add('hidden');
      mpBar.innerHTML = '';
    }
    this._mpBar = '';
    this._clearSpectators();
    this._clearBubbles();
    this._hidePop();
    document.body.classList.remove('mahjong');
    for (const m of this.tiles) m.visible = false;
    if (!this.g.input.touch) this.g.lockPointer?.();
  }
  // an NPC's figure at seat s (called from its own update while it is in the game)
  place(s, ch, dt) {
    if (ch.root.parent !== this.set.scene) this.set.scene.add(ch.root);
    const p = new THREE.Vector3().addScaledVector(FWD[s], -0.78);
    ch.root.visible = true;
    ch.root.position.set(p.x, 0, p.z);
    ch.root.rotation.y = Math.atan2(-p.x, -p.z);
    ch.setDetail?.(true);
    const busy = this.e && this.e.turn === s && this.t > 0;
    ch.update(dt, {
      speed: 0,
      mode: 'sit',
      pose: busy || Math.sin(this.g.time * 0.7 + s) > 0.2 ? 'type' : null,
    });
  }

  startHand(engine) {
    this.e = engine;
    // every move the engine makes (yours too) goes past _onEvent: a discard or a call pops up big
    const emit = engine.emit.bind(engine);
    engine.emit = (ev) => {
      emit(ev);
      this._onEvent(ev);
    };
    this._hidePop();
    this.t = 0.6;
    this.sel = 0;
    this.result = null;
    this.escAt = -9;
    this.$('.mj-res').classList.add('hidden');
    // fresh tiles: everything on the wall, face down
    for (const m of this.tiles) {
      m.visible = true;
      m.userData.fresh = true;
    }
    this._layout(true);
  }

  // ---------------- every frame ----------------
  update(dt, inp) {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (!typing && inp.hit('KeyV')) this._toggleView();
    this._viewBtn();
    if (this.menu || this.lobby) return this._menuKeys(inp, typing);
    if (this.choosing) return this._stakeKeys(inp);
    if (this.intro) {
      this._introUpdate(dt, inp);
      this._glide(dt);
      return this._introHud();
    }
    const e = this.e;
    if (!e) return;
    this._keys(inp);
    if (!this.result && !e.isRemote) {
      // 多人房主：限時 20 秒到了的人替他出牌／過（單人模式不限時，這裡什麼都不做）
      this.mj.tickTurnTimers?.();
      this.t -= dt;
      let guard = 0;
      while (this.t <= 0 && !e.pending && e.phase !== 'end' && guard++ < 6) {
        e.events.length = 0;
        e.step();
        this.mj.onHostStep?.([...e.events]);
        this.t += this._pace(e.events);
        this._layout();
      }
      if (e.phase === 'end' && this.t <= 0) this._showResult();
    }
    this._glide(dt);
    this._syncSpectators(dt);
    // your turn just started: the tile you drew is the one picked (摸打 is one key away)
    const myTurn = e.pending?.seat === 0 && e.pending.kind === 'turn';
    if (myTurn && !this._myTurn) {
      const d = this.mine?.findIndex((x) => x.drawn);
      if (d >= 0) this.sel = d;
    }
    this._myTurn = myTurn;
    const dm = myTurn && this.mine?.find((x) => x.drawn);
    this.set.newMark.visible = !!dm;
    if (dm) {
      this.set.newMark.position.copy(dm.mesh.position);
      this.set.newMark.position.y += TH / 2 + 0.03 + Math.sin(this.g.time * 5) * 0.003;
    }
    // your hand: the chosen tile pops up
    if (this.mine) {
      this.sel = Math.max(0, Math.min(this.mine.length - 1, this.sel));
      this.mine.forEach((x, i) => {
        const T = x.mesh.userData.to;
        T.p.y = Y0 + TH / 2 + (i === this.sel && e.pending?.kind === 'turn' ? 0.012 : 0);
      });
    }
    const L = e.last;
    this.set.mark.visible = !!L && e.phase === 'claim';
    if (this.set.mark.visible && this.lastMesh) {
      this.set.mark.position.copy(this.lastMesh.position);
      this.set.mark.position.y += 0.03 + Math.sin(this.g.time * 5) * 0.004;
    }
    this._hud();
  }
  // tiles glide to where they belong
  _glide(dt) {
    const k = Math.min(1, dt * 14);
    for (const m of this.tiles) {
      const T = m.userData.to;
      if (!T || !m.visible) continue;
      m.position.lerp(T.p, k);
      m.quaternion.slerp(T.q, k);
    }
  }
  _pace(ev) {
    let t = 0.05;
    for (const v of ev) {
      const human = v.seat === 0;
      t = Math.max(
        t,
        v.type === 'deal'
          ? 0.9
          : v.type === 'flower'
            ? 0.35
            : v.type === 'draw'
              ? human
                ? 0.15
                : 0.35
              : v.type === 'discard'
                ? 0.55
                : v.type === 'win' || v.type === 'exhaust'
                  ? 1.4
                  : 0.75
      );
    }
    return t;
  }
  render(renderer) {
    if (!this.active || !this.set) return;
    // the tiles are small on screen: draw the table at up to 2x the screen's pixels even when the quality setting draws
    // the campus coarser (phones: 0.8). The table is cheap; src/core/GameLoop.js puts the pixel ratio back afterwards.
    const sharp = Math.min(window.devicePixelRatio || 1, 2);
    if (renderer.getPixelRatio() < sharp) renderer.setPixelRatio(sharp);
    const c = this.cam;
    c.aspect = innerWidth / innerHeight;
    // 近看 (default): leaning over the table, your hand and the discards big; 全景 (V / the 🔍 button): the whole
    // table and the other three. Closer on a narrow screen so the hand still fits.
    const tall = c.aspect < 1.2,
      near = !this.far;
    if (c.aspect < 0.8) {
      // a phone held upright: from higher up, so the table's width fits
      c.position.set(0, near ? 1.5 : 1.62, near ? 0.56 : 0.62);
      c.fov = near ? 74 : 76;
      c.lookAt(0, Y0, near ? 0.1 : 0.06);
    } else if (near) {
      c.position.set(0, tall ? 1.4 : 1.3, tall ? 0.96 : 0.86);
      c.fov = tall ? 54 : 46;
      c.lookAt(0, Y0, tall ? 0.06 : 0.1);
    } else {
      c.position.set(0, tall ? 1.6 : 1.42, tall ? 1.05 : 1.02);
      c.fov = tall ? 60 : 52;
      c.lookAt(0, Y0 + 0.02, tall ? -0.06 : -0.12);
    }
    c.updateProjectionMatrix();
    renderer.render(this.set.scene, c);
  }

  // ---------------- where every tile goes ----------------
  _layout(snap = false) {
    const e = this.e,
      want = []; // { k, at }
    const put = (k, at, tag) => want.push({ k, at, tag });
    const done = e.phase === 'end';
    for (let s = 0; s < 4; s++) {
      const P = e.players[s];
      // concealed hand in order; the tile just drawn waits on the right, one tile's width apart, until a tile is
      // discarded (then the hand is sorted again with it)
      const hand = sortTiles(P.hand);
      let drawn = -1;
      if (e.turn === s && e.justDrew && e.phase === 'turn' && hand.includes(e.drawn)) {
        hand.splice(hand.indexOf(e.drawn), 1);
        hand.push(e.drawn);
        drawn = hand.length - 1;
      }
      const nMeld = P.melds.reduce((a, m) => a + (m.type === 'kong' ? 4 : 3), 0);
      const total = hand.length + nMeld + P.melds.length * 0.3 + (drawn >= 0 ? 1 : 0);
      let u = -(total * TW) / 2;
      const reveal = done || !!e.revealAll; // hand over or spectator reveal: everybody lays their tiles down
      hand.forEach((k, i) => {
        if (i === drawn) u += TW; // the gap before the drawn tile
        const how = reveal ? 'up' : e.spectate ? 'stand' : s === 0 ? 'mine' : 'stand';
        put(
          k,
          slot(s, u + TW / 2, reveal ? 0.38 : 0.4, how),
          !e.spectate && s === 0 ? (i === drawn ? 'drawn' : 'mine') : null
        );
        u += TW;
      });
      // melds, face up (closed kongs face down) to the right; a 吃 has the tile taken in the middle
      for (const m of P.melds) {
        u += TW * 0.3;
        let tiles = meldTiles(m);
        if (m.type === 'chow' && m.take != null) {
          const rest = tiles.filter((x) => x !== m.take);
          tiles = [rest[0], m.take, rest[1]];
        }
        tiles.forEach((k, j) => {
          const down = m.closed && (j === 0 || j === 3);
          put(k, slot(s, u + TW / 2, 0.39, down ? 'down' : 'up'));
          u += TW;
        });
      }
      // flowers in a row between the wall and the hand
      P.flowers.forEach((k, i) => put(k, slot(s, -0.27 + i * TW, 0.335, 'up')));
      // discards: rows of 7 in front of each player, a little apart so each face reads. The four blocks go round
      // the middle like a pinwheel (each starts DISC in from the centre on its left and DISC out from the centre),
      // so two players' discards never meet at a corner
      P.discards.forEach((k, i) => {
        const r = Math.floor(i / DROW),
          c = i % DROW;
        put(
          k,
          slot(s, -DISC + TW / 2 + c * (TW + GAP), DISC + TH / 2 + r * (TH + GAP), 'up'),
          i === P.discards.length - 1 && e.last?.from === s ? 'last' : null
        );
      });
    }
    // the wall: 4 × 18 stacks of 2, face down; slot j of what's left is e.wall[j] (front = next draw). Stack 0 is
    // the one after the 開門 count (Rules.js stackAt); drawing goes clockwise from there, the 牌尾 the other way.
    const N = 144,
      head = e.headTaken,
      tail = e.tailTaken;
    let j = 0;
    for (let i = head; i < N - tail; i++) {
      const top = i % 2 === 0 && i + 1 < N - tail; // the lower tile stays on the table when the top one is gone
      const { seat: ws, si } = stackAt(e.cut, Math.floor(i / 2));
      put(e.wall[j++], wallSlot(ws, si, top ? TD : 0));
    }
    // match each wanted spot with a tile of that kind (the nearest one, so equal tiles don't swap places)
    const free = this.pool.map((a) => [...a]);
    this.mine = [];
    this.lastMesh = null;
    for (const w of want) {
      const list = free[w.k];
      if (!list?.length) continue;
      let bi = 0,
        bd = Infinity;
      list.forEach((m, i) => {
        const d = m.userData.fresh ? 0 : m.position.distanceToSquared(w.at.p);
        if (d < bd) ((bd = d), (bi = i));
      });
      const m = list.splice(bi, 1)[0];
      m.userData.to = w.at;
      if (snap || m.userData.fresh) {
        m.position.copy(w.at.p);
        m.quaternion.copy(w.at.q);
        m.userData.fresh = false;
      }
      m.visible = true;
      if (w.tag === 'mine' || w.tag === 'drawn')
        this.mine.push({ mesh: m, k: w.k, drawn: w.tag === 'drawn' });
      if (w.tag === 'last') this.lastMesh = m;
    }
    for (const list of free) for (const m of list) m.visible = false;
  }

  // ---------------- your moves ----------------
  // what you may do now; mine = the tiles of your hand it uses, inc = the tile it takes (drawn on the button)
  _options() {
    const e = this.e,
      p = e?.pending;
    if (!p || p.seat !== 0) return [];
    const out = [];
    if (p.kind === 'turn') {
      if (p.options.tsumo)
        out.push({ type: 'tsumo', label: '自摸！', key: 'H', mine: [], inc: e.drawn });
      for (const k of p.options.kongs)
        out.push({
          type: 'kong',
          t: k.t,
          label: k.kind === 'added' ? '加槓' : '暗槓',
          key: 'K',
          mine: k.kind === 'added' ? [k.t, k.t, k.t] : [k.t, k.t, k.t, k.t],
          inc: k.kind === 'added' ? k.t : null,
        });
    } else {
      const t = e.last.t;
      for (const o of p.options) {
        if (o.type === 'hu') out.push({ ...o, label: '胡！', key: 'H', mine: [], inc: t });
        else if (o.type === 'pon') out.push({ ...o, label: '碰', key: 'P', mine: [t, t], inc: t });
        else if (o.type === 'kong')
          out.push({ ...o, label: '槓', key: 'K', mine: [t, t, t], inc: t });
      }
      const chis = p.options.filter((o) => o.type === 'chi');
      chis.forEach((o, i) => {
        const mine = [o.t, o.t + 1, o.t + 2];
        mine.splice(mine.indexOf(t), 1);
        out.push({ ...o, label: '吃', key: chis.length > 1 ? String(i + 1) : 'C', mine, inc: t });
      });
      out.push({ type: 'pass', label: '過', key: 'X' });
    }
    return out;
  }
  _do(a) {
    if (a.type === 'mode') return this.mj.pickMode(a.v);
    if (a.type === 'closeMenu') return this.mj.closeMenu();
    if (a.type === 'backMode') return this.chooseMode();
    if (a.type === 'mpStake') {
      if (this.menu?.kind === 'multi') {
        this.menu.stake = a.i;
        this.menu.nick = this.$('#mjNick')?.value ?? this.menu.nick;
        this.menu.code = this.$('#mjCode')?.value ?? this.menu.code;
        this._multiPanel();
      }
      return;
    }
    if (a.type === 'mpToggleReveal') {
      if (this.menu?.kind === 'multi') {
        this.menu.spectateReveal = !this.menu.spectateReveal;
        this.menu.nick = this.$('#mjNick')?.value ?? this.menu.nick;
        this.menu.code = this.$('#mjCode')?.value ?? this.menu.code;
        this._multiPanel();
      } else if (this.mj.mpMode === 'host') {
        this.mj.toggleSpectateReveal();
      }
      return;
    }
    if (a.type === 'mpHost') {
      const nick = this.$('#mjNick')?.value || this.menu?.nick || '彥霖';
      return this.mj.hostRoom(nick, this.menu?.stake || 0, undefined, {
        spectateReveal: this.menu?.spectateReveal !== false,
      });
    }
    if (a.type === 'mpJoin') {
      const nick = this.$('#mjNick')?.value || this.menu?.nick || '朋友';
      const code = this.$('#mjCode')?.value || '';
      return this.mj.joinRoom(code, nick);
    }
    if (a.type === 'mpSpectate') {
      const nick = this.$('#mjNick')?.value || this.menu?.nick || '朋友';
      const code = this.$('#mjCode')?.value || '';
      return this.mj.joinRoom(code, nick, undefined, { spectateOnly: true });
    }
    if (a.type === 'specView') return this.mj.cycleSpectatorView(a.dir || 1);
    if (a.type === 'specToggleQueue') {
      this.mj.setGuestWantSeat(!this.mj.sess?.wantSeat);
      if (this.result && this.e?.result) this._showResultPanelOnly?.();
      return;
    }
    if (a.type === 'lobbyToggleQueue') {
      return this.mj.setGuestWantSeat(!this.lobby?.wantSeat);
    }
    if (a.type === 'mpReact') {
      return this.mj.sendReaction(a.text);
    }
    if (a.type === 'mpCopy') {
      const code = this.lobby?.code || '';
      if (!code) return;
      navigator.clipboard?.writeText(code).catch(() => {});
      this.g.hud.toast(`📋 已複製房號 ${code}`, 'good', 2000);
      return;
    }
    if (a.type === 'mpStart') return this.mj.startMultiHost();
    if (a.type === 'spectateNext') return this.mj.spectateNext();
    if (a.type === 'next') return this.mj.next();
    if (a.type === 'stake') return this._pickStake(a.i);
    if (a.type === 'view') return this._toggleView();
    if (a.type === 'leave') return this.mj.leave();
    if (a.type === 'go') return this._introGo();
    const e = this.e;
    if (!e?.pending) return;
    const { label: _l, key: _k, mine: _m, inc: _i, ...act } = a;
    if (!e.isRemote) e.events.length = 0;
    if (e.decide(act)) {
      if (!e.isRemote) this.mj.onHostStep?.([...e.events]);
      this.t = 0.15;
      this._layout();
    }
  }
  _discard(i) {
    const e = this.e;
    if (e?.pending?.kind !== 'turn' || !this.mine[i]) return;
    if (!e.isRemote) e.events.length = 0;
    if (e.decide({ type: 'discard', t: this.mine[i].k })) {
      if (!e.isRemote) this.mj.onHostStep?.([...e.events]);
      this.t = 0.3;
      this._layout();
    }
  }
  _keys(inp) {
    const e = this.e;
    if (inp.hit('Escape')) {
      const now = performance.now() / 1000;
      if (this.result) return this.mj.leave();
      if (now - this.escAt < 3) return this.mj.leave(true); // in the middle of a hand: 舍監來查寢
      this.escAt = now;
      this.g.hud.toast('再按一次 Esc 離開牌桌（這一局不算）', 'bad', 1800);
      return;
    }
    // 觀戰者：← → 換看別家的視角
    if (this.mj.isGuest && this.mj.sess?.spectating) {
      if (inp.hit('ArrowLeft', 'KeyA')) this.mj.cycleSpectatorView(-1);
      if (inp.hit('ArrowRight', 'KeyD')) this.mj.cycleSpectatorView(1);
    }
    if (this.result) {
      if (!this.mj.isGuest && inp.hit('Enter', 'NumpadEnter', 'Space', 'KeyE'))
        this._do({
          type: this.resSpectate ? 'spectateNext' : this.resNext ? 'next' : 'leave',
        });
      return;
    }
    const p = e.pending;
    if (!p || p.seat !== 0) return;
    const opts = this._options();
    const by = (key) => opts.find((o) => o.key === key);
    for (const [code, key] of [
      ['KeyH', 'H'],
      ['KeyP', 'P'],
      ['KeyK', 'K'],
      ['KeyC', 'C'],
      ['Digit1', '1'],
      ['Digit2', '2'],
      ['Digit3', '3'],
    ])
      if (inp.hit(code) && by(key)) return this._do(by(key));
    if (p.kind === 'claim') {
      if (inp.hit('KeyX', 'Backspace', 'Space') && by('X')) this._do(by('X'));
      if (inp.hit('KeyC') && by('1')) this._do(by('1'));
      return;
    }
    if (inp.hit('ArrowLeft', 'KeyA')) this.sel--;
    if (inp.hit('ArrowRight', 'KeyD')) this.sel++;
    if (inp.hit('Enter', 'NumpadEnter', 'Space', 'KeyE')) this._discard(this.sel);
  }

  // ---------------- the overlay ----------------
  _hud() {
    const e = this.e,
      g = this.g;
    this._popTick();
    const seatName = (s) => this.names[s];
    // 多人限時倒數（房主算的；單人模式是空的）：每個在等的座位還剩幾秒
    const now = Date.now();
    const secs = [null, null, null, null];
    let mine = null;
    if (!this.result)
      for (const d of this.mj.turnTimers?.() || []) {
        const sec = Math.max(0, Math.ceil((d.until - now) / 1000));
        secs[d.seat] = sec;
        if (d.seat === 0 && !e.spectate) mine = { sec, kind: d.kind };
      }
    // (the info card has it all now: the line at the top is only for 抓位／擲骰 titles)
    const topEl = this.$('.mj-top');
    if (topEl.textContent) topEl.textContent = this._top = '';
    this._infoCard();
    this._mpBarHud();
    this._tickBubbles();
    // name tags over each seat (the dealer's with a red 莊)
    const v = new THREE.Vector3();
    for (let s = 0; s < 4; s++) {
      const el = this.tagEls[s];
      this._placeTag(el, s, v);
      const html = `${s === e.dealer ? '<i class="mj-zhuang">莊</i>' : ''}${WINDS[e.seatWind(s)]}・${seatName(s)}${secs[s] != null ? ` ⏱${secs[s]}` : e.turn === s && e.phase !== 'end' ? ' ⏳' : ''}`;
      if (el.dataset.h !== html) el.innerHTML = el.dataset.h = html;
      el.classList.toggle('on', e.turn === s && e.phase !== 'end');
      el.classList.toggle('me', s === 0 && !e.spectate);
    }
    // buttons
    const opts = this._options();
    const key = JSON.stringify(opts) + (g.prompts?.pad ? 'p' : '');
    if (key !== this._actKey) {
      this._actKey = key;
      const pad = { H: 'Y', P: 'X', K: 'RB', C: 'LB', X: 'B', 1: 'LB', 2: '2', 3: '3' };
      // big buttons over your hand: the tiles you'd use + the one you'd take (orange frame), then the key and the word
      const img = (k, inc) => `<img src="${this._tileImg(k)}" class="${inc ? 'inc' : ''}" alt="">`;
      this.$('.mj-acts').innerHTML = opts
        .map((o) => {
          const tiles = o.mine
            ? `<span class="mj-tiles">${o.mine.map((k) => img(k)).join('')}${o.inc != null ? `${o.mine.length ? '<i>＋</i>' : ''}${img(o.inc, true)}` : ''}</span>`
            : '';
          return `<button data-a='${JSON.stringify(o)}' class="${o.type}">${tiles}<span class="mj-lab"><kbd>${g.prompts?.pad ? pad[o.key] || o.key : o.key}</kbd>${o.label}</span></button>`;
        })
        .join('');
    }
    // just above your hand
    if (opts.length) {
      const v = new THREE.Vector3(0, Y0 + 0.05, 0.36).project(this.cam);
      this.$('.mj-acts').style.top = `${((1 - v.y) / 2) * 100}%`;
    }
    const p = e.pending;
    const waitSeat =
      !this.result && (!p || p.seat !== 0) ? (e.isRemote ? e.waitingSeat : p?.seat) : null;
    const hint = this.result
      ? ''
      : e.spectate
        ? `👀 觀賽中${this.mj.sess?.wantSeat ? `・排隊補位 #${this.mj.sess.queuePos || 1}（下局有 AI 空位將自動上桌）` : '（純觀賽模式）'}${g.input.touch ? '・◀ ▶ 切換視角' : '・← → 切換視角'}・Esc 離開`
        : p?.seat === 0 && p.kind === 'turn'
          ? g.input.touch
            ? '點一下選牌、再點一次打出'
            : g.prompts?.pad
              ? '十字鍵選牌・A 打出'
              : '← → 選牌・Enter／空白鍵打出（滑鼠點牌直接打）・Esc 離開'
          : p?.seat === 0
            ? `${this.names[e.last.from]} 打出 ${tileName(e.last.t)}，要嗎？`
            : waitSeat != null && waitSeat !== 0
              ? `⏳ 等待 ${this.names[waitSeat]} 思考中…${secs[waitSeat] != null ? `（剩 ${secs[waitSeat]} 秒）` : ''}`
              : '';
    if (hint !== this._hint) this.$('.mj-hint').textContent = this._hint = hint;
    this._waitHud();
    this._timerHud(mine);
  }
  // 多人：輪到你出牌／要不要吃碰槓胡時，手牌右上方一顆倒數（剩 5 秒變紅）
  _timerHud(mine) {
    const el = this.$('.mj-timer');
    const key = mine ? `${mine.kind}:${mine.sec}` : '';
    if (key !== this._timerKey) {
      this._timerKey = key;
      el.innerHTML = mine
        ? `<span>⏱ <b>${mine.sec}</b> 秒</span><small>${mine.kind === 'claim' ? '沒選就算「過」' : '沒打就自動打出'}</small>`
        : '';
      el.classList.toggle('hidden', !mine);
      el.classList.toggle('urgent', !!mine && mine.sec <= 5);
    }
    if (!mine) return;
    const v = new THREE.Vector3(0.27, Y0 + 0.05, 0.36).project(this.cam);
    el.style.left = `${Math.min(99, ((v.x + 1) / 2) * 100)}%`;
    el.style.top = `${((1 - v.y) / 2) * 100}%`;
  }
  _clearSpectators() {
    if (this._specActors) {
      for (const a of this._specActors.values()) {
        if (a.ch?.root?.parent === this.set?.scene) this.set.scene.remove(a.ch.root);
        a.tagEl?.remove();
      }
      this._specActors.clear();
    }
    const box = this.$?.('.mj-spec-tags');
    if (box) box.innerHTML = '';
  }
  _clearBubbles() {
    if (this._bubbles) {
      for (const b of this._bubbles) b.el?.remove();
      this._bubbles.length = 0;
    }
    const box = this.$?.('.mj-bubbles');
    if (box) box.innerHTML = '';
  }
  _syncSpectators(dt) {
    if (!this.set?.scene || !this.cam) return;
    const list = this.mj.sess?.spectators || [];
    this._specActors ||= new Map();
    const keep = new Set();
    const tagWrap = this.$('.mj-spec-tags');

    // Sync up to SPEC_SPOTS.length 3D spectator models standing/sitting around the 277 table
    const visible = list.slice(0, SPEC_SPOTS.length);
    visible.forEach((spec, idx) => {
      const id = spec.id || spec.name;
      keep.add(id);
      let a = this._specActors.get(id);
      if (!a) {
        const ch = createCharacter({ ...randomStudent(specRng(id)), id, bag: null });
        ch.setDetail?.(true);
        this.set.scene.add(ch.root);
        const tagEl = document.createElement('div');
        tagEl.className = 'mj-spec-tag';
        tagWrap?.appendChild(tagEl);
        a = { id, ch, spotIdx: idx, tagEl };
        this._specActors.set(id, a);
      }
      a.spotIdx = idx;
      a.name = spec.name;
      a.wantSeat = !!spec.wantSeat;
      a.queuePos = spec.queuePos || 0;
    });

    for (const [id, a] of [...this._specActors.entries()]) {
      if (!keep.has(id)) {
        if (a.ch?.root?.parent === this.set.scene) this.set.scene.remove(a.ch.root);
        a.tagEl?.remove();
        this._specActors.delete(id);
      }
    }

    const e = this.e;
    const focus = e && e.phase !== 'end' ? FWD[e.turn] : null;
    const fx = focus ? -focus.x * 0.35 : 0;
    const fz = focus ? -focus.z * 0.35 : 0;
    const v = new THREE.Vector3();

    for (const a of this._specActors.values()) {
      const sp = SPEC_SPOTS[a.spotIdx];
      const sway = Math.sin(this.g.time * 1.4 + a.spotIdx * 1.9) * 0.02;
      a.ch.root.visible = true;
      a.ch.root.position.set(sp.x + sway, sp.y, sp.z);
      a.ch.root.rotation.y = Math.atan2(fx - sp.x, fz - sp.z);
      a.ch.update(dt, { speed: 0, mode: sp.mode });

      if (a.tagEl) {
        v.set(sp.x, sp.headY, sp.z).project(this.cam);
        const px = Math.max(8, Math.min(92, ((v.x + 1) / 2) * 100));
        const py = Math.max(11, Math.min(82, ((1 - v.y) / 2) * 100));
        a.tagEl.style.left = `${px}%`;
        a.tagEl.style.top = `${py}%`;
        const label = `👀 ${a.name}${a.wantSeat && a.queuePos ? ` #${a.queuePos}` : ''}`;
        if (a.tagEl.textContent !== label) a.tagEl.textContent = label;
      }
    }
  }
  showReaction(ev) {
    if (!ev?.text || !this.ui) return;
    const wrap = this.$('.mj-bubbles');
    if (!wrap) return;
    this._bubbles ||= [];
    // Replace previous bubble from the same sender so it stays clean right over their head
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      if (this._bubbles[i].fromId === ev.fromId) {
        this._bubbles[i].el.remove();
        this._bubbles.splice(i, 1);
      }
    }
    const el = document.createElement('div');
    el.className = 'mj-bubble';
    el.innerHTML = `<small>${esc(ev.name || '圍觀')}</small>${esc(ev.text)}`;
    wrap.appendChild(el);
    this._bubbles.push({
      fromId: ev.fromId || ev.name || 'spec',
      seat: ev.seat ?? null,
      el,
      born: performance.now(),
      ttl: 2800,
    });
    this._tickBubbles();
  }
  _anchorFor(fromId, seat) {
    const a = this._specActors?.get(fromId);
    if (a) {
      const sp = SPEC_SPOTS[a.spotIdx];
      return new THREE.Vector3(sp.x, sp.headY + 0.08, sp.z);
    }
    if (seat != null && seat >= 0 && seat < 4) {
      if (seat === 0) return new THREE.Vector3(-0.28, Y0 + 0.14, 0.36);
      const F = FWD[seat];
      return new THREE.Vector3(-F.x * 0.62, Y0 + 0.34, -F.z * 0.62);
    }
    // Overflow spectators (> 6): spread horizontally along the back wall based on sender id
    const r = specRng(fromId)();
    return new THREE.Vector3((r - 0.5) * 1.6, 1.48, -1.24);
  }
  _tickBubbles() {
    if (!this._bubbles?.length || !this.cam) return;
    const now = performance.now();
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i];
      const age = now - b.born;
      if (age >= b.ttl) {
        b.el.remove();
        this._bubbles.splice(i, 1);
        continue;
      }
      const p = this._anchorFor(b.fromId, b.seat).project(this.cam);
      const px = Math.max(10, Math.min(90, ((p.x + 1) / 2) * 100));
      const py = Math.max(13, Math.min(82, ((1 - p.y) / 2) * 100));
      const lift = (age / b.ttl) * 22;
      b.el.style.left = `${px}%`;
      b.el.style.top = `calc(${py}% - ${lift.toFixed(1)}px)`;
      b.el.style.opacity = age > b.ttl - 500 ? String(Math.max(0, (b.ttl - age) / 500)) : '1';
    }
  }
  _mpBarHud() {
    const bar = this.$('.mj-mp-bar');
    if (!bar) return;
    let html = '';
    const specs = this.mj.sess?.spectators || [];
    const specNames = specs
      .map((x) => `${esc(x.name)}${x.wantSeat && x.queuePos ? `#${x.queuePos}` : ''}`)
      .join('、');
    const reactRow = `<div class="mj-react-row">${SPECTATE_REACTS.map(
      (r) =>
        `<button data-a='${JSON.stringify({ type: 'mpReact', text: r.text })}'>${esc(r.text)}</button>`
    ).join('')}</div>`;
    if (this.mj.mpMode === 'host' && this.mj.mp && this.e) {
      const reveal = !!this.mj.mp.spectateReveal;
      const sc = specs.length || this.mj.mp.spectatorCount || 0;
      html = `${sc > 0 ? `<div class="mj-mp-pill">👀 圍觀（${sc}）：${specNames}</div>` : ''}
        <button data-a='{"type":"mpToggleReveal"}' class="${reveal ? 'on' : ''}">${reveal ? '👀 觀賽看牌：開' : '🙈 觀賽看牌：關'}</button>
        ${this.mj.sess?.spectating ? reactRow : ''}`;
    } else if (this.mj.isGuest && this.mj.sess?.spectating && this.e) {
      const s = this.mj.sess;
      const status = s.wantSeat ? `👀 觀賽中・排隊 #${s.queuePos || 1}` : '👀 純觀賽中';
      const eye = this.e.revealAll ? '可看手牌' : '手牌隱藏';
      html = `<div class="mj-mp-pill">${status}（${eye}）</div>
        ${specs.length > 1 ? `<div class="mj-mp-pill">圍觀：${specNames}</div>` : ''}
        ${reactRow}
        <div class="mj-spec-view"><button data-a='{"type":"specView","dir":-1}' title="上一家（←）">◀</button><span>👀 ${WINDS[this.e.seatWind(0)]}・${esc(this.names[0])}${this.g.input.touch ? '' : '<kbd>←</kbd><kbd>→</kbd>'}</span><button data-a='{"type":"specView","dir":1}' title="下一家（→）">▶</button></div>
        <button data-a='{"type":"specToggleQueue"}' class="${s.wantSeat ? 'on' : ''}">${s.wantSeat ? '👀 改為純觀賽' : '🪑 排隊下局上桌'}</button>
        <button data-a='{"type":"leave"}'>🚪 離開觀賽</button>`;
    } else if (this.mj.isGuest && this.e && specs.length > 0) {
      html = `<div class="mj-mp-pill">👀 圍觀（${specs.length}）：${specNames}</div>`;
    }
    if (html !== this._mpBar) {
      this._mpBar = html;
      bar.innerHTML = html;
      bar.classList.toggle('hidden', !html);
    }
  }
  // the card in the top right: 圈風 and your 門風 big (both count 台), the dealer, the wall, the stakes, your wallet
  _infoCard() {
    const e = this.e,
      g = this.g;
    const R = WINDS[e.round],
      S = WINDS[e.seatWind(0)];
    const isGuestSpec = !!(this.mj.isGuest && (e.spectate || this.mj.sess?.spectating));
    const tai =
      e.round === e.seatWind(0)
        ? `碰到${R}的刻子算 2 台（圈風＋門風）`
        : `碰到${R}、${S}的刻子各算 1 台`;
    const tier = this.mj.aiTier?.();
    const specs = this.mj.sess?.spectators || [];
    const specRow = isGuestSpec
      ? `<dt>狀態</dt><dd>${this.mj.sess?.wantSeat ? `👀 排隊補位 #${this.mj.sess.queuePos || 1}` : '👀 純觀賽'}</dd>`
      : this.mj.sess?.spectating
        ? '<dt>狀態</dt><dd>👀 觀戰（AI 代打）</dd>'
        : specs.length > 0
          ? `<dt>圍觀</dt><dd>👀 ${specs.map((x) => esc(x.name)).join('、')}</dd>`
          : '';
    const extra = this.mj.isMulti
      ? `<dt>房號</dt><dd>${esc(this.mj.mp?.code || '連線')}</dd>${specRow}`
      : tier?.badge
        ? `<dt>牌風</dt><dd>${tier.badge}</dd>`
        : '';
    const seatLine = isGuestSpec
      ? `<div class="mj-seat">👀 視角：<em class="r">${R}</em>風<em class="s">${S}</em>（${esc(this.names[0])}）</div>`
      : `<div class="mj-seat">你坐 <em class="r">${R}</em>風<em class="s">${S}</em></div>`;
    const html = `<div class="mj-winds"><div><b class="r">${R}</b><span>風圈</span></div><div><b class="s">${S}</b><span>${isGuestSpec ? '視角門風' : '你的門風'}</span></div></div>
      ${seatLine}<div class="mj-tai">${tai}</div>
      <div class="mj-dealer"><i class="mj-zhuang">莊</i>${esc(this.names[e.dealer])}${e.dealer === 0 && !isGuestSpec ? '（你）' : ''}${e.streak ? `<span class="mj-streak">連 ${e.streak}</span>` : ''}</div>
      <dl><dt>牌牆</dt><dd>剩 ${Math.max(0, e.live)} 張</dd><dt>底／台</dt><dd>${e.base}／${e.perTai}</dd>${extra}
      <dt>錢包</dt><dd class="mj-cash ${g.money < 0 ? 'neg' : ''}">NT$ ${g.money.toLocaleString('en-US')}</dd></dl>`;
    if (html !== this._info) this.$('.mj-info').innerHTML = this._info = html;
  }
  // 聽牌：beside your hand, the tiles you're waiting on (worked out for you) and how many of each are still out there
  _waitHud() {
    const e = this.e,
      el = this.$('.mj-wait');
    // (out of the way while the 吃碰槓胡 buttons are up)
    const list = e && !this.result && !this._options().length ? e.tenpai(0) : [];
    const key = list.map((w) => `${w.t}:${w.left}`).join(',');
    if (key !== this._waitKey) {
      this._waitKey = key;
      const total = list.reduce((a, w) => a + w.left, 0);
      el.innerHTML = list.length
        ? `<b>聽牌 🀄</b><span class="mj-wt">${list
            .map(
              (w) =>
                `<span class="${w.left ? '' : 'gone'}"><img src="${this._tileImg(w.t)}" alt="${tileName(w.t)}"><i>剩 ${w.left}</i></span>`
            )
            .join('')}</span><small>${total ? `共 ${total} 張可以胡` : '聽的牌都沒了 😱'}</small>`
        : '';
      el.classList.toggle('hidden', !list.length);
    }
    if (!list.length) return;
    // just above the left end of your hand
    const v = new THREE.Vector3(-0.25, Y0 + 0.05, 0.36).project(this.cam);
    el.style.left = `${Math.max(1, ((v.x + 1) / 2) * 100)}%`;
    el.style.top = `${((1 - v.y) / 2) * 100}%`;
  }
  // on the table edge in front of each player; yours left of your hand
  _placeTag(el, s, v = new THREE.Vector3()) {
    if (s === 0) v.set(-0.42, Y0 + 0.03, 0.4);
    else {
      v.copy(FWD[s]).multiplyScalar(-0.5);
      v.y = Y0 + 0.1;
    }
    v.project(this.cam);
    el.style.left = `${((v.x + 1) / 2) * 100}%`;
    el.style.top = `${((1 - v.y) / 2) * 100}%`;
  }
  // ---------------- mode picker & P2P multiplayer lobby ----------------
  chooseMode() {
    this.e = null;
    this.choosing = null;
    this.lobby = null;
    this.menu = { kind: 'mode' };
    for (const m of this.tiles) m.visible = false;
    const g = this.g;
    const el = this.$('.mj-res');
    el.innerHTML = `<h3>🀄 力行 277 麻將桌</h3>
      <p>選擇遊玩模式（錢包 NT$ <b class="${g.money < 0 ? 'neg' : ''}">${g.money.toLocaleString('en-US')}</b>）</p>
      <div class="mj-btns mj-mode-btns">
        <button data-a='{"type":"mode","v":"solo"}' class="on"><kbd>1</kbd> 🀄 單人模式<small>揪力行室友 AI 打牌</small></button>
        <button data-a='{"type":"mode","v":"multi"}'><kbd>2</kbd> 🌐 多人連線<small>開房拿房號／加入朋友（不足 4 人補 AI）</small></button>
      </div>
      <div class="mj-btns"><button data-a='{"type":"closeMenu"}'><kbd>Esc</kbd> 離開</button></div>`;
    el.classList.remove('hidden');
    this.$('.mj-acts').innerHTML = '';
    this._actKey = '';
    this.$('.mj-hint').textContent = this._hint = '';
    this.$('.mj-top').textContent = this._top = '🀄 力行 277 麻將桌';
    this.$('.mj-info').innerHTML = this._info = '';
    for (const t of this.tagEls) t.textContent = '';
  }
  chooseMulti(nick = '彥霖', stake = 0, prefill = '') {
    this.e = null;
    this.choosing = null;
    this.lobby = null;
    let urlCode = '';
    try {
      urlCode = normalizeRoomCode(new URLSearchParams(location.search).get('mj') || '');
    } catch (_e) {
      /* ignore */
    }
    this.menu = {
      kind: 'multi',
      nick,
      stake,
      spectateReveal: true,
      code: normalizeRoomCode(prefill) || urlCode,
    };
    this._multiPanel();
  }
  _multiPanel() {
    const M = this.menu;
    const el = this.$('.mj-res');
    el.innerHTML = `<h3>🌐 多人連線麻將（P2P）</h3>
      <p class="mj-small">免伺服器直連・輸贏照樣計入各自 Peach Pay 錢包並存檔</p>
      <div class="mj-form">
        <label class="mj-field"><span>你的暱稱</span><input id="mjNick" maxlength="12" value="${esc(M.nick)}" placeholder="彥霖"></label>
        <div class="mj-mp-box">
          <b>🏠 開設新房間（你當房主）</b>
          <div class="mj-btns mj-stakes">${STAKES.map(
            ([b, t], i) =>
              `<button data-a='{"type":"mpStake","i":${i}}' class="${i === M.stake ? 'on' : ''}">底 ${b}／一台 ${t}</button>`
          ).join('')}</div>
          <div class="mj-btns">
            <button data-a='{"type":"mpToggleReveal"}' class="${M.spectateReveal ? 'on' : ''}">${M.spectateReveal ? '👀 觀賽可看手牌：開' : '🙈 觀賽可看手牌：關'}</button>
            <button data-a='{"type":"mpHost"}' class="on">🏠 開設房間並產生房號</button>
          </div>
        </div>
        <div class="mj-mp-box">
          <b>🚪 加入朋友的房間</b>
          <div class="mj-join-row">
            <input id="mjCode" maxlength="4" value="${esc(M.code)}" placeholder="輸入 4 碼房號" autocomplete="off">
            <button data-a='{"type":"mpJoin"}'>加入房間</button>
            <button data-a='{"type":"mpSpectate"}'>👀 純觀賽</button>
          </div>
          <span class="mj-small">開打後或滿桌加入會先觀賽，待該局結束自動取代 AI 上桌</span>
        </div>
      </div>
      <div class="mj-btns"><button data-a='{"type":"backMode"}'>← 返回</button><button data-a='{"type":"closeMenu"}'>離開</button></div>`;
    el.classList.remove('hidden');
    for (const inp of el.querySelectorAll('input')) {
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && inp.id === 'mjCode') this._do({ type: 'mpJoin' });
      });
    }
    const codeInp = this.$('#mjCode');
    codeInp?.addEventListener('input', () => {
      codeInp.value = normalizeRoomCode(codeInp.value);
    });
  }
  showLobby(state) {
    this.menu = null;
    this.lobby = state;
    const el = this.$('.mj-res');
    const [b, t] = STAKES[state.stake || 0] || STAKES[0];
    const seats = state.seats?.length
      ? state.seats
      : [0, 1, 2, 3].map((i) => ({ seat: i, name: null, isHost: i === 0, isAI: false }));
    const count = seats.filter((s) => s.name && !s.isAI).length;
    const isHost = state.role === 'host';
    const reveal = state.spectateReveal !== false;
    const spectators = state.spectators || [];
    const status = state.connecting
      ? isHost
        ? '🔄 正在建立 P2P 房間…'
        : `🔄 正在連線至房號 ${esc(state.code)}，等待房主回應…`
      : state.yourRole === 'spectator'
        ? state.wantSeat
          ? '👀 你目前在觀賽候位（有空位將自動遞補入座）'
          : '👀 你目前為純觀賽模式（開打後可直接旁觀）'
        : count >= 4
          ? '✅ 4 人到齊！可以開打了'
          : `⏳ 等待中（${count}/4）— 不足 4 人開打時會自動補上室友 AI`;
    const rows = seats
      .map((s, i) => {
        const tag = s.name
          ? s.isHost
            ? `🏠 <b>${esc(s.name)}</b> <small>（房主）</small>`
            : `🧑 <b>${esc(s.name)}</b>`
          : `<span class="mj-wait-slot">⏳ 等待中…（開打時補 AI）</span>`;
        return `<div class="mj-seat-row"><i>座位 ${i + 1}</i><span>${tag}</span></div>`;
      })
      .join('');
    const specHtml = spectators.length
      ? `<div class="mj-spec-list">👀 觀賽名單（${spectators.length}）：${spectators
          .map((s) => `${esc(s.name)}${s.wantSeat ? '（候位）' : ''}`)
          .join('、')}</div>`
      : '';
    const revealBtn =
      isHost && !state.connecting
        ? `<button data-a='{"type":"mpToggleReveal"}' class="${reveal ? 'on' : ''}">${reveal ? '👀 觀賽可看手牌：開' : '🙈 觀賽可看手牌：關'}</button>`
        : '';
    const queueBtn =
      !isHost && !state.connecting && state.yourRole === 'spectator'
        ? `<button data-a='{"type":"lobbyToggleQueue"}' class="${state.wantSeat ? 'on' : ''}">${state.wantSeat ? '👀 改為純觀賽' : '🪑 排隊補位'}</button>`
        : '';
    el.innerHTML = `<h3>${isHost ? '🏠 麻將房間大廳' : '🚪 已加入麻將房間'}</h3>
      ${
        state.code
          ? `<div class="mj-code-bar"><span>房號</span><b class="mj-code">${esc(state.code)}</b><button data-a='{"type":"mpCopy"}'>📋 複製房號</button></div>`
          : ''
      }
      <p class="mj-small">底 ${b}／一台 ${t}・${reveal ? '👀 觀賽可看手牌' : '🙈 觀賽隱藏手牌'}・${status}</p>
      <div class="mj-seats">${rows}</div>
      ${specHtml}
      <div class="mj-btns">
        ${revealBtn}
        ${queueBtn}
        ${
          isHost && !state.connecting
            ? `<button data-a='{"type":"mpStart"}' class="on">▶ ${count >= 4 ? '4 人到齊，立即開打！' : `立即開打（補 ${4 - count} 位 AI）`}</button>`
            : ''
        }
        <button data-a='{"type":"closeMenu"}'>${isHost ? '✕ 解散房間' : '✕ 離開房間'}</button>
      </div>`;
    el.classList.remove('hidden');
    this.$('.mj-top').textContent = this._top = state.code
      ? `🌐 多人麻將・房號 ${state.code}`
      : '🌐 多人麻將連線中…';
  }
  _menuKeys(inp, typing) {
    if (typing) return;
    if (inp.hit('Escape')) {
      if (this.menu?.kind === 'multi') return this.chooseMode();
      return this.mj.closeMenu();
    }
    if (this.menu?.kind === 'mode') {
      if (inp.hit('Digit1', 'Enter', 'NumpadEnter', 'KeyE')) return this.mj.pickMode('solo');
      if (inp.hit('Digit2')) return this.mj.pickMode('multi');
    }
  }
  // ---------------- before the first hand: 底／台 ----------------
  chooseStake(def, cb) {
    this.e = null;
    for (const m of this.tiles) m.visible = false;
    this.choosing = { i: def, cb };
    this._stakePanel();
  }
  _stakePanel() {
    const C = this.choosing,
      g = this.g,
      pad = g.prompts?.pad;
    const el = this.$('.mj-res');
    el.innerHTML = `<h3>🀄 這將打多大？</h3><p>選底／台（錢包 NT$ <b class="${g.money < 0 ? 'neg' : ''}">${g.money.toLocaleString('en-US')}</b>）</p>
      <div class="mj-btns mj-stakes">${STAKES.map(
        ([b, t], i) =>
          `<button data-a='{"type":"stake","i":${i}}' class="${i === C.i ? 'on' : ''}"><kbd>${i + 1}</kbd> 底 ${b}／一台 ${t}</button>`
      ).join('')}</div>
      <p class="mj-small">${pad ? '十字鍵選、A 開打、Start 離開' : '← → 或 1–4 選、Enter 開打、Esc 離開'}</p>`;
    el.classList.remove('hidden');
    this.$('.mj-acts').innerHTML = '';
    this._actKey = '';
    this.$('.mj-hint').textContent = this._hint = '';
    this.$('.mj-top').textContent = this._top = `🀄 力行 277・${this.names.slice(1).join('、')}`;
    this.$('.mj-info').innerHTML = this._info = '';
    for (const t of this.tagEls) t.textContent = '';
  }
  _stakeKeys(inp) {
    const C = this.choosing;
    if (inp.hit('Escape')) return this.mj.leave();
    const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].findIndex((c) => inp.hit(c));
    if (n >= 0) return this._pickStake(n);
    const d = (inp.hit('ArrowRight', 'KeyD') ? 1 : 0) - (inp.hit('ArrowLeft', 'KeyA') ? 1 : 0);
    if (d) {
      C.i = (C.i + d + STAKES.length) % STAKES.length;
      this._stakePanel();
    }
    if (inp.hit('Enter', 'NumpadEnter', 'Space', 'KeyE')) this._pickStake(C.i);
  }
  _pickStake(i) {
    const C = this.choosing;
    if (!C) return;
    this.choosing = null;
    this.$('.mj-res').classList.add('hidden');
    const [b, t] = STAKES[i];
    this.g.hud.toast(`🀄 底 ${b}／一台 ${t}，開打！`, 'good', 1800);
    C.cb(i);
  }
  // ---------------- 抓位、擲骰（src/systems/mahjong/Mahjong.js seatDraw() / deal()） ----------------
  // 抓位: the four winds face down in the middle, shuffled; you draw, everyone's tile slides over and flips, then
  // everyone moves to the seat of their wind (apply() moves the people and returns the names by the new seats).
  seatDraw(winds, apply, done) {
    this.e = null;
    this.result = null;
    this.$('.mj-res').classList.add('hidden');
    for (const m of this.tiles) m.visible = false;
    const row = winds.map((w) => this.pool[27 + w][0]);
    row.forEach((m, s) => {
      const at = slot(0, (s - 1.5) * (TW + 0.01), 0, 'down');
      m.position.copy(at.p);
      m.quaternion.copy(at.q);
      m.userData.to = at;
      m.visible = true;
    });
    this.introTag = (s) => this.names[s];
    this.intro = {
      kind: 'winds',
      phase: 'shuffle',
      t: 0,
      winds,
      apply,
      done,
      row,
      title: '🀄 抓位：東南西北四張風牌蓋著洗好，一人抽一張',
    };
    this.g.audio?.mjShuffle?.();
    this._say('');
  }
  // 擲骰: thrower throws dice (values decided already); count from them round to the right; what: 'dealer' (定莊)
  // or 'cut' (開門, this.e is the hand about to be dealt). You press to throw; the others throw by themselves.
  // auto: everyone's dice fly by themselves (多人：點數由房主決定、全桌同時播，不等任何人按)
  roll(thrower, dice, what, done, { auto = false } = {}) {
    const sum = diceSum(dice);
    const name = this.names[thrower];
    this.intro = {
      kind: 'roll',
      phase: thrower === 0 && !auto ? 'wait' : 'pre',
      t: 0,
      thrower,
      dice,
      sum,
      to: countSeat(thrower, sum),
      what,
      done,
      step: 0,
      title:
        what === 'dealer'
          ? `🎲 抽到東的 ${name} 擲骰定莊`
          : `🎲 莊家 ${name} 擲骰開門${this.e?.streak ? `（連 ${this.e.streak}）` : ''}`,
    };
    if (what === 'cut') this._say('');
  }
  // Enter / click: draw your wind, throw your dice, or skip the rest of the animation
  _introGo() {
    const I = this.intro;
    if (!I) return;
    if (I.kind === 'winds') {
      if (I.phase === 'wait') this._introPhase('deal');
      return;
    }
    if (I.phase === 'wait' || I.phase === 'pre') return this._throw();
    if (I.phase === 'fly' || I.phase === 'count') {
      this.dice.skip();
      I.step = I.sum;
      this._introPhase('show');
    } else if (I.phase === 'show' && I.t > 0.3) this._introEnd();
  }
  _throw() {
    const I = this.intro;
    const from = new THREE.Vector3().addScaledVector(FWD[I.thrower], -0.24);
    this.dice.throw(from, I.dice);
    this._introPhase('fly');
  }
  _introPhase(p) {
    const I = this.intro;
    I.phase = p;
    I.t = 0;
    const W = I.winds;
    if (p === 'deal')
      // everyone's tile slides over to them, still face down
      I.row.forEach((m, s) => (m.userData.to = slot(s, 0, 0.2, 'down')));
    else if (p === 'flip') {
      I.row.forEach((m, s) => (m.userData.to = slot(s, 0, 0.2, 'up')));
      this.introTag = (s) => `抽到 ${WINDS[W[s]]}・${this.names[s]}`;
      this._say(W.map((w, s) => `${this.names[s]} ${WINDS[w]}`).join('・'), '照東南西北，逆時針坐');
      this.g.audio?.mjDraw?.();
    } else if (p === 'seat') {
      // everyone moves to the seat of their wind; 彥霖 stays where he is
      const at = W.map((w) => (w - W[0] + 4) % 4);
      I.row.forEach((m, s) => (m.userData.to = slot(at[s], 0, 0.2, 'up')));
      this.names = I.apply();
      const drew = (s) => WINDS[(s + W[0]) % 4];
      this.introTag = (s) => `抽到 ${drew(s)}・${this.names[s]}`;
      const east = at[W.indexOf(0)];
      this._say(
        [0, 1, 2, 3].map((w) => `${WINDS[w]} ${this.names[(w - W[0] + 4) % 4]}`).join('・'),
        `換好位子了，抽到東的 ${this.names[east]} 擲骰定莊`
      );
    } else if (p === 'count') {
      const [a, b, c] = I.dice;
      this._say(
        `🎲 ${a}＋${b}＋${c}＝${I.sum} 點`,
        `從${this.names[I.thrower]}自己數 1，往右手邊數`
      );
    } else if (p === 'show') {
      I.hl = I.to;
      const rel = SEAT_REL[(I.to - I.thrower + 4) % 4],
        who = this.names[I.to];
      const [a, b, c] = I.dice;
      if (I.what === 'dealer') this._say(`🎲 ${a}＋${b}＋${c}＝${I.sum} 點 → ${rel}・${who} 起莊`);
      else {
        this._say(
          `🎲 ${a}＋${b}＋${c}＝${I.sum} 點 → 從${rel === '自己' ? '莊家自己' : `${rel} ${who} `}面前開門`,
          `那面牌牆從右邊數 ${I.sum} 墩，下一墩開始抓牌`
        );
        // the first stack to draw from
        const st = stackAt(this.e.cut, 0),
          at = wallSlot(st.seat, st.si, TD);
        this.set.newMark.position.copy(at.p);
        this.set.newMark.visible = true;
        I.mark = at.p.y + TD / 2 + 0.03;
      }
    }
  }
  _introEnd() {
    const I = this.intro;
    this.intro = null;
    this.introTag = null;
    this.dice.hide();
    this.set.newMark.visible = false;
    this._say('');
    this._actKey = this._top = this._hint = '';
    I.done?.();
  }
  _introUpdate(dt, inp) {
    const I = this.intro;
    if (inp.hit('Escape')) {
      if (!this.e) return this.mj.leave(); // nothing dealt yet
      const now = performance.now() / 1000;
      if (now - this.escAt < 3) return this.mj.leave(true);
      this.escAt = now;
      this.g.hud.toast('再按一次 Esc 離開牌桌（這一局不算）', 'bad', 1800);
      return;
    }
    if (inp.hit('Enter', 'NumpadEnter', 'Space', 'KeyE')) this._introGo();
    if (this.intro !== I) return;
    I.t += dt;
    if (I.kind === 'winds') {
      if (I.phase === 'shuffle') {
        // mixed around face down for a moment, then lined up
        const n = Math.floor(I.t / 0.14);
        if (n !== I.mix) {
          I.mix = n;
          I.row.forEach((m, s) => {
            m.userData.to =
              I.t > 0.9
                ? slot(0, (s - 1.5) * (TW + 0.01), 0, 'down')
                : slot(0, (Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.1, 'down');
          });
        }
        if (I.t > 1.1) this._introPhase('wait');
      } else if (I.phase === 'wait') {
        if (I.t > 8) this._introPhase('deal'); // (drawn for you if you wait)
      } else if (I.phase === 'deal' && I.t > 0.6) this._introPhase('flip');
      else if (I.phase === 'flip' && I.t > 2.2) this._introPhase('seat');
      else if (I.phase === 'seat' && I.t > 2.6) this._introEnd();
      return;
    }
    if (I.phase === 'pre' && I.t > 0.6) this._throw();
    else if (I.phase === 'fly') {
      if (this.dice.update(dt) > 0) this.g.audio?.mjDice?.(this.dice.bounces);
      if (this.dice.done) this._introPhase('count');
    } else if (I.phase === 'count') {
      // light up each seat as it is counted: 1 = the thrower, then round to the right
      const n = Math.min(I.sum, 1 + Math.floor(I.t / 0.12));
      if (n !== I.step) {
        I.step = n;
        I.hl = countSeat(I.thrower, n);
      }
      if (I.t > I.sum * 0.12 + 0.25) this._introPhase('show');
    } else if (I.phase === 'show') {
      if (I.mark) this.set.newMark.position.y = I.mark + Math.sin(this.g.time * 5) * 0.004;
      if (I.t > 2.6) this._introEnd();
    }
  }
  _introHud() {
    const I = this.intro,
      g = this.g;
    if (!I) return;
    if (I.title !== this._top) this.$('.mj-top').textContent = this._top = I.title;
    const e = this.e;
    if (e) this._infoCard(); // (開門: the new hand's 圈風／門風 already)
    this.tagEls.forEach((el, s) => {
      this._placeTag(el, s);
      const txt =
        I.kind === 'roll' && e
          ? `${WINDS[e.seatWind(s)]}・${this.names[s]}`
          : this.introTag
            ? this.introTag(s)
            : this.names[s];
      if (el.textContent !== txt || el.dataset.h) {
        el.textContent = txt;
        el.dataset.h = '';
      }
      el.classList.toggle('on', I.kind === 'roll' && I.hl === s);
      el.classList.toggle('me', s === 0);
    });
    const wait = I.phase === 'wait';
    const pad = g.prompts?.pad;
    const btn = wait
      ? `<button data-a='{"type":"go"}' class="go"><kbd>${pad ? 'A' : 'Enter'}</kbd>${I.kind === 'winds' ? '🀄 抽一張風牌' : '🎲 擲骰'}</button>`
      : '';
    const key = `intro${btn}`;
    if (key !== this._actKey) {
      this._actKey = key;
      this.$('.mj-acts').innerHTML = btn;
    }
    if (btn) {
      const v = new THREE.Vector3(0, Y0 + 0.05, 0.36).project(this.cam);
      this.$('.mj-acts').style.top = `${((1 - v.y) / 2) * 100}%`;
    }
    const hint = wait
      ? I.kind === 'winds'
        ? '抽到哪個風就坐哪個位子（東南西北逆時針坐）'
        : I.what === 'dealer'
          ? '你抽到東：擲骰決定誰起莊'
          : '你是莊家：擲骰決定從哪一家的牌牆開門'
      : ['pre', 'fly', 'count'].includes(I.phase)
        ? `${g.input.touch ? '點一下' : pad ? '按 A ' : '按 Enter '}跳過`
        : '';
    if (hint !== this._hint) this.$('.mj-hint').textContent = this._hint = hint;
  }
  // the big line in the middle of the screen (empty = gone)
  _say(big, small = '') {
    const el = this.$?.('.mj-say');
    if (!el) return;
    const html = big ? `${big}${small ? `<small>${small}</small>` : ''}` : '';
    if (html === this._said) return;
    this._said = html;
    el.innerHTML = html;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }
  // 近看 ⇄ 全景
  _toggleView() {
    this.far = !this.far;
    this.g.audio?.tap?.();
  }
  _viewBtn() {
    const txt = `<kbd>${this.g.prompts?.pad ? 'View' : 'V'}</kbd> ${this.far ? '🔍 近看' : '🔭 全景'}`;
    if (txt !== this._vb) this.$('.mj-view').innerHTML = this._vb = txt;
  }

  // ---------------- the tile just played, shown big next to whoever played it ----------------
  _onEvent(ev) {
    const CALL = { pon: '碰！', chi: '吃！', kong: '槓！' };
    const a = this.g.audio;
    if (ev.type === 'deal') a?.mjShuffle?.();
    else if (ev.type === 'draw') a?.mjDraw?.();
    else if (ev.type === 'discard') {
      a?.mjTile?.();
      this._showPop(ev.seat, ev.t, `${this.names[ev.seat]} 打出 ${tileName(ev.t)}`);
    } else if (CALL[ev.type]) {
      a?.mjMeld?.();
      if (!ev.closed)
        // (a closed kong stays secret)
        this._showPop(ev.seat, ev.t, `${this.names[ev.seat]} ${CALL[ev.type]}`, true);
    } else if (ev.type === 'win') a?.mjReveal?.();
  }
  // a picture of tile k (its face from the atlas), cached
  _tileImg(k) {
    this._imgs ||= {};
    if (this._imgs[k]) return this._imgs[k];
    const cv = document.createElement('canvas');
    cv.width = CW;
    cv.height = CH;
    cv.getContext('2d').drawImage(
      this.set.tileMat.map.image,
      (k % COLS) * CW,
      Math.floor(k / COLS) * CH,
      CW,
      CH,
      0,
      0,
      CW,
      CH
    );
    return (this._imgs[k] = cv.toDataURL());
  }
  _showPop(seat, k, text, call = false) {
    const P = this.pop;
    P.seat = seat;
    P.until = performance.now() + (call ? 1600 : 1400);
    P.el.querySelector('img').src = this._tileImg(k);
    P.el.querySelector('b').textContent = text;
    P.el.classList.toggle('call', call);
    P.el.classList.remove('hidden');
    // restart the pop-in animation
    P.el.style.animation = 'none';
    void P.el.offsetWidth;
    P.el.style.animation = '';
  }
  _hidePop() {
    this.pop?.el.classList.add('hidden');
    if (this.pop) this.pop.until = 0;
  }
  _popTick() {
    const P = this.pop;
    if (P.el.classList.contains('hidden')) return;
    // stays while it's your call to make on that tile
    const waiting = this.e?.pending?.seat === 0 && this.e.pending.kind === 'claim';
    if (this.result || (!waiting && performance.now() > P.until)) return this._hidePop();
    // between the centre of the table and the one who played it
    const v = new THREE.Vector3().copy(FWD[P.seat]).multiplyScalar(P.seat === 0 ? -0.16 : -0.2);
    v.y = Y0 + 0.06;
    v.project(this.cam);
    P.el.style.left = `${((v.x + 1) / 2) * 100}%`;
    P.el.style.top = `${((1 - v.y) / 2) * 100}%`;
  }

  _showResult() {
    const e = this.e,
      r = e.result;
    this.result = r;
    this._lastEnd = this.mj.handOver(r);
    this.resNext = !this._lastEnd.over && !this._lastEnd.broke;
    this.resSpectate = !this._lastEnd.over && !!this._lastEnd.canSpectate;
    this._layout();
    this._showResultPanelOnly();
    const isGuestSpec = !!(this.mj.isGuest && this.mj.sess?.spectating);
    if (!isGuestSpec && r.winner === 0) this.g.audio?.coin?.();
  }
  _showResultPanelOnly() {
    const e = this.e,
      r = this.result,
      end = this._lastEnd || {};
    if (!e || !r) return;
    const isGuestSpec = !!(this.mj.isGuest && this.mj.sess?.spectating);
    const money = (n) =>
      `${n > 0 ? '+' : n < 0 ? '−' : '±'}NT$ ${Math.abs(n).toLocaleString('en-US')}`;
    let html;
    if (r.draw) html = '<h3>流局 🀫</h3><p>牌摸完了，沒人胡。莊家連莊。</p>';
    else {
      const who = esc(this.names[r.winner]),
        from = r.flower
          ? r.self
            ? '湊齊 8 張花'
            : `${esc(this.names[r.from])} 摸到第 8 張花`
          : r.self
            ? '自摸'
            : `${esc(this.names[r.from])} 放槍`;
      const dealerT =
        r.winner === e.dealer || r.from === e.dealer || r.self
          ? `<li>莊家／連莊　另計 ${1 + 2 * e.streak} 台（莊家有付或有胡時）</li>`
          : '';
      html = `<h3>${!isGuestSpec && r.winner === 0 ? '🎉 ' : ''}${who} 胡了！（${from}・${tileName(r.t)}）</h3>
        <ul>${r.items.map(([n, t]) => `<li>${n}　${t} 台</li>`).join('')}${r.items.length ? '' : '<li>沒有台（只算底）</li>'}${dealerT}</ul>
        <p>共 ${r.tai} 台</p>`;
    }
    html += `<div class="mj-money">${r.deltas.map((d, s) => `<span class="${s === 0 && !isGuestSpec ? 'me' : ''}">${esc(this.names[s])} ${money(d)}</span>`).join('')}</div>`;
    if (end.banter && !end.broke && !end.over)
      html += `<p class="mj-banter ${end.banter.dir}">💬 <b>${esc(end.banter.name)}</b>：「${esc(end.banter.text)}」</p>`;
    if (end.canSpectate)
      html += '<p class="neg">💸 錢包見底了！可改為觀戰並由 AI 代打，讓朋友繼續打完這將</p>';
    else if (end.broke) html += '<p class="neg">💸 錢包見底了，不能再打了</p>';
    else if (end.over) html += '<p>🀄 北風北打完了，一將結束！</p>';
    else if (isGuestSpec) {
      const s = this.mj.sess;
      html += s?.wantSeat
        ? `<p class="mj-small">👀 觀賽中・排隊補位 #${s.queuePos || 1}（下局若有 AI 空位將自動上桌）</p>`
        : '<p class="mj-small">👀 純觀賽中（不計輸贏），等待房主開下一局…</p>';
    } else if (end.spectating)
      html += '<p class="mj-small">👀 觀戰中（由 AI 代打，不再變動你的錢包）</p>';
    else if (this.mj.isGuest) html += '<p class="mj-small">⏳ 等待房主開下一局…</p>';
    const nextBtn = this.resSpectate
      ? `<button data-a='{"type":"spectateNext"}'><kbd>Enter</kbd> 👀 觀戰繼續（AI 代打）</button>`
      : this.resNext && !this.mj.isGuest
        ? `<button data-a='{"type":"next"}'><kbd>Enter</kbd> 下一局</button>`
        : isGuestSpec
          ? `<button data-a='{"type":"specToggleQueue"}'>${this.mj.sess?.wantSeat ? '👀 改為純觀賽' : '🪑 排隊下局上桌'}</button>`
          : '';
    const leaveLabel = this.mj.isMulti
      ? this.mj.mpMode === 'host'
        ? '解散房間'
        : isGuestSpec
          ? '離開觀賽'
          : '離開房間'
      : this.resNext
        ? '散場'
        : '<kbd>Enter</kbd> 散場';
    html += `<div class="mj-btns">${nextBtn}<button data-a='{"type":"leave"}'>${leaveLabel}</button></div>`;
    const el = this.$('.mj-res');
    el.innerHTML = html;
    el.classList.remove('hidden');
  }
}
