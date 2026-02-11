// core/ai/ai_signal_bridge.mjs
// EPOCH-23: deterministic AI -> signal bridge.

function stableHash(input) {
  const s = String(input ?? '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function aiDecisionToSignal(decision, options = {}) {
  if (!decision || !decision.agent_id) throw new Error('decision.agent_id is required');
  if (!decision.symbol) throw new Error('decision.symbol is required');

  const rawScore = Number.isFinite(decision.score) ? decision.score : 0;
  const score = clamp(rawScore, -1, 1);
  if (score === 0) return null;

  const confidence = clamp(Number.isFinite(decision.confidence) ? decision.confidence : 0, 0, 1);
  const baseNotional = Number.isFinite(options.baseNotionalUsd) ? options.baseNotionalUsd : 100;
  const notional_usd = baseNotional * Math.max(0.1, confidence);

  return {
    strategy_id: `ai_${decision.agent_id}`,
    symbol: String(decision.symbol),
    side: score > 0 ? 'BUY' : 'SELL',
    confidence,
    priority: Number.isFinite(decision.priority) ? decision.priority : 0,
    price: Number.isFinite(decision.price) ? decision.price : undefined,
    notional_usd,
    reason: decision.reason || 'ai_decision_bridge',
    model_id: decision.model_id || 'unknown',
    score,
  };
}

export function aiDecisionsToSignals(decisions = [], options = {}) {
  const seed = Number.isFinite(options.seed) ? options.seed : Number(process.env.SEED || 12345);
  const signals = decisions
    .map((d) => aiDecisionToSignal(d, options))
    .filter(Boolean)
    .map((s, idx) => ({ ...s, _idx: idx }));

  return signals
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (b.priority !== a.priority) return b.priority - a.priority;
      const ha = stableHash(`${a.strategy_id}:${a.symbol}:${a.side}:${seed}`);
      const hb = stableHash(`${b.strategy_id}:${b.symbol}:${b.side}:${seed}`);
      if (ha !== hb) return ha - hb;
      return a._idx - b._idx;
    })
    .map(({ _idx, ...s }) => s);
}

export default { aiDecisionToSignal, aiDecisionsToSignals };
