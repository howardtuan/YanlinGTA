import * as THREE from 'three';
import { buildWorld, buildSkyline, mulberry32, makeLabel } from './map.js';
import { Vehicle, sameLevel, bodyGap } from './vehicles.js';
import { Traffic, Peds } from './npc.js';
import { Player, CameraRig } from './player.js';
import { Input } from './input.js';
import { Audio, loadSettings, saveSettings } from './audio.js';
import { buildInteriors, imFootprint, sacTrimmedPts, MCD_SPEC, GUARD_SPECS, guardFootprint, mainGateLawn, mainGateKeep, MAIN_GATE, IM_SPEC, YH_SPEC, yhFootprint, yhOutline, teaFootprint } from './interiors.js';
import { HUD } from './hud.js';
import { Missions, SPEECH } from './missions.js';
import { createCharacter, randomStudent } from './character.js';
import { pointInPoly } from './collision.js';
import { loadTerrain, surfaceAt } from './terrain.js';
import { SkySystem } from './sky.js';
import { PostFX } from './post.js';
import { Phone } from './phone.js';
import { GateDuty } from './gateduty.js';
import { McShift } from './mcshift.js';
import { Prompts, dual } from './prompts.js';
import { controlsHTML, bindControls } from './controls.js';
import { readSave, writeSave, applySave, clearSave } from './save.js';
import { PC } from './pc.js';
import { Wardrobe } from './wardrobe.js';
import { Nav } from './nav.js';
import { Airdrop } from './airdrop.js';
import { Market } from './stocks.js';
import { Race } from './race.js';
import { Friends } from './friends.js';
import { TeaShop } from './teashop.js';
import { initKernels, kernelsReady } from './wasm/kernels.js';
import { Physics, G } from './physics.js';
import { Chassis } from './vehphys.js';
import { buildPhysicsWorld } from './physworld.js';

const $ = id => document.getElementById(id);
// masses for vehicles thrown by physics (kg, without rider) and the restitution of those hits
const vmass = v => v.kind === 'scooter' ? 110 : 1250, KNOCK_E = 0.3;
// bind a click handler; a missing element (an older cached index.html) must not stop the game from loading
const onClick = (id, fn) => { const el = $(id); if (el) el.onclick = fn; else console.warn('missing #' + id); };
const setLoad = (p, t) => { $('loadFill').style.width = (p * 100) + '%'; $('loadText').textContent = `${t || '載入中 LOADING'} · ${Math.round(p * 100)}%`; };
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const lerp = (a, b, t) => a + (b - a) * t;
const lockPointer = el => { try { const r = el.requestPointerLock?.(); if (r && r.catch) r.catch(() => { }); } catch (e) { } };
const isTouch = () => matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);
// quality setting: 'auto' | 'xlow' | 'low' | 'medium' | 'high'. auto never goes above medium (high only when the
// player picks it): integrated / mobile GPUs and 4-core machines -> low, everything else -> medium; it steps down
// at runtime when the frame rate stays low (_autoQuality), as far as xlow (超低).
// xlow is 'low' for the world, sky, post-processing and trees (subQ) plus its own, harsher profile here.
const QUALITY = ['xlow', 'low', 'medium', 'high'];
const subQ = q => (q === 'xlow' ? 'low' : q);
// per quality: view distance (m), fog thickness, max pixel ratio, sun shadows
const QPROF = {
// view: how far pedestrians, traffic and parked vehicles are drawn (x their normal range)
  high: { far: 2600, fog: 1, pr: 1.6, shadows: true, view: 1 },
  medium: { far: 1500, fog: 1.12, pr: 1.0, shadows: true, view: 0.8 },
  low: { far: 750, fog: 1.6, pr: 0.8, shadows: false, view: 0.45 },
  xlow: { far: 450, fog: 2.4, pr: 0.6, shadows: false, view: 0.3 },
};
let _gpuGuess = null;
function guessGpu() {
  if (_gpuGuess) return _gpuGuess;
  let name = '';
  // same GPU the game will use: on dual-GPU laptops the default context may be the integrated one
  try { const gl = document.createElement('canvas').getContext('webgl', { powerPreference: 'high-performance' }); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); name = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''; gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) { }
  // laptop / entry GPUs: AMD APUs ("Radeon 780M Graphics"), GeForce MX; an unreadable name counts as weak too
  const weak = !name || /intel|uhd|iris|hd graphics|swiftshader|llvmpipe|software|microsoft basic|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics|radeon(\(tm\))? \d{3,4}m\b|vega \d|geforce mx|\bmx ?\d{3}\b/i.test(name);
  const strong = !/geforce mx|\bmx ?\d{3}\b/i.test(name) && /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|arc(\(tm\))? a\d|apple m\d/i.test(name);
  const cores = navigator.hardwareConcurrency || 4;
  // a dedicated card (e.g. Intel Arc) is not 'weak' even though its name says Intel; auto stops at medium
  return (_gpuGuess = isTouch() ? 'low' : !strong && (weak || cores <= 4) ? 'low' : 'medium');
}
// 'auto': the level an earlier session stepped down to (settings.autoQ, _autoQuality) or the GPU guess
const resolveQuality = (q, s) => QUALITY.includes(q) ? q : QUALITY.includes(s?.autoQ) ? s.autoQ : guessGpu();
const Q_NAME = { xlow: '超低', low: '低', medium: '中', high: '高（電影感）' };

class Game {
  async init() {
    setLoad(0.02, '載入地圖資料');
    // terrain is optional: without data/terrain.json the world stays flat
    // WebAssembly kernels (procedural textures) and the Rapier physics engine load alongside; without
    // them the JS versions / the game's own collision run
    this.physics = new Physics();
    const [data, terrain] = await Promise.all([
      fetch('data/cycu.json' + (window.__q || '')).then(r => r.json()),
      fetch('data/terrain.json' + (window.__q || '')).then(r => (r.ok ? r.json() : null)).catch(() => null),
      initKernels(),
      this.physics.init(),
    ]);
    loadTerrain(terrain);
    this.data = data;
    this.settings = loadSettings();
    // quality: sky / shadows / post-processing / lamp lights switch live; the low-quality world
    // (MSAA, 補建街區 back rows, crowd sizes) only changes with a reload
    this.quality = resolveQuality(this.settings.quality, this.settings);
    this.lowQ = this.quality === 'low' || this.quality === 'xlow';
    this.xlowQ = this.quality === 'xlow';
    // 補建街區: synthetic content for blocks OSM leaves empty (tools/block_survey.json,
    // generated, not real footprints). Off -> OSM only; low quality drops the
    // lod-marked back rows. Applies on reload.
    const fillOn = this.settings.fill !== 'off';
    const keepSyn = o => !o.synthetic || (fillOn && !(this.lowQ && o.lod));
    for (const k of ['buildings', 'areas', 'barriers']) data[k] = data[k].filter(keepSyn);
    // custom-built enterable buildings replace these OSM footprints
    for (const b of data.buildings) {
      if (b.name === '資訊管理學系') { b.skip = true; b.labelH = 13.5; }
      if (b.name === '警衛室') b.skip = true;
      if (b.name === '學生活動中心') b.pts = sacTrimmedPts();
      if (b.id === YH_SPEC.id) { b.skip = true; b.pts = yhOutline(); } // 孫師傅牛肉拉麵 + 彥霖's old room (interiors.js builds it, 1.35x)
      if (b.id === YH_SPEC.next) { // …so the town house next door gives up the 1.5 m the bigger house needs
        const c = Math.cos(YH_SPEC.ang), s = Math.sin(YH_SPEC.ang), ext = YH_SPEC.W * (YH_SPEC.k - 1);
        b.pts = b.pts.map(([x, z]) => ((x - YH_SPEC.ox) * c + (z - YH_SPEC.oz) * s < YH_SPEC.W + 0.5 ? [x + c * ext, z + s * ext] : [x, z]));
      }
    }
    // that building carries its own shop sign
    for (const p of data.pois) if (p.name === '孫師傅牛肉拉麵' || p.name === '茶學苑 Tea Arts') p.noSign = true;
    const M = MCD_SPEC;
    const reserved = [imFootprint(), yhFootprint(), teaFootprint(), [[M.x0, M.z0], [M.x1 + 5, M.z0], [M.x1 + 5, M.z1 + 2], [M.x0, M.z1 + 2]], ...GUARD_SPECS(data).map(guardFootprint), mainGateLawn(), MAIN_GATE.forecourt];
    // street furniture keeps clear of the guardhouse boom barriers and the spawn
    const keep = [];
    for (const s of GUARD_SPECS(data)) {
      if (s.main) { keep.push(...mainGateKeep()); continue; } // 正門: lift gates across both lanes, bollards
      const c = Math.cos(s.ang), sn = Math.sin(s.ang), w = (x, z) => ({ x: s.x + x * c - z * sn, z: s.z + x * sn + z * c });
      keep.push({ ...w(4.2, 3.6), r: 3 }, { ...w(6.7, 3.6), r: 4.5 });
    }
    { const g = data.pois.find(p => p.name === '舊校門') || { x: -231, z: 39 }; keep.push({ x: g.x, z: g.z, r: 18 }); }
    // renderer
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowQ, powerPreference: 'high-performance' });
    r.setPixelRatio(this._pixelRatio());
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true; r.shadowMap.type = this.lowQ ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.domElement.id = 'game';
    document.getElementById('app').prepend(r.domElement);
    this.scene = new THREE.Scene();
    // the scene root never moves: without this it marks itself dirty every frame and forces three.js to
    // recompute the world matrix of every object, even ones that are frozen (matrixAutoUpdate = false)
    this.scene.matrixAutoUpdate = false;
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 2600);
    // rAF stops in background tabs but the WebAudio engine drone would keep humming
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.audio?.setEngine(false, 0); });
    addEventListener('resize', () => { r.setSize(innerWidth, innerHeight); this.post?.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this._checkRotate(); });

    this._sky();
    this.post = new PostFX(r, this.scene, this.camera, subQ(this.quality));
    await nextFrame();
    setLoad(0.08, '搭建中原大學');
    // like the real 資管系館: big banyans, royal palms and a pine in the front garden
    const featureTrees = (() => {
      const { ox, oz, ang, D } = IM_SPEC, c = Math.cos(ang), s = Math.sin(ang);
      return [[5, D + 13, 'rain', 0.85], [41, D + 14, 'rain', 0.8], [15, D + 7.5, 'palm', 0.9], [31, D + 7.5, 'palm', 0.95], [-3, D + 9, 'pine', 0.8]]
        .map(([x, z, kind, sc]) => ({ x: ox + x * c - z * s, z: oz + x * s + z * c, kind, s: sc }));
    })();
    this.world = buildWorld(this.scene, data, p => setLoad(0.08 + p * 0.7, '搭建中原大學'), { reserved, keep, low: this.lowQ, quality: subQ(this.quality), featureTrees, mainGate: GUARD_SPECS(data)[0] });
    this.skyline = buildSkyline(this.scene, this.xlowQ ? 40 : this.lowQ ? 70 : 180);
    this._applyQuality(); // view distance / fog / shadows / skyline size for the chosen quality
    setLoad(0.78, '蓋資管系館、麥當勞、警衛室');
    await nextFrame();
    this.interiors = buildInteriors(this.scene, data, this.world.collision);
    // static physics colliders from the same data (terrain, decks, walls, trunks, interior floors)
    // (a failure here turns physics off and the game keeps its own collision instead of stopping the load)
    try { this.physStats = buildPhysicsWorld(this.physics, this.world.collision, this.interiors); }
    catch (e) { console.warn('物理世界建立失敗，遊戲改用原本的碰撞', e); try { this.physics.world?.free(); } catch (e2) { } this.physics.world = null; }
    await nextFrame();
    setLoad(0.8, '召喚同學與機車');
    this.input = new Input(this.renderer.domElement);
    this.audio = new Audio(this.settings);
    this.hud = new HUD(this.world);
    this.player = new Player(this.scene);
    this.rig = new CameraRig(this.camera);
    this.traffic = new Traffic(this.scene, this.world, this.xlowQ ? 8 : this.lowQ ? 14 : 26);
    this.peds = new Peds(this.scene, this.world, this.xlowQ ? 10 : this.lowQ ? 18 : 32);
    this.traffic.viewK = this.peds.viewK = this.viewK; // draw range for the quality level
    // a wreck is only cleared away where the camera does not look (within 70° of its view direction, 150 m)
    { const cf = new THREE.Vector3(); this.traffic.inView = p => { const c = this.camera.position, dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d > 150) return false; if (d < 4) return true; this.camera.getWorldDirection(cf); const l = Math.hypot(cf.x, cf.z) || 1; return (dx * cf.x + dz * cf.z) / (d * l) > Math.cos(1.22); }; }
    this.vehicles = []; this.npcs = [];
    this.votes = 0; this.ballotsTaken = 0; this.clock = 17 * 60 + 20; this.playTime = 0;
    // pocket money (Peach Pay): start with NT$200, earn more at the McDonald's counter
    this.money = 200; this.ledger = [{ what: '媽媽給的零用錢', n: 200, at: this.clock }];
    this.hud.setMoney(this.money);
    this.phone = new Phone(this);
    this.job = new McShift(this); // 麥當勞打工值班
    this.gate = new GateDuty(this); // 新中北路側門門禁任務
    this.race = new Race(this); // 新中北路障礙賽 (sign up at 力行大樓)
    this.pc = new PC(this);             // 彥霖's old computer (2F of 孫師傅牛肉拉麵)
    this.wardrobe = new Wardrobe(this); // …and the wardrobe next to it
    this.nav = new Nav(this);           // map waypoint + route
    this.airdrop = new Airdrop(this);   // 呼叫載具: helicopter drops your JET SL
    this.market = new Market(this);     // 靈感股 (phone app + desktop computers)
    this.friends = new Friends(this);   // 同學 you can befriend (排球少年 吱吱 at the 體育館)
    this.tea = new TeaShop(this);       // 茶學苑 (中北路, outside the 正門): order drinks; 吱吱 works there on some shifts
    this.hud.onPin = (p) => { if (p) this.nav.set(p.x, p.z); else this.nav.clear(); $('bmClear')?.classList.toggle('hidden', !this.nav.target); };
    onClick('bmClose', () => this.closeMap());
    onClick('bmClear', () => { this.nav.clear(); $('bmClear').classList.add('hidden'); });
    // gamepad: button layout follows whatever has the controls right now
    this.input.padDriving = () => !!this.player.vehicle;
    this.input.padContext = () => this.race.state === 'results' ? 'race' : this.hud.bigOpen ? 'map' : this.phone.open ? 'phone' : this.gate.active ? 'gate' : this.job.active ? 'job' : 'play';
    // on-screen key hints follow the last device used (keyboard <-> gamepad buttons)
    this.prompts = new Prompts(this.input, () => ({ ctx: this.input.padContext(), vehicle: !!this.player.vehicle }));
    this.hud.keyLabel = (kb, pad) => this.prompts.pad ? this.prompts.label(pad) : kb;
    this.input.onDevice = (d, id) => this.prompts.setPad(d === 'pad', id);
    this.input.onPad = (on, id) => {
      if (on) { this.prompts.setPad(true, id); this.hud.toast(`🎮 搖桿已連線：左搖桿移動、右搖桿視角、${this.prompts.label('A')} 互動／對話`, 'good', 3200); }
      else { this.input._use('kb'); this.hud.toast('🎮 搖桿已中斷', 'bad', 3200); }
    };
    // 彩蛋 (tools/overrides.json pois[].egg): toast once per game when you walk / ride past
    this.eggs = (this.data.eggs || []).map(e => ({ ...e, found: false }));
    // 彥霖 campaign billboards at key campus spots
    for (const n of ['資訊管理學系', '鐘塔', '學生活動中心', '張靜愚紀念圖書館', '全人教育村']) {
      const it = this.world.named[n]; if (!it) continue;
      const rp = this.world.nearestRoadPoint(it.x, it.z); if (!rp) continue;
      const half = (rp.road.w || 4) / 2 + 3.5;
      for (const side of [1, -1]) {
        const x = rp.x + Math.cos(rp.dir) * half * side, z = rp.z - Math.sin(rp.dir) * half * side;
        if (this.world.isFree(x, z, 3.2)) { this.world.addBoard(x, z, rp.dir + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI, 0.8); break; }
      }
    }
    { const nm = this.world.nightMarket; if (this.world.isFree(nm.x + 4, nm.z, 3)) this.world.addBoard(nm.x + 4, nm.z, 0, 0.8); }
    this._spawnParked();
    Vehicle.knock = (o, by, nx, nz, impact) => this._knockVehicle(o, by, nx, nz, impact);
    Vehicle.knockTraffic = (o, by, nx, nz, impact) => this._knockTraffic(o, by, nx, nz, impact);
    // the vehicle you ride gets a physics body (js/vehphys.js) unless ?arcadecar (or no physics)
    Vehicle.onRide = (v, on) => {
      // (the stand-ins of the vehicle and of you on foot go first: the new body must not start inside them)
      if (on && this.physics.ready && !/[?&]arcadecar\b/.test(location.search) && !v.body) { this.physics.dropMover(v); this.physics.dropMover(this.player); Chassis.attach(this.physics, v); }
      else if (!on && v.body) v.body.remove();
    };
    this._ballots();
    this._beam();
    // start position: inside the old campus gate (舊校門)
    const gate = data.pois.find(p => p.name === '舊校門') || { x: -231, z: 39 };
    const im = this.world.named['資訊管理學系'];
    const near = this.world.nearestRoadPoint(gate.x + 6, gate.z + 2);
    const sx = near ? near.x : gate.x + 6, sz = near ? near.z : gate.z;
    this.player.place(sx, sz, Math.atan2(im.x - sx, im.z - sz));
    this.startPos = { x: sx, z: sz, h: this.player.heading }; // story NPCs (小安) stand here
    this.rig.yaw = this.player.heading;
    this.myScooter = this.spawnScooterNear(sx, sz, false, true);
    setLoad(0.95, '準備出發');
    this.missions = new Missions(this);
    // warm up a frame so shaders compile behind the loading screen; compileAsync lets the driver
    // compile them in parallel (KHR_parallel_shader_compile) without freezing the page
    try { await this.renderer.compileAsync(this.scene, this.camera); } catch (e) { this.renderer.compile(this.scene, this.camera); }
    this._menus();
    if (/[?&]perf\b/.test(location.search)) this._perfOverlay();
    if (/[?&]physdebug\b/.test(location.search)) this.physics.enableDebug(this.scene);
    this.last = performance.now();
    this.state = 'title';
    this.titleT = 0;
    setLoad(1, '完成');
    $('loading').classList.add('hidden'); $('title').classList.remove('hidden');
    this._loop();
  }

  // ---------- sky & lighting ----------
  _pixelRatio() { return Math.min(devicePixelRatio, QPROF[this.quality].pr); }
  // view distance, fog, shadows and the distant skyline follow the quality level
  _applyQuality() {
    const P = QPROF[this.quality];
    this.camera.far = P.far; this.camera.updateProjectionMatrix();
    this.skySys.fogK = P.fog; this.viewK = P.view;
    if (this.traffic) this.traffic.viewK = P.view; if (this.peds) this.peds.viewK = P.view;
    if (this.world?.vegetation) this.world.vegetation.viewDist = 700 * P.view; // tree chunks
    if (this.skyline) this.skyline.scale.setScalar(Math.min(1, (P.far * 0.92) / 2000)); // the backdrop sits 1.5-2 km out
    const sh = this.renderer.shadowMap;
    if (sh.enabled !== P.shadows) {
      sh.enabled = P.shadows; this.skySys.sun.castShadow = P.shadows;
      this.scene.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); });
    }
  }
  // auto quality: after a warm-up, step down one level when the game keeps running under 28 fps
  _autoQuality(frameMs) {
    if ((this.settings.quality || 'auto') !== 'auto' || this.quality === 'xlow' || document.hidden) return;
    if (frameMs > 250) return; // tab was in the background
    const A = this._aq || (this._aq = { t: 0, sum: 0, n: 0, warm: 0 });
    if ((A.warm += frameMs) < 8000) return;
    A.t += frameMs; A.sum += frameMs; A.n++;
    if (A.t < 6000) return;
    const fps = 1000 / (A.sum / A.n); A.t = A.sum = A.n = 0;
    if (fps >= 28) return;
    const next = QUALITY[Math.max(0, QUALITY.indexOf(this.quality) - 1)];
    this.setQuality(next); A.warm = 4000; // give the new level a moment before judging it
    // remember it: the next load starts at this level (with its lighter world, crowds and no MSAA)
    this.settings.autoQ = next; saveSettings(this.settings);
    this.hud.toast(`偵測到畫面不夠順（${Math.round(fps)} fps），畫質自動調成「${Q_NAME[next]}」，下次開啟會直接用這個畫質，可在設定更改`, 'good', 4200);
  }
  _sky() {
    // physically based sky + clouds + stars / moon, sun & ambient driven by the clock, IBL from the sky
    this.skySys = new SkySystem(this.scene, this.renderer, subQ(this.quality));
    this.sun = this.skySys.sun; this.hemi = this.skySys.hemi;
    // player vehicle headlight
    this.headlight = new THREE.SpotLight('#fff1d0', 0, 60, 0.55, 0.5, 1.2);
    this.scene.add(this.headlight, this.headlight.target);
    this.playerLight = new THREE.PointLight('#ffd9a0', 0, 18, 1.5); this.scene.add(this.playerLight);
  }
  _updateSky(dt) {
    const t = this.state === 'title' && this._titlePos ? this._titlePos : this.player.worldPos();
    const p = { x: t.x, y: surfaceAt(t.x, t.z), z: t.z };
    this.skySys.update(dt, this.clock, p, this.time || 0);
    this.night = this.skySys.night;
    this.renderer.toneMappingExposure = lerp(1.0, 1.12, this.night);
    if (this.skyline) {
      const cp = this.camera.position, gy0 = surfaceAt(cp.x, cp.z);
      // backdrop only reads right from street height; from high above it floats
      this.skyline.visible = cp.y - gy0 < 80;
      if (this.skyline.visible) {
        this.skyline.position.set(cp.x, gy0, cp.z);
        this.skyline.userData.update(this.scene.fog.color);
      }
    }
  }
  // live quality switch: pixel ratio, shadow map, post-processing and lamp lights
  setQuality(q) {
    if (!QUALITY.includes(q) || q === this.quality) return;
    this.quality = q;
    this.renderer.setPixelRatio(this._pixelRatio());
    this.renderer.setSize(innerWidth, innerHeight);
    this.skySys.setShadowQuality(subQ(q));
    this.post.setQuality(subQ(q));
    this.post.setSize(innerWidth, innerHeight);
    this.world.setQuality?.(subQ(q));
    this._applyQuality();
  }

  // ---------- spawning ----------
  _addVehicle(kind, x, z, h, rnd, opt) {
    const v = new Vehicle(kind, rnd || Math.random, opt);
    v.place(x, z, h); this.scene.add(v.mesh); this.vehicles.push(v); return v;
  }
  // move the hero's JET SL next to (x,z) unless he's riding it
  bringMyScooter(x, z) {
    const v = this.myScooter; if (!v || this.player.vehicle === v) return;
    if (Math.hypot(v.pos.x - x, v.pos.z - z) < 25) return;
    const w = this.world;
    for (let r = 3; r < 20; r += 1.5) for (let a = 0; a < 6.28; a += 0.5) {
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (w.isFree(px, pz, 1.2)) { const near = w.nearestRoadPoint(px, pz); v.place(px, pz, near ? near.dir : 0); v.mesh.visible = true; return; }
    }
  }
  spawnScooterNear(x, z, highlight, jet = false) {
    const w = this.world;
    for (let r = 3; r < 20; r += 1.5) for (let a = 0; a < 6.28; a += 0.5) {
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (w.isFree(px, pz, 1.2)) {
        const near = w.nearestRoadPoint(px, pz);
        const v = this._addVehicle('scooter', px, pz, near ? near.dir : 0, null, { jet });
        if (jet) { const l = makeLabel('🛵 我的 JET SL', { height: 0.42, color: '#ff8cc6' }); l.position.set(0, 1.95, 0); v.mesh.add(l); v.tag = l; }
        if (highlight) { const l = makeLabel('🛵 騎我！', { height: 0.5, color: '#ffd23f' }); l.position.set(0, 1.9, 0); v.mesh.add(l); v.hint = l; }
        return v;
      }
    }
  }
  _spawnParked() {
    const rnd = mulberry32(5150), w = this.world;
    // OSM lots: until 60 vehicles exist. 補建 (synthetic) lots come last in data.areas, so each 補建 round
    // (blk < 2000: round 1, >= 2000: round 2) gets its own 20
    const synParked = [0, 0], synRound = a => (a.blk || 0) >= 2000 ? 1 : 0;
    for (const a of this.data.areas) {
      if (a.kind !== 'parking' || (a.synthetic ? synParked[synRound(a)] >= 20 : this.vehicles.length > 60)) continue;
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of a.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const area = (x1 - x0) * (z1 - z0);
      const moto = (a.name || '').includes('機車');
      const n = Math.min(moto ? 8 : 3, Math.floor(area / (moto ? 25 : 90)));
      let placed = 0;
      for (let i = 0; i < n * 5 && placed < n; i++) {
        const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
        if (!pointInPoly(x, z, a.pts) || !w.isFree(x, z, moto ? 1 : 2.2)) continue;
        if (this.vehicles.some(v => Math.hypot(v.pos.x - x, v.pos.z - z) < (moto ? 1.6 : 5))) continue;
        this._addVehicle(moto || rnd() < 0.5 ? 'scooter' : (rnd() < 0.3 ? 'taxi' : 'car'), x, z, moto ? Math.PI / 2 : rnd() * 6.28, rnd);
        placed++; if (a.synthetic) synParked[synRound(a)]++;
      }
    }
    // roadside scooters (Taiwan streets are full of them)
    let c = 0;
    for (const r of this.data.roads) {
      if (!r.drive || r.type === 'primary') continue;
      for (let i = 0; i < r.pts.length - 1 && c < 45; i++) {
        if (rnd() > 0.12) continue;
        const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 8) continue;
        const t = rnd(), nx = -dz / l, nz = dx / l, side = rnd() < 0.5 ? 1 : -1;
        const x = a[0] + dx * t + nx * side * (r.w / 2 + 0.3), z = a[1] + dz * t + nz * side * (r.w / 2 + 0.3);
        if (!w.isFree(x, z, 0.9)) continue;
        this._addVehicle('scooter', x, z, Math.atan2(nx * side, nz * side), rnd); c++;
      }
    }
  }
  _ballots() {
    const rnd = mulberry32(34), w = this.world;
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 80;
    const g = cv.getContext('2d'); g.fillStyle = '#ffcc33'; g.fillRect(0, 0, 64, 80); g.strokeStyle = '#a66b00'; g.lineWidth = 6; g.strokeRect(3, 3, 58, 74);
    g.fillStyle = '#7a3d00'; g.font = '900 40px "Noto Sans TC","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('票', 32, 42);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffb300', emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.4 });
    const geo = new THREE.BoxGeometry(0.7, 0.9, 0.1);
    this.ballotList = [];
    const spots = [];
    for (const [n, it] of Object.entries(w.named)) {
      if (it.b && !['campus', 'dorm', 'church'].includes(it.b.kind)) continue;
      const p = w.nearestRoadPoint(it.x, it.z); if (p) spots.push([p.x, p.z]);
    }
    spots.push([w.nightMarket.x, w.nightMarket.z]);
    while (spots.length < 34) {
      const n = w.walkNodes[Math.floor(rnd() * w.walkNodes.length)];
      if (Math.hypot(n.x, n.z - 60) > 520) continue;
      if (spots.some(s => Math.hypot(s[0] - n.x, s[1] - n.z) < 40)) continue;
      spots.push([n.x, n.z]);
    }
    // de-dupe close spots
    const final = [];
    for (const s of spots) if (!final.some(f => Math.hypot(f[0] - s[0], f[1] - s[1]) < 12)) final.push(s);
    while (final.length < 34) { const n = w.walkNodes[Math.floor(rnd() * w.walkNodes.length)]; if (Math.hypot(n.x, n.z - 60) < 600 && !final.some(f => Math.hypot(f[0] - n.x, f[1] - n.z) < 25)) final.push([n.x, n.z]); }
    final.slice(0, 34).forEach(([x, z], i) => {
      const y0 = surfaceAt(x, z) + 1.3;
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y0, z); m.castShadow = true; this.scene.add(m);
      this.ballotList.push({ x, z, y0, mesh: m, taken: false, ph: i });
    });
  }
  _beam() {
    const g = new THREE.CylinderGeometry(1, 1, 80, 24, 1, true); g.translate(0, 40, 0);
    const m = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    this.beams = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(g, m); b.visible = false; this.scene.add(b);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
      ring.position.y = 0.25; b.add(ring);
      this.beams.push(b);
    }
  }
  setBeam(target, radius = 7, extra = []) {
    const list = target ? [target, ...extra] : [];
    this.beams.forEach((b, i) => {
      const t = list[i];
      b.visible = !!t;
      if (t) { b.position.set(t.x, surfaceAt(t.x, t.z), t.z); b.scale.set(radius * (i ? 0.6 : 1), 1, radius * (i ? 0.6 : 1)); }
    });
  }

  // ---------- gameplay helpers ----------
  // run fn after `ms` of game time (pauses with the game)
  after(fn, ms) { (this.timers || (this.timers = [])).push({ t: ms / 1000, fn }); }
  _tickTimers(dt) {
    if (!this.timers || !this.timers.length) return;
    const due = [];
    this.timers = this.timers.filter(tm => { tm.t -= dt; if (tm.t <= 0) { due.push(tm.fn); return false; } return true; });
    due.forEach(f => f());
  }
  addVotes(n, msg) {
    this.votes = Math.max(0, this.votes + n); this.hud.setVotes(this.votes);
    if (msg) this.hud.toast(msg, n >= 0 ? 'good' : 'bad');
    if (n > 0) this.audio.vote(); else this.audio.bad();
    const el = $('voteNum'); el.style.transform = 'scale(1.35)'; setTimeout(() => el.style.transform = '', 150);
  }
  dialog(lines, cb) {
    this.hud.dialog(lines, cb);
  }
  earn(n, what) {
    this.money += n; this.ledger.push({ what, n, at: this.clock }); this.hud.setMoney(this.money); this.audio.coin();
    const el = $('moneyNum'); el.style.transform = 'scale(1.3)'; setTimeout(() => el.style.transform = '', 160);
  }
  spend(n, what) {
    if (this.money < n) return false;
    this.money -= n; this.ledger.push({ what, n: -n, at: this.clock }); this.hud.setMoney(this.money); this.audio.pay();
    return true;
  }
  setMusic(v) { this.settings.music = v; saveSettings(this.settings); this.audio.init(); this.audio.applyMusic(); }
  // grab the next rendered frame as a JPEG (phone camera)
  capture(cb) { this._shot = cb; }
  lockPointer() { if (this.state === 'play') lockPointer(this.renderer.domElement); }
  // M: take out the phone, turned sideways, with the map. Opened from the phone's 地圖 app, closing
  // (M / ✕ / Esc) goes back to the phone's home screen; opened with M it puts the phone away.
  openMap(src = 'key') {
    this.mapSrc = src; this.hud.toggleBig(true); document.exitPointerLock?.();
    $('bmClear')?.classList.toggle('hidden', !this.nav.target); this.audio.blip?.();
  }
  closeMap() {
    if (!this.hud.bigOpen) return;
    this.hud.toggleBig(false);
    if (this.mapSrc === 'phone') this.openPhone();
    else if (!this.input.touch && this.state === 'play') lockPointer(this.renderer.domElement);
    this.mapSrc = null;
  }
  // sleeping (bed in 彥霖's old room): only from 21:00 to 05:00, wakes up at 06:00 the next morning
  canSleep() { const m = ((this.clock % 1440) + 1440) % 1440; return m >= 21 * 60 || m < 5 * 60; }
  sleep() {
    if (this._sleeping || !this.canSleep()) return;
    this._sleeping = true; this.audio.setEngine(false, 0);
    let el = $('sleepFade');
    if (!el) { el = document.createElement('div'); el.id = 'sleepFade'; document.body.appendChild(el); }
    el.textContent = '💤 Zzz…'; el.classList.add('on');
    setTimeout(() => {
      const m = ((this.clock % 1440) + 1440) % 1440, day = Math.floor(this.clock / 1440);
      this.clock = (m >= 21 * 60 ? day + 1 : day) * 1440 + 6 * 60;
      this.hud.setClock(this.clock); el.textContent = '☀️ 隔天早上 06:00';
      setTimeout(() => {
        el.classList.remove('on'); this._sleeping = false;
        this.hud.toast('睡飽了！新的一天開始 ☀️', 'good', 2600); writeSave(this);
      }, 1700);
    }, 1300);
  }
  openPhone() {
    this.phone.show(); // sets phone.open first so losing the pointer lock doesn't pause the game
    document.exitPointerLock?.();
  }
  startSpeech(at, cb) {
    // crowd gathers and cheers
    const rnd = mulberry32(19);
    const crowd = [];
    const p = this.player.worldPos();
    if (this.player.vehicle) this.player.exit(this.scene, this.world.collision);
    this.audio.setEngine(false, 0);
    this.player.frozen = true;
    const face = Math.atan2(at.x - p.x, at.z - p.z);
    for (let i = 0; i < 22; i++) {
      const a = face + Math.PI + (rnd() - 0.5) * 2.2, r = 4 + rnd() * 6;
      const x = this.player.pos.x + Math.sin(a) * r, z = this.player.pos.z + Math.cos(a) * r;
      if (!this.world.isFree(x, z, 0.4)) continue;
      const ch = createCharacter(randomStudent(rnd));
      ch.cheerPose = rnd() < 0.5 ? 'cheer' : 'wave'; // fixed per person, not re-rolled every frame
      ch.root.position.set(x, surfaceAt(x, z), z); ch.root.rotation.y = Math.atan2(this.player.pos.x - x, this.player.pos.z - z);
      this.scene.add(ch.root); crowd.push(ch);
    }
    this.crowd = crowd;
    { const m = ((this.clock % 1440) + 1440) % 1440; if (m < 19 * 60) this.clock += 19 * 60 - m; } // the speech is at 19:00 of the day you get there
    this.speechOn = true;
    this.player.heading = face + Math.PI;
    this.rig.yaw = face; this.rig.pitch = 0.15;
    this.hud.bigToast('政見發表會', '資管要贏　票投彥霖', 2200);
    this.after(() => this.dialog(SPEECH, () => {
      this.player.setPose('peace', 3);
      this.audio.fanfare(); this.audio.cheer();
      this.addVotes(20, '全場歡呼！+20 票');
      this.after(() => { this.speechOn = false; this.player.frozen = false; cb(); }, 2600);
    }), 2200);
  }
  _clearCrowd() {
    if (!this.crowd) return;
    for (const c of this.crowd) this.scene.remove(c.root);
    this.crowd = null;
  }
  showEnding() {
    this.state = 'ending'; writeSave(this);
    this.audio.setEngine(false, 0); this.audio.ending();
    document.exitPointerLock?.();
    const t = Math.floor(this.playTime);
    $('endStats').innerHTML = `得票數 <b style="color:#ffd23f;font-size:24px">${this.votes}</b> 票<br>金色選票 ${this.ballotsTaken} / 34　·　遊玩時間 ${Math.floor(t / 60)} 分 ${t % 60} 秒`;
    $('ending').classList.remove('hidden');
  }

  // ---------- menus ----------
  _menus() {
    // one entry point: a saved game continues where it was left, otherwise the story starts
    const sv = readSave();
    if (sv) $('btnStart').innerHTML = `<span>▶ 開始遊戲</span><small>繼續上次進度 · 得票 ${sv.votes} · 選票 ${(sv.ballots || []).length}/34</small>`;
    const startGame = async () => {
      if (this._starting) return; this._starting = true;
      this.audio.init(); // music starts on this click (browsers need a gesture)
      $('title').classList.add('hidden');
      await this._splash(5000);
      $('hud').classList.remove('hidden');
      if (this.input.touch) $('touch').classList.remove('hidden');
      this.state = 'play'; this.input.enabled = true;
      // pointer lock needs a fresh click after the splash
      if (!this.input.touch && !this.prompts.pad) this.hud.toast('點一下畫面鎖定滑鼠視角', 'good', 3000);
      const d = readSave();
      if (d) {
        const m = applySave(this, d);
        this.missions.spawnNpcs(m.done ? 99 : (m.idx ?? 0));
        if (m.done) { this.missions.done = true; this.missions.free = true; this.hud.setObjective('自由探索', '收集 <b>34 張金色選票</b>，繼續發傳單拉票！'); }
        else this.missions.resumeAt(Math.max(0, m.idx ?? 0), m.prog); // right where you left off
        this.hud.toast('💾 已讀取上次的進度', 'good', 2600);
      } else { this.clock = 6 * 60; this.ledger[0].at = this.clock; this.missions.start(); } // a new game starts at 06:00
      this._checkRotate();
      // autosave
      this._saveT = 0;
      const saveNow = () => { if (this.state === 'play' || this.state === 'paused' || this.state === 'ending') writeSave(this); };
      addEventListener('pagehide', saveNow);
      document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
    };
    onClick('btnStart', () => startGame());
    onClick('btnControls', () => this.showControls());
    onClick('btnAbout', () => this.modal('關於彥霖', ABOUT_HTML));
    onClick('btnSettings', () => this.openSettings());
    onClick('videoClose', () => this.closeVideo());
    onClick('modalClose', () => this.closeModal());
    onClick('btnKeepPlaying', () => {
      $('ending').classList.add('hidden'); this.state = 'play'; this._clearCrowd(); // crowd stays for the ending shot, then goes
      this.missions.free = true; this.hud.setObjective('自由探索', '收集 <b>34 張金色選票</b>，繼續發傳單拉票！');
      if (!this.input.touch) lockPointer(this.renderer.domElement);
    });
    onClick('btnRestart', () => this._confirmClear(1, true));
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'play' && !this.hud.bigOpen && !this.input.touch && !this._modalOpen && !this.videoOpen && !this.phone?.open && !this.job?.active && !this.pc?.isOpen && !this.wardrobe?.isOpen) this.pause();
    });
  }
  // artwork + 5 s progress bar shown after pressing Start
  _splash(ms) {
    const stages = ['建立地形中', '鋪設中北路與實踐路', '種下校園的樹', '蓋資管系館與電腦教室', '炸好麥當勞的薯條', '幫 SYM JET SL 加滿油', '召喚同學與競選幹部', '印好「資管要贏 票投彥霖」傳單', '準備出發！'];
    $('loading').classList.remove('hidden');
    return new Promise(res => {
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        const ease = k < 1 ? k * (0.9 + 0.1 * Math.sin(k * 20)) : 1;
        setLoad(Math.min(1, ease), stages[Math.min(stages.length - 1, Math.floor(k * stages.length))]);
        if (k < 1) requestAnimationFrame(tick);
        else setTimeout(() => { $('loading').classList.add('hidden'); res(); }, 250);
      };
      tick();
    });
  }
  modal(title, html, sub = '') {
    $('modalTitle').innerHTML = title + (sub ? ` <small class="mh-sub">${sub}</small>` : ''); $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); this._modalOpen = true;
    $('modal').classList.toggle('wide', sub === 'CONTROLS');
  }
  // 操作說明: keyboard & mouse / gamepad / touch tabs (js/controls.js); opens on the device in use
  showControls(fromPause = false) {
    this.modal('操作說明', controlsHTML(this) + (fromPause ? '<div class="modal-btns" style="margin-top:14px"><button class="menu-btn primary" id="mBack"><span>▶ 繼續遊戲</span><small>RESUME</small></button></div>' : ''), 'CONTROLS');
    bindControls($('modalBody'));
    if (fromPause) $('mBack').onclick = () => this.closeModal();
  }
  closeModal() {
    $('modal').classList.add('hidden'); this._modalOpen = false;
    if (this.state === 'paused') this.resume();
  }
  pause() {
    this.state = 'paused';
    this.audio.setEngine(false, 0); // _update stops while paused, so silence the engine here
    const racing = this.race.state === 'count' || this.race.state === 'race';
    writeSave(this);
    this.modal(racing ? '暫停 · 新中北路障礙賽' : '暫停 · 設定', (racing ? '' : this._settingsHTML()) + `<div class="modal-btns" style="margin-top:14px">
      ${racing ? '<button class="menu-btn primary" id="mQuitRace"><span>🏳 退出比賽</span><small>QUIT RACE</small></button>' : ''}
      <button class="menu-btn ${racing ? '' : 'primary'}" id="mResume"><span>▶ ${racing ? '繼續比賽' : '繼續遊戲'}</span><small>RESUME</small></button>
      <button class="menu-btn" id="mCtrl"><span>⌨ 操作說明</span><small>CONTROLS</small></button>
      <button class="menu-btn" id="mTitle"><span>🏠 儲存並回到主畫面</span><small>SAVE &amp; QUIT</small></button>
      <button class="menu-btn danger" id="mRestart"><span>🗑 清除遊戲紀錄</span><small>DELETE SAVE</small></button></div>`);
    if (!racing) this._bindSettings();
    if (racing) $('mQuitRace').onclick = () => { this.race.abandon('你退出了比賽'); this.closeModal(); };
    $('mResume').onclick = () => this.closeModal();
    $('mCtrl').onclick = () => this.showControls(true);
    $('mTitle').onclick = () => { if (racing) this.race.abandon('你退出了比賽'); writeSave(this); this._noSave = true; location.reload(); };
    $('mRestart').onclick = () => this._confirmClear(1);
  }
  // deleting the save takes three steps: warn, ask again, then type 清除
  _confirmClear(step, fromEnding = false) {
    const back = () => { if (fromEnding) this.closeModal(); else this.pause(); };
    const lost = '得票、金色選票、零用錢、主線進度、衣服、打工／門禁／比賽紀錄、手機訊息和記事本';
    const btns = (no, yes) => `<div class="modal-btns" style="margin-top:14px"><button class="menu-btn primary" id="cNo"><span>${no}</span><small>CANCEL</small></button><button class="menu-btn danger" id="cYes"><span>${yes}</span><small>CONTINUE</small></button></div>`;
    if (step === 1) this.modal('清除遊戲紀錄（1/3）', `<p>確定要清除這台瀏覽器裡的遊戲紀錄嗎？</p><p style="color:#a9adbf">會刪除：${lost}。</p>` + btns('取消', '確定，下一步'));
    else if (step === 2) this.modal('清除遊戲紀錄（2/3）', `<p><b style="color:#ff6b6b">再確認一次：清除之後無法復原。</b></p><p style="color:#a9adbf">遊戲會從序章重新開始。</p>` + btns('不要清除', '我確定要清除'));
    else {
      this.modal('清除遊戲紀錄（3/3）', `<p>最後一步：請在下面輸入「<b>清除</b>」兩個字。</p><input id="cType" class="clear-type" autocomplete="off" spellcheck="false" placeholder="清除">` + btns('不要清除', '永久清除'));
      const inp = $('cType'), yes = $('cYes'); yes.disabled = true;
      inp.oninput = () => { yes.disabled = inp.value.trim() !== '清除'; };
      inp.onkeydown = (e) => e.stopPropagation(); // typing must not reach the game keys
      setTimeout(() => inp.focus(), 30);
    }
    $('cNo').onclick = back;
    $('cYes').onclick = () => {
      if (step < 3) { this._confirmClear(step + 1, fromEnding); return; }
      if ($('cType').value.trim() !== '清除') return;
      this._noSave = true; clearSave(); location.reload();
    };
  }
  // ---------- settings (music / volume / sensitivity) ----------
  _settingsHTML() {
    const s = this.settings;
    const opt = (v, t) => `<button data-music="${v}" class="${s.music === v ? 'on' : ''}">${t}</button>`;
    const q = (v, t) => `<button data-q="${v}" class="${(s.quality || 'auto') === v ? 'on' : ''}">${t}</button>`;
    const qNow = resolveQuality(s.quality, s);
    const fl = (v, t) => `<button data-fill="${v}" class="${(s.fill || 'on') === v ? 'on' : ''}">${t}</button>`;
    const full = !!document.fullscreenElement;
    const nv = (v, t) => `<button data-nav="${v}" class="${(s.navGround || 'on') === v ? 'on' : ''}">${t}</button>`;
    const fs = (v, t) => `<button data-full="${v}" class="${(v === 'on') === full ? 'on' : ''}">${t}</button>`;
    return `<div class="set-row"><label>🎵 背景音樂</label><div class="seg" id="setMusic">${opt('default', '預設音樂')}${opt('opera', '彥霖歌劇 🎭')}${opt('scene', '情境配樂 🎬')}${opt('off', '關閉')}</div></div>
      <div class="set-row"><label>音樂音量</label><input type="range" id="setMusicVol" min="0" max="1" step="0.05" value="${s.musicVol}"><span class="set-val" id="vMusic">${Math.round(s.musicVol * 100)}%</span></div>
      <div class="set-row"><label>音效音量</label><input type="range" id="setSfxVol" min="0" max="1" step="0.05" value="${s.sfxVol}"><span class="set-val" id="vSfx">${Math.round(s.sfxVol * 100)}%</span></div>
      <div class="set-row"><label>🐦 環境音</label><div class="seg" id="setAmb">${['on', 'off'].map(v => `<button data-amb="${v}" class="${(s.amb || 'on') === v ? 'on' : ''}">${v === 'on' ? '開' : '關'}</button>`).join('')}</div></div>
      <div class="set-row"><label>滑鼠靈敏度</label><input type="range" id="setSens" min="0.3" max="2.5" step="0.1" value="${s.sens}"><span class="set-val" id="vSens">${s.sens.toFixed(1)}</span></div>
      <div class="set-row"><label>🖼 畫質</label><div class="seg" id="setQuality">${q('auto', '自動')}${q('xlow', '超低')}${q('low', '低')}${q('medium', '中')}${q('high', '高')}</div></div>
      <div class="set-row"><label></label><small id="qNote" style="color:#a9adbf">${this._qualityNote(qNow)}</small></div>
      <div class="set-row"><label>🧭 地面導航線</label><div class="seg" id="setNav">${nv('on', '開')}${nv('off', '關')}</div></div>
      <div class="set-row"><label>🖥 全螢幕</label><div class="seg" id="setFull">${fs('on', '開')}${fs('off', '關')}</div></div>
      ${document.fullscreenEnabled ? '' : '<div class="set-row"><label></label><small style="color:#a9adbf">這個瀏覽器不支援網頁全螢幕（iPhone 可用「分享 → 加入主畫面」以全螢幕開啟）</small></div>'}
      <div class="set-row"><label>🏘 補建街區</label><div class="seg" id="setFill">${fl('on', '開')}${fl('off', '關')}</div></div>
      <div class="set-row"><label></label><small id="fNote" style="color:#a9adbf">${this._fillNote()}</small></div>`;
  }
  _bindSettings() {
    const s = this.settings, save = () => saveSettings(s);
    for (const b of document.querySelectorAll('#setMusic button')) b.onclick = () => {
      s.music = b.dataset.music; save(); this.audio.init(); this.audio.applyMusic();
      for (const o of document.querySelectorAll('#setMusic button')) o.classList.toggle('on', o === b);
    };
    $('setMusicVol').oninput = (e) => { s.musicVol = +e.target.value; $('vMusic').textContent = Math.round(s.musicVol * 100) + '%'; this.audio.applyVolumes(); save(); };
    $('setSfxVol').oninput = (e) => { s.sfxVol = +e.target.value; $('vSfx').textContent = Math.round(s.sfxVol * 100) + '%'; this.audio.applyVolumes(); this.audio.blip(); save(); };
    for (const b of document.querySelectorAll('#setAmb button')) b.onclick = () => {
      s.amb = b.dataset.amb; save(); this.audio.applyVolumes();
      for (const o of document.querySelectorAll('#setAmb button')) o.classList.toggle('on', o === b);
    };
    $('setSens').oninput = (e) => { s.sens = +e.target.value; $('vSens').textContent = s.sens.toFixed(1); save(); };
    for (const b of document.querySelectorAll('#setQuality button')) b.onclick = () => {
      s.quality = b.dataset.q; if (s.quality === 'auto') delete s.autoQ; // picking 自動 again re-detects from scratch
      save();
      for (const o of document.querySelectorAll('#setQuality button')) o.classList.toggle('on', o === b);
      const qn = resolveQuality(s.quality, s);
      // sky, shadows, bloom / colour grade and lamp lights switch now
      this.setQuality(qn);
      $('qNote').textContent = this._qualityNote(qn);
    };
    for (const b of document.querySelectorAll('#setNav button')) b.onclick = () => {
      s.navGround = b.dataset.nav; save();
      for (const o of document.querySelectorAll('#setNav button')) o.classList.toggle('on', o === b);
    };
    for (const b of document.querySelectorAll('#setFull button')) b.onclick = async () => {
      try {
        if (b.dataset.full === 'on' && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        if (b.dataset.full === 'off' && document.fullscreenElement) await document.exitFullscreen();
      } catch (e) { this.hud.toast('無法切換全螢幕（瀏覽器拒絕了）', 'bad', 2400); }
      const on = !!document.fullscreenElement;
      for (const o of document.querySelectorAll('#setFull button')) o.classList.toggle('on', (o.dataset.full === 'on') === on);
    };
    for (const b of document.querySelectorAll('#setFill button')) b.onclick = () => {
      s.fill = b.dataset.fill; save();
      for (const o of document.querySelectorAll('#setFill button')) o.classList.toggle('on', o === b);
      $('fNote').textContent = this._fillNote();
    };
  }
  _qualityNote(q) {
    // the low-quality world (no MSAA, fewer 補建 rows, smaller crowds) is chosen at load time
    const pending = (q === 'low' || q === 'xlow') !== this.lowQ || (q === 'xlow') !== this.xlowQ;
    return `目前：${Q_NAME[q]}畫質（自動＝最高用到中：內建顯示晶片、手機用低；畫面不夠順會一路往下調到超低；要高畫質請自己選「高」）` + (pending ? '・抗鋸齒與人車數量在重新整理後套用' : '');
  }
  _fillNote() {
    const on = (this.settings.fill || 'on') !== 'off', now = this.data.buildings.some(b => b.synthetic) || this.data.areas.some(a => a.synthetic);
    return (on ? '空白街區依街景／衛星判斷用途後由程式補上建物與地面（示意，不是真實建物）' : 'OSM 沒有資料的街區保持空白')
      + (on !== now ? '・重新整理後套用' : '');
  }
  openSettings() { this.audio.init(); this.modal('設定 / 音樂', this._settingsHTML()); this._bindSettings(); }
  // ---------- computer lab video ----------
  openVideo() {
    this.videoOpen = true; document.exitPointerLock?.(); this.audio.setEngine(false, 0);
    $('videoFrame').src = 'https://www.youtube-nocookie.com/embed/-AiDMXovNmA?autoplay=1&rel=0&playsinline=1';
    $('video').classList.remove('hidden'); this.audio.duck(true);
  }
  closeVideo() {
    if (!this.videoOpen) return;
    this.videoOpen = false; $('videoFrame').src = 'about:blank'; $('video').classList.add('hidden'); this.audio.duck(false);
    if (!this.input.touch && this.state === 'play') lockPointer(this.renderer.domElement);
  }
  resume() {
    this.state = 'play';
    if (!this.input.touch && !this.job?.active) lockPointer(this.renderer.domElement); // the shift panel needs a free mouse
  }
  // gamepad on screens where game input is off (title, pause / settings modal, ending, video)
  _padMenus() {
    const h = this.input.pad.hits; if (!h.size) return;
    const A = h.has(0), B = h.has(1), S = h.has(9);
    if (this._modalOpen) { if (A || B || S) this.closeModal(); return; }
    if (this.state === 'title' && !this._starting && (A || S)) { $('btnStart').click(); return; }
    if (this.state === 'ending' && (A || S)) { $('btnKeepPlaying').click(); return; }
    if (this.videoOpen && (B || S)) this.closeVideo();
    if (this.pc?.isOpen && B) this.pc.close();
    if (this.wardrobe?.isOpen && (A || B)) this.wardrobe.close();
  }
  _checkRotate() {
    $('rotateHint').classList.toggle('hidden', !(this.input && this.input.touch && innerHeight > innerWidth && this.state === 'play'));
  }

  // ---------- main loop ----------
  _loop() {
    requestAnimationFrame(() => this._loop());
    const now = performance.now();
    if (this.state === 'play') this._autoQuality(now - this.last);
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.time = (this.time || 0) + dt;
    if (this.input) { this.input.pollPad(dt); this._padMenus(); this.prompts?.tick(); }
    if (this.state === 'title') this._titleCam(dt);
    else if (this.state === 'play') this._update(dt);
    else if (this.state === 'ending') { this.rig.yaw += dt * 0.1; this.rig.update(dt, { mdx: 0, mdy: 0 }, this.player, this.world.collision, 1, this.interiors); }
    // physics (unless _update already stepped it for the vehicle you ride, see _stepPhysics)
    if (!this._physStepped) this._stepPhysics(this.state === 'play' || this.state === 'title' ? dt : 0, null);
    this._physStepped = false;
    this._updateSky(dt);
    this._vehicleLod(dt);
    this.world.update(this.time, this.night, this.clock, this.state === 'title' ? this._titlePos : this.player.worldPos());
    for (const b of this.ballotList) if (!b.taken) { b.mesh.rotation.y = this.time * 2 + b.ph; b.mesh.position.y = b.y0 + Math.sin(this.time * 3 + b.ph) * 0.15; }
    for (const b of this.beams) if (b.visible) b.material.opacity = 0.22 + Math.sin(this.time * 4) * 0.06;
    if (this._perf) this._perf.begin();
    this.post.render(dt, { night: this.night, sunset: this.skySys.sunset });
    if (this._perf) this._perf.end(now);
    if (this._shot) { const cb = this._shot; this._shot = null; cb(this.renderer.domElement.toDataURL('image/jpeg', 0.85)); }
    this.input.endFrame();
  }
  // far vehicles (> ~30 m from the camera) draw one baked mesh instead of their parts (vehicles.js lod)
  _vehicleLod(dt) {
    if ((this._lodT = (this._lodT || 0) + dt) < 0.25 || !this.traffic) return;
    this._lodT = 0;
    const c = this.camera.position;
    const each = list => { for (const v of list) v.lod?.(Math.hypot(v.mesh.position.x - c.x, v.mesh.position.y - c.y, v.mesh.position.z - c.z)); };
    each(this.vehicles); each(this.traffic.agents);
    if (this.race) each(this.race.vehicles());
  }
  // ?perf in the URL: fps, frame time, draw calls and triangles per frame (all passes) in the top-left corner,
  // so players on slow machines can send a screenshot that shows where the time goes
  _perfOverlay() {
    const r = this.renderer, el = document.createElement('div');
    Object.assign(el.style, { position: 'fixed', left: '6px', top: '6px', zIndex: 99999, font: '12px/1.35 ui-monospace,monospace', color: '#fff', background: 'rgba(0,0,0,.62)', padding: '4px 7px', borderRadius: '4px', pointerEvents: 'none', whiteSpace: 'pre' });
    document.body.appendChild(el);
    r.info.autoReset = false; // the post chain renders several passes per frame: count them all
    const P = { n: 0, ms: 0, t0: performance.now(), calls: 0, tris: 0, last: 0 };
    let gpu = '';
    try { const d = r.getContext().getExtension('WEBGL_debug_renderer_info'); gpu = d ? r.getContext().getParameter(d.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { }
    gpu = gpu.replace(/^ANGLE \((.*)\)$/, '$1').replace(/Direct3D.*$|\(0x[0-9a-f]+\)/gi, '').slice(0, 60);
    this._perf = {
      begin: () => r.info.reset(),
      end: (now) => {
        P.n++; P.calls = r.info.render.calls; P.tris = r.info.render.triangles;
        if (P.last) P.ms += now - P.last; P.last = now;
        if (now - P.t0 < 500) return;
        const fps = P.ms > 0 ? 1000 * (P.n - 1) / P.ms : 0;
        const ph = this.physics?.world;
        el.textContent = `${fps.toFixed(0)} fps  ${(P.ms / Math.max(1, P.n - 1)).toFixed(1)} ms\n繪圖呼叫 ${P.calls}  三角形 ${(P.tris / 1000).toFixed(0)}k\n畫質 ${this.quality}  WASM ${kernelsReady() ? '開' : '關'}  物理 ${ph ? `${ph.bodies.len()} 剛體 ${ph.colliders.len()} 碰撞體` : '關'}\n${gpu}`;
        P.n = 0; P.ms = 0; P.t0 = now; P.last = now;
      },
    };
  }
  _titleCam(dt) {
    this.titleT += dt;
    const t = this.world.named['鐘塔'] || { x: 0, z: 100 };
    const a = this.titleT * 0.06, ty = t.base ?? surfaceAt(t.x, t.z);
    this.camera.position.set(t.x + Math.sin(a) * 60, ty + 26 + Math.sin(a * 0.7) * 6, t.z + Math.cos(a) * 60);
    this.camera.lookAt(t.x - 10, ty + 14, t.z);
    this._titlePos = { x: t.x, z: t.z };
    this.clock = 17 * 60 + 35;
    this.traffic.update(dt, { pos: new THREE.Vector3(t.x, 0, t.z), vehicle: null }, null);
    this.peds.update(dt, { pos: new THREE.Vector3(t.x, 0, t.z) }, this.world.collision);
  }
  _update(dt) {
    const inp = this.input, pl = this.player, hud = this.hud, w = this.world;
    this.playTime += dt;
    if ((this._saveT = (this._saveT || 0) + dt) > 10) { this._saveT = 0; writeSave(this); } // autosave
    this.clock += dt / 4; // 1 game-minute per 4 seconds
    this._tickTimers(dt);
    this.phone.tick(); // Peachgram / Pcard get new posts every 30 game minutes
    hud.update(dt);
    const inDialog = hud.inDialog;
    if (inDialog && inp.hit('KeyE', 'Enter', 'NumpadEnter', 'Space', 'Mouse0', 'Tap')) { if (hud.advanceDialog()) this.audio.talk(); inp.pressed.clear(); }
    // McDonald's shift and the i-Piyan phone take the keyboard while they are up
    if (!this.job.active) this.job.update(dt, inp); // off duty: only walks the last customers out of the shop
    if (this.job.active && !inDialog) { this.job.update(dt, inp); inp.pressed.clear(); }
    else if (this.gate.active && !inDialog) { this.gate.update(dt, inp); inp.pressed.clear(); }
    else if (this.phone.open) {
      if (this.phone.update(dt, inp) === 'closed' && !this.input.touch && !hud.bigOpen) lockPointer(this.renderer.domElement);
      inp.pressed.clear();
    }
    if (inp.hit('KeyM') && !this.phone.open) { if (hud.bigOpen) this.closeMap(); else this.openMap('key'); }
    if (hud.bigOpen) { // pan with WASD / arrows / stick, Enter or A drops (or removes) the pin at the crosshair
      const v = 420 * dt / (hud._bigK || 1), bv = hud.bigView;
      if (inp.down('KeyA', 'ArrowLeft')) bv.cx -= v; if (inp.down('KeyD', 'ArrowRight')) bv.cx += v;
      if (inp.down('KeyW', 'ArrowUp')) bv.cz -= v; if (inp.down('KeyS', 'ArrowDown')) bv.cz += v;
      if (inp.hit('Enter', 'NumpadEnter')) { const t = this.nav.target, k = hud._bigK || 1; hud.onPin(t && Math.hypot((t.x - bv.cx) * k, (t.z - bv.cz) * k) < 14 ? null : { x: bv.cx, z: bv.cz }); }
    }
    if (this.videoOpen) { if (inp.hit('Escape', 'KeyE')) this.closeVideo(); inp.pressed.clear(); }
    else if (inp.hit('Escape')) { if (hud.bigOpen) this.closeMap(); else if (!this._modalOpen) { document.exitPointerLock?.(); this.pause(); return; } }
    pl.frozen = inDialog || this._sleeping || this.airdrop.cinema || this.speechOn || hud.bigOpen || this.videoOpen || this.phone.open || this.job.active || this.gate.active || this.race.locked || this.pc.isOpen || this.wardrobe.isOpen || this._modalOpen;
    this.interiors.update(dt, this);
    // ---- E actions (lift, McDonald's counter, guardhouse seat, computers) ----
    const act = !pl.vehicle && !inDialog ? this.interiors.actionAt(pl.pos.x, pl.pos.z, pl.y) : null;
    if (act && !pl.frozen && inp.hit('KeyE')) { this.audio.interact(); act.fn(this); inp.pressed.delete('KeyE'); }
    if (pl.seat && !act && inp.hit('KeyE')) { pl.standUp(); this.audio.interact(); }
    // E with nothing to interact with: take out the phone
    else if (!act && !pl.seat && !inDialog && !pl.frozen && inp.hit('KeyE')) { this.openPhone(); inp.pressed.delete('KeyE'); }

    // ---- vehicle enter / exit ----
    if (!pl.frozen && !pl.seat && !pl.tumble && pl.y < 1 && inp.hit('KeyF')) {
      if (pl.vehicle) {
        if (Math.abs(pl.vehicle.speed) < 6) { this.audio.engineStop(pl.vehicle.kind); pl.exit(this.scene, w.collision); this.audio.setEngine(false, 0); this.audio.mount(); }
        else hud.toast('先減速才能下車！', 'bad');
      } else {
        const v = this._nearestVehicle(3.2);
        if (v) {
          if (v.ai !== null && v.ai !== undefined) { this.traffic.hijack(v); this.vehicles.push(v); hud.toast(v.kind === 'scooter' ? '同學，機車借一下！' : '不好意思，借一下車！', 'bad'); }
          pl.enter(v); this.audio.mount(); this.audio.engineStart(v.kind);
          if (v.hint) { v.mesh.remove(v.hint); v.hint = null; }
          hud.setTip('🛵 駕駛', dual('<kbd>W</kbd> 油門 <kbd>S</kbd> 煞車/倒車 <kbd>A</kbd><kbd>D</kbd> 轉向<br><kbd>Space</kbd> 甩尾 <kbd>H</kbd> 喇叭 <kbd>F</kbd> 下車',
            '{RT} 油門 {LT} 煞車/倒車 {L} 轉向<br>{RB} 甩尾 {LB} 喇叭 {B} 下車'));
        }
      }
    }
    // ---- movement ----
    if (pl.vehicle) {
      const v = pl.vehicle;
      const a = pl.frozen ? { x: 0, y: 0 } : inp.axis();
      const others = [...this.traffic.vehicles(), ...this.race.vehicles(), ...this.vehicles.filter(o => o !== v && Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < 10)];
      const vin = { throttle: a.y, steer: -a.x, handbrake: !pl.frozen && inp.down('Space') };
      // a physics body (js/vehphys.js): step the physics now, so everything below sees this frame's result
      if (v.body) this._stepPhysics(dt, vin);
      else v.drive(dt, vin, w.collision, others, this._bump());
      pl.ch.update(dt, { mode: v.kind === 'scooter' ? 'ride' : 'drive' });
      // hit pedestrians (touching the vehicle body): thrown along the way the vehicle goes, a bit off to their side
      const sp = Math.abs(v.speed);
      if (sp > 3) for (const p of this.peds.active()) {
        const b = bodyGap(v, p.pos.x, p.pos.z);
        if (b.gap < 0.35 && sameLevel(p.y, v.mesh.position.y)) {
          const [fx, fz] = v.forward(), sg = Math.sign(v.speed) || 1, ox = p.pos.x - b.qx, oz = p.pos.z - b.qz, ol = Math.hypot(ox, oz) || 1;
          let dx = fx * sg + ox / ol * 0.4, dz = fz * sg + oz / ol * 0.4; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
          if (this.peds.knock(p, dx, dz, sp)) { this.audio.hitPed(); this.addVotes(-1, '撞到同學了！-1 票 😵'); v.speed *= v.kind === 'scooter' ? 0.55 : 0.8; }
        }
      }
      // a hard crash into a wall / tree / car throws you off the scooter (js/vehicles.js CRASH_THROW)
      if (v.crash && v.kind === 'scooter') { this._throwOff(v); return; }
      if (!pl.frozen && inp.hit('KeyH')) { this.audio.horn(v.kind === 'scooter' ? 1.3 : 1); this.peds.scare(v.pos.x, v.pos.z, 14); }
      this.audio.setEngine(true, Math.min(1, sp / v.maxSpeed), v.kind); this.audio.skid(v.drifting ? Math.min(1, sp / 14) : 0);
      hud.setSpeed(sp * 3.6);
      // headlight
      const [fx, fz] = v.forward();
      this.headlight.intensity = this.night * 60;
      this.headlight.position.set(v.pos.x + fx * 1.2, v.mesh.position.y + 1.1, v.pos.z + fz * 1.2);
      this.headlight.target.position.set(v.pos.x + fx * 15, surfaceAt(v.pos.x + fx * 15, v.pos.z + fz * 15), v.pos.z + fz * 15);
    } else {
      pl.updateFoot(dt, inp, this.rig.yaw, w.collision, this.interiors);
      if (pl.sfx) {
        const k = pl.sfx; pl.sfx = null;
        if (k === 'step') pl.y > 0.3 || this.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y) ? this.audio.step('in', pl.speed > 6) : this.audio.step(w.greenAt?.(pl.pos.x, pl.pos.z) ? 'grass' : 'out', pl.speed > 6);
        else if (k === 'jump') this.audio.jump();
        else if (k === 'land') this.audio.land(pl.landImpact);
      }
      // push out of vehicles
      for (const v of [...this.vehicles, ...this.traffic.vehicles()]) {
        if (Math.abs(pl.pos.x - v.pos.x) > v.hl + 1 || Math.abs(pl.pos.z - v.pos.z) > v.hl + 1) continue;
        const b = bodyGap(v, pl.pos.x, pl.pos.z), rr = v.hw + 0.35;
        if (b.gap < 0.35) { const dx = pl.pos.x - b.qx, dz = pl.pos.z - b.qz, d = Math.hypot(dx, dz); if (d > 1e-4) { pl.pos.x = b.qx + dx / d * rr; pl.pos.z = b.qz + dz / d * rr; } }
      }
      hud.setSpeed(null);
      this.headlight.intensity = 0;
      // flyer handout
      if (!pl.frozen && !pl.seat && !pl.tumble && inp.hit('Mouse0')) this._flyer();
      if (!pl.frozen && inp.hit('KeyG')) { pl.setPose('peace', 1.6); this.audio.pop(); }
    }
    this.playerLight.intensity = this.night * 6;
    const wp = pl.worldPos();
    this.playerLight.position.set(wp.x, (pl.vehicle ? pl.vehicle.mesh.position.y : surfaceAt(wp.x, wp.z) + pl.y) + 3, wp.z);

    // ---- prompts ----
    if (!pl.vehicle && !pl.frozen && !pl.tumble) {
      const v = pl.y < 1 && !pl.seat ? this._nearestVehicle(3.2) : null;
      const p = this._nearestPed(3.5);
      if (act) hud.setPrompt(act.label(this));
      else if (v) hud.setPrompt(`按 <kbd>F</kbd> ${v.ai ? '借用' : '騎上'}${v.label}`);
      else if (p && !p.voted) hud.setPrompt(`${this.input.touch ? '按 📄' : '<kbd>左鍵</kbd>'} 發傳單給同學`);
      else hud.setPrompt(null);
    } else hud.setPrompt(null);

    // ---- world sims ----
    const info = { pos: wp, vehicle: pl.vehicle, extraObstacles: [...this.vehicles.filter(v => v !== pl.vehicle && Math.hypot(v.pos.x - wp.x, v.pos.z - wp.z) < 25), ...this.race.vehicles()] };
    this.traffic.update(dt, info, this.audio);
    this.peds.update(dt, { pos: wp, vehicle: pl.vehicle }, w.collision);
    this.race.update(dt);
    this.audio.ambient(dt, { x: wp.x, z: wp.z, yaw: this.rig.yaw, night: this.night, indoor: !pl.vehicle && !!this.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y), market: w.nightMarket, crowd: this.speechOn, job: this.job.active, timed: this.missions.timer !== null || this.race.active });
    for (const n of this.npcs) { n.ch.update(dt, { speed: 0, pose: n.pose }); n.mark.position.y = 2.75 + Math.sin(this.time * 3) * 0.08; }
    if (this.crowd) for (const c of this.crowd) c.update(dt, { speed: 0, pose: this.speechOn ? c.cheerPose : null });

    // ---- ballots ----
    // every golden ballot comes back 2 minutes after it was picked up; the 34/34 set counts distinct ballots
    for (const b of this.ballotList) {
      if (b.taken) {
        b.respawn -= dt;
        if (b.respawn <= 0) { b.taken = false; b.mesh.visible = true; b.mesh.scale.setScalar(0.01); b.grow = 0; }
        continue;
      }
      if (b.grow !== undefined && b.grow < 1) { b.grow = Math.min(1, b.grow + dt * 2.5); b.mesh.scale.setScalar(Math.max(0.01, b.grow)); }
      if (Math.hypot(b.x - wp.x, b.z - wp.z) < (pl.vehicle ? 2.6 : 1.6) && pl.y < 2) {
        b.taken = true; b.mesh.visible = false; b.respawn = 120; this.audio.pickup();
        if (!b.got) {
          b.got = true; this.ballotsTaken++; hud.setBallots(this.ballotsTaken);
          this.addVotes(1, `金色選票 ${this.ballotsTaken}/34 +1 票`);
          if (this.ballotsTaken === 34) { hud.bigToast('全部收集！', '34 張金色選票 → 資管要贏 票投彥霖！'); this.audio.fanfare(); this.addVotes(34); }
        } else this.addVotes(1, '重生的金色選票 +1 票（2 分鐘後再生）');
      }
    }
    if (!this.race.active) this.missions.update(dt); // story timers wait while you race
    this.nav.update(dt);
    this.airdrop.update(dt);
    this.market.update(); // 靈感股: new trading days, 定期定額 at the open
    // ---- 彩蛋 ---- after the missions so their big toasts win this frame; while another big toast
    // (任務完成／失敗、選票) is on screen the egg waits instead of overwriting it or being lost
    const btBusy = !$('bigToast').classList.contains('hidden');
    for (const e of this.eggs) {
      if (e.found || btBusy || Math.hypot(e.x - wp.x, e.z - wp.z) > e.r) continue;
      e.found = true; hud.bigToast(e.title, e.text, 4200); this.audio.pickup();
    }
    // ---- camera & hud ----
    this.rig.update(dt, hud.bigOpen ? { mdx: 0, mdy: 0 } : inp, pl, w.collision, this.settings.sens, this.interiors);
    if (this.job.active) this.job.camera(this.camera, dt); // over-the-shoulder shot of the counter
    else if (this.gate.active) this.gate.camera(this.camera, dt); // booth view of the barrier
    if (this.airdrop.cinema) this.airdrop.camera(this.camera, dt); // 呼叫載具 film
    hud.setClock(this.clock);
    const markers = [...this.missions.markers, ...this.race.markers()];
    if (this.interiors.yh) { const d = this.interiors.yh.door; markers.push({ x: d[0], z: d[1], icon: '🏠', color: '#ff8fb1', label: '彥霖的家', near: 120 }); }
    // side quest: 新中北路側門門禁 (always on the map)
    if (!this.gate.active) for (const gq of Object.values(this.interiors.gates || {})) { const [gx, gz] = gq.k.w(gq.W / 2, gq.D / 2); markers.push({ x: gx, z: gz, icon: '🚧', color: '#ff9f0a' }); }
    const range = pl.vehicle ? 170 : 110;
    hud.drawMinimap(wp.x, wp.z, this.rig.yaw, pl.worldHeading(), range, markers, this.ballotList);
    hud.drawBig(wp.x, wp.z, pl.worldHeading(), markers, this.ballotList);
    if ((this._locT = (this._locT || 0) - dt) <= 0) {
      this._locT = 0.5;
      const zn = !pl.vehicle && this.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y);
      hud.setLocation(zn ? (zn.floorOf ? `${zn.name} ${zn.floorOf(pl.y)}F` : zn.name) : hud.locationName(wp.x, wp.z));
      for (const v of this.vehicles) v.mesh.visible = v === pl.vehicle || Math.hypot(v.pos.x - wp.x, v.pos.z - wp.z) < 160 * (this.viewK ?? 1);
    }
    // tip box fades after a while on foot
    if (!pl.vehicle && !this.job.active && this._tipMode !== 'foot') { this._tipMode = 'foot'; hud.setTip('🎮 移動', dual('<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走路 · 滑鼠 視角 · <kbd>Shift</kbd> 衝刺 · <kbd>Space</kbd> 跳<br><kbd>F</kbd> 上車 · <kbd>E</kbd> 互動／📱手機 · <kbd>左鍵</kbd> 發傳單 · <kbd>G</kbd> ✌ · <kbd>M</kbd> 地圖 · <kbd>Esc</kbd> 設定',
      '{L} 走路 · {R} 視角 · {LS} 衝刺 · {RB} 跳<br>{B} 上車 · {A} 互動／📱手機 · {X} 發傳單 · {Y} ✌ · {View} 地圖 · {Menu} 設定')); }
    if (pl.vehicle) this._tipMode = 'car';
  }
  _bump() { return this._onBump || (this._onBump = (imp) => { this.audio.bump(imp / 3, this.player.vehicle?.kind); this.rig.cur.y += Math.min(0.3, imp * 0.02); }); }
  // one frame of physics: the ridden vehicle's input, the stand-ins, the steps, then the ridden vehicle's
  // position / mesh / hits written back. Called from _update while you ride a physics body (so the rest of
  // _update sees this frame's result), otherwise from _loop.
  _stepPhysics(dt, inp) {
    const ch = this.state === 'play' ? this.player.vehicle?.body : null;
    if (ch) ch.latch(inp);
    if (this.state === 'play') this._physMovers(dt);
    this.physics.update(dt);
    if (ch) ch.frame(dt, this._bump());
    this._physStepped = true;
  }
  // physics stand-ins (js/physics.js movers): your vehicle (unless it has a body of its own) or you on foot,
  // traffic and race rivals near you push cones, barriers and knocked vehicles out of the way; while you ride
  // a physics body, the parked vehicles around you stand still in its way (and can be knocked)
  _physMovers(dt) {
    const P = this.physics; if (!P.ready) return;
    const pl = this.player, wp = pl.worldPos(), list = [], pv = pl.vehicle;
    // boxes from 5 cm above the ground: a scooter (with its rider's legs) 0.9 m tall, a car 1.5 m
    const veh = v => list.push({ key: v, x: v.pos.x, y: v.mesh.position.y, z: v.pos.z, yaw: v.heading, r: v.hw, hl: v.hl, ...(v.kind === 'scooter' ? { cy: 0.5, hh: 0.45 } : { cy: 0.8, hh: 0.75 }) });
    if (pv) { if (!pv.body) veh(pv); }
    else if (!pl.seat) list.push({ key: pl, x: pl.pos.x, y: pl.pos.y, z: pl.pos.z, yaw: 0, r: 0.3, hl: 0, cy: 0.9, group: G.CHAR });
    for (const v of [...this.traffic.vehicles(), ...this.race.vehicles()]) if (v !== pv && !v.knocked && Math.abs(v.pos.x - wp.x) < 60 && Math.abs(v.pos.z - wp.z) < 60 && v.mesh.visible !== false) veh(v);
    if (pv?.body) {
      const near = [];
      for (const o of this.vehicles) {
        if (o === pv || o.driver || o.knocked || o.ai || o.racer || o === this.airdrop.run?.v) continue; // (not while it hangs from the helicopter)
        const d = Math.hypot(o.pos.x - wp.x, o.pos.z - wp.z);
        if (d < 20) near.push([d, o]);
      }
      near.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < Math.min(12, near.length); i++) veh(near[i][1]);
    }
    P.movers(list, dt);
    P.focus = wp;
  }
  // a parked vehicle hit hard (js/vehicles.js KNOCK_MIN): thrown by physics until it rests. Momentum of the
  // hitter (with its rider) against the parked one decides how hard; returns the factor the hitter's speed keeps
  _knockVehicle(o, by, nx, nz, impact) {
    const m1 = vmass(by) + 70, m2 = vmass(o), dv = (1 + KNOCK_E) * m1 / (m1 + m2) * impact;
    if (dv < 1) return false; // a scooter nudging a car: the usual push
    if (!this._throwVehicle(o, -nx * dv, -nz * dv, dv, null)) return false;
    if (by === this.player.vehicle) this.audio.bump(Math.min(3, dv / 3), by.kind);
    return Math.max(0, (m1 - KNOCK_E * m2) / (m1 + m2));
  }
  // a traffic vehicle hit hard: thrown too (with its own speed), then back on its lane when it lands on its
  // wheels next to it, otherwise a wreck for a while (js/npc.js Traffic)
  // impact: the closing speed of the two
  _knockTraffic(o, by, nx, nz, impact) {
    if (!this.physics.ready || o.knocked || o.ai?.dormant || impact <= 5) return;
    const m1 = vmass(by) + (by.kind === 'scooter' ? 70 : 0), m2 = vmass(o) + (o.rider ? 70 : 0), dv = (1 + KNOCK_E) * m1 / (m1 + m2) * impact;
    if (dv < 1.5) return;
    const [fx, fz] = o.forward();
    if (o.rider) o.rider.root.visible = false; // the rider is thrown off (P4: a ragdoll)
    if (!this._throwVehicle(o, fx * o.speed - nx * dv, fz * o.speed - nz * dv, dv, (p, up) => this.traffic.landed(o, p, up))) { if (o.rider) o.rider.root.visible = true; return; }
    if (by === this.player.vehicle) this.audio.bump(Math.min(3, dv / 3), by.kind);
  }
  // hand vehicle o to physics as a thrown body (velocity vx, vz; dv: how hard, for the tumble) until it rests;
  // then upright on its wheels on the level it landed on, a scooter lying on its side if it fell over.
  // done(pos, upY) after that (traffic); returns false without physics
  _throwVehicle(o, vx, vz, dv, done) {
    const P = this.physics; if (!P.ready) return false;
    const sc = o.kind === 'scooter', l = Math.hypot(vx, vz) || 1, dx = vx / l, dz = vz / l;
    // tip over the far side: spin about the horizontal axis across the push (stronger for a tall, light scooter)
    const sp = dv * (sc ? 1.1 : 0.12);
    const shape = sc ? { shape: 'box', hx: 0.3, hy: 0.5, hz: 0.88 } : { shape: 'box', hx: 0.9, hy: 0.7, hz: 2.15, cy: 0.75 };
    P.dropMover(o); // its stand-in (parked next to a physics vehicle, traffic)
    const f = new THREE.Vector3();
    const heading = q => { f.set(0, 0, 1).applyQuaternion(q); return Math.atan2(f.x, f.z); };
    o.knocked = true;
    const rec = P.knock(o.mesh, shape, vmass(o), { x: vx, y: sc ? 1.2 : 0.3, z: vz }, { x: dz * sp, y: (o.id % 2 ? 0.12 : -0.12) * dv, z: -dx * sp },
      (p, q) => { o.pos.x = p.x; o.pos.z = p.z; o.heading = o.moveAng = heading(q); },
      (p, q) => {
        f.set(0, 1, 0).applyQuaternion(q); const up = f.y;
        o.knocked = false; o.pos.set(p.x, 0, p.z); o.heading = o.moveAng = heading(q); o.speed = 0;
        if (sc) o.fallen = up < 0.6;
        o.hf = o.hb = p.y; // stays on the level it landed on (not the top one)
        o.resolveBody(this.world.collision); o.sync();
        done?.(p, up);
      }, o);
    if (!rec) { o.knocked = false; return false; }
    o.speed = 0;
    return true;
  }
  _nearestVehicle(r) {
    const p = this.player.pos; let best = null, bd = r;
    for (const v of [...this.vehicles, ...this.traffic.vehicles()]) {
      const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z) - (v.kind === 'scooter' ? 0 : 1);
      if (d < bd && !v.knocked && (!v.ai || Math.abs(v.speed) < 8)) { bd = d; best = v; }
    }
    return best;
  }
  // crash: the rider goes on over the handlebars, glancing off what was hit, tumbles and lies
  // there a moment; the scooter drops on its side where it stopped (ride it again with F)
  _throwOff(v) {
    const pl = this.player, c = v.crash, s = c.speed, [fx, fz] = v.forward();
    this.audio.engineStop(v.kind); this.audio.setEngine(false, 0); this.audio.skid(0); this.audio.bump(2.5);
    pl.exit(this.scene, this.world.collision);
    const y = v.mesh.position.y;
    pl.pos.set(v.pos.x + fx * 0.3, y, v.pos.z + fz * 0.3); pl.heading = v.heading;
    v.speed = 0; v.fallen = true; v.sync();
    const d = fx * c.nx + fz * c.nz, k = s * 0.45;
    pl.throwOff((fx - 1.2 * d * c.nx) * k, (fz - 1.2 * d * c.nz) * k, 3 + s * 0.22, 2.2);
    this.hud.setSpeed(null); this.headlight.intensity = 0;
    this.hud.toast(`摔車了！😵（撞擊時速 ${Math.round(c.impact * 3.6)} km/h）`, 'bad', 2600);
  }
  _nearestPed(r) {
    const p = this.player.pos; let best = null, bd = r;
    for (const q of this.peds.active()) { if (q.state === 'down' || !sameLevel(q.y, p.y)) continue; const d = Math.hypot(q.pos.x - p.x, q.pos.z - p.z); if (d < bd) { bd = d; best = q; } }
    return best;
  }
  _flyer() {
    const p = this._nearestPed(3.5);
    this.player.setPose('give', 0.5); this.audio.paper();
    if (!p) { this.hud.toast('附近沒有同學可以發傳單', 'bad', 1000); return; }
    p.heading = Math.atan2(this.player.pos.x - p.pos.x, this.player.pos.z - p.pos.z);
    this.player.heading = Math.atan2(p.pos.x - this.player.pos.x, p.pos.z - this.player.pos.z);
    const r = this.peds.giveFlyer(p);
    if (r.ok) { this.flyerVotes = (this.flyerVotes || 0) + 1; this.addVotes(1, `「${r.text}」 +1 票`); }
    else { this.hud.toast(`「${r.text}」`, 'bad', 1500); }
  }
}

const ABOUT_HTML = `<div class="about">
<p><b style="font-size:20px;color:#ffd23f">彥霖 Yanlin</b>　第34屆 中原大學 資訊管理學系 系學會會長候選人</p>
<p style="font-size:20px;font-weight:900">資管要贏　票投彥霖</p>
<p>《中原順起來》是彥霖的競選宣傳小遊戲。整個地圖依照真實的中原大學與周邊街區（中北路、實踐路、新中北路、中原夜市）搭建，建築位置與高度來自 OpenStreetMap。</p>
<p>在遊戲裡，你就是彥霖：</p>
<ul><li>騎著粉白色 SYM JET SL 穿梭校園送傳單</li><li>走進資管系館上樓、進教室，用電腦教室的電腦上網、玩踩地雷</li><li>去活動中心的麥當勞點餐，或從櫃台後面的員工入口打工值班、幫同學出餐賺錢拉票</li><li>坐進警衛室值班</li><li>一早衝去中原夜市那條街買早餐</li><li>對路上的同學發傳單拉票</li><li>在學生活動中心發表政見</li></ul>
<p>真實的投票日，資管要贏，票投 <b style="color:#ffd23f">彥霖</b> 🗳✌</p>
<p style="color:#a9adbf;font-size:12px">地圖資料 © OpenStreetMap contributors，依 ODbL 授權使用。<br>地形資料：內政部 20m 網格數值地形模型（政府資料開放授權條款第1版）。</p></div>`;

window.game = new Game();
window.game.init().catch(e => { console.error(e); $('loadText').textContent = '載入失敗：' + e.message; });
