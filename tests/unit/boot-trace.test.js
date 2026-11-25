import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBootTrace } from '../../src/core/BootTrace.js';

// BootTrace patches these two while ?boottrace is on; put them back after every test
const ORIG = {
  createElement: document.createElement,
  getContext: HTMLCanvasElement.prototype.getContext,
};
const stubBeacon = (fn) =>
  Object.defineProperty(navigator, 'sendBeacon', { value: fn, configurable: true, writable: true });

afterEach(() => {
  document.createElement = ORIG.createElement;
  HTMLCanvasElement.prototype.getContext = ORIG.getContext;
  delete window.__bootTrace;
});

describe('BootTrace (?boottrace)', () => {
  it('is a no-op without ?boottrace: nothing sent, nothing patched', () => {
    const beacon = vi.fn(() => true);
    stubBeacon(beacon);
    const t = createBootTrace('?perf');
    t.mark('world: buildings');
    t.watchGl(document.createElement('canvas'));
    expect(t.on).toBe(false);
    expect(beacon).not.toHaveBeenCalled();
    expect(document.createElement).toBe(ORIG.createElement);
    expect(HTMLCanvasElement.prototype.getContext).toBe(ORIG.getContext);
  });

  it('beacons every step to /__boot with the live canvas memory, one session id per load', () => {
    const sent = [];
    stubBeacon((url, body) => {
      sent.push({ url, rec: JSON.parse(body) });
      return true;
    });
    const t = createBootTrace('?boottrace');
    const cv = document.createElement('canvas');
    cv.width = 1000;
    cv.height = 500; // 1000 x 500 x 4 bytes = 2 MB
    t.mark('world: buildings', 'extra info');

    expect(t.on).toBe(true);
    expect(sent[0].rec.label).toBe('start');
    const last = sent.at(-1);
    expect(last.url).toMatch(/\/__boot$/);
    expect(last.rec).toMatchObject({
      label: 'world: buildings',
      extra: 'extra info',
      cmb: 2,
      cn: 1,
      sid: sent[0].rec.sid,
    });
    expect(window.__bootTrace.map((r) => r.label)).toEqual(['start', 'world: buildings']);
  });
});
