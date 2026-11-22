// 劍玉：號稱「基隆航海王」，資管三甲班代、彥霖的同班同學。個性溫和，特戰英豪排位鑽石的高端玩家，家裡非常有錢 ——
// 平常在學校看到的超跑，都是他借給別人開的；他自己的三台停在資訊管理學系館西邊的停車場。外型照使用者給的照片
// （圓臉、胖胖的身材、黑色有瀏海的短髮、黑框眼鏡、灰藍色牛仔襯衫）。
// 住力行宿舍 278 寢，進門右手邊第一個床位（西牆靠門那張高架床 3 號，和床下那張書桌，js/lixing.js 的 rooms[278]）。
// 一天（遊戲時鐘）：02:00–10:00 在床上睡覺；10:00–17:00 在資管系館的停車場顧他的車；17:00–02:00 坐在書桌前打特戰英豪。
// 支線「班費失竊案」：第一次跟他說話，他會說放在桌上的 2000 元班費不見了 —— 到 278 寢按 E 看他的書桌（空信封、刷卡門），
// 用他的電競筆電查宿舍紀錄（偵探模式 js/detective.js 的 jianyu 案件）；破案後再找他，全班挺你 +10 票，還會把他最寶貝的藍寶堅尼借你。
// 加了好友（js/friends.js 的 jianyu）就能開他停在系館的超跑；沒加好友時車是鎖著的。
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { makeLabel } from './map.js';
import { surfaceAt } from './terrain.js';

export const JIANYU_LOOK = {
  skin: '#e9c2a0', hair: '#1d1612', hairStyle: 'bowl', glasses: true, glassesStyle: 'thick', glassesColor: '#141414',
  shirt: '#5d6b8a', shorts: '#2c2f36', pants: true, shoes: '#f2f2ee', build: 1.24, belly: 1, arm: 1.3, jaw: 1.2, face: true,
};
const NAME = '劍玉';
const M = (h, m = 0) => h * 60 + m;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// his three cars in the lot west of the 資管系館 (anchor; the free spots are searched round it). The Lamborghini is his
// favourite: you can drive it only after the 班費 case is solved.
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
    this.g = game; this.state = { met: false, thanked: false }; this.mode = null; this.pause = 0; this.face = null;
    const ch = this.ch = createCharacter(JIANYU_LOOK);
    const tag = makeLabel('基隆航海王 劍玉', { height: 0.26, size: 40, color: '#ffd23f' }); tag.position.set(0, 2.05, 0); ch.root.add(tag);
    game.scene.add(ch.root); // (not in game.npcs: that list is for static story NPCs with a "!"; he updates himself, like 黃蓋瑞)
    this.pos = ch.root.position; this.heading = 0;
    this._room();
    this._cars();
    // talk (wherever he is): the action follows him
    game.interiors.actions.push({
      get x() { return game.jianyu.pos.x; }, get z() { return game.jianyu.pos.z; }, r: 2.2, y: 0, anyY: true,
      cond: () => !!this.mode && this.mode !== 'sleep' && ch.root.visible, // asleep he is up on the loft bed over his desk: the desk action says so
      label: () => `按 <kbd>E</kbd> 和${NAME}聊天`,
      fn: () => this.talk(),
    });
  }
  toJSON() { return this.state; }
  load(d) { if (d && typeof d === 'object') Object.assign(this.state, d); this._lockCars(); }

  // ---------------- room 278: his bed (3) and his desk under it, laptop and the empty envelope ----------------
  _room() {
    const L = this.g.interiors.lixing, R = L?.rooms?.[278]; if (!R) { console.warn('[jianyu] 力行 278 寢找不到'); return; }
    const { k, B, W } = L, desk = R.desks.find(d => d.bed === 3), bed = R.beds[3];
    const world = (lx, lz, ly) => { const [x, z] = W(lx, lz); return { x, z, y: B + ly }; };
    this.home = {
      bed: { ...world(bed.x, bed.z, bed.y + 0.12), h: k.heading(0) },
      seat: { ...world(desk.chair.x, desk.chair.z, R.y), h: k.heading(desk.face) },
      desk: world(desk.x, desk.z, R.y + 0.76),
      door: world(R.door[0], R.door[1], R.y),
    };
    // laptop (screen glowing with a tactical shooter's red) and the empty 班費 envelope on his desk
    const grp = new THREE.Group(), dx = desk.x, dz = desk.z, s = Math.sign(-Math.sin(desk.face)) || 1; // s: from the desk towards the aisle
    const at = (o, ox, oz, y) => { const p = world(dx + ox, dz + oz, R.y + 0.76 + y); o.position.set(p.x, p.y, p.z); o.rotation.y = k.heading(desk.face + Math.PI); grp.add(o); };
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.25), new THREE.MeshStandardMaterial({ color: '#1b1c20', roughness: 0.4, metalness: 0.4 }));
    at(base, s * 0.05, 0.05, 0.01);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, '#0f1923'); gr.addColorStop(1, '#3b0d14'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#ff4655'; g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.fillText('RANKED', 128, 70); g.fillStyle = '#e8f1ff'; g.font = '700 18px sans-serif'; g.fillText('鑽石 II ◆', 128, 102);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.21), new THREE.MeshBasicMaterial({ map: tex }));
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.23, 0.012), base.material);
    const hinge = new THREE.Group(); at(hinge, s * 0.17, 0.05, 0.02);
    lid.position.set(0, 0.115, 0); scr.position.set(0, 0.115, 0.007); hinge.add(lid, scr); hinge.rotation.x = -0.25;
    const env = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.2), new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.9 }));
    at(env, -s * 0.12, -0.25, 0.004); env.rotation.y += 0.3;
    this.g.scene.add(grp);
    // his desk: the envelope, the card-locked door and his laptop (the 班費 case)
    const D = this.home.desk;
    this.g.interiors.actions.push({
      x: D.x, z: D.z, y: R.y + B - 0.2, r: 1.05, label: () => '按 <kbd>E</kbd> 看劍玉的書桌（電競筆電）',
      cond: () => this._atLaptop(), fn: () => this.desk(),
    });
  }
  // you are at his desk and he isn't sitting at it
  _atLaptop() { return !!this.home && this.mode !== 'game'; }
  desk() {
    const g = this.g, D = g.detective;
    if (this.mode === 'sleep' && !this.state.met) { g.dialog([[NAME, '（上舖傳來打呼聲……呼……呼……）'], ['彥霖', '（劍玉在睡覺。下午 5 點以後他會醒來打積分，到時候再來找他吧）']]); return; }
    if (!this.state.met) { g.hud.toast('💻 桌上有一台超貴的電競筆電，螢幕還停在特戰英豪的積分畫面……主人不在。', 'good', 3000); return; }
    if (D?.solved('jianyu')) { g.hud.toast('💻 班費的案子已經破了，去跟劍玉說一聲吧！', 'good', 2600); return; }
    g.dialog([
      ['彥霖', '（桌上有一個空的信封，寫著「三甲班費 2000」。）'],
      ['彥霖', '（抽屜沒被撬開，窗戶也是關的……寢室門是刷卡進出的，宿舍系統一定有紀錄。）'],
      ['彥霖', '（劍玉說可以用他的筆電查，宿舍自治會把紀錄匯出來了。）'],
    ], () => { this.laptop(); });
  }

  // his laptop: the desktop with the case files and the terminal side by side (no browser in front)
  laptop() { const pc = this.g.pc; pc.open('劍玉的電競筆電'); pc._closeWin('browser'); pc.launch('case'); pc.investigate('jianyu'); }

  // ---------------- the supercars at the 資管系館 ----------------
  _cars() {
    const g = this.g, w = g.world; this.cars = [];
    const free = (x, z) => w.isFree(x, z, 2.4) && !this.cars.some(v => Math.hypot(v.pos.x - x, v.pos.z - z) < 5.2);
    for (const c of CARS) {
      let spot = null;
      for (let r = 0; r < 18 && !spot; r += 1.5) for (let a = 0; a < 6.28 && !spot; a += 0.4) {
        const x = LOT.x + Math.cos(a) * r, z = LOT.z + Math.sin(a) * r; if (free(x, z)) spot = { x, z };
      }
      if (!spot) continue;
      const v = g._addVehicle('car', spot.x, spot.z, Math.PI / 2, null, { model: c.model, color: c.color });
      v.label = `劍玉的${c.name}`; v.owner = 'jianyu'; v.fav = !!c.fav;
      const tag = makeLabel(`🏎️ 劍玉的${c.name}`, { height: 0.3, size: 40, color: c.fav ? '#7cd400' : '#ffd23f' }); tag.position.set(0, 1.75, 0); v.mesh.add(tag); v.tag = tag;
      // why you can't drive it yet (null = you can)
      v.lock = () => {
        if (!g.friends?.added.has('jianyu')) return `🔒 這是${v.label}。先跟劍玉當朋友，他才會借你開`;
        if (v.fav && !this.state.thanked) return `🔒 ${v.label}是他最寶貝的車：先幫他找回班費（力行 278 寢）`;
        return null;
      };
      this.cars.push(v);
    }
    // he stands by the Ferrari's door (cars park heading π/2: along x, so the doors face ±z)
    const c0 = this.cars[0]; this.carSpot = c0 ? { x: c0.pos.x + 3, z: c0.pos.z - 2.9 } : { ...LOT }; // in front, between the Ferrari and the Porsche
  }
  _lockCars() { /* lock state is read live by v.lock() */ }

  // ---------------- every frame ----------------
  update(dt) {
    const g = this.g, ch = this.ch, plan = jianyuPlan(g.clock);
    if (plan !== this.mode) this._enter(plan);
    const p = g.player.worldPos(), near = (x, z, r) => Math.hypot(x - p.x, z - p.z) < r;
    let mode = 'foot';
    if (this.mode === 'sleep' && this.home) {
      const b = this.home.bed; this.pos.set(b.x, b.y, b.z); this.heading = b.h; mode = 'down';
    } else if (this.mode === 'game' && this.home) {
      const s = this.home.seat; this.pos.set(s.x, s.y, s.z);
      if (this.pause > 0) { this.pause -= dt; if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6); }
      else this.heading += angDiff(s.h, this.heading) * Math.min(1, dt * 4);
      mode = 'sit';
    } else {
      const c = this.carSpot; this.pos.set(c.x, surfaceAt(c.x, c.z), c.z);
      if (this.pause > 0) { this.pause -= dt; if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6); }
      else this.heading += angDiff(this.idleH ?? 0, this.heading) * Math.min(1, dt * 2);
    }
    ch.root.position.copy(this.pos); ch.root.rotation.y = this.heading;
    const vis = near(this.pos.x, this.pos.z, 160); ch.root.visible = vis;
    if (vis) { ch.setDetail?.(near(this.pos.x, this.pos.z, 35)); ch.update(dt, { speed: 0, mode }); }
  }
  _enter(plan) {
    this.mode = plan; this.pause = 0; this.face = null;
    if (plan === 'car') this.idleH = Math.PI; // faces -z, his back to the cars, towards the lot's aisle
  }
  // where he is, for the phone (定位 / 你在哪)
  where() {
    return { sleep: '在力行宿舍 278 寢睡覺', car: '在資管系館停車場顧他的超跑', game: '在力行宿舍 278 寢打特戰英豪' }[this.mode] || '';
  }

  // ---------------- talking ----------------
  talk() {
    const g = this.g, p = g.player.worldPos(), D = g.detective;
    if (this.mode === 'sleep') { g.dialog([[NAME, '（呼……呼……）'], ['彥霖', '（睡在上舖，一隻手還握著滑鼠……晚上 5 點以後他會醒來打積分）']]); return; }
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.pause = 3;
    const at = this.mode === 'car' ? 'car' : 'room';
    // the 班費 case solved and not yet thanked
    if (D?.solved('jianyu') && !this.state.thanked) {
      this.state.thanked = true; g._saveT = 9.5;
      g.dialog([
        [NAME, '彥霖！聽說你用我的筆電把 2000 找回來了？'],
        ['彥霖', '是小澤啦。他說桌上那包是你忘了收的，就拿去儲值遊戲點數……已經叫他把錢還回來了。'],
        [NAME, '班費是全班的錢，找回來就好，我不會為難他。'],
        [NAME, '欸你幫了全班一個大忙，三甲的票我幫你顧好，明天全班一起去投 🗳️'],
        [NAME, '還有——停在系館的那台藍寶堅尼，鑰匙給你，想開隨時開。'],
      ], () => {
        g.addVotes(10, '三甲全班挺你 +10 票'); g.audio.fanfare?.();
        g.hud.bigToast('班費找回來了！', '劍玉的藍寶堅尼可以開了 🏎️');
        if (!g.friends.added.has('jianyu')) g.after(() => g.friends.offer('jianyu'), 600);
      });
      return;
    }
    const first = !this.state.met;
    g.friends.talk('jianyu', at, () => {
      this.pause = 1;
      if (first) { this.state.met = true; g._saveT = 9.5; g.hud.toast('🕵️ 新案件：劍玉的班費失竊案 —— 到力行宿舍 278 寢看他的書桌', 'good', 3600); }
      else if (!D?.solved('jianyu') && this.mode === 'game') g.after(() => g.dialog([[NAME, '筆電你直接拿去查，我這局打完再說 🎧']], () => { this.laptop(); }), 300);
    });
  }
}
