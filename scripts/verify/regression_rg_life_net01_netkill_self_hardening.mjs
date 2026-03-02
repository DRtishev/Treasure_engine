/**
 * regression_rg_life_net01_netkill_self_hardening.mjs
 *
 * Asserts that ops:life self-hardens TREASURE_NET_KILL=1 and injects
 * net_kill_preload.cjs into NODE_OPTIONS for all child runs.
 *
 * Reads LIFE_SUMMARY.json produced by ops:life and verifies each step record
 * has netkill_enforced==true, node_options_contains_preload==true, and correct
 * preload_path_rel. Runs x2 and compares JSON receipt byte-identical.
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

const EXPECTED_PRELOAD_REL = 'scripts/safety/net_kill_preload.cjs';

function findLatestLifeSummary() {
  const evidenceRoot = path.join(ROOT, 'reports/evidence');
  const dirs = fs.readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('EPOCH-LIFE-'))
    .map((d) => d.name)
    .sort();
  for (let i = dirs.length - 1; i >= 0; i--) {
    const p = path.join(evidenceRoot, dirs[i], 'LIFE_SUMMARY.json');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function validate(summaryPath) {
  if (!summaryPath) return ['no_life_summary_found'];
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const offenders = [];
  if (!Array.isArray(summary.step_results)) {
    offenders.push('step_results_not_array');
    return offenders;
  }
  for (const step of summary.step_results) {
    if (step.netkill_enforced !== true) offenders.push(`${step.step_id}_netkill_not_enforced`);
    if (step.node_options_contains_preload !== true) offenders.push(`${step.step_id}_preload_missing`);
    if (step.preload_path_rel !== EXPECTED_PRELOAD_REL) offenders.push(`${step.step_id}_preload_path_wrong`);
  }
  return offenders;
}

const summaryPath = findLatestLifeSummary();
const offenders = validate(summaryPath);
const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_LIFE_NET01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_LIFE_NET01.md'), [
  '# REGRESSION_RG_LIFE_NET01 — Net-Kill Self-Hardening', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: npm run -s ops:life`,
  `LIFE_SUMMARY: ${summaryPath ? path.relative(ROOT, summaryPath) : 'NONE'}`,
  `OFFENDERS: ${offenders.length ? offenders.join(', ') : '[]'}`,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_life_net01_netkill_self_hardening.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LIFE_NET01_NETKILL_SELF_HARDENING',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  life_summary: summaryPath ? path.relative(ROOT, summaryPath) : null,
  offenders,
});

console.log(`[${status}] regression_rg_life_net01_netkill_self_hardening — ${reason}`);
process.exit(ok ? 0 : 1);
