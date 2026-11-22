// Reads the top-level `const NAME = value` lines of a game file without running the file, so a building's settings can use
// the same numbers the model is built from (and follow them when they change) even when the file does not export them.
// Only plain values work (numbers, strings, arrays, objects, arrow functions of those, Math.*); anything that needs an
// import (THREE, H ...) is skipped.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './env.mjs';

// index just past the statement that starts at i (the `;` at bracket depth 0), skipping strings, templates and comments
function endOfStatement(src, i) {
  let depth = 0;
  for (; i < src.length; i++) {
    const ch = src[i], two = src.slice(i, i + 2);
    if (two === '//') { i = src.indexOf('\n', i); if (i < 0) return src.length; continue; }
    if (two === '/*') { i = src.indexOf('*/', i) + 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { const q = ch; for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++; continue; }
    if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--;
    else if (ch === ';' && depth === 0) return i;
  }
  return src.length;
}
function splitTop(s) {
  const out = []; let depth = 0, last = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === '`') { const q = ch; for (i++; i < s.length && s[i] !== q; i++) if (s[i] === '\\') i++; continue; }
    if (s.slice(i, i + 2) === '//') { const e = s.indexOf('\n', i); i = e < 0 ? s.length : e; continue; }
    if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) { out.push(s.slice(last, i)); last = i + 1; }
  }
  out.push(s.slice(last));
  return out;
}

// readConsts('js/lixing.js') -> { NX: 121.8, RA: 7.4, WW: {...}, ... }; pass `need` to get an error when one of them is missing
export function readConsts(rel, need = []) {
  const src = readFileSync(path.join(ROOT, rel), 'utf8'), out = {};
  const re = /^(?:export\s+)?const\s/gm; let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length, end = endOfStatement(src, start);
    for (const d of splitTop(src.slice(start, end))) {
      const eq = d.match(/^\s*([A-Za-z_$][\w$]*)\s*=(?!=)/); if (!eq) continue;
      const names = Object.keys(out);
      try { out[eq[1]] = new Function(...names, `"use strict"; return (${d.slice(eq[0].length)});`)(...names.map(n => out[n])); } catch { /* needs something that is not a plain value */ }
    }
    re.lastIndex = end;
  }
  const missing = need.filter(n => !(n in out));
  if (missing.length) throw new Error(`${rel}：找不到常數 ${missing.join('、')}（改名了嗎？請更新 tools/floorplan/buildings/ 裡的設定檔）`);
  return out;
}
