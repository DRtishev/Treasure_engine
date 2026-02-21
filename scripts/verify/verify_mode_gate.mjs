/**
 * verify_mode_gate.mjs — VERIFY_MODE validation + VM04 fingerprint format check
 *
 * Validates current VERIFY_MODE and its required artifacts.
 * VM01: BLOCKED — BUNDLE mode but manifest missing required fingerprint field
 * VM03: BLOCKED — GIT mode but .git missing
 * VM04: FAIL — Bundle fingerprint malformed
 * PASS: Mode is valid and all required artifacts present
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');

const BUNDLE_SHA_SHORT_RE = /^[0-9a-f]{7,12}$/;
const SOURCE_FP_RE = /^sha256:[0-9a-f]{64}$/;

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const verifyMode = (process.env.VERIFY_MODE || 'GIT').toUpperCase();
const treasureRunId = process.env.TREASURE_RUN_ID || null;
const bundleCommitSha = process.env.BUNDLE_COMMIT_SHA_SHORT || null;
const sourceFingerprint = process.env.SOURCE_FINGERPRINT || null;

let status, reason_code, message, next_action;
const checks = [];

// ---------------------------------------------------------------------------
// TREASURE_RUN_ID override check
// ---------------------------------------------------------------------------
if (treasureRunId) {
  checks.push({ check: 'TREASURE_RUN_ID', result: 'SET', value: treasureRunId });
}

// ---------------------------------------------------------------------------
// Mode-specific validation
// ---------------------------------------------------------------------------
if (verifyMode === 'GIT') {
  const gitDir = path.join(ROOT, '.git');
  const gitExists = fs.existsSync(gitDir);
  checks.push({ check: 'git_dir', result: gitExists ? 'PRESENT' : 'MISSING', path: '.git' });

  if (!gitExists && !treasureRunId) {
    status = 'BLOCKED';
    reason_code = 'VM03';
    message = 'VERIFY_MODE=GIT but .git directory is missing. Cannot derive RUN_ID from git.';
    next_action = 'Ensure this is a git repository (git init or git clone), or set VERIFY_MODE=BUNDLE with a valid fingerprint.';
  } else {
    status = 'PASS';
    reason_code = 'NONE';
    message = `VERIFY_MODE=GIT. RUN_ID resolved from git: ${RUN_ID}. .git directory ${gitExists ? 'present' : 'overridden by TREASURE_RUN_ID'}.`;
    next_action = 'No action required. VERIFY_MODE=GIT is valid.';
  }

} else if (verifyMode === 'BUNDLE') {
  // Check fingerprint presence and format
  if (!bundleCommitSha && !sourceFingerprint) {
    status = 'BLOCKED';
    reason_code = 'VM01';
    message = 'VERIFY_MODE=BUNDLE but neither BUNDLE_COMMIT_SHA_SHORT nor SOURCE_FINGERPRINT is set.';
    next_action = 'Set BUNDLE_COMMIT_SHA_SHORT (^[0-9a-f]{7,12}$) or SOURCE_FINGERPRINT (^sha256:[0-9a-f]{64}$).';
    checks.push({ check: 'fingerprint', result: 'MISSING' });
  } else if (bundleCommitSha && !BUNDLE_SHA_SHORT_RE.test(bundleCommitSha)) {
    status = 'FAIL';
    reason_code = 'VM04';
    message = `BUNDLE_COMMIT_SHA_SHORT "${bundleCommitSha}" is malformed. Must match ^[0-9a-f]{7,12}$ (lowercase hex only).`;
    next_action = 'Fix BUNDLE_COMMIT_SHA_SHORT to use only lowercase hexadecimal characters, 7-12 chars.';
    checks.push({ check: 'BUNDLE_COMMIT_SHA_SHORT', result: 'MALFORMED', value: bundleCommitSha });
  } else if (sourceFingerprint && !SOURCE_FP_RE.test(sourceFingerprint)) {
    status = 'FAIL';
    reason_code = 'VM04';
    message = `SOURCE_FINGERPRINT "${sourceFingerprint}" is malformed. Must match ^sha256:[0-9a-f]{64}$ (lowercase hex only).`;
    next_action = 'Fix SOURCE_FINGERPRINT to use the format "sha256:" followed by 64 lowercase hex chars.';
    checks.push({ check: 'SOURCE_FINGERPRINT', result: 'MALFORMED', value: sourceFingerprint });
  } else {
    const activeFingerprint = bundleCommitSha ?? sourceFingerprint;
    const fingerprintType = bundleCommitSha ? 'BUNDLE_COMMIT_SHA_SHORT' : 'SOURCE_FINGERPRINT';
    status = 'PASS';
    reason_code = 'NONE';
    message = `VERIFY_MODE=BUNDLE. ${fingerprintType} is well-formed: "${activeFingerprint}". RUN_ID=${RUN_ID}.`;
    next_action = 'No action required. VERIFY_MODE=BUNDLE fingerprint is valid.';
    checks.push({ check: fingerprintType, result: 'VALID', value: activeFingerprint });
  }
} else {
  status = 'FAIL';
  reason_code = 'VM04';
  message = `Unknown VERIFY_MODE="${verifyMode}". Expected GIT or BUNDLE.`;
  next_action = 'Set VERIFY_MODE to GIT or BUNDLE.';
  checks.push({ check: 'VERIFY_MODE', result: 'UNKNOWN', value: verifyMode });
}

// Write machine JSON
const gateResult = {
  schema_version: '1.0.0',
  checks,
  message,
  next_action,
  reason_code,
  run_id: RUN_ID,
  status,
  verify_mode: verifyMode,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'verify_mode_gate.json'), gateResult);

// Write markdown evidence
const checksTable = checks.map((c) =>
  `| ${c.check} | ${c.result} | ${c.value ?? '-'} |`
).join('\n');

const md = `# VERIFY_MODE_GATE.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Gate Results

| Check | Result | Value |
|-------|--------|-------|
| VERIFY_MODE | ${verifyMode} | - |
${checksTable}

## Message

${message}

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/verify_mode_gate.json
- reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md
`;

fs.writeFileSync(path.join(EVIDENCE_DIR, 'VERIFY_MODE_GATE.md'), md);

if (status === 'PASS') {
  console.log(`[PASS] verify_mode_gate — VERIFY_MODE=${verifyMode}, RUN_ID=${RUN_ID}`);
  process.exit(0);
} else {
  console.error(`[${status}] verify_mode_gate — ${reason_code}: ${message}`);
  process.exit(1);
}
