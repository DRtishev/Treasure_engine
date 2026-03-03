/**
 * regression_data_organ02_bar_valid.mjs — RG_DATA_ORGAN02: Bar Validation Invariants
 *
 * EPOCH-74: Data Organ Liveness — Regression Gate F8
 *
 * Checks:
 *   1. Known-good bars → all valid
 *   2. Known-bad bar (H < L) → catches INV_H_GE_L
 *   3. Known-bad bar (V < 0) → catches INV_V_NON_NEG
 *   4. Known-bad bar (non-monotonic ts) → catches INV_TS_MONOTONIC
 *   5. Gap detection → identifies missing bars
 *   6. Outlier detection → flags > 10% price jump
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_data_organ02_bar_valid.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { validateBar, validateBarSeries } from '../../core/data/bar_validator.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:data-organ02-bar-valid';
const checks = [];

// 1. Known-good bars → all valid
const goodBars = [
  { ts_open: 1000, ts_close: 2000, open: 100, high: 105, low: 99, close: 102, volume: 50, symbol: 'BTCUSDT' },
  { ts_open: 2000, ts_close: 3000, open: 102, high: 107, low: 101, close: 104, volume: 60, symbol: 'BTCUSDT' },
  { ts_open: 3000, ts_close: 4000, open: 104, high: 108, low: 103, close: 106, volume: 55, symbol: 'BTCUSDT' },
];
const goodResult = validateBarSeries(goodBars);
checks.push({
  check: 'good_bars_all_valid',
  pass: goodResult.invalid === 0,
  detail: goodResult.invalid === 0 ? `OK: ${goodResult.valid}/${goodResult.total} valid` : `FAIL: ${goodResult.invalid} invalid`,
});

// 2. Known-bad bar: H < L
const badHL = { ts_open: 1000, ts_close: 2000, open: 100, high: 95, low: 105, close: 100, volume: 10, symbol: 'BTCUSDT' };
const hlResult = validateBar(badHL);
checks.push({
  check: 'catches_h_lt_l',
  pass: !hlResult.valid && hlResult.errors.includes('INV_H_GE_L'),
  detail: !hlResult.valid ? `OK: errors=${hlResult.errors.join(',')}` : 'FAIL: bar passed validation',
});

// 3. Known-bad bar: V < 0
const badV = { ts_open: 1000, ts_close: 2000, open: 100, high: 105, low: 99, close: 100, volume: -5, symbol: 'BTCUSDT' };
const vResult = validateBar(badV);
checks.push({
  check: 'catches_v_negative',
  pass: !vResult.valid && vResult.errors.includes('INV_V_NON_NEG'),
  detail: !vResult.valid ? `OK: errors=${vResult.errors.join(',')}` : 'FAIL: bar passed validation',
});

// 4. Non-monotonic timestamps
const nonMonotonic = [
  { ts_open: 2000, ts_close: 3000, open: 100, high: 105, low: 99, close: 102, volume: 50, symbol: 'BTCUSDT' },
  { ts_open: 1000, ts_close: 2000, open: 102, high: 107, low: 101, close: 104, volume: 60, symbol: 'BTCUSDT' },
];
const nmResult = validateBarSeries(nonMonotonic);
const hasTsMono = nmResult.results.some((r) => r.errors.includes('INV_TS_MONOTONIC'));
checks.push({
  check: 'catches_non_monotonic',
  pass: hasTsMono,
  detail: hasTsMono ? 'OK: INV_TS_MONOTONIC detected' : 'FAIL: non-monotonic not caught',
});

// 5. Gap detection
const gappedBars = [
  { ts_open: 0, ts_close: 1000, open: 100, high: 105, low: 99, close: 102, volume: 50, symbol: 'BTCUSDT' },
  { ts_open: 5000, ts_close: 6000, open: 102, high: 107, low: 101, close: 104, volume: 60, symbol: 'BTCUSDT' },
];
const gapResult = validateBarSeries(gappedBars);
checks.push({
  check: 'gap_detection',
  pass: gapResult.gaps.length > 0,
  detail: gapResult.gaps.length > 0
    ? `OK: ${gapResult.gaps.length} gap(s) at index ${gapResult.gaps[0].after_index}`
    : 'FAIL: no gap detected',
});

// 6. Outlier detection (> 10% jump)
const outlierBars = [
  { ts_open: 0, ts_close: 1000, open: 100, high: 105, low: 99, close: 100, volume: 50, symbol: 'BTCUSDT' },
  { ts_open: 1000, ts_close: 2000, open: 115, high: 120, low: 110, close: 115, volume: 60, symbol: 'BTCUSDT' },
];
const outlierResult = validateBarSeries(outlierBars);
const hasOutlier = outlierResult.results.some((r) => r.warnings.includes('WARN_OUTLIER_JUMP'));
checks.push({
  check: 'outlier_detection',
  pass: hasOutlier,
  detail: hasOutlier ? 'OK: WARN_OUTLIER_JUMP detected for 15% jump' : 'FAIL: outlier not caught',
});

// 7. Missing symbol
const noSymbol = { ts_open: 1000, ts_close: 2000, open: 100, high: 105, low: 99, close: 100, volume: 10 };
const symResult = validateBar(noSymbol);
checks.push({
  check: 'catches_missing_symbol',
  pass: !symResult.valid && symResult.errors.includes('INV_SYMBOL'),
  detail: !symResult.valid ? `OK: errors=${symResult.errors.join(',')}` : 'FAIL: bar passed validation',
});

// Verdict
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DATA_ORGAN02_VIOLATION';

writeMd(path.join(MANUAL, 'regression_data_organ02_bar_valid.md'), [
  '# RG_DATA_ORGAN02_BAR_VALIDATION', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_data_organ02_bar_valid.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DATA_ORGAN02_BAR_VALIDATION',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_data_organ02_bar_valid — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
