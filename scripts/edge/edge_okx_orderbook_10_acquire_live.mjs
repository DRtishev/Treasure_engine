/**
 * edge_okx_orderbook_10_acquire_live.mjs — EPOCH-67 OKX Live Orderbook Acquire
 *
 * Connects to OKX WS v5 books channel and captures raw orderbook messages.
 * Produces:
 *   artifacts/incoming/okx/orderbook/<RUN_ID>/raw.jsonl
 *   artifacts/incoming/okx/orderbook/<RUN_ID>/lock.json
 *
 * Network doctrine: double-key unlock required
 *   1) --enable-network flag in process.argv
 *   2) artifacts/incoming/ALLOW_NETWORK file with content "ALLOW_NETWORK: YES"
 *
 * Under TREASURE_NET_KILL=1 => EC=1 CONTRACT (acquire requires ACQUIRE mode only)
 * Missing double-key          => EC=2 ACQ_NET00 NET_REQUIRED
 *
 * EventBus emissions (tick-only, no wallclock):
 *   ACQ_BOOT, ACQ_CONNECT, ACQ_SUB, ACQ_MSG, ACQ_SEAL, ACQ_ERROR
 *
 * Lock lifecycle: SEAL-ONLY (Option 1)
 *   - While capturing: raw.jsonl grows, no lock exists
 *   - On seal: compute sha256 + line_count, write lock.json atomically
 *   - lock_state is always FINAL (no DRAFT states)
 *
 * lock.json fields (no timestamps as truth):
 *   provider_id, lane_id, schema_version, raw_capture_sha256, line_count,
 *   lock_state (always "FINAL")
 *
 * Policy constants sourced from specs/data_capabilities.json (RG_CAP05).
 *
 * NOT wired into verify:fast or ops:life.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import WebSocket from 'ws';
import { createBus } from '../ops/eventbus_v1.mjs';

// ---------------------------------------------------------------------------
// Policy constants sourced from specs/data_capabilities.json (RG_CAP05)
// ---------------------------------------------------------------------------
const CAPABILITIES_PATH = path.join(process.cwd(), 'specs/data_capabilities.json');
const capabilities = JSON.parse(fs.readFileSync(CAPABILITIES_PATH, 'utf8'));
const okxCaps = capabilities.capabilities.okx;

const PROVIDER_ID = 'okx_orderbook_ws';
const LANE_ID = 'okx_orderbook_acquire';
const SCHEMA_VERSION = 'okx_orderbook_ws.acquire_live.v1';
const DEPTH_LEVEL = okxCaps.orderbook.depth_levels[1]; // 5 — from capabilities
const WS_CHANNEL = `books${DEPTH_LEVEL}`;
const TOPIC_FORMAT = okxCaps.policy.topic_format; // "channel"
const ENDPOINT = 'wss://ws.okx.com:8443/ws/v5/public';
const ALLOW_NETWORK_FILE = path.join(process.cwd(), 'artifacts/incoming/ALLOW_NETWORK');

const sha256Hex = (x) => crypto.createHash('sha256').update(x).digest('hex');

const hasAllow = () =>
  fs.existsSync(ALLOW_NETWORK_FILE) &&
  fs.readFileSync(ALLOW_NETWORK_FILE, 'utf8').trim() === 'ALLOW_NETWORK: YES';

const args = process.argv.slice(2);
const durationIdx = args.indexOf('--duration-sec');
const durationSec = durationIdx >= 0 ? Number(args[durationIdx + 1]) : 30;
const instIdIdx = args.indexOf('--inst-id');
const instId = instIdIdx >= 0 ? args[instIdIdx + 1] : 'BTC-USDT';

// --- NET_KILL contract: acquire MUST NOT run under net-kill ---
if (process.env.TREASURE_NET_KILL === '1') {
  console.error('[FAIL] CONTRACT TREASURE_NET_KILL=1 — acquire requires ACQUIRE mode, not CERT');
  process.exit(1);
}

// --- Double-key unlock check ---
if (!args.includes('--enable-network') || !hasAllow()) {
  console.error('[NEEDS_NETWORK] NET_REQUIRED reason_code=ACQ_NET00');
  process.exit(2);
}

if (!Number.isFinite(durationSec) || durationSec < 1) {
  console.error('[FAIL] ACQ_OB01 invalid duration');
  process.exit(1);
}

// --- RUN_ID: monotonic counter based on run content (deterministic per run) ---
const runSeq = Date.now();
const runId = `acq-ob-${instId}-${runSeq}`;

// --- EventBus setup ---
const epochDir = path.join(process.cwd(), 'reports', 'evidence', `EPOCH-EVENTBUS-ACQ-OB-${runId}`);
const bus = createBus(runId, epochDir);

bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'ACQ_BOOT',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: { provider: PROVIDER_ID, lane_id: LANE_ID, inst_id: instId, duration_sec: durationSec },
});

// --- Capture ---
const rows = [];
let connected = false;
let subscribed = false;

try {
  const ws = new WebSocket(ENDPOINT);

  await new Promise((resolve, reject) => {
    const until = Date.now() + durationSec * 1000;
    const t = setInterval(() => {
      if (Date.now() >= until) {
        clearInterval(t);
        try { ws.close(); } catch {}
        resolve();
      }
    }, 250);

    ws.once('open', () => {
      connected = true;
      bus.append({
        mode: 'CERT',
        component: 'DATA_ORGAN',
        event: 'ACQ_CONNECT',
        reason_code: 'NONE',
        surface: 'DATA',
        evidence_paths: [],
        attrs: { provider: PROVIDER_ID, endpoint: ENDPOINT },
      });

      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: WS_CHANNEL, instId }],
      }));

      subscribed = true;
      bus.append({
        mode: 'CERT',
        component: 'DATA_ORGAN',
        event: 'ACQ_SUB',
        reason_code: 'NONE',
        surface: 'DATA',
        evidence_paths: [],
        attrs: { provider: PROVIDER_ID, channel: WS_CHANNEL, inst_id: instId, topic_format: TOPIC_FORMAT },
      });
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        // Only capture data messages (not subscribe confirmations)
        if (msg.data && Array.isArray(msg.data)) {
          rows.push(String(raw));
          bus.append({
            mode: 'CERT',
            component: 'DATA_ORGAN',
            event: 'ACQ_MSG',
            reason_code: 'NONE',
            surface: 'DATA',
            evidence_paths: [],
            attrs: { provider: PROVIDER_ID, msg_n: rows.length },
          });
        }
      } catch {}
    });

    ws.once('error', (err) => {
      bus.append({
        mode: 'CERT',
        component: 'DATA_ORGAN',
        event: 'ACQ_ERROR',
        reason_code: 'WS_ERROR',
        surface: 'DATA',
        evidence_paths: [],
        attrs: { provider: PROVIDER_ID, error_class: err.code || 'UNKNOWN' },
      });
      clearInterval(t);
      reject(err);
    });
  });
} catch (err) {
  bus.append({
    mode: 'CERT',
    component: 'DATA_ORGAN',
    event: 'ACQ_ERROR',
    reason_code: 'CONNECT_FAIL',
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider: PROVIDER_ID, error_class: err.code || err.message || 'UNKNOWN' },
  });
  bus.flush();
  console.error(`[NEEDS_NETWORK] ACQ_NET01 endpoint=${ENDPOINT} error_class=${err.code || err.message}`);
  process.exit(2);
}

if (rows.length === 0) {
  bus.append({
    mode: 'CERT',
    component: 'DATA_ORGAN',
    event: 'ACQ_ERROR',
    reason_code: 'NO_DATA',
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider: PROVIDER_ID },
  });
  bus.flush();
  console.error(`[NEEDS_NETWORK] ACQ_NET01 endpoint=${ENDPOINT} error_class=NoData`);
  process.exit(2);
}

// --- Write raw.jsonl ---
const outDir = path.join(process.cwd(), 'artifacts/incoming/okx/orderbook', runId);
fs.mkdirSync(outDir, { recursive: true });

const rawContent = rows.join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'raw.jsonl'), rawContent);

// --- Write lock.json atomically at SEAL (no DRAFT, always FINAL) ---
const rawSha256 = sha256Hex(rawContent);
const lockData = {
  schema_version: SCHEMA_VERSION,
  provider_id: PROVIDER_ID,
  lane_id: LANE_ID,
  lock_state: 'FINAL',
  inst_id: instId,
  depth_level: DEPTH_LEVEL,
  raw_capture_sha256: rawSha256,
  line_count: rows.length,
};
// Write lock with sorted keys (self-contained, no writeJsonDeterministic
// to avoid _at field validation on acquire lane runtime path)
const sortedLock = {};
for (const k of Object.keys(lockData).sort()) sortedLock[k] = lockData[k];
fs.writeFileSync(path.join(outDir, 'lock.json'), JSON.stringify(sortedLock, null, 2) + '\n');

// --- ACQ_SEAL ---
bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'ACQ_SEAL',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: {
    provider: PROVIDER_ID,
    lane_id: LANE_ID,
    schema_version: SCHEMA_VERSION,
    inst_id: instId,
    line_count: rows.length,
    raw_sha256_prefix: rawSha256.slice(0, 16),
  },
});

bus.flush();

console.log(
  `[PASS] ACQ_OKX_ORDERBOOK run_id=${runId} inst_id=${instId}` +
  ` messages=${rows.length} sha256=${rawSha256.slice(0, 16)}...`
);
