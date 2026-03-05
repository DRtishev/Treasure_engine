/**
 * regression_realism_wiring_fast01.mjs -- RG_REALISM_WIRING_FAST01
 *
 * Sprint 9 FAST gate: Paper modules must import computeTotalCost and
 * must NOT contain legacy `const feeBps` or `const slipBps` patterns.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_REALISM_WIRING_FAST01';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

const PAPER_FILES = [
  'core/paper/paper_live_runner.mjs',
  'core/paper/e111_paper_live_real_feed_runner.mjs',
  'core/paper/paper_trading_harness.mjs',
];

for (const relPath of PAPER_FILES) {
  const fullPath = path.join(ROOT, relPath);
  const basename = path.basename(relPath);

  if (!fs.existsSync(fullPath)) {
    checks.push({ check: `exists_${basename}`, pass: false, detail: `File not found: ${relPath}` });
    continue;
  }

  const src = fs.readFileSync(fullPath, 'utf8');

  // Must import computeTotalCost
  const hasImport = /import.*computeTotalCost.*from/.test(src);
  checks.push({
    check: `imports_cost_model_${basename}`,
    pass: hasImport,
    detail: hasImport ? 'computeTotalCost import present' : 'MISSING computeTotalCost import'
  });

  // Must NOT have legacy const feeBps or const slipBps
  const hasLegacyFee = /const\s+feeBps\s*=/.test(src);
  const hasLegacySlip = /const\s+slipBps\s*=/.test(src);
  checks.push({
    check: `no_legacy_feeBps_${basename}`,
    pass: !hasLegacyFee,
    detail: hasLegacyFee ? 'FOUND legacy const feeBps' : 'No legacy feeBps'
  });
  checks.push({
    check: `no_legacy_slipBps_${basename}`,
    pass: !hasLegacySlip,
    detail: hasLegacySlip ? 'FOUND legacy const slipBps' : 'No legacy slipBps'
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REALISM_WIRING_FAST01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_REALISM_WIRING_FAST01.md'), [
  '# REGRESSION_REALISM_WIRING_FAST01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_realism_wiring_fast01.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_realism_wiring_fast01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
