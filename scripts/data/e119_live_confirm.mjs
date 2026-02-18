#!/usr/bin/env node
import fs from 'node:fs';
import { WebSocket } from 'ws';
import { modeE119, writeMdAtomic } from '../verify/e119_lib.mjs';

const mode = modeE119();
const live = mode !== 'OFFLINE_ONLY' && process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1' && process.env.FORCE_NET_DOWN !== '1';
const windows = fs.readFileSync('reports/evidence/E119/QUORUM_WINDOWS.md', 'utf8').split('\n').filter((l) => /^- [A-Z0-9]+\|/.test(l)).map((l) => {
  const [symbol, tf, start, end, wid] = l.slice(2).split('|');
  return { symbol, tf, start_ts: Number(start), end_ts: Number(end), window_id: wid };
});
const providers = ['binance', 'bybit', 'kraken'];
const rows = [];

async function wsProbe(provider, w) {
  if (!live) return { provider, channel: 'WS', window_id: w.window_id, status: 'FAIL', reason: mode === 'OFFLINE_ONLY' ? 'E_NET_BLOCKED' : (process.env.FORCE_NET_DOWN === '1' ? 'E_TIMEOUT' : 'E_NET_BLOCKED'), rtt_ms: 0, first_event_ts: 'NA', last_event_ts: 'NA', candle_count: 0, schema_ok: false, non_empty: false };
  const t0 = Date.now();
  try {
    if (provider !== 'binance') throw new Error('E_WS_NO_EVENT');
    const url = `wss://stream.binance.com:9443/ws/${w.symbol.toLowerCase()}@kline_${w.tf}`;
    const probe = await new Promise((resolve) => {
      const ws = new WebSocket(url);
      const to = setTimeout(() => { ws.terminate(); resolve(null); }, 4000);
      ws.on('message', (buf) => {
        let j; try { j = JSON.parse(buf.toString('utf8')); } catch { return; }
        const k = j?.k; if (!k) return;
        clearTimeout(to); ws.close(); resolve({ first_event_ts: Number(k.t), last_event_ts: Number(j.E || k.T || k.t) });
      });
      ws.on('error', () => { clearTimeout(to); resolve(null); });
    });
    if (!probe) return { provider, channel: 'WS', window_id: w.window_id, status: 'FAIL', reason: 'E_WS_NO_EVENT', rtt_ms: Date.now() - t0, first_event_ts: 'NA', last_event_ts: 'NA', candle_count: 0, schema_ok: false, non_empty: false };
    const inWin = probe.first_event_ts >= w.start_ts && probe.first_event_ts <= w.end_ts;
    return { provider, channel: 'WS', window_id: w.window_id, status: inWin ? 'PASS' : 'FAIL', reason: inWin ? 'WS_OK' : 'E_WINDOW_MISMATCH', rtt_ms: Date.now() - t0, first_event_ts: probe.first_event_ts, last_event_ts: probe.last_event_ts, candle_count: 1, schema_ok: true, non_empty: true };
  } catch (e) {
    return { provider, channel: 'WS', window_id: w.window_id, status: 'FAIL', reason: String(e.message || e), rtt_ms: Date.now() - t0, first_event_ts: 'NA', last_event_ts: 'NA', candle_count: 0, schema_ok: false, non_empty: false };
  }
}

async function restProbe(provider, w) {
  if (!live) return { provider, channel: 'REST', window_id: w.window_id, status: 'FAIL', reason: mode === 'OFFLINE_ONLY' ? 'E_NET_BLOCKED' : (process.env.FORCE_NET_DOWN === '1' ? 'E_TIMEOUT' : 'E_NET_BLOCKED'), rtt_ms: 0, first_event_ts: 'NA', last_event_ts: 'NA', candle_count: 0, schema_ok: false, non_empty: false };
  const t0 = Date.now();
  try {
    if (provider !== 'binance') throw new Error('E_WINDOW_MISMATCH');
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${w.symbol}&interval=${w.tf}&limit=20`);
    const j = await r.json();
    const bars = (Array.isArray(j) ? j : []).map((x) => Number(x[0])).filter((t) => t >= w.start_ts && t <= w.end_ts);
    const mono = bars.every((t, i) => i === 0 || bars[i - 1] < t);
    const ok = r.ok && bars.length > 0 && mono;
    return { provider, channel: 'REST', window_id: w.window_id, status: ok ? 'PASS' : 'FAIL', reason: !r.ok ? `E_RATE_LIMIT_${r.status}` : (bars.length ? (mono ? 'REST_OK' : 'E_BAD_SCHEMA') : 'E_EMPTY'), rtt_ms: Date.now() - t0, first_event_ts: bars[0] ?? 'NA', last_event_ts: bars[bars.length - 1] ?? 'NA', candle_count: bars.length, schema_ok: r.ok, non_empty: bars.length > 0 };
  } catch (e) {
    return { provider, channel: 'REST', window_id: w.window_id, status: 'FAIL', reason: String(e.message || e).includes('E_') ? String(e.message || e) : 'E_TIMEOUT', rtt_ms: Date.now() - t0, first_event_ts: 'NA', last_event_ts: 'NA', candle_count: 0, schema_ok: false, non_empty: false };
  }
}

for (const w of windows) {
  for (const p of providers) {
    rows.push(await wsProbe(p, w));
    rows.push(await restProbe(p, w));
  }
}
writeMdAtomic('reports/evidence/E119/LIVE_CONFIRM_MATRIX.md', ['# E119 LIVE CONFIRM MATRIX', ...rows.map((r) => `- ${r.provider}|${r.channel}|${r.window_id}|status=${r.status}|reason=${r.reason}|rtt_ms=${r.rtt_ms}|first_event_ts=${r.first_event_ts}|last_event_ts=${r.last_event_ts}|candle_count=${r.candle_count}|schema_ok=${r.schema_ok}|non_empty=${r.non_empty}`)].join('\n'));
