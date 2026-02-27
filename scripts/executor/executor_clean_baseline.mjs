import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());

const RESTORE_TARGETS = [
  path.join(ROOT, 'reports', 'evidence'),
  path.join(ROOT, 'artifacts', 'incoming'),
];
const CLEAN_TARGETS = [
  path.join(ROOT, 'reports', 'evidence', 'EXECUTOR'),
  path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00'),
  path.join(ROOT, 'reports', 'evidence', 'GOV'),
  path.join(ROOT, 'reports', 'evidence', 'INFRA_P0'),
  path.join(ROOT, 'reports', 'evidence', 'SAFETY'),
  path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB'),
  path.join(ROOT, 'artifacts', 'incoming'),
];

const RESTORE_RELS = RESTORE_TARGETS.map((dir) => path.relative(ROOT, dir).split(path.sep).join('/'));
const CLEAN_RELS = CLEAN_TARGETS.map((dir) => path.relative(ROOT, dir).split(path.sep).join('/'));

function q(v) {
  return `'${String(v).replace(/'/g, `"'"'`)}'`;
}

function listLines(cmd) {
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, timeoutMs: 10000, maxBuffer: 8 * 1024 * 1024 });
  if (r.ec !== 0) return [];
  return String(r.stdout || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

const trackedBefore = listLines('git diff --name-only').length;
const stagedBefore = listLines('git diff --cached --name-only').length;

const restore = runBounded(`git restore --staged --worktree -- ${RESTORE_RELS.map(q).join(' ')}`, {
  cwd: ROOT,
  env: process.env,
  timeoutMs: 60000,
  maxBuffer: 16 * 1024 * 1024,
});
if (restore.ec !== 0) {
  console.error('[FAIL] executor_clean_baseline — EC01');
  console.error((restore.stdout + restore.stderr).trim());
  process.exit(1);
}

const clean = runBounded(`git clean -fd -- ${CLEAN_RELS.map(q).join(' ')}`, {
  cwd: ROOT,
  env: process.env,
  timeoutMs: 60000,
  maxBuffer: 16 * 1024 * 1024,
});

const telemetry = {
  semantic: {
    baseline_files_restored_n: trackedBefore + stagedBefore,
    baseline_evidence_removed_n: String(clean.stdout || '').split(/\r?\n/).filter((x) => x.startsWith('Removing ')).length,
    baseline_executor_receipts_preserved: true,
  },
  volatile: {
    baseline_clean_elapsed_ms: 0,
  },
};
console.log(`BASELINE_TELEMETRY_JSON:${JSON.stringify(telemetry)}`);
console.log('[PASS] executor_clean_baseline — NONE');
