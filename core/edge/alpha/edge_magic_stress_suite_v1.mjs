#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalStringify } from '../contracts.mjs';

const FIXTURES = [
  { id: 'flashcrash', path: path.resolve('core/edge/fixtures/edge_magic_stress_flashcrash.csv') },
  { id: 'chop', path: path.resolve('core/edge/fixtures/edge_magic_stress_chop.csv') },
  { id: 'spread', path: path.resolve('core/edge/fixtures/edge_magic_stress_spread.csv') }
];

const CONFIGS = [
  { id: 'aggressive', qty: 1.4, fee_bps: 8, slippage_bps: 6, risk_penalty: 0.006 },
  { id: 'baseline', qty: 1.0, fee_bps: 8, slippage_bps: 4, risk_penalty: 0.01 },
  { id: 'defensive', qty: 0.7, fee_bps: 8, slippage_bps: 2, risk_penalty: 0.015 }
].sort((a, b) => a.id.localeCompare(b.id));

function round(value, scale = 8) {
  const factor = 10 ** scale;
  return Math.round(value * factor) / factor;
}

function lcg(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function parseCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').trim();
  const [header, ...rows] = raw.split(/\r?\n/);
  if (header !== 'ts,close,signal') throw new Error(`EDGE_STRESS_BAD_HEADER ${csvPath}`);
  return rows.map((line) => {
    const [ts, c, s] = line.split(',');
    return { ts, close: Number(c), signal: Number(s) };
  }).sort((a, b) => a.ts.localeCompare(b.ts));
}

function evaluateScenario(bars, config, seed) {
  const rand = lcg(seed);
  let position = 0;
  let entryPrice = 0;
  let entryIx = -1;
  let net = 0;
  let feeSlippageImpact = 0;
  const returns = [];
  const holds = [];
  const equity = [0];

  for (let i = 0; i < bars.length; i += 1) {
    const bar = bars[i];
    const target = bar.signal;
    const noise = round((rand() - 0.5) * 0.002, 8);
    const px = round(bar.close * (1 + noise), 8);

    if (position === 0 && target !== 0) {
      position = target;
      entryPrice = px;
      entryIx = i;
      continue;
    }

    if (position !== 0 && target !== position) {
      const gross = round((px - entryPrice) * position * config.qty, 8);
      const fee = round(((Math.abs(px) + Math.abs(entryPrice)) * config.qty * config.fee_bps) / 10000, 8);
      const slip = round(((Math.abs(px) + Math.abs(entryPrice)) * config.qty * config.slippage_bps) / 10000, 8);
      const tradeNet = round(gross - fee - slip - config.risk_penalty, 8);
      returns.push(tradeNet);
      holds.push(i - entryIx);
      net = round(net + tradeNet, 8);
      feeSlippageImpact = round(feeSlippageImpact + fee + slip + config.risk_penalty, 8);
      equity.push(round(equity.at(-1) + tradeNet, 8));
      position = target;
      entryPrice = px;
      entryIx = target === 0 ? -1 : i;
    }
  }

  if (position !== 0 && entryIx >= 0) {
    const i = bars.length - 1;
    const bar = bars.at(-1);
    const noise = round((rand() - 0.5) * 0.002, 8);
    const px = round(bar.close * (1 + noise), 8);
    const gross = round((px - entryPrice) * position * config.qty, 8);
    const fee = round(((Math.abs(px) + Math.abs(entryPrice)) * config.qty * config.fee_bps) / 10000, 8);
    const slip = round(((Math.abs(px) + Math.abs(entryPrice)) * config.qty * config.slippage_bps) / 10000, 8);
    const tradeNet = round(gross - fee - slip - config.risk_penalty, 8);
    returns.push(tradeNet);
    holds.push(i - entryIx + 1);
    net = round(net + tradeNet, 8);
    feeSlippageImpact = round(feeSlippageImpact + fee + slip + config.risk_penalty, 8);
    equity.push(round(equity.at(-1) + tradeNet, 8));
  }

  const trades = returns.length;
  const wins = returns.filter((v) => v > 0).length;
  const winrate = trades === 0 ? 0 : wins / trades;
  const pos = returns.filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const neg = Math.abs(returns.filter((v) => v < 0).reduce((a, b) => a + b, 0));
  const pf = neg === 0 ? 0 : pos / neg;

  let peak = equity[0];
  let maxDd = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    maxDd = Math.max(maxDd, peak - v);
  }

  let run = 0;
  let worstRun = 0;
  for (const v of returns) {
    if (v < 0) {
      run += 1;
      worstRun = Math.max(worstRun, run);
    } else {
      run = 0;
    }
  }

  const mean = trades === 0 ? 0 : returns.reduce((a, b) => a + b, 0) / trades;
  const variance = trades === 0 ? 0 : returns.reduce((a, b) => a + ((b - mean) ** 2), 0) / trades;

  return {
    trades,
    winrate: round(winrate, 8),
    profit_factor: round(pf, 8),
    max_drawdown: round(maxDd, 8),
    sharpe_simple: round(variance === 0 ? 0 : mean / Math.sqrt(variance), 8),
    expectancy: round(mean, 8),
    worst_run: worstRun,
    avg_hold: round(holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0, 8),
    fee_slippage_impact: round(feeSlippageImpact, 8),
    net_pnl: round(net, 8)
  };
}

export function runEdgeStressSuiteV1(opts = {}) {
  const seed = Number(opts.seed ?? process.env.SEED ?? 12345);
  const rows = [];
  for (const fixture of FIXTURES) {
    const bars = parseCsv(fixture.path);
    for (const cfg of CONFIGS) {
      const scenSeed = seed + fixture.id.length * 100 + cfg.id.length;
      rows.push({
        dataset: fixture.id,
        config: cfg.id,
        metrics: evaluateScenario(bars, cfg, scenSeed)
      });
    }
  }
  rows.sort((a, b) => `${a.dataset}:${a.config}`.localeCompare(`${b.dataset}:${b.config}`));

  const aggregate = {
    scenarios: rows.length,
    trades: rows.reduce((a, r) => a + r.metrics.trades, 0),
    winrate: round(rows.reduce((a, r) => a + r.metrics.winrate, 0) / rows.length, 8),
    profit_factor: round(rows.reduce((a, r) => a + r.metrics.profit_factor, 0) / rows.length, 8),
    max_drawdown: round(Math.max(...rows.map((r) => r.metrics.max_drawdown)), 8),
    sharpe_simple: round(rows.reduce((a, r) => a + r.metrics.sharpe_simple, 0) / rows.length, 8),
    expectancy: round(rows.reduce((a, r) => a + r.metrics.expectancy, 0) / rows.length, 8),
    worst_run: Math.max(...rows.map((r) => r.metrics.worst_run)),
    avg_hold: round(rows.reduce((a, r) => a + r.metrics.avg_hold, 0) / rows.length, 8),
    fee_slippage_impact: round(rows.reduce((a, r) => a + r.metrics.fee_slippage_impact, 0), 8),
    net_pnl: round(rows.reduce((a, r) => a + r.metrics.net_pnl, 0), 8)
  };

  const core = {
    suite: 'edge_stress_suite_v1',
    seed,
    scenarios: rows,
    aggregate
  };
  const deterministic_fingerprint = crypto.createHash('sha256').update(canonicalStringify(core)).digest('hex');
  return { ...core, deterministic_fingerprint };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runEdgeStressSuiteV1(), null, 2));
}
