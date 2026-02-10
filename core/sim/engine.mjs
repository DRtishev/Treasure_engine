#!/usr/bin/env node
// core/sim/engine.mjs - Phase 2.2 PROFIT DOMINATOR
import fs from 'fs';
import crypto from 'crypto';
import { loadDatasetWithSha, hash32 } from '../data/dataset_io.mjs';
import { SeededRNG } from './rng.mjs';
import { sampleSpreadProxy } from './models.mjs';
import { generateBaseSignals } from './base_signal.mjs';
import { simulateOrder } from './order_lifecycle.mjs';
import { calculateMetrics } from './metrics.mjs';
import { computePenalizedMetrics } from './penalized.mjs';
import * as qualityFilter from '../quality/quality_filter.mjs';
import * as executionPolicy from '../exec/execution_policy.mjs';
import { RiskGovernorState, preCheck as riskPreCheck, update as riskUpdate, getDashboard as riskDashboard } from '../risk/risk_governor.mjs';

const MODES = ['optimistic', 'base', 'hostile'];
const HACK_IDS = ['HACK_A2', 'HACK_A3', 'HACK_B1', 'HACK_B3'];

function loadJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function enrichBar(bar, allBars, idx, barIntervalMs = 300000) {
  // Enrich bar with computed metrics for quality filter
  // ATR (Average True Range) as % of close
  if (idx > 0) {
    const prev = allBars[idx - 1];
    const tr = Math.max(
      bar.h - bar.l,
      Math.abs(bar.h - prev.c),
      Math.abs(bar.l - prev.c)
    );
    bar.atr_pct = tr / bar.c;
  } else {
    bar.atr_pct = (bar.h - bar.l) / bar.c;
  }
  
  // Volume in USD (assuming v is in base units, price ~$100)
  bar.volume_usd = bar.v * bar.c;
  
  // Spread proxy (% of price) - synthetic estimate
  const hl_range = bar.h - bar.l;
  bar.spread_bps = Math.max(1, (hl_range / bar.c) * 10000 * 0.1); // 10% of range as spread proxy
  
  // Volatility (bar range as % of close)
  bar.volatility = (bar.h - bar.l) / bar.c;
  
  // Timestamp (for deterministic time injection)
  if (!bar.t_ms) {
    bar.t_ms = idx * barIntervalMs; // 5min bars = 300000ms
  }
  
  return bar;
}

function runHackSimulation(hackId, mode, dataset, ssot, hackSpec, rng) {
  const bars = dataset.bars;
  
  // Phase 2.2: Enrich bars with computed metrics + timestamps
  const barIntervalMs = dataset.meta?.bar_interval_ms || 300000; // 5min default
  for (let i = 0; i < bars.length; i++) {
    enrichBar(bars[i], bars, i, barIntervalMs);
  }
  
  const baseSignals = generateBaseSignals(bars);
  const spreadProxy = sampleSpreadProxy(mode, rng);
  
  let filteredSignals = baseSignals.filter(s => s.signal !== 'none');
  
  // Phase 2.2: Initialize RiskGovernor
  const initialEquity = ssot.risk_governor?.initial_equity_usd || 10000;
  const riskState = new RiskGovernorState(ssot.risk_governor, bars[0].t_ms);
  riskState.updateEquity(initialEquity);
  
  const baseOrderSize = ssot.execution_policy?.base_order_size_usd || 1000;
  
  // Phase 2.1: Quality Filter
  const qualityChecks = [];
  const qualityFiltered = [];
  for (const sig of filteredSignals) {
    const bar = bars[sig.idx];
    const check = qualityFilter.evaluate(sig, bar, ssot);
    qualityChecks.push(check);
    if (check.pass) {
      qualityFiltered.push({ ...sig, quality_score: check.score });
    }
  }
  
  // Phase 2.2: Trade execution with full integration
  const trades = [];
  const riskBlocked = [];
  const execPolicies = [];
  
  for (const sig of qualityFiltered) {
    const bar = bars[sig.idx];
    const now_ms = bar.t_ms;
    
    // Quality-adjusted position sizing
    let size_usd = baseOrderSize * sig.quality_score;
    size_usd = Math.max(100, Math.min(size_usd, baseOrderSize * 1.2)); // clamp 100 to 120% of base
    
    // RiskGovernor pre-check
    const intent = { size_usd, quality_score: sig.quality_score };
    const riskCheck = riskPreCheck(intent, riskState, ssot, now_ms);
    
    if (!riskCheck.pass) {
      // Risk blocked - create rejected trade record
      riskBlocked.push({
        idx: sig.idx,
        reason: riskCheck.reason,
        size_usd
      });
      
      trades.push({
        filled: false,
        rejected: true,
        reason: 'risk_blocked',
        fill_ratio: 0,
        pnl: 0,
        pnl_usd: 0,
        slippage_bps: 0,
        latency_ms: 0,
        ttl_ms: 0,
        tip_bps: 0,
        size_usd,
        competition_score: 0
      });
      continue;
    }
    
    // ExecutionPolicy compute
    const execPol = executionPolicy.compute(sig, bar, ssot);
    execPolicies.push(execPol);
    
    // Simulate order with full integration
    const tradeIntent = {
      size_usd,
      quality_score: sig.quality_score,
      ttl_ms: execPol.ttl_ms,
      tip_bps: execPol.tip_bps
    };
    
    const result = simulateOrder(sig.signal, bars, sig.idx, mode, rng, ssot, execPol, tradeIntent);
    trades.push(result);
    
    // RiskGovernor update
    if (result.filled) {
      riskUpdate(result, riskState, ssot, now_ms);
    }
  }
  
  const metrics = calculateMetrics(trades);
  const qualityStats = qualityFilter.aggregateStats(qualityChecks);
  const execStats = executionPolicy.aggregateStats(trades.map(t => ({ execParams: { ttl_ms: t.ttl_ms, tip_bps: t.tip_bps, competition_score: t.competition_score }})));
  const riskDash = riskDashboard(riskState, ssot, bars[bars.length - 1].t_ms);
  
  return { 
    metrics, 
    tradeCount: trades.length,
    qualityStats: {
      total_signals: filteredSignals.length,
      quality_filtered: filteredSignals.length - qualityFiltered.length,
      passed: qualityFiltered.length,
      pass_rate: filteredSignals.length > 0 ? qualityFiltered.length / filteredSignals.length : 0,
      avg_score: qualityStats.avg_score,
      min_score: qualityStats.min_score,
      max_score: qualityStats.max_score
    },
    executionPolicyStats: {
      total: execPolicies.length,
      avg_ttl_ms: execStats.avg_ttl_ms,
      avg_tip_bps: execStats.avg_tip_bps,
      avg_competition: execStats.avg_competition,
      max_ttl_ms: execStats.max_ttl_ms,
      max_tip_bps: execStats.max_tip_bps,
      expired_count: trades.filter(t => t.reason === 'ttl_expired').length
    },
    riskGovernorStats: {
      kill_switch_active: riskDash.status === 'KILL_SWITCH_ACTIVE',
      kill_switch_reason: riskDash.kill_switch_reason,
      circuit_breaker_active: riskDash.status === 'CIRCUIT_BREAKER',
      final_equity_usd: riskDash.current_equity,
      peak_equity_usd: riskDash.peak_equity,
      final_drawdown_pct: riskDash.current_drawdown_pct,
      daily_pnl_usd: riskDash.daily_pnl,
      daily_trade_count: riskDash.daily_trade_count,
      blocked_trades: riskBlocked.length,
      caps: riskDash.caps
    }
  };
}

function main() {
  console.log('[engine] Starting Phase 2.2 PROFIT DOMINATOR simulation...');
  const ssot = loadJSON('spec/ssot.json');
  const datasetPath = process.env.DATASET_PATH || 'data/synthetic_1000bars_5m.json';
  const { dataset, datasetText, datasetSha256 } = loadDatasetWithSha(datasetPath);
  const baseSeed = (dataset.meta && Number.isFinite(dataset.meta.seed)) ? (dataset.meta.seed >>> 0) : (hash32(datasetSha256) >>> 0);
  
  const runId = crypto.randomBytes(8).toString('hex');
  const timestamp = new Date().toISOString();
  
  fs.mkdirSync('reports', { recursive: true });
  
  const allReports = {};
  
  for (const hackId of HACK_IDS) {
    const modeResults = {};
    for (const mode of MODES) {
      console.log(`[engine] Running ${hackId} in ${mode} mode...`);
      const rng = new SeededRNG((baseSeed ^ hash32(hackId + ':' + mode)) >>> 0);
      modeResults[mode] = runHackSimulation(hackId, mode, dataset, ssot, {}, rng);
    }
    
    const expOpt = modeResults.optimistic.metrics.expectancy_per_trade;
    const expBase = modeResults.base.metrics.expectancy_per_trade;
    const expHostile = modeResults.hostile.metrics.expectancy_per_trade;
    const denom = Math.max(Math.abs(expBase), Math.abs(expOpt), Math.abs(expHostile), 1e-9);
    const realityGap = Math.abs(expOpt - expHostile) / denom;
    
    const hostileExec = {
      reject_ratio: modeResults.hostile.metrics.reject_ratio,
      slippage_p99_bps: modeResults.hostile.metrics.slippage_p99_bps,
      rtt_p99_ms: modeResults.hostile.metrics.rtt_p99_ms
    };
    const hostileMaxDD = modeResults.hostile.metrics.max_drawdown_pct;
    
    const reports = [];
    for (const mode of MODES) {
      const result = modeResults[mode];
      
      const penalized = computePenalizedMetrics({
        expectancy_per_trade: result.metrics.expectancy_per_trade,
        hostile_exec: hostileExec,
        hostile_maxdd: hostileMaxDD,
        reality_gap: realityGap,
        ssot
      });
      
      const report = {
        version: '1.0',
        run_id: runId,
        timestamp_utc: timestamp,
        source: (dataset.meta && dataset.meta.source) ? dataset.meta.source : 'SYNTHETIC',
        disclaimer: (dataset.meta && dataset.meta.disclaimer) ? dataset.meta.disclaimer : 'DATASET DISCLAIMER: operator supplied dataset (REAL) or generated (SYNTHETIC).',
        seed: (dataset.meta && Number.isFinite(dataset.meta.seed)) ? dataset.meta.seed : baseSeed,
        mode,
        hack_id: hackId,
        dataset_ref: { path: datasetPath, sha256: datasetSha256 },
        summary: {
          trade_count: result.metrics.trade_count,
          trade_count_total: result.metrics.trade_count_total,
          trade_count_filled: result.metrics.trade_count_filled,
          trade_count_rejected: result.metrics.trade_count_rejected,
          expectancy_per_trade: result.metrics.expectancy_per_trade,
          penalized_expectancy_per_trade: penalized.penalized_expectancy_per_trade,
          max_drawdown_pct: result.metrics.max_drawdown_pct,
          win_rate: result.metrics.win_rate,
          profit_factor: result.metrics.profit_factor,
          penalty_breakdown: penalized.penalty_breakdown
        },
        execution: {
          fill_ratio: result.metrics.fill_ratio,
          partial_fill_rate: result.metrics.partial_fill_rate,
          reject_ratio: result.metrics.reject_ratio,
          slippage_p95_bps: result.metrics.slippage_p95_bps,
          slippage_p99_bps: result.metrics.slippage_p99_bps,
          rtt_p95_ms: result.metrics.rtt_p95_ms,
          rtt_p99_ms: result.metrics.rtt_p99_ms
        },
        quality_filter: result.qualityStats,
        execution_policy: result.executionPolicyStats,
        risk_governor: result.riskGovernorStats,
        hack_data: {},
        notes: []
      };
      
      const reportPath = `reports/${hackId.toLowerCase()}_${mode}_report.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`[engine] Generated: ${reportPath}`);
      
      reports.push(report);
    }
    
    allReports[hackId] = reports;
  }
  
  // Generate EQS report (worst-case)
  const hostileReports = HACK_IDS.map(id => allReports[id].find(r => r.mode === 'hostile')).filter(Boolean);
  
  const worstExecution = {
    fill_ratio: Math.min(...hostileReports.map(r => r.execution.fill_ratio)),
    partial_fill_rate: Math.max(...hostileReports.map(r => r.execution.partial_fill_rate)),
    reject_ratio: Math.max(...hostileReports.map(r => r.execution.reject_ratio)),
    slippage_p99_bps: Math.max(...hostileReports.map(r => r.execution.slippage_p99_bps)),
    rtt_p99_ms: Math.max(...hostileReports.map(r => r.execution.rtt_p99_ms))
  };
  
  const eqsScore = 0.3 * worstExecution.fill_ratio +
                   0.18 * (1 - worstExecution.partial_fill_rate) +
                   0.18 * (1 - worstExecution.reject_ratio) +
                   0.14 * (1 - worstExecution.slippage_p99_bps / 20) +
                   0.14 * (1 - worstExecution.rtt_p99_ms / 1000) +
                   0.06;
  
  const eqsReport = {
    version: '1.0',
    run_id: runId,
    timestamp_utc: timestamp,
    source: (dataset.meta && dataset.meta.source) ? dataset.meta.source : 'SYNTHETIC',
    mode: 'hostile',
    aggregation: 'worst-case',
    eqs_score: Math.max(0, Math.min(1, eqsScore)),
    inputs: { ...worstExecution, reconnect_rate: 0 },
    thresholds: {
      max_reject_ratio: ssot.thresholds.max_reject_ratio,
      max_slippage_p99_bps: ssot.thresholds.max_slippage_p99_bps,
      max_rtt_p99_ms: ssot.thresholds.max_rtt_p99_ms
    }
  };
  
  fs.writeFileSync('reports/eqs_report.json', JSON.stringify(eqsReport, null, 2));
  console.log('[engine] Generated: reports/eqs_report.json');
  console.log('[engine] E2.1 PENALIZED METRICS simulation complete!');
}

main();
