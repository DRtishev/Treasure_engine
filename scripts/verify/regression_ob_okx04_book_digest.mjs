/**
 * regression_ob_okx04_book_digest.mjs — RG_OB_OKX04_BOOK_DIGEST
 *
 * Gate: Canonical book digest computed from main fixture matches lock.
 *       Also verifies determinism by computing twice and comparing.
 *
 * Canonical digest algorithm:
 *   - Process all messages through the seq-state machine
 *   - Final book state: Map<price_str, size_str>
 *   - Bids: sorted descending by price (parseFloat)
 *   - Asks: sorted ascending by price (parseFloat)
 *   - Zero-size entries excluded
 *   - Only [price, size] tuples (no checksum/count/ts/update_id)
 *   - sha256(JSON.stringify({ asks: [...], bids: [...] }))
 *
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx04-book-digest';
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main');
const FIXTURE_PATH = path.join(FIXTURE_BASE, 'fixture.jsonl');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

function computeCanonicalDigest(msgs) {
  const bids = new Map();
  const asks = new Map();
  let lastSeqId = -1;
  let booted = false;

  for (const msg of msgs) {
    const d = msg.data[0];
    const { seqId, prevSeqId } = d;
    const action = msg.action;

    if (seqId === prevSeqId) continue; // SKIP

    if (action === 'snapshot' && prevSeqId === -1) {
      bids.clear();
      asks.clear();
      for (const [p, s] of (d.bids || [])) { if (s !== '0') bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s !== '0') asks.set(p, s); }
      lastSeqId = seqId;
      booted = true;
      continue;
    }

    if (!booted) throw new Error('no boot snapshot');

    if (prevSeqId === lastSeqId) {
      for (const [p, s] of (d.bids || [])) { if (s === '0') bids.delete(p); else bids.set(p, s); }
      for (const [p, s] of (d.asks || [])) { if (s === '0') asks.delete(p); else asks.set(p, s); }
      lastSeqId = seqId;
    } else if (prevSeqId < lastSeqId) {
      lastSeqId = seqId; // RESET_PATH
    } else {
      throw new Error(`GAP: prevSeqId=${prevSeqId} > lastSeqId=${lastSeqId}`);
    }
  }

  const canonBids = [...bids.entries()]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
    .map(([p, s]) => [p, s]);
  const canonAsks = [...asks.entries()]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([p, s]) => [p, s]);

  const canonObj = { asks: canonAsks, bids: canonBids };
  const canonJson = JSON.stringify(canonObj);
  return { digest: sha256(canonJson), canonJson, bids_n: canonBids.length, asks_n: canonAsks.length };
}

const checks = [];

if (!fs.existsSync(FIXTURE_PATH) || !fs.existsSync(LOCK_PATH)) {
  checks.push({
    check: 'fixture_and_lock_present',
    pass: false,
    detail: `MISSING fixture or lock`,
  });
} else {
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const msgs = raw.split('\n').map((l) => l.trim()).filter(Boolean).map(JSON.parse);

  // Compute digest (run 1)
  let result1;
  try {
    result1 = computeCanonicalDigest(msgs);
    checks.push({ check: 'digest_computed_run1', pass: true, detail: `digest=${result1.digest.slice(0, 16)}... bids=${result1.bids_n} asks=${result1.asks_n}` });
  } catch (e) {
    checks.push({ check: 'digest_computed_run1', pass: false, detail: `ERROR: ${e.message}` });
    result1 = null;
  }

  // Compute digest (run 2 — determinism check)
  let result2;
  try {
    result2 = computeCanonicalDigest(msgs);
    checks.push({ check: 'digest_computed_run2', pass: true, detail: `digest=${result2.digest.slice(0, 16)}...` });
  } catch (e) {
    checks.push({ check: 'digest_computed_run2', pass: false, detail: `ERROR: ${e.message}` });
    result2 = null;
  }

  if (result1 && result2) {
    // Determinism check
    checks.push({
      check: 'digest_deterministic',
      pass: result1.digest === result2.digest,
      detail: result1.digest === result2.digest
        ? `run1===run2=${result1.digest.slice(0, 16)}... — deterministic OK`
        : `NON_DETERMINISTIC: run1=${result1.digest.slice(0, 16)}... run2=${result2.digest.slice(0, 16)}...`,
    });

    // Match lock
    checks.push({
      check: 'digest_matches_lock',
      pass: result1.digest === lock.canonical_book_digest_sha256,
      detail: result1.digest === lock.canonical_book_digest_sha256
        ? `digest=${result1.digest.slice(0, 16)}... matches lock — OK`
        : `MISMATCH: computed=${result1.digest.slice(0, 16)}... lock=${(lock.canonical_book_digest_sha256 || '').slice(0, 16)}...`,
    });

    // Check canon JSON in lock (if present) matches
    if (lock.canon_book_json) {
      checks.push({
        check: 'canon_book_json_matches_lock',
        pass: result1.canonJson === lock.canon_book_json,
        detail: result1.canonJson === lock.canon_book_json
          ? `canon_book_json matches lock — OK`
          : `MISMATCH: computed=${result1.canonJson} lock=${lock.canon_book_json}`,
      });
    }

    // Final book has non-empty bids and asks
    checks.push({
      check: 'final_book_non_empty',
      pass: result1.bids_n > 0 && result1.asks_n > 0,
      detail: `bids=${result1.bids_n} asks=${result1.asks_n} — ${result1.bids_n > 0 && result1.asks_n > 0 ? 'OK' : 'FAIL'}`,
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX04_DIGEST_MISMATCH';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX04.md'), [
  '# REGRESSION_OB_OKX04.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## DIGEST_ALGORITHM',
  '- Bids sorted descending by price (parseFloat)',
  '- Asks sorted ascending by price (parseFloat)',
  '- Zero-size entries excluded',
  '- Only [price, size] tuples',
  '- sha256(JSON.stringify({ asks, bids }))', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx04.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX04_BOOK_DIGEST',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx04_book_digest — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
