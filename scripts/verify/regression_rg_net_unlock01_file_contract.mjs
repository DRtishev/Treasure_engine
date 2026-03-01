/**
 * regression_rg_net_unlock01_file_contract.mjs — RG_NET_UNLOCK01_FILE_CONTRACT
 *
 * Gate: verifies net_unlock.mjs and net_lock.mjs implement the ALLOW_NETWORK
 *       file contract by source inspection:
 *
 *   unlock contract:
 *     - no file → unlock creates it with exact content "ALLOW_NETWORK: YES"
 *     - file exists with correct content → idempotent PASS (already_unlocked)
 *     - file exists with wrong content → BLOCKED NET_UNLOCK01 (tamper_detected)
 *
 *   lock contract:
 *     - file present correct content → removes file, PASS
 *     - file absent → BLOCKED NET_UNLOCK01 (lock_without_unlock)
 *     - file present wrong content → BLOCKED NET_UNLOCK01 (tamper_detected)
 *
 *   Also verifies ALLOW_NETWORK is NOT currently present (daily hygiene).
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
const UNLOCK_SCRIPT = path.join(ROOT, 'scripts/ops/net_unlock.mjs');
const LOCK_SCRIPT = path.join(ROOT, 'scripts/ops/net_lock.mjs');
const ALLOW_CONTENT = 'ALLOW_NETWORK: YES';
const ALLOW_FILE = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');

const checks = [];

// ─────────────────────────────────────────────────────────────────────────
// Unlock script contract
// ─────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(UNLOCK_SCRIPT)) {
  checks.push({ check: 'unlock_script_exists', pass: false, detail: 'net_unlock.mjs missing' });
} else {
  const src = fs.readFileSync(UNLOCK_SCRIPT, 'utf8');

  // Creates file with exact content
  const createsFile = src.includes(`'${ALLOW_CONTENT}'`) || src.includes(`"${ALLOW_CONTENT}"`);
  checks.push({
    check: 'unlock_creates_exact_content',
    pass: createsFile,
    detail: createsFile ? `creates "${ALLOW_CONTENT}" — OK` : `FAIL: exact content "${ALLOW_CONTENT}" not found`,
  });

  // Detects tamper (wrong content → BLOCKED)
  const detectsTamper = src.includes('tamper_detected') && src.includes('NET_UNLOCK01');
  checks.push({
    check: 'unlock_tamper_detection',
    pass: detectsTamper,
    detail: detectsTamper ? 'tamper detection present — OK' : 'FAIL: tamper detection missing',
  });

  // Idempotent (already_unlocked path)
  const isIdempotent = src.includes('already_unlocked');
  checks.push({
    check: 'unlock_idempotent',
    pass: isIdempotent,
    detail: isIdempotent ? 'idempotent already_unlocked path present — OK' : 'FAIL: idempotent path missing',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Lock script contract
// ─────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(LOCK_SCRIPT)) {
  checks.push({ check: 'lock_script_exists', pass: false, detail: 'net_lock.mjs missing' });
} else {
  const src = fs.readFileSync(LOCK_SCRIPT, 'utf8');

  // Removes file on success
  const removesFile = src.includes('unlinkSync');
  checks.push({
    check: 'lock_removes_file',
    pass: removesFile,
    detail: removesFile ? 'unlinkSync present — OK' : 'FAIL: file removal missing',
  });

  // Fail-closed if file absent
  const failsIfAbsent = src.includes('lock_without_unlock') && src.includes('NET_UNLOCK01');
  checks.push({
    check: 'lock_fail_closed_if_absent',
    pass: failsIfAbsent,
    detail: failsIfAbsent ? 'lock_without_unlock fail-closed — OK' : 'FAIL: fail-closed on absent missing',
  });

  // Fail-closed if wrong content
  const failsIfWrong = src.includes('tamper_detected');
  checks.push({
    check: 'lock_fail_closed_if_wrong_content',
    pass: failsIfWrong,
    detail: failsIfWrong ? 'tamper_detected fail-closed — OK' : 'FAIL: fail-closed on wrong content missing',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Daily hygiene: ALLOW_NETWORK must NOT be present right now
// ─────────────────────────────────────────────────────────────────────────
const allowExists = fs.existsSync(ALLOW_FILE);
checks.push({
  check: 'allow_network_absent_daily',
  pass: !allowExists,
  detail: allowExists
    ? `FAIL: ALLOW_NETWORK present — run ops:net:lock`
    : 'ALLOW_NETWORK absent — OK',
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_NET_UNLOCK01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_NET_UNLOCK01.md'), [
  '# REGRESSION_RG_NET_UNLOCK01.md — Net Unlock File Contract', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_net_unlock01_file_contract.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_UNLOCK01_FILE_CONTRACT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_net_unlock01_file_contract — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
