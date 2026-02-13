#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { calibrateExecutionRealismFromPrivateFills } from '../../core/edge/execution_realism.mjs';

const root = process.cwd();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-50';
const runLabel = process.env.RUN_LABEL || 'manual';
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

const fixtureSrc = 'data/fixtures/private/epoch50_fixture/fills_fixture.csv';
const negativeSrc = 'data/fixtures/private/epoch50_fixture/fills_negative_missing_id.csv';

const ingest = spawnSync('node', ['scripts/data/ingest_private_fills.mjs', '--source', fixtureSrc, '--provider', 'binance', '--dataset', 'epoch50_fixture', '--strict', '--account-label', 'acct-fixture', '--venue', 'binance'], { encoding: 'utf8' });
check(ingest.status === 0, 'strict ingest succeeds for fixture with fill_id');

const manifestPath = path.resolve('data/manifests/epoch50_fixture.fills.manifest.json');
const qualityPath = path.resolve('data/private/normalized/binance/epoch50_fixture/private_quality_report.json');
check(fs.existsSync(manifestPath), 'fills dataset manifest exists');
check(fs.existsSync(qualityPath), 'private quality report exists');

const cal1 = calibrateExecutionRealismFromPrivateFills({ fills_dataset_id: 'epoch50_fixture', provider: 'binance', strict: false, seed: 5050 });
const cal2 = calibrateExecutionRealismFromPrivateFills({ fills_dataset_id: 'epoch50_fixture', provider: 'binance', strict: false, seed: 5050 });
check(cal1.mode === 'REAL', 'fixture calibration runs in REAL mode');
check(cal1.manifest_fingerprint === cal2.manifest_fingerprint, 'calibration deterministic fingerprint stable');

const strictEnv = { ...process.env, EXEC_REALISM_STRICT: '1' };
const strictProbe = spawnSync('node', ['-e', "import { calibrateExecutionRealismFromPrivateFills } from './core/edge/execution_realism.mjs'; const r=calibrateExecutionRealismFromPrivateFills({fills_dataset_id:'epoch50_fixture',provider:'binance'}); console.log(r.mode);"], { encoding: 'utf8', env: strictEnv });
check(strictProbe.status === 0, 'strict calibration succeeds on valid fixture');

const neg = spawnSync('node', ['scripts/data/ingest_private_fills.mjs', '--source', negativeSrc, '--provider', 'binance', '--dataset', 'epoch50_negative', '--strict'], { encoding: 'utf8' });
check(neg.status !== 0, 'strict-mode negative test fails when fill_id missing (expected fail)');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const quality = JSON.parse(fs.readFileSync(qualityPath, 'utf8'));

fs.writeFileSync(path.join(manualDir, 'fills_dataset_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'private_quality_report.json'), JSON.stringify(quality, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'calibration_manifest.json'), JSON.stringify(cal1.manifest, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'replay_fingerprint.json'), JSON.stringify({ dataset_id: 'epoch50_fixture', calibration_manifest_fingerprint: cal1.manifest_fingerprint }, null, 2) + '\n');

const result = {
  epoch: 'EPOCH-50',
  status: failed === 0 ? 'PASS' : 'FAIL',
  passed,
  failed,
  mode: cal1.mode,
  strict_negative_test_expected_fail: neg.status !== 0,
  checks
};
fs.writeFileSync(path.join(manualDir, 'verify_epoch50_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed > 0) process.exit(1);
console.log(`PASS verify:epoch50 checks=${passed}`);
