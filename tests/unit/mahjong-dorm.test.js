// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { DormMahjong, statusOf, pickPlayers, DELAY } from '../../src/systems/mahjong/Mahjong.js';
import {
  countSeat,
  diceSum,
  seatsFromWinds,
  drawWinds,
  rollDice,
} from '../../src/systems/mahjong/Rules.js';

// 力行 277 的麻將桌（src/systems/mahjong/Mahjong.js）：誰醒著／在寢室、揪誰、開打條件、輸贏記帳、上桌的人在哪。
// A stand-in for the game: the 7 people of 力行 with the modes their own update() would give them.
function fakeGame(modes = {}, more = {}) {
  const ch = () => ({
    root: { visible: false, parent: null, position: { set() {} }, rotation: {} },
    update() {},
  });
  const dev = (mode) => ({ mode, ch: ch() });
  const toasts = [];
  const g = {
    clock: 22 * 60,
    money: 200,
    ledger: [],
    scene: { add: (o) => (o.parent = g.scene) },
    player: { pos: { x: 0, z: 0 } },
    hud: { toast: (t) => toasts.push(t) },
    interiors: {
      actions: [],
      lixing: {
        B: 0,
        W: (x, z) => [x, z],
        k: { heading: (a) => a },
        rooms: {
          277: {
            mahjong: {
              table: [0, 0],
              top: 0.6,
              y: 0,
              seats: [0, 1, 2, 3].map((i) => ({ x: i, z: 0, face: 0 })),
            },
          },
        },
      },
    },
    zz: { mode: 'room', ch: ch() },
    houshe: dev('code'),
    jianyu: { mode: 'game', ch: ch() },
    hank: { mode: 'dorm', asleep: false, dorm: { ch: ch() } },
    gordon: { night: true, asleep: false, dormCh: ch().root },
    howard: dev('game'),
    richard: dev('game'),
    earn(n) {
      this.money += n;
    },
    pay(n) {
      this.money -= n;
    },
    ...more,
  };
  for (const [id, m] of Object.entries(modes)) Object.assign(g[id], m);
  g.toasts = toasts;
  return g;
}

describe('誰在哪', () => {
  it('reads each person’s state from their own day', () => {
    const g = fakeGame({
      zz: { mode: 'sleep' },
      houshe: { mode: 'date' },
      jianyu: { mode: 'game' },
      hank: { mode: 'work' },
      howard: { mode: 'sleep' },
    });
    expect(statusOf(g, 'zz')).toBe('sleep');
    expect(statusOf(g, 'houshe')).toBe('out');
    expect(statusOf(g, 'jianyu')).toBe('dorm');
    expect(statusOf(g, 'hank')).toBe('out');
    expect(statusOf(g, 'gd')).toBe('dorm');
    expect(statusOf(g, 'howard')).toBe('sleep');
    expect(statusOf(g, 'richard')).toBe('dorm');
  });
  it('肉舖老闆: at the shop by day, out riding with 吱吱, asleep at night', () => {
    expect(statusOf(fakeGame({ gordon: { night: false } }), 'gd')).toBe('out');
    expect(statusOf(fakeGame({ zz: { gdOut: true } }), 'gd')).toBe('out');
    expect(statusOf(fakeGame({ gordon: { asleep: true } }), 'gd')).toBe('sleep');
  });
});

describe('揪人', () => {
  it('awake in the dorm first, nearest rooms first', () => {
    const g = fakeGame();
    expect(pickPlayers(g).map((r) => r.id)).toEqual(['zz', 'houshe', 'jianyu']);
  });
  it('then the ones out (phoned), then the sleepers (woken up)', () => {
    const g = fakeGame({
      zz: { mode: 'sleep' },
      houshe: { mode: 'sleep' },
      jianyu: { mode: 'car' },
      hank: { mode: 'dorm', asleep: true },
      gordon: { night: true, asleep: true },
      howard: { mode: 'sleep' },
      richard: { mode: 'game' },
    });
    expect(pickPlayers(g).map((r) => `${r.id}:${r.st}`)).toEqual([
      'richard:dorm',
      'jianyu:out',
      'zz:sleep',
    ]);
  });
  it('everyone comes, whatever they are doing (work, a date, asleep)', () => {
    const g = fakeGame({
      zz: { mode: 'shop' },
      houshe: { mode: 'date' },
      jianyu: { mode: 'sleep' },
      hank: { mode: 'work' },
      gordon: { night: false },
      howard: { mode: 'walk' },
      richard: { mode: 'sleep' },
    });
    expect(pickPlayers(g).length).toBe(3);
    expect(pickPlayers(g).every((r) => r.st === 'out')).toBe(true);
  });
});

describe('開打條件', () => {
  it('any time of day, as long as the wallet is above zero (press opens mode menu; solo gathers)', () => {
    for (const h of [3, 9, 14, 22]) {
      const g = fakeGame({}, { clock: h * 60 });
      const mj = new DormMahjong(g);
      let modeOpened = false;
      mj.scene = {
        open() {},
        close() {},
        chooseMode: () => (modeOpened = true),
      };
      mj.press();
      expect(modeOpened).toBe(true);
      mj.pickMode('solo');
      expect(mj.state).toBe('gather');
    }
  });
  it('at 0 or below: no game', () => {
    for (const money of [0, -120]) {
      const g = fakeGame({}, { money });
      const mj = new DormMahjong(g);
      expect(mj.label()).toContain('錢包見底');
      mj.press();
      expect(mj.state).toBe(null);
      expect(g.toasts.at(-1)).toContain('不能開打');
    }
  });
  it('waits for everyone to arrive; E fast-forwards the clock', () => {
    const g = fakeGame({ zz: { mode: 'sleep' }, houshe: { mode: 'date' } });
    const mj = new DormMahjong(g);
    mj.gather();
    const st = mj.party.map((p) => p.st);
    expect(st).toEqual(['dorm', 'dorm', 'dorm']); // jianyu, hank, gd are awake in their rooms
    expect(mj.label()).toContain('等');
    g.clock += DELAY.dorm;
    expect(mj.label()).toContain('人到齊了');
    const g2 = fakeGame({
      zz: { mode: 'shop' },
      houshe: { mode: 'shop' },
      jianyu: { mode: 'car' },
    });
    g2.hank.mode = 'work';
    g2.gordon.night = false;
    g2.howard.mode = 'walk';
    g2.richard.mode = 'walk';
    const m2 = new DormMahjong(g2);
    m2.gather();
    const t0 = g2.clock;
    m2.press(); // not everyone is here yet: fast-forward
    expect(g2.clock).toBe(t0 + DELAY.out);
    expect(m2.party.every((p) => m2.arrived(p))).toBe(true);
  });
  it('the ones at the table are taken off their day, and back once you leave', () => {
    const g = fakeGame();
    const mj = new DormMahjong(g);
    mj.gather();
    expect(mj.has('zz')).toBe(true);
    expect(mj.has('richard')).toBe(false);
    expect(mj.where('zz').status).toContain('277');
    const ch = g.zz.ch;
    expect(mj.hold('zz', ch, 0.016)).toBe(true);
    expect(mj.hold('richard', g.richard.ch, 0.016)).toBe(false);
    mj.release();
    expect(mj.has('zz')).toBe(false);
    expect(mj.where('zz')).toBe(null);
  });
  it('walking away while they come calls it off', () => {
    const g = fakeGame();
    const mj = new DormMahjong(g);
    mj.gather();
    g.player.pos = { x: 100, z: 0 };
    mj.update(0.016);
    expect(mj.state).toBe(null);
  });
});

describe('輸贏記帳', () => {
  const session = (money) => {
    const g = fakeGame({}, { money });
    const mj = new DormMahjong(g);
    mj.sess = { dealer: 0, streak: 0, passes: 0, hands: 0, net: 0 };
    return { g, mj };
  };
  it('a loss can take the wallet below zero, then no next hand', () => {
    const { g, mj } = session(50);
    const end = mj.handOver({
      winner: 1,
      from: 0,
      tai: 5,
      deltas: [-120, 120, 0, 0],
      dealerStays: false,
    });
    expect(g.money).toBe(-70);
    expect(end.broke).toBe(true);
    expect(mj.sess.dealer).toBe(1);
    expect(mj.stats.net).toBe(-120);
  });
  it('a win adds up; the dealer stays and the streak grows', () => {
    const { g, mj } = session(200);
    mj.handOver({
      winner: 0,
      from: null,
      self: true,
      tai: 3,
      deltas: [210, -70, -70, -70],
      dealerStays: true,
    });
    expect(g.money).toBe(410);
    expect(mj.sess.streak).toBe(1);
    expect(mj.stats).toMatchObject({ hands: 1, wins: 1, self: 1, best: 3 });
  });
  it('北風北: after 16 dealer changes the session is over', () => {
    const { mj } = session(200);
    mj.sess.passes = 15;
    const end = mj.handOver({ draw: true, deltas: [0, 0, 0, 0], dealerStays: false });
    expect(end.over).toBe(true);
  });
});

describe('抓位、擲骰定莊', () => {
  it('everyone moves to the seat of the wind they drew; whoever drew 東 throws for the first dealer', () => {
    const g = fakeGame();
    const mj = new DormMahjong(g);
    mj.gather();
    mj.sess = { dealer: 0, streak: 0, passes: 0, hands: 0, net: 0 };
    const before = Object.fromEntries(mj.party.map((p) => [p.id, p.seat]));
    let call;
    mj.scene = {
      seatDraw: (winds, apply, done) => (call = { winds, apply, done }),
      roll: (thrower, dice, what) => Object.assign(call, { thrower, dice, what }),
    };
    // a fixed rng: the same draws as drawWinds / rollDice would make with it
    const seq = [0.1, 0.7, 0.4, 0.3, 0.9, 0.5];
    const rng = () => {
      let i = 0;
      return () => seq[i++ % seq.length];
    };
    mj.seatDraw(rng());
    const r2 = rng();
    const winds = drawWinds(r2),
      dice = rollDice(r2);
    expect(call.winds).toEqual(winds);
    const seats = seatsFromWinds(winds);
    const names = call.apply();
    for (const p of mj.party) {
      expect(p.seat).toBe(seats[before[p.id]]);
      expect(names[p.seat]).toBe(p.name);
      expect(typeof mj.ais[p.seat]).toBe('function');
    }
    expect(names[0]).toBe('彥霖');
    call.done();
    const east = seats[winds.indexOf(0)];
    expect(call.thrower).toBe(east);
    expect(call.what).toBe('dealer');
    expect(mj.sess.dealer).toBe(countSeat(east, diceSum(dice)));
  });
});

describe('動態難度與室友短台詞', () => {
  const setupTable = (skill = 0.5, stake = 1) => {
    const g = fakeGame({}, { money: 5000 });
    const mj = new DormMahjong(g);
    mj.gather();
    mj.stats.skill = skill;
    mj.stats.stake = stake;
    mj.sess = {
      dealer: 0,
      streak: 0,
      passes: 0,
      hands: 0,
      net: 0,
      heat: 0,
      winStreak: 0,
      loseStreak: 0,
    };
    return mj;
  };
  it('玩家連贏會拉高 AI 強度並觸發室友「認真／全力」短台詞', () => {
    const mj = setupTable(0.55, 1);
    const startSkill = mj.aiSkill();
    const banters = [];
    for (let i = 0; i < 6; i++) {
      const res = mj.handOver({
        winner: 0,
        from: 1,
        self: false,
        tai: 3,
        deltas: [110, -110, 0, 0],
        dealerStays: true,
      });
      if (res.banter) banters.push(res.banter);
    }
    expect(mj.aiSkill()).toBeGreaterThan(startSkill);
    expect(mj.aiTier().id).toBeGreaterThanOrEqual(2);
    expect(banters.length).toBeGreaterThan(0);
    expect(banters.some((b) => b.dir === 'up' && b.text.length > 0)).toBe(true);
  });
  it('玩家連輸會降低 AI 強度並觸發室友「放輕鬆」短台詞', () => {
    const mj = setupTable(0.45, 0);
    const startSkill = mj.aiSkill();
    const banters = [];
    for (let i = 0; i < 6; i++) {
      const res = mj.handOver({
        winner: 2,
        from: 0,
        self: false,
        tai: 3,
        deltas: [-90, 0, 90, 0],
        dealerStays: false,
      });
      if (res.banter) banters.push(res.banter);
    }
    expect(mj.aiSkill()).toBeLessThan(startSkill);
    expect(mj.aiTier().id).toBe(0);
    expect(banters.length).toBeGreaterThan(0);
    expect(banters.some((b) => b.dir === 'down' && b.text.length > 0)).toBe(true);
  });
  it('讀取舊存檔（沒有 skill 欄位）仍維持預設強度 0.5', () => {
    const g = fakeGame();
    const mj = new DormMahjong(g);
    mj.load({ hands: 5, wins: 2, net: 100 });
    expect(mj.stats.skill).toBe(0.5);
  });
});
