#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DECIMALS = 8;
function round(value, scale = DECIMALS) {
  const f = 10 ** scale;
  return Math.round(value * f) / f;
}

export function parseEdgeFixtureCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').trim();
  const [header, ...rows] = raw.split(/\r?\n/);
  if (header !== 'ts,close,signal') throw new Error(`E75_BAD_HEADER ${csvPath}`);
  return rows.map((line) => {
    const [ts, close, signal] = line.split(',');
    const mid = Number(close);
    return { ts, timestamp_ms: Date.parse(ts), mid, spread: round(mid * 0.0004), signal: Number(signal) };
  }).sort((a, b) => a.ts.localeCompare(b.ts));
}

export function buildExecutionCostModel(config = {}) {
  const fee_bps = Number(config.fee_bps ?? 8);
  const spread_factor = Number(config.spread_factor ?? 1);
  const impact_coeff = Number(config.impact_coeff ?? 0.00002);
  const fixed_latency_ms = Number(config.fixed_latency_ms ?? 35);
  const latency_jitter_ms = Number(config.latency_jitter_ms ?? 5);
  const seed = Number(config.seed ?? 12345);
  const price_decimals = Number(config.price_decimals ?? 4);
  const qty_decimals = Number(config.qty_decimals ?? 6);

  return {
    fee_bps, spread_factor, impact_coeff, fixed_latency_ms, latency_jitter_ms, seed, price_decimals, qty_decimals,
    roundPrice: (v) => round(v, price_decimals),
    roundQty: (v) => round(v, qty_decimals)
  };
}

function lcg(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function simulateFill(signal, snapshot, model, random01) {
  const side = signal.side;
  const signedSize = side === 'BUY' ? signal.size : -signal.size;
  const halfSpread = (snapshot.spread * model.spread_factor) / 2;
  const impact = Math.abs(signal.size) * snapshot.mid * model.impact_coeff;
  const delayJitter = Math.floor((random01() * 2 - 1) * model.latency_jitter_ms);
  const delay_ms = model.fixed_latency_ms + delayJitter;
  const fill_price_raw = side === 'BUY'
    ? snapshot.mid + halfSpread + impact
    : snapshot.mid - halfSpread - impact;
  const fill_price = model.roundPrice(fill_price_raw);
  const expected_price = model.roundPrice(signal.expected_price);
  const fee = round((fill_price * Math.abs(signal.size) * model.fee_bps) / 10000, DECIMALS);
  const slippage = round(Math.abs(fill_price - expected_price), DECIMALS);
  const pnl_contribution = round((snapshot.mid - fill_price) * signedSize - fee, DECIMALS);
  return { fill_price, fee, slippage, delay_ms, pnl_contribution };
}

function computeMetrics(trades) {
  const gross = round(trades.reduce((a, t) => a + t.gross_pnl, 0));
  const net = round(trades.reduce((a, t) => a + t.net_pnl, 0));
  const trade_count = trades.length;
  const wins = trades.filter((t) => t.net_pnl > 0).length;
  const winrate = round(trade_count ? wins / trade_count : 0);
  const pos = round(trades.filter((t) => t.net_pnl > 0).reduce((a, t) => a + t.net_pnl, 0));
  const neg = Math.abs(round(trades.filter((t) => t.net_pnl < 0).reduce((a, t) => a + t.net_pnl, 0)));
  const profit_factor = round(neg ? pos / neg : 0);
  const expectancy = round(trade_count ? net / trade_count : 0);

  let equity = 0;
  let peak = 0;
  let max_drawdown = 0;
  for (const t of trades) {
    equity = round(equity + t.net_pnl);
    peak = Math.max(peak, equity);
    max_drawdown = Math.max(max_drawdown, round(peak - equity));
  }

  return { gross_pnl: gross, net_pnl: net, expectancy, winrate, profit_factor, max_drawdown: round(max_drawdown), trade_count };
}

export function runEdgeCandidateRunner({ strategy, datasets, topN = 5, minTrades = 5, costModel }) {
  const rng = lcg(costModel.seed);
  const candidates = [];
  for (const params of strategy.parameterGrid()) {
    const strategyId = `${strategy.id}:${params.id}`;
    const allTrades = [];
    for (const dataset of datasets) {
      const trades = strategy.run({ rows: dataset.rows, params, costModel, simulateFill, rng });
      for (const trade of trades) allTrades.push({ ...trade, dataset: dataset.id });
    }
    const metrics = computeMetrics(allTrades);
    const reason_code = metrics.trade_count < minTrades ? 'INVALID_SAMPLE' : 'OK';
    candidates.push({ strategy_id: strategyId, params, metrics, reason_code });
  }

  candidates.sort((a, b) => {
    if (b.metrics.net_pnl !== a.metrics.net_pnl) return b.metrics.net_pnl - a.metrics.net_pnl;
    if (b.metrics.expectancy !== a.metrics.expectancy) return b.metrics.expectancy - a.metrics.expectancy;
    return a.strategy_id.localeCompare(b.strategy_id);
  });

  const valid = candidates.filter((c) => c.reason_code === 'OK').slice(0, topN);
  const best = valid[0] || null;
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({
    seed: costModel.seed,
    best: best?.strategy_id || 'NO_EDGE_FOUND',
    candidates: candidates.map((c) => ({ id: c.strategy_id, net: c.metrics.net_pnl, rc: c.reason_code }))
  })).digest('hex');

  return {
    top_candidates: valid,
    all_candidates: candidates,
    edge_found: Boolean(best),
    best_candidate_id: best?.strategy_id || 'NO_EDGE_FOUND',
    runner_fingerprint: fingerprint
  };
}

function trendFollowerStrategy() {
  return {
    id: 'trend_follow',
    parameterGrid() {
      return [
        { id: 'fast', threshold: 0.001, size: 1.0 },
        { id: 'balanced', threshold: 0.0015, size: 1.2 },
        { id: 'strict', threshold: 0.002, size: 1.4 }
      ];
    },
    run({ rows, params, costModel, simulateFill, rng }) {
      const trades = [];
      for (let i = 1; i < rows.length; i += 1) {
        const prev = rows[i - 1];
        const cur = rows[i];
        const ret = (cur.mid - prev.mid) / prev.mid;
        if (Math.abs(ret) < params.threshold) continue;
        const side = ret > 0 ? 'BUY' : 'SELL';
        const signal = { side, size: costModel.roundQty(params.size), expected_price: cur.mid, timestamp_ms: cur.timestamp_ms };
        const fill = simulateFill(signal, cur, costModel, rng);
        const nextPx = i + 1 < rows.length ? rows[i + 1].mid : cur.mid;
        const direction = side === 'BUY' ? 1 : -1;
        const gross = round((nextPx - fill.fill_price) * direction * signal.size);
        const net = round(gross - fill.fee);
        trades.push({ gross_pnl: gross, net_pnl: net, fill });
      }
      return trades;
    }
  };
}

export function runProfitSearchHarness(opts = {}) {
  const datasets = [
    ['v1', 'core/edge/fixtures/edge_magic_v1.csv'],
    ['v2', 'core/edge/fixtures/edge_magic_v2.csv'],
    ['stress_chop', 'core/edge/fixtures/edge_magic_stress_chop.csv'],
    ['stress_flashcrash', 'core/edge/fixtures/edge_magic_stress_flashcrash.csv'],
    ['stress_spread', 'core/edge/fixtures/edge_magic_stress_spread.csv']
  ].map(([id, rel]) => ({ id, rows: parseEdgeFixtureCsv(path.resolve(rel)) }));

  const costModel = buildExecutionCostModel(opts.costModel);
  const result = runEdgeCandidateRunner({
    strategy: trendFollowerStrategy(),
    datasets,
    topN: Number(opts.topN ?? 5),
    minTrades: Number(opts.minTrades ?? 8),
    costModel
  });

  return { ...result, datasets: datasets.map((d) => d.id), costModel };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runProfitSearchHarness({});
  console.log(JSON.stringify(report, null, 2));
}
