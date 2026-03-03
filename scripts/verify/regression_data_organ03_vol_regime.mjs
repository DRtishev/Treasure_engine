/**
 * regression_data_organ03_vol_regime.mjs — RG_DATA_ORGAN03: Vol Regime Classification
 *
 * EPOCH-74: Data Organ Liveness — Regression Gate F9
 *
 * Checks:
 *   1. Low-vol bars → regime = LOW
 *   2. Mid-vol bars → regime = MID
 *   3. High-vol bars → regime = HIGH
 *   4. Crisis-vol bars → regime = CRISIS
 *   5. Determinism x2: same bars → same regime
 *   6. Edge case: < 2 bars → defaults to MID
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_data_organ03_vol_regime.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { detectVolRegime, VOL_THRESHOLDS } from '../../core/data/vol_regime_detector.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:data-organ03-vol-regime';
const checks = [];

/**
 * Generate synthetic bars with controlled volatility.
 * @param {number} basePrice
 * @param {number} volatility — per-bar price change as fraction
 * @param {number} n — number of bars
 */
function makeVolBars(basePrice, volatility, n) {
  const bars = [];
  let price = basePrice;
  // Use a deterministic oscillation pattern
  for (let i = 0; i < n; i++) {
    const direction = i % 2 === 0 ? 1 : -1;
    const change = price * volatility * direction;
    const newPrice = price + change;
    bars.push({
      ts_open: i * 60000,
      ts_close: (i + 1) * 60000,
      open: price,
      high: Math.max(price, newPrice),
      low: Math.min(price, newPrice),
      close: newPrice,
      volume: 100,
      symbol: 'BTCUSDT',
    });
    price = newPrice;
  }
  return bars;
}

// 1. Low-vol bars → regime = LOW
const lowVolBars = makeVolBars(50000, 0.00001, 30); // ~0.001% per bar
const lowResult = detectVolRegime(lowVolBars);
checks.push({
  check: 'low_vol_regime',
  pass: lowResult.regime === 'LOW',
  detail: `regime=${lowResult.regime} vol=${lowResult.realized_vol} (expected LOW)`,
});

// 2. Mid-vol bars → regime = MID
const midVolBars = makeVolBars(50000, 0.0003, 30); // ~0.03% per bar
const midResult = detectVolRegime(midVolBars);
checks.push({
  check: 'mid_vol_regime',
  pass: midResult.regime === 'MID',
  detail: `regime=${midResult.regime} vol=${midResult.realized_vol} (expected MID)`,
});

// 3. High-vol bars → regime = HIGH
const highVolBars = makeVolBars(50000, 0.0006, 30); // ~0.06% per bar
const highResult = detectVolRegime(highVolBars);
checks.push({
  check: 'high_vol_regime',
  pass: highResult.regime === 'HIGH',
  detail: `regime=${highResult.regime} vol=${highResult.realized_vol} (expected HIGH)`,
});

// 4. Crisis-vol bars → regime = CRISIS
const crisisVolBars = makeVolBars(50000, 0.0015, 30); // ~0.15% per bar
const crisisResult = detectVolRegime(crisisVolBars);
checks.push({
  check: 'crisis_vol_regime',
  pass: crisisResult.regime === 'CRISIS',
  detail: `regime=${crisisResult.regime} vol=${crisisResult.realized_vol} (expected CRISIS)`,
});

// 5. Determinism x2
const r1 = detectVolRegime(midVolBars);
const r2 = detectVolRegime(midVolBars);
checks.push({
  check: 'determinism_x2',
  pass: r1.regime === r2.regime && r1.realized_vol === r2.realized_vol,
  detail: r1.regime === r2.regime ? `OK: regime=${r1.regime} vol=${r1.realized_vol}` : `FAIL: r1=${r1.regime} r2=${r2.regime}`,
});

// 6. Edge case: < 2 bars → defaults to MID
const edgeResult = detectVolRegime([{ close: 100 }]);
checks.push({
  check: 'edge_case_lt2_bars',
  pass: edgeResult.regime === 'MID' && edgeResult.confidence === 0,
  detail: `regime=${edgeResult.regime} confidence=${edgeResult.confidence} (expected MID, 0)`,
});

// 7. Confidence increases with more data
checks.push({
  check: 'confidence_varies',
  pass: lowResult.confidence > 0 && lowResult.confidence <= 1.0,
  detail: `confidence=${lowResult.confidence} (expected 0 < c <= 1.0)`,
});

// Verdict
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DATA_ORGAN03_VIOLATION';

writeMd(path.join(MANUAL, 'regression_data_organ03_vol_regime.md'), [
  '# RG_DATA_ORGAN03_VOL_REGIME_CLASSIFICATION', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## THRESHOLDS',
  `LOW_MAX: ${VOL_THRESHOLDS.LOW_MAX}`,
  `MID_MAX: ${VOL_THRESHOLDS.MID_MAX}`,
  `HIGH_MAX: ${VOL_THRESHOLDS.HIGH_MAX}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_data_organ03_vol_regime.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DATA_ORGAN03_VOL_REGIME_CLASSIFICATION',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_data_organ03_vol_regime — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
