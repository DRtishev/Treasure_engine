import crypto from 'node:crypto';
import { deterministicFingerprint, truncateTowardZero, validateContract, withFingerprint } from './contracts.mjs';

export function seeded(seed = 12345) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function determinismTripwire(fn, seed = 12345) {
  const a = fn(seed);
  const b = fn(seed);
  const c = fn(seed + 1);
  const same = deterministicFingerprint('tripwire', a) === deterministicFingerprint('tripwire', b);
  const different = deterministicFingerprint('tripwire', a) !== deterministicFingerprint('tripwire', c);
  if (!same || !different) throw new Error('Determinism tripwire failed');
  return { same, different };
}

export function buildFeatureFrame(seed = 12345) {
  const rand = seeded(seed);
  const raw = {
    schema_version: '1.0.0',
    symbol: 'BTCUSDT',
    ts_event: '2026-01-01T00:00:00Z',
    features: {
      ofi: truncateTowardZero(rand() * 2 - 1, 6),
      vpin: truncateTowardZero(rand(), 6)
    },
    feature_vector_order: ['ofi', 'vpin'],
    source_snapshot_id: `snap-${seed}`
  };
  const payload = withFingerprint('FeatureFrame', raw);
  validateContract('FeatureFrame', payload);
  return payload;
}

export function buildStrategySpec() {
  const payload = withFingerprint('StrategySpec', {
    schema_version: '1.0.0',
    strategy_id: 'edge_mvp',
    semver: '1.2.0',
    params_schema: { type: 'object', additionalProperties: true },
    default_params: { risk_budget: 0.15 },
    compatibility: { feature_schema: '^1.0.0' },
    artifact_hashes: { bundle: 'sha256:edge_bundle_v1' }
  });
  validateContract('StrategySpec', payload);
  return payload;
}

export function buildSignal(seed = 12345) {
  const rand = seeded(seed);
  const sideHint = rand() >= 0.5 ? 'LONG' : 'SHORT';
  const payload = withFingerprint('Signal', {
    schema_version: '1.0.0',
    signal_id: `sig-${seed}`,
    strategy_id: 'edge_mvp',
    symbol: 'BTCUSDT',
    timestamp: '2026-01-01T00:00:00Z',
    side_hint: sideHint,
    confidence: truncateTowardZero(rand(), 6),
    reasons: ['trend']
  });
  validateContract('Signal', payload);
  return payload;
}

export function buildIntent(signal) {
  const payload = withFingerprint('Intent', {
    schema_version: '1.0.0',
    intent_id: signal.signal_id.replace('sig-', 'int-'),
    signal_id: signal.signal_id,
    symbol: signal.symbol,
    timestamp: '2026-01-01T00:00:01Z',
    side: signal.side_hint === 'SHORT' ? 'SELL' : 'BUY',
    size_units: truncateTowardZero(signal.confidence * 0.1, 8),
    limit_price: 42000.12345678,
    max_slippage_bps: 8
  });
  validateContract('Intent', payload);
  return payload;
}

export function buildAllocationPlan(seed = 12345) {
  const rand = seeded(seed);
  const weight = truncateTowardZero(Math.min(0.35, Math.max(0.05, rand())), 6);
  const payload = withFingerprint('AllocationPlan', {
    schema_version: '1.0.0',
    plan_id: `ap-${seed}`,
    timestamp: '2026-01-01T00:00:02Z',
    target_weights: { BTCUSDT: weight },
    max_leverage: 1.5,
    constraints_applied: ['asset_cap']
  });
  validateContract('AllocationPlan', payload);
  return payload;
}

export function buildRiskDecision(drawdown = 0) {
  const toMode = drawdown >= 0.2 ? 'HALTED' : drawdown >= 0.1 ? 'RESTRICTED' : drawdown >= 0.05 ? 'CAUTIOUS' : 'NORMAL';
  const fromMode = toMode === 'HALTED' ? 'RESTRICTED' : toMode === 'RESTRICTED' ? 'CAUTIOUS' : 'NORMAL';
  const action = toMode === 'HALTED' ? 'HALT' : toMode === 'NORMAL' ? 'KEEP' : 'REDUCE';
  const payload = withFingerprint('RiskDecision', {
    schema_version: '1.0.0',
    decision_id: `rd-${toMode.toLowerCase()}`,
    timestamp: '2026-01-01T00:00:03Z',
    from_mode: fromMode,
    to_mode: toMode,
    trigger_ids: [toMode === 'NORMAL' ? 'none' : 'drawdown_breach'],
    action
  });
  validateContract('RiskDecision', payload);
  return payload;
}

export function buildSimReport(seed = 12345) {
  const rand = seeded(seed);
  const payload = withFingerprint('SimReport', {
    schema_version: '1.0.0',
    sim_run_id: `sim-${seed}`,
    slippage_model: 'mvp',
    fee_model: 'maker_taker_v1',
    latency_model: 'fixed_50ms',
    inputs_fingerprint: `sha256:${crypto.createHash('sha256').update(`seed:${seed}`).digest('hex')}`,
    output_metrics: { sharpe: truncateTowardZero(rand() * 2, 6) }
  });
  validateContract('SimReport', payload);
  return payload;
}

export function buildRealityGapReport(simRef = 'sim-1', shadowRef = 'sh-1', delta = 0.031) {
  const payload = withFingerprint('RealityGapReport', {
    schema_version: '1.0.0',
    report_id: `rg-${simRef}`,
    timestamp: '2026-01-01T00:01:00Z',
    sim_ref: simRef,
    shadow_ref: shadowRef,
    component_deltas: { slippage_bps: truncateTowardZero(delta * 100, 4) },
    gap_score: truncateTowardZero(Math.abs(delta), 6),
    brake_action: Math.abs(delta) > 0.025 ? 'REDUCE' : 'NONE'
  });
  validateContract('RealityGapReport', payload);
  return payload;
}

export function buildShadowEvent(intentsEmitted = 3) {
  const payload = withFingerprint('ShadowEvent', {
    schema_version: '1.0.0',
    event_id: 'se-1',
    timestamp: '2026-01-01T00:02:00Z',
    intents_emitted: intentsEmitted,
    orders_submitted: 0,
    guards: { adapter_disabled: true, order_path_blocked: true }
  });
  validateContract('ShadowEvent', payload);
  return payload;
}

export function buildCanaryPhaseState(previous = 5, phase = 15) {
  const payload = withFingerprint('CanaryPhaseState', {
    schema_version: '1.0.0',
    timestamp: '2026-01-01T00:03:00Z',
    phase_percent: phase,
    previous_phase_percent: previous,
    rollback_armed: true,
    transition_reason: 'all_guards_green'
  });
  validateContract('CanaryPhaseState', payload);
  return payload;
}

export function buildCertificationReport(results) {
  const payload = withFingerprint('CertificationReport', {
    schema_version: '1.0.0',
    release_id: 'edge-r1',
    epoch_gate_results: results,
    ledger_snapshot_hash: 'sha256:ledger_snapshot',
    spec_hash: 'sha256:spec_hash',
    evidence_hash: 'sha256:evidence_hash',
    approvals: { release_governor: 'signed' }
  });
  validateContract('CertificationReport', payload);
  return payload;
}

export function submitOrder(mode) {
  if (mode === 'SHADOW' || process.env.SHADOW_MODE === '1') {
    const err = new Error('EDGE_SHADOW_ORDER_FORBIDDEN');
    err.code = 'EDGE_SHADOW_ORDER_FORBIDDEN';
    throw err;
  }
  return { accepted: true };
}

export function walkForwardLeakageSentinel(hasLeakage) {
  if (hasLeakage) throw new Error('Leakage sentinel triggered');
  return { folds: 3, embargo_bars: 5, purged: true };
}
