/**
 * regression_data_organ04_freshness.mjs — RG_DATA_ORGAN04: Freshness Sentinel
 *
 * EPOCH-74: Data Organ Liveness — Regression Gate F10
 *
 * Checks:
 *   1. Fresh data → status = FRESH
 *   2. 75% TTL data → status = AGING, warnings emitted
 *   3. 100% TTL data → status = EXPIRED, expirations emitted
 *   4. TRUTH vs HINT TTL difference honoured
 *   5. Consumption level checks
 *   6. Enrichment level checks
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_data_organ04_freshness.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { checkFreshness, DEFAULT_TTLS } from '../../core/data/freshness_sentinel.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:data-organ04-freshness';
const checks = [];

// 1. Fresh data → FRESH
const freshResult = checkFreshness(
  [{ lane_id: 'test_truth', truth_level: 'TRUTH', age_ms: 1000 }],
  [],
  [],
);
checks.push({
  check: 'fresh_data_status',
  pass: freshResult.status === 'FRESH' && freshResult.fresh === true,
  detail: `status=${freshResult.status} fresh=${freshResult.fresh} (expected FRESH, true)`,
});

// 2. 75% TTL → AGING
const agingAge = DEFAULT_TTLS.acquire.TRUTH * 0.80; // 80% of TRUTH TTL
const agingResult = checkFreshness(
  [{ lane_id: 'test_truth', truth_level: 'TRUTH', age_ms: agingAge }],
  [],
  [],
);
checks.push({
  check: 'aging_data_status',
  pass: agingResult.status === 'AGING' && agingResult.warnings.length > 0,
  detail: `status=${agingResult.status} warnings=${agingResult.warnings.length} (expected AGING, >0)`,
});

// 3. 100% TTL → EXPIRED
const expiredAge = DEFAULT_TTLS.acquire.TRUTH * 1.5; // 150% of TRUTH TTL
const expiredResult = checkFreshness(
  [{ lane_id: 'test_truth', truth_level: 'TRUTH', age_ms: expiredAge }],
  [],
  [],
);
checks.push({
  check: 'expired_data_status',
  pass: expiredResult.status === 'EXPIRED' && expiredResult.expirations.length > 0,
  detail: `status=${expiredResult.status} expirations=${expiredResult.expirations.length} (expected EXPIRED, >0)`,
});

// 4. TRUTH vs HINT TTL difference
const hintTtl = DEFAULT_TTLS.acquire.HINT; // 72h
const truthTtl = DEFAULT_TTLS.acquire.TRUTH; // 24h
checks.push({
  check: 'truth_hint_ttl_diff',
  pass: hintTtl > truthTtl,
  detail: `HINT_TTL=${hintTtl}ms > TRUTH_TTL=${truthTtl}ms (expected HINT > TRUTH)`,
});

// HINT at 50h should be fresh (within 72h HINT TTL) but would be expired for TRUTH (24h)
const hintAge = 50 * 3600_000; // 50 hours
const hintResult = checkFreshness(
  [{ lane_id: 'test_hint', truth_level: 'HINT', age_ms: hintAge }],
  [],
  [],
);
const truthAtSameAge = checkFreshness(
  [{ lane_id: 'test_truth', truth_level: 'TRUTH', age_ms: hintAge }],
  [],
  [],
);
checks.push({
  check: 'hint_fresh_truth_expired',
  pass: hintResult.status !== 'EXPIRED' && truthAtSameAge.status === 'EXPIRED',
  detail: `hint_status=${hintResult.status} truth_status=${truthAtSameAge.status} (hint should not be EXPIRED, truth should be)`,
});

// 5. Consumption level: fast strategy starving
const consumeResult = checkFreshness(
  [],
  [],
  [{ strategy_name: 'test_fast', bar_ms: 60_000, age_ms: 5 * 60_000 }], // 5 min > 3 min fast TTL
);
checks.push({
  check: 'consume_fast_starving',
  pass: consumeResult.status === 'EXPIRED' && consumeResult.expirations.some((e) => e.reason === 'DATA_STARVING'),
  detail: `status=${consumeResult.status} starving=${consumeResult.expirations.some((e) => e.reason === 'DATA_STARVING')}`,
});

// 6. Enrichment level: stale enrichment
const enrichResult = checkFreshness(
  [],
  [{ source: 'test_enrich', raw_updated: true, enrich_age_ms: 5 * 3600_000 }], // 5h > 4h enrich TTL
  [],
);
checks.push({
  check: 'enrich_stale',
  pass: enrichResult.status === 'EXPIRED' && enrichResult.expirations.some((e) => e.reason === 'ENRICH_STALE'),
  detail: `status=${enrichResult.status} stale=${enrichResult.expirations.some((e) => e.reason === 'ENRICH_STALE')}`,
});

// 7. Empty inputs → FRESH (no data to expire)
const emptyResult = checkFreshness([], [], []);
checks.push({
  check: 'empty_inputs_fresh',
  pass: emptyResult.status === 'FRESH',
  detail: `status=${emptyResult.status} (expected FRESH for empty inputs)`,
});

// Verdict
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DATA_ORGAN04_VIOLATION';

writeMd(path.join(MANUAL, 'regression_data_organ04_freshness.md'), [
  '# RG_DATA_ORGAN04_FRESHNESS_SENTINEL', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## DEFAULT TTLs',
  `TRUTH: ${DEFAULT_TTLS.acquire.TRUTH}ms`,
  `HINT: ${DEFAULT_TTLS.acquire.HINT}ms`,
  `ENRICH: ${DEFAULT_TTLS.enrich.default}ms`,
  `CONSUME_FAST: ${DEFAULT_TTLS.consume.fast}ms`,
  `CONSUME_SLOW: ${DEFAULT_TTLS.consume.slow}ms`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_data_organ04_freshness.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DATA_ORGAN04_FRESHNESS_SENTINEL',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_data_organ04_freshness — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
