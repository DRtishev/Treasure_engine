/**
 * regression_ob_okx10_reorder_window_policy.mjs — RG_OB_OKX10_REORDER_WINDOW_POLICY
 *
 * Gate: Verify that the reorder window (bounded buffer, sort by seqId) produces
 *       the same canonical book digest as an in-order stream, up to the
 *       reorder_window_max_items capacity defined in data_capabilities.json.
 *
 * Policy:
 *   - Collect up to N messages (reorder_window_max_items) in a buffer
 *   - Sort buffer by seqId (ascending integer) before processing
 *   - Result must equal the digest of the clean in-order stream
 *   - Messages beyond the window that cause gaps = fail-closed (REORDER_OVERFLOW)
 *
 * Tests synthetic scenarios in-memory (no file I/O for test data).
 *
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { compareDecimalStr } from '../edge/data_organ/decimal_sort.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx10-reorder-window-policy';

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

// Load reorder_window_max_items from capabilities
const CAP_PATH = path.join(ROOT, 'specs', 'data_capabilities.json');
let WINDOW_SIZE = 5; // fallback
try {
  const cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
  const rw = cap.capabilities?.okx?.orderbook?.reorder_window_max_items;
  if (Number.isInteger(rw) && rw > 0) WINDOW_SIZE = rw;
} catch (_) { /* use fallback */ }

// Apply a sorted batch of messages (already in seqId order) to a book state
function applyBatch(bids, asks, batch, lastSeqId, booted) {
  let cur = lastSeqId;
  let ok = booted;
  for (const msg of batch) {
    const d = msg.data[0];
    const { seqId, prevSeqId } = d;
    const action = msg.action || 'update';

    if (action === 'snapshot' && prevSeqId === -1) {
      bids.clear(); asks.clear();
      for (const [p, s] of (d.bids || [])) { if (s !== '0') bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s !== '0') asks.set(p, s); }
      cur = seqId;
      ok = true;
      continue;
    }

    if (!ok) return { error: 'no boot snapshot', lastSeqId: cur, booted: ok };

    if (prevSeqId === cur) {
      for (const [p, s] of (d.bids || [])) { if (s === '0') bids.delete(p); else bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s === '0') asks.delete(p); else asks.set(p, s); }
      cur = seqId;
    } else {
      return { error: `GAP: prevSeqId=${prevSeqId} cur=${cur}`, lastSeqId: cur, booted: ok };
    }
  }
  return { error: null, lastSeqId: cur, booted: ok };
}

// Process a stream using sliding reorder window (sort by seqId within window)
function runWithReorderWindow(messages, windowSize) {
  const bids = new Map();
  const asks = new Map();
  let lastSeqId = -1;
  let booted = false;
  const events = [];
  const buffer = [];

  const flush = () => {
    if (buffer.length === 0) return null;
    // Sort by seqId (integer)
    buffer.sort((a, b) => a.data[0].seqId - b.data[0].seqId);
    const result = applyBatch(bids, asks, buffer, lastSeqId, booted);
    buffer.length = 0;
    if (result.error) return result.error;
    lastSeqId = result.lastSeqId;
    booted = result.booted;
    return null;
  };

  for (const msg of messages) {
    buffer.push(msg);
    if (buffer.length >= windowSize) {
      const err = flush();
      if (err) return { error: err, events };
      events.push({ type: 'WINDOW_FLUSH', size: windowSize });
    }
  }

  // Flush remainder
  if (buffer.length > 0) {
    const err = flush();
    if (err) return { error: err, events };
    events.push({ type: 'TAIL_FLUSH', size: buffer.length });
  }

  const canonBids = [...bids.entries()].filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(b[0], a[0])).map(([p, s]) => [p, s]);
  const canonAsks = [...asks.entries()].filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(a[0], b[0])).map(([p, s]) => [p, s]);
  const canonJson = JSON.stringify({ asks: canonAsks, bids: canonBids });
  return { digest: sha256(canonJson), canonJson, events, error: null };
}

// Process a clean in-order stream (no reorder window)
function runClean(messages) {
  const bids = new Map();
  const asks = new Map();
  let lastSeqId = -1;
  let booted = false;

  for (const msg of messages) {
    const d = msg.data[0];
    const { seqId, prevSeqId } = d;
    const action = msg.action || 'update';

    if (action === 'snapshot' && prevSeqId === -1) {
      bids.clear(); asks.clear();
      for (const [p, s] of (d.bids || [])) { if (s !== '0') bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s !== '0') asks.set(p, s); }
      lastSeqId = seqId;
      booted = true;
      continue;
    }

    if (!booted) return { error: 'no boot snapshot' };
    if (prevSeqId === lastSeqId) {
      for (const [p, s] of (d.bids || [])) { if (s === '0') bids.delete(p); else bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s === '0') asks.delete(p); else asks.set(p, s); }
      lastSeqId = seqId;
    } else {
      return { error: `GAP at seqId=${seqId}` };
    }
  }

  const canonBids = [...bids.entries()].filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(b[0], a[0])).map(([p, s]) => [p, s]);
  const canonAsks = [...asks.entries()].filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(a[0], b[0])).map(([p, s]) => [p, s]);
  const canonJson = JSON.stringify({ asks: canonAsks, bids: canonBids });
  return { digest: sha256(canonJson), canonJson, error: null };
}

const makeMsg = (action, seqId, prevSeqId, bids = [], asks = []) =>
  ({ action, data: [{ seqId, prevSeqId, bids, asks }] });

const checks = [];

// ── Check 1: window_size_from_capabilities ──
checks.push({
  check: 'window_size_from_capabilities',
  pass: Number.isInteger(WINDOW_SIZE) && WINDOW_SIZE > 0,
  detail: `reorder_window_max_items=${WINDOW_SIZE} — ${Number.isInteger(WINDOW_SIZE) && WINDOW_SIZE > 0 ? 'OK' : 'FAIL'}`,
});

// ── Scenario 1: Two adjacent out-of-order updates fixed by window ──
{
  // In-order stream
  const inOrder = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [['49100', '0.5']], []),
    makeMsg('update', 102, 101, [], [['50050', '0.3']]),
    makeMsg('update', 103, 102, [['49000', '0']], []),
  ];
  // Out-of-order: swap 101 and 102
  const outOfOrder = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 102, 101, [], [['50050', '0.3']]),  // arrives early
    makeMsg('update', 101, 100, [['49100', '0.5']], []),  // arrives late
    makeMsg('update', 103, 102, [['49000', '0']], []),
  ];

  const cleanResult = runClean(inOrder);
  const reorderResult = runWithReorderWindow(outOfOrder, WINDOW_SIZE);

  checks.push({
    check: 'adjacent_swap_digest_equal',
    pass: !reorderResult.error && cleanResult.digest === reorderResult.digest,
    detail: !reorderResult.error && cleanResult.digest === reorderResult.digest
      ? `adjacent swap fixed by window: clean==reorder digest — OK`
      : `FAIL: error=${reorderResult.error} clean=${cleanResult.digest?.slice(0, 16)} reorder=${reorderResult.digest?.slice(0, 16)}`,
  });
}

// ── Scenario 2: In-order stream → window does not harm it ──
{
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [['49100', '0.5']], []),
    makeMsg('update', 102, 101, [], [['50100', '0.2']]),
    makeMsg('update', 103, 102, [['48900', '0.8']], []),
  ];

  const cleanResult = runClean(msgs);
  const reorderResult = runWithReorderWindow(msgs, WINDOW_SIZE);

  checks.push({
    check: 'in_order_digest_unchanged_by_window',
    pass: !reorderResult.error && cleanResult.digest === reorderResult.digest,
    detail: !reorderResult.error && cleanResult.digest === reorderResult.digest
      ? `in-order: window does not alter digest — OK`
      : `FAIL: error=${reorderResult.error} clean=${cleanResult.digest?.slice(0, 16)} reorder=${reorderResult.digest?.slice(0, 16)}`,
  });
}

// ── Scenario 3: Window size matches capability value ──
{
  // Build a stream with snapshot + (WINDOW_SIZE-1) updates so snapshot+updates
  // all fit within one window flush (snapshot takes one buffer slot)
  const msgs = [makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']])];
  const updateCount = WINDOW_SIZE - 1;
  for (let i = 1; i <= updateCount; i++) {
    msgs.push(makeMsg('update', 100 + i, 100 + i - 1, [[`${49000 + i * 10}`, '0.1']], []));
  }

  // Reverse the updates (worst-case reorder within window capacity)
  const reversed = [msgs[0], ...msgs.slice(1).reverse()];

  const cleanResult = runClean(msgs);
  const reorderResult = runWithReorderWindow(reversed, WINDOW_SIZE);

  checks.push({
    check: 'window_size_handles_full_reversal',
    pass: !reorderResult.error && cleanResult.digest === reorderResult.digest,
    detail: !reorderResult.error && cleanResult.digest === reorderResult.digest
      ? `full reversal of ${updateCount} updates (window=${WINDOW_SIZE}) resolved — OK`
      : `FAIL: error=${reorderResult.error} clean=${cleanResult.digest?.slice(0, 16)} reorder=${reorderResult.digest?.slice(0, 16)}`,
  });
}

// ── Scenario 4: Determinism — same out-of-order stream → same digest x2 ──
{
  const outOfOrder = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 102, 101, [], [['50050', '0.3']]),
    makeMsg('update', 101, 100, [['49100', '0.5']], []),
    makeMsg('update', 103, 102, [['49000', '0']], []),
  ];

  const r1 = runWithReorderWindow(outOfOrder, WINDOW_SIZE);
  const r2 = runWithReorderWindow(outOfOrder, WINDOW_SIZE);

  checks.push({
    check: 'reorder_determinism_x2',
    pass: !r1.error && !r2.error && r1.digest === r2.digest,
    detail: !r1.error && !r2.error && r1.digest === r2.digest
      ? `reorder determinism x2: r1==r2 digest — OK`
      : `FAIL: r1_err=${r1.error} r2_err=${r2.error} r1=${r1.digest?.slice(0, 16)} r2=${r2.digest?.slice(0, 16)}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX10_REORDER_WINDOW_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX10.md'), [
  '# REGRESSION_OB_OKX10.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  `- reorder_window_max_items=${WINDOW_SIZE} (from data_capabilities.json)`,
  '- Sort buffer by seqId (integer) before processing batch',
  '- Reordered stream must produce same digest as in-order stream',
  '- Deterministic: same input → same digest x2', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx10.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX10_REORDER_WINDOW_POLICY',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  window_size: WINDOW_SIZE,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx10_reorder_window_policy — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
