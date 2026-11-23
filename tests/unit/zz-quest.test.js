import { describe, it, expect, beforeEach } from 'vitest';
import { ZzInjury } from '../../src/systems/quests/ZzInjury.js';
import { pickSent } from '../../src/ui/phone/Phone.js';
import { FRIEND_CONTACTS } from '../../src/ui/phone/Chats.js';

// 支線「吱吱武嶺跑山受傷」(src/systems/quests/ZzInjury.js): the invite, the 回絕 option in 吱吱's chat and the call.
// A minimal stand-in for the game: the phone keeps what 吱吱 says and the call it was asked to ring.
function fakeGame(friends = []) {
  const zzChat = { c: FRIEND_CONTACTS.zz, busy: false, msgs: [] };
  const g = {
    state: 'play',
    clock: 17 * 60,
    _saveT: 0,
    friends: { added: new Set(friends) },
    hud: { inDialog: false, bigOpen: false, toast() {} },
    interiors: {},
    phone: {
      chats: friends.includes('zz') ? [zzChat] : [],
      call: null,
      rang: [],
      _deliver(st, replies, v, delay, then) {
        st.msgs.push(...replies);
        then?.();
      },
      ring(opts) {
        this.call = opts;
        this.rang.push(opts);
      },
    },
  };
  return { g, zzChat };
}
const zzSaid = (chat) => chat.msgs.map((m) => m.text).join('\n');
const declineOpt = FRIEND_CONTACTS.zz.always.find((a) => a.t.includes('先不去'));
const optionsNow = (g) =>
  FRIEND_CONTACTS.zz.always.filter((a) => !a.when || a.when(g)).map((a) => a.t);

describe('吱吱武嶺跑山受傷：邀約', () => {
  it('only 吱吱 as a friend: no invite yet', () => {
    const { g, zzChat } = fakeGame(['zz']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.update(0.1);
    expect(q.state.stage).toBe('none');
    expect(zzChat.msgs).toEqual([]);
  });

  it('both friends: 吱吱 sends the 武嶺 invite right away', () => {
    const { g, zzChat } = fakeGame(['zz']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.update(0.1);
    g.friends.added.add('gd');
    q.update(0.1);
    expect(q.state.stage).toBe('invited');
    expect(zzSaid(zzChat)).toContain('武嶺');
  });

  it('a save that was already friends with both (no quest progress yet): the invite comes on the first frame', () => {
    const { g, zzChat } = fakeGame(['zz', 'gd']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.load(null); // older save: no zzQuest entry
    q.update(0.1);
    expect(q.state.stage).toBe('invited');
    expect(zzSaid(zzChat)).toContain('武嶺');
    // and only once
    q.update(0.1);
    q.update(0.1);
    expect(zzChat.msgs.filter((m) => /武嶺/.test(m.text))).toHaveLength(1);
  });
});

describe('吱吱武嶺跑山受傷：回絕與來電', () => {
  let g, q;
  beforeEach(() => {
    ({ g } = fakeGame(['zz', 'gd']));
    q = g.zzQuest = new ZzInjury(g);
    q.update(0.1); // invited
  });

  it('the 回絕 option is offered while invited, and gone once you have declined (the chat moves on)', () => {
    expect(optionsNow(g)).toContain(declineOpt.t);
    declineOpt.ask(g);
    expect(q.state.stage).toBe('declined');
    expect(optionsNow(g)).not.toContain(declineOpt.t);
  });

  it('declining sent through the typing box (AI on: picking an option fills the box) still counts as the 回絕 option', () => {
    const opts = optionsNow(g).map((t) => FRIEND_CONTACTS.zz.always.find((a) => a.t === t));
    const ch = pickSent(
      opts,
      FRIEND_CONTACTS.zz.always.filter((a) => !a.when || a.when(g)),
      declineOpt.t,
      opts.length
    );
    expect(ch).toBe(declineOpt);
    expect(typeof ch.ask).toBe('function');
  });

  it('own words that decline (不去／下次…) also count as declining', () => {
    const ch = pickSent(
      [],
      FRIEND_CONTACTS.zz.always.filter((a) => !a.when || a.when(g)),
      '這次不去啦 抱歉',
      0
    );
    expect(ch.ask).toBe(declineOpt.ask);
  });

  it('吱吱 calls 10 game minutes after you decline, not before', () => {
    declineOpt.ask(g);
    g.clock += 9.9;
    q.update(0.1);
    expect(g.phone.rang).toHaveLength(0);
    g.clock += 0.2;
    q.update(0.1);
    expect(g.phone.rang).toHaveLength(1);
  });

  it('a declined / missed call rings again 10 game minutes later; answered, he is hurt and sends the video', () => {
    declineOpt.ask(g);
    g.clock += 10;
    q.update(0.1);
    const call = g.phone.call;
    g.phone.call = null;
    call.onDecline();
    g.clock += 5;
    q.update(0.1);
    expect(g.phone.rang).toHaveLength(1);
    g.clock += 5.1;
    q.update(0.1);
    expect(g.phone.rang).toHaveLength(2);
    g.phone.call = null;
    g.phone.rang[1].onEnd();
    expect(q.state.stage).toBe('injured');
    expect(g.phone.chats[0].msgs.some((m) => m.video === 'wuling')).toBe(true);
  });

  it('the call says 吱吱 was the only one without insurance', () => {
    declineOpt.ask(g);
    g.clock += 10;
    q.update(0.1);
    const lines = g.phone.call.lines.map(([, t]) => t).join('\n');
    expect(lines).toMatch(/只有我一個人沒買保險/);
  });

  it('no ringing while something else is going on (a dialog): it waits', () => {
    declineOpt.ask(g);
    g.clock += 10;
    g.hud.inDialog = true;
    q.update(0.1);
    expect(g.phone.rang).toHaveLength(0);
    g.hud.inDialog = false;
    q.update(0.1);
    expect(g.phone.rang).toHaveLength(1);
  });
});
