/**
 * gov_integrity.mjs — Governance Integrity Orchestrator
 *
 * Strict fail-closed semantics:
 * - EDGE unlock requires strict PASS-only gates
 * - NEEDS_DATA is never treated as PASS for unlock
 * - Missing prerequisites emit ME01 (not RD01)
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

function runScript(scriptPath, label) {
  console.log(`\n[GOV] Running: ${label}`);
  const abs = path.join(ROOT, scriptPath);
  if (!fs.existsSync(abs)) {
    console.error(`[GOV MISSING] ${scriptPath} not found`);
    return { label, exit_code: -1, status: 'MISSING_SCRIPT' };
  }
  try {
    const output = execSync(`node "${abs}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
    if (output.trim()) console.log(output.trim());
    return { label, exit_code: 0, status: 'PASS' };
  } catch (err) {
    const stdout = err.stdout?.toString().trim() ?? '';
    const stderr = err.stderr?.toString().trim() ?? '';
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { label, exit_code: err.status || 1, status: 'FAIL' };
  }
}

function readGateJson(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return {
      status: 'BLOCKED',
      reason_code: 'ME01',
      message: `Missing required evidence: ${relPath}`,
      __missing: true,
      __path: relPath,
    };
  }
  try {
    const d = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return { status: d.status || 'UNKNOWN', reason_code: d.reason_code || 'NONE', ...d };
  } catch {
    return { status: 'FAIL', reason_code: 'ME01', message: `Unreadable evidence JSON: ${relPath}`, __path: relPath };
  }
}

console.log('\n' + '='.repeat(60));
console.log('P1 GOVERNANCE INTEGRITY ORCHESTRATOR');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

const op01Result = runScript('scripts/gov/op01_scripts_check.mjs', 'R_OP01_SCRIPTS_CHECK');
const merkleResult = runScript('scripts/gov/merkle_root.mjs', 'P1_MERKLE_ROOT');
const gov01Result = runScript('scripts/gov/gov01_evidence_integrity.mjs', 'P1_GOV01_ENFORCEMENT');
const rcAuditResult = runScript('scripts/gov/reason_code_audit.mjs', 'R_REASON_CODE_AUDIT');

const p0Closeout = readGateJson('reports/evidence/INFRA_P0/gates/manual/infra_p0_closeout.json');
const calmP0Final = readGateJson('reports/evidence/EDGE_LAB/gates/manual/calm_p0_final.json');
const calmP0x2 = readGateJson('reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json');
const gov01Gate = readGateJson('reports/evidence/GOV/gates/manual/gov01_evidence_integrity.json');
const merkleGate = readGateJson('reports/evidence/GOV/gates/manual/merkle_root.json');
const rcAuditGate = readGateJson('reports/evidence/GOV/gates/manual/reason_code_audit.json');
const op01Gate = readGateJson('reports/evidence/SAFETY/gates/manual/op01_scripts_check.json');

const missingEvidence = [p0Closeout, calmP0Final, calmP0x2, gov01Gate, merkleGate, rcAuditGate, op01Gate]
  .filter((x) => x.__missing)
  .map((x) => x.__path);

const p0SystemPass =
  p0Closeout.status === 'PASS' &&
  calmP0Final.status === 'PASS' &&
  calmP0x2.status === 'PASS' &&
  p0Closeout.eligible_for_micro_live === true &&
  p0Closeout.eligible_for_execution === true;

const p1SystemPass =
  merkleGate.status === 'PASS' &&
  gov01Gate.status === 'PASS' &&
  rcAuditGate.status === 'PASS' &&
  op01Gate.status === 'PASS';

const edgeUnlock = p0SystemPass && p1SystemPass;
const overallStatus = edgeUnlock ? 'PASS' : 'BLOCKED';

const blockReasons = [];
if (op01Result.exit_code !== 0 || op01Gate.status !== 'PASS') blockReasons.push(`OP01 status=${op01Gate.status}`);
if (merkleResult.exit_code !== 0 || merkleGate.status !== 'PASS') blockReasons.push(`MERKLE_ROOT status=${merkleGate.status}`);
if (gov01Result.exit_code !== 0 || gov01Gate.status !== 'PASS') blockReasons.push(`GOV01 status=${gov01Gate.status} (${gov01Gate.reason_code || 'NONE'})`);
if (rcAuditResult.exit_code !== 0 || rcAuditGate.status !== 'PASS') blockReasons.push(`REASON_CODE_AUDIT status=${rcAuditGate.status}`);
if (p0Closeout.status !== 'PASS') blockReasons.push(`INFRA_P0 status=${p0Closeout.status}`);
if (calmP0Final.status !== 'PASS') blockReasons.push(`CALM_P0 status=${calmP0Final.status}`);
if (calmP0x2.status !== 'PASS') blockReasons.push(`CALM_P0_X2 status=${calmP0x2.status}`);
if (!p0Closeout.eligible_for_micro_live) blockReasons.push(`eligible_for_micro_live=false (${p0Closeout.eligibility_reason || 'UNKNOWN'})`);
if (!p0Closeout.eligible_for_execution) blockReasons.push('eligible_for_execution=false');
if (missingEvidence.length > 0) blockReasons.unshift(`ME01 missing evidence: ${missingEvidence.join(', ')}`);

let reasonCode = 'NONE';
if (!edgeUnlock) {
  reasonCode = missingEvidence.length > 0 ? 'ME01' : (blockReasons.some((r) => r.includes('OP01')) ? 'OP01' : 'BLOCKED');
}

const nextAction = edgeUnlock
  ? 'EDGE_UNLOCK=true. Continue controlled operations with safeguards.'
  : (missingEvidence.includes('reports/evidence/EDGE_LAB/gates/manual/calm_p0_x2.json')
    ? 'npm run -s edge:calm:p0:x2'
    : 'npm run -s p0:all');

const unlockMd = `# EDGE_UNLOCK.md — EDGE/PROFIT Unlock Decision

STATUS: ${overallStatus}
REASON_CODE: ${reasonCode}
EDGE_UNLOCK: ${edgeUnlock}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Gate Matrix

| Gate | Status | Blocker |
|------|--------|---------|
| INFRA_P0 | ${p0Closeout.status} | YES |
| CALM_P0 | ${calmP0Final.status} | YES |
| CALM_P0_X2 | ${calmP0x2.status} | YES |
| OP01_SCRIPTS_CHECK | ${op01Gate.status} | YES |
| MERKLE_ROOT | ${merkleGate.status} | YES |
| GOV01_INTEGRITY | ${gov01Gate.status} | YES |
| REASON_CODE_AUDIT | ${rcAuditGate.status} | YES |

## System Pass

- P0_SYSTEM_PASS: ${p0SystemPass}
- P1_SYSTEM_PASS: ${p1SystemPass}

## Blocking Reasons

${blockReasons.length ? blockReasons.map((r) => `- ${r}`).join('\n') : '- NONE'}
`;

writeMd(path.join(GOV_DIR, 'EDGE_UNLOCK.md'), unlockMd);

const gatePayload = {
  schema_version: '1.0.0',
  status: overallStatus,
  reason_code: reasonCode,
  message: edgeUnlock ? 'EDGE unlock granted (strict PASS-only).' : `EDGE unlock blocked: ${blockReasons.join('; ')}`,
  run_id: RUN_ID,
  edge_unlock: edgeUnlock,
  p0_system_pass: p0SystemPass,
  p1_system_pass: p1SystemPass,
  block_reasons: blockReasons,
  missing_evidence: missingEvidence,
  next_action: nextAction,
  op01_status: op01Gate.status,
  merkle_root_status: merkleGate.status,
  gov01_status: gov01Gate.status,
  reason_code_audit_status: rcAuditGate.status,
  infra_p0_status: p0Closeout.status,
  calm_p0_status: calmP0Final.status,
  calm_p0_x2_status: calmP0x2.status,
  infra_p0_eligible_for_micro_live: p0Closeout.eligible_for_micro_live,
  infra_p0_eligible_for_execution: p0Closeout.eligible_for_execution,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'edge_unlock.json'), gatePayload);
writeJsonDeterministic(path.join(MANUAL_DIR, 'gov_integrity.json'), gatePayload);

console.log('\n' + '='.repeat(60));
console.log('P1 GOVERNANCE INTEGRITY RESULT');
console.log('='.repeat(60));
console.log(`  P0_SYSTEM_PASS: ${p0SystemPass}`);
console.log(`  P1_SYSTEM_PASS: ${p1SystemPass}`);
console.log(`  EDGE_UNLOCK: ${edgeUnlock}`);
console.log(`  FINAL: ${overallStatus}`);
console.log('='.repeat(60));

process.exit(edgeUnlock ? 0 : 1);
