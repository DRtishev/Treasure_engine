#!/usr/bin/env node
/**
 * e73_profit_search.mjs — EPOCH-73 Strategy Profit Search
 *
 * Runs enrichBars + runBacktest on e108 fixture for S3/S4/S5 strategy families.
 * Same data universe as strategy backtests (truthful integration per §3.7).
 *
 * Extends E78 profit search with 3 new families:
 *   - liq_vol_fusion (S3)
 *   - post_cascade_mr (S4)
 *   - multi_regime_adaptive (S5)
 *
 * Usage:
 *   import { runE73ProfitSearch } from './e73_profit_search.mjs';
 *   const result = runE73ProfitSearch({ fixture_path: '...' });
 */

import fs from 'node:fs';
import path from 'node:path';
import { enrichBars } from './strategies/strategy_bar_enricher.mjs';
import { runBacktest } from '../backtest/engine.mjs';

const ROOT = process.cwd();

const round = (v, d = 8) => { const f = 10 ** d; return Math.round(v * f) / f; };

const STRATEGY_MODULES = [
  { id: 'liq_vol_fusion', path: './strategies/s3_liq_vol_fusion.mjs' },
  { id: 'post_cascade_mr', path: './strategies/s4_post_cascade_mr.mjs' },
  { id: 'multi_regime_adaptive', path: './strategies/s5_multi_regime.mjs' },
];

// Micro-grid per strategy: 3 param variants to test robustness
const PARAM_GRIDS = {
  liq_vol_fusion: [
    { id: 'lv_default', params: {} },
    { id: 'lv_tight', params: { liq_threshold: 0.60, burst_threshold: 1.3, max_hold_bars: 15 } },
    { id: 'lv_loose', params: { liq_threshold: 0.55, burst_threshold: 1.2, max_hold_bars: 25 } },
  ],
  post_cascade_mr: [
    { id: 'pcmr_default', params: {} },
    { id: 'pcmr_fast', params: { cooldown_bars: 2, profit_target_pct: 0.008, sma_period: 10 } },
    { id: 'pcmr_slow', params: { cooldown_bars: 5, profit_target_pct: 0.005, sma_period: 20 } },
  ],
  multi_regime_adaptive: [
    { id: 'mra_default', params: {} },
    { id: 'mra_trend', params: { vol_trend_thresh: 0.015, profit_target_pct: 0.01 } },
    { id: 'mra_range', params: { vol_trend_thresh: 0.008, profit_target_pct: 0.006 } },
  ],
};

export async function runE73ProfitSearch(opts = {}) {
  const fixturePath = opts.fixture_path || path.join(ROOT, 'data', 'fixtures', 'e108', 'e108_ohlcv_200bar.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const bars = enrichBars(fixture.candles);

  const envs = { BEST: { fee_bps: 2, slip_bps: 1 }, MEDIAN: { fee_bps: 4, slip_bps: 2 }, WORST: { fee_bps: 8, slip_bps: 5 } };
  const candidates = [];

  for (const stratDef of STRATEGY_MODULES) {
    const mod = await import(stratDef.path);
    const grid = PARAM_GRIDS[stratDef.id] || [{ id: 'default', params: {} }];

    for (const variant of grid) {
      const byEnv = {};

      for (const [env, envOpts] of Object.entries(envs)) {
        const r = runBacktest(mod, bars, {
          params: variant.params,
          fee_bps: envOpts.fee_bps,
          slip_bps: envOpts.slip_bps,
        });
        const m = r.metrics;
        byEnv[env] = {
          trade_count: m.trade_count,
          net_pnl: round(m.total_pnl),
          backtest_sharpe: m.backtest_sharpe,
          max_drawdown: round(m.max_drawdown, 6),
          return_pct: round(m.return_pct, 4),
        };
      }

      let reason = 'OK';
      if (byEnv.WORST.trade_count < 2) reason = 'INVALID_SAMPLE';
      else if (byEnv.BEST.net_pnl > 0 && byEnv.WORST.net_pnl < 0) reason = 'NOT_ROBUST';

      const robust_score = round(
        Math.min(byEnv.MEDIAN.backtest_sharpe, 5) * Math.max(byEnv.WORST.trade_count / 20, 0.1),
        6
      );

      candidates.push({
        candidate_id: `${stratDef.id}:${variant.id}`,
        family: stratDef.id,
        reason_code: reason,
        robust_score,
        metrics: byEnv,
      });
    }
  }

  candidates.sort((a, b) => b.robust_score - a.robust_score);
  const best = candidates[0];
  const summary = {
    families_tested: STRATEGY_MODULES.length,
    variants_tested: candidates.length,
    best_candidate: best?.candidate_id || null,
    best_robust_score: best?.robust_score || 0,
    candidates,
  };

  return summary;
}

// CLI entry
if (process.argv[1] && process.argv[1].endsWith('e73_profit_search.mjs')) {
  runE73ProfitSearch().then(result => {
    console.log(`[PASS] e73_profit_search — ${result.variants_tested} variants tested`);
    console.log(`  best: ${result.best_candidate} (robust_score=${result.best_robust_score})`);
    for (const c of result.candidates) {
      console.log(`  ${c.candidate_id}: ${c.reason_code} score=${c.robust_score} sharpe_med=${c.metrics.MEDIAN.backtest_sharpe}`);
    }
  }).catch(err => { console.error(err); process.exit(1); });
}
