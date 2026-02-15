#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalStringify } from '../contracts.mjs';

const FIXTURE_V2 = path.resolve('core/edge/fixtures/edge_magic_v2.csv');

function round(value, scale = 8) {
  const factor = 10 ** scale;
  return Math.round(value * factor) / factor;
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  const [header, ...rows] = raw.split(/\r?\n/);
  if (header !== 'ts,close,signal') throw new Error('EDGE_MAGIC_V2_FIXTURE_INVALID_HEADER');
  return rows
    .map((line) => {
      const [ts, closeRaw, signalRaw] = line.split(',');
      return { ts, close: Number(closeRaw), signal: Number(signalRaw) };
    })
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

function evaluateBars(bars, params) {
  let position = 0;
  let entry = 0;
  let pnl = 0;
  const tradeReturns = [];
  const eq = [0];

  for (const bar of bars) {
    const target = bar.signal;
    if (position === 0 && target !== 0) {
      position = target;
      entry = bar.close;
      continue;
    }
    if (position !== 0 && target !== position) {
      const gross = (bar.close - entry) * position * params.qty;
      const fee = ((Math.abs(bar.close) + Math.abs(entry)) * params.qty * params.fee_bps) / 10000;
      const net = gross - fee - params.risk_penalty;
      tradeReturns.push(round(net));
      pnl += net;
      eq.push(round(eq.at(-1) + net));
      position = target;
      entry = bar.close;
    }
  }

  if (position !== 0 && bars.length > 0) {
    const last = bars.at(-1);
    const gross = (last.close - entry) * position * params.qty;
    const fee = ((Math.abs(last.close) + Math.abs(entry)) * params.qty * params.fee_bps) / 10000;
    const net = gross - fee - params.risk_penalty;
    tradeReturns.push(round(net));
    pnl += net;
    eq.push(round(eq.at(-1) + net));
  }

  const trades = tradeReturns.length;
  const wins = tradeReturns.filter((x) => x > 0).length;
  const winrate = trades === 0 ? 0 : wins / trades;
  const pos = tradeReturns.filter((x) => x > 0).reduce((a, b) => a + b, 0);
  const neg = Math.abs(tradeReturns.filter((x) => x < 0).reduce((a, b) => a + b, 0));
  const pf = neg === 0 ? 0 : pos / neg;

  let peak = eq[0];
  let maxDd = 0;
  let currentLossRun = 0;
  let worstRun = 0;
  for (const v of eq) {
    peak = Math.max(peak, v);
    maxDd = Math.max(maxDd, peak - v);
  }
  for (const r of tradeReturns) {
    if (r < 0) {
      currentLossRun += 1;
      worstRun = Math.max(worstRun, currentLossRun);
    } else {
      currentLossRun = 0;
    }
  }

  const mean = trades === 0 ? 0 : tradeReturns.reduce((a, b) => a + b, 0) / trades;
  const variance = trades === 0 ? 0 : tradeReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / trades;
  const sharpe = variance === 0 ? 0 : mean / Math.sqrt(variance);
  const expectancy = trades === 0 ? 0 : tradeReturns.reduce((a, b) => a + b, 0) / trades;

  return {
    trades,
    winrate: round(winrate),
    profit_factor: round(pf),
    max_drawdown: round(maxDd),
    sharpe_like: round(sharpe),
    expectancy: round(expectancy),
    worst_run: worstRun,
    net_pnl: round(pnl)
  };
}

export function runEdgeMagicSuiteV2(options = {}) {
  const params = {
    fee_bps: round(Number(options.fee_bps ?? 8), 8),
    qty: round(Number(options.qty ?? 1), 8),
    risk_penalty: round(Number(options.risk_penalty ?? 0.01), 8)
  };
  const bars = parseCsv(options.fixturePath || FIXTURE_V2);
  const windows = [
    { id: 'train', start: 0, end: 6 },
    { id: 'validate', start: 6, end: 12 },
    { id: 'test', start: 12, end: bars.length }
  ];

  const windowResults = windows
    .map((w) => ({
      window_id: w.id,
      start_ts: bars[w.start]?.ts || '',
      end_ts: bars[Math.max(w.end - 1, w.start)]?.ts || '',
      metrics: evaluateBars(bars.slice(w.start, w.end), params)
    }))
    .sort((a, b) => a.window_id.localeCompare(b.window_id));

  const aggregate = {
    trades: windowResults.reduce((a, w) => a + w.metrics.trades, 0),
    winrate: round(windowResults.reduce((a, w) => a + w.metrics.winrate, 0) / windowResults.length),
    profit_factor: round(windowResults.reduce((a, w) => a + w.metrics.profit_factor, 0) / windowResults.length),
    max_drawdown: round(Math.max(...windowResults.map((w) => w.metrics.max_drawdown))),
    sharpe_like: round(windowResults.reduce((a, w) => a + w.metrics.sharpe_like, 0) / windowResults.length),
    expectancy: round(windowResults.reduce((a, w) => a + w.metrics.expectancy, 0) / windowResults.length),
    worst_run: Math.max(...windowResults.map((w) => w.metrics.worst_run)),
    net_pnl: round(windowResults.reduce((a, w) => a + w.metrics.net_pnl, 0))
  };

  const reportCore = {
    suite: 'edge_magic_suite_v2',
    params,
    windows: windowResults,
    aggregate
  };
  const deterministicFingerprint = crypto.createHash('sha256').update(canonicalStringify(reportCore)).digest('hex');
  return { ...reportCore, deterministic_fingerprint: deterministicFingerprint };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runEdgeMagicSuiteV2(), null, 2));
}
