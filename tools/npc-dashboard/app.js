// NPC 儀表板（開發用）：看每個 NPC 的全身樣子和人物設定，新增自訂 NPC（外觀用文字描述、照片取色或細部調整）。
// 讀寫 data/npcs.json（透過 vite.config.js npcDashboardPlugin 的 /__dev/npcs（npm run dev），只接受本機）；全身模型直接用遊戲的 src/entities/Character.js 畫，
// 內建 NPC 的外觀從 src/ 底下各自的模組匯入（跟遊戲裡一模一樣）。自訂 NPC 在遊戲裡由 src/entities/npcs/CustomNPCs.js 放到出沒地點。
import * as THREE from 'three';
import { createCharacter } from '../../src/entities/Character.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const toast = (t) => { const e = $('toast'); e.textContent = t; e.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.add('hidden'), 2600); };

// ---------------------------------------------------------------- built-in NPCs: the same figures as in the game
const BUILTIN = {
  yanlin: async () => createCharacter({ ...(await import('../../src/entities/Player.js')).YANLIN_LOOK }),
  xiaoan: async () => createCharacter((await import('../../src/systems/MissionSystem.js')).MANAGER),
  azhe: async () => createCharacter((await import('../../src/systems/MissionSystem.js')).SENIOR),
  zz: async () => createCharacter((await import('../../src/ui/phone/Friends.js')).ZZ_LOOK),
  gd: async () => createCharacter((await import('../../src/ui/phone/Friends.js')).GD_LOOK),
  hank: async () => createCharacter((await import('../../src/entities/npcs/Hank.js')).HANK_LOOK),
  ...Object.fromEntries(['qi', 'xuan', 'yu'].map(id => ['club_' + id, async () => (await import('../../src/entities/npcs/ClubMembers.js')).createMember(id)])), // 古箏社社員
  garry: async () => (await import('../../src/entities/npcs/Garry.js')).createGarry(),
  laoda: async () => (await import('../../src/entities/Pilot.js')).createPilot(),
  jianyu: async () => createCharacter((await import('../../src/entities/npcs/Jianyu.js')).JIANYU_LOOK),
  mingshan: async () => createCharacter((await import('../../src/entities/npcs/Mingshan.js')).MINGSHAN_LOOK),
  yeeming: async () => createCharacter((await import('../../src/entities/npcs/Yeeming.js')).YEEMING_LOOK),
  xiaoyun: async () => {
    const { dressCrew, CREW_SHIRT } = await import('../../src/systems/minigames/McUniform.js');
    const ch = createCharacter({ skin: '#efd0b5', shirt: CREW_SHIRT, shorts: '#1b1b1d', pants: true, hair: '#1a1410', hairStyle: 'pony', face: true, shoes: '#222' });
    dressCrew(ch, { name: '小芸' }); return ch;
  },
};
// a custom NPC's figure from its look (+ height)
const buildCustom = (n) => { const ch = createCharacter({ face: true, ...n.look }); ch.root.scale.y = n.height || 1; return ch; };
const buildNpc = async (n) => (n.kind === 'builtin' ? BUILTIN[n.ref]?.() : buildCustom(n));

const DEFAULT_LOOK = { skin: '#ecc8a6', hair: '#151313', hairStyle: 'short', shirt: '#f2f2ee', shorts: '#2b3a55', pants: true, shoes: '#f2f2ee', glasses: false, face: true };

// ---------------------------------------------------------------- rendering
function stage() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffaf0', '#8a7a64', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 1.9); sun.position.set(2.5, 4, 3.5); scene.add(sun);
  const fill = new THREE.DirectionalLight('#cfe0ff', 0.6); fill.position.set(-3, 2, -2); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.12 }));
  floor.position.y = 0.002; scene.add(floor);
  return scene;
}
// portraits: one offscreen renderer, every figure drawn once into an image
let shotR = null;
function portrait(ch) {
  if (!shotR) { shotR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); shotR.setSize(360, 540); shotR.outputColorSpace = THREE.SRGBColorSpace; }
  const scene = stage(); scene.add(ch.root); ch.root.rotation.y = 0.35; ch.update?.(0.016, { speed: 0 });
  const h = 1.8 * (ch.root.scale.y || 1), cam = new THREE.PerspectiveCamera(30, 360 / 540, 0.1, 50);
  cam.position.set(0, h * 0.53, 3.9); cam.lookAt(0, h * 0.5, 0);
  shotR.setClearColor(0x000000, 0); shotR.render(scene, cam);
  return shotR.domElement.toDataURL('image/png');
}
// the live viewer (detail and editor): drag to turn, wheel to zoom, idle animation
class Viewer {
  constructor(el) {
    this.el = el; this.r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); this.r.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.r.domElement); this.scene = stage(); this.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.yaw = 0.35; this.dist = 4.6; this.ch = null; this.on = false; this.last = 0;
    let drag = null;
    el.addEventListener('pointerdown', (e) => { drag = e.clientX; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (drag == null) return; this.yaw += (e.clientX - drag) * 0.012; drag = e.clientX; });
    el.addEventListener('pointerup', () => { drag = null; });
    el.addEventListener('wheel', (e) => { this.dist = Math.max(2, Math.min(7, this.dist + Math.sign(e.deltaY) * 0.3)); e.preventDefault(); }, { passive: false });
  }
  set(ch) { if (this.ch) this.scene.remove(this.ch.root); this.ch = ch; if (ch) this.scene.add(ch.root); }
  start() { if (this.on) return; this.on = true; const loop = (t) => { if (!this.on) return; this.frame(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  stop() { this.on = false; }
  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0.016); this.last = t;
    const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
    if (this.r.domElement.width !== w * devicePixelRatio) { this.r.setPixelRatio(devicePixelRatio); this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    if (this.ch) { this.ch.root.rotation.y = this.yaw; this.ch.update?.(dt, { speed: 0 }); }
    const ht = 1.8 * (this.ch?.root.scale.y || 1);
    this.cam.position.set(0, ht * 0.55, this.dist); this.cam.lookAt(0, ht * 0.5, 0);
    this.r.render(this.scene, this.cam);
  }
}

// ---------------------------------------------------------------- data
let REG = { places: {}, npcs: [] }, DEV = false, filter = 'all';
const shots = new Map(); // id -> data URL
async function load() {
  REG = await (await fetch('../../data/npcs.json', { cache: 'no-store' })).json();
  try { DEV = (await (await fetch('/__dev/ping', { cache: 'no-store' })).json()).ok === true; } catch { DEV = false; }
  $('devWarn').classList.toggle('hidden', DEV);
  render();
  for (const n of REG.npcs) await shoot(n);
}
async function shoot(n) {
  try { const ch = await buildNpc(n); if (ch) shots.set(n.id, portrait(ch)); } catch (e) { console.warn('畫不出來', n.id, e); shots.set(n.id, ''); }
  const img = document.querySelector(`.card[data-id="${n.id}"] .pic`); if (img) img.innerHTML = picHTML(n);
}
async function save() {
  if (!DEV) { toast('要在開發伺服器上才能存檔'); return false; }
  const res = await fetch('/__dev/npcs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(REG) });
  const j = await res.json().catch(() => ({})); if (!res.ok) { toast('存檔失敗：' + (j.error || res.status)); return false; }
  return true;
}

// ---------------------------------------------------------------- grid
const picHTML = (n) => shots.has(n.id) ? (shots.get(n.id) ? `<img src="${shots.get(n.id)}" alt="">` : '<div class="spin">（畫不出來）</div>') : '<div class="spin">繪製中…</div>';
const badges = (n) => `<div class="badges">${n.kind === 'builtin' ? '<span class="badge">遊戲內建</span>' : `<span class="badge custom">自訂</span>${n.enabled === false ? '<span class="badge off">未放進遊戲</span>' : ''}`}${n.friend ? '<span class="badge friend">可加好友</span>' : ''}</div>`;
function render() {
  const q = $('search').value.trim();
  const list = REG.npcs.filter(n => (filter === 'all' || (filter === 'friend' ? n.friend : n.kind === filter)) && (!q || JSON.stringify(n).includes(q)));
  $('count').textContent = `${list.length} / ${REG.npcs.length} 位 NPC`;
  $('grid').innerHTML = list.map(n => `<article class="card" data-id="${n.id}"><div class="pic">${picHTML(n)}</div>
    <div class="meta"><b>${esc(n.name)}</b> <span class="t">${esc(n.title)}</span>${badges(n)}<p>${esc(n.personality)}</p></div></article>`).join('');
  document.querySelectorAll('.card').forEach(c => c.onclick = () => openDetail(REG.npcs.find(n => n.id === c.dataset.id)));
}
$('search').oninput = render;
document.querySelectorAll('.filters [data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; document.querySelectorAll('.filters [data-f]').forEach(x => x.classList.toggle('on', x === b)); render(); });

// ---------------------------------------------------------------- detail
let dView = null;
async function openDetail(n) {
  $('detail').classList.remove('hidden');
  dView ||= new Viewer($('detailViewer')); dView.yaw = 0.35; dView.set(await buildNpc(n)); dView.start();
  const row = (k, v) => v && (Array.isArray(v) ? v.length : true) ? `<dt>${k}</dt><dd>${esc(Array.isArray(v) ? v.join('、') : v)}</dd>` : '';
  const talks = (n.talks || []).map(t => t.map(([w, s]) => `<div><b>${esc(w)}</b>：${esc(s)}</div>`).join('')).join('<hr>');
  $('profile').innerHTML = `<h2>${esc(n.name)}</h2><div class="t">${esc(n.title)}${n.dept ? '・' + esc(n.dept) : ''}${n.gender ? '・' + esc(n.gender) : ''}</div>${badges(n)}
    <dl>${row('個性', n.personality)}${row('興趣', n.interests)}${row('喜歡', n.likes)}${row('口頭禪', n.catchphrase)}${row('背景', n.background)}${row('人際關係', n.relations)}
    ${row('出沒地點', n.kind === 'custom' ? n.place : n.where)}${row('作息', n.schedule)}</dl>
    ${talks ? `<h4>對話</h4><div class="talks">${talks}</div>` : ''}
    ${n.kind === 'builtin' ? `<p class="src">程式在：${(n.sources || []).map(s => `<code>${esc(s)}</code>`).join('')}<br><small class="note">內建 NPC 的外觀和行為寫在程式裡，要改請 Claude 改這些檔案（人物設定可以直接改 data/npcs.json）。</small></p>`
      : `<div class="acts"><button data-a="edit">✏️ 編輯</button><button data-a="toggle">${n.enabled === false ? '▶ 放進遊戲' : '⏸ 先不放進遊戲'}</button><button data-a="brief">📋 複製需求單給 Claude</button><button data-a="del" class="danger">🗑 刪除</button></div>`}`;
  $('profile').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const a = b.dataset.a;
    if (a === 'edit') { closeAll(); openEditor(n); }
    else if (a === 'brief') { await navigator.clipboard.writeText(brief(n)); toast('需求單已複製，可以直接貼給 Claude'); }
    else if (a === 'toggle') { n.enabled = n.enabled === false; if (await save()) { toast(n.enabled ? '已放進遊戲（重新整理遊戲生效）' : '已從遊戲拿掉'); openDetail(n); render(); } }
    else if (a === 'del') { if (!confirm(`確定刪除「${n.name}」？`)) return; REG.npcs = REG.npcs.filter(x => x !== n); if (await save()) { toast('已刪除'); closeAll(); render(); } }
  });
}
function closeAll() { for (const id of ['detail', 'editor']) $(id).classList.add('hidden'); dView?.stop(); eView?.stop(); }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeAll);
for (const id of ['detail', 'editor']) $(id).addEventListener('click', (e) => { if (e.target.id === id) closeAll(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

// a request sheet to paste to Claude (special behaviour needs code)
function brief(n) {
  return `請幫我在「中原順起來」加入這個 NPC（資料已經在 data/npcs.json，id: ${n.id}）：
名字：${n.name}（${n.title || ''}${n.dept ? '，' + n.dept : ''}）
個性：${n.personality || ''}
興趣：${(n.interests || []).join('、')}；喜歡：${n.likes || ''}；口頭禪：${n.catchphrase || ''}
背景：${n.background || ''}
人際關係：${n.relations || ''}
出沒地點：${n.place || ''}；作息：${n.schedule || ''}
外觀（src/entities/Character.js createCharacter 參數）：${JSON.stringify(n.look)}${n.height && n.height !== 1 ? `，身高比例 ${n.height}` : ''}
${n.photo ? `參考照片：${n.photo}\n` : ''}想要的特別行為：（在這裡寫，例如固定作息、店鋪、可以加好友、手機聊天、限時動態…）`;
}

// ---------------------------------------------------------------- editor
let eView = null, cur = null, photoImg = null, pickTarget = 'hair', photoFile = null;
const COLOR_KEYS = [['hair', '頭髮'], ['skin', '皮膚'], ['shirt', '上衣'], ['jacket', '外套'], ['shorts', '褲子'], ['shoes', '鞋子'], ['bag', '包包'], ['glassesColor', '鏡框']];
function openEditor(n) {
  cur = n ? JSON.parse(JSON.stringify(n)) : { id: 'npc_' + Date.now().toString(36), kind: 'custom', enabled: true, name: '', title: '', gender: '男', dept: '', look: { ...DEFAULT_LOOK }, height: 1, talks: [], place: Object.keys(REG.places)[0] };
  $('edTitle').textContent = n ? `編輯 ${n.name}` : '新增 NPC';
  $('editor').classList.remove('hidden');
  const v = (id, val) => { $(id).value = val ?? ''; };
  v('f_name', cur.name); v('f_title', cur.title); v('f_gender', cur.gender || '男'); v('f_dept', cur.dept); v('f_desc', cur.desc);
  v('f_personality', cur.personality); v('f_interests', (cur.interests || []).join('、')); v('f_likes', cur.likes); v('f_catch', cur.catchphrase);
  v('f_background', cur.background); v('f_relations', cur.relations); v('f_schedule', cur.schedule);
  $('f_talks').value = (cur.talks || []).map(t => t.map(([w, s]) => (w === cur.name ? s : `${w}：${s}`)).join('\n')).join('\n\n');
  $('f_place').innerHTML = Object.keys(REG.places).map(p => `<option ${p === cur.place ? 'selected' : ''}>${esc(p)}</option>`).join('');
  $('f_enabled').checked = cur.enabled !== false;
  $('parseLog').innerHTML = ''; $('edMsg').textContent = '';
  photoImg = null; photoFile = null; $('photoCv').classList.add('hidden'); $('photoEmpty').classList.remove('hidden');
  if (cur.photo) { const im = new Image(); im.onload = () => showPhoto(im); im.src = '../../' + cur.photo + '?t=' + Date.now(); }
  tab('basic'); sub('text');
  eView ||= new Viewer($('edViewer')); eView.yaw = 0.35; eView.start(); refresh();
}
$('btnNew').onclick = () => { closeAll(); openEditor(null); };
const tab = (t) => { document.querySelectorAll('.tabs [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('hidden', x.dataset.tab !== t)); };
const sub = (s) => { document.querySelectorAll('.subtabs [data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); document.querySelectorAll('[data-sub]').forEach(x => x.classList.toggle('hidden', x.dataset.sub !== s)); if (s === 'json') $('f_json').value = JSON.stringify(cur.look, null, 1); };
document.querySelectorAll('.tabs [data-t]').forEach(b => b.onclick = () => tab(b.dataset.t));
document.querySelectorAll('.subtabs [data-s]').forEach(b => b.onclick = () => sub(b.dataset.s));
// rebuild the preview figure (and the fine-tune panel) from cur.look
let rt = 0;
function refresh() {
  clearTimeout(rt); rt = setTimeout(() => { eView.set(buildCustom(cur)); }, 30);
  fine(); document.querySelectorAll('.pick [data-pick]').forEach(b => { const c = cur.look[b.dataset.pick]; b.innerHTML = `${c ? `<i style="background:${c}"></i>` : ''}${b.textContent.replace(/^\s+/, '')}`; });
}

// ---- fine tuning: every createCharacter option as a control
const HAIR = [['short', '短髮'], ['bowl', '西瓜皮／瀏海'], ['long', '長髮'], ['pony', '馬尾'], ['curly', '捲髮'], ['buzz', '平頭'], ['bald', '光頭']];
function fine() {
  const L = cur.look, el = $('fine');
  const col = (k, label, opt) => `<label>${label}<span>${opt ? `<input type="checkbox" data-on="${k}" ${L[k] ? 'checked' : ''}> ` : ''}<input type="color" data-c="${k}" value="${L[k] || '#888888'}"></span></label>`;
  const rng = (k, label, min, max, step, def) => `<label>${label}<input type="range" data-r="${k}" min="${min}" max="${max}" step="${step}" value="${L[k] ?? def}"></label>`;
  el.innerHTML = `<h4>顏色</h4>${col('skin', '皮膚')}${col('hair', '頭髮')}${col('shirt', '上衣')}${col('jacket', '皮衣外套', true)}${col('shorts', '褲子')}${col('shoes', '鞋子')}${col('bag', '後背包', true)}${col('glassesColor', '鏡框')}
    <h4>款式</h4><label>髮型<select data-s="hairStyle">${HAIR.map(([v, t]) => `<option value="${v}" ${(L.hairStyle || 'short') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>褲子<select data-s="pants"><option value="1" ${L.pants ? 'selected' : ''}>長褲</option><option value="0" ${!L.pants ? 'selected' : ''}>短褲</option></select></label>
    <label>上衣款式<select data-s="top"><option value="tee" ${!L.polo && !L.imTee ? 'selected' : ''}>素 T</option><option value="polo" ${L.polo ? 'selected' : ''}>系學會幹部 T（polo）</option><option value="im" ${L.imTee ? 'selected' : ''}>資管系服</option></select></label>
    <label>眼鏡<input type="checkbox" data-b="glasses" ${L.glasses ? 'checked' : ''}></label>
    <label>鏡框<select data-s="glassesStyle"><option value="" ${!L.glassesStyle ? 'selected' : ''}>細圓框</option><option value="browline" ${L.glassesStyle === 'browline' ? 'selected' : ''}>眉框（上粗下細）</option><option value="thick" ${L.glassesStyle === 'thick' ? 'selected' : ''}>黑粗框</option></select></label>
    <label>粗眉<input type="checkbox" data-b="brows" ${L.brows ? 'checked' : ''}></label>
    <label>嚴肅的嘴<input type="checkbox" data-b="mouth" ${L.mouth ? 'checked' : ''}></label>
    <label>山羊鬍<input type="checkbox" data-b="beard" ${L.beard ? 'checked' : ''}></label>
    <h4>體型</h4>${rng('build', '體格', 0.85, 1.3, 0.01, 1)}${rng('belly', '肚子', 0, 1, 0.05, 0)}${rng('height', '身高', 0.9, 1.12, 0.01, 1)}${rng('chin', '下巴尖', 0, 1, 0.05, 0)}${rng('jaw', '下顎寬', 0.9, 1.1, 0.01, 1)}`;
  el.querySelectorAll('[data-c]').forEach(i => i.oninput = () => { const k = i.dataset.c; if (k === 'jacket' || k === 'bag') { L[k] = i.value; el.querySelector(`[data-on="${k}"]`).checked = true; } else L[k] = i.value; refresh(); });
  el.querySelectorAll('[data-on]').forEach(i => i.onchange = () => { const k = i.dataset.on; if (i.checked) L[k] = el.querySelector(`[data-c="${k}"]`).value; else delete L[k]; refresh(); });
  el.querySelectorAll('[data-s]').forEach(i => i.onchange = () => {
    const k = i.dataset.s;
    if (k === 'pants') L.pants = i.value === '1';
    else if (k === 'top') { delete L.polo; delete L.imTee; if (i.value === 'polo') L.polo = true; if (i.value === 'im') L.imTee = true; }
    else if (k === 'glassesStyle' && !i.value) delete L.glassesStyle;
    else L[k] = i.value;
    refresh();
  });
  el.querySelectorAll('[data-b]').forEach(i => i.onchange = () => { const k = i.dataset.b; const on = { glasses: true, brows: 'thick', mouth: 'flat', beard: 'goatee' }[k]; if (i.checked) L[k] = on; else delete L[k]; refresh(); });
  el.querySelectorAll('[data-r]').forEach(i => i.oninput = () => { const k = i.dataset.r, v = +i.value; if (k === 'height') cur.height = v; else L[k] = v; refresh(); });
  const hr = el.querySelector('[data-r="height"]'); if (hr) hr.value = cur.height || 1;
}

// ---- text description -> look
const COLORS = [
  ['海軍藍', '#1d2f55'], ['深藍', '#1d2f55'], ['寶藍', '#1f4fbf'], ['淺藍', '#8fc1ff'], ['天藍', '#7cc4f0'], ['藍', '#2f6bff'],
  ['墨綠', '#1f4d34'], ['深綠', '#1f4d34'], ['軍綠', '#55613a'], ['淺綠', '#9bd5a5'], ['綠', '#2f9e55'],
  ['酒紅', '#7a1f2c'], ['暗紅', '#7a1f2c'], ['粉紅', '#f48fb1'], ['紅', '#c62828'], ['粉', '#f48fb1'],
  ['深灰', '#3a3d42'], ['淺灰', '#c4c6c9'], ['灰', '#8a8d92'], ['黑', '#151515'], ['米白', '#efe7d6'], ['白', '#f2f2ee'],
  ['米', '#e8dcc4'], ['卡其', '#c3a777'], ['咖啡', '#6b4a33'], ['棕', '#7a5230'], ['褐', '#6b4a33'],
  ['紫', '#6a3fa0'], ['黃', '#f2c230'], ['橘', '#ef7d22'], ['金', '#c8a24a'], ['銀', '#c0c4c8'],
];
const HAIR_COL = { 黑: '#121212', 白: '#d8d8d6', 灰: '#8a8a88', 棕: '#4a2e1c', 咖啡: '#4a2e1c', 褐: '#4a2e1c', 金: '#d9b25a', 黃: '#d9b25a', 紅: '#8c2f22', 橘: '#b8502a', 紫: '#4b2a66', 藍: '#24407a', 粉: '#d98aa8', 銀: '#c9ccd0' };
const PARTS = [
  ['jacket', /外套|夾克|皮衣|西裝外套/], ['shirt', /上衣|T恤|t恤|襯衫|polo|POLO|帽T|大學T|衣服|背心|毛衣|球衣/], ['shorts', /長褲|短褲|牛仔褲|西裝褲|運動褲|褲子|褲|裙/],
  ['shoes', /鞋/], ['hair', /頭髮|髮/], ['bag', /後背包|背包|書包|包包|包/], ['glassesColor', /框/],
];
function parseDesc(text) {
  const L = cur.look, did = [];
  const set = (k, v, why) => { L[k] = v; did.push(why); };
  const t = text.replace(/\s+/g, '');
  // skin
  if (/黝黑|皮膚黑|黑皮|古銅|偏黑|曬得很黑/.test(t)) set('skin', '#a8714c', '膚色：黝黑');
  else if (/深色皮膚|膚色很深/.test(t)) set('skin', '#6b4531', '膚色：深');
  else if (/小麥|健康膚色/.test(t)) set('skin', '#d9a77f', '膚色：小麥色');
  else if (/白皙|皮膚白|很白/.test(t)) set('skin', '#f3d6c0', '膚色：白皙');
  // hair style
  const hs = [[/光頭/, 'bald', '光頭'], [/平頭|寸頭|小平頭|短短的頭髮/, 'buzz', '平頭'], [/捲/, 'curly', '捲髮'], [/馬尾/, 'pony', '馬尾'], [/長髮|頭髮很長|長頭髮/, 'long', '長髮'], [/西瓜皮|妹妹頭|瀏海|香菇頭/, 'bowl', '有瀏海'], [/短髮/, 'short', '短髮']].find(([re]) => re.test(t));
  if (hs) set('hairStyle', hs[1], '髮型：' + hs[2]); else if (/女生|女孩|女性/.test(t) && !L.hairStyle) set('hairStyle', 'long', '髮型：長髮（女生預設）');
  // glasses
  if (/黑框|粗框|膠框/.test(t)) { set('glasses', true, '黑粗框眼鏡'); L.glassesStyle = 'thick'; if (!L.glassesColor) L.glassesColor = '#141414'; }
  if (/眉框|半框|上框/.test(t)) { set('glasses', true, '眉框眼鏡'); L.glassesStyle = 'browline'; if (!L.glassesColor) L.glassesColor = '#2b1f1a'; }
  else if (/墨鏡|太陽眼鏡/.test(t)) { set('glasses', true, '戴墨鏡'); L.glassesColor = '#111111'; }
  else if (/眼鏡/.test(t)) set('glasses', true, '戴眼鏡'); else if (/沒戴眼鏡|不戴眼鏡/.test(t)) set('glasses', false, '沒戴眼鏡');
  // tops / bottoms of a known kind
  if (/系學會幹部T|幹部T|polo|POLO|Polo/.test(t)) { L.polo = true; delete L.imTee; did.push('上衣：polo 衫'); }
  if (/系服/.test(t)) { L.imTee = true; delete L.polo; if (!/系服.{0,3}(色)/.test(t)) L.shirt = '#1f4d34'; did.push('上衣：資管系服'); }
  if (/長褲|牛仔褲|西裝褲|運動褲/.test(t)) set('pants', true, '長褲'); else if (/短褲|裙/.test(t)) set('pants', false, '短褲');
  if (/牛仔褲/.test(t)) L.shorts = '#3b5a85';
  if (/外套|夾克|皮衣/.test(t) && !L.jacket) L.jacket = '#151515';
  if (/後背包|背包|書包/.test(t) && !L.bag) L.bag = '#222222';
  // colours: each colour word goes to the nearest garment word after it (黑色的外套), else just before it (外套是黑色)
  const used = new Set();
  const cols = []; for (const [w, hex] of COLORS) { let i = -1; while ((i = t.indexOf(w, i + 1)) >= 0) if (![...used].some(([a, b]) => i >= a && i < b)) { cols.push({ i, w, hex }); used.add([i, i + w.length]); } }
  cols.sort((a, b) => a.i - b.i);
  for (const c of cols) {
    let best = null;
    for (const [k, re] of PARTS) {
      const g = new RegExp(re.source, 'g'); let m;
      while ((m = g.exec(t))) {
        const after = m.index - (c.i + c.w.length), before = c.i - (m.index + m[0].length);
        const d = after >= 0 && after <= 5 ? after : before >= 0 && before <= 4 ? before + 10 : null;
        if (d != null && (!best || d < best.d)) best = { k, d, word: m[0] };
      }
    }
    if (!best) continue;
    if (best.k === 'hair') set('hair', HAIR_COL[c.w[0]] || HAIR_COL[c.w] || c.hex, `髮色：${c.w}`);
    else if (best.k === 'glassesColor') { set('glassesColor', c.hex, `鏡框：${c.w}`); L.glasses = true; }
    else set(best.k, c.hex, `${{ shirt: '上衣', jacket: '外套', shorts: '褲子', shoes: '鞋子', bag: '包包' }[best.k]}：${c.w}`);
  }
  // build / height / face
  if (/壯|肌肉|健身|魁梧|結實/.test(t)) set('build', 1.12, '體格：壯'); else if (/瘦|纖細|苗條/.test(t)) set('build', 0.92, '體格：瘦');
  if (/胖|圓潤|肉肉|圓滾/.test(t)) { set('build', 1.22, '體格：胖胖的'); L.belly = 0.9; L.arm = 1.25; }
  if (/很高|高瘦|高大|身高很高|高個子/.test(t)) { cur.height = 1.06; did.push('身高：高'); } else if (/矮|嬌小|個子小/.test(t)) { cur.height = 0.94; did.push('身高：嬌小'); }
  if (/鬍/.test(t)) set('beard', 'goatee', '山羊鬍');
  if (/粗眉|濃眉/.test(t)) set('brows', 'thick', '粗眉');
  if (/嚴肅|不笑|臭臉|酷酷/.test(t)) set('mouth', 'flat', '嚴肅的嘴');
  if (/尖下巴|瓜子臉|下巴尖/.test(t)) set('chin', 0.7, '尖下巴');
  if (/女生|女孩|女性/.test(t)) cur.gender = '女'; else if (/男生|男孩|男性/.test(t)) cur.gender = '男';
  return did;
}
$('btnParse').onclick = () => {
  cur.desc = $('f_desc').value; const did = parseDesc(cur.desc);
  $('parseLog').innerHTML = did.length ? did.map(d => `<span>${esc(d)}</span>`).join('') : '沒有讀到可以用的外觀描述，試著寫寫看顏色、髮型或穿著。';
  $('f_gender').value = cur.gender; refresh();
};

// ---- photo: automatic colour sampling + click to pick
$('f_photo').onchange = () => {
  const f = $('f_photo').files[0]; if (!f) return; photoFile = f;
  const im = new Image(); im.onload = () => { showPhoto(im); autoPick(); }; im.src = URL.createObjectURL(f);
};
function showPhoto(im) {
  photoImg = im; const cv = $('photoCv'), k = Math.min(1, 640 / im.width, 520 / im.height);
  cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
  cv.getContext('2d', { willReadFrequently: true }).drawImage(im, 0, 0, cv.width, cv.height);
  cv.classList.remove('hidden'); $('photoEmpty').classList.add('hidden');
}
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
// median colour of a box of the photo (fractions of the size); keep(r,g,b) filters the pixels
function sample(x0, y0, x1, y1, keep) {
  const cv = $('photoCv'), g = cv.getContext('2d', { willReadFrequently: true });
  const X0 = Math.floor(x0 * cv.width), Y0 = Math.floor(y0 * cv.height), W = Math.max(1, Math.floor((x1 - x0) * cv.width)), H = Math.max(1, Math.floor((y1 - y0) * cv.height));
  const d = g.getImageData(X0, Y0, W, H).data, px = [];
  for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2]; if (!keep || keep(r, gg, b)) px.push([r, gg, b]); }
  if (!px.length) return null;
  const med = (j) => px.map(p => p[j]).sort((a, b) => a - b)[px.length >> 1];
  return hex(med(0), med(1), med(2));
}
const isSkin = (r, g, b) => r > 95 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15 && Math.abs(r - g) > 12;
function autoPick() {
  if (!photoImg) { toast('先選一張照片'); return; }
  const L = cur.look, got = [];
  const s = (k, ...box) => { const c = sample(...box); if (c) { L[k] = c; got.push(k); } };
  s('hair', 0.42, 0.02, 0.58, 0.07);
  const sk = sample(0.40, 0.08, 0.60, 0.17, isSkin); if (sk) { L.skin = sk; got.push('skin'); }
  s(L.jacket ? 'jacket' : 'shirt', 0.40, 0.28, 0.60, 0.42);
  s('shorts', 0.38, 0.58, 0.62, 0.72);
  s('shoes', 0.30, 0.94, 0.70, 0.99);
  refresh(); toast(`自動取色：${got.length} 個部位。有不準的，選取色目標再點照片修正`);
}
$('btnAuto').onclick = autoPick;
document.querySelectorAll('.pick [data-pick]').forEach(b => b.onclick = () => { pickTarget = b.dataset.pick; document.querySelectorAll('.pick [data-pick]').forEach(x => x.classList.toggle('on', x === b)); });
$('photoCv').onclick = (e) => {
  const cv = $('photoCv'), r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, d = 4 / cv.width;
  const c = sample(x - d, y - d, x + d, y + d); if (!c) return;
  cur.look[pickTarget] = c; if (pickTarget === 'glassesColor') cur.look.glasses = true; refresh();
  toast(`${COLOR_KEYS.find(k => k[0] === pickTarget)?.[1] || pickTarget} → ${c}`);
};
$('btnJson').onclick = () => { try { cur.look = JSON.parse($('f_json').value); refresh(); toast('已套用'); } catch (e) { toast('JSON 格式不對：' + e.message); } };

// ---- save
function talksFrom(text, name) {
  return text.split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^([^：:]{1,8})[：:](.+)$/); return m ? [m[1].trim(), m[2].trim()] : [name, l];
  })).filter(t => t.length);
}
$('btnSave').onclick = async () => {
  const name = $('f_name').value.trim(); if (!name) { tab('basic'); toast('先填名字'); return; }
  Object.assign(cur, {
    name, title: $('f_title').value.trim(), gender: $('f_gender').value, dept: $('f_dept').value.trim(), desc: $('f_desc').value,
    personality: $('f_personality').value.trim(), interests: $('f_interests').value.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
    likes: $('f_likes').value.trim(), catchphrase: $('f_catch').value.trim(), background: $('f_background').value.trim(), relations: $('f_relations').value.trim(),
    talks: talksFrom($('f_talks').value, name), place: $('f_place').value, enabled: $('f_enabled').checked, schedule: $('f_schedule').value.trim(),
  });
  if (!cur.talks.length) cur.talks = [[[name, cur.catchphrase || `嗨，我是${name}！`]]];
  if (photoFile && DEV) {
    const r = await fetch(`/__dev/npc-photo?id=${encodeURIComponent(cur.id)}`, { method: 'POST', headers: { 'Content-Type': photoFile.type }, body: photoFile });
    const j = await r.json().catch(() => ({})); if (r.ok) cur.photo = j.path;
  }
  const i = REG.npcs.findIndex(n => n.id === cur.id);
  if (i >= 0) REG.npcs[i] = cur; else REG.npcs.push(cur);
  if (!(await save())) return;
  $('edMsg').textContent = '已存檔 ✓'; toast(`已存檔：${name}${cur.enabled ? '（重新整理遊戲就會出現在「' + cur.place + '」）' : ''}`);
  const saved = cur; closeAll(); render(); await shoot(saved); openDetail(saved);
};
$('btnBrief').onclick = async () => { await navigator.clipboard.writeText(brief({ ...cur, name: $('f_name').value || cur.name, title: $('f_title').value, personality: $('f_personality').value, place: $('f_place').value })); toast('需求單已複製'); };

load();
