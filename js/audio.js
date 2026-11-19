// WebAudio synth (engine, horn, pickups) + background music:
//   'default' — built-in synthesized loop
//   'opera'   — 彥霖歌劇 (assets/music/yanlin-opera.m4a), looped forever
//   'off'
const SETTINGS_KEY = 'cycu-shun-settings-v2';
export function loadSettings() {
  const def = { music: 'opera', musicVol: 0.6, sfxVol: 0.8, sens: 1 };
  try { return { ...def, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch (e) { return def; }
}
export function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { } }

export class Audio {
  constructor(settings) {
    this.ctx = null; this.engine = null; this.settings = settings;
    this.opera = new window.Audio('assets/music/yanlin-opera.m4a');
    this.opera.loop = true; this.opera.preload = 'auto';
    this.bgmTimer = null; this.ducked = false;
  }
  get muted() { return this.settings.sfxVol === 0 && this.settings.music === 'off'; }
  init() {
    if (this.ctx) { this.ctx.resume(); this.applyMusic(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.bgm = this.ctx.createGain(); this.bgm.connect(this.master);
    // engine
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60;
    const o2 = this.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 30;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = this.ctx.createGain(); g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx); o.start(); o2.start();
    this.engine = { o, o2, f, g };
    // ambience
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last; }
    const n = this.ctx.createBufferSource(); n.buffer = buf; n.loop = true;
    const ng = this.ctx.createGain(); ng.gain.value = 0.2; n.connect(ng); ng.connect(this.sfx); n.start();
    this.applyVolumes(); this.applyMusic();
  }
  applyVolumes() {
    const s = this.settings, duck = this.ducked ? 0 : 1;
    if (this.sfx) this.sfx.gain.value = s.sfxVol * 0.6;
    if (this.bgm) this.bgm.gain.value = s.musicVol * 0.5 * duck;
    this.opera.volume = Math.min(1, s.musicVol) * duck;
  }
  // pause music while e.g. a YouTube video plays
  duck(on) { this.ducked = on; this.applyVolumes(); if (this.settings.music === 'opera') { on ? this.opera.pause() : this.opera.play().catch(() => { }); } }
  applyMusic() {
    const m = this.settings.music;
    if (m === 'opera') { this.opera.play().catch(() => { }); } else this.opera.pause();
    if (m === 'default') this._startBgm(); else this._stopBgm();
    this.applyVolumes();
  }
  // ---------- built-in BGM: upbeat 8-bar loop at 116 BPM ----------
  _startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const bpm = 116, step = 60 / bpm / 2; // 8th notes
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
    const bass = [45, 41, 36, 43];
    const mel = [76, 0, 74, 72, 74, 0, 69, 0, 72, 0, 72, 74, 76, 0, 79, 0, 76, 0, 74, 72, 69, 0, 67, 0, 69, 72, 74, 0, 72, 0, 0, 0,
      76, 0, 74, 72, 74, 0, 69, 0, 72, 0, 74, 76, 79, 0, 81, 0, 79, 76, 74, 0, 72, 0, 74, 0, 76, 0, 74, 72, 69, 0, 0, 0];
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    let i = 0, next = this.ctx.currentTime + 0.1;
    const note = (f, t, dur, type, vol) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.bgm); o.start(t); o.stop(t + dur + 0.05);
    };
    const drum = (t, kind) => {
      if (kind === 'k') { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(this.bgm); o.start(t); o.stop(t + 0.2); }
      else {
        const len = kind === 's' ? 0.15 : 0.04; const b = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate); const d = b.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length);
        const s = this.ctx.createBufferSource(); s.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = kind === 's' ? 1500 : 7000;
        const g = this.ctx.createGain(); g.gain.value = kind === 's' ? 0.25 : 0.12; s.connect(f); f.connect(g); g.connect(this.bgm); s.start(t);
      }
    };
    const tick = () => {
      while (next < this.ctx.currentTime + 0.25) {
        const bar = Math.floor(i / 8) % 4, beat = i % 8;
        if (beat % 2 === 0) note(hz(bass[bar]), next, step * 1.6, 'square', 0.12);
        if (beat === 0 || beat === 3 || beat === 6) for (const c of chords[bar]) note(hz(c), next, step * 2.5, 'triangle', 0.05);
        const mn = mel[i % mel.length]; if (mn) note(hz(mn), next, step * 1.4, 'square', 0.06);
        if (beat === 0 || beat === 4) drum(next, 'k'); if (beat === 2 || beat === 6) drum(next, 's'); drum(next, 'h');
        next += step; i++;
      }
    };
    this.bgmTimer = setInterval(tick, 60); tick();
  }
  _stopBgm() { if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; } }

  setEngine(on, speed01, kind) {
    if (!this.engine) return;
    const t = this.ctx.currentTime, e = this.engine;
    const base = kind === 'scooter' ? 70 : 45;
    e.o.frequency.setTargetAtTime(base + speed01 * (kind === 'scooter' ? 160 : 110), t, 0.08);
    e.o2.frequency.setTargetAtTime((base + speed01 * 100) / 2, t, 0.08);
    e.f.frequency.setTargetAtTime(300 + speed01 * 900, t, 0.1);
    e.g.gain.setTargetAtTime(on ? 0.07 + speed01 * 0.06 : 0, t, 0.15);
  }
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  horn(pitch = 1, vol = 1) { this.tone(420 * pitch, 0.35, 'square', 0.08 * vol); this.tone(530 * pitch, 0.35, 'square', 0.06 * vol); }
  pickup() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.18, i * 0.06)); }
  vote() { this.tone(880, 0.1, 'triangle', 0.15); this.tone(1175, 0.18, 'triangle', 0.15, 0.08); }
  bad() { this.tone(220, 0.25, 'sawtooth', 0.1, 0, 0.6); }
  bump(i = 1) { this.tone(90, 0.2, 'sawtooth', Math.min(0.25, 0.05 * i), 0, 0.5); }
  checkpoint() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'square', 0.08, i * 0.07)); }
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.6 : 0.18, 'square', 0.09, i * 0.13)); }
  blip() { this.tone(1200, 0.04, 'square', 0.04); }
}
