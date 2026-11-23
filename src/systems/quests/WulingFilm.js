// 吱吱傳來的影片：武嶺（台14甲）山路，兩台 BW'S 一前一後，前面的女拳大帝（剛考到駕照）過彎急煞，後面的吱吱閃不過追撞翻車。
// 以 21:9 電影畫面播放（上下黑邊、HUD 隱藏、玩家不能動），約 10 秒，按 Esc／E 可跳過。
// 不在大地圖上：自己一個小場景（山路、護欄、山壁、箭竹、遠山、「武嶺 3275m」牌子）和自己的燈光，
// 播放時 src/core/GameLoop.js 改畫這個場景（主場景的燈數不變，不會讓材質重新編譯）。場景第一次播放時才建立，之後重用。
import * as THREE from 'three';
import { createCharacter } from '../../entities/Character.js';
import { buildBws } from '../../entities/Vehicles.js';
import { ZZ_LOOK, GD_LOOK } from '../../entities/npcs/FriendLooks.js';

const DUR = 10.5,
  ROAD_W = 6.5;
const SUBS = [
  [0.3, 2.6, '吱吱：「女拳大帝～騎慢一點啦，這邊彎很多！」'],
  [2.6, 3.5, '女拳大帝：「放心！我駕照剛考到，技術一流 😤」'],
  [3.5, 4.3, '女拳大帝：「欸欸欸——這個彎怎麼這麼急！」'],
  [4.3, 5.8, '吱吱：「哇啊啊啊——！！」'],
  [5.9, 8.0, '女拳大帝：「吱吱！！你還好嗎！！」'],
  [8.0, DUR, '吱吱：「我的手指……我的手指……😭」'],
];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => t * t * (3 - 2 * t);

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// the set: a mountain road that runs straight and then bends hard right (the drop and the guardrail on the inside, the slope outside)
function buildSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9ec3e4');
  scene.fog = new THREE.Fog('#b9d0e2', 70, 320);
  scene.add(new THREE.HemisphereLight('#e4f1ff', '#56663f', 1.25));
  const sun = new THREE.DirectionalLight('#fff1d8', 2.4);
  sun.position.set(-60, 90, 40);
  scene.add(sun);
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  // road centre line: straight along +z, then a tight left bend
  const curve = new THREE.CatmullRomCurve3(
    [
      [0, 0, -60],
      [0, 0, -20],
      [0, 0, 20],
      [-2, 0, 40],
      [-10, 0, 54],
      [-24, 0, 62],
      [-42, 0, 64],
      [-70, 0, 62],
    ].map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal'
  );
  const N = 220,
    pos = [],
    idx = [],
    uv = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N,
      p = curve.getPointAt(u),
      t = curve.getTangentAt(u),
      n = new THREE.Vector3(t.z, 0, -t.x); // n: to the left of travel
    for (const s of [-1, 1]) {
      pos.push(p.x + (n.x * s * ROAD_W) / 2, 0.02, p.z + (n.z * s * ROAD_W) / 2);
      uv.push(s < 0 ? 0 : 1, u * 40);
    }
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const roadG = new THREE.BufferGeometry();
  roadG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roadG.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  roadG.setIndex(idx);
  roadG.computeVertexNormals();
  const asphalt = canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#4b4d50';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.06)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    g.fillStyle = '#e8c33a';
    g.fillRect(w / 2 - 3, 0, 2, h);
    g.fillRect(w / 2 + 1, 0, 2, h);
    g.fillStyle = '#e9e9e4';
    g.fillRect(2, 0, 2, h);
    g.fillRect(w - 4, 0, 2, h);
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  scene.add(new THREE.Mesh(roadG, mat('#ffffff', { map: asphalt, roughness: 0.92 })));
  // hillside up on the inside (left) of the bend, a drop with a guardrail on the outside (right)
  const strip = (side, off0, off1, y0, y1, m) => {
    const P = [],
      I = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N,
        p = curve.getPointAt(u),
        t = curve.getTangentAt(u),
        n = new THREE.Vector3(t.z, 0, -t.x);
      P.push(
        p.x + n.x * side * off0,
        y0,
        p.z + n.z * side * off0,
        p.x + n.x * side * off1,
        y1,
        p.z + n.z * side * off1
      );
      if (i < N) {
        const a = i * 2;
        side > 0
          ? I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
          : I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    gg.setIndex(I);
    gg.computeVertexNormals();
    const o = new THREE.Mesh(gg, m);
    o.material.side = THREE.DoubleSide;
    scene.add(o);
    return o;
  };
  strip(1, ROAD_W / 2, ROAD_W / 2 + 2.5, 0, 1.6, mat('#7d7a6c')); // rock face at the foot of the slope
  strip(1, ROAD_W / 2 + 2.5, ROAD_W / 2 + 40, 1.6, 34, mat('#5f7a45')); // grassy slope (箭竹) above it
  strip(-1, ROAD_W / 2, ROAD_W / 2 + 3, 0, -0.4, mat('#6f8a4f')); // verge
  strip(-1, ROAD_W / 2 + 3, ROAD_W / 2 + 60, -0.4, -40, mat('#5c7642')); // the drop
  // guardrail along the outside: posts and a W-beam
  const steel = mat('#c9ccd0', { metalness: 0.6, roughness: 0.4 }),
    postG = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  for (let i = 0; i <= 110; i++) {
    const u = i / 110,
      p = curve.getPointAt(u),
      t = curve.getTangentAt(u),
      n = new THREE.Vector3(t.z, 0, -t.x);
    const x = p.x - n.x * (ROAD_W / 2 + 0.6),
      z = p.z - n.z * (ROAD_W / 2 + 0.6);
    const post = new THREE.Mesh(postG, steel);
    post.position.set(x, 0.4, z);
    scene.add(post);
    if (i < 110) {
      const q = curve.getPointAt((i + 1) / 110),
        t2 = curve.getTangentAt((i + 1) / 110),
        n2 = new THREE.Vector3(t2.z, 0, -t2.x);
      const x2 = q.x - n2.x * (ROAD_W / 2 + 0.6),
        z2 = q.z - n2.z * (ROAD_W / 2 + 0.6),
        l = Math.hypot(x2 - x, z2 - z);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, l + 0.05), steel);
      rail.position.set((x + x2) / 2, 0.68, (z + z2) / 2);
      rail.rotation.y = Math.atan2(x2 - x, z2 - z);
      scene.add(rail);
    }
  }
  // 箭竹 tufts on the slopes, distant ridges
  const tuft = new THREE.IcosahedronGeometry(0.7, 0),
    tm = mat('#4f6b37');
  for (let i = 0; i < 260; i++) {
    const u = Math.random(),
      p = curve.getPointAt(u),
      t = curve.getTangentAt(u),
      n = new THREE.Vector3(t.z, 0, -t.x),
      side = Math.random() < 0.6 ? 1 : -1;
    const off = ROAD_W / 2 + 3.5 + Math.random() * 30,
      f = (off - ROAD_W / 2 - 2.5) / 37.5;
    const y = side > 0 ? 1.6 + f * 32.4 : -0.4 - ((off - ROAD_W / 2 - 3) / 57) * 39.6;
    const o = new THREE.Mesh(tuft, tm);
    o.position.set(p.x + n.x * side * off, y + 0.2, p.z + n.z * side * off);
    o.scale.set(1 + Math.random(), 0.5 + Math.random() * 0.5, 1 + Math.random());
    scene.add(o);
  }
  const ridge = mat('#6d8aa3', { roughness: 1 }),
    ridge2 = mat('#8aa3b8', { roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const a = -1.2 + i * 0.32,
      r = 200 + (i % 3) * 40,
      h = 60 + ((i * 37) % 70);
    const c = new THREE.Mesh(
      new THREE.ConeGeometry(70 + (i % 4) * 15, h, 7),
      i % 2 ? ridge : ridge2
    );
    c.position.set(Math.sin(a) * r - 30, h / 2 - 50, Math.cos(a) * r + 20);
    scene.add(c);
  }
  // the 武嶺 sign at the start
  const signT = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#6b4a2b';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f2e6c9';
    g.lineWidth = 8;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#f7efd8';
    g.textAlign = 'center';
    g.font = '900 108px "Noto Serif TC","Songti TC",serif';
    g.fillText('武嶺', w / 2, 118);
    g.font = '700 44px "Noto Sans TC",sans-serif';
    g.fillText('Wuling 3275m', w / 2, 196);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.12), [
    mat('#6b4a2b'),
    mat('#6b4a2b'),
    mat('#6b4a2b'),
    mat('#6b4a2b'),
    mat('#fff', { map: signT }),
    mat('#6b4a2b'),
  ]);
  sign.position.set(ROAD_W / 2 + 2.2, 2.6, -24);
  sign.rotation.y = -Math.PI / 2 + 0.35;
  scene.add(sign);
  for (const dz of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), mat('#4e3520'));
    leg.position.set(ROAD_W / 2 + 2.2 + Math.sin(0.35) * dz, 1.1, -24 + Math.cos(0.35) * dz);
    scene.add(leg);
  }
  return { scene, curve, len: curve.getLength() };
}

// a rider on a BW'S, with a helmet
function rig(style, look, helmetColor) {
  const bike = buildBws(style),
    ch = createCharacter(look);
  ch.root.position.set(0, 0.08, -0.32);
  bike.add(ch.root);
  ch.update(0.1, { mode: 'ride' });
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.3, metalness: 0.2 })
  );
  helmet.position.set(0, 0.12, -0.005);
  ch.head.add(helmet);
  bike.rotation.order = 'YXZ';
  const brake = [];
  bike.traverse((o) => {
    if (o.isMesh && o.material?.emissive?.getHex?.() === 0xff1a1a) brake.push(o);
  });
  return { bike, ch, brake };
}

export class WulingFilm {
  constructor(game) {
    this.g = game;
    this.active = false;
    this.set = null;
    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
  }
  get cinema() {
    return this.active;
  }
  play(onEnd) {
    if (this.active) return;
    const g = this.g;
    if (!this.set) {
      this.set = buildSet();
      this.gd = rig('gd', GD_LOOK, '#1b1b1d');
      this.zz = rig('zz', ZZ_LOOK, '#f1f1ee');
      this.set.scene.add(this.gd.bike, this.zz.bike);
      this.cam = new THREE.PerspectiveCamera(42, 2.33, 0.1, 900);
    }
    this.onEnd = onEnd;
    this.t = 0;
    this.active = true;
    this.crash = null;
    this.s = { gd: 34, zz: 25, vgd: 13, vzz: 13.6 }; // distance along the road (m) and speed (m/s)
    for (const R of [this.gd, this.zz]) {
      R.bike.rotation.set(0, 0, 0);
      R.ch.root.parent !== R.bike && R.bike.add(R.ch.root);
      R.ch.root.position.set(0, 0.08, -0.32);
      R.ch.root.rotation.set(0, 0, 0);
      R.ch.update(0.1, { mode: 'ride' });
    }
    g.input.releaseAll?.();
    g.audio.setEngine?.(false, 0);
    document.exitPointerLock?.();
    this._bars(true);
    this._engT = 0;
  }
  _bars(on) {
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
    let cap = document.getElementById('zzFilmCap');
    if (on && !cap) {
      cap = document.createElement('div');
      cap.id = 'zzFilmCap';
      cap.innerHTML =
        '<div class="rec"><i></i>REC　武嶺・台14甲</div><div class="skip">Esc／E 跳過</div><div class="sub"></div>';
      document.body.appendChild(cap);
    }
    if (cap) {
      cap.style.setProperty('--bar', `${tall ? bar : 0}px`);
      cap.style.display = on ? '' : 'none';
    }
  }
  // place a rider s metres along the road, lat metres to the left of the centre line
  _place(R, s, lat = 0) {
    const C = this.set.curve,
      u = clamp01(s / this.set.len),
      p = C.getPointAt(u),
      t = C.getTangentAt(u);
    R.bike.position.set(p.x + t.z * lat, 0, p.z - t.x * lat);
    R.bike.rotation.y = Math.atan2(t.x, t.z);
    return { p, t };
  }
  update(dt, inp) {
    if (!this.active) return;
    const g = this.g,
      S = this.s;
    if (inp?.hit?.('Escape', 'KeyE', 'Backspace')) {
      this.stop();
      return;
    }
    this.t += dt;
    const t = this.t;
    // 女拳大帝: brakes hard as the bend starts (s ≈ 80) and stops
    const gdBrake = t > 3.4;
    S.vgd = Math.max(0, S.vgd - (gdBrake ? 15 : 0) * dt);
    S.gd += S.vgd * dt;
    for (const b of this.gd.brake) b.material.emissiveIntensity = gdBrake && S.vgd > 0 ? 3 : 0.9;
    // 吱吱: reacts late and brakes softer; too close -> he hits her rear wheel and goes down
    if (!this.crash) {
      S.vzz = Math.max(0, S.vzz - (t > 3.75 ? 7 : 0) * dt);
      S.zz += S.vzz * dt;
      if (S.gd - S.zz < 1.7) {
        this.crash = { t, v: Math.max(4, S.vzz), roll: 0, yaw: 0, fly: 0, vy: 3.2, y: 0, slide: 0 };
        S.vgd += 1.8; // the knock pushes her forward a little
        g.audio.noise?.(0.5, 180, 0.8, 0.5, 0, 'lowpass');
        g.audio.noise?.(0.25, 900, 1.2, 0.25, 0.05);
      }
    }
    const gdAt = this._place(this.gd, S.gd, 0.6);
    this.gd.ch.update(dt, { mode: 'ride' });
    if (this.crash && S.vgd < 0.3) {
      this.gd.bike.rotation.z = -0.12;
      this.gd.ch.head.rotation.y = 1.2;
    } // foot down, looking back at him
    const zzAt = this._place(this.zz, S.zz, 0.3);
    if (this.crash) {
      const c = this.crash,
        k = t - c.t;
      c.v = Math.max(0, c.v - 6 * dt);
      S.zz += c.v * dt;
      c.slide += c.v * dt * 0.35;
      this._place(this.zz, S.zz, 0.3 - c.slide);
      c.roll = Math.min(1.45, c.roll + dt * 4.5);
      c.yaw += c.v * dt * 0.25;
      this.zz.bike.rotation.z = c.roll;
      this.zz.bike.rotation.y += c.yaw;
      // he is thrown off forward and to the right, tumbles and lies on the road
      const ch = this.zz.ch;
      if (ch.root.parent === this.zz.bike) {
        this.zz.bike.updateMatrixWorld(true);
        const wp = ch.root.getWorldPosition(this._w);
        this.zz.bike.remove(ch.root);
        this.set.scene.add(ch.root);
        ch.root.position.copy(wp);
        c.fx = zzAt.t.x;
        c.fz = zzAt.t.z;
        c.vx = c.fx * c.v * 0.9 - zzAt.t.z * 1.2;
        c.vz = c.fz * c.v * 0.9 + zzAt.t.x * 1.2;
        c.y = wp.y;
      }
      c.vy -= 9.8 * dt;
      c.y = Math.max(0.08, c.y + c.vy * dt);
      if (c.y <= 0.08) {
        c.vy = 0;
        c.vx *= 1 - Math.min(1, dt * 3);
        c.vz *= 1 - Math.min(1, dt * 3);
      }
      ch.root.position.set(ch.root.position.x + c.vx * dt, c.y, ch.root.position.z + c.vz * dt);
      // tumbles over backwards and ends up lying on his back across the lane
      ch.root.rotation.y = Math.atan2(c.fx, c.fz);
      ch.root.rotation.x = -Math.min(Math.PI / 2, k * 3);
      ch.update(dt, { mode: 'foot', pose: null, speed: 0 });
      if (k > 0.5) ch.root.position.y = 0.14;
    } else this.zz.ch.update(dt, { mode: 'ride' });
    // engines: a low hum while they ride, the tyres screech when she brakes
    if ((this._engT -= dt) <= 0 && t < 4.4) {
      this._engT = 0.12;
      g.audio.noise?.(0.12, 90 + S.vgd * 6, 1.4, 0.06, 0, 'lowpass');
    }
    if (gdBrake && !this._screech) {
      this._screech = true;
      g.audio.noise?.(0.9, 2600, 6, 0.12, 0, 'bandpass', -900);
    }
    // camera: wide side shot, chase shot, the crash at the bend, push in on him
    const cam = this.cam,
      mid = this._v.copy(this.gd.bike.position).add(this.zz.bike.position).multiplyScalar(0.5);
    if (t < 2.6) {
      const tt = gdAt.t;
      cam.position.set(mid.x - tt.z * 9 + tt.x * 2, 2.6, mid.z + tt.x * 9 + tt.z * 2);
      cam.lookAt(mid.x, 1.0, mid.z);
      cam.fov = 40;
    } else if (t < 4.3) {
      const b = this.zz.bike.position,
        tt = zzAt.t;
      cam.position.set(b.x - tt.x * 4.6 - tt.z * 0.9, 1.75, b.z - tt.z * 4.6 + tt.x * 0.9);
      cam.lookAt(this.gd.bike.position.x, 1.0, this.gd.bike.position.z);
      cam.fov = 48;
    } else if (t < 7.6) {
      if (!this.shot3) {
        const tt = gdAt.t,
          p = this.gd.bike.position;
        this.shot3 = new THREE.Vector3(
          p.x - tt.z * 6.5 + tt.x * 5,
          1.4,
          p.z + tt.x * 6.5 + tt.z * 5
        );
      }
      cam.position.copy(this.shot3);
      cam.lookAt(mid.x, 0.6, mid.z);
      cam.fov = 44;
    } else {
      const p = this.zz.ch.root.position,
        k = ease(clamp01((t - 7.6) / 2.6));
      cam.position.set(
        this.shot3.x + (p.x - this.shot3.x) * k * 0.35,
        1.6 - k * 0.3,
        this.shot3.z + (p.z - this.shot3.z) * k * 0.35
      );
      cam.lookAt(p.x, 0.25, p.z);
      cam.fov = 40;
    }
    // the fov above is for the 21:9 picture between the bars: a window taller than 21:9 draws more above and below
    // (hidden by the bars), so the vertical fov grows to keep the same picture in the band
    const W = innerWidth,
      Hh = innerHeight,
      A = 21 / 9;
    if (W / Hh < A)
      cam.fov = THREE.MathUtils.radToDeg(
        2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * Hh * A) / W)
      );
    cam.aspect = W / Hh;
    cam.updateProjectionMatrix();
    const sub = SUBS.find(([a, b]) => t >= a && t < b),
      el = document.querySelector('#zzFilmCap .sub');
    if (el) el.textContent = sub ? sub[2] : '';
    if (t >= DUR) this.stop();
  }
  render(renderer) {
    if (this.active && this.set) renderer.render(this.set.scene, this.cam);
  }
  stop() {
    if (!this.active) return;
    this.active = false;
    this.shot3 = null;
    this._screech = false;
    this._bars(false);
    const cb = this.onEnd;
    this.onEnd = null;
    cb?.();
  }
}
