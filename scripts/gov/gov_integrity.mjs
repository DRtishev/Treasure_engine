/**
 * gov_integrity.mjs — P1 Governance Integrity Orchestrator
 *
 * Implements SHAMAN_OS_FIRMWARE v2.0.1 P1 RELIABILITY PACK:
 *   1. P1_MERKLE_ROOT: Compute and anchor Merkle root
 *   2. P1_GOV01_ENFORCEMENT: Verify anchored values match computed ones
 *   3. EDGE_UNLOCK: Evaluate P0+P1 SYSTEM PASS → emit unlock decision
 *
 * Execution order (C5 in EXECUTION_ORDER):
 *   Step 1: npm run gov:merkle (anchor Merkle root)
 *   Step 2: run GOV01 integrity check (compare anchored vs computed)
 *   Step 3: read P0 closeout + GOV01 results → evaluate EDGE_UNLOCK
 *
 * Writes:
 *   reports/evidence/GOV/EDGE_UNLOCK.md
 *   reports/evidence/GOV/gates/manual/edge_unlock.json
 *
 * Exit codes:
 *   0 — P0+P1 SYSTEM PASS, EDGE_UNLOCK=true
 *   1 — Blocked or failed; EDGE_UNLOCK=false
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const MANUAL_DIR = path.join(GOV_DIR, 'gates', 'manual');

fs.mkdirSync(GOV_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helper: run a script and capture result
// ---------------------------------------------------------------------------
function runScript(scriptPath, label) {
  console.log(`\n[GOV] Running: ${label}`);
  const abs = path.join(ROOT, scriptPath);
  if (!fs.existsSync(abs)) {
    console.error(`[GOV MISSING] ${scriptPath} not found`);
    return { label, exit_code: -1, status: 'MISSING_SCRIPT' };
  }
  try {
    const output = execSync(`node "${abs}"`, {
      cwd: ROOT, encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
    console.log(output.trim());
    return { label, exit_code: 0, status: 'PASS' };
  } catch (err) {
    const stdout = err.stdout?.toString().trim() ?? '';
    const stderr = err.stderr?.toString().trim() ?? '';
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { label, exit_code: err.status || 1, status: 'FAIL' };
  }
}

// ---------------------------------------------------------------------------
// Helper: read gate JSON status
// ---------------------------------------------------------------------------
function readGateJson(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return { status: 'MISSING', reason_code: 'RD01', message: `File not found: ${relPath}` };
  try {
    const d = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return { status: d.status || 'UNKNOWN', reason_code: d.reason_code || '-', message: d.message || '', ...d };
  } catch (_) {
    return { status: 'PARSE_ERROR', reason_code: 'FP01', message: `Parse error: ${relPath}` };
  }
}

// ---------------------------------------------------------------------------
// Main: governance pipeline
// ---------------------------------------------------------------------------
console.log('');
console.log('='.repeat(60));
console.log('P1 GOVERNANCE INTEGRITY ORCHESTRATOR');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

// Step 1: Anchor Merkle root
const merkleResult = runScript('scripts/gov/merkle_root.mjs', 'P1_MERKLE_ROOT');

// Step 2: GOV01 integrity check
const gov01Result = runScript('scripts/gov/gov01_evidence_integrity.mjs', 'P1_GOV01_ENFORCEMENT');

// Step 3: Read P0 closeout
const p0Closeout = readGateJson('reports/evidence/INFRA_P0/gates/manual/infra_p0_closeout.json');
const p0Status = p0Closeout.status;
const p0EligibleForMicroLive = p0Closeout.eligible_for_micro_live;
const p0EligibleForExecution = p0Closeout.eligible_for_execution;

// Step 4: Read P0 CALM gate
const calmP0Gate = readGateJson('reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json');
const calmP0Status = calmP0Gate.status;

// Step 5: Read P1 GOV01 result
const gov01Gate = readGateJson('reports/evidence/GOV/gates/manual/gov01_evidence_integrity.json');
const gov01Status = gov01Gate.status;

// Step 6: Read Merkle root result
const merkleGate = readGateJson('reports/evidence/GOV/gates/manual/merkle_root.json');
const merkleStatus = merkleGate.status;

// ---------------------------------------------------------------------------
// P0 SYSTEM PASS evaluation
// ---------------------------------------------------------------------------
// P0 requires: infra:p0 PASS + calm:p0 PASS/NEEDS_DATA + eligibility flags
const p0SystemPass =
  (p0Status === 'PASS' || p0Status === 'NEEDS_DATA') &&
  (calmP0Status === 'PASS' || calmP0Status === 'NEEDS_DATA') &&
  p0EligibleForMicroLive === true &&
  p0EligibleForExecution === true;

// ---------------------------------------------------------------------------
// P1 SYSTEM PASS evaluation
// ---------------------------------------------------------------------------
// P1 requires: Merkle root present + GOV01 PASS
const p1SystemPass =
  (merkleStatus === 'PASS' || merkleStatus === 'PARTIAL') &&
  gov01Status === 'PASS';

// ---------------------------------------------------------------------------
// EDGE UNLOCK
// ---------------------------------------------------------------------------
const edgeUnlock = p0SystemPass && p1SystemPass;

// Build status string
const overallStatus = edgeUnlock ? 'PASS' : 'BLOCKED';

// Identify blocking reasons
const blockReasons = [];
if (!p0SystemPass) {
  if (p0Status !== 'PASS' && p0Status !== 'NEEDS_DATA') blockReasons.push(`INFRA_P0 status=${p0Status}`);
  if (calmP0Status !== 'PASS' && calmP0Status !== 'NEEDS_DATA') blockReasons.push(`CALM_P0 status=${calmP0Status}`);
  if (!p0EligibleForMicroLive) blockReasons.push(`eligible_for_micro_live=false (${p0Closeout.eligibility_reason || 'DEP/FG01/ZW01'})`);
  if (!p0EligibleForExecution) blockReasons.push(`eligible_for_execution=false`);
}
if (!p1SystemPass) {
  if (merkleStatus !== 'PASS' && merkleStatus !== 'PARTIAL') blockReasons.push(`MERKLE_ROOT status=${merkleStatus}`);
  if (gov01Status !== 'PASS') blockReasons.push(`GOV01 status=${gov01Status} (${gov01Gate.reason_code || ''})`);
}

const message = edgeUnlock
  ? `EDGE UNLOCK GRANTED — P0 SYSTEM PASS and P1 SYSTEM PASS. All eligibility flags true. Evidence integrity verified.`
  : `EDGE UNLOCK BLOCKED — ${blockReasons.join('; ')}. Fix all blockers before proceeding.`;

const nextAction = edgeUnlock
  ? 'EDGE_UNLOCK=true. System ready for controlled micro-live operations (subject to ZW00 enforcement).'
  : `Fix blockers: ${blockReasons.join(', ')} — then rerun gov:integrity.`;

// ---------------------------------------------------------------------------
// Write EDGE_UNLOCK.md
// ---------------------------------------------------------------------------
const gateMatrix = [
  { gate: 'INFRA_P0', status: p0Status, eligible_for_micro_live: p0EligibleForMicroLive, blocker: true },
  { gate: 'CALM_P0', status: calmP0Status, eligible_for_micro_live: '-', blocker: true },
  { gate: 'MERKLE_ROOT', status: merkleStatus, eligible_for_micro_live: '-', blocker: true },
  { gate: 'GOV01_INTEGRITY', status: gov01Status, eligible_for_micro_live: '-', blocker: true },
];

const matrixTable = gateMatrix.map((g) =>
  `| ${g.gate} | ${g.status} | ${g.eligible_for_micro_live} | ${g.blocker ? 'YES' : 'NO'} |`
).join('\n');

const unlockMd = `# EDGE_UNLOCK.md — EDGE/PROFIT Unlock Decision

STATUS: ${overallStatus}
EDGE_UNLOCK: ${edgeUnlock}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Unlock Policy

EDGE/PROFIT unlock requires BOTH:
- P0 SYSTEM PASS: INFRA_P0 PASS + CALM_P0 PASS + eligibility flags true (no DEP/FG01/ZW01 blocks)
- P1 SYSTEM PASS: Merkle root anchored + GOV01 integrity PASS (no manual edits)

## Gate Matrix

| Gate | Status | eligible_for_micro_live | Blocker |
|------|--------|------------------------|---------|
${matrixTable}

## P0 System Pass

P0_SYSTEM_PASS: ${p0SystemPass}
- INFRA_P0 status: ${p0Status}
- CALM_P0 status: ${calmP0Status}
- eligible_for_micro_live: ${p0EligibleForMicroLive}
- eligible_for_execution: ${p0EligibleForExecution}

## P1 System Pass

P1_SYSTEM_PASS: ${p1SystemPass}
- MERKLE_ROOT status: ${merkleStatus}
- GOV01_INTEGRITY status: ${gov01Status}

## Blocking Reasons

${blockReasons.length > 0 ? blockReasons.map((r) => `- ${r}`).join('\n') : 'NONE — all gates pass'}

## Non-Goals

- This unlock does NOT enable live trading.
- ZW00 kill switch remains active in all modes.
- ELIGIBLE_FOR_MICRO_LIVE=true only when DEP/FG01/ZW01 all clear.

## Evidence Paths

- reports/evidence/GOV/EDGE_UNLOCK.md
- reports/evidence/GOV/gates/manual/edge_unlock.json
- reports/evidence/GOV/MERKLE_ROOT.md
- reports/evidence/GOV/GOV01_EVIDENCE_INTEGRITY.md
- reports/evidence/INFRA_P0/INFRA_P0_CLOSEOUT.md
- reports/evidence/EDGE_LAB/P0/CALM_MODE_P0_CLOSEOUT.md
`;

writeMd(path.join(GOV_DIR, 'EDGE_UNLOCK.md'), unlockMd);

// ---------------------------------------------------------------------------
// Write edge_unlock.json
// ---------------------------------------------------------------------------
const unlockJson = {
  schema_version: '1.0.0',
  block_reasons: blockReasons,
  edge_unlock: edgeUnlock,
  gov01_status: gov01Status,
  infra_p0_eligible_for_execution: p0EligibleForExecution,
  infra_p0_eligible_for_micro_live: p0EligibleForMicroLive,
  infra_p0_status: p0Status,
  merkle_root_status: merkleStatus,
  message,
  next_action: nextAction,
  p0_system_pass: p0SystemPass,
  p1_system_pass: p1SystemPass,
  reason_code: edgeUnlock ? 'NONE' : 'BLOCKED',
  run_id: RUN_ID,
  status: overallStatus,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'edge_unlock.json'), unlockJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('P1 GOVERNANCE INTEGRITY RESULT');
console.log('='.repeat(60));
console.log(`  P0_SYSTEM_PASS: ${p0SystemPass}`);
console.log(`  P1_SYSTEM_PASS: ${p1SystemPass}`);
console.log(`  EDGE_UNLOCK: ${edgeUnlock}`);
if (blockReasons.length > 0) {
  console.log(`  BLOCKERS:`);
  for (const r of blockReasons) console.log(`    - ${r}`);
}
console.log(`\n  FINAL: ${overallStatus}`);
console.log('='.repeat(60));

if (!edgeUnlock) {
  console.error(`\n[BLOCKED] gov:integrity — Edge unlock denied. Resolve blockers.`);
  process.exit(1);
}

console.log(`\n[PASS] gov:integrity — EDGE_UNLOCK=true. P0+P1 SYSTEM PASS.`);
process.exit(0);
