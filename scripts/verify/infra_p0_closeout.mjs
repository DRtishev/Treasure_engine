/**
 * infra_p0_closeout.mjs — INFRA P0 closeout orchestrator
 *
 * Runs all INFRA P0 gates and generates:
 * - reports/evidence/INFRA_P0/INFRA_P0_CLOSEOUT.md
 * - reports/evidence/INFRA_P0/gates/manual/infra_p0_closeout.json
 *
 * R12/R13: emits explicit eligibility flags (eligible_for_micro_live,
 * eligible_for_execution) — false when DEP01/DEP02/DEP03 present.
 * Overall status may PASS while eligibility is false.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Raw, sha256Norm } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const INFRA_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const MANUAL_DIR = path.join(INFRA_DIR, 'gates', 'manual');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const renderOnly = process.argv.includes('--render-only') || process.env.INFRA_P0_RENDER_ONLY === '1';

const GATES = [
  {
    // NET01: Network isolation proof — pre-flight check
    id: 'NET_ISOLATION',
    script: 'scripts/verify/net_isolation_proof.mjs',
    evidence: 'reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/net_isolation.json',
    blocker: true,
  },
  {
    id: 'NODE_TRUTH',
    script: 'scripts/verify/node_truth_gate.mjs',
    evidence: 'reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/node_truth_gate.json',
    blocker: true,
  },
  {
    id: 'VERIFY_MODE',
    script: 'scripts/verify/verify_mode_gate.mjs',
    evidence: 'reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/verify_mode_gate.json',
    blocker: true,
  },
  {
    id: 'DEPS_OFFLINE',
    script: 'scripts/verify/deps_offline_install_contract.mjs',
    // R12: renamed per EVIDENCE_NAMING_SSOT v1.5.3
    evidence: 'reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json',
    // R13: not a pipeline blocker by itself; eligibility flags carry the signal
    blocker: false,
  },
  {
    id: 'GOLDENS_APPLY',
    script: 'scripts/verify/goldens_apply_gate.mjs',
    evidence: 'reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/goldens_apply_gate.json',
    blocker: true,
  },
  {
    id: 'FORMAT_POLICY',
    script: 'scripts/verify/format_policy_gate.mjs',
    evidence: 'reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/format_policy_gate.json',
    blocker: true,
  },
  {
    // FG01: Fixture guard — REAL_ONLY default, ALLOW_FIXTURES=1 opt-in
    id: 'FIXTURE_GUARD',
    script: 'scripts/verify/fixture_guard_gate.mjs',
    evidence: 'reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/fixture_guard_gate.json',
    blocker: true,
  },
  {
    // ZW01: Zero-war kill switch must-fail proof
    id: 'ZERO_WAR_PROBE',
    script: 'scripts/verify/zero_war_probe.mjs',
    evidence: 'reports/evidence/SAFETY/ZERO_WAR_PROBE.md',
    json: 'reports/evidence/SAFETY/gates/manual/zero_war_probe.json',
    blocker: true,
  },
];

// DEP codes that propagate as ineligibility (R12/R13)
const DEP_BLOCKING_CODES = ['DEP01', 'DEP02', 'DEP03'];

function readGateStatus(jsonPath) {
  const abs = path.join(ROOT, jsonPath);
  if (!fs.existsSync(abs)) return { status: 'BLOCKED', reason_code: 'ME01', message: `Missing required gate JSON: ${jsonPath}` };
  try {
    const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return { status: data.status || 'UNKNOWN', reason_code: data.reason_code || '-', message: data.message || '' };
  } catch (_) {
    return { status: 'PARSE_ERROR', reason_code: 'FP01' };
  }
}

function runGate(gate) {
  const scriptPath = path.join(ROOT, gate.script);
  try {
    const output = execSync(`node "${scriptPath}"`, {
      cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000,
    });
    console.log(output.trim());
    return { id: gate.id, exit_code: 0, run_status: 'EXECUTED' };
  } catch (err) {
    const stdout = err.stdout?.toString().trim() ?? '';
    const stderr = err.stderr?.toString().trim() ?? '';
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { id: gate.id, exit_code: err.status || 1, run_status: 'EXECUTED' };
  }
}

console.log('');
console.log('='.repeat(60));
console.log('INFRA P0 — Gate Suite');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

// Run all gates unless renderer-only mode
const runResults = [];
if (!renderOnly) {
  for (const gate of GATES) {
    console.log(`\n[INFRA_P0] Running: ${gate.id}`);
    const runResult = runGate(gate);
    runResults.push(runResult);
  }
}

// Read gate statuses from written JSON
const gateStatuses = GATES.map((gate) => {
  const gateStatus = readGateStatus(gate.json);
  return {
    gate: gate.id,
    blocker: gate.blocker,
    evidence: gate.evidence,
    json: gate.json,
    ...gateStatus,
  };
});

// Determine overall pipeline status (blocker gates only)
let overallStatus = 'PASS';
for (const g of gateStatuses) {
  if (g.reason_code === 'ME01' || g.status === 'MISSING' || g.status === 'PARSE_ERROR') {
    overallStatus = 'BLOCKED';
    break;
  }
  if (g.blocker && g.status !== 'PASS') {
    overallStatus = g.status === 'FAIL' ? 'FAIL' : 'BLOCKED';
    break;
  }
}

// R12/R13: Compute eligibility from DEP gate outcomes
// B2 seal: eligibility MUST be false whenever overallStatus != PASS
const depGate = gateStatuses.find((g) => g.gate === 'DEPS_OFFLINE');
const depReasonCode = depGate?.reason_code || 'NONE';
const hasDepBlock = !depGate || depGate.status !== 'PASS' || DEP_BLOCKING_CODES.includes(depReasonCode);

// FG01: Fixture guard blocks eligibility (MISSING or BLOCKED both block)
const fgGate = gateStatuses.find((g) => g.gate === 'FIXTURE_GUARD');
const hasFg01Block = !fgGate || fgGate.status !== 'PASS';

// ZW01: Zero-war probe failure blocks eligibility
const zw01Gate = gateStatuses.find((g) => g.gate === 'ZERO_WAR_PROBE');
const hasZw01Fail = zw01Gate?.status === 'FAIL' || zw01Gate?.reason_code === 'ZW01';

// NET01: Network isolation failure blocks eligibility
const net01Gate = gateStatuses.find((g) => g.gate === 'NET_ISOLATION');
const hasNet01Block = net01Gate?.reason_code === 'NET01' || net01Gate?.status === 'BLOCKED';

// B2 seal: eligibility MUST be false whenever overallStatus != PASS
// Also blocked by specific codes: DEP/FG01/ZW01/NET01
const eligible_for_micro_live = overallStatus === 'PASS' && !hasDepBlock && !hasFg01Block && !hasZw01Fail && !hasNet01Block;
const eligible_for_execution = overallStatus === 'PASS' && !hasDepBlock && !hasFg01Block && !hasZw01Fail && !hasNet01Block;
const eligibility_reason = overallStatus !== 'PASS'
  ? `overallStatus=${overallStatus} (eligibility requires overallStatus === PASS)`
  : hasDepBlock
    ? `${depReasonCode}: ${depGate?.message || 'DEP gate failure detected'}`
    : hasFg01Block
      ? `FG01: Fixture guard violation — evidence sources not verified as real`
      : hasZw01Fail
        ? `ZW01: Zero-war kill switch probe failed — trading path not blocked`
        : hasNet01Block
          ? `NET01: Network isolation not proven — network required for PASS`
          : 'No blocking codes detected (DEP/FG01/ZW01/NET01 all clear)';

// Compute evidence hashes
const evidenceHashes = gateStatuses.map((g) => {
  const abs = path.join(ROOT, g.evidence);
  if (!fs.existsSync(abs)) return { path: g.evidence, sha256_raw: 'MISSING', sha256_norm: 'MISSING' };
  const content = fs.readFileSync(abs, 'utf8');
  return { path: g.evidence, sha256_raw: sha256Raw(content), sha256_norm: sha256Norm(content) };
});

const gateMatrixTable = gateStatuses.map((g) =>
  `| ${g.gate} | ${g.status} | ${g.reason_code || '-'} | ${g.blocker ? 'YES' : 'NO (warn)'} |`
).join('\n');

const hashesTable = evidenceHashes.map((h) =>
  `| \`${h.path}\` | \`${h.sha256_raw.slice(0, 16)}…\` | \`${h.sha256_norm.slice(0, 16)}…\` |`
).join('\n');

const overallReason = overallStatus === 'PASS' ? 'NONE'
  : gateStatuses.find((g) => g.blocker && g.status !== 'PASS')?.reason_code || 'UNKNOWN';

const message = overallStatus === 'PASS'
  ? `INFRA P0 PASS — NET_ISOLATION (NET01), NODE_TRUTH, VERIFY_MODE, GOLDENS_APPLY, FORMAT_POLICY, FIXTURE_GUARD (FG01), ZERO_WAR_PROBE (ZW00/ZW01) all PASS. DEPS_OFFLINE reported honestly (${depReasonCode}). ELIGIBLE_FOR_MICRO_LIVE=${eligible_for_micro_live}.`
  : `INFRA P0 ${overallStatus} — ${overallReason}: ${gateStatuses.find((g) => g.blocker && g.status !== 'PASS')?.message || ''}`;

const nextAction = overallStatus === 'PASS'
  ? (eligible_for_micro_live ? 'npm run -s edge:micro:live:readiness' : 'ENABLE_SQLITE_PERSISTENCE=0 npm ci --omit=optional')
  : (gateStatuses.find((g) => g.reason_code === 'NT02') ? 'nvm use 22.22.0' : 'npm run -s infra:p0');

// Write closeout markdown
const closeoutMd = `# INFRA_P0_CLOSEOUT.md — Infrastructure P0 Hardening Closeout

STATUS: ${overallStatus}
REASON_CODE: ${overallReason}
RUN_ID: ${RUN_ID}
ELIGIBLE_FOR_MICRO_LIVE: ${eligible_for_micro_live}
ELIGIBLE_FOR_EXECUTION: ${eligible_for_execution}
ELIGIBILITY_REASON: ${eligibility_reason}
NEXT_ACTION: ${nextAction}

## Gate Matrix

| Gate | Status | Reason Code | Blocker |
|------|--------|-------------|---------|
${gateMatrixTable}

## Eligibility Flags (R12/R13)

| Flag | Value | Reason |
|------|-------|--------|
| eligible_for_micro_live | ${eligible_for_micro_live} | ${eligibility_reason} |
| eligible_for_execution | ${eligible_for_execution} | ${eligibility_reason} |

**Note:** Infra closeout may PASS overall while eligibility is false.
Readiness gate MUST honour these flags and emit BLOCKED with the same DEP reason code.
See: EDGE_LAB/DEP_POLICY.md (R12 fail-closed propagation rule).

## Evidence Hashes

| Evidence Path | sha256_raw (prefix) | sha256_norm (prefix) |
|--------------|--------------------|--------------------|
${hashesTable}

## What Changed (v1.5.3 patchset)

- DEPS_OFFLINE evidence renamed: DEPS_OFFLINE_INSTALL_CONTRACT.md (EVIDENCE_NAMING_SSOT)
- infra_p0_closeout.json: now emits eligible_for_micro_live + eligible_for_execution (R13)
- DEP02 propagation: INFRA FAIL DEP02 → EDGE BLOCKED DEP02 (R12, sealed via dep02_failclosed_readiness_gate)
- EDGE_LAB/DEP_POLICY.md: new SSOT documenting DEP propagation governance

## Real Risks

${(
  depReasonCode === 'DEP02' || process.env.ENABLE_SQLITE_PERSISTENCE === '1'
    ? `1. **DEP02 (conditional)**: native SQLite path can require node-gyp builds for \`better-sqlite3\`.
   Triggered when DEP02 is reported or SQLite persistence is enabled.
   Mitigation: use prebuilt binaries or provision capsule with pre-built .node file.`
    : `1. **DEP02 (not triggered in this mode)**: optional-native mitigation active; DEP02 not triggered in this mode.
   Condition: DEPS_OFFLINE PASS with omit_optional_proved=true and sqlite persistence disabled.`
)}
2. **Legacy FP01 warnings**: pre-existing EDGE_LAB gate JSON files may lack schema_version.
   Mitigation: migrate in follow-up PR.
3. **DEP01 (conditional)**: if npm cache is absent, fresh install would require network (capsule needed).
   Mitigation: pre-seed npm cache in the execution capsule.

## Next Action

${nextAction}
`;

fs.writeFileSync(path.join(INFRA_DIR, 'INFRA_P0_CLOSEOUT.md'), closeoutMd);

// Write infra_p0_closeout.json (renamed from infra_p0_final.json per EVIDENCE_NAMING_SSOT)
const closeoutGate = {
  schema_version: '1.0.0',
  eligible_for_execution,
  eligible_for_micro_live,
  eligibility_reason,
  gate_matrix: gateStatuses.map((g) => ({
    gate: g.gate,
    status: g.status,
    reason_code: g.reason_code || 'NONE',
    blocker: g.blocker,
  })),
  message,
  next_action: nextAction,
  overall_reason: overallReason,
  run_id: RUN_ID,
  status: overallStatus,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'infra_p0_closeout.json'), closeoutGate);

console.log('\n' + '='.repeat(60));
console.log('INFRA P0 GATE MATRIX');
console.log('='.repeat(60));
for (const g of gateStatuses) {
  const icon = g.status === 'PASS' ? 'PASS' : g.status;
  console.log(`  [${icon}] ${g.gate} (blocker=${g.blocker})`);
}
console.log(`\nFINAL: ${overallStatus}`);
console.log(`ELIGIBLE_FOR_MICRO_LIVE: ${eligible_for_micro_live}`);
console.log(`ELIGIBLE_FOR_EXECUTION: ${eligible_for_execution}`);
if (!eligible_for_micro_live) {
  console.log(`ELIGIBILITY_REASON: ${eligibility_reason}`);
}
console.log('='.repeat(60));

process.exit(renderOnly ? 0 : (overallStatus === 'PASS' ? 0 : 1));
