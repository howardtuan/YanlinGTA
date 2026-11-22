// Keyboard / mouse / touch / gamepad input
// Standard mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back/View, 9 Start/Menu, 10 L3, 11 R3, 12-15 D-pad U/D/L/R
export const PAD_MAPS = {
  play: [[0, 'KeyE'], [1, 'KeyF'], [2, 'Mouse0'], [3, 'KeyG'], [4, 'KeyH'], [5, 'Space'], [8, 'KeyM'], [9, 'Escape'], [10, 'ShiftLeft'], [11, 'KeyV'],
    [12, 'ArrowUp'], [13, 'ArrowDown'], [14, 'ArrowLeft'], [15, 'ArrowRight']],
  // i-Piyan: A open / send, B back, X send, Y or Start put the phone away
  phone: [[0, 'Enter'], [1, 'Escape'], [2, 'Tab'], [3, 'KeyE'], [9, 'KeyE'], [12, 'ArrowUp'], [13, 'ArrowDown'], [14, 'ArrowLeft'], [15, 'ArrowRight']],
  // map (phone held sideways): A pins the crosshair, stick / D-pad pan, B / View / Start close it
  map: [[0, 'Enter'], [1, 'Escape'], [8, 'KeyM'], [9, 'Escape'], [12, 'ArrowUp'], [13, 'ArrowDown'], [14, 'ArrowLeft'], [15, 'ArrowRight']],
  // race results: A continue, X / Y race again
  race: [[0, 'Enter'], [9, 'Enter'], [2, 'KeyR'], [3, 'KeyR']],
  // side-gate duty: A let in, B turn away, Y / Start leave the booth
  gate: [[0, 'Digit1'], [1, 'Digit2'], [3, 'KeyE'], [9, 'KeyE']],
  // McDonald's shift: D-pad up/right/down/left + X / Y pick items 1-6, A serve, B remove last, Start clock out
  job: [[12, 'Digit1'], [15, 'Digit2'], [13, 'Digit3'], [14, 'Digit4'], [2, 'Digit5'], [3, 'Digit6'], [0, 'Enter'], [1, 'Backspace'], [9, 'KeyE']],
};
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered this frame
    this.mdx = 0; this.mdy = 0; this.wheel = 0;
    this.locked = false; this.enabled = false;
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.joy = { x: 0, y: 0, active: false, id: null };
    // gamepad (browser Gamepad API, standard mapping: Xbox / PlayStation / Switch Pro)
    this.pad = { connected: false, axis: { x: 0, y: 0 }, held: new Set(), btn: [], hits: new Set(), ctx: 'play', block: new Set() };
    this.padContext = () => 'play'; // main.js swaps in the phone / gate / job layouts
    this.padDriving = () => false;  // main.js: true while riding / driving
    this.onPad = null;
    // last device used ('kb' = keyboard / mouse / touch, 'pad'); prompts.js swaps the on-screen key hints
    this.device = 'kb'; this.onDevice = null;
    addEventListener('gamepadconnected', e => { this.pad.connected = true; this.onPad?.(true, e.gamepad.id); });
    addEventListener('gamepaddisconnected', () => { this.pad.connected = !!this._firstPad(); this.onPad?.(this.pad.connected, ''); });
    addEventListener('keydown', e => {
      this._use('kb');
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.releaseAll());
    // iOS control-center / app switch doesn't always fire blur
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });
    // older Safari: requestPointerLock returns no Promise, failure only fires this event.
    // Only count failures of our own click-to-lock request; game.js retries (resume, closeVideo) may be refused briefly after Esc.
    document.addEventListener('pointerlockerror', () => { if (this._lockPending) this.lockFailed = true; this._lockPending = false; });
    addEventListener('mousedown', () => this._use('kb'));
    addEventListener('touchstart', () => this._use('kb'), { passive: true });
    canvas.addEventListener('mousedown', e => {
      if (!this.enabled || this.touch) return;
      this.pressed.add('Tap'); // any click on the game view (even the one that only grabs the mouse) can advance a dialog
      if (!this.locked && !this.lockFailed) {
        this._lockPending = true;
        try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => { this.lockFailed = true; }); } catch (err) { this.lockFailed = true; }
        return;
      }
      this.dragging = !this.locked; // fallback: click-drag to look around
      this.pressed.add(`Mouse${  e.button}`); this.keys.add(`Mouse${  e.button}`);
    });
    addEventListener('mouseup', e => { this.keys.delete(`Mouse${  e.button}`); this.dragging = false; });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; this._lockPending = false; });
    addEventListener('mousemove', e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) this._use('kb'); if (this.locked || this.dragging) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    if (this.touch) this._setupTouch();
  }
  _use(d) { if (d !== this.device) { this.device = d; this.onDevice?.(d, this.pad.id || ''); } }
  _setupTouch() {
    document.body.classList.add('touch');
    const joy = document.getElementById('joy'), knob = document.getElementById('joyKnob');
    const upd = (t) => {
      const r = joy.getBoundingClientRect();
      let x = (t.clientX - r.left - r.width / 2) / (r.width / 2), y = (t.clientY - r.top - r.height / 2) / (r.height / 2);
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      this.joy.x = x; this.joy.y = y;
      const c = r.width / 2 - 25; knob.style.left = `${c + x * c  }px`; knob.style.top = `${c + y * c  }px`;
    };
    joy.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; this.joy.id = t.identifier; this.joy.active = true; upd(t); }, { passive: false });
    joy.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === this.joy.id) upd(t); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === this.joy.id) { this.joy.active = false; this.joy.x = this.joy.y = 0; knob.style.left = knob.style.top = ''; } };
    joy.addEventListener('touchend', end); joy.addEventListener('touchcancel', end);
    // camera drag anywhere else
    let camId = null, lx = 0, ly = 0;
    this.canvas.addEventListener('touchstart', e => { if (this.enabled) this.pressed.add('Tap'); const t = e.changedTouches[0]; camId = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
    this.canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === camId) { this.mdx += (t.clientX - lx) * 1.4; this.mdy += (t.clientY - ly) * 1.4; lx = t.clientX; ly = t.clientY; } }, { passive: true });
    for (const b of document.querySelectorAll('#touchBtns .tb')) {
      const k = b.dataset.key;
      b.addEventListener('touchstart', e => { e.preventDefault(); this.pressed.add(k); this.keys.add(k); }, { passive: false });
      const up = e => { e.preventDefault(); this.keys.delete(k); };
      b.addEventListener('touchend', up, { passive: false });
      b.addEventListener('touchcancel', up, { passive: false }); // interrupted touches would otherwise stick (e.g. handbrake held)
    }
  }
  releaseAll() {
    this.keys.clear(); this.dragging = false;
    this.joy.active = false; this.joy.x = this.joy.y = 0; this.joy.id = null;
    const knob = document.getElementById('joyKnob'); if (knob) knob.style.left = knob.style.top = '';
  }
  down(...codes) { return codes.some(c => this.keys.has(c)); }
  hit(...codes) { return codes.some(c => this.pressed.has(c)); }
  axis() {
    let x = 0, y = 0;
    if (this.down('KeyW', 'ArrowUp')) y += 1;
    if (this.down('KeyS', 'ArrowDown')) y -= 1;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.joy.active) { x += this.joy.x; y -= this.joy.y; }
    x += this.pad.axis.x; y += this.pad.axis.y;
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }
  endFrame() { this.pressed.clear(); this.mdx = this.mdy = 0; this.wheel = 0; this.pad.hits.clear(); }
  _firstPad() { for (const p of navigator.getGamepads?.() || []) if (p && p.connected) return p; return null; }
  // Called once per frame. Pad buttons turn into the same key codes the keyboard produces, so every
  // system (dialog, phone, McDonald's shift, gate duty, driving) works without knowing about pads.
  pollPad(dt) {
    const P = this.pad, gp = this._firstPad();
    const want = new Set();
    if (!gp) { P.axis.x = P.axis.y = 0; P.connected = false; }
    else {
      P.connected = true; P.id = gp.id;
      const b = i => !!gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5);
      const val = i => gp.buttons[i] ? gp.buttons[i].value : 0;
      // raw button edges for menus that run while keyboard input is off (title, pause, ending)
      for (let i = 0; i < gp.buttons.length; i++) { const on = b(i); if (on && !P.btn[i]) P.hits.add(i); P.btn[i] = on; }
      if (P.hits.size) this._use('pad');
      const dz = v => Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8;
      const lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
      if (Math.max(Math.abs(lx), Math.abs(ly), Math.abs(rx), Math.abs(ry), val(6), val(7)) > 0.5) this._use('pad');
      const ctx = this.padContext();
      // a button still held when the layout changes (A opens the phone, then means "open app") is ignored until released
      if (ctx !== P.ctx) { P.ctx = ctx; P.block = new Set(); for (let i = 0; i < gp.buttons.length; i++) if (b(i)) P.block.add(i); }
      for (const i of P.block) if (!b(i)) P.block.delete(i);
      for (const [i, code] of PAD_MAPS[ctx] || PAD_MAPS.play) if (b(i) && !P.block.has(i)) want.add(code);
      if (ctx === 'play') {
        // left stick moves / steers; RT = throttle, LT = brake / reverse
        // on foot the left stick walks; on a scooter / in a car it only steers: RT is the throttle, LT brake / reverse
        P.axis.x = lx; P.axis.y = Math.max(-1, Math.min(1, (this.padDriving() ? 0 : -ly) + val(7) - val(6)));
        // right stick looks around (same units as mouse movement)
        this.mdx += Math.sign(rx) * rx * rx * 1100 * dt; this.mdy += Math.sign(ry) * ry * ry * 700 * dt;
      } else {
        P.axis.x = P.axis.y = 0;
        // in menus the stick works like the D-pad
        if (lx > 0.6) want.add('ArrowRight'); else if (lx < -0.6) want.add('ArrowLeft');
        if (ly > 0.6) want.add('ArrowDown'); else if (ly < -0.6) want.add('ArrowUp');
      }
    }
    if (this.enabled) for (const k of want) if (!P.held.has(k)) { this.pressed.add(k); this.keys.add(k); }
    for (const k of P.held) if (!want.has(k)) this.keys.delete(k);
    P.held = want;
  }
}
