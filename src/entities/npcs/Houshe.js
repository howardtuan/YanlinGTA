// 開發者 侯舌：彥霖的同班同學，個性友好。攝影社社員、資管系學會攝影長（羊明衫也是攝影長，兩個人一起拍照修圖；
// 外面傳說他們關係不好，其實沒有）。喜歡打排球（常跟 YeeMing、吱吱一起打），喜歡韓國女團（每一團都認識，也收集小卡）。
// 很會拍照，很多學妹喜歡他：平常不是在跟學妹約會，就是在約會的路上。這個遊戲主要負責建築物內部規劃與部分店家功能。
// 外型照使用者給的照片：有一點肉肉、小麥色皮膚、細框眼鏡、黑色妹妹頭短髮、黑色寬版 T、深灰寬褲、白底紅色球鞋、銀項鍊。
// 住力行宿舍 276 寢 6 號床（進門左手邊第一個床位：靠門那張高架床，座位在床的正下方）。
// 一天（遊戲時鐘）：
//   02:00–09:00 睡覺（6 號床）；09:00–10:00、20:00–02:00 在書桌前開發這個遊戲（筆電上的程式碼一行一行打出來）；
//   10:00–13:00 在二一鐘塔前幫穿畢業袍的畢業生拍畢業照；13:00–15:00、18:00–20:00 跟學妹約會（在你附近的步道上散步，
//   每天是不同的學妹）；15:00–18:00 在體育館旁的排球場打排球（YeeMing 在對面）。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { VBALL, courtP } from '../../world/Court.js';
import { DevNPC, M, angDiff } from './DevNPC.js';

export const HOUSHE_LOOK = {
  skin: '#c99a72', hair: '#121010', hairStyle: 'bowl', glasses: true, glassesColor: '#bfc3c8',
  shirt: '#141416', shorts: '#4a4d52', pants: true, shoes: '#f2f0ec', build: 1.12, belly: 0.55, jaw: 1.1, face: true,
};
// the girls he goes out with (a different one every day)
const DATES = [
  { skin: '#f3d8c6', hair: '#2a1a14', hairStyle: 'long', shirt: '#f5e6d8', shorts: '#8fa9c9', pants: false, shoes: '#ffffff', bag: '#d9a7b0', face: true },
  { skin: '#efd2bc', hair: '#5a3a28', hairStyle: 'pony', shirt: '#b7d3e8', shorts: '#2c2c34', pants: true, shoes: '#f4f4f1', face: true },
  { skin: '#f6dccb', hair: '#151313', hairStyle: 'long', shirt: '#2b2b30', shorts: '#e8e2d6', pants: false, shoes: '#1c1c1c', glasses: true, face: true },
  { skin: '#f0d0b8', hair: '#7a4a2a', hairStyle: 'pony', shirt: '#ffd6e0', shorts: '#f2efe8', pants: true, shoes: '#f6c1cf', face: true },
];
const DATE_NAMES = ['學妹 小晴', '學妹 芊芊', '學妹 語彤', '學妹 安安'];
const GAP = 0.85;

const CODE = [
  '// 麥當勞 中原店：櫃台、用餐區、內場（侯舌）',
  'function buildMcD(I, scene) {',
  "  const k = I.kit('麥當勞', SAC.mcd), W = 14, D = 18, H = 3.4;",
  '  k.floor(0, W, 0, D, MT.tile60);',
  '  k.ceilingGrid(0, W, 0, D, H - 0.4);',
  '  // 點餐櫃台：收銀機 ×3、上方的菜單燈箱',
  '  k.counter(KX, 2.0, 9.5, { registers: 3 });',
  "  k.menuBoard(KX + 0.2, ['大麥克', '薯條']);",
  '  // 用餐區：四人桌一排、靠窗吧台',
  '  for (let i = 0; i < 5; i++) k.table4(3.2, 3 + i * 2.6);',
  '  k.barSeats(0.6, 2.5, 15.5, { stools: 8 });',
  '  I.actions.push({ x: k.x(KX - 0.8), z: k.z(5.2), r: 1.6,',
  "    label: () => '按 E 點餐', fn: (g) => g.mcd.order() });",
  '}',
  '',
  '// 內場動線：炸爐 → 出餐台 → 櫃台',
  "const FLOW = ['fryer', 'pass', 'counter'];",
  'const ok = (p) => p.aisles.every(a => a.w >= 0.9);',
];

// a camera (body, lens, a flash that pops now and then), held up at his eye
function buildCamera() {
  const g = new THREE.Group(), blk = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.45, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.07), blk); g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.085, 0.085), blk); grip.position.set(-0.06, 0, 0.01); g.add(grip);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.08, 18).rotateX(Math.PI / 2), blk); lens.position.set(0.01, -0.005, 0.07); g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.028, 18), new THREE.MeshStandardMaterial({ color: '#29405a', roughness: 0.1, metalness: 0.8 })); glass.position.set(0.01, -0.005, 0.111); g.add(glass);
  const flash = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.012), new THREE.MeshBasicMaterial({ color: '#ffffff' })); flash.position.set(0.04, 0.055, 0.02); flash.visible = false; g.add(flash);
  g.userData.flash = flash;
  return g;
}
// a graduate in a black gown (gold hood edge) and a square cap with a tassel
function buildGraduate(look) {
  const ch = createCharacter({ ...look, shirt: '#151518', shorts: '#151518', pants: true });
  const gown = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.85 });
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.0, 18, 1, true), gown); robe.position.y = 0.72; robe.material.side = THREE.DoubleSide; ch.root.add(robe);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e0b84a', roughness: 0.6 })); hood.position.set(0, 0.6, -0.01); ch.torso.add(hood);
  const cap = new THREE.Group(); cap.position.set(0, 0.235, -0.005); cap.rotation.x = -0.12; ch.head.add(cap);
  cap.add(new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.07, 16), gown));
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.014, 0.3), gown); board.position.y = 0.04; board.rotation.y = Math.PI / 4; cap.add(board);
  const tas = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), new THREE.MeshStandardMaterial({ color: '#e0b84a' })); tas.position.set(0.13, -0.01, 0.05); cap.add(tas);
  return ch;
}

export class Houshe extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'houshe', name: '侯舌', tag: '📷 侯舌', tagColor: '#ffd1dc', look: HOUSHE_LOOK, room: 276, bed: 6,
      desk: (R) => { const b = R.beds[6]; return R.desks.filter(d => d.bed === 6).sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0]; },
      file: 'Interiors.js — 麥當勞 中原店', lines: CODE,
    });
    this.places = {
      sleep: '在力行宿舍 276 寢睡覺（6 號床）', code: '在力行宿舍 276 寢開發遊戲（建築物內部）💻',
      photo: '在二一鐘塔前幫畢業生拍畢業照 📷', date: '跟學妹約會中 💕', volley: '在體育館旁的排球場打排球 🏐',
    };
    // the camera, up at his face while he shoots
    this.cam = buildCamera(); this.cam.position.set(0.0, 0.07, 0.2); this.cam.visible = false; this.ch.head.add(this.cam);
    // the graduation shoot in front of 二一鐘塔
    const tw = { x: -13.8, z: 96.4, h: 2.78 }, fx = Math.sin(tw.h), fz = Math.cos(tw.h), rx = Math.cos(tw.h), rz = -Math.sin(tw.h);
    this.grads = [
      buildGraduate({ skin: '#efd0b5', hair: '#1a1410', hairStyle: 'long', shoes: '#1b1b1b', face: true }),
      buildGraduate({ skin: '#e2b994', hair: '#141210', hairStyle: 'short', glasses: true, shoes: '#1b1b1b', face: true }),
    ];
    this.grads.forEach((c, i) => {
      const s = i ? 0.45 : -0.45, x = tw.x + rx * s, z = tw.z + rz * s;
      c.root.position.set(x, surfaceAt(x, z), z); c.root.rotation.y = tw.h; c.root.visible = false; game.scene.add(c.root);
      const t = makeLabel('🎓 畢業生', { height: 0.2, size: 36, color: '#e0b84a' }); t.position.set(0, 2.15, 0); c.root.add(t);
    });
    this.shoot = { x: tw.x + fx * 4.2, z: tw.z + fz * 4.2, h: tw.h + Math.PI, cx: tw.x, cz: tw.z };
    // the volleyball court by the gym: the other half from YeeMing, facing him over the net
    const gym = game.world.named['中原大學體育館'] || { x: 0, z: -330 };
    const C = VBALL.slice().sort((a, b) => Math.hypot(a.c[0] - gym.x, a.c[1] - gym.z) - Math.hypot(b.c[0] - gym.x, b.c[1] - gym.z))[0];
    if (C) { const [cx, cz] = courtP(C, 4.5, 0.6), [nx, nz] = courtP(C, 0, 0.6); this.court = { x: cx, z: cz, h: Math.atan2(nx - cx, nz - cz) }; }
    // the girl on today's date
    this.dates = DATES.map((look, i) => {
      const c = createCharacter(look), t = makeLabel(`💕 ${DATE_NAMES[i]}`, { height: 0.22, size: 36, color: '#ffb3c7' });
      t.position.set(0, 1.95, 0); c.root.add(t); c.root.visible = false; game.scene.add(c.root); return c;
    });
    this.walkOn = false; this.wait = 2; this.flashT = 2;
  }
  plan(m) {
    if (m >= M(2) && m < M(9)) return 'sleep';
    if (m >= M(10) && m < M(13)) return 'photo';
    if ((m >= M(13) && m < M(15)) || (m >= M(18) && m < M(20))) return 'date';
    if (m >= M(15) && m < M(18)) return 'volley';
    return 'code';
  }
  doing() { return { code: '寫程式', photo: '拍畢業照', date: '約會中', volley: '打排球' }[this.mode] || ''; }
  sleepLines() { return [['侯舌', '（呼……呼……）'], ['彥霖', '（侯舌在 6 號床上睡著了，枕頭邊擺著一整排韓團小卡……）']]; }
  get date() { return this.dates[Math.floor(this.g.clock / 1440) % this.dates.length]; }
  onMode(mode, was) {
    this.cam.visible = mode === 'photo';
    if (was === 'photo') for (const c of this.grads) c.root.visible = false;
    if (was === 'date') { this.walkOn = false; for (const d of this.dates) d.root.visible = false; }
    this.wait = 1.5;
  }
  _outdoor(dt, mode) {
    if (mode === 'photo') return this._photo(dt);
    if (mode === 'volley') { if (this.court) this.standAt(dt, this.court, 'bump'); else this.ch.root.visible = false; return; }
    if (mode === 'date') return this._date(dt);
    this.ch.root.visible = false;
  }
  _photo(dt) {
    const S = this.shoot, shown = this.standAt(dt, S, 'shoot');
    this.cam.visible = this.pause <= 0;
    for (const [i, c] of this.grads.entries()) {
      c.root.visible = shown;
      if (shown) c.update(dt, { speed: 0, mode: 'foot', pose: (Math.floor(this.g.time / 3.2) + i) % 3 === 0 ? 'cheer' : 'peace' });
    }
    // the flash pops every few seconds
    if (shown && this.pause <= 0) { this.flashT -= dt; const f = this.cam.userData.flash; f.visible = this.flashT < 0.09; if (this.flashT <= 0) this.flashT = 2.2 + Math.random() * 1.8; }
  }
  // ---- out on a date: walking a footpath near you, side by side (like YeeMing and 羊明衫) ----
  _appear() {
    const w = this.g.world, p = this.g.player.worldPos();
    const near = w.walkNodes.filter(n => { const d = Math.hypot(n.x - p.x, n.z - p.z); return d > 30 && d < 90 && w.inCampus(n.x, n.z); });
    if (!near.length) return false;
    const n = near[Math.floor(Math.random() * near.length)];
    this.from = n; this.to = this._pick(n, null); this.d = 0; this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
    this.pos.set(n.x, surfaceAt(n.x, n.z), n.z); this.heading = Math.atan2(this.to.x - n.x, this.to.z - n.z); this.pause = 0;
    this.walkOn = true; return true;
  }
  _pick(n, from) {
    let opts = n.adj.filter(e => e.to !== from && this.g.world.inCampus(e.to.x, e.to.z));
    if (!opts.length) opts = n.adj;
    return opts[Math.floor(Math.random() * opts.length)].to;
  }
  _date(dt) {
    const g = this.g, p = g.player.worldPos(), D = this.date;
    for (const d of this.dates) if (d !== D) d.root.visible = false;
    if (!this.walkOn) { this.ch.root.visible = false; D.root.visible = false; if ((this.wait -= dt) <= 0 && !this._appear()) this.wait = 12; return; }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (dPl > 170 && !g.hud.inDialog) { this.walkOn = false; this.wait = 15; this.ch.root.visible = false; D.root.visible = false; return; }
    let speed = 0;
    if (g.hud.inDialog && dPl < 5) this.pause = Math.max(this.pause, 0.5);
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 5);
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.05; this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to; this.to = this._pick(n, this.from); this.from = n; this.d = 0; this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.3) this.pause = 3 + Math.random() * 4; // stops to take a photo of her
      }
      const k = this.d / this.len, dx = this.to.x - this.from.x, dz = this.to.z - this.from.z, off = 0.3;
      const tx = this.from.x + dx * k - dz / this.len * off, tz = this.from.z + dz * k + dx / this.len * off;
      this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 4); this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 4);
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 5);
    }
    this.pos.y = surfaceAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    const ch = this.ch, h = this.heading, close = dPl < 35; ch.root.visible = true;
    ch.root.position.copy(this.pos); ch.root.rotation.y = h; ch.setDetail?.(close);
    const talking = this.pause > 0 && this.face != null, posing = this.pause > 0 && this.face == null;
    this.cam.visible = posing;
    ch.update(dt, { speed, mode: 'foot', pose: talking ? 'talk' : posing ? 'shoot' : null });
    // she walks on his right; when he stops for a photo she steps out in front and poses
    const rx = -Math.cos(h), rz = Math.sin(h);
    const sx = posing ? this.pos.x + Math.sin(h) * 2.4 : this.pos.x + rx * GAP, sz = posing ? this.pos.z + Math.cos(h) * 2.4 : this.pos.z + rz * GAP;
    const dc = D; dc.root.visible = true; dc.root.position.set(sx, surfaceAt(sx, sz, this.pos.y + 0.5), sz);
    dc.root.rotation.y = posing ? h + Math.PI : talking ? this.face : h; dc.setDetail?.(close);
    dc.update(dt, { speed: posing ? 0 : speed, mode: 'foot', pose: posing ? 'peace' : null });
  }
}
