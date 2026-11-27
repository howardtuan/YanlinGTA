// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import * as THREE from 'three';

// 勞大預設藏起來（src/systems/LaodaMode.js）：開直升機、在校園散步的是「彥霖航空機長」，手機沒有勞大的聊天室、
// 定位 App 沒有他、罵人也不會被肘擊；在電腦終端機輸入 mamba 叫他回來，mamba out 再藏起來（src/ui/PC.js）。
// 勞大回來之後的行為（肘擊彩蛋）見 laoda-elbow.test.js。

// happy-dom has no 2D canvas: the pilot's name tag (and 勞大's jersey) draw on one, so hand out a do-nothing stand-in
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
let M, Pilot, Phone, CONTACTS, FRIEND_CONTACTS, friendLocations, PC;
beforeAll(async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  M = await import('../../src/systems/LaodaMode.js');
  Pilot = await import('../../src/entities/Pilot.js');
  ({ Phone } = await import('../../src/ui/phone/Phone.js'));
  ({ CONTACTS, FRIEND_CONTACTS } = await import('../../src/ui/phone/Chats.js'));
  ({ friendLocations } = await import('../../src/world/Locate.js'));
  ({ PC } = await import('../../src/ui/PC.js'));
});
afterEach(() => {
  M.setLaoda(false);
  localStorage.clear();
  vi.useRealTimers();
});

// the walker's world: one campus footpath node 50 m away so he can turn up
function fakeGame() {
  const a = { x: 50, z: 0, adj: [] },
    b = { x: 60, z: 0, adj: [] };
  a.adj.push({ to: b });
  b.adj.push({ to: a });
  return {
    clock: 16 * 60, // a basketball afternoon for 勞大 on some days: the captain never goes
    scene: new THREE.Scene(),
    player: { pos: new THREE.Vector3(), worldPos: () => new THREE.Vector3() },
    interiors: { actions: [] },
    world: { walkNodes: [a, b], inCampus: () => true },
    audio: { voice: vi.fn(async () => 0) },
    hud: { toast: vi.fn() },
    dialog: vi.fn(),
  };
}
const speakers = (lines) => [...new Set(lines.map(([who]) => who))];

describe('預設：勞大藏起來，換成彥霖航空機長', () => {
  it('starts hidden, with nothing in storage', () => {
    expect(M.laodaOn()).toBe(false);
  });

  it('the pilot model is the captain (peaked cap), 勞大 only when asked for', () => {
    const cap = Pilot.createPilot();
    expect(cap.cap).toBeTruthy();
    expect(cap.headset).toBe(cap.cap);
    const laoda = Pilot.createPilot(true);
    expect(laoda.cap).toBeUndefined();
    expect(laoda.headset).toBeTruthy();
  });

  it('the captain greets you as 機長: no 勞大 lines, no voice clip, no box to answer back', async () => {
    const g = fakeGame();
    const w = new Pilot.CampusPilot(g);
    expect(w.appear()).toBe(true);
    expect(g.interiors.actions[0].label()).toContain('機長');
    for (let k = 0; k < 6; k++) {
      await w.greet();
      const [lines, , opts] = g.dialog.mock.calls.at(-1);
      expect(speakers(lines).every((who) => who === '機長' || who === '彥霖')).toBe(true);
      expect(opts?.reply).toBeUndefined();
      g.dialog.mock.calls.at(-1)[1](); // close it
    }
    expect(g.audio.voice).not.toHaveBeenCalled();
    expect(Pilot.pilotCallVoice()).toBeNull();
  });

  it('insulting the captain does nothing: provoke is refused', () => {
    const w = new Pilot.CampusPilot(fakeGame());
    expect(w.provoke()).toBe(false);
    expect(w.grudge).toBeNull();
  });

  it('the captain never plays basketball', () => {
    const w = new Pilot.CampusPilot(fakeGame());
    expect(w.playBall()).toBe(false);
    expect(w.mode).not.toBe('court');
  });

  it('the phone has no 勞大 chat room (and his unread message does not count), his thread kept aside', () => {
    const ph = Object.create(Phone.prototype);
    ph.chats = CONTACTS.map((c) => ({ c, msgs: [], unread: c.unread || 0 }));
    ph._stash = [];
    ph.sel = 0;
    ph.syncLaoda();
    expect(ph.chats.some((st) => st.c.id === 'laoda')).toBe(false);
    expect(ph.allChats.some((st) => st.c.id === 'laoda')).toBe(true);
    expect(ph.unreadTotal).toBe(
      CONTACTS.filter((c) => c.id !== 'laoda').reduce((s, c) => s + (c.unread || 0), 0)
    );
  });

  it('insults in other chats reach nobody', () => {
    vi.useFakeTimers();
    const provoke = vi.fn();
    const contact = FRIEND_CONTACTS.zz;
    const st = { c: contact, busy: false, msgs: [], round: contact.script.length, choice: 0 };
    const ph = Object.create(Phone.prototype);
    Object.assign(ph, {
      g: {
        clock: 12 * 60,
        audio: { send() {} },
        hud: { toast: vi.fn() },
        airdrop: { walker: { provoke } },
      },
      cur: st,
      _renderThread() {},
      _renderCompose() {},
      _deliver(s, replies, v, delay, then) {
        s.msgs.push(...replies);
        s.busy = false;
        then?.();
      },
    });
    Phone.prototype._send.call(ph, '勞大你這個黑鬼');
    expect(provoke).not.toHaveBeenCalled();
    expect(ph.g.hud.toast).not.toHaveBeenCalled();
  });

  it('定位 App leaves him out until he is back', () => {
    const g = { airdrop: { busy: false, walker: { on: false } } };
    expect(friendLocations(g).some((f) => f.id === 'laoda')).toBe(false);
    M.setLaoda(true);
    expect(friendLocations(g).some((f) => f.id === 'laoda')).toBe(true);
  });
});

describe('終端機的隱藏指令', () => {
  // the PC's real terminal, on its own: type a line and press Enter
  function terminal(g) {
    const pc = Object.create(PC.prototype);
    pc.g = g;
    pc.wins = { term: {} };
    const body = document.createElement('div');
    pc._term(body);
    const inp = body.querySelector('.tm-in');
    return {
      body,
      async type(text) {
        inp.value = text;
        inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await Promise.resolve();
      },
      text: () => body.querySelector('.tm-out').textContent,
    };
  }

  it('mamba calls 勞大 back: the pilot and the phone catch up; it is remembered; mamba out hides him again', async () => {
    const g = { airdrop: { syncPilot: vi.fn() }, phone: { syncLaoda: vi.fn() } };
    const t = terminal(g);
    await t.type('mamba');
    expect(M.laodaOn()).toBe(true);
    expect(localStorage.getItem('yanlinGTA.laoda')).toBe('1');
    expect(g.airdrop.syncPilot).toHaveBeenCalledTimes(1);
    expect(g.phone.syncLaoda).toHaveBeenCalledTimes(1);
    expect(t.text()).toContain('勞大回來了');
    await t.type('MAMBA'); // already back
    expect(g.airdrop.syncPilot).toHaveBeenCalledTimes(1);
    await t.type('mamba   out');
    expect(M.laodaOn()).toBe(false);
    expect(localStorage.getItem('yanlinGTA.laoda')).toBeNull();
    expect(g.airdrop.syncPilot).toHaveBeenCalledTimes(2);
    expect(t.text()).toContain('彥霖航空機長');
  });

  it('mamba out while he is hidden is just an unknown command (gives nothing away), and help lists neither', async () => {
    const t = terminal({});
    await t.type('mamba out');
    expect(M.laodaOn()).toBe(false);
    expect(t.text()).toContain('不是內部或外部命令');
    const n = t.text().length;
    await t.type('help');
    expect(t.text().slice(n)).toContain('可用的命令');
    expect(t.text().slice(n).toLowerCase()).not.toContain('mamba');
  });

  it('switching swaps the walking pilot for the other look', async () => {
    const g = fakeGame();
    const w = new Pilot.CampusPilot(g);
    w.appear();
    const before = w.ch;
    expect(before.cap).toBeTruthy();
    M.setLaoda(true, { airdrop: { syncPilot: () => w.reset() } });
    expect(w.ch).toBeNull();
    expect(before.root.parent).toBeNull(); // the captain is gone from the scene
    expect(w.appear()).toBe(true);
    expect(w.ch.cap).toBeUndefined();
    expect(w.name).toBe('勞大');
    expect(g.interiors.actions).toHaveLength(1); // the E action is not added twice
  });
});
