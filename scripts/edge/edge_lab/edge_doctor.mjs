/**
 * edge:doctor — Canonical EDGE_LAB status summary
 *
 * Reads existing evidence from reports/evidence/EDGE_LAB/ without running the pipeline.
 * Shows gate statuses, promotion blockers, and next actions.
 * Exit 0 always (diagnostic only — does not fail the pipeline).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function colorStatus(status) {
  switch (status) {
    case 'PASS': return `${GREEN}PASS${RESET}`;
    case 'BLOCKED': return `${RED}BLOCKED${RESET}`;
    case 'NEEDS_DATA': return `${YELLOW}NEEDS_DATA${RESET}`;
    case 'MISSING': return `${DIM}MISSING${RESET}`;
    default: return `${DIM}${status}${RESET}`;
  }
}

function readMdStatus(file) {
  const p = path.join(EVIDENCE_DIR, file);
  if (!fs.existsSync(p)) return { status: 'MISSING', reason_code: 'FILE_NOT_FOUND' };
  const raw = fs.readFileSync(p, 'utf8');
  const statusMatch = raw.match(/^## STATUS:\s*([A-Z_]+)/m) || raw.match(/^STATUS:\s*([A-Z_]+)/m);
  const reasonMatch = raw.match(/^REASON_CODE:\s*([A-Z_]+)/m);
  return {
    status: statusMatch ? statusMatch[1] : 'UNKNOWN',
    reason_code: reasonMatch ? reasonMatch[1] : '-',
  };
}

function readGateJson(file) {
  const p = path.join(MANUAL_DIR, file);
  if (!fs.existsSync(p)) return { status: 'MISSING', reason_code: 'FILE_NOT_FOUND' };
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { status: data.status || 'UNKNOWN', reason_code: data.reason_code || '-', message: data.message || '' };
  } catch (e) {
    return { status: 'PARSE_ERROR', reason_code: 'JSON_PARSE_FAILED' };
  }
}

const CORE_COURTS = [
  { name: 'SOURCES_AUDIT', file: 'SOURCES_AUDIT.md' },
  { name: 'REGISTRY_COURT', file: 'REGISTRY_COURT.md' },
  { name: 'DATASET_COURT', file: 'DATASET_COURT.md' },
  { name: 'EXECUTION_COURT', file: 'EXECUTION_COURT.md' },
  { name: 'EXECUTION_SENSITIVITY_GRID', file: 'EXECUTION_SENSITIVITY_GRID.md' },
  { name: 'RISK_COURT', file: 'RISK_COURT.md' },
  { name: 'OVERFIT_COURT', file: 'OVERFIT_COURT.md' },
  { name: 'REDTEAM_COURT', file: 'REDTEAM_COURT.md' },
  { name: 'SRE_COURT', file: 'SRE_COURT.md' },
];

const PROFIT_TRACK_COURTS = [
  { name: 'PROFIT_CANDIDATES_COURT', file: 'PROFIT_CANDIDATES_COURT.md' },
  { name: 'PAPER_EVIDENCE', file: 'PAPER_EVIDENCE.md' },
  { name: 'EXECUTION_REALITY_COURT', file: 'EXECUTION_REALITY_COURT.md' },
  { name: 'MICRO_LIVE_READINESS', file: 'MICRO_LIVE_READINESS.md' },
];

const INTEGRITY_GATES = [
  { name: 'anti_flake_independence', file: 'anti_flake_independence.json', label: 'ANTI_FLAKE_INDEPENDENCE' },
  { name: 'raw_stability', file: 'raw_stability.json', label: 'RAW_STABILITY' },
  { name: 'determinism_x2', file: 'determinism_x2.json', label: 'DETERMINISM_X2' },
  { name: 'ledger_acyclicity', file: 'ledger_acyclicity.json', label: 'LEDGER_ACYCLICITY' },
  { name: 'ledger_check', file: 'ledger_check.json', label: 'LEDGER_CHECK' },
];

const PROMOTION_GATES = [
  { name: 'verdict_stratification', file: 'verdict_stratification.json', label: 'VERDICT_STRATIFICATION' },
  { name: 'proxy_guard', file: 'proxy_guard.json', label: 'PROXY_GUARD' },
  { name: 'paper_court', file: 'paper_court.json', label: 'PAPER_COURT' },
  { name: 'sli_baseline', file: 'sli_baseline.json', label: 'SLI_BASELINE' },
  { name: 'meta_audit', file: 'meta_audit.json', label: 'META_AUDIT' },
  { name: 'final_verdict', file: 'final_verdict.json', label: 'FINAL_VERDICT' },
];

const hr = `${DIM}${'─'.repeat(60)}${RESET}`;

console.log('');
console.log(`${BOLD}${CYAN}╔═══════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}${CYAN}║       EDGE_LAB — Doctor Report        ║${RESET}`);
console.log(`${BOLD}${CYAN}╚═══════════════════════════════════════╝${RESET}`);
console.log('');

// Check if evidence dir exists
if (!fs.existsSync(EVIDENCE_DIR)) {
  console.log(`${RED}Evidence directory not found: ${EVIDENCE_DIR}${RESET}`);
  console.log(`${YELLOW}Run: npm run edge:all${RESET}`);
  process.exit(0);
}

// --- Core Courts ---
console.log(`${BOLD}Core Courts (must all PASS for PIPELINE_ELIGIBLE)${RESET}`);
console.log(hr);
let coreAllPass = true;
for (const court of CORE_COURTS) {
  const { status, reason_code } = readMdStatus(court.file);
  if (status !== 'PASS') coreAllPass = false;
  const reasonStr = reason_code && reason_code !== '-' && reason_code !== 'NONE' ? ` [${reason_code}]` : '';
  console.log(`  ${colorStatus(status).padEnd(20)} ${court.name}${DIM}${reasonStr}${RESET}`);
}
console.log('');

// --- Profit Track Courts ---
console.log(`${BOLD}Profit Track Courts (PASS → ELIGIBLE_FOR_PAPER)${RESET}`);
console.log(hr);
let profitAllPass = true;
for (const court of PROFIT_TRACK_COURTS) {
  const { status, reason_code } = readMdStatus(court.file);
  if (status !== 'PASS') profitAllPass = false;
  const reasonStr = reason_code && reason_code !== '-' && reason_code !== 'NONE' ? ` [${reason_code}]` : '';
  console.log(`  ${colorStatus(status).padEnd(20)} ${court.name}${DIM}${reasonStr}${RESET}`);
}
console.log('');

// --- Integrity Gates ---
console.log(`${BOLD}Integrity Gates${RESET}`);
console.log(hr);
for (const gate of INTEGRITY_GATES) {
  const { status, reason_code } = readGateJson(gate.file);
  const reasonStr = reason_code && reason_code !== '-' && reason_code !== 'NONE' ? ` [${reason_code}]` : '';
  console.log(`  ${colorStatus(status).padEnd(20)} ${gate.label}${DIM}${reasonStr}${RESET}`);
}
console.log('');

// --- Promotion Gates ---
console.log(`${BOLD}Promotion Gates${RESET}`);
console.log(hr);
for (const gate of PROMOTION_GATES) {
  const { status, reason_code } = readGateJson(gate.file);
  const reasonStr = reason_code && reason_code !== '-' && reason_code !== 'NONE' ? ` [${reason_code}]` : '';
  console.log(`  ${colorStatus(status).padEnd(20)} ${gate.label}${DIM}${reasonStr}${RESET}`);
}
console.log('');

// --- Verdict Stratification ---
const stratGate = readGateJson('verdict_stratification.json');
let verdictStates = null;
try {
  const p = path.join(MANUAL_DIR, 'verdict_stratification.json');
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    verdictStates = data.states || null;
  }
} catch (e) { /* ignore */ }

console.log(`${BOLD}Promotion Eligibility${RESET}`);
console.log(hr);
if (verdictStates) {
  const stateOrder = [
    'PIPELINE_ELIGIBLE', 'TESTING_SET_ELIGIBLE', 'PAPER_ELIGIBLE',
    'ELIGIBLE_FOR_PAPER', 'ELIGIBLE_FOR_MICRO_LIVE', 'ELIGIBLE_FOR_LIVE'
  ];
  for (const state of stateOrder) {
    const val = verdictStates[state];
    const indicator = val === true ? `${GREEN}YES${RESET}` : val === false ? `${RED}NO${RESET}` : `${DIM}MISSING${RESET}`;
    console.log(`  ${indicator.padEnd(20)} ${state}`);
  }
} else {
  console.log(`  ${DIM}No verdict stratification data. Run edge:all or edge:next-epoch.${RESET}`);
}
console.log('');

// --- Promotion Blockers ---
console.log(`${BOLD}Promotion Blockers${RESET}`);
console.log(hr);
const blockers = [];

if (!coreAllPass) blockers.push('Core courts not all PASS — run edge:all');
if (!profitAllPass) {
  for (const court of PROFIT_TRACK_COURTS) {
    const { status, reason_code } = readMdStatus(court.file);
    if (status === 'NEEDS_DATA') {
      if (court.file === 'PAPER_EVIDENCE.md') {
        blockers.push(`${court.name}: NEEDS_DATA → Provide artifacts/incoming/paper_evidence.json`);
      } else {
        blockers.push(`${court.name}: NEEDS_DATA [${reason_code}]`);
      }
    } else if (status !== 'PASS') {
      blockers.push(`${court.name}: ${status} [${reason_code}]`);
    }
  }
}

const finalVerdict = readGateJson('final_verdict.json');
if (finalVerdict.status === 'BLOCKED') {
  blockers.push(`FINAL_VERDICT BLOCKED: ${finalVerdict.reason_code}`);
}

if (blockers.length === 0) {
  console.log(`  ${GREEN}No blockers detected${RESET}`);
} else {
  for (const b of blockers) {
    console.log(`  ${RED}✗${RESET} ${b}`);
  }
}
console.log('');

// --- Quick Actions ---
console.log(`${BOLD}Quick Actions${RESET}`);
console.log(hr);
console.log(`  ${CYAN}npm run edge:all${RESET}           — Run full producer pipeline`);
console.log(`  ${CYAN}npm run edge:next-epoch${RESET}    — Run full epoch gate + promotion check`);
console.log(`  ${CYAN}npm run edge:all:x2${RESET}        — Check producer pipeline determinism`);
console.log(`  ${CYAN}npm run edge:ledger${RESET}        — Verify SHA256 evidence tamper-check`);
console.log(`  ${CYAN}npm run edge:paper:ingest${RESET}  — Ingest paper trading evidence (if available)`);
console.log('');
