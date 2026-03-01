/**
 * regression_ob_okx09_duplicate_idempotent.mjs — RG_OB_OKX09_DUPLICATE_IDEMPOTENT
 *
 * Gate: Verify that duplicate messages (same seqId) are idempotent —
 *       dedup by seqId must produce the same canonical book digest
 *       as a clean (no-duplicate) message stream.
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx09-duplicate-idempotent';

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

// Seq-state machine with dedup (seqId-based)
function runWithDedup(messages) {
  const seenSeqIds = new Set();
  const bids = new Map();
  const asks = new Map();
  let lastSeqId = -1;
  let booted = false;
  let dedupCount = 0;
  const events = [];

  for (const msg of messages) {
    const d = msg.data[0];
    const { seqId, prevSeqId } = d;
    const action = msg.action || 'update';

    // Dedup: skip if seqId already seen
    if (seenSeqIds.has(seqId)) {
      dedupCount++;
      events.push({ type: 'DEDUP', seqId });
      continue;
    }
    seenSeqIds.add(seqId);

    // OKX no-update (seqId == prevSeqId within message) → SKIP
    if (seqId === prevSeqId) {
      events.push({ type: 'SKIP', seqId });
      continue;
    }

    if (action === 'snapshot' && prevSeqId === -1) {
      bids.clear(); asks.clear();
      for (const [p, s] of (d.bids || [])) { if (s !== '0') bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s !== '0') asks.set(p, s); }
      lastSeqId = seqId;
      if (!booted) { booted = true; events.push({ type: 'BOOK_BOOT', seqId }); }
      else { events.push({ type: 'BOOK_RESET', seqId }); }
      continue;
    }

    if (!booted) { return { error: 'no boot snapshot', events, dedupCount }; }

    if (prevSeqId === lastSeqId) {
      for (const [p, s] of (d.bids || [])) { if (s === '0') bids.delete(p); else bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s === '0') asks.delete(p); else asks.set(p, s); }
      lastSeqId = seqId;
      events.push({ type: 'BOOK_APPLY', seqId });
    } else if (prevSeqId < lastSeqId) {
      lastSeqId = seqId;
      events.push({ type: 'BOOK_RESET_PATH', seqId });
    } else {
      return { error: `GAP: prevSeqId=${prevSeqId} > lastSeqId=${lastSeqId}`, events, dedupCount };
    }
  }

  const canonBids = [...bids.entries()].filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(b[0], a[0])).map(([p, s]) => [p, s]);
  const canonAsks = [...asks.entries()].filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(a[0], b[0])).map(([p, s]) => [p, s]);
  const canonJson = JSON.stringify({ asks: canonAsks, bids: canonBids });
  return { digest: sha256(canonJson), canonJson, events, dedupCount, error: null };
}

const makeMsg = (action, seqId, prevSeqId, bids = [], asks = []) =>
  ({ action, data: [{ seqId, prevSeqId, bids, asks }] });

const checks = [];

// ── Scenario 1: Single duplicate — digest unchanged ──
{
  const clean = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [], [['50100', '0.5']]),
    makeMsg('update', 102, 101, [['49000', '0']], []),
  ];
  const withDup = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [], [['50100', '0.5']]),
    makeMsg('update', 101, 100, [], [['50100', '0.5']]), // DUPLICATE
    makeMsg('update', 102, 101, [['49000', '0']], []),
  ];
  const cleanResult = runWithDedup(clean);
  const dupResult = runWithDedup(withDup);

  checks.push({
    check: 'single_dup_digest_unchanged',
    pass: cleanResult.digest === dupResult.digest,
    detail: cleanResult.digest === dupResult.digest
      ? `clean=${cleanResult.digest.slice(0, 16)} dup=${dupResult.digest.slice(0, 16)} — EQUAL OK`
      : `FAIL: clean=${cleanResult.digest.slice(0, 16)} dup=${dupResult.digest.slice(0, 16)} differ`,
  });
  checks.push({
    check: 'single_dup_counted',
    pass: dupResult.dedupCount === 1,
    detail: dupResult.dedupCount === 1
      ? `dedup_count=1 — OK`
      : `FAIL: dedup_count=${dupResult.dedupCount} expected 1`,
  });
}

// ── Scenario 2: Multiple duplicates — digest unchanged ──
{
  const clean = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [['49100', '0.5']], []),
    makeMsg('update', 102, 101, [], [['50050', '0.3']]),
  ];
  const withDups = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]), // dup snapshot
    makeMsg('update', 101, 100, [['49100', '0.5']], []),
    makeMsg('update', 101, 100, [['49100', '0.5']], []), // dup update
    makeMsg('update', 101, 100, [['49100', '0.5']], []), // another dup
    makeMsg('update', 102, 101, [], [['50050', '0.3']]),
  ];
  const cleanResult = runWithDedup(clean);
  const dupResult = runWithDedup(withDups);

  checks.push({
    check: 'multi_dup_digest_unchanged',
    pass: cleanResult.digest === dupResult.digest,
    detail: cleanResult.digest === dupResult.digest
      ? `multi-dup: clean==dup digest — OK`
      : `FAIL: digests differ`,
  });
  checks.push({
    check: 'multi_dup_counted',
    pass: dupResult.dedupCount === 3,
    detail: dupResult.dedupCount === 3
      ? `dedup_count=3 — OK`
      : `FAIL: dedup_count=${dupResult.dedupCount} expected 3`,
  });
}

// ── Scenario 3: No duplicates — dedup count is zero ──
{
  const clean = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [], []),
    makeMsg('update', 102, 101, [], []),
  ];
  const r = runWithDedup(clean);
  checks.push({
    check: 'no_dup_dedup_count_zero',
    pass: r.dedupCount === 0,
    detail: r.dedupCount === 0 ? `no duplicates: dedup_count=0 — OK` : `FAIL: dedup_count=${r.dedupCount}`,
  });
}

// ── Scenario 4: Dedup does not affect seqId chain ──
{
  // After dedup of seqId=101, the chain continues with seqId=102 correctly
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [['49100', '0.5']], []),
    makeMsg('update', 101, 100, [['49200', '0.3']], []), // dup — should NOT apply the 49200 entry
    makeMsg('update', 102, 101, [], [['50100', '0.2']]),
  ];
  const r = runWithDedup(msgs);
  const expectedCanonBids = JSON.stringify([['49100', '0.5'], ['49000', '1.0']]);
  const actualCanonBids = JSON.parse(r.canonJson).bids;
  const bidsMatch = JSON.stringify(actualCanonBids) === expectedCanonBids;
  checks.push({
    check: 'dup_does_not_corrupt_state',
    pass: bidsMatch && r.dedupCount === 1,
    detail: bidsMatch && r.dedupCount === 1
      ? `dup rejected: bids=${JSON.stringify(actualCanonBids)} — 49200 not applied — OK`
      : `FAIL: bids=${JSON.stringify(actualCanonBids)} expected ${expectedCanonBids} dedup=${r.dedupCount}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX09_DEDUP_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX09.md'), [
  '# REGRESSION_OB_OKX09.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- Dedup by seqId: if seqId already seen, skip the message',
  '- Duplicates must not change the canonical book digest',
  '- Duplicates must not corrupt the seq-state chain', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx09.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX09_DUPLICATE_IDEMPOTENT',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx09_duplicate_idempotent — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
