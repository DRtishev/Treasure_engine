/**
 * edge_calm_p0_x2.mjs — CALM P0 Anti-Flake X2 Determinism Gate
 *
 * Implements CALM_P0_X2_COMMAND (ANTI_FLAKE) per firmware SHAMAN_P0_MASTER_HARDENING_FIRMWARE.
 *
 * Behavior:
 *   1. Run calm P0 twice using identical RUN_ID source rules.
 *   2. After each run, read CHECKSUMS.md to extract SCOPE_MANIFEST_SHA + sorted sha256_norm rows.
 *   3. Compute deterministic fingerprint = sha256_norm(SCOPE_MANIFEST_SHA + sorted_norm_rows).
 *   4. Compare fingerprints. Mismatch => FAIL ND01.
 *
 * Writes:
 *   reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md
 *   reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Norm, sha256Raw, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const P0_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0');
const MANUAL_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');
const CHECKSUMS_PATH = path.join(P0_DIR, 'CHECKSUMS.md');

fs.mkdirSync(P0_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Extract fingerprint components from CHECKSUMS.md
// Fingerprint = sha256_norm( scope_manifest_sha + "\n" + sorted_sha256_norm_rows )
// ---------------------------------------------------------------------------
function extractChecksumsFingerprint() {
  if (!fs.existsSync(CHECKSUMS_PATH)) {
    return { fingerprint: 'MISSING', scope_manifest_sha: 'MISSING', norm_rows_count: 0, norm_rows: [], rowPairs: [] };
  }

  const content = fs.readFileSync(CHECKSUMS_PATH, 'utf8');
  const smsMatch = content.match(/scope_manifest_sha\s*\|\s*`([0-9a-f]{64})`/);
  const scope_manifest_sha = smsMatch ? smsMatch[1] : 'NOT_FOUND';

  const rowPairs = [];
  const rowRe = /\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|\s*`([0-9a-f]{64})`\s*\|/g;
  let m;
  while ((m = rowRe.exec(content)) !== null) {
    rowPairs.push({ path: m[1], sha256_norm: m[3] });
  }

  const sortedPairs = [...rowPairs].sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const sortedRows = sortedPairs.map((x) => x.sha256_norm);
  const fingerprintInput = [scope_manifest_sha, ...sortedPairs.map((x) => `${x.path}|${x.sha256_norm}`)].join('\n');
  const fingerprint = sha256Norm(fingerprintInput);

  return { fingerprint, scope_manifest_sha, norm_rows_count: sortedRows.length, norm_rows: sortedRows, rowPairs: sortedPairs };
}

function removeIfExists(relPath) {
  const abs = path.join(ROOT, relPath);
  if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
}

function prepareRunCleanRoom() {
  const derived = [
    'reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md',
    'reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md',
    'reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json',
    'reports/evidence/EDGE_LAB/gates/manual/evidence_hashes.json',
    'reports/evidence/EDGE_LAB/gates/manual/receipts_chain.json',
  ];
  for (const rel of derived) removeIfExists(rel);
}

// ---------------------------------------------------------------------------
// Run calm P0 pipeline once
// ---------------------------------------------------------------------------
function runCalmP0(runNum) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`CALM P0 X2 — Run ${runNum} of 2`);
  console.log(`RUN_ID: ${RUN_ID}`);
  console.log('='.repeat(60));

  prepareRunCleanRoom();
  const scriptPath = path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'edge_calm_mode_p0.mjs');
  let exitCode = 0;
  let output = '';

  try {
    output = execSync(`node "${scriptPath}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
      env: { ...process.env },
    });
    console.log(output.trim());
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString().trim() : '';
    const stderr = err.stderr ? err.stderr.toString().trim() : '';
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    exitCode = err.status || 1;
    output = stdout + '\n' + stderr;
  }

  const snap = extractChecksumsFingerprint();
  console.log(`[X2] Run ${runNum} fingerprint: ${snap.fingerprint}`);
  console.log(`[X2] Run ${runNum} scope_manifest_sha: ${snap.scope_manifest_sha}`);
  console.log(`[X2] Run ${runNum} norm_rows_count: ${snap.norm_rows_count}`);

  return { runNum, exitCode, ...snap };
}

// ---------------------------------------------------------------------------
// Main: two consecutive runs
// ---------------------------------------------------------------------------
console.log('');
console.log('='.repeat(60));
console.log('CALM P0 ANTI-FLAKE X2 — Determinism Verification');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

const run1 = runCalmP0(1);
const run2 = runCalmP0(2);

const fingerprintsMatch = run1.fingerprint === run2.fingerprint;
const status = fingerprintsMatch ? 'PASS' : 'FAIL';
const reasonCode = fingerprintsMatch ? 'NONE' : 'ND01';

// Drift analysis by relpath + sha256_norm pair
const run1Map = new Map(run1.rowPairs.map((x) => [x.path, x.sha256_norm]));
const run2Map = new Map(run2.rowPairs.map((x) => [x.path, x.sha256_norm]));
const driftPaths = Array.from(new Set([...run1Map.keys(), ...run2Map.keys()]))
  .sort((a, b) => a.localeCompare(b, 'en'))
  .filter((p) => run1Map.get(p) !== run2Map.get(p));
const driftCount = driftPaths.length;

const message = fingerprintsMatch
  ? `CALM P0 is deterministic across two consecutive runs. SCOPE_MANIFEST_SHA stable. ${run1.norm_rows_count} sha256_norm rows match exactly.`
  : `FAIL ND01: Nondeterminism detected in CALM P0 output. Fingerprint mismatch after two runs. ${driftCount} sha256_norm rows drifted.`;

const nextAction = fingerprintsMatch
  ? 'Proceed to npm run edge:micro:live:readiness.'
  : 'Investigate nondeterministic evidence outputs. Fix drift before proceeding. Rerun edge:calm:p0:x2 to verify.';

// ---------------------------------------------------------------------------
// Write CALM_P0_ANTI_FLAKE_X2.md
// ---------------------------------------------------------------------------
const run1RowsSample = run1.norm_rows.slice(0, 5).map((r) => `  - ${r.slice(0, 24)}…`).join('\n');
const run2RowsSample = run2.norm_rows.slice(0, 5).map((r) => `  - ${r.slice(0, 24)}…`).join('\n');

const driftSection = driftCount > 0
  ? `## Drift Details\n\nDrifted paths: ${driftPaths.length}\n${driftPaths.map((p) => `- ${p}`).join('\n')}\n`
  : '## Drift Details\n\nNO DRIFT — all sha256_norm rows identical across both runs.\n';

const antiFlakeMd = `# CALM_P0_ANTI_FLAKE_X2.md — Calm P0 Determinism Verification

STATUS: ${status}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Methodology

Runs edge:calm:p0 (CANON_SELFTEST → DATA_COURT → EVIDENCE_HASHES → RECEIPTS_CHAIN) twice.
After each run, reads CHECKSUMS.md and extracts SCOPE_MANIFEST_SHA + sorted sha256_norm rows.
Computes fingerprint = sha256_norm(SCOPE_MANIFEST_SHA + sorted_sha256_norm_rows).
Compares fingerprints: mismatch => FAIL ND01.

## Fingerprints

| Run | Fingerprint | scope_manifest_sha (prefix) | norm_rows |
|-----|-------------|----------------------------|-----------|
| run1 | ${run1.fingerprint} | ${run1.scope_manifest_sha.slice(0, 16)}… | ${run1.norm_rows_count} |
| run2 | ${run2.fingerprint} | ${run2.scope_manifest_sha.slice(0, 16)}… | ${run2.norm_rows_count} |

## Fingerprint Match

MATCH: ${fingerprintsMatch ? 'YES' : 'NO'}

## SHA256_NORM Row Sample (Run 1, first 5)

${run1.norm_rows_count > 0 ? run1RowsSample : '  (none)'}

## SHA256_NORM Row Sample (Run 2, first 5)

${run2.norm_rows_count > 0 ? run2RowsSample : '  (none)'}

${driftSection}
## Verdicts

| Gate | Status |
|------|--------|
| CALM_P0_RUN1 | ${run1.exitCode === 0 ? 'PASS' : 'FAIL (exit ' + run1.exitCode + ')'} |
| CALM_P0_RUN2 | ${run2.exitCode === 0 ? 'PASS' : 'FAIL (exit ' + run2.exitCode + ')'} |
| FINGERPRINT_MATCH | ${fingerprintsMatch ? 'PASS' : 'FAIL ND01'} |

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/CALM_P0_ANTI_FLAKE_X2.md
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json
- reports/evidence/EDGE_LAB/P0/CHECKSUMS.md (source of fingerprint)
`;

writeMd(path.join(P0_DIR, 'CALM_P0_ANTI_FLAKE_X2.md'), antiFlakeMd);

// ---------------------------------------------------------------------------
// Write calm_p0_x2.json
// ---------------------------------------------------------------------------
const x2Gate = {
  schema_version: '1.0.0',
  drift_count: driftCount,
  drift_paths: driftPaths,
  fingerprint_run1: run1.fingerprint,
  fingerprint_run2: run2.fingerprint,
  fingerprints_match: fingerprintsMatch,
  message,
  next_action: nextAction,
  norm_rows_run1: run1.norm_rows_count,
  norm_rows_run2: run2.norm_rows_count,
  reason_code: reasonCode,
  run_id: RUN_ID,
  scope_manifest_sha_run1: run1.scope_manifest_sha,
  scope_manifest_sha_run2: run2.scope_manifest_sha,
  status,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'calm_p0_x2.json'), x2Gate);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('CALM P0 X2 RESULT');
console.log('='.repeat(60));
console.log(`  Run 1 fingerprint: ${run1.fingerprint}`);
console.log(`  Run 2 fingerprint: ${run2.fingerprint}`);
console.log(`  Match: ${fingerprintsMatch ? 'YES' : 'NO'}`);
console.log(`  Status: ${status}${reasonCode !== 'NONE' ? ' ' + reasonCode : ''}`);
console.log('='.repeat(60));

if (!fingerprintsMatch) {
  console.error(`\n[FAIL ND01] edge:calm:p0:x2 — Nondeterminism detected. Fingerprints differ.`);
  process.exit(1);
}

console.log(`\n[PASS] edge:calm:p0:x2 — CALM P0 is deterministic across x2 runs.`);
process.exit(0);
