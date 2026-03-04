/**
 * regression_sharpe_ssot01_no_inline.mjs — RG_SHARPE_SSOT01
 *
 * SPRINT-1 regression gate: Ensures no inline Sharpe/mean/std/deflatedSharpe
 * functions exist in core/edge_lab/courts/ — all must come from unified_sharpe.mjs.
 *
 * Prevents FINDING-C recurrence: metric bifurcation via inline formulas.
 *
 * Checks:
 *   1. No `function mean(` in courts/
 *   2. No `function std(` in courts/
 *   3. No `function sharpeRatio(` in courts/
 *   4. No `function deflatedSharpe(` in courts/
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_sharpe_ssot01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:sharpe-ssot01-no-inline';
const checks = [];

const COURTS_DIR = path.join(ROOT, 'core/edge_lab/courts');

if (!fs.existsSync(COURTS_DIR)) {
  checks.push({ check: 'courts_dir_exists', pass: false, detail: 'FAIL: core/edge_lab/courts/ not found' });
} else {
  const courtFiles = fs.readdirSync(COURTS_DIR).filter(f => f.endsWith('.mjs'));
  const FORBIDDEN = [
    { pattern: /^function\s+mean\s*\(/m, name: 'function mean(' },
    { pattern: /^function\s+std\s*\(/m, name: 'function std(' },
    { pattern: /^function\s+sharpeRatio\s*\(/m, name: 'function sharpeRatio(' },
    { pattern: /^function\s+deflatedSharpe\s*\(/m, name: 'function deflatedSharpe(' },
  ];

  for (const file of courtFiles) {
    const src = fs.readFileSync(path.join(COURTS_DIR, file), 'utf8');
    for (const { pattern, name } of FORBIDDEN) {
      const found = pattern.test(src);
      checks.push({
        check: `no_inline_${name.replace(/[^a-z]/g, '_')}_in_${file}`,
        pass: !found,
        detail: found
          ? `FAIL: ${file} contains inline ${name}`
          : `OK: ${file} has no inline ${name}`,
      });
    }
  }
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_SHARPE_SSOT01_INLINE_FOUND';

writeMd(path.join(EXEC, 'REGRESSION_SHARPE_SSOT01.md'), [
  '# RG_SHARPE_SSOT01: No Inline Sharpe in Courts', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_sharpe_ssot01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_SHARPE_SSOT01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_sharpe_ssot01_no_inline — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
