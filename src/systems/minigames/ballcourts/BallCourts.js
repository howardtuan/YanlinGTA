// 體育園區籃球場、排球場上的人（場地在 src/world/Court.js，規則在 ./Hoops.js、./Volley.js）：
//  - 06:00～23:00，東側北邊那座籃球場、西側北邊那座全場一直有人在鬥牛，東側最北和西側北邊那座排球場有人在打 2 對 2；
//  - 其他空著的球場：走到場邊按 E 揪人（像力行 277 揪麻將），同學會從附近走過來，到齊就開打。
//    籃球是 1 對 1 半場鬥牛（先拿 7 分）：按住左鍵（或 J、手把 X）起跳、放開出手，跳到最高時放最準；防守時靠近按左鍵抄球。
//    排球是 2 對 2（先拿 11 分、要領先 2 分）：球掉下來經過擊球高度時按左鍵，第一下接球、第二下舉球、第三下扣球，
//    同一個人不能連碰兩下；發球是先按一下拋球、球掉下來再按一下；擊球時按著左右決定打到對面哪一邊。Esc 離開。
// 這個檔和 ./Hoops.js、./Volley.js 是獨立的包：src/core/Game.js 在玩家走近體育園區時才 import()（同網球的拆包做法），
// 不進首屏主包。
import * as THREE from 'three';
import { createCharacter, randomStudent } from '../../../entities/Character.js';
import { reachArm } from '../../../entities/Armik.js';
import { surfaceAt } from '../../../world/Terrain.js';
import { COURTS, VBALL, courtP } from '../../../world/Court.js';
import { Hoops, REL_BEST } from './Hoops.js';
import { Volley, teamOf, tDown, HIT_H } from './Volley.js';
import { canvasTexture, uploadAndRelease } from '../../../graphics/GpuMemLifecycle.js';

const OPEN = [6 * 60, 23 * 60]; // minutes of the day people are out on the courts
const FAR = 120; // past this (m from a court) nothing on it is simulated or drawn
const NAMES = ['阿哲', '小宇', '冠廷', '品妤', '柏翰', '佳蓉', '宥辰', '子晴', '阿翔', '思妤'];
// the courts: npc ones always have a game on, the others are yours to get one going on
const VENUES = [
  { sport: 'hoop', C: COURTS[1], npc: true },
  { sport: 'hoop', C: COURTS[4], npc: true },
  { sport: 'hoop', C: COURTS[2] },
  { sport: 'hoop', C: COURTS[5] },
  { sport: 'hoop', C: COURTS[8] },
  { sport: 'volley', C: VBALL[0], npc: true },
  { sport: 'volley', C: VBALL[3], npc: true },
  { sport: 'volley', C: VBALL[1] },
  { sport: 'volley', C: VBALL[2] },
  { sport: 'volley', C: VBALL[4] },
];
const NEED = { hoop: 1, volley: 3 }; // how many have to come for a game
// court local (u, v) <-> world
const toW = (C, u, v) => courtP(C, u, v);
function toL(C, x, z) {
  const [a, b] = C.d,
    dx = x - C.c[0],
    dz = z - C.c[1];
  return [a * dx + b * dz, b * dx - a * dz];
}
// heading (three rotation.y, +z forward) of a world direction
const headOf = (dx, dz) => Math.atan2(dx, dz);
// heading of a local direction (du, dv)
function headL(C, du, dv) {
  const [a, b] = C.d;
  return headOf(a * du + b * dv, b * du - a * dv);
}
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const POLE_R = [-1, -0.4, -0.2],
  POLE_L = [1, -0.4, -0.2];

function ballTexture(draw) {
  const t = canvasTexture(256, 128, (c) => draw(c), false);
  if (t.isCanvasTexture) uploadAndRelease(t);
  return t;
}

export class BallCourts {
  constructor(g) {
    this.g = g;
    this.playing = false; // a game of yours (or getting one together)
    this.mine = null;
    this.mats = {
      hoop: new THREE.MeshStandardMaterial({
        roughness: 0.75,
        map: ballTexture((c) => {
          c.fillStyle = '#d2692a';
          c.fillRect(0, 0, 256, 128);
          c.strokeStyle = '#231a14';
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(0, 64);
          c.lineTo(256, 64);
          for (const x of [2, 128]) {
            c.moveTo(x, 0);
            c.lineTo(x, 128);
          }
          c.stroke();
          for (const x of [64, 192]) {
            c.beginPath();
            c.ellipse(x, 64, 30, 50, 0, 0, 7);
            c.stroke();
          }
        }),
      }),
      volley: new THREE.MeshStandardMaterial({
        roughness: 0.6,
        map: ballTexture((c) => {
          c.fillStyle = '#f4f1e6';
          c.fillRect(0, 0, 256, 128);
          ['#1f4fa8', '#f2c230'].forEach((col, k) => {
            c.fillStyle = col;
            for (let x = k * 64; x < 256; x += 128) c.fillRect(x, 0, 42, 128);
          });
        }),
      }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#000',
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
      mark: new THREE.MeshBasicMaterial({
        color: '#ffe27a',
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
    this.geo = {
      hoop: new THREE.SphereGeometry(0.12, 18, 12),
      volley: new THREE.SphereGeometry(0.105, 18, 12),
      shadow: new THREE.CircleGeometry(0.14, 14).rotateX(-Math.PI / 2),
    };
    this.mark = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.55, 28).rotateX(-Math.PI / 2),
      this.mats.mark
    );
    this.mark.visible = false;
    g.scene.add(this.mark);
    let seed = 11;
    this.rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    this.venues = VENUES.map((V, k) => ({
      ...V,
      k,
      mid: V.C.c,
      people: null, // made the first time they're needed
      game: null,
      ball: this._ballMesh(V.sport),
      rest: 0,
    }));
    this.pool = []; // the classmates who come over for your games
    this.hudEl = null;
    // E at the side of every court with no game on
    for (const v of this.venues) {
      if (v.npc) continue;
      const [ax, az] =
        v.sport === 'hoop' ? toW(v.C, v.C.L / 2 - 7, v.C.W / 2 + 1.2) : toW(v.C, -5, -5.8);
      g.interiors.actions.push({
        x: ax,
        z: az,
        y: 0,
        r: 3,
        label: () =>
          v.sport === 'hoop'
            ? '按 <kbd>E</kbd> 揪人鬥牛（籃球 1 對 1，先拿 7 分）'
            : '按 <kbd>E</kbd> 揪人打排球（2 對 2，先拿 11 分）',
        cond: () => !this.playing && this.open() && !g.player.vehicle,
        fn: () => this.recruit(v),
      });
    }
  }
  _ballMesh(sport) {
    const m = new THREE.Mesh(this.geo[sport], this.mats[sport]),
      s = new THREE.Mesh(this.geo.shadow, this.mats.shadow);
    m.castShadow = true;
    m.visible = s.visible = false;
    this.g.scene.add(m, s);
    return { m, s };
  }
  _person(look) {
    const r = this.rnd,
      ch = createCharacter({
        ...randomStudent(r),
        pants: false,
        bag: null,
        shoes: '#f4f4f4',
        ...look,
      });
    ch.root.visible = false;
    this.g.scene.add(ch.root);
    return { ch, heading: r() * 6.28, name: NAMES[Math.floor(r() * NAMES.length)] };
  }
  open() {
    const m = ((this.g.clock % 1440) + 1440) % 1440;
    return m >= OPEN[0] && m < OPEN[1];
  }
  _newGame(v, people) {
    const r = Math.random,
      ai = () => ({ skill: 0.5 + r() * 0.35, speed: 4.4 + r() * 1.2 });
    if (v.sport === 'hoop')
      return new Hoops({
        L: v.C.L,
        W: v.C.W,
        players: people.map((p) => ({ name: p ? p.name : '你', ai: p ? ai() : null })),
        first: r() < 0.5 ? 0 : 1,
      });
    return new Volley({
      players: people.map((p) => ({ name: p ? p.name : '你', ai: p ? ai() : null })),
      serveTeam: r() < 0.5 ? 0 : 1,
    });
  }
  // ---------------- your game ----------------
  recruit(v) {
    const g = this.g,
      n = NEED[v.sport];
    while (this.pool.length < n) this.pool.push(this._person());
    const used = new Set(),
      people = [null];
    for (let i = 0; i < n; i++) {
      const p = this.pool[i];
      let k;
      do k = Math.floor(Math.random() * NAMES.length);
      while (used.has(k));
      used.add(k);
      p.name = NAMES[k];
      people.push(p);
    }
    const game = this._newGame(v, people);
    // they come in from round about, 16–26 m off
    const walkers = people.slice(1).map((p, i) => {
      const a = Math.random() * Math.PI * 2,
        d = 16 + Math.random() * 10,
        x = v.mid[0] + Math.cos(a) * d,
        z = v.mid[1] + Math.sin(a) * d;
      p.x = x;
      p.z = z;
      p.ch.root.visible = true;
      p.ch.root.position.set(x, surfaceAt(x, z), z);
      p.delay = 0.6 + i * 0.9 + Math.random() * 0.8;
      p.said = false;
      return p;
    });
    this.mine = { v, game, people, walkers, state: 'gather', t: 0, last: null, held: false };
    this.playing = true;
    this._hud(true);
    g.hud.toast(
      v.sport === 'hoop' ? '你喊：「有沒有人要鬥牛？」' : '你喊：「排球缺人，來打嗎？」',
      'good',
      2200
    );
  }
  quit(msg) {
    if (!this.playing) return;
    const m = this.mine;
    this.playing = false;
    this.mine = null;
    for (const p of m.people) if (p) p.ch.root.visible = false;
    m.v.ball.m.visible = m.v.ball.s.visible = false;
    this.mark.visible = false;
    this._hud(false);
    if (msg) this.g.hud.toast(msg, 'bad', 2400);
  }
  _hud(on) {
    if (!on) {
      this.hudEl?.remove();
      this.hudEl = null;
      return;
    }
    if (this.hudEl) return;
    const el = document.createElement('div');
    el.id = 'ballHud';
    el.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:30;padding:6px 14px;border-radius:10px;' +
      'background:rgba(40,18,10,.78);color:#fff;font:600 15px/1.4 system-ui,sans-serif;text-align:center;pointer-events:none;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.35)';
    document.body.appendChild(el);
    this.hudEl = el;
    this._hudText = '';
  }
  _hudSet(html) {
    if (this.hudEl && html !== this._hudText) this.hudEl.innerHTML = this._hudText = html;
  }
  // ---------------- every frame ----------------
  update(dt, inp) {
    const g = this.g,
      pl = g.player,
      q = pl.pos;
    if (this.playing && pl.vehicle) this.quit('你離開球場了');
    for (const v of this.venues) {
      const near = Math.hypot(q.x - v.mid[0], q.z - v.mid[1]) < FAR;
      if (this.mine?.v === v) continue;
      const on = near && v.npc && this.open();
      if (v.people) for (const p of v.people) p.ch.root.visible = on;
      v.ball.m.visible = v.ball.s.visible = false;
      if (!on) continue;
      if (!v.people)
        v.people = Array.from({ length: v.sport === 'hoop' ? 2 : 4 }, () => this._person());
      if (!v.game) v.game = this._newGame(v, v.people);
      v.game.step(dt);
      if (v.game.state === 'over' && (v.rest += dt) > 6) {
        v.rest = 0;
        v.game = this._newGame(v, v.people);
      }
      this._sounds(v, v.game, v.game.take());
      this._draw(v, v.game, v.people, dt);
    }
    if (this.playing) this._mine(dt, inp);
  }
  _mine(dt, inp) {
    const g = this.g,
      pl = g.player,
      m = this.mine,
      v = m.v,
      r = m.game;
    m.t += dt;
    const [lu, lv] = toL(v.C, pl.pos.x, pl.pos.z);
    // walked off
    if (Math.abs(lu) > (v.sport === 'hoop' ? v.C.L / 2 + 8 : 17) || Math.abs(lv) > v.C.W / 2 + 9)
      return this.quit('你離開球場，比賽結束');
    if (m.state === 'gather') return this._gather(dt);
    if (v.sport === 'hoop') this._playHoop(dt, inp, lu, lv);
    else this._playVolley(dt, inp, lu, lv);
    if (!this.mine) return;
    this._draw(v, r, m.people, dt);
    if (r.state === 'over' && (m.over = (m.over || 0) + dt) > 3) this.quit();
  }
  _gather(dt) {
    const m = this.mine,
      v = m.v,
      r = m.game;
    let n = 0;
    m.walkers.forEach((p) => {
      const i = m.people.indexOf(p),
        [tu, tv] = r.spot(i),
        [x, z] = toW(v.C, tu, tv),
        dx = x - p.x,
        dz = z - p.z,
        d = Math.hypot(dx, dz);
      p.delay -= dt;
      let sp = 0;
      if (p.delay <= 0 && d > 0.3) {
        if (!p.said) {
          p.said = true;
          this.g.hud.toast(
            `${p.name}：「${['我來！', '算我一個', '來啊', '等我一下'][i % 4]}」`,
            'good',
            1600
          );
        }
        sp = Math.min(d, 3.4 * dt);
        p.x += (dx / d) * sp;
        p.z += (dz / d) * sp;
        p.heading += angDiff(headOf(dx, dz), p.heading) * Math.min(1, dt * 8);
        sp /= dt;
      } else if (d <= 0.3) n++;
      p.ch.root.position.set(p.x, surfaceAt(p.x, p.z), p.z);
      p.ch.root.rotation.y = p.heading;
      p.ch.update(dt, { speed: sp, mode: 'foot' });
    });
    const need = m.walkers.length;
    this._hudSet(
      `揪人中……同學 ${n} / ${need} 到了<div style="font-size:13px;color:#ffe27a">Esc 取消</div>`
    );
    if (n < need) return;
    // everyone's here
    m.state = 'play';
    m.walkers.forEach((p) => {
      const i = m.people.indexOf(p);
      [r.players[i].u, r.players[i].v] = r.spot(i);
    });
    const g = this.g;
    if (v.sport === 'hoop') {
      g.hud.bigToast(
        `鬥牛：你 vs ${m.people[1].name}`,
        '按住左鍵起跳、放開出手・防守時靠近按左鍵抄球・Esc 離開',
        3400
      );
    } else {
      g.hud.bigToast(
        `排球：你和${m.people[1].name} vs ${m.people[2].name}、${m.people[3].name}`,
        '球掉下來時按左鍵：接球→舉球→扣球・按著左右瞄準・Esc 離開',
        3400
      );
    }
    this._place();
  }
  // you to your place at a check / a serve
  _place() {
    const m = this.mine,
      r = m.game,
      v = m.v,
      [u, w] = r.spot(0),
      [x, z] = toW(v.C, u, w),
      h = headL(v.C, 1, 0);
    this.g.player.place(x, z, h);
    this.g.rig.yaw = h;
    r.players[0].u = u;
    r.players[0].v = w;
  }
  _aim(inp, C) {
    const g = this.g,
      ax = inp.axis(),
      yaw = g.rig.yaw,
      dx = Math.sin(yaw) * ax.y - Math.cos(yaw) * ax.x,
      dz = Math.cos(yaw) * ax.y + Math.sin(yaw) * ax.x,
      [a, b] = C.d;
    return Math.max(-1, Math.min(1, (dx * b - dz * a) * 1.2));
  }
  _keep(C, u, v) {
    const pl = this.g.player,
      [x, z] = toW(C, u, v);
    pl.pos.x = x;
    pl.pos.z = z;
  }
  _playHoop(dt, inp, lu, lv) {
    const g = this.g,
      pl = g.player,
      m = this.mine,
      r = m.game,
      me = r.players[0],
      C = m.v.C;
    if (r.state === 'check' && m.last !== 'check') this._place();
    m.last = r.state;
    // inside the half court (and a little round it)
    let u = Math.max(-1, Math.min(r.UL + 0.6, lu)),
      v = Math.max(-r.HW - 1, Math.min(r.HW + 1, lv));
    if (me.shotT >= 0) {
      u = me.u;
      v = me.v;
    } // feet set for the shot
    if (u !== lu || v !== lv) this._keep(C, u, v);
    me.u = u;
    me.v = v;
    me.moving = pl.speed || 0;
    r.step(dt); // first: the key went down some time in this frame, so it's judged against where things are now
    const key = inp.hit('Mouse0', 'KeyJ'),
      down = inp.down('Mouse0', 'KeyJ');
    if (me.shotT >= 0) {
      // let go of the button (or press again, on a pad or a touch screen that doesn't hold) to release
      if ((m.held && !down) || (!m.held && key)) r.release(0);
    } else if (key) {
      if (r.ball.holder === 0) {
        const s = r.shootStart(0);
        if (s === 'clear') g.hud.toast('搶到球要先運出三分線外才能出手', 'bad', 1500);
        m.held = s === true && down;
      } else if (r.ball.holder === 1) r.steal(0);
    }
    const o = m.people[1].name;
    for (const e of this._sounds(m.v, r, r.take())) {
      if (e.type === 'score')
        g.hud.toast(
          e.who === 0 ? (e.pts === 2 ? '三分線外！+2' : '進了！+1') : `${o}得分 +${e.pts}`,
          e.who === 0 ? 'good' : 'bad',
          1400
        );
      if (e.type === 'block')
        g.hud.toast(e.who === 0 ? '火鍋！' : `被${o}蓋了`, e.who === 0 ? 'good' : 'bad', 1300);
      if (e.type === 'steal')
        g.hud.toast(e.who === 0 ? '抄到了！' : `被${o}抄走`, e.who === 0 ? 'good' : 'bad', 1300);
      if (e.type === 'rebound' && e.def && e.who === 0)
        g.hud.toast('防守籃板，先運出三分線', 'good', 1300);
      if (e.type === 'out') g.hud.toast('球出界', 'bad', 1200);
      if (e.type === 'match') this._finish(e.winner === 0, `${r.score[0]} : ${r.score[1]}`, 'hoop');
    }
    // facing: the basket with the ball when you stand, the man with the ball on defence
    if (pl.speed < 0.6 && r.state !== 'over') {
      const [tu, tv] =
        r.ball.holder === 0 || r.ball.holder < 0 ? [r.BU, 0] : [r.players[1].u, r.players[1].v];
      pl.heading += angDiff(headL(C, tu - me.u, tv - me.v), pl.heading) * Math.min(1, dt * 10);
      pl.ch.root.rotation.y = pl.heading;
    }
    const tip =
      r.state === 'check'
        ? r.o === 0
          ? '你的球，準備進攻'
          : `${o}的球`
        : r.ball.holder === 0
          ? r.cleared
            ? '按住左鍵起跳、放開出手（跳到最高放最準）'
            : '先運出三分線外才能出手'
          : r.ball.holder === 1
            ? '靠近按左鍵抄球、貼身防守'
            : '搶籃板！';
    this._hudSet(
      `鬥牛　你 ${r.score[0]} : ${r.score[1]} ${o}　｜　先拿 ${r.target} 分<div style="font-size:13px;color:#ffe27a">${tip}</div>`
    );
  }
  _playVolley(dt, inp, lu, lv) {
    const g = this.g,
      pl = g.player,
      m = this.mine,
      r = m.game,
      me = r.players[0],
      C = m.v.C;
    // your own half
    let u = Math.max(-11.5, Math.min(-0.35, lu)),
      v = Math.max(-6.5, Math.min(6.5, lv));
    if (r.state === 'serve' && r.server === 0) u = Math.min(u, -9.1);
    if (r.state === 'toss' && r.server === 0) {
      u = me.u;
      v = me.v;
    }
    if (u !== lu || v !== lv) this._keep(C, u, v);
    me.u = u;
    me.v = v;
    me.moving = pl.speed || 0;
    me.aim = this._aim(inp, C);
    r.step(dt); // (as in basketball: the press is judged against the ball as it is now)
    if (inp.hit('Mouse0', 'KeyJ')) r.act(0);
    const t = m.people[1].name;
    for (const e of this._sounds(m.v, r, r.take())) {
      if (e.type === 'place') this._place();
      if (e.type === 'whiff' && e.who === 0) g.hud.toast('沒碰到球', 'bad', 1000);
      if (e.type === 'net') g.hud.toast('掛網', 'bad', 1200);
      if (e.type === 'land' && !e.inn) g.hud.toast('出界！', 'bad', 1200);
      if (e.type === 'touch' && e.who === 0 && e.q > 0.85)
        g.hud.toast({ dig: '好球！', set: '漂亮的舉球', hit: '扣殺！' }[e.kind], 'good', 900);
      if (e.type === 'point' && r.winner < 0)
        g.hud.toast(e.winner === 0 ? '得分！' : '對面得分', e.winner === 0 ? 'good' : 'bad', 1300);
      if (e.type === 'match')
        this._finish(e.winner === 0, `${r.score[0]} : ${r.score[1]}`, 'volley');
    }
    // facing the net when you stand
    if (pl.speed < 0.6) {
      pl.heading += angDiff(headL(C, 1, 0), pl.heading) * Math.min(1, dt * 8);
      pl.ch.root.rotation.y = pl.heading;
    }
    // where your touch is: a ring on the floor
    const pn = r.plan,
      yours = pn && pn.team === 0 && r._kind(0) && (pn.who === 0 || pn.kind !== 'dig');
    this.mark.visible = !!yours && r.state === 'play';
    if (this.mark.visible) {
      const [x, z] = toW(C, pn.cu, pn.cv);
      this.mark.position.set(x, surfaceAt(x, z) + 0.05, z);
    }
    const name = { dig: '接球', set: '舉球', hit: '扣球' },
      tip =
        r.state === 'serve' && r.server === 0
          ? '輪到你發球：按左鍵拋球'
          : r.state === 'toss' && r.server === 0
            ? '球掉下來再按一次發球（按著左右瞄準）'
            : yours
              ? `${name[pn.kind]}！站到光圈裡，球掉下來時按左鍵`
              : pn && pn.team === 0 && pn.who === 1 && pn.kind === 'dig'
                ? `${t}接`
                : '';
    this._hudSet(
      `排球　你們 ${r.score[0]} : ${r.score[1]} 對面　｜　先拿 ${r.target} 分（要贏 2 分）<div style="font-size:13px;color:#ffe27a">${tip || '&nbsp;'}</div>`
    );
  }
  _finish(won, score, sport) {
    const g = this.g;
    g.hud.bigToast(
      won ? (sport === 'hoop' ? '你贏了！' : '你們贏了！') : '輸了，下次再來',
      score,
      3200
    );
    if (won && !(this.won ||= {})[sport]) {
      this.won[sport] = true;
      g.addVotes?.(1, sport === 'hoop' ? '鬥牛贏了' : '排球贏了');
    }
  }
  // ---------------- drawing ----------------
  _draw(v, r, people, dt) {
    const C = v.C,
      ball = v.ball;
    ball.m.visible = ball.s.visible = true;
    r.players.forEach((p, i) => {
      const who = people[i];
      if (!who) return;
      const [x, z] = toW(C, p.u, p.v),
        ch = who.ch;
      ch.root.visible = true;
      // facing: where he's walking, or the play
      const du = p.u - (who.lu ?? p.u),
        dv = p.v - (who.lv ?? p.v),
        walking = p.moving > 1.5 && Math.hypot(du, dv) > 1e-4;
      who.lu = p.u;
      who.lv = p.v;
      let want;
      if (v.sport === 'hoop') {
        const o = r.players[1 - i],
          h = r.ball.holder;
        if (h < 0) want = headL(C, r.ball.u - p.u, r.ball.v - p.v);
        else if (h !== i)
          want = headL(C, o.u - p.u, o.v - p.v); // guarding him
        else want = walking ? headL(C, du, dv) : headL(C, r.BU - p.u, -p.v);
      } else want = walking && p.moving > 3 ? headL(C, du, dv) : headL(C, teamOf(i) ? -1 : 1, 0);
      who.heading += angDiff(want, who.heading) * Math.min(1, dt * 9);
      ch.root.rotation.y = who.heading;
      ch.root.position.set(x, surfaceAt(x, z) + this._jump(v, r, i), z);
      const c = this.g.camera.position;
      ch.setDetail?.(Math.hypot(c.x - x, c.z - z) < 35);
      ch.update(dt, { speed: p.moving || 0, mode: 'foot' });
      this._arms(v, r, i, ch);
    });
    // you: your arms and jump on top of your walk
    const me = people.indexOf(null);
    if (me >= 0) {
      const ch = this.g.player.ch;
      ch.root.position.y += this._jump(v, r, me);
      this._arms(v, r, me, ch);
    }
    this._ball(v, r, people, dt);
  }
  _jump(v, r, i) {
    const p = r.players[i];
    if (v.sport === 'hoop') {
      if (p.shotT < 0) return 0;
      const k = (p.shotT - 0.25) / (REL_BEST + 0.25 - 0.25);
      return k > 0 && k < 2 ? 0.42 * Math.sin((k * Math.PI) / 2) : 0;
    }
    const a = p.anim;
    // the attacker goes up before the ball gets there
    const pn = r.plan;
    if (p.ai && pn && pn.who === i && pn.kind === 'hit' && r.state === 'play' && !pn.out) {
      const tau = tDown(r.ball, HIT_H.hit);
      if (tau !== null && tau < 0.3 && tau > -0.1)
        return 0.55 * Math.sin(((0.3 - tau) / 0.6) * Math.PI);
    }
    if (a && a.kind === 'hit' && a.t < 0.3)
      return 0.55 * Math.sin(((a.t + 0.3) / 0.6) * Math.PI) * (p.ai ? 1 : 0.8);
    return 0;
  }
  // arms after ch.update (reachArm in his own frame: x + = his left, y up, z forward)
  _arms(v, r, i, ch) {
    const p = r.players[i],
      [aR, aL] = ch.arms,
      R = (x, y, z) => reachArm(ch, aR, x, y, z, ...POLE_R),
      L = (x, y, z) => reachArm(ch, aL, x, y, z, ...POLE_L);
    ch.root.updateMatrixWorld(true);
    if (v.sport === 'hoop') {
      if (p.shotT >= 0) {
        const k = Math.min(1, p.shotT / REL_BEST),
          y = 1.15 + 0.85 * k;
        R(-0.08, y - 0.08, 0.3);
        L(0.13, y, 0.27);
      } else if (r.ball.holder === i) {
        const ph = (r.t * 1.75) % 1;
        R(-0.3, 0.82 + 0.15 * (1 - (2 * ph - 1) ** 2), 0.36);
        L(0.35, 1.0, 0.25);
      } else if (r.ball.holder === 1 - i && r.state === 'live') {
        R(-0.55, 1.15, 0.3);
        L(0.55, 1.15, 0.3);
      } else return;
      ch.setHandPose?.('relaxed');
      return;
    }
    const a = p.anim;
    if (a && a.t < 0.55) {
      if (a.kind === 'dig') {
        R(-0.06, 0.82, 0.5);
        L(0.06, 0.82, 0.5);
      } else if (a.kind === 'set') {
        R(-0.13, 1.95, 0.22);
        L(0.13, 1.95, 0.22);
      } else if (a.kind === 'toss') {
        L(0.05, 1.2 + Math.min(1, a.t * 4) * 0.8, 0.35);
        R(-0.3, 1.6, -0.15);
      } else {
        // hit, serve: the arm comes over from behind the head
        const k = Math.min(1, a.t / 0.25);
        R(-0.22, 2.05 - k * 0.9, -0.15 + k * 0.6);
        L(0.25, 1.4, 0.35);
      }
    } else if (r.state === 'toss' && r.server === i) {
      R(-0.25, 2.0, -0.2);
      L(0.15, 1.7, 0.35);
    } else if (r.state === 'play' || r.state === 'serve') {
      if (r.state === 'serve' && r.server === i) {
        L(0.05, 1.05, 0.38);
        R(-0.25, 1.0, 0.25);
      } else {
        R(-0.22, 0.95, 0.32);
        L(0.22, 0.95, 0.32);
      }
    } else return;
    ch.setHandPose?.('relaxed');
  }
  _ball(v, r, people, dt) {
    const C = v.C,
      ball = v.ball,
      b = r.ball;
    let x, z, y;
    if (v.sport === 'hoop' && b.holder >= 0) {
      const p = r.players[b.holder],
        who = people[b.holder],
        h = who ? who.heading : this.g.player.heading,
        [px, pz] = toW(C, p.u, p.v),
        gy = surfaceAt(px, pz),
        fx = Math.sin(h),
        fz = Math.cos(h);
      if (p.shotT >= 0) {
        // up in both hands
        const k = Math.min(1, p.shotT / REL_BEST);
        x = px + fx * 0.3;
        z = pz + fz * 0.3;
        y = gy + 1.15 + 0.85 * k + this._jump(v, r, b.holder);
      } else {
        // dribbling at his right side
        const ph = (r.t * 1.75) % 1,
          hgt = 1 - (2 * ph - 1) ** 2;
        x = px + fx * 0.38 - fz * 0.3;
        z = pz + fz * 0.38 + fx * 0.3;
        y = gy + 0.12 + 0.72 * hgt;
      }
    } else {
      [x, z] = toW(C, b.u, b.v);
      y = surfaceAt(x, z) + b.h;
    }
    ball.m.position.set(x, y, z);
    ball.m.rotation.x += dt * 4;
    ball.s.position.set(x, surfaceAt(x, z) + 0.03, z);
  }
  // sounds, quieter with distance; returns the events
  _sounds(v, r, ev) {
    const g = this.g,
      q = g.player.pos;
    for (const e of ev) {
      const b = r.ball,
        [x, z] = toW(v.C, b.u, b.v),
        k = Math.max(0, 1 - Math.hypot(x - q.x, z - q.z) / 35);
      if (k < 0.03) continue;
      if (e.type === 'bounce') g.audio.noise?.(0.08, 260, 1, 0.35 * k * k, 0, 'lowpass');
      else if (e.type === 'rim') g.audio.noise?.(0.09, 700, 1, 0.4 * k * k, 0, 'bandpass');
      else if (e.type === 'score') g.audio.noise?.(0.22, 3200, 1, 0.3 * k * k, 0, 'highpass');
      else if (e.type === 'touch' || e.type === 'serve')
        g.audio.noise?.(
          0.06,
          e.kind === 'hit' || e.type === 'serve' ? 900 : 600,
          1.2,
          0.35 * k * k,
          0,
          'bandpass'
        );
      else if (e.type === 'land') g.audio.noise?.(0.07, 380, 1, 0.3 * k * k, 0, 'lowpass');
    }
    return ev;
  }
}
