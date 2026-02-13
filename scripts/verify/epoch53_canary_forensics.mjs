#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveEvidenceWriteContext } from '../../core/evidence/evidence_write_mode.mjs';
import { runCanaryController } from '../../core/canary/canary_runner.mjs';
import { runEpoch53Fitness } from '../../core/canary/fitness_suite.mjs';
import { listReasonCodes } from '../../core/canary/reason_codes.mjs';

const epoch = process.env.EVIDENCE_EPOCH || 'EPOCH-53';
const { manualDir, fitnessDir } = resolveEvidenceWriteContext(epoch);

let passed = 0; let failed = 0;
const checks = [];
const check = (ok, msg) => { checks.push({ ok, msg }); if (ok) { passed += 1; console.log(`✓ ${msg}`); } else { failed += 1; console.error(`✗ ${msg}`); } };

const base = { market_dataset_id: 'e49_fixture', market_provider: 'binance', fills_dataset_id: 'epoch50_fixture', fills_provider: 'binance', seed: 5301, strict: false, thresholds: { max_reality_gap: 0.6, max_risk_events: 0, max_exposure_usd: 500, max_dd_speed: 0.03, max_vol_spike: 0.5, max_data_gap_count: 0 } };

const forensic = runCanaryController({ ...base, mode: 'PAPER', scenario: 'gap_down', crisis_mode: true });
const forensic2 = runCanaryController({ ...base, mode: 'PAPER', scenario: 'gap_down', crisis_mode: true });
const fitness = runEpoch53Fitness(base);

check(listReasonCodes().length >= 5, 'reason codes taxonomy exists');
check(forensic.report.pause_events.length > 0 && forensic.report.pause_events.every((e) => e.code && e.metric), 'pause events include reason codes + metrics');
check(forensic.report.risk_events.length > 0 && forensic.report.risk_events.every((e) => e.code && e.state_transition), 'risk events include reason codes + transitions');
check(Object.keys(forensic.report.thresholds_used || {}).length >= 6, 'thresholds_used is complete');
check(forensic.fingerprint === forensic2.fingerprint, 'determinism x2 identical fingerprints');
check(Array.isArray(fitness.scenarios) && fitness.scenarios.length === 5 && Number.isFinite(fitness.fitness_score), 'fitness suite output generated');

const outForensics = {
  epoch: 'EPOCH-53',
  fingerprint: forensic.fingerprint,
  pause_events: forensic.report.pause_events,
  risk_events: forensic.report.risk_events,
  thresholds_used: forensic.report.thresholds_used,
  decision_trace: forensic.report.decision_trace
};

fs.mkdirSync(fitnessDir, { recursive: true });
fs.writeFileSync(path.join(manualDir, 'canary_forensics_report.json'), JSON.stringify(outForensics, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'epoch53_fitness.json'), JSON.stringify(fitness, null, 2) + '\n');
fs.writeFileSync(path.join(fitnessDir, 'epoch53_fitness.json'), JSON.stringify(fitness, null, 2) + '\n');

const result = { epoch: 'EPOCH-53', status: failed === 0 ? 'PASS' : 'FAIL', passed, failed, fingerprint: forensic.fingerprint, fitness_score: fitness.fitness_score, checks };
fs.writeFileSync(path.join(manualDir, 'verify_epoch53_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed) process.exit(1);
console.log(`PASS verify:epoch53 checks=${passed}`);
