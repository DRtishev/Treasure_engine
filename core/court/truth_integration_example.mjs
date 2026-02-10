#!/usr/bin/env node
// core/court/truth_integration_example.mjs
// EPOCH-06: Example of Truth Layer integration with Court
// Shows how Court can use TruthEngine to enforce HALT decisions

import { TruthEngine, VERDICTS, MODES, REASON_CODES } from '../truth/truth_engine.mjs';
import { GovernanceFSM } from '../governance/mode_fsm.mjs';
import fs from 'fs';

/**
 * Example: Court integration with Truth Layer
 * 
 * FLOW:
 * 1. Court evaluates strategy (existing logic)
 * 2. Truth Engine evaluates system state
 * 3. If Truth verdict is HALT → override Court decision to BLOCKED
 * 4. Hierarchy enforced: Safety > Truth > Profit
 */
function judgeWithTruthLayer(hackId, strategy Reports, ssot, systemState) {
  // STEP 1: Normal Court judgment (existing logic)
  const courtDecision = evaluateStrategy(strategyReports, ssot);
  
  // STEP 2: Truth Layer evaluation
  const truthEngine = new TruthEngine(ssot);
  const truthVerdict = truthEngine.evaluate(systemState);
  
  // STEP 3: Truth Layer override (Safety > Truth > Profit)
  if (truthVerdict.verdict === VERDICTS.HALT) {
    return {
      decision: 'BLOCKED',
      reasons: [
        'TRUTH LAYER HALT',
        ...truthVerdict.reason_codes,
        courtDecision.decision // Original court decision preserved for audit
      ],
      truth_verdict: truthVerdict,
      court_decision: courtDecision.decision,
      override: true
    };
  }
  
  // STEP 4: If DEGRADED, add warning but allow Court decision
  if (truthVerdict.verdict === VERDICTS.DEGRADED) {
    return {
      ...courtDecision,
      warnings: [
        'TRUTH LAYER DEGRADED',
        ...truthVerdict.reason_codes
      ],
      truth_verdict: truthVerdict,
      degraded_actions: truthVerdict.actions
    };
  }
  
  // STEP 5: ALLOW - Court decision stands
  return {
    ...courtDecision,
    truth_verdict: truthVerdict
  };
}

/**
 * Example: Build system state from simulation reports
 */
function buildSystemStateFromReports(reports, ssot) {
  const base = reports.base;
  const hostile = reports.hostile;
  
  // Extract metrics
  const penaltyBreakdown = base.summary?.penalty_breakdown || {};
  const realityGap = penaltyBreakdown.reality_gap?.raw || 0;
  const maxDrawdown = Math.abs(base.summary?.max_drawdown_pct || 0);
  const pnl = base.summary?.pnl_usd || 0;
  
  // Build system state
  return {
    kill_switch: false, // Would come from live system
    emergency_stop: false,
    reality_gap: realityGap,
    current_drawdown_pct: maxDrawdown,
    daily_loss_usd: pnl < 0 ? pnl : 0,
    last_data_timestamp: Date.now(), // Would come from data pipeline
    perf_p99_ms: 200, // Would come from performance monitoring
    rejection_rate: penaltyBreakdown.reject_ratio?.raw || 0,
    avg_slippage_bps: penaltyBreakdown.slippage_p99_bps?.raw || 0,
    system_confidence: 1.0 - realityGap, // Derived from reality gap
    requested_mode: MODES.PAPER
  };
}

/**
 * Example: Evaluate strategy (simplified Court logic)
 */
function evaluateStrategy(reports, ssot) {
  const base = reports.base;
  const penalizedExpectancy = base.summary?.penalized_expectancy || 0;
  const minExpectancy = ssot.thresholds?.min_penalized_expectancy || 0.0;
  
  if (penalizedExpectancy < minExpectancy) {
    return {
      decision: 'BLOCKED',
      reasons: [`Penalized expectancy ${penalizedExpectancy.toFixed(4)} < ${minExpectancy}`]
    };
  }
  
  return {
    decision: 'ALLOWED',
    reasons: ['Strategy meets all thresholds']
  };
}

/**
 * Example usage
 */
function exampleUsage() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TRUTH LAYER + COURT INTEGRATION EXAMPLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Load SSOT
  const ssot = JSON.parse(fs.readFileSync('spec/ssot.json', 'utf-8'));
  
  // Load strategy reports (example with HACK_A2)
  const reports = {
    optimistic: JSON.parse(fs.readFileSync('reports/hack_a2_optimistic_report.json', 'utf-8')),
    base: JSON.parse(fs.readFileSync('reports/hack_a2_base_report.json', 'utf-8')),
    hostile: JSON.parse(fs.readFileSync('reports/hack_a2_hostile_report.json', 'utf-8'))
  };
  
  // Build system state from reports
  const systemState = buildSystemStateFromReports(reports, ssot);
  
  console.log('System State:');
  console.log(`  Reality Gap: ${(systemState.reality_gap * 100).toFixed(1)}%`);
  console.log(`  Max Drawdown: ${(systemState.current_drawdown_pct * 100).toFixed(1)}%`);
  console.log(`  Daily Loss: $${systemState.daily_loss_usd.toFixed(2)}`);
  console.log('');
  
  // Judge with Truth Layer
  const judgment = judgeWithTruthLayer('HACK_A2', reports, ssot, systemState);
  
  console.log('Judgment:');
  console.log(`  Decision: ${judgment.decision}`);
  console.log(`  Reasons: ${judgment.reasons.join(', ')}`);
  
  if (judgment.truth_verdict) {
    console.log('');
    console.log('Truth Verdict:');
    console.log(`  Verdict: ${judgment.truth_verdict.verdict}`);
    console.log(`  Mode: ${judgment.truth_verdict.mode}`);
    console.log(`  Confidence: ${judgment.truth_verdict.confidence.toFixed(2)}`);
    console.log(`  Reason Codes: ${judgment.truth_verdict.reason_codes.join(', ')}`);
  }
  
  if (judgment.override) {
    console.log('');
    console.log('⚠️  TRUTH LAYER OVERRIDE: Court decision overridden by HALT verdict');
    console.log(`   Original Court Decision: ${judgment.court_decision}`);
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}

export { judgeWithTruthLayer, buildSystemStateFromReports };
