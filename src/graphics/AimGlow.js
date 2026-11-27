// AimGlow: a soft golden halo on whoever / whatever the crosshair picked for E (src/world/Kit.js actionAt).
// One camera-facing sprite with a radial gradient, additive and depth-tested without writing depth:
// placed at the middle of a person, their own body hides the middle of it, so it reads as a glow around them.
import * as THREE from 'three';
import { canvasTexture, uploadAndRelease } from './GpuMemLifecycle.js';

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  glowTex = canvasTexture(
    128,
    128,
    (x) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,214,110,0.85)');
      g.addColorStop(0.45, 'rgba(255,196,70,0.45)');
      g.addColorStop(1, 'rgba(255,180,40,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    },
    false
  );
  if (glowTex.isCanvasTexture) uploadAndRelease(glowTex);
  return glowTex;
}

export class AimGlow {
  constructor(scene) {
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    this.sprite.renderOrder = 5;
    this.sprite.visible = false;
    this.sprite.raycast = () => {}; // never in the way of picking
    scene.add(this.sprite);
    this.a = 0;
    this.t = 0;
  }
  // pt: [x, y, z, size] or null; dt in seconds
  update(pt, dt) {
    const s = this.sprite,
      on = !!pt;
    this.t += dt;
    this.a += ((on ? 1 : 0) - this.a) * Math.min(1, dt * 10);
    if (on) {
      const k = pt[3];
      s.position.set(pt[0], pt[1], pt[2]);
      s.scale.set(k * (pt[3] > 1.2 ? 0.75 : 1), k, 1);
    }
    s.material.opacity = this.a * (0.32 + 0.08 * Math.sin(this.t * 3.2)); // faint, slowly breathing
    s.visible = this.a > 0.02;
  }
}
