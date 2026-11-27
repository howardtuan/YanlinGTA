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
import {
  hostTennis,
  joinTennis,
  snapshot,
  applySnapshot,
  normCode,
} from '../../src/systems/minigames/tennis/Net.js';

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

// a room where every message arrives at once (like tests/unit/mahjong-p2p.test.js)
function mockBus() {
  const rooms = new Map();
  let n = 1;
  return async (roomId) => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    const peers = rooms.get(roomId),
      id = `p${n++}`,
      handlers = new Map(),
      joins = [],
      leaves = [];
    const node = {
      deliver: (name, data, from) => handlers.get(name)?.(structuredClone(data), { peerId: from }),
      join: (o) => joins.forEach((cb) => cb({ peerId: o })),
      leave: (o) => leaves.forEach((cb) => cb({ peerId: o })),
    };
    for (const [pid, p] of peers) {
      p.join(id);
      node.join(pid);
    }
    peers.set(id, node);
    return {
      makeAction: (name) => ({
        send(data, opts) {
          if (opts?.target) peers.get(opts.target)?.deliver(name, data, id);
          else for (const [pid, p] of peers) if (pid !== id) p.deliver(name, data, id);
          return Promise.resolve();
        },
        onMessage: (cb) => handlers.set(name, cb),
      }),
      onPeerJoin: (cb) => joins.push(cb),
      onPeerLeave: (cb) => leaves.push(cb),
      leave() {
        peers.delete(id);
        for (const p of peers.values()) p.leave(id);
      },
    };
  };
}

describe('線上對打（Net.js）', () => {
  it('房號只留 4 碼英數字、轉大寫', () => {
    expect(normCode(' ab-c1 9')).toBe('ABC1');
  });
  it('朋友用房號連上房主、收到局面、揮拍傳到房主；第三個人進不來；離開時對方知道', async () => {
    const bus = mockBus(),
      log = [];
    const host = await hostTennis({
      code: 'TEST',
      name: '彥霖',
      joinRoomFn: bus,
      on: {
        join: (peer, h) => log.push(['join', h.name]),
        input: (m) => log.push(['in', m.u]),
        swing: (lag) => log.push(['swing', lag]),
        leave: (why) => log.push(['hostLeave', why]),
      },
    });
    const mirror = new Rally({ players: [{ name: '彥霖' }, { name: '你' }] });
    const guest = await joinTennis({
      code: 'test',
      name: '小明',
      joinRoomFn: bus,
      on: {
        start: (h) => log.push(['start', h.name]),
        state: (s, ev) => {
          applySnapshot(mirror, s, 1);
          log.push(['state', ev.length]);
        },
        leave: (why) => log.push(['guestLeave', why]),
      },
    });
    expect(log).toContainEqual(['join', '小明']);
    expect(log).toContainEqual(['start', '彥霖']);
    // the host's match, sent over
    const r = new Rally({ players: [{ name: '你' }, { name: '小明' }], rnd: lcg(5) });
    r.players[0].u = -12;
    r.pts = [2, 1];
    r.games = [1, 0];
    host.send(r, [{ type: 'hit', i: 0 }]);
    expect(log).toContainEqual(['state', 1]);
    expect(mirror.pts).toEqual([2, 1]);
    expect(mirror.games).toEqual([1, 0]);
    expect(mirror.players[0].netU).toBe(-12); // the guest glides there (TennisCourts _mirror)
    expect(snapshot(mirror).st).toBe(r.state);
    // the friend moves and swings
    guest.input(9.5, 1.2, 0.3);
    guest.swing();
    expect(log).toContainEqual(['in', 9.5]);
    expect(log.find((e) => e[0] === 'swing')[1]).toBeLessThanOrEqual(0.12);
    // someone else with the same code is turned away
    const third = [];
    await joinTennis({
      code: 'TEST',
      name: '路人',
      joinRoomFn: bus,
      on: { leave: (why) => third.push(why), start: () => third.push('start') },
    });
    expect(third).toEqual(['這個房間已經有人在打了']);
    // the friend leaves
    guest.close();
    expect(log.find((e) => e[0] === 'hostLeave')[1]).toBe('朋友離開了比賽');
    host.close();
  });
});

describe('找同學來打：走進球場的路線', () => {
  it('四面球場都從大門進來、不穿過球網，停在對面底線', async () => {
    const { approachPath } = await import('../../src/systems/minigames/tennis/TennisCourts.js');
    const { TENNIS, NP } = await import('../../src/world/Tennis.js');
    for (let i = 0; i < 4; i++) {
      const path = approachPath(i),
        [cu, cv] = TENNIS[i],
        end = path[path.length - 1];
      expect(end[0]).toBeCloseTo(cu + HL + 0.8);
      expect(end[1]).toBeCloseTo(cv);
      // through a gate in the block's fence (north block u = -16.6, south block u = 52.4)
      expect(path.some(([u]) => Math.abs(u - (i < 2 ? -16.6 : 52.4)) < 0.01)).toBe(true);
      // no leg goes through any court's net (u = court centre, |v - centre| < net post)
      for (let k = 0; k + 1 < path.length; k++) {
        const [u0, v0] = path[k],
          [u1, v1] = path[k + 1];
        for (const [nu, nv] of TENNIS) {
          if ((u0 - nu) * (u1 - nu) >= 0 || u0 === u1) continue;
          const v = v0 + ((nu - u0) / (u1 - u0)) * (v1 - v0);
          expect(Math.abs(v - nv)).toBeGreaterThan(NP);
        }
      }
    }
  });
});

describe('自己打的比賽球比較慢（pace）', () => {
  it('pace 0.72 發出去的球水平速度比較慢、在空中比較久', () => {
    const serve = (pace) => {
      const r = new Rally({
        players: [{ name: '你' }, { name: '同學' }],
        rnd: lcg(5),
        server: 0,
        pace,
      });
      for (let i = 0; i < 120 && r.ball.vu === 0; i++) {
        r.swing(0);
        r.step(1 / 60);
      }
      const b = r.ball,
        sp = Math.hypot(b.vu, b.vv);
      let t = 0;
      while (r.state === 'play' && t < 5) {
        r.step(1 / 120);
        t += 1 / 120;
        if (r.take().some((e) => e.type === 'bounce' || e.type === 'net')) break;
      }
      return { sp, t };
    };
    const real = serve(1),
      slow = serve(0.72);
    expect(real.sp).toBeGreaterThan(10);
    expect(slow.sp).toBeLessThan(real.sp * 0.8);
    expect(slow.t).toBeGreaterThan(real.t);
  });
});
