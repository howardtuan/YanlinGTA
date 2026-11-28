// Yulu：商業設計系的女生，吱吱（src/entities/npcs/Zz.js）的女朋友，個性友好，喜歡打排球。金色短髮、皮膚白。
// 一天（遊戲時鐘）：
//   09:00–18:30 在商業設計館（src/world/zones/ZoneC.js 的 SS）南面入口前的步道上走來走去（去上課、等同學、講電話）；
//   有些晚上（大約 10 天有 4 天）19:00–21:00 跟吱吱手牽手在校園步道散步——吱吱那段時間沒打工、也沒受傷才會出去；
//   其他時間回宿舍，學校裡看不到她。
// 可以加好友（src/ui/phone/Friends.js 的 yulu）；散步時吱吱和她各自有 E 互動，可以分開加好友（Friends.js 的 zz.walk / yulu.walk）；加了之後的支線「幫 Yulu 送無糖茶給吱吱」在 src/systems/quests/YuluTea.js。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { zzOnShift } from '../../systems/minigames/TeaShop.js';

const M = (h, m = 0) => h * 60 + m;
const minuteOf = (clock) => ((clock % 1440) + 1440) % 1440;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const H32 = (n) => {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};
const WALK0 = M(19),
  WALK1 = M(21);
const GAP = 0.8; // hand in hand

// fair skin, short golden hair, a soft blue tee, navy shorts, white sneakers
export const YULU_LOOK = {
  skin: '#f3d8c8',
  hair: '#e0b94e',
  hairStyle: 'short',
  female: true,
  shirt: '#86b4dc',
  shorts: '#3c4a6b',
  shoes: '#f6f6f2',
  build: 0.9,
  jaw: 0.92,
  chin: 0.4,
  face: true,
};
// her figure: the short cut plus a layer over the ears and the nape and a side-swept fringe, so it reads as a girl's short
// hair (also used by tools/npc-dashboard)
export function createYulu() {
  const ch = createCharacter(YULU_LOOK),
    m = new THREE.MeshStandardMaterial({
      color: YULU_LOOK.hair,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
  // sides and back down to the bottom of the ears, open at the face
  const side = new THREE.Mesh(
    new THREE.CylinderGeometry(0.133, 0.142, 0.12, 24, 1, true, Math.PI * 0.2, Math.PI * 1.6),
    m
  );
  side.position.set(0, 0.075, -0.006);
  ch.head.add(side);
  // a side-swept fringe across the forehead
  const fr = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.137,
      20,
      6,
      Math.PI * 0.14,
      Math.PI * 0.72,
      Math.PI * 0.37,
      Math.PI * 0.1
    ),
    m
  );
  fr.rotation.set(0.05, 0, -0.1);
  fr.position.set(0, 0.108, 0.004);
  ch.head.add(fr);
  return ch;
}

// 商業設計館 (src/world/zones/ZoneC.js): origin of the north face, u along it west → east, v to the south; the entrance is on the south face
const SS_O = [133.3, 117.5],
  SS_DIR = [159.6 - 133.3, 125.3 - 117.5];
function ssW(u, v) {
  const l = Math.hypot(SS_DIR[0], SS_DIR[1]),
    U = [SS_DIR[0] / l, SS_DIR[1] / l],
    V = [-U[1], U[0]];
  return { x: SS_O[0] + U[0] * u + V[0] * v, z: SS_O[1] + U[1] * u + V[1] * v };
}
// the walk in front of the south face, 5 m out from the wall
const PACE = [ssW(3, 24), ssW(24, 24)];

export class Yulu {
  constructor(game) {
    this.g = game;
    this.mode = null;
    const ch = (this.ch = createYulu());
    const tag = makeLabel('🎨 Yulu', { height: 0.24, size: 40, color: '#ffd98a' });
    tag.position.set(0, 1.72, 0);
    ch.root.add(tag);
    ch.root.visible = false;
    game.scene.add(ch.root);
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.pause = 0;
    this.face = null;
    // pacing in front of 商設館
    this.k = Math.random();
    this.dir = 1;
    // the walk with 吱吱: his figure on her left (the one in his room is hidden meanwhile, src/entities/npcs/Zz.js)
    this.walkOn = false;
    this.wait = 1.5;
    const self = this;
    game.interiors.actions.push({
      get x() {
        return ch.root.position.x;
      },
      get z() {
        return ch.root.position.z;
      },
      r: 2.2,
      y: 0,
      anyY: true,
      cond: () => ch.root.visible && (this.mode === 'ssd' || this.walkOn),
      label: () => '按 <kbd>E</kbd> 和 Yulu 聊天',
      fn: () => this.talk(),
    });
    // 吱吱 on the walk: his own chat / add friend, separate from hers (nearest of the two wins, src/world/Kit.js actionAt)
    game.interiors.actions.push({
      get x() {
        return self.bf ? self.bf.root.position.x : 1e9;
      },
      get z() {
        return self.bf ? self.bf.root.position.z : 1e9;
      },
      r: 2.2,
      y: 0,
      anyY: true,
      cond: () => this.walkOn && !!this.bf?.root.visible,
      label: () => '按 <kbd>E</kbd> 和吱吱聊天',
      fn: () => this.talkZz(),
    });
  }
  // some evenings she walks with 吱吱: not while he is hurt or working
  walkDay(day) {
    return H32(day * 13 + 5) < 0.4;
  }
  walkNow(clock) {
    const m = minuteOf(clock),
      day = Math.floor(clock / 1440),
      Z = this.g.zz;
    if (m < WALK0 || m >= WALK1 || !this.walkDay(day) || !Z || Z.injured) return false;
    if (this.g.mahjong?.has('zz')) return false; // 吱吱 got called to 277 麻將: she heads home on her own
    return !zzOnShift(day * 1440 + WALK0) && !zzOnShift(day * 1440 + WALK1 - 1);
  }
  plan(clock) {
    const m = minuteOf(clock);
    if (this.walkNow(clock)) return 'walk';
    if (m >= M(9) && m < M(18, 30)) return 'ssd';
    return 'home';
  }
  // 吱吱 is out on the walk with her (src/entities/npcs/Zz.js plan)
  get withZz() {
    return this.mode === 'walk';
  }
  talk() {
    const g = this.g,
      p = g.player.worldPos();
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.pause = 4;
    g.friends?.talk('yulu', this.mode === 'walk' ? 'walk' : null, () => {
      this.pause = 0.6;
    });
  }
  // talking to 吱吱 on the walk: they both stop and turn to you
  talkZz() {
    const g = this.g,
      p = g.player.worldPos();
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.pause = 4;
    g.friends?.talk('zz', 'walk', () => {
      this.pause = 0.6;
    });
  }
  where() {
    if (this.mode === 'walk') return '跟男朋友吱吱在校園散步 💕';
    if (this.mode === 'ssd') return '在商業設計館前面 🎨';
    return '回宿舍了';
  }
  navPos() {
    return this.ch.root.visible ? this.ch.root.position : null;
  }
  update(dt) {
    const g = this.g,
      mode = this.plan(g.clock);
    if (mode !== this.mode) {
      if (this.mode === 'walk') this._endWalk();
      this.mode = mode;
      this.wait = 1.5;
    }
    if (mode === 'ssd') this._pace(dt);
    else if (mode === 'walk') this._walk(dt);
    else this.ch.root.visible = false;
  }
  _faceYou(dt) {
    if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 5);
  }
  // ---- 商設館: back and forth along the front, stopping now and then (on her phone, looking at the posters) ----
  _pace(dt) {
    const g = this.g,
      p = g.player.worldPos(),
      [A, B] = PACE,
      L = Math.hypot(B.x - A.x, B.z - A.z);
    const dPl = Math.hypot(A.x + (B.x - A.x) * this.k - p.x, A.z + (B.z - A.z) * this.k - p.z);
    if (dPl > 200) {
      this.ch.root.visible = false;
      return;
    }
    let speed = 0;
    if (g.hud.inDialog && dPl < 5) this.pause = Math.max(this.pause, 0.5);
    if (this.pause > 0) {
      this.pause -= dt;
      this._faceYou(dt);
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.0;
      this.k += (this.dir * speed * dt) / L;
      if (this.k >= 1 || this.k <= 0) {
        this.k = Math.max(0, Math.min(1, this.k));
        this.dir = -this.dir;
        this.pause = 2 + Math.random() * 4;
      } else if (Math.random() < dt * 0.06) this.pause = 3 + Math.random() * 4;
      const h = Math.atan2((B.x - A.x) * this.dir, (B.z - A.z) * this.dir);
      this.heading += angDiff(h, this.heading) * Math.min(1, dt * 5);
    }
    this.pos.x = A.x + (B.x - A.x) * this.k;
    this.pos.z = A.z + (B.z - A.z) * this.k;
    this.pos.y = surfaceAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    const ch = this.ch,
      close = dPl < 35,
      talking = this.pause > 0 && this.face != null;
    ch.root.visible = true;
    ch.root.position.copy(this.pos);
    ch.root.rotation.y = this.heading;
    ch.setDetail?.(close);
    ch.update(dt, {
      speed,
      mode: 'foot',
      pose: talking
        ? 'talk'
        : this.pause > 0 && Math.sin(g.time * 0.3 + this.k * 9) > 0
          ? 'phone'
          : null,
    });
  }
  // ---- after dinner: hand in hand with 吱吱 along a footpath near you (like 霍華德 and Tzuyu, src/entities/npcs/Howard.js) ----
  _zzFigure() {
    if (this.bf) return this.bf;
    const Z = this.g.zz;
    if (!Z?.ch) return null;
    // a second figure of him for the walk, with his own label
    const bf = (this.bf = Z.makeWalker());
    this.g.scene.add(bf.root);
    return bf;
  }
  _endWalk() {
    this.walkOn = false;
    this.ch.root.visible = false;
    if (this.bf) this.bf.root.visible = false;
  }
  _appear() {
    const w = this.g.world,
      p = this.g.player.worldPos();
    const near = (w.walkNodes || []).filter((n) => {
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      return d > 30 && d < 90 && n.adj.length && w.inCampus(n.x, n.z);
    });
    if (!near.length) return false;
    const n = near[Math.floor(Math.random() * near.length)];
    this.from = n;
    this.to = this._pick(n, null);
    this.d = 0;
    this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
    this.pos.set(n.x, surfaceAt(n.x, n.z), n.z);
    this.heading = Math.atan2(this.to.x - n.x, this.to.z - n.z);
    this.walkOn = true;
    return true;
  }
  _pick(n, from) {
    let opts = n.adj.filter((e) => e.to !== from && this.g.world.inCampus(e.to.x, e.to.z));
    if (!opts.length) opts = n.adj;
    return opts[Math.floor(Math.random() * opts.length)].to;
  }
  _walk(dt) {
    const g = this.g,
      p = g.player.worldPos(),
      bf = this._zzFigure();
    if (!bf) return;
    if (!this.walkOn) {
      this.ch.root.visible = bf.root.visible = false;
      if ((this.wait -= dt) <= 0 && !this._appear()) this.wait = 12;
      return;
    }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (dPl > 170 && !g.hud.inDialog) {
      this.walkOn = false;
      this.wait = 15;
      this.ch.root.visible = bf.root.visible = false;
      return;
    }
    let speed = 0;
    if (g.hud.inDialog && dPl < 5) this.pause = Math.max(this.pause, 0.5);
    if (this.pause > 0) {
      this.pause -= dt;
      this._faceYou(dt);
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.0;
      this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to;
        this.to = this._pick(n, this.from);
        this.from = n;
        this.d = 0;
        this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.25) this.pause = 3 + Math.random() * 4; // stops to chat
      }
      const k = this.d / this.len,
        dx = this.to.x - this.from.x,
        dz = this.to.z - this.from.z,
        off = 0.3;
      const tx = this.from.x + dx * k - (dz / this.len) * off,
        tz = this.from.z + dz * k + (dx / this.len) * off;
      this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 4);
      this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 4);
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 5);
    }
    this.pos.y = surfaceAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    const ch = this.ch,
      h = this.heading,
      close = dPl < 35,
      talking = this.pause > 0 && this.face != null,
      chatting = this.pause > 0 && this.face == null;
    ch.root.visible = true;
    ch.root.position.copy(this.pos);
    ch.root.rotation.y = talking ? this.face : chatting ? h + Math.PI / 2 : h;
    ch.setDetail?.(close);
    ch.update(dt, { speed, mode: 'foot', pose: talking || chatting ? 'talk' : 'handL' });
    // 吱吱 on her left, holding her left hand with his right
    const lx = Math.cos(h),
      lz = -Math.sin(h),
      bx = this.pos.x + lx * GAP,
      bz = this.pos.z + lz * GAP;
    bf.root.visible = true;
    bf.root.position.set(bx, surfaceAt(bx, bz, this.pos.y + 0.5), bz);
    bf.root.rotation.y = talking ? this.face : chatting ? h - Math.PI / 2 : h;
    bf.setDetail?.(close);
    bf.update(dt, { speed, mode: 'foot', pose: talking || chatting ? null : 'handR' });
  }
}
