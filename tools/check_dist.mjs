#!/usr/bin/env node
// Smoke check for the production build: dist/index.html must only reference files that are in dist/,
// with relative URLs (the site is served from a sub-path such as /YanlinGTA/ on GitHub Pages, where
// a leading "/" points outside the game), and nothing may still point at the unbundled sources.
//   node tools/check_dist.mjs [dist dir]      (run after npm run build; exit code 1 on problems)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] || path.join(here, '..', 'dist'));
const problems = [];

const indexFile = path.join(dist, 'index.html');
if (!fs.existsSync(indexFile)) {
  console.error(`check_dist: ${indexFile} not found (run npm run build first)`);
  process.exit(1);
}
const html = fs.readFileSync(indexFile, 'utf8');

const refs = new Set();
for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) refs.add(m[1]);
// the loading picture's onerror fallback is allowed to be missing (it only runs when the .jpg is)
for (const m of html.matchAll(/\bonerror\s*=\s*"[^"]*"/g)) {
  for (const s of m[0].matchAll(/'([^']+\.[a-z0-9]{2,5})'/g)) refs.delete(s[1]);
}

let entry = 0;
for (const ref of refs) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue; // https:, data:, mailto:, //host, #anchor
  const clean = ref.split(/[?#]/)[0];
  if (clean.startsWith('/')) {
    problems.push(`absolute URL "${ref}" (breaks under a sub-path such as /YanlinGTA/)`);
    continue;
  }
  if (/(^|\/)src\//.test(clean)) problems.push(`"${ref}" still points at the unbundled sources`);
  if (!fs.existsSync(path.join(dist, clean))) problems.push(`"${ref}" is not in dist/`);
  if (/\.js$/.test(clean)) entry++;
}
if (!entry) problems.push('index.html loads no script');
// the PWA manifest must stay at the site root: inside assets/ its start_url "./" would open /assets/
// when the game is added to a phone's home screen (vite.config.js manifestLinkPlugin)
const manifestLink = html.match(/<link[^>]*rel=["']manifest["'][^>]*>/i)?.[0] || '';
if (!/href=["'](?:\.\/)?manifest\.webmanifest["']/.test(manifestLink)) {
  problems.push(
    `manifest link should point at manifest.webmanifest in the site root, got: ${manifestLink || 'none'}`
  );
}

// folders the game fetches at runtime by plain path (vite.config.js staticAssetsPlugin copies them)
for (const need of [
  'data/cycu.json',
  'data/npcs.json',
  'data/terrain.json',
  'vendor/rapier/rapier.wasm',
  'manifest.webmanifest',
  'assets/icon',
  'wiki/index.html',
  // SEO / AEO：Google Search Console 提交的 sitemap 與爬蟲規則（wiki/seo.mjs）
  'favicon.ico',
  'sitemap.xml',
  'robots.txt',
  'llms.txt',
]) {
  if (!fs.existsSync(path.join(dist, need))) problems.push(`${need} is missing from dist/`);
}

if (problems.length) {
  console.error(`check_dist: ${problems.length} problem(s) in ${dist}`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check_dist: OK (${refs.size} references in index.html, all present in ${dist})`);
