/**
 * regression_dec01_decimal_sort_total_order.mjs — RG_DEC01_DECIMAL_SORT_TOTAL_ORDER
 *
 * Gate: Verifies that decimal_sort.mjs compareDecimalStr satisfies the properties
 *       of a total order (antisymmetry, transitivity) across tricky test cases.
 *
 * Tests include:
 *   - Integer vs integer (different digit counts)
 *   - Decimal precision edge cases
 *   - Trailing zeros treated consistently
 *   - Negative values
 *   - Equal values
 *   - Sort stability on a multi-level book (representative prices)
 *
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { compareDecimalStr } from '../edge/data_organ/decimal_sort.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:dec01-decimal-sort-total-order';

// ── Assertion helpers ──
const checks = [];

function assertCmp(a, b, expected, label) {
  const got = Math.sign(compareDecimalStr(a, b));
  const pass = got === expected;
  checks.push({
    check: label,
    pass,
    detail: pass
      ? `compareDecimalStr("${a}","${b}") → ${got} (expected ${expected}) OK`
      : `FAIL compareDecimalStr("${a}","${b}") → ${got} expected ${expected}`,
  });
}

function assertAntisym(a, b, label) {
  const ab = compareDecimalStr(a, b);
  const ba = compareDecimalStr(b, a);
  // Antisymmetry: sign(ab) === -sign(ba)  (or both 0)
  const pass = Math.sign(ab) === -Math.sign(ba);
  checks.push({
    check: `antisym_${label}`,
    pass,
    detail: pass
      ? `antisymmetry ("${a}","${b}"): cmp(a,b)=${ab} cmp(b,a)=${ba} OK`
      : `FAIL antisymmetry ("${a}","${b}"): cmp(a,b)=${ab} cmp(b,a)=${ba}`,
  });
}

function assertTransitive(a, b, c, label) {
  const ab = compareDecimalStr(a, b);
  const bc = compareDecimalStr(b, c);
  const ac = compareDecimalStr(a, c);
  // If a ≤ b and b ≤ c then a ≤ c
  const pass = !(ab <= 0 && bc <= 0 && ac > 0) && !(ab >= 0 && bc >= 0 && ac < 0);
  checks.push({
    check: `transitive_${label}`,
    pass,
    detail: pass
      ? `transitivity ("${a}"≤"${b}"≤"${c}"): cmp(a,b)=${ab} cmp(b,c)=${bc} cmp(a,c)=${ac} OK`
      : `FAIL transitivity ("${a}","${b}","${c}"): cmp(a,b)=${ab} cmp(b,c)=${bc} cmp(a,c)=${ac}`,
  });
}

// ── Equality cases ──
assertCmp('50000', '50000', 0, 'equal_integers');
assertCmp('1.5', '1.5', 0, 'equal_decimals');
assertCmp('50000.00', '50000', 0, 'trailing_zeros_equal');
assertCmp('0.001', '0.001', 0, 'equal_small_decimal');

// ── Integer ordering ──
assertCmp('50000', '49900', 1, 'int_50000_gt_49900');
assertCmp('49900', '50000', -1, 'int_49900_lt_50000');
assertCmp('9', '10', -1, 'int_9_lt_10');
assertCmp('10', '9', 1, 'int_10_gt_9');
assertCmp('100', '99', 1, 'int_100_gt_99');
assertCmp('1000000', '999999', 1, 'int_1M_gt_999999');
assertCmp('999999', '1000000', -1, 'int_999999_lt_1M');

// ── Decimal precision ──
assertCmp('50050.5', '50050.25', 1, 'dec_50050.5_gt_50050.25');
assertCmp('50050.25', '50050.5', -1, 'dec_50050.25_lt_50050.5');
assertCmp('1.9', '1.10', 1, 'dec_1.9_gt_1.10');
assertCmp('1.10', '1.9', -1, 'dec_1.10_lt_1.9');
assertCmp('0.001', '0.01', -1, 'dec_0.001_lt_0.01');
assertCmp('0.01', '0.001', 1, 'dec_0.01_gt_0.001');
assertCmp('0.1', '0.10', 0, 'dec_0.1_eq_0.10');
assertCmp('1.000', '1', 0, 'dec_1.000_eq_1');

// ── Negative values ──
assertCmp('-1', '0', -1, 'neg_minus1_lt_0');
assertCmp('0', '-1', 1, 'pos_0_gt_minus1');
assertCmp('-5', '-3', -1, 'neg_minus5_lt_minus3');
assertCmp('-3', '-5', 1, 'neg_minus3_gt_minus5');
assertCmp('-1.5', '-1.2', -1, 'neg_dec_minus1.5_lt_minus1.2');

// ── Antisymmetry checks ──
assertAntisym('50000', '49900', 'int_pair');
assertAntisym('1.9', '1.10', 'dec_pair');
assertAntisym('-5', '-3', 'neg_pair');
assertAntisym('9', '10', 'single_digit_vs_two');
assertAntisym('50050.5', '50050.25', 'dec_frac_pair');
assertAntisym('50000', '50000', 'equal_antisym');

// ── Transitivity checks ──
assertTransitive('49800', '49900', '50000', 'int_ascending');
assertTransitive('50200', '50100', '50000', 'int_descending');
assertTransitive('1.10', '1.9', '2.0', 'dec_mixed');
assertTransitive('0.001', '0.01', '0.1', 'small_decimals');
assertTransitive('-10', '-5', '5', 'neg_to_pos');

// ── Sort stability on representative book ──
// Bids sorted descending: ["50000","0.3"], ["49950","1.5"], ["49850","0.5"]
const bids = ['49950', '50000', '49850'];
const sortedBids = [...bids].sort((a, b) => compareDecimalStr(b, a)); // DESC
const bidsOk = JSON.stringify(sortedBids) === JSON.stringify(['50000', '49950', '49850']);
checks.push({
  check: 'bids_sorted_desc',
  pass: bidsOk,
  detail: bidsOk
    ? `bids DESC: ${sortedBids.join(',')} — OK`
    : `bids DESC WRONG: got ${sortedBids.join(',')} expected 50000,49950,49850`,
});

// Asks sorted ascending: ["50050","1.8"], ["50150","1.0"]
const asks = ['50150', '50050'];
const sortedAsks = [...asks].sort((a, b) => compareDecimalStr(a, b)); // ASC
const asksOk = JSON.stringify(sortedAsks) === JSON.stringify(['50050', '50150']);
checks.push({
  check: 'asks_sorted_asc',
  pass: asksOk,
  detail: asksOk
    ? `asks ASC: ${sortedAsks.join(',')} — OK`
    : `asks ASC WRONG: got ${sortedAsks.join(',')} expected 50050,50150`,
});

// Decimal book sort: bids with fractional prices
const decBids = ['49999.5', '50000.25', '49999.75'];
const sortedDecBids = [...decBids].sort((a, b) => compareDecimalStr(b, a)); // DESC
const decBidsExpected = ['50000.25', '49999.75', '49999.5'];
const decBidsOk = JSON.stringify(sortedDecBids) === JSON.stringify(decBidsExpected);
checks.push({
  check: 'decimal_bids_sorted_desc',
  pass: decBidsOk,
  detail: decBidsOk
    ? `decimal bids DESC: ${sortedDecBids.join(',')} — OK`
    : `decimal bids DESC WRONG: got ${sortedDecBids.join(',')} expected ${decBidsExpected.join(',')}`,
});

// ── Summary ──
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'DEC01_TOTAL_ORDER_VIOLATED';

writeMd(path.join(EXEC, 'REGRESSION_DEC01.md'), [
  '# REGRESSION_DEC01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## TOTAL_ORDER_PROPERTIES',
  '- Reflexivity: cmp(a,a) == 0',
  '- Antisymmetry: sign(cmp(a,b)) == -sign(cmp(b,a))',
  '- Transitivity: a≤b ∧ b≤c → a≤c',
  '- Totality: either cmp(a,b)≤0 or cmp(b,a)≤0', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_dec01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DEC01_DECIMAL_SORT_TOTAL_ORDER',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_n: checks.length,
  failed_n: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_dec01_decimal_sort_total_order — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
