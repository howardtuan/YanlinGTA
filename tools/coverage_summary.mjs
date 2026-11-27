#!/usr/bin/env node
// Summarizes coverage/coverage-summary.json by src/ top-level layer and optionally appends to $GITHUB_STEP_SUMMARY.
//   node tools/coverage_summary.mjs [--file=coverage/coverage-summary.json] [--summary=<path>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const a = argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};

const file = path.resolve(ROOT, arg('file', 'coverage/coverage-summary.json'));
const summaryPath = arg('summary', '');

if (!fs.existsSync(file)) {
  console.error(`coverage_summary: ${file} not found (run npm run test:coverage first)`);
  process.exit(1);
}

const cov = JSON.parse(fs.readFileSync(file, 'utf8'));
const dirs = {};
for (const [f, d] of Object.entries(cov)) {
  if (f === 'total') continue;
  const norm = f.split(path.sep).join('/');
  const idx = norm.lastIndexOf('/src/');
  const rel = idx >= 0 ? norm.slice(idx + 5) : norm;
  const top = rel.split('/')[0];
  dirs[top] ??= { files: 0, lines: 0, covered: 0, branches: 0, branchesCov: 0 };
  dirs[top].files++;
  dirs[top].lines += d.lines.total;
  dirs[top].covered += d.lines.covered;
  dirs[top].branches += d.branches.total;
  dirs[top].branchesCov += d.branches.covered;
}

const pct = (c, t) => (t > 0 ? ((c / t) * 100).toFixed(1) : '100.0');
const rows = Object.entries(dirs)
  .sort((a, b) => b[1].covered / (b[1].lines || 1) - a[1].covered / (a[1].lines || 1))
  .map(
    ([name, v]) =>
      `| \`src/${name}/\` | ${v.files} | ${pct(v.covered, v.lines)}% (${v.covered}/${v.lines}) | ${pct(v.branchesCov, v.branches)}% |`
  );

const t = cov.total;
const md = [
  '### 📊 Vitest Unit & Integration Coverage (Internal Metric)',
  '',
  `> **總計**：Lines \`${t.lines.pct}%\` · Statements \`${t.statements.pct}%\` · Functions \`${t.functions.pct}%\` · Branches \`${t.branches.pct}%\`（不含 Chrome E2E / Smoke 覆蓋範圍）`,
  '',
  '| 模組分層 | 檔案數 | Lines 覆蓋率 | Branches |',
  '| :--- | ---: | ---: | ---: |',
  ...rows,
  '',
].join('\n');

console.log(md);
if (summaryPath) {
  fs.appendFileSync(summaryPath, `${md}\n`);
}
