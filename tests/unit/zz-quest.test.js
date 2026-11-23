import { describe, it, expect, beforeEach } from 'vitest';
import { ZzInjury } from '../../src/systems/quests/ZzInjury.js';
import { pickSent, Phone } from '../../src/ui/phone/Phone.js';
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
// what the chat offers you right now (Phone._options / _typing) for a chat state, without building the phone UI
const P = Phone.prototype;
const chatView = (g, st) => {
  const ph = { g, _always: P._always, _locked: P._locked };
  return { opts: P._options.call(ph, st)?.map((o) => o.t) || [], typing: P._typing.call(ph, st) };
};

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

describe('吱吱武嶺跑山受傷：沒回就再問', () => {
  it('unanswered, 吱吱 asks about 武嶺 again every 10 game minutes; once declined he stops', () => {
    const { g, zzChat } = fakeGame(['zz', 'gd']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.update(0.1);
    const n0 = zzChat.msgs.length;
    g.clock += 9.9;
    q.update(0.1);
    expect(zzChat.msgs).toHaveLength(n0);
    g.clock += 0.2;
    q.update(0.1);
    expect(zzChat.msgs).toHaveLength(n0 + 1);
    expect(zzChat.msgs.at(-1).text).toMatch(/武嶺|跑山/);
    g.clock += 10;
    q.update(0.1);
    expect(zzChat.msgs).toHaveLength(n0 + 2);
    declineOpt.ask(g);
    const n1 = zzChat.msgs.length;
    g.clock += 5;
    q.update(0.1);
    expect(zzChat.msgs).toHaveLength(n1);
  });

  it('an older save already at the invite (no inviteAt): he asks again 10 minutes after loading, not at once', () => {
    const { g, zzChat } = fakeGame(['zz', 'gd']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.load({ stage: 'invited', callAt: null });
    q.update(0.1);
    expect(zzChat.msgs).toHaveLength(0);
    g.clock += 10;
    q.update(0.1);
    expect(zzChat.msgs).toHaveLength(1);
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

describe('吱吱武嶺跑山受傷：任務問句鎖住聊天室', () => {
  const zzChatAt = (round) => ({
    c: FRIEND_CONTACTS.zz,
    round,
    aiOpts: ['最近在忙什麼？', '要不要打球'],
  });

  it('before the invite: the usual topics and 你在哪？ are there', () => {
    const { g } = fakeGame(['zz']);
    g.zzQuest = new ZzInjury(g);
    const v = chatView(g, zzChatAt(0));
    expect(v.opts).toContain('你在哪？');
    expect(v.opts.length).toBeGreaterThan(1);
  });

  it('while 吱吱 waits for an answer to the 武嶺 invite, the 回絕 line is the only option (mid-script too)', () => {
    const { g } = fakeGame(['zz', 'gd']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.update(0.1);
    for (const round of [0, 1, 99])
      expect(chatView(g, zzChatAt(round)).opts).toEqual([declineOpt.t]);
  });

  it('once declined the chat opens up again', () => {
    const { g } = fakeGame(['zz', 'gd']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.update(0.1);
    declineOpt.ask(g);
    const v = chatView(g, zzChatAt(0));
    expect(v.opts).not.toContain(declineOpt.t);
    expect(v.opts).toContain('你在哪？');
  });

  it('after the quest, 你之前受傷還好嗎？ is just one more option (bringing it up is up to you)', () => {
    const { g } = fakeGame(['zz', 'gd']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.state.stage = 'done';
    const v = chatView(g, zzChatAt(0));
    expect(v.opts).toContain('你之前受傷還好嗎？');
    expect(v.opts).toContain('你在哪？');
    expect(v.opts.length).toBeGreaterThan(2);
  });

  it('other chats are not locked by the 吱吱 quest', () => {
    const { g } = fakeGame(['zz', 'gd']);
    const q = (g.zzQuest = new ZzInjury(g));
    q.update(0.1);
    const gd = { c: FRIEND_CONTACTS.gd, round: 0 };
    expect(chatView(g, gd).opts).not.toEqual([]);
    expect(chatView(g, gd).opts).not.toContain(declineOpt.t);
  });
});

describe('吱吱武嶺跑山受傷：洗澡提醒與復發', () => {
  const DAY = 1440;
  let g, zzChat, q;
  beforeEach(() => {
    ({ g, zzChat } = fakeGame(['zz', 'gd']));
    q = g.zzQuest = new ZzInjury(g);
    q._bathTick = () => {}; // (the bathroom scene is not part of these tests)
  });
  const asks = () => zzChat.msgs.length;

  it('hurt, before the 10 baths: he asks once a night, at 20:00, every day', () => {
    q.state.stage = 'injured';
    g.clock = 5 * DAY + 19 * 60 + 59;
    q.update(0.1);
    expect(asks()).toBe(0);
    g.clock = 5 * DAY + 20 * 60;
    q.update(0.1);
    expect(asks()).toBe(1);
    for (const h of [21, 22, 23]) {
      g.clock = 5 * DAY + h * 60 + 30;
      q.update(0.1);
    }
    expect(asks()).toBe(1); // once a night
    g.clock = 6 * DAY + 20 * 60;
    q.update(0.1);
    expect(asks()).toBe(2); // and again the next night
  });

  it('a relapse: he waits that night; if you never come, the next day it is over and the chat can bring it up again', () => {
    q.state.stage = 'done';
    g.clock = 7 * DAY + 15 * 60;
    const rnd = Math.random;
    Math.random = () => 0; // the 80%: relapse
    q.review();
    Math.random = rnd;
    expect(q.state.relapse).toBe(true);
    g.clock = 7 * DAY + 20 * 60;
    expect(q.waiting()).toBe(true);
    q.update(0.1);
    expect(asks()).toBe(1); // asked for tonight's bath at 20:00
    g.clock = 8 * DAY + 9 * 60; // the next morning, you never went
    q.update(0.1);
    expect(q.state.relapse).toBe(false);
    g.clock = 8 * DAY + 20 * 60;
    expect(q.waiting()).toBe(false); // no bath tonight
    expect(optionsNow(g)).toContain('你之前受傷還好嗎？');
  });

  it('a relapse brought up in the evening: no extra 20:00 message on top of his answer', () => {
    q.state.stage = 'done';
    g.clock = 7 * DAY + 21 * 60;
    const rnd = Math.random;
    Math.random = () => 0;
    q.review();
    Math.random = rnd;
    q.update(0.1);
    expect(asks()).toBe(0);
    expect(q.waiting()).toBe(true);
  });

  it('an older save with a relapse but no relapseDay: it counts from when it is loaded', () => {
    g.clock = 9 * DAY + 10 * 60;
    q.load({ stage: 'done', relapse: true });
    q.update(0.1);
    expect(q.state.relapse).toBe(true);
    g.clock = 10 * DAY + 10 * 60;
    q.update(0.1);
    expect(q.state.relapse).toBe(false);
  });
});
