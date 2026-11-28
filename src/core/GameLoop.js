import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { Nano } from '../ui/phone/Nano.js';
import { saveSettings } from '../systems/AudioSystem.js';
import { QUALITY, PRESETS, postFxLevel, shadowLevel } from './GraphicsConfig.js';

const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = () =>
  matchMedia('(pointer: coarse)').matches ||
  (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);

// quality setting: 'auto' | 'xlow' | 'low' | 'medium' | 'high'. auto never goes above medium (high only when the
// player picks it): integrated / mobile GPUs and 4-core machines -> low, everything else -> medium; it steps down
// at runtime when the frame rate stays low (_autoQuality), as far as xlow (超低).
// What each level draws is declared in src/core/GraphicsConfig.js (PRESETS, the display settings SSOT); the player
// can override single settings on top (game.applyDisplaySettings). game.gfx is the resolved configuration.
export { QUALITY };
export const subQ = (q) => (q === 'xlow' ? 'low' : q);

// legacy view of the presets (view distance, fog, max pixel ratio, sun shadows); read game.gfx instead
export const QPROF = Object.fromEntries(
  QUALITY.map((q) => {
    const P = PRESETS[q];
    return [
      q,
      {
        far: P.far,
        fog: P.fogScale,
        pr: P.dprCap,
        shadows: P.shadows !== 'off',
        view: P.viewScale,
      },
    ];
  })
);

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
  // (the newer integrated GPUs below are not, see strong)
  const weak =
    !name ||
    /intel|uhd|iris|hd graphics|swiftshader|llvmpipe|software|microsoft basic|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics|radeon(\(tm\))? \d{3,4}m\b|vega \d|geforce mx|\bmx ?\d{3}\b/i.test(
      name
    );
  // a newer integrated GPU (Apple M, Intel Iris Xe, Radeon 680M / 780M / 880M) runs the lighter medium (no MSAA,
  // quarter-size bloom: src/graphics/PostFX.js) well; the old Intel UHD / HD office ones stay on low
  const newIgpu = /apple m\d|iris\(r\)? xe|iris xe|radeon(\(tm\))? ?[678]\d0m\b/i.test(name);
  const strong =
    newIgpu ||
    (!/geforce mx|\bmx ?\d{3}\b/i.test(name) &&
      /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|arc(\(tm\))? a\d/i.test(name));
  const cores = navigator.hardwareConcurrency || 4;
  // a dedicated card (e.g. Intel Arc) is not 'weak' even though its name says Intel; auto stops at medium
  return (_gpuGuess = isTouch() ? 'low' : !strong && (weak || cores <= 4) ? 'low' : 'medium');
}

// auto quality state machine (pure, unit-tested: tests/unit/auto-quality.test.js)
export const AUTOQ_FPS = 20,
  AUTOQ_WINDOW_MS = 3000,
  AUTOQ_WINDOWS = 2;
export const newAutoQ = () => ({ t: 0, sum: 0, n: 0, warm: 0, low: 0 });
export const autoQualityActive = (settings, quality) =>
  (settings?.quality || 'auto') === 'auto' &&
  !(settings?.gfx && Object.keys(settings.gfx).length) &&
  quality !== 'xlow';
// feed one frame; returns the fps that calls for a step down (null otherwise)
export function autoQualityStep(A, frameMs) {
  if (!(frameMs > 0) || frameMs > 250) return null; // tab was in the background
  if ((A.warm += frameMs) < AUTOQ_WINDOW_MS) return null;
  A.t += frameMs;
  A.sum += frameMs;
  A.n++;
  if (A.t < AUTOQ_WINDOW_MS) return null;
  const fps = 1000 / (A.sum / A.n);
  A.t = A.sum = A.n = 0;
  if (fps >= AUTOQ_FPS) {
    A.low = 0;
    return null;
  }
  if (++A.low < AUTOQ_WINDOWS) return null;
  A.low = 0;
  A.warm = 0; // the new level gets its own warm-up
  return fps;
}

// dynamic resolution state machine (pure, unit-tested: tests/unit/auto-quality.test.js)
export const DRS_WINDOW_MS = 2000,
  DRS_DOWN_FPS = 45,
  DRS_UP_FPS = 57,
  DRS_DOWN = 0.1,
  DRS_UP = 0.05,
  DRS_UP_HOLD_MS = 6000; // after any change, wait this long before stepping up again (no see-sawing)
export const newDrs = (cap) => ({ cap, scale: cap, t: 0, sum: 0, n: 0, warm: 0, since: 0 });
// dynamic resolution runs when the level asks for it and the player hasn't fixed 清晰度倍率 (nor ?dpr=)
export const drsActive = (game) =>
  !!game.gfx?.dynRes &&
  game.state === 'play' &&
  !(game.settings?.gfx && 'dprCap' in game.settings.gfx) &&
  !(game._gfxOpts?.url && 'dprCap' in game._gfxOpts.url);
// feed one frame; returns the new scale when it changes (null otherwise)
export function drsStep(D, frameMs, min, cap) {
  if (!(frameMs > 0) || frameMs > 250) return null;
  D.since += frameMs;
  if ((D.warm += frameMs) < AUTOQ_WINDOW_MS) return null;
  D.t += frameMs;
  D.sum += frameMs;
  D.n++;
  if (D.t < DRS_WINDOW_MS) return null;
  const fps = 1000 / (D.sum / D.n);
  D.t = D.sum = D.n = 0;
  let next = D.scale;
  if (fps < DRS_DOWN_FPS) next = Math.max(min, D.scale - DRS_DOWN);
  else if (fps > DRS_UP_FPS && D.since >= DRS_UP_HOLD_MS) next = Math.min(cap, D.scale + DRS_UP);
  next = Math.round(next * 100) / 100;
  if (next === D.scale) return null;
  D.since = 0;
  return next;
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

  // the pixel ratio actually drawn: dprCap, or the dynamic resolution scale while it runs (drsStep)
  pixelRatio() {
    const G = this.game.gfx,
      s = this.game._drs?.scale;
    return Math.min(devicePixelRatio, s != null && drsActive(this.game) ? s : G.dprCap);
  }

  // dynamic resolution (low / xlow, #438): every DRS_WINDOW_MS of play the average frame decides whether the pixel
  // ratio steps down (frames too long) or creeps back up (plenty of headroom) between gfx.dprMin and gfx.dprCap
  dynamicResolution(frameMs) {
    const game = this.game;
    if (!drsActive(game) || document.hidden) return;
    const G = game.gfx;
    const D = game._drs && game._drs.cap === G.dprCap ? game._drs : (game._drs = newDrs(G.dprCap));
    const next = drsStep(D, frameMs, G.dprMin, G.dprCap);
    if (next == null) return;
    const before = this.game.renderer.getPixelRatio();
    D.scale = next;
    const pr = this.pixelRatio();
    if (pr === before) return;
    game.renderer.setPixelRatio(pr);
    game.renderer.setSize(innerWidth, innerHeight);
    game.post.setSize(innerWidth, innerHeight);
  }

  // view distance, fog, shadows and the distant skyline follow the display settings (game.gfx)
  applyQuality() {
    const game = this.game;
    const G = game.gfx;
    game.camera.far = G.far;
    game.camera.updateProjectionMatrix();
    game.skySys.fogK = G.fogScale;
    game.viewK = G.viewScale;
    if (game.traffic) game.traffic.viewK = G.viewScale;
    if (game.peds) game.peds.viewK = G.viewScale;
    if (game.world?.vegetation) game.world.vegetation.viewDist = 700 * G.viewScale; // tree chunks
    // outer fill buildings (src/world/MapBuilder.js Geo.routed) are not drawn where the fog hides them: the camera
    if (game.world) game.world.viewer = game.camera;
    if (game.skyline) game.skyline.scale.setScalar(Math.min(1, (G.far * 0.92) / 2000)); // the backdrop sits 1.5-2 km out
    const sh = game.renderer.shadowMap,
      on = G.shadows !== 'off',
      type = G.shadows === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (sh.enabled !== on || (on && sh.type !== type)) {
      sh.enabled = on;
      sh.type = type;
      game.skySys.sun.castShadow = on;
      this.recompile();
    }
  }

  // every material builds its shader again on its next draw (shadow / environment on-off changes their defines)
  recompile() {
    this.game.scene.traverse((o) => {
      const m = o.material;
      if (m)
        (Array.isArray(m) ? m : [m]).forEach((x) => {
          x.needsUpdate = true;
        });
    });
  }

  // live display settings (src/core/GraphicsConfig.js LIVE_KEYS): pixel ratio, sun shadows, sky environment light,
  // post-processing, lamp lights, view distance and fog. prev: the configuration before the change (or null)
  applyDisplay(prev) {
    const game = this.game,
      G = game.gfx;
    if (!prev || prev.dprCap !== G.dprCap) {
      game.renderer.setPixelRatio(this.pixelRatio());
      game.renderer.setSize(innerWidth, innerHeight);
    }
    game.skySys.setShadowQuality(shadowLevel(G.shadows));
    game.post.setQuality(postFxLevel(G.postFx));
    game.post.setSize(innerWidth, innerHeight);
    game.world?.setLampLights?.(G.nightLamps);
    if (!prev || prev.envLight !== G.envLight) {
      game.skySys.setEnvMode(G.envLight);
      if (prev) this.recompile();
    }
    this.applyQuality();
  }

  // auto quality (only in pure 自動: quality 'auto' and no ⚙ 細部顯示設定 of the player's own): after a 3 s warm-up,
  // step down one level when TWO 3 s windows in a row average under 20 fps (phones capped at 30 fps, a corner or a GC
  // pause don't trip it). The step is remembered in settings.autoQ; picking 自動 again in the settings clears it.
  autoQuality(frameMs) {
    const game = this.game;
    if (!autoQualityActive(game.settings, game.quality) || document.hidden) return;
    // dynamic resolution goes first: the level (view distance, crowds) only steps down once it is at its floor
    if (drsActive(game) && game._drs && game._drs.scale > game.gfx.dprMin + 1e-3) return;
    const A = game._aq || (game._aq = newAutoQ());
    const fps = autoQualityStep(A, frameMs);
    if (fps == null) return;
    const next = QUALITY[Math.max(0, QUALITY.indexOf(game.quality) - 1)];
    this.setQuality(next);
    // remember it: the next load starts at this level (with its lighter world, crowds and no MSAA)
    game.settings.autoQ = next;
    saveSettings(game.settings);
    game.hud.toast(
      `偵測到畫面不夠順（${Math.round(fps)} fps），畫質自動調成「${Q_NAME[next]}」，下次開啟會直接用這個畫質；到設定再點一次「自動」可重新偵測`,
      'good',
      4200
    );
  }

  // live quality switch: the level's preset (plus the player's overrides) for every live display setting
  setQuality(q) {
    const game = this.game;
    if (!QUALITY.includes(q) || q === game.quality) return;
    const prev = game.gfx;
    game.quality = q;
    game.gfx = game.resolveGfx();
    this.applyDisplay(prev);
  }

  updateSky(dt) {
    const game = this.game;
    const t =
      (game.state === 'title' || game.state === 'bench') && game._titlePos
        ? game._titlePos
        : game.player.worldPos();
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
    const c = game.camera.position,
      night = game.night || 0;
    const each = (list) => {
      for (const v of list)
        v.lod?.(
          Math.hypot(v.mesh.position.x - c.x, v.mesh.position.y - c.y, v.mesh.position.z - c.z),
          night
        );
    };
    each(game.vehicles);
    each(game.traffic.agents);
    if (game.race) each(game.race.vehicles());
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
    const perf = game.perfHud?.level !== 'off' ? game.perfHud : null; // 設定 → 效能顯示 (src/core/PerfHud.js)
    perf?.frameStart(now);
    // 效能測試 (src/systems/Benchmark.js) measures every frame of its run
    const bench = game.state === 'bench' ? game.bench : null;
    bench?.frameStart(now);
    if (game.state === 'play') {
      this.dynamicResolution(now - game.last);
      this.autoQuality(now - game.last);
    }
    const dt = Math.min(0.05, (now - game.last) / 1000);
    game.last = now;
    game.time = (game.time || 0) + dt;
    if (game.input) {
      game.input.pollPad(dt);
      game.menuManager?.padMenus();
      game.prompts?.tick();
    }
    if (game.state === 'title') this.titleCam(dt);
    else if (game.state === 'bench') game.bench.update(dt);
    // title / benchmark: furniture culling and night window glow run too (no gameplay side effects), so the
    // benchmark measures the same scene the player sees
    if (game.state === 'title' || game.state === 'bench') game.interiors?.updateVisual?.(dt, game);
    else if (game.state === 'play') {
      game._update(dt);
    } else if (game.state === 'ending') {
      game.rig.yaw += dt * 0.1;
      game.rig.update(dt, { mdx: 0, mdy: 0 }, game.player, game.world.collision, 1, game.interiors);
    }
    // physics (unless _update already stepped it for the vehicle you ride, see _stepPhysics)
    if (!game._physStepped)
      game._stepPhysics(
        game.state === 'play' || game.state === 'title' || game.state === 'bench' ? dt : 0,
        null
      );
    game._physStepped = false;
    this.updateSky(dt);
    this.vehicleLod(dt);
    game.world.update(
      game.time,
      game.night,
      game.clock,
      game.state === 'title' || game.state === 'bench' ? game._titlePos : game.player.worldPos()
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
    // integrated / mobile GPUs draw the sun's shadow map every other frame (30 Hz at 60 fps; Game.init turns
    // shadowMap.autoUpdate off for them): the shadow map and its matrix are kept as a pair, so nothing shifts
    if (game.halfRateShadows) {
      this._shadowTick = !this._shadowTick;
      if (this._shadowTick) game.renderer.shadowMap.needsUpdate = true;
    }
    perf?.renderStart();
    bench?.renderStart();
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
      else {
        // back from the mahjong table (it draws sharper, src/systems/mahjong/MahjongScene.js): the quality's pixel ratio
        const pr = this.pixelRatio();
        if (game.renderer.getPixelRatio() !== pr) {
          game.renderer.setPixelRatio(pr);
          game.post.setSize(innerWidth, innerHeight);
        }
        // 火車經過鐵道旁：地面輕微震動，鏡頭只在這一幀畫的時候微晃，畫完放回去（src/entities/Trains.js shake）
        const sh = game.state === 'play' ? game.trains?.shake || 0 : 0,
          cp = game.camera.position;
        let ox = 0,
          oy = 0;
        if (sh > 0.01) {
          const t = game.time * 60;
          ox = Math.sin(t * 1.7) * 0.024 * sh; // 鐵軌旁約 2.5 cm、249 巷 11 弄約 1 cm
          oy = Math.sin(t * 2.3 + 1) * 0.035 * sh;
          cp.x += ox;
          cp.y += oy;
          game.camera.updateMatrixWorld();
        }
        game.post.render(dt, { night: game.night, sunset: game.skySys.sunset });
        if (ox || oy) {
          cp.x -= ox;
          cp.y -= oy;
          game.camera.updateMatrixWorld();
        }
      }
    }
    perf?.frameEnd(now);
    bench?.frameEnd(now);
    if (game._shot) {
      const cb = game._shot;
      game._shot = null;
      cb(game.renderer.domElement.toDataURL('image/jpeg', 0.85));
    }
    game.input.endFrame();
  }
}
