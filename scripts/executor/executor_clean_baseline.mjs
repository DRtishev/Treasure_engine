import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());

const TARGETS = [
  path.join(ROOT, 'reports', 'evidence', 'EXECUTOR'),
  path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'sandbox'),
  path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'stub'),
];

const TARGET_RELS = TARGETS.map((dir) => path.relative(ROOT, dir).split(path.sep).join('/'));

function q(v) {
  return `'${String(v).replace(/'/g, `'"'"'`)}'`;
}

function clearChildren(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

function listLines(cmd) {
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, timeoutMs: 10000, maxBuffer: 8 * 1024 * 1024 });
  if (r.ec !== 0) return [];
  return String(r.stdout || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function listTrackedDiffTargets() {
  return listLines(`git diff --name-only -- ${TARGET_RELS.map(q).join(' ')}`);
}

function listTrackedDiffCachedTargets() {
  return listLines(`git diff --cached --name-only -- ${TARGET_RELS.map(q).join(' ')}`);
}

const trackedBefore = listLines('git diff --name-only');
const stagedBefore = listLines('git diff --cached --name-only');
if (trackedBefore.length > 0 || stagedBefore.length > 0) {
  console.log('⚠️ LOCAL MODIFICATIONS DETECTED');
  console.log('Running victory seal will restore tracked files.');
  console.log('Uncommitted changes may be lost.');
  console.log('');
  console.log('Commit or stash before continuing.');
  console.log('');
}

let evidenceRemoved = 0;
for (const dir of TARGETS) evidenceRemoved += clearChildren(dir);

const restorePre = new Set([...listTrackedDiffTargets(), ...listTrackedDiffCachedTargets()]);

const restore = runBounded(`git restore --staged --worktree -- ${TARGET_RELS.map(q).join(' ')}`, {
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

const telemetry = {
  semantic: {
    baseline_files_restored_n: restorePre.size,
    baseline_evidence_removed_n: evidenceRemoved,
  },
  volatile: {
    baseline_clean_elapsed_ms: 0,
  },
};
console.log(`BASELINE_TELEMETRY_JSON:${JSON.stringify(telemetry)}`);
console.log('[PASS] executor_clean_baseline — NONE');
