import { describe, expect, it } from 'vitest';
import { runZones } from '../../src/world/zones/Zones.js';
import { createBootDiag } from '../../src/core/BootDiag.js';

// a fake clock: each zone's build "takes" its ms, each frame 16 ms
const setup = (costs) => {
  let t = 0;
  const now = () => t;
  const built = [];
  const list = costs.map((ms, i) => ({
    name: `Z${i}`,
    build: (...a) => {
      built.push(a);
      t += ms;
    },
  }));
  let frames = 0;
  const frame = async () => {
    frames++;
    t += 16;
  };
  return { list, now, built, frame, frames: () => frames };
};

describe('runZones (#464 loading bar)', () => {
  it('builds every zone in order with its arguments and times only the build', async () => {
    const s = setup([5, 300, 40, 40, 2000, 10]);
    const I = {},
      prog = [],
      waits = [];
    await runZones(I, s.list, ['I', 'scene'], {
      now: s.now,
      frame: s.frame,
      onProgress: (p, label) => prog.push([p, label]),
      onWait: (ms) => waits.push(ms),
    });
    expect(s.built).toEqual(s.list.map(() => ['I', 'scene']));
    expect(I.zoneTimes).toEqual([
      { name: 'Z0', ms: 5 },
      { name: 'Z1', ms: 300 },
      { name: 'Z2', ms: 40 },
      { name: 'Z3', ms: 40 },
      { name: 'Z4', ms: 2000 },
      { name: 'Z5', ms: 10 },
    ]);
    expect(prog.map((x) => x[1])).toEqual([
      '搭建Z0',
      '搭建Z1',
      '搭建Z2',
      '搭建Z3',
      '搭建Z4',
      '搭建Z5',
      '',
    ]);
    expect(prog.map((x) => x[0])).toEqual([0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]);
    // a frame only after >= 70 ms of work since the last paint: before Z2 (Z1 300), Z4 (Z2+Z3 80), Z5 (Z4)
    expect(s.frames()).toBe(3);
    expect(waits).toEqual([16, 16, 16]);
  });
  it('never waits without a frame function (tools, tests): the zones still build', async () => {
    const s = setup([100, 100]);
    const I = {};
    await runZones(I, s.list, [], { now: s.now });
    expect(I.zoneTimes.map((z) => z.ms)).toEqual([100, 100]);
  });
});

describe('BootDiag waited() / progress()', () => {
  it('keeps the frames a stage waited for out of its time and notes them as waitMs', async () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    };
    let t = 0;
    const d = createBootDiag({ diagMode: 'off', storage, now: () => t });
    await d.begin();
    d.checkpoint('build-interiors', 0.25, 'x');
    t += 500;
    d.progress(0.5, '搭建新中北路街屋');
    expect(d.getState().current.label).toBe('搭建新中北路街屋');
    expect(d.getState().current.pct).toBe(0.5);
    d.waited(40);
    t += 540;
    d.checkpoint('build-physics', 0.78, 'y');
    t += 100;
    d.complete();
    expect(d.getState().current.stages).toEqual([
      { step: 'init', ms: 0 },
      { step: 'build-interiors', ms: 1000, waitMs: 40 },
      { step: 'build-physics', ms: 100 },
    ]);
    expect(d.getState().current.elapsedMs).toBe(1140);
  });
});
