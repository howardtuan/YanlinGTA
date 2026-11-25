// 過年（1、2 月，src/world/Season.js）路人放鞭炮：每隔一陣子挑一個在附近走路、鏡頭看得到的路人，
// 讓他停下來，在身旁地上鋪一串紅鞭炮，從一頭點燃一路劈哩啪啦炸過去：火光、紅紙屑、白煙，
// 紙屑落地後留一陣子。聲音走 AudioSystem.at（距離衰減、左右聲道）。
// 只用 Math.random，不動 src/entities/NPC.js Peds 的亂數，不影響路人行為的其他抽籤。
import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { isLunarNewYear } from '../world/Season.js';

const LINK = 28, // crackers per string
  MAX_SHOWS = 3,
  BITS = 900, // paper-bit pool (stays on the ground a while)
  FLASH = 16,
  SMOKE = 28;

const dotTex = (soft) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d'),
    gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(soft ? 0.5 : 0.25, `rgba(255,255,255,${soft ? 0.5 : 0.85})`);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr;
  c.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export class Firecrackers {
  constructor(scene) {
    this.scene = scene;
    this.on = isLunarNewYear();
    this.shows = [];
    this.next = 4;
    if (!this.on) return;
    // the strings: small red tubes, instanced per show
    this.tube = new THREE.CylinderGeometry(0.022, 0.022, 0.1, 6).rotateZ(Math.PI / 2);
    this.tubeMat = new THREE.MeshStandardMaterial({ color: '#c4121c', roughness: 0.6 });
    // paper bits: points that fly up and settle
    const bp = new Float32Array(BITS * 3).fill(-9999);
    this.bitGeo = new THREE.BufferGeometry();
    this.bitGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    this.bits = new THREE.Points(
      this.bitGeo,
      new THREE.PointsMaterial({ color: '#d8141f', size: 0.06 })
    );
    this.bits.frustumCulled = false;
    scene.add(this.bits);
    this.bitV = new Float32Array(BITS * 3);
    this.bitLife = new Float32Array(BITS);
    this.bitFloor = new Float32Array(BITS);
    this.bitI = 0;
    // flashes and smoke: sprite pools
    const ft = dotTex(false),
      st = dotTex(true);
    this.flashes = [];
    for (let i = 0; i < FLASH; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: ft,
          color: '#fff1b0',
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        })
      );
      s.visible = false;
      s.life = 0;
      scene.add(s);
      this.flashes.push(s);
    }
    this.smokes = [];
    for (let i = 0; i < SMOKE; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: st,
          color: '#d9d6d0',
          depthWrite: false,
          transparent: true,
          opacity: 0,
        })
      );
      s.visible = false;
      s.life = 0;
      scene.add(s);
      this.smokes.push(s);
    }
    this.fi = this.si = 0;
  }

  _start(g, p) {
    const h = p.heading || 0,
      // the ped's right-hand side: the string lies there, running away from them
      rx = -Math.cos(h),
      rz = Math.sin(h);
    const x0 = p.pos.x + rx * 1.1,
      z0 = p.pos.z + rz * 1.1,
      fx = Math.sin(h),
      fz = Math.cos(h);
    const mesh = new THREE.InstancedMesh(this.tube, this.tubeMat, LINK),
      m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      v = new THREE.Vector3(),
      one = new THREE.Vector3(1, 1, 1),
      up = new THREE.Vector3(0, 1, 0);
    const pts = [];
    for (let k = 0; k < LINK; k++) {
      // a loose zigzag along the ped's facing, 1.7 m long
      const s = (k / (LINK - 1) - 0.5) * 1.7,
        wob = Math.sin(k * 1.9) * 0.05,
        x = x0 + fx * s + rx * wob,
        z = z0 + fz * s + rz * wob,
        y = surfaceAt(x, z) + 0.03;
      pts.push([x, y, z]);
      q.setFromAxisAngle(up, h + Math.PI / 2 + (k % 2 ? 0.5 : -0.5));
      mesh.setMatrixAt(k, m4.compose(v.set(x, y, z), q, one));
    }
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    // the ped stops, turns to the string and watches (Peds idles them; t counts down there)
    p.state = 'idle';
    p.pose = 'look';
    p.heading = Math.atan2(x0 - p.pos.x, z0 - p.pos.z);
    p.t = 1.2 + LINK * 0.085 + 2;
    p.pauseIn = Math.max(p.pauseIn || 0, 20);
    this.shows.push({ mesh, pts, k: 0, wait: 1.2, x: x0, z: z0, m4 });
  }

  _flash(x, y, z) {
    const s = this.flashes[this.fi++ % FLASH];
    s.visible = true;
    s.life = 0.07;
    s.position.set(x, y + 0.1, z);
    s.scale.setScalar(0.5 + Math.random() * 0.4);
  }
  _smoke(x, y, z) {
    const s = this.smokes[this.si++ % SMOKE];
    s.visible = true;
    s.life = 1.8;
    s.position.set(x, y + 0.15, z);
    s.scale.setScalar(0.4);
    s.material.opacity = 0.5;
  }
  _bitsAt(x, y, z, n) {
    const P = this.bitGeo.attributes.position.array;
    for (let i = 0; i < n; i++) {
      const j = this.bitI++ % BITS,
        a = Math.random() * Math.PI * 2,
        sp = 0.8 + Math.random() * 2.2;
      P[j * 3] = x;
      P[j * 3 + 1] = y + 0.05;
      P[j * 3 + 2] = z;
      this.bitV[j * 3] = Math.cos(a) * sp;
      this.bitV[j * 3 + 1] = 1.5 + Math.random() * 3;
      this.bitV[j * 3 + 2] = Math.sin(a) * sp;
      this.bitLife[j] = 25 + Math.random() * 10;
      this.bitFloor[j] = y + 0.01;
    }
  }

  update(dt, g) {
    if (!this.on || !g?.peds) return;
    const pl = g.player?.pos;
    // a new string every 8–18 s, at most MAX_SHOWS burning at once
    if ((this.next -= dt) <= 0 && pl) {
      this.next = 8 + Math.random() * 10;
      if (this.shows.length < MAX_SHOWS) {
        const cand = g.peds
          .active()
          .filter(
            (p) =>
              p.state === 'walk' &&
              !p.rag &&
              !p.run &&
              ((d) => d > 8 && d < 45)(Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z)) &&
              g.peds.inView(p.pos)
          );
        if (cand.length) this._start(g, cand[Math.floor(Math.random() * cand.length)]);
      }
    }
    // burning strings: one crack every ~85 ms from the far end
    for (let i = this.shows.length - 1; i >= 0; i--) {
      const S = this.shows[i];
      if ((S.wait -= dt) > 0) continue;
      while (S.wait <= 0 && S.k < LINK) {
        const [x, y, z] = S.pts[LINK - 1 - S.k];
        S.mesh.setMatrixAt(LINK - 1 - S.k, S.m4.makeScale(0, 0, 0));
        S.mesh.instanceMatrix.needsUpdate = true;
        this._flash(x, y, z);
        if (S.k % 3 === 0) this._smoke(x, y, z);
        this._bitsAt(x, y, z, 6);
        const loud = S.k === LINK - 1 ? 1.6 : 1;
        g.audio?.at(x, z, 90, () => {
          g.audio.noise(0.05 + Math.random() * 0.03, 1800 + Math.random() * 1600, 0.7, 0.35 * loud);
          g.audio.noise(0.09, 260, 0.9, 0.22 * loud, 0, 'lowpass');
        });
        S.k++;
        S.wait += 0.06 + Math.random() * 0.05;
      }
      if (S.k >= LINK) {
        this.scene.remove(S.mesh);
        S.mesh.dispose();
        this.shows.splice(i, 1);
      }
    }
    // flashes, smoke, paper bits
    for (const s of this.flashes) if (s.visible && (s.life -= dt) <= 0) s.visible = false;
    for (const s of this.smokes) {
      if (!s.visible) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.visible = false;
        continue;
      }
      s.position.y += dt * 0.6;
      s.scale.multiplyScalar(1 + dt * 0.9);
      s.material.opacity = 0.5 * (s.life / 1.8);
    }
    const P = this.bitGeo.attributes.position.array,
      V = this.bitV;
    let moved = false;
    for (let j = 0; j < BITS; j++) {
      if (this.bitLife[j] <= 0) continue;
      moved = true;
      if ((this.bitLife[j] -= dt) <= 0) {
        P[j * 3 + 1] = -9999;
        continue;
      }
      const fl = this.bitFloor[j];
      if (P[j * 3 + 1] <= fl && V[j * 3 + 1] <= 0) continue; // settled
      // light paper: strong drag, slow fall
      const k = Math.exp(-dt * 3);
      V[j * 3] *= k;
      V[j * 3 + 2] *= k;
      V[j * 3 + 1] = Math.max(-1.2, V[j * 3 + 1] - 9.8 * dt * 0.5);
      P[j * 3] += V[j * 3] * dt;
      P[j * 3 + 1] = Math.max(fl, P[j * 3 + 1] + V[j * 3 + 1] * dt);
      P[j * 3 + 2] += V[j * 3 + 2] * dt;
      if (P[j * 3 + 1] <= fl) V[j * 3 + 1] = 0;
    }
    if (moved) this.bitGeo.attributes.position.needsUpdate = true;
  }
}
