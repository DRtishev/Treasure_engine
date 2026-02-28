/**
 * regression_life02_stable_output.mjs — RG_LIFE02_STABLE_OUTPUT
 *
 * Gate: ops:life run produces stable LIFE_SUMMARY structure x2.
 *       Normalized step results (names + statuses) must be byte-identical.
 *       (RUN_ID and epoch paths are normalized before comparison.)
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const LIFE_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'life.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const checks = [];

const scriptExists = fs.existsSync(LIFE_SCRIPT);
checks.push({ check: 'life_script_exists', pass: scriptExists, detail: LIFE_SCRIPT });

if (scriptExists) {
  // Find 2 EPOCH-LIFE-* runs (or run once if only 1 exists, run again for second)
  const lifeDirs = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-LIFE-')).sort()
    : [];

  // We need at least 1 run; we'll run life.mjs once and capture structure
  // Then check structural stability by running a second time
  const runLife = () => {
    const r = spawnSync(process.execPath, [LIFE_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
    const exitCode = r.status ?? 127;

    // Find the latest EPOCH-LIFE-* summary
    const dirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-LIFE-')).sort()
      : [];
    const latest = dirs.length > 0 ? dirs[dirs.length - 1] : null;
    const summaryPath = latest ? path.join(EVIDENCE_DIR, latest, 'LIFE_SUMMARY.json') : null;

    if (!summaryPath || !fs.existsSync(summaryPath)) return { exitCode, normalized: null };

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

    // Normalize: extract step names + statuses only (remove run_id, paths)
    const normalized = {
      steps_total: summary.steps_total,
      status: summary.status,
      step_names: (summary.step_results ?? []).map((s) => s.name),
      step_statuses: (summary.step_results ?? []).map((s) => s.status),
    };

    return { exitCode, normalized };
  };

  // Accept exit codes 0 (PASS), 1 (FAIL), 2 (ABORT) — all are defined life.mjs exit codes
  // crash = 127 (not found) or null (spawn failed)
  const cleanExit = (code) => code === 0 || code === 1 || code === 2;

  console.log('  Running ops:life (run 1)...');
  const run1 = runLife();
  checks.push({
    check: 'run1_exits_cleanly',
    pass: cleanExit(run1.exitCode),
    detail: `exit_code=${run1.exitCode} (0=PASS 1=FAIL 2=ABORT — all clean; crash=127)`,
  });
  checks.push({
    check: 'run1_has_summary',
    pass: run1.normalized !== null,
    detail: run1.normalized ? `steps=${run1.normalized.steps_total}` : 'No LIFE_SUMMARY.json from run1',
  });

  console.log('  Running ops:life (run 2)...');
  const run2 = runLife();
  checks.push({
    check: 'run2_exits_cleanly',
    pass: cleanExit(run2.exitCode),
    detail: `exit_code=${run2.exitCode} (0=PASS 1=FAIL 2=ABORT — all clean; crash=127)`,
  });
  checks.push({
    check: 'run2_has_summary',
    pass: run2.normalized !== null,
    detail: run2.normalized ? `steps=${run2.normalized.steps_total}` : 'No LIFE_SUMMARY.json from run2',
  });

  if (run1.normalized && run2.normalized) {
    const norm1 = JSON.stringify(run1.normalized);
    const norm2 = JSON.stringify(run2.normalized);
    const hash1 = crypto.createHash('sha256').update(norm1).digest('hex').slice(0, 12);
    const hash2 = crypto.createHash('sha256').update(norm2).digest('hex').slice(0, 12);
    const stable = hash1 === hash2;

    checks.push({
      check: 'normalized_structure_stable_x2',
      pass: stable,
      detail: stable
        ? `hash=${hash1} — both runs produce identical step structure`
        : `hash1=${hash1} hash2=${hash2} — DRIFT DETECTED`,
    });

    checks.push({
      check: 'step_count_stable',
      pass: run1.normalized.steps_total === run2.normalized.steps_total,
      detail: `run1=${run1.normalized.steps_total} run2=${run2.normalized.steps_total}`,
    });

    checks.push({
      check: 'step_names_stable',
      pass: JSON.stringify(run1.normalized.step_names) === JSON.stringify(run2.normalized.step_names),
      detail: `run1=[${run1.normalized.step_names.join(',')}] run2=[${run2.normalized.step_names.join(',')}]`,
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LIFE02_UNSTABLE_OUTPUT';

writeMd(path.join(EXEC, 'REGRESSION_LIFE02_STABLE_OUTPUT.md'), [
  '# REGRESSION_LIFE02_STABLE_OUTPUT.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_life02_stable_output.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LIFE02_STABLE_OUTPUT',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_life02_stable_output — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
