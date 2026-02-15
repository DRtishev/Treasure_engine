#!/usr/bin/env node
import { buildExecutionCostModel, simulateFill } from './e75_profit_harness.mjs';
import { createBybitDemoAdapter } from '../exec/adapters/demo_adapter_bybit.mjs';

function lcg(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createPaperReconAdapter(config = {}) {
  const model = buildExecutionCostModel(config.costModel || {});
  const rng = lcg(model.seed);
  return {
    adapter: 'paper_recon',
    fill(signal, snapshot) {
      return simulateFill(signal, snapshot, model, rng);
    }
  };
}

export function buildReconComparison({ signal, expected_price, fill }) {
  const expected_vs_filled_bps = expected_price === 0 ? 0 : ((fill.fill_price - expected_price) / expected_price) * 10000;
  return {
    signal_side: signal.side,
    signal_size: signal.size,
    expected_price,
    filled_price: fill.fill_price,
    expected_vs_filled_bps: Number(expected_vs_filled_bps.toFixed(4)),
    fee: fill.fee,
    slippage: fill.slippage,
    delay_ms: fill.delay_ms,
    tolerances: {
      warn_bps: 12,
      alert_bps: 25,
      warn_delay_ms: 80,
      alert_delay_ms: 140
    }
  };
}

export function maybeCreateDemoAdapter() {
  if (process.env.ENABLE_DEMO_ADAPTER !== '1') {
    return { adapter: 'bybit_demo', enabled: false, reason: 'ENABLE_DEMO_ADAPTER!=1' };
  }
  return createBybitDemoAdapter();
}
