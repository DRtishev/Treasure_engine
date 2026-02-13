import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseJsonl } from '../edge/data_contracts.mjs';
import { calibrateExecutionRealismFromPrivateFills, deterministicPartialFill } from '../edge/execution_realism.mjs';
import { applyRiskFortress } from '../edge/risk_fortress.mjs';

function loadMarketRows(datasetId, provider = 'binance') {
  const dir = path.resolve(`data/normalized/${provider}/${datasetId}/chunks`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  let rows = [];
  for (const f of files) rows = rows.concat(parseJsonl(fs.readFileSync(path.join(dir, f), 'utf8')));
  rows.sort((a, b) => a.ts_ms - b.ts_ms || a.output_fingerprint.localeCompare(b.output_fingerprint));
  return rows;
}

export function runPaperTradingSession(config = {}) {
  const {
    market_dataset_id = 'e49_fixture',
    market_provider = 'binance',
    fills_dataset_id = 'epoch50_fixture',
    fills_provider = 'binance',
    seed = 5101,
    strict = false,
    shadow_only = true,
    initial_capital = 10000
  } = config;

  if (!shadow_only || process.env.SHADOW_ONLY === '0') throw new Error('Hard fuse: SHADOW_ONLY required');

  const market = loadMarketRows(market_dataset_id, market_provider);
  const calibration = calibrateExecutionRealismFromPrivateFills({ fills_dataset_id, provider: fills_provider, strict, seed });

  let capital = initial_capital;
  let position = 0;
  let avgPx = 0;
  let grossPnl = 0;
  let fees = 0;
  let slippageCost = 0;
  const fills = [];
  const riskEvents = [];
  const freshnessStats = { allow: 0, blocked: 0 };

  let dayLossPct = 0;
  for (let i = 0; i < market.length; i += 1) {
    const m = market[i];
    const side = i % 2 === 0 ? 'BUY' : 'SELL';
    const intendedNotional = 120;
    const risk = applyRiskFortress({
      tradeLossPct: side === 'SELL' && i >= 2 ? 0.03 : 0,
      dayLossPct,
      weekLossPct: dayLossPct,
      dd: Math.max(0, (initial_capital - capital) / initial_capital),
      dd_speed: 0.01,
      vol_regime: 'MID'
    });

    if (risk.hard_stop.halt) {
      riskEvents.push({ ts_ms: m.ts_ms, reason: risk.hard_stop.reason, state: risk.state });
      freshnessStats.blocked += 1;
      continue;
    }

    freshnessStats.allow += 1;
    const effectiveNotional = intendedNotional * risk.size_factor;
    const partial = deterministicPartialFill(effectiveNotional, 20_000_000);
    const fillNotional = partial.filled_usd;
    const qty = fillNotional / m.price;
    const slipBps = calibration.params.slip_mean_bps;
    const execPrice = side === 'BUY'
      ? m.price * (1 + slipBps / 10000)
      : m.price * (1 - slipBps / 10000);
    const fee = fillNotional * 0.0004;

    slippageCost += Math.abs(execPrice - m.price) * qty;
    fees += fee;

    if (side === 'BUY') {
      const newPos = position + qty;
      avgPx = newPos > 0 ? ((avgPx * position) + (execPrice * qty)) / newPos : 0;
      position = newPos;
      capital -= (qty * execPrice + fee);
    } else {
      const closeQty = Math.min(position, qty);
      grossPnl += closeQty * (execPrice - avgPx);
      position -= closeQty;
      capital += closeQty * execPrice - fee;
      dayLossPct = Math.max(dayLossPct, grossPnl < 0 ? Math.abs(grossPnl) / initial_capital : 0);
    }

    fills.push({ ts_ms: m.ts_ms, side, qty, market_price: m.price, exec_price: execPrice, fee, risk_state: risk.state, hard_stop: risk.hard_stop.halt });
  }

  const netPnl = grossPnl - fees - slippageCost;
  const report = {
    schema_version: '1.0.0',
    mode: calibration.mode,
    calibration_manifest: calibration.manifest,
    trades: fills,
    metrics: {
      paper_fills: fills.length,
      gross_pnl: Number(grossPnl.toFixed(8)),
      fees: Number(fees.toFixed(8)),
      slippage_cost: Number(slippageCost.toFixed(8)),
      net_pnl: Number(netPnl.toFixed(8)),
      hard_stops_triggered: riskEvents.length
    },
    risk_events: riskEvents,
    freshness_stats: freshnessStats,
    overfit_advisory_path: 'reports/evidence/EPOCH-43/gates/manual/overfit_metrics.json'
  };

  const inputsFp = crypto.createHash('sha256').update(JSON.stringify({ market_dataset_id, fills_dataset_id, seed, strict })).digest('hex');
  const outputFp = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
  return {
    report,
    fingerprint: {
      input_fingerprint: inputsFp,
      output_fingerprint: outputFp
    },
    calibration
  };
}
