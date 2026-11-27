#!/usr/bin/env node
// Lightweight PR performance history & on-demand comparison CLI.
// Stores synced records in tools/.cache/perf-history.jsonl (<600B per PR, gitignored).
// Does NOT run automatically during CI; invoked by an Agent only when attaching to a PR
// or when the user asks to inspect/compare historical performance.
//
// Subcommands:
//   node tools/perf_history.mjs attach <PR#> [--file=tools/e2e/out/bench/pr-perf-section.md]
//   node tools/perf_history.mjs sync [--limit=200] [--repo=howardtuan/YanlinGTA]
//   node tools/perf_history.mjs list [--last=20] [--same-gpu=<query>] [--offline]
//   node tools/perf_history.mjs compare [--from=<PR#|sha>] [--to=<PR#|sha>] [--pr=<PR#>] [--current] [--offline]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCompactRecord,
  compareRecords,
  extractPerfTag,
  formatComparisonMarkdown,
  formatPrPerfSection,
  formatTimelineMarkdown,
  injectPerfSectionIntoPrBody,
  normalizeGpuKey,
  parseJsonl,
  serializeJsonl,
  upsertRecords,
} from './perf/history_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DEFAULT_DB = path.join(ROOT, 'tools', '.cache', 'perf-history.jsonl');
const DEFAULT_MD = path.join(ROOT, 'tools', 'e2e', 'out', 'bench', 'pr-perf-section.md');
const DEFAULT_REPORT = path.join(ROOT, 'tools', 'e2e', 'out', 'bench', 'bench-report.json');

const argv = process.argv.slice(2);
const sub = argv.find((a) => !a.startsWith('-')) || 'list';
const flag = (k) => argv.includes(`--${k}`);
const arg = (k, d = '') => {
  const hit = argv.find((s) => s.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};

if (flag('help') || flag('h')) {
  console.log(`node tools/perf_history.mjs <subcommand> [options]

Subcommands:
  attach <PR#>          Inject tools/e2e/out/bench/pr-perf-section.md into GitHub PR #<PR#> body
  sync                  Incrementally sync <!-- yanlin-perf:v1 --> records from merged GitHub PRs
  list                  Show chronological table of recorded PR performance snapshots
  compare               Compare two PRs, a PR vs its predecessor, or local run vs latest PR

Options:
  --repo=<owner/name>   GitHub repository (default: howardtuan/YanlinGTA)
  --db=<path>           JSONL database path (default: tools/.cache/perf-history.jsonl)
  --limit=200           Max merged PRs to scan during sync (default: 200)
  --last=20             Number of recent records to display in 'list' (default: 20)
  --same-gpu=<text>     Filter 'list' to a specific GPU model (e.g. "m2" or "3070")
  --from=<PR#|sha>      Baseline record selector for 'compare'
  --to=<PR#|sha>        Target record selector for 'compare'
  --pr=<PR#>            Shorthand for comparing PR #<PR#> against its preceding recorded PR
  --current             Compare local tools/e2e/out/bench/bench-report.json against latest record
  --offline             Skip automatic GitHub sync before 'list' / 'compare'`);
  process.exit(0);
}

const repo = arg('repo', 'howardtuan/YanlinGTA');
const dbPath = path.resolve(ROOT, arg('db', DEFAULT_DB));

function readDb() {
  return fs.existsSync(dbPath) ? parseJsonl(fs.readFileSync(dbPath, 'utf8')) : [];
}

function writeDb(records) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, serializeJsonl(records));
}

function syncFromGitHub({ limit = 200, quiet = false } = {}) {
  let raw = '[]';
  try {
    raw = execFileSync(
      'gh',
      [
        'pr',
        'list',
        '--repo',
        repo,
        '--state',
        'merged',
        '--limit',
        String(limit),
        '--json',
        'number,title,mergedAt,mergeCommit,headRefName,body',
      ],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (e) {
    if (!quiet) {
      console.error(`perf_history: GitHub sync skipped (${String(e.message || e).split('\n')[0]})`);
    }
    return readDb();
  }

  const prs = JSON.parse(raw);
  const incoming = [];
  for (const pr of prs) {
    const rec = extractPerfTag(pr.body);
    if (!rec) continue;
    rec.pr = pr.number;
    rec.title = pr.title || rec.title || null;
    rec.branch = pr.headRefName || rec.branch || null;
    rec.sha = pr.mergeCommit?.oid ? pr.mergeCommit.oid.slice(0, 7) : rec.sha;
    rec.at = pr.mergedAt || rec.at;
    incoming.push(rec);
  }

  const merged = upsertRecords(readDb(), incoming);
  writeDb(merged);
  if (!quiet) {
    console.error(
      `perf_history: scanned ${prs.length} merged PRs, synced ${incoming.length} perf records (DB total: ${merged.length}).`
    );
  }
  return merged;
}

function findRecord(records, query) {
  if (!query) return null;
  const q = String(query).trim().replace(/^#/, '');
  const asNum = Number(q);
  if (Number.isFinite(asNum)) {
    const byPr = records.find((r) => r.pr === asNum);
    if (byPr) return byPr;
  }
  return (
    records.find((r) => r.sha && r.sha.startsWith(q)) || records.find((r) => r.branch === q) || null
  );
}

function loadCurrentRecord() {
  const reportFile = path.resolve(ROOT, arg('report', DEFAULT_REPORT));
  if (!fs.existsSync(reportFile)) {
    throw new Error(
      `Local benchmark report not found at ${reportFile} (run npm run bench:iphone first)`
    );
  }
  const rep = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  return buildCompactRecord(rep, { title: '本機最新量測' });
}

function findSameGpuPredecessor(records, target, excludeRecord) {
  const key = target?.hw?.gpuKey;
  if (!key || key === 'unknown') return null;
  const pool = records.filter(
    (r) =>
      r !== target &&
      r !== excludeRecord &&
      r.hw?.gpuKey === key &&
      r.hw?.profile === target.hw?.profile &&
      r.hw?.q === target.hw?.q
  );
  return pool.length ? pool[pool.length - 1] : null;
}

if (sub === 'attach') {
  const positionalPr = argv.slice(1).find((a) => !a.startsWith('-'));
  const prNum = Number(positionalPr || arg('pr', ''));
  if (!Number.isFinite(prNum) || prNum <= 0) {
    console.error('Usage: npm run perf:attach -- <PR#> [--file=path/to/pr-perf-section.md]');
    process.exit(1);
  }
  const mdFile = path.resolve(ROOT, arg('file', DEFAULT_MD));
  let sectionMd = '';
  if (fs.existsSync(mdFile)) {
    sectionMd = fs.readFileSync(mdFile, 'utf8');
  } else if (fs.existsSync(DEFAULT_REPORT)) {
    const rec = loadCurrentRecord();
    rec.pr = prNum;
    sectionMd = formatPrPerfSection(rec);
  } else {
    console.error(`perf_history: ${mdFile} not found (run npm run bench:iphone first)`);
    process.exit(1);
  }

  const tag = extractPerfTag(sectionMd);
  if (tag) {
    tag.pr = prNum;
    sectionMd = formatPrPerfSection(tag);
    writeDb(upsertRecords(readDb(), [tag]));
  }

  const curBody = execFileSync(
    'gh',
    ['pr', 'view', String(prNum), '--repo', repo, '--json', 'body', '--jq', '.body'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  const nextBody = injectPerfSectionIntoPrBody(curBody, sectionMd);
  const tmpFile = path.join(path.dirname(dbPath), `pr-${prNum}-edit.md`);
  fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
  fs.writeFileSync(tmpFile, nextBody);
  execFileSync('gh', ['pr', 'edit', String(prNum), '--repo', repo, '--body-file', tmpFile], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  fs.rmSync(tmpFile, { force: true });
  console.log(`Attached performance section to PR #${prNum}.`);
} else if (sub === 'sync') {
  syncFromGitHub({ limit: +arg('limit', 200), quiet: false });
} else if (sub === 'list') {
  const records = flag('offline')
    ? readDb()
    : syncFromGitHub({ limit: +arg('limit', 200), quiet: true });
  const gpuFilter = arg('same-gpu', '');
  const filtered = gpuFilter
    ? records.filter((r) => {
        const needle = normalizeGpuKey(gpuFilter);
        return (
          r.hw?.gpuKey?.includes(needle) ||
          String(r.hw?.gpu || '')
            .toLowerCase()
            .includes(gpuFilter.toLowerCase())
        );
      })
    : records;
  const last = +arg('last', 20);
  const slice = last > 0 ? filtered.slice(-last) : filtered;
  console.log(formatTimelineMarkdown(slice));
} else if (sub === 'compare') {
  const records = flag('offline')
    ? readDb()
    : syncFromGitHub({ limit: +arg('limit', 200), quiet: true });

  let before = null;
  let after = null;

  if (flag('current')) {
    after = loadCurrentRecord();
    const fromArg = arg('from', '');
    const pool = records.filter((r) => r.pr != null);
    const fallbackPool = pool.length ? pool : records.filter((r) => r.sha !== after.sha);
    before = fromArg ? findRecord(records, fromArg) : fallbackPool[fallbackPool.length - 1] || null;
  } else if (arg('pr', '')) {
    after = findRecord(records, arg('pr', ''));
    if (!after) {
      console.error(`perf_history: PR #${arg('pr', '')} not found in history database`);
      process.exit(1);
    }
    const idx = records.indexOf(after);
    before = arg('from', '')
      ? findRecord(records, arg('from', ''))
      : idx > 0
        ? records[idx - 1]
        : null;
  } else if (arg('from', '') || arg('to', '')) {
    before = arg('from', '') ? findRecord(records, arg('from', '')) : records[records.length - 2];
    after = arg('to', '') ? findRecord(records, arg('to', '')) : records[records.length - 1];
  } else if (records.length >= 2) {
    before = records[records.length - 2];
    after = records[records.length - 1];
  }

  if (!before || !after) {
    console.error(
      `perf_history: need at least two records to compare (have ${records.length}). Use --current with at least 1 saved baseline, or specify --from / --to.`
    );
    process.exit(1);
  }

  const beforeIdx = records.indexOf(before);
  const historyBeforeAfter =
    records.indexOf(after) > 0 ? records.slice(0, records.indexOf(after)) : records;
  const sameGpuBaseline = findSameGpuPredecessor(
    beforeIdx >= 0 ? historyBeforeAfter : records,
    after,
    before
  );

  const cmp = compareRecords(before, after, { sameGpuBaseline });
  console.log(formatComparisonMarkdown(cmp));
} else {
  console.error(`Unknown subcommand "${sub}". Run with --help for usage.`);
  process.exit(1);
}
