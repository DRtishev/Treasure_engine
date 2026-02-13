#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runPaperFitnessLab } from '../../core/paper/paper_fitness_lab.mjs';
import { runCanaryController } from '../../core/canary/canary_runner.mjs';

const root = process.cwd();
const epoch = process.env.EVIDENCE_EPOCH || 'EPOCH-56';
const manualDir = path.join(root, 'reports/evidence', epoch, 'gates', 'manual');
fs.mkdirSync(manualDir, { recursive: true });

let passed = 0; let failed = 0;
const checks = [];
const check = (ok, msg) => { checks.push({ ok, msg }); if (ok) { passed += 1; console.log(`✓ ${msg}`); } else { failed += 1; console.error(`✗ ${msg}`); } };

const fitness = runPaperFitnessLab({ seed: 5601, strict: true, purpose: 'tuning' });
const scores = fitness.all_results.map((x) => x.fitness_score);
const uniqueScores = new Set(scores.map((x) => x.toFixed(6)));
check(uniqueScores.size >= 2, 'fitness v2 non-constant across scenarios');
check(fitness.all_results.every((x) => x.metrics && Number.isFinite(x.metrics.pnl_net) && Number.isFinite(x.metrics.max_dd) && Number.isFinite(x.metrics.trade_count) && Number.isFinite(x.metrics.pause_count) && Number.isFinite(x.metrics.risk_events_count) && Number.isFinite(x.metrics.stability_penalty) && Number.isFinite(x.metrics.data_quality_penalty)), 'fitness v2 emits required per-scenario metrics');

const vaultExpectedFail = (() => {
  try {
    runPaperFitnessLab({ seed: 5601, strict: true, purpose: 'tuning', market_dataset_id: 'e56_vault_fixture' });
    return { ok: false, reason: 'vault dataset incorrectly allowed in strict tuning mode' };
  } catch (err) {
    return { ok: String(err?.code || err?.message).includes('FAIL_VAULT_DATASET_FOR_TUNING'), reason: String(err?.code || err?.message) };
  }
})();
check(vaultExpectedFail.ok, 'vault policy strict expected-fail enforced for tuning sweep');

const canary = runCanaryController({
  mode: 'GUARDED_LIVE',
  market_dataset_id: 'e49_fixture',
  fills_dataset_id: 'epoch50_fixture',
  strict: true,
  crisis_mode: true,
  thresholds: { max_reality_gap: 0.9, max_risk_events: 0, max_exposure_usd: 500 }
});
const canary2 = runCanaryController({
  mode: 'GUARDED_LIVE',
  market_dataset_id: 'e49_fixture',
  fills_dataset_id: 'epoch50_fixture',
  strict: true,
  crisis_mode: true,
  thresholds: { max_reality_gap: 0.9, max_risk_events: 0, max_exposure_usd: 500 }
});

check(canary.fingerprint === canary2.fingerprint, 'pause-recover deterministic x2 fingerprint invariant');
check((canary.report.recovery_transitions?.length ?? 0) >= 4, 'pause-recover transition trace generated');
check(canary.report.invariants.hard_stop_enforced === true, 'hard stop remains enforced during recovery');
check(canary.submissionPlan?.submitted === false && canary.submissionPlan?.submitted_actions === 0, 'recovery flow does not submit any action');

const fitnessOut = {
  schema_version: '1.0.0',
  formula: fitness.all_results[0]?.score_formula,
  best_score: Math.max(...scores),
  worst_score: Math.min(...scores),
  unique_score_count: uniqueScores.size,
  scenarios: fitness.all_results
};
fs.writeFileSync(path.join(manualDir, 'epoch56_fitness_v2.json'), JSON.stringify(fitnessOut, null, 2) + '\n');

const vaultOut = {
  schema_version: '1.0.0',
  expected_fail: vaultExpectedFail,
  policy: 'strict tuning must reject tier=vault datasets'
};
fs.writeFileSync(path.join(manualDir, 'vault_policy_test.json'), JSON.stringify(vaultOut, null, 2) + '\n');

const traceLines = canary.report.recovery_transitions.map((x) => JSON.stringify(x)).join('\n');
fs.writeFileSync(path.join(manualDir, 'pause_recover_trace.jsonl'), `${traceLines}\n`);

const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ fitnessOut, vaultOut, canary: canary.report })).digest('hex');
const result = { epoch: 'EPOCH-56', status: failed === 0 ? 'PASS' : 'FAIL', passed, failed, fingerprint, checks };
fs.writeFileSync(path.join(manualDir, 'verify_epoch56_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed) process.exit(1);
console.log(`PASS verify:epoch56 checks=${passed}`);
