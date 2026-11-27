import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import * as THREE from 'three';

// 彩蛋：罵勞大（手機訊息或當面回嘴），他就衝過來肘擊你（src/systems/LaodaInsult.js、src/entities/Pilot.js provoke）。

// happy-dom has no 2D canvas: the pilot's jersey and name tag draw on one, so hand out a do-nothing stand-in
const ctx2d = new Proxy(
  {},
  {
    get: (t, k) => {
      if (k in t) return t[k];
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createImageData' || k === 'getImageData')
        return (w, h) => ({ data: new Uint8ClampedArray((w | 0 || 1) * (h | 0 || 1) * 4) });
      if (/^create.*(Gradient|Pattern)$/.test(k)) return () => ({ addColorStop() {} });
      return () => {};
    },
    set: (t, k, v) => ((t[k] = v), true),
  }
);
let insultsLaoda, CampusPilot, Phone, CONTACTS, FRIEND_CONTACTS;
beforeAll(async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  ({ insultsLaoda } = await import('../../src/systems/LaodaInsult.js'));
  ({ CampusPilot } = await import('../../src/entities/Pilot.js'));
  ({ Phone } = await import('../../src/ui/phone/Phone.js'));
  ({ CONTACTS, FRIEND_CONTACTS } = await import('../../src/ui/phone/Chats.js'));
});
afterEach(() => vi.useRealTimers());

describe('insultsLaoda：這句話算不算在罵勞大', () => {
  it('a racial slur counts anywhere, even in someone else’s chat and with spaces in it', () => {
    expect(insultsLaoda('勞大你這個黑鬼', true)).toBe(true);
    expect(insultsLaoda('黑鬼', false)).toBe(true);
    expect(insultsLaoda('黑 鬼', false)).toBe(true);
    expect(insultsLaoda('Nigga', false)).toBe(true);
  });

  it('other insults count when said to him (his chat, face to face)', () => {
    expect(insultsLaoda('你很爛欸', true)).toBe(true);
    expect(insultsLaoda('白癡喔', true)).toBe(true);
    expect(insultsLaoda('87', true)).toBe(true);
    expect(insultsLaoda('you are trash', true)).toBe(true);
  });

  it('elsewhere an insult counts only when it names him', () => {
    expect(insultsLaoda('這遊戲很爛', false)).toBe(false);
    expect(insultsLaoda('勞大超廢物', false)).toBe(true);
    expect(insultsLaoda('牢大白癡', false)).toBe(true);
    expect(insultsLaoda('kobe is trash', false)).toBe(true);
  });

  it('ordinary messages to him are not insults (positive control)', () => {
    for (const t of [
      '你在哪？',
      '謝啦勞大，機車空運超準時',
      '你的背號為什麼是 24？',
      '哈哈笑死',
      '笑死了',
      'this hit was great',
      '我 1987 年生的',
      '',
    ])
      expect(insultsLaoda(t, true), t).toBe(false);
  });
});

// a minimal stand-in for the game around the real CampusPilot (and its real character)
function fakeGame() {
  const player = {
    pos: new THREE.Vector3(0, 0, 0),
    y: 0,
    ground: 0,
    heading: 0,
    vehicle: null,
    seat: null,
    tumble: 0,
    rag: null,
    frozen: false,
    worldPos() {
      return this.vehicle ? this.vehicle.pos : this.pos;
    },
    throwOff: vi.fn(function (vx, vz, vy, t) {
      this.tumble = t;
    }),
    exit: vi.fn(function () {
      this.pos.copy(this.vehicle.pos);
      this.vehicle = null;
    }),
    standUp: vi.fn(function () {
      this.seat = null;
    }),
  };
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 500);
  camera.position.set(0, 2, -5);
  camera.lookAt(0, 1, 0);
  camera.updateMatrixWorld(true);
  const g = {
    state: 'play',
    clock: 12 * 60, // noon: not basketball time
    scene: new THREE.Scene(),
    camera,
    player,
    uiBusy: false,
    nav: null,
    interiors: { actions: [], groundAt: () => 0 },
    world: {
      walkNodes: [],
      inCampus: () => true,
      isFree: () => true,
      collision: { resolve: () => ({ hit: false, nx: 0, nz: 0 }) },
    },
    hud: { toast: vi.fn(), bigToast: vi.fn(), setSpeed: vi.fn() },
    audio: {
      voice: vi.fn(async () => 0),
      hitPed: vi.fn(),
      noise() {},
      engineStop: vi.fn(),
      setEngine: vi.fn(),
    },
    phone: { open: false, close: vi.fn() },
    dialog: vi.fn(),
  };
  return { g, player };
}
// where 勞大 stands when the elbow lands, and the frames run
function run(pilot, g, secs, busy = false) {
  const at = [];
  const before = g.player.throwOff.mock.calls.length;
  for (let t = 0; t < secs; t += 1 / 30) {
    pilot.update(1 / 30, busy);
    if (g.player.throwOff.mock.calls.length > before && !at.length)
      at.push({ x: pilot.pos.x, z: pilot.pos.z, visible: pilot.ch?.root.visible });
  }
  return at[0] || null;
}

describe('CampusPilot.provoke：勞大衝過來肘擊你', () => {
  it('he is nowhere near: he turns up, runs over and elbows you down, away from him', () => {
    const { g, player } = fakeGame();
    const pilot = new CampusPilot(g);
    pilot.provoke();
    const hit = run(pilot, g, 20);
    expect(hit).not.toBeNull();
    expect(hit.visible).toBe(true);
    expect(player.throwOff).toHaveBeenCalledTimes(1);
    const [vx, vz, vy] = player.throwOff.mock.calls[0];
    expect(Math.hypot(hit.x - player.pos.x, hit.z - player.pos.z)).toBeLessThan(1.6); // close enough to reach
    expect(vx * (player.pos.x - hit.x) + vz * (player.pos.z - hit.z)).toBeGreaterThan(0); // knocked away from him
    expect(vy).toBeGreaterThan(0);
    expect(g.audio.hitPed).toHaveBeenCalled();
    expect(g.hud.bigToast.mock.calls[0][0]).toContain('肘擊');
  });

  it('one insult, one elbow: afterwards he leaves you alone', () => {
    const { g, player } = fakeGame();
    const pilot = new CampusPilot(g);
    pilot.provoke();
    run(pilot, g, 20);
    player.tumble = 0; // up again
    run(pilot, g, 40);
    expect(player.throwOff).toHaveBeenCalledTimes(1);
    expect(pilot.grudge).toBeFalsy();
  });

  it('up in the helicopter he cannot come; once he has landed he does', () => {
    const { g, player } = fakeGame();
    const pilot = new CampusPilot(g);
    pilot.provoke();
    run(pilot, g, 15, true);
    expect(player.throwOff).not.toHaveBeenCalled();
    expect(run(pilot, g, 20)).not.toBeNull();
  });

  it('a dialog or a minigame on screen holds the elbow until it is over', () => {
    const { g, player } = fakeGame();
    const pilot = new CampusPilot(g);
    g.uiBusy = true;
    pilot.provoke();
    run(pilot, g, 20);
    expect(player.throwOff).not.toHaveBeenCalled();
    g.uiBusy = false;
    expect(run(pilot, g, 5)).not.toBeNull();
  });

  it('looking at the phone: he knocks it out of your hands as well', () => {
    const { g } = fakeGame();
    const pilot = new CampusPilot(g);
    g.phone.open = true;
    pilot.provoke();
    expect(run(pilot, g, 20)).not.toBeNull();
    expect(g.phone.close).toHaveBeenCalled();
  });

  it('on a stopped scooter he pulls you off first; riding off fast he cannot land it', () => {
    const { g, player } = fakeGame();
    const pilot = new CampusPilot(g);
    player.vehicle = { kind: 'scooter', speed: 12, pos: new THREE.Vector3(0, 0, 0), hw: 0.4 };
    pilot.provoke();
    run(pilot, g, 15);
    expect(player.throwOff).not.toHaveBeenCalled();
    player.vehicle.speed = 0;
    expect(run(pilot, g, 10)).not.toBeNull();
    expect(player.exit).toHaveBeenCalled();
    expect(player.exit.mock.invocationCallOrder[0]).toBeLessThan(
      player.throwOff.mock.invocationCallOrder[0]
    );
  });

  it('sitting on a bench: you are stood up and elbowed', () => {
    const { g, player } = fakeGame();
    const pilot = new CampusPilot(g);
    player.seat = { x: 0, z: 0, h: 0 };
    pilot.provoke();
    expect(run(pilot, g, 20)).not.toBeNull();
    expect(player.standUp).toHaveBeenCalled();
  });
});

describe('當面回嘴（打招呼對話最後的輸入框）', () => {
  // he is out strolling, 40 m away; you walk up and press E
  function greeted() {
    const { g, player } = fakeGame();
    const a = { x: 40, z: 0, adj: [] },
      b = { x: 60, z: 0, adj: [] };
    a.adj.push({ to: b });
    b.adj.push({ to: a });
    g.world.walkNodes = [a, b];
    const pilot = new CampusPilot(g);
    expect(pilot.appear()).toBe(true);
    player.pos.set(pilot.pos.x - 1.5, 0, pilot.pos.z);
    pilot.greet();
    const [, cb, opts] = g.dialog.mock.calls.at(-1);
    return { g, player, pilot, cb, opts };
  }
  // the HUD closes the dialog (its callback) and then hands over what you typed
  const say = (s, text) => {
    s.cb?.();
    s.opts.reply.send(text);
    const [lines, cb2] = s.g.dialog.mock.calls.at(-1);
    cb2?.();
    return lines;
  };

  it('his greeting offers a box to say something back', () => {
    const s = greeted();
    expect(typeof s.opts?.reply?.send).toBe('function');
  });

  it('call him 黑鬼 to his face: he answers and elbows you', () => {
    const s = greeted();
    const lines = say(s, '你這個黑鬼');
    expect(lines.some(([who]) => who === '勞大')).toBe(true);
    expect(run(s.pilot, s.g, 6)).not.toBeNull();
  });

  it('say something friendly: he answers, and nobody gets hurt (positive control)', () => {
    const s = greeted();
    const lines = say(s, '勞大你好帥');
    expect(lines).toContainEqual(['彥霖', '勞大你好帥']);
    expect(lines.some(([who]) => who === '勞大')).toBe(true);
    run(s.pilot, s.g, 10);
    expect(s.player.throwOff).not.toHaveBeenCalled();
  });
});

describe('手機訊息罵勞大', () => {
  const P = () => Phone.prototype;
  const laoda = () => CONTACTS.find((c) => c.id === 'laoda');
  // the phone's send step on a chat, without its UI: replies land in the chat straight away
  function phoneFor(contact) {
    vi.useFakeTimers();
    const provoke = vi.fn();
    const g = {
      clock: 12 * 60,
      audio: { send() {} },
      hud: { toast: vi.fn() },
      airdrop: { walker: { provoke } },
    };
    const st = { c: contact, busy: false, msgs: [], round: contact.script.length, choice: 0 };
    const ph = Object.create(P());
    Object.assign(ph, {
      g,
      cur: st,
      _renderThread() {},
      _renderCompose() {},
      _deliver(s, replies, v, delay, then) {
        s.msgs.push(...replies);
        s.busy = false;
        then?.();
      },
    });
    return { ph, st, g, provoke };
  }
  const said = (st, who) => st.msgs.filter((m) => m.who === who).map((m) => m.text);

  it('his chat has a typing box in every browser, not only with Gemini Nano', () => {
    const { ph, st } = phoneFor(laoda());
    expect(P()._typing.call(ph, st)).toBe(true);
    // (other chats keep theirs for the AI)
    const zz = phoneFor(FRIEND_CONTACTS.zz);
    expect(P()._typing.call(zz.ph, zz.st)).toBe(false);
  });

  it('insult him in his chat: he answers and sets off to find you', () => {
    const { ph, st, provoke } = phoneFor(laoda());
    P()._send.call(ph, '你這個黑鬼');
    expect(said(st, 'me')).toEqual(['你這個黑鬼']);
    expect(said(st, 'laoda').length).toBeGreaterThan(0);
    expect(provoke).toHaveBeenCalledTimes(1);
  });

  it('insult him in someone else’s chat: he still finds out and comes', () => {
    const { ph, g, provoke } = phoneFor(FRIEND_CONTACTS.zz);
    P()._send.call(ph, '勞大超廢物');
    expect(provoke).toHaveBeenCalledTimes(1);
    expect(g.hud.toast).toHaveBeenCalled();
  });

  it('ordinary messages leave him be (positive control)', () => {
    const a = phoneFor(laoda());
    P()._send.call(a.ph, '今天天氣不錯');
    const b = phoneFor(FRIEND_CONTACTS.zz);
    P()._send.call(b.ph, '這遊戲很爛'); // an insult, but not about him
    expect(a.provoke).not.toHaveBeenCalled();
    expect(b.provoke).not.toHaveBeenCalled();
    expect(said(a.st, 'laoda').length).toBeGreaterThan(0); // he still answers
  });
});
