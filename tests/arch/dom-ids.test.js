import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every element the code looks up by id must exist: either in index.html or in markup / elements the
// code itself creates. A mistyped id only fails at runtime as a dead button (the pause menu's close
// button was bound to 'mClose' while index.html says 'modalClose'), so check the wiring here.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
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

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sources = walk(path.join(ROOT, 'src')).map((file) => ({
  file: path.relative(ROOT, file),
  text: fs.readFileSync(file, 'utf8'),
}));

const ID = '[A-Za-z][\\w-]*';
// id="x" / id='x' / id=\"x\" in markup (not data-id=, not a ${...} placeholder)
const MARKUP_ID = new RegExp(`(?<![\\w-])id=\\\\?["'](${ID})\\\\?["']`, 'g');
// el.id = 'x'
const ASSIGNED_ID = new RegExp(`\\.id\\s*=\\s*["'\`](${ID})["'\`]`, 'g');
// getElementById('x') and the local `$('x')` helpers
const LOOKUP = new RegExp(`(?:getElementById|(?<![\\w$.])\\$)\\(\\s*["'](${ID})["']\\s*\\)`, 'g');

const defined = new Set();
for (const m of html.matchAll(MARKUP_ID)) defined.add(m[1]);
for (const { text } of sources) {
  for (const m of text.matchAll(MARKUP_ID)) defined.add(m[1]);
  for (const m of text.matchAll(ASSIGNED_ID)) defined.add(m[1]);
}

describe('DOM id wiring (src/ lookups vs. index.html and generated markup)', () => {
  it('finds the lookups and the ids at all (the patterns still match the code)', () => {
    const lookups = sources.flatMap(({ text }) => [...text.matchAll(LOOKUP)]);
    expect(lookups.length).toBeGreaterThan(80);
    expect(defined.has('modalClose')).toBe(true);
    expect(defined.has('btnStart')).toBe(true);
  });

  it('every id looked up in src/ exists in index.html or is created by the code', () => {
    const missing = [];
    for (const { file, text } of sources) {
      text.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(LOOKUP)) {
          if (!defined.has(m[1])) missing.push(`${file}:${i + 1} #${m[1]}`);
        }
      });
    }
    expect(missing).toEqual([]);
  });

  it('would have caught the mistyped pause-menu id', () => {
    expect(defined.has('mClose')).toBe(false);
    expect(defined.has('btnVideoClose')).toBe(false);
  });
});
