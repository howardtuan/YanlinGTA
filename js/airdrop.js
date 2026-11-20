// Played as a short film: 21:9 letterbox, HUD hidden, the player can't move, and a street-level camera
// follows the helicopter in, watches the scooter touch down and the helicopter leave, then hands back.
// 呼叫載具 (phone app): a 彥霖航空 (Yanlin Air) helicopter flies in with your JET SL hanging under it on a cable, lowers it
// onto the road next to you, lets go and flies off again.
import * as THREE from 'three';
import { surfaceAt } from './terrain.js';

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const T_IN = 7, T_LOWER = 4.5, T_OUT = 8, HOVER = 16, CINE_OUT = 4.5; // the film ends 4.5 s into the fly-away

function buildHeli() {
  const g = new THREE.Group();
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.2, ...o });
  // 彥霖航空 livery: white body, dark green belly stripe and tail with a thin orange line, green lettering
  const white = mat('#f2f3f5'), green = mat('#00664f'), orange = mat('#f39800'), dark = mat('#26282d'), glass = mat('#1d3550', { roughness: 0.1, metalness: 0.6 });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  add(new THREE.CapsuleGeometry(1.05, 2.4, 6, 16), white, 0, 0, 0, Math.PI / 2, 0, 0).scale.set(1, 1, 0.92);   // cabin
  add(new THREE.BoxGeometry(2.12, 0.34, 3.2), green, 0, -0.45, -0.2);                                        // green stripe
  add(new THREE.BoxGeometry(2.14, 0.07, 3.1), orange, 0, -0.24, -0.2);                                       // orange pinstripe
  add(new THREE.SphereGeometry(0.95, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0, 0.05, 1.45, Math.PI / 2.4, 0, 0); // windscreen
  add(new THREE.CylinderGeometry(0.28, 0.13, 4.6, 10), white, 0, 0.35, -3.6, Math.PI / 2, 0, 0);              // tail boom
  add(new THREE.BoxGeometry(0.12, 1.3, 0.8), green, 0, 0.9, -5.7, -0.3, 0, 0);                                 // fin
  add(new THREE.BoxGeometry(1.6, 0.08, 0.45), white, 0, 0.45, -5.4);                                           // stabiliser
  for (const x of [-0.85, 0.85]) {                                                                            // skids
    add(new THREE.BoxGeometry(0.08, 0.08, 3.6), dark, x, -1.35, 0.1);
    add(new THREE.BoxGeometry(0.06, 0.55, 0.06), dark, x * 0.85, -1.08, 0.9, 0, 0, x > 0 ? -0.3 : 0.3);
    add(new THREE.BoxGeometry(0.06, 0.55, 0.06), dark, x * 0.85, -1.08, -0.7, 0, 0, x > 0 ? -0.3 : 0.3);
  }
  add(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), dark, 0, 1.15, 0);                                      // mast
  const rotor = new THREE.Group(); rotor.position.set(0, 1.42, 0); g.add(rotor);
  for (const a of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.05, 0.28), dark); b.rotation.y = a; rotor.add(b); }
  const tail = new THREE.Group(); tail.position.set(0.18, 0.5, -5.75); g.add(tail);
  for (const a of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.14), dark); b.rotation.x = a; tail.add(b); }
  // green 彥霖航空 / YANLIN AIR on both sides of the cabin
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#00664f'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '900 68px "Noto Sans TC","Microsoft JhengHei",sans-serif'; c.fillText('彥霖航空', 256, 50);
  c.font = '800 30px "Arial",sans-serif'; c.fillText('YANLIN AIR', 256, 106);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); p.position.set(s * 1.02, 0.28, -0.3); p.rotation.y = s * Math.PI / 2; g.add(p); }
  return { g, rotor, tail };
}

export class Airdrop {
  constructor(game) { this.g = game; this.run = null; this.cinema = false; this._look = new THREE.Vector3(); }
  get busy() { return !!this.run; }
  // letterbox to a 21:9 picture, hide the HUD; the game freezes the player while this is on
  _cinema(on) {
    this.cinema = on;
    let el = document.getElementById('cinema');
    if (!el) { el = document.createElement('div'); el.id = 'cinema'; el.innerHTML = '<i class="cb cb-a"></i><i class="cb cb-b"></i>'; document.body.appendChild(el); addEventListener('resize', () => this._bars()); }
    this._bars();
    document.body.classList.toggle('cinema', on);
    if (on) { this.g.input.releaseAll(); this.g.audio.setEngine(false, 0); }
    else if (this._fov) { const c = this.g.camera; c.fov = this._fov; c.updateProjectionMatrix(); this._fov = null; }
    else this.g.hud.toast('🛵 機車送到了，騎上去吧！', 'good', 2600);
  }
  _bars() {
    const el = document.getElementById('cinema'); if (!el) return;
    const W = innerWidth, Hh = innerHeight, A = 21 / 9, tall = W / A <= Hh;
    el.classList.toggle('side', !tall);
    el.style.setProperty('--bar', (tall ? (Hh - W / A) / 2 : (W - Hh * A) / 2) + 'px');
  }
  // the film camera (called after the normal camera rig)
  camera(cam, dt) {
    const R = this.run; if (!R || !this.cinema) return;
    const h = R.H.g.position, s = R.v.mesh.position;
    // lowering: aim at the middle of the cable so the helicopter and the touch-down both stay in the 21:9 frame
    const want = R.phase === 'lower' ? new THREE.Vector3().lerpVectors(h, s, 0.5) : h;
    this._look.lerp(want, Math.min(1, dt * 3));
    cam.position.copy(R.cam); cam.lookAt(this._look);
    if (cam.fov !== 70) { this._fov = this._fov ?? cam.fov; cam.fov = 70; cam.updateProjectionMatrix(); }
  }
  // returns an error message, or null when the helicopter is on its way
  call() {
    const g = this.g, pl = g.player, v = g.myScooter;
    if (!v) return '找不到你的機車';
    if (this.run) return '🚁 直升機已經在路上了';
    if (pl.vehicle === v) return '你正騎著它呢 🛵';
    if (g.race.state !== 'idle') return '比賽中不能呼叫載具';
    const p = pl.worldPos();
    if (!pl.vehicle && (pl.y > 1 || g.interiors.zoneAt(p.x, p.z, pl.y))) return '直升機進不來，先到戶外再呼叫';
    // a free spot on the road next to you
    const w = g.world; let spot = null;
    const rp = w.nearestRoadPoint(p.x, p.z);
    if (rp && Math.hypot(rp.x - p.x, rp.z - p.z) < 25 && w.isFree(rp.x, rp.z, 1.6)) spot = { x: rp.x, z: rp.z, h: rp.dir };
    for (let r = 4; !spot && r < 24; r += 2) for (let a = 0; a < 6.28 && !spot; a += 0.4) {
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (w.isFree(x, z, 1.6)) { const n = w.nearestRoadPoint(x, z); spot = { x, z, h: n ? n.dir : 0 }; }
    }
    if (!spot) return '附近沒有空地可以降落';
    if (pl.vehicle === v) return '你正騎著它呢 🛵';
    const H = buildHeli(); g.scene.add(H.g);
    const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#222' }));
    cable.frustumCulled = false; g.scene.add(cable);
    const gy = surfaceAt(spot.x, spot.z);
    v.place(spot.x, spot.z, spot.h); v.mesh.visible = true;
    // film camera: on the street 28 m from the drop spot (along the road if that is open), 3.5 m up
    let cdir = null;
    for (const da of [0, Math.PI, Math.PI / 4, -Math.PI / 4, Math.PI * 3 / 4, -Math.PI * 3 / 4, Math.PI / 2, -Math.PI / 2]) {
      const a = spot.h + da, x = spot.x + Math.sin(a) * 28, z = spot.z + Math.cos(a) * 28;
      if (w.isFree(x, z, 0.8)) { cdir = a; break; }
    }
    if (cdir === null) cdir = spot.h;
    const cx = spot.x + Math.sin(cdir) * 28, cz = spot.z + Math.cos(cdir) * 28;
    // the helicopter crosses the picture sideways (its side and the 彥霖航空 lettering face the camera):
    // in from one side, hover over the spot, out the other side
    const side = cdir + Math.PI / 2;
    this.run = {
      H, cable, v, spot, gy, t: 0, phase: 'in', chop: 0,
      from: new THREE.Vector3(spot.x + Math.sin(side) * 130, gy + 28, spot.z + Math.cos(side) * 130),
      hover: new THREE.Vector3(spot.x, gy + HOVER, spot.z),
      away: new THREE.Vector3(spot.x - Math.sin(side) * 170, gy + 34, spot.z - Math.cos(side) * 170),
      cam: new THREE.Vector3(cx, Math.max(gy, surfaceAt(cx, cz)) + 3.5, cz),
    };
    this._look.copy(this.run.from);
    this._cinema(true);
    return null;
  }
  update(dt) {
    const R = this.run; if (!R) return;
    const g = this.g, { H, v } = R;
    R.t += dt;
    H.rotor.rotation.y += dt * 28; H.tail.rotation.x += dt * 40;
    let hang = 4; // cable length
    const at = new THREE.Vector3();
    if (R.phase === 'in') {
      const k = Math.min(1, R.t / T_IN); at.lerpVectors(R.from, R.hover, ease(k));
      const dx = R.hover.x - R.from.x, dz = R.hover.z - R.from.z;
      H.g.rotation.set(0.18 * (1 - k), Math.atan2(dx, dz), 0);
      if (k >= 1) { R.phase = 'lower'; R.t = 0; }
    } else if (R.phase === 'lower') {
      const k = Math.min(1, R.t / T_LOWER); at.copy(R.hover); at.y += Math.sin(R.t * 2) * 0.15;
      hang = 4 + (HOVER - 1.4 - 4) * ease(k);
      H.g.rotation.x = 0;
      if (k >= 1) {
        R.phase = 'out'; R.t = 0;
        v.place(R.spot.x, R.spot.z, R.spot.h); g.scene.remove(R.cable);
        g.audio.land?.(1.2);
      }
    } else {
      const k = Math.min(1, R.t / T_OUT); at.lerpVectors(R.hover, R.away, k * k);
      const dx = R.away.x - R.hover.x, dz = R.away.z - R.hover.z;
      H.g.rotation.set(0.22 * Math.min(1, k * 4), Math.atan2(dx, dz), 0);
      if (R.t > CINE_OUT && this.cinema) this._cinema(false);
      if (k >= 1) { g.scene.remove(H.g); this.run = null; if (this.cinema) this._cinema(false); return; }
    }
    H.g.position.copy(at);
    if (R.phase !== 'out') {
      // the scooter hangs under the helicopter, swinging a little, until it touches down
      const sy = at.y - 1.4 - hang;
      v.mesh.position.set(at.x + Math.sin(R.t * 1.7) * 0.15, Math.max(R.gy, sy), at.z + Math.cos(R.t * 1.3) * 0.15);
      v.mesh.rotation.y = R.spot.h + Math.sin(R.t * 0.8) * 0.2;
      const pos = R.cable.geometry.attributes.position;
      pos.setXYZ(0, at.x, at.y - 1.4, at.z); pos.setXYZ(1, v.mesh.position.x, v.mesh.position.y + 1.25, v.mesh.position.z); pos.needsUpdate = true;
      v.mesh.visible = true;
    }
    // rotor thump, louder when it is close
    const pp = g.player.worldPos(), d = Math.hypot(at.x - pp.x, at.z - pp.z, at.y - surfaceAt(pp.x, pp.z));
    R.chop -= dt;
    if (R.chop <= 0) { R.chop = 0.11; const vol = 0.16 * Math.max(0, 1 - d / 220); if (vol > 0.005) g.audio.noise?.(0.07, 120, 1.2, vol, 0, 'lowpass'); }
  }
}
