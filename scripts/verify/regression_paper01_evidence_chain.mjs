/**
 * regression_paper01_evidence_chain.mjs — RG_PAPER01: Paper Evidence Chain
 *
 * Verifies:
 *   1. Genesis checkpoint creates valid chain start
 *   2. Checkpoint links correctly via SHA256
 *   3. Chain verification detects tampering
 *   4. Graduation eligibility checks CT02 guards
 *   5. Chain with 30+ days + 100+ trades passes graduation
 *   6. Insufficient chain fails graduation
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_paper01_evidence_chain.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { createGenesis, createCheckpoint, verifyChain, checkGraduationEligibility } from '../../core/edge/paper_evidence_chain.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

// ─── Check 1: Genesis creates valid chain ───
const genesis = createGenesis({ session_id: 'test_001', strategy: 's1_breakout_atr' });
const genesisValid = genesis.sha256_previous === 'GENESIS' && genesis.sha256_current && genesis.day_number === 0;
checks.push({
  check: 'PAPER01_GENESIS',
  pass: genesisValid,
  detail: genesisValid ? `OK: hash=${genesis.sha256_current.slice(0, 16)}...` : 'FAIL: invalid genesis',
});

// ─── Check 2: Checkpoint links correctly ───
const cp1 = createCheckpoint(genesis, {
  day_number: 1,
  metrics: { cumulative_trades: 3, cumulative_pnl_usd: 15.5, running_sharpe: 0.8, max_drawdown_pct: 2.1, win_rate: 0.67 },
  daily_trades: [{ trade_id: 't_001', pnl_usd: 15.5 }],
});
const linkOk = cp1.sha256_previous === genesis.sha256_current && cp1.sha256_current !== genesis.sha256_current;
checks.push({
  check: 'PAPER01_LINK',
  pass: linkOk,
  detail: linkOk ? `OK: linked to genesis, hash=${cp1.sha256_current.slice(0, 16)}...` : 'FAIL: broken link',
});

// ─── Check 3: Chain verification detects tampering ───
const goodChain = [genesis, cp1];
const goodResult = verifyChain(goodChain);

// Tamper with a checkpoint
const tamperedCp = { ...cp1, metrics: { ...cp1.metrics, cumulative_pnl_usd: 999999 } };
const badChain = [genesis, tamperedCp];
const badResult = verifyChain(badChain);

const tamperDetected = goodResult.valid && !badResult.valid;
checks.push({
  check: 'PAPER01_TAMPER_DETECTION',
  pass: tamperDetected,
  detail: tamperDetected
    ? `OK: good_chain=${goodResult.valid} tampered_chain=${badResult.valid} breaks=${badResult.breaks}`
    : `FAIL: good=${goodResult.valid} bad=${badResult.valid}`,
});

// ─── Check 4: Graduation eligibility basic check ───
const shortChain = [genesis, cp1];
const shortEligibility = checkGraduationEligibility(shortChain);
const shortCorrect = !shortEligibility.eligible;
checks.push({
  check: 'PAPER01_SHORT_CHAIN_INELIGIBLE',
  pass: shortCorrect,
  detail: shortCorrect
    ? `OK: 1-day chain ineligible: ${shortEligibility.reason}`
    : `FAIL: 1-day chain should not be eligible`,
});

// ─── Check 5: Build 30-day, 100-trade chain ───
let chain = [genesis];
let cumulativeTrades = 0;
let cumulativePnl = 0;
for (let day = 1; day <= 35; day++) {
  const dailyTrades = [];
  const tradesPerDay = day <= 30 ? 4 : 2;
  for (let t = 0; t < tradesPerDay; t++) {
    cumulativeTrades++;
    const pnl = (day % 3 === 0) ? -5 : 8;
    cumulativePnl += pnl;
    dailyTrades.push({ trade_id: `t_${String(cumulativeTrades).padStart(4, '0')}`, pnl_usd: pnl });
  }

  const prev = chain[chain.length - 1];
  const cp = createCheckpoint(prev, {
    day_number: day,
    metrics: {
      cumulative_trades: cumulativeTrades,
      cumulative_pnl_usd: cumulativePnl,
      running_sharpe: 0.82,
      max_drawdown_pct: 8.3,
      win_rate: 0.67,
    },
    daily_trades: dailyTrades,
  });
  chain.push(cp);
}

const fullResult = verifyChain(chain);
const fullEligibility = checkGraduationEligibility(chain);
const fullPass = fullResult.valid && fullEligibility.eligible;
checks.push({
  check: 'PAPER01_FULL_CHAIN_ELIGIBLE',
  pass: fullPass,
  detail: fullPass
    ? `OK: ${chain.length - 1} days, ${cumulativeTrades} trades, chain_valid=${fullResult.valid}, eligible=${fullEligibility.eligible}`
    : `FAIL: valid=${fullResult.valid} eligible=${fullEligibility.eligible} reason=${fullEligibility.reason}`,
});

// ─── Check 6: Chain integrity holds over full chain ───
checks.push({
  check: 'PAPER01_CHAIN_INTEGRITY',
  pass: fullResult.valid && fullResult.breaks.length === 0,
  detail: `OK: ${fullResult.length} checkpoints, 0 breaks`,
});

// ─── Verdict ───
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_PAPER01_VIOLATION';

for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`);
}

writeMd(path.join(EXEC, 'REGRESSION_PAPER01_EVIDENCE_CHAIN.md'), [
  '# RG_PAPER01_EVIDENCE_CHAIN', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_paper01_evidence_chain.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_PAPER01_EVIDENCE_CHAIN',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] RG_PAPER01_EVIDENCE_CHAIN — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
