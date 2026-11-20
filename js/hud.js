import { pointInPoly } from './collision.js';

const $ = id => document.getElementById(id);
const AREA_C = { park: '#4f7a3a', grass: '#5a8a44', pitch: '#4a8a42', water: '#3b84c4', parking: '#555a62', construction: '#7a6a50', school: '#77766a', commercial: '#6a6964', industrial: '#605e58', farm: '#76804c', dirt: '#86704f', wood: '#3c5e33' };

export class HUD {
  constructor(world) {
    this.world = world;
    this.mm = $('minimap'); this.mmg = this.mm.getContext('2d');
    this.big = $('bigmapCanvas'); this.bigg = this.big.getContext('2d');
    this.scale = 1.3; // px per metre in the prerendered map
    this._prerender();
    this.dialogQueue = []; this.dialogCb = null; this.typing = 0; this.fullText = '';
    this.bigView = { cx: 0, cz: 60, zoom: 0 };
    this.markers = [];
    this.bigOpen = false;
    $('dialog').addEventListener('click', () => this.advanceDialog());
    this._setupBigmapPan();
  }
  _prerender() {
    const B = this.world.bounds, s = this.scale, d = this.world.data;
    const W = Math.ceil((B.maxX - B.minX) * s), H = Math.ceil((B.maxZ - B.minZ) * s);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const X = x => (x - B.minX) * s, Z = z => (z - B.minZ) * s;
    const ring = (pts) => { pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.closePath(); };
    // multipolygon holes (courtyards, track infields) are cut with even-odd fill
    const poly = (pts, holes) => { g.beginPath(); ring(pts); if (holes) holes.forEach(ring); };
    g.fillStyle = '#3d4046'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5c5a52'; for (const r of d.campus) { poly(r); g.fill(); }
    for (const a of d.areas) { const c = AREA_C[a.kind]; if (!c) continue; g.fillStyle = c; poly(a.pts, a.holes); g.fill('evenodd'); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const w of d.waterways) { g.strokeStyle = '#3b84c4'; g.lineWidth = w.w * s; g.beginPath(); w.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.stroke(); }
    for (const r of d.rail) { g.strokeStyle = '#8a7a6a'; g.lineWidth = 3 * s; g.setLineDash([4, 3]); g.beginPath(); r.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.stroke(); g.setLineDash([]); }
    const order = ['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'service', 'living_street', 'residential', 'unclassified', 'tertiary', 'secondary', 'primary'];
    const roads = [...d.roads].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    for (const r of roads) {
      if (r.under) continue; // underpasses are not drawn in 3D either
      const foot = !r.drive;
      g.strokeStyle = foot ? '#8c8778' : r.type === 'primary' ? '#f2d16b' : r.type === 'secondary' || r.type === 'tertiary' ? '#e8e4da' : '#c9c6bd';
      g.lineWidth = Math.max(foot ? 1.2 : 2, r.w * s * (foot ? 0.8 : 1));
      g.beginPath(); r.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.stroke();
    }
    for (const b of d.buildings) {
      g.fillStyle = b.kind === 'campus' ? '#b9a48c' : b.kind === 'dorm' ? '#a99a86' : '#8a8780';
      poly(b.pts, b.holes); g.fill('evenodd');
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
    }
    this.mapCanvas = cv;
  }
  w2m(x, z) { const B = this.world.bounds; return [(x - B.minX) * this.scale, (z - B.minZ) * this.scale]; }

  // ---------- minimap ----------
  drawMinimap(px, pz, camYaw, heading, range, markers, ballots) {
    const g = this.mmg, W = this.mm.width, H = this.mm.height;
    const pxPerM = (W / 2) / range;
    g.save();
    g.fillStyle = '#2b2d33'; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2);
    // map rotates so camera forward is up. Camera forward = (sin yaw, cos yaw) in world (x,z).
    // world z+ is "down" on the map image; rotate so that forward vector points to -y on screen.
    const rot = Math.PI - camYaw;
    g.rotate(-rot);
    const k = pxPerM / this.scale;
    const [mx, my] = this.w2m(px, pz);
    g.drawImage(this.mapCanvas, -mx * k, -my * k, this.mapCanvas.width * k, this.mapCanvas.height * k);
    // ballots
    g.fillStyle = '#ffb300';
    for (const b of ballots) {
      if (b.taken) continue;
      const dx = (b.x - px) * pxPerM, dz = (b.z - pz) * pxPerM;
      if (Math.abs(dx) > W || Math.abs(dz) > H) continue;
      g.fillRect(dx - 3, dz - 3, 6, 6);
    }
    g.restore();
    // markers (clamped to edge)
    for (const mk of markers) {
      let dx = (mk.x - px) * pxPerM, dz = (mk.z - pz) * pxPerM;
      // rotate into screen space
      const c = Math.cos(-rot), s = Math.sin(-rot);
      let sx = dx * c - dz * s, sy = dx * s + dz * c;
      const lim = W / 2 - 12, l = Math.hypot(sx, sy);
      if (l > lim) { sx *= lim / l; sy *= lim / l; }
      g.fillStyle = mk.color || '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.arc(W / 2 + sx, H / 2 + sy, mk.big ? 8 : 6, 0, Math.PI * 2); g.fill(); g.stroke();
      if (mk.icon) { g.fillStyle = '#000'; g.font = '900 10px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(mk.icon, W / 2 + sx, H / 2 + sy + 1); }
    }
    // player arrow
    g.save(); g.translate(W / 2, H / 2);
    g.rotate(-(heading - camYaw));
    g.fillStyle = '#3fa9ff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
    $('compassN').style.transform = `translateX(-50%) rotate(${-rot}rad)`;
  }

  // ---------- big map ----------
  toggleBig(open) {
    this.bigOpen = open ?? !this.bigOpen;
    $('bigmap').classList.toggle('hidden', !this.bigOpen);
    if (this.bigOpen) { this.bigView.cx = this._pp ? this._pp.x : 0; this.bigView.cz = this._pp ? this._pp.z : 0; }
  }
  _setupBigmapPan() {
    let drag = null;
    this.big.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; this.big.setPointerCapture(e.pointerId); });
    this.big.addEventListener('pointermove', e => {
      if (!drag) return; const k = this._bigK || 1;
      this.bigView.cx -= (e.clientX - drag[0]) / k; this.bigView.cz -= (e.clientY - drag[1]) / k; drag = [e.clientX, e.clientY];
    });
    this.big.addEventListener('pointerup', () => drag = null);
    this.big.addEventListener('wheel', e => { this.bigView.zoom = Math.max(-1, Math.min(3, this.bigView.zoom - Math.sign(e.deltaY) * 0.25)); e.preventDefault(); }, { passive: false });
  }
  drawBig(px, pz, heading, markers, ballots) {
    this._pp = { x: px, z: pz };
    if (!this.bigOpen) return;
    const c = this.big, g = this.bigg;
    const W = c.clientWidth, H = c.clientHeight;
    if (c.width !== W * devicePixelRatio) { c.width = W * devicePixelRatio; c.height = H * devicePixelRatio; }
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    g.fillStyle = '#1a1c22'; g.fillRect(0, 0, W, H);
    const B = this.world.bounds;
    const fit = Math.min(W / (B.maxX - B.minX), H / (B.maxZ - B.minZ));
    const k = fit * Math.pow(2, this.bigView.zoom); this._bigK = k;
    const tx = x => W / 2 + (x - this.bigView.cx) * k, tz = z => H / 2 + (z - this.bigView.cz) * k;
    g.drawImage(this.mapCanvas, tx(B.minX), tz(B.minZ), (B.maxX - B.minX) * k, (B.maxZ - B.minZ) * k);
    // labels
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fs = Math.max(10, Math.min(15, k * 9));
    g.font = `800 ${fs}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    for (const [n, it] of Object.entries(this.world.named)) {
      if (it.b && !['campus', 'dorm'].includes(it.b.kind) && n !== '鐘塔') continue;
      if (k < 0.8 && !['資訊管理學系', '張靜愚紀念圖書館', '學生活動中心', '鐘塔', '全人教育村', '中原大學體育館', '良善樓'].includes(n)) continue;
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; g.fillStyle = n === '資訊管理學系' ? '#ffd23f' : '#fff';
      g.strokeText(n, tx(it.x), tz(it.z)); g.fillText(n, tx(it.x), tz(it.z));
    }
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#000';
    g.strokeText('🏮 中原夜市', tx(this.world.nightMarket.x), tz(this.world.nightMarket.z)); g.fillText('🏮 中原夜市', tx(this.world.nightMarket.x), tz(this.world.nightMarket.z));
    for (const b of ballots) { if (b.taken) continue; g.fillStyle = '#ffb300'; g.fillRect(tx(b.x) - 3.5, tz(b.z) - 3.5, 7, 7); }
    for (const mk of markers) { g.fillStyle = mk.color || '#ffd23f'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(tx(mk.x), tz(mk.z), 9, 0, 7); g.fill(); g.stroke(); if (mk.icon) { g.fillStyle = '#000'; g.font = '900 11px system-ui'; g.fillText(mk.icon, tx(mk.x), tz(mk.z) + 1); } }
    g.save(); g.translate(tx(px), tz(pz)); g.rotate(Math.PI - heading);
    g.fillStyle = '#3fa9ff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 5); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  }

  // ---------- texts ----------
  setVotes(n) { $('voteNum').textContent = n; }
  setBallots(n) { $('ballotNum').textContent = n; }
  setMoney(n) { $('moneyNum').textContent = n.toLocaleString('en-US'); }
  setClock(min) { const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); $('clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
  setLocation(t) { if (this._loc !== t) { this._loc = t; $('locName').textContent = t; } }
  setTip(title, html) { $('tipBox').querySelector('.tip-title').textContent = title; $('tipText').innerHTML = html; }
  setPrompt(html) { const p = $('prompt'); if (!html) p.classList.add('hidden'); else { p.innerHTML = html; p.classList.remove('hidden'); } }
  setSpeed(kmh) { const s = $('speedo'); if (kmh === null) s.classList.add('hidden'); else { s.classList.remove('hidden'); $('speedNum').textContent = Math.round(kmh); } }
  setObjective(title, text) {
    const o = $('objective');
    if (!text) { o.classList.add('hidden'); return; }
    o.classList.remove('hidden'); $('objTitle').textContent = title; $('objText').innerHTML = text;
  }
  setTimer(sec) {
    const t = $('objTimer');
    if (sec === null) { t.classList.add('hidden'); return; }
    t.classList.remove('hidden');
    const s = Math.max(0, Math.ceil(sec));
    t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    t.classList.toggle('danger', s <= 10);
  }
  toast(text, kind = 'good', ms = 1800) {
    const el = document.createElement('div'); el.className = 'toast-item ' + kind; el.textContent = text;
    const box = $('toast'); box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), ms);
  }
  bigToast(title, sub = '', ms = 2600) {
    const b = $('bigToast'); $('bigToastTitle').textContent = title; $('bigToastSub').textContent = sub;
    b.classList.remove('hidden'); b.style.animation = 'none'; b.offsetHeight; b.style.animation = '';
    clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.add('hidden'), ms);
  }
  // dialog: lines = [[name, text], ...]
  dialog(lines, cb) {
    this.dialogQueue = lines.slice(); this.dialogCb = cb; this._showNext();
  }
  get inDialog() { return !$('dialog').classList.contains('hidden'); }
  _showNext() {
    const d = $('dialog');
    if (!this.dialogQueue.length) { d.classList.add('hidden'); const cb = this.dialogCb; this.dialogCb = null; cb && cb(); return; }
    const [name, text] = this.dialogQueue.shift();
    d.classList.remove('hidden'); $('dlgName').textContent = name; this.fullText = text; this.typing = 0; $('dlgText').textContent = '';
    this._typeT = performance.now();
  }
  // one press = finish the line if it is still typing, otherwise go to the next line.
  // A second press within 180 ms is ignored, so one click / tap can never skip two lines.
  advanceDialog() {
    const now = performance.now();
    if (now - (this._advAt || 0) < 180) return false;
    this._advAt = now;
    if (this.typing < this.fullText.length) { this.typing = this.fullText.length; $('dlgText').textContent = this.fullText; return true; }
    this._showNext(); return true;
  }
  update(dt) {
    if (this.inDialog && this.typing < this.fullText.length) {
      // wall-clock based: frame dt is capped at 50 ms, which made the text crawl on slower machines
      const now = performance.now(), rdt = Math.min(0.5, (now - (this._typeT || now)) / 1000); this._typeT = now;
      this.typing = Math.min(this.fullText.length, this.typing + Math.max(dt, rdt) * 45);
      $('dlgText').textContent = this.fullText.slice(0, Math.floor(this.typing));
    }
  }
  locationName(x, z) {
    // nearest named building within 60m, else area
    let best = null, bd = 60;
    for (const [n, it] of Object.entries(this.world.named)) {
      if (it.b && !['campus', 'dorm', 'church'].includes(it.b.kind)) continue;
      const d = Math.hypot(it.x - x, it.z - z); if (d < bd) { bd = d; best = n; }
    }
    if (Math.hypot(x - this.world.nightMarket.x, z - this.world.nightMarket.z) < 80) return '中原夜市';
    if (best) return best;
    if (this.world.inCampus(x, z)) return '中原大學';
    const near = this.world.roadGrid.nearest(x, z, s => s[5].name);
    if (near.seg && near.d < 15) return near.seg[5].name;
    return '中壢區';
  }
}
