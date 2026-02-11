#!/usr/bin/env node

import { GovernanceEngine } from '../../core/governance/governance_engine.mjs';
import { GOV_MODES } from '../../core/governance/rules_engine.mjs';
import { SafetyIntegratedExecutor } from '../../core/exec/safety_integrated_executor.mjs';
import { LiveAdapterDryRun } from '../../core/exec/adapters/live_adapter_dryrun.mjs';
import { ModeAwareExecutor } from '../../core/exec/mode_aware_executor.mjs';
import ssot from '../../spec/ssot.json' with { type: 'json' };

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
}

function mkIntent() {
  return { symbol: 'BTC/USDT', side: 'BUY', type: 'MARKET', size: 0.001, price: 50000, size_usd: 50 };
}

function mkCtx() {
  return {
    run_id: 'epoch19_run',
    hack_id: 'HACK_E19',
    mode: 'dryrun',
    bar_idx: 0,
    order_seq: 0,
    bar: { t_ms: 1700000000000, c: 50000 },
    confirmationGiven: true,
    now_ms: 1700000000000,
  };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-19 GOVERNANCE CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const events = [];
  const eventLog = { sys: (event, payload) => events.push({ event, payload }) };
  const gov = new GovernanceEngine({ initial_mode: GOV_MODES.DRY_RUN, eventLog, nowProvider: () => 1700000000000 });

  assert(gov.getState().mode === GOV_MODES.DRY_RUN, 'default mode is DRY_RUN');

  const blocked = gov.requestTransition({
    from_mode: GOV_MODES.DRY_RUN,
    to_mode: GOV_MODES.LIVE_TESTNET,
    governance_approval: false,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: false,
    reason: 'test_block',
    requested_by: 'qa',
    ts_ms: 1700000000001,
  });
  assert(blocked.allowed === false, 'LIVE_TESTNET blocked without governance approval');

  const missingReason = gov.requestTransition({
    from_mode: GOV_MODES.DRY_RUN,
    to_mode: GOV_MODES.LIVE_TESTNET,
    governance_approval: true,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: false,
    reason: '   ',
    requested_by: 'qa',
    ts_ms: 1700000000001,
  });
  assert(missingReason.allowed === false, 'LIVE_TESTNET blocked without non-empty reason');

  const approval = gov.issueApproval({
    approval_id: 'APR-1',
    approver_id: 'governance-board',
    scope: 'live_testnet_transition',
    expiry_ms: 1700000000999,
    reason: 'qa approval artifact',
  });
  const approvalCheck = gov.validateApproval(approval.approval_id, 'live_testnet_transition');
  assert(approvalCheck.allowed === true, 'approval workflow validates scoped approval artifact');

  const allowed = gov.requestTransition({
    from_mode: GOV_MODES.DRY_RUN,
    to_mode: GOV_MODES.LIVE_TESTNET,
    governance_approval: true,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: false,
    reason: 'test_allow',
    requested_by: 'qa',
    ts_ms: 1700000000002,
  });
  assert(allowed.allowed === true, 'LIVE_TESTNET allowed with governance/risk/safety ready');
  assert(gov.getState().mode === GOV_MODES.LIVE_TESTNET, 'mode updated to LIVE_TESTNET');

  const baseExecutor = new SafetyIntegratedExecutor({ adapter: new LiveAdapterDryRun(), mode: 'DRY_RUN', ssot, eventLog: null });
  const modeAware = new ModeAwareExecutor({ executor: baseExecutor, governance: gov, eventLog });

  const killBlocked = await modeAware.execute(mkIntent(), mkCtx(), { kill_switch_active: true, currentPositionUsd: 0, dailyPnlUsd: 0 });
  assert(killBlocked.blocked === true && killBlocked.reason === 'kill_switch_active', 'execution blocked when kill switch active');

  const ok = await modeAware.execute(mkIntent(), mkCtx(), { kill_switch_active: false, currentPositionUsd: 0, dailyPnlUsd: 0 });
  assert(ok.success === true, 'mode-aware executor allows execution in LIVE_TESTNET when conditions met');
  assert(events.some((e) => e.event === 'live_intent_logged'), 'live intent audit event emitted');

  const mismatchBlocked = gov.requestTransition({
    from_mode: GOV_MODES.DRY_RUN,
    to_mode: GOV_MODES.LIVE_PRODUCTION,
    governance_approval: true,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: true,
    reason: 'bad_from_mode',
    requested_by: 'qa',
    ts_ms: 17000000000025,
  });
  assert(mismatchBlocked.allowed === false, 'transition blocked when from_mode does not match engine state');

  const prodBlocked = gov.requestTransition({
    from_mode: GOV_MODES.LIVE_TESTNET,
    to_mode: GOV_MODES.LIVE_PRODUCTION,
    governance_approval: true,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: false,
    reason: 'prod_without_confirm',
    requested_by: 'qa',
    ts_ms: 1700000000003,
  });
  assert(prodBlocked.allowed === false, 'LIVE_PRODUCTION blocked without manual confirmation');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
