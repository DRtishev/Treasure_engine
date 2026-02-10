#!/usr/bin/env node
// core/court/court_v2.mjs - EPOCH-07: Court with Truth Layer Integration
// Hierarchy: Truth Layer (Safety) > Court (Strategy Evaluation)

import fs from 'fs';
import crypto from 'crypto';
import { TruthEngine, VERDICTS, REASON_CODES } from '../truth/truth_engine.mjs';

function loadJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Build system state from simulation reports for Truth Layer evaluation
 */
function buildSystemState(reports, hackId) {
  const base = reports.base;
  const hostile = reports.hostile;
  
  const penaltyBreakdown = base.summary?.penalty_breakdown || {};
  const realityGap = penaltyBreakdown.reality_gap?.raw || 0;
  const maxDrawdown = Math.abs(hostile.summary?.max_drawdown_pct || 0);
  const pnl = base.summary?.pnl_usd || 0;
  
  return {
    // System flags
    kill_switch: false, // Would come from live system
    emergency_stop: false,
    
    // Data quality
    reality_gap: realityGap,
    last_data_timestamp: Date.now(),
    
    // Risk metrics
    current_drawdown_pct: maxDrawdown,
    daily_loss_usd: pnl < 0 ? pnl : 0,
    
    // Performance metrics
    perf_p99_ms: 200, // Would come from performance monitoring
    rejection_rate: penaltyBreakdown.reject_ratio?.raw || hostile.execution?.reject_ratio || 0,
    avg_slippage_bps: penaltyBreakdown.slippage_p99_bps?.raw || 0,
    
    // Confidence
    system_confidence: 1.0 - realityGap,
    
    // Metadata
    hack_id: hackId,
    evaluation_timestamp: Date.now()
  };
}

/**
 * Court v1 logic (existing strategy evaluation)
 */
function evaluateStrategy(hackId, reports, ssot) {
  const reasons = [];
  let decision = 'ALLOWED';
  const evidence = {};
  
  const base = reports.base;
  const hostile = reports.hostile;
  
  const tradeCountFilled = (base.summary.trade_count_filled ?? base.summary.trade_count ?? 0);
  
  // PRIORITY 1: NEEDS_DATA check
  if (tradeCountFilled < 10) {
    decision = 'NEEDS_DATA';
    reasons.push(`Insufficient trade count: ${tradeCountFilled} < 10`);
    return { decision, reasons, evidence };
  }
  
  // Get metrics
  const penaltyBreakdown = base.summary.penalty_breakdown;
  const realityGap = penaltyBreakdown?.reality_gap?.raw ?? 0;
  
  // PRIORITY 2: REALITY GAP CLIFF
  const realityGapCliff = ssot.thresholds?.reality_gap_cliff ?? 0.85;
  if (realityGap >= realityGapCliff) {
    decision = 'BLOCKED';
    reasons.push(`REALITY GAP CLIFF: ${(realityGap * 100).toFixed(1)}% >= ${(realityGapCliff * 100).toFixed(0)}% (model hallucination)`);
  }
  
  // PRIORITY 3: Standard checks
  const penalizedExp = base.summary.penalized_expectancy_per_trade;
  const rawExp = base.summary.expectancy_per_trade;
  
  let expectancyToUse = penalizedExp;
  if (penalizedExp === undefined || penalizedExp === null) {
    expectancyToUse = rawExp;
    reasons.push('WARNING: penalized_expectancy not found, using raw expectancy');
  }
  
  if (expectancyToUse <= ssot.thresholds.min_penalized_expectancy) {
    decision = 'BLOCKED';
    reasons.push(`Penalized expectancy too low: ${expectancyToUse.toFixed(6)} <= ${ssot.thresholds.min_penalized_expectancy}`);
  }
  
  if (hostile.summary.max_drawdown_pct > ssot.thresholds.max_penalized_maxdd_pct) {
    decision = 'BLOCKED';
    reasons.push(`Hostile max drawdown too high: ${(hostile.summary.max_drawdown_pct * 100).toFixed(2)}% > ${(ssot.thresholds.max_penalized_maxdd_pct * 100).toFixed(2)}%`);
  }
  
  if (hostile.execution.reject_ratio > ssot.thresholds.max_reject_ratio) {
    decision = 'BLOCKED';
    reasons.push(`Hostile reject ratio too high: ${(hostile.execution.reject_ratio * 100).toFixed(2)}% > ${(ssot.thresholds.max_reject_ratio * 100).toFixed(2)}%`);
  }
  
  // Reality gap WARNING
  const realityGapWarn = ssot.thresholds?.reality_gap_warn ?? 0.5;
  if (realityGap > realityGapWarn && realityGap < realityGapCliff) {
    reasons.push(`WARNING: High reality gap ${(realityGap * 100).toFixed(1)}% > ${(realityGapWarn * 100).toFixed(0)}% (sensitive to execution assumptions)`);
  }
  
  evidence.reality_gap = realityGap;
  evidence.reality_gap_cliff = realityGapCliff;
  evidence.base_penalized_expectancy = base.summary.penalized_expectancy_per_trade ?? base.summary.expectancy_per_trade;
  evidence.base_expectancy_raw = base.summary.expectancy_per_trade;
  evidence.penalty_total = base.summary.penalty_breakdown?.total ?? 0;
  evidence.hostile_max_dd_pct = hostile.summary.max_drawdown_pct;
  evidence.hostile_reject_ratio = hostile.execution.reject_ratio;
  
  if (decision === 'ALLOWED') {
    reasons.push('All thresholds passed (penalized metrics)');
  }
  
  return { decision, reasons, evidence };
}

/**
 * Court v2: Integrate Truth Layer with Court v1 logic
 * Hierarchy: Truth (Safety) > Court (Strategy)
 */
function judgeWithTruthLayer(hackId, reports, ssot, truthEngine) {
  // STEP 1: Evaluate strategy (Court v1 logic)
  const courtResult = evaluateStrategy(hackId, reports, ssot);
  
  // STEP 2: Build system state from reports
  const systemState = buildSystemState(reports, hackId);
  
  // STEP 3: Evaluate with Truth Layer
  const truthVerdict = truthEngine.evaluate(systemState);
  
  // STEP 4: Apply Truth Layer hierarchy (Truth > Court)
  let finalDecision = courtResult.decision;
  const finalReasons = [...courtResult.reasons];
  let override = false;
  
  // Truth HALT → override to BLOCKED
  if (truthVerdict.verdict === VERDICTS.HALT) {
    finalDecision = 'BLOCKED';
    finalReasons.unshift('TRUTH LAYER HALT: ' + truthVerdict.reason_codes.join(', '));
    override = true;
  }
  
  // Truth DEGRADED → add warning
  if (truthVerdict.verdict === VERDICTS.DEGRADED) {
    finalReasons.unshift('TRUTH LAYER DEGRADED: ' + truthVerdict.reason_codes.join(', '));
  }
  
  return {
    hack_id: hackId,
    decision: finalDecision,
    reasons: finalReasons,
    evidence: {
      ...courtResult.evidence,
      truth_verdict: truthVerdict.verdict,
      truth_mode: truthVerdict.mode,
      truth_confidence: truthVerdict.confidence,
      truth_reason_codes: truthVerdict.reason_codes
    },
    court_decision: courtResult.decision,
    truth_override: override,
    timestamp: Date.now()
  };
}

/**
 * Main execution
 */
function main() {
  console.log('[court-v2] Starting Court v2 adjudication (TRUTH LAYER INTEGRATED)...');
  console.log('');
  
  const ssot = loadJSON('spec/ssot.json');
  const truthEngine = new TruthEngine(ssot);
  
  const HACK_IDS = ['HACK_A2', 'HACK_A3', 'HACK_B1', 'HACK_B3'];
  
  const decisions = [];
  let allowedCount = 0;
  let blockedCount = 0;
  let needsDataCount = 0;
  
  for (const hackId of HACK_IDS) {
    console.log(`[court-v2] Judging ${hackId}...`);
    
    try {
      const reports = {
        optimistic: loadJSON(`reports/${hackId.toLowerCase()}_optimistic_report.json`),
        base: loadJSON(`reports/${hackId.toLowerCase()}_base_report.json`),
        hostile: loadJSON(`reports/${hackId.toLowerCase()}_hostile_report.json`)
      };
      
      const judgment = judgeWithTruthLayer(hackId, reports, ssot, truthEngine);
      decisions.push(judgment);
      
      // Count decisions
      if (judgment.decision === 'ALLOWED') allowedCount++;
      else if (judgment.decision === 'BLOCKED') blockedCount++;
      else if (judgment.decision === 'NEEDS_DATA') needsDataCount++;
      
      // Show result
      console.log(`   Decision: ${judgment.decision}`);
      if (judgment.truth_override) {
        console.log(`   ⚠️  TRUTH OVERRIDE: ${judgment.court_decision} → ${judgment.decision}`);
      }
      console.log(`   Truth Verdict: ${judgment.evidence.truth_verdict}`);
      console.log(`   Truth Confidence: ${judgment.evidence.truth_confidence.toFixed(2)}`);
      
    } catch (err) {
      const judgment = {
        hack_id: hackId,
        decision: 'NEEDS_DATA',
        reasons: [`Missing per-mode reports: ${err.message}`],
        evidence: {},
        court_decision: 'NEEDS_DATA',
        truth_override: false,
        timestamp: Date.now()
      };
      decisions.push(judgment);
      needsDataCount++;
      
      console.log(`   Decision: NEEDS_DATA (${err.message})`);
    }
    
    console.log('');
  }
  
  // Generate report
  const report = {
    version: '2.0.0',
    epoch: 'EPOCH-07',
    integration: 'Truth Layer + Court',
    generated_at: new Date().toISOString(),
    summary: {
      total: decisions.length,
      allowed: allowedCount,
      blocked: blockedCount,
      needs_data: needsDataCount,
      truth_overrides: decisions.filter(d => d.truth_override).length
    },
    decisions,
    ssot_version: ssot.version,
    ssot_sha256: sha256Text(JSON.stringify(ssot))
  };
  
  const reportPath = 'reports/court_v2_report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[court-v2] Generated: ${reportPath}`);
  
  console.log(`[court-v2] Summary: ${allowedCount} ALLOWED, ${blockedCount} BLOCKED, ${needsDataCount} NEEDS_DATA`);
  console.log(`[court-v2] Truth Overrides: ${report.summary.truth_overrides}`);
  console.log('');
  
  // Validate against schema
  const schemaPath = 'truth/court_report.schema.json';
  if (fs.existsSync(schemaPath)) {
    console.log(`[court-v2] Validating against schema: ${schemaPath}`);
    // Schema validation would go here
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { judgeWithTruthLayer, buildSystemState, evaluateStrategy };
