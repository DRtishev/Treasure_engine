import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const PROTOCOL_FILE = path.join(ROOT, 'EDGE_LAB', 'PAPER_TO_MICRO_LIVE_PROTOCOL.md');
const OUTPUT_MD = path.join(EVIDENCE_DIR, 'MICRO_LIVE_READINESS.md');
const OUTPUT_JSON = path.join(MANUAL_DIR, 'micro_live_readiness.json');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// LIVE eligibility is always false by policy
const LIVE_ELIGIBLE = false;

// --- Required gate files and their pass conditions ---
const REQUIRED_GATES = [
  { file: 'profit_candidates_court.json', name: 'PROFIT_CANDIDATES_COURT', required_status: 'PASS' },
  { file: 'execution_reality_court.json', name: 'EXECUTION_REALITY_COURT', required_status: 'PASS' },
  { file: 'sli_baseline.json', name: 'SLI_BASELINE', required_status: 'PASS' },
  { file: 'proxy_guard.json', name: 'PROXY_GUARD', required_status: 'PASS' },
  { file: 'paper_court.json', name: 'PAPER_COURT', required_status: 'PASS' },
];

// --- Required protocol sections for MICRO_LIVE_ELIGIBLE ---
const REQUIRED_PROTOCOL_SECTIONS = [
  'stop-rules', 'stop_rules', 'STOP_RULES', 'STOP RULES', 'hard stop', 'Hard stops', 'Hard stop'
];
const REQUIRED_PROTOCOL_FIELDS = [
  { term: 'minimum capital', alts: ['min_capital', 'minimum notional', 'minimal notional', 'minimal capital', 'minimum_capital'] },
  { term: 'risk limit', alts: ['risk_limit', 'RISK_LIMIT', 'max_loss', 'max_risk', 'risk per'] },
  { term: 'stop', alts: ['stop-rule', 'stop_rule', 'stop condition', 'Hard stop'] },
  { term: 'SLI', alts: ['SLO', 'SLI_BASELINE', 'sli_baseline', 'service level'] },
];

const now = new Date().toISOString();

// --- Read and check protocol file ---
const protocolExists = fs.existsSync(PROTOCOL_FILE);
const protocolContent = protocolExists ? fs.readFileSync(PROTOCOL_FILE, 'utf8') : '';
const protocolContentLower = protocolContent.toLowerCase();

const hasStopRules = REQUIRED_PROTOCOL_SECTIONS.some(s => protocolContent.includes(s));
const protocolChecks = REQUIRED_PROTOCOL_FIELDS.map(f => {
  const found = [f.term, ...f.alts].some(t => protocolContentLower.includes(t.toLowerCase()));
  return { field: f.term, found };
});
const allProtocolFieldsFound = protocolChecks.every(c => c.found);

// --- Read and check gate JSON files ---
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

const gateChecks = REQUIRED_GATES.map(g => {
  const result = readGate(g.file);
  const passes = result.exists && result.status === g.required_status;
  return {
    gate: g.name,
    file: g.file,
    required_status: g.required_status,
    actual_status: result.status,
    reason_code: result.reason_code,
    passes
  };
});

const failedGates = gateChecks.filter(g => !g.passes);
const allGatesPass = failedGates.length === 0;

// --- Determine eligibility ---
// MICRO_LIVE_ELIGIBLE = true ONLY if:
// 1. All required gates PASS
// 2. Protocol has stop rules documented
// 3. Protocol has all required fields
// Default is false; must be explicitly proven.
const MICRO_LIVE_ELIGIBLE = allGatesPass && hasStopRules && allProtocolFieldsFound;

// --- Build blocked reasons ---
const blockedReasons = [];
if (!protocolExists) blockedReasons.push('PAPER_TO_MICRO_LIVE_PROTOCOL.md not found');
if (!hasStopRules) blockedReasons.push('Protocol missing stop-rules section');
if (!allProtocolFieldsFound) {
  const missing = protocolChecks.filter(c => !c.found).map(c => c.field);
  blockedReasons.push(`Protocol missing required fields: ${missing.join(', ')}`);
}
for (const g of failedGates) {
  blockedReasons.push(`Gate ${g.gate}: expected ${g.required_status}, got ${g.actual_status} (${g.reason_code})`);
}

const overallStatus = MICRO_LIVE_ELIGIBLE ? 'PASS' : 'NEEDS_DATA';
const reason_code = MICRO_LIVE_ELIGIBLE ? 'NONE' : 'MICRO_LIVE_PREREQUISITES_NOT_MET';
const message = MICRO_LIVE_ELIGIBLE
  ? 'All prerequisites met. MICRO_LIVE_ELIGIBLE=true. LIVE_ELIGIBLE remains false by policy.'
  : `MICRO_LIVE_ELIGIBLE=false. ${blockedReasons.length} prerequisite(s) not met. NEXT_ACTION: ${failedGates.length > 0 ? `Pass gates: ${failedGates.map(g => g.gate).join(', ')}` : 'Complete protocol documentation'}.`;

// --- Write JSON gate ---
const gateOutput = {
  generated_at: now,
  script: 'edge_micro_live_readiness.mjs',
  status: overallStatus,
  reason_code,
  message,
  LIVE_ELIGIBLE,
  MICRO_LIVE_ELIGIBLE,
  ELIGIBLE_FOR_PAPER: gateChecks.find(g => g.gate === 'PROFIT_CANDIDATES_COURT')?.passes || false,
  protocol_checks: {
    file_exists: protocolExists,
    has_stop_rules: hasStopRules,
    required_fields: protocolChecks,
    all_fields_found: allProtocolFieldsFound
  },
  gate_checks: gateChecks,
  blocked_reasons: blockedReasons
};
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(gateOutput, null, 2)}\n`);

// --- Write markdown report ---
const gateTable = gateChecks.map(g =>
  `| ${g.gate} | ${g.required_status} | ${g.actual_status} | ${g.passes ? 'PASS' : 'BLOCKED'} | ${g.reason_code} |`
).join('\n');

const protocolTable = protocolChecks.map(c =>
  `| ${c.field} | ${c.found ? 'FOUND' : 'MISSING'} |`
).join('\n');

const blockedBlock = blockedReasons.length > 0
  ? blockedReasons.map(r => `- ${r}`).join('\n')
  : '- NONE';

const mdContent = `# MICRO_LIVE_READINESS.md — Micro-Live Readiness Assessment
generated_at: ${now}
script: edge_micro_live_readiness.mjs

## STATUS: ${overallStatus}

## Eligibility Matrix
| State | Value |
|-------|-------|
| ELIGIBLE_FOR_PAPER | ${gateOutput.ELIGIBLE_FOR_PAPER} |
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

## Blocked Reasons
${blockedBlock}

## Verdict
MICRO_LIVE_ELIGIBLE: **${MICRO_LIVE_ELIGIBLE}**
LIVE_ELIGIBLE: **${LIVE_ELIGIBLE}** (permanent false — requires explicit policy upgrade)

${overallStatus === 'PASS'
    ? `All prerequisites met. Micro-live pilot may proceed under protocol constraints.\nNEXT_ACTION: Operator reviews PAPER_TO_MICRO_LIVE_PROTOCOL.md and approves micro-live pilot.`
    : `NEXT_ACTION: ${failedGates.length > 0
      ? `Pass gates: ${failedGates.map(g => g.gate).join(', ')}. Then rerun edge:all.`
      : 'Complete protocol documentation and rerun edge:micro:live:readiness.'
    }`
  }
`;

fs.writeFileSync(OUTPUT_MD, mdContent);

// NEEDS_DATA is not a pipeline error; exit 0 to allow edge:all to continue
console.log(`[${overallStatus}] edge:micro:live:readiness — MICRO_LIVE_ELIGIBLE=${MICRO_LIVE_ELIGIBLE} LIVE_ELIGIBLE=${LIVE_ELIGIBLE} REASON=${reason_code}`);
process.exit(0);
