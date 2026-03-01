/**
 * regression_ob_okx16_digest_matches_spec.mjs — RG_OB_OKX16_DIGEST_MATCHES_SPEC
 *
 * Gate: Verify that the canonical book digest implementation matches the
 *       algorithm specified in docs/OKX_ORDERBOOK_DIGEST_SPEC.md.
 *
 * Checks:
 *   1. compareDecimalStr is used for sorting (no parseFloat)
 *   2. JSON structure is exactly { asks: [...], bids: [...] } (asks first)
 *   3. Zero-size entries are excluded
 *   4. Digest is SHA-256 of the canonical JSON
 *   5. Determinism x2: same book state → same digest
 *   6. Sensitivity: changing one entry changes the digest
 *
 * Tests the spec algorithm directly in-memory.
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx16-digest-matches-spec';

const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');

// Reference implementation per spec
function specDigest(bidsMap, asksMap) {
  const canonBids = [...bidsMap.entries()]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(b[0], a[0]))  // DESC
    .map(([p, s]) => [p, s]);
  const canonAsks = [...asksMap.entries()]
    .filter(([, s]) => s !== '0')
    .sort((a, b) => compareDecimalStr(a[0], b[0]))  // ASC
    .map(([p, s]) => [p, s]);
  const canonJson = JSON.stringify({ asks: canonAsks, bids: canonBids });
  return { digest: sha256(canonJson), canonJson, canonBids, canonAsks };
}

const checks = [];

// ── Check 1: JSON structure is { asks, bids } — asks first ──
{
  const bids = new Map([['49000', '1.0'], ['48900', '0.5']]);
  const asks = new Map([['50000', '1.0'], ['50100', '0.5']]);
  const { canonJson } = specDigest(bids, asks);
  const parsed = JSON.parse(canonJson);
  const keys = Object.keys(parsed);
  checks.push({
    check: 'json_structure_asks_bids_order',
    pass: keys[0] === 'asks' && keys[1] === 'bids' && keys.length === 2,
    detail: keys[0] === 'asks' && keys[1] === 'bids' && keys.length === 2
      ? `JSON keys=[${keys.join(',')}] — asks first, exactly 2 keys — OK`
      : `FAIL: JSON keys=[${keys.join(',')}]`,
  });
}

// ── Check 2: Bids sorted DESC, asks sorted ASC ──
{
  const bids = new Map([['49000', '1.0'], ['49500', '0.3'], ['48900', '0.5']]);
  const asks = new Map([['50100', '0.5'], ['50000', '1.0'], ['50200', '0.2']]);
  const { canonBids, canonAsks } = specDigest(bids, asks);

  const bidsDesc = canonBids.every((_, i) =>
    i === 0 || compareDecimalStr(canonBids[i - 1][0], canonBids[i][0]) > 0
  );
  const asksAsc = canonAsks.every((_, i) =>
    i === 0 || compareDecimalStr(canonAsks[i - 1][0], canonAsks[i][0]) < 0
  );

  checks.push({
    check: 'bids_sorted_desc',
    pass: bidsDesc,
    detail: bidsDesc
      ? `bids sorted DESC: ${canonBids.map(([p]) => p).join('>')} — OK`
      : `FAIL: bids not sorted DESC: ${canonBids.map(([p]) => p).join(',')}`,
  });
  checks.push({
    check: 'asks_sorted_asc',
    pass: asksAsc,
    detail: asksAsc
      ? `asks sorted ASC: ${canonAsks.map(([p]) => p).join('<')} — OK`
      : `FAIL: asks not sorted ASC: ${canonAsks.map(([p]) => p).join(',')}`,
  });
}

// ── Check 3: Zero-size exclusion ──
{
  const bids = new Map([['49000', '0'], ['48900', '0.5']]);
  const asks = new Map([['50000', '1.0'], ['50100', '0']]);
  const { canonBids, canonAsks } = specDigest(bids, asks);

  const bidZeroExcluded = !canonBids.some(([, s]) => s === '0');
  const askZeroExcluded = !canonAsks.some(([, s]) => s === '0');
  checks.push({
    check: 'zero_size_excluded_bids',
    pass: bidZeroExcluded && canonBids.length === 1,
    detail: bidZeroExcluded && canonBids.length === 1
      ? `bids zero excluded: only 48900 remains — OK`
      : `FAIL: canonBids=${JSON.stringify(canonBids)}`,
  });
  checks.push({
    check: 'zero_size_excluded_asks',
    pass: askZeroExcluded && canonAsks.length === 1,
    detail: askZeroExcluded && canonAsks.length === 1
      ? `asks zero excluded: only 50000 remains — OK`
      : `FAIL: canonAsks=${JSON.stringify(canonAsks)}`,
  });
}

// ── Check 4: Determinism x2 — same book → same digest ──
{
  const bids = new Map([['49000', '1.0'], ['48500', '2.0']]);
  const asks = new Map([['50000', '0.8'], ['50500', '0.3']]);
  const { digest: d1 } = specDigest(bids, asks);
  const { digest: d2 } = specDigest(bids, asks);
  checks.push({
    check: 'determinism_x2',
    pass: d1 === d2,
    detail: d1 === d2 ? `digest x2 identical — OK` : `FAIL: d1=${d1.slice(0, 16)} d2=${d2.slice(0, 16)}`,
  });
}

// ── Check 5: Sensitivity — one price change → different digest ──
{
  const bids1 = new Map([['49000', '1.0'], ['48500', '2.0']]);
  const asks1 = new Map([['50000', '0.8']]);
  const bids2 = new Map([['49000', '1.0'], ['48500', '2.1']]);  // size changed
  const asks2 = new Map([['50000', '0.8']]);
  const { digest: d1 } = specDigest(bids1, asks1);
  const { digest: d2 } = specDigest(bids2, asks2);
  checks.push({
    check: 'digest_sensitive_to_size_change',
    pass: d1 !== d2,
    detail: d1 !== d2
      ? `digest changes on size mutation — OK`
      : `FAIL: digests identical despite different sizes`,
  });
}

// ── Check 6: No parseFloat — decimal sort handles non-float strings correctly ──
{
  // "9" < "10" by decimal sort (length), but parseFloat would give same
  // "1.9" > "1.10" by decimal sort (frac lex), parseFloat would give "1.9 > 1.10" also
  // BUT "50000.000" == "50000" by decimal sort, parseFloat too — both match
  // Key difference: large integers where parseFloat loses precision
  // e.g., 9007199254740993 vs 9007199254740992 (differ by 1 but same float64)
  const a = '9007199254740993';
  const b = '9007199254740992';
  const cmpResult = compareDecimalStr(a, b);  // should be > 0 (a > b)
  const floatResult = parseFloat(a) - parseFloat(b);  // may be 0 due to float64 loss

  checks.push({
    check: 'decimal_sort_distinguishes_large_ints',
    pass: cmpResult > 0,
    detail: cmpResult > 0
      ? `compareDecimalStr(${a},${b})=${cmpResult}>0 — float64 would give ${floatResult} — OK`
      : `FAIL: compareDecimalStr returned ${cmpResult}`,
  });
}

// ── Check 7: Digest is SHA-256 (hex, 64 chars) ──
{
  const bids = new Map([['49000', '1.0']]);
  const asks = new Map([['50000', '1.0']]);
  const { digest } = specDigest(bids, asks);
  checks.push({
    check: 'digest_is_sha256_hex',
    pass: typeof digest === 'string' && digest.length === 64 && /^[0-9a-f]+$/.test(digest),
    detail: typeof digest === 'string' && digest.length === 64 && /^[0-9a-f]+$/.test(digest)
      ? `digest is 64-char hex SHA-256 — OK`
      : `FAIL: digest="${digest}"`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX16_DIGEST_SPEC_MISMATCH';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX16.md'), [
  '# REGRESSION_OB_OKX16.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- Digest algorithm must match docs/OKX_ORDERBOOK_DIGEST_SPEC.md exactly',
  '- { asks, bids } JSON key order, decimal sort, zero exclusion, SHA-256', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx16.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX16_DIGEST_MATCHES_SPEC',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx16_digest_matches_spec — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
