// 開發者 侯舌：彥霖的同班同學，個性友好。攝影社社員、資管系學會攝影長（羊明衫也是攝影長，兩個人一起拍照修圖；
// 外面傳說他們關係不好，其實沒有）。喜歡打排球（常跟 YeeMing、吱吱一起打），喜歡韓國女團（每一團都認識，也收集小卡）。
// 很會拍照，很多學妹喜歡他：平常不是在跟學妹約會，就是在約會的路上。這個遊戲主要負責建築物內部規劃與部分店家功能。
// 外型照使用者給的照片：有一點肉肉、小麥色皮膚、細框眼鏡、黑色妹妹頭短髮、黑色寬版 T、深灰寬褲、白底紅色球鞋、銀項鍊。
// 住力行宿舍 276 寢 4 號床（進門左手邊第一個床位：靠門那張高架床，座位在床的正下方）。
// 一天（遊戲時鐘）：
//   02:00–09:00 睡覺（4 號床）；09:00–10:00、20:00–02:00 在書桌前開發這個遊戲（筆電上的程式碼一行一行打出來）；
//   10:00–13:00 在二一鐘塔前幫穿畢業袍的畢業生拍畢業照；13:00–15:00、18:00–20:00 輪流跟學妹張娜榮、楊子嫻、金采源約會（在你附近的步道上散步，每天換一位）；15:00–18:00 在體育館旁的排球場打排球（YeeMing 在對面）。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { VBALL, courtP } from '../../world/Court.js';
import { DevNPC, M, angDiff } from './DevNPC.js';

export const HOUSHE_LOOK = {
  skin: '#c99a72',
  hair: '#121010',
  hairStyle: 'bowl',
  glasses: true,
  glassesColor: '#bfc3c8',
  shirt: '#141416',
  shorts: '#4a4d52',
  pants: true,
  shoes: '#f2f0ec',
  build: 1.12,
  belly: 0.55,
  jaw: 1.1,
  face: true,
};
// his juniors (學妹) he goes out with, taking turns day by day:
//   張娜榮 — fair skin, long straight black hair with full see-through bangs, black top, white shorts
//   楊子嫻 — fair skin, long black hair with bangs, white top, light-wash jeans
//   金采源 — a chin-length black bob with full bangs, white sporty top, black shorts
const DATES = [
  {
    skin: '#f6dfd0',
    hair: '#141012',
    hairStyle: 'hime',
    shirt: '#1b1a1e',
    shorts: '#f3f1ee',
    pants: false,
    hem: -0.22,
    shoes: '#ffffff',
    chin: 0.6,
    face: true,
  },
  {
    skin: '#f5dccb',
    hair: '#16110f',
    hairStyle: 'long',
    shirt: '#f6f4f0',
    shorts: '#9fb8d4',
    pants: true,
    shoes: '#f4f4f1',
    chin: 0.55,
    face: true,
  },
  {
    skin: '#f7e1d3',
    hair: '#121012',
    hairStyle: 'bob',
    shirt: '#f4f2ee',
    shorts: '#151517',
    pants: false,
    hem: -0.22,
    shoes: '#f4f4f1',
    chin: 0.65,
    face: true,
  },
];
const DATE_NAMES = ['張娜榮', '楊子嫻', '金采源'];
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
  const g = new THREE.Group(),
    blk = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.45, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.07), blk);
  g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.085, 0.085), blk);
  grip.position.set(-0.06, 0, 0.01);
  g.add(grip);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.038, 0.08, 18).rotateX(Math.PI / 2),
    blk
  );
  lens.position.set(0.01, -0.005, 0.07);
  g.add(lens);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.028, 18),
    new THREE.MeshStandardMaterial({ color: '#29405a', roughness: 0.1, metalness: 0.8 })
  );
  glass.position.set(0.01, -0.005, 0.111);
  g.add(glass);
  const flash = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.02, 0.012),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  );
  flash.position.set(0.04, 0.055, 0.02);
  flash.visible = false;
  g.add(flash);
  g.userData.flash = flash;
  return g;
}
// his own camera on the desk in 276: a Nikon Z50 body (126.5 × 93.5 × 60 mm, deep right-hand grip, the viewfinder hump
// with the white Nikon logo, a red accent line on the grip, mode dial top left, command dial and shutter on the grip,
// tilting screen on the back) with a NIKKOR Z 24-70mm f/4 S (Ø77.5 × 88.5 mm retracted: wide ribbed zoom ring,
// smooth control ring at the front, white lettering). Built in metres, origin at the middle of the base, lens towards +z.
function textTex(t, w, h, font, color = '#f2f2f2', bg = '#141416') {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = color;
  x.font = font;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(t, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function buildZ50() {
  const g = new THREE.Group();
  const blk = new THREE.MeshStandardMaterial({
    color: '#17181b',
    roughness: 0.55,
    metalness: 0.15,
  });
  const grain = new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.9 }); // leatherette on the grip / rubber rings
  const gloss = new THREE.MeshStandardMaterial({
    color: '#202226',
    roughness: 0.3,
    metalness: 0.4,
  });
  const box = (w, h, d, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const cyl = (r0, r1, len, m, x, y, z, seg = 28) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, seg).rotateX(Math.PI / 2), m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const knob = (r, h, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  }; // upright, on the top plate
  // body: the main slab, the deep grip on the right (seen from the front: -x), the hump with the EVF
  box(0.1265, 0.072, 0.036, blk, 0, 0.036, 0);
  box(0.03, 0.07, 0.016, grain, -0.047, 0.035, 0.026);
  const front = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.07, 20, 1, false, Math.PI * 1.5, Math.PI),
    grain
  ); // the rounded front of the grip
  front.position.set(-0.047, 0.035, 0.034);
  g.add(front);
  const hump = box(0.05, 0.022, 0.04, blk, 0, 0.083, -0.002);
  hump.geometry = new THREE.CylinderGeometry(0.018, 0.03, 0.022, 4, 1).rotateY(Math.PI / 4);
  hump.scale.set(1.15, 1, 0.95);
  box(0.034, 0.02, 0.012, grain, 0, 0.079, -0.024); // eyepiece
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.03, 0.009),
    new THREE.MeshBasicMaterial({ map: textTex('Nikon', 128, 38, 'italic 900 30px Arial') })
  );
  logo.position.set(0, 0.083, 0.0145);
  logo.rotation.x = -0.32;
  g.add(logo);
  box(
    0.002,
    0.024,
    0.004,
    new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.5 }),
    -0.0295,
    0.058,
    0.046
  ); // red line on the grip
  // top plate: mode dial (left), command dial and the shutter on the grip, the power lever
  knob(0.011, 0.007, gloss, 0.04, 0.0755, -0.004);
  knob(0.009, 0.005, gloss, -0.03, 0.0745, -0.006);
  knob(0.0055, 0.004, gloss, -0.047, 0.073, 0.03);
  knob(
    0.0075,
    0.002,
    new THREE.MeshStandardMaterial({ color: '#8d9096', metalness: 0.8, roughness: 0.3 }),
    -0.047,
    0.071,
    0.03
  );
  // back: the screen
  const lcd = new THREE.Mesh(
    new THREE.PlaneGeometry(0.075, 0.05),
    new THREE.MeshStandardMaterial({ color: '#0b0d12', roughness: 0.15, metalness: 0.5 })
  );
  lcd.position.set(0.012, 0.036, -0.0185);
  lcd.rotation.y = Math.PI;
  g.add(lcd);
  // Z mount (silver ring) and the lens
  const ay = 0.04;
  cyl(
    0.031,
    0.031,
    0.004,
    new THREE.MeshStandardMaterial({ color: '#b8bbc0', metalness: 0.9, roughness: 0.25 }),
    0.004,
    ay,
    0.019
  );
  cyl(0.0388, 0.0388, 0.02, blk, 0.004, ay, 0.031); // base of the barrel
  cyl(0.0392, 0.0392, 0.036, grain, 0.004, ay, 0.058, 40); // wide zoom ring
  for (let i = 0; i < 7; i++) cyl(0.0396, 0.0396, 0.0018, grain, 0.004, ay, 0.043 + i * 0.005, 40); // its ribs
  cyl(0.0384, 0.0384, 0.012, gloss, 0.004, ay, 0.082); // smooth control ring
  cyl(0.0388, 0.0375, 0.008, blk, 0.004, ay, 0.092); // front of the barrel
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.03, 32),
    new THREE.MeshStandardMaterial({ color: '#1d2e45', roughness: 0.05, metalness: 0.9 })
  );
  glass.position.set(0.004, ay, 0.0962);
  g.add(glass);
  // the white lettering on top of the barrel
  const txt = new THREE.Mesh(
    new THREE.PlaneGeometry(0.03, 0.006),
    new THREE.MeshBasicMaterial({ map: textTex('24-70  4 S', 160, 32, '700 24px Arial') })
  );
  txt.position.set(0.004, ay + 0.0391, 0.031);
  txt.rotation.x = -Math.PI / 2;
  txt.rotation.z = Math.PI / 2;
  g.add(txt);
  return g;
}
// a graduate in a black gown (gold hood edge) and a square cap with a tassel
function buildGraduate(look) {
  const ch = createCharacter({ ...look, shirt: '#151518', shorts: '#151518', pants: true });
  const gown = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.85 });
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.0, 18, 1, true), gown);
  robe.position.y = 0.72;
  robe.material.side = THREE.DoubleSide;
  ch.root.add(robe);
  const hood = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.03, 8, 20).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#e0b84a', roughness: 0.6 })
  );
  hood.position.set(0, 0.6, -0.01);
  ch.torso.add(hood);
  const cap = new THREE.Group();
  cap.position.set(0, 0.235, -0.005);
  cap.rotation.x = -0.12;
  ch.head.add(cap);
  cap.add(new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.07, 16), gown));
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.014, 0.3), gown);
  board.position.y = 0.04;
  board.rotation.y = Math.PI / 4;
  cap.add(board);
  const tas = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.11, 0.012),
    new THREE.MeshStandardMaterial({ color: '#e0b84a' })
  );
  tas.position.set(0.13, -0.01, 0.05);
  cap.add(tas);
  return ch;
}

export class Houshe extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'houshe',
      name: '侯舌',
      tag: '📷 侯舌',
      tagColor: '#ffd1dc',
      look: HOUSHE_LOOK,
      room: 276,
      bed: 4,
      desk: (R) => {
        const b = R.beds[4];
        return R.desks
          .filter((d) => d.bed === 4)
          .sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
      },
      file: 'Interiors.js — 麥當勞 中原店',
      lines: CODE,
    });
    this.places = {
      sleep: '在力行宿舍 276 寢睡覺（4 號床）',
      code: '在力行宿舍 276 寢開發遊戲（建築物內部）💻',
      photo: '在二一鐘塔前幫畢業生拍畢業照 📷',
      date: () => `跟學妹${this.dateName}約會中 💕`,
      volley: '在體育館旁的排球場打排球 🏐',
    };
    // the camera, up at his face while he shoots
    this.cam = buildCamera();
    this.cam.position.set(0.0, 0.07, 0.2);
    this.cam.visible = false;
    this.ch.head.add(this.cam);
    // the graduation shoot in front of 二一鐘塔
    const tw = { x: -13.8, z: 96.4, h: 2.78 },
      fx = Math.sin(tw.h),
      fz = Math.cos(tw.h),
      rx = Math.cos(tw.h),
      rz = -Math.sin(tw.h);
    this.grads = [
      buildGraduate({
        skin: '#efd0b5',
        hair: '#1a1410',
        hairStyle: 'long',
        shoes: '#1b1b1b',
        face: true,
      }),
      buildGraduate({
        skin: '#e2b994',
        hair: '#141210',
        hairStyle: 'short',
        glasses: true,
        shoes: '#1b1b1b',
        face: true,
      }),
    ];
    this.grads.forEach((c, i) => {
      const s = i ? 0.45 : -0.45,
        x = tw.x + rx * s,
        z = tw.z + rz * s;
      c.root.position.set(x, surfaceAt(x, z), z);
      c.root.rotation.y = tw.h;
      c.root.visible = false;
      game.scene.add(c.root);
      const t = makeLabel('🎓 畢業生', { height: 0.2, size: 36, color: '#e0b84a' });
      t.position.set(0, 2.15, 0);
      c.root.add(t);
    });
    this.shoot = { x: tw.x + fx * 4.2, z: tw.z + fz * 4.2, h: tw.h + Math.PI, cx: tw.x, cz: tw.z };
    // the volleyball court by the gym: the other half from YeeMing, facing him over the net
    const gym = game.world.named['中原大學體育館'] || { x: 0, z: -330 };
    const C = VBALL.slice().sort(
      (a, b) =>
        Math.hypot(a.c[0] - gym.x, a.c[1] - gym.z) - Math.hypot(b.c[0] - gym.x, b.c[1] - gym.z)
    )[0];
    if (C) {
      const [cx, cz] = courtP(C, 4.5, 0.6),
        [nx, nz] = courtP(C, 0, 0.6);
      this.court = { x: cx, z: cz, h: Math.atan2(nx - cx, nz - cz) };
    }
    // the girl on today's date
    this.dates = DATES.map((look, i) => {
      const c = createCharacter(look),
        t = makeLabel(`💕 學妹 ${DATE_NAMES[i]}`, { height: 0.22, size: 36, color: '#ffb3c7' });
      t.position.set(0, 1.95, 0);
      c.root.add(t);
      c.root.visible = false;
      game.scene.add(c.root);
      return c;
    });
    this.walkOn = false;
    this.wait = 2;
    this.flashT = 2;
  }
  // the room: the laptop (DevNPC) plus his Z50 on the desk beside it, lens towards the aisle
  _dorm() {
    super._dorm();
    if (!this.lap || this.z50) return;
    const L = this.g.interiors.lixing,
      R = L.rooms[this.cfg.room],
      desk = this.cfg.desk(R),
      s = Math.sign(-Math.sin(desk.face)) || 1;
    const [x, z] = L.W(desk.x + s * 0.06, desk.z - 0.36);
    this.z50 = buildZ50();
    this.z50.position.set(x, L.B + R.y + 0.76, z);
    this.z50.rotation.y = L.k.heading(desk.face + Math.PI) + Math.PI + 0.5;
    this.lap.group.add(this.z50); // shown only when you are close, like the laptop
  }
  plan(m) {
    if (m >= M(2) && m < M(9)) return 'sleep';
    if (m >= M(10) && m < M(13)) return 'photo';
    if ((m >= M(13) && m < M(15)) || (m >= M(18) && m < M(20))) return 'date';
    if (m >= M(15) && m < M(18)) return 'volley';
    return 'code';
  }
  doing() {
    return { code: '寫程式', photo: '拍畢業照', date: '約會中', volley: '打排球' }[this.mode] || '';
  }
  sleepLines() {
    return [
      ['侯舌', '（呼……呼……）'],
      ['彥霖', '（侯舌在 4 號床上睡著了，枕頭邊擺著一整排韓團小卡……）'],
    ];
  }
  get dateIdx() {
    return Math.floor(this.g.clock / 1440) % this.dates.length;
  }
  get date() {
    return this.dates[this.dateIdx];
  }
  get dateName() {
    return DATE_NAMES[this.dateIdx];
  }
  onMode(mode, was) {
    this.cam.visible = mode === 'photo';
    if (was === 'photo') for (const c of this.grads) c.root.visible = false;
    if (was === 'date') {
      this.walkOn = false;
      for (const d of this.dates) d.root.visible = false;
    }
    this.wait = 1.5;
  }
  _outdoor(dt, mode) {
    if (mode === 'photo') return this._photo(dt);
    if (mode === 'volley') {
      if (this.court) this.standAt(dt, this.court, 'bump');
      else this.ch.root.visible = false;
      return;
    }
    if (mode === 'date') return this._date(dt);
    this.ch.root.visible = false;
  }
  _photo(dt) {
    const S = this.shoot,
      shown = this.standAt(dt, S, 'shoot');
    this.cam.visible = this.pause <= 0;
    for (const [i, c] of this.grads.entries()) {
      c.root.visible = shown;
      if (shown)
        c.update(dt, {
          speed: 0,
          mode: 'foot',
          pose: (Math.floor(this.g.time / 3.2) + i) % 3 === 0 ? 'cheer' : 'peace',
        });
    }
    // the flash pops every few seconds
    if (shown && this.pause <= 0) {
      this.flashT -= dt;
      const f = this.cam.userData.flash;
      f.visible = this.flashT < 0.09;
      if (this.flashT <= 0) this.flashT = 2.2 + Math.random() * 1.8;
    }
  }
  // ---- out on a date: walking a footpath near you, side by side (like YeeMing and 羊明衫; _appear / _pick in DevNPC) ----
  _date(dt) {
    const g = this.g,
      p = g.player.worldPos(),
      D = this.date;
    for (const d of this.dates) if (d !== D) d.root.visible = false;
    if (!this.walkOn) {
      this.ch.root.visible = false;
      D.root.visible = false;
      if ((this.wait -= dt) <= 0 && !this._appear()) this.wait = 12;
      return;
    }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (dPl > 170 && !g.hud.inDialog) {
      this.walkOn = false;
      this.wait = 15;
      this.ch.root.visible = false;
      D.root.visible = false;
      return;
    }
    let speed = 0;
    if (g.hud.inDialog && dPl < 5) this.pause = Math.max(this.pause, 0.5);
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 5);
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.05;
      this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to;
        this.to = this._pick(n, this.from);
        this.from = n;
        this.d = 0;
        this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.3) this.pause = 3 + Math.random() * 4; // stops to take a photo of her
      }
      const k = this.d / this.len,
        dx = this.to.x - this.from.x,
        dz = this.to.z - this.from.z,
        off = 0.3;
      const tx = this.from.x + dx * k - (dz / this.len) * off,
        tz = this.from.z + dz * k + (dx / this.len) * off;
      this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 4);
      this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 4);
      this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 5);
    }
    this.pos.y = surfaceAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    const ch = this.ch,
      h = this.heading,
      close = dPl < 35;
    ch.root.visible = true;
    ch.root.position.copy(this.pos);
    ch.root.rotation.y = h;
    ch.setDetail?.(close);
    const talking = this.pause > 0 && this.face != null,
      posing = this.pause > 0 && this.face == null;
    this.cam.visible = posing;
    ch.update(dt, { speed, mode: 'foot', pose: talking ? 'talk' : posing ? 'shoot' : null });
    // she walks on his right; when he stops for a photo she steps out in front and poses
    const rx = -Math.cos(h),
      rz = Math.sin(h);
    const sx = posing ? this.pos.x + Math.sin(h) * 2.4 : this.pos.x + rx * GAP,
      sz = posing ? this.pos.z + Math.cos(h) * 2.4 : this.pos.z + rz * GAP;
    const dc = D;
    dc.root.visible = true;
    dc.root.position.set(sx, surfaceAt(sx, sz, this.pos.y + 0.5), sz);
    dc.root.rotation.y = posing ? h + Math.PI : talking ? this.face : h;
    dc.setDetail?.(close);
    dc.update(dt, { speed: posing ? 0 : speed, mode: 'foot', pose: posing ? 'peace' : null });
  }
}
