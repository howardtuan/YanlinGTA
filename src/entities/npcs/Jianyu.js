// 劍玉：號稱「基隆航海王」，資管三甲班代、彥霖的同班同學。個性溫和，特戰英豪排位鑽石的高端玩家，家裡非常有錢 ——
// 平常在學校看到的超跑，都是他借給別人開的；他自己的三台停在資訊管理學系館西邊的停車場。外型照使用者給的照片
// （圓臉、胖胖的身材、黑色有瀏海的短髮、黑框眼鏡、灰藍色牛仔襯衫）。
// 住力行宿舍 278 寢，進門右手邊第一個床位（西牆靠門那張高架床 1 號，和床下那張書桌，src/world/buildings/Lixing.js 的 rooms[278]）。
// 一天（遊戲時鐘）：02:00–10:00 在床上睡覺；10:00–17:00 在資管系館的停車場顧他的車；17:00–02:00 坐在書桌前打特戰英豪。
// 支線「班費失竊案」：第一次跟他說話，他會說放在桌上的 2000 元班費不見了 —— 到 278 寢按 E 看他的書桌（空信封、刷卡門），
// 用他的電競筆電查宿舍紀錄（偵探模式 src/systems/minigames/Detective.js 的 jianyu 案件）；破案後再找他，全班挺你 +10 票，還會把他最寶貝的藍寶堅尼借你。
// 加了好友（src/ui/phone/Friends.js 的 jianyu）就能開他停在系館的超跑；沒加好友時車是鎖著的。
// 「劉董」的零錢：書桌靠走道那頭堆著一堆零錢（每天都有）。他不在寢室的時候（顧車、兜風、去 277 打麻將）走過去按 E 可以偷拿，
// 一天一次；他坐在桌前或睡在正上方的高架床時拿不了。室友瑞哲、品漢堡在的話會「什麼都沒看到」。偷過的那天找他聊天，他會覺得零錢少了，但有錢人不計較。
// 白天（顧車的時段）有些整點他會開藍寶堅尼出去兜風：停車場那台開走、校園附近的車流裡會出現他開的藍寶堅尼，
// 那台只有他自己能開（搶不了車）；兜完風開回來停好。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { Vehicle } from '../Vehicles.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const JIANYU_LOOK = {
  skin: '#e9c2a0',
  hair: '#1d1612',
  hairStyle: 'bowl',
  glasses: true,
  glassesStyle: 'thick',
  glassesColor: '#141414',
  shirt: '#5d6b8a',
  shorts: '#2c2f36',
  pants: true,
  shoes: '#f2f2ee',
  build: 1.24,
  belly: 1,
  arm: 1.3,
  jaw: 1.2,
  face: true,
};
const NAME = '劍玉';
// his 班代 campaign poster (資管四甲 班代候選人), drawn on a canvas in the style of the real one: black and yellow blocks,
// his slogans and the round photo — the photo is his 3D avatar (assets/gram/jianyu_av.jpg), not a real picture.
// cb(canvas) is called again once the avatar has loaded.
export function drawPoster(cb) {
  const W = 540,
    H = 760,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d'),
    Y = '#ffbf00',
    K = '#0d0d0d';
  const paint = (img) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    // the black slab with the title, yellow bars and dots round it
    g.fillStyle = Y;
    g.beginPath();
    g.moveTo(400, 40);
    g.lineTo(460, 60);
    g.lineTo(400, 230);
    g.lineTo(340, 210);
    g.fill();
    g.fillStyle = K;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(440, 0);
    g.lineTo(380, 280);
    g.lineTo(0, 195);
    g.fill();
    g.fillStyle = Y;
    g.beginPath();
    g.arc(520, 15, 34, 0, 7);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(520, 15, 18, 0, 7);
    g.fill();
    g.fillStyle = Y;
    g.beginPath();
    g.arc(315, 205, 15, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(88, 215, 13, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(0, 300, 36, -1.6, 1.6);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(0, 300, 18, -1.6, 1.6);
    g.fill();
    // the bottom: yellow sweep, a black bar
    g.fillStyle = Y;
    g.beginPath();
    g.moveTo(0, 520);
    g.lineTo(540, 620);
    g.lineTo(540, 760);
    g.lineTo(0, 760);
    g.fill();
    g.fillStyle = '#ff9a00';
    g.beginPath();
    g.moveTo(0, 545);
    g.lineTo(300, 600);
    g.lineTo(300, 612);
    g.lineTo(0, 560);
    g.fill();
    g.fillStyle = K;
    g.beginPath();
    g.moveTo(85, 510);
    g.lineTo(330, 540);
    g.lineTo(320, 590);
    g.lineTo(75, 560);
    g.fill();
    g.fillRect(270, 742, 245, 18);
    g.fillStyle = K;
    g.beginPath();
    g.arc(0, 760, 42, -1.6, 0);
    g.lineTo(0, 760);
    g.fill();
    // the round photo
    g.save();
    g.beginPath();
    g.arc(395, 495, 165, 0, 7);
    g.clip();
    if (img) {
      const s = 330 / Math.min(img.width, img.height);
      g.drawImage(
        img,
        395 - (img.width * s) / 2,
        495 - (img.height * s) / 2,
        img.width * s,
        img.height * s
      );
    } else {
      g.fillStyle = '#5d6b8a';
      g.fillRect(230, 330, 330, 330);
    }
    g.restore();
    // words
    const F = '"Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.textAlign = 'left';
    g.fillStyle = '#fff';
    g.font = `700 34px ${F}`;
    g.fillText('資管四甲 班代候選人', 40, 82);
    g.fillStyle = Y;
    g.font = `900 58px ${F}`;
    g.fillText('劍玉', 44, 150);
    g.fillStyle = K;
    g.font = `700 22px ${F}`;
    g.fillText('資管系的驕傲', 52, 308);
    g.font = `400 15px ${F}`;
    ['APEX 全系第一', '言論素質全系第一', '唯一能取代彥霖的男人', '資管三甲班代'].forEach((t, i) =>
      g.fillText(t, 52, 338 + i * 24)
    );
    g.font = `700 22px ${F}`;
    g.fillText('人人皆知的稱號', 52, 448);
    g.font = `400 17px ${F}`;
    ['基隆航海王', '毒瘤監獄'].forEach((t, i) => g.fillText(t, 52, 478 + i * 26));
    g.font = `800 19px ${F}`;
    g.fillText('CONTACT US', 52, 662);
    g.font = `700 14px ${F}`;
    g.fillText('CYCU IM', 52, 684);
    cb(cv);
  };
  paint(null);
  const img = new Image();
  img.onload = () => paint(img);
  img.src = 'assets/gram/jianyu_av.jpg';
}

const M = (h, m = 0) => h * 60 + m;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// his three cars in the lot west of the 資管系館 (anchor; the free spots are searched round it). The Lamborghini is his
// favourite: you can drive it only after the 班費 case is solved.
const RETURN_IDLE = 120; // a borrowed car left alone this long (s) is driven back to its spot in the lot
const RETURN_FAR = 150; // … or as soon as you are this far (m) from it
const LOT = { x: 66, z: 105 }; // on the asphalt of the lot (the lot's east end, by the building, is lawn under trees)
const CARS = [
  { model: 'ferrari', color: '#c8102e', name: '法拉利' },
  { model: 'porsche', color: '#c7c9cc', name: '保時捷 911' },
  { model: 'lambo', color: '#7cd400', name: '藍寶堅尼', fav: true },
];

export function jianyuPlan(clock) {
  const m = ((clock % 1440) + 1440) % 1440;
  if (m >= M(2) && m < M(10)) return 'sleep';
  if (m >= M(10) && m < M(17)) return 'car';
  return 'game';
}

export class Jianyu {
  constructor(game) {
    this.g = game;
    this.state = { met: false, thanked: false };
    this.mode = null;
    this.pause = 0;
    this.face = null;
    const ch = (this.ch = createCharacter(JIANYU_LOOK));
    const tag = makeLabel('基隆航海王 劍玉', { height: 0.26, size: 40, color: '#ffd23f' });
    tag.position.set(0, 2.05, 0);
    ch.root.add(tag);
    game.scene.add(ch.root); // (not in game.npcs: that list is for static story NPCs with a "!"; he updates himself, like 黃蓋瑞)
    this.pos = ch.root.position;
    this.heading = 0;
    this._room();
    this._cars();
    // the Lamborghini he takes out for a drive now and then (a traffic car only he drives, src/entities/NPC.js adopt)
    const cr = (this.cruiser = game.traffic?.adopt(
      new Vehicle('car', Math.random, { model: 'lambo', color: '#7cd400' }),
      null
    ));
    if (cr) {
      cr.ai.hold = true;
      cr.label = '劍玉的藍寶堅尼（兜風中）';
      cr.owner = 'jianyu';
      cr.lock = () => '🔒 這是劍玉正在開的藍寶堅尼，只有他自己能開 😅';
      const t = makeLabel('🏎️ 劍玉（兜風中）', { height: 0.3, size: 40, color: '#7cd400' });
      t.position.set(0, 1.8, 0);
      cr.mesh.add(t);
    }
    this.cruising = false;
    // talk (wherever he is): the action follows him
    game.interiors.actions.push({
      get x() {
        return game.jianyu.pos.x;
      },
      get z() {
        return game.jianyu.pos.z;
      },
      r: 2.2,
      y: 0,
      anyY: true,
      cond: () =>
        !!this.mode && this.mode !== 'sleep' && this.mode !== 'mahjong' && ch.root.visible, // asleep he is up on the loft bed over his desk: the desk action says so
      label: () => `按 <kbd>E</kbd> 和${NAME}聊天`,
      fn: () => this.talk(),
    });
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
    this._lockCars();
  }

  // ---------------- room 278: his bed (3) and his desk under it, laptop and the empty envelope ----------------
  _room() {
    const L = this.g.interiors.lixing,
      R = L?.rooms?.[278];
    if (!R) {
      console.warn('[jianyu] 力行 278 寢找不到');
      return;
    }
    const { k, B, W } = L,
      bed = R.beds[1];
    // the desk right under his loft bed (two desks reach under it: take the one whose middle is nearest the bed's)
    const desk = R.desks
      .filter((d) => d.bed === 1)
      .sort(
        (a, b) => Math.hypot(a.x - bed.x, a.z - bed.z) - Math.hypot(b.x - bed.x, b.z - bed.z)
      )[0];
    const world = (lx, lz, ly) => {
      const [x, z] = W(lx, lz);
      return { x, z, y: B + ly };
    };
    this.home = {
      bed: { ...world(bed.x, bed.z, bed.y + 0.12), h: k.heading(0) },
      seat: { ...world(desk.chair.x, desk.chair.z, R.y), h: k.heading(desk.face) },
      desk: world(desk.x, desk.z, R.y + 0.76),
      door: world(R.door[0], R.door[1], R.y),
    };
    // laptop (screen glowing with a tactical shooter's red) and the empty 班費 envelope on his desk
    const grp = new THREE.Group(),
      dx = desk.x,
      dz = desk.z,
      s = Math.sign(-Math.sin(desk.face)) || 1; // s: from the desk towards the aisle
    const at = (o, ox, oz, y) => {
      const p = world(dx + ox, dz + oz, R.y + 0.76 + y);
      o.position.set(p.x, p.y, p.z);
      o.rotation.y = k.heading(desk.face + Math.PI);
      grp.add(o);
    };
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.02, 0.25),
      new THREE.MeshStandardMaterial({ color: '#1b1c20', roughness: 0.4, metalness: 0.4 })
    );
    at(base, s * 0.05, 0.05, 0.01);
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 160;
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 160);
    gr.addColorStop(0, '#0f1923');
    gr.addColorStop(1, '#3b0d14');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#ff4655';
    g.font = '900 30px sans-serif';
    g.textAlign = 'center';
    g.fillText('RANKED', 128, 70);
    g.fillStyle = '#e8f1ff';
    g.font = '700 18px sans-serif';
    g.fillText('鑽石 II ◆', 128, 102);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.21),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.23, 0.012), base.material);
    const hinge = new THREE.Group();
    at(hinge, -s * 0.075, 0.05, 0.02); // the back edge of the keyboard (the wall side)
    lid.position.set(0, 0.115, 0);
    scr.position.set(0, 0.115, 0.007);
    hinge.add(lid, scr);
    hinge.rotation.order = 'YXZ';
    hinge.rotation.x = -0.25; // turn to face the chair first, then tip the lid back (the default XYZ order tips it sideways)
    const env = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.004, 0.2),
      new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.9 })
    );
    at(env, -s * 0.12, -0.25, 0.004);
    env.rotation.y += 0.3;
    // his 班代 poster, on the end of the wardrobe under his loft bed, facing the door (you see it as you come in, on the right)
    const sx = Math.sign(R.center[0] - bed.x) || 1,
      zA = bed.z - 1.0; // sx: from his wall towards the aisle; zA: the door end of his loft bed
    const ptex = new THREE.CanvasTexture(document.createElement('canvas'));
    ptex.colorSpace = THREE.SRGBColorSpace;
    drawPoster((cv) => {
      ptex.image = cv;
      ptex.needsUpdate = true;
      this._posterCv = cv;
    }); // the JPEG for the modal is encoded when it opens, not at load
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.43, 0.6),
      new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.75 })
    );
    const pp = world(bed.x + sx * (0.3 - 0.475), zA - 0.006, R.y + 1.2);
    poster.position.set(pp.x, pp.y, pp.z);
    poster.rotation.y = k.heading(Math.PI);
    grp.add(poster);
    this.poster = poster;
    this.g.scene.add(grp);
    this.g.interiors.actions.push({
      x: pp.x,
      z: pp.z,
      y: R.y + B - surfaceAt(pp.x, pp.z),
      r: 1.0,
      label: () => '按 <kbd>E</kbd> 看劍玉的班代海報',
      fn: () =>
        this.g.modal(
          '劍玉的班代競選海報',
          `<img src="${this._posterCv ? this._posterCv.toDataURL('image/jpeg', 0.9) : ''}" alt="" style="display:block;max-width:100%;max-height:70vh;margin:0 auto;border-radius:6px">`,
          '資管四甲'
        ),
    });
    this._coins(R, desk, world, s);
    // his desk: the envelope, the card-locked door and his laptop (the 班費 case)
    const D = this.home.desk;
    this.g.interiors.actions.push({
      x: D.x,
      z: D.z,
      y: R.y + B - surfaceAt(D.x, D.z),
      r: 1.05,
      label: () => '按 <kbd>E</kbd> 看劍玉的書桌（電競筆電）',
      cond: () => this._atLaptop(),
      fn: () => this.desk(),
    });
  }
  // 劉董's loose change: a heap of coins (and two stacks of NT$10) at the aisle end of his desk, away from the laptop and the envelope
  _coins(R, desk, world, s) {
    const k = this.g.interiors.lixing.k,
      B = this.g.interiors.lixing.B;
    const met = (c) =>
      new THREE.MeshStandardMaterial({ color: c, metalness: 0.8, roughness: 0.35 });
    let sd = 3;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const parts = { s: [], g: [], c: [] },
      coin = new THREE.CylinderGeometry(1, 1, 1, 14);
    const add = (key, rad, x, y, z, tx = 0, tz = 0) => {
      const g = coin.clone();
      g.scale(rad, 0.0022, rad);
      g.rotateX(tx);
      g.rotateZ(tz);
      g.translate(x, y, z);
      parts[key].push(g);
    };
    for (let i = 0; i < 72; i++) {
      const r = rnd() ** 0.7 * 0.085,
        a = rnd() * Math.PI * 2,
        u = rnd(),
        key = u < 0.5 ? 's' : u < 0.8 ? 'c' : 'g'; // NT$10 / 5 silver, NT$1 copper, NT$50 gold
      add(
        key,
        key === 'g' ? 0.014 : key === 's' ? 0.013 : 0.0105,
        Math.cos(a) * r,
        (0.085 - r) * 0.28 + 0.0012,
        Math.sin(a) * r,
        (rnd() - 0.5) * 0.5,
        (rnd() - 0.5) * 0.5
      );
    }
    for (const oz of [-0.03, 0.03])
      for (let j = 0; j < 7; j++) add('s', 0.013, 0.095, j * 0.0023 + 0.0011, oz);
    const grp = (this.coins = new THREE.Group());
    for (const [key, c] of [
      ['s', '#c9ccd1'],
      ['g', '#d9b25a'],
      ['c', '#b9773f'],
    ]) {
      const m = new THREE.Mesh(mergeGeometries(parts[key]), met(c));
      m.castShadow = true;
      grp.add(m);
    }
    coin.dispose();
    const p = world(desk.x + s * 0.12, desk.z + 0.38, R.y + 0.76);
    grp.position.set(p.x, p.y, p.z);
    grp.rotation.y = k.heading(desk.face + Math.PI);
    this.g.scene.add(grp);
    this.g.interiors.actions.push({
      x: p.x,
      z: p.z,
      y: R.y + B - surfaceAt(p.x, p.z),
      r: 0.75,
      cond: () => grp.visible,
      label: () =>
        this._inRoom()
          ? '按 <kbd>E</kbd> 看劍玉桌上的一堆零錢'
          : '按 <kbd>E</kbd> 偷拿劍玉桌上的零錢 🪙（他不在）',
      fn: () => this.stealCoins(),
    });
  }
  // in 278: at his desk, or asleep in the loft bed right over it
  _inRoom() {
    return this.mode === 'sleep' || (this.mode === 'game' && !this.cruising);
  }
  stealCoins() {
    const g = this.g,
      day = Math.floor(g.clock / 1440);
    if (this.mode === 'sleep') {
      g.hud.toast('😴 劍玉就睡在正上方的高架床……翻個身就看到了，還是算了', 'bad', 2800);
      return;
    }
    if (this._inRoom()) {
      g.hud.toast('👀 劉董就坐在旁邊打積分，現在拿太明顯了', 'bad', 2600);
      return;
    }
    const n = 60 + ((((day + 7) * 2654435761) >>> 0) % 140);
    this.state.coinsDay = day;
    g._saveT = 9.5;
    this.coins.visible = false;
    g.earn(n, '劍玉桌上的零錢');
    g.hud.toast(`🪙 偷拿了劍玉桌上的零錢 NT$${n}……他的班費才剛被偷過耶`, 'good', 3200);
    // his roommates at their desks saw it
    const R = g.ruizhe,
      P = g.pinhan;
    if (R && (R.mode === 'code' || R.mode === 'dorm'))
      g.dialog([['瑞哲', '……我什麼都沒看到 👀（眼睛黏回螢幕上）']]);
    else if (P && P.mode === 'dorm') g.dialog([['品漢堡', '……（翻頁）']]);
  }
  // you are at his desk and he isn't sitting at it
  _atLaptop() {
    return !!this.home && this.mode !== 'game';
  }
  desk() {
    const g = this.g,
      D = g.detective;
    if (this.mode === 'sleep' && !this.state.met) {
      g.dialog([
        [NAME, '（上舖傳來打呼聲……呼……呼……）'],
        ['彥霖', '（劍玉在睡覺。下午 5 點以後他會醒來打積分，到時候再來找他吧）'],
      ]);
      return;
    }
    if (!this.state.met) {
      g.hud.toast(
        '💻 桌上有一台超貴的電競筆電，螢幕還停在特戰英豪的積分畫面……主人不在。',
        'good',
        3000
      );
      return;
    }
    if (D?.solved('jianyu')) {
      g.hud.toast('💻 班費的案子已經破了，去跟劍玉說一聲吧！', 'good', 2600);
      return;
    }
    g.dialog(
      [
        ['彥霖', '（桌上有一個空的信封，寫著「三甲班費 2000」。）'],
        ['彥霖', '（抽屜沒被撬開，窗戶也是關的……寢室門是刷卡進出的，宿舍系統一定有紀錄。）'],
        ['彥霖', '（劍玉說可以用他的筆電查，宿舍自治會把紀錄匯出來了。）'],
      ],
      () => {
        this.laptop();
      }
    );
  }

  // his laptop: the desktop with the case files and the terminal side by side (no browser in front)
  laptop() {
    const pc = this.g.pc;
    pc.open('劍玉的電競筆電');
    pc._closeWin('browser');
    pc.launch('case');
    pc.investigate('jianyu');
  }

  // ---------------- the supercars at the 資管系館 ----------------
  _cars() {
    const g = this.g,
      w = g.world;
    this.cars = [];
    const free = (x, z) =>
      w.isFree(x, z, 2.4) && !this.cars.some((v) => Math.hypot(v.pos.x - x, v.pos.z - z) < 5.2);
    for (const c of CARS) {
      let spot = null;
      for (let r = 0; r < 18 && !spot; r += 1.5)
        for (let a = 0; a < 6.28 && !spot; a += 0.4) {
          const x = LOT.x + Math.cos(a) * r,
            z = LOT.z + Math.sin(a) * r;
          if (free(x, z)) spot = { x, z };
        }
      if (!spot) continue;
      const v = g._addVehicle('car', spot.x, spot.z, Math.PI / 2, null, {
        model: c.model,
        color: c.color,
      });
      v.label = `劍玉的${c.name}`;
      v.owner = 'jianyu';
      v.fav = !!c.fav;
      v.home = { x: spot.x, z: spot.z, h: Math.PI / 2 };
      v.idle = 0;
      const tag = makeLabel(`🏎️ 劍玉的${c.name}`, {
        height: 0.3,
        size: 40,
        color: c.fav ? '#7cd400' : '#ffd23f',
      });
      tag.position.set(0, 1.75, 0);
      v.mesh.add(tag);
      v.tag = tag;
      // why you can't drive it yet (null = you can)
      v.lock = () => {
        if (!g.friends?.added.has('jianyu'))
          return `🔒 這是${v.label}。先跟劍玉當朋友，他才會借你開`;
        if (v.fav && !this.state.thanked)
          return `🔒 ${v.label}是他最寶貝的車：先幫他找回班費（力行 278 寢）`;
        return null;
      };
      this.cars.push(v);
    }
    // he stands by the Ferrari's door (cars park heading π/2: along x, so the doors face ±z)
    const c0 = this.cars[0];
    this.carSpot = c0 ? { x: c0.pos.x + 3, z: c0.pos.z - 2.9 } : { ...LOT }; // in front, between the Ferrari and the Porsche
  }
  _lockCars() {
    /* lock state is read live by v.lock() */
  }
  // borrowed cars go home by themselves: after RETURN_IDLE s without you in it, or once you are RETURN_FAR m away
  // (and never while you sit in it). He "drives it back": it is simply put back on its spot with a note.
  _carsHome(dt) {
    const g = this.g,
      pl = g.player,
      p = pl.worldPos();
    for (const v of this.cars || []) {
      if (v.away) continue; // out for a drive with him (the cruiser)
      if (pl.vehicle === v) {
        v.idle = 0;
        continue;
      }
      const away =
        Math.hypot(v.pos.x - v.home.x, v.pos.z - v.home.z) > 1.5 ||
        Math.abs(
          ((((v.heading - v.home.h) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
        ) > 0.3;
      if (!away) {
        v.idle = 0;
        continue;
      }
      v.idle += dt;
      const far = Math.hypot(v.pos.x - p.x, v.pos.z - p.z) > RETURN_FAR;
      if (v.idle < RETURN_IDLE && !far) continue;
      // the spot must be clear of you and of other vehicles
      if (Math.hypot(p.x - v.home.x, p.z - v.home.z) < 3.5) continue;
      if (
        (g.vehicles || []).some(
          (o) => o !== v && Math.hypot(o.pos.x - v.home.x, o.pos.z - v.home.z) < 3
        )
      )
        continue;
      v.place(v.home.x, v.home.z, v.home.h);
      v.idle = 0;
      v.mesh.visible = true;
      g.hud.toast(`🏎️ ${v.label}已經自動開回資管系館停車場了`, 'good', 2600);
    }
  }

  // ---------------- every frame ----------------
  update(dt) {
    if (this.coins) this.coins.visible = this.state.coinsDay !== Math.floor(this.g.clock / 1440); // back every day
    this._carsHome(dt);
    this._cruise();
    const g = this.g,
      ch = this.ch,
      plan = g.mahjong?.has('jianyu') ? 'mahjong' : jianyuPlan(g.clock); // 被揪去 277 打麻將 (src/systems/mahjong/Mahjong.js)
    if (plan !== this.mode) this._enter(plan);
    if (plan === 'mahjong') {
      g.mahjong.hold('jianyu', ch, dt); // this.pos is ch.root.position: the table sets it
      return;
    }
    const p = g.player.worldPos(),
      near = (x, z, r) => Math.hypot(x - p.x, z - p.z) < r;
    let mode = 'foot';
    if (this.mode === 'sleep' && this.home) {
      const b = this.home.bed;
      this.pos.set(b.x, b.y, b.z);
      this.heading = b.h;
      mode = 'down';
    } else if (this.mode === 'game' && this.home) {
      const s = this.home.seat;
      this.pos.set(s.x, s.y, s.z);
      if (this.pause > 0) {
        this.pause -= dt;
        if (this.face != null)
          this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6);
      } else this.heading += angDiff(s.h, this.heading) * Math.min(1, dt * 4);
      mode = 'sit';
    } else {
      const c = this.carSpot;
      this.pos.set(c.x, surfaceAt(c.x, c.z), c.z);
      if (this.pause > 0) {
        this.pause -= dt;
        if (this.face != null)
          this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6);
      } else this.heading += angDiff(this.idleH ?? 0, this.heading) * Math.min(1, dt * 2);
    }
    ch.root.position.copy(this.pos);
    ch.root.rotation.y = this.heading;
    if (this.cruising) {
      const c = this.cruiser;
      if (c && !c.ai.dormant) this.pos.set(c.pos.x, c.mesh.position.y, c.pos.z);
      ch.root.visible = false;
      return;
    }
    const vis = near(this.pos.x, this.pos.z, 160);
    ch.root.visible = vis;
    if (vis) {
      ch.setDetail?.(near(this.pos.x, this.pos.z, 35));
      ch.update(dt, { speed: 0, mode });
    }
  }
  _enter(plan) {
    this.mode = plan;
    this.pause = 0;
    this.face = null;
    if (plan === 'car') this.idleH = Math.PI; // faces -z, his back to the cars, towards the lot's aisle
  }
  // out for a drive: some whole hours of his car time (10:00–17:00), if his Lamborghini is parked in the lot
  // (not while you are driving it). The parked one leaves the lot; the cruiser joins the traffic around you; when
  // the hour is over it drives off (once out of sight) and the Lamborghini is back on its spot.
  _cruise() {
    const g = this.g,
      cr = this.cruiser,
      lam = this.cars?.find((v) => v.fav);
    if (!cr || !lam) return;
    const hr = Math.floor(g.clock / 60),
      h = ((hr * 2654435761) >>> 0) % 100;
    const home =
      Math.hypot(lam.pos.x - lam.home.x, lam.pos.z - lam.home.z) < 1.5 && g.player.vehicle !== lam;
    const want = this.mode === 'car' && h < 35 && (this.cruising || home);
    if (want && !this.cruising) {
      this.cruising = true;
      cr.ai.hold = false;
      const i = g.vehicles.indexOf(lam);
      if (i >= 0) g.vehicles.splice(i, 1);
      g.scene.remove(lam.mesh);
      lam.away = true;
    } else if (!want && this.cruising) {
      cr.ai.hold = true;
      if (cr.ai.dormant || !g.traffic.inView(cr.pos)) {
        cr.ai.dormant = true;
        cr.mesh.visible = false;
        this.cruising = false;
        lam.place(lam.home.x, lam.home.z, lam.home.h);
        g.scene.add(lam.mesh);
        if (!g.vehicles.includes(lam)) g.vehicles.push(lam);
        lam.away = false;
        lam.mesh.visible = true;
      }
    }
  }
  // where he is, for the phone (定位 / 你在哪)
  where() {
    if (this.cruising) return '開著藍寶堅尼在附近兜風 🏎️';
    return (
      {
        sleep: '在力行宿舍 278 寢睡覺',
        car: '在資管系館停車場顧他的超跑',
        game: '在力行宿舍 278 寢打特戰英豪',
      }[this.mode] || ''
    );
  }

  // ---------------- talking ----------------
  talk() {
    const g = this.g,
      p = g.player.worldPos(),
      D = g.detective;
    if (this.mode === 'sleep') {
      g.dialog([
        [NAME, '（呼……呼……）'],
        ['彥霖', '（睡在上舖，一隻手還握著滑鼠……晚上 5 點以後他會醒來打積分）'],
      ]);
      return;
    }
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.pause = 3;
    const at = this.mode === 'car' ? 'car' : 'room';
    // the 班費 case solved and not yet thanked
    if (D?.solved('jianyu') && !this.state.thanked) {
      this.state.thanked = true;
      g._saveT = 9.5;
      g.dialog(
        [
          [NAME, '彥霖！聽說你用我的筆電把 2000 找回來了？'],
          [
            '彥霖',
            '是小澤啦。他說桌上那包是你忘了收的，就拿去儲值遊戲點數……已經叫他把錢還回來了。',
          ],
          [NAME, '班費是全班的錢，找回來就好，我不會為難他。'],
          [NAME, '欸你幫了全班一個大忙，三甲的票我幫你顧好，明天全班一起去投 🗳️'],
          [NAME, '還有——停在系館的那台藍寶堅尼，鑰匙給你，想開隨時開。'],
        ],
        () => {
          g.addVotes(10, '三甲全班挺你 +10 票');
          g.audio.fanfare?.();
          g.hud.bigToast('班費找回來了！', '劍玉的藍寶堅尼可以開了 🏎️');
          if (!g.friends.added.has('jianyu')) g.after(() => g.friends.offer('jianyu'), 600);
        }
      );
      return;
    }
    // the day you took his change: he notices, and doesn't mind
    const day = Math.floor(g.clock / 1440);
    if (this.state.coinsDay === day && this.state.coinsSaid !== day) {
      this.state.coinsSaid = day;
      g.dialog([
        [NAME, '欸彥霖，我桌上的零錢好像少了一點……'],
        [NAME, '算了，大概是我自己拿去買飲料忘了 🤔 零錢而已，不計較'],
      ]);
      return;
    }
    const first = !this.state.met;
    g.friends.talk('jianyu', at, () => {
      this.pause = 1;
      if (first) {
        this.state.met = true;
        g._saveT = 9.5;
        g.hud.toast('🕵️ 新案件：劍玉的班費失竊案 —— 到力行宿舍 278 寢看他的書桌', 'good', 3600);
      } else if (!D?.solved('jianyu') && this.mode === 'game')
        g.after(
          () =>
            g.dialog([[NAME, '筆電你直接拿去查，我這局打完再說 🎧']], () => {
              this.laptop();
            }),
          300
        );
    });
  }
}
