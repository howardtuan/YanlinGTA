import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Structure of the static imports inside src/: no missing files, no new import cycles, no new
// violations of the layer rules in AGENT.md (section 3). The lists below are the state on
// 2026-11-23; they may only shrink. When one of them is fixed, delete its line here.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : e.name.endsWith('.js')
          ? [path.join(dir, e.name)]
          : []
    );
const rel = (file) => path.relative(SRC, file).split(path.sep).join('/');

// import ... from './x.js' / export ... from './x.js' / import './x.js' (relative specifiers only)
const IMPORT = /^\s*(?:import|export)\b[^'"]*?(?:from\s*)?['"](\.{1,2}\/[^'"]+)['"]/gm;

const files = walk(SRC);
const graph = new Map(files.map((f) => [rel(f), new Set()]));
const broken = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of text.matchAll(IMPORT)) {
    const target = path.resolve(path.dirname(file), m[1].split('?')[0]);
    if (!target.startsWith(SRC + path.sep) || !target.endsWith('.js')) continue; // vendor/, .wasm, .css
    if (!fs.existsSync(target)) broken.push(`${rel(file)} -> ${m[1]}`);
    else graph.get(rel(file)).add(rel(target));
  }
}

// strongly connected components with more than one file (Tarjan)
function cycles() {
  let n = 0;
  const index = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const out = [];
  const visit = (v) => {
    index.set(v, n);
    low.set(v, n++);
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v)) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1) out.push(comp.sort().join(' <-> '));
    }
  };
  for (const v of graph.keys()) if (!index.has(v)) visit(v);
  return out.sort();
}

const KNOWN_CYCLES = [];

const layer = (f) => f.split('/')[0];
// AGENT.md: core / physics / graphics must not depend on systems / ui; world builds the static
// scene and leaves characters to entities; ui reflects state, so systems must not reach into ui.
const FORBIDDEN = [
  [
    ['physics', 'graphics'],
    ['systems', 'ui'],
  ],
  [['core'], ['systems', 'ui']],
  [['world'], ['entities']],
  [['systems'], ['ui']],
];
// core/Game.js is the entry point that wires everything together
const WIRING = new Set(['core/Game.js', 'core/GameLoop.js', 'core/MenuManager.js']);
// world/Interiors.js puts the standing characters (McDonald's crew, classmates) into the rooms it builds
const KNOWN_VIOLATIONS = ['world/Interiors.js -> entities/Character.js'];

function violations() {
  const out = [];
  for (const [from, targets] of graph) {
    if (WIRING.has(from)) continue;
    for (const to of targets) {
      if (FORBIDDEN.some(([a, b]) => a.includes(layer(from)) && b.includes(layer(to))))
        out.push(`${from} -> ${to}`);
    }
  }
  return out.sort();
}

describe('src/ import graph', () => {
  it('reads the graph (the import pattern still matches the code)', () => {
    expect(graph.size).toBeGreaterThan(90);
    expect([...graph.values()].reduce((s, t) => s + t.size, 0)).toBeGreaterThan(200);
    expect(graph.get('core/Game.js').has('core/GameLoop.js')).toBe(true);
  });

  it('every relative import points at a file that exists', () => {
    expect(broken).toEqual([]);
  });

  it('has no import cycles beyond the known ones', () => {
    expect(cycles()).toEqual(KNOWN_CYCLES);
  });

  it('has no layer-rule violations beyond the known ones', () => {
    expect(violations()).toEqual(KNOWN_VIOLATIONS);
  });
});
