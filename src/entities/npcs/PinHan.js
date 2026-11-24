// 品漢堡：彥霖的同學，成績很好，喜歡健身跟讀書，話比較少。外型照使用者給的照片：皮膚偏白、黑色有瀏海的短髮、細金框圓眼鏡、深色 T 恤。
// 住力行宿舍 278 寢 4 號床（高架床，劍玉的室友，src/entities/npcs/Jianyu.js），座位是 4 號床下面那張書桌。
// 一天（遊戲時鐘）：
//   01:00–08:00 睡覺；17:00–19:00 在體育館西側正門外重訓（霍華德的旁邊，src/entities/npcs/Howard.js GYM）；
//   其他時間在書桌前讀書：早上跟晚上讀英文（多益單字），白天讀資管所補習班的參考書（計算機概論、資料結構、管理資訊系統輪流）。
// 劍玉說「有時候週末看不到他，是因為他在跟不同女生約會」：真實世界的週六、週日（跟義務役一樣照真實日期，src/entities/npcs/Service.js），
//   大約一半的週末日 12:00–23:00 出去約會（學校裡看不到他）。
// 有時候開車載大家去 IKEA 買生活用品：支線「幫品漢堡找一台車」（src/systems/quests/PinHanCar.js）完成、他有車之後，
//   大約 3 天有 1 天 14:00–17:00 開車去 IKEA（學校裡看不到他）。
// 支線進行中（他在等車）：09:00–21:00 在正門口（src/world/MainGateSpec.js forecourt）等你把車開來。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { surfaceAt } from '../../world/Terrain.js';
import { DevNPC, M, addCurls } from './DevNPC.js';

const H32 = (n) => {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};

export const PINHAN_LOOK = {
  skin: '#efc9ad',
  hair: '#17120f',
  hairStyle: 'bowl',
  glasses: true,
  glassesColor: '#c2a56e',
  shirt: '#2b2e35',
  shorts: '#3a3f4a',
  pants: true,
  shoes: '#ededea',
  build: 1.02,
  face: true,
};
// his figure: the fringe plus a little volume on top (the photo's soft, slightly wavy hair); also used by tools/npc-dashboard
export function createPinHan() {
  const ch = createCharacter(PINHAN_LOOK);
  addCurls(ch, PINHAN_LOOK.hair, { down: 0.75, n: 110, size: 0.7 });
  return ch;
}

// the gym: a few metres along from 霍華德's spot in front of the 體育館's main entrance (src/entities/npcs/Howard.js GYM)
const GYM = { x: -38.6, z: -228.6, h: Math.atan2(-0.996, -0.088) };
// waiting for the car at the main gate: on the forecourt pavers beside the exit lane, facing the road
export const GATE_SPOT = { x: -208.6, z: 77.6, h: Math.atan2(1, 0.45) };

// the open book on his desk: an English vocabulary book or a cram-school reference book for the 資管所 entrance exam
function pageTex(kind) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 160;
  const x = cv.getContext('2d');
  x.fillStyle = '#f7f3e8';
  x.fillRect(0, 0, 256, 160);
  x.fillStyle = '#d9d2bf';
  x.fillRect(126, 0, 4, 160);
  x.fillStyle = '#2b2b2b';
  x.font = '700 13px "Microsoft JhengHei",sans-serif';
  const L =
    kind === 'eng'
      ? ['TOEIC 必考單字', 'abundant 豐富的', 'allocate 分配', 'comply 遵守', 'deficit 赤字']
      : kind === 'ds'
        ? ['資料結構 講義', 'Binary Search Tree', 'AVL rotation', 'Heap / Priority Q', 'Big-O 分析']
        : kind === 'mis'
          ? ['管理資訊系統', 'ERP / CRM / SCM', 'Porter 五力', '價值鏈分析', '決策支援系統']
          : ['計算機概論', 'Cache / TLB', 'Pipeline hazard', 'OSI 七層', 'Two-phase lock'];
  L.forEach((t, i) => x.fillText(t, 8, 22 + i * 26));
  x.fillStyle = '#7a7a7a';
  for (let i = 0; i < 6; i++) x.fillRect(138, 16 + i * 22, 100 - (i % 3) * 18, 3);
  x.fillStyle = '#e04a4a';
  x.fillRect(138, 140, 40, 3); // a red underline
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const BOOKS = ['eng', 'co', 'ds', 'mis'];
const BOOK_NAME = { eng: '英文', co: '計算機概論', ds: '資料結構', mis: '管理資訊系統' };

export class PinHan extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'pinhan',
      name: '品漢堡',
      tag: '📘 品漢堡',
      tagColor: '#b9d4ff',
      look: PINHAN_LOOK,
      create: createPinHan,
      room: 278,
      bed: 4,
      // the desk under his loft bed (two reach under it: the one whose middle is nearest the bed's)
      desk: (R) =>
        R.desks
          .filter((d) => d.bed === 4)
          .sort(
            (a, b) =>
              Math.hypot(a.x - R.beds[4].x, a.z - R.beds[4].z) -
              Math.hypot(b.x - R.beds[4].x, b.z - R.beds[4].z)
          )[0],
      file: '',
      lines: [''],
      games: {},
    });
    this.places = {
      sleep: '在力行宿舍 278 寢睡覺（4 號床）',
      dorm: '在力行宿舍 278 寢讀書 📘',
      gym: '在體育館正門外重訓 💪',
      ikea: '開車載大家去 IKEA 買生活用品 🚗',
      date: '週末出去約會了（劍玉說每次都不同人）',
      wait: '在正門口等你把車開來 🚗',
    };
    // no laptop for him: a book instead (the desk's laptop stays put away)
    if (this.lap) {
      const tick = this.lap.tick;
      this.lap.tick = (dt, _m, d) => {
        tick(dt, 'off', d);
        this.lap.group.visible = false;
      };
    }
    this._book();
    // at the gate with your car parked beside him: the talk action hands it over (src/systems/quests/PinHanCar.js)
    const A = this.action,
      label = A.label,
      fn = A.fn;
    A.label = () =>
      this.mode === 'wait' && game.pinhanCar?.carHere()
        ? '按 <kbd>E</kbd> 把車交給品漢堡'
        : label();
    A.fn = () => {
      if (this.mode === 'wait' && game.pinhanCar?.give()) return;
      fn();
    };
    // a dumbbell in each hand at the gym
    const blk = new THREE.MeshStandardMaterial({
      color: '#1d1f22',
      roughness: 0.5,
      metalness: 0.5,
    });
    this.bells = this.ch.arms.map((a) => {
      const d = new THREE.Group();
      d.add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8).rotateZ(Math.PI / 2), blk)
      );
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14).rotateZ(Math.PI / 2),
          blk
        );
        p.position.x = 0.07 * s;
        d.add(p);
      }
      d.position.set(0, -0.28, 0.03);
      d.visible = false;
      a.el.add(d);
      return d;
    });
    this.gymSpot = { ...GYM, y: surfaceAt(GYM.x, GYM.z) };
    this.gateSpot = { ...GATE_SPOT, y: surfaceAt(GATE_SPOT.x, GATE_SPOT.z) };
  }
  _book() {
    const H = this.home;
    if (!H) return;
    const { L, R } = H,
      desk = this.cfg.desk(R),
      s = Math.sign(-Math.sin(desk.face)) || 1;
    const [x, z] = L.W(desk.x + s * 0.12, desk.z);
    this.texs = Object.fromEntries(BOOKS.map((k) => [k, pageTex(k)]));
    const book = (this.book = new THREE.Group()),
      pages = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.26),
        new THREE.MeshStandardMaterial({ map: this.texs.eng, roughness: 0.9 })
      ),
      cover = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.012, 0.28),
        new THREE.MeshStandardMaterial({ color: '#2d4f8a', roughness: 0.8 })
      );
    pages.rotation.x = -Math.PI / 2;
    pages.position.y = 0.0065;
    book.add(cover, pages);
    book.position.set(x, L.B + R.y + 0.77, z);
    book.rotation.y = L.k.heading(desk.face + Math.PI);
    this.g.scene.add(book);
  }
  // what he is reading now: English in the morning and the evening, the cram-school books in between (a different one every 2 hours)
  reading() {
    const m = this.minute ?? 0;
    if (m < M(11) || m >= M(20)) return 'eng';
    return BOOKS[1 + (Math.floor(m / 120) % 3)];
  }
  // a weekend day in the real world (like 義務役) he is out on a date: about half of them
  dateDay() {
    const q =
      typeof location !== 'undefined' ? new URLSearchParams(location.search).get('date') : null;
    const mt = q && /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(q),
      d = mt ? new Date(+mt[1], +mt[2] - 1, +mt[3]) : new Date();
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) return false;
    return H32(d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate()) < 0.5;
  }
  ikeaDay(day) {
    return !!this.g.pinhanCar?.done && H32(day * 17 + 11) < 0.34;
  }
  plan(m) {
    this.minute = m;
    const day = Math.floor(this.g.clock / 1440);
    if (m >= M(1) && m < M(8)) return 'sleep';
    if (this.g.pinhanCar?.waiting && m >= M(9) && m < M(21)) return 'wait';
    if (m >= M(12) && m < M(23) && this.dateDay()) return 'date';
    if (m >= M(14) && m < M(17) && this.ikeaDay(day)) return 'ikea';
    if (m >= M(17) && m < M(19)) return 'gym';
    return 'dorm';
  }
  doing() {
    return { dorm: `讀${BOOK_NAME[this.reading()]}`, gym: '重訓', wait: '在等車' }[this.mode] || '';
  }
  where() {
    if (this.mode === 'dorm') return `在力行宿舍 278 寢讀${BOOK_NAME[this.reading()]} 📘`;
    return this.places[this.mode] || '在力行宿舍 278 寢';
  }
  sleepLines() {
    return [
      ['品漢堡', '（呼……）'],
      ['彥霖', '（品漢堡睡得很規律，書桌上的書還整整齊齊地夾著書籤）'],
    ];
  }
  // reading at his desk
  dormSpot() {
    return this.home.seat;
  }
  dormTick(dt, at) {
    const g = this.g,
      p = g.player.pos,
      talking = g.hud.inDialog && Math.hypot(p.x - at.x, p.z - at.z) < 3;
    if (this.book) {
      const k = this.reading();
      if (this.book.children[1].material.map !== this.texs[k]) {
        this.book.children[1].material.map = this.texs[k];
        this.book.children[0].material.color.set(k === 'eng' ? '#2d4f8a' : '#8a2d3b');
      }
    }
    this.ch.root.rotation.y = talking
      ? at.h + Math.atan2(Math.sin(Math.atan2(p.x - at.x, p.z - at.z) - at.h), 1) * 0.35
      : at.h;
    this.ch.update(dt, { speed: 0, mode: 'sit', pose: talking ? 'talk' : 'read' });
  }
  onMode(mode) {
    for (const b of this.bells) b.visible = mode === 'gym';
  }
  _outdoor(dt, mode) {
    if (mode === 'gym') {
      this.standAt(dt, this.gymSpot, 'curl');
      return;
    }
    if (mode === 'wait') {
      this.standAt(dt, this.gateSpot, 'look');
      return;
    }
    this.ch.root.visible = false; // out on a date / at IKEA
  }
}
