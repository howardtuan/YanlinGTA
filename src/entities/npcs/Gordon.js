// 戈登肉鋪：校史館前草坪上的高級肉鋪，建築在 src/world/Interiors.js（buildGordon）。
// 在冷凍櫃前按 E 挑肉放進購物籃，到櫃台按 E 找店長「女拳大帝」用 Peach Pay 結帳；
// 結完帳如果還不是好友，他會問要不要互加（src/ui/phone/Friends.js，訊息＋Peachgram）。
// 購物籃與買過的東西會存檔（src/systems/SaveSystem.js 的 gordon）。
// 營業時間 08:00–23:00（src/world/buildings/GordonShop.js 拉鐵門、關燈）；其他時間店長女拳大帝在力行宿舍 279 寢：00:00–08:00 睡在 4 號床（高架床），
// 23:00–24:00 在 4 號床下的書桌打 LOL。
// 起床鬧鐘：06:00 起他放在床下書桌上的手機一直響（assets/sfx/gd/alarm.mp3，越靠近越大聲），他自己從來不關，響到 08:00 去上班；
// 你可以走到書桌前按 E 幫他關掉（也可以不管它）。室友漢克、霍華德很困擾，但大家都習慣了。
// 關掉的話他會睡過頭：那天 08:40 才醒、戈登肉鋪晚 40 分鐘開（src/world/buildings/GordonShop.js 看 overslept）；
// 是好友的話，他醒來會很生氣地私訊你，問你為什麼要關，害他上班遲到。
// 在宿舍找他：沒跟他買過東西又不是好友的話，他只會叫你別吵，室友會小聲提醒你要先去買他的肉才加得到好友。
// 有些晚上 23:00–23:40 他跟吱吱各騎自己的 BW'S 去兜風（src/entities/npcs/Zz.js 的 gdOut），那段時間不在寢室。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { GD_LOOK } from './FriendLooks.js';
import { serviceWear } from './Service.js';

export const GD_ZONES = {
  hotpot: {
    name: '火鍋區',
    items: [
      { id: 'beefPlate', name: '牛五花火鍋片', w: '300g', price: 260, icon: '🥩' },
      { id: 'porkPlate', name: '梅花豬火鍋片', w: '300g', price: 180, icon: '🥓' },
      { id: 'rib', name: '霜降牛肋條', w: '500g', price: 320, icon: '🍖' },
      { id: 'tongue', name: '安格斯牛舌片', w: '200g', price: 390, icon: '👅' },
    ],
  },
  bbq: {
    name: '燒烤區',
    items: [
      { id: 'shortRib', name: '美國 Choice 牛小排', w: '300g', price: 450, icon: '🥩' },
      { id: 'porkChop', name: '戰斧豬排', w: '2 片', price: 360, icon: '🍖' },
      { id: 'lamb', name: '法式羊排', w: '4 支', price: 480, icon: '🍖' },
      { id: 'sausage', name: '德式香腸', w: '5 條', price: 150, icon: '🌭' },
    ],
  },
  steak: {
    name: '牛排區',
    items: [
      { id: 'ribeye', name: '美國 Prime 肋眼牛排', w: '350g', price: 680, icon: '🥩' },
      { id: 'strip', name: '紐約客牛排', w: '300g', price: 520, icon: '🥩' },
      { id: 'filet', name: '菲力牛排', w: '200g', price: 620, icon: '🥩' },
      { id: 'tomahawk', name: '戰斧牛排', w: '1.2kg', price: 1880, icon: '🪓' },
    ],
  },
  wagyu: {
    name: '和牛區',
    items: [
      { id: 'm9', name: '澳洲和牛 M9 菲力', w: '200g', price: 1280, icon: '🐂' },
      { id: 'a5', name: '日本 A5 和牛沙朗', w: '150g', price: 1580, icon: '🇯🇵' },
      { id: 'patty', name: '和牛漢堡排', w: '2 片', price: 260, icon: '🍔' },
    ],
  },
  sea: {
    name: '海鮮區',
    items: [
      { id: 'salmon', name: '挪威鮭魚菲力', w: '250g', price: 290, icon: '🐟' },
      { id: 'prawn', name: '大明蝦', w: '8 隻', price: 350, icon: '🦐' },
      { id: 'scallop', name: '北海道干貝', w: '6 顆', price: 420, icon: '🐚' },
    ],
  },
};
const ITEM = {};
for (const z of Object.values(GD_ZONES)) for (const it of z.items) ITEM[it.id] = it;
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
const KEEPER = '女拳大帝';
const ALARM_SRC = 'assets/sfx/gd/alarm.mp3';
const ALARM_AT = 6 * 60; // 06:00, rings until he gets up for work at 08:00
const ALARM_R = 22; // metres: how far down the corridor you can still hear it
const LATE = 40; // minutes he oversleeps when you turned his alarm off
const ANGRY = [
  '誰把我的鬧鐘關掉的！！😡',
  '漢克說是你？？彥霖你幹嘛關啦',
  '我就是靠那個鬧鐘起床的欸，沒響我根本聽不到',
  '現在上班要遲到了啦！！店長遲到很難看你知道嗎 😤',
  '下次不准再關，不然肉不賣你',
];
// 店長的個性：火爆、愛健身、打 LOL 很在意輸贏、超愛麥當勞
const IDLE = [
  [[KEEPER, '要買就快點挑，我等等還要排位！🔥']],
  [
    [KEEPER, '昨天 LOL 被隊友坑到輸三場，今天別惹我。'],
    [KEEPER, '……肉要什麼自己去冷凍櫃看！'],
  ],
  [
    [KEEPER, '剛練完腿來顧店，站著都在抖。'],
    [KEEPER, '牛排區的肋眼今天油花超漂亮，不買是你的損失。'],
  ],
  [
    [KEEPER, '中午又吃麥當勞，大麥克配薯條才是人生 🍔'],
    [KEEPER, '你要買肉就去冷凍櫃挑，挑好拿來櫃台。'],
  ],
  [
    [KEEPER, '輸贏很重要好嗎！打遊戲輸、做生意也不能輸。'],
    [KEEPER, '和牛區那兩塊是今天最好的，看你識不識貨。'],
  ],
];
const PAID = [
  [
    [KEEPER, '結好了！發票放袋子裡。'],
    [KEEPER, '回去馬上冰起來，聽到沒！🔥'],
  ],
  [[KEEPER, '眼光不錯嘛，這塊煎五分熟就好，煎過頭我會生氣。']],
  [[KEEPER, '謝啦！賺到錢今晚去吃麥當勞慶祝 🍟']],
];
const BROKE = [
  [KEEPER, '錢不夠還敢來結帳？😤'],
  [KEEPER, '去麥當勞打工賺夠了再來！順便幫我帶一份大麥克。'],
];

export class Gordon {
  constructor(game) {
    this.g = game;
    this.basket = {};
    this.bought = {};
    this.spent = 0;
    const S = game.interiors.gordon;
    if (!S) return;
    this.S = S;
    const A = game.interiors.actions;
    for (const f of S.freezers)
      A.push({
        x: f.x,
        z: f.z,
        r: f.r,
        y: 0,
        anyY: true,
        cond: () => !S.closed,
        label: () => `按 <kbd>E</kbd> 看${GD_ZONES[f.zone].name}的冷凍櫃`,
        fn: () => this.browse(f.zone),
      });
    if (S.front)
      A.push({
        x: S.front.x,
        z: S.front.z,
        r: 2.2,
        y: 0,
        cond: () => S.closed,
        label: () => '戈登肉鋪已打烊（營業時間 08:00–23:00）',
        fn: (g) =>
          g.hud.toast(
            this.asleep
              ? '🥩 戈登肉鋪已打烊，店長還在宿舍睡覺，早上 8 點再來吧'
              : '🥩 戈登肉鋪已打烊，店長回宿舍打 LOL 了，早上 8 點再來吧',
            'good',
            2400
          ),
      });
    this._dorm(game);
    A.push({
      x: S.counter.x,
      z: S.counter.z,
      r: 1.7,
      y: 0,
      anyY: true,
      cond: () => !S.closed,
      label: () =>
        this.g.mahjong?.has('gd')
          ? `店長${KEEPER}被揪去力行 277 打麻將了 🀄（等他回來再結帳）`
          : this.count
            ? `按 <kbd>E</kbd> 跟${KEEPER}結帳（${this.count} 件・NT$ ${this.total}）`
            : `按 <kbd>E</kbd> 和店長${KEEPER}說話`,
      fn: () =>
        this.g.mahjong?.has('gd')
          ? this.g.hud.toast(`🀄 ${KEEPER}去力行 277 打麻將了，櫃台沒人`, 'bad', 2200)
          : this.count
            ? this.checkout()
            : this.g.dialog(IDLE[Math.floor(Math.random() * IDLE.length)]),
    });
  }
  get count() {
    return Object.values(this.basket).reduce((s, n) => s + n, 0);
  }
  get total() {
    return Object.entries(this.basket).reduce((s, [id, n]) => s + (ITEM[id]?.price || 0) * n, 0);
  }
  // ---- modal helpers: the game keeps running behind (player frozen while it's up), Esc closes it ----
  _open(title, html, sub) {
    const g = this.g;
    document.exitPointerLock?.();
    g.modal(title, html, sub);
    if (!this._key) {
      this._key = (e) => {
        if (!g._modalOpen || !this._ui) return;
        if (e.code === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this._close();
          return;
        }
        const n = /^(Digit|Numpad)([1-9])$/.exec(e.code);
        if (n) {
          e.preventDefault();
          e.stopPropagation();
          this._ui.digit?.(+n[2] - 1);
        }
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          e.preventDefault();
          e.stopPropagation();
          this._ui.enter?.();
        }
      };
      addEventListener('keydown', this._key, true);
    }
  }
  _close() {
    this._ui = null;
    this.g.closeModal();
    this.g.resume();
  }
  _foot() {
    return `<div class="gd-foot"><span>🧺 購物籃 <b>${this.count}</b> 件・<b>NT$ ${this.total}</b></span><span>💳 Peach Pay <b>NT$ ${this.g.money}</b></span></div>`;
  }
  // a freezer: add items to the basket (click, or keys 1-9)
  browse(zone) {
    const Z = GD_ZONES[zone],
      g = this.g;
    const add = (i) => {
      const it = Z.items[i];
      if (!it) return;
      this.basket[it.id] = (this.basket[it.id] || 0) + 1;
      g.audio.pop?.();
      render();
    };
    const render = () => {
      const rows = Z.items
        .map(
          (
            it,
            i
          ) => `<div class="gd-row"><span class="gd-ic">${it.icon}</span><span class="gd-nm"><b>${esc(it.name)}</b><small>${esc(it.w)}${this.basket[it.id] ? `・籃子裡 ${this.basket[it.id]}` : ''}</small></span>
        <span class="gd-pr">NT$ ${it.price}</span><button class="gd-add" data-i="${i}"><kbd>${i + 1}</kbd> 放進籃子</button></div>`
        )
        .join('');
      this._open(
        `🥩 ${Z.name}`,
        `<div class="gd-shop">${rows}${this._foot()}<div class="gd-hint">挑好了拿到最裡面的櫃台，找店長${KEEPER}結帳。</div>
        <div class="modal-btns"><button class="menu-btn primary" id="gdDone"><span>✔ 好了</span><small>Enter / Esc</small></button></div></div>`,
        'GORDON MEAT SHOP'
      );
      document.querySelectorAll('.gd-add').forEach((b) => (b.onclick = () => add(+b.dataset.i)));
      document.getElementById('gdDone').onclick = () => this._close();
    };
    this._ui = { digit: add, enter: () => this._close() };
    render();
  }
  // the counter: review the basket, pay with Peach Pay
  checkout() {
    const g = this.g;
    const render = () => {
      if (!this.count) {
        this._close();
        g.dialog([[KEEPER, '籃子都空了是在結什麼帳啦！']]);
        return;
      }
      const ids = Object.keys(this.basket).filter((id) => this.basket[id] > 0);
      const rows = ids
        .map((id) => {
          const it = ITEM[id],
            n = this.basket[id];
          return `<div class="gd-row"><span class="gd-ic">${it.icon}</span><span class="gd-nm"><b>${esc(it.name)}</b><small>${esc(it.w)}・NT$ ${it.price} × ${n}</small></span>
        <span class="gd-pr">NT$ ${it.price * n}</span><button class="gd-rm" data-id="${id}">－ 拿掉一個</button></div>`;
        })
        .join('');
      const short = g.money < this.total;
      this._open(
        `🧾 結帳・店長 ${KEEPER}`,
        `<div class="gd-shop">${rows}<div class="gd-total">合計 <b>NT$ ${this.total}</b></div>${this._foot()}
        ${short ? '<div class="gd-hint bad">餘額不夠，先拿掉一些，或去麥當勞打工賺錢 🍟</div>' : ''}
        <div class="modal-btns"><button class="menu-btn primary" id="gdPay"><span>💳 用 Peach Pay 付款</span><small>Enter</small></button>
        <button class="menu-btn" id="gdBack"><span>再逛逛</span><small>Esc</small></button></div></div>`,
        'CHECKOUT'
      );
      document.querySelectorAll('.gd-rm').forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.id;
            if (--this.basket[id] <= 0) delete this.basket[id];
            g.audio.tap?.();
            render();
          })
      );
      document.getElementById('gdPay').onclick = () => this._pay();
      document.getElementById('gdBack').onclick = () => this._close();
    };
    this._ui = { enter: () => this._pay() };
    render();
  }
  _pay() {
    const g = this.g,
      total = this.total,
      ids = Object.keys(this.basket);
    if (!ids.length) return;
    const what =
      ids
        .map((id) => ITEM[id].name)
        .slice(0, 2)
        .join('、') + (ids.length > 2 ? ` 等 ${this.count} 件` : '');
    if (!g.spend(total, `戈登肉鋪：${what}`)) {
      this._close();
      g.audio.bad?.();
      g.dialog(BROKE);
      return;
    }
    for (const id of ids) this.bought[id] = (this.bought[id] || 0) + this.basket[id];
    this.spent += total;
    this.basket = {};
    this._close();
    g.hud.toast(`🥩 戈登肉鋪 付款成功 −NT$ ${total}`, 'good', 2200);
    // thanks, then (if you're not friends yet) the add-friend question
    g.dialog(PAID[Math.floor(Math.random() * PAID.length)], () => g.friends?.offer('gd'));
  }
  // ---- 23:00–08:00: 女拳大帝 in 力行 279 at the desk under bed 4, playing LOL, then asleep ----
  get night() {
    return !!this.S?.closed;
  }
  get asleep() {
    const m = ((this.g.clock % 1440) + 1440) % 1440;
    return this.night && m < 8 * 60 + (this.overslept ? LATE : 0);
  } // 00:00–08:00 on his bed (08:40 if you turned his alarm off)
  // you turned his alarm off this morning: he sleeps through to 08:40 and opens the shop late
  get overslept() {
    return this.alarmOff === this._day;
  }
  get _day() {
    return Math.floor(this.g.clock / 1440);
  }
  // 06:00 until he leaves for work: his phone alarm on the desk, unless you turned it off today
  get ringing() {
    const m = ((this.g.clock % 1440) + 1440) % 1440;
    return (
      this.asleep && m >= ALARM_AT && this.alarmOff !== this._day && !this.g.mahjong?.has('gd')
    );
  }
  get boughtAny() {
    return Object.values(this.bought).some((n) => n > 0);
  }
  _dorm(game) {
    const L = game.interiors.lixing,
      R = L?.rooms?.[279];
    if (!R) return;
    const { k, B, W } = L,
      bed = R.beds[4];
    const desk = R.desks
      .filter((d) => d.bed === 4)
      .sort(
        (a, b) => Math.hypot(a.x - bed.x, a.z - bed.z) - Math.hypot(b.x - bed.x, b.z - bed.z)
      )[0];
    if (!desk) return;
    const world = (lx, lz, ly) => {
      const [x, z] = W(lx, lz);
      return { x, z, y: B + ly };
    };
    const seat = { ...world(desk.chair.x, desk.chair.z, R.y), h: k.heading(desk.face) },
      D = world(desk.x, desk.z, R.y + 0.76);
    const bedAt = { ...world(bed.x, bed.z, bed.y + 0.12), h: k.heading(0) };
    const self = this;
    const ch = (this.dormCh = createCharacter(GD_LOOK));
    const tag = makeLabel('🎮 女拳大帝', { height: 0.24, size: 40, color: '#ff6b6b' });
    tag.position.set(0, 1.75, 0);
    ch.root.add(tag);
    serviceWear('gd', ch, GD_LOOK, { tag }); // 義務役 from 2026/11/6 (src/entities/npcs/Service.js)
    ch.root.position.set(seat.x, seat.y, seat.z);
    ch.root.rotation.y = seat.h;
    ch.root.visible = false;
    game.scene.add(ch.root);
    // his gaming laptop, the screen glowing blue and gold
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 160;
    const x = cv.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 256, 160);
    gr.addColorStop(0, '#0a1a2f');
    gr.addColorStop(1, '#0d3b4f');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 160);
    x.fillStyle = '#c8aa6e';
    x.font = '900 28px sans-serif';
    x.textAlign = 'center';
    x.fillText('積分對戰', 128, 66);
    x.fillStyle = '#e8f1ff';
    x.font = '700 18px sans-serif';
    x.fillText('鑽石 I ◆ 連敗中 😤', 128, 100);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.02, 0.25),
      new THREE.MeshStandardMaterial({ color: '#1b1c20', roughness: 0.4, metalness: 0.4 })
    );
    const hinge = new THREE.Group(),
      lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.23, 0.012), base.material),
      scr = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.21),
        new THREE.MeshBasicMaterial({ map: tex })
      );
    lid.position.y = 0.115;
    scr.position.set(0, 0.115, 0.007);
    hinge.add(lid, scr);
    hinge.rotation.x = -0.25;
    const lap = new THREE.Group();
    lap.add(base);
    hinge.position.set(0, 0.01, -0.11);
    lap.add(hinge);
    lap.position.set(D.x, D.y + 0.01, D.z);
    lap.rotation.y = k.heading(desk.face + Math.PI);
    game.scene.add(lap);
    // his phone next to the laptop: the alarm screen lights up and blinks while it rings
    const lh = lap.rotation.y,
      phone = new THREE.Group();
    phone.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.01, 0.155),
        new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.3, metalness: 0.5 })
      )
    );
    const pc = document.createElement('canvas');
    pc.width = 64;
    pc.height = 128;
    const px = pc.getContext('2d');
    px.fillStyle = '#ff3b5c';
    px.fillRect(0, 0, 64, 128);
    px.fillStyle = '#fff';
    px.textAlign = 'center';
    px.font = '900 30px sans-serif';
    px.fillText('⏰', 32, 50);
    px.font = '800 17px sans-serif';
    px.fillText('06:00', 32, 80);
    px.font = '700 11px sans-serif';
    px.fillText('鬧鐘', 32, 100);
    const ptex = new THREE.CanvasTexture(pc);
    ptex.colorSpace = THREE.SRGBColorSpace;
    const pscr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.066, 0.142),
      new THREE.MeshBasicMaterial({ map: ptex, color: '#0d1020' })
    );
    pscr.rotation.x = -Math.PI / 2;
    pscr.position.y = 0.0055;
    phone.add(pscr);
    const PO = -0.27; // beside the laptop, on the open side of the desk
    phone.position.set(D.x + Math.cos(lh) * PO, D.y + 0.006, D.z - Math.sin(lh) * PO);
    phone.rotation.y = lh + 0.35;
    game.scene.add(phone);
    this.dorm = { seat, ch, lap, bed: bedAt, phone, pscr };
    this.alarmOff = -1;
    this._alarmHeard = -1;
    const aY = R.y + B - surfaceAt(phone.position.x, phone.position.z);
    game.interiors.actions.push({
      x: phone.position.x,
      z: phone.position.z,
      y: aY,
      r: 1.7, // takes over from talking to him (below) while it rings
      cond: () => this.ringing && !game.zz?.gdOut,
      label: () => '按 <kbd>E</kbd> 關掉女拳大帝一直響的鬧鐘',
      fn: () => this.alarmStop(),
    });
    game.interiors.actions.push({
      x: seat.x,
      z: seat.z,
      y: R.y + B - surfaceAt(seat.x, seat.z),
      // the crosshair aims at him: at the desk, or asleep up on bunk 4
      get aimX() {
        return self.asleep ? bedAt.x : seat.x;
      },
      get aimZ() {
        return self.asleep ? bedAt.z : seat.z;
      },
      get aimY() {
        return self.asleep ? bedAt.y + 0.2 : seat.y + 0.75;
      },
      get glow() {
        return self.asleep ? 1.5 : 1.6;
      },
      r: 1.6,
      cond: () => this.night && !game.zz?.gdOut && !this.ringing && !game.mahjong?.has('gd'),
      label: () =>
        this.asleep
          ? '按 <kbd>E</kbd> 看看 4 號床上的女拳大帝（睡著了）'
          : '按 <kbd>E</kbd> 和打 LOL 的女拳大帝說話',
      fn: () => this.dormTalk(),
    });
    game.interiors.updaters.push((dt, gm) => {
      if (gm.mahjong?.hold('gd', ch, dt)) return; // 被揪去 277 打麻將 (src/systems/mahjong/Mahjong.js)
      const on = this.night && !gm.zz?.gdOut,
        p = gm.player.pos,
        near = Math.hypot(p.x - seat.x, p.z - seat.z) < 60;
      ch.root.visible = on && near;
      const sl = this.asleep,
        at = sl ? bedAt : seat;
      ch.root.position.set(at.x, at.y, at.z);
      ch.root.rotation.y = at.h;
      if (ch.root.visible)
        ch.update(dt, {
          speed: 0,
          mode: sl ? 'down' : 'sit',
          pose: !sl && Math.sin(gm.time * 0.6) > 0.85 ? 'talk' : null,
        });
      this._alarmTick(dt, gm);
    });
  }
  // the alarm: louder the closer you are, much quieter from another floor; blinking screen
  _alarmTick(dt, g) {
    this._angry(g);
    const { phone, pscr } = this.dorm,
      on = this.ringing && !g.zz?.gdOut;
    let lv = 0;
    if (on) {
      const p = g.player.worldPos(),
        d = Math.hypot(p.x - phone.position.x, p.z - phone.position.z),
        dy = Math.abs(p.y - phone.position.y);
      lv = d < ALARM_R ? Math.pow(1 - d / ALARM_R, 1.4) * (dy < 2.6 ? 1 : 0.12) : 0;
      // the first time you hear it close by each morning
      if (d < 9 && dy < 2.6 && this._alarmHeard !== this._day) {
        this._alarmHeard = this._day;
        g.hud.toast('⏰ 279 寢的鬧鐘又在響了……女拳大帝完全沒醒，室友們好像也習慣了', 'good', 3200);
      }
    }
    g.audio.loopAt?.('gdAlarm', ALARM_SRC, lv * 0.9, dt);
    pscr.material.color.set(on ? (Math.sin(g.time * 9) > -0.2 ? '#ffffff' : '#5a5a66') : '#0d1020');
  }
  // he wakes up late after you turned his alarm off: an angry message (only if you are friends: his chat)
  _angry(g) {
    const day = this._day,
      m = ((g.clock % 1440) + 1440) % 1440;
    if (!this.overslept || this._angryDay === day || m < 8 * 60 + LATE) return;
    if (!g.friends?.added.has('gd')) {
      this._angryDay = day;
      return;
    }
    const st = g.phone?.chats.find((c) => c.c.id === 'gd');
    if (!st || st.busy) return; // try again next frame
    this._angryDay = day;
    g.phone._deliver(
      st,
      ANGRY.map((text) => ({ who: 'gd', text })),
      0,
      500
    );
  }
  // you turn it off for him (he sleeps on)
  alarmStop() {
    const g = this.g;
    if (!this.ringing) return;
    this.alarmOff = this._day;
    g.audio.blip?.();
    const L = [
      [
        ['彥霖', '（女拳大帝的鬧鐘從 6 點響到現在，按掉了。整間寢室一下子安靜下來）'],
        [KEEPER, '（翻個身，繼續睡……）'],
        ['漢克', '謝啦……他每天都這樣，從來沒自己關過'],
      ],
      [
        ['彥霖', '（關掉鬧鐘）'],
        ['霍華德', '（被子裡）……終於……'],
        ['霍華德', '我們早就習慣了，聽到這首歌就知道 6 點了 😂'],
      ],
      [
        ['彥霖', '（把女拳大帝的鬧鐘關了）'],
        ['漢克', '你人真好。我們都習慣了，我還能跟著它的節奏彈吉他 🎸'],
        [KEEPER, '（夢話）……打野來幫我啦……'],
      ],
    ];
    g.dialog(L[Math.floor(Math.random() * L.length)]);
  }
  // not a customer and not a friend: he won't even look up
  dormTalk() {
    const g = this.g;
    if (this.asleep) {
      g.dialog([
        [KEEPER, '（呼……呼……）'],
        ['彥霖', '（女拳大帝在 4 號床上睡得很熟，手還握著滑鼠的姿勢……）'],
      ]);
      return;
    }
    if (!g.friends?.added.has('gd') && !this.boughtAny) {
      // a roommate in 279 tells you why (漢克 if he is up at his desk, else 霍華德)
      const mate = g.hank?.mode === 'dorm' && !g.hank.asleep ? '漢克' : '霍華德';
      g.dialog([
        [KEEPER, '在打遊戲，別吵 😤'],
        [mate, '（小聲）你沒買過他的肉，他不會跟你加好友啦，對他來說賺錢比較重要 😂'],
      ]);
      return;
    }
    if (!g.friends?.added.has('gd')) {
      g.friends?.offer('gd');
      return;
    }
    const L = [
      [
        [KEEPER, '（耳機大吼）中路不要再送了啦！！'],
        [KEEPER, '……彥霖？你怎麼在這。等我這場打完 🎮'],
      ],
      [[KEEPER, '鑽石 I 卡三天了，今晚一定要上大師 🔥']],
      [
        [KEEPER, '漢克又在對面彈吉他，我耳機開到最大了'],
        [KEEPER, '要排嗎？輸了你請麥當勞。'],
      ],
      [[KEEPER, '店早上 8 點才開，肉要買明天來。現在別跟我講話，我在團戰 😤']],
    ];
    g.dialog(L[Math.floor(Math.random() * L.length)]);
  }
  toJSON() {
    return { basket: this.basket, bought: this.bought, spent: this.spent };
  }
  load(d) {
    if (!d) return;
    this.basket = d.basket || {};
    this.bought = d.bought || {};
    this.spent = d.spent || 0;
  }
}
