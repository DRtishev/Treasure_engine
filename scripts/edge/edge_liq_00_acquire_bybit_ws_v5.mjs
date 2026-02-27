import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import WebSocket from 'ws';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const PROVIDER_ID = 'bybit_ws_v5';
const SCHEMA_VERSION = 'liquidations.bybit_ws_v5.v1';
const TIME_UNIT_SENTINEL = 'ms';
const ENDPOINT = 'wss://stream.bybit.com/v5/public/linear';
const ALLOW_NETWORK_FILE = path.join(process.cwd(), 'artifacts/incoming/ALLOW_NETWORK');

function parseArgs(argv) {
  const args = { provider: PROVIDER_ID, durationSec: 20, enableNetwork: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--provider') args.provider = argv[++i] || '';
    else if (a === '--duration-sec') args.durationSec = Number(argv[++i] || '0');
    else if (a === '--enable-network') args.enableNetwork = true;
  }
  return args;
}

function sha256Hex(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function canonicalizeDeep(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalizeDeep(item));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) out[key] = canonicalizeDeep(value[key]);
    return out;
  }
  return value;
}

function lockPayload(rows) {
  return {
    provider_id: PROVIDER_ID,
    schema_version: SCHEMA_VERSION,
    time_unit_sentinel: TIME_UNIT_SENTINEL,
    rows,
  };
}

function hasAllowFile() {
  if (!fs.existsSync(ALLOW_NETWORK_FILE)) return false;
  return fs.readFileSync(ALLOW_NETWORK_FILE, 'utf8').trim() === 'ALLOW_NETWORK: YES';
}

function classifyNetworkError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (err?.name === 'AggregateError') return 'AggregateError';
  if (msg.includes('econnrefused')) return 'ECONNREFUSED';
  if (msg.includes('enotfound')) return 'ENOTFOUND';
  if (msg.includes('etimedout') || msg.includes('timeout')) return 'ETIMEDOUT';
  if (msg.includes('eai_again')) return 'EAI_AGAIN';
  return err?.name || 'NetworkError';
}

async function acquireRows(durationSec) {
  const rows = [];
  const ws = new WebSocket(ENDPOINT);
  const timeoutAt = Date.now() + (durationSec * 1000);
  await new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (Date.now() >= timeoutAt) {
        clearInterval(timer);
        try { ws.close(); } catch {}
        resolve();
      }
    }, 250);
    ws.once('open', () => ws.send(JSON.stringify({ op: 'subscribe', args: ['liquidation.BTCUSDT'] })));
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.topic !== 'liquidation.BTCUSDT' || !Array.isArray(msg?.data)) return;
        for (const item of msg.data) {
          rows.push({
            provider_id: PROVIDER_ID,
            symbol: item.s,
            side: item.S,
            ts: Number(item.T || msg.ts),
            p: String(item.p),
            v: String(item.v),
            topic: msg.topic,
          });
        }
      } catch {}
    });
    ws.once('error', (err) => {
      clearInterval(timer);
      reject(err);
    });
  });
  return rows;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.provider !== PROVIDER_ID) {
    console.error('[FAIL] ACQ_LIQ03 unsupported --provider, expected bybit_ws_v5');
    process.exit(1);
  }
  if (!Number.isFinite(args.durationSec) || args.durationSec < 1) {
    console.error('[FAIL] ACQ_LIQ03 --duration-sec must be >= 1');
    process.exit(1);
  }
  if (!args.enableNetwork || !hasAllowFile()) {
    console.error('[NEEDS_NETWORK] NET_REQUIRED reason_code=ACQ_NET00 detail=Require(--enable-network + artifacts/incoming/ALLOW_NETWORK)');
    process.exit(2);
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(process.cwd(), 'artifacts/incoming/liquidations/bybit_ws_v5', runId);
  fs.mkdirSync(outDir, { recursive: true });

  let rows;
  try {
    rows = await acquireRows(args.durationSec);
  } catch (err) {
    console.error(`[NEEDS_NETWORK] ACQ_NET01 endpoint=${ENDPOINT} error_class=${classifyNetworkError(err)}`);
    process.exit(2);
  }
  if (rows.length === 0) {
    console.error('[FAIL] ACQ_LIQ01 zero liquidation events captured in requested window');
    process.exit(1);
  }

  const rawLines = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  const normalized = lockPayload(rows);
  fs.writeFileSync(path.join(outDir, 'raw.jsonl'), rawLines);
  writeJsonDeterministic(path.join(outDir, 'lock.json'), {
    provider_id: PROVIDER_ID,
    schema_version: SCHEMA_VERSION,
    time_unit_sentinel: TIME_UNIT_SENTINEL,
    raw_capture_sha256: sha256Hex(rawLines),
    normalized_schema_sha256: sha256Hex(JSON.stringify(canonicalizeDeep(normalized))),
    captured_at_utc: new Date().toISOString(),
  });

  console.log(`[PASS] ACQ_BYBIT_WS_V5 run_id=${runId} rows=${rows.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[FAIL] ACQ_LIQ02 ${err?.name || 'UnhandledError'}`);
  process.exit(1);
});
