// Played as a short film: 21:9 letterbox, HUD hidden, the player can't move, and a street-level camera
// follows the helicopter in, watches the scooter touch down and the helicopter leave, then hands back.
// 呼叫載具 (phone app): a 彥霖航空 (Yanlin Air) helicopter flies in with your JAT SM (or, after 霍華德's Two Sum,
// his 忍 400: src/systems/quests/HowardTwoSum.js) hanging under it on a cable, lowers it
// onto the road next to you, lets go and flies off again. Its pilot (src/entities/Pilot.js) sits behind a glass canopy and gets a short
// close-up while he lowers the scooter. When he isn't flying he walks around campus (CampusPilot) — there is only ever one of him.
import * as THREE from 'three';
import { surfaceAt } from '../../world/Terrain.js';
import { createPilot, CampusPilot, pilotCallVoice } from '../../entities/Pilot.js';
import { canvasTexture, uploadAndRelease } from '../../graphics/GpuMemLifecycle.js';

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const T_IN = 7,
  T_LOWER = 4.5,
  T_OUT = 8,
  HOVER = 16,
  CINE_OUT = 4.5; // the film ends 4.5 s into the fly-away
const CLOSE = 2.3; // pilot close-up at the start of the lowering
const NOSE = 0.45; // where the white body ends and the glass canopy begins (z)

function buildHeli() {
  const g = new THREE.Group();
  const mat = (c, o = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.2, ...o });
  // 彥霖航空 livery: white body, dark green belly stripe and tail with a thin orange line, green lettering
  const white = mat('#f2f3f5'),
    green = mat('#00664f'),
    orange = mat('#f39800'),
    dark = mat('#26282d');
  // rough enough that the sun's glint doesn't land as a white spot on the pilot's face in the close-up
  const glass = mat('#7d9fbd', {
    roughness: 0.6,
    metalness: 0.05,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  // cabin: white body tube with a rounded tail end, and in front a glass canopy over a white chin
  const R = 1.05,
    SY = 0.92,
    SZ = 1.45,
    GL = 0.56 * Math.PI; // canopy glass down to theta GL (y ≈ -0.18)
  add(
    new THREE.CylinderGeometry(R, R, 1.2 + NOSE, 20, 1, true),
    white,
    0,
    0,
    (NOSE - 1.2) / 2,
    Math.PI / 2,
    0,
    0
  ).scale.set(1, 1, SY);
  add(new THREE.SphereGeometry(R, 20, 10, Math.PI, Math.PI), white, 0, 0, -1.2).scale.set(1, SY, 1);
  const chin = add(
    new THREE.SphereGeometry(R, 24, 8, 0, Math.PI, GL, Math.PI - GL),
    mat('#f2f3f5', { side: THREE.DoubleSide }),
    0,
    0,
    NOSE
  );
  chin.scale.set(1, SY, SZ);
  const canopy = add(new THREE.SphereGeometry(R, 28, 12, 0, Math.PI, 0, GL), glass, 0, 0, NOSE);
  canopy.scale.set(1, SY, SZ);
  canopy.castShadow = false;
  canopy.renderOrder = 2;
  const frame = (pts) =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 5), white, 0, 0, 0);
  const arc = (a0, a1, f) => {
    const p = [];
    for (let i = 0; i <= 16; i++) p.push(f(a0 + ((a1 - a0) * i) / 16));
    return p;
  };
  const e0 = Math.asin(Math.cos(GL)); // angle of the canopy's lower edge
  frame(
    arc(
      e0,
      Math.PI - e0,
      (a) => new THREE.Vector3(Math.cos(a) * R * 1.01, Math.sin(a) * R * SY * 1.01, NOSE)
    )
  ); // door pillar
  frame(
    arc(
      Math.PI / 2,
      e0,
      (a) => new THREE.Vector3(0, Math.sin(a) * R * SY * 1.01, NOSE + Math.cos(a) * R * SZ * 1.01)
    )
  ); // centre bar
  // cockpit: back wall, floor, two seats, instrument panel
  const dim = mat('#3a3d43', { roughness: 0.8, side: THREE.DoubleSide }),
    seatM = mat('#2a2c31', { roughness: 0.85 });
  add(new THREE.CircleGeometry(R * 0.99, 24), dim, 0, 0, NOSE - 0.02).scale.set(1, SY, 1);
  add(
    new THREE.CircleGeometry(1, 24, 0, Math.PI),
    dim,
    0,
    -0.75,
    NOSE,
    Math.PI / 2,
    0,
    0
  ).scale.set(0.66, 0.96, 1);
  for (const x of [-0.4, 0.4]) {
    add(new THREE.BoxGeometry(0.48, 0.12, 0.5), seatM, x, -0.3, NOSE + 0.3);
    add(new THREE.BoxGeometry(0.48, 0.8, 0.1), seatM, x, 0.08, NOSE + 0.04, -0.1, 0, 0);
  }
  add(new THREE.BoxGeometry(1.3, 0.28, 0.3), dark, 0, -0.12, NOSE + 1.05, -0.55, 0, 0);
  const pilot = seatPilot(g);
  add(new THREE.BoxGeometry(2.12, 0.34, 2.2), green, 0, -0.45, -0.7); // green stripe
  add(new THREE.BoxGeometry(2.14, 0.07, 2.15), orange, 0, -0.24, -0.68); // orange pinstripe
  add(new THREE.CylinderGeometry(0.28, 0.13, 4.6, 10), white, 0, 0.35, -3.6, Math.PI / 2, 0, 0); // tail boom
  add(new THREE.BoxGeometry(0.12, 1.3, 0.8), green, 0, 0.9, -5.7, -0.3, 0, 0); // fin
  add(new THREE.BoxGeometry(1.6, 0.08, 0.45), white, 0, 0.45, -5.4); // stabiliser
  for (const x of [-0.85, 0.85]) {
    // skids
    add(new THREE.BoxGeometry(0.08, 0.08, 3.6), dark, x, -1.35, 0.1);
    add(
      new THREE.BoxGeometry(0.06, 0.55, 0.06),
      dark,
      x * 0.85,
      -1.08,
      0.9,
      0,
      0,
      x > 0 ? -0.3 : 0.3
    );
    add(
      new THREE.BoxGeometry(0.06, 0.55, 0.06),
      dark,
      x * 0.85,
      -1.08,
      -0.7,
      0,
      0,
      x > 0 ? -0.3 : 0.3
    );
  }
  add(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), dark, 0, 1.15, 0); // mast
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.42, 0);
  g.add(rotor);
  for (const a of [0, Math.PI / 2]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.05, 0.28), dark);
    b.rotation.y = a;
    rotor.add(b);
  }
  const tail = new THREE.Group();
  tail.position.set(0.18, 0.5, -5.75);
  g.add(tail);
  for (const a of [0, Math.PI / 2]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.14), dark);
    b.rotation.x = a;
    tail.add(b);
  }
  // green 彥霖航空 / YANLIN AIR on both sides of the cabin
  const tex = yanlinAirTexture();
  for (const s of [1, -1]) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.525),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    p.position.set(s * 1.02, 0.28, -0.58);
    p.rotation.y = (s * Math.PI) / 2;
    g.add(p);
  }
  return { g, rotor, tail, pilot };
}

let airTex = null;
function yanlinAirTexture() {
  if (airTex) return airTex;
  airTex = canvasTexture(
    512,
    128,
    (c) => {
      c.fillStyle = '#00664f';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = '900 68px "Noto Sans TC","Microsoft JhengHei",sans-serif';
      c.fillText('彥霖航空', 256, 50);
      c.font = '800 30px "Arial",sans-serif';
      c.fillText('YANLIN AIR', 256, 106);
    },
    false
  );
  if (airTex.isCanvasTexture) uploadAndRelease(airTex);
  return airTex;
}

// the pilot, in the left seat (the side the film camera sees); he only casts a shadow inside the cabin anyway.
// 勞大 or the 彥霖航空 captain, whichever is flying now (src/systems/LaodaMode.js)
function seatPilot(g) {
  const pilot = createPilot();
  pilot.root.position.set(0.4, -0.72, NOSE + 0.24);
  pilot.root.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  g.add(pilot.root);
  pilot.update(1, { mode: 'drive' });
  return pilot;
}

// the pilot blinks and holds the controls; while he lowers the scooter he looks down out of his (left) window
function pilotTick(H, dt, down) {
  const p = H.pilot;
  p.update(dt, { mode: 'drive' });
  p.head.rotation.y += ((down ? 0.55 : 0) - p.head.rotation.y) * Math.min(1, dt * 4);
  if (down) p.head.rotation.x = 0.3; // animate() eases it back to level once he stops
}

export class Airdrop {
  constructor(game) {
    this.g = game;
    this.run = null;
    this.cinema = false;
    this._look = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this.walker = new CampusPilot(game); // the pilot on foot, while the helicopter is parked
  }
  get busy() {
    return !!this.run;
  }
  // 勞大 called back / sent off at the terminal (src/systems/LaodaMode.js): the other pilot from now on, on foot and in the cockpit
  syncPilot() {
    this.walker.reset();
    const H = this.H;
    if (!H) return;
    H.g.remove(H.pilot.root);
    H.pilot = seatPilot(H.g);
  }
  _heli() {
    return this.H || (this.H = buildHeli());
  } // built once, reused for every delivery
  // letterbox to a 21:9 picture, hide the HUD; the game freezes the player while this is on
  _cinema(on) {
    this.cinema = on;
    let el = document.getElementById('cinema');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cinema';
      el.innerHTML = '<i class="cb cb-a"></i><i class="cb cb-b"></i>';
      document.body.appendChild(el);
      addEventListener('resize', () => this._bars());
    }
    this._bars();
    document.body.classList.toggle('cinema', on);
    if (on) {
      this.g.input.releaseAll();
      this.g.audio.setEngine(false, 0);
    } else if (this._fov) {
      const c = this.g.camera;
      c.fov = this._fov;
      c.updateProjectionMatrix();
      this._fov = null;
    } else
      this.g.hud.toast(
        this._last?.model === 'ninja'
          ? '🏍️ 忍 400 送到了，騎上去吧！'
          : '🛵 機車送到了，騎上去吧！',
        'good',
        2600
      );
  }
  _bars() {
    const el = document.getElementById('cinema');
    if (!el) return;
    const W = innerWidth,
      Hh = innerHeight,
      A = 21 / 9,
      tall = W / A <= Hh;
    el.classList.toggle('side', !tall);
    el.style.setProperty('--bar', `${tall ? (Hh - W / A) / 2 : (W - Hh * A) / 2}px`);
  }
  // the film camera (called after the normal camera rig)
  camera(cam, dt) {
    const R = this.run;
    if (!R || !this.cinema) return;
    const h = R.H.g.position,
      s = R.v.mesh.position;
    // lowering: aim at the middle of the cable so the helicopter and the touch-down both stay in the 21:9 frame
    const want = R.phase === 'lower' ? new THREE.Vector3().lerpVectors(h, s, 0.5) : h;
    this._look.lerp(want, Math.min(1, dt * 3));
    let fov = 70;
    if (R.phase === 'lower' && R.t < CLOSE) {
      // close-up: the pilot through the side of the canopy, looking down at the scooter he is lowering
      const H = R.H.g;
      H.updateMatrixWorld();
      cam.position.copy(H.localToWorld(this._v.set(2.6, 0.5, NOSE + 1.8)));
      cam.lookAt(H.localToWorld(this._v.set(0.4, 0.42, NOSE + 0.3)));
      fov = 38;
    } else {
      cam.position.copy(R.cam);
      cam.lookAt(this._look);
    }
    if (cam.fov !== fov) {
      this._fov = this._fov ?? cam.fov;
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
  // returns an error message, or null when the helicopter is on its way.
  // what: 'jet' (your JAT SM, default) or 'ninja' (霍華德's 忍 400 once his Two Sum is solved, src/entities/npcs/Howard.js lend)
  call(what = 'jet') {
    const g = this.g,
      pl = g.player;
    if (this.run) return '🚁 直升機已經在路上了';
    if (g.race.state !== 'idle') return '比賽中不能呼叫載具';
    const v = what === 'ninja' ? g.howard?.bike : g.myScooter;
    if (!v) return '找不到你的機車';
    if (pl.vehicle === v) return '你正騎著它呢 🛵';
    const p = pl.worldPos();
    if (!pl.vehicle && (pl.y > 1 || g.interiors.zoneAt(p.x, p.z, pl.y)))
      return '直升機進不來，先到戶外再呼叫';
    // a free spot on the road next to you
    const w = g.world;
    let spot = null;
    const rp = w.nearestRoadPoint(p.x, p.z);
    if (rp && Math.hypot(rp.x - p.x, rp.z - p.z) < 25 && w.isFree(rp.x, rp.z, 1.6))
      spot = { x: rp.x, z: rp.z, h: rp.dir };
    for (let r = 4; !spot && r < 24; r += 2)
      for (let a = 0; a < 6.28 && !spot; a += 0.4) {
        const x = p.x + Math.cos(a) * r,
          z = p.z + Math.sin(a) * r;
        if (w.isFree(x, z, 1.6)) {
          const n = w.nearestRoadPoint(x, z);
          spot = { x, z, h: n ? n.dir : 0 };
        }
      }
    if (!spot) return '附近沒有空地可以降落';
    if (what === 'ninja') {
      const r = g.howard.lend();
      if (typeof r === 'string') return r;
    }
    this._last = v; // for the 「送到了」 toast
    const H = this._heli();
    g.scene.add(H.g);
    const cable = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: '#222' })
    );
    cable.frustumCulled = false;
    g.scene.add(cable);
    const gy = surfaceAt(spot.x, spot.z);
    v.place(spot.x, spot.z, spot.h);
    v.mesh.visible = true;
    // film camera: on the street 28 m from the drop spot (along the road if that is open), 3.5 m up
    let cdir = null;
    for (const da of [
      0,
      Math.PI,
      Math.PI / 4,
      -Math.PI / 4,
      (Math.PI * 3) / 4,
      (-Math.PI * 3) / 4,
      Math.PI / 2,
      -Math.PI / 2,
    ]) {
      const a = spot.h + da,
        x = spot.x + Math.sin(a) * 28,
        z = spot.z + Math.cos(a) * 28;
      if (w.isFree(x, z, 0.8)) {
        cdir = a;
        break;
      }
    }
    if (cdir === null) cdir = spot.h;
    const cx = spot.x + Math.sin(cdir) * 28,
      cz = spot.z + Math.cos(cdir) * 28;
    // the helicopter crosses the picture sideways (its side and the 彥霖航空 lettering face the camera):
    // in from one side, hover over the spot, out the other side
    const side = cdir + Math.PI / 2;
    this.run = {
      H,
      cable,
      v,
      spot,
      gy,
      t: 0,
      phase: 'in',
      chop: 0,
      from: new THREE.Vector3(
        spot.x + Math.sin(side) * 130,
        gy + 28,
        spot.z + Math.cos(side) * 130
      ),
      hover: new THREE.Vector3(spot.x, gy + HOVER, spot.z),
      away: new THREE.Vector3(
        spot.x - Math.sin(side) * 170,
        gy + 34,
        spot.z - Math.cos(side) * 170
      ),
      cam: new THREE.Vector3(cx, Math.max(gy, surfaceAt(cx, cz)) + 3.5, cz),
    };
    this._look.copy(this.run.from);
    this._cinema(true);
    const voice = pilotCallVoice(); // (勞大's; the captain calls in silently)
    if (voice) g.audio.voice(voice, 1, 'pilot');
    return null;
  }
  // rotor thump, louder when it is close
  _chop(R, at, dt, loud) {
    const pp = this.g.player.worldPos(),
      d = Math.hypot(at.x - pp.x, at.z - pp.z, at.y - surfaceAt(pp.x, pp.z)),
      k = Math.max(0, 1 - d / 220);
    if (this.g.audio.heli?.(k)) return;
    R.chop -= dt;
    if (R.chop <= 0) {
      R.chop = 0.11;
      const vol = loud * k;
      if (vol > 0.005) this.g.audio.noise?.(0.07, 120, 1.2, vol, 0, 'lowpass');
    }
  }
  update(dt) {
    this.walker.update(dt, !!this.run); // off campus while he is up in the helicopter
    const R = this.run;
    if (!R) return;
    const g = this.g,
      { H, v } = R;
    R.t += dt;
    H.rotor.rotation.y += dt * 28;
    H.tail.rotation.x += dt * 40;
    pilotTick(H, dt, R.phase === 'lower');
    let hang = 4; // cable length
    const at = new THREE.Vector3();
    if (R.phase === 'in') {
      const k = Math.min(1, R.t / T_IN);
      at.lerpVectors(R.from, R.hover, ease(k));
      const dx = R.hover.x - R.from.x,
        dz = R.hover.z - R.from.z;
      H.g.rotation.set(0.18 * (1 - k), Math.atan2(dx, dz), 0);
      if (k >= 1) {
        R.phase = 'lower';
        R.t = 0;
      }
    } else if (R.phase === 'lower') {
      const k = Math.min(1, R.t / T_LOWER);
      at.copy(R.hover);
      at.y += Math.sin(R.t * 2) * 0.15;
      hang = 4 + (HOVER - 1.4 - 4) * ease(k);
      H.g.rotation.x = 0;
      if (k >= 1) {
        R.phase = 'out';
        R.t = 0;
        v.place(R.spot.x, R.spot.z, R.spot.h);
        g.scene.remove(R.cable);
        g.audio.land?.(1.2);
      }
    } else {
      const k = Math.min(1, R.t / T_OUT);
      at.lerpVectors(R.hover, R.away, k * k);
      const dx = R.away.x - R.hover.x,
        dz = R.away.z - R.hover.z;
      H.g.rotation.set(0.22 * Math.min(1, k * 4), Math.atan2(dx, dz), 0);
      if (R.t > CINE_OUT && this.cinema) this._cinema(false);
      if (k >= 1) {
        g.scene.remove(H.g);
        this.run = null;
        if (this.cinema) this._cinema(false);
        return;
      }
    }
    H.g.position.copy(at);
    if (R.phase !== 'out') {
      // the scooter hangs under the helicopter, swinging a little, until it touches down
      const sy = at.y - 1.4 - hang;
      v.mesh.position.set(
        at.x + Math.sin(R.t * 1.7) * 0.15,
        Math.max(R.gy, sy),
        at.z + Math.cos(R.t * 1.3) * 0.15
      );
      v.mesh.rotation.y = R.spot.h + Math.sin(R.t * 0.8) * 0.2;
      v.mesh.updateMatrix(); // vehicle matrices only update on request (src/entities/Vehicles.js)
      const pos = R.cable.geometry.attributes.position;
      pos.setXYZ(0, at.x, at.y - 1.4, at.z);
      pos.setXYZ(1, v.mesh.position.x, v.mesh.position.y + 1.25, v.mesh.position.z);
      pos.needsUpdate = true;
      v.mesh.visible = true;
    }
    this._chop(R, at, dt, 0.16);
  }
}
