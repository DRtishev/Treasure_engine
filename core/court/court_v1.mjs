#!/usr/bin/env node
// core/court/court_v1.mjs - E2.1 PENALIZED METRICS
import fs from 'fs';
import crypto from 'crypto';

function loadJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function main() {
  console.log('[court] Starting Court v1 adjudication (PENALIZED METRICS)...');
  
  const ssot = loadJSON('spec/ssot.json');
  const HACK_IDS = ['HACK_A2', 'HACK_A3', 'HACK_B1', 'HACK_B3'];
  
  const decisions = [];
  
  for (const hackId of HACK_IDS) {
    console.log(`[court] Judging ${hackId}...`);
    
    const reasons = [];
    let decision = 'ALLOWED';
    const evidence = {};
    
    try {
      const optimistic = loadJSON(`reports/${hackId.toLowerCase()}_optimistic_report.json`);
      const base = loadJSON(`reports/${hackId.toLowerCase()}_base_report.json`);
      const hostile = loadJSON(`reports/${hackId.toLowerCase()}_hostile_report.json`);
      
      const tradeCountFilled = (base.summary.trade_count_filled ?? base.summary.trade_count ?? 0);
      
      // PRIORITY 1: NEEDS_DATA check (minimum trades required)
      if (tradeCountFilled < 10) {
        decision = 'NEEDS_DATA';
        reasons.push(`Insufficient trade count: ${tradeCountFilled} < 10`);
      } else {
        // Get reality gap for cliff check
        const penaltyBreakdown = base.summary.penalty_breakdown;
        const realityGap = penaltyBreakdown?.reality_gap?.raw ?? 0;
        
        // PRIORITY 2: REALITY GAP CLIFF (catastrophic model failure)
        const realityGapCliff = ssot.thresholds?.reality_gap_cliff ?? 0.85;
        if (realityGap >= realityGapCliff) {
          decision = 'BLOCKED';
          reasons.push(`REALITY GAP CLIFF: ${(realityGap * 100).toFixed(1)}% >= ${(realityGapCliff * 100).toFixed(0)}% (model hallucination)`);
        }
        
        // PRIORITY 3: Standard checks (penalized expectancy, drawdown, reject ratio)
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
        
        // Reality gap WARNING (below cliff but above warn threshold)
        const realityGapWarn = ssot.thresholds?.reality_gap_warn ?? 0.5;
        if (realityGap > realityGapWarn && realityGap < realityGapCliff) {
          reasons.push(`WARNING: High reality gap ${(realityGap * 100).toFixed(1)}% > ${(realityGapWarn * 100).toFixed(0)}% (sensitive to execution assumptions)`);
        }
        
        evidence.reality_gap = realityGap;
        evidence.reality_gap_cliff = realityGapCliff;
      }
      
      evidence.base_penalized_expectancy = base.summary.penalized_expectancy_per_trade ?? base.summary.expectancy_per_trade;
      evidence.base_expectancy_raw = base.summary.expectancy_per_trade;
      evidence.penalty_total = base.summary.penalty_breakdown?.total ?? 0;
      evidence.hostile_max_dd_pct = hostile.summary.max_drawdown_pct;
      evidence.hostile_reject_ratio = hostile.execution.reject_ratio;
      
      if (decision === 'ALLOWED') {
        reasons.push('All thresholds passed (penalized metrics)');
      }
      
    } catch (err) {
      decision = 'NEEDS_DATA';
      reasons.push(`Missing per-mode reports: ${err.message}`);
    }
    
    decisions.push({
      id: hackId,
      decision,
      reasons,
      evidence
    });
  }
  
  const summary = {
    total: decisions.length,
    allowed: decisions.filter(d => d.decision === 'ALLOWED').length,
    blocked: decisions.filter(d => d.decision === 'BLOCKED').length,
    disabled: 0,
    needs_data: decisions.filter(d => d.decision === 'NEEDS_DATA').length
  };
  
  const ssotText = fs.readFileSync('spec/ssot.json', 'utf8');
  
  const courtReport = {
    version: '1.0',
    run_id: crypto.randomBytes(8).toString('hex'),
    timestamp_utc: new Date().toISOString(),
    ssot_ref: {
      path: 'spec/ssot.json',
      sha256: sha256Text(ssotText)
    },
    hacks: decisions,
    summary
  };
  
  fs.writeFileSync('reports/court_report.json', JSON.stringify(courtReport, null, 2));
  console.log('[court] Generated: reports/court_report.json');
  console.log(`[court] Summary: ${summary.allowed} ALLOWED, ${summary.blocked} BLOCKED, ${summary.needs_data} NEEDS_DATA`);
}

main();
