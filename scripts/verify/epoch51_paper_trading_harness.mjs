#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runPaperTradingSession } from '../../core/paper/paper_trading_harness.mjs';
import { calibrateExecutionRealismFromPrivateFills } from '../../core/edge/execution_realism.mjs';

const root = process.cwd();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-51';
const manualDir = path.join(root, 'reports/evidence', evidenceEpoch, 'gates', 'manual');
fs.mkdirSync(manualDir, { recursive: true });

let passed = 0;
let failed = 0;
const checks = [];
const check = (ok, msg) => {
  checks.push({ ok, msg });
  if (ok) { passed += 1; console.log(`✓ ${msg}`); }
  else { failed += 1; console.error(`✗ ${msg}`); }
};

const src = 'data/fixtures/private/epoch50_fixture/fills_fixture.csv';
const ingestA = spawnSync('node', ['scripts/data/ingest_private_fills.mjs', '--source', src, '--provider', 'binance', '--dataset', 'epoch51_rechunk_a', '--strict', '--chunk-size', '1', '--account-label', 'acct-fixture'], { encoding: 'utf8' });
const ingestB = spawnSync('node', ['scripts/data/ingest_private_fills.mjs', '--source', src, '--provider', 'binance', '--dataset', 'epoch51_rechunk_b', '--strict', '--chunk-size', '3', '--account-label', 'acct-fixture'], { encoding: 'utf8' });
check(ingestA.status === 0 && ingestB.status === 0, 'rechunk ingest variants succeed');

const mA = JSON.parse(fs.readFileSync('data/manifests/epoch51_rechunk_a.fills.manifest.json', 'utf8'));
const mB = JSON.parse(fs.readFileSync('data/manifests/epoch51_rechunk_b.fills.manifest.json', 'utf8'));
check(mA.dataset_fingerprint === mB.dataset_fingerprint, 'rechunk dataset fingerprint invariant');

const cA = calibrateExecutionRealismFromPrivateFills({ fills_dataset_id: 'epoch51_rechunk_a', provider: 'binance', strict: true, seed: 5151 });
const cB = calibrateExecutionRealismFromPrivateFills({ fills_dataset_id: 'epoch51_rechunk_b', provider: 'binance', strict: true, seed: 5151 });
check(cA.outputs_hash === cB.outputs_hash && JSON.stringify(cA.params) === JSON.stringify(cB.params), 'rechunk calibration manifest invariant');

const s1 = runPaperTradingSession({ market_dataset_id: 'e49_fixture', fills_dataset_id: 'epoch51_rechunk_a', strict: true, seed: 5151, shadow_only: true });
const s2 = runPaperTradingSession({ market_dataset_id: 'e49_fixture', fills_dataset_id: 'epoch51_rechunk_a', strict: true, seed: 5151, shadow_only: true });
check(s1.fingerprint.output_fingerprint === s2.fingerprint.output_fingerprint, 'paper session deterministic x2');
check(s1.report.metrics.hard_stops_triggered >= 1, 'risk fortress hard stop triggered in fixture session');
check(s1.report.metrics.paper_fills >= 1, 'paper fills produced');

const strictMissing = spawnSync('node', ['-e', "import { calibrateExecutionRealismFromPrivateFills } from './core/edge/execution_realism.mjs'; calibrateExecutionRealismFromPrivateFills({fills_dataset_id:'missing_ds',provider:'binance'});"], { env: { ...process.env, EXEC_REALISM_STRICT: '1' }, encoding: 'utf8' });
check(strictMissing.status !== 0, 'strict expected-fail on missing REAL fills dataset');

const rechunk = {
  dataset_fingerprint_a: mA.dataset_fingerprint,
  dataset_fingerprint_b: mB.dataset_fingerprint,
  calibration_fingerprint_a: cA.outputs_hash,
  calibration_fingerprint_b: cB.outputs_hash,
  pass: mA.dataset_fingerprint === mB.dataset_fingerprint && cA.outputs_hash === cB.outputs_hash
};

fs.writeFileSync(path.join(manualDir, 'session_report.json'), JSON.stringify(s1.report, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'session_fingerprint.json'), JSON.stringify(s1.fingerprint, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'calibration_manifest.json'), JSON.stringify(cA.manifest, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'rechunk_test_result.json'), JSON.stringify(rechunk, null, 2) + '\n');

const result = {
  epoch: 'EPOCH-51',
  status: failed === 0 ? 'PASS' : 'FAIL',
  passed,
  failed,
  paper_metrics: s1.report.metrics,
  strict_expected_fail: strictMissing.status !== 0,
  checks
};
fs.writeFileSync(path.join(manualDir, 'verify_epoch51_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed > 0) process.exit(1);
console.log(`PASS verify:epoch51 checks=${passed}`);
