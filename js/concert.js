// 演唱會：手機「拓原系統」App 搶 ITZY / aespa 在林口體育館的演唱會門票，開演當天搭接駁車進場。
// - 每團每週一場（day + 7n，19:00），開演前兩天 12:00 開賣；越貴的區越早賣完，開賣 45 分鐘（遊戲時間）全部售完。
// - 搶票：排隊 → 選區（錢不夠買不了）→ 依序按驗證碼（限時）→ 付款成功，票會存檔。
// - 林口體育館在地圖外（js/arena.js）。19:00 開演：主螢幕疊上 YouTube 播放器（youtube-nocookie，官方頻道的 MV），
//   依序輪播該團的播放清單，播不了的（不給嵌入）自動跳下一首；播完就散場。音樂和畫面都直接來自官方影片，遊戲裡不存任何檔案。
import * as THREE from 'three';
import { ARENA_ZONES } from './arena.js';
import { createCharacter, randomStudent } from './character.js';
import { makeLabel } from './map.js';

// official M/Vs (checked with YouTube oEmbed: JYP Entertainment / SMTOWN channels)
export const CONCERTS = [
  {
    id: 'itzy', name: 'ITZY', title: 'ITZY LIVE in TAIPEI', day: 2, color: '#ff4fa3', color2: '#ffd23f',
    videos: ['pNfTK39k55U', 'zndvqTc4P9I', 'fE2h3lGlOsk', 'wTowEKjDGkU', '_ysomCGaZLw', 'MjCZfZfucEc'], // DALLA DALLA, ICY, WANNABE, Not Shy, 마.피.아. In the morning, LOCO
  },
  {
    id: 'aespa', name: 'aespa', title: 'aespa LIVE in TAIPEI', day: 4, color: '#9b7bff', color2: '#7fe3ff',
    videos: ['ZeerrnuLi5E', '4TWR90KJl84', 'WPdWvnAAurg', 'Os_heh8vPfs', 'D8VEhcPeSlc', 'phuiiNCxRMg', 'jWQx2f-CErU'], // Black Mamba, Next Level, Savage, Spicy, Drama, Supernova, Whiplash
  },
];
const DAY = 1440, SHOW_AT = 19 * 60, SALE_AT = 12 * 60, SALE_LEN = 45, GATE_OPEN = 17 * 60, GATE_CLOSE = 21 * 60 + 30;
// minutes after the sale opens when each zone (ARENA_ZONES order: 6880 … 1880) is gone: the dearest go first
const SOLD_AFTER = [10, 16, 23, 30, 38, 45];
const WK = ['一', '二', '三', '四', '五', '六', '日'];
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const when = (day, m) => `第 ${day + 1} 天（週${WK[((day % 7) + 7) % 7]}）${hhmm(m)}`;

// ---- CSS matrix3d that maps a w x h box onto 4 screen points (homography) ----
const adj = m => [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]];
const mm = (a, b) => { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; };
const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const basis = (p) => { const m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1], v = mv(adj(m), [p[6], p[7], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); };
function quadCss(w, h, dst) {
  const t = mm(basis(dst), adj(basis([0, 0, w, 0, 0, h, w, h])));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
}

let ytReady = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise((res, rej) => {
    if (window.YT?.Player) return res(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => { ytReady = null; rej(new Error('offline')); };
    document.head.appendChild(s);
  });
  return ytReady;
}

export class Concerts {
  constructor(game) {
    this.g = game; this.ar = game.interiors.arena;
    this.tickets = {};          // id -> { show (day), zone (index), seat }
    this.inArena = null;        // { c, show, zone, back: {x,z,h} } while you are at the 林口體育館
    this.state = 'off';         // off | wait | live | over
    this.told = new Set();      // reminder toasts already shown (sale opening / show day)
    this.t = 0; this.beat = 0;
    const I = game.interiors, P = this.ar.plaza, out = () => this.inArena && !this.inArena.inside;
    for (const ex of this.ar.exits) I.actions.push({ // green EXIT doors at the back of the floor and the top of the upper ring
      x: ex.x, z: ex.z, r: 2.6, y: ex.y, cond: () => !!this.inArena?.inside,
      label: () => '按 <kbd>E</kbd> 從出口離開場館',
      fn: () => this.exitToPlaza(),
    });
    I.actions.push({ x: P.gate.x, z: P.gate.z, r: 4.5, y: 0, cond: out, label: () => '按 <kbd>E</kbd> 驗票入場（工作人員）', fn: () => this.checkIn() });
    I.actions.push({ x: P.bus.x, z: P.bus.z, r: 5, y: 0, cond: out, label: () => '按 <kbd>E</kbd> 搭接駁車回中原', fn: () => this.leave() });
    for (const st of P.stalls) I.actions.push({ x: st.counter.x, z: st.counter.z, r: 2.2, y: 0, cond: out, label: () => `按 <kbd>E</kbd> 逛攤販：${st.name}`, fn: () => this.stall(st) });
    game.interiors.updaters.push((dt) => this.update(dt));
  }
  // ---------------- schedule ----------------
  // the next show of c that hasn't finished yet: { show (day), open (sale start, min), sold (min) }
  next(c, clock = this.g.clock) {
    let show = c.day; while (show * DAY + GATE_CLOSE <= clock) show += 7;
    const open = (show - 2) * DAY + SALE_AT;
    return { show, open, sold: open + SALE_LEN, start: show * DAY + SHOW_AT };
  }
  zoneSold(n, zi, clock = this.g.clock) { return clock >= n.open + SOLD_AFTER[zi]; }
  ticket(c) { const t = this.tickets[c.id]; return t && t.show * DAY + GATE_CLOSE > this.g.clock ? t : null; }
  // ---------------- per frame ----------------
  update(dt) {
    const g = this.g, clock = g.clock;
    for (const c of CONCERTS) {
      const n = this.next(c), tk = this.ticket(c);
      const key1 = `sale-${c.id}-${n.show}`, key2 = `day-${c.id}-${n.show}`;
      if (!tk && clock >= n.open - 30 && clock < n.open && !this.told.has(key1)) { this.told.add(key1); g.hud.toast(`🎫 ${c.title} 門票 ${hhmm(n.open)} 開賣！打開手機「拓原系統」`, 'good', 3200); g.audio.notify?.(); }
      if (tk && clock >= n.show * DAY + GATE_OPEN && clock < n.start && !this.told.has(key2)) { this.told.add(key2); g.hud.toast(`🎤 今晚 ${hhmm(SHOW_AT)} ${c.name} 演唱會！打開「拓原系統」搭接駁車去林口體育館`, 'good', 3600); g.audio.notify?.(); }
    }
    if (!this.inArena) return;
    const A = this.inArena;
    if (this.state === 'wait' && clock >= A.start) { if (A.inside) this.startShow(); else if (!A.toldLate) { A.toldLate = true; g.hud.toast(`🎤 ${A.c.name} 開演了！快去入口驗票進場`, 'bad', 3200); } }
    this.t += dt;
    if (A.inside) this._animate(dt); else this._plazaPeople(dt);
  }
  _animate(dt) {
    const ar = this.ar, live = this.state === 'live', c = this.inArena.c, t = this.t;
    // beams sweep while the show is on
    ar.beams.forEach((b, i) => {
      b.visible = live;
      b.rotation.z = Math.sin(t * 0.8 + i) * 0.55; b.rotation.x = 0.35 + Math.sin(t * 0.6 + i * 1.7) * 0.25;
      b.material.color.set(i % 2 ? c.color : c.color2); b.material.opacity = 0.08 + 0.05 * Math.sin(t * 3 + i);
    });
    // lightsticks bob on the GPU (arena.js stick shader): to a ~120 bpm beat while the show is on
    ar.U.uT.value = t; ar.U.uAmp.value = live ? 0.24 : 0.05; ar.U.uSpd.value = live ? 6.3 : 1.5;
    ar.lamps.visible = !live || Math.sin(t * 6.3) > -0.6;
    // LED ribbon round the upper ring: the group name and hearts scroll past
    if (ar.ribbonTex.userData.c !== c.id + this.state) {
      ar.ribbonTex.userData.c = c.id + this.state;
      const x = ar.ribbonTex.image.getContext('2d'), gr = x.createLinearGradient(0, 0, 1024, 0);
      gr.addColorStop(0, c.color); gr.addColorStop(0.5, c.color2); gr.addColorStop(1, c.color);
      x.fillStyle = '#05060a'; x.fillRect(0, 0, 1024, 64); x.fillStyle = gr; x.font = '900 40px "Noto Sans TC",sans-serif'; x.textBaseline = 'middle';
      const txt = live ? `♥ ${c.name} LIVE in TAIPEI ♥ 林口體育館 ` : this.state === 'over' ? `THANK YOU ♥ ${c.name} ♥ ` : `${c.name} ♥ ${hhmm(SHOW_AT)} 開演 ♥ `;
      for (let px = 10, i = 0; px < 1024 && i < 6; i++) { x.fillText(txt, px, 34); px += x.measureText(txt).width; }
      ar.ribbonTex.needsUpdate = true;
    }
    ar.ribbonTex.offset.x = (ar.ribbonTex.offset.x + dt * (live ? 0.06 : 0.02)) % 1;
    // side screens: group name and a level meter in the show colours
    if ((this._sideT = (this._sideT || 0) + dt) > 0.12) {
      this._sideT = 0;
      const cv = ar.sideTex.image, g2 = cv.getContext('2d');
      g2.fillStyle = '#05060a'; g2.fillRect(0, 0, 512, 288);
      if (live || this.state === 'wait' || this.state === 'over') {
        const gr = g2.createLinearGradient(0, 0, 512, 288); gr.addColorStop(0, c.color); gr.addColorStop(1, c.color2);
        g2.fillStyle = gr; g2.font = '900 76px "Noto Sans TC",sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
        g2.fillText(c.name, 256, 110);
        g2.font = '700 26px "Noto Sans TC",sans-serif'; g2.fillStyle = '#fff';
        g2.fillText(this.state === 'wait' ? `${hhmm(SHOW_AT)} 開演` : this.state === 'over' ? 'THANK YOU TAIPEI ♥' : 'LIVE in TAIPEI · 林口體育館', 256, 175);
        if (live) for (let b = 0; b < 24; b++) { const h = 10 + Math.abs(Math.sin(t * 7 + b * 0.9)) * 50; g2.fillStyle = b % 2 ? c.color : c.color2; g2.fillRect(28 + b * 19, 270 - h, 12, h); }
      }
      ar.sideTex.needsUpdate = true;
    }
  }
  // lay the YouTube player over the main screen (called right before the frame is drawn)
  frame() {
    if (this.inArena?.inside) this._stickFollow();
    const el = this.el; if (!el || !this.inArena) return;
    const cam = this.g.camera, cv = this.g.renderer.domElement.getBoundingClientRect();
    const pts = [];
    for (const p of this.ar.screen) {
      const v = (this._v ||= p.clone()).copy(p).applyMatrix4(cam.matrixWorldInverse);
      if (v.z > -0.5) { el.style.opacity = '0'; return; } // a corner is behind the camera
      v.applyMatrix4(cam.projectionMatrix);
      pts.push(cv.left + (v.x + 1) / 2 * cv.width, cv.top + (1 - v.y) / 2 * cv.height);
    }
    el.style.opacity = this.g.state === 'play' ? '1' : '0';
    el.style.transform = quadCss(1280, 720, pts);
  }
  // ---------------- show ----------------
  startShow() {
    const g = this.g, c = this.inArena.c;
    this.state = 'live'; this.ar.fx.visible = true;
    this._sticks(i => (i % 3 === 2 ? c.color2 : c.color));
    g.audio.duck(true);
    g.hud.toast(`🎤 ${c.title} 開始！`, 'good', 3000);
    const el = this.el = document.createElement('div'); el.id = 'concertScreen';
    el.innerHTML = '<div id="concertYT"></div><div class="cs-msg">連線到 YouTube…</div>';
    document.body.appendChild(el);
    loadYT().then((YT) => {
      if (this.el !== el) return;
      this.player = new YT.Player('concertYT', {
        width: 1280, height: 720, host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0, origin: location.origin },
        events: {
          onReady: (e) => { e.target.loadPlaylist({ playlist: c.videos, index: 0 }); el.querySelector('.cs-msg')?.remove(); setTimeout(() => this._checkPlaying(), 4000); },
          onStateChange: (e) => { if (e.data === 0 && e.target.getPlaylistIndex() >= c.videos.length - 1) this.endShow(); },
          onError: () => { const p = this.player; if (!p) return; if (p.getPlaylistIndex() >= c.videos.length - 1) this.endShow(); else p.nextVideo(); },
        },
      });
    }).catch(() => { const m = el.querySelector('.cs-msg'); if (m) m.textContent = '需要網路才能播放演唱會影片'; });
  }
  // nobody stands where your ticket puts you (the crowd's spots are in the arena's local frame)
  _makeRoom(x, z, y) {
    const ar = this.ar, o = ar.fx.position, m = new THREE.Matrix4();
    ar.spots.forEach((sp, i) => {
      sp.hidden = Math.hypot(sp[0] + o.x - x, sp[2] + o.z - z) < 2.2 && Math.abs(sp[1] - y) < 1.2; // none right in your face
      if (sp.hidden) m.makeScale(0, 0, 0); else m.makeTranslation(sp[0], sp[1] + 1.7 + ((i * 37) % 10) / 40, sp[2]);
      ar.sticks.setMatrixAt(i, m);
    });
    ar.sticks.instanceMatrix.needsUpdate = true;
  }
  _sticks(f) { const s = this.ar.sticks; for (let i = 0; i < this.ar.spots.length; i++) s.setColorAt(i, colorOf(f(i))); s.instanceColor.needsUpdate = true; }
  // browsers may block sound before you have clicked the page: then play muted and say how to unmute
  _checkPlaying() {
    const p = this.player; if (!p?.getPlayerState) return;
    if (p.getPlayerState() !== 1) { p.mute(); p.playVideo(); this.g.hud.toast('🔇 瀏覽器擋住了自動播放的聲音，按 U 開聲音', 'bad', 4000); }
  }
  toggleMute() { const p = this.player; if (!p?.isMuted) return; if (p.isMuted()) { p.unMute(); this.g.hud.toast('🔊 聲音開啟', 'good', 1400); } else { p.mute(); this.g.hud.toast('🔇 已靜音', 'good', 1400); } }
  endShow() {
    if (this.state !== 'live') return;
    this.state = 'over';
    this.g.hud.toast(`🎉 ${this.inArena.c.name} 演唱會結束！到後方的綠色 EXIT 出口按 E 離開場館`, 'good', 4200);
    this._stopVideo();
    this.g.audio.duck(false);
  }
  _stopVideo() { try { this.player?.destroy(); } catch (e) { } this.player = null; this.el?.remove(); this.el = null; }
  // ---------------- travel ----------------
  fade(text, mid, after) {
    let el = document.getElementById('sleepFade');
    if (!el) { el = document.createElement('div'); el.id = 'sleepFade'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('on'); this._moving = true;
    setTimeout(() => { mid(); setTimeout(() => { el.classList.remove('on'); this._moving = false; after?.(); }, 1500); }, 1300);
  }
  // 搭接駁車：先到林口體育館的外場（攤販、排隊），到入口給工作人員驗票才能進場
  go(c) {
    const g = this.g, pl = g.player, tk = this.ticket(c), n = this.next(c);
    if (!tk || this.inArena || this._moving) return;
    if (pl.vehicle) { g.hud.toast('先下車再去搭接駁車喔', 'bad', 2200); return; }
    g.phone.close(); g.phone._last = null;
    const wp = pl.worldPos(), back = { x: wp.x, z: wp.z, h: pl.worldHeading() }, P = this.ar.plaza;
    this.fade('🚌 搭接駁車前往林口體育館…', () => {
      if (pl.seat) pl.standUp();
      g.clock = Math.max(g.clock + 50, n.show * DAY + 17 * 60 + 30); g.hud.setClock?.(g.clock);
      this.inArena = { c, show: n.show, zone: tk.zone, start: n.start, back, inside: false };
      this._outside(c);
      pl.place(P.arrive.x, P.arrive.z, P.arrive.h); pl.y = 0; g.rig.yaw = P.arrive.h; g.rig.pitch = 0.1;
      this.state = 'wait'; this.t = 0;
    }, () => {
      g.hud.toast(`🏟️ 到林口體育館了！先逛逛攤販，再到入口給工作人員驗票進場（${c.title} ${hhmm(SHOW_AT)} 開演）`, 'good', 4600);
      g.lockPointer();
    });
  }
  // the plaza: tour banner, vendors, staff and people walking about (built the first time)
  _outside(c) {
    const P = this.ar.plaza, g = this.g; P.group.visible = true; this.ar.fx.visible = false;
    for (const [m, t] of [[P.banner, wrapTex(c)], [P.truck, bannerTex(c)]]) { m.material.map?.dispose?.(); m.material.map = t; m.material.color.set('#fff'); m.material.needsUpdate = true; }
    if (this.people) return;
    let s = 5; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const put = (look, x, z, h, label) => {
      const ch = createCharacter(look); ch.root.position.set(x, this.ar.base, z); ch.root.rotation.y = h; g.scene.add(ch.root);
      if (label) { const t = makeLabel(label, { height: 0.24, color: '#ffd23f' }); t.position.set(0, 2.05, 0); ch.root.add(t); }
      return ch;
    };
    this.people = [];
    for (const st of P.stalls) this.people.push({ ch: put(randomStudent(rnd), st.seller.x, st.seller.z, st.seller.h, `${st.name}`), still: true });
    for (const sp of P.staff) this.people.push({ ch: put({ skin: '#e9c4a3', shirt: '#111114', shorts: '#1b1b1d', pants: true, hair: '#1a1410', hairStyle: 'short', face: true, shoes: '#222' }, sp.x, sp.z, sp.h, '工作人員 STAFF'), still: true });
    for (const q of P.people) this.people.push({ ch: put(randomStudent(rnd), q.x, q.z, q.h), still: true });
    const W = P.walk;
    for (let i = 0; i < 14; i++) this.people.push({ ch: put(randomStudent(rnd), W[0].x, W[0].z, 0), walk: true, seg: i % 4, k: rnd(), off: (rnd() - 0.5) * 3, spd: 1.1 + rnd() * 0.5 });
    for (const p of this.people) p.ch.root.visible = true;
  }
  _plazaPeople(dt) {
    const W = this.ar.plaza.walk, pp = this.g.player.pos;
    for (const p of this.people || []) {
      const r = p.ch.root;
      if (p.walk) {
        const a = W[p.seg], b = W[(p.seg + 1) % W.length], L = Math.hypot(b.x - a.x, b.z - a.z);
        p.k += p.spd * dt / L; if (p.k >= 1) { p.k = 0; p.seg = (p.seg + 1) % W.length; continue; }
        const nx = -(b.z - a.z) / L, nz = (b.x - a.x) / L;
        r.position.set(a.x + (b.x - a.x) * p.k + nx * p.off, this.ar.base, a.z + (b.z - a.z) * p.k + nz * p.off); r.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      }
      p.ch.setDetail?.((r.position.x - pp.x) ** 2 + (r.position.z - pp.z) ** 2 < 30 * 30);
      p.ch.update(dt, { speed: p.walk ? p.spd : 0, mode: 'foot' });
    }
  }
  _showPeople(on) { for (const p of this.people || []) p.ch.root.visible = on; if (this.ar.plaza) this.ar.plaza.group.visible = on; }
  // 驗票口：QR code、包包檢查，通過就入場到你那一區
  checkIn() {
    const g = this.g, A = this.inArena; if (!A || A.inside || this._moving) return;
    const tk = this.tickets[A.c.id], z = ARENA_ZONES[A.zone];
    if (!tk || tk.used) { g.dialog([['工作人員', '不好意思，這張票已經入場過了，離場後不能再入場喔。'], ['彥霖', '啊……好吧 😢']]); return; }
    g.dialog([
      ['工作人員', `您好～${A.c.title} 這邊驗票，請出示票券 QR code。`],
      ['彥霖', '（打開手機）這裡！'],
      ['工作人員', `（嗶）${z.name}，${tk.seat}。包包打開檢查一下喔，不能帶自拍棒跟專業相機。`],
      ['彥霖', '只有手機跟行動電源～'],
      ['工作人員', z.kind === 'floor' ? '好，沒問題！站區請拿手環，往左邊通道進去，祝你看得開心！' : '好，沒問題！看台請往樓梯上去，祝你看得開心！'],
    ], () => this.fade('🎫 驗票通過，入場中…', () => {
      tk.used = true; A.inside = true;
      g.clock = Math.max(g.clock, A.start - 6); g.hud.setClock?.(g.clock);
      this._showPeople(false); this.ar.fx.visible = true;
      const s = this.ar.zoneSpot(A.zone), st = this.ar.stage, h = Math.atan2(st.x - s.x, st.z - s.z);
      g.player.place(s.x, s.z, h); g.player.y = s.y; g.rig.yaw = h; g.rig.pitch = -0.12;
      this._makeRoom(s.x, s.z, s.y);
      if (this.state !== 'live') this._sticks(() => '#e8e8e8');
      this._fp(true); this._myStick(true);
    }, () => { g.hud.toast(`🏟️ ${z.name} ${tk.seat}｜${hhmm(SHOW_AT)} 開演`, 'good', 3200); g.lockPointer(); }));
  }
  // through an EXIT door: back out to the plaza (the show goes on without you)
  exitToPlaza() {
    const g = this.g, A = this.inArena; if (!A || !A.inside || this._moving) return;
    this.fade('🚶 離開場館…', () => {
      if (this.state === 'live') { this._stopVideo(); g.audio.duck(false); this.state = 'over'; }
      A.inside = false; this.ar.fx.visible = false; this._showPeople(true); this._myStick(false); this._fp(false);
      const o = this.ar.plaza.out; g.player.place(o.x, o.z, o.h); g.player.y = 0; g.rig.yaw = o.h;
    }, () => g.hud.toast('🚌 接駁車在廣場另一頭的公車站，走過去按 E 搭車回中原', 'good', 3600));
  }
  // inside the hall you watch in first person (no body in the way of the stage); js/player.js CameraRig.fp
  _fp(on) { const g = this.g; g.rig.fp = on; g.player.ch.root.visible = !on; }
  // your own lightstick (bought at the 手燈 stall): held up at the lower right of the view during the show
  _myStick(on) {
    const A = this.inArena;
    if (this._stickMesh) { this._stickMesh.parent?.remove(this._stickMesh); this._stickMesh = null; }
    if (!on || !A || !this.bought?.has(`stick-${A.c.id}`)) return;
    this._stickMesh = makeLightstick(A.c); this.g.scene.add(this._stickMesh);
  }
  _stickFollow() {
    const m = this._stickMesh; if (!m) return;
    const cam = this.g.camera, live = this.state === 'live', t = this.t;
    const beat = live ? Math.abs(Math.sin(t * Math.PI * 2)) : 0; // ~120 bpm, two waves a second
    m.position.set(0.19 + (live ? Math.sin(t * Math.PI) * 0.015 : 0), -0.2 + beat * 0.03, -0.55).applyMatrix4(cam.matrixWorld);
    m.quaternion.copy(cam.quaternion); m.rotateX(0.18); m.rotateZ(-0.14 + (live ? Math.sin(t * Math.PI) * 0.16 : 0)); m.scale.setScalar(0.8);
    m.userData.pulse(live ? 0.75 + beat * 0.25 : 0.7);
  }
  // 攤販
  stall(st) {
    const g = this.g, A = this.inArena, c = A.c; this.bought ||= new Set();
    const ITEMS = {
      stick: [{ n: `${c.name} 應援手燈（非官方）`, p: 650, key: `stick-${c.id}`, t: '演唱會開始後會在你手上亮起來 ✨' }],
      card: [{ n: '小卡一包（隨機 5 張）', p: 150, t: '抽到本命了嗎？' }, { n: '應援手幅', p: 250, t: '進場舉起來！' }],
      food: [{ n: '雞排', p: 90, boost: 40, t: '香！體力回復' }, { n: '珍珠奶茶', p: 70, boost: 30, t: '體力回復' }],
      sausage: [{ n: '烤香腸（蒜頭免費）', p: 50, boost: 25, t: '體力回復' }],
      towel: [{ n: `${c.name} 應援毛巾`, p: 350, t: '掛在脖子上很有氣氛' }],
      free: [{ n: '粉絲自製應援小物（免費）', p: 0, key: `free-${c.id}-${A.show}`, t: '謝謝大大！' }],
    }[st.id];
    document.exitPointerLock?.();
    g.modal(`🛍️ ${st.name}`, `<div class="modal-btns">${ITEMS.map((it, i) => {
      const have = it.key && this.bought.has(it.key);
      return `<button class="menu-btn" data-i="${i}" ${have ? 'disabled' : ''}><span>${it.n}</span><small>${have ? '已購買' : it.p ? `NT$ ${it.p}` : '免費'}</small></button>`;
    }).join('')}<button class="menu-btn" id="stBye"><span>先逛逛</span><small>ESC</small></button></div>`, `零用錢 NT$ ${g.money}`);
    const done = () => { g.closeModal(); g.resume(); };
    document.getElementById('stBye').onclick = done;
    for (const b of document.querySelectorAll('#modalBody [data-i]')) b.onclick = () => {
      const it = ITEMS[+b.dataset.i]; done();
      if (it.p && !g.spend(it.p, `林口 ${it.n}`)) { g.dialog([['老闆', `${it.n} 一份 ${it.p} 元喔～`], ['彥霖', `（翻錢包）……只剩 ${g.money} 元 😅`]]); return; }
      if (it.key) this.bought.add(it.key);
      if (it.boost) g.player.boost = it.boost;
      g.audio.pickup?.(); g.hud.toast(`🛍️ ${it.n}：${it.t}`, 'good', 2600);
    };
  }
  // 接駁車回中原（公車站，或在拓原系統按離場）
  leave() {
    const g = this.g, A = this.inArena; if (!A || this._moving) return;
    this.fade('🚌 搭接駁車回中原…', () => {
      this._stopVideo(); if (this.state === 'live') g.audio.duck(false);
      this.state = 'off'; this.ar.fx.visible = false; this._showPeople(false); this._myStick(false); this._fp(false); this.inArena = null;
      delete this.tickets[A.c.id];
      g.clock = Math.max(g.clock + 60, A.show * DAY + 22 * 60 + 30); g.hud.setClock?.(g.clock);
      g.player.place(A.back.x, A.back.z, A.back.h); g.player.y = 0; g.rig.yaw = A.back.h;
    }, () => g.hud.toast('回到中原了！演唱會好看嗎？🎶', 'good', 2600));
  }
  // where to save you while you are at the concert: back where you took the shuttle
  savePos() { const b = this.inArena?.back; return b ? { x: b.x, z: b.z, h: b.h, y: 0 } : null; }
  toJSON() { return { tickets: this.tickets, told: [...this.told].slice(-20) }; }
  load(d) { if (!d) return; this.tickets = d.tickets || {}; for (const k of d.told || []) this.told.add(k); }

  // ---------------- 拓原系統（搶票 App） (rendered into the phone) ----------------
  app(ph) {
    const g = this.g; this.ph = ph; clearTimeout(this._appT);
    const cards = CONCERTS.map(c => {
      const n = this.next(c), tk = this.ticket(c), cl = g.clock;
      let st;
      if (this.inArena?.c === c) st = `<button class="cx-btn" data-leave="1">🚌 離場，搭接駁車回中原</button>`;
      else if (tk) {
        const gate = cl >= n.show * DAY + GATE_OPEN && cl < n.show * DAY + GATE_CLOSE;
        st = `<div class="cx-tk">🎫 ${ARENA_ZONES[tk.zone].name} · ${tk.seat}<small>NT$ ${ARENA_ZONES[tk.zone].price.toLocaleString()}</small></div>
          <button class="cx-btn" data-go="${c.id}" ${gate ? '' : 'disabled'}>🚌 搭接駁車去林口體育館</button>
          ${gate ? '' : `<div class="cx-note">開演當天 ${hhmm(GATE_OPEN)}–${hhmm(GATE_CLOSE)} 發車</div>`}`;
      } else if (cl < n.open) st = `<button class="cx-btn" disabled>⏳ ${when(Math.floor(n.open / DAY), SALE_AT)} 開賣</button><div class="cx-note">還有 ${Math.floor((n.open - cl) / 60)} 小時 ${Math.floor((n.open - cl) % 60)} 分</div>`;
      else if (cl < n.sold) st = `<button class="cx-btn hot" data-grab="${c.id}">🔥 立即搶票</button><div class="cx-note">開賣中！剩下的區域越來越少</div>`;
      else st = `<button class="cx-btn" disabled>已售完</button><div class="cx-note">下一場：${when(n.show + 7, SHOW_AT)}，${when(n.show + 5, SALE_AT)} 開賣</div>`;
      return `<div class="cx-card" style="--c1:${c.color};--c2:${c.color2}"><div class="cx-head"><b>${c.title}</b><small>林口體育館 · ${when(n.show, SHOW_AT)}</small></div>${st}</div>`;
    }).join('');
    const prices = ARENA_ZONES.map(z => `NT$ ${z.price.toLocaleString()}`).join('／');
    const el = ph._frame('拓原系統', `<div class="cx-top">🎫 拓原系統 · 演唱會售票<small>Peach Pay 餘額 NT$ ${g.money.toLocaleString()}</small></div>${cards}<div class="cx-note">票價：${prices}｜每場限購一張</div>`, { cls: 'ph-tix' });
    for (const b of el.querySelectorAll('[data-grab]')) b.onclick = () => this._queue(CONCERTS.find(c => c.id === b.dataset.grab));
    for (const b of el.querySelectorAll('[data-go]')) b.onclick = () => this.go(CONCERTS.find(c => c.id === b.dataset.go));
    el.querySelector('[data-leave]')?.addEventListener('click', () => { ph.close(); ph._last = null; this.leave(); });
    this._appT = setTimeout(() => { if (ph.open && ph.app === 'tix' && !this._busy) this.app(ph); }, 2000); // countdown refresh
  }
  _alive(c) { return this.ph?.open && this.ph.app === 'tix' && this._busy === c; }
  _queue(c) {
    const g = this.g, ph = this.ph, n = this.next(c); this._busy = c; clearTimeout(this._appT);
    const late = Math.max(0, g.clock - n.open);
    let ahead = Math.round(300 + late * 420 + Math.random() * 500); const total = ahead, t0 = performance.now(), dur = 2500 + Math.min(4000, ahead * 0.8);
    const el = ph._frame('排隊中', `<div class="cx-q"><b>${c.title}</b><div class="cx-qn">你前面還有 <span id="cxAhead">${ahead}</span> 人</div><div class="cx-bar"><i id="cxBar"></i></div><small>請勿關閉頁面，輪到你會自動進入選位</small></div>`, { cls: 'ph-tix', back: '拓原系統', onBack: () => { this._busy = null; this.app(ph); } });
    const tick = () => {
      if (!this._alive(c)) return;
      const k = Math.min(1, (performance.now() - t0) / dur); ahead = Math.round(total * (1 - k));
      el.querySelector('#cxAhead').textContent = ahead; el.querySelector('#cxBar').style.width = `${k * 100}%`;
      if (k < 1) requestAnimationFrame(tick); else this._zones(c);
    };
    requestAnimationFrame(tick);
  }
  _zones(c, msg = '') {
    const g = this.g, ph = this.ph, n = this.next(c);
    if (g.clock >= n.sold) { this._busy = null; ph._frame('售完', `<div class="cx-q"><b>😭 全部售完了</b><small>下次開賣早點進來排隊！</small></div>`, { cls: 'ph-tix', back: '拓原系統', onBack: () => this.app(ph) }); return; }
    const rows = ARENA_ZONES.map((z, i) => {
      const sold = this.zoneSold(n, i), left = sold ? 0 : Math.max(1, Math.round((n.open + SOLD_AFTER[i] - g.clock) / SOLD_AFTER[i] * 100));
      return `<button class="cx-zone" data-z="${i}" ${sold ? 'disabled' : ''}><span>${z.name}<small>${sold ? '已售完' : `剩餘 ${left}%`}</small></span><b>NT$ ${z.price.toLocaleString()}</b></button>`;
    }).join('');
    const el = ph._frame('選擇區域', `<div class="cx-top">${c.title}<small>餘額 NT$ ${g.money.toLocaleString()}</small></div>${msg ? `<div class="cx-err">${msg}</div>` : ''}${rows}`, { cls: 'ph-tix', back: '拓原系統', onBack: () => { this._busy = null; this.app(ph); } });
    for (const b of el.querySelectorAll('[data-z]')) b.onclick = () => {
      const zi = +b.dataset.z, z = ARENA_ZONES[zi];
      if (this.zoneSold(this.next(c), zi)) return this._zones(c, `${z.name} 剛剛賣完了！`);
      if (g.money < z.price) return this._zones(c, `餘額不足：${z.name} 要 NT$ ${z.price.toLocaleString()}，還差 NT$ ${(z.price - g.money).toLocaleString()}`);
      this._captcha(c, zi);
    };
  }
  _captcha(c, zi) {
    const ph = this.ph, code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10));
    const keys = [...Array(10).keys()].sort(() => Math.random() - 0.5);
    let typed = []; const t0 = performance.now(), LIMIT = 12000;
    const el = ph._frame('驗證', `<div class="cx-q"><b>${ARENA_ZONES[zi].name} · NT$ ${ARENA_ZONES[zi].price.toLocaleString()}</b>
      <small>依序按下驗證碼完成付款</small><div class="cx-code">${code.map((d, i) => `<span style="transform:rotate(${(Math.random() - 0.5) * 30}deg)">${d}</span>`).join('')}</div>
      <div class="cx-typed" id="cxTyped">＿ ＿ ＿ ＿</div><div class="cx-bar"><i id="cxBar"></i></div>
      <div class="cx-pad">${keys.map(k => `<button data-k="${k}">${k}</button>`).join('')}</div></div>`, { cls: 'ph-tix', back: '選區', onBack: () => this._zones(c) });
    const bar = el.querySelector('#cxBar');
    const tick = () => {
      if (!this._alive(c) || !el.isConnected) return;
      const k = (performance.now() - t0) / LIMIT; bar.style.width = `${Math.max(0, 1 - k) * 100}%`;
      if (k >= 1) return this._zones(c, '付款逾時，票被別人搶走了！再選一次');
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    for (const b of el.querySelectorAll('[data-k]')) b.onclick = () => {
      typed.push(+b.dataset.k); this.g.audio.tap?.();
      el.querySelector('#cxTyped').textContent = [0, 1, 2, 3].map(i => typed[i] ?? '＿').join(' ');
      if (typed.length < 4) return;
      if (typed.join('') !== code.join('')) return this._captcha(c, zi);
      this._buy(c, zi);
    };
  }
  _buy(c, zi) {
    const g = this.g, ph = this.ph, n = this.next(c), z = ARENA_ZONES[zi];
    if (this.zoneSold(n, zi)) return this._zones(c, `${z.name} 剛剛賣完了！`);
    if (!g.spend(z.price, `${c.name} 演唱會 ${z.name}`)) return this._zones(c, '餘額不足');
    const seat = z.kind === 'floor' ? `${String.fromCharCode(65 + Math.floor(Math.random() * 8))}${1 + Math.floor(Math.random() * 30)} 號` : `${3 + Math.floor(Math.random() * 18)} 排 ${1 + Math.floor(Math.random() * 30)} 號`;
    this.tickets[c.id] = { show: n.show, zone: zi, seat };
    this._busy = null; g.audio.pickup?.();
    ph._frame('購票成功', `<div class="cx-q"><b>🎉 搶到了！</b><div class="cx-tk">🎫 ${c.title}<small>${z.name} · ${seat}</small><small>${when(n.show, SHOW_AT)} · 林口體育館</small></div>
      <small>開演當天 ${hhmm(GATE_OPEN)} 起可以在這裡搭接駁車進場</small></div>`, { cls: 'ph-tix', back: '拓原系統', onBack: () => this.app(ph) });
    g.hud.toast(`🎫 搶到 ${c.name} ${z.name}！`, 'good', 3000);
  }
}
const _C = {};
// 應援手燈 (non-official, one look per group): curved grip with rubber rings and a lit button, metal collar, a
// translucent shell round a bright core (ITZY: round shell with a heart inside; aespa: faceted crystal), and a soft glow
function makeLightstick(c) {
  const g = new THREE.Group(), col = new THREE.Color(c.color), dark = c.id === 'aespa';
  const body = new THREE.MeshStandardMaterial({ color: dark ? '#1c1c22' : '#f4f2ee', roughness: 0.25, metalness: 0.15, emissive: col, emissiveIntensity: 0.06 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#3a3a40', roughness: 0.9, emissive: col, emissiveIntensity: 0.03 });
  const metal = new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 0.9, roughness: 0.2, emissive: col, emissiveIntensity: 0.1 });
  const prof = [[0, 0], [0.016, 0], [0.019, 0.012], [0.0175, 0.05], [0.0155, 0.1], [0.0165, 0.135], [0.022, 0.158], [0.0215, 0.165], [0, 0.165]].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 28), body));
  for (const y of [0.04, 0.058, 0.076]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0172, 0.0022, 6, 24), rubber); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.014, 0.005), new THREE.MeshBasicMaterial({ color: c.color, toneMapped: false }));
  btn.position.set(0, 0.118, 0.0158); g.add(btn);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0018, 5, 20), rubber); strap.position.set(0, -0.016, 0); strap.rotation.y = 0.4; g.add(strap);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.023, 0.012, 28), metal); collar.position.y = 0.171; g.add(collar);
  const head = new THREE.Group(); head.position.y = 0.177 + 0.052; g.add(head);
  const shellMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.2, emissive: col, emissiveIntensity: 0.55, depthWrite: false, flatShading: dark });
  const coreMat = new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color('#ffffff'), 0.35), toneMapped: false });
  if (dark) { // aespa: faceted crystal with a bright inner crystal
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 1), shellMat); sh.scale.set(0.85, 1.15, 0.85); head.add(sh);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 0), coreMat); core.scale.set(0.8, 1.3, 0.8); head.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.0028, 6, 6), metal); ring.rotation.x = Math.PI / 2; head.add(ring);
  } else { // ITZY: round shell, a heart glowing inside
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.054, 32, 20), shellMat); sh.scale.set(1, 1.05, 0.9); head.add(sh);
    const hs = new THREE.Shape(); hs.moveTo(0, -0.022); hs.bezierCurveTo(-0.03, 0.0, -0.022, 0.026, 0, 0.012); hs.bezierCurveTo(0.022, 0.026, 0.03, 0.0, 0, -0.022);
    const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 16 }); hg.center();
    head.add(new THREE.Mesh(hg, coreMat));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.0545, 0.0025, 6, 40), metal); band.rotation.x = Math.PI / 2; band.position.y = -0.03; band.scale.set(0.9, 0.82, 1); head.add(band);
  }
  const glowTex = _C.glow ||= (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.scale.setScalar(0.15); head.add(glow);
  g.userData.pulse = (k) => { glow.material.opacity = 0.2 + 0.35 * k; shellMat.emissiveIntensity = 0.35 + 0.45 * k; };
  g.traverse(o => { o.castShadow = false; o.renderOrder = 20; });
  return g;
}
// the tour banner wrapped round the plinth: title blocks between colour panels with lightstick-sea silhouettes
function wrapTex(c) {
  const cv = document.createElement('canvas'); cv.width = 4096; cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = '#0d0d14'; g.fillRect(0, 0, 4096, 256);
  for (let i = 0; i < 6; i++) {
    const x0 = i * 682, gr = g.createLinearGradient(x0, 0, x0 + 682, 256); gr.addColorStop(0, i % 2 ? c.color : c.color2); gr.addColorStop(1, '#151020');
    if (i % 2) { g.fillStyle = gr; g.fillRect(x0 + 8, 8, 666, 240); g.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 120; k++) { g.beginPath(); g.arc(x0 + 20 + Math.random() * 640, 150 + Math.random() * 90, 2 + Math.random() * 3, 0, 7); g.fill(); } }
    else {
      const t = g.createLinearGradient(x0, 0, x0 + 682, 0); t.addColorStop(0, c.color); t.addColorStop(1, c.color2);
      g.fillStyle = t; g.font = '900 110px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.name, x0 + 341, 105);
      g.fillStyle = '#fff'; g.font = '700 34px "Noto Sans TC",sans-serif'; g.fillText('2026 LIVE TOUR in TAIPEI', x0 + 341, 195);
    }
  }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
// the tour banner by the entrance
function bannerTex(c) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 288; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 1024, 288); gr.addColorStop(0, '#0b0b12'); gr.addColorStop(1, '#1d1530'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 288);
  const t = g.createLinearGradient(0, 0, 1024, 0); t.addColorStop(0, c.color); t.addColorStop(1, c.color2);
  g.fillStyle = t; g.font = '900 120px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.name, 512, 120);
  g.fillStyle = '#fff'; g.font = '700 38px "Noto Sans TC",sans-serif'; g.fillText('LIVE in TAIPEI · 林口體育館', 512, 220);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function colorOf(hex) { return _C[hex] ||= new THREE.Color(hex); }
