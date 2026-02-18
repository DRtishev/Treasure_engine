#!/usr/bin/env node
import { E113_ROOT, modeE113, assertNetGate, writeMdAtomic } from '../verify/e113_lib.mjs';

const mode = modeE113();
const forceDown = process.env.FORCE_NET_DOWN === '1';
const timeoutMs = Number(process.env.E113_NET_TIMEOUT_MS || 4000);
const providers = [
  { name: 'bybit', endpoints: ['https://api.bybit.com/v5/market/time', 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT'] },
  { name: 'binance', endpoints: ['https://api.binance.com/api/v3/time', 'https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT'] },
  { name: 'kraken', endpoints: ['https://api.kraken.com/0/public/Time', 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD'] },
  { name: 'coinbase', endpoints: ['https://api.exchange.coinbase.com/time', 'https://api.exchange.coinbase.com/products/BTC-USD/ticker'] }
];

async function probe(url) {
  if (forceDown) return { pass: false, code: 'FORCED_NET_DOWN' };
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal });
    clearTimeout(t);
    return r.ok ? { pass: true, code: 'OK' } : { pass: false, code: `HTTP_${r.status}` };
  } catch (e) {
    clearTimeout(t);
    const m = String(e.message || e);
    if (m.includes('aborted')) return { pass: false, code: 'TIMEOUT' };
    return { pass: false, code: 'FETCH_FAIL' };
  }
}

const rows = [];
let attempted = 0;
if (mode === 'OFFLINE_ONLY') {
  writeMdAtomic(`${E113_ROOT}/NET_PROOF.md`, [
    '# E113 NET PROOF',
    '- mode: OFFLINE_ONLY',
    '- network_attempted: no',
    '- provider_success_count: 0',
    '- endpoint_attempts: 0',
    '- status: OFFLINE',
    '- reason_code: OFFLINE_MODE'
  ].join('\n'));
  console.log('e113_net_matrix: OFFLINE');
  process.exit(0);
}

assertNetGate();
for (const p of providers) {
  let ok = 0;
  const endpointRows = [];
  for (const e of p.endpoints) {
    attempted += 1;
    const r = await probe(e);
    if (r.pass) ok += 1;
    endpointRows.push({ endpoint: e, code: r.code, pass: r.pass });
  }
  rows.push({ provider: p.name, success: ok, total: p.endpoints.length, endpoints: endpointRows });
}

const providerSuccessCount = rows.filter(r => r.success > 0).length;
const quorumPass = providerSuccessCount >= 1 && attempted >= 2;
const status = mode === 'ONLINE_REQUIRED' ? (quorumPass ? 'PASS' : 'FAIL') : (quorumPass ? 'PASS' : 'WARN');

const md = [
  '# E113 NET PROOF',
  `- mode: ${mode}`,
  `- network_attempted: yes`,
  `- endpoint_attempts: ${attempted}`,
  `- provider_success_count: ${providerSuccessCount}`,
  `- quorum_rule: provider_success_count>=1 && endpoint_attempts>=2`,
  `- quorum_pass: ${quorumPass ? 'yes' : 'no'}`,
  `- status: ${status}`,
  '## Providers',
  ...rows.map(r => `- ${r.provider}: success=${r.success}/${r.total}`),
  '## Endpoint Reason Codes',
  ...rows.flatMap(r => r.endpoints.map(e => `- ${r.provider}|${e.endpoint}: ${e.pass ? 'PASS' : 'FAIL'} (${e.code})`))
].join('\n');
writeMdAtomic(`${E113_ROOT}/NET_PROOF.md`, md);
if (mode === 'ONLINE_REQUIRED' && !quorumPass) throw new Error('E113_ONLINE_REQUIRED_NET_MATRIX_FAIL');
console.log(`e113_net_matrix: ${status}`);
