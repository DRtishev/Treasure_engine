#!/usr/bin/env node

import { LiveAdapterDryRun } from '../../core/exec/adapters/live_adapter_dryrun.mjs';
import { SafetyIntegratedExecutor } from '../../core/exec/safety_integrated_executor.mjs';
import { RiskGovernorState } from '../../core/risk/risk_governor.mjs';
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

function baseContext(overrides = {}) {
  return {
    run_id: 'epoch17_test_run',
    hack_id: 'HACK_E17',
    mode: 'dryrun',
    bar_idx: 0,
    order_seq: 0,
    bar: { t_ms: 1700000000000, c: 50000 },
    confirmationGiven: true,
    ...overrides,
  };
}

function baseIntent(overrides = {}) {
  return {
    symbol: 'BTC/USDT',
    side: 'BUY',
    type: 'MARKET',
    size: 0.001,
    price: 50000,
    size_usd: 50,
    ...overrides,
  };
}

async function testSafetyBlock() {
  const adapter = new LiveAdapterDryRun();
  const exec = new SafetyIntegratedExecutor({
    adapter,
    mode: 'DRY_RUN',
    ssot,
  });

  const res = await exec.execute(baseIntent({ side: 'HOLD' }), baseContext(), { currentPositionUsd: 0, dailyPnlUsd: 0 });
  assert(res.success === false && res.blocked === true, 'invalid intent blocked by safety gate');
  assert(res.stage === 'safety', 'blocked stage is safety');
}

async function testRiskBlock() {
  const adapter = new LiveAdapterDryRun();
  const riskState = new RiskGovernorState(ssot.risk_governor, 1700000000000);
  riskState.daily_pnl = -1000;

  const exec = new SafetyIntegratedExecutor({
    adapter,
    mode: 'DRY_RUN',
    ssot,
    riskState,
  });

  const res = await exec.execute(baseIntent(), baseContext(), { currentPositionUsd: 0, dailyPnlUsd: 0 });
  assert(res.success === false && res.blocked === true, 'daily loss cap blocked by risk precheck');
  assert(res.stage === 'risk_precheck', 'blocked stage is risk_precheck');
}

async function testHappyPath() {
  const adapter = new LiveAdapterDryRun();
  const events = [];
  const eventLog = {
    sys: (event, payload) => events.push({ category: 'SYS', event, payload }),
    risk: (event, payload) => events.push({ category: 'RISK', event, payload }),
    exec: (event, payload) => events.push({ category: 'EXEC', event, payload }),
  };

  const exec = new SafetyIntegratedExecutor({
    adapter,
    mode: 'DRY_RUN',
    ssot,
    eventLog,
    riskState: new RiskGovernorState(ssot.risk_governor, 1700000000000),
  });

  const res = await exec.execute(baseIntent(), baseContext(), { currentPositionUsd: 0, dailyPnlUsd: 0 });
  assert(res.success === true, 'valid intent executes successfully');
  assert(Boolean(res.order_id), 'execution returns order_id');
  assert(events.some((e) => e.event === 'safety_integrated_executor_route'), 'route event logged');
  assert(events.some((e) => e.event === 'safety_integrated_executor_result'), 'result event logged');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-17 SAFETY INTEGRATED EXECUTOR CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await testSafetyBlock();
  await testRiskBlock();
  await testHappyPath();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
