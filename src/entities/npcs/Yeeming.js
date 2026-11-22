// YeeMing：物理系、跟彥霖同年級，羊明衫的男朋友（兩個人是宿營認識的，他還為了女友把菸戒了）。個性友好開朗、成績也很優秀，
// 很支持彥霖選會長。現在正在當兵：穿迷彩軍服、戴迷彩鋼盔。外型照使用者給的照片（黑色蓬鬆短髮、圓臉）。
// 一天（遊戲時鐘）：
//   羊明衫白天有些整點不練舞，改成跟他手牽手在校園散步（兩個人一起出現在你附近的步道上，js/mingshan.js 的 walk）；
//   羊明衫在練舞或在麥當勞上班的時候，他去體育館旁的排球場打排球（墊球練習；跟吱吱很好，常一起打）；
//   22:00–09:00 不在校園（收假回營、睡覺）。
// 跟他們說話時彥霖都會問「要不要打麻將？」；聊完可以加他好友（js/friends.js 的 yeeming）。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { VBALL, courtP } from '../../world/Court.js';

export const YEEMING_LOOK = {
  skin: '#e9c6a6', hair: '#141210', hairStyle: 'short', shirt: '#56643a', shorts: '#56643a', pants: true, shoes: '#2a2620',
  camo: true, helmet: 'camo', build: 1.02, face: true,
};
const M = (h, m = 0) => h * 60 + m;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const GAP = 0.8; // between the two of them, hand in hand

// a volleyball: white with blue and yellow panels
function buildBall() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#1f4fbf'; x.fillRect(0, 8, 128, 12); x.fillRect(0, 44, 128, 12);
  x.fillStyle = '#ffd23f'; x.fillRect(0, 26, 128, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 12), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  m.castShadow = true; return m;
}

export class YeeMing {
  constructor(game) {
    this.g = game; this.mode = null; this.state = { met: false };
    const ch = this.ch = createCharacter(YEEMING_LOOK);
    const tag = makeLabel('🪖 YeeMing', { height: 0.26, size: 40, color: '#b9d38a' }); tag.position.set(0, 2.12, 0); ch.root.add(tag);
    ch.root.visible = false; game.scene.add(ch.root);
    this.pos = new THREE.Vector3(); this.heading = 0; this.walkOn = false; this.wait = 2;
    // the volleyball court next to the gym (js/court.js), on one half of it
    const gym = game.world.named['中原大學體育館'] || { x: 0, z: -330 };
    const C = VBALL.slice().sort((a, b) => Math.hypot(a.c[0] - gym.x, a.c[1] - gym.z) - Math.hypot(b.c[0] - gym.x, b.c[1] - gym.z))[0];
    const [cx, cz] = courtP(C, -4.5, 0), [nx, nz] = courtP(C, 0, 0);
    this.court = { x: cx, z: cz, h: Math.atan2(nx - cx, nz - cz) }; // facing the net
    this.ball = buildBall(); this.ball.visible = false; game.scene.add(this.ball);
    // talking: to the pair while they walk, or to him on the court
    game.interiors.actions.push({
      get x() { return game.yeeming.pos.x; }, get z() { return game.yeeming.pos.z; }, r: 2.4, y: 0, anyY: true,
      cond: () => this.mode === 'walk' && this.walkOn, label: () => '按 <kbd>E</kbd> 和 YeeMing、羊明衫聊天', fn: () => this.talk('walk'),
    });
    game.interiors.actions.push({
      get x() { return game.yeeming.pos.x; }, get z() { return game.yeeming.pos.z; }, r: 2.4, y: 0, anyY: true,
      cond: () => this.mode === 'volley' && ch.root.visible, label: () => '按 <kbd>E</kbd> 和打排球的 YeeMing 聊天', fn: () => this.talk('volley'),
    });
  }
  toJSON() { return this.state; }
  load(d) { if (d && typeof d === 'object') Object.assign(this.state, d); }
  // walking with 羊明衫 when she walks; on the court while she dances or works; off campus at night
  _modeAt() {
    const S = this.g.mingshan, m = ((this.g.clock % 1440) + 1440) % 1440;
    if (S?.mode === 'walk') return 'walk';
    if (m >= M(9) && m < M(22)) return 'volley';
    return 'off';
  }
  talk(where) {
    const g = this.g, p = g.player.worldPos();
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.pause = 4;
    this.state.met = true;
    g.friends?.talk('yeeming', where, () => { this.pause = 0.6; });
  }
  // a footpath node 30–90 m from you, on campus (like 漢克's walks); false if none
  _appear() {
    const w = this.g.world, p = this.g.player.worldPos();
    const near = w.walkNodes.filter(n => { const d = Math.hypot(n.x - p.x, n.z - p.z); return d > 30 && d < 90 && w.inCampus(n.x, n.z); });
    if (!near.length) return false;
    const n = near[Math.floor(Math.random() * near.length)];
    this.from = n; this.to = this._pick(n, null); this.d = 0; this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
    this.pos.set(n.x, surfaceAt(n.x, n.z), n.z); this.heading = Math.atan2(this.to.x - n.x, this.to.z - n.z); this.pause = 0;
    this.walkOn = true; return true;
  }
  _pick(n, from) {
    let opts = n.adj.filter(e => e.to !== from && this.g.world.inCampus(e.to.x, e.to.z));
    if (!opts.length) opts = n.adj;
    return opts[Math.floor(Math.random() * opts.length)].to;
  }
  _hide() { this.walkOn = false; this.ch.root.visible = false; const S = this.g.mingshan; if (S?.mode === 'walk') S.ch.root.visible = false; }
  update(dt) {
    const g = this.g, mode = this._modeAt(), p = g.player.worldPos(), S = g.mingshan;
    if (mode !== this.mode) { if (this.mode === 'walk') this._hide(); this.mode = mode; this.wait = 2; this.ball.visible = false; }
    if (mode === 'off') { this.ch.root.visible = false; return; }
    if (mode === 'volley') return this._volley(dt, p);
    // ---- hand in hand with 羊明衫 ----
    if (!this.walkOn) { if ((this.wait -= dt) <= 0 && !this._appear()) this.wait = 12; return; }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (dPl > 170 && !g.hud.inDialog) { this._hide(); this.wait = 15; return; }
    let speed = 0;
    if (g.hud.inDialog && dPl < 5) this.pause = Math.max(this.pause || 0, 0.5);
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 5);
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.1; this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to; this.to = this._pick(n, this.from); this.from = n; this.d = 0; this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.25) this.pause = 3 + Math.random() * 4; // stop to chat / look around
      }
      const k = this.d / this.len, dx = this.to.x - this.from.x, dz = this.to.z - this.from.z, off = 0.3;
      const tx = this.from.x + dx * k - dz / this.len * off, tz = this.from.z + dz * k + dx / this.len * off;
      this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 4); this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 4);
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 5);
    }
    this.pos.y = surfaceAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    const ch = this.ch, h = this.heading; ch.root.visible = true;
    ch.root.position.copy(this.pos); ch.root.rotation.y = h;
    const close = dPl < 35; ch.setDetail?.(close);
    const talking = this.pause > 0 && this.face != null;
    ch.update(dt, { speed, mode: 'foot', pose: talking ? 'talk' : 'handR' });
    // she walks on his right, holding his right hand with her left
    if (S) {
      const rx = -Math.cos(h), rz = Math.sin(h), sx = this.pos.x + rx * GAP, sz = this.pos.z + rz * GAP;
      S.pos.set(sx, surfaceAt(sx, sz, this.pos.y + 0.5), sz);
      const sc = S.ch; sc.root.visible = true; sc.root.position.copy(S.pos); sc.root.rotation.y = talking ? this.face : h;
      sc.setDetail?.(close);
      sc.update(dt, { speed, mode: 'foot', pose: talking ? null : 'handL' });
    }
  }
  // bumping a volleyball on the court by the gym (only drawn when you are within 160 m)
  _volley(dt, p) {
    const c = this.court, ch = this.ch, near = Math.hypot(c.x - p.x, c.z - p.z) < 160;
    ch.root.visible = near; this.ball.visible = near;
    this.pos.set(c.x, surfaceAt(c.x, c.z), c.z);
    if (!near) return;
    if (this.pause > 0) { this.pause -= dt; if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 5); }
    else { this.face = null; this.heading += angDiff(c.h, this.heading) * Math.min(1, dt * 3); }
    ch.root.position.copy(this.pos); ch.root.rotation.y = this.heading;
    const close = Math.hypot(c.x - p.x, c.z - p.z) < 35; ch.setDetail?.(close);
    const talking = this.pause > 0;
    ch.update(dt, { speed: 0, mode: 'foot', pose: talking ? 'talk' : 'bump' });
    // the ball: off his forearms, up about 2.5 m, back down (in time with the bump), held while he talks
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading), b = this.ball;
    if (talking) { b.position.set(c.x + fx * 0.35, this.pos.y + 1.05, c.z + fz * 0.35); return; }
    const f = ((ch.poseT % 1.2) + 1.2) % 1.2 / 1.2;
    b.position.set(c.x + fx * 0.45, this.pos.y + 0.75 + 2.6 * 4 * f * (1 - f), c.z + fz * 0.45);
    b.rotation.x += dt * 6;
  }
  where() {
    return { walk: '跟羊明衫手牽手在校園散步 💑', volley: '在體育館旁的排球場打排球 🏐', off: '收假回營了（晚上 10 點到早上 9 點不在學校）' }[this.mode] || '';
  }
}
