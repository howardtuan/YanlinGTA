// 吱吱傳來的影片：傍晚、夕陽下的武嶺（台14甲）山路，兩台大A在雙黃線右邊的車道一前一後順向騎，
// 前面的女拳大帝（剛考到駕照）在有點急的左彎前急煞，
// 後面的吱吱往右閃過她、過不了彎，在彎道處往外側（右邊）衝出路邊，人跟車一起摔進右邊的水溝（水溝再過去是樹叢、樹枝和樹）。
// 以 21:9 電影畫面播放（上下黑邊、HUD 隱藏、玩家不能動），約 10 秒，按 Esc／E 可跳過。
// 不在大地圖上：自己一個小場景（山路、水溝、樹叢、山壁、箭竹、遠山、「武嶺 3275m」牌子）和自己的燈光，
// 播放時 src/core/GameLoop.js 改畫這個場景（主場景的燈數不變，不會讓材質重新編譯）。場景第一次播放時才建立，之後重用。
import * as THREE from 'three';
import { createCharacter } from '../../entities/Character.js';
import { buildDaA } from '../../entities/Vehicles.js';
import { ZZ_LOOK, GD_LOOK } from '../../entities/npcs/FriendLooks.js';

const DUR = 10.5,
  ROAD_W = 6.5,
  DITCH0 = ROAD_W / 2 + 0.35, // the open concrete ditch on the right: from DITCH0 to DITCH1 metres right of the centre line
  DITCH1 = DITCH0 + 0.9,
  DITCH_D = 0.65; // its depth
const SUBS = [
  [0.3, 2.6, '吱吱：「女拳大帝～騎慢一點啦，這邊彎很多！」'],
  [2.6, 3.3, '女拳大帝：「放心！我駕照剛考到，技術一流 😤」'],
  [3.3, 3.95, '女拳大帝：「欸欸欸——前面這個彎怎麼這麼急！」'],
  [3.95, 5.8, '吱吱：「哇啊啊啊——！！」'],
  [5.9, 8.0, '女拳大帝：「吱吱！！你連人帶車摔進水溝了啦！！」'],
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

// the set: a mountain road that runs straight and then bends fairly sharply left; on the right (the outside of the bend)
// an open concrete ditch with bushes, branches and trees beyond it, on the left (inside) the rock face and the slope going up
function buildSet() {
  const scene = new THREE.Scene();
  // late afternoon: a sunset sky (deep blue overhead to orange and gold at the horizon), low warm sun ahead, a little to the right
  scene.background = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#4c5f98');
    gr.addColorStop(0.38, '#b58ca2');
    gr.addColorStop(0.64, '#f6a46a');
    gr.addColorStop(0.82, '#ffd08c');
    gr.addColorStop(1, '#ffe6b8');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog('#f2bc90', 70, 320);
  scene.add(new THREE.HemisphereLight('#ffe2c4', '#4c4838', 1.35));
  const sun = new THREE.DirectionalLight('#ffb977', 2.9);
  sun.position.set(-24, 20, 100);
  scene.add(sun);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(16, 32),
    new THREE.MeshBasicMaterial({ color: '#ffe2a6', fog: false })
  );
  disc.position.set(-120, 95, 520);
  disc.lookAt(0, 0, 0);
  scene.add(disc);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(40, 32),
    new THREE.MeshBasicMaterial({
      color: '#ffb36b',
      fog: false,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  glow.position.set(-119.5, 95, 519);
  glow.lookAt(0, 0, 0);
  scene.add(glow);
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  // road centre line: straight along +z, then the bend to the left (towards +x)
  const curve = new THREE.CatmullRomCurve3(
    [
      [0, 0, -60],
      [0, 0, -20],
      [0, 0, 20],
      [2.5, 0, 31],
      [9, 0, 41],
      [20, 0, 48],
      [36, 0, 52],
      [70, 0, 54],
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
  // the right side: a narrow concrete edge, the open ditch (a trickle of water at the bottom), then the undergrowth
  const conc = mat('#a09d92'),
    G0 = DITCH1 + 0.5;
  strip(-1, ROAD_W / 2, DITCH0, 0.02, 0.02, conc);
  strip(-1, DITCH0, DITCH0, 0.02, -DITCH_D, conc); // inner wall
  strip(-1, DITCH0, DITCH1, -DITCH_D, -DITCH_D, mat('#6a6b62')); // bottom
  strip(
    -1,
    DITCH0 + 0.2,
    DITCH1 - 0.2,
    -DITCH_D + 0.03,
    -DITCH_D + 0.03,
    mat('#56655f', { roughness: 0.15 })
  );
  strip(-1, DITCH1, DITCH1, -DITCH_D, 0.12, conc); // outer wall
  strip(-1, DITCH1, G0, 0.12, 0.12, mat('#5b5a45')); // muddy lip
  strip(-1, G0, G0 + 45, 0.12, -4, mat('#4b6634')); // undergrowth, falling away gently
  const groundR = (off) => (off < G0 ? 0.12 : 0.12 - ((off - G0) / 45) * 4.12);
  // off metres right of the centre line, u along the road
  const right = (u, off) => {
    const p = curve.getPointAt(u),
      t = curve.getTangentAt(u);
    return { x: p.x - t.z * off, z: p.z + t.x * off, h: Math.atan2(t.x, t.z) };
  };
  // bushes along the far side of the ditch, some hanging over it
  const bush = new THREE.IcosahedronGeometry(0.7, 1),
    bm = ['#3f5f2c', '#4d6f33', '#36522a', '#58763a'].map((c) => mat(c, { flatShading: true }));
  const len = curve.getLength();
  for (let i = 0; i < 560; i++) {
    const u = Math.random(),
      off = DITCH1 - 0.15 + Math.pow(Math.random(), 1.6) * 7.5,
      sAt = u * len;
    if (sAt > 74 && sAt < 112 && off < DITCH1 + 1.4) continue; // keep the ditch open where he goes in (and the camera's view of it)
    const q = right(u, off),
      o = new THREE.Mesh(bush, bm[i % 4]);
    o.scale.set(0.6 + Math.random() * 0.8, 0.5 + Math.random() * 0.7, 0.6 + Math.random() * 0.8);
    o.position.set(q.x, groundR(off) + 0.2 * o.scale.y, q.z);
    o.rotation.y = Math.random() * 6;
    scene.add(o);
  }
  // dead branches: lying in the undergrowth, leaning out of the bushes over the ditch, a few in the ditch
  const twig = mat('#5a4330', { roughness: 1 });
  for (let i = 0; i < 140; i++) {
    const len = 0.7 + Math.random() * 1.8,
      r = 0.025 + Math.random() * 0.035,
      u = Math.random(),
      inDitch = i % 9 === 0,
      off = inDitch ? DITCH0 + 0.2 + Math.random() * 0.5 : DITCH1 - 0.3 + Math.random() * 3.5,
      q = right(u, off),
      b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 5), twig);
    b.rotation.order = 'YXZ';
    b.rotation.y = q.h + (Math.random() - 0.5) * 2.4;
    b.rotation.x = Math.PI / 2 - (inDitch ? 0.1 : Math.random() * 0.9);
    b.position.set(
      q.x,
      (inDitch ? -DITCH_D + 0.05 : groundR(off)) + 0.25 + Math.random() * 0.3,
      q.z
    );
    scene.add(b);
  }
  // trees behind the bushes
  const bark = mat('#4a3a2c'),
    leaf = ['#2f4a26', '#3a5a2c', '#294222'].map((c) => mat(c, { flatShading: true }));
  for (let i = 0; i < 90; i++) {
    const u = Math.random(),
      off = DITCH1 + 7 + Math.random() * 26, // clear of the opening wide shot (9 m right of the road)
      q = right(u, off),
      h = 4 + Math.random() * 5,
      y = groundR(off);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, h, 6), bark);
    tr.position.set(q.x, y + h / 2, q.z);
    scene.add(tr);
    const cr = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.4, 0),
      leaf[i % 3]
    );
    cr.position.set(q.x, y + h + 0.6, q.z);
    cr.scale.y = 1.2;
    scene.add(cr);
  }
  // 箭竹 tufts on the slope, distant ridges
  const tuft = new THREE.IcosahedronGeometry(0.7, 0),
    tm = mat('#4f6b37');
  for (let i = 0; i < 160; i++) {
    const u = Math.random(),
      p = curve.getPointAt(u),
      t = curve.getTangentAt(u),
      n = new THREE.Vector3(t.z, 0, -t.x);
    const off = ROAD_W / 2 + 3.5 + Math.random() * 30,
      f = (off - ROAD_W / 2 - 2.5) / 37.5;
    const o = new THREE.Mesh(tuft, tm);
    o.position.set(p.x + n.x * off, 1.6 + f * 32.4 + 0.2, p.z + n.z * off);
    o.scale.set(1 + Math.random(), 0.5 + Math.random() * 0.5, 1 + Math.random());
    scene.add(o);
  }
  const ridge = mat('#8c7c98', { roughness: 1 }),
    ridge2 = mat('#a98b9c', { roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const a = 1.2 - i * 0.32,
      r = 200 + (i % 3) * 40,
      h = 60 + ((i * 37) % 70);
    const c = new THREE.Mesh(
      new THREE.ConeGeometry(70 + (i % 4) * 15, h, 7),
      i % 2 ? ridge : ridge2
    );
    c.position.set(Math.sin(a) * r + 30, h / 2 - 50, Math.cos(a) * r + 20);
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

// a rider on a 大A, with a helmet
function rig(style, look, helmetColor) {
  const bike = buildDaA(style),
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
    // distance along the road (m), speed (m/s), 吱吱's offset from the centre line (m, + left): both in the right-hand lane
    this.s = { gd: 32, zz: 24, vgd: 13, vzz: 13.6, lzz: -1.9 };
    for (const R of [this.gd, this.zz]) {
      R.bike.rotation.set(0, 0, 0);
      R.bike.position.y = 0;
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
  // the road's heading s metres along it
  _heading(s) {
    const t = this.set.curve.getTangentAt(clamp01(s / this.set.len));
    return Math.atan2(t.x, t.z);
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
    // 女拳大帝: brakes hard just before the bend (s ≈ 76, the bend starts at ≈ 80) and stops at its start
    const gdBrake = t > 3.4;
    S.vgd = Math.max(0, S.vgd - (gdBrake ? 15 : 0) * dt);
    S.gd += S.vgd * dt;
    for (const b of this.gd.brake) b.material.emissiveIntensity = gdBrake && S.vgd > 0 ? 3 : 0.9;
    // 吱吱: reacts late, brakes softer and swerves right to get past her, runs off the edge and goes into the ditch
    if (!this.crash) {
      S.vzz = Math.max(0, S.vzz - (t > 3.75 ? 4 : 0) * dt);
      S.zz += S.vzz * dt;
      // a quick dodge to the right of her, then he can't make the turn: his line stays straight while the road
      // bends left, so he runs wide to the outside (right) of the bend
      if (t > 3.75 && S.h0 === undefined) S.h0 = this._heading(S.zz);
      const dodge = t > 3.6 && t < 4.0 ? 1.0 : 0,
        wide = S.h0 === undefined ? 0 : S.vzz * Math.sin(Math.max(0, this._heading(S.zz) - S.h0)),
        sw = dodge + wide;
      S.lzz -= sw * dt;
      if (S.lzz < -ROAD_W / 2 + 0.1) {
        this.crash = {
          t,
          v: Math.max(4, S.vzz),
          s: S.zz,
          lat: S.lzz,
          roll: Math.min(0.3, sw * 0.06),
        };
        g.audio.noise?.(0.5, 180, 0.8, 0.5, 0, 'lowpass');
        g.audio.noise?.(0.25, 900, 1.2, 0.25, 0.05);
        g.audio.noise?.(0.6, 1400, 0.9, 0.18, 0.12, 'bandpass'); // into the bushes
      }
    }
    const gdAt = this._place(this.gd, S.gd, -1.5);
    this.gd.ch.update(dt, { mode: 'ride' });
    if (this.crash && S.vgd < 0.3) {
      this.gd.bike.rotation.z = -0.12;
      this.gd.ch.head.rotation.y = -1.1;
    } // foot down, looking right at the ditch
    let zzAt;
    if (!this.crash) {
      zzAt = this._place(this.zz, S.zz, S.lzz);
      this.zz.bike.rotation.z = t > 3.6 ? Math.min(0.3, (t - 3.6) * 0.6) : 0; // leaning right as he dodges and runs wide
      this.zz.ch.update(dt, { mode: 'ride' });
    } else {
      const c = this.crash,
        k = t - c.t,
        B = this.zz.bike;
      // the bike: the front wheel drops into the ditch, it falls over on its right side and the ditch stops it
      c.v = Math.max(0, c.v - 12 * dt);
      c.s += c.v * dt;
      c.lat += (-(DITCH0 + 0.25) - c.lat) * Math.min(1, dt * 7);
      zzAt = this._place(this.zz, c.s, c.lat);
      c.roll = Math.min(1.4, c.roll + dt * 4);
      B.position.y = -Math.min(DITCH_D - 0.08, 4.9 * k * k);
      B.rotation.z = c.roll;
      B.rotation.x = k < 0.35 ? k : Math.max(0.12, 0.35 - (k - 0.35) * 0.5);
      // 吱吱 goes over the handlebars, forward and to the right, and ends up on his back in the ditch
      const ch = this.zz.ch;
      if (ch.root.parent === B) {
        B.updateMatrixWorld(true);
        const wp = ch.root.getWorldPosition(this._w);
        B.remove(ch.root);
        this.set.scene.add(ch.root);
        Object.assign(c, { rs: c.s + 0.3, rl: c.lat, ry: wp.y, vy: 2.4, vf: c.v * 0.7, vr: 2.2 });
      }
      c.vy -= 9.8 * dt;
      c.rs += c.vf * dt;
      c.rl = Math.max(-(DITCH1 - 0.3), c.rl - c.vr * dt); // the outer wall stops him
      const floor = c.rl < -DITCH0 ? -DITCH_D + 0.1 : 0.08;
      c.ry = Math.max(floor, c.ry + c.vy * dt);
      if (c.ry <= floor) {
        c.vy = 0;
        c.vf *= 1 - Math.min(1, dt * 5);
        c.vr *= 1 - Math.min(1, dt * 5);
      }
      const C = this.set.curve,
        u = clamp01(c.rs / this.set.len),
        p = C.getPointAt(u),
        tg = C.getTangentAt(u);
      ch.root.position.set(p.x + tg.z * c.rl, c.ry, p.z - tg.x * c.rl);
      ch.root.rotation.y = Math.atan2(tg.x, tg.z);
      ch.root.rotation.x = -Math.min(Math.PI / 2, k * 3);
      ch.update(dt, { mode: 'foot', pose: null, speed: 0 });
      if (k > 0.5) ch.root.position.y = floor + 0.06;
    }
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
      // from the roadside edge a little further on, looking back along the ditch where he goes in
      if (!this.shot3) {
        const C = this.set.curve,
          u = clamp01((S.zz + 17) / this.set.len),
          p = C.getPointAt(u),
          tg = C.getTangentAt(u);
        this.shot3 = new THREE.Vector3(p.x - tg.z * DITCH0, 1.7, p.z + tg.x * DITCH0);
      }
      const z = this.zz.bike.position;
      cam.position.copy(this.shot3);
      cam.lookAt(z.x, Math.min(0.4, z.y + 0.3), z.z);
      cam.fov = 40 - 16 * ease(clamp01((t - 4.7) / 1.6)); // the whole bend, then zooming in as he goes into the ditch
    } else {
      // push in on him lying in the ditch
      const p = this.zz.ch.root.position,
        k = ease(clamp01((t - 7.6) / 2.6));
      cam.position.set(
        this.shot3.x + (p.x - this.shot3.x) * k * 0.5,
        1.7 - k * 0.2,
        this.shot3.z + (p.z - this.shot3.z) * k * 0.5
      );
      cam.lookAt(p.x, p.y + 0.15, p.z);
      cam.fov = 24 - k * 6;
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
