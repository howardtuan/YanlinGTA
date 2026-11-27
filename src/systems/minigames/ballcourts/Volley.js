// 排球（2 對 2 簡化版）的規則、球的物理與電腦球員（純邏輯，不碰 three.js 與畫面）：
//   src/systems/minigames/ballcourts/BallCourts.js 拿來畫 NPC 比賽和玩家比賽，tests/unit/ballcourts.test.js 測。
// 座標是單一排球場的局部座標（src/world/Court.js 的 VBALL、courtP）：u 沿球場、網在 u = 0，v 橫過球場，h 是球心離地高度。
// 球場 18 × 9 m（|u| ≤ 9、|v| ≤ 4.5），網高 2.43 m。players[0]、[1] 是 0 隊（北半場 u < 0），[2]、[3] 是 1 隊。
// 每邊最多三次觸球：接球（第一次）→ 舉球（第二次，另一個人）→ 扣球（第一次接的人）；同一人不能連續觸球。
// 玩家只要在球掉下來經過擊球高度的時候按鍵：離那一刻越近、人越站在球底下，球就越好。
// 落地計分（每球得分制）：落在界內是落地那邊失分，落在界外是最後碰球那隊失分；先拿 target 分且領先 2 分的贏，打到 cap 分就停。
export const G = 9.8,
  BALL_R = 0.105,
  NET_H = 2.43,
  HALF_L = 9,
  HALF_W = 4.5,
  REACH = 1.25, // how far (m, across the floor) from you a ball can be and still be played
  WIN = 0.3; // how far (s) from the ideal moment a touch can be and still go somewhere
// the height a ball is played at, by touch
export const HIT_H = { dig: 0.85, set: 2.3, hit: 2.75, serve: 2.7 };
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const teamOf = (i) => i >> 1;
export const sideOf = (t) => (t ? 1 : -1);

// time from now until the ball comes down through height hI (negative: it already has); null if it never gets that high
export function tDown(b, hI) {
  const disc = b.vh * b.vh + 2 * G * (b.h - hI);
  if (disc < 0) return null;
  return (b.vh + Math.sqrt(disc)) / G;
}
// timing quality of a touch dt s off the ideal moment
export const touchQ = (dt) => clamp(1 - Math.abs(dt) / WIN, 0, 1);
// height of the ball where it crosses the net (null if it doesn't)
function netCross(p, vu, vh) {
  if (!vu || p.u < 0 === p.u + vu * 10 < 0) return null;
  const t = -p.u / vu;
  return t > 0 ? p.h + vh * t - 0.5 * G * t * t : null;
}
// velocity from p down to land on (tu, tv) at horizontal speed s, over the net by `clear` (slower, higher, until it is)
export function attack(p, tu, tv, s, clear = 0.15) {
  const du = tu - p.u,
    dv = tv - p.v,
    d = Math.hypot(du, dv) || 0.01;
  let out = null;
  for (let sp = s; sp >= 5; sp -= 0.5) {
    const T = d / sp;
    out = { u: du / T, v: dv / T, h: (BALL_R - p.h + 0.5 * G * T * T) / T };
    const hn = netCross(p, out.u, out.h);
    if (hn === null || hn >= NET_H + clear) return out;
  }
  return out;
}
// velocity that brings the ball from p to (tu, tv, th) in T s
export function lob(p, tu, tv, th, T) {
  return { u: (tu - p.u) / T, v: (tv - p.v) / T, h: (th - p.h + 0.5 * G * T * T) / T };
}

// players: [{ name, ai: { skill 0..1, speed m/s } | null }] × 4
export class Volley {
  constructor({ players, target = 11, cap = 15, serveTeam = 1, rnd = Math.random }) {
    this.rnd = rnd;
    this.target = target;
    this.cap = cap;
    this.players = players.map((p, i) => ({
      u: sideOf(teamOf(i)) * 5,
      v: i % 2 ? 2 : -2,
      tu: 0,
      tv: 0,
      moving: 0,
      aim: 0,
      anim: null, // { kind, t } — the scene draws the swing
      cd: 0,
      ...p,
    }));
    this.ball = { u: 0, v: 0, h: 1, vu: 0, vv: 0, vh: 0, held: true };
    this.score = [0, 0];
    this.serving = serveTeam;
    this.srv = [0, 2]; // who serves next for each team
    this.events = [];
    this.winner = -1;
    this._serve();
  }
  take() {
    const e = this.events;
    this.events = [];
    return e;
  }
  get server() {
    return this.srv[this.serving];
  }
  // everyone to their places for the next serve
  _serve() {
    this.state = 'serve';
    this.t = 0;
    this.touches = 0;
    this.last = -1;
    this.lastTeam = this.serving;
    this.plan = null;
    const sv = this.server;
    for (const [i, p] of this.players.entries()) {
      const s = sideOf(teamOf(i));
      if (i === sv) {
        p.tu = s * 9.7;
        p.tv = 1.6 * s;
      } else if (teamOf(i) === this.serving) {
        p.tu = s * 4;
        p.tv = -1.8 * s;
      } else {
        p.tu = s * 5.8;
        p.tv = i % 2 ? 2.1 : -2.1;
      }
      p.anim = null;
      p.cd = 0;
    }
    const b = this.ball;
    b.held = true;
    b.vu = b.vv = b.vh = 0;
    this.events.push({ type: 'place', server: sv });
  }
  spot(i) {
    return [this.players[i].tu, this.players[i].tv];
  }
  // ---------------- a human's key (or the AI's) ----------------
  act(i) {
    const p = this.players[i];
    if (p.cd > 0) return false;
    if (this.state === 'serve' && i === this.server) {
      // the toss
      this.state = 'toss';
      this.t = 0;
      const b = this.ball;
      b.held = false;
      b.u = p.u + sideOf(teamOf(i)) * -0.15;
      b.v = p.v;
      b.h = 1.5;
      b.vu = b.vv = 0;
      b.vh = 5.5;
      p.anim = { kind: 'toss', t: 0 };
      this.events.push({ type: 'toss', who: i });
      return true;
    }
    if (this.state === 'toss' && i === this.server) {
      const dt = -tDown(this.ball, HIT_H.serve);
      if (dt < -WIN) return false; // too early: wait for it to come down
      return this._serveHit(i, touchQ(dt));
    }
    if (this.state !== 'play') return false;
    const k = this._kind(i);
    if (!k) return false;
    const b = this.ball,
      hI = this._hI(HIT_H[k]),
      tau = tDown(b, hI);
    if (tau === null) return false;
    const cu = b.u + b.vu * tau,
      cv = b.v + b.vv * tau,
      far = Math.hypot(cu - p.u, cv - p.v);
    if (tau > WIN * 1.6 || far > REACH * 1.6) return false; // nowhere near yet: nothing happens
    p.cd = 0.35;
    const q = touchQ(tau) * clamp(1.3 - far / REACH, 0, 1);
    if (q <= 0.05) {
      p.anim = { kind: k, t: 0 };
      this.events.push({ type: 'whiff', who: i, kind: k });
      return false;
    }
    this._touch(i, k, q);
    return true;
  }
  // the height to play it at: h, or just under the top of its flight if it never gets that high
  _hI(h) {
    return tDown(this.ball, h) === null ? this._apex() - 0.05 : h;
  }
  _apex() {
    const b = this.ball;
    return b.vh > 0 ? b.h + (b.vh * b.vh) / (2 * G) : b.h;
  }
  // what touch it would be for player i now (null: not his to play)
  _kind(i) {
    if (this.state !== 'play' || this.ball.held) return null;
    const t = teamOf(i),
      s = sideOf(t);
    if (this.recv !== t || this.last === i || this.touches >= 3) return null;
    if (Math.sign(this.ball.u) !== s && Math.abs(this.ball.u) > 0.5) {
      // still on its way over: only once it is coming down on our side
      const tau = tDown(this.ball, HIT_H.dig);
      if (tau === null || Math.sign(this.ball.u + this.ball.vu * tau) !== s) return null;
    }
    return ['dig', 'set', 'hit'][this.touches];
  }
  _serveHit(i, q) {
    const p = this.players[i],
      b = this.ball,
      s = sideOf(teamOf(i)),
      r = this.rnd;
    p.anim = { kind: 'serve', t: 0 };
    let tu = -s * (3.5 + r() * 4.5),
      tv = p.ai ? (r() - 0.5) * 6 : clamp(p.aim, -1, 1) * 3.3;
    const e = (1 - q) * 3.2,
      a = r() * Math.PI * 2;
    tu += Math.cos(a) * e * r();
    tv += Math.sin(a) * e * r();
    const clear = q < 0.3 && r() < 0.5 ? -0.3 : 0.3;
    const v = attack(b, tu, tv, 11 + 5 * q, clear);
    b.vu = v.u;
    b.vv = v.v;
    b.vh = v.h;
    this.state = 'play';
    this.t = 0;
    this.last = i;
    this.lastTeam = teamOf(i);
    this.touches = 3; // it has to go over
    this.recv = teamOf(i);
    this.events.push({ type: 'serve', who: i, q });
    this._replan();
    return true;
  }
  _touch(i, kind, q) {
    const p = this.players[i],
      b = this.ball,
      t = teamOf(i),
      s = sideOf(t),
      r = this.rnd,
      mate = this.players[i ^ 1];
    p.anim = { kind, t: 0 };
    this.touches++;
    this.last = i;
    this.lastTeam = t;
    if (kind === 'dig') this.first = i;
    const err = (e) => {
      const a = r() * Math.PI * 2,
        m = e * r();
      return [Math.cos(a) * m, Math.sin(a) * m];
    };
    let v;
    if (kind === 'dig') {
      const [eu, ev] = err((1 - q) * 2.4);
      v = lob(
        b,
        s * clamp(2.2 + eu, 0.8, 8.5),
        clamp(mate.v * 0.3 + ev, -4.8, 4.8),
        HIT_H.set,
        1.35
      );
    } else if (kind === 'set') {
      // to the one who dug it, up at the net
      const att = this.players[this.first ?? i ^ 1],
        va = att.ai ? clamp(att.v, -3.2, 3.2) : clamp(att.v, -3.8, 3.8),
        [eu, ev] = err((1 - q) * 1.6);
      v = lob(b, s * clamp(1.0 + eu, 0.5, 6), clamp(va + ev, -4.8, 4.8), HIT_H.hit, 1.15);
    } else {
      let tu = -s * (2.5 + r() * 5.5),
        tv = p.ai ? (r() - 0.5) * 7 : clamp(p.aim, -1, 1) * 3.6;
      const [eu, ev] = err((1 - q) * 3.4);
      tu += eu;
      tv += ev;
      const clear = q < 0.3 && r() < 0.45 ? -0.35 : 0.12;
      v = attack(b, tu, tv, 9 + 10 * q, clear);
    }
    b.vu = v.u;
    b.vv = v.v;
    b.vh = v.h;
    this.events.push({ type: 'touch', who: i, kind, q });
    this._replan();
  }
  // who goes for the next touch, and where it'll be played
  _replan() {
    const b = this.ball;
    if (this.touches >= 3) {
      // it is going over to the other side
      this.recv = 1 - this.lastTeam;
      this.touches = 0;
      this.last = -1;
    }
    const t = this.recv,
      k = ['dig', 'set', 'hit'][this.touches],
      hI = this._hI(HIT_H[k]),
      tau = tDown(b, hI) ?? 0,
      cu = b.u + b.vu * tau,
      cv = b.v + b.vv * tau,
      a = t * 2,
      c = [a, a + 1];
    let who;
    if (k === 'dig') {
      const d = c.map((i) => Math.hypot(this.players[i].u - cu, this.players[i].v - cv));
      who = d[0] <= d[1] ? c[0] : c[1];
    } else if (k === 'set') who = this.last ^ 1;
    else who = this.first;
    // a ball going well out: the AI lets it drop
    const tl = tDown(b, BALL_R) ?? 0,
      lu = b.u + b.vu * tl,
      lv = b.v + b.vv * tl,
      out = Math.abs(lu) > HALF_L + 0.35 || Math.abs(lv) > HALF_W + 0.35;
    this.plan = { team: t, who, kind: k, cu, cv, hI, out: k === 'dig' && out };
  }
  // ---------------- every frame ----------------
  step(dt) {
    if (this.state === 'over') return;
    const n = Math.max(1, Math.ceil(dt / 0.01)),
      h = dt / n;
    for (let k = 0; k < n; k++) this._step(h);
  }
  _step(dt) {
    if (this.state === 'over') return;
    this.t += dt;
    for (const p of this.players) {
      p.cd = Math.max(0, p.cd - dt);
      if (p.anim) p.anim.t += dt;
    }
    for (const [i, p] of this.players.entries()) if (p.ai) this._ai(i, p, dt);
    const b = this.ball;
    if (this.state === 'serve') {
      const p = this.players[this.server];
      b.u = p.u + sideOf(this.serving) * -0.15;
      b.v = p.v;
      b.h = 1.05;
      return;
    }
    if (this.state === 'dead') {
      this._fly(dt);
      if (this.t > 1.8) {
        if (this.winner >= 0) {
          this.state = 'over';
          this.events.push({ type: 'match', winner: this.winner });
        } else this._serve();
      }
      return;
    }
    if (this.state === 'toss') {
      this._fly(dt);
      // nobody hit it: it comes back down into the hands, toss again
      if (b.h < 1.2 && b.vh < 0) {
        this.state = 'serve';
        this.t = 0;
        b.held = true;
        this.events.push({ type: 'retoss', who: this.server });
      }
      return;
    }
    const u0 = b.u;
    this._fly(dt, false);
    // through the net below the tape: it drops on the side it came from
    if (u0 !== 0 && u0 < 0 !== b.u < 0 && Math.abs(b.v) < HALF_W + 0.4 && b.h < NET_H) {
      b.u = Math.sign(u0) * 0.12;
      b.vu *= -0.15;
      b.vv *= 0.3;
      b.vh = Math.min(b.vh, 0);
      this.events.push({ type: 'net' });
      this.recv = this.lastTeam;
      this.touches = 3; // dead: nobody plays it
      this.plan = null;
    }
    if (b.h <= BALL_R && b.vh < 0) {
      const inn = Math.abs(b.u) <= HALF_L + 0.05 && Math.abs(b.v) <= HALF_W + 0.05,
        land = b.u < 0 ? 0 : 1,
        win = inn ? 1 - land : 1 - this.lastTeam;
      b.h = BALL_R;
      b.vh *= -0.45;
      b.vu *= 0.5;
      b.vv *= 0.5;
      this.events.push({ type: 'land', inn, u: b.u, v: b.v });
      this._point(win);
    }
  }
  _fly(dt, floor = true) {
    const b = this.ball;
    b.vh -= G * dt;
    b.u += b.vu * dt;
    b.v += b.vv * dt;
    b.h += b.vh * dt;
    if (floor && b.h < BALL_R && b.vh < 0) {
      b.h = BALL_R;
      b.vh = Math.abs(b.vh) > 1 ? -b.vh * 0.45 : 0;
      b.vu *= 0.6;
      b.vv *= 0.6;
    }
  }
  _point(w) {
    this.score[w]++;
    this.state = 'dead';
    this.t = 0;
    this.plan = null;
    if (w !== this.serving) {
      // side out: the next one of them serves
      this.serving = w;
      this.srv[w] = this.srv[w] === w * 2 ? w * 2 + 1 : w * 2;
    }
    const [a, c] = [this.score[w], this.score[1 - w]];
    if ((a >= this.target && a - c >= 2) || a >= this.cap) this.winner = w;
    this.events.push({ type: 'point', winner: w });
  }
  // ---------------- the computer players ----------------
  _walk(p, u, v, sp, dt) {
    const du = u - p.u,
      dv = v - p.v,
      d = Math.hypot(du, dv);
    if (d < 0.05) {
      p.moving = 0;
      return d;
    }
    const s = Math.min(d, sp * dt);
    p.u += (du / d) * s;
    p.v += (dv / d) * s;
    p.moving = s / dt;
    return d;
  }
  _ai(i, p, dt) {
    const t = teamOf(i),
      s = sideOf(t),
      sp = p.ai.speed,
      b = this.ball;
    if (this.state === 'serve' || this.state === 'toss') {
      this._walk(p, p.tu, p.tv, sp, dt);
      if (this.state === 'serve' && i === this.server && this.t > 1.6 && p.moving === 0)
        this.act(i);
      if (this.state === 'toss' && i === this.server) {
        const tau = tDown(b, HIT_H.serve);
        if (tau !== null && tau <= (p.lag ??= (1 - p.ai.skill) * 0.25 * (this.rnd() * 2 - 1))) {
          p.lag = undefined;
          this._serveHit(i, touchQ(tau));
        }
      }
      return;
    }
    if (this.state !== 'play') {
      p.moving = 0;
      return;
    }
    const pl = this.plan,
      mine = pl && pl.team === t && pl.who === i && !pl.out && this._kind(i) === pl.kind;
    // a human teammate who isn't getting there: the AI tries for it
    let help = false;
    if (pl && pl.team === t && !mine && pl.kind === 'dig' && !pl.out && this.players[i ^ 1]) {
      const h = this.players[i ^ 1],
        tau = tDown(b, pl.hI);
      help =
        !h.ai &&
        pl.who === (i ^ 1) &&
        tau !== null &&
        tau < 0.7 &&
        Math.hypot(h.u - pl.cu, h.v - pl.cv) > 2.4 &&
        this._kind(i) === 'dig';
    }
    if (mine || help) {
      // under the ball where it'll be played (it's re-aimed every frame, so a ball that drifts is followed)
      const hI = this._hI(pl.hI),
        tau = tDown(b, hI);
      if (tau === null) return;
      const cu = b.u + b.vu * Math.max(0, tau),
        cv = b.v + b.vv * Math.max(0, tau);
      this._walk(p, cu - s * 0.25, cv, sp, dt);
      // the moment comes: play it if he's there
      if (tau <= (p.lag ??= (1 - p.ai.skill) * 0.22 * (this.rnd() * 2 - 1))) {
        const lag = p.lag;
        p.lag = undefined;
        const far = Math.hypot(cu - p.u, cv - p.v);
        // a hard-hit ball is not always dug, even by someone standing there
        const spd = Math.hypot(b.vu, b.vv),
          miss = pl.kind === 'dig' ? clamp((spd - 7) / 12, 0, 0.6) * (1.15 - p.ai.skill) : 0.03;
        if (this.rnd() < miss) {
          p.anim = { kind: pl.kind, t: 0 };
          this.plan = { ...pl, out: true };
          this.events.push({ type: 'whiff', who: i, kind: pl.kind });
        } else if (far <= REACH && this._kind(i)) {
          const q = clamp(touchQ(lag) * (0.55 + 0.45 * p.ai.skill) * (1.2 - far / REACH), 0.12, 1);
          this._touch(i, this._kind(i), q);
        } else if (tau < -0.2) this.plan = { ...pl, out: true }; // missed it
      }
      return;
    }
    // everyone else: a set-up spot, or back to defend
    let u = s * 5.6,
      v = i % 2 ? 2.1 : -2.1;
    if (pl && pl.team === t) {
      if (pl.kind === 'set' && i === this.first) {
        u = s * 2.6;
        v = clamp(p.v, -3.2, 3.2);
      } // the attacker backs off for his run
      else if (pl.kind === 'hit' && i !== this.first) {
        u = s * 3.5;
        v = -clamp(this.players[i ^ 1].v, -3, 3) * 0.6;
      } // covering
    }
    this._walk(p, u, v, sp * 0.8, dt);
  }
}
