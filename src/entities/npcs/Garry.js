// 黃蓋瑞：古箏社幹部，住彥霖隔壁（src/world/buildings/GarryHome.js）。很常去體育園區的跑道跑步，偶爾在學生活動中心 3 樓的古箏社教室（src/world/buildings/ClubRoom.js）。
// 外型照使用者給的照片：高瘦、黑色短髮有瀏海，白底熱帶葉印花短袖襯衫（橘、藍綠、深藍的葉子，扣好正常穿），
// 膝上黑色緊身運動短褲；跑步時換素色深灰運動 T。同一時間只會出現在一個地方（跟勞大、吱吱一樣）：
//   SCHEDULE 依日期輪：早上／傍晚跑步（有幾天沒跑）、中午或晚上在古箏社教室（每小時前 15 分鐘整理琴盒，之後坐在老師位練琴，有撥弦聲）、
//   其他時間在房間（書桌前，深夜睡覺）。跑步的時候跑道上還有幾個一起慢跑的同學。
// 起床鬧鐘彩蛋：他桌上的手機按 E（或早上 07:00 你人在他房間）會響起鬧鐘（assets/sfx/garry/alarm.m4a，只有聲音）；
// 檔案載入失敗時改成一般的鬧鈴聲。
import { playPose } from './GuzhengPose.js';
import * as THREE from 'three';
import { createCharacter, randomStudent } from '../Character.js';
import { torsoProfile } from '../BodyMesh.js';
import { shellGeometry, section, onCloth, pe, HIPS, Y0, Y1, TW, TH } from '../../ui/Jersey.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { pointInPoly } from '../../physics/Collision.js';

const BUILD = 0.92;
export const GARRY_LOOK = {
  skin: '#ecc8a6', shirt: '#efe9dc', shorts: '#141416', pants: false, hem: -0.36, hair: '#131313', hairStyle: 'bowl',
  glasses: false, shoes: '#f2f2f0', sock: '#f4f4f4', face: true, build: BUILD,
};
const RUN_TEE = '#353b46';
export const ALARM_SRC = 'assets/sfx/garry/alarm.m4a';

// ---------------------------------------------------------------- the aloha shirt
// 照照片的花色：白底上大片的熱帶葉（橘、杏、赭橘為主，配藍綠、深藍、灰藍），扣好扣子正常穿：小領口、印花短袖（套在上臂外的寬袖），
// 下襬自然蓋到腰。身體本身的上衣顏色換成膚色（領口和袖子下面露出來的手臂）。
// 印花外殼的做法跟 src/ui/Jersey.js 一樣：一層包在軀幹外的殼 + 一張程序貼圖，不是布料的地方用 alphaTest 挖空。
let shirtTex = null;
const INK = { ground: '#f6f2ea', orange: '#e9803b', peach: '#f3a862', rust: '#c9622a', teal: '#2c9aa8', navy: '#1f3a5f', slate: '#8fb3c6' };
function paintPrint(g, w, h, seed, scale = 1) {
  g.fillStyle = INK.ground; g.fillRect(0, 0, w, h);
  let s = seed; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const pick = () => { const v = r(); return v < 0.22 ? INK.orange : v < 0.38 ? INK.peach : v < 0.5 ? INK.rust : v < 0.68 ? INK.teal : v < 0.84 ? INK.navy : INK.slate; };
  const monstera = (x, y, R, a, col) => { // a big split leaf: heart-shaped blade, slits cut to the midrib, a few holes
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col;
    g.beginPath(); g.moveTo(0, -R * 0.15); g.bezierCurveTo(R * 0.9, -R * 0.9, R * 1.15, R * 0.5, 0, R); g.bezierCurveTo(-R * 1.15, R * 0.5, -R * 0.9, -R * 0.9, 0, -R * 0.15); g.fill();
    g.strokeStyle = INK.ground; g.lineCap = 'round';
    for (let k = -3; k <= 3; k++) { if (!k) continue; const t = k / 3.6; g.lineWidth = R * 0.07; g.beginPath(); g.moveTo(Math.sign(k) * R * 0.25, R * (0.2 + Math.abs(t) * 0.35) + t * R * 0.2); g.lineTo(Math.sign(k) * R * 1.2, R * (0.05 + t * 0.9)); g.stroke(); }
    g.fillStyle = INK.ground; for (const [hx, hy] of [[0.32, 0.25], [-0.36, 0.42], [0.3, 0.62]]) { g.beginPath(); g.ellipse(hx * R, hy * R, R * 0.06, R * 0.1, a, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = R * 0.03; g.beginPath(); g.moveTo(0, -R * 0.1); g.quadraticCurveTo(R * 0.05, R * 0.4, 0, R * 0.95); g.stroke();
    g.restore();
  };
  const palm = (x, y, L, a, col) => { // palm frond: arching stem with long thin leaflets
    g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
    g.lineWidth = L * 0.025; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.15, L * 0.5, 0, L); g.stroke();
    for (let k = 0.06; k < 0.96; k += 0.055) {
      const y0 = L * k, l = L * 0.42 * Math.sin(Math.PI * Math.min(1, k * 1.1));
      for (const sd of [1, -1]) { g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(sd * l * 0.5, y0 + l * 0.1, sd * l, y0 + l * 0.55); g.quadraticCurveTo(sd * l * 0.5, y0 + l * 0.25, 0, y0 + L * 0.03); g.fill(); }
    }
    g.restore();
  };
  for (let i = 0; i < 9 * scale; i++) palm(r() * w, r() * h - h * 0.15, (170 + r() * 120) / scale ** 0.3, r() * 6.28, r() < 0.5 ? INK.teal : INK.navy);
  for (let i = 0; i < 16 * scale; i++) monstera(r() * w, r() * h, (70 + r() * 55) / scale ** 0.3, r() * 6.28, pick());
  for (let i = 0; i < 10 * scale; i++) palm(r() * w, r() * h - h * 0.15, (120 + r() * 90) / scale ** 0.3, r() * 6.28, pick());
  for (let i = 0; i < 8 * scale; i++) monstera(r() * w, r() * h, (45 + r() * 35) / scale ** 0.3, r() * 6.28, pick());
}
function alohaTexture(prof) {
  if (shirtTex) return shirtTex;
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const g = cv.getContext('2d');
  paintPrint(g, TW, TH, 77, 1.3);
  // buttons down the front centre (u = 0.5; the seam is at the back)
  for (let y = 120; y < TH; y += 90) { g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(TW / 2 + 9, y, 6, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(TW / 2, 0); g.lineTo(TW / 2, TH); g.stroke(); // the two front edges meet here
  // cut: armholes and the neckline (as the jersey); the hem hangs straight over the shorts
  const img = g.getImageData(0, 0, TW, TH), px = img.data;
  for (let row = 0; row < TH; row++) {
    const y = Y0 + (1 - (row + 0.5) / TH) * (Y1 - Y0), sc = section(prof, y, BUILD);
    for (let c = 0; c < TW; c++) {
      const a = Math.PI + Math.PI * 2 * (c + 0.5) / TW, x = sc.rx * pe(Math.sin(a)), ca = Math.cos(a), front = ca > 0;
      if (!onCloth(x, y, front)) px[(row * TW + c) * 4 + 3] = 0;
    }
  }
  g.putImageData(img, 0, 0);
  shirtTex = new THREE.CanvasTexture(cv); shirtTex.colorSpace = THREE.SRGBColorSpace; shirtTex.anisotropy = 4;
  return shirtTex;
}
let sleeveTex = null;
function sleeveTexture() {
  if (sleeveTex) return sleeveTex;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; paintPrint(cv.getContext('2d'), 512, 256, 31, 0.45);
  sleeveTex = new THREE.CanvasTexture(cv); sleeveTex.colorSpace = THREE.SRGBColorSpace; sleeveTex.wrapS = THREE.RepeatWrapping; return sleeveTex;
}
function dressAloha(ch, skin) {
  if (!ch.bodyMesh) return null;
  const prof = torsoProfile(0), mat = new THREE.MeshStandardMaterial({ map: alohaTexture(prof), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  const parts = [];
  const shell = new THREE.Mesh(shellGeometry(prof, BUILD), mat); shell.castShadow = true;
  const g = new THREE.Group(); g.add(shell); ch.torso.add(g); parts.push(g);
  // a soft shirt collar round the neck
  const col = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 6, 28, Math.PI * 1.5), new THREE.MeshStandardMaterial({ map: sleeveTexture(), roughness: 0.85 }));
  const scN = section(prof, 1.535, BUILD); col.position.set(0, 1.535 - HIPS, scN.cz); col.rotation.set(Math.PI / 2 - 0.25, 0, Math.PI * 0.75); col.scale.set(1.15, 1, 1); g.add(col);
  // printed short sleeves: a loose, slightly flared tube over each upper arm (shoulder-pivot frame, arm hangs along -y)
  for (const a of ch.arms) {
    const pts = [[0.03, 0.06], [0.06, 0.035], [0.074, -0.01], [0.077, -0.08], [0.08, -0.15], [0.084, -0.2]].map(([r, y]) => new THREE.Vector2(r * BUILD, y));
    const sl = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ map: sleeveTexture(), side: THREE.DoubleSide, roughness: 0.85 }));
    sl.castShadow = true; a.sh.add(sl); parts.push(sl);
  }
  ch.bodyMesh.userData.recolor({ shirt: skin }); // what shows at the neckline and below the sleeves is skin
  return parts;
}
export function createGarry() {
  const ch = createCharacter(GARRY_LOOK);
  ch.root.scale.set(1.0, 1.07, 1.0); // tall and slim
  ch.root.rotation.order = 'YXZ'; // turn first, then lie down (with XYZ the body would always fall toward the same world direction)
  ch.aloha = dressAloha(ch, GARRY_LOOK.skin);
  ch.setOutfit = (run) => {
    for (const p of ch.aloha || []) p.visible = !run;
    ch.bodyMesh?.userData.recolor({ shirt: run ? RUN_TEE : GARRY_LOOK.skin });
  };
  return ch;
}

// ---------------------------------------------------------------- schedule
const M = (h, m = 0) => h * 60 + m;
// what 蓋瑞 does at a given game minute: 'run' | 'club' | 'desk' | 'sleep'
export function garryPlan(clock) {
  const day = Math.floor(clock / 1440), m = clock - day * 1440, d = ((day % 6) + 6) % 6;
  const runAM = d !== 2 && d !== 5, runPM = d !== 0 && d !== 3, clubNoon = d % 2 === 0, clubEve = d % 2 === 1;
  if (m >= M(6) && m < M(7, 30)) return runAM ? 'run' : m < M(6, 50) ? 'sleep' : 'desk';
  if (m >= M(12) && m < M(13, 30) && clubNoon) return 'club';
  if (m >= M(17, 30) && m < M(19)) return runPM ? 'run' : 'desk';
  if (m >= M(19) && m < M(21, 30) && clubEve) return 'club';
  if (m >= M(23, 30) || m < M(6)) return 'sleep';
  return 'desk';
}
const PLACE = { run: '體育園區跑道', club: '活動中心 3 樓的古箏社教室', desk: '房間', sleep: '房間' };

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export class Garry {
  constructor(game) {
    this.g = game; const home = this.home = game.interiors.garry;
    this.ch = createGarry(); game.scene.add(this.ch.root);
    const tag = makeLabel('黃蓋瑞', { height: 0.26, color: '#ffd23f' }); tag.position.set(0, 2.02, 0); this.ch.root.add(tag);
    this.mark = makeLabel('!', { height: 0.45, color: '#111', bg: '#ffd23f' }); this.mark.position.set(0, 2.6, 0); this.ch.root.add(this.mark);
    this.pos = new THREE.Vector3(); this.heading = 0; this.mode = null; this.pause = 0; this.face = null;
    this._trackPath(); this._clubSpot(); this._joggers();
    const pos = this.pos;
    game.interiors.actions.push({
      get x() { return pos.x; }, get z() { return pos.z; }, r: 2.2, y: 0, anyY: true, cond: () => !!this.mode && this.ch.root.visible && Math.abs(game.player.pos.y - pos.y) < 2.2,
      label: () => this.mode === 'sleep' ? '按 <kbd>E</kbd> 看看黃蓋瑞（他在睡覺）' : '按 <kbd>E</kbd> 和黃蓋瑞聊天',
      fn: () => this.talk(),
    });
    // the alarm on his desk
    game.interiors.actions.push({ x: home.phone.x, z: home.phone.z, y: home.phone.y, r: 0.75, label: () => '按 <kbd>E</kbd> 看蓋瑞桌上的手機（起床鬧鐘）', fn: () => this.alarm() });
    game.interiors.actions.push({ x: home.albums.x, z: home.albums.z, y: home.albums.y, r: 0.7, label: () => '按 <kbd>E</kbd> 看桌上的專輯和手燈', fn: (g) => { g.hud.toast('💿 一整排 K-pop 專輯，旁邊立著兩支手燈——原來蓋瑞也是演唱會派的', 'good', 3200); g.audio.blip?.(); } });
    game.interiors.actions.push({ x: home.tv.x, z: home.tv.z, y: home.tv.y, r: 0.8, label: () => '按 <kbd>E</kbd> 看電視', fn: (g) => { g.hud.toast('📺 電視停在 K-pop 舞台精選，音量開到 3', 'good', 2600); g.audio.blip?.(); } });
    this.alarmDay = -1;
    game.interiors.updaters.push((dt) => this.update(dt));
  }
  // ---- places ----
  _trackPath() { // a lane round the pitch inside 體育園區 (OSM pitch polygon, pushed out ~3 m)
    const data = this.g.data, pitch = (data.areas || []).find(a => a.kind === 'pitch' && a.pts.some(([x, z]) => Math.hypot(x - 108, z + 367) < 120));
    const pts = pitch ? pitch.pts : [[69, -440], [146, -432], [165, -306], [96, -284], [46, -424]];
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    // resample to even spacing and smooth
    let ring = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 3)); for (let j = 0; j < n; j++) ring.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
    for (let it = 0; it < 6; it++) ring = ring.map((p, i) => { const a = ring[(i + ring.length - 1) % ring.length], b = ring[(i + 1) % ring.length]; return [(a[0] + p[0] * 2 + b[0]) / 4, (a[1] + p[1] * 2 + b[1]) / 4]; });
    this.lane = (off) => ring.map(([x, z]) => { const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz) || 1; return [x + dx / d * off, z + dz / d * off]; });
    this.track = this.lane(3.2); this.trackLen = 0; this.track.forEach((p, i) => { const q = this.track[(i + 1) % this.track.length]; this.trackLen += Math.hypot(q[0] - p[0], q[1] - p[1]); });
    this.tk = Math.random();
  }
  _along(path, k) { // point + heading at fraction k of a closed path
    let L = 0; const seg = path.map((p, i) => { const q = path[(i + 1) % path.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); L += l; return l; });
    let d = ((k % 1) + 1) % 1 * L;
    for (let i = 0; i < path.length; i++) { if (d <= seg[i]) { const p = path[i], q = path[(i + 1) % path.length], t = d / seg[i]; return { x: p[0] + (q[0] - p[0]) * t, z: p[1] + (q[1] - p[1]) * t, h: Math.atan2(q[0] - p[0], q[1] - p[1]) }; } d -= seg[i]; }
    return { x: path[0][0], z: path[0][1], h: 0 };
  }
  _clubSpot() { // 古箏社教室 in 活動中心 (src/world/buildings/ClubRoom.js): playing the teacher's guzheng, or tidying the cases
    const c = this.g.interiors.club;
    this.clubPlay = { ...c.play, play: true };
    this.clubTidy = { ...c.tidy };
  }
  _joggers() { // a few students running laps when 蓋瑞 runs (mornings / evenings)
    let s = 9; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    this.runners = [0.15, 0.4, 0.62, 0.85].map((k, i) => {
      const look = randomStudent(rnd); look.pants = false; look.shirt = ['#e8323c', '#2f62c9', '#f2f2f2', '#3fae49'][i]; look.shorts = '#1d1d22';
      const ch = createCharacter(look); ch.root.visible = false; this.g.scene.add(ch.root);
      return { ch, k, lane: this.lane(1.6 + i * 1.1), speed: 2.6 + rnd() * 0.9 };
    });
  }
  // ---- per frame ----
  update(dt) {
    const g = this.g, plan = garryPlan(g.clock), wp = g.player.worldPos();
    if (plan !== this.mode) this._enter(plan);
    const ch = this.ch, r = ch.root, near = (x, z, d) => (x - wp.x) ** 2 + (z - wp.z) ** 2 < d * d;
    this.mark.visible = !g.friends?.added.has('garry'); if (this.mark.visible) this.mark.position.y = 2.6 + Math.sin(g.time * 3) * 0.08;
    let speed = 0, mode = 'foot', playing = false;
    if (this.talking) this.pause = Math.max(this.pause, 0.4);
    if (this.mode === 'run') {
      if (this.pause > 0) { this.pause -= dt; if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6); }
      else {
        speed = 3.1; this.tk = (this.tk + speed * dt / this.trackLen) % 1;
        const q = this._along(this.track, this.tk); this.pos.set(q.x, 0, q.z); this.heading += angDiff(q.h, this.heading) * Math.min(1, dt * 8);
      }
      this.pos.y = surfaceAt(this.pos.x, this.pos.z);
    } else if (this.mode === 'club') {
      const sp = this.clubSpotNow = (g.clock % 60) < 15 ? this.clubTidy : this.clubPlay; this.pos.set(sp.x, this.g.interiors.club.F3 + (sp.play ? 0.14 : 0), sp.z);
      if (this.pause > 0) { this.pause -= dt; if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6); }
      else this.heading += angDiff(sp.h, this.heading) * Math.min(1, dt * 4);
      if (sp.play) { mode = 'sit'; this.heading = sp.h; } // stays on the stool behind the guzheng, also while you talk
      playing = !!sp.play; // (the sound: src/entities/npcs/ClubMembers.js)
    } else if (this.mode === 'desk') {
      const s = this.home.seat; this.pos.set(s.x, this.home.base + this.home.F, s.z);
      if (this.pause > 0) { this.pause -= dt; if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 6); }
      else this.heading += angDiff(s.h, this.heading) * Math.min(1, dt * 4);
      mode = 'sit'; this.home.chairTo(this.heading); // talking to you he swivels round on the office chair
    } else if (this.mode === 'sleep') {
      const b = this.home.bed; this.pos.set(b.x, this.home.base + this.home.F + 0.72, b.z); this.heading = b.h; mode = 'down';
    }
    this.playing = playing && this.pause <= 0;
    r.position.copy(this.pos); r.rotation.y = this.heading;
    const vis = near(this.pos.x, this.pos.z, 160); r.visible = vis;
    if (vis) { ch.setDetail?.(near(this.pos.x, this.pos.z, 35)); ch.update(dt, { speed, mode }); if (playing) playPose(ch, g.time, this.playing); }
    // joggers
    const on = this.mode === 'run' || (g.clock % 1440 >= M(6) && g.clock % 1440 < M(7, 30)) || (g.clock % 1440 >= M(17, 30) && g.clock % 1440 < M(19));
    for (const j of this.runners) {
      const show = on && near(j.lane[0][0], j.lane[0][1], 260); j.ch.root.visible = show; if (!show) continue;
      j.k = (j.k + j.speed * dt / this.trackLen) % 1;
      const q = this._along(j.lane, j.k); j.ch.root.position.set(q.x, surfaceAt(q.x, q.z), q.z); j.ch.root.rotation.y = q.h;
      j.ch.setDetail?.(near(q.x, q.z, 35)); j.ch.update(dt, { speed: j.speed, mode: 'foot' });
    }
    // nobody walks through him
    if (vis && !g.player.vehicle && !g.player.seat && Math.abs(g.player.pos.y - this.pos.y) < 1.5) {
      const p = g.player.pos, dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.6 && d > 1e-4) { p.x = this.pos.x + dx / d * 0.6; p.z = this.pos.z + dz / d * 0.6; }
    }
    // 07:00 alarm when you are in his room
    const day = Math.floor(g.clock / 1440), m = g.clock - day * 1440;
    if (m >= M(7) && m < M(7, 2) && this.alarmDay !== day && pointInPoly(wp.x, wp.z, this.home.room) && g.player.y > this.home.F - 1) { this.alarmDay = day; this.alarm(true); }
  }
  _enter(plan) {
    const prev = this.mode; this.mode = plan; this.pause = 0; this.face = null; this.talking = false;
    this.ch.setOutfit(plan === 'run');
    
    if (plan === 'run' && prev !== 'run') this.tk = Math.random();
    this.home.tuckIn(plan === 'sleep'); this.home.chairTo(this.home.seat.h);
    if (plan === 'desk') this.heading = this.home.seat.h;
  }
  // ---- talking ----
  talk() {
    const g = this.g, p = g.player.worldPos();
    if (this.mode === 'sleep') { g.dialog([['黃蓋瑞', '（呼……呼……）'], ['彥霖', '（睡得好熟，明天早上的鬧鐘應該叫得醒他吧）']]); return; }
    this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.pause = 2.5; this.talking = true;
    const at = { run: 'run', club: 'club' }[this.mode] || 'room';
    g.friends.talk('garry', at, () => { this.talking = false; this.pause = 1; });
  }
  // where he is right now, for 「你在哪？」 in i-Piyan (nav.track follows navPos)
  where() { return PLACE[this.mode] || '房間'; }
  navPos() { return { x: this.pos.x, z: this.pos.z }; }
  get navArrive() { return '📍 找到黃蓋瑞了！走到他旁邊按 E 聊天'; }
  // ---- the alarm easter egg ----
  alarm(auto = false) {
    const g = this.g; if (this._alarmEl) return;
    g._overlay = true; // the pointer is released for the alarm screen: that must not open the pause (Esc) menu
    document.exitPointerLock?.(); g.audio.duck?.(true);
    const scr = this.home.phoneScr.material; scr.color.set('#ff4fa3');
    const el = this._alarmEl = document.createElement('div'); el.id = 'garryAlarm';
    const close = () => { removeEventListener('keydown', key, true); this._alarmAudio?.pause(); this._alarmAudio = null; el.remove(); this._alarmEl = null; g._overlay = false; scr.color.set('#0d1020'); clearInterval(this._beep); this._beep = null; g.audio.duck?.(false); if (g.state === 'play') g.lockPointer?.(); };
    const key = (e) => { if (['Escape', 'KeyE', 'Enter', 'Space'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); close(); } };
    addEventListener('keydown', key, true);
    const head = `<div class="ga-head"><b>⏰ 07:00</b><span>蓋瑞的起床鬧鐘${auto ? '響了！' : ''}</span></div>`;
    el.innerHTML = `<div class="ga-phone">${head}<div class="ga-ring">⏰<small>鬧鐘</small><b>起床啦！早上要去操場跑步！</b></div><button class="ga-x">關掉鬧鐘（Esc）</button></div>`;
    let n = 0; const beep = () => { const ctx = g.audio.ctx; if (!ctx || !g.audio.sfx) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'square'; o.frequency.value = 1320; gn.gain.setValueAtTime(0.06, t + i * 0.14); gn.gain.setValueAtTime(0, t + i * 0.14 + 0.08); o.connect(gn); gn.connect(g.audio.sfx); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.1); } if (++n > 12) close(); };
    const au = this._alarmAudio = new Audio(ALARM_SRC); au.volume = Math.min(1, g.settings.sfxVol ?? 0.8); // follows the sound-effects volume
    au.addEventListener('ended', close);
    au.addEventListener('error', () => { if (this._alarmEl === el && !this._beep) { beep(); this._beep = setInterval(beep, 900); } }); // file missing: a plain alarm beep
    au.play().catch(() => {});
    el.querySelector('.ga-x').onclick = close;
    document.body.appendChild(el);
  }
}
