// 網球對打的規則、球的物理與電腦球員（純邏輯，不碰 three.js 與畫面）：
//   src/systems/minigames/tennis/TennisCourts.js 拿來畫 NPC 對打和玩家對打，tests/unit/tennis.test.js 測。
//   之後做多人連線時，房主跑這份（權威），客端只送自己的位置和揮拍。
// 座標是單一球場的局部座標：u 沿球場（南 +，網在 u = 0），v 橫過球場（東 +），h 是球心離地高度。
// 兩邊：players[0] 在北半場（side -1，面向 +u），players[1] 在南半場（side +1）。單打邊線、標準計分（0／15／30／40、
// Deuce、Ad），先拿到 gamesToWin 局的贏（不打搶七）。發球兩次機會；發球要落在對角發球區；接發球一定要等球落地。
import { HL, SW, SV, NP } from '../../../world/Tennis.js';

export const G = 9.8,
  BALL_R = 0.033,
  REACH = 1.45, // how far from a player's centre the racket gets to a ball (m)
  BACK = 4.2, // how far behind the baseline anyone goes (the fences are about 4.6 m back)
  WIDE = 7, // and how far out to the side (half way to the next court)
  SWING = 0.5, // a swing's length (s)
  CONTACT = [0.1, 0.32]; // the part of a swing that can hit the ball (s from its start)
// height of the net's top at v (0.914 m in the middle, 1.07 m at the posts)
export const netH = (v) => 0.914 + (1.07 - 0.914) * Math.min(1, (v / NP) ** 2);
const NAMES = ['0', '15', '30', '40'];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// the velocity that takes the ball from p to land at (tu, tv) with horizontal speed s, over the net with room to
// spare; slower (a higher arc) until it clears
export function solveShot(p, tu, tv, s, clear = 0.2) {
  const du = tu - p.u,
    dv = tv - p.v,
    d = Math.hypot(du, dv) || 0.01;
  let out = null;
  for (let sp = s; sp >= 5; sp -= 0.5) {
    const T = d / sp,
      vu = du / T,
      vv = dv / T,
      vh = (BALL_R - p.h + 0.5 * G * T * T) / T;
    out = { u: vu, h: vh, v: vv };
    if (p.u < 0 === tu < 0 || !vu) return out;
    const tn = -p.u / vu;
    if (tn <= 0 || tn >= T) return out;
    if (p.h + vh * tn - 0.5 * G * tn * tn >= netH(p.v + vv * tn) + clear) return out;
  }
  return out;
}

// one step of the ball: returns 'bounce' | 'net' | null
export function stepBall(b, dt) {
  const u0 = b.u;
  b.vh -= G * dt;
  b.u += b.vu * dt;
  b.h += b.vh * dt;
  b.v += b.vv * dt;
  // through the net's plane below the tape: it stops dead and drops on the side it came from
  if (u0 !== 0 && u0 < 0 !== b.u < 0 && Math.abs(b.v) < NP && b.h < netH(b.v)) {
    b.u = Math.sign(u0) * 0.06;
    b.vu *= -0.12;
    b.vv *= 0.3;
    b.vh = Math.min(b.vh, 0);
    return 'net';
  }
  if (b.h < BALL_R && b.vh < 0) {
    b.h = BALL_R;
    if (b.vh < -0.8) {
      b.vh *= -0.74;
      b.vu *= 0.84;
      b.vv *= 0.84;
      return 'bounce';
    }
    b.vh = 0;
    const k = Math.max(0, 1 - dt * 1.5);
    b.vu *= k;
    b.vv *= k;
  }
  return null;
}

// p: { side, ai: { skill 0..1, speed m/s } | null, name }
// pace: how fast every shot leaves the racket (1 = real; your own matches play slower, so there is time to get there)
export class Rally {
  constructor({ players, gamesToWin = 3, rnd = Math.random, server = 0, pace = 1 }) {
    this.rnd = rnd;
    this.pace = pace;
    this.gamesToWin = gamesToWin;
    this.players = players.map((p, i) => ({
      side: i ? 1 : -1,
      u: (i ? 1 : -1) * (HL + 0.5),
      v: 0,
      tu: 0,
      tv: 0,
      swingT: -1,
      kind: 'fore',
      prep: null,
      wait: 0,
      ...p,
    }));
    this.ball = { u: 0, h: 1, v: 0, vu: 0, vh: 0, vv: 0, live: false, held: true };
    this.pts = [0, 0];
    this.games = [0, 0];
    this.server = server;
    this.serveNo = 1;
    this.events = [];
    this.state = 'serve';
    this.t = 0;
    this.winner = -1;
    this._place();
  }
  get receiver() {
    return 1 - this.server;
  }
  // deuce court (the server's right) on an even number of points played in the game
  get serveV() {
    const s = this.players[this.server].side,
      deuce = (this.pts[0] + this.pts[1]) % 2 === 0;
    return s * (deuce ? 1 : -1) * 1.2;
  }
  // where everyone stands for the next serve (the AI walks there, the game puts a human there)
  _place() {
    const sv = this.serveV;
    for (const [i, p] of this.players.entries()) {
      const srv = i === this.server;
      p.tu = p.side * (HL + (srv ? 0.3 : 0.8));
      p.tv = srv ? sv : -Math.sign(sv) * 2.6;
      p.swingT = -1;
      p.prep = null;
    }
    const s = this.players[this.server];
    Object.assign(this.ball, { live: false, held: true, vu: 0, vh: 0, vv: 0 });
    this.ball.u = s.tu;
    this.ball.v = s.tv;
    this.ball.h = 1;
    this.state = 'serve';
    this.t = 0;
  }
  score() {
    const [a, b] = this.pts;
    if (a >= 3 && b >= 3)
      return a === b ? 'Deuce' : `Ad ${this.players[a > b ? 0 : 1].name || ''}`.trim();
    return `${NAMES[a]} - ${NAMES[b]}`;
  }
  // a human presses swing (the AI swings on its own); lag: how long ago it really was (a friend's swing over the network)
  swing(i, lag = 0) {
    const p = this.players[i];
    if (this.state === 'serve' && i === this.server) {
      if (this.t > 0.4) this._serve(i);
      return;
    }
    if (p.swingT < 0 || p.swingT > SWING) {
      p.swingT = lag;
      const b = this.ball;
      p.kind = (b.v - p.v) * p.side >= 0 ? 'fore' : 'back';
    }
  }
  _serve(i) {
    const p = this.players[i],
      r = this.rnd,
      b = this.ball,
      first = this.serveNo === 1,
      skill = p.ai ? p.ai.skill : 0.75;
    p.swingT = 0.1;
    p.kind = 'serve';
    b.u = p.u + p.side * 0.2;
    b.v = p.v;
    b.h = 2.55;
    let tu = -p.side * (SV - 0.6 - r() * 2.2),
      tv = -Math.sign(this.serveV) * (0.5 + r() * (SW - 1.1));
    const miss = first ? 0.18 * (1.25 - skill) : 0.05 * (1.2 - skill);
    if (r() < miss) {
      // a fault: long, wide or into the net
      const k = r();
      if (k < 0.4) tu = -p.side * (SV + 0.4 + r() * 1.2);
      else if (k < 0.75) tv = Math.sign(tv) * (SW + 0.3 + r() * 0.8);
      else tu = -p.side * 1.2;
    }
    const v = solveShot(b, tu, tv, (first ? 17 + skill * 7 : 12 + skill * 3) * this.pace, 0.12);
    Object.assign(b, { vu: v.u, vh: v.h, vv: v.v, live: true, held: false });
    b.serve = true;
    b.box = Math.sign(tv); // the diagonal service box (before any fault pushed the aim out)
    b.lastHit = i;
    b.bounces = 0;
    b.n = (b.n || 0) + 1;
    this.state = 'play';
    this.t = 0;
    this.events.push({ type: 'hit', i, serve: true });
  }
  // a player hits the ball back; q 0..1 how cleanly, aim -1..1 (a human's left / right, null: the AI picks)
  _hit(i, q, aim) {
    const p = this.players[i],
      b = this.ball,
      r = this.rnd,
      skill = p.ai ? p.ai.skill : 0.55 + q * 0.4;
    const err = (1 - skill) * 2.2 + (1 - q) * 1.6;
    let tv = aim == null ? (r() * 2 - 1) * SW * 0.8 : aim * SW * 0.85;
    tv += (r() + r() - 1) * err;
    let tu = -p.side * (HL - 1.2 - r() * 4.5 + (r() + r() - 1) * err * 0.7);
    if (Math.abs(tu) < 1.5) tu = -p.side * 1.5;
    let clear = 0.15 + (1 - q) * 0.25;
    // an unforced error now and then: long, wide or into the net (more often for weaker players and bad contact)
    if (r() < 0.05 + (1 - skill) * 0.14 + (1 - q) * 0.1) {
      const k = r();
      if (k < 0.4) tu = -p.side * (HL + 0.4 + r() * 1.8);
      else if (k < 0.75) tv = (tv < 0 ? -1 : 1) * (SW + 0.3 + r() * 1.4);
      else clear = null;
    }
    tv = clamp(tv, -SW - 2.5, SW + 2.5);
    const sp = (p.ai ? 13 + skill * 7 : 12 + q * 10) * (0.9 + r() * 0.2) * this.pace;
    const v = solveShot(b, tu, tv, sp, clear ?? 0.15);
    if (clear === null && v.u) {
      // into the net: the same line, but only half a metre up when it gets there
      const tn = Math.abs(b.u / v.u);
      v.h = (0.5 - b.h + 0.5 * G * tn * tn) / tn;
    }
    Object.assign(b, { vu: v.u, vh: v.h, vv: v.v });
    b.lastHit = i;
    b.bounces = 0;
    b.n = (b.n || 0) + 1;
    b.serve = false;
    p.prep = null;
    this.events.push({ type: 'hit', i, q });
    for (const o of this.players) if (o !== p) o.wait = o.ai ? 0.15 + (1 - o.ai.skill) * 0.25 : 0;
  }
  _lose(i) {
    const w = 1 - i;
    this.pts[w]++;
    this.ball.live = false;
    this.state = 'dead';
    this.t = 0;
    const [a, b] = [this.pts[w], this.pts[i]];
    this.events.push({ type: 'point', winner: w });
    if (a >= 4 && a - b >= 2) {
      this.games[w]++;
      this.pts = [0, 0];
      this.server = 1 - this.server;
      this.serveNo = 1;
      this.events.push({ type: 'game', winner: w });
      if (this.games[w] >= this.gamesToWin) {
        this.winner = w;
        this.events.push({ type: 'match', winner: w });
      }
    } else this.serveNo = 1;
  }
  _fault() {
    this.events.push({ type: 'fault', second: this.serveNo === 2 });
    if (this.serveNo === 2) this._lose(this.server);
    else {
      this.serveNo = 2;
      this.ball.live = false;
      this.state = 'dead';
      this.t = 0.6; // a shorter wait before the second serve
    }
  }
  _bounce() {
    const b = this.ball,
      side = b.u < 0 ? 0 : 1;
    if (b.bounces === 0) {
      if (side === b.lastHit) return b.serve ? this._fault() : this._lose(b.lastHit);
      const inn = b.serve
        ? Math.abs(b.u) <= SV + BALL_R && Math.abs(b.v) <= SW + BALL_R && Math.sign(b.v) === b.box
        : Math.abs(b.u) <= HL + BALL_R && Math.abs(b.v) <= SW + BALL_R;
      this.events.push({ type: 'bounce', inn, u: b.u, v: b.v });
      if (!inn) return b.serve ? this._fault() : this._lose(b.lastHit);
      b.bounces = 1;
      return;
    }
    this.events.push({ type: 'bounce', inn: true, u: b.u, v: b.v });
    this._lose(side);
  }
  // can player i reach the ball now
  reach(i) {
    const p = this.players[i],
      b = this.ball;
    if (!b.live || b.lastHit === i || (b.u < 0 ? -1 : 1) !== p.side) return false;
    if (b.serve && b.bounces === 0) return false;
    return Math.hypot(b.u - p.u, b.v - p.v) < REACH && b.h > 0.12 && b.h < 2.6;
  }
  // where the ball will be good to hit on player i's side: the first point after it bounces there that is between
  // knee and shoulder height, or where it gets as far back as anyone goes
  predict(i) {
    const p = this.players[i],
      b = { ...this.ball };
    let bounced = b.bounces || 0;
    for (let k = 0; k < 200; k++) {
      const e = stepBall(b, 1 / 60);
      if (e === 'net') return null;
      if (e === 'bounce') {
        if ((b.u < 0 ? -1 : 1) !== p.side) return null;
        if (++bounced > 1) return null;
      }
      if (bounced && b.h < 1.6 && b.h > 0.35 && (b.vh < 0 || b.h > 0.6))
        return { u: b.u, v: b.v, t: k / 60 };
      if (bounced && Math.abs(b.u) > HL + BACK - 0.5) return { u: b.u, v: b.v, t: k / 60 };
    }
    return null;
  }
  // advance dt; humans' u, v are set from outside before each step
  step(dt) {
    this.t += dt;
    const b = this.ball;
    for (const p of this.players) if (p.swingT >= 0) p.swingT += dt;
    // the AI walks to where it wants to be
    for (const [i, p] of this.players.entries()) {
      if (!p.ai) continue;
      p.wait -= dt;
      if (this.state === 'play' && b.live && b.lastHit !== i && p.wait <= 0) {
        const at = this.predict(i);
        if (at) {
          // stand a little behind and to the racket side of the ball
          p.tu = at.u + p.side * 0.45;
          p.tv = at.v - p.side * 0.55 * (p.kind === 'back' ? -1 : 1);
          p.tu = p.side * clamp(p.tu * p.side, 0.8, HL + BACK);
          p.tv = clamp(p.tv, -WIDE, WIDE);
          if (at.t < 0.7) p.prep = (b.v - p.v) * p.side >= 0 ? 'fore' : 'back';
        }
      } else if (this.state === 'play' && b.lastHit === i) {
        p.tu = p.side * (HL + 0.6);
        p.tv = clamp(b.v * 0.3, -2, 2);
      }
      const du = p.tu - p.u,
        dv = p.tv - p.v,
        d = Math.hypot(du, dv),
        s = Math.min(d, p.ai.speed * dt);
      if (d > 0.02) {
        p.u += (du / d) * s;
        p.v += (dv / d) * s;
      }
      p.moving = d > 0.05 ? Math.min(p.ai.speed, d * 4) : 0;
    }
    if (this.state === 'serve') {
      const s = this.players[this.server];
      b.u = s.u + s.side * 0.2;
      b.v = s.v - s.side * 0.25;
      b.h = 1;
      if (s.ai && this.t > 1.2 + this.rnd() * 0.6 && Math.hypot(s.u - s.tu, s.v - s.tv) < 0.2)
        this._serve(this.server);
      return;
    }
    if (this.state === 'dead') {
      // the ball rolls on; the next point in a moment
      const e = stepBall(b, dt);
      if (e) this.events.push({ type: e === 'net' ? 'net' : 'bounce', dead: true, u: b.u, v: b.v });
      if (this.t > 2.2) {
        if (this.winner >= 0) this.state = 'over';
        else this._place();
      }
      return;
    }
    if (this.state !== 'play') return;
    const e = stepBall(b, dt);
    if (e === 'net') this.events.push({ type: 'net', u: b.u, v: b.v });
    else if (e === 'bounce') this._bounce();
    if (this.state !== 'play') return;
    // a ball that has rolled away, or come to rest (too low to bounce again): it lands where it is
    if (Math.abs(b.u) > HL + 20 || Math.abs(b.v) > 20) return this._lose(b.lastHit);
    if (b.h <= BALL_R + 1e-6 && Math.hypot(b.vu, b.vv) < 1.5 && b.vh <= 0) {
      this._bounce();
      if (this.state === 'play') this._bounce();
      return;
    }
    for (const [i, p] of this.players.entries()) {
      if (!this.reach(i)) continue;
      if (p.ai) {
        if (p.missed === b.n) continue;
        const good = b.bounces
          ? b.h < 1.6 && (b.vh < 0 || b.h > 0.6 || Math.abs(b.u - p.u) < 0.4)
          : Math.abs(b.u) < 6 && b.h < 1.9;
        if (good || b.h < 0.3) {
          p.kind = (b.v - p.v) * p.side >= 0 ? 'fore' : 'back';
          p.swingT = CONTACT[0] + 0.08;
          // now and then it just misses
          if (this.rnd() < 0.08 * (1 - p.ai.skill)) {
            p.missed = b.n;
            continue;
          }
          this._hit(i, 0.55 + p.ai.skill * 0.45, null);
          return;
        }
      } else if (p.swingT >= CONTACT[0] && p.swingT <= CONTACT[1]) {
        const d = Math.hypot(b.u - p.u, b.v - p.v),
          q = clamp(1 - Math.abs(d - 0.75) / 0.9, 0, 1) * (b.h > 1.9 ? 0.8 : 1);
        this._hit(i, q, p.aim ?? 0);
        return;
      }
    }
  }
  take() {
    const e = this.events;
    this.events = [];
    return e;
  }
}
