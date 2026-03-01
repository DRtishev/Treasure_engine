/**
 * regression_rg_net_unlock02_no_allow_file_after_lock.mjs — RG_NET_UNLOCK02
 *
 * Gate: after ops:net:lock runs successfully, artifacts/incoming/ALLOW_NETWORK
 *       MUST be absent. Verifies the lock script actually removes the file.
 *
 * Also verifies bootstrap script always-runs net:lock (even on acquire fail).
 *
 * Verified by source-code inspection + daily state check.
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
const LOCK_SCRIPT = path.join(ROOT, 'scripts/ops/net_lock.mjs');
const BOOTSTRAP_SCRIPT = path.join(ROOT, 'scripts/ops/node_toolchain_bootstrap.mjs');
const ALLOW_FILE = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');

const checks = [];

// ─────────────────────────────────────────────────────────────────────────
// Lock script removes file
// ─────────────────────────────────────────────────────────────────────────
if (fs.existsSync(LOCK_SCRIPT)) {
  const src = fs.readFileSync(LOCK_SCRIPT, 'utf8');
  const removesFile = src.includes('unlinkSync');
  checks.push({
    check: 'lock_script_removes_allow_file',
    pass: removesFile,
    detail: removesFile ? 'unlinkSync in lock script — OK' : 'FAIL: lock does not remove ALLOW_NETWORK',
  });

  const writesReceipt = src.includes('file_removed');
  checks.push({
    check: 'lock_script_records_file_removed',
    pass: writesReceipt,
    detail: writesReceipt ? 'file_removed field in receipt — OK' : 'FAIL: lock does not record file_removed',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Bootstrap always runs lock (even on acquire failure)
// ─────────────────────────────────────────────────────────────────────────
if (fs.existsSync(BOOTSTRAP_SCRIPT)) {
  const src = fs.readFileSync(BOOTSTRAP_SCRIPT, 'utf8');
  // Check that lock step is referenced after acquire, outside of any if-block that would skip it
  const hasAlwaysLock = src.includes('S3:net:lock') && src.includes('always');
  checks.push({
    check: 'bootstrap_always_runs_lock',
    pass: hasAlwaysLock,
    detail: hasAlwaysLock ? 'bootstrap always-runs net:lock comment present — OK' : 'FAIL: no evidence bootstrap always runs lock',
  });

  // Lock step defined for failure path
  const hasLockInFailPath = src.includes("'S3:net:lock(cleanup)'") || src.includes('"S3:net:lock(cleanup)"');
  checks.push({
    check: 'bootstrap_lock_in_failure_path',
    pass: hasLockInFailPath,
    detail: hasLockInFailPath ? 'lock cleanup in failure path — OK' : 'FAIL: lock not in failure path of bootstrap',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Daily state: file must be absent right now (lock has been applied)
// ─────────────────────────────────────────────────────────────────────────
const allowExists = fs.existsSync(ALLOW_FILE);
checks.push({
  check: 'allow_network_absent_now',
  pass: !allowExists,
  detail: allowExists
    ? 'FAIL: ALLOW_NETWORK still present — run: npm run -s ops:net:lock'
    : 'ALLOW_NETWORK absent — lock applied correctly — OK',
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_NET_UNLOCK02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_NET_UNLOCK02.md'), [
  '# REGRESSION_RG_NET_UNLOCK02.md — No Allow File After Lock', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_net_unlock02_no_allow_file_after_lock.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_UNLOCK02_NO_ALLOW_FILE_AFTER_LOCK',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_net_unlock02_no_allow_file_after_lock — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
