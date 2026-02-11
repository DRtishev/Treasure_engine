#!/usr/bin/env node
import { GovernanceEngine } from '../../core/governance/governance_engine.mjs';
import { GOV_MODES } from '../../core/governance/rules_engine.mjs';
import { ModeAwareExecutor } from '../../core/exec/mode_aware_executor.mjs';

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

const events = [];
const eventLog = { sys: (event, payload) => events.push({ event, payload }) };

const noopExecutor = {
  async execute(intent) {
    return { success: true, intent_id: intent.intent_id || 'epoch26_intent', simulated: true };
  }
};

function mkReq(overrides = {}) {
  return {
    from_mode: GOV_MODES.DRY_RUN,
    to_mode: GOV_MODES.LIVE_TESTNET,
    governance_approval: true,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: false,
    reason: 'epoch26_drill',
    requested_by: 'epoch26',
    ts_ms: 1700000000000,
    ...overrides,
  };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-26 MICRO-LIVE GOVERNOR CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const gov = new GovernanceEngine({ initial_mode: GOV_MODES.DRY_RUN, eventLog, nowProvider: () => 1700000000000 });
  const modeAware = new ModeAwareExecutor({ executor: noopExecutor, governance: gov, eventLog });

  assert(gov.getState().mode === GOV_MODES.DRY_RUN, 'default mode is DRY_RUN');

  const blockedNoApproval = gov.requestTransition(mkReq({ governance_approval: false }));
  assert(blockedNoApproval.allowed === false, 'transition to LIVE_TESTNET blocked without governance approval');

  const approval = gov.issueApproval({
    approval_id: 'APR-E26',
    approver_id: 'governor',
    scope: 'live_testnet_transition',
    expiry_ms: 1700000000500,
    reason: 'micro-live drill approval',
  });
  const approvalCheck = gov.validateApproval(approval.approval_id, 'live_testnet_transition');
  assert(approvalCheck.allowed === true, 'approval artifact validates for required scope');

  const allowedTestnet = gov.requestTransition(mkReq());
  assert(allowedTestnet.allowed === true && gov.getState().mode === GOV_MODES.LIVE_TESTNET, 'transition to LIVE_TESTNET succeeds with prerequisites');

  const killBlocked = await modeAware.execute({ intent_id: 'i1' }, { reason: 'epoch26' }, { kill_switch_active: true });
  assert(killBlocked.blocked === true && killBlocked.reason === 'kill_switch_active', 'kill switch blocks execution in micro-live drill');

  const rollbackToDry = gov.requestTransition({
    from_mode: GOV_MODES.LIVE_TESTNET,
    to_mode: GOV_MODES.DRY_RUN,
    governance_approval: true,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: false,
    reason: 'emergency_rollback_drill',
    requested_by: 'epoch26',
    ts_ms: 1700000000001,
  });
  assert(rollbackToDry.allowed === true && gov.getState().mode === GOV_MODES.DRY_RUN, 'emergency rollback to DRY_RUN succeeds');

  const prodBlocked = gov.requestTransition({
    from_mode: GOV_MODES.DRY_RUN,
    to_mode: GOV_MODES.LIVE_PRODUCTION,
    governance_approval: true,
    risk_ready: true,
    safety_ready: true,
    manual_confirmation: true,
    reason: 'should_fail_fsm',
    requested_by: 'epoch26',
    ts_ms: 1700000000002,
  });
  assert(prodBlocked.allowed === false, 'LIVE_PRODUCTION blocked by FSM from DRY_RUN');

  assert(events.some((e) => e.event === 'governance_transition_allowed'), 'allowed transition events emitted');
  assert(events.some((e) => e.event === 'governance_transition_blocked'), 'blocked transition events emitted');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
