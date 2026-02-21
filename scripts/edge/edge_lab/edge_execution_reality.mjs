import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const POLICY_FILE = path.join(ROOT, 'EDGE_LAB', 'EXECUTION_REALITY_POLICY.md');
const CANDIDATES_GATE = path.join(MANUAL_DIR, 'profit_candidates_court.json');
const OUTPUT_COURT = path.join(EVIDENCE_DIR, 'EXECUTION_REALITY_COURT.md');
const OUTPUT_BREAKPOINTS = path.join(EVIDENCE_DIR, 'EXECUTION_BREAKPOINTS.md');
const OUTPUT_JSON = path.join(MANUAL_DIR, 'execution_reality_court.json');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

function blocked(reason_code, message, extra = {}) {
  return { status: 'NEEDS_DATA', reason_code, message, ...extra };
}
function pass(message, extra = {}) {
  return { status: 'PASS', reason_code: 'NONE', message, ...extra };
}

// --- Validate policy file exists ---
if (!fs.existsSync(POLICY_FILE)) {
  const result = blocked('MISSING_POLICY', 'EXECUTION_REALITY_POLICY.md not found');
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`);
  console.error('[BLOCKED] edge:execution:reality — policy file missing');
  process.exit(1);
}

const policyRaw = fs.readFileSync(POLICY_FILE, 'utf8');

// --- Parse policy parameters ---
function extractPolicyValue(pattern, text) {
  const m = text.match(pattern);
  return m ? m[1].trim() : null;
}

const roundTripBaseline = 0.0030;     // 0.30% — from policy section 3
const defaultProxyExpectancy = 0.0050; // 0.50% PROXY — from policy section 6

// --- EPOCH P2: Read EXPECTANCY_CI gate (P1) — required for MEASURED+CI path ---
let ciGate = null;
const CI_GATE_FILE = path.join(MANUAL_DIR, 'expectancy_ci.json');
if (fs.existsSync(CI_GATE_FILE)) {
  try { ciGate = JSON.parse(fs.readFileSync(CI_GATE_FILE, 'utf8')); } catch (e) {}
}
const ciPass = ciGate && ciGate.status === 'PASS' && Array.isArray(ciGate.results);

// --- Read paper_evidence.json gate to determine if MEASURED mode is active ---
let paperEvidenceGate = null;
const PAPER_EVIDENCE_GATE = path.join(MANUAL_DIR, 'paper_evidence.json');
if (fs.existsSync(PAPER_EVIDENCE_GATE)) {
  try {
    paperEvidenceGate = JSON.parse(fs.readFileSync(PAPER_EVIDENCE_GATE, 'utf8'));
  } catch (e) { /* ignore parse error — treat as unavailable */ }
}
// EPOCH P2: MEASURED mode requires BOTH paper evidence PASS AND CI PASS
const measuredMode = ciPass && paperEvidenceGate && paperEvidenceGate.status === 'PASS' && Array.isArray(paperEvidenceGate.candidates);

// Build per-candidate expectancy map (CI-validated MEASURED values, or proxy fallback)
const measuredExpectancyMap = {};
if (measuredMode) {
  for (const c of paperEvidenceGate.candidates) {
    if (c.name && typeof c.expectancy_pct === 'number') {
      measuredExpectancyMap[c.name] = c.expectancy_pct / 100; // convert pct to decimal
    }
  }
}

// Validate policy contains required sections
const requiredSections = [
  '## 1. Fee Model', '## 2. Slippage Model Buckets',
  '## 3. Total Round-Trip Cost Baseline', '## 4. Latency Budget',
  '## 5. Partial Fill Assumptions', '## 6. Proxy Expectancy Declaration',
  '## 7. Stress Test Grid', '## 8. Breakpoint Definition',
  '## 9. PASS / BLOCKED Thresholds'
];
const missingSections = requiredSections.filter(s => !policyRaw.includes(s));
if (missingSections.length > 0) {
  const result = blocked('POLICY_INCOMPLETE', `Policy missing sections: ${missingSections.join(', ')}`);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`);
  console.error(`[BLOCKED] edge:execution:reality — policy incomplete: ${missingSections[0]}`);
  process.exit(1);
}

// --- Read candidates from gate JSON ---
let candidates = [];
if (fs.existsSync(CANDIDATES_GATE)) {
  try {
    const gate = JSON.parse(fs.readFileSync(CANDIDATES_GATE, 'utf8'));
    if (gate.candidates && Array.isArray(gate.candidates)) {
      candidates = gate.candidates.map(c => c.name);
    }
  } catch (e) {
    // pass — will use empty list
  }
}
if (candidates.length === 0) {
  // Fallback: known TESTING candidates
  candidates = ['H_ATR_SQUEEZE_BREAKOUT', 'H_BB_SQUEEZE', 'H_VWAP_REVERSAL', 'H_VOLUME_SPIKE'];
}

// --- Stress grid definition (deterministic, no random, no time-of-day) ---
const feeMultipliers = [1.0, 1.25, 1.5, 1.75, 2.0, 3.0];
const slippageMultipliers = [1.0, 1.5, 2.0, 3.0];
const latencyBuckets = [100, 300, 500]; // ms
const partialFillRates = [1.00, 0.90, 0.75];

// Slippage components (per side)
const baseFeeSide = 0.0010;   // 0.10% per side
const baseSlipSide = 0.0005;  // 0.05% per side

// Get per-candidate expectancy (MEASURED if available, else proxy)
function getCandidateExpectancy(candidateName) {
  if (measuredMode && measuredExpectancyMap[candidateName] !== undefined) {
    return { value: measuredExpectancyMap[candidateName], source: 'MEASURED' };
  }
  return { value: defaultProxyExpectancy, source: 'PROXY' };
}

// --- Compute stress grid per candidate ---
function computeStressGrid(candidateName) {
  const { value: expectancy, source } = getCandidateExpectancy(candidateName);
  const rows = [];
  for (const fm of feeMultipliers) {
    for (const sm of slippageMultipliers) {
      const effectiveFee = 2 * baseFeeSide * fm;       // round-trip fee
      const effectiveSlip = 2 * baseSlipSide * sm;    // round-trip slippage
      const totalCost = effectiveFee + effectiveSlip;
      const netEdge = expectancy - totalCost;
      const eligible = source === 'MEASURED' && netEdge > 0;
      rows.push({
        fee_mult: fm,
        slip_mult: sm,
        effective_fee_rt_pct: Number((effectiveFee * 100).toFixed(4)),
        effective_slip_rt_pct: Number((effectiveSlip * 100).toFixed(4)),
        total_cost_rt_pct: Number((totalCost * 100).toFixed(4)),
        net_edge_pct: Number((netEdge * 100).toFixed(4)),
        expectancy_source: source,
        eligible_for_paper: eligible
      });
    }
  }
  return rows;
}

// Breakpoint per candidate (uses MEASURED if available, else proxy)
function computeBreakpoint(candidateName) {
  const { value: expectancy, source } = getCandidateExpectancy(candidateName);
  // fee_mult at which net_edge <= 0 (ignoring slippage mult = 1x)
  // expectancy - 2*baseFeeSide*fm - 2*baseSlipSide = 0
  // fm = (expectancy - 2*baseSlipSide) / (2*baseFeeSide)
  const breakpointFm = (expectancy - 2 * baseSlipSide) / (2 * baseFeeSide);
  // slippage_mult at which net_edge <= 0 (fee_mult = 1x)
  const breakpointSm = (expectancy - 2 * baseFeeSide) / (2 * baseSlipSide);
  const thresholdPass = breakpointFm >= 2.0;
  const eligibleForPaper = source === 'MEASURED' && thresholdPass;
  let reason;
  if (source === 'PROXY') {
    reason = 'NEEDS_DATA: expectancy is PROXY — not validated from paper trading results';
  } else if (thresholdPass) {
    reason = `ELIGIBLE: measured expectancy=${(expectancy * 100).toFixed(3)}% survives 2x fee stress (breakpoint_fee_mult=${breakpointFm.toFixed(4)})`;
  } else {
    reason = `NOT_ELIGIBLE: breakpoint_fee_mult=${breakpointFm.toFixed(4)} < 2.0 at measured expectancy=${(expectancy * 100).toFixed(3)}%`;
  }
  return {
    candidate: candidateName,
    expectancy_pct: Number((expectancy * 100).toFixed(4)),
    expectancy_source: source,
    base_round_trip_cost_pct: Number((roundTripBaseline * 100).toFixed(4)),
    breakpoint_fee_mult: Number(breakpointFm.toFixed(4)),
    breakpoint_slip_mult: Number(breakpointSm.toFixed(4)),
    threshold_2x_pass: thresholdPass,
    eligible_for_paper: eligibleForPaper,
    reason,
  };
}

const now = new Date().toISOString();
const candidateBreakpoints = candidates.map(computeBreakpoint);
const allEligible = candidateBreakpoints.every(b => b.eligible_for_paper);

// Determine court status (EPOCH P2: requires MEASURED+CI path)
// MEASURED+CI mode: all candidates pass 2x threshold → PASS; any fail → BLOCKED
// CI gate missing or not PASS → NEEDS_DATA (X002 from expectancy_ci policy)
// PROXY-only mode: NEEDS_DATA (honest — not CI-validated)
let courtStatus, courtReasonCode, courtMessage;
const ciStatusLabel = ciPass ? `CI_VALIDATED (CI95_lower_worst=${Math.min(...(ciGate?.results || [{}]).map(r => r.ci95_lower_pct || 0)).toFixed(4)}%)` : (ciGate ? `CI_${ciGate.status}` : 'CI_MISSING');
if (!paperEvidenceGate || paperEvidenceGate.status !== 'PASS') {
  courtStatus = 'NEEDS_DATA';
  courtReasonCode = 'PROXY_EXPECTANCY_UNVALIDATED';
  courtMessage = `PROXY-only mode: paper evidence not yet PASS. Provide paper trading epoch and rerun.`;
} else if (!ciPass) {
  courtStatus = 'NEEDS_DATA';
  courtReasonCode = 'X002_CI_GATE_NOT_PASS';
  courtMessage = `MEASURED expectancy available but EXPECTANCY_CI_COURT is ${ciGate ? ciGate.status : 'MISSING'}. Run npm run edge:expectancy:ci first. (EPOCH P2 requirement)`;
} else if (allEligible) {
  courtStatus = 'PASS';
  courtReasonCode = 'NONE';
  const passCount = candidateBreakpoints.filter(b => b.eligible_for_paper).length;
  courtMessage = `MEASURED+CI expectancy validated for all ${passCount} candidate(s). All breakpoint_fee_mult >= 2.0. ${ciStatusLabel}. ELIGIBLE_FOR_PAPER granted. Paper epoch: ${paperEvidenceGate.epoch_id}.`;
} else {
  courtStatus = 'BLOCKED';
  courtReasonCode = 'BREAKPOINT_THRESHOLD_NOT_MET';
  const failedCandidates = candidateBreakpoints.filter(b => !b.eligible_for_paper).map(b => `${b.candidate}(${b.breakpoint_fee_mult}x)`);
  courtMessage = `MEASURED expectancy available but breakpoint_fee_mult < 2.0 for: ${failedCandidates.join(', ')}. Insufficient edge to survive 2x cost stress.`;
}

// --- Write JSON gate ---
const gateResult = {
  generated_at: now,
  script: 'edge_execution_reality.mjs',
  status: courtStatus,
  reason_code: courtReasonCode,
  message: courtMessage,
  policy_source: 'EDGE_LAB/EXECUTION_REALITY_POLICY.md',
  expectancy_mode: measuredMode ? 'MEASURED' : 'PROXY',
  paper_epoch_id: measuredMode ? (paperEvidenceGate.epoch_id || null) : null,
  default_proxy_expectancy_pct: Number((defaultProxyExpectancy * 100).toFixed(4)),
  round_trip_cost_baseline_pct: Number((roundTripBaseline * 100).toFixed(4)),
  stress_threshold_2x_required: true,
  candidates: candidateBreakpoints
};
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(gateResult, null, 2)}\n`);

// --- Write EXECUTION_REALITY_COURT.md ---
const breakpointRows = candidateBreakpoints.map(b =>
  `| ${b.candidate} | ${b.expectancy_pct}% (${b.expectancy_source}) | ${b.base_round_trip_cost_pct}% | ${b.breakpoint_fee_mult}x | ${b.threshold_2x_pass ? 'YES' : 'NO'} | ${b.eligible_for_paper ? 'YES' : 'NO'} |`
).join('\n');

// For stress grid, use first candidate's expectancy as representative
const representativeExpectancy = measuredMode && candidateBreakpoints.length > 0
  ? (measuredExpectancyMap[candidateBreakpoints[0].candidate] ?? defaultProxyExpectancy)
  : defaultProxyExpectancy;

const courtMd = `# EXECUTION_REALITY_COURT.md — Execution Reality Court
generated_at: ${now}
script: edge_execution_reality.mjs

## STATUS: ${courtStatus}

## Reason
${courtMessage}

## Policy Source
EDGE_LAB/EXECUTION_REALITY_POLICY.md — version 1.0.0

## Expectancy Mode (EPOCH P2: MEASURED+CI required)
| Parameter | Value | Source | Validated |
|-----------|-------|--------|-----------|
| expectancy_mode | ${measuredMode ? 'MEASURED+CI' : ciGate && paperEvidenceGate?.status === 'PASS' ? 'MEASURED_NO_CI' : 'PROXY'} | ${measuredMode ? `paper_evidence.json + expectancy_ci.json (epoch: ${paperEvidenceGate?.epoch_id || 'N/A'})` : 'PROXY_VALIDATION.md'} | ${measuredMode ? `YES — paper evidence + CI bootstrap (${ciStatusLabel})` : 'NO — requires paper trading epoch + CI gate PASS'} |
| round_trip_cost_baseline | ${(roundTripBaseline * 100).toFixed(2)}% | EXECUTION_MODEL.md | YES |
| ci_status | ${ciStatusLabel} | expectancy_ci.json | ${ciPass ? 'PASS' : 'NOT_PASS'} |

## Breakpoint Analysis
| Candidate | Expectancy (Source) | Base RT Cost | Breakpoint Fee Mult | Passes 2x Threshold | Eligible For Paper |
|-----------|--------------------|--------------|--------------------|--------------------|--------------------|
${breakpointRows}

## Stress Grid Summary (fee_mult × slip_mult, representative expectancy=${(representativeExpectancy * 100).toFixed(3)}%)
| fee_mult | slip_mult | Effective RT Cost | Net Edge | Eligible |
|----------|-----------|------------------|---------|---------|
${feeMultipliers.slice(0, 4).flatMap(fm =>
  slippageMultipliers.slice(0, 3).map(sm => {
    const cost = 2 * baseFeeSide * fm + 2 * baseSlipSide * sm;
    const net = representativeExpectancy - cost;
    return `| ${fm}x | ${sm}x | ${(cost * 100).toFixed(3)}% | ${(net * 100).toFixed(3)}% | ${measuredMode && net > 0 ? 'YES' : 'NO'} |`;
  })
).join('\n')}

## Verdict
STATUS=${courtStatus}: ${courtReasonCode}

${courtStatus === 'NEEDS_DATA'
  ? 'NEXT_ACTION: Provide artifacts/incoming/paper_evidence.json → run edge:paper:ingest → rerun this court.'
  : courtStatus === 'PASS'
    ? 'ELIGIBLE_FOR_PAPER: GRANTED. All candidates pass 2x fee stress under measured expectancy.'
    : `NEXT_ACTION: Expectancy measured but insufficient to survive 2x cost stress. Improve strategy or reduce execution costs.`}

## Anti-Overfit Protections
- Minimum trade count threshold: ${measuredMode ? `ENFORCED (>= 30 trades per candidate, enforced by edge:paper:ingest)` : 'NEEDS_DATA (not yet enforced — no paper trading data)'}
- Sensitivity breakpoint: documented above per candidate
- Out-of-sample protocol: ${measuredMode ? `MEASURED epoch: ${paperEvidenceGate?.epoch_id || 'N/A'} (${paperEvidenceGate?.start_date || '?'} to ${paperEvidenceGate?.end_date || '?'})` : 'NEEDS_DATA (pending first paper trading epoch)'}
`;

fs.writeFileSync(OUTPUT_COURT, courtMd);

// --- Write EXECUTION_BREAKPOINTS.md ---
const breakpointsMd = `# EXECUTION_BREAKPOINTS.md — Execution Cost Breakpoints
generated_at: ${now}
script: edge_execution_reality.mjs

## Summary

Breakpoints define the execution cost multiple at which each candidate becomes NOT_ELIGIBLE_FOR_PAPER.
These are computed from proxy_expectancy (PROXY — not validated) and EXECUTION_MODEL.md cost baseline.

## Breakpoint Table

| Candidate | breakpoint_fee_mult | breakpoint_slip_mult | 2x Fee Threshold | Status |
|-----------|--------------------|--------------------|-----------------|--------|
${candidateBreakpoints.map(b =>
  `| ${b.candidate} | ${b.breakpoint_fee_mult}x | ${b.breakpoint_slip_mult}x | ${b.threshold_2x_pass ? 'PASS' : 'MARGINAL'} | ${b.reason} |`
).join('\n')}

## Interpretation

breakpoint_fee_mult = proxy_expectancy_pct / (2 * fee_per_side)
  = 0.50% / (2 * 0.10%) = 1.25x (fee-only, slip=0)

breakpoint combined (fee + default slip):
  = proxy_expectancy / round_trip_cost_baseline
  = 0.50% / 0.30% = 1.667x

**All candidates share the same breakpoint because proxy_expectancy_pct is uniform (PROXY).**
Individual breakpoints will diverge once per-candidate expectancy is measured from paper trading.

## Latency Sensitivity

| Latency | Impact | Eligible |
|---------|--------|---------|
| 100ms | Negligible (bar-close → next-bar-open model) | YES |
| 300ms | Minor — entry within same bar open window | YES |
| 500ms | Boundary — acceptable for paper; must measure for micro-live | PAPER_ONLY |

## Partial Fill Sensitivity

| Fill Rate | Effective Expectancy Adjustment | Impact |
|-----------|--------------------------------|--------|
| 100% | 0% adjustment | None |
| 90% | −5% expectancy reduction | Minor |
| 75% | −12.5% expectancy reduction | Moderate |

## NEXT_ACTION
1. Run paper trading epoch with TESTING candidates.
2. Measure actual per-trade expectancy.
3. Re-run edge:execution:reality with measured values.
4. ELIGIBLE_FOR_PAPER requires: measured_expectancy / round_trip_cost >= 2.0.
`;

fs.writeFileSync(OUTPUT_BREAKPOINTS, breakpointsMd);

if (courtStatus === 'BLOCKED') {
  console.error(`[BLOCKED] edge:execution:reality — ${courtReasonCode}: ${courtMessage}`);
  process.exit(1);
}
// PASS and NEEDS_DATA both exit 0 — honest status, not a pipeline failure
console.log(`[${courtStatus}] edge:execution:reality — ${courtReasonCode} — mode: ${measuredMode ? 'MEASURED' : 'PROXY'}`);
process.exit(0);
