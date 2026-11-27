// 開發者 NPC 的共用底層：侯舌（Houshe.js）、理查（Richard.js）、霍華德（Howard.js）都是彥霖的同班同學，也是這款遊戲的開發者，
// 住在力行宿舍（src/world/buildings/Lixing.js 的 rooms），沒事就坐在自己的書桌前開發這個遊戲。
// 這裡負責他們共同的部分：
//   - 自己的床位（睡覺）和書桌（筆電螢幕上一行一行打出程式碼，或是打遊戲的畫面）；
//   - 一個角色跟著行程在宿舍和校園之間移動（離你太遠就不畫）；
//   - 走近按 E 聊天（src/ui/phone/Friends.js 的 talk(id, 地點)），聊完可以加好友；
//   - where()：手機「定位」和訊息「你在哪？」用的狀態文字。
// 子類別提供：plan(分鐘) → 模式、在宿舍以外的模式要做什麼（_outdoor）、程式碼內容與遊戲畫面。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { serviceWear } from './Service.js';
import { blankTexture, markDynamic, scaledCanvas } from '../../graphics/GpuMemLifecycle.js';

export const M = (h, m = 0) => h * 60 + m;
export const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const minuteOf = (clock) => ((clock % 1440) + 1440) % 1440;
const DORM_MODES = new Set(['sleep', 'code', 'game', 'dorm']); // 'dorm': something else at the desk / in the room (subclass pose)

// ---------------------------------------------------------------- permed hair
// a head of small curls over a 'short' cut (Character.js's 'curly' is long hair down to the shoulders):
// down = how far the curls reach (elevation on the head: 0.2 = the crown and the top of the sides only, -0.5 = over the ears to the nape);
// the face stays clear. One merged mesh, the same scatter every time.
export function addCurls(ch, color, { down = 0.1, n = 260, size = 1 } = {}) {
  const parts = [];
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const th = rnd() * Math.PI * 2,
      el = down + rnd() * (1.5 - down),
      front = Math.cos(th);
    if (front > 0.55 && el < 0.75) continue; // forehead and face clear (a fringe of curls above it)
    if (front > 0.15 && el < 0.3) continue; // cheeks clear
    const r = 0.134 + rnd() * 0.012,
      c = Math.cos(el);
    const x = Math.sin(th) * c * r,
      y = 0.1 + Math.sin(el) * r * 1.1,
      z = Math.cos(th) * c * r - 0.004;
    const sg = new THREE.SphereGeometry((0.018 + rnd() * 0.01) * size, 6, 4);
    sg.translate(x, y, z);
    parts.push(sg.toNonIndexed());
  }
  const geom = mergeGeometries(parts, false);
  geom.computeVertexNormals();
  const m = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
  m.castShadow = true;
  ch.head.add(m);
  return m;
}

// ---------------------------------------------------------------- the laptop screen
const KW =
  /^(const|let|function|return|if|else|for|of|new|import|export|from|class|this|true|false|null|await|async)$/;
const C_KW = '#569cd6',
  C_STR = '#ce9178',
  C_COM = '#6a9955',
  C_NUM = '#b5cea8',
  C_TXT = '#d4d4d4',
  C_FN = '#dcdcaa';
// split a line of JS into coloured pieces (good enough for a screen 30 cm wide)
function tokens(line) {
  const out = [],
    ci = line.indexOf('//');
  const code = ci >= 0 ? line.slice(0, ci) : line;
  const re = /('[^']*'?|`[^`]*`?|"[^"]*"?|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*|\s+|.)/g;
  let m;
  while ((m = re.exec(code))) {
    const s = m[0];
    let c = C_TXT;
    if (/^['"`]/.test(s)) c = C_STR;
    else if (/^\d/.test(s)) c = C_NUM;
    else if (KW.test(s)) c = C_KW;
    else if (/^[A-Za-z_$]/.test(s) && code[re.lastIndex] === '(') c = C_FN;
    out.push([s, c]);
  }
  if (ci >= 0) out.push([line.slice(ci), C_COM]);
  return out;
}
// an editor in a dark theme: file tabs, line numbers, the code typed out a few characters at a time
function drawEditor(x, W, H, file, lines, typed, blink, repo = 'YanlinGTA') {
  x.fillStyle = '#1e1e1e';
  x.fillRect(0, 0, W, H);
  x.font = '13px Consolas,"Microsoft JhengHei",monospace';
  x.fillStyle = '#252526';
  x.fillRect(0, 0, W, 26);
  x.fillStyle = '#1e1e1e';
  x.fillRect(6, 4, x.measureText(file).width + 44, 22);
  x.fillStyle = '#ffffff';
  x.fillText(file, 36, 20);
  x.fillStyle = '#e8c547';
  x.font = '700 13px Consolas,monospace';
  x.fillText('JS', 14, 20);
  const ln = lines.join('\n').slice(0, typed).split('\n').length;
  x.fillStyle = '#007acc';
  x.fillRect(0, H - 18, W, 18);
  x.fillStyle = '#fff';
  x.font = '11px Consolas,monospace';
  x.fillText(`main ↻  ${repo}   Ln ${ln}   UTF-8   JavaScript`, 8, H - 5);
  const LH = 17,
    top = 44,
    rows = Math.floor((H - top - 22) / LH) + 1;
  let left = typed,
    cy = 0,
    cx = 0;
  const shown = [];
  for (const ln of lines) {
    if (left < 0) break;
    shown.push(ln.slice(0, Math.max(0, left)));
    left -= ln.length + 1;
  }
  const first = Math.max(0, shown.length - rows);
  x.font = '13px Consolas,"Microsoft JhengHei",monospace';
  for (let i = first; i < shown.length; i++) {
    const y = top + (i - first) * LH;
    x.fillStyle = '#858585';
    x.textAlign = 'right';
    x.fillText(String(i + 1), 30, y);
    x.textAlign = 'left';
    let px = 42;
    for (const [s, c] of tokens(shown[i])) {
      x.fillStyle = c;
      x.fillText(s, px, y);
      px += x.measureText(s).width;
    }
    cy = y;
    cx = px;
  }
  if (blink) {
    x.fillStyle = '#aeafad';
    x.fillRect(cx + 1, cy - 12, 2, 15);
  }
}

// the glow on the face: ONE point light shared by every laptop, always in the scene, moved to the nearest laptop that is on
// (intensity 0 when none is). Each laptop used to carry its own light inside its group, so walking into 力行 the scene's light
// count went 0 → 1 → 2 → 3 as the groups showed, and three.js recompiled every lit material for each new count (a freeze of
// up to seconds on entering the dorm). A constant count compiles once. Kept on the 力行 build (L.glow), so a rebuilt world starts afresh.
function pickGlow(G) {
  let best = null;
  for (const sp of G.spots) if (sp.on && (!best || sp.d < best.d)) best = sp;
  const l = G.light;
  if (best) {
    l.position.copy(best.pos);
    l.intensity = 0.6;
  } else l.intensity = 0;
}

// laptop on the desk, the screen drawn on a canvas; mode 'code' types the lines out, a game screen is drawn once;
// repo: the project name on the editor's status bar (default YanlinGTA; 瑞哲's homework, src/entities/npcs/Ruizhe.js)
export function buildLaptop(L, R, desk, { file, lines, games = {}, repo }) {
  const { k, B, W } = L,
    s = Math.sign(-Math.sin(desk.face)) || 1; // s: from the desk towards the aisle
  const world = (lx, lz, ly) => {
    const [x, z] = W(lx, lz);
    return { x, z, y: B + ly };
  };
  const grp = new THREE.Group();
  const at = (o, ox, oz, y) => {
    const p = world(desk.x + ox, desk.z + oz, R.y + 0.76 + y);
    o.position.set(p.x, p.y, p.z);
    o.rotation.y = k.heading(desk.face + Math.PI);
    grp.add(o);
  };
  const body = new THREE.MeshStandardMaterial({
    color: '#2a2c31',
    roughness: 0.35,
    metalness: 0.5,
  });
  const OZ = 0.2; // a little to one side, so you see the screen past his shoulder from the aisle
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.25), body);
  at(base, s * 0.05, OZ, 0.01);
  let cv = null,
    x = null,
    tex = null;
  const mat = new THREE.MeshBasicMaterial({ map: blankTexture(), toneMapped: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.212), mat);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.23, 0.012), body);
  const hinge = new THREE.Group();
  at(hinge, -s * 0.075, OZ, 0.02); // the back edge of the keyboard (the wall side)
  lid.position.set(0, 0.115, 0);
  scr.position.set(0, 0.115, 0.007);
  hinge.add(lid, scr);
  hinge.rotation.order = 'YXZ';
  hinge.rotation.x = -0.25; // turn to face the chair first, then tip the lid back (the default XYZ order tips it sideways)
  // a mouse beside it and a can of coffee
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.1), body);
  at(mouse, s * 0.02, OZ - 0.3, 0.015);
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14),
    new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.4, metalness: 0.6 })
  );
  at(can, -s * 0.05, OZ + 0.3, 0.06);
  // the glow on his face (the shared light above; the caller adds it to the scene)
  const spot = { pos: new THREE.Vector3(), on: false, d: Infinity };
  {
    const o = new THREE.Object3D();
    at(o, s * 0.3, OZ, 0.25);
    grp.remove(o);
    spot.pos.copy(o.position);
  } // where the old per-laptop light was
  const G = (L.glow ||= { light: new THREE.PointLight('#9cc7ff', 0, 2.2, 2), spots: [] });
  G.spots.push(spot);
  const all = lines.join('\n').length;
  let mode = null,
    typed = 0,
    hold = 0,
    t = 0,
    drawn = '';
  return {
    group: grp,
    glow: G.light,
    seat: { ...world(desk.chair.x, desk.chair.z, R.y), h: k.heading(desk.face) },
    // mode: 'code' | a key of games | 'off'; dist: how far you are (metres); within 25 m you are close enough to read it
    tick(dt, m, dist) {
      const near = dist < 25;
      grp.visible = near;
      spot.on = near && m !== 'off';
      spot.d = dist;
      pickGlow(G);
      if (!near) return;
      if (!cv) {
        ({ cv, g: x } = scaledCanvas(512, 320));
        if (x) {
          tex = markDynamic(new THREE.CanvasTexture(cv));
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.needsUpdate = true;
        }
        drawn = '';
        t = 0.12;
      }
      if (m !== mode) {
        mode = m;
        drawn = '';
        if (m === 'code') {
          typed = Math.floor(Math.random() * all * 0.6);
          hold = 0;
        }
      }
      if (m === 'off') {
        if (drawn !== 'off' && x) {
          x.fillStyle = '#050607';
          x.fillRect(0, 0, 512, 320);
          tex.needsUpdate = true;
          drawn = 'off';
        }
        return;
      }
      if (m !== 'code') {
        if (drawn !== m && x) {
          (games[m] || games.default)?.(x, 512, 320);
          tex.needsUpdate = true;
          drawn = m;
        }
        return;
      }
      if (!x) return;
      t += dt;
      if (hold > 0) {
        hold -= dt;
        if (hold <= 0) typed = 0;
      } else {
        typed += dt * (14 + Math.random() * 10);
        if (typed >= all) {
          typed = all;
          hold = 4;
        }
      }
      if (t < 0.12) return;
      t = 0;
      drawEditor(
        x,
        512,
        320,
        file,
        lines,
        Math.floor(typed),
        Math.floor(performance.now() / 500) % 2 === 0,
        repo
      );
      tex.needsUpdate = true;
    },
  };
}
// a full-screen game splash: dark gradient, a big title and a line under it
export function gameScreen(c0, c1, title, sub, accent = '#c8aa6e') {
  return (x, W, H) => {
    const gr = x.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
    x.textAlign = 'center';
    x.fillStyle = accent;
    x.font = '900 52px "Microsoft JhengHei",sans-serif';
    x.fillText(title, W / 2, H / 2 - 6);
    x.fillStyle = '#e8f1ff';
    x.font = '700 26px "Microsoft JhengHei",sans-serif';
    x.fillText(sub, W / 2, H / 2 + 40);
    x.textAlign = 'left';
  };
}

// ---------------------------------------------------------------- the person
export class DevNPC {
  // cfg: { id, name, tag, tagColor, look | create() (the figure), room, bed (number), desk(R) → desk, file, lines, games }
  constructor(game, cfg) {
    this.g = game;
    this.cfg = cfg;
    this.id = cfg.id;
    this.state = { met: false };
    this.mode = null;
    this.pause = 0;
    this.face = null;
    this.heading = 0;
    const ch = (this.ch = cfg.create ? cfg.create() : createCharacter(cfg.look));
    const tag = (this.tag = makeLabel(cfg.tag, {
      height: 0.26,
      size: 40,
      color: cfg.tagColor || '#ffffff',
    }));
    tag.position.set(0, 2.1, 0);
    ch.root.add(tag);
    ch.root.visible = false;
    game.scene.add(ch.root);
    // 義務役 (src/entities/npcs/Service.js): weekdays in uniform, the name label with the prefix; props on ch.hideInUniform are put away
    serviceWear(cfg.id, ch, cfg.look, { tag, hide: () => ch.hideInUniform || [] });
    this.pos = new THREE.Vector3();
    this._dorm();
    // talking (wherever he is): the action follows him; asleep, the bed says so (this.action: a subclass may wrap it)
    game.interiors.actions.push(
      (this.action = {
        get x() {
          return game[cfg.id].pos.x;
        },
        get z() {
          return game[cfg.id].pos.z;
        },
        // the crosshair aims at his middle (lying in his bunk: low and wide)
        get aimY() {
          return game[cfg.id].pos.y + (game[cfg.id].mode === 'sleep' ? 0.3 : 0.95);
        },
        get glow() {
          return game[cfg.id].mode === 'sleep' ? 1.5 : 1.7;
        },
        r: 2.2,
        y: 0,
        anyY: true,
        cond: () =>
          ch.root.visible &&
          !!this.mode &&
          this.mode !== 'mahjong' &&
          Math.abs(game.player.pos.y - this.pos.y) < 2.4,
        label: () =>
          this.mode === 'sleep'
            ? `按 <kbd>E</kbd> 看看 ${cfg.bed} 號床上的${cfg.name}（睡著了）`
            : `按 <kbd>E</kbd> 和${this.doing ? this.doing() : ''}的${cfg.name}聊天`,
        fn: () => this.talk(),
      })
    );
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
  }
  get asleep() {
    return this.mode === 'sleep';
  }

  // his bed and the desk (with the laptop) in his room
  _dorm() {
    const L = this.g.interiors.lixing,
      R = L?.rooms?.[this.cfg.room];
    if (!R) {
      console.warn(`[${this.id}] 力行 ${this.cfg.room} 寢找不到`);
      return;
    }
    const bed = R.beds[this.cfg.bed],
      desk = this.cfg.desk(R);
    if (!bed || !desk) {
      console.warn(`[${this.id}] 床位或書桌找不到`);
      return;
    }
    const [bx, bz] = L.W(bed.x, bed.z);
    this.lap = buildLaptop(L, R, desk, this.cfg);
    this.g.scene.add(this.lap.group, this.lap.glow);
    const [cx, cz] = L.W(R.center[0], R.center[1]);
    this.home = {
      bed: { x: bx, z: bz, y: L.B + bed.y + 0.12, h: L.k.heading(0) },
      seat: this.lap.seat,
      center: { x: cx, z: cz, y: L.B + R.y },
      k: L.k,
      L,
      R,
      bedL: bed,
    };
  }
  // where he is at this minute of the day: 'sleep' | 'code' | 'game' | 'dorm' | (subclass outdoor modes)
  plan(_m) {
    return 'code';
  }

  talk() {
    const g = this.g,
      p = g.player.worldPos();
    if (this.mode === 'sleep') {
      g.dialog(this.sleepLines());
      return;
    }
    if (!DORM_MODES.has(this.mode)) {
      this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
      this.pause = 4;
    }
    this.state.met = true;
    g.friends?.talk(this.id, this.mode, () => {
      this.pause = 0.6;
    });
  }
  sleepLines() {
    return [[this.cfg.name, '（呼……呼……）']];
  }

  update(dt) {
    const g = this.g,
      mode = g.mahjong?.has(this.id) ? 'mahjong' : this.plan(minuteOf(g.clock)); // 被揪去 277 打麻將 (src/systems/mahjong/Mahjong.js)
    if (mode !== this.mode) {
      const was = this.mode;
      this.mode = mode;
      this.pause = 0;
      this.face = null;
      this.onMode?.(mode, was);
    }
    const p = g.player.worldPos(), // in a car pos is local to it (src/entities/Player.js)
      H = this.home;
    // the laptop shows code / the game while he is at it (and stays on, asleep: off)
    if (this.lap)
      this.lap.tick(
        dt,
        mode === 'code' ? 'code' : mode === 'game' ? this.gameNow?.() || 'default' : 'off',
        H ? Math.hypot(p.x - H.seat.x, p.z - H.seat.z) : Infinity
      );
    if (mode === 'mahjong') {
      this.tag.visible = true;
      g.mahjong.hold(this.id, this.ch, dt, this.pos);
      return;
    }
    if (DORM_MODES.has(mode)) {
      if (!H) {
        this.ch.root.visible = false;
        return;
      }
      const near = Math.hypot(p.x - H.seat.x, p.z - H.seat.z) < 60;
      this.ch.root.visible = near;
      const at = mode === 'sleep' ? H.bed : mode === 'dorm' ? this.dormSpot?.() || H.seat : H.seat;
      this.pos.set(at.x, at.y, at.z);
      if (!near) return;
      const ch = this.ch;
      ch.root.position.copy(this.pos);
      ch.setDetail?.(Math.hypot(p.x - at.x, p.z - at.z) < 20);
      if (mode === 'sleep') {
        ch.root.rotation.y = at.h;
        ch.update(dt, { speed: 0, mode: 'down' });
        this.tag.visible = false;
        return;
      }
      this.tag.visible = true;
      if (mode === 'dorm') {
        this.dormTick?.(dt, at);
        return;
      }
      // at the desk: turns round to you while you talk to him
      const talking = g.hud.inDialog && Math.hypot(p.x - at.x, p.z - at.z) < 3;
      ch.root.rotation.y =
        at.h +
        (talking
          ? angDiff(Math.atan2(g.player.pos.x - at.x, g.player.pos.z - at.z), at.h) * 0.35
          : 0);
      ch.update(dt, { speed: 0, mode: 'sit', pose: talking ? 'talk' : 'type' });
      return;
    }
    this.tag.visible = true;
    this._outdoor(dt, mode);
  }
  // outdoor modes (subclass); default: nowhere to be seen
  _outdoor(_dt, _mode) {
    this.ch.root.visible = false;
  }
  // stand at a spot outside (only drawn when you are within 160 m); turns to you while you talk
  standAt(dt, sp, pose, extra) {
    const g = this.g,
      p = g.player.worldPos(), // in a car pos is local to it (src/entities/Player.js)
      ch = this.ch,
      near = Math.hypot(sp.x - p.x, sp.z - p.z) < 160;
    ch.root.visible = near;
    this.pos.set(sp.x, sp.y ?? surfaceAt(sp.x, sp.z), sp.z);
    if (!near) return false;
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.face != null) this.heading += angDiff(this.face, this.heading) * Math.min(1, dt * 5);
    } else {
      this.face = null;
      this.heading += angDiff(sp.h, this.heading) * Math.min(1, dt * 3);
    }
    if (g.hud.inDialog && Math.hypot(sp.x - p.x, sp.z - p.z) < 5)
      this.pause = Math.max(this.pause, 0.5);
    ch.root.position.copy(this.pos);
    ch.root.rotation.y = this.heading;
    ch.setDetail?.(Math.hypot(sp.x - p.x, sp.z - p.z) < 35);
    ch.update(dt, { speed: 0, mode: 'foot', pose: this.pause > 0 ? 'talk' : pose, ...extra });
    return true;
  }
  // ---- walking the campus footpaths near you (侯舌's dates, 霍華德 with his girlfriend) ----
  // start on a footpath node 30–90 m from you, on campus; false if there is none
  _appear() {
    const w = this.g.world,
      p = this.g.player.worldPos();
    const near = w.walkNodes.filter((n) => {
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      return d > 30 && d < 90 && w.inCampus(n.x, n.z);
    });
    if (!near.length) return false;
    const n = near[Math.floor(Math.random() * near.length)];
    this.from = n;
    this.to = this._pick(n, null);
    this.d = 0;
    this.len = Math.hypot(this.to.x - n.x, this.to.z - n.z) || 1;
    this.pos.set(n.x, surfaceAt(n.x, n.z), n.z);
    this.heading = Math.atan2(this.to.x - n.x, this.to.z - n.z);
    this.pause = 0;
    this.walkOn = true;
    return true;
  }
  // the next node along the path (not back where he came from, staying on campus)
  _pick(n, from) {
    let opts = n.adj.filter((e) => e.to !== from && this.g.world.inCampus(e.to.x, e.to.z));
    if (!opts.length) opts = n.adj;
    return opts[Math.floor(Math.random() * opts.length)].to;
  }
  where() {
    const p = this.places?.[this.mode];
    return (typeof p === 'function' ? p() : p) || '';
  }
}
