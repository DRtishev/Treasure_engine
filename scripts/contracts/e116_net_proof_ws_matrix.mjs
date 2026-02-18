#!/usr/bin/env node
import { WebSocket } from 'ws';
import { modeE116, assertNetGateE116, writeMdAtomic } from '../verify/e116_lib.mjs';

const mode = modeE116();
const force = process.env.FORCE_NET_DOWN === '1';
const required = process.env.E116_REQUIRED_CHANNELS || 'BOTH';
const symbol = (process.env.E116_WS_SYMBOL || 'btcusdt').toLowerCase();
const interval = process.env.E116_WS_INTERVAL || '5m';

async function probeRest() {
  if (force) return { ok: false, reason: 'FORCED_NET_DOWN' };
  try { const r = await fetch('https://api.binance.com/api/v3/time'); return r.ok ? { ok: true, reason: 'REST_OK' } : { ok: false, reason: `REST_HTTP_${r.status}` }; } catch { return { ok: false, reason: 'REST_UNREACHABLE' }; }
}
async function probeWs() {
  if (force) return { ok: false, reason: 'FORCED_NET_DOWN' };
  const url = `${process.env.BINANCE_WS_BASE_URL || 'wss://stream.binance.com:9443/ws'}/${symbol}@kline_${interval}`;
  return await new Promise((resolve) => {
    const ws = new WebSocket(url);
    const to = setTimeout(() => { ws.terminate(); resolve({ ok: false, reason: 'WS_TIMEOUT' }); }, 3000);
    ws.on('message', () => { clearTimeout(to); ws.close(); resolve({ ok: true, reason: 'WS_OK' }); });
    ws.on('error', () => { clearTimeout(to); resolve({ ok: false, reason: 'WS_UNREACHABLE' }); });
    ws.on('close', () => { clearTimeout(to); });
  });
}

let rest = { ok: false, reason: 'OFFLINE_MODE' }; let ws = { ok: false, reason: 'OFFLINE_MODE' };
if (mode !== 'OFFLINE_ONLY') {
  if (process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1') {
    assertNetGateE116();
    rest = await probeRest();
    ws = await probeWs();
  } else {
    rest = { ok: false, reason: 'NET_GUARD_OFF' };
    ws = { ok: false, reason: 'NET_GUARD_OFF' };
  }
}
const liveOK = required === 'ANY' ? (rest.ok || ws.ok) : (rest.ok && ws.ok);
let status = mode === 'OFFLINE_ONLY' ? 'OFFLINE' : (liveOK ? 'FULL' : (mode === 'ONLINE_REQUIRED' ? 'FAIL' : 'WARN'));
writeMdAtomic('reports/evidence/E116/NET_PROOF_WS.md', ['# E116 NET PROOF WS', `- mode: ${mode}`, `- required_channels: ${required}`, `- rest: ${rest.ok ? 'PASS' : 'FAIL'} (${rest.reason})`, `- ws: ${ws.ok ? 'PASS' : 'FAIL'} (${ws.reason})`, `- status: ${status}`].join('\n'));
if (mode === 'ONLINE_REQUIRED' && !liveOK) throw new Error('E116_ONLINE_REQUIRED_FAIL_CLOSED');
console.log(`e116_net_proof_ws_matrix: ${status}`);
