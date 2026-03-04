/**
 * regression_canary01_safety_controls.mjs — RG_CANARY01: Safety Controls
 *
 * Verifies canary governor hardcoded limits:
 *   1. LIMITS are frozen (non-modifiable)
 *   2. preTradeCheck blocks when kill switch active
 *   3. preTradeCheck blocks oversized orders (> $25)
 *   4. Circuit breaker triggers after 3 consecutive losses
 *   5. Daily loss auto-kills at $5
 *   6. Total loss auto-kills at $15
 *   7. Manual kill switch works
 *   8. Dashboard reports correct state
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_canary01_safety_controls.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import {
  CANARY_LIMITS,
  createCanaryState,
  preTradeCheck,
  postTradeUpdate,
  resetDaily,
  activateKillSwitch,
  getCanaryDashboard,
} from '../../core/edge/canary_governor.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

// ─── Check 1: LIMITS are frozen ───
try {
  CANARY_LIMITS.MAX_CAPITAL_USD = 9999;
  checks.push({ check: 'CANARY01_LIMITS_FROZEN', pass: CANARY_LIMITS.MAX_CAPITAL_USD === 25, detail: 'OK: limits are frozen' });
} catch (e) {
  checks.push({ check: 'CANARY01_LIMITS_FROZEN', pass: true, detail: `OK: frozen (threw: ${e.message})` });
}

// ─── Check 2: Kill switch blocks trades ───
{
  const state = createCanaryState({ canary_id: 'test', strategy: 's1', exchange: 'testnet' });
  state.kill_switch_active = true;
  const result = preTradeCheck(state, { side: 'BUY', size_usd: 10 });
  checks.push({
    check: 'CANARY01_KILL_SWITCH_BLOCKS',
    pass: !result.pass,
    detail: !result.pass ? `OK: blocked by kill switch` : 'FAIL: should be blocked',
  });
}

// ─── Check 3: Oversized order rejected ───
{
  const state = createCanaryState({ canary_id: 'test', strategy: 's1' });
  const result = preTradeCheck(state, { side: 'BUY', size_usd: 50 });
  checks.push({
    check: 'CANARY01_OVERSIZE_BLOCKED',
    pass: !result.pass && result.reason.includes('capital_within_limit'),
    detail: !result.pass ? `OK: $50 order rejected` : 'FAIL: oversized order allowed',
  });
}

// ─── Check 4: Circuit breaker after 3 consecutive losses ───
{
  const state = createCanaryState({ canary_id: 'test', strategy: 's1' });
  postTradeUpdate(state, { pnl_usd: -1, side: 'BUY', symbol: 'BTCUSDT' });
  postTradeUpdate(state, { pnl_usd: -1, side: 'BUY', symbol: 'BTCUSDT' });
  const { kill_triggered } = postTradeUpdate(state, { pnl_usd: -1, side: 'BUY', symbol: 'BTCUSDT' });
  const result = preTradeCheck(state, { side: 'BUY', size_usd: 10 });
  checks.push({
    check: 'CANARY01_CIRCUIT_BREAKER',
    pass: kill_triggered && !result.pass,
    detail: kill_triggered ? `OK: CB triggered after 3 losses` : 'FAIL: CB did not trigger',
  });
}

// ─── Check 5: Daily loss auto-kills at $5 ───
{
  const state = createCanaryState({ canary_id: 'test', strategy: 's1' });
  const { kill_triggered } = postTradeUpdate(state, { pnl_usd: -6, side: 'SELL', symbol: 'BTCUSDT' });
  checks.push({
    check: 'CANARY01_DAILY_LOSS_KILL',
    pass: kill_triggered && state.kill_switch_active,
    detail: kill_triggered
      ? `OK: daily loss $${Math.abs(state.daily_pnl_usd)} triggered kill`
      : 'FAIL: daily loss did not trigger kill',
  });
}

// ─── Check 6: Total loss auto-kills at $15 ───
{
  const state = createCanaryState({ canary_id: 'test', strategy: 's1' });
  // Accumulate over multiple days
  postTradeUpdate(state, { pnl_usd: -4, side: 'SELL', symbol: 'BTCUSDT' });
  resetDaily(state);
  postTradeUpdate(state, { pnl_usd: -4, side: 'SELL', symbol: 'BTCUSDT' });
  resetDaily(state);
  postTradeUpdate(state, { pnl_usd: -4, side: 'SELL', symbol: 'BTCUSDT' });
  resetDaily(state);
  state.kill_switch_active = false; // Reset from daily kills
  const { kill_triggered } = postTradeUpdate(state, { pnl_usd: -4, side: 'SELL', symbol: 'BTCUSDT' });
  checks.push({
    check: 'CANARY01_TOTAL_LOSS_KILL',
    pass: state.total_pnl_usd <= -15 && state.kill_switch_active,
    detail: `OK: total loss $${Math.abs(state.total_pnl_usd)} triggered kill`,
  });
}

// ─── Check 7: Manual kill switch ───
{
  const state = createCanaryState({ canary_id: 'test', strategy: 's1' });
  activateKillSwitch(state, 'MANUAL_TEST');
  const result = preTradeCheck(state, { side: 'BUY', size_usd: 10 });
  checks.push({
    check: 'CANARY01_MANUAL_KILL',
    pass: state.kill_switch_active && state.kill_switch_reason === 'MANUAL_TEST' && !result.pass,
    detail: state.kill_switch_active ? `OK: manual kill active, trades blocked` : 'FAIL',
  });
}

// ─── Check 8: Dashboard reports correctly ───
{
  const state = createCanaryState({ canary_id: 'dash_test', strategy: 's1' });
  postTradeUpdate(state, { pnl_usd: 5, side: 'BUY', symbol: 'BTCUSDT' });
  postTradeUpdate(state, { pnl_usd: -2, side: 'SELL', symbol: 'BTCUSDT' });
  const dash = getCanaryDashboard(state);
  const dashOk = dash.total_trades === 2 && dash.wins === 1 && dash.losses === 1 && dash.total_pnl_usd === 3;
  checks.push({
    check: 'CANARY01_DASHBOARD',
    pass: dashOk,
    detail: dashOk
      ? `OK: trades=${dash.total_trades} W=${dash.wins} L=${dash.losses} PnL=$${dash.total_pnl_usd}`
      : `FAIL: ${JSON.stringify(dash)}`,
  });
}

// ─── Verdict ───
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_CANARY01_VIOLATION';

for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`);
}

writeMd(path.join(EXEC, 'REGRESSION_CANARY01_SAFETY_CONTROLS.md'), [
  '# RG_CANARY01_SAFETY_CONTROLS', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`, '',
  '## ABSOLUTE GUARDRAILS',
  `- MAX_CAPITAL_USD: $${CANARY_LIMITS.MAX_CAPITAL_USD}`,
  `- MAX_DAILY_LOSS_USD: $${CANARY_LIMITS.MAX_DAILY_LOSS_USD}`,
  `- MAX_TOTAL_LOSS_USD: $${CANARY_LIMITS.MAX_TOTAL_LOSS_USD}`,
  `- MAX_TRADES_PER_DAY: ${CANARY_LIMITS.MAX_TRADES_PER_DAY}`,
  `- CIRCUIT_BREAKER: ${CANARY_LIMITS.CIRCUIT_BREAKER_CONSECUTIVE_LOSSES} losses`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_canary01_safety_controls.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_CANARY01_SAFETY_CONTROLS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  limits: { ...CANARY_LIMITS },
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] RG_CANARY01_SAFETY_CONTROLS — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
