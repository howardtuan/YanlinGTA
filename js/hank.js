// 漢克：皮膚偏黑的亞洲男生、捲捲的長髮，資管系、跟彥霖同系同學，跟戈登肉鋪的女拳大帝是室友。
// 興趣：聽團、寫程式（資管系校內專題競賽第一名）、騎車跑山看夜景、偶爾打 LOL。
// 一天的行程（遊戲時鐘）：
//   18:00–22:00 在活動中心麥當勞內場打工、顧薯條爐（穿店員制服、戴髮網；外場櫃台是值班經理羊明衫，js/mingshan.js）；
//   02:00–07:00 睡覺（哪裡都找不到他）；
//   其他時間以 90 分鐘為一段，大多騎他的 ZMAX（155cc 白牌大速克達）在校園外圍和附近道路兜風（跟著車流跑），
//   有時候把車停好、背著吉他在校園散步，跟他說話他會把吉他拿到身前彈一段給你聽。
// 他同一時間只會出現在一個地方。說完話可以選擇要不要加好友（js/friends.js 的 hank）。
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { dressCrew, CREW_SHIRT } from './mcuniform.js';
import { makeLabel } from './map.js';
import { surfaceAt } from './terrain.js';
import { Vehicle } from './vehicles.js';

export const HANK_LOOK = { skin: '#a8714c', shirt: '#202124', shorts: '#33445e', pants: true, hair: '#1b1410', hairStyle: 'curly', glasses: false, shoes: '#ececec', face: true };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const H32 = (n) => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; };

// acoustic guitar: two-lobed body, sound hole, neck and headstock (local: +y up the neck, +z out of the top)
function buildGuitar() {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color: '#e2b47a', roughness: 0.55 }), side = new THREE.MeshStandardMaterial({ color: '#8a4f24', roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 0.6 }), metal = new THREE.MeshStandardMaterial({ color: '#cfd3d8', metalness: 0.9, roughness: 0.25 });
  for (const [y, r] of [[-0.12, 0.19], [0.1, 0.15]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 24).rotateX(Math.PI / 2), side); b.position.y = y; g.add(b);
    const t = new THREE.Mesh(new THREE.CircleGeometry(r, 24), top); t.position.set(0, y, 0.051); g.add(t);
  }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), dark); hole.position.set(0, 0.02, 0.052); g.add(hole);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.012), dark); bridge.position.set(0, -0.15, 0.056); g.add(bridge);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.03), side); neck.position.set(0, 0.46, 0.03); g.add(neck);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.44, 0.006), dark); board.position.set(0, 0.46, 0.048); g.add(board);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.025), dark); head.position.set(0, 0.76, 0.025); head.rotation.x = -0.2; g.add(head);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.8, 0.002), metal); s.position.set(-0.0175 + i * 0.007, 0.25, 0.058); g.add(s); }
  return g;
}

// a strummed chord progression (C G Am F) from plucked-string (Karplus–Strong) samples, into the sound-effects bus
function playGuitar(audio) {
  const ctx = audio?.ctx; if (!ctx || !audio.sfx) return 0;
  const sr = ctx.sampleRate, pluck = (f, len = 2.2) => {
    const N = Math.floor(sr * len), b = ctx.createBuffer(1, N, sr), d = b.getChannelData(0), P = Math.max(2, Math.round(sr / f));
    const ring = new Float32Array(P); for (let i = 0; i < P; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 0, k = 0; i < N; i++) { const nx = (k + 1) % P, v = 0.497 * (ring[k] + ring[nx]); d[i] = ring[k]; ring[k] = v; k = nx; }
    return b;
  };
  const CH = { C: [130.8, 164.8, 196, 261.6, 329.6], G: [98, 123.5, 146.8, 196, 246.9, 392], Am: [110, 164.8, 220, 261.6, 329.6], F: [87.3, 130.8, 174.6, 220, 261.6, 349.2] };
  const out = ctx.createGain(); out.gain.value = 0.32; out.connect(audio.sfx);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(out);
  let t = ctx.currentTime + 0.1;
  for (const name of ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C']) {
    for (const [dt, down] of [[0, true], [0.62, false], [0.95, true]]) {
      const notes = down ? CH[name] : [...CH[name]].reverse().slice(0, 4);
      notes.forEach((f, i) => {
        const s = ctx.createBufferSource(); s.buffer = pluck(f); const gn = ctx.createGain(); gn.gain.value = down ? 0.55 : 0.32;
        s.connect(gn); gn.connect(lp); s.start(t + dt + i * 0.018); s.stop(t + dt + 2.4);
      });
    }
    t += 1.3;
  }
  return t - ctx.currentTime;
}

const g_kitchenBusy = (g) => !!g.job?.kitchen?.active; // you are on the kitchen shift yourself

export class Hank {
  constructor(game) {
    this.g = game; this.mode = null; this.walkOn = false; this.wait = 10;
    this.pos = new THREE.Vector3(); this.heading = 0; this.y = 0;
    // on foot, with the guitar on his back
    const ch = this.walker = createCharacter(HANK_LOOK);
    const tag = makeLabel('🎸 漢克', { height: 0.26, size: 40 }); tag.position.set(0, 2.12, 0); ch.root.add(tag);
    this.guitar = buildGuitar(); ch.torso.add(this.guitar); this._guitarBack();
    ch.root.visible = false; game.scene.add(ch.root);
    const pos = this.pos;
    game.interiors.actions.push({
      get x() { return pos.x; }, get z() { return pos.z; }, r: 2.4, y: 0, anyY: true,
      cond: () => this.walkOn && !this.playing, label: () => '按 <kbd>E</kbd> 和漢克聊天（他會彈吉他給你聽）', fn: () => this.serenade(),
    });
    // at work: McDonald's crew uniform and a hairnet, in the kitchen at the fries fryer (the front register is 羊明衫's)
    const mcd = game.interiors.mcd, K = mcd?.kitchen;
    if (K?.fryStaff) {
      const w = this.worker = createCharacter(HANK_LOOK); dressCrew(w, { name: '漢克', hairnet: true });
      const [fx, fz] = K.fryStaff, at = mcd.k.w(fx, fz), talk = mcd.k.w(fx + 0.9, fz);
      w.root.position.set(at[0], mcd.k.base, at[1]); w.root.rotation.y = mcd.k.heading(-Math.PI / 2); w.root.visible = false; game.scene.add(w.root);
      this.fryT = 0;
      game.interiors.actions.push({ x: talk[0], z: talk[1], r: 1.3, y: 0,
        cond: () => this.mode === 'work' && !mcd.busy && !mcd.closed && !g_kitchenBusy(game), label: () => '按 <kbd>E</kbd> 和炸薯條的漢克聊天',
        fn: () => game.friends?.talk('hank', 'work') });
    }
    // riding: his ZMAX joins the traffic with him on it (held back while he walks, works or sleeps)
    const rider = this.rider = createCharacter(HANK_LOOK), rtag = makeLabel('🏍️ 漢克', { height: 0.26, size: 40 }); rtag.position.set(0, 2.1, 0); rider.root.add(rtag);
    this.zmax = game.traffic?.adopt(new Vehicle('scooter', Math.random, { model: 'zmax' }), rider);
    if (this.zmax) { this.zmax.runBack = true; this.zmax.label = '漢克的 ZMAX'; } // knocked off, he runs back to it (js/npc.js _runBack)
    this.lent = false; this.lentIdle = 0;
  }
  _guitarBack() { const gt = this.guitar; gt.position.set(0.02, 0.3, -0.17); gt.rotation.set(0, Math.PI, 0.35); }
  _guitarFront() { const gt = this.guitar; gt.position.set(0.06, 0.24, 0.2); gt.rotation.set(0.15, 0.1, 1.15); }
  // you took his ZMAX (按 F 借用): left alone for 2 minutes, or once you are 150 m away from it, it goes back to him
  // (back into the traffic with him on it, as before)
  _lend(dt) {
    const g = this.g, Z = this.zmax; if (!Z) return;
    if (g.player.vehicle === Z) { this.lent = true; this.lentIdle = 0; return; }
    if (!this.lent || Z.ai) return;
    this.lentIdle += dt;
    const p = g.player.worldPos(), far = Math.hypot(Z.pos.x - p.x, Z.pos.z - p.z) > 150;
    if (this.lentIdle < 120 && !far) return;
    const i = g.vehicles.indexOf(Z); if (i >= 0) g.vehicles.splice(i, 1);
    g.scene.remove(Z.mesh);
    this.rider.root.parent?.remove(this.rider.root); this.rider.root.visible = true;
    g.traffic.adopt(Z, this.rider); Z.ai.hold = this.mode !== 'ride';
    this.lent = false; this.lentIdle = 0;
    g.hud.toast('🏍️ 漢克的 ZMAX 已經還給他了', 'good', 2600);
  }
  // where he is supposed to be at this game time
  _modeAt(clock) {
    const m = ((clock % 1440) + 1440) % 1440;
    if (m >= 18 * 60 && m < 22 * 60) return 'work';
    if (m >= 2 * 60 && m < 7 * 60) return 'sleep';
    return H32(Math.floor(clock / 90) + 77) < 0.35 ? 'walk' : 'ride';
  }
  // E on him while he strolls: he swings the guitar round, plays a few bars, then you talk (and maybe add him)
  serenade() {
    const g = this.g, p = g.player.worldPos();
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.playing = true; this._guitarFront();
    const len = playGuitar(g.audio) || 6;
    g.dialog([['漢克', '嘿彥霖！剛好在練團的新歌，彈給你聽 🎸'], ['漢克', '♪ ～ ♪♪ ～ ♪ ～（刷著和弦，輕輕哼著）']], () => {
      const done = () => { this.playing = false; this._guitarBack(); this.pause = 1.5; };
      setTimeout(() => g.friends ? g.friends.talk('hank', null, done) : done(), Math.max(0, len * 1000 - 3000));
    });
  }
  // a campus footpath node 30–90 m from you (like 勞大's walks); false off campus
  _appear() {
    const w = this.g.world, p = this.g.player.worldPos();
    const near = w.walkNodes.filter(n => { const d = Math.hypot(n.x - p.x, n.z - p.z); return d > 30 && d < 90 && w.inCampus(n.x, n.z); });
    if (!near.length) return false;
    const n = near[Math.floor(Math.random() * near.length)];
    this.from = n; this.to = this._pick(n, null); this.d = 0; this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
    this.pos.set(n.x, 0, n.z); this.y = surfaceAt(n.x, n.z); this.heading = Math.atan2(this.to.x - n.x, this.to.z - n.z); this.pause = 0;
    this.walkOn = true; this.walker.root.visible = true; return true;
  }
  _hideWalker() { this.walkOn = false; this.playing = false; this.walker.root.visible = false; this._guitarBack(); }
  _pick(n, from) {
    let opts = n.adj.filter(e => e.to !== from && this.g.world.inCampus(e.to.x, e.to.z));
    if (!opts.length) opts = n.adj;
    return opts[Math.floor(Math.random() * opts.length)].to;
  }
  update(dt) {
    const g = this.g, mode = this._modeAt(g.clock);
    if (mode !== this.mode) {
      this.mode = mode;
      if (mode !== 'walk' && !this.playing) this._hideWalker();
      if (mode === 'walk') this.wait = 3;
    }
    if (this.worker) { this.worker.root.visible = mode === 'work' && !g.interiors.mcd?.closed; if (this.worker.root.visible && g.player.pos.distanceToSquared(this.worker.root.position) < 4900) this.worker.update(dt, { speed: 0, pose: Math.sin(g.time * 0.9) > 0.3 ? 'give' : null }); } // shaking the fry basket now and then
    // the ZMAX: out in the traffic only while he rides; otherwise it stops coming and leaves once you can't see it
    const z = this.zmax?.ai;
    if (z) { z.hold = mode !== 'ride'; if (z.hold && !z.dormant && !g.traffic.inView(this.zmax.pos) && !g.player.vehicle?.ai) { z.dormant = true; this.zmax.mesh.visible = false; } }
    if (this.zmax && g.player.vehicle === this.zmax && z) z.hold = true; // you borrowed it: it stays out of the traffic
    this._lend(dt);
    // on foot
    if (mode !== 'walk' && !this.playing) return;
    const p = g.player.worldPos();
    if (!this.walkOn) { if ((this.wait -= dt) <= 0 && !this._appear()) this.wait = 15; return; }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (dPl > 170 && !this.playing) { this._hideWalker(); this.wait = 20; return; }
    let speed = 0;
    if (this.playing || this.g.hud.inDialog && dPl < 4) this.pause = Math.max(this.pause, 0.5);
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6);
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.25; this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to; this.to = this._pick(n, this.from); this.from = n; this.d = 0; this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.3) this.pause = 2 + Math.random() * 4;
      }
      const k = this.d / this.len, dx = this.to.x - this.from.x, dz = this.to.z - this.from.z, off = 0.6;
      const tx = this.from.x + dx * k - dz / this.len * off, tz = this.from.z + dz * k + dx / this.len * off;
      this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 4); this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 4);
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 6);
    }
    this.y = surfaceAt(this.pos.x, this.pos.z, this.y + 0.5);
    const r = this.walker.root; r.position.set(this.pos.x, this.y, this.pos.z); r.rotation.y = this.heading;
    this.walker.setDetail(dPl < 35);
    this.walker.update(dt, { speed, mode: 'foot', pose: this.playing ? 'guitar' : null });
  }
}
