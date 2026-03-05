/**
 * regression_promo_canary_wiring_fast01.mjs -- RG_PROMO_CANARY_WIRING_FAST01
 *
 * Sprint 9 FAST gate: paper_live_runner.mjs must import evaluatePromotion
 * AND evaluateCanary from core/promotion/*.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PROMO_CANARY_WIRING_FAST01';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

const FILE = 'core/paper/paper_live_runner.mjs';
const fullPath = path.join(ROOT, FILE);

if (!fs.existsSync(fullPath)) {
  checks.push({ check: 'file_exists', pass: false, detail: `File not found: ${FILE}` });
} else {
  const src = fs.readFileSync(fullPath, 'utf8');

  const hasPromoImport = /import.*evaluatePromotion.*from.*promotion_ladder/.test(src);
  checks.push({
    check: 'imports_evaluatePromotion',
    pass: hasPromoImport,
    detail: hasPromoImport ? 'evaluatePromotion import present' : 'MISSING evaluatePromotion import'
  });

  const hasCanaryImport = /import.*evaluateCanary.*from.*canary_policy/.test(src);
  checks.push({
    check: 'imports_evaluateCanary',
    pass: hasCanaryImport,
    detail: hasCanaryImport ? 'evaluateCanary import present' : 'MISSING evaluateCanary import'
  });

  const callsPromo = /evaluatePromotion\s*\(/.test(src);
  checks.push({
    check: 'calls_evaluatePromotion',
    pass: callsPromo,
    detail: callsPromo ? 'evaluatePromotion() call found' : 'MISSING evaluatePromotion() call'
  });

  const callsCanary = /evaluateCanary\s*\(/.test(src);
  checks.push({
    check: 'calls_evaluateCanary',
    pass: callsCanary,
    detail: callsCanary ? 'evaluateCanary() call found' : 'MISSING evaluateCanary() call'
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'PROMO_CANARY_WIRING_FAST01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROMO_CANARY_WIRING_FAST01.md'), [
  '# REGRESSION_PROMO_CANARY_WIRING_FAST01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_promo_canary_wiring_fast01.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_promo_canary_wiring_fast01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
