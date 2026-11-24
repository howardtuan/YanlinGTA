// 277 麻將的 3 顆骰子：中式骰子（象牙白、1 點和 4 點是紅的），擲骰時從擲的人那邊丟到桌子中央，
// 邊翻邊彈兩下，最後停在先決定好的點數朝上（點數由 src/systems/mahjong/Rules.js rollDice() 決定，動畫只是演出來）。
// src/systems/mahjong/MahjongScene.js 在抓位後定莊、每把開門前用它。
import * as THREE from 'three';

export const DIE = 0.028; // 2.8 cm (a bit big, so the pips read from your seat)
// BoxGeometry 的面順序 +x −x +y −y +z −z；對面加起來是 7
const FACE_VAL = [1, 6, 2, 5, 3, 4];
const FACE_N = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const PIPS = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.26, 0.26],
    [0.74, 0.26],
    [0.5, 0.5],
    [0.26, 0.74],
    [0.74, 0.74],
  ],
  6: [
    [0.28, 0.22],
    [0.72, 0.22],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.78],
    [0.72, 0.78],
  ],
};

function faceTexture(v) {
  const S = 64,
    cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.fillStyle = '#f6f1e4';
  c.fillRect(0, 0, S, S);
  c.strokeStyle = '#d9d0bd';
  c.lineWidth = 3;
  c.strokeRect(1.5, 1.5, S - 3, S - 3);
  c.fillStyle = v === 1 || v === 4 ? '#cf1f2b' : '#1d1d2b';
  for (const [x, y] of PIPS[v]) {
    c.beginPath();
    c.arc(x * S, y * S, v === 1 ? 12 : 6.5, 0, Math.PI * 2);
    c.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const UP = new THREE.Vector3(0, 1, 0);
// a rotation that leaves face value v on top, turned by yaw around the vertical
export function restingQuat(v, yaw) {
  const n = new THREE.Vector3(...FACE_N[FACE_VAL.indexOf(v)]);
  const up = new THREE.Quaternion().setFromUnitVectors(n, UP);
  return new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(up);
}
// which value is on top for a die turned by q
export function topValue(q) {
  let best = -2,
    v = 0;
  FACE_N.forEach((n, i) => {
    const y = new THREE.Vector3(...n).applyQuaternion(q).y;
    if (y > best) ((best = y), (v = FACE_VAL[i]));
  });
  return v;
}

const _q = new THREE.Quaternion();
export class DiceSet {
  // y: the table top
  constructor(scene, y) {
    this.y = y;
    const mats = FACE_VAL.map(
      (v) => new THREE.MeshStandardMaterial({ map: faceTexture(v), roughness: 0.35 })
    );
    const geo = new THREE.BoxGeometry(DIE, DIE, DIE);
    this.dice = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(geo, mats);
      m.visible = false;
      scene.add(m);
      return m;
    });
    this.t = this.T = 0;
  }
  // throw them from `from` (a point on the table edge) into the middle so they land showing values
  throw(from, values, rng = Math.random) {
    this.t = 0;
    this.T = 1.3;
    this.bounces = 0;
    this.runs = values.map((v, i) => {
      const end = new THREE.Vector3(
        (rng() - 0.5) * 0.008 + (i - 1) * 0.048, // apart, so they never overlap
        this.y + DIE / 2,
        (rng() - 0.5) * 0.05
      );
      const start = new THREE.Vector3(from.x, this.y + 0.14, from.z).addScaledVector(
        new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5),
        0.04
      );
      return {
        start,
        end,
        q: restingQuat(v, rng() * Math.PI * 2),
        axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
        spin: 16 + rng() * 8,
      };
    });
    for (const d of this.dice) d.visible = true;
    this.update(0);
  }
  get done() {
    return this.t >= this.T;
  }
  skip() {
    this.t = this.T;
    this.update(0);
  }
  // returns how many times they hit the table this frame (for a click sound)
  update(dt) {
    if (!this.runs) return 0;
    this.t = Math.min(this.T, this.t + dt);
    const k = this.t / this.T;
    // two bounces that die away: up high, down at k = 0.2, 0.6, 1
    const h = 0.12 * (1 - k) ** 2 * Math.abs(Math.cos(k * Math.PI * 2.5));
    const ease = 1 - (1 - k) ** 2;
    this.dice.forEach((d, i) => {
      const r = this.runs[i];
      d.position.lerpVectors(r.start, r.end, ease);
      d.position.y = r.end.y + (k < 0.2 ? h + (r.start.y - this.y - 0.12) * (1 - k / 0.2) : h);
      // still tumbling, slower and slower, until it rests exactly on its value
      _q.setFromAxisAngle(r.axis, r.spin * (this.T - this.t) * (1 - k));
      d.quaternion.copy(_q).multiply(r.q);
    });
    const n = k >= 1 ? 3 : k >= 0.6 ? 2 : k >= 0.2 ? 1 : 0;
    const hits = n - this.bounces;
    this.bounces = n;
    return hits;
  }
  hide() {
    for (const d of this.dice) d.visible = false;
    this.runs = null;
  }
}
