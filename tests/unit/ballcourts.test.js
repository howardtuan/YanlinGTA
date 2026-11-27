// 籃球鬥牛（src/systems/minigames/ballcourts/Hoops.js）與排球（Volley.js）的規則：
// 命中率、出手時機、抄截、出界、三分線外才算 2 分，排球的觸球時機、掛網、落地計分，電腦對打能把一場打完。
import { describe, it, expect } from 'vitest';
import {
  Hoops,
  shotChance,
  releaseQ,
  REL_BEST,
  ARC,
} from '../../src/systems/minigames/ballcourts/Hoops.js';
import {
  Volley,
  attack,
  lob,
  tDown,
  touchQ,
  NET_H,
  HIT_H,
  G,
} from '../../src/systems/minigames/ballcourts/Volley.js';

const lcg = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const ai = (skill = 0.7, speed = 5) => ({ skill, speed });

describe('籃球鬥牛', () => {
  it('近的比遠的好進，時機對、沒人蓋的比較好進', () => {
    expect(shotChance(1)).toBeGreaterThan(shotChance(5));
    expect(shotChance(5)).toBeGreaterThan(shotChance(8));
    expect(shotChance(5, 1)).toBeGreaterThan(shotChance(5, 0.2));
    expect(shotChance(5, 1, 0)).toBeGreaterThan(shotChance(5, 1, 1));
    expect(releaseQ(REL_BEST)).toBe(1);
    expect(releaseQ(REL_BEST + 0.5)).toBe(0);
  });
  it('開局在弧頂發球，等一下才開打', () => {
    const r = new Hoops({ players: [{ name: '你' }, { name: '阿哲', ai: ai() }], rnd: lcg(3) });
    expect(r.state).toBe('check');
    expect(r.ball.holder).toBe(0);
    expect(r.shootStart(0)).toBe(false); // not live yet
    r.players[1].u = r.players[1].tu;
    r.players[1].v = r.players[1].tv;
    for (let i = 0; i < 100; i++) r.step(1 / 60);
    expect(r.state).toBe('live');
  });
  it('三分線外進球 2 分、線內 1 分，進了換對方在弧頂發球', () => {
    for (const [d, pts] of [
      [8, 2],
      [3, 1],
    ]) {
      const r = new Hoops({
        players: [{ name: '你' }, { name: '阿哲', ai: ai(0.1, 0.01) }],
        rnd: () => 0,
      });
      r.state = 'live';
      const me = r.players[0];
      me.u = r.BU - d;
      me.v = 0;
      // the defender far off, so nothing is contested
      r.players[1].u = 1;
      r.players[1].v = 6;
      expect(r.shootStart(0)).toBe(true);
      for (let i = 0; i < 37; i++) r.step(1 / 60);
      r.release(0);
      let ev = [];
      for (let i = 0; i < 300 && r.state !== 'check'; i++) {
        r.step(1 / 60);
        ev = ev.concat(r.take());
      }
      expect(ev.find((e) => e.type === 'score')?.pts).toBe(pts);
      expect(r.score[0]).toBe(pts);
      expect(r.state).toBe('check');
      expect(r.ball.holder).toBe(1);
    }
  });
  it('搶到防守籃板要先運出三分線外才能出手', () => {
    const r = new Hoops({ players: [{ name: '你' }, { name: '阿哲', ai: ai() }], rnd: lcg(5) });
    r.state = 'live';
    r.o = 1;
    r.ball.holder = -1;
    r.ball.flight = null;
    const me = r.players[0];
    me.u = r.BU - 2;
    me.v = 0;
    Object.assign(r.ball, { u: me.u, v: 0, h: 1, vu: 0, vv: 0, vh: 0 });
    r.players[1].u = 1;
    r.players[1].v = -6;
    r.step(1 / 60);
    expect(r.ball.holder).toBe(0);
    expect(r.o).toBe(0);
    expect(r.cleared).toBe(false);
    expect(r.shootStart(0)).toBe('clear');
    me.u = r.BU - ARC - 0.5;
    r.step(1 / 60);
    expect(r.cleared).toBe(true);
    expect(r.shootStart(0)).toBe(true);
  });
  it('離得夠近才抄得到球', () => {
    const r = new Hoops({ players: [{ name: '你' }, { name: '阿哲', ai: ai() }], rnd: () => 0 });
    r.state = 'live';
    r.ball.holder = 1;
    r.o = 1;
    r.players[1].u = 5;
    r.players[1].v = 0;
    r.players[0].u = 5;
    r.players[0].v = 3;
    expect(r.steal(0)).toBe(false);
    r.players[0].stealCd = 0;
    r.players[0].v = 0.8;
    expect(r.steal(0)).toBe(true);
    expect(r.ball.holder).toBe(0);
    expect(r.cleared).toBe(false);
  });
  it('球出界給另一邊', () => {
    const r = new Hoops({ players: [{ name: '你' }, { name: '阿哲', ai: ai() }], rnd: lcg(9) });
    r.state = 'live';
    r.ball.holder = -1;
    r.lastTouch = 0;
    Object.assign(r.ball, { u: 5, v: r.HW + 1, h: 0.5, vu: 0, vv: 1, vh: 0, flight: null });
    r.step(1 / 60);
    expect(r.take().some((e) => e.type === 'out')).toBe(true);
    expect(r.state).toBe('check');
    expect(r.ball.holder).toBe(1);
  });
  it('兩個電腦能把一場鬥牛打完', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = new Hoops({
        players: [
          { name: 'A', ai: ai(0.6, 4.8) },
          { name: 'B', ai: ai(0.8, 5.2) },
        ],
        rnd: lcg(seed),
      });
      let t = 0;
      while (r.state !== 'over' && t < 900) {
        r.step(1 / 30);
        r.take();
        t += 1 / 30;
      }
      expect(r.state).toBe('over');
      expect(Math.max(...r.score)).toBeGreaterThanOrEqual(7);
      expect(r.score[r.winner]).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('排球', () => {
  it('高吊球照時間落在瞄準的高度', () => {
    const p = { u: -6, v: 1, h: 0.85 };
    const v = lob(p, -2, 0, HIT_H.set, 1.3);
    const T = 1.3;
    expect(p.h + v.h * T - 0.5 * G * T * T).toBeCloseTo(HIT_H.set, 5);
    expect(p.u + v.u * T).toBeCloseTo(-2, 5);
  });
  it('扣球過網、落在對面；太低的球掛網', () => {
    const p = { u: -1, v: 0, h: 2.75 };
    const v = attack(p, 6, 1, 18);
    const t = -p.u / v.u;
    expect(p.h + v.h * t - 0.5 * G * t * t).toBeGreaterThan(NET_H);
    const r = new Volley({
      players: [
        { name: '你' },
        { name: 'B', ai: ai() },
        { name: 'C', ai: ai() },
        { name: 'D', ai: ai() },
      ],
      rnd: lcg(4),
    });
    r.state = 'play';
    r.lastTeam = 0;
    r.recv = 1;
    r.touches = 0;
    Object.assign(r.ball, { u: -2, v: 0, h: 1.5, vu: 10, vv: 0, vh: 0, held: false });
    let ev = [];
    for (let i = 0; i < 200 && r.state === 'play'; i++) {
      r.step(1 / 60);
      ev = ev.concat(r.take());
    }
    expect(ev.some((e) => e.type === 'net')).toBe(true);
    expect(r.score).toEqual([0, 1]); // fell on our side
  });
  it('時機越準品質越好，太早按沒反應', () => {
    expect(touchQ(0)).toBe(1);
    expect(touchQ(0.15)).toBeCloseTo(0.5, 5);
    expect(touchQ(0.5)).toBe(0);
    const b = { h: 3, vh: 0 };
    expect(tDown(b, 3)).toBeCloseTo(0, 5);
    expect(tDown({ h: 1, vh: 0 }, 2)).toBe(null);
  });
  it('玩家發球：拋球、在球掉到擊球高度時按', () => {
    const r = new Volley({
      players: [
        { name: '你' },
        { name: 'B', ai: ai() },
        { name: 'C', ai: ai() },
        { name: 'D', ai: ai() },
      ],
      serveTeam: 0,
      rnd: lcg(8),
    });
    expect(r.server).toBe(0);
    expect(r.act(0)).toBe(true);
    expect(r.state).toBe('toss');
    expect(r.act(0)).toBe(false); // the ball is still going up
    let served = false;
    for (let i = 0; i < 120 && !served; i++) {
      r.step(1 / 120);
      if (tDown(r.ball, HIT_H.serve) <= 0.01) served = r.act(0);
    }
    expect(served).toBe(true);
    expect(r.state).toBe('play');
    expect(r.recv).toBe(1);
  });
  it('落在界內是落地那邊失分，打出界是打的那隊失分', () => {
    const mk = () => {
      const r = new Volley({
        players: [
          { name: 'A', ai: ai() },
          { name: 'B', ai: ai() },
          { name: 'C', ai: ai() },
          { name: 'D', ai: ai() },
        ],
        rnd: lcg(2),
      });
      r.state = 'play';
      r.touches = 3;
      r.recv = 1;
      r.plan = null;
      return r;
    };
    let r = mk();
    r.lastTeam = 0;
    Object.assign(r.ball, { u: 4, v: 0, h: 0.2, vu: 0, vv: 0, vh: -3, held: false });
    r.step(1 / 20);
    expect(r.score).toEqual([1, 0]);
    r = mk();
    r.lastTeam = 0;
    Object.assign(r.ball, { u: 10.5, v: 0, h: 0.2, vu: 0, vv: 0, vh: -3, held: false });
    r.step(1 / 20);
    expect(r.score).toEqual([0, 1]);
  });
  it('換發球：接發球那隊得分就換他們發，隊裡輪流', () => {
    const r = new Volley({
      players: [
        { name: 'A', ai: ai() },
        { name: 'B', ai: ai() },
        { name: 'C', ai: ai() },
        { name: 'D', ai: ai() },
      ],
      serveTeam: 1,
      rnd: lcg(2),
    });
    expect(r.server).toBe(2);
    r._point(0);
    expect(r.serving).toBe(0);
    expect(r.server).toBe(1);
    r._point(1);
    expect(r.server).toBe(3);
    r._point(1);
    expect(r.server).toBe(3);
  });
  it('11 分要領先 2 分，最多打到 15', () => {
    const r = new Volley({
      players: [
        { name: 'A', ai: ai() },
        { name: 'B', ai: ai() },
        { name: 'C', ai: ai() },
        { name: 'D', ai: ai() },
      ],
      rnd: lcg(2),
    });
    r.score = [10, 10];
    r._point(0);
    expect(r.winner).toBe(-1);
    r._point(0);
    expect(r.winner).toBe(0);
    r.winner = -1;
    r.score = [14, 14];
    r._point(1);
    expect(r.winner).toBe(1);
  });
  it('四個電腦能把一場打完，而且有來回', () => {
    for (const seed of [1, 2, 3, 4]) {
      const r = new Volley({
        players: [
          { name: 'A', ai: ai(0.6, 4.6) },
          { name: 'B', ai: ai(0.7, 5) },
          { name: 'C', ai: ai(0.65, 4.8) },
          { name: 'D', ai: ai(0.8, 5.2) },
        ],
        rnd: lcg(seed),
      });
      let t = 0,
        touches = 0,
        hits = 0;
      while (r.state !== 'over' && t < 1500) {
        r.step(1 / 30);
        for (const e of r.take()) {
          if (e.type === 'touch') touches++;
          if (e.type === 'touch' && e.kind === 'hit') hits++;
        }
        t += 1 / 30;
      }
      expect(r.state).toBe('over');
      expect(Math.max(...r.score)).toBeGreaterThanOrEqual(11);
      expect(Math.abs(r.score[0] - r.score[1]) >= 2 || Math.max(...r.score) === 15).toBe(true);
      expect(hits).toBeGreaterThan(5);
      expect(touches).toBeGreaterThan(30);
    }
  });
});
