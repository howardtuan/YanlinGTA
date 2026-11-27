// 網球規則（src/systems/minigames/tennis/Rules.js）：擊球解算、球的彈跳與掛網、計分、電腦對打能把一盤打完
import { describe, it, expect } from 'vitest';
import {
  Rally,
  solveShot,
  stepBall,
  netH,
  BALL_R,
} from '../../src/systems/minigames/tennis/Rules.js';
import { HL, SW } from '../../src/world/Tennis.js';

const lcg = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

describe('擊球與球的物理', () => {
  it('解出來的球過網、落在瞄準的地方', () => {
    const p = { u: -HL, h: 1, v: 1 };
    const v = solveShot(p, 8, -2, 20);
    const b = { ...p, vu: v.u, vh: v.h, vv: v.v };
    let crossed = false;
    for (let i = 0; i < 400; i++) {
      const u0 = b.u;
      const e = stepBall(b, 1 / 240);
      expect(e).not.toBe('net');
      if (u0 < 0 && b.u >= 0) {
        crossed = true;
        expect(b.h).toBeGreaterThan(netH(b.v));
      }
      if (e === 'bounce') break;
    }
    expect(crossed).toBe(true);
    expect(Math.abs(b.u - 8)).toBeLessThan(0.3);
    expect(Math.abs(b.v + 2)).toBeLessThan(0.3);
  });
  it('太低的球掛網，掉回打球那一邊', () => {
    const b = { u: -5, h: 0.5, v: 0, vu: 20, vh: 0, vv: 0 };
    let e = null;
    for (let i = 0; i < 100 && e !== 'net'; i++) e = stepBall(b, 1 / 120);
    expect(e).toBe('net');
    expect(b.u).toBeLessThan(0);
    expect(b.h).toBeGreaterThanOrEqual(BALL_R);
  });
});

describe('計分', () => {
  const rally = () =>
    new Rally({
      players: [{ name: '你' }, { name: '阿凱', ai: { skill: 0.5, speed: 5 } }],
      rnd: lcg(3),
    });
  it('0／15／30／40、Deuce、Ad，贏兩分才拿下一局並換發球', () => {
    const r = rally();
    expect(r.score()).toBe('0 - 0');
    r._lose(1);
    r._lose(1);
    r._lose(1);
    expect(r.score()).toBe('40 - 0');
    r._lose(0);
    r._lose(0);
    r._lose(0);
    expect(r.score()).toBe('Deuce');
    r._lose(1);
    expect(r.score()).toBe('Ad 你');
    r._lose(0);
    expect(r.score()).toBe('Deuce');
    r._lose(1);
    r._lose(1);
    expect(r.games).toEqual([1, 0]);
    expect(r.server).toBe(1);
    expect(r.score()).toBe('0 - 0');
  });
  it('兩次發球失誤失分', () => {
    const r = rally();
    r._fault();
    expect(r.serveNo).toBe(2);
    expect(r.pts).toEqual([0, 0]);
    r._fault();
    expect(r.pts).toEqual([0, 1]); // the server (你, player 0) loses the point
  });
});

describe('電腦對打', () => {
  it('兩個電腦能把一盤打完，有來回、有出界和掛網，發球都從對的位置', () => {
    const r = new Rally({
      players: [
        { name: 'A', ai: { skill: 0.7, speed: 5.5 } },
        { name: 'B', ai: { skill: 0.5, speed: 5 } },
      ],
      gamesToWin: 6,
      rnd: lcg(11),
    });
    const n = { hit: 0, point: 0, out: 0, net: 0 };
    let t = 0;
    while (r.state !== 'over' && t < 3600) {
      r.step(1 / 60);
      t += 1 / 60;
      for (const e of r.take()) {
        if (e.type === 'hit') n.hit++;
        if (e.type === 'point') n.point++;
        if (e.type === 'bounce' && !e.inn && !e.dead) n.out++;
        if (e.type === 'net' && !e.dead) n.net++;
      }
      if (r.state === 'serve') expect(Math.abs(r.serveV)).toBeLessThan(SW);
    }
    expect(r.state).toBe('over');
    expect(Math.max(...r.games)).toBe(6);
    expect(n.hit / n.point).toBeGreaterThan(2.5);
    expect(n.out).toBeGreaterThan(0);
    expect(n.net).toBeGreaterThan(0);
  });
});
