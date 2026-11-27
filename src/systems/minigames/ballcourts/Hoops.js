// 籃球鬥牛（1 對 1 半場）的規則、球的物理與電腦球員（純邏輯，不碰 three.js 與畫面）：
//   src/systems/minigames/ballcourts/BallCourts.js 拿來畫 NPC 鬥牛和玩家鬥牛，tests/unit/ballcourts.test.js 測。
// 座標是單一球場的局部座標（src/world/Court.js 的 courtP）：u 沿球場、往打的那個籃框是 +u，中線 u = 0；v 橫過球場；
// h 是球心離地高度。只用 +u 那半場。
// 規則（街頭鬥牛）：三分線內進球 1 分、線外 2 分，先拿到 target 分的贏；進球後換對方在弧頂發球（check）；
// 防守方搶到籃板或抄到球，要先運出三分線外才能出手；球出界給另一邊。
export const G = 9.8,
  BALL_R = 0.12,
  RIM_H = 3.05,
  RIM_IN = 1.575,
  ARC = 6.75, // the three-point line (m from the basket)
  PICK = 0.75, // how close (m) a player gets to a loose ball to take it
  STEAL_R = 1.3, // how close a defender has to be to reach in
  SHOT_MAX = 1.1, // a jump shot you don't let go of by then goes up anyway (s)
  REL_BEST = 0.62, // the best moment to let go: the top of the jump (s after the start)
  REL_WIN = 0.4; // and how far off it can be before the shot is a brick
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// chance a shot from d m goes in: q (0..1) is how well it was timed, contest 0..1 how close the defender was
export function shotChance(d, q = 1, contest = 0) {
  const base = d <= 1.6 ? 0.82 : Math.max(0.12, 0.78 - 0.065 * (d - 1.6));
  return base * (0.45 + 0.55 * clamp(q, 0, 1)) * (1 - 0.4 * clamp(contest, 0, 1));
}
// timing quality of letting go t s into the jump
export const releaseQ = (t) => clamp(1 - Math.abs(t - REL_BEST) / REL_WIN, 0, 1);

// players: [{ name, ai: { skill 0..1, speed m/s } | null }] — exactly two, players[i] is team i
export class Hoops {
  constructor({ L = 28, W = 14.6, players, target = 7, first = 0, rnd = Math.random }) {
    this.rnd = rnd;
    this.UL = L / 2;
    this.HW = W / 2;
    this.BU = L / 2 - RIM_IN; // the basket's u (v = 0)
    this.target = target;
    this.players = players.map((p) => ({
      u: 0,
      v: 0,
      tu: 0,
      tv: 0,
      moving: 0,
      shotT: -1,
      plan: null,
      clock: 0,
      stealCd: 0,
      ...p,
    }));
    this.ball = { u: 0, v: 0, h: 1, vu: 0, vv: 0, vh: 0, holder: -1, flight: null };
    this.score = [0, 0];
    this.events = [];
    this.winner = -1;
    this.o = first; // offense
    this.cleared = true;
    this.lastTouch = first;
    this._check(first);
  }
  take() {
    const e = this.events;
    this.events = [];
    return e;
  }
  dist(u, v) {
    return Math.hypot(this.BU - u, v);
  }
  // the ball to team o at the top of the key, the defender a step off
  _check(o) {
    this.o = o;
    this.cleared = true;
    this.state = 'check';
    this.t = 0;
    const off = this.players[o],
      def = this.players[1 - o],
      cu = this.BU - ARC - 1.4;
    off.tu = cu;
    off.tv = 0;
    def.tu = cu + 1.6;
    def.tv = 0;
    for (const p of this.players) {
      p.shotT = -1;
      p.plan = null;
      p.clock = 0;
    }
    const b = this.ball;
    b.holder = o;
    b.flight = null;
    b.vu = b.vv = b.vh = 0;
    this.lastTouch = o;
  }
  // where everyone is put at a check (the AI walks there; the game places a human there)
  spot(i) {
    return [this.players[i].tu, this.players[i].tv];
  }
  // ---------------- actions (a human's, or the AI's) ----------------
  // up into a jump shot: false if it isn't yours to shoot; 'clear' if you have to take it out past the arc first
  shootStart(i) {
    const p = this.players[i];
    if (this.state !== 'live' || this.ball.holder !== i || p.shotT >= 0) return false;
    if (!this.cleared) return 'clear';
    p.shotT = 0;
    this.events.push({ type: 'up', who: i });
    return true;
  }
  // the ball leaves the hands
  release(i) {
    const p = this.players[i],
      b = this.ball;
    if (p.shotT < 0 || b.holder !== i) return;
    const d = this.dist(p.u, p.v),
      q = p.ai ? clamp(p.q ?? 0.8, 0, 1) : releaseQ(p.shotT),
      def = this.players[1 - i],
      dd = Math.hypot(def.u - p.u, def.v - p.v),
      // between the shooter and the basket, and close
      front = (def.u - p.u) * (this.BU - p.u) + (def.v - p.v) * -p.v > 0,
      contest = front ? clamp((1.6 - dd) / 1.0, 0, 1) : 0;
    p.shotT = -1;
    b.holder = -1;
    b.u = p.u;
    b.v = p.v;
    b.h = 2.35;
    this.lastTouch = i;
    if (contest > 0.6 && this.rnd() < 0.16) {
      // blocked: it comes back out
      const a = Math.atan2(p.v, p.u - this.BU) + (this.rnd() - 0.5) * 1.4;
      b.vu = Math.cos(a) * 3;
      b.vv = Math.sin(a) * 3;
      b.vh = 1.5;
      b.flight = null;
      this.lastTouch = 1 - i;
      this.events.push({ type: 'block', who: 1 - i });
      return;
    }
    const good = this.rnd() < shotChance(d, q, contest),
      T = 0.7 + d * 0.06;
    // off the rim: aimed at a point on its edge
    let mu = 0,
      mv = 0;
    if (!good) {
      const a = Math.atan2(p.v, p.u - this.BU) + (this.rnd() - 0.5) * 2.4;
      mu = Math.cos(a) * 0.23;
      mv = Math.sin(a) * 0.23;
    }
    const tu = this.BU + mu,
      tv = mv,
      th = RIM_H + BALL_R * 0.5;
    b.vu = (tu - b.u) / T;
    b.vv = (tv - b.v) / T;
    b.vh = (th - b.h) / T + (G * T) / 2;
    b.flight = { t: 0, T, good, pts: d > ARC ? 2 : 1, who: i, mu, mv, q, d };
    this.events.push({ type: 'shot', who: i, d, q, pts: b.flight.pts });
  }
  // reach in for the ball
  steal(i) {
    const p = this.players[i],
      h = this.ball.holder,
      o = this.players[1 - i];
    if (this.state !== 'live' || h !== 1 - i || p.stealCd > 0 || o.shotT >= 0) return false;
    p.stealCd = 0.9;
    if (Math.hypot(o.u - p.u, o.v - p.v) > STEAL_R) return false;
    if (this.rnd() < (p.ai ? 0.4 : 0.35)) {
      this._gain(i, 'steal');
      return true;
    }
    this.events.push({ type: 'reach', who: i });
    return false;
  }
  _gain(i, why) {
    const b = this.ball;
    b.holder = i;
    b.flight = null;
    b.vu = b.vv = b.vh = 0;
    this.lastTouch = i;
    for (const p of this.players) p.plan = null;
    this.players[i].clock = 0;
    if (i !== this.o) {
      this.o = i;
      this.cleared = false;
      this.events.push({ type: why === 'steal' ? 'steal' : 'rebound', who: i, def: true });
    } else this.events.push({ type: why === 'steal' ? 'steal' : 'rebound', who: i, def: false });
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
    const b = this.ball;
    for (const [i, p] of this.players.entries()) {
      p.stealCd = Math.max(0, p.stealCd - dt);
      if (p.ai) this._ai(i, p, dt);
      if (p.shotT >= 0) {
        p.shotT += dt;
        if (p.ai ? p.shotT >= p.rel : p.shotT >= SHOT_MAX) this.release(i);
      }
    }
    if (this.state === 'check') {
      const ready = this.players.every((p) => !p.ai || Math.hypot(p.tu - p.u, p.tv - p.v) < 0.4);
      if (this.t > 1.2 && ready) {
        this.state = 'live';
        this.t = 0;
        this.events.push({ type: 'live', o: this.o });
      }
    }
    if (b.holder >= 0) {
      const p = this.players[b.holder];
      b.u = p.u;
      b.v = p.v;
      b.h = 1;
      if (this.o === b.holder && !this.cleared && this.dist(p.u, p.v) > ARC + 0.1)
        this.cleared = true;
      return;
    }
    this._ball(dt);
  }
  // the ball in the air or loose on the floor
  _ball(dt) {
    const b = this.ball,
      f = b.flight;
    b.vh -= G * dt;
    b.u += b.vu * dt;
    b.v += b.vv * dt;
    b.h += b.vh * dt;
    if (f) {
      f.t += dt;
      if (f.t < f.T) return;
      b.flight = null;
      b.u = this.BU + f.mu;
      b.v = f.mv;
      b.h = RIM_H + BALL_R * 0.5;
      if (f.good) {
        b.vu *= 0.05;
        b.vv *= 0.05;
        b.vh = -2.2;
        this.score[f.who] += f.pts;
        this.events.push({ type: 'score', who: f.who, pts: f.pts, d: f.d });
        this.state = 'dead';
        this.t = 0;
        this._scorer = f.who;
        return;
      }
      // off the iron
      const s = 1.4 + this.rnd() * 1.6,
        m = Math.hypot(f.mu, f.mv) || 1;
      b.vu = (f.mu / m) * s - b.vu * 0.2;
      b.vv = (f.mv / m) * s - b.vv * 0.2;
      b.vh = 1.4 + this.rnd() * 1.6;
      this.events.push({ type: 'rim', who: f.who });
      return;
    }
    if (b.h < BALL_R && b.vh < 0) {
      b.h = BALL_R;
      if (b.vh < -1.1) {
        b.vh *= -0.68;
        b.vu *= 0.82;
        b.vv *= 0.82;
        this.events.push({ type: 'bounce' });
      } else {
        b.vh = 0;
        const k = Math.max(0, 1 - dt * 1.5);
        b.vu *= k;
        b.vv *= k;
      }
    }
    if (this.state === 'dead') {
      if (this.t > 1.1) {
        if (this.score[this._scorer] >= this.target) {
          this.winner = this._scorer;
          this.state = 'over';
          this.events.push({ type: 'match', winner: this.winner });
        } else this._check(1 - this._scorer);
      }
      return;
    }
    // out of the half court: the other side's ball
    if (b.u < -0.5 || b.u > this.UL + 0.5 || Math.abs(b.v) > this.HW + 0.5) {
      this.events.push({ type: 'out', who: this.lastTouch });
      this._check(1 - this.lastTouch);
      return;
    }
    if (b.h > 1.9) return;
    let best = -1,
      bd = PICK;
    for (const [i, p] of this.players.entries()) {
      const d = Math.hypot(p.u - b.u, p.v - b.v);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (best >= 0) this._gain(best, 'rebound');
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
    p.u = clamp(p.u, -0.3, this.UL + 0.2);
    p.v = clamp(p.v, -this.HW - 0.2, this.HW + 0.2);
    p.moving = s / dt;
    return d;
  }
  _ai(i, p, dt) {
    const b = this.ball,
      o = this.players[1 - i],
      sp = p.ai.speed,
      sk = p.ai.skill;
    if (p.shotT >= 0) {
      p.moving = 0;
      return;
    }
    if (this.state === 'check' || this.state === 'dead' || this.state === 'over') {
      if (this.state === 'check') this._walk(p, p.tu, p.tv, sp, dt);
      else p.moving = 0;
      return;
    }
    // loose ball (or in the air): go get it
    if (b.holder < 0) {
      const f = b.flight;
      if (f) {
        // under the basket for the rebound, a step out from it
        const a = Math.atan2(p.v, p.u - this.BU);
        this._walk(p, this.BU + Math.cos(a) * 1.6, Math.sin(a) * 1.6, sp, dt);
      } else this._walk(p, b.u + b.vu * 0.3, b.v + b.vv * 0.3, sp, dt);
      return;
    }
    if (b.holder === i) {
      p.clock += dt;
      if (!this.cleared) {
        // take it back out past the arc
        const a = Math.atan2(p.v, p.u - this.BU),
          r = ARC + 0.8;
        this._walk(p, this.BU + Math.cos(a) * r, Math.sin(a) * r, sp * 0.85, dt);
        return;
      }
      const dd = Math.hypot(o.u - p.u, o.v - p.v);
      if (!p.plan) {
        const drive = this.rnd() < 0.4;
        let a = Math.PI + (this.rnd() - 0.5) * 2.2,
          r = 2.4 + this.rnd() * 5.4;
        if (drive) r = 0.9;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        p.plan = {
          drive,
          u: this.BU + Math.cos(a) * r,
          v: clamp(Math.sin(a) * r, -this.HW + 0.6, this.HW - 0.6),
        };
      }
      const d = this._walk(p, p.plan.u, p.plan.v, sp * 0.82, dt),
        db = this.dist(p.u, p.v);
      let go = false;
      if (p.plan.drive) go = db < 1.5 || d < 0.3;
      else if (d < 0.3) {
        if (dd < 1.0 && this.rnd() < 0.5) p.plan = { drive: true, u: this.BU - 0.9, v: 0 };
        else go = true;
      }
      if (p.clock > 8) go = true; // don't hold it forever
      if (go) {
        // a better player times it better
        const e = (1 - sk) * 0.6 * (this.rnd() + this.rnd() - 1);
        p.rel = REL_BEST + e * REL_WIN;
        p.q = releaseQ(p.rel);
        this.shootStart(i);
      }
      return;
    }
    // defence: between the man with the ball and the basket
    const du = this.BU - o.u,
      dv = -o.v,
      dl = Math.hypot(du, dv) || 1,
      gap = o.shotT >= 0 ? 0.6 : 1.2;
    this._walk(p, o.u + (du / dl) * gap, o.v + (dv / dl) * gap, sp, dt);
    if (o.shotT < 0 && this.rnd() < dt * 0.3 * sk) this.steal(i);
  }
}
