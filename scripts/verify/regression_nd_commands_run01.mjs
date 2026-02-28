/**
 * regression_nd_commands_run01.mjs
 *
 * RG_ND_COMMANDS_RUN01: verify that normalizeForMega in executor_mega_proof_x2.mjs
 * contains the targeted volatile-hash filters that fix ND01_SEM01.
 *
 * Root cause: COMMANDS_RUN.md is part of the p0 evidence scope. Between mega:proof
 * run1 and run2, COMMANDS_RUN.md changes => SCOPE_MANIFEST_SHA and receipt-chain
 * final= hashes differ in step output code-blocks => semantic fingerprint mismatch.
 * Fix: filter those hash-carrying lines in normalizeForMega.
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s verify:regression:nd-commands-run01';
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const megaSrc = fs.readFileSync(
  path.join(ROOT, 'scripts', 'executor', 'executor_mega_proof_x2.mjs'),
  'utf8'
);

const hasScopeManifestFilter = megaSrc.includes('SCOPE_MANIFEST_SHA=[0-9a-f]+');
const hasFinalReceiptFilter = megaSrc.includes(',\\s*final=[0-9a-f]{16,}');
// Stability contract must still hold (mode === 'noise' must not be removed)
const modeNoisePresent = megaSrc.includes("mode === 'noise'");
// ND01_SEM01 fix comment must be present as documentation marker
const hasFixComment = megaSrc.includes('ND01_SEM01 fix');

const status = hasScopeManifestFilter && hasFinalReceiptFilter && modeNoisePresent && hasFixComment
  ? 'PASS'
  : 'FAIL';
const reasonCode = status === 'PASS' ? 'NONE' : 'RG_ND_COMMANDS_RUN01_MISSING';

writeMd(
  path.join(EXEC_DIR, 'REGRESSION_ND_COMMANDS_RUN01.md'),
  `# REGRESSION_ND_COMMANDS_RUN01.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_scope_manifest_filter: ${hasScopeManifestFilter}\n- has_final_receipt_filter: ${hasFinalReceiptFilter}\n- mode_noise_preserved: ${modeNoisePresent}\n- has_fix_comment: ${hasFixComment}\n`
);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_nd_commands_run01.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS'
    ? 'ND01_SEM01 fix filters present in normalizeForMega.'
    : 'ND01_SEM01 fix filters MISSING from normalizeForMega.',
  next_action: NEXT_ACTION,
  has_scope_manifest_filter: hasScopeManifestFilter,
  has_final_receipt_filter: hasFinalReceiptFilter,
  mode_noise_preserved: modeNoisePresent,
  has_fix_comment: hasFixComment,
});

console.log(`[${status}] regression_nd_commands_run01 — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
