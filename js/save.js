// Game progress is kept in the browser (localStorage, this site only): votes, golden ballots, money,
// story progress, easter eggs, where you were standing, your clothes, job / gate / race records and
// the i-Piyan chats. Saved every 10 s while playing, on story steps and when the page is hidden.
// Phone photos are not kept (they are large images).
const KEY = 'yanlinGTA.save.v1';

export function readSave() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } }

export function writeSave(g) {
  if (!g.missions || g.state === 'title' || g._noSave) return false; // _noSave: restarting, the page is about to reload
  const pl = g.player, wp = pl.worldPos(), M = g.missions;
  const d = {
    v: 1, at: Date.now(),
    votes: g.votes, money: g.money, ledger: g.ledger.slice(-80), clock: g.clock, playTime: g.playTime, flyerVotes: g.flyerVotes || 0,
    ballots: g.ballotList.map((b, i) => (b.got ? i : -1)).filter(i => i >= 0),
    // where you are inside the current mission (talk heard, objective, checkpoints): missions.resumeAt()
    mission: { idx: M.idx, rewarded: [...M.rewarded], done: M.done, free: M.free, prog: M.progress() },
    eggs: g.eggs.filter(e => e.found).map(e => e.title),
    pos: { x: wp.x, z: wp.z, h: pl.worldHeading(), y: pl.vehicle || pl.seat ? 0 : pl.y },
    look: pl.look || null,
    job: { shifts: g.job.shifts, earned: g.job.earned, best: g.job.best, totalVotes: g.job.totalVotes },
    gate: { votesGiven: g.gate.votesGiven, shifts: g.gate.shifts, best: g.gate.best },
    race: { wins: g.race.wins, runs: g.race.runs },
    chats: g.phone.chats.map(c => ({ round: c.round, unread: c.unread, msgs: c.msgs })),
    notes: g.pc?.notes ?? null,
    pin: g.nav?.target || null,
    stocks: g.market?.toJSON() || null,
  };
  try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
}

// apply a save to a freshly loaded game (before the story starts)
export function applySave(g, d) {
  g.votes = d.votes | 0; g.hud.setVotes(g.votes);
  g.money = d.money ?? g.money; g.ledger = d.ledger || g.ledger; g.hud.setMoney(g.money);
  g.clock = d.clock ?? g.clock; g.playTime = d.playTime || 0; g.flyerVotes = d.flyerVotes || 0;
  for (const i of d.ballots || []) { const b = g.ballotList[i]; if (b) { b.got = true; b.taken = true; b.mesh.visible = false; b.respawn = 120; } }
  g.ballotsTaken = (d.ballots || []).length; g.hud.setBallots(g.ballotsTaken);
  for (const e of g.eggs) if ((d.eggs || []).includes(e.title)) e.found = true;
  if (d.job) Object.assign(g.job, d.job);
  if (d.gate) Object.assign(g.gate, d.gate);
  if (d.race) Object.assign(g.race, d.race);
  (d.chats || []).forEach((c, i) => { const ch = g.phone.chats[i]; if (ch && c) { ch.round = c.round; ch.unread = c.unread; if (c.msgs) ch.msgs = c.msgs; } });
  if (d.notes != null && g.pc) g.pc.notes = d.notes;
  if (d.pin && g.nav) g.nav.set(d.pin.x, d.pin.z);
  if (d.stocks && g.market) g.market.load(d.stocks);
  if (d.look) g.player.setLook(d.look);
  if (d.pos) {
    g.player.place(d.pos.x, d.pos.z, d.pos.h || 0); g.player.y = d.pos.y || 0; g.rig.yaw = d.pos.h || 0;
    g.bringMyScooter(d.pos.x, d.pos.z);
  }
  const M = g.missions;
  M.rewarded = new Set(d.mission?.rewarded || []);
  return d.mission || { idx: -1 };
}
