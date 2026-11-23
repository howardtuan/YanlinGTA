// 開發者 霍華德：彥霖的同班同學，個性友好。打 LOL（什麼模式都打）、打特戰英豪；魔術社社員，擅長變玫瑰花和撲克牌魔術。
// 常常教同學會計學。晚餐後先跟女朋友 Tzuyu 在學校散步，再去健身房重訓（在體育館西側正門外看得到他）。這個遊戲主要負責任務開發、NPC 角色設計，
// 和各種小應用（手機 App、電腦 App 幾乎都是他優化的）。
// 外型照使用者給的照片：皮膚偏白、細框圓眼鏡、燙捲的短髮、粉色上衣。
// 住力行宿舍 279 寢 3 號床（右手邊最裡面那張下舖，上舖 2 號是漢克；座位是右手邊最裡面的書桌）。
// 一天（遊戲時鐘）：
//   02:00–09:00 睡覺；09:00–12:00、14:00–16:00 在書桌前開發這個遊戲（任務、NPC、手機 App）；
//   12:00–14:00 在寢室練撲克牌魔術手法（牌在兩手之間飛）；16:00–18:30 打 LOL；
//   18:30–22:30 晚餐後跟女朋友 Tzuyu 手牽手在校園步道散步（在你附近出現，跟 YeeMing 和羊明衫一樣）；
//   22:30–24:00 在體育館西側正門外重訓（啞鈴彎舉）；00:00–02:00 打特戰英豪。
// 女朋友 Tzuyu：韓國女團「兔瓦斯」的成員，平常都在韓國，只有跟霍華德散步的時候才會出現在學校；也認識彥霖的女朋友 aespo Winter。
//   高挑、皮膚白皙、黑色長直髮，白色上衣配淺色牛仔褲。散步時走到她旁邊按 E 可以跟她聊天、加好友（src/ui/phone/Friends.js 的 tzuyu），
//   加好友後的支線「幫 Winter 帶和牛」也是在這裡把和牛交給她（src/systems/quests/TzuyuWagyu.js）。
import * as THREE from 'three';
import { surfaceAt } from '../../world/Terrain.js';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { DevNPC, M, angDiff, gameScreen, addCurls } from './DevNPC.js';

export const HOWARD_LOOK = {
  skin: '#f2d6c2',
  hair: '#1b1512',
  hairStyle: 'short',
  glasses: true,
  glassesColor: '#c9b48a',
  shirt: '#f0a9bc',
  shorts: '#e9e4da',
  pants: true,
  shoes: '#f4f4f1',
  build: 1.02,
  face: true,
};
const CODE = [
  '// i-Piyan 訊息 App：好友聊天室、已讀、輸入中…（霍華德）',
  'export function openChat(ph, c) {',
  '  ph.title(c.name, c.sub);',
  '  ph.list(c.msgs.map(m => bubble(m.who, m.text, m.time)));',
  '  c.unread = 0; ph.badge();',
  '  ph.input({ onSend: (t) => reply(ph, c, t) });',
  '}',
  '',
  '// 任務：每一步的條件、提示和獎勵',
  "const MISSION = { id: 'flyers', title: '發傳單',",
  "  steps: [{ goal: '到活動中心', at: 'SAC', r: 6 },",
  "          { goal: '發完 20 張', count: 20, votes: 2 }],",
  '};',
  'function npcLook(seed) {',
  "  return { skin: pick(SKINS, seed), hairStyle: 'curly', face: true };",
  '}',
];
const LOL = gameScreen(
  '#0a1a2f',
  '#0d3b4f',
  '召喚峽谷',
  '積分對戰 ・ 中路 ・ 10 / 2 / 8',
  '#c8aa6e'
);
const VAL = gameScreen('#0f1923', '#3b0d14', 'RANKED', '特戰英豪 ・ 13 : 11 ◆', '#ff4655');

// gym spot: in front of the 體育館's main entrance (the orange portico on the west face, src/world/zones/ZoneG.js GYM.portA..portB),
// past the granite steps, facing out to the west so you see him as you come up (使用者指正：原本在附屬棟南側和游泳池之間的暗巷、面向牆，從正門看不到)
const GYM = { x: -39.3, z: -225.9, h: Math.atan2(-0.996, -0.088) };

// his girlfriend Tzuyu (兔瓦斯, in Korea except on these walks): tall and slim, fair skin, long straight black hair, white top and light jeans
export const TZUYU_LOOK = {
  skin: '#f6dfd0',
  hair: '#0f0d0c',
  hairStyle: 'long',
  shirt: '#f5f2ec',
  shorts: '#a9bdd6',
  pants: true,
  shoes: '#f7f7f4',
  build: 0.95,
  jaw: 0.94,
  chin: 0.45,
  face: true,
};
export function createTzuyu() {
  const ch = createCharacter(TZUYU_LOOK);
  ch.root.scale.set(1, 1.04, 1); // tall
  return ch;
}
const GAP = 0.8; // between the two of them, hand in hand

// his figure: a short cut with a perm on top (also used by tools/npc-dashboard)
export function createHoward() {
  const ch = createCharacter(HOWARD_LOOK);
  ch.hideInUniform = [addCurls(ch, HOWARD_LOOK.hair, { down: 0.05, n: 300, size: 1.05 })]; // under the army helmet (src/entities/npcs/Service.js)
  return ch;
}

export class Howard extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'howard',
      name: '霍華德',
      tag: '🃏 霍華德',
      tagColor: '#ffb3c7',
      look: HOWARD_LOOK,
      create: createHoward,
      room: 279,
      bed: 3,
      desk: (R) => R.desks.find((d) => d.side === -1 && d.u === 0),
      file: 'Chats.js — i-Piyan 訊息',
      lines: CODE,
      games: { lol: LOL, val: VAL, default: LOL },
    });
    this.places = {
      sleep: '在力行宿舍 279 寢睡覺（3 號床）',
      code: '在力行宿舍 279 寢開發遊戲（任務・NPC・App）💻',
      game: '在力行宿舍 279 寢打遊戲 🎮',
      dorm: '在力行宿舍 279 寢練撲克牌魔術 🃏',
      gym: '在體育館正門外重訓 💪',
      walk: '跟女朋友 Tzuyu 在校園散步 💕',
    };
    // his girlfriend, walking on his right holding his right hand
    const gf = (this.gf = createTzuyu()),
      gt = makeLabel('💕 Tzuyu', { height: 0.24, size: 40, color: '#ffc2d4' });
    gt.position.set(0, 1.95, 0);
    gf.root.add(gt);
    gf.root.visible = false;
    game.scene.add(gf.root);
    // talking to her (nearest of the two wins, src/world/Kit.js actionAt): chat / add friend, or hand over Winter's wagyu
    game.interiors.actions.push({
      get x() {
        return gf.root.position.x;
      },
      get z() {
        return gf.root.position.z;
      },
      r: 2.0,
      y: 0,
      anyY: true,
      cond: () => this.mode === 'walk' && this.walkOn && gf.root.visible,
      label: () =>
        game.tzuyuQuest?.ready
          ? '按 <kbd>E</kbd> 把和牛交給 Tzuyu（帶給 Winter）'
          : '按 <kbd>E</kbd> 和 Tzuyu 聊天',
      fn: () => this.talkTzuyu(),
    });
    this.walkOn = false;
    this.wait = 1.5;
    const blk = new THREE.MeshStandardMaterial({
      color: '#1d1f22',
      roughness: 0.5,
      metalness: 0.5,
    });
    // a hand point on each forearm (the cards fly between them) and a dumbbell in each hand
    this.hands = this.ch.arms.map((a) => {
      const o = new THREE.Object3D();
      o.position.set(0, -0.27, 0.04);
      a.el.add(o);
      return o;
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
    // the deck (left hand) and the cards in the air
    const back = new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.6 }),
      face = new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.6 });
    this.deck = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.02, 0.09), back);
    this.deck.position.set(0, -0.28, 0.05);
    this.deck.visible = false;
    this.ch.arms[1].el.add(this.deck);
    this.cards = [0, 1, 2, 3, 4].map((i) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.063, 0.002, 0.088), i % 2 ? face : back);
      c.visible = false;
      game.scene.add(c);
      return c;
    });
    this.gymSpot = { ...GYM, y: surfaceAt(GYM.x, GYM.z) };
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
  }
  plan(m) {
    if (m >= M(2) && m < M(9)) return 'sleep';
    if (m >= M(12) && m < M(14)) return 'dorm';
    if ((m >= M(16) && m < M(18, 30)) || m < M(2)) return 'game';
    if (m >= M(18, 30) && m < M(22, 30)) return 'walk';
    if (m >= M(22, 30)) return 'gym';
    return 'code';
  }
  gameNow() {
    return minuteNow(this.g) < M(2) ? 'val' : 'lol'; // after midnight: 特戰英豪
  }
  doing() {
    return (
      {
        code: '寫程式',
        game: this.gameNow() === 'val' ? '打特戰英豪' : '打 LOL',
        dorm: '練牌技',
        gym: '重訓',
        walk: '跟女朋友散步',
      }[this.mode] || ''
    );
  }
  sleepLines() {
    return [
      ['霍華德', '（呼……呼……）'],
      ['彥霖', '（霍華德在 3 號床的下舖睡著了，手裡還握著一副撲克牌。上舖的漢克也睡了）'],
    ];
  }
  onMode(mode, was) {
    if (was === 'walk') {
      this.walkOn = false;
      this.gf.root.visible = false;
    }
    this.wait = 1.5;
    for (const b of this.bells) b.visible = mode === 'gym';
    this.deck.visible = mode === 'dorm';
    if (mode !== 'dorm') for (const c of this.cards) c.visible = false;
    this.places.game =
      this.gameNow() === 'val' ? '在力行宿舍 279 寢打特戰英豪 🎯' : '在力行宿舍 279 寢打 LOL 🎮';
  }
  // practising card flourishes sitting on the edge of his bunk (bed 1, the lower one), facing the aisle;
  // the cards fly from the left hand to the right
  dormSpot() {
    const { L, R, bedL } = this.home,
      s = Math.sign(R.center[0] - bedL.x) || 1,
      [x, z] = L.W(bedL.x + s * 0.4, bedL.z);
    return (this._edge ||= { x, z, y: L.B + R.y, h: L.k.heading(Math.atan2(s, 0)) });
  }
  dormTick(dt, at) {
    const g = this.g,
      p = g.player.pos,
      talking = g.hud.inDialog && Math.hypot(p.x - at.x, p.z - at.z) < 3;
    this.ch.root.rotation.y = talking ? Math.atan2(p.x - at.x, p.z - at.z) : at.h;
    this.ch.update(dt, { speed: 0, mode: 'sit', pose: talking ? 'talk' : 'cards' });
    this.ch.root.updateMatrixWorld(true);
    const A = this.hands[1].getWorldPosition(this._a),
      B = this.hands[0].getWorldPosition(this._b),
      T = g.time;
    this.cards.forEach((c, i) => {
      const f = (T * 1.6 + i / this.cards.length) % 1;
      c.visible = !talking;
      c.position.lerpVectors(A, B, f);
      c.position.y += Math.sin(f * Math.PI) * 0.16;
      c.rotation.set(Math.sin(f * Math.PI) * 1.2, at.h, f * Math.PI * 2);
    });
  }
  _outdoor(dt, mode) {
    if (mode === 'gym') {
      this.standAt(dt, this.gymSpot, 'curl');
      return;
    }
    if (mode === 'walk') return this._walk(dt);
    this.ch.root.visible = false;
  }
  // talking to Tzuyu on the walk: they both stop and turn to you
  talkTzuyu() {
    const g = this.g,
      p = g.player.worldPos();
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.pause = 4;
    if (g.tzuyuQuest?.give()) return;
    g.friends?.talk('tzuyu', 'walk', () => {
      this.pause = 0.6;
    });
  }
  // ---- after dinner: hand in hand with Tzuyu along a footpath near you (_appear / _pick in DevNPC) ----
  _walk(dt) {
    const g = this.g,
      p = g.player.worldPos(),
      gf = this.gf;
    if (!this.walkOn) {
      this.ch.root.visible = gf.root.visible = false;
      if ((this.wait -= dt) <= 0 && !this._appear()) this.wait = 12;
      return;
    }
    const dPl = Math.hypot(this.pos.x - p.x, this.pos.z - p.z);
    if (dPl > 170 && !g.hud.inDialog) {
      this.walkOn = false;
      this.wait = 15;
      this.ch.root.visible = gf.root.visible = false;
      return;
    }
    let speed = 0;
    if (g.hud.inDialog && dPl < 5) this.pause = Math.max(this.pause, 0.5);
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 5);
      if (this.pause <= 0) this.face = null;
    } else {
      speed = 1.0;
      this.d += speed * dt;
      if (this.d >= this.len) {
        const n = this.to;
        this.to = this._pick(n, this.from);
        this.from = n;
        this.d = 0;
        this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
        if (Math.random() < 0.25) this.pause = 3 + Math.random() * 4; // stops to chat, or to show her a card trick
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
      close = dPl < 35,
      talking = this.pause > 0 && this.face != null,
      chatting = this.pause > 0 && this.face == null; // stopped on the path, turned to each other
    ch.root.visible = true;
    ch.root.position.copy(this.pos);
    ch.root.rotation.y = chatting ? h - Math.PI / 2 : h;
    ch.setDetail?.(close);
    ch.update(dt, { speed, mode: 'foot', pose: talking || chatting ? 'talk' : 'handR' });
    // she walks on his right, holding his right hand with her left
    const rx = -Math.cos(h),
      rz = Math.sin(h),
      sx = this.pos.x + rx * GAP,
      sz = this.pos.z + rz * GAP;
    gf.root.visible = true;
    gf.root.position.set(sx, surfaceAt(sx, sz, this.pos.y + 0.5), sz);
    gf.root.rotation.y = talking ? this.face : chatting ? h + Math.PI / 2 : h;
    gf.setDetail?.(close);
    gf.update(dt, { speed, mode: 'foot', pose: talking || chatting ? null : 'handL' });
  }
}
const minuteNow = (g) => ((g.clock % 1440) + 1440) % 1440;
