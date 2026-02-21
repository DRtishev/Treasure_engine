/**
 * edge_portfolio_court.mjs — EPOCH P5 PORTFOLIO_COURT
 * Validates portfolio-level diversification, Kelly fractions, and Sharpe.
 *
 * Reason codes: V*** (Portfolio)
 * V001 EVIDENCE_GATE_NOT_PASS  expectancy_ci.json must be PASS first
 * V002 CORRELATION_TOO_HIGH    max_pairwise_corr >= 0.70
 * V003 KELLY_FRACTION_NOT_POSITIVE  any candidate has Kelly <= 0
 * V004 PORTFOLIO_SHARPE_BELOW_MIN   portfolio_sharpe < 1.0
 *
 * Determinism: XorShift32 with candidate-specific seeds (evidence_hash_slice + candidate_index)
 * for pairwise correlation simulation.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const EDGE_LAB_DIR = path.join(ROOT, 'EDGE_LAB');

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ── paths ─────────────────────────────────────────────────────────────────────

const CI_GATE_FILE = path.join(MANUAL_DIR, 'expectancy_ci.json');
const SUMMARY_FILE = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.json');
const V1_EVIDENCE_FILE = path.join(ROOT, 'artifacts', 'incoming', 'paper_evidence.valid.json');
const REGIME_MATRIX_FILE = path.join(EDGE_LAB_DIR, 'REGIME_MATRIX.md');

const OUTPUT_JSON = path.join(MANUAL_DIR, 'portfolio_court.json');
const OUTPUT_MD = path.join(EVIDENCE_DIR, 'PORTFOLIO_COURT.md');

// ── constants ─────────────────────────────────────────────────────────────────

const MAX_CORRELATION_THRESHOLD = 0.70;
const MIN_PORTFOLIO_SHARPE = 1.0;
const N_CORR_SIMS = 1000;   // trades to simulate per pair
const HALF_KELLY_DIVISOR = 2.0;
const MIN_OPTIMAL_REGIMES = 2;

// ── helpers ───────────────────────────────────────────────────────────────────

/** XorShift32 PRNG */
function makeRng(seed) {
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function round4(x) { return Number(x.toFixed(4)); }
function round6(x) { return Number(x.toFixed(6)); }

/** Full Kelly fraction for a binary-outcome strategy. */
function kellyFraction(winRate, avgWinner, avgLoser) {
  const lossRate = 1 - winRate;
  const b = Math.abs(avgWinner) / Math.abs(avgLoser); // payout ratio
  if (b <= 0 || !isFinite(b)) return 0;
  return (winRate * b - lossRate) / b;
}

/**
 * Simulate pairwise Pearson correlation between two return streams.
 * Returns r in [-1, 1]. Uses a factor model with shared market factor.
 * idiosyncratic_volatility = 1 - |rho_factor|
 */
function simulatePairCorrelation(c1, c2, baseCorr, rng) {
  const n = N_CORR_SIMS;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;

  for (let i = 0; i < n; i++) {
    const market = rng() - 0.5;  // shared factor

    const w1 = rng() < c1.win_rate;
    const r1raw = w1 ? c1.avg_winner_pct : c1.avg_loser_pct;
    const r1 = r1raw + baseCorr * market * Math.abs(r1raw);

    const w2 = rng() < c2.win_rate;
    const r2raw = w2 ? c2.avg_winner_pct : c2.avg_loser_pct;
    const r2 = r2raw + baseCorr * market * Math.abs(r2raw);

    sx += r1; sy += r2;
    sxx += r1 * r1; syy += r2 * r2; sxy += r1 * r2;
  }
  const meanX = sx / n, meanY = sy / n;
  const varX = sxx / n - meanX * meanX;
  const varY = syy / n - meanY * meanY;
  const cov = sxy / n - meanX * meanY;
  const denom = Math.sqrt(varX * varY);
  return denom < 1e-10 ? 0 : cov / denom;
}

function writeGate(status, reason_code, message, extra = {}) {
  const gate = { status, reason_code, message, ...extra };
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(gate, null, 2)}\n`);
  return gate;
}

function exitNeeds(reason_code, message) {
  const gate = writeGate('NEEDS_DATA', reason_code, message);
  fs.writeFileSync(OUTPUT_MD, `# PORTFOLIO_COURT.md\n\nSTATUS: NEEDS_DATA\nREASON_CODE: ${reason_code}\nMESSAGE: ${message}\n`);
  console.log(`[NEEDS_DATA] edge:portfolio — ${reason_code}: ${message}`);
  process.exit(0);
}

function exitBlocked(reason_code, message, extra = {}) {
  const gate = writeGate('BLOCKED', reason_code, message, extra);
  writeCourtMd(gate, extra);
  console.error(`[BLOCKED] edge:portfolio — ${reason_code}: ${message}`);
  process.exit(1);
}

function writeCourtMd(gate, extras = {}) {
  const { kellyResults = [], corrMatrix = [], portfolioMetrics = {} } = extras;

  const kellyTable = kellyResults.length
    ? `## Per-Candidate Kelly Analysis

| Candidate | n | win_rate | avg_winner% | avg_loser% | b (payout) | full_kelly | half_kelly | Gate |
|-----------|---|---------|------------|-----------|------------|-----------|-----------|------|
${kellyResults.map(r =>
  `| ${r.name} | ${r.n} | ${r.win_rate} | ${r.avg_winner_pct} | ${r.avg_loser_pct} | ${r.payout_ratio.toFixed(3)} | ${r.full_kelly.toFixed(4)} | ${r.half_kelly.toFixed(4)} | ${r.passes ? 'PASS' : 'FAIL'} |`
).join('\n')}

`
    : '';

  const corrBlock = corrMatrix.length
    ? `## Pairwise Correlation Matrix (Seeded Simulation, n=${N_CORR_SIMS} trades/pair)

| Pair | Simulated Corr | Gate |
|------|---------------|------|
${corrMatrix.map(r =>
  `| ${r.pair} | ${r.corr.toFixed(4)} | ${r.passes ? 'PASS' : `FAIL (>=${MAX_CORRELATION_THRESHOLD})`} |`
).join('\n')}

Max pairwise correlation: **${portfolioMetrics.max_pairwise_correlation?.toFixed(4) ?? 'N/A'}** (threshold < ${MAX_CORRELATION_THRESHOLD})

`
    : '';

  const portfolioBlock = portfolioMetrics.portfolio_sharpe !== undefined
    ? `## Portfolio Metrics

| Metric | Value | Gate |
|--------|-------|------|
| Portfolio Sharpe (equal-weight half-Kelly) | ${portfolioMetrics.portfolio_sharpe?.toFixed(4)} | ${portfolioMetrics.portfolio_sharpe >= MIN_PORTFOLIO_SHARPE ? 'PASS' : `FAIL (<${MIN_PORTFOLIO_SHARPE})`} |
| Portfolio expected return | ${portfolioMetrics.portfolio_expected_return_pct?.toFixed(4)}% | — |
| Diversification ratio | ${portfolioMetrics.diversification_ratio?.toFixed(4)} | — |
| Max per-candidate half-Kelly | ${portfolioMetrics.max_half_kelly?.toFixed(4)} | — |
| Min per-candidate half-Kelly | ${portfolioMetrics.min_half_kelly?.toFixed(4)} | — |
| Optimal regimes covered | ${portfolioMetrics.optimal_regimes_count} / 4 | ${portfolioMetrics.optimal_regimes_count >= MIN_OPTIMAL_REGIMES ? 'PASS' : 'WARN'} |

`
    : '';

  const md = `# PORTFOLIO_COURT.md — EPOCH P5 Portfolio Court
generated_at: ${new Date().toISOString()}
script: edge_portfolio_court.mjs

## STATUS: ${gate.status}

## Reason Code
${gate.reason_code}${gate.reason_code !== 'NONE' ? `\n\n## Blocker\n${gate.message}` : ''}

${kellyTable}${corrBlock}${portfolioBlock}## Policy

EDGE_LAB/PORTFOLIO_POLICY.md — version 1.0.0
EDGE_LAB/REGIME_MATRIX.md — version 1.0.0

## Gate Dependency Chain

PAPER_EVIDENCE_COURT (P0) → EXPECTANCY_CI_COURT (P1) → PORTFOLIO_COURT (P5)

## NEXT_ACTION

${gate.status === 'PASS'
    ? 'Portfolio diversification PASS. Proceed with equal-weight half-Kelly sizing in micro-live.'
    : gate.status === 'NEEDS_DATA'
      ? 'Provide EXPECTANCY_CI_COURT=PASS and paper evidence first.'
      : 'Portfolio gate failed. Review correlation structure or candidate expectancy.'}
`;
  fs.writeFileSync(OUTPUT_MD, md);
}

// ── GATE 1: dependency ────────────────────────────────────────────────────────

if (!fs.existsSync(CI_GATE_FILE)) {
  exitNeeds('V001', 'expectancy_ci.json not found. Run npm run edge:expectancy:ci first.');
}

let ciGate;
try {
  ciGate = JSON.parse(fs.readFileSync(CI_GATE_FILE, 'utf8'));
} catch (e) {
  exitNeeds('V001', `Failed to parse expectancy_ci.json: ${e.message}`);
}

if (ciGate.status !== 'PASS') {
  exitNeeds('V001', `EXPECTANCY_CI_COURT is ${ciGate.status}. Must be PASS.`);
}

if (!fs.existsSync(SUMMARY_FILE)) {
  exitNeeds('V001', `paper_evidence.json not found: ${path.relative(ROOT, SUMMARY_FILE)}`);
}

let summary;
try {
  summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
} catch (e) {
  exitNeeds('V001', `Failed to parse paper_evidence.json: ${e.message}`);
}

if (!Array.isArray(summary.candidates) || summary.candidates.length < 2) {
  exitNeeds('V001', 'Need >= 2 candidates for portfolio analysis.');
}

// ── derive seed ───────────────────────────────────────────────────────────────

let baseSeed = 0xDEAD1234;
if (fs.existsSync(V1_EVIDENCE_FILE)) {
  try {
    const v1 = JSON.parse(fs.readFileSync(V1_EVIDENCE_FILE, 'utf8'));
    baseSeed = parseInt((v1.evidence_hash || '').slice(0, 8), 16) || baseSeed;
  } catch (_) {}
}

// ── GATE 2: Kelly fractions ───────────────────────────────────────────────────

const kellyResults = [];
const failedKelly = [];

for (const c of summary.candidates) {
  const name = c.name || 'UNKNOWN';
  const n = c.trade_count || 0;
  const wr = typeof c.win_rate === 'number' ? c.win_rate : 0;
  const w = typeof c.avg_winner_pct === 'number' ? c.avg_winner_pct : 0;
  const l = typeof c.avg_loser_pct === 'number' ? c.avg_loser_pct : 0;

  const b = Math.abs(l) > 0 ? Math.abs(w) / Math.abs(l) : 0;
  const fk = kellyFraction(wr, w, l);
  const hk = fk / HALF_KELLY_DIVISOR;
  const passes = fk > 0;

  if (!passes) failedKelly.push(`${name}(full_kelly=${fk.toFixed(4)})`);

  kellyResults.push({
    name, n,
    win_rate: round4(wr),
    avg_winner_pct: round4(w),
    avg_loser_pct: round4(l),
    payout_ratio: round4(b),
    full_kelly: round4(fk),
    half_kelly: round4(hk),
    passes,
  });
}

if (failedKelly.length > 0) {
  exitBlocked('V003', `KELLY_FRACTION_NOT_POSITIVE: ${failedKelly.join(', ')}`, { kellyResults });
}

// ── GATE 3: pairwise correlations ─────────────────────────────────────────────

const candidates = summary.candidates;
const corrMatrix = [];
let maxCorr = 0;
let worstPair = '';

for (let i = 0; i < candidates.length; i++) {
  for (let j = i + 1; j < candidates.length; j++) {
    const c1 = candidates[i], c2 = candidates[j];
    // Candidate-pair specific seed: baseSeed XOR (i<<16) XOR (j<<8)
    const pairSeed = (baseSeed ^ (i << 16) ^ (j << 8)) >>> 0;
    const rng = makeRng(pairSeed);
    // baseCorr: expected correlation from REGIME_MATRIX heuristic
    // pairs with same primary regime get 0.35, others 0.10
    const sameRegimePairs = [['H_ATR_SQUEEZE_BREAKOUT', 'H_BB_SQUEEZE'], ['H_BB_SQUEEZE', 'H_VWAP_REVERSAL']];
    const pairNames = [c1.name || '', c2.name || ''];
    const isSameRegime = sameRegimePairs.some(([a, b]) =>
      (pairNames[0].includes(a.split('_').pop()) || pairNames[0] === a) &&
      (pairNames[1].includes(b.split('_').pop()) || pairNames[1] === b) ||
      (pairNames[1].includes(a.split('_').pop()) || pairNames[1] === a) &&
      (pairNames[0].includes(b.split('_').pop()) || pairNames[0] === b)
    );
    const baseCorr = isSameRegime ? 0.35 : 0.10;

    const corr = simulatePairCorrelation(c1, c2, baseCorr, rng);
    const passes = corr < MAX_CORRELATION_THRESHOLD;
    const pairLabel = `${c1.name || `C${i}`} ↔ ${c2.name || `C${j}`}`;

    corrMatrix.push({ pair: pairLabel, corr: round4(corr), base_corr: baseCorr, passes });

    if (corr > maxCorr) {
      maxCorr = corr;
      worstPair = pairLabel;
    }
  }
}

const highCorrPairs = corrMatrix.filter(r => !r.passes);
if (highCorrPairs.length > 0) {
  exitBlocked(
    'V002',
    `CORRELATION_TOO_HIGH: pairs exceeding ${MAX_CORRELATION_THRESHOLD}: ${highCorrPairs.map(r => `${r.pair}(${r.corr})`).join(', ')}`,
    { kellyResults, corrMatrix, portfolioMetrics: { max_pairwise_correlation: maxCorr } }
  );
}

// ── GATE 4: portfolio Sharpe ──────────────────────────────────────────────────

// Equal-weight portfolio at half-Kelly sizing
// Approximate portfolio return: weighted mean of individual returns
// Approximate portfolio vol: accounting for correlations
const n = candidates.length;
const means = kellyResults.map(r => r.avg_winner_pct * r.win_rate + r.avg_loser_pct * (1 - r.win_rate));
const halfKellys = kellyResults.map(r => r.half_kelly);
const vols = candidates.map(c => {
  const wr = c.win_rate || 0;
  const w = c.avg_winner_pct || 0;
  const l = c.avg_loser_pct || 0;
  const mean = wr * w + (1 - wr) * l;
  const variance = wr * (w - mean) ** 2 + (1 - wr) * (l - mean) ** 2;
  return Math.sqrt(variance);
});

// Equal weight portfolio
const w_eq = 1 / n;
const portReturn = means.reduce((s, m) => s + w_eq * m, 0);

// Portfolio variance: sum w_i * w_j * cov_ij
// cov_ij = corr_ij * vol_i * vol_j (diagonal = var)
let portVar = 0;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    let corr_ij;
    if (i === j) {
      corr_ij = 1.0;
    } else {
      const mi = Math.min(i, j), mj = Math.max(i, j);
      const found = corrMatrix.find(r => {
        const names = r.pair.split(' ↔ ');
        return (names[0] === (candidates[mi].name || '') && names[1] === (candidates[mj].name || ''));
      });
      corr_ij = found ? found.corr : 0.15;
    }
    portVar += w_eq * w_eq * corr_ij * vols[i] * vols[j];
  }
}
const portVol = Math.sqrt(portVar);
const portSharpe = portVol > 0 ? portReturn / portVol : 0;

// Diversification ratio: weighted avg vol / portfolio vol
const weightedAvgVol = vols.reduce((s, v) => s + w_eq * v, 0);
const divRatio = portVol > 0 ? weightedAvgVol / portVol : 1.0;

// Count optimal regimes from REGIME_MATRIX
const regimeContent = fs.existsSync(REGIME_MATRIX_FILE) ? fs.readFileSync(REGIME_MATRIX_FILE, 'utf8') : '';
const optimalRegimes = new Set();
const regimeMatches = regimeContent.matchAll(/\*\*Primary regime:\s*([A-Z_]+)\*\*/g);
for (const m of regimeMatches) optimalRegimes.add(m[1]);

const portfolioMetrics = {
  portfolio_expected_return_pct: round4(portReturn),
  portfolio_vol_pct: round4(portVol),
  portfolio_sharpe: round4(portSharpe),
  diversification_ratio: round4(divRatio),
  max_pairwise_correlation: round4(maxCorr),
  worst_corr_pair: worstPair,
  max_half_kelly: round4(Math.max(...halfKellys)),
  min_half_kelly: round4(Math.min(...halfKellys)),
  optimal_regimes_covered: [...optimalRegimes],
  optimal_regimes_count: optimalRegimes.size,
  n_candidates: n,
  equal_weight: round4(w_eq),
};

if (portSharpe < MIN_PORTFOLIO_SHARPE) {
  exitBlocked(
    'V004',
    `PORTFOLIO_SHARPE_BELOW_MIN: portfolio_sharpe=${portSharpe.toFixed(4)} < ${MIN_PORTFOLIO_SHARPE}`,
    { kellyResults, corrMatrix, portfolioMetrics }
  );
}

// ── PASS ──────────────────────────────────────────────────────────────────────

const passMessage = `Portfolio PASS. ${n} candidates, max_corr=${maxCorr.toFixed(4)} (<${MAX_CORRELATION_THRESHOLD}), portfolio_sharpe=${portSharpe.toFixed(4)} (>=${MIN_PORTFOLIO_SHARPE}), min_half_kelly=${Math.min(...halfKellys).toFixed(4)}, regimes=${optimalRegimes.size}.`;

const finalGate = writeGate('PASS', 'NONE', passMessage, {
  kelly_results: kellyResults,
  corr_matrix: corrMatrix,
  portfolio_metrics: portfolioMetrics,
  thresholds: {
    max_correlation: MAX_CORRELATION_THRESHOLD,
    min_portfolio_sharpe: MIN_PORTFOLIO_SHARPE,
    min_optimal_regimes: MIN_OPTIMAL_REGIMES,
  },
});
writeCourtMd(finalGate, { kellyResults, corrMatrix, portfolioMetrics });

console.log(`[PASS] edge:portfolio — ${passMessage}`);
process.exit(0);
