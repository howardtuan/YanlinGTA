// 呼叫載具 (phone app): an EVA Air (長榮航空) helicopter flies in with your JET SL hanging under it on a cable, lowers it
// onto the road next to you, lets go and flies off again.
import * as THREE from 'three';
import { surfaceAt } from './terrain.js';

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const T_IN = 7, T_LOWER = 4.5, T_OUT = 8, HOVER = 16;

function buildHeli() {
  const g = new THREE.Group();
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.2, ...o });
  // 長榮航空 livery: white body, dark green belly stripe and tail with a thin orange line, green lettering
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
  // green 長榮航空 / EVA AIR on both sides of the cabin
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#00664f'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '900 68px "Noto Sans TC","Microsoft JhengHei",sans-serif'; c.fillText('長榮航空', 256, 50);
  c.font = '800 30px "Arial",sans-serif'; c.fillText('EVA AIR', 256, 106);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); p.position.set(s * 1.02, 0.28, -0.3); p.rotation.y = s * Math.PI / 2; g.add(p); }
  return { g, rotor, tail };
}

export class Airdrop {
  constructor(game) { this.g = game; this.run = null; }
  get busy() { return !!this.run; }
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
    const ang = Math.random() * Math.PI * 2, gy = surfaceAt(spot.x, spot.z);
    v.place(spot.x, spot.z, spot.h); v.mesh.visible = true;
    this.run = {
      H, cable, v, spot, gy, t: 0, phase: 'in', chop: 0,
      from: new THREE.Vector3(spot.x + Math.cos(ang) * 150, gy + 60, spot.z + Math.sin(ang) * 150),
      hover: new THREE.Vector3(spot.x, gy + HOVER, spot.z),
      away: new THREE.Vector3(spot.x - Math.cos(ang) * 180, gy + 75, spot.z - Math.sin(ang) * 180),
    };
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
        g.audio.land?.(1.2); g.hud.toast('🛵 你的 JET SL 送到了！', 'good', 2600);
      }
    } else {
      const k = Math.min(1, R.t / T_OUT); at.lerpVectors(R.hover, R.away, k * k);
      const dx = R.away.x - R.hover.x, dz = R.away.z - R.hover.z;
      H.g.rotation.set(0.22 * Math.min(1, k * 4), Math.atan2(dx, dz), 0);
      if (k >= 1) { g.scene.remove(H.g); this.run = null; return; }
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
