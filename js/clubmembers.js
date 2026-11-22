// 古箏社社員（js/clubroom.js 的 3F 教室）：社團時間（黃蓋瑞在的中午或晚上）全員練團，其他平日傍晚有兩位自主練習，別的時間沒有人。
// 琴聲只有在真的有人坐著彈、而且你在同一層樓的教室裡（走廊門邊聽得到一點）才有；沒有人就沒有聲音。
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { makeLabel } from './map.js';
import { garryPlan } from './garry.js';
import { reachArm } from './armik.js';

export const MEMBERS = [
  { id: 'qi', name: '小琪', title: '古箏社社長', seat: 0, look: { skin: '#f0cfae', shirt: '#e9dfe8', shorts: '#3a3f52', pants: true, hair: '#2a1c14', hairStyle: 'long', shoes: '#f2f2f0', face: true },
    talk: [['小琪', '歡迎來古箏社！我是社長小琪，零基礎也可以直接來上社課喔'], ['小琪', '這首〈漁舟唱晚〉後面的花指要一口氣刮上去，我們還在練整齊']] },
  { id: 'xuan', name: '小萱', title: '古箏社社員', seat: 2, look: { skin: '#f2d4b8', shirt: '#b9d3c4', shorts: '#4a4038', pants: true, hair: '#1a1412', hairStyle: 'pony', shoes: '#d9d4c8', glasses: true, face: true },
    talk: [['小萱', '我才學一個學期，左手壓弦還會抖 😂'], ['小萱', '義甲要用膠布纏在手指上，纏太緊手會麻']] },
  { id: 'yu', name: '阿宇', title: '古箏社器材', seat: 4, look: { skin: '#e6bf9c', shirt: '#2f3b52', shorts: '#23262d', pants: true, hair: '#15110e', hairStyle: 'short', shoes: '#2a2a2c', face: true },
    talk: [['阿宇', '我負責器材，二十一條弦斷一條就是我的事……'], ['阿宇', '琴碼跑掉音就不準了，搬琴的時候不要碰到喔']] },
];
export function createMember(id) { const n = MEMBERS.find(v => v.id === id); return createCharacter({ ...n.look }); }

// who is in the room: [] most of the time; all three while 蓋瑞 has club, two on the other weekday evenings
export function clubWho(clock) {
  if (garryPlan(clock) === 'club') return MEMBERS.map(v => v.id);
  const day = Math.floor(clock / 1440), m = clock - day * 1440;
  if (day % 7 < 5 && m >= 17 * 60 && m < 18 * 60 + 30) return ['xuan', 'yu'];
  return [];
}
// hands on the strings of a guzheng 0.6 m in front (t: time, busy: really playing)
export function playPose(ch, t, busy) {
  const [aR, aL] = ch.arms; ch.torso.rotation.x = 0.34; ch.head.rotation.x = 0.26 + Math.sin(t * 0.9) * 0.05;
  ch.root.updateMatrixWorld(true);
  const s = busy ? 1 : 0, a = Math.sin(t * 5.2), b = Math.sin(t * 1.3);
  const y = 0.735 / ch.root.scale.y;
  reachArm(ch, aR, -0.3 + b * 0.03 * s, y + Math.max(0, a) * 0.045 * s, 0.5 + Math.cos(t * 2.6) * 0.05 * s, -0.6, -0.5, -0.5);
  reachArm(ch, aL, 0.2 + b * 0.06 * s, y + Math.max(0, Math.sin(t * 2.1)) * 0.035 * s, 0.5 + Math.sin(t * 1.7) * 0.04 * s, 0.6, -0.5, -0.5);
}

const SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77];
export class ClubMembers {
  constructor(game) {
    this.g = game; this.room = game.interiors.club; this.list = []; this.t = 0; this.pt = 0; this.ni = 4; this.players = 0;
    if (!this.room) return;
    for (const m of MEMBERS) {
      const sp = m.seat != null ? this.room.seats[m.seat] : this.room.stand[m.stand], n = { ...m, sp, ch: null, on: false, pause: 0, face: null, heading: sp.h, line: 0 };
      this.list.push(n);
      game.interiors.actions.push({
        x: sp.x, z: sp.z, r: 1.35, y: 0, anyY: true, cond: () => n.on && Math.abs(game.player.pos.y - this.room.F3) < 1.5,
        label: () => `按 <kbd>E</kbd> 和${n.name}聊天`,
        fn: () => {
          const p = game.player.worldPos(); n.talking = true; n.face = Math.atan2(p.x - sp.x, p.z - sp.z);
          game.dialog([n.talk[n.line++ % n.talk.length]], () => { n.talking = false; n.pause = 1; });
        },
      });
    }
    game.interiors.updaters.push((dt) => this.update(dt));
  }
  // how well you hear the room: 1 inside, a little by its door on the same floor, 0 anywhere else
  ear() {
    const p = this.g.player.worldPos(), r = this.room;
    if (Math.abs(p.y - r.F3) > 1.6) return 0;
    if (r.inside(p.x, p.z)) return 1;
    return Math.max(0, 1 - Math.hypot(p.x - r.door.x, p.z - r.door.z) / 9) * 0.3;
  }
  update(dt) {
    const g = this.g, p = g.player.worldPos(), r = this.room, near = Math.hypot(p.x - r.play.x, p.z - r.play.z) < 45 && Math.abs(p.y - r.F3) < 5;
    const who = near ? clubWho(g.clock) : []; this.t += dt; this.players = 0;
    this.list.forEach((n, i) => {
      n.on = who.includes(n.id);
      if (!n.on) { if (n.ch) n.ch.root.visible = false; n.talking = false; return; }
      if (!n.ch) { n.ch = createCharacter({ ...n.look }); const tag = makeLabel(n.name, { height: 0.2, size: 36 }); tag.position.set(0, n.seat != null ? 1.62 : 2.0, 0); n.ch.root.add(tag); n.ch.root.traverse(o => { if (o.isMesh) o.castShadow = false; }); g.scene.add(n.ch.root); }
      const root = n.ch.root, seated = n.seat != null; root.visible = true;
      n.pause = n.talking ? 1 : Math.max(0, n.pause - dt);
      const want = n.pause > 0 && n.face != null && !seated ? n.face : n.sp.h; n.heading += Math.atan2(Math.sin(want - n.heading), Math.cos(want - n.heading)) * Math.min(1, dt * 5);
      root.position.set(n.sp.x, r.F3, n.sp.z); root.rotation.y = n.heading;
      n.ch.setDetail(Math.hypot(p.x - n.sp.x, p.z - n.sp.z) < 14);
      const playing = seated && n.pause <= 0; if (playing) this.players++;
      n.ch.update(dt, seated ? { mode: 'sit', speed: 0 } : { mode: 'foot', speed: 0, pose: n.talking ? 'talk' : 'phone' });
      if (seated) playPose(n.ch, this.t + i * 0.37, playing);
      if (!g.player.vehicle && Math.abs(p.y - r.F3) < 1.5) { const q = g.player.pos, dx = q.x - n.sp.x, dz = q.z - n.sp.z, d = Math.hypot(dx, dz); if (d < 0.55 && d > 1e-4) { q.x = n.sp.x + dx / d * 0.55; q.z = n.sp.z + dz / d * 0.55; } }
    });
    const G = g.garry; if (near && G?.playing) this.players++;
    this._music(dt);
  }
  // everybody who is playing plays the same pentatonic tune, some of them an octave away; nobody playing = silence
  _music(dt) {
    if ((this.pt -= dt) > 0) return;
    this.pt = 0.26 + (Math.random() < 0.25 ? 0.26 : 0);
    const A = this.g.audio, ctx = A.ctx, ear = this.players ? this.ear() : 0;
    if (ear < 0.02 || !ctx || ctx.state !== 'running' || !A.sfx) return;
    this.ni = Math.max(0, Math.min(SCALE.length - 1, this.ni + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
    const n = Math.min(3, this.players), vol = 0.16 * ear / Math.sqrt(n);
    for (let i = 0; i < n; i++) if (i === 0 || Math.random() < 0.8) this._note(SCALE[this.ni] * (i === 2 ? 0.5 : 1), vol, i * 0.012 + Math.random() * 0.015);
  }
  _note(f, vol, when) {
    const A = this.g.audio, ctx = A.ctx, t = ctx.currentTime + when, o = ctx.createOscillator(), o2 = ctx.createOscillator(), gn = ctx.createGain(), flt = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.01;
    flt.type = 'lowpass'; flt.frequency.setValueAtTime(4200, t); flt.frequency.exponentialRampToValueAtTime(900, t + 0.8);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol + 0.0001, t + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(flt); o2.connect(flt); flt.connect(gn); gn.connect(A.sfx); o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
  }
}
