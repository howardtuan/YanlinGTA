// 搭公車（src/systems/Buses.js 的車）：
//   1. 站牌旁按 E：面板列出這一站各路線、各方向下一班幾分鐘到（遊戲分鐘；現實 4 秒＝遊戲 1 分鐘）
//   2. 車到站開著門時，面板上那一列可以按數字鍵上車，接著選要在哪一站下車（刷卡扣 BUS_FARE）
//   3. 坐車：鏡頭跟在車後面，公車照常開（停站、紅燈）；按 E 快轉直接到站（時間照車程往後撥），
//      按 Esc 在下一站下車。到站開門後玩家站在站牌旁邊
// 跟其他交通工具一樣：打工、站崗、比賽、政見發表中不能搭（src/systems/minigames/PinHanRide.js call 的規則）；
// 騎車、開車時不會出現站牌的 E。
import * as THREE from 'three';
import { surfaceAt } from '../world/Terrain.js';
import { BUS_FARE, MIN_REAL } from './Buses.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmtMin = (sec) => {
  if (sec === null) return '今日已收班';
  if (sec <= 0) return '停靠中';
  const m = Math.ceil(sec / MIN_REAL);
  return m <= 1 ? '即將進站' : `約 ${m} 分`;
};

export class BusRide {
  constructor(game, buses) {
    this.g = game;
    this.buses = buses;
    this.panel = null; // 'list' | 'pick'
    this.P = null; // 站牌
    this.bus = null; // 正在坐的車（Vehicle）
    this.run = null;
    this.to = null; // 下車站 { L, k }（可以在下一段：中北路的站上車、新中北路的站下車）
    this._t = 0;
    this._cam = null;
    const el = (this.el = document.createElement('div'));
    el.id = 'busPanel';
    el.className = 'hidden';
    document.getElementById('app')?.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-n]');
      if (b) this._key(Number(b.dataset.n));
      else if (e.target.closest('[data-x]')) this._esc();
    });
    // 每支站牌一個 E
    const I = game.interiors;
    for (const P of buses.places)
      I.actions.push({
        x: P.x,
        z: P.z,
        r: 3.6,
        y: 0,
        aimY: surfaceAt(P.x, P.z) + 2.1,
        glow: 0.7,
        label: () => `按 <kbd>E</kbd> 看「${esc(P.name)}」公車到站時間`,
        cond: () => !this.bus && !this.panel,
        fn: () => this.open(P),
      });
  }
  get busy() {
    return !!(this.panel || this.bus);
  }
  // 不能搭的原因（跟漢堡車一樣的規則）
  _block() {
    const g = this.g;
    if (g.player.vehicle) return '先下車再搭公車';
    if (g.race?.state && g.race.state !== 'idle') return '比賽中不能搭公車';
    if (g.job?.active || g.gate?.active) return '打工中不能搭公車';
    if (g.speechOn) return '政見發表中不能搭公車';
    return '';
  }
  open(P) {
    this.P = P;
    this.panel = 'list';
    this._t = 0;
    this._render();
  }
  close() {
    this.panel = null;
    this.P = null;
    if (this.run) this.run.hold = false;
    this.el.classList.add('hidden');
  }
  _rows() {
    const B = this.buses;
    return this.P.entries.map(({ L, k }) => {
      const sec = B.etaSec(L, k),
        at = B.atStop(L, k),
        pl = this.g.player.pos;
      const near = at && Math.hypot(at.v.pos.x - pl.x, at.v.pos.z - pl.z) < 22;
      return { L, k, sec, at: near ? at : null };
    });
  }
  _render() {
    const el = this.el;
    if (!this.panel && !this.bus) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const B = this.buses;
    if (this.bus) {
      const r = this.run,
        { L, k } = this.to,
        st = L.stops[k];
      const n =
        B.after(r.L, r.k - 1, 40).findIndex((o) => o.L === L && o.k === k) +
        (r.state === 'dwell' ? 0 : 1);
      el.innerHTML = `<div class="bp-head">🚌 ${esc(r.L.id)} 往 ${esc(r.L.dest)}</div>
        <div class="bp-ride">下車站：<b>${esc(st.name)}</b>${n > 1 ? `（還有 ${n} 站）` : '（下一站）'}</div>
        <div class="bp-foot"><kbd>E</kbd> 快轉到站　<kbd>Esc</kbd> 下一站下車</div>`;
      return;
    }
    const P = this.P;
    if (this.panel === 'pick') {
      const r = this.run;
      this._opts = B.after(r.L, r.k);
      el.innerHTML = `<div class="bp-head">🚌 ${esc(r.L.id)} 往 ${esc(r.L.dest)}</div>
        <div class="bp-sub">要在哪一站下車？（全票 NT$ ${BUS_FARE}）</div>
        ${this._opts
          .map((o, i) => {
            const min = Math.max(1, Math.round(B.rideSec(r.L, r.k, o.L, o.k) / MIN_REAL));
            return `<button class="bp-row" data-n="${i + 1}"><kbd>${i + 1}</kbd><span>${esc(o.L.stops[o.k].name)}</span><em>${min} 分</em></button>`;
          })
          .join('')}
        <div class="bp-foot"><button class="bp-x" data-x="1"><kbd>Esc</kbd> 不搭了</button></div>`;
      return;
    }
    const rows = (this._rowsCache = this._rows());
    el.innerHTML = `<div class="bp-head">🚏 ${esc(P.name)}</div>
      ${rows
        .map((r, i) => {
          const d = r.L;
          const t = r.at ? '停靠中' : fmtMin(r.sec);
          return `<${r.at ? `button data-n="${i + 1}"` : 'div'} class="bp-row${r.at ? ' on' : ''}">
            <b class="bp-no" style="background:${d.livery?.lower || '#1d4f9c'}">${esc(d.id)}</b>
            <span>往 ${esc(d.dest)}<small>${esc(d.def.operator)}・${esc(this._span(d))}</small></span>
            <em>${r.at ? `<kbd>${i + 1}</kbd> 上車` : t}</em></${r.at ? 'button' : 'div'}>`;
        })
        .join('')}
      <div class="bp-foot"><button class="bp-x" data-x="1"><kbd>E</kbd>／<kbd>Esc</kbd> 關閉</button></div>`;
  }
  // 首末班（這個方向開進地圖的時刻）與一天幾班
  _span(L) {
    const f = (m) =>
      `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
    const m = this.buses._head(L).mins;
    return `${f(m[0])}–${f(m[m.length - 1])} 一天 ${m.length} 班`;
  }
  // (L, k) 在同一個方向上的先後
  _ord(L, k) {
    return L.leg * 1000 + k;
  }
  _esc() {
    if (this.bus) {
      // 按下車鈴：在下一站下車
      const r = this.run;
      if (this._ord(r.L, r.k) < this._ord(this.to.L, this.to.k)) this.to = { L: r.L, k: r.k };
      if (r.state === 'dwell' && r.L === this.to.L && r.k === this.to.k) this._alight();
      else
        this.g.hud.toast(
          `🔔 按了下車鈴：在「${this.to.L.stops[this.to.k].name}」下車`,
          'good',
          1800
        );
      this._render();
      return;
    }
    if (this.panel === 'pick') {
      this.run.hold = false;
      this.run = null;
      this.panel = 'list';
      this._render();
      return;
    }
    this.close();
  }
  _key(n) {
    if (this.panel === 'list') {
      const r = this._rowsCache?.[n - 1];
      if (!r?.at) return;
      const why = this._block();
      if (why) {
        this.g.hud.toast(why, 'bad', 2200);
        return;
      }
      if (this.g.money < BUS_FARE) {
        this.g.hud.toast(`錢不夠搭公車（全票 NT$ ${BUS_FARE}）`, 'bad', 2200);
        return;
      }
      if (!this.buses.after(r.L, r.k, 1).length) {
        this.g.hud.toast('這是這條路線在地圖上的最後一站了', 'bad', 2200);
        return;
      }
      this.run = r.at;
      this.run.hold = true;
      this.panel = 'pick';
      this._render();
    } else if (this.panel === 'pick') {
      const o = this._opts?.[n - 1];
      if (o) this._board(o);
    }
  }
  _board(to) {
    const g = this.g,
      r = this.run,
      pl = g.player;
    if (!g.spend(BUS_FARE, `公車 ${r.L.id}`)) return;
    this.bus = r.v;
    this.to = to;
    this.panel = null;
    r.hold = false;
    r.dwell = Math.max(r.dwell, 2.5);
    pl.aboard = this.bus;
    pl.ch.root.visible = false;
    g.hud.toast(`嗶！刷卡 NT$ ${BUS_FARE}，往「${to.L.stops[to.k].name}」`, 'good', 2000);
    this._cam = null;
    this._render();
  }
  // 下車：站在站牌旁（人行道上，面向馬路）
  _alight(st = this.run.L.stops[this.run.k]) {
    const g = this.g,
      pl = g.player,
      id = this.run?.L.id;
    const ox = -st.tz,
      oz = st.tx; // 路的右側（站牌那側）
    const x = st.x + ox * 0.9 - st.tx * 1.5,
      z = st.z + oz * 0.9 - st.tz * 1.5;
    pl.place(x, z, Math.atan2(-ox, -oz));
    pl.y = 0;
    pl.aboard = null;
    pl.ch.root.visible = true;
    this.bus = null;
    if (this.run) this.run.hold = false;
    this.run = null;
    this.to = null;
    this.el.classList.add('hidden');
    g.audio.interact();
    g.hud.toast(`🚏 到站：${st.name}${id ? `（${id}）` : ''}`, 'good', 2200);
  }
  // 快轉：時間照車程往後撥，直接在下車站下車
  _skip() {
    const r = this.run,
      { L, k } = this.to;
    const from = r.state === 'dwell' ? r.k : r.k - 1;
    const sec =
      from >= 0 ? this.buses.rideSec(r.L, from, L, k) : this.buses._secTo(r.L, r.s, r.k, L, k);
    this.g.clock += Math.max(1, sec / MIN_REAL);
    this._alight(L.stops[k]);
  }
  update(dt, inp) {
    if (this.bus) {
      const r = this.run;
      if (!r || r.gone) {
        // 車開出地圖了（不該發生：下車站一定在地圖裡）
        const pl = this.g.player;
        this.bus = null;
        this.run = null;
        pl.aboard = null;
        pl.ch.root.visible = true;
        this.el.classList.add('hidden');
        return;
      }
      if (r.v) this.bus = r.v; // 段與段之間換了一台車（穿過校園）
      if (inp.hit('KeyE')) return this._skip();
      if (inp.hit('Escape')) this._esc();
      if (!this.bus) return;
      // 玩家跟著車（世界的遠近、車流都以玩家位置為準）
      const pl = this.g.player,
        v = this.bus;
      pl.aboard = v;
      pl.pos.set(v.pos.x, surfaceAt(v.pos.x, v.pos.z), v.pos.z);
      const at = this._ord(r.L, r.k),
        want = this._ord(this.to.L, this.to.k);
      if (r.state === 'dwell' && at === want && r.door > 0.6) this._alight();
      else if (at > want) this._alight(this.to.L.stops[this.to.k]);
      if ((this._t += dt) > 0.5) {
        this._t = 0;
        this._render();
      }
      return;
    }
    if (!this.panel) return;
    if (this.panel === 'list' && inp.hit('KeyE')) return this.close();
    if (inp.hit('Escape')) return this._esc();
    for (let n = 1; n <= 9; n++) if (inp.hit(`Digit${n}`, `Numpad${n}`)) this._key(n);
    // 要搭的車開走了：回到列表
    if (this.panel === 'pick' && (!this.run?.v || this.run.state !== 'dwell')) {
      this.run = null;
      this.panel = 'list';
    }
    if ((this._t += dt) > 0.5) {
      this._t = 0;
      this._render();
    }
  }
  // 坐車時的鏡頭：車後上方，看車前方
  camera(cam, dt) {
    if (!this.bus) {
      this._cam = null;
      return;
    }
    const v = this.bus,
      [fx, fz] = v.forward(),
      y = v.mesh.position.y;
    const want = new THREE.Vector3(v.pos.x - fx * 15, y + 6.5, v.pos.z - fz * 15);
    if (!this._cam || this._cam.distanceTo(want) > 40) this._cam = want.clone();
    this._cam.lerp(want, Math.min(1, dt * 2.5));
    cam.position.copy(this._cam);
    cam.lookAt(v.pos.x + fx * 6, y + 2, v.pos.z + fz * 6);
  }
}
