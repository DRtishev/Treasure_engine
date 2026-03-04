/**
 * regression_cockpit_dynamic_next01.mjs — RG_COCKPIT_DYNAMIC_NEXT01
 *
 * SPRINT-2 regression gate: Verifies that cockpit.mjs uses dynamic
 * ONE_NEXT_ACTION instead of hardcoded 'npm run -s verify:fast'.
 *
 * Checks:
 *   1. cockpit.mjs contains `computeNextAction` function
 *   2. cockpit.mjs uses computeNextAction() in HUD.json generation
 *   3. cockpit.mjs HUD.md uses `ONE_NEXT_ACTION` header (not `NEXT_ACTION`)
 *   4. cockpit.mjs does NOT hardcode next_action as literal 'npm run -s verify:fast' in HUD.md
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_cockpit_dynamic_next01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:cockpit-dynamic-next01';
const checks = [];

const COCKPIT_PATH = path.join(ROOT, 'scripts/ops/cockpit.mjs');

if (!fs.existsSync(COCKPIT_PATH)) {
  checks.push({ check: 'cockpit_exists', pass: false, detail: 'FAIL: cockpit.mjs not found' });
} else {
  const src = fs.readFileSync(COCKPIT_PATH, 'utf8');

  // Check 1: computeNextAction function exists
  const hasFn = /function\s+computeNextAction/.test(src);
  checks.push({
    check: 'has_computeNextAction',
    pass: hasFn,
    detail: hasFn ? 'OK: computeNextAction function present' : 'FAIL: computeNextAction not found',
  });

  // Check 2: HUD.json uses computeNextAction()
  const usesInJson = /next_action:\s*computeNextAction\(/.test(src);
  checks.push({
    check: 'hud_json_uses_dynamic',
    pass: usesInJson,
    detail: usesInJson ? 'OK: HUD.json next_action uses computeNextAction()' : 'FAIL: HUD.json next_action not dynamic',
  });

  // Check 3: HUD.md uses ONE_NEXT_ACTION header
  const hasOneNextAction = /ONE_NEXT_ACTION/.test(src);
  checks.push({
    check: 'hud_md_one_next_action_header',
    pass: hasOneNextAction,
    detail: hasOneNextAction ? 'OK: ONE_NEXT_ACTION header present' : 'FAIL: ONE_NEXT_ACTION header not found',
  });

  // Check 4: HUD.md section uses computeNextAction (not hardcoded string)
  // Match the pattern where ONE_NEXT_ACTION is followed by computeNextAction call
  const mdDynamic = /ONE_NEXT_ACTION[\s\S]{0,100}computeNextAction\(/.test(src);
  checks.push({
    check: 'hud_md_not_hardcoded',
    pass: mdDynamic,
    detail: mdDynamic ? 'OK: HUD.md uses dynamic computeNextAction()' : 'FAIL: HUD.md may still be hardcoded',
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_COCKPIT_DYNAMIC_NEXT01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_COCKPIT_DYNAMIC_NEXT01.md'), [
  '# RG_COCKPIT_DYNAMIC_NEXT01: Cockpit Dynamic Next Action', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_cockpit_dynamic_next01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_COCKPIT_DYNAMIC_NEXT01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_cockpit_dynamic_next01 — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
