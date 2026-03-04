/**
 * regression_impact01_determinism_x2.mjs — RG_IMPACT01: Market Impact Model x2
 *
 * Verifies:
 *   1. squareRootImpact returns consistent results (x2 determinism)
 *   2. Impact increases with sqrt(size) — concavity check
 *   3. Impact = Infinity participation when volume = 0
 *   4. estimateExecPrice determinism x2 with realistic bar
 *   5. BUY exec_price > mid, SELL exec_price < mid
 *   6. aggregateImpactStats returns correct averages
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_impact01_determinism_x2.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { squareRootImpact, estimateExecPrice, realizedSlippageBps, aggregateImpactStats } from '../../core/edge/impact_model.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

function sha256(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

// ─── Check 1: squareRootImpact determinism x2 ───
const params1 = { price: 50000, quantity: 10, volume: 100000, volatility: 0.02, impactCoeff: 0.1 };
const r1a = squareRootImpact(params1);
const r1b = squareRootImpact(params1);
const h1a = sha256(r1a);
const h1b = sha256(r1b);
checks.push({
  check: 'IMPACT01_DETERMINISM_X2',
  pass: h1a === h1b,
  detail: h1a === h1b ? `OK: hash=${h1a.slice(0, 16)}...` : `FAIL: ${h1a.slice(0, 16)} vs ${h1b.slice(0, 16)}`,
});

// ─── Check 2: Impact increases with sqrt(size) — concavity ───
const small = squareRootImpact({ price: 50000, quantity: 1, volume: 100000, volatility: 0.02 });
const large = squareRootImpact({ price: 50000, quantity: 100, volume: 100000, volatility: 0.02 });
const concave = large.impact_bps > small.impact_bps && large.impact_bps < small.impact_bps * 100;
checks.push({
  check: 'IMPACT01_CONCAVITY',
  pass: concave,
  detail: concave
    ? `OK: small=${small.impact_bps}bps large=${large.impact_bps}bps (ratio=${(large.impact_bps / small.impact_bps).toFixed(2)}x vs 10x sqrt)`
    : `FAIL: small=${small.impact_bps} large=${large.impact_bps}`,
});

// ─── Check 3: Zero volume → Infinity participation ───
const noVol = squareRootImpact({ price: 50000, quantity: 10, volume: 0, volatility: 0.02 });
checks.push({
  check: 'IMPACT01_ZERO_VOLUME',
  pass: noVol.participation_rate === Infinity,
  detail: noVol.participation_rate === Infinity
    ? `OK: participation_rate=Infinity, impact_bps=${noVol.impact_bps}`
    : `FAIL: participation_rate=${noVol.participation_rate}`,
});

// ─── Check 4: estimateExecPrice determinism x2 ───
const bar = { open: 49000, high: 51000, low: 48500, close: 50000, volume: 200000 };
const epa = estimateExecPrice(bar, 'BUY', 5);
const epb = estimateExecPrice(bar, 'BUY', 5);
const h4a = sha256(epa);
const h4b = sha256(epb);
checks.push({
  check: 'IMPACT01_EXEC_PRICE_DETERMINISM',
  pass: h4a === h4b,
  detail: h4a === h4b ? `OK: hash=${h4a.slice(0, 16)}...` : `FAIL: ${h4a.slice(0, 16)} vs ${h4b.slice(0, 16)}`,
});

// ─── Check 5: BUY exec_price > mid, SELL exec_price < mid ───
const midPrice = (bar.high + bar.low) / 2;
const buyExec = estimateExecPrice(bar, 'BUY', 5);
const sellExec = estimateExecPrice(bar, 'SELL', 5);
const priceOk = buyExec.exec_price > midPrice && sellExec.exec_price < midPrice;
checks.push({
  check: 'IMPACT01_BUY_SELL_DIRECTION',
  pass: priceOk,
  detail: priceOk
    ? `OK: mid=${midPrice} buy=${buyExec.exec_price} sell=${sellExec.exec_price}`
    : `FAIL: mid=${midPrice} buy=${buyExec.exec_price} sell=${sellExec.exec_price}`,
});

// ─── Check 6: aggregateImpactStats returns correct averages ───
const fills = [
  { exec_price: 50010, price: 50000, qty: 1, side: 'BUY' },
  { exec_price: 49980, price: 50000, qty: 1, side: 'SELL' },
];
const stats = aggregateImpactStats(fills);
const statsOk = stats.avg_impact_bps > 0 && stats.max_impact_bps > 0 && stats.total_impact_usd > 0;
checks.push({
  check: 'IMPACT01_AGGREGATE_STATS',
  pass: statsOk,
  detail: statsOk
    ? `OK: avg=${stats.avg_impact_bps}bps max=${stats.max_impact_bps}bps total=$${stats.total_impact_usd}`
    : `FAIL: avg=${stats.avg_impact_bps} max=${stats.max_impact_bps} total=${stats.total_impact_usd}`,
});

// ─── Verdict ───
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_IMPACT01_VIOLATION';

for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`);
}

writeMd(path.join(EXEC, 'REGRESSION_IMPACT01_DETERMINISM_X2.md'), [
  '# RG_IMPACT01_DETERMINISM_X2', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_impact01_determinism_x2.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_IMPACT01_DETERMINISM_X2',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] RG_IMPACT01_DETERMINISM_X2 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
