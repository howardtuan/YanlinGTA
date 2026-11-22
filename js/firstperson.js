// 第一人稱視角（V 鍵／手把 R3 切換，設定會記住）。走路時眼睛在頭的高度、滑鼠看哪裡就往哪裡看；
// 上車上機車時自動帶入，視角從駕駛座看出去：
//   汽車 — 儀表板（時速表、轉速表、檔位、時間）、會跟著轉向的方向盤、中控螢幕、A 柱、車頂、車門內板、
//          車頭引擎蓋，左右後照鏡和中間的車內後視鏡（即時畫出後方畫面）；
//   機車 — 把手、下方的液晶儀表（時速、油量、時間）、左右後照鏡（同樣即時畫出後方）。
// 第一人稱時車身和自己的角色會藏起來（不然鏡頭在模型裡面），換成這裡畫的座艙。
// 後照鏡：一台朝後的相機每兩格畫一張低解析度畫面到 render target，三面鏡子各取一段（左右翻轉，像真的鏡子）。
import * as THREE from 'three';
import { saveSettings } from './audio.js';

const box = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); return o; };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// a mirror face: a plane showing part [u0, u1] of the rear view, flipped left-right like a real mirror
function mirrorFace(w, h, tex, u0, u1, oval = false) {
  const g = oval ? new THREE.CircleGeometry(0.5, 28) : new THREE.PlaneGeometry(1, 1);
  if (oval) g.scale(w, h, 1); else g.scale(w, h, 1);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, u1 - (u1 - u0) * uv.getX(i));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

export class FirstPerson {
  constructor(game) {
    this.g = game; this.on = !!game.settings.fpv;
    this.rt = new THREE.WebGLRenderTarget(480, 160, { depthBuffer: true });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.mcam = new THREE.PerspectiveCamera(62, 3, 0.3, 160);
    this.frame = 0; this.kit = null; this.kitFor = null; this.hidden = null;
    game.renderer.localClippingEnabled = true; // the car's cabin is cut out of its body while you sit in it (_hide)
  }
  toggle() {
    this.on = !this.on;
    this.g.settings.fpv = this.on; saveSettings(this.g.settings);
    this.g.hud.toast(this.on ? '👀 第一人稱視角（V 切換）' : '🎥 第三人稱視角（V 切換）', 'good', 1500);
    this.g.audio.tap?.();
  }
  // ---------------- cockpits (vehicle-local: z forward, +x = left, y up from the ground) ----------------
  _gauge(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return { cv, g: cv.getContext('2d'), tex, key: '' };
  }
  _car(v) {
    const k = new THREE.Group(), S = v.seat, sx = S.x, low = v.model ? -0.12 : 0; // supercars sit lower
    const zb = this._cabin(v).zb, len = 0.95 - zb, zc = (0.95 + zb) / 2; // cabin from the firewall back to zb
    const dash = std('#26282d', { roughness: 0.85 }), trim = std('#3a3d44'), soft = std('#55585f', { roughness: 0.95 });
    const roof = std('#cfc8bb', { roughness: 0.95 });
    const y = (n) => n + low, d = v.model ? -0.1 : -0.07; // d: the dash sits a bit low so the car's own hood shows over it
    // dashboard, cluster hood, center console, door panels, pillars, roof liner, hood seen through the glass
    k.add(box(1.8, 0.2, 0.5, dash, 0, y(0.85) + d, 0.8));
    const top = box(1.8, 0.04, 0.42, trim, 0, y(0.96) + d, 0.72); top.rotation.x = -0.18; k.add(top);
    k.add(box(0.44, 0.1, 0.2, dash, sx, y(1.04) + d, 0.7)); // cluster hood
    k.add(box(0.3, 0.32, 0.5, dash, 0, y(0.62), 0.45)); // center console
    for (const s of [-1, 1]) {
      k.add(box(0.06, 0.72, len, soft, 0.86 * s, y(0.65), zc));                  // door panel, floor to window
      k.add(box(0.07, 0.04, len, trim, 0.84 * s, y(1.01), zc));                  // window sill
      k.add(box(0.03, 0.12, 0.5, trim, 0.83 * s, y(0.8), 0.05));                 // door handle and armrest
      const p = box(0.07, 0.62, 0.07, trim, 0.78 * s, y(1.24), 0.62); p.rotation.x = -0.75; p.rotation.z = -0.12 * s; k.add(p); // A-pillar
      const b = box(0.08, 0.5, 0.1, trim, 0.82 * s, y(1.26), -0.75); k.add(b);  // B-pillar
      const c = box(0.09, 0.55, 0.22, trim, 0.8 * s, y(1.24), zb + 0.12); c.rotation.x = 0.5; k.add(c); // C-pillar
    }
    k.add(box(1.7, 0.04, 0.42 - zb, roof, 0, y(1.5), (0.42 + zb) / 2));
    k.add(box(1.6, 0.09, 0.1, trim, 0, y(1.45), zb + 0.05)); // rear header
    k.add(box(1.6, 0.09, 0.1, trim, 0, y(1.45), 0.36)); // header over the windscreen
    // what you see looking down or around: carpet, firewall and pedals, the two front seats, the rear bench
    const carpet = std('#1c1d21', { roughness: 1 }), seatM = std(v.model ? '#2a1c18' : '#33363d', { roughness: 0.9 });
    k.add(box(1.72, 0.04, 2.5, carpet, 0, y(0.3), -0.35));
    k.add(box(1.72, 0.5, 0.08, carpet, 0, y(0.55), 1.02)); // firewall under the dash
    for (const [px, w] of [[0.1, 0.06], [-0.08, 0.1]]) k.add(box(w, 0.1, 0.02, trim, sx + px * Math.sign(sx || 1), y(0.45), 0.86).rotateX(0.5)); // brake, accelerator
    for (const s of [-1, 1]) {
      k.add(box(0.52, 0.14, 0.52, seatM, 0.4 * s, y(0.48), -0.22));                       // cushion
      const bk = box(0.5, 0.66, 0.12, seatM, 0.4 * s, y(0.86), -0.56); bk.rotation.x = -0.15; k.add(bk); // backrest
      k.add(box(0.28, 0.2, 0.1, seatM, 0.4 * s, y(1.3), -0.64));                          // headrest
    }
    if (v.model) k.add(box(1.72, 0.62, 0.06, carpet, 0, y(0.62), zb + 0.03)); // two-seater: bulkhead to the engine bay
    else { k.add(box(1.5, 0.16, 0.5, seatM, 0, y(0.5), -1.25)); k.add(box(1.5, 0.6, 0.14, seatM, 0, y(0.85), -1.52)); k.add(box(1.6, 0.04, 0.3, carpet, 0, y(0.97), zb + 0.17)); } // rear bench, parcel shelf
    // phone in a holder on the dash next to the cluster, toward the middle: a live mini map, the time and unread
    // messages; open the real phone with E while driving (the car keeps going, see main.js)
    const ph = new THREE.Group(), px = sx > 0 ? sx - 0.36 : sx + 0.36;
    ph.rotation.order = 'YXZ'; ph.position.set(px, y(1.07) + d, 0.6); ph.rotation.set(-0.35, Math.atan2(sx - px, (S.z + 0.08) - 0.6), 0);
    ph.add(box(0.19, 0.1, 0.012, std('#0b0b0d', { roughness: 0.4 }), 0, 0, 0.004));
    const pg = this._gauge(360, 180), pm = new THREE.Mesh(new THREE.PlaneGeometry(0.175, 0.0875), new THREE.MeshBasicMaterial({ map: pg.tex, toneMapped: false }));
    pm.position.z = 0.011; ph.add(pm);
    for (const s of [-1, 1]) ph.add(box(0.012, 0.03, 0.02, trim, 0.1 * s, 0, 0)); // the holder's clamps
    k.add(box(0.02, 0.07, 0.02, trim, px, y(1.02) + d, 0.62)); k.add(ph);
    // steering wheel (turns with the steering) with three spokes
    const wheel = new THREE.Group(); wheel.position.set(sx, y(0.86) + d * 0.6, 0.4); wheel.rotation.x = -0.55;
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 10, 36), std('#141414', { roughness: 0.6 })));
    for (const a of [0, 2.1, 4.2]) { const sp = box(0.16, 0.025, 0.02, trim, Math.cos(a - Math.PI / 2) * 0.08, Math.sin(a - Math.PI / 2) * 0.08, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp); }
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16).rotateX(Math.PI / 2), trim));
    k.add(wheel);
    // instrument cluster and the centre screen (canvas, redrawn when the numbers change)
    const cl = this._gauge(512, 192); const clm = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), new THREE.MeshBasicMaterial({ map: cl.tex, toneMapped: false }));
    clm.position.set(sx, y(1.03) + d, 0.59); clm.rotation.set(-0.3, Math.PI, 0); k.add(clm);
    const scr = this._gauge(256, 160); const scm = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.15), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }));
    scm.position.set(0, y(0.93) + d, 0.62); scm.rotation.set(-0.3, Math.PI, 0); k.add(scm);
    // mirrors: interior rear-view (middle of the rear view), left and right door mirrors (their side of it)
    const rv = box(0.26, 0.075, 0.03, std('#1a1a1a'), 0.02, y(1.4), 0.5); rv.rotation.y = -0.3; k.add(rv);
    const rvf = mirrorFace(0.24, 0.062, this.rt.texture, 0.3, 0.7); rvf.position.set(0.025, y(1.4), 0.483); rvf.rotation.y = Math.PI - 0.3; k.add(rvf);
    k.add(box(0.02, 0.1, 0.02, std('#1a1a1a'), 0.02, y(1.47), 0.5));
    for (const s of [-1, 1]) {
      // door mirrors, each turned to face the driver: the near one seen through the side window just behind the
      // A-pillar, the far one through the corner of the windscreen (a bit further forward than a real car so it fits)
      const near = Math.sign(sx) === s, mx = near ? 1.04 * s : 0.98 * s, mz = near ? 0.55 : 1.1;
      const face = Math.atan2(sx - mx, (S.z + 0.08) - mz);
      const hs = box(0.24, 0.16, 0.07, std('#1d1f23'), 0, 0, 0); hs.position.set(mx + Math.sin(face) * -0.04, y(1.08), mz + Math.cos(face) * -0.04); hs.rotation.y = face; k.add(hs);
      const f = mirrorFace(0.22, 0.14, this.rt.texture, s > 0 ? 0.62 : 0, s > 0 ? 1 : 0.38, true);
      f.position.set(mx, y(1.08), mz); f.rotation.y = face; k.add(f);
    }
    return { group: k, wheel, cl, scr, ph: pg, kind: 'car' };
  }
  _bike(v) {
    const k = new THREE.Group(), S = v.seat, y0 = S.y + 1.05;
    const blk = std('#18191c', { roughness: 0.55 }), grip = std('#0e0e0e', { roughness: 0.95 }), chrome = std('#cfd3d8', { metalness: 0.9, roughness: 0.25 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.72, 10).rotateZ(Math.PI / 2), chrome); bar.position.set(0, y0, 0.45); k.add(bar);
    for (const s of [-1, 1]) { const gp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 12).rotateZ(Math.PI / 2), grip); gp.position.set(0.3 * s, y0, 0.45); k.add(gp); }
    k.add(box(0.36, 0.1, 0.16, blk, 0, y0 - 0.06, 0.55)); // headset cowl under the meter
    const cowl = box(0.46, 0.06, 0.32, blk, 0, y0 - 0.13, 0.7); cowl.rotation.x = 0.25; k.add(cowl);
    const mt = this._gauge(512, 224);
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.14), new THREE.MeshBasicMaterial({ map: mt.tex, toneMapped: false }));
    mm.position.set(0, y0 + 0.03, 0.55); mm.rotation.set(0.75, Math.PI, 0); k.add(mm); // tilted up toward the rider's eyes
    k.add(box(0.345, 0.16, 0.02, blk, 0, y0 + 0.022, 0.562).rotateX(0.75));
    for (const s of [-1, 1]) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 8), chrome); stalk.position.set(0.31 * s, y0 + 0.11, 0.44); stalk.rotation.z = -0.25 * s; k.add(stalk);
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28).scale(0.16, 0.1, 1), blk); back.position.set(0.35 * s, y0 + 0.24, 0.425); k.add(back);
      const f = mirrorFace(0.15, 0.09, this.rt.texture, s > 0 ? 0.62 : 0, s > 0 ? 1 : 0.38, true);
      f.position.set(0.35 * s, y0 + 0.24, 0.42); f.rotation.y = Math.PI - 0.15 * s; k.add(f);
    }
    return { group: k, mt, kind: 'bike' };
  }
  // a car is swapped for the cockpit; a scooter keeps its body (you see it looking down) and only loses the
  // handlebar, headset, meter and mirrors above and in front of the seat, which the kit draws instead
  _hide(v) {
    if (v.kind !== 'scooter') return this._clipCar(v);
    v.mesh.updateMatrixWorld(true);
    const inv = v.mesh.matrixWorld.clone().invert(), S = v.seat, b = new THREE.Box3(), parts = [], rider = this.g.player.ch.root;
    v.mesh.traverse(o => {
      if (!o.isMesh || o.userData.lodFar) return;
      for (let p = o; p; p = p.parent) if (p === rider) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
      // moved to a layer no camera draws instead of visible = false, which the far-LOD check (js/vehicles.js) would
      // take for an unmarked part toggling and drop the vehicle's far copy
      if (b.min.y > S.y + 0.92 && b.max.z > S.z + 0.15) { o.layers.set(1); parts.push(o); }
    });
    this.hidden = v; this.parts = parts;
  }
  _unhide() {
    if (this.parts) for (const o of this.parts) o.layers.set(0);
    if (this.mats) for (const [o, mt] of this.mats) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(x => x.dispose()); o.material = mt; }
    this.hidden = null; this.parts = null; this.mats = null; this.clip = null;
  }
  // the cabin of car v in its own frame: firewall at z 0.95..1.0, back to zb (behind the rear bench, or right behind
  // the seats of a two-seater), between the doors, from just above the floor up
  _cabin(v) { return { zb: v.model ? -0.85 : -1.6, zf: 1.0, hx: 0.86, y0: v.seat.y + 0.42 }; }
  // a car stays drawn (hood, wings, nose, wheels, its own colour) but the part of its body inside the cabin is cut
  // away with clipping planes on its own copies of the materials, so the roof, glass and the body's top don't cover
  // the view; the kit draws the interior there. Planes are in world space, moved with the car every frame (update)
  _clipCar(v) {
    const C = this._cabin(v), P = (x, y, z, c) => new THREE.Plane(new THREE.Vector3(x, y, z), c);
    const local = [P(1, 0, 0, -C.hx), P(-1, 0, 0, -C.hx), P(0, 0, 1, -C.zf), P(0, 0, -1, C.zb), P(0, -1, 0, C.y0)];
    const world = local.map(p => p.clone()), mats = new Map(), rider = this.g.player.ch.root;
    v.mesh.traverse(o => {
      if (!o.isMesh || o.userData.lodFar) return;
      for (let p = o; p; p = p.parent) if (p === rider) return;
      mats.set(o, o.material);
      const cut = (mt) => { const c = mt.clone(); c.clippingPlanes = world; c.clipIntersection = true; c.clipShadows = true; return c; };
      o.material = Array.isArray(o.material) ? o.material.map(cut) : cut(o.material);
    });
    this.hidden = v; this.mats = mats; this.parts = null; this.clip = { local, world };
  }
  _kitFor(v) {
    if (this.kitFor === v && this.kit) return this.kit;
    this._dropKit();
    const kit = v.kind === 'scooter' ? this._bike(v) : this._car(v);
    kit.group.matrixAutoUpdate = false; this.g.scene.add(kit.group);
    this.kit = kit; this.kitFor = v; return kit;
  }
  _dropKit() {
    if (!this.kit) return;
    this.g.scene.remove(this.kit.group);
    this.kit.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.kit = null; this.kitFor = null;
  }
  // eye position in the vehicle's own frame
  eyeLocal(v) {
    const S = v.seat;
    return v.kind === 'scooter' ? new THREE.Vector3(0, S.y + 1.56, S.z + 0.02) : new THREE.Vector3(S.x, S.y + (v.model ? 1.03 : 1.17), S.z + 0.08);
  }
  // ---------------- per frame (after the camera rig) ----------------
  get active() { return this.on && !this.g.airdrop?.cinema && !this.g.job?.active && !this.g.gate?.active; }
  update(dt) {
    const g = this.g, pl = g.player, v = pl.vehicle, act = this.active;
    // the player's own figure: hidden on foot in first person (the concert does the same inside the venue)
    // your own figure: hidden in first person; in a car always (third person too: a low roof cuts through the head)
    if (!g.rig.fp) pl.ch.root.visible = !act && !(v && v.kind !== 'scooter');
    // the vehicle you are in: hidden in first person (the cockpit stands in for it)
    if (this.hidden && (this.hidden !== v || !act)) this._unhide();
    if (act && v && this.hidden !== v) this._hide(v);
    if (!(act && v)) { if (this.kit) { this._dropKit(); } return; }
    const kit = this._kitFor(v);
    v.mesh.updateMatrixWorld(true);
    kit.group.matrix.copy(v.mesh.matrixWorld); kit.group.matrixWorldNeedsUpdate = true;
    if (this.clip) this.clip.local.forEach((p, i) => this.clip.world[i].copy(p).applyMatrix4(v.mesh.matrixWorld));
    if (kit.ph) this._drawPhone(kit.ph, v);
    const kmh = Math.round(Math.abs(v.speed) * 3.6);
    if (kit.wheel) kit.wheel.rotation.z = -v.steer * 1.6;
    if (kit.cl) this._drawCar(kit, kmh, v);
    if (kit.mt) this._drawBike(kit, kmh, v);
  }
  _drawCar(kit, kmh, v) {
    const key = kmh + '|' + Math.floor(this.g.clock);
    if (kit.cl.key === key) return; kit.cl.key = key;
    const { g, cv } = kit.cl, W = cv.width, H = cv.height;
    g.fillStyle = '#07090c'; g.fillRect(0, 0, W, H);
    const dial = (cx, val, max, label, col) => {
      g.strokeStyle = '#2a3140'; g.lineWidth = 10; g.beginPath(); g.arc(cx, 112, 74, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
      g.strokeStyle = col; g.beginPath(); g.arc(cx, 112, 74, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * Math.min(1, val / max))); g.stroke();
      const a = Math.PI * (0.75 + 1.5 * Math.min(1, val / max));
      g.strokeStyle = '#ff4040'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, 112); g.lineTo(cx + Math.cos(a) * 66, 112 + Math.sin(a) * 66); g.stroke();
      g.fillStyle = '#9aa4b5'; g.font = '700 18px sans-serif'; g.textAlign = 'center'; g.fillText(label, cx, 168);
    };
    dial(110, kmh, 200, 'km/h', '#4fa3ff');
    const rpm = 900 + Math.min(1, Math.abs(v.speed) / v.maxSpeed) * 5200 + (Math.abs(v.speed) > 0.5 ? 300 : 0);
    dial(402, rpm, 7000, 'x1000 rpm', '#ffb02e');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 52px sans-serif'; g.fillText(String(kmh), 256, 92);
    g.font = '700 22px sans-serif'; g.fillStyle = '#9aa4b5'; g.fillText('km/h', 256, 120);
    g.fillStyle = '#4fdc7a'; g.font = '800 30px sans-serif'; g.fillText(v.speed < -0.3 ? 'R' : kmh < 1 ? 'P' : 'D', 256, 170);
    g.fillStyle = '#9aa4b5'; g.font = '600 18px sans-serif'; g.fillText(hhmm(this.g.clock), 256, 30);
    kit.cl.tex.needsUpdate = true;
    // centre screen: a little map arrow and the place you are at
    const s = kit.scr; if (s.key !== Math.floor(this.g.clock / 2)) {
      s.key = Math.floor(this.g.clock / 2); const c = s.g;
      c.fillStyle = '#0c1a2b'; c.fillRect(0, 0, 256, 160); c.strokeStyle = '#1e3a5f'; c.lineWidth = 6;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, 30 + i * 30); c.lineTo(256, 10 + i * 34); c.stroke(); }
      c.fillStyle = '#4fa3ff'; c.beginPath(); c.moveTo(128, 60); c.lineTo(112, 100); c.lineTo(128, 92); c.lineTo(144, 100); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.font = '700 18px sans-serif'; c.textAlign = 'center'; c.fillText(this.g.hud._loc || '中原大學', 128, 140);
      s.tex.needsUpdate = true;
    }
  }
  // the dash phone: mini map around you turned to your heading, the time, unread messages; twice a second
  _drawPhone(P, v) {
    const g = this.g, t = g.time || 0; if (t - (P.t ?? -9) < 0.5 && t >= P.t) return; P.t = t;
    const c = P.g, W = P.cv.width, H = P.cv.height, hud = g.hud, wp = g.player.worldPos(), cy = H * 0.6;
    c.fillStyle = '#1b1d22'; c.fillRect(0, 0, W, H);
    if (hud?.mapCanvas && hud.w2m) {
      const s = hud.scale, [mx, mz] = hud.w2m(wp.x, wp.z), k = W / (140 * s); // 140 m across
      c.save(); c.translate(W / 2, cy); c.rotate(Math.PI + v.heading); c.scale(k, k); c.drawImage(hud.mapCanvas, -mx, -mz); c.restore();
    }
    c.fillStyle = '#2f8cff'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2, cy - 14); c.lineTo(W / 2 - 10, cy + 10); c.lineTo(W / 2, cy + 4); c.lineTo(W / 2 + 10, cy + 10); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 0, W, 34); c.fillStyle = '#fff'; c.font = '700 22px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(hhmm(g.clock), 12, 17); c.textAlign = 'right'; c.fillText('📱 按 E 使用', W - 12, 17);
    c.textAlign = 'center'; c.font = '700 18px sans-serif'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, H - 28, W, 28); c.fillStyle = '#fff'; c.fillText(hud?._loc || '', W / 2, H - 14);
    P.tex.needsUpdate = true;
  }
  _drawBike(kit, kmh, v) {
    const key = kmh + '|' + Math.floor(this.g.clock);
    if (kit.mt.key === key) return; kit.mt.key = key;
    const { g, cv } = kit.mt, W = cv.width, H = cv.height;
    g.fillStyle = '#0b0f0d'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c8f7d0'; g.textAlign = 'right'; g.font = '800 110px "Consolas",monospace'; g.fillText(String(kmh), 300, 140);
    g.textAlign = 'left'; g.font = '700 30px sans-serif'; g.fillText('km/h', 312, 140);
    // rpm bar along the top
    const r = Math.min(1, Math.abs(v.speed) / v.maxSpeed);
    for (let i = 0; i < 20; i++) { g.fillStyle = i / 20 < r ? (i > 15 ? '#ff5a4a' : '#7cf0a0') : '#1f2a24'; g.fillRect(24 + i * 23, 18, 18, 20); }
    // fuel and the clock
    g.fillStyle = '#7cf0a0'; g.font = '700 24px sans-serif'; g.fillText('F', 30, 200); for (let i = 0; i < 6; i++) { g.fillStyle = i < 5 ? '#7cf0a0' : '#1f2a24'; g.fillRect(52 + i * 22, 182, 16, 22); }
    g.fillStyle = '#c8f7d0'; g.textAlign = 'right'; g.font = '700 30px sans-serif'; g.fillText(hhmm(this.g.clock), W - 24, 204);
    g.textAlign = 'left'; g.fillStyle = '#ffb02e'; g.font = '700 22px sans-serif'; g.fillText(v.label || '', 24, 80);
    kit.mt.tex.needsUpdate = true;
  }
  // the rear view for the mirrors: before the main render, every other frame, cockpit hidden, no shadow pass
  renderMirrors(renderer) {
    if (!this.kit || !this.kitFor) return;
    if ((this.frame++ & 1) === 1) return;
    const v = this.kitFor, e = this.eyeLocal(v).add(new THREE.Vector3(0, 0, -0.4)).applyMatrix4(v.mesh.matrixWorld);
    const h = v.heading + Math.PI, c = this.mcam;
    c.position.copy(e); c.lookAt(e.x + Math.sin(h), e.y - 0.08, e.z + Math.cos(h)); c.updateMatrixWorld();
    const sh = renderer.shadowMap.autoUpdate, prev = renderer.getRenderTarget();
    this.kit.group.visible = false; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.rt); renderer.render(this.g.scene, c); renderer.setRenderTarget(prev);
    renderer.shadowMap.autoUpdate = sh; this.kit.group.visible = true;
  }
}
