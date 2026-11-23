// 支線「吱吱武嶺跑山受傷」：
//   1. 跟吱吱、女拳大帝「兩個都」加好友後，吱吱馬上私訊邀你週末上武嶺跑山；彥霖要拜票，只能回絕（聊天室唯一的選項）。
//   2. 回絕後遊戲時間 10 分鐘，吱吱打電話求救（手機自動拿出來響）：不接的話，再過遊戲時間 10 分鐘又打來，直到接為止。
//      接通後是語音訊息對話；掛斷後他把影片傳到聊天室，點開是 21:9 的武嶺翻車影片（src/systems/quests/WulingFilm.js）。
//   3. 吱吱手指骨折、手臂和小腿擦傷：要幫他洗「殘廢澡」10 次。每個遊戲天 20:00–24:00 一次，地點是離 276 最近的
//      力行二樓西側浴廁，侯舌在旁邊扶，你負責上肥皂和潑水（小遊戲）。洗滿前每天晚上 8 點吱吱會私訊問你要不要幫他洗
//      （一晚問一次）。漏洗不會怎樣。
//      受傷期間他睡 3 號床、彥霖睡 2 號床（src/entities/npcs/Zz.js）。
//   4. 洗滿 10 次：吱吱康復，送你一件排球 T（衣櫃，src/ui/Wardrobe.js）。
//   5. 之後在聊天室問「你之前受傷還好嗎？」（每個遊戲天一次）：他先把影片再傳一次，80% 說復發了要你當晚再幫他洗一次
//      （洗完給 NT$100），20% 說現在好很多了。復發那晚他一樣 20:00–24:00 在浴室等你；你沒去的話，隔天他就做回自己的事，
//      不用再洗（之後可以再問一次）。
// 進度存在 src/systems/SaveSystem.js 的 zzQuest。
import { createCharacter } from '../../entities/Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { ZZ_LOOK } from '../../entities/npcs/FriendLooks.js';
import { HOUSHE_LOOK } from '../../entities/npcs/Houshe.js';
import { addInjury } from '../../entities/npcs/Zz.js';
import { WulingFilm } from './WulingFilm.js';

const M = (h, m = 0) => h * 60 + m;
const minuteOf = (clock) => ((clock % 1440) + 1440) % 1440;
const dayOf = (clock) => Math.floor(clock / 1440);
const BATH0 = M(20),
  WASHES = 10,
  CALL_GAP = 10;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const VIDEO = { video: 'wuling', text: '[影片] 武嶺 台14甲・行車紀錄' };
const CALL = [
  ['吱吱', '（喘氣）彥霖……彥霖你聽得到嗎……'],
  ['吱吱', '我跟女拳大帝在武嶺……剛剛過彎的時候她突然急煞……'],
  ['吱吱', '我跟太近，直接撞上去，整台車翻過去了 😭'],
  ['女拳大帝', '（旁邊）對不起對不起！！我真的不是故意的！！'],
  ['吱吱', '手指好像斷了……手臂跟腳也磨破一大片……'],
  ['女拳大帝', '（旁邊）我有買保險，你應該也有吧？'],
  ['吱吱', '……沒有。你出發前就買好了，只有我一個人沒買保險 😭 醫藥費要自己出了……'],
  ['吱吱', '救護車來了，我先去醫院……影片我等等傳給你看……'],
];
const NAG = [
  '可以幫我洗殘廢澡嗎 🥲',
  '彥霖～今天還沒洗澡欸……可以幫我洗殘廢澡嗎',
  '我在力行二樓浴室等你喔 🛁 手舉著好痠',
  '拜託拜託 今天的殘廢澡 🙏 侯舌已經在浴室了',
];

export class ZzInjury {
  constructor(game) {
    this.g = game;
    this.state = {
      stage: 'none',
      callAt: null,
      inviteAt: null, // when 吱吱 last asked about 武嶺 (unanswered: he asks again every 10 game minutes)
      washes: 0,
      washDay: null,
      dmAt: null,
      askDay: null,
      relapse: false,
      relapseDay: null, // the day the relapse came up: he waits in the bathroom that night only
      tee: false,
    };
    this.film = new WulingFilm(game);
    this.bathOpen = false;
    this._bath(game);
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
  }
  get injured() {
    return this.state.stage === 'injured';
  }
  get cinema() {
    return this.film.active;
  }
  get busy() {
    return this.film.active || this.bathOpen;
  }
  // 20:00–24:00 and a bath is due today (hurt and not washed yet, or a relapse)
  waiting() {
    const S = this.state,
      m = minuteOf(this.g.clock);
    if (m < BATH0) return false;
    return (S.stage === 'injured' && S.washDay !== dayOf(this.g.clock)) || !!S.relapse;
  }
  _chat() {
    return this.g.phone?.chats.find((st) => st.c.id === 'zz');
  }
  // his messages arrive one by one in the 吱吱 chat (with a notice when you aren't looking at it)
  _say(lines, then) {
    const st = this._chat();
    if (!st) return false;
    this.g.phone._deliver(
      st,
      lines.map((l) => (typeof l === 'string' ? { who: 'zz', text: l } : { who: 'zz', ...l })),
      0,
      400,
      then
    );
    return true;
  }
  // nothing else is going on: the phone can ring / a film can start
  _free() {
    const g = this.g;
    return (
      g.state === 'play' &&
      !g.hud.inDialog &&
      !g.hud.bigOpen &&
      !g._modalOpen &&
      !g._sleeping &&
      !g.airdrop?.cinema &&
      !g.drone?.active &&
      !g.mingshan?.cinema &&
      !this.busy &&
      !g.job?.active &&
      !g.gate?.active &&
      !g.pc?.isOpen &&
      !g.wardrobe?.isOpen &&
      !g.race?.locked &&
      !g.videoOpen &&
      !g.speechOn &&
      !g.phone?.call
    );
  }

  // ---------------- every frame ----------------
  update(dt) {
    const g = this.g,
      S = this.state,
      F = g.friends;
    if (S.stage === 'none') {
      if (F?.added.has('zz') && F.added.has('gd') && this._chat() && !this._chat().busy) {
        S.stage = 'invited';
        S.inviteAt = g.clock;
        g._saveT = 9.5;
        this._say([
          '欸彥霖！你也加女拳大帝好友了喔 😆',
          "這週末要不要一起上武嶺跑山！我們騎 BW'S 衝合歡山 🏔️🛵",
          '女拳大帝剛考到駕照，說要一起去練技術，三台一起騎超讚',
        ]);
      }
      return;
    }
    if (S.stage === 'invited') this._reinvite();
    if (S.relapse && this._relapseOver()) S.relapse = false; // you didn't come: the next day he goes on with his life
    if (S.stage === 'declined' && g.clock >= S.callAt && this._free()) this._ring();
    if (this.waiting()) this._nag();
    this._bathTick(dt);
  }
  // the invite is still unanswered (the chat only offers the 回絕 line until then): 10 game minutes later he asks again
  _reinvite() {
    const g = this.g,
      S = this.state;
    if (S.inviteAt == null) S.inviteAt = g.clock; // a save from before this was kept
    const st = this._chat();
    if (g.clock - S.inviteAt < CALL_GAP || !st || st.busy) return;
    S.inviteAt = g.clock;
    g._saveT = 9.5;
    this._say([
      pick([
        '欸 武嶺到底要不要去啦 🏔️ 回我一下',
        '彥霖～跑山的事你還沒回我欸 🛵',
        "女拳大帝在問你要不要一起騎 BW'S 上武嶺 😆",
      ]),
    ]);
  }
  _ring() {
    const g = this.g,
      S = this.state;
    S.callAt = Infinity; // ringing
    g.phone.ring({
      id: 'zz',
      name: '排球少年 吱吱',
      avatar: '<img class="ph-avimg" src="assets/gram/zz_av.jpg" alt="">',
      color: '#7a1f2c',
      lines: CALL,
      onDecline: () => {
        S.callAt = g.clock + CALL_GAP;
      },
      onEnd: () => this._afterCall(),
    });
  }
  _afterCall() {
    const g = this.g,
      S = this.state;
    S.stage = 'injured';
    S.washes = 0;
    S.washDay = null;
    S.dmAt = null;
    g._saveT = 9.5;
    g.hud.toast('🚑 支線：吱吱武嶺跑山受傷', 'good', 3200);
    this._say([
      VIDEO,
      '你看……我真的摔慘了 😭',
      '女拳大帝過彎突然急煞，我跟太近直接撞上去',
      '醫生說手指骨折，手臂跟小腿也擦傷一大片 🩹',
      '而且就我一個沒買保險……錢包也骨折了 💸',
      '拜託……接下來可以幫我洗殘廢澡嗎 🥲 手不能碰水',
      '晚上 8 點到 12 點，力行二樓離我們寢室最近那間浴室，侯舌也會來幫忙',
      '我這陣子先睡你的 3 號床喔，上舖我爬不上去……你先睡 2 號 🙏',
    ]);
  }
  // a relapse lasts for the day it came up (an older save without relapseDay: from now)
  _relapseOver() {
    const S = this.state,
      day = dayOf(this.g.clock);
    if (S.relapseDay == null) S.relapseDay = day;
    return day > S.relapseDay;
  }
  // a bath is due tonight: he asks once, at 20:00 (or as soon as the evening is under way and he can text)
  _nag() {
    const g = this.g,
      S = this.state;
    if (S.dmAt != null && dayOf(S.dmAt) === dayOf(g.clock)) return; // already asked tonight
    const st = this._chat();
    if (!st || st.busy) return;
    S.dmAt = g.clock;
    this._say([
      S.relapse && S.stage === 'done'
        ? pick(['又復發了……今晚可以再幫我洗一次嗎 🥲', '手指又在痛了 今天拜託再洗一次 🛁'])
        : pick(NAG),
    ]);
  }

  // ---------------- the chat options (src/ui/phone/Chats.js zz.always) ----------------
  decline() {
    const g = this.g,
      S = this.state;
    S.stage = 'declined';
    S.callAt = g.clock + CALL_GAP;
    g._saveT = 9.5;
    return { r: ['蛤～好啦，選舉比較重要', '那我揪女拳大帝去，到時候拍照給你看 📸'] };
  }
  review() {
    const g = this.g,
      S = this.state;
    S.askDay = dayOf(g.clock);
    g._saveT = 9.5;
    if (Math.random() < 0.8) {
      S.relapse = true;
      S.relapseDay = dayOf(g.clock);
      // he asks for tonight's bath in this answer: no 20:00 message on top if it is already evening
      S.dmAt = minuteOf(g.clock) >= BATH0 ? g.clock : null;
      return {
        r: [
          VIDEO,
          '那次真的摔很嚴重……現在看還是會怕',
          '而且……手指好像又復發了 🥲',
          '今晚 8 點到 12 點可以再幫我洗一次嗎？在力行二樓浴室',
        ],
      };
    }
    return { r: [VIDEO, '那次真的摔很嚴重……現在看還是會怕', '不過現在好很多了 💪 謝啦兄弟'] };
  }
  playVideo() {
    const g = this.g,
      back = g.phone.open && g.phone.cur?.c.id === 'zz';
    if (g.phone.open) g.phone.close();
    this.film.play(() => {
      if (back) {
        g.openPhone();
        const st = this._chat();
        if (st) g.phone.openChat(st);
      } else g.lockPointer?.();
    });
  }

  // ---------------- the bathroom (力行 2F, west end): 吱吱 waits there, 侯舌 helps ----------------
  _bath(game) {
    const L = game.interiors.lixing,
      B = L?.bathW;
    if (!B) return;
    const f = 1,
      cx = B.x0 + (B.x1 - B.x0) * 0.6,
      cz = (B.z0 + B.z1) / 2 + 0.6;
    const at = (lx, lz) => {
      const [x, z] = L.W(lx, lz);
      return { x, z, y: L.B + L.FL[f] };
    };
    const spot = (this.bathSpot = at(cx, cz)),
      hs = at(cx + 0.2, cz + 1.0);
    const zz = (this.bz = createCharacter({ ...ZZ_LOOK, shirt: ZZ_LOOK.skin, shoes: '#2a6fdb' })); // shirtless, shorts and blue slippers
    const t = makeLabel('🛁 吱吱', { height: 0.24, size: 40, color: '#ffd23f' });
    t.position.set(0, 1.85, 0);
    zz.root.add(t);
    this.bzHurt = addInjury(zz);
    zz.root.position.set(spot.x, spot.y, spot.z);
    zz.root.rotation.y = L.k.heading(Math.PI / 2);
    zz.root.visible = false;
    game.scene.add(zz.root);
    const hou = (this.bh = createCharacter(HOUSHE_LOOK));
    const t2 = makeLabel('📷 侯舌（幫忙中）', { height: 0.22, size: 36, color: '#ffd1dc' });
    t2.position.set(0, 1.85, 0);
    hou.root.add(t2);
    hou.root.position.set(hs.x, hs.y, hs.z);
    hou.root.rotation.y = Math.atan2(spot.x - hs.x, spot.z - hs.z);
    hou.root.visible = false;
    game.scene.add(hou.root);
    game.interiors.actions.push({
      x: spot.x,
      z: spot.z,
      r: 2.2,
      y: spot.y - surfaceAt(spot.x, spot.z),
      cond: () => this.waiting() && !this.bathOpen,
      label: () =>
        this.state.stage === 'done'
          ? '按 <kbd>E</kbd> 幫吱吱再洗一次殘廢澡（復發）'
          : `按 <kbd>E</kbd> 幫吱吱洗殘廢澡（${this.state.washes}/${WASHES}）`,
      fn: () => this.openBath(),
    });
  }
  _bathTick(dt) {
    const g = this.g,
      on = this.waiting() || this.bathOpen;
    if (!this.bz) return;
    const p = g.player.pos,
      s = this.bathSpot,
      near = on && Math.hypot(p.x - s.x, p.z - s.z) < 40 && Math.abs(p.y - s.y) < 3;
    this.bz.root.visible = near;
    this.bh.root.visible = near;
    if (!near) return;
    this.bzHurt.set(true);
    const sway = Math.sin(g.time * 1.3);
    this.bz.update(dt, { speed: 0, mode: 'foot', pose: g.hud.inDialog ? 'talk' : null });
    this.bh.update(dt, { speed: 0, mode: 'foot', pose: sway > 0.6 ? 'give' : null });
  }

  // the mini-game: 1 肥皂 on each spot, then 2 潑水 to rinse it; the cast (and the gauze) must stay dry
  openBath() {
    const g = this.g;
    if (this.bathOpen) return;
    this.bathOpen = true;
    g.input.enabled = false;
    g.input.releaseAll?.();
    document.exitPointerLock?.();
    let el = document.getElementById('zzBath');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zzBath';
      el.className = 'hidden';
      document.body.appendChild(el);
    }
    const relapse = this.state.stage === 'done';
    el.innerHTML = `<div class="zb-card"><div class="zb-head"><b>🛁 幫吱吱洗殘廢澡</b><small>${relapse ? '復發・再洗一次' : `第 ${this.state.washes + 1} / ${WASHES} 次`}</small></div>
      <div class="zb-tools"><button class="zb-tool on" data-t="soap">🧼 上肥皂 <kbd>1</kbd></button><button class="zb-tool" data-t="water">🪣 潑水 <kbd>2</kbd></button></div>
      <div class="zb-stage"><canvas width="640" height="480"></canvas></div>
      <div class="zb-say"></div><div class="zb-foot"><span class="zb-prog"></span><span><kbd>Esc</kbd> 先不洗了</span></div></div>`;
    el.classList.remove('hidden');
    const cv = el.querySelector('canvas'),
      x = cv.getContext('2d');
    // spots (canvas px): soap first, then rinse; DANGER: the raised cast and the gauze
    const SP = [
      ['頭髮', 320, 92],
      ['左肩', 262, 178],
      ['右肩', 378, 178],
      ['胸口', 320, 210],
      ['肚子', 320, 268],
      ['左小腿', 296, 410],
    ].map(([n, X, Y]) => ({ n, x: X, y: Y, soap: 0, rinsed: false }));
    const CAST = { x: 410, y: 70, r: 46 },
      GAUZE = [
        { x: 228, y: 290, r: 26, n: '左手臂的紗布' },
        { x: 344, y: 404, r: 26, n: '右小腿的紗布' },
      ];
    const S = {
      tool: 'soap',
      oops: 0,
      splash: [],
      foam: [],
      done: false,
      say: '侯舌：「我扶著他，你先幫他每個地方抹肥皂，再潑水沖掉。石膏不能碰水喔！」',
    };
    const say = (t) => {
      S.say = t;
      el.querySelector('.zb-say').innerHTML = t;
    };
    say(S.say);
    const setTool = (t) => {
      S.tool = t;
      el.querySelectorAll('.zb-tool').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    };
    el.querySelectorAll('.zb-tool').forEach((b) => (b.onclick = () => setTool(b.dataset.t)));
    const prog = () => {
      const n = SP.filter((s) => s.rinsed).length;
      el.querySelector('.zb-prog').textContent = `沖乾淨 ${n}/${SP.length}・石膏危機 ${S.oops} 次`;
    };
    prog();
    const hit = (cx, cy) => {
      if (S.done) return;
      const d = (o) => Math.hypot(o.x - cx, o.y - cy);
      if (d(CAST) < CAST.r + (S.tool === 'water' ? 20 : 0)) {
        S.oops++;
        g.audio.bad?.();
        say(
          S.tool === 'water'
            ? '吱吱：「<b>啊啊啊啊！石膏不能碰水啦！！</b>」　侯舌：「欸欸欸小心他的手！」'
            : '吱吱：「那是石膏啦！不用抹肥皂 😭」'
        );
        prog();
        if (S.tool === 'water') S.splash.push({ x: cx, y: cy, t: 0 });
        return;
      }
      const gz = GAUZE.find((o) => d(o) < o.r);
      if (gz && S.tool === 'water') {
        S.oops++;
        g.audio.bad?.();
        say(`吱吱：「<b>${gz.n}不能弄濕啦！</b>」　侯舌：「潑旁邊一點啦 😂」`);
        S.splash.push({ x: cx, y: cy, t: 0 });
        prog();
        return;
      }
      const sp = SP.filter((o) => d(o) < 42).sort((a, b) => d(a) - d(b))[0];
      if (S.tool === 'water') S.splash.push({ x: cx, y: cy, t: 0 });
      if (!sp) {
        if (S.tool === 'water')
          say(pick(['吱吱：「潑到牆壁了啦 哈哈」', '侯舌：「欸潑到我了！」']));
        return;
      }
      if (S.tool === 'soap') {
        if (sp.rinsed) {
          say(`吱吱：「${sp.n}已經洗好了啦」`);
          return;
        }
        sp.soap = Math.min(3, sp.soap + 1.5);
        g.audio.pop?.();
        for (let i = 0; i < 6; i++)
          S.foam.push({
            s: sp,
            dx: (Math.random() - 0.5) * 50,
            dy: (Math.random() - 0.5) * 36,
            r: 6 + Math.random() * 9,
          });
        say(sp.soap >= 3 ? `${sp.n}泡泡抹好了！　吱吱：「好香喔 🧼」` : `再抹一下${sp.n}～`);
      } else {
        if (!sp.soap) {
          say(`侯舌：「${sp.n}還沒抹肥皂啦，先用 🧼」`);
          return;
        }
        if (sp.soap < 3) {
          say(`${sp.n}泡泡還不夠，再抹一下肥皂`);
          return;
        }
        sp.rinsed = true;
        sp.soap = 0;
        S.foam = S.foam.filter((f) => f.s !== sp);
        g.audio.pickup?.();
        say(
          pick([
            `${sp.n}沖乾淨了！　吱吱：「好涼 🥶」`,
            `${sp.n}沖好了　侯舌：「漂亮，下一個」`,
            `${sp.n}乾淨溜溜 ✨`,
          ])
        );
        prog();
        if (SP.every((s) => s.rinsed)) {
          S.done = true;
          say('吱吱：「洗好了！！清爽～ 謝啦彥霖 🥹」');
          setTimeout(() => finish(true), 1300);
        }
      }
    };
    const rel = (e) => {
      const r = cv.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 640, ((e.clientY - r.top) / r.height) * 480];
    };
    cv.onpointerdown = (e) => {
      e.preventDefault();
      hit(...rel(e));
    };
    const key = (e) => {
      if (!this.bathOpen) return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') setTool('soap');
      else if (e.code === 'Digit2' || e.code === 'Numpad2') setTool('water');
      else if (e.code === 'Escape') finish(false);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    addEventListener('keydown', key, true);
    // drawing
    let raf = 0,
      last = performance.now();
    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      x.fillStyle = '#d6ecf5';
      x.fillRect(0, 0, 640, 480);
      x.strokeStyle = 'rgba(120,160,180,.35)';
      x.lineWidth = 1;
      for (let i = 0; i <= 640; i += 40) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i, 480);
        x.stroke();
      }
      for (let j = 0; j <= 480; j += 40) {
        x.beginPath();
        x.moveTo(0, j);
        x.lineTo(640, j);
        x.stroke();
      }
      const skin = '#f0cfb0';
      // 侯舌 at the right, holding 吱吱's shoulder
      x.fillStyle = '#ffd1dc';
      x.fillRect(500, 180, 90, 170);
      x.fillStyle = '#e8c3a2';
      x.beginPath();
      x.arc(545, 140, 34, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#2a2a2a';
      x.beginPath();
      x.arc(545, 128, 34, Math.PI, 0);
      x.fill();
      x.strokeStyle = '#e8c3a2';
      x.lineWidth = 18;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(505, 200);
      x.lineTo(392, 182);
      x.stroke();
      x.fillStyle = '#333';
      x.font = '700 15px "Noto Sans TC",sans-serif';
      x.textAlign = 'center';
      x.fillText('侯舌', 545, 375);
      // 吱吱: shirtless, black shorts, right arm (cast) held up high
      x.strokeStyle = skin;
      x.lineWidth = 26;
      x.beginPath();
      x.moveTo(372, 170);
      x.lineTo(405, 120);
      x.lineTo(410, 82);
      x.stroke(); // right arm up
      x.beginPath();
      x.moveTo(268, 170);
      x.lineTo(240, 240);
      x.lineTo(226, 300);
      x.stroke(); // left arm down
      x.fillStyle = skin;
      x.beginPath();
      x.roundRect(262, 160, 116, 150, 26);
      x.fill(); // torso
      x.fillStyle = '#161616';
      x.fillRect(262, 296, 116, 56); // shorts
      x.strokeStyle = skin;
      x.lineWidth = 30;
      x.beginPath();
      x.moveTo(296, 350);
      x.lineTo(296, 440);
      x.stroke();
      x.beginPath();
      x.moveTo(344, 350);
      x.lineTo(344, 440);
      x.stroke();
      x.fillStyle = '#2a6fdb';
      x.fillRect(278, 438, 36, 14);
      x.fillRect(326, 438, 36, 14); // slippers
      x.fillStyle = skin;
      x.beginPath();
      x.arc(320, 108, 44, 0, Math.PI * 2);
      x.fill(); // head
      x.fillStyle = '#b8502a';
      x.beginPath();
      x.arc(320, 96, 45, Math.PI * 1.05, Math.PI * 1.95);
      x.fill();
      x.fillStyle = '#222';
      x.beginPath();
      x.arc(305, 112, 4, 0, 7);
      x.arc(335, 112, 4, 0, 7);
      x.fill();
      x.strokeStyle = '#7a3b2a';
      x.lineWidth = 3;
      x.beginPath();
      x.arc(320, 128, 10, 0.2, Math.PI - 0.2);
      x.stroke();
      // cast and gauze
      x.fillStyle = '#ffffff';
      x.strokeStyle = '#c9c9c9';
      x.lineWidth = 2;
      x.beginPath();
      x.roundRect(392, 44, 36, 52, 10);
      x.fill();
      x.stroke();
      x.fillStyle = '#c62828';
      x.font = '700 12px sans-serif';
      x.fillText('石膏 💧✕', 410, 36);
      for (const o of GAUZE) {
        x.fillStyle = '#f1ece2';
        x.fillRect(o.x - 18, o.y - 14, 36, 28);
        x.strokeStyle = '#d8cfc0';
        x.strokeRect(o.x - 18, o.y - 14, 36, 28);
      }
      // spots: a ring where to work, foam, a check when rinsed
      for (const s of SP) {
        if (s.rinsed) {
          x.fillStyle = 'rgba(46,160,90,.9)';
          x.font = '700 18px sans-serif';
          x.fillText('✓', s.x, s.y + 6);
          continue;
        }
        x.strokeStyle = s.soap >= 3 ? 'rgba(30,136,229,.9)' : 'rgba(255,152,0,.85)';
        x.lineWidth = 3;
        x.setLineDash([6, 5]);
        x.beginPath();
        x.arc(s.x, s.y, 24 + Math.sin(now / 250) * 2, 0, 7);
        x.stroke();
        x.setLineDash([]);
      }
      for (const f of S.foam) {
        x.fillStyle = 'rgba(255,255,255,.92)';
        x.strokeStyle = 'rgba(160,200,230,.8)';
        x.lineWidth = 1.5;
        x.beginPath();
        x.arc(f.s.x + f.dx, f.s.y + f.dy, f.r, 0, 7);
        x.fill();
        x.stroke();
      }
      for (const sp of S.splash) {
        sp.t += dt;
        const r = 10 + sp.t * 140,
          a = Math.max(0, 1 - sp.t * 2.2);
        x.strokeStyle = `rgba(30,136,229,${a})`;
        x.lineWidth = 4;
        x.beginPath();
        x.arc(sp.x, sp.y, r, 0, 7);
        x.stroke();
        for (let i = 0; i < 8; i++) {
          const an = (i / 8) * 6.28;
          x.fillStyle = `rgba(80,170,240,${a})`;
          x.beginPath();
          x.arc(sp.x + Math.cos(an) * r * 0.8, sp.y + Math.sin(an) * r * 0.8, 4, 0, 7);
          x.fill();
        }
      }
      S.splash = S.splash.filter((s) => s.t < 0.5);
      x.fillStyle = '#1e3a4a';
      x.font = '700 14px "Noto Sans TC",sans-serif';
      x.textAlign = 'left';
      x.fillText(S.tool === 'soap' ? '🧼 點橘色圈圈抹肥皂' : '🪣 點藍色圈圈潑水沖掉', 12, 22);
      x.textAlign = 'center';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const finish = (ok) => {
      if (!this.bathOpen) return;
      this.bathOpen = false;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', key, true);
      el.classList.add('hidden');
      g.input.enabled = true;
      if (!g.input.touch) g.lockPointer?.();
      if (ok) this._washed(S.oops);
      else g.hud.toast('🛁 先不洗了（今晚 12 點前都可以再來）', 'good', 2200);
    };
  }
  _washed(oops) {
    const g = this.g,
      S = this.state;
    S.washDay = dayOf(g.clock);
    S.dmAt = null;
    g._saveT = 9.5;
    if (S.stage === 'done') {
      S.relapse = false;
      g.earn(100, '吱吱：復發那次的謝禮');
      g.dialog([
        ['吱吱', '呼～又活過來了 🥹 這 100 塊請你喝飲料'],
        ['侯舌', '你們兩個洗澡比我寫程式還吵 😂'],
      ]);
      return;
    }
    S.washes++;
    const left = WASHES - S.washes;
    if (left > 0) {
      g.dialog([
        [
          '吱吱',
          oops
            ? `洗好了……雖然石膏差點被潑到 ${oops} 次 😭`
            : '洗好了！今天完全沒碰到石膏，你技術越來越好了 👍',
        ],
        ['侯舌', `還剩 ${left} 次，明天晚上 8 點見`],
      ]);
      g.hud.toast(`🛁 殘廢澡 ${S.washes}/${WASHES}`, 'good', 2400);
      return;
    }
    // the tenth: he is well again
    S.stage = 'done';
    S.tee = true;
    g.audio.fanfare?.();
    g.dialog(
      [
        ['吱吱', '十次！！醫生說我好了，可以拆石膏了 🥹'],
        ['吱吱', '這件中原排球的 T 送你，背號 7 是我的幸運號碼'],
        ['侯舌', '終於不用每天晚上來浴室上班了 😂'],
        ['吱吱', '選舉我們系排全力挺你！🏐🔥'],
      ],
      () => g.hud.bigToast('支線完成：吱吱武嶺跑山受傷', '獲得「排球 T」👕 回家打開衣櫃就能換上')
    );
  }
}
