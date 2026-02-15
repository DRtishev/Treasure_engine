#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalStringify } from '../contracts.mjs';

const FIXTURE = path.resolve('core/edge/fixtures/edge_magic_v1.csv');

function round(value, scale = 6) {
  const factor = 10 ** scale;
  return Math.round(value * factor) / factor;
}

function parseFixture(csvPath = FIXTURE) {
  const raw = fs.readFileSync(csvPath, 'utf8').trim();
  const [header, ...rows] = raw.split(/\r?\n/);
  if (header !== 'ts,close,signal') throw new Error('EDGE_MAGIC_FIXTURE_INVALID_HEADER');
  return rows.map((line) => {
    const [ts, closeRaw, signalRaw] = line.split(',');
    return { ts, close: Number(closeRaw), signal: Number(signalRaw) };
  }).sort((a, b) => a.ts.localeCompare(b.ts));
}

export function runEdgeMagicV1(params = {}) {
  const normalizedParams = {
    fee_bps: round(Number(params.fee_bps ?? 8), 4),
    qty: round(Number(params.qty ?? 1), 4),
    risk_penalty_per_trade: round(Number(params.risk_penalty_per_trade ?? 0.01), 6)
  };
  const bars = parseFixture(params.fixturePath);
  let position = 0;
  let entryPrice = 0;
  let gross = 0;
  let costs = 0;
  const returns = [];
  const equityCurve = [0];
  let tradeCount = 0;

  for (const bar of bars) {
    const target = bar.signal;
    if (position === 0 && target !== 0) {
      position = target;
      entryPrice = bar.close;
    } else if (position !== 0 && target !== position) {
      const pnl = (bar.close - entryPrice) * position * normalizedParams.qty;
      const fee = ((Math.abs(bar.close) + Math.abs(entryPrice)) * normalizedParams.qty * normalizedParams.fee_bps) / 10000;
      const netTrade = pnl - fee - normalizedParams.risk_penalty_per_trade;
      gross += pnl;
      costs += fee + normalizedParams.risk_penalty_per_trade;
      returns.push(netTrade);
      equityCurve.push(round(equityCurve.at(-1) + netTrade));
      tradeCount += 1;
      position = target;
      entryPrice = bar.close;
    }
  }

  if (position !== 0) {
    const last = bars.at(-1);
    const pnl = (last.close - entryPrice) * position * normalizedParams.qty;
    const fee = ((Math.abs(last.close) + Math.abs(entryPrice)) * normalizedParams.qty * normalizedParams.fee_bps) / 10000;
    const netTrade = pnl - fee - normalizedParams.risk_penalty_per_trade;
    gross += pnl;
    costs += fee + normalizedParams.risk_penalty_per_trade;
    returns.push(netTrade);
    equityCurve.push(round(equityCurve.at(-1) + netTrade));
    tradeCount += 1;
  }

  let peak = equityCurve[0];
  let maxDrawdown = 0;
  for (const value of equityCurve) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, peak - value);
  }

  const posSum = returns.filter((x) => x > 0).reduce((a, b) => a + b, 0);
  const negSum = Math.abs(returns.filter((x) => x < 0).reduce((a, b) => a + b, 0));
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((a, b) => a + ((b - mean) ** 2), 0) / returns.length : 0;
  const sharpeLike = variance > 0 ? mean / Math.sqrt(variance) : 0;

  const reportCore = {
    params: normalizedParams,
    trade_count: tradeCount,
    gross_pnl: round(gross),
    net_pnl: round(gross - costs),
    max_drawdown: round(maxDrawdown),
    profit_factor: negSum === 0 ? 0 : round(posSum / negSum),
    sharpe_like: round(sharpeLike)
  };

  const deterministicFingerprint = crypto.createHash('sha256').update(canonicalStringify(reportCore)).digest('hex');
  return { ...reportCore, deterministic_fingerprint: deterministicFingerprint };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runEdgeMagicV1(), null, 2));
}
