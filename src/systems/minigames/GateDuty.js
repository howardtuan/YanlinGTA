// 側門門禁任務「別讓怪人進來」：坐進新中北路側門（活動中心旁）警衛室就開始。
// 訪客一個個走到柵欄前，看證件、聽他說什麼，按 1 放行、2 擋下。按 E 提早下班。
import { createCharacter, randomStudent } from '../../entities/Character.js';
import { surfaceAt } from '../../world/Terrain.js';

const SHIFT = 8;          // visitors per shift
const WEIRD_MIN = 3;      // at least this many weirdos per shift
const VOTE_CAP = 16;      // votes the gate can give in total
const PAY = 150;          // NT$ per finished shift

// legit visitors: look is filled in with a random student unless given
const OK = [
  { who: '資管一甲 學妹', line: '學長好～我要回宿舍！', id: '學生證 ✅ 照片相符', item: '書包' },
  { who: '電機三 學長', line: '實驗做到現在，終於可以回學校吃飯了', id: '學生證 ✅ 照片相符', item: '筆電包' },
  { who: '外送員', line: '你好，系辦訂的便當，送資管系館', id: '外送 App 訂單 ✅ 收件人：資管系辦', item: '保溫箱', look: { shirt: '#1fa463', shorts: '#222', pants: true, hair: '#111', hairStyle: 'short', face: true } },
  { who: '王教授', line: '下午有課，麻煩開一下柵欄，謝謝', id: '教職員證 ✅', item: '公事包', look: { shirt: '#f2f2f2', shorts: '#2b2b33', pants: true, hair: '#777', hairStyle: 'short', glasses: true, face: true } },
  { who: '學生家長', line: '我來載女兒，她在全人教育村', id: '訪客登記 ✅ 已換證', item: '車鑰匙', look: { shirt: '#8a6d5b', shorts: '#333', pants: true, hair: '#2b2b2b', hairStyle: 'short', face: true } },
  { who: '麥當勞晚班店員', line: '我是來接班的，活動中心那家', id: '員工證 ✅ 中原店', item: '制服袋', look: { shirt: '#c8102e', shorts: '#1b1b1d', pants: true, hair: '#1a1410', hairStyle: 'pony', face: true } },
  { who: '化學二 同學', line: '我宿舍卡忘在房間，學生證有帶', id: '學生證 ✅ 照片相符', item: '實驗衣' },
  { who: '系籃隊員', line: '要去體育館練球，冠廷在等我', id: '學生證 ✅ 照片相符', item: '籃球 🏀' },
  { who: '清潔阿姨', line: '我負責懷恩樓，換班囉', id: '外包廠商識別證 ✅', item: '清潔推車', look: { shirt: '#4a7bd1', shorts: '#333', pants: true, hair: '#555', hairStyle: 'pony', face: true } },
  { who: '轉學生', line: '第一天來報到，註冊組在哪裡？', id: '入學通知單 ✅ 有校印', item: '資料夾' },
];
// weirdos: something about the ID, the story or the luggage doesn't add up
const WEIRD = [
  { who: '穿雨衣的人', line: '……（不說話，一直往校園裡看）', id: '❌ 沒有任何證件', item: '大麻布袋（會動）', look: { shirt: '#f2d40f', shorts: '#f2d40f', pants: true, hair: '#111', hairStyle: 'short', glasses: true, glassesColor: '#111', face: true } },
  { who: '自稱校長的表哥', line: '我是校長表哥啦！校長叫什麼名字？呃…我忘了', id: '❌ 只有名片，寫著「校長表哥」', item: '一箱保健食品' },
  { who: '推銷員', line: '同學，靈骨塔有興趣嗎？投資報酬率很高喔', id: '❌ 非本校人員，未登記', item: '靈骨塔型錄', look: { shirt: '#2b2b2b', shorts: '#2b2b2b', pants: true, hair: '#111', hairStyle: 'short', glasses: true, glassesColor: '#111', face: true } },
  { who: '戴墨鏡的同學', line: '我是資管的啦，學生證借我朋友的', id: '❌ 學生證照片是女生，他是男生', item: '空背包', look: { shirt: '#3b3b3b', shorts: '#111', pants: true, hair: '#111', hairStyle: 'short', glasses: true, glassesColor: '#000', face: true } },
  { who: '奇怪的大叔', line: '我要進去找外星人，他們在鐘塔上面', id: '❌ 沒有證件', item: '錫箔紙帽子', look: { shirt: '#9b59b6', shorts: '#5a5a5a', pants: true, hair: '#999', hairStyle: 'short', face: true } },
  { who: '對手陣營的人', line: '我只是要進去…撕一下彥霖的海報而已', id: '❌ 外校學生證', item: '美工刀＋膠帶' },
  { who: '騎士（沒拿安全帽）', line: '我要騎進去飆一圈，讓我過啦', id: '❌ 沒有車輛通行證', item: '改裝排氣管', look: { shirt: '#e74c3c', shorts: '#111', pants: true, hair: '#c0392b', hairStyle: 'short', face: true } },
  { who: '自稱宅配', line: '有包裹……收件人？呃，就是學校啊', id: '❌ 沒有單號、沒有收件人', item: '沒貼單的紙箱' },
];
const _pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class GateDuty {
  constructor(game) {
    this.g = game; this.active = false; this.votesGiven = 0; this.shifts = 0; this.best = 0;
    const el = this.el = document.createElement('div');
    el.id = 'gatePanel'; el.className = 'hidden';
    document.getElementById('app').appendChild(el);
    el.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) this.decide(b.dataset.d === 'in'); });
  }
  start(gate) {
    if (this.active) return;
    this.gate = gate; this.active = true; this.n = 0; this.stats = { ok: 0, wrong: 0, blocked: 0, leaked: 0 };
    const weird = WEIRD_MIN + (Math.random() < 0.5 ? 1 : 0);
    this.queue = shuffle([...shuffle([...WEIRD]).slice(0, weird).map(v => ({ ...v, weird: true })), ...shuffle([...OK]).slice(0, SHIFT - weird)]);
    // which way along the road is outside campus: the end farther from the 資管系館
    const k = gate.k, im = this.g.world.named['資訊管理學系'] || { x: 0, z: 100 };
    const a = k.w(gate.barX + 20, -gate.off), b = k.w(gate.barX - 20, -gate.off);
    this.sgn = Math.hypot(a[0] - im.x, a[1] - im.z) > Math.hypot(b[0] - im.x, b[1] - im.z) ? 1 : -1;
    this.g.hud.bigToast('🚧 門禁任務', '別讓怪人進來！看證件、聽他怎麼說：按 1 放行、按 2 擋下', 3200);
    this.v = null; this.wait = 1.2; this._cam = null; this._render();
  }
  // local road coordinate (along the road from the barrier, + = outside) → world
  _at(along, lateral = 0) { const gt = this.gate; return gt.k.w(gt.barX + this.sgn * along, -gt.off + lateral); }
  _spawn() {
    const d = this.queue[this.n]; if (!d) return;
    const ch = createCharacter({ ...(d.look ? { skin: '#e6c09c', shoes: '#222', ...d.look } : randomStudent(Math.random)), face: true });
    this.g.scene.add(ch.root);
    this.v = { d, ch, s: 16, state: 'in', lat: (Math.random() - 0.5) * 0.6, t: 0 };
    this._place(0);
  }
  _place(dt, speed = 0, dir = -1) {
    const v = this.v, [x, z] = this._at(v.s, v.lat), [x2, z2] = this._at(v.s + dir * 0.1, v.lat);
    v.ch.root.position.set(x, surfaceAt(x, z), z);
    v.ch.root.rotation.y = Math.atan2(x2 - x, z2 - z);
    v.ch.update(dt, { speed, mode: 'foot', pose: v.pose || null });
  }
  decide(letIn) {
    const v = this.v; if (!this.active || !v || v.state !== 'wait') return;
    const g = this.g, d = v.d, st = this.stats;
    v.state = letIn ? 'pass' : 'leave';
    if (letIn) { this.gate.forceOpen = true; g.audio.interact(); }
    else g.audio.bad?.();
    const vote = n => { const k = Math.max(0, Math.min(n, VOTE_CAP - this.votesGiven)); this.votesGiven += k; return k; };
    if (d.weird && !letIn) { st.blocked++; st.ok++; const k = vote(2); g.addVotes(k, `擋下「${d.who}」！校園守住了${k ? ` +${k} 票` : ''}`); }
    else if (d.weird && letIn) { st.leaked++; st.wrong++; v.run = true; g.addVotes(-3, `「${d.who}」混進學校了！-3 票 😱`); g.audio.bad?.(); }
    else if (!d.weird && letIn) { st.ok++; const k = vote(1); g.hud.toast(`${d.who}：「謝謝警衛！」${k ? ` +${k} 票` : ''}`, 'good', 1800); if (k) g.addVotes(k); }
    else { st.wrong++; g.addVotes(-1, `${d.who}被擋在門外，很不爽 -1 票`); }
    this._render();
  }
  update(dt, inp) {
    if (!this.active) return;
    const g = this.g;
    if (inp.hit('KeyE', 'Escape')) { this.stop(true); return; }
    if (inp.hit('Digit1', 'Numpad1', 'KeyY')) this.decide(true);
    else if (inp.hit('Digit2', 'Numpad2', 'KeyN')) this.decide(false);
    const v = this.v;
    if (!v) {
      this.wait -= dt;
      if (this.wait <= 0) { if (this.n < SHIFT) this._spawn(); else this.stop(false); }
      return;
    }
    v.t += dt;
    if (v.state === 'in') {
      v.s -= dt * 2.3; if (v.s <= 2.4) { v.s = 2.4; v.state = 'wait'; g.audio.talk(); this._render(); }
      this._place(dt, 2.3, -1);
    } else if (v.state === 'wait') this._place(dt, 0, -1);
    else if (v.state === 'pass') {
      const sp = v.run ? 5.5 : 2.3; v.s -= dt * sp; this._place(dt, sp, -1);
      if (v.s < -1.5) this.gate.forceOpen = false;
      if (v.s < -22) this._next();
    } else if (v.state === 'leave') {
      v.s += dt * 2.0; this._place(dt, 2.0, 1);
      if (v.s > 18) this._next();
    }
  }
  _next() {
    if (this.v) this.g.scene.remove(this.v.ch.root);
    this.v = null; this.n++; this.wait = 0.8; this.gate.forceOpen = false; this._render();
  }
  stop(early) {
    if (!this.active) return;
    const g = this.g, st = this.stats;
    if (this.v) g.scene.remove(this.v.ch.root);
    this.v = null; this.active = false; this.gate.forceOpen = false; this.el.classList.add('hidden');
    if (g.player.seat) g.player.standUp();
    if (early && this.n < SHIFT) { g.hud.toast(`提早下班：擋下 ${st.blocked} 位怪人`, 'good', 2200); return; }
    this.shifts++; this.best = Math.max(this.best, st.ok);
    g.earn(PAY, '側門警衛值班');
    const perfect = st.wrong === 0;
    g.hud.bigToast(perfect ? '🛡️ 門禁滴水不漏！' : '門禁任務結束', `判斷正確 ${st.ok}/${SHIFT}・擋下怪人 ${st.blocked} 位${st.leaked ? `・漏網 ${st.leaked} 位` : ''}　值班薪水 NT$ ${PAY}${perfect ? '・全對獎勵 +3 票' : ''}`, 4200);
    if (perfect) { g.audio.fanfare(); g.addVotes(3); }
  }
  // camera inside the booth, over the guard's shoulder, looking out at the visitor at the barrier
  camera(cam, dt) {
    const gt = this.gate, k = gt.k;
    const [cx, cz] = k.w(gt.W * 0.62, gt.D - 0.3), [lx, lz] = this._at(2.4, 0);
    const cy = surfaceAt(cx, cz) + 2.05, ly = surfaceAt(lx, lz) + 1.25;
    if (!this._cam) this._cam = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    const c = this._cam, f = Math.min(1, dt * 4);
    c.x += (cx - c.x) * f; c.y += (cy - c.y) * f; c.z += (cz - c.z) * f;
    cam.position.set(c.x, c.y, c.z); cam.lookAt(lx, ly, lz);
  }
  _render() {
    const el = this.el;
    if (!this.active) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const v = this.v, st = this.stats, head = `<div class="gp-head">🚧 新中北路側門門禁 <span>${Math.min(this.n + 1, SHIFT)} / ${SHIFT}</span></div>
      <div class="gp-stat">✅ ${st.ok}　🛡️ 擋下怪人 ${st.blocked}　⚠️ 失誤 ${st.wrong}</div>`;
    if (!v || v.state === 'in') { el.innerHTML = `${head  }<div class="gp-wait">${v ? '有人走過來了…' : '等待下一位訪客…'}</div><div class="gp-foot"><kbd>E</kbd> 提早下班</div>`; return; }
    const d = v.d, decided = v.state !== 'wait';
    el.innerHTML = `${head  }<div class="gp-card"><b>${d.who}</b>
      <p>「${d.line}」</p>
      <div class="gp-row"><span>證件</span><em class="${d.id.startsWith('❌') ? 'bad' : ''}">${d.id}</em></div>
      <div class="gp-row"><span>攜帶物品</span><em>${d.item}</em></div></div>
      ${decided ? `<div class="gp-wait">${v.state === 'pass' ? '柵欄打開，放行中…' : '請他離開中…'}</div>`
        : `<div class="gp-btns"><button data-d="in"><kbd>1</kbd> 放行</button><button data-d="out" class="no"><kbd>2</kbd> 擋下</button></div>`}
      <div class="gp-foot"><kbd>E</kbd> 提早下班</div>`;
  }
}
