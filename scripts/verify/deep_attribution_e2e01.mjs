/**
 * deep_attribution_e2e01.mjs — RG_ATTRIBUTION_E2E01
 *
 * R2 deep: Synthetic scenario with known costs → attribution breakdown matches.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });
const checks = [];

try {
  const { createLedger, recordFill, getAttribution, getLedgerSummary } = await import('../../core/profit/ledger.mjs');

  const ledger = createLedger({ initial_capital: 10000 });

  // Record fills with known costs
  recordFill(ledger, { symbol: 'BTCUSDT', side: 'BUY', qty: 1, price: 100, exec_price: 100.05, fee: 0.04, funding: 0.02, ts: 1, trade_id: 'T1' });
  recordFill(ledger, { symbol: 'BTCUSDT', side: 'SELL', qty: 1, price: 101, exec_price: 100.95, fee: 0.04, funding: 0.03, ts: 2, trade_id: 'T2' });

  const attr = getAttribution(ledger);
  const summary = getLedgerSummary(ledger);

  // Check 1: attribution has all 4 cost components
  const p1 = attr.fees_cost !== undefined && attr.slippage_cost !== undefined && attr.funding_cost !== undefined && attr.edge_pnl !== undefined;
  checks.push({ check: 'attribution_has_4_components', pass: p1,
    detail: p1 ? `OK: fees=${attr.fees_cost}, slip=${attr.slippage_cost}, funding=${attr.funding_cost}, edge=${attr.edge_pnl}` : 'FAIL: missing components' });

  // Check 2: funding tracked correctly (0.02 + 0.03 = 0.05)
  const p2 = Math.abs(attr.funding_cost - 0.05) < 0.001;
  checks.push({ check: 'funding_sum_correct', pass: p2,
    detail: p2 ? `OK: total_funding=${attr.funding_cost}` : `FAIL: expected 0.05, got ${attr.funding_cost}` });

  // Check 3: summary includes total_funding
  const p3 = summary.total_funding !== undefined && Math.abs(summary.total_funding - 0.05) < 0.001;
  checks.push({ check: 'summary_has_total_funding', pass: p3,
    detail: p3 ? `OK: summary.total_funding=${summary.total_funding}` : `FAIL: ${summary.total_funding}` });

  // Check 4: fees tracked (0.04 + 0.04 = 0.08)
  const p4 = Math.abs(attr.fees_cost - 0.08) < 0.001;
  checks.push({ check: 'fees_sum_correct', pass: p4,
    detail: p4 ? `OK: fees=${attr.fees_cost}` : `FAIL: expected 0.08, got ${attr.fees_cost}` });

  // Check 5: edge_pnl > 0 (there's actual profit in this scenario)
  const p5 = attr.edge_pnl > 0;
  checks.push({ check: 'edge_pnl_positive', pass: p5,
    detail: p5 ? `OK: edge_pnl=${attr.edge_pnl}` : `FAIL: edge_pnl=${attr.edge_pnl}` });

} catch (err) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_ATTRIBUTION_E2E01_VIOLATION';

writeMd(path.join(EXEC, 'DEEP_ATTRIBUTION_E2E01.md'), [
  '# RG_ATTRIBUTION_E2E01: PnL Attribution E2E', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'deep_attribution_e2e01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_ATTRIBUTION_E2E01', status, reason_code, run_id: RUN_ID, checks,
});

console.log(`[${status}] deep_attribution_e2e01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
