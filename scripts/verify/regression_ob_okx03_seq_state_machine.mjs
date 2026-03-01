/**
 * regression_ob_okx03_seq_state_machine.mjs — RG_OB_OKX03_SEQ_STATE_MACHINE
 *
 * Gate: Verify the seq-state machine correctly processes the main fixture.
 *       Checks that each message is classified correctly:
 *         - snapshot + prevSeqId=-1  → BOOT (first) or RESET (subsequent)
 *         - seqId == prevSeqId       → SKIP (OKX_SEQ_NO_UPDATE)
 *         - prevSeqId == lastSeqId   → APPLY (sequential)
 *         - prevSeqId < lastSeqId    → RESET_PATH
 *         - prevSeqId > lastSeqId    → GAP FATAL
 *
 *       Also verifies: event log matches lock.events_expected.
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx03-seq-state-machine';
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main');
const FIXTURE_PATH = path.join(FIXTURE_BASE, 'fixture.jsonl');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');

const checks = [];

if (!fs.existsSync(FIXTURE_PATH) || !fs.existsSync(LOCK_PATH)) {
  checks.push({
    check: 'fixture_and_lock_present',
    pass: false,
    detail: `MISSING: fixture=${fs.existsSync(FIXTURE_PATH)} lock=${fs.existsSync(LOCK_PATH)}`,
  });
} else {
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const msgs = lines.map((l) => JSON.parse(l));

  // Run seq-state machine
  let lastSeqId = -1;
  let booted = false;
  const eventLog = [];
  let machineFatal = null;

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    const d = msg.data[0];
    const { seqId, prevSeqId } = d;
    const action = msg.action;

    if (seqId === prevSeqId) {
      eventLog.push('SKIP');
      continue;
    }

    if (action === 'snapshot' && prevSeqId === -1) {
      if (!booted) {
        booted = true;
        eventLog.push('BOOK_BOOT');
      } else {
        eventLog.push('BOOK_RESET');
      }
      lastSeqId = seqId;
      continue;
    }

    if (!booted) {
      machineFatal = `line ${i + 1}: first non-skip message must be snapshot with prevSeqId=-1`;
      break;
    }

    if (prevSeqId === lastSeqId) {
      eventLog.push('BOOK_APPLY');
      lastSeqId = seqId;
    } else if (prevSeqId < lastSeqId) {
      eventLog.push('BOOK_RESET_PATH');
      lastSeqId = seqId;
    } else {
      machineFatal = `line ${i + 1}: BOOK_GAP prevSeqId=${prevSeqId} > lastSeqId=${lastSeqId}`;
      eventLog.push('BOOK_GAP');
      break;
    }
  }

  checks.push({
    check: 'seq_machine_no_fatal',
    pass: machineFatal === null,
    detail: machineFatal === null ? 'seq-state machine completed without fatal error — OK' : `FATAL: ${machineFatal}`,
  });

  if (machineFatal === null) {
    // Check booted
    checks.push({
      check: 'book_boot_occurred',
      pass: booted,
      detail: booted ? 'BOOK_BOOT triggered — OK' : 'BOOK_BOOT never triggered',
    });

    // Check final seqId
    checks.push({
      check: 'final_seqId_matches_lock',
      pass: lastSeqId === lock.final_seqId,
      detail: lastSeqId === lock.final_seqId
        ? `final_seqId=${lastSeqId} — OK`
        : `MISMATCH: computed=${lastSeqId} lock=${lock.final_seqId}`,
    });

    // Check event log matches lock.events_expected
    const expectedEvents = lock.events_expected || [];
    const eventMatch = JSON.stringify(eventLog) === JSON.stringify(expectedEvents);
    checks.push({
      check: 'event_log_matches_expected',
      pass: eventMatch,
      detail: eventMatch
        ? `event_log=[${eventLog.join(', ')}] matches lock.events_expected — OK`
        : `MISMATCH: computed=[${eventLog.join(', ')}] expected=[${expectedEvents.join(', ')}]`,
    });

    // Check BOOK_APPLY count (non-zero)
    const applyCount = eventLog.filter((e) => e === 'BOOK_APPLY').length;
    checks.push({
      check: 'at_least_one_book_apply',
      pass: applyCount > 0,
      detail: applyCount > 0 ? `BOOK_APPLY count=${applyCount} — OK` : 'no BOOK_APPLY events',
    });

    // Check BOOK_RESET count (for seq_reset fixture)
    const resetCount = eventLog.filter((e) => e === 'BOOK_RESET').length;
    checks.push({
      check: 'at_least_one_book_reset',
      pass: resetCount > 0,
      detail: resetCount > 0 ? `BOOK_RESET count=${resetCount} — OK` : 'no BOOK_RESET events (expected from fixture)',
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX03_SEQ_STATE_MACHINE_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX03.md'), [
  '# REGRESSION_OB_OKX03.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## STATE_MACHINE_RULES',
  '- snapshot+prevSeqId=-1: BOOT (first) or RESET (subsequent)',
  '- seqId==prevSeqId: SKIP (OKX_SEQ_NO_UPDATE)',
  '- prevSeqId==lastSeqId: APPLY (sequential)',
  '- prevSeqId<lastSeqId: RESET_PATH',
  '- prevSeqId>lastSeqId: GAP FATAL', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx03.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX03_SEQ_STATE_MACHINE',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx03_seq_state_machine — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
