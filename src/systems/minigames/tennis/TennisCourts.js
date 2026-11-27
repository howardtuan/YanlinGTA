// 網球場上的人（場地在 src/world/Tennis.js，規則與球在 ./Rules.js）：
//  - 06:00～23:00（晚上開燈），北塊東邊那面和南塊東邊那面一直有學生在打，南塊西邊那面單數天的下午也有人打；
//  - 走進任何一面空著的球場（沒有學生在打的那面）按 E 就能打球，像 277 寢揪麻將那樣：找同學來打，就有一個同學
//    從那一塊的球場大門走進來、站到對面底線，人到了才開打（等不及再按 E 叫他直接上場）；先拿 3 局的贏，不打搶七。
//    同一個選單也能開房間、輸入房號和朋友線上對打（P2P，./Net.js）。
//    玩家照平常的方式跑位（WASD／搖桿，鏡頭方向為準），按滑鼠左鍵（或 J、手把 X）揮拍：球在身邊、揮拍時機對就打回去，
//    打得越乾淨球越快越準；揮拍時按著左右決定打向對方場地的哪一邊。輪到你發球時按左鍵發球。Esc 或走出球場就結束。
// 這個檔和 ./Rules.js 是獨立的包：src/core/Game.js 在玩家走近網球場時才 import()（同 issue #389 的拆包做法），
// 不進首屏主包。
import * as THREE from 'three';
import { createCharacter, randomStudent } from '../../../entities/Character.js';
import { reachArm } from '../../../entities/Armik.js';
import { surfaceAt } from '../../../world/Terrain.js';
import { makeLabel } from '../../../world/MapBuilder.js';
import { TENNIS, tennisP, O, D, HL, HW } from '../../../world/Tennis.js';
import { Rally, SWING, stepBall } from './Rules.js';
import { hostTennis, joinTennis, applySnapshot, normCode } from './Net.js';
import { makeOutfitFigure } from '../../Outfits.js';

const OPEN = [6 * 60, 23 * 60]; // minutes of the day people play
const FAR = 110; // past this (m from the courts' middle) nothing is simulated or drawn
const MID = tennisP(18, 7);
// court i's local (u, v) <-> world
const toW = (i, u, v) => tennisP(TENNIS[i][0] + u, TENNIS[i][1] + v);
function toL(i, x, z) {
  const dx = x - O[0],
    dz = z - O[1];
  return [dx * D[0] + dz * D[1] - TENNIS[i][0], dx * D[1] - dz * D[0] - TENNIS[i][1]];
}
// heading (three rotation.y, +z forward) of a direction along the court: s = +1 → +u
const faceU = (s) => Math.atan2(D[0] * s, D[1] * s);
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const sm = (k) => k * k * (3 - 2 * k);

// how a student called to court i walks in, in the courts' (u, v) frame (src/world/Tennis.js): from outside the block,
// through its gate, along the gap between the nets, to the far (south) baseline. North block: the gate east of the
// hut; south block: the gate in the south fence between its two courts.
const GAP_N = (TENNIS[0][1] + TENNIS[1][1]) / 2; // between the two north courts' net posts
export function approachPath(i) {
  const [cu, cv] = TENNIS[i],
    end = [cu + HL + 0.8, cv];
  if (i < 2)
    return [[-34, 16.1], [-16.6, 16.1], [-14, 16.1], [-14, GAP_N], [cu + HL + 0.8, GAP_N], end];
  return [[66, -14.8], [52.4, -14.8], [50.2, -14.8], end];
}
const WALK = 2.6; // m/s, a brisk walk
// your own matches: shots leave the racket at this share of real speed (higher, slower arcs), and every ball is
// drawn bigger than a real one (BALL_R 3.3 cm) so you can follow it -- the line calls still use the real size
const PACE = 0.72,
  BALL_VIS = 0.075;
// who comes (a name to fit the look)
const BOYS = ['柏翰', '冠宇', '阿哲', '家豪', '彥廷'],
  GIRLS = ['佳穎', '怡君', '詩涵', '雅婷', '宜蓁'];

// the right hand's path through a swing, in the player's own frame (x + = his left, y up, z forward), and how far
// the shoulders turn (+ = to the left): [t, x, y, z, twist]
const POSES = {
  fore: [
    [0, -0.55, 1.05, -0.25, -0.6],
    [0.2, -0.45, 1.0, 0.45, 0.1],
    [0.5, 0.2, 1.4, 0.25, 0.6],
  ],
  back: [
    [0, 0.3, 1.05, -0.2, 0.7],
    [0.2, 0.05, 1.0, 0.5, 0],
    [0.5, -0.5, 1.4, 0.2, -0.5],
  ],
  serve: [
    [0, -0.3, 1.9, -0.25, -0.2],
    [0.18, -0.15, 2.15, 0.3, 0.1],
    [0.5, 0.25, 0.95, 0.35, 0.4],
  ],
};
const READY = [-0.22, 1.0, 0.38],
  READY_L = [0.05, 1.02, 0.38],
  CARRY = [-0.3, 0.86, 0.06];
const POLE_R = [-1, -0.4, -0.2],
  POLE_L = [1, -0.4, -0.2];
function poseAt(kind, t) {
  const K = POSES[kind];
  let i = 0;
  while (i + 2 < K.length && t > K[i + 1][0]) i++;
  const a = K[i],
    b = K[i + 1],
    k = sm(Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))));
  return a.map((x, n) => x + (b[n] - x) * k);
}

// a racket: grip in the hand, the head carrying on past it along the forearm
function makeRacket(mats) {
  const g = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 8), mats.grip);
  grip.position.y = -0.05;
  g.add(grip);
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), mats.frame);
  throat.position.y = -0.26;
  g.add(throat);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.011, 6, 24), mats.frame);
  frame.scale.set(0.82, 1.15, 1);
  frame.position.y = -0.49;
  g.add(frame);
  const str = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), mats.strings);
  str.scale.set(0.8, 1.13, 1);
  str.position.y = -0.49;
  g.add(str);
  g.rotation.x = -0.35;
  return g;
}

const PT = ['0', '15', '30', '40'];
// the score as you see it (yours first)
function scoreFor(r, me, other) {
  const a = r.pts[me],
    b = r.pts[1 - me];
  if (a >= 3 && b >= 3) return a === b ? 'Deuce' : a > b ? 'Ad 你' : `Ad ${other}`;
  return `${PT[Math.min(a, 3)]} - ${PT[Math.min(b, 3)]}`;
}
// the name you go by online (the same one as at the 277 mahjong table)
function tennisNick() {
  try {
    return (localStorage.getItem('yanlinGTA.mjNick') || '彥霖').slice(0, 12);
  } catch (_e) {
    return '彥霖';
  }
}
// into the right hand (the hero's jointed hand, or the end of the forearm for everyone else)
function holdRacket(ch, rk) {
  const a = ch.arms[0];
  rk.position.y = a.hand ? 0 : -0.27;
  (a.hand || a.el).add(rk);
}

export class TennisCourts {
  constructor(g) {
    this.g = g;
    this.playing = false;
    this.mats = {
      grip: new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.8 }),
      frame: new THREE.MeshStandardMaterial({ color: '#c8322b', roughness: 0.4, metalness: 0.3 }),
      strings: new THREE.MeshStandardMaterial({
        color: '#f1f1e8',
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      ball: new THREE.MeshStandardMaterial({ color: '#d9f03c', roughness: 0.7 }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#000',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    };
    this.ballGeo = new THREE.SphereGeometry(BALL_VIS, 12, 8);
    this.shadowGeo = new THREE.CircleGeometry(BALL_VIS * 1.3, 12).rotateX(-Math.PI / 2);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    // the people: two each on courts 1-3 (court 0 is always free for you)
    const person = (look, name) => {
      const ch = createCharacter(look);
      ch.root.visible = false;
      g.scene.add(ch.root);
      holdRacket(ch, makeRacket(this.mats));
      return { ch, name, heading: 0 };
    };
    this._person = person;
    this.opp = null; // the student who comes to play you: { ch, name, heading, path, k, i, leaving }
    this.courts = [1, 2, 3].map((i) => ({
      i,
      people: [person(randomStudent(rnd), '同學'), person(randomStudent(rnd), '同學')],
      rally: null,
      ball: this._ballMesh(),
      rest: 0,
    }));
    this.mine = { i: 0, ball: this._ballMesh(), rally: null, people: null };
    this.ci = 0; // the court you play on
    this.racket = makeRacket(this.mats); // yours, while you play
    this.hudEl = null;
    this.rnd = rnd;
    // E anywhere on a court nobody is playing on (the court and a bit around it, not reaching the next one)
    for (let i = 0; i < 4; i++) {
      const U = HL + 5,
        V = HW + 1.9;
      const [cx, cz] = toW(i, 0, 0);
      g.interiors.actions.push({
        y: 0,
        poly: [toW(i, -U, -V), toW(i, -U, V), toW(i, U, V), toW(i, U, -V)],
        aimY: surfaceAt(cx, cz) + 1,
        glow: 0.01,
        label: () =>
          this.opp && !this.opp.leaving
            ? `${this.opp.name}正在走過來…按 <kbd>E</kbd> 請對方直接上場`
            : '按 <kbd>E</kbd> 打網球（找同學來打一盤，或和朋友線上對打）',
        cond: () =>
          !this.playing &&
          !g.player.vehicle &&
          (this.opp && !this.opp.leaving ? this.opp.i === i : this.free(i)),
        fn: () => (this.opp && !this.opp.leaving ? this._arrive() : this.menu(i)),
      });
    }
  }
  // nobody is playing on court i (the students' courts are taken while they play)
  free(i) {
    const c = this.courts.find((c) => c.i === i);
    return !c || !this._on(c);
  }
  _ballMesh() {
    const m = new THREE.Mesh(this.ballGeo, this.mats.ball),
      s = new THREE.Mesh(this.shadowGeo, this.mats.shadow);
    m.castShadow = true;
    m.visible = s.visible = false;
    this.g.scene.add(m, s);
    return { m, s };
  }
  open() {
    const m = ((this.g.clock % 1440) + 1440) % 1440;
    return m >= OPEN[0] && m < OPEN[1];
  }
  // a court where the students play today (court 2, the south block's west one, only on odd days after 14:00)
  _on(c) {
    if (!this.open()) return false;
    if ((this.playing || this.opp) && this.ci === c.i) return false; // you took it first
    if (c.i !== 2) return true;
    const day = Math.floor(this.g.clock / 1440),
      m = this.g.clock - day * 1440;
    return day % 2 === 1 && m >= 14 * 60;
  }
  _newRally(c) {
    const r = Math.random;
    c.rally = new Rally({
      players: c.people.map((p) => ({
        name: p.name,
        ai: { skill: 0.45 + r() * 0.4, speed: 4.4 + r() * 1.4 },
      })),
      gamesToWin: 6,
      server: r() < 0.5 ? 0 : 1,
    });
  }
  // ---------------- your match ----------------
  // E on court i: call a student over, or a match with a friend online (P2P, ./Net.js)
  menu(i = 0) {
    const g = this.g;
    this.ci = i;
    document.exitPointerLock?.();
    g.modal(
      '🎾 網球場',
      `<div class="modal-btns">
        <button class="menu-btn" id="tnKai"><span>找同學來打一盤</span><small>同學走過來就開打・先拿 3 局</small></button>
        <button class="menu-btn" id="tnHost"><span>開房間，和朋友線上對打</span><small>產生 4 碼房號・P2P</small></button>
      </div>
      <div style="display:flex;gap:8px;margin:10px 0 4px;align-items:center">
        <input id="tnCode" maxlength="4" placeholder="朋友的房號" autocomplete="off"
          style="flex:1;font:600 18px/1.2 system-ui;letter-spacing:4px;text-transform:uppercase;padding:8px 10px;border-radius:8px;border:1px solid #888">
        <button class="menu-btn" id="tnJoin" style="flex:0 0 auto"><span>加入</span></button>
      </div>
      <div id="tnMsg" style="min-height:1.4em;font-size:14px;opacity:.85">線上對打：兩個人各自走進一面空的球場按 E，一個開房、一個輸入房號。</div>
      <div class="modal-btns"><button class="menu-btn" id="tnBye"><span>算了</span><small>ESC</small></button></div>`,
      'TENNIS'
    );
    const $ = (id) => document.getElementById(id),
      msg = (t) => ($('tnMsg').textContent = t);
    const close = () => {
      g.closeModal();
      g.resume?.();
    };
    $('tnBye').onclick = () => {
      this.net?.close();
      this.net = null;
      close();
    };
    $('tnKai').onclick = () => {
      close();
      this._call(i);
    };
    if (!this.open()) {
      $('tnKai').disabled = true;
      $('tnKai').querySelector('small').textContent = '06:00～23:00 才有同學來打球';
    }
    const who = { name: tennisNick(), look: g.player.look || null };
    $('tnHost').onclick = async () => {
      msg('開房中…');
      try {
        this.net = await hostTennis({
          ...who,
          on: {
            join: (peer, h) => {
              close();
              this._begin('host', h);
            },
            input: (m) => (this._fin = m),
            swing: (lag) => this._swq.push(lag),
            leave: (why) => this.quit(why),
          },
        });
        msg(`房號 ${this.net.code}　等朋友加入…（朋友走進一面空的球場按 E，輸入房號）`);
        $('tnKai').disabled = $('tnHost').disabled = $('tnJoin').disabled = true;
      } catch (e) {
        msg(`開房失敗：${e?.message || '請稍後再試'}`);
      }
    };
    $('tnJoin').onclick = async () => {
      const code = normCode($('tnCode').value);
      if (code.length < 4) return msg('請輸入 4 碼房號');
      msg(`連線到 ${code}…`);
      try {
        this.net = await joinTennis({
          ...who,
          code,
          on: {
            start: (h) => {
              close();
              this._begin('guest', h);
            },
            state: (s, ev) => {
              const r = this.mine.rally;
              if (!r || this.mode !== 'guest') return;
              applySnapshot(r, s, 1);
              this._evq.push(...ev);
            },
            leave: (why) => (this.playing ? this.quit(why) : msg(why)),
          },
        });
      } catch (e) {
        msg(`加入失敗：${e?.message || '請確認房號'}`);
      }
    };
    $('tnCode').addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') $('tnJoin').click();
    });
  }
  start(i = 0) {
    this.ci = i;
    this._begin('ai');
  }
  // ---------------- a student comes over ----------------
  _call(i) {
    const g = this.g;
    this._dropOpp();
    const look = randomStudent(this.rnd),
      names = look.female ? GIRLS : BOYS,
      name = names[Math.floor(this.rnd() * names.length)];
    const p = this._person(look, name);
    const tag = makeLabel(`🎾 ${name}`, { height: 0.26, size: 40 });
    tag.position.y = 2.15;
    p.ch.root.add(tag);
    p.ch.root.visible = true;
    this.ci = i;
    this.opp = { ...p, i, path: approachPath(i), k: 0, leaving: false };
    const [u, v] = this.opp.path[0];
    this.opp.pos = [u, v];
    g.hud.toast(`找了${name}來打球，等對方走過來（按 E 可以請對方直接上場）`, 'good', 3000);
  }
  // walks the student along his path; true when he got to its end
  _walkOpp(dt) {
    const o = this.opp,
      path = o.path;
    let step = WALK * dt,
      moving = false;
    while (step > 0 && o.k + 1 < path.length) {
      const [tu, tv] = path[o.k + 1],
        du = tu - o.pos[0],
        dv = tv - o.pos[1],
        d = Math.hypot(du, dv);
      if (d <= step) {
        o.pos = [tu, tv];
        o.k++;
        step -= d;
        continue;
      }
      o.pos = [o.pos[0] + (du / d) * step, o.pos[1] + (dv / d) * step];
      moving = true;
      const [x0, z0] = tennisP(...o.pos),
        [x1, z1] = tennisP(tu, tv);
      o.heading += angDiff(Math.atan2(x1 - x0, z1 - z0), o.heading) * Math.min(1, dt * 8);
      step = 0;
    }
    const [x, z] = tennisP(...o.pos),
      ch = o.ch;
    ch.root.visible = true;
    ch.root.position.set(x, surfaceAt(x, z), z);
    if (!moving) o.heading += angDiff(faceU(-1), o.heading) * Math.min(1, dt * 6);
    ch.root.rotation.y = o.heading;
    this._detail(ch, x, z);
    ch.update(dt, { speed: moving ? WALK : 0, mode: 'foot' });
    this._arms(ch, null, 0, false);
    return o.k + 1 >= path.length;
  }
  // the student is on the baseline (or you said to hurry up): play
  _arrive() {
    const o = this.opp;
    if (!o) return;
    if (!this.open()) {
      this.g.hud.toast(`${o.name}說太晚了，下次再打`, 'bad', 2000);
      return this._sendOff();
    }
    this._begin('ai');
  }
  // done: he walks back out the way he came, then goes away
  _sendOff() {
    const o = this.opp;
    if (!o) return;
    o.pos = toL(0, o.ch.root.position.x, o.ch.root.position.z); // court 0 sits at (0, 0): the courts' own frame
    o.path = [o.pos, ...approachPath(o.i).slice(1, -1).reverse(), approachPath(o.i)[0]];
    o.k = 0;
    o.leaving = true;
  }
  _dropOpp() {
    if (!this.opp) return;
    this.g.scene.remove(this.opp.ch.root);
    this.opp.ch.dispose?.(); // a new student each time: free his merged meshes
    this.opp = null;
  }
  // mode 'ai': you (north) vs 阿凱; 'host': you run the rules, your friend is player 1 (south);
  // 'guest': a copy of the host's match, you are player 1
  _begin(mode, o = {}) {
    const g = this.g;
    this.playing = true;
    this.mode = mode;
    this.me = mode === 'guest' ? 1 : 0;
    if (mode !== 'ai') this._dropOpp(); // online: your friend has the other end
    const other = mode === 'ai' ? this.opp?.name || '同學' : String(o.name || '朋友').slice(0, 12);
    this.otherName = other;
    const names = this.me ? [other, '你'] : ['你', other];
    this.mine.rally = new Rally({
      players: names.map((name, i) => ({
        name,
        ai: mode === 'ai' && i === 1 ? { skill: 0.55, speed: 5 } : null,
      })),
      gamesToWin: 3,
      server: mode === 'ai' ? 1 : 0,
      pace: PACE,
    });
    if (mode === 'ai') this.mine.people = [null, this.opp];
    else {
      const f = makeOutfitFigure(o.look);
      g.scene.add(f.root);
      holdRacket(f, makeRacket(this.mats));
      this.friend = { ch: f, name: other, heading: 0 };
      const tag = makeLabel(`🎾 ${other}`, { height: 0.26, size: 40 });
      tag.position.y = 2.15;
      f.root.add(tag);
      this.mine.people = this.me ? [this.friend, null] : [null, this.friend];
    }
    this._lastState = null;
    this._sendT = 0;
    this._fin = null;
    this._swq = [];
    this._evq = [];
    this._evBuf = [];
    holdRacket(g.player.ch, this.racket);
    this._hud(true);
    g.hud.bigToast(`網球：你 vs ${other}`, '左鍵揮拍・揮拍時按左右決定方向・Esc 離開', 3200);
  }
  quit(msg) {
    if (!this.playing) return;
    const g = this.g;
    this.playing = false;
    this.net?.close();
    this.net = null;
    if (this.friend) {
      g.scene.remove(this.friend.ch.root);
      this.friend = null;
    }
    this.mode = null;
    this.racket.parent?.remove(this.racket);
    this.mine.rally = null;
    this.mine.ball.m.visible = this.mine.ball.s.visible = false;
    this._sendOff();
    this._hud(false);
    if (msg) g.hud.toast(msg, 'bad', 2400);
  }
  _hud(on) {
    if (!on) {
      this.hudEl?.remove();
      this.hudEl = null;
      return;
    }
    const el = document.createElement('div');
    el.id = 'tennisHud';
    el.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:30;padding:6px 14px;border-radius:10px;' +
      'background:rgba(10,30,20,.78);color:#fff;font:600 15px/1.4 system-ui,sans-serif;text-align:center;pointer-events:none;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.35)';
    document.body.appendChild(el);
    this.hudEl = el;
    this._hudText = '';
  }
  _hudUpdate() {
    const r = this.mine.rally,
      me = this.me,
      o = 1 - me;
    if (!r || !this.hudEl) return;
    const srv = r.server === me ? '你' : this.otherName,
      tip =
        r.state === 'serve' && r.server === me
          ? `<div style="font-size:13px;color:#ffe27a">輪到你發球：按左鍵${r.serveNo === 2 ? '（第二發）' : ''}</div>`
          : '',
      lag =
        this.mode === 'host' && this.net ? `　｜　延遲 ${Math.round(this.net.rtt * 1000)} ms` : '';
    const html = `局數 你 ${r.games[me]} : ${r.games[o]} ${this.otherName}　｜　${scoreFor(r, me, this.otherName)}　｜　發球：${srv}${lag}${tip}`;
    if (html !== this._hudText) this.hudEl.innerHTML = this._hudText = html;
  }
  // ---------------- every frame ----------------
  update(dt, inp) {
    const g = this.g,
      pl = g.player,
      far = Math.hypot(pl.pos.x - MID[0], pl.pos.z - MID[1]) > FAR;
    if (this.playing && (far || pl.vehicle)) this.quit('你離開球場，比賽結束');
    const shown = !far;
    // the students' matches
    for (const c of this.courts) {
      const on = shown && this._on(c);
      for (const p of c.people) p.ch.root.visible = on;
      c.ball.m.visible = c.ball.s.visible = false;
      if (!on) continue;
      if (!c.rally) this._newRally(c);
      c.rally.step(dt);
      if (c.rally.state === 'over' && (c.rest += dt) > 5) {
        c.rest = 0;
        this._newRally(c);
      }
      this._sounds(c.i, c.rally, c.rally.take());
      this._draw(c.i, c.rally, c.people, c.ball, dt);
    }
    if (this.playing) this._play(dt, inp);
    else if (this.opp) {
      // the student you called, on his way in (or out again)
      if (far) this._dropOpp();
      else if (this._walkOpp(dt)) {
        if (this.opp.leaving) this._dropOpp();
        else this._arrive();
      }
    }
  }
  _play(dt, inp) {
    const g = this.g,
      pl = g.player,
      r = this.mine.rally,
      me = r.players[this.me],
      s = me.side;
    // you: put in place for each serve, kept on your own half
    if (r.state === 'serve' && this._lastState !== 'serve') {
      const [x, z] = toW(this.ci, me.tu, me.tv);
      pl.place(x, z, faceU(-s));
      g.rig.yaw = faceU(-s);
    }
    this._lastState = r.state;
    let [u, v] = toL(this.ci, pl.pos.x, pl.pos.z);
    // your own half: not over the net, not onto the next court (the fences do the rest); out the back = you leave
    if (u * s > HL + 6.5) return this.quit('你離開球場，比賽結束');
    const cu = s * Math.max(0.6, u * s),
      cv = Math.max(-10.5, Math.min(10, v));
    if (cu !== u || cv !== v) {
      [pl.pos.x, pl.pos.z] = toW(this.ci, cu, cv);
      u = cu;
      v = cv;
    }
    me.u = u;
    me.v = v;
    // left / right while you swing: where across their court it goes
    const ax = inp.axis(),
      yaw = g.rig.yaw,
      dx = Math.sin(yaw) * ax.y - Math.cos(yaw) * ax.x,
      dz = Math.cos(yaw) * ax.y + Math.sin(yaw) * ax.x;
    me.aim = Math.max(-1, Math.min(1, (dx * D[1] - dz * D[0]) * 1.2));
    const swing = inp.hit('Mouse0', 'KeyJ');
    let events;
    if (this.mode === 'guest') {
      // the host decides; here the swing just starts showing at once
      if (swing) {
        if (r.state === 'serve' ? r.server === this.me : me.swingT < 0 || me.swingT > SWING) {
          me.swingT = 0;
          me.kind = r.state === 'serve' ? 'serve' : (r.ball.v - me.v) * s >= 0 ? 'fore' : 'back';
        }
        this.net?.swing();
      }
      if ((this._sendT -= dt) <= 0) {
        this._sendT = 0.05;
        this.net?.input(u, v, me.aim);
      }
      this._mirror(dt);
      events = this._evq.splice(0);
    } else {
      if (swing) r.swing(this.me);
      if (this.mode === 'host') {
        const f = r.players[1];
        if (this._fin) {
          f.netU = this._fin.u;
          f.netV = this._fin.v;
          f.aim = this._fin.aim;
        }
        if (f.netU !== undefined) {
          const k = Math.min(1, dt * 15);
          f.u += (f.netU - f.u) * k;
          f.v += (f.netV - f.v) * k;
        }
        for (const lag of this._swq.splice(0)) r.swing(1, lag);
      }
      r.step(dt);
      events = r.take();
      if (this.mode === 'host') {
        this._evBuf.push(...events);
        if ((this._sendT -= dt) <= 0) {
          this._sendT = 0.05;
          this.net?.send(r, this._evBuf.splice(0));
        }
      }
    }
    this._sounds(this.ci, r, events);
    const mine = (w) => w === this.me,
      who = this.otherName;
    for (const e of events) {
      if (e.type === 'fault') g.hud.toast(e.second ? '雙發失誤' : '發球失誤', 'bad', 1400);
      if (e.type === 'bounce' && !e.inn && !e.dead) g.hud.toast('出界！', 'bad', 1200);
      if (e.type === 'net' && !e.dead) g.hud.toast('掛網', 'bad', 1200);
      if (e.type === 'point')
        g.hud.toast(
          mine(e.winner) ? '得分！' : `${who}得分`,
          mine(e.winner) ? 'good' : 'bad',
          1300
        );
      if (e.type === 'game' && r.winner < 0)
        g.hud.bigToast(
          mine(e.winner) ? '你拿下這一局' : `${who}拿下這一局`,
          `局數 ${r.games[this.me]} : ${r.games[1 - this.me]}`,
          1800
        );
      if (e.type === 'match') this._finish(mine(e.winner));
    }
    // facing the net while you swing or stand
    if (me.swingT >= 0 && me.swingT < SWING) {
      pl.heading = faceU(-s);
      pl.ch.root.rotation.y = pl.heading;
    } else if (pl.speed < 0.6) {
      pl.heading += angDiff(faceU(-s), pl.heading) * Math.min(1, dt * 8);
      pl.ch.root.rotation.y = pl.heading;
    }
    this._arms(pl.ch, me, me.swingT, r.ball.live || r.state === 'serve');
    this._draw(this.ci, r, this.mine.people, this.mine.ball, dt);
    this._hudUpdate();
    if (r.state === 'over') this.quit();
  }
  // the guest's copy between the host's snapshots: the ball flies on, swings play on, your friend glides to where he is
  _mirror(dt) {
    const r = this.mine.rally;
    if (r.state === 'play' || r.state === 'dead') stepBall(r.ball, dt);
    for (const [i, p] of r.players.entries()) {
      if (p.swingT >= 0) p.swingT += dt;
      if (i === this.me || p.netU === undefined) continue;
      const k = Math.min(1, dt * 15);
      p.u += (p.netU - p.u) * k;
      p.v += (p.netV - p.v) * k;
    }
    if (r.state === 'over' || r.winner >= 0) r.t += dt;
  }
  _finish(won) {
    const g = this.g,
      r = this.mine.rally,
      score = `局數 ${r.games[this.me]} : ${r.games[1 - this.me]}`;
    g.hud.bigToast(won ? '你贏了！' : `${this.otherName}贏了`, score, 3200);
    if (won && this.mode === 'ai' && !this.wonOnce) {
      this.wonOnce = true;
      g.addVotes?.(2, '網球贏了來打球的同學');
    }
  }
  // ball and the AI people of one rally
  _draw(i, r, people, ball, dt) {
    const b = r.ball;
    const [bx, bz] = toW(i, b.u, b.v),
      gy = surfaceAt(bx, bz);
    ball.m.visible = ball.s.visible = b.live || b.held || r.state === 'dead';
    ball.m.position.set(bx, gy + Math.max(b.h, BALL_VIS), bz); // the big ball sits on the ground, not in it
    ball.s.position.set(bx, gy + 0.03, bz);
    ball.s.material.opacity = 0.35;
    r.players.forEach((p, k) => {
      const who = people[k];
      if (!who) return;
      const [x, z] = toW(i, p.u, p.v),
        ch = who.ch;
      ch.root.position.set(x, surfaceAt(x, z), z);
      // a friend over the network: how fast and which way he is going, from where he was
      let dir = null;
      if (!p.ai) {
        if (who.lx !== undefined && dt > 0) {
          const mx = x - who.lx,
            mz = z - who.lz;
          who.sp = (who.sp || 0) * 0.8 + (Math.hypot(mx, mz) / dt) * 0.2;
          if (Math.hypot(mx, mz) > 0.01) dir = [mx, mz];
        }
        who.lx = x;
        who.lz = z;
        p.moving = who.sp || 0;
      }
      const net = faceU(-p.side),
        go = dir || (p.ai ? dirOf(i, p) : null),
        want = p.moving > 0.8 && go && !(b.live && b.lastHit !== k) ? Math.atan2(...go) : net;
      who.heading += angDiff(want, who.heading) * Math.min(1, dt * 9);
      ch.root.rotation.y = who.heading;
      this._detail(ch, x, z);
      ch.update(dt, { speed: p.moving || 0, mode: 'foot' });
      // the ball sits in the server's left hand until the toss
      if (r.state === 'serve' && k === r.server) {
        ch.root.updateMatrixWorld(true);
        reachArm(ch, ch.arms[1], 0.25, 1.05, 0.35, ...POLE_L);
        const a = ch.arms[1],
          q = a.hand
            ? a.hand.getWorldPosition(new THREE.Vector3())
            : a.el.localToWorld(new THREE.Vector3(0, -0.3, 0.03));
        ball.m.position.copy(q);
        ball.s.position.set(q.x, surfaceAt(q.x, q.z) + 0.03, q.z);
      }
      const swinging = p.swingT >= 0 && p.swingT < SWING;
      if (!swinging && p.prep) {
        p.kind = p.prep;
        this._arms(ch, p, 0, true);
      } else this._arms(ch, p, p.swingT, b.live || r.state === 'serve');
    });
  }
  _detail(ch, x, z) {
    const c = this.g.camera.position;
    ch.setDetail?.(Math.hypot(c.x - x, c.z - z) < 35);
  }
  // the racket arm (and the free hand) after ch.update: a swing, the ready stance, or carrying the racket
  _arms(ch, p, t, ready) {
    ch.root.updateMatrixWorld(true);
    const [aR, aL] = ch.arms;
    if (p && t >= 0 && t < SWING) {
      const [, x, y, z, tw] = poseAt(p.kind, t);
      ch.torso.rotation.y = tw;
      ch.root.updateMatrixWorld(true);
      reachArm(ch, aR, x, y, z, ...POLE_R);
      if (p.kind === 'serve' && t < 0.15) reachArm(ch, aL, 0.1, 2.0, 0.3, ...POLE_L);
    } else if (ready) {
      reachArm(ch, aR, ...READY, ...POLE_R);
      reachArm(ch, aL, ...READY_L, ...POLE_L);
    } else reachArm(ch, aR, ...CARRY, ...POLE_R);
    ch.setHandPose?.('grip');
  }
  // hit / bounce sounds, quieter with distance; returns the events
  _sounds(i, r, ev) {
    const g = this.g,
      q = g.player.pos;
    for (const e of ev) {
      if (e.type !== 'hit' && e.type !== 'bounce') continue;
      const b = r.ball,
        [x, z] = toW(i, b.u, b.v),
        k = Math.max(0, 1 - Math.hypot(x - q.x, z - q.z) / 40);
      if (k < 0.03) continue;
      if (e.type === 'hit') g.audio.noise?.(0.05, 1500, 1.4, 0.32 * k * k, 0, 'bandpass');
      else g.audio.noise?.(0.06, 420, 1, 0.22 * k * k, 0, 'lowpass');
    }
    return ev;
  }
}
// world direction a player is walking (towards his target), as (dx, dz)
function dirOf(i, p) {
  const [x0, z0] = toW(i, p.u, p.v),
    [x1, z1] = toW(i, p.tu, p.tv);
  return [x1 - x0, z1 - z0];
}
