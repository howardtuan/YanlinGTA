#!/usr/bin/env node
// 建築物平面圖：跑遊戲自己的建模程式，從 Interiors 的牆線和地板切出某一層，畫成 SVG。
// 用法、怎麼替別棟建築加設定檔：docs/references/floorplans/README.md
//   node tools/floorplan/make.mjs lixing all
//   node tools/floorplan/make.mjs lixing 2f --out /tmp/x.svg --debug
//   node tools/floorplan/make.mjs lixing --list
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeEnv, ROOT } from './lib/env.mjs';
import { makeFrame, collect, levels, slice, closedCells } from './lib/extract.mjs';
import { renderSvg } from './lib/svg.mjs';

const HELP = `用法：node tools/floorplan/make.mjs <建築> <樓層|all> [選項]
       node tools/floorplan/make.mjs <建築> --list      列出樓層、地板高度分布、讀到的門牌和招牌文字
  <建築>        tools/floorplan/buildings/<建築>.mjs 的檔名（也可以給設定檔的路徑）
  <樓層>        設定檔 floors 裡的 id（例如 1f、2f），或 all
  --out <路徑>  輸出檔（一層）或資料夾（all）；預設 docs/references/floorplans/<建築>/<建築>-<樓層>.svg（每棟建築一個資料夾）
  --title <字>  標題；預設「<建築名稱> <樓層名稱>平面圖」
  --note <字>   標題下的註記；預設用該樓層的 note，沒有就用設定檔的 note
  --date <字>   產生日期；預設今天（本機時間）
  --scale <數>  一公尺幾個像素；預設用設定檔的 scale，再沒有就是 8
  （設定檔的 plan() 回傳 autoLabels: true，或設定檔沒有 plan()，會自動把門牌、招牌文字寫在牆後）
  --debug       把讀到的每個門牌、招牌文字用紅字標在它的位置上（核對用，不要拿來當成品）
  --json <路徑> 另外把這一層切出來的牆、地板、樓梯、文字存成 JSON（核對用）`;

const args = process.argv.slice(2), opt = {}, pos = [];
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2); if (['debug', 'list', 'help'].includes(k)) opt[k] = true; else opt[k] = args[++i]; } else pos.push(a); }
if (opt.help || !pos.length) { console.log(HELP); process.exit(opt.help ? 0 : 1); }

const cfgPath = existsSync(pos[0]) ? path.resolve(pos[0]) : path.join(ROOT, 'tools/floorplan/buildings', pos[0] + '.mjs');
if (!existsSync(cfgPath)) { console.error(`找不到設定檔 ${cfgPath}`); process.exit(1); }
const cfg = (await import(pathToFileURL(cfgPath).href)).default;

const env = await makeEnv();
const built = await cfg.build(env);
const kit = built.kit || env.kits[0];
if (!kit) { console.error('這棟建築沒有用到 Kit，沒辦法取得本地座標；請在設定檔的 build() 回傳 kit'); process.exit(1); }
const frame = makeFrame(env, kit, built.base ?? kit.base);
const all = collect(env, frame);
const ctx = { env, built, frame, all, levels: levels(all), find: (text, f) => all.texts.filter(t => (text instanceof RegExp ? text.test(t.text) : t.text === text) && (!f || f(t))) };
const floors = typeof cfg.floors === 'function' ? cfg.floors(ctx) : cfg.floors;

if (opt.list) {
  console.log(`${cfg.name}（${cfg.source || ''}）`);
  console.log(`本地座標原點（世界座標）：${kit.ox}, ${kit.oz}　角度 ${(kit.ang * 180 / Math.PI).toFixed(2)}°　基準面 ${frame.base.toFixed(2)}`);
  console.log(`牆線 ${all.walls.length}、可走的面 ${all.surfaces.length}、門牌／招牌文字 ${all.texts.length}`);
  console.log('樓層：'); for (const f of floors) console.log(`  ${f.id}\t${f.name}\t地板 y=${f.y.toFixed(2)}\t到 ${(f.top ?? f.y + 3).toFixed(2)}`);
  console.log('平的可走面的高度分布（建築基準面以上，公尺：面積 m²）：'); console.log('  ' + ctx.levels.filter(l => l.area >= 4).map(l => `${l.y.toFixed(1)}: ${Math.round(l.area)}`).join('　'));
  for (const f of floors) { const sl = slice(all, f); console.log(`${f.id} 的文字（${sl.texts.length}）：` + sl.texts.map(t => `${t.text}${t.door ? '[門]' : ''}@${t.x.toFixed(1)},${t.z.toFixed(1)}`).join('　')); }
  process.exit(0);
}

const want = (pos[1] || 'all').toLowerCase();
const list = want === 'all' ? floors : floors.filter(f => f.id.toLowerCase() === want);
if (!list.length) { console.error(`沒有樓層「${pos[1]}」；可用：${floors.map(f => f.id).join('、')}、all`); process.exit(1); }
const today = (() => { const d = new Date(), p = (v) => String(v).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();

for (const floor of list) {
  const sl = slice(all, floor), warn = (m) => console.warn(`[${cfg.id} ${floor.id}] ${m}`);
  const plan = (cfg.plan ? cfg.plan({ ...ctx, sl, floor, warn }) : null) || {};
  const cells = (plan.closedRows || []).flatMap(r => closedCells(sl, r, warn));
  const labels = [...(plan.labels || [])];
  // autoLabels（沒有 plan() 的設定檔預設打開）：沒被當成房間名稱的門牌、招牌，寫在它那面牆的背後（它標示的那一間裡面）
  if (plan.autoLabels ?? !cfg.plan) {
    const inCell = (t) => cells.some(c => c.text === t.text && t.x > c.x0 - 0.5 && t.x < c.x1 + 0.5 && t.z > c.z0 - 0.5 && t.z < c.z1 + 0.5);
    const put = [];
    for (const t of sl.texts) {
      if (inCell(t)) continue;
      const x = t.x - t.nx * 1.6, z = t.z - t.nz * 1.6;
      if (put.some(q => q.text === t.text && Math.hypot(q.x - x, q.z - z) < 3)) continue;
      put.push({ text: t.text.replace(/ /g, '\n'), x, z, size: 6.5 }); labels.push(put[put.length - 1]);
    }
  }
  const scale = Number(opt.scale) || floor.scale || cfg.scale || 8;
  const meta = { title: opt.title || `${cfg.name} ${floor.name}平面圖`, note: opt.note ?? floor.note ?? cfg.note ?? '', date: opt.date || today, source: floor.source || cfg.source, cut: floor.cut ?? 1, level: floor.y };
  const svg = renderSvg({ sl, cells, zones: plan.zones || [], labels, frame, meta, opts: { scale, debug: opt.debug, legend: plan.legend, zoneNames: plan.zoneNames, bounds: plan.bounds, turn: cfg.turn, pad: cfg.pad, tick: cfg.tick } });
  let out = opt.out ? path.resolve(opt.out) : path.join(ROOT, 'docs/references/floorplans', cfg.id, `${cfg.id}-${floor.id}.svg`);
  if (opt.out && (list.length > 1 || !out.endsWith('.svg'))) out = path.join(out, `${cfg.id}-${floor.id}.svg`);
  mkdirSync(path.dirname(out), { recursive: true }); writeFileSync(out, svg);
  if (opt.json) { const j = list.length > 1 ? path.join(path.resolve(opt.json), `${cfg.id}-${floor.id}.json`) : path.resolve(opt.json); mkdirSync(path.dirname(j), { recursive: true }); writeFileSync(j, JSON.stringify({ floor, walls: sl.walls, floors: sl.floors, landings: sl.landings, stairs: sl.stairs, texts: sl.texts, cells }, null, 1)); }
  console.log(`${floor.id}：牆 ${sl.walls.length}、地板 ${sl.floors.length} 塊、樓梯 ${sl.stairs.length} 段、門 ${sl.texts.filter(t => t.door).length}、進不去的房間 ${cells.filter(c => c.text).length} → ${out}`);
}
