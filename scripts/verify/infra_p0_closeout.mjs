/**
 * infra_p0_closeout.mjs — INFRA P0 closeout orchestrator
 *
 * Runs all INFRA P0 gates and generates:
 * - reports/evidence/INFRA_P0/INFRA_P0_CLOSEOUT.md
 * - reports/evidence/INFRA_P0/gates/manual/infra_p0_final.json
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

const GATES = [
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
    evidence: 'reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL.md',
    json: 'reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json',
    blocker: false,  // DEP01/DEP02 are honest outcomes, not pipeline stoppers
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
];

function readGateStatus(jsonPath) {
  const abs = path.join(ROOT, jsonPath);
  if (!fs.existsSync(abs)) return { status: 'MISSING', reason_code: 'FILE_NOT_FOUND' };
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

// Run all gates
const runResults = [];
for (const gate of GATES) {
  console.log(`\n[INFRA_P0] Running: ${gate.id}`);
  const runResult = runGate(gate);
  runResults.push(runResult);
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

// Determine overall status
let overallStatus = 'PASS';
for (const g of gateStatuses) {
  if (g.blocker && g.status !== 'PASS') {
    overallStatus = g.status === 'FAIL' ? 'FAIL' : 'BLOCKED';
    break;
  }
}

// Non-blocker gates get reported as-is
const nonBlockerStatuses = gateStatuses.filter((g) => !g.blocker);
const blockerStatuses = gateStatuses.filter((g) => g.blocker);

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
  ? 'INFRA P0 PASS — NODE_TRUTH, VERIFY_MODE, GOLDENS_APPLY, FORMAT_POLICY all PASS. DEPS_OFFLINE reported honestly (may be DEP01/DEP02 if native build).'
  : `INFRA P0 ${overallStatus} — ${overallReason}: ${gateStatuses.find((g) => g.blocker && g.status !== 'PASS')?.message || ''}`;

const nextAction = overallStatus === 'PASS'
  ? 'Run edge:calm:p0 to complete full P0 closeout.'
  : `Fix ${gateStatuses.find((g) => g.blocker && g.status !== 'PASS')?.gate} before proceeding.`;

// Write closeout
const closeoutMd = `# INFRA_P0_CLOSEOUT.md — Infrastructure P0 Hardening Closeout

STATUS: ${overallStatus}
REASON_CODE: ${overallReason}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Gate Matrix

| Gate | Status | Reason Code | Blocker |
|------|--------|-------------|---------|
${gateMatrixTable}

## Evidence Hashes

| Evidence Path | sha256_raw (prefix) | sha256_norm (prefix) |
|--------------|--------------------|--------------------|
${hashesTable}

## What Changed

- NODE_TRUTH.md: authoritative SSOT for Node.js version governance (allowed_family=22)
- VERIFY_MODE.md: VERIFY_MODE=GIT documented, VM04 format validation
- BUNDLE_CONTRACT.md: bundle fingerprint contract for offline deployments
- GOLDENS_APPLY_PROTOCOL.md: golden update governance (G001/G002)
- FORMAT_POLICY.md: evidence format + machine JSON rules (R13/R14)
- EVIDENCE_CANON_RULES.md: normalization rules with volatile markers (R9)
- UPDATE_SCOPE_POLICY.md: scope change governance (R11)
- DATA_CONFIRM_POLICY.md: data confirmation policy (DC90)
- DELTA_CALC_SPEC.md: delta calculation specification
- scripts/lib/write_json_deterministic.mjs: R13 compliant JSON writer
- scripts/verify/node_truth_gate.mjs: NT01/NT02 gate
- scripts/verify/verify_mode_gate.mjs: VM01-VM04 gate
- scripts/verify/deps_offline_install_contract.mjs: DEP01/02/03 gate
- scripts/verify/goldens_apply_gate.mjs: G001/G002 gate
- scripts/verify/format_policy_gate.mjs: FP01 gate (strict P0 scope)

## Real Risks

1. **DEP02 (FAIL)**: \`better-sqlite3\` requires native build (node-gyp).
   Mitigation: use prebuilt binaries (\`npm install --ignore-scripts\` with prebuilt binary) or provision capsule with pre-built .node file.
2. **Legacy FP01 warnings**: 14 pre-existing EDGE_LAB gate JSON files lack schema_version.
   Mitigation: migrate in follow-up PR by adding write_json_deterministic to each generating script.
3. **DEP01**: if npm cache is absent, fresh install would require network (capsule needed).
   Mitigation: pre-seed npm cache or use vendored node_modules in CI.

## Next Action

${nextAction}
`;

fs.writeFileSync(path.join(INFRA_DIR, 'INFRA_P0_CLOSEOUT.md'), closeoutMd);

// Write infra_p0_final.json
const finalGate = {
  schema_version: '1.0.0',
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

writeJsonDeterministic(path.join(MANUAL_DIR, 'infra_p0_final.json'), finalGate);

console.log('\n' + '='.repeat(60));
console.log('INFRA P0 GATE MATRIX');
console.log('='.repeat(60));
for (const g of gateStatuses) {
  const icon = g.status === 'PASS' ? 'PASS' : g.status;
  console.log(`  [${icon}] ${g.gate} (blocker=${g.blocker})`);
}
console.log(`\nFINAL: ${overallStatus}`);
console.log('='.repeat(60));

process.exit(overallStatus === 'PASS' || overallStatus === 'NEEDS_DATA' ? 0 : 1);
