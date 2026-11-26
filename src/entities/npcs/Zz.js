// 排球少年 吱吱：住力行宿舍 276 寢 2 號床（進門右手邊的上舖，座位是右手邊中間那張書桌），室友是 4 號床的侯舌；
// 彥霖在宿舍的床位是同一間的 3 號床（右手邊下舖），座位是右手邊最裡面那張書桌，桌上是彥霖自己的筆電（跟家裡一樣能用電腦）。
// 一天（遊戲時鐘）：
//   02:00–08:00 睡 2 號床；08:00–22:00 照四天排班去茶學苑打工（src/systems/minigames/TeaShop.js），沒班時在體育館門口
//   （src/ui/phone/Friends.js 的 zz 站點）；22:00–02:00 在 276 書桌打 LOL 或楓吱谷；
//   23:00–23:40 大約每 10 天有 6 天跟女拳大帝各騎自己的 BW'S 在學校附近兜風（女拳大帝在前、吱吱在後），兜風那天
//   女拳大帝 23:40 才回寢室（src/entities/npcs/Gordon.js 看 gdOut）。
// 女朋友 Yulu（src/entities/npcs/Yulu.js）：有些晚上 19:00–21:00（沒打工、沒受傷的日子）跟她手牽手在校園散步，那段時間不在體育館。
// 支線「吱吱武嶺跑山受傷」（src/systems/quests/ZzInjury.js）期間：不打工、不打球、不兜風，一直待在 276 養傷；
//   受傷不好爬上舖，所以他睡 3 號床、彥霖睡 2 號床（座位不換）；晚上 8 點到 12 點還沒洗澡的話，他在力行二樓浴室等你。
// 兩台 BW'S（src/entities/Vehicles.js buildBws）：吱吱的白紅舊款打工時停在茶學苑旁、女拳大帝的夜幕灰新款顧店時停在戈登肉鋪門口，
//   其他時間停在力行宿舍大門前的前院；兜風時兩台都騎走。互加好友後可以借騎（按 F），騎走之後放著不管，會自己回到該停的地方。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { makeLabel } from '../../world/MapBuilder.js';
import { surfaceAt } from '../../world/Terrain.js';
import { Vehicle } from '../Vehicles.js';
import { ZZ_LOOK, GD_LOOK } from './FriendLooks.js';
import { zzOnShift } from '../../systems/minigames/TeaShop.js';
import { buildLaptop, gameScreen } from './DevNPC.js';
import { serviceWear } from './Service.js';

const M = (h, m = 0) => h * 60 + m;
const minuteOf = (clock) => ((clock % 1440) + 1440) % 1440;
const H32 = (n) => {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const RIDE0 = M(23),
  RIDE1 = M(23, 40),
  TRAIL = 7.5; // 吱吱 rides this far (m) behind 女拳大帝, along her path
const LOL = gameScreen(
  '#0a1a2f',
  '#0d3b4f',
  '召喚峽谷',
  '積分對戰 ・ 上路 ・ 7 / 3 / 5',
  '#c8aa6e'
);
const MAPLE = gameScreen('#ffb74d', '#5d9cec', '楓吱谷', '組隊打王中 ・ Lv.187 🍁', '#fff4c2');
// a bike's look while you can't take it
const lockMsg = (g, id, label) => () =>
  g.friends?.added.has(id)
    ? null
    : `🔒 這是${label}。先跟${id === 'zz' ? '吱吱' : '女拳大帝'}互加好友才能借騎`;

// cast on the right hand (broken finger) and gauze on the left forearm and the right calf; returns the parts to show / hide
export function addInjury(ch) {
  const white = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.9 }),
    gauze = new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 1 });
  const parts = [];
  const R = ch.arms[0],
    Lf = ch.arms[1];
  const cast = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.07), white);
  cast.position.set(0, -0.3, 0.01);
  (R.el || R.sh).add(cast);
  parts.push(cast);
  const splint = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.025), white);
  splint.position.set(0, -0.39, 0.02);
  (R.el || R.sh).add(splint);
  parts.push(splint);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.09, 12), gauze);
  band.position.set(0, -0.15, 0);
  (Lf.el || Lf.sh).add(band);
  parts.push(band);
  const calf = ch.legs?.[0]?.kn;
  if (calf) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.12, 12), gauze);
    c.position.set(0, -0.2, 0);
    calf.add(c);
    parts.push(c);
  }
  return {
    parts,
    set(on) {
      for (const p of parts) p.visible = on;
    },
  };
}

export class Zz {
  constructor(game) {
    this.g = game;
    this.mode = null;
    this.cruising = false;
    this.trail = [];
    this.parkT = 0;
    const L = (this.L = game.interiors.lixing);
    this._room(L);
    this._bikes(L);
  }
  get q() {
    return this.g.zzQuest;
  }
  get injured() {
    return !!this.q?.injured;
  }
  // 女拳大帝 is out riding with him (not in his room)
  get gdOut() {
    return this.mode === 'ride' && this.cruising;
  }
  rideDay(day) {
    return H32(day * 7 + 3) < 0.6;
  }

  // where he is at this game time
  plan(clock) {
    const m = minuteOf(clock),
      day = Math.floor(clock / 1440);
    if (this.g.mahjong?.has('zz')) return 'mahjong'; // 被揪去 277 打麻將 (src/systems/mahjong/Mahjong.js)
    if (this.q?.waiting()) return 'bath'; // 20:00–24:00, not washed yet today: in the 2F bathroom (the quest draws him there)
    if (m >= M(2) && m < M(8)) return 'sleep';
    if (this.injured) return 'room';
    if (this.g.yulu?.walkNow(clock)) return 'walk'; // with his girlfriend (she draws him, src/entities/npcs/Yulu.js)
    if (zzOnShift(clock)) return 'shop';
    if (m >= M(8) && m < M(22)) return 'gym';
    if (m >= RIDE0 && m < RIDE1 && this.rideDay(day) && (this.cruising || this._canRide()))
      return 'ride';
    return 'room';
  }

  // ---------------- 276: his bed / desk / laptop, 彥霖's bed and his own laptop ----------------
  _room(L) {
    const R = L?.rooms?.[276];
    if (!R) {
      console.warn('[zz] 力行 276 寢找不到');
      return;
    }
    const { k, B, W } = L,
      g = this.g;
    const world = (lx, lz, ly) => {
      const [x, z] = W(lx, lz);
      return { x, z, y: B + ly };
    };
    const desk = R.desks.find((d) => d.side === -1 && d.u === 1),
      myDesk = R.desks.find((d) => d.side === -1 && d.u === 0);
    const bedAt = (n) => ({
      ...world(R.beds[n].x, R.beds[n].z, R.beds[n].y + 0.12),
      h: k.heading(0),
    });
    const floorY = (x, z) => R.y + B - surfaceAt(x, z); // interiors actions: height of the 2F floor above the ground here
    this.home = {
      R,
      seat: { ...world(desk.chair.x, desk.chair.z, R.y), h: k.heading(desk.face) },
      bed2: bedAt(2),
      bed3: bedAt(3),
    };
    // his figure in the room (and asleep); the cast and gauze while he is hurt
    const ch = (this.ch = createCharacter(ZZ_LOOK));
    const tag = (this.tag = makeLabel('🏐 吱吱', { height: 0.24, size: 40, color: '#ffd23f' }));
    tag.position.set(0, 1.8, 0);
    ch.root.add(tag);
    serviceWear('zz', ch, ZZ_LOOK, { tag });
    this.hurt = addInjury(ch);
    this.hurt.set(false);
    ch.root.visible = false;
    g.scene.add(ch.root);
    // his laptop: LOL or 楓吱谷 (the shared screen glow of src/entities/npcs/DevNPC.js)
    this.lap = buildLaptop(L, R, desk, {
      file: '',
      lines: [''],
      games: { lol: LOL, maple: MAPLE, default: LOL },
    });
    g.scene.add(this.lap.group, this.lap.glow);
    g.interiors.actions.push({
      x: this.home.seat.x,
      z: this.home.seat.z,
      r: 1.6,
      y: floorY(this.home.seat.x, this.home.seat.z),
      cond: () => this.mode === 'room' || this.mode === 'sleep',
      label: () =>
        this.mode === 'sleep'
          ? `按 <kbd>E</kbd> 看看 ${this.injured ? 3 : 2} 號床上的吱吱（睡著了）`
          : g.yuluQuest?.ready
            ? '按 <kbd>E</kbd> 把無糖茶交給吱吱（Yulu 請你送的）'
            : '按 <kbd>E</kbd> 和吱吱聊天',
      fn: () => this.talk(),
    });
    // 彥霖's own laptop on the innermost desk (opens the same computer as at home)
    const D = world(myDesk.x, myDesk.z, R.y + 0.76),
      s = Math.sign(-Math.sin(myDesk.face)) || 1;
    const lap = new THREE.Group(),
      body = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.35, metalness: 0.6 });
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 160;
    const x = cv.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 256, 160);
    gr.addColorStop(0, '#1d3557');
    gr.addColorStop(1, '#ffd23f');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 160);
    x.fillStyle = '#fff';
    x.font = '900 26px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    x.textAlign = 'center';
    x.fillText('資管要贏', 128, 70);
    x.font = '700 18px sans-serif';
    x.fillText('票投彥霖 34', 128, 100);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.24), body);
    const hinge = new THREE.Group(),
      lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.01), body),
      scr = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.2),
        new THREE.MeshBasicMaterial({ map: tex })
      );
    lid.position.y = 0.11;
    scr.position.set(0, 0.11, 0.006);
    hinge.add(lid, scr);
    hinge.rotation.x = -0.25;
    hinge.position.set(0, 0.01, -0.11);
    lap.add(base, hinge);
    const [ox, oz] = W(myDesk.x + s * 0.05, myDesk.z);
    lap.position.set(ox, D.y + 0.01, oz);
    lap.rotation.y = k.heading(myDesk.face + Math.PI);
    g.scene.add(lap);
    // the action sits on his chair, not the desk: the desk / wardrobe block is solid, so from the aisle you never get
    // within a metre of the desk's middle (the prompt never came up)
    const C = world(myDesk.chair.x, myDesk.chair.z, R.y);
    this.myDeskAt = C;
    g.interiors.actions.push({
      x: C.x,
      z: C.z,
      r: 1.1,
      y: floorY(C.x, C.z),
      label: () => '按 <kbd>E</kbd> 使用自己的筆電',
      fn: (gm) => gm.pc?.open('彥霖的筆電'),
    });
    // 彥霖's own wardrobe next to that desk: the same wardrobe as at home (src/ui/Wardrobe.js)
    const WR = myDesk.wardrobe,
      wf = world(WR.front, WR.z, R.y);
    g.interiors.actions.push({
      x: wf.x,
      z: wf.z,
      r: 0.75,
      y: floorY(wf.x, wf.z),
      ...(() => {
        const [ax, az] = W(WR.x, WR.z);
        return { aimX: ax, aimZ: az, aimY: B + R.y + 1.2, glow: 0.6 };
      })(),
      label: () => '按 <kbd>E</kbd> 打開自己的衣櫥換衣服',
      fn: (gm) => gm.wardrobe?.open('dorm'),
    });
    // 彥霖's bed: 3 (lower), or 2 (upper) while 吱吱 is hurt and sleeps in 3
    for (const n of [2, 3]) {
      const b = R.beds[n],
        sx = Math.sign(R.center[0] - b.x) || 1,
        at = world(b.x + sx * 0.75, b.z, R.y);
      g.interiors.actions.push({
        x: at.x,
        z: at.z,
        r: 0.9,
        y: floorY(at.x, at.z),
        cond: () => this.myBed() === n,
        label: (gm) =>
          gm.canSleep()
            ? `按 <kbd>E</kbd> 在 ${n} 號床睡覺（睡到隔天早上 6:00）`
            : `按 <kbd>E</kbd> 在 ${n} 號床躺一下（晚上 9 點後才能睡覺）`,
        fn: (gm) => {
          if (gm.canSleep()) gm.sleep();
          else
            gm.hud.toast(
              n === 2
                ? '🛏️ 上舖有點晃，吱吱受傷這陣子先跟他換床'
                : '🛏️ 這是你在宿舍的床位，下舖比較好睡',
              'good',
              2400
            );
        },
      });
    }
  }
  myBed() {
    return this.injured ? 2 : 3;
  }
  talk() {
    const g = this.g;
    if (this.mode === 'room' && g.yuluQuest?.give()) return; // the unsweetened tea Yulu asked you to bring (src/systems/quests/YuluTea.js)
    if (this.mode === 'sleep') {
      g.dialog([
        ['吱吱', '（呼……呼……）'],
        [
          '彥霖',
          this.injured
            ? '（吱吱睡在 3 號床，打著石膏的手小心地放在胸口）'
            : '（吱吱在上舖睡著了，手機還在播排球比賽）',
        ],
      ]);
      return;
    }
    if (this.injured) {
      const L = [
        [['吱吱', '手指好痛……打 LOL 只能單手按 Q 😭']],
        [
          ['吱吱', '晚上 8 點到 12 點記得來浴室救我 🛁'],
          ['吱吱', '侯舌說他會負責扶，你負責肥皂跟潑水'],
        ],
        [['吱吱', '女拳大帝一直跟我道歉，還說要請我吃一個月麥當勞 🍔']],
      ];
      g.dialog(L[Math.floor(Math.random() * L.length)]);
      return;
    }
    if (g.friends?.added.has('zz')) {
      const L = [
        [['吱吱', '楓吱谷今天組隊打王，掉了一把好武器 🍁']],
        [['吱吱', '欸 LOL 等等雙排嗎？輸了算你的 😏']],
        [['吱吱', '侯舌又在寫程式，鍵盤聲比我的滑鼠還大聲']],
      ];
      g.dialog(L[Math.floor(Math.random() * L.length)]);
      return;
    }
    g.friends?.talk('zz', null);
  }

  // ---------------- the two BW'S: parked ones you can borrow, and the pair that rides at night ----------------
  _bikes(L) {
    const g = this.g;
    const park = (model, id, label) => {
      const v = g._addVehicle('scooter', 0, -9999, 0, null, { model }); // placed on its spot by _park
      v.label = label;
      v.owner = id;
      v.lock = lockMsg(g, id, label);
      v.idle = 0;
      v.spot = null;
      const t = makeLabel(`🛵 ${label}`, {
        height: 0.26,
        size: 40,
        color: id === 'zz' ? '#ffd23f' : '#ff9a9a',
      });
      t.position.set(0, 1.75, 0);
      v.mesh.add(t);
      return v;
    };
    this.zzBike = park('bws_zz', 'zz', "吱吱的 BW'S");
    this.gdBike = park('bws_gd', 'gd', "女拳大帝的 BW'S");
    // spots: 茶學苑 (beside the deck), 戈登肉鋪 (beside its paving), 力行 forecourt (two side by side)
    const tea = g.interiors.tea,
      S = g.interiors.gordon;
    this.spots = {};
    if (tea?.k) {
      const [x, z] = tea.k.w(5.6, -3.0);
      this.spots.tea = { x, z, h: tea.k.heading(0) };
    }
    if (S?.front && S.door) {
      const dx = S.front.x - S.door[0],
        dz = S.front.z - S.door[1],
        l = Math.hypot(dx, dz) || 1,
        nx = dx / l,
        nz = dz / l; // out of the door
      this.spots.gordon = {
        x: S.front.x + nz * 3.2 + nx * 0.8,
        z: S.front.z - nx * 3.2 + nz * 0.8,
        h: Math.atan2(-nx, -nz),
      };
    }
    if (L?.park) {
      const [ax, az] = L.W(L.park.x, L.park.z),
        [bx, bz] = L.W(L.park.x + 1.3, L.park.z),
        h = L.k.heading(Math.PI);
      this.spots.dormZz = { x: ax, z: az, h };
      this.spots.dormGd = { x: bx, z: bz, h };
    }
    // the night ride: her BW'S joins the traffic with her on it; his follows her path TRAIL m behind (not traffic)
    const gr = (this.gdRider = createCharacter(GD_LOOK)),
      gt = makeLabel('🛵 女拳大帝（兜風中）', { height: 0.26, size: 40, color: '#ff9a9a' });
    gt.position.set(0, 2.1, 0);
    gr.root.add(gt);
    serviceWear('gd', gr, GD_LOOK, { tag: gt }); // 義務役 (src/entities/npcs/Service.js)
    this.cruiser = g.traffic?.adopt(new Vehicle('scooter', Math.random, { model: 'bws_gd' }), gr);
    if (this.cruiser) {
      this.cruiser.ai.hold = true;
      this.cruiser.label = "女拳大帝的 BW'S（兜風中）";
      this.cruiser.lock = () => '🔒 女拳大帝正在騎，不能借';
    }
    const tv = (this.trailBike = new Vehicle('scooter', Math.random, { model: 'bws_zz' }));
    const zr = (this.zzRider = createCharacter(ZZ_LOOK)),
      zt = makeLabel('🛵 吱吱（兜風中）', { height: 0.26, size: 40, color: '#ffd23f' });
    zt.position.set(0, 2.1, 0);
    zr.root.add(zt);
    serviceWear('zz', zr, ZZ_LOOK, { tag: zt });
    zr.root.position.copy(tv.seat);
    tv.mesh.add(zr.root);
    zr.update(0.1, { mode: 'ride' });
    tv.mesh.visible = false;
    g.scene.add(tv.mesh);
    for (const v of [this.zzBike, this.gdBike]) this._park(v, this._spotFor(v), true);
  }
  // where each parked bike belongs right now (null: out riding)
  _spotFor(v) {
    const S = this.spots;
    if (this.mode === 'ride' && this.cruising) return null;
    if (v === this.zzBike) return this.mode === 'shop' && S.tea ? S.tea : S.dormZz;
    return !this.g.interiors.gordon?.closed && S.gordon ? S.gordon : S.dormGd;
  }
  // puts a parked bike on its spot when you can't see it happen (you are 40 m from both) — or at once (now);
  // a bike you rode and left somewhere goes back after 2 minutes, or once you are far away
  _park(v, spot, now = false) {
    const g = this.g,
      p = g.player.worldPos();
    if (g.player.vehicle === v) {
      v.idle = 0;
      return;
    }
    if (!spot) {
      // out riding
      if (!v.away) {
        const i = g.vehicles.indexOf(v);
        if (i >= 0) g.vehicles.splice(i, 1);
        g.scene.remove(v.mesh);
        v.away = true;
      }
      return;
    }
    const d = (x, z) => Math.hypot(x - p.x, z - p.z);
    if (v.away) {
      if (now || d(spot.x, spot.z) > 30) {
        v.place(spot.x, spot.z, spot.h);
        g.scene.add(v.mesh);
        if (!g.vehicles.includes(v)) g.vehicles.push(v);
        v.away = false;
        v.mesh.visible = true;
      }
      return;
    }
    const off = Math.hypot(v.pos.x - spot.x, v.pos.z - spot.z) > 1.2;
    if (!off) {
      v.idle = 0;
      return;
    }
    v.idle += this.parkT;
    if (
      now ||
      (d(v.pos.x, v.pos.z) > 40 && d(spot.x, spot.z) > 40) ||
      (v.idle > 120 && d(spot.x, spot.z) > 12)
    ) {
      if (
        (g.vehicles || []).some(
          (o) => o !== v && Math.hypot(o.pos.x - spot.x, o.pos.z - spot.z) < 1.2
        )
      )
        return;
      v.place(spot.x, spot.z, spot.h);
      v.idle = 0;
      v.mesh.visible = true;
    }
  }
  // the ride starts only with both bikes on their spots (not while you have one of them)
  _canRide() {
    const ok = (v) => v && !v.away && this.g.player.vehicle !== v && v.idle === 0;
    return (
      !this.injured &&
      !this.q?.state.relapse &&
      ok(this.zzBike) &&
      ok(this.gdBike) &&
      !!this.cruiser
    );
  }
  _cruise(dt) {
    const g = this.g,
      C = this.cruiser;
    if (!C) return;
    const want = this.mode === 'ride';
    if (want && !this.cruising) {
      this.cruising = true;
      C.ai.hold = false;
      this.trail = [];
      // they set off where you can come across them: on campus near you, otherwise from round 力行 (the campus edge)
      const p = g.player.worldPos(),
        S = this.spots.dormZz,
        on = g.world.inCampus?.(p.x, p.z) || !S;
      g.traffic.spawn?.(C, on ? p.x : S.x, on ? p.z : S.z, on ? 30 : 0, on ? 90 : 120);
    }
    if (!want && this.cruising) {
      C.ai.hold = true;
      if (C.ai.dormant || !g.traffic.inView(C.pos)) {
        C.ai.dormant = true;
        C.mesh.visible = false;
        this.cruising = false;
      }
    }
    if (!this.cruising && C.ai.hold && !C.ai.dormant && !g.traffic.inView(C.pos)) {
      C.ai.dormant = true;
      C.mesh.visible = false;
    }
    // 吱吱 behind her: TRAIL m back along the points she passed
    const T = this.trailBike,
      on = this.cruising && !C.ai.dormant && C.mesh.visible;
    if (!on) {
      T.mesh.visible = false;
      this.trail = [];
      return;
    }
    const tr = this.trail,
      last = tr[tr.length - 1],
      y = C.mesh.position.y;
    if (!last || Math.hypot(C.pos.x - last.x, C.pos.z - last.z) > 0.4) {
      tr.push({ x: C.pos.x, z: C.pos.z, y });
      if (tr.length > 80) tr.shift();
    }
    let left = TRAIL,
      i = tr.length - 1,
      px = C.pos.x,
      pz = C.pos.z,
      py = y;
    for (; i >= 0; i--) {
      const q = tr[i],
        l = Math.hypot(px - q.x, pz - q.z);
      if (l >= left) {
        const k = left / l;
        px += (q.x - px) * k;
        pz += (q.z - pz) * k;
        py += (q.y - py) * k;
        left = 0;
        break;
      }
      left -= l;
      px = q.x;
      pz = q.z;
      py = q.y;
    }
    if (left > 0) {
      T.mesh.visible = false;
      return;
    } // she hasn't gone far enough yet
    const ahead = tr[Math.min(tr.length - 1, i + 1)] || { x: C.pos.x, z: C.pos.z },
      h = Math.atan2(ahead.x - px, ahead.z - pz);
    T.mesh.visible = true;
    T.pos.set(px, py, pz);
    T.mesh.position.set(px, py, pz);
    if (Number.isFinite(h))
      T.mesh.rotation.y += angDiff(h, T.mesh.rotation.y) * Math.min(1, dt * 8);
    T.mesh.updateMatrix();
    T.mesh.updateMatrixWorld(true);
  }

  // ---------------- every frame (src/core/Game.js) ----------------
  update(dt) {
    const g = this.g,
      mode = this.plan(g.clock);
    if (mode !== this.mode) this.mode = mode;
    this._cruise(dt);
    if ((this.parkT += dt) > 1) {
      for (const v of [this.zzBike, this.gdBike]) this._park(v, this._spotFor(v));
      this.parkT = 0;
    }
    // the gym spot (src/ui/phone/Friends.js) only while he is there
    const gym = g.friends?.npcs?.zz;
    if (gym) gym.ch.root.visible = mode === 'gym';
    // his room
    const H = this.home;
    if (!H) return;
    const p = g.player.pos,
      inRoom = mode === 'room' || mode === 'sleep';
    const dist = Math.hypot(p.x - H.seat.x, p.z - H.seat.z);
    this.lap.tick(
      dt,
      mode === 'room' ? (Math.floor(g.clock / 30) % 2 ? 'maple' : 'lol') : 'off',
      dist
    );
    this.hurt.set(this.injured);
    if (mode === 'mahjong') {
      this.tag.visible = true;
      g.mahjong.hold('zz', this.ch, dt);
      return;
    }
    this.ch.root.visible = inRoom && dist < 60;
    if (!this.ch.root.visible) return;
    const sl = mode === 'sleep',
      at = sl ? (this.injured ? H.bed3 : H.bed2) : H.seat;
    this.ch.root.position.set(at.x, at.y, at.z);
    const talking = g.hud.inDialog && dist < 3;
    this.ch.root.rotation.y = sl
      ? at.h
      : at.h + (talking ? angDiff(Math.atan2(p.x - at.x, p.z - at.z), at.h) * 0.35 : 0);
    this.tag.visible = !sl;
    this.ch.setDetail?.(dist < 20);
    this.ch.update(dt, {
      speed: 0,
      mode: sl ? 'down' : 'sit',
      pose: sl ? null : talking ? 'talk' : 'type',
    });
  }
  // a second figure of him for the walks with Yulu (src/entities/npcs/Yulu.js)
  makeWalker() {
    const ch = createCharacter(ZZ_LOOK),
      tag = makeLabel('🏐 吱吱', { height: 0.24, size: 40, color: '#ffd23f' });
    tag.position.set(0, 1.8, 0);
    ch.root.add(tag);
    serviceWear('zz', ch, ZZ_LOOK, { tag });
    ch.root.visible = false;
    return ch;
  }
  // for the phone (定位 / 你在哪)
  where() {
    const m = this.mode;
    if (m === 'bath') return '在力行二樓浴室等你幫他洗殘廢澡 🛁';
    if (m === 'sleep') return `在力行宿舍 276 寢睡覺（${this.injured ? 3 : 2} 號床）`;
    if (this.injured) return '在力行宿舍 276 寢養傷（手指骨折）🩹';
    if (m === 'shop') return '在正門外的茶學苑打工';
    if (m === 'gym') return '在體育館門口';
    if (m === 'walk') return '跟女朋友 Yulu 在校園散步 💕';
    if (m === 'ride') return "跟女拳大帝騎 BW'S 在學校附近兜風 🛵";
    return `在力行宿舍 276 寢打${Math.floor(this.g.clock / 30) % 2 ? '楓吱谷 🍁' : ' LOL 🎮'}`;
  }
  // where he is on the map (定位): null if far off
  pos() {
    const m = this.mode,
      g = this.g;
    if (m === 'bath') return this.q?.bathSpot || null;
    if (m === 'shop') return g.tea?.zz?.root.position || null;
    if (m === 'gym') return g.friends?.npcs?.zz?.ch.root.position || null;
    if (m === 'walk') return null; // out with his girlfriend: no pin
    if (m === 'ride')
      return this.trailBike.mesh.visible
        ? this.trailBike.mesh.position
        : this.cruiser && !this.cruiser.ai.dormant
          ? this.cruiser.pos
          : null;
    return this.home
      ? m === 'sleep'
        ? this.injured
          ? this.home.bed3
          : this.home.bed2
        : this.home.seat
      : null;
  }
}
