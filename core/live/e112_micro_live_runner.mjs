import fs from 'node:fs';
import path from 'node:path';
import { createLedger, recordFill, getLedgerSummary } from '../profit/ledger.mjs';
import { sha256Text } from '../../scripts/verify/e66_lib.mjs';
import { modeState } from '../../scripts/verify/e112_lib.mjs';

export function runMicroLive(candles, opts = {}) {
  if (opts.replay24h !== 1) throw new Error('E112_REPLAY_24H_REQUIRED');
  const mode = modeState();
  if (opts.live1h === 1 && mode !== 'ONLINE_REQUIRED') throw new Error('E112_LIVE_1H_REQUIRES_ONLINE_REQUIRED');
  if (opts.live1h === 1) {
    const np = fs.readFileSync(path.resolve('reports/evidence/E112/NET_PROOF.md'), 'utf8');
    if (!/checks_passed:\s*3\/3/.test(np) || !/status:\s*PASS/.test(np)) throw new Error('E112_LIVE_1H_NET_PROOF_REQUIRED');
  }

  const policy = { cap: 100, dailyRisk: 20, maxTrades: opts.maxTrades ?? 20, cooldownAfterLosses: 3 };
  const ledger = createLedger({ initial_capital: 10000, created_at: '2026-01-01T00:00:00Z' });
  let losses = 0, cooldown = 0, trades = 0, kill = false;
  for (let i = 3; i < candles.length; i++) {
    if (cooldown > 0) { cooldown--; continue; }
    if (trades >= policy.maxTrades) { kill = true; break; }
    const px = candles[i].price;
    const avg = (candles[i - 1].price + candles[i - 2].price + candles[i - 3].price) / 3;
    const edge = (px - avg) / avg;
    let side = null;
    if (edge > 0.0015) side = 'BUY';
    else if (edge < -0.0015) side = 'SELL';
    if (!side) continue;
    const notional = Math.min(policy.cap, ledger.initial_capital * 0.01);
    const qty = notional / px;
    const exec = side === 'BUY' ? px * 1.0002 : px * 0.9998;
    const fee = notional * 0.0004;
    recordFill(ledger, { symbol: candles[i].symbol, side, qty, price: px, exec_price: exec, fee, ts: candles[i].ts });
    const est = (side === 'BUY' ? (px - exec) : (exec - px)) * qty - fee;
    if (est < 0) losses += 1; else losses = 0;
    if (losses >= policy.cooldownAfterLosses) cooldown = 3;
    trades += 1;
    const ddUsd = ledger.initial_capital * getLedgerSummary(ledger, { [candles[i].symbol]: px }).max_drawdown;
    if (ddUsd > policy.dailyRisk) { kill = true; break; }
  }
  const last = candles[candles.length - 1];
  const summary = getLedgerSummary(ledger, { [last.symbol]: last.price });
  const det = { policy, trades, kill_switch: kill, max_drawdown: summary.max_drawdown, total_fills: summary.total_fills, end_equity: summary.equity };
  const summaryHash = sha256Text(JSON.stringify(det));
  return { ledger, summary, policy, kill_switch: kill, summary_hash: summaryHash };
}
