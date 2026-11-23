// 開發者 霍華德：彥霖的同班同學，個性友好。打 LOL（什麼模式都打）、打特戰英豪；魔術社社員，擅長變玫瑰花和撲克牌魔術。
// 常常教同學會計學。晚餐後去健身房重訓（在體育館外看得到他）。這個遊戲主要負責任務開發、NPC 角色設計，
// 和各種小應用（手機 App、電腦 App 幾乎都是他優化的）。
// 外型照使用者給的照片：皮膚偏白、細框圓眼鏡、燙捲的短髮、粉色上衣。
// 住力行宿舍 279 寢 1 號床（右手邊最裡面那張下舖，上舖 2 號是漢克；座位是右手邊最裡面的書桌）。
// 一天（遊戲時鐘）：
//   02:00–09:00 睡覺；09:00–12:00、14:00–16:00、00:00–02:00 在書桌前開發這個遊戲（任務、NPC、手機 App）；
//   12:00–14:00、21:00–22:00 在寢室練撲克牌魔術手法（牌在兩手之間飛）；16:00–19:00 打 LOL、22:00–00:00 打特戰英豪；
//   19:00–21:00 晚餐後在體育館外重訓（啞鈴彎舉）。
import * as THREE from 'three';
import { surfaceAt } from '../../world/Terrain.js';
import { createCharacter } from '../Character.js';
import { DevNPC, M, gameScreen, addCurls } from './DevNPC.js';

export const HOWARD_LOOK = {
  skin: '#f2d6c2', hair: '#1b1512', hairStyle: 'short', glasses: true, glassesColor: '#c9b48a',
  shirt: '#f0a9bc', shorts: '#e9e4da', pants: true, shoes: '#f4f4f1', build: 1.02, face: true,
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
const LOL = gameScreen('#0a1a2f', '#0d3b4f', '召喚峽谷', '積分對戰 ・ 中路 ・ 10 / 2 / 8', '#c8aa6e');
const VAL = gameScreen('#0f1923', '#3b0d14', 'RANKED', '特戰英豪 ・ 13 : 11 ◆', '#ff4655');

// gym spot: outside the gym's south entrance, a few metres east of 吱吱
const GYM = { x: -36.2, z: -183.6, h: Math.PI };

// his figure: a short cut with a perm on top (also used by tools/npc-dashboard)
export function createHoward() {
  const ch = createCharacter(HOWARD_LOOK);
  ch.hideInUniform = [addCurls(ch, HOWARD_LOOK.hair, { down: 0.05, n: 300, size: 1.05 })]; // under the army helmet (src/entities/npcs/Service.js)
  return ch;
}

export class Howard extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'howard', name: '霍華德', tag: '🃏 霍華德', tagColor: '#ffb3c7', look: HOWARD_LOOK, create: createHoward, room: 279, bed: 1,
      desk: (R) => R.desks.find(d => d.side === -1 && d.u === 0),
      file: 'Chats.js — i-Piyan 訊息', lines: CODE, games: { lol: LOL, val: VAL, default: LOL },
    });
    this.places = {
      sleep: '在力行宿舍 279 寢睡覺（1 號床）', code: '在力行宿舍 279 寢開發遊戲（任務・NPC・App）💻',
      game: '在力行宿舍 279 寢打遊戲 🎮', dorm: '在力行宿舍 279 寢練撲克牌魔術 🃏', gym: '在體育館外重訓 💪',
    };
    const blk = new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.5, metalness: 0.5 });
    // a hand point on each forearm (the cards fly between them) and a dumbbell in each hand
    this.hands = this.ch.arms.map(a => { const o = new THREE.Object3D(); o.position.set(0, -0.27, 0.04); a.el.add(o); return o; });
    this.bells = this.ch.arms.map(a => {
      const d = new THREE.Group(); d.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8).rotateZ(Math.PI / 2), blk));
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14).rotateZ(Math.PI / 2), blk); p.position.x = 0.07 * s; d.add(p); }
      d.position.set(0, -0.28, 0.03); d.visible = false; a.el.add(d); return d;
    });
    // the deck (left hand) and the cards in the air
    const back = new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.6 }), face = new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.6 });
    this.deck = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.02, 0.09), back); this.deck.position.set(0, -0.28, 0.05); this.deck.visible = false; this.ch.arms[1].el.add(this.deck);
    this.cards = [0, 1, 2, 3, 4].map(i => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.063, 0.002, 0.088), i % 2 ? face : back); c.visible = false; game.scene.add(c); return c; });
    this.gymSpot = { ...GYM, y: surfaceAt(GYM.x, GYM.z) };
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
  }
  plan(m) {
    if (m >= M(2) && m < M(9)) return 'sleep';
    if ((m >= M(12) && m < M(14)) || (m >= M(21) && m < M(22))) return 'dorm';
    if ((m >= M(16) && m < M(19)) || m >= M(22)) return 'game';
    if (m >= M(19) && m < M(21)) return 'gym';
    return 'code';
  }
  gameNow() { return minuteNow(this.g) >= M(22) ? 'val' : 'lol'; }
  doing() { return { code: '寫程式', game: this.gameNow() === 'val' ? '打特戰英豪' : '打 LOL', dorm: '練牌技', gym: '重訓' }[this.mode] || ''; }
  sleepLines() { return [['霍華德', '（呼……呼……）'], ['彥霖', '（霍華德在 1 號床的下舖睡著了，手裡還握著一副撲克牌。上舖的漢克也睡了）']]; }
  onMode(mode) {
    for (const b of this.bells) b.visible = mode === 'gym';
    this.deck.visible = mode === 'dorm';
    if (mode !== 'dorm') for (const c of this.cards) c.visible = false;
    this.places.game = this.gameNow() === 'val' ? '在力行宿舍 279 寢打特戰英豪 🎯' : '在力行宿舍 279 寢打 LOL 🎮';
  }
  // practising card flourishes sitting on the edge of his bunk (bed 1, the lower one), facing the aisle;
  // the cards fly from the left hand to the right
  dormSpot() {
    const { L, R, bedL } = this.home, s = Math.sign(R.center[0] - bedL.x) || 1, [x, z] = L.W(bedL.x + s * 0.4, bedL.z);
    return (this._edge ||= { x, z, y: L.B + R.y, h: L.k.heading(Math.atan2(s, 0)) });
  }
  dormTick(dt, at) {
    const g = this.g, p = g.player.pos, talking = g.hud.inDialog && Math.hypot(p.x - at.x, p.z - at.z) < 3;
    this.ch.root.rotation.y = talking ? Math.atan2(p.x - at.x, p.z - at.z) : at.h;
    this.ch.update(dt, { speed: 0, mode: 'sit', pose: talking ? 'talk' : 'cards' });
    this.ch.root.updateMatrixWorld(true);
    const A = this.hands[1].getWorldPosition(this._a), B = this.hands[0].getWorldPosition(this._b), T = g.time;
    this.cards.forEach((c, i) => {
      const f = ((T * 1.6 + i / this.cards.length) % 1);
      c.visible = !talking;
      c.position.lerpVectors(A, B, f); c.position.y += Math.sin(f * Math.PI) * 0.16;
      c.rotation.set(Math.sin(f * Math.PI) * 1.2, at.h, f * Math.PI * 2);
    });
  }
  _outdoor(dt, mode) {
    if (mode === 'gym') { this.standAt(dt, this.gymSpot, 'curl'); return; }
    this.ch.root.visible = false;
  }
}
const minuteNow = (g) => ((g.clock % 1440) + 1440) % 1440;
