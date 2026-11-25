// 免後端伺服器的 WebRTC P2P 麻將房間層（延遲載入 trystero@0.27，不影響主遊戲首屏載入）：
// - 房主當權威主機（createHostRoom）：分配 4 個座位（不足 4 人開打時自動補 AI）、廣播過濾旋轉後的牌局快照、處理斷線交給 AI 接手
// - 客端（joinGuestRoom）：輸入 4 碼房號連上房主、接收專屬視角快照、送回出牌／吃碰槓胡指令
import {
  makeRoomCode,
  normalizeRoomCode,
  serializeStateFor,
  rotateEventsFor,
  unrotateSeat,
} from './Net.js';

const APP_ID = 'yanlin-gta-mahjong-v1';
const peerIdOf = (ctx) => (typeof ctx === 'string' ? ctx : ctx?.peerId || null);

// 封裝 trystero@0.27 MessageAction（{ send(data, { target }), onMessage(cb(data, ctx)) }）
function bindAction(room, name) {
  const act = room.makeAction(name);
  const send = (data, peerId) => {
    try {
      const p = act.send(data, peerId ? { target: peerId } : undefined);
      if (p?.catch) p.catch(() => {});
    } catch (_e) {
      /* ignore transient send error */
    }
  };
  const on = (cb) => act.onMessage((data, ctx) => cb(data, peerIdOf(ctx)));
  return [send, on];
}

async function defaultJoinRoom(roomId) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('需要 HTTPS 或 localhost 環境才能建立加密 P2P 連線');
  }
  const mod = await import('trystero');
  return mod.joinRoom({ appId: APP_ID, identity: 'none' }, roomId);
}

// ---------------- 房主端 ----------------
export async function createHostRoom({
  code,
  name = '彥霖',
  stake = 0,
  joinRoomFn = defaultJoinRoom,
  onLobby,
  onAction,
  onPeerLeave,
  onNotice,
} = {}) {
  const roomCode = normalizeRoomCode(code) || makeRoomCode();
  const room = await joinRoomFn(`room-${roomCode}`);
  const [sendLobby] = bindAction(room, 'lobby');
  const [sendStart] = bindAction(room, 'start');
  const [sendState] = bindAction(room, 'state');
  const [sendCtrl, onCtrl] = bindAction(room, 'ctrl');
  const [, onHello] = bindAction(room, 'hello');
  const [, onAct] = bindAction(room, 'act');

  const seats = [{ seat: 0, peerId: 'host', name, isHost: true, isAI: false }, null, null, null];
  const peerToSeat = new Map();
  let curStake = stake;
  let started = false;
  let closed = false;
  let seq = 0;

  const lobbyPayload = () => ({
    code: roomCode,
    stake: curStake,
    started,
    seats: seats.map((s, i) =>
      s
        ? { seat: i, name: s.name, isHost: !!s.isHost, isAI: !!s.isAI }
        : { seat: i, name: null, isHost: false, isAI: false }
    ),
  });

  const emitLobby = (targetPeerId) => {
    const p = lobbyPayload();
    if (!closed) sendLobby(p, targetPeerId);
    onLobby?.(p);
  };

  onHello((data, peerId) => {
    if (closed || !peerId) return;
    if (peerToSeat.has(peerId)) {
      sendLobby(lobbyPayload(), peerId);
      return;
    }
    const cleanName =
      String(data?.name || '朋友')
        .trim()
        .slice(0, 12) || '朋友';
    if (started) {
      sendCtrl({ type: 'reject', reason: '這桌已經開打了，請等下一將或開新房' }, peerId);
      return;
    }
    const empty = seats.findIndex((s) => !s);
    if (empty < 0) {
      sendCtrl({ type: 'reject', reason: '房間已經滿 4 人了' }, peerId);
      return;
    }
    seats[empty] = { seat: empty, peerId, name: cleanName, isHost: false, isAI: false };
    peerToSeat.set(peerId, empty);
    onNotice?.(`🌐 ${cleanName} 加入了房間（${seats.filter(Boolean).length}/4）`);
    emitLobby();
  });

  onAct((data, peerId) => {
    if (closed || !started || !peerId) return;
    const seat = peerToSeat.get(peerId);
    if (seat == null || !data?.act) return;
    onAction?.(seat, data.act);
  });

  const dropGuest = (peerId, broke = false) => {
    if (closed || !peerId) return;
    const seat = peerToSeat.get(peerId);
    if (seat == null) return;
    peerToSeat.delete(peerId);
    const who = seats[seat]?.name || '玩家';
    if (!started) {
      seats[seat] = null;
      onNotice?.(`👋 ${who} 離開了房間`);
      emitLobby();
    } else {
      seats[seat] = { ...seats[seat], peerId: null, isAI: true };
      const msg = broke
        ? `💸 ${who} 錢包見底離桌，改由 AI 接手繼續打`
        : `⚠️ ${who} 斷線了，暫時由 AI 接手繼續打`;
      onNotice?.(msg);
      if (peerToSeat.size > 0) sendCtrl({ type: 'notice', msg });
      onPeerLeave?.(seat, who, broke);
    }
  };

  onCtrl((data, peerId) => {
    if (closed || !data || !peerId) return;
    if (data.type === 'guestLeave') dropGuest(peerId, !!data.broke);
  });

  room.onPeerLeave?.((ctx) => {
    dropGuest(peerIdOf(ctx), false);
  });

  room.onError?.((err) => {
    if (closed) return;
    if (err?.code === 'relay-failed') {
      onNotice?.('⚠️ 無法連上 P2P 信令節點，請確認網路連線');
    }
  });

  // 立即更新房主自己的大廳畫面（此時尚未有其他節點，不需廣播空封包）
  onLobby?.(lobbyPayload());

  return {
    role: 'host',
    code: roomCode,
    get stake() {
      return curStake;
    },
    get seats() {
      return seats;
    },
    get peerCount() {
      return peerToSeat.size;
    },
    setStake(i) {
      if (started) return;
      curStake = i;
      emitLobby();
    },
    // 開打：把空位補滿室友 AI，並通知所有客端各自座位與旋轉後的玩家名稱
    startGame(aiPool) {
      started = true;
      let aiIdx = 0;
      const aiSeats = [];
      for (let i = 1; i < 4; i++) {
        if (!seats[i]) {
          const ai = aiPool[aiIdx++ % aiPool.length];
          seats[i] = {
            seat: i,
            peerId: null,
            name: ai.name,
            id: ai.id,
            style: ai.style,
            isHost: false,
            isAI: true,
          };
          aiSeats.push(i);
        }
      }
      const fullNames = seats.map((s) => s.name);
      for (const [peerId, seat] of peerToSeat.entries()) {
        const rotNames = [0, 1, 2, 3].map((ls) => fullNames[unrotateSeat(ls, seat)]);
        sendStart({ seat, stake: curStake, names: rotNames, code: roomCode }, peerId);
      }
      return { seats, names: fullNames, human: seats.map((s) => !s.isAI), aiSeats };
    },
    broadcastState(engine, events = []) {
      if (closed || !started) return;
      seq++;
      for (const [peerId, seat] of peerToSeat.entries()) {
        const snap = serializeStateFor(engine, seat);
        const rotEv = rotateEventsFor(events, seat);
        sendState({ seq, snap, events: rotEv }, peerId);
      }
    },
    broadcastNext() {
      if (!closed) sendCtrl({ type: 'next' });
    },
    broadcastNotice(msg) {
      if (!closed && peerToSeat.size > 0) sendCtrl({ type: 'notice', msg });
    },
    close(reason = '房主已結束房間') {
      if (closed) return;
      closed = true;
      if (peerToSeat.size > 0) sendCtrl({ type: 'end', reason });
      Promise.resolve(room.leave?.()).catch(() => {});
    },
  };
}

// ---------------- 客端 ----------------
export async function joinGuestRoom({
  code,
  name = '朋友',
  joinRoomFn = defaultJoinRoom,
  onLobby,
  onStart,
  onState,
  onNext,
  onEnd,
  onNotice,
} = {}) {
  const roomCode = normalizeRoomCode(code);
  if (roomCode.length < 4) throw new Error('請輸入 4 碼房號');
  const room = await joinRoomFn(`room-${roomCode}`);
  const [sendHello] = bindAction(room, 'hello');
  const [sendAct] = bindAction(room, 'act');
  const [, onLobbyMsg] = bindAction(room, 'lobby');
  const [, onStartMsg] = bindAction(room, 'start');
  const [, onStateMsg] = bindAction(room, 'state');
  const [sendCtrl, onCtrlMsg] = bindAction(room, 'ctrl');

  let hostPeerId = null;
  let closed = false;
  let started = false;
  let lastSeq = 0;

  const announce = (peerId) => {
    if (closed || started) return;
    sendHello({ name }, peerId);
  };

  onLobbyMsg((data, peerId) => {
    if (closed || !peerId) return;
    hostPeerId = peerId;
    clearInterval(retry);
    onLobby?.(data);
  });

  onStartMsg((data, peerId) => {
    if (closed || !peerId) return;
    hostPeerId = peerId;
    started = true;
    clearInterval(retry);
    onStart?.(data);
  });

  onStateMsg((data, peerId) => {
    if (closed || (hostPeerId && peerId !== hostPeerId)) return;
    if (data.seq <= lastSeq) return;
    lastSeq = data.seq;
    onState?.(data.snap, data.events || []);
  });

  onCtrlMsg((data) => {
    if (closed || !data) return;
    if (data.type === 'reject') {
      close();
      onEnd?.(data.reason || '無法加入這個房間');
    } else if (data.type === 'end') {
      close();
      onEnd?.(data.reason || '房主已解散房間');
    } else if (data.type === 'next') {
      onNext?.();
    } else if (data.type === 'notice' && data.msg) {
      onNotice?.(data.msg);
    }
  });

  room.onPeerJoin?.((ctx) => {
    const peerId = peerIdOf(ctx);
    if (!hostPeerId && peerId) announce(peerId);
  });

  room.onPeerLeave?.((ctx) => {
    if (closed) return;
    const peerId = peerIdOf(ctx);
    if (hostPeerId && peerId === hostPeerId) {
      close();
      onEnd?.('房主已離線，房間已結束');
    }
  });

  room.onError?.((err) => {
    if (closed) return;
    if (err?.code === 'relay-failed') {
      onNotice?.('⚠️ 無法連上 P2P 信令節點，請確認網路連線');
    }
  });

  // 若房主已在房內，定時補送 hello 直到收到 lobby 回覆
  const retry = setInterval(() => {
    if (closed || hostPeerId || started) {
      clearInterval(retry);
      return;
    }
    announce();
  }, 1200);
  announce();

  function close(opts) {
    if (closed) return;
    closed = true;
    clearInterval(retry);
    if (hostPeerId) {
      sendCtrl({ type: 'guestLeave', broke: !!opts?.broke }, hostPeerId);
    }
    Promise.resolve(room.leave?.()).catch(() => {});
  }

  return {
    role: 'guest',
    code: roomCode,
    sendAction(act) {
      if (closed || !hostPeerId) return;
      sendAct({ act }, hostPeerId);
    },
    close,
  };
}
