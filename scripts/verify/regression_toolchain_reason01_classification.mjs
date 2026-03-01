/**
 * regression_toolchain_reason01_classification.mjs — RG_TOOLCHAIN_REASON01_CLASSIFICATION
 *
 * Gate: node_toolchain_ensure must classify toolchain states with correct reason_code.
 *
 * SSOT canon:
 *   ACQ_LOCK01 — lock file missing (or parse/schema error)
 *   NT02       — lock ok, but binary missing / not-executable / wrong version
 *   NETV01     — FORBIDDEN in all ensure scenarios (reserved for CERT net-kill)
 *
 * Verification method: source-code inspection (no fixture execution needed).
 * Deterministic, offline, no network.
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
const ENSURE_SCRIPT = path.join(ROOT, 'scripts/ops/node_toolchain_ensure.mjs');

const checks = [];

if (!fs.existsSync(ENSURE_SCRIPT)) {
  checks.push({ check: 'ensure_script_exists', pass: false, detail: 'node_toolchain_ensure.mjs missing' });
} else {
  const src = fs.readFileSync(ENSURE_SCRIPT, 'utf8');

  // Remove comment lines to avoid false matches
  const codeLines = src.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 1: lock missing → ACQ_LOCK01
  // ─────────────────────────────────────────────────────────────────────────
  const hasLockMissingAcqLock01 = /ACQ_LOCK01/.test(codeLines) &&
    (/existsSync.*LOCK_PATH/.test(codeLines) || /LOCK_PATH.*existsSync/.test(codeLines));
  checks.push({
    check: 'case1_lock_missing_yields_ACQ_LOCK01',
    pass: hasLockMissingAcqLock01,
    detail: hasLockMissingAcqLock01
      ? 'ACQ_LOCK01 used when lock absent — OK'
      : 'FAIL: ACQ_LOCK01 not used for lock_missing path',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 2: lock ok + binary missing → NT02
  // ─────────────────────────────────────────────────────────────────────────
  const hasBinaryMissingNT02 = /NT02/.test(codeLines) &&
    (/toolchain_binary_missing/.test(codeLines));
  checks.push({
    check: 'case2_binary_missing_yields_NT02',
    pass: hasBinaryMissingNT02,
    detail: hasBinaryMissingNT02
      ? 'NT02 used for toolchain_binary_missing — OK'
      : 'FAIL: NT02 not used for binary_missing path',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 3: lock ok + !X_OK → NT02
  // ─────────────────────────────────────────────────────────────────────────
  const hasNotExecutableNT02 = /NT02/.test(codeLines) &&
    /toolchain_not_executable/.test(codeLines);
  checks.push({
    check: 'case3_not_executable_yields_NT02',
    pass: hasNotExecutableNT02,
    detail: hasNotExecutableNT02
      ? 'NT02 used for toolchain_not_executable — OK'
      : 'FAIL: NT02 not used for not_executable path',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 4: lock ok + wrong version → NT02
  // ─────────────────────────────────────────────────────────────────────────
  const hasWrongVersionNT02 = /NT02/.test(codeLines) &&
    /toolchain_wrong_version/.test(codeLines);
  checks.push({
    check: 'case4_wrong_version_yields_NT02',
    pass: hasWrongVersionNT02,
    detail: hasWrongVersionNT02
      ? 'NT02 used for toolchain_wrong_version — OK'
      : 'FAIL: NT02 not used for wrong_version path',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ANTI: NETV01 MUST NOT appear in ensure for any local toolchain state
  // ─────────────────────────────────────────────────────────────────────────
  // Check that NETV01 does not appear as an assigned reason_code in code
  const netv01InCode = /reason_code\s*=\s*['"]NETV01['"]/.test(codeLines);
  checks.push({
    check: 'anti_NETV01_forbidden_in_ensure',
    pass: !netv01InCode,
    detail: !netv01InCode
      ? 'NETV01 not assigned in ensure — OK'
      : 'FAIL: NETV01 still assigned in node_toolchain_ensure (forbidden)',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DETAIL KIND: each classification must set detail.kind
  // ─────────────────────────────────────────────────────────────────────────
  const detailKinds = [
    'lock_missing',
    'lock_parse_error',
    'lock_status_not_ready',
    'lock_version_mismatch',
    'toolchain_binary_missing',
    'toolchain_not_executable',
    'toolchain_wrong_version',
  ];
  const allKindsPresent = detailKinds.every((k) => src.includes(`'${k}'`) || src.includes(`"${k}"`));
  checks.push({
    check: 'all_detail_kinds_present',
    pass: allKindsPresent,
    detail: allKindsPresent
      ? 'all detail.kind values present — OK'
      : `FAIL: missing kind values: ${detailKinds.filter((k) => !src.includes(`'${k}'`) && !src.includes(`"${k}"`)).join(', ')}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Verify current receipt (must be ACQ_LOCK01 or NT02, never NETV01)
// ─────────────────────────────────────────────────────────────────────────
const receiptPath = path.join(MANUAL, 'node_toolchain_ensure.json');
if (fs.existsSync(receiptPath)) {
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const rc = receipt.reason_code;
  const isNetv01 = rc === 'NETV01';
  checks.push({
    check: 'live_receipt_reason_code_not_NETV01',
    pass: !isNetv01,
    detail: !isNetv01
      ? `live receipt reason_code=${rc} — OK`
      : 'FAIL: live receipt still has NETV01 — run ensure again',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_TOOLCHAIN_REASON01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_TOOLCHAIN_REASON01.md'), [
  '# REGRESSION_TOOLCHAIN_REASON01.md — Toolchain Reason Classification', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_toolchain_reason01_classification.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_TOOLCHAIN_REASON01_CLASSIFICATION',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_toolchain_reason01_classification — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
