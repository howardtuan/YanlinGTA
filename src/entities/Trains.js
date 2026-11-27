// 縱貫線火車：照台鐵實際班表（src/entities/TrainTimetable.js，tools/train_timetable.mjs 從臺鐵開放資料產生）
// 在遊戲時鐘的同一個時刻開過地圖。
//
// 遊戲時鐘走得比現實快 15 倍（src/core/Game.js：現實 4 秒 = 遊戲 1 分鐘），火車要是照遊戲時間跑會變成 1000 km/h。
// 所以：每班車在班表上「車頭經過地圖中段（REF_S）」的遊戲時刻經過那裡，但用現實速度（SPEED）前後延伸，
// 也就是車子大約在那個時刻前後各半分鐘（遊戲時間）內從地圖一端開到另一端。
//
// 台鐵靠左行駛：南下（往中壢、西南）走東南側的 rail[1]，北上走西北側的 rail[0]（src/world/Railway.js）。
// 平交道：車頭離平交道 WARN_D 內開始響鈴、閃燈，車尾離開 CLEAR_D 後柵欄桿升起。
import * as THREE from 'three';
import { groundY } from '../world/Terrain.js';
import { WEEKDAY, WEEKEND } from './TrainTimetable.js';

export const SPEED = 25; // m/s（90 km/h，內壢—中壢站間的行駛速度）
const CAR_L = 19.6; // 車廂長
const CAR_GAP = 0.5;
const HALF_W = 1.45;
const ROOF = 4.0; // 車頂離軌面
const WARN_D = 175; // 車頭到達前約 7 秒開始響鈴、閃燈
const CLEAR_D = 6;
const FAR = 600; // 離玩家這麼遠的車廂不畫
const NEILI = [1584.5, -1625.4]; // 內壢站（地圖座標，換算自經緯度）
const REF_S = 2560; // 班表換算的參考點：rail[0] 上的弧長（地圖中段，三個平交道之間）

// ---------- 外觀 ----------
// 每種塗裝一張 1024×512 貼圖：上半是車身側面，下半依序是駕駛室端、貫通道端、車頂、車底
const LOOK = {
  local: {
    body: '#e8ebee',
    band: '#1b2330',
    stripes: [
      ['#f0b81c', 0.6],
      ['#1d4f9e', 0.42],
    ],
    doors: 3,
    face: '#f0b81c',
    faceLow: '#1d4f9e',
  },
  express: {
    body: '#eef0f0',
    band: '#202426',
    stripes: [['#e0602a', 0.5]],
    doors: 2,
    face: '#eef0f0',
    faceLow: '#202426',
  },
  chukuang: {
    body: '#d8642c',
    band: '#2a1e18',
    stripes: [['#f2e2c0', 0.55]],
    doors: 2,
    face: '#d8642c',
    faceLow: '#2a1e18',
  },
};

function lookTextures(L) {
  const cv = document.createElement('canvas'),
    em = document.createElement('canvas');
  cv.width = em.width = 1024;
  cv.height = em.height = 512;
  const g = cv.getContext('2d'),
    e = em.getContext('2d');
  e.fillStyle = '#000';
  e.fillRect(0, 0, 1024, 512);
  // --- 側面 (0,0)-(1024,256)：橫向 = 車長 19.6 m，縱向 = 車底 FLOOR 到車頂 ROOF ---
  const H = 256,
    yOf = (m) => H - ((m - 0.6) / (ROOF - 0.6)) * H; // 側面貼圖從軌面上 0.6 m 開始
  g.fillStyle = L.body;
  g.fillRect(0, 0, 1024, H);
  // 窗帶
  const w0 = yOf(2.95),
    w1 = yOf(1.95);
  g.fillStyle = L.band;
  g.fillRect(0, w0, 1024, w1 - w0);
  // 腰帶
  let y = yOf(1.85);
  for (const [c, h] of L.stripes) {
    const hh = (h / (ROOF - 0.6)) * H * 0.5;
    g.fillStyle = c;
    g.fillRect(0, y, 1024, hh);
    y += hh;
  }
  // 車門（深色框）與窗
  const doors = [];
  for (let i = 0; i < L.doors; i++) doors.push(((i + 0.5) / L.doors) * 1024);
  for (const x of doors) {
    g.fillStyle = '#9aa0a6';
    g.fillRect(x - 36, yOf(3.05), 72, yOf(0.75) - yOf(3.05));
    g.fillStyle = L.body;
    g.fillRect(x - 32, yOf(3.0), 64, yOf(0.8) - yOf(3.0));
    g.fillStyle = '#2b3138';
    g.fillRect(x - 26, yOf(2.85), 22, yOf(1.9) - yOf(2.85));
    g.fillRect(x + 4, yOf(2.85), 22, yOf(1.9) - yOf(2.85));
    g.fillStyle = '#5a6068';
    g.fillRect(x - 1, yOf(3.0), 2, yOf(0.8) - yOf(3.0));
    e.fillStyle = '#ffe9c4';
    e.fillRect(x - 26, yOf(2.85), 22, yOf(1.9) - yOf(2.85));
    e.fillRect(x + 4, yOf(2.85), 22, yOf(1.9) - yOf(2.85));
  }
  // 窗（門之間）
  g.fillStyle = '#3a4652';
  for (let x = 20; x < 1004; x += 70) {
    if (doors.some((d) => Math.abs(d - x - 28) < 70)) continue;
    g.fillRect(x, yOf(2.85), 56, yOf(2.05) - yOf(2.85));
    e.fillStyle = '#ffe9c4';
    e.fillRect(x, yOf(2.85), 56, yOf(2.05) - yOf(2.85));
  }
  // 車底裙
  g.fillStyle = '#2a2d31';
  g.fillRect(0, yOf(1.05), 1024, H - yOf(1.05));
  // --- 駕駛室端 (0,256)-(256,512) ---
  const F = (x0) => {
    g.fillStyle = L.face;
    g.fillRect(x0, 256, 256, 256);
    g.fillStyle = L.faceLow;
    g.fillRect(x0, 256 + 176, 256, 40);
    g.fillStyle = '#15191d';
    g.fillRect(x0 + 20, 256 + 40, 216, 84); // 擋風玻璃
    g.fillStyle = '#2a2d31';
    g.fillRect(x0, 256 + 216, 256, 40);
  };
  F(0);
  // 頭燈
  for (const x of [40, 216]) {
    g.fillStyle = '#fffbe8';
    g.beginPath();
    g.arc(x, 256 + 150, 12, 0, 7);
    g.fill();
    e.fillStyle = '#fff6d8';
    e.beginPath();
    e.arc(x, 256 + 150, 12, 0, 7);
    e.fill();
  }
  // --- 貫通道端 (256,256)-(512,512) ---
  g.fillStyle = L.body;
  g.fillRect(256, 256, 256, 256);
  g.fillStyle = '#3a3e44';
  g.fillRect(256 + 88, 256 + 30, 80, 190);
  g.fillStyle = '#2a2d31';
  g.fillRect(256, 256 + 216, 256, 40);
  // --- 車頂 (512,256)-(768,512) ---
  g.fillStyle = '#8d9296';
  g.fillRect(512, 256, 256, 256);
  g.fillStyle = '#6f7478';
  for (let x = 512; x < 768; x += 32) g.fillRect(x, 256, 3, 256);
  // --- 車底、轉向架 (768,256)-(1024,512) ---
  g.fillStyle = '#1f2124';
  g.fillRect(768, 256, 256, 256);
  const t = (c) => {
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 4;
    return tx;
  };
  return { map: t(cv), em: t(em) };
}

// 一節車廂的幾何（本地：+z 往前、x 橫向、y 往上，原點在軌面中心）；cab：前端是駕駛室
function carGeometry(cab) {
  const P = [],
    N = [],
    U = [];
  const R = (u0, v0, u1, v1) => [u0 / 1024, 1 - v1 / 512, u1 / 1024, 1 - v0 / 512]; // 像素 → uv
  const quad = (a, b, c, d, uv, n) => {
    const [u0, v0, u1, v1] = uv;
    const UV = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      P.push(...[a, b, c, d][k]);
      N.push(...n);
      U.push(...UV[k]);
    }
  };
  const hl = CAR_L / 2,
    w = HALF_W,
    y0 = 0.6,
    y1 = ROOF - 0.25,
    y2 = ROOF;
  const SIDE = R(0, 0, 1024, 256);
  // 兩側
  quad(
    [w, y0, -hl],
    [w, y0, hl],
    [w, y1 + 0.25 * 0, hl],
    [w, y1, -hl],
    [SIDE[2], SIDE[1], SIDE[0], SIDE[3] - (0.25 / 3.4) * (SIDE[3] - SIDE[1])],
    [1, 0, 0]
  );
  quad(
    [-w, y0, hl],
    [-w, y0, -hl],
    [-w, y1, -hl],
    [-w, y1, hl],
    [SIDE[0], SIDE[1], SIDE[2], SIDE[3] - (0.25 / 3.4) * (SIDE[3] - SIDE[1])],
    [-1, 0, 0]
  );
  // 車頂（兩片斜面＋平頂）
  const ROOFUV = R(512, 256, 768, 512);
  quad([w, y1, -hl], [w, y1, hl], [w - 0.35, y2, hl], [w - 0.35, y2, -hl], ROOFUV, [0.6, 0.8, 0]);
  quad(
    [-w + 0.35, y2, -hl],
    [-w + 0.35, y2, hl],
    [-w, y1, hl],
    [-w, y1, -hl],
    ROOFUV,
    [-0.6, 0.8, 0]
  );
  quad(
    [w - 0.35, y2, -hl],
    [w - 0.35, y2, hl],
    [-w + 0.35, y2, hl],
    [-w + 0.35, y2, -hl],
    ROOFUV,
    [0, 1, 0]
  );
  // 兩端
  const end = (z, s, uv) => {
    const pts = [
      [-w * s, y0, z],
      [w * s, y0, z],
      [w * s, y1, z],
      [-w * s, y1, z],
    ];
    quad(...pts, uv, [0, 0, s]);
    // 頂端的斜角
    quad(
      [-w * s, y1, z],
      [w * s, y1, z],
      [(w - 0.35) * s, y2, z],
      [-(w - 0.35) * s, y2, z],
      R(512, 256, 768, 300),
      [0, 0, s]
    );
  };
  end(hl, 1, cab ? R(0, 256, 256, 472) : R(256, 256, 512, 472));
  end(-hl, -1, R(256, 256, 512, 472));
  // 車底機器箱與轉向架
  const UND = R(768, 256, 1024, 512);
  const box = (cx, cy, cz, hx, hy, hz) => {
    const v = (i, j, k) => [cx + hx * i, cy + hy * j, cz + hz * k];
    quad(v(1, -1, -1), v(1, -1, 1), v(1, 1, 1), v(1, 1, -1), UND, [1, 0, 0]);
    quad(v(-1, -1, 1), v(-1, -1, -1), v(-1, 1, -1), v(-1, 1, 1), UND, [-1, 0, 0]);
    quad(v(1, -1, hz > 0 ? 1 : 1), v(-1, -1, 1), v(-1, 1, 1), v(1, 1, 1), UND, [0, 0, 1]);
    quad(v(-1, -1, -1), v(1, -1, -1), v(1, 1, -1), v(-1, 1, -1), UND, [0, 0, -1]);
  };
  for (const z of [-hl + 2.6, hl - 2.6]) box(0, 0.45, z, 1.2, 0.35, 1.3); // 轉向架
  box(0, 0.75, 0, 1.15, 0.25, 4.5); // 機器箱
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.computeBoundingSphere();
  return g;
}

// ---------- 班表 ----------
// 每班：在地圖參考點的時刻 tRef（遊戲分鐘）、方向 dir（+1 南下）、外觀、節數
export function schedule(rows, sNeili, sZhongli) {
  const out = [];
  for (const [tN, tZ, no, look, cars] of rows) {
    const k = (REF_S - sNeili) / (sZhongli - sNeili);
    out.push({ tRef: tN + (tZ - tN) * k, dir: tZ > tN ? 1 : -1, no, look, cars });
  }
  // 同方向前後兩班太近（追撞）：後一班往後挪到至少隔一列車長加 80 m
  for (const dir of [1, -1]) {
    const L = out.filter((t) => t.dir === dir).sort((a, b) => a.tRef - b.tRef);
    for (let i = 1; i < L.length; i++) {
      const need = (L[i - 1].cars * (CAR_L + CAR_GAP) + 80) / SPEED / 4 + 0.01; // 遊戲分鐘（現實秒 ÷ 4）
      if (L[i].tRef - L[i - 1].tRef < need) L[i].tRef = L[i - 1].tRef + need;
    }
  }
  return out;
}

export class Trains {
  // railway: src/world/Railway.js buildRailway() 的結果
  constructor(scene, railway, { weekend = false, low = false } = {}) {
    this.scene = scene;
    this.rw = railway;
    const [t0, t1] = railway.tracks;
    // 兩條軌道都換成「由內壢往中壢」量的弧長，南下用 rail[1]（反向），北上用 rail[0]
    this.track = { 1: rev(t1), [-1]: t0 };
    const s0 = t0.project(...NEILI).s;
    for (const tk of [this.track[1], this.track[-1]]) tk.sNeili = tk.project(...NEILI).s;
    this.sN = s0;
    // 各平交道在兩個方向上的位置（內壢量起的弧長）
    for (const c of railway.crossings)
      c.sI = {
        1: this.track[1].project(c.x, c.z).s - this.track[1].sNeili + s0,
        [-1]: this.track[-1].project(c.x, c.z).s - this.track[-1].sNeili + s0,
      };
    this.sZ = s0 + 3930; // 內壢 → 中壢 3.93 km
    // 只在地圖範圍（外加 250 m，看得到的距離）裡的那段軌道上出現
    const B = railway.bounds,
      inB = (p) =>
        p.x > B.minX - 250 && p.x < B.maxX + 250 && p.z > B.minZ - 250 && p.z < B.maxZ + 250;
    this.sLo = Infinity;
    this.sHi = -Infinity;
    for (let s = 0; s < t0.len; s += 10)
      if (inB(t0.at(s))) {
        this.sLo = Math.min(this.sLo, s);
        this.sHi = Math.max(this.sHi, s);
      }
    this.list = schedule(weekend ? WEEKEND : WEEKDAY, this.sN, this.sZ);
    this.low = low;
    this.mats = {};
    this.geo = { cab: carGeometry(true), mid: carGeometry(false) };
    this.active = new Map(); // 班次 → { t, cars: [mesh], s }
    this.cars = []; // 這幀在地圖上的車廂 { mesh, x, z, y, heading, speed, dirX, dirZ }
    this.night = 0;
    this._hornT = {};
  }
  _mat(look) {
    if (!this.mats[look]) {
      const t = lookTextures(LOOK[look]);
      this.mats[look] = new THREE.MeshStandardMaterial({
        map: t.map,
        emissiveMap: t.em,
        emissive: '#ffffff',
        emissiveIntensity: 0.15,
        roughness: 0.45,
        metalness: 0.25,
      });
    }
    return this.mats[look];
  }
  _mesh(look, cab) {
    const m = new THREE.Mesh(cab ? this.geo.cab : this.geo.mid, this._mat(look));
    m.castShadow = !this.low;
    m.receiveShadow = false;
    m.matrixAutoUpdate = false;
    this.scene.add(m);
    return m;
  }
  // 車頭在 tRef 時刻經過 REF_S：clock 時的車頭弧長（以內壢—中壢方向量）
  headS(t, clock) {
    let dtMin = clock - t.tRef;
    dtMin -= Math.round(dtMin / 1440) * 1440; // 跨午夜
    return REF_S + t.dir * SPEED * dtMin * 4; // 遊戲 1 分鐘 = 現實 4 秒
  }
  // 這一刻在地圖上（任何一節還在軌道範圍內）的班次
  _visible(clock) {
    const out = [];
    for (const t of this.list) {
      const h = this.headS(t, clock),
        L = t.cars * (CAR_L + CAR_GAP);
      const tail = h - t.dir * L;
      if (Math.max(h, tail) > this.sLo && Math.min(h, tail) < this.sHi) out.push([t, h]);
    }
    return out;
  }
  update(dt, clock, ctx = {}) {
    const vis = this._visible(clock),
      F = ctx.focus;
    const seen = new Set();
    this.cars.length = 0;
    for (const [t, h] of vis) {
      seen.add(t);
      let a = this.active.get(t);
      if (!a) {
        a = { t, cars: [] };
        for (let i = 0; i < t.cars; i++) {
          const cab = i === 0 || i === t.cars - 1;
          a.cars.push(this._mesh(t.look, cab));
        }
        this.active.set(t, a);
      }
      a.s = h;
      const tk = this.track[t.dir];
      for (let i = 0; i < t.cars; i++) {
        const m = a.cars[i];
        // 車廂前後端的弧長（往行進方向為前）
        const sf = h - t.dir * i * (CAR_L + CAR_GAP),
          sb = sf - t.dir * CAR_L;
        const f = tk.at(this._toTrack(tk, sf)),
          b = tk.at(this._toTrack(tk, sb));
        const x = (f.x + b.x) / 2,
          z = (f.z + b.z) / 2;
        const y = (groundY(f.x, f.z) + groundY(b.x, b.z)) / 2 + 0.12;
        let hx = f.x - b.x,
          hz = f.z - b.z;
        const hl = Math.hypot(hx, hz) || 1;
        hx /= hl;
        hz /= hl;
        const heading = Math.atan2(hx, hz);
        m.position.set(x, y, z);
        // 最後一節的駕駛室朝後
        m.rotation.set(0, i === t.cars - 1 && t.cars > 1 ? heading + Math.PI : heading, 0);
        m.updateMatrix();
        // 遠在霧裡的不畫（ctx.focus：玩家位置）
        m.visible = !F || (Math.abs(x - F.x) < FAR && Math.abs(z - F.z) < FAR);
        this.cars.push({
          mesh: m,
          x,
          y,
          z,
          heading,
          dirX: hx,
          dirZ: hz,
          speed: SPEED,
          hl: CAR_L / 2,
          hw: HALF_W,
          no: t.no,
        });
      }
    }
    for (const [t, a] of this.active)
      if (!seen.has(t)) {
        for (const m of a.cars) this.scene.remove(m);
        this.active.delete(t);
      }
    // 夜裡車窗亮
    for (const k in this.mats) this.mats[k].emissiveIntensity = 0.12 + this.night * 0.55;
    this._crossings(dt, vis, ctx.audio);
    this._sound(dt, ctx.audio);
  }
  // 從內壢量的弧長 → 該軌道自己的弧長
  _toTrack(tk, s) {
    return s - this.sN + tk.sNeili;
  }
  _crossings(dt, vis, audio) {
    for (const c of this.rw.crossings) {
      let warn = false;
      for (const [t, h] of vis) {
        const tk = this.track[t.dir],
          scI = c.sI[t.dir];
        const L = t.cars * (CAR_L + CAR_GAP);
        const ahead = (scI - h) * t.dir; // 車頭到平交道（正：還沒到）
        if (ahead < WARN_D && ahead > -(L + CLEAR_D)) warn = true;
        // 快到平交道鳴笛
        if (audio && ahead < 180 && ahead > 150) {
          const key = `${t.no}@${this.rw.crossings.indexOf(c)}`;
          if (!this._hornT[key]) {
            this._hornT[key] = 1;
            const p = tk.at(this._toTrack(tk, h));
            audio.trainHorn?.(p.x, p.z);
          }
        }
      }
      c.warn = warn;
    }
    if (Object.keys(this._hornT).length > 200) this._hornT = {};
    this.rw.update(dt);
  }
  // 行駛聲：離聽者最近那節車廂的距離，循環錄音（assets/sfx/train_run.m4a）；平交道警鈴（crossing_bell）
  _sound(dt, audio) {
    if (!audio || !audio.ctx) return;
    const Lp = audio.L;
    let best = null;
    for (const c of this.cars) {
      const dx = Lp.x - c.x,
        dz = Lp.z - c.z,
        a = Math.max(-c.hl, Math.min(c.hl, dx * c.dirX + dz * c.dirZ)),
        qx = c.x + c.dirX * a,
        qz = c.z + c.dirZ * a,
        d = Math.hypot(Lp.x - qx, Lp.z - qz);
      if (!best || d < best.d) best = { d, qx, qz, c };
    }
    if (best) {
      const v = Math.pow(Math.max(0, 1 - best.d / 320), 1.8) * 1.1;
      const dx = best.qx - Lp.x,
        dz = best.qz - Lp.z,
        d = best.d || 1;
      const pan = d < 2 ? 0 : (-dx * Math.cos(Lp.yaw) + dz * Math.sin(Lp.yaw)) / d;
      // 都卜勒：車子在聽者前後時，接近的那半邊音調高一點
      const along = -(dx * best.c.dirX + dz * best.c.dirZ) / Math.max(d, 8);
      const rate = 1 + Math.max(-0.06, Math.min(0.06, along * 0.06));
      audio.loopBufAt('train', 'train_run', v, dt, pan * 0.8, rate);
    } else audio.loopBufAt('train', 'train_run', 0, dt);
    this.rw.crossings.forEach((c, i) => {
      const on = c.warn || c.phase > 0.02;
      const dx = c.x - Lp.x,
        dz = c.z - Lp.z,
        d = Math.hypot(dx, dz);
      const v = on ? Math.pow(Math.max(0, 1 - d / 160), 1.6) * 0.7 : 0;
      const pan = d < 2 ? 0 : (-dx * Math.cos(Lp.yaw) + dz * Math.sin(Lp.yaw)) / d;
      audio.loopBufAt(`xbell${i}`, 'crossing_bell', v, dt, pan * 0.8);
    });
  }
  // 點 (x, z)、腳的高度 y 在不在某節車廂裡（pad：額外半徑）。回傳那節車廂、推出去的方向（橫向）與深度
  hit(x, z, y, pad = 0.35) {
    for (const c of this.cars) {
      if (y > c.y + ROOF + 0.3 || y < c.y - 1.5) continue;
      const dx = x - c.x,
        dz = z - c.z,
        a = dx * c.dirX + dz * c.dirZ,
        s = dx * -c.dirZ + dz * c.dirX; // 往右為正
      if (Math.abs(a) > c.hl + pad || Math.abs(s) > c.hw + pad) continue;
      const sg = s >= 0 ? 1 : -1;
      return {
        car: c,
        nx: -c.dirZ * sg, // 推出去的方向（離開車廂側面）
        nz: c.dirX * sg,
        depth: c.hw + pad - Math.abs(s),
        front: c.hl + pad - a, // 在車頭前面多深（撞到車頭）
      };
    }
    return null;
  }
  // 物理用的移動碰撞箱（src/physics/Physics.js movers）
  movers(list, x, z, r, group) {
    for (const c of this.cars) {
      if (Math.abs(c.x - x) > r || Math.abs(c.z - z) > r) continue;
      list.push({
        key: c.mesh,
        x: c.x,
        y: c.y,
        z: c.z,
        yaw: c.heading,
        r: c.hw,
        hl: c.hl,
        cy: ROOF / 2,
        hh: ROOF / 2,
        group,
      });
    }
  }
  // 現在最近的下一班（給除錯／手機 App 用）：{ no, inMin }
  next(clock) {
    let best = null;
    for (const t of this.list) {
      let d = t.tRef - clock;
      d -= Math.floor(d / 1440) * 1440;
      if (!best || d < best.inMin) best = { no: t.no, inMin: d, dir: t.dir };
    }
    return best;
  }
}

// 反轉折線方向（rail[1] 是由中壢往內壢畫的），並記下內壢在這條軌道上的弧長
function rev(tk) {
  const pts = [...tk.pts].reverse();
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    pts,
    cum,
    len,
    at: (s) => {
      const p = tk.at(len - s);
      return { x: p.x, z: p.z, dx: -p.dx, dz: -p.dz };
    },
    project: (x, z) => {
      const q = tk.project(x, z);
      return { d: q.d, s: len - q.s };
    },
  };
}
