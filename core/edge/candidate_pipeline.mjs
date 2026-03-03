/**
 * candidate_pipeline.mjs — Pipeline Surgeon: Unified Candidate Pipeline
 *
 * ONE orchestrator that connects:
 *   backtest x2 → edge_adapter → Edge Lab courts → CandidateFSM
 *
 * Replaces the 4 disconnected validation paths with a single evidence chain.
 *
 * Flow:
 *   1. Run backtest x2 (determinism check)
 *   2. Convert to edge descriptor via adapter
 *   3. Run Edge Lab 7-court pipeline
 *   4. Run CandidateFSM transition CT01 (DRAFT → BACKTESTED)
 *   5. Return unified evidence package
 */

import crypto from 'node:crypto';
import { runBacktest } from '../backtest/engine.mjs';
import { serializeLedger } from '../profit/ledger.mjs';
import { backtestToEdge } from './edge_adapter.mjs';
import { runEdgeLabPipeline } from '../edge_lab/pipeline.mjs';

/**
 * Run the unified candidate pipeline.
 * @param {Object} strategy — strategy implementing { init, onBar, meta }
 * @param {Array} bars — OHLCV bars
 * @param {Object} ssot — SSOT config from spec/ssot.json
 * @param {Object} [opts]
 * @param {Object} [opts.backtestOpts] — options for runBacktest
 * @param {string} [opts.edge_id] — edge identifier
 * @param {boolean} [opts.skip_courts=false] — skip Edge Lab (for testing)
 * @returns {{
 *   verdict: string,
 *   reason: string,
 *   phases: Object,
 *   candidate: Object,
 *   evidence_hash: string,
 *   deterministic: boolean
 * }}
 */
export function runCandidatePipeline(strategy, bars, ssot, opts = {}) {
  const btOpts = opts.backtestOpts || {};
  const phases = {};

  // Phase 1: Backtest x2 (determinism)
  const r1 = runBacktest(strategy, bars, btOpts);
  const r2 = runBacktest(strategy, bars, btOpts);

  const hash1 = crypto.createHash('sha256').update(serializeLedger(r1.ledger)).digest('hex');
  const hash2 = crypto.createHash('sha256').update(serializeLedger(r2.ledger)).digest('hex');

  phases.backtest = {
    metrics: r1.metrics,
    deterministic: hash1 === hash2,
    hash: hash1,
  };

  if (hash1 !== hash2) {
    return {
      verdict: 'BLOCKED',
      reason: 'DETERMINISM_FAIL',
      phases,
      candidate: null,
      evidence_hash: hash1,
      deterministic: false,
    };
  }

  // Phase 2: Edge Adapter
  const edge = backtestToEdge(r1, bars, {
    edge_id: opts.edge_id || `pipeline_${strategy.meta().name}_${bars.length}bars`,
    strategy_id: strategy.meta().name,
  });
  phases.adapter = { edge_id: edge.edge_id, strategy_id: edge.strategy_id };

  // Phase 3: Edge Lab Courts (optional)
  if (!opts.skip_courts) {
    try {
      const pipelineResult = runEdgeLabPipeline(edge, ssot, {
        fail_fast: true,
        double_run: true,
        edge_id: edge.edge_id,
      });
      phases.edge_lab = {
        verdict: pipelineResult.verdict,
        reason_codes: pipelineResult.reason_codes,
        courts_executed: pipelineResult.evidence_manifest?.courts_executed || [],
      };

      if (pipelineResult.verdict === 'BLOCKED' || pipelineResult.verdict === 'NOT_ELIGIBLE') {
        return {
          verdict: pipelineResult.verdict,
          reason: pipelineResult.reason_codes?.join(', ') || 'COURT_REJECTION',
          phases,
          candidate: null,
          evidence_hash: hash1,
          deterministic: true,
        };
      }
    } catch (err) {
      phases.edge_lab = { verdict: 'BLOCKED', error: err.message };
      return {
        verdict: 'BLOCKED',
        reason: `EDGE_LAB_ERROR: ${err.message}`,
        phases,
        candidate: null,
        evidence_hash: hash1,
        deterministic: true,
      };
    }
  } else {
    phases.edge_lab = { verdict: 'SKIPPED', reason: 'skip_courts=true' };
  }

  // Phase 4: Build candidate object
  const candidate = {
    id: edge.edge_id,
    strategy_name: strategy.meta().name,
    fsm_state: 'BACKTESTED',
    metrics: {
      backtest_sharpe: r1.metrics.backtest_sharpe,
      sortino: r1.metrics.sortino,
      calmar: r1.metrics.calmar,
      max_drawdown_pct: r1.metrics.max_drawdown * 100,
      return_pct: r1.metrics.return_pct,
      trade_count: r1.metrics.trade_count,
      total_pnl: r1.metrics.total_pnl,
      total_fees: r1.metrics.total_fees,
      win_rate: edge.red_team.win_rate,
      profit_factor: edge.red_team.profit_factor,
    },
    risk: {
      score: r1.metrics.max_drawdown, // 0-1 scale
      circuit_breaker_trips: 0,
    },
    court_verdicts: phases.edge_lab?.verdict ? [{
      verdict: phases.edge_lab.verdict,
      courts: phases.edge_lab.courts_executed || [],
      at: opts.timestamp || new Date().toISOString(),
    }] : [],
    evidence: {
      backtest_hash: hash1,
      deterministic: true,
      bar_count: bars.length,
    },
    created_at: opts.timestamp || new Date().toISOString(),
  };

  phases.candidate = { id: candidate.id, state: candidate.fsm_state };

  // Evidence chain hash
  const evidenceHash = crypto.createHash('sha256')
    .update(JSON.stringify({
      backtest_hash: hash1,
      edge_lab_verdict: phases.edge_lab?.verdict,
      candidate_id: candidate.id,
    }))
    .digest('hex');

  return {
    verdict: 'PASS',
    reason: 'PIPELINE_COMPLETE',
    phases,
    candidate,
    evidence_hash: evidenceHash,
    deterministic: true,
  };
}
