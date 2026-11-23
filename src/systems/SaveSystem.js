// Game progress is kept in the browser (localStorage, this site only): votes, golden ballots, money,
// story progress, easter eggs, where you were standing, your clothes, job / gate / race records and
// the i-Piyan chats. Saved every 10 s while playing, on story steps and when the page is hidden.
// Phone photos are not kept (they are large images).
const KEY = 'yanlinGTA.save.v1';

export function readSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    return d && d.v === 1 ? d : null;
  } catch (e) {
    return null;
  }
}
export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* storage blocked */
  }
}

export function writeSave(g) {
  if (!g.missions || g.state === 'title' || g._noSave) return false; // _noSave: restarting, the page is about to reload
  const pl = g.player,
    wp = pl.worldPos(),
    M = g.missions;
  const d = {
    v: 1,
    at: Date.now(),
    votes: g.votes,
    money: g.money,
    ledger: g.ledger.slice(-80),
    clock: g.clock,
    playTime: g.playTime,
    flyerVotes: g.flyerVotes || 0,
    ballots: g.ballotList.map((b, i) => (b.got ? i : -1)).filter((i) => i >= 0),
    // where you are inside the current mission (talk heard, objective, checkpoints): missions.resumeAt()
    // mv 2: mission 5 (布條失竊案) was added before the speech, so older saves past it are one step behind
    mission: {
      mv: 2,
      idx: M.idx,
      rewarded: [...M.rewarded],
      done: M.done,
      free: M.free,
      prog: M.progress(),
    },
    detective: g.detective?.toJSON() || null,
    jianyu: g.jianyu?.toJSON() || null,
    mingshan: g.mingshan?.toJSON() || null,
    yeeming: g.yeeming?.toJSON() || null,
    houshe: g.houshe?.toJSON() || null,
    richard: g.richard?.toJSON() || null,
    howard: g.howard?.toJSON() || null,
    zzQuest: g.zzQuest?.toJSON() || null,
    tzuyuQuest: g.tzuyuQuest?.toJSON() || null,
    eggs: g.eggs.filter((e) => e.found).map((e) => e.title),
    pos: g.concerts?.savePos() || {
      x: wp.x,
      z: wp.z,
      h: pl.worldHeading(),
      y: pl.vehicle || pl.seat ? 0 : pl.y,
    }, // at the concert: where you took the shuttle
    look: pl.look || null,
    job: {
      shifts: g.job.shifts,
      earned: g.job.earned,
      best: g.job.best,
      totalVotes: g.job.totalVotes,
    },
    gate: { votesGiven: g.gate.votesGiven, shifts: g.gate.shifts, best: g.gate.best },
    race: { wins: g.race.wins, runs: g.race.runs },
    friends: g.friends?.toJSON() || [],
    gordon: g.gordon?.toJSON() || null,
    concerts: g.concerts?.toJSON() || null,
    stories: [...g.phone.storySeen].slice(-80),
    // typing bubbles are not saved; replies still on their way are (pending), and arrive after loading
    chats: g.phone.chats.map((c) => ({
      id: c.c.id,
      round: c.round,
      unread: c.unread,
      msgs: c.msgs.filter((m) => !m.typing),
      lastAt: c.lastAt,
      pending: c.pending || null,
    })),
    notes: g.pc?.notes ?? null,
    pin: g.nav?.target || null,
    stocks: g.market?.toJSON() || null,
    news: g.news?.toJSON() || null,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch (e) {
    return false;
  }
}

// apply a save to a freshly loaded game (before the story starts)
export function applySave(g, d) {
  g.votes = d.votes | 0;
  g.hud.setVotes(g.votes);
  g.money = d.money ?? g.money;
  g.ledger = d.ledger || g.ledger;
  g.hud.setMoney(g.money);
  g.clock = d.clock ?? g.clock;
  g.playTime = d.playTime || 0;
  g.flyerVotes = d.flyerVotes || 0;
  g.phone.syncFeeds?.(); // Peachgram / Pcard pick up from the loaded game time (before friends add their posts)
  for (const i of d.ballots || []) {
    const b = g.ballotList[i];
    if (b) {
      b.got = true;
      b.taken = true;
      b.mesh.visible = false;
      b.respawn = 120;
    }
  }
  g.ballotsTaken = (d.ballots || []).length;
  g.hud.setBallots(g.ballotsTaken);
  for (const e of g.eggs) if ((d.eggs || []).includes(e.title)) e.found = true;
  if (d.job) Object.assign(g.job, d.job);
  if (d.gate) Object.assign(g.gate, d.gate);
  if (d.race) Object.assign(g.race, d.race);
  g.gordon?.load(d.gordon);
  g.concerts?.load(d.concerts);
  g.friends?.load(d.friends); // before the chats: friends' chat rooms come after the built-in ones
  for (const id of d.stories || []) g.phone.storySeen.add(id);
  // by chat id; older saves have none, so match them by position, skipping chats added since (newer)
  const legacy = g.phone.chats.filter((x) => !x.c.newer);
  (d.chats || []).forEach((c, i) => {
    const ch = c?.id ? g.phone.chats.find((x) => x.c.id === c.id) : legacy[i];
    if (ch && c) {
      ch.round = c.round;
      ch.unread = c.unread;
      if (c.msgs) ch.msgs = c.msgs;
      if (c.lastAt != null) ch.lastAt = c.lastAt;
      ch.pending = c.pending || null;
    }
  });
  g.phone.resumePending();
  if (d.notes != null && g.pc) g.pc.notes = d.notes;
  if (d.pin && g.nav) g.nav.set(d.pin.x, d.pin.z);
  if (d.stocks && g.market) g.market.load(d.stocks);
  g.news?.load(d.news);
  if (d.look) g.player.setLook(d.look);
  if (d.pos) {
    g.player.place(d.pos.x, d.pos.z, d.pos.h || 0);
    g.player.y = d.pos.y || 0;
    g.player.pos.y += g.player.y;
    /* the feet too, or src/entities/Player.js takes it for a step onto a deck and drops you to the ground (into the shell under an upstairs flat) */ g.rig.yaw =
      d.pos.h || 0;
    g.bringMyScooter(d.pos.x, d.pos.z);
  }
  g.detective?.load(d.detective);
  g.jianyu?.load(d.jianyu);
  g.mingshan?.load(d.mingshan);
  g.yeeming?.load(d.yeeming);
  g.houshe?.load(d.houshe);
  g.richard?.load(d.richard);
  g.howard?.load(d.howard);
  g.zzQuest?.load(d.zzQuest);
  g.tzuyuQuest?.load(d.tzuyuQuest);
  const M = g.missions;
  M.rewarded = new Set(d.mission?.rewarded || []);
  const m = d.mission || { idx: -1 };
  if (!m.mv && m.idx >= 5) m.idx++; // saved at the speech (5) or the ending (6) before mission 5 existed
  return m;
}
