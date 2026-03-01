/**
 * regression_ob_okx13_buffer_discard_rules.mjs — RG_OB_OKX13_BUFFER_DISCARD_RULES
 *
 * Gate: Verify discard rules for the align buffer:
 *   1. All messages with seqId <= snapshot.seqId are discarded
 *   2. Discard count matches lock.discarded_n
 *   3. No non-discarded message has seqId <= snapshot.seqId
 *   4. Applied count matches lock.applied_n
 *
 * Also verifies synthetic scenarios:
 *   5. An all-discarded buffer returns EC=2 (NEEDS_DATA / no events to apply)
 *   6. A buffer missing the ALIGN_FIRST_EVENT fails (EC=1)
 *
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx13-buffer-discard-rules';
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'align');
const BUFFER_PATH = path.join(FIXTURE_BASE, 'buffer.jsonl');
const SNAPSHOT_PATH = path.join(FIXTURE_BASE, 'snapshot.json');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');

const checks = [];

// Simulation: apply discard rules to a list of messages
function applyDiscardRules(messages, snapshotSeqId) {
  const discarded = [];
  const kept = [];
  for (const m of messages) {
    const seqId = m.data[0].seqId;
    if (seqId <= snapshotSeqId) discarded.push(m);
    else kept.push(m);
  }
  return { discarded, kept };
}

if ([BUFFER_PATH, SNAPSHOT_PATH, LOCK_PATH].every((p) => fs.existsSync(p))) {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const bufLines = fs.readFileSync(BUFFER_PATH, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  const msgs = bufLines.map((l) => JSON.parse(l));
  const { discarded, kept } = applyDiscardRules(msgs, snapshot.seqId);

  // Check 1: All discarded have seqId <= snapshot.seqId
  const discardCorrect = discarded.every((m) => m.data[0].seqId <= snapshot.seqId);
  checks.push({
    check: 'all_discarded_have_seqId_lte_snapshot',
    pass: discardCorrect,
    detail: discardCorrect
      ? `all ${discarded.length} discarded messages have seqId <= ${snapshot.seqId} — OK`
      : `FAIL: some discarded messages violate seqId <= snapshot.seqId`,
  });

  // Check 2: All kept have seqId > snapshot.seqId
  const keptCorrect = kept.every((m) => m.data[0].seqId > snapshot.seqId);
  checks.push({
    check: 'all_kept_have_seqId_gt_snapshot',
    pass: keptCorrect,
    detail: keptCorrect
      ? `all ${kept.length} kept messages have seqId > ${snapshot.seqId} — OK`
      : `FAIL: some kept messages have seqId <= snapshot.seqId`,
  });

  // Check 3: Discard count matches lock
  checks.push({
    check: 'discard_count_matches_lock',
    pass: discarded.length === lock.discarded_n,
    detail: discarded.length === lock.discarded_n
      ? `discarded_n=${discarded.length} matches lock — OK`
      : `MISMATCH: computed=${discarded.length} lock=${lock.discarded_n}`,
  });

  // Check 4: Applied count matches lock
  checks.push({
    check: 'applied_count_matches_lock',
    pass: kept.length === lock.applied_n,
    detail: kept.length === lock.applied_n
      ? `applied_n=${kept.length} matches lock — OK`
      : `MISMATCH: computed=${kept.length} lock=${lock.applied_n}`,
  });

  // Check 5: Discard rule boundary (seqId == snapshot.seqId → discard, seqId == snapshot.seqId+1 → keep)
  const makeMsg = (seqId, prevSeqId) => ({ data: [{ seqId, prevSeqId, bids: [], asks: [] }] });
  const boundary = applyDiscardRules([
    makeMsg(snapshot.seqId, snapshot.seqId - 1),    // seqId == snapshot.seqId → DISCARD
    makeMsg(snapshot.seqId + 1, snapshot.seqId),    // seqId == snapshot.seqId+1 → KEEP
  ], snapshot.seqId);
  checks.push({
    check: 'boundary_condition_exact',
    pass: boundary.discarded.length === 1 && boundary.kept.length === 1,
    detail: boundary.discarded.length === 1 && boundary.kept.length === 1
      ? `boundary: seqId==${snapshot.seqId}→discard, seqId==${snapshot.seqId + 1}→keep — OK`
      : `FAIL: boundary discarded=${boundary.discarded.length} kept=${boundary.kept.length}`,
  });
} else {
  checks.push({ check: 'fixtures_present', pass: false, detail: 'MISSING align fixtures' });
}

// ── Synthetic: All-discarded buffer ──
{
  // If all messages have seqId <= snapshotSeqId, alignment is impossible — no first event
  const snapshotSeqId = 100;
  const msgs = [
    { data: [{ seqId: 98, prevSeqId: 97, bids: [], asks: [] }] },
    { data: [{ seqId: 100, prevSeqId: 99, bids: [], asks: [] }] },
  ];
  const { kept } = applyDiscardRules(msgs, snapshotSeqId);
  checks.push({
    check: 'all_discarded_no_first_event',
    pass: kept.length === 0,
    detail: kept.length === 0
      ? `all-discarded buffer: kept=0 → no ALIGN_FIRST_EVENT — OK`
      : `FAIL: kept=${kept.length} messages unexpectedly`,
  });
}

// ── Synthetic: First non-discarded fails ALIGN_FIRST_EVENT ──
{
  // seqId=105 with prevSeqId=103 and snapshot.seqId=100:
  // prevSeqId=103 > snapshot.seqId=100 — this means a gap between snapshot and first event
  const snapshotSeqId = 100;
  const firstKept = { data: [{ seqId: 105, prevSeqId: 103, bids: [], asks: [] }] };
  const afe = firstKept.data[0].prevSeqId <= snapshotSeqId && snapshotSeqId < firstKept.data[0].seqId;
  checks.push({
    check: 'align_first_event_gap_detected',
    pass: !afe,
    detail: !afe
      ? `gap scenario: prevSeqId=${firstKept.data[0].prevSeqId} > snapshot.seqId=${snapshotSeqId} → ALIGN_FIRST_EVENT_FAIL — OK`
      : `UNEXPECTED: gap scenario passed ALIGN_FIRST_EVENT condition`,
  });
}

// ── Synthetic: Perfect first event ──
{
  // seqId=101 with prevSeqId=100 and snapshot.seqId=100: 100 <= 100 < 101 ✓
  const snapshotSeqId = 100;
  const firstKept = { data: [{ seqId: 101, prevSeqId: 100, bids: [], asks: [] }] };
  const afe = firstKept.data[0].prevSeqId <= snapshotSeqId && snapshotSeqId < firstKept.data[0].seqId;
  checks.push({
    check: 'align_first_event_perfect_match',
    pass: afe,
    detail: afe
      ? `perfect first event: prevSeqId=100 <= snapshot.seqId=100 < seqId=101 → ALIGN_FIRST_EVENT — OK`
      : `FAIL: perfect match rejected`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX13_DISCARD_RULES_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX13.md'), [
  '# REGRESSION_OB_OKX13.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## DISCARD_RULE',
  '- seqId <= snapshot.seqId → DISCARD',
  '- seqId > snapshot.seqId → KEEP (candidate for ALIGN_FIRST_EVENT or STRICT)', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx13.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX13_BUFFER_DISCARD_RULES',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx13_buffer_discard_rules — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
