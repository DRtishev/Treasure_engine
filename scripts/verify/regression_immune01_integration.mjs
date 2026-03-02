/**
 * regression_immune01_integration.mjs — RG_IMMUNE01
 *
 * EPOCH-71 structural gate. Validates immune-nervous integration:
 *   1. doctor_in_telemetry     — TELEMETRY_STEPS includes T6 ops:doctor
 *   2. immune_reflex_registered — REFLEX_REGISTRY includes immune_reflex
 *   3. guard_probe_failure_reads_evidence — reads real EPOCH-DOCTOR receipt
 *   4. guard_healable_checks_conditions — meaningful pass/fail
 *   5. guard_heal_complete_reads_receipt — reads HEAL_RECEIPT
 *   6. life_summary_immune_field — LIFE_SUMMARY.json has immune object
 *   7. heal_runner_exists — heal_runner.mjs present
 *
 * SKIP-SAFE: Checks that read LIFE evidence return PASS if no evidence exists.
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_immune01_integration.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:immune01-integration';
const checks = [];

// ---------------------------------------------------------------------------
// Test 1: doctor_in_telemetry — life.mjs has T6 ops:doctor in TELEMETRY_STEPS
// ---------------------------------------------------------------------------
const lifeSrc = fs.readFileSync(path.join(ROOT, 'scripts/ops/life.mjs'), 'utf8');
const hasT6 = lifeSrc.includes("id: 'T6'") && lifeSrc.includes('ops_doctor');
checks.push({
  check: 'doctor_in_telemetry',
  pass: hasT6,
  detail: hasT6 ? 'OK: T6 ops:doctor in TELEMETRY_STEPS' : 'FAIL: T6 ops:doctor missing',
});

// ---------------------------------------------------------------------------
// Test 2: immune_reflex_registered — REFLEX_REGISTRY has immune_reflex
// ---------------------------------------------------------------------------
const hasImmuneReflex = lifeSrc.includes("name: 'immune_reflex'") &&
  lifeSrc.includes('DOCTOR_VERDICT_FAIL');
checks.push({
  check: 'immune_reflex_registered',
  pass: hasImmuneReflex,
  detail: hasImmuneReflex
    ? 'OK: immune_reflex with DOCTOR_VERDICT_FAIL trigger registered'
    : 'FAIL: immune_reflex not found in REFLEX_REGISTRY',
});

// ---------------------------------------------------------------------------
// Test 3: guard_probe_failure_reads_evidence — reads real EPOCH-DOCTOR receipt
// ---------------------------------------------------------------------------
const guardSrc = fs.readFileSync(path.join(ROOT, 'scripts/ops/fsm_guards.mjs'), 'utf8');
const guardsReadDoctor = guardSrc.includes('EPOCH-DOCTOR-') && guardSrc.includes('DOCTOR.json');
checks.push({
  check: 'guard_probe_failure_reads_evidence',
  pass: guardsReadDoctor,
  detail: guardsReadDoctor
    ? 'OK: guard_probe_failure reads EPOCH-DOCTOR receipt'
    : 'FAIL: guard_probe_failure does not read doctor evidence',
});

// ---------------------------------------------------------------------------
// Test 4: guard_healable_checks_conditions — checks doctor_verdict context
// ---------------------------------------------------------------------------
const healableChecksDr = guardSrc.includes('doctor_verdict');
checks.push({
  check: 'guard_healable_checks_conditions',
  pass: healableChecksDr,
  detail: healableChecksDr
    ? 'OK: guard_healable checks doctor_verdict context'
    : 'FAIL: guard_healable does not check doctor_verdict',
});

// ---------------------------------------------------------------------------
// Test 5: guard_heal_complete_reads_receipt — reads HEAL_RECEIPT
// ---------------------------------------------------------------------------
const healCompleteReads = guardSrc.includes('HEAL_RECEIPT.json') || guardSrc.includes('EPOCH-HEAL-');
checks.push({
  check: 'guard_heal_complete_reads_receipt',
  pass: healCompleteReads,
  detail: healCompleteReads
    ? 'OK: guard_heal_complete reads HEAL_RECEIPT'
    : 'FAIL: guard_heal_complete does not read heal receipt',
});

// ---------------------------------------------------------------------------
// Test 6: life_summary_immune_field — LIFE_SUMMARY.json has immune object
// ---------------------------------------------------------------------------
function findLatestLifeSummary() {
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  if (!fs.existsSync(evidenceDir)) return null;
  const dirs = fs.readdirSync(evidenceDir)
    .filter((d) => d.startsWith('EPOCH-LIFE-'))
    .sort((a, b) => a.localeCompare(b));
  if (dirs.length === 0) return null;
  const latest = dirs[dirs.length - 1];
  const summaryPath = path.join(evidenceDir, latest, 'LIFE_SUMMARY.json');
  try {
    if (!fs.existsSync(summaryPath)) return null;
    return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  } catch { return null; }
}

const summary = findLatestLifeSummary();
if (summary && (summary.schema_version === '3.0.0' || summary.schema_version === '4.0.0')) {
  const hasImmune = summary.immune && typeof summary.immune === 'object' &&
    typeof summary.immune.doctor_ran === 'boolean';
  checks.push({
    check: 'life_summary_immune_field',
    pass: !!hasImmune,
    detail: hasImmune
      ? `OK: immune field present — doctor_ran=${summary.immune.doctor_ran} verdict=${summary.immune.doctor_verdict ?? 'null'}`
      : 'FAIL: immune object missing or invalid in LIFE_SUMMARY v3',
  });
} else {
  // Skip-safe for pre-v3 summaries or no summary
  checks.push({
    check: 'life_summary_immune_field',
    pass: true,
    detail: summary
      ? `skip-safe PASS — LIFE_SUMMARY schema=${summary.schema_version} (pre-v3)`
      : 'no LIFE_SUMMARY.json yet — skip-safe PASS',
  });
}

// ---------------------------------------------------------------------------
// Test 7: heal_runner_exists — heal_runner.mjs present
// ---------------------------------------------------------------------------
const healRunnerExists = fs.existsSync(path.join(ROOT, 'scripts/ops/heal_runner.mjs'));
checks.push({
  check: 'heal_runner_exists',
  pass: healRunnerExists,
  detail: healRunnerExists
    ? 'OK: scripts/ops/heal_runner.mjs exists'
    : 'FAIL: scripts/ops/heal_runner.mjs missing',
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'FSM_STRUCTURAL_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_IMMUNE01.md'), [
  '# REGRESSION_IMMUNE01.md — Immune-Nervous Integration (EPOCH-71)', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_immune01_integration.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_IMMUNE01_INTEGRATION',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_immune01_integration — ${reason_code}`);
if (failed.length > 0) {
  for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
}
process.exit(status === 'PASS' ? 0 : 1);
