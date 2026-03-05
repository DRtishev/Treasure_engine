/**
 * deep_parity_e2e02.mjs — RG_PARITY_E2E02
 *
 * R2 deep: Paper vs dryrun fills → parity score computable and in range.
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
  const { computeParityScore } = await import('../../core/recon/parity_score.mjs');

  // Paper vs live with small differences
  const paper = { total_fees: 0.10, total_slippage: 0.05, total_funding: 0.02, realized_pnl: 50, total_fills: 20, fill_rate: 0.95 };
  const live = { total_fees: 0.12, total_slippage: 0.07, total_funding: 0.03, realized_pnl: 45, total_fills: 18, fill_rate: 0.90 };

  const parity = computeParityScore(paper, live);

  // Check 1: composite score in range
  const p1 = parity.composite_parity_score >= 0 && parity.composite_parity_score <= 100;
  checks.push({ check: 'composite_score_in_range', pass: p1,
    detail: `score=${parity.composite_parity_score}` });

  // Check 2: overall verdict is one of PASS/WARN/FAIL
  const p2 = ['PASS', 'WARN', 'FAIL'].includes(parity.overall_verdict);
  checks.push({ check: 'overall_verdict_valid', pass: p2,
    detail: `verdict=${parity.overall_verdict}` });

  // Check 3: all dimensions computed
  const p3 = parity.dimensions.fee && parity.dimensions.slippage && parity.dimensions.fill_rate && parity.dimensions.pnl;
  checks.push({ check: 'all_dimensions_computed', pass: p3,
    detail: p3 ? 'OK: fee, slippage, fill_rate, pnl' : 'FAIL: missing dimensions' });

  // Check 4: Determinism
  const parity2 = computeParityScore(paper, live);
  const p4 = parity.composite_parity_score === parity2.composite_parity_score;
  checks.push({ check: 'deterministic', pass: p4, detail: p4 ? 'OK' : 'FAIL' });

  // Check 5: Perfect parity → score = 100
  const perfect = computeParityScore(paper, paper);
  const p5 = perfect.composite_parity_score === 100 && perfect.overall_verdict === 'PASS';
  checks.push({ check: 'perfect_parity_is_100', pass: p5,
    detail: `score=${perfect.composite_parity_score}, verdict=${perfect.overall_verdict}` });

} catch (err) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_PARITY_E2E02_VIOLATION';

writeMd(path.join(EXEC, 'DEEP_PARITY_E2E02.md'), [
  '# RG_PARITY_E2E02: Parity Score E2E', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'deep_parity_e2e02.json'), {
  schema_version: '1.0.0', gate_id: 'RG_PARITY_E2E02', status, reason_code, run_id: RUN_ID, checks,
});

console.log(`[${status}] deep_parity_e2e02 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
