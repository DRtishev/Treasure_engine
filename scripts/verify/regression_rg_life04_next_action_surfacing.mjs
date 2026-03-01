/**
 * regression_rg_life04_next_action_surfacing.mjs — RG_LIFE04_NEXT_ACTION_SURFACING
 *
 * Verifies that when ops:life S01 (verify:fast) is BLOCKED ACQ_LOCK01,
 * ops:life:
 *   1. prints a stable line: ONE_NEXT_ACTION: npm run -s ops:node:toolchain:bootstrap
 *   2. writes one_next_action into EPOCH-LIFE-<RUN_ID>/LIFE_SUMMARY.json
 *   3. writes the same into EPOCH-LIFE-<RUN_ID>/LIFE_SUMMARY.md
 *
 * Strategy: source inspection of scripts/ops/life.mjs (CERT-safe, no network).
 * This verifies the CONTRACT without re-running ops:life (which writes EPOCH-* dirs).
 *
 * Deterministic: no timestamps, no run_id in checks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const LIFE_SCRIPT = path.join(ROOT, 'scripts/ops/life.mjs');
const EXPECTED_ACTION = 'npm run -s ops:node:toolchain:bootstrap';

const checks = [];

if (!fs.existsSync(LIFE_SCRIPT)) {
  checks.push({ check: 'life_script_present', pass: false, detail: 'scripts/ops/life.mjs missing' });
} else {
  const src = fs.readFileSync(LIFE_SCRIPT, 'utf8');

  // 1. oneNextAction variable declared
  const hasVar = src.includes('oneNextAction');
  checks.push({
    check: 'one_next_action_variable_present',
    pass: hasVar,
    detail: hasVar ? 'oneNextAction variable declared — OK' : 'FAIL: oneNextAction variable missing',
  });

  // 2. gate receipt is read from EXECUTOR path
  const readsEnsureJson = src.includes('node_toolchain_ensure.json');
  checks.push({
    check: 'reads_toolchain_ensure_json',
    pass: readsEnsureJson,
    detail: readsEnsureJson ? 'reads node_toolchain_ensure.json receipt — OK' : 'FAIL: does not read toolchain receipt',
  });

  // 3. detail.next_action extracted
  const extractsDetail = src.includes('receipt.detail') && src.includes('detail.next_action');
  checks.push({
    check: 'extracts_detail_next_action',
    pass: extractsDetail,
    detail: extractsDetail ? 'extracts receipt.detail.next_action — OK' : 'FAIL: does not extract detail.next_action',
  });

  // 4. fallback to bootstrap command
  const hasFallback = src.includes(EXPECTED_ACTION);
  checks.push({
    check: 'fallback_to_bootstrap_command',
    pass: hasFallback,
    detail: hasFallback ? `fallback "${EXPECTED_ACTION}" present — OK` : `FAIL: fallback "${EXPECTED_ACTION}" missing`,
  });

  // 5. console prints ONE_NEXT_ACTION: stable line
  const printsLine = src.includes("'  ONE_NEXT_ACTION: '") || src.includes('`  ONE_NEXT_ACTION: ${') || src.includes('"  ONE_NEXT_ACTION: "');
  checks.push({
    check: 'console_prints_one_next_action_line',
    pass: printsLine,
    detail: printsLine ? 'console.log ONE_NEXT_ACTION: line present — OK' : 'FAIL: ONE_NEXT_ACTION console line missing',
  });

  // 6. LIFE_SUMMARY.json includes one_next_action field
  const jsonHasField = src.includes('one_next_action:');
  checks.push({
    check: 'life_summary_json_has_one_next_action_field',
    pass: jsonHasField,
    detail: jsonHasField ? 'one_next_action field in LIFE_SUMMARY.json — OK' : 'FAIL: one_next_action missing from JSON',
  });

  // 7. LIFE_SUMMARY.md uses oneNextAction (not hardcoded 'npm run -s verify:fast')
  const mdUsesVar = src.includes('oneNextAction ?? ');
  checks.push({
    check: 'life_summary_md_uses_one_next_action_var',
    pass: mdUsesVar,
    detail: mdUsesVar ? 'LIFE_SUMMARY.md uses oneNextAction var — OK' : 'FAIL: LIFE_SUMMARY.md hardcoded, does not use oneNextAction',
  });

  // 8. restricted to S01 BLOCKED (not all hard_stop steps)
  const restrictedToS01 = src.includes("step.id === 'S01'") && src.includes("result.status === 'BLOCKED'");
  checks.push({
    check: 'extraction_restricted_to_s01_blocked',
    pass: restrictedToS01,
    detail: restrictedToS01 ? 'extraction restricted to S01 BLOCKED — OK' : 'FAIL: extraction not restricted to S01 BLOCKED',
  });

  // 9. fail-soft catch (no throw on missing receipt)
  const hasFailSoft = src.includes('/* fail-soft') || src.includes('// fail-soft');
  checks.push({
    check: 'fail_soft_catch_present',
    pass: hasFailSoft,
    detail: hasFailSoft ? 'fail-soft catch on receipt read — OK' : 'FAIL: no fail-soft catch (could throw on missing receipt)',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_LIFE04_NEXT_ACTION_SURFACING_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_LIFE04_NEXT_ACTION_SURFACING.md'), [
  '# REGRESSION_RG_LIFE04_NEXT_ACTION_SURFACING.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: npm run -s verify:fast`, '',
  '## CONTRACT',
  'When ops:life S01 (verify:fast) is BLOCKED ACQ_LOCK01:',
  '  - console prints stable line: ONE_NEXT_ACTION: npm run -s ops:node:toolchain:bootstrap',
  '  - EPOCH-LIFE-*/LIFE_SUMMARY.json includes one_next_action field',
  '  - EPOCH-LIFE-*/LIFE_SUMMARY.md NEXT_ACTION section uses the actionable command', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_life04_next_action_surfacing.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LIFE04_NEXT_ACTION_SURFACING',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: 'npm run -s verify:fast',
  expected_console_line: `ONE_NEXT_ACTION: ${EXPECTED_ACTION}`,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_life04_next_action_surfacing — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
