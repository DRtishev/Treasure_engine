/**
 * regression_ob_okx01_fixture_integrity.mjs — RG_OB_OKX01_FIXTURE_INTEGRITY
 *
 * Gate: OKX orderbook main fixture exists, is valid JSON Lines,
 *       has the expected message count, and all messages have required fields.
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx01-fixture-integrity';
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main');
const FIXTURE_PATH = path.join(FIXTURE_BASE, 'fixture.jsonl');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');

const checks = [];

// Check 1: fixture file exists
checks.push({
  check: 'fixture_file_exists',
  pass: fs.existsSync(FIXTURE_PATH),
  detail: fs.existsSync(FIXTURE_PATH) ? `fixture.jsonl present — OK` : `MISSING: ${path.relative(ROOT, FIXTURE_PATH)}`,
});

// Check 2: lock file exists
checks.push({
  check: 'lock_file_exists',
  pass: fs.existsSync(LOCK_PATH),
  detail: fs.existsSync(LOCK_PATH) ? `lock.json present — OK` : `MISSING: ${path.relative(ROOT, LOCK_PATH)}`,
});

if (fs.existsSync(FIXTURE_PATH) && fs.existsSync(LOCK_PATH)) {
  // Parse lock
  let lock = null;
  try {
    lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    checks.push({ check: 'lock_parseable', pass: true, detail: 'lock.json parse OK' });
  } catch (e) {
    checks.push({ check: 'lock_parseable', pass: false, detail: `parse error: ${e.message}` });
  }

  // Parse fixture lines
  const rawLines = fs.readFileSync(FIXTURE_PATH, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  checks.push({
    check: 'fixture_non_empty',
    pass: rawLines.length > 0,
    detail: `fixture has ${rawLines.length} line(s)`,
  });

  // Parse each line as JSON
  const msgs = [];
  let parseOk = true;
  for (let i = 0; i < rawLines.length; i++) {
    try {
      msgs.push(JSON.parse(rawLines[i]));
    } catch (e) {
      parseOk = false;
      checks.push({ check: `line_${i + 1}_parseable`, pass: false, detail: `JSON parse error at line ${i + 1}: ${e.message}` });
    }
  }
  if (parseOk) {
    checks.push({ check: 'all_lines_parseable', pass: true, detail: `all ${rawLines.length} lines are valid JSON` });
  }

  if (lock && parseOk) {
    // Check messages_n matches lock
    checks.push({
      check: 'messages_n_matches_lock',
      pass: rawLines.length === lock.messages_n,
      detail: rawLines.length === lock.messages_n
        ? `messages_n=${rawLines.length} — OK`
        : `MISMATCH: fixture=${rawLines.length} lock=${lock.messages_n}`,
    });

    // Check required fields on each message
    const REQUIRED_MSG_FIELDS = ['action', 'data'];
    const REQUIRED_DATA_FIELDS = ['seqId', 'prevSeqId', 'bids', 'asks'];
    let allFieldsOk = true;

    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      for (const f of REQUIRED_MSG_FIELDS) {
        if (!(f in msg)) {
          checks.push({ check: `line_${i + 1}_field_${f}`, pass: false, detail: `missing field '${f}' at line ${i + 1}` });
          allFieldsOk = false;
        }
      }
      if (Array.isArray(msg.data) && msg.data.length > 0) {
        const d = msg.data[0];
        for (const f of REQUIRED_DATA_FIELDS) {
          if (!(f in d)) {
            checks.push({ check: `line_${i + 1}_data_field_${f}`, pass: false, detail: `missing data[0].${f} at line ${i + 1}` });
            allFieldsOk = false;
          }
        }
      }
    }
    if (allFieldsOk) {
      checks.push({
        check: 'all_messages_have_required_fields',
        pass: true,
        detail: `all ${msgs.length} messages have action, data[0].seqId/prevSeqId/bids/asks — OK`,
      });
    }

    // Check fixture has at least one snapshot (boot) message
    const snapshots = msgs.filter((m) => m.action === 'snapshot' && m.data[0].prevSeqId === -1);
    checks.push({
      check: 'fixture_has_boot_snapshot',
      pass: snapshots.length > 0,
      detail: snapshots.length > 0
        ? `${snapshots.length} snapshot(s) with prevSeqId=-1 found — OK`
        : `MISSING: no snapshot with prevSeqId=-1 (BOOK_BOOT trigger)`,
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX01_FIXTURE_INVALID';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX01.md'), [
  '# REGRESSION_OB_OKX01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## FIXTURE_PATH',
  `- ${path.relative(ROOT, FIXTURE_PATH)}`,
  `- ${path.relative(ROOT, LOCK_PATH)}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX01_FIXTURE_INTEGRITY',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx01_fixture_integrity — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
