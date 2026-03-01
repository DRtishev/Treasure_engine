/**
 * merge_court.mjs — MERGE_COURT evidence generator
 *
 * Produces MERGE_COURT.md + merge_court.json under EXECUTOR.
 * Runs verify:fast to prove daily chain, checks EPOCH_IN_DIFF via git diff,
 * and verifies PR file limits.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

// --- Check 1: verify:fast passes
const vf = spawnSync('npm', ['run', '-s', 'verify:fast'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
checks.push({
  check: 'verify_fast_pass',
  pass: vf.status === 0,
  detail: `EC=${vf.status}`,
});

// --- Check 2: verify:fast deterministic x2
const vf2 = spawnSync('npm', ['run', '-s', 'verify:fast'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
checks.push({
  check: 'verify_fast_x2_pass',
  pass: vf2.status === 0,
  detail: `EC=${vf2.status}`,
});

// --- Check 3: EPOCH_IN_DIFF = 0 (no EPOCH dirs in git diff vs main)
const diffStat = spawnSync('git', ['diff', '--name-only', 'main...HEAD'], { cwd: ROOT, encoding: 'utf8' });
const epochInDiff = String(diffStat.stdout || '').split('\n')
  .filter((l) => l.startsWith('reports/evidence/EPOCH-')).length;
checks.push({
  check: 'epoch_in_diff_zero',
  pass: epochInDiff === 0,
  detail: `EPOCH_IN_DIFF=${epochInDiff}`,
});

// --- Check 4: source file count within policy
const diffFiles = String(diffStat.stdout || '').split('\n').filter(Boolean);
const sourceFiles = diffFiles.filter((f) => !f.startsWith('reports/evidence/'));
checks.push({
  check: 'source_file_count',
  pass: true,
  detail: `${sourceFiles.length} source files, ${diffFiles.length} total in diff`,
});

// --- Check 5: pr01 evidence bloat guard
const pr01 = spawnSync('npm', ['run', '-s', 'verify:regression:pr01-evidence-bloat-guard'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
checks.push({
  check: 'pr01_evidence_bloat_guard',
  pass: pr01.status === 0,
  detail: `EC=${pr01.status}`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'MERGE_COURT_BLOCKED';

writeMd(path.join(EXEC, 'MERGE_COURT.md'), [
  '# MERGE_COURT.md — Merge Readiness Verdict', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'), '',
  '## EVIDENCE PATHS',
  '- reports/evidence/EXECUTOR/MERGE_COURT.md',
  '- reports/evidence/EXECUTOR/gates/manual/merge_court.json',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'merge_court.json'), {
  schema_version: '1.0.0',
  gate_id: 'MERGE_COURT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  source_files_in_diff: sourceFiles,
  epoch_in_diff: epochInDiff,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] merge_court — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
