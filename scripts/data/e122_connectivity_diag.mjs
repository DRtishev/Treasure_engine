#!/usr/bin/env node
import dns from 'node:dns/promises';
import { modeE122, writeMdAtomic } from '../verify/e122_lib.mjs';

const mode = modeE122();
const enabled = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1';
const ts = new Date().toISOString();
const rows = [];

function push(provider, channel, endpoint, ok, reason, rtt) {
  rows.push({ provider, channel, endpoint, ok, reason, rtt_ms: Number.isFinite(rtt) ? Math.round(rtt) : -1, ts_utc: ts });
}

async function probeDns(host, provider) {
  const t0 = Date.now();
  try { await dns.lookup(host); push(provider, 'DNS', host, true, 'OK', Date.now() - t0); }
  catch { push(provider, 'DNS', host, false, 'E_DNS_FAIL', Date.now() - t0); }
}

async function probeHttp(url, provider) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    push(provider, 'HTTPS', url, r.ok, r.ok ? 'OK' : 'E_HTTP_NOK', Date.now() - t0);
  } catch (e) {
    const reason = /timeout/i.test(String(e)) ? 'E_TIMEOUT' : 'E_NET_BLOCKED';
    push(provider, 'HTTPS', url, false, reason, Date.now() - t0);
  }
}

async function probeWs(url, provider) {
  const t0 = Date.now();
  try {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 5000);
      ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(); };
      ws.onerror = () => { clearTimeout(timer); reject(new Error('ws')); };
    });
    push(provider, 'WS', url, true, 'OK', Date.now() - t0);
  } catch (e) {
    const reason = /timeout/i.test(String(e)) ? 'E_WS_NO_EVENT' : 'E_TLS_FAIL';
    push(provider, 'WS', url, false, reason, Date.now() - t0);
  }
}

if (mode === 'OFFLINE_ONLY') {
  push('BYBIT_TESTNET', 'ALL', 'SKIPPED', false, 'SKIPPED_BY_MODE', 0);
} else if (!enabled) {
  push('BYBIT_TESTNET', 'ALL', 'DISABLED', false, 'E_NET_BLOCKED', 0);
} else {
  await probeDns('api-testnet.bybit.com', 'BYBIT_TESTNET');
  await probeHttp('https://api-testnet.bybit.com/v5/market/time', 'BYBIT_TESTNET');
  await probeWs('wss://stream-testnet.bybit.com/v5/public/linear', 'BYBIT_TESTNET');
  await probeDns('api.binance.com', 'BINANCE');
  await probeHttp('https://api.binance.com/api/v3/time', 'BINANCE');
  await probeWs('wss://stream.binance.com:9443/ws/btcusdt@trade', 'BINANCE');
}

const success = rows.filter((r) => r.ok).length;
const total = rows.length;
const status = success > 0 ? 'PASS' : (mode === 'ONLINE_REQUIRED' ? 'FAIL' : 'WARN');
writeMdAtomic('reports/evidence/E122/CONNECTIVITY_DIAG.md', [
  '# E122 CONNECTIVITY DIAG',
  `- mode: ${mode}`,
  `- enabled: ${enabled}`,
  `- success: ${success}`,
  `- total: ${total}`,
  `- quorum_ok: ${success > 0}`,
  `- status: ${status}`,
  '| provider | channel | endpoint | ok | reason_code | rtt_ms | ts_utc |',
  '|---|---|---|---|---|---:|---|',
  ...rows.map((r) => `| ${r.provider} | ${r.channel} | ${r.endpoint} | ${r.ok} | ${r.reason} | ${r.rtt_ms} | ${r.ts_utc} |`)
].join('\n'));

if (mode === 'ONLINE_REQUIRED' && success === 0) process.exit(1);
