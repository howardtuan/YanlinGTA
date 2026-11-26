// 免後端伺服器的 WebRTC P2P 麻將房間層（延遲載入 trystero@0.27，不影響主遊戲首屏載入）：
// - 房主當權威主機（createHostRoom）：分配 4 個座位（不足 4 人開打時自動補 AI）、廣播過濾旋轉後的牌局快照、處理斷線交給 AI 接手
// - 客端（joinGuestRoom）：輸入 4 碼房號連上房主、接收專屬視角快照、送回出牌／吃碰槓胡指令
// - 造型（衣櫃，src/systems/OutfitData.js）：客端在 hello 帶上自己的 look，房主整理後跟 names 一樣旋轉成各自視角的 looks
//   陣列一起送（start／next／spectateInfo）；AI 座位是 null。舊版客端沒帶 look 時當預設服裝；舊版房主不送 looks 時，
//   新版客端照舊用室友模型。
import {
  makeRoomCode,
  normalizeRoomCode,
  serializeStateFor,
  rotateEventsFor,
  unrotateSeat,
} from './Net.js';
import { normalizeLook } from '../OutfitData.js';

const APP_ID = 'yanlin-gta-mahjong-v1';
const peerIdOf = (ctx) => (typeof ctx === 'string' ? ctx : ctx?.peerId || null);

export const SPECTATE_REACTS = [
  { id: 'clap', text: '👏 好牌！' },
  { id: 'shock', text: '😱 放槍了' },
  { id: 'fire', text: '🔥 聽牌！' },
  { id: 'lol', text: '😂 笑死' },
  { id: 'pray', text: '🙏 自摸！' },
];

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

// 觀戰者繞著牌桌站的角度（度）：房主座位框架，座位 s 在 s × 90°（0 = 房主背後）
export const normAng = (a) => {
  const n = Number(a);
  return Number.isFinite(n) ? Math.round((((n % 360) + 360) % 360) * 10) / 10 : null;
};
// 新來的觀戰者先站在房主背後附近（看房主那家），一個一個錯開
export const specStartAng = (order) => normAng(((order * 47) % 70) - 35);

// ---------------- 房主端 ----------------
export async function createHostRoom({
  code,
  name = '彥霖',
  look = null,
  stake = 0,
  spectateReveal = true,
  joinRoomFn = defaultJoinRoom,
  onLobby,
  onAction,
  onPeerLeave,
  onNotice,
  onSpectatorChange,
  onReact,
  onSpecPos,
  getTimers,
} = {}) {
  const roomCode = normalizeRoomCode(code) || makeRoomCode();
  const room = await joinRoomFn(`room-${roomCode}`);
  const [sendLobby] = bindAction(room, 'lobby');
  const [sendStart] = bindAction(room, 'start');
  const [sendState] = bindAction(room, 'state');
  const [sendCtrl, onCtrl] = bindAction(room, 'ctrl');
  const [, onHello] = bindAction(room, 'hello');
  const [, onAct] = bindAction(room, 'act');

  const seats = [
    { seat: 0, peerId: 'host', name, look: normalizeLook(look), isHost: true, isAI: false },
    null,
    null,
    null,
  ];
  const peerToSeat = new Map();
  const spectators = new Map(); // peerId -> { peerId, name, wantSeat, viewSeat, moneyOk, order, ang }
  const reactCd = new Map(); // peerId -> last ms
  let curStake = stake;
  let specReveal = spectateReveal !== false;
  let started = false;
  let closed = false;
  let seq = 0;
  let specOrder = 0;

  const fullNames = () => seats.map((s) => s?.name || 'AI');
  const rotatedNames = (viewSeat) => {
    const names = fullNames();
    return [0, 1, 2, 3].map((ls) => names[unrotateSeat(ls, viewSeat)]);
  };
  // 每個座位的造型：真人一定有（沒帶就是預設服裝），AI 是 null
  const fullLooks = () => seats.map((s) => (s && !s.isAI ? normalizeLook(s.look) : null));
  const rotatedLooks = (viewSeat) => {
    const looks = fullLooks();
    return [0, 1, 2, 3].map((ls) => looks[unrotateSeat(ls, viewSeat)]);
  };
  const orderedSpectators = () => [...spectators.values()].sort((a, b) => a.order - b.order);
  const spectatorList = () => {
    let q = 0;
    return orderedSpectators().map((s) => ({
      id: s.peerId,
      name: s.name,
      wantSeat: s.wantSeat,
      queuePos: s.wantSeat ? ++q : 0,
      ang: s.ang,
    }));
  };
  const queuePosOf = (peerId) => {
    let pos = 0;
    for (const s of orderedSpectators()) {
      if (!s.wantSeat) continue;
      pos++;
      if (s.peerId === peerId) return pos;
    }
    return 0;
  };
  const spectatorSummary = () => ({
    count: spectators.size,
    queueCount: [...spectators.values()].filter((s) => s.wantSeat).length,
    reveal: specReveal,
    spectators: spectatorList(),
  });

  const lobbyPayload = () => ({
    code: roomCode,
    stake: curStake,
    started,
    spectateReveal: specReveal,
    spectators: spectatorList(),
    seats: seats.map((s, i) =>
      s
        ? { seat: i, name: s.name, isHost: !!s.isHost, isAI: !!s.isAI }
        : { seat: i, name: null, isHost: false, isAI: false }
    ),
  });

  const emitLobby = (targetPeerId) => {
    const p = lobbyPayload();
    if (!closed) {
      if (targetPeerId) {
        const isSpec = spectators.has(targetPeerId);
        const spec = spectators.get(targetPeerId);
        sendLobby(
          {
            ...p,
            yourRole: isSpec ? 'spectator' : 'player',
            wantSeat: isSpec ? spec.wantSeat : true,
          },
          targetPeerId
        );
      } else {
        for (const pid of peerToSeat.keys()) {
          sendLobby({ ...p, yourRole: 'player', wantSeat: true }, pid);
        }
        for (const [pid, spec] of spectators.entries()) {
          sendLobby({ ...p, yourRole: 'spectator', wantSeat: spec.wantSeat }, pid);
        }
      }
    }
    onLobby?.(p);
  };

  const broadcastMeta = (extra = {}) => {
    if (closed) return;
    const specs = spectatorList();
    if (started) {
      for (const [pid, seat] of peerToSeat.entries()) {
        sendCtrl(
          {
            type: 'spectateInfo',
            role: 'player',
            seat,
            spectateReveal: specReveal,
            spectatorCount: spectators.size,
            spectators: specs,
          },
          pid
        );
      }
      for (const [pid, spec] of spectators.entries()) {
        sendCtrl(
          {
            type: 'spectateInfo',
            role: 'spectator',
            viewSeat: spec.viewSeat,
            wantSeat: spec.wantSeat,
            queuePos: queuePosOf(pid),
            spectateReveal: specReveal,
            spectatorCount: spectators.size,
            spectators: specs,
            names: rotatedNames(spec.viewSeat),
            you: pid,
            ang: spec.ang,
            looks: rotatedLooks(spec.viewSeat),
          },
          pid
        );
      }
    }
    onSpectatorChange?.({ ...spectatorSummary(), ...extra });
  };

  const broadcastReact = (fromId, senderName, rawText, hostSeat = null) => {
    if (closed || !started) return false;
    const text = String(rawText || '')
      .trim()
      .slice(0, 16);
    if (!text) return false;
    const now = Date.now();
    if (now - (reactCd.get(fromId) || 0) < 900) return false;
    reactCd.set(fromId, now);
    for (const [pid, seat] of peerToSeat.entries()) {
      const rotSeat = hostSeat == null ? null : (hostSeat - seat + 4) % 4;
      sendCtrl({ type: 'react', fromId, name: senderName, text, seat: rotSeat }, pid);
    }
    for (const [pid, spec] of spectators.entries()) {
      const rotSeat = hostSeat == null ? null : (hostSeat - spec.viewSeat + 4) % 4;
      sendCtrl({ type: 'react', fromId, name: senderName, text, seat: rotSeat }, pid);
    }
    onReact?.({ fromId, name: senderName, text, seat: hostSeat });
    return true;
  };

  const seatQueuedLobbySpectator = () => {
    if (started) return;
    const empty = seats.findIndex((s) => !s);
    if (empty < 0) return;
    const nextSpec = orderedSpectators().find((s) => s.wantSeat);
    if (!nextSpec) return;
    spectators.delete(nextSpec.peerId);
    seats[empty] = {
      seat: empty,
      peerId: nextSpec.peerId,
      name: nextSpec.name,
      look: nextSpec.look,
      isHost: false,
      isAI: false,
    };
    peerToSeat.set(nextSpec.peerId, empty);
    onNotice?.(`🪑 ${nextSpec.name} 已遞補入座（${seats.filter(Boolean).length}/4）`);
  };

  onHello((data, peerId) => {
    if (closed || !peerId) return;
    if (peerToSeat.has(peerId)) {
      if (!started && data?.look) seats[peerToSeat.get(peerId)].look = normalizeLook(data.look);
      if (!started) emitLobby(peerId);
      return;
    }
    const cleanName =
      String(data?.name || '朋友')
        .trim()
        .slice(0, 12) || '朋友';
    const spectateOnly = !!data?.spectateOnly;
    const moneyOk = data?.moneyOk !== false;
    const look = normalizeLook(data?.look);

    if (spectators.has(peerId)) {
      const spec = spectators.get(peerId);
      spec.wantSeat = !spectateOnly;
      spec.moneyOk = moneyOk;
      spec.look = look;
      if (!started) emitLobby(peerId);
      else broadcastMeta({ needStatePeerId: peerId });
      return;
    }

    if (!started) {
      const empty = spectateOnly ? -1 : seats.findIndex((s) => !s);
      if (empty >= 0) {
        seats[empty] = { seat: empty, peerId, name: cleanName, look, isHost: false, isAI: false };
        peerToSeat.set(peerId, empty);
        onNotice?.(`🌐 ${cleanName} 加入了房間（${seats.filter(Boolean).length}/4）`);
        emitLobby();
        return;
      }
      spectators.set(peerId, {
        peerId,
        name: cleanName,
        look,
        wantSeat: !spectateOnly,
        viewSeat: 0,
        moneyOk,
        order: ++specOrder,
        ang: specStartAng(specOrder),
      });
      onNotice?.(`👀 ${cleanName} 進入房間觀賽${!spectateOnly ? '（人滿候位中）' : ''}`);
      emitLobby();
      return;
    }

    // 對局進行中：不拒絕，直接以觀賽者身份加入；非純觀賽時排入下局取代 AI 佇列
    const spec = {
      peerId,
      name: cleanName,
      look,
      wantSeat: !spectateOnly,
      viewSeat: 0,
      moneyOk,
      order: ++specOrder,
      ang: specStartAng(specOrder),
    };
    spectators.set(peerId, spec);
    const hasAI = seats.some((s, i) => i > 0 && s?.isAI);
    const qpos = queuePosOf(peerId);
    sendStart(
      {
        role: 'spectator',
        seat: 0,
        viewSeat: 0,
        wantSeat: spec.wantSeat,
        queuePos: qpos,
        spectateReveal: specReveal,
        spectatorCount: spectators.size,
        spectators: spectatorList(),
        stake: curStake,
        names: fullNames(),
        looks: fullLooks(),
        code: roomCode,
        you: peerId,
        ang: spec.ang,
      },
      peerId
    );
    const msg =
      spec.wantSeat && hasAI
        ? `👀 ${cleanName} 中途加入觀賽（下局將取代 AI 上桌）`
        : `👀 ${cleanName} 加入觀賽`;
    onNotice?.(msg);
    for (const pid of peerToSeat.keys()) sendCtrl({ type: 'notice', msg }, pid);
    for (const pid of spectators.keys()) if (pid !== peerId) sendCtrl({ type: 'notice', msg }, pid);
    broadcastMeta({ needStatePeerId: peerId });
  });

  onAct((data, peerId) => {
    if (closed || !started || !peerId) return;
    const seat = peerToSeat.get(peerId);
    if (seat == null || !data?.act) return;
    onAction?.(seat, data.act);
  });

  const dropGuest = (peerId, broke = false) => {
    if (closed || !peerId) return;
    if (spectators.has(peerId)) {
      const spec = spectators.get(peerId);
      spectators.delete(peerId);
      const msg = `👋 ${spec.name} 離開了觀賽`;
      onNotice?.(msg);
      if (!started) emitLobby();
      else broadcastMeta();
      return;
    }
    const seat = peerToSeat.get(peerId);
    if (seat == null) return;
    peerToSeat.delete(peerId);
    const who = seats[seat]?.name || '玩家';
    if (!started) {
      seats[seat] = null;
      onNotice?.(`👋 ${who} 離開了房間`);
      seatQueuedLobbySpectator();
      emitLobby();
    } else {
      seats[seat] = { ...seats[seat], peerId: null, isAI: true };
      const msg = broke
        ? `💸 ${who} 錢包見底離桌，改由 AI 接手繼續打`
        : `⚠️ ${who} 斷線了，暫時由 AI 接手繼續打`;
      onNotice?.(msg);
      if (peerToSeat.size + spectators.size > 0) sendCtrl({ type: 'notice', msg });
      onPeerLeave?.(seat, who, broke);
    }
  };

  onCtrl((data, peerId) => {
    if (closed || !data || !peerId) return;
    if (data.type === 'guestLeave') {
      dropGuest(peerId, !!data.broke);
      return;
    }
    if (data.type === 'setWantSeat' && spectators.has(peerId)) {
      const spec = spectators.get(peerId);
      spec.wantSeat = !!data.wantSeat;
      if (data.moneyOk != null) spec.moneyOk = !!data.moneyOk;
      if (!started) {
        if (spec.wantSeat) seatQueuedLobbySpectator();
        emitLobby();
      } else {
        broadcastMeta();
      }
      return;
    }
    if (data.type === 'setViewSeat' && spectators.has(peerId)) {
      const spec = spectators.get(peerId);
      spec.viewSeat = (((data.seat | 0) % 4) + 4) % 4;
      if (started) broadcastMeta({ needStatePeerId: peerId });
      return;
    }
    // 觀戰者繞著牌桌走：記下他站的角度（房主座位框架），轉給其他人，大家都看到他移動
    if (data.type === 'specPos' && spectators.has(peerId)) {
      const ang = normAng(data.ang);
      if (ang == null) return;
      spectators.get(peerId).ang = ang;
      if (!started) return;
      for (const pid of [...peerToSeat.keys(), ...spectators.keys()])
        if (pid !== peerId) sendCtrl({ type: 'specPos', id: peerId, ang }, pid);
      onSpecPos?.({ id: peerId, ang });
      return;
    }
    if (data.type === 'walletStatus' && spectators.has(peerId)) {
      spectators.get(peerId).moneyOk = !!data.moneyOk;
      return;
    }
    if (data.type === 'react') {
      if (spectators.has(peerId)) {
        const spec = spectators.get(peerId);
        broadcastReact(peerId, spec.name, data.text, null);
      } else if (peerToSeat.has(peerId)) {
        const seat = peerToSeat.get(peerId);
        broadcastReact(peerId, seats[seat]?.name || '玩家', data.text, seat);
      }
    }
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
    get spectatorCount() {
      return spectators.size;
    },
    get queueCount() {
      return [...spectators.values()].filter((s) => s.wantSeat).length;
    },
    get spectateReveal() {
      return specReveal;
    },
    setStake(i) {
      if (started) return;
      curStake = i;
      emitLobby();
    },
    setSpectateReveal(val) {
      specReveal = !!val;
      if (!started) emitLobby();
      else broadcastMeta({ rebroadcast: true });
    },
    // 開打：把空位補滿室友 AI，並通知所有客端與觀賽者各自角色、座位與旋轉後的玩家名稱
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
      const names = fullNames();
      const specs = spectatorList();
      for (const [peerId, seat] of peerToSeat.entries()) {
        sendStart(
          {
            role: 'player',
            seat,
            stake: curStake,
            names: rotatedNames(seat),
            looks: rotatedLooks(seat),
            spectateReveal: specReveal,
            spectatorCount: spectators.size,
            spectators: specs,
            code: roomCode,
          },
          peerId
        );
      }
      for (const [peerId, spec] of spectators.entries()) {
        sendStart(
          {
            role: 'spectator',
            seat: spec.viewSeat,
            viewSeat: spec.viewSeat,
            wantSeat: spec.wantSeat,
            queuePos: queuePosOf(peerId),
            stake: curStake,
            names: rotatedNames(spec.viewSeat),
            looks: rotatedLooks(spec.viewSeat),
            spectateReveal: specReveal,
            spectatorCount: spectators.size,
            spectators: specs,
            code: roomCode,
            you: peerId,
            ang: spec.ang,
          },
          peerId
        );
      }
      return {
        seats,
        names,
        looks: fullLooks(),
        human: seats.map((s) => !s.isAI),
        aiSeats,
        spectators: specs,
      };
    },
    // 下一局開始前：依排隊順序讓想上桌且錢包足夠的觀賽者取代 AI 座位
    promoteSpectators() {
      const promoted = [];
      if (!started) {
        return {
          promoted,
          seats,
          names: fullNames(),
          looks: fullLooks(),
          human: seats.map((s) => !s.isAI),
        };
      }
      for (const spec of orderedSpectators()) {
        if (!spec.wantSeat) continue;
        const aiIdx = seats.findIndex((s, i) => i > 0 && s?.isAI);
        if (aiIdx < 0) break;
        if (spec.moneyOk === false) {
          sendCtrl(
            { type: 'notice', msg: '💸 錢包見底，暫時維持觀賽（無法取代 AI 上桌）' },
            spec.peerId
          );
          continue;
        }
        spectators.delete(spec.peerId);
        seats[aiIdx] = {
          seat: aiIdx,
          peerId: spec.peerId,
          name: spec.name,
          look: spec.look,
          isHost: false,
          isAI: false,
        };
        peerToSeat.set(spec.peerId, aiIdx);
        promoted.push({ peerId: spec.peerId, seat: aiIdx, name: spec.name });
      }
      if (promoted.length) onSpectatorChange?.(spectatorSummary());
      return {
        promoted,
        seats,
        names: fullNames(),
        looks: fullLooks(),
        human: seats.map((s) => !s.isAI),
      };
    },
    sendStateToPeer(peerId, engine) {
      if (closed || !started || !engine) return;
      seq++;
      const timers = getTimers?.() || [];
      if (peerToSeat.has(peerId)) {
        const seat = peerToSeat.get(peerId);
        const snap = serializeStateFor(engine, seat, { timers });
        sendState({ seq, snap, events: [] }, peerId);
      } else if (spectators.has(peerId)) {
        const spec = spectators.get(peerId);
        const snap = serializeStateFor(engine, spec.viewSeat, {
          spectate: true,
          revealAll: specReveal,
          timers,
        });
        sendState({ seq, snap, events: [] }, peerId);
      }
    },
    broadcastState(engine, events = []) {
      if (closed || !started) return;
      seq++;
      // 每次狀態更新都帶上房主算好的限時倒數（新出現的決定在這裡開始計時）
      const timers = getTimers?.() || [];
      for (const [peerId, seat] of peerToSeat.entries()) {
        const snap = serializeStateFor(engine, seat, { timers });
        const rotEv = rotateEventsFor(events, seat);
        sendState({ seq, snap, events: rotEv }, peerId);
      }
      for (const [peerId, spec] of spectators.entries()) {
        const snap = serializeStateFor(engine, spec.viewSeat, {
          spectate: true,
          revealAll: specReveal,
          timers,
        });
        const rotEv = rotateEventsFor(events, spec.viewSeat, {
          spectate: true,
          revealAll: specReveal,
        });
        sendState({ seq, snap, events: rotEv }, peerId);
      }
    },
    broadcastNext(promotedPeerIds = []) {
      if (closed) return;
      const promoSet = new Set(promotedPeerIds);
      const specs = spectatorList();
      for (const [peerId, seat] of peerToSeat.entries()) {
        sendCtrl(
          {
            type: 'next',
            role: 'player',
            seat,
            names: rotatedNames(seat),
            looks: rotatedLooks(seat),
            promoted: promoSet.has(peerId),
            spectateReveal: specReveal,
            spectatorCount: spectators.size,
            spectators: specs,
          },
          peerId
        );
      }
      for (const [peerId, spec] of spectators.entries()) {
        sendCtrl(
          {
            type: 'next',
            role: 'spectator',
            seat: spec.viewSeat,
            viewSeat: spec.viewSeat,
            wantSeat: spec.wantSeat,
            queuePos: queuePosOf(peerId),
            names: rotatedNames(spec.viewSeat),
            looks: rotatedLooks(spec.viewSeat),
            spectateReveal: specReveal,
            spectatorCount: spectators.size,
            spectators: specs,
            you: peerId,
            ang: spec.ang,
          },
          peerId
        );
      }
    },
    sendReact(text) {
      return broadcastReact('host', seats[0]?.name || name, text, 0);
    },
    broadcastNotice(msg) {
      if (!closed && peerToSeat.size + spectators.size > 0) sendCtrl({ type: 'notice', msg });
    },
    close(reason = '房主已結束房間') {
      if (closed) return;
      closed = true;
      if (peerToSeat.size + spectators.size > 0) sendCtrl({ type: 'end', reason });
      Promise.resolve(room.leave?.()).catch(() => {});
    },
  };
}

// ---------------- 客端 ----------------
export async function joinGuestRoom({
  code,
  name = '朋友',
  look = null,
  spectateOnly = false,
  moneyOk = true,
  joinRoomFn = defaultJoinRoom,
  onLobby,
  onStart,
  onState,
  onNext,
  onSpectateInfo,
  onReact,
  onSpecPos,
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
    sendHello(
      {
        name,
        look: look ? normalizeLook(look) : undefined,
        spectateOnly: !!spectateOnly,
        moneyOk: moneyOk !== false,
      },
      peerId
    );
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
      onNext?.(data);
    } else if (data.type === 'spectateInfo') {
      onSpectateInfo?.(data);
    } else if (data.type === 'react') {
      onReact?.(data);
    } else if (data.type === 'specPos') {
      const ang = normAng(data.ang);
      if (ang != null && data.id) onSpecPos?.({ id: data.id, ang });
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
    setWantSeat(wantSeat, ok = true) {
      if (closed || !hostPeerId) return;
      sendCtrl({ type: 'setWantSeat', wantSeat: !!wantSeat, moneyOk: !!ok }, hostPeerId);
    },
    setViewSeat(seat) {
      if (closed || !hostPeerId) return;
      sendCtrl({ type: 'setViewSeat', seat }, hostPeerId);
    },
    // 觀戰者繞桌走到的角度（度，房主座位框架：座位 s 在 s × 90°）
    setSpecPos(ang) {
      if (closed || !hostPeerId) return;
      sendCtrl({ type: 'specPos', ang }, hostPeerId);
    },
    sendWalletStatus(ok) {
      if (closed || !hostPeerId) return;
      sendCtrl({ type: 'walletStatus', moneyOk: !!ok }, hostPeerId);
    },
    sendReact(text) {
      if (closed || !hostPeerId) return;
      sendCtrl({ type: 'react', text }, hostPeerId);
    },
    close,
  };
}
