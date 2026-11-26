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
import {
  TurnTimer,
  TURN_LIMIT_MS,
  humanDecisions,
  timeoutAction,
} from '../../src/systems/mahjong/TurnTimer.js';

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

  it('方案 A：客端輸到沒錢會在下局自動退桌由 AI 接手；房主輸到沒錢可轉觀戰＋AI 代打', async () => {
    const bus = createMockBus();
    const hostGame = fakeGame(100);
    const guestGame = fakeGame(50);
    const hostMj = new DormMahjong(hostGame);
    const guestMj = new DormMahjong(guestGame);
    const stubScene = () => ({
      open() {},
      close() {},
      showLobby() {},
      startHand() {},
      _layout() {},
      _showResult() {},
      result: null,
      names: [],
    });
    hostMj.scene = stubScene();
    guestMj.scene = stubScene();

    await hostMj.hostRoom('彥霖', 0, bus);
    const code = hostMj.mp.code;
    await guestMj.joinRoom(code, '小明', bus);
    await new Promise((r) => {
      setTimeout(r, 20);
    });
    hostMj.startMultiHost();
    expect(hostMj.mp.peerCount).toBe(1);

    // 1. 房主輸到負錢（money <= 0），但客端還在房內 → 回傳 canSpectate: true
    const hostEnd = hostMj.handOver({
      winner: 1,
      from: 0,
      tai: 4,
      deltas: [-150, 150, 0, 0],
      dealerStays: false,
    });
    expect(hostGame.money).toBe(-50);
    expect(hostEnd.broke).toBe(true);
    expect(hostEnd.canSpectate).toBe(true);

    // 房主切為觀戰模式（AI 代打座位 0），再打一局不應再變動房主錢包
    hostMj.spectateNext();
    expect(hostMj.sess.spectating).toBe(true);
    expect(hostMj.sess.human[0]).toBe(false);
    const specEnd = hostMj.handOver({
      winner: 0,
      from: 2,
      tai: 2,
      deltas: [50, 0, -50, 0],
      dealerStays: true,
    });
    expect(specEnd.spectating).toBe(true);
    expect(specEnd.broke).toBe(false);
    expect(hostGame.money).toBe(-50); // 觀戰不計錢

    // 2. 客端輸到沒錢後，房主按下一局 → 客端自動退桌、房主立刻把客端座位轉交 AI
    guestMj.handOver({
      winner: 2,
      from: 0,
      tai: 3,
      deltas: [-100, 0, 100, 0],
      dealerStays: false,
    });
    expect(guestGame.money).toBe(-50);
    hostMj.next(); // 廣播 next
    expect(guestMj.mp).toBe(null); // 客端已自動離桌
    expect(hostMj.sess.human[1]).toBe(false); // 房主已把座位 1 交給 AI
    expect(hostGame.toasts.some((t) => t.includes('錢包見底離桌'))).toBe(true);

    hostMj.leave(false);
  });
});

describe('中途加入（下局取代 AI）與觀賽模式（Issue #170）', () => {
  it('Net.js 觀賽序列化：revealAll=true 公開 4 家真手牌；revealAll=false 全面遮罩且維持 144 張守恆', () => {
    const e = new MahjongEngine({
      rng: seeded(77),
      human: [true, false, false, false],
      ai: makeAI(),
    });
    e.start();
    e.step();

    // 開啟觀賽可看手牌：4 家手牌皆與真實引擎一致，且 pending 必為 null
    const openSnap = serializeStateFor(e, 1, { spectate: true, revealAll: true });
    expect(openSnap.spectate).toBe(true);
    expect(openSnap.revealAll).toBe(true);
    expect(openSnap.pending).toBeNull();
    expect(openSnap.players[0].hand).toEqual(e.players[1].hand);
    expect(openSnap.players[3].hand).toEqual(e.players[0].hand);

    const openEv = rotateEventsFor([{ type: 'draw', seat: 0, t: 12 }], 1, {
      spectate: true,
      revealAll: true,
    });
    expect(openEv[0].t).toBe(12);

    // 關閉觀賽可看手牌：所有 4 家皆不洩漏手牌、摸牌事件遮罩為 -1、且維持 144 張守恆
    const hiddenSnap = serializeStateFor(e, 0, { spectate: true, revealAll: false });
    expect(hiddenSnap.spectate).toBe(true);
    expect(hiddenSnap.revealAll).toBe(false);
    expect(hiddenSnap.pending).toBeNull();
    expect(hiddenSnap.drawn).toBeNull();
    expect(hiddenSnap.tenpai).toEqual([]);
    const counts = new Array(FLOWER0 + 8).fill(0);
    for (const P of hiddenSnap.players) {
      for (const k of P.hand) counts[k]++;
      for (const m of P.melds) for (const k of meldTiles(m)) counts[k]++;
      for (const k of P.flowers) counts[k]++;
      for (const k of P.discards) counts[k]++;
    }
    for (const k of hiddenSnap.wall) counts[k]++;
    for (let k = 0; k < KINDS; k++) expect(counts[k]).toBe(4);
    for (let k = FLOWER0; k < FLOWER0 + 8; k++) expect(counts[k]).toBe(1);

    const hiddenEv = rotateEventsFor([{ type: 'draw', seat: 0, t: 12 }], 0, {
      spectate: true,
      revealAll: false,
    });
    expect(hiddenEv[0].t).toBe(-1);
  });

  it('開打後中途加入先觀賽（預設可看手牌、可切換視角與房主即時開關），本局不計錢，下局自動取代 AI 上桌並正常結算', async () => {
    const bus = createMockBus();
    const hostGame = fakeGame(1000);
    const lateGame = fakeGame(600);
    const hostMj = new DormMahjong(hostGame);
    const lateMj = new DormMahjong(lateGame);
    const stubScene = () => ({
      open() {},
      close() {},
      showLobby() {},
      startHand() {},
      _layout() {},
      _showResult() {},
      result: null,
      names: [],
    });
    hostMj.scene = stubScene();
    lateMj.scene = stubScene();

    // 房主 1 人直接開打（座位 1, 2, 3 為 AI），預設觀賽可看手牌 = 開
    await hostMj.hostRoom('彥霖', 0, bus);
    const code = hostMj.mp.code;
    expect(hostMj.mp.spectateReveal).toBe(true);
    hostMj.startMultiHost();
    expect(hostMj.sess.human).toEqual([true, false, false, false]);

    // 開打後小明中途加入 → 進入觀賽狀態且排隊補位 #1，立刻收到當前盤面（revealAll = true）
    await lateMj.joinRoom(code, '小明', bus);
    await new Promise((r) => {
      setTimeout(r, 20);
    });

    expect(lateMj.sess.spectating).toBe(true);
    expect(lateMj.sess.wantSeat).toBe(true);
    expect(lateMj.sess.queuePos).toBe(1);
    expect(lateMj.engine.spectate).toBe(true);
    expect(lateMj.engine.revealAll).toBe(true);
    expect(hostMj.mp.spectatorCount).toBe(1);

    // 房主即時關閉「觀賽可看手牌」→ 觀賽端立刻切換為隱藏手牌
    hostMj.toggleSpectateReveal();
    expect(hostMj.mp.spectateReveal).toBe(false);
    expect(lateMj.engine.revealAll).toBe(false);

    // 觀賽者切換視角（seat 0 → seat 1）→ 名稱陣列同步旋轉
    const origFirst = lateMj.scene.names[0];
    lateMj.cycleSpectatorView();
    expect(lateMj.sess.viewSeat).toBe(1);
    expect(lateMj.scene.names[0]).not.toBe(origFirst);

    // 本局結束：觀賽期間絕不變動本機錢包
    lateMj.handOver({
      winner: 0,
      from: 1,
      tai: 3,
      deltas: [180, -180, 0, 0],
      dealerStays: false,
    });
    expect(lateGame.money).toBe(600);

    // 房主按下一局 → 小明自動取代座位 1 的 AI 上桌！
    hostMj.next();
    expect(hostMj.sess.human).toEqual([true, true, false, false]);
    expect(hostMj.sess.names[1]).toBe('小明');
    expect(hostMj.mp.spectatorCount).toBe(0);
    expect(lateMj.sess.spectating).toBe(false);
    expect(lateMj.sess.seat).toBe(1);
    expect(lateMj.scene.names[0]).toBe('小明');
    expect(lateMj.engine.spectate).toBe(false);

    // 上桌後本局結算正常寫回小明本機錢包
    lateMj.handOver({
      winner: 0,
      from: 2,
      tai: 2,
      deltas: [100, 0, -100, 0],
      dealerStays: false,
    });
    expect(lateGame.money).toBe(700);

    hostMj.leave(false);
    lateMj.leave(false);
  });

  it('人滿 4 位真人或選擇純觀賽時維持觀賽；排隊但錢包見底者會略過補位維持觀賽', async () => {
    const bus = createMockBus();
    const stubScene = () => ({
      open() {},
      close() {},
      showLobby() {},
      startHand() {},
      _layout() {},
      _showResult() {},
      result: null,
      names: [],
    });

    const hostMj = new DormMahjong(fakeGame(1000));
    hostMj.scene = stubScene();
    await hostMj.hostRoom('彥霖', 0, bus);
    const code = hostMj.mp.code;

    // 情境 A：只有房主＋AI，但「阿呆」選擇純觀賽、「破產君」錢包 0 排隊補位
    hostMj.startMultiHost();

    const pureSpecGame = fakeGame(500);
    const pureSpec = new DormMahjong(pureSpecGame);
    pureSpec.scene = stubScene();
    await pureSpec.joinRoom(code, '阿呆', bus, { spectateOnly: true });

    const brokeGame = fakeGame(0);
    const brokeSpec = new DormMahjong(brokeGame);
    brokeSpec.scene = stubScene();
    await brokeSpec.joinRoom(code, '破產君', bus);

    await new Promise((r) => {
      setTimeout(r, 20);
    });
    expect(pureSpec.sess.spectating).toBe(true);
    expect(pureSpec.sess.wantSeat).toBe(false);
    expect(brokeSpec.sess.spectating).toBe(true);
    expect(brokeSpec.sess.wantSeat).toBe(true);

    // 房主開下一局：純觀賽不補位、破產君因錢包 <= 0 被略過並收到提示，兩人都維持觀賽
    hostMj.next();
    expect(hostMj.sess.human).toEqual([true, false, false, false]);
    expect(pureSpec.sess.spectating).toBe(true);
    expect(brokeSpec.sess.spectating).toBe(true);
    expect(brokeGame.toasts.some((t) => t.includes('錢包見底'))).toBe(true);

    // 情境 B：若 3 位有錢真人把座位坐滿後，第 5 人進房會一直維持觀賽
    const p1 = new DormMahjong(fakeGame(500));
    const p2 = new DormMahjong(fakeGame(500));
    const p3 = new DormMahjong(fakeGame(500));
    const p5 = new DormMahjong(fakeGame(500));
    for (const m of [p1, p2, p3, p5]) m.scene = stubScene();
    await p1.joinRoom(code, '一號', bus);
    await p2.joinRoom(code, '二號', bus);
    await p3.joinRoom(code, '三號', bus);
    await p5.joinRoom(code, '五號', bus);
    await new Promise((r) => {
      setTimeout(r, 20);
    });

    hostMj.next();
    expect(hostMj.sess.human).toEqual([true, true, true, true]);
    expect(p1.sess.spectating).toBe(false);
    expect(p2.sess.spectating).toBe(false);
    expect(p3.sess.spectating).toBe(false);
    expect(p5.sess.spectating).toBe(true); // 4 人已滿，第 5 人維持觀賽

    // 再開下一局仍然維持觀賽（不取代真人）
    hostMj.next();
    expect(p5.sess.spectating).toBe(true);

    hostMj.leave(false);
    for (const m of [pureSpec, brokeSpec, p1, p2, p3, p5]) m.leave(false);
  });

  it('全桌同步圍觀名單（含穩定 id）與彈幕反應廣播（帶發送者 id 以便對應站位顯示）', async () => {
    const bus = createMockBus();
    const hostReacts = [];
    const seatedReacts = [];
    const specReacts = [];
    const stubScene = (bucket) => ({
      open() {},
      close() {},
      showLobby() {},
      startHand() {},
      _layout() {},
      _showResult() {},
      showReaction: (ev) => bucket.push(ev),
      result: null,
      names: [],
    });

    const hostMj = new DormMahjong(fakeGame(1000));
    const seatedMj = new DormMahjong(fakeGame(800));
    const spec1 = new DormMahjong(fakeGame(600));
    const spec2 = new DormMahjong(fakeGame(600));
    hostMj.scene = stubScene(hostReacts);
    seatedMj.scene = stubScene(seatedReacts);
    spec1.scene = stubScene(specReacts);
    spec2.scene = stubScene([]);

    await hostMj.hostRoom('彥霖', 0, bus);
    const code = hostMj.mp.code;
    await seatedMj.joinRoom(code, '小明', bus);
    await new Promise((r) => {
      setTimeout(r, 20);
    });
    hostMj.startMultiHost();

    // 兩位觀賽者中途加入 → 房主與座位玩家都能即時看到兩人的名單與不同穩定 id
    await spec1.joinRoom(code, '圍觀甲', bus, { spectateOnly: true });
    await spec2.joinRoom(code, '圍觀乙', bus);
    await new Promise((r) => {
      setTimeout(r, 20);
    });

    expect(hostMj.sess.spectators.map((s) => s.name)).toEqual(['圍觀甲', '圍觀乙']);
    expect(seatedMj.sess.spectators.map((s) => s.name)).toEqual(['圍觀甲', '圍觀乙']);
    expect(hostMj.sess.spectators[0].id).not.toBe(hostMj.sess.spectators[1].id);

    // 圍觀甲與圍觀乙各自發反應彈幕 → 全桌收到各自獨立的 fromId（對應各自 3D 站位頭頂）
    spec1.sendReaction('👏 好牌！');
    spec2.sendReaction('😱 放槍了');
    expect(hostReacts.length).toBe(2);
    expect(seatedReacts.length).toBe(2);
    expect(specReacts.length).toBe(2);
    expect(hostReacts[0]).toMatchObject({ name: '圍觀甲', text: '👏 好牌！', seat: null });
    expect(hostReacts[1]).toMatchObject({ name: '圍觀乙', text: '😱 放槍了', seat: null });
    expect(hostReacts[0].fromId).not.toBe(hostReacts[1].fromId);
    expect(hostReacts[0].fromId).toBe(hostMj.sess.spectators[0].id);
    expect(hostReacts[1].fromId).toBe(hostMj.sess.spectators[1].id);

    hostMj.leave(false);
    seatedMj.leave(false);
    spec1.leave(false);
    spec2.leave(false);
  });
});

describe('多人擲骰開門動畫（Issue #207）', () => {
  const rollScene = () => {
    const sc = {
      rolls: [],
      open() {},
      close() {},
      showLobby() {},
      startHand(e) {
        sc.e = e;
      },
      _layout() {},
      _showResult() {},
      roll(thrower, dice, what, done, opts) {
        sc.rolls.push({ thrower, dice: [...dice], what, auto: !!opts?.auto });
      },
      result: null,
      names: [],
    };
    return sc;
  };

  it('房主決定點數並廣播，房主、客端、觀戰者都播同一組點數（座位依各自視角旋轉），換莊後下一局再擲一次', async () => {
    const bus = createMockBus();
    const hostMj = new DormMahjong(fakeGame(1000));
    const guestMj = new DormMahjong(fakeGame(1000));
    const specMj = new DormMahjong(fakeGame(1000));
    hostMj.scene = rollScene();
    guestMj.scene = rollScene();
    specMj.scene = rollScene();

    await hostMj.hostRoom('彥霖', 0, bus);
    const code = hostMj.mp.code;
    await guestMj.joinRoom(code, '小明', bus);
    await specMj.joinRoom(code, '阿觀', bus, { spectateOnly: true });
    await new Promise((r) => {
      setTimeout(r, 20);
    });
    hostMj.startMultiHost();

    const h = hostMj.scene.rolls;
    expect(h).toHaveLength(1);
    expect(h[0].what).toBe('cut');
    expect(h[0].auto).toBe(true); // 多人不等人按，全桌同時擲
    expect(h[0].thrower).toBe(hostMj.sess.dealer);
    // 擲骰時還沒發牌：動畫播完才由畫面 step() 發牌
    expect(hostMj.engine.phase).toBe('deal');

    const g = guestMj.scene.rolls;
    expect(g).toHaveLength(1);
    expect(g[0].dice).toEqual(h[0].dice);
    expect(g[0].thrower).toBe((h[0].thrower - guestMj.sess.seat + 4) % 4);
    expect(guestMj.engine.phase).toBe('deal');

    const s = specMj.scene.rolls;
    expect(s).toHaveLength(1);
    expect(s[0].dice).toEqual(h[0].dice);
    expect(s[0].thrower).toBe((h[0].thrower - specMj.sess.viewSeat + 4) % 4);

    // 這局莊家下莊 → 下一局換莊，再擲一次並同步
    hostMj.handOver({ winner: 1, from: 2, tai: 1, deltas: [0, 40, -40, 0], dealerStays: false });
    guestMj.handOver({ winner: 0, from: 1, tai: 1, deltas: [40, -40, 0, 0], dealerStays: false });
    hostMj.next();
    expect(h).toHaveLength(2);
    expect(h[1].thrower).toBe(1);
    expect(g).toHaveLength(2);
    expect(g[1].dice).toEqual(h[1].dice);
    expect(g[1].thrower).toBe((1 - guestMj.sess.seat + 4) % 4);
    expect(s).toHaveLength(2);
    expect(s[1].dice).toEqual(h[1].dice);

    hostMj.leave(false);
    guestMj.leave(false);
    specMj.leave(false);
  });

  it('rotateEventsFor 會旋轉 roll 事件的擲骰座位、點數原樣保留', () => {
    const ev = [{ type: 'roll', seat: 2, dice: [3, 5, 6] }];
    expect(rotateEventsFor(ev, 1)).toEqual([{ type: 'roll', seat: 1, dice: [3, 5, 6] }]);
    expect(rotateEventsFor(ev, 3, { spectate: true })).toEqual([
      { type: 'roll', seat: 3, dice: [3, 5, 6] },
    ]);
  });
});

describe('多人出牌限時 20 秒（Issue #208）', () => {
  const stub = () => ({
    open() {},
    close() {},
    showLobby() {},
    startHand() {},
    _layout() {},
    _showResult() {},
    roll() {},
    result: null,
    names: [],
  });
  // 推進引擎直到有人要決定（房主照實廣播）
  const runUntilPending = (mj) => {
    const e = mj.engine;
    let guard = 0;
    while (!e.pending && e.phase !== 'end' && guard++ < 400) {
      e.events.length = 0;
      e.step();
      mj.onHostStep([...e.events]);
    }
    return e.pending;
  };

  it('TurnTimer：真人輪到出牌開始計時，20 秒到期；只算真人，換一手重新計時', () => {
    let now = 1000;
    const t = new TurnTimer({ now: () => now });
    const ai = makeAI({ attack: 0.5, defense: 0.5 });
    const e = new MahjongEngine({
      rng: seeded(7),
      dealer: 0,
      human: [true, false, false, false],
      ai,
    });
    while (!e.pending && e.phase !== 'end') e.step();
    expect(e.pending.kind).toBe('turn');
    expect(humanDecisions(e)).toHaveLength(1);
    const [d] = t.sync(e);
    expect(d).toMatchObject({ seat: 0, kind: 'turn', until: 1000 + TURN_LIMIT_MS });
    now += TURN_LIMIT_MS - 1;
    expect(t.expired(e)).toHaveLength(0);
    expect(t.left(e)[0].left).toBe(1);
    now += 1;
    expect(t.expired(e)).toHaveLength(1);

    // 超時：打出剛摸的那張
    const act = timeoutAction(e, 0, 'turn');
    expect(act).toEqual({ type: 'discard', t: e.drawn });
    expect(e.decideFor(0, act)).toBe(true);
    expect(e.players[0].discards.at(-1)).toBe(act.t);
    expect(t.sync(e)).toHaveLength(0);

    // AI 座位從來不計時
    e.human = [false, false, false, false];
    expect(humanDecisions(e)).toHaveLength(0);
  });

  it('timeoutAction：回應一律「過」；吃碰後沒摸牌時由 AI 挑一張（挑到不合法的就打最後一張）', () => {
    const e = {
      justDrew: false,
      turn: 1,
      drawn: 5,
      players: [{ hand: [] }, { hand: [1, 2, 3, 9] }],
    };
    expect(timeoutAction(e, 1, 'claim')).toEqual({ type: 'pass' });
    expect(timeoutAction(e, 1, 'turn', () => 2)).toEqual({ type: 'discard', t: 2 });
    expect(timeoutAction(e, 1, 'turn', () => 33)).toEqual({ type: 'discard', t: 9 });
    expect(
      timeoutAction(e, 1, 'turn', () => {
        throw new Error('x');
      })
    ).toEqual({ type: 'discard', t: 9 });
  });

  it('房主計時並判定、倒數跟著快照送到客端與觀戰者（座位旋轉），時間到替客端出牌並通知；單人模式不限時', async () => {
    const bus = createMockBus();
    const hostGame = fakeGame(1000);
    const guestGame = fakeGame(1000);
    const hostMj = new DormMahjong(hostGame);
    const guestMj = new DormMahjong(guestGame);
    const specMj = new DormMahjong(fakeGame(1000));
    hostMj.scene = stub();
    guestMj.scene = stub();
    specMj.scene = stub();
    let now = 50000;
    hostMj.turnTimer = new TurnTimer({ now: () => now });

    await hostMj.hostRoom('彥霖', 0, bus);
    const code = hostMj.mp.code;
    await guestMj.joinRoom(code, '小明', bus);
    await specMj.joinRoom(code, '阿觀', bus, { spectateOnly: true });
    await new Promise((r) => {
      setTimeout(r, 20);
    });
    hostMj.startMultiHost();
    const e = hostMj.engine;
    const gSeat = guestMj.sess.seat;

    // 推到輪到客端（出牌或回應）為止；途中房主自己的決定也會計時，到期就自動處理
    let guard = 0;
    let target = null;
    while (guard++ < 200 && e.phase !== 'end') {
      runUntilPending(hostMj);
      target = humanDecisions(e).find((d) => d.seat === gSeat);
      if (target) break;
      now += TURN_LIMIT_MS;
      expect(hostMj.tickTurnTimers()).toBeGreaterThan(0); // 房主自己超時也照規則處理
      expect(hostGame.toasts.some((t) => t.includes('時間到'))).toBe(true);
    }
    expect(target).toBeTruthy();

    // 客端看到自己（本地座位 0）在倒數 20 秒；觀戰者看到同一個座位依視角旋轉
    const gt = guestMj.turnTimers().find((d) => d.seat === 0);
    expect(gt).toBeTruthy();
    expect(gt.kind).toBe(target.kind);
    expect(gt.until - Date.now()).toBeGreaterThan(TURN_LIMIT_MS - 2000);
    const st = specMj.engine.timers.find((d) => d.seat === (gSeat - specMj.sess.viewSeat + 4) % 4);
    expect(st).toBeTruthy();

    // 19 秒還沒到；20 秒到了房主替客端處理
    const before = e.players[gSeat].discards.length;
    const drawn = e.drawn;
    now += TURN_LIMIT_MS - 1000;
    hostMj.tickTurnTimers();
    expect(humanDecisions(e).some((d) => d.seat === gSeat)).toBe(true);
    now += 1000;
    hostMj.tickTurnTimers();
    expect(humanDecisions(e).some((d) => d.key === target.key)).toBe(false);
    if (target.kind === 'turn') {
      expect(e.players[gSeat].discards.length).toBe(before + 1);
      expect(e.players[gSeat].discards.at(-1)).toBe(drawn);
    } else {
      expect(e.answers[gSeat]).toEqual({ type: 'pass' });
    }
    expect(guestGame.toasts.some((t) => t.includes('時間到'))).toBe(true);
    // 客端超時後不再顯示自己的倒數
    expect(guestMj.turnTimers().some((d) => d.seat === 0 && d.kind === target.kind)).toBe(false);

    hostMj.leave(false);
    guestMj.leave(false);
    specMj.leave(false);

    // 單人模式：完全沒有計時
    const solo = new DormMahjong(fakeGame(1000));
    solo.sess = { multi: false };
    solo.engine = new MahjongEngine({ rng: seeded(3), human: [true, false, false, false] });
    expect(solo.turnTimers()).toEqual([]);
    expect(solo.tickTurnTimers()).toBe(0);
  });

  it('serializeStateFor 把限時座位旋轉成客端視角，RemoteMahjongEngine 換算成本機到期時刻', () => {
    const e = new MahjongEngine({ rng: seeded(11), human: [true, true, false, false] });
    e.start();
    const snap = serializeStateFor(e, 1, { timers: [{ seat: 1, kind: 'turn', left: 12000 }] });
    expect(snap.timers).toEqual([{ seat: 0, kind: 'turn', left: 12000 }]);
    const r = new RemoteMahjongEngine();
    const t0 = Date.now();
    r.applySnapshot(snap);
    expect(r.timers[0].seat).toBe(0);
    expect(r.timers[0].until).toBeGreaterThanOrEqual(t0 + 12000);
    expect(serializeStateFor(e, 0).timers).toEqual([]);
  });
});

describe('觀戰者左右切換視角（Issue #209）', () => {
  it('cycleSpectatorView(-1/1) 往上家／下家切換並同步房主送來的視角', async () => {
    const bus = createMockBus();
    const hostMj = new DormMahjong(fakeGame(1000));
    const specGame = fakeGame(1000);
    const specMj = new DormMahjong(specGame);
    const stub = () => ({
      open() {},
      close() {},
      showLobby() {},
      startHand() {},
      _layout() {},
      _showResult() {},
      roll() {},
      result: null,
      names: [],
    });
    hostMj.scene = stub();
    specMj.scene = stub();
    await hostMj.hostRoom('彥霖', 0, bus);
    hostMj.startMultiHost();
    await specMj.joinRoom(hostMj.mp.code, '阿觀', bus, { spectateOnly: true });
    await new Promise((r) => {
      setTimeout(r, 20);
    });
    expect(specMj.sess.viewSeat).toBe(0);
    const names = [...specMj.sess.names];

    specMj.cycleSpectatorView(-1); // ← 上家
    expect(specMj.sess.viewSeat).toBe(3);
    expect(specMj.scene.names[0]).toBe(names[3]);
    expect(specGame.toasts.at(-1)).toContain(names[3]);

    specMj.cycleSpectatorView(1); // → 下家（回到房主）
    specMj.cycleSpectatorView(1);
    expect(specMj.sess.viewSeat).toBe(1);
    expect(specMj.scene.names[0]).toBe(names[1]);

    hostMj.leave(false);
    specMj.leave(false);
  });
});

describe('觀戰者繞著牌桌走，全桌都看得到他移動', () => {
  const stub = () => ({
    open() {},
    close() {},
    showLobby() {},
    startHand() {},
    _layout() {},
    _showResult() {},
    roll() {},
    result: null,
    names: [],
  });
  const tick = () =>
    new Promise((r) => {
      setTimeout(r, 20);
    });
  it('角度轉給房主與其他人；走到誰背後就換看誰；快照帶框架', async () => {
    const bus = createMockBus();
    const hostMj = new DormMahjong(fakeGame(1000));
    const specMj = new DormMahjong(fakeGame(1000));
    const spec2Mj = new DormMahjong(fakeGame(1000));
    for (const m of [hostMj, specMj, spec2Mj]) m.scene = stub();
    await hostMj.hostRoom('彥霖', 0, bus);
    hostMj.startMultiHost();
    await specMj.joinRoom(hostMj.mp.code, '阿觀', bus, { spectateOnly: true });
    await spec2Mj.joinRoom(hostMj.mp.code, '小看', bus, { spectateOnly: true });
    await tick();

    // 一進來就站在房主背後附近（±35°），看房主那家，知道自己的 id
    const me = specMj.sess.myId;
    expect(me).toBeTruthy();
    expect(Math.abs(angDiffDeg(specMj.sess.myAng, 0))).toBeLessThanOrEqual(35);
    expect(specMj.sess.viewSeat).toBe(0);
    expect(hostMj.sess.spectators.find((x) => x.id === me).ang).toBe(specMj.sess.myAng);

    // 往下家那邊走 100°：超過 45° 就換看下家（座位 1），房主和另一個觀戰者都收到新角度
    specMj.sess.myAng = 0;
    specMj._specSentAt = 0;
    specMj.orbitSpectator(100);
    await tick();
    expect(specMj.sess.myAng).toBe(100);
    expect(specMj.sess.viewSeat).toBe(1);
    expect(hostMj.sess.spectators.find((x) => x.id === me).ang).toBe(100);
    expect(spec2Mj.sess.spectators.find((x) => x.id === me).ang).toBe(100);

    // 連續小步走：0.1 秒內只送一次，停下來 flush 補送最後的位置
    specMj.orbitSpectator(5);
    specMj.orbitSpectator(5);
    await tick();
    expect(hostMj.sess.spectators.find((x) => x.id === me).ang).toBe(100);
    specMj._specSentAt = 0;
    specMj.flushSpecPos();
    await tick();
    expect(hostMj.sess.spectators.find((x) => x.id === me).ang).toBe(110);

    // 快照標著它以房主的哪個座位為本地座位 0（觀戰者的鏡頭靠它換算角度）
    hostMj.engine.start?.();
    hostMj.mp.broadcastState(hostMj.engine, []);
    await tick();
    expect(specMj.engine.frame).toBe(1);
    expect(spec2Mj.engine.frame).toBe(0);

    // 往回走一圈繞過 0°：角度保持在 0～360
    specMj.orbitSpectator(-200);
    expect(specMj.sess.myAng).toBe(270);
    expect(specMj.sess.viewSeat).toBe(3);

    // ◀ ▶ 按鈕：直接走到那家背後
    specMj.cycleSpectatorView(1);
    expect(specMj.sess.viewSeat).toBe(0);
    expect(specMj.sess.myAng).toBe(0);

    for (const m of [hostMj, specMj, spec2Mj]) m.leave(false);
  });
});

function angDiffDeg(a, b) {
  return ((((a - b) % 360) + 540) % 360) - 180;
}
