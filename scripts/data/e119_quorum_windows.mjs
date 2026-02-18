#!/usr/bin/env node
import crypto from 'node:crypto';
import { writeMdAtomic } from '../verify/e119_lib.mjs';

const symbols = (process.env.SYMBOLS || 'BTCUSDT').split(',').map((s) => s.trim()).filter(Boolean).sort();
const tf = process.env.TF || '5m';
const lookback = Number(process.env.LOOKBACK_BARS || 12);
const windowSize = Number(process.env.WINDOW_SIZE_BARS || 4);
const maxDrift = Number(process.env.MAX_TIME_DRIFT_SEC || 45);
const freshnessSla = Number(process.env.FRESHNESS_SLA_SEC || 600);
const tfMs = tf === '1m' ? 60_000 : 300_000;
const end = Math.floor(Date.now() / tfMs) * tfMs;
const windows = [];
for (const symbol of symbols) {
  for (let offset = lookback - windowSize; offset >= 0; offset -= windowSize) {
    const start_ts = end - ((offset + windowSize) * tfMs);
    const end_ts = start_ts + ((windowSize - 1) * tfMs);
    const raw = `${symbol}|${tf}|${start_ts}|${end_ts}|${windowSize}|${maxDrift}|${freshnessSla}`;
    const window_id = crypto.createHash('sha256').update(raw).digest('hex');
    windows.push({ symbol, tf, start_ts, end_ts, window_id, maxDrift, freshnessSla });
  }
}
windows.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.start_ts - b.start_ts || a.window_id.localeCompare(b.window_id));
writeMdAtomic('reports/evidence/E119/QUORUM_WINDOWS.md', ['# E119 QUORUM WINDOWS', `- symbols: ${symbols.join(',')}`, `- tf: ${tf}`, `- lookback_bars: ${lookback}`, `- window_size_bars: ${windowSize}`, `- max_time_drift_sec: ${maxDrift}`, `- freshness_sla_sec: ${freshnessSla}`, ...windows.map((w) => `- ${w.symbol}|${w.tf}|${w.start_ts}|${w.end_ts}|${w.window_id}`)].join('\n'));
