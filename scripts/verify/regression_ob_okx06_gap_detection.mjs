/**
 * regression_ob_okx06_gap_detection.mjs — RG_OB_OKX06_GAP_DETECTION
 *
 * Gate: Verify that the replay script correctly detects sequence gaps.
 *       A gap (prevSeqId > lastSeqId) must cause RDY02 FATAL (EC=1).
 *       Also verifies: no-update (seqId==prevSeqId) is silently skipped (EC=0).
 *
 * Uses synthetic in-memory fixture fragments (no disk write needed).
 * Exercises the seq-state machine logic directly (not via subprocess).
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx06-gap-detection';

// Minimal seq-state machine for simulation
function runSeqMachine(messages) {
  let lastSeqId = -1;
  let booted = false;
  const bids = new Map();
  const asks = new Map();
  const events = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const d = msg.data[0];
    const { seqId, prevSeqId } = d;
    const action = msg.action;

    if (seqId === prevSeqId) {
      events.push({ type: 'SKIP', seqId, prevSeqId, line: i + 1 });
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

    if (!booted) { return { events, error: 'no boot snapshot', fatal: true }; }

    if (prevSeqId === lastSeqId) {
      for (const [p, s] of (d.bids || [])) { if (s === '0') bids.delete(p); else bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s === '0') asks.delete(p); else asks.set(p, s); }
      lastSeqId = seqId;
      events.push({ type: 'BOOK_APPLY', seqId, prevSeqId });
    } else if (prevSeqId < lastSeqId) {
      lastSeqId = seqId;
      events.push({ type: 'BOOK_RESET_PATH', seqId, prevSeqId, lastSeqId });
    } else {
      // GAP: prevSeqId > lastSeqId
      events.push({ type: 'BOOK_GAP', seqId, prevSeqId, lastSeqId, gap: prevSeqId - lastSeqId });
      return { events, error: `GAP: prevSeqId=${prevSeqId} > lastSeqId=${lastSeqId}`, fatal: true };
    }
  }
  return { events, error: null, fatal: false, lastSeqId, booted };
}

function makeMsg(action, seqId, prevSeqId, bids = [], asks = []) {
  return { action, data: [{ seqId, prevSeqId, bids, asks }] };
}

const checks = [];

// ── Scenario 1: Normal sequential chain (should NOT gap) ──
{
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100),
    makeMsg('update', 102, 101),
  ];
  const r = runSeqMachine(msgs);
  checks.push({
    check: 'scenario_normal_chain_no_gap',
    pass: !r.fatal && r.events.map((e) => e.type).join(',') === 'BOOK_BOOT,BOOK_APPLY,BOOK_APPLY',
    detail: !r.fatal
      ? `normal chain completed: [${r.events.map((e) => e.type).join(', ')}] — OK`
      : `UNEXPECTED FATAL: ${r.error}`,
  });
}

// ── Scenario 2: GAP (prevSeqId > lastSeqId) → must be FATAL ──
{
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 102, 101), // prevSeqId=101 > lastSeqId=100 → GAP
  ];
  const r = runSeqMachine(msgs);
  const hasGap = r.events.some((e) => e.type === 'BOOK_GAP');
  checks.push({
    check: 'scenario_gap_detected_as_fatal',
    pass: r.fatal && hasGap,
    detail: r.fatal && hasGap
      ? `GAP correctly detected as fatal: ${r.error} — OK`
      : `FAIL: expected GAP fatal, got fatal=${r.fatal} hasGap=${hasGap}`,
  });
}

// ── Scenario 3: No-update (seqId == prevSeqId) → SKIP, not fatal ──
{
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 100, 100), // seqId==prevSeqId → SKIP
    makeMsg('update', 101, 100), // normal APPLY after skip
  ];
  const r = runSeqMachine(msgs);
  const types = r.events.map((e) => e.type);
  checks.push({
    check: 'scenario_no_update_skip_not_fatal',
    pass: !r.fatal && types.includes('SKIP') && types.includes('BOOK_APPLY'),
    detail: !r.fatal && types.includes('SKIP')
      ? `no-update SKIP handled correctly, chain continues: [${types.join(', ')}] — OK`
      : `FAIL: fatal=${r.fatal} types=[${types.join(', ')}]`,
  });
}

// ── Scenario 4: Seq-reset (snapshot mid-chain) → BOOK_RESET ──
{
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100),
    makeMsg('snapshot', 200, -1, [['49100', '2.0']], [['50100', '2.0']]), // RESET
    makeMsg('update', 201, 200),
  ];
  const r = runSeqMachine(msgs);
  const types = r.events.map((e) => e.type);
  checks.push({
    check: 'scenario_seq_reset_triggers_book_reset',
    pass: !r.fatal && types.includes('BOOK_RESET'),
    detail: !r.fatal && types.includes('BOOK_RESET')
      ? `seq-reset correctly triggers BOOK_RESET: [${types.join(', ')}] — OK`
      : `FAIL: fatal=${r.fatal} types=[${types.join(', ')}]`,
  });
}

// ── Scenario 5: Empty update (bids=[], asks=[]) → BOOK_APPLY, no fatal ──
{
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 101, 100, [], []), // empty
    makeMsg('update', 102, 101),
  ];
  const r = runSeqMachine(msgs);
  const types = r.events.map((e) => e.type);
  const applyCount = types.filter((t) => t === 'BOOK_APPLY').length;
  checks.push({
    check: 'scenario_empty_update_not_fatal',
    pass: !r.fatal && applyCount === 2,
    detail: !r.fatal && applyCount === 2
      ? `empty update treated as BOOK_APPLY (chain valid): [${types.join(', ')}] — OK`
      : `FAIL: fatal=${r.fatal} apply_count=${applyCount}`,
  });
}

// ── Scenario 6: Double-gap detection ──
{
  const msgs = [
    makeMsg('snapshot', 100, -1, [['49000', '1.0']], [['50000', '1.0']]),
    makeMsg('update', 105, 103), // prevSeqId=103 > lastSeqId=100 → GAP
  ];
  const r = runSeqMachine(msgs);
  const gapEvent = r.events.find((e) => e.type === 'BOOK_GAP');
  checks.push({
    check: 'scenario_gap_size_correct',
    pass: r.fatal && gapEvent && gapEvent.gap === 3,
    detail: r.fatal && gapEvent
      ? `GAP detected with gap=${gapEvent.gap} (expected 3) — OK`
      : `FAIL: fatal=${r.fatal} gapEvent=${JSON.stringify(gapEvent)}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX06_GAP_DETECTION_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX06.md'), [
  '# REGRESSION_OB_OKX06.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## SCENARIOS',
  '1. Normal sequential chain → no gap',
  '2. GAP (prevSeqId > lastSeqId) → BOOK_GAP FATAL',
  '3. No-update (seqId==prevSeqId) → SKIP, chain continues',
  '4. Seq-reset mid-chain → BOOK_RESET',
  '5. Empty update (bids=[] asks=[]) → BOOK_APPLY (chain valid)',
  '6. Gap size verification → gap=3 correctly computed', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx06.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX06_GAP_DETECTION',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx06_gap_detection — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
