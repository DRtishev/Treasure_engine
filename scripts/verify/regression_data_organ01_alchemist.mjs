/**
 * regression_data_organ01_alchemist.mjs — RG_DATA_ORGAN01: Alchemist Determinism x2
 *
 * EPOCH-74: Data Organ Liveness — Regression Gate F7
 *
 * Checks:
 *   1. Load OKX orderbook fixture
 *   2. Run alchemize() → result_1
 *   3. Run alchemize() → result_2
 *   4. fingerprint_1 === fingerprint_2 (determinism)
 *   5. bars.length > 0 (produces output)
 *   6. All bars pass bar_validator
 *   7. Weighted mid ≠ simple mid (for imbalanced books)
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_data_organ01_alchemist.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { alchemize, computeWeightedMid } from '../../core/data/orderbook_alchemist.mjs';
import { validateBarSeries } from '../../core/data/bar_validator.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:data-organ01-alchemist';
const checks = [];

const FIXTURE_PATH = path.join(ROOT, 'artifacts/fixtures/okx/orderbook/main/fixture.jsonl');

// Check fixture exists
if (!fs.existsSync(FIXTURE_PATH)) {
  checks.push({ check: 'fixture_present', pass: false, detail: `FAIL: missing ${path.relative(ROOT, FIXTURE_PATH)}` });
} else {
  checks.push({ check: 'fixture_present', pass: true, detail: 'OK' });

  const raw = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const messages = lines.map((l) => JSON.parse(l));

  // Run 1
  const r1 = alchemize(messages, { bar_ms: 60_000, instId: 'BTC-USDT' });
  // Run 2
  const r2 = alchemize(messages, { bar_ms: 60_000, instId: 'BTC-USDT' });

  // Check: bars produced
  checks.push({
    check: 'bars_produced',
    pass: r1.bars.length > 0,
    detail: r1.bars.length > 0 ? `OK: ${r1.bars.length} bars` : 'FAIL: 0 bars',
  });

  // Check: determinism x2
  checks.push({
    check: 'determinism_x2',
    pass: r1.fingerprint === r2.fingerprint,
    detail: r1.fingerprint === r2.fingerprint
      ? `OK: fingerprint=${r1.fingerprint.slice(0, 16)}...`
      : `FAIL: fp1=${r1.fingerprint.slice(0, 16)} fp2=${r2.fingerprint.slice(0, 16)}`,
  });

  // Check: bar validation
  if (r1.bars.length > 0) {
    const validation = validateBarSeries(r1.bars);
    checks.push({
      check: 'bars_valid',
      pass: validation.invalid === 0,
      detail: validation.invalid === 0
        ? `OK: ${validation.valid}/${validation.total} valid`
        : `FAIL: ${validation.invalid} invalid bars`,
    });
  } else {
    checks.push({ check: 'bars_valid', pass: false, detail: 'SKIP: no bars' });
  }

  // Check: weighted mid differs from simple mid
  const wm = computeWeightedMid(49900, 50000, 0.8, 1.0);
  const sm = (49900 + 50000) / 2;
  checks.push({
    check: 'weighted_mid_differs',
    pass: Math.abs(wm - sm) > 0.001,
    detail: `weighted=${wm} simple=${sm} diff=${Math.abs(wm - sm).toFixed(6)}`,
  });

  // Check: bars have enrichment fields
  if (r1.bars.length > 0) {
    const bar = r1.bars[0];
    const hasFields = '_weighted_mid' in bar && '_spread_bps' in bar && '_ofi' in bar && '_source' in bar;
    checks.push({
      check: 'enrichment_fields',
      pass: hasFields,
      detail: hasFields ? 'OK: _weighted_mid, _spread_bps, _ofi, _source present' : 'FAIL: missing enrichment fields',
    });
  } else {
    checks.push({ check: 'enrichment_fields', pass: false, detail: 'SKIP: no bars' });
  }
}

// Verdict
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DATA_ORGAN01_VIOLATION';

writeMd(path.join(MANUAL, 'regression_data_organ01_alchemist.md'), [
  '# RG_DATA_ORGAN01_ALCHEMIST_DETERMINISM', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_data_organ01_alchemist.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DATA_ORGAN01_ALCHEMIST_DETERMINISM',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_data_organ01_alchemist — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
