import { describe, expect, it } from 'vitest';
import { shrinkFont } from '../../src/graphics/FitText.js';
import { inAnyPoly, pointInPoly } from '../../src/physics/Collision.js';

// fake 2D context: width grows with the px size in the font string (slightly non-linear, like hinted glyphs)
const fakeCtx = () => {
  const g = { font: '', sets: 0, measures: 0 };
  let f = '';
  Object.defineProperty(g, 'font', {
    get: () => f,
    set: (v) => {
      f = v;
      g.sets++;
    },
  });
  g.measureText = (t) => {
    g.measures++;
    const px = Number.parseFloat(/([\d.]+)px/.exec(f)[1]);
    return { width: t.length * (px * 0.93 + Math.sqrt(px) * 0.4) };
  };
  return g;
};
const loop = (g, t, maxW, p0, minP, font, step) => {
  let p = p0;
  g.font = font(p);
  while (g.measureText(t).width > maxW && p > minP) {
    p -= step;
    g.font = font(p);
  }
  return p;
};

describe('shrinkFont', () => {
  const font = (p, w = 900) => `${w} ${p}px sans-serif`;
  it('gives the size and font string of the shrink loop', () => {
    const texts = [
      '',
      '7',
      '全家',
      '福德麵館',
      '中原大學夜市炭烤',
      'MUSE EYELASH SALON',
      '一'.repeat(40),
    ];
    for (const t of texts)
      for (const [maxW, p0, minP, step] of [
        [300, 120, 10, 2],
        [96, 46, 12, 2],
        [181.3, 33.6, 9, 2],
        [60, 17.4, 8, 1],
        [1000, 80, 10, 2],
        [5, 50, 10, 2],
      ]) {
        const a = fakeCtx(),
          b = fakeCtx();
        const pa = loop(a, t, maxW, p0, minP, font, step);
        const pb = shrinkFont(b, t, maxW, p0, minP, font, step);
        expect(pb).toBe(pa);
        expect(b.font).toBe(a.font);
        expect(b.measures).toBeLessThanOrEqual(Math.max(a.measures, 8));
      }
  });
  it('passes extra arguments through the font function', () => {
    const g = fakeCtx();
    shrinkFont(g, '珍珠奶茶專賣', 120, 40, 9, (s) => font(s, 700));
    expect(g.font.startsWith('700 ')).toBe(true);
  });
});

describe('inAnyPoly', () => {
  it('answers like list.some(pointInPoly), also after the list grows', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const poly = () => {
      const cx = rnd() * 400 - 200,
        cz = rnd() * 400 - 200,
        n = 3 + Math.floor(rnd() * 6),
        r = 2 + rnd() * 40;
      return Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2,
          rr = r * (0.4 + rnd() * 0.6);
        return [cx + Math.cos(a) * rr, cz + Math.sin(a) * rr];
      });
    };
    const list = Array.from({ length: 60 }, poly);
    const check = () => {
      let hits = 0;
      for (let i = 0; i < 4000; i++) {
        const x = rnd() * 460 - 230,
          z = rnd() * 460 - 230;
        const want = list.some((p) => pointInPoly(x, z, p));
        expect(inAnyPoly(list, x, z)).toBe(want);
        if (want) hits++;
      }
      return hits;
    };
    expect(check()).toBeGreaterThan(100);
    for (let i = 0; i < 40; i++) list.push(poly());
    expect(check()).toBeGreaterThan(100);
    expect(inAnyPoly([], 0, 0)).toBe(false);
    expect(inAnyPoly(undefined, 0, 0)).toBe(false);
  });
});
