// 聖誕節宿舍布丁事件（真實事件：2021 年 12 月，力行男宿）。
// 12 月（src/world/Season.js，照真實日期；?date=YYYY-MM-DD 可測）每天遊戲時間 21:00–23:00，力行宿舍西棟天井
// （src/world/buildings/Lixing.js，一樓涼亭和野餐桌那個中庭）擠滿戴聖誕老人帽的人：有人在發糖果點心（按 E 可以領一包），
// 其他人圍著野餐桌跳、歡呼；南邊有幾個人不知道為什麼開始丟布丁，一顆顆往上拋到二樓南迴廊，砸在 279 寢門口
// （霍華德、漢克、肉舖老闆那間），地上一攤碎掉的布丁越積越多。
// 這段時間經過宿舍看到這場面（人在天井附近、一到四樓都算，待一下下），會解鎖 🏆 隱藏成就「聖誕節宿舍布丁事件」
// （src/systems/Secrets.js 的 pudding，手機自己拿出來播解鎖動畫）。
// 只用 Math.random 和自己的種子，不動路人（src/entities/NPC.js）的亂數。
import * as THREE from 'three';
import { createCharacter, randomStudent } from './Character.js';
import { isChristmas } from '../world/Season.js';

export const PUDDING_FROM = 21 * 60,
  PUDDING_TO = 23 * 60;
// 21:00–23:00 of any day (clock = minutes since day 0)
export function puddingTime(clock) {
  const m = ((clock % 1440) + 1440) % 1440;
  return m >= PUDDING_FROM && m < PUDDING_TO;
}

// 西棟天井（Lixing.js 的 WW.g0..g1 × CZ..SG）：中間是涼亭（柱子 x 10..24、z 13.95 / 20.75）和六張野餐桌，
// 四個角有紅磚花台。人站在涼亭裡桌子之間、涼亭南北兩條空地；丟布丁的站南邊，離二樓南迴廊（z 24.9..27.3）近。
const COURT = { x0: 2.6, x1: 31.4, z0: 9.8, z1: 24.9 };
const CX = (COURT.x0 + COURT.x1) / 2,
  CZ = (COURT.z0 + COURT.z1) / 2;
// [local x, local z, role]: give = 發糖果, throw = 丟布丁, party = 跳舞／歡呼
const SPOTS = [
  [CX - 2.3, CZ - 0.2, 'give'],
  [CX + 2.3, CZ + 0.1, 'give'],
  [CX - 6.8, CZ + 0.3, 'give'],
  [CX - 1.5, CZ - 4.6, 'party'],
  [CX + 0.6, CZ - 4.9, 'party'],
  [CX + 3.4, CZ - 4.4, 'party'],
  [CX - 4.6, CZ - 5.2, 'party'],
  [CX + 6.2, CZ - 5.0, 'party'],
  [CX - 2.6, CZ + 1.4, 'party'],
  [CX + 1.1, CZ - 1.5, 'party'],
  [CX + 5.6, CZ + 1.2, 'party'],
  [CX - 8.8, CZ - 3.6, 'party'],
  [CX + 3.2, CZ + 4.6, 'throw'],
  [CX + 6.0, CZ + 5.3, 'throw'],
  [CX + 0.4, CZ + 5.0, 'party'],
  [CX - 3.8, CZ + 4.8, 'party'],
  [CX + 8.4, CZ + 4.2, 'party'],
  [CX - 7.2, CZ + 5.4, 'party'],
];
const HAT = { kind: 'santa', color: '#d21f26' };
const SPLATS = 24, // pudding puddles kept on the gallery floor (ring buffer)
  FLY = 4; // puddings in the air at once

// the room 279 door seen from the gallery: x along the door, z a little in front of it (gallery 24.9..27.3)
const doorSpot = (R, rnd) => ({
  x: R.door[0] + (rnd() - 0.5) * 1.5,
  z: 25.4 + rnd() * 1.4,
});

export class XmasPudding {
  constructor(game) {
    this.g = game;
    this.on = isChristmas();
    const L = game.interiors?.lixing,
      R = L?.rooms?.[279];
    if (!this.on || !L || !R) return (this.on = false);
    this.L = L;
    this.R = R;
    this.people = [];
    this.fly = [];
    this.live = false;
    this.seenT = 0;
    this.candyT = 0;
    this.t = 0;
    // local → world and back (Lixing's frame: x east along the north face, z south, a small rotation)
    const [ox, oz] = L.W(0, 0),
      [ax, az] = L.W(1, 0);
    this.ca = ax - ox;
    this.sa = az - oz;
    this.o = { x: ox, z: oz };
    this.y1 = L.B + L.FL[0];
    this.y2 = L.B + R.y;
    const c = this.world(CX, CZ);
    this.center = c;
    this._splatMeshes(game.scene);
    // candy: E next to one of the people handing it out
    for (const [i, s] of SPOTS.entries()) {
      if (s[2] !== 'give') continue;
      const p = this.world(s[0], s[1]);
      game.interiors.actions.push({
        x: p.x,
        z: p.z,
        r: 1.4,
        y: 0,
        anyY: true,
        cond: () => this.live && !!this.people[i] && Math.abs(game.player.pos.y - this.y1) < 1.5,
        label: () => '按 <kbd>E</kbd> 領聖誕糖果 🍬',
        fn: () => this._candy(i),
      });
    }
    game.interiors.updaters.push((dt) => this.update(dt));
  }
  world(lx, lz) {
    return {
      x: this.o.x + lx * this.ca - lz * this.sa,
      z: this.o.z + lx * this.sa + lz * this.ca,
    };
  }
  local(x, z) {
    const dx = x - this.o.x,
      dz = z - this.o.z;
    return { x: dx * this.ca + dz * this.sa, z: -dx * this.sa + dz * this.ca };
  }

  // ---------------- the crowd ----------------
  _spawn() {
    const g = this.g,
      n = Math.min(SPOTS.length, g.crowdSpec?.pudding ?? Infinity);
    let seed = 0x2021c25;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    SPOTS.forEach((s, i) => {
      const look = randomStudent(rnd);
      look.hat = HAT;
      // throwers and givers always come; the rest fill up to n
      if (s[2] === 'party' && i >= n) return;
      const ch = createCharacter(look);
      ch.root.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
      const p = this.world(s[0], s[1]);
      ch.root.position.set(p.x, this.y1, p.z);
      g.scene.add(ch.root);
      this.people[i] = {
        ch,
        p,
        role: s[2],
        h: Math.atan2(this.center.x - p.x, this.center.z - p.z) + (rnd() - 0.5) * 1.2,
        ph: rnd() * 10,
        throwT: 1 + rnd() * 3,
        armT: 0,
        mood: rnd() < 0.5 ? 'dance' : 'cheer',
      };
    });
  }
  _show(on) {
    if (on && !this.people.length) this._spawn();
    for (const n of this.people) if (n) n.ch.root.visible = on;
    if (!on) {
      for (const f of this.fly) f.mesh.visible = false;
      this.fly.length = 0;
    } else this._resetSplats();
    this.live = on;
  }

  // ---------------- pudding: cups in the air, puddles on the gallery ----------------
  _splatMeshes(scene) {
    const mk = (geo, color, n, rough = 0.35) => {
      const m = new THREE.InstancedMesh(
        geo,
        new THREE.MeshStandardMaterial({ color, roughness: rough }),
        n
      );
      m.count = 0;
      m.frustumCulled = false;
      m.visible = false;
      scene.add(m);
      return m;
    };
    this.custard = mk(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), '#f2c24a', SPLATS);
    this.caramel = mk(
      new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2),
      '#7a3d12',
      SPLATS,
      0.2
    );
    this.chunks = mk(new THREE.DodecahedronGeometry(1, 0), '#f5cd5b', SPLATS * 4);
    this.cupGeo = new THREE.CylinderGeometry(0.045, 0.036, 0.07, 10);
    this.cupMat = new THREE.MeshStandardMaterial({ color: '#f2c24a', roughness: 0.4 });
    this.topMat = new THREE.MeshStandardMaterial({ color: '#6b3410', roughness: 0.3 });
    this.topGeo = new THREE.CylinderGeometry(0.037, 0.037, 0.012, 10).translate(0, 0.04, 0);
    this.cups = [];
    for (let i = 0; i < FLY; i++) {
      const cup = new THREE.Mesh(this.cupGeo, this.cupMat);
      cup.add(new THREE.Mesh(this.topGeo, this.topMat));
      cup.visible = false;
      scene.add(cup);
      this.cups.push(cup);
    }
    this.si = 0;
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.v3 = new THREE.Vector3();
    this.s3 = new THREE.Vector3();
  }
  // a fresh night: the puddles already on the floor when you get there (it started before 21:00 in the story too)
  _resetSplats() {
    this.si = 0;
    this.custard.count = this.caramel.count = this.chunks.count = 0;
    let s = 279;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 6; i++) this._splat(doorSpot(this.R, rnd), rnd);
    for (const m of [this.custard, this.caramel, this.chunks]) m.visible = true;
  }
  _splat(lp, rnd = Math.random) {
    const i = this.si++ % SPLATS,
      p = this.world(lp.x, lp.z),
      y = this.y2 + 0.012 + (i % 6) * 0.0015,
      r = 0.12 + rnd() * 0.16,
      rot = rnd() * Math.PI;
    const put = (mesh, k, x, yy, z, sx, sy, sz, rx = 0, ry = rot, rz = 0) => {
      this.v3.set(x, yy, z);
      this.q.setFromEuler(this.e.set(rx, ry, rz));
      this.s3.set(sx, sy, sz);
      mesh.setMatrixAt(k, this.m4.compose(this.v3, this.q, this.s3));
      mesh.count = Math.max(mesh.count, k + 1);
      mesh.instanceMatrix.needsUpdate = true;
    };
    put(this.custard, i, p.x, y, p.z, r, 1, r * (0.55 + rnd() * 0.4));
    put(
      this.caramel,
      i,
      p.x + (rnd() - 0.5) * r * 0.6,
      y + 0.002,
      p.z + (rnd() - 0.5) * r * 0.6,
      r * 0.42,
      1,
      r * 0.3
    );
    for (let k = 0; k < 4; k++) {
      const a = rnd() * Math.PI * 2,
        d = r * (0.9 + rnd() * 1.6),
        sz = 0.015 + rnd() * 0.022;
      put(
        this.chunks,
        i * 4 + k,
        p.x + Math.cos(a) * d,
        this.y2 + sz * 0.5,
        p.z + Math.sin(a) * d,
        sz,
        sz * 0.6,
        sz,
        rnd() * 3,
        rnd() * 3,
        rnd() * 3
      );
    }
  }
  _throw(n) {
    const cup = this.cups.find((c) => !c.visible);
    if (!cup) return;
    const to = doorSpot(this.R, Math.random),
      a = { x: n.p.x, y: this.y1 + 1.55, z: n.p.z },
      b = { ...this.world(to.x, to.z), y: this.y2 + 0.03 },
      T = 1.05 + Math.random() * 0.25,
      G = 9.8;
    // lob: enough upward speed to land on the gallery after T seconds (clears the 2F parapet on the way)
    const v = {
      x: (b.x - a.x) / T,
      z: (b.z - a.z) / T,
      y: (b.y - a.y + 0.5 * G * T * T) / T,
    };
    n.h = Math.atan2(b.x - a.x, b.z - a.z);
    n.armT = 0.45;
    cup.position.set(a.x, a.y, a.z);
    cup.visible = true;
    this.fly.push({ mesh: cup, v, t: 0, T, to, spin: (Math.random() - 0.5) * 18, G });
  }
  _flyTick(dt) {
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const f = this.fly[i];
      f.t += dt;
      f.v.y -= f.G * dt;
      f.mesh.position.x += f.v.x * dt;
      f.mesh.position.y += f.v.y * dt;
      f.mesh.position.z += f.v.z * dt;
      f.mesh.rotation.x += f.spin * dt;
      f.mesh.rotation.z += f.spin * 0.6 * dt;
      if (f.t >= f.T) {
        f.mesh.visible = false;
        this.fly.splice(i, 1);
        this._splat(f.to);
        const p = f.mesh.position,
          A = this.g.audio;
        A?.at?.(p.x, p.z, 45, () => {
          A.noise(0.14, 420, 0.8, 0.35, 0, 'lowpass', -200);
          A.noise(0.06, 1800, 2, 0.08, 0.02);
        });
      }
    }
  }

  _candy(i) {
    const g = this.g,
      n = this.people[i];
    if (n) {
      const p = g.player.worldPos();
      n.h = Math.atan2(p.x - n.p.x, p.z - n.p.z);
      n.armT = 0.8;
    }
    if (this.candyT > 0) return g.hud?.toast('🎅 「一人一包啦，後面還有人在排！」', 'warn', 2000);
    this.candyT = 25;
    g.audio?.pickup?.();
    const what = ['一包聖誕拐杖糖', '一盒巧克力', '一包小熊軟糖', '一根棒棒糖', '一包乖乖'];
    g.hud?.toast(
      `🍬 戴聖誕帽的學長塞給你${what[Math.floor(Math.random() * what.length)]}：「聖誕快樂！」`,
      'good',
      2600
    );
  }

  // ---------------- per frame ----------------
  update(dt) {
    const g = this.g;
    if (!this.on || !g.player) return;
    const p = g.player.worldPos(),
      d = Math.hypot(p.x - this.center.x, p.z - this.center.z),
      want = puddingTime(g.clock) && d < 90;
    if (want !== this.live) this._show(want);
    if (!this.live) {
      this.seenT = 0;
      return;
    }
    this.t += dt;
    this.candyT = Math.max(0, this.candyT - dt);
    const close = d < 30;
    for (const n of this.people) {
      if (!n) continue;
      n.armT = Math.max(0, n.armT - dt);
      if (n.role === 'throw' && (n.throwT -= dt) <= 0) {
        n.throwT = 2.2 + Math.random() * 3.5;
        this._throw(n);
      }
      const r = n.ch.root;
      r.rotation.y = n.h + (n.role === 'party' ? Math.sin(this.t * 0.7 + n.ph) * 0.5 : 0);
      n.ch.setDetail(close && Math.hypot(p.x - n.p.x, p.z - n.p.z) < 14);
      if (!close) continue;
      const pose =
        n.armT > 0 ? 'give' : n.role === 'give' ? 'wave' : n.role === 'throw' ? 'cheer' : n.mood;
      n.ch.update(dt, { mode: 'foot', speed: 0, pose });
      // don't walk through them on the 1F
      if (!g.player.vehicle && Math.abs(p.y - this.y1) < 1.5) {
        const q = g.player.pos,
          dx = q.x - n.p.x,
          dz = q.z - n.p.z,
          dd = Math.hypot(dx, dz);
        if (dd < 0.5 && dd > 1e-4) {
          q.x = n.p.x + (dx / dd) * 0.5;
          q.z = n.p.z + (dz / dd) * 0.5;
        }
      }
    }
    this._flyTick(dt);
    this._watch(dt, p, d);
  }
  // you saw it: anywhere round the west courtyard, 1F to 4F (the galleries look down on it), for a moment
  _watch(dt, p, d) {
    const g = this.g;
    if (!g.secrets || g.secrets.got.pudding != null) return;
    const lp = this.local(p.x, p.z),
      inWing = lp.x > -3 && lp.x < 40 && lp.z > 4 && lp.z < 38,
      sees = (inWing || d < 22) && p.y > this.y1 - 2 && p.y < this.y1 + 13;
    this.seenT = sees ? this.seenT + dt : 0;
    if (this.seenT < 1.5) return;
    this.seenT = -1e9;
    g.secrets.unlock('pudding');
    g.hud?.toast('🎅 男宿天井一堆戴聖誕帽的人……欸？怎麼變丟布丁了啦！', 'good', 3200);
    setTimeout(() => g.phone?.revealSecret?.('pudding'), 2600);
  }
}
