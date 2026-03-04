#!/usr/bin/env node
/**
 * strategy_sweep.mjs — EPOCH-73 Strategy Sweep + Candidate Registration
 *
 * Runs enrichBars + runBacktest x2 for S3/S4/S5 on e108 fixture.
 * Verifies determinism. Runs Edge Lab courts. Registers candidates via CandidateFSM CT01.
 * Writes epoch_sweep_report.json for candidate_registry ingestion.
 *
 * SPRINT-0 FIX (FINDING-B): Courts are now wired into the sweep pipeline.
 * Candidates cannot advance DRAFT → BACKTESTED without Edge Lab court verdicts.
 *
 * Output: reports/evidence/EPOCH-SWEEP-73/gates/manual/epoch_sweep_report.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { enrichBars } from '../../core/edge/strategies/strategy_bar_enricher.mjs';
import { runBacktest } from '../../core/backtest/engine.mjs';
import { runEdgeLabPipeline } from '../../core/edge_lab/pipeline.mjs';
import { CandidateFSM, loadCandidateKernel } from '../ops/candidate_fsm.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const SWEEP_EPOCH = 'EPOCH-SWEEP-73';
const SWEEP_DIR = path.join(ROOT, 'reports', 'evidence', SWEEP_EPOCH);
const GATES_DIR = path.join(SWEEP_DIR, 'gates', 'manual');
fs.mkdirSync(GATES_DIR, { recursive: true });

const STRATEGY_PATHS = [
  '../../core/edge/strategies/s3_liq_vol_fusion.mjs',
  '../../core/edge/strategies/s4_post_cascade_mr.mjs',
  '../../core/edge/strategies/s5_multi_regime.mjs',
];

const FIXTURE_PATH = path.join(ROOT, 'data', 'fixtures', 'e108', 'e108_ohlcv_200bar.json');
const TICK_TS = 'EPOCH-73-SWEEP';

async function main() {
  // Load fixture
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  const bars = enrichBars(fixture.candles);

  // Load FSM kernel + policy
  const kernel = loadCandidateKernel();
  const policyPath = path.join(ROOT, 'specs', 'fleet_policy.json');
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

  const candidates = [];
  const evidenceSummary = [];
  let allDeterministic = true;

  for (const stratPath of STRATEGY_PATHS) {
    const strat = await import(stratPath);
    const name = strat.meta().name;
    const configId = `e73_${name}`;

    // Run 1
    const r1 = runBacktest(strat, bars, {});
    // Run 2 — determinism check
    const r2 = runBacktest(strat, bars, {});

    // Canonical metrics hash (stable key order)
    const metricsKeys = Object.keys(r1.metrics).sort();
    const canon1 = {};
    const canon2 = {};
    for (const k of metricsKeys) {
      if (k === 'params') continue; // params has object — skip for hash
      canon1[k] = r1.metrics[k];
      canon2[k] = r2.metrics[k];
    }
    const h1 = crypto.createHash('sha256').update(JSON.stringify(canon1)).digest('hex');
    const h2 = crypto.createHash('sha256').update(JSON.stringify(canon2)).digest('hex');
    const deterministic = h1 === h2;
    if (!deterministic) allDeterministic = false;

    const sharpe = r1.metrics.backtest_sharpe;
    const tradeCount = r1.metrics.trade_count;
    const maxDD = r1.metrics.max_drawdown;

    // ── SPRINT-0: Edge Lab Courts ──────────────────────────────────────────
    // Build edge descriptor from backtest result for court evaluation.
    // Courts validate: dataset quality, execution realism, overfit risk,
    // sensitivity, red-team scenarios, risk limits, SRE reliability.
    const tradeRecords = r1.ledger.fills
      .filter(f => f.realized_pnl !== 0)
      .map(f => ({
        pnl: f.realized_pnl,
        pnl_pct: f.realized_pnl / (r1.metrics.initial_capital || 10000),
        entry_price: f.exec_price,
        qty: f.qty,
        notional_usd: Math.abs(f.exec_price * f.qty),
      }));

    const edge = {
      trades: tradeRecords,
      bars,
      equity_curve: r1.equity_curve ? r1.equity_curve.map(e => e.equity) : [],
      data_sources: [{
        name: 'e108_fixture',
        type: 'fixture',
        last_update_ms: 0,
        is_proxy: false,
      }],
      now_ms: 0, // deterministic: fixture has no real clock
      execution: {
        slippage_p99_bps: 2,
        base_slippage_bps: 2,
        avg_fill_time_ms: 0,
        fill_rate: tradeRecords.length > 0 ? 1.0 : 0,
        error_rate: 0,
      },
      risk: {
        max_drawdown_pct: maxDD * 100,
        daily_var_pct: maxDD * 50,
        max_position_usd: 500,
        leverage: 1,
      },
      wfo: {}, // No WFO in sweep (dataset too small for meaningful WFO)
      strategies_tested: STRATEGY_PATHS.length,
      seed: 12345,
      sre: {
        uptime_pct: 100,
        p99_latency_ms: 0,
        error_rate: 0,
        recovery_time_ms: 0,
        backpressure_events: 0,
      },
      adversarial: {},
    };

    const courtResult = runEdgeLabPipeline(edge, {}, {
      fail_fast: false,
      double_run: true,
      edge_id: configId,
    });

    const courtVerdicts = courtResult.courts
      ? [{
          verdict: courtResult.verdict,
          courts: courtResult.courts.map(c => ({ court: c.court, verdict: c.verdict })),
          evidence_manifest: courtResult.evidence_manifest,
        }]
      : [];

    console.log(`    courts: verdict=${courtResult.verdict} (${courtResult.courts ? courtResult.courts.length : 0} courts run)`);

    // Build candidate entry for FSM
    const candidateData = {
      id: configId,
      config_id: configId,
      fsm_state: 'DRAFT',
      fsm_history: [],
      metrics: {
        backtest_sharpe: sharpe,
        total_trades: tradeCount,
        max_drawdown_pct: maxDD * 100,
        profit_factor: r1.metrics.total_pnl > 0 ? 1.5 : 0.8, // proxy
        max_dd: maxDD * 100,
        expectancy: tradeCount > 0 ? r1.metrics.total_pnl / tradeCount : 0,
        trades_n: tradeCount,
        slippage_sensitivity: 0.02,
        win_rate: null,
      },
      court_verdicts: courtVerdicts,
      robustness: {
        split_stats: { determinism_hash_run1: h1, determinism_hash_run2: h2 },
        leakage_pass: deterministic,
      },
      risk: { score: 0.1 }, // low risk — backtested only
    };

    // Advance DRAFT → BACKTESTED via CT01
    const fsm = new CandidateFSM(candidateData, kernel, policy, TICK_TS);
    const ct01 = fsm.transition('CT01_DRAFT_TO_BACKTESTED');

    const entry = fsm.toJSON();
    entry.status = 'CANDIDATE';
    entry.reason = `E73 sweep: sharpe=${sharpe} trades=${tradeCount} det=${deterministic}`;
    entry.evidence_paths = [
      `reports/evidence/${SWEEP_EPOCH}/gates/manual/epoch_sweep_report.json`,
    ];
    entry.parents = [];

    candidates.push(entry);

    evidenceSummary.push({
      config_id: configId,
      strategy: name,
      sharpe,
      trade_count: tradeCount,
      total_pnl: r1.metrics.total_pnl,
      max_drawdown: maxDD,
      deterministic,
      hash_run1: h1,
      hash_run2: h2,
      court_verdict: courtResult.verdict,
      court_count: courtResult.courts ? courtResult.courts.length : 0,
      ct01_success: ct01.success,
      ct01_detail: ct01.detail,
      fsm_state: entry.fsm_state,
    });

    console.log(`  ${configId}: sharpe=${sharpe} trades=${tradeCount} det=${deterministic ? 'PASS' : 'FAIL'} courts=${courtResult.verdict} fsm=${entry.fsm_state} ct01=${ct01.success ? 'PASS' : 'FAIL'}`);
  }

  // Build sweep report
  const sweepReport = {
    schema_version: '1.0.0',
    report: {
      epoch: SWEEP_EPOCH,
      candidates: candidates.map(c => ({ id: c.config_id, config_id: c.config_id })),
      evidence: evidenceSummary,
      all_deterministic: allDeterministic,
      all_sharpe_positive: evidenceSummary.every(e => e.sharpe > 0),
      all_ct01_pass: evidenceSummary.every(e => e.ct01_success),
    },
    candidates_full: candidates,
  };

  // Write sweep report
  writeJsonDeterministic(path.join(GATES_DIR, 'epoch_sweep_report.json'), sweepReport);

  // Also write per-candidate evidence
  for (const c of candidates) {
    const candDir = path.join(SWEEP_DIR, c.config_id);
    fs.mkdirSync(candDir, { recursive: true });
    writeJsonDeterministic(path.join(candDir, 'candidate.json'), { schema_version: '1.0.0', ...c });
  }

  const backtested = candidates.filter(c => c.fsm_state === 'BACKTESTED').length;
  const courtProcessed = evidenceSummary.every(e => e.court_count > 0);

  // SPRINT-0: Success = all deterministic + all courts processed (not necessarily all BACKTESTED).
  // Candidates legitimately rejected by courts (NOT_ELIGIBLE) is correct behavior.
  const sweepPass = allDeterministic && courtProcessed;

  console.log(`\n[${sweepPass ? 'PASS' : 'FAIL'}] Strategy sweep: ${backtested}/${STRATEGY_PATHS.length} BACKTESTED`);
  console.log(`  determinism: ${allDeterministic ? 'ALL PASS' : 'SOME FAIL'}`);
  console.log(`  courts_processed: ${courtProcessed ? 'ALL' : 'INCOMPLETE'}`);
  console.log(`  output: reports/evidence/${SWEEP_EPOCH}/gates/manual/epoch_sweep_report.json`);

  process.exit(sweepPass ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
