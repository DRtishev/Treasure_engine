#!/usr/bin/env node
import { WebSocket } from 'ws';
import { modeE118, writeMdAtomic } from '../verify/e118_lib.mjs';

const mode = modeE118();
const symbol = (process.env.E118_SYMBOL || 'BTCUSDT').toUpperCase();
const tf = process.env.E118_INTERVAL || '5m';
const forceDown = process.env.FORCE_NET_DOWN === '1';
const netOn = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1' && !forceDown;
const providers = [
  { provider: 'binance', ws: `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${tf}`, rest: `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=5`, wsSub: null, wsCheck: (j) => Boolean(j?.k) },
  { provider: 'bybit', ws: 'wss://stream.bybit.com/v5/public/linear', rest: `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=5`, wsSub: { op: 'subscribe', args: [`kline.5.${symbol}`] }, wsCheck: (j) => Array.isArray(j?.data) && j.data.length > 0 },
  { provider: 'kraken', ws: 'wss://ws.kraken.com/v2', rest: `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=5`, wsSub: { method: 'subscribe', params: { channel: 'ohlc', symbol: ['BTC/USD'], interval: 5 } }, wsCheck: (j) => Array.isArray(j?.data) && j.data.length > 0 }
];

async function probeRest(p) {
  const t0 = Date.now();
  if (!netOn || mode === 'OFFLINE_ONLY') return { provider: p.provider, channel: 'REST', endpoint: p.rest, attempt: 1, status: 'SKIP', reason_code: mode === 'OFFLINE_ONLY' ? 'SKIPPED_BY_MODE' : 'NET_GUARD_OFF', rtt_ms: 0, schema_ok: false, non_empty: false };
  try {
    const r = await fetch(p.rest);
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch {}
    const rows = Array.isArray(j) ? j : (Array.isArray(j?.result?.list) ? j.result.list : (j?.result ? Object.values(j.result).find(Array.isArray) || [] : []));
    const monotonic = rows.length < 2 || rows.every((x, i) => i === 0 || Number(rows[i - 1][0] ?? rows[i - 1].start ?? rows[i - 1]) <= Number(x[0] ?? x.start ?? x));
    return { provider: p.provider, channel: 'REST', endpoint: p.rest, attempt: 1, status: r.ok && rows.length && monotonic ? 'PASS' : 'FAIL', reason_code: r.ok ? (rows.length ? (monotonic ? 'REST_OK' : 'E_SCHEMA_DRIFT') : 'E_EMPTY') : `HTTP_${r.status}`, rtt_ms: Date.now() - t0, schema_ok: r.ok, non_empty: rows.length > 0 };
  } catch {
    return { provider: p.provider, channel: 'REST', endpoint: p.rest, attempt: 1, status: 'FAIL', reason_code: 'E_PROVIDER_DOWN', rtt_ms: Date.now() - t0, schema_ok: false, non_empty: false };
  }
}

async function probeWs(p) {
  const t0 = Date.now();
  if (!netOn || mode === 'OFFLINE_ONLY') return { provider: p.provider, channel: 'WS', endpoint: p.ws, attempt: 1, status: 'SKIP', reason_code: mode === 'OFFLINE_ONLY' ? 'SKIPPED_BY_MODE' : 'NET_GUARD_OFF', rtt_ms: 0, schema_ok: false, non_empty: false };
  return await new Promise((resolve) => {
    const ws = new WebSocket(p.ws);
    const to = setTimeout(() => { ws.terminate(); resolve({ provider: p.provider, channel: 'WS', endpoint: p.ws, attempt: 1, status: 'FAIL', reason_code: 'E_TIMEOUT', rtt_ms: Date.now() - t0, schema_ok: false, non_empty: false }); }, 5000);
    ws.on('open', () => { if (p.wsSub) ws.send(JSON.stringify(p.wsSub)); });
    ws.on('message', (b) => {
      let j = null; try { j = JSON.parse(b.toString('utf8')); } catch {}
      if (!p.wsCheck(j)) return;
      clearTimeout(to); ws.close();
      resolve({ provider: p.provider, channel: 'WS', endpoint: p.ws, attempt: 1, status: 'PASS', reason_code: 'WS_EVENT_OK', rtt_ms: Date.now() - t0, schema_ok: true, non_empty: true });
    });
    ws.on('error', () => { clearTimeout(to); resolve({ provider: p.provider, channel: 'WS', endpoint: p.ws, attempt: 1, status: 'FAIL', reason_code: forceDown ? 'FORCED_NET_DOWN' : 'E_PROVIDER_DOWN', rtt_ms: Date.now() - t0, schema_ok: false, non_empty: false }); });
  });
}

const rows = [];
for (const p of providers) { rows.push(await probeWs(p)); rows.push(await probeRest(p)); }
writeMdAtomic('reports/evidence/E118/NET_PROOF_REAL.md', ['# E118 NET PROOF REAL', ...rows.map((r) => `- ${r.provider} | ${r.channel} | ${r.endpoint} | attempt=${r.attempt} | status=${r.status} | reason_code=${r.reason_code} | rtt_ms=${r.rtt_ms} | schema_ok=${r.schema_ok} | non_empty=${r.non_empty}`)].join('\n'));
