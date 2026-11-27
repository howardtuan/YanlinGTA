import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HUD } from '../../src/ui/HUD.js';

// 對話框最後一行的「回嘴」輸入框（src/ui/HUD.js dialog(lines, cb, { reply })）：勞大打招呼時用來當面回他一句
// （src/entities/Pilot.js hear）。不填就照常按 E / 點一下關掉對話框。

// the dialog's DOM as in index.html, and a HUD with only its dialog part (no minimap)
function hud() {
  document.body.innerHTML = `
    <div id="dialog" class="hidden">
      <div id="dlgName"></div>
      <div id="dlgText"></div>
      <div id="dlgHint"></div>
    </div>`;
  const h = Object.create(HUD.prototype);
  Object.assign(h, {
    keyLabel: (kb) => kb,
    dialogQueue: [],
    dialogCb: null,
    typing: 0,
    fullText: '',
  });
  document.getElementById('dialog').addEventListener('click', () => h.advanceDialog());
  return h;
}
const box = () => document.querySelector('#dlgReply');
const input = () => document.querySelector('#dlgReply input');
const shown = (el) => !!el && !el.classList.contains('hidden');
const key = (el, k, extra = {}) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, code: extra.code || k, bubbles: true, ...extra })
  );
// one press = finish the typing line; then the next (a second press within 180 ms is ignored)
const next = (h) => {
  h._advAt = 0;
  h.advanceDialog();
  h._advAt = 0;
  h.advanceDialog();
};

describe('HUD.dialog 的回嘴輸入框', () => {
  let h;
  beforeEach(() => (h = hud()));

  it('only on the last line, and only when asked for', () => {
    h.dialog(
      [
        ['勞大', '一'],
        ['勞大', '二'],
      ],
      null,
      { reply: { send() {} } }
    );
    expect(shown(box())).toBe(false);
    next(h);
    expect(h.inDialog).toBe(true);
    expect(shown(box())).toBe(true);
    // a dialog without reply: no box
    next(h);
    h.dialog([['某人', '嗨']], null);
    expect(shown(box())).toBe(false);
  });

  it('Enter says it: the dialog closes first (its callback), then the words go to send', () => {
    const order = [];
    const send = vi.fn((t) => order.push(['send', t]));
    h.dialog([['勞大', 'Man']], () => order.push(['cb']), { reply: { send } });
    input().value = '  你好  ';
    key(input(), 'Enter');
    expect(order).toEqual([['cb'], ['send', '你好']]);
    expect(h.inDialog).toBe(false);
    expect(shown(box())).toBe(false);
  });

  it('typing in the box does not reach the game, and clicking it does not close the dialog', () => {
    const game = vi.fn();
    addEventListener('keydown', game);
    h.dialog([['勞大', 'Man']], null, { reply: { send() {} } });
    key(input(), 'e', { code: 'KeyE' });
    input().click();
    removeEventListener('keydown', game);
    expect(game).not.toHaveBeenCalled();
    expect(h.inDialog).toBe(true);
  });

  it('an empty box or Esc says nothing; E / a click closes the dialog as before', () => {
    const send = vi.fn();
    const cb = vi.fn();
    h.dialog([['勞大', 'Man']], cb, { reply: { send } });
    key(input(), 'Enter'); // nothing typed
    expect(h.inDialog).toBe(true);
    input().value = '算了';
    key(input(), 'Escape');
    expect(h.inDialog).toBe(true);
    next(h);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    expect(h.inDialog).toBe(false);
  });

  it('focusReply puts the cursor in the box (the T key, src/core/Game.js)', () => {
    h.dialog([['勞大', 'Man']], null, { reply: { send() {} } });
    expect(h.replyOn).toBe(true);
    h.focusReply();
    expect(document.activeElement).toBe(input());
  });
});
