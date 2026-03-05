/**
 * deep_fill_quality_e2e01.mjs — RG_FILL_QUALITY_E2E01
 *
 * R2 deep: Known fills + predictions → quality metrics deterministic and non-zero.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });
const checks = [];

try {
  const { evaluateFillQuality, evaluateBatchQuality } = await import('../../core/edge/fill_quality.mjs');

  // Scenario: fill is slightly worse than predicted
  const fill = { price: 100, exec_price: 100.15, qty: 1, fee: 0.04, fill_ratio: 0.95 };
  const prediction = { exec_price: 100.10, slippage_bps: 10, fee_bps: 4, fill_ratio: 1.0 };

  const result = evaluateFillQuality(fill, prediction);

  // Check 1: hidden_bps is computed and non-zero
  const p1 = result.hidden_bps !== undefined && result.hidden_bps !== 0;
  checks.push({ check: 'hidden_bps_non_zero', pass: p1,
    detail: `hidden_bps=${result.hidden_bps}` });

  // Check 2: quality_score is in range 0-100
  const p2 = result.quality_score >= 0 && result.quality_score <= 100;
  checks.push({ check: 'quality_score_in_range', pass: p2,
    detail: `quality_score=${result.quality_score}` });

  // Check 3: fill_ratio_accuracy computed
  const p3 = result.fill_ratio_accuracy !== undefined && result.fill_ratio_accuracy <= 1;
  checks.push({ check: 'fill_ratio_accuracy_computed', pass: p3,
    detail: `fill_ratio_accuracy=${result.fill_ratio_accuracy}` });

  // Check 4: Determinism — same inputs produce same output
  const result2 = evaluateFillQuality(fill, prediction);
  const p4 = result.hidden_bps === result2.hidden_bps && result.quality_score === result2.quality_score;
  checks.push({ check: 'deterministic', pass: p4,
    detail: p4 ? 'OK: identical outputs' : 'FAIL: different outputs' });

  // Check 5: Batch quality works
  const batch = evaluateBatchQuality([
    { fill, prediction },
    { fill: { price: 100, exec_price: 100.05, qty: 1, fee: 0.04 }, prediction: { slippage_bps: 5, fee_bps: 4 } },
  ]);
  const p5 = batch.count === 2 && batch.avg_quality_score > 0;
  checks.push({ check: 'batch_quality_works', pass: p5,
    detail: `count=${batch.count}, avg_score=${batch.avg_quality_score}` });

} catch (err) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_FILL_QUALITY_E2E01_VIOLATION';

writeMd(path.join(EXEC, 'DEEP_FILL_QUALITY_E2E01.md'), [
  '# RG_FILL_QUALITY_E2E01: Fill Quality E2E', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'deep_fill_quality_e2e01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_FILL_QUALITY_E2E01', status, reason_code, run_id: RUN_ID, checks,
});

console.log(`[${status}] deep_fill_quality_e2e01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
