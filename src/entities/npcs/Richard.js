// 開發者 理查：彥霖的同班同學，個性友好。程式非常強：大學就拿到幾間知名科技公司的 offer，最後放棄、決定讀碩班，
// 推甄上「中字輩」電機所；大學期間發表過 3 篇 IEEE 頂級期刊。常常教同學寫程式。喜歡玩英雄聯盟 ARAM 大亂鬥，
// 也是嘻哈研究社社員：有時候在宿舍跳舞，或是在資管系館跟羊明衫尬舞。這個遊戲主要負責地圖規劃與建築物建模。
// 外型照使用者給的照片：小麥色皮膚、細框圓眼鏡、燙捲有點長的黑髮、深綠色漁夫帽、左右臉頰各一顆小痣、白 T。
// 住力行宿舍 280 寢 1 號床（右手邊最裡面那張下舖，座位是右手邊最裡面的書桌）。
// 一天（遊戲時鐘）：
//   03:00–10:00 睡覺；10:00–13:00、17:00–21:00、01:00–03:00 在書桌前開發這個遊戲（地圖與建模）；
//   13:00–17:00 羊明衫在系館前練舞的時候去跟她尬舞（battle），她不在就在寢室自己練嘻哈；21:00–01:00 打 ARAM 大亂鬥。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { DevNPC, M, gameScreen, addCurls } from './DevNPC.js';

export const RICHARD_LOOK = {
  skin: '#c99a72', hair: '#17120f', hairStyle: 'short', glasses: true, glassesColor: '#b9a98e',
  shirt: '#f1f0ec', shorts: '#2d3138', pants: true, shoes: '#1c1c1e', build: 1.0, face: true,
};
const CODE = [
  '// 中原大學校園：OSM 建物輪廓 → 擠出量體、屋頂、窗帶（理查）',
  'export function buildCampus(osm, terrain) {',
  '  for (const w of osm.ways.filter(isBuilding)) {',
  '    const pts = w.nodes.map(n => project(n.lat, n.lon));',
  '    const h = w.tags.levels ? w.tags.levels * 3.6 : 12;',
  '    const base = terrain.minUnder(pts);',
  '    addPrism(pts, base, base + h, MAT[w.tags.name] || MAT.tan);',
  '    windowBands(pts, base, h, { every: 3.6 });',
  '  }',
  '}',
  '',
  "// 道路：中北路、新中北路、環中東路（寬度照街景量）",
  "const ROADS = { '中北路': 18, '新中北路': 14, '環中東路': 16 };",
  'function laneMarks(road, w) {',
  '  return dashed(road.center, { gap: 6, len: 4, width: 0.12 });',
  '}',
];
// his loud ARAM screen
const ARAM = gameScreen('#08131f', '#1d3a52', 'ARAM 大亂鬥', '隨機英雄 ・ 嚎哭深淵 ・ 擊殺 14', '#7fd3ff');

// the dark green bucket hat
function buildHat() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#2f4a32', roughness: 0.95, side: THREE.DoubleSide });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.148, 0.11, 22), m); crown.position.y = 0.05; g.add(crown);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.215, 0.05, 26, 1, true), m); brim.position.y = -0.012; g.add(brim);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.149, 0.149, 0.018, 22, 1, true), new THREE.MeshStandardMaterial({ color: '#223624', roughness: 0.9, side: THREE.DoubleSide })); band.position.y = 0.005; g.add(band);
  return g;
}

// his figure: the look plus the permed hair, the hat and the two little moles on his cheeks (also used by tools/npc-dashboard)
export function createRichard() {
  const ch = createCharacter(RICHARD_LOOK);
  addCurls(ch, RICHARD_LOOK.hair, { down: -0.55, n: 340, size: 1.1 }); // permed, a little long: over the ears to the nape
  const hat = buildHat(); hat.position.set(0, 0.215, -0.008); hat.rotation.x = -0.1; ch.head.add(hat);
  const mole = new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 0.8 });
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), mole); d.position.set(0.062 * s, 0.035, 0.1); ch.head.add(d); }
  return ch;
}

export class Richard extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'richard', name: '理查', tag: '🕺 理查', tagColor: '#9fe3a3', look: RICHARD_LOOK, create: createRichard, room: 280, bed: 1,
      desk: (R) => R.desks.find(d => d.side === -1 && d.u === 0),
      file: 'MapBuilder.js — 校園建模', lines: CODE, games: { aram: ARAM, default: ARAM },
    });
    this.places = {
      sleep: '在力行宿舍 280 寢睡覺（1 號床）', code: '在力行宿舍 280 寢開發遊戲（地圖・建模）💻', game: '在力行宿舍 280 寢打 ARAM 大亂鬥 🎮',
      dorm: '在力行宿舍 280 寢練嘻哈舞 🕺', battle: '在資管系館前跟羊明衫尬舞 🕺💃',
    };
  }
  plan(m) {
    if (m >= M(3) && m < M(10)) return 'sleep';
    if (m >= M(13) && m < M(17)) return this.g.mingshan?.mode === 'dance' ? 'battle' : 'dorm';
    if (m >= M(21) || m < M(1)) return 'game';
    return 'code';
  }
  doing() { return { code: '寫程式', game: '打 ARAM', dorm: '跳舞', battle: '尬舞' }[this.mode] || ''; }
  sleepLines() { return [['理查', '（呼……呼……）'], ['彥霖', '（理查在 1 號床的下舖睡著了，漁夫帽蓋在臉上）']]; }
  // dancing in the aisle of 280, facing the window
  dormSpot() { const c = this.home.center; return { x: c.x, z: c.z, y: c.y, h: this.home.k.heading(0) }; }
  dormTick(dt, at) {
    const g = this.g, p = g.player.pos, talking = g.hud.inDialog && Math.hypot(p.x - at.x, p.z - at.z) < 4;
    this.ch.root.rotation.y = talking ? Math.atan2(p.x - at.x, p.z - at.z) : at.h;
    this.ch.update(dt, { speed: 0, mode: 'foot', pose: talking ? 'talk' : 'hiphop' });
  }
  // next to 羊明衫 in front of the 資管系館, turned half towards her
  _outdoor(dt, mode) {
    const S = this.g.mingshan?.spot;
    if (mode !== 'battle' || !S) { this.ch.root.visible = false; return; }
    const h = this.g.mingshan.heading ?? 0, rx = Math.cos(h), rz = -Math.sin(h);
    this.standAt(dt, { x: S.x + rx * 2.2, z: S.z + rz * 2.2, h: h + 0.6 }, 'hiphop');
  }
}
