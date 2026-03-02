/**
 * regression_epoch_skip01_respects_tracked_state.mjs
 * — RG_EPOCH_SKIP01_RESPECTS_TRACKED_STATE
 *
 * Validates the EPOCH-* dir skip in reason gates (REASON01 / REASON02):
 *
 *   1) Checks git-tracked EPOCH-* gate receipts. If tracked files with
 *      reason_code fields exist, the skip would mask potential violations
 *      and the gate FAILs.
 *   2) If tracked EPOCH gate receipts have NO reason_code (old format),
 *      the skip is safe → PASS.
 *   3) Verifies FILES_SCANNED is deterministic x2 by running REASON01 twice.
 *
 * Gate ID : RG_EPOCH_SKIP01_RESPECTS_TRACKED_STATE
 * Wired   : verify:fast
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

const GATE_ID = 'RG_EPOCH_SKIP01_RESPECTS_TRACKED_STATE';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// --- Check 1: List tracked EPOCH gate receipts ---
const lsResult = spawnSync(
  'git', ['ls-files', 'reports/evidence/EPOCH-*'],
  { cwd: ROOT, encoding: 'utf8' }
);
const trackedEpochFiles = String(lsResult.stdout || '')
  .split('\n').map((l) => l.trim()).filter(Boolean);
const trackedGateReceipts = trackedEpochFiles.filter(
  (f) => f.includes('gates/manual') && f.endsWith('.json')
);

checks.push({
  check: 'tracked_epoch_files_total',
  pass: true,
  detail: `${trackedEpochFiles.length} tracked EPOCH-* files`,
});

checks.push({
  check: 'tracked_epoch_gate_receipts',
  pass: true,
  detail: `${trackedGateReceipts.length} tracked gate receipts in EPOCH-* dirs`,
});

// --- Check 2: Do tracked EPOCH gate receipts have reason_code? ---
let receiptsWithReasonCode = 0;
const maskedViolations = [];

for (const rel of trackedGateReceipts) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  let data;
  try { data = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch { continue; }
  if (data.reason_code !== undefined && data.reason_code !== null) {
    receiptsWithReasonCode++;
    // Check if the reason_code would actually violate REASON01 token purity
    const TOKEN_RE = /^[A-Z0-9_]+$/;
    if (!TOKEN_RE.test(String(data.reason_code))) {
      maskedViolations.push({ path: rel, reason_code: String(data.reason_code) });
    }
  }
}

checks.push({
  check: 'tracked_receipts_with_reason_code',
  pass: maskedViolations.length === 0,
  detail: maskedViolations.length === 0
    ? `${receiptsWithReasonCode} have reason_code, 0 would be masked violations`
    : `${maskedViolations.length} masked violations found`,
});

// --- Check 3: FILES_SCANNED determinism x2 ---
// Run REASON01 twice and compare FILES_SCANNED
function getFilesScanned() {
  const r = spawnSync(
    process.execPath,
    ['scripts/verify/regression_rg_reason01_token_purity.mjs'],
    { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  const receiptPath = path.join(MANUAL, 'regression_rg_reason01_token_purity.json');
  if (!fs.existsSync(receiptPath)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    return d.files_scanned;
  } catch { return null; }
}

const scan1 = getFilesScanned();
const scan2 = getFilesScanned();
const scanStable = scan1 !== null && scan2 !== null && scan1 === scan2;

checks.push({
  check: 'files_scanned_determinism_x2',
  pass: scanStable,
  detail: scanStable
    ? `FILES_SCANNED=${scan1} stable x2`
    : `run1=${scan1} run2=${scan2} MISMATCH`,
});

// --- Result ---
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_EPOCH_SKIP01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_EPOCH_SKIP01_RESPECTS_TRACKED_STATE.md'), [
  '# REGRESSION_EPOCH_SKIP01_RESPECTS_TRACKED_STATE.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## MASKED_VIOLATIONS',
  maskedViolations.length === 0
    ? '- NONE'
    : maskedViolations.map((v) => `- ${v.path}: reason_code=${v.reason_code}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_epoch_skip01_respects_tracked_state.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  tracked_epoch_files_total: trackedEpochFiles.length,
  tracked_gate_receipts: trackedGateReceipts.length,
  receipts_with_reason_code: receiptsWithReasonCode,
  masked_violations_n: maskedViolations.length,
  files_scanned_run1: scan1,
  files_scanned_run2: scan2,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_epoch_skip01_respects_tracked_state — ${reason_code}`);
if (failed.length > 0) {
  for (const c of failed) console.log(`  [FAIL] ${c.check}: ${c.detail}`);
}
process.exit(status === 'PASS' ? 0 : 1);
