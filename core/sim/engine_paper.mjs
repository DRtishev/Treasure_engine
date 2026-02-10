#!/usr/bin/env node
// core/sim/engine_paper.mjs - Paper Trading Engine with Execution Adapter + EventLog
// EPOCH-04: Demonstrates adapter pattern and observability
// Does NOT replace engine.mjs - safe parallel implementation

import fs from 'fs';
import crypto from 'crypto';
import { loadDatasetWithSha, hash32 } from '../data/dataset_io.mjs';
import { SeededRNG } from './rng.mjs';
import { sampleSpreadProxy } from './models.mjs';
import { generateBaseSignals } from './base_signal.mjs';
import { calculateMetrics } from './metrics.mjs';
import { computePenalizedMetrics } from './penalized.mjs';
import * as qualityFilter from '../quality/quality_filter.mjs';
import * as executionPolicy from '../exec/execution_policy.mjs';
import { RiskGovernorState, preCheck as riskPreCheck, update as riskUpdate, getDashboard as riskDashboard } from '../risk/risk_governor.mjs';
import { PaperAdapter } from '../exec/adapters/paper_adapter.mjs';
import { EventLog } from '../obs/event_log.mjs';

const MODES = ['optimistic', 'base', 'hostile'];
const HACK_IDS = ['HACK_A2', 'HACK_A3', 'HACK_B1', 'HACK_B3'];

function loadJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function enrichBar(bar, allBars, idx, barIntervalMs = 300000) {
  // Enrich bar with computed metrics
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
  
  bar.volume_usd = bar.v * bar.c;
  bar.spread_bps = Math.max(1, ((bar.h - bar.l) / bar.c) * 10000 * 0.1);
  bar.volatility = (bar.h - bar.l) / bar.c;
  
  // Deterministic timestamp
  if (!bar.t_ms) {
    bar.t_ms = idx * barIntervalMs;
  }
  
  return bar;
}

async function runHackSimulation(hackId, mode, dataset, ssot, hackSpec, rng, eventLog) {
  const bars = dataset.bars;
  const barIntervalMs = dataset.meta?.bar_interval_ms || 300000;
  
  // Enrich bars
  for (let i = 0; i < bars.length; i++) {
    enrichBar(bars[i], bars, i, barIntervalMs);
  }
  
  const baseSignals = generateBaseSignals(bars);
  const spreadProxy = sampleSpreadProxy(mode, rng);
  
  let filteredSignals = baseSignals.filter(s => s.signal !== 'none');
  
  // Initialize components
  const initialEquity = ssot.risk_governor?.initial_equity_usd || 10000;
  const riskState = new RiskGovernorState(ssot.risk_governor, bars[0].t_ms);
  riskState.updateEquity(initialEquity);
  
  const baseOrderSize = ssot.execution_policy?.base_order_size_usd || 1000;
  
  // Initialize PaperAdapter
  const adapter = new PaperAdapter({
    bars,
    rng,
    ssot,
    execPolicy: null // Will be computed per-signal
  });
  
  // Log engine start
  eventLog.sys('engine_start', {
    hack_id: hackId,
    mode,
    bars_count: bars.length,
    signals_count: filteredSignals.length,
    initial_equity: initialEquity
  }, bars[0].t_ms);
  
  // Quality Filter
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
  
  // Trade execution with adapter
  const trades = [];
  const riskBlocked = [];
  const execPolicies = [];
  let orderSeq = 0;
  
  for (const sig of qualityFiltered) {
    const bar = bars[sig.idx];
    const now_ms = bar.t_ms;
    
    // Quality-adjusted position sizing
    let size_usd = baseOrderSize * sig.quality_score;
    size_usd = Math.max(100, Math.min(size_usd, baseOrderSize * 1.2));
    
    // RiskGovernor pre-check (with event logging)
    const intent = { size_usd, quality_score: sig.quality_score };
    const riskCheck = riskPreCheck(intent, riskState, ssot, now_ms, eventLog);
    
    if (!riskCheck.pass) {
      // Risk blocked
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
    
    // Build order intent for adapter
    const orderIntent = {
      side: sig.signal === 'long' ? 'BUY' : 'SELL',
      size: size_usd,
      price: bar.c, // Use close price as reference
      type: 'MARKET',
      quality_score: sig.quality_score,
      ttl_ms: execPol.ttl_ms,
      tip_bps: execPol.tip_bps
    };
    
    // Build execution context
    const ctx = {
      run_id: eventLog.run_id,
      hack_id: hackId,
      mode,
      bar_idx: sig.idx,
      bar,
      order_seq: orderSeq++
    };
    
    // Place order through adapter
    try {
      // Update adapter's execPolicy for this order
      adapter.execPolicy = execPol;
      
      const orderResult = await adapter.placeOrder(orderIntent, ctx);
      
      // Log order placed
      eventLog.exec('order_placed', {
        order_id: orderResult.order_id,
        side: orderIntent.side,
        size_usd,
        bar_idx: sig.idx,
        status: orderResult.status
      }, now_ms);
      
      // Poll order result
      const execResult = await adapter.pollOrder(orderResult.order_id, ctx);
      
      // Log execution result
      if (execResult.filled) {
        eventLog.exec('order_filled', {
          order_id: orderResult.order_id,
          pnl_usd: execResult.pnl_usd,
          slippage: execResult.slippage,
          latency_ms: execResult.latency_ms
        }, now_ms);
      } else {
        eventLog.exec('order_rejected', {
          order_id: orderResult.order_id,
          reason: execResult.reason
        }, now_ms);
      }
      
      // Convert to trade format
      const trade = {
        filled: execResult.filled,
        rejected: !execResult.filled,
        reason: execResult.reason,
        fill_ratio: execResult.filled ? 1.0 : 0,
        pnl: execResult.pnl || 0,
        pnl_usd: execResult.pnl_usd || 0,
        slippage_bps: execResult.slippage || 0,
        latency_ms: execResult.latency_ms || 0,
        ttl_ms: execPol.ttl_ms,
        tip_bps: execPol.tip_bps,
        size_usd,
        competition_score: execPol.competition_score
      };
      
      trades.push(trade);
      
      // RiskGovernor update (with event logging)
      if (trade.filled) {
        riskUpdate(trade, riskState, ssot, now_ms, eventLog);
      }
    } catch (err) {
      // Log execution error
      eventLog.sys('execution_error', {
        error: err.message,
        bar_idx: sig.idx
      }, now_ms);
      
      // Add failed trade
      trades.push({
        filled: false,
        rejected: true,
        reason: 'execution_error',
        fill_ratio: 0,
        pnl: 0,
        pnl_usd: 0,
        slippage_bps: 0,
        latency_ms: 0,
        ttl_ms: execPol.ttl_ms,
        tip_bps: execPol.tip_bps,
        size_usd,
        competition_score: execPol.competition_score
      });
    }
  }
  
  const metrics = calculateMetrics(trades);
  const qualityStats = qualityFilter.aggregateStats(qualityChecks);
  const execStats = executionPolicy.aggregateStats(trades.map(t => ({ 
    execParams: { 
      ttl_ms: t.ttl_ms, 
      tip_bps: t.tip_bps, 
      competition_score: t.competition_score 
    }
  })));
  const riskDash = riskDashboard(riskState, ssot, bars[bars.length - 1].t_ms);
  const adapterStats = adapter.getStats();
  
  // Log engine stop
  eventLog.sys('engine_stop', {
    hack_id: hackId,
    mode,
    trades_executed: trades.length,
    trades_filled: trades.filter(t => t.filled).length,
    final_equity: riskState.current_equity,
    net_pnl: metrics.totalPnL
  }, bars[bars.length - 1].t_ms);
  
  return { 
    metrics, 
    tradeCount: trades.length,
    qualityStats: {
      checks_total: qualityChecks.length,
      checks_passed: qualityFiltered.length,
      avg_score: qualityStats.avgScore,
      distribution: qualityStats.distribution
    },
    execStats,
    riskDashboard: riskDash,
    adapterStats,
    riskBlocked: riskBlocked.length,
    spreadProxy
  };
}

export async function runSimulation(datasetPath, ssotPath, hacksPath, runId = null) {
  // Generate run ID
  if (!runId) {
    runId = `paper_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  // Initialize EventLog
  const eventLog = new EventLog({ run_id: runId });
  
  // Log simulation start
  eventLog.sys('simulation_start', {
    dataset: datasetPath,
    ssot: ssotPath,
    hacks: hacksPath
  });
  
  try {
    const { dataset, sha256 } = loadDatasetWithSha(datasetPath);
    const ssot = loadJSON(ssotPath);
    const hacks = loadJSON(hacksPath);
    
    const results = { modes: {}, aggregate: null, meta: {} };
    
    for (const mode of MODES) {
      results.modes[mode] = {};
      for (const hackId of HACK_IDS) {
        const hackSpec = hacks.find(h => h.hack_id === hackId);
        if (!hackSpec) continue;
        
        const seed = hash32(`${mode}:${hackId}`);
        const rng = new SeededRNG(seed);
        
        const result = await runHackSimulation(hackId, mode, dataset, ssot, hackSpec, rng, eventLog);
        results.modes[mode][hackId] = result;
      }
    }
    
    // Compute aggregate metrics (same as engine.mjs)
    const allMetrics = [];
    for (const mode of MODES) {
      for (const hackId of HACK_IDS) {
        if (results.modes[mode][hackId]) {
          allMetrics.push(results.modes[mode][hackId].metrics);
        }
      }
    }
    
    results.aggregate = computePenalizedMetrics(allMetrics, ssot);
    results.meta = {
      run_id: runId,
      dataset_sha256: sha256,
      timestamp: new Date().toISOString(),
      adapter: 'PaperAdapter',
      event_log: eventLog.getFilepath()
    };
    
    // Flush event log
    eventLog.sys('simulation_complete', {
      aggregate_eqs: results.aggregate.EQS,
      modes_count: MODES.length,
      hacks_count: HACK_IDS.length
    });
    eventLog.close();
    
    return results;
  } catch (err) {
    eventLog.sys('simulation_failed', { error: err.message });
    eventLog.close();
    throw err;
  }
}

export default runSimulation;
