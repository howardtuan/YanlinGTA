// 彥霖航空的直升機駕駛：高大壯碩的光頭黑人大叔，修得整齊的山羊鬍，穿湖人隊紫金球衣和及膝球褲（jersey.js，不放背號），
// 戴著橄欖綠的航空耳機（麥克風桿伸到嘴邊）。他開「呼叫載具」空運機車的那架直升機（airdrop.js）；
// 沒在飛的時候，會不定時出現在校園某處散步（CampusPilot）。他不會同時出現在兩個地方：開直升機時校園裡就看不到他。
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { dressLakers, LAKERS } from './jersey.js';
import { makeLabel } from './map.js';
import { surfaceAt } from './terrain.js';

export const PILOT_LOOK = {
  skin: '#6b4531', shirt: LAKERS.purple, shorts: LAKERS.purple, hem: -0.4, arm: 1.32, build: 1.18,
  hair: '#141010', hairStyle: 'bald', beard: 'goatee', shoes: '#f2f2f0', face: true,
};

let M = null;
function mats() {
  if (M) return M;
  M = {
    cup: new THREE.MeshStandardMaterial({ color: '#59683b', roughness: 0.55 }),  // olive green ear cups
    black: new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.6 }),
    seal: new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.9 }),
  };
  return M;
}

export function createPilot() {
  const ch = createCharacter(PILOT_LOOK);
  ch.root.scale.set(1.04, 1.06, 1.04); // a head taller than the students, and he still fits the cockpit
  const m = mats();
  const add = (parent, geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); parent.add(o); return o; };

  // ---- aviation headset (head-local: ears at x ±0.108, y 0.1) ----
  const hs = new THREE.Group(); ch.head.add(hs);
  for (const s of [-1, 1]) {
    const cup = add(hs, new THREE.CylinderGeometry(0.04, 0.044, 0.042, 18), m.cup, 0.137 * s, 0.098, -0.004);
    cup.rotation.z = Math.PI / 2;
    const seal = add(hs, new THREE.TorusGeometry(0.035, 0.009, 6, 18), m.seal, 0.116 * s, 0.098, -0.004);
    seal.rotation.y = Math.PI / 2;
    add(hs, new THREE.BoxGeometry(0.012, 0.03, 0.05), m.black, 0.16 * s, 0.1, -0.004);
  }
  const band = add(hs, new THREE.TorusGeometry(0.16, 0.0075, 6, 28, Math.PI), m.black, 0, 0.1, -0.004);
  band.scale.set(1, 0.84, 1);
  add(hs, new THREE.BoxGeometry(0.06, 0.014, 0.075), m.black, 0, 0.236, -0.004);
  // mic boom from the left cup round to the corner of the mouth (character's left = +x)
  const boom = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.15, 0.08, 0.025), new THREE.Vector3(0.138, 0.05, 0.07),
    new THREE.Vector3(0.1, 0.03, 0.108), new THREE.Vector3(0.066, 0.027, 0.124),
  ]);
  add(hs, new THREE.TubeGeometry(boom, 14, 0.0036, 5), m.black, 0, 0, 0);
  const mic = add(hs, new THREE.SphereGeometry(0.0115, 10, 8), m.black, 0.056, 0.027, 0.127);
  mic.scale.set(1.35, 1, 1);

  // ---- Lakers jersey over a bare torso and arms (the body's shirt colour becomes skin under it) ----
  if (dressLakers(ch, { build: PILOT_LOOK.build, hem: PILOT_LOOK.hem })) ch.bodyMesh.userData.recolor({ shirt: PILOT_LOOK.skin });

  ch.root.traverse(o => { if (o.isMesh && o.geometry.boundingSphere?.radius < 0.04) o.castShadow = false; });
  return ch;
}

// ---- the pilot on foot: turns up somewhere on campus near you, strolls the footpaths for a few minutes, wanders off,
// and shows up again somewhere else later. Hidden whenever he is flying (Airdrop passes busy = true).
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export class CampusPilot {
  constructor(game) {
    this.g = game; this.ch = null; this.on = false;
    this.wait = 25 + Math.random() * 35;        // first appearance within the first minute or so
    this.pos = new THREE.Vector3(); this.heading = 0; this.y = 0;
  }
  _build() {
    const ch = this.ch = createPilot();
    const tag = makeLabel('🚁 彥霖航空 機長', { height: 0.26, size: 40 }); tag.position.set(0, 2.12, 0); ch.root.add(tag);
    ch.root.visible = false; this.g.scene.add(ch.root);
  }
  // pick a campus footpath node 30–90 m from the player; false when there is none (you are off campus)
  appear() {
    const w = this.g.world, p = this.g.player.worldPos();
    const near = w.walkNodes.filter(n => { const d = Math.hypot(n.x - p.x, n.z - p.z); return d > 30 && d < 90 && w.inCampus(n.x, n.z); });
    if (!near.length) return false;
    if (!this.ch) this._build();
    const n = near[Math.floor(Math.random() * near.length)];
    this.from = n; this.to = this._pick(n, null); this.d = 0;
    this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
    this.pos.set(n.x, 0, n.z); this.y = surfaceAt(n.x, n.z); this.heading = Math.atan2(this.to.x - n.x, this.to.z - n.z);
    this.pause = 0; this.life = 150 + Math.random() * 150; // strolls for 2.5–5 minutes
    this.on = true; this.ch.root.visible = true;
    return true;
  }
  hide(wait = 90 + Math.random() * 120) { this.on = false; this.wait = wait; if (this.ch) this.ch.root.visible = false; }
  _pick(n, from) { // next node: stay on campus, don't turn straight back unless it's a dead end
    let opts = n.adj.filter(e => e.to !== from && this.g.world.inCampus(e.to.x, e.to.z));
    if (!opts.length) opts = n.adj;
    return opts[Math.floor(Math.random() * opts.length)].to;
  }
  update(dt, busy) {
    if (busy) { if (this.on) this.hide(40 + Math.random() * 40); return; } // he's up in the helicopter
    const p = this.g.player.worldPos();
    if (!this.on) { if ((this.wait -= dt) <= 0 && !this.appear()) this.wait = 15; return; }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    this.life -= dt;
    if (dPl > 170 || (this.life <= 0 && dPl > 60)) { this.hide(); return; } // left behind, or done and out of sight
    let speed = 0;
    if (this.pause > 0) this.pause -= dt;
    else {
      speed = 1.35; this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to; this.to = this._pick(n, this.from); this.from = n;
        this.d = 0; this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.3) this.pause = 2 + Math.random() * 4; // stops to look around now and then
      }
      const k = this.d / this.len, dx = this.to.x - this.from.x, dz = this.to.z - this.from.z, off = 0.6;
      const tx = this.from.x + dx * k - dz / this.len * off, tz = this.from.z + dz * k + dx / this.len * off;
      this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 4); this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 4);
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 6);
    }
    this.y = surfaceAt(this.pos.x, this.pos.z, this.y + 0.5);
    const r = this.ch.root; r.position.set(this.pos.x, this.y, this.pos.z); r.rotation.y = this.heading;
    this.ch.setDetail(dPl < 35);
    this.ch.update(dt, { speed, mode: 'foot' });
  }
}
