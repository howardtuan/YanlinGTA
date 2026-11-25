// 免後端伺服器的 WebRTC P2P 麻將房間層（延遲載入 trystero，不影響主遊戲首屏載入）：
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

async function defaultJoinRoom(roomId) {
  const mod = await import('trystero');
  return mod.joinRoom({ appId: APP_ID }, roomId);
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
  const [sendLobby] = room.makeAction('lobby');
  const [sendStart] = room.makeAction('start');
  const [sendState] = room.makeAction('state');
  const [sendCtrl] = room.makeAction('ctrl');
  const [, onHello] = room.makeAction('hello');
  const [, onAct] = room.makeAction('act');

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

  const emitLobby = () => {
    const p = lobbyPayload();
    if (!closed) sendLobby(p);
    onLobby?.(p);
  };

  onHello((data, peerId) => {
    if (closed) return;
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
    if (closed || !started) return;
    const seat = peerToSeat.get(peerId);
    if (seat == null || !data?.act) return;
    onAction?.(seat, data.act);
  });

  room.onPeerLeave((peerId) => {
    if (closed) return;
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
      const msg = `⚠️ ${who} 斷線了，暫時由 AI 接手繼續打`;
      onNotice?.(msg);
      sendCtrl({ type: 'notice', msg });
      onPeerLeave?.(seat, who);
    }
  });

  emitLobby();

  return {
    role: 'host',
    code: roomCode,
    get stake() {
      return curStake;
    },
    get seats() {
      return seats;
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
    close(reason = '房主已結束房間') {
      if (closed) return;
      closed = true;
      try {
        sendCtrl({ type: 'end', reason });
      } catch (_e) {
        /* ignore */
      }
      room.leave?.();
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
  const [sendHello] = room.makeAction('hello');
  const [sendAct] = room.makeAction('act');
  const [, onLobbyMsg] = room.makeAction('lobby');
  const [, onStartMsg] = room.makeAction('start');
  const [, onStateMsg] = room.makeAction('state');
  const [, onCtrlMsg] = room.makeAction('ctrl');

  let hostPeerId = null;
  let closed = false;
  let started = false;
  let lastSeq = 0;

  const announce = (peerId) => {
    if (closed || started) return;
    sendHello({ name }, peerId);
  };

  onLobbyMsg((data, peerId) => {
    if (closed) return;
    hostPeerId = peerId;
    clearInterval(retry);
    onLobby?.(data);
  });

  onStartMsg((data, peerId) => {
    if (closed) return;
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

  room.onPeerJoin((peerId) => {
    if (!hostPeerId) announce(peerId);
  });

  room.onPeerLeave((peerId) => {
    if (closed) return;
    if (hostPeerId && peerId === hostPeerId) {
      close();
      onEnd?.('房主已離線，房間已結束');
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

  function close() {
    if (closed) return;
    closed = true;
    clearInterval(retry);
    room.leave?.();
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
