/**
 * edge_expectancy_ci.mjs — EPOCH P1 EXPECTANCY_CI_COURT
 * Fail-closed bootstrap CI on per-trade expectancy.
 * Requires CI95_lower > 0 for PASS (per candidate).
 *
 * Reason codes: X*** (Execution Reality / CI)
 * X001 PAPER_EVIDENCE_GATE_MISSING   gates/manual/paper_evidence_court.json not found
 * X002 PAPER_EVIDENCE_NOT_VALIDATED  paper_evidence_court status != PASS
 * X003 INSUFFICIENT_SAMPLES          any candidate has trade_count < 30
 * X004 CI_LOWER_NOT_POSITIVE         CI95_lower <= 0 for any candidate
 * X005 RETURN_DATA_MISSING           cannot reconstruct per-trade returns
 *
 * Determinism: XorShift32 seed from content hash (evidence_hash of V1 paper evidence).
 * Same input → same output byte-for-byte.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');

const PAPER_EVIDENCE_COURT_GATE = path.join(MANUAL_DIR, 'paper_evidence_court.json');
const SUMMARY_EVIDENCE_FILE = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.json');
const V1_EVIDENCE_FILE = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.valid.json');

const POLICY_FILE = path.join(ROOT, 'EDGE_LAB', 'EXPECTANCY_CI_POLICY.md');

const MIN_SAMPLES = 30;
const N_BOOTSTRAP = 10000;
const CI_LEVEL = 0.95;
const CI_ALPHA = 1 - CI_LEVEL; // 0.05
const OUTPUT_JSON = path.join(MANUAL_DIR, 'expectancy_ci.json');
const OUTPUT_MD = path.join(EVIDENCE_DIR, 'EXPECTANCY_CI.md');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ── helpers ───────────────────────────────────────────────────────────────────

/** XorShift32 PRNG — deterministic, reproducible in any language. */
function makeRng(seed) {
  let x = (seed >>> 0) || 1; // never zero
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** Bootstrap percentile CI. Returns { lower, upper, means_sorted }. */
function bootstrapCI(returns, nResample, alpha, rng) {
  const n = returns.length;
  const means = new Float64Array(nResample);
  for (let b = 0; b < nResample; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += returns[Math.floor(rng() * n)];
    }
    means[b] = sum / n;
  }
  means.sort();
  const lo = Math.floor(nResample * (alpha / 2));
  const hi = Math.floor(nResample * (1 - alpha / 2));
  return {
    lower: means[lo],
    upper: means[hi],
  };
}

function round4(x) { return Number(x.toFixed(4)); }

function writeGate(status, reason_code, message, extra = {}) {
  const gate = { status, reason_code, message, ...extra };
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(gate, null, 2)}\n`);
  return gate;
}

function writeCourt(gate, results = []) {
  const isPass = gate.status === 'PASS';

  let candidateRows = '';
  if (results.length > 0) {
    const header = '| Candidate | n | mean% | CI95_lower% | CI95_upper% | CI_width% | Adequacy | Gate |';
    const sep = '|-----------|---|-------|------------|------------|----------|---------|------|';
    const rows = results.map(r =>
      `| ${r.name} | ${r.n} | ${r.mean_return_pct.toFixed(4)} | ${r.ci95_lower_pct.toFixed(4)} | ${r.ci95_upper_pct.toFixed(4)} | ${r.ci_width_pct.toFixed(4)} | ${r.sample_adequacy} | ${r.passes_ci_gate ? 'PASS' : 'FAIL'} |`
    ).join('\n');
    candidateRows = `\n## Per-Candidate Bootstrap CI (${N_BOOTSTRAP.toLocaleString()} resamples, 95%)\n\n${header}\n${sep}\n${rows}\n`;
  }

  const md = `# EXPECTANCY_CI.md — EPOCH P1 Expectancy Bootstrap CI Court
generated_at: ${new Date().toISOString()}
script: edge_expectancy_ci.mjs
method: percentile bootstrap, XorShift32 seed from content hash
n_resamples: ${N_BOOTSTRAP}
confidence_level: ${(CI_LEVEL * 100).toFixed(0)}%

## STATUS: ${gate.status}

## Reason Code
${gate.reason_code}${gate.reason_code !== 'NONE' ? `\n\n## Blocker\n${gate.message}` : ''}
${candidateRows}
## Policy

| Parameter | Value |
|-----------|-------|
| min_samples | ${MIN_SAMPLES} |
| prefer_samples | 100+ |
| n_resamples | ${N_BOOTSTRAP.toLocaleString()} |
| ci_level | ${(CI_LEVEL * 100).toFixed(0)}% |
| gate_rule | CI95_lower > 0 (all candidates) |
| seed_source | evidence_hash[0:8] hex → uint32 (XorShift32) |
| prng | XorShift32 |

## Gate Dependency Chain

PAPER_EVIDENCE_COURT (P0) → EXPECTANCY_CI_COURT (P1) → EXECUTION_REALITY_COURT (P2)

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/EXPECTANCY_CI.md
- reports/evidence/EDGE_LAB/gates/manual/expectancy_ci.json

NEXT_ACTION: ${isPass
  ? 'Proceed to EPOCH P2 (EXECUTION_REALITY_CALIBRATION) — use CI-validated expectancy.'
  : gate.status === 'NEEDS_DATA'
    ? 'Provide sufficient paper evidence (n >= 30 per candidate) and rerun.'
    : 'CI95_lower <= 0: strategy has no statistically significant edge. Review hypothesis.'}

## Spec

EDGE_LAB/EXPECTANCY_CI_POLICY.md — version 1.0.0
`;
  fs.writeFileSync(OUTPUT_MD, md);
}

function exitNeeds(reason_code, message, extra = {}) {
  const gate = writeGate('NEEDS_DATA', reason_code, message, extra);
  writeCourt(gate);
  console.log(`[NEEDS_DATA] edge:expectancy:ci — ${reason_code}: ${message}`);
  process.exit(0);
}

function exitBlocked(reason_code, message, extra = {}) {
  const gate = writeGate('BLOCKED', reason_code, message, extra);
  writeCourt(gate, extra.results || []);
  console.error(`[BLOCKED] edge:expectancy:ci — ${reason_code}: ${message}`);
  process.exit(1);
}

function exitPass(message, results, seed) {
  const gate = writeGate('PASS', 'NONE', message, {
    seed_hex: seed.toString(16).padStart(8, '0'),
    n_bootstrap: N_BOOTSTRAP,
    ci_level_pct: CI_LEVEL * 100,
    results,
  });
  writeCourt(gate, results);
  console.log(`[PASS] edge:expectancy:ci — ${message}`);
  process.exit(0);
}

// ── GATE 1: paper_evidence_court.json must exist ──────────────────────────────
if (!fs.existsSync(PAPER_EVIDENCE_COURT_GATE)) {
  exitNeeds('X001', 'paper_evidence_court.json not found. Run npm run edge:paper:evidence first.');
}

// ── GATE 2: paper_evidence_court must be PASS ─────────────────────────────────
let courtGate;
try {
  courtGate = JSON.parse(fs.readFileSync(PAPER_EVIDENCE_COURT_GATE, 'utf8'));
} catch (e) {
  exitNeeds('X001', `Failed to parse paper_evidence_court.json: ${e.message}`);
}
if (courtGate.status !== 'PASS') {
  exitNeeds('X002', `PAPER_EVIDENCE_COURT is ${courtGate.status} (${courtGate.reason_code}). Must be PASS before CI can be computed.`);
}

// ── Load summary evidence (for per-candidate statistics) ─────────────────────
if (!fs.existsSync(SUMMARY_EVIDENCE_FILE)) {
  exitNeeds('X005', `Summary evidence not found: ${path.relative(ROOT, SUMMARY_EVIDENCE_FILE)}. Run paper epoch first.`);
}

let summaryData;
try {
  summaryData = JSON.parse(fs.readFileSync(SUMMARY_EVIDENCE_FILE, 'utf8'));
} catch (e) {
  exitNeeds('X005', `Failed to parse summary evidence: ${e.message}`);
}

if (!Array.isArray(summaryData.candidates) || summaryData.candidates.length === 0) {
  exitNeeds('X005', 'Summary evidence has no candidates array.');
}

// ── Derive seed from V1 evidence_hash (deterministic, content-tied) ───────────
let seed;
if (fs.existsSync(V1_EVIDENCE_FILE)) {
  try {
    const v1 = JSON.parse(fs.readFileSync(V1_EVIDENCE_FILE, 'utf8'));
    seed = parseInt((v1.evidence_hash || '').slice(0, 8), 16) || 0x12345678;
  } catch (e) {
    seed = 0x12345678;
  }
} else {
  // Fallback: hash the summary data content
  const summaryHash = crypto.createHash('sha256').update(JSON.stringify(summaryData)).digest('hex');
  seed = parseInt(summaryHash.slice(0, 8), 16);
}
if (!seed || seed === 0) seed = 0x12345678;

const rng = makeRng(seed);

// ── Per-candidate CI computation ──────────────────────────────────────────────
const results = [];
const needsDataCandidates = [];
const failedCandidates = [];

for (const c of summaryData.candidates) {
  const name = c.name || 'UNKNOWN';

  // Validate required fields
  if (typeof c.trade_count !== 'number' || c.trade_count < 1) {
    exitNeeds('X005', `Candidate ${name}: missing or invalid trade_count`);
  }
  if (typeof c.avg_winner_pct !== 'number' || typeof c.avg_loser_pct !== 'number') {
    exitNeeds('X005', `Candidate ${name}: missing avg_winner_pct / avg_loser_pct — upgrade paper_evidence.json format`);
  }
  if (typeof c.win_rate !== 'number') {
    exitNeeds('X005', `Candidate ${name}: missing win_rate`);
  }

  const n = c.trade_count;

  // ── GATE: n >= MIN_SAMPLES per candidate ─────────────────────────────────
  if (n < MIN_SAMPLES) {
    needsDataCandidates.push(`${name}(n=${n})`);
    continue;
  }

  // ── Reconstruct per-trade return vector ──────────────────────────────────
  const nWins = Math.round(c.win_rate * n);
  const nLosses = n - nWins;
  const returns = new Float64Array(n);
  for (let i = 0; i < nWins; i++) returns[i] = c.avg_winner_pct;
  for (let i = nWins; i < n; i++) returns[i] = c.avg_loser_pct;

  // ── Bootstrap CI (uses shared RNG — order matters for determinism) ────────
  const { lower, upper } = bootstrapCI(returns, N_BOOTSTRAP, CI_ALPHA, rng);
  const mean = returns.reduce((s, v) => s + v, 0) / n;

  const adequacy = n >= 100 ? 'PREFERRED' : n >= MIN_SAMPLES ? 'CAUTION' : 'NEEDS_DATA';
  const passesGate = lower > 0;

  if (!passesGate) {
    failedCandidates.push(`${name}(CI95_lower=${lower.toFixed(4)}%)`);
  }

  results.push({
    name,
    n,
    mean_return_pct: round4(mean),
    ci95_lower_pct: round4(lower),
    ci95_upper_pct: round4(upper),
    ci_width_pct: round4(upper - lower),
    passes_ci_gate: passesGate,
    sample_adequacy: adequacy,
  });
}

// ── GATE: insufficient samples ────────────────────────────────────────────────
if (needsDataCandidates.length > 0) {
  exitNeeds('X003', `INSUFFICIENT_SAMPLES: candidates with n < ${MIN_SAMPLES}: ${needsDataCandidates.join(', ')}. Need ${MIN_SAMPLES}+ trades per candidate.`);
}

// ── GATE: CI lower must be positive ──────────────────────────────────────────
if (failedCandidates.length > 0) {
  exitBlocked('X004', `CI_LOWER_NOT_POSITIVE: ${failedCandidates.join(', ')} — no statistically significant positive expectancy.`, { results });
}

// ── PASS ──────────────────────────────────────────────────────────────────────
const totalTrades = results.reduce((s, r) => s + r.n, 0);
const worstLower = Math.min(...results.map(r => r.ci95_lower_pct));
exitPass(
  `All ${results.length} candidates: CI95_lower > 0. Worst: ${worstLower.toFixed(4)}%. n_total=${totalTrades}. Seed=0x${seed.toString(16).padStart(8, '0')}.`,
  results,
  seed,
);
