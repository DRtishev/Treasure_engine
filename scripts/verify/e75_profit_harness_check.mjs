#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runProfitSearchHarness, buildExecutionCostModel, simulateFill } from '../../core/edge/e75_profit_harness.mjs';
import { createPaperReconAdapter, buildReconComparison, maybeCreateDemoAdapter } from '../../core/edge/e75_execution_recon.mjs';

const r1 = runProfitSearchHarness({});
const r2 = runProfitSearchHarness({});
assert.equal(r1.runner_fingerprint, r2.runner_fingerprint, 'profit harness must be deterministic x2');
assert.ok(r1.all_candidates.length > 0, 'candidate set must be non-empty');
assert.ok(r1.all_candidates.every((c) => c.reason_code === 'OK' || c.reason_code === 'INVALID_SAMPLE'), 'reason codes constrained');

const model = buildExecutionCostModel({ seed: 7 });
const seq = [0.2, 0.8];
let idx = 0;
const fill1 = simulateFill({ side: 'BUY', size: 1.25, expected_price: 100, timestamp_ms: 0 }, { mid: 100, spread: 0.1 }, model, () => seq[idx++]);
idx = 0;
const fill2 = simulateFill({ side: 'BUY', size: 1.25, expected_price: 100, timestamp_ms: 0 }, { mid: 100, spread: 0.1 }, model, () => seq[idx++]);
assert.deepEqual(fill1, fill2, 'fill simulator deterministic for same random stream');

const paper = createPaperReconAdapter({ costModel: { seed: 101 } });
const fill = paper.fill({ side: 'SELL', size: 1, expected_price: 100, timestamp_ms: 0 }, { mid: 100, spread: 0.1 });
const recon = buildReconComparison({ signal: { side: 'SELL', size: 1 }, expected_price: 100, fill });
assert.ok(Number.isFinite(recon.expected_vs_filled_bps), 'recon delta computed');

const demo = maybeCreateDemoAdapter();
assert.equal(demo.enabled, false, 'demo adapter disabled by default');

console.log('verify:e75:profit:harness PASSED');
