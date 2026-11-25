import { describe, it, expect } from 'vitest';
import { MahjongEngine } from '../../src/systems/mahjong/Engine.js';
import { makeAI } from '../../src/systems/mahjong/AI.js';
import { KINDS, FLOWER0, meldTiles } from '../../src/systems/mahjong/Rules.js';
import {
  makeRoomCode,
  normalizeRoomCode,
  serializeStateFor,
  rotateEventsFor,
  RemoteMahjongEngine,
} from '../../src/systems/mahjong/Net.js';
import { createHostRoom, joinGuestRoom } from '../../src/systems/mahjong/P2P.js';
import { DormMahjong, ROSTER } from '../../src/systems/mahjong/Mahjong.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 記憶體內模擬 trystero@0.27 房間匯流排（MessageAction: { send(data, { target }), onMessage(cb(data, ctx)) }）
function createMockBus() {
  const rooms = new Map();
  let nextPeer = 1;
  return (roomId) => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    const peers = rooms.get(roomId);
    const id = `peer-${nextPeer++}`;
    const handlers = new Map();
    const joinCbs = [];
    const leaveCbs = [];
    const node = {
      id,
      deliver(name, data, from) {
        handlers.get(name)?.(structuredClone(data), { peerId: from, userId: from, roles: [] });
      },
      notifyJoin(other) {
        for (const cb of joinCbs) cb({ peerId: other, userId: other, roles: [] });
      },
      notifyLeave(other) {
        for (const cb of leaveCbs) cb({ peerId: other, userId: other });
      },
    };
    const existing = [...peers.values()];
    peers.set(id, node);
    const api = {
      makeAction(name) {
        return {
          send(data, opts) {
            const target = opts?.target;
            if (target) peers.get(target)?.deliver(name, data, id);
            else for (const [pid, p] of peers) if (pid !== id) p.deliver(name, data, id);
            return Promise.resolve();
          },
          onMessage(cb) {
            handlers.set(name, cb);
            return () => handlers.delete(name);
          },
        };
      },
      onPeerJoin(cb) {
        joinCbs.push(cb);
        return () => {};
      },
      onPeerLeave(cb) {
        leaveCbs.push(cb);
        return () => {};
      },
      onError() {
        return () => {};
      },
      leave() {
        peers.delete(id);
        for (const p of peers.values()) p.notifyLeave(id);
        return Promise.resolve();
      },
    };
    // 模擬配對成功通知
    queueMicrotask(() => {
      for (const other of existing) {
        other.notifyJoin(id);
        node.notifyJoin(other.id);
      }
    });
    return Promise.resolve(api);
  };
}

function fakeGame(money = 1000) {
  const toasts = [];
  const g = {
    clock: 21 * 60,
    money,
    ledger: [],
    scene: { add() {} },
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
    earn(n, what) {
      this.money += n;
      this.ledger.push({ n, what });
    },
    pay(n, what) {
      this.money -= n;
      this.ledger.push({ n: -n, what });
    },
    toasts,
  };
  return g;
}

describe('P2P 房號與視角序列化（Net.js）', () => {
  it('產生與正規化 4 碼房號', () => {
    const code = makeRoomCode(seeded(42));
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
    expect(normalizeRoomCode(' a7-k3x ')).toBe('A7K3');
  });

  it('對任意客端座位序列化後維持精確 144 張守恆、不洩漏他家手牌', () => {
    const e = new MahjongEngine({
      rng: seeded(17),
      human: [true, true, true, false],
      ai: makeAI(),
    });
    e.start();
    e.step(); // dealer draws

    for (const seat of [1, 2, 3]) {
      const snap = serializeStateFor(e, seat);
      // 客端本地座位 0 一定是自己的真實手牌
      expect(snap.players[0].hand).toEqual(e.players[seat].hand);
      // 統計 144 張守恆（確保 MahjongScene 3D 牌池永不缺牌）
      const counts = new Array(FLOWER0 + 8).fill(0);
      for (const P of snap.players) {
        for (const k of P.hand) counts[k]++;
        for (const m of P.melds) for (const k of meldTiles(m)) counts[k]++;
        for (const k of P.flowers) counts[k]++;
        for (const k of P.discards) counts[k]++;
      }
      for (const k of snap.wall) counts[k]++;
      for (let k = 0; k < KINDS; k++) expect(counts[k]).toBe(4);
      for (let k = FLOWER0; k < FLOWER0 + 8; k++) expect(counts[k]).toBe(1);
    }

    // 他家摸牌事件不洩漏摸到哪張
    const rotEv = rotateEventsFor([{ type: 'draw', seat: 0, t: 15 }], 2);
    expect(rotEv[0]).toEqual({ type: 'draw', seat: 2, t: -1 });
  });
});

describe('多真人引擎與斷線交給 AI（Engine.js）', () => {
  it('支援多真人同時回應吃碰槓，且任一真人斷線可無縫交給 AI 接手', () => {
    const e = new MahjongEngine({
      rng: seeded(99),
      human: [true, true, false, false],
      ai: makeAI({ skill: 0.5 }),
      dealer: 0,
    });
    let disconnected = false;
    let steps = 0;
    while (e.phase !== 'end' && ++steps < 1500) {
      if (e.step()) continue;
      // 模擬打到一半座位 1 斷線 → 交給 AI 接手
      if (!disconnected && e.discardsMade >= 6) {
        disconnected = true;
        e.handOverToAI(1);
        continue;
      }
      for (const s of [0, 1]) {
        const p = e.pendingFor(s);
        if (!p) continue;
        if (p.kind === 'turn') {
          if (p.options.tsumo) e.decideFor(s, { type: 'tsumo' });
          else e.decideFor(s, { type: 'discard', t: e.players[s].hand[0] });
        } else {
          const hu = p.options.find((o) => o.type === 'hu');
          e.decideFor(s, hu || { type: 'pass' });
        }
      }
    }
    expect(disconnected).toBe(true);
    expect(e.phase).toBe('end');
    expect(e.result.deltas.reduce((a, b) => a + b)).toBe(0);
  });
});

describe('房主＋客端 P2P 房間流程與本機金錢結算（P2P.js + Mahjong.js）', () => {
  it('2 位真人連線＋自動補 2 位 AI 打完一局，輸贏正確寫回各自本機錢包', async () => {
    const bus = createMockBus();
    const hostGame = fakeGame(1000);
    const guestGame = fakeGame(800);

    let hostLobby = null;
    let guestLobby = null;
    let guestStart = null;
    let hostEngine = null;
    const guestProxy = new RemoteMahjongEngine((act) => guestRoom.sendAction(act));

    const hostRoom = await createHostRoom({
      code: 'TEST',
      name: '彥霖',
      stake: 1,
      joinRoomFn: bus,
      onLobby: (l) => (hostLobby = l),
      onAction: (seat, act) => {
        hostEngine.events.length = 0;
        if (hostEngine.decideFor(seat, act))
          hostRoom.broadcastState(hostEngine, [...hostEngine.events]);
      },
    });

    const guestRoom = await joinGuestRoom({
      code: 'TEST',
      name: '小明',
      joinRoomFn: bus,
      onLobby: (l) => (guestLobby = l),
      onStart: (d) => (guestStart = d),
      onState: (snap, evs) => guestProxy.applySnapshot(snap, evs),
    });

    // 等 microtask 配對與 hello -> lobby 完成
    await new Promise((r) => {
      setTimeout(r, 20);
    });
    expect(hostLobby.seats.filter((s) => s.name).length).toBe(2);
    expect(guestLobby.code).toBe('TEST');
    expect(guestLobby.seats[1].name).toBe('小明');

    // 房主直接開打：座位 2, 3 自動補上室友 AI
    const info = hostRoom.startGame(ROSTER.slice(0, 3));
    expect(info.human).toEqual([true, true, false, false]);
    expect(info.aiSeats).toEqual([2, 3]);
    expect(guestStart.seat).toBe(1);
    expect(guestStart.names[0]).toBe('小明');
    expect(guestStart.names[3]).toBe('彥霖');

    // 執行一整局：房主跑權威 MahjongEngine，客端透過 RemoteMahjongEngine 回應
    const hostAI = makeAI({ skill: 0.5 });
    const guestAI = makeAI({ skill: 0.5 });
    hostEngine = new MahjongEngine({
      rng: seeded(123),
      human: [...info.human],
      ai: makeAI({ skill: 0.5 }),
      base: 50,
      perTai: 20,
    });
    hostEngine.start();
    hostRoom.broadcastState(hostEngine, [...hostEngine.events]);

    let guard = 0;
    while (hostEngine.phase !== 'end' && ++guard < 2000) {
      hostEngine.events.length = 0;
      const moved = hostEngine.step();
      hostRoom.broadcastState(hostEngine, [...hostEngine.events]);
      if (moved) continue;
      // 房主（seat 0）操作
      const p0 = hostEngine.pendingFor(0);
      if (p0) {
        const act = hostAI(hostEngine, 0, p0.kind, p0.options);
        hostEngine.events.length = 0;
        hostEngine.decideFor(0, act);
        hostRoom.broadcastState(hostEngine, [...hostEngine.events]);
      }
      // 客端（從 RemoteMahjongEngine 本地座位 0）操作
      if (guestProxy.pending?.seat === 0) {
        const p = guestProxy.pending;
        if (p.kind === 'turn') {
          const act = p.options.tsumo
            ? { type: 'tsumo' }
            : { type: 'discard', t: guestProxy.players[0].hand[0] };
          guestProxy.decide(act);
        } else {
          const hu = p.options.find((o) => o.type === 'hu');
          guestProxy.decide(hu || { type: 'pass' });
        }
      }
    }

    expect(hostEngine.phase).toBe('end');
    expect(guestProxy.phase).toBe('end');
    expect(guestProxy.result).not.toBeNull();
    // 客端收到的 deltas[0] 必須剛好等於房主端座位 1 的輸贏金額
    expect(guestProxy.result.deltas[0]).toBe(hostEngine.result.deltas[1]);

    // 驗證雙方各自透過 DormMahjong.handOver() 把錢寫回各自本機遊戲錢包
    const hostMj = new DormMahjong(hostGame);
    hostMj.sess = { dealer: 0, streak: 0, passes: 0, hands: 0, net: 0, multi: true };
    hostMj.handOver(hostEngine.result);

    const guestMj = new DormMahjong(guestGame);
    guestMj.sess = { dealer: 0, streak: 0, passes: 0, hands: 0, net: 0, multi: true, guest: true };
    guestMj.handOver(guestProxy.result);

    expect(hostGame.money).toBe(1000 + hostEngine.result.deltas[0]);
    expect(guestGame.money).toBe(800 + hostEngine.result.deltas[1]);
    expect(guestMj.stats.net).toBe(hostEngine.result.deltas[1]);

    hostRoom.close();
    guestRoom.close();
    expect(guestAI).toBeTypeOf('function');
  });

  it('實際呼叫 trystero joinRoom + createHostRoom 符合 0.27 API 不會拋錯', async () => {
    const { joinRoom } = await import('trystero');
    let lobby = null;
    const host = await createHostRoom({
      code: 'LIVE',
      name: '彥霖',
      stake: 0,
      joinRoomFn: (roomId) =>
        joinRoom(
          { appId: 'yanlin-gta-mahjong-test', identity: 'none', relayConfig: { urls: [] } },
          roomId
        ),
      onLobby: (l) => (lobby = l),
    });
    expect(host.code).toBe('LIVE');
    expect(lobby?.code).toBe('LIVE');
    expect(lobby?.seats?.[0]?.name).toBe('彥霖');
    host.close();
  });
});
