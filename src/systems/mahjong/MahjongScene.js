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
import { tileName, isFlower, WINDS, sortTiles, meldTiles, BASE, PER_TAI } from './Rules.js';

const TW = 0.03, // tile width, height, thickness (m)
  TH = 0.04,
  TD = 0.022,
  Y0 = 0.72, // felt
  HALF = 0.47; // half the table
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
    } else {
      // sticks: rows of up to 3 (or 4 for 8)
      const rows =
        n <= 3
          ? [n]
          : n === 4
            ? [2, 2]
            : n === 5
              ? [2, 1, 2]
              : n === 6
                ? [3, 3]
                : n === 7
                  ? [1, 3, 3]
                  : n === 8
                    ? [4, 4]
                    : [3, 3, 3];
      const rh = (CH - 30) / rows.length;
      rows.forEach((m, ri) => {
        for (let j = 0; j < m; j++) {
          const cx = CW / 2 + (j - (m - 1) / 2) * 30,
            cy = 15 + rh * ri + rh / 2;
          c.fillStyle =
            (n === 7 && ri === 0) || (n === 5 && ri === 1) || (n === 9 && j === 1)
              ? '#c8272d'
              : '#1f8a4c';
          c.fillRect(cx - 7, cy - rh * 0.4, 14, rh * 0.8);
          c.fillStyle = '#f6f1e2';
          c.fillRect(cx - 7, cy - 2, 14, 4);
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
  const tileMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.35 });
  return { scene, mark, tileMat };
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
    this.ray = new THREE.Raycaster();
    this._ui();
  }
  // the overlay: info bar, name tags, the buttons, the hint line, the result panel
  _ui() {
    const el = (this.ui = document.createElement('div'));
    el.id = 'mjUI';
    el.className = 'hidden';
    el.innerHTML = `<div class="mj-top"></div><div class="mj-tags">${'<div class="mj-tag"></div>'.repeat(4)}</div>
      <div class="mj-acts"></div><div class="mj-hint"></div><div class="mj-res hidden"></div>
      <div class="mj-pop hidden"><img alt=""><b></b></div>`;
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
    this.ui.classList.add('hidden');
    this.$('.mj-res').classList.add('hidden');
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
    const e = this.e;
    if (!e) return;
    this._keys(inp);
    if (!this.result) {
      this.t -= dt;
      let guard = 0;
      while (this.t <= 0 && !e.pending && e.phase !== 'end' && guard++ < 6) {
        e.events.length = 0;
        e.step();
        this.t += this._pace(e.events);
        this._layout();
        if (
          e.events.some(
            (v) => v.type === 'discard' || v.type === 'pon' || v.type === 'chi' || v.type === 'kong'
          )
        )
          this.g.audio?.tap?.();
      }
      if (e.phase === 'end' && this.t <= 0) this._showResult();
    }
    // tiles glide to where they belong
    const k = Math.min(1, dt * 14);
    for (const m of this.tiles) {
      const T = m.userData.to;
      if (!T) continue;
      m.position.lerp(T.p, k);
      m.quaternion.slerp(T.q, k);
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
    const c = this.cam;
    c.aspect = innerWidth / innerHeight;
    // closer on a narrow screen so the hand still fits
    const tall = c.aspect < 1.2;
    if (c.aspect < 0.8) {
      // a phone held upright: from higher up, so the table's width fits
      c.position.set(0, 1.62, 0.62);
      c.fov = 76;
      c.lookAt(0, Y0, 0.06);
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
      // concealed hand (yours: the tile you just drew a bit apart)
      let hand = sortTiles(P.hand);
      let drawn = null;
      if (e.turn === s && e.justDrew && e.phase === 'turn' && hand.includes(e.drawn)) {
        hand.splice(hand.indexOf(e.drawn), 1);
        drawn = e.drawn;
      }
      if (drawn != null) hand = [...hand, drawn];
      const nMeld = P.melds.reduce((a, m) => a + (m.type === 'kong' ? 4 : 3), 0);
      const total = hand.length + nMeld + P.melds.length * 0.3 + (drawn != null ? 0.4 : 0);
      let u = -(total * TW) / 2;
      const reveal = done; // hand over: everybody lays their tiles down
      hand.forEach((k, i) => {
        if (drawn != null && i === hand.length - 1) u += TW * 0.4;
        const how = s === 0 && !reveal ? 'mine' : reveal ? 'up' : 'stand';
        put(k, slot(s, u + TW / 2, reveal ? 0.38 : 0.4, how), s === 0 ? 'mine' : null);
        u += TW;
      });
      // melds, face up (closed kongs face down) to the right
      for (const m of P.melds) {
        u += TW * 0.3;
        meldTiles(m).forEach((k, j) => {
          const down = m.closed && (j === 0 || j === 3);
          put(k, slot(s, u + TW / 2, 0.39, down ? 'down' : 'up'));
          u += TW;
        });
      }
      // flowers in a row between the wall and the hand
      P.flowers.forEach((k, i) => put(k, slot(s, -0.27 + i * TW, 0.335, 'up')));
      // discards: rows of 6 in front of the wall
      P.discards.forEach((k, i) => {
        const r = Math.floor(i / 6),
          c = i % 6;
        put(
          k,
          slot(s, -0.09 + TW / 2 + c * TW, 0.095 + r * (TH + 0.003), 'up'),
          i === P.discards.length - 1 && e.last?.from === s ? 'last' : null
        );
      });
    }
    // the wall: 4 × 18 stacks of 2, face down; slot j of what's left is e.wall[j] (front = next draw)
    const N = 144,
      head = e.headTaken,
      tail = e.tailTaken;
    let j = 0;
    for (let i = head; i < N - tail; i++) {
      const st = Math.floor(i / 2),
        top = i % 2 === 0 && i + 1 < N - tail; // the lower tile stays on the table when the top one is gone
      const ws = (e.dealer + Math.floor(st / 18)) % 4,
        si = st % 18;
      const at = slot(ws, -0.25 + TW / 2 + si * TW, 0.29, 'down', top ? TD : 0);
      put(e.wall[j++], at);
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
      if (w.tag === 'mine') this.mine.push({ mesh: m, k: w.k });
      if (w.tag === 'last') this.lastMesh = m;
    }
    for (const list of free) for (const m of list) m.visible = false;
  }

  // ---------------- your moves ----------------
  _options() {
    const p = this.e?.pending;
    if (!p || p.seat !== 0) return [];
    const out = [];
    if (p.kind === 'turn') {
      if (p.options.tsumo) out.push({ type: 'tsumo', label: '自摸 胡', key: 'H' });
      for (const k of p.options.kongs)
        out.push({ type: 'kong', t: k.t, label: `槓 ${tileName(k.t)}`, key: 'K' });
    } else {
      for (const o of p.options) {
        if (o.type === 'hu') out.push({ ...o, label: '胡！', key: 'H' });
        else if (o.type === 'pon') out.push({ ...o, label: `碰 ${tileName(o.t)}`, key: 'P' });
        else if (o.type === 'kong') out.push({ ...o, label: `槓 ${tileName(o.t)}`, key: 'K' });
      }
      const chis = p.options.filter((o) => o.type === 'chi');
      chis.forEach((o, i) =>
        out.push({
          ...o,
          label: `吃 ${[o.t, o.t + 1, o.t + 2].map((x) => tileName(x)[0]).join('')}${tileName(o.t).slice(1)}`,
          key: chis.length > 1 ? String(i + 1) : 'C',
        })
      );
      out.push({ type: 'pass', label: '過', key: 'X' });
    }
    return out;
  }
  _do(a) {
    if (a.type === 'next') return this.mj.next();
    if (a.type === 'leave') return this.mj.leave();
    const e = this.e;
    if (!e?.pending) return;
    const { label: _l, key: _k, ...act } = a;
    if (e.decide(act)) {
      this.t = 0.15;
      this._layout();
    }
  }
  _discard(i) {
    const e = this.e;
    if (e?.pending?.kind !== 'turn' || !this.mine[i]) return;
    if (e.decide({ type: 'discard', t: this.mine[i].k })) {
      this.t = 0.3;
      this._layout();
      this.g.audio?.tap?.();
    }
  }
  _keys(inp) {
    const e = this.e;
    if (inp.hit('Escape')) {
      const now = performance.now() / 1000;
      if (this.result || now - this.escAt < 3) return this.mj.leave();
      this.escAt = now;
      this.g.hud.toast('再按一次 Esc 離開牌桌（這一局不算）', 'bad', 1800);
      return;
    }
    if (this.result) {
      if (inp.hit('Enter', 'NumpadEnter', 'Space', 'KeyE'))
        this._do({ type: this.resNext ? 'next' : 'leave' });
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
    const top = `${WINDS[e.round]}風圈・莊家 ${seatName(e.dealer)}${e.streak ? ` 連 ${e.streak}` : ''}・牌牆剩 ${Math.max(0, e.live)} 張・底 ${BASE}／一台 ${PER_TAI}・錢包 NT$ <b class="${g.money < 0 ? 'neg' : ''}">${g.money.toLocaleString('en-US')}</b>`;
    if (top !== this._top) this.$('.mj-top').innerHTML = this._top = top;
    // name tags over each seat
    const v = new THREE.Vector3();
    for (let s = 0; s < 4; s++) {
      const el = this.tagEls[s];
      // on the table edge in front of each player; yours left of your hand
      if (s === 0) v.set(-0.42, Y0 + 0.03, 0.4);
      else {
        v.copy(FWD[s]).multiplyScalar(-0.5);
        v.y = Y0 + 0.1;
      }
      v.project(this.cam);
      el.style.left = `${((v.x + 1) / 2) * 100}%`;
      el.style.top = `${((1 - v.y) / 2) * 100}%`;
      const txt = `${WINDS[e.seatWind(s)]}・${seatName(s)}${e.turn === s && e.phase !== 'end' ? ' ⏳' : ''}`;
      if (el.textContent !== txt) el.textContent = txt;
      el.classList.toggle('on', e.turn === s && e.phase !== 'end');
      el.classList.toggle('me', s === 0);
    }
    // buttons
    const opts = this._options();
    const key = JSON.stringify(opts) + (g.prompts?.pad ? 'p' : '');
    if (key !== this._actKey) {
      this._actKey = key;
      const pad = { H: 'Y', P: 'X', K: 'RB', C: 'LB', X: 'B', 1: 'LB', 2: '2', 3: '3' };
      this.$('.mj-acts').innerHTML = opts
        .map(
          (o) =>
            `<button data-a='${JSON.stringify(o)}' class="${o.type}"><kbd>${g.prompts?.pad ? pad[o.key] || o.key : o.key}</kbd> ${o.label}</button>`
        )
        .join('');
    }
    const p = e.pending;
    const hint = this.result
      ? ''
      : p?.seat === 0 && p.kind === 'turn'
        ? g.input.touch
          ? '點一下選牌、再點一次打出'
          : g.prompts?.pad
            ? '十字鍵選牌・A 打出'
            : '← → 選牌・Enter／空白鍵打出（滑鼠點牌直接打）・Esc 離開'
        : p?.seat === 0
          ? `${this.names[e.last.from]} 打出 ${tileName(e.last.t)}，要嗎？`
          : '';
    if (hint !== this._hint) this.$('.mj-hint').textContent = this._hint = hint;
  }
  // ---------------- the tile just played, shown big next to whoever played it ----------------
  _onEvent(ev) {
    const CALL = { pon: '碰！', chi: '吃！', kong: '槓！' };
    if (ev.type === 'discard')
      this._showPop(ev.seat, ev.t, `${this.names[ev.seat]} 打出 ${tileName(ev.t)}`);
    else if (CALL[ev.type] && !ev.closed)
      // (a closed kong stays secret)
      this._showPop(ev.seat, ev.t, `${this.names[ev.seat]} ${CALL[ev.type]}`, true);
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
    const end = this.mj.handOver(r);
    this.resNext = !end.over && !end.broke;
    this._layout();
    const money = (n) =>
      `${n > 0 ? '+' : n < 0 ? '−' : '±'}NT$ ${Math.abs(n).toLocaleString('en-US')}`;
    let html;
    if (r.draw) html = '<h3>流局 🀫</h3><p>牌摸完了，沒人胡。莊家連莊。</p>';
    else {
      const who = this.names[r.winner],
        from = r.self ? '自摸' : `${this.names[r.from]} 放槍`;
      const dealerT =
        r.winner === e.dealer || r.from === e.dealer || r.self
          ? `<li>莊家／連莊　另計 ${1 + 2 * e.streak} 台（莊家有付或有胡時）</li>`
          : '';
      html = `<h3>${r.winner === 0 ? '🎉 ' : ''}${who} 胡了！（${from}・${tileName(r.t)}）</h3>
        <ul>${r.items.map(([n, t]) => `<li>${n}　${t} 台</li>`).join('')}${r.items.length ? '' : '<li>沒有台（只算底）</li>'}${dealerT}</ul>
        <p>共 ${r.tai} 台</p>`;
    }
    html += `<div class="mj-money">${r.deltas.map((d, s) => `<span class="${s === 0 ? 'me' : ''}">${this.names[s]} ${money(d)}</span>`).join('')}</div>`;
    if (end.broke) html += '<p class="neg">💸 錢包見底了，不能再打了</p>';
    else if (end.over) html += '<p>🀄 北風北打完了，一將結束！</p>';
    html += `<div class="mj-btns">${this.resNext ? `<button data-a='{"type":"next"}'><kbd>Enter</kbd> 下一局</button>` : ''}<button data-a='{"type":"leave"}'>${this.resNext ? '散場' : '<kbd>Enter</kbd> 散場'}</button></div>`;
    const el = this.$('.mj-res');
    el.innerHTML = html;
    el.classList.remove('hidden');
    if (r.winner === 0) this.g.audio?.coin?.();
  }
}
