/**
 * regression_backtest01_organ_health.mjs — RG_BACKTEST_ORGAN01: Backtest Organ Health
 *
 * Lightweight backtest organ health gate for verify:fast.
 * Budget: < 5s. No network. No FS writes beyond evidence.
 *
 * Checks:
 *   1. E108 fixture loads
 *   2. S1 backtest runs, backtest_sharpe is finite number
 *   3. S3 enrichBars + backtest runs, backtest_sharpe is finite number
 *   4. Determinism x2: S1 ledger hash match across 2 runs
 *   5. Determinism x2: S3 enriched ledger hash match across 2 runs
 *   6. Ledger SHORT support: SELL from FLAT opens short (pos.qty < 0)
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_backtest01_organ_health.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBacktest } from '../../core/backtest/engine.mjs';
import { serializeLedger, createLedger, recordFill } from '../../core/profit/ledger.mjs';
import * as s1 from '../../core/edge/strategies/s1_breakout_atr.mjs';
import * as s3 from '../../core/edge/strategies/s3_liq_vol_fusion.mjs';
import { enrichBars } from '../../core/edge/strategies/strategy_bar_enricher.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:backtest01-organ-health';
const checks = [];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ─── Check 1: Fixture loads ───
const FIXTURE_PATH = path.join(ROOT, 'data/fixtures/e108/e108_ohlcv_200bar.json');
let bars = null;
let enrichedBars = null;

if (!fs.existsSync(FIXTURE_PATH)) {
  checks.push({ check: 'fixture_present', pass: false, detail: 'FAIL: missing E108 fixture' });
} else {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  bars = fixture.candles;
  checks.push({ check: 'fixture_present', pass: bars.length > 0, detail: `OK: ${bars.length} bars` });
}

if (bars) {
  // ─── Check 2: S1 backtest_sharpe is finite number ───
  const r1 = runBacktest(s1, bars);
  const sharpe1 = r1.metrics.backtest_sharpe;
  const sharpeOk = typeof sharpe1 === 'number' && Number.isFinite(sharpe1);
  checks.push({
    check: 's1_sharpe_finite',
    pass: sharpeOk,
    detail: sharpeOk ? `OK: backtest_sharpe=${sharpe1}` : `FAIL: backtest_sharpe=${sharpe1} (type=${typeof sharpe1})`,
  });

  // ─── Check 3: S3 enrichBars + backtest_sharpe is finite ───
  enrichedBars = enrichBars(bars);
  const r3 = runBacktest(s3, enrichedBars);
  const sharpe3 = r3.metrics.backtest_sharpe;
  const sharpe3Ok = typeof sharpe3 === 'number' && Number.isFinite(sharpe3);
  checks.push({
    check: 's3_sharpe_finite',
    pass: sharpe3Ok,
    detail: sharpe3Ok ? `OK: backtest_sharpe=${sharpe3}` : `FAIL: backtest_sharpe=${sharpe3} (type=${typeof sharpe3})`,
  });

  // ─── Check 4: S1 determinism x2 (ledger hash) ───
  const r1b = runBacktest(s1, bars);
  const h1a = sha256(serializeLedger(r1.ledger));
  const h1b = sha256(serializeLedger(r1b.ledger));
  checks.push({
    check: 's1_determinism_x2',
    pass: h1a === h1b,
    detail: h1a === h1b ? `OK: hash=${h1a.slice(0, 16)}...` : `FAIL: ${h1a.slice(0, 16)} vs ${h1b.slice(0, 16)}`,
  });

  // ─── Check 5: S3 determinism x2 (enriched ledger hash) ───
  const r3b = runBacktest(s3, enrichedBars);
  const h3a = sha256(serializeLedger(r3.ledger));
  const h3b = sha256(serializeLedger(r3b.ledger));
  checks.push({
    check: 's3_determinism_x2',
    pass: h3a === h3b,
    detail: h3a === h3b ? `OK: hash=${h3a.slice(0, 16)}...` : `FAIL: ${h3a.slice(0, 16)} vs ${h3b.slice(0, 16)}`,
  });

  // ─── Check 6: SHORT support (SELL from FLAT → pos.qty < 0) ───
  const ledger = createLedger({ initial_capital: 10000 });
  recordFill(ledger, {
    symbol: 'TEST', side: 'SELL', qty: 1.0, price: 50000,
    exec_price: 49998, fee: 2, ts: '2025-01-01T00:00:00Z', trade_id: 'T1',
  });
  const pos = ledger.positions['TEST'];
  const shortOk = pos && pos.qty < 0;
  checks.push({
    check: 'short_sell_from_flat',
    pass: shortOk,
    detail: shortOk ? `OK: pos.qty=${pos.qty}` : `FAIL: pos.qty=${pos ? pos.qty : 'undefined'}`,
  });
}

// ─── Verdict ───
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_BACKTEST_ORGAN01_VIOLATION';

writeMd(path.join(MANUAL, 'regression_backtest01_organ_health.md'), [
  '# RG_BACKTEST_ORGAN01_HEALTH', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_backtest01_organ_health.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_BACKTEST_ORGAN01_HEALTH',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_backtest01_organ_health — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
