// WebAudio synth (engine, horn, pickups) + background music:
//   'opera'   — 彥霖歌劇 (assets/music/yanlin-opera.m4a), looped forever
//   'scene'   — 情境配樂: assets/music/scene-<name>.m4a picked by where you are / what you're doing,
//               cross-faded; each file is fetched the first time its scene comes up
//   'off'
const SETTINGS_KEY = 'cycu-shun-settings-v2';
// recorded sound effects (assets/sfx/*.m4a, made with Stable Audio Open on the home GPU). One-shots and the short
// loops are decoded once after the first click; the long ambience beds stream through <audio>. Whatever is missing
// or not loaded yet falls back to the WebAudio synth versions, so the game never goes silent.
const SFX_DECODED = [
  'shutter',
  'register',
  'ding',
  'scooter_start',
  'car_start',
  'engine_off',
  'barrier',
  'thud',
  'cheer',
  'sizzle',
  'horn_car',
  'ped_hit',
  'ped_oof',
  'crash_scooter',
  'crash_car',
  'mj_tile',
  'mj_tile2',
  'mj_draw',
  'mj_meld',
  'mj_dice_hit',
  'mj_shuffle',
  'mj_reveal',
  'mj_knock',
  'skid',
  'engine_scooter',
  'engine_car',
  'heli',
  'step_out',
  'step_out2',
  'step_in',
  'step_in2',
  'step_grass',
  'land',
  'paper',
  'door',
  'lift',
  'prop_cone',
  'prop_barrier',
  'bike_scrape',
  'ragdoll_thud',
  'clock_chime',
  'train_run',
  'crossing_bell',
];
export function loadSettings() {
  // fill: 補建街區 (synthetic buildings / ground from tools/block_survey.json), 'on' | 'off'
  // amb: 環境音 (birds / insects / night market), 'on' | 'off' — still under sfxVol
  const def = {
    music: 'scene', // 情境配樂 is the default; the old synthesized 'default' loop was removed
    musicVol: 0.6,
    sfxVol: 0.8,
    sens: 1,
    quality: 'auto',
    fill: 'on',
    amb: 'on',
    perfHud: 'off', // 效能顯示 (src/core/PerfHud.js): 'off' | 'fps' | 'detail' | 'dev'
  };
  try {
    const s = { ...def, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    if (s.music === 'default') s.music = 'scene'; // 預設音樂 (the synthesized loop) no longer exists
    return s;
  } catch (e) {
    return def;
  }
}
export function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (e) {}
}

export class Audio {
  constructor(settings) {
    this.ctx = null;
    this.engine = null;
    this.settings = settings;
    this.opera = new window.Audio('assets/music/yanlin-opera.m4a');
    this.opera.loop = true;
    // 3 MB: fetched when it first plays (title music on, or 設定 → 音樂), not while the world builds (Phase 1B)
    this.opera.preload = 'none';
    this.ducked = false;
    this.scene = 'title';
    this.sceneEls = {};
    this.sceneTimer = null; // 情境配樂
    // one-shot voice budget: past it new sounds are dropped (phones get fewer)
    this.voices = 0;
    this.maxVoices = window.matchMedia?.('(pointer: coarse)').matches ? 12 : 24;
    this.L = { x: 0, z: 0, yaw: 0 }; // listener (camera) for at() / ambient
    this._out = null; // where tone()/noise() go; at() and _spot() swap it briefly
    this._amb = { bird: 3, cricket: 1, cicada: 20 };
  }
  get muted() {
    return this.settings.sfxVol === 0 && this.settings.music === 'off';
  }
  init() {
    if (this.ctx) {
      this.ctx.resume();
      this.applyMusic();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.connect(this.master);
    // engine
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 60;
    const o2 = this.ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = 30;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    o.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    o.start();
    o2.start();
    this.engine = { o, o2, f, g };
    // (the old looping brown-noise "ambience" sounded like constant wind, so it's gone)
    // 環境音 bus (settings.amb) under the sfx volume
    this.amb = this.ctx.createGain();
    this.amb.connect(this.sfx);
    // one shared white-noise buffer for footsteps / swishes and the looped beds (skid, sizzle, babble)
    const nb = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate),
      nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.applyVolumes();
    this.applyMusic();
    this._loadSfx();
  }
  applyVolumes() {
    const s = this.settings,
      duck = this.ducked ? 0 : 1;
    if (this.sfx) this.sfx.gain.value = s.sfxVol * 0.6;
    if (this.amb) this.amb.gain.value = s.amb === 'off' ? 0 : 1;
    this.opera.volume = Math.min(1, s.musicVol) * duck;
    for (const el of Object.values(this.sceneEls)) el.volume = this._sceneVol(el);
  }
  // pause music while e.g. a YouTube video plays
  duck(on) {
    this.ducked = on;
    this.applyVolumes();
    if (this.settings.music === 'opera') {
      on ? this.opera.pause() : this.opera.play().catch(() => {});
    }
    if (on) for (const el of Object.values(this.sceneEls)) el.pause(); // _sceneTick resumes them
  }
  applyMusic() {
    const m = this.settings.music;
    if (m === 'opera') {
      this.opera.play().catch(() => {});
    } else this.opera.pause();
    if (m === 'scene') this._startScene();
    else this._stopScene();
    this.applyVolumes();
  }
  // ---------- 情境配樂 ----------
  // scenes: title · day · night · market · timed · mcd · speech · ending
  setScene(name) {
    this.scene = name;
  }
  _sceneVol(el) {
    return el.lvl * Math.min(1, this.settings.musicVol) * (this.ducked ? 0 : 0.8);
  }
  _startScene() {
    if (!this.sceneTimer) {
      this.sceneTimer = setInterval(() => this._sceneTick(0.1), 100);
      this._sceneTick(0);
    }
  }
  _stopScene() {
    if (this.sceneTimer) {
      clearInterval(this.sceneTimer);
      this.sceneTimer = null;
    }
    for (const el of Object.values(this.sceneEls)) {
      el.pause();
      el.lvl = 0;
    }
  }
  _sceneTick(dt) {
    const want = this.scene;
    if (!this.sceneEls[want]) {
      const el = new window.Audio(`assets/music/scene-${want}.m4a`);
      el.loop = true;
      el.preload = 'auto';
      el.lvl = 0;
      this.sceneEls[want] = el;
    }
    for (const [k, el] of Object.entries(this.sceneEls)) {
      const to = k === want ? 1 : 0;
      el.lvl += Math.sign(to - el.lvl) * Math.min(Math.abs(to - el.lvl), dt / 1.5); // 1.5 s cross-fade
      el.volume = this._sceneVol(el);
      if (el.lvl > 0 && el.paused && !this.ducked) el.play().catch(() => {});
      else if (el.lvl === 0 && !el.paused) el.pause();
    }
  }
  setEngine(on, speed01, kind) {
    if (!this.engine) return;
    const t = this.ctx.currentTime,
      e = this.engine;
    const key = kind === 'scooter' ? 'engine_scooter' : 'engine_car';
    const bufs = (this._engBuf ||= {});
    if (on && this.buf?.[key]) {
      bufs[key] ||= this._loopBuf(key);
      const b = bufs[key];
      e.g.gain.setTargetAtTime(0, t, 0.08);
      for (const [k, other] of Object.entries(bufs))
        if (k !== key) other.g.gain.setTargetAtTime(0, t, 0.08);
      const rate = kind === 'scooter' ? 0.72 + speed01 * 0.75 : 0.78 + speed01 * 0.72;
      b.s.playbackRate.setTargetAtTime(rate, t, 0.08);
      b.g.gain.setTargetAtTime(0.2 + speed01 * 0.2, t, 0.12);
      return;
    }
    for (const b of Object.values(bufs)) b.g.gain.setTargetAtTime(0, t, 0.12);
    const base = kind === 'scooter' ? 70 : 45;
    e.o.frequency.setTargetAtTime(base + speed01 * (kind === 'scooter' ? 160 : 110), t, 0.08);
    e.o2.frequency.setTargetAtTime((base + speed01 * 100) / 2, t, 0.08);
    e.f.frequency.setTargetAtTime(300 + speed01 * 900, t, 0.1);
    e.g.gain.setTargetAtTime(on ? 0.07 + speed01 * 0.06 : 0, t, 0.15);
  }
  // ---------- voice budget ----------
  _free() {
    return this.ctx && this.settings.sfxVol > 0 && this.voices < this.maxVoices;
  }
  _track(src) {
    this.voices++;
    src.onended = () => {
      this.voices--;
    };
  }
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slide = 0, lp = 0) {
    this._osc({ f: freq, dur, type, vol, when, slide, ft: lp ? 'lowpass' : null, ff: lp });
  }
  // oscillator one-shot with optional filter (ft/ff/q) and attack
  _osc({
    f,
    dur,
    type = 'sine',
    vol = 0.2,
    when = 0,
    slide = 0,
    ft = null,
    ff = 1000,
    q = 1,
    att = 0.01,
  }) {
    if (!this._free()) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o;
    if (ft) {
      const fl = this.ctx.createBiquadFilter();
      fl.type = ft;
      fl.frequency.value = ff;
      fl.Q.value = q;
      o.connect(fl);
      n = fl;
    }
    n.connect(g);
    g.connect(this._out || this.sfx);
    this._track(o);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  // scooters and cars share the recorded horn; small random detune so NPC honks don't all sound identical
  horn(pitch = 1, vol = 1) {
    if (this._play('horn_car', 0.5 * vol, 0, 0.96 + Math.random() * 0.08)) return;
    this.tone(420 * pitch, 0.35, 'square', 0.08 * vol);
    this.tone(530 * pitch, 0.35, 'square', 0.06 * vol);
  }
  pickup() {
    [660, 880, 1320].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.18, i * 0.06));
  }
  vote() {
    this.tone(880, 0.1, 'triangle', 0.15);
    this.tone(1175, 0.18, 'triangle', 0.15, 0.08);
  }
  bad() {
    this.tone(220, 0.25, 'sawtooth', 0.1, 0, 0.6);
  }
  // ran into a wall / barrier; i = impact (≈1 light knock … 5+ full-speed crash), kind = 'scooter' | 'car'
  bump(i = 1, kind = 'scooter') {
    const v = Math.min(1, 0.2 + 0.16 * i),
      rate = (i < 1.5 ? 1.12 : 1) * (0.94 + Math.random() * 0.12);
    if (this._play(kind === 'car' ? 'crash_car' : 'crash_scooter', v, 0, rate)) return;
    this.tone(90, 0.2, 'sawtooth', Math.min(0.25, 0.05 * i), 0, 0.5);
  }
  checkpoint() {
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'square', 0.08, i * 0.07));
  }
  fanfare() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      this.tone(f, i === 5 ? 0.6 : 0.18, 'square', 0.09, i * 0.13)
    );
  }
  blip() {
    this.tone(1200, 0.04, 'square', 0.04);
  }
  // short filtered noise burst
  noise(dur, freq, q = 1, vol = 0.2, when = 0, type = 'bandpass', sweep = 0) {
    if (!this.noiseBuf || !this._free()) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this._out || this.sfx);
    this._track(src);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }
  // footstep: surface 'out' (asphalt / paving), 'in' (tiled floor), 'grass'; run = louder, snappier
  step(surface = 'out', run = false) {
    const v = run ? 1.25 : 1,
      j = 0.85 + Math.random() * 0.3;
    if (surface === 'grass') {
      if (this._play('step_grass', 0.32 * v, 0, 0.92 + Math.random() * 0.16)) return;
      this.noise(0.11, 2400 * j, 0.7, 0.16 * v, 0, 'bandpass');
      return;
    }
    if (surface === 'in') {
      const k = Math.random() < 0.5 ? 'step_in' : 'step_in2';
      if (this._play(k, 0.3 * v, 0, 0.93 + Math.random() * 0.14)) return;
      this.noise(0.05, 3200 * j, 1.4, 0.13 * v);
      this.tone(150 * j, 0.06, 'sine', 0.09 * v, 0, 0.6);
      return;
    }
    const k = Math.random() < 0.5 ? 'step_out' : 'step_out2';
    if (this._play(k, 0.32 * v, 0, 0.92 + Math.random() * 0.16)) return;
    this.noise(0.07, 1500 * j, 1.1, 0.17 * v);
    this.tone(95 * j, 0.07, 'sine', 0.1 * v, 0, 0.6);
  }
  jump() {
    this.noise(0.12, 900, 0.8, 0.1, 0, 'bandpass', 2.2);
  }
  land(i = 1) {
    const k = Math.min(1.6, i);
    if (this._play('land', 0.42 * k, 0, 0.92 + Math.random() * 0.16)) return;
    this.noise(0.12, 700, 0.9, 0.16 * k);
    this.tone(70, 0.12, 'sine', 0.14 * k, 0, 0.5);
  }
  // generic interaction "tick" (E actions, buttons)
  interact() {
    this.tone(880, 0.05, 'triangle', 0.08);
    this.tone(1320, 0.07, 'triangle', 0.06, 0.04);
  }
  talk() {
    this.tone(520 + Math.random() * 120, 0.05, 'square', 0.03);
  }
  door() {
    if (this._play('door', 0.48, 0, 0.96 + Math.random() * 0.08)) return;
    this.noise(0.18, 400, 0.8, 0.14, 0, 'lowpass');
    this.tone(180, 0.1, 'triangle', 0.08, 0.02, 0.7);
  }
  // 公車（src/systems/Buses.js）氣動車門：開門先「噗」一聲洩氣再「嘶——」，關門短促的「嘶」接一聲門框碰到的「咚」
  busDoor(open) {
    if (open) {
      this.noise(0.12, 300, 0.7, 0.16, 0, 'lowpass');
      this.noise(0.9, 3800, 0.5, 0.07, 0.06, 'highpass', 0.55);
    } else {
      this.noise(0.45, 3200, 0.5, 0.06, 0, 'highpass', 0.7);
      this.noise(0.14, 260, 0.8, 0.12, 0.62, 'lowpass');
      this.tone(120, 0.12, 'triangle', 0.07, 0.62, 0.7);
    }
  }
  // 公車到站提示音：車內廣播前那兩聲「叮——咚」
  busChime() {
    this.tone(1046.5, 0.5, 'sine', 0.1, 0, 1);
    this.tone(1046.5 * 2, 0.3, 'sine', 0.015, 0, 1);
    this.tone(784, 0.9, 'sine', 0.1, 0.42, 1);
    this.tone(784 * 2, 0.5, 'sine', 0.015, 0.42, 1);
  }
  paper() {
    if (this._play('paper', 0.5, 0, 0.94 + Math.random() * 0.12)) return;
    this.noise(0.16, 3500, 0.6, 0.12, 0, 'highpass', 0.6);
  }
  mount() {
    this.tone(140, 0.08, 'square', 0.06, 0, 0.7);
    this.noise(0.08, 1800, 1, 0.1, 0.05);
  }
  coin() {
    this.tone(1568, 0.06, 'square', 0.05);
    this.tone(2093, 0.18, 'square', 0.05, 0.06);
  }
  pop() {
    this.tone(600, 0.08, 'sine', 0.1, 0, 2);
  }

  // ---------- placement ----------
  // play fn()'s sounds from world point (x, z): quieter with distance, panned by camera yaw, silent past maxD
  at(x, z, maxD, fn) {
    if (!this.ctx) return;
    const L = this.L,
      dx = x - L.x,
      dz = z - L.z,
      d = Math.hypot(dx, dz);
    if (d > maxD) return;
    // camera forward = (sin yaw, cos yaw); its right-hand side = (-cos yaw, sin yaw)
    const pan = d < 1 ? 0 : (-dx * Math.cos(L.yaw) + dz * Math.sin(L.yaw)) / d;
    this._spot(pan * 0.8, Math.pow(1 - d / maxD, 1.6), fn);
  }
  // fn()'s sounds through a pan + gain stage into dest
  _spot(pan, vol, fn, dest = this.sfx) {
    const g = this.ctx.createGain();
    g.gain.value = vol;
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      p.connect(dest);
    } else g.connect(dest);
    const prev = this._out;
    this._out = g;
    try {
      fn();
    } finally {
      this._out = prev;
    }
  }
  // looped noise bed (filter → gain 0); created on first use and kept
  _bed(type, freq, q, dest = this.sfx) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(0, Math.random() * 1.5);
    return { s, f, g };
  }
  // keep-alive level: holds v while called every frame, fades out by itself once the caller stops
  // (pause, leaving the kitchen, background tab), so no bed can get stuck on
  _hold(param, v, tc = 0.08) {
    const t = this.ctx.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else param.cancelScheduledValues(t);
    param.setTargetAtTime(v, t, tc);
    param.setTargetAtTime(0, t + 0.3, 0.15);
  }

  // ---------- recorded sfx ----------
  _loadSfx() {
    this.buf = {};
    for (const n of SFX_DECODED) {
      fetch(`assets/sfx/${n}.m4a`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((b) => this.ctx.decodeAudioData(b))
        .then((d) => {
          this.buf[n] = d;
        })
        .catch(() => {});
    }
  }
  // one-shot from a recorded file; false when it isn't loaded (caller plays the synth version)
  _play(name, vol = 1, when = 0, rate = 1) {
    const b = this.buf && this.buf[name];
    if (!b) return false;
    if (!this._free()) return true;
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.connect(g);
    g.connect(this._out || this.sfx);
    this._track(s);
    s.start(this.ctx.currentTime + when);
    return true;
  }
  // a voice clip from any file (decoded on first use, then cached); stops the previous clip from the same group so
  // lines never talk over each other. Resolves to the clip length in seconds (0 when it can't be played).
  async voice(url, vol = 1, group = 'voice') {
    if (!this.ctx) return 0;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const cache = (this._voiceBuf ||= {});
    try {
      cache[url] ||= fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((b) => this.ctx.decodeAudioData(b));
      const b = await cache[url];
      const cur = (this._voiceSrc ||= {})[group];
      if (cur) {
        try {
          cur.stop();
        } catch (e) {}
      }
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      s.connect(g);
      g.connect(this.sfx);
      s.start();
      this._voiceSrc[group] = s;
      s.onended = () => {
        if (this._voiceSrc[group] === s) this._voiceSrc[group] = null;
      };
      return b.duration;
    } catch (e) {
      delete cache[url];
      return 0;
    }
  }
  // looped recorded buffer at gain 0 (skid / sizzle), driven with _hold like the synth beds
  _loopBuf(name, dest = this.sfx) {
    const b = this.buf && this.buf[name];
    if (!b) return null;
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    s.connect(g);
    g.connect(dest);
    s.start(0, Math.random() * b.duration);
    return { s, g, f: null };
  }
  // streamed ambience bed: <audio> → gain → pan → dest; .ready once it can play
  _stream(name, dest) {
    const el = new window.Audio(name.includes('.') ? name : `assets/sfx/${name}.m4a`);
    el.loop = true;
    el.preload = 'auto';
    const g = this.ctx.createGain();
    g.gain.value = 0;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    this.ctx.createMediaElementSource(el).connect(g);
    if (pan) {
      g.connect(pan);
      pan.connect(dest);
    } else g.connect(dest);
    return {
      el,
      g,
      pan,
      idle: 0,
      get ready() {
        return el.readyState >= 2 && !el.error;
      },
    };
  }
  // a looping recording somewhere in the world, kept at level v every frame (0: fades out, pauses after 2 s);
  // e.g. 女拳大帝's phone alarm ringing on his desk (src/entities/npcs/Gordon.js)
  loopAt(key, src, v, dt, pan = 0, dest = this.sfx) {
    if (!this.ctx || !dest) return;
    if (v <= 0.001 && !this._loops?.[key]) return;
    const L = (this._loops ||= {});
    const b = (L[key] ||= this._stream(src, dest));
    this._streamLevel(b, v, dt, pan);
  }
  // keep a stream at level v (fades out by itself when not called); pauses after 2 s of silence
  _streamLevel(b, v, dt, pan = 0) {
    this._hold(b.g.gain, v, 0.3);
    if (b.pan) b.pan.pan.setTargetAtTime(pan, this.ctx.currentTime, 0.2);
    if (v > 0.001) {
      b.idle = 0;
      if (b.el.paused) b.el.play().catch(() => {});
    } else if ((b.idle += dt) > 2 && !b.el.paused) b.el.pause();
  }

  // ---------- vehicles ----------
  // starter motor cranks, then the engine catches and revs
  engineStart(kind = 'scooter') {
    if (this._play(kind === 'scooter' ? 'scooter_start' : 'car_start', 0.35)) return;
    const sc = kind === 'scooter',
      n = sc ? 3 : 4;
    for (let i = 0; i < n; i++) {
      this.tone(sc ? 170 : 115, 0.07, 'square', 0.035, i * 0.075, 0.85, 900);
      this.noise(0.06, 500, 0.8, 0.06, i * 0.075, 'lowpass');
    }
    const t0 = n * 0.075 + 0.02;
    this.tone(sc ? 70 : 48, 0.55, 'sawtooth', 0.11, t0, 2.4, 650);
    this.noise(0.12, 300, 0.7, 0.12, t0, 'lowpass');
  }
  engineStop(kind = 'scooter') {
    if (this._play('engine_off', 0.3, 0, kind === 'scooter' ? 1 : 0.8)) return;
    this.tone(kind === 'scooter' ? 120 : 80, 0.7, 'sawtooth', 0.08, 0, 0.35, 500);
    this.noise(0.09, 260, 0.7, 0.1, 0.6, 'lowpass');
  }
  // tyre squeal while drifting; amount 0..1, call every frame
  skid(amount) {
    if (!this.ctx) return;
    if (this._skid?.f && this.buf?.skid) {
      try {
        this._skid.s.stop();
      } catch (e) {}
      this._skid = null;
    }
    if (!this._skid) this._skid = this._loopBuf('skid') || this._bed('bandpass', 1900, 9);
    const b = this._skid;
    this._hold(b.g.gain, amount * (b.f ? 0.5 : 0.3));
    if (amount > 0 && b.f)
      b.f.frequency.setTargetAtTime(
        1600 + amount * 700 + Math.random() * 250,
        this.ctx.currentTime,
        0.05
      );
  }
  // helicopter main rotor loop (src/systems/minigames/Airdrop.js); amount 0..1, call every frame
  heli(amount) {
    if (!this.ctx || !this.buf?.heli) return false;
    if (!this._heli) this._heli = this._loopBuf('heli');
    if (!this._heli) return false;
    this._hold(this._heli.g.gain, amount * 0.55, 0.12);
    return true;
  }
  // knocked a pedestrian over: thud + "oof"
  hitPed() {
    if (this._play('ped_hit', 0.6)) {
      this._play('ped_oof', 0.55, 0.06, 0.9 + Math.random() * 0.25);
      return;
    }
    if (this._play('thud', 0.5)) {
      this._osc({
        f: 260 + Math.random() * 60,
        dur: 0.24,
        type: 'sawtooth',
        vol: 0.07,
        when: 0.05,
        slide: 0.65,
        ft: 'bandpass',
        ff: 750,
        q: 2,
        att: 0.03,
      });
      return;
    }
    this.tone(85, 0.18, 'sine', 0.25, 0, 0.5);
    this.noise(0.12, 350, 0.8, 0.22, 0, 'lowpass');
    this._osc({
      f: 260 + Math.random() * 60,
      dur: 0.24,
      type: 'sawtooth',
      vol: 0.07,
      when: 0.05,
      slide: 0.65,
      ft: 'bandpass',
      ff: 750,
      q: 2,
      att: 0.03,
    });
  }
  // Rapier physics impacts: cone bounce, water-filled barrier thud, knocked scooter scrape, ragdoll landing
  physImpact(kind, mag = 0.7, x, z) {
    const k = Math.min(1, Math.max(0.2, mag));
    const map = {
      cone: ['prop_cone', 0.45],
      barrier: ['prop_barrier', 0.58],
      bike_scrape: ['bike_scrape', 0.55],
      ragdoll: ['ragdoll_thud', 0.52],
    };
    const spec = map[kind];
    if (!spec) return;
    const run = () => {
      if (this._play(spec[0], spec[1] * k, 0, 0.92 + Math.random() * 0.16)) return;
      if (kind === 'cone') this.tone(360, 0.09, 'triangle', 0.08 * k, 0, 0.65);
      else if (kind === 'barrier') {
        this.tone(95, 0.22, 'sine', 0.16 * k, 0, 0.5);
        this.noise(0.16, 420, 0.7, 0.12 * k, 0, 'lowpass');
      } else if (kind === 'bike_scrape') this.noise(0.35, 1600, 1.4, 0.14 * k, 0, 'bandpass');
      else this.tone(85, 0.18, 'sine', 0.14 * k, 0, 0.55);
    };
    if (x != null && z != null) this.at(x, z, 36, run);
    else run();
  }
  // 二一鐘塔整點鐘聲
  // 循環的錄音（解碼過的 buffer，接縫不會有空檔）放在世界某處：每幀以音量 v、左右聲道 pan、播放速度 rate 呼叫，
  // 不再呼叫就自己淡出；例如火車行駛聲與平交道警鈴（src/entities/Trains.js）。錄音還沒載入時不出聲
  loopBufAt(key, name, v, dt, pan = 0, rate = 1) {
    if (!this.ctx || !this.sfx) return;
    const L = (this._bufLoops ||= {});
    if (v <= 0.001 && !L[key]) return;
    let b = L[key];
    if (!b) {
      const lb = this._loopBuf(name);
      if (!lb) return;
      lb.g.disconnect();
      const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (p) {
        lb.g.connect(p);
        p.connect(this.sfx);
      } else lb.g.connect(this.sfx);
      b = L[key] = { ...lb, p };
    }
    this._hold(b.g.gain, v, 0.25);
    const t = this.ctx.currentTime;
    if (b.p) b.p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.15);
    b.s.playbackRate.setTargetAtTime(rate, t, 0.2);
  }
  // 火車鳴笛，從 (x, z) 傳來；鐵道旁一兩條街內聽得到（src/entities/Trains.js）。
  // 一般列車：電聯車的雙音笛；small：工程車（軌道車、搗固車）短促偏高的「嗶、嗶」兩聲
  trainHorn(x, z, small = false) {
    this.at(x, z, 120, () => {
      if (small) {
        for (const d of [0, 0.45]) {
          this.tone(660, 0.28, 'square', 0.035, d, 0.998, 2400);
          this.tone(790, 0.28, 'square', 0.03, d, 0.998, 2400);
        }
        return;
      }
      for (const [f, d] of [
        [370, 0],
        [440, 0],
      ]) {
        this.tone(f, 0.55, 'sawtooth', 0.05, d, 0.995, 1800);
        this.tone(f, 0.75, 'sawtooth', 0.05, 0.7 + d, 0.995, 1800);
      }
    });
  }
  clockChime(x, z) {
    this.at(x, z, 160, () => {
      if (this._play('clock_chime', 0.55, 0, 0.99 + Math.random() * 0.02)) return;
      this.tone(293.66, 2.2, 'sine', 0.12, 0, 0.995);
      this.tone(587.33, 1.4, 'sine', 0.05, 0, 0.99);
    });
  }
  // guardhouse boom barrier: motor whirr, then a clunk at the end stop
  barrier(up, x, z) {
    this.at(x, z, 35, () => {
      if (this._play('barrier', 0.5, 0, up ? 1 : 0.92)) return;
      this.tone(up ? 70 : 85, 0.9, 'sawtooth', 0.06, 0, up ? 1.3 : 0.8, 380);
      this.noise(0.9, 900, 1.2, 0.03);
      this.tone(110, 0.12, 'sine', 0.14, 0.82, 0.6);
      this.noise(0.07, 600, 0.8, 0.1, 0.82, 'lowpass');
    });
  }
  // lift: motor hum while the car moves, ding on arrival
  lift() {
    if (!this._play('lift', 0.38)) {
      this.tone(55, 0.9, 'sawtooth', 0.05, 0, 1.08, 260);
      this.tone(110, 0.9, 'sine', 0.03);
    }
    if (!this._play('ding', 0.3, 0.95)) {
      this.tone(1568, 1.3, 'sine', 0.09, 0.95);
      this.tone(3136, 0.5, 'sine', 0.02, 0.95);
    }
  }

  // ---------- phone ----------
  // take out / put away (first take-out plays the boot chime)
  phone(open, boot = false) {
    this.noise(0.16, 700, 1, 0.06, 0, 'bandpass', open ? 3 : 0.35);
    this.tone(1800, 0.03, 'sine', 0.04, open ? 0.12 : 0);
    if (boot)
      [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) =>
        this.tone(f, 0.7, 'sine', 0.05, 0.3 + i * 0.09)
      );
  }
  tap() {
    this.tone(1700, 0.025, 'sine', 0.05);
    this.noise(0.02, 4000, 1, 0.025);
  }
  notify(when = 0) {
    this.tone(1174.7, 0.22, 'triangle', 0.09, when);
    this.tone(1568, 0.35, 'triangle', 0.09, when + 0.12);
  }
  send() {
    this.noise(0.18, 1500, 1, 0.06, 0, 'bandpass', 3);
    this.tone(900, 0.12, 'sine', 0.05, 0, 1.8);
  }
  shutter() {
    if (this._play('shutter', 0.4)) return;
    this.noise(0.03, 3000, 0.7, 0.18, 0, 'highpass');
    this.noise(0.05, 1800, 1.5, 0.14, 0.07);
    this.tone(600, 0.02, 'square', 0.03, 0.07);
  }
  // Peach Pay: contactless beep-beep, then a little "paid" chime
  pay() {
    this.tone(2400, 0.07, 'sine', 0.07);
    this.tone(2400, 0.07, 'sine', 0.07, 0.11);
    this.tone(1318.5, 0.25, 'triangle', 0.08, 0.24);
    this.tone(1760, 0.4, 'triangle', 0.08, 0.32);
  }

  // ---------- missions / McDonald's ----------
  // one beep per second over the last 10 s; double and higher over the last 5
  tick(urgent) {
    this.tone(urgent ? 1320 : 880, 0.07, 'square', 0.05, 0, 0, 3000);
    if (urgent) this.tone(1320, 0.07, 'square', 0.04, 0.14, 0, 3000);
  }
  objective() {
    this.noise(0.2, 1200, 0.8, 0.04, 0, 'bandpass', 2.5);
    [659.3, 987.8].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, 0.05 + i * 0.1));
  }
  fail() {
    [392, 329.6, 261.6].forEach((f, i) =>
      this.tone(f, i === 2 ? 0.6 : 0.22, 'square', 0.07, i * 0.2, i === 2 ? 0.9 : 0, 1600)
    );
  }
  ending() {
    this.scene = 'ending';
    const mel = [523.3, 659.3, 784, 1046.5, 987.8, 1046.5, 1174.7, 1318.5, 1568];
    mel.forEach((f, i) => this.tone(f, i === 8 ? 1.4 : 0.2, 'square', 0.07, i * 0.16, 0, 2600));
    [261.6, 329.6, 392].forEach((f) => this.tone(f, 1.6, 'triangle', 0.06, 8 * 0.16));
  }
  register() {
    if (this._play('register', 0.35)) return;
    this.noise(0.03, 2000, 0.7, 0.12, 0, 'highpass');
    this.tone(2637, 0.5, 'triangle', 0.07, 0.05);
    this.tone(3520, 0.6, 'sine', 0.04, 0.09);
  }
  // fryers / grill: n stations cooking; call every frame while on duty
  sizzle(n) {
    if (!this.ctx) return;
    if (!this._siz) this._siz = this._loopBuf('sizzle') || this._bed('highpass', 3500, 0.7);
    const b = this._siz;
    this._hold(b.g.gain, n ? (b.f ? 0.05 + 0.03 * n : 0.12 + 0.08 * n) : 0);
    if (n && b.f && Math.random() < 0.12 * n)
      this.noise(0.015, 5000 + Math.random() * 3000, 1, 0.05 + Math.random() * 0.05);
  }

  // ---------- mahjong ----------
  mjTile() {
    const k = Math.random() < 0.5 ? 'mj_tile' : 'mj_tile2';
    if (this._play(k, 0.55, 0, 0.95 + Math.random() * 0.1)) return;
    this.tap();
  }
  mjDraw() {
    if (this._play('mj_draw', 0.35, 0, 0.94 + Math.random() * 0.12)) return;
    this.tap();
  }
  mjMeld() {
    if (this._play('mj_meld', 0.65, 0, 0.96 + Math.random() * 0.08)) return;
    this.tap();
  }
  mjDice(bounce = 1) {
    const v = 0.55 * (1 - 0.12 * Math.min(2, Math.max(0, bounce - 1)));
    if (this._play('mj_dice_hit', v, 0, 0.92 + Math.random() * 0.2)) return;
    this.tap();
  }
  mjShuffle() {
    if (this._play('mj_shuffle', 0.5, 0, 0.97 + Math.random() * 0.06)) return;
    this.noise(0.35, 900, 0.8, 0.08);
  }
  mjReveal() {
    if (this._play('mj_reveal', 0.7, 0, 0.96 + Math.random() * 0.08)) return;
    this.tap();
  }
  mjKnock() {
    if (this._play('mj_knock', 0.75)) return;
    this.door();
  }

  // ---------- crowd ----------
  // babble: n band-passed noise "voices" hopping between vowel formants at syllable rate
  _babble(n, dest) {
    const ctx = this.ctx,
      bus = ctx.createGain();
    bus.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    bus.connect(lp);
    if (pan) {
      lp.connect(pan);
      pan.connect(dest);
    } else lp.connect(dest);
    const vs = [];
    for (let i = 0; i < n; i++) {
      const b = this._bed('bandpass', 600, 4, bus);
      b.s.playbackRate.value = 0.9 + Math.random() * 0.2;
      b.t = 0;
      vs.push(b);
    }
    return { bus, pan, vs };
  }
  _babbleTick(b, dt, level, pan) {
    const t = this.ctx.currentTime;
    this._hold(b.bus.gain, level, 0.3);
    if (b.pan) b.pan.pan.setTargetAtTime(pan, t, 0.2);
    if (level < 0.002) return;
    const F = [320, 450, 600, 750, 950, 1200, 1600, 2200];
    for (const v of b.vs) {
      if ((v.t -= dt) > 0) continue;
      v.t = 0.07 + Math.random() * 0.16;
      v.f.frequency.setTargetAtTime(
        F[Math.floor(Math.random() * F.length)] * (0.85 + Math.random() * 0.3),
        t,
        0.02
      );
      v.g.gain.setTargetAtTime(Math.random() < 0.8 ? 0.4 + Math.random() * 0.6 : 0, t, 0.025);
    }
  }
  // applause: clap bursts rendered into one small buffer (one voice instead of a hundred)
  _applause(len = 3.6) {
    const sr = 22050,
      buf = this.ctx.createBuffer(1, Math.floor(sr * len), sr),
      d = buf.getChannelData(0);
    const L = Math.floor(sr * 0.006);
    for (let k = 0; k < 170; k++) {
      const t0 = Math.pow(Math.random(), 1.4) * (len - 0.2),
        env = t0 < 0.3 ? t0 / 0.3 : Math.max(0, 1 - (t0 - 0.3) / (len - 0.3));
      const s0 = Math.floor(t0 * sr),
        amp = (0.3 + Math.random() * 0.7) * env * 0.5;
      for (let i = 0; i < L * 4 && s0 + i < d.length; i++)
        d[s0 + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / L);
    }
    return buf;
  }
  // end of the 政見發表會: applause, whoops and a whistle
  cheer() {
    this._cheerT = 3; // crowd murmur swells with it
    if (this._play('cheer', 0.8)) return;
    if (!this._free()) return;
    const t = this.ctx.currentTime,
      s = this.ctx.createBufferSource();
    s.buffer = this._applause();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1700;
    f.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.value = 0.9;
    s.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    this._track(s);
    s.start(t);
    for (let i = 0; i < 4; i++) {
      const f0 = 260 + Math.random() * 200,
        w = 0.2 + Math.random() * 0.9;
      this._osc({
        f: f0,
        dur: 0.5,
        type: 'sawtooth',
        vol: 0.035,
        when: w,
        slide: 1.5,
        ft: 'bandpass',
        ff: 900 + Math.random() * 500,
        q: 3,
        att: 0.06,
      });
    }
    this._osc({ f: 2000, dur: 0.55, type: 'sine', vol: 0.05, when: 0.5, slide: 1.35, att: 0.04 });
  }

  // ---------- ambience ----------
  // call every frame in play: o = { x, z, yaw, night 0..1, indoor, market {x,z}, crowd, job, timed }
  ambient(dt, o) {
    // 情境配樂 scene (market with a little hysteresis so the edge doesn't flip-flop)
    const md = o.market ? Math.hypot(o.market.x - o.x, o.market.z - o.z) : 1e9;
    this._inMkt = md < (this._inMkt ? 85 : 70);
    this.scene = o.crowd
      ? 'speech'
      : o.job
        ? 'mcd'
        : o.timed
          ? 'timed'
          : this._inMkt
            ? 'market'
            : o.night > 0.5
              ? 'night'
              : 'day';
    if (!this.ctx || this.settings.sfxVol === 0) return;
    this.L.x = o.x;
    this.L.z = o.z;
    this.L.yaw = o.yaw;
    const A = this._amb,
      day = 1 - (o.night || 0),
      out = o.indoor ? 0.25 : 1;
    // recorded beds (birds by day, insects at night)
    const S =
      this._beds ||
      (this._beds = {
        day: this._stream('amb_day', this.amb),
        night: this._stream('amb_night', this.amb),
      });
    // the market / rally recordings (< 100 KB each) are fetched up front so they're ready when you get there
    if (!this._mkt) {
      this._mkt = { s: this._stream('amb_market', this.amb) };
      this._crowd = { s: this._stream('crowd', this.sfx) };
    }
    this._streamLevel(S.day, (Math.max(0, day - 0.35) / 0.65) * 0.35 * out, dt);
    this._streamLevel(S.night, (Math.max(0, (o.night || 0) - 0.4) / 0.6) * 0.35 * out, dt);
    // synth birds / cicadas / crickets only while the recordings aren't loaded
    if (S.day.ready && S.night.ready) A.bird = A.cicada = A.cricket = 1;
    // birds by day
    if ((A.bird -= dt) <= 0) {
      A.bird = (2 + Math.random() * 5) / Math.max(0.2, day);
      if (day > 0.35)
        this._spot(Math.random() * 1.6 - 0.8, 0.7 * day * out, () => this._bird(), this.amb);
    }
    // a cicada now and then on warm afternoons
    if ((A.cicada -= dt) <= 0) {
      A.cicada = 15 + Math.random() * 25;
      if (day > 0.5)
        this._spot(Math.random() * 1.4 - 0.7, 0.8 * out, () => this._cicada(), this.amb);
    }
    // crickets at night
    if ((A.cricket -= dt) <= 0) {
      A.cricket = 0.5 + Math.random() * 0.9;
      if (o.night > 0.45)
        this._spot(
          [-0.6, 0.2, 0.7][Math.floor(Math.random() * 3)],
          o.night * out,
          () => this._cricket(),
          this.amb
        );
    }
    // 中原夜市: babble + fryer hiss + the odd clink, louder at night
    if (o.market) {
      const dx = o.market.x - o.x,
        dz = o.market.z - o.z,
        d = Math.hypot(dx, dz);
      const lv = d < 90 ? Math.pow(1 - d / 90, 1.5) * (0.4 + 0.6 * (o.night || 0)) * out : 0;
      {
        const m = this._mkt;
        const pan =
          d < 20
            ? 0
            : ((-dx * Math.cos(o.yaw) + dz * Math.sin(o.yaw)) / d) *
              0.6 *
              Math.min(1, (d - 20) / 30);
        this._streamLevel(m.s, lv * 0.7, dt, pan);
        // synth babble + fryer hiss stand in until the recording can play
        const syn = m.s.ready ? 0 : lv;
        if (syn > 0 && !m.b) {
          m.b = this._babble(5, this.amb);
          m.h = this._bed('highpass', 4200, 0.7, this.amb);
        }
        if (m.b) {
          this._babbleTick(m.b, dt, syn * 0.22, pan);
          this._hold(m.h.g.gain, syn * 0.025, 0.3);
        }
        if (lv > 0.05 && Math.random() < dt * 0.6 * lv)
          this._spot(
            pan,
            lv,
            () => this.tone(2600 + Math.random() * 1200, 0.1, 'triangle', 0.03),
            this.amb
          );
      }
    }
    // 政見發表會 crowd (event sound, not 環境音)
    if (this._cheerT > 0) this._cheerT -= dt;
    {
      const c = this._crowd;
      const lvl = o.crowd ? (this._cheerT > 0 ? 1 : 0.5) : 0;
      this._streamLevel(c.s, lvl * 0.6, dt);
      const syn = c.s.ready ? 0 : lvl;
      if (syn > 0 && !c.b) c.b = this._babble(6, this.sfx);
      if (c.b) this._babbleTick(c.b, dt, syn * 0.5, 0);
    }
    // 室內空間底噪（Room Tone）：教室／宿舍冷氣低頻、學活 B1／麥當勞用餐區人聲
    const zn = o.indoorZone || '';
    const cafe = !!o.indoor && /麥當勞|用餐|餐飲|美食|學生活動中心 B1/.test(zn);
    this.loopAt('room_cafe', 'room_cafe', cafe ? 0.24 : 0, dt, 0, this.amb);
    this.loopAt('room_ac', 'room_ac', o.indoor ? (cafe ? 0.08 : 0.18) : 0, dt, 0, this.amb);
    // 校園地標點音源：噴水池水流聲
    if (o.fountain) {
      const dx = o.fountain.x - o.x,
        dz = o.fountain.z - o.z,
        d = Math.hypot(dx, dz);
      const lv = d < 32 ? Math.pow(1 - d / 32, 1.5) * 0.34 * out : 0;
      const pan =
        d < 3
          ? 0
          : ((-dx * Math.cos(o.yaw) + dz * Math.sin(o.yaw)) / d) * 0.65 * Math.min(1, d / 12);
      this.loopAt('fountain', 'fountain', lv, dt, pan, this.amb);
    }
    // 校園地標點音源：力行宿舍浴室淋浴水聲（晚間 18:00–01:00 或洗澡任務期間）
    if (o.shower) {
      const dx = o.shower.x - o.x,
        dz = o.shower.z - o.z,
        d = Math.hypot(dx, dz),
        sameFloor = Math.abs((o.y ?? 0) - o.shower.y) < 2.4;
      const hrNow = o.clock != null ? Math.floor((((o.clock % 1440) + 1440) % 1440) / 60) : 20;
      const on = o.shower.active || hrNow >= 18 || hrNow < 1;
      const lv = on && sameFloor && d < 14 ? Math.pow(1 - d / 14, 1.4) * 0.34 : 0;
      const pan =
        d < 1.5
          ? 0
          : ((-dx * Math.cos(o.yaw) + dz * Math.sin(o.yaw)) / d) * 0.6 * Math.min(1, d / 6);
      this.loopAt('shower', 'shower', lv, dt, pan, this.amb);
    }
    // 校園地標點音源：二一鐘塔整點鐘聲（正常時間推進跨整點時觸發，快轉／睡覺不連響）
    if (o.clock != null && o.clockTower) {
      const hr = Math.floor(o.clock / 60);
      if (this._lastHr != null && hr - this._lastHr === 1) {
        this.clockChime(o.clockTower.x, o.clockTower.z);
      }
      this._lastHr = hr;
    }
  }
  _bird() {
    const r = Math.random(),
      base = 2600 + Math.random() * 1800;
    if (r < 0.6) {
      // chirps
      const n = 2 + Math.floor(Math.random() * 4),
        up = Math.random() < 0.5;
      for (let i = 0; i < n; i++)
        this.tone(
          base * (1 + i * 0.03),
          0.07 + Math.random() * 0.04,
          'sine',
          0.025,
          i * 0.1,
          up ? 1.35 : 0.72
        );
    } else {
      // two-note whistle
      this.tone(base * 0.7, 0.25, 'sine', 0.022, 0, 1.3);
      this.tone(base * 0.9, 0.3, 'sine', 0.02, 0.3, 0.7);
    }
  }
  _cicada() {
    if (!this._free()) return;
    const ctx = this.ctx,
      t = ctx.currentTime,
      dur = 4 + Math.random() * 4;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 4500 + Math.random() * 1200;
    f.Q.value = 5;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 35 + Math.random() * 20;
    const lg = ctx.createGain();
    lg.gain.value = 0.5;
    lfo.connect(lg);
    lg.connect(am.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 1.2);
    env.gain.setValueAtTime(0.06, t + dur - 1.8);
    env.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f);
    f.connect(am);
    am.connect(env);
    env.connect(this._out || this.amb);
    this._track(s);
    s.start(t, Math.random() * 1.5);
    lfo.start(t);
    s.stop(t + dur);
    lfo.stop(t + dur);
  }
  _cricket() {
    const f = 4200 + Math.random() * 400;
    for (let i = 0; i < 3; i++) this.tone(f, 0.03, 'sine', 0.02, i * 0.05);
  }
}
