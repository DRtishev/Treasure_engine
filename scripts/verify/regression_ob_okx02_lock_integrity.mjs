/**
 * regression_ob_okx02_lock_integrity.mjs — RG_OB_OKX02_LOCK_INTEGRITY
 *
 * Gate: OKX orderbook lock.json has all required fields and
 *       raw_sha256 matches the actual fixture.jsonl content.
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx02-lock-integrity';
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main');
const FIXTURE_PATH = path.join(FIXTURE_BASE, 'fixture.jsonl');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');

const REQUIRED_LOCK_FIELDS = [
  'provider_id', 'schema_version', 'instId',
  'raw_sha256', 'canonical_book_digest_sha256',
  'messages_n', 'final_seqId', 'events_expected',
];

const checks = [];

if (!fs.existsSync(LOCK_PATH)) {
  checks.push({ check: 'lock_file_exists', pass: false, detail: `MISSING: ${path.relative(ROOT, LOCK_PATH)}` });
} else if (!fs.existsSync(FIXTURE_PATH)) {
  checks.push({ check: 'fixture_file_exists', pass: false, detail: `MISSING: ${path.relative(ROOT, FIXTURE_PATH)}` });
} else {
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    checks.push({ check: 'lock_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    checks.push({ check: 'lock_parseable', pass: false, detail: `parse error: ${e.message}` });
    lock = null;
  }

  if (lock) {
    // Check required fields
    const missingFields = REQUIRED_LOCK_FIELDS.filter((f) => !(f in lock));
    checks.push({
      check: 'lock_required_fields_present',
      pass: missingFields.length === 0,
      detail: missingFields.length === 0
        ? `all ${REQUIRED_LOCK_FIELDS.length} required fields present — OK`
        : `MISSING fields: ${missingFields.join(', ')}`,
    });

    // Check provider_id
    checks.push({
      check: 'lock_provider_id_valid',
      pass: lock.provider_id === 'okx_orderbook_ws',
      detail: lock.provider_id === 'okx_orderbook_ws'
        ? `provider_id=okx_orderbook_ws — OK`
        : `INVALID: provider_id=${lock.provider_id}`,
    });

    // Check schema_version
    checks.push({
      check: 'lock_schema_version_valid',
      pass: lock.schema_version === 'okx_orderbook_ws.r2_preflight.v1',
      detail: lock.schema_version === 'okx_orderbook_ws.r2_preflight.v1'
        ? `schema_version=${lock.schema_version} — OK`
        : `INVALID: schema_version=${lock.schema_version}`,
    });

    // Check raw_sha256 matches fixture
    const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
    const computedSha256 = crypto.createHash('sha256').update(raw).digest('hex');
    checks.push({
      check: 'raw_sha256_matches_fixture',
      pass: computedSha256 === lock.raw_sha256,
      detail: computedSha256 === lock.raw_sha256
        ? `raw_sha256=${lock.raw_sha256.slice(0, 16)}... — matches fixture — OK`
        : `MISMATCH: fixture=${computedSha256.slice(0, 16)}... lock=${lock.raw_sha256.slice(0, 16)}...`,
    });

    // Check canonical_book_digest_sha256 is a valid sha256 hex
    const sha256Re = /^[0-9a-f]{64}$/;
    checks.push({
      check: 'canonical_book_digest_sha256_format',
      pass: sha256Re.test(lock.canonical_book_digest_sha256 || ''),
      detail: sha256Re.test(lock.canonical_book_digest_sha256 || '')
        ? `canonical_book_digest_sha256=${lock.canonical_book_digest_sha256.slice(0, 16)}... — OK`
        : `INVALID format: ${lock.canonical_book_digest_sha256}`,
    });

    // Check messages_n is a positive integer
    checks.push({
      check: 'lock_messages_n_positive',
      pass: Number.isInteger(lock.messages_n) && lock.messages_n > 0,
      detail: Number.isInteger(lock.messages_n) && lock.messages_n > 0
        ? `messages_n=${lock.messages_n} — OK`
        : `INVALID: messages_n=${lock.messages_n}`,
    });

    // Check events_expected is a non-empty array
    checks.push({
      check: 'lock_events_expected_array',
      pass: Array.isArray(lock.events_expected) && lock.events_expected.length > 0,
      detail: Array.isArray(lock.events_expected) && lock.events_expected.length > 0
        ? `events_expected=[${lock.events_expected.join(', ')}] — OK`
        : `INVALID: events_expected must be non-empty array`,
    });

    // Check events_expected contains BOOK_BOOT
    if (Array.isArray(lock.events_expected)) {
      checks.push({
        check: 'lock_events_expected_has_boot',
        pass: lock.events_expected.includes('BOOK_BOOT'),
        detail: lock.events_expected.includes('BOOK_BOOT')
          ? `events_expected includes BOOK_BOOT — OK`
          : `MISSING: events_expected must include BOOK_BOOT`,
      });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX02_LOCK_INVALID';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX02.md'), [
  '# REGRESSION_OB_OKX02.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- lock.json must have all required fields',
  '- raw_sha256 must match actual fixture.jsonl content',
  '- canonical_book_digest_sha256 must be valid sha256 hex', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx02.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX02_LOCK_INTEGRITY',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx02_lock_integrity — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
