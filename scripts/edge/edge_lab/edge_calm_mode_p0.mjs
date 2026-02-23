/**
 * edge_calm_mode_p0.mjs — CALM Mode P0 Orchestrator
 *
 * Pipeline: CANON_SELFTEST → DATA_COURT → HASHES → RECEIPTS → FINAL
 *
 * Implements R1 (fail-closed), R3 (trading off), R5 (dual hash),
 * R10 (canon selftest gate), R11 (deterministic CHECKSUMS).
 *
 * Writes: reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md
 *         reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Raw, sha256Norm, stableEvidenceNormalize, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const P0_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'P0');
const MANUAL_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');

fs.mkdirSync(P0_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });


function removeIfExists(relPath) {
  const abs = path.join(ROOT, relPath);
  if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
}

function prepareCleanRoomDerivedArtifacts() {
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
// R3: Trading must be OFF in P0 — check environment
// ---------------------------------------------------------------------------
const tradingFlags = [
  'TRADING_ENABLED',
  'LIVE_TRADING',
  'ORDER_SUBMISSION_ENABLED',
  'SUBMIT_ORDERS',
];

for (const flag of tradingFlags) {
  if (process.env[flag] && process.env[flag] !== '0' && process.env[flag] !== 'false') {
    console.error(`[FAIL T000] edge_calm_mode_p0: ${flag}=${process.env[flag]} — Trading MUST be OFF in P0. Any order submission attempt => FAIL T000.`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Pipeline step runner
// ---------------------------------------------------------------------------
const PIPELINE_STEPS = [
  {
    id: 'CANON_SELFTEST',
    script: 'scripts/edge/edge_lab/canon_selftest.mjs',
    description: 'Canon normalization selftest (R10)',
    blocker: true,
  },
  {
    id: 'DATA_COURT',
    script: 'scripts/edge/edge_lab/edge_data_court.mjs',
    description: 'Data source court (SINGLE_SOURCE_MODE)',
    blocker: false,  // NEEDS_DATA is non-blocking
  },
  {
    id: 'EVIDENCE_HASHES',
    script: 'scripts/edge/edge_lab/edge_evidence_hashes.mjs',
    description: 'Evidence checksums (R5 dual-hash + R11 SCOPE_MANIFEST_SHA)',
    blocker: true,
  },
  {
    id: 'RECEIPTS_CHAIN',
    script: 'scripts/edge/edge_lab/edge_receipts_chain.mjs',
    description: 'Receipt chain on sha256_norm (R5, R11)',
    blocker: true,
  },
];

function runStep(step) {
  const scriptPath = path.join(ROOT, step.script);
  if (!fs.existsSync(scriptPath)) {
    return {
      id: step.id,
      status: 'MISSING_SCRIPT',
      exit_code: -1,
      message: `Script not found: ${step.script}`,
    };
  }

  try {
    const output = execSync(`node "${scriptPath}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    console.log(output.trim());
    return { id: step.id, status: 'PASS', exit_code: 0, message: output.trim().split('\n').pop() };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString().trim() : '';
    const stderr = err.stderr ? err.stderr.toString().trim() : '';
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    const lastLine = (stdout + '\n' + stderr).trim().split('\n').pop();
    const exitCode = err.status || 1;
    // Check if NEEDS_DATA (exit 0 but empty) or actual FAIL
    return {
      id: step.id,
      status: exitCode === 0 ? 'NEEDS_DATA' : 'FAIL',
      exit_code: exitCode,
      message: lastLine,
    };
  }
}

// ---------------------------------------------------------------------------
// Run pipeline
// ---------------------------------------------------------------------------
console.log('');
console.log('='.repeat(60));
console.log('CALM MODE P0 — Hardening Pipeline');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

prepareCleanRoomDerivedArtifacts();

const stepResults = [];
let pipelineStatus = 'PASS';
let blockedAt = null;
let failReason = null;

for (const step of PIPELINE_STEPS) {
  console.log(`\n[P0] Running: ${step.id} — ${step.description}`);
  const result = runStep(step);
  stepResults.push(result);

  if (result.status !== 'PASS' && result.status !== 'NEEDS_DATA') {
    if (step.blocker) {
      pipelineStatus = 'BLOCKED';
      blockedAt = step.id;
      failReason = result.message;
      console.error(`\n[P0 BLOCKED] ${step.id}: ${result.message}`);
      break;
    } else {
      // Non-blocker step failure — continue
      console.log(`[P0 NON_BLOCKING] ${step.id}: ${result.status} — ${result.message}`);
    }
  } else if (result.status === 'NEEDS_DATA') {
    if (pipelineStatus === 'PASS') pipelineStatus = 'NEEDS_DATA';
    console.log(`[P0 NEEDS_DATA] ${step.id} — awaiting data`);
  } else {
    console.log(`[P0 OK] ${step.id}: PASS`);
  }
}

// ---------------------------------------------------------------------------
// Read P0 evidence files for final summary
// ---------------------------------------------------------------------------
function readStatusFromMd(filePath) {
  if (!fs.existsSync(filePath)) return 'MISSING';
  const content = fs.readFileSync(filePath, 'utf8');
  const m = content.match(/^STATUS:\s*([A-Z_]+)/m);
  return m ? m[1] : 'UNKNOWN';
}

const canonSelftestStatus = readStatusFromMd(path.join(P0_DIR, 'CANON_SELFTEST.md'));
const dataCourtStatus = readStatusFromMd(path.join(P0_DIR, 'DATA_COURT.md'));
const checksumsStatus = readStatusFromMd(path.join(P0_DIR, 'CHECKSUMS.md'));
const receiptsStatus = readStatusFromMd(path.join(P0_DIR, 'RECEIPTS_CHAIN.md'));

// Final closeout status
if (pipelineStatus === 'PASS') {
  const allStepsPass = stepResults.every((r) => r.status === 'PASS' || r.status === 'NEEDS_DATA');
  if (!allStepsPass) {
    pipelineStatus = 'BLOCKED';
    blockedAt = stepResults.find((r) => r.status !== 'PASS' && r.status !== 'NEEDS_DATA')?.id;
  }
}

// Gate matrix
const gateMatrix = [
  { gate: 'CANON_SELFTEST', status: canonSelftestStatus, blocker: true },
  { gate: 'DATA_COURT', status: dataCourtStatus, blocker: false },
  { gate: 'CHECKSUMS', status: checksumsStatus, blocker: true },
  { gate: 'RECEIPTS_CHAIN', status: receiptsStatus, blocker: true },
];

// ---------------------------------------------------------------------------
// Read evidence hashes for final report
// ---------------------------------------------------------------------------
let scopeManifestSha = 'PENDING';
let normRulesSha = 'PENDING';
const checksumsPath = path.join(P0_DIR, 'CHECKSUMS.md');
if (fs.existsSync(checksumsPath)) {
  const c = fs.readFileSync(checksumsPath, 'utf8');
  const sms = c.match(/scope_manifest_sha\s*\|\s*`([0-9a-f]{64})`/);
  const nrs = c.match(/norm_rules_sha\s*\|\s*`([0-9a-f]{64})`/);
  if (sms) scopeManifestSha = sms[1];
  if (nrs) normRulesSha = nrs[1];
}

// Compute closeout hash
const closeoutContent = stepResults.map((r) => `${r.id}:${r.status}`).join('|');
const closeoutNormHash = sha256Norm(closeoutContent);
const closeoutRawHash = sha256Raw(closeoutContent);

// ---------------------------------------------------------------------------
// Write CALM_MODE_P0_CLOSEOUT.md
// ---------------------------------------------------------------------------
const gateMatrixTable = gateMatrix.map((g) =>
  `| ${g.gate} | ${g.status} | ${g.blocker ? 'YES' : 'NO'} |`
).join('\n');

const pipelineTable = stepResults.map((r) =>
  `| ${r.id} | ${r.status} | ${r.exit_code} |`
).join('\n');

const finalMessage = pipelineStatus === 'PASS'
  ? 'CALM MODE P0 PASS — all hardening gates satisfied. Canon selftest GREEN. Evidence hashed with dual-hash doctrine. Receipt chain anchored.'
  : pipelineStatus === 'NEEDS_DATA'
    ? 'CALM MODE P0 NEEDS_DATA — blocking gates pass but data confirmation pending (DATA_COURT).'
    : `CALM MODE P0 BLOCKED — pipeline stopped at ${blockedAt}: ${failReason}`;

const nextAction = pipelineStatus === 'PASS'
  ? 'Run npm run edge:calm:p0:x2 to verify x2 determinism. Then proceed to INFRA_P0 closeout.'
  : pipelineStatus === 'NEEDS_DATA'
    ? 'Provide artifacts/incoming/paper_evidence.json to resolve DC90. Then rerun edge:calm:p0.'
    : `Fix ${blockedAt} before proceeding. See ${blockedAt} evidence for details.`;

const closeoutMd = `# CALM_MODE_P0_CLOSEOUT.md — Calm Mode P0 Hardening Closeout

STATUS: ${pipelineStatus}
REASON_CODE: ${pipelineStatus === 'PASS' ? 'NONE' : pipelineStatus === 'NEEDS_DATA' ? 'DC90' : 'PIPELINE_BLOCKED'}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## WHAT CHANGED

- canon.mjs: upgraded RUN_ID resolver (R6/R7), added sha256_raw/sha256_norm (R5),
  D005 semantic guard (R9), volatile marker-only normalization
- write_json_deterministic.mjs: R13 compliant helper (recursive key sort, schema_version, no timestamps)
- canon_selftest.mjs: R10 selftest gate with 7 vectors (6 from CANON_TEST_VECTORS + D005 catch)
- edge_evidence_hashes.mjs: R5 dual-hash + R11 SCOPE_MANIFEST_SHA + ASCII sort
- edge_receipts_chain.mjs: R5 chain on sha256_norm, fixed ordering
- edge_data_court.mjs: SINGLE_SOURCE_MODE default, DC90 outlier detection
- edge_calm_mode_p0.mjs: orchestrator pipeline
- SSOT files: NODE_TRUTH.md, VERIFY_MODE.md, BUNDLE_CONTRACT.md, EVIDENCE_CANON_RULES.md,
  UPDATE_SCOPE_POLICY.md, DATA_CONFIRM_POLICY.md, DELTA_CALC_SPEC.md,
  GOLDENS_APPLY_PROTOCOL.md, FORMAT_POLICY.md

## Gate Matrix

| Gate | Status | Blocker |
|------|--------|---------|
${gateMatrixTable}

## Pipeline Steps

| Step | Status | Exit Code |
|------|--------|-----------|
${pipelineTable}

## Hashes

| Field | Value |
|-------|-------|
| scope_manifest_sha | \`${scopeManifestSha}\` |
| norm_rules_sha | \`${normRulesSha}\` |
| closeout_sha256_raw | \`${closeoutRawHash}\` |
| closeout_sha256_norm | \`${closeoutNormHash}\` |

## Evidence Paths

- reports/evidence/EDGE_LAB/P0/CANON_SELFTEST.md
- reports/evidence/EDGE_LAB/P0/CHECKSUMS.md
- reports/evidence/EDGE_LAB/P0/DATA_COURT.md
- reports/evidence/EDGE_LAB/P0/RECEIPTS_CHAIN.md
- reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md
- reports/evidence/EDGE_LAB/gates/manual/canon_selftest.json
- reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json

## Real Risks

1. DC90 (NEEDS_DATA): paper_evidence.json not provided — DATA_COURT remains NEEDS_DATA until artifacts present
2. Network dependency: deps_offline_install_contract may report DEP01 if npm cache is not seeded
3. RUN_ID stability: requires x2 run with identical TREASURE_RUN_ID or stable git HEAD

## Trading Status

TRADING: OFF (P0 zero-war policy — T000 guard active)
`;

fs.writeFileSync(path.join(P0_DIR, 'CALM_MODE_P0_CLOSEOUT.md'), closeoutMd);

// Write calm_p0_final.json
const finalGate = {
  schema_version: '1.0.0',
  gate_matrix: gateMatrix,
  message: finalMessage,
  next_action: nextAction,
  pipeline_steps: stepResults,
  reason_code: pipelineStatus === 'PASS' ? 'NONE' : pipelineStatus === 'NEEDS_DATA' ? 'DC90' : 'PIPELINE_BLOCKED',
  run_id: RUN_ID,
  status: pipelineStatus,
  trading_off: true,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'calm_p0_final.json'), finalGate);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('CALM MODE P0 GATE MATRIX');
console.log('='.repeat(60));
for (const g of gateMatrix) {
  const icon = g.status === 'PASS' ? 'PASS' : g.status === 'NEEDS_DATA' ? 'NEEDS_DATA' : 'FAIL/BLOCK';
  console.log(`  [${icon}] ${g.gate}`);
}
console.log('');
console.log(`FINAL: ${pipelineStatus}`);
console.log('='.repeat(60));

process.exit(pipelineStatus === 'PASS' || pipelineStatus === 'NEEDS_DATA' ? 0 : 1);
