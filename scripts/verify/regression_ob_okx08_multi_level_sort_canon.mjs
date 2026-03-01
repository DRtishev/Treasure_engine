/**
 * regression_ob_okx08_multi_level_sort_canon.mjs — RG_OB_OKX08_MULTI_LEVEL_SORT_CANON
 *
 * Gate: Multi-level book sorting is correct (decimal sort) and digest is stable x2.
 *
 * Tests:
 *   1. Multi-level bids (5+ levels) sorted correctly descending
 *   2. Multi-level asks (5+ levels) sorted correctly ascending
 *   3. Mixed integer + decimal prices sort correctly
 *   4. Canonical digest computed x2 is byte-identical (determinism)
 *   5. Digest differs from a deliberately mis-sorted version (sensitivity check)
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx08-multi-level-sort-canon';

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

function canonDigest(bidEntries, askEntries) {
  const sortedBids = [...bidEntries]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(b[0], a[0]))
    .map(([p, s]) => [p, s]);
  const sortedAsks = [...askEntries]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(a[0], b[0]))
    .map(([p, s]) => [p, s]);
  const canon = JSON.stringify({ asks: sortedAsks, bids: sortedBids });
  return { digest: sha256(canon), canon, sortedBids, sortedAsks };
}

const checks = [];

// ── Test 1: Multi-level bids sorted DESC ──
{
  const bidPrices = ['49800', '49900', '50000', '49500', '49700', '49600'];
  const bidEntries = bidPrices.map((p) => [p, '1.0']);
  const { sortedBids } = canonDigest(bidEntries, []);
  const resultPrices = sortedBids.map(([p]) => p);
  const expected = ['50000', '49900', '49800', '49700', '49600', '49500'];
  const pass = JSON.stringify(resultPrices) === JSON.stringify(expected);
  checks.push({
    check: 'multi_level_bids_sorted_desc',
    pass,
    detail: pass
      ? `bids DESC: [${resultPrices.join(',')}] — OK`
      : `WRONG order: got [${resultPrices.join(',')}] expected [${expected.join(',')}]`,
  });
}

// ── Test 2: Multi-level asks sorted ASC ──
{
  const askPrices = ['50200', '50100', '50300', '50050', '50400', '50500'];
  const askEntries = askPrices.map((p) => [p, '1.0']);
  const { sortedAsks } = canonDigest([], askEntries);
  const resultPrices = sortedAsks.map(([p]) => p);
  const expected = ['50050', '50100', '50200', '50300', '50400', '50500'];
  const pass = JSON.stringify(resultPrices) === JSON.stringify(expected);
  checks.push({
    check: 'multi_level_asks_sorted_asc',
    pass,
    detail: pass
      ? `asks ASC: [${resultPrices.join(',')}] — OK`
      : `WRONG order: got [${resultPrices.join(',')}] expected [${expected.join(',')}]`,
  });
}

// ── Test 3: Mixed integer + decimal prices (bids DESC) ──
{
  const mixedBidPrices = ['49999.5', '50000.25', '49999.75', '50001', '49998.99'];
  const bidEntries = mixedBidPrices.map((p) => [p, '1.0']);
  const { sortedBids } = canonDigest(bidEntries, []);
  const resultPrices = sortedBids.map(([p]) => p);
  const expected = ['50001', '50000.25', '49999.75', '49999.5', '49998.99'];
  const pass = JSON.stringify(resultPrices) === JSON.stringify(expected);
  checks.push({
    check: 'mixed_decimal_bids_sorted_desc',
    pass,
    detail: pass
      ? `mixed bids DESC: [${resultPrices.join(',')}] — OK`
      : `WRONG order: got [${resultPrices.join(',')}] expected [${expected.join(',')}]`,
  });
}

// ── Test 4: Canonical digest determinism x2 ──
{
  const bids = [['50000', '0.3'], ['49950', '1.5'], ['49850', '0.5']];
  const asks = [['50050', '1.8'], ['50150', '1.0'], ['50200', '0.7']];

  const run1 = canonDigest(bids, asks);
  const run2 = canonDigest(bids, asks);

  checks.push({
    check: 'digest_deterministic_x2',
    pass: run1.digest === run2.digest,
    detail: run1.digest === run2.digest
      ? `digest run1===run2=${run1.digest.slice(0, 16)}... — deterministic OK`
      : `NON_DETERMINISTIC: run1=${run1.digest.slice(0, 16)} run2=${run2.digest.slice(0, 16)}`,
  });

  // Verify the canon JSON structure
  const parsed = JSON.parse(run1.canon);
  checks.push({
    check: 'canon_json_has_asks_bids_keys',
    pass: 'asks' in parsed && 'bids' in parsed && Object.keys(parsed).length === 2,
    detail: 'asks' in parsed && 'bids' in parsed
      ? `canon JSON has exactly asks+bids keys — OK`
      : `FAIL: canon JSON keys = ${Object.keys(parsed).join(',')}`,
  });

  // Verify bids are descending, asks ascending
  const bidsDesc = parsed.bids.every((b, i, arr) =>
    i === 0 || compareDecimalStr(arr[i - 1][0], b[0]) >= 0
  );
  checks.push({
    check: 'canon_bids_descending',
    pass: bidsDesc,
    detail: bidsDesc ? `canon bids are descending — OK` : `FAIL: bids not descending in canon`,
  });

  const asksAsc = parsed.asks.every((a, i, arr) =>
    i === 0 || compareDecimalStr(arr[i - 1][0], a[0]) <= 0
  );
  checks.push({
    check: 'canon_asks_ascending',
    pass: asksAsc,
    detail: asksAsc ? `canon asks are ascending — OK` : `FAIL: asks not ascending in canon`,
  });
}

// ── Test 5: Digest sensitivity (mis-sorted gives different digest) ──
{
  const bids = [['50000', '0.3'], ['49950', '1.5'], ['49850', '0.5']];
  const asks = [['50050', '1.8'], ['50150', '1.0']];

  const correctDigest = canonDigest(bids, asks).digest;

  // Deliberately wrong order: swap bid order
  const wrongBids = [['49850', '0.5'], ['49950', '1.5'], ['50000', '0.3']]; // ASC instead of DESC
  const wrongCanon = JSON.stringify({ asks: [['50050', '1.8'], ['50150', '1.0']], bids: wrongBids });
  const wrongDigest = sha256(wrongCanon);

  checks.push({
    check: 'digest_sensitive_to_sort_order',
    pass: correctDigest !== wrongDigest,
    detail: correctDigest !== wrongDigest
      ? `digest differs for mis-sorted book (correct≠wrong) — OK`
      : `FAIL: digest insensitive to sort order (both ${correctDigest.slice(0, 16)}...)`,
  });
}

// ── Test 6: Zero-size entries excluded ──
{
  const bidsWithZero = [['50000', '0.3'], ['49950', '0'], ['49850', '0.5']];
  const bidsNoZero = [['50000', '0.3'], ['49850', '0.5']];
  const digestWithZero = canonDigest(bidsWithZero, []).digest;
  const digestNoZero = canonDigest(bidsNoZero, []).digest;
  checks.push({
    check: 'zero_size_excluded_from_digest',
    pass: digestWithZero === digestNoZero,
    detail: digestWithZero === digestNoZero
      ? `zero-size entry excluded — digests match — OK`
      : `FAIL: zero-size entry not excluded (${digestWithZero.slice(0, 16)} ≠ ${digestNoZero.slice(0, 16)})`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX08_SORT_CANON_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX08.md'), [
  '# REGRESSION_OB_OKX08.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## SORT_ALGORITHM',
  '- compareDecimalStr from decimal_sort.mjs (no parseFloat)',
  '- Bids: DESC (compareDecimalStr(b[0], a[0]))',
  '- Asks: ASC  (compareDecimalStr(a[0], b[0]))',
  '- Zero-size entries excluded before sort', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx08.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX08_MULTI_LEVEL_SORT_CANON',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx08_multi_level_sort_canon — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
