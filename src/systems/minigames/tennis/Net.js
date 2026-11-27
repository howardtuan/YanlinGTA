// 網球線上對打的連線層：和 277 麻將一樣用 trystero（WebRTC P2P，延遲載入，不需要伺服器），4 碼房號。
// - 房主（hostTennis）：開房、等第一個朋友加入（之後再來的人回「房間滿了」），跑權威的 Rules.js，
//   每 50 ms 送一次局面快照（含這段時間的事件：擊球、彈地、出界、得分…），收朋友的位置與揮拍。
// - 朋友（joinTennis）：輸入房號，一直打招呼直到房主回 start；每 50 ms 送自己的位置與方向，揮拍時馬上送一次。
// - 兩邊互送 ping 量來回時間；房主收到揮拍時把揮拍時間往回推半個來回（最多 0.12 s），補網路延遲。
// 不碰 DOM 與 three.js：tests/unit/tennis.test.js 用假的房間測。
const APP_ID = 'yanlin-gta-tennis-v1';
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeCode = (rng = Math.random) =>
  Array.from({ length: 4 }, () => ROOM_CHARS[Math.floor(rng() * ROOM_CHARS.length)]).join('');
export const normCode = (raw) =>
  String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
const peerOf = (ctx) => (typeof ctx === 'string' ? ctx : ctx?.peerId || null);

async function defaultJoinRoom(roomId) {
  if (!globalThis.crypto?.subtle) throw new Error('需要 HTTPS 或 localhost 才能建立 P2P 連線');
  const mod = await import('trystero');
  return mod.joinRoom({ appId: APP_ID, identity: 'none' }, roomId);
}
function action(room, name) {
  const a = room.makeAction(name);
  return [
    (data, to) => {
      try {
        const p = a.send(data, to ? { target: to } : undefined);
        p?.catch?.(() => {});
      } catch (_e) {
        /* a send can fail while a peer is going away */
      }
    },
    (cb) => a.onMessage((data, ctx) => cb(data, peerOf(ctx))),
  ];
}

// the state the guest needs, from a Rally (Rules.js)
export function snapshot(r) {
  const b = r.ball;
  const P = (p) => [p.u, p.v, p.tu, p.tv, p.swingT, p.kind, p.prep];
  return {
    b: [b.u, b.h, b.v, b.vu, b.vh, b.vv, b.live ? 1 : 0, b.held ? 1 : 0],
    p: r.players.map(P),
    st: r.state,
    t: r.t,
    pts: r.pts,
    games: r.games,
    server: r.server,
    serveNo: r.serveNo,
    winner: r.winner,
  };
}
// ... and onto the guest's mirror Rally (its own player, `me`, keeps the position it has locally)
export function applySnapshot(r, s, me) {
  const b = r.ball;
  [b.u, b.h, b.v, b.vu, b.vh, b.vv] = s.b;
  b.live = !!s.b[6];
  b.held = !!s.b[7];
  s.p.forEach((q, i) => {
    const p = r.players[i];
    p.tu = q[2];
    p.tv = q[3];
    if (i === me) return;
    p.netU = q[0];
    p.netV = q[1];
    if (p.u === undefined || Math.abs(p.u - q[0]) > 6) {
      p.u = q[0];
      p.v = q[1];
    }
    // a new swing starts over; otherwise the local clock runs it on
    if (q[4] >= 0 && (p.swingT < 0 || p.swingT > q[4] + 0.15 || q[4] < p.swingT - 0.15))
      p.swingT = q[4];
    if (q[4] < 0) p.swingT = -1;
    p.kind = q[5];
    p.prep = q[6];
  });
  r.state = s.st;
  r.t = s.t;
  r.pts = s.pts;
  r.games = s.games;
  r.server = s.server;
  r.serveNo = s.serveNo;
  r.winner = s.winner;
}

// on: { join(peer, hello), input(msg), swing(lagSec), leave(), notice(text) }
export async function hostTennis({ code, name, look, joinRoomFn = defaultJoinRoom, on = {} }) {
  const roomCode = normCode(code) || makeCode();
  const room = await joinRoomFn(`tennis-${roomCode}`);
  const [, onHello] = action(room, 'hello');
  const [sendStart] = action(room, 'start');
  const [sendSt] = action(room, 'st');
  const [, onIn] = action(room, 'in');
  const [, onSw] = action(room, 'sw');
  const [sendPing, onPing] = action(room, 'ping');
  const [sendCtrl, onCtrl] = action(room, 'ctrl');
  let guest = null,
    closed = false,
    rtt = 0.1,
    seq = 0;
  onHello((h, peer) => {
    if (closed || !peer) return;
    if (guest && guest !== peer) return sendCtrl({ type: 'full' }, peer);
    if (!guest) {
      guest = peer;
      on.join?.(peer, h || {});
    }
    sendStart({ name, look }, peer);
  });
  onIn((m, peer) => peer === guest && !closed && on.input?.(m));
  onSw((m, peer) => peer === guest && !closed && on.swing?.(Math.min(0.12, rtt / 2)));
  onPing((m, peer) => {
    if (peer !== guest || closed) return;
    if (m.back) rtt = rtt * 0.7 + ((performance.now() - m.t) / 1000) * 0.3;
    else sendPing({ t: m.t, back: 1 }, peer);
  });
  onCtrl((m, peer) => {
    if (peer === guest && m?.type === 'bye') leave('朋友離開了比賽');
  });
  room.onPeerLeave?.((ctx) => {
    if (peerOf(ctx) === guest) leave('朋友斷線了');
  });
  const pinger = setInterval(() => guest && sendPing({ t: performance.now() }, guest), 1000);
  function leave(why) {
    if (closed) return;
    closed = true;
    clearInterval(pinger);
    on.leave?.(why);
    Promise.resolve(room.leave?.()).catch(() => {});
  }
  return {
    code: roomCode,
    get guest() {
      return guest;
    },
    get rtt() {
      return rtt;
    },
    send(rally, events) {
      if (guest && !closed) sendSt({ seq: ++seq, s: snapshot(rally), ev: events }, guest);
    },
    close() {
      if (closed) return;
      if (guest) sendCtrl({ type: 'bye' }, guest);
      closed = true;
      clearInterval(pinger);
      Promise.resolve(room.leave?.()).catch(() => {});
    },
  };
}

// on: { start(hostHello), state(snap, events), leave(why) }
export async function joinTennis({ code, name, look, joinRoomFn = defaultJoinRoom, on = {} }) {
  const roomCode = normCode(code);
  if (roomCode.length < 4) throw new Error('請輸入 4 碼房號');
  const room = await joinRoomFn(`tennis-${roomCode}`);
  const [sendHello] = action(room, 'hello');
  const [, onStart] = action(room, 'start');
  const [, onSt] = action(room, 'st');
  const [sendIn] = action(room, 'in');
  const [sendSw] = action(room, 'sw');
  const [sendPing, onPing] = action(room, 'ping');
  const [sendCtrl, onCtrl] = action(room, 'ctrl');
  let host = null,
    closed = false,
    last = 0;
  const hello = (to) => !host && !closed && sendHello({ name, look }, to);
  onStart((m, peer) => {
    if (closed || (host && peer !== host)) return;
    const first = !host;
    host = peer;
    if (first) on.start?.(m || {});
  });
  onSt((m, peer) => {
    if (closed || peer !== host || m.seq <= last) return;
    last = m.seq;
    on.state?.(m.s, m.ev || []);
  });
  onPing((m, peer) => {
    if (peer === host && !m.back && !closed) sendPing({ t: m.t, back: 1 }, peer);
  });
  onCtrl((m, peer) => {
    if (m?.type === 'full' && !host) leave('這個房間已經有人在打了');
    else if (m?.type === 'bye' && peer === host) leave('房主結束了比賽');
  });
  room.onPeerJoin?.((ctx) => hello(peerOf(ctx)));
  room.onPeerLeave?.((ctx) => {
    if (host && peerOf(ctx) === host) leave('房主斷線了');
  });
  const retry = setInterval(() => (host || closed ? clearInterval(retry) : hello()), 1200);
  hello();
  function leave(why) {
    if (closed) return;
    closed = true;
    clearInterval(retry);
    on.leave?.(why);
    Promise.resolve(room.leave?.()).catch(() => {});
  }
  return {
    code: roomCode,
    get connected() {
      return !!host;
    },
    input(u, v, aim) {
      if (host && !closed) sendIn({ u, v, aim }, host);
    },
    swing() {
      if (host && !closed) sendSw({}, host);
    },
    close() {
      if (closed) return;
      if (host) sendCtrl({ type: 'bye' }, host);
      closed = true;
      clearInterval(retry);
      Promise.resolve(room.leave?.()).catch(() => {});
    },
  };
}
