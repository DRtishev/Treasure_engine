#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runCanaryController } from '../../core/canary/canary_runner.mjs';

const root = process.cwd();
const epoch = process.env.EVIDENCE_EPOCH || 'EPOCH-52';
const manualDir = path.join(root, 'reports/evidence', epoch, 'gates', 'manual');
fs.mkdirSync(manualDir, { recursive: true });

let passed = 0;
let failed = 0;
const checks = [];
const check = (ok, msg) => {
  checks.push({ ok, msg });
  if (ok) { passed += 1; console.log(`✓ ${msg}`); }
  else { failed += 1; console.error(`✗ ${msg}`); }
};

const base = {
  market_dataset_id: 'e49_fixture',
  market_provider: 'binance',
  fills_dataset_id: 'epoch50_fixture',
  fills_provider: 'binance',
  seed: 5201,
  strict: false,
  thresholds: { max_reality_gap: 0.9, max_risk_events: 0, max_exposure_usd: 500 }
};

const shadow = runCanaryController({ ...base, mode: 'SHADOW' });
check(Array.isArray(shadow.stateLog) && shadow.stateLog.length > 0, 'SHADOW mode produces state log');
check(!shadow.submissionPlan, 'SHADOW mode has no submission plan');

const paper = runCanaryController({ ...base, mode: 'PAPER' });
check(typeof paper.report.metrics.paper_pnl === 'number', 'PAPER mode produces paper pnl metric');
check(!paper.submissionPlan, 'PAPER mode has no submission plan');

const guarded = runCanaryController({ ...base, mode: 'GUARDED_LIVE' });
check(Boolean(guarded.submissionPlan), 'GUARDED_LIVE mode produces submission plan');
check(guarded.submissionPlan?.submitted === false && guarded.submissionPlan?.submitted_actions === 0, 'GUARDED_LIVE never submits actions');

const det1 = runCanaryController({ ...base, mode: 'PAPER', crisis_mode: true });
const det2 = runCanaryController({ ...base, mode: 'PAPER', crisis_mode: true });
check(det1.fingerprint === det2.fingerprint, 'determinism x2 fingerprint invariant');
check(det1.report.metrics.pause_triggers >= 1, 'auto-pause triggers on injected crisis scenario');

const strictOverfit = (() => {
  try {
    runCanaryController({ ...base, mode: 'SHADOW', strict: true, overfit_metrics_path: 'reports/evidence/EPOCH-43/gates/manual/missing_overfit_metrics.json' });
    return false;
  } catch {
    return true;
  }
})();
check(strictOverfit, 'strict mode expected-fail when overfit metrics missing');

fs.writeFileSync(path.join(manualDir, 'canary_run_report.json'), JSON.stringify(det1.report, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'canary_state_log.jsonl'), `${det1.stateLog.map((r) => JSON.stringify(r)).join('\n')}\n`);
fs.writeFileSync(path.join(manualDir, 'submission_plan.json'), JSON.stringify(guarded.submissionPlan, null, 2) + '\n');

const result = { epoch: 'EPOCH-52', status: failed === 0 ? 'PASS' : 'FAIL', passed, failed, fingerprint: det1.fingerprint, paper_pnl: paper.report.metrics.paper_pnl, risk_events_count: det1.report.metrics.risk_events_count, pause_triggers: det1.report.metrics.pause_triggers, checks };
fs.writeFileSync(path.join(manualDir, 'verify_epoch52_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed > 0) process.exit(1);
console.log(`PASS verify:epoch52 checks=${passed}`);
