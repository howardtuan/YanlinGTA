// 🛸 無人機（手機桌面的「無人機」App）：打開就連線到彥霖的無人機。
// 先播幾秒鐘 21:9 的轉場：彥霖拿出遙控器、戴上 VR 眼鏡，無人機從他頭上起飛，鏡頭鑽進無人機；
// 之後是自由的第一人稱飛行（W A S D 前後左右、滑鼠轉向、Space 上升、Shift／C 下降、F 結束飛行；
// 手把：左搖桿移動、右搖桿轉向、RB 上升、LB 或 L3 下降、B 結束飛行）。
//  - 最高時速 100 km/h（跟騎機車差不多），沒有距離限制（地圖邊界為止）；高度上限是起飛點上方 450 m，夠俯瞰整個校園。
//  - 會撞到地面、樓板、牆、樹和建築物；飛到屋頂以上就能越過建築物，也可以從開著的門飛進室內。
//  - 門照常自己開關：飛行時門把無人機當成「人」（interiors 的 updater 看到的 g.player 換成無人機的位置）。
//  - 不能用電腦、跟人說話、上車或拿手機（飛行時彥霖站在原地不動，E 動作都停用）。
//  - 彥霖本人在原地戴著 VR 眼鏡、雙手拿遙控器，飛回來就看得到他。
import * as THREE from 'three';
import { surfaceAt, H } from '../world/Terrain.js';
import { dual } from '../core/KeyHints.js';

const MAX_V = 100 / 3.6; // 100 km/h
const UP_V = 8; // m/s climbing / sinking
const MAX_ALT = 450; // above the take-off spot
const R = 0.3; // the drone's radius for walls
const T_IN = 4.2; // the opening film (s)
const T_OUT = 1.0; // black fade back to 彥霖
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

// the quadcopter (about 45 cm across): grey shell, four arms, motors with spinning props, a camera gimbal at the front
function buildDrone() {
  const g = new THREE.Group();
  const M = (c, o = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.2, ...o });
  const shell = M('#e9ebee'),
    dark = M('#24262b'),
    prop = M('#15171a', { roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.26), shell);
  g.add(body);
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    shell
  );
  top.scale.set(1, 0.45, 1.25);
  top.position.y = 0.035;
  g.add(top);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.2), dark);
  belly.position.y = -0.045;
  g.add(belly);
  const props = [];
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.2), dark);
    arm.position.set(sx * 0.12, 0.005, sz * 0.13);
    arm.rotation.y = Math.atan2(sx, sz);
    g.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.04, 12), dark);
    motor.position.set(sx * 0.19, 0.025, sz * 0.2);
    g.add(motor);
    const p = new THREE.Group();
    p.position.set(sx * 0.19, 0.05, sz * 0.2);
    g.add(p);
    for (const a of [0, Math.PI]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.004, 0.022), prop);
      b.position.x = Math.cos(a) * 0.085;
      b.rotation.y = a;
      p.add(b);
    }
    const blur = new THREE.Mesh(
      new THREE.CircleGeometry(0.17, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: '#222',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    blur.position.y = 0.001;
    p.add(blur);
    props.push(p);
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 6, 6),
      new THREE.MeshBasicMaterial({ color: sz > 0 ? '#3cff7a' : '#ff3048' })
    );
    led.position.set(sx * 0.19, -0.004, sz * 0.2);
    g.add(led);
  }
  const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), dark);
  gimbal.position.set(0, -0.055, 0.12);
  g.add(gimbal);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 16),
    new THREE.MeshStandardMaterial({ color: '#0b1a2e', roughness: 0.05, metalness: 0.8 })
  );
  lens.position.set(0, -0.055, 0.152);
  g.add(lens);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { g, props };
}

// the VR goggles (on the head) and the remote controller (held in front of the chest), added to 彥霖's character
function buildGoggles() {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: '#f1f2f4', roughness: 0.45 }),
    black = new THREE.MeshStandardMaterial({ color: '#16171b', roughness: 0.6 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.075), shell);
  front.position.z = 0.035;
  g.add(front);
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.185, 0.075, 0.006),
    new THREE.MeshStandardMaterial({ color: '#1b2233', roughness: 0.1, metalness: 0.6 })
  );
  face.position.z = 0.074;
  g.add(face);
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.006, 0.004),
    new THREE.MeshBasicMaterial({ color: '#5ee7ff' })
  );
  glow.position.set(0, -0.02, 0.078);
  g.add(glow);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.08, 0.02), black);
  pad.position.z = -0.006;
  g.add(pad);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.011, 6, 28, Math.PI * 1.15), black);
  strap.rotation.set(Math.PI / 2, 0, Math.PI * 1.075);
  strap.scale.set(1, 1.08, 1);
  strap.position.z = -0.075;
  g.add(strap);
  return g;
}
function buildController() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: '#2c2f36', roughness: 0.55 }),
    grey = new THREE.MeshStandardMaterial({ color: '#8b9099', roughness: 0.4, metalness: 0.5 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.085), body);
  g.add(b);
  for (const s of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.07, 10), body);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(s * 0.12, -0.008, -0.02);
    g.add(grip);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.025, 8), grey);
    stick.position.set(s * 0.06, 0.028, 0.005);
    g.add(stick);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 12), body);
    cap.position.set(s * 0.06, 0.042, 0.005);
    g.add(cap);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 6), grey);
    ant.position.set(s * 0.095, 0.05, 0.035);
    ant.rotation.x = -0.4;
    g.add(ant);
  }
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.035),
    new THREE.MeshBasicMaterial({ color: '#3ad1ff' })
  );
  scr.rotation.x = -Math.PI / 2 + 0.3;
  scr.position.set(0, 0.019, 0.02);
  g.add(scr);
  return g;
}

export class Drone {
  constructor(game) {
    this.g = game;
    this.state = null;
    this.t = 0;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    const d = buildDrone();
    this.mesh = d.g;
    this.props = d.props;
    this.mesh.visible = false;
    game.scene.add(this.mesh);
    this.goggles = buildGoggles();
    this.ctrl = buildController();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._look = new THREE.Vector3();
    // stand-in player for the doors (see the top of the file)
    this._pp = null;
    this._ppos = new THREE.Vector3();
    // HUD over the picture while flying
    const hud = (this.hud = document.createElement('div'));
    hud.id = 'droneHud';
    hud.className = 'hidden';
    hud.innerHTML = `<div class="dh-frame"><i></i><i></i><i></i><i></i></div>
      <div class="dh-top"><span class="dh-rec">● LIVE</span><b>🛸 彥霖的無人機</b><span class="dh-sig">▂▄▆█ 5.8G</span></div>
      <div class="dh-stats"><span>高度 <b class="dh-alt">0</b> m</span><span>時速 <b class="dh-spd">0</b> km/h</span><span>距離彥霖 <b class="dh-dist">0</b> m</span></div>
      <div class="dh-keys">${dual(
        '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移動　滑鼠 轉向　<kbd>Space</kbd> 上升　<kbd>Shift</kbd>／<kbd>C</kbd> 下降　<kbd>F</kbd> 結束飛行',
        '{L} 移動　{R} 轉向　{RB} 上升　{LB}／{LS} 下降　{B} 結束飛行'
      )}</div>`;
    document.getElementById('hud').appendChild(hud);
    const fade = (this.fade = document.createElement('div'));
    fade.id = 'droneFade';
    document.body.appendChild(fade);
  }
  get active() {
    return !!this.state;
  } // the film, the flight or the way back
  get flying() {
    return this.state === 'fly';
  }
  get cinema() {
    return this.state === 'in';
  } // 21:9 bars, HUD hidden

  // the phone app: returns an error message, or null when the drone is taking off
  start() {
    const g = this.g,
      pl = g.player;
    if (this.state) return '🛸 無人機已經在飛了';
    if (pl.vehicle) return '先下車才能操作無人機';
    if (pl.seat || pl.tumble || pl.rag) return '現在不方便操作無人機';
    if (g.race?.active || g.race?.locked) return '比賽中不能飛無人機';
    if (g.job?.active || g.gate?.active || g.airdrop?.busy) return '現在不能飛無人機';
    if (g.phone?.open) g.phone.close();
    this.state = 'in';
    this.t = 0;
    this._cinema(true);
    this._attach();
    this._yaw0 = g.rig.yaw;
    this._pitch0 = g.rig.pitch;
    // take-off spot: just over his head
    const p = pl.pos;
    this.home = new THREE.Vector3(p.x, p.y, p.z);
    this.ceilY = p.y + MAX_ALT;
    this.yaw = pl.heading;
    this.pitch = 0.05;
    this.roll = 0;
    this.vel.set(0, 0, 0);
    this.pos.set(p.x, p.y + 2.1, p.z);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(0, this.yaw, 0);
    this.mesh.visible = false;
    g.input.releaseAll?.();
    return null;
  }
  // F / Backspace while flying: back to 彥霖 (a short black fade)
  stop() {
    if (this.state !== 'fly') return;
    this.state = 'out';
    this.t = 0;
    this.fade.classList.add('on');
  }
  _end() {
    const g = this.g;
    this.state = null;
    this.mesh.visible = false;
    this.hud.classList.add('hidden');
    this._detach();
    this._buzz(false);
    this._fog(1);
    g.rig.yaw = this._yaw0 ?? g.rig.yaw;
    g.rig.pitch = this._pitch0 ?? 0.32;
    g.rig.first = true;
    const c = g.camera;
    if (this._fov0) {
      c.fov = this._fov0;
      c.updateProjectionMatrix();
      this._fov0 = null;
    }
    setTimeout(() => this.fade.classList.remove('on'), 120);
    g.hud.toast('🛸 無人機已降落，VR 眼鏡收起來了', 'good', 2200);
  }

  // ---- 21:9 bars (same look as the 呼叫載具 film, src/systems/minigames/Airdrop.js) ----
  _cinema(on) {
    let el = document.getElementById('cinema');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cinema';
      el.innerHTML = '<i class="cb cb-a"></i><i class="cb cb-b"></i>';
      document.body.appendChild(el);
    }
    const W = innerWidth,
      Hh = innerHeight,
      A = 21 / 9,
      tall = W / A <= Hh;
    el.classList.toggle('side', !tall);
    el.style.setProperty('--bar', `${tall ? (Hh - W / A) / 2 : (W - Hh * A) / 2}px`);
    document.body.classList.toggle('cinema', on);
    if (on) {
      this.g.input.releaseAll?.();
      this.g.audio.setEngine?.(false, 0);
    }
  }

  // ---- props on 彥霖 (re-attached if the wardrobe rebuilds his figure) ----
  _attach() {
    const ch = this.g.player.ch;
    if (this._on === ch) return;
    this._detach();
    this._on = ch;
    ch.head.add(this.goggles);
    ch.torso.add(this.ctrl);
    this.goggles.position.set(0, 0.104, 0.07);
    this.goggles.rotation.set(0, 0, 0);
    this.ctrl.position.set(0, 0.36, 0.3);
    this.ctrl.rotation.set(0.35, 0, 0);
  }
  _detach() {
    this.goggles.parent?.remove(this.goggles);
    this.ctrl.parent?.remove(this.ctrl);
    this._on = null;
  }

  // ---- doors: while flying, interiors.update sees the drone as the player ----
  // (only g.player is swapped, for that one call: everything the updaters write to g still lands on the game)
  doors(dt) {
    const g = this.g,
      I = g.interiors,
      real = g.player;
    if (!this.flying) {
      I.update(dt, g);
      return;
    }
    const P = this._pp || (this._pp = Object.create(real));
    const rel = this.pos.y - H(this.pos.x, this.pos.z);
    P.pos = this._ppos.set(this.pos.x, this.pos.y - 1.0, this.pos.z);
    P.y = Math.max(0, rel - 1.0);
    P.vehicle = null;
    P.seat = null;
    P.worldPos = () => P.pos;
    g.player = P;
    try {
      I.update(dt, g);
    } finally {
      g.player = real;
    }
  }

  // ---- every frame, before the camera (src/core/Game.js) ----
  update(dt, inp) {
    const g = this.g;
    if (!this.state) return;
    const pl = g.player;
    this._attach();
    pl.setPose('drone', 0.5); // both hands on the controller
    for (const p of this.props) p.rotation.y += dt * 60;
    if (this.state === 'in') {
      this.t += dt;
      const t = this.t;
      // the controller comes out of his pocket, then the goggles go on
      const kc = ease(seg(t, 0.25, 0.85));
      this.ctrl.scale.setScalar(Math.max(0.001, kc));
      const kg = ease(seg(t, 0.9, 1.9));
      this.goggles.position.set(0, 0.104 - (1 - kg) * 0.5, 0.07 + (1 - kg) * 0.32);
      this.goggles.rotation.x = (1 - kg) * -0.9;
      this.goggles.visible = t > 0.9;
      // the drone wakes up over his head and climbs
      if (t > 1.9) {
        this.mesh.visible = true;
        const k = ease(seg(t, 1.9, 3.4));
        this.pos.set(this.home.x, this.home.y + 2.05 + k * 2.2, this.home.z);
        this.mesh.position.copy(this.pos);
        this.mesh.rotation.set(0, this.yaw, 0);
        this._buzz(true, 0.4 + k * 0.4);
      }
      if (t > 3.75) this.fade.classList.add('on');
      if (t >= T_IN) {
        this.state = 'fly';
        this._cinema(false);
        this.mesh.visible = false;
        this.hud.classList.remove('hidden');
        this.pitch = 0.08;
        g.rig.first = true;
        setTimeout(() => this.fade.classList.remove('on'), 80);
        g.hud.toast('🛸 已連線到無人機！F 結束飛行', 'good', 2600);
      }
      return;
    }
    if (this.state === 'out') {
      this.t += dt;
      if (this.t >= T_OUT * 0.5 && this.state === 'out') this._end();
      return;
    }
    // ---- flying ----
    if (!g.hud.bigOpen && !g._modalOpen && inp.hit('KeyF', 'Backspace')) {
      this.stop();
      return;
    }
    const look = g.hud.bigOpen ? { mdx: 0, mdy: 0 } : inp,
      sens = g.settings.sens || 1;
    this.yaw -= look.mdx * 0.0026 * sens;
    this.pitch = clamp(this.pitch + look.mdy * 0.0022 * sens, -1.35, 1.35);
    const a = g.hud.bigOpen ? { x: 0, y: 0 } : inp.axis();
    const fx = Math.sin(this.yaw),
      fz = Math.cos(this.yaw); // forward on the ground plane (camera looks along +sin/cos, like the rig)
    const rx = -fz,
      rz = fx; // right
    const wantX = (fx * a.y + rx * a.x) * MAX_V,
      wantZ = (fz * a.y + rz * a.x) * MAX_V;
    const up = !g.hud.bigOpen && inp.down('Space') ? 1 : 0,
      dn =
        !g.hud.bigOpen && inp.down('ShiftLeft', 'ShiftRight', 'KeyC', 'ControlLeft', 'KeyH')
          ? 1
          : 0; // (KeyH = the pad's LB, L3 = Shift)
    const k = Math.min(1, dt * 1.6),
      kv = Math.min(1, dt * 3);
    this.vel.x += (wantX - this.vel.x) * k;
    this.vel.z += (wantZ - this.vel.z) * k;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > MAX_V) {
      this.vel.x *= MAX_V / sp;
      this.vel.z *= MAX_V / sp;
    }
    this.vel.y += ((up - dn) * UP_V - this.vel.y) * kv;
    const s3 = this.vel.length();
    if (s3 > MAX_V) this.vel.multiplyScalar(MAX_V / s3); // 100 km/h at most, climbing included
    this._move(dt);
    // tilt with the motion (the camera rolls a little when you strafe)
    const side = this.vel.x * rx + this.vel.z * rz;
    this.roll += (clamp(-side / MAX_V, -1, 1) * 0.18 - this.roll) * Math.min(1, dt * 4);
    this.mesh.position.copy(this.pos);
    // the buzz rises with speed; the fog thins out high up so the whole campus shows
    const rel = this.pos.y - H(this.pos.x, this.pos.z);
    this._buzz(true, 0.45 + Math.min(1, Math.hypot(sp, this.vel.y) / MAX_V) * 0.55);
    this._fog(clamp(1 - (rel - 30) / 260, 0.18, 1));
    // HUD numbers
    if ((this._hudT = (this._hudT || 0) - dt) <= 0) {
      this._hudT = 0.1;
      this.hud.querySelector('.dh-alt').textContent = Math.max(
        0,
        Math.round(this.pos.y - surfaceAt(this.pos.x, this.pos.z))
      );
      this.hud.querySelector('.dh-spd').textContent = Math.round(Math.hypot(sp, this.vel.y) * 3.6);
      this.hud.querySelector('.dh-dist').textContent = Math.round(
        Math.hypot(this.pos.x - pl.pos.x, this.pos.z - pl.pos.z, this.pos.y - pl.pos.y)
      );
    }
  }
  // one step of movement with walls, trees, buildings, floors and ceilings
  _move(dt) {
    const g = this.g,
      col = g.world.collision,
      I = g.interiors,
      p = this.pos;
    const n = Math.max(1, Math.ceil((Math.hypot(this.vel.x, this.vel.z) * dt) / 0.2));
    const prevY = p.y;
    for (let i = 0; i < n; i++) {
      const q = this._v.set(p.x + (this.vel.x * dt) / n, p.y, p.z + (this.vel.z * dt) / n);
      const gH = H(q.x, q.z),
        rel = q.y - gH,
        top = col.topAt(q.x, q.z);
      // over a roof (or high over open ground) nothing is in the way; otherwise walls, trees and the building outlines
      const free = top > -Infinity ? q.y > top + 0.4 : rel > 6;
      if (!free) {
        const r = col.resolve(q, R, Math.max(0, rel - 1.0), q.y - 1.0);
        if (r.hit) {
          const d = this.vel.x * r.nx + this.vel.z * r.nz;
          if (d < 0) {
            this.vel.x -= d * r.nx;
            this.vel.z -= d * r.nz;
          }
        }
      }
      // the map's edge
      const b = col.b;
      q.x = clamp(q.x, b.minX + 2, b.maxX - 2);
      q.z = clamp(q.z, b.minZ + 2, b.maxZ - 2);
      p.x = q.x;
      p.z = q.z;
    }
    // up / down: the floor under it (ground, decks, an indoor floor, a roof it is above), a ceiling indoors, the height cap
    let y = prevY + this.vel.y * dt;
    const gH = H(p.x, p.z),
      rel = prevY - gH;
    let floor = Math.max(surfaceAt(p.x, p.z, prevY), gH + I.groundAt(p.x, p.z, rel));
    const top = col.topAt(p.x, p.z);
    if (top > -Infinity && prevY >= top + 0.2) floor = Math.max(floor, top);
    let ceil = this.ceilY;
    const zn = I.zoneAt(p.x, p.z, rel);
    if (zn?.ceil) ceil = Math.min(ceil, zn.ceil(rel) + gH - 0.25);
    y = clamp(y, floor + 0.3, Math.max(floor + 0.3, ceil));
    if ((y <= floor + 0.3 && this.vel.y < 0) || (y >= ceil && this.vel.y > 0)) this.vel.y = 0;
    p.y = y;
  }

  // ---- camera (src/core/Game.js, after the normal rig) ----
  camera(cam, dt) {
    if (!this.state) return;
    const g = this.g,
      pl = g.player;
    if (this.state === 'in') {
      // a slow push-in on 彥霖 from the front, then up at the drone as it climbs off his head
      const t = this.t,
        h = pl.heading ?? 0,
        fx = Math.sin(h),
        fz = Math.cos(h);
      const sx = Math.cos(h),
        sz = -Math.sin(h); // his left/right
      const k = ease(seg(t, 0, 1.9)),
        base = pl.pos;
      const d = 2.6 - k * 0.9,
        side = 0.55;
      const camP = this._v.set(
        base.x + fx * d + sx * side,
        base.y + 1.45 + k * 0.1,
        base.z + fz * d + sz * side
      );
      const head = this._v2.set(base.x, base.y + 1.45, base.z);
      if (t > 1.9) {
        const k2 = ease(seg(t, 1.9, 3.0));
        camP.y += k2 * 0.6;
        camP.x -= fx * k2 * 0.5;
        camP.z -= fz * k2 * 0.5;
        this._look.lerpVectors(head, this.pos, k2);
        const k3 = ease(seg(t, 3.2, T_IN)); // into the drone's camera
        camP.lerp(this.pos, k3);
      } else this._look.copy(head);
      cam.position.copy(camP);
      cam.lookAt(this._look);
      this._setFov(cam, 50);
      return;
    }
    if (this.state === 'out') return;
    // first person through the drone's camera
    const cp = Math.cos(this.pitch);
    cam.position.copy(this.pos);
    cam.lookAt(
      this.pos.x + Math.sin(this.yaw) * cp,
      this.pos.y - Math.sin(this.pitch),
      this.pos.z + Math.cos(this.yaw) * cp
    );
    cam.rotateZ(this.roll);
    this._setFov(cam, 80);
    // 彥霖 stays visible (the first-person mode would hide him)
    pl.ch.root.visible = true;
  }
  _setFov(cam, f) {
    if (cam.fov !== f) {
      this._fov0 = this._fov0 ?? cam.fov;
      cam.fov = f;
      cam.updateProjectionMatrix();
    }
  }

  // fog: scale whatever the sky set (it may set it again each frame)
  _fog(k) {
    const f = this.g.scene.fog;
    if (!f || f.density === undefined) return;
    if (this._fogSet === undefined || Math.abs(f.density - this._fogSet) > 1e-9)
      this._fogBase = f.density;
    f.density = this._fogBase * k;
    this._fogSet = f.density;
    if (k === 1) this._fogSet = undefined;
  }
  // the motor whine (WebAudio, under the sound-effects volume)
  _buzz(on, lvl = 0.5) {
    const A = this.g.audio,
      ctx = A.ctx;
    if (!on) {
      if (this._bz) {
        const { o, o2, gn } = this._bz;
        gn.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        setTimeout(() => {
          try {
            o.stop();
            o2.stop();
          } catch (e) {}
        }, 300);
        this._bz = null;
      }
      return;
    }
    if (!ctx || !A.sfx) return;
    if (!this._bz) {
      const o = ctx.createOscillator(),
        o2 = ctx.createOscillator(),
        f = ctx.createBiquadFilter(),
        gn = ctx.createGain();
      o.type = 'sawtooth';
      o2.type = 'square';
      f.type = 'lowpass';
      f.frequency.value = 1400;
      gn.gain.value = 0;
      o.connect(f);
      o2.connect(f);
      f.connect(gn);
      gn.connect(A.sfx);
      o.start();
      o2.start();
      this._bz = { o, o2, gn };
    }
    const t = ctx.currentTime,
      { o, o2, gn } = this._bz;
    o.frequency.setTargetAtTime(170 + lvl * 150, t, 0.1);
    o2.frequency.setTargetAtTime(172 + lvl * 152, t, 0.1);
    gn.gain.setTargetAtTime(0.018 + lvl * 0.02, t, 0.1);
  }
}
