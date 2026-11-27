// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import {
  Massage,
  MASSAGE_MENU,
  MASSAGE_NAME,
  MASSAGE_STAFF,
  massageOpen,
} from '../../src/systems/minigames/Massage.js';

const spot = (x, z, h = 0) => ({ x, z, y: 0.06, h });
const spec = () => ({
  door: [10, -1],
  counter: spot(12, 1),
  reception: spot(12, 2.6, Math.PI),
  exit: spot(11, 3.4, Math.PI),
  idle: [spot(11.3, 3.5), spot(11.8, 7.3)],
  recliners: [0, 1, 2].map((i) => ({ seat: spot(9 + i, 5.4, Math.PI), stool: spot(9 + i, 3.8) })),
  beds: [0, 1].map((i) => ({ lie: spot(9 + i * 2, 9.8), stand: spot(9.6 + i * 2, 9.6) })),
  closed: false,
});
// a stand-in for a character: just what the shop moves around
const fakeCharacter = () => ({
  root: {
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x, y, z) {
        Object.assign(this, { x, y, z });
      },
    },
    rotation: { y: 0 },
    visible: true,
  },
  update: vi.fn(),
  setDetail: vi.fn(),
});
// a game with just what the shop touches; dialogs and fades finish at once
function fakeGame(money = 3000) {
  const g = {
    money,
    clock: 15 * 60,
    interiors: { actions: [], updaters: [], massage: spec() },
    scene: { add: vi.fn() },
    player: {
      boost: 0,
      pos: { x: 12, z: 1 },
      worldPos: () => ({ x: 12, z: 1 }),
      sitAt: vi.fn(),
      standUp: vi.fn(),
      place: vi.fn(),
    },
    rig: { yaw: 0 },
    missions: { timer: null },
    race: { active: false },
    spend: vi.fn((n) => {
      if (g.money < n) return false;
      g.money -= n;
      return true;
    }),
    dialog: vi.fn((lines, cb) => cb?.()),
    hud: {
      toast: vi.fn(),
      setClock: vi.fn(),
      fade: vi.fn((text, mid, after) => {
        mid?.();
        after?.();
      }),
    },
    modal: vi.fn((title, html) => {
      document.body.innerHTML = `<div id="modalBody">${html}</div>`;
      g._modalOpen = true;
    }),
    closeModal: vi.fn(() => {
      g._modalOpen = false;
    }),
    resume: vi.fn(),
    addVotes: vi.fn(),
    audio: { pickup: vi.fn() },
  };
  return g;
}
const shopOf = (g) => new Massage(g, { makeCharacter: fakeCharacter });
const click = (sel) => document.querySelector(`#modalBody ${sel}`).click();
// the whole visit: E at the counter, a 師傅 (or 都可以), a plan, then a strength
function visit(g, plan, who = 'any', strength = 1) {
  g.interiors.actions[0].fn(g);
  if (who !== 'any') click(`[data-who="${who}"]`);
  click(`[data-i="${plan}"]`);
  if (g._modalOpen) click(`[data-f="${strength}"]`);
}

describe('涼韌足體養生 (Massage.js)', () => {
  it('is open 11:00 till 01:00, across midnight and on any day', () => {
    expect(massageOpen(11 * 60)).toBe(true);
    expect(massageOpen(23 * 60 + 59)).toBe(true);
    expect(massageOpen(30)).toBe(true); // 00:30
    expect(massageOpen(60)).toBe(false); // 01:00
    expect(massageOpen(10 * 60 + 59)).toBe(false);
    expect(massageOpen(3 * 1440 + 12 * 60)).toBe(true);
  });

  it('prices follow the 中壢 going rate and longer plans last longer', () => {
    const [foot, body, both] = MASSAGE_MENU;
    expect(foot.p).toBeGreaterThanOrEqual(500);
    expect(foot.p).toBeLessThanOrEqual(800);
    expect(body.p).toBeGreaterThanOrEqual(1000);
    expect(body.p).toBeLessThanOrEqual(1100);
    expect(both.p).toBeGreaterThan(body.p);
    expect(foot.boost).toBeLessThan(body.boost);
    expect(body.boost).toBeLessThan(both.boost);
  });

  it('puts the counter and the closed-door actions in, and the receptionist and the two 師傅', () => {
    const g = fakeGame();
    shopOf(g);
    expect(g.interiors.actions).toHaveLength(2);
    expect(g.interiors.actions[0].label()).toContain(MASSAGE_NAME);
    expect(g.interiors.actions[1].cond()).toBe(false); // the hours sign only when shut
    expect(g.scene.add).toHaveBeenCalledTimes(1 + MASSAGE_STAFF.length);
    const none = fakeGame();
    delete none.interiors.massage;
    new Massage(none, { makeCharacter: fakeCharacter });
    expect(none.interiors.actions).toHaveLength(0);
  });

  it('a foot massage: pay, sit on the recliner with the chosen 師傅 on the stool, the time goes by, then the boost', () => {
    const g = fakeGame(3000);
    const shop = shopOf(g);
    visit(g, 0, 'zhen', 2);
    const it = MASSAGE_MENU[0];
    expect(g.money).toBe(3000 - it.p);
    const r = g.interiors.massage.recliners[1];
    expect(g.player.sitAt).toHaveBeenCalledWith(r.seat.x, r.seat.z, r.seat.h);
    const zhen = shop.staff.find((t) => t.id === 'zhen');
    expect(zhen.ch.root.position.x).toBe(zhen.home.x); // back at her spot afterwards
    expect(g.clock).toBe(15 * 60 + it.min);
    expect(g.hud.setClock).toHaveBeenCalledWith(g.clock);
    expect(g.player.standUp).toHaveBeenCalled();
    expect(g.player.place).toHaveBeenCalledWith(11, 3.4, Math.PI);
    expect(g.player.boost).toBe(it.boost);
    expect(shop.busy).toBe(false);
    expect(g.addVotes).toHaveBeenCalledOnce();
  });

  it('a full-body massage lies you down on the bed; the votes come only on the first visit', () => {
    const g = fakeGame(5000);
    shopOf(g);
    visit(g, 1);
    const b = g.interiors.massage.beds[0];
    expect(g.player.sitAt).toHaveBeenCalledWith(
      b.lie.x,
      b.lie.z,
      b.lie.h,
      expect.objectContaining({ mode: 'prone' })
    );
    visit(g, 0);
    expect(g.addVotes).toHaveBeenCalledOnce();
    expect(g.money).toBe(5000 - MASSAGE_MENU[1].p - MASSAGE_MENU[0].p);
  });

  it('closing the strength question without an answer goes on with 剛好', () => {
    const g = fakeGame();
    const shop = shopOf(g);
    g.interiors.actions[0].fn(g);
    click('[data-i="0"]');
    expect(shop.sess.asking).toBe(true);
    g.closeModal(); // Esc / ×
    g.interiors.updaters[0](0.016);
    expect(shop.busy).toBe(false);
    expect(g.player.boost).toBe(MASSAGE_MENU[0].boost);
  });

  it('shut, or in a hurry (a timed mission / race), or short of money: nothing is charged', () => {
    const shut = fakeGame();
    shut.interiors.massage.closed = true;
    shopOf(shut).open();
    const hurry = fakeGame();
    hurry.missions.timer = 30;
    shopOf(hurry).open();
    for (const g of [shut, hurry]) {
      expect(g.modal).not.toHaveBeenCalled();
      expect(g.spend).not.toHaveBeenCalled();
    }
    const poor = fakeGame(100);
    const shop = shopOf(poor);
    visit(poor, 0);
    expect(poor.money).toBe(100);
    expect(shop.busy).toBe(false);
    expect(poor.player.sitAt).not.toHaveBeenCalled();
  });

  it('never shortens a longer boost that is still running', () => {
    const g = fakeGame(5000);
    g.player.boost = 9999;
    shopOf(g);
    visit(g, 0);
    expect(g.player.boost).toBe(9999);
  });
});
