/**
 * regression_metric_parity01_overfit_uses_unified.mjs — RG_METRIC_PARITY01
 *
 * SPRINT-1 regression gate: Ensures overfit_court.mjs imports Sharpe-related
 * functions from unified_sharpe.mjs.
 *
 * Checks:
 *   1. overfit_court.mjs imports from unified_sharpe.mjs
 *   2. Import includes deflatedSharpeRatio
 *   3. Import includes skewness and kurtosisExcess (needed for full DSR)
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_metric_parity01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:metric-parity01-overfit-uses-unified';
const checks = [];

const OVERFIT_PATH = path.join(ROOT, 'core/edge_lab/courts/overfit_court.mjs');

if (!fs.existsSync(OVERFIT_PATH)) {
  checks.push({ check: 'overfit_court_exists', pass: false, detail: 'FAIL: overfit_court.mjs not found' });
} else {
  const src = fs.readFileSync(OVERFIT_PATH, 'utf8');

  // Check 1: imports from unified_sharpe.mjs
  const hasUnifiedImport = /from\s*['"][^'"]*unified_sharpe\.mjs['"]/.test(src);
  checks.push({
    check: 'imports_from_unified_sharpe',
    pass: hasUnifiedImport,
    detail: hasUnifiedImport ? 'OK: imports from unified_sharpe.mjs' : 'FAIL: no import from unified_sharpe.mjs',
  });

  // Check 2: imports deflatedSharpeRatio
  const hasDSR = /import\s*\{[^}]*deflatedSharpeRatio[^}]*\}/.test(src);
  checks.push({
    check: 'imports_deflatedSharpeRatio',
    pass: hasDSR,
    detail: hasDSR ? 'OK: deflatedSharpeRatio imported' : 'FAIL: deflatedSharpeRatio not imported',
  });

  // Check 3: imports skewness + kurtosisExcess
  const hasSkew = /import\s*\{[^}]*skewness[^}]*\}/.test(src);
  const hasKurt = /import\s*\{[^}]*kurtosisExcess[^}]*\}/.test(src);
  checks.push({
    check: 'imports_skewness_and_kurtosisExcess',
    pass: hasSkew && hasKurt,
    detail: hasSkew && hasKurt
      ? 'OK: skewness and kurtosisExcess imported'
      : `FAIL: missing ${!hasSkew ? 'skewness' : ''}${!hasSkew && !hasKurt ? ', ' : ''}${!hasKurt ? 'kurtosisExcess' : ''}`,
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_METRIC_PARITY01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_METRIC_PARITY01.md'), [
  '# RG_METRIC_PARITY01: Overfit Court Uses Unified Sharpe', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_metric_parity01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_METRIC_PARITY01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_metric_parity01_overfit_uses_unified — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
