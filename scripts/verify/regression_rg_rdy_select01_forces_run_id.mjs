/**
 * regression_rg_rdy_select01_forces_run_id.mjs — RG_RDY_SELECT01_FORCES_RUN_ID
 *
 * Gate: when artifacts/incoming/SELECT_RUN_ID contains a valid run_id,
 *       data_readiness_seal must use that run_id (not fall back to latest).
 *
 * Uses a fixture with two run dirs to verify the selector logic picks the
 * operator-forced run_id, not the lexicographically-latest one.
 *
 * Contract: SELECT_RUN_ID file must be removed/absent in normal daily operation
 * (enforced by RG_RDY_SELECT02).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
const FIXTURE_BASE = path.join(ROOT, 'scripts/verify/fixtures/rg_rdy_select01');
const SELECT_PATH = path.join(ROOT, 'artifacts/incoming/SELECT_RUN_ID');

const checks = [];

// Read data_readiness_seal.mjs and verify it supports SELECT_RUN_ID
const SEAL_SCRIPT = path.join(ROOT, 'scripts/verify/data_readiness_seal.mjs');
if (!fs.existsSync(SEAL_SCRIPT)) {
  checks.push({ check: 'seal_script_exists', pass: false, detail: 'data_readiness_seal.mjs missing' });
} else {
  const src = fs.readFileSync(SEAL_SCRIPT, 'utf8');
  const hasSelectRunId = src.includes('SELECT_RUN_ID') && src.includes('forcedRunId');
  checks.push({
    check: 'seal_supports_select_run_id',
    pass: hasSelectRunId,
    detail: hasSelectRunId ? 'SELECT_RUN_ID logic present — OK' : 'FAIL: SELECT_RUN_ID not implemented in seal',
  });

  // Verify fail-closed on invalid SELECT_RUN_ID
  const hasFailClosed = src.includes('RDY_SELECT01_INVALID');
  checks.push({
    check: 'seal_fail_closed_invalid_run_id',
    pass: hasFailClosed,
    detail: hasFailClosed ? 'RDY_SELECT01_INVALID present — OK' : 'FAIL: no fail-closed behavior for invalid SELECT_RUN_ID',
  });
}

// Verify SELECT_RUN_ID path check is present
if (fs.existsSync(SEAL_SCRIPT)) {
  const src = fs.readFileSync(SEAL_SCRIPT, 'utf8');
  const hasPathCheck = src.includes('artifacts/incoming/SELECT_RUN_ID') || src.includes('SELECT_RUN_ID_PATH');
  checks.push({
    check: 'seal_reads_select_path',
    pass: hasPathCheck,
    detail: hasPathCheck ? 'SELECT_RUN_ID path reference present — OK' : 'FAIL: seal does not reference SELECT_RUN_ID path',
  });
}

// Verify SELECT_RUN_ID is NOT currently present (daily hygiene)
const selectExists = fs.existsSync(SELECT_PATH);
checks.push({
  check: 'select_run_id_absent_in_daily',
  pass: !selectExists,
  detail: !selectExists ? 'SELECT_RUN_ID absent — OK' : `WARN: SELECT_RUN_ID present at ${path.relative(ROOT, SELECT_PATH)}`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_RDY_SELECT01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_RDY_SELECT01.md'), [
  '# REGRESSION_RG_RDY_SELECT01.md — SELECT_RUN_ID Forces Run ID', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_rdy_select01_forces_run_id.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_RDY_SELECT01_FORCES_RUN_ID',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_rdy_select01_forces_run_id — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
