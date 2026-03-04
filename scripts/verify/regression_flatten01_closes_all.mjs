/**
 * regression_flatten01_closes_all.mjs — RG_FLATTEN01
 *
 * SPRINT-3 regression gate: Verifies emergency_flatten.mjs exists and
 * position_sizer.mjs enforces tier limits.
 *
 * Checks:
 *   1. emergency_flatten.mjs exists in scripts/ops/
 *   2. emergency_flatten.mjs contains EMERGENCY_FLATTEN reason
 *   3. emergency_flatten.mjs does NOT use forbidden Date APIs
 *   4. computePositionSize exists and is callable
 *   5. micro tier caps at 0.1% of equity
 *   6. small tier caps at 1% of equity
 *   7. normal tier caps at 5% of equity
 *   8. Unknown tier returns size=0
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_flatten01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:flatten01-closes-all';
const checks = [];

// --- Emergency flatten static checks ---

const FLATTEN_PATH = path.join(ROOT, 'scripts/ops/emergency_flatten.mjs');

if (!fs.existsSync(FLATTEN_PATH)) {
  checks.push({ check: 'flatten_exists', pass: false, detail: 'FAIL: emergency_flatten.mjs not found' });
} else {
  const src = fs.readFileSync(FLATTEN_PATH, 'utf8');

  checks.push({ check: 'flatten_exists', pass: true, detail: 'OK: emergency_flatten.mjs exists' });

  // Check 2: contains EMERGENCY_FLATTEN reason
  const hasReason = /EMERGENCY_FLATTEN/.test(src);
  checks.push({ check: 'flatten_has_reason', pass: hasReason, detail: hasReason ? 'OK: EMERGENCY_FLATTEN reason present' : 'FAIL: EMERGENCY_FLATTEN not found' });

  // Check 3: no forbidden Date APIs (stripped comments)
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map(l => { const idx = l.indexOf('//'); return idx >= 0 ? l.slice(0, idx) : l; }).join('\n');
  const hasDateNow = /\bDate\.now\s*\(/.test(stripped);
  const hasNewDate = /\bnew\s+Date\s*\(/.test(stripped);
  const noForbidden = !hasDateNow && !hasNewDate;
  checks.push({ check: 'flatten_no_forbidden_date', pass: noForbidden, detail: noForbidden ? 'OK: no forbidden Date APIs' : `FAIL: Date.now=${hasDateNow} new Date=${hasNewDate}` });
}

// --- Position sizer dynamic checks ---

try {
  const { computePositionSize } = await import('../../core/risk/position_sizer.mjs');

  // Check 4: function exists
  const isFn = typeof computePositionSize === 'function';
  checks.push({ check: 'position_sizer_is_function', pass: isFn, detail: isFn ? 'OK' : 'FAIL: not a function' });

  const equity = 100000; // $100k
  const risk = 10; // $10 risk per unit

  // Check 5: micro tier → 0.1% → max_risk = $100 → size = 10
  const r5 = computePositionSize(equity, 'micro', risk);
  const p5 = Math.abs(r5.max_risk_usd - 100) < 0.01 && Math.abs(r5.size - 10) < 0.01;
  checks.push({ check: 'micro_tier_limit', pass: p5, detail: p5 ? `OK: micro max_risk=$${r5.max_risk_usd} size=${r5.size}` : `FAIL: max_risk=${r5.max_risk_usd} size=${r5.size}` });

  // Check 6: small tier → 1% → max_risk = $1000 → size = 100
  const r6 = computePositionSize(equity, 'small', risk);
  const p6 = Math.abs(r6.max_risk_usd - 1000) < 0.01 && Math.abs(r6.size - 100) < 0.01;
  checks.push({ check: 'small_tier_limit', pass: p6, detail: p6 ? `OK: small max_risk=$${r6.max_risk_usd} size=${r6.size}` : `FAIL: max_risk=${r6.max_risk_usd} size=${r6.size}` });

  // Check 7: normal tier → 5% → max_risk = $5000 → size = 500
  const r7 = computePositionSize(equity, 'normal', risk);
  const p7 = Math.abs(r7.max_risk_usd - 5000) < 0.01 && Math.abs(r7.size - 500) < 0.01;
  checks.push({ check: 'normal_tier_limit', pass: p7, detail: p7 ? `OK: normal max_risk=$${r7.max_risk_usd} size=${r7.size}` : `FAIL: max_risk=${r7.max_risk_usd} size=${r7.size}` });

  // Check 8: unknown tier → size=0
  const r8 = computePositionSize(equity, 'huge', risk);
  const p8 = r8.size === 0;
  checks.push({ check: 'unknown_tier_returns_zero', pass: p8, detail: p8 ? 'OK: unknown tier → size=0' : `FAIL: size=${r8.size}` });

} catch (err) {
  checks.push({ check: 'import_position_sizer', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_FLATTEN01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_FLATTEN01.md'), [
  '# RG_FLATTEN01: Emergency Flatten + Position Sizer', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_flatten01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_FLATTEN01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_flatten01_closes_all — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
