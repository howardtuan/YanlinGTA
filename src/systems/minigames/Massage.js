// 涼韌足體養生（新中北路，店面與店內在 src/world/buildings/MassageShop.js）：走進店裡到櫃台按 E，
// 指定師傅（都可以／阿德師／小珍師）、選方案付錢 → 帶位（腳底按摩坐上躺椅、全身推拿與套餐躺上按摩床，師傅就位開始按）→
// 師傅問力道（輕一點／剛好／再大力一點）→ 時間往後跳方案的分鐘數 → 起身，走路、跑步加速一段時間
// （player.boost：速度 ×1.3，src/entities/Player.js；方案越長越久，不會縮短還沒用完的加速）。
// 營業時間外（店面放下鐵捲門）、或正在跑有時限的任務／比賽時不接客。第一次來師傅會聊到選舉，+2 票（跟麥當勞、茶學苑一樣只有第一次）。
// 價格照中壢一帶足體養生店的行情（腳底按摩約 500–800 元、全身 60 分鐘約 1,000–1,100 元）。
import { createCharacter } from '../../entities/Character.js';
import {
  MASSAGE_BOARD,
  MASSAGE_HOURS,
  MASSAGE_NAME,
  massageOpen,
} from '../../world/buildings/MassageShop.js';

export { MASSAGE_NAME, massageOpen };

// boost: 加速秒數；spot: 'recliner' 坐足底按摩躺椅、'bed' 躺全身按摩床；open: 師傅的開場白
const PLAN = [
  { boost: 180, spot: 'recliner', open: '先泡個腳，水裡有放中藥包，泡十分鐘再開始喔' },
  { boost: 300, spot: 'bed', open: '趴好喔，我先從肩頸開始幫你鬆' },
  { boost: 480, spot: 'bed', open: '先泡腳、按腳底，再幫你全身鬆一鬆，慢慢享受～' },
];
export const MASSAGE_MENU = MASSAGE_BOARD.map(([n, min, p], i) => ({
  n: `${n} ${min} 分鐘`,
  min,
  p,
  ...PLAN[i],
}));

const UNIFORM = { shirt: '#3d5a45', shorts: '#2a2a2a', pants: true, face: true, shoes: '#222' };
export const MASSAGE_STAFF = [
  {
    id: 'de',
    name: '阿德師',
    tag: '男師傅・手勁大',
    kin: '女兒', // who of theirs studies at 中原 (the first-visit vote talk)
    look: { ...UNIFORM, skin: '#e2b48f', hair: '#1d1a17' },
  },
  {
    id: 'zhen',
    name: '小珍師',
    tag: '女師傅・手法細',
    kin: '妹妹',
    look: { ...UNIFORM, skin: '#f1d2bd', hair: '#2b1d14', hairStyle: 'pony' },
  },
];
const DESK = {
  name: '櫃台',
  look: { ...UNIFORM, shirt: '#c9b48a', skin: '#f3d9c4', hair: '#3a2a1c', hairStyle: 'bob' },
};

// what the therapist says to the strength you pick (0 輕一點, 1 剛好, 2 再大力一點)
const FORCE = [
  [
    '輕一點',
    (t) => [
      [t, '好～那我輕輕的'],
      ['彥霖', '……（好舒服，眼皮好重）'],
    ],
  ],
  [
    '剛好',
    (t) => [
      [t, '這個力道剛好。你這裡好緊喔，最近很操齁？'],
      ['彥霖', '發傳單跑了一整天……'],
    ],
  ],
  [
    '再大力一點',
    (t) => [
      [t, '那我要加強囉——'],
      ['彥霖', '啊啊啊啊啊——痛痛痛！'],
      [t, '會痛代表這裡卡住了，忍一下，按開就舒服了'],
    ],
  ],
];
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class Massage {
  // o.makeCharacter: how the staff are made (tests pass a stand-in)
  constructor(game, o = {}) {
    this.g = game;
    this.busy = false; // paid, until you stand up again (src/core/Game.js keeps the player still meanwhile)
    this.sess = null;
    this.voted = false;
    const s = (this.spec = game.interiors?.massage);
    if (!s) return; // the 新中北路 row did not build this shop
    const make = o.makeCharacter || createCharacter;
    const put = (look, at) => {
      const ch = make(look);
      ch.root.position.set(at.x, at.y, at.z);
      ch.root.rotation.y = at.h;
      game.scene.add(ch.root);
      return ch;
    };
    this.desk = { ...DESK, ch: put(DESK.look, s.reception), home: s.reception };
    this.staff = MASSAGE_STAFF.map((st, i) => ({
      ...st,
      ch: put(st.look, s.idle[i]),
      home: s.idle[i],
      mode: null,
      pose: null,
    }));
    game.interiors.actions.push({
      x: s.counter.x,
      z: s.counter.z,
      r: 1.5,
      y: 0,
      label: () =>
        s.closed
          ? `${MASSAGE_NAME}已打烊（營業時間 ${MASSAGE_HOURS.text}）`
          : `按 <kbd>E</kbd> 櫃台：按摩（${MASSAGE_NAME}）`,
      fn: () => this.open(),
    });
    // outside the pulled-down shutter: the hours
    game.interiors.actions.push({
      x: s.door[0],
      z: s.door[1],
      r: 1.6,
      y: 0,
      cond: () => s.closed,
      label: () => `按 <kbd>E</kbd> 看營業時間（${MASSAGE_NAME}）`,
      fn: () =>
        game.hud.toast(`🕐 ${MASSAGE_NAME} 已打烊・營業時間 ${MASSAGE_HOURS.text}`, 'bad', 2600),
    });
    game.interiors.updaters.push((dt) => this.update(dt));
  }

  update(dt) {
    const g = this.g,
      s = this.spec,
      on = !s.closed || this.busy; // a massage that runs past closing time still finishes
    for (const c of [this.desk, ...this.staff]) c.ch.root.visible = on;
    // the strength question was closed (Esc / ×) without an answer: 剛好
    if (this.sess?.asking && !g._modalOpen) this.force(1);
    if (!on) return;
    const p = g.player.pos,
      d2 = (p.x - s.counter.x) ** 2 + (p.z - s.counter.z) ** 2;
    if (d2 > 60 * 60) return; // nobody is watching
    const pw = g.player.worldPos(),
      r = this.desk.ch.root,
      want = d2 < 6 * 6 ? Math.atan2(pw.x - r.position.x, pw.z - r.position.z) : this.desk.home.h;
    r.rotation.y += angDiff(want, r.rotation.y) * Math.min(1, dt * 4);
    this.desk.ch.setDetail?.(d2 < 35 * 35);
    this.desk.ch.update?.(dt, { speed: 0 });
    for (const t of this.staff) {
      t.ch.setDetail?.(d2 < 35 * 35);
      t.ch.update?.(dt, { speed: 0, mode: t.mode, pose: t.pose });
    }
  }

  // the order sheet at the counter: who (都可以 / 阿德師 / 小珍師), then a plan
  open() {
    const g = this.g,
      s = this.spec;
    if (this.busy) return;
    if (s.closed) {
      g.dialog([[DESK.name, `今天打烊囉～營業時間 ${MASSAGE_HOURS.text}，明天再來！`]]);
      return;
    }
    if (g.missions?.timer != null || g.race?.active) {
      g.dialog([[DESK.name, '你一直在看時間耶……在趕什麼齁？先去忙，有空再來放鬆！']]);
      return;
    }
    let pick = 'any';
    document.exitPointerLock?.();
    const who = [['any', '都可以'], ...MASSAGE_STAFF.map((t) => [t.id, `${t.name}（${t.tag}）`])];
    g.modal(
      `💆 ${MASSAGE_NAME}`,
      `<p class="ts-hi">${DESK.name}：「歡迎光臨涼韌～第一次來嗎？要指定師傅嗎？」</p>
      <div class="ts-lbl">指定師傅</div><div class="ts-chips">${who
        .map(
          ([id, t]) =>
            `<button class="ts-chip${id === pick ? ' on' : ''}" data-who="${id}">${t}</button>`
        )
        .join('')}</div>
      <div class="ts-lbl">方案</div><div class="modal-btns">${MASSAGE_MENU.map(
        (it, i) =>
          `<button class="menu-btn" data-i="${i}"><span>${it.n}</span><small>NT$ ${it.p.toLocaleString('en-US')}・加速 ${it.boost / 60} 分鐘</small></button>`
      ).join(
        ''
      )}<button class="menu-btn" id="msBye"><span>下次再來</span><small>ESC</small></button></div>`,
      `零用錢 NT$ ${g.money.toLocaleString('en-US')}・營業時間 ${MASSAGE_HOURS.text}`
    );
    const done = () => {
      g.closeModal();
      g.resume();
    };
    document.getElementById('msBye').onclick = done;
    for (const b of document.querySelectorAll('#modalBody [data-who]'))
      b.onclick = () => {
        pick = b.dataset.who;
        for (const c of document.querySelectorAll('#modalBody [data-who]'))
          c.classList.toggle('on', c === b);
      };
    for (const b of document.querySelectorAll('#modalBody [data-i]'))
      b.onclick = () => {
        done();
        this.buy(MASSAGE_MENU[+b.dataset.i], pick);
      };
  }

  buy(it, pick = 'any') {
    const g = this.g;
    if (!g.spend(it.p, `${MASSAGE_NAME} ${it.n}`)) {
      g.dialog([
        [DESK.name, `${it.n}是 ${it.p.toLocaleString('en-US')} 元喔～`],
        ['彥霖', `（翻錢包）……只剩 ${g.money.toLocaleString('en-US')} 元 😅`],
        [DESK.name, '沒關係，存夠了再來！跑一整天拉票，腳最需要按一下'],
      ]);
      return;
    }
    // 都可以: the 師傅 for the kind of massage (阿德 the feet, 小珍 the full body)
    const t = this.staff.find((x) => x.id === pick) || this.staff[it.spot === 'bed' ? 1 : 0],
      s = this.spec,
      spot = it.spot === 'bed' ? s.beds[0] : s.recliners[1]; // you are the only customer: the middle chair / the first bed
    this.busy = true;
    this.sess = { it, t, spot, asking: false };
    g.dialog([[DESK.name, `好的，${it.n}，${t.name}幫你服務～先換拖鞋，這邊請！`]], () =>
      g.hud.fade(
        '👣 帶位中…',
        () => this.seat(),
        () => this.talk()
      )
    );
  }

  // you on the recliner / bed, the 師傅 at work in front of / beside you, the camera behind you
  seat() {
    const g = this.g,
      { it, t, spot } = this.sess,
      pl = g.player;
    this.sess.seated = true;
    if (it.spot === 'bed') {
      // face down (the head over the face hole); the body centres on the root: 0.12 above the mattress (0.68),
      // as the dorm NPCs sleep
      pl.sitAt(spot.lie.x, spot.lie.z, spot.lie.h, { mode: 'prone', dy: 0.89 });
      this.place(t, spot.stand, null, 'pet');
      g.rig.yaw = spot.lie.h; // from the foot of the bed toward its head
    } else {
      pl.sitAt(spot.seat.x, spot.seat.z, spot.seat.h);
      this.place(t, spot.stool, 'sit', 'pet');
      g.rig.yaw = spot.seat.h;
    }
  }
  // the shot while you lie / sit there (src/core/Game.js calls this after the follow camera, like the job cameras)
  camera(cam) {
    const S = this.sess;
    if (!S?.seated) return;
    const { cam: c, look: l } = S.spot;
    cam.position.set(c.x, c.y, c.z);
    cam.lookAt(l.x, l.y, l.z);
  }
  place(t, at, mode, pose) {
    t.ch.root.position.set(at.x, at.y, at.z);
    t.ch.root.rotation.y = at.h;
    t.mode = mode;
    t.pose = pose;
  }

  talk() {
    const { it, t } = this.sess;
    this.g.dialog(
      [
        [t.name, it.open],
        [t.name, '力道這樣可以嗎？'],
      ],
      () => this.ask()
    );
  }
  ask() {
    const g = this.g,
      { t } = this.sess;
    this.sess.asking = true;
    g.modal(
      `💆 ${t.name}：力道這樣可以嗎？`,
      `<div class="modal-btns">${FORCE.map(
        ([n], i) => `<button class="menu-btn" data-f="${i}"><span>${n}</span></button>`
      ).join('')}</div>`
    );
    for (const b of document.querySelectorAll('#modalBody [data-f]'))
      b.onclick = () => this.force(+b.dataset.f);
  }
  force(i) {
    const g = this.g,
      S = this.sess;
    if (!S?.asking) return;
    S.asking = false;
    g.closeModal();
    g.resume();
    const lines = FORCE[i][1](S.t.name);
    if (!this.voted)
      lines.push(
        [S.t.name, `欸，你是那個在選資管系會長的齁？我${S.t.kin}也念中原，叫她投你啦！`],
        ['彥霖', '真的嗎！謝謝師傅 🙏']
      );
    g.dialog(lines, () => this.finish());
  }

  // the time goes by (the plan's minutes), you get up in the aisle, and walk on lighter feet
  finish() {
    const g = this.g,
      { it, t } = this.sess;
    g.hud.fade(
      '💆 按摩中…',
      () => {
        g.clock += it.min;
        g.hud.setClock?.(g.clock);
        const pl = g.player,
          ex = this.spec.exit;
        this.sess.seated = false;
        pl.standUp();
        pl.place(ex.x, ex.z, ex.h);
        g.rig.yaw = ex.h;
        this.place(t, t.home, null, null);
      },
      () =>
        g.dialog([[t.name, '好了～起來走走看，腳是不是變輕了？歡迎再來！']], () => {
          this.busy = false;
          this.sess = null;
          // longer than whatever boost is still running (a drink's 30 s must not cut it short)
          g.player.boost = Math.max(g.player.boost || 0, it.boost);
          g.audio?.pickup?.();
          g.hud.toast(`💆 ${it.n}：腳步變輕了！走路、跑步加速 ${it.boost / 60} 分鐘`, 'good', 3200);
          if (!this.voted) {
            this.voted = true;
            g.addVotes?.(2, `${t.name}的${t.kin} +2 票`);
          }
        }),
      { midText: `⏳（${it.min} 分鐘後……）`, hold: 1700 }
    );
  }
}
