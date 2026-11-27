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
import { CAR_L, HALF_W, ROOF, LOOK, carGeometry, carMaterial, cargoKind } from './TrainModel.js';

export const SPEED = 25; // m/s（90 km/h，內壢—中壢站間的行駛速度）
const CAR_GAP = 0.5; // 車廂之間（貫通道各伸出 0.25 m 接在一起）
const RAIL_TOP = 0.04; // 鋼軌頂離地面（src/world/MapBuilder.js 的鋼軌）
const WARN_D = 175; // 車頭到達前約 7 秒開始響鈴、閃燈
const CLEAR_D = 6;
export const FREIGHT_PER_DAY = 4; // 每天幾班換成貨物列車
export const GAP_MIN = 17; // 同方向兩班之間至少隔幾分鐘（遊戲時間，現實 68 秒）才開：平日約 98 班、週六約 96 班（全部的一半）
const FAR = 600; // 離玩家這麼遠的車廂不畫
const NEILI = [1584.5, -1625.4]; // 內壢站（地圖座標，換算自經緯度）
const REF_S = 2560; // 班表換算的參考點：rail[0] 上的弧長（地圖中段，三個平交道之間）

// ---------- 外觀 ----------
// 車廂模型與塗裝在 src/entities/TrainModel.js：每種塗裝一份材質，車頭／車尾／中間車／有集電弓的中間車各一份幾何
const TRAIN_RUN_D = 170; // 行駛聲傳得到的距離：鐵道旁第一排住家（10～40 m）聽得清楚，再一兩條街就聽不到
const SHAKE_D = 45; // 這距離內感覺得到地面輕微震動（鏡頭微晃）

// ---------- 班表 ----------
// 每班：在地圖參考點的時刻 tRef（遊戲分鐘）、方向 dir（+1 南下）、外觀、節數
// day（例如 20261127）：當天隨機挑 FREIGHT_PER_DAY 班改成貨物列車（貨櫃或軍運），同一天每次都挑一樣的；省略就不換
export function schedule(rows, sNeili, sZhongli, gap = GAP_MIN, day = null) {
  const out = [];
  for (const [tN, tZ, no, look, cars] of rows) {
    const k = (REF_S - sNeili) / (sZhongli - sNeili);
    out.push({ tRef: tN + (tZ - tN) * k, dir: tZ > tN ? 1 : -1, no, look, cars });
  }
  // 只開部分班次：同方向離上一班不到 gap 遊戲分鐘的不開（時刻照舊是真實班表的時刻）。全部都開的話，遊戲時鐘
  // 快 15 倍，尖峰時段平交道約七成時間關著；每方向至少隔 17 分鐘時約三到四成。gap 0：全部都開
  const kept = [];
  for (const dir of [1, -1]) {
    let last = -Infinity;
    for (const t of out.filter((t) => t.dir === dir).sort((a, b) => a.tRef - b.tRef)) {
      if (t.tRef - last < gap) continue;
      kept.push(t);
      last = t.tRef;
    }
  }
  // 貨物列車：臺鐵開放資料的班表沒有貨運班次，所以每天從會開的班次裡隨機挑幾班換成貨櫃列車或軍運列車
  // （時刻不變；節數改成貨物列車的節數，下面的追撞間隔照新節數算）
  if (day !== null) {
    let r = day % 2147483647 || 1;
    const rnd = () => (r = (r * 48271) % 2147483647) / 2147483647;
    const pool = [...kept].sort((a, b) => a.tRef - b.tRef);
    for (let n = 0; n < FREIGHT_PER_DAY && pool.length; n++) {
      const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const mil = rnd() < 0.3;
      t.look = mil ? 'military' : 'freight';
      t.cars = mil ? 10 : 13;
      t.seed = Math.floor(rnd() * 1000);
    }
  }
  // 同方向前後兩班太近（追撞）：後一班往後挪到至少隔一列車長加 80 m
  for (const dir of [1, -1]) {
    const L = kept.filter((t) => t.dir === dir).sort((a, b) => a.tRef - b.tRef);
    for (let i = 1; i < L.length; i++) {
      const need = (L[i - 1].cars * (CAR_L + CAR_GAP) + 80) / SPEED / 4 + 0.01; // 遊戲分鐘（現實秒 ÷ 4）
      if (L[i].tRef - L[i - 1].tRef < need) L[i].tRef = L[i - 1].tRef + need;
    }
  }
  return kept;
}

export class Trains {
  // railway: src/world/Railway.js buildRailway() 的結果
  // day：今天的日期（20261127 這種數字），決定今天哪幾班是貨物列車
  constructor(scene, railway, { weekend = false, low = false, day = null } = {}) {
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
    this.list = schedule(weekend ? WEEKEND : WEEKDAY, this.sN, this.sZ, GAP_MIN, day);
    this.low = low;
    this.mats = {};
    this.geo = {};
    this.shake = 0; // 0…1：玩家附近有火車經過時地面的震動（src/core/GameLoop.js 讓鏡頭微晃）
    this.active = new Map(); // 班次 → { t, cars: [mesh], s }
    this.cars = []; // 這幀在地圖上的車廂 { mesh, x, z, y, heading, speed, dirX, dirZ }
    this.night = 0;
    this._hornT = {};
  }
  _mat(look) {
    if (!this.mats[look]) this.mats[look] = carMaterial(look);
    return this.mats[look];
  }
  // kind：head／tail／mid／midP（src/entities/TrainModel.js carGeometry）
  _mesh(look, kind) {
    const k = `${look}:${kind}`;
    if (!this.geo[k]) this.geo[k] = carGeometry(look, kind);
    const m = new THREE.Mesh(this.geo[k], this._mat(look));
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
          const last = i === t.cars - 1;
          const kind = LOOK[t.look].cargo
            ? cargoKind(t.look, i, last, t.seed || 0)
            : i === 0
              ? 'head'
              : last
                ? 'tail'
                : i % 4 === 2
                  ? 'midP'
                  : 'mid';
          const m = this._mesh(t.look, kind);
          m.userData.tail = kind === 'tail'; // 客車最後一節的駕駛室朝後；貨物列車最後一節不轉
          a.cars.push(m);
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
        const y = (groundY(f.x, f.z) + groundY(b.x, b.z)) / 2 + RAIL_TOP;
        let hx = f.x - b.x,
          hz = f.z - b.z;
        const hl = Math.hypot(hx, hz) || 1;
        hx /= hl;
        hz /= hl;
        const heading = Math.atan2(hx, hz);
        m.position.set(x, y, z);
        // 最後一節的駕駛室朝後
        m.rotation.set(0, m.userData.tail ? heading + Math.PI : heading, 0);
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
    for (const k in this.mats) this.mats[k].emissiveIntensity = 0.06 + this.night * 0.9;
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
    this.shake = 0;
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
    this.shake = best ? Math.pow(Math.max(0, 1 - best.d / SHAKE_D), 2) : 0;
    if (best) {
      const v = Math.pow(Math.max(0, 1 - best.d / TRAIN_RUN_D), 2.2) * 1.1;
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
      const v = on ? Math.pow(Math.max(0, 1 - d / 110), 1.6) * 0.7 : 0;
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
