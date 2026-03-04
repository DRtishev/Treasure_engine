#!/usr/bin/env node
/**
 * profit_ledger_refresh.mjs — Refresh Profit Ledger with Market Impact
 *
 * Runs backtest on all candidate strategies against capsule data,
 * computing metrics with market impact model enabled.
 * Produces breakpoint fee multiplier (BFM) calculation.
 *
 * Output: reports/evidence/EPOCH-PROFIT-REFRESH-<RUN_ID>/PROFIT_REFRESH.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBacktest } from '../../core/backtest/engine.mjs';
import { enrichBars } from '../../core/edge/strategies/strategy_bar_enricher.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const RUN_ID = crypto.createHash('sha256').update(`profit-refresh-${process.pid}`).digest('hex').slice(0, 12);
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-PROFIT-REFRESH-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

const STRATEGY_PATHS = [
  '../../core/edge/strategies/s1_breakout_atr.mjs',
  '../../core/edge/strategies/s3_liq_vol_fusion.mjs',
  '../../core/edge/strategies/s4_post_cascade_mr.mjs',
  '../../core/edge/strategies/s5_multi_regime.mjs',
];

// Load fixture bars (capsule data)
const FIXTURE_PATH = path.join(ROOT, 'data', 'fixtures', 'e108', 'e108_ohlcv_200bar.json');
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const bars = enrichBars(fixture.candles);

// Cost parameters
const FEE_BPS = 4;       // Commission per side
const SPREAD_BPS = 1;    // Half-spread
const IMPACT_COEFF = 0.1; // Almgren-Chriss calibration

async function main() {
  const results = [];

  for (const stratPath of STRATEGY_PATHS) {
    const strat = await import(stratPath);
    const name = strat.meta().name;

    // Run 1: Without impact model (baseline)
    const baseline = runBacktest(strat, bars, {
      fee_bps: FEE_BPS,
      slip_bps: 2,
    });

    // Run 2: With impact model
    const withImpact = runBacktest(strat, bars, {
      fee_bps: FEE_BPS,
      use_impact_model: true,
      impact_coeff: IMPACT_COEFF,
    });

    // Determinism check: run impact model again
    const withImpact2 = runBacktest(strat, bars, {
      fee_bps: FEE_BPS,
      use_impact_model: true,
      impact_coeff: IMPACT_COEFF,
    });
    const h1 = crypto.createHash('sha256').update(JSON.stringify(withImpact.metrics)).digest('hex');
    const h2 = crypto.createHash('sha256').update(JSON.stringify(withImpact2.metrics)).digest('hex');
    const deterministic = h1 === h2;

    // Compute BFM (Breakpoint Fee Multiplier)
    // BFM = expected_gross_edge / total_cost
    const grossEdgeBps = baseline.metrics.return_pct * 100; // Convert pct to bps
    const totalCostBps = FEE_BPS * 2 + SPREAD_BPS * 2 + (withImpact.metrics.total_slippage / (withImpact.metrics.initial_capital || 10000)) * 10000;
    const bfm = totalCostBps > 0 ? grossEdgeBps / totalCostBps : 0;

    // Verdict
    let verdict;
    if (bfm >= 2.0) verdict = 'PASS_STRICT';
    else if (bfm >= 1.5) verdict = 'PASS_RELAXED';
    else verdict = 'HOLD_STRICT';

    results.push({
      strategy: name,
      baseline_sharpe: baseline.metrics.backtest_sharpe,
      baseline_return_pct: baseline.metrics.return_pct,
      baseline_pnl: baseline.metrics.total_pnl,
      impact_sharpe: withImpact.metrics.backtest_sharpe,
      impact_return_pct: withImpact.metrics.return_pct,
      impact_pnl: withImpact.metrics.total_pnl,
      impact_total_fees: withImpact.metrics.total_fees,
      impact_total_slippage: withImpact.metrics.total_slippage,
      trade_count: withImpact.metrics.trade_count,
      max_drawdown: withImpact.metrics.max_drawdown,
      deterministic,
      hash_run1: h1.slice(0, 16),
      hash_run2: h2.slice(0, 16),
      bfm: Number(bfm.toFixed(4)),
      verdict,
    });

    console.log(`  ${name}: baseline_sharpe=${baseline.metrics.backtest_sharpe} impact_sharpe=${withImpact.metrics.backtest_sharpe} BFM=${bfm.toFixed(4)} verdict=${verdict} det=${deterministic ? 'PASS' : 'FAIL'}`);
  }

  // Summary
  const allDeterministic = results.every(r => r.deterministic);
  const bestBFM = Math.max(...results.map(r => r.bfm));
  const proceedEligible = results.some(r => r.bfm >= 1.5);

  const report = {
    schema_version: '1.0.0',
    run_id: RUN_ID,
    impact_coeff: IMPACT_COEFF,
    fee_bps: FEE_BPS,
    spread_bps: SPREAD_BPS,
    strategies: results,
    summary: {
      all_deterministic: allDeterministic,
      best_bfm: bestBFM,
      proceed_eligible: proceedEligible,
      proceed_verdict: proceedEligible ? 'PROCEED' : 'HOLD_STRICT',
    },
  };

  writeJsonDeterministic(path.join(EPOCH_DIR, 'PROFIT_REFRESH.json'), report);

  console.log(`\n[${allDeterministic ? 'PASS' : 'FAIL'}] Profit ledger refresh: ${results.length} strategies`);
  console.log(`  best BFM: ${bestBFM.toFixed(4)} proceed: ${proceedEligible ? 'YES' : 'NO'}`);
  console.log(`  determinism: ${allDeterministic ? 'ALL PASS' : 'SOME FAIL'}`);
  console.log(`  output: ${path.relative(ROOT, EPOCH_DIR)}/PROFIT_REFRESH.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
