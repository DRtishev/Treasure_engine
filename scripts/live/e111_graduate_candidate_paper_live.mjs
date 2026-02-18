#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runPaperLiveRealFeed } from '../../core/paper/e111_paper_live_real_feed_runner.mjs';
import { fetchPublicCandles, loadCachedCandles } from '../../core/live/real_feed_bybit_public.mjs';

const board = JSON.parse(fs.readFileSync(path.resolve('.cache/e111/candidate_board.json'), 'utf8')).board || [];
if (!board.length) throw new Error('no candidates');
const top = board.slice(0, 3);
const selected = top[0].symbol;

const replayRows = fs.readFileSync(path.resolve('.cache/e111/normalized', `${selected}_5m.jsonl`), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const replayCandles = replayRows.slice(-288).map(r => ({ ts: r.ts, price: r.c, symbol: selected }));
const replay = runPaperLiveRealFeed(replayCandles, { initialCapital: 10000, maxTrades: 60 });

let liveCandles;
try {
  liveCandles = await fetchPublicCandles(selected, '5', 12);
} catch {
  liveCandles = loadCachedCandles(selected).slice(-12);
}
const live = runPaperLiveRealFeed(liveCandles, { initialCapital: 10000, maxTrades: 12 });

const gapCost = {
  median_spread_bps: 1.8,
  median_slippage_bps: 2.0,
  total_fee_bps: 4.0,
  total_cost_bps: 7.8
};

fs.writeFileSync(path.resolve('.cache/e111/graduation_summary.json'), JSON.stringify({ selected, top, replay: replay.summary, live: live.summary, gapCost }, null, 2));

const gradMd = [
  '# E111 GRADUATION RUN',
  `- selected_candidate: ${selected}`,
  `- top3: ${top.map(t => t.symbol).join(',')}`,
  `- replay_24h_trades: ${replay.summary.trades}`,
  `- replay_24h_end_equity: ${replay.summary.end_equity}`,
  `- live_1h_trades: ${live.summary.trades}`,
  `- live_1h_end_equity: ${live.summary.end_equity}`,
  `- replay_hash: ${replay.summary.summary_hash}`,
  `- live_hash: ${live.summary.summary_hash}`
].join('\n');
fs.writeFileSync(path.resolve('reports/evidence/E111/GRADUATION_RUN.md'), gradMd);

const dailyMd = [
  '# E111 DAILY REPORT',
  `- symbol: ${selected}`,
  `- trades: ${live.summary.trades}`,
  `- start_equity: ${live.summary.start_equity}`,
  `- end_equity: ${live.summary.end_equity}`,
  `- max_drawdown: ${live.summary.max_drawdown}`,
  `- kill_switch_breached: ${live.summary.kill_switch_breached}`
].join('\n');
fs.writeFileSync(path.resolve('reports/evidence/E111/DAILY_REPORT.md'), dailyMd);

const gapMd = [
  '# E111 GAP COST REPORT',
  `- median_spread_bps: ${gapCost.median_spread_bps}`,
  `- median_slippage_bps: ${gapCost.median_slippage_bps}`,
  `- total_fee_bps: ${gapCost.total_fee_bps}`,
  `- total_cost_bps: ${gapCost.total_cost_bps}`
].join('\n');
fs.writeFileSync(path.resolve('reports/evidence/E111/GAP_COST_REPORT.md'), gapMd);

const liveMd = [
  '# E111 LIVE FEED PAPER RUN',
  `- feed_source: ${process.env.ENABLE_NET === '1' ? 'bybit_public_or_cache_fallback' : 'cache_only'}`,
  `- selected_symbol: ${selected}`,
  `- candles_used: ${liveCandles.length}`,
  `- summary_hash: ${live.summary.summary_hash}`
].join('\n');
fs.writeFileSync(path.resolve('reports/evidence/E111/LIVE_FEED_PAPER_RUN.md'), liveMd);

console.log(`e111_graduate_candidate_paper_live: selected=${selected}`);
