#!/usr/bin/env node
// scripts/verify/truth_layer_check.mjs
// EPOCH-06: Truth Layer Verification Suite
// Tests: determinism, HALT terminal, schema validation

import fs from 'fs';
import path from 'path';
import { TruthEngine, VERDICTS, MODES, REASON_CODES } from '../../core/truth/truth_engine.mjs';
import { GovernanceFSM } from '../../core/governance/mode_fsm.mjs';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`✓ ${msg}`);
  } else {
    failed++;
    console.error(`✗ ${msg}`);
  }
}

/**
 * Validate verdict against JSON schema (simple validation)
 */
function validateVerdict(verdict) {
  const required = [
    'verdict', 'mode', 'reason_codes', 'confidence',
    'actions', 'limits_snapshot', 'timestamp'
  ];
  
  for (const field of required) {
    if (!(field in verdict)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Validate verdict enum
  if (!Object.values(VERDICTS).includes(verdict.verdict)) {
    return { valid: false, error: `Invalid verdict: ${verdict.verdict}` };
  }
  
  // Validate mode enum
  if (!Object.values(MODES).includes(verdict.mode)) {
    return { valid: false, error: `Invalid mode: ${verdict.mode}` };
  }
  
  // Validate confidence range
  if (verdict.confidence < 0 || verdict.confidence > 1) {
    return { valid: false, error: `Confidence out of range: ${verdict.confidence}` };
  }
  
  // Validate reason_codes
  if (!Array.isArray(verdict.reason_codes) || verdict.reason_codes.length === 0) {
    return { valid: false, error: 'reason_codes must be non-empty array' };
  }
  
  return { valid: true };
}

/**
 * Test fixtures - SystemState scenarios
 */
function getTestFixtures() {
  return [
    // ALLOW scenarios
    {
      name: 'ALLOW_OK - All healthy',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        current_drawdown_pct: 0.05,
        daily_loss_usd: -10,
        last_data_timestamp: Date.now() - 100,
        perf_p99_ms: 200,
        rejection_rate: 0.05,
        avg_slippage_bps: 10,
        system_confidence: 0.95,
        requested_mode: MODES.PAPER
      },
      expectedVerdict: VERDICTS.ALLOW,
      expectedReasonCode: REASON_CODES.ALLOW_OK
    },
    
    // HALT scenarios
    {
      name: 'HALT_KILL_SWITCH - Kill switch active',
      systemState: {
        kill_switch: true,
        emergency_stop: false
      },
      expectedVerdict: VERDICTS.HALT,
      expectedReasonCode: REASON_CODES.HALT_KILL_SWITCH_ACTIVE
    },
    
    {
      name: 'HALT_EMERGENCY_STOP - Emergency stop active',
      systemState: {
        kill_switch: false,
        emergency_stop: true
      },
      expectedVerdict: VERDICTS.HALT,
      expectedReasonCode: REASON_CODES.HALT_EMERGENCY_STOP
    },
    
    {
      name: 'HALT_REALITY_GAP - Reality gap too high',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.90, // > 0.85 threshold
        last_data_timestamp: Date.now() - 100
      },
      expectedVerdict: VERDICTS.HALT,
      expectedReasonCode: REASON_CODES.HALT_REALITY_GAP
    },
    
    {
      name: 'HALT_DATA_STALE - Data too old',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        last_data_timestamp: Date.now() - 10000 // > 5000ms threshold
      },
      expectedVerdict: VERDICTS.HALT,
      expectedReasonCode: REASON_CODES.HALT_DATA_STALE
    },
    
    {
      name: 'HALT_MAX_DRAWDOWN - Drawdown exceeded',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        current_drawdown_pct: 0.25, // > 0.20 threshold
        last_data_timestamp: Date.now() - 100
      },
      expectedVerdict: VERDICTS.HALT,
      expectedReasonCode: REASON_CODES.HALT_MAX_DRAWDOWN
    },
    
    {
      name: 'HALT_DAILY_LOSS - Daily loss exceeded',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        current_drawdown_pct: 0.05,
        daily_loss_usd: -250, // > 200 threshold (absolute)
        last_data_timestamp: Date.now() - 100
      },
      expectedVerdict: VERDICTS.HALT,
      expectedReasonCode: REASON_CODES.HALT_DAILY_LOSS
    },
    
    // DEGRADED scenarios
    {
      name: 'DEGRADED_PERF_P99 - High latency',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        current_drawdown_pct: 0.05,
        daily_loss_usd: -10,
        last_data_timestamp: Date.now() - 100,
        perf_p99_ms: 1500, // > 1000ms threshold
        rejection_rate: 0.05,
        avg_slippage_bps: 10,
        requested_mode: MODES.PAPER
      },
      expectedVerdict: VERDICTS.DEGRADED,
      expectedReasonCode: REASON_CODES.DEGRADED_PERF_P99
    },
    
    {
      name: 'DEGRADED_HIGH_REJECT - High rejection rate',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        current_drawdown_pct: 0.05,
        daily_loss_usd: -10,
        last_data_timestamp: Date.now() - 100,
        perf_p99_ms: 200,
        rejection_rate: 0.35, // > 0.30 threshold
        avg_slippage_bps: 10,
        requested_mode: MODES.PAPER
      },
      expectedVerdict: VERDICTS.DEGRADED,
      expectedReasonCode: REASON_CODES.DEGRADED_HIGH_REJECT
    },
    
    {
      name: 'DEGRADED_HIGH_SLIPPAGE - High slippage',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        current_drawdown_pct: 0.05,
        daily_loss_usd: -10,
        last_data_timestamp: Date.now() - 100,
        perf_p99_ms: 200,
        rejection_rate: 0.05,
        avg_slippage_bps: 60, // > 50 threshold
        requested_mode: MODES.PAPER
      },
      expectedVerdict: VERDICTS.DEGRADED,
      expectedReasonCode: REASON_CODES.DEGRADED_HIGH_SLIPPAGE
    },
    
    {
      name: 'DEGRADED_LOW_CONFIDENCE - Low system confidence',
      systemState: {
        kill_switch: false,
        emergency_stop: false,
        reality_gap: 0.1,
        current_drawdown_pct: 0.05,
        daily_loss_usd: -10,
        last_data_timestamp: Date.now() - 100,
        perf_p99_ms: 200,
        rejection_rate: 0.05,
        avg_slippage_bps: 10,
        system_confidence: 0.60, // < 0.75 threshold
        requested_mode: MODES.PAPER
      },
      expectedVerdict: VERDICTS.DEGRADED,
      expectedReasonCode: REASON_CODES.DEGRADED_LOW_CONFIDENCE
    }
  ];
}

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-06: TRUTH LAYER VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Load SSOT
    const ssotPath = path.join(process.cwd(), 'spec', 'ssot.json');
    const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf-8'));
    
    // Create Truth Engine
    const engine = new TruthEngine(ssot);
    
    console.log('━━━ TEST 1: TRUTH ENGINE INITIALIZATION ━━━');
    assert(engine !== null, 'Truth Engine created');
    assert(engine.config !== undefined, 'Truth Engine has config');
    assert(engine.config.reality_gap_halt === 0.85, 'Reality gap halt threshold correct');
    console.log('');

    // Test fixtures
    const fixtures = getTestFixtures();
    
    console.log('━━━ TEST 2: FIXTURE EVALUATION ━━━');
    console.log(`Testing ${fixtures.length} scenarios...`);
    console.log('');
    
    const results = [];
    
    for (const fixture of fixtures) {
      const verdict = engine.evaluate(fixture.systemState);
      results.push({ fixture, verdict });
      
      // Validate schema
      const validation = validateVerdict(verdict);
      assert(validation.valid, `${fixture.name} - schema valid`);
      
      // Check verdict
      assert(
        verdict.verdict === fixture.expectedVerdict,
        `${fixture.name} - verdict ${verdict.verdict} === ${fixture.expectedVerdict}`
      );
      
      // Check reason code
      assert(
        verdict.reason_codes.includes(fixture.expectedReasonCode),
        `${fixture.name} - reason code ${fixture.expectedReasonCode} present`
      );
      
      // Check HALT terminal properties
      if (verdict.verdict === VERDICTS.HALT) {
        assert(
          verdict.actions.kill_switch === true,
          `${fixture.name} - HALT activates kill switch`
        );
        assert(
          verdict.confidence === 0.0,
          `${fixture.name} - HALT confidence is 0.0`
        );
        assert(
          verdict.mode === MODES.OFF,
          `${fixture.name} - HALT mode is OFF`
        );
      }
    }
    
    console.log('');
    console.log('━━━ TEST 3: DETERMINISM ━━━');
    
    // Re-evaluate same fixture multiple times
    const testFixture = fixtures[0];
    const verdict1 = engine.evaluate(testFixture.systemState);
    const verdict2 = engine.evaluate(testFixture.systemState);
    const verdict3 = engine.evaluate(testFixture.systemState);
    
    // Compare (excluding timestamp)
    const v1 = { ...verdict1, timestamp: 0 };
    const v2 = { ...verdict2, timestamp: 0 };
    const v3 = { ...verdict3, timestamp: 0 };
    
    assert(
      JSON.stringify(v1) === JSON.stringify(v2),
      'Determinism: verdict1 === verdict2'
    );
    assert(
      JSON.stringify(v2) === JSON.stringify(v3),
      'Determinism: verdict2 === verdict3'
    );
    
    console.log('');
    console.log('━━━ TEST 4: GOVERNANCE FSM ━━━');
    
    const fsm = new GovernanceFSM(MODES.OFF);
    
    assert(fsm.currentMode === MODES.OFF, 'FSM starts in OFF mode');
    
    // Test normal transition: OFF → PAPER
    const allowVerdict = {
      verdict: VERDICTS.ALLOW,
      mode: MODES.PAPER,
      reason_codes: [REASON_CODES.ALLOW_OK]
    };
    
    const t1 = fsm.transition(MODES.PAPER, allowVerdict);
    assert(t1.success === true, 'OFF → PAPER transition successful');
    assert(fsm.currentMode === MODES.PAPER, 'FSM now in PAPER mode');
    
    // Test HALT enforcement
    const haltVerdict = {
      verdict: VERDICTS.HALT,
      mode: MODES.OFF,
      reason_codes: [REASON_CODES.HALT_KILL_SWITCH_ACTIVE]
    };
    
    const t2 = fsm.transition(MODES.LIVE, haltVerdict);
    assert(fsm.haltActive === true, 'HALT activated');
    assert(fsm.currentMode === MODES.OFF, 'FSM forced to OFF on HALT');
    
    // Test HALT terminal: cannot transition without manual reset
    const t3 = fsm.transition(MODES.PAPER, allowVerdict);
    assert(t3.success === false, 'Cannot transition from HALT without manual reset');
    assert(t3.manualResetRequired === true, 'Manual reset required flag set');
    
    // Request manual reset
    const reset = fsm.requestManualReset();
    assert(reset.success === true, 'Manual reset requested');
    
    // Now transition should work
    const t4 = fsm.transition(MODES.PAPER, allowVerdict);
    assert(t4.success === true, 'Transition successful after manual reset');
    assert(fsm.haltActive === false, 'HALT cleared after manual reset');
    
    console.log('');
    console.log('━━━ TEST 5: GENERATE REPORT ━━━');
    
    // Generate truth_report.json
    const report = {
      generated_at: new Date().toISOString(),
      epoch: 'EPOCH-06',
      engine_version: '1.0.0',
      ssot_config: engine.getConfig(),
      test_fixtures: fixtures.length,
      test_results: results.map((r, idx) => ({
        scenario: r.fixture.name,
        input: r.fixture.systemState,
        output: {
          verdict: r.verdict.verdict,
          mode: r.verdict.mode,
          reason_codes: r.verdict.reason_codes,
          confidence: r.verdict.confidence,
          actions: r.verdict.actions
        }
      }))
    };
    
    const reportPath = path.join(process.cwd(), 'reports', 'truth_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    assert(fs.existsSync(reportPath), 'truth_report.json generated');
    console.log(`   Report: ${reportPath}`);
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ PASSED: ${passed}`);
    console.log(`✗ FAILED: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (failed > 0) {
      console.error('✗ Truth Layer verification FAILED');
      process.exit(1);
    }

    console.log('✓ Truth Layer verification PASSED');
    console.log('');
    console.log('TRUTH LAYER: OPERATIONAL');
    console.log('  • Deterministic: ✓');
    console.log('  • HALT terminal: ✓');
    console.log('  • Schema valid: ✓');
    console.log('  • FSM working: ✓');
    console.log('  • Report generated: ✓');
    console.log('');
    
    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✗ TRUTH LAYER VERIFICATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    process.exit(1);
  }
}

main();
