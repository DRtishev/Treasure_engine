/**
 * edge_okx_orderbook_01_offline_replay.mjs — OKX Orderbook R2 Offline Replay
 *
 * Replay offline OKX orderbook fixture through the full seq-state machine.
 * Validates lock.json digest against the canonical final book state.
 * Emits EventBus BOOK_* events (tick-only, no wallclock).
 *
 * Seq-state machine:
 *   action=snapshot + prevSeqId=-1  → BOOK_BOOT (first) or BOOK_RESET (subsequent)
 *   seqId == prevSeqId (msg-level)  → OKX_SEQ_NO_UPDATE: SKIP (no state change)
 *   prevSeqId == lastSeqId          → BOOK_APPLY (sequential)
 *   prevSeqId < lastSeqId           → BOOK_RESET_PATH (treat as reset)
 *   prevSeqId > lastSeqId           → BOOK_GAP → RDY02 FATAL
 *
 * Canonical book digest:
 *   Bids sorted descending by price (decimal string total order, no float).
 *   Asks sorted ascending by price (decimal string total order, no float).
 *   Only [price, size] tuples included (no checksum/count/ts/update_id).
 *   Zero-size entries are removed.
 *   sha256(JSON.stringify({ asks: [...], bids: [...] }))
 *   Sort algorithm: decimal_sort.mjs compareDecimalStr (see RG_DEC01)
 *
 * Exit codes:
 *   0 = PASS
 *   1 = FAIL / RDY02 (schema/hash/gap error)
 *   2 = NEEDS_DATA / RDY01 (fixture missing)
 *
 * Surface: DATA (offline, TREASURE_NET_KILL=1 required)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createReplayBus } from './data_organ/event_emitter.mjs';
import { compareDecimalStr } from './data_organ/decimal_sort.mjs';

const ROOT = process.cwd();
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main');
const FIXTURE_PATH = path.join(FIXTURE_BASE, 'fixture.jsonl');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');

const PROVIDER_ID = 'okx_orderbook_ws';
const SCHEMA_VERSION = 'okx_orderbook_ws.r2_preflight.v1';

if (process.env.TREASURE_NET_KILL !== '1') {
  console.error('[FAIL] RDY02 TREASURE_NET_KILL must be 1 — offline replay requires net-kill mode');
  process.exit(1);
}

// NEEDS_DATA if fixture missing
if (!fs.existsSync(FIXTURE_PATH)) {
  console.log(`[NEEDS_DATA] RDY01 missing fixture: ${path.relative(ROOT, FIXTURE_PATH)}`);
  process.exit(2);
}
if (!fs.existsSync(LOCK_PATH)) {
  console.log(`[NEEDS_DATA] RDY01 missing lock: ${path.relative(ROOT, LOCK_PATH)}`);
  process.exit(2);
}

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fail = (code, msg) => { console.error(`[FAIL] ${code} ${msg}`); process.exit(1); };

// Load and hash raw fixture
const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
const rawSha256 = sha256(raw);

// Load lock
let lock;
try {
  lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
} catch (e) {
  fail('RDY02', `lock.json parse error: ${e.message}`);
}

// Validate lock fields
if (lock.provider_id !== PROVIDER_ID) fail('RDY02', `provider_id mismatch: got ${lock.provider_id}`);
if (lock.schema_version !== SCHEMA_VERSION) fail('RDY02', `schema_version mismatch: got ${lock.schema_version}`);
if (rawSha256 !== lock.raw_sha256) fail('RDY02', `raw_sha256 mismatch: fixture=${rawSha256.slice(0, 16)}... lock=${lock.raw_sha256.slice(0, 16)}...`);

// EventBus setup
const runId = `REPLAY-OKX-ORDERBOOK-${PROVIDER_ID}`;
const epochDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-REPLAY-${runId}`);
const bus = createReplayBus(runId, epochDir);

// Emit BOOK_BOOT event
bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'BOOK_BOOT',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: { provider: PROVIDER_ID, schema_version: SCHEMA_VERSION, raw_sha256_prefix: rawSha256.slice(0, 16) },
});

// Parse fixture lines
const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
if (lines.length === 0) fail('RDY02', 'fixture.jsonl is empty');

// Seq-state machine
const bids = new Map(); // price_str -> size_str
const asks = new Map();
let lastSeqId = -1;
let booted = false;
let applyCount = 0;
let resetCount = 0;
let skipCount = 0;
const eventLog = [];

for (let i = 0; i < lines.length; i++) {
  let msg;
  try {
    msg = JSON.parse(lines[i]);
  } catch (e) {
    fail('RDY02', `fixture line ${i + 1} JSON parse error: ${e.message}`);
  }

  if (!msg.data || !Array.isArray(msg.data) || msg.data.length === 0) {
    fail('RDY02', `fixture line ${i + 1} missing data array`);
  }

  const d = msg.data[0];
  const seqId = d.seqId;
  const prevSeqId = d.prevSeqId;
  const action = msg.action;

  if (typeof seqId !== 'number' || typeof prevSeqId !== 'number') {
    fail('RDY02', `fixture line ${i + 1} seqId/prevSeqId must be numbers`);
  }

  // OKX R2 exception: no-update (seqId == prevSeqId within message) → SKIP
  if (seqId === prevSeqId) {
    skipCount++;
    eventLog.push('SKIP');
    bus.append({
      mode: 'CERT',
      component: 'DATA_ORGAN',
      event: 'BOOK_APPLY',
      reason_code: 'OKX_SEQ_NO_UPDATE',
      surface: 'DATA',
      evidence_paths: [],
      attrs: { provider: PROVIDER_ID, seqId, prevSeqId, action: 'SKIP' },
    });
    continue;
  }

  // Snapshot with prevSeqId=-1: BOOT (first) or RESET (subsequent)
  if (action === 'snapshot' && prevSeqId === -1) {
    // Clear and rebuild from snapshot
    bids.clear();
    asks.clear();
    for (const entry of (d.bids || [])) {
      const [p, s] = entry;
      if (s !== '0') bids.set(p, s);
    }
    for (const entry of (d.asks || [])) {
      const [p, s] = entry;
      if (s !== '0') asks.set(p, s);
    }
    lastSeqId = seqId;

    if (!booted) {
      booted = true;
      eventLog.push('BOOK_BOOT');
      bus.append({
        mode: 'CERT',
        component: 'DATA_ORGAN',
        event: 'BOOK_APPLY',
        reason_code: 'NONE',
        surface: 'DATA',
        evidence_paths: [],
        attrs: { provider: PROVIDER_ID, seqId, action: 'BOOT_SNAPSHOT', bids_n: bids.size, asks_n: asks.size },
      });
    } else {
      resetCount++;
      eventLog.push('BOOK_RESET');
      bus.append({
        mode: 'CERT',
        component: 'DATA_ORGAN',
        event: 'BOOK_RESET',
        reason_code: 'OKX_SEQ_RESET',
        surface: 'DATA',
        evidence_paths: [],
        attrs: { provider: PROVIDER_ID, seqId, action: 'RESET_SNAPSHOT', bids_n: bids.size, asks_n: asks.size },
      });
    }
    continue;
  }

  if (!booted) {
    fail('RDY02', `fixture line ${i + 1}: first message must be snapshot with prevSeqId=-1`);
  }

  // Seq-state machine: compare prevSeqId against lastSeqId
  if (prevSeqId === lastSeqId) {
    // BOOK_APPLY: sequential update
    const msgBids = d.bids || [];
    const msgAsks = d.asks || [];
    for (const entry of msgBids) {
      const [p, s] = entry;
      if (s === '0') bids.delete(p); else bids.set(p, s);
    }
    for (const entry of msgAsks) {
      const [p, s] = entry;
      if (s === '0') asks.delete(p); else asks.set(p, s);
    }
    lastSeqId = seqId;
    applyCount++;
    const isEmpty = msgBids.length === 0 && msgAsks.length === 0;
    eventLog.push('BOOK_APPLY');
    bus.append({
      mode: 'CERT',
      component: 'DATA_ORGAN',
      event: 'BOOK_APPLY',
      reason_code: isEmpty ? 'OKX_EMPTY_UPDATE' : 'NONE',
      surface: 'DATA',
      evidence_paths: [],
      attrs: {
        provider: PROVIDER_ID, seqId, prevSeqId,
        bids_delta_n: msgBids.length, asks_delta_n: msgAsks.length,
        empty: isEmpty,
      },
    });
  } else if (prevSeqId < lastSeqId) {
    // RESET PATH: prevSeqId behind lastSeqId — treat as sequence reset
    // This means we received a message that assumes an older state; reset required.
    // For offline fixture, this signals a reset path (not FATAL).
    resetCount++;
    eventLog.push('BOOK_RESET_PATH');
    bus.append({
      mode: 'CERT',
      component: 'DATA_ORGAN',
      event: 'BOOK_RESET',
      reason_code: 'OKX_SEQ_RESET',
      surface: 'DATA',
      evidence_paths: [],
      attrs: { provider: PROVIDER_ID, seqId, prevSeqId, lastSeqId, action: 'RESET_PATH' },
    });
    lastSeqId = seqId;
  } else {
    // prevSeqId > lastSeqId: GAP — BOOK_GAP FATAL → RDY02
    bus.append({
      mode: 'CERT',
      component: 'DATA_ORGAN',
      event: 'BOOK_GAP',
      reason_code: 'OKX_SEQ_GAP',
      surface: 'DATA',
      evidence_paths: [],
      attrs: { provider: PROVIDER_ID, seqId, prevSeqId, lastSeqId, gap: prevSeqId - lastSeqId },
    });
    bus.flush();
    fail('RDY02', `BOOK_GAP FATAL at line ${i + 1}: prevSeqId=${prevSeqId} > lastSeqId=${lastSeqId} (gap=${prevSeqId - lastSeqId})`);
  }
}

if (!booted) {
  fail('RDY02', 'no snapshot message found in fixture — BOOK_BOOT never triggered');
}

// Compute canonical book digest
// Bids: descending by price (decimal string total order, compareDecimalStr)
// Asks: ascending by price (decimal string total order, compareDecimalStr)
// Only [price, size] tuples, no checksum/count/ts/update_id
const canonBids = [...bids.entries()]
  .filter(([, s]) => s !== '0')
  .sort((a, b) => compareDecimalStr(b[0], a[0]))
  .map(([p, s]) => [p, s]);
const canonAsks = [...asks.entries()]
  .filter(([, s]) => s !== '0')
  .sort((a, b) => compareDecimalStr(a[0], b[0]))
  .map(([p, s]) => [p, s]);

const canonObj = { asks: canonAsks, bids: canonBids };
const canonJson = JSON.stringify(canonObj);
const digestSha256 = sha256(canonJson);

// Validate against lock
if (digestSha256 !== lock.canonical_book_digest_sha256) {
  fail('RDY02', `canonical_book_digest_sha256 mismatch: computed=${digestSha256.slice(0, 16)}... lock=${lock.canonical_book_digest_sha256.slice(0, 16)}...`);
}

// Validate messages_n
if (lines.length !== lock.messages_n) {
  fail('RDY02', `messages_n mismatch: fixture=${lines.length} lock=${lock.messages_n}`);
}

// Validate final_seqId
if (lastSeqId !== lock.final_seqId) {
  fail('RDY02', `final_seqId mismatch: computed=${lastSeqId} lock=${lock.final_seqId}`);
}

// Emit BOOK_SEAL
bus.append({
  mode: 'CERT',
  component: 'DATA_ORGAN',
  event: 'BOOK_SEAL',
  reason_code: 'NONE',
  surface: 'DATA',
  evidence_paths: [],
  attrs: {
    provider: PROVIDER_ID,
    schema_version: SCHEMA_VERSION,
    messages_n: lines.length,
    apply_n: applyCount,
    reset_n: resetCount,
    skip_n: skipCount,
    final_seqId: lastSeqId,
    canonical_digest_prefix: digestSha256.slice(0, 16),
    bids_n: canonBids.length,
    asks_n: canonAsks.length,
  },
});

bus.flush();

console.log(
  `[PASS] OKX_ORDERBOOK_REPLAY provider=${PROVIDER_ID}` +
  ` messages=${lines.length} apply=${applyCount} reset=${resetCount} skip=${skipCount}` +
  ` seqId=${lastSeqId} digest=${digestSha256.slice(0, 16)}...`
);
