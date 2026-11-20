import * as THREE from 'three';
import { buildWorld, buildSkyline, mulberry32, makeLabel } from './map.js';
import { Vehicle } from './vehicles.js';
import { Traffic, Peds } from './npc.js';
import { Player, CameraRig } from './player.js';
import { Input } from './input.js';
import { Audio, loadSettings, saveSettings } from './audio.js';
import { buildInteriors, imFootprint, sacTrimmedPts, MCD_SPEC, GUARD_SPECS, guardFootprint } from './interiors.js';
import { HUD } from './hud.js';
import { Missions, SPEECH } from './missions.js';
import { createCharacter, randomStudent } from './character.js';
import { pointInPoly } from './collision.js';
import { loadTerrain, surfaceAt } from './terrain.js';

const $ = id => document.getElementById(id);
const setLoad = (p, t) => { $('loadFill').style.width = (p * 100) + '%'; $('loadText').textContent = `${t || '載入中 LOADING'} · ${Math.round(p * 100)}%`; };
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const lerp = (a, b, t) => a + (b - a) * t;
const lockPointer = el => { try { const r = el.requestPointerLock?.(); if (r && r.catch) r.catch(() => { }); } catch (e) { } };
const cLerp = (a, b, t) => a.clone().lerp(b, t);
const DAY_FOG = new THREE.Color('#b9c4cc'), GREY = new THREE.Color('#888');
const isTouch = () => matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);
const qualityLow = q => q === 'low' || (q !== 'high' && isTouch());

class Game {
  async init() {
    setLoad(0.02, '載入地圖資料');
    // terrain is optional: without data/terrain.json the world stays flat
    const [data, terrain] = await Promise.all([
      fetch('data/cycu.json').then(r => r.json()),
      fetch('data/terrain.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    loadTerrain(terrain);
    this.data = data;
    // custom-built enterable buildings replace these OSM footprints
    for (const b of data.buildings) {
      if (b.name === '資訊管理學系') { b.skip = true; b.labelH = 13.5; }
      if (b.name === '警衛室') b.skip = true;
      if (b.name === '學生活動中心') b.pts = sacTrimmedPts();
    }
    const M = MCD_SPEC;
    const reserved = [imFootprint(), [[M.x0, M.z0], [M.x1 + 5, M.z0], [M.x1 + 5, M.z1 + 2], [M.x0, M.z1 + 2]], ...GUARD_SPECS(data).map(guardFootprint)];
    // street furniture keeps clear of the guardhouse boom barriers and the spawn
    const keep = [];
    for (const s of GUARD_SPECS(data)) {
      const c = Math.cos(s.ang), sn = Math.sin(s.ang), w = (x, z) => ({ x: s.x + x * c - z * sn, z: s.z + x * sn + z * c });
      keep.push({ ...w(4.2, 3.6), r: 3 }, { ...w(6.7, 3.6), r: 4.5 });
    }
    { const g = data.pois.find(p => p.name === '舊校門') || { x: -231, z: 39 }; keep.push({ x: g.x, z: g.z, r: 18 }); }
    this.settings = loadSettings();
    // quality: 'auto' picks low on touch devices; MSAA can only change with a new renderer (reload)
    this.lowQ = qualityLow(this.settings.quality);
    // renderer
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowQ, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, this.lowQ ? 1 : 1.6));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true; r.shadowMap.type = this.lowQ ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.domElement.id = 'game';
    document.getElementById('app').prepend(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 2600);
    // rAF stops in background tabs but the WebAudio engine drone would keep humming
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.audio?.setEngine(false, 0); });
    addEventListener('resize', () => { r.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this._checkRotate(); });

    this._sky();
    await nextFrame();
    setLoad(0.08, '搭建中原大學');
    this.world = buildWorld(this.scene, data, p => setLoad(0.08 + p * 0.7, '搭建中原大學'), { reserved, keep, low: this.lowQ });
    this.skyline = buildSkyline(this.scene, this.lowQ ? 70 : 180);
    setLoad(0.78, '蓋資管系館、麥當勞、警衛室');
    await nextFrame();
    this.interiors = buildInteriors(this.scene, data, this.world.collision);
    await nextFrame();
    setLoad(0.8, '召喚同學與機車');
    this.input = new Input(this.renderer.domElement);
    this.audio = new Audio(this.settings);
    this.hud = new HUD(this.world);
    this.player = new Player(this.scene);
    this.rig = new CameraRig(this.camera);
    this.traffic = new Traffic(this.scene, this.world, this.lowQ ? 14 : 26);
    this.peds = new Peds(this.scene, this.world, this.lowQ ? 18 : 32);
    this.vehicles = []; this.npcs = [];
    this.votes = 0; this.ballotsTaken = 0; this.clock = 17 * 60 + 20; this.playTime = 0;
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
    this._ballots();
    this._beam();
    // start position: inside the old campus gate (舊校門)
    const gate = data.pois.find(p => p.name === '舊校門') || { x: -231, z: 39 };
    const im = this.world.named['資訊管理學系'];
    const near = this.world.nearestRoadPoint(gate.x + 6, gate.z + 2);
    const sx = near ? near.x : gate.x + 6, sz = near ? near.z : gate.z;
    this.player.place(sx, sz, Math.atan2(im.x - sx, im.z - sz));
    this.rig.yaw = this.player.heading;
    this.myScooter = this.spawnScooterNear(sx, sz, false, true);
    setLoad(0.95, '準備出發');
    this.missions = new Missions(this);
    // warm up a frame so shaders compile behind the loading screen
    this.renderer.compile(this.scene, this.camera);
    this._menus();
    this.last = performance.now();
    this.state = 'title';
    this.titleT = 0;
    setLoad(1, '完成');
    $('loading').classList.add('hidden'); $('title').classList.remove('hidden');
    this._loop();
  }

  // ---------- sky & lighting ----------
  _sky() {
    const geo = new THREE.SphereGeometry(2200, 32, 16);
    this.skyU = { top: { value: new THREE.Color('#3b4a8a') }, hor: { value: new THREE.Color('#ff9a5a') }, sunDir: { value: new THREE.Vector3(0, 0.1, -1) }, sunCol: { value: new THREE.Color('#ffd0a0') }, night: { value: 0 }, fogc: { value: new THREE.Color('#b9c4cc') } };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; uniform vec3 fogc; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main(){ float y = max(vP.y, 0.0); vec3 c = mix(hor, top, pow(y, 0.55));
          float s = max(dot(normalize(vP), normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 600.0)*3.0 + pow(s, 12.0)*0.35) * (1.0-night);
          vec3 q = floor(vP*380.0); float st = step(0.9975, h(q)) * night * smoothstep(0.05,0.4,y);
          c += vec3(st);
          // below the horizon: the fog colour as lit materials show it (tone mapped + sRGB)
          vec3 fo = linearToOutputTexel(vec4(toneMapping(fogc), 1.0)).rgb;
          if (vP.y < 0.0) c = fo; else c = mix(fo, c, smoothstep(0.0, 0.04, vP.y));
          gl_FragColor = vec4(c,1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, mat); this.scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight('#bcd4ff', '#5a5040', 1.0); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffd7a8', 2.2);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(this.lowQ ? 1024 : 2048, this.lowQ ? 1024 : 2048);
    const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.scene.fog = new THREE.Fog('#c08a70', 160, 900);
    // player vehicle headlight
    this.headlight = new THREE.SpotLight('#fff1d0', 0, 60, 0.55, 0.5, 1.2);
    this.scene.add(this.headlight, this.headlight.target);
    this.playerLight = new THREE.PointLight('#ffd9a0', 0, 18, 1.5); this.scene.add(this.playerLight);
  }
  _updateSky(dt) {
    // keep the sky dome centred on the camera; at the map edge the far side was beyond camera.far and rendered black
    this.sky.position.copy(this.camera.position);
    const m = this.clock % 1440;
    // night factor
    let night;
    if (m < 300) night = 1; else if (m < 420) night = 1 - (m - 300) / 120; else if (m < 1020) night = 0; else if (m < 1140) night = (m - 1020) / 120; else night = 1;
    night = night * night * (3 - 2 * night);
    this.night = night;
    const dayAng = (m - 360) / 720 * Math.PI; // 6:00 -> 0, 12:00 -> pi/2, 18:00 -> pi
    const elev = Math.sin(dayAng);
    const sunDir = new THREE.Vector3(Math.cos(dayAng) * -0.8, Math.max(elev, -0.2), -0.45).normalize();
    // palette: day / sunset / night
    const sunset = Math.max(0, 1 - Math.abs(elev) / 0.35) * (1 - night * 0.6);
    const D = { top: new THREE.Color('#4f93dc'), hor: new THREE.Color('#cfe4f3') };
    const S = { top: new THREE.Color('#38427e'), hor: new THREE.Color('#ff9658') };
    const N = { top: new THREE.Color('#050916'), hor: new THREE.Color('#1b2140') };
    let top = cLerp(D.top, S.top, sunset), hor = cLerp(D.hor, S.hor, sunset);
    top = cLerp(top, N.top, night); hor = cLerp(hor, N.hor, night);
    this.skyU.top.value.copy(top); this.skyU.hor.value.copy(hor); this.skyU.sunDir.value.copy(sunDir); this.skyU.night.value = night;
    // grey-blue daytime haze (#b9c4cc), sky-tinted at dusk and night
    this.scene.fog.color.copy(hor).lerp(GREY, 0.15).lerp(DAY_FOG, (1 - Math.max(sunset, night)) * 0.85);
    this.skyU.fogc.value.copy(this.scene.fog.color);
    if (this.skyline) {
      const cp = this.camera.position, gy0 = surfaceAt(cp.x, cp.z);
      // backdrop only reads right from street height; from high above it floats
      this.skyline.visible = cp.y - gy0 < 80;
      if (this.skyline.visible) {
        this.skyline.position.set(cp.x, gy0, cp.z);
        this.skyline.userData.update(this.scene.fog.color);
      }
    }
    const p = this.player.worldPos();
    const ld = elev > 0.05 ? sunDir : new THREE.Vector3(0.3, 0.8, 0.4).normalize(); // moonlight
    const gy = surfaceAt(p.x, p.z);
    this.sun.position.set(p.x + ld.x * 150, gy + ld.y * 150, p.z + ld.z * 150);
    this.sun.target.position.set(p.x, gy, p.z);
    this.sun.intensity = elev > 0.05 ? lerp(0.6, 2.6, Math.min(1, elev * 2)) * (1 - night * 0.8) : 0.35 * night + 0.1;
    this.sun.color.set(elev > 0.05 ? (sunset > 0.4 ? '#ffb27a' : '#fff1de') : '#9fb4ff');
    this.hemi.intensity = lerp(1.05, 0.6, night);
    this.hemi.color.set(night > 0.5 ? '#6f86c8' : '#bcd4ff');
    this.renderer.toneMappingExposure = lerp(1.05, 1.25, night);
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
    for (const a of this.data.areas) {
      if (a.kind !== 'parking' || this.vehicles.length > 60) continue;
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
        placed++;
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
    this.clock = Math.max(this.clock, 19 * 60);
    this.speechOn = true;
    this.player.heading = face + Math.PI;
    this.rig.yaw = face; this.rig.pitch = 0.15;
    this.hud.bigToast('政見發表會', '資管要贏　票投彥霖', 2200);
    this.after(() => this.dialog(SPEECH, () => {
      this.player.setPose('peace', 3);
      this.audio.fanfare();
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
    this.state = 'ending';
    this.audio.setEngine(false, 0);
    document.exitPointerLock?.();
    const t = Math.floor(this.playTime);
    $('endStats').innerHTML = `得票數 <b style="color:#ffd23f;font-size:24px">${this.votes}</b> 票<br>金色選票 ${this.ballotsTaken} / 34　·　遊玩時間 ${Math.floor(t / 60)} 分 ${t % 60} 秒`;
    $('ending').classList.remove('hidden');
  }

  // ---------- menus ----------
  _menus() {
    const startGame = async (free) => {
      if (this._starting) return; this._starting = true;
      this.audio.init(); // music starts on this click (browsers need a gesture)
      $('title').classList.add('hidden');
      await this._splash(5000);
      $('hud').classList.remove('hidden');
      if (this.input.touch) $('touch').classList.remove('hidden');
      this.state = 'play'; this.input.enabled = true;
      // pointer lock needs a fresh click after the splash
      if (!this.input.touch) this.hud.toast('點一下畫面鎖定滑鼠視角', 'good', 3000);
      this.missions.start(free);
      this._checkRotate();
    };
    $('btnStart').onclick = () => startGame(false);
    $('btnFree').onclick = () => startGame(true);
    $('btnControls').onclick = () => this.modal('操作說明', CONTROLS_HTML);
    $('btnAbout').onclick = () => this.modal('關於彥霖', ABOUT_HTML);
    $('btnSettings').onclick = () => this.openSettings();
    $('videoClose').onclick = () => this.closeVideo();
    $('modalClose').onclick = () => this.closeModal();
    $('btnKeepPlaying').onclick = () => {
      $('ending').classList.add('hidden'); this.state = 'play'; this._clearCrowd(); // crowd stays for the ending shot, then goes
      this.missions.free = true; this.hud.setObjective('自由探索', '收集 <b>34 張金色選票</b>，繼續發傳單拉票！');
      if (!this.input.touch) lockPointer(this.renderer.domElement);
    };
    $('btnRestart').onclick = () => location.reload();
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'play' && !this.hud.bigOpen && !this.input.touch && !this._modalOpen && !this.videoOpen) this.pause();
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
  modal(title, html) {
    $('modalTitle').textContent = title; $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); this._modalOpen = true;
  }
  closeModal() {
    $('modal').classList.add('hidden'); this._modalOpen = false;
    if (this.state === 'paused') this.resume();
  }
  pause() {
    this.state = 'paused';
    this.audio.setEngine(false, 0); // _update stops while paused, so silence the engine here
    this.modal('暫停 · 設定', this._settingsHTML() + `<div class="modal-btns" style="margin-top:14px">
      <button class="menu-btn primary" id="mResume"><span>▶ 繼續遊戲</span><small>RESUME</small></button>
      <button class="menu-btn" id="mCtrl"><span>⌨ 操作說明</span><small>CONTROLS</small></button>
      <button class="menu-btn" id="mRestart"><span>↻ 重新開始</span><small>RESTART</small></button></div>`);
    this._bindSettings();
    $('mResume').onclick = () => this.closeModal();
    $('mCtrl').onclick = () => { $('modalBody').innerHTML = CONTROLS_HTML + '<br><button class="menu-btn primary" id="mBack"><span>▶ 繼續遊戲</span><small>RESUME</small></button>'; $('mBack').onclick = () => this.closeModal(); };
    $('mRestart').onclick = () => location.reload();
  }
  // ---------- settings (music / volume / sensitivity) ----------
  _settingsHTML() {
    const s = this.settings;
    const opt = (v, t) => `<button data-music="${v}" class="${s.music === v ? 'on' : ''}">${t}</button>`;
    const q = (v, t) => `<button data-q="${v}" class="${(s.quality || 'auto') === v ? 'on' : ''}">${t}</button>`;
    return `<div class="set-row"><label>🎵 背景音樂</label><div class="seg" id="setMusic">${opt('default', '預設音樂')}${opt('opera', '彥霖歌劇 🎭')}${opt('off', '關閉')}</div></div>
      <div class="set-row"><label>音樂音量</label><input type="range" id="setMusicVol" min="0" max="1" step="0.05" value="${s.musicVol}"><span class="set-val" id="vMusic">${Math.round(s.musicVol * 100)}%</span></div>
      <div class="set-row"><label>音效音量</label><input type="range" id="setSfxVol" min="0" max="1" step="0.05" value="${s.sfxVol}"><span class="set-val" id="vSfx">${Math.round(s.sfxVol * 100)}%</span></div>
      <div class="set-row"><label>滑鼠靈敏度</label><input type="range" id="setSens" min="0.3" max="2.5" step="0.1" value="${s.sens}"><span class="set-val" id="vSens">${s.sens.toFixed(1)}</span></div>
      <div class="set-row"><label>🖼 畫質</label><div class="seg" id="setQuality">${q('auto', '自動')}${q('high', '高')}${q('low', '低')}</div></div>
      <div class="set-row"><label></label><small id="qNote" style="color:#a9adbf">目前：${this.lowQ ? '低' : '高'}畫質（自動＝觸控裝置用低畫質）${qualityLow(s.quality) !== this.lowQ ? '・重新整理後套用' : ''}</small></div>`;
  }
  _bindSettings() {
    const s = this.settings, save = () => saveSettings(s);
    for (const b of document.querySelectorAll('#setMusic button')) b.onclick = () => {
      s.music = b.dataset.music; save(); this.audio.init(); this.audio.applyMusic();
      for (const o of document.querySelectorAll('#setMusic button')) o.classList.toggle('on', o === b);
    };
    $('setMusicVol').oninput = (e) => { s.musicVol = +e.target.value; $('vMusic').textContent = Math.round(s.musicVol * 100) + '%'; this.audio.applyVolumes(); save(); };
    $('setSfxVol').oninput = (e) => { s.sfxVol = +e.target.value; $('vSfx').textContent = Math.round(s.sfxVol * 100) + '%'; this.audio.applyVolumes(); this.audio.blip(); save(); };
    $('setSens').oninput = (e) => { s.sens = +e.target.value; $('vSens').textContent = s.sens.toFixed(1); save(); };
    for (const b of document.querySelectorAll('#setQuality button')) b.onclick = () => {
      s.quality = b.dataset.q; save();
      for (const o of document.querySelectorAll('#setQuality button')) o.classList.toggle('on', o === b);
      const low = qualityLow(s.quality);
      // pixel ratio applies now; MSAA, shadows and crowd sizes need a reload
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.6));
      $('qNote').textContent = low === this.lowQ ? `目前：${low ? '低' : '高'}畫質（自動＝觸控裝置用低畫質）` : `已存檔：${low ? '低' : '高'}畫質，陰影與抗鋸齒在重新整理後套用`;
    };
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
    if (!this.input.touch) lockPointer(this.renderer.domElement);
  }
  _checkRotate() {
    $('rotateHint').classList.toggle('hidden', !(this.input && this.input.touch && innerHeight > innerWidth && this.state === 'play'));
  }

  // ---------- main loop ----------
  _loop() {
    requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.time = (this.time || 0) + dt;
    if (this.state === 'title') this._titleCam(dt);
    else if (this.state === 'play') this._update(dt);
    else if (this.state === 'ending') { this.rig.yaw += dt * 0.1; this.rig.update(dt, { mdx: 0, mdy: 0 }, this.player, this.world.collision, 1, this.interiors); }
    this._updateSky(dt);
    this.world.update(this.time, this.night, this.clock, this.state === 'title' ? this._titlePos : this.player.worldPos());
    for (const b of this.ballotList) if (!b.taken) { b.mesh.rotation.y = this.time * 2 + b.ph; b.mesh.position.y = b.y0 + Math.sin(this.time * 3 + b.ph) * 0.15; }
    for (const b of this.beams) if (b.visible) b.material.opacity = 0.22 + Math.sin(this.time * 4) * 0.06;
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
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
    this.clock += dt / 4; // 1 game-minute per 4 seconds
    this._tickTimers(dt);
    hud.update(dt);
    const inDialog = hud.inDialog;
    if (inDialog && inp.hit('KeyE', 'Enter', 'Space', 'Mouse0')) { hud.advanceDialog(); inp.pressed.clear(); }
    if (inp.hit('KeyM')) hud.toggleBig();
    if (this.videoOpen) { if (inp.hit('Escape', 'KeyE')) this.closeVideo(); inp.pressed.clear(); }
    else if (inp.hit('Escape')) { if (hud.bigOpen) hud.toggleBig(false); else if (!this._modalOpen) { document.exitPointerLock?.(); this.pause(); return; } }
    pl.frozen = inDialog || this.speechOn || hud.bigOpen || this.videoOpen;
    this.interiors.update(dt, this);
    // ---- E actions (lift, McDonald's counter, guardhouse seat, computers) ----
    const act = !pl.vehicle && !inDialog ? this.interiors.actionAt(pl.pos.x, pl.pos.z, pl.y) : null;
    if (act && !pl.frozen && inp.hit('KeyE')) { act.fn(this); inp.pressed.delete('KeyE'); }
    if (pl.seat && !act && inp.hit('KeyE')) pl.standUp();

    // ---- vehicle enter / exit ----
    if (!pl.frozen && !pl.seat && pl.y < 1 && inp.hit('KeyF')) {
      if (pl.vehicle) {
        if (Math.abs(pl.vehicle.speed) < 6) { pl.exit(this.scene, w.collision); this.audio.setEngine(false, 0); }
        else hud.toast('先減速才能下車！', 'bad');
      } else {
        const v = this._nearestVehicle(3.2);
        if (v) {
          if (v.ai !== null && v.ai !== undefined) { this.traffic.hijack(v); this.vehicles.push(v); hud.toast(v.kind === 'scooter' ? '同學，機車借一下！' : '不好意思，借一下車！', 'bad'); }
          pl.enter(v);
          if (v.hint) { v.mesh.remove(v.hint); v.hint = null; }
          hud.setTip('🛵 駕駛', '<kbd>W</kbd> 油門 <kbd>S</kbd> 煞車/倒車 <kbd>A</kbd><kbd>D</kbd> 轉向<br><kbd>Space</kbd> 甩尾 <kbd>H</kbd> 喇叭 <kbd>F</kbd> 下車');
        }
      }
    }
    // ---- movement ----
    if (pl.vehicle) {
      const v = pl.vehicle;
      const a = pl.frozen ? { x: 0, y: 0 } : inp.axis();
      const others = [...this.traffic.vehicles(), ...this.vehicles.filter(o => o !== v && Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < 10)];
      v.drive(dt, { throttle: a.y, steer: -a.x, handbrake: !pl.frozen && inp.down('Space') }, w.collision, others, (imp) => { this.audio.bump(imp / 3); this.rig.cur.y += Math.min(0.3, imp * 0.02); });
      pl.ch.update(dt, { mode: v.kind === 'scooter' ? 'ride' : 'drive' });
      // hit pedestrians
      const sp = Math.abs(v.speed);
      if (sp > 3) for (const p of this.peds.active()) {
        if (Math.hypot(p.pos.x - v.pos.x, p.pos.z - v.pos.z) < v.radius + 0.45) {
          const [fx, fz] = v.forward();
          if (this.peds.knock(p, fx, fz)) { this.addVotes(-1, '撞到同學了！-1 票 😵'); v.speed *= 0.7; }
        }
      }
      if (!pl.frozen && inp.hit('KeyH')) { this.audio.horn(v.kind === 'scooter' ? 1.3 : 1); this.peds.scare(v.pos.x, v.pos.z, 14); }
      this.audio.setEngine(true, Math.min(1, sp / v.maxSpeed), v.kind);
      hud.setSpeed(sp * 3.6);
      // headlight
      const [fx, fz] = v.forward();
      this.headlight.intensity = this.night * 60;
      this.headlight.position.set(v.pos.x + fx * 1.2, v.mesh.position.y + 1.1, v.pos.z + fz * 1.2);
      this.headlight.target.position.set(v.pos.x + fx * 15, surfaceAt(v.pos.x + fx * 15, v.pos.z + fz * 15), v.pos.z + fz * 15);
    } else {
      pl.updateFoot(dt, inp, this.rig.yaw, w.collision, this.interiors);
      // push out of vehicles
      for (const v of [...this.vehicles, ...this.traffic.vehicles()]) {
        const dx = pl.pos.x - v.pos.x, dz = pl.pos.z - v.pos.z, rr = v.radius * (v.kind === 'scooter' ? 0.9 : 1) + 0.35, d = Math.hypot(dx, dz);
        if (d < rr && d > 1e-4) { pl.pos.x = v.pos.x + dx / d * rr; pl.pos.z = v.pos.z + dz / d * rr; }
      }
      hud.setSpeed(null);
      this.headlight.intensity = 0;
      // flyer handout
      if (!pl.frozen && !pl.seat && inp.hit('Mouse0')) this._flyer();
      if (!pl.frozen && inp.hit('KeyG')) pl.setPose('peace', 1.6);
    }
    this.playerLight.intensity = this.night * 6;
    const wp = pl.worldPos();
    this.playerLight.position.set(wp.x, (pl.vehicle ? pl.vehicle.mesh.position.y : surfaceAt(wp.x, wp.z) + pl.y) + 3, wp.z);

    // ---- prompts ----
    if (!pl.vehicle && !pl.frozen) {
      const v = pl.y < 1 && !pl.seat ? this._nearestVehicle(3.2) : null;
      const p = this._nearestPed(3.5);
      if (act) hud.setPrompt(act.label(this));
      else if (v) hud.setPrompt(`按 <kbd>F</kbd> ${v.ai ? '借用' : '騎上'}${v.label}`);
      else if (p && !p.voted) hud.setPrompt(`${this.input.touch ? '按 📄' : '<kbd>左鍵</kbd>'} 發傳單給同學`);
      else hud.setPrompt(null);
    } else hud.setPrompt(null);

    // ---- world sims ----
    const info = { pos: wp, vehicle: pl.vehicle, extraObstacles: this.vehicles.filter(v => v !== pl.vehicle && Math.hypot(v.pos.x - wp.x, v.pos.z - wp.z) < 25) };
    this.traffic.update(dt, info, this.audio);
    this.peds.update(dt, { pos: wp }, w.collision);
    for (const n of this.npcs) { n.ch.update(dt, { speed: 0, pose: n.pose }); n.mark.position.y = 2.75 + Math.sin(this.time * 3) * 0.08; }
    if (this.crowd) for (const c of this.crowd) c.update(dt, { speed: 0, pose: this.speechOn ? c.cheerPose : null });

    // ---- ballots ----
    for (const b of this.ballotList) {
      if (b.taken) continue;
      if (Math.hypot(b.x - wp.x, b.z - wp.z) < (pl.vehicle ? 2.6 : 1.6) && pl.y < 2) {
        b.taken = true; b.mesh.visible = false; this.ballotsTaken++;
        hud.setBallots(this.ballotsTaken); this.audio.pickup();
        this.addVotes(1, `金色選票 ${this.ballotsTaken}/34 +1 票`);
        if (this.ballotsTaken === 34) { hud.bigToast('全部收集！', '34 張金色選票 → 資管要贏 票投彥霖！'); this.audio.fanfare(); this.addVotes(34); }
      }
    }
    this.missions.update(dt);
    // ---- camera & hud ----
    this.rig.update(dt, hud.bigOpen ? { mdx: 0, mdy: 0 } : inp, pl, w.collision, this.settings.sens, this.interiors);
    hud.setClock(this.clock);
    const markers = [...this.missions.markers];
    const range = pl.vehicle ? 170 : 110;
    hud.drawMinimap(wp.x, wp.z, this.rig.yaw, pl.worldHeading(), range, markers, this.ballotList);
    hud.drawBig(wp.x, wp.z, pl.worldHeading(), markers, this.ballotList);
    if ((this._locT = (this._locT || 0) - dt) <= 0) {
      this._locT = 0.5;
      const zn = !pl.vehicle && this.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y);
      hud.setLocation(zn ? (zn.floorOf ? `${zn.name} ${zn.floorOf(pl.y)}F` : zn.name) : hud.locationName(wp.x, wp.z));
      for (const v of this.vehicles) v.mesh.visible = v === pl.vehicle || Math.hypot(v.pos.x - wp.x, v.pos.z - wp.z) < 160;
    }
    // tip box fades after a while on foot
    if (!pl.vehicle && this._tipMode !== 'foot') { this._tipMode = 'foot'; hud.setTip('🎮 移動', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走路 · 滑鼠 視角 · <kbd>Shift</kbd> 衝刺 · <kbd>Space</kbd> 跳<br><kbd>F</kbd> 上車 · <kbd>E</kbd> 互動 · <kbd>左鍵</kbd> 發傳單 · <kbd>G</kbd> ✌ · <kbd>M</kbd> 地圖 · <kbd>Esc</kbd> 設定'); }
    if (pl.vehicle) this._tipMode = 'car';
  }
  _nearestVehicle(r) {
    const p = this.player.pos; let best = null, bd = r;
    for (const v of [...this.vehicles, ...this.traffic.vehicles()]) {
      const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z) - (v.kind === 'scooter' ? 0 : 1);
      if (d < bd && (!v.ai || Math.abs(v.speed) < 8)) { bd = d; best = v; }
    }
    return best;
  }
  _nearestPed(r) {
    const p = this.player.pos; let best = null, bd = r;
    for (const q of this.peds.active()) { if (q.state === 'down') continue; const d = Math.hypot(q.pos.x - p.x, q.pos.z - p.z); if (d < bd) { bd = d; best = q; } }
    return best;
  }
  _flyer() {
    const p = this._nearestPed(3.5);
    this.player.setPose('give', 0.5);
    if (!p) { this.hud.toast('附近沒有同學可以發傳單', 'bad', 1000); return; }
    p.heading = Math.atan2(this.player.pos.x - p.pos.x, this.player.pos.z - p.pos.z);
    this.player.heading = Math.atan2(p.pos.x - this.player.pos.x, p.pos.z - this.player.pos.z);
    const r = this.peds.giveFlyer(p);
    if (r.ok) { this.flyerVotes = (this.flyerVotes || 0) + 1; this.addVotes(1, `「${r.text}」 +1 票`); }
    else { this.hud.toast(`「${r.text}」`, 'bad', 1500); }
  }
}

const CONTROLS_HTML = `
<div class="ctrl-sec">步行 ON FOOT</div>
<div class="ctrl-grid">
<div><span>移動</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div>
<div><span>視角</span><span>滑鼠</span></div>
<div><span>衝刺</span><kbd>Shift</kbd></div>
<div><span>跳躍</span><kbd>Space</kbd></div>
<div><span>發傳單拉票</span><kbd>滑鼠左鍵</kbd></div>
<div><span>比 ✌</span><kbd>G</kbd></div>
<div><span>上車 / 下車</span><kbd>F</kbd></div>
<div><span>對話 / 繼續</span><span><kbd>E</kbd> <kbd>Enter</kbd></span></div>
</div>
<div class="ctrl-sec">駕駛 機車與汽車 DRIVING</div>
<div class="ctrl-grid">
<div><span>油門</span><kbd>W</kbd></div>
<div><span>煞車 / 倒車</span><kbd>S</kbd></div>
<div><span>轉向</span><span><kbd>A</kbd><kbd>D</kbd></span></div>
<div><span>手煞車甩尾</span><kbd>Space</kbd></div>
<div><span>喇叭</span><kbd>H</kbd></div>
<div><span>下車</span><kbd>F</kbd></div>
</div>
<div class="ctrl-sec">介面 MENUS</div>
<div class="ctrl-grid">
<div><span>地圖</span><kbd>M</kbd></div>
<div><span>暫停</span><kbd>Esc</kbd></div>
</div>
<p style="margin-top:10px;color:#a9adbf">手機：左下搖桿移動，右側拖曳轉視角，按鈕操作上下車 / 發傳單。</p>`;

const ABOUT_HTML = `<div class="about">
<p><b style="font-size:20px;color:#ffd23f">彥霖 Yanlin</b>　第34屆 中原大學 資訊管理學系 系學會會長候選人</p>
<p style="font-size:20px;font-weight:900">資管要贏　票投彥霖</p>
<p>《中原順起來》是彥霖的競選宣傳小遊戲。整個地圖依照真實的中原大學與周邊街區（中北路、實踐路、新中北路、中原夜市）搭建，建築位置與高度來自 OpenStreetMap。</p>
<p>在遊戲裡，你就是彥霖：</p>
<ul><li>騎著粉白色 SYM JET SL 穿梭校園送傳單</li><li>走進資管系館上樓、進教室，電腦教室裡有彩蛋影片</li><li>去活動中心的麥當勞點餐、坐進警衛室值班</li><li>衝去中原夜市買雞排宵夜</li><li>對路上的同學發傳單拉票</li><li>在學生活動中心發表政見</li></ul>
<p>真實的投票日，資管要贏，票投 <b style="color:#ffd23f">彥霖</b> 🗳✌</p>
<p style="color:#a9adbf;font-size:12px">地圖資料 © OpenStreetMap contributors，依 ODbL 授權使用。<br>地形資料：內政部 20m 網格數值地形模型（政府資料開放授權條款第1版）。</p></div>`;

window.game = new Game();
window.game.init().catch(e => { console.error(e); $('loadText').textContent = '載入失敗：' + e.message; });
