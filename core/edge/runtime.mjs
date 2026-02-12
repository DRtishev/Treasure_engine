import { canonicalStringify, fingerprint, validateContract } from './contracts.mjs';

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function determinismTripwire(fn, seed = 7) {
  const a = fn(seed);
  const b = fn(seed);
  const c = fn(seed + 1);
  const same = fingerprint(a) === fingerprint(b);
  const different = fingerprint(a) !== fingerprint(c);
  if (!same || !different) throw new Error('Determinism tripwire failed');
  return { same, different };
}

export function featureStore(seed = 7) {
  const rand = seeded(seed);
  const features = { ofi: Number((rand() * 2 - 1).toFixed(8)), vpin: Number(rand().toFixed(8)) };
  const payload = { contract: 'FeatureFrame', symbol: 'BTCUSDT', ts: '2024-01-01T00:00:00.000Z', seed, features };
  payload.fingerprint = fingerprint(payload);
  validateContract('FeatureFrame', payload);
  return payload;
}

export function simulator(seed = 7) {
  const rand = seeded(seed);
  const pnl = Number(((rand() - 0.5) * 100).toFixed(8));
  const fills = Math.floor(rand() * 100);
  const payload = { contract: 'SimReport', pnl, fills };
  validateContract('SimReport', payload);
  return payload;
}

export function strategyRegistry() {
  return { contract: 'StrategySpec', strategyId: 'edge.alpha', version: '1.0.0', compat: ['FeatureFrame@1'] };
}

export function signalIntent(seed = 7) {
  const score = Number((seeded(seed)() * 2 - 1).toFixed(8));
  const signal = { contract: 'Signal', strategyId: 'edge.alpha', symbol: 'BTCUSDT', score };
  validateContract('Signal', signal);
  const intent = { contract: 'Intent', symbol: signal.symbol, side: score >= 0 ? 'BUY' : 'SELL', size: Number(Math.abs(score).toFixed(8)) };
  validateContract('Intent', intent);
  return { signal, intent };
}

export function allocation(seed = 7) {
  const kelly = Math.min(0.25, Math.max(0, Number((seeded(seed)() * 0.4).toFixed(8))));
  const plan = { contract: 'AllocationPlan', capital: 100000, allocations: [{ symbol: 'BTCUSDT', fraction: kelly }] };
  validateContract('AllocationPlan', plan);
  return plan;
}

export function riskBrain(drawdown = 0) {
  const state = drawdown > 0.2 ? 'HALTED' : drawdown > 0.1 ? 'RESTRICTED' : drawdown > 0.05 ? 'CAUTIOUS' : 'NORMAL';
  return { contract: 'RiskDecision', state, allowed: state !== 'HALTED' };
}

export function walkForwardLeakageSentinel(hasLeakage) {
  if (hasLeakage) throw new Error('Leakage sentinel triggered');
  return { folds: 3, embargoBars: 5, purged: true };
}

export function realityGap(simPnl, livePnl) {
  const gapBps = Number((Math.abs(simPnl - livePnl) * 100).toFixed(8));
  return { contract: 'RealityGapReport', gapBps, autoBrake: gapBps > 150 };
}

export function submitOrder(mode) {
  if (mode === 'SHADOW' || process.env.SHADOW_MODE === '1') {
    const err = new Error('EDGE_SHADOW_ORDER_FORBIDDEN');
    err.code = 'EDGE_SHADOW_ORDER_FORBIDDEN';
    throw err;
  }
  return { ok: true };
}

export function canary(phase = 'P0', approved = false) {
  return { contract: 'CanaryPhaseState', phase, approved };
}

export function certification(results) {
  if (results.some((r) => r !== 'PASS')) throw new Error('Certification blocked');
  return canonicalStringify({ certified: true, at: 'offline-static' });
}
