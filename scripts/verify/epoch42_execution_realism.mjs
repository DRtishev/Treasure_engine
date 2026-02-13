#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadFillRecords, normalizeFillRecord } from '../../core/edge/fill_record_contract.mjs';
import { calibrateMicrostructure, deterministicPartialFill, scoreSignalFreshness } from '../../core/edge/execution_realism.mjs';
import { StrategyAwareExecutor } from '../../core/exec/strategy_aware_executor.mjs';

const root = process.cwd();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-42';
const runLabel = process.env.RUN_LABEL || 'manual';
const evidenceDir = path.join(root, 'reports/evidence', evidenceEpoch);
const gateDir = path.join(evidenceDir, 'gates');
const runDir = path.join(gateDir, runLabel);
fs.mkdirSync(runDir, { recursive: true });

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
}

// 1) Fill record contract
const fillLoad = loadFillRecords({ root });
assert(typeof fillLoad.fallback_used === 'boolean', 'fill loader returns explicit fallback marker');
if (fillLoad.fallback_used) {
  assert(fillLoad.fallback_reason === 'FILL_RECORD_FILE_MISSING', 'fallback reason is explicit when fill file missing');
}

let nonFiniteRejected = false;
try {
  normalizeFillRecord({ timestamp: '2026-01-01T00:00:00Z', symbol: 'BTCUSDT', side: 'BUY', qty: 1, price: 'NaN', fees: 0 }, 0);
} catch {
  nonFiniteRejected = true;
}
assert(nonFiniteRejected, 'fill contract rejects non-finite numbers');

// 2) WOW-03 calibration determinism and manifest
const cal1 = calibrateMicrostructure(fillLoad.records, { seed: 4242, mode: fillLoad.mode });
const cal2 = calibrateMicrostructure(fillLoad.records, { seed: 4242, mode: fillLoad.mode });
const sameParams = JSON.stringify(cal1.params) === JSON.stringify(cal2.params);
const sameHashes = cal1.inputs_hash === cal2.inputs_hash && cal1.outputs_hash === cal2.outputs_hash;
assert(sameParams, 'calibration params deterministic for same inputs');
assert(sameHashes, 'calibration fingerprints deterministic for same inputs');

const calibrationManifest = {
  epoch: 'EPOCH-42',
  mode: fillLoad.mode,
  fallback_used: fillLoad.fallback_used,
  fallback_reason: fillLoad.fallback_reason,
  source: fillLoad.source,
  inputs_hash: cal1.inputs_hash,
  outputs_hash: cal1.outputs_hash,
  seed: cal1.seed,
  params: cal1.params,
  outputs: cal1.outputs
};
fs.writeFileSync(path.join(evidenceDir, 'calibration_manifest.json'), `${JSON.stringify(calibrationManifest, null, 2)}\n`);

// 3) WOW-04 liquidity buckets and partial fill contract
const scenarios = [
  { adv: 2_000_000_000, order: 1_000_000, expectedBucket: 'HIGH' },
  { adv: 200_000_000, order: 500_000, expectedBucket: 'MID' },
  { adv: 20_000_000, order: 200_000, expectedBucket: 'LOW' },
  { adv: 2_000_000, order: 100_000, expectedBucket: 'MICRO' }
];
const outputs = scenarios.map((s) => ({ ...s, out: deterministicPartialFill(s.order, s.adv) }));
for (const row of outputs) {
  assert(row.out.bucket === row.expectedBucket, `bucket classified as ${row.expectedBucket}`);
  assert(row.out.fill_ratio >= 0 && row.out.fill_ratio <= 1, `${row.out.bucket} fill_ratio in [0,1]`);
  assert(Math.abs((row.out.filled_usd + row.out.unfilled_usd) - row.order) < 1e-6, `${row.out.bucket} notional conservation invariant`);
}
const ratios = outputs.map((r) => r.out.fill_ratio);
assert(ratios[0] > ratios[1] && ratios[1] > ratios[2] && ratios[2] > ratios[3], 'partial-fill severity monotonic by liquidity bucket');
fs.writeFileSync(path.join(runDir, 'liquidity_scenarios.json'), `${JSON.stringify(outputs, null, 2)}\n`);

// 4) WOW-05 freshness scoring in signal->intent path
const nowMs = Date.parse('2026-01-01T00:00:10Z');
const freshnessCases = [
  { strategy_class: 'HFT', timestamp: '2026-01-01T00:00:09.950Z', expectedAction: 'ALLOW' },
  { strategy_class: 'HFT', timestamp: '2026-01-01T00:00:08.000Z', expectedAction: 'BLOCK' },
  { strategy_class: 'SWING', timestamp: '2025-12-31T23:55:50.000Z', expectedAction: 'DOWNWEIGHT' }
];
for (const c of freshnessCases) {
  const score = scoreSignalFreshness({ timestamp: c.timestamp, strategy_class: c.strategy_class }, { now_ms: nowMs });
  assert(score.action === c.expectedAction, `freshness action ${c.expectedAction} for ${c.strategy_class}`);
}

const executor = new StrategyAwareExecutor({ seed: 12345 });
const signals = [
  { strategy_id: 's_hft', symbol: 'BTCUSDT', side: 'BUY', confidence: 1, price: 50000, notional_usd: 100, strategy_class: 'HFT', timestamp: '2026-01-01T00:00:08.000Z' },
  { strategy_id: 's_swing', symbol: 'ETHUSDT', side: 'BUY', confidence: 1, price: 2000, notional_usd: 100, strategy_class: 'SWING', timestamp: '2025-12-31T23:55:50.000Z' }
];
const intentsA = executor.prepareIntents(signals, { now_ms: nowMs, mode: 'DRY_RUN', bar_idx: 1 });
const intentsB = executor.prepareIntents(signals, { now_ms: nowMs, mode: 'DRY_RUN', bar_idx: 1 });
assert(intentsA.length === 1, 'stale HFT signal blocked in signal->intent path');
assert(intentsA[0].freshness?.action === 'DOWNWEIGHT', 'swing stale signal downweighted');
assert(JSON.stringify(intentsA) === JSON.stringify(intentsB), 'signal->intent freshness path deterministic');

const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ calibrationManifest, outputs, intentsA })).digest('hex');
fs.writeFileSync(path.join(runDir, 'verify_epoch42_result.json'), `${JSON.stringify({ passed, failed, fingerprint }, null, 2)}\n`);

if (failed > 0) {
  console.error(`FAILED checks=${failed}`);
  process.exit(1);
}
console.log(`PASS verify:epoch42 checks=${passed} fingerprint=${fingerprint}`);
