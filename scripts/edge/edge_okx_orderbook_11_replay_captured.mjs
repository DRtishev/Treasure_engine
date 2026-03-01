/**
 * edge_okx_orderbook_11_replay_captured.mjs — EPOCH-67 Offline Replay for Captured OKX Data
 *
 * Validates captured raw.jsonl + lock.json under TREASURE_NET_KILL=1.
 * Checks:
 *   1. lock.json fields present and valid
 *   2. raw_capture_sha256 matches raw.jsonl content
 *   3. line_count matches raw.jsonl line count
 *   4. Each raw line is valid JSON with data[] array
 *
 * Emits REPLAY_* events via EventBus (tick-only, no wallclock):
 *   REPLAY_BOOT, REPLAY_APPLY, REPLAY_SEAL
 *
 * Args:
 *   --run-id <id>   specific run to replay (default: latest in incoming dir)
 *   --fixture       use fixture path instead of incoming (for regression gates)
 *   --fixture-dir <path>  fixture directory containing raw.jsonl + lock.json
 *
 * Exit codes:
 *   0 = PASS
 *   1 = FAIL (sha mismatch, schema error)
 *   2 = NEEDS_DATA (no captured data found)
 *
 * Surface: DATA (offline, TREASURE_NET_KILL=1 required)
 * NOT wired into verify:fast or ops:life.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createBus } from '../ops/eventbus_v1.mjs';

const ROOT = process.cwd();
const PROVIDER_ID = 'okx_orderbook_ws';
const SCHEMA_VERSION_ACQUIRE = 'okx_orderbook_ws.acquire_live.v1';

const sha256Hex = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fail = (code, msg) => { console.error(`[FAIL] ${code} ${msg}`); process.exit(1); };

// --- NET_KILL required for offline replay ---
if (process.env.TREASURE_NET_KILL !== '1') {
  fail('RDY02', 'TREASURE_NET_KILL must be 1 — offline replay requires net-kill mode');
}

// --- Parse args ---
const argv = process.argv.slice(2);
function getArg(name) {
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] : null;
}

let rawPath, lockPath;

const fixtureDir = getArg('--fixture-dir');
if (fixtureDir) {
  rawPath = path.resolve(fixtureDir, 'raw.jsonl');
  lockPath = path.resolve(fixtureDir, 'lock.json');
} else {
  const baseDir = path.join(ROOT, 'artifacts/incoming/okx/orderbook');
  if (!fs.existsSync(baseDir)) {
    console.log(`[NEEDS_DATA] RDY01 missing base directory: artifacts/incoming/okx/orderbook`);
    process.exit(2);
  }

  const runId = getArg('--run-id') ||
    fs.readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b))
      .at(-1) || '';

  if (!runId) {
    console.log('[NEEDS_DATA] RDY01 no runs found in artifacts/incoming/okx/orderbook');
    process.exit(2);
  }

  rawPath = path.join(baseDir, runId, 'raw.jsonl');
  lockPath = path.join(baseDir, runId, 'lock.json');
}

if (!fs.existsSync(rawPath)) {
  console.log(`[NEEDS_DATA] RDY01 missing raw: ${path.relative(ROOT, rawPath)}`);
  process.exit(2);
}
if (!fs.existsSync(lockPath)) {
  console.log(`[NEEDS_DATA] RDY01 missing lock: ${path.relative(ROOT, lockPath)}`);
  process.exit(2);
}

// --- Load and hash raw ---
const raw = fs.readFileSync(rawPath, 'utf8');
const rawSha256 = sha256Hex(raw);

// --- Load lock ---
let lock;
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
} catch (e) {
  fail('RDY02', `lock.json parse error: ${e.message}`);
}

// --- EventBus setup ---
const busRunId = `ACQ-OB-${lock.provider_id || PROVIDER_ID}`;
const epochDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-REPLAY-${busRunId}`);
const bus = createBus(busRunId, epochDir);

bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'REPLAY_BOOT',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: {
    provider: lock.provider_id || PROVIDER_ID,
    schema_version: lock.schema_version || 'unknown',
  },
});

// --- Validate lock fields ---
if (lock.provider_id !== PROVIDER_ID) fail('RDY02', `provider_id mismatch: got ${lock.provider_id}`);
if (!lock.schema_version) fail('RDY02', 'missing schema_version in lock');
if (!lock.raw_capture_sha256) fail('RDY02', 'missing raw_capture_sha256 in lock');
if (typeof lock.line_count !== 'number') fail('RDY02', 'missing or invalid line_count in lock');

// --- Validate SHA ---
if (rawSha256 !== lock.raw_capture_sha256) {
  fail('RDY02', `raw_capture_sha256 mismatch: raw=${rawSha256.slice(0, 16)}... lock=${lock.raw_capture_sha256.slice(0, 16)}...`);
}

// --- Parse and validate lines ---
const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

if (lines.length !== lock.line_count) {
  fail('RDY02', `line_count mismatch: raw=${lines.length} lock=${lock.line_count}`);
}

for (let i = 0; i < lines.length; i++) {
  let msg;
  try {
    msg = JSON.parse(lines[i]);
  } catch (e) {
    fail('RDY02', `raw line ${i + 1} JSON parse error: ${e.message}`);
  }
  if (!msg.data || !Array.isArray(msg.data)) {
    fail('RDY02', `raw line ${i + 1} missing data array`);
  }
}

bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'REPLAY_APPLY',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: {
    provider: PROVIDER_ID,
    rows_n: lines.length,
    raw_sha256_prefix: rawSha256.slice(0, 16),
  },
});

// --- REPLAY_SEAL ---
bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'REPLAY_SEAL',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: {
    provider: PROVIDER_ID,
    schema_version: lock.schema_version,
    line_count: lines.length,
    raw_sha256_prefix: rawSha256.slice(0, 16),
    lane_id: lock.lane_id || 'unknown',
  },
});

bus.flush();

console.log(
  `[PASS] OFFLINE_REPLAY_ACQ_OB provider=${PROVIDER_ID}` +
  ` lines=${lines.length} sha256=${rawSha256.slice(0, 16)}...`
);
