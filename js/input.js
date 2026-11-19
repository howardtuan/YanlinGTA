// Keyboard / mouse / touch input
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered this frame
    this.mdx = 0; this.mdy = 0; this.wheel = 0;
    this.locked = false; this.enabled = false;
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.joy = { x: 0, y: 0, active: false, id: null };
    addEventListener('keydown', e => {
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', e => {
      if (!this.enabled || this.touch) return;
      if (!this.locked && !this.lockFailed) {
        try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => { this.lockFailed = true; }); } catch (err) { this.lockFailed = true; }
        return;
      }
      this.dragging = !this.locked; // fallback: click-drag to look around
      this.pressed.add('Mouse' + e.button); this.keys.add('Mouse' + e.button);
    });
    addEventListener('mouseup', e => { this.keys.delete('Mouse' + e.button); this.dragging = false; });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    addEventListener('mousemove', e => { if (this.locked || this.dragging) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    if (this.touch) this._setupTouch();
  }
  _setupTouch() {
    document.body.classList.add('touch');
    const joy = document.getElementById('joy'), knob = document.getElementById('joyKnob');
    const upd = (t) => {
      const r = joy.getBoundingClientRect();
      let x = (t.clientX - r.left - r.width / 2) / (r.width / 2), y = (t.clientY - r.top - r.height / 2) / (r.height / 2);
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      this.joy.x = x; this.joy.y = y;
      const c = r.width / 2 - 25; knob.style.left = (c + x * c) + 'px'; knob.style.top = (c + y * c) + 'px';
    };
    joy.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; this.joy.id = t.identifier; this.joy.active = true; upd(t); }, { passive: false });
    joy.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === this.joy.id) upd(t); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === this.joy.id) { this.joy.active = false; this.joy.x = this.joy.y = 0; knob.style.left = knob.style.top = ''; } };
    joy.addEventListener('touchend', end); joy.addEventListener('touchcancel', end);
    // camera drag anywhere else
    let camId = null, lx = 0, ly = 0;
    this.canvas.addEventListener('touchstart', e => { const t = e.changedTouches[0]; camId = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
    this.canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === camId) { this.mdx += (t.clientX - lx) * 1.4; this.mdy += (t.clientY - ly) * 1.4; lx = t.clientX; ly = t.clientY; } }, { passive: true });
    for (const b of document.querySelectorAll('#touchBtns .tb')) {
      const k = b.dataset.key;
      b.addEventListener('touchstart', e => { e.preventDefault(); this.pressed.add(k); this.keys.add(k); }, { passive: false });
      b.addEventListener('touchend', e => { e.preventDefault(); this.keys.delete(k); }, { passive: false });
    }
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
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }
  endFrame() { this.pressed.clear(); this.mdx = this.mdy = 0; this.wheel = 0; }
}
