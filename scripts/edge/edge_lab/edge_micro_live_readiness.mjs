/**
 * edge_micro_live_readiness.mjs — Micro-live readiness gate
 *
 * R12 fail-closed: reads infra_p0_closeout.json; if missing → BLOCKED D003.
 * DEP01/DEP02/DEP03 in infra closeout → BLOCKED with same reason code.
 *
 * Output:
 * - reports/evidence/EDGE_LAB/P1/MICRO_LIVE_READINESS.md
 * - reports/evidence/EDGE_LAB/gates/manual/micro_live_readiness.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
// P1 subdir per EVIDENCE_NAMING_SSOT v1.5.3
const P1_DIR = path.join(EVIDENCE_DIR, 'P1');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const PROTOCOL_FILE = path.join(ROOT, 'EDGE_LAB', 'PAPER_TO_MICRO_LIVE_PROTOCOL.md');

// EVIDENCE_NAMING_SSOT: INFRA closeout JSON path
const INFRA_CLOSEOUT_JSON = path.join(
  ROOT, 'reports', 'evidence', 'INFRA_P0', 'gates', 'manual', 'infra_p0_closeout.json'
);

const OUTPUT_MD = path.join(P1_DIR, 'MICRO_LIVE_READINESS.md');

fs.mkdirSync(P1_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// LIVE eligibility is always false by policy
const LIVE_ELIGIBLE = false;

// DEP codes that propagate as BLOCKED (R12)
const DEP_BLOCKING_CODES = ['DEP01', 'DEP02', 'DEP03'];

// ---------------------------------------------------------------------------
// R12: Read infra closeout JSON — fail-closed
// ---------------------------------------------------------------------------
let infraCloseout = null;
let infraBlockReason = null;
let infraBlockCode = null;

if (!fs.existsSync(INFRA_CLOSEOUT_JSON)) {
  infraBlockCode = 'D003';
  infraBlockReason = `INFRA closeout JSON missing at ${INFRA_CLOSEOUT_JSON}. Run: npm run p0:all`;
} else {
  try {
    infraCloseout = JSON.parse(fs.readFileSync(INFRA_CLOSEOUT_JSON, 'utf8'));

    // R12: check eligibility flags first (R13 contract)
    if (infraCloseout.eligible_for_micro_live === false) {
      // Extract reason code from gate_matrix
      const depEntry = (infraCloseout.gate_matrix || []).find(
        (g) => g.gate === 'DEPS_OFFLINE' && DEP_BLOCKING_CODES.includes(g.reason_code)
      );
      infraBlockCode = depEntry?.reason_code || 'DEP_UNKNOWN';
      infraBlockReason = infraCloseout.eligibility_reason
        || `eligible_for_micro_live=false in infra closeout (${infraBlockCode})`;
    }
  } catch (e) {
    infraBlockCode = 'D003';
    infraBlockReason = `INFRA closeout JSON parse error: ${e.message}`;
  }
}

// ---------------------------------------------------------------------------
// Edge gate prerequisites
// ---------------------------------------------------------------------------
const REQUIRED_GATES = [
  { file: 'profit_candidates_court.json', name: 'PROFIT_CANDIDATES_COURT', required_status: 'PASS' },
  { file: 'execution_reality_court.json', name: 'EXECUTION_REALITY_COURT', required_status: 'PASS' },
  { file: 'sli_baseline.json', name: 'SLI_BASELINE', required_status: 'PASS' },
  { file: 'proxy_guard.json', name: 'PROXY_GUARD', required_status: 'PASS' },
  { file: 'paper_court.json', name: 'PAPER_COURT', required_status: 'PASS' },
];

const REQUIRED_PROTOCOL_SECTIONS = [
  'stop-rules', 'stop_rules', 'STOP_RULES', 'STOP RULES', 'hard stop', 'Hard stops', 'Hard stop'
];
const REQUIRED_PROTOCOL_FIELDS = [
  { term: 'minimum capital', alts: ['min_capital', 'minimum notional', 'minimal notional', 'minimal capital', 'minimum_capital'] },
  { term: 'risk limit', alts: ['risk_limit', 'RISK_LIMIT', 'max_loss', 'max_risk', 'risk per'] },
  { term: 'stop', alts: ['stop-rule', 'stop_rule', 'stop condition', 'Hard stop'] },
  { term: 'SLI', alts: ['SLO', 'SLI_BASELINE', 'sli_baseline', 'service level'] },
];

// Read and check protocol file
const protocolExists = fs.existsSync(PROTOCOL_FILE);
const protocolContent = protocolExists ? fs.readFileSync(PROTOCOL_FILE, 'utf8') : '';
const protocolContentLower = protocolContent.toLowerCase();

const hasStopRules = REQUIRED_PROTOCOL_SECTIONS.some((s) => protocolContent.includes(s));
const protocolChecks = REQUIRED_PROTOCOL_FIELDS.map((f) => {
  const found = [f.term, ...f.alts].some((t) => protocolContentLower.includes(t.toLowerCase()));
  return { field: f.term, found };
});
const allProtocolFieldsFound = protocolChecks.every((c) => c.found);

// Read and check gate JSON files
function readGate(filename) {
  const p = path.join(MANUAL_DIR, filename);
  if (!fs.existsSync(p)) return { exists: false, status: 'MISSING', reason_code: 'FILE_NOT_FOUND' };
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { exists: true, status: data.status || 'UNKNOWN', reason_code: data.reason_code || 'UNKNOWN' };
  } catch (e) {
    return { exists: true, status: 'PARSE_ERROR', reason_code: 'JSON_PARSE_FAILED' };
  }
}

const gateChecks = REQUIRED_GATES.map((g) => {
  const result = readGate(g.file);
  const passes = result.exists && result.status === g.required_status;
  return {
    gate: g.name,
    file: g.file,
    required_status: g.required_status,
    actual_status: result.status,
    reason_code: result.reason_code,
    passes,
  };
});

const failedGates = gateChecks.filter((g) => !g.passes);
const allGatesPass = failedGates.length === 0;

// ---------------------------------------------------------------------------
// Determine overall status
// ---------------------------------------------------------------------------

// R12: infra block is unconditional — overrides all other signals
let overallStatus, reason_code, message, nextAction;

if (infraBlockCode) {
  // R12 fail-closed: BLOCKED with same DEP reason code (or D003 for missing JSON)
  overallStatus = 'BLOCKED';
  reason_code = infraBlockCode;
  message = `BLOCKED ${infraBlockCode}: ${infraBlockReason}. MICRO_LIVE_ELIGIBLE=false by R12 fail-closed policy.`;
  nextAction = infraBlockCode === 'D003'
    ? 'npm run p0:all'
    : `Resolve ${infraBlockCode} per EDGE_LAB/DEP_POLICY.md, then: npm run p0:all && npm run edge:micro:live:readiness`;
} else {
  // Infra is eligible; check edge prerequisites
  const MICRO_LIVE_ELIGIBLE = allGatesPass && hasStopRules && allProtocolFieldsFound;

  const blockedReasons = [];
  if (!protocolExists) blockedReasons.push('PAPER_TO_MICRO_LIVE_PROTOCOL.md not found');
  if (!hasStopRules) blockedReasons.push('Protocol missing stop-rules section');
  if (!allProtocolFieldsFound) {
    const missing = protocolChecks.filter((c) => !c.found).map((c) => c.field);
    blockedReasons.push(`Protocol missing required fields: ${missing.join(', ')}`);
  }
  for (const g of failedGates) {
    blockedReasons.push(`Gate ${g.gate}: expected ${g.required_status}, got ${g.actual_status} (${g.reason_code})`);
  }

  overallStatus = MICRO_LIVE_ELIGIBLE ? 'PASS' : 'NEEDS_DATA';
  reason_code = MICRO_LIVE_ELIGIBLE ? 'NONE' : 'MICRO_LIVE_PREREQUISITES_NOT_MET';
  message = MICRO_LIVE_ELIGIBLE
    ? 'All prerequisites met. MICRO_LIVE_ELIGIBLE=true. LIVE_ELIGIBLE remains false by policy.'
    : `MICRO_LIVE_ELIGIBLE=false. ${blockedReasons.length} prerequisite(s) not met.`;
  nextAction = MICRO_LIVE_ELIGIBLE
    ? 'Operator reviews PAPER_TO_MICRO_LIVE_PROTOCOL.md and approves micro-live pilot.'
    : (failedGates.length > 0
        ? `Pass gates: ${failedGates.map((g) => g.gate).join(', ')}. Then rerun edge:all.`
        : 'Complete protocol documentation and rerun edge:micro:live:readiness.');
}

const MICRO_LIVE_ELIGIBLE = !infraBlockCode && allGatesPass && hasStopRules && allProtocolFieldsFound;
const ELIGIBLE_FOR_PAPER = gateChecks.find((g) => g.gate === 'PROFIT_CANDIDATES_COURT')?.passes || false;

// ---------------------------------------------------------------------------
// Write JSON gate (via deterministic writer — no timestamps)
// ---------------------------------------------------------------------------
const gateOutput = {
  schema_version: '1.0.0',
  ELIGIBLE_FOR_PAPER,
  LIVE_ELIGIBLE,
  MICRO_LIVE_ELIGIBLE,
  blocked_by_infra: infraBlockCode || null,
  gate_checks: gateChecks,
  infra_closeout_eligible: infraBlockCode ? false : true,
  infra_closeout_reason: infraBlockReason || null,
  message,
  next_action: nextAction,
  protocol_checks: {
    all_fields_found: allProtocolFieldsFound,
    file_exists: protocolExists,
    has_stop_rules: hasStopRules,
    required_fields: protocolChecks,
  },
  reason_code,
  run_id: RUN_ID,
  status: overallStatus,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'micro_live_readiness.json'), gateOutput);

// ---------------------------------------------------------------------------
// Write markdown report to P1 subdir
// ---------------------------------------------------------------------------
const gateTable = gateChecks.map((g) =>
  `| ${g.gate} | ${g.required_status} | ${g.actual_status} | ${g.passes ? 'PASS' : 'BLOCKED'} | ${g.reason_code} |`
).join('\n');

const protocolTable = protocolChecks.map((c) =>
  `| ${c.field} | ${c.found ? 'FOUND' : 'MISSING'} |`
).join('\n');

const infraBlock = infraBlockCode
  ? `**BLOCKED by INFRA (R12):** ${infraBlockCode} — ${infraBlockReason}`
  : '**INFRA eligible:** No DEP blocking codes in infra closeout.';

const mdContent = `# MICRO_LIVE_READINESS.md — Micro-Live Readiness Assessment

STATUS: ${overallStatus}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Infra Eligibility Check (R12 Fail-Closed)

${infraBlock}

## Eligibility Matrix

| State | Value |
|-------|-------|
| ELIGIBLE_FOR_PAPER | ${ELIGIBLE_FOR_PAPER} |
| ELIGIBLE_FOR_MICRO_LIVE | ${MICRO_LIVE_ELIGIBLE} |
| ELIGIBLE_FOR_LIVE | ${LIVE_ELIGIBLE} |

## Gate Prerequisite Checks

| Gate | Required | Actual | Result | Reason |
|------|---------|--------|--------|--------|
${gateTable}

## Protocol Checks (PAPER_TO_MICRO_LIVE_PROTOCOL.md)

| Required Field | Found |
|---------------|-------|
| stop_rules_section | ${hasStopRules ? 'FOUND' : 'MISSING'} |
${protocolTable}

## Verdict

MICRO_LIVE_ELIGIBLE: **${MICRO_LIVE_ELIGIBLE}**
LIVE_ELIGIBLE: **${LIVE_ELIGIBLE}** (permanent false — requires explicit policy upgrade)

${overallStatus === 'BLOCKED'
  ? `R12 fail-closed: readiness BLOCKED by infra DEP code ${infraBlockCode}.\nNEXT_ACTION: ${nextAction}`
  : overallStatus === 'PASS'
    ? `All prerequisites met. Micro-live pilot may proceed under protocol constraints.\nNEXT_ACTION: ${nextAction}`
    : `NEXT_ACTION: ${nextAction}`
}
`;

fs.writeFileSync(OUTPUT_MD, mdContent);

console.log(`[${overallStatus}] edge:micro:live:readiness — MICRO_LIVE_ELIGIBLE=${MICRO_LIVE_ELIGIBLE} LIVE_ELIGIBLE=${LIVE_ELIGIBLE} REASON=${reason_code}`);
if (infraBlockCode) {
  console.error(`  R12 BLOCKED by infra: ${infraBlockCode} — ${infraBlockReason}`);
}
// NEEDS_DATA exits 0 (non-blocking for pipeline); BLOCKED exits 1
process.exit(overallStatus === 'BLOCKED' ? 1 : 0);
