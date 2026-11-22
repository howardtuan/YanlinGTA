// 羊明衫：資管系同學、班上的「內捲王」（成績超好、基本上什麼都會），個性溫和友善。舞蹈專家，未來想加入 K-POP 韓國女團。
// 外型照使用者給的照片：白皙圓臉、紅棕色長直髮加齊瀏海。
// 一天（遊戲時鐘）：
//   09:00–17:00 在資訊管理學系館正面（「資管要贏 票投彥霖」布條前的走廊）練宿營的舞，她養的橘貓跟在旁邊；
//     其中有些整點不練舞，跟男朋友 YeeMing 手牽手在校園散步（walk：位置與動作由 js/yeeming.js 控制）；
//   18:00–22:00 在活動中心麥當勞當外場（櫃台）兼值班經理，跟漢克同一班（漢克在內場炸薯條）；
//   其他時間在圖書館／宿舍讀書或睡覺（找不到人）。
// 橘貓：走過去按 E 可以摸摸頭；牠只吃戈登肉鋪的肉（js/gordon.js 買過的肉），有肉就可以選擇餵牠。
//   摸頭和餵食都是幾秒鐘的 21:9 特寫（跟呼叫載具一樣的黑邊），彥霖蹲下來摸牠／把肉放到牠面前。
// 說完話可以加好友（js/friends.js 的 mingshan）；存檔 save.js 的 mingshan（見過、餵過幾次）。
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { dressCrew } from './mcuniform.js';
import { makeLabel } from './map.js';
import { surfaceAt } from './terrain.js';

export const MINGSHAN_LOOK = {
  skin: '#f3d6c4', hair: '#7a2a20', hairStyle: 'long', shirt: '#17171a', shorts: '#1c1c20', pants: true,
  shoes: '#f4f4f1', jaw: 0.96, face: true,
};
const NAME = '羊明衫';
const M = (h, m = 0) => h * 60 + m;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
// in front of the 資管系館: the walkway along its south face, under the 「資管要贏 票投彥霖」 banner, facing the lawn
const DANCE = { x: 101.7, z: 115.6, h: Math.atan2(-0.32, 0.95) };

export function mingshanPlan(clock) {
  const m = ((clock % 1440) + 1440) % 1440;
  if (m >= M(9) && m < M(17)) return ((Math.floor(clock / 60) * 2246822519) >>> 0) % 100 < 40 ? 'walk' : 'dance'; // some hours: a walk with YeeMing
  if (m >= M(18) && m < M(22)) return 'work';
  return m >= M(17) && m < M(18) ? 'library' : m >= M(22) ? 'study' : 'sleep';
}

// ---------------- the orange cat ----------------
function buildCat() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const fur = new THREE.MeshStandardMaterial({ color: '#e8913a', roughness: 0.85 }), dark = new THREE.MeshStandardMaterial({ color: '#c0631c', roughness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: '#fbf3e6', roughness: 0.9 }), black = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.3 });
  const pink = new THREE.MeshStandardMaterial({ color: '#f0a3a8', roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), fur); torso.scale.set(0.1, 0.095, 0.2); torso.position.y = 0.2; body.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), white); chest.scale.set(0.07, 0.07, 0.08); chest.position.set(0, 0.17, 0.13); body.add(chest);
  for (const z of [-0.1, -0.03, 0.04]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.03), dark); s.position.set(0, 0.29, z); s.rotation.x = 0; body.add(s); }
  // legs (front pair can be swung for walking; the back pair folds when sitting)
  const legs = [];
  for (const [x, z] of [[0.055, 0.13], [-0.055, 0.13], [0.055, -0.13], [-0.055, -0.13]]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.17, z); body.add(hip);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.16, 8), fur); leg.position.y = -0.08; hip.add(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), white); paw.scale.set(1, 0.6, 1.3); paw.position.set(0, -0.165, 0.008); hip.add(paw);
    legs.push(hip);
  }
  // head
  const head = new THREE.Group(); head.position.set(0, 0.3, 0.2); body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), fur); skull.scale.set(1.08, 0.95, 0.95); head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), white); muzzle.scale.set(1.2, 0.8, 0.8); muzzle.position.set(0, -0.03, 0.065); head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), pink); nose.position.set(0, -0.012, 0.098); head.add(nose);
  const eyes = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), fur); ear.position.set(s * 0.05, 0.075, -0.005); ear.rotation.set(-0.15, Math.PI / 4, s * -0.28); head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.045, 4), pink); inner.position.set(s * 0.05, 0.07, 0.008); inner.rotation.set(-0.15, Math.PI / 4, s * -0.28); head.add(inner);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshStandardMaterial({ color: '#7ac043', roughness: 0.2 })); eye.position.set(s * 0.035, 0.012, 0.072); head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), black); pupil.scale.set(0.5, 1.2, 0.5); pupil.position.set(s * 0.035, 0.012, 0.086); head.add(pupil);
    eyes.push(eye, pupil);
    for (const k of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.08, 3), white); wh.rotation.z = Math.PI / 2 + k * 0.12; wh.position.set(s * 0.07, -0.03 + k * 0.006, 0.07); head.add(wh); }
  }
  // happy closed eyes (^ ^), shown while being petted / eating
  const shut = [];
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 4, 10, Math.PI), black); c.position.set(s * 0.035, 0.008, 0.083); head.add(c); c.visible = false; shut.push(c); }
  // tail: a chain of segments that curls up and sways
  const tail = []; let parent = body, at = new THREE.Vector3(0, 0.24, -0.19);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Group(); s.position.copy(at); parent.add(s);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018 - i * 0.0015, 0.02 - i * 0.0015, 0.06, 8), i % 2 ? dark : fur); m.position.y = 0.03; s.add(m);
    tail.push(s); parent = s; at = new THREE.Vector3(0, 0.06, 0);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, body, head, legs, tail, eyes, shut };
}

// a little heart sprite (for the petting / feeding close-ups)
let heartTex = null;
function heart() {
  if (!heartTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.font = '52px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('💗', 32, 36);
    heartTex = new THREE.CanvasTexture(c); heartTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
  s.scale.setScalar(0.12); return s;
}
// a slab of marbled beef (the 戈登肉鋪 meat)
function buildMeat() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.085), new THREE.MeshStandardMaterial({ color: '#b8323a', roughness: 0.55 })); g.add(m);
  for (const z of [-0.025, 0.01, 0.03]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.027, 0.006), new THREE.MeshStandardMaterial({ color: '#f3dede', roughness: 0.6 })); f.position.z = z; f.rotation.y = 0.2; g.add(f); }
  return g;
}

export class Mingshan {
  constructor(game) {
    this.g = game; this.mode = null; this.state = { met: false, fed: 0, petted: 0 };
    this.pos = new THREE.Vector3(); this.heading = DANCE.h;
    // dancing (black tee, black pants, white sneakers)
    const ch = this.ch = createCharacter(MINGSHAN_LOOK);
    const tag = makeLabel('💃 羊明衫', { height: 0.26, size: 40, color: '#ffb3c7' }); tag.position.set(0, 2.05, 0); ch.root.add(tag);
    ch.root.visible = false; game.scene.add(ch.root);
    // the spot: the walkway in front of the building (nudged onto free ground if something stands there)
    const w = game.world; let sp = { ...DANCE };
    if (w?.isFree && !w.isFree(sp.x, sp.z, 0.6)) {
      for (let r = 1; r < 8 && sp === DANCE; r += 1) for (let a = 0; a < 6.28; a += 0.5) { const x = DANCE.x + Math.cos(a) * r, z = DANCE.z + Math.sin(a) * r; if (w.isFree(x, z, 0.6)) { sp = { x, z, h: DANCE.h }; break; } }
    }
    this.spot = sp;
    this.pos.set(sp.x, surfaceAt(sp.x, sp.z), sp.z);
    // at work: the register at the dining end (where 漢克 used to stand: he fries in the kitchen now, js/hank.js)
    const mcd = game.interiors.mcd;
    if (mcd?.hankSpot) {
      const wk = this.worker = createCharacter(MINGSHAN_LOOK); dressCrew(wk, { name: '值班經理 羊明衫' });
      const wt = makeLabel('🍟 值班經理 羊明衫', { height: 0.24, size: 40, color: '#ffd23f' }); wt.position.set(0, 2.0, 0); wk.root.add(wt);
      const s = mcd.hankSpot; wk.root.position.set(s.at[0], s.y, s.at[1]); wk.root.rotation.y = s.h; wk.root.visible = false; game.scene.add(wk.root);
      game.interiors.actions.push({ x: s.talk[0], z: s.talk[1], r: 1.4, y: 0,
        cond: () => this.mode === 'work' && !mcd.busy && !mcd.closed, label: () => `按 <kbd>E</kbd> 和櫃台的值班經理${NAME}說話`,
        fn: () => this.talk('work') });
    }
    // talk while she dances
    game.interiors.actions.push({
      get x() { return game.mingshan.pos.x; }, get z() { return game.mingshan.pos.z; }, r: 2.0, y: 0, anyY: true,
      cond: () => this.mode === 'dance' && ch.root.visible && !this.film,
      label: () => `按 <kbd>E</kbd> 和${NAME}聊天`, fn: () => this.talk('dance'),
    });
    // her cat (follows her round while she dances)
    const cat = this.cat = buildCat(); cat.g.visible = false; game.scene.add(cat.g);
    this.catPos = new THREE.Vector3(sp.x + 1.4, 0, sp.z + 0.6); this.catH = 0; this.catT = 2; this.catTo = null; this.catState = 'sit'; this.catPh = 0;
    const tg = this.catTag = makeLabel('🐱 橘貓', { height: 0.2, size: 36, color: '#ffb35c' }); tg.position.set(0, 0.62, 0); cat.g.add(tg);
    game.interiors.actions.push({
      get x() { return game.mingshan.catPos.x; }, get z() { return game.mingshan.catPos.z; }, r: 1.3, y: 0, anyY: true,
      cond: () => this.mode === 'dance' && cat.g.visible && !this.film,
      label: () => this.meat() > 0 ? `按 <kbd>E</kbd> 跟橘貓玩（餵牠吃戈登肉鋪的肉，或摸摸頭）` : '按 <kbd>E</kbd> 摸摸橘貓的頭（牠只吃戈登肉鋪的肉）',
      fn: () => this.catMenu(),
    });
    this.film = null; this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._look = new THREE.Vector3(); this.hearts = [];
    this.meatMesh = buildMeat(); this.meatMesh.visible = false; game.scene.add(this.meatMesh);
    this._beatT = 0; this._beat = 0;
  }
  toJSON() { return this.state; }
  load(d) { if (d && typeof d === 'object') Object.assign(this.state, d); }
  get cinema() { return !!this.film; }
  // meat bought at 戈登肉鋪 that the cat hasn't eaten yet
  meat() { const b = this.g.gordon?.bought || {}; return Math.max(0, Object.values(b).reduce((s, n) => s + n, 0) - (this.state.fed || 0)); }

  // ---------------- talking ----------------
  talk(where) {
    const g = this.g;
    if (where === 'dance') { const p = g.player.worldPos(); this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.pause = 3; }
    const first = !this.state.met; this.state.met = true;
    g.friends?.talk('mingshan', where, () => { this.pause = 0.5; if (first && where === 'dance') g.hud.toast('🐱 她的橘貓就在旁邊，走過去按 E 可以摸摸牠', 'good', 2800); });
  }

  // ---------------- the cat: E -> pet, or (with 戈登肉鋪 meat) choose ----------------
  catMenu() {
    const g = this.g, n = this.meat();
    if (!n) { this.play('pet'); return; }
    document.exitPointerLock?.();
    g.modal('🐱 橘貓', `<p style="margin:0 0 12px;line-height:1.7">橘貓用圓圓的眼睛看著你……牠只吃<b>戈登肉鋪</b>的肉。<br><small style="opacity:.75">你身上還有 ${n} 份戈登肉鋪的肉</small></p>
      <div class="modal-btns"><button class="menu-btn primary" id="catFeed"><span>🥩 餵牠吃肉</span><small>1</small></button>
      <button class="menu-btn" id="catPet"><span>🤚 摸摸頭</span><small>2</small></button>
      <button class="menu-btn" id="catNo"><span>算了</span><small>Esc</small></button></div>`, 'CAT');
    const done = (k) => { removeEventListener('keydown', key, true); g.closeModal(); g.resume?.(); if (k) this.play(k); else g.lockPointer?.(); };
    const key = (e) => {
      if (!g._modalOpen) { removeEventListener('keydown', key, true); return; }
      const k = e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'Enter' ? 'feed' : e.code === 'Digit2' || e.code === 'Numpad2' ? 'pet' : e.code === 'Escape' ? '' : null;
      if (k === null) return; e.preventDefault(); e.stopPropagation(); done(k);
    };
    addEventListener('keydown', key, true);
    document.getElementById('catFeed').onclick = () => done('feed');
    document.getElementById('catPet').onclick = () => done('pet');
    document.getElementById('catNo').onclick = () => done('');
  }
  // the 21:9 close-up: 彥霖 squats by the cat and pets it / puts the meat down in front of it
  play(kind) {
    const g = this.g, pl = g.player; if (this.film) return;
    if (kind === 'feed' && this.meat() <= 0) kind = 'pet';
    const c = this.catPos, p = pl.worldPos();
    let a = Math.atan2(p.x - c.x, p.z - c.z); if (!Number.isFinite(a)) a = 0;
    const d = kind === 'feed' ? 1.02 : 0.82; // squatting puts his feet ~0.45 m forward: keep them clear of the cat and the meat
    const px = c.x + Math.sin(a) * d, pz = c.z + Math.cos(a) * d;
    pl.place(px, pz, a + Math.PI); pl.y = 0; pl.vy = 0; pl.vel.set(0, 0);
    this.catH = a; this.catState = 'film'; this.catTo = null;
    this.film = { kind, t: 0, dur: kind === 'feed' ? 6.6 : 5.2, a }; this.catTag.visible = false;
    pl.forceMode = 'sit'; pl.setPose(kind, 99);
    this._cinema(true);
    if (kind === 'feed') { this.meatMesh.visible = false; this.meatMesh.scale.setScalar(1); }
  }
  _endFilm() {
    const g = this.g, pl = g.player, F = this.film; this.film = null;
    pl.forceMode = null; pl.setPose(null, 0); this.meatMesh.visible = false;
    for (const s of this.cat.shut) s.visible = false; for (const e of this.cat.eyes) e.visible = true;
    for (const h of this.hearts) h.parent?.remove(h); this.hearts = [];
    this.catState = 'sit'; this.catT = 3; this.catTag.visible = true;
    this._cinema(false);
    const cam = g.camera; if (this._fov0) { cam.fov = this._fov0; cam.updateProjectionMatrix(); this._fov0 = null; }
    g.rig.first = true; g.rig.yaw = pl.heading;
    if (F.kind === 'feed') {
      this.state.fed = (this.state.fed || 0) + 1;
      g.hud.toast(`🐱 橘貓吃得好滿足 💕（剩 ${this.meat()} 份戈登肉鋪的肉）`, 'good', 2800);
      if (this.state.fed === 1) g.dialog([[NAME, '哇，你居然有戈登肉鋪的肉！牠超挑嘴，只吃那家 😂'], [NAME, '謝謝你～牠以後看到你一定會跑過來。']]);
    } else {
      this.state.petted = (this.state.petted || 0) + 1;
      g.hud.toast('🐱 橘貓舒服地瞇起眼睛 💕', 'good', 2200);
    }
    g.lockPointer?.();
  }
  _cinema(on) {
    let el = document.getElementById('cinema');
    if (!el) { el = document.createElement('div'); el.id = 'cinema'; el.innerHTML = '<i class="cb cb-a"></i><i class="cb cb-b"></i>'; document.body.appendChild(el); }
    const W = innerWidth, Hh = innerHeight, A = 21 / 9, tall = W / A <= Hh;
    el.classList.toggle('side', !tall);
    el.style.setProperty('--bar', (tall ? (Hh - W / A) / 2 : (W - Hh * A) / 2) + 'px');
    document.body.classList.toggle('cinema', on);
    if (on) { this.g.input.releaseAll?.(); this.g.audio.setEngine?.(false, 0); }
  }

  // ---------------- every frame (main.js) ----------------
  update(dt) {
    const g = this.g, plan = mingshanPlan(g.clock);
    if (plan !== this.mode && !this.film) this.mode = plan;
    const p = g.player.worldPos();
    // at the register
    if (this.worker) {
      const on = this.mode === 'work' && !g.interiors.mcd?.closed;
      this.worker.root.visible = on;
      if (on && g.player.pos.distanceToSquared(this.worker.root.position) < 4900) this.worker.update(dt, { speed: 0, pose: Math.sin(g.time * 0.7) > 0.6 ? 'talk' : null });
    }
    // walking with YeeMing: js/yeeming.js places and animates her (the cat stays home)
    if (this.mode === 'walk') { this.cat.g.visible = false; if (!g.yeeming?.walkOn) this.ch.root.visible = false; return; }
    // dancing in front of the 資管系館, the cat round her
    const dance = this.mode === 'dance', near = Math.hypot(this.spot.x - p.x, this.spot.z - p.z) < 160 || !!this.film;
    this.ch.root.visible = dance && near; this.cat.g.visible = dance && near;
    if (!dance || !near) return;
    const ch = this.ch, sp = this.spot;
    this.pos.set(sp.x, surfaceAt(sp.x, sp.z, this.pos.y + 0.5), sp.z);
    let pose = 'dance';
    if (this.pause > 0 || g.hud.inDialog && Math.hypot(p.x - sp.x, p.z - sp.z) < 4) { this.pause = Math.max(0, (this.pause || 0) - dt); pose = 'talk'; if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6); }
    else { this.face = null; this.heading += angDiff(sp.h, this.heading) * Math.min(1, dt * 3); }
    ch.root.position.copy(this.pos); ch.root.rotation.y = this.heading;
    const close = Math.hypot(p.x - sp.x, p.z - sp.z) < 40;
    ch.setDetail?.(close);
    ch.update(dt, { speed: 0, pose });
    if (pose === 'dance' && close) this._music(dt, Math.hypot(p.x - sp.x, p.z - sp.z));
    this._catTick(dt, p);
  }
  // a quiet K-pop-ish beat while you are near her (kick, clap, hat, a bass line), under the sound-effects volume
  _music(dt, d) {
    const A = this.g.audio, ctx = A.ctx; if (!ctx || !A.sfx || this.g.hud.inDialog) return;
    this._beatT -= dt; if (this._beatT > 0) return;
    this._beatT += 0.25; // 16ths at 120 bpm
    const b = this._beat++ % 16, t = ctx.currentTime + 0.02, vol = Math.max(0, 1 - d / 40) * 0.5;
    if (vol <= 0.01) return;
    const tone = (f, len, type, v, f2) => { const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len); gn.gain.setValueAtTime(v * vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(gn); gn.connect(A.sfx); o.start(t); o.stop(t + len + 0.02); };
    if (b % 4 === 0) tone(140, 0.16, 'sine', 0.5, 45);                  // kick
    if (b === 4 || b === 12) A.noise?.(0.09, 1800, 1, 0.22 * vol, 0, 'bandpass'); // clap
    if (b % 2 === 1) A.noise?.(0.03, 8000, 1, 0.06 * vol, 0, 'highpass');       // hat
    const bass = [55, 0, 55, 0, 65.4, 0, 65.4, 0, 49, 0, 49, 0, 58.3, 0, 58.3, 0][b]; if (bass) tone(bass * 2, 0.2, 'sawtooth', 0.12, null);
  }
  _catTick(dt, p) {
    const C = this.cat, sp = this.spot, F = this.film;
    let walk = false;
    if (F) {
      // the close-up
      F.t += dt; const t = F.t, k = F.kind;
      if (k === 'pet') {
        const happy = t > 0.9 && t < F.dur - 0.4;
        for (const e of C.eyes) e.visible = !happy; for (const s of C.shut) s.visible = happy;
        C.head.rotation.x = happy ? -0.35 + Math.sin(t * 5) * 0.08 : 0; C.head.rotation.z = happy ? Math.sin(t * 2.5) * 0.18 : 0;
        if (happy) this._purr(dt);
      } else {
        // the meat goes down in front of it, it eats, then it looks up happily
        const m = this.meatMesh, c = this.catPos, a = F.a;
        if (t > 1.0) { m.visible = t < 5.0; const mx = c.x + Math.sin(a) * 0.28, mz = c.z + Math.cos(a) * 0.28; m.position.set(mx, Math.max(surfaceAt(mx, mz), c.y) + 0.055, mz); /* paving slabs sit a few cm over the ground height */ m.rotation.y = a; m.scale.setScalar(1.4 * Math.max(0.05, 1 - seg(t, 2.0, 5.0) * 0.95)); }
        const eat = t > 1.8 && t < 5.0;
        C.head.rotation.x = eat ? 0.95 + Math.abs(Math.sin(t * 7)) * 0.25 : t >= 5.0 ? -0.3 : 0;
        const happy = t >= 5.0; for (const e of C.eyes) e.visible = !happy; for (const s of C.shut) s.visible = happy;
        if (eat && Math.random() < dt * 6) this.g.audio.noise?.(0.03, 2500, 1, 0.05, 0, 'bandpass'); // nom
      }
      // hearts float up from the cat
      if (t > (k === 'pet' ? 1.2 : 4.9) && Math.random() < dt * 3.5) {
        const h = heart(); h.position.set(this.catPos.x + (Math.random() - 0.5) * 0.2, this.catPos.y + 0.45, this.catPos.z + (Math.random() - 0.5) * 0.2); h.userData.v = 0.35 + Math.random() * 0.2; h.userData.life = 1.6;
        this.g.scene.add(h); this.hearts.push(h);
      }
      if (t >= F.dur) { this._endFilm(); return; }
    } else {
      // wander round her: pick a spot 1.2–2.4 m away now and then, walk there, sit; look at you when you come close
      const dP = Math.hypot(p.x - this.catPos.x, p.z - this.catPos.z);
      if (!this.catTo && (this.catT -= dt) <= 0) {
        const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 1.2;
        const x = sp.x + Math.sin(a) * r, z = sp.z + Math.cos(a) * r;
        if (!this.g.world?.isFree || this.g.world.isFree(x, z, 0.25)) this.catTo = { x, z };
        this.catT = 5 + Math.random() * 6;
      }
      if (this.catTo && dP > 1.0) {
        const dx = this.catTo.x - this.catPos.x, dz = this.catTo.z - this.catPos.z, d = Math.hypot(dx, dz);
        if (d < 0.08) this.catTo = null;
        else { const s = Math.min(d, 0.75 * dt); this.catPos.x += dx / d * s; this.catPos.z += dz / d * s; this.catH += angDiff(Math.atan2(dx, dz), this.catH) * Math.min(1, dt * 6); walk = true; }
      } else if (dP < 3) this.catH += angDiff(Math.atan2(p.x - this.catPos.x, p.z - this.catPos.z), this.catH) * Math.min(1, dt * 3);
      C.head.rotation.x *= 0.9; C.head.rotation.z *= 0.9;
    }
    this.catPos.y = surfaceAt(this.catPos.x, this.catPos.z, this.catPos.y + 0.3);
    C.g.position.copy(this.catPos); C.g.rotation.y = this.catH;
    // body: walking legs, or sitting (front up, back legs folded)
    this.catPh += dt * (walk ? 9 : 0);
    const sit = !walk;
    C.body.rotation.x = sit ? -0.42 : 0; C.body.position.y = sit ? 0.035 : 0; C.body.position.z = sit ? -0.04 : 0;
    C.legs.forEach((l, i) => { l.rotation.x = walk ? Math.sin(this.catPh + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.5 : i < 2 ? 0.42 : -1.1; });
    const tt = this.g.time;
    C.tail.forEach((s, i) => { s.rotation.x = i === 0 ? (sit ? -0.2 : -0.9) : -0.25; s.rotation.z = Math.sin(tt * (this.film ? 3.5 : 1.6) + i * 0.6) * 0.22; });
    // hearts
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i]; h.userData.life -= dt; h.position.y += h.userData.v * dt; h.material.opacity = Math.min(1, h.userData.life);
      if (h.userData.life <= 0) { h.parent?.remove(h); this.hearts.splice(i, 1); }
    }
  }
  _purr(dt) {
    const A = this.g.audio, ctx = A.ctx; if (!ctx || !A.sfx) return;
    if ((this._purrT = (this._purrT || 0) - dt) > 0) return; this._purrT = 0.55;
    A.noise?.(0.45, 120, 1, 0.12, 0, 'lowpass');
  }
  // the close-up camera (after the normal rig, main.js)
  camera(cam, dt) {
    const F = this.film; if (!F) return;
    const c = this.catPos, a = F.a, side = a + Math.PI / 2, t = F.t;
    // low, from the side of the cat and 彥霖's hand, slowly drifting in
    const d = 1.55 - ease(seg(t, 0, F.dur)) * 0.35;
    cam.position.set(c.x + Math.sin(side) * d + Math.sin(a) * 0.25, c.y + 0.55, c.z + Math.cos(side) * d + Math.cos(a) * 0.25);
    this._look.set(c.x + Math.sin(a) * 0.25, c.y + 0.32, c.z + Math.cos(a) * 0.25);
    cam.lookAt(this._look);
    if (cam.fov !== 42) { this._fov0 = this._fov0 ?? cam.fov; cam.fov = 42; cam.updateProjectionMatrix(); }
  }
  // where she is (定位 / 你在哪)
  where() {
    return { walk: '跟 YeeMing 手牽手在校園散步 💑', dance: '在資管系館正面練舞（宿營的舞）💃', work: '在活動中心麥當勞櫃台值班（值班經理，到 22:00）', library: '在圖書館讀書（內捲中）📚', study: '在宿舍熬夜讀書 📖', sleep: '睡覺中（離線）' }[this.mode] || '';
  }
}
