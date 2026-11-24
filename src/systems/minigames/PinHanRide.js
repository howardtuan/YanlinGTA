// 「漢堡車」：支線「幫品漢堡找一台車」（src/systems/quests/PinHanCar.js）完成後，品漢堡幫你在手機裝的 App。
// 每個遊戲天可以免費搭一次：在 App 選一個目的地，品漢堡馬上開車出現在你旁邊，約 18 秒的 21:9 過場：
//   1. 第三人稱：你招手，他的車沿著路開過來停在你旁邊；
//   2. 你走到右前門上車（坐副駕）；
//   3. 第一人稱坐在副駕：看他開車、窗外景色沿著導航的道路往後退（真的沿著路網開，src/systems/Navigation.js astar）；
//   4. 第三人稱：車開到目的地旁邊的路上停好，你下車、跟他道謝，他把車開走。
// 結束後你站在目的地旁邊。Esc／E 可以跳過（直接到目的地）。玩家在過場中凍結（src/core/Game.js busy 清單）。
import * as THREE from 'three';
import { Vehicle } from '../../entities/Vehicles.js';
import { createPinHan } from '../../entities/npcs/PinHan.js';
import { surfaceAt } from '../../world/Terrain.js';
import { astar } from '../Navigation.js';

// where he can take you (x, z: a point at the place; the car stops on the nearest road)
export const RIDE_PLACES = [
  { key: 'im', name: '資訊管理學系館', icon: '💻', x: 91.8, z: 131.7 },
  { key: 'lixing', name: '力行宿舍', icon: '🛏️', at: (g) => g.zz?.spots?.dormZz },
  { key: 'lib', name: '張靜愚紀念圖書館', icon: '📚', x: -151.9, z: -42.3 },
  { key: 'sac', name: '學生活動中心', icon: '🍟', x: -161.4, z: -124.8 },
  { key: 'gym', name: '中原大學體育館', icon: '🏐', x: -45.7, z: -252.5 },
  { key: 'gate', name: '正門（茶學苑）', icon: '🧋', x: -201.2, z: 86 },
  { key: 'tower', name: '二一鐘塔', icon: '🕰️', x: -13.8, z: 96.4 },
  { key: 'market', name: '中原夜市', icon: '🏮', x: -190.8, z: 348.7 },
  { key: 'home', name: '彥霖家', icon: '🏠', at: (g) => g.interiors?.yh?.door },
];
const T_COME = 4.2, // the car comes up and stops
  T_BOARD = 5.8, // you walk to the door and get in
  T_RIDE = 12.8, // first person in the passenger seat
  T_ARRIVE = 15.6, // third person: it pulls up at the place
  T_THANKS = 18.2, // you get out and say thanks
  T_END = 20; // he drives off
const RIDE_SPEED = 12.5; // m/s while you look out of the window
const SUBS = [
  [0.4, 2.6, '彥霖：「漢堡！這邊！」'],
  [4.4, 5.8, '品漢堡：「上車。」'],
  [7.0, 9.6, '彥霖：「今天也讀了一整天？」'],
  [9.6, 11.4, '品漢堡：「嗯。」'],
  [16.0, 17.4, '彥霖：「謝啦漢堡！」'],
  [17.4, 18.6, '品漢堡：「嗯。明天見。」'],
];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => t * t * (3 - 2 * t);

// a polyline [[x, z], ...] with lengths: position and heading s metres along it
function line(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++)
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = acc[acc.length - 1];
  return {
    len,
    at(s) {
      s = Math.max(0, Math.min(len, s));
      let i = 1;
      while (i < acc.length - 1 && acc[i] < s) i++;
      const a = pts[i - 1],
        b = pts[i] || a,
        l = acc[i] - acc[i - 1] || 1,
        k = (s - acc[i - 1]) / l;
      return {
        x: a[0] + (b[0] - a[0]) * k,
        z: a[1] + (b[1] - a[1]) * k,
        h: Math.atan2(b[0] - a[0], b[1] - a[1]),
      };
    },
  };
}

// the cabin for the first-person shot, in the car's frame (+z forward, +x left; the body is 1.8 m wide, the cabin glass
// 0.92–1.48 m up from z −1.35 to 0.85, src/entities/Vehicles.js buildCar): dashboard, steering wheel on his side, centre
// console with a screen, roof lining, pillars, door panels with the window sills, mirror, seats, and the bonnet ahead
function buildInterior(v) {
  const g = new THREE.Group(),
    mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }),
    dark = mat('#2a2b30'),
    trim = mat('#3d3f46'),
    liner = mat('#d9d3c7', { roughness: 1 }),
    seat = mat('#2f3036', { roughness: 0.95 });
  const box = (w, h, d, m, x, y, z, rx = 0) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.rotation.x = rx;
    g.add(o);
    return o;
  };
  const body = v.mesh.children.find((o) => o.isMesh)?.material || mat('#888');
  box(1.76, 0.05, 1.3, body, 0, 0.92, 1.5, 0.04); // bonnet
  box(1.62, 0.24, 0.42, dark, 0, 0.84, 0.66); // dashboard
  box(1.62, 0.05, 0.34, dark, 0, 0.97, 0.72, 0.28); // its padded top, sloping to the glass
  box(0.46, 0.09, 0.16, dark, 0.38, 1.02, 0.6); // instrument hood
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 28), mat('#1b1b1f'));
  wheel.position.set(0.38, 0.98, 0.42);
  wheel.rotation.x = -1.15;
  g.add(wheel);
  box(0.05, 0.05, 0.25, dark, 0.38, 0.93, 0.52, -0.45); // column
  box(0.26, 0.34, 0.72, dark, 0, 0.55, 0.2); // centre console
  box(
    0.24,
    0.14,
    0.02,
    mat('#122a44', { emissive: '#2a6fe0', emissiveIntensity: 0.6 }),
    0,
    0.95,
    0.5,
    -0.3
  ); // screen
  box(1.62, 0.03, 2.1, liner, 0, 1.47, -0.25); // roof lining
  for (const s of [-1, 1]) {
    // A-pillar from the bottom corner of the windscreen up to the roof
    const a = new THREE.Vector3(0.79 * s, 0.95, 0.86),
      b = new THREE.Vector3(0.76 * s, 1.46, 0.48),
      l = a.distanceTo(b),
      p = box(0.06, l, 0.08, trim, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    p.rotation.x = Math.atan2(b.z - a.z, b.y - a.y);
    box(0.06, 0.56, 0.14, trim, 0.79 * s, 1.2, -0.4); // B-pillar
    box(0.06, 0.52, 2.1, trim, 0.8 * s, 0.66, -0.25); // door panel
    box(0.12, 0.04, 2.1, dark, 0.76 * s, 0.93, -0.25); // window sill
    box(0.5, 0.62, 0.12, seat, 0.38 * s, 0.82, -0.5, -0.12); // seat back
    box(0.5, 0.12, 0.5, seat, 0.38 * s, 0.5, -0.25); // seat
    box(0.26, 0.2, 0.1, seat, 0.38 * s, 1.24, -0.55, -0.12); // headrest
  }
  box(0.22, 0.06, 0.02, mat('#202024', { roughness: 0.3, metalness: 0.6 }), 0, 1.34, 0.7); // mirror
  box(0.02, 0.1, 0.02, dark, 0, 1.41, 0.7);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, 0.5),
    new THREE.MeshBasicMaterial({
      color: '#a9cbe0',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    })
  );
  glass.position.set(0, 1.2, 0.86);
  glass.rotation.x = -0.6;
  g.add(glass);
  return g;
}

export class PinHanRide {
  constructor(game) {
    this.g = game;
    this.run = null;
    this.state = { day: -1 }; // the game day of the last free ride
    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
  }
  get cinema() {
    return !!this.run;
  }
  get installed() {
    return !!this.g.pinhanCar?.done;
  }
  get usedToday() {
    return this.state.day === Math.floor(this.g.clock / 1440);
  }
  place(key) {
    const P = RIDE_PLACES.find((p) => p.key === key);
    if (!P) return null;
    const a = P.at ? P.at(this.g) : P;
    return a ? { ...P, x: a.x, z: a.z } : null;
  }
  // the car and him at the wheel (built once)
  _car() {
    if (this.car) return this.car;
    const v = new Vehicle('car', Math.random);
    this.outside = [...v.mesh.children]; // the body (a few boxes, src/entities/Vehicles.js buildCar): hidden while you sit inside
    this.inside = buildInterior(v);
    this.inside.visible = false;
    v.mesh.add(this.inside);
    const d = createPinHan();
    d.root.position.copy(v.seat);
    d.root.position.y -= 0.12; // low in the seat, so his head stays under the roof
    d.root.scale.setScalar(0.9);
    v.mesh.add(d.root);
    d.update(0.1, { mode: 'drive', speed: 0, pose: 'wheel' });
    this.driver = d;
    return (this.car = v);
  }
  _nodes() {
    return this.g.world.driveNodes || [];
  }
  _near(x, z) {
    let b = null,
      bd = Infinity;
    for (const n of this._nodes()) {
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bd) {
        bd = d;
        b = n;
      }
    }
    return b;
  }
  // returns an error message, or null when he is on his way
  call(key) {
    const g = this.g,
      pl = g.player;
    if (!this.installed) return '還沒安裝漢堡車';
    if (this.run) return '🚗 品漢堡已經在路上了';
    if (this.usedToday) return '🚗 今天的免費搭乘用過了，明天再找漢堡';
    if (pl.vehicle) return '先下車再叫漢堡車';
    if (g.race?.state && g.race.state !== 'idle') return '比賽中不能叫車';
    if (g.job?.active || g.gate?.active) return '打工中不能叫車';
    const p = pl.worldPos();
    if (pl.y > 1 || g.interiors.zoneAt(p.x, p.z, pl.y)) return '車開不進來，先走到戶外再叫';
    const dest = this.place(key);
    if (!dest) return '找不到這個地方';
    const w = g.world;
    const rp = w.nearestRoadPoint(p.x, p.z, true);
    if (!rp || Math.hypot(rp.x - p.x, rp.z - p.z) > 40)
      return '附近沒有車可以開進來的路，走到路邊再叫';
    const dp = w.nearestRoadPoint(dest.x, dest.z, true);
    if (Math.hypot(dp.x - p.x, dp.z - p.z) < 25) return '你已經在這附近了';
    // the route there along the drivable roads (one-way respected), from the pickup to the drop-off
    const s = this._near(rp.x, rp.z),
      t = this._near(dp.x, dp.z);
    const mid = (s && t && astar(s, t, true)) || [];
    const route = line([[rp.x, rp.z], ...mid, [dp.x, dp.z]]);
    // where he comes from: ~45 m back along the road you are next to (any way the graph goes)
    const back = [[rp.x, rp.z]];
    let n = s,
      prev = null,
      gone = 0;
    if (n) back.push([n.x, n.z]);
    while (n && gone < 45) {
      const opts = n.adj.filter((e) => e.drive && e.to !== prev);
      if (!opts.length) break;
      const e = opts[Math.floor(Math.random() * opts.length)];
      gone += Math.hypot(e.to.x - n.x, e.to.z - n.z);
      prev = n;
      n = e.to;
      back.push([n.x, n.z]);
    }
    if (back.length < 3) {
      const h0 = route.at(0).h;
      back.push([rp.x - Math.sin(h0) * 45, rp.z - Math.cos(h0) * 45]);
    }
    const come0 = line(back.reverse()),
      c0 = Math.max(0, come0.len - 50); // the last 50 m of it
    const come = { len: come0.len - c0, at: (d) => come0.at(c0 + d) };
    // pull up a lane to the right of the centre line; you stand on the kerb beside the passenger door
    const lane = (o, side = 1.6) => {
      const rx = -Math.cos(o.h),
        rz = Math.sin(o.h);
      return { x: o.x + rx * side, z: o.z + rz * side, h: o.h };
    };
    const stop = lane(come.at(come.len)),
      kerb = lane(stop, 2.2);
    const arriveFrom = Math.max(0, route.len - 38),
      rideTo = Math.min(arriveFrom, RIDE_SPEED * (T_RIDE - T_BOARD));
    const drop = lane(route.at(route.len)),
      out = lane(drop, 2.2);
    const v = this._car();
    g.scene.add(v.mesh);
    v.mesh.visible = true;
    // you stand on the kerb, facing the road where he comes from
    pl.place(kerb.x, kerb.z, Math.atan2(-Math.cos(stop.h), Math.sin(stop.h)) + Math.PI);
    this.run = { t: 0, come, route, rideTo, arriveFrom, stop, kerb, drop, out, dest, lane };
    this.state.day = Math.floor(g.clock / 1440);
    g._saveT = 9.5;
    this._cinema(true);
    return null;
  }
  // ---------------- 21:9 ----------------
  _cinema(on) {
    let el = document.getElementById('cinema');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cinema';
      el.innerHTML = '<i class="cb cb-a"></i><i class="cb cb-b"></i>';
      document.body.appendChild(el);
    }
    const W = innerWidth,
      Hh = innerHeight,
      A = 21 / 9,
      tall = W / A <= Hh,
      bar = tall ? (Hh - W / A) / 2 : (W - Hh * A) / 2;
    el.classList.toggle('side', !tall);
    el.style.setProperty('--bar', `${bar}px`);
    document.body.classList.toggle('cinema', on);
    let cap = document.getElementById('rideCap');
    if (on && !cap) {
      cap = document.createElement('div');
      cap.id = 'rideCap';
      cap.innerHTML =
        '<div class="rec">🚗 漢堡車</div><div class="skip">Esc／E 跳過</div><div class="sub"></div>';
      document.body.appendChild(cap);
    }
    if (cap) {
      cap.style.setProperty('--bar', `${tall ? bar : 0}px`);
      cap.style.display = on ? '' : 'none';
      if (on) cap.querySelector('.rec').textContent = `🚗 漢堡車 → ${this.run?.dest.name || ''}`;
    }
    const g = this.g,
      c = g.camera;
    if (on) {
      g.input.releaseAll?.();
      g.audio.setEngine?.(false, 0);
      this._fov = c.fov;
    } else if (this._fov) {
      c.fov = this._fov;
      c.updateProjectionMatrix();
      this._fov = null;
    }
  }
  _setCar(o, speed, dt) {
    const v = this.car;
    v.pos.set(o.x, 0, o.z);
    v.heading = v.moveAng = o.h;
    v.speed = speed;
    v.sync(dt);
  }
  update(dt, inp) {
    const R = this.run;
    if (!R) return;
    const g = this.g,
      pl = g.player;
    if (inp?.hit?.('Escape', 'KeyE')) {
      this._finish();
      return;
    }
    const t = (R.t += dt);
    const ch = pl.ch;
    if (t < T_COME) {
      // he comes along the road and pulls up beside you
      const k = 1 - Math.pow(1 - clamp01(t / T_COME), 2.2);
      const o = R.come.at(R.come.len * k),
        lo = R.lane(o);
      this._setCar(lo, (1 - k) * 14, dt);
      ch.root.visible = true;
      pl.place(
        R.kerb.x,
        R.kerb.z,
        Math.atan2(this.car.pos.x - R.kerb.x, this.car.pos.z - R.kerb.z)
      );
      ch.update(dt, { speed: 0, mode: 'foot', pose: t < 3 ? 'wave' : null });
    } else if (t < T_BOARD) {
      // you walk round to the passenger door (the car's right) and get in
      this._setCar(R.stop, 0, dt);
      const k = clamp01((t - T_COME) / (T_BOARD - T_COME - 0.4)),
        h = R.stop.h,
        door = { x: R.stop.x - Math.cos(h) * 1.2, z: R.stop.z + Math.sin(h) * 1.2 };
      const x = R.kerb.x + (door.x - R.kerb.x) * k,
        z = R.kerb.z + (door.z - R.kerb.z) * k;
      pl.place(x, z, Math.atan2(door.x - R.kerb.x, door.z - R.kerb.z));
      ch.root.visible = k < 1;
      ch.update(dt, { speed: k < 1 ? 1.4 : 0, mode: 'foot' });
    } else if (t < T_RIDE) {
      // riding: along the route; you go with the car (so the town around streams in as you pass)
      const k = (t - T_BOARD) / (T_RIDE - T_BOARD),
        s = (R.rideTo * (k < 0.2 ? 2.5 * k * k : k - 0.1)) / 0.9; // pulls away, then a steady speed
      const o = R.lane(R.route.at(s), 0.9); // nearer the middle while driving: campus roads are narrow, trees at the edge
      this._setCar(o, RIDE_SPEED, dt);
      ch.root.visible = false;
      pl.place(o.x, o.z, o.h);
    } else if (t < T_ARRIVE) {
      // pulling up at the place
      const k = 1 - Math.pow(1 - clamp01((t - T_RIDE) / (T_ARRIVE - T_RIDE - 0.3)), 2),
        s = R.arriveFrom + (R.route.len - R.arriveFrom) * k;
      const o = R.lane(R.route.at(s), 0.9 + 0.7 * k); // pulls over to the kerb
      this._setCar(o, (1 - k) * 12, dt);
      ch.root.visible = false;
      pl.place(o.x, o.z, o.h);
    } else if (t < T_THANKS) {
      // you get out on the kerb side and thank him
      this._setCar(R.drop, 0, dt);
      ch.root.visible = true;
      const h = R.drop.h;
      pl.place(R.out.x, R.out.z, Math.atan2(R.drop.x - R.out.x, R.drop.z - R.out.z));
      ch.update(dt, { speed: 0, mode: 'foot', pose: t > 15.9 ? 'wave' : null });
      if (this.driver) this.driver.head.rotation.y = -0.6 * clamp01((t - T_ARRIVE) * 2) + 0 * h;
    } else if (t < T_END) {
      // he drives off
      const k = clamp01((t - T_THANKS) / (T_END - T_THANKS)),
        d = k * k * 18,
        h = R.drop.h;
      this._setCar(
        { x: R.drop.x + Math.sin(h) * d, z: R.drop.z + Math.cos(h) * d, h },
        4 + k * 10,
        dt
      );
      ch.update(dt, { speed: 0, mode: 'foot', pose: 'wave' });
      if (this.driver) this.driver.head.rotation.y = 0;
    } else {
      this._finish();
      return;
    }
    if (this.driver) this.driver.update(dt, { mode: 'drive', speed: 0, pose: 'wheel' });
    const sub = SUBS.find(([a, b]) => t >= a && t < b),
      el = document.querySelector('#rideCap .sub');
    if (el) el.textContent = sub ? sub[2] : '';
  }
  // inside: the cabin instead of the body boxes (whose undersides would fill the view)
  _inside(on) {
    if (this._in === on) return;
    this._in = on;
    for (const o of this.outside) o.visible = !on;
    this.inside.visible = on;
  }
  // the car does not steer round people: while it drives, anyone standing in its way is out of the picture
  // (pedestrians, src/entities/NPC.js Peds, and the standing NPCs), and back once it has passed
  _clear(on) {
    const g = this.g,
      hid = (this._hid ||= new Set()),
      c = this.car?.pos;
    const near = (o) => on && c && Math.hypot(o.x - c.x, o.z - c.z) < 3.4;
    const people = [
      ...(g.peds?.active?.() || []).map((q) => ({ root: q.ch?.root, p: q.pos })),
      ...(g.npcs || []).map((n) => ({ root: n.ch?.root, p: n.ch?.root.position })),
    ];
    for (const { root, p } of people) {
      if (!root || !p) continue;
      if (near(p) && root.visible) {
        root.visible = false;
        hid.add(root);
      } else if (!near(p) && hid.has(root)) {
        root.visible = true;
        hid.delete(root);
      }
    }
    if (!on) {
      for (const r of hid) r.visible = true;
      hid.clear();
    }
  }
  // the film camera (after the normal rig)
  camera(cam) {
    const R = this.run;
    if (!R) return;
    const t = R.t,
      v = this.car;
    this._inside(t >= T_BOARD && t < T_RIDE);
    this._clear(t >= T_BOARD && t < T_ARRIVE);
    let fov = 50;
    if (t < T_BOARD) {
      // on the road a few metres ahead of where he stops (roads are clear of signs and trees), looking back past you
      // at him coming up the road
      const h = R.stop.h,
        k = R.kerb,
        st = R.stop,
        gy = surfaceAt(k.x, k.z);
      cam.position.set(
        st.x + Math.sin(h) * 7.5 + Math.cos(h) * 0.6,
        gy + 1.6,
        st.z + Math.cos(h) * 7.5 - Math.sin(h) * 0.6
      );
      const m = v.mesh.position,
        f = t < T_COME ? 0.45 : 0.15;
      cam.lookAt(k.x + (m.x - k.x) * f, gy + 1.1, k.z + (m.z - k.z) * f);
      fov = 50;
    } else if (t < T_RIDE) {
      // first person in the passenger seat (the car's right front), looking ahead and a little at him
      v.mesh.updateMatrixWorld(true);
      // mostly the road ahead and the view out of the window; a glance at him while he answers
      const glance = ease(clamp01((t - 9.3) * 2.5)) * (1 - ease(clamp01((t - 11.3) * 2.5))),
        look = Math.sin((t - T_BOARD) * 0.5) * 0.12 - 0.08 + glance * 0.75;
      cam.position.copy(v.mesh.localToWorld(this._v.set(-0.5, 1.2, -0.32)));
      cam.lookAt(
        v.mesh.localToWorld(
          this._w.set(-0.5 + Math.sin(look) * 6, 1.02, -0.32 + Math.cos(look) * 6)
        )
      );
      fov = 68;
    } else {
      // on the pavement at the place: the car pulls up, you get out, he drives away
      const h = R.drop.h,
        s = R.drop;
      cam.position.set(
        s.x + Math.sin(h) * 7 - Math.cos(h) * 5.2,
        surfaceAt(s.x, s.z) + 1.7,
        s.z + Math.cos(h) * 7 + Math.sin(h) * 5.2
      );
      const m = v.mesh.position,
        k = clamp01((t - T_RIDE) / 1.2);
      cam.lookAt(
        s.x + (m.x - s.x) * (1 - ease(k)) * 0.5 - Math.cos(h) * 1,
        surfaceAt(s.x, s.z) + 1.0,
        s.z + (m.z - s.z) * (1 - ease(k)) * 0.5 + Math.sin(h) * 1
      );
      fov = 48;
    }
    // the fov is for the 21:9 band: a taller window draws more above and below (under the bars)
    const W = innerWidth,
      Hh = innerHeight,
      A = 21 / 9;
    if (W / Hh < A)
      fov = THREE.MathUtils.radToDeg(
        2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(fov) / 2) * Hh * A) / W)
      );
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
  _finish() {
    const R = this.run,
      g = this.g,
      pl = g.player;
    if (!R) return;
    this.run = null;
    this._inside(false);
    this._clear(false);
    if (this.car) g.scene.remove(this.car.mesh);
    pl.ch.root.visible = true;
    pl.place(R.out.x, R.out.z, Math.atan2(R.out.x - R.drop.x, R.out.z - R.drop.z) + Math.PI);
    pl.y = 0;
    pl.vy = 0;
    pl.vel?.set(0, 0);
    g.rig.yaw = R.drop.h + Math.PI / 2;
    this._cinema(false);
    g.hud.toast(`🚗 到了：${R.dest.name}。漢堡車明天還可以再搭一次`, 'good', 2800);
    if (g.state === 'play') g.lockPointer?.();
  }
}
