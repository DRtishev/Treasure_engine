/**
 * regression_court_wiring02_guard_rejects_empty.mjs — RG_COURT_WIRING02
 *
 * SPRINT-0 regression gate: Ensures guard_backtest_pass REJECTS candidates
 * with empty or missing court_verdicts (fail-closed enforcement).
 *
 * Prevents FINDING-B recurrence: candidates must have court verdicts to advance.
 *
 * Checks:
 *   1. guard rejects when court_verdicts = [] (empty array)
 *   2. guard rejects when court_verdicts is missing (undefined)
 *   3. guard rejects when court_verdicts has no edge_lab entry (no courts array)
 *   4. guard PASSES with valid court_verdicts containing courts array
 *   5. guard rejects BLOCKED verdict
 *   6. guard rejects NOT_ELIGIBLE verdict
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_court_wiring02.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:court-wiring02-guard-rejects-empty';
const checks = [];

// Read candidate_fsm.mjs source to extract guard_backtest_pass logic
// We test the actual guard function by dynamic import
const FSM_PATH = path.join(ROOT, 'scripts/ops/candidate_fsm.mjs');

if (!fs.existsSync(FSM_PATH)) {
  checks.push({ check: 'fsm_exists', pass: false, detail: 'FAIL: candidate_fsm.mjs not found' });
} else {
  // We can't import guard_backtest_pass directly (it's not exported).
  // Instead, we test via CandidateFSM transition with controlled candidate data.
  const { CandidateFSM, loadCandidateKernel } = await import(path.join(ROOT, 'scripts/ops/candidate_fsm.mjs'));
  const kernel = loadCandidateKernel();
  const policyPath = path.join(ROOT, 'specs/fleet_policy.json');
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

  function tryTransition(candidateOverrides, label) {
    const base = {
      id: 'test_guard',
      config_id: 'test_guard',
      fsm_state: 'DRAFT',
      fsm_history: [],
      metrics: { backtest_sharpe: 1.5, total_trades: 50 },
      robustness: { leakage_pass: true },
      risk: { score: 0.1 },
    };
    const candidate = { ...base, ...candidateOverrides };
    const fsm = new CandidateFSM(candidate, kernel, policy, 'TEST_TICK');
    const result = fsm.transition('CT01_DRAFT_TO_BACKTESTED');
    return result;
  }

  // Check 1: empty court_verdicts → FAIL
  const r1 = tryTransition({ court_verdicts: [] }, 'empty_verdicts');
  checks.push({
    check: 'rejects_empty_verdicts',
    pass: !r1.success,
    detail: r1.success ? 'FAIL: guard PASSED with empty court_verdicts' : `OK: guard rejected — ${r1.detail}`,
  });

  // Check 2: missing court_verdicts → FAIL
  const r2 = tryTransition({}, 'missing_verdicts');
  checks.push({
    check: 'rejects_missing_verdicts',
    pass: !r2.success,
    detail: r2.success ? 'FAIL: guard PASSED with missing court_verdicts' : `OK: guard rejected — ${r2.detail}`,
  });

  // Check 3: court_verdicts with no courts array → FAIL
  const r3 = tryTransition({ court_verdicts: [{ verdict: 'PIPELINE_ELIGIBLE' }] }, 'no_courts_array');
  checks.push({
    check: 'rejects_no_courts_array',
    pass: !r3.success,
    detail: r3.success ? 'FAIL: guard PASSED without courts array' : `OK: guard rejected — ${r3.detail}`,
  });

  // Check 4: valid court_verdicts with courts → PASS
  const validVerdicts = [{
    verdict: 'PIPELINE_ELIGIBLE',
    courts: [
      { court: 'DatasetCourt', verdict: 'PIPELINE_ELIGIBLE' },
      { court: 'OverfitCourt', verdict: 'TESTING_SET_ELIGIBLE' },
    ],
    evidence_manifest: {},
  }];
  const r4 = tryTransition({ court_verdicts: validVerdicts }, 'valid_verdicts');
  checks.push({
    check: 'passes_valid_verdicts',
    pass: r4.success,
    detail: r4.success ? `OK: guard passed — ${r4.detail}` : `FAIL: guard rejected valid verdicts — ${r4.detail}`,
  });

  // Check 5: BLOCKED verdict → FAIL
  const blockedVerdicts = [{
    verdict: 'BLOCKED',
    courts: [{ court: 'DatasetCourt', verdict: 'BLOCKED' }],
    evidence_manifest: {},
  }];
  const r5 = tryTransition({ court_verdicts: blockedVerdicts }, 'blocked_verdict');
  checks.push({
    check: 'rejects_blocked_verdict',
    pass: !r5.success,
    detail: r5.success ? 'FAIL: guard PASSED with BLOCKED verdict' : `OK: guard rejected — ${r5.detail}`,
  });

  // Check 6: NOT_ELIGIBLE verdict → FAIL
  const notEligibleVerdicts = [{
    verdict: 'NOT_ELIGIBLE',
    courts: [{ court: 'OverfitCourt', verdict: 'NOT_ELIGIBLE' }],
    evidence_manifest: {},
  }];
  const r6 = tryTransition({ court_verdicts: notEligibleVerdicts }, 'not_eligible_verdict');
  checks.push({
    check: 'rejects_not_eligible_verdict',
    pass: !r6.success,
    detail: r6.success ? 'FAIL: guard PASSED with NOT_ELIGIBLE verdict' : `OK: guard rejected — ${r6.detail}`,
  });
}

// Verdict
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_COURT_WIRING02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_COURT_WIRING02.md'), [
  '# RG_COURT_WIRING02: Guard Rejects Empty Court Verdicts', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_court_wiring02.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_COURT_WIRING02',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_court_wiring02_guard_rejects_empty — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
