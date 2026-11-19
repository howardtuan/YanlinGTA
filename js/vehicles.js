import * as THREE from 'three';
import { surfaceAt } from './terrain.js';

const MC = {};
const m = (c, o = {}) => { const k = c + JSON.stringify(o); return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o })); };
const box = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.castShadow = true; return o; };
const GW = {};
function wheel(r, w, x, y, z) {
  const k = r + '_' + w;
  const g = GW[k] || (GW[k] = new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2));
  const o = new THREE.Mesh(g, m('#1a1a1a', { roughness: 0.9 })); o.position.set(x, y, z); o.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.01, 10).rotateZ(Math.PI / 2), m('#9aa0a6', { metalness: 0.7, roughness: 0.3 }));
  o.add(hub);
  return o;
}

function plateTex(text, bg = '#fff', fg = '#111') {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48;
  const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 128, 48); g.fillStyle = fg;
  g.font = '900 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 26);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildScooter(color) {
  const g = new THREE.Group();
  const body = m(color, { roughness: 0.35, metalness: 0.2 });
  const dark = m('#222', { roughness: 0.7 });
  const wheels = [wheel(0.27, 0.12, 0, 0.27, 0.62), wheel(0.27, 0.13, 0, 0.27, -0.6)];
  g.add(...wheels);
  g.add(box(0.36, 0.1, 0.8, dark, 0, 0.32, 0.05)); // floorboard
  const rear = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.5, 4, 10).rotateX(Math.PI / 2), body);
  rear.scale.set(1, 0.9, 1); rear.position.set(0, 0.55, -0.42); rear.castShadow = true; g.add(rear);
  g.add(box(0.3, 0.1, 0.62, m('#151515', { roughness: 0.9 }), 0, 0.75, -0.36)); // seat
  const shield = box(0.44, 0.75, 0.14, body, 0, 0.72, 0.5); shield.rotation.x = -0.25; g.add(shield);
  const stem = box(0.08, 0.5, 0.08, dark, 0, 1.0, 0.56); stem.rotation.x = -0.25; g.add(stem);
  g.add(box(0.62, 0.05, 0.05, dark, 0, 1.22, 0.5)); // handlebar
  g.add(box(0.26, 0.14, 0.12, body, 0, 1.2, 0.56)); // headset
  const hl = box(0.16, 0.08, 0.04, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6d0', emissiveIntensity: 1 }), 0, 1.2, 0.63); g.add(hl);
  g.add(box(0.2, 0.06, 0.04, new THREE.MeshStandardMaterial({ color: '#900', emissive: '#ff2020', emissiveIntensity: 0.6 }), 0, 0.62, -0.92));
  const fender = box(0.18, 0.06, 0.4, body, 0, 0.56, 0.66); g.add(fender);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.09), new THREE.MeshBasicMaterial({ map: plateTex('MAN-34') }));
  plate.position.set(0, 0.48, -0.93); plate.rotation.y = Math.PI; g.add(plate);
  g.userData.wheels = wheels;
  return g;
}


// SYM JET SL — sporty 125cc scooter, pink & white two-tone (the hero's ride)
function sideShape(pts) { const sh = new THREE.Shape(); pts.forEach(([z, y], i) => i ? sh.lineTo(-z, y) : sh.moveTo(-z, y)); sh.closePath(); return sh; }
function extrudeSide(pts, width, mat) {
  const g = new THREE.ExtrudeGeometry(sideShape(pts), { depth: width, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  g.rotateY(Math.PI / 2); g.translate(-width / 2, 0, 0);
  const o = new THREE.Mesh(g, mat); o.castShadow = true; return o;
}
function decalTex(text, color) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const g = cv.getContext('2d'); g.clearRect(0, 0, 256, 96);
  g.font = 'italic 900 64px system-ui'; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 10, 52);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildJetSL() {
  const g = new THREE.Group();
  const white = m('#f7f5f4', { roughness: 0.25, metalness: 0.15 });
  const pink = m('#ff5fae', { roughness: 0.25, metalness: 0.2 });
  const dark = m('#1b1b1f', { roughness: 0.6 });
  const wheels = [wheel(0.29, 0.13, 0, 0.29, 0.66), wheel(0.29, 0.15, 0, 0.29, -0.62)];
  for (const w of wheels) { w.children[0].material = m('#ff5fae', { metalness: 0.5, roughness: 0.3 }); }
  g.add(...wheels);
  // rear body (white), sweeping up to a sharp tail
  g.add(extrudeSide([[0.18, 0.38], [-0.18, 0.4], [-0.3, 0.66], [-0.98, 0.9], [-1.02, 0.82], [-0.86, 0.62], [-0.4, 0.38]], 0.36, white));
  // pink side stripe on rear body
  g.add(extrudeSide([[-0.32, 0.58], [-0.95, 0.83], [-0.97, 0.78], [-0.38, 0.52]], 0.4, pink));
  // floorboard
  g.add(box(0.36, 0.08, 0.62, dark, 0, 0.36, 0.0));
  // front apron (pink) with sharp nose
  g.add(extrudeSide([[0.2, 0.38], [0.5, 0.42], [0.66, 0.78], [0.6, 1.05], [0.46, 1.12], [0.3, 0.95], [0.22, 0.6]], 0.46, pink));
  // white inner leg-shield
  g.add(extrudeSide([[0.18, 0.4], [0.24, 0.62], [0.34, 0.98], [0.28, 1.02], [0.12, 0.5]], 0.4, white));
  // front fender (pink)
  const fen = extrudeSide([[0.42, 0.55], [0.86, 0.58], [0.9, 0.52], [0.5, 0.47]], 0.16, pink); g.add(fen);
  // V-shaped LED headlights
  const led = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e8f4ff', emissiveIntensity: 1.4 });
  for (const s of [-1, 1]) { const l = box(0.14, 0.04, 0.05, led, 0.1 * s, 0.86, 0.66); l.rotation.z = 0.35 * s; g.add(l); }
  // seat (black, stepped) + grab rail
  g.add(box(0.3, 0.1, 0.42, dark, 0, 0.84, -0.24));
  g.add(box(0.27, 0.12, 0.3, dark, 0, 0.9, -0.6));
  g.add(box(0.3, 0.03, 0.22, m('#9aa0a6', { metalness: 0.7 }), 0, 0.93, -0.84));
  // handlebar cover + mirrors + short screen
  const stem = box(0.08, 0.4, 0.08, dark, 0, 1.05, 0.48); stem.rotation.x = -0.3; g.add(stem);
  g.add(box(0.66, 0.05, 0.05, dark, 0, 1.22, 0.42));
  g.add(box(0.34, 0.12, 0.2, white, 0, 1.2, 0.46));
  for (const s of [-1, 1]) { g.add(box(0.02, 0.22, 0.02, dark, 0.22 * s, 1.34, 0.4)); g.add(box(0.12, 0.07, 0.03, dark, 0.24 * s, 1.46, 0.4)); }
  const scr = box(0.26, 0.16, 0.02, new THREE.MeshStandardMaterial({ color: '#333', transparent: true, opacity: 0.6 }), 0, 1.32, 0.5); scr.rotation.x = -0.4; g.add(scr);
  // tail light + exhaust + plate
  g.add(box(0.2, 0.06, 0.04, new THREE.MeshStandardMaterial({ color: '#900', emissive: '#ff2020', emissiveIntensity: 0.9 }), 0, 0.84, -1.0));
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 10).rotateX(Math.PI / 2), m('#b8bcc2', { metalness: 0.85, roughness: 0.25 })); ex.position.set(0.2, 0.36, -0.55); g.add(ex);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.1), new THREE.MeshBasicMaterial({ map: plateTex('JET-034') })); plate.position.set(0, 0.6, -1.0); plate.rotation.y = Math.PI; g.add(plate);
  // decals: "JET SL" on both sides, "SYM" on the apron
  const jt = decalTex('JET SL', '#ff3d9a'), sy = decalTex('SYM', '#ffffff');
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: jt, transparent: true }));
    d.position.set(0.255 * s, 0.7, -0.5); d.rotation.order = 'YXZ'; d.rotation.y = s * Math.PI / 2; d.rotation.x = 0; d.rotation.z = 0.3; g.add(d);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({ map: sy, transparent: true }));
    e.position.set(0.26 * s, 0.8, 0.45); e.rotation.y = s * Math.PI / 2; g.add(e);
  }
  g.userData.wheels = wheels;
  return g;
}

export function buildCar(color, taxi = false) {
  const g = new THREE.Group();
  const body = m(color, { roughness: 0.3, metalness: 0.4 });
  const glass = m('#24323f', { roughness: 0.1, metalness: 0.6 });
  g.add(box(1.8, 0.62, 4.3, body, 0, 0.62, 0));
  const cab = box(1.62, 0.56, 2.2, glass, 0, 1.2, -0.25); g.add(cab);
  g.add(box(1.66, 0.08, 2.0, body, 0, 1.5, -0.3)); // roof
  for (const s of [-1, 1]) g.add(box(0.08, 0.5, 0.08, body, 0.78 * s, 1.2, 0.84));
  const wheels = [];
  for (const [x, z] of [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]]) { const w = wheel(0.34, 0.24, x, 0.34, z); wheels.push(w); g.add(w); }
  const hlm = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d6', emissiveIntensity: 1 });
  const tlm = new THREE.MeshStandardMaterial({ color: '#700', emissive: '#ff1a1a', emissiveIntensity: 0.7 });
  for (const s of [-1, 1]) { g.add(box(0.36, 0.14, 0.05, hlm, 0.62 * s, 0.75, 2.16)); g.add(box(0.36, 0.14, 0.05, tlm, 0.62 * s, 0.78, -2.16)); }
  g.add(box(1.7, 0.16, 0.12, m('#222'), 0, 0.42, 2.15));
  g.add(box(1.7, 0.16, 0.12, m('#222'), 0, 0.42, -2.15));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.17), new THREE.MeshBasicMaterial({ map: plateTex(taxi ? 'TDA-034' : 'CYU-34' + Math.floor(Math.random() * 10)) }));
  plate.position.set(0, 0.55, -2.22); plate.rotation.y = Math.PI; g.add(plate);
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshStandardMaterial({ map: plateTex('TAXI', '#ffe066', '#111'), emissive: '#ffe066', emissiveIntensity: 0.3 }));
    sign.position.set(0, 1.66, -0.3); g.add(sign);
  }
  g.userData.wheels = wheels;
  return g;
}

const SCOOTER_COLORS = ['#e8e8e8', '#c1121f', '#1d3557', '#ffb703', '#2a9d8f', '#111111', '#8ecae6', '#f28482', '#7b8a8b'];
const CAR_COLORS = ['#f0f0f0', '#222222', '#9aa3ab', '#b5121b', '#1e3a8a', '#6b7280', '#d1d5db', '#14532d'];

let VID = 0;
export class Vehicle {
  constructor(kind, rnd = Math.random, opt = {}) {
    this.id = VID++;
    this.kind = kind;
    const pick = a => a[Math.floor(rnd() * a.length)];
    if (kind === 'scooter') {
      this.mesh = opt.jet ? buildJetSL() : buildScooter(pick(SCOOTER_COLORS));
      Object.assign(this, { wb: 1.25, radius: 0.75, maxSpeed: opt.jet ? 22 : 19, accel: opt.jet ? 10.5 : 9, brake: 18, turn: 2.6, grip: 9, seat: new THREE.Vector3(0, opt.jet ? 0.08 : 0.0, -0.3), exitSide: 1.0, label: opt.jet ? '我的 SYM JET SL' : '機車', jet: !!opt.jet });
    } else {
      const taxi = kind === 'taxi';
      this.mesh = buildCar(taxi ? '#ffd000' : pick(CAR_COLORS), taxi);
      Object.assign(this, { wb: 2.7, radius: 1.35, maxSpeed: 30, accel: 8, brake: 16, turn: 1.7, grip: 6, seat: new THREE.Vector3(0.38, 0.12, -0.2), exitSide: 2.0, label: taxi ? '計程車' : '汽車' });
    }
    this.pos = new THREE.Vector3();
    this.heading = 0; this.moveAng = 0; this.speed = 0; this.steer = 0; this.lean = 0; this.pitch = 0;
    this.mesh.rotation.order = 'YXZ'; // yaw, then pitch, then lean
    this.driver = null; // 'player' | 'ai' | null
    this.ai = null; this.bumpCooldown = 0; this.wheelRot = 0;
    this.mesh.traverse(o => { if (o.isMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.castShadow = o.geometry.boundingSphere.radius > 0.4; } });
  }
  place(x, z, h) { this.pos.set(x, 0, z); this.heading = this.moveAng = h; this.speed = 0; this.sync(); }
  forward() { return [Math.sin(this.heading), Math.cos(this.heading)]; }
  sync(dt = 0) {
    // pos stays on the 2D plane (y = 0); the mesh sits on the ground under both
    // wheels and pitches with it (visual only, handling is unchanged)
    const fx = Math.sin(this.heading) * this.wb / 2, fz = Math.cos(this.heading) * this.wb / 2;
    const hf = surfaceAt(this.pos.x + fx, this.pos.z + fz), hb = surfaceAt(this.pos.x - fx, this.pos.z - fz);
    const pt = -Math.atan2(hf - hb, this.wb);
    this.pitch = dt > 0 ? this.pitch + (pt - this.pitch) * Math.min(1, dt * 10) : pt;
    this.mesh.position.set(this.pos.x, (hf + hb) / 2, this.pos.z);
    this.mesh.rotation.set(this.pitch, this.heading, 0);
    if (this.kind === 'scooter') {
      const targetLean = -this.steer * Math.min(1, Math.abs(this.speed) / 10) * 0.35;
      this.lean += (targetLean - this.lean) * Math.min(1, dt * 6);
      this.mesh.rotation.z = this.lean;
    }
    this.wheelRot += this.speed * dt / 0.3;
    for (const w of this.mesh.userData.wheels) w.rotation.x = this.wheelRot;
  }
  // player driving physics. inp: {throttle(-1..1), steer(-1..1), handbrake}
  drive(dt, inp, collision, others, onBump) {
    const thr = inp.throttle, hb = inp.handbrake;
    if (thr > 0) this.speed += (this.speed < 0 ? this.brake : this.accel * (1 - Math.max(0, this.speed) / this.maxSpeed * 0.6)) * thr * dt;
    else if (thr < 0) {
      if (this.speed > 0.5) this.speed -= this.brake * dt;
      else this.speed = Math.max(-6, this.speed - this.accel * 0.6 * dt);
    } else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), (1.5 + Math.abs(this.speed) * 0.08) * dt);
    if (hb) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 7 * dt);
    this.speed = Math.max(-6, Math.min(this.maxSpeed, this.speed));
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 8);
    const sp = Math.abs(this.speed);
    const f = Math.min(1, sp / 4) * (1 - 0.45 * Math.min(1, sp / this.maxSpeed));
    const turnRate = this.steer * this.turn * f * (hb ? 1.7 : 1);
    this.heading += turnRate * dt * Math.sign(this.speed || 1);
    // drift: movement direction lags heading
    let d = this.heading - this.moveAng; d = Math.atan2(Math.sin(d), Math.cos(d));
    const grip = hb ? 1.6 : this.grip;
    this.moveAng += d * Math.min(1, grip * dt);
    this.drifting = hb && sp > 6 && Math.abs(d) > 0.2;
    const dx = Math.sin(this.moveAng) * this.speed * dt, dz = Math.cos(this.moveAng) * this.speed * dt;
    // substeps against tunnelling
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (this.radius * 0.5)));
    let hitN = null;
    for (let i = 0; i < steps; i++) {
      this.pos.x += dx / steps; this.pos.z += dz / steps;
      const r = collision.resolve(this.pos, this.radius);
      if (r.hit) hitN = r;
    }
    this.bumpCooldown -= dt;
    if (hitN) {
      const fx = Math.sin(this.moveAng), fz = Math.cos(this.moveAng);
      const impact = -(fx * hitN.nx + fz * hitN.nz) * this.speed;
      if (impact > 2) { this.speed *= 0.35; if (this.bumpCooldown <= 0) { onBump && onBump(impact); this.bumpCooldown = 0.4; } }
      else this.speed *= 0.97;
    }
    // vehicle-vehicle
    for (const o of others) {
      if (o === this) continue;
      const ddx = this.pos.x - o.pos.x, ddz = this.pos.z - o.pos.z, rr = this.radius + o.radius;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const dd = Math.sqrt(d2), push = rr - dd;
        this.pos.x += ddx / dd * push * 0.7; this.pos.z += ddz / dd * push * 0.7;
        o.pos.x -= ddx / dd * push * 0.3; o.pos.z -= ddz / dd * push * 0.3;
        if (!o.ai) collision.resolve(o.pos, o.radius); // parked cars / your scooter: don't shove them into walls (AI cars snap back to their lane)
        o.sync();
        if (Math.abs(this.speed) > 3 && this.bumpCooldown <= 0) { onBump && onBump(Math.abs(this.speed)); this.bumpCooldown = 0.5; }
        this.speed *= 0.6;
        if (o.ai) o.ai.stunned = 2;
      }
    }
    this.sync(dt);
  }
}
