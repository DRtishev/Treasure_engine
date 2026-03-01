/**
 * edge_okx_orderbook_02_align_offline.mjs — OKX Orderbook R2 Align Engine (Offline)
 *
 * Implements the OKX 8-step orderbook alignment algorithm in offline/CERT mode.
 * This is the "snapshot surrogate" alignment: given a REST snapshot and a
 * pre-buffered set of incremental updates, align the book correctly.
 *
 * Algorithm (OKX step 6 invariants):
 *   1. Discard all buffered messages where seqId <= snapshot.seqId
 *   2. Find the first buffered message satisfying:
 *      prevSeqId <= snapshot.seqId < seqId  (ALIGN_FIRST_EVENT state)
 *   3. Set book = snapshot (bids + asks from snapshot)
 *   4. Apply first buffered message (transition: ALIGN_FIRST_EVENT → STRICT)
 *   5. Apply remaining messages strictly: prevSeqId == lastSeqId (STRICT state)
 *   6. Any deviation = ALIGN_GAP_FATAL (RDY02)
 *
 * Inputs:
 *   artifacts/fixtures/okx/orderbook/align/buffer.jsonl  (buffered incrementals)
 *   artifacts/fixtures/okx/orderbook/align/snapshot.json (REST snapshot surrogate)
 *   artifacts/fixtures/okx/orderbook/align/lock.json     (expected digest + stats)
 *
 * Outputs (EPOCH write-scope only):
 *   reports/evidence/EPOCH-R2-ALIGN-<run_id>/ALIGN.md
 *   reports/evidence/EPOCH-R2-ALIGN-<run_id>/ALIGN.json
 *
 * Exit codes:
 *   0 = PASS
 *   1 = FAIL / RDY02
 *   2 = NEEDS_DATA / RDY01
 *
 * Surface: DATA (offline, TREASURE_NET_KILL=1 required)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { compareDecimalStr } from './data_organ/decimal_sort.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './edge_lab/canon.mjs';

const ROOT = process.cwd();
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'align');
const BUFFER_PATH = path.join(FIXTURE_BASE, 'buffer.jsonl');
const SNAPSHOT_PATH = path.join(FIXTURE_BASE, 'snapshot.json');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');

const PROVIDER_ID = 'okx_orderbook_ws';
const SCHEMA_VERSION = 'okx_orderbook_ws.r2_align.v1';

// Output goes ONLY to EPOCH scope (write-scope)
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-R2-ALIGN-${RUN_ID}`);

if (process.env.TREASURE_NET_KILL !== '1') {
  console.error('[FAIL] RDY02 TREASURE_NET_KILL must be 1 — offline align requires net-kill mode');
  process.exit(1);
}

if (!fs.existsSync(BUFFER_PATH)) {
  console.log(`[NEEDS_DATA] RDY01 missing buffer: ${path.relative(ROOT, BUFFER_PATH)}`);
  process.exit(2);
}
if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.log(`[NEEDS_DATA] RDY01 missing snapshot: ${path.relative(ROOT, SNAPSHOT_PATH)}`);
  process.exit(2);
}
if (!fs.existsSync(LOCK_PATH)) {
  console.log(`[NEEDS_DATA] RDY01 missing lock: ${path.relative(ROOT, LOCK_PATH)}`);
  process.exit(2);
}

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fail = (code, msg) => {
  console.error(`[FAIL] ${code} ${msg}`);
  process.exit(1);
};

// Load inputs
const bufferRaw = fs.readFileSync(BUFFER_PATH, 'utf8');
const bufferSha256 = sha256(bufferRaw);

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
} catch (e) {
  fail('RDY02', `snapshot.json parse error: ${e.message}`);
}

let lock;
try {
  lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
} catch (e) {
  fail('RDY02', `lock.json parse error: ${e.message}`);
}

// Validate lock fields
if (lock.provider_id !== PROVIDER_ID) fail('RDY02', `lock.provider_id mismatch: ${lock.provider_id}`);
if (lock.schema_version !== SCHEMA_VERSION) fail('RDY02', `lock.schema_version mismatch: ${lock.schema_version}`);
if (bufferSha256 !== lock.buffer_raw_sha256) {
  fail('RDY02', `buffer_raw_sha256 mismatch: computed=${bufferSha256.slice(0, 16)}... lock=${lock.buffer_raw_sha256.slice(0, 16)}...`);
}
if (snapshot.seqId !== lock.snapshot_seqId) {
  fail('RDY02', `snapshot.seqId=${snapshot.seqId} != lock.snapshot_seqId=${lock.snapshot_seqId}`);
}

// Parse buffer
const bufLines = bufferRaw.split('\n').map((l) => l.trim()).filter(Boolean);

if (bufLines.length !== lock.buffer_messages_n) {
  fail('RDY02', `buffer_messages_n: file=${bufLines.length} lock=${lock.buffer_messages_n}`);
}

// ── ALIGN ENGINE ──
// Step 1: Initialize book from snapshot
const bids = new Map();
const asks = new Map();
for (const [p, s] of (snapshot.bids || [])) { if (s !== '0') bids.set(p, s); }
for (const [p, s] of (snapshot.asks || [])) { if (s !== '0') asks.set(p, s); }
let lastSeqId = snapshot.seqId;

// Track alignment stats
let discardedN = 0;
let appliedN = 0;
let firstEventSeqId = -1;
const stateLog = []; // track state transitions for gate verification

// State: DISCARD → ALIGN_FIRST_EVENT → STRICT
let alignState = 'DISCARD';

for (let i = 0; i < bufLines.length; i++) {
  let msg;
  try {
    msg = JSON.parse(bufLines[i]);
  } catch (e) {
    fail('RDY02', `buffer line ${i + 1} JSON parse error: ${e.message}`);
  }

  if (!msg.data || !Array.isArray(msg.data) || msg.data.length === 0) {
    fail('RDY02', `buffer line ${i + 1} missing data array`);
  }

  const d = msg.data[0];
  const seqId = d.seqId;
  const prevSeqId = d.prevSeqId;

  // Step 2: Discard where seqId <= snapshot.seqId
  if (seqId <= snapshot.seqId) {
    discardedN++;
    stateLog.push({ line: i + 1, seqId, prevSeqId, state: 'DISCARD', action: 'DISCARDED' });
    continue;
  }

  // Step 3: First non-discarded event — must satisfy ALIGN_FIRST_EVENT condition
  if (alignState === 'DISCARD') {
    // OKX condition: prevSeqId <= snapshot.seqId < seqId
    if (prevSeqId <= snapshot.seqId && snapshot.seqId < seqId) {
      alignState = 'ALIGN_FIRST_EVENT';
      firstEventSeqId = seqId;
    } else {
      // First non-discarded event fails the alignment condition — FATAL
      fail(
        'RDY02',
        `ALIGN_FIRST_EVENT_FAIL at line ${i + 1}: ` +
        `prevSeqId=${prevSeqId} snapshot.seqId=${snapshot.seqId} seqId=${seqId} — ` +
        `condition prevSeqId<=snapshot.seqId<seqId not satisfied`
      );
    }
  } else if (alignState === 'ALIGN_FIRST_EVENT' || alignState === 'STRICT') {
    // Strict sequential from here
    if (prevSeqId !== lastSeqId) {
      fail(
        'RDY02',
        `ALIGN_GAP_FATAL at line ${i + 1}: ` +
        `prevSeqId=${prevSeqId} != lastSeqId=${lastSeqId} (gap=${prevSeqId - lastSeqId})`
      );
    }
    alignState = 'STRICT';
  }

  // Apply the update
  const msgBids = d.bids || [];
  const msgAsks = d.asks || [];
  for (const [p, s] of msgBids) { if (s === '0') bids.delete(p); else bids.set(p, s); }
  for (const [p, s] of msgAsks) { if (s === '0') asks.delete(p); else asks.set(p, s); }
  lastSeqId = seqId;
  appliedN++;
  stateLog.push({
    line: i + 1, seqId, prevSeqId,
    state: alignState,
    action: 'APPLIED',
    bids_delta: msgBids.length, asks_delta: msgAsks.length,
  });
  if (alignState === 'ALIGN_FIRST_EVENT') alignState = 'STRICT';
}

// Verify stats match lock
if (discardedN !== lock.discarded_n) {
  fail('RDY02', `discarded_n: computed=${discardedN} lock=${lock.discarded_n}`);
}
if (appliedN !== lock.applied_n) {
  fail('RDY02', `applied_n: computed=${appliedN} lock=${lock.applied_n}`);
}
if (lastSeqId !== lock.final_seqId) {
  fail('RDY02', `final_seqId: computed=${lastSeqId} lock=${lock.final_seqId}`);
}
if (firstEventSeqId !== lock.align_first_event_seqId) {
  fail('RDY02', `align_first_event_seqId: computed=${firstEventSeqId} lock=${lock.align_first_event_seqId}`);
}

// Compute canonical book digest (decimal sort)
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

if (digestSha256 !== lock.canonical_book_digest_sha256) {
  fail(
    'RDY02',
    `canonical_book_digest_sha256 mismatch: ` +
    `computed=${digestSha256.slice(0, 16)}... lock=${lock.canonical_book_digest_sha256.slice(0, 16)}...`
  );
}

// Write outputs to EPOCH scope (write-scope only, no modifications to fixtures)
fs.mkdirSync(EPOCH_DIR, { recursive: true });

writeMd(path.join(EPOCH_DIR, 'ALIGN.md'), [
  `# ALIGN — EPOCH-R2-ALIGN-${RUN_ID}`, '',
  'STATUS: PASS',
  `REASON_CODE: NONE`,
  `RUN_ID: ${RUN_ID}`,
  `PROVIDER: ${PROVIDER_ID}`,
  `SCHEMA_VERSION: ${SCHEMA_VERSION}`, '',
  '## ALIGN_STATS',
  `- snapshot_seqId: ${snapshot.seqId}`,
  `- buffer_messages_n: ${bufLines.length}`,
  `- discarded_n: ${discardedN}`,
  `- applied_n: ${appliedN}`,
  `- align_first_event_seqId: ${firstEventSeqId}`,
  `- final_seqId: ${lastSeqId}`,
  `- bids_n: ${canonBids.length}`,
  `- asks_n: ${canonAsks.length}`,
  `- canonical_digest_prefix: ${digestSha256.slice(0, 16)}...`, '',
  '## STATE_LOG',
  stateLog.map((e) =>
    `- line ${e.line}: seqId=${e.seqId} prevSeqId=${e.prevSeqId} state=${e.state} action=${e.action}`
  ).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(EPOCH_DIR, 'ALIGN.json'), {
  schema_version: '1.0.0',
  provider_id: PROVIDER_ID,
  schema_version_fixture: SCHEMA_VERSION,
  run_id: RUN_ID,
  snapshot_seqId: snapshot.seqId,
  buffer_messages_n: bufLines.length,
  discarded_n: discardedN,
  applied_n: appliedN,
  align_first_event_seqId: firstEventSeqId,
  final_seqId: lastSeqId,
  bids_n: canonBids.length,
  asks_n: canonAsks.length,
  canonical_digest_prefix: digestSha256.slice(0, 16),
  state_log: stateLog,
});

console.log(
  `[PASS] OKX_ALIGN provider=${PROVIDER_ID}` +
  ` buffer=${bufLines.length} discarded=${discardedN} applied=${appliedN}` +
  ` firstEvent=${firstEventSeqId} seqId=${lastSeqId}` +
  ` digest=${digestSha256.slice(0, 16)}...`
);
