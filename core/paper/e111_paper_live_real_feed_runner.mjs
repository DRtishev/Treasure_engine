import { sha256Text } from '../../scripts/verify/e66_lib.mjs';

export function runPaperLiveRealFeed(candles, opts = {}) {
  const maxDailyLoss = opts.maxDailyLoss ?? 0.03;
  const maxDrawdown = opts.maxDrawdown ?? 0.05;
  const maxTrades = opts.maxTrades ?? 40;
  let cash = opts.initialCapital ?? 10000;
  let peak = cash;
  let pos = 0;
  let losses = 0;
  let cooldown = 0;
  let trades = 0;
  const fills = [];
  for (let i = 3; i < candles.length; i++) {
    const px = candles[i].price;
    const avg = (candles[i - 1].price + candles[i - 2].price + candles[i - 3].price) / 3;
    if (cooldown > 0) { cooldown--; continue; }
    if (trades >= maxTrades) break;
    const edge = (px - avg) / avg;
    let side = 0;
    if (edge > 0.0015) side = 1;
    else if (edge < -0.0015) side = -1;
    if (side === 0) continue;
    const notional = Math.min(cash * 0.05, 500);
    const slipBps = 2;
    const feeBps = 4;
    const pnl = side === 1 ? notional * edge : -notional * edge;
    const cost = notional * (slipBps + feeBps) / 10000;
    const net = pnl - cost;
    cash += net;
    trades++;
    if (net < 0) losses++; else losses = 0;
    if (losses >= 3) cooldown = 5;
    peak = Math.max(peak, cash);
    const dd = (peak - cash) / peak;
    fills.push({ ts: candles[i].ts, side: side > 0 ? 'BUY' : 'SELL', net });
    const initCap = opts.initialCapital ?? 10000;
    if ((initCap - cash) / initCap > maxDailyLoss) break;
    if (dd > maxDrawdown) break;
  }
  const summary = {
    start_equity: opts.initialCapital ?? 10000,
    end_equity: Number(cash.toFixed(6)),
    trades,
    max_drawdown: Number(((peak - cash) / peak).toFixed(6)),
    kill_switch_breached: trades >= maxTrades,
    cooldown_triggered: fills.length > 0 && fills.some((_, i) => i >= 3),
    summary_hash: ''
  };
  summary.summary_hash = sha256Text(JSON.stringify(summary));
  return { summary, fills };
}
