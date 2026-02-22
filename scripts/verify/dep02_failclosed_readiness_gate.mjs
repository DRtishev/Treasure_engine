/**
 * dep02_failclosed_readiness_gate.mjs — DEP02 Fail-Closed Regression Gate
 *
 * Asserts: when INFRA closeout has DEP02 (FAIL), readiness MUST be BLOCKED DEP02.
 * Prevents regression where DEP02 non-blocking silently allows readiness to pass.
 *
 * Reads:
 * - reports/evidence/INFRA_P0/gates/manual/infra_p0_closeout.json
 * - reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json
 *
 * Writes:
 * - reports/evidence/INFRA_P0/DEP02_FAILCLOSED_READINESS.md
 * - reports/evidence/INFRA_P0/gates/manual/dep02_failclosed_readiness.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const INFRA_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const INFRA_MANUAL_DIR = path.join(INFRA_DIR, 'gates', 'manual');
const EDGE_MANUAL_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB', 'gates', 'manual');

const INFRA_CLOSEOUT_PATH = path.join(INFRA_MANUAL_DIR, 'infra_p0_closeout.json');
const READINESS_PATH = path.join(EDGE_MANUAL_DIR, 'micro_live_readiness.json');
const OUTPUT_MD = path.join(INFRA_DIR, 'DEP02_FAILCLOSED_READINESS.md');
const OUTPUT_JSON = path.join(INFRA_MANUAL_DIR, 'dep02_failclosed_readiness.json');

fs.mkdirSync(INFRA_MANUAL_DIR, { recursive: true });

const DEP_BLOCKING_CODES = ['DEP01', 'DEP02', 'DEP03'];

// ---------------------------------------------------------------------------
// Read infra closeout
// ---------------------------------------------------------------------------
let infraCloseout = null;
let infraReadError = null;

if (!fs.existsSync(INFRA_CLOSEOUT_PATH)) {
  infraReadError = `infra_p0_closeout.json missing at ${INFRA_CLOSEOUT_PATH}`;
} else {
  try {
    infraCloseout = JSON.parse(fs.readFileSync(INFRA_CLOSEOUT_PATH, 'utf8'));
  } catch (e) {
    infraReadError = `Parse error: ${e.message}`;
  }
}

// ---------------------------------------------------------------------------
// Read readiness JSON
// ---------------------------------------------------------------------------
let readiness = null;
let readinessReadError = null;

if (!fs.existsSync(READINESS_PATH)) {
  readinessReadError = `micro_live_readiness.json missing at ${READINESS_PATH}`;
} else {
  try {
    readiness = JSON.parse(fs.readFileSync(READINESS_PATH, 'utf8'));
  } catch (e) {
    readinessReadError = `Parse error: ${e.message}`;
  }
}

// ---------------------------------------------------------------------------
// Extract infra DEP codes
// ---------------------------------------------------------------------------
let infraDepCodes = [];
let infraEligible = true;

if (infraCloseout) {
  infraEligible = infraCloseout.eligible_for_micro_live !== false;
  infraDepCodes = (infraCloseout.gate_matrix || [])
    .filter((g) => g.gate === 'DEPS_OFFLINE' && DEP_BLOCKING_CODES.includes(g.reason_code))
    .map((g) => g.reason_code);
}

// ---------------------------------------------------------------------------
// Assertions: R12 fail-closed mapping + regression invariants
// ---------------------------------------------------------------------------
const assertions = [];
let allPass = true;

// A0 (regression): infra FINAL=BLOCKED must not have eligible_for_micro_live=true
// B2 seal regression check
if (infraCloseout) {
  const infraFinalStatus = infraCloseout.status;
  const infraEligMicro = infraCloseout.eligible_for_micro_live;
  const infraEligExec = infraCloseout.eligible_for_execution;

  if (infraFinalStatus !== 'PASS' && infraFinalStatus !== undefined) {
    const eligLeak = infraEligMicro === true || infraEligExec === true;
    if (eligLeak) allPass = false;

    assertions.push({
      assertion: `B2-SEAL: FINAL=${infraFinalStatus} ⇒ ELIGIBLE_* must all be false`,
      infra_status: infraFinalStatus,
      eligible_for_micro_live: infraEligMicro,
      eligible_for_execution: infraEligExec,
      result: eligLeak ? 'FAIL' : 'PASS',
      failure_detail: eligLeak
        ? `ELIGIBLE_FOR_MICRO_LIVE=${infraEligMicro} ELIGIBLE_FOR_EXECUTION=${infraEligExec} while FINAL=${infraFinalStatus} — eligibility leak (B2)`
        : null,
    });
  }
}

if (!infraReadError && !readinessReadError) {
  // A1: if infra has DEP02, readiness must be BLOCKED DEP02
  for (const depCode of DEP_BLOCKING_CODES) {
    const infraHasCode = infraDepCodes.includes(depCode);
    if (infraHasCode) {
      const readinessIsBlocked =
        readiness?.status === 'BLOCKED' &&
        readiness?.reason_code === depCode;

      const pass = readinessIsBlocked;
      if (!pass) allPass = false;

      assertions.push({
        assertion: `R12: infra FAIL ${depCode} ⇒ readiness BLOCKED ${depCode}`,
        infra_has_code: true,
        readiness_status: readiness?.status || 'UNKNOWN',
        readiness_reason_code: readiness?.reason_code || 'NONE',
        result: pass ? 'PASS' : 'FAIL',
        failure_detail: pass
          ? null
          : `Readiness status=${readiness?.status} reason=${readiness?.reason_code} — expected BLOCKED ${depCode}`,
      });
    }
  }

  // A2: if infra eligible=false, readiness must NOT be PASS
  if (!infraEligible) {
    const readinessPassed = readiness?.status === 'PASS';
    if (readinessPassed) allPass = false;

    assertions.push({
      assertion: 'R13: infra eligible_for_micro_live=false ⇒ readiness NOT PASS',
      infra_eligible: false,
      readiness_status: readiness?.status || 'UNKNOWN',
      result: readinessPassed ? 'FAIL' : 'PASS',
      failure_detail: readinessPassed
        ? `Readiness PASS while infra marks eligible_for_micro_live=false — governance leak`
        : null,
    });
  }

  // A3: if infra eligible=true AND no DEP codes, readiness should not be BLOCKED for DEP reasons
  if (infraEligible && infraDepCodes.length === 0) {
    assertions.push({
      assertion: 'Sanity: infra eligible=true ⇒ readiness not DEP-blocked',
      infra_eligible: true,
      readiness_status: readiness?.status || 'UNKNOWN',
      readiness_reason_code: readiness?.reason_code || 'NONE',
      result: DEP_BLOCKING_CODES.includes(readiness?.reason_code) ? 'WARN' : 'PASS',
      failure_detail: DEP_BLOCKING_CODES.includes(readiness?.reason_code)
        ? `Readiness BLOCKED ${readiness.reason_code} but infra shows no DEP codes — stale evidence?`
        : null,
    });
  }

  // A4 (regression): D003 must not appear as readiness reason code for missing-input scenario
  // D003 is reserved for canon rule drift; readiness missing input must produce RD01
  if (readiness?.reason_code === 'D003') {
    allPass = false;
    assertions.push({
      assertion: 'RD01-SEAL: readiness reason_code must not be D003 (reserved for canon drift)',
      readiness_reason_code: readiness.reason_code,
      result: 'FAIL',
      failure_detail: `readiness.reason_code=D003 found — D003 is reserved for canon rule drift. Missing infra input must produce RD01 (B4 regression).`,
    });
  }
} else {
  // When infra closeout is missing: check that readiness (if present) produced RD01
  // A5 (regression): missing infra closeout must produce RD01 in readiness
  if (infraReadError && !readinessReadError && readiness) {
    const readinessUsedRD01 = readiness.reason_code === 'RD01';
    if (!readinessUsedRD01) allPass = false;

    assertions.push({
      assertion: 'RD01-PROPAGATION: missing infra closeout JSON ⇒ readiness BLOCKED RD01',
      infra_read_error: infraReadError,
      readiness_status: readiness?.status || 'UNKNOWN',
      readiness_reason_code: readiness?.reason_code || 'NONE',
      result: readinessUsedRD01 ? 'PASS' : 'FAIL',
      failure_detail: readinessUsedRD01
        ? null
        : `Readiness reason_code=${readiness?.reason_code} — expected RD01 when infra closeout is missing (B4 regression)`,
    });
  }

  if (infraReadError) {
    assertions.push({
      assertion: 'Precondition: infra closeout JSON readable',
      result: 'FAIL',
      failure_detail: infraReadError,
    });
  }
  if (readinessReadError) {
    assertions.push({
      assertion: 'Precondition: readiness JSON readable',
      result: 'FAIL',
      failure_detail: readinessReadError,
    });
  }
}

// If no DEP codes found in infra, there's nothing to assert (not a regression)
const noDepCodesToAssert = !infraReadError && infraDepCodes.length === 0 && infraEligible;

let status, reason_code, message, next_action;

if (noDepCodesToAssert) {
  status = 'PASS';
  reason_code = 'NONE';
  message = 'No DEP blocking codes in infra closeout. R12 assertion vacuously true (no DEP present).';
  next_action = 'No action required.';
} else if (infraReadError || readinessReadError) {
  status = 'BLOCKED';
  reason_code = 'RD01';
  message = `Precondition data missing: ${infraReadError || readinessReadError}`;
  next_action = 'npm run infra:p0';
} else if (allPass) {
  status = 'PASS';
  reason_code = 'NONE';
  message = `R12 fail-closed verified: infra DEP codes [${infraDepCodes.join(', ')}] correctly propagated to readiness BLOCKED.`;
  next_action = `Resolve ${infraDepCodes.join('/')} per EDGE_LAB/DEP_POLICY.md to unlock readiness.`;
} else {
  status = 'FAIL';
  reason_code = 'DEP_PROPAGATION_LEAK';
  const failed = assertions.filter((a) => a.result === 'FAIL');
  message = `R12 REGRESSION: ${failed.length} assertion(s) failed — DEP code not propagated to readiness BLOCKED.`;
  next_action = 'Fix edge_micro_live_readiness.mjs R12 mapping, then rerun: npm run edge:micro:live:readiness && npm run verify:dep02:failclosed';
}

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------
const assertionTable = assertions.map((a) =>
  `| ${a.assertion.slice(0, 60)} | ${a.result} | ${a.failure_detail || '-'} |`
).join('\n');

const mdContent = `# DEP02_FAILCLOSED_READINESS.md — DEP02 Fail-Closed Regression Gate

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Purpose

Regression gate: asserts that when INFRA closeout carries DEP02/DEP03 (FAIL),
the readiness verdict MUST be BLOCKED with the same reason code.

Implements R12 (fail-closed propagation) + R13 (eligibility flags).

## Infra Closeout Summary

| Field | Value |
|-------|-------|
| infra status | ${infraCloseout?.status || infraReadError || 'UNKNOWN'} |
| eligible_for_micro_live | ${infraCloseout?.eligible_for_micro_live ?? 'UNKNOWN'} |
| DEP codes found | ${infraDepCodes.join(', ') || 'NONE'} |

## Readiness Summary

| Field | Value |
|-------|-------|
| readiness status | ${readiness?.status || readinessReadError || 'UNKNOWN'} |
| readiness reason_code | ${readiness?.reason_code || 'UNKNOWN'} |

## Assertions (R12)

| Assertion | Result | Detail |
|-----------|--------|--------|
${assertionTable || '| (no assertions — vacuously PASS) | PASS | No DEP codes present |'}

## Verdict

**${status}** — ${reason_code}

${message}

## Next Action

${next_action}
`;

fs.writeFileSync(OUTPUT_MD, mdContent);

const gateResult = {
  schema_version: '1.0.0',
  assertions,
  infra_dep_codes: infraDepCodes,
  infra_eligible: infraCloseout?.eligible_for_micro_live ?? null,
  infra_status: infraCloseout?.status || null,
  message,
  next_action,
  no_dep_codes_to_assert: noDepCodesToAssert,
  readiness_reason_code: readiness?.reason_code || null,
  readiness_status: readiness?.status || null,
  reason_code,
  run_id: RUN_ID,
  status,
};

writeJsonDeterministic(OUTPUT_JSON, gateResult);

console.log(`[${status}] dep02_failclosed_readiness_gate — ${reason_code}: ${message}`);
if (status === 'FAIL') {
  assertions.filter((a) => a.result === 'FAIL').forEach((a) => {
    console.error(`  FAIL: ${a.assertion}`);
    console.error(`    Detail: ${a.failure_detail}`);
  });
}

process.exit(status === 'PASS' ? 0 : 1);
