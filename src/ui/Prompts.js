// On-screen key prompts follow the last device used: keyboard keys (<kbd>E</kbd>) turn into the
// connected controller's buttons (Xbox / PlayStation / Switch labels) while the gamepad is in use,
// and back as soon as the keyboard or mouse is touched again.
//
// - Every <kbd> outside the controls-help modal is translated on the fly (a MutationObserver
//   catches prompts the game writes later), using the button layout of the current context.
// - Hints that read differently on a pad use dual(kbHTML, padHTML); padHTML may contain {A}, {RT},
//   {L} (left stick) ... tokens which become button glyphs.
import { PAD_MAPS } from '../core/Input.js';

// standard-mapping button index -> logical (Xbox) name
const NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'Up', 'Down', 'Left', 'Right'];
const LABELS = {
  xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', View: 'View', Menu: 'Menu', LS: 'L3', RS: 'R3' },
  ps: { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', View: 'Create', Menu: 'Options', LS: 'L3', RS: 'R3' },
  // Switch Pro: same positions, Nintendo letters (bottom button is B)
  nin: { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', View: '−', Menu: '+', LS: 'L3', RS: 'R3' },
};
const DPAD = { Up: '↑', Down: '↓', Left: '←', Right: '→' };
const FACE = new Set(['A', 'B', 'X', 'Y']);

export function padStyle(id = '') {
  const s = id.toLowerCase();
  if (/xbox|045e|xinput/.test(s)) return 'xbox'; // "Xbox Wireless Controller" would otherwise match the PS pattern
  if (/054c|playstation|dualsense|dualshock|wireless controller/.test(s)) return 'ps';
  if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'nin';
  return 'xbox';
}

// keyboard text inside a <kbd> -> event code
function toCode(t) {
  t = t.trim();
  if (/^[A-Za-z]$/.test(t)) return `Key${  t.toUpperCase()}`;
  if (/^[0-9]$/.test(t)) return `Digit${  t}`;
  return ({ Enter: 'Enter', Tab: 'Tab', Space: 'Space', Esc: 'Escape', Shift: 'ShiftLeft', '⌫': 'Backspace', '滑鼠左鍵': 'Mouse0', '左鍵': 'Mouse0',
    '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight' })[t] || null;
}

export function dual(kb, pad) {
  return `<span class="kb-only">${kb}</span><span class="pad-only">${pad.replace(/\{(\w+)\}/g, (_, n) => `<kbd data-pb="${n}"></kbd>`)}</span>`;
}

export class Prompts {
  constructor(input, ctxFn) {
    this.input = input; this.ctxFn = ctxFn; // ctxFn -> { ctx: 'play' | 'phone' | ..., vehicle: bool }
    this.pad = false; this.style = 'xbox'; this.key = '';
    this._queued = false;
    new MutationObserver(() => this.queue()).observe(document.body, { childList: true, subtree: true });
  }
  setPad(on, id) {
    const style = on ? padStyle(id) : this.style;
    if (on === this.pad && style === this.style) return;
    this.pad = on; this.style = style;
    document.body.classList.toggle('pad-mode', on);
    this.refresh();
  }
  // called every frame: re-translate when the button layout changes (phone opened, got on a scooter...)
  tick() {
    if (!this.pad) return;
    const c = this.ctxFn(), k = c.ctx + (c.vehicle ? 'v' : '');
    if (k !== this.key) { this.key = k; this.refresh(); }
  }
  queue() { if (this._queued) return; this._queued = true; queueMicrotask(() => { this._queued = false; this.refresh(); }); }
  // logical button name for a keyboard code in the current context; 'hide' drops the key (WASD -> one stick glyph)
  _lookup(code) {
    if (!code) return null;
    const { ctx, vehicle } = this.ctxFn();
    if (ctx === 'play') {
      if (vehicle) { if (code === 'KeyW') return 'RT'; if (code === 'KeyS') return 'LT'; if (code === 'KeyA') return 'L'; if (code === 'KeyD') return 'hide'; }
      else { if (code === 'KeyW') return 'L'; if (code === 'KeyA' || code === 'KeyS' || code === 'KeyD') return 'hide'; }
    }
    for (const [i, c] of PAD_MAPS[ctx] || PAD_MAPS.play) if (c === code) return NAMES[i];
    return null;
  }
  // plain-text label of a button for toasts / dialog lines, e.g. label('A') -> '✕' on a PlayStation pad
  label(name) { return this._glyph(name).text; }
  _glyph(name) {
    if (name === 'L' || name === 'R') return { text: name, cls: 'pb pb-stick' };
    if (DPAD[name]) return { text: DPAD[name], cls: 'pb pb-dpad' };
    const text = LABELS[this.style][name] ?? name;
    return { text, cls: `pb pb-${this.style} ${FACE.has(name) ? `pb-face pb-${  name}` : 'pb-sh'}` };
  }
  refresh() {
    for (const k of document.querySelectorAll('kbd')) {
      if (k.closest('#modal')) continue;
      let want; // { text, cls, hide }
      if (k.dataset.pb) want = this._glyph(k.dataset.pb);
      else {
        if (k.dataset.k === undefined) { k.dataset.k = k.textContent; k.dataset.c = k.className; }
        const n = this.pad ? this._lookup(toCode(k.dataset.k)) : null;
        want = n === 'hide' ? { text: k.dataset.k, cls: k.dataset.c, hide: true } : n ? this._glyph(n) : { text: k.dataset.k, cls: k.dataset.c };
        if (n && n !== 'hide' && k.dataset.c) want.cls += ` ${  k.dataset.c}`;
      }
      if (k.textContent !== want.text) k.textContent = want.text;
      if (k.className !== want.cls) k.className = want.cls;
      const disp = want.hide ? 'none' : '';
      if (k.style.display !== disp) k.style.display = disp;
    }
  }
}
