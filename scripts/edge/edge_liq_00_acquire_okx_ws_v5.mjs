import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import WebSocket from 'ws';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const PROVIDER_ID = 'okx_ws_v5';
const SCHEMA_VERSION = 'liquidations.okx_ws_v5.v1';
const ENDPOINT = 'wss://ws.okx.com:8443/ws/v5/public';
const ALLOW_NETWORK_FILE = path.join(process.cwd(), 'artifacts/incoming/ALLOW_NETWORK');

const sha256Hex = (x) => crypto.createHash('sha256').update(x).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v;
const hasAllow = () => fs.existsSync(ALLOW_NETWORK_FILE) && fs.readFileSync(ALLOW_NETWORK_FILE, 'utf8').trim() === 'ALLOW_NETWORK: YES';

const args = process.argv.slice(2);
const durationIdx = args.indexOf('--duration-sec');
const durationSec = durationIdx >= 0 ? Number(args[durationIdx + 1]) : 20;
if (!args.includes('--enable-network') || !hasAllow()) { console.error('[NEEDS_NETWORK] NET_REQUIRED reason_code=ACQ_NET00'); process.exit(2); }
if (!Number.isFinite(durationSec) || durationSec < 1) { console.error('[FAIL] ACQ_LIQ03 invalid duration'); process.exit(1); }

const rows = [];
const ws = new WebSocket(ENDPOINT);
await new Promise((resolve, reject) => {
  const until = Date.now() + durationSec * 1000;
  const t = setInterval(() => { if (Date.now() >= until) { clearInterval(t); try { ws.close(); } catch {} resolve(); } }, 250);
  ws.once('open', () => ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'liquidation-orders', instType: 'SWAP', uly: 'BTC-USDT' }] })));
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (!Array.isArray(msg?.data)) return;
      for (const d of msg.data) rows.push({ provider_id: PROVIDER_ID, symbol: d.instId || 'BTC-USDT-SWAP', side: d.side || 'unknown', ts: Number(d.ts || Date.now()), p: String(d.px || d.price || '0'), v: String(d.sz || d.size || '0'), topic: msg?.arg?.channel || 'liquidation-orders' });
    } catch {}
  });
  ws.once('error', (err) => { clearInterval(t); reject(err); });
});

if (rows.length === 0) { console.error('[NEEDS_NETWORK] ACQ_NET01 endpoint=' + ENDPOINT + ' error_class=NoData'); process.exit(2); }
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(process.cwd(), 'artifacts/incoming/liquidations/okx_ws_v5', runId);
fs.mkdirSync(outDir, { recursive: true });
const raw = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'raw.jsonl'), raw);
writeJsonDeterministic(path.join(outDir, 'lock.json'), { provider_id: PROVIDER_ID, schema_version: SCHEMA_VERSION, time_unit_sentinel: 'ms', raw_capture_sha256: sha256Hex(raw), normalized_schema_sha256: sha256Hex(JSON.stringify(canon({ provider_id: PROVIDER_ID, schema_version: SCHEMA_VERSION, time_unit_sentinel: 'ms', rows }))), captured_at_utc: new Date().toISOString() });
console.log(`[PASS] ACQ_OKX_WS_V5 run_id=${runId} rows=${rows.length}`);
