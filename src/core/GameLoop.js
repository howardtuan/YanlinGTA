import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { Nano } from '../ui/phone/Nano.js';
import { kernelsReady } from '../graphics/wasm/kernels.js';
import { saveSettings } from '../systems/AudioSystem.js';

const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = () =>
  matchMedia('(pointer: coarse)').matches ||
  (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);

// quality setting: 'auto' | 'xlow' | 'low' | 'medium' | 'high'. auto never goes above medium (high only when the
// player picks it): integrated / mobile GPUs and 4-core machines -> low, everything else -> medium; it steps down
// at runtime when the frame rate stays low (_autoQuality), as far as xlow (超低).
// xlow is 'low' for the world, sky, post-processing and trees (subQ) plus its own, harsher profile here.
export const QUALITY = ['xlow', 'low', 'medium', 'high'];
export const subQ = (q) => (q === 'xlow' ? 'low' : q);

// per quality: view distance (m), fog thickness, max pixel ratio, sun shadows
export const QPROF = {
  // view: how far pedestrians, traffic and parked vehicles are drawn (x their normal range)
  high: { far: 2600, fog: 1, pr: 1.6, shadows: true, view: 1 },
  medium: { far: 1500, fog: 1.12, pr: 1.0, shadows: true, view: 0.8 },
  low: { far: 750, fog: 1.6, pr: 0.8, shadows: false, view: 0.45 },
  xlow: { far: 450, fog: 2.4, pr: 0.6, shadows: false, view: 0.3 },
};

let _gpuGuess = null;
export function guessGpu() {
  if (_gpuGuess) return _gpuGuess;
  let name = '';
  // same GPU the game will use: on dual-GPU laptops the default context may be the integrated one
  try {
    const gl = document
      .createElement('canvas')
      .getContext('webgl', { powerPreference: 'high-performance' });
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    name = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (_e) {}
  // laptop / entry GPUs: AMD APUs ("Radeon 780M Graphics"), GeForce MX; an unreadable name counts as weak too
  const weak =
    !name ||
    /intel|uhd|iris|hd graphics|swiftshader|llvmpipe|software|microsoft basic|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics|radeon(\(tm\))? \d{3,4}m\b|vega \d|geforce mx|\bmx ?\d{3}\b/i.test(
      name
    );
  const strong =
    !/geforce mx|\bmx ?\d{3}\b/i.test(name) &&
    /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|arc(\(tm\))? a\d|apple m\d/i.test(name);
  const cores = navigator.hardwareConcurrency || 4;
  // a dedicated card (e.g. Intel Arc) is not 'weak' even though its name says Intel; auto stops at medium
  return (_gpuGuess = isTouch() ? 'low' : !strong && (weak || cores <= 4) ? 'low' : 'medium');
}

// 'auto': the level an earlier session stepped down to (settings.autoQ, _autoQuality) or the GPU guess
export const resolveQuality = (q, s) =>
  QUALITY.includes(q) ? q : QUALITY.includes(s?.autoQ) ? s.autoQ : guessGpu();
export const Q_NAME = { xlow: '超低', low: '低', medium: '中', high: '高（電影感）' };

export class GameLoop {
  constructor(game) {
    this.game = game;
    this.running = false;
    this.rafId = null;
    this._lodT = 0;
  }

  start() {
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  pixelRatio() {
    return Math.min(devicePixelRatio, QPROF[this.game.quality].pr);
  }

  // view distance, fog, shadows and the distant skyline follow the quality level
  applyQuality() {
    const game = this.game;
    const P = QPROF[game.quality];
    game.camera.far = P.far;
    game.camera.updateProjectionMatrix();
    game.skySys.fogK = P.fog;
    game.viewK = P.view;
    if (game.traffic) game.traffic.viewK = P.view;
    if (game.peds) game.peds.viewK = P.view;
    if (game.world?.vegetation) game.world.vegetation.viewDist = 700 * P.view; // tree chunks
    if (game.skyline) game.skyline.scale.setScalar(Math.min(1, (P.far * 0.92) / 2000)); // the backdrop sits 1.5-2 km out
    const sh = game.renderer.shadowMap;
    if (sh.enabled !== P.shadows) {
      sh.enabled = P.shadows;
      game.skySys.sun.castShadow = P.shadows;
      game.scene.traverse((o) => {
        const m = o.material;
        if (m)
          (Array.isArray(m) ? m : [m]).forEach((x) => {
            x.needsUpdate = true;
          });
      });
    }
  }

  // auto quality: after a warm-up, step down one level when the game keeps running under 28 fps
  autoQuality(frameMs) {
    const game = this.game;
    if ((game.settings.quality || 'auto') !== 'auto' || game.quality === 'xlow' || document.hidden)
      return;
    if (frameMs > 250) return; // tab was in the background
    const A = game._aq || (game._aq = { t: 0, sum: 0, n: 0, warm: 0 });
    if ((A.warm += frameMs) < 8000) return;
    A.t += frameMs;
    A.sum += frameMs;
    A.n++;
    if (A.t < 6000) return;
    const fps = 1000 / (A.sum / A.n);
    A.t = A.sum = A.n = 0;
    if (fps >= 28) return;
    const next = QUALITY[Math.max(0, QUALITY.indexOf(game.quality) - 1)];
    this.setQuality(next);
    A.warm = 4000; // give the new level a moment before judging it
    // remember it: the next load starts at this level (with its lighter world, crowds and no MSAA)
    game.settings.autoQ = next;
    saveSettings(game.settings);
    game.hud.toast(
      `偵測到畫面不夠順（${Math.round(fps)} fps），畫質自動調成「${Q_NAME[next]}」，下次開啟會直接用這個畫質，可在設定更改`,
      'good',
      4200
    );
  }

  // live quality switch: pixel ratio, shadow map, post-processing and lamp lights
  setQuality(q) {
    const game = this.game;
    if (!QUALITY.includes(q) || q === game.quality) return;
    game.quality = q;
    game.renderer.setPixelRatio(this.pixelRatio());
    game.renderer.setSize(innerWidth, innerHeight);
    game.skySys.setShadowQuality(subQ(q));
    game.post.setQuality(subQ(q));
    game.post.setSize(innerWidth, innerHeight);
    game.world.setQuality?.(subQ(q));
    this.applyQuality();
  }

  updateSky(dt) {
    const game = this.game;
    const t = game.state === 'title' && game._titlePos ? game._titlePos : game.player.worldPos();
    const p = { x: t.x, y: surfaceAt(t.x, t.z), z: t.z };
    game.skySys.update(dt, game.clock, p, game.time || 0);
    game.night = game.skySys.night;
    game.renderer.toneMappingExposure = lerp(1.0, 1.12, game.night);
    if (game.skyline) {
      const cp = game.camera.position,
        gy0 = surfaceAt(cp.x, cp.z);
      // backdrop only reads right from street height; from high above it floats
      game.skyline.visible = cp.y - gy0 < 80;
      if (game.skyline.visible) {
        game.skyline.position.set(cp.x, gy0, cp.z);
        game.skyline.userData.update(game.scene.fog.color);
      }
    }
  }

  // far vehicles (> ~30 m from the camera) draw one baked mesh instead of their parts (src/entities/Vehicles.js lod)
  vehicleLod(dt) {
    const game = this.game;
    if ((this._lodT = (this._lodT || 0) + dt) < 0.25 || !game.traffic) return;
    this._lodT = 0;
    const c = game.camera.position;
    const each = (list) => {
      for (const v of list)
        v.lod?.(
          Math.hypot(v.mesh.position.x - c.x, v.mesh.position.y - c.y, v.mesh.position.z - c.z)
        );
    };
    each(game.vehicles);
    each(game.traffic.agents);
    if (game.race) each(game.race.vehicles());
  }

  // ?perf in the URL: fps, frame time, draw calls and triangles per frame (all passes) in the top-left corner
  perfOverlay() {
    const game = this.game,
      r = game.renderer,
      el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      left: '6px',
      top: '6px',
      zIndex: 99999,
      font: '12px/1.35 ui-monospace,monospace',
      color: '#fff',
      background: 'rgba(0,0,0,.62)',
      padding: '4px 7px',
      borderRadius: '4px',
      pointerEvents: 'none',
      whiteSpace: 'pre',
    });
    document.body.appendChild(el);
    r.info.autoReset = false; // the post chain renders several passes per frame: count them all
    const P = { n: 0, ms: 0, t0: performance.now(), calls: 0, tris: 0, last: 0 };
    let gpu = '';
    try {
      const d = r.getContext().getExtension('WEBGL_debug_renderer_info');
      gpu = d ? r.getContext().getParameter(d.UNMASKED_RENDERER_WEBGL) : '';
    } catch (_e) {}
    gpu = gpu
      .replace(/^ANGLE \((.*)\)$/, '$1')
      .replace(/Direct3D.*$|\(0x[0-9a-f]+\)/gi, '')
      .slice(0, 60);
    game._perf = {
      begin: () => r.info.reset(),
      end: (now) => {
        P.n++;
        P.calls = r.info.render.calls;
        P.tris = r.info.render.triangles;
        if (P.last) P.ms += now - P.last;
        P.last = now;
        if (now - P.t0 < 500) return;
        const fps = P.ms > 0 ? (1000 * (P.n - 1)) / P.ms : 0;
        const ph = game.physics?.world;
        el.textContent = `${fps.toFixed(0)} fps  ${(P.ms / Math.max(1, P.n - 1)).toFixed(1)} ms\n繪圖呼叫 ${P.calls}  三角形 ${(P.tris / 1000).toFixed(0)}k\n畫質 ${game.quality}  WASM ${kernelsReady() ? '開' : '關'}  物理 ${ph ? `${ph.bodies.len()} 剛體 ${ph.colliders.len()} 碰撞體` : '關'}\n${gpu}`;
        P.n = 0;
        P.ms = 0;
        P.t0 = now;
        P.last = now;
      },
    };
  }

  titleCam(dt) {
    const game = this.game;
    game.titleT += dt;
    const t = game.world.named['鐘塔'] || { x: 0, z: 100 };
    const a = game.titleT * 0.06,
      ty = t.base ?? surfaceAt(t.x, t.z);
    game.camera.position.set(
      t.x + Math.sin(a) * 60,
      ty + 26 + Math.sin(a * 0.7) * 6,
      t.z + Math.cos(a) * 60
    );
    game.camera.lookAt(t.x - 10, ty + 14, t.z);
    game._titlePos = { x: t.x, z: t.z };
    game.clock = 17 * 60 + 35;
    game.traffic.update(dt, { pos: new THREE.Vector3(t.x, 0, t.z), vehicle: null }, null);
    game.peds.update(dt, { pos: new THREE.Vector3(t.x, 0, t.z) }, game.world.collision);
  }

  loop() {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this.loop());
    const game = this.game;
    const now = performance.now();
    if (game.state === 'play') this.autoQuality(now - game.last);
    const dt = Math.min(0.05, (now - game.last) / 1000);
    game.last = now;
    game.time = (game.time || 0) + dt;
    if (game.input) {
      game.input.pollPad(dt);
      game.menuManager?.padMenus();
      game.prompts?.tick();
    }
    if (game.state === 'title') this.titleCam(dt);
    else if (game.state === 'play') game._update(dt);
    else if (game.state === 'ending') {
      game.rig.yaw += dt * 0.1;
      game.rig.update(dt, { mdx: 0, mdy: 0 }, game.player, game.world.collision, 1, game.interiors);
    }
    // physics (unless _update already stepped it for the vehicle you ride, see _stepPhysics)
    if (!game._physStepped)
      game._stepPhysics(game.state === 'play' || game.state === 'title' ? dt : 0, null);
    game._physStepped = false;
    this.updateSky(dt);
    this.vehicleLod(dt);
    game.world.update(
      game.time,
      game.night,
      game.clock,
      game.state === 'title' ? game._titlePos : game.player.worldPos()
    );
    for (const b of game.ballotList) {
      if (!b.taken) {
        b.mesh.rotation.y = game.time * 2 + b.ph;
        b.mesh.position.y = b.y0 + Math.sin(game.time * 3 + b.ph) * 0.15;
      }
    }
    for (const b of game.beams) {
      if (b.visible) b.material.opacity = 0.22 + Math.sin(game.time * 4) * 0.06;
    }
    if (game._perf) game._perf.begin();
    // while the phone's on-device AI (Gemini Nano, on the same GPU) writes a reply, draw ~6 frames a second: the player
    // is frozen with the phone open anyway, and the model answers much sooner
    const yieldGpu =
      Nano.active > 0 &&
      game.phone?.open &&
      !game.player.vehicle &&
      !game._shot &&
      now - (game._drawnAt || 0) < 160;
    // the computer (src/ui/PC.js) and the PYL video cover the whole screen: don't draw the 3D scene behind them at all, so typing
    // in the terminal / notes stays smooth (drawing the campus took ~20 ms a frame and made the keys lag)
    const covered = (game.pc?.isOpen || game.videoOpen) && !game._shot;
    if (!yieldGpu && !covered) {
      game._drawnAt = now;
      game.concerts?.frame(); // YouTube player over the arena's main screen, after the camera has moved
      game.fpv?.renderMirrors(game.renderer); // rear view for the cockpit mirrors
      if (game.mahjong?.playing)
        game.mahjong.render(game.renderer); // 277 麻將: its own little scene (src/systems/mahjong/MahjongScene.js)
      else if (game.zzQuest?.film.active)
        game.zzQuest.film.render(game.renderer); // 吱吱's 武嶺 film: its own little scene
      else game.post.render(dt, { night: game.night, sunset: game.skySys.sunset });
    }
    if (game._perf) game._perf.end(now);
    if (game._shot) {
      const cb = game._shot;
      game._shot = null;
      cb(game.renderer.domElement.toDataURL('image/jpeg', 0.85));
    }
    game.input.endFrame();
  }
}
