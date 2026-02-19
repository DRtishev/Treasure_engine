#!/usr/bin/env node
// scripts/verify/edge_lab_validation.mjs — EDGE LAB Validation Gate
// Offline-first. Deterministic. Fail-closed.
// Runs the multi-court pipeline against synthetic edge fixtures.
// Evidence: reports/evidence/EDGE_LAB/VERDICT.md

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runEdgeLabPipeline, VERDICTS, COURT_ORDER } from '../../core/edge_lab/pipeline.mjs';

// ─── Load SSOT ───────────────────────────────────────────────────────────────
const ssot = JSON.parse(fs.readFileSync('spec/ssot.json', 'utf8'));

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

// ─── Fixture: ELIGIBLE edge ──────────────────────────────────────────────────
function makeEligibleEdge(seed = 12345) {
  // Deterministic LCG
  let rng = seed >>> 0;
  function next() {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    return rng / 0xffffffff;
  }

  // Strong edge fixture: 65% win rate, high expectancy, low variance losses.
  const trades = Array.from({ length: 60 }, () => {
    const win = next() > 0.35;                    // ~65% win rate
    const notional = 500 + Math.floor(next() * 500);
    const pnl = win
      ? notional * (0.008 + next() * 0.007)       // win: 0.8–1.5% of notional
      : -notional * (0.001 + next() * 0.002);     // loss: 0.1–0.3% of notional
    return {
      pnl,
      notional_usd: notional,
      entry_price: 50000 + next() * 10000,
      qty: notional / 50000,
      pnl_pct: pnl / notional,
    };
  });

  return {
    trades,
    data_sources: [
      {
        name: 'binance_spot_btc',
        type: 'market_data',
        last_update_ms: Date.now() - 1000 * 60,
        is_proxy: false,
      },
    ],
    execution: {
      reality_gap: 0.15,
      slippage_p99_bps: 8,
      base_slippage_bps: 4,
      fill_rate: 0.97,
      latency_p99_ms: 120,
      reject_ratio: 0.02,
      partial_fill_rate: 0.05,
      fee_bps: 3,
    },
    risk: {
      kill_switch_compatible: true,
      kill_switch_threshold_pct: 0.10,
      initial_equity_usd: 10000,
      correlation_with_market: 0.3,
    },
    wfo: {
      folds: [
        { oos_pnl: 420, oos_trades: 15, oos_sharpe: 0.9 },
        { oos_pnl: 310, oos_trades: 18, oos_sharpe: 0.7 },
        { oos_pnl: 150, oos_trades: 12, oos_sharpe: 0.5 },
      ],
    },
    strategies_tested: 3,
    seed,
    sre: {
      monitoring_configured: true,
      sli_definitions_present: true,
      execution_latency_p99_ms: 120,
      fill_reliability_pct: 97,
      data_freshness_lag_ms: 800,
      error_rate_pct: 0.2,
      slippage_drift_bps: 1.5,
    },
    now_ms: Date.now(),
  };
}

// ─── Fixture: NOT_ELIGIBLE edge (fails 2× slippage + drawdown) ───────────────
function makeNotEligibleEdge() {
  const trades = Array.from({ length: 40 }, (_, i) => ({
    pnl: i % 3 === 0 ? 10 : -15,  // negative expected value
    notional_usd: 200,
    entry_price: 50000,
    qty: 0.004,
    pnl_pct: i % 3 === 0 ? 0.05 : -0.075,
  }));

  return {
    trades,
    data_sources: [{ name: 'proxy_vol', type: 'derived', last_update_ms: Date.now(), is_proxy: false }],
    execution: {
      reality_gap: 0.2,
      slippage_p99_bps: 20,       // exceeds threshold
      base_slippage_bps: 20,
      fill_rate: 0.98,
      latency_p99_ms: 100,
      reject_ratio: 0.01,
      partial_fill_rate: 0.02,
      fee_bps: 5,
    },
    risk: {
      kill_switch_compatible: true,
      kill_switch_threshold_pct: 0.10,
      initial_equity_usd: 10000,
    },
    wfo: { folds: [] },
    strategies_tested: 1,
    seed: 99999,
    sre: {
      monitoring_configured: true,
      execution_latency_p99_ms: 200,
      fill_reliability_pct: 99,
      data_freshness_lag_ms: 1000,
      error_rate_pct: 0.1,
      slippage_drift_bps: 1,
    },
    now_ms: Date.now(),
  };
}

// ─── Fixture: NEEDS_DATA edge ─────────────────────────────────────────────────
function makeNeedsDataEdge() {
  return {
    trades: Array.from({ length: 5 }, (_, i) => ({
      pnl: 10,
      notional_usd: 100,
      entry_price: 50000,
      qty: 0.002,
      pnl_pct: 0.1,
    })),
    data_sources: [],
    execution: {
      reality_gap: 0.1,
      slippage_p99_bps: 5,
      base_slippage_bps: 3,
      fill_rate: 0.99,
      latency_p99_ms: 100,
      reject_ratio: 0.01,
    },
    risk: { kill_switch_compatible: true },
    wfo: { folds: [] },
    strategies_tested: 1,
    seed: 42,
    sre: { monitoring_configured: true },
    now_ms: Date.now(),
  };
}

// ─── Fixture: BLOCKED edge (proxy without methodology) ────────────────────────
function makeBlockedEdge() {
  return {
    trades: Array.from({ length: 40 }, (_, i) => ({
      pnl: 5,
      notional_usd: 200,
      entry_price: 50000,
      qty: 0.004,
      pnl_pct: 0.025,
    })),
    data_sources: [
      {
        name: 'synthetic_vol_proxy',
        type: 'derived',
        last_update_ms: Date.now(),
        is_proxy: true,
        // Missing: proxy_methodology, proxy_error_bounds, proxy_failure_modes → BLOCKED
      },
    ],
    execution: {
      reality_gap: 0.1,
      slippage_p99_bps: 5,
      base_slippage_bps: 3,
      fill_rate: 0.99,
      latency_p99_ms: 100,
      reject_ratio: 0.01,
    },
    risk: { kill_switch_compatible: true },
    wfo: { folds: [] },
    strategies_tested: 1,
    seed: 777,
    sre: { monitoring_configured: true },
    now_ms: Date.now(),
  };
}

// ─── Test runner ──────────────────────────────────────────────────────────────
function runTests() {
  const results = [];

  // ── TEST 1: Eligible edge produces non-NOT_ELIGIBLE verdict ───────────────
  console.log('\n[TEST 1] Eligible edge — full pipeline');
  const eligibleEdge = makeEligibleEdge(12345);
  const r1 = runEdgeLabPipeline(eligibleEdge, ssot, { fail_fast: false, double_run: true, edge_id: 'TEST_ELIGIBLE' });
  assert(
    [VERDICTS.PIPELINE_ELIGIBLE, VERDICTS.TESTING_SET_ELIGIBLE, VERDICTS.LIVE_ELIGIBLE].includes(r1.verdict),
    `Eligible edge: verdict=${r1.verdict} (expected non-failure)`
  );
  assert(r1.evidence_manifest != null, 'Evidence manifest produced');
  assert(r1.evidence_manifest.double_run === true, 'Double-run flag set');
  assert(r1.evidence_manifest.deterministic === true, 'Double-run passed (deterministic)');
  assert(typeof r1.evidence_manifest.run_fingerprint === 'string', 'Run fingerprint produced');
  assert(r1.courts.length > 0, 'Courts array non-empty');
  results.push({ test: 'eligible_edge', verdict: r1.verdict, courts: r1.courts.length });

  // ── TEST 2: Determinism — same edge, same SSOT → same fingerprint ──────────
  console.log('\n[TEST 2] Determinism check');
  const r1a = runEdgeLabPipeline(makeEligibleEdge(12345), ssot, { fail_fast: false, double_run: false, edge_id: 'DET_A' });
  const r1b = runEdgeLabPipeline(makeEligibleEdge(12345), ssot, { fail_fast: false, double_run: false, edge_id: 'DET_B' });
  assert(r1a.verdict === r1b.verdict, `Same seed → same verdict (${r1a.verdict})`);
  assert(
    r1a.evidence_manifest.run_fingerprint === r1b.evidence_manifest.run_fingerprint,
    'Same seed → identical fingerprint'
  );

  // ── TEST 3: NEEDS_DATA verdict for insufficient trades ────────────────────
  console.log('\n[TEST 3] Needs-data edge');
  const r3 = runEdgeLabPipeline(makeNeedsDataEdge(), ssot, { fail_fast: true, double_run: true, edge_id: 'TEST_NEEDS_DATA' });
  assert(r3.verdict === VERDICTS.NEEDS_DATA, `Insufficient trades → NEEDS_DATA (got ${r3.verdict})`);
  results.push({ test: 'needs_data_edge', verdict: r3.verdict });

  // ── TEST 4: BLOCKED verdict for unverified proxy ───────────────────────────
  console.log('\n[TEST 4] Blocked edge (unverified proxy)');
  const r4 = runEdgeLabPipeline(makeBlockedEdge(), ssot, { fail_fast: true, double_run: true, edge_id: 'TEST_BLOCKED' });
  assert(r4.verdict === VERDICTS.BLOCKED, `Unverified proxy → BLOCKED (got ${r4.verdict})`);
  results.push({ test: 'blocked_proxy_edge', verdict: r4.verdict });

  // ── TEST 5: NOT_ELIGIBLE verdict for bad execution ────────────────────────
  console.log('\n[TEST 5] Not-eligible edge');
  const r5 = runEdgeLabPipeline(makeNotEligibleEdge(), ssot, { fail_fast: false, double_run: true, edge_id: 'TEST_NOT_ELIGIBLE' });
  assert(
    [VERDICTS.NOT_ELIGIBLE, VERDICTS.NEEDS_DATA].includes(r5.verdict),
    `Bad execution metrics → NOT_ELIGIBLE or NEEDS_DATA (got ${r5.verdict})`
  );
  results.push({ test: 'not_eligible_edge', verdict: r5.verdict });

  // ── TEST 6: Court manifest order enforced ─────────────────────────────────
  console.log('\n[TEST 6] Court manifest order');
  const r6 = runEdgeLabPipeline(makeEligibleEdge(12345), ssot, { fail_fast: false, double_run: false, edge_id: 'MANIFEST_TEST' });
  const courtNames = r6.courts.map((c) => c.court);
  // Courts that ran should appear in canonical order
  let orderOk = true;
  let prevIdx = -1;
  for (const name of courtNames) {
    const idx = COURT_ORDER.indexOf(name);
    if (idx < prevIdx) { orderOk = false; break; }
    prevIdx = idx;
  }
  assert(orderOk, 'Courts executed in canonical order');

  // ── TEST 7: Evidence manifest lists executed courts ───────────────────────
  console.log('\n[TEST 7] Evidence manifest integrity');
  const r7 = runEdgeLabPipeline(makeEligibleEdge(12345), ssot, { fail_fast: false, double_run: true, edge_id: 'MANIFEST_INTEGRITY' });
  assert(Array.isArray(r7.evidence_manifest.courts_executed), 'courts_executed is array');
  assert(Array.isArray(r7.evidence_manifest.court_verdicts), 'court_verdicts is array');
  assert(r7.evidence_manifest.courts_executed.length === r7.courts.length, 'courts_executed count matches');

  return results;
}

// ─── Evidence writing ─────────────────────────────────────────────────────────
function writeEvidence(allResults) {
  const evidenceDir = path.join('reports', 'evidence', 'EDGE_LAB');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const verdictContent = [
    '# EDGE LAB Validation Gate — VERDICT',
    '',
    `**Run date:** ${new Date().toISOString()}`,
    `**Gate:** verify:edge-lab`,
    `**Tests passed:** ${passed}`,
    `**Tests failed:** ${failed}`,
    '',
    `## Overall Verdict: ${failed === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '## Test Results',
    ...allResults.map((r) => `- **${r.test}**: verdict=${r.verdict}`),
    '',
    '## Evidence Integrity',
    `- Double-run determinism: ENFORCED`,
    `- Court manifest order: ENFORCED`,
    `- Fail-closed doctrine: ACTIVE`,
    '',
    '## Court Pipeline',
    '| Court | Role |',
    '|---|---|',
    '| DatasetCourt | Data quality, proxy validation, staleness |',
    '| ExecutionCourt | Slippage, fill rate, latency, reality gap |',
    '| ExecutionSensitivityCourt | 2× slippage stress grid |',
    '| RiskCourt | Drawdown, tail risk, kill-switch compatibility |',
    '| OverfitCourt | Deflated Sharpe, walk-forward OOS, bootstrap CI |',
    '| RedTeamCourt | Adversarial statistical, execution, risk attacks |',
    '| SREReliabilityCourt | SLI/SLO: latency, fill, freshness, errors |',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(evidenceDir, 'VERDICT.md'), verdictContent);

  const sha = crypto.createHash('sha256').update(verdictContent).digest('hex');
  fs.writeFileSync(
    path.join(evidenceDir, 'SHA256SUMS.md'),
    `# SHA256\n\n\`\`\`\n${sha}  VERDICT.md\n\`\`\`\n`
  );

  console.log(`\nEvidence written to: ${evidenceDir}/`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════');
  console.log('EDGE LAB VALIDATION ENGINE — GATE');
  console.log('════════════════════════════════════════');
  console.log('Doctrine: fail-closed | deterministic | evidence-driven');
  console.log('');

  const allResults = await runTests();
  writeEvidence(allResults);

  console.log('\n════════════════════════════════════════');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('════════════════════════════════════════');

  if (failed > 0) {
    console.error('\nVERDICT: FAIL — one or more assertions failed');
    process.exit(1);
  }
  console.log('\nVERDICT: PASS');
}

main().catch((err) => {
  console.error('[EDGE LAB] Fatal error:', err);
  process.exit(1);
});
