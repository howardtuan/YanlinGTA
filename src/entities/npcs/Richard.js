// 開發者 理查：彥霖的同班同學，個性友好。程式非常強：大學就拿到幾間知名科技公司的 offer，最後放棄、決定讀碩班，
// 推甄上「中字輩」電機所；大學期間發表過 3 篇 IEEE 頂級期刊。常常教同學寫程式。喜歡玩英雄聯盟 ARAM 大亂鬥，
// 也是嘻哈研究社社員：有時候在宿舍跳舞，或是在資管系館跟羊明衫尬舞。這個遊戲主要負責地圖規劃與建築物建模。
// 外型照使用者給的照片：小麥色皮膚、細框圓眼鏡、燙捲有點長的黑髮、深綠色漁夫帽、左右臉頰各一顆小痣、白 T。
// 住力行宿舍 280 寢 2 號床（右手邊上舖，座位是右手邊中間的書桌）。
// 一天（遊戲時鐘）：
//   03:00–10:00 睡覺；10:00–13:00、17:00–21:00、01:00–03:00 在書桌前開發這個遊戲（地圖與建模）；
//   13:00–17:00 羊明衫在系館前練舞的時候去跟她尬舞（battle），她不在就在寢室自己練嘻哈；21:00–01:00 打 ARAM 大亂鬥。
// 在 280 寢跳舞的時候第一次跟他說話，解鎖 🏆 隱藏成就「280舞王」（src/systems/Secrets.js 的 dance，真實事件：2020/10/30 室友的限動）。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { DevNPC, M, gameScreen, addCurls } from './DevNPC.js';

export const RICHARD_LOOK = {
  skin: '#c99a72',
  hair: '#17120f',
  hairStyle: 'short',
  glasses: true,
  glassesColor: '#b9a98e',
  shirt: '#f1f0ec',
  shorts: '#2d3138',
  pants: true,
  shoes: '#1c1c1e',
  build: 1.0,
  face: true,
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
  '// 道路：中北路、新中北路、環中東路（寬度照街景量）',
  "const ROADS = { '中北路': 18, '新中北路': 14, '環中東路': 16 };",
  'function laneMarks(road, w) {',
  '  return dashed(road.center, { gap: 6, len: 4, width: 0.12 });',
  '}',
];
// his loud ARAM screen
const ARAM = gameScreen(
  '#08131f',
  '#1d3a52',
  'ARAM 大亂鬥',
  '隨機英雄 ・ 嚎哭深淵 ・ 擊殺 14',
  '#7fd3ff'
);

// the dark green bucket hat
function buildHat() {
  const g = new THREE.Group(),
    m = new THREE.MeshStandardMaterial({
      color: '#2f4a32',
      roughness: 0.95,
      side: THREE.DoubleSide,
    });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.148, 0.11, 22), m);
  crown.position.y = 0.05;
  g.add(crown);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.215, 0.05, 26, 1, true), m);
  brim.position.y = -0.012;
  g.add(brim);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.149, 0.149, 0.018, 22, 1, true),
    new THREE.MeshStandardMaterial({ color: '#223624', roughness: 0.9, side: THREE.DoubleSide })
  );
  band.position.y = 0.005;
  g.add(band);
  return g;
}

// his figure: the look plus the permed hair, the hat and the two little moles on his cheeks (also used by tools/npc-dashboard)
export function createRichard() {
  const ch = createCharacter(RICHARD_LOOK);
  const curls = addCurls(ch, RICHARD_LOOK.hair, { down: -0.55, n: 340, size: 1.1 }); // permed, a little long: over the ears to the nape
  const hat = buildHat();
  hat.position.set(0, 0.215, -0.008);
  hat.rotation.x = -0.1;
  ch.head.add(hat);
  ch.hideInUniform = [hat, curls]; // under the army helmet (src/entities/npcs/Service.js)
  const mole = new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 0.8 });
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), mole);
    d.position.set(0.062 * s, 0.035, 0.1);
    ch.head.add(d);
  }
  return ch;
}

export class Richard extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'richard',
      name: '理查',
      tag: '🕺 理查',
      tagColor: '#9fe3a3',
      look: RICHARD_LOOK,
      create: createRichard,
      room: 280,
      bed: 2,
      desk: (R) => R.desks.find((d) => d.side === -1 && d.u === 1),
      file: 'MapBuilder.js — 校園建模',
      lines: CODE,
      games: { aram: ARAM, default: ARAM },
    });
    this.places = {
      sleep: '在力行宿舍 280 寢睡覺（2 號床）',
      code: '在力行宿舍 280 寢開發遊戲（地圖・建模）💻',
      game: '在力行宿舍 280 寢打 ARAM 大亂鬥 🎮',
      dorm: '在力行宿舍 280 寢練嘻哈舞 🕺',
      battle: '在資管系館前跟羊明衫尬舞 🕺💃',
    };
  }
  plan(m) {
    if (m >= M(3) && m < M(10)) return 'sleep';
    if (m >= M(13) && m < M(17)) return this.g.mingshan?.mode === 'dance' ? 'battle' : 'dorm';
    if (m >= M(21) || m < M(1)) return 'game';
    return 'code';
  }
  doing() {
    return { code: '寫程式', game: '打 ARAM', dorm: '跳舞', battle: '尬舞' }[this.mode] || '';
  }
  // dancing in 280 (mode 'dorm'): the first talk unlocks 🏆 隱藏成就「280舞王」(src/systems/Secrets.js 'dance')
  talk() {
    const g = this.g;
    if (this.mode !== 'dorm' || g.secrets?.got?.dance != null) return super.talk();
    this.state.met = true;
    g.dialog(
      [
        ['理查', '（雙手在胸前交叉、手指張開，一下蹲低一下側身）……🕺'],
        ['彥霖', '理查？你在幹嘛？'],
        ['理查', '喔！彥霖！你什麼時候進來的 😳 ……嘻研社的 routine 啦，練一下。'],
        ['彥霖', '你是不是喝醉了？'],
        ['理查', '沒有啦！！大一的時候室友也這樣問，還錄下來發限動 😂'],
        ['理查', '算了，看都被看到了——（繼續跳）280 舞王就是我！'],
      ],
      () => {
        if (g.secrets?.unlock('dance')) setTimeout(() => g.phone?.revealSecret?.('dance'), 900);
      }
    );
  }
  sleepLines() {
    return [
      ['理查', '（呼……呼……）'],
      ['彥霖', '（理查在 2 號床的上舖睡著了，漁夫帽蓋在臉上）'],
    ];
  }
  // dancing in the aisle of 280, facing the window
  dormSpot() {
    const c = this.home.center;
    return { x: c.x, z: c.z, y: c.y, h: this.home.k.heading(0) };
  }
  dormTick(dt, at) {
    const g = this.g,
      p = g.player.pos,
      talking = g.hud.inDialog && Math.hypot(p.x - at.x, p.z - at.z) < 4;
    this.ch.root.rotation.y = talking ? Math.atan2(p.x - at.x, p.z - at.z) : at.h;
    this.ch.update(dt, { speed: 0, mode: 'foot', pose: talking ? 'talk' : 'hiphop' });
  }
  // next to 羊明衫 in front of the 資管系館, turned half towards her
  _outdoor(dt, mode) {
    const S = this.g.mingshan?.spot;
    if (mode !== 'battle' || !S) {
      this.ch.root.visible = false;
      return;
    }
    const h = this.g.mingshan.heading ?? 0,
      rx = Math.cos(h),
      rz = -Math.sin(h);
    this.standAt(dt, { x: S.x + rx * 2.2, z: S.z + rz * 2.2, h: h + 0.6 }, 'hiphop');
  }
}
