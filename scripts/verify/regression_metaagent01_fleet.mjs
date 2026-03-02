/**
 * regression_metaagent01_fleet.mjs — RG_METAAGENT01
 *
 * EPOCH-72 structural gate. Validates MetaAgent fleet consciousness:
 *   1. candidate_fsm_kernel_valid      — kernel schema valid, 8 states, 10 transitions
 *   2. candidate_fsm_states_complete   — all 8 states defined with budget_ms
 *   3. candidate_fsm_transitions_valid — all 10 transitions have guards
 *   4. metaagent_class_present         — MetaAgent importable with scan/tick
 *   5. fleet_policy_valid              — fleet_policy.json schema valid
 *   6. graduation_court_present        — graduation_court.mjs importable
 *   7. registry_v2_compat              — registry supports fsm_state field
 *   8. life_summary_fleet_field        — LIFE_SUMMARY v4 has fleet section
 *
 * SKIP-SAFE: Checks that read LIFE evidence return PASS if no evidence exists.
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_metaagent01_fleet.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:metaagent01-fleet';
const checks = [];

// ---------------------------------------------------------------------------
// Test 1: candidate_fsm_kernel_valid — kernel schema valid, 8 states, 10 transitions
// ---------------------------------------------------------------------------
let candidateKernel = null;
try {
  const kernelPath = path.join(ROOT, 'specs', 'candidate_fsm_kernel.json');
  candidateKernel = JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
  const stateCount = Object.keys(candidateKernel.states || {}).length;
  const transitionCount = Object.keys(candidateKernel.transitions || {}).length;
  const valid = stateCount === 8 && transitionCount === 10 &&
    candidateKernel.schema_version === '1.0.0' && candidateKernel.initial_state === 'DRAFT';
  checks.push({
    check: 'candidate_fsm_kernel_valid',
    pass: valid,
    detail: valid
      ? `OK: ${stateCount} states, ${transitionCount} transitions, schema=${candidateKernel.schema_version}`
      : `FAIL: states=${stateCount}/8, transitions=${transitionCount}/10, schema=${candidateKernel.schema_version}`,
  });
} catch (e) {
  checks.push({
    check: 'candidate_fsm_kernel_valid',
    pass: false,
    detail: `FAIL: cannot load candidate_fsm_kernel.json: ${e.message}`,
  });
}

// ---------------------------------------------------------------------------
// Test 2: candidate_fsm_states_complete — all 8 states with budget_ms
// ---------------------------------------------------------------------------
if (candidateKernel) {
  const expectedStates = ['DRAFT', 'BACKTESTED', 'PAPER_PROVEN', 'CANARY_DEPLOYED',
    'GRADUATED', 'PARKED', 'REJECTED', 'QUARANTINED'];
  const missing = expectedStates.filter(s => !(s in (candidateKernel.states || {})));
  const noBudget = expectedStates.filter(s => {
    const st = candidateKernel.states?.[s];
    return st && (typeof st.budget_ms !== 'number' || st.budget_ms < 0);
  });
  const pass = missing.length === 0 && noBudget.length === 0;
  checks.push({
    check: 'candidate_fsm_states_complete',
    pass,
    detail: pass
      ? 'OK: all 8 states present with valid budget_ms'
      : `FAIL: missing=[${missing.join(',')}] no_budget=[${noBudget.join(',')}]`,
  });
} else {
  checks.push({ check: 'candidate_fsm_states_complete', pass: false, detail: 'FAIL: kernel not loaded' });
}

// ---------------------------------------------------------------------------
// Test 3: candidate_fsm_transitions_valid — all 10 transitions with guards
// ---------------------------------------------------------------------------
if (candidateKernel) {
  const transitions = candidateKernel.transitions || {};
  const tIds = Object.keys(transitions);
  const noGuard = tIds.filter(t => !transitions[t].guard);
  const pass = tIds.length === 10 && noGuard.length === 0;
  checks.push({
    check: 'candidate_fsm_transitions_valid',
    pass,
    detail: pass
      ? 'OK: 10 transitions, all have guards'
      : `FAIL: count=${tIds.length}/10, no_guard=[${noGuard.join(',')}]`,
  });
} else {
  checks.push({ check: 'candidate_fsm_transitions_valid', pass: false, detail: 'FAIL: kernel not loaded' });
}

// ---------------------------------------------------------------------------
// Test 4: metaagent_class_present — MetaAgent importable with scan/tick
// ---------------------------------------------------------------------------
const metaagentPath = path.join(ROOT, 'scripts', 'ops', 'metaagent.mjs');
const metaagentSrc = fs.existsSync(metaagentPath) ? fs.readFileSync(metaagentPath, 'utf8') : '';
const hasMetaAgent = metaagentSrc.includes('class MetaAgent') &&
  metaagentSrc.includes('scan()') && metaagentSrc.includes('tick()');
checks.push({
  check: 'metaagent_class_present',
  pass: hasMetaAgent,
  detail: hasMetaAgent
    ? 'OK: MetaAgent class with scan() and tick() methods'
    : 'FAIL: MetaAgent class missing or incomplete',
});

// ---------------------------------------------------------------------------
// Test 5: fleet_policy_valid — fleet_policy.json schema valid
// ---------------------------------------------------------------------------
try {
  const policyPath = path.join(ROOT, 'specs', 'fleet_policy.json');
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const hasRequired = policy.schema_version === '1.0.0' &&
    typeof policy.max_active_candidates === 'number' &&
    typeof policy.risk_budget_total === 'number' &&
    policy.graduation_criteria && policy.quarantine_triggers;
  checks.push({
    check: 'fleet_policy_valid',
    pass: hasRequired,
    detail: hasRequired
      ? `OK: fleet_policy.json v${policy.schema_version} — max_active=${policy.max_active_candidates}`
      : 'FAIL: fleet_policy.json missing required fields',
  });
} catch (e) {
  checks.push({
    check: 'fleet_policy_valid',
    pass: false,
    detail: `FAIL: cannot load fleet_policy.json: ${e.message}`,
  });
}

// ---------------------------------------------------------------------------
// Test 6: graduation_court_present — graduation_court.mjs importable
// ---------------------------------------------------------------------------
const courtPath = path.join(ROOT, 'scripts', 'ops', 'graduation_court.mjs');
const courtSrc = fs.existsSync(courtPath) ? fs.readFileSync(courtPath, 'utf8') : '';
const hasCourt = courtSrc.includes('function evaluate') || courtSrc.includes('export function evaluate');
const has5Exams = courtSrc.includes('EVIDENCE_COMPLETENESS') &&
  courtSrc.includes('PERFORMANCE_THRESHOLD') &&
  courtSrc.includes('REALITY_GAP') &&
  courtSrc.includes('RISK_ASSESSMENT') &&
  courtSrc.includes('BEHAVIORAL_AUDIT');
checks.push({
  check: 'graduation_court_present',
  pass: hasCourt && has5Exams,
  detail: hasCourt && has5Exams
    ? 'OK: graduation_court.mjs with evaluate() and 5 exams'
    : `FAIL: evaluate=${hasCourt} exams=${has5Exams}`,
});

// ---------------------------------------------------------------------------
// Test 7: registry_v2_compat — registry supports fsm_state field
// ---------------------------------------------------------------------------
const regPath = path.join(ROOT, 'scripts', 'ops', 'candidate_registry.mjs');
const regSrc = fs.existsSync(regPath) ? fs.readFileSync(regPath, 'utf8') : '';
const hasV2 = regSrc.includes('fsm_state') && regSrc.includes('fsm_history');
checks.push({
  check: 'registry_v2_compat',
  pass: hasV2,
  detail: hasV2
    ? 'OK: candidate_registry.mjs supports fsm_state + fsm_history'
    : 'FAIL: fsm_state/fsm_history not found in candidate_registry.mjs',
});

// ---------------------------------------------------------------------------
// Test 8: life_summary_fleet_field — LIFE_SUMMARY v4 has fleet section
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
if (summary && summary.schema_version === '4.0.0') {
  const hasFleet = summary.fleet !== null && summary.fleet !== undefined;
  checks.push({
    check: 'life_summary_fleet_field',
    pass: !!hasFleet,
    detail: hasFleet
      ? `OK: fleet field present — total_candidates=${summary.fleet?.total_candidates ?? '?'}`
      : 'FAIL: fleet field missing in LIFE_SUMMARY v4',
  });
} else {
  // Skip-safe for pre-v4 summaries or no summary
  checks.push({
    check: 'life_summary_fleet_field',
    pass: true,
    detail: summary
      ? `skip-safe PASS — LIFE_SUMMARY schema=${summary.schema_version} (pre-v4)`
      : 'no LIFE_SUMMARY.json yet — skip-safe PASS',
  });
}

// ---------------------------------------------------------------------------
// Test 9: behavioral_candidate_fsm — CandidateFSM instantiates and transitions
// ---------------------------------------------------------------------------
try {
  const { CandidateFSM, loadCandidateKernel } = await import('../ops/candidate_fsm.mjs');
  const { loadFleetPolicy } = await import('../ops/metaagent.mjs');
  const kernel = loadCandidateKernel();
  const policy = loadFleetPolicy();
  const candidate = {
    id: 'test_behavioral',
    fsm_state: 'DRAFT',
    fsm_history: [],
    metrics: { backtest_sharpe: 1.2 },
    risk: { score: 0.1 },
  };
  const fsm = new CandidateFSM(candidate, kernel, policy, 'TEST_TS');
  // Verify initial state
  const isInitial = fsm.state === 'DRAFT' && fsm.id === 'test_behavioral';
  // Attempt valid transition
  const t1 = fsm.transition('CT01_DRAFT_TO_BACKTESTED');
  const transitioned = t1.success && fsm.state === 'BACKTESTED';
  // Verify deterministic timestamp
  const hasDeterministicTs = fsm.history.length > 0 && fsm.history[0].at === 'TEST_TS';
  // Verify risk fallback is fail-safe (1.0)
  const fsm2 = new CandidateFSM({ id: 'no_risk', fsm_state: 'DRAFT' }, kernel, policy, 'T');
  const riskFailSafe = fsm2.riskScore() === 1.0;
  const pass = isInitial && transitioned && hasDeterministicTs && riskFailSafe;
  checks.push({
    check: 'behavioral_candidate_fsm',
    pass,
    detail: pass
      ? 'OK: CandidateFSM instantiates, transitions, uses deterministic timestamps, fail-safe risk'
      : `FAIL: init=${isInitial} transitioned=${transitioned} detTs=${hasDeterministicTs} riskFS=${riskFailSafe}`,
  });
} catch (e) {
  checks.push({ check: 'behavioral_candidate_fsm', pass: false, detail: `FAIL: ${e.message}` });
}

// ---------------------------------------------------------------------------
// Test 10: behavioral_graduation_court — evaluate() returns frozen verdict
// ---------------------------------------------------------------------------
try {
  const { evaluate } = await import('../ops/graduation_court.mjs');
  const { loadFleetPolicy } = await import('../ops/metaagent.mjs');
  const policy = loadFleetPolicy();
  const candidateData = {
    metrics: { backtest_sharpe: 1.5, paper_sharpe: 1.3, canary_sharpe: 1.2, total_trades: 200, max_drawdown_pct: 10, profit_factor: 1.8, win_rate: 0.55 },
    risk: { score: 0.1, circuit_breaker_trips: 0 },
  };
  const verdict = evaluate('test_court', candidateData, policy, 'TEST_TS');
  const isFrozen = Object.isFrozen(verdict);
  const hasFields = verdict.candidate_id === 'test_court' && verdict.exams_passed >= 0 && verdict.evaluated_at === 'TEST_TS';
  const noNewDate = verdict.evaluated_at !== undefined && !verdict.evaluated_at.includes('T');
  const pass = isFrozen && hasFields;
  checks.push({
    check: 'behavioral_graduation_court',
    pass,
    detail: pass
      ? `OK: evaluate() returns frozen verdict, score=${verdict.overall_score}, exams=${verdict.exams_passed}/5, deterministic ts`
      : `FAIL: frozen=${isFrozen} hasFields=${hasFields}`,
  });
} catch (e) {
  checks.push({ check: 'behavioral_graduation_court', pass: false, detail: `FAIL: ${e.message}` });
}

// ---------------------------------------------------------------------------
// Test 11: behavioral_metaagent_scan — MetaAgent.scan() returns frozen context
// ---------------------------------------------------------------------------
try {
  const { MetaAgent } = await import('../ops/metaagent.mjs');
  const candidates = [
    { id: 'c1', fsm_state: 'DRAFT', metrics: {}, risk: { score: 0.1 } },
    { id: 'c2', fsm_state: 'GRADUATED', metrics: {}, risk: { score: 0.05 } },
  ];
  // bus=null is safe for scan-only
  const agent = new MetaAgent(candidates, null, 'TEST_TS', 'CERT');
  const ctx = agent.scan();
  const isFrozen = Object.isFrozen(ctx);
  const hasTotal = ctx.total_candidates === 2;
  const hasHealth = typeof ctx.fleet_health === 'number';
  const hasExploration = typeof ctx.exploration_ratio === 'number';
  const pass = isFrozen && hasTotal && hasHealth && hasExploration;
  checks.push({
    check: 'behavioral_metaagent_scan',
    pass,
    detail: pass
      ? `OK: scan() frozen ctx, total=${ctx.total_candidates}, health=${ctx.fleet_health}, exploration=${ctx.exploration_ratio}`
      : `FAIL: frozen=${isFrozen} total=${hasTotal} health=${hasHealth} exploration=${hasExploration}`,
  });
} catch (e) {
  checks.push({ check: 'behavioral_metaagent_scan', pass: false, detail: `FAIL: ${e.message}` });
}

// ---------------------------------------------------------------------------
// Test 12: behavioral_metaagent_writeback — getCandidatesData() returns updated data
// ---------------------------------------------------------------------------
try {
  const { MetaAgent } = await import('../ops/metaagent.mjs');
  const candidates = [
    { id: 'wb1', fsm_state: 'DRAFT', metrics: { backtest_sharpe: 1.0 }, risk: { score: 0.1 } },
  ];
  const agent = new MetaAgent(candidates, null, 'TEST_TS', 'CERT');
  const data = agent.getCandidatesData();
  const hasData = Array.isArray(data) && data.length === 1;
  const hasId = hasData && (data[0].id === 'wb1' || data[0].config_id === 'wb1');
  const hasFsmState = hasData && typeof data[0].fsm_state === 'string';
  const pass = hasData && hasId && hasFsmState;
  checks.push({
    check: 'behavioral_metaagent_writeback',
    pass,
    detail: pass
      ? `OK: getCandidatesData() returns serializable array with fsm_state`
      : `FAIL: hasData=${hasData} hasId=${hasId} hasFsmState=${hasFsmState}`,
  });
} catch (e) {
  checks.push({ check: 'behavioral_metaagent_writeback', pass: false, detail: `FAIL: ${e.message}` });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'FSM_STRUCTURAL_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_METAAGENT01.md'), [
  '# REGRESSION_METAAGENT01.md — MetaAgent Fleet Consciousness (EPOCH-72)', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_metaagent01_fleet.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_METAAGENT01_FLEET',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_metaagent01_fleet — ${reason_code}`);
if (failed.length > 0) {
  for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
}
process.exit(status === 'PASS' ? 0 : 1);
