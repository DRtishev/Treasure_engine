/**
 * regression_rg_rdy_select02_selector_absent_in_daily.mjs — RG_RDY_SELECT02
 *
 * Gate: artifacts/incoming/SELECT_RUN_ID must NOT be present during the
 *       normal daily loop (ops:life). Its presence indicates an operator
 *       override that was not cleaned up — this could cause ops:life to
 *       silently evaluate stale/wrong data indefinitely.
 *
 * ops:life is considered to be running in "daily" mode unless an explicit
 * override token (artifacts/incoming/ALLOW_SELECT_RUN_ID) is also present.
 *
 * PASS: SELECT_RUN_ID absent
 * PASS: SELECT_RUN_ID present AND ALLOW_SELECT_RUN_ID override present
 * FAIL: SELECT_RUN_ID present without ALLOW_SELECT_RUN_ID
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const SELECT_PATH = path.join(ROOT, 'artifacts/incoming/SELECT_RUN_ID');
const ALLOW_PATH = path.join(ROOT, 'artifacts/incoming/ALLOW_SELECT_RUN_ID');

const selectExists = fs.existsSync(SELECT_PATH);
const allowExists = fs.existsSync(ALLOW_PATH);

const checks = [];

checks.push({
  check: 'select_run_id_file',
  pass: !selectExists,
  detail: selectExists
    ? `SELECT_RUN_ID present: ${fs.readFileSync(SELECT_PATH, 'utf8').trim().slice(0, 64)}`
    : 'SELECT_RUN_ID absent — OK',
});

if (selectExists) {
  checks.push({
    check: 'allow_select_run_id_override',
    pass: allowExists,
    detail: allowExists
      ? 'ALLOW_SELECT_RUN_ID override present — operator-approved'
      : 'FAIL: SELECT_RUN_ID present but ALLOW_SELECT_RUN_ID not found — remove SELECT_RUN_ID',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_RDY_SELECT02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_RDY_SELECT02.md'), [
  '# REGRESSION_RG_RDY_SELECT02.md — Selector Absent in Daily', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `SELECT_RUN_ID_PRESENT: ${selectExists}`,
  `ALLOW_SELECT_RUN_ID_PRESENT: ${allowExists}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_rdy_select02_selector_absent_in_daily.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_RDY_SELECT02_SELECTOR_MUST_BE_ABSENT_IN_DAILY',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  select_run_id_present: selectExists,
  allow_select_run_id_present: allowExists,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_rdy_select02_selector_absent_in_daily — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
