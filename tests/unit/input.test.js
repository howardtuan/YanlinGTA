// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Input, PAD_MAPS } from '../../src/core/Input.js';

function makeCanvas() {
  const cv = document.createElement('canvas');
  cv.requestPointerLock = vi.fn();
  return cv;
}

function makePad({ id = 'Xbox Wireless Controller', axes = [0, 0, 0, 0], buttons = [] } = {}) {
  const btns = Array.from({ length: 16 }, (_, i) => {
    const v = buttons[i];
    if (typeof v === 'number') return { pressed: v > 0.5, value: v };
    return { pressed: !!v, value: v ? 1 : 0 };
  });
  return { connected: true, id, axes, buttons: btns };
}

describe('Input (src/core/Input.js)', () => {
  const origMatchMedia = window.matchMedia;
  const origGetGamepads = navigator.getGamepads;

  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: false }));
    navigator.getGamepads = vi.fn(() => []);
  });

  afterEach(() => {
    window.matchMedia = origMatchMedia;
    navigator.getGamepads = origGetGamepads;
  });

  it('ignores keydown when disabled, and tracks held/pressed/endFrame when enabled', () => {
    const input = new Input(makeCanvas());
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(input.down('KeyW')).toBe(false);
    expect(input.hit('KeyW')).toBe(false);

    input.enabled = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(input.down('KeyW')).toBe(true);
    expect(input.hit('KeyW')).toBe(true);

    // Repeating keydown while held must not re-trigger hit()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(input.hit('KeyW')).toBe(true);
    input.endFrame();
    expect(input.hit('KeyW')).toBe(false);
    expect(input.down('KeyW')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(input.hit('KeyW')).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(input.down('KeyW')).toBe(false);
  });

  it('releases all held keys and joystick state on blur', () => {
    const input = new Input(makeCanvas());
    input.enabled = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    input.joy.active = true;
    input.joy.x = 0.8;
    input.joy.y = -0.5;
    input.joy.id = 7;

    window.dispatchEvent(new Event('blur'));
    expect(input.down('KeyD')).toBe(false);
    expect(input.joy).toEqual({ x: 0, y: 0, active: false, id: null });
  });

  it('clamps combined keyboard and joystick axis to [-1, 1]', () => {
    const input = new Input(makeCanvas());
    input.enabled = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    input.joy.active = true;
    input.joy.x = 0.9;
    input.joy.y = -0.9;

    expect(input.axis()).toEqual({ x: 1, y: 1 });
  });

  it('applies gamepad deadzone, driving throttle mapping, and context-switch button blocking', () => {
    const input = new Input(makeCanvas());
    input.enabled = true;
    let ctx = 'play';
    let driving = false;
    input.padContext = () => ctx;
    input.padDriving = () => driving;

    // Below 0.2 deadzone -> zero axis
    let pad = makePad({ axes: [0.15, -0.1, 0, 0] });
    navigator.getGamepads = () => [pad];
    input.pollPad(1 / 60);
    expect(input.pad.connected).toBe(true);
    expect(input.pad.axis).toEqual({ x: 0, y: 0 });

    // Driving mode: left stick Y does not walk; RT (button 7) throttles forward
    driving = true;
    const btns = [];
    btns[7] = 0.8;
    btns[0] = true; // A -> KeyE in play
    pad = makePad({ axes: [0.6, -1, 0, 0], buttons: btns });
    navigator.getGamepads = () => [pad];
    input.pollPad(1 / 60);
    expect(input.pad.axis.x).toBeCloseTo(0.5, 5);
    expect(input.pad.axis.y).toBeCloseTo(0.8, 5);
    expect(input.hit('KeyE')).toBe(true);

    // Switch context to 'phone' while A (button 0) is still held: must be blocked until released
    input.endFrame();
    ctx = 'phone';
    input.pollPad(1 / 60);
    expect(input.hit('Enter')).toBe(false);
    expect(input.down('Enter')).toBe(false);

    // Release A, then press A again -> now triggers Enter in phone context
    pad = makePad({ buttons: [] });
    navigator.getGamepads = () => [pad];
    input.pollPad(1 / 60);
    input.endFrame();

    const phoneBtns = [];
    phoneBtns[0] = true;
    pad = makePad({ buttons: phoneBtns });
    navigator.getGamepads = () => [pad];
    input.pollPad(1 / 60);
    expect(input.hit('Enter')).toBe(true);
  });

  it('defines non-empty PAD_MAPS for every expected input context', () => {
    for (const name of ['play', 'phone', 'map', 'race', 'gate', 'mahjong', 'job']) {
      expect(Array.isArray(PAD_MAPS[name])).toBe(true);
      expect(PAD_MAPS[name].length).toBeGreaterThan(0);
    }
  });
});
