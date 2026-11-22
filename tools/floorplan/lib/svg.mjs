// Draws one storey (lib/extract.mjs) as a stand-alone SVG: no scripts, no external fonts, so GitHub shows it as it is.

const FONT = '"PingFang TC","Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei","Heiti TC",sans-serif';
const RAMP = 0.25; // rise / run below this is drawn as a ramp
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => (Math.round(v * 100) / 100).toString();
const chars = (s) => [...String(s)];
const wide = (ch) => ch.charCodeAt(0) > 0x2e7f;
// rough width of a string in em (CJK 1, everything else about half)
export const emWidth = (s) => chars(s).reduce((w, ch) => w + (wide(ch) ? 1 : ch === ' ' ? 0.3 : 0.58), 0);

export const ZONE_STYLES = {
  open: { fill: '#ffe08a', stroke: '#c79a00', name: '可以走進去的房間' },
  void: { fill: 'url(#fp-void)', stroke: '#9db7cc', dash: '4 2', name: '天井（挑空，下面是一樓）' },
  outdoor: { fill: '#dcebd2', stroke: '#9bb58a', name: '天井／戶外地面' },
  solid: { fill: 'url(#fp-solid)', stroke: 'none', name: '實心（不能進去）' },
  note: { fill: 'none', stroke: '#c0392b', dash: '3 2', name: '標示範圍' },
};
const C = { floor: '#f4efe4', stair: '#d6e0ee', ramp: '#e9e6dc', stairLine: '#7f90a8', wall: '#1d1d1f', low: '#6f7c8c', door: '#b5651d', cell: '#e9e9ec', cellLine: '#9a9aa2', text: '#1d1d1f', dim: '#8a8f98' };

export function renderSvg({ sl, cells = [], zones = [], labels = [], frame, meta, opts = {} }) {
  const S = opts.scale || 8, debug = !!opts.debug, legendExtra = opts.legend || [];
  // ---- which way up: quarter turns of the local frame so that north is as close to the top as it gets
  const north = [-Math.sin(frame.ang), -Math.cos(frame.ang)]; // world north (-z) in the local frame
  const turnV = (v, q) => { let [x, z] = v; for (let i = 0; i < q; i++) [x, z] = [-z, x]; return [x, z]; };
  let q = opts.turn; if (q == null) { q = 0; let best = -2; for (let i = 0; i < 4; i++) { const v = turnV(north, i); if (-v[1] > best) { best = -v[1]; q = i; } } }
  const R = (p) => turnV(p, q);

  // ---- extent
  const pts = [];
  for (const w of sl.walls) pts.push(w.a, w.b);
  for (const f of sl.floors) pts.push(...f);
  for (const s of sl.stairs) pts.push(...s.poly);
  for (const l of sl.landings) pts.push(...l.poly);
  for (const z of zones) pts.push(...zonePoly(z));
  for (const l of labels) { pts.push([l.x, l.z]); if (l.leader) pts.push(l.leader); }
  if (opts.bounds) { const b = opts.bounds; pts.length = 0; pts.push([b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]); }
  if (!pts.length) pts.push([0, 0], [10, 10]);
  const rp = pts.map(R), pad = opts.pad ?? 2.5;
  const bx0 = Math.min(...rp.map(p => p[0])) - pad, bx1 = Math.max(...rp.map(p => p[0])) + pad, bz0 = Math.min(...rp.map(p => p[1])) - pad, bz1 = Math.max(...rp.map(p => p[1])) + pad;
  const HEAD = 62, AX = 16, planW = (bx1 - bx0) * S, planH = (bz1 - bz0) * S;
  const W = Math.max(Math.ceil(planW + AX + 12), 640), X0 = AX + (W - AX - 12 - planW) / 2 + 0, Y0 = HEAD + AX;
  const P = (p) => { const r = R(p); return [(r[0] - bx0) * S + X0, (r[1] - bz0) * S + Y0]; };
  const V = (v) => R(v); // directions
  const path = (poly) => poly.map((p, i) => { const s = P(p); return `${i ? 'L' : 'M'}${n(s[0])} ${n(s[1])}`; }).join('') + 'Z';
  const sbox = (r) => { const c = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(P), xs = c.map(v => v[0]), ys = c.map(v => v[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };

  const out = [], used = new Set();
  const text = (x, y, s, o = {}) => {
    const size = o.size || 9, lines = String(s).split('\n'), lh = size * 1.18, a = `font-size="${n(size)}" fill="${o.fill || C.text}"${o.bold ? ' font-weight="700"' : ''} text-anchor="${o.anchor || 'middle'}"${o.halo === false ? '' : ` stroke="${o.haloFill || '#ffffff'}" stroke-width="${n(o.haloW ?? size * 0.28)}" stroke-linejoin="round" paint-order="stroke"`}`;
    if (o.rot) return `<text ${a} transform="translate(${n(x)} ${n(y)}) rotate(${o.rot})" dominant-baseline="central">${esc(lines.join(' '))}</text>`;
    if (o.vertical) { const cs = chars(lines.join('')), h0 = y - (cs.length - 1) * lh * 0.5; return `<text ${a} dominant-baseline="central">${cs.map((ch, i) => `<tspan x="${n(x)}" y="${n(h0 + i * lh)}">${esc(ch)}</tspan>`).join('')}</text>`; }
    const y0 = y - (lines.length - 1) * lh / 2;
    return `<text ${a} dominant-baseline="central">${lines.map((l, i) => `<tspan x="${n(x)}" y="${n(y0 + i * lh)}">${esc(l)}</tspan>`).join('')}</text>`;
  };
  // the biggest way a string fits a box: across, or one character under another (digits turned sideways)
  const fit = (s, w, h, max = 9.5, min = 4.5) => {
    const em = emWidth(s), cs = chars(s).length, across = Math.min(max, (w - 2) / em, (h - 2) / 1.2), ascii = !chars(s).some(wide);
    const down = ascii ? Math.min(max, (h - 2) / em, (w - 2) / 1.2) : Math.min(max, (h - 2) / (cs * 1.18), (w - 2) / 1.05);
    return across >= down || across >= max - 0.01 ? { size: Math.max(min, across) } : ascii ? { size: Math.max(min, down), rot: -90 } : { size: Math.max(min, down), vertical: true };
  };

  // ---- zones under the floor that have no floor of their own are still drawn after it, so the order is simply: floor, zones
  out.push('<g id="floor">');
  for (const f of sl.floors) out.push(`<path d="${path(f)}" fill="${C.floor}" stroke="${C.floor}" stroke-width="0.8"/>`);
  out.push('</g><g id="zones">');
  for (const z of zones) { const st = ZONE_STYLES[z.style] || ZONE_STYLES.note; used.add(z.style in ZONE_STYLES ? z.style : 'note'); out.push(`<path d="${path(zonePoly(z))}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="0.8"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}/>`); }
  out.push('</g>');

  // ---- closed rooms: tint, partitions (dashed: they are not in the model), name
  if (cells.length) {
    out.push('<g id="closed-rooms">'); used.add('cell');
    for (const c of cells) out.push(`<path d="${path([[c.x0, c.z0], [c.x1, c.z0], [c.x1, c.z1], [c.x0, c.z1]])}" fill="${C.cell}" stroke="${C.cellLine}" stroke-width="0.6" stroke-dasharray="2.2 1.6"/>`);
    out.push('</g>');
  }

  // ---- stairs: landings, flights with treads and an arrow to the high end
  out.push('<g id="stairs">');
  if (sl.landings.length) used.add('stair');
  for (const l of sl.landings) out.push(`<path d="${path(l.poly)}" fill="${C.stair}" stroke="${C.stairLine}" stroke-width="0.4"/>`);
  sl.stairs.forEach((s, i) => {
    const d = s.dir, ts = s.poly.map(p => p[0] * d[0] + p[1] * d[1]), us = s.poly.map(p => -p[0] * d[1] + p[1] * d[0]);
    const t0 = Math.min(...ts), t1 = Math.max(...ts), u0 = Math.min(...us), u1 = Math.max(...us), um = (u0 + u1) / 2;
    const at = (t, u) => [t * d[0] - u * d[1], t * d[1] + u * d[0]];
    const id = `fp-st${i}`, steps = Math.max(2, Math.round((t1 - t0) / 0.3));
    if (s.slope < RAMP) { used.add('ramp'); out.push(`<path d="${path(s.poly)}" fill="${C.ramp}" stroke="${C.stairLine}" stroke-width="0.4"/>`); } // gentle: a ramp or a raked floor, no treads
    else {
      used.add('stair'); out.push(`<clipPath id="${id}"><path d="${path(s.poly)}"/></clipPath><path d="${path(s.poly)}" fill="${C.stair}" stroke="${C.stairLine}" stroke-width="0.5"/>`);
      let dd = ''; for (let j = 1; j < steps; j++) { const t = t0 + (t1 - t0) * j / steps, a = P(at(t, u0)), b = P(at(t, u1)); dd += `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`; }
      out.push(`<path d="${dd}" stroke="${C.stairLine}" stroke-width="0.35" fill="none" clip-path="url(#${id})"/>`);
    }
    const a = P(at(t0 + 0.25, um)), b = P(at(t1 - 0.25, um)), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > 6) { const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, hs = 2.6; out.push(`<path d="M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}M${n(b[0] - ux * hs * 1.6 - uy * hs)} ${n(b[1] - uy * hs * 1.6 + ux * hs)}L${n(b[0])} ${n(b[1])}L${n(b[0] - ux * hs * 1.6 + uy * hs)} ${n(b[1] - uy * hs * 1.6 - ux * hs)}" stroke="#2c4a73" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${n(a[0])}" cy="${n(a[1])}" r="1.1" fill="#2c4a73"/>`); }
  });
  out.push('</g>');

  // ---- walls
  const seg = (list) => list.map(w => { const a = P(w.a), b = P(w.b); return `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`; }).join('');
  const low = sl.walls.filter(w => w.kind === 'low'), full = sl.walls.filter(w => w.kind === 'wall');
  if (low.length) { used.add('low'); out.push(`<path id="low-walls" d="${seg(low)}" stroke="${C.low}" stroke-width="1.1" fill="none" stroke-linecap="square"/>`); }
  if (full.length) { used.add('wall'); out.push(`<path id="walls" d="${seg(full)}" stroke="${C.wall}" stroke-width="${n(Math.max(1.6, 0.24 * S))}" fill="none" stroke-linecap="square"/>`); }

  // ---- doors (closed door leaves on a wall)
  const doors = sl.texts.filter(t => t.door);
  if (doors.length) {
    used.add('door'); let dd = '';
    for (const t of doors) { const a = P([t.x + t.nz * t.w / 2, t.z - t.nx * t.w / 2]), b = P([t.x - t.nz * t.w / 2, t.z + t.nx * t.w / 2]); dd += `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`; }
    out.push(`<path id="doors" d="${dd}" stroke="${C.door}" stroke-width="${n(Math.max(2.2, 0.34 * S))}" fill="none"/>`);
  }

  // ---- names
  out.push(`<g id="labels" font-family='${FONT}'>`);
  for (const c of cells) { if (!c.text) continue; const b = sbox(c), f = fit(c.text, b.w, b.h, opts.cellFont || 9.5); out.push(text(b.x + b.w / 2, b.y + b.h / 2, c.text, { ...f, haloFill: C.cell })); }
  for (const z of zones) { if (!z.label) continue; const pl = zonePoly(z).map(P), xs = pl.map(p => p[0]), ys = pl.map(p => p[1]), w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const lines = String(z.label).split('\n'), em = Math.max(...lines.map(emWidth));
    if (z.size || (em * 6 <= w - 2 && lines.length * 7 <= h - 2)) out.push(text(cx, cy, z.label, { size: z.size || Math.min(z.max || 11, (w - 4) / em, (h - 4) / (lines.length * 1.2)), bold: z.bold }));
    else out.push(text(cx, cy, lines.join(''), { ...fit(lines.join(''), w, h, z.max || 9.5), bold: z.bold })); }
  for (const l of labels) {
    const p = P([l.x, l.z]);
    if (l.leader) { const e = P(l.leader); out.push(`<path d="M${n(p[0])} ${n(p[1])}L${n(e[0])} ${n(e[1])}" stroke="${l.color || '#555b66'}" stroke-width="0.6" fill="none"/><circle cx="${n(e[0])}" cy="${n(e[1])}" r="1.2" fill="${l.color || '#555b66'}"/>`); }
    let py = p[1], px = p[0]; const size = l.size || 9;
    if (l.leader) { const e = P(l.leader), lines = String(l.text).split('\n').length; if (Math.abs(e[1] - p[1]) >= Math.abs(e[0] - p[0])) py += (e[1] > p[1] ? -1 : 1) * (lines * size * 0.6 + 1); }
    out.push(text(px, py, l.text, { size, bold: l.bold, fill: l.color, vertical: l.vertical, rot: l.rot, anchor: l.anchor }));
  }
  if (debug) for (const t of sl.texts) { const p = P([t.x, t.z]); out.push(`<circle cx="${n(p[0])}" cy="${n(p[1])}" r="1" fill="#e11"/>` + text(p[0], p[1] - 4, `${t.text}${t.door ? '▯' : ''}`, { size: 4.5, fill: '#c00', halo: false })); }
  out.push('</g>');

  // ---- local coordinates along the top and the left (every 10 m), for checking against the code
  const ax = [`<g id="axes" font-family='${FONT}' font-size="6.5" fill="${C.dim}" stroke="none">`];
  {
    const lx0 = Math.min(...pts.map(p => p[0])), lx1 = Math.max(...pts.map(p => p[0])), lz0 = Math.min(...pts.map(p => p[1])), lz1 = Math.max(...pts.map(p => p[1])), step = opts.tick || 10;
    const names = q % 2 === 0 ? ['x', 'z'] : ['z', 'x'];
    for (const [name, lo, hi] of [['x', lx0, lx1], ['z', lz0, lz1]]) for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-6; v += step) {
      const p = P(name === 'x' ? [v, lz0] : [lx0, v]);
      if (name === names[0]) ax.push(`<path d="M${n(p[0])} ${n(Y0 - 4)}v4" stroke="${C.dim}" stroke-width="0.5"/><text x="${n(p[0])}" y="${n(Y0 - 6)}" text-anchor="middle">${n(v)}</text>`);
      else ax.push(`<path d="M${n(X0 - 4)} ${n(p[1])}h4" stroke="${C.dim}" stroke-width="0.5"/><text x="${n(X0 - 6)}" y="${n(p[1])}" text-anchor="end" dominant-baseline="central">${n(v)}</text>`);
    }
    ax.push(`<text x="${n(X0 + planW)}" y="${n(Y0 - 6)}" text-anchor="end">本地座標 ${names[0]}（公尺）</text><text transform="translate(${n(X0 - 9)} ${n(Y0 + planH)}) rotate(-90)" text-anchor="start">本地座標 ${names[1]}（公尺）</text>`);
  }
  ax.push('</g>');

  // ---- legend, scale bar, north arrow
  const items = [];
  if (used.has('wall')) items.push(['line', C.wall, 2.2, '牆（擋住人的）']);
  if (used.has('low')) items.push(['line', C.low, 1.1, '矮牆／欄杆／女兒牆']);
  if (sl.floors.length) items.push(['box', C.floor, '#cfc8b8', '可以走的地板']);
  if (used.has('stair')) items.push(['stair', C.stair, C.stairLine, '樓梯（箭頭指向高的那一頭）']);
  if (used.has('ramp')) items.push(['box', C.ramp, C.stairLine, '斜坡／斜的地面（箭頭指向高的那一頭）']);
  if (used.has('door')) items.push(['line', C.door, 3, '關著的門']);
  if (used.has('cell')) items.push(['cell', C.cell, C.cellLine, '進不去的房間（模型只有門；虛線隔間依門的位置推算）']);
  for (const k of Object.keys(ZONE_STYLES)) if (used.has(k) && k !== 'note') items.push(['zone', k, null, (opts.zoneNames && opts.zoneNames[k]) || ZONE_STYLES[k].name]);
  for (const e of legendExtra) items.push(['text', null, null, e]);
  const LY = Y0 + planH + 14, leg = [`<g id="legend" font-family='${FONT}' font-size="9" fill="${C.text}">`];
  let lx = X0, ly = LY;
  const barM = opts.bar || (S * 20 <= 220 ? 20 : 10), compassW = 60, legendRight = W - 12;
  for (const [kind, a, b, label] of items) {
    const w = (kind === 'text' ? 0 : 22) + emWidth(label) * 9 + 14;
    if (lx + w > legendRight && lx > X0) { lx = X0; ly += 16; }
    if (kind === 'line') leg.push(`<path d="M${n(lx)} ${n(ly)}h16" stroke="${a}" stroke-width="${b}"/>`);
    else if (kind === 'box') leg.push(`<rect x="${n(lx)}" y="${n(ly - 5)}" width="16" height="10" fill="${a}" stroke="${b}" stroke-width="0.6"/>`);
    else if (kind === 'cell') leg.push(`<rect x="${n(lx)}" y="${n(ly - 5)}" width="16" height="10" fill="${a}" stroke="${b}" stroke-width="0.6" stroke-dasharray="2.2 1.6"/>`);
    else if (kind === 'stair') leg.push(`<rect x="${n(lx)}" y="${n(ly - 5)}" width="16" height="10" fill="${a}" stroke="${b}" stroke-width="0.5"/><path d="M${n(lx + 4)} ${n(ly - 5)}v10M${n(lx + 8)} ${n(ly - 5)}v10M${n(lx + 12)} ${n(ly - 5)}v10" stroke="${b}" stroke-width="0.35"/>`);
    else if (kind === 'zone') { const st = ZONE_STYLES[a]; leg.push(`<rect x="${n(lx)}" y="${n(ly - 5)}" width="16" height="10" fill="${st.fill}" stroke="${st.stroke === 'none' ? '#999' : st.stroke}" stroke-width="0.6"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}/>`); }
    leg.push(`<text x="${n(lx + (kind === 'text' ? 0 : 21))}" y="${n(ly)}" dominant-baseline="central">${esc(label)}</text>`);
    lx += w;
  }
  ly += 22;
  // scale bar
  { const x = X0, w = barM * S, half = w / 2; leg.push(`<g id="scale"><rect x="${n(x)}" y="${n(ly)}" width="${n(half)}" height="4" fill="${C.wall}"/><rect x="${n(x + half)}" y="${n(ly)}" width="${n(half)}" height="4" fill="#fff" stroke="${C.wall}" stroke-width="0.6"/><rect x="${n(x)}" y="${n(ly)}" width="${n(w)}" height="4" fill="none" stroke="${C.wall}" stroke-width="0.6"/>`
    + `<text x="${n(x)}" y="${n(ly + 13)}" text-anchor="middle">0</text><text x="${n(x + half)}" y="${n(ly + 13)}" text-anchor="middle">${barM / 2}</text><text x="${n(x + w)}" y="${n(ly + 13)}" text-anchor="middle">${barM} 公尺</text>`
    + `<text x="${n(x + w + 34)}" y="${n(ly + 4)}" fill="${C.dim}">比例尺：1 公尺 = ${n(S)} 像素${meta.cut ? `　切面：地板上方 ${n(meta.cut)} 公尺` : ''}${meta.level != null ? `　樓層地板高度：建築基準面上 ${meta.level.toFixed(2)} 公尺` : ''}</text></g>`); }
  leg.push('</g>');
  const Hh = ly + 26;
  // north arrow (top right of the header)
  const nv = V(north), cx = W - 34, cy = 32, r = 17, deg = Math.atan2(nv[0], -nv[1]) * 180 / Math.PI;
  const compass = `<g id="north" font-family='${FONT}'><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${C.dim}" stroke-width="0.8"/><g transform="rotate(${n(deg)} ${cx} ${cy})"><path d="M${cx} ${cy - r + 2}L${cx + 5} ${cy + 6}L${cx} ${cy + 2}L${cx - 5} ${cy + 6}Z" fill="${C.wall}"/></g><text x="${cx - r - 5}" y="${cy}" font-size="11" font-weight="700" text-anchor="end" dominant-baseline="central" fill="${C.text}">北</text><text x="${cx}" y="${cy + r + 9}" font-size="6.5" text-anchor="middle" fill="${C.dim}">${Math.abs(deg) < 0.05 ? '正上方' : `偏${deg > 0 ? '右' : '左'} ${Math.abs(deg).toFixed(1)}°`}</text></g>`;

  const sub = [meta.note, meta.date && `產生日期：${meta.date}`, meta.source && `來源：${meta.source}`].filter(Boolean).join('　·　');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${n(Hh)}" viewBox="0 0 ${W} ${n(Hh)}" role="img" aria-label="${esc(meta.title)}">
<title>${esc(meta.title)}</title>
<desc>${esc(sub)}</desc>
<defs>
<pattern id="fp-solid" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#dcdcdf"/><path d="M0 0v5" stroke="#a9a9b0" stroke-width="1.2"/></pattern>
<pattern id="fp-void" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#eef5fb"/><circle cx="3.5" cy="3.5" r="0.7" fill="#a9c3d8"/></pattern>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<g id="header" font-family='${FONT}'><text x="${n(X0)}" y="26" font-size="18" font-weight="700" fill="${C.text}">${esc(meta.title)}</text><text x="${n(X0)}" y="45" font-size="10" fill="#5a6070">${esc(sub)}</text></g>
${compass}
${ax.join('')}
${out.join('\n')}
${leg.join('\n')}
</svg>
`;
}

function zonePoly(z) { return z.poly || [[z.x0, z.z0], [z.x1, z.z0], [z.x1, z.z1], [z.x0, z.z1]]; }
