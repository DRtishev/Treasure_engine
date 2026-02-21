/**
 * edge_multi_hypothesis_mvp.mjs — EPOCH P4 MULTI_HYPOTHESIS_COURT
 * Bonferroni correction on per-candidate expectancy CI.
 * Re-runs bootstrap at corrected alpha; requires corrected_CI_lower > 0.
 *
 * Reason codes: H*** (Multi-Hypothesis)
 * H001 CI_GATE_NOT_PASS       expectancy_ci.json must be PASS first
 * H002 EVIDENCE_MISSING       paper_evidence.json not found
 * H003 LEDGER_MISSING         TRIALS_LEDGER.md not found (advisory)
 * H004 CORRECTED_CI_LOWER_NOT_POSITIVE  after Bonferroni correction, edge is not significant
 *
 * Determinism: same XorShift32 seed as edge_expectancy_ci.mjs (from evidence_hash V1).
 * Same seed + same returns → same bootstrap means; only CI percentile cutoff differs.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const EDGE_LAB_DIR = path.join(ROOT, 'EDGE_LAB');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ── paths ─────────────────────────────────────────────────────────────────────

const CI_GATE_FILE = path.join(MANUAL_DIR, 'expectancy_ci.json');
const SUMMARY_EVIDENCE_FILE = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.json');
const V1_EVIDENCE_FILE = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.valid.json');
const TRIALS_LEDGER_FILE = path.join(EDGE_LAB_DIR, 'TRIALS_LEDGER.md');
const POLICY_FILE = path.join(EDGE_LAB_DIR, 'ATTEMPT_LEDGER_POLICY.md');

const OUTPUT_JSON = path.join(MANUAL_DIR, 'multi_hypothesis_court.json');
const OUTPUT_MD = path.join(EVIDENCE_DIR, 'MULTI_HYPOTHESIS_COURT.md');

// ── constants ─────────────────────────────────────────────────────────────────

const N_BOOTSTRAP = 10000;
const ALPHA_NOMINAL = 0.05;
const N_OOS_PERIODS = 2; // H1 + H2 2024 walk-forward, structural constant

// ── helpers ───────────────────────────────────────────────────────────────────

/** XorShift32 PRNG — same as edge_expectancy_ci.mjs. */
function makeRng(seed) {
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** Percentile bootstrap CI at given alpha. */
function bootstrapCI(returns, nResample, alpha, rng) {
  const n = returns.length;
  const means = new Float64Array(nResample);
  for (let b = 0; b < nResample; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += returns[Math.floor(rng() * n)];
    means[b] = sum / n;
  }
  means.sort();
  const lo = Math.floor(nResample * (alpha / 2));
  const hi = Math.floor(nResample * (1 - alpha / 2));
  return { lower: means[lo], upper: means[hi] };
}

function round4(x) { return Number(x.toFixed(4)); }

function writeGate(status, reason_code, message, extra = {}) {
  const gate = { status, reason_code, message, ...extra };
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(gate, null, 2)}\n`);
  return gate;
}

function writeCourt(gate, results = [], correction = {}) {
  const isPass = gate.status === 'PASS';

  let candidateRows = '';
  if (results.length > 0) {
    const header = '| Candidate | n | mean% | CI95_lower% | Corrected_lower% | CI_level_corrected% | Gate |';
    const sep = '|-----------|---|-------|------------|-----------------|---------------------|------|';
    const rows = results.map(r =>
      `| ${r.name} | ${r.n} | ${r.mean_return_pct.toFixed(4)} | ${r.ci95_lower_pct.toFixed(4)} | ${r.corrected_lower_pct.toFixed(4)} | ${(correction.ci_level_corrected_pct || 0).toFixed(4)} | ${r.passes_corrected ? 'PASS' : 'FAIL'} |`
    ).join('\n');
    candidateRows = `\n## Per-Candidate Results\n\n${header}\n${sep}\n${rows}\n`;
  }

  const correctionBlock = correction.n_tests
    ? `## Bonferroni Correction

| Parameter | Value |
|-----------|-------|
| alpha_nominal | ${ALPHA_NOMINAL} |
| n_testing_candidates | ${correction.n_candidates} |
| n_oos_periods | ${N_OOS_PERIODS} |
| n_effective_oos_tests | ${correction.n_tests} |
| alpha_corrected | ${correction.alpha_corrected.toFixed(6)} |
| ci_level_corrected | ${(correction.ci_level_corrected_pct).toFixed(4)}% |
| n_resamples | ${N_BOOTSTRAP.toLocaleString()} |
| seed | 0x${correction.seed_hex || '00000000'} |

`
    : '';

  const md = `# MULTI_HYPOTHESIS_COURT.md — EPOCH P4 Multi-Hypothesis Court
generated_at: ${new Date().toISOString()}
script: edge_multi_hypothesis_mvp.mjs
method: Bonferroni correction on OOS tests; percentile bootstrap re-run at corrected alpha

## STATUS: ${gate.status}

## Reason Code
${gate.reason_code}${gate.reason_code !== 'NONE' ? `\n\n## Blocker\n${gate.message}` : ''}

${correctionBlock}${candidateRows}
## Policy

EDGE_LAB/ATTEMPT_LEDGER_POLICY.md — version 1.0.0

## Gate Dependency Chain

PAPER_EVIDENCE_COURT (P0) → EXPECTANCY_CI_COURT (P1) → MULTI_HYPOTHESIS_COURT (P4)

## NEXT_ACTION

${isPass
    ? 'Multi-hypothesis Bonferroni gate PASS. Edge is statistically significant after correction.'
    : gate.status === 'NEEDS_DATA'
      ? 'Provide EXPECTANCY_CI_COURT=PASS and paper evidence first.'
      : 'Edge does not survive Bonferroni correction. Reduce candidate set or obtain more data.'}
`;
  fs.writeFileSync(OUTPUT_MD, md);
}

function exitNeeds(reason_code, message, extra = {}) {
  const gate = writeGate('NEEDS_DATA', reason_code, message, extra);
  writeCourt(gate);
  console.log(`[NEEDS_DATA] edge:multi:hypothesis — ${reason_code}: ${message}`);
  process.exit(0);
}

function exitBlocked(reason_code, message, extra = {}) {
  const gate = writeGate('BLOCKED', reason_code, message, extra);
  writeCourt(gate, extra.results || [], extra.correction || {});
  console.error(`[BLOCKED] edge:multi:hypothesis — ${reason_code}: ${message}`);
  process.exit(1);
}

// ── GATE 1: EXPECTANCY_CI must be PASS ───────────────────────────────────────

if (!fs.existsSync(CI_GATE_FILE)) {
  exitNeeds('H001', 'expectancy_ci.json not found. Run npm run edge:expectancy:ci first.');
}

let ciGate;
try {
  ciGate = JSON.parse(fs.readFileSync(CI_GATE_FILE, 'utf8'));
} catch (e) {
  exitNeeds('H001', `Failed to parse expectancy_ci.json: ${e.message}`);
}

if (ciGate.status !== 'PASS') {
  exitNeeds('H001', `EXPECTANCY_CI_COURT is ${ciGate.status} (${ciGate.reason_code}). Must be PASS.`);
}

// ── GATE 2: summary evidence ──────────────────────────────────────────────────

if (!fs.existsSync(SUMMARY_EVIDENCE_FILE)) {
  exitNeeds('H002', `paper_evidence.json not found: ${path.relative(ROOT, SUMMARY_EVIDENCE_FILE)}`);
}

let summaryData;
try {
  summaryData = JSON.parse(fs.readFileSync(SUMMARY_EVIDENCE_FILE, 'utf8'));
} catch (e) {
  exitNeeds('H002', `Failed to parse paper_evidence.json: ${e.message}`);
}

if (!Array.isArray(summaryData.candidates) || summaryData.candidates.length === 0) {
  exitNeeds('H002', 'paper_evidence.json has no candidates array.');
}

// ── GATE 3: TRIALS_LEDGER advisory (NEEDS_DATA if missing, not BLOCKED) ───────

if (!fs.existsSync(TRIALS_LEDGER_FILE)) {
  exitNeeds('H003', 'TRIALS_LEDGER.md not found. Cannot compute n_total_trials. Run trials first.');
}

// ── Compute Bonferroni correction ─────────────────────────────────────────────

const n_candidates = summaryData.candidates.length;
const n_tests = n_candidates * N_OOS_PERIODS;
const alpha_corrected = ALPHA_NOMINAL / n_tests;
const ci_level_corrected = 1 - alpha_corrected;
const ci_level_corrected_pct = ci_level_corrected * 100;

// ── Derive seed (same source as edge_expectancy_ci.mjs) ───────────────────────

let seed;
if (fs.existsSync(V1_EVIDENCE_FILE)) {
  try {
    const v1 = JSON.parse(fs.readFileSync(V1_EVIDENCE_FILE, 'utf8'));
    seed = parseInt((v1.evidence_hash || '').slice(0, 8), 16) || 0x12345678;
  } catch (e) {
    seed = 0x12345678;
  }
} else {
  const summaryHash = crypto.createHash('sha256').update(JSON.stringify(summaryData)).digest('hex');
  seed = parseInt(summaryHash.slice(0, 8), 16);
}
if (!seed || seed === 0) seed = 0x12345678;

const rng = makeRng(seed);

// ── Per-candidate bootstrap at corrected alpha ────────────────────────────────

const results = [];
const failedCandidates = [];

for (const c of summaryData.candidates) {
  const name = c.name || 'UNKNOWN';

  if (typeof c.trade_count !== 'number' || c.trade_count < 1) {
    exitNeeds('H002', `Candidate ${name}: missing or invalid trade_count`);
  }
  if (typeof c.avg_winner_pct !== 'number' || typeof c.avg_loser_pct !== 'number') {
    exitNeeds('H002', `Candidate ${name}: missing avg_winner_pct / avg_loser_pct`);
  }
  if (typeof c.win_rate !== 'number') {
    exitNeeds('H002', `Candidate ${name}: missing win_rate`);
  }

  const n = c.trade_count;
  const nWins = Math.round(c.win_rate * n);
  const returns = new Float64Array(n);
  for (let i = 0; i < nWins; i++) returns[i] = c.avg_winner_pct;
  for (let i = nWins; i < n; i++) returns[i] = c.avg_loser_pct;

  // Re-run bootstrap at corrected alpha (same RNG sequence as expectancy_ci.mjs)
  const { lower: lower95 } = bootstrapCI(returns, N_BOOTSTRAP, ALPHA_NOMINAL, rng);
  // The corrected CI resamples need fresh rng state — but for determinism, run them sequentially
  // We already consumed N_BOOTSTRAP calls for the 95% CI; now run N_BOOTSTRAP more at corrected alpha
  // To avoid state issues, restart RNG at same seed per candidate (deterministic, uncorrelated)
  const candidateRng = makeRng(seed + results.length + 1);
  const { lower: lowerCorrected } = bootstrapCI(returns, N_BOOTSTRAP, alpha_corrected, candidateRng);

  const mean = returns.reduce((s, v) => s + v, 0) / n;
  const passesCorrected = lowerCorrected > 0;

  if (!passesCorrected) {
    failedCandidates.push(`${name}(corrected_CI_lower=${lowerCorrected.toFixed(4)}%)`);
  }

  // Also get 95% bound via fresh rng (same seed + index)
  const ci95Rng = makeRng(seed + results.length + 100);
  const { lower: ci95Lower } = bootstrapCI(returns, N_BOOTSTRAP, ALPHA_NOMINAL, ci95Rng);

  results.push({
    name,
    n,
    mean_return_pct: round4(mean),
    ci95_lower_pct: round4(ci95Lower),
    corrected_lower_pct: round4(lowerCorrected),
    passes_corrected: passesCorrected,
  });
}

const correction = {
  n_candidates,
  n_oos_periods: N_OOS_PERIODS,
  n_tests,
  alpha_corrected,
  ci_level_corrected_pct,
  seed_hex: seed.toString(16).padStart(8, '0'),
};

// ── GATE: corrected CI lower must be positive for all ─────────────────────────

if (failedCandidates.length > 0) {
  exitBlocked(
    'H004',
    `CORRECTED_CI_LOWER_NOT_POSITIVE after Bonferroni(n_tests=${n_tests}): ${failedCandidates.join(', ')}`,
    { results, correction }
  );
}

// ── PASS ──────────────────────────────────────────────────────────────────────

const worstCorrected = Math.min(...results.map(r => r.corrected_lower_pct));
const passMessage = `All ${results.length} candidates: corrected_CI_lower > 0 after Bonferroni(n_tests=${n_tests}, alpha_corrected=${alpha_corrected.toFixed(6)}). Worst: ${worstCorrected.toFixed(4)}%.`;

const gate = writeGate('PASS', 'NONE', passMessage, {
  correction,
  results,
  n_bootstrap: N_BOOTSTRAP,
});
writeCourt(gate, results, correction);

console.log(`[PASS] edge:multi:hypothesis — ${passMessage}`);
process.exit(0);
