/**
 * regression_paper04_slippage_sensitivity.mjs — RG_PAPER04
 *
 * Verifies that increasing slippage yields non-increasing profit factor:
 *   PF(slippage_low) >= PF(slippage_high)  — monotonic expectation
 *
 * Also verifies total_fee_cost increases monotonically with fee_rate.
 *
 * Runs the paper sim with two slippage settings against the same fixture.
 * Deterministic — only uses fixture data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const PAPER_LOCK = path.join(ROOT, 'artifacts/outgoing/paper_sim.lock.json');
const FIXTURE_SCRIPT = path.join(ROOT, 'scripts/edge/edge_price_00_bars_fixture.mjs');
const LIQ_FIX = path.join(ROOT, 'scripts/verify/regression_liq_fixture_offline_x2.mjs');
const SIG_SCRIPT = path.join(ROOT, 'scripts/edge/edge_liq_02_signals.mjs');
const PAPER_SCRIPT = path.join(ROOT, 'scripts/edge/edge_paper_00_sim.mjs');

const BASE_ARGS = ['--price-provider', 'offline_fixture', '--price-run-id', 'RG_PRICE01_FIXTURE'];
const NETKILL = { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 };

const fails = [];

// Setup: refresh fixtures + signals
try {
  execFileSync(process.execPath, [LIQ_FIX], { ...NETKILL, env: { ...process.env } });
  execFileSync(process.execPath, [SIG_SCRIPT, '--provider', 'bybit_ws_v5', '--run-id', 'RG_DATA04_FIXTURE'], NETKILL);
  execFileSync(process.execPath, [FIXTURE_SCRIPT], { ...NETKILL, env: { ...process.env } });
} catch (e) { fails.push(`SETUP_ERROR: ${e.message}`); }

function runWithSlippage(bps) {
  try {
    execFileSync(process.execPath, [PAPER_SCRIPT, ...BASE_ARGS, '--slippage-bps', String(bps)], NETKILL);
    const lock = JSON.parse(fs.readFileSync(PAPER_LOCK, 'utf8'));
    return { bps, profit_factor: lock.profit_factor, total_pnl_net: lock.total_pnl_net, avg_slippage_cost: lock.avg_slippage_cost, ok: true };
  } catch (e) {
    return { bps, error: e.message, ok: false };
  }
}

function runWithFeeRate(fee_rate) {
  try {
    execFileSync(process.execPath, [PAPER_SCRIPT, ...BASE_ARGS, '--fee-rate', String(fee_rate)], NETKILL);
    const lock = JSON.parse(fs.readFileSync(PAPER_LOCK, 'utf8'));
    return { fee_rate, total_fee_cost: lock.total_fee_cost, total_pnl_net: lock.total_pnl_net, ok: true };
  } catch (e) {
    return { fee_rate, error: e.message, ok: false };
  }
}

let slipLow = null, slipHigh = null, feeLoRes = null, feeHiRes = null;

if (fails.length === 0) {
  // Slippage monotonicity: 2 bps vs 10 bps
  slipLow = runWithSlippage(2);
  slipHigh = runWithSlippage(10);

  if (!slipLow.ok) fails.push(`SLIPPAGE_LOW_ERROR: ${slipLow.error}`);
  if (!slipHigh.ok) fails.push(`SLIPPAGE_HIGH_ERROR: ${slipHigh.error}`);

  if (slipLow.ok && slipHigh.ok) {
    // PF comparison: if both null (no losses), equal → OK. If low < high → FAIL.
    const pfLow = slipLow.profit_factor;
    const pfHigh = slipHigh.profit_factor;
    // Null means no losses → effectively Infinity. Higher slippage shouldn't create a better PF.
    if (pfLow !== null && pfHigh !== null && pfLow < pfHigh - 1e-9)
      fails.push(`PF_NOT_MONOTONIC: pf(bps=2)=${pfLow} < pf(bps=10)=${pfHigh} — higher slippage should not increase PF`);
    // Avg slippage cost should increase monotonically
    if (slipLow.avg_slippage_cost !== null && slipHigh.avg_slippage_cost !== null
        && slipLow.avg_slippage_cost > slipHigh.avg_slippage_cost + 1e-9)
      fails.push(`SLIPPAGE_COST_NOT_MONOTONIC: avg_cost(bps=2)=${slipLow.avg_slippage_cost} > avg_cost(bps=10)=${slipHigh.avg_slippage_cost}`);
    // total_pnl_net should be non-increasing with higher slippage
    if (slipLow.total_pnl_net < slipHigh.total_pnl_net - 1e-9)
      fails.push(`PNL_NET_NOT_MONOTONIC: pnl(bps=2)=${slipLow.total_pnl_net} < pnl(bps=10)=${slipHigh.total_pnl_net}`);
  }

  // Fee monotonicity: 0.0003 vs 0.0012
  feeLoRes = runWithFeeRate(0.0003);
  feeHiRes = runWithFeeRate(0.0012);
  if (!feeLoRes.ok) fails.push(`FEE_LOW_ERROR: ${feeLoRes.error}`);
  if (!feeHiRes.ok) fails.push(`FEE_HIGH_ERROR: ${feeHiRes.error}`);
  if (feeLoRes.ok && feeHiRes.ok) {
    if (feeLoRes.total_fee_cost > feeHiRes.total_fee_cost + 1e-9)
      fails.push(`FEE_COST_NOT_MONOTONIC: fee_cost(0.0003)=${feeLoRes.total_fee_cost} > fee_cost(0.0012)=${feeHiRes.total_fee_cost}`);
    if (feeLoRes.total_pnl_net < feeHiRes.total_pnl_net - 1e-9)
      fails.push(`FEE_PNL_NOT_MONOTONIC: pnl_net(0.0003)=${feeLoRes.total_pnl_net} < pnl_net(0.0012)=${feeHiRes.total_pnl_net}`);
  }
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_PAPER04';

writeMd(path.join(EXEC, 'REGRESSION_PAPER04_SLIPPAGE_SENSITIVITY.md'),
  `# REGRESSION_PAPER04_SLIPPAGE_SENSITIVITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:paper04-slippage-sensitivity\n\n## Slippage monotonicity\n\n- bps=2:  pf=${slipLow?.profit_factor} pnl_net=${slipLow?.total_pnl_net} avg_slip=${slipLow?.avg_slippage_cost}\n- bps=10: pf=${slipHigh?.profit_factor} pnl_net=${slipHigh?.total_pnl_net} avg_slip=${slipHigh?.avg_slippage_cost}\n\n## Fee monotonicity\n\n- fee=0.0003: fee_cost=${feeLoRes?.total_fee_cost} pnl_net=${feeLoRes?.total_pnl_net}\n- fee=0.0012: fee_cost=${feeHiRes?.total_fee_cost} pnl_net=${feeHiRes?.total_pnl_net}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_paper04_slippage_sensitivity.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  slippage: { low: slipLow, high: slipHigh },
  fee: { low: feeLoRes, high: feeHiRes },
  fails,
});

console.log(`[${status}] regression_paper04_slippage_sensitivity — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
